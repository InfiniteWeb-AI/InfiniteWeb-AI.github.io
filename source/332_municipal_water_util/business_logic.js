// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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
    const tables = [
      'accounts',
      'billing_statements',
      'payment_methods',
      'autopay_settings',
      'payments',
      'monthly_usage',
      'daily_usage',
      'service_requests',
      'deposit_options',
      'leak_reports',
      'rebate_programs',
      'rebate_applications',
      'notification_settings',
      'rate_plans',
      'rate_plan_changes',
      'events',
      'event_registrations',
      'outages',
      'outage_subscriptions',
      // auxiliary / content tables
      'contact_submissions',
      'faq_articles',
      'policy_sections',
      'geocoded_addresses'
    ];

    for (const key of tables) {
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
    if (data === null || data === undefined) {
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _getCurrentAccount() {
    const accounts = this._getFromStorage('accounts', []);
    if (!accounts.length) return null;
    // Single-user context: use first active account if possible
    const active = accounts.find(a => a.status === 'active');
    return active || accounts[0] || null;
  }

  _resolveAccountForeignKeys(account) {
    if (!account) return null;
    const ratePlans = this._getFromStorage('rate_plans', []);
    const currentRatePlan = account.current_rate_plan_id
      ? ratePlans.find(rp => rp.id === account.current_rate_plan_id) || null
      : null;
    return Object.assign({}, account, {
      currentRatePlan
    });
  }

  _resolveBillingStatementForeignKeys(statement) {
    if (!statement) return null;
    const accounts = this._getFromStorage('accounts', []);
    const ratePlans = this._getFromStorage('rate_plans', []);
    const account = statement.account_id
      ? accounts.find(a => a.id === statement.account_id) || null
      : null;
    const ratePlan = statement.rate_plan_id
      ? ratePlans.find(rp => rp.id === statement.rate_plan_id) || null
      : null;
    return Object.assign({}, statement, { account, ratePlan });
  }

  _resolvePaymentMethodForeignKeys(method) {
    if (!method) return null;
    const accounts = this._getFromStorage('accounts', []);
    const account = method.account_id
      ? accounts.find(a => a.id === method.account_id) || null
      : null;
    return Object.assign({}, method, { account });
  }

  _resolveAutoPaySettingForeignKeys(setting) {
    if (!setting) return null;
    const accounts = this._getFromStorage('accounts', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);
    const account = setting.account_id
      ? accounts.find(a => a.id === setting.account_id) || null
      : null;
    const paymentMethod = setting.payment_method_id
      ? paymentMethods.find(pm => pm.id === setting.payment_method_id) || null
      : null;
    return Object.assign({}, setting, { account, paymentMethod });
  }

  _resolvePaymentForeignKeys(payment) {
    if (!payment) return null;
    const accounts = this._getFromStorage('accounts', []);
    const billingStatements = this._getFromStorage('billing_statements', []);
    const paymentMethods = this._getFromStorage('payment_methods', []);
    const account = payment.account_id
      ? accounts.find(a => a.id === payment.account_id) || null
      : null;
    const billingStatement = payment.billing_statement_id
      ? billingStatements.find(b => b.id === payment.billing_statement_id) || null
      : null;
    const paymentMethod = payment.payment_method_id
      ? paymentMethods.find(pm => pm.id === payment.payment_method_id) || null
      : null;
    return Object.assign({}, payment, { account, billingStatement, paymentMethod });
  }

  _resolveMonthlyUsageForeignKeys(mu) {
    if (!mu) return null;
    const accounts = this._getFromStorage('accounts', []);
    const billingStatements = this._getFromStorage('billing_statements', []);
    const account = mu.account_id
      ? accounts.find(a => a.id === mu.account_id) || null
      : null;
    const billingStatement = mu.billing_statement_id
      ? billingStatements.find(b => b.id === mu.billing_statement_id) || null
      : null;
    return Object.assign({}, mu, { account, billingStatement });
  }

  _resolveDailyUsageForeignKeys(du) {
    if (!du) return null;
    const monthlyUsage = this._getFromStorage('monthly_usage', []);
    const mu = du.monthly_usage_id
      ? monthlyUsage.find(m => m.id === du.monthly_usage_id) || null
      : null;
    return Object.assign({}, du, { monthlyUsage: mu });
  }

  _resolveServiceRequestForeignKeys(sr) {
    if (!sr) return null;
    const depositOptions = this._getFromStorage('deposit_options', []);
    const depositOption = sr.deposit_option_id
      ? depositOptions.find(d => d.id === sr.deposit_option_id) || null
      : null;
    return Object.assign({}, sr, { depositOption });
  }

  _resolveRebateApplicationForeignKeys(app) {
    if (!app) return null;
    const programs = this._getFromStorage('rebate_programs', []);
    const accounts = this._getFromStorage('accounts', []);
    const program = app.program_id
      ? programs.find(p => p.id === app.program_id) || null
      : null;
    const account = app.account_id
      ? accounts.find(a => a.id === app.account_id) || null
      : null;
    return Object.assign({}, app, { program, account });
  }

  _resolveNotificationSettingsForeignKeys(ns) {
    if (!ns) return null;
    const accounts = this._getFromStorage('accounts', []);
    const account = ns.account_id
      ? accounts.find(a => a.id === ns.account_id) || null
      : null;
    return Object.assign({}, ns, { account });
  }

  _resolveRatePlanChangeForeignKeys(rpc) {
    if (!rpc) return null;
    const accounts = this._getFromStorage('accounts', []);
    const ratePlans = this._getFromStorage('rate_plans', []);
    const account = rpc.account_id
      ? accounts.find(a => a.id === rpc.account_id) || null
      : null;
    const newRatePlan = rpc.new_rate_plan_id
      ? ratePlans.find(r => r.id === rpc.new_rate_plan_id) || null
      : null;
    const oldRatePlan = rpc.old_rate_plan_id
      ? ratePlans.find(r => r.id === rpc.old_rate_plan_id) || null
      : null;
    return Object.assign({}, rpc, { account, newRatePlan, oldRatePlan });
  }

  _resolveEventRegistrationForeignKeys(er) {
    if (!er) return null;
    const events = this._getFromStorage('events', []);
    const event = er.event_id
      ? events.find(e => e.id === er.event_id) || null
      : null;
    return Object.assign({}, er, { event });
  }

  _resolveOutageSubscriptionForeignKeys(sub) {
    if (!sub) return null;
    const outages = this._getFromStorage('outages', []);
    const outage = sub.outage_id
      ? outages.find(o => o.id === sub.outage_id) || null
      : null;
    return Object.assign({}, sub, { outage });
  }

  // Helper: ensure payment method belongs to current account
  _ensurePaymentMethodOwnership(paymentMethodId, account) {
    const paymentMethods = this._getFromStorage('payment_methods', []);
    const pm = paymentMethods.find(p => p.id === paymentMethodId) || null;
    if (!pm) {
      return { ok: false, error: 'payment_method_not_found' };
    }
    if (!account || pm.account_id !== account.id) {
      return { ok: false, error: 'payment_method_not_owned_by_account' };
    }
    if (pm.status !== 'active') {
      return { ok: false, error: 'payment_method_not_active' };
    }
    return { ok: true, paymentMethod: pm };
  }

  // Helper: compute bill estimate
  _calculateEstimatedBillForRatePlan(ratePlan, usageGallons) {
    if (!ratePlan) return null;
    const base = typeof ratePlan.base_charge === 'number' ? ratePlan.base_charge : 0;
    const per = typeof ratePlan.per_1000_gallons_charge === 'number' ? ratePlan.per_1000_gallons_charge : 0;
    let variable = (usageGallons / 1000) * per;
    // If a tier_structure is defined and is an array, try simple tier computation
    if (Array.isArray(ratePlan.tier_structure) && ratePlan.tier_structure.length) {
      let remaining = usageGallons;
      variable = 0;
      for (let i = 0; i < ratePlan.tier_structure.length && remaining > 0; i++) {
        const tier = ratePlan.tier_structure[i] || {};
        const maxGallons = typeof tier.max_gallons === 'number' ? tier.max_gallons : null;
        const rate = typeof tier.per_1000_gallons_charge === 'number' ? tier.per_1000_gallons_charge : per;
        let tierUsage;
        if (maxGallons === null) {
          tierUsage = remaining;
        } else {
          tierUsage = Math.min(remaining, maxGallons);
        }
        variable += (tierUsage / 1000) * rate;
        remaining -= tierUsage;
      }
    }
    const total = base + variable;
    return Math.round(total * 100) / 100;
  }

  // Internal helper to load or create notification settings for current account
  _getOrCreateNotificationSettings() {
    const account = this._getCurrentAccount();
    if (!account) return null;
    let settings = this._getFromStorage('notification_settings', []);
    let ns = settings.find(s => s.account_id === account.id) || null;
    if (!ns) {
      const now = this._nowISO();
      ns = {
        id: this._generateId('notif'),
        account_id: account.id,
        outage_sms_enabled: false,
        outage_email_enabled: true,
        billing_sms_enabled: false,
        billing_email_enabled: true,
        general_sms_enabled: false,
        general_email_enabled: false,
        marketing_sms_enabled: false,
        marketing_email_enabled: false,
        created_at: now,
        updated_at: now
      };
      settings.push(ns);
      this._saveToStorage('notification_settings', settings);
    }
    return ns;
  }

  // =========================
  // Interface implementations
  // =========================

  // getHomePageSummary()
  getHomePageSummary() {
    const account = this._getCurrentAccount();
    const isSignedIn = !!account;
    let accountOverview = null;
    if (account) {
      // Recent usage snapshot: use most recent MonthlyUsage
      const monthlyUsage = this._getFromStorage('monthly_usage', []).filter(mu => mu.account_id === account.id);
      let recentUsageSnapshot = null;
      if (monthlyUsage.length) {
        monthlyUsage.sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });
        const latest = monthlyUsage[0];
        recentUsageSnapshot = {
          periodLabel: latest.month_label || `month_${latest.month}_${latest.year}`,
          totalUsageGallons: latest.total_usage_gallons || 0,
          comparisonToPriorPeriod: 'no_change'
        };
      }

      accountOverview = {
        accountNumber: account.account_number || '',
        contactName: account.contact_name || '',
        serviceAddressStreet: account.service_address_street || '',
        serviceAddressCity: account.service_address_city || '',
        serviceAddressZip: account.service_address_zip || '',
        currentBalance: account.current_balance || 0,
        nextBillDueDate: account.next_bill_due_date || null,
        lastPaymentAmount: account.last_payment_amount || 0,
        lastPaymentDate: account.last_payment_date || null,
        recentUsageSnapshot,
        activeAlerts: []
      };
    }

    // important notices and support summary can be derived from help/contact and outages if desired
    const importantNotices = [];

    const helpInfo = this.getHelpAndContactInfo();
    const supportSummary = {
      customerServicePhone: helpInfo.customerServicePhone || '',
      emergencyPhone: helpInfo.emergencyPhone || '',
      officeHoursSummary: helpInfo.officeHours && helpInfo.officeHours.monFri
        ? `Mon-Fri: ${helpInfo.officeHours.monFri}`
        : ''
    };

    return {
      isSignedIn,
      accountOverview,
      importantNotices,
      supportSummary
    };
  }

  // getMyAccountDashboard()
  getMyAccountDashboard() {
    const account = this._getCurrentAccount();
    const resolvedAccount = this._resolveAccountForeignKeys(account);

    const monthlyUsage = account
      ? this._getFromStorage('monthly_usage', []).filter(mu => mu.account_id === account.id)
      : [];

    const yearsSet = new Set();
    monthlyUsage.forEach(mu => yearsSet.add(mu.year));
    const availableYears = Array.from(yearsSet).sort((a, b) => a - b);
    const defaultYear = availableYears.length ? availableYears[availableYears.length - 1] : new Date().getFullYear();

    monthlyUsage.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    const recentMonths = monthlyUsage.slice(0, 6).map(mu => ({
      monthlyUsageId: mu.id,
      monthLabel: mu.month_label || `month_${mu.month}_${mu.year}`,
      totalUsageGallons: mu.total_usage_gallons || 0,
      totalCharges: mu.total_charges || 0
    }));

    return {
      account: resolvedAccount,
      accountAlerts: [],
      usageSummary: {
        availableYears,
        defaultYear,
        recentMonths
      },
      navigationShortcuts: []
    };
  }

  // getUsageHistory(year, viewMode)
  getUsageHistory(year, viewMode) {
    const vm = viewMode || 'chart';
    const account = this._getCurrentAccount();
    if (!account) {
      return { year, viewMode: vm, months: [] };
    }
    const monthlyUsage = this._getFromStorage('monthly_usage', []).filter(mu => mu.account_id === account.id && mu.year === year);

    let maxUsage = 0;
    monthlyUsage.forEach(mu => {
      const usage = mu.total_usage_gallons || 0;
      if (usage > maxUsage) maxUsage = usage;
    });

    const billingStatements = this._getFromStorage('billing_statements', []);

    const months = monthlyUsage.map(mu => {
      const statement = mu.billing_statement_id
        ? billingStatements.find(b => b.id === mu.billing_statement_id) || null
        : null;
      return {
        monthlyUsageId: mu.id,
        month: mu.month,
        monthLabel: mu.month_label || `month_${mu.month}_${mu.year}`,
        totalUsageGallons: mu.total_usage_gallons || 0,
        totalCharges: mu.total_charges || 0,
        billingStatementStatus: statement ? statement.status : null,
        isHighestUsageInYear: (mu.total_usage_gallons || 0) === maxUsage && maxUsage > 0,
        billingStatement: this._resolveBillingStatementForeignKeys(statement)
      };
    });

    return {
      year,
      viewMode: vm,
      months
    };
  }

  // getMonthlyUsageDetail(monthlyUsageId, defaultView)
  getMonthlyUsageDetail(monthlyUsageId, defaultView) {
    const defView = defaultView || 'summary';
    const allMonthly = this._getFromStorage('monthly_usage', []);
    const mu = allMonthly.find(m => m.id === monthlyUsageId) || null;
    if (!mu) {
      return {
        monthSummary: null,
        billingStatement: null,
        dailyBreakdown: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (mu) {
        localStorage.setItem(
          'task2_lastMonthlyUsageDetailViewed',
          JSON.stringify({ "monthlyUsageId": mu.id, "year": mu.year, "month": mu.month, "totalUsageGallons": mu.total_usage_gallons || 0 })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const resolvedMonthSummary = this._resolveMonthlyUsageForeignKeys(mu);

    const billingStatements = this._getFromStorage('billing_statements', []);
    const bs = mu.billing_statement_id
      ? billingStatements.find(b => b.id === mu.billing_statement_id) || null
      : null;
    const resolvedBillingStatement = this._resolveBillingStatementForeignKeys(bs);

    const dailyUsage = this._getFromStorage('daily_usage', []).filter(d => d.monthly_usage_id === mu.id);
    dailyUsage.sort((a, b) => {
      const da = this._parseDate(a.date) || new Date(0);
      const db = this._parseDate(b.date) || new Date(0);
      return da.getTime() - db.getTime();
    });

    const resolvedDaily = dailyUsage.map(du => this._resolveDailyUsageForeignKeys(du));

    return {
      monthSummary: resolvedMonthSummary,
      billingStatement: resolvedBillingStatement,
      dailyBreakdown: resolvedDaily,
      defaultView: defView
    };
  }

  // getBillingAndPaymentsOverview()
  getBillingAndPaymentsOverview() {
    const account = this._getCurrentAccount();
    if (!account) {
      return {
        accountSummary: {
          currentBalance: 0,
          nextBillDueDate: null,
          lastPaymentAmount: 0,
          lastPaymentDate: null,
          billingStatus: 'current'
        },
        billingHistory: [],
        paymentMethods: [],
        autopaySetting: {
          setting: null,
          paymentMethodLabel: null,
          nextScheduledPaymentDate: null,
          nextScheduledAmountEstimate: 0
        },
        oneTimePaymentDefaults: {
          suggestedAmount: 0,
          minimumDate: this._nowISO().slice(0, 10),
          maximumDate: null,
          preferredPaymentMethodId: null
        }
      };
    }

    const currentBalance = account.current_balance || 0;
    const nextDue = account.next_bill_due_date || null;
    const lastPaymentAmount = account.last_payment_amount || 0;
    const lastPaymentDate = account.last_payment_date || null;

    let billingStatus = 'current';
    const now = new Date();
    const dueDateObj = this._parseDate(nextDue);
    if (dueDateObj && currentBalance > 0 && dueDateObj.getTime() < now.getTime()) {
      billingStatus = 'past_due';
    }

    // Billing history
    const allStatements = this._getFromStorage('billing_statements', []);
    const billingHistoryRaw = allStatements.filter(b => b.account_id === account.id);
    billingHistoryRaw.sort((a, b) => {
      const da = this._parseDate(a.billing_period_start) || new Date(0);
      const db = this._parseDate(b.billing_period_start) || new Date(0);
      return db.getTime() - da.getTime();
    });
    const billingHistory = billingHistoryRaw.map(b => this._resolveBillingStatementForeignKeys(b));

    // Payment methods
    const allMethods = this._getFromStorage('payment_methods', []);
    const paymentMethods = allMethods
      .filter(pm => pm.account_id === account.id)
      .map(pm => this._resolvePaymentMethodForeignKeys(pm));

    // AutoPay
    const allAutoPay = this._getFromStorage('autopay_settings', []);
    let ap = allAutoPay.find(a => a.account_id === account.id && a.status !== 'cancelled') || null;
    const resolvedAp = this._resolveAutoPaySettingForeignKeys(ap);

    let paymentMethodLabel = null;
    if (resolvedAp && resolvedAp.paymentMethod) {
      paymentMethodLabel = resolvedAp.paymentMethod.label || null;
    }

    // Estimate next autopay
    let nextScheduledPaymentDate = null;
    let nextScheduledAmountEstimate = 0;
    if (resolvedAp && resolvedAp.status === 'active') {
      // Pick next billing statement due
      const futureStatements = billingHistoryRaw.filter(b => {
        const dd = this._parseDate(b.due_date);
        return dd && dd.getTime() >= now.getTime() && (b.status === 'issued' || b.status === 'past_due');
      });
      futureStatements.sort((a, b) => {
        const da = this._parseDate(a.due_date) || new Date(0);
        const db = this._parseDate(b.due_date) || new Date(0);
        return da.getTime() - db.getTime();
      });
      const targetStatement = futureStatements[0] || null;
      if (targetStatement) {
        nextScheduledPaymentDate = (targetStatement.due_date || '').slice(0, 10);
        let baseAmount = targetStatement.total_amount_due || currentBalance;
        if (resolvedAp.maximum_payment_amount && typeof resolvedAp.maximum_payment_amount === 'number') {
          if (resolvedAp.stop_if_exceeds_cap) {
            baseAmount = Math.min(baseAmount, resolvedAp.maximum_payment_amount);
          }
        }
        nextScheduledAmountEstimate = baseAmount;
      }
    }

    // One-time payment defaults
    const todayISO = new Date().toISOString().slice(0, 10);
    const maxDateObj = new Date();
    maxDateObj.setFullYear(maxDateObj.getFullYear() + 1);
    const maxDateISO = maxDateObj.toISOString().slice(0, 10);
    const preferred = paymentMethods.find(pm => pm.is_default) || paymentMethods[0] || null;

    return {
      accountSummary: {
        currentBalance,
        nextBillDueDate: nextDue,
        lastPaymentAmount,
        lastPaymentDate,
        billingStatus
      },
      billingHistory,
      paymentMethods,
      autopaySetting: {
        setting: resolvedAp,
        paymentMethodLabel,
        nextScheduledPaymentDate,
        nextScheduledAmountEstimate
      },
      oneTimePaymentDefaults: {
        suggestedAmount: currentBalance,
        minimumDate: todayISO,
        maximumDate: maxDateISO,
        preferredPaymentMethodId: preferred ? preferred.id : null
      }
    };
  }

  // createBankPaymentMethod(routingNumber, accountNumber, accountType, bankName, label, setAsDefault)
  createBankPaymentMethod(routingNumber, accountNumber, accountType, bankName, label, setAsDefault) {
    const account = this._getCurrentAccount();
    if (!account) {
      return { success: false, message: 'no_active_account', paymentMethod: null };
    }
    const allowedTypes = ['checking', 'savings'];
    if (!allowedTypes.includes(accountType)) {
      return { success: false, message: 'invalid_account_type', paymentMethod: null };
    }
    if (!routingNumber || !accountNumber) {
      return { success: false, message: 'missing_routing_or_account_number', paymentMethod: null };
    }

    const last4 = accountNumber.slice(-4);
    const pmLabel = label || `Bank account ending in ${last4}`;

    const paymentMethods = this._getFromStorage('payment_methods', []);
    const now = this._nowISO();
    const pm = {
      id: this._generateId('pm'),
      account_id: account.id,
      label: pmLabel,
      method_type: 'bank_account',
      is_default: !!setAsDefault,
      status: 'active',
      card_brand: null,
      card_last4: null,
      card_exp_month: null,
      card_exp_year: null,
      card_billing_zip: null,
      bank_name: bankName || null,
      bank_account_type: accountType,
      bank_routing_number: routingNumber,
      bank_account_number_last4: last4,
      created_at: now
    };

    if (setAsDefault) {
      for (const m of paymentMethods) {
        if (m.account_id === account.id) {
          m.is_default = false;
        }
      }
    }

    paymentMethods.push(pm);
    this._saveToStorage('payment_methods', paymentMethods);

    return {
      success: true,
      message: 'payment_method_created',
      paymentMethod: this._resolvePaymentMethodForeignKeys(pm)
    };
  }

  // createCardPaymentMethod(cardBrand, cardNumber, expMonth, expYear, billingZip, label, setAsDefault)
  createCardPaymentMethod(cardBrand, cardNumber, expMonth, expYear, billingZip, label, setAsDefault) {
    const account = this._getCurrentAccount();
    if (!account) {
      return { success: false, message: 'no_active_account', paymentMethod: null };
    }
    if (!cardBrand || !cardNumber || !expMonth || !expYear || !billingZip) {
      return { success: false, message: 'missing_card_fields', paymentMethod: null };
    }

    const normalizedBrand = String(cardBrand).toLowerCase();
    const allowedBrands = ['visa', 'mastercard', 'amex', 'discover', 'other'];
    const brand = allowedBrands.includes(normalizedBrand) ? normalizedBrand : 'other';

    const last4 = cardNumber.slice(-4);
    const pmLabel = label || `${brand.charAt(0).toUpperCase() + brand.slice(1)} ending in ${last4}`;

    const paymentMethods = this._getFromStorage('payment_methods', []);
    const now = this._nowISO();
    const pm = {
      id: this._generateId('pm'),
      account_id: account.id,
      label: pmLabel,
      method_type: 'card',
      is_default: !!setAsDefault,
      status: 'active',
      card_brand: brand,
      card_last4: last4,
      card_exp_month: expMonth,
      card_exp_year: expYear,
      card_billing_zip: billingZip,
      bank_name: null,
      bank_account_type: null,
      bank_routing_number: null,
      bank_account_number_last4: null,
      created_at: now
    };

    if (setAsDefault) {
      for (const m of paymentMethods) {
        if (m.account_id === account.id) {
          m.is_default = false;
        }
      }
    }

    paymentMethods.push(pm);
    this._saveToStorage('payment_methods', paymentMethods);

    return {
      success: true,
      message: 'payment_method_created',
      paymentMethod: this._resolvePaymentMethodForeignKeys(pm)
    };
  }

  // saveAutoPaySettings(paymentMethodId, frequency, paymentDayOfMonth, maximumPaymentAmount, stopIfExceedsCap, startDate, endDate)
  saveAutoPaySettings(paymentMethodId, frequency, paymentDayOfMonth, maximumPaymentAmount, stopIfExceedsCap, startDate, endDate) {
    const account = this._getCurrentAccount();
    if (!account) {
      return { success: false, message: 'no_active_account', autopaySetting: null };
    }

    const allowedFreq = ['monthly', 'biweekly', 'weekly', 'quarterly', 'annually'];
    if (!allowedFreq.includes(frequency)) {
      return { success: false, message: 'invalid_frequency', autopaySetting: null };
    }

    if (frequency === 'monthly') {
      if (typeof paymentDayOfMonth !== 'number' || paymentDayOfMonth < 1 || paymentDayOfMonth > 28) {
        return { success: false, message: 'invalid_payment_day_of_month', autopaySetting: null };
      }
    }

    const ownership = this._ensurePaymentMethodOwnership(paymentMethodId, account);
    if (!ownership.ok) {
      return { success: false, message: ownership.error, autopaySetting: null };
    }

    const autopaySettings = this._getFromStorage('autopay_settings', []);
    let setting = autopaySettings.find(a => a.account_id === account.id && a.status !== 'cancelled') || null;
    const now = this._nowISO();

    if (!setting) {
      setting = {
        id: this._generateId('ap'),
        account_id: account.id,
        payment_method_id: paymentMethodId,
        status: 'active',
        frequency,
        payment_day_of_month: paymentDayOfMonth || null,
        maximum_payment_amount: typeof maximumPaymentAmount === 'number' ? maximumPaymentAmount : null,
        stop_if_exceeds_cap: !!stopIfExceedsCap,
        start_date: startDate || null,
        end_date: endDate || null,
        created_at: now,
        updated_at: now
      };
      autopaySettings.push(setting);
    } else {
      setting.payment_method_id = paymentMethodId;
      setting.status = 'active';
      setting.frequency = frequency;
      setting.payment_day_of_month = paymentDayOfMonth || null;
      setting.maximum_payment_amount = typeof maximumPaymentAmount === 'number' ? maximumPaymentAmount : null;
      setting.stop_if_exceeds_cap = !!stopIfExceedsCap;
      setting.start_date = startDate || null;
      setting.end_date = endDate || null;
      setting.updated_at = now;
    }

    this._saveToStorage('autopay_settings', autopaySettings);

    return {
      success: true,
      message: 'autopay_saved',
      autopaySetting: this._resolveAutoPaySettingForeignKeys(setting)
    };
  }

  // scheduleOneTimePayment(amount, scheduledDate, paymentMethodId, isPartialPayment, billingStatementId)
  scheduleOneTimePayment(amount, scheduledDate, paymentMethodId, isPartialPayment, billingStatementId) {
    const account = this._getCurrentAccount();
    if (!account) {
      return { success: false, message: 'no_active_account', payment: null };
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return { success: false, message: 'invalid_amount', payment: null };
    }
    const dateObj = this._parseDate(scheduledDate);
    if (!dateObj) {
      return { success: false, message: 'invalid_scheduled_date', payment: null };
    }

    const ownership = this._ensurePaymentMethodOwnership(paymentMethodId, account);
    if (!ownership.ok) {
      return { success: false, message: ownership.error, payment: null };
    }

    let billingStatementIdFinal = null;
    if (billingStatementId) {
      const statements = this._getFromStorage('billing_statements', []);
      const bs = statements.find(b => b.id === billingStatementId && b.account_id === account.id) || null;
      if (bs) {
        billingStatementIdFinal = bs.id;
      }
    }

    const payments = this._getFromStorage('payments', []);
    const now = this._nowISO();

    const payment = {
      id: this._generateId('pay'),
      account_id: account.id,
      billing_statement_id: billingStatementIdFinal,
      payment_method_id: paymentMethodId,
      payment_type: 'one_time',
      amount,
      scheduled_date: scheduledDate,
      processed_at: null,
      status: 'scheduled',
      description: isPartialPayment ? 'Partial one-time payment' : 'One-time payment',
      created_at: now
    };

    payments.push(payment);
    this._saveToStorage('payments', payments);

    return {
      success: true,
      message: 'payment_scheduled',
      payment: this._resolvePaymentForeignKeys(payment)
    };
  }

  // getBillEstimatorConfig()
  getBillEstimatorConfig() {
    const account = this._getCurrentAccount();
    const ratePlans = this._getFromStorage('rate_plans', []);

    const residentialPlans = ratePlans.filter(rp => rp.status === 'active' && rp.rate_plan_type === 'residential');

    const monthlyUsage = account
      ? this._getFromStorage('monthly_usage', []).filter(mu => mu.account_id === account.id)
      : [];

    let defaultUsageGallons = 6000;
    if (monthlyUsage.length) {
      monthlyUsage.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      const recent = monthlyUsage.slice(0, 3);
      const sum = recent.reduce((acc, mu) => acc + (mu.total_usage_gallons || 0), 0);
      defaultUsageGallons = Math.round(sum / recent.length) || defaultUsageGallons;
    }

    const availableRatePlans = residentialPlans.map(rp => ({
      ratePlanId: rp.id,
      code: rp.code,
      displayName: rp.display_name,
      description: rp.description || '',
      baseCharge: rp.base_charge || 0,
      per1000GallonsCharge: rp.per_1000_gallons_charge || 0,
      isCurrentPlan: account ? account.current_rate_plan_id === rp.id : false
    }));

    return {
      defaultUsageGallons,
      availableRatePlans
    };
  }

  // estimateBillsForPlans(usageGallons, planAId, planBId)
  estimateBillsForPlans(usageGallons, planAId, planBId) {
    const ratePlans = this._getFromStorage('rate_plans', []);
    const planA = ratePlans.find(rp => rp.id === planAId) || null;
    const planB = ratePlans.find(rp => rp.id === planBId) || null;

    const results = [];

    if (planA) {
      const est = this._calculateEstimatedBillForRatePlan(planA, usageGallons);
      results.push({
        ratePlanId: planA.id,
        planCode: planA.code,
        planName: planA.display_name,
        estimatedBillAmount: est,
        isCheapest: false,
        ratePlan: planA
      });
    }

    if (planB) {
      const est = this._calculateEstimatedBillForRatePlan(planB, usageGallons);
      results.push({
        ratePlanId: planB.id,
        planCode: planB.code,
        planName: planB.display_name,
        estimatedBillAmount: est,
        isCheapest: false,
        ratePlan: planB
      });
    }

    let cheapestPlanId = null;
    if (results.length) {
      let min = Infinity;
      for (const r of results) {
        if (typeof r.estimatedBillAmount === 'number' && r.estimatedBillAmount < min) {
          min = r.estimatedBillAmount;
        }
      }
      const cheapest = results.filter(r => r.estimatedBillAmount === min);
      if (cheapest.length) {
        cheapestPlanId = cheapest[0].ratePlanId;
        for (const r of results) {
          r.isCheapest = r.estimatedBillAmount === min;
        }
      }
    }

    return {
      usageGallons,
      results,
      cheapestPlanId
    };
  }

  // selectRatePlan(newRatePlanId, effectiveDateOption, customEffectiveDate)
  selectRatePlan(newRatePlanId, effectiveDateOption, customEffectiveDate) {
    const account = this._getCurrentAccount();
    if (!account) {
      return { success: false, message: 'no_active_account', ratePlanChange: null, updatedAccount: null };
    }

    const ratePlans = this._getFromStorage('rate_plans', []);
    const newPlan = ratePlans.find(rp => rp.id === newRatePlanId) || null;
    if (!newPlan) {
      return { success: false, message: 'rate_plan_not_found', ratePlanChange: null, updatedAccount: null };
    }

    const allowedOpts = ['immediate', 'next_billing_cycle', 'custom_date'];
    if (!allowedOpts.includes(effectiveDateOption)) {
      return { success: false, message: 'invalid_effective_date_option', ratePlanChange: null, updatedAccount: null };
    }

    const now = this._nowISO();
    let effectiveDate = null;
    if (effectiveDateOption === 'immediate') {
      effectiveDate = now;
    } else if (effectiveDateOption === 'next_billing_cycle') {
      effectiveDate = account.next_bill_due_date || null;
    } else if (effectiveDateOption === 'custom_date') {
      effectiveDate = customEffectiveDate || null;
    }

    const ratePlanChanges = this._getFromStorage('rate_plan_changes', []);
    const rpc = {
      id: this._generateId('rpc'),
      account_id: account.id,
      old_rate_plan_id: account.current_rate_plan_id || null,
      new_rate_plan_id: newRatePlanId,
      effective_date_option: effectiveDateOption,
      effective_date: effectiveDate,
      status: effectiveDateOption === 'immediate' ? 'completed' : 'scheduled',
      created_at: now,
      updated_at: now
    };
    ratePlanChanges.push(rpc);
    this._saveToStorage('rate_plan_changes', ratePlanChanges);

    // Update account
    const accounts = this._getFromStorage('accounts', []);
    const idx = accounts.findIndex(a => a.id === account.id);
    if (idx !== -1) {
      accounts[idx].current_rate_plan_id = newRatePlanId;
      accounts[idx].updated_at = now;
      this._saveToStorage('accounts', accounts);
    }

    const updatedAccount = this._resolveAccountForeignKeys(accounts[idx] || account);

    return {
      success: true,
      message: 'rate_plan_selected',
      ratePlanChange: this._resolveRatePlanChangeForeignKeys(rpc),
      updatedAccount
    };
  }

  // getStartStopServiceOverview()
  getStartStopServiceOverview() {
    const actions = [
      {
        requestType: 'start_service',
        title: 'Start New Service',
        description: 'Request to start water service at a new address.'
      },
      {
        requestType: 'stop_service',
        title: 'Stop Service',
        description: 'Request to stop water service at an existing address.'
      },
      {
        requestType: 'transfer_service',
        title: 'Transfer Service',
        description: 'Move your existing service to a new address.'
      }
    ];

    return {
      actions,
      depositPolicySummary: 'Deposits may be required based on service category and credit history.',
      timelineSummary: 'Most start and stop requests are processed within 1-3 business days.',
      eligibilitySummary: 'Residential and commercial customers within the service area are eligible.'
    };
  }

  // getStartNewServiceFormOptions(serviceCategory)
  getStartNewServiceFormOptions(serviceCategory) {
    const allDepositOptions = this._getFromStorage('deposit_options', []);
    const relevantDeposits = allDepositOptions.filter(d => d.service_category === serviceCategory && d.is_active);

    let minAmount = null;
    for (const d of relevantDeposits) {
      if (typeof d.amount === 'number') {
        if (minAmount === null || d.amount < minAmount) {
          minAmount = d.amount;
        }
      }
    }

    const depositOptions = relevantDeposits.map(d => ({
      depositOptionId: d.id,
      name: d.name,
      description: d.description || '',
      amount: d.amount,
      isDefault: !!d.is_default,
      isLowestAmount: minAmount !== null && d.amount === minAmount
    }));

    // occupancy types union
    const occSet = new Set();
    relevantDeposits.forEach(d => {
      if (Array.isArray(d.allowed_occupancy_types)) {
        d.allowed_occupancy_types.forEach(o => occSet.add(o));
      }
    });
    let availableOccupancyTypes = Array.from(occSet);
    if (!availableOccupancyTypes.length) {
      availableOccupancyTypes = ['owner', 'renter', 'property_manager', 'other'];
    }

    const today = new Date();
    const minStartDateObj = new Date(today.getTime());
    const maxStartDateObj = new Date(today.getTime());
    maxStartDateObj.setMonth(maxStartDateObj.getMonth() + 3);

    const defaultRequestedStartDateObj = new Date(today.getTime());
    defaultRequestedStartDateObj.setDate(defaultRequestedStartDateObj.getDate() + 3);

    const isoDate = d => d.toISOString().slice(0, 10);

    return {
      serviceCategory,
      availableOccupancyTypes,
      defaultRequestedStartDate: isoDate(defaultRequestedStartDateObj),
      minStartDate: isoDate(minStartDateObj),
      maxStartDate: isoDate(maxStartDateObj),
      depositOptions,
      termsOfServiceSummary: 'By starting service, you agree to comply with all applicable service policies and rates.'
    };
  }

  // submitStartServiceRequest(requestType, serviceCategory, serviceAddressStreet, serviceAddressCity, serviceAddressState, serviceAddressZip, requestedStartDate, occupancyType, primaryPhone, depositOptionId, contactEmail, agreedToTerms)
  submitStartServiceRequest(requestType, serviceCategory, serviceAddressStreet, serviceAddressCity, serviceAddressState, serviceAddressZip, requestedStartDate, occupancyType, primaryPhone, depositOptionId, contactEmail, agreedToTerms) {
    if (requestType !== 'start_service') {
      return { success: false, message: 'invalid_request_type', serviceRequest: null };
    }
    if (!serviceAddressStreet || !serviceAddressCity || !serviceAddressZip || !requestedStartDate || !occupancyType || !primaryPhone || !contactEmail) {
      return { success: false, message: 'missing_required_fields', serviceRequest: null };
    }
    if (!agreedToTerms) {
      return { success: false, message: 'terms_not_accepted', serviceRequest: null };
    }

    const allowedOccupancy = ['owner', 'renter', 'property_manager', 'other'];
    if (!allowedOccupancy.includes(occupancyType)) {
      return { success: false, message: 'invalid_occupancy_type', serviceRequest: null };
    }

    const dateObj = this._parseDate(requestedStartDate);
    if (!dateObj) {
      return { success: false, message: 'invalid_requested_start_date', serviceRequest: null };
    }

    let depositOptionIdFinal = null;
    if (depositOptionId) {
      const deposits = this._getFromStorage('deposit_options', []);
      const dep = deposits.find(d => d.id === depositOptionId && d.is_active && d.service_category === serviceCategory) || null;
      if (dep) {
        depositOptionIdFinal = dep.id;
      }
    }

    const serviceRequests = this._getFromStorage('service_requests', []);
    const now = this._nowISO();

    const sr = {
      id: this._generateId('sr'),
      request_type: requestType,
      service_category: serviceCategory,
      service_address_street: serviceAddressStreet,
      service_address_city: serviceAddressCity,
      service_address_state: serviceAddressState || null,
      service_address_zip: serviceAddressZip,
      requested_start_date: requestedStartDate,
      requested_stop_date: null,
      occupancy_type: occupancyType,
      primary_phone: primaryPhone,
      contact_email: contactEmail,
      deposit_option_id: depositOptionIdFinal,
      agreed_to_terms: !!agreedToTerms,
      status: 'submitted',
      created_at: now,
      updated_at: now
    };

    serviceRequests.push(sr);
    this._saveToStorage('service_requests', serviceRequests);

    return {
      success: true,
      message: 'start_service_request_submitted',
      serviceRequest: this._resolveServiceRequestForeignKeys(sr)
    };
  }

  // getReportProblemConfig()
  getReportProblemConfig() {
    const issueTypes = [
      { value: 'water_leak', label: 'Water Leak', description: 'Report leaks in the street, sidewalk, yard, or building.' },
      { value: 'outage', label: 'Service Outage', description: 'Report loss of water service or low pressure.' },
      { value: 'water_quality', label: 'Water Quality', description: 'Report taste, color, or odor concerns.' },
      { value: 'billing_issue', label: 'Billing Issue', description: 'Report billing questions or disputes.' },
      { value: 'other', label: 'Other', description: 'Report other service-related issues.' }
    ];

    const locationContexts = [
      { value: 'in_street_roadway', label: 'In the street / roadway' },
      { value: 'sidewalk', label: 'Sidewalk' },
      { value: 'yard', label: 'Yard or landscaping' },
      { value: 'inside_building', label: 'Inside building' },
      { value: 'intersection', label: 'Intersection' },
      { value: 'hydrant', label: 'Fire hydrant' },
      { value: 'other', label: 'Other location' }
    ];

    const leakDescriptionTypes = [
      { value: 'water_bubbling_from_ground', label: 'Water bubbling from ground' },
      { value: 'leak_in_roadway', label: 'Leak in roadway' },
      { value: 'dripping_meter', label: 'Dripping meter' },
      { value: 'broken_pipe', label: 'Broken pipe' },
      { value: 'other', label: 'Other leak type' }
    ];

    const severityLevels = [
      { value: 'low', label: 'Low' },
      { value: 'medium', label: 'Medium' },
      { value: 'high', label: 'High' }
    ];

    return {
      issueTypes,
      locationContexts,
      leakDescriptionTypes,
      severityLevels
    };
  }

  // submitLeakReport(issueType, locationAddress, locationLatitude, locationLongitude, locationContext, leakDescriptionType, severity, freeTextDescription, reporterName, reporterPhone)
  submitLeakReport(issueType, locationAddress, locationLatitude, locationLongitude, locationContext, leakDescriptionType, severity, freeTextDescription, reporterName, reporterPhone) {
    const allowedIssueTypes = ['water_leak', 'outage', 'water_quality', 'billing_issue', 'other'];
    if (!allowedIssueTypes.includes(issueType)) {
      return { success: false, message: 'invalid_issue_type', leakReport: null };
    }
    const allowedContexts = ['in_street_roadway', 'sidewalk', 'yard', 'inside_building', 'intersection', 'hydrant', 'other'];
    if (!allowedContexts.includes(locationContext)) {
      return { success: false, message: 'invalid_location_context', leakReport: null };
    }
    const allowedLeakTypes = ['water_bubbling_from_ground', 'leak_in_roadway', 'dripping_meter', 'broken_pipe', 'other'];
    if (!allowedLeakTypes.includes(leakDescriptionType)) {
      return { success: false, message: 'invalid_leak_description_type', leakReport: null };
    }
    const allowedSeverities = ['low', 'medium', 'high'];
    if (!allowedSeverities.includes(severity)) {
      return { success: false, message: 'invalid_severity', leakReport: null };
    }
    if (!locationAddress || !reporterName || !reporterPhone) {
      return { success: false, message: 'missing_required_fields', leakReport: null };
    }

    const leakReports = this._getFromStorage('leak_reports', []);
    const now = this._nowISO();
    const id = this._generateId('lr');

    const lr = {
      id,
      issue_type: issueType,
      location_address: locationAddress,
      location_latitude: typeof locationLatitude === 'number' ? locationLatitude : null,
      location_longitude: typeof locationLongitude === 'number' ? locationLongitude : null,
      location_context: locationContext,
      leak_description_type: leakDescriptionType,
      severity,
      free_text_description: freeTextDescription || null,
      reporter_name: reporterName,
      reporter_phone: reporterPhone,
      status: 'submitted',
      reference_number: 'LR-' + id,
      created_at: now,
      updated_at: now
    };

    leakReports.push(lr);
    this._saveToStorage('leak_reports', leakReports);

    return {
      success: true,
      message: 'leak_report_submitted',
      leakReport: lr
    };
  }

  // getConservationAndRebatesOverview()
  getConservationAndRebatesOverview() {
    const programs = this._getFromStorage('rebate_programs', []);
    const featuredPrograms = programs.filter(p => p.is_featured && p.status === 'active');

    return {
      introText: 'Reduce your water use and save money with our conservation rebate programs.',
      featuredPrograms
    };
  }

  // getRebatePrograms(filters, sortOption)
  getRebatePrograms(filters, sortOption) {
    const f = filters || {};
    let programs = this._getFromStorage('rebate_programs', []);

    if (f.customerType) {
      programs = programs.filter(p => p.customer_type === f.customerType || p.customer_type === 'all_customers');
    }
    if (Array.isArray(f.rebateTypes) && f.rebateTypes.length) {
      const set = new Set(f.rebateTypes);
      programs = programs.filter(p => set.has(p.rebate_type));
    }
    if (f.status) {
      programs = programs.filter(p => p.status === f.status);
    }
    if (typeof f.minRebateAmount === 'number') {
      programs = programs.filter(p => (p.rebate_amount || 0) >= f.minRebateAmount);
    }

    const sort = sortOption || 'rebate_amount_high_to_low';
    if (sort === 'rebate_amount_high_to_low') {
      programs.sort((a, b) => (b.rebate_amount || 0) - (a.rebate_amount || 0));
    } else if (sort === 'rebate_amount_low_to_high') {
      programs.sort((a, b) => (a.rebate_amount || 0) - (b.rebate_amount || 0));
    } else if (sort === 'name_a_to_z') {
      programs.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const resultPrograms = programs.map(p => ({
      programId: p.id,
      name: p.name,
      description: p.description || '',
      customerType: p.customer_type,
      rebateType: p.rebate_type,
      rebateAmount: p.rebate_amount,
      maxRebateAmount: p.max_rebate_amount || null,
      status: p.status,
      isFeatured: !!p.is_featured
    }));

    return {
      filtersApplied: {
        customerType: f.customerType || null,
        rebateTypes: Array.isArray(f.rebateTypes) ? f.rebateTypes : [],
        status: f.status || null,
        minRebateAmount: typeof f.minRebateAmount === 'number' ? f.minRebateAmount : null
      },
      sortOption: sort,
      programs: resultPrograms
    };
  }

  // addRebateProgramToMyApplications(programId)
  addRebateProgramToMyApplications(programId) {
    const account = this._getCurrentAccount();
    if (!account) {
      return { success: false, message: 'no_active_account', rebateApplication: null };
    }
    if (!programId) {
      return { success: false, message: 'missing_program_id', rebateApplication: null };
    }

    const programs = this._getFromStorage('rebate_programs', []);
    const program = programs.find(p => p.id === programId) || null;
    if (!program || program.status !== 'active') {
      return { success: false, message: 'program_not_available', rebateApplication: null };
    }

    const applications = this._getFromStorage('rebate_applications', []);
    let app = applications.find(a => a.program_id === programId && a.account_id === account.id) || null;
    const now = this._nowISO();

    if (!app) {
      app = {
        id: this._generateId('ra'),
        program_id: programId,
        account_id: account.id,
        application_status: 'not_started',
        estimated_rebate_amount: program.rebate_amount || null,
        notes: null,
        created_at: now,
        updated_at: now
      };
      applications.push(app);
      this._saveToStorage('rebate_applications', applications);
    }

    return {
      success: true,
      message: 'rebate_program_added',
      rebateApplication: this._resolveRebateApplicationForeignKeys(app)
    };
  }

  // getMyRebateApplications()
  getMyRebateApplications() {
    const account = this._getCurrentAccount();
    if (!account) {
      return { applications: [] };
    }
    const applications = this._getFromStorage('rebate_applications', []).filter(a => a.account_id === account.id);
    const programs = this._getFromStorage('rebate_programs', []);

    const result = applications.map(a => {
      const program = programs.find(p => p.id === a.program_id) || null;
      return {
        rebateApplicationId: a.id,
        programName: program ? program.name : null,
        rebateAmount: program ? program.rebate_amount : a.estimated_rebate_amount || 0,
        applicationStatus: a.application_status,
        createdAt: a.created_at,
        program,
        account
      };
    });

    return { applications: result };
  }

  // openRebateApplication(rebateApplicationId)
  openRebateApplication(rebateApplicationId) {
    const applications = this._getFromStorage('rebate_applications', []);
    const app = applications.find(a => a.id === rebateApplicationId) || null;
    if (!app) {
      return { rebateApplication: null, steps: [] };
    }

    const resolvedApp = this._resolveRebateApplicationForeignKeys(app);

    // Simple step model based on status
    const status = app.application_status;
    const steps = [
      { stepId: 'eligibility', title: 'Eligibility', status: status === 'not_started' ? 'in_progress' : 'completed' },
      { stepId: 'purchase_details', title: 'Purchase Details', status: status === 'in_progress' ? 'in_progress' : (status === 'not_started' ? 'not_started' : 'completed') },
      { stepId: 'documents', title: 'Upload Documents', status: status === 'submitted' || status === 'approved' || status === 'denied' ? 'completed' : 'not_started' },
      { stepId: 'review_submit', title: 'Review & Submit', status: status === 'submitted' || status === 'approved' || status === 'denied' ? 'completed' : 'not_started' }
    ];

    return {
      rebateApplication: resolvedApp,
      steps
    };
  }

  // getProfileAndNotificationSettings()
  getProfileAndNotificationSettings() {
    const account = this._getCurrentAccount();
    if (!account) {
      return {
        accountProfile: null,
        notificationSettings: null
      };
    }

    const ns = this._getOrCreateNotificationSettings();
    const resolvedNs = this._resolveNotificationSettingsForeignKeys(ns);

    const accountProfile = {
      contactName: account.contact_name || '',
      contactEmail: account.contact_email || '',
      contactMobilePhone: account.contact_mobile_phone || ''
    };

    return {
      accountProfile,
      notificationSettings: resolvedNs
    };
  }

  // updateProfileAndNotificationSettings(profile, notifications)
  updateProfileAndNotificationSettings(profile, notifications) {
    const account = this._getCurrentAccount();
    if (!account) {
      return {
        success: false,
        message: 'no_active_account',
        accountProfile: null,
        notificationSettings: null
      };
    }
    const prof = profile || {};
    const notif = notifications || {};

    const accounts = this._getFromStorage('accounts', []);
    const idx = accounts.findIndex(a => a.id === account.id);
    if (idx !== -1) {
      if (typeof prof.contactName === 'string') accounts[idx].contact_name = prof.contactName;
      if (typeof prof.contactEmail === 'string') accounts[idx].contact_email = prof.contactEmail;
      if (typeof prof.contactMobilePhone === 'string') accounts[idx].contact_mobile_phone = prof.contactMobilePhone;
      accounts[idx].updated_at = this._nowISO();
      this._saveToStorage('accounts', accounts);
    }

    let ns = this._getOrCreateNotificationSettings();
    if (ns) {
      if (typeof notif.outageSmsEnabled === 'boolean') ns.outage_sms_enabled = notif.outageSmsEnabled;
      if (typeof notif.outageEmailEnabled === 'boolean') ns.outage_email_enabled = notif.outageEmailEnabled;
      if (typeof notif.billingSmsEnabled === 'boolean') ns.billing_sms_enabled = notif.billingSmsEnabled;
      if (typeof notif.billingEmailEnabled === 'boolean') ns.billing_email_enabled = notif.billingEmailEnabled;
      if (typeof notif.generalSmsEnabled === 'boolean') ns.general_sms_enabled = notif.generalSmsEnabled;
      if (typeof notif.generalEmailEnabled === 'boolean') ns.general_email_enabled = notif.generalEmailEnabled;
      if (typeof notif.marketingSmsEnabled === 'boolean') ns.marketing_sms_enabled = notif.marketingSmsEnabled;
      if (typeof notif.marketingEmailEnabled === 'boolean') ns.marketing_email_enabled = notif.marketingEmailEnabled;
      ns.updated_at = this._nowISO();
      const all = this._getFromStorage('notification_settings', []);
      const nsIdx = all.findIndex(s => s.id === ns.id);
      if (nsIdx !== -1) {
        all[nsIdx] = ns;
        this._saveToStorage('notification_settings', all);
      }
    }

    const updatedAccount = this._getCurrentAccount();
    const accountProfile = {
      contactName: updatedAccount.contact_name || '',
      contactEmail: updatedAccount.contact_email || '',
      contactMobilePhone: updatedAccount.contact_mobile_phone || ''
    };

    return {
      success: true,
      message: 'profile_and_notifications_updated',
      accountProfile,
      notificationSettings: this._resolveNotificationSettingsForeignKeys(ns)
    };
  }

  // getEventsListing(filters, sortOption)
  getEventsListing(filters, sortOption) {
    const f = filters || {};
    let events = this._getFromStorage('events', []);

    if (f.eventType) {
      events = events.filter(e => e.event_type === f.eventType);
    }

    const now = new Date();
    if (f.dateRange === 'next_30_days') {
      const windowStart = new Date(now.getTime());
      windowStart.setDate(windowStart.getDate() - 30);
      const windowEnd = new Date(now.getTime());
      windowEnd.setDate(windowEnd.getDate() + 30);
      events = events.filter(e => {
        const start = this._parseDate(e.start_datetime);
        return start && start.getTime() >= windowStart.getTime() && start.getTime() <= windowEnd.getTime();
      });
    }

    if (f.zip) {
      events = events.filter(e => e.address_zip === f.zip);
    }

    if (f.costType === 'free') {
      events = events.filter(e => e.cost_type === 'free');
    } else if (f.costType === 'paid') {
      events = events.filter(e => e.cost_type === 'paid');
    }

    const sort = sortOption || 'soonest_first';
    if (sort === 'soonest_first') {
      events.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da.getTime() - db.getTime();
      });
    } else if (sort === 'latest_first') {
      events.sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return db.getTime() - da.getTime();
      });
    } else if (sort === 'title_a_to_z') {
      events.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    return {
      filtersApplied: {
        eventType: f.eventType || null,
        dateRange: f.dateRange || null,
        zip: f.zip || null,
        radiusMiles: typeof f.radiusMiles === 'number' ? f.radiusMiles : null,
        costType: f.costType || null
      },
      sortOption: sort,
      events
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        isRegistrationOpen: false,
        registrationSummary: {
          seatsAvailable: 0,
          maxCapacity: 0,
          costType: null,
          costAmount: null
        }
      };
    }

    const isRegistrationOpen = event.status === 'scheduled' && (typeof event.seats_available !== 'number' || event.seats_available > 0);

    return {
      event,
      isRegistrationOpen,
      registrationSummary: {
        seatsAvailable: typeof event.seats_available === 'number' ? event.seats_available : null,
        maxCapacity: typeof event.max_capacity === 'number' ? event.max_capacity : null,
        costType: event.cost_type,
        costAmount: typeof event.cost_amount === 'number' ? event.cost_amount : 0
      }
    };
  }

  // registerForEvent(eventId, numAttendees, attendeeNames, contactEmail)
  registerForEvent(eventId, numAttendees, attendeeNames, contactEmail) {
    const events = this._getFromStorage('events', []);
    const eventIdx = events.findIndex(e => e.id === eventId);
    if (eventIdx === -1) {
      return { success: false, message: 'event_not_found', eventRegistration: null };
    }
    const event = events[eventIdx];
    const isRegistrationOpen = (typeof event.seats_available !== 'number' || event.seats_available > 0);
    if (!isRegistrationOpen) {
      return { success: false, message: 'registration_closed', eventRegistration: null };
    }
    if (typeof numAttendees !== 'number' || numAttendees <= 0) {
      return { success: false, message: 'invalid_attendee_count', eventRegistration: null };
    }
    if (!Array.isArray(attendeeNames) || attendeeNames.length < numAttendees) {
      return { success: false, message: 'insufficient_attendee_names', eventRegistration: null };
    }
    if (!contactEmail) {
      return { success: false, message: 'missing_contact_email', eventRegistration: null };
    }

    if (typeof event.seats_available === 'number' && numAttendees > event.seats_available) {
      return { success: false, message: 'not_enough_seats', eventRegistration: null };
    }

    const eventRegistrations = this._getFromStorage('event_registrations', []);
    const now = this._nowISO();

    const er = {
      id: this._generateId('er'),
      event_id: eventId,
      num_attendees: numAttendees,
      attendee_names: attendeeNames.slice(0, numAttendees),
      contact_email: contactEmail,
      status: 'registered',
      created_at: now
    };

    eventRegistrations.push(er);
    this._saveToStorage('event_registrations', eventRegistrations);

    if (typeof event.seats_available === 'number') {
      events[eventIdx].seats_available = Math.max(0, event.seats_available - numAttendees);
      this._saveToStorage('events', events);
    }

    return {
      success: true,
      message: 'event_registered',
      eventRegistration: this._resolveEventRegistrationForeignKeys(er)
    };
  }

  // getOutageMapInitialData()
  getOutageMapInitialData() {
    const outages = this._getFromStorage('outages', []);
    let defaultCenterLatitude = 0;
    let defaultCenterLongitude = 0;
    let defaultZoom = 10;

    if (outages.length) {
      let latSum = 0;
      let lonSum = 0;
      let count = 0;
      for (const o of outages) {
        if (typeof o.center_latitude === 'number' && typeof o.center_longitude === 'number') {
          latSum += o.center_latitude;
          lonSum += o.center_longitude;
          count++;
        }
      }
      if (count > 0) {
        defaultCenterLatitude = latSum / count;
        defaultCenterLongitude = lonSum / count;
      }
    }

    return {
      defaultCenterLatitude,
      defaultCenterLongitude,
      defaultZoom,
      outages
    };
  }

  // searchServiceAddress(addressQuery)
  searchServiceAddress(addressQuery) {
    const query = addressQuery || '';
    const all = this._getFromStorage('geocoded_addresses', []);
    let matches = all.filter(a => {
      const label = a.label || '';
      return label.toLowerCase().includes(query.toLowerCase());
    }).map(a => ({
      label: a.label,
      latitude: a.latitude,
      longitude: a.longitude
    }));

    if (!matches.length) {
      // Fallback: approximate address using outage center points when available
      const outages = this._getFromStorage('outages', []);
      const lowered = query.toLowerCase();
      const tokens = lowered.split(/\s+/).filter(Boolean);
      matches = outages
        .filter(o => {
          const title = (o.title || '').toLowerCase();
          const desc = (o.description || '').toLowerCase();
          if (!tokens.length) {
            return title.includes(lowered) || desc.includes(lowered);
          }
          return tokens.every(t => title.includes(t) || desc.includes(t));
        })
        .map(o => ({
          label: o.title,
          latitude: o.center_latitude,
          longitude: o.center_longitude
        }));
    }

    return {
      query,
      matches
    };
  }

  // Helper: distance in miles between two lat/lon
  _distanceMiles(lat1, lon1, lat2, lon2) {
    function toRad(v) { return v * Math.PI / 180; }
    const R = 3958.8; // miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // getNearbyOutages(latitude, longitude, radiusMiles)
  getNearbyOutages(latitude, longitude, radiusMiles) {
    const centerLatitude = latitude;
    const centerLongitude = longitude;
    const radius = radiusMiles;
    const outages = this._getFromStorage('outages', []);

    const nearby = [];
    for (const o of outages) {
      if (typeof o.center_latitude !== 'number' || typeof o.center_longitude !== 'number') continue;
      const dist = this._distanceMiles(centerLatitude, centerLongitude, o.center_latitude, o.center_longitude);
      if (dist <= radius) {
        nearby.push({
          outageId: o.id,
          title: o.title,
          status: o.status,
          severity: o.severity,
          distanceMiles: dist,
          centerLatitude: o.center_latitude,
          centerLongitude: o.center_longitude,
          outage: o
        });
      }
    }

    nearby.sort((a, b) => a.distanceMiles - b.distanceMiles);

    return {
      centerLatitude,
      centerLongitude,
      radiusMiles: radius,
      outages: nearby
    };
  }

  // getOutageDetails(outageId)
  getOutageDetails(outageId) {
    const outages = this._getFromStorage('outages', []);
    const outage = outages.find(o => o.id === outageId) || null;

    const subs = this._getFromStorage('outage_subscriptions', []);
    const sub = subs.find(s => s.outage_id === outageId && s.status === 'active') || null;

    const userSubscription = {
      isSubscribed: !!sub,
      scope: sub ? sub.scope : null,
      smsEnabled: sub ? sub.sms_enabled : false,
      emailEnabled: sub ? sub.email_enabled : false
    };

    return {
      outage,
      userSubscription
    };
  }

  // subscribeToOutageUpdates(outageId, phoneNumber, smsEnabled, emailEnabled, scope)
  subscribeToOutageUpdates(outageId, phoneNumber, smsEnabled, emailEnabled, scope) {
    const outages = this._getFromStorage('outages', []);
    const outage = outages.find(o => o.id === outageId) || null;
    if (!outage) {
      return { success: false, message: 'outage_not_found', subscription: null };
    }

    const allowedScope = ['single_outage', 'all_outages'];
    if (!allowedScope.includes(scope)) {
      return { success: false, message: 'invalid_scope', subscription: null };
    }

    if (!smsEnabled && !emailEnabled) {
      return { success: false, message: 'no_channels_selected', subscription: null };
    }

    const subs = this._getFromStorage('outage_subscriptions', []);

    let existing = null;
    if (phoneNumber) {
      existing = subs.find(s => s.outage_id === outageId && s.phone_number === phoneNumber && s.scope === scope) || null;
    }

    const now = this._nowISO();
    let sub;
    if (existing) {
      existing.sms_enabled = !!smsEnabled;
      existing.email_enabled = !!emailEnabled;
      existing.status = 'active';
      sub = existing;
    } else {
      sub = {
        id: this._generateId('os'),
        outage_id: outageId,
        phone_number: phoneNumber || null,
        sms_enabled: !!smsEnabled,
        email_enabled: !!emailEnabled,
        scope,
        status: 'active',
        created_at: now
      };
      subs.push(sub);
    }

    this._saveToStorage('outage_subscriptions', subs);

    return {
      success: true,
      message: 'outage_subscription_saved',
      subscription: this._resolveOutageSubscriptionForeignKeys(sub)
    };
  }

  // getHelpAndContactInfo()
  getHelpAndContactInfo() {
    const info = this._getFromStorage('help_and_contact_info', null) || {};
    const officeHours = info.officeHours || { monFri: '', sat: '', sun: '' };
    const commonTasks = this._getFromStorage('help_common_tasks', []);

    return {
      customerServicePhone: info.customerServicePhone || '',
      customerServiceEmail: info.customerServiceEmail || '',
      emergencyPhone: info.emergencyPhone || '',
      officeHours,
      commonTasks
    };
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    if (!name || !email || !message) {
      return { success: false, message: 'missing_required_fields', referenceNumber: null };
    }

    const submissions = this._getFromStorage('contact_submissions', []);
    const id = this._generateId('cf');
    const now = this._nowISO();

    const rec = {
      id,
      name,
      email,
      topic: topic || null,
      message,
      created_at: now
    };

    submissions.push(rec);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'contact_form_submitted',
      referenceNumber: id
    };
  }

  // getFaqArticles(category)
  getFaqArticles(category) {
    const all = this._getFromStorage('faq_articles', []);
    const cat = category || null;
    const faqs = cat ? all.filter(f => f.category === cat) : all;

    return {
      category: cat,
      faqs
    };
  }

  // getPoliciesAndRatesOverview()
  getPoliciesAndRatesOverview() {
    const ratePlans = this._getFromStorage('rate_plans', []);
    const policySections = this._getFromStorage('policy_sections', []);

    const ratePlanSummaries = ratePlans.map(rp => ({
      ratePlanId: rp.id,
      code: rp.code,
      displayName: rp.display_name,
      description: rp.description || '',
      baseCharge: rp.base_charge || 0,
      per1000GallonsCharge: rp.per_1000_gallons_charge || 0,
      status: rp.status
    }));

    return {
      ratePlanSummaries,
      policySections
    };
  }

  // getPolicySection(sectionKey)
  getPolicySection(sectionKey) {
    const sections = this._getFromStorage('policy_sections', []);
    const sec = sections.find(s => s.sectionKey === sectionKey) || null;
    if (!sec) {
      return {
        sectionKey,
        title: '',
        content: ''
      };
    }
    return sec;
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