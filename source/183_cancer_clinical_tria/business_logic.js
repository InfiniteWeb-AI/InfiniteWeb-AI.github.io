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
    // Track current counter without incrementing it
    this.idCounter = parseInt(localStorage.getItem('idCounter') || '1000', 10);
  }

  // =============================
  // Storage helpers
  // =============================
  _initStorage() {
    const keys = [
      'trials',
      'trial_locations',
      'trial_saved_items',
      'trial_reading_list_items',
      'trial_notes',
      'trial_inquiry_drafts',
      'alert_configs',
      'doctor_questions',
      'trial_question_sets',
      'patient_resources',
      'resource_favorite_items',
      'trial_comparison_sets',
      'app_settings',
      'eligibility_sessions'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (localStorage.getItem('idCounter') === null) {
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
    this.idCounter = next;
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // =============================
  // Label / mapping helpers
  // =============================
  _getCancerTypeLabel(value) {
    const map = {
      lung_cancer: 'Lung cancer',
      breast_cancer: 'Breast cancer',
      colorectal_cancer: 'Colorectal cancer',
      leukemia: 'Leukemia',
      prostate_cancer: 'Prostate cancer',
      melanoma: 'Melanoma',
      colon_cancer: 'Colon cancer',
      all_cancers: 'All cancers',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _getDiseaseStageLabel(value) {
    const map = {
      stage_0: 'Stage 0',
      stage_i: 'Stage I',
      stage_ii: 'Stage II',
      stage_iii: 'Stage III',
      stage_iv: 'Stage IV',
      metastatic: 'Metastatic',
      relapsed_refractory: 'Relapsed / refractory',
      early_stage: 'Early stage',
      advanced: 'Advanced',
      not_applicable: 'Not applicable',
      unknown: 'Unknown stage'
    };
    return map[value] || value || '';
  }

  _getPhaseLabel(value) {
    const map = {
      phase_0: 'Phase 0',
      phase_i: 'Phase I',
      phase_ii: 'Phase II',
      phase_iii: 'Phase III',
      phase_iv: 'Phase IV',
      phase_i_ii: 'Phase I/II',
      phase_ii_iii: 'Phase II/III',
      na: 'Not applicable'
    };
    return map[value] || value || '';
  }

  _getRecruitmentStatusLabel(value) {
    const map = {
      not_yet_recruiting: 'Not yet recruiting',
      currently_recruiting: 'Currently recruiting',
      active_not_recruiting: 'Active, not recruiting',
      completed: 'Completed',
      suspended: 'Suspended',
      terminated: 'Terminated',
      withdrawn: 'Withdrawn',
      unknown_status: 'Unknown status'
    };
    return map[value] || value || '';
  }

  _getResourceTypeLabel(value) {
    const map = {
      patient_guide: 'Patient guide',
      brochure: 'Brochure',
      article: 'Article',
      video: 'Video',
      faq: 'FAQ',
      webpage: 'Web page',
      other: 'Other'
    };
    return map[value] || value || '';
  }

  _getBiomarkerMap() {
    // Extendable central map for biomarker code -> label
    return {
      her2_positive: 'HER2-positive'
    };
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _calculateDistanceMiles(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' ||
      typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' ||
      typeof lon2 !== 'number'
    ) {
      return null;
    }
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  _diseaseStageMatchesFilter(trialStage, filterStage) {
    if (!filterStage) return true;
    if (!trialStage) return false;

    if (trialStage === filterStage) return true;

    // Basic hierarchical logic for metastatic vs stage_iv
    if (
      (filterStage === 'metastatic' && trialStage === 'stage_iv') ||
      (filterStage === 'stage_iv' && trialStage === 'metastatic')
    ) {
      return true;
    }

    return false;
  }

  _getTrialsIndexedById() {
    const trials = this._getFromStorage('trials');
    const index = {};
    for (const t of trials) {
      if (t && t.id) index[t.id] = t;
    }
       return { trials, index };
  }

  _getTrialLocationsByTrialId() {
    const locations = this._getFromStorage('trial_locations');
    const byTrial = {};
    for (const loc of locations) {
      if (!loc || !loc.trialId) continue;
      if (!byTrial[loc.trialId]) byTrial[loc.trialId] = [];
      byTrial[loc.trialId].push(loc);
    }
    return { locations, byTrial };
  }

  _getPrimaryLocationForTrial(trialId, byTrial, centerLat, centerLon) {
    const locs = byTrial[trialId] || [];
    if (!locs.length) return { location: null, city_state_label: '', distance_miles: null };

    let primary = locs.find((l) => l.is_primary_location) || locs[0];

    const city = primary.city || '';
    const state = primary.state || '';
    const cityStateLabel = city && state ? `${city}, ${state}` : city || state || '';

    let distance = null;
    if (
      typeof centerLat === 'number' &&
      typeof centerLon === 'number' &&
      typeof primary.latitude === 'number' &&
      typeof primary.longitude === 'number'
    ) {
      distance = this._calculateDistanceMiles(
        centerLat,
        centerLon,
        primary.latitude,
        primary.longitude
      );
    }

    return {
      location: primary,
      city_state_label: cityStateLabel,
      distance_miles: distance
    };
  }

  // =============================
  // Private helpers required by spec
  // =============================

  _getOrCreateAppSettings() {
    let settingsArr = this._getFromStorage('app_settings');
    if (!Array.isArray(settingsArr)) settingsArr = [];

    let settings = settingsArr[0];
    if (!settings) {
      settings = {
        id: 'app_settings_1',
        language: 'en',
        lastUpdated: new Date().toISOString()
      };
      settingsArr = [settings];
      this._saveToStorage('app_settings', settingsArr);
    }
    return settings;
  }

  _getOrCreateSavedItemsStore() {
    let savedItems = this._getFromStorage('trial_saved_items');
    let readingListItems = this._getFromStorage('trial_reading_list_items');
    if (!Array.isArray(savedItems)) savedItems = [];
    if (!Array.isArray(readingListItems)) readingListItems = [];
    return { savedItems, readingListItems };
  }

  _getOrCreateComparisonSet() {
    let sets = this._getFromStorage('trial_comparison_sets');
    if (!Array.isArray(sets)) sets = [];

    let comparisonSet = sets[0];
    if (!comparisonSet) {
      comparisonSet = {
        id: this._generateId('comparison'),
        trialIds: [],
        createdAt: new Date().toISOString()
      };
      sets = [comparisonSet];
      this._saveToStorage('trial_comparison_sets', sets);
    }
    return comparisonSet;
  }

  _getOrCreateEligibilitySession(sessionData) {
    let sessions = this._getFromStorage('eligibility_sessions');
    if (!Array.isArray(sessions)) sessions = [];

    const session = {
      id: this._generateId('eligibility'),
      cancer_type: sessionData.cancer_type || null,
      age_years: sessionData.age_years != null ? sessionData.age_years : null,
      disease_stage: sessionData.disease_stage || null,
      had_surgery: sessionData.had_surgery != null ? sessionData.had_surgery : null,
      had_chemotherapy:
        sessionData.had_chemotherapy != null ? sessionData.had_chemotherapy : null,
      recommendedTrialIds: sessionData.recommendedTrialIds || [],
      createdAt: new Date().toISOString()
    };

    sessions.push(session);
    this._saveToStorage('eligibility_sessions', sessions);
    return session;
  }

  _getOrCreateAlertConfigStore() {
    let alerts = this._getFromStorage('alert_configs');
    if (!Array.isArray(alerts)) alerts = [];
    return alerts;
  }

  _getOrCreateNotesAndResourcesStore() {
    let trialNotes = this._getFromStorage('trial_notes');
    let questionSets = this._getFromStorage('trial_question_sets');
    let inquiryDrafts = this._getFromStorage('trial_inquiry_drafts');
    let favoriteResources = this._getFromStorage('resource_favorite_items');

    if (!Array.isArray(trialNotes)) trialNotes = [];
    if (!Array.isArray(questionSets)) questionSets = [];
    if (!Array.isArray(inquiryDrafts)) inquiryDrafts = [];
    if (!Array.isArray(favoriteResources)) favoriteResources = [];

    return {
      trialNotes,
      questionSets,
      inquiryDrafts,
      favoriteResources
    };
  }

  // =============================
  // Interface implementations
  // =============================

  // --- App settings ---

  getAppSettings() {
    const settings = this._getOrCreateAppSettings();
    return { settings };
  }

  setAppLanguage(language) {
    const allowed = ['en', 'es'];
    const lang = allowed.includes(language) ? language : 'en';

    let settingsArr = this._getFromStorage('app_settings');
    if (!Array.isArray(settingsArr) || !settingsArr.length) {
      settingsArr = [this._getOrCreateAppSettings()];
    }

    const settings = settingsArr[0];
    settings.language = lang;
    settings.lastUpdated = new Date().toISOString();

    settingsArr[0] = settings;
    this._saveToStorage('app_settings', settingsArr);

    return { success: true, settings: { language: settings.language, lastUpdated: settings.lastUpdated } };
  }

  // --- Homepage ---

  getHomepageOverview() {
    const { trials } = this._getTrialsIndexedById();
    const resources = this._getFromStorage('patient_resources');

    const featuredTrials = trials
      .filter((t) => t && t.is_featured)
      .sort((a, b) => {
        const ra = typeof a.featured_rank === 'number' ? a.featured_rank : Infinity;
        const rb = typeof b.featured_rank === 'number' ? b.featured_rank : Infinity;
        return ra - rb;
      })
      .map((t) => ({
        trial: t,
        cancer_type_label: this._getCancerTypeLabel(t.cancer_type),
        phase_label: this._getPhaseLabel(t.phase),
        recruitment_status_label: this._getRecruitmentStatusLabel(t.recruitment_status),
        is_featured: !!t.is_featured
      }));

    const featuredResources = resources
      .filter((r) => r && r.is_featured)
      .map((r) => ({
        resource: r,
        cancer_type_label: this._getCancerTypeLabel(r.cancer_type),
        resource_type_label: this._getResourceTypeLabel(r.resource_type),
        is_featured: !!r.is_featured
      }));

    const trialCounts = {
      total_trials: trials.length,
      recruiting_trials: trials.filter((t) => t.recruitment_status === 'currently_recruiting').length
    };

    return { featuredTrials, featuredResources, trialCounts };
  }

  getFeaturedTrials() {
    const { trials } = this._getTrialsIndexedById();
    return trials
      .filter((t) => t && t.is_featured)
      .sort((a, b) => {
        const ra = typeof a.featured_rank === 'number' ? a.featured_rank : Infinity;
        const rb = typeof b.featured_rank === 'number' ? b.featured_rank : Infinity;
        return ra - rb;
      })
      .map((t) => ({
        trial: t,
        cancer_type_label: this._getCancerTypeLabel(t.cancer_type),
        phase_label: this._getPhaseLabel(t.phase),
        recruitment_status_label: this._getRecruitmentStatusLabel(t.recruitment_status)
      }));
  }

  getFeaturedPatientResources() {
    const resources = this._getFromStorage('patient_resources');
    return resources
      .filter((r) => r && r.is_featured)
      .map((r) => ({
        resource: r,
        cancer_type_label: this._getCancerTypeLabel(r.cancer_type),
        resource_type_label: this._getResourceTypeLabel(r.resource_type)
      }));
  }

  // --- Trial search filter options ---

  getTrialSearchFilterOptions() {
    const cancerTypes = [
      'lung_cancer',
      'breast_cancer',
      'colorectal_cancer',
      'leukemia',
      'prostate_cancer',
      'melanoma',
      'colon_cancer',
      'all_cancers',
      'other'
    ].map((value) => ({ value, label: this._getCancerTypeLabel(value) }));

    const diseaseStages = [
      'stage_0',
      'stage_i',
      'stage_ii',
      'stage_iii',
      'stage_iv',
      'metastatic',
      'relapsed_refractory',
      'early_stage',
      'advanced',
      'not_applicable',
      'unknown'
    ].map((value) => ({ value, label: this._getDiseaseStageLabel(value) }));

    const biomarkerMap = this._getBiomarkerMap();
    const biomarkers = Object.keys(biomarkerMap).map((code) => ({
      code,
      label: biomarkerMap[code]
    }));

    const phases = [
      'phase_0',
      'phase_i',
      'phase_ii',
      'phase_iii',
      'phase_iv',
      'phase_i_ii',
      'phase_ii_iii',
      'na'
    ].map((value) => ({ value, label: this._getPhaseLabel(value) }));

    const recruitmentStatuses = [
      'not_yet_recruiting',
      'currently_recruiting',
      'active_not_recruiting',
      'completed',
      'suspended',
      'terminated',
      'withdrawn',
      'unknown_status'
    ].map((value) => ({ value, label: this._getRecruitmentStatusLabel(value) }));

    const studyTypes = [
      'interventional',
      'observational',
      'expanded_access',
      'other'
    ].map((value) => ({ value, label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const distanceOptionsMiles = [10, 25, 50, 100, 300];

    const sortOptions = [
      { value: 'earliest_start_date', label: 'Earliest start date' },
      { value: 'closest_distance', label: 'Closest distance' },
      { value: 'travel_stipend_desc', label: 'Highest travel stipend' }
    ];

    return {
      cancerTypes,
      diseaseStages,
      biomarkers,
      phases,
      recruitmentStatuses,
      studyTypes,
      distanceOptionsMiles,
      sortOptions
    };
  }

  // --- Trial search ---

  searchTrials(
    cancer_type,
    age_years,
    location,
    distance_miles,
    disease_stage,
    biomarker_codes,
    phase_filters,
    recruitment_status_filters,
    study_type_filters,
    has_chemotherapy,
    telehealth_only,
    travel_assistance_only,
    has_travel_stipend_only,
    sort_by,
    page,
    page_size
  ) {
    const { trials } = this._getTrialsIndexedById();
    const { byTrial: locationsByTrial } = this._getTrialLocationsByTrialId();
    const { savedItems } = this._getOrCreateSavedItemsStore();
    const comparisonSet = this._getOrCreateComparisonSet();

    const biomarkerSet = Array.isArray(biomarker_codes) ? biomarker_codes : [];
    const phaseSet = Array.isArray(phase_filters) ? phase_filters : [];
    const recruitSet = Array.isArray(recruitment_status_filters)
      ? recruitment_status_filters
      : [];
    const studyTypeSet = Array.isArray(study_type_filters) ? study_type_filters : [];

    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let centerLat = null;
    let centerLon = null;
    if (location && typeof location === 'object') {
      if (typeof location.latitude === 'number') centerLat = location.latitude;
      if (typeof location.longitude === 'number') centerLon = location.longitude;
    }

    const results = [];

    for (const trial of trials) {
      if (!trial || !trial.id) continue;

      // Cancer type filter (treat "all_cancers" as no specific filter)
      if (cancer_type && cancer_type !== 'all_cancers' && trial.cancer_type !== cancer_type) continue;

      // Age filter with pediatric logic
      if (typeof age_years === 'number') {
        if (
          typeof trial.min_age_years === 'number' &&
          age_years < trial.min_age_years
        ) {
          continue;
        }
        if (
          typeof trial.max_age_years === 'number' &&
          age_years > trial.max_age_years
        ) {
          continue;
        }
        if (age_years < 18 && trial.is_pediatric_friendly === false) {
          continue;
        }
      }

      // Disease stage filter
      if (disease_stage && !this._diseaseStageMatchesFilter(trial.disease_stage, disease_stage)) {
        continue;
      }

      // Biomarkers filter (require all requested)
      if (biomarkerSet.length) {
        const trialMarkers = Array.isArray(trial.biomarkers) ? trial.biomarkers : [];
        const ok = biomarkerSet.every((code) => trialMarkers.includes(code));
        if (!ok) continue;
      }

      // Phase filter
      if (phaseSet.length && !phaseSet.includes(trial.phase)) continue;

      // Recruitment status filter
      if (recruitSet.length && !recruitSet.includes(trial.recruitment_status)) continue;

      // Study type filter
      if (studyTypeSet.length && !studyTypeSet.includes(trial.study_type)) continue;

      // Chemotherapy filter
      if (has_chemotherapy === 'true') {
        if (trial.has_chemotherapy !== true) continue;
      } else if (has_chemotherapy === 'false') {
        if (trial.has_chemotherapy !== false) continue;
      }

      const trialLocations = locationsByTrial[trial.id] || [];

      // Telehealth filter
      if (telehealth_only) {
        const hasTelehealth =
          trial.telehealth_visits_allowed === true ||
          trialLocations.some((l) => l.telehealth_visits_allowed === true);
        if (!hasTelehealth) continue;
      }

      // Travel assistance & stipend aggregates
      const locHasTravelAssist = trialLocations.some(
        (l) => l.travel_assistance_available === true
      );
      const maxLocStipend = trialLocations.reduce((max, l) => {
        const amt = typeof l.travel_stipend_amount === 'number' ? l.travel_stipend_amount : 0;
        return amt > max ? amt : max;
      }, 0);

      const aggregatedTravelAssist =
        trial.travel_assistance_available === true || locHasTravelAssist;
      const aggregatedMaxStipend = Math.max(
        typeof trial.max_travel_stipend_amount === 'number'
          ? trial.max_travel_stipend_amount
          : 0,
        maxLocStipend
      );

      if (travel_assistance_only && !aggregatedTravelAssist) continue;
      if (has_travel_stipend_only && !(aggregatedMaxStipend > 0)) continue;

      // Location + distance filters
      if (location && typeof location === 'object') {
        const cityFilter = (location.city || '').toLowerCase();
        const stateFilter = (location.state || '').toLowerCase();
        const postalFilter = (location.postal_code || '').toLowerCase();
        const countryFilter = (location.country || '').toLowerCase();

        if (cityFilter || stateFilter || postalFilter || countryFilter) {
          let locationMatch = false;
          for (const loc of trialLocations) {
            if (!loc) continue;
            const city = (loc.city || '').toLowerCase();
            const state = (loc.state || '').toLowerCase();
            const postal = (loc.postal_code || '').toLowerCase();
            const country = (loc.country || '').toLowerCase();

            if (cityFilter && city !== cityFilter) continue;
            if (stateFilter && state !== stateFilter) continue;
            if (postalFilter && typeof distance_miles !== 'number' && postal !== postalFilter) continue;
            if (countryFilter && countryFilter && country !== countryFilter) continue;

            locationMatch = true;
            break;
          }
          if (!locationMatch) continue;
        }

        if (typeof distance_miles === 'number' && distance_miles > 0) {
          // If we have center coordinates, filter based on actual distance
          if (typeof centerLat === 'number' && typeof centerLon === 'number') {
            let minDist = null;
            for (const loc of trialLocations) {
              const d = this._calculateDistanceMiles(
                centerLat,
                centerLon,
                loc.latitude,
                loc.longitude
              );
              if (d == null) continue;
              if (minDist == null || d < minDist) {
                minDist = d;
              }
            }
            if (minDist != null && minDist > distance_miles) {
              continue;
            }
          }
          // If we don't have coordinates, we already did a city/state/postal match above.
        }
      }

      // Build result entry
      const primaryLocWrapper = this._getPrimaryLocationForTrial(
        trial.id,
        locationsByTrial,
        centerLat,
        centerLon
      );

      // If we have center + primary location, recalc distance for consistency
      let primaryDistance = primaryLocWrapper.distance_miles;
      if (
        primaryLocWrapper.location &&
        typeof centerLat === 'number' &&
        typeof centerLon === 'number'
      ) {
        primaryDistance = this._calculateDistanceMiles(
          centerLat,
          centerLon,
          primaryLocWrapper.location.latitude,
          primaryLocWrapper.location.longitude
        );
      }

      const telehealthAggregate =
        trial.telehealth_visits_allowed === true ||
        trialLocations.some((l) => l.telehealth_visits_allowed === true);

      const isSaved = savedItems.some((s) => s.trialId === trial.id);
      const savedLabels = savedItems
        .filter((s) => s.trialId === trial.id)
        .map((s) => s.label);

      const isInComparison = Array.isArray(comparisonSet.trialIds)
        ? comparisonSet.trialIds.includes(trial.id)
        : false;

      results.push({
        trial,
        cancer_type_label: this._getCancerTypeLabel(trial.cancer_type),
        phase_label: this._getPhaseLabel(trial.phase),
        disease_stage_label: this._getDiseaseStageLabel(trial.disease_stage),
        recruitment_status_label: this._getRecruitmentStatusLabel(
          trial.recruitment_status
        ),
        primary_location: {
          location: primaryLocWrapper.location,
          city_state_label: primaryLocWrapper.city_state_label,
          distance_miles: primaryDistance
        },
        telehealth_visits_allowed: telehealthAggregate,
        travel_assistance_available: aggregatedTravelAssist,
        max_travel_stipend_amount: aggregatedMaxStipend,
        is_saved: isSaved,
        saved_labels: savedLabels,
        is_in_comparison_set: isInComparison
      });
    }

    // Sorting
    const sortKey = sort_by || null;
    if (sortKey === 'earliest_start_date') {
      results.sort((a, b) => {
        const da = this._parseDate(a.trial.start_date) || new Date(8640000000000000);
        const db = this._parseDate(b.trial.start_date) || new Date(8640000000000000);
        return da - db;
      });
    } else if (sortKey === 'closest_distance') {
      results.sort((a, b) => {
        const da =
          typeof a.primary_location.distance_miles === 'number'
            ? a.primary_location.distance_miles
            : Infinity;
        const db =
          typeof b.primary_location.distance_miles === 'number'
            ? b.primary_location.distance_miles
            : Infinity;
        return da - db;
      });
    } else if (sortKey === 'travel_stipend_desc') {
      results.sort((a, b) => {
        const sa = typeof a.max_travel_stipend_amount === 'number'
          ? a.max_travel_stipend_amount
          : 0;
        const sb = typeof b.max_travel_stipend_amount === 'number'
          ? b.max_travel_stipend_amount
          : 0;
        return sb - sa;
      });
    }

    // Instrumentation for task completion tracking
    try {
      const locCity = location && typeof location.city === 'string'
        ? location.city.toLowerCase()
        : '';
      const locState = location && typeof location.state === 'string'
        ? location.state.toLowerCase()
        : '';
      const locPostal = location && typeof location.postal_code === 'string'
        ? location.postal_code.toLowerCase()
        : '';

      // Task 1 instrumentation
      const task1PhaseFiltersMatch =
        Array.isArray(phase_filters) &&
        phase_filters.length === 2 &&
        phase_filters.includes('phase_ii') &&
        phase_filters.includes('phase_iii');

      const task1RecruitmentFiltersMatch =
        Array.isArray(recruitment_status_filters) &&
        recruitment_status_filters.length === 1 &&
        recruitment_status_filters[0] === 'currently_recruiting';

      if (
        cancer_type === 'lung_cancer' &&
        age_years === 55 &&
        locCity === 'chicago' &&
        locState === 'il' &&
        distance_miles === 25 &&
        task1PhaseFiltersMatch &&
        task1RecruitmentFiltersMatch &&
        sort_by === 'earliest_start_date'
      ) {
        const snapshot1 = {
          params: {
            cancer_type,
            age_years,
            location,
            distance_miles,
            phase_filters,
            recruitment_status_filters,
            sort_by
          },
          resultTrialIds: results.map((r) => r.trial.id),
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('task1_searchSnapshot', JSON.stringify(snapshot1));
      }

      // Task 2 instrumentation
      const task2BiomarkerMatch =
        Array.isArray(biomarker_codes) &&
        biomarker_codes.includes('her2_positive');

      if (
        cancer_type === 'breast_cancer' &&
        (disease_stage === 'metastatic' || disease_stage === 'stage_iv') &&
        task2BiomarkerMatch &&
        locPostal === '90210' &&
        typeof distance_miles === 'number' &&
        distance_miles === 50
      ) {
        const snapshot2 = {
          params: {
            cancer_type,
            disease_stage,
            biomarker_codes,
            location,
            distance_miles
          },
          resultTrialIds: results.map((r) => r.trial.id),
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('task2_searchSnapshot', JSON.stringify(snapshot2));
      }

      // Task 4 instrumentation
      const task4StudyTypeMatch =
        Array.isArray(study_type_filters) &&
        study_type_filters.length === 1 &&
        study_type_filters[0] === 'observational';

      if (
        cancer_type === 'leukemia' &&
        age_years === 10 &&
        locCity === 'new york' &&
        locState === 'ny' &&
        distance_miles === 100 &&
        task4StudyTypeMatch &&
        has_chemotherapy === 'false' &&
        telehealth_only === true &&
        sort_by === 'closest_distance'
      ) {
        const snapshot4 = {
          params: {
            cancer_type,
            age_years,
            location,
            distance_miles,
            study_type_filters,
            has_chemotherapy,
            telehealth_only,
            sort_by
          },
          resultTrialIds: results.map((r) => r.trial.id),
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('task4_searchSnapshot', JSON.stringify(snapshot4));
      }

      // Task 6 instrumentation
      const task6CancerTypeMatch =
        cancer_type == null || cancer_type === 'all_cancers';

      if (
        locPostal === '10001' &&
        typeof distance_miles === 'number' &&
        distance_miles === 300 &&
        task6CancerTypeMatch &&
        travel_assistance_only === true &&
        has_travel_stipend_only === true &&
        sort_by === 'travel_stipend_desc'
      ) {
        const snapshot6 = {
          params: {
            cancer_type,
            location,
            distance_miles,
            travel_assistance_only,
            has_travel_stipend_only,
            sort_by
          },
          resultTrialIds: results.map((r) => r.trial.id),
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('task6_searchSnapshot', JSON.stringify(snapshot6));
      }
    } catch (e) {
      console.error('Instrumentation error in searchTrials:', e);
    }

    const total_results = results.length;
    const startIndex = (pageNum - 1) * size;
    const pagedResults = results.slice(startIndex, startIndex + size);

    return {
      total_results,
      page: pageNum,
      page_size: size,
      sort_by: sortKey,
      results: pagedResults
    };
  }

  // --- Trial detail ---

  getTrialDetail(trialId) {
    const { trials, index } = this._getTrialsIndexedById();
    const trial = index[trialId] || null;
    const { byTrial: locationsByTrial } = this._getTrialLocationsByTrialId();
    const trialLocations = locationsByTrial[trialId] || [];

    const { savedItems, readingListItems } = this._getOrCreateSavedItemsStore();
    const { trialNotes, questionSets, inquiryDrafts } = this._getOrCreateNotesAndResourcesStore();

    const primaryLocWrapper = this._getPrimaryLocationForTrial(trialId, locationsByTrial, null, null);

    const isSaved = savedItems.some((s) => s.trialId === trialId);
    const savedLabels = savedItems
      .filter((s) => s.trialId === trialId)
      .map((s) => s.label);

    const isInReadingList = readingListItems.some((r) => r.trialId === trialId);
    const hasDraftInquiry = inquiryDrafts.some(
      (d) => d.trialId === trialId && d.status === 'draft'
    );
    const hasNotes = trialNotes.some((n) => n.trialId === trialId);
    const hasQuestionSet = questionSets.some((q) => q.trialId === trialId);

    const locHasTravelAssist = trialLocations.some(
      (l) => l.travel_assistance_available === true
    );
    const locHasTelehealth = trialLocations.some((l) => l.telehealth_visits_allowed === true);

    const maxLocStipend = trialLocations.reduce((max, l) => {
      const amt = typeof l.travel_stipend_amount === 'number' ? l.travel_stipend_amount : 0;
      return amt > max ? amt : max;
    }, 0);

    const aggregatedTravelAssist =
      (trial && trial.travel_assistance_available === true) || locHasTravelAssist;
    const aggregatedTelehealth =
      (trial && trial.telehealth_visits_allowed === true) || locHasTelehealth;
    const aggregatedMaxStipend = Math.max(
      trial && typeof trial.max_travel_stipend_amount === 'number'
        ? trial.max_travel_stipend_amount
        : 0,
      maxLocStipend
    );

    return {
      trial,
      cancer_type_label: trial ? this._getCancerTypeLabel(trial.cancer_type) : '',
      phase_label: trial ? this._getPhaseLabel(trial.phase) : '',
      disease_stage_label: trial
        ? this._getDiseaseStageLabel(trial.disease_stage)
        : '',
      recruitment_status_label: trial
        ? this._getRecruitmentStatusLabel(trial.recruitment_status)
        : '',
      locations: trialLocations.map((loc) => ({
        location: loc,
        city_state_label: (loc.city && loc.state)
          ? `${loc.city}, ${loc.state}`
          : loc.city || loc.state || '',
        distance_miles: null // no center provided in this interface
      })),
      required_clinic_visits_per_month: trial
        ? trial.required_clinic_visits_per_month || null
        : null,
      total_study_duration_months: trial
        ? trial.total_study_duration_months || null
        : null,
      visit_overview: trial ? trial.visit_overview || '' : '',
      telehealth_visits_allowed: aggregatedTelehealth,
      travel_assistance_available: aggregatedTravelAssist,
      max_travel_stipend_amount: aggregatedMaxStipend,
      is_saved: isSaved,
      saved_labels: savedLabels,
      is_in_reading_list: isInReadingList,
      has_draft_inquiry: hasDraftInquiry,
      has_notes: hasNotes,
      has_question_set: hasQuestionSet
    };
  }

  // --- Save / bookmark / shortlist trial ---

  saveTrial(trialId, label, source) {
    const { savedItems } = this._getOrCreateSavedItemsStore();

    let existing = savedItems.find(
      (s) => s.trialId === trialId && s.label === label
    );

    if (existing) {
      const total_saved_count = savedItems.length;
      return {
        success: true,
        savedItem: existing,
        total_saved_count,
        message: 'Trial already saved with this label.'
      };
    }

    const newItem = {
      id: this._generateId('saved'),
      trialId,
      label,
      source: source || 'other',
      createdAt: new Date().toISOString()
    };

    savedItems.push(newItem);
    this._saveToStorage('trial_saved_items', savedItems);

    return {
      success: true,
      savedItem: newItem,
      total_saved_count: savedItems.length,
      message: 'Trial saved successfully.'
    };
  }

  removeSavedTrialItem(savedItemId) {
    let savedItems = this._getFromStorage('trial_saved_items');
    if (!Array.isArray(savedItems)) savedItems = [];
    const newItems = savedItems.filter((s) => s.id !== savedItemId);
    this._saveToStorage('trial_saved_items', newItems);
    return { success: true, total_saved_count: newItems.length };
  }

  // --- Comparison set ---

  getTrialComparisonSet() {
    const comparisonSet = this._getOrCreateComparisonSet();
    const { index } = this._getTrialsIndexedById();
    const { byTrial: locationsByTrial } = this._getTrialLocationsByTrialId();

    const biomarkerMap = this._getBiomarkerMap();

    const trialsOut = (Array.isArray(comparisonSet.trialIds)
      ? comparisonSet.trialIds
      : []
    ).map((tid) => {
      const trial = index[tid] || null;
      const trialLocations = locationsByTrial[tid] || [];
      const primaryLoc = this._getPrimaryLocationForTrial(tid, locationsByTrial, null, null);

      const biomarkerLabels = (trial && Array.isArray(trial.biomarkers)
        ? trial.biomarkers
        : []
      ).map((code) => biomarkerMap[code] || code);

      return {
        trial,
        cancer_type_label: trial ? this._getCancerTypeLabel(trial.cancer_type) : '',
        phase_label: trial ? this._getPhaseLabel(trial.phase) : '',
        disease_stage_label: trial
          ? this._getDiseaseStageLabel(trial.disease_stage)
          : '',
        recruitment_status_label: trial
          ? this._getRecruitmentStatusLabel(trial.recruitment_status)
          : '',
        required_clinic_visits_per_month: trial
          ? trial.required_clinic_visits_per_month || null
          : null,
        total_study_duration_months: trial
          ? trial.total_study_duration_months || null
          : null,
        primary_location: primaryLoc,
        biomarker_labels: biomarkerLabels,
        is_saved: false // could be enriched by checking saved items if needed
      };
    });

    return { comparisonSet, trials: trialsOut };
  }

  updateTrialComparisonSet(trialId, action) {
    let sets = this._getFromStorage('trial_comparison_sets');
    if (!Array.isArray(sets) || !sets.length) {
      sets = [this._getOrCreateComparisonSet()];
    }
    const comparisonSet = sets[0];

    if (!Array.isArray(comparisonSet.trialIds)) comparisonSet.trialIds = [];

    if (action === 'clear_and_add') {
      comparisonSet.trialIds = [trialId];
    } else if (action === 'add') {
      if (!comparisonSet.trialIds.includes(trialId)) {
        comparisonSet.trialIds.push(trialId);
      }
    } else if (action === 'remove') {
      comparisonSet.trialIds = comparisonSet.trialIds.filter((id) => id !== trialId);
    }

    sets[0] = comparisonSet;
    this._saveToStorage('trial_comparison_sets', sets);

    const { index } = this._getTrialsIndexedById();

    const trialsOut = comparisonSet.trialIds.map((id) => ({
      trial: index[id] || null,
      is_in_comparison_set: true
    }));

    return { comparisonSet, trials: trialsOut };
  }

  // --- Notes ---

  addOrUpdateTrialNote(trialId, noteId, title, content) {
    let { trialNotes } = this._getOrCreateNotesAndResourcesStore();

    let note = null;
    const now = new Date().toISOString();

    if (noteId) {
      const idx = trialNotes.findIndex((n) => n.id === noteId);
      if (idx >= 0) {
        note = trialNotes[idx];
        note.title = title || note.title || null;
        note.content = content;
        note.updatedAt = now;
        trialNotes[idx] = note;
      }
    }

    if (!note) {
      note = {
        id: this._generateId('note'),
        trialId,
        title: title || null,
        content,
        createdAt: now,
        updatedAt: now
      };
      trialNotes.push(note);
    }

    this._saveToStorage('trial_notes', trialNotes);
    return { note, message: 'Note saved.' };
  }

  getTrialNotes(trialId) {
    const trialNotes = this._getFromStorage('trial_notes');
    const { index } = this._getTrialsIndexedById();
    const notesForTrial = trialNotes.filter((n) => n.trialId === trialId);

    // Foreign key resolution: attach full trial object
    return notesForTrial.map((n) => ({
      ...n,
      trial: index[n.trialId] || null
    }));
  }

  deleteTrialNote(noteId) {
    let trialNotes = this._getFromStorage('trial_notes');
    if (!Array.isArray(trialNotes)) trialNotes = [];
    const newNotes = trialNotes.filter((n) => n.id !== noteId);
    this._saveToStorage('trial_notes', newNotes);
    return { success: true };
  }

  // --- Inquiry drafts ---

  saveTrialInquiryDraft(
    trialId,
    contact_name,
    contact_phone,
    contact_email,
    preferred_contact_method,
    message,
    send_now
  ) {
    let { inquiryDrafts } = this._getOrCreateNotesAndResourcesStore();
    const now = new Date().toISOString();

    const inquiry = {
      id: this._generateId('inquiry'),
      trialId,
      contact_name,
      contact_phone: contact_phone || null,
      contact_email: contact_email || null,
      preferred_contact_method: preferred_contact_method || null,
      message: message || null,
      status: send_now ? 'sent' : 'draft',
      createdAt: now,
      updatedAt: now
    };

    inquiryDrafts.push(inquiry);
    this._saveToStorage('trial_inquiry_drafts', inquiryDrafts);

    return { inquiry, message: send_now ? 'Inquiry sent.' : 'Inquiry draft saved.' };
  }

  // --- Trial results & reading list ---

  getTrialResults(trialId) {
    const { index } = this._getTrialsIndexedById();
    const trial = index[trialId] || null;
    const readingListItems = this._getFromStorage('trial_reading_list_items');

    const isInReadingList = readingListItems.some((r) => r.trialId === trialId);

    let results_summary = '';
    if (trial) {
      results_summary =
        trial.detailed_description || trial.brief_summary || '';
    }

    return {
      trial,
      results_summary,
      is_in_reading_list: isInReadingList
    };
  }

  addTrialToReadingList(trialId, addedFrom) {
    let readingListItems = this._getFromStorage('trial_reading_list_items');
    if (!Array.isArray(readingListItems)) readingListItems = [];

    let existing = readingListItems.find((r) => r.trialId === trialId);
    if (existing) {
      return {
        readingListItem: existing,
        total_reading_list_count: readingListItems.length,
        message: 'Trial already in reading list.'
      };
    }

    const item = {
      id: this._generateId('reading'),
      trialId,
      addedFrom: addedFrom || 'other',
      createdAt: new Date().toISOString()
    };

    readingListItems.push(item);
    this._saveToStorage('trial_reading_list_items', readingListItems);

    return {
      readingListItem: item,
      total_reading_list_count: readingListItems.length,
      message: 'Trial added to reading list.'
    };
  }

  removeTrialFromReadingList(readingListItemId) {
    let readingListItems = this._getFromStorage('trial_reading_list_items');
    if (!Array.isArray(readingListItems)) readingListItems = [];
    const newItems = readingListItems.filter((r) => r.id !== readingListItemId);
    this._saveToStorage('trial_reading_list_items', newItems);
    return { success: true, total_reading_list_count: newItems.length };
  }

  // --- Eligibility checker ---

  runEligibilityCheck(cancer_type, age_years, disease_stage, had_surgery, had_chemotherapy) {
    const { trials } = this._getTrialsIndexedById();

    const recommended = [];

    for (const trial of trials) {
      if (!trial || !trial.id) continue;

      if (cancer_type && trial.cancer_type !== cancer_type) continue;

      if (typeof age_years === 'number') {
        if (
          typeof trial.min_age_years === 'number' &&
          age_years < trial.min_age_years
        ) {
          continue;
        }
        if (
          typeof trial.max_age_years === 'number' &&
          age_years > trial.max_age_years
        ) {
          continue;
        }
      }

      if (disease_stage && !this._diseaseStageMatchesFilter(trial.disease_stage, disease_stage)) {
        continue;
      }

      if (trial.prior_surgery_required === true && had_surgery !== true) {
        continue;
      }

      if (trial.prior_chemotherapy_allowed === false && had_chemotherapy === true) {
        continue;
      }

      recommended.push(trial);
    }

    const session = this._getOrCreateEligibilitySession({
      cancer_type,
      age_years,
      disease_stage,
      had_surgery,
      had_chemotherapy,
      recommendedTrialIds: recommended.map((t) => t.id)
    });

    const recommended_trials = recommended.map((t) => ({
      trial: t,
      cancer_type_label: this._getCancerTypeLabel(t.cancer_type),
      phase_label: this._getPhaseLabel(t.phase),
      disease_stage_label: this._getDiseaseStageLabel(t.disease_stage),
      recruitment_status_label: this._getRecruitmentStatusLabel(t.recruitment_status)
    }));

    return { eligibilitySession: session, recommended_trials };
  }

  getEligibilitySessionResult(sessionId) {
    const sessions = this._getFromStorage('eligibility_sessions');
    const session = sessions.find((s) => s.id === sessionId) || null;

    if (!session) {
      return { eligibilitySession: null, recommended_trials: [] };
    }

    const { index } = this._getTrialsIndexedById();
    const trialsOut = (Array.isArray(session.recommendedTrialIds)
      ? session.recommendedTrialIds
      : []
    ).map((id) => index[id]).filter(Boolean);

    return { eligibilitySession: session, recommended_trials: trialsOut };
  }

  // --- Alerts ---

  saveAlertConfig(
    cancer_type,
    postal_code,
    distance_miles,
    recruitment_status_filters,
    frequency,
    email
  ) {
    let alerts = this._getOrCreateAlertConfigStore();
    const recruitSet = Array.isArray(recruitment_status_filters)
      ? recruitment_status_filters
      : [];

    // Simple upsert: match by email + cancer_type + postal_code + distance + frequency
    let existing = alerts.find(
      (a) =>
        a.email === email &&
        a.cancer_type === cancer_type &&
        a.postal_code === postal_code &&
        a.distance_miles === distance_miles &&
        a.frequency === frequency
    );

    const now = new Date().toISOString();

    if (existing) {
      existing.recruitment_status_filters = recruitSet;
      existing.is_active = true;
      existing.updatedAt = now;
    } else {
      existing = {
        id: this._generateId('alert'),
        cancer_type: cancer_type || null,
        postal_code: postal_code || null,
        distance_miles: distance_miles != null ? distance_miles : null,
        recruitment_status_filters: recruitSet,
        frequency,
        email,
        is_active: true,
        createdAt: now,
        updatedAt: now
      };
      alerts.push(existing);
    }

    this._saveToStorage('alert_configs', alerts);
    return { alertConfig: existing, message: 'Alert configuration saved.' };
  }

  getAlertConfigs() {
    const alerts = this._getFromStorage('alert_configs');
    return alerts;
  }

  // --- Saved trials & reading list ---

  getSavedTrialsAndReadingList() {
    const { trials, index } = this._getTrialsIndexedById();
    const savedItems = this._getFromStorage('trial_saved_items');
    const readingListItems = this._getFromStorage('trial_reading_list_items');

    const saved_trials = savedItems.map((savedItem) => {
      const trial = index[savedItem.trialId] || null;
      return {
        savedItem,
        trial,
        cancer_type_label: trial ? this._getCancerTypeLabel(trial.cancer_type) : '',
        phase_label: trial ? this._getPhaseLabel(trial.phase) : '',
        recruitment_status_label: trial
          ? this._getRecruitmentStatusLabel(trial.recruitment_status)
          : ''
      };
    });

    const reading_list = readingListItems.map((readingListItem) => {
      const trial = index[readingListItem.trialId] || null;
      return {
        readingListItem,
        trial,
        cancer_type_label: trial ? this._getCancerTypeLabel(trial.cancer_type) : '',
        phase_label: trial ? this._getPhaseLabel(trial.phase) : ''
      };
    });

    return { saved_trials, reading_list };
  }

  // --- My Notes & Resources ---

  getMyNotesAndResources() {
    const { index: trialIndex } = this._getTrialsIndexedById();
    const {
      trialNotes,
      questionSets,
      inquiryDrafts,
      favoriteResources
    } = this._getOrCreateNotesAndResourcesStore();

    const doctorQuestions = this._getFromStorage('doctor_questions');
    const resources = this._getFromStorage('patient_resources');

    const trial_notes = trialNotes.map((note) => ({
      note,
      trial: trialIndex[note.trialId] || null
    }));

    const trial_question_sets = questionSets.map((qs) => {
      const questions = (Array.isArray(qs.questionIds) ? qs.questionIds : [])
        .map((id) => doctorQuestions.find((q) => q.id === id))
        .filter(Boolean);
      return {
        questionSet: qs,
        trial: trialIndex[qs.trialId] || null,
        questions
      };
    });

    const trial_inquiry_drafts = inquiryDrafts.map((inquiry) => ({
      inquiry,
      trial: trialIndex[inquiry.trialId] || null
    }));

    const favorite_resources = favoriteResources.map((favoriteItem) => {
      const resource = resources.find((r) => r.id === favoriteItem.resourceId) || null;
      return {
        favoriteItem,
        resource,
        cancer_type_label: resource
          ? this._getCancerTypeLabel(resource.cancer_type)
          : '',
        resource_type_label: resource
          ? this._getResourceTypeLabel(resource.resource_type)
          : ''
      };
    });

    return {
      trial_notes,
      trial_question_sets,
      trial_inquiry_drafts,
      favorite_resources
    };
  }

  deleteTrialQuestionSet(questionSetId) {
    let questionSets = this._getFromStorage('trial_question_sets');
    if (!Array.isArray(questionSets)) questionSets = [];
    const newSets = questionSets.filter((q) => q.id !== questionSetId);
    this._saveToStorage('trial_question_sets', newSets);
    return { success: true };
  }

  deleteTrialInquiryDraft(inquiryId) {
    let inquiryDrafts = this._getFromStorage('trial_inquiry_drafts');
    if (!Array.isArray(inquiryDrafts)) inquiryDrafts = [];
    const newDrafts = inquiryDrafts.filter((i) => i.id !== inquiryId);
    this._saveToStorage('trial_inquiry_drafts', newDrafts);
    return { success: true };
  }

  deleteResourceFavorite(favoriteItemId) {
    let favoriteResources = this._getFromStorage('resource_favorite_items');
    if (!Array.isArray(favoriteResources)) favoriteResources = [];
    const newFavs = favoriteResources.filter((f) => f.id !== favoriteItemId);
    this._saveToStorage('resource_favorite_items', newFavs);
    return { success: true };
  }

  // --- Questions to ask your doctor ---

  getTrialQuestionToolData(trialId) {
    const doctorQuestions = this._getFromStorage('doctor_questions');
    const questionSets = this._getFromStorage('trial_question_sets');
    const appSettings = this._getOrCreateAppSettings();

    const language = appSettings.language || 'en';

    const suggested_questions = doctorQuestions.filter((q) => {
      if (!q.is_active && q.is_active !== undefined) return false;
      if (q.language && q.language !== language) return false;
      return true;
    });

    const existing_question_set = questionSets.find((qs) => qs.trialId === trialId) || null;

    // Foreign key resolution for questionIds -> questions on the existing set
    if (existing_question_set) {
      const questionIds = Array.isArray(existing_question_set.questionIds)
        ? existing_question_set.questionIds
        : [];
      const questions = questionIds
        .map((id) => doctorQuestions.find((q) => q.id === id))
        .filter(Boolean);
      existing_question_set.questions = questions;
    }

    return { suggested_questions, existing_question_set };
  }

  addSelectedQuestionsToMyList(trialId, questionIds, label) {
    let questionSets = this._getFromStorage('trial_question_sets');
    if (!Array.isArray(questionSets)) questionSets = [];

    const ids = Array.isArray(questionIds) ? questionIds : [];
    const now = new Date().toISOString();

    let existing = questionSets.find((qs) => qs.trialId === trialId);

    if (existing) {
      existing.questionIds = ids;
      if (label) existing.label = label;
      existing.createdAt = existing.createdAt || now;
      questionSets = questionSets.map((qs) => (qs.id === existing.id ? existing : qs));
    } else {
      existing = {
        id: this._generateId('qset'),
        trialId,
        questionIds: ids,
        label: label || null,
        createdAt: now,
        savedToNotes: false
      };
      questionSets.push(existing);
    }

    this._saveToStorage('trial_question_sets', questionSets);
    return { questionSet: existing, message: 'Question set saved.' };
  }

  saveQuestionSetToNotes(questionSetId) {
    let questionSets = this._getFromStorage('trial_question_sets');
    if (!Array.isArray(questionSets)) questionSets = [];

    const idx = questionSets.findIndex((qs) => qs.id === questionSetId);
    if (idx < 0) {
      return { questionSet: null, message: 'Question set not found.' };
    }

    const qs = questionSets[idx];
    qs.savedToNotes = true;
    questionSets[idx] = qs;
    this._saveToStorage('trial_question_sets', questionSets);

    return { questionSet: qs, message: 'Question set saved to notes.' };
  }

  // --- Patient resources ---

  getPatientResourceFilterOptions() {
    const cancerTypes = [
      'lung_cancer',
      'breast_cancer',
      'colorectal_cancer',
      'leukemia',
      'prostate_cancer',
      'melanoma',
      'colon_cancer',
      'all_cancers',
      'other'
    ].map((value) => ({ value, label: this._getCancerTypeLabel(value) }));

    const resourceTypes = [
      'patient_guide',
      'brochure',
      'article',
      'video',
      'faq',
      'webpage',
      'other'
    ].map((value) => ({ value, label: this._getResourceTypeLabel(value) }));

    const languages = [
      { value: 'en', label: 'English' },
      { value: 'es', label: 'Español' }
    ];

    return { cancerTypes, resourceTypes, languages };
  }

  searchPatientResources(cancer_type, resource_type, language) {
    const resources = this._getFromStorage('patient_resources');

    const filtered = resources.filter((r) => {
      if (!r) return false;
      if (cancer_type && r.cancer_type !== cancer_type) return false;
      if (resource_type && r.resource_type !== resource_type) return false;
      if (language && r.language !== language) return false;
      return true;
    });

    return filtered.map((r) => ({
      resource: r,
      cancer_type_label: this._getCancerTypeLabel(r.cancer_type),
      resource_type_label: this._getResourceTypeLabel(r.resource_type)
    }));
  }

  getPatientResourceDetail(resourceId) {
    const resources = this._getFromStorage('patient_resources');
    const resource = resources.find((r) => r.id === resourceId) || null;
    const favoriteResources = this._getFromStorage('resource_favorite_items');
    const is_favorite = favoriteResources.some((f) => f.resourceId === resourceId);

    return {
      resource,
      cancer_type_label: resource ? this._getCancerTypeLabel(resource.cancer_type) : '',
      resource_type_label: resource
        ? this._getResourceTypeLabel(resource.resource_type)
        : '',
      is_favorite
    };
  }

  addResourceToFavorites(resourceId) {
    let favoriteResources = this._getFromStorage('resource_favorite_items');
    if (!Array.isArray(favoriteResources)) favoriteResources = [];

    let existing = favoriteResources.find((f) => f.resourceId === resourceId);
    if (existing) {
      return {
        favoriteItem: existing,
        total_favorites_count: favoriteResources.length,
        message: 'Resource already in favorites.'
      };
    }

    const item = {
      id: this._generateId('rfav'),
      resourceId,
      createdAt: new Date().toISOString()
    };

    favoriteResources.push(item);
    this._saveToStorage('resource_favorite_items', favoriteResources);

    return {
      favoriteItem: item,
      total_favorites_count: favoriteResources.length,
      message: 'Resource added to favorites.'
    };
  }

  // --- Static pages & help ---

  getStaticPageContent(page_key) {
    // Minimal static definitions; not user data
    const pages = {
      about: {
        title: 'About this website',
        sections: [
          {
            heading: 'Our mission',
            body: 'We help patients and caregivers find information about cancer clinical trials.'
          }
        ]
      },
      privacy_policy: {
        title: 'Privacy Policy',
        sections: [
          {
            heading: 'Overview',
            body: 'This site stores only the minimum data needed to support your session and preferences.'
          }
        ]
      },
      terms_of_use: {
        title: 'Terms of Use',
        sections: [
          {
            heading: 'Use of information',
            body: 'Information provided is for educational purposes and does not replace medical advice.'
          }
        ]
      },
      accessibility: {
        title: 'Accessibility',
        sections: [
          {
            heading: 'Commitment',
            body: 'We aim to make this site accessible to all users.'
          }
        ]
      }
    };

    const page = pages[page_key] || {
      title: '',
      sections: []
    };

    return {
      page_key,
      title: page.title,
      sections: page.sections
    };
  }

  getHelpAndFaqContent() {
    const help_topics = [
      {
        id: 'find_trial',
        title: 'How to use Find a Trial',
        body: 'Use the search filters such as cancer type, age, and location to explore matching trials.'
      },
      {
        id: 'eligibility_checker',
        title: 'Using the eligibility checker',
        body: 'Answer a few questions to see which trials may be a good fit, based on your situation.'
      }
    ];

    const faqs = [
      {
        question: 'Does this site replace my doctor’s advice?',
        answer:
          'No. This site is for information only. Always discuss clinical trials with your healthcare team.'
      },
      {
        question: 'How often is trial information updated?',
        answer: 'Trial data depends on updates from study sponsors and registries.'
      }
    ];

    return { help_topics, faqs };
  }

  // --- General site contact ---

  submitSiteContactForm(name, email, topic, message) {
    // For this business-logic layer we do not persist contact messages to avoid
    // unnecessary localStorage usage. Assume success.
    return {
      success: true,
      message: 'Your message has been received.'
    };
  }

  // --- Specialized helper for completed trials / reading list ---

  searchCompletedTrialsForReadingList(cancer_type, phase_filters, completed_after) {
    const { trials } = this._getTrialsIndexedById();
    const phaseSet = Array.isArray(phase_filters) ? phase_filters : [];
    const cutoff = completed_after ? this._parseDate(completed_after) : null;

    const results = trials.filter((t) => {
      if (!t) return false;
      if (t.cancer_type !== cancer_type) return false;
      // Consider trials "completed" based on completion_date rather than recruitment_status
      if (phaseSet.length && !phaseSet.includes(t.phase)) return false;
      if (cutoff) {
        const cd = this._parseDate(t.completion_date);
        if (!cd || cd < cutoff) return false;
      }
      return true;
    });

    const mappedResults = results.map((t) => ({
      trial: t,
      phase_label: this._getPhaseLabel(t.phase),
      completion_date: t.completion_date || null
    }));

    // Instrumentation for task completion tracking (task 8)
    try {
      const task8PhaseMatch =
        Array.isArray(phase_filters) && phase_filters.includes('phase_iii');
      const task8CompletedAfterMatch =
        typeof completed_after === 'string' && completed_after >= '2020-01-01';

      if (cancer_type === 'melanoma' && task8PhaseMatch && task8CompletedAfterMatch) {
        const snapshot8 = {
          params: {
            cancer_type,
            phase_filters,
            completed_after
          },
          resultTrialIds: mappedResults.map((r) => r.trial.id),
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('task8_searchSnapshot', JSON.stringify(snapshot8));
      }
    } catch (e) {
      console.error('Instrumentation error in searchCompletedTrialsForReadingList:', e);
    }

    return mappedResults;
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
