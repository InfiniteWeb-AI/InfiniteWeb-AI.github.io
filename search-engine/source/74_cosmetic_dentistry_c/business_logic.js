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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const arrayKeys = [
      'treatment_categories',
      'treatments',
      'clinics',
      'dentists',
      'offers',
      'smile_gallery_cases',
      'favorites',
      'case_inquiries',
      'appointment_requests',
      'emergency_contact_requests',
      'financing_applications',
      'saved_financing_plans',
      'estimate_requests',
      'assessment_questions',
      'assessment_options',
      'assessment_sessions',
      'contact_submissions'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('single_user_state')) {
      localStorage.setItem('single_user_state', JSON.stringify({}));
    }

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
      const parsed = JSON.parse(data);
      if (parsed === null) {
        return defaultValue !== undefined ? defaultValue : [];
      }
      return parsed;
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

  // ----------------------
  // Generic formatting helpers
  // ----------------------

  _formatPriceRange(treatment) {
    if (!treatment) return '';
    const { price_min, price_max, price, price_per_unit, pricing_unit } = treatment;
    const currency = '$';

    const format = (v) => (v || v === 0 ? currency + Number(v).toFixed(0) : '');

    if (price_min != null && price_max != null && price_min !== price_max) {
      return `${format(price_min)}–${format(price_max)}`;
    }
    if (price_min != null && price_max == null) {
      return `from ${format(price_min)}`;
    }
    if (price != null) {
      return format(price);
    }
    if (price_per_unit != null) {
      let unitLabel = '';
      if (pricing_unit === 'per_tooth') unitLabel = ' per tooth';
      else if (pricing_unit === 'per_session') unitLabel = ' per session';
      else if (pricing_unit === 'per_arch') unitLabel = ' per arch';
      return format(price_per_unit) + unitLabel;
    }
    return '';
  }

  _formatDuration(treatment) {
    if (!treatment) return '';
    const {
      duration_minutes_min,
      duration_minutes_max,
      duration_months_min,
      duration_months_max
    } = treatment;

    const mins = (min, max) => {
      if (min && max && min !== max) return `${min}–${max} minutes`;
      if (min && (!max || min === max)) return `${min} minutes`;
      if (!min && max) return `Up to ${max} minutes`;
      return '';
    };

    const months = (min, max) => {
      if (min && max && min !== max) return `${min}–${max} months`;
      if (min && (!max || min === max)) return `${min} months`;
      if (!min && max) return `Up to ${max} months`;
      return '';
    };

    const minutesText = mins(duration_minutes_min, duration_minutes_max);
    const monthsText = months(duration_months_min, duration_months_max);

    return minutesText || monthsText || '';
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // ----------------------
  // Single-user state helper
  // ----------------------

  _persistSingleUserState(updates) {
    const state = this._getFromStorage('single_user_state', {});
    const newState = Object.assign({}, state, updates || {});
    this._saveToStorage('single_user_state', newState);
    return newState;
  }

  // ----------------------
  // Foreign key resolution helpers (specific)
  // ----------------------

  _withAppointmentFKs(appointment) {
    if (!appointment) return null;
    const treatments = this._getFromStorage('treatments');
    const dentists = this._getFromStorage('dentists');
    const clinics = this._getFromStorage('clinics');
    const offers = this._getFromStorage('offers');

    const enriched = Object.assign({}, appointment);
    if (appointment.treatment_id) {
      enriched.treatment = treatments.find((t) => t.id === appointment.treatment_id) || null;
    }
    if (appointment.dentist_id) {
      enriched.dentist = dentists.find((d) => d.id === appointment.dentist_id) || null;
    }
    if (appointment.clinic_id) {
      enriched.clinic = clinics.find((c) => c.id === appointment.clinic_id) || null;
    }
    if (appointment.offer_id) {
      enriched.offer = offers.find((o) => o.id === appointment.offer_id) || null;
    }
    return enriched;
  }

  _withEmergencyFKs(request) {
    if (!request) return null;
    const clinics = this._getFromStorage('clinics');
    const enriched = Object.assign({}, request);
    if (request.clinic_id) {
      enriched.clinic = clinics.find((c) => c.id === request.clinic_id) || null;
    }
    return enriched;
  }

  _withFinancingApplicationFKs(app) {
    if (!app) return null;
    const treatments = this._getFromStorage('treatments');
    const enriched = Object.assign({}, app);
    if (app.treatment_id) {
      enriched.treatment = treatments.find((t) => t.id === app.treatment_id) || null;
    }
    return enriched;
  }

  _withSavedFinancingPlanFKs(plan) {
    if (!plan) return null;
    const treatments = this._getFromStorage('treatments');
    const enriched = Object.assign({}, plan);
    if (plan.treatment_id) {
      enriched.treatment = treatments.find((t) => t.id === plan.treatment_id) || null;
    }
    return enriched;
  }

  _withEstimateRequestFKs(req) {
    if (!req) return null;
    const treatments = this._getFromStorage('treatments');
    const enriched = Object.assign({}, req);
    if (req.treatment_id) {
      enriched.treatment = treatments.find((t) => t.id === req.treatment_id) || null;
    }
    return enriched;
  }

  _withCaseInquiryFKs(inquiry) {
    if (!inquiry) return null;
    const cases = this._getFromStorage('smile_gallery_cases');
    const enriched = Object.assign({}, inquiry);
    if (inquiry.case_id) {
      enriched.case = cases.find((c) => c.id === inquiry.case_id) || null;
    }
    return enriched;
  }

  _withOfferFKsForDetail(offer) {
    if (!offer) return null;
    const treatments = this._getFromStorage('treatments');
    const clinics = this._getFromStorage('clinics');
    const enriched = Object.assign({}, offer);
    if (offer.primary_treatment_id) {
      enriched.primary_treatment =
        treatments.find((t) => t.id === offer.primary_treatment_id) || null;
    }
    if (Array.isArray(offer.clinic_ids)) {
      enriched.clinics = offer.clinic_ids
        .map((id) => clinics.find((c) => c.id === id))
        .filter((c) => !!c);
    }
    return enriched;
  }

  _withTreatmentFKsForDetail(treatment) {
    if (!treatment) return null;
    const categories = this._getFromStorage('treatment_categories');
    const clinics = this._getFromStorage('clinics');
    const enriched = Object.assign({}, treatment);
    if (treatment.category_id) {
      enriched.category = categories.find((c) => c.id === treatment.category_id) || null;
    }
    if (Array.isArray(treatment.available_clinic_ids)) {
      enriched.available_clinics = treatment.available_clinic_ids
        .map((id) => clinics.find((c) => c.id === id))
        .filter((c) => !!c);
    }
    return enriched;
  }

  _withSmileGalleryCaseFKsForDetail(smileCase) {
    if (!smileCase) return null;
    const dentists = this._getFromStorage('dentists');
    const clinics = this._getFromStorage('clinics');
    const enriched = Object.assign({}, smileCase);
    if (smileCase.dentist_id) {
      enriched.dentist = dentists.find((d) => d.id === smileCase.dentist_id) || null;
    }
    if (smileCase.clinic_id) {
      enriched.clinic = clinics.find((c) => c.id === smileCase.clinic_id) || null;
    }
    return enriched;
  }

  _withDentistFKsForProfile(dentist) {
    if (!dentist) return null;
    const clinics = this._getFromStorage('clinics');
    const enriched = Object.assign({}, dentist);
    if (Array.isArray(dentist.clinic_ids)) {
      enriched.clinics = dentist.clinic_ids
        .map((id) => clinics.find((c) => c.id === id))
        .filter((c) => !!c);
    }
    return enriched;
  }

  // ----------------------
  // Helper: Assessment session & Favorites
  // ----------------------

  _getOrCreateAssessmentSession() {
    const sessions = this._getFromStorage('assessment_sessions');
    const state = this._getFromStorage('single_user_state', {});
    let session = null;

    if (state.current_assessment_session_id) {
      session = sessions.find((s) => s.id === state.current_assessment_session_id) || null;
    }

    if (!session) {
      const id = this._generateId('assessment_session');
      session = {
        id,
        started_at: new Date().toISOString(),
        completed_at: null,
        current_step: 1,
        selected_option_ids: [],
        budget_max: null,
        timeline_months_max: null,
        recommended_treatment_ids: [],
        chosen_treatment_id: null
      };
      sessions.push(session);
      this._saveToStorage('assessment_sessions', sessions);
      this._persistSingleUserState({ current_assessment_session_id: id });
    }

    return session;
  }

  _getOrCreateFavoritesList() {
    const lists = this._getFromStorage('favorites');
    const state = this._getFromStorage('single_user_state', {});
    let list = null;

    if (state.favorites_list_id) {
      list = lists.find((l) => l.id === state.favorites_list_id) || null;
    }

    if (!list) {
      const id = this._generateId('favorites');
      list = {
        id,
        case_ids: [],
        updated_at: new Date().toISOString()
      };
      lists.push(list);
      this._saveToStorage('favorites', lists);
      this._persistSingleUserState({ favorites_list_id: id });
    }

    return list;
  }

  // ----------------------
  // Record creation helpers
  // ----------------------

  _createAppointmentRequestRecord({
    source_page,
    patient_type,
    visit_type,
    treatment_id,
    dentist_id,
    clinic_id,
    offer_id,
    requested_datetime,
    time_zone,
    contact_name,
    contact_phone,
    contact_email,
    comments,
    promo_code
  }) {
    const list = this._getFromStorage('appointment_requests');
    const id = this._generateId('appointment');
    const record = {
      id,
      source_page: source_page || 'other',
      patient_type: patient_type || 'unspecified',
      visit_type: visit_type || 'other',
      treatment_id: treatment_id || null,
      dentist_id: dentist_id || null,
      clinic_id: clinic_id || null,
      offer_id: offer_id || null,
      requested_datetime: requested_datetime,
      time_zone: time_zone || null,
      contact_name,
      contact_phone,
      contact_email: contact_email || null,
      comments: comments || null,
      promo_code: promo_code || null,
      status: 'submitted',
      created_at: new Date().toISOString()
    };
    list.push(record);
    this._saveToStorage('appointment_requests', list);
    return this._withAppointmentFKs(record);
  }

  _createEmergencyContactRecord({
    clinic_id,
    name,
    phone,
    issue_type,
    description,
    preferred_contact_timeframe
  }) {
    const list = this._getFromStorage('emergency_contact_requests');
    const id = this._generateId('emergency');
    const record = {
      id,
      clinic_id,
      name,
      phone,
      issue_type: issue_type || null,
      description: description || null,
      preferred_contact_timeframe: preferred_contact_timeframe || null,
      status: 'submitted',
      created_at: new Date().toISOString()
    };
    list.push(record);
    this._saveToStorage('emergency_contact_requests', list);
    return this._withEmergencyFKs(record);
  }

  _createFinancingApplicationRecord({
    treatment_type,
    treatment_id,
    treatment_cost,
    term_months,
    interest_rate_percent,
    monthly_payment_estimate,
    is_zero_interest,
    desired_monthly_payment,
    full_name,
    phone,
    email,
    employment_status,
    monthly_income
  }) {
    const list = this._getFromStorage('financing_applications');
    const id = this._generateId('financing_app');
    const record = {
      id,
      treatment_type,
      treatment_id: treatment_id || null,
      treatment_cost,
      term_months,
      interest_rate_percent,
      monthly_payment_estimate,
      is_zero_interest,
      desired_monthly_payment: desired_monthly_payment != null ? desired_monthly_payment : null,
      full_name,
      phone,
      email,
      employment_status: employment_status || null,
      monthly_income: monthly_income != null ? monthly_income : null,
      status: 'submitted',
      created_at: new Date().toISOString()
    };
    list.push(record);
    this._saveToStorage('financing_applications', list);
    return this._withFinancingApplicationFKs(record);
  }

  _createSavedFinancingPlanRecord({
    treatment_id,
    treatment_type,
    treatment_name,
    treatment_cost,
    term_months,
    interest_rate_percent,
    monthly_payment,
    is_zero_interest,
    delivery_method,
    name,
    email
  }) {
    const list = this._getFromStorage('saved_financing_plans');
    const id = this._generateId('saved_plan');
    const record = {
      id,
      treatment_id: treatment_id || null,
      treatment_type: treatment_type || null,
      treatment_name: treatment_name || null,
      treatment_cost,
      term_months,
      interest_rate_percent,
      monthly_payment,
      is_zero_interest,
      delivery_method,
      name: name || null,
      email: email || null,
      created_at: new Date().toISOString()
    };
    list.push(record);
    this._saveToStorage('saved_financing_plans', list);
    // Simulated email/send handled elsewhere; here we only persist metadata.
    return this._withSavedFinancingPlanFKs(record);
  }

  _createEstimateRequestRecord({
    treatment_id,
    treatment_name,
    source,
    scope_selection,
    name,
    email,
    comments
  }) {
    const list = this._getFromStorage('estimate_requests');
    const id = this._generateId('estimate');
    const record = {
      id,
      treatment_id,
      treatment_name: treatment_name || null,
      source: source || 'other',
      scope_selection: scope_selection || null,
      name,
      email,
      comments: comments || null,
      status: 'requested',
      created_at: new Date().toISOString()
    };
    list.push(record);
    this._saveToStorage('estimate_requests', list);
    return this._withEstimateRequestFKs(record);
  }

  _createCaseInquiryRecord({ case_id, name, phone, email, message }) {
    const list = this._getFromStorage('case_inquiries');
    const id = this._generateId('case_inquiry');
    const record = {
      id,
      case_id,
      name,
      phone,
      email: email || null,
      message: message || null,
      status: 'submitted',
      created_at: new Date().toISOString()
    };
    list.push(record);
    this._saveToStorage('case_inquiries', list);
    return this._withCaseInquiryFKs(record);
  }

  // ----------------------
  // 1. getHomePageContent
  // ----------------------

  getHomePageContent() {
    const treatments = this._getFromStorage('treatments');
    const categories = this._getFromStorage('treatment_categories');
    const offers = this._getFromStorage('offers');

    const now = new Date();

    const activeTreatments = treatments.filter((t) => t.is_active !== false);
    activeTreatments.sort((a, b) => {
      const ar = a.patient_satisfaction_rating || 0;
      const br = b.patient_satisfaction_rating || 0;
      if (br !== ar) return br - ar;
      const ac = a.patient_satisfaction_count || 0;
      const bc = b.patient_satisfaction_count || 0;
      return bc - ac;
    });

    const featured_treatments = activeTreatments.slice(0, 4).map((t) => {
      const category = categories.find((c) => c.id === t.category_id) || {};
      return {
        treatment_id: t.id,
        name: t.name,
        category_slug: category.slug || t.treatment_type || 'other_cosmetic',
        treatment_type: t.treatment_type,
        short_description: t.short_description || '',
        from_price:
          t.price_min != null
            ? t.price_min
            : t.price != null
            ? t.price
            : t.price_per_unit != null
            ? t.price_per_unit
            : null,
        display_price: this._formatPriceRange(t),
        display_duration: this._formatDuration(t),
        supports_financing: !!t.supports_financing,
        image_url: t.image_url || ''
      };
    });

    const activeOffers = offers.filter((o) => {
      if (o.is_active === false) return false;
      const from = this._parseDate(o.valid_from);
      const to = this._parseDate(o.valid_to);
      if (from && from > now) return false;
      if (to && to < now) return false;
      return true;
    });

    activeOffers.sort((a, b) => {
      const ad = a.discount_percent || 0;
      const bd = b.discount_percent || 0;
      return bd - ad;
    });

    const featured_offers = activeOffers.slice(0, 4).map((o) => ({
      offer_id: o.id,
      title: o.title,
      price: o.price,
      display_price: '$' + Number(o.price).toFixed(0),
      offer_type: o.offer_type,
      key_inclusions: Array.isArray(o.included_services) ? o.included_services : [],
      valid_to: o.valid_to || ''
    }));

    const primary_ctas = [
      { cta_id: 'start_assessment', label: 'Start Smile Assessment', action_type: 'start_smile_assessment' },
      { cta_id: 'find_clinic', label: 'Find a Clinic', action_type: 'find_clinic' },
      { cta_id: 'view_treatments', label: 'Explore Treatments', action_type: 'view_treatments' }
    ];

    return {
      hero_title: 'Cosmetic Dentistry Focused on Your Best Smile',
      hero_subtitle: 'Whitening, veneers, Invisalign and more with flexible financing.',
      featured_treatments,
      featured_offers,
      primary_ctas
    };
  }

  // ----------------------
  // 2. getTreatmentCategoriesForNav
  // ----------------------

  getTreatmentCategoriesForNav() {
    const categories = this._getFromStorage('treatment_categories');
    categories.sort((a, b) => {
      const ao = a.display_order != null ? a.display_order : 0;
      const bo = b.display_order != null ? b.display_order : 0;
      return ao - bo;
    });

    return categories.map((c) => ({
      category_id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      display_order: c.display_order != null ? c.display_order : 0
    }));
  }

  // ----------------------
  // 3. getTreatmentCategorySummary
  // ----------------------

  getTreatmentCategorySummary(categorySlug) {
    const categories = this._getFromStorage('treatment_categories');
    const cat = categories.find((c) => c.slug === categorySlug) || null;
    if (!cat) {
      return { category_id: null, name: '', slug: categorySlug, description: '' };
    }
    return {
      category_id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || ''
    };
  }

  // ----------------------
  // 4. getTreatmentFilterOptions
  // ----------------------

  getTreatmentFilterOptions(categorySlug) {
    const categories = this._getFromStorage('treatment_categories');
    const treatments = this._getFromStorage('treatments');
    const categoryIds = categories
      .filter((c) => c.slug === categorySlug)
      .map((c) => c.id);

    const inCategory = treatments.filter((t) => {
      if (categoryIds.length > 0) {
        return categoryIds.includes(t.category_id);
      }
      // Fallback: match by treatment_type if slug aligns
      return t.treatment_type === categorySlug;
    });

    const deliverySet = new Set();
    inCategory.forEach((t) => {
      if (t.delivery_method) deliverySet.add(t.delivery_method);
    });

    const delivery_methods = Array.from(deliverySet);

    const price_ranges = [
      { label: 'Up to $200', max_price: 200 },
      { label: 'Up to $400', max_price: 400 },
      { label: 'Up to $1000', max_price: 1000 },
      { label: 'Up to $2500', max_price: 2500 },
      { label: 'Up to $5000', max_price: 5000 }
    ];

    const duration_minute_ranges = [
      { label: 'Up to 60 minutes', min_minutes: 0, max_minutes: 60 },
      { label: '60–90 minutes', min_minutes: 60, max_minutes: 90 },
      { label: '90–120 minutes', min_minutes: 90, max_minutes: 120 }
    ];

    const duration_month_ranges = [
      { label: 'Up to 6 months', min_months: 0, max_months: 6 },
      { label: '6–12 months', min_months: 6, max_months: 12 },
      { label: '12+ months', min_months: 12, max_months: 60 }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'duration_short_to_long', label: 'Duration: Short to Long' }
    ];

    return {
      delivery_methods,
      price_ranges,
      duration_minute_ranges,
      duration_month_ranges,
      sort_options
    };
  }

  // ----------------------
  // 5. searchTreatments
  // ----------------------

  searchTreatments(categorySlug, filters, sortBy) {
    filters = filters || {};
    const categories = this._getFromStorage('treatment_categories');
    let treatments = this._getFromStorage('treatments');

    // Seed basic veneer treatment options if none exist, so comparison flows still work
    if (categorySlug === 'veneers') {
      const hasPorcelain = treatments.some(
        (t) => t.category_id === 'veneers' && t.veneer_material === 'porcelain'
      );
      const hasComposite = treatments.some(
        (t) => t.category_id === 'veneers' && t.veneer_material === 'composite'
      );

      if (!hasPorcelain || !hasComposite) {
        const veneerCategory =
          categories.find((c) => c.slug === 'veneers') || { id: 'veneers' };
        const seeded = [];

        if (!hasPorcelain) {
          seeded.push({
            id: 't_veneers_porcelain_standard',
            category_id: veneerCategory.id,
            name: 'Porcelain Veneers (per tooth)',
            slug: 'porcelain-veneers-per-tooth',
            treatment_type: 'veneers',
            delivery_method: 'in_office',
            veneer_material: 'porcelain',
            pricing_unit: 'per_tooth',
            price: null,
            price_min: null,
            price_max: null,
            price_per_unit: 950,
            duration_minutes_min: 90,
            duration_minutes_max: 120,
            duration_months_min: 0,
            duration_months_max: 1,
            supports_financing: true,
            is_in_assessment: false,
            patient_satisfaction_rating: 4.8,
            patient_satisfaction_count: 50,
            short_description: 'Custom porcelain veneers for front teeth, priced per tooth.',
            long_description: '',
            image_url: '',
            available_clinic_ids: [],
            is_active: true
          });
        }

        if (!hasComposite) {
          seeded.push({
            id: 't_veneers_composite_standard',
            category_id: veneerCategory.id,
            name: 'Composite Veneers (per tooth)',
            slug: 'composite-veneers-per-tooth',
            treatment_type: 'veneers',
            delivery_method: 'in_office',
            veneer_material: 'composite',
            pricing_unit: 'per_tooth',
            price: null,
            price_min: null,
            price_max: null,
            price_per_unit: 450,
            duration_minutes_min: 60,
            duration_minutes_max: 90,
            duration_months_min: 0,
            duration_months_max: 1,
            supports_financing: true,
            is_in_assessment: false,
            patient_satisfaction_rating: 4.6,
            patient_satisfaction_count: 35,
            short_description: 'Chairside composite veneers to reshape and brighten front teeth.',
            long_description: '',
            image_url: '',
            available_clinic_ids: [],
            is_active: true
          });
        }

        if (seeded.length) {
          treatments = treatments.concat(seeded);
          this._saveToStorage('treatments', treatments);
        }
      }
    }

    const categoryIds = categories
      .filter((c) => c.slug === categorySlug)
      .map((c) => c.id);

    let results = treatments.filter((t) => {
      if (t.is_active === false) return false;

      // Category hierarchy match
      if (categoryIds.length > 0 && !categoryIds.includes(t.category_id)) {
        return false;
      }
      if (categoryIds.length === 0 && t.treatment_type !== categorySlug) {
        // Fallback to treatment_type match when no category found
        return false;
      }

      if (filters.treatmentType && t.treatment_type !== filters.treatmentType) {
        return false;
      }
      if (filters.deliveryMethod && t.delivery_method !== filters.deliveryMethod) {
        return false;
      }
      if (filters.veneerMaterial && t.veneer_material !== filters.veneerMaterial) {
        return false;
      }

      const basePrice =
        t.price_min != null
          ? t.price_min
          : t.price != null
          ? t.price
          : t.price_per_unit != null
          ? t.price_per_unit
          : null;
      if (filters.maxPrice != null && basePrice != null && basePrice > filters.maxPrice) {
        return false;
      }

      if (filters.minDurationMinutes != null || filters.maxDurationMinutes != null) {
        const minDur = t.duration_minutes_min != null ? t.duration_minutes_min : t.duration_minutes_max;
        const maxDur = t.duration_minutes_max != null ? t.duration_minutes_max : t.duration_minutes_min;
        if (filters.minDurationMinutes != null && (maxDur == null || maxDur < filters.minDurationMinutes)) {
          return false;
        }
        if (filters.maxDurationMinutes != null && (minDur == null || minDur > filters.maxDurationMinutes)) {
          return false;
        }
      }

      if (filters.minDurationMonths != null || filters.maxDurationMonths != null) {
        const minM = t.duration_months_min != null ? t.duration_months_min : t.duration_months_max;
        const maxM = t.duration_months_max != null ? t.duration_months_max : t.duration_months_min;
        if (filters.minDurationMonths != null && (maxM == null || maxM < filters.minDurationMonths)) {
          return false;
        }
        if (filters.maxDurationMonths != null && (minM == null || minM > filters.maxDurationMonths)) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    if (sortBy === 'price_low_to_high' || sortBy === 'price_high_to_low') {
      results.sort((a, b) => {
        const ap =
          a.price_min != null
            ? a.price_min
            : a.price != null
            ? a.price
            : a.price_per_unit != null
            ? a.price_per_unit
            : Number.MAX_SAFE_INTEGER;
        const bp =
          b.price_min != null
            ? b.price_min
            : b.price != null
            ? b.price
            : b.price_per_unit != null
            ? b.price_per_unit
            : Number.MAX_SAFE_INTEGER;
        return sortBy === 'price_low_to_high' ? ap - bp : bp - ap;
      });
    } else if (sortBy === 'duration_short_to_long') {
      results.sort((a, b) => {
        const ad = a.duration_minutes_min || a.duration_minutes_max || 0;
        const bd = b.duration_minutes_min || b.duration_minutes_max || 0;
        return ad - bd;
      });
    }

    const categoriesMap = {};
    categories.forEach((c) => {
      categoriesMap[c.id] = c.name;
    });

    return results.map((t) => ({
      treatment_id: t.id,
      name: t.name,
      category_name: categoriesMap[t.category_id] || '',
      treatment_type: t.treatment_type,
      delivery_method: t.delivery_method || null,
      veneer_material: t.veneer_material || null,
      pricing_unit: t.pricing_unit,
      base_price:
        t.price_min != null
          ? t.price_min
          : t.price != null
          ? t.price
          : t.price_per_unit != null
          ? t.price_per_unit
          : null,
      display_price_range: this._formatPriceRange(t),
      display_duration: this._formatDuration(t),
      duration_minutes_min: t.duration_minutes_min || null,
      duration_minutes_max: t.duration_minutes_max || null,
      duration_months_min: t.duration_months_min || null,
      duration_months_max: t.duration_months_max || null,
      supports_financing: !!t.supports_financing,
      patient_satisfaction_rating: t.patient_satisfaction_rating || null,
      patient_satisfaction_count: t.patient_satisfaction_count || null,
      image_url: t.image_url || ''
    }));
  }

  // ----------------------
  // 6. getTreatmentDetail
  // ----------------------

  getTreatmentDetail(treatmentId) {
    const treatments = this._getFromStorage('treatments');
    const categories = this._getFromStorage('treatment_categories');
    const treatmentRaw = treatments.find((t) => t.id === treatmentId) || null;

    if (!treatmentRaw) {
      return {
        treatment: null,
        category_name: '',
        display_price_range: '',
        display_duration: '',
        benefits: [],
        indications: [],
        is_recommendable_from_assessment: false,
        supports_financing: false,
        financing_cta_label: ''
      };
    }

    const treatment = this._withTreatmentFKsForDetail(treatmentRaw);
    const category = categories.find((c) => c.id === treatmentRaw.category_id) || null;

    const supportsFinancing = !!treatmentRaw.supports_financing;

    return {
      treatment,
      category_name: category ? category.name : '',
      display_price_range: this._formatPriceRange(treatmentRaw),
      display_duration: this._formatDuration(treatmentRaw),
      benefits: [],
      indications: [],
      is_recommendable_from_assessment: !!treatmentRaw.is_in_assessment,
      supports_financing: supportsFinancing,
      financing_cta_label: supportsFinancing ? 'View Payment Options' : ''
    };
  }

  // ----------------------
  // 7. calculateVeneerCost
  // ----------------------

  calculateVeneerCost(treatmentId, toothCount) {
    const treatments = this._getFromStorage('treatments');
    const treatment = treatments.find((t) => t.id === treatmentId) || null;

    if (!treatment) {
      return {
        treatment_id: treatmentId,
        pricing_unit: 'per_tooth',
        price_per_unit: 0,
        tooth_count: toothCount,
        total_cost: 0,
        display_total_cost: '$0'
      };
    }

    const pricePerUnit = treatment.price_per_unit != null ? treatment.price_per_unit : treatment.price || 0;
    const total = pricePerUnit * toothCount;

    return {
      treatment_id: treatment.id,
      pricing_unit: treatment.pricing_unit,
      price_per_unit: pricePerUnit,
      tooth_count: toothCount,
      total_cost: total,
      display_total_cost: '$' + Number(total).toFixed(0)
    };
  }

  // ----------------------
  // 8. requestTreatmentEstimate
  // ----------------------

  requestTreatmentEstimate(treatmentId, source, scopeSelection, name, email, comments) {
    const treatments = this._getFromStorage('treatments');
    const treatment = treatments.find((t) => t.id === treatmentId) || null;

    const estimateRequest = this._createEstimateRequestRecord({
      treatment_id: treatmentId,
      treatment_name: treatment ? treatment.name : null,
      source,
      scope_selection: scopeSelection,
      name,
      email,
      comments
    });

    return {
      success: true,
      estimate_request: estimateRequest,
      message: 'Estimate request submitted.'
    };
  }

  // ----------------------
  // 9. submitTreatmentAppointmentRequest
  // ----------------------

  submitTreatmentAppointmentRequest(
    treatmentId,
    patientType,
    visitType,
    requestedDatetime,
    timeZone,
    clinicId,
    contactName,
    contactPhone,
    contactEmail,
    comments
  ) {
    const appointment = this._createAppointmentRequestRecord({
      source_page: 'treatment_detail',
      patient_type: patientType || 'new_patient',
      visit_type: visitType || 'treatment_appointment',
      treatment_id: treatmentId,
      dentist_id: null,
      clinic_id: clinicId || null,
      offer_id: null,
      requested_datetime: requestedDatetime,
      time_zone: timeZone || null,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      comments: comments || null,
      promo_code: null
    });

    return {
      success: true,
      appointment_request: appointment,
      message: 'Appointment request submitted.'
    };
  }

  // ----------------------
  // 10. getClinicSearchFilterOptions
  // ----------------------

  getClinicSearchFilterOptions() {
    const radius_options_miles = [5, 10, 15, 25, 50];
    const availability_filters = [
      { key: 'open_sundays', label: 'Open Sundays' }
    ];

    return { radius_options_miles, availability_filters };
  }

  // ----------------------
  // 11. searchClinics
  // ----------------------

  searchClinics(zip, radiusMiles, openSunday) {
    const clinics = this._getFromStorage('clinics');

    // Use any clinic in the searched ZIP as the origin for distance calculations
    let originLat = null;
    let originLng = null;
    if (zip) {
      const originClinic = clinics.find(
        (c) => c.zip === zip && typeof c.latitude === 'number' && typeof c.longitude === 'number'
      );
      if (originClinic) {
        originLat = originClinic.latitude;
        originLng = originClinic.longitude;
      }
    }

    const toMiles = (lat1, lon1, lat2, lon2) => {
      if (
        typeof lat1 !== 'number' ||
        typeof lon1 !== 'number' ||
        typeof lat2 !== 'number' ||
        typeof lon2 !== 'number'
      ) {
        return Number.MAX_SAFE_INTEGER;
      }
      const R = 3958.8; // Earth radius in miles
      const toRad = (v) => (v * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    let results = clinics.filter((c) => {
      if (openSunday === true && !c.open_sunday) return false;

      // If we can compute a distance, filter by radius; otherwise fall back to ZIP match
      if (originLat != null && originLng != null && typeof radiusMiles === 'number' && radiusMiles > 0) {
        const dist = toMiles(originLat, originLng, c.latitude, c.longitude);
        if (dist > radiusMiles) return false;
      } else if (zip && c.zip !== zip) {
        return false;
      }

      return true;
    });

    // Map to output format with computed distance when available
    results = results.map((c) => {
      let distance = null;
      if (originLat != null && originLng != null) {
        distance = toMiles(originLat, originLng, c.latitude, c.longitude);
      } else if (zip && c.zip === zip) {
        distance = 0;
      }
      return {
        clinic_id: c.id,
        name: c.name,
        address_line1: c.address_line1,
        city: c.city,
        state: c.state,
        zip: c.zip,
        distance_miles: distance,
        open_sunday: !!c.open_sunday,
        hours_sunday: c.hours_sunday || '',
        has_emergency_care: !!c.has_emergency_care,
        services: Array.isArray(c.services) ? c.services : []
      };
    });

    // Sort by distance (closest first), then name
    results.sort((a, b) => {
      const ad = a.distance_miles != null ? a.distance_miles : Number.MAX_SAFE_INTEGER;
      const bd = b.distance_miles != null ? b.distance_miles : Number.MAX_SAFE_INTEGER;
      if (ad !== bd) return ad - bd;
      return (a.name || '').localeCompare(b.name || '');
    });

    return results;
  }

  // ----------------------
  // 12. getClinicDetail
  // ----------------------

  getClinicDetail(clinicId) {
    const clinics = this._getFromStorage('clinics');
    const clinic = clinics.find((c) => c.id === clinicId) || null;

    if (!clinic) {
      return {
        clinic: null,
        display_address: '',
        map_embed_token: '',
        emergency_section: {
          has_emergency_care: false,
          emergency_description: '',
          phone_emergency: ''
        }
      };
    }

    const display_address = `${clinic.address_line1}, ${clinic.city}, ${clinic.state} ${clinic.zip}`;

    const emergency_section = {
      has_emergency_care: !!clinic.has_emergency_care,
      emergency_description: clinic.has_emergency_care
        ? 'Emergency dental care available at this location.'
        : 'No on-site emergency care listed for this location.',
      phone_emergency: clinic.phone_emergency || clinic.phone_main || ''
    };

    return {
      clinic,
      display_address,
      map_embed_token: '',
      emergency_section
    };
  }

  // ----------------------
  // 13. getEmergencyContactFormConfig
  // ----------------------

  getEmergencyContactFormConfig(clinicId) {
    const clinics = this._getFromStorage('clinics');
    const clinic = clinics.find((c) => c.id === clinicId) || null;

    const clinic_name = clinic ? clinic.name : '';
    const clinic_phone_emergency = clinic ? clinic.phone_emergency || clinic.phone_main || '' : '';

    const issue_type_options = [
      { value: 'broken_tooth', label: 'Broken tooth' },
      { value: 'dental_trauma', label: 'Dental trauma' },
      { value: 'severe_pain', label: 'Severe pain' },
      { value: 'infection', label: 'Infection / abscess' },
      { value: 'lost_filling', label: 'Lost filling or crown' },
      { value: 'other', label: 'Other' }
    ];

    const preferred_timeframe_options = [
      { value: 'within_2_hours', label: 'Within 2 hours' },
      { value: 'same_day', label: 'Same day' },
      { value: 'next_business_day', label: 'Next business day' },
      { value: 'flexible', label: 'Flexible' }
    ];

    return {
      clinic_name,
      clinic_phone_emergency,
      issue_type_options,
      preferred_timeframe_options
    };
  }

  // ----------------------
  // 14. submitEmergencyContactRequest
  // ----------------------

  submitEmergencyContactRequest(
    clinicId,
    name,
    phone,
    issueType,
    description,
    preferredContactTimeframe
  ) {
    const record = this._createEmergencyContactRecord({
      clinic_id: clinicId,
      name,
      phone,
      issue_type: issueType || null,
      description: description || null,
      preferred_contact_timeframe: preferredContactTimeframe || null
    });

    return {
      success: true,
      emergency_request: record,
      message: 'Emergency contact request submitted.'
    };
  }

  // ----------------------
  // 15. getDentistFilterOptions
  // ----------------------

  getDentistFilterOptions() {
    const specialties = [
      { value: 'cosmetic_dentistry', label: 'Cosmetic Dentistry' },
      { value: 'general_dentistry', label: 'General Dentistry' },
      { value: 'orthodontics', label: 'Orthodontics' },
      { value: 'periodontics', label: 'Periodontics' },
      { value: 'oral_surgery', label: 'Oral Surgery' },
      { value: 'endodontics', label: 'Endodontics' },
      { value: 'prosthodontics', label: 'Prosthodontics' },
      { value: 'pediatric_dentistry', label: 'Pediatric Dentistry' },
      { value: 'other', label: 'Other' }
    ];

    const genders = [
      { value: 'female', label: 'Female' },
      { value: 'male', label: 'Male' },
      { value: 'non_binary', label: 'Non-binary' },
      { value: 'unspecified', label: 'Unspecified' }
    ];

    const experience_ranges = [
      { min_years: 0, label: 'All' },
      { min_years: 5, label: '5+ years' },
      { min_years: 8, label: '8+ years' },
      { min_years: 15, label: '15+ years' }
    ];

    const rating_thresholds = [4.0, 4.5, 4.7, 4.9];

    const sort_options = [
      { value: 'rating_desc', label: 'Highest rated' },
      { value: 'experience_desc', label: 'Most experienced' }
    ];

    return {
      specialties,
      genders,
      experience_ranges,
      rating_thresholds,
      sort_options
    };
  }

  // ----------------------
  // 16. searchDentists
  // ----------------------

  searchDentists(filters, sortBy) {
    filters = filters || {};
    const dentists = this._getFromStorage('dentists');

    let results = dentists.filter((d) => {
      if (filters.primarySpecialty && d.primary_specialty !== filters.primarySpecialty) {
        return false;
      }
      if (filters.gender && d.gender && d.gender !== filters.gender) {
        return false;
      }
      if (filters.minYearsExperience != null && d.years_experience < filters.minYearsExperience) {
        return false;
      }
      if (filters.minRating != null && d.rating_average < filters.minRating) {
        return false;
      }
      return true;
    });

    if (sortBy === 'rating_desc') {
      results.sort((a, b) => {
        const ar = a.rating_average || 0;
        const br = b.rating_average || 0;
        if (br !== ar) return br - ar;
        const ac = a.rating_count || 0;
        const bc = b.rating_count || 0;
        return bc - ac;
      });
    } else if (sortBy === 'experience_desc') {
      results.sort((a, b) => b.years_experience - a.years_experience);
    }

    return results.map((d) => ({
      dentist_id: d.id,
      full_name: d.full_name,
      primary_specialty: d.primary_specialty,
      gender: d.gender || 'unspecified',
      years_experience: d.years_experience,
      rating_average: d.rating_average,
      rating_count: d.rating_count || 0,
      photo_url: d.photo_url || '',
      is_accepting_new_patients: d.is_accepting_new_patients !== false
    }));
  }

  // ----------------------
  // 17. getDentistProfile
  // ----------------------

  getDentistProfile(dentistId) {
    const dentists = this._getFromStorage('dentists');
    const dentistRaw = dentists.find((d) => d.id === dentistId) || null;

    if (!dentistRaw) {
      return {
        dentist: null,
        training: '',
        cosmetic_experience_years: 0,
        patient_reviews: []
      };
    }

    const dentist = this._withDentistFKsForProfile(dentistRaw);

    return {
      dentist,
      training: '',
      cosmetic_experience_years: dentistRaw.years_experience || 0,
      patient_reviews: []
    };
  }

  // ----------------------
  // 18. submitDentistAppointmentRequest
  // ----------------------

  submitDentistAppointmentRequest(
    dentistId,
    visitType,
    requestedDatetime,
    timeZone,
    clinicId,
    contactName,
    contactPhone,
    contactEmail,
    comments
  ) {
    const appointment = this._createAppointmentRequestRecord({
      source_page: 'dentist_profile',
      patient_type: 'unspecified',
      visit_type: visitType || 'in_person_consultation',
      treatment_id: null,
      dentist_id: dentistId,
      clinic_id: clinicId || null,
      offer_id: null,
      requested_datetime: requestedDatetime,
      time_zone: timeZone || null,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      comments: comments || null,
      promo_code: null
    });

    return {
      success: true,
      appointment_request: appointment,
      message: 'Consultation request submitted.'
    };
  }

  // ----------------------
  // 19. startSmileAssessment
  // ----------------------

  startSmileAssessment() {
    // Create a new session and overwrite any current one in single_user_state
    const sessions = this._getFromStorage('assessment_sessions');
    const id = this._generateId('assessment_session');
    const session = {
      id,
      started_at: new Date().toISOString(),
      completed_at: null,
      current_step: 1,
      selected_option_ids: [],
      budget_max: null,
      timeline_months_max: null,
      recommended_treatment_ids: [],
      chosen_treatment_id: null
    };
    sessions.push(session);
    this._saveToStorage('assessment_sessions', sessions);
    this._persistSingleUserState({ current_assessment_session_id: id });

    // Get first question
    const questions = this._getFromStorage('assessment_questions');
    const options = this._getFromStorage('assessment_options');
    if (!questions.length) {
      return {
        status: 'in_progress',
        current_step: 0,
        question: null
      };
    }

    questions.sort((a, b) => a.step_number - b.step_number);
    const first = questions[0];
    const qOptions = options
      .filter((o) => o.question_id === first.id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map((o) => ({ label: o.label, value_key: o.value_key || o.id }));

    return {
      status: 'in_progress',
      current_step: first.step_number,
      question: {
        title: first.title,
        subtitle: first.subtitle || '',
        question_type: first.question_type,
        category: first.category || 'other',
        is_required: first.is_required !== false,
        options: qOptions
      }
    };
  }

  // ----------------------
  // 20. answerSmileAssessmentStep
  // ----------------------

  answerSmileAssessmentStep(selectedOptionKeys, sliderValue, textAnswer) {
    selectedOptionKeys = selectedOptionKeys || [];
    const sessions = this._getFromStorage('assessment_sessions');
    const state = this._getFromStorage('single_user_state', {});

    let session = null;
    if (state.current_assessment_session_id) {
      session = sessions.find((s) => s.id === state.current_assessment_session_id) || null;
    }
    if (!session) {
      session = this._getOrCreateAssessmentSession();
    }

    const questions = this._getFromStorage('assessment_questions');
    const options = this._getFromStorage('assessment_options');

    if (!questions.length) {
      return { status: 'completed', current_step: 0, completed: true };
    }

    // Identify current question by step
    const currentQuestion = questions.find((q) => q.step_number === session.current_step) || null;

    if (currentQuestion) {
      // Map selectedOptionKeys to option IDs and append
      const qOptions = options.filter((o) => o.question_id === currentQuestion.id);
      const selectedIds = qOptions
        .filter((o) => selectedOptionKeys.includes(o.value_key))
        .map((o) => o.id);
      const existing = Array.isArray(session.selected_option_ids)
        ? session.selected_option_ids
        : [];
      session.selected_option_ids = existing.concat(selectedIds);

      // Optionally store constraints
      if (currentQuestion.category === 'constraints' && currentQuestion.question_type === 'slider') {
        if (typeof sliderValue === 'number') {
          // Heuristic: slider for budget
          if (currentQuestion.title && currentQuestion.title.toLowerCase().includes('budget')) {
            session.budget_max = sliderValue;
          } else {
            session.timeline_months_max = sliderValue;
          }
        }
      }

      // Persist updated session
      const idx = sessions.findIndex((s) => s.id === session.id);
      if (idx >= 0) {
        sessions[idx] = session;
        this._saveToStorage('assessment_sessions', sessions);
      }
    }

    // Determine next question
    const sortedQuestions = questions.slice().sort((a, b) => a.step_number - b.step_number);
    const currentIndex = sortedQuestions.findIndex((q) => q.step_number === session.current_step);
    const nextQuestion = currentIndex >= 0 ? sortedQuestions[currentIndex + 1] : null;

    if (!nextQuestion) {
      // Mark completed
      session.completed_at = new Date().toISOString();
      const idx2 = sessions.findIndex((s) => s.id === session.id);
      if (idx2 >= 0) {
        sessions[idx2] = session;
        this._saveToStorage('assessment_sessions', sessions);
      }

      return {
        status: 'completed',
        current_step: session.current_step,
        completed: true
      };
    }

    // Move to next step
    session.current_step = nextQuestion.step_number;
    const idx3 = sessions.findIndex((s) => s.id === session.id);
    if (idx3 >= 0) {
      sessions[idx3] = session;
      this._saveToStorage('assessment_sessions', sessions);
    }

    const nextOptions = options
      .filter((o) => o.question_id === nextQuestion.id)
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .map((o) => ({ label: o.label, value_key: o.value_key || o.id }));

    return {
      status: 'in_progress',
      current_step: nextQuestion.step_number,
      question: {
        title: nextQuestion.title,
        subtitle: nextQuestion.subtitle || '',
        question_type: nextQuestion.question_type,
        category: nextQuestion.category || 'other',
        is_required: nextQuestion.is_required !== false,
        options: nextOptions
      },
      completed: false
    };
  }

  // ----------------------
  // 21. getSmileAssessmentRecommendations
  // ----------------------

  getSmileAssessmentRecommendations(maxEstimatedCost, maxDurationMonths, sortBy) {
    const sessions = this._getFromStorage('assessment_sessions');
    const state = this._getFromStorage('single_user_state', {});
    const treatments = this._getFromStorage('treatments');
    const categories = this._getFromStorage('treatment_categories');

    let session = null;
    if (state.current_assessment_session_id) {
      session = sessions.find((s) => s.id === state.current_assessment_session_id) || null;
    }

    // Base recommended treatments
    let recommended = [];

    if (session && Array.isArray(session.recommended_treatment_ids) && session.recommended_treatment_ids.length) {
      recommended = treatments.filter((t) => session.recommended_treatment_ids.includes(t.id));
    } else {
      // Fallback: all active treatments that are marked is_in_assessment
      recommended = treatments.filter((t) => t.is_active !== false && t.is_in_assessment === true);
      if (!recommended.length) {
        // As last fallback, return all active treatments
        recommended = treatments.filter((t) => t.is_active !== false);
      }
    }

    // Apply additional filters from parameters
    recommended = recommended.filter((t) => {
      const costMax =
        t.price_max != null
          ? t.price_max
          : t.price_min != null
          ? t.price_min
          : t.price != null
          ? t.price
          : t.price_per_unit != null
          ? t.price_per_unit
          : null;

      if (maxEstimatedCost != null && costMax != null && costMax > maxEstimatedCost) {
        return false;
      }

      const durMax =
        t.duration_months_max != null
          ? t.duration_months_max
          : t.duration_months_min != null
          ? t.duration_months_min
          : null;

      if (maxDurationMonths != null && durMax != null && durMax > maxDurationMonths) {
        return false;
      }

      return true;
    });

    // Sort by requested order
    if (sortBy === 'satisfaction_desc') {
      recommended.sort((a, b) => {
        const ar = a.patient_satisfaction_rating || 0;
        const br = b.patient_satisfaction_rating || 0;
        if (br !== ar) return br - ar;
        const ac = a.patient_satisfaction_count || 0;
        const bc = b.patient_satisfaction_count || 0;
        return bc - ac;
      });
    } else if (sortBy === 'price_asc') {
      recommended.sort((a, b) => {
        const ac =
          a.price_min != null
            ? a.price_min
            : a.price != null
            ? a.price
            : a.price_per_unit != null
            ? a.price_per_unit
            : Number.MAX_SAFE_INTEGER;
        const bc =
          b.price_min != null
            ? b.price_min
            : b.price != null
            ? b.price
            : b.price_per_unit != null
            ? b.price_per_unit
            : Number.MAX_SAFE_INTEGER;
        return ac - bc;
      });
    } else if (sortBy === 'duration_asc') {
      recommended.sort((a, b) => {
        const ad = a.duration_months_min || a.duration_months_max || 0;
        const bd = b.duration_months_min || b.duration_months_max || 0;
        return ad - bd;
      });
    }

    const catMap = {};
    categories.forEach((c) => {
      catMap[c.id] = c.name;
    });

    return recommended.map((t) => {
      const estMin =
        t.price_min != null
          ? t.price_min
          : t.price != null
          ? t.price
          : t.price_per_unit != null
          ? t.price_per_unit
          : null;
      const estMax = t.price_max != null ? t.price_max : estMin;

      return {
        treatment_id: t.id,
        name: t.name,
        category_name: catMap[t.category_id] || '',
        estimated_cost_min: estMin,
        estimated_cost_max: estMax,
        display_estimated_cost: this._formatPriceRange(t),
        duration_months_min: t.duration_months_min || null,
        duration_months_max: t.duration_months_max || null,
        display_duration: this._formatDuration(t),
        patient_satisfaction_rating: t.patient_satisfaction_rating || null,
        patient_satisfaction_count: t.patient_satisfaction_count || null,
        supports_financing: !!t.supports_financing
      };
    });
  }

  // ----------------------
  // 22. getSpecialOfferFilterOptions
  // ----------------------

  getSpecialOfferFilterOptions() {
    const offer_types = [
      { value: 'new_patient', label: 'New patient specials' },
      { value: 'whitening', label: 'Whitening offers' },
      { value: 'invisalign', label: 'Invisalign offers' },
      { value: 'veneers', label: 'Veneers offers' },
      { value: 'implants', label: 'Implant offers' },
      { value: 'emergency', label: 'Emergency offers' },
      { value: 'other', label: 'Other offers' }
    ];

    const max_price_presets = [100, 199, 250, 500, 1000];

    return { offer_types, max_price_presets };
  }

  // ----------------------
  // 23. listSpecialOffers
  // ----------------------

  listSpecialOffers(filters) {
    filters = filters || {};
    const offers = this._getFromStorage('offers');
    const now = new Date();

    const results = offers.filter((o) => {
      if (o.is_active === false) return false;
      if (filters.offerType && o.offer_type !== filters.offerType) return false;
      if (filters.maxPrice != null && o.price != null && o.price > filters.maxPrice) return false;
      const from = this._parseDate(o.valid_from);
      const to = this._parseDate(o.valid_to);
      if (from && from > now) return false;
      if (to && to < now) return false;
      return true;
    });

    return results.map((o) => ({
      offer_id: o.id,
      title: o.title,
      description: o.description || '',
      price: o.price,
      display_price: '$' + Number(o.price).toFixed(0),
      offer_type: o.offer_type,
      included_services: Array.isArray(o.included_services) ? o.included_services : [],
      valid_from: o.valid_from || '',
      valid_to: o.valid_to || '',
      is_active: o.is_active !== false
    }));
  }

  // ----------------------
  // 24. getOfferDetail
  // ----------------------

  getOfferDetail(offerId) {
    const offers = this._getFromStorage('offers');
    const clinics = this._getFromStorage('clinics');

    const offerRaw = offers.find((o) => o.id === offerId) || null;
    if (!offerRaw) {
      return {
        offer: null,
        display_price: '',
        included_services_labels: [],
        validity_text: '',
        applies_to_all_clinics: false,
        applicable_clinics: []
      };
    }

    const offer = this._withOfferFKsForDetail(offerRaw);

    const included_services_labels = Array.isArray(offerRaw.included_services)
      ? offerRaw.included_services
      : [];

    const from = this._parseDate(offerRaw.valid_from);
    const to = this._parseDate(offerRaw.valid_to);
    let validity_text = '';
    if (from && to) {
      validity_text = `Valid from ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`;
    } else if (to) {
      validity_text = `Valid through ${to.toISOString().slice(0, 10)}`;
    }

    let applicable_clinics = [];
    const applies_to_all_clinics = offerRaw.applies_to_all_clinics === true;
    if (applies_to_all_clinics) {
      applicable_clinics = clinics.map((c) => ({
        clinic_id: c.id,
        name: c.name,
        city: c.city,
        state: c.state
      }));
    } else if (Array.isArray(offerRaw.clinic_ids)) {
      applicable_clinics = offerRaw.clinic_ids
        .map((id) => clinics.find((c) => c.id === id))
        .filter((c) => !!c)
        .map((c) => ({
          clinic_id: c.id,
          name: c.name,
          city: c.city,
          state: c.state
        }));
    }

    return {
      offer,
      display_price: '$' + Number(offerRaw.price).toFixed(0),
      included_services_labels,
      validity_text,
      applies_to_all_clinics,
      applicable_clinics
    };
  }

  // ----------------------
  // 25. submitOfferAppointmentRequest
  // ----------------------

  submitOfferAppointmentRequest(
    offerId,
    clinicId,
    requestedDatetime,
    timeZone,
    patientType,
    contactName,
    contactPhone,
    contactEmail,
    promoCode,
    comments
  ) {
    const appointment = this._createAppointmentRequestRecord({
      source_page: 'offer_detail',
      patient_type: patientType || 'new_patient',
      visit_type: 'treatment_appointment',
      treatment_id: null,
      dentist_id: null,
      clinic_id: clinicId,
      offer_id: offerId,
      requested_datetime: requestedDatetime,
      time_zone: timeZone || null,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      comments: comments || null,
      promo_code: promoCode || null
    });

    return {
      success: true,
      appointment_request: appointment,
      message: 'Offer appointment request submitted.'
    };
  }

  // ----------------------
  // 26. getFinancingCalculatorConfig
  // ----------------------

  getFinancingCalculatorConfig() {
    const treatment_types = [
      { value: 'invisalign', label: 'Invisalign / clear aligners' },
      { value: 'veneers', label: 'Veneers' },
      { value: 'teeth_whitening', label: 'Teeth whitening' },
      { value: 'implants', label: 'Implants' },
      { value: 'other', label: 'Other cosmetic treatment' }
    ];

    return {
      treatment_types,
      term_months_min: 6,
      term_months_max: 60,
      default_term_months: 24,
      supports_zero_interest: true
    };
  }

  // ----------------------
  // 27. calculateFinancingPlan
  // ----------------------

  calculateFinancingPlan(
    treatmentType,
    treatmentId,
    treatmentCost,
    termMonths,
    interestRatePercent,
    isZeroInterest
  ) {
    const cost = Number(treatmentCost) || 0;
    const term = Math.max(1, Number(termMonths) || 1);
    let rate = Number(interestRatePercent) || 0;
    const zero = !!isZeroInterest;

    if (zero) {
      rate = 0;
    }

    let monthly_payment_estimate = 0;
    if (rate === 0) {
      monthly_payment_estimate = cost / term;
    } else {
      const r = rate / 100 / 12;
      monthly_payment_estimate = cost * (r / (1 - Math.pow(1 + r, -term)));
    }

    monthly_payment_estimate = Number(monthly_payment_estimate.toFixed(2));

    return {
      treatment_type: treatmentType || null,
      treatment_id: treatmentId || null,
      treatment_cost: cost,
      term_months: term,
      interest_rate_percent: rate,
      monthly_payment_estimate,
      display_monthly_payment: '$' + monthly_payment_estimate.toFixed(2),
      is_zero_interest: zero
    };
  }

  // ----------------------
  // 28. submitFinancingApplication
  // ----------------------

  submitFinancingApplication(
    treatmentType,
    treatmentId,
    treatmentCost,
    termMonths,
    interestRatePercent,
    monthlyPaymentEstimate,
    isZeroInterest,
    desiredMonthlyPayment,
    fullName,
    phone,
    email,
    employmentStatus,
    monthlyIncome
  ) {
    const record = this._createFinancingApplicationRecord({
      treatment_type: treatmentType,
      treatment_id: treatmentId || null,
      treatment_cost: Number(treatmentCost) || 0,
      term_months: Number(termMonths) || 0,
      interest_rate_percent: Number(interestRatePercent) || 0,
      monthly_payment_estimate: Number(monthlyPaymentEstimate) || 0,
      is_zero_interest: !!isZeroInterest,
      desired_monthly_payment:
        desiredMonthlyPayment != null ? Number(desiredMonthlyPayment) : null,
      full_name: fullName,
      phone,
      email,
      employment_status: employmentStatus || null,
      monthly_income: monthlyIncome != null ? Number(monthlyIncome) : null
    });

    return {
      success: true,
      financing_application: record,
      message: 'Financing application submitted.'
    };
  }

  // ----------------------
  // 29. saveFinancingPlan
  // ----------------------

  saveFinancingPlan(
    treatmentId,
    treatmentType,
    treatmentName,
    treatmentCost,
    termMonths,
    interestRatePercent,
    monthlyPayment,
    isZeroInterest,
    deliveryMethod,
    name,
    email
  ) {
    const record = this._createSavedFinancingPlanRecord({
      treatment_id: treatmentId || null,
      treatment_type: treatmentType || null,
      treatment_name: treatmentName || null,
      treatment_cost: Number(treatmentCost) || 0,
      term_months: Number(termMonths) || 0,
      interest_rate_percent: Number(interestRatePercent) || 0,
      monthly_payment: Number(monthlyPayment) || 0,
      is_zero_interest: !!isZeroInterest,
      delivery_method: deliveryMethod,
      name: name || null,
      email: email || null
    });

    return {
      success: true,
      saved_plan: record,
      message: 'Financing plan saved.'
    };
  }

  // ----------------------
  // 30. getSmileGalleryFilterOptions
  // ----------------------

  getSmileGalleryFilterOptions() {
    const treatment_types = [
      { value: 'composite_bonding', label: 'Composite bonding' },
      { value: 'veneers', label: 'Veneers' },
      { value: 'teeth_whitening', label: 'Teeth whitening' },
      { value: 'invisalign', label: 'Invisalign / aligners' },
      { value: 'implants', label: 'Implants' },
      { value: 'crowns', label: 'Crowns' },
      { value: 'gum_contouring', label: 'Gum contouring' },
      { value: 'other', label: 'Other' }
    ];

    const tooth_areas = [
      { value: 'front_teeth', label: 'Front teeth' },
      { value: 'full_smile', label: 'Full smile' },
      { value: 'single_tooth', label: 'Single tooth' },
      { value: 'upper_front', label: 'Upper front' },
      { value: 'lower_front', label: 'Lower front' },
      { value: 'molars', label: 'Molars' },
      { value: 'premolars', label: 'Premolars' },
      { value: 'other', label: 'Other' }
    ];

    const visit_ranges = [
      { min_visits: 1, max_visits: 1, label: '1 visit' },
      { min_visits: 1, max_visits: 2, label: '1–2 visits' },
      { min_visits: 3, max_visits: 5, label: '3–5 visits' }
    ];

    return { treatment_types, tooth_areas, visit_ranges };
  }

  // ----------------------
  // 31. searchSmileGalleryCases
  // ----------------------

  searchSmileGalleryCases(filters) {
    filters = filters || {};
    const cases = this._getFromStorage('smile_gallery_cases');

    const results = cases.filter((c) => {
      if (filters.treatmentType && c.treatment_type !== filters.treatmentType) {
        return false;
      }
      if (filters.toothArea && c.tooth_area !== filters.toothArea) {
        return false;
      }
      if (filters.minVisits != null && c.number_of_visits < filters.minVisits) {
        return false;
      }
      if (filters.maxVisits != null && c.number_of_visits > filters.maxVisits) {
        return false;
      }
      return true;
    });

    return results.map((c) => ({
      case_id: c.id,
      title: c.title || '',
      treatment_type: c.treatment_type,
      tooth_area: c.tooth_area,
      number_of_visits: c.number_of_visits,
      before_image_url: c.before_image_url || '',
      after_image_url: c.after_image_url || ''
    }));
  }

  // ----------------------
  // 32. getSmileGalleryCaseDetail
  // ----------------------

  getSmileGalleryCaseDetail(caseId) {
    const cases = this._getFromStorage('smile_gallery_cases');
    const smileCaseRaw = cases.find((c) => c.id === caseId) || null;

    if (!smileCaseRaw) {
      return {
        case: null,
        treatment_name: '',
        dentist_name: '',
        clinic_name: ''
      };
    }

    const smileCase = this._withSmileGalleryCaseFKsForDetail(smileCaseRaw);

    return {
      case: smileCase,
      treatment_name: smileCaseRaw.treatment_type || '',
      dentist_name: smileCase.dentist ? smileCase.dentist.full_name : '',
      clinic_name: smileCase.clinic ? smileCase.clinic.name : ''
    };
  }

  // ----------------------
  // 33. addCaseToFavorites
  // ----------------------

  addCaseToFavorites(caseId) {
    const lists = this._getFromStorage('favorites');
    const list = this._getOrCreateFavoritesList();

    if (!list.case_ids.includes(caseId)) {
      list.case_ids.push(caseId);
      list.updated_at = new Date().toISOString();
    }

    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('favorites', lists);

    return {
      favorites: list,
      message: 'Case added to favorites.'
    };
  }

  // ----------------------
  // 34. removeCaseFromFavorites
  // ----------------------

  removeCaseFromFavorites(caseId) {
    const lists = this._getFromStorage('favorites');
    const list = this._getOrCreateFavoritesList();

    list.case_ids = list.case_ids.filter((id) => id !== caseId);
    list.updated_at = new Date().toISOString();

    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('favorites', lists);

    return {
      favorites: list,
      message: 'Case removed from favorites.'
    };
  }

  // ----------------------
  // 35. reorderFavorites
  // ----------------------

  reorderFavorites(orderedCaseIds) {
    const lists = this._getFromStorage('favorites');
    const list = this._getOrCreateFavoritesList();

    list.case_ids = Array.isArray(orderedCaseIds) ? orderedCaseIds.slice() : [];
    list.updated_at = new Date().toISOString();

    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx >= 0) {
      lists[idx] = list;
    } else {
      lists.push(list);
    }
    this._saveToStorage('favorites', lists);

    return {
      favorites: list,
      message: 'Favorites reordered.'
    };
  }

  // ----------------------
  // 36. getFavoritesList
  // ----------------------

  getFavoritesList() {
    const list = this._getOrCreateFavoritesList();
    const cases = this._getFromStorage('smile_gallery_cases');

    const resolvedCases = list.case_ids
      .map((id) => cases.find((c) => c.id === id) || null)
      .filter((c) => !!c)
      .map((c) => ({
        case_id: c.id,
        title: c.title || '',
        treatment_type: c.treatment_type,
        tooth_area: c.tooth_area,
        number_of_visits: c.number_of_visits,
        after_image_url: c.after_image_url || ''
      }));

    return {
      favorites: list,
      cases: resolvedCases
    };
  }

  // ----------------------
  // 37. submitCaseInquiryFromFavorite
  // ----------------------

  submitCaseInquiryFromFavorite(caseId, name, phone, email, message) {
    const inquiry = this._createCaseInquiryRecord({
      case_id: caseId,
      name,
      phone,
      email: email || null,
      message: message || null
    });

    return {
      success: true,
      case_inquiry: inquiry,
      message: 'Case inquiry submitted.'
    };
  }

  // ----------------------
  // 38. submitClinicAppointmentRequest
  // ----------------------

  submitClinicAppointmentRequest(
    clinicId,
    visitType,
    requestedDatetime,
    timeZone,
    contactName,
    contactPhone,
    contactEmail,
    comments
  ) {
    const appointment = this._createAppointmentRequestRecord({
      source_page: 'clinic_detail',
      patient_type: 'unspecified',
      visit_type: visitType || 'in_person_consultation',
      treatment_id: null,
      dentist_id: null,
      clinic_id: clinicId,
      offer_id: null,
      requested_datetime: requestedDatetime,
      time_zone: timeZone || null,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || null,
      comments: comments || null,
      promo_code: null
    });

    return {
      success: true,
      appointment_request: appointment,
      message: 'Clinic appointment request submitted.'
    };
  }

  // ----------------------
  // 39. getAboutPageContent
  // ----------------------

  getAboutPageContent() {
    const highlight_points = [
      'Focused exclusively on cosmetic and restorative dentistry',
      'Flexible scheduling including early mornings and evenings',
      'Modern technology for comfortable, efficient visits'
    ];

    const body_html =
      '<p>Our cosmetic dentistry clinics are dedicated to helping you feel confident in your smile. ' +
      'From subtle whitening to full smile makeovers, our team combines artistry with advanced technology.</p>';

    const cta_blocks = [
      { label: 'Meet our dentists', action_type: 'meet_dentists' },
      { label: 'View smile gallery', action_type: 'view_gallery' },
      { label: 'Book a cosmetic consultation', action_type: 'book_consultation' }
    ];

    return {
      headline: 'About Our Cosmetic Dentistry Clinics',
      body_html,
      highlight_points,
      cta_blocks
    };
  }

  // ----------------------
  // 40. getContactPageContent
  // ----------------------

  getContactPageContent() {
    const clinics = this._getFromStorage('clinics');

    let primary = clinics.find((c) => c.is_primary) || clinics[0] || null;

    const phone_main = primary ? primary.phone_main || '' : '';
    const phone_emergency = primary ? primary.phone_emergency || primary.phone_main || '' : '';
    const email_general = primary ? primary.email || '' : '';

    const locations_summary = clinics.map((c) => ({
      clinic_id: c.id,
      name: c.name,
      city: c.city,
      state: c.state
    }));

    return {
      phone_main,
      phone_emergency,
      email_general,
      locations_summary
    };
  }

  // ----------------------
  // 41. submitContactForm
  // ----------------------

  submitContactForm(name, email, phone, subject, message) {
    const submissions = this._getFromStorage('contact_submissions');
    const id = this._generateId('contact');
    const record = {
      id,
      name,
      email,
      phone: phone || null,
      subject: subject || null,
      message,
      created_at: new Date().toISOString()
    };
    submissions.push(record);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      message: 'Contact form submitted.'
    };
  }

  // ----------------------
  // 42. getPrivacyAndTermsContent
  // ----------------------

  getPrivacyAndTermsContent() {
    const privacy_policy_html =
      '<p>We respect your privacy and only use your information to provide dental services, ' +
      'communicate about your care, and improve our website experience. We do not sell your data.</p>';

    const terms_of_use_html =
      '<p>The information on this website is for educational purposes only and does not constitute medical advice. ' +
      'Treatment recommendations are provided after an in-person or virtual examination.</p>';

    const last_updated = new Date().toISOString().slice(0, 10);

    return {
      privacy_policy_html,
      terms_of_use_html,
      last_updated
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
