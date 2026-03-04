/* localStorage polyfill for Node.js and environments without localStorage */
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

  /* =====================
   * Storage helpers
   * ===================== */

  _initStorage() {
    const arrayKeys = [
      'care_facilities',
      'daycare_providers',
      'classes',
      'class_registrations',
      'support_groups',
      'hotlines',
      'local_resources',
      'emergency_plans',
      'meetup_spots',
      'alert_subscriptions',
      'emergency_cards',
      'emergency_card_items',
      'emergency_contacts',
      'quick_dial_entries',
      'saved_resources',
      'babysitter_sheets',
      'symptom_sessions',
      'saved_zip_codes',
      'in_progress_tools',
      'support_contact_requests'
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
    const data = localStorage.getItem(key);
    if (!data) {
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

  /* =====================
   * Generic helpers
   * ===================== */

  _computeDistanceAndLabels(resource) {
    const distance = typeof resource.distance_miles === 'number' ? resource.distance_miles : null;
    const distanceLabel = distance == null ? 'Distance unknown' : distance.toFixed(1) + ' mi';
    return { distanceMiles: distance, distanceLabel: distanceLabel };
  }

  _resolveResource(resourceType, resourceId) {
    if (!resourceId) return null;
    const map = {
      care_facility: 'care_facilities',
      daycare_provider: 'daycare_providers',
      local_resource: 'local_resources',
      hotline: 'hotlines',
      support_group: 'support_groups',
      class: 'classes',
      emergency_contact_resource: 'emergency_contacts'
    };
    const storageKey = map[resourceType];
    if (!storageKey) return null;
    const list = this._getFromStorage(storageKey, []);
    return list.find((r) => r.id === resourceId) || null;
  }

  _updateResourceMembershipFlags(resourceType, resourceId) {
    const savedResources = this._getFromStorage('saved_resources', []);
    const emergencyContacts = this._getFromStorage('emergency_contacts', []);
    const emergencyCardItems = this._getFromStorage('emergency_card_items', []);
    const quickDialEntries = this._getFromStorage('quick_dial_entries', []);
    const meetupSpots = this._getFromStorage('meetup_spots', []);

    const isFavorite = savedResources.some(
      (sr) => sr.resource_type === resourceType && sr.resource_id === resourceId
    );

    const isInEmergencyContacts = emergencyContacts.some(
      (c) => c.resource_type === resourceType && c.resource_id === resourceId
    );

    const isInEmergencyCard = emergencyCardItems.some(
      (item) => item.item_type === resourceType && item.reference_id === resourceId
    );

    const isQuickDial = quickDialEntries.some(
      (qd) => qd.resource_type === resourceType && qd.resource_id === resourceId
    );

    const isMeetupSpot = meetupSpots.some(
      (spot) => spot.resource_type === resourceType && spot.resource_id === resourceId
    );

    return {
      is_favorite: isFavorite,
      is_in_emergency_contacts: isInEmergencyContacts,
      is_in_emergency_card: isInEmergencyCard,
      is_quick_dial: isQuickDial,
      is_meetup_spot: isMeetupSpot
    };
  }

  _resolveResourceByCardItem(item) {
    if (!item) return null;
    const type = item.item_type;
    const id = item.reference_id;
    return this._resolveResource(type, id);
  }

  _formatDateLabel(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  _formatTimeRangeLabel(startIso, endIso) {
    if (!startIso) return '';
    const start = new Date(startIso);
    if (Number.isNaN(start.getTime())) return '';
    let res = start.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    });
    if (endIso) {
      const end = new Date(endIso);
      if (!Number.isNaN(end.getTime())) {
        res += '  ' + end.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit'
        });
      }
    }
    return res;
  }

  _formatCostLabelForClass(cls) {
    if (!cls) return '';
    if (cls.is_free || cls.cost_amount === 0) return 'Free';
    if (typeof cls.cost_amount === 'number') {
      return '$' + cls.cost_amount.toFixed(2).replace(/\.00$/, '');
    }
    return '';
  }

  _getHoursSummaryForDaycare(provider) {
    if (!provider) return '';
    if (
      typeof provider.weekday_open_hour_24 === 'number' &&
      typeof provider.weekday_close_hour_24 === 'number'
    ) {
      const fmt = (h) => {
        const d = new Date(0);
        d.setHours(h, 0, 0, 0);
        return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      };
      return (
        'MonFri: ' +
        fmt(provider.weekday_open_hour_24) +
        '  ' +
        fmt(provider.weekday_close_hour_24)
      );
    }
    return provider.hours_description || '';
  }

  /* =====================
   * _getOrCreate helpers
   * ===================== */

  _getOrCreateEmergencyPlan() {
    const plans = this._getFromStorage('emergency_plans', []);
    if (plans.length > 0) {
      return plans[0];
    }
    const now = new Date().toISOString();
    const plan = {
      id: this._generateId('plan'),
      name: 'Family Emergency Plan',
      created_at: now,
      updated_at: now,
      num_children: 0,
      children: [],
      primary_meeting_place_text: '',
      backup_meeting_place_text: '',
      meetup_spot_ids: [],
      primary_email: '',
      main_phone: '',
      additional_contacts_note: '',
      status: 'draft'
    };
    const newPlans = [plan];
    this._saveToStorage('emergency_plans', newPlans);
    return plan;
  }

  _getOrCreateEmergencyCard() {
    const cards = this._getFromStorage('emergency_cards', []);
    if (cards.length > 0) return cards[0];
    const now = new Date().toISOString();
    const card = {
      id: this._generateId('ecard'),
      name: 'Family Emergency Card',
      description: '',
      created_at: now,
      updated_at: now,
      last_saved_to_profile_at: null
    };
    this._saveToStorage('emergency_cards', [card]);
    return card;
  }

  _getOrCreateAlertSubscription() {
    const subs = this._getFromStorage('alert_subscriptions', []);
    if (subs.length > 0) return subs[0];
    const now = new Date().toISOString();
    const sub = {
      id: this._generateId('alert'),
      zip: '',
      location_label: '',
      contact_method: 'sms',
      phone_number: '',
      email: '',
      alert_types: [],
      alert_type_options: [
        'severe_weather',
        'school_closures',
        'public_safety',
        'health_advisories',
        'traffic',
        'other'
      ],
      frequency: 'real_time',
      sms_consent: false,
      is_active: false,
      created_at: now,
      updated_at: now
    };
    this._saveToStorage('alert_subscriptions', [sub]);
    return sub;
  }

  _getOrCreateBabysitterSheet() {
    const sheets = this._getFromStorage('babysitter_sheets', []);
    if (sheets.length > 0) return sheets[0];
    const now = new Date().toISOString();
    const sheet = {
      id: this._generateId('bsheet'),
      name: '',
      created_at: now,
      updated_at: now,
      child_name: '',
      child_age_years: null,
      child_allergies: '',
      emergency_contacts: [],
      pediatrician_name: '',
      pediatrician_phone: '',
      pediatric_clinic_name: '',
      nearest_er_id: null,
      bedtime: '',
      routine_notes: '',
      shareable_link_token: null,
      shareable_url: null,
      last_shared_at: null
    };
    this._saveToStorage('babysitter_sheets', [sheet]);
    return sheet;
  }

  /* =====================
   * Symptom triage helper
   * ===================== */

  _runSymptomLogicEngine(params) {
    const {
      ageYears,
      primarySymptom,
      additionalSymptoms,
      temperature,
      severityAnswers
    } = params;

    let level = 'home_care';

    const tempF =
      typeof temperature === 'number'
        ? temperature
        : null;

    const sev = Array.isArray(severityAnswers) ? severityAnswers : [];
    const severeBreathing = sev.some((s) => s.indexOf('breath') !== -1 && s.indexOf('normally') === -1);
    const notDrinking = sev.some((s) => s.indexOf('not_drinking') !== -1);

    if (severeBreathing) {
      level = 'emergency_room';
    } else if (tempF != null && tempF >= 104) {
      level = 'emergency_room';
    } else if (tempF != null && tempF >= 102.5) {
      level = 'urgent_care';
    } else if (notDrinking) {
      level = 'urgent_care';
    } else if (primarySymptom === 'fever' && tempF != null && tempF >= 100.4) {
      level = 'nurse_advice_line';
    } else {
      level = 'home_care';
    }

    let recommendedResourceType = 'none';
    let recommendedResourceId = null;

    const careFacilities = this._getFromStorage('care_facilities', []);

    const findFacilityByTypes = (typesArray) => {
      return (
        careFacilities.find((f) => typesArray.indexOf(f.care_type) !== -1) || null
      );
    };

    if (level === 'nurse_advice_line') {
      const facility = findFacilityByTypes(['nurse_advice_line']);
      if (facility) {
        recommendedResourceType = 'care_facility';
        recommendedResourceId = facility.id;
      } else {
        recommendedResourceType = 'none';
      }
    } else if (level === 'urgent_care') {
      const facility = findFacilityByTypes(['urgent_care_center', 'pediatric_urgent_care']);
      if (facility) {
        recommendedResourceType = 'care_facility';
        recommendedResourceId = facility.id;
      } else {
        recommendedResourceType = 'none';
      }
    } else if (level === 'emergency_room') {
      const facility = findFacilityByTypes(['pediatric_er', 'general_er', 'adult_er']);
      if (facility) {
        recommendedResourceType = 'care_facility';
        recommendedResourceId = facility.id;
      } else {
        recommendedResourceType = 'none';
      }
    } else {
      recommendedResourceType = 'none';
    }

    return {
      recommended_level_of_care: level,
      recommended_resource_type: recommendedResourceType,
      recommended_resource_id: recommendedResourceId
    };
  }

  /* =====================
   * Interfaces
   * ===================== */

  /* Home overview & recommendations */

  getHomeOverview() {
    const plans = this._getFromStorage('emergency_plans', []);
    const cards = this._getFromStorage('emergency_cards', []);
    const sheets = this._getFromStorage('babysitter_sheets', []);
    const savedZips = this._getFromStorage('saved_zip_codes', []);

    const inProgressTools = [];

    if (plans.length > 0) {
      const plan = plans[0];
      if (plan.status === 'draft') {
        inProgressTools.push({
          tool_key: 'emergency_plan',
          display_name: 'Family Emergency Plan',
          last_updated_at: plan.updated_at || plan.created_at || null
        });
      }
    }

    if (sheets.length > 0) {
      const sheet = sheets[0];
      inProgressTools.push({
        tool_key: 'babysitter_sheet',
        display_name: sheet.name || 'Babysitter Info Sheet',
        last_updated_at: sheet.updated_at || sheet.created_at || null
      });
    }

    if (cards.length > 0) {
      const card = cards[0];
      inProgressTools.push({
        tool_key: 'emergency_card',
        display_name: card.name || 'Emergency Card',
        last_updated_at: card.updated_at || card.created_at || null
      });
    }

    return {
      has_emergency_plan: plans.length > 0,
      has_emergency_card: cards.length > 0,
      has_babysitter_sheet: sheets.length > 0,
      saved_zip_codes: savedZips,
      in_progress_tools: inProgressTools
    };
  }

  getHomeUrgentActions() {
    const emergencyContacts = this._getFromStorage('emergency_contacts', []);
    const quickDialEntries = this._getFromStorage('quick_dial_entries', []);
    const cards = this._getFromStorage('emergency_cards', []);
    const cardItems = this._getFromStorage('emergency_card_items', []);

    const emergency_contacts_preview = emergencyContacts.slice(0, 3).map((c) => ({
      ...c,
      resource: this._resolveResource(c.resource_type, c.resource_id)
    }));

    const quick_dial_preview = quickDialEntries.slice(0, 3).map((q) => ({
      ...q,
      resource: this._resolveResource(q.resource_type, q.resource_id)
    }));

    const hasCard = cards.length > 0;
    const activeCard = hasCard ? cards[0] : null;
    const itemCount = activeCard
      ? cardItems.filter((it) => it.emergency_card_id === activeCard.id).length
      : 0;

    return {
      emergency_contacts_preview,
      quick_dial_preview,
      emergency_card_preview: {
        has_card: hasCard,
        item_count: itemCount
      }
    };
  }

  getHomeRecommendedClassesAndResources() {
    const classes = this._getFromStorage('classes', []);
    const localResources = this._getFromStorage('local_resources', []);
    const now = new Date();

    const upcomingClasses = classes
      .filter((cls) => {
        if (!cls.start_datetime) return false;
        const d = new Date(cls.start_datetime);
        return !Number.isNaN(d.getTime()) && d >= now;
      })
      .sort((a, b) => {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        return da - db;
      })
      .slice(0, 5);

    const featuredResources = localResources.slice(0, 5);

    return {
      recommended_classes: upcomingClasses,
      featured_local_resources: featuredResources
    };
  }

  /* Find Care */

  getFindCareFilterOptions() {
    const care_categories = [
      { value: 'all_care', label: 'All care' },
      { value: 'emergency_care', label: 'Emergency care' },
      { value: 'urgent_care', label: 'Urgent care' },
      { value: 'primary_care', label: 'Primary care' },
      { value: 'hospital', label: 'Hospitals' },
      { value: 'clinic', label: 'Clinics' },
      { value: 'nurse_advice_line', label: 'Nurse advice lines' },
      { value: 'other_care', label: 'Other care' }
    ];

    const care_types = [
      { value: 'pediatric_er', label: 'Pediatric ER' },
      { value: 'adult_er', label: 'Adult ER' },
      { value: 'general_er', label: 'General ER' },
      { value: 'urgent_care_center', label: 'Urgent care center' },
      { value: 'pediatric_urgent_care', label: 'Pediatric urgent care' },
      { value: 'primary_care_clinic', label: 'Primary care clinic' },
      { value: 'hospital', label: 'Hospital' },
      { value: 'nurse_advice_line', label: 'Nurse advice line' },
      { value: 'other', label: 'Other' }
    ];

    // Derive insurance options from existing care facilities
    const facilities = this._getFromStorage('care_facilities', []);
    const insuranceSet = new Set();
    facilities.forEach((f) => {
      if (Array.isArray(f.insurance_accepted)) {
        f.insurance_accepted.forEach((name) => {
          if (name) insuranceSet.add(name);
        });
      }
    });
    const insurance_options = Array.from(insuranceSet).map((name) => ({
      value: name,
      label: name
    }));

    const hours_filters = [
      { key: 'open_24_7', label: 'Open 24/7' },
      { key: 'open_until_at_least_18', label: 'Open until at least 6:00 PM' }
    ];

    const sort_options = [
      { value: 'distance', label: 'Distance - nearest first' },
      { value: 'rating', label: 'Rating - highest first' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return { care_categories, care_types, insurance_options, hours_filters, sort_options };
  }

  searchCareFacilities(careCategory, careType, zip, maxDistanceMiles, filters, sortBy) {
    let facilities = this._getFromStorage('care_facilities', []);

    facilities = facilities.filter((f) => {
      if (careCategory && careCategory !== 'all_care' && f.care_category !== careCategory) {
        return false;
      }
      if (careType && f.care_type !== careType) {
        return false;
      }
      if (zip && f.zip && zip && f.zip !== zip) {
        // If maxDistanceMiles is provided and distance_miles exists, allow if within radius even if zip differs
        if (
          !(maxDistanceMiles && typeof f.distance_miles === 'number' && f.distance_miles <= maxDistanceMiles)
        ) {
          return false;
        }
      }
      if (maxDistanceMiles && typeof f.distance_miles === 'number' && f.distance_miles > maxDistanceMiles) {
        return false;
      }
      if (filters) {
        if (filters.acceptsMedicaid === true && !f.accepts_medicaid) return false;
        if (filters.isOpen247 === true && !f.is_open_24_7) return false;
        if (
          typeof filters.minRating === 'number' &&
          typeof f.rating === 'number' &&
          f.rating < filters.minRating
        ) {
          return false;
        }
      }
      return true;
    });

    const careCategoryLabels = {
      all_care: 'All care',
      emergency_care: 'Emergency care',
      urgent_care: 'Urgent care',
      primary_care: 'Primary care',
      hospital: 'Hospital',
      clinic: 'Clinic',
      nurse_advice_line: 'Nurse advice line',
      other_care: 'Other care'
    };
    const careTypeLabels = {
      pediatric_er: 'Pediatric ER',
      adult_er: 'Adult ER',
      general_er: 'General ER',
      urgent_care_center: 'Urgent care center',
      pediatric_urgent_care: 'Pediatric urgent care',
      primary_care_clinic: 'Primary care clinic',
      hospital: 'Hospital',
      nurse_advice_line: 'Nurse advice line',
      other: 'Other'
    };

    const sort = sortBy || 'relevance';
    facilities.sort((a, b) => {
      if (sort === 'distance') {
        const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
        return da - db;
      }
      if (sort === 'rating') {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      }
      // relevance: rating desc, then distance asc
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
      const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
      return da - db;
    });

    const results = facilities.map((f) => {
      const distanceInfo = this._computeDistanceAndLabels(f);
      const membership = this._updateResourceMembershipFlags('care_facility', f.id);
      return {
        facility: f,
        care_category_label: careCategoryLabels[f.care_category] || '',
        care_type_label: careTypeLabels[f.care_type] || '',
        distance_label: distanceInfo.distanceLabel,
        is_in_emergency_contacts: membership.is_in_emergency_contacts,
        is_favorite: membership.is_favorite
      };
    });

    return {
      results,
      total_count: results.length
    };
  }

  /* Emergency Plan */

  getEmergencyPlanForEditing() {
    return this._getOrCreateEmergencyPlan();
  }

  saveEmergencyPlan(plan) {
    const plans = this._getFromStorage('emergency_plans', []);
    let existing = plans.length > 0 ? plans[0] : this._getOrCreateEmergencyPlan();

    const updated = {
      ...existing,
      name: plan.name || existing.name || 'Family Emergency Plan',
      num_children: typeof plan.num_children === 'number'
        ? plan.num_children
        : Array.isArray(plan.children)
        ? plan.children.length
        : existing.num_children,
      children: Array.isArray(plan.children) ? plan.children : existing.children || [],
      primary_meeting_place_text:
        typeof plan.primary_meeting_place_text === 'string'
          ? plan.primary_meeting_place_text
          : existing.primary_meeting_place_text,
      backup_meeting_place_text:
        typeof plan.backup_meeting_place_text === 'string'
          ? plan.backup_meeting_place_text
          : existing.backup_meeting_place_text,
      primary_email:
        typeof plan.primary_email === 'string' ? plan.primary_email : existing.primary_email,
      main_phone: typeof plan.main_phone === 'string' ? plan.main_phone : existing.main_phone,
      additional_contacts_note:
        typeof plan.additional_contacts_note === 'string'
          ? plan.additional_contacts_note
          : existing.additional_contacts_note,
      status: 'saved',
      updated_at: new Date().toISOString()
    };

    const newPlans = [updated];
    this._saveToStorage('emergency_plans', newPlans);
    return updated;
  }

  getEmergencyPlanPrintableView() {
    const plan = this._getOrCreateEmergencyPlan();
    const meetupSpots = this._getFromStorage('meetup_spots', []);
    const localResources = this._getFromStorage('local_resources', []);

    const meetup_spots = (Array.isArray(plan.meetup_spot_ids) ? plan.meetup_spot_ids : []).map(
      (id) => {
        const spot = meetupSpots.find((s) => s.id === id) || null;
        if (!spot) return null;
        let linked_resource = null;
        if (spot.resource_type === 'local_resource') {
          linked_resource = localResources.find((lr) => lr.id === spot.resource_id) || null;
        }
        return { spot, linked_resource };
      }
    ).filter((x) => x !== null);

    return { plan, meetup_spots };
  }

  /* Classes & Workshops */

  getClassFilterOptions() {
    const topics = [
      { value: 'all_classes', label: 'All topics' },
      { value: 'infant_cpr', label: 'Infant CPR' },
      { value: 'prenatal_care', label: 'Prenatal care' },
      { value: 'parenting_basics', label: 'Parenting basics' },
      { value: 'safety', label: 'Safety' },
      { value: 'other', label: 'Other' }
    ];

    const price_filters = [
      { key: 'free', label: 'Free / $0' },
      { key: 'paid', label: 'Paid' }
    ];

    const sort_options = [
      { value: 'start_time_asc', label: 'Start time - earliest first' },
      { value: 'start_time_desc', label: 'Start time - latest first' }
    ];

    return { topics, price_filters, sort_options };
  }

  searchClasses(keywords, date, zip, maxDistanceMiles, priceFilter, sortBy) {
    let classes = this._getFromStorage('classes', []);
    const keywordStr = (keywords || '').trim().toLowerCase();

    classes = classes.filter((cls) => {
      if (keywordStr) {
        const haystack = (
          (cls.title || '') +
          ' ' +
          (cls.description || '') +
          ' ' +
          (cls.topic || '') +
          ' ' +
          (Array.isArray(cls.keywords) ? cls.keywords.join(' ') : '')
        ).toLowerCase();
        if (haystack.indexOf(keywordStr) === -1) return false;
      }

      if (date) {
        if (!cls.start_datetime) return false;
        const d = new Date(cls.start_datetime);
        if (Number.isNaN(d.getTime())) return false;
        const isoDate = d.toISOString().slice(0, 10);
        if (isoDate !== date) return false;
      }

      if (zip && cls.zip && cls.zip !== zip) {
        return false;
      }

      if (priceFilter === 'free_only') {
        const isFree = cls.is_free || cls.cost_amount === 0;
        if (!isFree) return false;
      }

      // maxDistanceMiles: Class entity does not define distance; if distance_miles exists, use it
      if (
        maxDistanceMiles &&
        typeof cls.distance_miles === 'number' &&
        cls.distance_miles > maxDistanceMiles
      ) {
        return false;
      }

      return true;
    });

    const sort = sortBy || 'start_time_asc';
    classes.sort((a, b) => {
      const da = a.start_datetime ? new Date(a.start_datetime).getTime() : Number.POSITIVE_INFINITY;
      const db = b.start_datetime ? new Date(b.start_datetime).getTime() : Number.POSITIVE_INFINITY;
      if (sort === 'start_time_desc') return db - da;
      return da - db;
    });

    const regs = this._getFromStorage('class_registrations', []);

    const results = classes.map((cls) => {
      const is_registered = regs.some((r) => r.class_id === cls.id && r.status === 'registered');
      const date_label = this._formatDateLabel(cls.start_datetime);
      const time_range_label = this._formatTimeRangeLabel(
        cls.start_datetime,
        cls.end_datetime
      );
      const cost_label = this._formatCostLabelForClass(cls);
      const distanceInfo = this._computeDistanceAndLabels(cls);
      return {
        class: cls,
        is_registered,
        date_label,
        time_range_label,
        cost_label,
        distance_label: distanceInfo.distanceLabel
      };
    });

    return { results, total_count: results.length };
  }

  getClassDetails(classId) {
    const classes = this._getFromStorage('classes', []);
    const cls = classes.find((c) => c.id === classId) || null;
    if (!cls) return null;

    const regs = this._getFromStorage('class_registrations', []);
    const is_registered = regs.some((r) => r.class_id === classId && r.status === 'registered');

    const date_label = this._formatDateLabel(cls.start_datetime);
    const time_range_label = this._formatTimeRangeLabel(cls.start_datetime, cls.end_datetime);
    const cost_label = this._formatCostLabelForClass(cls);

    let location_label = '';
    if (cls.location_name) {
      location_label = cls.location_name;
    } else if (cls.address_line1 || cls.city || cls.state) {
      location_label = [cls.address_line1, cls.city, cls.state, cls.zip]
        .filter((x) => !!x)
        .join(', ');
    }

    return {
      class: cls,
      is_registered,
      date_label,
      time_range_label,
      cost_label,
      location_label
    };
  }

  registerForClass(classId, registrantName, registrantEmail, registrantPhone) {
    const classes = this._getFromStorage('classes', []);
    const clsIndex = classes.findIndex((c) => c.id === classId);
    if (clsIndex === -1) {
      throw new Error('Class not found');
    }
    const cls = classes[clsIndex];

    let status = 'registered';
    if (typeof cls.spots_remaining === 'number') {
      if (cls.spots_remaining <= 0) {
        status = 'waitlisted';
      } else {
        status = 'registered';
        cls.spots_remaining = cls.spots_remaining - 1;
        classes[clsIndex] = cls;
        this._saveToStorage('classes', classes);
      }
    }

    const regs = this._getFromStorage('class_registrations', []);
    const now = new Date().toISOString();
    const reg = {
      id: this._generateId('classreg'),
      class_id: classId,
      registrant_name: registrantName,
      registrant_email: registrantEmail,
      registrant_phone: registrantPhone || '',
      registered_at: now,
      status
    };
    regs.push(reg);
    this._saveToStorage('class_registrations', regs);
    return reg;
  }

  saveClassToProfile(classId, notes) {
    const savedResources = this._getFromStorage('saved_resources', []);
    let existing = savedResources.find(
      (sr) => sr.resource_type === 'class' && sr.resource_id === classId
    );
    const now = new Date().toISOString();
    if (existing) {
      existing.notes = typeof notes === 'string' ? notes : existing.notes;
    } else {
      existing = {
        id: this._generateId('saved'),
        resource_type: 'class',
        resource_id: classId,
        save_category: 'saved_resource',
        notes: typeof notes === 'string' ? notes : '',
        created_at: now
      };
      savedResources.push(existing);
    }
    this._saveToStorage('saved_resources', savedResources);
    return existing;
  }

  /* Childcare & Daycare */

  getDaycareFilterOptions() {
    const age_ranges = [
      { key: 'infant', label: '0-1 years', min_age_years: 0, max_age_years: 1 },
      { key: 'toddler', label: '1-3 years', min_age_years: 1, max_age_years: 3 },
      { key: '3_years', label: '3 years', min_age_years: 3, max_age_years: 3 },
      { key: 'preschool', label: '3-5 years', min_age_years: 3, max_age_years: 5 }
    ];

    const rating_buckets = [
      { key: '4_plus', label: '4.0 stars & up', min_rating: 4.0 },
      { key: '3_plus', label: '3.0 stars & up', min_rating: 3.0 }
    ];

    const hours_filters = [
      { key: 'open_until_at_least_18', label: 'Open until at least 6:00 PM' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'distance', label: 'Distance - nearest first' },
      { value: 'rating', label: 'Rating - highest first' }
    ];

    return { age_ranges, rating_buckets, hours_filters, sort_options };
  }

  searchDaycareProviders(
    childAgeYears,
    zip,
    maxDistanceMiles,
    minRating,
    requireOpenUntilAtLeast18,
    sortBy
  ) {
    let providers = this._getFromStorage('daycare_providers', []);

    providers = providers.filter((p) => {
      if (typeof childAgeYears === 'number') {
        if (
          typeof p.accepts_age_min_years === 'number' &&
          childAgeYears < p.accepts_age_min_years
        ) {
          return false;
        }
        if (
          typeof p.accepts_age_max_years === 'number' &&
          childAgeYears > p.accepts_age_max_years
        ) {
          return false;
        }
      }

      if (zip && p.zip && p.zip !== zip) {
        // Allow providers in a different ZIP if they are within the max distance
        if (
          !(
            maxDistanceMiles &&
            typeof p.distance_miles === 'number' &&
            p.distance_miles <= maxDistanceMiles
          )
        ) {
          return false;
        }
      }

      if (
        maxDistanceMiles &&
        typeof p.distance_miles === 'number' &&
        p.distance_miles > maxDistanceMiles
      ) {
        return false;
      }

      if (typeof minRating === 'number' && typeof p.rating === 'number') {
        if (p.rating < minRating) return false;
      }

      if (requireOpenUntilAtLeast18) {
        const openFlag =
          p.open_until_at_least_18 === true ||
          (typeof p.weekday_close_hour_24 === 'number' && p.weekday_close_hour_24 >= 18);
        if (!openFlag) return false;
      }

      return true;
    });

    const sort = sortBy || 'relevance';
    providers.sort((a, b) => {
      if (sort === 'distance') {
        const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
        return da - db;
      }
      if (sort === 'rating') {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      }
      // relevance: rating desc then distance asc
      const ra = typeof a.rating === 'number' ? a.rating : 0;
      const rb = typeof b.rating === 'number' ? b.rating : 0;
      if (rb !== ra) return rb - ra;
      const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
      const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
      return da - db;
    });

    const results = providers.map((p) => {
      const distanceInfo = this._computeDistanceAndLabels(p);
      const membership = this._updateResourceMembershipFlags('daycare_provider', p.id);
      const hours_summary = this._getHoursSummaryForDaycare(p);
      return {
        daycare: p,
        distance_label: distanceInfo.distanceLabel,
        hours_summary,
        is_favorite: membership.is_favorite
      };
    });

    return { results, total_count: results.length };
  }

  /* Generic resource details */

  getResourceDetails(resourceType, resourceId) {
    let care_facility = null;
    let daycare_provider = null;
    let local_resource = null;
    let hotline = null;
    let support_group = null;
    let cls = null;

    if (resourceType === 'care_facility') {
      const facilities = this._getFromStorage('care_facilities', []);
      care_facility = facilities.find((f) => f.id === resourceId) || null;
    } else if (resourceType === 'daycare_provider') {
      const providers = this._getFromStorage('daycare_providers', []);
      daycare_provider = providers.find((d) => d.id === resourceId) || null;
    } else if (resourceType === 'local_resource') {
      const resources = this._getFromStorage('local_resources', []);
      local_resource = resources.find((r) => r.id === resourceId) || null;
    } else if (resourceType === 'hotline') {
      const hotlines = this._getFromStorage('hotlines', []);
      hotline = hotlines.find((h) => h.id === resourceId) || null;
    } else if (resourceType === 'support_group') {
      const groups = this._getFromStorage('support_groups', []);
      support_group = groups.find((g) => g.id === resourceId) || null;
    } else if (resourceType === 'class') {
      const classes = this._getFromStorage('classes', []);
      cls = classes.find((c) => c.id === resourceId) || null;
    }

    let hours_display = '';
    let amenities_display = '';
    let contact_methods_display = '';

    if (care_facility) {
      if (care_facility.is_open_24_7) {
        hours_display = 'Open 24/7';
      } else if (
        typeof care_facility.weekday_open_hour_24 === 'number' &&
        typeof care_facility.weekday_close_hour_24 === 'number'
      ) {
        const fmt = (h) => {
          const d = new Date(0);
          d.setHours(h, 0, 0, 0);
          return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
        };
        hours_display =
          'Weekdays: ' +
          fmt(care_facility.weekday_open_hour_24) +
          '  ' +
          fmt(care_facility.weekday_close_hour_24);
      } else {
        hours_display = care_facility.hours_notes || '';
      }
    }

    if (daycare_provider) {
      hours_display = this._getHoursSummaryForDaycare(daycare_provider);
      const amenities = [];
      if (daycare_provider.has_fenced_playground) amenities.push('Fenced playground');
      if (daycare_provider.has_meals_provided) amenities.push('Meals provided');
      amenities_display = amenities.join(', ');
    }

    if (local_resource) {
      const amenities = [];
      if (local_resource.has_fenced_playground) amenities.push('Fenced playground');
      if (local_resource.has_restrooms) amenities.push('Restrooms');
      if (Array.isArray(local_resource.other_amenities)) {
        amenities.push.apply(amenities, local_resource.other_amenities);
      }
      amenities_display = amenities.join(', ');
      hours_display = local_resource.hours_description || '';
    }

    if (hotline) {
      hours_display = hotline.hours_description || (hotline.is_24_7 ? '24/7' : '');
      if (Array.isArray(hotline.contact_methods)) {
        const labels = hotline.contact_methods.map((cm) => {
          if (cm === 'phone') return 'Phone';
          if (cm === 'phone_chat') return 'Phone + chat';
          if (cm === 'chat') return 'Chat';
          if (cm === 'text') return 'Text';
          if (cm === 'email') return 'Email';
          if (cm === 'online_form') return 'Online form';
          return cm;
        });
        contact_methods_display = labels.join(', ');
      }
    }

    if (support_group) {
      hours_display = support_group.schedule_days || '';
    }

    if (cls) {
      hours_display = this._formatTimeRangeLabel(cls.start_datetime, cls.end_datetime);
    }

    const membership = this._updateResourceMembershipFlags(resourceType, resourceId);

    return {
      resourceType,
      care_facility,
      daycare_provider,
      local_resource,
      hotline,
      support_group,
      class: cls,
      hours_display,
      amenities_display,
      contact_methods_display,
      is_favorite: membership.is_favorite,
      is_in_emergency_contacts: membership.is_in_emergency_contacts,
      is_in_emergency_card: membership.is_in_emergency_card,
      is_quick_dial: membership.is_quick_dial,
      is_meetup_spot: membership.is_meetup_spot
    };
  }

  /* Emergency contacts, favorites, meetup spots, quick-dial, emergency card */

  addResourceToEmergencyContacts(resourceType, resourceId, label, notes) {
    const contacts = this._getFromStorage('emergency_contacts', []);
    let existing = contacts.find(
      (c) => c.resource_type === resourceType && c.resource_id === resourceId
    );

    const resource = this._resolveResource(resourceType, resourceId);
    const primary_phone = resource && resource.phone_number ? resource.phone_number : '';

    const now = new Date().toISOString();

    if (existing) {
      existing.label = label || existing.label;
      existing.notes = typeof notes === 'string' ? notes : existing.notes;
      existing.primary_phone = primary_phone || existing.primary_phone;
    } else {
      existing = {
        id: this._generateId('econtact'),
        label: label || (resource && resource.name) || '',
        resource_type: resourceType,
        resource_id: resourceId,
        primary_phone,
        secondary_phone: '',
        notes: typeof notes === 'string' ? notes : '',
        created_at: now
      };
      contacts.push(existing);
    }

    this._saveToStorage('emergency_contacts', contacts);
    return existing;
  }

  addResourceToFavorites(resourceType, resourceId, saveCategory, notes) {
    const savedResources = this._getFromStorage('saved_resources', []);
    let existing = savedResources.find(
      (sr) =>
        sr.resource_type === resourceType &&
        sr.resource_id === resourceId &&
        sr.save_category === saveCategory
    );
    const now = new Date().toISOString();
    if (existing) {
      existing.notes = typeof notes === 'string' ? notes : existing.notes;
    } else {
      existing = {
        id: this._generateId('saved'),
        resource_type: resourceType,
        resource_id: resourceId,
        save_category: saveCategory,
        notes: typeof notes === 'string' ? notes : '',
        created_at: now
      };
      savedResources.push(existing);
    }
    this._saveToStorage('saved_resources', savedResources);
    return existing;
  }

  saveResourceAsMeetupSpot(resourceType, resourceId, label, notes) {
    const meetupSpots = this._getFromStorage('meetup_spots', []);
    const resource = this._resolveResource(resourceType, resourceId);
    const now = new Date().toISOString();

    const meetup_spot = {
      id: this._generateId('mspot'),
      label: label || (resource && resource.name) || '',
      resource_type: resourceType,
      resource_id: resourceId,
      custom_address: '',
      notes: typeof notes === 'string' ? notes : '',
      created_at: now
    };
    meetupSpots.push(meetup_spot);
    this._saveToStorage('meetup_spots', meetupSpots);

    const plan = this._getOrCreateEmergencyPlan();
    const planMeetupIds = Array.isArray(plan.meetup_spot_ids) ? plan.meetup_spot_ids.slice() : [];
    if (planMeetupIds.indexOf(meetup_spot.id) === -1) {
      planMeetupIds.push(meetup_spot.id);
    }
    const updatedPlan = {
      ...plan,
      meetup_spot_ids: planMeetupIds,
      updated_at: now
    };
    this._saveToStorage('emergency_plans', [updatedPlan]);

    return { meetup_spot, updated_emergency_plan: updatedPlan };
  }

  addResourceToQuickDial(resourceType, resourceId, label, fromSource) {
    const quickDial = this._getFromStorage('quick_dial_entries', []);
    let existing = quickDial.find(
      (q) => q.resource_type === resourceType && q.resource_id === resourceId
    );

    const resource = this._resolveResource(resourceType, resourceId);
    const now = new Date().toISOString();
    const phone_number = resource && resource.phone_number ? resource.phone_number : '';

    if (existing) {
      existing.label = label || existing.label;
      existing.from_source = fromSource || existing.from_source;
      existing.phone_number = phone_number || existing.phone_number;
    } else {
      existing = {
        id: this._generateId('qdial'),
        label: label || (resource && resource.name) || '',
        resource_type: resourceType,
        resource_id: resourceId,
        phone_number,
        from_source: fromSource || 'manual',
        created_at: now
      };
      quickDial.push(existing);
    }
    this._saveToStorage('quick_dial_entries', quickDial);
    return existing;
  }

  addResourceToEmergencyCard(resourceType, resourceId, label, notes) {
    const card = this._getOrCreateEmergencyCard();
    const items = this._getFromStorage('emergency_card_items', []);
    const resource = this._resolveResource(resourceType, resourceId);
    const now = new Date().toISOString();

    const phone_number = resource && resource.phone_number ? resource.phone_number : '';
    const order_index = items.filter((i) => i.emergency_card_id === card.id).length;

    const item = {
      id: this._generateId('ecard_item'),
      emergency_card_id: card.id,
      item_type: resourceType,
      reference_id: resourceId,
      label: label || (resource && resource.name) || '',
      phone_number,
      order_index,
      notes: typeof notes === 'string' ? notes : '',
      created_at: now
    };

    items.push(item);
    this._saveToStorage('emergency_card_items', items);
    return item;
  }

  getResourceListMembershipStatus(resourceType, resourceId) {
    return this._updateResourceMembershipFlags(resourceType, resourceId);
  }

  getEmergencyCardDetails() {
    const card = this._getOrCreateEmergencyCard();
    const itemsAll = this._getFromStorage('emergency_card_items', []);
    const itemsForCard = itemsAll
      .filter((it) => it.emergency_card_id === card.id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const items = itemsForCard.map((item) => ({
      ...item,
      emergency_card: card,
      reference: this._resolveResourceByCardItem(item)
    }));

    return { card, items };
  }

  reorderEmergencyCardItems(orderedItemIds) {
    const items = this._getFromStorage('emergency_card_items', []);
    const idToIndex = new Map();
    orderedItemIds.forEach((id, idx) => {
      idToIndex.set(id, idx);
    });

    const maxBase = orderedItemIds.length;
    items.forEach((item) => {
      if (idToIndex.has(item.id)) {
        item.order_index = idToIndex.get(item.id);
      } else {
        item.order_index = maxBase + (item.order_index || 0);
      }
    });

    this._saveToStorage('emergency_card_items', items);

    const card = this._getOrCreateEmergencyCard();
    const updatedItems = items
      .filter((it) => it.emergency_card_id === card.id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map((item) => ({
        ...item,
        emergency_card: card,
        reference: this._resolveResourceByCardItem(item)
      }));

    return updatedItems;
  }

  removeEmergencyCardItem(emergencyCardItemId) {
    const items = this._getFromStorage('emergency_card_items', []);
    const initialLength = items.length;
    const filtered = items.filter((it) => it.id !== emergencyCardItemId);
    this._saveToStorage('emergency_card_items', filtered);
    return filtered.length !== initialLength;
  }

  saveEmergencyCardToProfile() {
    const cards = this._getFromStorage('emergency_cards', []);
    const card = cards.length > 0 ? cards[0] : this._getOrCreateEmergencyCard();
    const now = new Date().toISOString();
    const updated = { ...card, last_saved_to_profile_at: now, updated_at: now };
    this._saveToStorage('emergency_cards', [updated]);
    return updated;
  }

  getEmergencyCardPrintableView() {
    const card = this._getOrCreateEmergencyCard();
    const itemsAll = this._getFromStorage('emergency_card_items', []);
    const itemsForCard = itemsAll
      .filter((it) => it.emergency_card_id === card.id)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const careFacilities = this._getFromStorage('care_facilities', []);
    const hotlines = this._getFromStorage('hotlines', []);
    const daycareProviders = this._getFromStorage('daycare_providers', []);
    const emergencyContacts = this._getFromStorage('emergency_contacts', []);

    const items_with_resources = itemsForCard.map((item) => {
      let care_facility = null;
      let hotline = null;
      let daycare_provider = null;
      let emergency_contact_resource = null;

      if (item.item_type === 'care_facility') {
        care_facility = careFacilities.find((f) => f.id === item.reference_id) || null;
      } else if (item.item_type === 'hotline') {
        hotline = hotlines.find((h) => h.id === item.reference_id) || null;
      } else if (item.item_type === 'daycare_provider') {
        daycare_provider =
          daycareProviders.find((d) => d.id === item.reference_id) || null;
      } else if (item.item_type === 'emergency_contact_resource') {
        emergency_contact_resource =
          emergencyContacts.find((c) => c.id === item.reference_id) || null;
      }

      return {
        item,
        care_facility,
        hotline,
        daycare_provider,
        emergency_contact_resource
      };
    });

    return { card, items_with_resources };
  }

  /* Alerts */

  getAlertTypeOptions() {
    const alert_types = [
      { value: 'severe_weather', label: 'Severe weather' },
      { value: 'school_closures', label: 'School closures' },
      { value: 'public_safety', label: 'Public safety' },
      { value: 'health_advisories', label: 'Health advisories' },
      { value: 'traffic', label: 'Traffic' },
      { value: 'other', label: 'Other' }
    ];

    const frequencies = [
      { value: 'real_time', label: 'Real-time' },
      { value: 'daily_summary', label: 'Daily summary' },
      { value: 'weekly_summary', label: 'Weekly summary' }
    ];

    const contact_methods = [
      { value: 'sms', label: 'Text (SMS)' },
      { value: 'email', label: 'Email' },
      { value: 'push', label: 'Push notifications' }
    ];

    return { alert_types, frequencies, contact_methods };
  }

  getAlertSubscriptionSettings() {
    const subs = this._getFromStorage('alert_subscriptions', []);
    return subs.length > 0 ? subs[0] : null;
  }

  saveAlertSubscriptionSettings(
    zip,
    contactMethod,
    phoneNumber,
    email,
    alertTypes,
    frequency,
    smsConsent
  ) {
    const subs = this._getFromStorage('alert_subscriptions', []);
    let sub = subs.length > 0 ? subs[0] : null;
    const now = new Date().toISOString();

    if (!sub) {
      sub = {
        id: this._generateId('alert'),
        zip: '',
        location_label: '',
        contact_method: 'sms',
        phone_number: '',
        email: '',
        alert_types: [],
        alert_type_options: [
          'severe_weather',
          'school_closures',
          'public_safety',
          'health_advisories',
          'traffic',
          'other'
        ],
        frequency: 'real_time',
        sms_consent: false,
        is_active: false,
        created_at: now,
        updated_at: now
      };
    }

    sub.zip = zip;
    sub.location_label = zip ? 'ZIP ' + zip : sub.location_label || '';
    sub.contact_method = contactMethod;
    sub.phone_number = phoneNumber || '';
    sub.email = email || '';
    sub.alert_types = Array.isArray(alertTypes) ? alertTypes : [];
    sub.frequency = frequency;
    sub.sms_consent = !!smsConsent;
    sub.is_active = true;
    sub.updated_at = now;

    this._saveToStorage('alert_subscriptions', [sub]);
    return sub;
  }

  /* Support groups */

  getSupportGroupFilterOptions() {
    const categories = [
      { value: 'all_groups', label: 'All groups' },
      { value: 'breastfeeding_support', label: 'Breastfeeding support' },
      { value: 'postpartum_support', label: 'Postpartum support' },
      { value: 'parenting_support', label: 'Parenting support' },
      { value: 'grief_support', label: 'Grief support' },
      { value: 'other', label: 'Other' }
    ];

    const cost_types = [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' },
      { value: 'donation', label: 'Donation-based' },
      { value: 'sliding_scale', label: 'Sliding scale' }
    ];

    const child_friendliness_options = [
      { value: 'children_welcome', label: 'Children welcome' },
      { value: 'adults_only', label: 'Adults only' },
      { value: 'babies_only', label: 'Babies only' },
      { value: 'unknown', label: 'Unknown / not specified' }
    ];

    const schedule_days_options = [
      { value: 'weekdays', label: 'Weekdays' },
      { value: 'weekends', label: 'Weekends' },
      { value: 'both', label: 'Weekdays & weekends' },
      { value: 'varies', label: 'Varies' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'varies', label: 'Varies' }
    ];

    return {
      categories,
      cost_types,
      child_friendliness_options,
      schedule_days_options,
      time_of_day_options
    };
  }

  searchSupportGroups(
    categoryId,
    costType,
    childFriendliness,
    scheduleDays,
    timeOfDay,
    minUpcomingEvents
  ) {
    let groups = this._getFromStorage('support_groups', []);

    groups = groups.filter((g) => {
      if (categoryId && categoryId !== 'all_groups' && g.category_id !== categoryId) {
        return false;
      }
      if (costType && g.cost_type !== costType) return false;
      if (childFriendliness && g.child_friendliness !== childFriendliness) return false;
      if (scheduleDays && g.schedule_days !== scheduleDays) return false;
      if (timeOfDay && g.time_of_day !== timeOfDay) return false;
      if (typeof minUpcomingEvents === 'number') {
        const num = typeof g.num_upcoming_events === 'number' ? g.num_upcoming_events : 0;
        if (num < minUpcomingEvents) return false;
      }
      return true;
    });

    const savedResources = this._getFromStorage('saved_resources', []);

    const results = groups.map((g) => {
      const cost_label = g.cost_type === 'free' ? 'Free' : g.cost_type || '';
      let child_friendliness_label = '';
      if (g.child_friendliness === 'children_welcome') child_friendliness_label = 'Children welcome';
      else if (g.child_friendliness === 'adults_only') child_friendliness_label = 'Adults only';
      else if (g.child_friendliness === 'babies_only') child_friendliness_label = 'Babies only';
      else if (g.child_friendliness === 'unknown') child_friendliness_label = 'Unknown';

      const count = typeof g.num_upcoming_events === 'number' ? g.num_upcoming_events : 0;
      const upcoming_events_count_label = count + ' upcoming event' + (count === 1 ? '' : 's');

      const is_bookmarked = savedResources.some(
        (sr) =>
          sr.resource_type === 'support_group' &&
          sr.resource_id === g.id &&
          (sr.save_category === 'bookmarked_group' || sr.save_category === 'saved_resource')
      );

      return {
        group: g,
        cost_label,
        child_friendliness_label,
        upcoming_events_count_label,
        is_bookmarked
      };
    });

    return { results, total_count: results.length };
  }

  getSupportGroupDetails(supportGroupId) {
    const groups = this._getFromStorage('support_groups', []);
    return groups.find((g) => g.id === supportGroupId) || null;
  }

  bookmarkSupportGroup(supportGroupId, notes) {
    return this.addResourceToFavorites('support_group', supportGroupId, 'bookmarked_group', notes);
  }

  /* Hotlines */

  getHotlineFilterOptions() {
    const issue_types = [
      { value: 'all_issues', label: 'All issues' },
      { value: 'teen_mental_health', label: 'Teen mental health' },
      { value: 'youth_counseling', label: 'Youth counseling' },
      { value: 'general_mental_health', label: 'General mental health' },
      { value: 'domestic_violence', label: 'Domestic violence' },
      { value: 'substance_use', label: 'Substance use' },
      { value: 'parenting_support', label: 'Parenting support' },
      { value: 'other', label: 'Other' }
    ];

    const urgency_levels = [
      { value: 'non_emergency_support', label: 'Non-emergency support' },
      {
        value: 'immediate_life_threatening_emergency',
        label: 'Immediate life-threatening emergency'
      }
    ];

    const contact_methods = [
      { value: 'phone', label: 'Phone' },
      { value: 'phone_chat', label: 'Phone + chat' },
      { value: 'chat', label: 'Chat' },
      { value: 'text', label: 'Text' },
      { value: 'email', label: 'Email' },
      { value: 'online_form', label: 'Online form' }
    ];

    return { issue_types, urgency_levels, contact_methods };
  }

  searchHotlines(issueType, urgencyLevel, requireAvailableAfter18, contactMethods) {
    let hotlines = this._getFromStorage('hotlines', []);
    const cmFilter = Array.isArray(contactMethods) && contactMethods.length > 0 ? contactMethods : null;

    hotlines = hotlines.filter((h) => {
      if (issueType && issueType !== 'all_issues') {
        let allowedTypes = [issueType, 'all_issues'];
        if (issueType === 'teen_mental_health' || issueType === 'youth_counseling') {
          allowedTypes = ['teen_mental_health', 'youth_counseling', 'all_issues'];
        }
        if (allowedTypes.indexOf(h.issue_type) === -1) return false;
      }

      if (urgencyLevel && h.urgency_level !== urgencyLevel) return false;

      if (requireAvailableAfter18) {
        const available = h.available_after_18 === true || h.is_24_7 === true;
        if (!available) return false;
      }

      if (cmFilter) {
        if (!Array.isArray(h.contact_methods)) return false;
        const hasAny = h.contact_methods.some((cm) => cmFilter.indexOf(cm) !== -1);
        if (!hasAny) return false;
      }

      return true;
    });

    const cardItems = this._getFromStorage('emergency_card_items', []);

    const results = hotlines.map((h) => {
      const hours_label = h.hours_description || (h.is_24_7 ? '24/7' : '');
      let contact_methods_label = '';
      if (Array.isArray(h.contact_methods)) {
        const labels = h.contact_methods.map((cm) => {
          if (cm === 'phone') return 'Phone';
          if (cm === 'phone_chat') return 'Phone + chat';
          if (cm === 'chat') return 'Chat';
          if (cm === 'text') return 'Text';
          if (cm === 'email') return 'Email';
          if (cm === 'online_form') return 'Online form';
          return cm;
        });
        contact_methods_label = labels.join(', ');
      }

      const chat_available = Array.isArray(h.contact_methods)
        ? h.contact_methods.indexOf('phone_chat') !== -1 ||
          h.contact_methods.indexOf('chat') !== -1
        : false;

      const is_in_emergency_card = cardItems.some(
        (item) => item.item_type === 'hotline' && item.reference_id === h.id
      );

      return {
        hotline: h,
        hours_label,
        contact_methods_label,
        chat_available,
        is_in_emergency_card
      };
    });

    return { results, total_count: results.length };
  }

  /* Emergency card higher-level getters are above */

  /* Symptom checker */

  runChildSymptomCheck(
    ageYears,
    primarySymptom,
    additionalSymptoms,
    temperature,
    temperatureUnit,
    severityAnswers
  ) {
    const now = new Date().toISOString();

    const triage = this._runSymptomLogicEngine({
      ageYears,
      primarySymptom,
      additionalSymptoms,
      temperature,
      severityAnswers
    });

    const allowedAdditional = [
      'mild_cough',
      'severe_cough',
      'runny_nose',
      'sore_throat',
      'other'
    ];

    const session = {
      id: this._generateId('symptom'),
      patient_type: 'child',
      age_years: ageYears,
      primary_symptom: primarySymptom,
      additional_symptoms: Array.isArray(additionalSymptoms) ? additionalSymptoms : [],
      additional_symptom_options: allowedAdditional,
      temperature: typeof temperature === 'number' ? temperature : null,
      temperature_unit: temperatureUnit === 'c' ? 'c' : 'f',
      severity_answers: Array.isArray(severityAnswers) ? severityAnswers : [],
      recommended_level_of_care: triage.recommended_level_of_care,
      recommended_resource_type: triage.recommended_resource_type,
      recommended_resource_id: triage.recommended_resource_id,
      completed: true,
      created_at: now,
      updated_at: now
    };

    const sessions = this._getFromStorage('symptom_sessions', []);
    sessions.push(session);
    this._saveToStorage('symptom_sessions', sessions);

    return session;
  }

  /* Local resources / parks */

  getLocalResourceFilterOptions() {
    const categories = [
      { value: 'parks_playgrounds', label: 'Parks & playgrounds' },
      { value: 'community_centers', label: 'Community centers' },
      { value: 'libraries', label: 'Libraries' },
      { value: 'shelters', label: 'Shelters' },
      { value: 'other', label: 'Other' }
    ];

    const amenity_options = [
      { key: 'fenced_playground', label: 'Fenced playground' },
      { key: 'restrooms_available', label: 'Restrooms available' }
    ];

    const sort_options = [
      { value: 'distance', label: 'Distance - nearest first' },
      { value: 'name', label: 'Name A-Z' }
    ];

    return { categories, amenity_options, sort_options };
  }

  searchLocalResources(
    categoryId,
    zip,
    maxDistanceMiles,
    requireFencedPlayground,
    requireRestrooms,
    sortBy
  ) {
    let resources = this._getFromStorage('local_resources', []);

    resources = resources.filter((r) => {
      if (categoryId && r.category_id !== categoryId) return false;
      if (zip && r.zip && r.zip !== zip) return false;
      if (
        maxDistanceMiles &&
        typeof r.distance_miles === 'number' &&
        r.distance_miles > maxDistanceMiles
      ) {
        return false;
      }
      if (requireFencedPlayground && !r.has_fenced_playground) return false;
      if (requireRestrooms && !r.has_restrooms) return false;
      return true;
    });

    const sort = sortBy || 'distance';
    resources.sort((a, b) => {
      if (sort === 'name') {
        const na = (a.name || '').toLowerCase();
        const nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      }
      const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
      const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
      return da - db;
    });

    const meetupSpots = this._getFromStorage('meetup_spots', []);

    const results = resources.map((r) => {
      const distanceInfo = this._computeDistanceAndLabels(r);
      const amenities = [];
      if (r.has_fenced_playground) amenities.push('Fenced playground');
      if (r.has_restrooms) amenities.push('Restrooms');
      if (Array.isArray(r.other_amenities)) {
        amenities.push.apply(amenities, r.other_amenities);
      }
      const amenities_label = amenities.join(', ');
      const is_meetup_spot = meetupSpots.some(
        (spot) => spot.resource_type === 'local_resource' && spot.resource_id === r.id
      );
      return {
        resource: r,
        distance_label: distanceInfo.distanceLabel,
        amenities_label,
        is_meetup_spot
      };
    });

    return { results, total_count: results.length };
  }

  getMeetupSpotsForEmergencyPlan() {
    const plan = this._getOrCreateEmergencyPlan();
    const meetupSpots = this._getFromStorage('meetup_spots', []);
    const localResources = this._getFromStorage('local_resources', []);

    const ids = Array.isArray(plan.meetup_spot_ids) ? plan.meetup_spot_ids : [];
    const results = ids
      .map((id) => {
        const meetup_spot = meetupSpots.find((s) => s.id === id) || null;
        if (!meetup_spot) return null;
        let local_resource = null;
        if (meetup_spot.resource_type === 'local_resource') {
          local_resource = localResources.find((lr) => lr.id === meetup_spot.resource_id) || null;
        }
        return { meetup_spot, local_resource };
      })
      .filter((x) => x !== null);

    return results;
  }

  /* Tools overview */

  getToolsOverview() {
    const tools = [];
    const plans = this._getFromStorage('emergency_plans', []);
    const cards = this._getFromStorage('emergency_cards', []);
    const sheets = this._getFromStorage('babysitter_sheets', []);

    if (plans.length > 0) {
      const plan = plans[0];
      tools.push({
        tool_key: 'emergency_plan',
        display_name: plan.name || 'Family Emergency Plan',
        description: 'Family emergency contact and meet-up plan.',
        last_updated_at: plan.updated_at || plan.created_at || null
      });
    }

    if (cards.length > 0) {
      const card = cards[0];
      tools.push({
        tool_key: 'emergency_card',
        display_name: card.name || 'Emergency Card',
        description: 'Central list of emergency numbers and services.',
        last_updated_at: card.updated_at || card.created_at || null
      });
    }

    if (sheets.length > 0) {
      const sheet = sheets[0];
      tools.push({
        tool_key: 'babysitter_sheet',
        display_name: sheet.name || 'Babysitter Info Sheet',
        description: 'Key info for caregivers and babysitters.',
        last_updated_at: sheet.updated_at || sheet.created_at || null
      });
    }

    const planning_checklists = [];

    return { tools, planning_checklists };
  }

  /* Babysitter info sheet */

  getBabysitterInfoSheetForEditing() {
    const sheet = this._getOrCreateBabysitterSheet();
    const nearest_er = sheet.nearest_er_id
      ? this._resolveResource('care_facility', sheet.nearest_er_id)
      : null;
    return { ...sheet, nearest_er };
  }

  getNearbyEmergencyRoomsForSheet(zip, maxDistanceMiles) {
    const facilities = this._getFromStorage('care_facilities', []);
    const maxDist = typeof maxDistanceMiles === 'number' ? maxDistanceMiles : 10;

    const filtered = facilities.filter((f) => {
      if (
        !(
          f.care_category === 'emergency_care' ||
          f.care_type === 'pediatric_er' ||
          f.care_type === 'adult_er' ||
          f.care_type === 'general_er'
        )
      ) {
        return false;
      }
      if (zip && f.zip && f.zip !== zip) return false;
      if (
        maxDist &&
        typeof f.distance_miles === 'number' &&
        f.distance_miles > maxDist
      ) {
        return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
      const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
      return da - db;
    });

    return filtered;
  }

  saveBabysitterInfoSheetAndGenerateLink(sheetInput) {
    const sheets = this._getFromStorage('babysitter_sheets', []);
    let sheet = sheets.length > 0 ? sheets[0] : this._getOrCreateBabysitterSheet();
    const now = new Date().toISOString();

    sheet = {
      ...sheet,
      name: sheetInput.name || sheet.name || 'Babysitter Info',
      child_name: sheetInput.child_name || sheet.child_name || '',
      child_age_years:
        typeof sheetInput.child_age_years === 'number'
          ? sheetInput.child_age_years
          : sheet.child_age_years,
      child_allergies:
        typeof sheetInput.child_allergies === 'string'
          ? sheetInput.child_allergies
          : sheet.child_allergies,
      emergency_contacts: Array.isArray(sheetInput.emergency_contacts)
        ? sheetInput.emergency_contacts
        : sheet.emergency_contacts || [],
      pediatrician_name:
        typeof sheetInput.pediatrician_name === 'string'
          ? sheetInput.pediatrician_name
          : sheet.pediatrician_name,
      pediatrician_phone:
        typeof sheetInput.pediatrician_phone === 'string'
          ? sheetInput.pediatrician_phone
          : sheet.pediatrician_phone,
      pediatric_clinic_name:
        typeof sheetInput.pediatric_clinic_name === 'string'
          ? sheetInput.pediatric_clinic_name
          : sheet.pediatric_clinic_name,
      nearest_er_id:
        typeof sheetInput.nearest_er_id === 'string'
          ? sheetInput.nearest_er_id
          : sheet.nearest_er_id,
      bedtime:
        typeof sheetInput.bedtime === 'string' ? sheetInput.bedtime : sheet.bedtime,
      routine_notes:
        typeof sheetInput.routine_notes === 'string'
          ? sheetInput.routine_notes
          : sheet.routine_notes,
      updated_at: now
    };

    if (!sheet.shareable_link_token) {
      sheet.shareable_link_token = this._generateId('bs_link');
    }
    sheet.shareable_url = 'https://example.com/babysitter/' + sheet.shareable_link_token;
    sheet.last_shared_at = now;

    this._saveToStorage('babysitter_sheets', [sheet]);

    const nearest_er = sheet.nearest_er_id
      ? this._resolveResource('care_facility', sheet.nearest_er_id)
      : null;

    return { ...sheet, nearest_er };
  }

  /* Profile summary */

  getProfileSummary() {
    const emergencyPlans = this._getFromStorage('emergency_plans', []);
    const emergency_plan = emergencyPlans.length > 0 ? emergencyPlans[0] : null;

    const emergencyCards = this._getFromStorage('emergency_cards', []);
    const emergency_card = emergencyCards.length > 0 ? emergencyCards[0] : null;

    const alertSubscriptions = this._getFromStorage('alert_subscriptions', []);
    const alert_subscription = alertSubscriptions.length > 0 ? alertSubscriptions[0] : null;

    const babysitterSheets = this._getFromStorage('babysitter_sheets', []);
    const babysitter_sheets = babysitterSheets.map((sheet) => ({
      ...sheet,
      nearest_er: sheet.nearest_er_id
        ? this._resolveResource('care_facility', sheet.nearest_er_id)
        : null
    }));

    const favorite_resources_raw = this._getFromStorage('saved_resources', []);
    const favorite_resources = favorite_resources_raw.map((sr) => ({
      ...sr,
      resource: this._resolveResource(sr.resource_type, sr.resource_id)
    }));

    const meetup_spots = this._getFromStorage('meetup_spots', []);

    const emergency_contacts_raw = this._getFromStorage('emergency_contacts', []);
    const emergency_contacts = emergency_contacts_raw.map((c) => ({
      ...c,
      resource: this._resolveResource(c.resource_type, c.resource_id)
    }));

    const quick_dial_entries_raw = this._getFromStorage('quick_dial_entries', []);
    const quick_dial_entries = quick_dial_entries_raw.map((q) => ({
      ...q,
      resource: this._resolveResource(q.resource_type, q.resource_id)
    }));

    return {
      emergency_plan,
      emergency_card,
      alert_subscription,
      babysitter_sheets,
      favorite_resources,
      meetup_spots,
      emergency_contacts,
      quick_dial_entries
    };
  }

  /* Help & policy content */

  getHelpAndPolicyContent() {
    // Use any stored content if present; otherwise return empty defaults without mocking
    const stored = this._getFromStorage('help_and_policy_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }
    return {
      about_content: '',
      faq_items: [],
      privacy_policy: '',
      terms_of_use: '',
      accessibility_statement: '',
      contact_information: ''
    };
  }

  submitSupportContactRequest(name, email, topic, message) {
    if (!message) {
      return { success: false, message: 'Message is required.' };
    }
    const requests = this._getFromStorage('support_contact_requests', []);
    const now = new Date().toISOString();
    const req = {
      id: this._generateId('support'),
      name: name || '',
      email: email || '',
      topic: topic || '',
      message,
      submitted_at: now
    };
    requests.push(req);
    this._saveToStorage('support_contact_requests', requests);
    return { success: true, message: 'Support request submitted.' };
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
