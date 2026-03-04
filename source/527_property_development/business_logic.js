/* eslint-disable no-var */
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
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- INIT & STORAGE HELPERS ----------------------

  _initStorage() {
    const tables = [
      'award_categories',
      'nominations',
      'account_profiles',
      'winner_projects',
      'project_comparisons',
      'gala_events',
      'ticket_types',
      'ticket_orders',
      'ticket_order_items',
      'judge_shortlist_items',
      'conference_sessions',
      'schedule_items',
      'sponsorship_packages',
      'sponsorship_enquiries',
      'peoples_choice_finalists',
      'peoples_choice_votes',
      'partners',
      'favorite_partners'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // current ticket order id is managed separately; no default value needed
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
    }
  }

  _saveObjectToStorage(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
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

  _persistState(key, value) {
    this._saveObjectToStorage(key, value);
  }

  // ---------------------- ENUM LABEL HELPERS ----------------------

  _toTitleCase(str) {
    if (!str) return '';
    return str
      .split('_')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _getRegionLabel(value) {
    const map = {
      africa: 'Africa',
      asia_pacific: 'Asia Pacific',
      europe: 'Europe',
      middle_east: 'Middle East',
      north_america: 'North America',
      south_america: 'South America',
      global: 'Global'
    };
    return map[value] || this._toTitleCase(value || '');
  }

  _getPropertyTypeLabel(value) {
    return this._toTitleCase(value || '');
  }

  _getBuildingScaleLabel(value) {
    const map = {
      low_rise_1_4_floors: 'Low-rise (1–4 floors)',
      mid_rise_5_15_floors: 'Mid-rise (5–15 floors)',
      high_rise_16_plus_floors: 'High-rise (16+ floors)',
      masterplan_or_multi_building: 'Masterplan / Multi-building',
      not_applicable: 'Not applicable'
    };
    return map[value] || this._toTitleCase(value || '');
  }

  _getServiceTypeLabel(value) {
    return this._toTitleCase(value || '');
  }

  _getCategoryLabel(value) {
    return this._toTitleCase(value || '');
  }

  _getDayLabel(value) {
    const map = {
      day_1: 'Day 1',
      day_2: 'Day 2',
      day_3: 'Day 3',
      pre_conference: 'Pre-conference'
    };
    return map[value] || this._toTitleCase(value || '');
  }

  // ---------------------- INTERNAL STATE HELPERS ----------------------

  _getOrCreateNominationDraft(awardCategoryId) {
    const nominations = this._getFromStorage('nominations');
    let draft = nominations.find(
      n => n.awardCategoryId === awardCategoryId && n.nominationStatus === 'draft'
    );
    if (draft) return draft;

    const categories = this._getFromStorage('award_categories');
    const category = categories.find(c => c.id === awardCategoryId) || null;
    const now = new Date().toISOString();

    const nomination = {
      id: this._generateId('nom'),
      projectName: '',
      awardCategoryId,
      entrantRole: 'other',
      estimatedProjectValue: 0,
      estimatedProjectValueCurrency: 'usd',
      completionYear: (category && category.completionYearMax) || new Date().getFullYear(),
      region: (category && (category.regionFilter || 'global')) || 'global',
      propertyType: (category && category.propertyTypeFilter) || null,
      buildingScale: (category && category.buildingScaleFilter) || null,
      projectOverview: '',
      sustainabilityNarrative: '',
      innovationNarrative: '',
      sustainabilityScore: null,
      innovationScore: null,
      nominationYear: (category && category.awardCycleYear) || new Date().getFullYear(),
      nominationStatus: 'draft',
      createdAt: now,
      updatedAt: null
    };

    nominations.push(nomination);
    this._saveToStorage('nominations', nominations);
    return nomination;
  }

  _getOrCreateTicketOrderState(galaEventId) {
    const ticketOrders = this._getFromStorage('ticket_orders');
    let currentOrderId = localStorage.getItem('current_ticket_order_id');
    let order = null;

    if (currentOrderId) {
      order = ticketOrders.find(o => o.id === currentOrderId) || null;
    }

    if (order && galaEventId && order.galaEventId !== galaEventId) {
      // Different event requested – discard current and create new
      order = null;
      currentOrderId = null;
    }

    if (!order) {
      if (!galaEventId) {
        return null; // cannot create without gala event
      }
      const now = new Date().toISOString();
      order = {
        id: this._generateId('tord'),
        galaEventId,
        contactName: '',
        contactEmail: '',
        primaryAttendeeName: '',
        paymentMethod: 'pay_by_invoice',
        status: 'draft',
        totalAmount: 0,
        currency: 'usd',
        createdAt: now,
        updatedAt: null
      };
      ticketOrders.push(order);
      this._saveToStorage('ticket_orders', ticketOrders);
      localStorage.setItem('current_ticket_order_id', order.id);
    }

    return order;
  }

  _getCurrentTicketOrder() {
    const ticketOrders = this._getFromStorage('ticket_orders');
    const orderId = localStorage.getItem('current_ticket_order_id');
    if (!orderId) return { order: null, items: [] };
    const order = ticketOrders.find(o => o.id === orderId) || null;
    if (!order) return { order: null, items: [] };
    const items = this._getFromStorage('ticket_order_items').filter(
      i => i.ticketOrderId === order.id
    );
    return { order, items };
  }

  _getOrCreateProjectComparisonState() {
    const comps = this._getFromStorage('project_comparisons');
    let state = comps.find(c => c.id === 'current') || null;
    if (!state) {
      state = {
        id: 'current',
        projectIds: [],
        createdAt: new Date().toISOString()
      };
      comps.push(state);
      this._saveToStorage('project_comparisons', comps);
    }
    return state;
  }

  _getOrCreateJudgeShortlistState() {
    // For this simple single-user implementation, shortlist is just the table itself
    return this._getFromStorage('judge_shortlist_items');
  }

  _getOrCreateScheduleState() {
    return this._getFromStorage('schedule_items');
  }

  _getOrCreateFavoritePartnersState() {
    return this._getFromStorage('favorite_partners');
  }

  _validateNominationData(nominationData, strict) {
    const errors = [];

    if (!nominationData.awardCategoryId) {
      errors.push({ field: 'awardCategoryId', message: 'Award category is required.' });
    }

    if (!nominationData.projectName || nominationData.projectName.trim().length === 0) {
      errors.push({ field: 'projectName', message: 'Project name is required.' });
    }

    const validRoles = [
      'developer_owner',
      'architect',
      'consultant',
      'contractor',
      'operator',
      'investor',
      'other'
    ];
    if (!validRoles.includes(nominationData.entrantRole)) {
      errors.push({ field: 'entrantRole', message: 'Invalid entrant role.' });
    }

    if (
      typeof nominationData.estimatedProjectValue !== 'number' ||
      nominationData.estimatedProjectValue < 0
    ) {
      errors.push({ field: 'estimatedProjectValue', message: 'Estimated value must be a number >= 0.' });
    }

    const validCurrencies = ['usd', 'eur', 'gbp', 'aud', 'cad', 'other'];
    if (!validCurrencies.includes(nominationData.estimatedProjectValueCurrency)) {
      errors.push({ field: 'estimatedProjectValueCurrency', message: 'Invalid currency.' });
    }

    if (
      typeof nominationData.completionYear !== 'number' ||
      !Number.isFinite(nominationData.completionYear)
    ) {
      errors.push({ field: 'completionYear', message: 'Completion year is required.' });
    }

    const validRegions = [
      'africa',
      'asia_pacific',
      'europe',
      'middle_east',
      'north_america',
      'south_america',
      'global'
    ];
    if (!validRegions.includes(nominationData.region)) {
      errors.push({ field: 'region', message: 'Invalid region.' });
    }

    if (!nominationData.projectOverview || nominationData.projectOverview.trim().length === 0) {
      errors.push({ field: 'projectOverview', message: 'Project overview is required.' });
    }

    if (
      typeof nominationData.nominationYear !== 'number' ||
      !Number.isFinite(nominationData.nominationYear)
    ) {
      errors.push({ field: 'nominationYear', message: 'Nomination year is required.' });
    }

    // Additional strict checks can be added here based on category criteria

    return errors;
  }

  // ---------------------- CORE INTERFACES ----------------------

  // 1. getHomeOverview
  getHomeOverview() {
    const categories = this._getFromStorage('award_categories');
    const galaEvents = this._getFromStorage('gala_events');
    const nominations = this._getFromStorage('nominations');

    let currentAwardsCycleYear = null;
    const years = [];
    categories.forEach(c => years.push(c.awardCycleYear));
    galaEvents.forEach(g => {
      if (typeof g.awardsCycleYear === 'number') years.push(g.awardsCycleYear);
    });
    nominations.forEach(n => years.push(n.nominationYear));

    if (years.length > 0) {
      currentAwardsCycleYear = Math.max.apply(null, years);
    } else {
      currentAwardsCycleYear = new Date().getFullYear();
    }

    let galaDate = null;
    const today = new Date();
    const upcoming = galaEvents
      .map(g => ({ g, d: new Date(g.date) }))
      .filter(x => !isNaN(x.d.getTime()))
      .sort((a, b) => a.d - b.d);
    if (upcoming.length > 0) {
      galaDate = upcoming[0].d.toISOString();
    }

    const keyDates = {
      nominationOpenDate: null,
      nominationCloseDate: null,
      galaDate,
      conferenceStartDate: null,
      conferenceEndDate: null
    };

    return {
      currentAwardsCycleYear,
      keyDates,
      heroMessage: '',
      featuredContentBlocks: [],
      quickActions: []
    };
  }

  // 2. getAwardCategoryFilterOptions
  getAwardCategoryFilterOptions() {
    const categories = this._getFromStorage('award_categories');

    const propertyTypeSet = new Set();
    const buildingScaleSet = new Set();
    const regionSet = new Set();
    const completionYearSet = new Set();
    const budgetRangesMap = new Map();
    const awardCycleYearSet = new Set();

    categories.forEach(c => {
      if (c.propertyTypeFilter) propertyTypeSet.add(c.propertyTypeFilter);
      if (c.buildingScaleFilter) buildingScaleSet.add(c.buildingScaleFilter);
      if (c.regionFilter) regionSet.add(c.regionFilter);
      if (typeof c.completionYearMin === 'number') completionYearSet.add(c.completionYearMin);
      if (typeof c.completionYearMax === 'number') completionYearSet.add(c.completionYearMax);
      if (typeof c.budgetMin === 'number' || typeof c.budgetMax === 'number') {
        const key = `${c.budgetMin || 0}-${c.budgetMax || 0}`;
        if (!budgetRangesMap.has(key)) {
          const min = c.budgetMin || 0;
          const max = c.budgetMax || 0;
          budgetRangesMap.set(key, {
            min,
            max,
            label: `${min && max ? `$${min.toLocaleString()} - $${max.toLocaleString()}` : ''}`
          });
        }
      }
      if (typeof c.awardCycleYear === 'number') awardCycleYearSet.add(c.awardCycleYear);
    });

    return {
      propertyTypes: Array.from(propertyTypeSet).map(value => ({
        value,
        label: this._getPropertyTypeLabel(value)
      })),
      buildingScales: Array.from(buildingScaleSet).map(value => ({
        value,
        label: this._getBuildingScaleLabel(value)
      })),
      regions: Array.from(regionSet).map(value => ({
        value,
        label: this._getRegionLabel(value)
      })),
      completionYears: Array.from(completionYearSet).sort((a, b) => a - b),
      budgetRanges: Array.from(budgetRangesMap.values()),
      awardCycleYears: Array.from(awardCycleYearSet).sort((a, b) => a - b)
    };
  }

  // 3. searchAwardCategories
  searchAwardCategories(propertyType, buildingScale, completionYear, budgetMin, budgetMax, region, awardCycleYear, onlyActive) {
    const categories = this._getFromStorage('award_categories');
    const onlyActiveFlag = typeof onlyActive === 'boolean' ? onlyActive : true;

    const filtered = categories.filter(c => {
      if (onlyActiveFlag && !c.isActive) return false;

      if (propertyType) {
        const matchesPrimary = c.propertyTypeFilter === propertyType;
        const matchesApplicable = Array.isArray(c.applicablePropertyTypes)
          ? c.applicablePropertyTypes.includes(propertyType)
          : false;
        if (!matchesPrimary && !matchesApplicable) return false;
      }

      if (buildingScale) {
        const matchesPrimary = c.buildingScaleFilter === buildingScale;
        const matchesApplicable = Array.isArray(c.applicableBuildingScales)
          ? c.applicableBuildingScales.includes(buildingScale)
          : false;
        if (!matchesPrimary && !matchesApplicable) return false;
      }

      if (typeof completionYear === 'number') {
        if (
          typeof c.completionYearMin === 'number' &&
          completionYear < c.completionYearMin
        ) {
          return false;
        }
        if (
          typeof c.completionYearMax === 'number' &&
          completionYear > c.completionYearMax
        ) {
          return false;
        }
      }

      if (typeof budgetMin === 'number' || typeof budgetMax === 'number') {
        const catMin = typeof c.budgetMin === 'number' ? c.budgetMin : null;
        const catMax = typeof c.budgetMax === 'number' ? c.budgetMax : null;

        if (catMin !== null && typeof budgetMax === 'number' && catMin > budgetMax) {
          return false;
        }
        if (catMax !== null && typeof budgetMin === 'number' && catMax < budgetMin) {
          return false;
        }
      }

      if (region) {
        const matchesPrimary = c.regionFilter === region || c.regionFilter === 'global';
        const matchesApplicable = Array.isArray(c.applicableRegions)
          ? c.applicableRegions.includes(region) || c.applicableRegions.includes('global')
          : false;
        if (!matchesPrimary && !matchesApplicable) return false;
      }

      if (typeof awardCycleYear === 'number') {
        if (c.awardCycleYear !== awardCycleYear) return false;
      }

      return true;
    });

    return filtered.map(c => {
      const budgetRangeDisplay =
        typeof c.budgetMin === 'number' && typeof c.budgetMax === 'number'
          ? `$${c.budgetMin.toLocaleString()} - $${c.budgetMax.toLocaleString()}`
          : '';

      let eligibilitySummary = '';
      if (c.completionYearMin || c.completionYearMax) {
        eligibilitySummary += 'Completion: ';
        if (c.completionYearMin && c.completionYearMax) {
          eligibilitySummary += `${c.completionYearMin}-${c.completionYearMax}.`;
        } else if (c.completionYearMin) {
          eligibilitySummary += `From ${c.completionYearMin}.`;
        } else if (c.completionYearMax) {
          eligibilitySummary += `Up to ${c.completionYearMax}.`;
        }
      }

      return {
        id: c.id,
        name: c.name,
        shortDescription: (c.description || '').slice(0, 200),
        awardCycleYear: c.awardCycleYear,
        eligibilitySummary,
        propertyTypeLabel: this._getPropertyTypeLabel(c.propertyTypeFilter),
        buildingScaleLabel: this._getBuildingScaleLabel(c.buildingScaleFilter),
        regionLabel: this._getRegionLabel(c.regionFilter),
        budgetRangeDisplay,
        isActive: !!c.isActive
      };
    });
  }

  // 4. getAwardCategoryDetails
  getAwardCategoryDetails(awardCategoryId) {
    const categories = this._getFromStorage('award_categories');
    const c = categories.find(cat => cat.id === awardCategoryId) || null;
    if (!c) return null;

    return {
      id: c.id,
      name: c.name,
      description: c.description || '',
      awardCycleYear: c.awardCycleYear,
      eligibilityCriteria: '',
      judgingCriteria: '',
      applicablePropertyTypes: c.applicablePropertyTypes || [],
      applicableBuildingScales: c.applicableBuildingScales || [],
      applicableRegions: c.applicableRegions || [],
      completionYearRange: {
        min: typeof c.completionYearMin === 'number' ? c.completionYearMin : null,
        max: typeof c.completionYearMax === 'number' ? c.completionYearMax : null
      },
      budgetRange: {
        min: typeof c.budgetMin === 'number' ? c.budgetMin : null,
        max: typeof c.budgetMax === 'number' ? c.budgetMax : null
      },
      canStartNomination: !!c.isActive
    };
  }

  // 5. initNominationForCategory
  initNominationForCategory(awardCategoryId) {
    const nomination = this._getOrCreateNominationDraft(awardCategoryId);
    const categories = this._getFromStorage('award_categories');
    const category = categories.find(c => c.id === awardCategoryId) || null;

    const defaultValues = {
      awardCategoryId,
      nominationYear: nomination.nominationYear,
      completionYear: nomination.completionYear,
      region: nomination.region
    };

    // FK resolution per requirements
    if (category) {
      defaultValues.awardCategory = category;
    } else {
      defaultValues.awardCategory = null;
    }

    const entrantRoleOptions = [
      'developer_owner',
      'architect',
      'consultant',
      'contractor',
      'operator',
      'investor',
      'other'
    ].map(value => ({ value, label: this._toTitleCase(value) }));

    const currencyOptions = ['usd', 'eur', 'gbp', 'aud', 'cad', 'other'].map(value => ({
      value,
      label: value.toUpperCase()
    }));

    const regionOptions = [
      'africa',
      'asia_pacific',
      'europe',
      'middle_east',
      'north_america',
      'south_america',
      'global'
    ].map(value => ({ value, label: this._getRegionLabel(value) }));

    return {
      nominationId: nomination.id,
      defaultValues,
      fieldConfig: {
        entrantRoleOptions,
        currencyOptions,
        regionOptions
      }
    };
  }

  // 6. saveNominationDraft
  saveNominationDraft(nominationData) {
    const isUpdate = !!(nominationData && nominationData.id);
    const nominations = this._getFromStorage('nominations');

    let nomination = null;
    const now = new Date().toISOString();

    if (isUpdate) {
      nomination = nominations.find(n => n.id === nominationData.id) || null;
      if (!nomination) {
        return {
          success: false,
          message: 'Nomination not found.',
          nomination: null,
          validationErrors: []
        };
      }
    } else {
      nomination = {
        id: this._generateId('nom'),
        createdAt: now,
        nominationStatus: 'draft'
      };
      nominations.push(nomination);
    }

    // Assign/overwrite fields
    nomination.awardCategoryId = nominationData.awardCategoryId;
    nomination.projectName = nominationData.projectName;
    nomination.entrantRole = nominationData.entrantRole;
    nomination.estimatedProjectValue = nominationData.estimatedProjectValue;
    nomination.estimatedProjectValueCurrency = nominationData.estimatedProjectValueCurrency;
    nomination.completionYear = nominationData.completionYear;
    nomination.region = nominationData.region;
    nomination.propertyType = nominationData.propertyType || null;
    nomination.buildingScale = nominationData.buildingScale || null;
    nomination.projectOverview = nominationData.projectOverview;
    nomination.sustainabilityNarrative = nominationData.sustainabilityNarrative || '';
    nomination.innovationNarrative = nominationData.innovationNarrative || '';
    nomination.nominationYear = nominationData.nominationYear;
    if (!nomination.nominationStatus) nomination.nominationStatus = 'draft';
    nomination.updatedAt = now;

    const validationErrors = this._validateNominationData(nomination, false);

    if (validationErrors.length > 0) {
      if (!isUpdate) {
        // remove created draft if invalid
        const idx = nominations.findIndex(n => n.id === nomination.id);
        if (idx >= 0) nominations.splice(idx, 1);
      }
      this._saveToStorage('nominations', nominations);
      return {
        success: false,
        message: 'Validation failed.',
        nomination: null,
        validationErrors
      };
    }

    this._saveToStorage('nominations', nominations);

    const categories = this._getFromStorage('award_categories');
    const awardCategory = categories.find(c => c.id === nomination.awardCategoryId) || null;

    const responseNomination = {
      id: nomination.id,
      projectName: nomination.projectName,
      awardCategoryId: nomination.awardCategoryId,
      entrantRole: nomination.entrantRole,
      estimatedProjectValue: nomination.estimatedProjectValue,
      estimatedProjectValueCurrency: nomination.estimatedProjectValueCurrency,
      completionYear: nomination.completionYear,
      region: nomination.region,
      propertyType: nomination.propertyType,
      buildingScale: nomination.buildingScale,
      projectOverview: nomination.projectOverview,
      nominationYear: nomination.nominationYear,
      nominationStatus: nomination.nominationStatus
    };

    // FK resolution per requirements
    responseNomination.awardCategory = awardCategory;

    return {
      success: true,
      message: 'Nomination draft saved.',
      nomination: responseNomination,
      validationErrors: []
    };
  }

  // 7. submitNomination
  submitNomination(nominationId) {
    const nominations = this._getFromStorage('nominations');
    const nomination = nominations.find(n => n.id === nominationId) || null;
    if (!nomination) {
      return {
        success: false,
        message: 'Nomination not found.',
        nominationStatus: null
      };
    }

    const errors = this._validateNominationData(nomination, true);
    if (errors.length > 0) {
      return {
        success: false,
        message: 'Nomination is incomplete or invalid.',
        nominationStatus: nomination.nominationStatus
      };
    }

    nomination.nominationStatus = 'submitted';
    nomination.updatedAt = new Date().toISOString();
    this._saveToStorage('nominations', nominations);

    return {
      success: true,
      message: 'Nomination submitted successfully.',
      nominationStatus: nomination.nominationStatus
    };
  }

  // 8. getRegistrationFormConfig
  getRegistrationFormConfig() {
    const userTypeOptions = [
      'property_developer',
      'consultant',
      'investor',
      'sponsor',
      'judge',
      'other'
    ].map(value => ({ value, label: this._toTitleCase(value) }));

    const companySizeOptions = [
      '1_10_employees',
      '11_50_employees',
      '51_200_employees',
      '201_500_employees',
      '501_plus_employees'
    ].map(value => ({ value, label: value.replace(/_/g, ' ') }));

    return {
      userTypeOptions,
      companySizeOptions,
      passwordRules: 'Minimum 8 characters, including at least 1 letter and 1 number.',
      termsVersion: localStorage.getItem('terms_version') || '1.0'
    };
  }

  // 9. registerAccount
  registerAccount(fullName, email, userType, companyName, companySizeRange, password, confirmPassword, termsAccepted) {
    const validationErrors = [];

    if (!fullName || fullName.trim().length === 0) {
      validationErrors.push({ field: 'fullName', message: 'Full name is required.' });
    }

    const emailRegex = /.+@.+\..+/;
    if (!email || !emailRegex.test(email)) {
      validationErrors.push({ field: 'email', message: 'Valid email is required.' });
    }

    const validUserTypes = [
      'property_developer',
      'consultant',
      'investor',
      'sponsor',
      'judge',
      'other'
    ];
    if (!validUserTypes.includes(userType)) {
      validationErrors.push({ field: 'userType', message: 'Invalid user type.' });
    }

    const validCompanySizes = [
      '1_10_employees',
      '11_50_employees',
      '51_200_employees',
      '201_500_employees',
      '501_plus_employees'
    ];
    if (companySizeRange && !validCompanySizes.includes(companySizeRange)) {
      validationErrors.push({ field: 'companySizeRange', message: 'Invalid company size range.' });
    }

    if (!password || password.length < 8) {
      validationErrors.push({ field: 'password', message: 'Password must be at least 8 characters.' });
    }
    if (password !== confirmPassword) {
      validationErrors.push({ field: 'confirmPassword', message: 'Passwords do not match.' });
    }

    if (!termsAccepted) {
      validationErrors.push({ field: 'termsAccepted', message: 'You must accept the terms and conditions.' });
    }

    const profiles = this._getFromStorage('account_profiles');
    if (profiles.some(p => p.email === email)) {
      validationErrors.push({ field: 'email', message: 'An account with this email already exists.' });
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        message: 'Validation failed.',
        accountProfile: null,
        validationErrors
      };
    }

    const profile = {
      id: this._generateId('acct'),
      fullName,
      email,
      userType,
      companyName: companyName || '',
      companySizeRange: companySizeRange || null,
      password,
      termsAccepted: !!termsAccepted,
      createdAt: new Date().toISOString()
    };

    profiles.push(profile);
    this._saveToStorage('account_profiles', profiles);

    return {
      success: true,
      message: 'Account created successfully.',
      accountProfile: {
        id: profile.id,
        fullName: profile.fullName,
        email: profile.email,
        userType: profile.userType,
        companyName: profile.companyName,
        companySizeRange: profile.companySizeRange,
        createdAt: profile.createdAt
      },
      validationErrors: []
    };
  }

  // 10. getWinnersArchiveFilterOptions
  getWinnersArchiveFilterOptions() {
    const winners = this._getFromStorage('winner_projects');
    const yearsSet = new Set();
    const regionsSet = new Set();
    const categoriesSet = new Set();

    winners.forEach(w => {
      yearsSet.add(w.awardYear);
      if (w.region) regionsSet.add(w.region);
      if (w.categoryKey) categoriesSet.add(w.categoryKey);
    });

    const sortOptions = [
      { value: 'innovation_score_desc', label: 'Innovation Score - High to Low' },
      { value: 'sustainability_score_desc', label: 'Sustainability Score - High to Low' },
      { value: 'project_name_asc', label: 'Project Name A-Z' }
    ];

    return {
      years: Array.from(yearsSet).sort((a, b) => a - b),
      regions: Array.from(regionsSet).map(value => ({ value, label: this._getRegionLabel(value) })),
      categories: Array.from(categoriesSet).map(value => ({
        value,
        label: this._getCategoryLabel(value)
      })),
      sortOptions
    };
  }

  // 11. searchWinnerProjects
  searchWinnerProjects(year, region, categoryKey, sortBy) {
    const winners = this._getFromStorage('winner_projects');

    let res = winners.filter(w => {
      if (typeof year === 'number' && w.awardYear !== year) return false;
      if (region && w.region !== region) return false;
      if (categoryKey && w.categoryKey !== categoryKey) return false;
      return true;
    });

    if (sortBy === 'innovation_score_desc') {
      res = res.slice().sort((a, b) => (b.innovationScore || 0) - (a.innovationScore || 0));
    } else if (sortBy === 'sustainability_score_desc') {
      res = res.slice().sort((a, b) => (b.sustainabilityScore || 0) - (a.sustainabilityScore || 0));
    } else if (sortBy === 'project_name_asc') {
      res = res.slice().sort((a, b) => (a.projectName || '').localeCompare(b.projectName || ''));
    }

    return res.map(w => ({
      id: w.id,
      projectName: w.projectName,
      awardYear: w.awardYear,
      regionLabel: this._getRegionLabel(w.region),
      categoryLabel: this._getCategoryLabel(w.categoryKey),
      innovationScore: w.innovationScore || 0,
      sustainabilityScore: w.sustainabilityScore || 0,
      developerName: w.developerName || '',
      locationDisplay: [w.locationCity, w.locationCountry].filter(Boolean).join(', '),
      isOverallWinner: !!w.isOverallWinner
    }));
  }

  // 12. toggleWinnerProjectComparisonSelection
  toggleWinnerProjectComparisonSelection(winnerProjectId, selected) {
    const state = this._getOrCreateProjectComparisonState();
    const comps = this._getFromStorage('project_comparisons');
    const idx = comps.findIndex(c => c.id === state.id);
    const projectIds = state.projectIds || [];
    let message = '';
    let maxReached = false;

    if (selected) {
      if (!projectIds.includes(winnerProjectId)) {
        if (projectIds.length >= 2) {
          maxReached = true;
          message = 'Maximum of 2 projects can be compared.';
        } else {
          projectIds.push(winnerProjectId);
          message = 'Project added to comparison.';
        }
      }
    } else {
      const i = projectIds.indexOf(winnerProjectId);
      if (i >= 0) {
        projectIds.splice(i, 1);
        message = 'Project removed from comparison.';
      }
    }

    state.projectIds = projectIds;
    if (idx >= 0) {
      comps[idx] = state;
    } else {
      comps.push(state);
    }
    this._saveToStorage('project_comparisons', comps);

    return {
      selectedProjectIds: projectIds.slice(),
      maxReached,
      message
    };
  }

  // 13. getProjectComparisonView
  getProjectComparisonView() {
    const state = this._getOrCreateProjectComparisonState();
    const winners = this._getFromStorage('winner_projects');
    const awardCategories = this._getFromStorage('award_categories');

    const projects = (state.projectIds || []).map(id => {
      const w = winners.find(x => x.id === id);
      if (!w) return null;

      const project = {
        id: w.id,
        projectName: w.projectName,
        awardYear: w.awardYear,
        regionLabel: this._getRegionLabel(w.region),
        categoryLabel: this._getCategoryLabel(w.categoryKey),
        innovationScore: w.innovationScore || 0,
        sustainabilityScore: w.sustainabilityScore || 0,
        developerName: w.developerName || '',
        locationDisplay: [w.locationCity, w.locationCountry].filter(Boolean).join(', '),
        description: w.description || ''
      };

      // FK resolution example: winner_projects.awardCategoryId -> awardCategory
      if (w.awardCategoryId) {
        project.awardCategory =
          awardCategories.find(c => c.id === w.awardCategoryId) || null;
      } else {
        project.awardCategory = null;
      }

      return project;
    }).filter(Boolean);

    return { projects };
  }

  // 14. clearProjectComparisonSelection
  clearProjectComparisonSelection() {
    const state = this._getOrCreateProjectComparisonState();
    const comps = this._getFromStorage('project_comparisons');
    const idx = comps.findIndex(c => c.id === state.id);
    state.projectIds = [];
    if (idx >= 0) comps[idx] = state;
    this._saveToStorage('project_comparisons', comps);
    return { cleared: true };
  }

  // 15. getGalaOverview
  getGalaOverview() {
    const galaEvents = this._getFromStorage('gala_events');
    if (galaEvents.length === 0) {
      return {
        featuredGalaEvent: null,
        dressCode: '',
        scheduleHighlights: '',
        earlyBirdDeadline: null
      };
    }

    const now = new Date();
    const sorted = galaEvents
      .map(g => ({ g, d: new Date(g.date) }))
      .filter(x => !isNaN(x.d.getTime()))
      .sort((a, b) => a.d - b.d);

    let featured = sorted.find(x => x.d >= now) || sorted[0];
    const featuredGalaEvent = {
      id: featured.g.id,
      name: featured.g.name,
      date: featured.d.toISOString(),
      venueName: featured.g.venueName || '',
      venueAddress: featured.g.venueAddress || '',
      city: featured.g.city || '',
      country: featured.g.country || '',
      timezone: featured.g.timezone || '',
      awardsCycleYear: featured.g.awardsCycleYear || null
    };

    const ticketTypes = this._getFromStorage('ticket_types').filter(
      t => t.galaEventId === featured.g.id && t.isEarlyBird
    );
    let earlyBirdDeadline = null;
    ticketTypes.forEach(t => {
      if (t.availableUntil) {
        const d = new Date(t.availableUntil);
        if (!isNaN(d.getTime())) {
          if (!earlyBirdDeadline || d < new Date(earlyBirdDeadline)) {
            earlyBirdDeadline = d.toISOString();
          }
        }
      }
    });

    return {
      featuredGalaEvent,
      dressCode: '',
      scheduleHighlights: '',
      earlyBirdDeadline
    };
  }

  // 16. getGalaEvents
  getGalaEvents(awardsCycleYear) {
    const galaEvents = this._getFromStorage('gala_events');
    return galaEvents
      .filter(g => {
        if (typeof awardsCycleYear === 'number') {
          return g.awardsCycleYear === awardsCycleYear;
        }
        return true;
      })
      .map(g => ({
        id: g.id,
        name: g.name,
        date: g.date,
        city: g.city || '',
        country: g.country || ''
      }));
  }

  // 17. getTicketTypesForEvent
  getTicketTypesForEvent(galaEventId, onlyEarlyBird) {
    const ticketTypes = this._getFromStorage('ticket_types');
    const onlyEB = !!onlyEarlyBird;
    return ticketTypes
      .filter(t => {
        if (t.galaEventId !== galaEventId) return false;
        if (onlyEB && !t.isEarlyBird) return false;
        return true;
      })
      .map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || '',
        isEarlyBird: !!t.isEarlyBird,
        includesSeatedDinner: !!t.includesSeatedDinner,
        pricePerTicket: t.pricePerTicket,
        currency: t.currency,
        maxPerOrder: typeof t.maxPerOrder === 'number' ? t.maxPerOrder : null
      }));
  }

  // 18. setTicketSelectionForCurrentOrder
  setTicketSelectionForCurrentOrder(ticketTypeId, galaEventId, quantity, mealPreferenceForAll) {
    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      return { success: false, message: 'Quantity must be at least 1.', selection: null };
    }

    const ticketTypes = this._getFromStorage('ticket_types');
    const ticketType = ticketTypes.find(t => t.id === ticketTypeId) || null;
    if (!ticketType || ticketType.galaEventId !== galaEventId) {
      return { success: false, message: 'Ticket type not found for this event.', selection: null };
    }

    if (typeof ticketType.maxPerOrder === 'number' && qty > ticketType.maxPerOrder) {
      return {
        success: false,
        message: `Maximum ${ticketType.maxPerOrder} tickets allowed per order for this type.`,
        selection: null
      };
    }

    const order = this._getOrCreateTicketOrderState(galaEventId);
    if (!order) {
      return { success: false, message: 'Unable to create ticket order.', selection: null };
    }

    const ticketOrderItems = this._getFromStorage('ticket_order_items');
    // Remove existing items for this order
    for (let i = ticketOrderItems.length - 1; i >= 0; i--) {
      if (ticketOrderItems[i].ticketOrderId === order.id) {
        ticketOrderItems.splice(i, 1);
      }
    }

    const mealPref = mealPreferenceForAll || 'standard';

    for (let i = 0; i < qty; i++) {
      ticketOrderItems.push({
        id: this._generateId('titem'),
        ticketOrderId: order.id,
        ticketTypeId: ticketType.id,
        attendeeName: '',
        mealPreference: mealPref,
        unitPrice: ticketType.pricePerTicket,
        currency: ticketType.currency
      });
    }

    order.totalAmount = ticketType.pricePerTicket * qty;
    order.currency = ticketType.currency;
    order.updatedAt = new Date().toISOString();

    const ticketOrders = this._getFromStorage('ticket_orders');
    const idx = ticketOrders.findIndex(o => o.id === order.id);
    if (idx >= 0) ticketOrders[idx] = order;
    this._saveToStorage('ticket_orders', ticketOrders);
    this._saveToStorage('ticket_order_items', ticketOrderItems);

    const selection = {
      ticketTypeId: ticketType.id,
      ticketTypeName: ticketType.name,
      galaEventId: galaEventId,
      quantity: qty,
      unitPrice: ticketType.pricePerTicket,
      currency: ticketType.currency,
      totalPrice: ticketType.pricePerTicket * qty,
      mealPreferenceForAll: mealPref
    };

    // FK resolution for selection object
    const galaEvents = this._getFromStorage('gala_events');
    selection.galaEvent = galaEvents.find(g => g.id === galaEventId) || null;
    selection.ticketType = ticketType;

    return {
      success: true,
      message: 'Ticket selection updated.',
      selection
    };
  }

  // 19. getCurrentTicketSelection
  getCurrentTicketSelection() {
    const { order, items } = this._getCurrentTicketOrder();
    if (!order || items.length === 0) {
      return {
        hasSelection: false,
        galaEventId: null,
        ticketTypeId: null,
        ticketTypeName: null,
        quantity: 0,
        unitPrice: null,
        currency: null,
        totalPrice: 0,
        mealPreferenceForAll: null,
        galaEvent: null,
        ticketType: null
      };
    }

    const firstItem = items[0];
    const ticketTypes = this._getFromStorage('ticket_types');
    const ticketType = ticketTypes.find(t => t.id === firstItem.ticketTypeId) || null;
    const galaEvents = this._getFromStorage('gala_events');
    const galaEvent = galaEvents.find(g => g.id === order.galaEventId) || null;

    const quantity = items.length;
    const unitPrice = firstItem.unitPrice;
    const currency = firstItem.currency;
    const totalPrice = unitPrice * quantity;
    const allSameMeal = items.every(i => i.mealPreference === firstItem.mealPreference);
    const mealPreferenceForAll = allSameMeal ? firstItem.mealPreference : null;

    const result = {
      hasSelection: true,
      galaEventId: order.galaEventId,
      ticketTypeId: firstItem.ticketTypeId,
      ticketTypeName: ticketType ? ticketType.name : null,
      quantity,
      unitPrice,
      currency,
      totalPrice,
      mealPreferenceForAll,
      galaEvent,
      ticketType
    };

    return result;
  }

  // 20. updateTicketOrderDetails
  updateTicketOrderDetails(contactName, contactEmail, primaryAttendeeName, paymentMethod) {
    const { order } = this._getCurrentTicketOrder();
    if (!order) {
      return { success: false, message: 'No current ticket order.' };
    }

    const validMethods = ['pay_by_invoice', 'credit_card', 'bank_transfer'];
    if (!validMethods.includes(paymentMethod)) {
      return { success: false, message: 'Invalid payment method.' };
    }

    const emailRegex = /.+@.+\..+/;
    if (!contactEmail || !emailRegex.test(contactEmail)) {
      return { success: false, message: 'Valid contact email is required.' };
    }

    order.contactName = contactName || '';
    order.contactEmail = contactEmail;
    order.primaryAttendeeName = primaryAttendeeName || '';
    order.paymentMethod = paymentMethod;
    order.status = 'review';
    order.updatedAt = new Date().toISOString();

    const ticketOrders = this._getFromStorage('ticket_orders');
    const idx = ticketOrders.findIndex(o => o.id === order.id);
    if (idx >= 0) ticketOrders[idx] = order;
    this._saveToStorage('ticket_orders', ticketOrders);

    return { success: true, message: 'Order details updated.' };
  }

  // 21. getTicketOrderReview
  getTicketOrderReview() {
    const { order, items } = this._getCurrentTicketOrder();
    if (!order) {
      return {
        orderId: null,
        galaEvent: null,
        contactName: null,
        contactEmail: null,
        primaryAttendeeName: null,
        paymentMethod: null,
        items: [],
        totalAmount: 0,
        currency: null,
        status: 'draft'
      };
    }

    const galaEvents = this._getFromStorage('gala_events');
    const gala = galaEvents.find(g => g.id === order.galaEventId) || {};

    const ticketTypes = this._getFromStorage('ticket_types');

    // group items by ticketType & mealPreference
    const groupMap = new Map();
    items.forEach(it => {
      const key = `${it.ticketTypeId}-${it.mealPreference || 'none'}`;
      const existing = groupMap.get(key) || {
        ticketTypeId: it.ticketTypeId,
        mealPreference: it.mealPreference || null,
        quantity: 0,
        unitPrice: it.unitPrice,
        currency: it.currency
      };
      existing.quantity += 1;
      groupMap.set(key, existing);
    });

    const reviewItems = [];
    groupMap.forEach(group => {
      const tt = ticketTypes.find(t => t.id === group.ticketTypeId) || {};
      reviewItems.push({
        ticketTypeName: tt.name || '',
        quantity: group.quantity,
        unitPrice: group.unitPrice,
        currency: group.currency,
        mealPreference: group.mealPreference,
        lineTotal: group.unitPrice * group.quantity
      });
    });

    const totalAmount = reviewItems.reduce((sum, it) => sum + it.lineTotal, 0);

    return {
      orderId: order.id,
      galaEvent: {
        name: gala.name || '',
        date: gala.date || null,
        venueName: gala.venueName || '',
        city: gala.city || '',
        country: gala.country || ''
      },
      contactName: order.contactName || '',
      contactEmail: order.contactEmail || '',
      primaryAttendeeName: order.primaryAttendeeName || '',
      paymentMethod: order.paymentMethod || null,
      items: reviewItems,
      totalAmount,
      currency: order.currency,
      status: order.status
    };
  }

  // 22. getJudgeNominationsFilterOptions
  getJudgeNominationsFilterOptions() {
    const nominations = this._getFromStorage('nominations');
    const categoriesSet = new Set();
    const yearsSet = new Set();
    const regionsSet = new Set();

    let minScore = null;
    let maxScore = null;

    nominations.forEach(n => {
      if (n.propertyType) categoriesSet.add(n.propertyType);
      if (typeof n.nominationYear === 'number') yearsSet.add(n.nominationYear);
      if (n.region) regionsSet.add(n.region);
      if (typeof n.sustainabilityScore === 'number') {
        if (minScore === null || n.sustainabilityScore < minScore) minScore = n.sustainabilityScore;
        if (maxScore === null || n.sustainabilityScore > maxScore) maxScore = n.sustainabilityScore;
      }
    });

    if (minScore === null) minScore = 0;
    if (maxScore === null) maxScore = 100;

    const sortOptions = [
      { value: 'sustainability_score_desc', label: 'Sustainability Score - High to Low' },
      { value: 'innovation_score_desc', label: 'Innovation Score - High to Low' }
    ];

    return {
      years: Array.from(yearsSet).sort((a, b) => a - b),
      categories: Array.from(categoriesSet).map(value => ({
        value,
        label: this._getCategoryLabel(value)
      })),
      regions: Array.from(regionsSet).map(value => ({ value, label: this._getRegionLabel(value) })),
      sustainabilityScoreRange: { min: minScore, max: maxScore },
      sortOptions
    };
  }

  // 23. searchJudgeNominations
  searchJudgeNominations(year, category, region, minSustainabilityScore, sortBy) {
    const nominations = this._getFromStorage('nominations');
    const awardCategories = this._getFromStorage('award_categories');
    const shortlistItems = this._getFromStorage('judge_shortlist_items');
    const shortlistedIds = new Set(shortlistItems.map(s => s.nominationId));

    const filtered = nominations.filter(n => {
      if (typeof year === 'number' && n.nominationYear !== year) return false;
      if (region && n.region !== region) return false;
      if (typeof minSustainabilityScore === 'number') {
        if ((n.sustainabilityScore || 0) < minSustainabilityScore) return false;
      }
      if (category) {
        // Category can map to different domain concepts:
        // - nomination.propertyType
        // - award category's propertyTypeFilter
        // - a prefix of the awardCategoryId (e.g. "sustainable_development")
        if (n.propertyType === category) return true;

        const cat = awardCategories.find(c => c.id === n.awardCategoryId);
        if (cat) {
          if (cat.propertyTypeFilter === category) return true;
          if (typeof cat.id === 'string' && cat.id.indexOf(category) === 0) return true;
        }

        if (typeof n.awardCategoryId === 'string' && n.awardCategoryId.indexOf(category) === 0) {
          return true;
        }

        return false;
      }
      return true;
    });

    let res = filtered;
    if (sortBy === 'sustainability_score_desc') {
      res = res.slice().sort((a, b) => (b.sustainabilityScore || 0) - (a.sustainabilityScore || 0));
    } else if (sortBy === 'innovation_score_desc') {
      res = res.slice().sort((a, b) => (b.innovationScore || 0) - (a.innovationScore || 0));
    }

    return res.map(n => {
      const cat = awardCategories.find(c => c.id === n.awardCategoryId) || {};
      return {
        id: n.id,
        projectName: n.projectName,
        awardCategoryName: cat.name || '',
        regionLabel: this._getRegionLabel(n.region),
        sustainabilityScore: n.sustainabilityScore || 0,
        innovationScore: n.innovationScore || 0,
        nominationYear: n.nominationYear,
        isShortlisted: shortlistedIds.has(n.id)
      };
    });
  }

  // 24. addNominationToShortlist
  addNominationToShortlist(nominationId) {
    const nominations = this._getFromStorage('nominations');
    const nomination = nominations.find(n => n.id === nominationId) || null;
    if (!nomination) {
      return { added: false, message: 'Nomination not found.' };
    }

    const shortlistItems = this._getFromStorage('judge_shortlist_items');
    if (shortlistItems.some(s => s.nominationId === nominationId)) {
      return { added: false, message: 'Nomination already in shortlist.' };
    }

    shortlistItems.push({
      id: this._generateId('jsi'),
      nominationId,
      addedAt: new Date().toISOString()
    });
    this._saveToStorage('judge_shortlist_items', shortlistItems);

    return { added: true, message: 'Nomination added to shortlist.' };
  }

  // 25. removeNominationFromShortlist
  removeNominationFromShortlist(nominationId) {
    const shortlistItems = this._getFromStorage('judge_shortlist_items');
    const before = shortlistItems.length;
    const filtered = shortlistItems.filter(s => s.nominationId !== nominationId);
    this._saveToStorage('judge_shortlist_items', filtered);
    return { removed: filtered.length < before };
  }

  // 26. getJudgeShortlist
  getJudgeShortlist() {
    const shortlistItems = this._getFromStorage('judge_shortlist_items');
    const nominations = this._getFromStorage('nominations');
    const awardCategories = this._getFromStorage('award_categories');

    return shortlistItems.map(s => {
      const n = nominations.find(nom => nom.id === s.nominationId) || {};
      const cat = awardCategories.find(c => c.id === n.awardCategoryId) || {};
      const item = {
        nominationId: s.nominationId,
        projectName: n.projectName || '',
        awardCategoryName: cat.name || '',
        regionLabel: this._getRegionLabel(n.region),
        sustainabilityScore: n.sustainabilityScore || 0,
        innovationScore: n.innovationScore || 0
      };

      // FK resolution: include full nomination object
      item.nomination = n || null;

      return item;
    });
  }

  // 27. getConferenceFilterOptions
  getConferenceFilterOptions() {
    const sessions = this._getFromStorage('conference_sessions');

    const daysSet = new Set();
    const tracksSet = new Set();
    const tagsSet = new Set();

    sessions.forEach(s => {
      if (s.day) daysSet.add(s.day);
      if (s.track) tracksSet.add(s.track);
      if (Array.isArray(s.tags)) s.tags.forEach(t => tagsSet.add(t));
    });

    const sortOptions = [
      { value: 'start_time_asc', label: 'Start time - earliest first' }
    ];

    return {
      days: Array.from(daysSet).map(value => ({ value, label: this._getDayLabel(value) })),
      tracks: Array.from(tracksSet).map(value => ({ value, label: value })),
      topicTags: Array.from(tagsSet),
      sortOptions
    };
  }

  // 28. searchConferenceSessions
  searchConferenceSessions(day, track, keyword, sortBy) {
    const sessions = this._getFromStorage('conference_sessions');
    const scheduleItems = this._getFromStorage('schedule_items');
    const scheduledIds = new Set(scheduleItems.map(s => s.sessionId));

    const kw = (keyword || '').toLowerCase();

    let filtered = sessions.filter(s => {
      if (day && s.day !== day) return false;
      if (track && s.track !== track) return false;
      if (kw) {
        const inTitle = (s.title || '').toLowerCase().includes(kw);
        const inDesc = (s.description || '').toLowerCase().includes(kw);
        if (!inTitle && !inDesc) return false;
      }
      return true;
    });

    if (sortBy === 'start_time_asc') {
      filtered = filtered.slice().sort((a, b) => {
        const da = new Date(a.startTime);
        const db = new Date(b.startTime);
        return da - db;
      });
    }

    return filtered.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description || '',
      dayLabel: this._getDayLabel(s.day),
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room || '',
      speakers: s.speakers || '',
      tags: Array.isArray(s.tags) ? s.tags : [],
      isInMySchedule: scheduledIds.has(s.id)
    }));
  }

  // 29. addSessionToSchedule
  addSessionToSchedule(sessionId, allowOverlap) {
    const sessions = this._getFromStorage('conference_sessions');
    const session = sessions.find(s => s.id === sessionId) || null;
    if (!session) {
      return { added: false, message: 'Session not found.', conflicts: [] };
    }

    const scheduleItems = this._getFromStorage('schedule_items');

    if (scheduleItems.some(s => s.sessionId === sessionId)) {
      return { added: false, message: 'Session already in schedule.', conflicts: [] };
    }

    const allow = !!allowOverlap;
    const conflicts = [];

    if (!allow) {
      const sessionStart = new Date(session.startTime);
      const sessionEnd = new Date(session.endTime);

      scheduleItems.forEach(si => {
        const other = sessions.find(s => s.id === si.sessionId);
        if (!other) return;
        const oStart = new Date(other.startTime);
        const oEnd = new Date(other.endTime);
        if (sessionStart < oEnd && sessionEnd > oStart) {
          conflicts.push({
            sessionId: other.id,
            title: other.title,
            startTime: other.startTime,
            endTime: other.endTime
          });
        }
      });

      if (conflicts.length > 0) {
        return { added: false, message: 'Session conflicts with existing schedule.', conflicts };
      }
    }

    scheduleItems.push({
      id: this._generateId('sched'),
      sessionId,
      addedAt: new Date().toISOString()
    });
    this._saveToStorage('schedule_items', scheduleItems);

    return { added: true, message: 'Session added to schedule.', conflicts: [] };
  }

  // 30. removeSessionFromSchedule
  removeSessionFromSchedule(sessionId) {
    const scheduleItems = this._getFromStorage('schedule_items');
    const before = scheduleItems.length;
    const filtered = scheduleItems.filter(s => s.sessionId !== sessionId);
    this._saveToStorage('schedule_items', filtered);
    return { removed: filtered.length < before };
  }

  // 31. getMySchedule
  getMySchedule() {
    const scheduleItems = this._getFromStorage('schedule_items');
    const sessions = this._getFromStorage('conference_sessions');

    return scheduleItems
      .map(si => {
        const s = sessions.find(sess => sess.id === si.sessionId) || null;
        if (!s) return null;
        const item = {
          sessionId: s.id,
          title: s.title,
          dayLabel: this._getDayLabel(s.day),
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room || ''
        };
        // FK resolution
        item.session = s;
        return item;
      })
      .filter(Boolean);
  }

  // 32. getSponsorshipPackages
  getSponsorshipPackages(maxPrice, requiresWebsiteLogo, minIncludedGalaTickets, awardsCycle) {
    const packages = this._getFromStorage('sponsorship_packages');
    const requiresLogo = typeof requiresWebsiteLogo === 'boolean' ? requiresWebsiteLogo : false;
    const minTickets = typeof minIncludedGalaTickets === 'number' ? minIncludedGalaTickets : null;

    return packages
      .filter(p => {
        if (typeof maxPrice === 'number' && p.price > maxPrice) return false;
        if (requiresLogo && !p.includesWebsiteLogo) return false;
        if (minTickets !== null && p.includedGalaTickets < minTickets) return false;
        if (awardsCycle) {
          if (!Array.isArray(p.availableCycles)) return false;
          if (!p.availableCycles.includes(awardsCycle)) return false;
        }
        return true;
      })
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        price: p.price,
        currency: p.currency,
        includesWebsiteLogo: !!p.includesWebsiteLogo,
        includedGalaTickets: p.includedGalaTickets,
        level: p.level || null,
        isActive: !!p.isActive
      }));
  }

  // 33. getSponsorshipComparisonView
  getSponsorshipComparisonView() {
    const packages = this._getFromStorage('sponsorship_packages');

    const pkgs = packages.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency,
      includesWebsiteLogo: !!p.includesWebsiteLogo,
      includedGalaTickets: p.includedGalaTickets,
      levelLabel: p.level ? this._toTitleCase(p.level) : '',
      benefitsSummary: p.description || ''
    }));

    return { packages: pkgs };
  }

  // 34. initSponsorshipEnquiryForm
  initSponsorshipEnquiryForm(sponsorshipPackageId) {
    const packages = this._getFromStorage('sponsorship_packages');
    const pkg = sponsorshipPackageId
      ? packages.find(p => p.id === sponsorshipPackageId) || null
      : null;

    const awardsCycleOptions = [
      { value: 'awards_cycle_2024', label: '2024 Awards Cycle' },
      { value: 'awards_cycle_2025', label: '2025 Awards Cycle' },
      { value: 'awards_cycle_2026', label: '2026 Awards Cycle' }
    ];

    return {
      selectedPackageId: pkg ? pkg.id : null,
      selectedPackageName: pkg ? pkg.name : null,
      awardsCycleOptions,
      sponsorshipPackage: pkg || null
    };
  }

  // 35. submitSponsorshipEnquiry
  submitSponsorshipEnquiry(fullName, company, email, sponsorshipPackageId, awardsCycle, message) {
    const validationErrors = [];

    if (!fullName || fullName.trim().length === 0) {
      validationErrors.push('Full name is required.');
    }
    const emailRegex = /.+@.+\..+/;
    if (!email || !emailRegex.test(email)) {
      validationErrors.push('Valid email is required.');
    }
    const packages = this._getFromStorage('sponsorship_packages');
    const pkg = packages.find(p => p.id === sponsorshipPackageId) || null;
    if (!pkg) {
      validationErrors.push('Selected sponsorship package not found.');
    }
    const validCycles = ['awards_cycle_2024', 'awards_cycle_2025', 'awards_cycle_2026'];
    if (!validCycles.includes(awardsCycle)) {
      validationErrors.push('Invalid awards cycle.');
    }

    if (validationErrors.length > 0) {
      return {
        success: false,
        message: validationErrors.join(' '),
        enquiryId: null
      };
    }

    const enquiries = this._getFromStorage('sponsorship_enquiries');
    const enquiry = {
      id: this._generateId('spenq'),
      fullName,
      company: company || '',
      email,
      sponsorshipPackageId,
      awardsCycle,
      message: message || '',
      submittedAt: new Date().toISOString()
    };
    enquiries.push(enquiry);
    this._saveToStorage('sponsorship_enquiries', enquiries);

    return {
      success: true,
      message: 'Sponsorship enquiry submitted.',
      enquiryId: enquiry.id
    };
  }

  // 36. getPeoplesChoiceFilterOptions
  getPeoplesChoiceFilterOptions() {
    const finalists = this._getFromStorage('peoples_choice_finalists');
    const yearsSet = new Set();
    const categoriesSet = new Set();

    finalists.forEach(f => {
      yearsSet.add(f.year);
      if (f.category) categoriesSet.add(f.category);
    });

    const sortOptions = [
      { value: 'estimated_carbon_footprint_asc', label: 'Estimated Carbon Footprint - Low to High' },
      { value: 'estimated_carbon_footprint_desc', label: 'Estimated Carbon Footprint - High to Low' },
      { value: 'project_name_asc', label: 'Project Name A-Z' }
    ];

    return {
      years: Array.from(yearsSet).sort((a, b) => a - b),
      categories: Array.from(categoriesSet).map(value => ({
        value,
        label: this._getCategoryLabel(value)
      })),
      sortOptions
    };
  }

  // 37. searchPeoplesChoiceFinalists
  searchPeoplesChoiceFinalists(year, category, sortBy) {
    const finalists = this._getFromStorage('peoples_choice_finalists');

    let filtered = finalists.filter(f => {
      if (typeof year === 'number' && f.year !== year) return false;
      if (category && f.category !== category) return false;
      return true;
    });

    if (sortBy === 'estimated_carbon_footprint_asc') {
      filtered = filtered.slice().sort((a, b) => a.estimatedCarbonFootprint - b.estimatedCarbonFootprint);
    } else if (sortBy === 'estimated_carbon_footprint_desc') {
      filtered = filtered.slice().sort((a, b) => b.estimatedCarbonFootprint - a.estimatedCarbonFootprint);
    } else if (sortBy === 'project_name_asc') {
      filtered = filtered.slice().sort((a, b) => (a.projectName || '').localeCompare(b.projectName || ''));
    }

    return filtered.map(f => ({
      id: f.id,
      projectName: f.projectName,
      year: f.year,
      categoryLabel: this._getCategoryLabel(f.category),
      regionLabel: this._getRegionLabel(f.region),
      estimatedCarbonFootprint: f.estimatedCarbonFootprint,
      carbonFootprintDisplay: f.carbonFootprintDisplay || String(f.estimatedCarbonFootprint),
      locationDisplay: [f.projectLocationCity, f.projectLocationCountry].filter(Boolean).join(', ')
    }));
  }

  // 38. getPeoplesChoiceFinalistDetails
  getPeoplesChoiceFinalistDetails(finalistId) {
    const finalists = this._getFromStorage('peoples_choice_finalists');
    const f = finalists.find(x => x.id === finalistId) || null;
    if (!f) return null;

    return {
      id: f.id,
      projectName: f.projectName,
      year: f.year,
      categoryLabel: this._getCategoryLabel(f.category),
      regionLabel: this._getRegionLabel(f.region),
      estimatedCarbonFootprint: f.estimatedCarbonFootprint,
      carbonFootprintDisplay: f.carbonFootprintDisplay || String(f.estimatedCarbonFootprint),
      description: f.description || '',
      locationDisplay: [f.projectLocationCity, f.projectLocationCountry].filter(Boolean).join(', ')
    };
  }

  // 39. submitPeoplesChoiceVote
  submitPeoplesChoiceVote(finalistId, voterName, voterEmail) {
    const finalists = this._getFromStorage('peoples_choice_finalists');
    const finalist = finalists.find(f => f.id === finalistId) || null;
    if (!finalist) {
      return { success: false, message: 'Finalist not found.', voteId: null };
    }

    const errors = [];
    if (!voterName || voterName.trim().length === 0) {
      errors.push('Name is required.');
    }
    const emailRegex = /.+@.+\..+/;
    if (!voterEmail || !emailRegex.test(voterEmail)) {
      errors.push('Valid email is required.');
    }
    if (errors.length > 0) {
      return { success: false, message: errors.join(' '), voteId: null };
    }

    const votes = this._getFromStorage('peoples_choice_votes');
    const vote = {
      id: this._generateId('pcvote'),
      finalistId,
      voterName,
      voterEmail,
      submittedAt: new Date().toISOString()
    };
    votes.push(vote);
    this._saveToStorage('peoples_choice_votes', votes);

    return { success: true, message: 'Vote submitted.', voteId: vote.id };
  }

  // 40. getPartnerDirectoryFilterOptions
  getPartnerDirectoryFilterOptions() {
    const serviceTypes = [
      'sustainability_consulting',
      'architecture',
      'engineering',
      'construction',
      'legal',
      'finance',
      'marketing',
      'technology',
      'other'
    ].map(value => ({ value, label: this._getServiceTypeLabel(value) }));

    const regions = [
      'africa',
      'asia_pacific',
      'europe',
      'middle_east',
      'north_america',
      'south_america',
      'global'
    ].map(value => ({ value, label: this._getRegionLabel(value) }));

    const minRatingOptions = [0, 1, 2, 3, 4, 5];

    const sortOptions = [
      { value: 'rating_desc', label: 'Rating - High to Low' },
      { value: 'rating_asc', label: 'Rating - Low to High' },
      { value: 'name_asc', label: 'Name A-Z' }
    ];

    return { serviceTypes, regions, minRatingOptions, sortOptions };
  }

  // 41. searchPartners
  searchPartners(serviceType, region, minRating, sortBy) {
    const partners = this._getFromStorage('partners');
    const favorites = this._getFromStorage('favorite_partners');
    const favoriteIds = new Set(favorites.map(f => f.partnerId));

    let filtered = partners.filter(p => {
      if (serviceType && p.serviceType !== serviceType) return false;
      if (region && p.region !== region) return false;
      if (typeof minRating === 'number') {
        if ((p.rating || 0) < minRating) return false;
      }
      return true;
    });

    if (sortBy === 'rating_desc') {
      filtered = filtered.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'rating_asc') {
      filtered = filtered.slice().sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else if (sortBy === 'name_asc') {
      filtered = filtered.slice().sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return filtered.map(p => ({
      id: p.id,
      name: p.name,
      serviceTypeLabel: this._getServiceTypeLabel(p.serviceType),
      regionLabel: this._getRegionLabel(p.region),
      rating: p.rating || 0,
      description: p.description || '',
      city: p.city || '',
      country: p.country || '',
      isFavorite: favoriteIds.has(p.id)
    }));
  }

  // 42. addPartnerToFavorites
  addPartnerToFavorites(partnerId) {
    const partners = this._getFromStorage('partners');
    const partner = partners.find(p => p.id === partnerId) || null;
    if (!partner) {
      return { added: false, message: 'Partner not found.' };
    }

    const favorites = this._getFromStorage('favorite_partners');
    if (favorites.some(f => f.partnerId === partnerId)) {
      return { added: false, message: 'Partner already in favorites.' };
    }

    favorites.push({
      id: this._generateId('favp'),
      partnerId,
      addedAt: new Date().toISOString()
    });
    this._saveToStorage('favorite_partners', favorites);

    return { added: true, message: 'Partner added to favorites.' };
  }

  // 43. removePartnerFromFavorites
  removePartnerFromFavorites(partnerId) {
    const favorites = this._getFromStorage('favorite_partners');
    const before = favorites.length;
    const filtered = favorites.filter(f => f.partnerId !== partnerId);
    this._saveToStorage('favorite_partners', filtered);
    return { removed: filtered.length < before };
  }

  // 44. getFavoritePartners
  getFavoritePartners() {
    const favorites = this._getFromStorage('favorite_partners');
    const partners = this._getFromStorage('partners');

    return favorites
      .map(f => {
        const p = partners.find(partner => partner.id === f.partnerId) || null;
        if (!p) return null;
        const item = {
          partnerId: f.partnerId,
          name: p.name,
          serviceTypeLabel: this._getServiceTypeLabel(p.serviceType),
          regionLabel: this._getRegionLabel(p.region),
          rating: p.rating || 0,
          city: p.city || '',
          country: p.country || ''
        };
        // FK resolution: include full partner object
        item.partner = p;
        return item;
      })
      .filter(Boolean);
  }

  // 45. getAboutContent
  getAboutContent() {
    const defaultContent = {
      purpose: '',
      history: '',
      scope: '',
      judgingProcess: '',
      keyThemes: [],
      governanceAndBoards: ''
    };
    return this._getObjectFromStorage('about_content', defaultContent);
  }

  // 46. getContactInfo
  getContactInfo() {
    const defaultContent = {
      generalEmail: '',
      sponsorshipEmail: '',
      mediaEmail: '',
      postalAddress: '',
      supportHours: '',
      expectedResponseTime: ''
    };
    return this._getObjectFromStorage('contact_info', defaultContent);
  }

  // 47. submitContactEnquiry
  submitContactEnquiry(name, email, topic, message) {
    const errors = [];
    if (!name || name.trim().length === 0) errors.push('Name is required.');
    const emailRegex = /.+@.+\..+/;
    if (!email || !emailRegex.test(email)) errors.push('Valid email is required.');
    if (!message || message.trim().length === 0) errors.push('Message is required.');

    if (errors.length > 0) {
      return { success: false, message: errors.join(' ') };
    }

    // For simplicity, we just store enquiries in a generic key
    const enquiries = this._getFromStorage('contact_enquiries');
    enquiries.push({
      id: this._generateId('ctenq'),
      name,
      email,
      topic: topic || 'general',
      message,
      submittedAt: new Date().toISOString()
    });
    this._saveToStorage('contact_enquiries', enquiries);

    return { success: true, message: 'Enquiry submitted.' };
  }

  // 48. getTermsContent
  getTermsContent() {
    const defaultContent = {
      websiteUse: '',
      liabilityLimitations: '',
      awardEntryTerms: '',
      intellectualProperty: '',
      ticketingTerms: '',
      peoplesChoiceRules: ''
    };
    return this._getObjectFromStorage('terms_content', defaultContent);
  }

  // 49. getPrivacyContent
  getPrivacyContent() {
    const defaultContent = {
      dataCollected: '',
      dataUse: '',
      dataRetention: '',
      userRights: '',
      contactForPrivacy: '',
      cookiesAndTracking: ''
    };
    return this._getObjectFromStorage('privacy_content', defaultContent);
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
