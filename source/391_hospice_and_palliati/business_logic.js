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
  }

  // -------------------------
  // Initialization & helpers
  // -------------------------

  _initStorage() {
    // Initialize all entity tables as empty arrays if not present
    const arrayKeys = [
      'care_programs',
      'consultation_requests',
      'information_call_requests',
      'facilities',
      'facility_visiting_hours',
      'support_groups',
      'support_group_registrations',
      'cost_estimates',
      'caregiver_profiles',
      'preferred_locations',
      'symptom_conversation_guides',
      'conversation_guide_symptoms',
      'symptom_guide_emails',
      'donation_funds',
      'donations',
      'guide_resources',
      'guide_mail_requests',
      'contact_inquiries'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      if (typeof defaultValue === 'undefined') return [];
      // shallow clone primitives / deep clone arrays and objects
      if (Array.isArray(defaultValue)) return defaultValue.slice();
      if (defaultValue && typeof defaultValue === 'object') return JSON.parse(JSON.stringify(defaultValue));
      return defaultValue;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      if (typeof defaultValue === 'undefined') return [];
      if (Array.isArray(defaultValue)) return defaultValue.slice();
      if (defaultValue && typeof defaultValue === 'object') return JSON.parse(JSON.stringify(defaultValue));
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

  // Helper: single-user context (for current caregiver etc.)
  _getOrCreateSingleUserContext() {
    const defaultContext = { caregiver_profile_id: null };
    const raw = localStorage.getItem('single_user_context');
    if (!raw) {
      this._saveToStorage('single_user_context', defaultContext);
      return defaultContext;
    }
    try {
      const ctx = JSON.parse(raw);
      if (!ctx || typeof ctx !== 'object') {
        this._saveToStorage('single_user_context', defaultContext);
        return defaultContext;
      }
      return ctx;
    } catch (e) {
      this._saveToStorage('single_user_context', defaultContext);
      return defaultContext;
    }
  }

  // Helper: generic list persistence
  _persistEntityList(storageKey, entities) {
    this._saveToStorage(storageKey, entities);
    return entities;
  }

  // Helper: internal cost calculation for home palliative care
  _calculateCostEstimateInternal(lengthOfServiceValue, lengthOfServiceUnit, primaryPayer, nurseVisitsPerWeek) {
    const unitToDays = { days: 1, weeks: 7, months: 30 };
    const daysMultiplier = unitToDays[lengthOfServiceUnit] || 1;
    const totalDays = Math.max(1, Number(lengthOfServiceValue) * daysMultiplier);

    // Base daily cost by primary payer (example values, kept simple)
    const baseDailyByPayer = {
      medicare: 150,
      medicaid: 130,
      private_insurance: 220,
      self_pay: 250,
      other: 180
    };

    const nurseVisitDailyAdd = {
      '1_visit': 20,
      '2_visits': 40,
      '3_visits': 70,
      '4_visits': 90,
      '5_visits': 110
    };

    const baseDaily = baseDailyByPayer[primaryPayer] != null ? baseDailyByPayer[primaryPayer] : 180;
    const visitAdd = nurseVisitDailyAdd[nurseVisitsPerWeek] != null ? nurseVisitDailyAdd[nurseVisitsPerWeek] : 40;

    const estimatedDailyCost = baseDaily + visitAdd;
    const estimatedTotalCost = estimatedDailyCost * totalDays;

    const explanation =
      'Estimate based on payer ' + primaryPayer +
      ', nurse visits per week ' + nurseVisitsPerWeek +
      ', over ' + totalDays + ' day(s).';

    return {
      estimated_total_cost: estimatedTotalCost,
      estimated_daily_cost: estimatedDailyCost,
      calculation_explanation: explanation
    };
  }

  // Helper: simulate sending an email (e.g., symptom guides)
  _sendEmailSimulation(emailRecord) {
    const emails = this._getFromStorage('symptom_guide_emails', []);
    const idx = emails.findIndex((e) => e.id === emailRecord.id);
    const now = new Date().toISOString();

    if (idx >= 0) {
      emails[idx].status = 'sent';
      emails[idx].sent_at = now;
      this._saveToStorage('symptom_guide_emails', emails);
      return emails[idx];
    }

    const updated = Object.assign({}, emailRecord, { status: 'sent', sent_at: now });
    emails.push(updated);
    this._saveToStorage('symptom_guide_emails', emails);
    return updated;
  }

  // Utility: label for guide formats
  _formatGuideFormatLabel(format) {
    if (format === 'printed_guide') return 'Printed guide';
    if (format === 'pdf_download') return 'PDF download';
    if (format === 'web_page') return 'Web page';
    return format;
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // getHomePageOverview
  getHomePageOverview() {
    const stored = this._getFromStorage('homepage_overview', null);
    const carePrograms = this._getFromStorage('care_programs', []);

    if (stored && typeof stored === 'object') {
      // Ensure featured_care_programs are full CareProgram objects if provided as IDs
      let featured = [];
      if (Array.isArray(stored.featured_care_programs)) {
        if (stored.featured_care_programs.length && typeof stored.featured_care_programs[0] === 'string') {
          featured = stored.featured_care_programs
            .map((id) => carePrograms.find((p) => p.id === id))
            .filter(Boolean);
        } else {
          featured = stored.featured_care_programs;
        }
      } else {
        featured = carePrograms.slice(0, 3);
      }
      return Object.assign({}, stored, { featured_care_programs: featured });
    }

    // Fallback minimal structure using only existing stored data, no mocked copy
    return {
      hero_title: '',
      hero_subtitle: '',
      intro_paragraph: '',
      featured_care_programs: carePrograms.slice(0, 3),
      caregiver_cta_text: '',
      quick_action_sections: []
    };
  }

  // getCareProgramsOverview
  getCareProgramsOverview() {
    const programs = this._getFromStorage('care_programs', []);
    return programs;
  }

  // getCareCategoryOverview
  getCareCategoryOverview() {
    const stored = this._getFromStorage('care_category_overview', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      hospice_care_overview: '',
      palliative_care_overview: '',
      bereavement_support_overview: '',
      other_services_overview: ''
    };
  }

  // getCareProgramDetails
  getCareProgramDetails(careProgramSlug) {
    const programs = this._getFromStorage('care_programs', []);
    const program = programs.find((p) => p.slug === careProgramSlug) || null;

    if (!program) {
      return {
        program: null,
        eligibility_text: '',
        goals_of_care: '',
        services_included: [],
        key_features: {
          has_24_7_nurse_phone_support: false,
          min_home_visits_per_week: 0,
          home_visit_frequency_label: '',
          support_tags: []
        },
        contact_phone: '',
        contact_email: '',
        faq_items: [],
        show_consultation_request: false,
        show_information_call: false
      };
    }

    const detailsByProgramId = this._getFromStorage('care_program_details', {});
    const extra = detailsByProgramId[program.id] || {};

    return {
      program: program,
      eligibility_text: extra.eligibility_text || '',
      goals_of_care: extra.goals_of_care || '',
      services_included: Array.isArray(program.services_included)
        ? program.services_included
        : (Array.isArray(extra.services_included) ? extra.services_included : []),
      key_features: {
        has_24_7_nurse_phone_support: !!program.has_24_7_nurse_phone_support,
        min_home_visits_per_week: typeof program.min_home_visits_per_week === 'number'
          ? program.min_home_visits_per_week
          : (typeof extra.min_home_visits_per_week === 'number' ? extra.min_home_visits_per_week : 0),
        home_visit_frequency_label: program.home_visit_frequency_label || extra.home_visit_frequency_label || '',
        support_tags: Array.isArray(program.support_tags) ? program.support_tags : (Array.isArray(extra.support_tags) ? extra.support_tags : [])
      },
      contact_phone: extra.contact_phone || '',
      contact_email: extra.contact_email || '',
      faq_items: Array.isArray(extra.faq_items) ? extra.faq_items : [],
      show_consultation_request: !!program.offers_consultation_request,
      show_information_call: !!program.offers_information_call
    };
  }

  // submitConsultationRequest
  submitConsultationRequest(
    careProgramId,
    firstName,
    lastName,
    phone,
    email,
    zipCode,
    preferredVisitLocation,
    preferredConsultationDatetime,
    primaryReason,
    additionalNotes
  ) {
    const programs = this._getFromStorage('care_programs', []);
    const program = programs.find((p) => p.id === careProgramId) || null;

    const requests = this._getFromStorage('consultation_requests', []);
    const id = this._generateId('consult');
    const request = {
      id: id,
      care_program_id: careProgramId,
      first_name: firstName,
      last_name: lastName,
      phone: phone,
      email: email,
      zip_code: zipCode,
      preferred_visit_location: preferredVisitLocation,
      preferred_consultation_datetime: new Date(preferredConsultationDatetime).toISOString(),
      primary_reason: primaryReason,
      additional_notes: additionalNotes || '',
      submitted_at: new Date().toISOString()
    };

    requests.push(request);
    this._persistEntityList('consultation_requests', requests);

    // Only returning the request; foreign-key resolution required for getters, not creators
    return {
      success: true,
      message: 'Consultation request submitted.',
      request: request,
      care_program: program
    };
  }

  // submitInformationCallRequest
  submitInformationCallRequest(
    careProgramId,
    firstName,
    lastName,
    phone,
    email,
    preferredContactMethod,
    preferredCallDatetime,
    questionsOrTopics
  ) {
    const programs = this._getFromStorage('care_programs', []);
    const program = programs.find((p) => p.id === careProgramId) || null;

    const calls = this._getFromStorage('information_call_requests', []);
    const id = this._generateId('infocall');
    const request = {
      id: id,
      care_program_id: careProgramId,
      first_name: firstName || '',
      last_name: lastName || '',
      phone: phone || '',
      email: email || '',
      preferred_contact_method: preferredContactMethod || null,
      preferred_call_datetime: preferredCallDatetime ? new Date(preferredCallDatetime).toISOString() : null,
      questions_or_topics: questionsOrTopics || '',
      submitted_at: new Date().toISOString()
    };

    calls.push(request);
    this._persistEntityList('information_call_requests', calls);

    return {
      success: true,
      message: 'Information call request submitted.',
      request: request,
      care_program: program
    };
  }

  // getCareComparisonPrograms
  getCareComparisonPrograms() {
    const programs = this._getFromStorage('care_programs', []);
    return programs;
  }

  // getCareComparisonTable
  getCareComparisonTable(careProgramSlugs, filters) {
    const programsAll = this._getFromStorage('care_programs', []);
    const slugs = Array.isArray(careProgramSlugs) ? careProgramSlugs : [];

    let programs = programsAll.filter((p) => slugs.includes(p.slug));

    const require24 = filters && filters.require24_7NursePhoneSupport === true;
    if (require24) {
      programs = programs.filter((p) => !!p.has_24_7_nurse_phone_support);
    }

    const minHome = filters && typeof filters.minHomeVisitsPerWeek === 'number'
      ? filters.minHomeVisitsPerWeek
      : null;

    const homeVisitRow = {
      key: 'home_visit_frequency',
      label: 'Home visit frequency',
      values: programs.map((p) => {
        const minVisits = typeof p.min_home_visits_per_week === 'number' ? p.min_home_visits_per_week : 0;
        const valueText = p.home_visit_frequency_label || (minVisits ? String(minVisits) + '+ visits per week' : 'Varies');
        const meets = minHome != null ? (minVisits >= minHome) : true;
        return {
          care_program_slug: p.slug,
          value_text: valueText,
          meets_filter_criteria: meets
        };
      })
    };

    const nurseSupportRow = {
      key: 'nurse_phone_support',
      label: '24/7 nurse phone support',
      values: programs.map((p) => {
        const has = !!p.has_24_7_nurse_phone_support;
        const meets = require24 ? has : has;
        return {
          care_program_slug: p.slug,
          value_text: has ? 'Yes' : 'No',
          meets_filter_criteria: meets
        };
      })
    };

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task3_comparisonParams',
        JSON.stringify({
          careProgramSlugs: careProgramSlugs || [],
          filters: filters || null
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      programs: programs,
      comparison_rows: [homeVisitRow, nurseSupportRow]
    };
  }

  // searchFacilities
  searchFacilities(zipCode, radiusMiles, filters, sortBy) {
    const facilities = this._getFromStorage('facilities', []);

    const radius = typeof radiusMiles === 'number' && !isNaN(radiusMiles) ? radiusMiles : 15;
    const includeInpatientOnly = filters && filters.includeInpatientHospiceOnly === true;
    const includeInHomeHospiceAreas = filters && filters.includeInHomeHospiceServiceAreas === true;
    const maxDistance = filters && typeof filters.maxDistanceMiles === 'number' ? filters.maxDistanceMiles : null;

    let results = facilities.slice();

    // Basic distance filtering based on distance_from_search_miles if present
    results = results.filter((f) => {
      const dist = typeof f.distance_from_search_miles === 'number' ? f.distance_from_search_miles : null;
      const limit = maxDistance != null ? maxDistance : radius;
      if (dist == null) return true; // if no distance stored, keep it
      return dist <= limit;
    });

    if (includeInpatientOnly) {
      results = results.filter((f) => !!f.has_inpatient_hospice);
    }

    if (includeInHomeHospiceAreas) {
      results = results.filter((f) => !!f.has_in_home_hospice);
    }

    if (sortBy === 'distance_nearest_first') {
      results.sort((a, b) => {
        const da = typeof a.distance_from_search_miles === 'number' ? a.distance_from_search_miles : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_from_search_miles === 'number' ? b.distance_from_search_miles : Number.POSITIVE_INFINITY;
        return da - db;
      });
    } else if (sortBy === 'name_a_to_z') {
      results.sort((a, b) => {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      });
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task2_facilitySearchParams',
        JSON.stringify({
          zipCode: zipCode,
          radiusMiles: radiusMiles,
          filters: filters,
          sortBy: sortBy
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return results;
  }

  // getFacilityDetails
  getFacilityDetails(facilityId) {
    const facilities = this._getFromStorage('facilities', []);
    const facility = facilities.find((f) => f.id === facilityId) || null;

    if (!facility) {
      return {
        facility: null,
        services_summary: '',
        visitor_information_summary: '',
        available_services: [],
        primary_calls_to_action: []
      };
    }

    const servicesSummary = Array.isArray(facility.services_offered)
      ? facility.services_offered.join(', ')
      : '';

    return {
      facility: facility,
      services_summary: servicesSummary,
      visitor_information_summary: facility.visitor_information_summary || '',
      available_services: Array.isArray(facility.services_offered) ? facility.services_offered : [],
      primary_calls_to_action: []
    };
  }

  // getFacilityVisitorInformation
  getFacilityVisitorInformation(facilityId) {
    const facilities = this._getFromStorage('facilities', []);
    const facility = facilities.find((f) => f.id === facilityId) || null;

    const hoursAll = this._getFromStorage('facility_visiting_hours', []);
    const visitingHours = hoursAll.filter((h) => h.facility_id === facilityId);

    // Instrumentation for task completion tracking
    try {
      if (facility) {
        localStorage.setItem('task2_selectedFacilityId', String(facilityId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      facility_id: facilityId,
      facility: facility,
      visiting_hours: visitingHours
    };
  }

  // savePreferredLocation
  savePreferredLocation(facilityId, savedLabel) {
    const facilities = this._getFromStorage('facilities', []);
    const facility = facilities.find((f) => f.id === facilityId) || null;

    if (!facility) {
      return {
        success: false,
        message: 'Facility not found.',
        preferred_location: null,
        facility: null
      };
    }

    const preferred = this._getFromStorage('preferred_locations', []);
    const newPreferred = {
      id: this._generateId('pref_loc'),
      facility_id: facilityId,
      saved_label: savedLabel || '',
      saved_at: new Date().toISOString()
    };

    preferred.push(newPreferred);
    this._persistEntityList('preferred_locations', preferred);

    return {
      success: true,
      message: 'Preferred location saved.',
      preferred_location: newPreferred,
      facility: facility
    };
  }

  // getPreferredLocations
  getPreferredLocations() {
    const preferred = this._getFromStorage('preferred_locations', []);
    const facilities = this._getFromStorage('facilities', []);

    return preferred.map((pl) => {
      const facility = facilities.find((f) => f.id === pl.facility_id) || null;
      return {
        preferred_location: pl,
        facility: facility
      };
    });
  }

  // removePreferredLocation
  removePreferredLocation(preferredLocationId) {
    const preferred = this._getFromStorage('preferred_locations', []);
    const initialLength = preferred.length;
    const filtered = preferred.filter((pl) => pl.id !== preferredLocationId);
    this._persistEntityList('preferred_locations', filtered);

    const removed = filtered.length !== initialLength;
    return {
      success: removed,
      message: removed ? 'Preferred location removed.' : 'Preferred location not found.'
    };
  }

  // getSupportGroupFilterOptions
  getSupportGroupFilterOptions() {
    return {
      formats: [
        { value: 'online_only', label: 'Online only' },
        { value: 'in_person', label: 'In person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      audiences: [
        { value: 'family_caregivers', label: 'Family caregivers' },
        { value: 'patients', label: 'Patients' },
        { value: 'children_and_teens', label: 'Children and teens' },
        { value: 'bereaved_caregivers', label: 'Bereaved caregivers' },
        { value: 'general_public', label: 'General public' },
        { value: 'other', label: 'Other' }
      ],
      time_of_day_options: [
        { value: 'morning', label: 'Morning' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening', label: 'Evening (after 5:00 pm)' },
        { value: 'all_day', label: 'All day' }
      ]
    };
  }

  // searchSupportGroups
  searchSupportGroups(format, audience, startDate, timeOfDay, sortBy) {
    let groups = this._getFromStorage('support_groups', []);

    if (format) {
      groups = groups.filter((g) => g.format === format);
    }
    if (audience) {
      groups = groups.filter((g) => g.audience === audience);
    }
    if (timeOfDay) {
      groups = groups.filter((g) => g.time_of_day === timeOfDay);
    }
    if (startDate) {
      const start = new Date(startDate + 'T00:00:00');
      groups = groups.filter((g) => {
        const dt = new Date(g.start_datetime);
        return dt >= start;
      });
    }

    if (sortBy === 'start_datetime_soonest_first') {
      groups.sort((a, b) => {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        return da - db;
      });
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task4_supportGroupSearchParams',
        JSON.stringify({
          format: format,
          audience: audience,
          startDate: startDate,
          timeOfDay: timeOfDay,
          sortBy: sortBy
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return groups;
  }

  // registerForSupportGroup
  registerForSupportGroup(
    supportGroupId,
    firstName,
    lastName,
    relationshipToPatient,
    email,
    sendEmailReminders
  ) {
    const groups = this._getFromStorage('support_groups', []);
    const group = groups.find((g) => g.id === supportGroupId) || null;
    if (!group) {
      return {
        success: false,
        message: 'Support group not found.',
        registration: null
      };
    }

    const registrations = this._getFromStorage('support_group_registrations', []);
    const registration = {
      id: this._generateId('sg_reg'),
      support_group_id: supportGroupId,
      first_name: firstName,
      last_name: lastName,
      relationship_to_patient: relationshipToPatient,
      email: email,
      send_email_reminders: !!sendEmailReminders,
      registered_at: new Date().toISOString()
    };

    registrations.push(registration);
    this._persistEntityList('support_group_registrations', registrations);

    return {
      success: true,
      message: 'Registered for support group.',
      registration: registration
    };
  }

  // calculateHomePalliativeCareEstimate
  calculateHomePalliativeCareEstimate(lengthOfServiceValue, lengthOfServiceUnit, primaryPayer, nurseVisitsPerWeek) {
    const result = this._calculateCostEstimateInternal(
      lengthOfServiceValue,
      lengthOfServiceUnit,
      primaryPayer,
      nurseVisitsPerWeek
    );
    return {
      estimated_total_cost: result.estimated_total_cost,
      estimated_daily_cost: result.estimated_daily_cost,
      calculation_explanation: result.calculation_explanation
    };
  }

  // saveHomePalliativeCareEstimate
  saveHomePalliativeCareEstimate(
    lengthOfServiceValue,
    lengthOfServiceUnit,
    primaryPayer,
    nurseVisitsPerWeek,
    estimateName,
    careProgramSlug
  ) {
    const result = this._calculateCostEstimateInternal(
      lengthOfServiceValue,
      lengthOfServiceUnit,
      primaryPayer,
      nurseVisitsPerWeek
    );

    const programs = this._getFromStorage('care_programs', []);
    const program = careProgramSlug
      ? programs.find((p) => p.slug === careProgramSlug) || null
      : null;

    const estimates = this._getFromStorage('cost_estimates', []);
    const estimate = {
      id: this._generateId('cost_est'),
      care_program_id: program ? program.id : null,
      length_of_service_value: Number(lengthOfServiceValue),
      length_of_service_unit: lengthOfServiceUnit,
      primary_payer: primaryPayer,
      nurse_visits_per_week: nurseVisitsPerWeek,
      estimated_total_cost: result.estimated_total_cost,
      estimated_daily_cost: result.estimated_daily_cost,
      estimate_name: estimateName,
      created_at: new Date().toISOString()
    };

    estimates.push(estimate);
    this._persistEntityList('cost_estimates', estimates);

    return {
      success: true,
      message: 'Cost estimate saved.',
      cost_estimate: estimate
    };
  }

  // getSavedCostEstimates (must resolve care_program)
  getSavedCostEstimates() {
    const estimates = this._getFromStorage('cost_estimates', []);
    const programs = this._getFromStorage('care_programs', []);

    return estimates.map((e) => {
      const careProgram = e.care_program_id
        ? programs.find((p) => p.id === e.care_program_id) || null
        : null;
      return Object.assign({}, e, { care_program: careProgram });
    });
  }

  // createCaregiverAccount
  createCaregiverAccount(
    firstName,
    lastName,
    email,
    password,
    caregiverType,
    preferredContactMethod,
    relationshipToPatient
  ) {
    const profiles = this._getFromStorage('caregiver_profiles', []);

    const existing = profiles.find((p) => p.email === email);
    if (existing) {
      return {
        success: false,
        message: 'A caregiver with this email already exists.',
        caregiver_profile: null
      };
    }

    const profile = {
      id: this._generateId('caregiver'),
      first_name: firstName,
      last_name: lastName,
      email: email,
      password: password,
      caregiver_type: caregiverType,
      preferred_contact_method: preferredContactMethod,
      relationship_to_patient: relationshipToPatient || '',
      created_at: new Date().toISOString()
    };

    profiles.push(profile);
    this._persistEntityList('caregiver_profiles', profiles);

    // update single-user context
    const ctx = this._getOrCreateSingleUserContext();
    ctx.caregiver_profile_id = profile.id;
    this._saveToStorage('single_user_context', ctx);
    localStorage.setItem('current_caregiver_profile_id', profile.id);

    return {
      success: true,
      message: 'Caregiver account created.',
      caregiver_profile: profile
    };
  }

  // signInCaregiver
  signInCaregiver(email, password) {
    const profiles = this._getFromStorage('caregiver_profiles', []);
    const profile = profiles.find((p) => p.email === email && p.password === password) || null;

    if (!profile) {
      return {
        success: false,
        message: 'Invalid email or password.',
        caregiver_profile: null
      };
    }

    // update context
    const ctx = this._getOrCreateSingleUserContext();
    ctx.caregiver_profile_id = profile.id;
    this._saveToStorage('single_user_context', ctx);
    localStorage.setItem('current_caregiver_profile_id', profile.id);

    return {
      success: true,
      message: 'Signed in successfully.',
      caregiver_profile: profile
    };
  }

  // getCaregiverDashboardOverview
  getCaregiverDashboardOverview() {
    const profiles = this._getFromStorage('caregiver_profiles', []);
    const currentId = localStorage.getItem('current_caregiver_profile_id');
    let caregiverProfile = null;

    if (currentId) {
      caregiverProfile = profiles.find((p) => p.id === currentId) || null;
    } else if (profiles.length === 1) {
      caregiverProfile = profiles[0];
    }

    const preferredLocations = this.getPreferredLocations();
    const savedCostEstimates = this.getSavedCostEstimates();

    const supportGroups = this._getFromStorage('support_groups', []);
    let suggestedSupportGroups = supportGroups.filter((g) => g.is_active === true);

    if (caregiverProfile && caregiverProfile.caregiver_type === 'family_caregiver') {
      suggestedSupportGroups = suggestedSupportGroups.filter((g) =>
        g.audience === 'family_caregivers' || g.audience === 'general_public'
      );
    }

    suggestedSupportGroups.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    suggestedSupportGroups = suggestedSupportGroups.slice(0, 3);

    const guides = this._getFromStorage('guide_resources', []);
    let suggestedGuides = guides.slice();
    if (caregiverProfile && caregiverProfile.caregiver_type === 'family_caregiver') {
      suggestedGuides = suggestedGuides.filter((g) =>
        g.topic === 'caregiver_support' || g.topic === 'end_of_life_planning'
      );
    }
    suggestedGuides = suggestedGuides.slice(0, 3);

    return {
      caregiver_profile: caregiverProfile,
      preferred_locations: preferredLocations,
      saved_cost_estimates: savedCostEstimates,
      suggested_support_groups: suggestedSupportGroups,
      suggested_guides: suggestedGuides
    };
  }

  // getToolsIndex
  getToolsIndex() {
    return [
      {
        tool_id: 'symptom_conversation_planner',
        name: 'Symptom Conversation Planner',
        description: 'Create a guide to talk with the care team about current symptoms.',
        page_slug: 'symptom_planner'
      },
      {
        tool_id: 'home_palliative_care_cost_estimator',
        name: 'Home Palliative Care Cost Estimator',
        description: 'Estimate the cost of home palliative care based on payer and visit frequency.',
        page_slug: 'home_palliative_cost_estimator'
      }
    ];
  }

  // getSymptomOptions
  getSymptomOptions() {
    return {
      diagnosis_options: [
        { value: 'advanced_heart_failure', label: 'Advanced heart failure' },
        { value: 'advanced_cancer', label: 'Advanced cancer' },
        { value: 'copd', label: 'COPD' },
        { value: 'dementia', label: 'Dementia' },
        { value: 'kidney_failure', label: 'Kidney failure' },
        { value: 'other', label: 'Other' }
      ],
      symptom_options: [
        { value: 'shortness_of_breath', label: 'Shortness of breath' },
        { value: 'nausea', label: 'Nausea' },
        { value: 'pain', label: 'Pain' },
        { value: 'fatigue', label: 'Fatigue' },
        { value: 'anxiety', label: 'Anxiety' },
        { value: 'depression', label: 'Depression' },
        { value: 'constipation', label: 'Constipation' },
        { value: 'loss_of_appetite', label: 'Loss of appetite' },
        { value: 'insomnia', label: 'Insomnia' },
        { value: 'other', label: 'Other' }
      ],
      severity_options: [
        { value: 'mild', label: 'Mild' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'severe', label: 'Severe' }
      ]
    };
  }

  // generateSymptomConversationGuide
  generateSymptomConversationGuide(patientAge, diagnosis, symptoms, notesForCareTeam) {
    const guides = this._getFromStorage('symptom_conversation_guides', []);
    const guideSymptoms = this._getFromStorage('conversation_guide_symptoms', []);

    const id = this._generateId('scg');
    const generatedAt = new Date().toISOString();

    const summaryParts = [];
    if (Array.isArray(symptoms)) {
      symptoms.forEach((s) => {
        if (!s) return;
        const label = s.symptomType || s.symptom_type;
        const sev = s.severity;
        if (label && sev) {
          summaryParts.push(label + ' (' + sev + ')');
        }
      });
    }

    const summaryBase = summaryParts.length
      ? 'Symptoms: ' + summaryParts.join(', ') + '.'
      : 'Symptoms not specified.';

    const guide = {
      id: id,
      patient_age: Number(patientAge),
      diagnosis: diagnosis,
      notes_for_care_team: notesForCareTeam || '',
      generated_at: generatedAt,
      summary: summaryBase
    };

    guides.push(guide);

    const createdSymptoms = [];
    if (Array.isArray(symptoms)) {
      symptoms.forEach((s) => {
        if (!s || !s.symptomType) return;
        const gs = {
          id: this._generateId('scs'),
          guide_id: id,
          symptom_type: s.symptomType,
          severity: s.severity,
          notes: s.notes || ''
        };
        guideSymptoms.push(gs);
        createdSymptoms.push(gs);
      });
    }

    this._persistEntityList('symptom_conversation_guides', guides);
    this._persistEntityList('conversation_guide_symptoms', guideSymptoms);

    return {
      guide: guide,
      symptoms: createdSymptoms
    };
  }

  // emailSymptomConversationGuide
  emailSymptomConversationGuide(guideId, recipientEmail, subject) {
    const guides = this._getFromStorage('symptom_conversation_guides', []);
    const guide = guides.find((g) => g.id === guideId) || null;

    if (!guide) {
      return {
        success: false,
        message: 'Guide not found.',
        email_record: null
      };
    }

    const emails = this._getFromStorage('symptom_guide_emails', []);
    const emailRecord = {
      id: this._generateId('sge'),
      guide_id: guideId,
      recipient_email: recipientEmail,
      subject: subject,
      body_preview: guide.summary || '',
      status: 'pending',
      sent_at: null
    };

    emails.push(emailRecord);
    this._persistEntityList('symptom_guide_emails', emails);

    const updated = this._sendEmailSimulation(emailRecord);

    return {
      success: true,
      message: 'Guide emailed (simulated).',
      email_record: updated
    };
  }

  // getDonationFunds
  getDonationFunds() {
    const funds = this._getFromStorage('donation_funds', []);
    return funds;
  }

  // submitDonation
  submitDonation(
    giftType,
    amount,
    fundId,
    tributeEnabled,
    tributeType,
    honoreeName,
    donorFirstName,
    donorLastName,
    donorEmail,
    streetAddress,
    city,
    state,
    zipCode,
    newsletterEmailOptIn,
    newsletterPrintOptIn,
    paymentMethod,
    cardNumber,
    cardExpiration,
    cardCvv
  ) {
    const funds = this._getFromStorage('donation_funds', []);
    const fund = funds.find((f) => f.id === fundId) || null;

    if (!fund) {
      return {
        success: false,
        message: 'Donation fund not found.',
        donation: null
      };
    }

    if (paymentMethod === 'credit_card') {
      if (!cardNumber || !cardExpiration || !cardCvv) {
        return {
          success: false,
          message: 'Credit card details are required.',
          donation: null
        };
      }
    }

    const donations = this._getFromStorage('donations', []);
    const donation = {
      id: this._generateId('donation'),
      gift_type: giftType,
      amount: Number(amount),
      fund_id: fundId,
      tribute_enabled: !!tributeEnabled,
      tribute_type: tributeEnabled ? tributeType || null : null,
      honoree_name: tributeEnabled ? (honoreeName || '') : '',
      donor_first_name: donorFirstName,
      donor_last_name: donorLastName,
      donor_email: donorEmail,
      street_address: streetAddress,
      city: city || '',
      state: state || '',
      zip_code: zipCode || '',
      newsletter_email_opt_in: !!newsletterEmailOptIn,
      newsletter_print_opt_in: !!newsletterPrintOptIn,
      payment_method: paymentMethod,
      card_number: paymentMethod === 'credit_card' ? cardNumber : null,
      card_expiration: paymentMethod === 'credit_card' ? cardExpiration : null,
      card_cvv: paymentMethod === 'credit_card' ? cardCvv : null,
      status: 'completed',
      submitted_at: new Date().toISOString()
    };

    donations.push(donation);
    this._persistEntityList('donations', donations);

    return {
      success: true,
      message: 'Donation submitted.',
      donation: donation
    };
  }

  // getGuideFilters
  getGuideFilters() {
    return {
      topics: [
        { value: 'end_of_life_planning', label: 'End-of-life planning' },
        { value: 'grief_and_loss', label: 'Grief and loss' },
        { value: 'caregiver_support', label: 'Caregiver support' },
        { value: 'pain_and_symptom_management', label: 'Pain and symptom management' },
        { value: 'pediatric_hospice', label: 'Pediatric hospice' },
        { value: 'general_hospice_palliative', label: 'General hospice & palliative care' },
        { value: 'other', label: 'Other' }
      ],
      languages: [
        { value: 'english', label: 'English' },
        { value: 'spanish', label: 'Spanish' },
        { value: 'english_spanish_bilingual', label: 'English / Spanish (bilingual)' },
        { value: 'other', label: 'Other' }
      ],
      formats: [
        { value: 'printed_guide', label: 'Printed guide' },
        { value: 'pdf_download', label: 'PDF download' },
        { value: 'web_page', label: 'Web page' }
      ]
    };
  }

  // searchGuides
  searchGuides(language, topic, format, sortBy) {
    let guides = this._getFromStorage('guide_resources', []);

    if (language) {
      guides = guides.filter((g) => g.language === language);
    }
    if (topic) {
      guides = guides.filter((g) => g.topic === topic);
    }
    if (format) {
      guides = guides.filter((g) =>
        Array.isArray(g.available_formats) && g.available_formats.includes(format)
      );
    }

    if (sortBy === 'title_a_to_z') {
      guides.sort((a, b) => {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      });
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task9_guideSearchParams',
        JSON.stringify({
          language: language,
          topic: topic,
          format: format,
          sortBy: sortBy
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return guides;
  }

  // getGuideDetails
  getGuideDetails(guideId) {
    const guides = this._getFromStorage('guide_resources', []);
    const guide = guides.find((g) => g.id === guideId) || null;

    const detailsMap = this._getFromStorage('guide_details_content', {});
    const extra = guide ? (detailsMap[guide.id] || {}) : {};

    const availableFormats = guide && Array.isArray(guide.available_formats)
      ? guide.available_formats.map((fmt) => ({
          format: fmt,
          label: this._formatGuideFormatLabel(fmt),
          download_available: fmt === 'pdf_download'
        }))
      : [];

    return {
      guide: guide,
      content_html: extra.content_html || '',
      available_formats: availableFormats
    };
  }

  // submitGuideMailRequest
  submitGuideMailRequest(guideId, fullName, streetAddress, city, state, zipCode) {
    const guides = this._getFromStorage('guide_resources', []);
    const guide = guides.find((g) => g.id === guideId) || null;

    if (!guide) {
      return {
        success: false,
        message: 'Guide not found.',
        mail_request: null
      };
    }

    const requests = this._getFromStorage('guide_mail_requests', []);
    const mailRequest = {
      id: this._generateId('guide_mail'),
      guide_id: guideId,
      full_name: fullName,
      street_address: streetAddress,
      city: city,
      state: state,
      zip_code: zipCode,
      status: 'pending',
      requested_at: new Date().toISOString()
    };

    requests.push(mailRequest);
    this._persistEntityList('guide_mail_requests', requests);

    return {
      success: true,
      message: 'Guide mail request submitted.',
      mail_request: mailRequest
    };
  }

  // getAboutUsContent
  getAboutUsContent() {
    const stored = this._getFromStorage('about_us_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      mission: '',
      values: [],
      history: '',
      leadership_team: [],
      accreditations: []
    };
  }

  // getContactUsInfo
  getContactUsInfo() {
    const stored = this._getFromStorage('contact_us_info', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      phone_numbers: [],
      email_addresses: [],
      emergency_disclaimer_text: ''
    };
  }

  // submitContactInquiry
  submitContactInquiry(name, email, phone, topic, message, consentToEmail) {
    const inquiries = this._getFromStorage('contact_inquiries', []);
    const id = this._generateId('contact');

    const inquiry = {
      id: id,
      name: name,
      email: email,
      phone: phone || '',
      topic: topic,
      message: message,
      consent_to_email: !!consentToEmail,
      submitted_at: new Date().toISOString()
    };

    inquiries.push(inquiry);
    this._persistEntityList('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted.',
      inquiryId: id
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_policy_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      last_updated: '',
      sections: []
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