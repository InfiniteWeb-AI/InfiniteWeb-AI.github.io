// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  // Simple in-memory polyfill
  let store = {};
  return {
    getItem: function (key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem: function (key, value) {
      store[key] = String(value);
    },
    removeItem: function (key) {
      delete store[key];
    },
    clear: function () {
      store = {};
    },
    key: function (index) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    }
  };
})();

class BusinessLogic {
  constructor() {
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const arrayKeys = [
      'bills',
      'payment_methods',
      'payments',
      'autopay_rules',
      'transactions',
      'transaction_disputes',
      'maintenance_requests',
      'units',
      'leases',
      'occupants',
      'lease_renewal_offers',
      'parking_spots',
      'parking_reservations',
      'amenities',
      'amenity_time_slots',
      'amenity_reservations',
      'account_settings',
      // non-entity supporting tables
      'help_topics',
      'contact_form_tickets'
    ];

    const objectKeys = [
      'about_content',
      'contact_info',
      'privacy_policy_content',
      'terms_of_service_content'
    ];

    arrayKeys.forEach((k) => {
      if (!localStorage.getItem(k)) {
        localStorage.setItem(k, JSON.stringify([]));
      }
    });

    objectKeys.forEach((k) => {
      if (!localStorage.getItem(k)) {
        localStorage.setItem(k, JSON.stringify({}));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  _toDate(value) {
    return value ? new Date(value) : null;
  }

  _toISODate(date) {
    if (!date) return null;
    return new Date(date).toISOString();
  }

  _startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  _endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  _addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  _addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  _firstDayOfNextMonth(date) {
    const d = date ? new Date(date) : new Date();
    const year = d.getFullYear();
    const month = d.getMonth();
    return new Date(year, month + 1, 1, 0, 0, 0, 0);
  }

  _parseTimeToDate(baseDateISO, timeHHMM) {
    const base = new Date(baseDateISO);
    if (!timeHHMM || Number.isNaN(base.getTime())) return null;
    const [h, m] = timeHHMM.split(':').map((v) => parseInt(v, 10));
    base.setHours(h || 0, m || 0, 0, 0);
    return base;
  }

  // ---------------------- Domain helpers ----------------------

  // Internal helper to retrieve the current active lease for the logged-in user.
  _getCurrentLease() {
    const leases = this._getFromStorage('leases', []);
    if (!Array.isArray(leases) || leases.length === 0) return null;
    // Prefer active, then pending_renewal, then future
    const priorities = ['active', 'pending_renewal', 'future'];
    let best = null;
    let bestScore = Infinity;
    leases.forEach((lease) => {
      const idx = priorities.indexOf(lease.status);
      if (idx === -1) return;
      if (idx < bestScore) {
        bestScore = idx;
        best = lease;
      } else if (idx === bestScore && best) {
        // tie-breaker by start_date (latest)
        const d1 = this._toDate(lease.start_date);
        const d2 = this._toDate(best.start_date);
        if (d1 && d2 && d1 > d2) best = lease;
      }
    });
    return best || null;
  }

  // Internal helper to retrieve the user's current residential unit associated with the active lease.
  _getCurrentUnit() {
    const lease = this._getCurrentLease();
    if (!lease || !lease.unit_id) return null;
    const units = this._getFromStorage('units', []);
    return units.find((u) => u.id === lease.unit_id) || null;
  }

  // Internal helper to calculate convenience_fee_amount and total_amount for a given PaymentMethod and amount.
  _calculateConvenienceFee(paymentMethod, amount) {
    if (!paymentMethod) {
      return { convenience_fee_amount: 0, total_amount: amount };
    }
    const flat = Number(paymentMethod.convenience_fee_flat || 0);
    const pct = Number(paymentMethod.convenience_fee_percent || 0);
    const fee = flat + (pct / 100) * Number(amount || 0);
    const roundedFee = Math.round(fee * 100) / 100;
    const total = Math.round((Number(amount || 0) + roundedFee) * 100) / 100;
    return { convenience_fee_amount: roundedFee, total_amount: total };
  }

  // Internal helper to load or initialize AccountSettings for the logged-in user.
  _getCurrentAccountSettings() {
    const settingsArr = this._getFromStorage('account_settings', []);
    if (settingsArr.length > 0) return settingsArr[0];
    const nowISO = this._toISODate(new Date());
    const defaultSettings = {
      id: this._generateId('acct'),
      full_name: '',
      email: '',
      phone_number: '',
      payment_email_enabled: false,
      payment_sms_enabled: false,
      payment_push_enabled: false,
      maintenance_email_enabled: false,
      maintenance_sms_enabled: false,
      maintenance_push_enabled: false,
      marketing_email_enabled: false,
      marketing_sms_enabled: false,
      marketing_push_enabled: false,
      marketing_global_opt_in: false,
      created_at: nowISO,
      updated_at: nowISO
    };
    const newArr = [defaultSettings];
    this._saveToStorage('account_settings', newArr);
    return defaultSettings;
  }

  // Internal helper to compute allowed maintenance appointment date and time windows based on property rules and current date.
  _suggestPreferredAppointmentWindows() {
    const today = new Date();
    // Earliest allowed: next weekday (Mon-Fri)
    let earliest = this._addDays(today, 1);
    while (earliest.getDay() === 0 || earliest.getDay() === 6) {
      earliest = this._addDays(earliest, 1);
    }
    const latest = this._addDays(earliest, 6); // within next 7 days window

    const timeWindows = [
      { start_time: '09:00', end_time: '11:00', label: '9:00-11:00 AM' },
      { start_time: '10:00', end_time: '12:00', label: '10:00 AM-12:00 PM' },
      { start_time: '13:00', end_time: '15:00', label: '1:00-3:00 PM' },
      { start_time: '15:00', end_time: '17:00', label: '3:00-5:00 PM' }
    ];

    return {
      allowed_date_start: this._toISODate(this._startOfDay(earliest)),
      allowed_date_end: this._toISODate(this._endOfDay(latest)),
      time_windows: timeWindows
    };
  }

  // ---------------------- Hydration helpers (foreign key resolution) ----------------------

  _hydrateBill(bill) {
    if (!bill) return null;
    const leases = this._getFromStorage('leases', []);
    const lease = bill.lease_id ? leases.find((l) => l.id === bill.lease_id) : null;
    let unit = null;
    if (lease && lease.unit_id) {
      const units = this._getFromStorage('units', []);
      unit = units.find((u) => u.id === lease.unit_id) || null;
    }
    const hydrated = this._clone(bill);
    hydrated.lease = lease || null;
    hydrated.unit = unit || null;
    return hydrated;
  }

  _hydratePayment(payment) {
    if (!payment) return null;
    const bills = this._getFromStorage('bills', []);
    const methods = this._getFromStorage('payment_methods', []);
    const bill = payment.bill_id ? bills.find((b) => b.id === payment.bill_id) : null;
    const method = payment.payment_method_id
      ? methods.find((m) => m.id === payment.payment_method_id)
      : null;
    const hydrated = this._clone(payment);
    hydrated.bill = bill ? this._hydrateBill(bill) : null;
    hydrated.payment_method = method || null;
    return hydrated;
  }

  _hydrateAutopayRule(rule) {
    if (!rule) return null;
    const methods = this._getFromStorage('payment_methods', []);
    const leases = this._getFromStorage('leases', []);
    const units = this._getFromStorage('units', []);
    const method = rule.payment_method_id
      ? methods.find((m) => m.id === rule.payment_method_id)
      : null;
    const lease = rule.lease_id ? leases.find((l) => l.id === rule.lease_id) : this._getCurrentLease();
    let unit = null;
    if (lease && lease.unit_id) {
      unit = units.find((u) => u.id === lease.unit_id) || null;
    }
    const hydrated = this._clone(rule);
    hydrated.payment_method = method || null;
    hydrated.lease = lease || null;
    hydrated.unit = unit || null;
    return hydrated;
  }

  _hydrateTransaction(tx) {
    if (!tx) return null;
    const bills = this._getFromStorage('bills', []);
    const payments = this._getFromStorage('payments', []);
    const leases = this._getFromStorage('leases', []);
    const bill = tx.bill_id ? bills.find((b) => b.id === tx.bill_id) : null;
    const payment = tx.payment_id ? payments.find((p) => p.id === tx.payment_id) : null;
    const lease = tx.lease_id ? leases.find((l) => l.id === tx.lease_id) : null;
    const hydrated = this._clone(tx);
    hydrated.bill = bill ? this._hydrateBill(bill) : null;
    hydrated.payment = payment ? this._hydratePayment(payment) : null;
    hydrated.lease = lease || null;
    return hydrated;
  }

  _hydrateMaintenanceRequest(req) {
    if (!req) return null;
    const leases = this._getFromStorage('leases', []);
    const units = this._getFromStorage('units', []);
    const lease = req.lease_id ? leases.find((l) => l.id === req.lease_id) : this._getCurrentLease();
    let unit = null;
    if (lease && lease.unit_id) {
      unit = units.find((u) => u.id === lease.unit_id) || null;
    }
    const hydrated = this._clone(req);
    hydrated.lease = lease || null;
    hydrated.unit = unit || null;
    return hydrated;
  }

  _hydrateParkingReservation(res) {
    if (!res) return null;
    const spots = this._getFromStorage('parking_spots', []);
    const units = this._getFromStorage('units', []);
    const spot = res.parking_spot_id ? spots.find((s) => s.id === res.parking_spot_id) : null;
    const unit = res.unit_id ? units.find((u) => u.id === res.unit_id) : this._getCurrentUnit();
    const hydrated = this._clone(res);
    hydrated.parking_spot = spot || null;
    hydrated.unit = unit || null;
    return hydrated;
  }

  _hydrateAmenityTimeSlot(slot) {
    if (!slot) return null;
    const amenities = this._getFromStorage('amenities', []);
    const amenity = slot.amenity_id ? amenities.find((a) => a.id === slot.amenity_id) : null;
    const hydrated = this._clone(slot);
    hydrated.amenity = amenity || null;
    return hydrated;
  }

  _hydrateAmenityReservation(res) {
    if (!res) return null;
    const amenities = this._getFromStorage('amenities', []);
    const slots = this._getFromStorage('amenity_time_slots', []);
    const amenity = res.amenity_id ? amenities.find((a) => a.id === res.amenity_id) : null;
    const slot = res.timeslot_id ? slots.find((s) => s.id === res.timeslot_id) : null;
    const hydrated = this._clone(res);
    hydrated.amenity = amenity || null;
    hydrated.timeslot = slot ? this._hydrateAmenityTimeSlot(slot) : null;
    return hydrated;
  }

  _hydrateOccupant(occ) {
    if (!occ) return null;
    const leases = this._getFromStorage('leases', []);
    const lease = occ.lease_id ? leases.find((l) => l.id === occ.lease_id) : this._getCurrentLease();
    const hydrated = this._clone(occ);
    hydrated.lease = lease || null;
    return hydrated;
  }

  // ---------------------- Core interface implementations ----------------------

  // getDashboardSummary()
  getDashboardSummary() {
    const now = new Date();

    // Balance from transactions
    const txsRaw = this._getFromStorage('transactions', []);
    const chargeTypes = [
      'rent_charge',
      'late_fee',
      'utility_charge',
      'parking_fee',
      'amenity_fee',
      'other_fee'
    ];
    const creditTypes = ['payment', 'adjustment'];
    let balance = 0;
    txsRaw.forEach((tx) => {
      if (tx.status === 'voided') return;
      const amount = Number(tx.amount || 0);
      if (chargeTypes.includes(tx.type)) {
        balance += amount;
      } else if (creditTypes.includes(tx.type)) {
        balance -= amount;
      }
    });

    // Next rent bill
    const billsRaw = this._getFromStorage('bills', []);
    const rentBills = billsRaw.filter(
      (b) => b.type === 'rent' && (b.status === 'upcoming' || b.status === 'due')
    );
    let nextRent = null;
    rentBills.forEach((b) => {
      const d = this._toDate(b.due_date);
      if (!d) return;
      if (!nextRent || d < this._toDate(nextRent.due_date)) {
        nextRent = b;
      }
    });

    const next_rent_due_date = nextRent ? this._toISODate(nextRent.due_date) : null;
    const next_rent_amount = nextRent ? Number(nextRent.amount_due || 0) : 0;

    // Recent payments
    const paymentsRaw = this._getFromStorage('payments', []);
    const paymentsSorted = this._clone(paymentsRaw).sort((a, b) => {
      const da = this._toDate(a.processed_date || a.scheduled_date || a.created_at);
      const db = this._toDate(b.processed_date || b.scheduled_date || b.created_at);
      return (db ? db.getTime() : 0) - (da ? da.getTime() : 0);
    });
    const billsById = {};
    billsRaw.forEach((b) => {
      billsById[b.id] = b;
    });

    const recent_payments = paymentsSorted.slice(0, 5).map((p) => {
      const hydratedPayment = this._hydratePayment(p);
      const bill = p.bill_id ? billsById[p.bill_id] : null;
      return {
        payment: hydratedPayment,
        bill_label: bill ? bill.label : null,
        bill_type: bill ? bill.type : null
      };
    });

    // Maintenance alerts
    const mReqsRaw = this._getFromStorage('maintenance_requests', []);
    const maintenance_alerts = mReqsRaw
      .filter((r) => r.status === 'submitted' || r.status === 'in_progress')
      .map((r) => {
        const hydratedReq = this._hydrateMaintenanceRequest(r);
        return {
          maintenance_request: hydratedReq,
          next_visit_datetime: r.scheduled_visit_datetime || null
        };
      });

    // Late fee alerts (new within 7 days)
    const lateFeeAlertWindowDays = 7;
    const cutoff = this._addDays(now, -lateFeeAlertWindowDays);
    const late_fee_alerts = txsRaw
      .filter((tx) => tx.type === 'late_fee' && tx.status === 'posted')
      .map((tx) => {
        const d = this._toDate(tx.date);
        const isNew = d ? d >= cutoff : false;
        return {
          transaction: this._hydrateTransaction(tx),
          is_new: isNew
        };
      });

    // Renewal offer alerts: offered & not expired
    const offersRaw = this._getFromStorage('lease_renewal_offers', []);
    const renewal_offer_alerts = offersRaw.filter((o) => {
      if (o.status !== 'offered') return false;
      const exp = this._toDate(o.expiration_date);
      return !exp || exp >= now;
    });

    // Upcoming reservations (amenity + parking)
    const amenityResRaw = this._getFromStorage('amenity_reservations', []);
    const parkingResRaw = this._getFromStorage('parking_reservations', []);
    const amenities = this._getFromStorage('amenities', []);
    const parkingSpots = this._getFromStorage('parking_spots', []);

    const upcomingAmenity = amenityResRaw
      .filter((r) => r.status === 'reserved')
      .map((r) => {
        const start = this._toDate(r.start_datetime);
        return { r, start };
      })
      .filter((x) => x.start && x.start >= now)
      .sort((a, b) => a.start - b.start)
      .map((x) => {
        const amenity = amenities.find((a) => a.id === x.r.amenity_id) || null;
        const hydratedRes = this._hydrateAmenityReservation(x.r);
        return {
          reservation_type: 'amenity',
          amenity_reservation: hydratedRes,
          parking_reservation: null,
          amenity_name: amenity ? amenity.name : null,
          parking_spot_label: null
        };
      });

    const upcomingParking = parkingResRaw
      .filter((r) => r.status === 'pending' || r.status === 'confirmed' || r.status === 'active')
      .map((r) => {
        const start = this._toDate(r.start_date);
        return { r, start };
      })
      .filter((x) => x.start && this._endOfDay(x.start) >= now)
      .sort((a, b) => a.start - b.start)
      .map((x) => {
        const spot = parkingSpots.find((s) => s.id === x.r.parking_spot_id) || null;
        const hydrated = this._hydrateParkingReservation(x.r);
        const label = spot ? `Spot ${spot.spot_number}` : null;
        return {
          reservation_type: 'parking',
          amenity_reservation: null,
          parking_reservation: hydrated,
          amenity_name: null,
          parking_spot_label: label
        };
      });

    const upcoming_reservations = [...upcomingAmenity, ...upcomingParking];

    return {
      current_balance: Math.round(balance * 100) / 100,
      next_rent_due_date,
      next_rent_amount,
      recent_payments,
      maintenance_alerts,
      late_fee_alerts,
      renewal_offer_alerts,
      upcoming_reservations
    };
  }

  // getBillsOverview()
  getBillsOverview() {
    const billsRaw = this._getFromStorage('bills', []);
    const leases = this._getFromStorage('leases', []);
    const units = this._getFromStorage('units', []);
    const currentLease = this._getCurrentLease();

    const filteredBills = currentLease
      ? billsRaw.filter((b) => !b.lease_id || b.lease_id === currentLease.id)
      : billsRaw;

    return filteredBills.map((b) => {
      const lease = b.lease_id
        ? leases.find((l) => l.id === b.lease_id)
        : currentLease;
      let unitNumber = null;
      if (lease && lease.unit_id) {
        const unit = units.find((u) => u.id === lease.unit_id);
        if (unit) unitNumber = unit.unit_number;
      }
      const hydratedBill = this._hydrateBill(b);
      const isPrimaryRent = b.type === 'rent';
      return {
        bill: hydratedBill,
        lease_unit_number: unitNumber,
        is_primary_rent: isPrimaryRent
      };
    });
  }

  // getPaymentMethodsOverview()
  getPaymentMethodsOverview() {
    const methods = this._getFromStorage('payment_methods', []);
    return methods.filter((m) => m.status === 'active');
  }

  // getPaymentMethodFeeQuotes(amount, billId)
  getPaymentMethodFeeQuotes(amount, billId) {
    const amt = Number(amount || 0);
    const methods = this._getFromStorage('payment_methods', []);
    const activeMethods = methods.filter((m) => m.status === 'active');

    const quotes = activeMethods.map((m) => {
      const feeInfo = this._calculateConvenienceFee(m, amt);
      return {
        payment_method: m,
        convenience_fee_amount: feeInfo.convenience_fee_amount,
        total_amount: feeInfo.total_amount,
        is_cheapest: false
      };
    });

    if (quotes.length > 0) {
      let minFee = Math.min(...quotes.map((q) => q.convenience_fee_amount));
      quotes.forEach((q) => {
        if (q.convenience_fee_amount === minFee) {
          q.is_cheapest = true;
        }
      });
    }

    return quotes;
  }

  // scheduleOneTimePayment(billId, amount, paymentMethodId, scheduledDate, memo)
  scheduleOneTimePayment(billId, amount, paymentMethodId, scheduledDate, memo) {
    const bills = this._getFromStorage('bills', []);
    const methods = this._getFromStorage('payment_methods', []);
    let payments = this._getFromStorage('payments', []);
    let transactions = this._getFromStorage('transactions', []);

    const bill = bills.find((b) => b.id === billId);
    if (!bill) {
      return { success: false, payment: null, message: 'Bill not found' };
    }
    const method = methods.find((m) => m.id === paymentMethodId && m.status === 'active');
    if (!method) {
      return { success: false, payment: null, message: 'Payment method not found or inactive' };
    }

    const amt = Number(amount || 0);
    const { convenience_fee_amount, total_amount } = this._calculateConvenienceFee(method, amt);
    const nowISO = this._toISODate(new Date());

    const paymentRecord = {
      id: this._generateId('pay'),
      bill_id: billId,
      source: 'one_time',
      amount: amt,
      convenience_fee_amount,
      total_amount,
      payment_method_id: paymentMethodId,
      memo: memo || bill.memo_default || null,
      scheduled_date: scheduledDate,
      processed_date: null,
      status: 'scheduled',
      created_at: nowISO,
      updated_at: nowISO
    };

    payments.push(paymentRecord);
    this._saveToStorage('payments', payments);

    // Create a corresponding pending transaction for the ledger
    const txRecord = {
      id: this._generateId('tx'),
      date: scheduledDate || nowISO,
      type: 'payment',
      description: bill.label || 'Payment',
      amount: total_amount,
      bill_id: billId,
      payment_id: paymentRecord.id,
      lease_id: bill.lease_id || null,
      status: 'pending',
      is_flagged_for_review: false,
      internal_notes: null,
      created_at: nowISO,
      updated_at: nowISO
    };
    transactions.push(txRecord);
    this._saveToStorage('transactions', transactions);

    return {
      success: true,
      payment: this._hydratePayment(paymentRecord),
      message: 'Payment scheduled successfully'
    };
  }

  // getAutopayRulesOverview()
  getAutopayRulesOverview() {
    const rulesRaw = this._getFromStorage('autopay_rules', []);
    const bills = this._getFromStorage('bills', []);

    const overview = rulesRaw.map((r) => {
      const hydratedRule = this._hydrateAutopayRule(r);

      // Compute next_run_date based on next rent bill for associated lease
      let nextRunDate = null;
      if (hydratedRule.status === 'active') {
        const relevantLeaseId = hydratedRule.lease ? hydratedRule.lease.id : null;
        const candidateBills = bills.filter((b) => {
          if (b.type !== 'rent') return false;
          if (relevantLeaseId && b.lease_id && b.lease_id !== relevantLeaseId) return false;
          return b.status === 'upcoming' || b.status === 'due';
        });
        let nextBill = null;
        candidateBills.forEach((b) => {
          const d = this._toDate(b.due_date);
          if (!d) return;
          if (!nextBill || d < this._toDate(nextBill.due_date)) nextBill = b;
        });
        if (nextBill) {
          const due = this._toDate(nextBill.due_date);
          const run = this._addDays(due, -Number(hydratedRule.days_before_due || 0));
          nextRunDate = this._toISODate(run);
        }
      }

      const payment_method_display_name = hydratedRule.payment_method
        ? hydratedRule.payment_method.display_name
        : null;
      const lease_unit_number = hydratedRule.unit ? hydratedRule.unit.unit_number : null;

      return {
        rule: hydratedRule,
        payment_method_display_name,
        lease_unit_number,
        next_run_date: nextRunDate
      };
    });

    return overview;
  }

  // getAutopayRuleDetails(ruleId)
  getAutopayRuleDetails(ruleId) {
    const rules = this._getFromStorage('autopay_rules', []);
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) {
      return {
        rule: null,
        payment_method: null,
        lease: null,
        unit: null,
        next_run_date: null,
        estimated_next_amount: 0
      };
    }

    const hydratedRule = this._hydrateAutopayRule(rule);
    const bills = this._getFromStorage('bills', []);

    let nextRunDate = null;
    let estimatedNextAmount = 0;

    if (hydratedRule.status === 'active') {
      const relevantLeaseId = hydratedRule.lease ? hydratedRule.lease.id : null;
      const candidateBills = bills.filter((b) => {
        if (relevantLeaseId && b.lease_id && b.lease_id !== relevantLeaseId) return false;
        if (b.status !== 'upcoming' && b.status !== 'due') return false;
        if (hydratedRule.applies_to === 'rent_only') {
          return b.type === 'rent';
        }
        if (hydratedRule.applies_to === 'rent_and_fees') {
          return b.type === 'rent' || b.type === 'fee';
        }
        return true; // all_charges
      });

      candidateBills.forEach((b) => {
        estimatedNextAmount += Number(b.amount_due || 0);
      });

      if (hydratedRule.amount_type === 'fixed_amount') {
        estimatedNextAmount = Number(hydratedRule.fixed_amount || 0);
      }

      let nextBill = null;
      candidateBills.forEach((b) => {
        const d = this._toDate(b.due_date);
        if (!d) return;
        if (!nextBill || d < this._toDate(nextBill.due_date)) nextBill = b;
      });
      if (nextBill) {
        const due = this._toDate(nextBill.due_date);
        const run = this._addDays(due, -Number(hydratedRule.days_before_due || 0));
        nextRunDate = this._toISODate(run);
      }
    }

    return {
      rule: hydratedRule,
      payment_method: hydratedRule.payment_method,
      lease: hydratedRule.lease,
      unit: hydratedRule.unit,
      next_run_date: nextRunDate,
      estimated_next_amount: Math.round(estimatedNextAmount * 100) / 100
    };
  }

  // saveAutopayRule(ruleId, name, appliesTo, amountType, fixedAmount, daysBeforeDue, paymentMethodId, reminderEnabled, reminderOffsetDays, endCondition, endDate, startDate, status)
  saveAutopayRule(
    ruleId,
    name,
    appliesTo,
    amountType,
    fixedAmount,
    daysBeforeDue,
    paymentMethodId,
    reminderEnabled,
    reminderOffsetDays,
    endCondition,
    endDate,
    startDate,
    status
  ) {
    let rules = this._getFromStorage('autopay_rules', []);
    const nowISO = this._toISODate(new Date());
    let rule;
    if (ruleId) {
      const idx = rules.findIndex((r) => r.id === ruleId);
      if (idx === -1) {
        return { success: false, rule: null, message: 'Autopay rule not found' };
      }
      rule = rules[idx];
      rule.name = name || rule.name || null;
      rule.applies_to = appliesTo || rule.applies_to;
      rule.amount_type = amountType || rule.amount_type;
      rule.fixed_amount = amountType === 'fixed_amount' ? Number(fixedAmount || 0) : null;
      rule.days_before_due = Number(daysBeforeDue || 0);
      rule.payment_method_id = paymentMethodId;
      rule.reminder_enabled = !!reminderEnabled;
      rule.reminder_offset_days = reminderEnabled ? Number(reminderOffsetDays || 0) : null;
      rule.end_condition = endCondition || rule.end_condition;
      rule.end_date = endCondition === 'end_on_date' ? endDate || null : null;
      rule.start_date = startDate || rule.start_date || null;
      if (status) {
        rule.status = status;
      }
      rule.updated_at = nowISO;
      rules[idx] = rule;
    } else {
      const currentLease = this._getCurrentLease();
      rule = {
        id: this._generateId('autopay'),
        name: name || 'Rent autopay',
        applies_to: appliesTo || 'rent_and_fees',
        amount_type: amountType || 'full_statement_balance',
        fixed_amount: amountType === 'fixed_amount' ? Number(fixedAmount || 0) : null,
        days_before_due: Number(daysBeforeDue || 0),
        payment_method_id: paymentMethodId,
        reminder_enabled: !!reminderEnabled,
        reminder_offset_days: reminderEnabled ? Number(reminderOffsetDays || 0) : null,
        end_condition: endCondition || 'until_canceled',
        end_date: endCondition === 'end_on_date' ? endDate || null : null,
        start_date: startDate || nowISO,
        lease_id: currentLease ? currentLease.id : null,
        status: status || 'active',
        created_at: nowISO,
        updated_at: nowISO
      };
      rules.push(rule);
    }

    this._saveToStorage('autopay_rules', rules);

    return {
      success: true,
      rule: this._hydrateAutopayRule(rule),
      message: 'Autopay rule saved'
    };
  }

  // getTransactionFilterOptions()
  getTransactionFilterOptions() {
    const today = new Date();
    const sixMonthsAgo = this._addMonths(today, -6);

    const transaction_types = [
      { value: 'rent_charge', label: 'Rent Charge' },
      { value: 'late_fee', label: 'Late Fee' },
      { value: 'utility_charge', label: 'Utility Charge' },
      { value: 'parking_fee', label: 'Parking Fee' },
      { value: 'amenity_fee', label: 'Amenity Fee' },
      { value: 'payment', label: 'Payment' },
      { value: 'adjustment', label: 'Adjustment' },
      { value: 'other_fee', label: 'Other Fee' }
    ];

    const sort_options = [
      { value: 'date_desc', label: 'Date (newest first)' },
      { value: 'date_asc', label: 'Date (oldest first)' },
      { value: 'amount_desc', label: 'Amount (high to low)' },
      { value: 'amount_asc', label: 'Amount (low to high)' }
    ];

    return {
      default_start_date: this._toISODate(this._startOfDay(sixMonthsAgo)),
      default_end_date: this._toISODate(this._endOfDay(today)),
      transaction_types,
      sort_options
    };
  }

  // getTransactions(startDate, endDate, types, sortBy, sortDirection, page, pageSize)
  getTransactions(startDate, endDate, types, sortBy, sortDirection, page, pageSize) {
    const txsRaw = this._getFromStorage('transactions', []);
    const bills = this._getFromStorage('bills', []);
    const payments = this._getFromStorage('payments', []);

    const start = this._startOfDay(startDate || new Date());
    const end = this._endOfDay(endDate || new Date());

    const typeSet = Array.isArray(types) && types.length > 0 ? new Set(types) : null;

    let filtered = txsRaw.filter((tx) => {
      const d = this._toDate(tx.date);
      if (!d) return false;
      if (d < start || d > end) return false;
      if (typeSet && !typeSet.has(tx.type)) return false;
      return true;
    });

    const sortField = sortBy || 'date';
    const dir = (sortDirection || 'desc').toLowerCase() === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      if (sortField === 'amount') {
        const da = Number(a.amount || 0);
        const db = Number(b.amount || 0);
        return (da - db) * dir;
      }
      // default date sort
      const da = this._toDate(a.date);
      const db = this._toDate(b.date);
      return ((da ? da.getTime() : 0) - (db ? db.getTime() : 0)) * dir;
    });

    const total_count = filtered.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (pg - 1) * ps;
    const endIdx = startIdx + ps;
    const pageItems = filtered.slice(startIdx, endIdx);

    const items = pageItems.map((tx) => {
      const hydratedTx = this._hydrateTransaction(tx);
      const bill = tx.bill_id ? bills.find((b) => b.id === tx.bill_id) : null;
      const payment = tx.payment_id ? payments.find((p) => p.id === tx.payment_id) : null;
      return {
        transaction: hydratedTx,
        bill_label: bill ? bill.label : null,
        bill_type: bill ? bill.type : null,
        related_payment_status: payment ? payment.status : null
      };
    });

    return {
      total_count,
      page: pg,
      page_size: ps,
      items
    };
  }

  // getTransactionDetails(transactionId)
  getTransactionDetails(transactionId) {
    const txs = this._getFromStorage('transactions', []);
    const bills = this._getFromStorage('bills', []);
    const payments = this._getFromStorage('payments', []);

    const tx = txs.find((t) => t.id === transactionId);
    if (!tx) {
      return {
        transaction: null,
        bill: null,
        payment: null
      };
    }

    const bill = tx.bill_id ? bills.find((b) => b.id === tx.bill_id) : null;
    const payment = tx.payment_id ? payments.find((p) => p.id === tx.payment_id) : null;

    return {
      transaction: this._hydrateTransaction(tx),
      bill: bill ? this._hydrateBill(bill) : null,
      payment: payment ? this._hydratePayment(payment) : null
    };
  }

  // submitTransactionDispute(transactionId, comment)
  submitTransactionDispute(transactionId, comment) {
    const txs = this._getFromStorage('transactions', []);
    let disputes = this._getFromStorage('transaction_disputes', []);

    const txIdx = txs.findIndex((t) => t.id === transactionId);
    if (txIdx === -1) {
      return { success: false, dispute: null, updated_transaction: null, message: 'Transaction not found' };
    }

    const nowISO = this._toISODate(new Date());
    const dispute = {
      id: this._generateId('dispute'),
      transaction_id: transactionId,
      submitted_at: nowISO,
      status: 'submitted',
      comment: comment || '',
      resolution_notes: null,
      resolved_at: null
    };

    disputes.push(dispute);
    this._saveToStorage('transaction_disputes', disputes);

    const tx = txs[txIdx];
    tx.is_flagged_for_review = true;
    tx.status = 'disputed';
    tx.updated_at = nowISO;
    txs[txIdx] = tx;
    this._saveToStorage('transactions', txs);

    return {
      success: true,
      dispute,
      updated_transaction: this._hydrateTransaction(tx),
      message: 'Transaction dispute submitted'
    };
  }

  // getMaintenanceRequests()
  getMaintenanceRequests() {
    const reqs = this._getFromStorage('maintenance_requests', []);
    return reqs.map((r) => this._hydrateMaintenanceRequest(r));
  }

  // getMaintenanceRequestDetails(requestId)
  getMaintenanceRequestDetails(requestId) {
    const reqs = this._getFromStorage('maintenance_requests', []);
    const req = reqs.find((r) => r.id === requestId);
    if (!req) return null;
    return this._hydrateMaintenanceRequest(req);
  }

  // getMaintenanceRequestFormOptions()
  getMaintenanceRequestFormOptions() {
    const { allowed_date_start, allowed_date_end, time_windows } =
      this._suggestPreferredAppointmentWindows();

    const categories = [
      { value: 'plumbing', label: 'Plumbing' },
      { value: 'electrical', label: 'Electrical' },
      { value: 'hvac', label: 'HVAC' },
      { value: 'appliance', label: 'Appliance' },
      { value: 'general', label: 'General' },
      { value: 'other', label: 'Other' }
    ];

    const priorities = [
      { value: 'non_urgent', label: 'Non-urgent' },
      { value: 'routine', label: 'Routine' },
      { value: 'urgent', label: 'Urgent' },
      { value: 'emergency', label: 'Emergency' }
    ];

    const entry_permissions = [
      { value: 'enter_with_key', label: 'Yes, you may enter with key' },
      { value: 'appointment_only', label: 'Appointment only' },
      { value: 'do_not_enter', label: 'Do not enter' },
      { value: 'other', label: 'Other' }
    ];

    return {
      categories,
      priorities,
      entry_permissions,
      allowed_date_start,
      allowed_date_end,
      time_windows
    };
  }

  // createMaintenanceRequest(category, title, description, priority, preferredDate, preferredTimeStart, preferredTimeEnd, entryPermission, allowEntryWhenAbsent)
  createMaintenanceRequest(
    category,
    title,
    description,
    priority,
    preferredDate,
    preferredTimeStart,
    preferredTimeEnd,
    entryPermission,
    allowEntryWhenAbsent
  ) {
    let reqs = this._getFromStorage('maintenance_requests', []);
    const nowISO = this._toISODate(new Date());
    const lease = this._getCurrentLease();

    const preferredStartDT = this._parseTimeToDate(preferredDate, preferredTimeStart);
    const preferredEndDT = this._parseTimeToDate(preferredDate, preferredTimeEnd);
    const preferredDateDT = this._startOfDay(preferredDate || new Date());

    const record = {
      id: this._generateId('mreq'),
      category: category || 'general',
      title: title || '',
      description: description || '',
      priority: priority || 'non_urgent',
      status: 'submitted',
      preferred_date: this._toISODate(preferredDateDT),
      preferred_time_start: this._toISODate(preferredStartDT),
      preferred_time_end: this._toISODate(preferredEndDT),
      entry_permission: entryPermission || 'enter_with_key',
      allow_entry_when_absent: !!allowEntryWhenAbsent,
      lease_id: lease ? lease.id : null,
      created_at: nowISO,
      updated_at: nowISO,
      scheduled_visit_datetime: null,
      completion_notes: null
    };

    reqs.push(record);
    this._saveToStorage('maintenance_requests', reqs);

    return {
      success: true,
      request: this._hydrateMaintenanceRequest(record),
      message: 'Maintenance request submitted'
    };
  }

  // getParkingFilterOptions()
  getParkingFilterOptions() {
    const spots = this._getFromStorage('parking_spots', []);
    let min = null;
    let max = null;
    spots.forEach((s) => {
      const price = Number(s.monthly_price || 0);
      if (min === null || price < min) min = price;
      if (max === null || price > max) max = price;
    });

    const parking_types = [
      { value: 'covered', label: 'Covered' },
      { value: 'uncovered', label: 'Uncovered' },
      { value: 'carport', label: 'Carport' },
      { value: 'garage', label: 'Garage' },
      { value: 'tandem', label: 'Tandem' },
      { value: 'accessible', label: 'Accessible' },
      { value: 'other', label: 'Other' }
    ];

    const sort_options = [
      { value: 'monthly_price_asc', label: 'Price (low to high)' },
      { value: 'monthly_price_desc', label: 'Price (high to low)' },
      { value: 'spot_number_asc', label: 'Spot number (A-Z)' }
    ];

    return {
      parking_types,
      price_min: min !== null ? min : 0,
      price_max: max !== null ? max : 0,
      sort_options
    };
  }

  // searchAvailableParkingSpots(type, minPrice, maxPrice, sortBy, sortDirection)
  searchAvailableParkingSpots(type, minPrice, maxPrice, sortBy, sortDirection) {
    const spots = this._getFromStorage('parking_spots', []);
    const min = minPrice != null ? Number(minPrice) : null;
    const max = maxPrice != null ? Number(maxPrice) : null;

    let filtered = spots.filter((s) => s.status === 'available');

    if (type) {
      filtered = filtered.filter((s) => s.type === type);
    }

    if (min != null) {
      filtered = filtered.filter((s) => Number(s.monthly_price || 0) >= min);
    }
    if (max != null) {
      filtered = filtered.filter((s) => Number(s.monthly_price || 0) <= max);
    }

    const sortField = sortBy || 'monthly_price';
    const dir = (sortDirection || 'asc').toLowerCase() === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      if (sortField === 'spot_number') {
        const sa = (a.spot_number || '').toString();
        const sb = (b.spot_number || '').toString();
        return sa.localeCompare(sb) * dir;
      }
      const pa = Number(a.monthly_price || 0);
      const pb = Number(b.monthly_price || 0);
      return (pa - pb) * dir;
    });

    return filtered.map((s) => ({
      parking_spot: s,
      is_covered_equivalent: s.type === 'covered' || s.type === 'carport'
    }));
  }

  // getParkingSpotDetails(parkingSpotId)
  getParkingSpotDetails(parkingSpotId) {
    const spots = this._getFromStorage('parking_spots', []);
    return spots.find((s) => s.id === parkingSpotId) || null;
  }

  // createParkingReservation(parkingSpotId, unitId, startDate, endDate)
  createParkingReservation(parkingSpotId, unitId, startDate, endDate) {
    const spots = this._getFromStorage('parking_spots', []);
    const units = this._getFromStorage('units', []);
    let reservations = this._getFromStorage('parking_reservations', []);

    const spot = spots.find((s) => s.id === parkingSpotId);
    if (!spot || spot.status !== 'available') {
      return { success: false, reservation: null, message: 'Parking spot not available' };
    }

    const unit = units.find((u) => u.id === unitId) || this._getCurrentUnit();
    if (!unit) {
      return { success: false, reservation: null, message: 'Unit not found' };
    }

    const nowISO = this._toISODate(new Date());

    const record = {
      id: this._generateId('pres'),
      parking_spot_id: parkingSpotId,
      unit_id: unit.id,
      start_date: startDate,
      end_date: endDate || null,
      status: 'pending',
      created_at: nowISO,
      updated_at: nowISO
    };

    reservations.push(record);
    this._saveToStorage('parking_reservations', reservations);

    // Update spot status to reserved
    const spotIdx = spots.findIndex((s) => s.id === parkingSpotId);
    if (spotIdx !== -1) {
      spots[spotIdx].status = 'reserved';
      this._saveToStorage('parking_spots', spots);
    }

    return {
      success: true,
      reservation: this._hydrateParkingReservation(record),
      message: 'Parking reservation created'
    };
  }

  // getAmenitiesList()
  getAmenitiesList() {
    const amenities = this._getFromStorage('amenities', []);
    return amenities.filter((a) => a.status === 'active');
  }

  // getAmenityTimeSlots(amenityId, date, durationMinutes)
  getAmenityTimeSlots(amenityId, date, durationMinutes) {
    const slots = this._getFromStorage('amenity_time_slots', []);
    const targetDate = this._startOfDay(date || new Date());

    let filtered = slots.filter((s) => {
      if (s.amenity_id !== amenityId) return false;
      if (s.status !== 'available') return false;
      const d = this._startOfDay(s.date);
      return d.getTime() === targetDate.getTime();
    });

    if (durationMinutes != null) {
      const dur = Number(durationMinutes);
      filtered = filtered.filter((s) => Number(s.duration_minutes || 0) === dur);
    }

    return filtered.map((s) => this._hydrateAmenityTimeSlot(s));
  }

  // createAmenityReservation(timeslotId, attendees)
  createAmenityReservation(timeslotId, attendees) {
    let slots = this._getFromStorage('amenity_time_slots', []);
    let reservations = this._getFromStorage('amenity_reservations', []);

    const slotIdx = slots.findIndex((s) => s.id === timeslotId);
    if (slotIdx === -1) {
      return { success: false, reservation: null, message: 'Time slot not found' };
    }

    const slot = slots[slotIdx];
    if (slot.status !== 'available' && slot.status !== 'held') {
      return { success: false, reservation: null, message: 'Time slot not available' };
    }

    const attendeesNum = Number(attendees || 1);
    const max = slot.max_attendees != null ? Number(slot.max_attendees) : null;
    const current = slot.current_attendees != null ? Number(slot.current_attendees) : 0;

    if (max != null && current + attendeesNum > max) {
      return { success: false, reservation: null, message: 'Time slot capacity exceeded' };
    }

    const nowISO = this._toISODate(new Date());

    const record = {
      id: this._generateId('ares'),
      amenity_id: slot.amenity_id,
      timeslot_id: slot.id,
      date: slot.date,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      attendees: attendeesNum,
      status: 'reserved',
      created_at: nowISO,
      updated_at: nowISO
    };

    reservations.push(record);
    this._saveToStorage('amenity_reservations', reservations);

    // Update slot attendees and status
    slot.current_attendees = current + attendeesNum;
    if (max != null && slot.current_attendees >= max) {
      slot.status = 'reserved';
    } else {
      slot.status = 'held';
    }
    slots[slotIdx] = slot;
    this._saveToStorage('amenity_time_slots', slots);

    return {
      success: true,
      reservation: this._hydrateAmenityReservation(record),
      message: 'Amenity reservation created'
    };
  }

  // getUpcomingAmenityReservations()
  getUpcomingAmenityReservations() {
    const reservations = this._getFromStorage('amenity_reservations', []);
    const amenities = this._getFromStorage('amenities', []);
    const now = new Date();

    const upcoming = reservations
      .filter((r) => r.status === 'reserved')
      .filter((r) => {
        const start = this._toDate(r.start_datetime);
        return start && start >= now;
      })
      .sort((a, b) => this._toDate(a.start_datetime) - this._toDate(b.start_datetime))
      .map((r) => {
        const amenity = amenities.find((a) => a.id === r.amenity_id) || null;
        return {
          reservation: this._hydrateAmenityReservation(r),
          amenity
        };
      });

    return upcoming;
  }

  // getLeaseOverview()
  getLeaseOverview() {
    const lease = this._getCurrentLease();
    const unit = this._getCurrentUnit();
    const offers = this._getFromStorage('lease_renewal_offers', []);

    const has_pending_renewal_offers = lease
      ? offers.some((o) => o.lease_id === lease.id && o.status === 'offered')
      : false;

    return {
      lease: lease || null,
      unit: unit || null,
      current_monthly_rent: lease ? Number(lease.monthly_rent || 0) : 0,
      lease_status: lease ? lease.status : 'none',
      has_pending_renewal_offers
    };
  }

  // getOccupants()
  getOccupants() {
    const lease = this._getCurrentLease();
    if (!lease) return [];
    const occupants = this._getFromStorage('occupants', []);
    return occupants
      .filter((o) => o.lease_id === lease.id)
      .map((o) => this._hydrateOccupant(o));
  }

  // getOccupantFormOptions()
  getOccupantFormOptions() {
    const today = new Date();
    const earliestStart = this._firstDayOfNextMonth(today);

    const relationships = [
      { value: 'roommate', label: 'Roommate' },
      { value: 'spouse', label: 'Spouse/Partner' },
      { value: 'child', label: 'Child' },
      { value: 'parent', label: 'Parent' },
      { value: 'other', label: 'Other' }
    ];

    const access_permissions = [
      { value: 'issue_key_fob', label: 'Issue key/fob' },
      { value: 'no_access', label: 'No access' },
      { value: 'building_only', label: 'Building access only' },
      { value: 'parking_only', label: 'Parking access only' }
    ];

    return {
      relationships,
      access_permissions,
      earliest_start_date: this._toISODate(earliestStart)
    };
  }

  // addOccupant(fullName, phoneNumber, relationship, startDate, accessPermission)
  addOccupant(fullName, phoneNumber, relationship, startDate, accessPermission) {
    const lease = this._getCurrentLease();
    if (!lease) {
      return { success: false, occupant: null, message: 'No active lease found' };
    }

    let occupants = this._getFromStorage('occupants', []);
    const nowISO = this._toISODate(new Date());

    const record = {
      id: this._generateId('occ'),
      lease_id: lease.id,
      full_name: fullName || '',
      phone_number: phoneNumber || '',
      relationship: relationship || 'roommate',
      start_date: startDate || this._toISODate(this._firstDayOfNextMonth(new Date())),
      end_date: null,
      access_permission: accessPermission || 'issue_key_fob',
      status: 'pending_approval',
      created_at: nowISO,
      updated_at: nowISO
    };

    occupants.push(record);
    this._saveToStorage('occupants', occupants);

    return {
      success: true,
      occupant: this._hydrateOccupant(record),
      message: 'Occupant added and pending approval'
    };
  }

  // getLeaseRenewalFilterOptions()
  getLeaseRenewalFilterOptions() {
    const offers = this._getFromStorage('lease_renewal_offers', []);
    const lease = this._getCurrentLease();

    const relevantOffers = lease ? offers.filter((o) => o.lease_id === lease.id) : offers;

    const termSet = new Set();
    let minRent = null;
    let maxRent = null;

    relevantOffers.forEach((o) => {
      termSet.add(o.term_length_months);
      const rent = Number(o.monthly_rent || 0);
      if (minRent === null || rent < minRent) minRent = rent;
      if (maxRent === null || rent > maxRent) maxRent = rent;
    });

    const term_length_options = Array.from(termSet)
      .sort((a, b) => a - b)
      .map((m) => ({ months: m, label: `${m} months` }));

    const sort_options = [
      { value: 'monthly_rent_asc', label: 'Monthly rent (low to high)' },
      { value: 'monthly_rent_desc', label: 'Monthly rent (high to low)' },
      { value: 'term_length_asc', label: 'Term length (shortest first)' }
    ];

    return {
      term_length_options,
      min_rent: minRent !== null ? minRent : 0,
      max_rent: maxRent !== null ? maxRent : 0,
      sort_options
    };
  }

  // getLeaseRenewalOffers(termLengthMonths, maxMonthlyRent, sortBy, sortDirection)
  getLeaseRenewalOffers(termLengthMonths, maxMonthlyRent, sortBy, sortDirection) {
    const offers = this._getFromStorage('lease_renewal_offers', []);
    const lease = this._getCurrentLease();
    const now = new Date();

    let filtered = offers.filter((o) => {
      if (lease && o.lease_id !== lease.id) return false;
      if (o.status !== 'offered') return false;
      const exp = this._toDate(o.expiration_date);
      if (exp && exp < now) return false;
      return true;
    });

    if (termLengthMonths != null) {
      const tl = Number(termLengthMonths);
      filtered = filtered.filter((o) => Number(o.term_length_months || 0) === tl);
    }

    if (maxMonthlyRent != null) {
      const maxR = Number(maxMonthlyRent);
      filtered = filtered.filter((o) => Number(o.monthly_rent || 0) <= maxR);
    }

    const field = sortBy || 'monthly_rent';
    const dir = (sortDirection || 'asc').toLowerCase() === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      if (field === 'term_length') {
        const ta = Number(a.term_length_months || 0);
        const tb = Number(b.term_length_months || 0);
        return (ta - tb) * dir;
      }
      const ra = Number(a.monthly_rent || 0);
      const rb = Number(b.monthly_rent || 0);
      return (ra - rb) * dir;
    });

    return filtered;
  }

  // getLeaseRenewalOfferDetails(offerId)
  getLeaseRenewalOfferDetails(offerId) {
    const offers = this._getFromStorage('lease_renewal_offers', []);
    const leases = this._getFromStorage('leases', []);
    const units = this._getFromStorage('units', []);

    const offer = offers.find((o) => o.id === offerId);
    if (!offer) {
      return { offer: null, lease: null, unit: null };
    }

    const lease = leases.find((l) => l.id === offer.lease_id) || null;
    let unit = null;
    if (lease && lease.unit_id) {
      unit = units.find((u) => u.id === lease.unit_id) || null;
    }

    return {
      offer,
      lease,
      unit
    };
  }

  // acceptLeaseRenewalOffer(offerId, acknowledgementAccepted)
  acceptLeaseRenewalOffer(offerId, acknowledgementAccepted) {
    if (!acknowledgementAccepted) {
      return { success: false, offer: null, message: 'Acknowledgement is required' };
    }

    let offers = this._getFromStorage('lease_renewal_offers', []);
    let leases = this._getFromStorage('leases', []);
    const now = new Date();
    const nowISO = this._toISODate(now);

    const idx = offers.findIndex((o) => o.id === offerId);
    if (idx === -1) {
      return { success: false, offer: null, message: 'Offer not found' };
    }

    const offer = offers[idx];
    if (offer.status !== 'offered') {
      return { success: false, offer: null, message: 'Offer is not available to accept' };
    }
    const exp = this._toDate(offer.expiration_date);
    if (exp && exp < now) {
      return { success: false, offer: null, message: 'Offer has expired' };
    }

    // Accept this offer
    offer.status = 'accepted';
    offer.updated_at = nowISO;
    offers[idx] = offer;

    // Decline other offers for same lease that are still offered
    offers = offers.map((o) => {
      if (o.id !== offer.id && o.lease_id === offer.lease_id && o.status === 'offered') {
        return { ...o, status: 'declined', updated_at: nowISO };
      }
      return o;
    });

    this._saveToStorage('lease_renewal_offers', offers);

    // Optionally update lease status to pending_renewal
    const leaseIdx = leases.findIndex((l) => l.id === offer.lease_id);
    if (leaseIdx !== -1) {
      const lease = leases[leaseIdx];
      lease.status = 'pending_renewal';
      lease.updated_at = nowISO;
      leases[leaseIdx] = lease;
      this._saveToStorage('leases', leases);
    }

    return {
      success: true,
      offer,
      message: 'Lease renewal offer accepted'
    };
  }

  // getAccountSettings()
  getAccountSettings() {
    return this._getCurrentAccountSettings();
  }

  // updateCommunicationPreferences({ ...preferences })
  updateCommunicationPreferences(preferences) {
    const settingsArr = this._getFromStorage('account_settings', []);
    let settings = settingsArr.length > 0 ? settingsArr[0] : this._getCurrentAccountSettings();

    const map = {
      paymentEmailEnabled: 'payment_email_enabled',
      paymentSmsEnabled: 'payment_sms_enabled',
      paymentPushEnabled: 'payment_push_enabled',
      maintenanceEmailEnabled: 'maintenance_email_enabled',
      maintenanceSmsEnabled: 'maintenance_sms_enabled',
      maintenancePushEnabled: 'maintenance_push_enabled',
      marketingEmailEnabled: 'marketing_email_enabled',
      marketingSmsEnabled: 'marketing_sms_enabled',
      marketingPushEnabled: 'marketing_push_enabled',
      marketingGlobalOptIn: 'marketing_global_opt_in'
    };

    Object.keys(map).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(preferences, key)) {
        const target = map[key];
        settings[target] = !!preferences[key];
      }
    });

    settings.updated_at = this._toISODate(new Date());

    if (settingsArr.length === 0) {
      this._saveToStorage('account_settings', [settings]);
    } else {
      settingsArr[0] = settings;
      this._saveToStorage('account_settings', settingsArr);
    }

    return {
      success: true,
      accountSettings: settings,
      message: 'Communication preferences updated'
    };
  }

  // getAboutContent()
  getAboutContent() {
    const content = this._getFromStorage('about_content', {});
    return {
      title: content.title || '',
      body: content.body || '',
      sections: Array.isArray(content.sections) ? content.sections : []
    };
  }

  // getHelpTopics()
  getHelpTopics() {
    const topics = this._getFromStorage('help_topics', []);
    // topics expected to already be simple objects; no foreign keys
    return topics;
  }

  // getHelpTopicDetails(helpTopicId)
  getHelpTopicDetails(helpTopicId) {
    const topics = this._getFromStorage('help_topics', []);
    const topic = topics.find((t) => t.id === helpTopicId);
    if (!topic) {
      return {
        id: null,
        category: null,
        title: '',
        body: '',
        related_task_ids: []
      };
    }
    return {
      id: topic.id,
      category: topic.category || null,
      title: topic.title || '',
      body: topic.body || topic.summary || '',
      related_task_ids: Array.isArray(topic.related_task_ids) ? topic.related_task_ids : []
    };
  }

  // getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', {});
    return {
      office_phone: info.office_phone || '',
      office_email: info.office_email || '',
      office_hours: info.office_hours || '',
      emergency_phone: info.emergency_phone || null
    };
  }

  // submitContactForm(subject, message, topic, isUrgent)
  submitContactForm(subject, message, topic, isUrgent) {
    let tickets = this._getFromStorage('contact_form_tickets', []);
    const nowISO = this._toISODate(new Date());

    const ticket = {
      id: this._generateId('contact'),
      subject: subject || '',
      message: message || '',
      topic: topic || null,
      is_urgent: !!isUrgent,
      created_at: nowISO
    };

    tickets.push(ticket);
    this._saveToStorage('contact_form_tickets', tickets);

    return {
      success: true,
      ticketId: ticket.id,
      message: 'Contact request submitted'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const content = this._getFromStorage('privacy_policy_content', {});
    return {
      last_updated: content.last_updated || null,
      body: content.body || '',
      sections: Array.isArray(content.sections) ? content.sections : []
    };
  }

  // getTermsOfServiceContent()
  getTermsOfServiceContent() {
    const content = this._getFromStorage('terms_of_service_content', {});
    return {
      last_updated: content.last_updated || null,
      body: content.body || '',
      sections: Array.isArray(content.sections) ? content.sections : []
    };
  }
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
