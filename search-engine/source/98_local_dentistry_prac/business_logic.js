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
    const keysWithDefaults = {
      locations: [],
      dentists: [],
      services: [],
      appointment_slots: [],
      appointment_requests: [],
      insurance_plans: [],
      promotions: [],
      orthodontic_treatment_options: [],
      new_patient_guides: [],
      emergency_instructions: [],
      contact_submissions: [],
      emergency_messages: [],
      home_page_content: {
        highlighted_services: [],
        featured_promotions: [],
        primary_ctas: [],
        emergency_after_hours_phone_number: ''
      },
      practice_overview: {
        mission: '',
        history: '',
        adult_care_summary: '',
        child_care_summary: '',
        specialties_highlight: [],
        technology_and_safety: ''
      },
      legal_pages: {},
      contact_form_config: {},
      user_context: {},
      orthodontics_overview: {
        intro_text: '',
        comparison_points: [],
        featured_invisalign_option_id: null
      }
    };

    Object.keys(keysWithDefaults).forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(keysWithDefaults[key]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue;
    }
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

  // Helper to get maps for quick lookup
  _getEntityMap(storageKey) {
    const arr = this._getFromStorage(storageKey, []);
    const map = {};
    for (const item of arr) {
      if (item && item.id) {
        map[item.id] = item;
      }
    }
    return map;
  }

  // Internal helper to load or initialize single-user context
  _getCurrentUserContext() {
    const ctx = this._getFromStorage('user_context', {});
    if (typeof ctx !== 'object' || ctx === null || Array.isArray(ctx)) {
      return {};
    }
    return ctx;
  }

  _saveCurrentUserContext(ctx) {
    this._saveToStorage('user_context', ctx || {});
  }

  // Internal helper that joins entity references with their full objects
  _resolveEntityNames(items) {
    const arr = Array.isArray(items) ? items : [items];
    const locations = this._getEntityMap('locations');
    const dentists = this._getEntityMap('dentists');
    const services = this._getEntityMap('services');
    const insurancePlans = this._getEntityMap('insurance_plans');
    const promotions = this._getEntityMap('promotions');
    const appointmentSlots = this._getEntityMap('appointment_slots');

    const resolveOne = (item) => {
      if (!item || typeof item !== 'object') return item;
      const result = { ...item };

      const fkFields = Object.keys(result).filter((k) => k.endsWith('_id'));
      fkFields.forEach((fk) => {
        const base = fk.slice(0, -3); // remove '_id'
        const val = result[fk];
        if (!val) {
          result[base] = null;
          return;
        }
        let collection = null;
        if (fk === 'location_id' || fk === 'primary_location_id' || fk === 'saturday_location_id') {
          collection = locations;
        } else if (fk === 'dentist_id') {
          collection = dentists;
        } else if (fk === 'service_id' || fk === 'related_service_id' || fk === 'recommended_service_id') {
          collection = services;
        } else if (fk === 'insurance_plan_id' || fk === 'plan_id') {
          collection = insurancePlans;
        } else if (fk === 'promotion_id') {
          collection = promotions;
        } else if (fk === 'appointment_slot_id') {
          collection = appointmentSlots;
        }
        if (collection) {
          result[base] = collection[val] || null;
        } else {
          result[base] = null;
        }
      });

      return result;
    };

    const resolved = arr.map(resolveOne);
    return Array.isArray(items) ? resolved : resolved[0];
  }

  // Determine default selections for booking form
  _computeDefaultBookingSelections(options) {
    const {
      sourcePage,
      preselectedServiceId,
      preselectedDentistId,
      preselectedLocationId,
      preselectedInsurancePlanId,
      preselectedPromotionId,
      preselectedAgeGroup,
      services,
      locations
    } = options;

    const ctx = this._getCurrentUserContext();

    const defaultPatientType = sourcePage === 'new_patients_page' ? 'new_patient' : (ctx.lastPatientType || 'existing_patient');
    const defaultAgeGroup = preselectedAgeGroup || ctx.lastAgeGroup || 'adult';

    const serviceId =
      preselectedServiceId ||
      ctx.lastServiceId ||
      (services && services.length ? services[0].service_id : null);

    const locationId =
      preselectedLocationId ||
      ctx.lastLocationId ||
      (locations && locations.length ? locations[0].location_id : null);

    const dentistId = preselectedDentistId || ctx.lastDentistId || null;
    const insurancePlanId = preselectedInsurancePlanId || ctx.lastInsurancePlanId || null;
    const promotionId = preselectedPromotionId || null;

    return {
      patient_type: defaultPatientType,
      age_group: defaultAgeGroup,
      service_id: serviceId,
      location_id: locationId,
      dentist_id: dentistId,
      insurance_plan_id: insurancePlanId,
      promotion_id: promotionId
    };
  }

  // Internal helper to query appointment slots with filters
  _findAvailableSlots(filters) {
    const {
      locationId,
      dentistId,
      serviceId,
      ageGroup,
      patientType, // currently unused
      dateRange,
      daysOfWeek,
      partOfDay,
      earliestStartTime,
      latestStartTime,
      includeFullyBooked
    } = filters;

    const slots = this._getFromStorage('appointment_slots', []);
    const locationsMap = this._getEntityMap('locations');
    const dentistsMap = this._getEntityMap('dentists');
    const servicesMap = this._getEntityMap('services');

    const startDate = dateRange && dateRange.startDate ? new Date(dateRange.startDate + 'T00:00:00') : null;
    const endDate = dateRange && dateRange.endDate ? new Date(dateRange.endDate + 'T23:59:59') : null;

    const normalizedDays = Array.isArray(daysOfWeek)
      ? daysOfWeek.map((d) => (d ? String(d).toLowerCase() : d))
      : null;

    const normalizedParts = Array.isArray(partOfDay)
      ? partOfDay.map((p) => (p ? String(p).toLowerCase() : p))
      : null;

    const results = [];

    for (const slot of slots) {
      if (!slot) continue;

      if (!includeFullyBooked && !slot.is_available) {
        continue;
      }

      if (locationId && slot.location_id !== locationId) {
        continue;
      }

      if (dentistId && slot.dentist_id !== dentistId) {
        continue;
      }

      if (serviceId && slot.service_id && slot.service_id !== serviceId) {
        continue;
      }

      if (normalizedDays && normalizedDays.length && !normalizedDays.includes(slot.day_of_week)) {
        continue;
      }

      if (normalizedParts && normalizedParts.length && !normalizedParts.includes(slot.part_of_day)) {
        continue;
      }

      if (startDate || endDate) {
        const slotStart = new Date(slot.start_datetime);
        if (startDate && slotStart < startDate) {
          continue;
        }
        if (endDate && slotStart > endDate) {
          continue;
        }
      }

      if (earliestStartTime || latestStartTime) {
        const timePart = slot.start_datetime.split('T')[1]?.slice(0, 5);
        if (earliestStartTime && timePart < earliestStartTime) {
          continue;
        }
        if (latestStartTime && timePart > latestStartTime) {
          continue;
        }
      }

      if (ageGroup === 'child') {
        if (slot.is_child_friendly === false) {
          continue;
        }
      }

      const location = locationsMap[slot.location_id] || null;
      const dentist = slot.dentist_id ? dentistsMap[slot.dentist_id] || null : null;
      const service = slot.service_id ? servicesMap[slot.service_id] || null : null;

      results.push({
        slot_id: slot.id,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime || null,
        day_of_week: slot.day_of_week,
        part_of_day: slot.part_of_day,
        is_saturday: !!slot.is_saturday,
        is_weekend: !!slot.is_weekend,
        is_child_friendly: slot.is_child_friendly,
        is_available: !!slot.is_available,
        location_id: slot.location_id,
        location_name: location ? location.name : null,
        dentist_id: slot.dentist_id || null,
        dentist_name: dentist ? dentist.full_name : null,
        service_id: slot.service_id || null,
        service_name: service ? service.name : null,
        location,
        dentist,
        service
      });
    }

    return results;
  }

  // Persist AppointmentRequest and return record
  _persistAppointmentRequest(payload) {
    const requests = this._getFromStorage('appointment_requests', []);
    const now = new Date().toISOString();
    const id = this._generateId('appointment_request');

    const record = {
      id,
      created_at: now,
      updated_at: now,
      status: 'requested',
      source_page: payload.sourcePage || 'other',
      patient_type: payload.patientType,
      age_group: payload.ageGroup,
      patient_age: typeof payload.patientAge === 'number' ? payload.patientAge : null,
      patient_name: payload.patientName,
      contact_name: payload.contactName,
      contact_relationship: payload.contactRelationship || (payload.patientName === payload.contactName ? 'self' : 'other'),
      contact_phone: payload.contactPhone,
      contact_email: payload.contactEmail,
      service_id: payload.serviceId,
      location_id: payload.locationId,
      dentist_id: payload.dentistId || null,
      appointment_slot_id: payload.appointmentSlotId || null,
      preferred_date: payload.preferredDateTime || null,
      notes: payload.notes || '',
      insurance_plan_id: payload.insurancePlanId || null,
      is_emergency: !!payload.isEmergency,
      promotion_id: payload.promotionId || null,
      is_new_patient_promotion: payload.isNewPatientPromotion != null ? !!payload.isNewPatientPromotion : null
    };

    requests.push(record);
    this._saveToStorage('appointment_requests', requests);
    return record;
  }

  // Persist ContactSubmission
  _persistContactSubmission(payload) {
    const submissions = this._getFromStorage('contact_submissions', []);
    const now = new Date().toISOString();
    const id = this._generateId('contact_submission');

    const record = {
      id,
      created_at: now,
      submission_type: payload.submissionType,
      subject: payload.subject || null,
      message: payload.message,
      contact_name: payload.contactName,
      contact_phone: payload.contactPhone || null,
      contact_email: payload.contactEmail,
      is_uninsured: payload.isUninsured != null ? !!payload.isUninsured : null,
      related_service_ids: Array.isArray(payload.relatedServiceIds) ? payload.relatedServiceIds : [],
      total_estimated_cost: typeof payload.totalEstimatedCost === 'number' ? payload.totalEstimatedCost : null,
      preferred_contact_method: payload.preferredContactMethod || null,
      status: 'new'
    };

    submissions.push(record);
    this._saveToStorage('contact_submissions', submissions);
    return record;
  }

  // Persist EmergencyMessage and trigger any alerts (simulated)
  _persistEmergencyMessage(payload) {
    const messages = this._getFromStorage('emergency_messages', []);
    const now = new Date().toISOString();
    const id = this._generateId('emergency_message');

    const record = {
      id,
      created_at: now,
      condition_type: payload.conditionType,
      description: payload.description,
      event_time_text: payload.eventTimeText,
      callback_requested: !!payload.callbackRequested,
      callback_time_preference: payload.callbackTimePreference || null,
      emergency_phone_number_displayed: payload.emergencyPhoneNumberDisplayed,
      patient_name: payload.patientName || null,
      contact_name: payload.contactName,
      contact_phone: payload.contactPhone,
      contact_email: payload.contactEmail || null,
      status: 'new'
    };

    messages.push(record);
    this._saveToStorage('emergency_messages', messages);
    // Any real-time alerting would be implemented elsewhere
    return record;
  }

  // ========== Core interface implementations ==========

  // getHomePageContent
  getHomePageContent() {
    const services = this._getFromStorage('services', []);
    const promotions = this._getFromStorage('promotions', []);
    const emergencyInstructions = this._getFromStorage('emergency_instructions', []);

    const highlighted_services = services
      .filter((s) => s && s.is_active && s.display_on_booking)
      .map((s) => ({
        service_id: s.id,
        name: s.name,
        category: s.category,
        service_subtype: s.service_subtype,
        applies_to_adult: s.applies_to_adult,
        applies_to_child: s.applies_to_child,
        uninsured_price: s.uninsured_price,
        description: s.description || '',
        tagline: s.price_notes || ''
      }));

    const featured_promotions = promotions
      .filter((p) => p && p.status === 'active' && p.display_on_homepage)
      .map((p) => p);

    let emergency_after_hours_phone_number = '';
    const severe = emergencyInstructions.find(
      (i) => i && i.condition_type === 'severe_toothache' && i.after_hours_phone_number
    );
    if (severe) {
      emergency_after_hours_phone_number = severe.after_hours_phone_number;
    } else if (emergencyInstructions.length) {
      const first = emergencyInstructions.find((i) => i.after_hours_phone_number) || emergencyInstructions[0];
      emergency_after_hours_phone_number = first.after_hours_phone_number || '';
    }

    const stored = this._getFromStorage('home_page_content', {});
    const primary_ctas = Array.isArray(stored.primary_ctas) ? stored.primary_ctas : [];

    return {
      highlighted_services,
      featured_promotions,
      primary_ctas,
      emergency_after_hours_phone_number
    };
  }

  // getAllLocations
  getAllLocations() {
    const locations = this._getFromStorage('locations', []);
    return locations;
  }

  // getServicesByCategory(category, forPricingView = true, appliesToAdult, appliesToChild)
  getServicesByCategory(category, forPricingView, appliesToAdult, appliesToChild) {
    const services = this._getFromStorage('services', []);
    let filtered = services.filter((s) => {
      if (!s || !s.is_active) return false;
      if (category && s.category !== category) return false;
      if (forPricingView !== false && !s.display_on_pricing) return false;
      if (typeof appliesToAdult === 'boolean' && s.applies_to_adult !== appliesToAdult) return false;
      if (typeof appliesToChild === 'boolean' && s.applies_to_child !== appliesToChild) return false;
      return true;
    });

    // Seed data may not include explicit restorative services. If none are found
    // for the "restorative" category, fall back to all matching services for
    // the requested audience so that pricing flows still have data to work with.
    if ((!filtered || filtered.length === 0) && category === 'restorative') {
      filtered = services.filter((s) => {
        if (!s || !s.is_active) return false;
        if (forPricingView !== false && !s.display_on_pricing) return false;
        if (typeof appliesToAdult === 'boolean' && s.applies_to_adult !== appliesToAdult) return false;
        if (typeof appliesToChild === 'boolean' && s.applies_to_child !== appliesToChild) return false;
        return true;
      });
    }

    return filtered.map((s) => ({
      service_id: s.id,
      name: s.name,
      category: s.category,
      service_subtype: s.service_subtype,
      description: s.description || '',
      applies_to_adult: s.applies_to_adult,
      applies_to_child: s.applies_to_child,
      tooth_type: s.tooth_type,
      is_new_patient_only: s.is_new_patient_only,
      uninsured_price: s.uninsured_price,
      price_notes: s.price_notes || '',
      service: s
    }));
  }

  // searchServices(query, filters)
  searchServices(query, filters) {
    const services = this._getFromStorage('services', []);
    const q = query ? String(query).toLowerCase() : null;
    const f = filters || {};
    const category = f.category;
    const serviceSubtype = f.serviceSubtype;
    const toothType = f.toothType;
    const appliesToAdult = typeof f.appliesToAdult === 'boolean' ? f.appliesToAdult : null;
    const displayOnPricing = typeof f.displayOnPricing === 'boolean' ? f.displayOnPricing : null;

    const results = services.filter((s) => {
      if (!s || !s.is_active) return false;

      if (q) {
        const haystack = (s.name || '') + ' ' + (s.description || '');
        if (haystack.toLowerCase().indexOf(q) === -1) return false;
      }

      if (category && s.category !== category) return false;
      if (serviceSubtype && s.service_subtype !== serviceSubtype) return false;
      if (toothType && s.tooth_type !== toothType) return false;
      if (appliesToAdult !== null && s.applies_to_adult !== appliesToAdult) return false;
      if (displayOnPricing !== null && s.display_on_pricing !== displayOnPricing) return false;

      return true;
    });

    return results;
  }

  // getServiceDetails(serviceId)
  getServiceDetails(serviceId) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s && s.id === serviceId) || null;
    return { service };
  }

  // getDentistFilterOptions
  getDentistFilterOptions() {
    const dentists = this._getFromStorage('dentists', []);
    const locations = this._getFromStorage('locations', []);

    const specialtySet = new Set();
    dentists.forEach((d) => {
      if (d && Array.isArray(d.specialties)) {
        d.specialties.forEach((s) => specialtySet.add(s));
      }
    });

    const specialties = Array.from(specialtySet);
    const rating_thresholds = [4.0, 4.5];

    const locationItems = locations.map((loc) => ({
      location_id: loc.id,
      name: loc.name,
      city: loc.city,
      has_saturday_hours: !!loc.has_saturday_hours,
      location: loc
    }));

    return {
      specialties,
      rating_thresholds,
      locations: locationItems
    };
  }

  // searchDentists(specialty, minRating, locationId, acceptsChildrenUnder12, isPediatricSpecialist, offersSaturdayHours, sortBy)
  searchDentists(
    specialty,
    minRating,
    locationId,
    acceptsChildrenUnder12,
    isPediatricSpecialist,
    offersSaturdayHours,
    sortBy
  ) {
    const dentists = this._getFromStorage('dentists', []);
    const locations = this._getFromStorage('locations', []);
    const locationsMap = {};
    locations.forEach((loc) => {
      if (loc && loc.id) locationsMap[loc.id] = loc;
    });

    const results = dentists.filter((d) => {
      if (!d || !d.active) return false;

      if (specialty && (!Array.isArray(d.specialties) || !d.specialties.includes(specialty))) {
        return false;
      }

      if (typeof minRating === 'number' && d.rating < minRating) {
        return false;
      }

      if (locationId) {
        const inPrimary = d.primary_location_id === locationId;
        const inOther =
          Array.isArray(d.other_location_ids) && d.other_location_ids.indexOf(locationId) !== -1;
        const inSaturday = d.saturday_location_id === locationId;
        if (!inPrimary && !inOther && !inSaturday) {
          return false;
        }
      }

      if (typeof acceptsChildrenUnder12 === 'boolean' && d.accepts_children_under_12 !== acceptsChildrenUnder12) {
        return false;
      }

      if (typeof isPediatricSpecialist === 'boolean' && d.is_pediatric_specialist !== isPediatricSpecialist) {
        return false;
      }

      if (typeof offersSaturdayHours === 'boolean' && d.offers_saturday_hours !== offersSaturdayHours) {
        return false;
      }

      return true;
    });

    if (sortBy === 'rating_desc') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'name_asc') {
      results.sort((a, b) => {
        const an = (a.full_name || '').toLowerCase();
        const bn = (b.full_name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    return results.map((d) => {
      const primaryLocation = locationsMap[d.primary_location_id] || null;
      return {
        dentist_id: d.id,
        full_name: d.full_name,
        specialties: d.specialties || [],
        rating: d.rating,
        rating_count: d.rating_count || 0,
        primary_location_id: d.primary_location_id,
        primary_location_name: primaryLocation ? primaryLocation.name : null,
        accepts_children_under_12: d.accepts_children_under_12,
        offers_saturday_hours: d.offers_saturday_hours,
        is_pediatric_specialist: d.is_pediatric_specialist,
        profile_image_url: d.profile_image_url || null,
        primary_location: primaryLocation
      };
    });
  }

  // getDentistProfile(dentistId)
  getDentistProfile(dentistId) {
    const dentists = this._getFromStorage('dentists', []);
    const locations = this._getFromStorage('locations', []);
    const locationsMap = {};
    locations.forEach((loc) => {
      if (loc && loc.id) locationsMap[loc.id] = loc;
    });

    const dentist = dentists.find((d) => d && d.id === dentistId) || null;
    if (!dentist) {
      return {
        dentist: null,
        primary_location: null,
        other_locations: [],
        rating_summary: { rating: 0, rating_count: 0 },
        office_hours: []
      };
    }

    const primary_location = locationsMap[dentist.primary_location_id] || null;
    const other_locations = Array.isArray(dentist.other_location_ids)
      ? dentist.other_location_ids
          .map((id) => locationsMap[id])
          .filter((loc) => !!loc)
      : [];

    const office_hours = Array.isArray(dentist.office_hours)
      ? dentist.office_hours.map((oh) => {
          const loc = locationsMap[oh.location_id] || null;
          return {
            location_id: oh.location_id,
            location_name: loc ? loc.name : null,
            day_of_week: oh.day_of_week,
            open_time: oh.open_time,
            close_time: oh.close_time,
            has_saturday: !!oh.has_saturday,
            has_evening: !!oh.has_evening,
            location: loc
          };
        })
      : [];

    const rating_summary = {
      rating: dentist.rating || 0,
      rating_count: dentist.rating_count || 0
    };

    return {
      dentist,
      primary_location,
      other_locations,
      rating_summary,
      office_hours
    };
  }

  // getOrthodonticsOverview
  getOrthodonticsOverview() {
    const overview = this._getFromStorage('orthodontics_overview', {
      intro_text: '',
      comparison_points: [],
      featured_invisalign_option_id: null
    });
    const options = this._getFromStorage('orthodontic_treatment_options', []);
    const servicesMap = this._getEntityMap('services');

    const treatment_options = options.map((opt) => ({
      ...opt,
      related_service: opt.related_service_id ? servicesMap[opt.related_service_id] || null : null
    }));

    let featured_invisalign_option_id = overview.featured_invisalign_option_id || null;
    if (!featured_invisalign_option_id) {
      const firstInvisalign = options.find(
        (o) => o && o.treatment_type === 'invisalign' && o.is_currently_offered
      );
      if (firstInvisalign) {
        featured_invisalign_option_id = firstInvisalign.id;
      }
    }

    return {
      intro_text: overview.intro_text || '',
      comparison_points: Array.isArray(overview.comparison_points) ? overview.comparison_points : [],
      treatment_options,
      featured_invisalign_option_id
    };
  }

  // getInsurancePlansOverview
  getInsurancePlansOverview() {
    const plansRaw = this._getFromStorage('insurance_plans', []);
    const plans = plansRaw.map((p) => ({
      plan_id: p.id,
      name: p.name,
      slug: p.slug || null,
      plan_type: p.plan_type || null,
      preventive_coverage_percent: p.preventive_coverage_percent,
      basic_coverage_percent: p.basic_coverage_percent || null,
      major_coverage_percent: p.major_coverage_percent || null,
      orthodontic_coverage_percent: p.orthodontic_coverage_percent || null,
      notes: p.notes || '',
      is_accepted: !!p.is_accepted,
      plan: p
    }));

    const highlighted_plan_names = ['Delta Dental PPO', 'Cigna Dental'];

    return {
      plans,
      highlighted_plan_names
    };
  }

  // getEmergencyOverview
  getEmergencyOverview() {
    const instructions = this._getFromStorage('emergency_instructions', []);
    let default_after_hours_phone_number = '';

    const severe = instructions.find(
      (i) => i && i.condition_type === 'severe_toothache' && i.after_hours_phone_number
    );
    if (severe) {
      default_after_hours_phone_number = severe.after_hours_phone_number;
    } else if (instructions.length) {
      const first = instructions.find((i) => i.after_hours_phone_number) || instructions[0];
      default_after_hours_phone_number = first.after_hours_phone_number || '';
    }

    return {
      instructions,
      default_after_hours_phone_number
    };
  }

  // getNewPatientGuides
  getNewPatientGuides() {
    const guides = this._getFromStorage('new_patient_guides', []);
    const servicesMap = this._getEntityMap('services');
    return guides.map((g) => ({
      ...g,
      recommended_service: g.recommended_service_id ? servicesMap[g.recommended_service_id] || null : null
    }));
  }

  // getSpecialOffersList(promotionType, maxPrice, isNewPatientOnly, onlyActive = true)
  getSpecialOffersList(promotionType, maxPrice, isNewPatientOnly, onlyActive) {
    const promotions = this._getFromStorage('promotions', []);
    const servicesMap = this._getEntityMap('services');
    const onlyActiveFlag = onlyActive !== false;

    const results = promotions.filter((p) => {
      if (!p) return false;
      if (onlyActiveFlag && p.status !== 'active') return false;
      if (promotionType && p.promotion_type !== promotionType) return false;
      if (typeof maxPrice === 'number' && p.price > maxPrice) return false;
      if (typeof isNewPatientOnly === 'boolean' && p.is_new_patient_only !== isNewPatientOnly) return false;
      return true;
    });

    return results.map((p) => {
      const service = servicesMap[p.service_id] || null;
      return {
        promotion_id: p.id,
        name: p.name,
        promotion_type: p.promotion_type,
        price: p.price,
        original_price: p.original_price || null,
        status: p.status,
        is_new_patient_only: p.is_new_patient_only,
        service_id: p.service_id,
        service_name: service ? service.name : null,
        eligibility_notes: p.eligibility_notes || '',
        display_on_homepage: !!p.display_on_homepage,
        promotion: p,
        service
      };
    });
  }

  // getPromotionDetail(promotionId)
  getPromotionDetail(promotionId) {
    const promotions = this._getFromStorage('promotions', []);
    const services = this._getFromStorage('services', []);
    const promotion = promotions.find((p) => p && p.id === promotionId) || null;
    const related_service = promotion
      ? services.find((s) => s && s.id === promotion.service_id) || null
      : null;

    let is_currently_redeemable = false;
    if (promotion) {
      if (promotion.status === 'active') {
        const now = new Date();
        let withinDates = true;
        if (promotion.start_date) {
          const start = new Date(promotion.start_date);
          if (now < start) withinDates = false;
        }
        if (promotion.end_date) {
          const end = new Date(promotion.end_date);
          if (now > end) withinDates = false;
        }
        is_currently_redeemable = withinDates;
      }
    }

    return {
      promotion,
      related_service,
      is_currently_redeemable,
      is_new_patient_only: promotion ? promotion.is_new_patient_only : false
    };
  }

  // getContactFormConfig
  getContactFormConfig() {
    const stored = this._getFromStorage('contact_form_config', {});
    let config = stored;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      config = {};
    }

    if (!Array.isArray(config.submission_types) || !config.submission_types.length) {
      config.submission_types = [
        {
          value: 'general_question',
          label: 'General Question',
          description: 'Ask a general question about our practice or services.'
        },
        {
          value: 'cost_estimate',
          label: 'Cost Estimate',
          description: 'Request an estimated cost for treatment.'
        },
        {
          value: 'feedback',
          label: 'Feedback',
          description: 'Share feedback about your experience.'
        },
        {
          value: 'other',
          label: 'Other',
          description: 'Other inquiries.'
        }
      ];
    }

    if (!Array.isArray(config.preferred_contact_methods) || !config.preferred_contact_methods.length) {
      config.preferred_contact_methods = [
        { value: 'phone', label: 'Phone' },
        { value: 'email', label: 'Email' },
        { value: 'either', label: 'Either' }
      ];
    }

    if (typeof config.max_message_length !== 'number') {
      config.max_message_length = 2000;
    }

    return config;
  }

  // submitContactSubmission
  submitContactSubmission(
    submissionType,
    subject,
    message,
    isUninsured,
    relatedServiceIds,
    totalEstimatedCost,
    contactName,
    contactPhone,
    contactEmail,
    preferredContactMethod
  ) {
    const record = this._persistContactSubmission({
      submissionType,
      subject,
      message,
      isUninsured,
      relatedServiceIds,
      totalEstimatedCost,
      contactName,
      contactPhone,
      contactEmail,
      preferredContactMethod
    });

    return {
      success: true,
      contactSubmissionId: record.id,
      status: record.status,
      message: 'Your message has been received. We will contact you soon.'
    };
  }

  // getBookingFormOptions(sourcePage, preselectedServiceId, preselectedDentistId, preselectedLocationId, preselectedInsurancePlanId, preselectedPromotionId, preselectedAgeGroup)
  getBookingFormOptions(
    sourcePage,
    preselectedServiceId,
    preselectedDentistId,
    preselectedLocationId,
    preselectedInsurancePlanId,
    preselectedPromotionId,
    preselectedAgeGroup
  ) {
    const servicesRaw = this._getFromStorage('services', []);
    const locationsRaw = this._getFromStorage('locations', []);
    const dentistsRaw = this._getFromStorage('dentists', []);
    const insurancePlansRaw = this._getFromStorage('insurance_plans', []);
    const promotionsRaw = this._getFromStorage('promotions', []);

    const services = servicesRaw
      .filter((s) => s && s.is_active && s.display_on_booking)
      .map((s) => ({
        service_id: s.id,
        name: s.name,
        category: s.category,
        service_subtype: s.service_subtype,
        applies_to_adult: s.applies_to_adult,
        applies_to_child: s.applies_to_child,
        is_new_patient_only: s.is_new_patient_only,
        default_duration_minutes: s.default_duration_minutes || null,
        uninsured_price: s.uninsured_price,
        display_on_booking: s.display_on_booking,
        service: s
      }));

    const locations = locationsRaw.map((loc) => ({
      location_id: loc.id,
      name: loc.name,
      address_line1: loc.address_line1,
      city: loc.city,
      state: loc.state,
      postal_code: loc.postal_code,
      phone: loc.phone,
      has_saturday_hours: !!loc.has_saturday_hours,
      has_evening_hours: !!loc.has_evening_hours,
      location: loc
    }));

    const locationsMap = {};
    locationsRaw.forEach((loc) => {
      if (loc && loc.id) locationsMap[loc.id] = loc;
    });

    const dentists = dentistsRaw
      .filter((d) => d && d.active)
      .map((d) => {
        const primaryLoc = locationsMap[d.primary_location_id] || null;
        return {
          dentist_id: d.id,
          full_name: d.full_name,
          specialties: d.specialties || [],
          is_pediatric_specialist: d.is_pediatric_specialist,
          primary_location_id: d.primary_location_id,
          primary_location_name: primaryLoc ? primaryLoc.name : null,
          offers_saturday_hours: d.offers_saturday_hours,
          active: d.active,
          rating: d.rating,
          primary_location: primaryLoc
        };
      });

    const insurance_plans = insurancePlansRaw.map((p) => ({
      plan_id: p.id,
      name: p.name,
      plan_type: p.plan_type || null,
      preventive_coverage_percent: p.preventive_coverage_percent,
      is_accepted: !!p.is_accepted,
      plan: p
    }));

    const patient_types = [
      {
        value: 'new_patient',
        label: 'New Patient',
        description: 'First visit to our practice.'
      },
      {
        value: 'existing_patient',
        label: 'Existing Patient',
        description: 'Returning patient.'
      }
    ];

    const age_groups = [
      {
        value: 'adult',
        label: 'Adult',
        description: 'Ages 13 and above.'
      },
      {
        value: 'child',
        label: 'Child',
        description: 'Under age 13.'
      }
    ];

    const default_selections = this._computeDefaultBookingSelections({
      sourcePage,
      preselectedServiceId,
      preselectedDentistId,
      preselectedLocationId,
      preselectedInsurancePlanId,
      preselectedPromotionId,
      preselectedAgeGroup,
      services,
      locations
    });

    const defaultServiceObj = servicesRaw.find((s) => s && s.id === default_selections.service_id) || null;
    const defaultLocationObj = locationsRaw.find((l) => l && l.id === default_selections.location_id) || null;
    const defaultDentistObj = dentistsRaw.find((d) => d && d.id === default_selections.dentist_id) || null;
    const defaultInsuranceObj =
      insurancePlansRaw.find((p) => p && p.id === default_selections.insurance_plan_id) || null;
    const defaultPromotionObj =
      promotionsRaw.find((p) => p && p.id === default_selections.promotion_id) || null;

    const defaultSelectionsWithEntities = {
      ...default_selections,
      service: defaultServiceObj,
      location: defaultLocationObj,
      dentist: defaultDentistObj,
      insurance_plan: defaultInsuranceObj,
      promotion: defaultPromotionObj
    };

    return {
      patient_types,
      age_groups,
      services,
      locations,
      dentists,
      insurance_plans,
      default_selections: defaultSelectionsWithEntities
    };
  }

  // getAvailableAppointmentSlots(locationId, dentistId, serviceId, ageGroup, patientType, dateRange, daysOfWeek, partOfDay, earliestStartTime, latestStartTime, includeFullyBooked)
  getAvailableAppointmentSlots(
    locationId,
    dentistId,
    serviceId,
    ageGroup,
    patientType,
    dateRange,
    daysOfWeek,
    partOfDay,
    earliestStartTime,
    latestStartTime,
    includeFullyBooked
  ) {
    const slots = this._findAvailableSlots({
      locationId,
      dentistId,
      serviceId,
      ageGroup,
      patientType,
      dateRange,
      daysOfWeek,
      partOfDay,
      earliestStartTime,
      latestStartTime,
      includeFullyBooked
    });
    return slots;
  }

  // submitAppointmentRequest
  submitAppointmentRequest(
    sourcePage,
    patientType,
    ageGroup,
    patientAge,
    patientName,
    contactName,
    contactRelationship,
    contactPhone,
    contactEmail,
    serviceId,
    locationId,
    dentistId,
    appointmentSlotId,
    preferredDateTime,
    insurancePlanId,
    promotionId,
    isEmergency,
    isNewPatientPromotion,
    notes
  ) {
    const record = this._persistAppointmentRequest({
      sourcePage,
      patientType,
      ageGroup,
      patientAge,
      patientName,
      contactName,
      contactRelationship,
      contactPhone,
      contactEmail,
      serviceId,
      locationId,
      dentistId,
      appointmentSlotId,
      preferredDateTime,
      insurancePlanId,
      promotionId,
      isEmergency,
      isNewPatientPromotion,
      notes
    });

    const services = this._getFromStorage('services', []);
    const locations = this._getFromStorage('locations', []);
    const dentists = this._getFromStorage('dentists', []);
    const slots = this._getFromStorage('appointment_slots', []);

    const service = services.find((s) => s && s.id === record.service_id) || null;
    const location = locations.find((l) => l && l.id === record.location_id) || null;
    const dentist = record.dentist_id
      ? dentists.find((d) => d && d.id === record.dentist_id) || null
      : null;

    let date_time = '';
    if (record.appointment_slot_id) {
      const slot = slots.find((s) => s && s.id === record.appointment_slot_id) || null;
      date_time = slot ? slot.start_datetime : '';
    } else if (record.preferred_date) {
      date_time = record.preferred_date;
    }

    const ctx = this._getCurrentUserContext();
    ctx.lastPatientType = record.patient_type;
    ctx.lastAgeGroup = record.age_group;
    ctx.lastServiceId = record.service_id;
    ctx.lastLocationId = record.location_id;
    ctx.lastDentistId = record.dentist_id || null;
    ctx.lastInsurancePlanId = record.insurance_plan_id || null;
    this._saveCurrentUserContext(ctx);

    return {
      success: true,
      appointmentRequestId: record.id,
      status: record.status,
      confirmation_message: 'Your appointment request has been submitted. We will confirm shortly.',
      summary: {
        patient_name: record.patient_name,
        service_name: service ? service.name : null,
        location_name: location ? location.name : null,
        dentist_name: dentist ? dentist.full_name : null,
        date_time
      }
    };
  }

  // submitEmergencyMessage
  submitEmergencyMessage(
    conditionType,
    description,
    eventTimeText,
    callbackRequested,
    callbackTimePreference,
    emergencyPhoneNumberDisplayed,
    patientName,
    contactName,
    contactPhone,
    contactEmail
  ) {
    const record = this._persistEmergencyMessage({
      conditionType,
      description,
      eventTimeText,
      callbackRequested,
      callbackTimePreference,
      emergencyPhoneNumberDisplayed,
      patientName,
      contactName,
      contactPhone,
      contactEmail
    });

    return {
      success: true,
      emergencyMessageId: record.id,
      status: record.status,
      confirmation_message: 'Your emergency message has been received. We will contact you as soon as possible.'
    };
  }

  // getPracticeOverview
  getPracticeOverview() {
    const overview = this._getFromStorage('practice_overview', {
      mission: '',
      history: '',
      adult_care_summary: '',
      child_care_summary: '',
      specialties_highlight: [],
      technology_and_safety: ''
    });
    return overview;
  }

  // getLegalPageContent(pageType)
  getLegalPageContent(pageType) {
    const allPages = this._getFromStorage('legal_pages', {});
    const page = allPages && allPages[pageType] ? allPages[pageType] : null;
    if (!page) {
      return {
        title: '',
        last_updated: '',
        content_html: ''
      };
    }
    return {
      title: page.title || '',
      last_updated: page.last_updated || '',
      content_html: page.content_html || ''
    };
  }

  // NO test methods in this class
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
