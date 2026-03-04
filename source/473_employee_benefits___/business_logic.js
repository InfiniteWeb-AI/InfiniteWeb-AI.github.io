// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

  _initStorage() {
    const tables = [
      'retirement_contribution_settings',
      'auto_increase_rules',
      'retirement_calculator_scenarios',
      'investment_funds',
      'investment_portfolios',
      'portfolio_allocations',
      'favorite_funds',
      'beneficiaries',
      'health_plans',
      'health_enrollments',
      'profile_settings',
      'pension_statements',
      'pending_contribution_changes',
      'pending_health_enrollments'
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

  // ====== Internal helpers required by spec ======

  _getOrCreateRetirementContributionSettings() {
    let settingsArr = this._getFromStorage('retirement_contribution_settings');
    if (settingsArr.length === 0) {
      const now = this._nowIso();
      const newSettings = {
        id: this._generateId('retirement_settings'),
        contributionRatePercent: 0,
        monthlyContributionAmount: 0,
        payFrequency: 'monthly',
        autoIncreaseEnabled: false,
        createdAt: now,
        updatedAt: now
      };
      settingsArr.push(newSettings);
      this._saveToStorage('retirement_contribution_settings', settingsArr);
      return newSettings;
    }
    return settingsArr[0];
  }

  _saveRetirementContributionSettings(settings) {
    const arr = this._getFromStorage('retirement_contribution_settings');
    const idx = arr.findIndex(s => s.id === settings.id);
    if (idx === -1) {
      arr.push(settings);
    } else {
      arr[idx] = settings;
    }
    this._saveToStorage('retirement_contribution_settings', arr);
  }

  _getOrCreateInvestmentPortfolio() {
    let portfolios = this._getFromStorage('investment_portfolios');
    if (portfolios.length === 0) {
      const now = this._nowIso();
      const portfolio = {
        id: this._generateId('portfolio'),
        name: 'My Retirement Portfolio',
        description: '',
        totalBalance: 0,
        lastUpdatedAt: now
      };
      portfolios.push(portfolio);
      this._saveToStorage('investment_portfolios', portfolios);
      return portfolio;
    }
    return portfolios[0];
  }

  _saveInvestmentPortfolio(portfolio) {
    const portfolios = this._getFromStorage('investment_portfolios');
    const idx = portfolios.findIndex(p => p.id === portfolio.id);
    if (idx === -1) {
      portfolios.push(portfolio);
    } else {
      portfolios[idx] = portfolio;
    }
    this._saveToStorage('investment_portfolios', portfolios);
  }

  _calculateRetirementProjectionInternal(retirementAge, monthlyContribution) {
    // Simple compound interest projection: contributions until retirementAge
    const currentAge = 40; // assumption for projection math
    const years = Math.max(0, retirementAge - currentAge);
    const annualRate = 0.05; // 5% assumed
    const monthlyRate = annualRate / 12;
    const n = years * 12;
    let fv = 0;
    if (monthlyRate === 0) {
      fv = monthlyContribution * n;
    } else {
      fv = monthlyContribution * ((Math.pow(1 + monthlyRate, n) - 1) / monthlyRate);
    }
    return Math.round(fv);
  }

  _validatePortfolioAllocations(allocations) {
    const warnings = [];
    let total = 0;
    for (const alloc of allocations) {
      const effective = typeof alloc.pendingAllocationPercent === 'number'
        ? alloc.pendingAllocationPercent
        : alloc.currentAllocationPercent || 0;
      if (effective < 0) {
        warnings.push('Allocation percent cannot be negative.');
      }
      if (effective > 100) {
        warnings.push('Allocation percent cannot exceed 100%.');
      }
      total += effective;
    }
    const epsilon = 0.0001;
    if (Math.abs(total - 100) > epsilon && allocations.length > 0) {
      warnings.push('Total allocation should sum to 100%. Current total: ' + total.toFixed(2) + '%.');
    }
    return {
      isValid: warnings.length === 0,
      warnings,
      totalPendingPercent: total
    };
  }

  _getOrCreateAutoIncreaseRule() {
    const settings = this._getOrCreateRetirementContributionSettings();
    let rules = this._getFromStorage('auto_increase_rules');
    let rule = rules.find(r => r.contributionSettingsId === settings.id);
    if (!rule) {
      const now = this._nowIso();
      rule = {
        id: this._generateId('auto_increase'),
        contributionSettingsId: settings.id,
        isEnabled: false,
        increaseAmountPercent: 1,
        frequency: 'yearly',
        increaseMonth: 'january',
        maxContributionPercent: settings.contributionRatePercent || 0,
        startYear: null,
        effectiveDate: null,
        createdAt: now,
        updatedAt: now
      };
      rules.push(rule);
      this._saveToStorage('auto_increase_rules', rules);
    }
    return rule;
  }

  _saveAutoIncreaseRule(rule) {
    const rules = this._getFromStorage('auto_increase_rules');
    const idx = rules.findIndex(r => r.id === rule.id);
    if (idx === -1) {
      rules.push(rule);
    } else {
      rules[idx] = rule;
    }
    this._saveToStorage('auto_increase_rules', rules);
  }

  _getProfileSingleton() {
    let profiles = this._getFromStorage('profile_settings');
    if (profiles.length === 0) {
      const now = this._nowIso();
      const profile = {
        id: this._generateId('profile'),
        firstName: '',
        lastName: '',
        emailAddress: '',
        streetAddress: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'US',
        mobilePhone: '',
        communicationPreference: 'none',
        createdAt: now,
        updatedAt: now
      };
      profiles.push(profile);
      this._saveToStorage('profile_settings', profiles);
      return profile;
    }
    return profiles[0];
  }

  _saveProfile(profile) {
    const profiles = this._getFromStorage('profile_settings');
    const idx = profiles.findIndex(p => p.id === profile.id);
    if (idx === -1) {
      profiles.push(profile);
    } else {
      profiles[idx] = profile;
    }
    this._saveToStorage('profile_settings', profiles);
  }

  _getActiveHealthEnrollment() {
    const enrollments = this._getFromStorage('health_enrollments');
    if (enrollments.length === 0) return null;
    // Prefer active, then pending, most recently updated
    const sorted = enrollments
      .slice()
      .sort((a, b) => {
        const statusRank = status => {
          if (status === 'active') return 2;
          if (status === 'pending') return 1;
          return 0;
        };
        const srDiff = statusRank(b.enrollmentStatus) - statusRank(a.enrollmentStatus);
        if (srDiff !== 0) return srDiff;
        const da = a.lastUpdatedAt || a.submittedAt || a.effectiveDate || '1970-01-01T00:00:00Z';
        const db = b.lastUpdatedAt || b.submittedAt || b.effectiveDate || '1970-01-01T00:00:00Z';
        return db.localeCompare(da);
      });
    return sorted[0] || null;
  }

  // ====== Core interface implementations ======

  // getDashboardOverview
  getDashboardOverview() {
    const retirementSettings = this._getOrCreateRetirementContributionSettings();
    const autoRule = this._getOrCreateAutoIncreaseRule();
    const scenarios = this._getFromStorage('retirement_calculator_scenarios');
    let projectedBalance = 0;
    if (scenarios.length > 0) {
      const latest = scenarios
        .slice()
        .sort((a, b) => {
          const da = a.projectionAsOf || a.createdAt || '1970-01-01T00:00:00Z';
          const db = b.projectionAsOf || b.createdAt || '1970-01-01T00:00:00Z';
          return db.localeCompare(da);
        })[0];
      projectedBalance = latest.projectedBalanceAtRetirement || 0;
    }

    const portfolio = this._getOrCreateInvestmentPortfolio();
    const portfolioAllocations = this._getFromStorage('portfolio_allocations').filter(a => a.portfolioId === portfolio.id);
    const funds = this._getFromStorage('investment_funds');

    let primaryHoldingName = '';
    let primaryHoldingAllocationPercent = 0;
    if (portfolioAllocations.length > 0) {
      const topAlloc = portfolioAllocations
        .slice()
        .sort((a, b) => (b.currentAllocationPercent || 0) - (a.currentAllocationPercent || 0))[0];
      const fund = funds.find(f => f.id === topAlloc.fundId);
      primaryHoldingName = fund ? fund.name : '';
      primaryHoldingAllocationPercent = topAlloc.currentAllocationPercent || 0;
    }

    const activeEnrollment = this._getActiveHealthEnrollment();
    const healthPlans = this._getFromStorage('health_plans');
    let currentPlanName = '';
    let estimatedAnnualCost = 0;
    let enrollmentStatus = 'waived';
    if (activeEnrollment) {
      const plan = healthPlans.find(p => p.id === activeEnrollment.planId);
      currentPlanName = plan ? plan.name : '';
      estimatedAnnualCost = plan ? (plan.estimatedAnnualCost || 0) : 0;
      enrollmentStatus = activeEnrollment.enrollmentStatus;
    }

    const pensionStatements = this._getFromStorage('pension_statements');
    let lastStatementYear = null;
    let lastStatementTitle = '';
    if (pensionStatements.length > 0) {
      const annuals = pensionStatements.filter(s => s.statementType === 'annual_pension_statement');
      const source = annuals.length > 0 ? annuals : pensionStatements;
      const latest = source
        .slice()
        .sort((a, b) => {
          if (b.year !== a.year) return b.year - a.year;
          const da = a.uploadedAt || '1970-01-01T00:00:00Z';
          const db = b.uploadedAt || '1970-01-01T00:00:00Z';
          return db.localeCompare(da);
        })[0];
      if (latest) {
        lastStatementYear = latest.year;
        lastStatementTitle = latest.title;
      }
    }

    const profile = this._getProfileSingleton();
    const displayName = (profile.firstName || profile.lastName)
      ? ((profile.firstName || '') + ' ' + (profile.lastName || '')).trim()
      : (profile.emailAddress || 'Member');

    const quickLinks = [
      {
        id: 'adjust_contributions',
        label: 'Adjust Retirement Contributions',
        targetSectionKey: 'retirement_contributions'
      },
      {
        id: 'change_investments',
        label: 'Change Investments',
        targetSectionKey: 'investments_change'
      },
      {
        id: 'enroll_health',
        label: 'Enroll in Health Benefits',
        targetSectionKey: 'health_plans'
      },
      {
        id: 'view_pension_statements',
        label: 'View Pension Statements',
        targetSectionKey: 'pension_statements'
      },
      {
        id: 'update_profile',
        label: 'Update Profile & Settings',
        targetSectionKey: 'profile_settings'
      }
    ];

    return {
      retirementSummary: {
        currentContributionRatePercent: retirementSettings.contributionRatePercent,
        autoIncreaseEnabled: !!retirementSettings.autoIncreaseEnabled,
        nextAutoIncreaseMonth: autoRule && autoRule.isEnabled ? autoRule.increaseMonth : 'none',
        projectedBalanceAtRetirement: projectedBalance
      },
      investmentSummary: {
        portfolioId: portfolio.id,
        portfolioName: portfolio.name,
        totalBalance: portfolio.totalBalance || 0,
        primaryHoldingName,
        primaryHoldingAllocationPercent
      },
      healthSummary: {
        currentPlanName,
        estimatedAnnualCost,
        enrollmentStatus
      },
      pensionSummary: {
        lastStatementYear,
        lastStatementTitle
      },
      profileSummary: {
        displayName,
        communicationPreference: profile.communicationPreference
      },
      quickLinks
    };
  }

  // getRetirementContributionPageData
  getRetirementContributionPageData() {
    const settings = this._getOrCreateRetirementContributionSettings();
    const payrollDetails = {
      payFrequency: settings.payFrequency || 'monthly',
      estimatedMonthlyContributionAmount: settings.monthlyContributionAmount || 0
    };
    return {
      contributionSettings: settings,
      payrollDetails,
      links: {
        hasRetirementCalculator: true,
        hasAutoIncrease: true
      }
    };
  }

  // updateRetirementContributionRate
  updateRetirementContributionRate(newContributionRatePercent) {
    const rate = Number(newContributionRatePercent);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      return {
        success: false,
        message: 'Invalid contribution rate. Must be between 0 and 100.',
        updatedSettings: null
      };
    }
    const settings = this._getOrCreateRetirementContributionSettings();

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task1_rateChange',
        JSON.stringify({
          previousRatePercent: settings.contributionRatePercent,
          newRatePercent: rate,
          changedAt: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    settings.contributionRatePercent = rate;
    settings.updatedAt = this._nowIso();
    this._saveRetirementContributionSettings(settings);

    return {
      success: true,
      message: 'Contribution rate updated successfully.',
      updatedSettings: settings
    };
  }

  // getRetirementCalculatorState
  getRetirementCalculatorState() {
    const settings = this._getOrCreateRetirementContributionSettings();
    let scenarios = this._getFromStorage('retirement_calculator_scenarios');
    let currentScenario = null;

    if (scenarios.length === 0) {
      const retirementAge = 65;
      const monthlyContribution = settings.monthlyContributionAmount && settings.monthlyContributionAmount > 0
        ? settings.monthlyContributionAmount
        : 300;
      const projected = this._calculateRetirementProjectionInternal(retirementAge, monthlyContribution);
      const now = this._nowIso();
      currentScenario = {
        id: this._generateId('ret_calc'),
        contributionSettingsId: settings.id,
        retirementAge,
        monthlyContribution,
        projectedBalanceAtRetirement: projected,
        projectionAsOf: now,
        assumptionsDescription: 'Assumes 5% annual return and continuous monthly contributions.',
        lastAppliedToPlanAt: null
      };
      scenarios.push(currentScenario);
      this._saveToStorage('retirement_calculator_scenarios', scenarios);
    } else {
      currentScenario = scenarios
        .slice()
        .sort((a, b) => {
          const da = a.projectionAsOf || '1970-01-01T00:00:00Z';
          const db = b.projectionAsOf || '1970-01-01T00:00:00Z';
          return db.localeCompare(da);
        })[0];
    }

    const defaultRetirementAge = 65;
    const monthlyContributionRange = {
      min: 50,
      max: 10000,
      step: 50
    };

    return {
      currentScenario,
      defaultRetirementAge,
      monthlyContributionRange
    };
  }

  // calculateRetirementProjection
  calculateRetirementProjection(retirementAge, monthlyContribution) {
    const rAge = Number(retirementAge);
    const mContrib = Number(monthlyContribution);
    if (!Number.isFinite(rAge) || rAge <= 0) {
      throw new Error('Invalid retirementAge');
    }
    if (!Number.isFinite(mContrib) || mContrib < 0) {
      throw new Error('Invalid monthlyContribution');
    }
    const settings = this._getOrCreateRetirementContributionSettings();
    const projected = this._calculateRetirementProjectionInternal(rAge, mContrib);
    const now = this._nowIso();

    const scenario = {
      id: this._generateId('ret_calc'),
      contributionSettingsId: settings.id,
      retirementAge: rAge,
      monthlyContribution: mContrib,
      projectedBalanceAtRetirement: projected,
      projectionAsOf: now,
      assumptionsDescription: 'Assumes 5% annual return and continuous monthly contributions.',
      lastAppliedToPlanAt: null
    };

    const scenarios = this._getFromStorage('retirement_calculator_scenarios');
    scenarios.push(scenario);
    this._saveToStorage('retirement_calculator_scenarios', scenarios);

    return { scenario };
  }

  // applyRetirementProjectionToPlan
  applyRetirementProjectionToPlan(scenarioId) {
    const scenarios = this._getFromStorage('retirement_calculator_scenarios');
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    const currentSettings = this._getOrCreateRetirementContributionSettings();
    const proposedSettings = {
      ...currentSettings,
      monthlyContributionAmount: scenario.monthlyContribution,
      updatedAt: this._nowIso()
    };

    const pendingChanges = this._getFromStorage('pending_contribution_changes');
    const pendingChangeId = this._generateId('pending_contrib');
    const pendingRecord = {
      id: pendingChangeId,
      scenarioId: scenario.id,
      currentSettings,
      proposedSettings,
      createdAt: this._nowIso()
    };
    pendingChanges.push(pendingRecord);
    this._saveToStorage('pending_contribution_changes', pendingChanges);

    return {
      pendingChangeId,
      currentSettings,
      proposedSettings
    };
  }

  // getContributionUpdateSummary
  getContributionUpdateSummary(pendingChangeId) {
    const pendingChanges = this._getFromStorage('pending_contribution_changes');
    const record = pendingChanges.find(p => p.id === pendingChangeId);
    if (!record) {
      throw new Error('Pending contribution change not found');
    }
    return {
      pendingChangeId: record.id,
      currentSettings: record.currentSettings,
      proposedSettings: record.proposedSettings
    };
  }

  // confirmContributionUpdate
  confirmContributionUpdate(pendingChangeId) {
    const pendingChanges = this._getFromStorage('pending_contribution_changes');
    const idx = pendingChanges.findIndex(p => p.id === pendingChangeId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Pending contribution change not found.',
        updatedSettings: null
      };
    }

    const record = pendingChanges[idx];
    const proposed = record.proposedSettings;
    const settings = this._getOrCreateRetirementContributionSettings();

    settings.monthlyContributionAmount = proposed.monthlyContributionAmount;
    settings.updatedAt = this._nowIso();
    this._saveRetirementContributionSettings(settings);

    // Mark scenario as applied
    const scenarios = this._getFromStorage('retirement_calculator_scenarios');
    const scenIdx = scenarios.findIndex(s => s.id === record.scenarioId);
    if (scenIdx !== -1) {
      scenarios[scenIdx] = {
        ...scenarios[scenIdx],
        lastAppliedToPlanAt: this._nowIso()
      };
      this._saveToStorage('retirement_calculator_scenarios', scenarios);
    }

    // Remove pending record
    pendingChanges.splice(idx, 1);
    this._saveToStorage('pending_contribution_changes', pendingChanges);

    return {
      success: true,
      message: 'Contribution settings updated successfully.',
      updatedSettings: settings
    };
  }

  // getAutoIncreaseSettings
  getAutoIncreaseSettings() {
    const contributionSettings = this._getOrCreateRetirementContributionSettings();
    const autoIncreaseRule = this._getOrCreateAutoIncreaseRule();
    const ruleWithResolved = {
      ...autoIncreaseRule,
      contributionSettings
    };
    return {
      contributionSettings,
      autoIncreaseRule: ruleWithResolved
    };
  }

  // updateAutoIncreaseRule
  updateAutoIncreaseRule(isEnabled, increaseAmountPercent, increaseMonth, maxContributionPercent, startYear, effectiveDate) {
    const settings = this._getOrCreateRetirementContributionSettings();
    const rule = this._getOrCreateAutoIncreaseRule();

    const month = (increaseMonth || '').toLowerCase();
    const validMonths = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];
    if (!validMonths.includes(month)) {
      return {
        success: false,
        message: 'Invalid increaseMonth value.',
        autoIncreaseRule: null,
        contributionSettings: settings
      };
    }

    const incAmt = Number(increaseAmountPercent);
    const maxPct = Number(maxContributionPercent);
    if (!Number.isFinite(incAmt) || incAmt <= 0) {
      return {
        success: false,
        message: 'Invalid increaseAmountPercent.',
        autoIncreaseRule: null,
        contributionSettings: settings
      };
    }
    if (!Number.isFinite(maxPct) || maxPct <= 0 || maxPct > 100) {
      return {
        success: false,
        message: 'Invalid maxContributionPercent.',
        autoIncreaseRule: null,
        contributionSettings: settings
      };
    }

    rule.isEnabled = !!isEnabled;
    rule.increaseAmountPercent = incAmt;
    rule.frequency = 'yearly';
    rule.increaseMonth = month;
    rule.maxContributionPercent = maxPct;
    rule.startYear = typeof startYear === 'number' ? startYear : rule.startYear || null;
    rule.effectiveDate = effectiveDate || rule.effectiveDate || null;
    rule.updatedAt = this._nowIso();

    this._saveAutoIncreaseRule(rule);

    settings.autoIncreaseEnabled = !!isEnabled;
    settings.updatedAt = this._nowIso();
    this._saveRetirementContributionSettings(settings);

    return {
      success: true,
      message: 'Auto-increase rule updated successfully.',
      autoIncreaseRule: {
        ...rule,
        contributionSettings: settings
      },
      contributionSettings: settings
    };
  }

  // getInvestmentsOverview
  getInvestmentsOverview() {
    const portfolio = this._getOrCreateInvestmentPortfolio();
    const allAllocations = this._getFromStorage('portfolio_allocations');
    const allocationsForPortfolio = allAllocations.filter(a => a.portfolioId === portfolio.id);
    const funds = this._getFromStorage('investment_funds');

    const allocations = allocationsForPortfolio.map(a => {
      const fund = funds.find(f => f.id === a.fundId) || null;
      return {
        ...a,
        portfolio,
        fund
      };
    });

    const topHoldings = allocationsForPortfolio
      .slice()
      .sort((a, b) => (b.currentAllocationPercent || 0) - (a.currentAllocationPercent || 0))
      .slice(0, 5)
      .map(a => {
        const fund = funds.find(f => f.id === a.fundId) || null;
        return {
          fundId: a.fundId,
          fundName: fund ? fund.name : '',
          currentAllocationPercent: a.currentAllocationPercent || 0,
          oneYearReturnPercent: fund ? (fund.oneYearReturnPercent || 0) : 0,
          fund
        };
      });

    return {
      portfolio,
      allocations,
      topHoldings
    };
  }

  // getChangeInvestmentsData
  getChangeInvestmentsData() {
    const portfolio = this._getOrCreateInvestmentPortfolio();
    const allAllocations = this._getFromStorage('portfolio_allocations');
    const allocationsForPortfolio = allAllocations.filter(a => a.portfolioId === portfolio.id);
    const funds = this._getFromStorage('investment_funds');

    const allocations = allocationsForPortfolio.map(a => {
      const fund = funds.find(f => f.id === a.fundId) || null;
      return {
        allocation: {
          ...a,
          portfolio,
          fund
        },
        fund
      };
    });

    return {
      portfolio,
      allocations
    };
  }

  // getInvestmentFundFilterOptions
  getInvestmentFundFilterOptions() {
    const funds = this._getFromStorage('investment_funds');

    const categorySet = new Set();
    let minRisk = Number.POSITIVE_INFINITY;
    let maxRisk = Number.NEGATIVE_INFINITY;
    let minExpense = Number.POSITIVE_INFINITY;
    let maxExpense = Number.NEGATIVE_INFINITY;

    for (const f of funds) {
      if (f.category) categorySet.add(f.category);
      if (typeof f.riskScore === 'number') {
        minRisk = Math.min(minRisk, f.riskScore);
        maxRisk = Math.max(maxRisk, f.riskScore);
      }
      if (typeof f.expenseRatioPercent === 'number') {
        minExpense = Math.min(minExpense, f.expenseRatioPercent);
        maxExpense = Math.max(maxExpense, f.expenseRatioPercent);
      }
    }

    const categories = Array.from(categorySet).map(value => ({ value, label: value }));
    if (!Number.isFinite(minRisk)) {
      minRisk = 1;
      maxRisk = 5;
    }
    if (!Number.isFinite(minExpense)) {
      minExpense = 0;
      maxExpense = 2;
    }

    const riskScoreRange = { min: minRisk, max: maxRisk };
    const expenseRatioRange = { min: minExpense, max: maxExpense };

    const sortOptions = [
      { value: 'expense_ratio_asc', label: 'Expense Ratio  Low to High' },
      { value: 'expense_ratio_desc', label: 'Expense Ratio  High to Low' },
      { value: 'one_year_return_desc', label: '1-Year Return  High to Low' },
      { value: 'one_year_return_asc', label: '1-Year Return  Low to High' },
      { value: 'name_asc', label: 'Name A-Z' }
    ];

    return {
      categories,
      riskScoreRange,
      expenseRatioRange,
      sortOptions
    };
  }

  // searchInvestmentFunds
  searchInvestmentFunds(filters, sortBy, limit) {
    const allFunds = this._getFromStorage('investment_funds');
    const f = filters || {};
    const lim = typeof limit === 'number' && limit > 0 ? limit : 100;

    let result = allFunds.slice();

    if (f.categoryValue) {
      result = result.filter(x => x.category === f.categoryValue);
    }
    if (typeof f.maxExpenseRatioPercent === 'number') {
      result = result.filter(x => typeof x.expenseRatioPercent === 'number' && x.expenseRatioPercent <= f.maxExpenseRatioPercent);
    }
    if (typeof f.maxRiskScore === 'number') {
      result = result.filter(x => typeof x.riskScore === 'number' && x.riskScore <= f.maxRiskScore);
    }
    if (f.onlyActive) {
      result = result.filter(x => x.isActive === true);
    }

    const sortKey = sortBy || 'name_asc';
    result.sort((a, b) => {
      switch (sortKey) {
        case 'expense_ratio_asc':
          return (a.expenseRatioPercent || 0) - (b.expenseRatioPercent || 0);
        case 'expense_ratio_desc':
          return (b.expenseRatioPercent || 0) - (a.expenseRatioPercent || 0);
        case 'one_year_return_desc':
          return (b.oneYearReturnPercent || 0) - (a.oneYearReturnPercent || 0);
        case 'one_year_return_asc':
          return (a.oneYearReturnPercent || 0) - (b.oneYearReturnPercent || 0);
        case 'name_asc':
        default:
          return (a.name || '').localeCompare(b.name || '');
      }
    });

    return result.slice(0, lim);
  }

  // updatePendingPortfolioAllocations
  updatePendingPortfolioAllocations(allocations) {
    if (!Array.isArray(allocations)) {
      throw new Error('allocations must be an array');
    }
    const portfolio = this._getOrCreateInvestmentPortfolio();
    const allAllocations = this._getFromStorage('portfolio_allocations');
    const funds = this._getFromStorage('investment_funds');
    const now = this._nowIso();

    for (const upd of allocations) {
      const fundId = upd.fundId;
      const pendingPercent = Number(upd.pendingAllocationPercent);
      if (!fundId || !Number.isFinite(pendingPercent)) continue;

      let alloc = allAllocations.find(a => a.portfolioId === portfolio.id && a.fundId === fundId);
      if (!alloc) {
        alloc = {
          id: this._generateId('alloc'),
          portfolioId: portfolio.id,
          fundId: fundId,
          currentAllocationPercent: 0,
          pendingAllocationPercent: pendingPercent,
          lastUpdatedAt: now,
          isPrimaryHolding: false
        };
        allAllocations.push(alloc);
      } else {
        alloc.pendingAllocationPercent = pendingPercent;
        alloc.lastUpdatedAt = now;
      }
    }

    this._saveToStorage('portfolio_allocations', allAllocations);

    const allocationsForPortfolio = allAllocations.filter(a => a.portfolioId === portfolio.id);
    const validation = this._validatePortfolioAllocations(allocationsForPortfolio);

    const enrichedAllocations = allocationsForPortfolio.map(a => {
      const fund = funds.find(f => f.id === a.fundId) || null;
      return {
        ...a,
        portfolio,
        fund
      };
    });

    return {
      portfolio,
      allocations: enrichedAllocations,
      totalPendingAllocationPercent: validation.totalPendingPercent,
      validationWarnings: validation.warnings
    };
  }

  // getInvestmentAllocationReviewSummary
  getInvestmentAllocationReviewSummary() {
    const portfolio = this._getOrCreateInvestmentPortfolio();
    const allAllocations = this._getFromStorage('portfolio_allocations');
    const allocationsForPortfolio = allAllocations.filter(a => a.portfolioId === portfolio.id);
    const funds = this._getFromStorage('investment_funds');

    const allocationChanges = allocationsForPortfolio.map(a => {
      const fund = funds.find(f => f.id === a.fundId) || null;
      return {
        fund,
        currentAllocationPercent: a.currentAllocationPercent || 0,
        pendingAllocationPercent: typeof a.pendingAllocationPercent === 'number'
          ? a.pendingAllocationPercent
          : (a.currentAllocationPercent || 0)
      };
    });

    const validation = this._validatePortfolioAllocations(allocationsForPortfolio);

    return {
      portfolio,
      allocationChanges,
      isAllocationValid: validation.isValid,
      validationMessage: validation.warnings.join(' ') || ''
    };
  }

  // confirmInvestmentAllocationChanges
  confirmInvestmentAllocationChanges() {
    const portfolio = this._getOrCreateInvestmentPortfolio();
    const allAllocations = this._getFromStorage('portfolio_allocations');
    const funds = this._getFromStorage('investment_funds');

    const allocationsForPortfolio = allAllocations.filter(a => a.portfolioId === portfolio.id);
    const validation = this._validatePortfolioAllocations(allocationsForPortfolio);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Allocation is not valid: ' + validation.warnings.join(' '),
        portfolio,
        allocations: allocationsForPortfolio
      };
    }

    const now = this._nowIso();
    for (const alloc of allocationsForPortfolio) {
      if (typeof alloc.pendingAllocationPercent === 'number') {
        alloc.currentAllocationPercent = alloc.pendingAllocationPercent;
        alloc.pendingAllocationPercent = null;
        alloc.lastUpdatedAt = now;
      }
    }

    // Update isPrimaryHolding flag based on largest current allocation
    const sorted = allocationsForPortfolio
      .slice()
      .sort((a, b) => (b.currentAllocationPercent || 0) - (a.currentAllocationPercent || 0));
    const primaryId = sorted[0] ? sorted[0].id : null;
    for (const alloc of allocationsForPortfolio) {
      alloc.isPrimaryHolding = alloc.id === primaryId;
    }

    // Persist back all allocations
    this._saveToStorage('portfolio_allocations', allAllocations);

    portfolio.lastUpdatedAt = now;
    this._saveInvestmentPortfolio(portfolio);

    const enrichedAllocations = allocationsForPortfolio.map(a => {
      const fund = funds.find(f => f.id === a.fundId) || null;
      return {
        ...a,
        portfolio,
        fund
      };
    });

    return {
      success: true,
      message: 'Investment allocations updated successfully.',
      portfolio,
      allocations: enrichedAllocations
    };
  }

  // getFundFinderInitialData
  getFundFinderInitialData() {
    const filterOptions = {
      categories: this.getInvestmentFundFilterOptions().categories,
      riskScoreRange: this.getInvestmentFundFilterOptions().riskScoreRange,
      sortOptions: this.getInvestmentFundFilterOptions().sortOptions
    };
    const initialFunds = this.searchInvestmentFunds({ onlyActive: true }, 'name_asc', 100);
    return {
      filterOptions,
      initialFunds
    };
  }

  // getFundDetail
  getFundDetail(fundId) {
    const funds = this._getFromStorage('investment_funds');
    const fund = funds.find(f => f.id === fundId) || null;
    const favorites = this._getFromStorage('favorite_funds');
    const isFavorite = !!favorites.find(f => f.fundId === fundId);
    return {
      fund,
      isFavorite
    };
  }

  // setFavoriteFund
  setFavoriteFund(fundId, isFavorite) {
    const funds = this._getFromStorage('investment_funds');
    const fund = funds.find(f => f.id === fundId) || null;
    if (!fund) {
      return {
        success: false,
        message: 'Fund not found.',
        favorite: null
      };
    }

    let favorites = this._getFromStorage('favorite_funds');
    let favorite = favorites.find(f => f.fundId === fundId) || null;

    if (isFavorite) {
      if (!favorite) {
        favorite = {
          id: this._generateId('favorite'),
          fundId,
          addedAt: this._nowIso()
        };
        favorites.push(favorite);
      }
      this._saveToStorage('favorite_funds', favorites);
      return {
        success: true,
        message: 'Fund added to favorites.',
        favorite
      };
    } else {
      favorites = favorites.filter(f => f.fundId !== fundId);
      this._saveToStorage('favorite_funds', favorites);
      return {
        success: true,
        message: 'Fund removed from favorites.',
        favorite: null
      };
    }
  }

  // getFavoriteFunds
  getFavoriteFunds() {
    const favorites = this._getFromStorage('favorite_funds');
    const funds = this._getFromStorage('investment_funds');
    return favorites.map(fav => {
      const fund = funds.find(f => f.id === fav.fundId) || null;
      return {
        favorite: {
          ...fav,
          fund
        },
        fund
      };
    });
  }

  // getBenefitsOverview
  getBenefitsOverview() {
    const currentHealthEnrollment = this._getActiveHealthEnrollment();
    const plans = this._getFromStorage('health_plans');
    let currentHealthPlan = null;

    if (currentHealthEnrollment) {
      currentHealthPlan = plans.find(p => p.id === currentHealthEnrollment.planId) || null;
    }

    const otherBenefits = [];

    return {
      currentHealthEnrollment: currentHealthEnrollment
        ? { ...currentHealthEnrollment, plan: currentHealthPlan }
        : null,
      currentHealthPlan,
      otherBenefits
    };
  }

  // getHealthPlansList
  getHealthPlansList(onlyActive) {
    const plans = this._getFromStorage('health_plans');
    const activeOnly = typeof onlyActive === 'boolean' ? onlyActive : true;
    if (activeOnly) {
      return plans.filter(p => p.isActive === true);
    }
    return plans;
  }

  // getHealthPlanComparisonData
  getHealthPlanComparisonData(planIds) {
    if (!Array.isArray(planIds)) {
      throw new Error('planIds must be an array');
    }
    const plans = this._getFromStorage('health_plans').filter(p => planIds.includes(p.id));
    return { plans };
  }

  // startHealthPlanSelection
  startHealthPlanSelection(planId, coverageTier) {
    const plans = this._getFromStorage('health_plans');
    const plan = plans.find(p => p.id === planId) || null;
    if (!plan) {
      throw new Error('Selected health plan not found');
    }

    const pendingEnrollmentId = this._generateId('pending_health');
    const pendingEnrollments = this._getFromStorage('pending_health_enrollments');
    const pendingRecord = {
      id: pendingEnrollmentId,
      planId,
      coverageTier: coverageTier || 'employee_only',
      createdAt: this._nowIso()
    };
    pendingEnrollments.push(pendingRecord);
    this._saveToStorage('pending_health_enrollments', pendingEnrollments);

    return {
      pendingEnrollmentId,
      selectedPlan: plan
    };
  }

  // getHealthEnrollmentSummary
  getHealthEnrollmentSummary(pendingEnrollmentId) {
    const pendingEnrollments = this._getFromStorage('pending_health_enrollments');
    const record = pendingEnrollments.find(p => p.id === pendingEnrollmentId);
    if (!record) {
      throw new Error('Pending health enrollment not found');
    }
    const plans = this._getFromStorage('health_plans');
    const plan = plans.find(p => p.id === record.planId) || null;

    const enrollment = {
      id: null,
      planId: record.planId,
      coverageTier: record.coverageTier || 'employee_only',
      enrollmentStatus: 'pending',
      effectiveDate: null,
      submittedAt: null,
      lastUpdatedAt: null
    };

    return {
      pendingEnrollmentId: record.id,
      enrollment: { ...enrollment, plan },
      plan
    };
  }

  // submitHealthEnrollment
  submitHealthEnrollment(pendingEnrollmentId) {
    const pendingEnrollments = this._getFromStorage('pending_health_enrollments');
    const idx = pendingEnrollments.findIndex(p => p.id === pendingEnrollmentId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Pending health enrollment not found.',
        enrollment: null,
        plan: null
      };
    }

    const record = pendingEnrollments[idx];
    const plans = this._getFromStorage('health_plans');
    const plan = plans.find(p => p.id === record.planId) || null;
    if (!plan) {
      return {
        success: false,
        message: 'Health plan not found.',
        enrollment: null,
        plan: null
      };
    }

    let enrollments = this._getFromStorage('health_enrollments');
    const now = this._nowIso();

    // Cancel previous active enrollments (simple approach)
    enrollments = enrollments.map(e => {
      if (e.enrollmentStatus === 'active') {
        return { ...e, enrollmentStatus: 'cancelled', lastUpdatedAt: now };
      }
      return e;
    });

    const newEnrollment = {
      id: this._generateId('health_enroll'),
      planId: record.planId,
      coverageTier: record.coverageTier || 'employee_only',
      enrollmentStatus: 'active',
      effectiveDate: now,
      submittedAt: now,
      lastUpdatedAt: now
    };

    enrollments.push(newEnrollment);
    this._saveToStorage('health_enrollments', enrollments);

    // Remove pending record
    pendingEnrollments.splice(idx, 1);
    this._saveToStorage('pending_health_enrollments', pendingEnrollments);

    return {
      success: true,
      message: 'Health enrollment submitted successfully.',
      enrollment: { ...newEnrollment, plan },
      plan
    };
  }

  // getProfileSettings
  getProfileSettings() {
    const profile = this._getProfileSingleton();
    return { profile };
  }

  // updateProfileSettings
  updateProfileSettings(streetAddress, city, state, postalCode, mobilePhone, communicationPreference) {
    const profile = this._getProfileSingleton();

    if (typeof streetAddress === 'string') profile.streetAddress = streetAddress;
    if (typeof city === 'string') profile.city = city;
    if (typeof state === 'string') profile.state = state;
    if (typeof postalCode === 'string') profile.postalCode = postalCode;
    if (typeof mobilePhone === 'string') profile.mobilePhone = mobilePhone;

    if (typeof communicationPreference === 'string') {
      const allowed = ['email_only', 'mail_only', 'email_and_mail', 'sms_only', 'none'];
      if (allowed.includes(communicationPreference)) {
        profile.communicationPreference = communicationPreference;
      }
    }

    profile.updatedAt = this._nowIso();
    this._saveProfile(profile);

    return {
      success: true,
      message: 'Profile updated successfully.',
      profile
    };
  }

  // getBeneficiaries
  getBeneficiaries() {
    const beneficiaries = this._getFromStorage('beneficiaries');
    const retirementSettingsArr = this._getFromStorage('retirement_contribution_settings');

    return beneficiaries.map(b => {
      const retirementPlan = retirementSettingsArr.find(r => r.id === b.retirementPlanId) || null;
      return {
        ...b,
        retirementPlan
      };
    });
  }

  // updateBeneficiary
  updateBeneficiary(beneficiaryId, allocationPercent, relationship, firstName, lastName) {
    const beneficiaries = this._getFromStorage('beneficiaries');
    const idx = beneficiaries.findIndex(b => b.id === beneficiaryId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Beneficiary not found.',
        beneficiary: null
      };
    }

    const b = beneficiaries[idx];
    if (typeof allocationPercent === 'number') b.allocationPercent = allocationPercent;
    if (typeof relationship === 'string') b.relationship = relationship;
    if (typeof firstName === 'string') b.firstName = firstName;
    if (typeof lastName === 'string') b.lastName = lastName;
    b.updatedAt = this._nowIso();

    beneficiaries[idx] = b;
    this._saveToStorage('beneficiaries', beneficiaries);

    const retirementSettingsArr = this._getFromStorage('retirement_contribution_settings');
    const retirementPlan = retirementSettingsArr.find(r => r.id === b.retirementPlanId) || null;

    return {
      success: true,
      message: 'Beneficiary updated successfully.',
      beneficiary: { ...b, retirementPlan }
    };
  }

  // addBeneficiary
  addBeneficiary(firstName, lastName, relationship, allocationPercent, isPrimary, dateOfBirth) {
    const settings = this._getOrCreateRetirementContributionSettings();
    const beneficiaries = this._getFromStorage('beneficiaries');
    const now = this._nowIso();

    const beneficiary = {
      id: this._generateId('beneficiary'),
      retirementPlanId: settings.id,
      firstName,
      lastName,
      relationship,
      allocationPercent,
      isPrimary: !!isPrimary,
      dateOfBirth: dateOfBirth || null,
      createdAt: now,
      updatedAt: now
    };

    beneficiaries.push(beneficiary);
    this._saveToStorage('beneficiaries', beneficiaries);

    return {
      success: true,
      message: 'Beneficiary added successfully.',
      beneficiary: {
        ...beneficiary,
        retirementPlan: settings
      }
    };
  }

  // getPensionAvailableYears
  getPensionAvailableYears() {
    const statements = this._getFromStorage('pension_statements');
    const yearsSet = new Set();
    for (const s of statements) {
      if (typeof s.year === 'number') yearsSet.add(s.year);
    }
    const years = Array.from(yearsSet).sort((a, b) => b - a);
    return years;
  }

  // getPensionStatementsByYear
  getPensionStatementsByYear(year) {
    const y = Number(year);
    const statements = this._getFromStorage('pension_statements');
    return statements.filter(s => s.year === y);
  }

  // downloadPensionStatement
  downloadPensionStatement(statementId) {
    const statements = this._getFromStorage('pension_statements');
    const statement = statements.find(s => s.id === statementId) || null;

    // Instrumentation for task completion tracking
    try {
      if (statement) {
        localStorage.setItem(
          'task8_lastDownloadedStatement',
          JSON.stringify({
            statementId: statement.id,
            year: statement.year,
            statementType: statement.statementType,
            title: statement.title,
            downloadedAt: this._nowIso()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      statement,
      downloadReady: !!statement
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