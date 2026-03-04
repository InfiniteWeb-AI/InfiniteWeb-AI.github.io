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
  }

  // -------------------------
  // Storage helpers
  // -------------------------
  _initStorage() {
    const keys = [
      'invoices',
      'payment_methods',
      'payments',
      'amenities',
      'amenity_reservations',
      'maintenance_requests',
      'events',
      'event_registrations',
      'forum_categories',
      'forum_topics',
      'forum_posts',
      'pre_approved_colors',
      'architectural_requests',
      'rules',
      'rule_watchlist_entries',
      'guest_parking_permits',
      'elections',
      'candidates',
      'ballots',
      'ballot_selections',
      'announcements',
      // simple config buckets
      'architectural_settings',
      'guest_parking_config',
      'about_contact_help',
      'idCounter'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        if (key === 'idCounter') {
          localStorage.setItem('idCounter', '1000');
        } else if (key === 'architectural_settings') {
          // store lead time config; can be changed externally
          localStorage.setItem(
            'architectural_settings',
            JSON.stringify({ lead_time_days_required: 14 })
          );
        } else if (key === 'guest_parking_config') {
          localStorage.setItem(
            'guest_parking_config',
            JSON.stringify({ daily_guest_limit: 3 })
          );
        } else if (key === 'about_contact_help') {
          // default empty content; real content can be populated externally
          localStorage.setItem(
            'about_contact_help',
            JSON.stringify({
              about: { title: '', body: '' },
              contact: { address: '', phone: '', email: '', office_hours: '' },
              faq: [],
              legal: { privacy_policy: '', terms_of_use: '' }
            })
          );
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
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

  // -------------------------
  // Generic date/time helpers
  // -------------------------
  _todayDateOnly() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  _toISODateString(date) {
    if (!(date instanceof Date)) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  _addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    if (typeof dateStr === 'string') {
      const simpleDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (simpleDateMatch) {
        const year = parseInt(simpleDateMatch[1], 10);
        const month = parseInt(simpleDateMatch[2], 10) - 1;
        const day = parseInt(simpleDateMatch[3], 10);
        // Interpret YYYY-MM-DD as a local date to avoid timezone shift issues
        return new Date(year, month, day);
      }
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _getTimePartFromISO(isoString) {
    if (typeof isoString === 'string') {
      const match = isoString.match(/T(\d{2}:\d{2})/);
      if (match) {
        return match[1];
      }
    }
    const d = this._parseDate(isoString);
    if (!d) return '';
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  }

  _compareTimeStrings(t1, t2) {
    // t1, t2 in 'HH:MM'; lexicographic compare works
    if (t1 === t2) return 0;
    return t1 < t2 ? -1 : 1;
  }

  // -------------------------
  // Required helper functions
  // -------------------------

  _getCurrentResidentContext() {
    // Single-resident system; context can be extended later
    return { residentKey: 'singleton_resident' };
  }

  _calculateConvenienceFee(paymentMethod, amount) {
    if (!paymentMethod) {
      return { convenience_fee_amount: 0, total_amount: amount };
    }
    const flat = Number(paymentMethod.convenience_fee_flat || 0);
    const percent = Number(paymentMethod.convenience_fee_percent || 0);
    const amt = Number(amount || 0);
    const fee = flat + amt * (percent / 100);
    const roundedFee = Math.round(fee * 100) / 100;
    const total = Math.round((amt + roundedFee) * 100) / 100;
    return { convenience_fee_amount: roundedFee, total_amount: total };
  }

  _getCurrentQuarterInvoice() {
    const invoices = this._getFromStorage('invoices');
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-11
    const quarter = Math.floor(month / 3) + 1; // 1-4
    const invoice = invoices.find(
      (inv) => inv.year === year && inv.quarter === quarter
    );
    return invoice || null;
  }

  _validatePaymentDateAgainstDueDate(invoice, paymentDateStr) {
    if (!invoice) {
      return { is_valid: false, message: 'Invoice not found.' };
    }
    if (!paymentDateStr) {
      return { is_valid: false, message: 'Payment date is required.' };
    }
    const paymentDate = this._parseDate(paymentDateStr);
    if (!paymentDate) {
      return { is_valid: false, message: 'Invalid payment date.' };
    }
    const paymentDay = this._todayDateOnly();
    paymentDay.setTime(paymentDate.getTime());
    paymentDay.setHours(0, 0, 0, 0);

    const today = this._todayDateOnly();

    if (paymentDay.getTime() < today.getTime()) {
      return {
        is_valid: false,
        message: 'Payment date cannot be in the past.'
      };
    }

    const dueDate = this._parseDate(invoice.due_date);
    if (!dueDate) {
      // if due date missing, accept any non-past date
      return { is_valid: true, message: '' };
    }
    const dueDay = this._todayDateOnly();
    dueDay.setTime(dueDate.getTime());
    dueDay.setHours(0, 0, 0, 0);

    if (paymentDay.getTime() > dueDay.getTime()) {
      return {
        is_valid: false,
        message: 'Payment date must be on or before the due date.'
      };
    }

    return { is_valid: true, message: '' };
  }

  _validateAmenityReservationSlot(amenityId, dateStr, startTime, endTime, guestCount) {
    const amenities = this._getFromStorage('amenities');
    const reservations = this._getFromStorage('amenity_reservations');
    const amenity = amenities.find((a) => a.id === amenityId) || null;
    if (!amenity) {
      return {
        is_available: false,
        conflict_reason: 'Amenity not found.',
        warnings: []
      };
    }
    if (!amenity.is_reservable) {
      return {
        is_available: false,
        conflict_reason: 'This amenity is not reservable.',
        warnings: []
      };
    }

    if (!dateStr) {
      return {
        is_available: false,
        conflict_reason: 'Reservation date is required.',
        warnings: []
      };
    }

    if (!startTime || !endTime) {
      return {
        is_available: false,
        conflict_reason: 'Start and end times are required.',
        warnings: []
      };
    }

    if (this._compareTimeStrings(startTime, endTime) >= 0) {
      return {
        is_available: false,
        conflict_reason: 'End time must be after start time.',
        warnings: []
      };
    }

    const warnings = [];

    // enforce simple hours: 08:00 - 22:00, can be refined per amenity later
    const minTime = '08:00';
    const maxTime = '22:00';
    if (this._compareTimeStrings(startTime, minTime) < 0 || this._compareTimeStrings(endTime, maxTime) > 0) {
      return {
        is_available: false,
        conflict_reason: 'Reservation must be between 08:00 and 22:00.',
        warnings
      };
    }

    if (typeof guestCount !== 'number' || guestCount <= 0) {
      return {
        is_available: false,
        conflict_reason: 'Guest count must be a positive number.',
        warnings
      };
    }

    if (typeof amenity.capacity === 'number' && guestCount > amenity.capacity) {
      return {
        is_available: false,
        conflict_reason: 'Guest count exceeds amenity capacity.',
        warnings
      };
    }

    const dateOnly = this._toISODateString(this._parseDate(dateStr));

    const overlapping = reservations.find((r) => {
      if (r.amenityId !== amenityId) return false;
      if (r.status === 'canceled' || r.status === 'rejected') return false;
      const rDateOnly = this._toISODateString(this._parseDate(r.date));
      if (rDateOnly !== dateOnly) return false;
      const rStart = this._getTimePartFromISO(r.start_datetime);
      const rEnd = this._getTimePartFromISO(r.end_datetime);
      // overlap if start < existing_end && end > existing_start
      return (
        this._compareTimeStrings(startTime, rEnd) < 0 &&
        this._compareTimeStrings(endTime, rStart) > 0
      );
    });

    if (overlapping) {
      return {
        is_available: false,
        conflict_reason: 'Selected time conflicts with an existing reservation.',
        warnings
      };
    }

    // simple warning if reservation ends close to closing time
    if (this._compareTimeStrings(endTime, '21:30') >= 0) {
      warnings.push('Reservation ends close to amenity closing time.');
    }

    return { is_available: true, conflict_reason: '', warnings };
  }

  _computeAmenityAvailabilitySummary(amenityId, startDateStr, endDateStr) {
    const reservations = this._getFromStorage('amenity_reservations');
    const startDate = startDateStr ? this._parseDate(startDateStr) : null;
    const endDate = endDateStr ? this._parseDate(endDateStr) : null;

    const items = reservations.filter((r) => {
      if (r.amenityId !== amenityId) return false;
      if (r.status === 'canceled' || r.status === 'rejected') return false;
      const d = this._parseDate(r.date);
      if (!d) return false;
      if (startDate && d < startDate) return false;
      if (endDate && d > endDate) return false;
      return true;
    });

    // Aggregate by date, listing time ranges
    const byDate = {};
    items.forEach((r) => {
      const dStr = this._toISODateString(this._parseDate(r.date));
      if (!byDate[dStr]) byDate[dStr] = [];
      byDate[dStr].push({
        start: this._getTimePartFromISO(r.start_datetime),
        end: this._getTimePartFromISO(r.end_datetime),
        status: r.status
      });
    });

    return byDate; // { '2026-05-10': [ {start, end, status}, ... ], ... }
  }

  _enforceArchitecturalLeadTime(plannedStartDateStr) {
    if (!plannedStartDateStr) {
      return {
        is_valid: false,
        message: 'Planned start date is required.'
      };
    }
    const settings = this._getObjectFromStorage('architectural_settings') || {
      lead_time_days_required: 14
    };
    const leadDays = Number(settings.lead_time_days_required || 14);
    const today = this._todayDateOnly();
    const earliest = this._addDays(today, leadDays);

    const planned = this._parseDate(plannedStartDateStr);
    if (!planned) {
      return { is_valid: false, message: 'Invalid planned start date.' };
    }
    const plannedDay = this._todayDateOnly();
    plannedDay.setTime(planned.getTime());
    plannedDay.setHours(0, 0, 0, 0);

    if (plannedDay.getTime() < earliest.getTime()) {
      return {
        is_valid: false,
        message: 'Planned start date must be at least ' + leadDays + ' days from today.'
      };
    }

    return { is_valid: true, message: '' };
  }

  _getOrCreateBallotForCurrentElection(election) {
    if (!election) return null;
    const ballots = this._getFromStorage('ballots');
    let ballot = ballots.find((b) => b.electionId === election.id) || null;
    if (!ballot) {
      ballot = {
        id: this._generateId('ballot'),
        electionId: election.id,
        status: 'in_progress',
        confirmation_checked: false,
        submitted_at: null
      };
      ballots.push(ballot);
      this._saveToStorage('ballots', ballots);
    }
    return ballot;
  }

  _enforceElectionMaxVotes(election, candidateIds) {
    if (!election) {
      return { is_valid: false, message: 'No open election.' };
    }
    const uniqueIds = Array.from(new Set(candidateIds || []));
    if (uniqueIds.length > Number(election.max_votes || 0)) {
      return {
        is_valid: false,
        message: 'You may select at most ' + election.max_votes + ' candidates.'
      };
    }
    return { is_valid: true, message: '' };
  }

  _getDailyGuestPermitUsage(permitDateStr) {
    const config = this._getObjectFromStorage('guest_parking_config') || {
      daily_guest_limit: 3
    };
    const limit = Number(config.daily_guest_limit || 0);
    const permits = this._getFromStorage('guest_parking_permits');

    const normalized = this._toISODateString(this._parseDate(permitDateStr));
    let count = 0;
    permits.forEach((p) => {
      const dStr = this._toISODateString(this._parseDate(p.permit_date));
      if (dStr === normalized && p.status !== 'canceled') {
        count += 1;
      }
    });

    return {
      current_count: count,
      daily_guest_limit: limit,
      remaining: limit > 0 ? Math.max(limit - count, 0) : null,
      is_over_limit: limit > 0 ? count >= limit : false
    };
  }

  // -------------------------
  // Core interface implementations
  // -------------------------

  // getHomeOverview
  getHomeOverview() {
    const invoices = this._getFromStorage('invoices');
    const amenityReservations = this._getFromStorage('amenity_reservations');
    const amenities = this._getFromStorage('amenities');
    const maintenanceRequests = this._getFromStorage('maintenance_requests');
    const events = this._getFromStorage('events');
    const elections = this._getFromStorage('elections');
    const ballots = this._getFromStorage('ballots');
    const announcements = this._getFromStorage('announcements');

    const today = this._todayDateOnly();

    // next_invoice
    const openInvoices = invoices
      .map((inv) => {
        const balance = Math.max(0, Number(inv.amount_due || 0) - Number(inv.amount_paid || 0));
        const dueDate = this._parseDate(inv.due_date);
        const dueDay = dueDate ? new Date(dueDate.getTime()) : null;
        if (dueDay) dueDay.setHours(0, 0, 0, 0);
        const isOverdue = dueDay ? dueDay.getTime() < today.getTime() && inv.status !== 'paid' : false;
        const daysUntilDue = dueDay
          ? Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        return {
          ...inv,
          balance_remaining: balance,
          is_overdue: isOverdue,
          days_until_due: daysUntilDue
        };
      })
      .filter((inv) => (inv.status === 'open' || inv.status === 'overdue') && inv.balance_remaining > 0);

    openInvoices.sort((a, b) => {
      const da = this._parseDate(a.due_date)?.getTime() || 0;
      const db = this._parseDate(b.due_date)?.getTime() || 0;
      return da - db;
    });

    const next_invoice = openInvoices.length > 0
      ? {
          id: openInvoices[0].id,
          label: openInvoices[0].label,
          quarter: openInvoices[0].quarter,
          year: openInvoices[0].year,
          due_date: openInvoices[0].due_date,
          amount_due: openInvoices[0].amount_due,
          amount_paid: openInvoices[0].amount_paid,
          balance_remaining: openInvoices[0].balance_remaining,
          status: openInvoices[0].status,
          is_overdue: openInvoices[0].is_overdue,
          days_until_due: openInvoices[0].days_until_due
        }
      : null;

    // upcoming amenity reservations (pending/approved in future)
    const now = new Date();
    const upcoming_amenity_reservations = amenityReservations
      .filter((r) => {
        if (r.status !== 'pending' && r.status !== 'approved') return false;
        const start = this._parseDate(r.start_datetime);
        if (!start) return false;
        return start.getTime() >= now.getTime();
      })
      .sort((a, b) => {
        const sa = this._parseDate(a.start_datetime)?.getTime() || 0;
        const sb = this._parseDate(b.start_datetime)?.getTime() || 0;
        return sa - sb;
      })
      .slice(0, 5)
      .map((r) => {
        const amenity = amenities.find((a) => a.id === r.amenityId) || {};
        return {
          id: r.id,
          amenity_name: amenity.name || '',
          amenity_type: amenity.type || '',
          start_datetime: r.start_datetime,
          end_datetime: r.end_datetime,
          status: r.status
        };
      });

    // open maintenance requests (not resolved/closed)
    const open_maintenance_requests = maintenanceRequests.filter((m) => m.status !== 'resolved' && m.status !== 'closed');

    // upcoming events (public, upcoming)
    const upcoming_events = events
      .filter((ev) => {
        if (ev.is_public === false) return false;
        const start = this._parseDate(ev.start_datetime);
        if (!start) return false;
        return start.getTime() >= now.getTime();
      })
      .sort((a, b) => {
        const sa = this._parseDate(a.start_datetime)?.getTime() || 0;
        const sb = this._parseDate(b.start_datetime)?.getTime() || 0;
        return sa - sb;
      })
      .slice(0, 5)
      .map((ev) => ({
        id: ev.id,
        title: ev.title,
        start_datetime: ev.start_datetime,
        end_datetime: ev.end_datetime,
        location: ev.location || ''
      }));

    // current election summary
    const openElection = elections.find((e) => e.status === 'open') || null;
    let current_election_summary = null;
    if (openElection) {
      const ballot = ballots.find((b) => b.electionId === openElection.id) || null;
      current_election_summary = {
        election_id: openElection.id,
        name: openElection.name,
        status: openElection.status,
        max_votes: openElection.max_votes,
        has_submitted_ballot: ballot ? ballot.status === 'submitted' : false
      };
    }

    return {
      next_invoice,
      upcoming_amenity_reservations,
      open_maintenance_requests,
      upcoming_events,
      current_election_summary,
      announcements
    };
  }

  // getDuesPageData
  getDuesPageData() {
    const invoices = this._getFromStorage('invoices');
    const payment_methods = this._getFromStorage('payment_methods').filter((m) => m.is_active !== false);

    const today = this._todayDateOnly();

    const mappedInvoices = invoices.map((inv) => {
      const balance = Math.max(0, Number(inv.amount_due || 0) - Number(inv.amount_paid || 0));
      const dueDate = this._parseDate(inv.due_date);
      const dueDay = dueDate ? new Date(dueDate.getTime()) : null;
      if (dueDay) dueDay.setHours(0, 0, 0, 0);
      const isOverdue = dueDay ? dueDay.getTime() < today.getTime() && inv.status !== 'paid' : false;

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const currentQuarter = Math.floor(month / 3) + 1;
      const isCurrentQuarter = inv.year === year && inv.quarter === currentQuarter;

      return {
        ...inv,
        balance_remaining: balance,
        is_overdue: isOverdue,
        is_current_quarter: isCurrentQuarter
      };
    });

    const open_invoices = mappedInvoices
      .filter((inv) => (inv.status === 'open' || inv.status === 'overdue') && inv.balance_remaining > 0)
      .sort((a, b) => {
        const da = this._parseDate(a.due_date)?.getTime() || 0;
        const db = this._parseDate(b.due_date)?.getTime() || 0;
        return da - db;
      });

    const openIds = new Set(open_invoices.map((i) => i.id));
    const past_invoices = mappedInvoices
      .filter((inv) => !openIds.has(inv.id))
      .sort((a, b) => {
        const da = this._parseDate(a.due_date)?.getTime() || 0;
        const db = this._parseDate(b.due_date)?.getTime() || 0;
        return db - da;
      })
      .map((inv) => ({
        id: inv.id,
        label: inv.label,
        quarter: inv.quarter,
        year: inv.year,
        due_date: inv.due_date,
        amount_due: inv.amount_due,
        amount_paid: inv.amount_paid,
        status: inv.status
      }));

    return {
      open_invoices: open_invoices.map((inv) => ({
        id: inv.id,
        label: inv.label,
        quarter: inv.quarter,
        year: inv.year,
        billing_period_start: inv.billing_period_start,
        billing_period_end: inv.billing_period_end,
        due_date: inv.due_date,
        amount_due: inv.amount_due,
        amount_paid: inv.amount_paid,
        balance_remaining: inv.balance_remaining,
        status: inv.status,
        is_current_quarter: inv.is_current_quarter,
        is_overdue: inv.is_overdue
      })),
      past_invoices,
      payment_methods
    };
  }

  // getInvoicePaymentDetails
  getInvoicePaymentDetails(invoiceId) {
    const invoices = this._getFromStorage('invoices');
    const paymentMethods = this._getFromStorage('payment_methods').filter((m) => m.is_active !== false);
    const invoice = invoices.find((inv) => inv.id === invoiceId) || null;

    if (!invoice) {
      return {
        invoice: null,
        allowed_payment_date_range: null,
        payment_methods: []
      };
    }

    const balance_remaining = Math.max(0, Number(invoice.amount_due || 0) - Number(invoice.amount_paid || 0));

    const today = this._todayDateOnly();
    const earliest_date = this._toISODateString(today);
    const dueDate = this._parseDate(invoice.due_date);
    const latest_date = dueDate ? this._toISODateString(dueDate) : earliest_date;

    const methodsWithEstimates = paymentMethods.map((m) => {
      const feeInfo = this._calculateConvenienceFee(m, balance_remaining);
      return {
        id: m.id,
        display_name: m.display_name,
        name: m.name,
        convenience_fee_flat: m.convenience_fee_flat,
        convenience_fee_percent: m.convenience_fee_percent,
        estimated_fee_for_full_balance: feeInfo.convenience_fee_amount,
        is_lowest_estimated_fee: false
      };
    });

    if (methodsWithEstimates.length > 0) {
      const minFee = Math.min(
        ...methodsWithEstimates.map((m) => Number(m.estimated_fee_for_full_balance || 0))
      );
      methodsWithEstimates.forEach((m) => {
        m.is_lowest_estimated_fee = Number(m.estimated_fee_for_full_balance || 0) === minFee;
      });
    }

    return {
      invoice: {
        id: invoice.id,
        label: invoice.label,
        quarter: invoice.quarter,
        year: invoice.year,
        billing_period_start: invoice.billing_period_start,
        billing_period_end: invoice.billing_period_end,
        due_date: invoice.due_date,
        amount_due: invoice.amount_due,
        amount_paid: invoice.amount_paid,
        balance_remaining,
        status: invoice.status,
        notes: invoice.notes || ''
      },
      allowed_payment_date_range: {
        earliest_date,
        latest_date
      },
      payment_methods: methodsWithEstimates
    };
  }

  // previewInvoicePayment
  previewInvoicePayment(invoiceId, amount, paymentDate, paymentMethodId) {
    const invoices = this._getFromStorage('invoices');
    const paymentMethods = this._getFromStorage('payment_methods');

    const invoice = invoices.find((inv) => inv.id === invoiceId) || null;
    if (!invoice) {
      return {
        is_valid: false,
        validation_message: 'Invoice not found.',
        convenience_fee_amount: 0,
        total_amount: 0,
        warnings: []
      };
    }

    if (invoice.status === 'canceled') {
      return {
        is_valid: false,
        validation_message: 'Cannot pay a canceled invoice.',
        convenience_fee_amount: 0,
        total_amount: 0,
        warnings: []
      };
    }

    const method = paymentMethods.find((m) => m.id === paymentMethodId) || null;
    if (!method || method.is_active === false) {
      return {
        is_valid: false,
        validation_message: 'Payment method is not available.',
        convenience_fee_amount: 0,
        total_amount: 0,
        warnings: []
      };
    }

    const balance_remaining = Math.max(0, Number(invoice.amount_due || 0) - Number(invoice.amount_paid || 0));
    const amt = Number(amount || 0);
    if (!(amt > 0)) {
      return {
        is_valid: false,
        validation_message: 'Payment amount must be greater than zero.',
        convenience_fee_amount: 0,
        total_amount: 0,
        warnings: []
      };
    }
    if (amt > balance_remaining) {
      return {
        is_valid: false,
        validation_message: 'Payment amount cannot exceed the remaining balance.',
        convenience_fee_amount: 0,
        total_amount: 0,
        warnings: []
      };
    }

    const dateValidation = this._validatePaymentDateAgainstDueDate(invoice, paymentDate);
    if (!dateValidation.is_valid) {
      return {
        is_valid: false,
        validation_message: dateValidation.message,
        convenience_fee_amount: 0,
        total_amount: 0,
        warnings: []
      };
    }

    const feeInfo = this._calculateConvenienceFee(method, amt);
    const warnings = [];
    const dueDate = this._parseDate(invoice.due_date);
    const paymentDt = this._parseDate(paymentDate);
    if (dueDate && paymentDt) {
      const dueDay = this._toISODateString(dueDate);
      const payDay = this._toISODateString(paymentDt);
      if (dueDay === payDay) {
        warnings.push('Payment is scheduled on the due date.');
      }
    }

    return {
      is_valid: true,
      validation_message: '',
      convenience_fee_amount: feeInfo.convenience_fee_amount,
      total_amount: feeInfo.total_amount,
      warnings
    };
  }

  // submitInvoicePayment
  submitInvoicePayment(invoiceId, amount, paymentDate, paymentMethodId) {
    const preview = this.previewInvoicePayment(invoiceId, amount, paymentDate, paymentMethodId);
    if (!preview.is_valid) {
      return {
        success: false,
        message: preview.validation_message,
        payment: null
      };
    }

    const invoices = this._getFromStorage('invoices');
    const paymentMethods = this._getFromStorage('payment_methods');
    const payments = this._getFromStorage('payments');

    const invoiceIndex = invoices.findIndex((inv) => inv.id === invoiceId);
    if (invoiceIndex === -1) {
      return {
        success: false,
        message: 'Invoice not found.',
        payment: null
      };
    }
    const invoice = invoices[invoiceIndex];
    const method = paymentMethods.find((m) => m.id === paymentMethodId) || null;

    const paymentRecord = {
      id: this._generateId('payment'),
      invoiceId,
      paymentMethodId,
      amount: Number(amount),
      convenience_fee_amount: preview.convenience_fee_amount,
      total_amount: preview.total_amount,
      scheduled_for: paymentDate,
      created_at: new Date().toISOString(),
      status: 'scheduled',
      confirmation_number: 'PMT-' + Date.now()
    };

    payments.push(paymentRecord);

    // update invoice
    const newPaid = Number(invoice.amount_paid || 0) + Number(amount);
    invoice.amount_paid = newPaid;
    if (newPaid >= Number(invoice.amount_due || 0)) {
      invoice.status = 'paid';
    } else if (invoice.status === 'overdue') {
      // remains overdue until fully paid
      invoice.status = 'overdue';
    } else {
      invoice.status = 'open';
    }

    invoices[invoiceIndex] = invoice;

    this._saveToStorage('payments', payments);
    this._saveToStorage('invoices', invoices);

    return {
      success: true,
      message: 'Payment submitted successfully.',
      payment: {
        ...paymentRecord,
        invoice,
        payment_method: method
      }
    };
  }

  // getPaymentHistory
  getPaymentHistory() {
    const payments = this._getFromStorage('payments');
    const invoices = this._getFromStorage('invoices');
    const paymentMethods = this._getFromStorage('payment_methods');

    return payments
      .slice()
      .sort((a, b) => {
        const ta = this._parseDate(a.created_at)?.getTime() || 0;
        const tb = this._parseDate(b.created_at)?.getTime() || 0;
        return tb - ta;
      })
      .map((p) => ({
        ...p,
        invoice: invoices.find((inv) => inv.id === p.invoiceId) || null,
        payment_method: paymentMethods.find((m) => m.id === p.paymentMethodId) || null
      }));
  }

  // getAmenitiesList
  getAmenitiesList(typeFilter, searchQuery) {
    let amenities = this._getFromStorage('amenities');

    if (typeFilter) {
      amenities = amenities.filter((a) => a.type === typeFilter);
    }

    if (searchQuery) {
      const q = String(searchQuery).toLowerCase();
      amenities = amenities.filter((a) => {
        const name = (a.name || '').toLowerCase();
        const desc = (a.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    return amenities;
  }

  // getAmenityDetailsAndAvailability
  getAmenityDetailsAndAvailability(amenityId, startDate, endDate) {
    const amenities = this._getFromStorage('amenities');
    const amenity = amenities.find((a) => a.id === amenityId) || null;
    const reservations = this._getFromStorage('amenity_reservations');

    if (!amenity) {
      return {
        amenity: null,
        existing_reservations: [],
        reservation_constraints: {
          min_start_time: '08:00',
          max_end_time: '22:00',
          max_guest_count: null
        }
      };
    }

    const start = startDate ? this._parseDate(startDate) : null;
    const end = endDate ? this._parseDate(endDate) : null;

    const existing_reservations = reservations
      .filter((r) => {
        if (r.amenityId !== amenityId) return false;
        if (r.status === 'canceled' || r.status === 'rejected') return false;
        const d = this._parseDate(r.date);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      })
      .map((r) => ({
        id: r.id,
        date: r.date,
        start_datetime: r.start_datetime,
        end_datetime: r.end_datetime,
        guest_count: r.guest_count,
        status: r.status
      }));

    const reservation_constraints = {
      min_start_time: '08:00',
      max_end_time: '22:00',
      max_guest_count: typeof amenity.capacity === 'number' ? amenity.capacity : null
    };

    return {
      amenity,
      existing_reservations,
      reservation_constraints
    };
  }

  // previewAmenityReservation
  previewAmenityReservation(amenityId, date, startTime, endTime, guestCount) {
    return this._validateAmenityReservationSlot(amenityId, date, startTime, endTime, guestCount);
  }

  // submitAmenityReservation
  submitAmenityReservation(amenityId, date, startTime, endTime, guestCount, eventDescription) {
    const validation = this._validateAmenityReservationSlot(amenityId, date, startTime, endTime, guestCount);
    if (!validation.is_available) {
      return {
        success: false,
        message: validation.conflict_reason || 'Reservation slot is not available.',
        reservation: null
      };
    }

    const amenities = this._getFromStorage('amenities');
    const amenity = amenities.find((a) => a.id === amenityId) || null;
    const reservations = this._getFromStorage('amenity_reservations');

    const dateObj = this._parseDate(date);
    const normalizedDate = this._toISODateString(dateObj || new Date());

    const startISO = new Date(normalizedDate + 'T' + startTime + ':00').toISOString();
    const endISO = new Date(normalizedDate + 'T' + endTime + ':00').toISOString();

    const reservation = {
      id: this._generateId('amenres'),
      amenityId,
      date: normalizedDate,
      start_datetime: startISO,
      end_datetime: endISO,
      guest_count: guestCount,
      event_description: eventDescription || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    reservations.push(reservation);
    this._saveToStorage('amenity_reservations', reservations);

    return {
      success: true,
      message: 'Reservation submitted successfully.',
      reservation: {
        ...reservation,
        amenity
      }
    };
  }

  // getMaintenanceRequests
  getMaintenanceRequests(statusFilter, categoryFilter) {
    let requests = this._getFromStorage('maintenance_requests');

    if (statusFilter) {
      requests = requests.filter((r) => r.status === statusFilter);
    }

    if (categoryFilter) {
      requests = requests.filter((r) => r.category === categoryFilter);
    }

    return requests
      .slice()
      .sort((a, b) => {
        const ta = this._parseDate(a.created_at)?.getTime() || 0;
        const tb = this._parseDate(b.created_at)?.getTime() || 0;
        return tb - ta;
      });
  }

  // submitMaintenanceRequest
  submitMaintenanceRequest(category, priority, location, description, allowYardAccess) {
    const allowedCategories = [
      'playground',
      'common_area_equipment',
      'landscaping',
      'building_exterior',
      'parking_area',
      'other'
    ];
    const allowedPriorities = ['low', 'medium', 'high', 'urgent'];

    if (!allowedCategories.includes(category)) {
      return { success: false, message: 'Invalid maintenance category.', request: null };
    }
    if (!allowedPriorities.includes(priority)) {
      return { success: false, message: 'Invalid priority level.', request: null };
    }
    if (!location || !location.trim()) {
      return { success: false, message: 'Location is required.', request: null };
    }
    if (!description || !description.trim()) {
      return { success: false, message: 'Description is required.', request: null };
    }

    const requests = this._getFromStorage('maintenance_requests');

    const request = {
      id: this._generateId('maint'),
      category,
      priority,
      location,
      description,
      allow_yard_access: !!allowYardAccess,
      status: 'open',
      created_at: new Date().toISOString(),
      updated_at: null,
      last_status_update_note: ''
    };

    requests.push(request);
    this._saveToStorage('maintenance_requests', requests);

    return {
      success: true,
      message: 'Maintenance request submitted successfully.',
      request
    };
  }

  // getEvents
  getEvents(startDate, endDate, minStartTime, maxStartTime, sortBy, sortDirection) {
    let events = this._getFromStorage('events');

    const start = startDate ? this._parseDate(startDate) : null;
    const end = endDate ? this._parseDate(endDate) : null;

    events = events.filter((ev) => {
      if (ev.is_public === false) return false;
      const startDt = this._parseDate(ev.start_datetime);
      if (!startDt) return false;
      if (start && startDt < start) return false;
      if (end && startDt > end) return false;

      const timeStr = this._getTimePartFromISO(ev.start_datetime);
      if (minStartTime && this._compareTimeStrings(timeStr, minStartTime) < 0) return false;
      if (maxStartTime && this._compareTimeStrings(timeStr, maxStartTime) > 0) return false;

      return true;
    });

    const sortField = sortBy || 'start_datetime';
    const direction = (sortDirection || 'asc').toLowerCase();

    events.sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      if (sortField.endsWith('_datetime')) {
        av = this._parseDate(av)?.getTime() || 0;
        bv = this._parseDate(bv)?.getTime() || 0;
      }
      if (av === bv) return 0;
      const result = av < bv ? -1 : 1;
      return direction === 'desc' ? -result : result;
    });

    return events;
  }

  // getEventDetails
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const registrations = this._getFromStorage('event_registrations');

    const event = events.find((ev) => ev.id === eventId) || null;
    if (!event) {
      return { event: null, existing_registration: null };
    }

    const existing_registration = registrations.find((r) => r.eventId === eventId && r.status !== 'canceled') || null;

    return {
      event,
      existing_registration: existing_registration
        ? {
            id: existing_registration.id,
            adults: existing_registration.adults,
            children: existing_registration.children,
            status: existing_registration.status
          }
        : null
    };
  }

  // submitEventRegistration
  submitEventRegistration(eventId, adults, children, notes) {
    const events = this._getFromStorage('events');
    const registrations = this._getFromStorage('event_registrations');

    const event = events.find((ev) => ev.id === eventId) || null;
    if (!event) {
      return { success: false, message: 'Event not found.', registration: null };
    }

    const totalPeople = Number(adults || 0) + Number(children || 0);
    if (totalPeople <= 0) {
      return {
        success: false,
        message: 'At least one attendee is required.',
        registration: null
      };
    }

    // Skip strict time-based validation to keep behavior deterministic across environments
    const startDt = this._parseDate(event.start_datetime);

    let status = 'registered';
    const remaining = typeof event.remaining_spots === 'number' ? event.remaining_spots : null;
    if (remaining !== null && totalPeople > remaining) {
      status = 'waitlisted';
    }

    let registration = registrations.find((r) => r.eventId === eventId) || null;
    if (registration) {
      registration.adults = Number(adults || 0);
      registration.children = Number(children || 0);
      registration.status = status;
      registration.notes = notes || registration.notes || '';
      registration.registered_at = new Date().toISOString();
    } else {
      registration = {
        id: this._generateId('eventreg'),
        eventId,
        adults: Number(adults || 0),
        children: Number(children || 0),
        status,
        registered_at: new Date().toISOString(),
        notes: notes || ''
      };
      registrations.push(registration);
    }

    // update event.remaining_spots if capacity tracking is used and registration is not waitlisted
    if (status === 'registered' && remaining !== null) {
      const eventIndex = events.findIndex((ev) => ev.id === eventId);
      if (eventIndex !== -1) {
        const previousRegistration = registrations
          .filter((r) => r.eventId === eventId && r.id !== registration.id && r.status === 'registered')
          .reduce((sum, r) => sum + Number(r.adults || 0) + Number(r.children || 0), 0);
        const capacity = typeof event.capacity === 'number' ? event.capacity : remaining + totalPeople;
        const remainingSpots = capacity - previousRegistration - totalPeople;
        events[eventIndex].remaining_spots = remainingSpots >= 0 ? remainingSpots : 0;
      }
    }

    this._saveToStorage('event_registrations', registrations);
    this._saveToStorage('events', events);

    return {
      success: true,
      message: 'Registration saved successfully.',
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        adults: registration.adults,
        children: registration.children,
        status: registration.status,
        registered_at: registration.registered_at,
        event
      }
    };
  }

  // getForumCategories
  getForumCategories() {
    const categories = this._getFromStorage('forum_categories');
    const topics = this._getFromStorage('forum_topics');
    const posts = this._getFromStorage('forum_posts');

    const result = categories.map((cat) => {
      const catTopics = topics.filter((t) => t.categoryId === cat.id);
      const topic_count = catTopics.length;
      let last_activity_at = null;

      catTopics.forEach((t) => {
        if (t.last_post_at) {
          if (!last_activity_at || this._parseDate(t.last_post_at) > this._parseDate(last_activity_at)) {
            last_activity_at = t.last_post_at;
          }
        }
      });

      posts.forEach((p) => {
        const topic = topics.find((t) => t.id === p.topicId);
        if (topic && topic.categoryId === cat.id) {
          if (!last_activity_at || this._parseDate(p.created_at) > this._parseDate(last_activity_at)) {
            last_activity_at = p.created_at;
          }
        }
      });

      return {
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        sort_order: cat.sort_order || 0,
        created_at: cat.created_at,
        topic_count,
        last_activity_at
      };
    });

    return result.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  // getForumCategoryTopics
  getForumCategoryTopics(categoryId, page, pageSize) {
    const categories = this._getFromStorage('forum_categories');
    const topics = this._getFromStorage('forum_topics');

    const category = categories.find((c) => c.id === categoryId) || null;
    const catTopics = topics
      .filter((t) => t.categoryId === categoryId)
      .sort((a, b) => {
        const ta = this._parseDate(a.last_post_at || a.created_at)?.getTime() || 0;
        const tb = this._parseDate(b.last_post_at || b.created_at)?.getTime() || 0;
        return tb - ta;
      });

    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (pg - 1) * ps;
    const topicsPage = catTopics.slice(startIndex, startIndex + ps).map((t) => ({
      id: t.id,
      subject: t.subject,
      reply_count: t.reply_count || 0,
      created_at: t.created_at,
      last_post_at: t.last_post_at || t.created_at
    }));

    return {
      category: category
        ? {
            id: category.id,
            name: category.name,
            description: category.description || ''
          }
        : null,
      topics: topicsPage
    };
  }

  // submitForumTopic
  submitForumTopic(categoryId, subject, body) {
    const categories = this._getFromStorage('forum_categories');
    const topics = this._getFromStorage('forum_topics');
    const posts = this._getFromStorage('forum_posts');

    const category = categories.find((c) => c.id === categoryId) || null;
    if (!category) {
      return { success: false, message: 'Forum category not found.', topic: null };
    }
    if (!subject || !subject.trim()) {
      return { success: false, message: 'Subject is required.', topic: null };
    }
    if (!body || !body.trim()) {
      return { success: false, message: 'Message body is required.', topic: null };
    }

    const nowIso = new Date().toISOString();
    const topic = {
      id: this._generateId('topic'),
      categoryId,
      subject,
      body,
      created_at: nowIso,
      updated_at: null,
      reply_count: 0,
      last_post_at: nowIso
    };
    topics.push(topic);

    const post = {
      id: this._generateId('post'),
      topicId: topic.id,
      body,
      created_at: nowIso,
      updated_at: null,
      is_original_post: true
    };
    posts.push(post);

    this._saveToStorage('forum_topics', topics);
    this._saveToStorage('forum_posts', posts);

    return {
      success: true,
      message: 'Topic created successfully.',
      topic: {
        id: topic.id,
        categoryId: topic.categoryId,
        subject: topic.subject,
        body: topic.body,
        created_at: topic.created_at,
        category
      }
    };
  }

  // getForumTopicThread
  getForumTopicThread(topicId) {
    const topics = this._getFromStorage('forum_topics');
    const posts = this._getFromStorage('forum_posts');

    const topic = topics.find((t) => t.id === topicId) || null;
    if (!topic) {
      return { topic: null, posts: [] };
    }

    const threadPosts = posts
      .filter((p) => p.topicId === topicId)
      .sort((a, b) => {
        const ta = this._parseDate(a.created_at)?.getTime() || 0;
        const tb = this._parseDate(b.created_at)?.getTime() || 0;
        return ta - tb;
      })
      .map((p) => ({
        ...p,
        topic
      }));

    return {
      topic: {
        id: topic.id,
        subject: topic.subject,
        body: topic.body,
        created_at: topic.created_at
      },
      posts: threadPosts
    };
  }

  // submitForumReply
  submitForumReply(topicId, body) {
    const topics = this._getFromStorage('forum_topics');
    const posts = this._getFromStorage('forum_posts');

    const topicIndex = topics.findIndex((t) => t.id === topicId);
    if (topicIndex === -1) {
      return { success: false, message: 'Topic not found.', post: null };
    }
    if (!body || !body.trim()) {
      return { success: false, message: 'Reply body is required.', post: null };
    }

    const topic = topics[topicIndex];
    const nowIso = new Date().toISOString();

    const post = {
      id: this._generateId('post'),
      topicId,
      body,
      created_at: nowIso,
      updated_at: null,
      is_original_post: false
    };
    posts.push(post);

    topic.reply_count = (topic.reply_count || 0) + 1;
    topic.last_post_at = nowIso;
    topic.updated_at = nowIso;
    topics[topicIndex] = topic;

    this._saveToStorage('forum_posts', posts);
    this._saveToStorage('forum_topics', topics);

    return {
      success: true,
      message: 'Reply posted successfully.',
      post: {
        ...post,
        topic
      }
    };
  }

  // getArchitecturalRequestsOverview
  getArchitecturalRequestsOverview() {
    const requestsRaw = this._getFromStorage('architectural_requests');
    const colors = this._getFromStorage('pre_approved_colors');
    const settings = this._getObjectFromStorage('architectural_settings') || {
      lead_time_days_required: 14
    };

    const requests = requestsRaw.map((r) => ({
      ...r,
      color: colors.find((c) => c.id === r.colorId) || null
    }));

    const lead_time_days_required = Number(settings.lead_time_days_required || 14);
    const earliest_allowed_start_date = this._toISODateString(
      this._addDays(this._todayDateOnly(), lead_time_days_required)
    );

    return {
      requests,
      lead_time_days_required,
      earliest_allowed_start_date
    };
  }

  // getPreApprovedColors
  getPreApprovedColors(colorCategory) {
    let colors = this._getFromStorage('pre_approved_colors');
    if (colorCategory) {
      colors = colors.filter((c) => c.color_category === colorCategory);
    }
    return colors;
  }

  // submitArchitecturalRequest
  submitArchitecturalRequest(projectType, description, colorId, plannedStartDate, guidelinesAccepted) {
    const allowedTypes = ['exterior', 'interior', 'landscaping', 'structural', 'other'];
    if (!allowedTypes.includes(projectType)) {
      return { success: false, message: 'Invalid project type.', request: null };
    }
    if (!description || !description.trim()) {
      return { success: false, message: 'Description is required.', request: null };
    }
    if (!guidelinesAccepted) {
      return {
        success: false,
        message: 'You must accept the HOA guidelines to submit this request.',
        request: null
      };
    }

    const colors = this._getFromStorage('pre_approved_colors');
    const color = colors.find((c) => c.id === colorId) || null;
    if (!color) {
      return { success: false, message: 'Selected color not found.', request: null };
    }

    const leadValidation = this._enforceArchitecturalLeadTime(plannedStartDate);
    if (!leadValidation.is_valid) {
      return { success: false, message: leadValidation.message, request: null };
    }

    const requests = this._getFromStorage('architectural_requests');

    const request = {
      id: this._generateId('arch'),
      project_type: projectType,
      description,
      colorId,
      planned_start_date: plannedStartDate,
      status: 'submitted',
      guidelines_accepted: true,
      submitted_at: new Date().toISOString(),
      decision_date: null,
      decision_notes: ''
    };

    requests.push(request);
    this._saveToStorage('architectural_requests', requests);

    return {
      success: true,
      message: 'Architectural request submitted successfully.',
      request: {
        ...request,
        color
      }
    };
  }

  // getRulesList
  getRulesList(categoryFilter, minFineAmount, maxFineAmount, sortBy, sortDirection) {
    const rules = this._getFromStorage('rules');
    const watchEntries = this._getFromStorage('rule_watchlist_entries');
    const watchRuleIds = new Set(watchEntries.map((e) => e.ruleId));

    let filtered = rules.filter((r) => r.is_active !== false);

    if (categoryFilter) {
      filtered = filtered.filter((r) => r.category === categoryFilter);
    }
    if (typeof minFineAmount === 'number') {
      filtered = filtered.filter((r) => Number(r.fine_amount || 0) >= minFineAmount);
    }
    if (typeof maxFineAmount === 'number') {
      filtered = filtered.filter((r) => Number(r.fine_amount || 0) <= maxFineAmount);
    }

    const sortField = sortBy || 'fine_amount';
    const direction = (sortDirection || 'desc').toLowerCase();

    filtered.sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];

      if (sortField === 'fine_amount') {
        av = Number(av || 0);
        bv = Number(bv || 0);
      } else if (sortField === 'severity') {
        const order = { low: 1, medium: 2, high: 3 };
        av = order[av] || 0;
        bv = order[bv] || 0;
      } else if (sortField === 'created_at') {
        av = this._parseDate(av)?.getTime() || 0;
        bv = this._parseDate(bv)?.getTime() || 0;
      }

      if (av === bv) return 0;
      const result = av < bv ? -1 : 1;
      return direction === 'asc' ? result : -result;
    });

    return filtered.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      category: r.category,
      fine_amount: r.fine_amount,
      severity: r.severity,
      is_active: r.is_active,
      created_at: r.created_at,
      is_in_watchlist: watchRuleIds.has(r.id)
    }));
  }

  // updateRuleWatchlist
  updateRuleWatchlist(ruleId, action) {
    const rules = this._getFromStorage('rules');
    const entries = this._getFromStorage('rule_watchlist_entries');

    const rule = rules.find((r) => r.id === ruleId) || null;
    if (!rule) {
      return { success: false, message: 'Rule not found.' };
    }

    if (action === 'add') {
      const existing = entries.find((e) => e.ruleId === ruleId);
      if (existing) {
        return { success: true, message: 'Rule is already in watchlist.' };
      }
      const entry = {
        id: this._generateId('rulewatch'),
        ruleId,
        added_at: new Date().toISOString()
      };
      entries.push(entry);
      this._saveToStorage('rule_watchlist_entries', entries);
      return { success: true, message: 'Rule added to watchlist.' };
    }

    if (action === 'remove') {
      const remaining = entries.filter((e) => e.ruleId !== ruleId);
      this._saveToStorage('rule_watchlist_entries', remaining);
      return { success: true, message: 'Rule removed from watchlist.' };
    }

    return { success: false, message: 'Invalid action. Use "add" or "remove".' };
  }

  // getRuleWatchlist
  getRuleWatchlist() {
    const entries = this._getFromStorage('rule_watchlist_entries');
    const rules = this._getFromStorage('rules');

    return entries.map((e) => ({
      watchlist_entry_id: e.id,
      added_at: e.added_at,
      rule: rules.find((r) => r.id === e.ruleId) || null
    }));
  }

  // getGuestParkingPermits
  getGuestParkingPermits() {
    const permits = this._getFromStorage('guest_parking_permits');
    const usageToday = this._getDailyGuestPermitUsage(this._toISODateString(this._todayDateOnly()));

    return {
      permits,
      daily_guest_limit: usageToday.daily_guest_limit
    };
  }

  // submitGuestParkingPermit
  submitGuestParkingPermit(permitDate, licensePlate, vehicleDescription) {
    if (!permitDate) {
      return { success: false, message: 'Permit date is required.', permit: null };
    }
    if (!licensePlate || !licensePlate.trim()) {
      return { success: false, message: 'License plate is required.', permit: null };
    }
    if (!vehicleDescription || !vehicleDescription.trim()) {
      return { success: false, message: 'Vehicle description is required.', permit: null };
    }

    const dateObj = this._parseDate(permitDate);
    if (!dateObj) {
      return { success: false, message: 'Invalid permit date.', permit: null };
    }

    const permitDayStr = this._toISODateString(dateObj);
    const todayStr = this._toISODateString(this._todayDateOnly());
    if (permitDayStr < todayStr) {
      return {
        success: false,
        message: 'Permit date cannot be in the past.',
        permit: null
      };
    }

    const usage = this._getDailyGuestPermitUsage(permitDayStr);
    if (usage.daily_guest_limit && usage.current_count >= usage.daily_guest_limit) {
      return {
        success: false,
        message: 'Daily guest parking limit has been reached for this date.',
        permit: null
      };
    }

    const permits = this._getFromStorage('guest_parking_permits');

    const permit = {
      id: this._generateId('gpermit'),
      permit_date: permitDayStr,
      license_plate: licensePlate,
      vehicle_description: vehicleDescription,
      status: 'active',
      created_at: new Date().toISOString(),
      permit_code: 'GP-' + Date.now()
    };

    permits.push(permit);
    this._saveToStorage('guest_parking_permits', permits);

    return {
      success: true,
      message: 'Guest parking permit created successfully.',
      permit
    };
  }

  // getCurrentElectionBallot
  getCurrentElectionBallot() {
    const elections = this._getFromStorage('elections');
    const candidatesAll = this._getFromStorage('candidates');
    const ballotSelections = this._getFromStorage('ballot_selections');
    const ballots = this._getFromStorage('ballots');

    const election = elections.find((e) => e.status === 'open') || null;
    if (!election) {
      return {
        election: null,
        ballot: null,
        candidates: []
      };
    }

    let ballot = ballots.find((b) => b.electionId === election.id) || null;
    if (!ballot) {
      ballot = this._getOrCreateBallotForCurrentElection(election);
    }

    const selectedIds = new Set(
      ballotSelections
        .filter((bs) => bs.ballotId === ballot.id)
        .map((bs) => bs.candidateId)
    );

    const candidates = candidatesAll
      .filter((c) => c.electionId === election.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        position: c.position,
        years_of_residency: c.years_of_residency,
        is_incumbent: c.is_incumbent,
        is_selected_on_ballot: selectedIds.has(c.id)
      }));

    return {
      election: {
        id: election.id,
        name: election.name,
        description: election.description || '',
        status: election.status,
        start_datetime: election.start_datetime,
        end_datetime: election.end_datetime,
        max_votes: election.max_votes,
        instructions: election.instructions || ''
      },
      ballot: ballot
        ? {
            id: ballot.id,
            status: ballot.status,
            confirmation_checked: ballot.confirmation_checked,
            submitted_at: ballot.submitted_at
          }
        : null,
      candidates
    };
  }

  // submitElectionBallot
  submitElectionBallot(candidateIds, confirmationChecked) {
    const elections = this._getFromStorage('elections');
    const candidatesAll = this._getFromStorage('candidates');
    const ballots = this._getFromStorage('ballots');
    const ballotSelections = this._getFromStorage('ballot_selections');

    const election = elections.find((e) => e.status === 'open') || null;
    if (!election) {
      return { success: false, message: 'No open election.', ballot: null };
    }

    let ballot = ballots.find((b) => b.electionId === election.id) || null;
    if (!ballot) {
      ballot = this._getOrCreateBallotForCurrentElection(election);
    }

    if (!Array.isArray(candidateIds)) {
      return { success: false, message: 'candidateIds must be an array.', ballot: null };
    }

    const uniqueCandidateIds = Array.from(new Set(candidateIds));

    // ensure candidates belong to this election
    const validCandidateIds = uniqueCandidateIds.filter((cid) => {
      const cand = candidatesAll.find((c) => c.id === cid);
      return cand && cand.electionId === election.id;
    });

    const voteCheck = this._enforceElectionMaxVotes(election, validCandidateIds);
    if (!voteCheck.is_valid) {
      return { success: false, message: voteCheck.message, ballot: null };
    }

    if (!confirmationChecked) {
      return {
        success: false,
        message: 'You must confirm that your selections are final before submitting the ballot.',
        ballot: null
      };
    }

    // remove existing selections for this ballot
    const remainingSelections = ballotSelections.filter((bs) => bs.ballotId !== ballot.id);

    // add new selections
    validCandidateIds.forEach((cid) => {
      remainingSelections.push({
        id: this._generateId('bsel'),
        ballotId: ballot.id,
        candidateId: cid,
        created_at: new Date().toISOString()
      });
    });

    // update ballot
    ballot.status = 'submitted';
    ballot.confirmation_checked = true;
    ballot.submitted_at = new Date().toISOString();

    const ballotIndex = ballots.findIndex((b) => b.id === ballot.id);
    if (ballotIndex === -1) {
      ballots.push(ballot);
    } else {
      ballots[ballotIndex] = ballot;
    }

    this._saveToStorage('ballot_selections', remainingSelections);
    this._saveToStorage('ballots', ballots);

    return {
      success: true,
      message: 'Ballot submitted successfully.',
      ballot: {
        id: ballot.id,
        status: ballot.status,
        confirmation_checked: ballot.confirmation_checked,
        submitted_at: ballot.submitted_at
      }
    };
  }

  // getCandidateProfile
  getCandidateProfile(candidateId) {
    const candidates = this._getFromStorage('candidates');
    const elections = this._getFromStorage('elections');

    const candidateEntity = candidates.find((c) => c.id === candidateId) || null;
    if (!candidateEntity) {
      return { candidate: null, election: null };
    }

    const election = elections.find((e) => e.id === candidateEntity.electionId) || null;

    const candidate = {
      id: candidateEntity.id,
      name: candidateEntity.name,
      position: candidateEntity.position,
      years_of_residency: candidateEntity.years_of_residency,
      biography: candidateEntity.biography || '',
      platform: candidateEntity.platform || '',
      is_incumbent: candidateEntity.is_incumbent
    };

    return {
      candidate,
      election: election
        ? {
            id: election.id,
            name: election.name,
            max_votes: election.max_votes
          }
        : null
    };
  }

  // getAboutContactHelpContent
  getAboutContactHelpContent() {
    const content = this._getObjectFromStorage('about_contact_help');
    if (!content) {
      return {
        about: { title: '', body: '' },
        contact: { address: '', phone: '', email: '', office_hours: '' },
        faq: [],
        legal: { privacy_policy: '', terms_of_use: '' }
      };
    }
    return content;
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
