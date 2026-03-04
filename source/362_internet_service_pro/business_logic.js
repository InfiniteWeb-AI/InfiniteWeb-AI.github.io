'use strict';

// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
  // Simple in-memory polyfill
  var store = {};
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

  _initStorage() {
    const keys = [
      'billing_accounts',
      'billing_statements',
      'payment_methods',
      'payments',
      'autopay_settings',
      'service_locations',
      'internet_plans',
      'internet_services',
      'plan_change_orders',
      'addon_products',
      'addon_subscriptions',
      'addon_change_orders',
      'equipment_products',
      'equipment_devices',
      'equipment_orders',
      'wifi_networks',
      'profiles',
      'notification_settings',
      'data_usage_cycles',
      'data_usage_alerts',
      'appointment_slots',
      'technician_appointments',
      'support_articles',
      'profile_sections'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  _toDateOnlyIso(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  _parseDate(dateStr) {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // ---------- Core helper functions from spec ----------

  _getCurrentBillingAccount() {
    const accounts = this._getFromStorage('billing_accounts');
    if (!accounts.length) return null;
    // Prefer active accounts, then earliest created
    const active = accounts.filter(a => a.status === 'active');
    const list = active.length ? active : accounts;
    list.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return da - db;
    });
    return this._clone(list[0]);
  }

  _getCurrentInternetService() {
    const services = this._getFromStorage('internet_services');
    const locations = this._getFromStorage('service_locations');
    if (!services.length) return null;

    let primaryLocation = locations.find(l => l.is_primary);
    if (!primaryLocation && locations.length) {
      primaryLocation = locations[0];
    }

    let candidates = services;
    if (primaryLocation) {
      candidates = services.filter(s => s.service_location_id === primaryLocation.id);
    }
    if (!candidates.length) candidates = services;

    const active = candidates.filter(s => s.status === 'active');
    const list = active.length ? active : candidates;

    list.sort((a, b) => {
      const da = a.activation_date ? new Date(a.activation_date).getTime() : 0;
      const db = b.activation_date ? new Date(b.activation_date).getTime() : 0;
      return da - db;
    });

    return this._clone(list[0]);
  }

  _createAndPersistPayment(billingAccount, paymentMethod, amount, paymentDateIso, isFullCurrentBalance, isAutopay) {
    const payments = this._getFromStorage('payments');
    const accounts = this._getFromStorage('billing_accounts');
    const statements = this._getFromStorage('billing_statements');

    const accountIndex = accounts.findIndex(a => a.id === billingAccount.id);
    if (accountIndex === -1) {
      return { success: false, error: 'billing_account_not_found' };
    }

    const now = this._nowIso();
    const paymentId = this._generateId('pay');
    const paymentDate = this._parseDate(paymentDateIso) ? paymentDateIso : this._toDateOnlyIso(now);

    let status = 'pending';
    const todayDateOnly = this._toDateOnlyIso(now);
    if (paymentDate && paymentDate <= todayDateOnly) {
      status = 'succeeded';
    }

    const statementId = billingAccount.current_statement_id || null;

    const payment = {
      id: paymentId,
      billing_account_id: billingAccount.id,
      statement_id: statementId,
      payment_method_id: paymentMethod.id,
      amount: amount,
      payment_date: paymentDate,
      created_at: now,
      status: status,
      is_full_current_balance: !!isFullCurrentBalance,
      is_autopay: !!isAutopay,
      confirmation_number: 'PMT-' + paymentId
    };

    payments.push(payment);

    // Update billing account balances
    const account = accounts[accountIndex];
    const totalBalance = Number(account.current_balance || 0);
    const newBalance = Math.max(0, totalBalance - amount);
    account.current_balance = newBalance;

    // Simple past due handling: reduce past_due_amount first
    const pastDue = Number(account.past_due_amount || 0);
    if (pastDue > 0) {
      const newPastDue = Math.max(0, pastDue - amount);
      account.past_due_amount = newPastDue;
    }

    account.last_payment_amount = amount;
    account.last_payment_date = now;

    accounts[accountIndex] = account;

    this._saveToStorage('payments', payments);
    this._saveToStorage('billing_accounts', accounts);

    // Resolve foreign keys for return value
    const resolvedStatement = statementId ? statements.find(s => s.id === statementId) || null : null;

    return {
      success: true,
      payment: this._clone({
        id: payment.id,
        amount: payment.amount,
        paymentDate: payment.payment_date,
        status: payment.status,
        confirmationNumber: payment.confirmation_number,
        isFullCurrentBalance: payment.is_full_current_balance
      }),
      updatedBillingAccount: this._clone(account),
      resolved: {
        billing_account: this._clone(account),
        statement: this._clone(resolvedStatement),
        payment_method: this._clone(paymentMethod)
      }
    };
  }

  _upsertAutoPaySetting(billingAccountId, payload) {
    const settings = this._getFromStorage('autopay_settings');
    const now = this._nowIso();
    let setting = settings.find(s => s.billing_account_id === billingAccountId) || null;

    if (!setting) {
      setting = {
        id: this._generateId('aps'),
        billing_account_id: billingAccountId,
        status: payload.status,
        amount_type: payload.amountType,
        fixed_amount: payload.fixedAmount != null ? payload.fixedAmount : null,
        payment_method_id: payload.paymentMethodId,
        schedule_option: payload.scheduleOption,
        schedule_offset_days: payload.scheduleOffsetDays != null ? payload.scheduleOffsetDays : null,
        created_at: now,
        updated_at: now
      };
      settings.push(setting);
    } else {
      setting.status = payload.status;
      setting.amount_type = payload.amountType;
      setting.fixed_amount = payload.amountType === 'fixed_amount' ? payload.fixedAmount : null;
      setting.payment_method_id = payload.paymentMethodId;
      setting.schedule_option = payload.scheduleOption;
      setting.schedule_offset_days = payload.scheduleOption === 'on_due_date' ? null : payload.scheduleOffsetDays;
      setting.updated_at = now;
    }

    this._saveToStorage('autopay_settings', settings);
    return this._clone(setting);
  }

  _filterAndSortPlans(plans, filters) {
    let filtered = plans.filter(p => p.is_available === true);

    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    if (typeof filters.maxPriceMonthly === 'number') {
      filtered = filtered.filter(p => Number(p.price_monthly || 0) <= filters.maxPriceMonthly);
    }

    if (typeof filters.minDownloadSpeedMbps === 'number') {
      filtered = filtered.filter(p => Number(p.download_speed_mbps || 0) >= filters.minDownloadSpeedMbps);
    }

    const sortBy = filters.sortBy || 'price_low_to_high';

    if (sortBy === 'speed_high_to_low') {
      filtered.sort((a, b) => Number(b.download_speed_mbps || 0) - Number(a.download_speed_mbps || 0));
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => Number(b.price_monthly || 0) - Number(a.price_monthly || 0));
    } else { // price_low_to_high default
      filtered.sort((a, b) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0));
    }

    return this._clone(filtered);
  }

  _filterAndSortAddonProducts(addons, filters) {
    let filtered = addons.filter(a => a.is_active === true && a.is_tv === true);

    if (filters.categoryKey) {
      filtered = filtered.filter(a => a.category_key === filters.categoryKey);
    }

    if (typeof filters.maxPriceMonthly === 'number') {
      filtered = filtered.filter(a => Number(a.price_monthly || 0) <= filters.maxPriceMonthly);
    }

    if (typeof filters.minChannelCount === 'number') {
      filtered = filtered.filter(a => Number(a.channel_count || 0) >= filters.minChannelCount);
    }

    const sortBy = filters.sortBy || 'price_low_to_high';

    if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => Number(b.price_monthly || 0) - Number(a.price_monthly || 0));
    } else if (sortBy === 'channel_count_high_to_low') {
      filtered.sort((a, b) => Number(b.channel_count || 0) - Number(a.channel_count || 0));
    } else { // price_low_to_high
      filtered.sort((a, b) => Number(a.price_monthly || 0) - Number(b.price_monthly || 0));
    }

    return this._clone(filtered);
  }

  _filterAndSortEquipmentProducts(products, filters) {
    let filtered = products.filter(p => p.is_available === true);

    if (filters.type) {
      filtered = filtered.filter(p => p.type === filters.type);
    }

    if (typeof filters.supportsWifi6 === 'boolean') {
      filtered = filtered.filter(p => !!p.supports_wifi6 === filters.supportsWifi6);
    }

    if (typeof filters.maxRentalPriceMonthly === 'number') {
      filtered = filtered.filter(p => {
        const price = p.rental_price_monthly;
        if (price == null) return false;
        return Number(price) <= filters.maxRentalPriceMonthly;
      });
    }

    const sortBy = filters.sortBy || 'price_low_to_high';

    if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => Number(b.rental_price_monthly || 0) - Number(a.rental_price_monthly || 0));
    } else if (sortBy === 'name_a_to_z') {
      filtered.sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    } else { // price_low_to_high
      filtered.sort((a, b) => Number(a.rental_price_monthly || 0) - Number(b.rental_price_monthly || 0));
    }

    return this._clone(filtered);
  }

  _persistNotificationSettings(profileId, payload) {
    const settingsArr = this._getFromStorage('notification_settings');
    const now = this._nowIso();

    let settings = settingsArr.find(s => s.profile_id === profileId) || null;

    if (!settings) {
      settings = {
        id: this._generateId('ntf'),
        profile_id: profileId,
        mobile_phone: payload.mobilePhone || null,
        outage_channels: payload.outageChannels || [],
        billing_channels: payload.billingChannels || [],
        promotions_channels: payload.promotionsChannels || [],
        data_usage_channels: payload.dataUsageChannels || [],
        appointment_channels: payload.appointmentChannels || [],
        global_frequency: payload.globalFrequency || 'standard',
        last_updated: now
      };
      settingsArr.push(settings);
    } else {
      if (payload.mobilePhone !== undefined) settings.mobile_phone = payload.mobilePhone;
      if (payload.outageChannels) settings.outage_channels = payload.outageChannels;
      if (payload.billingChannels) settings.billing_channels = payload.billingChannels;
      if (payload.promotionsChannels) settings.promotions_channels = payload.promotionsChannels;
      if (payload.dataUsageChannels) settings.data_usage_channels = payload.dataUsageChannels;
      if (payload.appointmentChannels) settings.appointment_channels = payload.appointmentChannels;
      if (payload.globalFrequency) settings.global_frequency = payload.globalFrequency;
      settings.last_updated = now;
    }

    this._saveToStorage('notification_settings', settingsArr);
    return this._clone(settings);
  }

  _calculateDataUsageSummary(internetServiceId) {
    const cycles = this._getFromStorage('data_usage_cycles').filter(c => c.internet_service_id === internetServiceId);
    if (!cycles.length) {
      return {
        currentCycle: null,
        recentCycles: []
      };
    }

    let current = cycles.find(c => c.is_current) || null;
    if (!current) {
      cycles.sort((a, b) => new Date(b.cycle_end).getTime() - new Date(a.cycle_end).getTime());
      current = cycles[0];
    }

    // Sort recent cycles by end date desc
    const recentCycles = cycles.slice().sort((a, b) => new Date(b.cycle_end).getTime() - new Date(a.cycle_end).getTime());

    return {
      currentCycle: this._clone(current),
      recentCycles: this._clone(recentCycles)
    };
  }

  _reserveAppointmentSlot(appointmentSlotId, issueType, contactPhone, notes) {
    const slots = this._getFromStorage('appointment_slots');
    const appointments = this._getFromStorage('technician_appointments');

    const slotIndex = slots.findIndex(s => s.id === appointmentSlotId);
    if (slotIndex === -1) {
      return { success: false, error: 'slot_not_found' };
    }

    const slot = slots[slotIndex];
    if (!slot.is_available) {
      return { success: false, error: 'slot_not_available' };
    }

    // Reserve slot
    slot.is_available = false;
    slots[slotIndex] = slot;

    const now = this._nowIso();
    const appointmentId = this._generateId('appt');

    const appointment = {
      id: appointmentId,
      issue_type: issueType,
      issue_description: notes || null,
      appointment_slot_id: appointmentSlotId,
      scheduled_start: slot.start_datetime,
      scheduled_end: slot.end_datetime,
      contact_phone: contactPhone,
      notes: notes || null,
      created_at: now,
      status: 'scheduled'
    };

    appointments.push(appointment);

    this._saveToStorage('appointment_slots', slots);
    this._saveToStorage('technician_appointments', appointments);

    return {
      success: true,
      appointment: this._clone(appointment),
      slot: this._clone(slot)
    };
  }

  _updateWifiNetworkConfig(networkId, updates) {
    const networks = this._getFromStorage('wifi_networks');
    const index = networks.findIndex(n => n.id === networkId);
    if (index === -1) {
      return { success: false, error: 'network_not_found' };
    }

    const network = networks[index];
    let changed = false;

    if (updates.ssid !== undefined && updates.ssid !== network.ssid) {
      network.ssid = updates.ssid;
      changed = true;
    }
    if (updates.password !== undefined && updates.password !== network.password) {
      network.password = updates.password;
      changed = true;
    }
    if (updates.bandMode !== undefined && updates.bandMode !== network.band_mode) {
      network.band_mode = updates.bandMode;
      changed = true;
    }

    if (changed) {
      network.last_updated = this._nowIso();
      networks[index] = network;
      this._saveToStorage('wifi_networks', networks);
    }

    return { success: changed, network: this._clone(network) };
  }

  _submitPlanChangeOrder(internetService, toPlan, installationOption) {
    const orders = this._getFromStorage('plan_change_orders');
    const now = this._nowIso();

    const order = {
      id: this._generateId('pco'),
      internet_service_id: internetService.id,
      from_plan_id: internetService.current_plan_id,
      to_plan_id: toPlan.id,
      created_at: now,
      effective_date: null,
      installation_option: installationOption,
      status: 'submitted',
      estimated_monthly_charge: toPlan.price_monthly || null,
      order_summary: 'Change from plan ' + internetService.current_plan_id + ' to ' + toPlan.name
    };

    orders.push(order);
    this._saveToStorage('plan_change_orders', orders);

    return this._clone(order);
  }

  _submitAddonChangeOrder(billingAccount, addonProduct, action, startTiming) {
    const orders = this._getFromStorage('addon_change_orders');
    const subs = this._getFromStorage('addon_subscriptions');
    const now = this._nowIso();

    const order = {
      id: this._generateId('ado'),
      billing_account_id: billingAccount.id,
      addon_product_id: addonProduct.id,
      action: action,
      start_timing: startTiming,
      created_at: now,
      effective_date: null,
      status: 'submitted'
    };

    // Simple effective date: now for immediate, next_due_date for next_billing_cycle if available
    if (startTiming === 'immediately') {
      order.effective_date = now;
    } else if (billingAccount.next_due_date) {
      order.effective_date = billingAccount.next_due_date;
    }

    // Update subscriptions
    const existingSubIndex = subs.findIndex(s => s.billing_account_id === billingAccount.id && s.addon_product_id === addonProduct.id && s.status !== 'cancelled');

    if (action === 'add') {
      if (existingSubIndex === -1) {
        subs.push({
          id: this._generateId('ads'),
          billing_account_id: billingAccount.id,
          addon_product_id: addonProduct.id,
          status: startTiming === 'immediately' ? 'active' : 'pending_add',
          start_date: startTiming === 'immediately' ? now : null,
          end_date: null
        });
      } else {
        const sub = subs[existingSubIndex];
        sub.status = startTiming === 'immediately' ? 'active' : 'pending_add';
        if (startTiming === 'immediately') {
          sub.start_date = now;
        }
        subs[existingSubIndex] = sub;
      }
    } else if (action === 'remove') {
      if (existingSubIndex !== -1) {
        const sub = subs[existingSubIndex];
        sub.status = startTiming === 'immediately' ? 'cancelled' : 'pending_remove';
        if (startTiming === 'immediately') {
          sub.end_date = now;
        }
        subs[existingSubIndex] = sub;
      }
    }

    orders.push(order);

    this._saveToStorage('addon_change_orders', orders);
    this._saveToStorage('addon_subscriptions', subs);

    return this._clone(order);
  }

  _submitEquipmentOrder(billingAccount, equipmentProduct, action, installationOption) {
    const orders = this._getFromStorage('equipment_orders');
    const now = this._nowIso();

    const order = {
      id: this._generateId('eqo'),
      billing_account_id: billingAccount.id,
      equipment_product_id: equipmentProduct.id,
      action: action,
      installation_option: installationOption,
      monthly_rental_price: equipmentProduct.rental_price_monthly || null,
      created_at: now,
      status: 'submitted'
    };

    orders.push(order);
    this._saveToStorage('equipment_orders', orders);

    return this._clone(order);
  }

  // ---------- Interface implementations ----------

  // getAccountDashboardSummary
  getAccountDashboardSummary() {
    const billingAccount = this._getCurrentBillingAccount();
    const internetService = this._getCurrentInternetService();

    const billingSummary = {};
    const currentPlanSummary = {};
    const dataUsageSummary = {};
    const nextAppointmentSummary = {};
    const alerts = [];
    const quickLinks = {
      canPayNow: false,
      canEnableAutoPay: false,
      canChangePlan: false,
      canManageWifi: false,
      canScheduleSupport: false
    };

    const autopaySettings = this._getFromStorage('autopay_settings');
    const dataUsageAlerts = this._getFromStorage('data_usage_alerts');
    const appointments = this._getFromStorage('technician_appointments');
    const slots = this._getFromStorage('appointment_slots');
    const plans = this._getFromStorage('internet_plans');
    const locations = this._getFromStorage('service_locations');
    const equipmentDevices = this._getFromStorage('equipment_devices');
    const equipmentProducts = this._getFromStorage('equipment_products');

    const now = new Date();

    if (billingAccount) {
      const autopay = autopaySettings.find(a => a.billing_account_id === billingAccount.id && a.status === 'enabled');

      billingSummary.currentBalance = Number(billingAccount.current_balance || 0);
      billingSummary.nextDueDate = billingAccount.next_due_date || null;
      billingSummary.pastDueAmount = Number(billingAccount.past_due_amount || 0);
      billingSummary.lastPaymentAmount = Number(billingAccount.last_payment_amount || 0);
      billingSummary.lastPaymentDate = billingAccount.last_payment_date || null;
      billingSummary.autoPayEnabled = !!autopay;
      billingSummary.autoPayStatusLabel = autopay ? 'Auto-pay On' : 'Auto-pay Off';

      if (billingAccount.current_balance > 0 && billingAccount.status === 'active') {
        quickLinks.canPayNow = true;
      }
      if (!autopay && billingAccount.status === 'active') {
        quickLinks.canEnableAutoPay = true;
      }

      if (billingAccount.past_due_amount && billingAccount.past_due_amount > 0) {
        alerts.push({
          type: 'billing',
          level: 'warning',
          message: 'Your account has a past due balance.'
        });
      }
    }

    let usagePercent = 0;
    if (internetService) {
      const plan = plans.find(p => p.id === internetService.current_plan_id) || null;
      const location = locations.find(l => l.id === internetService.service_location_id) || null;

      currentPlanSummary.planName = plan ? plan.name : null;
      currentPlanSummary.planCategoryLabel = plan ? (
        plan.category === 'internet_only' ? 'Internet Only' :
        plan.category === 'internet_tv_bundle' ? 'Internet + TV' :
        plan.category === 'internet_phone_bundle' ? 'Internet + Phone' :
        plan.category === 'internet_tv_phone_bundle' ? 'Internet + TV + Phone' :
        plan.category
      ) : null;
      currentPlanSummary.downloadSpeedMbps = plan ? Number(plan.download_speed_mbps || 0) : null;
      currentPlanSummary.uploadSpeedMbps = plan ? Number(plan.upload_speed_mbps || 0) : null;
      currentPlanSummary.priceMonthly = plan ? Number(plan.price_monthly || 0) : null;
      currentPlanSummary.dataCapGb = plan ? Number(plan.data_cap_gb || 0) : null;
      currentPlanSummary.serviceLocationLabel = location ? (location.label || (location.address_line1 || '')) : null;

      const planOrders = this._getFromStorage('plan_change_orders');
      currentPlanSummary.isPlanChangePending = !!planOrders.find(o => o.internet_service_id === internetService.id && (o.status === 'draft' || o.status === 'pending_confirmation' || o.status === 'submitted' || o.status === 'processing'));

      const usage = this._calculateDataUsageSummary(internetService.id);
      if (usage.currentCycle) {
        const used = Number(usage.currentCycle.data_used_gb || 0);
        const cap = Number(usage.currentCycle.data_cap_gb || 0) || null;
        usagePercent = cap ? Math.round((used / cap) * 10000) / 100 : 0;

        dataUsageSummary.currentCycleUsedGb = used;
        dataUsageSummary.currentCycleCapGb = cap;
        dataUsageSummary.percentUsed = usagePercent;
        dataUsageSummary.cycleStart = usage.currentCycle.cycle_start || null;
        dataUsageSummary.cycleEnd = usage.currentCycle.cycle_end || null;
      } else {
        dataUsageSummary.currentCycleUsedGb = 0;
        dataUsageSummary.currentCycleCapGb = 0;
        dataUsageSummary.percentUsed = 0;
        dataUsageSummary.cycleStart = null;
        dataUsageSummary.cycleEnd = null;
      }

      dataUsageSummary.hasUsageAlertConfigured = !!dataUsageAlerts.find(a => a.internet_service_id === internetService.id && a.status === 'active');

      if (usagePercent >= 80) {
        alerts.push({
          type: 'usage',
          level: 'warning',
          message: 'You have used over ' + usagePercent + '% of your data plan.'
        });
      }

      quickLinks.canChangePlan = true;
      quickLinks.canScheduleSupport = true;
    }

    // Next appointment summary
    const upcoming = appointments
      .filter(a => (a.status === 'scheduled' || a.status === 'pending_confirmation') && a.scheduled_start && new Date(a.scheduled_start).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime());

    if (upcoming.length) {
      const appt = upcoming[0];
      nextAppointmentSummary.hasUpcomingAppointment = true;
      nextAppointmentSummary.scheduledStart = appt.scheduled_start;
      nextAppointmentSummary.scheduledEnd = appt.scheduled_end;
      nextAppointmentSummary.issueTypeLabel = this._mapIssueTypeLabel(appt.issue_type);
      nextAppointmentSummary.statusLabel = this._mapAppointmentStatusLabel(appt.status);
    } else {
      nextAppointmentSummary.hasUpcomingAppointment = false;
      nextAppointmentSummary.scheduledStart = null;
      nextAppointmentSummary.scheduledEnd = null;
      nextAppointmentSummary.issueTypeLabel = null;
      nextAppointmentSummary.statusLabel = null;
    }

    // Equipment / Wi-Fi management availability
    if (internetService) {
      const primaryDevice = equipmentDevices.find(d => d.installed_location_id === internetService.service_location_id && d.is_primary);
      if (primaryDevice) {
        const product = primaryDevice.product_id ? equipmentProducts.find(p => p.id === primaryDevice.product_id) : null;
        const type = primaryDevice.type || (product ? product.type : null);
        const manageWifiAvailable = (type === 'router' || type === 'gateway') && primaryDevice.status !== 'inactive';
        quickLinks.canManageWifi = manageWifiAvailable;
      }
    }

    return {
      billingSummary: billingSummary,
      currentPlanSummary: currentPlanSummary,
      dataUsageSummary: dataUsageSummary,
      nextAppointmentSummary: nextAppointmentSummary,
      alerts: alerts,
      quickLinks: quickLinks
    };
  }

  _mapIssueTypeLabel(issueType) {
    if (issueType === 'slow_internet') return 'Slow Internet';
    if (issueType === 'no_connection') return 'No Connection';
    if (issueType === 'intermittent_connection') return 'Intermittent Connection';
    if (issueType === 'installation') return 'Installation';
    if (issueType === 'billing_issue') return 'Billing Issue';
    if (issueType === 'other') return 'Other';
    return issueType || '';
  }

  _mapAppointmentStatusLabel(status) {
    if (status === 'scheduled') return 'Scheduled';
    if (status === 'pending_confirmation') return 'Pending Confirmation';
    if (status === 'completed') return 'Completed';
    if (status === 'cancelled') return 'Cancelled';
    if (status === 'no_show') return 'No-show';
    return status || '';
  }

  // getBillingOverview
  getBillingOverview() {
    const billingAccount = this._getCurrentBillingAccount();
    const statements = this._getFromStorage('billing_statements');
    const payments = this._getFromStorage('payments');
    const autopaySettings = this._getFromStorage('autopay_settings');
    const paymentMethods = this._getFromStorage('payment_methods');

    let billingAccountSummary = null;
    let currentStatement = null;
    let recentStatements = [];
    let recentPayments = [];
    let autoPaySummary = {
      isEnabled: false,
      amountType: null,
      scheduleOption: null,
      scheduleOffsetDays: null,
      paymentMethodDisplayLabel: null
    };

    if (billingAccount) {
      billingAccountSummary = {
        id: billingAccount.id,
        name: billingAccount.name,
        accountNumber: billingAccount.account_number,
        currentBalance: Number(billingAccount.current_balance || 0),
        pastDueAmount: Number(billingAccount.past_due_amount || 0),
        nextDueDate: billingAccount.next_due_date || null,
        status: billingAccount.status
      };

      // Current statement
      const currentByFlag = statements.find(s => s.billing_account_id === billingAccount.id && s.is_current);
      const currentById = billingAccount.current_statement_id ? statements.find(s => s.id === billingAccount.current_statement_id) : null;
      const stmt = currentByFlag || currentById || null;
      if (stmt) {
        currentStatement = {
          statementNumber: stmt.statement_number,
          statementPeriodStart: stmt.statement_period_start,
          statementPeriodEnd: stmt.statement_period_end,
          statementDueDate: stmt.statement_due_date,
          statementBalance: Number(stmt.statement_balance || 0)
        };
      }

      // Recent statements (with FK resolution)
      recentStatements = statements
        .filter(s => s.billing_account_id === billingAccount.id)
        .sort((a, b) => new Date(b.statement_period_end).getTime() - new Date(a.statement_period_end).getTime())
        .map(s => ({
          ...s,
          billing_account: this._clone(billingAccount)
        }));

      // Recent payments (with FK resolution)
      recentPayments = payments
        .filter(p => p.billing_account_id === billingAccount.id)
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
        .map(p => {
          const stmtRef = p.statement_id ? statements.find(s => s.id === p.statement_id) || null : null;
          const methodRef = paymentMethods.find(m => m.id === p.payment_method_id) || null;
          return {
            ...p,
            billing_account: this._clone(billingAccount),
            statement: this._clone(stmtRef),
            payment_method: this._clone(methodRef)
          };
        });

      const aps = autopaySettings.find(a => a.billing_account_id === billingAccount.id) || null;
      if (aps) {
        const pm = paymentMethods.find(m => m.id === aps.payment_method_id) || null;
        const label = pm ? (pm.nickname || this._buildPaymentMethodLabel(pm)) : null;
        autoPaySummary = {
          isEnabled: aps.status === 'enabled',
          amountType: aps.amount_type,
          scheduleOption: aps.schedule_option,
          scheduleOffsetDays: aps.schedule_offset_days != null ? aps.schedule_offset_days : null,
          paymentMethodDisplayLabel: label
        };
      }
    }

    return {
      billingAccount: billingAccountSummary,
      currentStatement: currentStatement,
      recentStatements: recentStatements,
      recentPayments: recentPayments,
      autoPaySummary: autoPaySummary
    };
  }

  _buildPaymentMethodLabel(pm) {
    if (!pm) return null;
    if (pm.type === 'credit_card') {
      const brand = pm.card_brand || 'card';
      const last4 = pm.card_last4 || '????';
      return (brand.charAt(0).toUpperCase() + brand.slice(1)) + ' ending in ' + last4;
    }
    if (pm.type === 'bank_account') {
      const bank = pm.bank_name || 'Bank';
      const last4 = pm.bank_account_last4 || '????';
      return bank + ' account ending in ' + last4;
    }
    return pm.nickname || 'Payment Method';
  }

  // getMakePaymentOptions
  getMakePaymentOptions() {
    const billingAccount = this._getCurrentBillingAccount();
    const paymentMethods = this._getFromStorage('payment_methods');

    let billingAccountSummary = null;
    const amountOptions = {
      fullCurrentBalanceAmount: 0,
      minimumDueAmount: 0,
      otherAmountMin: 0,
      otherAmountMax: 0
    };

    if (billingAccount) {
      billingAccountSummary = {
        accountName: billingAccount.name,
        accountNumber: billingAccount.account_number,
        currentBalance: Number(billingAccount.current_balance || 0),
        nextDueDate: billingAccount.next_due_date || null
      };

      const currentBalance = Number(billingAccount.current_balance || 0);
      const pastDue = Number(billingAccount.past_due_amount || 0);
      amountOptions.fullCurrentBalanceAmount = currentBalance;
      amountOptions.minimumDueAmount = pastDue > 0 ? pastDue : currentBalance;
      amountOptions.otherAmountMin = currentBalance > 0 ? 1 : 0;
      amountOptions.otherAmountMax = currentBalance;
    }

    const savedPaymentMethods = paymentMethods.map(pm => ({
      id: pm.id,
      displayLabel: pm.nickname || this._buildPaymentMethodLabel(pm),
      type: pm.type,
      isDefault: !!pm.is_default,
      status: pm.status,
      cardBrand: pm.card_brand || null,
      cardLast4: pm.card_last4 || null,
      bankName: pm.bank_name || null,
      bankAccountType: pm.bank_account_type || null,
      bankAccountLast4: pm.bank_account_last4 || null,
      canAutopay: !!pm.can_autopay
    }));

    const today = this._toDateOnlyIso(this._nowIso());
    let minDate = today;
    let maxDate = today;
    if (billingAccount && billingAccount.next_due_date) {
      maxDate = this._toDateOnlyIso(billingAccount.next_due_date) || today;
    }

    const allowedPaymentDates = {
      minDate: minDate,
      maxDate: maxDate
    };

    return {
      billingAccountSummary: billingAccountSummary,
      amountOptions: amountOptions,
      savedPaymentMethods: savedPaymentMethods,
      defaultPaymentDate: today,
      allowedPaymentDates: allowedPaymentDates
    };
  }

  // submitPayment(amountType, amount, paymentMethodId, paymentDate)
  submitPayment(amountType, amount, paymentMethodId, paymentDate) {
    const billingAccount = this._getCurrentBillingAccount();
    if (!billingAccount) {
      return {
        success: false,
        payment: null,
        updatedBillingAccountSummary: null,
        message: 'No billing account found.'
      };
    }

    const paymentMethods = this._getFromStorage('payment_methods');
    const pm = paymentMethods.find(m => m.id === paymentMethodId);
    if (!pm || pm.status !== 'active') {
      return {
        success: false,
        payment: null,
        updatedBillingAccountSummary: null,
        message: 'Invalid or inactive payment method.'
      };
    }

    const validAmountTypes = ['full_current_balance', 'minimum_due', 'other_amount'];
    if (!validAmountTypes.includes(amountType)) {
      return {
        success: false,
        payment: null,
        updatedBillingAccountSummary: null,
        message: 'Invalid amount type.'
      };
    }

    const currentBalance = Number(billingAccount.current_balance || 0);
    const pastDue = Number(billingAccount.past_due_amount || 0);

    let payAmount = 0;
    let isFull = false;

    if (amountType === 'full_current_balance') {
      payAmount = currentBalance;
      isFull = true;
    } else if (amountType === 'minimum_due') {
      payAmount = pastDue > 0 ? pastDue : currentBalance;
      isFull = payAmount === currentBalance;
    } else if (amountType === 'other_amount') {
      if (typeof amount !== 'number' || amount <= 0) {
        return {
          success: false,
          payment: null,
          updatedBillingAccountSummary: null,
          message: 'Invalid payment amount.'
        };
      }
      if (amount > currentBalance) {
        return {
          success: false,
          payment: null,
          updatedBillingAccountSummary: null,
          message: 'Payment amount exceeds current balance.'
        };
      }
      payAmount = amount;
      isFull = payAmount === currentBalance;
    }

    if (currentBalance <= 0 || payAmount <= 0) {
      return {
        success: false,
        payment: null,
        updatedBillingAccountSummary: null,
        message: 'No outstanding balance to pay.'
      };
    }

    const paymentDateIso = paymentDate || this._toDateOnlyIso(this._nowIso());
    const result = this._createAndPersistPayment(billingAccount, pm, payAmount, paymentDateIso, isFull, false);

    if (!result.success) {
      return {
        success: false,
        payment: null,
        updatedBillingAccountSummary: null,
        message: 'Failed to create payment.'
      };
    }

    const updatedAccount = result.updatedBillingAccount;

    return {
      success: true,
      payment: result.payment,
      updatedBillingAccountSummary: {
        currentBalance: Number(updatedAccount.current_balance || 0),
        pastDueAmount: Number(updatedAccount.past_due_amount || 0),
        nextDueDate: updatedAccount.next_due_date || null
      },
      message: 'Payment submitted successfully.'
    };
  }

  // getAutoPaySettings(billingAccountId)
  getAutoPaySettings(billingAccountId) {
    const accounts = this._getFromStorage('billing_accounts');
    const paymentMethods = this._getFromStorage('payment_methods');
    const autopaySettings = this._getFromStorage('autopay_settings');

    let billingAccount = null;
    if (billingAccountId) {
      billingAccount = accounts.find(a => a.id === billingAccountId) || null;
    } else {
      billingAccount = this._getCurrentBillingAccount();
    }

    if (!billingAccount) {
      return {
        billingAccountSummary: null,
        autoPaySetting: null,
        eligiblePaymentMethods: [],
        scheduleOptions: []
      };
    }

    const aps = autopaySettings.find(a => a.billing_account_id === billingAccount.id) || null;
    let autoPaySetting = null;
    if (aps) {
      const pm = paymentMethods.find(m => m.id === aps.payment_method_id) || null;
      autoPaySetting = {
        id: aps.id,
        status: aps.status,
        amountType: aps.amount_type,
        fixedAmount: aps.fixed_amount != null ? aps.fixed_amount : null,
        paymentMethodId: aps.payment_method_id,
        scheduleOption: aps.schedule_option,
        scheduleOffsetDays: aps.schedule_offset_days != null ? aps.schedule_offset_days : null,
        paymentMethod: this._clone(pm)
      };
    }

    const eligiblePaymentMethods = paymentMethods
      .filter(pm => pm.status === 'active' && pm.can_autopay)
      .map(pm => ({
        id: pm.id,
        displayLabel: pm.nickname || this._buildPaymentMethodLabel(pm),
        type: pm.type,
        status: pm.status,
        canAutopay: pm.can_autopay
      }));

    const scheduleOptions = [
      {
        value: 'days_before_due_date',
        label: 'Days before due date',
        description: 'Automatically pay a set number of days before your due date.'
      },
      {
        value: 'on_due_date',
        label: 'On due date',
        description: 'Automatically pay on your bill due date.'
      },
      {
        value: 'days_after_due_date',
        label: 'Days after due date',
        description: 'Automatically pay a set number of days after your due date.'
      }
    ];

    return {
      billingAccountSummary: {
        id: billingAccount.id,
        name: billingAccount.name,
        accountNumber: billingAccount.account_number
      },
      autoPaySetting: autoPaySetting,
      eligiblePaymentMethods: eligiblePaymentMethods,
      scheduleOptions: scheduleOptions
    };
  }

  // updateAutoPaySettings(...)
  updateAutoPaySettings(billingAccountId, status, amountType, fixedAmount, paymentMethodId, scheduleOption, scheduleOffsetDays) {
    const accounts = this._getFromStorage('billing_accounts');
    const paymentMethods = this._getFromStorage('payment_methods');

    const billingAccount = accounts.find(a => a.id === billingAccountId) || null;
    if (!billingAccount) {
      return {
        success: false,
        autoPaySettingId: null,
        updatedAutoPaySetting: null,
        message: 'Billing account not found.'
      };
    }

    const pm = paymentMethods.find(m => m.id === paymentMethodId) || null;
    if (!pm || !pm.can_autopay || pm.status !== 'active') {
      return {
        success: false,
        autoPaySettingId: null,
        updatedAutoPaySetting: null,
        message: 'Invalid auto-pay payment method.'
      };
    }

    const allowedStatus = ['enabled', 'disabled'];
    if (!allowedStatus.includes(status)) {
      return {
        success: false,
        autoPaySettingId: null,
        updatedAutoPaySetting: null,
        message: 'Invalid auto-pay status.'
      };
    }

    const allowedAmountTypes = ['total_statement_balance', 'fixed_amount', 'minimum_payment'];
    if (!allowedAmountTypes.includes(amountType)) {
      return {
        success: false,
        autoPaySettingId: null,
        updatedAutoPaySetting: null,
        message: 'Invalid auto-pay amount type.'
      };
    }

    if (amountType === 'fixed_amount') {
      if (typeof fixedAmount !== 'number' || fixedAmount <= 0) {
        return {
          success: false,
          autoPaySettingId: null,
          updatedAutoPaySetting: null,
          message: 'Fixed amount must be a positive number.'
        };
      }
    }

    const allowedScheduleOptions = ['days_before_due_date', 'on_due_date', 'days_after_due_date'];
    if (!allowedScheduleOptions.includes(scheduleOption)) {
      return {
        success: false,
        autoPaySettingId: null,
        updatedAutoPaySetting: null,
        message: 'Invalid schedule option.'
      };
    }

    if (scheduleOption !== 'on_due_date') {
      if (typeof scheduleOffsetDays !== 'number' || scheduleOffsetDays < 0) {
        return {
          success: false,
          autoPaySettingId: null,
          updatedAutoPaySetting: null,
          message: 'Schedule offset days must be a non-negative number.'
        };
      }
    }

    const setting = this._upsertAutoPaySetting(billingAccount.id, {
      status: status,
      amountType: amountType,
      fixedAmount: fixedAmount,
      paymentMethodId: paymentMethodId,
      scheduleOption: scheduleOption,
      scheduleOffsetDays: scheduleOption === 'on_due_date' ? null : scheduleOffsetDays
    });

    // Update BillingAccount.auto_pay_enabled
    const accountsAll = this._getFromStorage('billing_accounts');
    const idx = accountsAll.findIndex(a => a.id === billingAccount.id);
    if (idx !== -1) {
      accountsAll[idx].auto_pay_enabled = status === 'enabled';
      this._saveToStorage('billing_accounts', accountsAll);
    }

    return {
      success: true,
      autoPaySettingId: setting.id,
      updatedAutoPaySetting: {
        status: setting.status,
        amountType: setting.amount_type,
        fixedAmount: setting.fixed_amount,
        paymentMethodId: setting.payment_method_id,
        scheduleOption: setting.schedule_option,
        scheduleOffsetDays: setting.schedule_offset_days
      },
      message: 'Auto-pay settings updated.'
    };
  }

  // getPlanFilterOptions
  getPlanFilterOptions() {
    const plans = this._getFromStorage('internet_plans').filter(p => p.is_available === true);

    const categoriesMap = {};
    let minPrice = null;
    let maxPrice = null;
    let minSpeed = null;
    let maxSpeed = null;

    for (const p of plans) {
      if (!categoriesMap[p.category]) {
        categoriesMap[p.category] = true;
      }
      const price = Number(p.price_monthly || 0);
      const speed = Number(p.download_speed_mbps || 0);
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
      if (minSpeed === null || speed < minSpeed) minSpeed = speed;
      if (maxSpeed === null || speed > maxSpeed) maxSpeed = speed;
    }

    const categories = Object.keys(categoriesMap).map(cat => ({
      value: cat,
      label: cat === 'internet_only' ? 'Internet Only' :
        cat === 'internet_tv_bundle' ? 'Internet + TV' :
        cat === 'internet_phone_bundle' ? 'Internet + Phone' :
        cat === 'internet_tv_phone_bundle' ? 'Internet + TV + Phone' : cat
    }));

    return {
      categories: categories,
      priceRange: {
        minPrice: minPrice != null ? minPrice : 0,
        maxPrice: maxPrice != null ? maxPrice : 0,
        step: 5
      },
      speedRange: {
        minSpeedMbps: minSpeed != null ? minSpeed : 0,
        maxSpeedMbps: maxSpeed != null ? maxSpeed : 0,
        increment: 50
      },
      sortOptions: [
        { value: 'speed_high_to_low', label: 'Speed - High to Low' },
        { value: 'price_low_to_high', label: 'Price - Low to High' },
        { value: 'price_high_to_low', label: 'Price - High to Low' }
      ]
    };
  }

  // searchAvailablePlans(category, maxPriceMonthly, minDownloadSpeedMbps, sortBy)
  searchAvailablePlans(category, maxPriceMonthly, minDownloadSpeedMbps, sortBy) {
    const plans = this._getFromStorage('internet_plans');
    const internetService = this._getCurrentInternetService();

    let currentPlan = null;
    if (internetService) {
      const cp = plans.find(p => p.id === internetService.current_plan_id) || null;
      if (cp) {
        currentPlan = {
          id: cp.id,
          name: cp.name,
          category: cp.category,
          priceMonthly: cp.price_monthly,
          promoPriceMonthly: cp.promo_price_monthly || null,
          downloadSpeedMbps: cp.download_speed_mbps,
          uploadSpeedMbps: cp.upload_speed_mbps || null,
          dataCapGb: cp.data_cap_gb || null,
          description: cp.description || null
        };
      }
    }

    const filtered = this._filterAndSortPlans(plans, {
      category: category || null,
      maxPriceMonthly: typeof maxPriceMonthly === 'number' ? maxPriceMonthly : null,
      minDownloadSpeedMbps: typeof minDownloadSpeedMbps === 'number' ? minDownloadSpeedMbps : null,
      sortBy: sortBy || null
    });

    return {
      currentPlan: currentPlan,
      availablePlans: filtered
    };
  }

  // getPlanDetails(planId)
  getPlanDetails(planId) {
    const plans = this._getFromStorage('internet_plans');
    const internetService = this._getCurrentInternetService();

    const plan = plans.find(p => p.id === planId) || null;
    if (!plan) {
      return {
        plan: null,
        isCurrentPlan: false,
        estimatedMonthlyCharge: null,
        installationOptions: [],
        summaryText: 'Plan not found.'
      };
    }

    const isCurrentPlan = internetService ? internetService.current_plan_id === plan.id : false;
    const estimatedMonthlyCharge = plan.promo_price_monthly || plan.price_monthly || null;

    const installationOptions = [
      { value: 'keep_existing', label: 'Keep existing setup', description: 'No changes to your current equipment or installation.' },
      { value: 'self_install', label: 'Self-install', description: 'We will ship you any required equipment to install yourself.' },
      { value: 'professional_install', label: 'Professional install', description: 'A technician will come to install your service.' }
    ];

    const planObj = {
      id: plan.id,
      name: plan.name,
      category: plan.category,
      priceMonthly: plan.price_monthly,
      promoPriceMonthly: plan.promo_price_monthly || null,
      promoDurationMonths: plan.promo_duration_months || null,
      downloadSpeedMbps: plan.download_speed_mbps,
      uploadSpeedMbps: plan.upload_speed_mbps || null,
      dataCapGb: plan.data_cap_gb || null,
      description: plan.description || null,
      includedFeatures: plan.included_features || []
    };

    const summaryText = 'Upgrade to ' + plan.name + ' with up to ' + plan.download_speed_mbps + ' Mbps download speeds.';

    return {
      plan: planObj,
      isCurrentPlan: isCurrentPlan,
      estimatedMonthlyCharge: estimatedMonthlyCharge,
      installationOptions: installationOptions,
      summaryText: summaryText
    };
  }

  // upgradeToPlan(planId, installationOption)
  upgradeToPlan(planId, installationOption) {
    const internetService = this._getCurrentInternetService();
    if (!internetService) {
      return {
        success: false,
        planChangeOrderId: null,
        orderStatus: null,
        effectiveDate: null,
        estimatedMonthlyCharge: null,
        orderSummary: null,
        message: 'No internet service found.'
      };
    }

    const plans = this._getFromStorage('internet_plans');
    const plan = plans.find(p => p.id === planId && p.is_available === true) || null;
    if (!plan) {
      return {
        success: false,
        planChangeOrderId: null,
        orderStatus: null,
        effectiveDate: null,
        estimatedMonthlyCharge: null,
        orderSummary: null,
        message: 'Selected plan is not available.'
      };
    }

    const allowedInstallationOptions = ['keep_existing', 'self_install', 'professional_install'];
    if (!allowedInstallationOptions.includes(installationOption)) {
      return {
        success: false,
        planChangeOrderId: null,
        orderStatus: null,
        effectiveDate: null,
        estimatedMonthlyCharge: null,
        orderSummary: null,
        message: 'Invalid installation option.'
      };
    }

    const order = this._submitPlanChangeOrder(internetService, plan, installationOption);

    return {
      success: true,
      planChangeOrderId: order.id,
      orderStatus: order.status,
      effectiveDate: order.effective_date,
      estimatedMonthlyCharge: order.estimated_monthly_charge,
      orderSummary: order.order_summary,
      message: 'Plan change order submitted.'
    };
  }

  // getAddonFilterOptions
  getAddonFilterOptions() {
    const addons = this._getFromStorage('addon_products').filter(a => a.is_active === true && a.is_tv === true);

    const categoriesMap = {};
    let minPrice = null;
    let maxPrice = null;

    for (const a of addons) {
      if (!categoriesMap[a.category_key]) categoriesMap[a.category_key] = true;
      const price = Number(a.price_monthly || 0);
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
    }

    const categories = Object.keys(categoriesMap).map(key => ({
      value: key,
      label: key === 'tv' ? 'TV' : key === 'streaming_tv' ? 'Streaming TV' : key,
      isTv: key === 'tv' || key === 'streaming_tv'
    }));

    const channelCountOptions = [
      { minChannels: 0, label: 'All channel counts' },
      { minChannels: 50, label: '50+ channels' },
      { minChannels: 100, label: '100+ channels' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'channel_count_high_to_low', label: 'Channels - High to Low' }
    ];

    return {
      categories: categories,
      priceRange: {
        minPrice: minPrice != null ? minPrice : 0,
        maxPrice: maxPrice != null ? maxPrice : 0,
        step: 1
      },
      channelCountOptions: channelCountOptions,
      sortOptions: sortOptions
    };
  }

  // searchAddonProducts(categoryKey, maxPriceMonthly, minChannelCount, sortBy)
  searchAddonProducts(categoryKey, maxPriceMonthly, minChannelCount, sortBy) {
    const addons = this._getFromStorage('addon_products');
    const filtered = this._filterAndSortAddonProducts(addons, {
      categoryKey: categoryKey || null,
      maxPriceMonthly: typeof maxPriceMonthly === 'number' ? maxPriceMonthly : null,
      minChannelCount: typeof minChannelCount === 'number' ? minChannelCount : null,
      sortBy: sortBy || null
    });

    return {
      addonProducts: filtered
    };
  }

  // getAddonDetails(addonProductId)
  getAddonDetails(addonProductId) {
    const addons = this._getFromStorage('addon_products');
    const addon = addons.find(a => a.id === addonProductId) || null;
    const billingAccount = this._getCurrentBillingAccount();
    const subs = this._getFromStorage('addon_subscriptions');

    if (!addon) {
      return {
        addonProduct: null,
        isAlreadySubscribed: false,
        priceDisplay: 'Add-on not found.'
      };
    }

    let isAlreadySubscribed = false;
    if (billingAccount) {
      isAlreadySubscribed = !!subs.find(s => s.billing_account_id === billingAccount.id && s.addon_product_id === addon.id && (s.status === 'active' || s.status === 'pending_add'));
    }

    const priceDisplay = addon.price_monthly != null ? ('$' + Number(addon.price_monthly).toFixed(2) + '/mo') : 'Price not available';

    const addonProduct = {
      id: addon.id,
      name: addon.name,
      categoryKey: addon.category_key,
      priceMonthly: addon.price_monthly,
      channelCount: addon.channel_count || null,
      description: addon.description || null,
      features: addon.features || [],
      isActive: addon.is_active
    };

    return {
      addonProduct: addonProduct,
      isAlreadySubscribed: isAlreadySubscribed,
      priceDisplay: priceDisplay
    };
  }

  // submitAddonChange(addonProductId, action, startTiming)
  submitAddonChange(addonProductId, action, startTiming) {
    const billingAccount = this._getCurrentBillingAccount();
    if (!billingAccount) {
      return {
        success: false,
        addonChangeOrderId: null,
        status: null,
        effectiveDate: null,
        message: 'No billing account found.'
      };
    }

    const addons = this._getFromStorage('addon_products');
    const addon = addons.find(a => a.id === addonProductId && a.is_active === true) || null;
    if (!addon) {
      return {
        success: false,
        addonChangeOrderId: null,
        status: null,
        effectiveDate: null,
        message: 'Add-on not found or inactive.'
      };
    }

    const allowedActions = ['add', 'remove'];
    if (!allowedActions.includes(action)) {
      return {
        success: false,
        addonChangeOrderId: null,
        status: null,
        effectiveDate: null,
        message: 'Invalid add-on action.'
      };
    }

    const allowedTiming = ['immediately', 'next_billing_cycle'];
    if (!allowedTiming.includes(startTiming)) {
      return {
        success: false,
        addonChangeOrderId: null,
        status: null,
        effectiveDate: null,
        message: 'Invalid start timing.'
      };
    }

    const order = this._submitAddonChangeOrder(billingAccount, addon, action, startTiming);

    return {
      success: true,
      addonChangeOrderId: order.id,
      status: order.status,
      effectiveDate: order.effective_date,
      message: 'Add-on change submitted.'
    };
  }

  // getInternetAndEquipmentOverview
  getInternetAndEquipmentOverview() {
    const internetService = this._getCurrentInternetService();
    const plans = this._getFromStorage('internet_plans');
    const locations = this._getFromStorage('service_locations');
    const equipmentDevices = this._getFromStorage('equipment_devices');
    const equipmentProducts = this._getFromStorage('equipment_products');

    let internetServiceSummary = null;
    let currentPlanSummary = null;
    let dataUsageSummary = null;
    let primaryEquipment = null;
    let otherEquipment = [];

    if (internetService) {
      const location = locations.find(l => l.id === internetService.service_location_id) || null;
      const plan = plans.find(p => p.id === internetService.current_plan_id) || null;

      internetServiceSummary = {
        id: internetService.id,
        status: internetService.status,
        installationType: internetService.installation_type,
        activationDate: internetService.activation_date || null,
        serviceLocationLabel: location ? (location.label || (location.address_line1 || '')) : null
      };

      if (plan) {
        currentPlanSummary = {
          planName: plan.name,
          downloadSpeedMbps: plan.download_speed_mbps,
          uploadSpeedMbps: plan.upload_speed_mbps || null,
          dataCapGb: plan.data_cap_gb || null
        };
      }

      const usage = this._calculateDataUsageSummary(internetService.id);
      if (usage.currentCycle) {
        const used = Number(usage.currentCycle.data_used_gb || 0);
        const cap = Number(usage.currentCycle.data_cap_gb || 0) || null;
        const percent = cap ? Math.round((used / cap) * 10000) / 100 : 0;
        dataUsageSummary = {
          currentCycleUsedGb: used,
          currentCycleCapGb: cap,
          percentUsed: percent,
          cycleEnd: usage.currentCycle.cycle_end || null
        };
      } else {
        dataUsageSummary = {
          currentCycleUsedGb: 0,
          currentCycleCapGb: 0,
          percentUsed: 0,
          cycleEnd: null
        };
      }

      const devicesAtLocation = equipmentDevices.filter(d => d.installed_location_id === internetService.service_location_id);
      const primaryDevice = devicesAtLocation.find(d => d.is_primary) || null;

      if (primaryDevice) {
        const product = primaryDevice.product_id ? equipmentProducts.find(p => p.id === primaryDevice.product_id) || null : null;
        const supportsWifi6 = product ? !!product.supports_wifi6 : false;
        const type = primaryDevice.type || (product ? product.type : null);
        const manageWifiAvailable = (type === 'router' || type === 'gateway') && primaryDevice.status !== 'inactive';

        primaryEquipment = {
          deviceId: primaryDevice.id,
          type: primaryDevice.type,
          productName: product ? product.name : null,
          status: primaryDevice.status,
          isRented: !!primaryDevice.is_rented,
          supportsWifi6: supportsWifi6,
          firmwareVersion: primaryDevice.firmware_version || null,
          manageWifiAvailable: manageWifiAvailable
        };
      }

      const otherDevices = devicesAtLocation.filter(d => !d.is_primary);
      otherEquipment = otherDevices.map(d => {
        const product = d.product_id ? equipmentProducts.find(p => p.id === d.product_id) || null : null;
        const locationRef = locations.find(l => l.id === d.installed_location_id) || null;
        return {
          ...d,
          product: this._clone(product),
          installed_location: this._clone(locationRef)
        };
      });
    }

    return {
      internetService: internetServiceSummary,
      currentPlan: currentPlanSummary,
      dataUsageSummary: dataUsageSummary,
      primaryEquipment: primaryEquipment,
      otherEquipment: otherEquipment
    };
  }

  // getWifiSettings(deviceId)
  getWifiSettings(deviceId) {
    const devices = this._getFromStorage('equipment_devices');
    const products = this._getFromStorage('equipment_products');
    const networks = this._getFromStorage('wifi_networks');

    const device = devices.find(d => d.id === deviceId) || null;

    if (!device) {
      return {
        device: null,
        networks: [],
        primaryNetworkId: null,
        bandModeOptions: [],
        securityTypeOptions: []
      };
    }

    const product = device.product_id ? products.find(p => p.id === device.product_id) || null : null;
    const deviceSummary = {
      id: device.id,
      type: device.type,
      productName: product ? product.name : null,
      status: device.status
    };

    const deviceNetworks = networks.filter(n => n.device_id === device.id);
    let primaryNetworkId = null;

    const networkSummaries = deviceNetworks.map(n => {
      if (n.is_primary && !n.is_guest) {
        primaryNetworkId = n.id;
      }
      return {
        networkId: n.id,
        ssid: n.ssid,
        isPrimary: !!n.is_primary,
        isGuest: !!n.is_guest,
        bandMode: n.band_mode,
        securityType: n.security_type,
        lastUpdated: n.last_updated
      };
    });

    const bandModeOptions = [
      { value: 'combined', label: '2.4 GHz and 5 GHz combined', description: 'Use a single network name for all bands.' },
      { value: 'separate', label: 'Separate bands', description: 'Use different network names for 2.4 GHz and 5 GHz.' },
      { value: 'band_2_4_ghz', label: '2.4 GHz only', description: 'Restrict Wi-Fi to 2.4 GHz band.' },
      { value: 'band_5_ghz', label: '5 GHz only', description: 'Restrict Wi-Fi to 5 GHz band.' }
    ];

    const securityTypeOptions = [
      { value: 'wpa2', label: 'WPA2', description: 'Recommended for most devices.' },
      { value: 'wpa3', label: 'WPA3', description: 'Latest security standard (may not work with older devices).' },
      { value: 'wpa2_wpa3_mixed', label: 'WPA2/WPA3 Mixed', description: 'Compatible with more devices.' },
      { value: 'open', label: 'Open (not secure)', description: 'No password protection.' }
    ];

    return {
      device: deviceSummary,
      networks: networkSummaries,
      primaryNetworkId: primaryNetworkId,
      bandModeOptions: bandModeOptions,
      securityTypeOptions: securityTypeOptions
    };
  }

  // updateWifiNetwork(networkId, ssid, password, bandMode)
  updateWifiNetwork(networkId, ssid, password, bandMode) {
    const updates = {};
    if (ssid !== undefined) updates.ssid = ssid;
    if (password !== undefined) updates.password = password;
    if (bandMode !== undefined) updates.bandMode = bandMode;

    const result = this._updateWifiNetworkConfig(networkId, updates);

    if (!result.success) {
      return {
        success: false,
        updatedNetwork: null,
        requiresReboot: false,
        message: 'Wi-Fi network not found or no changes made.'
      };
    }

    const updated = result.network;
    const requiresReboot = !!(updates.ssid || updates.bandMode);

    return {
      success: true,
      updatedNetwork: {
        networkId: updated.id,
        ssid: updated.ssid,
        bandMode: updated.band_mode,
        securityType: updated.security_type,
        lastUpdated: updated.last_updated
      },
      requiresReboot: requiresReboot,
      message: 'Wi-Fi network updated.'
    };
  }

  // getEquipmentFilterOptions
  getEquipmentFilterOptions() {
    const products = this._getFromStorage('equipment_products').filter(p => p.is_available === true);

    const typesMap = {};
    let minPrice = null;
    let maxPrice = null;
    let wifi6FilterEnabled = false;

    for (const p of products) {
      if (!typesMap[p.type]) typesMap[p.type] = true;
      if (p.supports_wifi6) wifi6FilterEnabled = true;
      if (p.rental_price_monthly != null) {
        const price = Number(p.rental_price_monthly);
        if (minPrice === null || price < minPrice) minPrice = price;
        if (maxPrice === null || price > maxPrice) maxPrice = price;
      }
    }

    const types = Object.keys(typesMap).map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' ') }));

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'name_a_to_z', label: 'Name A-Z' }
    ];

    return {
      types: types,
      wifi6FilterEnabled: wifi6FilterEnabled,
      priceRange: {
        minPrice: minPrice != null ? minPrice : 0,
        maxPrice: maxPrice != null ? maxPrice : 0,
        step: 1
      },
      sortOptions: sortOptions
    };
  }

  // searchEquipmentProducts(type, supportsWifi6, maxRentalPriceMonthly, sortBy)
  searchEquipmentProducts(type, supportsWifi6, maxRentalPriceMonthly, sortBy) {
    const products = this._getFromStorage('equipment_products');
    const filtered = this._filterAndSortEquipmentProducts(products, {
      type: type || null,
      supportsWifi6: typeof supportsWifi6 === 'boolean' ? supportsWifi6 : null,
      maxRentalPriceMonthly: typeof maxRentalPriceMonthly === 'number' ? maxRentalPriceMonthly : null,
      sortBy: sortBy || null
    });

    return {
      equipmentProducts: filtered
    };
  }

  // getEquipmentDetails(equipmentProductId)
  getEquipmentDetails(equipmentProductId) {
    const products = this._getFromStorage('equipment_products');
    const devices = this._getFromStorage('equipment_devices');

    const product = products.find(p => p.id === equipmentProductId) || null;
    if (!product) {
      return {
        equipmentProduct: null,
        isCurrentlyRented: false,
        defaultInstallationOption: null,
        installationOptions: [],
        rentalPriceDisplay: 'Equipment not found.'
      };
    }

    const isCurrentlyRented = !!devices.find(d => d.product_id === product.id && d.is_rented && d.status !== 'inactive');

    const defaultInstallationOption = product.type === 'router' || product.type === 'gateway' ? 'self_install' : 'ship_to_address';

    const installationOptions = [
      { value: 'self_install', label: 'Self-install', description: 'Ship equipment to your address for self-installation.' },
      { value: 'ship_to_address', label: 'Ship only', description: 'Equipment will be shipped to your address.' },
      { value: 'professional_install', label: 'Professional install', description: 'Technician will install the equipment.' }
    ];

    const rentalPriceDisplay = product.rental_price_monthly != null ? ('$' + Number(product.rental_price_monthly).toFixed(2) + '/mo') : 'Rental price not available';

    const equipmentProduct = {
      id: product.id,
      name: product.name,
      type: product.type,
      supportsWifi6: !!product.supports_wifi6,
      rentalPriceMonthly: product.rental_price_monthly || null,
      purchasePrice: product.purchase_price || null,
      description: product.description || null,
      features: product.features || []
    };

    return {
      equipmentProduct: equipmentProduct,
      isCurrentlyRented: isCurrentlyRented,
      defaultInstallationOption: defaultInstallationOption,
      installationOptions: installationOptions,
      rentalPriceDisplay: rentalPriceDisplay
    };
  }

  // submitEquipmentOrder(equipmentProductId, action, installationOption)
  submitEquipmentOrder(equipmentProductId, action, installationOption) {
    const billingAccount = this._getCurrentBillingAccount();
    if (!billingAccount) {
      return {
        success: false,
        equipmentOrderId: null,
        status: null,
        monthlyRentalPrice: null,
        message: 'No billing account found.'
      };
    }

    const products = this._getFromStorage('equipment_products');
    const product = products.find(p => p.id === equipmentProductId && p.is_available === true) || null;
    if (!product) {
      return {
        success: false,
        equipmentOrderId: null,
        status: null,
        monthlyRentalPrice: null,
        message: 'Equipment not found or unavailable.'
      };
    }

    const allowedActions = ['rent_new', 'upgrade', 'replace', 'return'];
    if (!allowedActions.includes(action)) {
      return {
        success: false,
        equipmentOrderId: null,
        status: null,
        monthlyRentalPrice: null,
        message: 'Invalid equipment action.'
      };
    }

    const allowedInstallationOptions = ['self_install', 'ship_to_address', 'professional_install'];
    if (!allowedInstallationOptions.includes(installationOption)) {
      return {
        success: false,
        equipmentOrderId: null,
        status: null,
        monthlyRentalPrice: null,
        message: 'Invalid installation option.'
      };
    }

    const order = this._submitEquipmentOrder(billingAccount, product, action, installationOption);

    return {
      success: true,
      equipmentOrderId: order.id,
      status: order.status,
      monthlyRentalPrice: order.monthly_rental_price,
      message: 'Equipment order submitted.'
    };
  }

  // getProfileOverview
  getProfileOverview() {
    const profiles = this._getFromStorage('profiles');
    const locations = this._getFromStorage('service_locations');
    const sections = this._getFromStorage('profile_sections');

    const profile = profiles.length ? profiles[0] : null;

    let profileSummary = null;
    if (profile) {
      const location = profile.service_location_id ? locations.find(l => l.id === profile.service_location_id) || null : null;
      let serviceAddress = null;
      if (location) {
        serviceAddress = (location.address_line1 || '') + ', ' + (location.city || '') + ', ' + (location.state || '') + ' ' + (location.postal_code || '');
      }

      profileSummary = {
        fullName: profile.full_name,
        primaryEmail: profile.primary_email,
        alternateEmail: profile.alternate_email || null,
        preferredContactPhone: profile.preferred_contact_phone || null,
        serviceAddress: serviceAddress
      };
    }

    return {
      profile: profileSummary,
      sections: sections
    };
  }

  // updateProfileContactInfo(primaryEmail, alternateEmail, preferredContactPhone)
  updateProfileContactInfo(primaryEmail, alternateEmail, preferredContactPhone) {
    const profiles = this._getFromStorage('profiles');
    let profile = profiles.length ? profiles[0] : null;

    const now = this._nowIso();

    if (!profile) {
      profile = {
        id: this._generateId('pro'),
        full_name: '',
        primary_email: primaryEmail || '',
        alternate_email: alternateEmail || null,
        preferred_contact_phone: preferredContactPhone || null,
        service_location_id: null,
        created_at: now
      };
      profiles.push(profile);
    } else {
      if (primaryEmail !== undefined) profile.primary_email = primaryEmail;
      if (alternateEmail !== undefined) profile.alternate_email = alternateEmail;
      if (preferredContactPhone !== undefined) profile.preferred_contact_phone = preferredContactPhone;
      const idx = profiles.findIndex(p => p.id === profile.id);
      profiles[idx] = profile;
    }

    this._saveToStorage('profiles', profiles);

    return {
      success: true,
      profile: {
        fullName: profile.full_name,
        primaryEmail: profile.primary_email,
        alternateEmail: profile.alternate_email,
        preferredContactPhone: profile.preferred_contact_phone
      },
      message: 'Profile updated.'
    };
  }

  // getNotificationPreferences
  getNotificationPreferences() {
    const profiles = this._getFromStorage('profiles');
    const profile = profiles.length ? profiles[0] : null;
    const allSettings = this._getFromStorage('notification_settings');

    let settings = null;
    if (profile) {
      settings = allSettings.find(s => s.profile_id === profile.id) || null;
    }

    if (!settings && profile) {
      // Provide default settings but do not persist until updated
      settings = {
        id: null,
        profile_id: profile.id,
        mobile_phone: null,
        outage_channels: ['email'],
        billing_channels: ['email'],
        promotions_channels: [],
        data_usage_channels: ['email'],
        appointment_channels: ['email', 'sms'],
        global_frequency: 'standard',
        last_updated: null
      };
    }

    const contactInfo = {
      primaryEmail: profile ? profile.primary_email : null,
      mobilePhone: settings ? settings.mobile_phone : null
    };

    const notificationSettings = settings ? {
      outageChannels: settings.outage_channels || [],
      billingChannels: settings.billing_channels || [],
      promotionsChannels: settings.promotions_channels || [],
      dataUsageChannels: settings.data_usage_channels || [],
      appointmentChannels: settings.appointment_channels || [],
      globalFrequency: settings.global_frequency || 'standard'
    } : {
      outageChannels: [],
      billingChannels: [],
      promotionsChannels: [],
      dataUsageChannels: [],
      appointmentChannels: [],
      globalFrequency: 'standard'
    };

    const channelOptions = [
      { value: 'email', label: 'Email' },
      { value: 'sms', label: 'Text message (SMS)' },
      { value: 'push', label: 'Push notifications' }
    ];

    const frequencyOptions = [
      { value: 'standard', label: 'Standard', description: 'Important alerts and occasional updates.' },
      { value: 'frequent', label: 'Frequent', description: 'More frequent updates and reminders.' },
      { value: 'off', label: 'Off', description: 'Disable most notifications.' }
    ];

    return {
      contactInfo: contactInfo,
      notificationSettings: notificationSettings,
      channelOptions: channelOptions,
      frequencyOptions: frequencyOptions
    };
  }

  // updateNotificationPreferences(...)
  updateNotificationPreferences(mobilePhone, outageChannels, billingChannels, promotionsChannels, dataUsageChannels, appointmentChannels, globalFrequency) {
    const profiles = this._getFromStorage('profiles');
    const profile = profiles.length ? profiles[0] : null;
    if (!profile) {
      return {
        success: false,
        notificationSettingsId: null,
        updatedNotificationSettings: null,
        message: 'Profile not found.'
      };
    }

    const allowedChannels = ['email', 'sms', 'push'];
    const validateChannels = arr => Array.isArray(arr) && arr.every(c => allowedChannels.includes(c));

    if (!validateChannels(outageChannels) || !validateChannels(billingChannels) || !validateChannels(promotionsChannels)) {
      return {
        success: false,
        notificationSettingsId: null,
        updatedNotificationSettings: null,
        message: 'Invalid channels specified.'
      };
    }
    if (dataUsageChannels && !validateChannels(dataUsageChannels)) {
      return {
        success: false,
        notificationSettingsId: null,
        updatedNotificationSettings: null,
        message: 'Invalid data usage channels.'
      };
    }
    if (appointmentChannels && !validateChannels(appointmentChannels)) {
      return {
        success: false,
        notificationSettingsId: null,
        updatedNotificationSettings: null,
        message: 'Invalid appointment channels.'
      };
    }

    const allowedFreq = ['standard', 'frequent', 'off'];
    if (!allowedFreq.includes(globalFrequency)) {
      return {
        success: false,
        notificationSettingsId: null,
        updatedNotificationSettings: null,
        message: 'Invalid notification frequency.'
      };
    }

    const settings = this._persistNotificationSettings(profile.id, {
      mobilePhone: mobilePhone,
      outageChannels: outageChannels,
      billingChannels: billingChannels,
      promotionsChannels: promotionsChannels,
      dataUsageChannels: dataUsageChannels || [],
      appointmentChannels: appointmentChannels || [],
      globalFrequency: globalFrequency
    });

    const updatedNotificationSettings = {
      mobilePhone: settings.mobile_phone,
      outageChannels: settings.outage_channels || [],
      billingChannels: settings.billing_channels || [],
      promotionsChannels: settings.promotions_channels || [],
      dataUsageChannels: settings.data_usage_channels || [],
      appointmentChannels: settings.appointment_channels || [],
      globalFrequency: settings.global_frequency
    };

    return {
      success: true,
      notificationSettingsId: settings.id,
      updatedNotificationSettings: updatedNotificationSettings,
      message: 'Notification preferences updated.'
    };
  }

  // getDataUsageOverview
  getDataUsageOverview() {
    const internetService = this._getCurrentInternetService();
    if (!internetService) {
      return {
        currentCycle: null,
        recentCycles: [],
        alertsSummary: {
          hasActiveAlerts: false,
          highestThresholdGb: null
        }
      };
    }

    const usage = this._calculateDataUsageSummary(internetService.id);
    const alerts = this._getFromStorage('data_usage_alerts').filter(a => a.internet_service_id === internetService.id && a.status === 'active');

    let highestThresholdGb = null;
    for (const a of alerts) {
      if (a.threshold_type === 'gb_used') {
        const val = Number(a.threshold_value || 0);
        if (highestThresholdGb === null || val > highestThresholdGb) highestThresholdGb = val;
      }
    }

    const cycles = usage.recentCycles || [];
    const internetServices = this._getFromStorage('internet_services');

    const recentCyclesResolved = cycles.map(c => {
      const svc = internetServices.find(s => s.id === c.internet_service_id) || null;
      return {
        ...c,
        internet_service: this._clone(svc)
      };
    });

    let currentCycleSummary = null;
    if (usage.currentCycle) {
      const used = Number(usage.currentCycle.data_used_gb || 0);
      const cap = Number(usage.currentCycle.data_cap_gb || 0) || null;
      const percent = cap ? Math.round((used / cap) * 10000) / 100 : 0;
      currentCycleSummary = {
        cycleStart: usage.currentCycle.cycle_start,
        cycleEnd: usage.currentCycle.cycle_end,
        dataUsedGb: used,
        dataCapGb: cap,
        percentUsed: percent,
        overageCharges: Number(usage.currentCycle.overage_charges || 0)
      };
    }

    return {
      currentCycle: currentCycleSummary,
      recentCycles: recentCyclesResolved,
      alertsSummary: {
        hasActiveAlerts: alerts.length > 0,
        highestThresholdGb: highestThresholdGb
      }
    };
  }

  // getDataUsageAlerts
  getDataUsageAlerts() {
    const internetService = this._getCurrentInternetService();
    if (!internetService) {
      return { alerts: [] };
    }

    const alertsArr = this._getFromStorage('data_usage_alerts').filter(a => a.internet_service_id === internetService.id);
    const internetServices = this._getFromStorage('internet_services');

    const alerts = alertsArr.map(a => {
      const svc = internetServices.find(s => s.id === a.internet_service_id) || null;
      return {
        id: a.id,
        internetServiceId: a.internet_service_id,
        thresholdType: a.threshold_type,
        thresholdValue: a.threshold_value,
        channels: a.channels || [],
        status: a.status,
        internet_service: this._clone(svc)
      };
    });

    return { alerts: alerts };
  }

  // createDataUsageAlert(internetServiceId, thresholdType, thresholdValue, channels)
  createDataUsageAlert(internetServiceId, thresholdType, thresholdValue, channels) {
    const internetServices = this._getFromStorage('internet_services');
    const svc = internetServices.find(s => s.id === internetServiceId) || null;
    if (!svc) {
      return {
        success: false,
        dataUsageAlertId: null,
        status: null,
        message: 'Internet service not found.'
      };
    }

    const allowedTypes = ['gb_used', 'percentage_used'];
    if (!allowedTypes.includes(thresholdType)) {
      return {
        success: false,
        dataUsageAlertId: null,
        status: null,
        message: 'Invalid threshold type.'
      };
    }

    if (typeof thresholdValue !== 'number' || thresholdValue <= 0) {
      return {
        success: false,
        dataUsageAlertId: null,
        status: null,
        message: 'Threshold value must be a positive number.'
      };
    }

    const allowedChannels = ['email', 'sms', 'push'];
    if (!Array.isArray(channels) || !channels.length || !channels.every(c => allowedChannels.includes(c))) {
      return {
        success: false,
        dataUsageAlertId: null,
        status: null,
        message: 'Invalid alert channels.'
      };
    }

    const alerts = this._getFromStorage('data_usage_alerts');
    const alert = {
      id: this._generateId('dua'),
      internet_service_id: internetServiceId,
      threshold_type: thresholdType,
      threshold_value: thresholdValue,
      channels: channels,
      created_at: this._nowIso(),
      status: 'active'
    };

    alerts.push(alert);
    this._saveToStorage('data_usage_alerts', alerts);

    return {
      success: true,
      dataUsageAlertId: alert.id,
      status: alert.status,
      message: 'Data usage alert created.'
    };
  }

  // updateDataUsageAlert(alertId, thresholdType, thresholdValue, channels, status)
  updateDataUsageAlert(alertId, thresholdType, thresholdValue, channels, status) {
    const alerts = this._getFromStorage('data_usage_alerts');
    const idx = alerts.findIndex(a => a.id === alertId);
    if (idx === -1) {
      return {
        success: false,
        updatedAlert: null,
        message: 'Alert not found.'
      };
    }

    const alert = alerts[idx];

    if (thresholdType !== undefined) {
      const allowedTypes = ['gb_used', 'percentage_used'];
      if (!allowedTypes.includes(thresholdType)) {
        return {
          success: false,
          updatedAlert: null,
          message: 'Invalid threshold type.'
        };
      }
      alert.threshold_type = thresholdType;
    }

    if (thresholdValue !== undefined) {
      if (typeof thresholdValue !== 'number' || thresholdValue <= 0) {
        return {
          success: false,
          updatedAlert: null,
          message: 'Threshold value must be a positive number.'
        };
      }
      alert.threshold_value = thresholdValue;
    }

    if (channels !== undefined) {
      const allowedChannels = ['email', 'sms', 'push'];
      if (!Array.isArray(channels) || !channels.length || !channels.every(c => allowedChannels.includes(c))) {
        return {
          success: false,
          updatedAlert: null,
          message: 'Invalid channels.'
        };
      }
      alert.channels = channels;
    }

    if (status !== undefined) {
      const allowedStatus = ['active', 'paused', 'deleted'];
      if (!allowedStatus.includes(status)) {
        return {
          success: false,
          updatedAlert: null,
          message: 'Invalid status.'
        };
      }
      alert.status = status;
    }

    alerts[idx] = alert;
    this._saveToStorage('data_usage_alerts', alerts);

    const updatedAlert = {
      id: alert.id,
      thresholdType: alert.threshold_type,
      thresholdValue: alert.threshold_value,
      channels: alert.channels || [],
      status: alert.status
    };

    return {
      success: true,
      updatedAlert: updatedAlert,
      message: 'Data usage alert updated.'
    };
  }

  // deleteDataUsageAlert(alertId)
  deleteDataUsageAlert(alertId) {
    const alerts = this._getFromStorage('data_usage_alerts');
    const idx = alerts.findIndex(a => a.id === alertId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Alert not found.'
      };
    }

    // Mark as deleted instead of removing
    alerts[idx].status = 'deleted';
    this._saveToStorage('data_usage_alerts', alerts);

    return {
      success: true,
      message: 'Data usage alert deleted.'
    };
  }

  // getSupportOverview
  getSupportOverview() {
    const supportArticles = this._getFromStorage('support_articles');
    const appointments = this._getFromStorage('technician_appointments');
    const slots = this._getFromStorage('appointment_slots');

    const categories = [
      { key: 'slow_internet', title: 'Slow Internet', description: 'Troubleshoot slow speeds and buffering.' },
      { key: 'outage', title: 'Service Outage', description: 'Check for outages in your area.' },
      { key: 'billing_issue', title: 'Billing & Payments', description: 'Help with bills, payments, and charges.' },
      { key: 'installation', title: 'Installation & Setup', description: 'Help setting up your internet and Wi-Fi.' },
      { key: 'other', title: 'Other Issues', description: 'Get help with other questions.' }
    ];

    const featuredArticles = supportArticles.filter(a => !!a.is_featured);

    const upcomingAppointments = appointments
      .filter(a => (a.status === 'scheduled' || a.status === 'pending_confirmation') && a.scheduled_start)
      .map(a => {
        const slot = slots.find(s => s.id === a.appointment_slot_id) || null;
        return {
          ...a,
          appointment_slot: this._clone(slot)
        };
      });

    const canScheduleAppointment = true;

    return {
      categories: categories,
      featuredArticles: featuredArticles,
      upcomingAppointments: upcomingAppointments,
      canScheduleAppointment: canScheduleAppointment
    };
  }

  // getTechnicianSchedulerInit
  getTechnicianSchedulerInit() {
    const profiles = this._getFromStorage('profiles');
    const profile = profiles.length ? profiles[0] : null;
    const allSettings = this._getFromStorage('notification_settings');
    const settings = profile ? allSettings.find(s => s.profile_id === profile.id) || null : null;

    const issueTypes = [
      { value: 'slow_internet', label: 'Slow Internet', description: 'Your internet feels slower than expected.' },
      { value: 'no_connection', label: 'No Connection', description: 'You cannot connect to the internet.' },
      { value: 'intermittent_connection', label: 'Intermittent Connection', description: 'Connection drops or is unstable.' },
      { value: 'installation', label: 'New Installation', description: 'Schedule a new installation or move.' },
      { value: 'billing_issue', label: 'Billing Issue', description: 'Talk to someone about a billing issue.' },
      { value: 'other', label: 'Other', description: 'Describe another type of issue.' }
    ];

    const availableWindows = [
      { value: 'morning', label: 'Morning (8:00 AM - 12:00 PM)', startTime: '08:00', endTime: '12:00' },
      { value: 'afternoon', label: 'Afternoon (12:00 PM - 4:00 PM)', startTime: '12:00', endTime: '16:00' },
      { value: 'evening', label: 'Evening (4:00 PM - 8:00 PM)', startTime: '16:00', endTime: '20:00' }
    ];

    // Determine maxAdvanceDays based on appointment slots (fallback to 30)
    const slots = this._getFromStorage('appointment_slots');
    let maxAdvanceDays = 30;
    if (slots.length) {
      const now = new Date();
      let maxDiff = 0;
      for (const s of slots) {
        const d = new Date(s.start_datetime);
        const diffDays = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > maxDiff) maxDiff = diffDays;
      }
      if (maxDiff > 0) maxAdvanceDays = maxDiff;
    }

    const defaultContactPhone = profile ? (profile.preferred_contact_phone || (settings ? settings.mobile_phone : null) || null) : null;

    return {
      issueTypes: issueTypes,
      defaultIssueType: 'slow_internet',
      availableWindows: availableWindows,
      maxAdvanceDays: maxAdvanceDays,
      defaultContactPhone: defaultContactPhone
    };
  }

  // getAvailableAppointmentSlots(issueType, startDate, endDate, window)
  getAvailableAppointmentSlots(issueType, startDate, endDate, window) {
    const slots = this._getFromStorage('appointment_slots');

    const start = this._parseDate(startDate);
    const end = this._parseDate(endDate);
    if (!start || !end) {
      return [];
    }

    const startTime = start.getTime();
    const endTime = end.getTime() + (1000 * 60 * 60 * 24) - 1; // end of day

    const filtered = slots.filter(s => {
      if (!s.is_available) return false;
      const slotStart = new Date(s.start_datetime).getTime();
      if (slotStart < startTime || slotStart > endTime) return false;
      if (window && s.window !== window) return false;
      if (Array.isArray(s.issue_type_restrictions) && s.issue_type_restrictions.length) {
        if (!s.issue_type_restrictions.includes(issueType)) return false;
      }
      return true;
    });

    return filtered;
  }

  // scheduleTechnicianAppointment(appointmentSlotId, issueType, contactPhone, notes)
  scheduleTechnicianAppointment(appointmentSlotId, issueType, contactPhone, notes) {
    const allowedIssues = ['slow_internet', 'no_connection', 'intermittent_connection', 'installation', 'billing_issue', 'other'];
    if (!allowedIssues.includes(issueType)) {
      return {
        success: false,
        appointmentId: null,
        status: null,
        scheduledStart: null,
        scheduledEnd: null,
        message: 'Invalid issue type.'
      };
    }

    if (!contactPhone) {
      return {
        success: false,
        appointmentId: null,
        status: null,
        scheduledStart: null,
        scheduledEnd: null,
        message: 'Contact phone is required.'
      };
    }

    const result = this._reserveAppointmentSlot(appointmentSlotId, issueType, contactPhone, notes || null);

    if (!result.success) {
      return {
        success: false,
        appointmentId: null,
        status: null,
        scheduledStart: null,
        scheduledEnd: null,
        message: result.error === 'slot_not_found' ? 'Appointment slot not found.' : 'Appointment slot is no longer available.'
      };
    }

    const appt = result.appointment;

    return {
      success: true,
      appointmentId: appt.id,
      status: appt.status,
      scheduledStart: appt.scheduled_start,
      scheduledEnd: appt.scheduled_end,
      message: 'Appointment scheduled.'
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
