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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'focus_areas',
      'grant_programs',
      'grant_awards',
      'application_plans',
      'saved_grants',
      'grant_applications',
      'accounts',
      'organization_profiles',
      'notification_settings',
      'email_alert_subscriptions',
      'contact_messages',
      'grant_comparisons',
      'recently_viewed_grants'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Track current account id for single-user environment
    if (!localStorage.getItem('currentAccountId')) {
      localStorage.setItem('currentAccountId', '');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data == null) {
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _differenceInDays(futureDate, fromDate) {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((futureDate.getTime() - fromDate.getTime()) / msPerDay);
  }

  _getEntityById(tableKey, id) {
    if (!id) return null;
    const list = this._getFromStorage(tableKey, []);
    return list.find((item) => item.id === id) || null;
  }

  // ----------------------
  // Internal helpers (required in spec)
  // ----------------------

  _getOrCreateCurrentAccount() {
    let accounts = this._getFromStorage('accounts', []);
    let currentAccountId = localStorage.getItem('currentAccountId') || '';

    if (currentAccountId) {
      const existing = accounts.find((a) => a.id === currentAccountId);
      if (existing) {
        return existing;
      }
    }

    if (accounts.length === 1) {
      const single = accounts[0];
      localStorage.setItem('currentAccountId', single.id);
      return single;
    }

    // Create a default individual applicant account if none exists
    const now = new Date().toISOString();
    const defaultAccount = {
      id: this._generateId('acct'),
      accountType: 'individual_applicant',
      fullName: 'Guest User',
      organizationName: null,
      email: 'guest@example.test',
      password: '',
      createdAt: now,
      lastLoginAt: now
    };

    accounts.push(defaultAccount);
    this._saveToStorage('accounts', accounts);
    localStorage.setItem('currentAccountId', defaultAccount.id);
    return defaultAccount;
  }

  _getOrCreateNotificationSettingsForCurrentAccount() {
    const account = this._getOrCreateCurrentAccount();
    let settings = this._getFromStorage('notification_settings', []);
    let existing = settings.find((s) => s.accountId === account.id);

    if (existing) return existing;

    const now = new Date().toISOString();
    existing = {
      id: this._generateId('ns'),
      accountId: account.id,
      deadlineRemindersEnabled: false,
      deadlineReminderDaysBefore: null,
      grantUpdatesEmailEnabled: true,
      grantUpdatesOnsiteEnabled: true,
      newsBlogEmailEnabled: true,
      createdAt: now,
      updatedAt: now
    };
    settings.push(existing);
    this._saveToStorage('notification_settings', settings);
    return existing;
  }

  _getOrCreateDefaultApplicationPlan() {
    let plans = this._getFromStorage('application_plans', []);
    let existing = plans.find((p) => p.name === 'My Grants');
    if (existing) return existing;

    const now = new Date().toISOString();
    existing = {
      id: this._generateId('plan'),
      name: 'My Grants',
      description: 'Default application plan for saved grants',
      targetYear: new Date().getFullYear(),
      createdAt: now,
      updatedAt: now
    };
    plans.push(existing);
    this._saveToStorage('application_plans', plans);
    return existing;
  }

  _mapFocusAreaCodesToNames(codes) {
    const focusAreas = this._getFromStorage('focus_areas', []);
    return (codes || []).map((code) => {
      const fa = focusAreas.find((f) => f.code === code);
      return fa ? fa.name : code;
    });
  }

  _recordGrantViewed(grantProgramId) {
    if (!grantProgramId) return;
    let views = this._getFromStorage('recently_viewed_grants', []);
    const now = new Date().toISOString();
    const existingIndex = views.findIndex((v) => v.grantProgramId === grantProgramId);
    if (existingIndex >= 0) {
      views[existingIndex].lastViewedAt = now;
    } else {
      views.push({ grantProgramId, lastViewedAt: now });
    }
    // Keep only the 20 most recent
    views.sort((a, b) => {
      const da = this._parseDate(a.lastViewedAt) || new Date(0);
      const db = this._parseDate(b.lastViewedAt) || new Date(0);
      return db - da;
    });
    views = views.slice(0, 20);
    this._saveToStorage('recently_viewed_grants', views);
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1. getHomePageHighlights
  getHomePageHighlights() {
    const programs = this._getFromStorage('grant_programs', []);
    const now = new Date();

    const highlightedPrograms = programs.filter((p) => !!p.isHighlightedOnHome);

    const upcomingDeadlines = programs
      .filter((p) => p.status === 'open' && p.applicationDeadline)
      .map((p) => {
        const deadlineDate = this._parseDate(p.applicationDeadline);
        if (!deadlineDate || deadlineDate < now) return null;
        const days = this._differenceInDays(deadlineDate, now);
        return {
          grantProgramId: p.id,
          grantProgramName: p.name,
          applicationDeadline: p.applicationDeadline,
          daysUntilDeadline: days,
          focusAreaCodes: p.focusAreaCodes || [],
          maxAwardAmount: p.maxAwardAmount,
          // foreign key resolution
          grantProgram: p
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)
      .slice(0, 10);

    const featuredOpportunities = programs.filter((p) => !!p.isFlagshipProgram);

    return {
      highlightedPrograms,
      upcomingDeadlines,
      featuredOpportunities
    };
  }

  // 2. getFocusAreas
  getFocusAreas() {
    return this._getFromStorage('focus_areas', []);
  }

  // 3. getGrantSearchFilterOptions
  getGrantSearchFilterOptions() {
    const focusAreas = this._getFromStorage('focus_areas', []);
    const programs = this._getFromStorage('grant_programs', []);

    let min = null;
    let max = null;
    programs.forEach((p) => {
      if (typeof p.minAwardAmount === 'number') {
        if (min === null || p.minAwardAmount < min) min = p.minAwardAmount;
      }
      if (typeof p.maxAwardAmount === 'number') {
        if (max === null || p.maxAwardAmount > max) max = p.maxAwardAmount;
      }
    });

    const deadlines = programs
      .map((p) => ({ open: p.applicationOpenDate, deadline: p.applicationDeadline }))
      .filter((d) => d.open || d.deadline);

    let earliestOpenDate = null;
    let latestDeadline = null;
    deadlines.forEach((d) => {
      if (d.open) {
        const od = this._parseDate(d.open);
        if (od && (!earliestOpenDate || od < earliestOpenDate)) {
          earliestOpenDate = od;
        }
      }
      if (d.deadline) {
        const dd = this._parseDate(d.deadline);
        if (dd && (!latestDeadline || dd > latestDeadline)) {
          latestDeadline = dd;
        }
      }
    });

    return {
      focusAreas,
      awardAmountRangeDefaults: {
        min: min != null ? min : 0,
        max: max != null ? max : 0,
        step: 1000,
        currency: 'USD'
      },
      deadlineRangeDefaults: {
        earliestOpenDate: earliestOpenDate ? earliestOpenDate.toISOString() : null,
        latestDeadline: latestDeadline ? latestDeadline.toISOString() : null
      },
      sortOptions: [
        { value: 'max_award_desc', label: 'Maximum Award - High to Low' },
        { value: 'max_award_asc', label: 'Maximum Award - Low to High' },
        { value: 'deadline_soonest_first', label: 'Deadline - Soonest First' },
        { value: 'deadline_latest_first', label: 'Deadline - Latest First' }
      ]
    };
  }

  // 4. searchOpenGrantPrograms
  searchOpenGrantPrograms(
    focusAreaCodes,
    minAwardAmount,
    maxAwardAmount,
    deadlineStartDate,
    deadlineEndDate,
    sortBy,
    page,
    pageSize
  ) {
    focusAreaCodes = focusAreaCodes || [];
    sortBy = sortBy || 'deadline_soonest_first';
    page = page || 1;
    pageSize = pageSize || 20;

    const allPrograms = this._getFromStorage('grant_programs', []);
    let results = allPrograms.filter((p) => p.status === 'open');

    if (focusAreaCodes && focusAreaCodes.length > 0) {
      results = results.filter((p) => {
        const codes = p.focusAreaCodes || [];
        return codes.some((c) => focusAreaCodes.indexOf(c) !== -1);
      });
    }

    if (typeof minAwardAmount === 'number') {
      results = results.filter((p) => p.minAwardAmount >= minAwardAmount);
    }

    if (typeof maxAwardAmount === 'number') {
      results = results.filter((p) => p.maxAwardAmount <= maxAwardAmount);
    }

    const start = deadlineStartDate ? this._parseDate(deadlineStartDate) : null;
    const end = deadlineEndDate ? this._parseDate(deadlineEndDate) : null;

    if (start || end) {
      results = results.filter((p) => {
        const d = this._parseDate(p.applicationDeadline);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    results.sort((a, b) => {
      if (sortBy === 'max_award_desc') {
        return (b.maxAwardAmount || 0) - (a.maxAwardAmount || 0);
      }
      if (sortBy === 'max_award_asc') {
        return (a.maxAwardAmount || 0) - (b.maxAwardAmount || 0);
      }
      const da = this._parseDate(a.applicationDeadline) || new Date(8640000000000000);
      const db = this._parseDate(b.applicationDeadline) || new Date(8640000000000000);
      if (sortBy === 'deadline_latest_first') {
        return db - da;
      }
      // deadline_soonest_first default
      return da - db;
    });

    const totalResults = results.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageResults = results.slice(startIndex, endIndex);

    return {
      totalResults,
      page,
      pageSize,
      results: pageResults
    };
  }

  // 5. getPastGrantsFilterOptions
  getPastGrantsFilterOptions() {
    const awards = this._getFromStorage('grant_awards', []);
    const focusAreas = this._getFromStorage('focus_areas', []);

    const yearsSet = new Set();
    let min = null;
    let max = null;

    awards.forEach((a) => {
      if (a.yearAwarded != null) yearsSet.add(a.yearAwarded);
      if (typeof a.amountAwarded === 'number') {
        if (min === null || a.amountAwarded < min) min = a.amountAwarded;
        if (max === null || a.amountAwarded > max) max = a.amountAwarded;
      }
    });

    const yearsAvailable = Array.from(yearsSet).sort();

    return {
      yearsAvailable,
      focusAreas,
      awardAmountRangeDefaults: {
        min: min != null ? min : 0,
        max: max != null ? max : 0,
        step: 1000,
        currency: 'USD'
      }
    };
  }

  // 6. searchPastGrants
  searchPastGrants(
    yearAwarded,
    focusAreaCodes,
    minAmountAwarded,
    maxAmountAwarded,
    sortBy,
    page,
    pageSize
  ) {
    focusAreaCodes = focusAreaCodes || [];
    sortBy = sortBy || 'amount_desc';
    page = page || 1;
    pageSize = pageSize || 20;

    const awardsRaw = this._getFromStorage('grant_awards', []);
    const programs = this._getFromStorage('grant_programs', []);

    let awards = awardsRaw.filter((a) => a.awardStatus === 'awarded');

    if (typeof yearAwarded === 'number') {
      awards = awards.filter((a) => a.yearAwarded === yearAwarded);
    }

    if (focusAreaCodes && focusAreaCodes.length > 0) {
      awards = awards.filter((a) => {
        const codes = a.focusAreaCodes || [];
        return codes.some((c) => focusAreaCodes.indexOf(c) !== -1);
      });
    }

    if (typeof minAmountAwarded === 'number') {
      awards = awards.filter((a) => a.amountAwarded >= minAmountAwarded);
    }

    if (typeof maxAmountAwarded === 'number') {
      awards = awards.filter((a) => a.amountAwarded <= maxAmountAwarded);
    }

    awards.sort((a, b) => {
      if (sortBy === 'amount_asc') {
        return (a.amountAwarded || 0) - (b.amountAwarded || 0);
      }
      if (sortBy === 'year_desc') {
        return (b.yearAwarded || 0) - (a.yearAwarded || 0);
      }
      if (sortBy === 'year_asc') {
        return (a.yearAwarded || 0) - (b.yearAwarded || 0);
      }
      // amount_desc default
      return (b.amountAwarded || 0) - (a.amountAwarded || 0);
    });

    const totalResults = awards.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageAwards = awards.slice(startIndex, endIndex);

    const results = pageAwards.map((a) => {
      const program = programs.find((p) => p.id === a.grantProgramId) || null;
      return {
        id: a.id,
        recipientOrganizationName: a.recipientOrganizationName,
        recipientOrganizationType: a.recipientOrganizationType || null,
        yearAwarded: a.yearAwarded,
        amountAwarded: a.amountAwarded,
        focusAreaCodes: a.focusAreaCodes || [],
        geographicAreaServed: a.geographicAreaServed || null,
        projectTitle: a.projectTitle || null,
        grantProgramNameSummary: program ? program.name : null,
        // foreign key resolution (not specified but provided for convenience)
        grantProgramId: a.grantProgramId || null,
        grantProgram: program
      };
    });

    return {
      totalResults,
      page,
      pageSize,
      results
    };
  }

  // 7. getGrantProgramDetails
  getGrantProgramDetails(grantProgramId) {
    const programs = this._getFromStorage('grant_programs', []);
    const focusAreasAll = this._getFromStorage('focus_areas', []);
    const savedGrants = this._getFromStorage('saved_grants', []);
    const applications = this._getFromStorage('grant_applications', []);

    const program = programs.find((p) => p.id === grantProgramId) || null;
    if (!program) {
      return {
        grantProgram: null,
        focusAreas: [],
        isSaved: false,
        savedGrantId: null,
        userApplicationStatus: 'not_started'
      };
    }

    this._recordGrantViewed(grantProgramId);

    const focusAreas = (program.focusAreaCodes || []).map((code) => {
      return focusAreasAll.find((f) => f.code === code) || { id: code, code, name: code };
    });

    const saved = savedGrants.find((s) => s.grantProgramId === grantProgramId) || null;

    // Determine user application status (simplified for single-user env)
    const appForGrant = applications.filter((a) => a.grantProgramId === grantProgramId);
    let userApplicationStatus = 'not_started';
    if (appForGrant.some((a) => a.applicationStatus === 'submitted')) {
      userApplicationStatus = 'submitted';
    } else if (appForGrant.some((a) => a.applicationStatus === 'draft')) {
      userApplicationStatus = 'draft_in_progress';
    }

    return {
      grantProgram: {
        id: program.id,
        name: program.name,
        shortName: program.shortName || null,
        description: program.description || null,
        focusAreaCodes: program.focusAreaCodes || [],
        minAwardAmount: program.minAwardAmount,
        maxAwardAmount: program.maxAwardAmount,
        matchRequiredPercent: program.matchRequiredPercent,
        applicationOpenDate: program.applicationOpenDate || null,
        applicationDeadline: program.applicationDeadline || null,
        status: program.status,
        geographicFocus: program.geographicFocus || null,
        isFlagshipProgram: !!program.isFlagshipProgram
      },
      focusAreas,
      isSaved: !!saved,
      savedGrantId: saved ? saved.id : null,
      userApplicationStatus
    };
  }

  // 8. saveGrantToMyGrants
  saveGrantToMyGrants(grantProgramId, savedFromContext, planId, newPlanName) {
    savedFromContext = savedFromContext || 'grant_detail';

    const programs = this._getFromStorage('grant_programs', []);
    const program = programs.find((p) => p.id === grantProgramId);
    if (!program) {
      return { success: false, message: 'Grant program not found', savedGrant: null, applicationPlan: null };
    }

    let plans = this._getFromStorage('application_plans', []);
    let savedGrants = this._getFromStorage('saved_grants', []);

    let applicationPlan = null;

    if (planId) {
      applicationPlan = plans.find((p) => p.id === planId) || null;
    } else if (newPlanName) {
      const now = new Date().toISOString();
      applicationPlan = {
        id: this._generateId('plan'),
        name: newPlanName,
        description: null,
        targetYear: new Date().getFullYear(),
        createdAt: now,
        updatedAt: now
      };
      plans.push(applicationPlan);
      this._saveToStorage('application_plans', plans);
    } else {
      applicationPlan = this._getOrCreateDefaultApplicationPlan();
      plans = this._getFromStorage('application_plans', []); // refresh
    }

    // Avoid duplicate saved grant for same program & plan
    const existing = savedGrants.find(
      (s) => s.grantProgramId === grantProgramId && s.planId === (applicationPlan ? applicationPlan.id : null)
    );
    if (existing) {
      return {
        success: true,
        message: 'Grant already saved',
        savedGrant: existing,
        applicationPlan
      };
    }

    const now = new Date().toISOString();
    const savedGrant = {
      id: this._generateId('sg'),
      grantProgramId,
      planId: applicationPlan ? applicationPlan.id : null,
      savedFromContext,
      notes: null,
      createdAt: now
    };

    savedGrants.push(savedGrant);
    this._saveToStorage('saved_grants', savedGrants);

    return {
      success: true,
      message: 'Grant saved',
      savedGrant,
      applicationPlan
    };
  }

  // 9. getMyGrantsAndPlans
  getMyGrantsAndPlans() {
    const savedGrants = this._getFromStorage('saved_grants', []);
    const plans = this._getFromStorage('application_plans', []);
    const programs = this._getFromStorage('grant_programs', []);
    const applications = this._getFromStorage('grant_applications', []);

    const hasDraftForProgram = (grantProgramId) => {
      return applications.some(
        (a) => a.grantProgramId === grantProgramId && a.applicationStatus === 'draft'
      );
    };

    const programById = {};
    programs.forEach((p) => {
      programById[p.id] = p;
    });

    const unplannedSaved = savedGrants.filter((s) => !s.planId);

    const unplannedSavedGrants = unplannedSaved.map((s) => {
      const program = programById[s.grantProgramId] || null;
      return {
        savedGrantId: s.id,
        grantProgramId: s.grantProgramId,
        grantProgramName: program ? program.name : null,
        shortName: program ? program.shortName : null,
        maxAwardAmount: program ? program.maxAwardAmount : null,
        applicationDeadline: program ? program.applicationDeadline : null,
        focusAreaCodes: program ? program.focusAreaCodes || [] : [],
        hasDraftApplication: hasDraftForProgram(s.grantProgramId),
        // foreign key resolution
        savedGrant: s,
        grantProgram: program
      };
    });

    const plansWithGrants = plans.map((plan) => {
      const planSavedGrants = savedGrants.filter((s) => s.planId === plan.id);
      const mapped = planSavedGrants.map((s) => {
        const program = programById[s.grantProgramId] || null;
        return {
          savedGrantId: s.id,
          grantProgramId: s.grantProgramId,
          grantProgramName: program ? program.name : null,
          shortName: program ? program.shortName : null,
          maxAwardAmount: program ? program.maxAwardAmount : null,
          applicationDeadline: program ? program.applicationDeadline : null,
          focusAreaCodes: program ? program.focusAreaCodes || [] : [],
          hasDraftApplication: hasDraftForProgram(s.grantProgramId),
          savedGrant: s,
          grantProgram: program
        };
      });

      return {
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description || null,
          targetYear: plan.targetYear || null
        },
        savedGrants: mapped
      };
    });

    return {
      defaultListLabel: 'Saved Grants',
      unplannedSavedGrants,
      plans: plansWithGrants
    };
  }

  // 10. renameApplicationPlan
  renameApplicationPlan(planId, newName) {
    let plans = this._getFromStorage('application_plans', []);
    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return { success: false, plan: null };
    }
    plan.name = newName;
    plan.updatedAt = new Date().toISOString();
    this._saveToStorage('application_plans', plans);
    return {
      success: true,
      plan: {
        id: plan.id,
        name: plan.name,
        description: plan.description || null,
        targetYear: plan.targetYear || null
      }
    };
  }

  // 11. removeSavedGrant
  removeSavedGrant(savedGrantId) {
    let savedGrants = this._getFromStorage('saved_grants', []);
    const before = savedGrants.length;
    savedGrants = savedGrants.filter((s) => s.id !== savedGrantId);
    this._saveToStorage('saved_grants', savedGrants);
    return {
      success: before !== savedGrants.length,
      remainingSavedGrantsCount: savedGrants.length
    };
  }

  // 12. updateSavedGrantPlan
  updateSavedGrantPlan(savedGrantId, targetPlanId, newPlanName) {
    let savedGrants = this._getFromStorage('saved_grants', []);
    let plans = this._getFromStorage('application_plans', []);
    const savedGrant = savedGrants.find((s) => s.id === savedGrantId);
    if (!savedGrant) {
      return { success: false, savedGrant: null, applicationPlan: null };
    }

    let applicationPlan = null;

    if (targetPlanId) {
      applicationPlan = plans.find((p) => p.id === targetPlanId) || null;
    } else if (newPlanName) {
      const now = new Date().toISOString();
      applicationPlan = {
        id: this._generateId('plan'),
        name: newPlanName,
        description: null,
        targetYear: new Date().getFullYear(),
        createdAt: now,
        updatedAt: now
      };
      plans.push(applicationPlan);
      this._saveToStorage('application_plans', plans);
    } else {
      applicationPlan = null;
    }

    savedGrant.planId = applicationPlan ? applicationPlan.id : null;
    this._saveToStorage('saved_grants', savedGrants);

    return {
      success: true,
      savedGrant: {
        id: savedGrant.id,
        grantProgramId: savedGrant.grantProgramId,
        planId: savedGrant.planId
      },
      applicationPlan: applicationPlan
        ? { id: applicationPlan.id, name: applicationPlan.name }
        : null
    };
  }

  // 13. startGrantApplication
  startGrantApplication(grantProgramId) {
    const program = this._getEntityById('grant_programs', grantProgramId);
    if (!program) {
      return { success: false, application: null, nextStep: null };
    }

    const account = this._getOrCreateCurrentAccount();
    const applicantType =
      account.accountType === 'organization_account' ? 'organization' : 'individual';
    const applicantName =
      applicantType === 'organization' ? account.organizationName : account.fullName;

    let applications = this._getFromStorage('grant_applications', []);

    // Reuse existing draft application for same grant, if any
    let existing = applications.find(
      (a) => a.grantProgramId === grantProgramId && a.applicationStatus === 'draft'
    );

    if (!existing) {
      const now = new Date().toISOString();
      existing = {
        id: this._generateId('app'),
        grantProgramId,
        applicationStatus: 'draft',
        projectTitle: '',
        requestedAmount: 0,
        projectStartDate: '',
        projectEndDate: null,
        applicantType,
        applicantName: applicantName || null,
        organizationProfileId: null,
        internalReferenceCode: null,
        createdAt: now,
        lastSavedAt: now,
        submissionDate: null
      };
      applications.push(existing);
      this._saveToStorage('grant_applications', applications);
    }

    return {
      success: true,
      application: {
        id: existing.id,
        grantProgramId: existing.grantProgramId,
        applicationStatus: existing.applicationStatus,
        projectTitle: existing.projectTitle,
        requestedAmount: existing.requestedAmount,
        projectStartDate: existing.projectStartDate,
        applicantType: existing.applicantType,
        applicantName: existing.applicantName,
        createdAt: existing.createdAt,
        // foreign key resolution
        grantProgram: program
      },
      nextStep: 'applicant_information'
    };
  }

  // 14. getApplicationFormState
  getApplicationFormState(applicationId) {
    const applications = this._getFromStorage('grant_applications', []);
    const app = applications.find((a) => a.id === applicationId) || null;
    if (!app) {
      return {
        application: null,
        grantProgramSummary: null,
        allowedActions: []
      };
    }

    const program = this._getEntityById('grant_programs', app.grantProgramId);

    const grantProgramSummary = program
      ? {
          id: program.id,
          name: program.name,
          shortName: program.shortName || null,
          applicationDeadline: program.applicationDeadline || null,
          maxAwardAmount: program.maxAwardAmount
        }
      : null;

    const allowedActions = ['save_draft'];
    const deadline = program ? this._parseDate(program.applicationDeadline) : null;
    const now = new Date();
    if (app.applicationStatus === 'draft' && (!deadline || deadline >= now)) {
      allowedActions.push('submit');
    }

    return {
      application: {
        id: app.id,
        grantProgramId: app.grantProgramId,
        applicationStatus: app.applicationStatus,
        projectTitle: app.projectTitle,
        requestedAmount: app.requestedAmount,
        projectStartDate: app.projectStartDate,
        projectEndDate: app.projectEndDate || null,
        applicantType: app.applicantType,
        applicantName: app.applicantName || null,
        lastSavedAt: app.lastSavedAt || null,
        grantProgram: program // foreign key resolution
      },
      grantProgramSummary,
      allowedActions
    };
  }

  // 15. saveApplicationDraft
  saveApplicationDraft(applicationId, projectTitle, requestedAmount, projectStartDate, projectEndDate) {
    let applications = this._getFromStorage('grant_applications', []);
    const app = applications.find((a) => a.id === applicationId);
    if (!app) {
      return { success: false, application: null };
    }

    app.projectTitle = projectTitle;
    app.requestedAmount = requestedAmount;
    app.projectStartDate = projectStartDate;
    app.projectEndDate = projectEndDate || null;
    app.applicationStatus = 'draft';
    app.lastSavedAt = new Date().toISOString();

    this._saveToStorage('grant_applications', applications);

    return {
      success: true,
      application: {
        id: app.id,
        applicationStatus: app.applicationStatus,
        projectTitle: app.projectTitle,
        requestedAmount: app.requestedAmount,
        projectStartDate: app.projectStartDate,
        projectEndDate: app.projectEndDate,
        lastSavedAt: app.lastSavedAt
      }
    };
  }

  // 16. submitGrantApplication
  submitGrantApplication(applicationId) {
    let applications = this._getFromStorage('grant_applications', []);
    const app = applications.find((a) => a.id === applicationId);
    if (!app) {
      return { success: false, applicationStatus: null, submissionDate: null };
    }

    const now = new Date().toISOString();
    app.applicationStatus = 'submitted';
    app.submissionDate = now;
    app.lastSavedAt = now;

    this._saveToStorage('grant_applications', applications);

    return {
      success: true,
      applicationStatus: app.applicationStatus,
      submissionDate: app.submissionDate
    };
  }

  // 17. getApplicationsList
  getApplicationsList() {
    const applications = this._getFromStorage('grant_applications', []);
    const programs = this._getFromStorage('grant_programs', []);

    const programById = {};
    programs.forEach((p) => {
      programById[p.id] = p;
    });

    const draftApplications = [];
    const submittedApplications = [];

    applications.forEach((a) => {
      const program = programById[a.grantProgramId] || null;
      const base = {
        applicationId: a.id,
        grantProgramId: a.grantProgramId,
        grantProgramName: program ? program.name : null,
        applicationStatus: a.applicationStatus,
        grantProgram: program
      };

      if (a.applicationStatus === 'submitted') {
        submittedApplications.push({
          ...base,
          submissionDate: a.submissionDate || null
        });
      } else {
        draftApplications.push({
          ...base,
          lastSavedAt: a.lastSavedAt || null,
          applicationDeadline: program ? program.applicationDeadline || null : null
        });
      }
    });

    return {
      draftApplications,
      submittedApplications
    };
  }

  // 18. getDashboardOverview
  getDashboardOverview() {
    const account = this._getOrCreateCurrentAccount();
    const savedGrants = this._getFromStorage('saved_grants', []);
    const applications = this._getFromStorage('grant_applications', []);
    const programs = this._getFromStorage('grant_programs', []);
    const views = this._getFromStorage('recently_viewed_grants', []);

    const programById = {};
    programs.forEach((p) => {
      programById[p.id] = p;
    });

    const draftApplicationsCount = applications.filter((a) => a.applicationStatus === 'draft').length;
    const submittedApplicationsCount = applications.filter((a) => a.applicationStatus === 'submitted').length;

    const now = new Date();
    const upcomingDeadlines = programs
      .filter((p) => p.status === 'open' && p.applicationDeadline)
      .map((p) => {
        const deadline = this._parseDate(p.applicationDeadline);
        if (!deadline || deadline < now) return null;

        let userApplicationStatus = 'not_started';
        const appsForProgram = applications.filter((a) => a.grantProgramId === p.id);
        if (appsForProgram.some((a) => a.applicationStatus === 'submitted')) {
          userApplicationStatus = 'submitted';
        } else if (appsForProgram.some((a) => a.applicationStatus === 'draft')) {
          userApplicationStatus = 'draft_in_progress';
        }

        return {
          grantProgramId: p.id,
          grantProgramName: p.name,
          applicationDeadline: p.applicationDeadline,
          daysUntilDeadline: this._differenceInDays(deadline, now),
          userApplicationStatus,
          grantProgram: p
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline)
      .slice(0, 10);

    const recentlyViewedGrants = views
      .map((v) => {
        const program = programById[v.grantProgramId] || null;
        return {
          grantProgramId: v.grantProgramId,
          grantProgramName: program ? program.name : null,
          lastViewedAt: v.lastViewedAt,
          grantProgram: program
        };
      })
      .sort((a, b) => {
        const da = this._parseDate(a.lastViewedAt) || new Date(0);
        const db = this._parseDate(b.lastViewedAt) || new Date(0);
        return db - da;
      })
      .slice(0, 10);

    return {
      accountSummary: {
        accountType: account.accountType,
        displayName: account.accountType === 'organization_account'
          ? account.organizationName
          : account.fullName,
        email: account.email
      },
      savedGrantsCount: savedGrants.length,
      draftApplicationsCount,
      submittedApplicationsCount,
      upcomingDeadlines,
      recentlyViewedGrants
    };
  }

  // 19. createAccount
  createAccount(accountType, fullName, organizationName, email, password) {
    let accounts = this._getFromStorage('accounts', []);
    const now = new Date().toISOString();

    const account = {
      id: this._generateId('acct'),
      accountType,
      fullName: accountType === 'individual_applicant' ? fullName : null,
      organizationName: accountType === 'organization_account' ? organizationName : null,
      email,
      password,
      createdAt: now,
      lastLoginAt: now
    };

    accounts.push(account);
    this._saveToStorage('accounts', accounts);
    localStorage.setItem('currentAccountId', account.id);

    return {
      success: true,
      account: {
        id: account.id,
        accountType: account.accountType,
        fullName: account.fullName,
        organizationName: account.organizationName,
        email: account.email,
        createdAt: account.createdAt
      }
    };
  }

  // 20. getOrganizationProfile
  getOrganizationProfile() {
    const account = this._getOrCreateCurrentAccount();
    const profiles = this._getFromStorage('organization_profiles', []);
    const focusAreas = this._getFromStorage('focus_areas', []);

    const profile = profiles.find((p) => p.accountId === account.id) || null;

    return {
      profilePresent: !!profile,
      profile: profile
        ? {
            id: profile.id,
            organizationName: profile.organizationName,
            organizationType: profile.organizationType,
            annualBudget: profile.annualBudget,
            programAreaCodes: profile.programAreaCodes || [],
            mailingAddress: profile.mailingAddress || null,
            phoneNumber: profile.phoneNumber || null,
            websiteUrl: profile.websiteUrl || null,
            updatedAt: profile.updatedAt || null
          }
        : null,
      programAreas: focusAreas
    };
  }

  // 21. saveOrganizationProfile
  saveOrganizationProfile(
    organizationName,
    organizationType,
    annualBudget,
    programAreaCodes,
    mailingAddress,
    phoneNumber,
    websiteUrl
  ) {
    const account = this._getOrCreateCurrentAccount();
    let profiles = this._getFromStorage('organization_profiles', []);

    let profile = profiles.find((p) => p.accountId === account.id) || null;
    const now = new Date().toISOString();

    if (!profile) {
      profile = {
        id: this._generateId('org'),
        accountId: account.id,
        organizationName,
        organizationType,
        annualBudget,
        programAreaCodes: programAreaCodes || [],
        mailingAddress: mailingAddress || null,
        phoneNumber: phoneNumber || null,
        websiteUrl: websiteUrl || null,
        createdAt: now,
        updatedAt: now
      };
      profiles.push(profile);
    } else {
      profile.organizationName = organizationName;
      profile.organizationType = organizationType;
      profile.annualBudget = annualBudget;
      profile.programAreaCodes = programAreaCodes || [];
      profile.mailingAddress = mailingAddress || null;
      profile.phoneNumber = phoneNumber || null;
      profile.websiteUrl = websiteUrl || null;
      profile.updatedAt = now;
    }

    this._saveToStorage('organization_profiles', profiles);

    return {
      success: true,
      profile: {
        id: profile.id,
        organizationName: profile.organizationName,
        organizationType: profile.organizationType,
        annualBudget: profile.annualBudget,
        programAreaCodes: profile.programAreaCodes,
        mailingAddress: profile.mailingAddress,
        phoneNumber: profile.phoneNumber,
        websiteUrl: profile.websiteUrl,
        updatedAt: profile.updatedAt
      }
    };
  }

  // 22. getNotificationSettings
  getNotificationSettings() {
    const settings = this._getOrCreateNotificationSettingsForCurrentAccount();
    return {
      deadlineRemindersEnabled: settings.deadlineRemindersEnabled,
      deadlineReminderDaysBefore: settings.deadlineReminderDaysBefore,
      grantUpdatesEmailEnabled: settings.grantUpdatesEmailEnabled,
      grantUpdatesOnsiteEnabled: settings.grantUpdatesOnsiteEnabled,
      newsBlogEmailEnabled: settings.newsBlogEmailEnabled
    };
  }

  // 23. updateNotificationSettings
  updateNotificationSettings(
    deadlineRemindersEnabled,
    deadlineReminderDaysBefore,
    grantUpdatesEmailEnabled,
    grantUpdatesOnsiteEnabled,
    newsBlogEmailEnabled
  ) {
    let settingsList = this._getFromStorage('notification_settings', []);
    const account = this._getOrCreateCurrentAccount();
    let settings = settingsList.find((s) => s.accountId === account.id);

    if (!settings) {
      settings = this._getOrCreateNotificationSettingsForCurrentAccount();
      settingsList = this._getFromStorage('notification_settings', []);
    }

    settings.deadlineRemindersEnabled = !!deadlineRemindersEnabled;
    settings.deadlineReminderDaysBefore = settings.deadlineRemindersEnabled
      ? deadlineReminderDaysBefore
      : null;
    settings.grantUpdatesEmailEnabled = !!grantUpdatesEmailEnabled;
    settings.grantUpdatesOnsiteEnabled = !!grantUpdatesOnsiteEnabled;
    settings.newsBlogEmailEnabled = !!newsBlogEmailEnabled;
    settings.updatedAt = new Date().toISOString();

    this._saveToStorage('notification_settings', settingsList);

    return {
      success: true,
      settings: {
        deadlineRemindersEnabled: settings.deadlineRemindersEnabled,
        deadlineReminderDaysBefore: settings.deadlineReminderDaysBefore,
        grantUpdatesEmailEnabled: settings.grantUpdatesEmailEnabled,
        grantUpdatesOnsiteEnabled: settings.grantUpdatesOnsiteEnabled,
        newsBlogEmailEnabled: settings.newsBlogEmailEnabled
      }
    };
  }

  // 24. getEmailAlertOptions
  getEmailAlertOptions() {
    const focusAreas = this._getFromStorage('focus_areas', []);

    const geographicFocusOptions = [
      { value: 'entire_county', label: 'Entire County' },
      { value: 'specific_city', label: 'Specific City' },
      { value: 'specific_neighborhood', label: 'Specific Neighborhood' },
      { value: 'multiple_counties', label: 'Multiple Counties' },
      { value: 'other', label: 'Other' }
    ];

    const emailFrequencyOptions = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' }
    ];

    const notificationMethodOptions = [
      { value: 'email', label: 'Email' },
      { value: 'sms_text', label: 'SMS/Text' }
    ];

    return {
      geographicFocusOptions,
      emailFrequencyOptions,
      notificationMethodOptions,
      focusAreas
    };
  }

  // 25. subscribeToEmailAlerts
  subscribeToEmailAlerts(
    email,
    geographicFocus,
    interestAreaCodes,
    emailFrequency,
    notificationMethods,
    smsPhoneNumber
  ) {
    let subs = this._getFromStorage('email_alert_subscriptions', []);
    const now = new Date().toISOString();

    let sub = subs.find((s) => s.email === email) || null;

    if (!sub) {
      sub = {
        id: this._generateId('alert'),
        email,
        geographicFocus,
        interestAreaCodes: interestAreaCodes || [],
        emailFrequency,
        notificationMethods: notificationMethods || ['email'],
        smsPhoneNumber: smsPhoneNumber || null,
        isActive: true,
        createdAt: now,
        unsubscribedAt: null
      };
      subs.push(sub);
    } else {
      sub.geographicFocus = geographicFocus;
      sub.interestAreaCodes = interestAreaCodes || [];
      sub.emailFrequency = emailFrequency;
      sub.notificationMethods = notificationMethods || ['email'];
      sub.smsPhoneNumber = smsPhoneNumber || null;
      sub.isActive = true;
      if (!sub.createdAt) sub.createdAt = now;
      sub.unsubscribedAt = null;
    }

    this._saveToStorage('email_alert_subscriptions', subs);

    return {
      success: true,
      subscription: {
        id: sub.id,
        email: sub.email,
        geographicFocus: sub.geographicFocus,
        interestAreaCodes: sub.interestAreaCodes,
        emailFrequency: sub.emailFrequency,
        notificationMethods: sub.notificationMethods,
        isActive: sub.isActive,
        createdAt: sub.createdAt
      }
    };
  }

  // 26. getContactHelpContent
  getContactHelpContent() {
    return {
      faqSections: [
        {
          title: 'Who can apply for grants?',
          body:
            'Most grants are available to 501(c)(3) nonprofit organizations, public agencies, and fiscally sponsored projects working within the foundation\'s geographic focus.'
        },
        {
          title: 'When are grant deadlines?',
          body:
            'Grant deadlines vary by program. Please visit the Find Grants page for current open opportunities and deadlines.'
        }
      ],
      contactDetails: {
        email: 'grants@examplefoundation.test',
        phone: '555-555-5555',
        officeHours: 'Monday–Friday, 9:00 a.m. – 5:00 p.m.'
      }
    };
  }

  // 27. getContactFormOptions
  getContactFormOptions() {
    const programs = this._getFromStorage('grant_programs', []);

    const topics = [
      {
        value: 'eligibility_question',
        label: 'Eligibility Question',
        description: 'Questions about whether your project or organization is eligible.'
      },
      {
        value: 'technical_issue',
        label: 'Technical Issue',
        description: 'Problems using the website or online application system.'
      },
      {
        value: 'application_help',
        label: 'Application Help',
        description: 'Questions about application content, requirements, or process.'
      },
      {
        value: 'general_inquiry',
        label: 'General Inquiry',
        description: 'General questions not related to a specific grant program.'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Other questions or comments.'
      }
    ];

    const grantPrograms = programs.map((p) => ({
      id: p.id,
      name: p.name,
      shortName: p.shortName || null,
      status: p.status
    }));

    return {
      topics,
      grantPrograms
    };
  }

  // 28. submitContactMessage
  submitContactMessage(topic, grantProgramId, name, email, messageBody, preferredResponseMethod) {
    let messages = this._getFromStorage('contact_messages', []);
    const programs = this._getFromStorage('grant_programs', []);
    const program = programs.find((p) => p.id === grantProgramId) || null;

    const now = new Date().toISOString();

    const msg = {
      id: this._generateId('cm'),
      topic,
      grantProgramId: grantProgramId || null,
      grantProgramNameSnapshot: program ? program.name : null,
      name,
      email,
      messageBody,
      preferredResponseMethod,
      createdAt: now,
      status: 'submitted'
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      messageId: msg.id,
      status: msg.status,
      createdAt: msg.createdAt
    };
  }

  // 29. buildGrantAwardComparisonView
  buildGrantAwardComparisonView(grantAwardIds) {
    const awards = this._getFromStorage('grant_awards', []);
    const programs = this._getFromStorage('grant_programs', []);
    const programById = {};
    programs.forEach((p) => {
      programById[p.id] = p;
    });

    const selectedAwards = awards.filter((a) => grantAwardIds.indexOf(a.id) !== -1).slice(0, 3);

    const grantAwards = selectedAwards.map((a) => {
      const program = programById[a.grantProgramId] || null;
      return {
        grantAwardId: a.id,
        recipientOrganizationName: a.recipientOrganizationName,
        yearAwarded: a.yearAwarded,
        amountAwarded: a.amountAwarded,
        focusAreaCodes: a.focusAreaCodes || [],
        geographicAreaServed: a.geographicAreaServed || null,
        projectTitle: a.projectTitle || null,
        projectSummary: a.projectSummary || null,
        grantProgramName: program ? program.name : null,
        grantProgram: program
      };
    });

    return {
      grantAwards,
      canSaveComparison: grantAwards.length > 0 && grantAwards.length <= 3
    };
  }

  // 30. saveGrantAwardComparison
  saveGrantAwardComparison(name, grantAwardIds, notes) {
    let comparisons = this._getFromStorage('grant_comparisons', []);
    const now = new Date().toISOString();

    const comparison = {
      id: this._generateId('cmp'),
      name,
      grantAwardIds: grantAwardIds || [],
      notes: notes || null,
      createdAt: now,
      updatedAt: now
    };

    comparisons.push(comparison);
    this._saveToStorage('grant_comparisons', comparisons);

    return {
      success: true,
      comparison: {
        id: comparison.id,
        name: comparison.name,
        grantAwardIds: comparison.grantAwardIds,
        notes: comparison.notes,
        createdAt: comparison.createdAt
      }
    };
  }

  // 31. getSavedGrantComparisons
  getSavedGrantComparisons() {
    const comparisons = this._getFromStorage('grant_comparisons', []);
    const items = comparisons.map((c) => ({
      id: c.id,
      name: c.name,
      grantAwardCount: (c.grantAwardIds || []).length,
      createdAt: c.createdAt || null
    }));

    return {
      comparisons: items
    };
  }

  // 32. getAboutFoundationContent
  getAboutFoundationContent() {
    const focusAreas = this._getFromStorage('focus_areas', []);

    const mission =
      'Our mission is to strengthen our community by supporting nonprofits and residents working to improve youth outcomes, health, neighborhoods, the environment, and the arts.';

    const geographicFocusDescription =
      'The foundation primarily serves organizations and residents within the county, with an emphasis on neighborhoods experiencing the greatest barriers to opportunity.';

    const primaryFocusAreas = focusAreas;

    const grantmakingProcessSteps = [
      {
        order: 1,
        title: 'Explore grant opportunities',
        description:
          'Review open grant programs and past grant awards to understand funding priorities and typical award sizes.'
      },
      {
        order: 2,
        title: 'Check eligibility',
        description:
          'Use eligibility guidelines on each grant page and contact the foundation with questions before applying.'
      },
      {
        order: 3,
        title: 'Submit an application',
        description:
          'Complete the online application by the posted deadline, including required attachments and budget information.'
      },
      {
        order: 4,
        title: 'Review and decision',
        description:
          'Staff and community reviewers assess applications and make recommendations to the foundation\'s board.'
      },
      {
        order: 5,
        title: 'Award and reporting',
        description:
          'Funded partners receive an award agreement outlining reporting expectations and timelines.'
      }
    ];

    const resourceLinks = [
      { label: 'Find Grants', targetPage: 'find_grants' },
      { label: 'Contact & Help', targetPage: 'contact' },
      { label: 'Grant Email Alerts', targetPage: 'grant_email_alerts' }
    ];

    return {
      mission,
      geographicFocusDescription,
      primaryFocusAreas,
      grantmakingProcessSteps,
      resourceLinks
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
