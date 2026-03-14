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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all entity tables
    const arrayKeys = [
      'clinic_locations',
      'doctors',
      'conditions',
      'appointment_slots',
      'appointment_requests',
      'class_events',
      'class_registrations',
      'education_articles',
      'saved_articles',
      'growth_calculations',
      'insurance_plans',
      'billing_questions',
      'pharmacies',
      'pharmacy_pickup_slots',
      'prescription_refill_requests',
      'patient_forms',
      'new_patient_questionnaires',
      'clinic_announcements'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Simple content/metadata objects
    if (!localStorage.getItem('homepage_content')) {
      const defaultHome = {
        hero_title: 'Pediatric Endocrinology Care for Children and Teens',
        hero_subtitle: 'Specialized care for diabetes, growth, thyroid, and puberty concerns.',
        age_range_text: 'Newborn through 18 years',
        services_highlight: [
          {
            id: 'appointments',
            title: 'Clinic Appointments',
            description: 'New patient and follow-up visits for endocrine conditions.'
          },
          {
            id: 'education',
            title: 'Classes & Education',
            description: 'Group classes on insulin pumps, diabetes management, and more.'
          },
          {
            id: 'resources',
            title: 'Patient Resources',
            description: 'Easy-to-read articles and tools to support your family.'
          }
        ],
        primary_ctas: [
          { key: 'appointments', label: 'Request an Appointment', target_page: 'appointments' },
          { key: 'classes_events', label: 'Classes & Events', target_page: 'classes_events' },
          { key: 'prescription_refills', label: 'Prescription Refills', target_page: 'prescription_refills' },
          { key: 'patient_forms', label: 'Patient Forms', target_page: 'patient_forms' }
        ]
      };
      localStorage.setItem('homepage_content', JSON.stringify(defaultHome));
    }

    if (!localStorage.getItem('tools_overview')) {
      const tools = [
        {
          tool_key: 'growth_calculator',
          name: 'Growth / Height Percentile Calculator',
          description: 'Estimate your child\'s height percentile using standard pediatric growth charts.',
          disclaimer_text: 'This tool is for educational purposes only and does not replace medical advice.'
        },
        {
          tool_key: 'bmi_calculator',
          name: 'BMI Calculator',
          description: 'Calculate body mass index (BMI) for children and teens.',
          disclaimer_text: 'BMI is only one measure of health. Please discuss any concerns with your pediatrician.'
        }
      ];
      localStorage.setItem('tools_overview', JSON.stringify(tools));
    }

    if (!localStorage.getItem('billing_overview')) {
      const billingOverview = {
        billing_overview_text: 'Our billing team is here to help you understand your child\'s pediatric endocrinology bills and insurance coverage.',
        payment_options_text: 'We accept major credit cards, checks, and online payments through our patient portal. Payment is due at the time of service unless other arrangements are made.',
        financial_assistance_text: 'Financial assistance and payment plans may be available for families who qualify. Please contact our billing office for more information.',
        insurance_search_help_text: 'Use the insurance search tool below to see if we accept your plan and to review specialist co-pay information.'
      };
      localStorage.setItem('billing_overview', JSON.stringify(billingOverview));
    }

    if (!localStorage.getItem('about_info')) {
      const aboutInfo = {
        mission_text: 'Our mission is to provide compassionate, evidence-based endocrine care for children and teens, partnering closely with families and primary care providers.',
        pediatric_focus_text: 'We care exclusively for infants, children, and adolescents with hormone-related conditions, including diabetes, growth, thyroid, and puberty concerns.',
        age_range_text: 'We typically see patients from birth through 18 years of age.',
        conditions_overview: 'Our pediatric endocrinology team evaluates and treats diabetes (Type 1 and Type 2), thyroid disorders, growth hormone deficiency, early or delayed puberty, adrenal disorders, pituitary conditions, and other hormonal concerns.'
      };
      localStorage.setItem('about_info', JSON.stringify(aboutInfo));
    }

    if (!localStorage.getItem('contact_info')) {
      const contactInfo = {
        main_phone: '',
        main_fax: '',
        general_email: '',
        general_hours_text: 'Clinic hours vary by location but are generally Monday through Friday, 8:00 AM to 5:00 PM.',
        transportation_notes: 'Public transportation, parking, and accessibility options may vary by clinic location. Please check your appointment reminder for specific directions.'
      };
      localStorage.setItem('contact_info', JSON.stringify(contactInfo));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  _getCurrentDateTime() {
    return new Date().toISOString();
  }

  _getCurrentDate() {
    return this._getCurrentDateTime().slice(0, 10); // YYYY-MM-DD
  }

  _parseDateOnly(dateStr) {
    // dateStr expected YYYY-MM-DD
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00Z');
  }

  _parseDateTime(dateTimeStr) {
    if (!dateTimeStr) return null;
    return new Date(dateTimeStr);
  }

  _extractDatePart(dateTimeStr) {
    if (!dateTimeStr) return null;
    return this._parseDateTime(dateTimeStr).toISOString().slice(0, 10);
  }

  _extractTimePart(dateTimeStr) {
    if (!dateTimeStr) return null;
    return this._parseDateTime(dateTimeStr).toISOString().slice(11, 16); // HH:MM
  }

  _slugifyCode(label) {
    if (!label) return '';
    return String(label)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  _capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  _deduceReasonCodeFromLabel(label) {
    if (!label) return undefined;
    const lower = label.toLowerCase();
    if (lower.indexOf('type 1') !== -1) return 'type_1_diabetes';
    if (lower.indexOf('type 2') !== -1) return 'type_2_diabetes';
    if (lower.indexOf('thyroid') !== -1) return 'thyroid_disorder';
    if (lower.indexOf('growth') !== -1) return 'growth_concern';
    if (lower.indexOf('puberty') !== -1) return 'puberty_concern';
    return 'other';
  }

  _deducePrimaryConcernCode(concernText) {
    if (!concernText) return undefined;
    const lower = concernText.toLowerCase();
    if (lower.indexOf('early puberty') !== -1 || lower.indexOf('precocious') !== -1) return 'early_puberty';
    if (lower.indexOf('growth') !== -1 || lower.indexOf('short') !== -1) return 'growth_concern';
    if (lower.indexOf('thyroid') !== -1) return 'thyroid_concern';
    if (lower.indexOf('diabetes') !== -1 || lower.indexOf('blood sugar') !== -1) return 'diabetes_concern';
    return 'other';
  }

  // ===== Helper for SavedArticleList =====

  _getOrCreateSavedArticleList() {
    const key = 'saved_articles';
    let lists = this._getFromStorage(key, []);
    let saved = null;
    for (let i = 0; i < lists.length; i++) {
      if (lists[i].id === 'default') {
        saved = lists[i];
        break;
      }
    }
    if (!saved) {
      saved = {
        id: 'default',
        article_ids: [],
        last_updated: this._getCurrentDateTime()
      };
      lists.push(saved);
      this._saveToStorage(key, lists);
    }
    return saved;
  }

  // ===== Helper for GrowthCalculation =====

  _calculateHeightPercentileInternal(childSex, childAgeValue, childAgeUnit, heightValue, heightUnit, weightValue, weightUnit) {
    // Simplified, approximate calculation for demonstration purposes only.
    // Converts all inputs to consistent units, then uses a rough model
    // to map height to a percentile (1-99).

    if (!childSex || !childAgeValue || !heightValue) {
      return null;
    }

    let ageYears = childAgeValue;
    if (childAgeUnit === 'months') {
      ageYears = childAgeValue / 12.0;
    }

    let heightCm = heightValue;
    if (heightUnit === 'in') {
      heightCm = heightValue * 2.54;
    }

    // Very rough sex-specific baseline: mean height in cm ~= 6 * ageYears + offset
    let offset;
    if (childSex === 'female') {
      offset = 65; // approximate starting point
    } else if (childSex === 'male') {
      offset = 67;
    } else {
      offset = 66;
    }

    const mean = 6 * ageYears + offset;
    const sd = 5.0; // rough standard deviation in cm
    const z = (heightCm - mean) / sd;

    // Approximate normal CDF using logistic transform
    const percentileApprox = 50 + 40 * Math.tanh(z / 1.5);
    let percentile = Math.round(percentileApprox);
    if (percentile < 1) percentile = 1;
    if (percentile > 99) percentile = 99;

    return percentile;
  }

  _persistGrowthCalculation(calculationInput) {
    const calculations = this._getFromStorage('growth_calculations', []);
    const id = this._generateId('growth');
    const record = {
      id: id,
      child_sex: calculationInput.child_sex,
      child_age_value: calculationInput.child_age_value,
      child_age_unit: calculationInput.child_age_unit,
      height_value: calculationInput.height_value,
      height_unit: calculationInput.height_unit,
      weight_value: calculationInput.weight_value != null ? calculationInput.weight_value : undefined,
      weight_unit: calculationInput.weight_unit != null ? calculationInput.weight_unit : undefined,
      height_percentile: calculationInput.height_percentile,
      result_notes: calculationInput.result_notes,
      created_at: this._getCurrentDateTime()
    };
    calculations.push(record);
    this._saveToStorage('growth_calculations', calculations);
    return record;
  }

  // ===== Foreign key resolution helpers =====

  _attachAppointmentSlotRelations(slot) {
    if (!slot) return null;
    const doctors = this._getFromStorage('doctors', []);
    const locations = this._getFromStorage('clinic_locations', []);
    const provider = doctors.find(function (d) { return d.id === slot.provider_id; }) || null;
    const location = locations.find(function (l) { return l.id === slot.location_id; }) || null;
    const enriched = Object.assign({}, slot);
    enriched.provider = provider;
    enriched.location = location;
    return enriched;
  }

  _attachDoctorRelations(doctor) {
    if (!doctor) return null;
    const locations = this._getFromStorage('clinic_locations', []);
    const conditions = this._getFromStorage('conditions', []);
    const primaryLocation = locations.find(function (l) { return l.id === doctor.primary_location_id; }) || null;
    const conditionIds = Array.isArray(doctor.conditions_treated_ids) ? doctor.conditions_treated_ids : [];
    const treatedConditions = [];
    for (let i = 0; i < conditions.length; i++) {
      if (conditionIds.indexOf(conditions[i].id) !== -1) {
        treatedConditions.push(conditions[i]);
      }
    }
    const enriched = Object.assign({}, doctor);
    enriched.primary_location = primaryLocation;
    enriched.conditions_treated = treatedConditions;
    return enriched;
  }

  _attachClassEventRelations(event) {
    if (!event) return null;
    const locations = this._getFromStorage('clinic_locations', []);
    const location = locations.find(function (l) { return l.id === event.location_id; }) || null;
    const enriched = Object.assign({}, event);
    enriched.location = location;
    return enriched;
  }

  _attachPharmacyPickupSlotRelations(slot) {
    if (!slot) return null;
    const pharmacies = this._getFromStorage('pharmacies', []);
    const pharmacy = pharmacies.find(function (p) { return p.id === slot.pharmacy_id; }) || null;
    const enriched = Object.assign({}, slot);
    enriched.pharmacy = pharmacy;
    return enriched;
  }

  _attachBillingQuestionRelations(question) {
    if (!question) return null;
    const plans = this._getFromStorage('insurance_plans', []);
    const plan = question.insurance_plan_id
      ? (plans.find(function (p) { return p.id === question.insurance_plan_id; }) || null)
      : null;
    const enriched = Object.assign({}, question);
    enriched.insurance_plan = plan;
    return enriched;
  }

  _attachPrescriptionRefillRelations(refill) {
    if (!refill) return null;
    const pharmacies = this._getFromStorage('pharmacies', []);
    const slots = this._getFromStorage('pharmacy_pickup_slots', []);
    const pharmacy = pharmacies.find(function (p) { return p.id === refill.pharmacy_id; }) || null;
    const pickupSlot = refill.pickup_slot_id
      ? (slots.find(function (s) { return s.id === refill.pickup_slot_id; }) || null)
      : null;
    const enriched = Object.assign({}, refill);
    enriched.pharmacy = pharmacy;
    enriched.pickup_slot = pickupSlot;
    return enriched;
  }

  _attachQuestionnaireRelations(questionnaire) {
    if (!questionnaire) return null;
    const forms = this._getFromStorage('patient_forms', []);
    const form = questionnaire.patient_form_id
      ? (forms.find(function (f) { return f.id === questionnaire.patient_form_id; }) || null)
      : null;
    const enriched = Object.assign({}, questionnaire);
    enriched.patient_form = form;
    return enriched;
  }

  // ============================
  // Interface implementations
  // ============================

  // getHomePageContent()
  getHomePageContent() {
    const content = this._getFromStorage('homepage_content', {
      hero_title: '',
      hero_subtitle: '',
      age_range_text: '',
      services_highlight: [],
      primary_ctas: []
    });

    const conditions = this._getFromStorage('conditions', []);
    const featuredSlugs = ['type_1_diabetes', 'thyroid_disorders', 'growth_hormone_deficiency'];
    const featuredConditions = [];
    for (let i = 0; i < conditions.length; i++) {
      if (featuredSlugs.indexOf(conditions[i].slug) !== -1) {
        featuredConditions.push(conditions[i]);
      }
    }

    return {
      hero_title: content.hero_title || '',
      hero_subtitle: content.hero_subtitle || '',
      age_range_text: content.age_range_text || '',
      services_highlight: Array.isArray(content.services_highlight) ? content.services_highlight : [],
      featured_conditions: featuredConditions,
      primary_ctas: Array.isArray(content.primary_ctas) ? content.primary_ctas : []
    };
  }

  // getClinicAnnouncements()
  getClinicAnnouncements() {
    const announcements = this._getFromStorage('clinic_announcements', []);
    const nowIso = this._getCurrentDateTime();
    const now = this._parseDateTime(nowIso);
    const active = [];

    for (let i = 0; i < announcements.length; i++) {
      const a = announcements[i];
      const start = a.start_datetime ? this._parseDateTime(a.start_datetime) : null;
      const end = a.end_datetime ? this._parseDateTime(a.end_datetime) : null;
      let withinWindow = true;
      if (start && now < start) withinWindow = false;
      if (end && now > end) withinWindow = false;
      const isActive = (a.is_active === true) && withinWindow;
      if (isActive) {
        active.push(a);
      }
    }

    return active;
  }

  // getAppointmentPageOverview()
  getAppointmentPageOverview() {
    const locations = this._getFromStorage('clinic_locations', []);
    const contactInfo = this._getFromStorage('contact_info', {
      general_hours_text: '',
      main_phone: '',
      main_fax: '',
      general_email: '',
      transportation_notes: ''
    });

    const appointmentTypes = [
      {
        code: 'new_patient',
        label: 'New Patient Visit',
        description: 'First-time visit for children referred for endocrine evaluation.'
      },
      {
        code: 'follow_up',
        label: 'Follow-Up Visit',
        description: 'Return visit to review labs, adjust treatment, or monitor progress.'
      },
      {
        code: 'telehealth',
        label: 'Telehealth Visit',
        description: 'Video visits when appropriate, depending on condition and insurance.'
      }
    ];

    const instructions = 'To request an appointment, choose the visit type, location, and a preferred date and time. Our schedulers will confirm your appointment by phone or email.';

    return {
      appointment_types: appointmentTypes,
      locations: locations,
      general_hours_text: contactInfo.general_hours_text || '',
      instructions_text: instructions
    };
  }

  // getNewPatientVisitFormOptions()
  getNewPatientVisitFormOptions() {
    const locations = this._getFromStorage('clinic_locations', []);
    const today = this._getCurrentDate();
    const maxDays = 180; // generic maximum date range
    const todayDate = this._parseDateOnly(today);
    const latestDateObj = new Date(todayDate.getTime() + maxDays * 24 * 60 * 60 * 1000);
    const latestDate = latestDateObj.toISOString().slice(0, 10);

    const reasonOptions = [
      { label: 'Type 1 Diabetes', code: 'type_1_diabetes' },
      { label: 'Type 2 Diabetes', code: 'type_2_diabetes' },
      { label: 'Thyroid Disorders', code: 'thyroid_disorder' },
      { label: 'Growth Concern', code: 'growth_concern' },
      { label: 'Puberty Concern', code: 'puberty_concern' },
      { label: 'Other Endocrine Concern', code: 'other' }
    ];

    return {
      reason_for_visit_options: reasonOptions,
      location_options: locations,
      default_appointment_type: 'new_patient',
      date_constraints: {
        earliest_date: today,
        latest_date: latestDate
      }
    };
  }

  // searchAvailableAppointmentSlots(locationId, appointmentType, startDate, endDate, isMorningOnly)
  searchAvailableAppointmentSlots(locationId, appointmentType, startDate, endDate, isMorningOnly) {
    const slots = this._getFromStorage('appointment_slots', []);
    const result = [];

    const startDateObj = this._parseDateOnly(startDate);
    const endDateObj = this._parseDateOnly(endDate);

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (slot.location_id !== locationId) continue;
      if (slot.appointment_type !== appointmentType) continue;
      if (slot.status !== 'available') continue;
      if (isMorningOnly === true && slot.is_morning_slot !== true) continue;

      const slotDate = this._parseDateTime(slot.start_datetime);
      if (startDateObj && slotDate < startDateObj) continue;
      if (endDateObj && slotDate > endDateObj) continue;

      result.push(this._attachAppointmentSlotRelations(slot));
    }

    result.sort(function (a, b) {
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      return da - db;
    });

    return result;
  }

  // submitAppointmentRequest(...)
  submitAppointmentRequest(
    appointmentType,
    reasonForVisitLabel,
    reasonForVisitCode,
    locationId,
    appointmentSlotId,
    requestedStartDatetime,
    childName,
    childDateOfBirth,
    parentGuardianName,
    parentGuardianPhone,
    parentGuardianEmail,
    notes
  ) {
    const requests = this._getFromStorage('appointment_requests', []);

    const reasonCode = reasonForVisitCode || this._deduceReasonCodeFromLabel(reasonForVisitLabel);

    const record = {
      id: this._generateId('apptreq'),
      appointment_type: appointmentType,
      reason_for_visit_label: reasonForVisitLabel,
      reason_for_visit_code: reasonCode,
      other_reason_text: reasonCode === 'other' ? reasonForVisitLabel : undefined,
      location_id: locationId,
      appointment_slot_id: appointmentSlotId || null,
      requested_start_datetime: requestedStartDatetime,
      child_name: childName,
      child_date_of_birth: childDateOfBirth,
      parent_guardian_name: parentGuardianName,
      parent_guardian_phone: parentGuardianPhone,
      parent_guardian_email: parentGuardianEmail,
      status: 'submitted',
      created_at: this._getCurrentDateTime(),
      notes: notes || undefined
    };

    requests.push(record);
    this._saveToStorage('appointment_requests', requests);

    // Optionally update appointment slot status to held
    if (appointmentSlotId) {
      const slots = this._getFromStorage('appointment_slots', []);
      let updated = false;
      for (let i = 0; i < slots.length; i++) {
        if (slots[i].id === appointmentSlotId && slots[i].status === 'available') {
          slots[i].status = 'held';
          updated = true;
          break;
        }
      }
      if (updated) {
        this._saveToStorage('appointment_slots', slots);
      }
    }

    // Attach foreign key relations
    const locations = this._getFromStorage('clinic_locations', []);
    const slotsFull = this._getFromStorage('appointment_slots', []);
    const location = locations.find(function (l) { return l.id === record.location_id; }) || null;
    const appointmentSlot = record.appointment_slot_id
      ? (slotsFull.find(function (s) { return s.id === record.appointment_slot_id; }) || null)
      : null;

    const enriched = Object.assign({}, record, {
      location: location,
      appointment_slot: appointmentSlot
    });

    return {
      success: true,
      appointmentRequest: enriched,
      message: 'Appointment request submitted.'
    };
  }

  // getDoctorFilterOptions()
  getDoctorFilterOptions() {
    const conditions = this._getFromStorage('conditions', []);
    const locations = this._getFromStorage('clinic_locations', []);
    const doctors = this._getFromStorage('doctors', []);

    // Languages derived from doctors.languages_spoken
    const languageMap = {};
    for (let i = 0; i < doctors.length; i++) {
      const langs = Array.isArray(doctors[i].languages_spoken) ? doctors[i].languages_spoken : [];
      for (let j = 0; j < langs.length; j++) {
        const code = String(langs[j]).toLowerCase();
        if (!languageMap[code]) {
          languageMap[code] = {
            code: code,
            label: this._capitalize(code)
          };
        }
      }
    }
    const languages = [];
    for (const k in languageMap) {
      if (Object.prototype.hasOwnProperty.call(languageMap, k)) {
        languages.push(languageMap[k]);
      }
    }

    const experienceRanges = [
      { min_years: 0, max_years: 4, label: '0–4 years' },
      { min_years: 5, max_years: 9, label: '5–9 years' },
      { min_years: 10, max_years: 99, label: '10+ years' }
    ];

    const sortOptions = [
      { code: 'last_name_az', label: 'A–Z by Last Name' },
      { code: 'experience_desc', label: 'Most Experience' }
    ];

    return {
      conditions: conditions,
      languages: languages,
      experience_ranges: experienceRanges,
      locations: locations,
      sort_options: sortOptions
    };
  }

  // searchDoctors(filters, sortBy)
  searchDoctors(filters, sortBy) {
    const doctorsRaw = this._getFromStorage('doctors', []);
    const conditions = this._getFromStorage('conditions', []);
    const locations = this._getFromStorage('clinic_locations', []);

    const f = filters || {};
    let result = [];

    for (let i = 0; i < doctorsRaw.length; i++) {
      const d = doctorsRaw[i];

      if (f.conditionId) {
        const ids = Array.isArray(d.conditions_treated_ids) ? d.conditions_treated_ids : [];
        if (ids.indexOf(f.conditionId) === -1) continue;
      }

      if (f.languageCode) {
        const langs = Array.isArray(d.languages_spoken) ? d.languages_spoken : [];
        if (langs.map(function (x) { return String(x).toLowerCase(); }).indexOf(String(f.languageCode).toLowerCase()) === -1) {
          continue;
        }
      }

      if (typeof f.minYearsExperience === 'number') {
        if (d.years_of_experience < f.minYearsExperience) continue;
      }

      if (typeof f.maxYearsExperience === 'number') {
        if (d.years_of_experience > f.maxYearsExperience) continue;
      }

      if (f.locationId) {
        if (d.primary_location_id !== f.locationId) continue;
      }

      if (typeof f.isAcceptingNewPatients === 'boolean') {
        if ((d.is_accepting_new_patients === true) !== (f.isAcceptingNewPatients === true)) continue;
      }

      result.push(d);
    }

    // Sorting
    const sortCode = sortBy || 'last_name_az';
    if (sortCode === 'last_name_az') {
      result.sort(function (a, b) {
        const la = (a.last_name || '').toLowerCase();
        const lb = (b.last_name || '').toLowerCase();
        if (la < lb) return -1;
        if (la > lb) return 1;
        return 0;
      });
    } else if (sortCode === 'experience_desc') {
      result.sort(function (a, b) {
        return (b.years_of_experience || 0) - (a.years_of_experience || 0);
      });
    }

    // Attach foreign key relations
    const finalResult = [];
    for (let i = 0; i < result.length; i++) {
      const d = result[i];
      const primaryLocation = locations.find(function (l) { return l.id === d.primary_location_id; }) || null;
      const condIds = Array.isArray(d.conditions_treated_ids) ? d.conditions_treated_ids : [];
      const treated = [];
      for (let j = 0; j < conditions.length; j++) {
        if (condIds.indexOf(conditions[j].id) !== -1) {
          treated.push(conditions[j]);
        }
      }
      const enriched = Object.assign({}, d, {
        primary_location: primaryLocation,
        conditions_treated: treated
      });
      finalResult.push(enriched);
    }

    return finalResult;
  }

  // getDoctorProfile(doctorId)
  getDoctorProfile(doctorId) {
    const doctors = this._getFromStorage('doctors', []);
    const locations = this._getFromStorage('clinic_locations', []);
    const conditions = this._getFromStorage('conditions', []);

    const doctor = doctors.find(function (d) { return d.id === doctorId; }) || null;
    if (!doctor) {
      return {
        doctor: null,
        primary_location: null,
        conditions_treated: [],
        map_embed_allowed: false
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task2_selectedDoctorId', doctorId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const primaryLocation = locations.find(function (l) { return l.id === doctor.primary_location_id; }) || null;
    const condIds = Array.isArray(doctor.conditions_treated_ids) ? doctor.conditions_treated_ids : [];
    const treated = [];
    for (let i = 0; i < conditions.length; i++) {
      if (condIds.indexOf(conditions[i].id) !== -1) {
        treated.push(conditions[i]);
      }
    }

    const mapAllowed = !!(primaryLocation && primaryLocation.latitude != null && primaryLocation.longitude != null);

    return {
      doctor: doctor,
      primary_location: primaryLocation,
      conditions_treated: treated,
      map_embed_allowed: mapAllowed
    };
  }

  // getClassFilterOptions()
  getClassFilterOptions() {
    const events = this._getFromStorage('class_events', []);
    const topicMap = {};

    for (let i = 0; i < events.length; i++) {
      const topicLabel = events[i].topic || '';
      if (!topicLabel) continue;
      const code = this._slugifyCode(topicLabel);
      if (!topicMap[code]) {
        topicMap[code] = {
          code: code,
          label: topicLabel
        };
      }
    }

    const topics = [];
    for (const k in topicMap) {
      if (Object.prototype.hasOwnProperty.call(topicMap, k)) {
        topics.push(topicMap[k]);
      }
    }

    const datePresets = [
      { code: 'next_30_days', label: 'Next 30 days' },
      { code: 'next_60_days', label: 'Next 60 days' }
    ];

    const timeOfDayOptions = [
      { code: 'any', label: 'Any time of day' },
      { code: 'evening_after_5pm', label: 'Evening classes (5:00 PM or later)' }
    ];

    return {
      topics: topics,
      date_presets: datePresets,
      time_of_day_options: timeOfDayOptions
    };
  }

  // searchClassEvents(topicCode, startDate, endDate, minStartTime, onlyRegistrationOpen)
  searchClassEvents(topicCode, startDate, endDate, minStartTime, onlyRegistrationOpen) {
    const eventsRaw = this._getFromStorage('class_events', []);
    const startDateObj = this._parseDateOnly(startDate);
    const endDateObj = this._parseDateOnly(endDate);
    const onlyOpen = (onlyRegistrationOpen === undefined || onlyRegistrationOpen === null) ? true : !!onlyRegistrationOpen;

    const result = [];

    for (let i = 0; i < eventsRaw.length; i++) {
      const e = eventsRaw[i];

      if (topicCode) {
        const code = this._slugifyCode(e.topic || '');
        if (code !== topicCode) continue;
      }

      const start = this._parseDateTime(e.start_datetime);
      if (startDateObj && start < startDateObj) continue;
      if (endDateObj && start > endDateObj) continue;

      if (minStartTime) {
        const timePart = this._extractTimePart(e.start_datetime); // HH:MM
        if (timePart && timePart < minStartTime) continue;
      }

      if (onlyOpen && e.registration_open !== true) continue;

      result.push(this._attachClassEventRelations(e));
    }

    result.sort(function (a, b) {
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      return da - db;
    });

    return result;
  }

  // getClassEventDetails(classEventId)
  getClassEventDetails(classEventId) {
    const events = this._getFromStorage('class_events', []);
    const locations = this._getFromStorage('clinic_locations', []);

    const event = events.find(function (e) { return e.id === classEventId; }) || null;
    if (!event) {
      return {
        classEvent: null,
        location: null
      };
    }

    const location = event.location_id
      ? (locations.find(function (l) { return l.id === event.location_id; }) || null)
      : null;

    return {
      classEvent: event,
      location: location
    };
  }

  // submitClassRegistration(...)
  submitClassRegistration(
    classEventId,
    childName,
    childDateOfBirth,
    childConditionLabel,
    childConditionCode,
    parentGuardianName,
    parentGuardianPhone,
    parentGuardianEmail,
    attendeeCount,
    consentAccepted,
    notes
  ) {
    const registrations = this._getFromStorage('class_registrations', []);

    const record = {
      id: this._generateId('classreg'),
      class_event_id: classEventId,
      child_name: childName,
      child_date_of_birth: childDateOfBirth,
      child_condition_label: childConditionLabel || undefined,
      child_condition_code: childConditionCode || undefined,
      parent_guardian_name: parentGuardianName,
      parent_guardian_phone: parentGuardianPhone,
      parent_guardian_email: parentGuardianEmail,
      attendee_count: typeof attendeeCount === 'number' ? attendeeCount : undefined,
      consent_accepted: !!consentAccepted,
      status: 'submitted',
      created_at: this._getCurrentDateTime(),
      notes: notes || undefined
    };

    registrations.push(record);
    this._saveToStorage('class_registrations', registrations);

    const events = this._getFromStorage('class_events', []);
    const event = events.find(function (e) { return e.id === classEventId; }) || null;
    const enriched = Object.assign({}, record, {
      class_event: event
    });

    return {
      success: true,
      classRegistration: enriched,
      message: 'Class registration submitted.'
    };
  }

  // getEducationFilterOptions()
  getEducationFilterOptions() {
    const articles = this._getFromStorage('education_articles', []);
    const topicMap = {};

    for (let i = 0; i < articles.length; i++) {
      const t = articles[i].topic || '';
      if (!t) continue;
      const code = this._slugifyCode(t);
      if (!topicMap[code]) {
        topicMap[code] = {
          code: code,
          label: t
        };
      }
    }

    const topics = [];
    for (const k in topicMap) {
      if (Object.prototype.hasOwnProperty.call(topicMap, k)) {
        topics.push(topicMap[k]);
      }
    }

    const publicationPresets = [
      { code: 'past_6_months', label: 'Past 6 months' },
      { code: 'past_1_year', label: 'Past year' },
      { code: 'past_2_years', label: 'Past 2 years' }
    ];

    const readingLevels = [
      { code: 'easy', label: 'Easy' },
      { code: 'intermediate', label: 'Intermediate' },
      { code: 'advanced', label: 'Advanced' }
    ];

    const audiences = [
      { code: 'parent', label: 'Parents & caregivers' },
      { code: 'teen', label: 'Teens' },
      { code: 'child', label: 'Children' },
      { code: 'clinician', label: 'Clinicians' },
      { code: 'general', label: 'General audience' }
    ];

    return {
      topics: topics,
      publication_date_presets: publicationPresets,
      reading_levels: readingLevels,
      audiences: audiences
    };
  }

  // searchEducationArticles(query, filters)
  searchEducationArticles(query, filters) {
    const articles = this._getFromStorage('education_articles', []);
    const f = filters || {};
    const q = query ? String(query).toLowerCase() : '';

    const startDate = f.startPublicationDate ? this._parseDateOnly(f.startPublicationDate) : null;
    const endDate = f.endPublicationDate ? this._parseDateOnly(f.endPublicationDate) : null;

    const result = [];

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];

      if (q) {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const content = (a.content_html || '').toLowerCase();
        const tags = Array.isArray(a.tags) ? a.tags.join(' ').toLowerCase() : '';
        if (title.indexOf(q) === -1 && summary.indexOf(q) === -1 && content.indexOf(q) === -1 && tags.indexOf(q) === -1) {
          continue;
        }
      }

      if (f.topicCode) {
        const code = this._slugifyCode(a.topic || '');
        if (code !== f.topicCode) continue;
      }

      if (startDate || endDate) {
        const pub = this._parseDateTime(a.publication_date);
        if (startDate && pub < startDate) continue;
        if (endDate && pub > endDate) continue;
      }

      if (f.readingLevel) {
        if (a.reading_level !== f.readingLevel) continue;
      }

      if (f.audience) {
        if (a.audience !== f.audience) continue;
      }

      result.push(a);
    }

    result.sort(function (a, b) {
      const da = new Date(a.publication_date).getTime();
      const db = new Date(b.publication_date).getTime();
      return db - da;
    });

    return result;
  }

  // getEducationArticleDetail(articleId)
  getEducationArticleDetail(articleId) {
    const articles = this._getFromStorage('education_articles', []);
    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    return article;
  }

  // getSavedArticlesList()
  getSavedArticlesList() {
    const savedList = this._getOrCreateSavedArticleList();
    const articles = this._getFromStorage('education_articles', []);
    const savedArticles = [];
    const ids = Array.isArray(savedList.article_ids) ? savedList.article_ids : [];

    for (let i = 0; i < ids.length; i++) {
      const art = articles.find(function (a) { return a.id === ids[i]; });
      if (art) {
        savedArticles.push(art);
      }
    }

    return {
      savedList: savedList,
      articles: savedArticles
    };
  }

  // saveArticleToSavedList(articleId)
  saveArticleToSavedList(articleId) {
    const key = 'saved_articles';
    let lists = this._getFromStorage(key, []);
    let saved = null;

    for (let i = 0; i < lists.length; i++) {
      if (lists[i].id === 'default') {
        saved = lists[i];
        break;
      }
    }

    if (!saved) {
      saved = {
        id: 'default',
        article_ids: [],
        last_updated: this._getCurrentDateTime()
      };
      lists.push(saved);
    }

    if (!Array.isArray(saved.article_ids)) {
      saved.article_ids = [];
    }

    if (saved.article_ids.indexOf(articleId) === -1) {
      saved.article_ids.push(articleId);
      saved.last_updated = this._getCurrentDateTime();
      this._saveToStorage(key, lists);
    }

    return {
      success: true,
      savedList: saved,
      message: 'Article saved.'
    };
  }

  // removeArticleFromSavedList(articleId)
  removeArticleFromSavedList(articleId) {
    const key = 'saved_articles';
    let lists = this._getFromStorage(key, []);
    let saved = null;

    for (let i = 0; i < lists.length; i++) {
      if (lists[i].id === 'default') {
        saved = lists[i];
        break;
      }
    }

    if (!saved) {
      // Nothing to remove
      return {
        success: true,
        savedList: null,
        message: 'No saved list found.'
      };
    }

    if (!Array.isArray(saved.article_ids)) {
      saved.article_ids = [];
    }

    const index = saved.article_ids.indexOf(articleId);
    if (index !== -1) {
      saved.article_ids.splice(index, 1);
      saved.last_updated = this._getCurrentDateTime();
      this._saveToStorage(key, lists);
    }

    return {
      success: true,
      savedList: saved,
      message: 'Article removed from saved list.'
    };
  }

  // getToolsOverview()
  getToolsOverview() {
    const tools = this._getFromStorage('tools_overview', []);
    return tools;
  }

  // calculateGrowthPercentile(...)
  calculateGrowthPercentile(
    childSex,
    childAgeValue,
    childAgeUnit,
    heightValue,
    heightUnit,
    weightValue,
    weightUnit
  ) {
    const percentile = this._calculateHeightPercentileInternal(
      childSex,
      childAgeValue,
      childAgeUnit,
      heightValue,
      heightUnit,
      weightValue,
      weightUnit
    );

    let note;
    if (percentile === null) {
      note = 'Unable to calculate percentile. Please check the values entered and try again.';
    } else {
      note = 'Estimated height percentile: ' + percentile + 'th percentile. This tool is for educational purposes only and does not replace medical advice.';
    }

    const record = this._persistGrowthCalculation({
      child_sex: childSex,
      child_age_value: childAgeValue,
      child_age_unit: childAgeUnit,
      height_value: heightValue,
      height_unit: heightUnit,
      weight_value: weightValue,
      weight_unit: weightUnit,
      height_percentile: percentile,
      result_notes: note
    });

    return {
      calculation: record,
      message: note
    };
  }

  // getGrowthCalculationPrintData(calculationId)
  getGrowthCalculationPrintData(calculationId) {
    const calculations = this._getFromStorage('growth_calculations', []);
    const calc = calculations.find(function (c) { return c.id === calculationId; }) || null;

    // Instrumentation for task completion tracking
    try {
      if (calc != null) {
        localStorage.setItem('task5_printViewCalculationId', calculationId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      calculation: calc,
      print_instructions: 'Use your browser\'s Print option to print this page.'
    };
  }

  // getBillingAndInsuranceOverview()
  getBillingAndInsuranceOverview() {
    const overview = this._getFromStorage('billing_overview', {
      billing_overview_text: '',
      payment_options_text: '',
      financial_assistance_text: '',
      insurance_search_help_text: ''
    });

    return {
      billing_overview_text: overview.billing_overview_text || '',
      payment_options_text: overview.payment_options_text || '',
      financial_assistance_text: overview.financial_assistance_text || '',
      insurance_search_help_text: overview.insurance_search_help_text || ''
    };
  }

  // getInsuranceFilterOptions()
  getInsuranceFilterOptions() {
    return {
      search_placeholder: 'Search by insurance name or plan code'
    };
  }

  // searchInsurancePlans(query)
  searchInsurancePlans(query) {
    const plans = this._getFromStorage('insurance_plans', []);
    const q = query ? String(query).toLowerCase() : '';

    if (!q) {
      return plans;
    }

    const result = [];
    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      const name = (p.name || '').toLowerCase();
      const code = (p.plan_code || '').toLowerCase();
      if (name.indexOf(q) !== -1 || code.indexOf(q) !== -1) {
        result.push(p);
      }
    }

    return result;
  }

  // getInsurancePlanDetail(insurancePlanId)
  getInsurancePlanDetail(insurancePlanId) {
    const plans = this._getFromStorage('insurance_plans', []);
    const plan = plans.find(function (p) { return p.id === insurancePlanId; }) || null;
    return plan;
  }

  // submitBillingQuestion(...)
  submitBillingQuestion(
    insurancePlanId,
    subject,
    message,
    contactName,
    contactPhone,
    contactEmail
  ) {
    const questions = this._getFromStorage('billing_questions', []);

    const record = {
      id: this._generateId('billq'),
      insurance_plan_id: insurancePlanId || undefined,
      subject: subject || undefined,
      message: message,
      contact_name: contactName,
      contact_phone: contactPhone || undefined,
      contact_email: contactEmail,
      created_at: this._getCurrentDateTime(),
      status: 'submitted'
    };

    questions.push(record);
    this._saveToStorage('billing_questions', questions);

    const enriched = this._attachBillingQuestionRelations(record);

    return {
      success: true,
      billingQuestion: enriched,
      message: 'Billing question submitted.'
    };
  }

  // getPrescriptionRefillFormOptions()
  getPrescriptionRefillFormOptions() {
    const patientTypes = [
      { code: 'existing_patient', label: 'Existing patient' },
      { code: 'new_patient', label: 'New patient' }
    ];

    const instructions = 'Use this form to request a refill for prescriptions originally written by our pediatric endocrinology providers. For urgent medication issues, please call the clinic.';

    return {
      patient_types: patientTypes,
      instructions_text: instructions
    };
  }

  // searchNearbyPharmacies(postalCode, maxDistanceMiles)
  searchNearbyPharmacies(postalCode, maxDistanceMiles) {
    const pharmacies = this._getFromStorage('pharmacies', []);
    const result = [];
    const maxDist = typeof maxDistanceMiles === 'number' ? maxDistanceMiles : null;

    for (let i = 0; i < pharmacies.length; i++) {
      const p = pharmacies[i];
      if (postalCode && p.postal_code !== postalCode) {
        continue;
      }
      if (maxDist != null && typeof p.distance_miles === 'number' && p.distance_miles > maxDist) {
        continue;
      }
      result.push(p);
    }

    result.sort(function (a, b) {
      const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
      const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
      return da - db;
    });

    return result;
  }

  // getPharmacyPickupSlots(pharmacyId, date)
  getPharmacyPickupSlots(pharmacyId, date) {
    const slots = this._getFromStorage('pharmacy_pickup_slots', []);
    const dateStr = date || this._getCurrentDate();
    const result = [];

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.pharmacy_id !== pharmacyId) continue;
      if (s.status !== 'available') continue;
      const slotDate = this._extractDatePart(s.start_datetime);
      if (slotDate !== dateStr) continue;
      result.push(this._attachPharmacyPickupSlotRelations(s));
    }

    result.sort(function (a, b) {
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      return da - db;
    });

    return result;
  }

  // submitPrescriptionRefillRequest(...)
  submitPrescriptionRefillRequest(
    patientType,
    medicationName,
    medicationStrength,
    medicationForm,
    quantity,
    pharmacyId,
    pickupSlotId,
    requestedPickupDatetime,
    patientName,
    patientDateOfBirth,
    parentGuardianName,
    contactPhone,
    contactEmail,
    notes
  ) {
    const refills = this._getFromStorage('prescription_refill_requests', []);

    const record = {
      id: this._generateId('rxrefill'),
      patient_type: patientType,
      medication_name: medicationName,
      medication_strength: medicationStrength || undefined,
      medication_form: medicationForm || undefined,
      quantity: quantity,
      pharmacy_id: pharmacyId,
      pickup_slot_id: pickupSlotId || undefined,
      requested_pickup_datetime: requestedPickupDatetime || undefined,
      patient_name: patientName,
      patient_date_of_birth: patientDateOfBirth,
      parent_guardian_name: parentGuardianName || undefined,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      created_at: this._getCurrentDateTime(),
      status: 'submitted',
      notes: notes || undefined
    };

    refills.push(record);
    this._saveToStorage('prescription_refill_requests', refills);

    const enriched = this._attachPrescriptionRefillRelations(record);

    return {
      success: true,
      prescriptionRefillRequest: enriched,
      message: 'Prescription refill request submitted.'
    };
  }

  // getPatientFormsList()
  getPatientFormsList() {
    const forms = this._getFromStorage('patient_forms', []);
    return forms;
  }

  // getPatientFormDetail(patientFormId)
  getPatientFormDetail(patientFormId) {
    const forms = this._getFromStorage('patient_forms', []);
    const form = forms.find(function (f) { return f.id === patientFormId; }) || null;
    return form;
  }

  // submitNewPatientQuestionnaire(...)
  submitNewPatientQuestionnaire(
    patientFormId,
    childName,
    childDateOfBirth,
    childSex,
    primaryConcernText,
    primaryConcernCode,
    parentGuardianName,
    parentGuardianPhone,
    parentGuardianEmail,
    referringProviderName,
    upcomingVisitDate,
    hasPreviousEndocrineVisits,
    allergiesDescription,
    medicationList
  ) {
    const questionnaires = this._getFromStorage('new_patient_questionnaires', []);

    const concernCode = primaryConcernCode || this._deducePrimaryConcernCode(primaryConcernText);

    const record = {
      id: this._generateId('npq'),
      patient_form_id: patientFormId || undefined,
      child_name: childName,
      child_date_of_birth: childDateOfBirth,
      child_sex: childSex,
      primary_concern_text: primaryConcernText,
      primary_concern_code: concernCode || undefined,
      parent_guardian_name: parentGuardianName,
      parent_guardian_phone: parentGuardianPhone,
      parent_guardian_email: parentGuardianEmail,
      referring_provider_name: referringProviderName || undefined,
      upcoming_visit_date: upcomingVisitDate,
      has_previous_endocrine_visits: typeof hasPreviousEndocrineVisits === 'boolean' ? hasPreviousEndocrineVisits : undefined,
      allergies_description: allergiesDescription || undefined,
      medication_list: medicationList || undefined,
      created_at: this._getCurrentDateTime(),
      status: 'submitted'
    };

    questionnaires.push(record);
    this._saveToStorage('new_patient_questionnaires', questionnaires);

    const enriched = this._attachQuestionnaireRelations(record);

    return {
      success: true,
      questionnaireSubmission: enriched,
      message: 'New patient questionnaire submitted.'
    };
  }

  // getClinicAboutInfo()
  getClinicAboutInfo() {
    const about = this._getFromStorage('about_info', {
      mission_text: '',
      pediatric_focus_text: '',
      age_range_text: '',
      conditions_overview: ''
    });

    return {
      mission_text: about.mission_text || '',
      pediatric_focus_text: about.pediatric_focus_text || '',
      age_range_text: about.age_range_text || '',
      conditions_overview: about.conditions_overview || ''
    };
  }

  // getClinicContactInfo()
  getClinicContactInfo() {
    const locations = this._getFromStorage('clinic_locations', []);
    const contactInfo = this._getFromStorage('contact_info', {
      main_phone: '',
      main_fax: '',
      general_email: '',
      general_hours_text: '',
      transportation_notes: ''
    });

    return {
      locations: locations,
      main_phone: contactInfo.main_phone || '',
      main_fax: contactInfo.main_fax || '',
      general_email: contactInfo.general_email || '',
      general_hours_text: contactInfo.general_hours_text || '',
      transportation_notes: contactInfo.transportation_notes || ''
    };
  }

  // =====================
  // End of class
  // =====================
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
