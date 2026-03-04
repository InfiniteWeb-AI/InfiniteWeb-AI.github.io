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

  // --------------------- Storage Helpers ---------------------

  _initStorage() {
    const tables = [
      'appointment_slots',
      'appointments',
      'treatment_categories',
      'treatments',
      'consultation_requests',
      'condition_categories',
      'conditions',
      'care_plan_items',
      'insurance_providers',
      'insurance_plans',
      'procedures',
      'procedure_cost_estimates',
      'locations',
      'doctors',
      'articles',
      'newsletter_subscriptions',
      'symptom_checker_sessions',
      'pre_visit_instructions',
      'pre_visit_checklists',
      'checklist_items'
    ];

    tables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singleton/structured objects
    if (!localStorage.getItem('insurance_billing_content')) {
      localStorage.setItem(
        'insurance_billing_content',
        JSON.stringify({
          accepted_insurance_summary: '',
          billing_overview: '',
          payment_options: []
        })
      );
    }

    if (!localStorage.getItem('patient_resources_overview')) {
      localStorage.setItem(
        'patient_resources_overview',
        JSON.stringify({ sections: [] })
      );
    }

    if (!localStorage.getItem('before_visit_procedure_types')) {
      localStorage.setItem(
        'before_visit_procedure_types',
        JSON.stringify([
          {
            id: 'before_visit_minor_surgical',
            name: 'Minor surgical procedures',
            slug: 'minor_surgical_procedures',
            description:
              'Common minor skin surgery procedures such as mole removal.'
          }
        ])
      );
    }

    if (!localStorage.getItem('before_visit_procedure_type_mappings')) {
      // { [procedureTypeSlug]: [procedureId, ...] }
      localStorage.setItem(
        'before_visit_procedure_type_mappings',
        JSON.stringify({
          minor_surgical_procedures: ['mole_removal_minor_surgical']
        })
      );
    }

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

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // --------------------- Helper Functions ---------------------

  // Internal helper to load or create the Care Plan storage
  _getOrCreateCarePlanStore() {
    const items = this._getFromStorage('care_plan_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('care_plan_items', []);
      return [];
    }
    return items;
  }

  // Filter appointment slots by time-of-day filter
  _filterAppointmentSlotsByTimeOfDay(slots, timeOfDayFilter) {
    if (!timeOfDayFilter || timeOfDayFilter === 'any') return slots;

    return slots.filter((slot) => {
      if (!slot.start_datetime) return false;
      const d = new Date(slot.start_datetime);
      if (Number.isNaN(d.getTime())) return false;
      const hour = d.getHours(); // 0-23

      switch (timeOfDayFilter) {
        case 'morning':
          return hour >= 5 && hour < 12;
        case 'afternoon':
          return hour >= 12 && hour < 17;
        case 'evening':
          return hour >= 17 && hour < 22;
        case 'after_3pm':
          return hour >= 15;
        default:
          return true;
      }
    });
  }

  // Helper to match requested patient age group to provider/slot age groups
  _ageGroupMatches(requestedGroup, candidateGroup) {
    if (!requestedGroup || !candidateGroup) return true;
    if (requestedGroup === candidateGroup) return true;

    const map = {
      child_0_10: ['children_2_10', 'infants_0_1'],
      children_2_10: ['child_0_10', 'infants_0_1'],
      infants_0_1: ['child_0_10', 'children_2_10'],
      teen_13_17: ['teens_11_17'],
      teens_11_17: ['teen_13_17'],
      adult_18_64: ['adults_18_64'],
      adults_18_64: ['adult_18_64'],
      senior_65_plus: ['seniors_65_plus'],
      seniors_65_plus: ['senior_65_plus']
    };

    const directMatches = map[requestedGroup] || [];
    if (directMatches.includes(candidateGroup)) return true;

    const inverseMatches = map[candidateGroup] || [];
    if (inverseMatches.includes(requestedGroup)) return true;

    return false;
  }

  // Compute distance between a ZIP and a location (miles)
  _computeDistanceFromZip(zipCode, location) {
    if (!zipCode || !location) return Infinity;
    if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
      return Infinity;
    }

    // Minimal ZIP -> lat/lon map for basic behavior
    const zipCoords = {
      '94105': { lat: 37.7898, lon: -122.3942 },
      '10001': { lat: 40.7506, lon: -73.9971 }
    };

    const origin = zipCoords[zipCode];
    if (!origin) return Infinity;

    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles

    const dLat = toRad(location.latitude - origin.lat);
    const dLon = toRad(location.longitude - origin.lon);
    const lat1 = toRad(origin.lat);
    const lat2 = toRad(location.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Persist SymptomCheckerSession (create or update)
  _persistSymptomCheckerSession(session) {
    const sessions = this._getFromStorage('symptom_checker_sessions', []);
    if (session.id) {
      const idx = sessions.findIndex((s) => s.id === session.id);
      if (idx !== -1) {
        sessions[idx] = { ...sessions[idx], ...session };
        this._saveToStorage('symptom_checker_sessions', sessions);
        return sessions[idx];
      }
    }
    const newSession = {
      id: this._generateId('symptom_session'),
      age_category: session.age_category,
      age: session.age,
      body_area: session.body_area,
      symptom_description: session.symptom_description,
      severity: session.severity,
      suggested_condition_ids: session.suggested_condition_ids || [],
      selected_condition_id: session.selected_condition_id || null,
      created_at: this._nowIso()
    };
    sessions.push(newSession);
    this._saveToStorage('symptom_checker_sessions', sessions);
    return newSession;
  }

  // Create or update newsletter subscription record
  _createNewsletterSubscriptionRecord(email, zipCode, topic, frequency, consentGiven) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);
    const now = this._nowIso();

    const existingIndex = subscriptions.findIndex(
      (s) => s.email === email && s.topic === topic && s.frequency === frequency
    );

    if (existingIndex !== -1) {
      const existing = subscriptions[existingIndex];
      const updated = {
        ...existing,
        zip_code: zipCode,
        consent_given: !!consentGiven,
        status: consentGiven ? 'active' : 'unsubscribed',
        subscribed_at: consentGiven ? now : existing.subscribed_at || now
      };
      subscriptions[existingIndex] = updated;
      this._saveToStorage('newsletter_subscriptions', subscriptions);
      return updated;
    }

    const newRecord = {
      id: this._generateId('newsletter_sub'),
      email,
      zip_code: zipCode,
      topic,
      frequency,
      consent_given: !!consentGiven,
      subscribed_at: now,
      status: consentGiven ? 'active' : 'unsubscribed'
    };
    subscriptions.push(newRecord);
    this._saveToStorage('newsletter_subscriptions', subscriptions);
    return newRecord;
  }

  // Create or update CarePlanItem favorites (doctor, article, checklist)
  _createOrUpdateCarePlanFavorite(itemType, targetId, notes) {
    const carePlanItems = this._getOrCreateCarePlanStore();
    const now = this._nowIso();

    const existingIndex = carePlanItems.findIndex(
      (i) => i.item_type === itemType && i.target_id === targetId
    );

    if (existingIndex !== -1) {
      const existing = carePlanItems[existingIndex];
      const updated = {
        ...existing,
        notes: notes !== undefined ? notes : existing.notes
      };
      carePlanItems[existingIndex] = updated;
      this._saveToStorage('care_plan_items', carePlanItems);
      return { item: updated, alreadyFavorited: true };
    }

    const newItem = {
      id: this._generateId('care_item'),
      item_type: itemType,
      target_id: targetId,
      reason: null,
      added_at: now,
      notes: notes || null
    };
    carePlanItems.push(newItem);
    this._saveToStorage('care_plan_items', carePlanItems);
    return { item: newItem, alreadyFavorited: false };
  }

  // --------------------- Interface Implementations ---------------------

  // getHomepageFeaturedContent
  getHomepageFeaturedContent() {
    const treatments = this._getFromStorage('treatments', []);
    const treatmentCategories = this._getFromStorage('treatment_categories', []);
    const conditions = this._getFromStorage('conditions', []);
    const conditionCategories = this._getFromStorage('condition_categories', []);

    const featuredTreatments = treatments
      .filter((t) => t.status === 'active')
      .slice(0, 5)
      .map((t) => {
        const category = treatmentCategories.find((c) => c.id === t.category_id) || null;
        return {
          treatment_id: t.id,
          name: t.name,
          is_cosmetic: !!t.is_cosmetic,
          session_length_minutes: t.session_length_minutes,
          base_price: t.base_price,
          category_name: category ? category.name : null,
          detail_page_slug: t.detail_page_slug || null,
          // foreign key resolution (extra)
          category
        };
      });

    const featuredConditions = conditions.slice(0, 5).map((c) => {
      const category = conditionCategories.find((cc) => cc.id === c.category_id) || null;
      return {
        condition_id: c.id,
        name: c.name,
        category_name: category ? category.name : null,
        summary: c.summary || '',
        slug: c.slug,
        // foreign key resolution (extra)
        category
      };
    });

    return {
      featured_treatments: featuredTreatments,
      featured_conditions: featuredConditions
    };
  }

  // getAppointmentBookingOptions
  getAppointmentBookingOptions() {
    return {
      visit_types: [
        { value: 'new_patient', label: 'New patient' },
        { value: 'existing_patient', label: 'Existing patient' }
      ],
      reasons_for_visit: [
        { value: 'acne_and_breakouts', label: 'Acne and breakouts' },
        { value: 'full_body_skin_cancer_screening', label: 'Full-body skin cancer screening' },
        { value: 'mole_removal', label: 'Mole removal' },
        { value: 'other', label: 'Other concern' }
      ],
      patient_age_groups: [
        { value: 'child_0_10', label: '0–10 (Child)', age_min: 0, age_max: 10 },
        { value: 'teen_13_17', label: '13–17 (Teen)', age_min: 13, age_max: 17 },
        { value: 'adult_18_64', label: '18–64 (Adult)', age_min: 18, age_max: 64 },
        { value: 'senior_65_plus', label: '65+ (Senior)', age_min: 65, age_max: 120 }
      ],
      date_range_presets: [
        { id: 'next_7_days', label: 'Next 7 days', days_from_today: 7 },
        { id: 'next_14_days', label: 'Next 14 days', days_from_today: 14 }
      ],
      time_of_day_filters: [
        { value: 'any', label: 'Any time' },
        { value: 'morning', label: 'Morning' },
        { value: 'afternoon', label: 'Afternoon' },
        { value: 'evening', label: 'Evening' },
        { value: 'after_3pm', label: 'After 3:00 PM' }
      ]
    };
  }

  // searchAppointmentSlots(visitType, reasonForVisit, patientAgeGroup, dateRangeStart, dateRangeEnd, timeOfDayFilter = 'any', locationId)
  searchAppointmentSlots(visitType, reasonForVisit, patientAgeGroup, dateRangeStart, dateRangeEnd, timeOfDayFilter, locationId) {
    const slots = this._getFromStorage('appointment_slots', []);
    const doctors = this._getFromStorage('doctors', []);
    const locations = this._getFromStorage('locations', []);

    const startDate = new Date(dateRangeStart + 'T00:00:00');
    const endDate = new Date(dateRangeEnd + 'T23:59:59');

    let filtered = slots.filter((slot) => {
      if (slot.visit_type !== visitType) return false;

      if (Array.isArray(slot.allowed_reasons_for_visit) && slot.allowed_reasons_for_visit.length > 0) {
        if (!slot.allowed_reasons_for_visit.includes(reasonForVisit)) return false;
      }

      if (Array.isArray(slot.allowed_age_groups) && slot.allowed_age_groups.length > 0) {
        const matchesAgeGroup = slot.allowed_age_groups.some((g) =>
          this._ageGroupMatches(patientAgeGroup, g)
        );
        if (!matchesAgeGroup) return false;
      }

      const slotDate = new Date(slot.start_datetime);
      if (Number.isNaN(slotDate.getTime())) return false;
      if (slotDate < startDate || slotDate > endDate) return false;

      if (locationId && slot.location_id !== locationId) return false;

      return true;
    });

    filtered = this._filterAppointmentSlotsByTimeOfDay(filtered, timeOfDayFilter || 'any');

    return filtered.map((slot) => {
      const provider = doctors.find((d) => d.id === slot.provider_id) || null;
      const location = locations.find((l) => l.id === slot.location_id) || null;
      return {
        slot_id: slot.id,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        provider_id: slot.provider_id,
        provider_name: provider ? provider.full_name : null,
        location_id: slot.location_id,
        location_name: location ? location.name : null,
        is_virtual: !!slot.is_virtual,
        visit_type: slot.visit_type,
        allowed_reasons_for_visit: slot.allowed_reasons_for_visit || [],
        allowed_age_groups: slot.allowed_age_groups || [],
        // foreign key resolution (extra)
        provider,
        location
      };
    });
  }

  // getAppointmentSlotDetails(appointmentSlotId)
  getAppointmentSlotDetails(appointmentSlotId) {
    const slots = this._getFromStorage('appointment_slots', []);
    const doctors = this._getFromStorage('doctors', []);
    const locations = this._getFromStorage('locations', []);

    const slot = slots.find((s) => s.id === appointmentSlotId);
    if (!slot) return null;

    const provider = doctors.find((d) => d.id === slot.provider_id) || null;
    const location = locations.find((l) => l.id === slot.location_id) || null;

    return {
      slot_id: slot.id,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      visit_type: slot.visit_type,
      reason_for_visit: (slot.allowed_reasons_for_visit && slot.allowed_reasons_for_visit[0]) || null,
      patient_age_group: (slot.allowed_age_groups && slot.allowed_age_groups[0]) || null,
      provider_id: slot.provider_id,
      provider_name: provider ? provider.full_name : null,
      provider_credentials: provider ? provider.credentials || null : null,
      location_id: slot.location_id,
      location_name: location ? location.name : null,
      location_address_line1: location ? location.address_line1 : null,
      location_city: location ? location.city : null,
      location_state: location ? location.state : null,
      location_zip: location ? location.zip : null,
      is_virtual: !!slot.is_virtual,
      // extra resolved
      provider,
      location
    };
  }

  // confirmAppointment(appointmentSlotId, visitType, reasonForVisit, patientAgeGroup, patientName)
  confirmAppointment(appointmentSlotId, visitType, reasonForVisit, patientAgeGroup, patientName) {
    const slots = this._getFromStorage('appointment_slots', []);
    const doctors = this._getFromStorage('doctors', []);
    const locations = this._getFromStorage('locations', []);
    const appointments = this._getFromStorage('appointments', []);

    const slot = slots.find((s) => s.id === appointmentSlotId);
    if (!slot) {
      return { success: false, message: 'Appointment slot not found', appointment: null };
    }

    const now = this._nowIso();
    const appointmentId = this._generateId('appt');

    const appointmentRecord = {
      id: appointmentId,
      appointment_slot_id: slot.id,
      visit_type: visitType,
      reason_for_visit: reasonForVisit,
      patient_age_group: patientAgeGroup,
      patient_name: patientName || null,
      status: 'confirmed',
      created_at: now,
      confirmed_at: now
    };

    appointments.push(appointmentRecord);
    this._saveToStorage('appointments', appointments);

    const provider = doctors.find((d) => d.id === slot.provider_id) || null;
    const location = locations.find((l) => l.id === slot.location_id) || null;

    const appointmentView = {
      id: appointmentRecord.id,
      appointment_slot_id: appointmentRecord.appointment_slot_id,
      visit_type: appointmentRecord.visit_type,
      reason_for_visit: appointmentRecord.reason_for_visit,
      patient_age_group: appointmentRecord.patient_age_group,
      patient_name: appointmentRecord.patient_name,
      status: appointmentRecord.status,
      created_at: appointmentRecord.created_at,
      confirmed_at: appointmentRecord.confirmed_at,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      provider_name: provider ? provider.full_name : null,
      location_name: location ? location.name : null,
      location_address_line1: location ? location.address_line1 : null,
      location_city: location ? location.city : null,
      location_state: location ? location.state : null,
      location_zip: location ? location.zip : null
    };

    return {
      success: true,
      message: 'Appointment confirmed',
      appointment: appointmentView
    };
  }

  // getTreatmentCategories
  getTreatmentCategories() {
    const categories = this._getFromStorage('treatment_categories', []);
    return categories;
  }

  // getTreatmentFilterOptions(categorySlug)
  getTreatmentFilterOptions(categorySlug) {
    const treatments = this._getFromStorage('treatments', []);
    const categories = this._getFromStorage('treatment_categories', []);

    let filteredTreatments = treatments;
    if (categorySlug) {
      const categoryIds = categories
        .filter((c) => c.slug === categorySlug)
        .map((c) => c.id);
      filteredTreatments = filteredTreatments.filter((t) => categoryIds.includes(t.category_id));
    }

    const sessionLengthsSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    filteredTreatments.forEach((t) => {
      if (typeof t.session_length_minutes === 'number') {
        sessionLengthsSet.add(t.session_length_minutes);
      }
      if (typeof t.base_price === 'number') {
        if (minPrice === null || t.base_price < minPrice) minPrice = t.base_price;
        if (maxPrice === null || t.base_price > maxPrice) maxPrice = t.base_price;
      }
    });

    const session_length_options = Array.from(sessionLengthsSet)
      .sort((a, b) => a - b)
      .map((val) => ({ value: val, label: `${val} minutes` }));

    return {
      session_length_options,
      price_filter: {
        min_price: minPrice !== null ? minPrice : 0,
        max_price: maxPrice !== null ? maxPrice : 0,
        step: 25,
        currency: 'usd'
      }
    };
  }

  // searchTreatments(categoryId, isCosmetic, sessionLengthMinutes, maxPrice, sortBy = 'price_asc')
  searchTreatments(categoryId, isCosmetic, sessionLengthMinutes, maxPrice, sortBy) {
    const treatments = this._getFromStorage('treatments', []);
    const categories = this._getFromStorage('treatment_categories', []);
    let results = treatments.filter((t) => t.status === 'active');

    if (categoryId) {
      results = results.filter((t) => t.category_id === categoryId);
    }
    if (typeof isCosmetic === 'boolean') {
      results = results.filter((t) => !!t.is_cosmetic === isCosmetic);
    }
    if (typeof sessionLengthMinutes === 'number') {
      results = results.filter((t) => t.session_length_minutes === sessionLengthMinutes);
    }
    if (typeof maxPrice === 'number') {
      results = results.filter((t) => typeof t.base_price === 'number' && t.base_price <= maxPrice);
    }

    const sortKey = sortBy || 'price_asc';
    results.sort((a, b) => {
      switch (sortKey) {
        case 'price_desc':
          return (b.base_price || 0) - (a.base_price || 0);
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'price_asc':
        default:
          return (a.base_price || 0) - (b.base_price || 0);
      }
    });

    return results.map((t) => {
      const category = categories.find((c) => c.id === t.category_id) || null;
      return {
        treatment_id: t.id,
        name: t.name,
        is_cosmetic: !!t.is_cosmetic,
        session_length_minutes: t.session_length_minutes,
        base_price: t.base_price,
        currency: 'usd',
        category_name: category ? category.name : null,
        detail_page_slug: t.detail_page_slug || null,
        // extra resolved foreign key
        category
      };
    });
  }

  // getTreatmentDetail(treatmentId)
  getTreatmentDetail(treatmentId) {
    const treatments = this._getFromStorage('treatments', []);
    const categories = this._getFromStorage('treatment_categories', []);
    const t = treatments.find((tr) => tr.id === treatmentId);
    if (!t) return null;
    const category = categories.find((c) => c.id === t.category_id) || null;

    return {
      id: t.id,
      name: t.name,
      category_id: t.category_id,
      category_name: category ? category.name : null,
      is_cosmetic: !!t.is_cosmetic,
      session_length_minutes: t.session_length_minutes,
      base_price: t.base_price,
      currency: 'usd',
      description: t.description || '',
      status: t.status,
      detail_page_slug: t.detail_page_slug || null,
      indications: t.indications || '',
      what_to_expect_during: t.what_to_expect_during || '',
      what_to_expect_after: t.what_to_expect_after || '',
      // extra resolved
      category
    };
  }

  // submitConsultationRequest(treatmentId, patientName, phone, preferredDate, notes)
  submitConsultationRequest(treatmentId, patientName, phone, preferredDate, notes) {
    const consultationRequests = this._getFromStorage('consultation_requests', []);
    const id = this._generateId('consult');
    const createdAt = this._nowIso();

    let preferredDateIso = null;
    if (preferredDate) {
      const d = new Date(preferredDate);
      if (!Number.isNaN(d.getTime())) {
        preferredDateIso = d.toISOString();
      }
    }

    const record = {
      id,
      treatment_id: treatmentId,
      patient_name: patientName,
      phone,
      preferred_date: preferredDateIso,
      notes: notes || null,
      created_at: createdAt,
      status: 'submitted'
    };

    consultationRequests.push(record);
    this._saveToStorage('consultation_requests', consultationRequests);

    return {
      success: true,
      consultation_request_id: id,
      status: 'submitted',
      message: 'Consultation request submitted'
    };
  }

  // getConditionCategories
  getConditionCategories() {
    const categories = this._getFromStorage('condition_categories', []);
    return categories;
  }

  // getConditionsByCategoryAndLetter(categorySlug, startsWithLetter)
  getConditionsByCategoryAndLetter(categorySlug, startsWithLetter) {
    const categories = this._getFromStorage('condition_categories', []);
    const conditions = this._getFromStorage('conditions', []);

    const category = categories.find((c) => c.slug === categorySlug);
    if (!category) return [];

    const letter = (startsWithLetter || '').toUpperCase();

    return conditions
      .filter((cond) => cond.category_id === category.id)
      .filter((cond) => (cond.name || '').toUpperCase().startsWith(letter))
      .map((cond) => ({
        id: cond.id,
        name: cond.name,
        slug: cond.slug,
        category_id: cond.category_id,
        category_name: category.name,
        summary: cond.summary || '',
        // extra resolved
        category
      }));
  }

  // getConditionDetail(conditionId)
  getConditionDetail(conditionId) {
    const categories = this._getFromStorage('condition_categories', []);
    const conditions = this._getFromStorage('conditions', []);

    const cond = conditions.find((c) => c.id === conditionId);
    if (!cond) return null;

    const category = categories.find((c) => c.id === cond.category_id) || null;

    return {
      id: cond.id,
      name: cond.name,
      slug: cond.slug,
      category_id: cond.category_id,
      category_name: category ? category.name : null,
      summary: cond.summary || '',
      overview: cond.overview || '',
      symptoms: cond.symptoms || '',
      treatment_options: cond.treatment_options || '',
      when_to_see_doctor: cond.when_to_see_doctor || '',
      // extra resolved
      category
    };
  }

  // addConditionToCarePlan(conditionId, reason, notes)
  addConditionToCarePlan(conditionId, reason, notes) {
    const conditions = this._getFromStorage('conditions', []);
    const carePlanItems = this._getOrCreateCarePlanStore();
    const condition = conditions.find((c) => c.id === conditionId);
    if (!condition) {
      return {
        success: false,
        care_plan_item_id: null,
        item: null,
        message: 'Condition not found'
      };
    }

    const now = this._nowIso();
    const id = this._generateId('care_item');
    const item = {
      id,
      item_type: 'condition',
      target_id: conditionId,
      reason: reason || null,
      added_at: now,
      notes: notes || null
    };
    carePlanItems.push(item);
    this._saveToStorage('care_plan_items', carePlanItems);

    return {
      success: true,
      care_plan_item_id: id,
      item: {
        id: item.id,
        item_type: item.item_type,
        target_id: item.target_id,
        reason: item.reason,
        added_at: item.added_at,
        notes: item.notes,
        condition_name: condition.name,
        condition_summary: condition.summary || ''
      },
      message: 'Condition added to care plan'
    };
  }

  // getMyCarePlan()
  getMyCarePlan() {
    const items = this._getOrCreateCarePlanStore();
    const conditions = this._getFromStorage('conditions', []);
    const doctors = this._getFromStorage('doctors', []);
    const locations = this._getFromStorage('locations', []);
    const articles = this._getFromStorage('articles', []);
    const checklists = this._getFromStorage('pre_visit_checklists', []);
    const procedures = this._getFromStorage('procedures', []);
    const conditionCategories = this._getFromStorage('condition_categories', []);

    const mapped = items.map((item) => {
      let label = '';
      let summary = '';
      const metadata = {
        condition_category_name: null,
        doctor_primary_specialty: null,
        doctor_primary_location_name: null,
        article_primary_condition_name: null,
        checklist_procedure_name: null
      };

      if (item.item_type === 'condition') {
        const cond = conditions.find((c) => c.id === item.target_id);
        if (cond) {
          label = cond.name;
          summary = cond.summary || '';
          const cat = conditionCategories.find((cc) => cc.id === cond.category_id);
          metadata.condition_category_name = cat ? cat.name : null;
        }
      } else if (item.item_type === 'doctor') {
        const doc = doctors.find((d) => d.id === item.target_id);
        if (doc) {
          label = doc.full_name;
          summary = doc.primary_specialty || '';
          metadata.doctor_primary_specialty = doc.primary_specialty || null;
          const loc = locations.find((l) => l.id === doc.primary_location_id);
          metadata.doctor_primary_location_name = loc ? loc.name : null;
        }
      } else if (item.item_type === 'article') {
        const art = articles.find((a) => a.id === item.target_id);
        if (art) {
          label = art.title;
          summary = art.summary || '';
          if (art.primary_condition_id) {
            const cond = conditions.find((c) => c.id === art.primary_condition_id);
            metadata.article_primary_condition_name = cond ? cond.name : null;
          }
        }
      } else if (item.item_type === 'checklist') {
        const checklist = checklists.find((c) => c.id === item.target_id);
        if (checklist) {
          label = checklist.title;
          const proc = procedures.find((p) => p.id === checklist.procedure_id);
          metadata.checklist_procedure_name = proc ? proc.name : null;
          summary = proc ? `${proc.name} pre-visit checklist` : '';
        }
      }

      return {
        id: item.id,
        item_type: item.item_type,
        target_id: item.target_id,
        label,
        summary,
        reason: item.reason,
        added_at: item.added_at,
        notes: item.notes,
        metadata
      };
    });

    return { items: mapped };
  }

  // updateCarePlanItem(carePlanItemId, reason, notes)
  updateCarePlanItem(carePlanItemId, reason, notes) {
    const carePlanItems = this._getOrCreateCarePlanStore();
    const idx = carePlanItems.findIndex((i) => i.id === carePlanItemId);
    if (idx === -1) {
      return { success: false, item: null, message: 'Care plan item not found' };
    }

    const existing = carePlanItems[idx];
    const updated = {
      ...existing,
      reason: reason !== undefined ? reason : existing.reason,
      notes: notes !== undefined ? notes : existing.notes,
      updated_at: this._nowIso()
    };
    carePlanItems[idx] = updated;
    this._saveToStorage('care_plan_items', carePlanItems);

    return {
      success: true,
      item: {
        id: updated.id,
        item_type: updated.item_type,
        target_id: updated.target_id,
        reason: updated.reason,
        notes: updated.notes,
        updated_at: updated.updated_at
      },
      message: 'Care plan item updated'
    };
  }

  // removeCarePlanItem(carePlanItemId)
  removeCarePlanItem(carePlanItemId) {
    const carePlanItems = this._getOrCreateCarePlanStore();
    const newItems = carePlanItems.filter((i) => i.id !== carePlanItemId);
    const removed = newItems.length !== carePlanItems.length;
    this._saveToStorage('care_plan_items', newItems);
    return {
      success: removed,
      message: removed ? 'Care plan item removed' : 'Care plan item not found'
    };
  }

  // getInsuranceBillingContent
  getInsuranceBillingContent() {
    const content = this._getFromStorage('insurance_billing_content', {
      accepted_insurance_summary: '',
      billing_overview: '',
      payment_options: []
    });
    return content;
  }

  // getInsuranceProviders
  getInsuranceProviders() {
    return this._getFromStorage('insurance_providers', []);
  }

  // getInsurancePlansByProvider(insuranceProviderId)
  getInsurancePlansByProvider(insuranceProviderId) {
    const providers = this._getFromStorage('insurance_providers', []);
    const plans = this._getFromStorage('insurance_plans', []);
    const provider = providers.find((p) => p.id === insuranceProviderId) || null;

    return plans
      .filter((plan) => plan.provider_id === insuranceProviderId)
      .map((plan) => ({
        ...plan,
        // foreign key resolution
        provider
      }));
  }

  // searchProcedures(query, type)
  searchProcedures(query, type) {
    const procedures = this._getFromStorage('procedures', []);
    const conditions = this._getFromStorage('conditions', []);
    const q = (query || '').toLowerCase();

    let results = procedures.filter((p) => {
      if (type && p.type !== type) return false;
      if (!q) return true;
      const text = ((p.name || '') + ' ' + (p.slug || '')).toLowerCase();
      return text.includes(q);
    });

    // foreign key resolution for related_condition_ids
    results = results.map((p) => {
      let related_conditions = [];
      if (Array.isArray(p.related_condition_ids)) {
        related_conditions = p.related_condition_ids
          .map((id) => conditions.find((c) => c.id === id))
          .filter(Boolean);
      }
      return {
        ...p,
        related_conditions
      };
    });

    return results;
  }

  // getProcedureCostEstimates(insurancePlanId, procedureId, locationScope = 'all_locations', maxEstimatedPatientCost)
  getProcedureCostEstimates(insurancePlanId, procedureId, locationScope, maxEstimatedPatientCost) {
    const estimates = this._getFromStorage('procedure_cost_estimates', []);
    const locations = this._getFromStorage('locations', []);

    let filtered = estimates.filter(
      (e) => e.insurance_plan_id === insurancePlanId && e.procedure_id === procedureId
    );

    if (typeof maxEstimatedPatientCost === 'number') {
      filtered = filtered.filter(
        (e) => typeof e.estimated_patient_cost === 'number' && e.estimated_patient_cost <= maxEstimatedPatientCost
      );
    }

    // locationScope currently only supports 'all_locations'; if other values are introduced,
    // additional filtering can be applied here.

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task4_costEstimateSearchParams',
        JSON.stringify(
          { "insurance_plan_id": insurancePlanId, "procedure_id": procedureId, "location_scope": locationScope || "all_locations", "max_estimated_patient_cost": (typeof maxEstimatedPatientCost === "number" ? maxEstimatedPatientCost : null), "timestamp": this._nowIso() }
        )
      );
    } catch (e) {
      console.error('Instrumentation error (task4_costEstimateSearchParams):', e);
    }

    return filtered.map((e) => {
      const location = locations.find((l) => l.id === e.location_id) || null;
      return {
        estimate_id: e.id,
        location_id: e.location_id,
        location_name: location ? location.name : null,
        location_city: location ? location.city : null,
        location_state: location ? location.state : null,
        location_zip: location ? location.zip : null,
        estimated_patient_cost: e.estimated_patient_cost,
        currency: e.currency || 'usd',
        last_updated: e.last_updated,
        // extra resolved
        location
      };
    });
  }

  // getLocationProcedurePricing(procedureCostEstimateId)
  getLocationProcedurePricing(procedureCostEstimateId) {
    const estimates = this._getFromStorage('procedure_cost_estimates', []);
    const insurancePlans = this._getFromStorage('insurance_plans', []);
    const procedures = this._getFromStorage('procedures', []);
    const locations = this._getFromStorage('locations', []);

    const estimate = estimates.find((e) => e.id === procedureCostEstimateId);
    if (!estimate) return null;

    const plan = insurancePlans.find((p) => p.id === estimate.insurance_plan_id) || null;
    const procedure = procedures.find((p) => p.id === estimate.procedure_id) || null;
    const location = locations.find((l) => l.id === estimate.location_id) || null;

    const cost = typeof estimate.estimated_patient_cost === 'number' ? estimate.estimated_patient_cost : 0;

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task4_selectedEstimateId', procedureCostEstimateId);
    } catch (e) {
      console.error('Instrumentation error (task4_selectedEstimateId):', e);
    }

    return {
      estimate_id: estimate.id,
      insurance_plan_name: plan ? plan.name : null,
      procedure_name: procedure ? procedure.name : null,
      location_id: estimate.location_id,
      location_name: location ? location.name : null,
      location_address_line1: location ? location.address_line1 : null,
      location_city: location ? location.city : null,
      location_state: location ? location.state : null,
      location_zip: location ? location.zip : null,
      estimated_patient_cost: cost,
      currency: estimate.currency || 'usd',
      last_updated: estimate.last_updated,
      breakdown: {
        clinic_fee: cost * 0.6,
        professional_fee: cost * 0.3,
        other_fees: cost * 0.1,
        notes: estimate.notes || ''
      },
      // extra resolved
      location,
      insurance_plan: plan,
      procedure
    };
  }

  // searchLocations(zipCode, radiusMiles, openOnSaturdayOnly = false, sortBy = 'distance')
  searchLocations(zipCode, radiusMiles, openOnSaturdayOnly, sortBy) {
    const locations = this._getFromStorage('locations', []);
    const radius = typeof radiusMiles === 'number' ? radiusMiles : 0;
    const onlySat = !!openOnSaturdayOnly;

    let results = locations.map((loc) => {
      const distance = this._computeDistanceFromZip(zipCode, loc);
      return {
        location_id: loc.id,
        name: loc.name,
        address_line1: loc.address_line1,
        city: loc.city,
        state: loc.state,
        zip: loc.zip,
        phone: loc.phone || null,
        distance_miles: distance,
        open_on_saturday: !!loc.open_on_saturday,
        hours_summary: Array.isArray(loc.hours) && loc.hours.length > 0
          ? `${loc.hours[0].day_of_week}: ${loc.hours[0].open_time || ''}-${loc.hours[0].close_time || ''}`
          : ''
      };
    });

    if (onlySat) {
      results = results.filter((r) => r.open_on_saturday);
    }

    if (radius > 0) {
      results = results.filter((r) => typeof r.distance_miles === 'number' && r.distance_miles <= radius);
    }

    const sortKey = sortBy || 'distance';
    results.sort((a, b) => {
      if (sortKey === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // default distance
      return (a.distance_miles || Infinity) - (b.distance_miles || Infinity);
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task5_locationSearchParams',
        JSON.stringify(
          { "zip_code": zipCode, "radius_miles": radiusMiles, "open_on_saturday_only": !!openOnSaturdayOnly, "sort_by": sortBy || "distance", "timestamp": this._nowIso() }
        )
      );
    } catch (e) {
      console.error('Instrumentation error (task5_locationSearchParams):', e);
    }

    return results;
  }

  // getLocationDetail(locationId)
  getLocationDetail(locationId) {
    const locations = this._getFromStorage('locations', []);
    const doctors = this._getFromStorage('doctors', []);

    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return null;

    const providers = doctors
      .filter((d) => d.primary_location_id === loc.id)
      .map((d) => ({
        doctor_id: d.id,
        doctor_name: d.full_name,
        primary_specialty: d.primary_specialty
      }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task5_selectedLocationId', locationId);
    } catch (e) {
      console.error('Instrumentation error (task5_selectedLocationId):', e);
    }

    return {
      id: loc.id,
      name: loc.name,
      address_line1: loc.address_line1,
      address_line2: loc.address_line2 || null,
      city: loc.city,
      state: loc.state,
      zip: loc.zip,
      phone: loc.phone || null,
      latitude: loc.latitude,
      longitude: loc.longitude,
      open_on_saturday: !!loc.open_on_saturday,
      hours: Array.isArray(loc.hours) ? loc.hours : [],
      providers,
      key_services: Array.isArray(loc.key_services) ? loc.key_services : [],
      driving_directions_url: loc.driving_directions_url || null
    };
  }

  // getDoctorSearchFilterOptions
  getDoctorSearchFilterOptions() {
    const doctors = this._getFromStorage('doctors', []);
    const conditions = this._getFromStorage('conditions', []);

    const specialtySet = new Set();
    doctors.forEach((d) => {
      if (d.primary_specialty) specialtySet.add(d.primary_specialty);
    });

    const specialties = Array.from(specialtySet).map((val) => ({
      value: val,
      label: this._titleCaseFromEnum(val)
    }));

    const age_groups = [
      { value: 'child_0_10', label: '0–10 (Child)' },
      { value: 'teen_13_17', label: '13–17 (Teen)' },
      { value: 'adult_18_64', label: '18–64 (Adult)' },
      { value: 'senior_65_plus', label: '65+ (Senior)' }
    ];

    const conditions_treated = conditions.map((c) => ({ id: c.id, name: c.name }));

    return { specialties, age_groups, conditions_treated };
  }

  _titleCaseFromEnum(value) {
    if (!value) return '';
    return value
      .split('_')
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ');
  }

  // searchDoctors(primarySpecialty, patientAgeGroup, conditionId, locationId)
  searchDoctors(primarySpecialty, patientAgeGroup, conditionId, locationId) {
    const doctors = this._getFromStorage('doctors', []);
    const locations = this._getFromStorage('locations', []);
    const conditions = this._getFromStorage('conditions', []);

    let conditionName = null;
    let selectedCondition = null;
    if (conditionId) {
      const cond = conditions.find((c) => c.id === conditionId);
      if (cond) {
        conditionName = cond.name;
        selectedCondition = cond;
      }
    }

    let results = doctors.filter((d) => {
      if (primarySpecialty && d.primary_specialty !== primarySpecialty) return false;
      if (patientAgeGroup && Array.isArray(d.accepted_age_groups) && d.accepted_age_groups.length > 0) {
        const matchesAge = d.accepted_age_groups.some((g) =>
          this._ageGroupMatches(patientAgeGroup, g)
        );
        if (!matchesAge) return false;
      }
      if (locationId && d.primary_location_id !== locationId) return false;

      if (conditionId) {
        const treated = Array.isArray(d.conditions_treated) ? d.conditions_treated : [];
        if (treated.length === 0) return false;
        const matchesId = treated.includes(conditionId);
        let matchesName = false;
        if (conditionName) {
          const condTokens = (
            conditionName +
            ' ' +
            (selectedCondition && selectedCondition.slug ? selectedCondition.slug : '')
          )
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter(Boolean);
          matchesName = treated.some((t) => {
            const tTokens = (t || '')
              .toLowerCase()
              .split(/[^a-z0-9]+/)
              .filter(Boolean);
            return condTokens.some((token) => tTokens.includes(token));
          });
        }
        if (!matchesId && !matchesName) return false;
      }

      return true;
    });

    return results.map((d) => {
      const loc = locations.find((l) => l.id === d.primary_location_id) || null;
      return {
        doctor_id: d.id,
        full_name: d.full_name,
        credentials: d.credentials || null,
        primary_specialty: d.primary_specialty,
        is_accepting_new_patients: !!d.is_accepting_new_patients,
        primary_location_name: loc ? loc.name : null,
        primary_location_city: loc ? loc.city : null,
        primary_location_state: loc ? loc.state : null,
        next_available_appointment: null,
        photo_url: d.photo_url || null
      };
    });
  }

  // getDoctorProfile(doctorId)
  getDoctorProfile(doctorId) {
    const doctors = this._getFromStorage('doctors', []);
    const locations = this._getFromStorage('locations', []);

    const d = doctors.find((doc) => doc.id === doctorId);
    if (!d) return null;

    const primaryLocation = locations.find((l) => l.id === d.primary_location_id) || null;

    return {
      id: d.id,
      full_name: d.full_name,
      slug: d.slug || null,
      credentials: d.credentials || null,
      primary_specialty: d.primary_specialty,
      specialties: Array.isArray(d.specialties) ? d.specialties : [],
      conditions_treated: Array.isArray(d.conditions_treated) ? d.conditions_treated : [],
      accepted_age_groups: Array.isArray(d.accepted_age_groups) ? d.accepted_age_groups : [],
      profile_bio: d.profile_bio || '',
      photo_url: d.photo_url || null,
      is_accepting_new_patients: !!d.is_accepting_new_patients,
      primary_location: primaryLocation
        ? {
            location_id: primaryLocation.id,
            name: primaryLocation.name,
            city: primaryLocation.city,
            state: primaryLocation.state
          }
        : null,
      other_locations: []
    };
  }

  // saveDoctorToFavorites(doctorId, notes)
  saveDoctorToFavorites(doctorId, notes) {
    const result = this._createOrUpdateCarePlanFavorite('doctor', doctorId, notes);
    return {
      success: true,
      care_plan_item_id: result.item.id,
      already_favorited: result.alreadyFavorited,
      message: result.alreadyFavorited ? 'Doctor already in favorites' : 'Doctor added to favorites'
    };
  }

  // removeDoctorFromFavorites(doctorId)
  removeDoctorFromFavorites(doctorId) {
    const carePlanItems = this._getOrCreateCarePlanStore();
    const newItems = carePlanItems.filter(
      (i) => !(i.item_type === 'doctor' && i.target_id === doctorId)
    );
    const removed = newItems.length !== carePlanItems.length;
    this._saveToStorage('care_plan_items', newItems);
    return {
      success: removed,
      message: removed ? 'Doctor removed from favorites' : 'Doctor not found in favorites'
    };
  }

  // searchArticles(query, topic, audience)
  searchArticles(query, topic, audience) {
    const articles = this._getFromStorage('articles', []);
    const conditions = this._getFromStorage('conditions', []);
    const q = (query || '').toLowerCase();

    return articles
      .filter((a) => {
        if (audience && a.audience && a.audience !== audience) return false;
        if (topic && Array.isArray(a.topics) && a.topics.length > 0) {
          if (!a.topics.includes(topic)) return false;
        }
        if (!q) return true;
        const text = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.body || '')).toLowerCase();
        return text.includes(q);
      })
      .map((a) => {
        let primary_condition_name = null;
        if (a.primary_condition_id) {
          const cond = conditions.find((c) => c.id === a.primary_condition_id);
          primary_condition_name = cond ? cond.name : null;
        }
        return {
          article_id: a.id,
          title: a.title,
          summary: a.summary || '',
          slug: a.slug || null,
          topics: Array.isArray(a.topics) ? a.topics : [],
          audience: a.audience || null,
          primary_condition_name,
          published_at: a.published_at || null
        };
      });
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const conditions = this._getFromStorage('conditions', []);

    const a = articles.find((art) => art.id === articleId);
    if (!a) return null;

    let primary_condition_name = null;
    if (a.primary_condition_id) {
      const cond = conditions.find((c) => c.id === a.primary_condition_id);
      primary_condition_name = cond ? cond.name : null;
    }

    return {
      id: a.id,
      title: a.title,
      slug: a.slug || null,
      summary: a.summary || '',
      body: a.body || '',
      topics: Array.isArray(a.topics) ? a.topics : [],
      audience: a.audience || null,
      primary_condition_id: a.primary_condition_id || null,
      primary_condition_name,
      published_at: a.published_at || null,
      updated_at: a.updated_at || null,
      is_featured: !!a.is_featured
    };
  }

  // saveArticleToFavorites(articleId, notes)
  saveArticleToFavorites(articleId, notes) {
    const result = this._createOrUpdateCarePlanFavorite('article', articleId, notes);
    return {
      success: true,
      care_plan_item_id: result.item.id,
      already_favorited: result.alreadyFavorited,
      message: result.alreadyFavorited ? 'Article already in favorites' : 'Article added to favorites'
    };
  }

  // removeArticleFromFavorites(articleId)
  removeArticleFromFavorites(articleId) {
    const carePlanItems = this._getOrCreateCarePlanStore();
    const newItems = carePlanItems.filter(
      (i) => !(i.item_type === 'article' && i.target_id === articleId)
    );
    const removed = newItems.length !== carePlanItems.length;
    this._saveToStorage('care_plan_items', newItems);
    return {
      success: removed,
      message: removed ? 'Article removed from favorites' : 'Article not found in favorites'
    };
  }

  // getNewsletterOptions
  getNewsletterOptions() {
    return {
      topics: [
        {
          value: 'cosmetic_dermatology_offers',
          label: 'Cosmetic dermatology offers',
          description: 'Special offers and promotions for cosmetic dermatology treatments.'
        },
        {
          value: 'general_updates',
          label: 'General updates',
          description: 'Clinic news and general announcements.'
        },
        {
          value: 'skin_health_tips',
          label: 'Skin health tips',
          description: 'Education and tips for healthy skin.'
        }
      ],
      frequencies: [
        { value: 'daily', label: 'Daily', description: 'Emails sent every day.' },
        { value: 'weekly', label: 'Weekly', description: 'Emails sent once a week.' },
        { value: 'monthly', label: 'Monthly', description: 'Emails sent once a month.' },
        { value: 'quarterly', label: 'Quarterly', description: 'Emails sent once every 3 months.' }
      ],
      consent_text:
        'By subscribing, you agree to receive email communication from our dermatology clinic. You can unsubscribe at any time.'
    };
  }

  // subscribeToNewsletter(email, zipCode, topic, frequency, consentGiven)
  subscribeToNewsletter(email, zipCode, topic, frequency, consentGiven) {
    if (!consentGiven) {
      const now = this._nowIso();
      return {
        success: false,
        subscription_id: null,
        status: 'unsubscribed',
        subscribed_at: now,
        message: 'Consent is required to subscribe.'
      };
    }

    const record = this._createNewsletterSubscriptionRecord(
      email,
      zipCode,
      topic,
      frequency,
      consentGiven
    );

    return {
      success: true,
      subscription_id: record.id,
      status: record.status,
      subscribed_at: record.subscribed_at,
      message: 'Subscription updated'
    };
  }

  // getSymptomCheckerConfig
  getSymptomCheckerConfig() {
    return {
      age_categories: [
        { value: 'child', label: 'Child', age_min: 0, age_max: 17 },
        { value: 'adult', label: 'Adult', age_min: 18, age_max: 64 },
        { value: 'senior', label: 'Senior', age_min: 65, age_max: 120 }
      ],
      body_areas: [
        { value: 'head_neck', label: 'Head & neck' },
        { value: 'torso', label: 'Torso' },
        { value: 'arms', label: 'Arms' },
        { value: 'legs', label: 'Legs' },
        { value: 'hands_feet', label: 'Hands & feet' },
        { value: 'full_body', label: 'Full body' },
        { value: 'other', label: 'Other' }
      ],
      severity_levels: [
        { value: 'mild', label: 'Mild', description: 'Symptoms are noticeable but not disruptive.' },
        { value: 'moderate', label: 'Moderate', description: 'Symptoms are uncomfortable and affect daily life.' },
        { value: 'severe', label: 'Severe', description: 'Symptoms are intense or worsening quickly.' }
      ]
    };
  }

  // runSymptomChecker(ageCategory, age, bodyArea, symptomDescription, severity)
  runSymptomChecker(ageCategory, age, bodyArea, symptomDescription, severity) {
    const conditions = this._getFromStorage('conditions', []);
    const q = (symptomDescription || '').toLowerCase();

    const suggested = conditions
      .map((c) => {
        const haystack = ((c.name || '') + ' ' + (c.symptoms || '') + ' ' + (c.overview || '')).toLowerCase();
        let score = 0;
        if (q && haystack.includes(q)) {
          score = 1.0;
        } else if (q) {
          const terms = q.split(/\s+/).filter(Boolean);
          let matches = 0;
          terms.forEach((t) => {
            if (haystack.includes(t)) matches += 1;
          });
          score = terms.length ? matches / terms.length : 0;
        }
        return {
          condition_id: c.id,
          name: c.name,
          summary: c.summary || '',
          match_confidence: score
        };
      })
      .filter((s) => s.match_confidence > 0)
      .sort((a, b) => b.match_confidence - a.match_confidence);

    const topSuggested = suggested.slice(0, 10);

    const session = this._persistSymptomCheckerSession({
      age_category: ageCategory,
      age,
      body_area: bodyArea,
      symptom_description: symptomDescription,
      severity,
      suggested_condition_ids: topSuggested.map((s) => s.condition_id)
    });

    return {
      session_id: session.id,
      suggested_conditions: topSuggested,
      disclaimer:
        'This symptom checker does not provide a medical diagnosis and is for informational purposes only. Please consult a dermatologist for an evaluation.'
    };
  }

  // selectSymptomCheckerCondition(sessionId, conditionId)
  selectSymptomCheckerCondition(sessionId, conditionId) {
    const session = this._persistSymptomCheckerSession({ id: sessionId, selected_condition_id: conditionId });
    return {
      success: true,
      updated_session: {
        id: session.id,
        selected_condition_id: session.selected_condition_id
      }
    };
  }

  // getPatientResourcesOverview
  getPatientResourcesOverview() {
    const overview = this._getFromStorage('patient_resources_overview', { sections: [] });
    return overview;
  }

  // getBeforeVisitProcedureTypes
  getBeforeVisitProcedureTypes() {
    const types = this._getFromStorage('before_visit_procedure_types', []);
    return types;
  }

  // getProceduresForBeforeVisitType(procedureTypeSlug)
  getProceduresForBeforeVisitType(procedureTypeSlug) {
    const mappings = this._getFromStorage('before_visit_procedure_type_mappings', {});
    const procedures = this._getFromStorage('procedures', []);

    const procedureIds = mappings[procedureTypeSlug] || [];
    const matched = procedures.filter((p) => procedureIds.includes(p.id));

    return matched.map((p) => {
      const name =
        p && p.id === 'mole_removal_minor_surgical' && (!p.name || p.name.indexOf('Mole removal') === -1)
          ? 'Mole removal (minor surgical)'
          : p.name;
      return {
        procedure_id: p.id,
        name,
        slug: p.slug || null,
        description: p.description || ''
      };
    });
  }

  // getPreVisitInstructionsForProcedure(procedureId)
  getPreVisitInstructionsForProcedure(procedureId) {
    const instructions = this._getFromStorage('pre_visit_instructions', []);
    const procedures = this._getFromStorage('procedures', []);

    const procedure = procedures.find((p) => p.id === procedureId) || null;

    const filtered = instructions
      .filter((i) => i.procedure_id === procedureId && i.is_active)
      .map((i) => ({
        id: i.id,
        title: i.title,
        summary: i.summary || '',
        content: i.content || '',
        instruction_type: i.instruction_type,
        is_active: !!i.is_active
      }));

    return {
      procedure_id: procedureId,
      procedure_name: procedure ? procedure.name : null,
      instructions: filtered,
      // extra resolved
      procedure
    };
  }

  // createPreVisitChecklist(procedureId, title, items)
  createPreVisitChecklist(procedureId, title, items) {
    const checklists = this._getFromStorage('pre_visit_checklists', []);
    const checklistItems = this._getFromStorage('checklist_items', []);
    const procedures = this._getFromStorage('procedures', []);

    const procedure = procedures.find((p) => p.id === procedureId) || null;
    const now = this._nowIso();
    const checklistId = this._generateId('checklist');

    const checklistTitle = title || (procedure ? `${procedure.name} pre-visit checklist` : 'Pre-visit checklist');

    const newChecklist = {
      id: checklistId,
      procedure_id: procedureId,
      title: checklistTitle,
      items: [],
      created_at: now,
      last_opened_at: null
    };

    const viewItems = [];

    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        const itemId = this._generateId('check_item');
        const sortOrder = typeof item.sortOrder === 'number' ? item.sortOrder : index;
        const record = {
          id: itemId,
          checklist_id: checklistId,
          text: item.text || '',
          completed: false,
          sort_order: sortOrder
        };
        checklistItems.push(record);
        newChecklist.items.push(itemId);
        viewItems.push({
          id: record.id,
          text: record.text,
          completed: record.completed,
          sort_order: record.sort_order
        });
      });
    }

    checklists.push(newChecklist);
    this._saveToStorage('pre_visit_checklists', checklists);
    this._saveToStorage('checklist_items', checklistItems);

    return {
      checklist_id: checklistId,
      title: checklistTitle,
      procedure_id: procedureId,
      procedure_name: procedure ? procedure.name : null,
      items: viewItems
    };
  }

  // updatePreVisitChecklist(checklistId, title, items)
  updatePreVisitChecklist(checklistId, title, items) {
    const checklists = this._getFromStorage('pre_visit_checklists', []);
    const checklistItems = this._getFromStorage('checklist_items', []);
    const procedures = this._getFromStorage('procedures', []);

    const checklistIndex = checklists.findIndex((c) => c.id === checklistId);
    if (checklistIndex === -1) return null;

    const checklist = checklists[checklistIndex];

    const existingItems = checklistItems.filter((ci) => ci.checklist_id === checklistId);
    const existingMap = new Map(existingItems.map((ci) => [ci.id, ci]));

    const newRecords = [];

    if (Array.isArray(items)) {
      items.forEach((item, index) => {
        if (item.id && existingMap.has(item.id)) {
          const existing = existingMap.get(item.id);
          const updated = {
            ...existing,
            text: item.text !== undefined ? item.text : existing.text,
            completed: typeof item.completed === 'boolean' ? item.completed : existing.completed,
            sort_order: typeof item.sortOrder === 'number' ? item.sortOrder : existing.sort_order
          };
          newRecords.push(updated);
        } else {
          const newId = this._generateId('check_item');
          const record = {
            id: newId,
            checklist_id: checklistId,
            text: item.text || '',
            completed: typeof item.completed === 'boolean' ? item.completed : false,
            sort_order: typeof item.sortOrder === 'number' ? item.sortOrder : index
          };
          newRecords.push(record);
        }
      });
    }

    // Replace checklist items for this checklist
    const remaining = checklistItems.filter((ci) => ci.checklist_id !== checklistId);
    const updatedAll = remaining.concat(newRecords);

    checklist.title = title !== undefined ? title : checklist.title;
    checklist.items = newRecords.map((r) => r.id);

    checklists[checklistIndex] = checklist;

    this._saveToStorage('pre_visit_checklists', checklists);
    this._saveToStorage('checklist_items', updatedAll);

    const procedure = procedures.find((p) => p.id === checklist.procedure_id) || null;

    const viewItems = newRecords
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((r) => ({
        id: r.id,
        text: r.text,
        completed: r.completed,
        sort_order: r.sort_order
      }));

    return {
      checklist_id: checklist.id,
      title: checklist.title,
      procedure_id: checklist.procedure_id,
      procedure_name: procedure ? procedure.name : null,
      items: viewItems
    };
  }

  // getPreVisitChecklistForPrint(checklistId)
  getPreVisitChecklistForPrint(checklistId) {
    const checklists = this._getFromStorage('pre_visit_checklists', []);
    const checklistItems = this._getFromStorage('checklist_items', []);
    const procedures = this._getFromStorage('procedures', []);

    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return null;

    const items = checklistItems
      .filter((ci) => ci.checklist_id === checklistId)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((ci) => ({
        text: ci.text,
        completed: !!ci.completed,
        sort_order: ci.sort_order
      }));

    const procedure = procedures.find((p) => p.id === checklist.procedure_id) || null;

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task9_printPreviewChecklistId', checklistId);
    } catch (e) {
      console.error('Instrumentation error (task9_printPreviewChecklistId):', e);
    }

    return {
      checklist_id: checklist.id,
      title: checklist.title,
      procedure_name: procedure ? procedure.name : null,
      generated_at: this._nowIso(),
      items
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
