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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Core entity tables (arrays)
    const arrayKeys = [
      'accounts',
      'payees',
      'bill_payments',
      'transfer_schedules',
      'transactions',
      'categories',
      'rewards_profiles',
      'reward_redemptions',
      'debit_card_designs',
      'card_replacement_orders',
      'alerts',
      'category_budgets',
      'loan_offers',
      'loan_applications',
      'statement_documents',
      'document_preferences',
      // Additional content / config tables
      'loan_products',
      'help_topics',
      'help_articles'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singular content objects
    const objectKeys = [
      'support_contact_channels',
      'about_credit_union_content',
      'fees_and_rates',
      'privacy_and_security_content',
      'contact_info'
    ];

    objectKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  }

  _getObjectFromStorage(key, defaultValue = {}) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  // ----------------------
  // Generic helpers
  // ----------------------

  _indexById(list) {
    const map = {};
    for (const item of list) {
      if (item && item.id != null) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _todayISO() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _resolveForeignKeysOnTransactions(transactions, accountsById, categoriesById) {
    return transactions.map((t) => ({
      ...t,
      account: t.account_id ? accountsById[t.account_id] || null : null,
      category: t.category_id ? categoriesById[t.category_id] || null : null
    }));
  }

  _resolveForeignKeysOnBillPayment(billPayment, payeesById, accountsById) {
    if (!billPayment) return null;
    return {
      ...billPayment,
      payee: billPayment.payee_id ? payeesById[billPayment.payee_id] || null : null,
      from_account: billPayment.from_account_id ? accountsById[billPayment.from_account_id] || null : null
    };
  }

  _resolveForeignKeysOnTransferSchedule(transferSchedule, accountsById) {
    if (!transferSchedule) return null;
    return {
      ...transferSchedule,
      from_account: transferSchedule.from_account_id ? accountsById[transferSchedule.from_account_id] || null : null,
      to_account: transferSchedule.to_account_id ? accountsById[transferSchedule.to_account_id] || null : null
    };
  }

  _resolveForeignKeysOnRewardRedemption(redemption, rewardsProfilesById, accountsById) {
    if (!redemption) return null;
    return {
      ...redemption,
      rewards_profile: redemption.rewards_profile_id ? rewardsProfilesById[redemption.rewards_profile_id] || null : null,
      target_account: redemption.target_account_id ? accountsById[redemption.target_account_id] || null : null
    };
  }

  _resolveForeignKeysOnCardReplacementOrder(order, accountsById, designsById) {
    if (!order) return null;
    return {
      ...order,
      account: order.account_id ? accountsById[order.account_id] || null : null,
      card_design: order.card_design_id ? designsById[order.card_design_id] || null : null
    };
  }

  _resolveForeignKeysOnAlert(alert, accountsById) {
    if (!alert) return null;
    return {
      ...alert,
      account: alert.account_id ? accountsById[alert.account_id] || null : null
    };
  }

  _resolveForeignKeysOnCategoryBudget(categoryBudget, categoriesById) {
    if (!categoryBudget) return null;
    return {
      ...categoryBudget,
      category: categoryBudget.category_id ? categoriesById[categoryBudget.category_id] || null : null
    };
  }

  _resolveForeignKeysOnLoanApplication(loanApplication, loanOffersById) {
    if (!loanApplication) return null;
    return {
      ...loanApplication,
      loan_offer: loanApplication.loan_offer_id ? loanOffersById[loanApplication.loan_offer_id] || null : null
    };
  }

  _resolveForeignKeysOnStatementDocument(statement, accountsById) {
    if (!statement) return null;
    return {
      ...statement,
      account: statement.account_id ? accountsById[statement.account_id] || null : null
    };
  }

  _resolveForeignKeysOnDocumentPreference(documentPreference, accountsById) {
    if (!documentPreference) return null;
    return {
      ...documentPreference,
      account: documentPreference.account_id ? accountsById[documentPreference.account_id] || null : null
    };
  }

  // ----------------------
  // Required private helpers from spec
  // ----------------------

  _getCurrentUserAccounts() {
    // Single-user context: return all accounts
    return this._getFromStorage('accounts', []);
  }

  _getCurrentUserRewardsProfile() {
    let profiles = this._getFromStorage('rewards_profiles', []);
    if (profiles.length === 0) {
      const accounts = this._getCurrentUserAccounts();
      const eligibleAccountIds = accounts
        .filter((a) => a.rewards_eligible)
        .map((a) => a.id);
      const newProfile = {
        id: this._generateId('rewards_profile'),
        total_points_available: 0,
        total_points_pending: 0,
        eligible_account_ids: eligibleAccountIds,
        last_updated_at: this._nowISO()
      };
      profiles.push(newProfile);
      this._saveToStorage('rewards_profiles', profiles);
      return newProfile;
    }
    return profiles[0];
  }

  _validateTransferRequest(fromAccountId, toAccountId, amount) {
    const accounts = this._getFromStorage('accounts', []);
    const from = accounts.find((a) => a.id === fromAccountId);
    const to = accounts.find((a) => a.id === toAccountId);

    if (!from) {
      return { valid: false, message: 'Source account not found.' };
    }
    if (!to) {
      return { valid: false, message: 'Destination account not found.' };
    }
    if (from.status !== 'open' || to.status !== 'open') {
      return { valid: false, message: 'Both accounts must be open.' };
    }
    if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
      return { valid: false, message: 'Amount must be a positive number.' };
    }
    const available = typeof from.available_balance === 'number' ? from.available_balance : from.current_balance;
    if (available != null && available < amount) {
      return { valid: false, message: 'Insufficient funds in the source account.' };
    }
    return { valid: true, message: 'Transfer is valid.' };
  }

  _selectLowestFeeDebitCardDesign() {
    const designs = this._getFromStorage('debit_card_designs', []);
    const activeDesigns = designs.filter((d) => d.is_active);
    if (activeDesigns.length === 0) return null;
    let lowest = activeDesigns[0];
    for (let i = 1; i < activeDesigns.length; i++) {
      const d = activeDesigns[i];
      if (d.replacement_fee < lowest.replacement_fee) {
        lowest = d;
      }
    }
    return lowest;
  }

  _calculateBudgetUsageForCategory(categoryBudget) {
    const transactions = this._getFromStorage('transactions', []);
    const now = new Date();
    let periodStart = null;
    let periodEnd = null;

    if (categoryBudget.period_type === 'monthly') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (categoryBudget.period_type === 'weekly') {
      const day = now.getDay(); // 0-6, Sunday-Saturday
      const diffToMonday = (day + 6) % 7; // number of days since Monday
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - diffToMonday);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);
    } else if (categoryBudget.period_type === 'yearly') {
      periodStart = new Date(now.getFullYear(), 0, 1);
      periodEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (categoryBudget.period_type === 'custom') {
      periodStart = this._parseDate(categoryBudget.start_date) || new Date(0);
      periodEnd = this._parseDate(categoryBudget.end_date) || now;
    } else {
      periodStart = new Date(0);
      periodEnd = now;
    }

    const startMs = periodStart.getTime();
    const endMs = periodEnd.getTime();

    let amountSpent = 0;
    for (const t of transactions) {
      if (t.is_pending) continue;
      if (t.category_id !== categoryBudget.category_id) continue;
      const d = this._parseDate(t.date);
      if (!d) continue;
      const ms = d.getTime();
      if (ms < startMs || ms > endMs) continue;
      amountSpent += Math.abs(t.amount || 0);
    }

    const remainingAmount = (categoryBudget.limit_amount || 0) - amountSpent;
    return { amountSpent, remainingAmount };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getDashboardSummary
  getDashboardSummary() {
    const accounts = this._getCurrentUserAccounts();
    const transactions = this._getFromStorage('transactions', []);
    const categories = this._getFromStorage('categories', []);

    const accountsById = this._indexById(accounts);
    const categoriesById = this._indexById(categories);

    const accountsSummary = accounts.map((account) => {
      const acctTxsRaw = transactions
        .filter((t) => t.account_id === account.id)
        .sort((a, b) => {
          const da = this._parseDate(a.date) || new Date(0);
          const db = this._parseDate(b.date) || new Date(0);
          return db - da;
        })
        .slice(0, 5);

      const acctTxs = this._resolveForeignKeysOnTransactions(acctTxsRaw, accountsById, categoriesById);

      const contextualActions = [];
      if (account.account_type === 'checking' || account.account_type === 'savings') {
        contextualActions.push('set_up_automatic_transfers', 'view_statements', 'manage_alerts');
      }
      if (account.account_type === 'credit_card') {
        contextualActions.push('view_statements');
        if (account.rewards_eligible) {
          contextualActions.push('redeem_rewards');
        }
      }
      if (account.account_type === 'loan') {
        contextualActions.push('view_statements');
      }

      return {
        account,
        recentTransactions: acctTxs,
        contextualActions
      };
    });

    const primaryShortcuts = [
      { id: 'shortcut_bill_pay', label: 'Bill Pay', targetPage: 'bill_pay' },
      { id: 'shortcut_transfers', label: 'Transfers', targetPage: 'transfers' },
      { id: 'shortcut_open_new_account', label: 'Open New Account', targetPage: 'open_new_account' },
      { id: 'shortcut_alerts', label: 'Alerts & Notifications', targetPage: 'alerts' },
      { id: 'shortcut_statements', label: 'Statements', targetPage: 'statements' },
      { id: 'shortcut_rewards', label: 'Card Rewards', targetPage: 'rewards' },
      { id: 'shortcut_loans', label: 'Loans & Credit', targetPage: 'loans_and_credit' },
      { id: 'shortcut_budgeting', label: 'Budgeting & Spending', targetPage: 'budgeting' }
    ];

    return { accountsSummary, primaryShortcuts };
  }

  // getAccountDetails
  getAccountDetails(accountId) {
    const accounts = this._getFromStorage('accounts', []);
    const account = accounts.find((a) => a.id === accountId) || null;

    const availableActions = [];
    if (account) {
      if (account.account_type === 'checking' || account.account_type === 'savings') {
        availableActions.push('set_up_automatic_transfers', 'view_statements', 'manage_alerts');
      }
      if (account.account_type === 'credit_card') {
        availableActions.push('view_statements');
        if (account.rewards_eligible) {
          availableActions.push('redeem_rewards');
        }
      }
      if (account.account_type === 'loan') {
        availableActions.push('view_statements');
      }
    }

    return { account, availableActions };
  }

  // getAccountTransactions
  getAccountTransactions(accountId, dateRangePreset, startDate, endDate, categoryId, minAmount, maxAmount, sortBy, sortDirection, includePending) {
    const allTransactions = this._getFromStorage('transactions', []);
    const categories = this._getFromStorage('categories', []);
    const accounts = this._getFromStorage('accounts', []);

    const accountsById = this._indexById(accounts);
    const categoriesById = this._indexById(categories);

    let filtered = allTransactions.filter((t) => t.account_id === accountId);

    // Date filtering
    let appliedDateRangePreset = dateRangePreset || 'all';
    let start = null;
    let end = null;

    if (dateRangePreset === 'last_30_days') {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 30);
    } else if (dateRangePreset === 'last_60_days') {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 60);
    } else if (dateRangePreset === 'custom') {
      start = this._parseDate(startDate) || null;
      end = this._parseDate(endDate) || null;
    }

    if (start || end) {
      const startMs = start ? start.getTime() : null;
      const endMs = end ? end.getTime() : null;
      filtered = filtered.filter((t) => {
        const d = this._parseDate(t.date);
        if (!d) return false;
        const ms = d.getTime();
        if (startMs != null && ms < startMs) return false;
        if (endMs != null && ms > endMs) return false;
        return true;
      });
    }

    // Category filter
    let categoryName = null;
    if (categoryId) {
      filtered = filtered.filter((t) => t.category_id === categoryId);
      const cat = categoriesById[categoryId];
      categoryName = cat ? cat.name : null;
    }

    // Amount filter
    if (typeof minAmount === 'number') {
      filtered = filtered.filter((t) => Math.abs(t.amount || 0) >= minAmount);
    }
    if (typeof maxAmount === 'number') {
      filtered = filtered.filter((t) => Math.abs(t.amount || 0) <= maxAmount);
    }

    // Pending filter
    if (!includePending) {
      filtered = filtered.filter((t) => !t.is_pending);
    }

    // Sorting
    const sortField = sortBy || 'date';
    const direction = sortDirection === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      let av = a[sortField];
      let bv = b[sortField];
      if (sortField === 'date') {
        av = this._parseDate(a.date) || new Date(0);
        bv = this._parseDate(b.date) || new Date(0);
        return (av - bv) * direction;
      }
      if (sortField === 'amount') {
        av = a.amount || 0;
        bv = b.amount || 0;
        return (av - bv) * direction;
      }
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * direction;
      }
      return 0;
    });

    const resolved = this._resolveForeignKeysOnTransactions(filtered, accountsById, categoriesById);

    return {
      transactions: resolved,
      appliedFilters: {
        dateRangePreset: appliedDateRangePreset,
        startDate: startDate || null,
        endDate: endDate || null,
        categoryName,
        minAmount: typeof minAmount === 'number' ? minAmount : null,
        maxAmount: typeof maxAmount === 'number' ? maxAmount : null
      },
      totalCount: resolved.length
    };
  }

  // updateTransactionNote
  updateTransactionNote(transactionId, note) {
    const transactions = this._getFromStorage('transactions', []);
    const categories = this._getFromStorage('categories', []);
    const accounts = this._getFromStorage('accounts', []);

    const accountsById = this._indexById(accounts);
    const categoriesById = this._indexById(categories);

    const idx = transactions.findIndex((t) => t.id === transactionId);
    if (idx === -1) {
      return { success: false, message: 'Transaction not found.', transaction: null };
    }

    transactions[idx] = {
      ...transactions[idx],
      note
    };

    this._saveToStorage('transactions', transactions);

    const resolved = this._resolveForeignKeysOnTransactions([transactions[idx]], accountsById, categoriesById)[0];

    return {
      success: true,
      message: 'Transaction note updated.',
      transaction: resolved
    };
  }

  // getBillPayOverview
  getBillPayOverview() {
    const payees = this._getFromStorage('payees', []);
    const billPayments = this._getFromStorage('bill_payments', []);
    const accounts = this._getFromStorage('accounts', []);

    const accountsById = this._indexById(accounts);
    const payeesById = this._indexById(payees);

    const payeesResult = payees.map((p) => {
      const payeePayments = billPayments
        .filter((bp) => bp.payee_id === p.id)
        .sort((a, b) => {
          const da = this._parseDate(a.created_at) || new Date(0);
          const db = this._parseDate(b.created_at) || new Date(0);
          return db - da;
        });
      const lastPayment = payeePayments[0] || null;
      return {
        payee: p,
        displayAccountNumber: p.account_number_masked || '',
        lastPaymentAmount: lastPayment ? lastPayment.amount : null
      };
    });

    const upcomingPaymentsRaw = billPayments.filter((bp) => bp.status === 'scheduled');

    const upcomingPayments = upcomingPaymentsRaw.map((bp) => {
      const resolvedBillPayment = this._resolveForeignKeysOnBillPayment(bp, payeesById, accountsById);
      const payeeName = resolvedBillPayment.payee ? resolvedBillPayment.payee.name : null;
      const fromAccountNickname = resolvedBillPayment.from_account ? resolvedBillPayment.from_account.nickname : null;
      return {
        billPayment: resolvedBillPayment,
        payeeName,
        fromAccountNickname
      };
    });

    return {
      payees: payeesResult,
      upcomingPayments
    };
  }

  // getPayeePaymentFormDefaults
  getPayeePaymentFormDefaults(payeeId) {
    const payees = this._getFromStorage('payees', []);
    const billPayments = this._getFromStorage('bill_payments', []);
    const accounts = this._getFromStorage('accounts', []);

    const payee = payees.find((p) => p.id === payeeId) || null;
    const fromAccounts = accounts.filter((a) => a.account_type === 'checking' || a.account_type === 'savings');
    const defaultFromAccountId = fromAccounts.length > 0 ? fromAccounts[0].id : null;

    const payeePayments = billPayments
      .filter((bp) => bp.payee_id === payeeId)
      .sort((a, b) => {
        const da = this._parseDate(a.created_at) || new Date(0);
        const db = this._parseDate(b.created_at) || new Date(0);
        return db - da;
      });
    const lastPayment = payeePayments[0] || null;

    const defaultAmount = lastPayment ? lastPayment.amount : 0;

    const availableFrequencies = ['one_time', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'];
    const defaultFrequency = 'one_time';

    return {
      payee,
      fromAccounts,
      defaultFromAccountId,
      defaultAmount,
      availableFrequencies,
      defaultFrequency
    };
  }

  // scheduleBillPayment
  scheduleBillPayment(payeeId, fromAccountId, amount, scheduledDate, frequency, memo) {
    const payees = this._getFromStorage('payees', []);
    const accounts = this._getFromStorage('accounts', []);
    const billPayments = this._getFromStorage('bill_payments', []);

    const accountsById = this._indexById(accounts);
    const payeesById = this._indexById(payees);

    const payee = payeesById[payeeId];
    const fromAccount = accountsById[fromAccountId];

    if (!payee) {
      return { success: false, message: 'Payee not found.', billPayment: null };
    }
    if (!fromAccount) {
      return { success: false, message: 'From account not found.', billPayment: null };
    }
    if (typeof amount !== 'number' || !isFinite(amount) || amount <= 0) {
      return { success: false, message: 'Amount must be a positive number.', billPayment: null };
    }

    const scheduled = this._parseDate(scheduledDate);
    if (!scheduled) {
      return { success: false, message: 'Invalid scheduled date.', billPayment: null };
    }

    const allowedFrequencies = ['one_time', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'];
    if (!allowedFrequencies.includes(frequency)) {
      return { success: false, message: 'Invalid frequency.', billPayment: null };
    }

    const newPayment = {
      id: this._generateId('bill_payment'),
      payee_id: payeeId,
      from_account_id: fromAccountId,
      amount,
      scheduled_date: scheduled.toISOString(),
      frequency,
      status: 'scheduled',
      memo: memo || null,
      created_at: this._nowISO(),
      last_updated_at: null
    };

    billPayments.push(newPayment);
    this._saveToStorage('bill_payments', billPayments);

    const resolved = this._resolveForeignKeysOnBillPayment(newPayment, payeesById, accountsById);

    return {
      success: true,
      message: 'Bill payment scheduled.',
      billPayment: resolved
    };
  }

  // getTransfersOverview
  getTransfersOverview() {
    const accounts = this._getFromStorage('accounts', []);
    const transferSchedules = this._getFromStorage('transfer_schedules', []);

    const accountsById = this._indexById(accounts);

    const transferableAccounts = accounts.filter((a) => a.account_type === 'checking' || a.account_type === 'savings');

    const scheduledTransfers = transferSchedules.map((ts) => this._resolveForeignKeysOnTransferSchedule(ts, accountsById));

    return {
      transferableAccounts,
      scheduledTransfers
    };
  }

  // createOneTimeTransfer
  createOneTimeTransfer(fromAccountId, toAccountId, amount, transferDate, memo) {
    const validation = this._validateTransferRequest(fromAccountId, toAccountId, amount);
    if (!validation.valid) {
      return { success: false, message: validation.message, transferSchedule: null };
    }

    const transferSchedules = this._getFromStorage('transfer_schedules', []);
    const accounts = this._getFromStorage('accounts', []);
    const accountsById = this._indexById(accounts);

    const date = this._parseDate(transferDate);
    if (!date) {
      return { success: false, message: 'Invalid transfer date.', transferSchedule: null };
    }

    const schedule = {
      id: this._generateId('transfer_schedule'),
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount,
      start_date: date.toISOString(),
      frequency: 'one_time',
      day_of_week: null,
      day_of_month: null,
      end_type: 'after_n_transfers',
      end_after_occurrences: 1,
      end_date: null,
      status: 'active',
      next_run_date: date.toISOString(),
      created_at: this._nowISO()
    };

    transferSchedules.push(schedule);
    this._saveToStorage('transfer_schedules', transferSchedules);

    const resolved = this._resolveForeignKeysOnTransferSchedule(schedule, accountsById);

    return {
      success: true,
      message: 'One-time transfer scheduled.',
      transferSchedule: resolved
    };
  }

  // createTransferSchedule
  createTransferSchedule(fromAccountId, toAccountId, amount, startDate, frequency, dayOfWeek, dayOfMonth, endType, endAfterOccurrences, endDate, memo) {
    const validation = this._validateTransferRequest(fromAccountId, toAccountId, amount);
    if (!validation.valid) {
      return { success: false, message: validation.message, transferSchedule: null };
    }

    const allowedFrequencies = ['one_time', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually'];
    if (!allowedFrequencies.includes(frequency)) {
      return { success: false, message: 'Invalid frequency.', transferSchedule: null };
    }

    const allowedEndTypes = ['no_end', 'after_n_transfers', 'end_date'];
    if (!allowedEndTypes.includes(endType)) {
      return { success: false, message: 'Invalid end type.', transferSchedule: null };
    }

    const start = this._parseDate(startDate);
    if (!start) {
      return { success: false, message: 'Invalid start date.', transferSchedule: null };
    }

    let endDateISO = null;
    if (endType === 'end_date') {
      const ed = this._parseDate(endDate);
      if (!ed) {
        return { success: false, message: 'Invalid end date.', transferSchedule: null };
      }
      endDateISO = ed.toISOString();
    }

    const transferSchedules = this._getFromStorage('transfer_schedules', []);
    const accounts = this._getFromStorage('accounts', []);
    const accountsById = this._indexById(accounts);

    const schedule = {
      id: this._generateId('transfer_schedule'),
      from_account_id: fromAccountId,
      to_account_id: toAccountId,
      amount,
      start_date: start.toISOString(),
      frequency,
      day_of_week: dayOfWeek || null,
      day_of_month: typeof dayOfMonth === 'number' ? dayOfMonth : null,
      end_type: endType,
      end_after_occurrences: endType === 'after_n_transfers' ? endAfterOccurrences || null : null,
      end_date: endDateISO,
      status: 'active',
      next_run_date: start.toISOString(),
      created_at: this._nowISO()
    };

    transferSchedules.push(schedule);
    this._saveToStorage('transfer_schedules', transferSchedules);

    const resolved = this._resolveForeignKeysOnTransferSchedule(schedule, accountsById);

    return {
      success: true,
      message: 'Transfer schedule created.',
      transferSchedule: resolved
    };
  }

  // getOpenNewAccountOptions
  getOpenNewAccountOptions() {
    const fundingAccounts = this._getCurrentUserAccounts().filter(
      (a) => a.account_type === 'checking' || a.account_type === 'savings'
    );

    const depositAccountTypes = [
      { code: 'savings', name: 'Savings Account', allowsSubAccounts: true },
      { code: 'checking', name: 'Checking Account', allowsSubAccounts: false }
    ];

    return {
      depositAccountTypes,
      fundingAccounts
    };
  }

  // openDepositAccount
  openDepositAccount(accountType, isSubAccount, parentAccountId, nickname, openingDepositAmount, fundingAccountId) {
    const allowedTypes = ['savings', 'checking'];
    if (!allowedTypes.includes(accountType)) {
      return { success: false, message: 'Invalid account type.', newAccount: null };
    }

    if (!nickname) {
      return { success: false, message: 'Nickname is required.', newAccount: null };
    }

    const accounts = this._getFromStorage('accounts', []);

    if (isSubAccount && parentAccountId) {
      const parent = accounts.find((a) => a.id === parentAccountId);
      if (!parent) {
        return { success: false, message: 'Parent account not found.', newAccount: null };
      }
    }

    const id = this._generateId('account');
    const counterStr = String(this._getNextIdCounter());
    const last4 = counterStr.slice(-4).padStart(4, '0');

    const openingAmount = typeof openingDepositAmount === 'number' && isFinite(openingDepositAmount)
      ? openingDepositAmount
      : 0;

    const newAccount = {
      id,
      nickname,
      account_number_masked: '...' + last4,
      full_account_number: null,
      account_type: accountType === 'savings' ? 'savings' : 'checking',
      is_sub_account: !!isSubAccount,
      parent_account_id: isSubAccount ? parentAccountId || null : null,
      current_balance: openingAmount,
      available_balance: openingAmount,
      credit_limit: null,
      apr_percent: null,
      rewards_eligible: false,
      status: 'open',
      routing_number: null,
      opened_date: this._nowISO()
    };

    accounts.push(newAccount);
    this._saveToStorage('accounts', accounts);

    // Optionally adjust funding account balances could be added here if desired.

    return {
      success: true,
      message: 'Deposit account opened.',
      newAccount
    };
  }

  // getRewardsOverview
  getRewardsOverview() {
    const rewardsProfile = this._getCurrentUserRewardsProfile();
    const accounts = this._getFromStorage('accounts', []);
    const accountsById = this._indexById(accounts);

    const eligibleCards = (rewardsProfile.eligible_account_ids || []).map((accountId) => {
      const account = accountsById[accountId] || null;
      return {
        account,
        currentAprPercent: account ? account.apr_percent || null : null
      };
    });

    return {
      rewardsProfile,
      eligibleCards
    };
  }

  // redeemRewardsPoints
  redeemRewardsPoints(redemptionType, points, targetAccountId) {
    const allowedTypes = ['statement_credit', 'travel', 'gift_card', 'merchandise', 'cashback', 'other'];
    if (!allowedTypes.includes(redemptionType)) {
      return { success: false, message: 'Invalid redemption type.', rewardRedemption: null };
    }

    if (typeof points !== 'number' || !isFinite(points) || points <= 0) {
      return { success: false, message: 'Points must be a positive number.', rewardRedemption: null };
    }

    const profile = this._getCurrentUserRewardsProfile();
    if (points > profile.total_points_available) {
      return { success: false, message: 'Insufficient points.', rewardRedemption: null };
    }

    if (profile.eligible_account_ids && profile.eligible_account_ids.length > 0) {
      if (!profile.eligible_account_ids.includes(targetAccountId)) {
        return { success: false, message: 'Target account is not eligible for rewards.', rewardRedemption: null };
      }
    }

    const rewardRedemptions = this._getFromStorage('reward_redemptions', []);
    const rewardsProfiles = this._getFromStorage('rewards_profiles', []);
    const accounts = this._getFromStorage('accounts', []);

    const rewardsProfilesById = this._indexById(rewardsProfiles);
    const accountsById = this._indexById(accounts);

    const redemption = {
      id: this._generateId('reward_redemption'),
      rewards_profile_id: profile.id,
      redemption_type: redemptionType,
      points_redeemed: points,
      target_account_id: targetAccountId,
      created_at: this._nowISO(),
      status: 'pending',
      confirmation_number: this._generateId('CONF')
    };

    rewardRedemptions.push(redemption);

    // Update profile points and save
    const profileIdx = rewardsProfiles.findIndex((p) => p.id === profile.id);
    if (profileIdx !== -1) {
      rewardsProfiles[profileIdx] = {
        ...rewardsProfiles[profileIdx],
        total_points_available: (rewardsProfiles[profileIdx].total_points_available || 0) - points,
        last_updated_at: this._nowISO()
      };
    }

    this._saveToStorage('reward_redemptions', rewardRedemptions);
    this._saveToStorage('rewards_profiles', rewardsProfiles);

    const resolved = this._resolveForeignKeysOnRewardRedemption(redemption, rewardsProfilesById, accountsById);

    return {
      success: true,
      message: 'Reward redemption submitted.',
      rewardRedemption: resolved
    };
  }

  // getCardServicesOverview
  getCardServicesOverview() {
    const availableActions = [
      {
        id: 'replace_debit_card',
        label: 'Replace Debit Card',
        description: 'Order a replacement debit card for your checking accounts.'
      }
    ];

    return { availableActions };
  }

  // getReplacementEligibleDebitAccounts
  getReplacementEligibleDebitAccounts() {
    const accounts = this._getFromStorage('accounts', []);
    // Assuming checking accounts are debit-card-bearing
    return accounts.filter((a) => a.account_type === 'checking' && a.status === 'open');
  }

  // getDebitCardDesignOptions
  getDebitCardDesignOptions() {
    const designs = this._getFromStorage('debit_card_designs', []);
    return designs;
  }

  // orderDebitCardReplacement
  orderDebitCardReplacement(accountId, cardDesignId, shippingMethod) {
    const accounts = this._getFromStorage('accounts', []);
    const designs = this._getFromStorage('debit_card_designs', []);
    const orders = this._getFromStorage('card_replacement_orders', []);

    const accountsById = this._indexById(accounts);
    const designsById = this._indexById(designs);

    const account = accountsById[accountId];
    if (!account) {
      return { success: false, message: 'Account not found.', cardReplacementOrder: null };
    }

    const design = designsById[cardDesignId];
    if (!design) {
      return { success: false, message: 'Card design not found.', cardReplacementOrder: null };
    }

    const allowedShippingMethods = ['standard_mail_free', 'expedited', 'overnight'];
    if (!allowedShippingMethods.includes(shippingMethod)) {
      return { success: false, message: 'Invalid shipping method.', cardReplacementOrder: null };
    }

    let shippingFee = 0;
    if (shippingMethod === 'expedited' || shippingMethod === 'overnight') {
      // Fee could be looked up from fees_and_rates in a more advanced implementation
      shippingFee = 0;
    }

    const order = {
      id: this._generateId('card_replacement_order'),
      account_id: accountId,
      card_design_id: cardDesignId,
      shipping_method: shippingMethod,
      shipping_fee: shippingFee,
      order_date: this._nowISO(),
      status: 'submitted',
      tracking_number: null
    };

    orders.push(order);
    this._saveToStorage('card_replacement_orders', orders);

    const resolved = this._resolveForeignKeysOnCardReplacementOrder(order, accountsById, designsById);

    return {
      success: true,
      message: 'Debit card replacement ordered.',
      cardReplacementOrder: resolved
    };
  }

  // getAlertsOverview
  getAlertsOverview() {
    const alerts = this._getFromStorage('alerts', []);
    const accounts = this._getFromStorage('accounts', []);
    const accountsById = this._indexById(accounts);

    const result = alerts.map((alert) => {
      const resolvedAlert = this._resolveForeignKeysOnAlert(alert, accountsById);
      const account = accountsById[alert.account_id];
      return {
        alert: resolvedAlert,
        accountNickname: account ? account.nickname : null
      };
    });

    return { alerts: result };
  }

  // createBalanceAlert
  createBalanceAlert(accountId, thresholdAmount, condition, frequency, deliveryChannels) {
    const accounts = this._getFromStorage('accounts', []);
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      return { success: false, alert: null };
    }

    if (typeof thresholdAmount !== 'number' || !isFinite(thresholdAmount) || thresholdAmount <= 0) {
      return { success: false, alert: null };
    }

    const allowedConditions = ['below_amount', 'above_amount'];
    if (!allowedConditions.includes(condition)) {
      return { success: false, alert: null };
    }

    const allowedFrequencies = ['immediate', 'once_per_day', 'once_per_week', 'once_per_month'];
    if (!allowedFrequencies.includes(frequency)) {
      return { success: false, alert: null };
    }

    const allowedChannels = ['email', 'sms', 'push'];
    const channels = (deliveryChannels || []).filter((c) => allowedChannels.includes(c));
    if (channels.length === 0) {
      return { success: false, alert: null };
    }

    const alerts = this._getFromStorage('alerts', []);
    const newAlert = {
      id: this._generateId('alert'),
      alert_type: 'balance',
      account_id: accountId,
      threshold_amount: thresholdAmount,
      condition,
      frequency,
      delivery_channels: channels,
      is_active: true,
      created_at: this._nowISO()
    };

    alerts.push(newAlert);
    this._saveToStorage('alerts', alerts);

    const accountsById = this._indexById(accounts);
    const resolved = this._resolveForeignKeysOnAlert(newAlert, accountsById);

    return { success: true, alert: resolved };
  }

  // createTransactionAlert
  createTransactionAlert(accountId, thresholdAmount, condition, frequency, deliveryChannels) {
    const accounts = this._getFromStorage('accounts', []);
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      return { success: false, alert: null };
    }

    if (typeof thresholdAmount !== 'number' || !isFinite(thresholdAmount) || thresholdAmount <= 0) {
      return { success: false, alert: null };
    }

    const allowedConditions = [
      'withdrawals_over_amount',
      'deposits_over_amount',
      'any_withdrawal',
      'any_deposit'
    ];
    if (!allowedConditions.includes(condition)) {
      return { success: false, alert: null };
    }

    const allowedFrequencies = ['immediate', 'once_per_day', 'once_per_week', 'once_per_month'];
    if (!allowedFrequencies.includes(frequency)) {
      return { success: false, alert: null };
    }

    const allowedChannels = ['email', 'sms', 'push'];
    const channels = (deliveryChannels || []).filter((c) => allowedChannels.includes(c));
    if (channels.length === 0) {
      return { success: false, alert: null };
    }

    const alerts = this._getFromStorage('alerts', []);
    const newAlert = {
      id: this._generateId('alert'),
      alert_type: 'transaction',
      account_id: accountId,
      threshold_amount: thresholdAmount,
      condition,
      frequency,
      delivery_channels: channels,
      is_active: true,
      created_at: this._nowISO()
    };

    alerts.push(newAlert);
    this._saveToStorage('alerts', alerts);

    const accountsById = this._indexById(accounts);
    const resolved = this._resolveForeignKeysOnAlert(newAlert, accountsById);

    return { success: true, alert: resolved };
  }

  // updateAlertStatus
  updateAlertStatus(alertId, isActive) {
    const alerts = this._getFromStorage('alerts', []);
    const idx = alerts.findIndex((a) => a.id === alertId);
    if (idx === -1) {
      return { success: false, alert: null };
    }

    alerts[idx] = {
      ...alerts[idx],
      is_active: !!isActive
    };

    this._saveToStorage('alerts', alerts);

    const accounts = this._getFromStorage('accounts', []);
    const accountsById = this._indexById(accounts);
    const resolved = this._resolveForeignKeysOnAlert(alerts[idx], accountsById);

    return { success: true, alert: resolved };
  }

  // getBudgetOverview
  getBudgetOverview() {
    const categoryBudgets = this._getFromStorage('category_budgets', []);
    const categories = this._getFromStorage('categories', []);
    const categoriesById = this._indexById(categories);

    const result = categoryBudgets.map((cb) => {
      const resolvedBudget = this._resolveForeignKeysOnCategoryBudget(cb, categoriesById);
      const usage = this._calculateBudgetUsageForCategory(cb);
      return {
        categoryBudget: resolvedBudget,
        amountSpent: usage.amountSpent,
        remainingAmount: usage.remainingAmount
      };
    });

    return { categoryBudgets: result };
  }

  // getAvailableBudgetCategories
  getAvailableBudgetCategories() {
    const categories = this._getFromStorage('categories', []);
    return categories;
  }

  // createCategoryBudget
  createCategoryBudget(categoryId, periodType, limitAmount, startDate, endDate) {
    const categories = this._getFromStorage('categories', []);
    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      return { success: false, categoryBudget: null };
    }

    const allowedPeriodTypes = ['monthly', 'weekly', 'yearly', 'custom'];
    if (!allowedPeriodTypes.includes(periodType)) {
      return { success: false, categoryBudget: null };
    }

    if (typeof limitAmount !== 'number' || !isFinite(limitAmount) || limitAmount <= 0) {
      return { success: false, categoryBudget: null };
    }

    let startISO = null;
    let endISO = null;
    if (startDate) {
      const sd = this._parseDate(startDate);
      if (sd) startISO = sd.toISOString();
    }
    if (endDate) {
      const ed = this._parseDate(endDate);
      if (ed) endISO = ed.toISOString();
    }

    const categoryBudgets = this._getFromStorage('category_budgets', []);
    const newBudget = {
      id: this._generateId('category_budget'),
      category_id: categoryId,
      category_name: category.name || null,
      period_type: periodType,
      limit_amount: limitAmount,
      start_date: startISO,
      end_date: endISO,
      status: 'active',
      created_at: this._nowISO()
    };

    categoryBudgets.push(newBudget);
    this._saveToStorage('category_budgets', categoryBudgets);

    const categoriesById = this._indexById(categories);
    const resolved = this._resolveForeignKeysOnCategoryBudget(newBudget, categoriesById);

    return { success: true, categoryBudget: resolved };
  }

  // getBudgetingTransactions
  getBudgetingTransactions(dateRangePreset, startDate, endDate, categoryId, minAmount, maxAmount) {
    const transactions = this._getFromStorage('transactions', []);
    const accounts = this._getFromStorage('accounts', []);
    const categories = this._getFromStorage('categories', []);

    const accountsById = this._indexById(accounts);
    const categoriesById = this._indexById(categories);

    let filtered = transactions.slice();

    // Date range
    let appliedPreset = dateRangePreset || 'all';
    let start = null;
    let end = null;

    if (dateRangePreset === 'last_30_days') {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 30);
    } else if (dateRangePreset === 'last_60_days') {
      end = new Date();
      start = new Date();
      start.setDate(end.getDate() - 60);
    } else if (dateRangePreset === 'custom') {
      start = this._parseDate(startDate) || null;
      end = this._parseDate(endDate) || null;
    }

    if (start || end) {
      const startMs = start ? start.getTime() : null;
      const endMs = end ? end.getTime() : null;
      filtered = filtered.filter((t) => {
        const d = this._parseDate(t.date);
        if (!d) return false;
        const ms = d.getTime();
        if (startMs != null && ms < startMs) return false;
        if (endMs != null && ms > endMs) return false;
        return true;
      });
    }

    // Category filter
    let categoryName = null;
    if (categoryId) {
      filtered = filtered.filter((t) => t.category_id === categoryId);
      const cat = categoriesById[categoryId];
      categoryName = cat ? cat.name : null;
    }

    // Amount filters
    if (typeof minAmount === 'number') {
      filtered = filtered.filter((t) => Math.abs(t.amount || 0) >= minAmount);
    }
    if (typeof maxAmount === 'number') {
      filtered = filtered.filter((t) => Math.abs(t.amount || 0) <= maxAmount);
    }

    const resolved = this._resolveForeignKeysOnTransactions(filtered, accountsById, categoriesById);

    return {
      transactions: resolved,
      appliedFilters: {
        dateRangePreset: appliedPreset,
        categoryName
      }
    };
  }

  // recategorizeTransactions
  recategorizeTransactions(transactionIds, newCategoryId) {
    const transactions = this._getFromStorage('transactions', []);
    const categories = this._getFromStorage('categories', []);
    const accounts = this._getFromStorage('accounts', []);

    const category = categories.find((c) => c.id === newCategoryId);
    if (!category) {
      return { success: false, updatedTransactions: [] };
    }

    const updated = [];
    for (let i = 0; i < transactions.length; i++) {
      const t = transactions[i];
      if (!transactionIds.includes(t.id)) continue;
      const originalCategoryName = t.category_name || null;
      transactions[i] = {
        ...t,
        original_category_name: originalCategoryName,
        category_id: newCategoryId,
        category_name: category.name
      };
      updated.push(transactions[i]);
    }

    this._saveToStorage('transactions', transactions);

    const accountsById = this._indexById(accounts);
    const categoriesById = this._indexById(categories);

    const resolvedUpdated = this._resolveForeignKeysOnTransactions(updated, accountsById, categoriesById);

    return { success: true, updatedTransactions: resolvedUpdated };
  }

  // getLoansOverview
  getLoansOverview() {
    const loanProducts = this._getFromStorage('loan_products', []);
    const prequalifiedOffers = this._getFromStorage('loan_offers', []);

    return {
      loanProducts,
      prequalifiedOffers
    };
  }

  // startPersonalLoanApplication
  startPersonalLoanApplication(loanPurpose) {
    const allOffers = this._getFromStorage('loan_offers', []);

    // Normalize user-entered purpose (e.g., "Debt Consolidation" -> "debt_consolidation")
    const normalizedInput = (loanPurpose || '').toString().trim().toLowerCase();
    const normalizedKey = normalizedInput.replace(/\s+/g, '_');

    const offers = allOffers.filter((o) => {
      if (o.loan_type !== 'personal') return false;
      // If no specific purpose provided, return all personal loan offers
      if (!normalizedInput) return true;

      const offerPurpose = (o.purpose || '').toString().trim().toLowerCase();
      const offerPurposeKey = offerPurpose.replace(/\s+/g, '_');

      // Match on raw or normalized purpose, or allow generic offers with no purpose
      return !offerPurpose || offerPurpose === normalizedInput || offerPurposeKey === normalizedKey;
    });

    return {
      offers,
      purpose: loanPurpose
    };
  }

  // selectLoanOfferAndSubmitApplication
  selectLoanOfferAndSubmitApplication(loanOfferId, purpose, annualIncome, employmentStatus, agreedToTerms) {
    const offers = this._getFromStorage('loan_offers', []);
    const offer = offers.find((o) => o.id === loanOfferId);
    if (!offer) {
      return { success: false, message: 'Loan offer not found.', loanApplication: null };
    }

    if (typeof annualIncome !== 'number' || !isFinite(annualIncome) || annualIncome <= 0) {
      return { success: false, message: 'Annual income must be a positive number.', loanApplication: null };
    }

    const allowedEmploymentStatuses = [
      'full_time',
      'part_time',
      'self_employed',
      'unemployed',
      'retired',
      'student',
      'other'
    ];
    if (!allowedEmploymentStatuses.includes(employmentStatus)) {
      return { success: false, message: 'Invalid employment status.', loanApplication: null };
    }

    if (!agreedToTerms) {
      return { success: false, message: 'You must agree to the terms.', loanApplication: null };
    }

    const loanApplications = this._getFromStorage('loan_applications', []);

    const application = {
      id: this._generateId('loan_application'),
      loan_offer_id: loanOfferId,
      loan_type: offer.loan_type,
      purpose,
      annual_income: annualIncome,
      employment_status: employmentStatus,
      agreed_to_terms: true,
      status: 'submitted',
      submitted_at: this._nowISO(),
      decision_at: null
    };

    loanApplications.push(application);
    this._saveToStorage('loan_applications', loanApplications);

    const offersById = this._indexById(offers);
    const resolved = this._resolveForeignKeysOnLoanApplication(application, offersById);

    return {
      success: true,
      message: 'Loan application submitted.',
      loanApplication: resolved
    };
  }

  // getStatementsList
  getStatementsList(accountId) {
    const statements = this._getFromStorage('statement_documents', []);
    const accounts = this._getFromStorage('accounts', []);
    const accountsById = this._indexById(accounts);

    const filtered = statements
      .filter((s) => s.account_id === accountId)
      .sort((a, b) => {
        const da = this._parseDate(a.period_end_date) || new Date(0);
        const db = this._parseDate(b.period_end_date) || new Date(0);
        return db - da;
      });

    const resolved = filtered.map((s) => this._resolveForeignKeysOnStatementDocument(s, accountsById));

    return { statements: resolved };
  }

  // getStatementDocument
  getStatementDocument(statementId) {
    const statements = this._getFromStorage('statement_documents', []);
    const idx = statements.findIndex((s) => s.id === statementId);
    if (idx === -1) {
      return { statement: null };
    }

    statements[idx] = {
      ...statements[idx],
      last_opened_at: this._nowISO()
    };
    this._saveToStorage('statement_documents', statements);

    const accounts = this._getFromStorage('accounts', []);
    const accountsById = this._indexById(accounts);

    const resolved = this._resolveForeignKeysOnStatementDocument(statements[idx], accountsById);

    return { statement: resolved };
  }

  // getDocumentPreferencesOverview
  getDocumentPreferencesOverview() {
    const documentPreferences = this._getFromStorage('document_preferences', []);
    const accounts = this._getFromStorage('accounts', []);
    const accountsById = this._indexById(accounts);

    const preferences = documentPreferences.map((dp) => {
      const resolvedDP = this._resolveForeignKeysOnDocumentPreference(dp, accountsById);
      return {
        documentPreference: resolvedDP,
        account: accountsById[dp.account_id] || null
      };
    });

    return { preferences };
  }

  // updateDocumentPreference
  updateDocumentPreference(accountId, deliveryMethod) {
    const allowedMethods = ['paper_only', 'electronic_only', 'paper_and_electronic'];
    if (!allowedMethods.includes(deliveryMethod)) {
      return { success: false, message: 'Invalid delivery method.', documentPreference: null };
    }

    const accounts = this._getFromStorage('accounts', []);
    const account = accounts.find((a) => a.id === accountId);
    if (!account) {
      return { success: false, message: 'Account not found.', documentPreference: null };
    }

    const documentPreferences = this._getFromStorage('document_preferences', []);
    let dpIdx = documentPreferences.findIndex((dp) => dp.account_id === accountId);

    let docPref;
    if (dpIdx === -1) {
      docPref = {
        id: this._generateId('document_preference'),
        account_id: accountId,
        delivery_method: deliveryMethod,
        updated_at: this._nowISO()
      };
      documentPreferences.push(docPref);
      dpIdx = documentPreferences.length - 1;
    } else {
      docPref = {
        ...documentPreferences[dpIdx],
        delivery_method: deliveryMethod,
        updated_at: this._nowISO()
      };
      documentPreferences[dpIdx] = docPref;
    }

    this._saveToStorage('document_preferences', documentPreferences);

    const accountsById = this._indexById(accounts);
    const resolved = this._resolveForeignKeysOnDocumentPreference(docPref, accountsById);

    return {
      success: true,
      message: 'Document preference updated.',
      documentPreference: resolved
    };
  }

  // getSettingsOverview
  getSettingsOverview() {
    const accounts = this._getFromStorage('accounts', []);
    const documentPreferences = this._getFromStorage('document_preferences', []);
    const alerts = this._getFromStorage('alerts', []);

    const dpByAccountId = {};
    for (const dp of documentPreferences) {
      dpByAccountId[dp.account_id] = dp;
    }

    const alertsByAccountId = {};
    for (const alert of alerts) {
      if (!alertsByAccountId[alert.account_id]) {
        alertsByAccountId[alert.account_id] = [];
      }
      if (alert.is_active) {
        alertsByAccountId[alert.account_id].push(alert);
      }
    }

    // Sections
    const hasAnyNonElectronic = accounts.some((acc) => {
      const dp = dpByAccountId[acc.id];
      return !dp || dp.delivery_method !== 'electronic_only';
    });

    const sections = [
      {
        id: 'document_preferences',
        label: 'Statements & Notices',
        description: 'Manage statement and document delivery preferences.',
        hasAttention: hasAnyNonElectronic
      },
      {
        id: 'alerts',
        label: 'Alerts & Notifications',
        description: 'Manage balance and transaction alerts.',
        hasAttention: alerts.length === 0
      }
    ];

    const eStatementStatusSummary = accounts.map((acc) => {
      const dp = dpByAccountId[acc.id];
      return {
        accountNickname: acc.nickname,
        deliveryMethod: dp ? dp.delivery_method : 'paper_only'
      };
    });

    const alertsStatusSummary = accounts.map((acc) => {
      const actives = alertsByAccountId[acc.id] || [];
      return {
        accountNickname: acc.nickname,
        activeAlertCount: actives.length
      };
    });

    return {
      sections,
      eStatementStatusSummary,
      alertsStatusSummary
    };
  }

  // getHelpTopics
  getHelpTopics() {
    const topics = this._getFromStorage('help_topics', []);
    return { topics };
  }

  // searchHelpArticles
  searchHelpArticles(query, category) {
    const articles = this._getFromStorage('help_articles', []);
    const q = (query || '').toLowerCase();
    const cat = category || null;

    const results = articles
      .filter((a) => {
        if (cat && a.category !== cat) return false;
        if (!q) return true;
        const text = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.content || '')).toLowerCase();
        return text.indexOf(q) !== -1;
      })
      .map((a) => ({
        id: a.id,
        title: a.title,
        category: a.category,
        excerpt: a.summary || ''
      }));

    return { results };
  }

  // getSupportContactChannels
  getSupportContactChannels() {
    const data = this._getObjectFromStorage('support_contact_channels', {});
    return {
      phoneNumbers: data.phoneNumbers || [],
      secureMessagingAvailable: !!data.secureMessagingAvailable,
      businessHours: data.businessHours || ''
    };
  }

  // getAboutCreditUnionContent
  getAboutCreditUnionContent() {
    const data = this._getObjectFromStorage('about_credit_union_content', {});
    return {
      headline: data.headline || '',
      bodySections: data.bodySections || [],
      communityInvolvementHighlights: data.communityInvolvementHighlights || []
    };
  }

  // getFeesAndRates
  getFeesAndRates() {
    const data = this._getObjectFromStorage('fees_and_rates', {});
    return {
      feeSchedules: data.feeSchedules || [],
      rateTables: data.rateTables || []
    };
  }

  // getPrivacyAndSecurityContent
  getPrivacyAndSecurityContent() {
    const data = this._getObjectFromStorage('privacy_and_security_content', {});
    return {
      privacyPolicyHtml: data.privacyPolicyHtml || '',
      securityPracticesHtml: data.securityPracticesHtml || '',
      fraudPreventionTips: data.fraudPreventionTips || []
    };
  }

  // getContactInfo
  getContactInfo() {
    const data = this._getObjectFromStorage('contact_info', {});
    return {
      phoneNumbers: data.phoneNumbers || [],
      emailAddresses: data.emailAddresses || [],
      branchLocations: data.branchLocations || [],
      selfServiceSuggestionText: data.selfServiceSuggestionText || ''
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
