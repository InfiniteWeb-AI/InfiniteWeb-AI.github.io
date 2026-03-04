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
    this._getNextIdCounter(); // ensure idCounter exists
  }

  _initStorage() {
    const tables = [
      'locations',
      'utility_accounts',
      'invoices',
      'payments',
      'payment_methods',
      'plans',
      'plan_change_requests',
      'alerts',
      'usage_records',
      'usage_reports',
      'company_billing_contacts',
      'autopay_rules',
      'location_notes',
      'cost_analytics_records',
      // auxiliary tables for exports/metadata
      'invoice_exports',
      'cost_overview_exports'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDateISO(date) {
    if (!date) return null;
    if (typeof date === 'string') return date;
    return date.toISOString();
  }

  _dateInRange(dateStr, startStr, endStr) {
    const d = this._parseDate(dateStr);
    if (!d) return false;
    if (startStr) {
      const s = this._parseDate(startStr);
      if (s && d < s) return false;
    }
    if (endStr) {
      const e = this._parseDate(endStr);
      if (e && d > e) return false;
    }
    return true;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // Attach related objects for foreign key-like fields.
  // mappingConfig: { fieldName: 'storage_key', ... }
  _attachForeignKeys(items, mappingConfig) {
    if (!items || !mappingConfig) return items;
    const isArray = Array.isArray(items);
    const list = isArray ? items : [items];
    const cache = {};

    const result = list.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const extended = Object.assign({}, item);
      for (const field in mappingConfig) {
        if (!Object.prototype.hasOwnProperty.call(extended, field)) continue;
        const storageKey = mappingConfig[field];
        if (!cache[storageKey]) {
          cache[storageKey] = this._getFromStorage(storageKey, []);
        }
        const entities = cache[storageKey];
        const idValue = extended[field];
        const entity = entities.find((e) => e.id === idValue) || null;
        let propName;
        if (field.endsWith('_id')) {
          propName = field.slice(0, -3); // remove '_id'
        } else if (field.endsWith('Id')) {
          propName = field.slice(0, -2); // remove 'Id'
        } else {
          propName = field;
        }
        extended[propName] = this._clone(entity);
      }
      return extended;
    });

    return isArray ? result : result[0];
  }

  // Helper: aggregate cost analytics by location and period
  _aggregateCostsByLocationAndPeriod(dateRangeStart, dateRangeEnd, utilityType) {
    const records = this._getFromStorage('cost_analytics_records', []);
    const locations = this._getFromStorage('locations', []);

    const start = this._parseDate(dateRangeStart);
    const end = this._parseDate(dateRangeEnd);

    const filtered = records.filter((r) => {
      if (utilityType && r.utility_type !== utilityType) return false;
      const ps = this._parseDate(r.period_start);
      const pe = this._parseDate(r.period_end);
      if (start && pe && pe < start) return false;
      if (end && ps && ps > end) return false;
      return true;
    });

    const byLocation = {};
    for (let i = 0; i < filtered.length; i++) {
      const rec = filtered[i];
      const key = rec.location_id + '|' + rec.utility_type;
      if (!byLocation[key]) {
        byLocation[key] = {
          location_id: rec.location_id,
          utility_type: rec.utility_type,
          period_start: rec.period_start,
          period_end: rec.period_end,
          total_usage_units: rec.total_usage_units || 0,
          total_cost: rec.total_cost || 0,
          currency: rec.currency || 'usd'
        };
      } else {
        const agg = byLocation[key];
        agg.total_usage_units += rec.total_usage_units || 0;
        agg.total_cost += rec.total_cost || 0;
        if (this._parseDate(rec.period_start) < this._parseDate(agg.period_start)) {
          agg.period_start = rec.period_start;
        }
        if (this._parseDate(rec.period_end) > this._parseDate(agg.period_end)) {
          agg.period_end = rec.period_end;
        }
      }
    }

    const items = Object.keys(byLocation).map((k) => {
      const agg = byLocation[k];
      const loc = locations.find((l) => l.id === agg.location_id) || null;
      return Object.assign({}, agg, {
        location_name: loc ? loc.name : null
      });
    });

    return items;
  }

  // Helper: apply company contact to all UtilityAccount records
  _applyCompanyContactToAccounts(email, phone) {
    let accounts = this._getFromStorage('utility_accounts', []);
    let updatedCount = 0;
    for (let i = 0; i < accounts.length; i++) {
      accounts[i].billing_contact_email = email;
      accounts[i].billing_contact_phone = phone;
      accounts[i].updated_at = this._formatDateISO(new Date());
      updatedCount++;
    }
    this._saveToStorage('utility_accounts', accounts);
    return updatedCount;
  }

  // =====================
  // Core interface implementations
  // =====================

  // 1. getDashboardSummary
  getDashboardSummary() {
    const invoices = this._getFromStorage('invoices', []);
    const accounts = this._getFromStorage('utility_accounts', []);
    const locations = this._getFromStorage('locations', []);
    const payments = this._getFromStorage('payments', []);
    const alerts = this._getFromStorage('alerts', []);

    // Outstanding invoices summary: unpaid, overdue, partially_paid are considered outstanding
    const outstandingStatuses = ['unpaid', 'overdue', 'partially_paid'];
    let total_unpaid_count = 0;
    let total_unpaid_amount = 0;

    for (let i = 0; i < invoices.length; i++) {
      const inv = invoices[i];
      if (outstandingStatuses.indexOf(inv.status) !== -1) {
        total_unpaid_count++;
        total_unpaid_amount += inv.remaining_balance || 0;
      }
    }

    const outstanding_invoices_summary = {
      total_unpaid_count,
      total_unpaid_amount,
      currency: 'usd'
    };

    // Upcoming due invoices: unpaid or overdue, sorted by due_date ascending
    const upcoming = invoices
      .filter((inv) => inv.status === 'unpaid' || inv.status === 'overdue')
      .map((inv) => {
        const account = accounts.find((a) => a.id === inv.account_id) || null;
        const location = account ? locations.find((l) => l.id === account.location_id) || null : null;
        return {
          invoice_id: inv.id,
          invoice_number: inv.invoice_number,
          due_date: inv.due_date,
          remaining_balance: inv.remaining_balance,
          currency: inv.currency || 'usd',
          utility_type: inv.utility_type,
          location_name: location ? location.name : null,
          account_display_name: account ? account.display_name : null,
          status: inv.status
        };
      })
      .sort((a, b) => {
        const da = this._parseDate(a.due_date) || new Date(0);
        const db = this._parseDate(b.due_date) || new Date(0);
        return da - db;
      });

    const upcoming_due_invoices = this._attachForeignKeys(upcoming, {
      invoice_id: 'invoices'
    });

    // Recent payments: last 10 by payment_date desc
    const recent_payments = payments
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.payment_date) || new Date(0);
        const db = this._parseDate(b.payment_date) || new Date(0);
        return db - da;
      })
      .slice(0, 10)
      .map((p) => {
        const invoice = invoices.find((inv) => inv.id === p.invoice_id) || null;
        const account = accounts.find((a) => a.id === p.account_id) || null;
        const location = account ? locations.find((l) => l.id === account.location_id) || null : null;
        return {
          payment_id: p.id,
          payment_date: p.payment_date,
          amount: p.amount,
          currency: p.currency || 'usd',
          status: p.status,
          invoice_number: invoice ? invoice.invoice_number : null,
          location_name: location ? location.name : null,
          utility_type: invoice ? invoice.utility_type : null
        };
      });

    // Alerts summary
    let total_active_alerts = 0;
    const byUtility = {};
    for (let i = 0; i < alerts.length; i++) {
      const alert = alerts[i];
      if (alert.is_active) {
        total_active_alerts++;
        if (!byUtility[alert.utility_type]) byUtility[alert.utility_type] = 0;
        byUtility[alert.utility_type]++;
      }
    }
    const by_utility_type = Object.keys(byUtility).map((u) => ({
      utility_type: u,
      active_count: byUtility[u]
    }));

    const alerts_summary = {
      total_active_alerts,
      by_utility_type
    };

    // Usage trends: compare last 30 days vs previous 30 days per utility_type
    const usageRecords = this._getFromStorage('usage_records', []);
    const now = new Date();
    const endCurrent = new Date(now.getTime());
    const startCurrent = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endPrev = new Date(startCurrent.getTime());
    const startPrev = new Date(endPrev.getTime() - 30 * 24 * 60 * 60 * 1000);

    const sumUsage = (records, start, end) => {
      const res = { electricity: 0, gas: 0 };
      for (let i = 0; i < records.length; i++) {
        const r = records[i];
        const d = this._parseDate(r.usage_date);
        if (!d || d < start || d > end) continue;
        if (r.utility_type === 'electricity' || r.utility_type === 'gas') {
          res[r.utility_type] += r.usage_units || 0;
        }
      }
      return res;
    };

    const currUsage = sumUsage(usageRecords, startCurrent, endCurrent);
    const prevUsage = sumUsage(usageRecords, startPrev, endPrev);

    const usage_trends = ['electricity', 'gas'].map((u) => {
      const prev = prevUsage[u] || 0;
      const curr = currUsage[u] || 0;
      let change = null;
      if (prev === 0 && curr === 0) {
        change = 0;
      } else if (prev === 0) {
        change = 100;
      } else {
        change = ((curr - prev) / prev) * 100;
      }
      return {
        utility_type: u,
        period_start: this._formatDateISO(startCurrent),
        period_end: this._formatDateISO(endCurrent),
        usage_change_percent: change
      };
    });

    // Highest cost locations over last 30 days using cost analytics
    const costStart = this._formatDateISO(startCurrent);
    const costEnd = this._formatDateISO(endCurrent);
    let highest_cost_locations = this._aggregateCostsByLocationAndPeriod(costStart, costEnd, null);
    highest_cost_locations.sort((a, b) => (b.total_cost || 0) - (a.total_cost || 0));
    highest_cost_locations = highest_cost_locations.slice(0, 5);

    highest_cost_locations = this._attachForeignKeys(highest_cost_locations, {
      location_id: 'locations'
    });

    return {
      outstanding_invoices_summary,
      upcoming_due_invoices,
      recent_payments,
      alerts_summary,
      usage_trends,
      highest_cost_locations
    };
  }

  // 2. getInvoiceFilterOptions
  getInvoiceFilterOptions() {
    const locations = this._getFromStorage('locations', []);

    const locationsList = locations.map((l) => ({
      id: l.id,
      name: l.name
    }));

    const utility_types = [
      { value: 'electricity', label: 'Electricity' },
      { value: 'gas', label: 'Gas' }
    ];

    const invoice_statuses = [
      { value: 'unpaid', label: 'Unpaid' },
      { value: 'paid', label: 'Paid' },
      { value: 'overdue', label: 'Overdue' },
      { value: 'partially_paid', label: 'Partially paid' },
      { value: 'void', label: 'Void' }
    ];

    const sort_options = [
      { value: 'amount', label: 'Amount' },
      { value: 'due_date', label: 'Due date' },
      { value: 'issue_date', label: 'Issue date' },
      { value: 'status', label: 'Status' }
    ];

    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const date_presets = [
      {
        id: 'last_30_days',
        label: 'Last 30 days',
        range_start: this._formatDateISO(thirtyDaysAgo),
        range_end: this._formatDateISO(today)
      },
      {
        id: 'this_month',
        label: 'This month',
        range_start: this._formatDateISO(firstOfMonth),
        range_end: this._formatDateISO(today)
      }
    ];

    return {
      locations: locationsList,
      utility_types,
      invoice_statuses,
      sort_options,
      date_presets
    };
  }

  // 3. getInvoicesList
  getInvoicesList(locationId, utilityType, status, dateRangeStart, dateRangeEnd, sortBy, sortDirection, page, pageSize) {
    const invoices = this._getFromStorage('invoices', []);
    const accounts = this._getFromStorage('utility_accounts', []);
    const locations = this._getFromStorage('locations', []);

    const pageNum = page || 1;
    const size = pageSize || 25;

    let accountIdsByLocation = null;
    if (locationId) {
      accountIdsByLocation = accounts.filter((a) => a.location_id === locationId).map((a) => a.id);
    }

    let filtered = invoices.filter((inv) => {
      if (locationId && accountIdsByLocation.indexOf(inv.account_id) === -1) return false;
      if (utilityType && inv.utility_type !== utilityType) return false;
      if (status && inv.status !== status) return false;
      if (dateRangeStart || dateRangeEnd) {
        if (!this._dateInRange(inv.due_date, dateRangeStart, dateRangeEnd)) return false;
      }
      return true;
    });

    const sBy = sortBy || 'due_date';
    const sDir = (sortDirection || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

    filtered.sort((a, b) => {
      let av;
      let bv;
      if (sBy === 'amount') {
        av = a.total_amount || 0;
        bv = b.total_amount || 0;
      } else if (sBy === 'issue_date') {
        av = this._parseDate(a.issue_date) || new Date(0);
        bv = this._parseDate(b.issue_date) || new Date(0);
      } else if (sBy === 'status') {
        av = a.status || '';
        bv = b.status || '';
      } else {
        av = this._parseDate(a.due_date) || new Date(0);
        bv = this._parseDate(b.due_date) || new Date(0);
      }
      if (av < bv) return sDir === 'asc' ? -1 : 1;
      if (av > bv) return sDir === 'asc' ? 1 : -1;
      return 0;
    });

    const startIndex = (pageNum - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    let items = pageItems.map((inv) => {
      const account = accounts.find((a) => a.id === inv.account_id) || null;
      const location = account ? locations.find((l) => l.id === account.location_id) || null : null;
      return {
        invoice_id: inv.id,
        invoice_number: inv.invoice_number,
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        status: inv.status,
        total_amount: inv.total_amount,
        amount_paid: inv.amount_paid,
        remaining_balance: inv.remaining_balance,
        currency: inv.currency || 'usd',
        utility_type: inv.utility_type,
        account_id: account ? account.id : null,
        account_display_name: account ? account.display_name : null,
        location_id: location ? location.id : null,
        location_name: location ? location.name : null
      };
    });

    items = this._attachForeignKeys(items, {
      invoice_id: 'invoices',
      account_id: 'utility_accounts',
      location_id: 'locations'
    });

    return {
      items,
      total_count: filtered.length
    };
  }

  // 4. getInvoiceDetails
  getInvoiceDetails(invoiceId) {
    const invoices = this._getFromStorage('invoices', []);
    const accounts = this._getFromStorage('utility_accounts', []);
    const locations = this._getFromStorage('locations', []);
    const paymentsAll = this._getFromStorage('payments', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);

    const invoice = invoices.find((inv) => inv.id === invoiceId) || null;
    if (!invoice) {
      return {
        invoice: null,
        account: null,
        location: null,
        line_items: [],
        payments: []
      };
    }

    const account = accounts.find((a) => a.id === invoice.account_id) || null;
    const location = account ? locations.find((l) => l.id === account.location_id) || null : null;

    const invoiceObj = {
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      account_id: invoice.account_id,
      utility_type: invoice.utility_type,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      status: invoice.status,
      total_amount: invoice.total_amount,
      amount_paid: invoice.amount_paid,
      remaining_balance: invoice.remaining_balance,
      currency: invoice.currency || 'usd'
    };

    const accountObj = account
      ? {
          id: account.id,
          account_number: account.account_number,
          display_name: account.display_name,
          utility_type: account.utility_type
        }
      : null;

    const locationObj = location
      ? {
          id: location.id,
          name: location.name,
          city: location.city,
          state: location.state
        }
      : null;

    // No line items model defined -> return empty array
    const line_items = [];

    const payments = paymentsAll
      .filter((p) => p.invoice_id === invoice.id)
      .map((p) => {
        const pm = paymentMethods.find((m) => m.id === p.payment_method_id) || null;
        return {
          payment_id: p.id,
          payment_date: p.payment_date,
          amount: p.amount,
          currency: p.currency || 'usd',
          status: p.status,
          is_autopay: p.is_autopay,
          payment_method_label: pm ? pm.label : null
        };
      });

    return {
      invoice: invoiceObj,
      account: accountObj,
      location: locationObj,
      line_items,
      payments
    };
  }

  // 5. getInvoicePaymentOptions
  getInvoicePaymentOptions(invoiceId) {
    const invoices = this._getFromStorage('invoices', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);

    const invoice = invoices.find((inv) => inv.id === invoiceId) || null;
    if (!invoice) {
      return {
        invoice_summary: null,
        default_amount: 0,
        allow_partial_payment: false,
        payment_methods: []
      };
    }

    const invoice_summary = {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      due_date: invoice.due_date,
      remaining_balance: invoice.remaining_balance,
      currency: invoice.currency || 'usd',
      status: invoice.status
    };

    const payment_methods = paymentMethods.map((pm) => ({
      id: pm.id,
      label: pm.label,
      type: pm.type,
      last4: pm.last4,
      brand: pm.brand,
      bank_name: pm.bank_name,
      expiry_month: pm.expiry_month,
      expiry_year: pm.expiry_year,
      is_default: pm.is_default
    }));

    return {
      invoice_summary,
      default_amount: invoice.remaining_balance,
      allow_partial_payment: true,
      payment_methods
    };
  }

  // 6. submitInvoicePayment
  submitInvoicePayment(invoiceId, paymentMethodId, amount, payFullBalance) {
    const invoices = this._getFromStorage('invoices', []);
    const accounts = this._getFromStorage('utility_accounts', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);
    const payments = this._getFromStorage('payments', []);

    const invoice = invoices.find((inv) => inv.id === invoiceId) || null;
    if (!invoice) {
      return { success: false, message: 'Invoice not found', payment: null, updated_invoice: null };
    }

    const account = accounts.find((a) => a.id === invoice.account_id) || null;

    const paymentMethod = paymentMethods.find((pm) => pm.id === paymentMethodId) || null;
    if (!paymentMethod) {
      return { success: false, message: 'Payment method not found', payment: null, updated_invoice: null };
    }

    const fullBalance = typeof payFullBalance === 'undefined' ? true : !!payFullBalance;
    let payAmount;
    if (fullBalance || amount == null) {
      payAmount = invoice.remaining_balance;
    } else {
      payAmount = Number(amount);
    }

    if (payAmount <= 0 || payAmount > invoice.remaining_balance) {
      return { success: false, message: 'Invalid payment amount', payment: null, updated_invoice: null };
    }

    const now = new Date();
    const payment = {
      id: this._generateId('pay'),
      invoice_id: invoice.id,
      account_id: invoice.account_id,
      payment_method_id: paymentMethod.id,
      amount: payAmount,
      currency: invoice.currency || 'usd',
      payment_date: this._formatDateISO(now),
      status: 'completed',
      is_autopay: false,
      created_at: this._formatDateISO(now)
    };

    payments.push(payment);

    invoice.amount_paid = (invoice.amount_paid || 0) + payAmount;
    invoice.remaining_balance = Math.max(0, (invoice.total_amount || 0) - (invoice.amount_paid || 0));
    if (invoice.remaining_balance === 0) {
      invoice.status = 'paid';
    } else {
      invoice.status = 'partially_paid';
    }
    invoice.updated_at = this._formatDateISO(now);

    if (account) {
      account.current_balance = Math.max(0, (account.current_balance || 0) - payAmount);
      account.updated_at = this._formatDateISO(now);
    }

    this._saveToStorage('payments', payments);
    this._saveToStorage('invoices', invoices);
    this._saveToStorage('utility_accounts', accounts);

    const updated_invoice = {
      id: invoice.id,
      status: invoice.status,
      amount_paid: invoice.amount_paid,
      remaining_balance: invoice.remaining_balance
    };

    return {
      success: true,
      message: 'Payment submitted successfully',
      payment,
      updated_invoice
    };
  }

  // 7. exportInvoicesList
  exportInvoicesList(locationId, utilityType, status, dateRangeStart, dateRangeEnd, format) {
    const exportId = this._generateId('invexp');
    const now = new Date();
    const fileExt = format || 'csv';
    const fileName = 'invoices_export_' + exportId + '.' + fileExt;
    const downloadUrl = '/downloads/invoices/' + fileName;

    const exports = this._getFromStorage('invoice_exports', []);
    exports.push({
      id: exportId,
      created_at: this._formatDateISO(now),
      params: {
        locationId,
        utilityType,
        status,
        dateRangeStart,
        dateRangeEnd,
        format: fileExt
      },
      status: 'completed',
      file_name: fileName,
      download_url: downloadUrl
    });
    this._saveToStorage('invoice_exports', exports);

    return {
      export_id: exportId,
      status: 'completed',
      file_name: fileName,
      download_url: downloadUrl
    };
  }

  // 8. getAccountsOverview
  getAccountsOverview(locationId, utilityType, status, searchTerm, page, pageSize) {
    const accounts = this._getFromStorage('utility_accounts', []);
    const locations = this._getFromStorage('locations', []);

    const pageNum = page || 1;
    const size = pageSize || 25;
    const term = searchTerm ? String(searchTerm).toLowerCase() : null;

    let filtered = accounts.filter((a) => {
      if (locationId && a.location_id !== locationId) return false;
      if (utilityType && a.utility_type !== utilityType) return false;
      if (status && a.status !== status) return false;
      if (term) {
        const loc = locations.find((l) => l.id === a.location_id) || null;
        const haystack = [a.account_number, a.display_name, loc ? loc.name : '']
          .join(' ')
          .toLowerCase();
        if (haystack.indexOf(term) === -1) return false;
      }
      return true;
    });

    const startIndex = (pageNum - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    let items = pageItems.map((a) => {
      const loc = locations.find((l) => l.id === a.location_id) || null;
      return {
        account_id: a.id,
        account_number: a.account_number,
        account_display_name: a.display_name,
        utility_type: a.utility_type,
        status: a.status,
        current_balance: a.current_balance,
        currency: 'usd',
        location_id: loc ? loc.id : null,
        location_name: loc ? loc.name : null,
        billing_contact_email: a.billing_contact_email || null,
        billing_contact_phone: a.billing_contact_phone || null,
        billing_delivery_method: a.billing_delivery_method
      };
    });

    items = this._attachForeignKeys(items, {
      location_id: 'locations'
    });

    return {
      items,
      total_count: filtered.length
    };
  }

  // 9. getPlanFilterOptions
  getPlanFilterOptions() {
    const utility_types = [
      { value: 'electricity', label: 'Electricity' },
      { value: 'gas', label: 'Gas' }
    ];

    const plan_types = [
      { value: 'fixed_rate', label: 'Fixed rate' },
      { value: 'variable_rate', label: 'Variable rate' },
      { value: 'time_of_use', label: 'Time-of-use' }
    ];

    const contract_length_ranges = [
      { id: '0_12_months', label: '0–12 months', min_months: 0, max_months: 12 },
      { id: '12_36_months', label: '12–36 months', min_months: 12, max_months: 36 },
      { id: '36_plus_months', label: '36+ months', min_months: 36, max_months: 120 }
    ];

    const sort_options = [
      { value: 'estimated_monthly_cost', label: 'Estimated monthly cost' },
      { value: 'contract_length_months', label: 'Contract length (months)' }
    ];

    return {
      utility_types,
      plan_types,
      contract_length_ranges,
      sort_options
    };
  }

  // 10. getAvailablePlansForLocation
  getAvailablePlansForLocation(locationId, utilityType, contractLengthRangeId, planType, sortBy, sortDirection) {
    const plans = this._getFromStorage('plans', []);

    let range = null;
    if (contractLengthRangeId) {
      if (contractLengthRangeId === '0_12_months') {
        range = { min: 0, max: 12 };
      } else if (contractLengthRangeId === '12_36_months') {
        range = { min: 12, max: 36 };
      } else if (contractLengthRangeId === '36_plus_months') {
        range = { min: 36, max: 120 };
      }
    }

    let filtered = plans.filter((p) => {
      if (!p.is_active) return false;
      if (utilityType && p.utility_type !== utilityType) return false;
      if (planType && p.plan_type !== planType) return false;
      if (range) {
        if (p.contract_length_months < range.min || p.contract_length_months > range.max) return false;
      }
      return true;
    });

    const sBy = sortBy || 'estimated_monthly_cost';
    const sDir = (sortDirection || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

    filtered.sort((a, b) => {
      let av;
      let bv;
      if (sBy === 'contract_length_months') {
        av = a.contract_length_months;
        bv = b.contract_length_months;
      } else {
        av = a.estimated_monthly_cost;
        bv = b.estimated_monthly_cost;
      }
      if (av < bv) return sDir === 'asc' ? -1 : 1;
      if (av > bv) return sDir === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered.map((p) => ({
      plan_id: p.id,
      name: p.name,
      utility_type: p.utility_type,
      plan_type: p.plan_type,
      contract_length_months: p.contract_length_months,
      estimated_monthly_cost: p.estimated_monthly_cost,
      rate_per_unit: p.rate_per_unit,
      currency: p.currency || 'usd',
      description: p.description,
      is_active: p.is_active
    }));
  }

  // 11. getPlansPageContext
  getPlansPageContext(locationId, utilityType) {
    const locations = this._getFromStorage('locations', []);
    const accounts = this._getFromStorage('utility_accounts', []);
    const plans = this._getFromStorage('plans', []);
    const planChanges = this._getFromStorage('plan_change_requests', []);

    const location = locations.find((l) => l.id === locationId) || null;

    const accountsForLocation = accounts.filter((a) => a.location_id === locationId && a.utility_type === utilityType);

    const accountsContext = accountsForLocation.map((a) => {
      const currentPlan = plans.find((p) => p.id === a.current_plan_id) || null;
      const pending = planChanges.filter(
        (pc) => pc.account_id === a.id && (pc.status === 'pending' || pc.status === 'scheduled')
      );
      return {
        account_id: a.id,
        account_display_name: a.display_name,
        status: a.status,
        current_plan: currentPlan
          ? {
              plan_id: currentPlan.id,
              name: currentPlan.name,
              plan_type: currentPlan.plan_type,
              contract_length_months: currentPlan.contract_length_months,
              estimated_monthly_cost: currentPlan.estimated_monthly_cost
            }
          : null,
        pending_plan_changes: pending.map((pc) => ({
          id: pc.id,
          new_plan_id: pc.new_plan_id,
          requested_at: pc.requested_at,
          effective_date: pc.effective_date,
          status: pc.status
        }))
      };
    });

    return {
      location: location
        ? {
            id: location.id,
            name: location.name,
            city: location.city,
            state: location.state
          }
        : null,
      utility_type: utilityType,
      accounts: accountsContext
    };
  }

  // 12. submitPlanChangeRequest
  submitPlanChangeRequest(accountId, newPlanId, effectiveDateOption, effectiveDateOverride) {
    const accounts = this._getFromStorage('utility_accounts', []);
    const plans = this._getFromStorage('plans', []);
    const planChanges = this._getFromStorage('plan_change_requests', []);

    const account = accounts.find((a) => a.id === accountId) || null;
    if (!account) {
      return { success: false, message: 'Account not found', plan_change_request: null };
    }

    const plan = plans.find((p) => p.id === newPlanId) || null;
    if (!plan) {
      return { success: false, message: 'Plan not found', plan_change_request: null };
    }

    const now = new Date();
    let effectiveDate;
    if (effectiveDateOption === 'first_of_next_month') {
      const y = now.getFullYear();
      const m = now.getMonth();
      effectiveDate = new Date(y, m + 1, 1);
    } else if (effectiveDateOption === 'specific_date' && effectiveDateOverride) {
      effectiveDate = this._parseDate(effectiveDateOverride) || now;
    } else {
      effectiveDate = now;
    }

    const req = {
      id: this._generateId('plchg'),
      account_id: account.id,
      old_plan_id: account.current_plan_id || null,
      new_plan_id: plan.id,
      requested_at: this._formatDateISO(now),
      effective_date: this._formatDateISO(effectiveDate),
      status: 'scheduled',
      created_at: this._formatDateISO(now),
      updated_at: this._formatDateISO(now)
    };

    planChanges.push(req);
    this._saveToStorage('plan_change_requests', planChanges);

    return {
      success: true,
      message: 'Plan change request submitted',
      plan_change_request: req
    };
  }

  // 13. getPlanChangeRequestsForAccount
  getPlanChangeRequestsForAccount(accountId) {
    const planChanges = this._getFromStorage('plan_change_requests', []);
    const plans = this._getFromStorage('plans', []);

    let items = planChanges.filter((pc) => pc.account_id === accountId);

    items = items.map((pc) => ({
      id: pc.id,
      account_id: pc.account_id,
      old_plan_id: pc.old_plan_id,
      new_plan_id: pc.new_plan_id,
      requested_at: pc.requested_at,
      effective_date: pc.effective_date,
      status: pc.status
    }));

    items = this._attachForeignKeys(items, {
      new_plan_id: 'plans',
      account_id: 'utility_accounts'
    });

    return items;
  }

  // 14. getAlertOptions
  getAlertOptions() {
    const alert_types = [
      { value: 'daily_usage_exceeds', label: 'Daily usage exceeds' },
      { value: 'cost_exceeds', label: 'Cost exceeds' },
      { value: 'invoice_overdue', label: 'Invoice overdue' },
      { value: 'balance_exceeds', label: 'Balance exceeds' }
    ];

    const delivery_channels = [
      { value: 'email', label: 'Email' },
      { value: 'sms', label: 'SMS' }
    ];

    const schedule_types = [
      { value: 'every_day', label: 'Every day (Mon–Sun)' },
      { value: 'weekdays_only', label: 'Weekdays only (Mon–Fri)' },
      { value: 'custom_days', label: 'Custom days' }
    ];

    const days_of_week = [
      { value: 'mon', label: 'Monday' },
      { value: 'tue', label: 'Tuesday' },
      { value: 'wed', label: 'Wednesday' },
      { value: 'thu', label: 'Thursday' },
      { value: 'fri', label: 'Friday' },
      { value: 'sat', label: 'Saturday' },
      { value: 'sun', label: 'Sunday' }
    ];

    return {
      alert_types,
      delivery_channels,
      schedule_types,
      days_of_week
    };
  }

  // 15. getAlertsList
  getAlertsList(locationId, accountId, utilityType, activeState, alertType) {
    const alerts = this._getFromStorage('alerts', []);
    const locations = this._getFromStorage('locations', []);
    const accounts = this._getFromStorage('utility_accounts', []);

    let filtered = alerts.filter((a) => {
      if (locationId && a.location_id !== locationId) return false;
      if (accountId && a.account_id !== accountId) return false;
      if (utilityType && a.utility_type !== utilityType) return false;
      if (alertType && a.alert_type !== alertType) return false;
      if (activeState === 'active' && !a.is_active) return false;
      if (activeState === 'inactive' && a.is_active) return false;
      return true;
    });

    let items = filtered.map((a) => {
      const loc = a.location_id ? locations.find((l) => l.id === a.location_id) || null : null;
      const acc = a.account_id ? accounts.find((u) => u.id === a.account_id) || null : null;
      return {
        alert_id: a.id,
        location_id: a.location_id || null,
        location_name: loc ? loc.name : null,
        account_id: a.account_id || null,
        account_display_name: acc ? acc.display_name : null,
        utility_type: a.utility_type,
        alert_type: a.alert_type,
        threshold_value: a.threshold_value,
        threshold_unit: a.threshold_unit,
        delivery_channels: a.delivery_channels || [],
        schedule_type: a.schedule_type,
        active_days: a.active_days || [],
        is_active: a.is_active
      };
    });

    items = this._attachForeignKeys(items, {
      location_id: 'locations',
      account_id: 'utility_accounts'
    });

    return {
      items,
      total_count: filtered.length
    };
  }

  // 16. createAlert
  createAlert(locationId, accountId, utilityType, alertType, thresholdValue, thresholdUnit, deliveryChannels, scheduleType, activeDays, isActive) {
    const alerts = this._getFromStorage('alerts', []);
    const now = new Date();

    const activeFlag = typeof isActive === 'undefined' ? true : !!isActive;

    const alert = {
      id: this._generateId('alt'),
      location_id: locationId || null,
      account_id: accountId || null,
      utility_type: utilityType,
      alert_type: alertType,
      threshold_value: thresholdValue,
      threshold_unit: thresholdUnit || null,
      delivery_channels: deliveryChannels || [],
      schedule_type: scheduleType,
      active_days: scheduleType === 'custom_days' ? activeDays || [] : [],
      is_active: activeFlag,
      created_at: this._formatDateISO(now),
      updated_at: this._formatDateISO(now)
    };

    alerts.push(alert);
    this._saveToStorage('alerts', alerts);

    return {
      success: true,
      message: 'Alert created',
      alert
    };
  }

  // 17. updateAlert
  updateAlert(alertId, updates) {
    const alerts = this._getFromStorage('alerts', []);
    const alert = alerts.find((a) => a.id === alertId) || null;
    if (!alert) {
      return { success: false, message: 'Alert not found', alert: null };
    }

    if (updates.hasOwnProperty('thresholdValue')) alert.threshold_value = updates.thresholdValue;
    if (updates.hasOwnProperty('thresholdUnit')) alert.threshold_unit = updates.thresholdUnit;
    if (updates.hasOwnProperty('deliveryChannels')) alert.delivery_channels = updates.deliveryChannels;
    if (updates.hasOwnProperty('scheduleType')) alert.schedule_type = updates.scheduleType;
    if (updates.hasOwnProperty('activeDays')) alert.active_days = updates.activeDays;
    if (updates.hasOwnProperty('isActive')) alert.is_active = updates.isActive;

    alert.updated_at = this._formatDateISO(new Date());
    this._saveToStorage('alerts', alerts);

    return {
      success: true,
      message: 'Alert updated',
      alert: {
        id: alert.id,
        is_active: alert.is_active
      }
    };
  }

  // 18. deleteAlert
  deleteAlert(alertId) {
    let alerts = this._getFromStorage('alerts', []);
    const lenBefore = alerts.length;
    alerts = alerts.filter((a) => a.id !== alertId);
    this._saveToStorage('alerts', alerts);

    const deleted = lenBefore !== alerts.length;
    return {
      success: deleted,
      message: deleted ? 'Alert deleted' : 'Alert not found'
    };
  }

  // 19. getLocationsList
  getLocationsList(searchTerm, status, city, state, page, pageSize) {
    const locations = this._getFromStorage('locations', []);
    const accounts = this._getFromStorage('utility_accounts', []);

    const pageNum = page || 1;
    const size = pageSize || 25;
    const term = searchTerm ? String(searchTerm).toLowerCase() : null;

    let filtered = locations.filter((l) => {
      if (status && l.status !== status) return false;
      if (city && l.city !== city) return false;
      if (state && l.state !== state) return false;
      if (term) {
        const haystack = [l.name, l.city].join(' ').toLowerCase();
        if (haystack.indexOf(term) === -1) return false;
      }
      return true;
    });

    const startIndex = (pageNum - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const items = pageItems.map((l) => {
      const locAccounts = accounts.filter((a) => a.location_id === l.id);
      const primary_accounts = locAccounts.map((a) => ({
        account_id: a.id,
        display_name: a.display_name,
        utility_type: a.utility_type,
        status: a.status
      }));
      return {
        location_id: l.id,
        name: l.name,
        status: l.status,
        address_line1: l.address_line1,
        city: l.city,
        state: l.state,
        postal_code: l.postal_code,
        primary_accounts,
        linked_accounts_count: locAccounts.length
      };
    });

    return {
      items,
      total_count: filtered.length
    };
  }

  // 20. getLocationFormDefaults
  getLocationFormDefaults() {
    const states = [
      { value: 'illinois', label: 'Illinois' },
      { value: 'california', label: 'California' },
      { value: 'new_york', label: 'New York' },
      { value: 'texas', label: 'Texas' }
    ];

    const countries = [
      { value: 'united_states', label: 'United States' }
    ];

    return {
      states,
      countries
    };
  }

  // 21. createLocationAndLinkAccounts
  createLocationAndLinkAccounts(locationDetails, linkedAccountIds) {
    const locations = this._getFromStorage('locations', []);
    const accounts = this._getFromStorage('utility_accounts', []);

    const now = new Date();

    const loc = {
      id: this._generateId('loc'),
      name: locationDetails.name,
      status: 'active',
      address_line1: locationDetails.address_line1,
      address_line2: locationDetails.address_line2 || '',
      city: locationDetails.city,
      state: locationDetails.state,
      postal_code: locationDetails.postal_code,
      country: locationDetails.country,
      created_at: this._formatDateISO(now),
      updated_at: this._formatDateISO(now)
    };

    locations.push(loc);

    const linkedIds = Array.isArray(linkedAccountIds) ? linkedAccountIds : [];
    const linked_accounts = [];

    for (let i = 0; i < accounts.length; i++) {
      const a = accounts[i];
      if (linkedIds.indexOf(a.id) !== -1) {
        a.location_id = loc.id;
        a.updated_at = this._formatDateISO(now);
        linked_accounts.push({
          account_id: a.id,
          display_name: a.display_name,
          utility_type: a.utility_type
        });
      }
    }

    this._saveToStorage('locations', locations);
    this._saveToStorage('utility_accounts', accounts);

    return {
      success: true,
      message: 'Location created and accounts linked',
      location: {
        id: loc.id,
        name: loc.name,
        city: loc.city,
        state: loc.state
      },
      linked_accounts
    };
  }

  // 22. searchUtilityAccountsForLinking
  searchUtilityAccountsForLinking(query, utilityType, status) {
    const accounts = this._getFromStorage('utility_accounts', []);
    const locations = this._getFromStorage('locations', []);

    const term = query ? String(query).toLowerCase() : '';

    const results = accounts
      .filter((a) => {
        if (utilityType && a.utility_type !== utilityType) return false;
        if (status && a.status !== status) return false;
        if (term) {
          const haystack = [a.account_number, a.display_name].join(' ').toLowerCase();
          if (haystack.indexOf(term) === -1) return false;
        }
        return true;
      })
      .map((a) => {
        const loc = locations.find((l) => l.id === a.location_id) || null;
        return {
          account_id: a.id,
          account_number: a.account_number,
          display_name: a.display_name,
          utility_type: a.utility_type,
          status: a.status,
          location_id: loc ? loc.id : null,
          location_name: loc ? loc.name : null
        };
      });

    return results;
  }

  // 23. getLocationOverview
  getLocationOverview(locationId) {
    const locations = this._getFromStorage('locations', []);
    const accounts = this._getFromStorage('utility_accounts', []);
    const plans = this._getFromStorage('plans', []);
    const costRecords = this._getFromStorage('cost_analytics_records', []);

    const loc = locations.find((l) => l.id === locationId) || null;
    if (!loc) {
      return {
        location: null,
        utility_accounts: [],
        cost_summary: []
      };
    }

    const locAccounts = accounts.filter((a) => a.location_id === loc.id);

    const utility_accounts = locAccounts.map((a) => {
      const plan = plans.find((p) => p.id === a.current_plan_id) || null;
      return {
        account_id: a.id,
        account_number: a.account_number,
        display_name: a.display_name,
        utility_type: a.utility_type,
        status: a.status,
        current_balance: a.current_balance,
        billing_delivery_method: a.billing_delivery_method,
        current_plan: plan
          ? {
              plan_id: plan.id,
              name: plan.name,
              plan_type: plan.plan_type,
              contract_length_months: plan.contract_length_months,
              estimated_monthly_cost: plan.estimated_monthly_cost
            }
          : null
      };
    });

    const cost_summary = costRecords
      .filter((r) => r.location_id === loc.id)
      .map((r) => ({
        utility_type: r.utility_type,
        period_start: r.period_start,
        period_end: r.period_end,
        total_cost: r.total_cost,
        currency: r.currency || 'usd'
      }));

    return {
      location: {
        id: loc.id,
        name: loc.name,
        status: loc.status,
        address_line1: loc.address_line1,
        city: loc.city,
        state: loc.state,
        postal_code: loc.postal_code,
        country: loc.country
      },
      utility_accounts,
      cost_summary
    };
  }

  // 24. getLocationNotes
  getLocationNotes(locationId) {
    const notes = this._getFromStorage('location_notes', []);

    const items = notes
      .filter((n) => n.location_id === locationId)
      .sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      })
      .map((n) => ({
        note_id: n.id,
        note_text: n.note_text,
        note_type: n.note_type,
        created_at: n.created_at,
        updated_at: n.updated_at || null
      }));

    return items;
  }

  // 25. addLocationNote
  addLocationNote(locationId, noteText, noteType) {
    const notes = this._getFromStorage('location_notes', []);
    const now = new Date();

    const note = {
      id: this._generateId('lnote'),
      location_id: locationId,
      note_text: noteText,
      note_type: noteType,
      created_at: this._formatDateISO(now),
      updated_at: null
    };

    notes.push(note);
    this._saveToStorage('location_notes', notes);

    return {
      success: true,
      message: 'Note added',
      note: {
        note_id: note.id,
        note_text: note.note_text,
        note_type: note.note_type,
        created_at: note.created_at
      }
    };
  }

  // 26. getUsageReportFilterOptions
  getUsageReportFilterOptions() {
    const accounts = this._getFromStorage('utility_accounts', []);
    const locations = this._getFromStorage('locations', []);

    const accountsList = accounts.map((a) => {
      const loc = locations.find((l) => l.id === a.location_id) || null;
      return {
        id: a.id,
        display_name: a.display_name,
        account_number: a.account_number,
        utility_type: a.utility_type,
        location_name: loc ? loc.name : null
      };
    });

    const locationsList = locations.map((l) => ({ id: l.id, name: l.name }));

    const utility_types = [
      { value: 'electricity', label: 'Electricity' },
      { value: 'gas', label: 'Gas' }
    ];

    const aggregation_levels = [
      { value: 'daily', label: 'Daily' },
      { value: 'monthly_summary', label: 'Monthly summary' }
    ];

    const formats = [
      { value: 'csv', label: 'CSV' },
      { value: 'xlsx', label: 'Excel (.xlsx)' },
      { value: 'pdf', label: 'PDF' }
    ];

    return {
      accounts: accountsList,
      locations: locationsList,
      utility_types,
      aggregation_levels,
      formats
    };
  }

  // 27. generateUsageReport
  generateUsageReport(accountId, locationId, utilityType, dateRangeStart, dateRangeEnd, aggregationLevel, format) {
    const reports = this._getFromStorage('usage_reports', []);
    const now = new Date();

    const id = this._generateId('urep');
    const safeFormat = format || 'csv';

    const fileNameParts = [];
    if (utilityType) fileNameParts.push(utilityType);
    if (accountId) fileNameParts.push('account-' + accountId);
    if (locationId) fileNameParts.push('location-' + locationId);
    fileNameParts.push(dateRangeStart || 'start');
    fileNameParts.push(dateRangeEnd || 'end');
    const fileName = fileNameParts.join('_') + '.' + safeFormat;
    const downloadUrl = '/downloads/usage_reports/' + fileName;

    const report = {
      id,
      account_id: accountId || null,
      location_id: locationId || null,
      utility_type: utilityType || null,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
      aggregation_level: aggregationLevel,
      format: safeFormat,
      status: 'completed',
      file_name: fileName,
      download_url: downloadUrl,
      created_at: this._formatDateISO(now),
      completed_at: this._formatDateISO(now)
    };

    reports.push(report);
    this._saveToStorage('usage_reports', reports);

    return {
      report
    };
  }

  // 28. getUsageReportsList
  getUsageReportsList(accountId, locationId, utilityType, status) {
    const reports = this._getFromStorage('usage_reports', []);

    const items = reports.filter((r) => {
      if (accountId && r.account_id !== accountId) return false;
      if (locationId && r.location_id !== locationId) return false;
      if (utilityType && r.utility_type !== utilityType) return false;
      if (status && r.status !== status) return false;
      return true;
    });

    return {
      items: items.map((r) => ({
        id: r.id,
        account_id: r.account_id,
        location_id: r.location_id,
        utility_type: r.utility_type,
        date_range_start: r.date_range_start,
        date_range_end: r.date_range_end,
        aggregation_level: r.aggregation_level,
        format: r.format,
        status: r.status,
        file_name: r.file_name,
        download_url: r.download_url,
        created_at: r.created_at,
        completed_at: r.completed_at
      })),
      total_count: items.length
    };
  }

  // 29. getCompanyBillingContact
  getCompanyBillingContact() {
    const contacts = this._getFromStorage('company_billing_contacts', []);
    const contact = contacts.length > 0 ? contacts[0] : null;
    return {
      company_billing_contact: contact
        ? {
            id: contact.id,
            name: contact.name || null,
            email: contact.email,
            phone: contact.phone,
            created_at: contact.created_at,
            updated_at: contact.updated_at
          }
        : null
    };
  }

  // 30. updateCompanyBillingContact
  updateCompanyBillingContact(email, phone, applyToAllAccounts) {
    const contacts = this._getFromStorage('company_billing_contacts', []);
    const now = new Date();
    let contact;

    if (contacts.length > 0) {
      contact = contacts[0];
      contact.email = email;
      contact.phone = phone;
      contact.updated_at = this._formatDateISO(now);
    } else {
      contact = {
        id: this._generateId('cbc'),
        name: null,
        email,
        phone,
        created_at: this._formatDateISO(now),
        updated_at: this._formatDateISO(now)
      };
      contacts.push(contact);
    }

    this._saveToStorage('company_billing_contacts', contacts);

    let appliedCount = 0;
    const applyFlag = !!applyToAllAccounts;
    if (applyFlag) {
      appliedCount = this._applyCompanyContactToAccounts(email, phone);
    }

    return {
      success: true,
      message: 'Company billing contact updated',
      company_billing_contact: {
        id: contact.id,
        email: contact.email,
        phone: contact.phone
      },
      applied_to_accounts_count: appliedCount
    };
  }

  // 31. getBillingPreferences
  getBillingPreferences(utilityType, locationId, status) {
    const accounts = this._getFromStorage('utility_accounts', []);
    const locations = this._getFromStorage('locations', []);

    let filtered = accounts.filter((a) => {
      if (utilityType && a.utility_type !== utilityType) return false;
      if (locationId && a.location_id !== locationId) return false;
      if (status && a.status !== status) return false;
      return true;
    });

    let items = filtered.map((a) => {
      const loc = locations.find((l) => l.id === a.location_id) || null;
      return {
        account_id: a.id,
        account_display_name: a.display_name,
        account_number: a.account_number,
        utility_type: a.utility_type,
        status: a.status,
        location_id: loc ? loc.id : null,
        location_name: loc ? loc.name : null,
        billing_delivery_method: a.billing_delivery_method,
        billing_contact_email: a.billing_contact_email || null,
        billing_contact_phone: a.billing_contact_phone || null
      };
    });

    items = this._attachForeignKeys(items, {
      location_id: 'locations'
    });

    return {
      items,
      total_count: filtered.length
    };
  }

  // 32. updateBillingPreferencesForAccounts
  updateBillingPreferencesForAccounts(accountIds, deliveryMethod) {
    const accounts = this._getFromStorage('utility_accounts', []);
    const now = new Date();
    const ids = Array.isArray(accountIds) ? accountIds : [];

    let updatedCount = 0;
    for (let i = 0; i < accounts.length; i++) {
      const a = accounts[i];
      if (ids.indexOf(a.id) !== -1) {
        a.billing_delivery_method = deliveryMethod;
        a.updated_at = this._formatDateISO(now);
        updatedCount++;
      }
    }

    this._saveToStorage('utility_accounts', accounts);

    return {
      success: true,
      message: 'Billing preferences updated',
      updated_accounts_count: updatedCount
    };
  }

  // 33. getAutopayRuleOptions
  getAutopayRuleOptions() {
    const paymentMethods = this._getFromStorage('payment_methods', []);

    const utility_types = [
      { value: 'electricity', label: 'Electricity' },
      { value: 'gas', label: 'Gas' }
    ];

    const condition_metrics = [
      { value: 'invoice_total', label: 'Invoice total' },
      { value: 'account_balance', label: 'Account balance' }
    ];

    const comparators = [
      { value: 'less_than', label: 'Less than' },
      { value: 'less_than_or_equal_to', label: 'Less than or equal to' },
      { value: 'equal_to', label: 'Equal to' },
      { value: 'greater_than_or_equal_to', label: 'Greater than or equal to' },
      { value: 'greater_than', label: 'Greater than' }
    ];

    const timing_options = [
      { value: 'on_due_date', label: 'On due date' },
      { value: 'days_before_due_date', label: 'Days before due date' },
      { value: 'days_after_due_date', label: 'Days after due date' }
    ];

    const payment_methods = paymentMethods.map((pm) => ({
      id: pm.id,
      label: pm.label,
      type: pm.type,
      last4: pm.last4,
      brand: pm.brand,
      bank_name: pm.bank_name,
      is_default: pm.is_default
    }));

    return {
      utility_types,
      condition_metrics,
      comparators,
      timing_options,
      payment_methods
    };
  }

  // 34. getAutopayRulesList
  getAutopayRulesList(utilityType, isActive) {
    const rules = this._getFromStorage('autopay_rules', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);

    let filtered = rules.filter((r) => {
      if (utilityType && r.utility_type !== utilityType) return false;
      if (typeof isActive === 'boolean' && r.is_active !== isActive) return false;
      return true;
    });

    let items = filtered.map((r) => {
      const pm = paymentMethods.find((m) => m.id === r.payment_method_id) || null;
      return {
        autopay_rule_id: r.id,
        name: r.name || null,
        utility_type: r.utility_type,
        condition_metric: r.condition_metric,
        comparator: r.comparator,
        amount_threshold: r.amount_threshold,
        currency: r.currency || 'usd',
        timing_option: r.timing_option,
        timing_days_offset: r.timing_days_offset || null,
        payment_method_id: r.payment_method_id,
        payment_method_label: pm ? pm.label : null,
        is_active: r.is_active
      };
    });

    items = this._attachForeignKeys(items, {
      payment_method_id: 'payment_methods'
    });

    return {
      items,
      total_count: filtered.length
    };
  }

  // 35. createAutopayRule
  createAutopayRule(name, utilityType, conditionMetric, comparator, amountThreshold, timingOption, timingDaysOffset, paymentMethodId, isActive) {
    const rules = this._getFromStorage('autopay_rules', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);

    const pm = paymentMethods.find((m) => m.id === paymentMethodId) || null;
    if (!pm) {
      return { success: false, message: 'Payment method not found', autopay_rule: null };
    }

    const now = new Date();
    const rule = {
      id: this._generateId('apr'),
      name: name || null,
      utility_type: utilityType,
      condition_metric: conditionMetric,
      comparator: comparator,
      amount_threshold: amountThreshold,
      currency: 'usd',
      timing_option: timingOption,
      timing_days_offset: timingOption === 'on_due_date' ? null : timingDaysOffset || 0,
      payment_method_id: paymentMethodId,
      is_active: typeof isActive === 'undefined' ? true : !!isActive,
      created_at: this._formatDateISO(now),
      updated_at: this._formatDateISO(now)
    };

    rules.push(rule);
    this._saveToStorage('autopay_rules', rules);

    return {
      success: true,
      message: 'Autopay rule created',
      autopay_rule: rule
    };
  }

  // 36. updateAutopayRule
  updateAutopayRule(autopayRuleId, updates) {
    const rules = this._getFromStorage('autopay_rules', []);
    const rule = rules.find((r) => r.id === autopayRuleId) || null;
    if (!rule) {
      return { success: false, message: 'Autopay rule not found' };
    }

    if (updates.hasOwnProperty('name')) rule.name = updates.name;
    if (updates.hasOwnProperty('utilityType')) rule.utility_type = updates.utilityType;
    if (updates.hasOwnProperty('conditionMetric')) rule.condition_metric = updates.conditionMetric;
    if (updates.hasOwnProperty('comparator')) rule.comparator = updates.comparator;
    if (updates.hasOwnProperty('amountThreshold')) rule.amount_threshold = updates.amountThreshold;
    if (updates.hasOwnProperty('timingOption')) rule.timing_option = updates.timingOption;
    if (updates.hasOwnProperty('timingDaysOffset')) rule.timing_days_offset = updates.timingDaysOffset;
    if (updates.hasOwnProperty('paymentMethodId')) rule.payment_method_id = updates.paymentMethodId;
    if (updates.hasOwnProperty('isActive')) rule.is_active = updates.isActive;

    rule.updated_at = this._formatDateISO(new Date());
    this._saveToStorage('autopay_rules', rules);

    return {
      success: true,
      message: 'Autopay rule updated'
    };
  }

  // 37. deleteAutopayRule
  deleteAutopayRule(autopayRuleId) {
    let rules = this._getFromStorage('autopay_rules', []);
    const lenBefore = rules.length;
    rules = rules.filter((r) => r.id !== autopayRuleId);
    this._saveToStorage('autopay_rules', rules);

    const deleted = lenBefore !== rules.length;
    return {
      success: deleted,
      message: deleted ? 'Autopay rule deleted' : 'Autopay rule not found'
    };
  }

  // 38. getCostOverviewSummary
  getCostOverviewSummary(dateRangeStart, dateRangeEnd, utilityType, sortBy, sortDirection) {
    let items = this._aggregateCostsByLocationAndPeriod(dateRangeStart, dateRangeEnd, utilityType || null);

    const sBy = sortBy || 'total_cost';
    const sDir = (sortDirection || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    items.sort((a, b) => {
      let av;
      let bv;
      if (sBy === 'location_name') {
        av = a.location_name || '';
        bv = b.location_name || '';
      } else {
        av = a.total_cost || 0;
        bv = b.total_cost || 0;
      }
      if (av < bv) return sDir === 'asc' ? -1 : 1;
      if (av > bv) return sDir === 'asc' ? 1 : -1;
      return 0;
    });

    items = this._attachForeignKeys(items, {
      location_id: 'locations'
    });

    return {
      items,
      total_count: items.length
    };
  }

  // 39. exportCostOverview
  exportCostOverview(dateRangeStart, dateRangeEnd, utilityType, format) {
    const exports = this._getFromStorage('cost_overview_exports', []);
    const id = this._generateId('coexp');
    const now = new Date();
    const safeFormat = format || 'csv';
    const fileName = 'cost_overview_' + id + '.' + safeFormat;
    const downloadUrl = '/downloads/cost_overview/' + fileName;

    exports.push({
      id,
      date_range_start: dateRangeStart,
      date_range_end: dateRangeEnd,
      utility_type: utilityType || null,
      format: safeFormat,
      status: 'completed',
      file_name: fileName,
      download_url: downloadUrl,
      created_at: this._formatDateISO(now)
    });

    this._saveToStorage('cost_overview_exports', exports);

    return {
      export_id: id,
      status: 'completed',
      file_name: fileName,
      download_url: downloadUrl
    };
  }

  // 40. getAboutContent
  getAboutContent() {
    const title = 'About the Business Utility Management Portal';
    const body =
      'This portal helps businesses manage utility accounts, billing, payments, plans, and analytics in one place.';

    const sections = [
      {
        heading: 'Goals',
        body: 'Provide clear visibility into utility costs and usage across locations, and simplify bill management.'
      },
      {
        heading: 'Key Benefits',
        body: 'Centralized billing, automated payments, proactive alerts, and actionable cost analytics for every site.'
      },
      {
        heading: 'Features Overview',
        body:
          'Manage locations, link electricity and gas accounts, pay invoices, configure alerts, generate usage reports, and review cost trends over time.'
      }
    ];

    return {
      title,
      body,
      sections
    };
  }

  // 41. getHelpContent
  getHelpContent() {
    const faq_sections = [
      {
        title: 'Billing & Payments',
        questions: [
          {
            question: 'How do I pay an invoice?',
            answer:
              'Go to Billing → Invoices, filter for the invoice you want to pay, click Pay, choose a payment method, and submit.'
          },
          {
            question: 'How can I set up autopay?',
            answer:
              'Open Payments → Autopay Rules, click Add New Rule, define your conditions and timing, select a payment method, and save.'
          }
        ]
      },
      {
        title: 'Usage & Analytics',
        questions: [
          {
            question: 'Where can I see my highest-cost locations?',
            answer:
              'Open Analytics → Cost Overview, choose a date range and utility type, and sort the table by Total cost.'
          }
        ]
      }
    ];

    const task_guides = [
      {
        task_id: 'pay_invoice',
        title: 'Pay an invoice',
        steps: [
          'Open Billing → Invoices.',
          'Filter to find the invoice you want to pay.',
          'Click Pay next to the invoice.',
          'Choose a payment method and confirm the payment.'
        ]
      },
      {
        task_id: 'configure_usage_alert',
        title: 'Configure a usage alert',
        steps: [
          'Go to Alerts & Notifications.',
          'Select the location and utility type.',
          'Click New Alert and choose the alert conditions.',
          'Select delivery channels and schedule, then save.'
        ]
      }
    ];

    const support_contacts = {
      email: 'support@examplecorp.com',
      phone: '+1-555-0000',
      ticket_portal_url: 'https://support.examplecorp.com/portal'
    };

    return {
      faq_sections,
      task_guides,
      support_contacts
    };
  }

  // 42. getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const last_updated = '2025-01-01T00:00:00.000Z';
    const body =
      'We collect and process usage, billing, and account data solely for providing and improving the utility management portal. Data is stored securely and is not sold to third parties. For full details, please refer to your service agreement.';

    return {
      last_updated,
      body
    };
  }

  // 43. getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    const last_updated = '2025-01-01T00:00:00.000Z';
    const body =
      'By using this portal, you agree to comply with your organization’s service agreement, pay all invoices by their due dates, and keep account information accurate. The provider may update features and these terms from time to time; continued use constitutes acceptance of the updated terms.';

    return {
      last_updated,
      body
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