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

  // ---------------------- INITIALIZATION & STORAGE HELPERS ----------------------

  _initStorage() {
    const keys = [
      'service_packages',
      'cart',
      'cart_items',
      'consultation_types',
      'consultation_slots',
      'consultation_bookings',
      'document_checklist_templates',
      'document_template_items',
      'document_checklists',
      'checklist_items',
      'eligibility_calculation_runs',
      'pathway_plans',
      'saved_pathway_plans',
      'visa_guides',
      'bookmark_folders',
      'guide_bookmarks',
      'faqs',
      'faq_favorites',
      'checkout_sessions',
      'contact_requests'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

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
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ---------------------- LABEL HELPERS ----------------------

  _countryLabel(value) {
    const map = {
      canada: 'Canada',
      australia: 'Australia',
      united_kingdom: 'United Kingdom',
      united_states: 'United States',
      new_zealand: 'New Zealand',
      schengen_area: 'Schengen Area',
      other: 'Other'
    };
    return map[value] || value;
  }

  _serviceCategoryLabel(value) {
    const map = {
      permanent_residency: 'Permanent Residency',
      family_dependent_visas: 'Family & Dependent Visas',
      study_visas: 'Study Visas',
      work_visas: 'Work Visas',
      tourist_visas: 'Tourist Visas'
    };
    return map[value] || value;
  }

  _pathwayLabel(value) {
    const map = {
      canada_express_entry: 'Canada – Express Entry',
      new_zealand_skilled_migrant: 'New Zealand – Skilled Migrant',
      australia_skilled_worker: 'Australia – Skilled Worker',
      australia_skilled_worker_skilled_independent: 'Australia – Skilled Independent',
      uk_family_reunification: 'UK – Family Reunification',
      canada_study_visa: 'Canada – Study Visa',
      us_work_visa: 'US – Work Visa',
      us_general_visa_strategy: 'US – General Visa Strategy',
      schengen_tourist_visa: 'Schengen Tourist Visa',
      other: 'Other Pathway'
    };
    return map[value] || value;
  }

  _visaTypeLabel(value) {
    const map = {
      tourist: 'Tourist',
      study: 'Study',
      work: 'Work',
      family: 'Family',
      permanent_residency: 'Permanent Residency'
    };
    return map[value] || value;
  }

  _regionLabel(value) {
    const map = {
      europe: 'Europe',
      north_america: 'North America',
      oceania: 'Oceania',
      asia: 'Asia',
      global: 'Global',
      other: 'Other'
    };
    return map[value] || value;
  }

  _maritalStatusLabel(value) {
    const map = {
      single: 'Single',
      married: 'Married',
      divorced: 'Divorced',
      widowed: 'Widowed',
      separated: 'Separated',
      other: 'Other'
    };
    return map[value] || value;
  }

  _englishProficiencyLabel(value) {
    const map = {
      basic: 'Basic',
      intermediate: 'Intermediate',
      upper_intermediate: 'Upper-Intermediate',
      advanced: 'Advanced',
      proficient: 'Proficient'
    };
    return map[value] || value;
  }

  _consultationTypeLabel(code) {
    const map = {
      general_visa_strategy_30_min: 'General Visa Strategy – 30 minutes',
      study_visa_45_min: 'Study Visa – 45 minutes',
      work_visa_30_min: 'Work Visa – 30 minutes'
    };
    return map[code] || code;
  }

  // ---------------------- CART HELPERS ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let cart = carts.find((c) => c.status === 'open');
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        items: [],
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _buildCartResponse(cart) {
    const cartItems = this._getFromStorage('cart_items', []).filter(
      (ci) => ci.cart_id === cart.id
    );
    const servicePackages = this._getFromStorage('service_packages', []);
    const consultationTypes = this._getFromStorage('consultation_types', []);

    let cartTotal = 0;
    let currency = null;

    const items = cartItems.map((ci) => {
      let servicePackage = null;
      let consultationType = null;

      if (ci.item_type === 'service_package' && ci.service_package_id) {
        const sp = servicePackages.find((s) => s.id === ci.service_package_id) || null;
        if (sp) {
          servicePackage = {
            id: sp.id,
            name: sp.name,
            country_label: this._countryLabel(sp.country),
            service_category_label: this._serviceCategoryLabel(sp.service_category)
          };
          currency = currency || sp.currency || null;
        }
      }

      if (ci.item_type === 'consultation_type' && ci.consultation_type_id) {
        const ct = consultationTypes.find((c) => c.id === ci.consultation_type_id) || null;
        if (ct) {
          consultationType = {
            id: ct.id,
            name: ct.name,
            country_label: this._countryLabel(ct.country),
            duration_minutes: ct.duration_minutes
          };
          currency = currency || ct.currency || null;
        }
      }

      cartTotal += ci.total_price || 0;

      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        service_package: servicePackage,
        consultation_type: consultationType,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        preferred_date_range_start: ci.preferred_date_range_start || null,
        preferred_date_range_end: ci.preferred_date_range_end || null
      };
    });

    return {
      id: cart.id,
      status: cart.status,
      items,
      cart_total: cartTotal,
      currency
    };
  }

  // ---------------------- CHECKOUT HELPERS ----------------------

  _getCurrentCheckoutSession() {
    const sessions = this._getFromStorage('checkout_sessions', []);
    const inReview = sessions.filter((s) => s.status === 'in_review');
    if (!inReview.length) return null;
    // Latest by created_at
    inReview.sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });
    return inReview[0];
  }

  // ---------------------- BOOKMARK HELPERS ----------------------

  _getOrCreateDefaultBookmarkFolder(code) {
    let folders = this._getFromStorage('bookmark_folders', []);
    let folder = folders.find((f) => f.code === code);
    if (!folder) {
      let name = 'Other';
      if (code === 'visa_guides') name = 'Visa Guides';
      else if (code === 'faq_favorites') name = 'FAQ Favorites';
      const now = new Date().toISOString();
      folder = {
        id: this._generateId('bfolder'),
        name,
        code,
        created_at: now
      };
      folders.push(folder);
      this._saveToStorage('bookmark_folders', folders);
    }
    return folder;
  }

  // ---------------------- ELIGIBILITY HELPERS ----------------------

  _createEligibilityCalculationRunRecord(payload) {
    const runs = this._getFromStorage('eligibility_calculation_runs', []);
    const now = new Date().toISOString();
    const record = {
      id: this._generateId('elig'),
      country: payload.country,
      pathway_key: payload.pathway_key,
      age: payload.age,
      education_level: payload.education_level,
      work_experience_years: payload.work_experience_years,
      language_test: payload.language_test,
      english_proficiency_level: payload.english_proficiency_level,
      total_points: payload.total_points,
      is_eligible: payload.is_eligible,
      created_at: now,
      updated_at: now
    };
    runs.push(record);
    this._saveToStorage('eligibility_calculation_runs', runs);
    return record.id;
  }

  // ---------------------- HOME OVERVIEW ----------------------

  getHomeOverview() {
    const pathwayPlans = this._getFromStorage('pathway_plans', []);
    const servicePackages = this._getFromStorage('service_packages', []);

    const featured_pathways = pathwayPlans
      .filter((p) => p.status === 'active' && p.is_featured)
      .map((p) => ({
        id: p.id,
        name: p.name,
        country: p.country,
        country_label: this._countryLabel(p.country),
        pathway_key: p.pathway_key,
        short_description: p.description || '',
        total_government_fees: p.total_government_fees,
        fee_currency: p.fee_currency,
        average_processing_time_number: p.average_processing_time_number,
        average_processing_time_unit: p.average_processing_time_unit,
        is_featured: !!p.is_featured
      }));

    const activePackages = servicePackages.filter((sp) => sp.status === 'active');
    activePackages.sort((a, b) => (a.created_at || 0) > (b.created_at || 0) ? -1 : 1);

    const popular_service_packages = activePackages.slice(0, 10).map((sp) => ({
      id: sp.id,
      name: sp.name,
      country: sp.country,
      country_label: this._countryLabel(sp.country),
      service_category: sp.service_category,
      service_category_label: this._serviceCategoryLabel(sp.service_category),
      pathway_key: sp.pathway_key || null,
      price: sp.price,
      currency: sp.currency,
      short_description: sp.description || '',
      follow_up_calls_count: sp.follow_up_calls_count,
      includes_document_review: !!sp.includes_document_review,
      includes_mock_interview: !!sp.includes_mock_interview,
      duration_description: sp.duration_description || ''
    }));

    const quick_start_map = {};
    pathwayPlans.forEach((p) => {
      if (p.status !== 'active') return;
      if (!quick_start_map[p.country]) {
        quick_start_map[p.country] = {
          country: p.country,
          country_label: this._countryLabel(p.country),
          common_visa_types: []
        };
      }
      const arr = quick_start_map[p.country].common_visa_types;
      if (!arr.find((x) => x.visa_type_key === p.pathway_key)) {
        arr.push({
          visa_type_key: p.pathway_key,
          visa_type_label: this._pathwayLabel(p.pathway_key),
          target_page: 'pathway_detail'
        });
      }
    });

    const quick_start_options = Object.values(quick_start_map);

    return {
      featured_pathways,
      popular_service_packages,
      quick_start_options
    };
  }

  // ---------------------- SERVICE PACKAGES ----------------------

  getServiceFilters() {
    const service_categories = [
      { value: 'permanent_residency', label: this._serviceCategoryLabel('permanent_residency') },
      { value: 'family_dependent_visas', label: this._serviceCategoryLabel('family_dependent_visas') },
      { value: 'study_visas', label: this._serviceCategoryLabel('study_visas') },
      { value: 'work_visas', label: this._serviceCategoryLabel('work_visas') },
      { value: 'tourist_visas', label: this._serviceCategoryLabel('tourist_visas') }
    ];

    const countries = [
      'canada',
      'australia',
      'united_kingdom',
      'united_states',
      'new_zealand',
      'schengen_area',
      'other'
    ].map((c) => ({ value: c, label: this._countryLabel(c) }));

    const pathway_keys = [
      'canada_express_entry',
      'new_zealand_skilled_migrant',
      'australia_skilled_worker_skilled_independent',
      'australia_skilled_worker',
      'uk_family_reunification',
      'canada_study_visa',
      'us_work_visa',
      'us_general_visa_strategy',
      'schengen_tourist_visa',
      'other'
    ].map((p) => ({ value: p, label: this._pathwayLabel(p) }));

    const servicePackages = this._getFromStorage('service_packages', []);
    let minPrice = null;
    let maxPrice = null;
    let currency = 'usd';
    servicePackages.forEach((sp) => {
      if (typeof sp.price === 'number') {
        if (minPrice === null || sp.price < minPrice) minPrice = sp.price;
        if (maxPrice === null || sp.price > maxPrice) maxPrice = sp.price;
        currency = sp.currency || currency;
      }
    });

    const price_range = {
      min_price: minPrice || 0,
      max_price: maxPrice || 0,
      currency
    };

    const feature_filters = {
      follow_up_calls_options: [
        { value: 0, label: 'Any' },
        { value: 1, label: '1 or more' },
        { value: 2, label: '2 or more' },
        { value: 3, label: '3 or more' }
      ],
      includes_document_review_label: 'Document Review',
      includes_mock_interview_label: 'Mock Interview'
    };

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'popular', label: 'Most Popular' }
    ];

    return {
      service_categories,
      countries,
      pathway_keys,
      price_range,
      feature_filters,
      sort_options
    };
  }

  searchServicePackages(
    service_category,
    country,
    pathway_key,
    min_price,
    max_price,
    min_follow_up_calls,
    includes_document_review,
    includes_mock_interview,
    sort_by,
    page = 1,
    page_size = 20
  ) {
    let items = this._getFromStorage('service_packages', []).filter(
      (sp) => sp.status === 'active'
    );

    if (service_category) {
      items = items.filter((sp) => sp.service_category === service_category);
    }
    if (country) {
      items = items.filter((sp) => sp.country === country);
    }
    if (pathway_key) {
      items = items.filter((sp) => sp.pathway_key === pathway_key);
    }
    if (typeof min_price === 'number') {
      items = items.filter((sp) => typeof sp.price === 'number' && sp.price >= min_price);
    }
    if (typeof max_price === 'number') {
      items = items.filter((sp) => typeof sp.price === 'number' && sp.price <= max_price);
    }
    if (typeof min_follow_up_calls === 'number') {
      items = items.filter(
        (sp) => typeof sp.follow_up_calls_count === 'number' && sp.follow_up_calls_count >= min_follow_up_calls
      );
    }
    if (typeof includes_document_review === 'boolean') {
      items = items.filter(
        (sp) => !!sp.includes_document_review === includes_document_review
      );
    }
    if (typeof includes_mock_interview === 'boolean') {
      items = items.filter(
        (sp) => !!sp.includes_mock_interview === includes_mock_interview
      );
    }

    if (sort_by === 'price_asc') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort_by === 'price_desc') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    const total_count = items.length;
    const start = (page - 1) * page_size;
    const paged = items.slice(start, start + page_size);

    const mapped = paged.map((sp) => ({
      id: sp.id,
      name: sp.name,
      description: sp.description || '',
      country: sp.country,
      country_label: this._countryLabel(sp.country),
      service_category: sp.service_category,
      service_category_label: this._serviceCategoryLabel(sp.service_category),
      pathway_key: sp.pathway_key || null,
      price: sp.price,
      currency: sp.currency,
      follow_up_calls_count: sp.follow_up_calls_count,
      includes_document_review: !!sp.includes_document_review,
      includes_mock_interview: !!sp.includes_mock_interview,
      includes_initial_consultation: !!sp.includes_initial_consultation,
      duration_description: sp.duration_description || '',
      features: Array.isArray(sp.features) ? sp.features : [],
      image_url: sp.image_url || ''
    }));

    return {
      items: mapped,
      total_count,
      page,
      page_size
    };
  }

  getServicePackageDetail(servicePackageId) {
    const servicePackages = this._getFromStorage('service_packages', []);
    const sp = servicePackages.find((s) => s.id === servicePackageId);
    if (!sp) return null;
    return {
      id: sp.id,
      name: sp.name,
      slug: sp.slug || null,
      description: sp.description || '',
      country: sp.country,
      country_label: this._countryLabel(sp.country),
      service_category: sp.service_category,
      service_category_label: this._serviceCategoryLabel(sp.service_category),
      pathway_key: sp.pathway_key || null,
      price: sp.price,
      currency: sp.currency,
      follow_up_calls_count: sp.follow_up_calls_count,
      includes_document_review: !!sp.includes_document_review,
      includes_mock_interview: !!sp.includes_mock_interview,
      includes_initial_consultation: !!sp.includes_initial_consultation,
      duration_description: sp.duration_description || '',
      features: Array.isArray(sp.features) ? sp.features : [],
      eligibility_notes: sp.eligibility_notes || '',
      image_url: sp.image_url || ''
    };
  }

  addServicePackageToCart(servicePackageId, quantity = 1) {
    const cart = this._getOrCreateCart();
    const servicePackages = this._getFromStorage('service_packages', []);
    const servicePackage = servicePackages.find((s) => s.id === servicePackageId);

    if (!servicePackage) {
      return {
        success: false,
        cart: null,
        message: 'Service package not found'
      };
    }

    quantity = quantity > 0 ? quantity : 1;

    let cartItems = this._getFromStorage('cart_items', []);
    let item = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.item_type === 'service_package' &&
        ci.service_package_id === servicePackageId
    );

    if (item) {
      item.quantity += quantity;
      item.total_price = item.quantity * item.unit_price;
    } else {
      const now = new Date().toISOString();
      item = {
        id: this._generateId('citem'),
        cart_id: cart.id,
        item_type: 'service_package',
        service_package_id: servicePackageId,
        consultation_type_id: null,
        quantity,
        unit_price: servicePackage.price || 0,
        total_price: (servicePackage.price || 0) * quantity,
        preferred_date_range_start: null,
        preferred_date_range_end: null,
        added_at: now
      };
      cartItems.push(item);
    }

    cart.updated_at = new Date().toISOString();

    let carts = this._getFromStorage('cart', []);
    const cIndex = carts.findIndex((c) => c.id === cart.id);
    if (cIndex >= 0) {
      carts[cIndex] = cart;
    } else {
      carts.push(cart);
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', carts);

    return {
      success: true,
      cart: this._buildCartResponse(cart),
      message: 'Service package added to cart'
    };
  }

  // ---------------------- CONSULTATIONS ----------------------

  getConsultationFilters() {
    const countries = [
      'canada',
      'australia',
      'united_kingdom',
      'united_states',
      'new_zealand',
      'schengen_area',
      'other'
    ].map((c) => ({ value: c, label: this._countryLabel(c) }));

    const consultation_type_codes = [
      {
        code: 'general_visa_strategy_30_min',
        label: this._consultationTypeLabel('general_visa_strategy_30_min'),
        duration_minutes: 30
      },
      {
        code: 'study_visa_45_min',
        label: this._consultationTypeLabel('study_visa_45_min'),
        duration_minutes: 45
      },
      {
        code: 'work_visa_30_min',
        label: this._consultationTypeLabel('work_visa_30_min'),
        duration_minutes: 30
      }
    ];

    return {
      countries,
      consultation_type_codes
    };
  }

  searchConsultationTypes(country, consultation_code, min_duration_minutes, max_duration_minutes) {
    let list = this._getFromStorage('consultation_types', []).filter(
      (ct) => ct.status === 'active'
    );

    if (country) {
      list = list.filter((ct) => ct.country === country);
    }
    if (consultation_code) {
      list = list.filter((ct) => ct.code === consultation_code);
    }
    if (typeof min_duration_minutes === 'number') {
      list = list.filter((ct) => ct.duration_minutes >= min_duration_minutes);
    }
    if (typeof max_duration_minutes === 'number') {
      list = list.filter((ct) => ct.duration_minutes <= max_duration_minutes);
    }

    return list.map((ct) => ({
      id: ct.id,
      code: ct.code,
      name: ct.name,
      description: ct.description || '',
      country: ct.country,
      country_label: this._countryLabel(ct.country),
      duration_minutes: ct.duration_minutes,
      base_price: ct.base_price,
      currency: ct.currency,
      can_be_scheduled: !!ct.can_be_scheduled,
      status: ct.status
    }));
  }

  getConsultationTypeDetail(consultationTypeId) {
    const types = this._getFromStorage('consultation_types', []);
    const ct = types.find((c) => c.id === consultationTypeId);
    if (!ct) return null;
    return {
      id: ct.id,
      code: ct.code,
      name: ct.name,
      description: ct.description || '',
      country: ct.country,
      country_label: this._countryLabel(ct.country),
      duration_minutes: ct.duration_minutes,
      base_price: ct.base_price,
      currency: ct.currency,
      can_be_scheduled: !!ct.can_be_scheduled,
      status: ct.status
    };
  }

  listConsultationSlots(consultationTypeId, date_range_start, date_range_end) {
    const slots = this._getFromStorage('consultation_slots', []);
    const types = this._getFromStorage('consultation_types', []);
    const ct = types.find((c) => c.id === consultationTypeId) || null;

    const start = new Date(date_range_start).getTime();
    const end = new Date(date_range_end).getTime();

    const filtered = slots.filter((s) => {
      if (s.consultation_type_id !== consultationTypeId) return false;
      const st = new Date(s.start_datetime).getTime();
      if (isNaN(st)) return false;
      if (st < start || st > end) return false;
      if (s.is_booked) return false;
      if (s.status !== 'available') return false;
      return true;
    });

    return filtered.map((s) => ({
      id: s.id,
      consultation_type_id: s.consultation_type_id,
      consultation_type: ct,
      country: s.country,
      country_label: this._countryLabel(s.country),
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      is_booked: !!s.is_booked,
      status: s.status
    }));
  }

  bookConsultationSlot(consultationSlotId, client_name, client_email, client_phone) {
    let slots = this._getFromStorage('consultation_slots', []);
    const types = this._getFromStorage('consultation_types', []);
    const bookings = this._getFromStorage('consultation_bookings', []);

    const slotIndex = slots.findIndex((s) => s.id === consultationSlotId);
    if (slotIndex < 0) {
      return { success: false, booking: null, message: 'Slot not found' };
    }

    const slot = slots[slotIndex];
    if (slot.is_booked || slot.status !== 'available') {
      return { success: false, booking: null, message: 'Slot not available' };
    }

    const ct = types.find((c) => c.id === slot.consultation_type_id) || null;
    const now = new Date().toISOString();

    const booking = {
      id: this._generateId('cbook'),
      consultation_slot_id: slot.id,
      consultation_type_id: slot.consultation_type_id,
      country: slot.country,
      client_name,
      client_email,
      client_phone,
      status: 'confirmed',
      booked_at: now,
      notes: ''
    };

    // Update slot
    slot.is_booked = true;
    slot.status = 'unavailable';
    slot.updated_at = now;
    slots[slotIndex] = slot;

    bookings.push(booking);

    this._saveToStorage('consultation_slots', slots);
    this._saveToStorage('consultation_bookings', bookings);

    return {
      success: true,
      booking: {
        id: booking.id,
        consultation_slot_id: booking.consultation_slot_id,
        consultation_slot: slot,
        consultation_type_id: booking.consultation_type_id,
        consultation_type: ct,
        country: booking.country,
        country_label: this._countryLabel(booking.country),
        client_name: booking.client_name,
        client_email: booking.client_email,
        client_phone: booking.client_phone,
        status: booking.status,
        booked_at: booking.booked_at,
        slot_start_datetime: slot.start_datetime,
        slot_end_datetime: slot.end_datetime
      },
      message: 'Consultation slot booked'
    };
  }

  addConsultationToCart(consultationTypeId, quantity = 1) {
    const cart = this._getOrCreateCart();
    const consultationTypes = this._getFromStorage('consultation_types', []);
    const ct = consultationTypes.find((c) => c.id === consultationTypeId);

    if (!ct) {
      return {
        success: false,
        cart: null,
        message: 'Consultation type not found'
      };
    }

    quantity = quantity > 0 ? quantity : 1;

    let cartItems = this._getFromStorage('cart_items', []);
    let item = cartItems.find(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.item_type === 'consultation_type' &&
        ci.consultation_type_id === consultationTypeId
    );

    if (item) {
      item.quantity += quantity;
      item.total_price = item.quantity * item.unit_price;
    } else {
      const now = new Date().toISOString();
      item = {
        id: this._generateId('citem'),
        cart_id: cart.id,
        item_type: 'consultation_type',
        service_package_id: null,
        consultation_type_id: consultationTypeId,
        quantity,
        unit_price: ct.base_price || 0,
        total_price: (ct.base_price || 0) * quantity,
        preferred_date_range_start: null,
        preferred_date_range_end: null,
        added_at: now
      };
      cartItems.push(item);
    }

    cart.updated_at = new Date().toISOString();

    let carts = this._getFromStorage('cart', []);
    const cIndex = carts.findIndex((c) => c.id === cart.id);
    if (cIndex >= 0) {
      carts[cIndex] = cart;
    } else {
      carts.push(cart);
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', carts);

    return {
      success: true,
      cart: this._buildCartResponse(cart),
      message: 'Consultation added to cart'
    };
  }

  // ---------------------- DOCUMENT CHECKLISTS ----------------------

  getDocumentChecklistSetupOptions() {
    const countries = [
      'canada',
      'australia',
      'united_kingdom',
      'united_states',
      'new_zealand',
      'schengen_area',
      'other'
    ].map((c) => ({ value: c, label: this._countryLabel(c) }));

    const visa_type_keys = [
      { value: 'skilled_worker_skilled_independent', label: 'Skilled Worker / Skilled Independent' },
      { value: 'express_entry', label: 'Express Entry' },
      { value: 'family_reunification', label: 'Family Reunification' },
      { value: 'study_visa', label: 'Study Visa' },
      { value: 'work_visa', label: 'Work Visa' },
      { value: 'tourist_visa', label: 'Tourist Visa' },
      { value: 'other', label: 'Other' }
    ];

    const marital_statuses = [
      'single',
      'married',
      'divorced',
      'widowed',
      'separated',
      'other'
    ].map((m) => ({ value: m, label: this._maritalStatusLabel(m) }));

    const dependents_range = { min: 0, max: 10 };

    return {
      countries,
      visa_type_keys,
      marital_statuses,
      dependents_range
    };
  }

  getRecommendedDocumentsForChecklist(country, visa_type_key, marital_status, dependents_count) {
    const templates = this._getFromStorage('document_checklist_templates', []);
    const items = this._getFromStorage('document_template_items', []);

    const matchingTemplates = templates.filter((t) => {
      if (t.country !== country) return false;
      if (t.visa_type_key !== visa_type_key) return false;
      if (t.applies_to_marital_status !== 'any' && t.applies_to_marital_status !== marital_status) {
        return false;
      }
      if (typeof t.min_dependents === 'number' && dependents_count < t.min_dependents) return false;
      if (typeof t.max_dependents === 'number' && dependents_count > t.max_dependents) return false;
      return true;
    });

    const template = matchingTemplates[0] || null;

    if (!template) {
      return {
        template: null,
        recommended_items: []
      };
    }

    let recommendedItems = items.filter((it) => it.checklist_template_id === template.id);

    if (Array.isArray(template.recommended_item_ids) && template.recommended_item_ids.length) {
      recommendedItems = recommendedItems.filter((it) =>
        template.recommended_item_ids.indexOf(it.id) !== -1
      );
    }

    const mappedItems = recommendedItems.map((it) => ({
      id: it.id,
      name: it.name,
      description: it.description || '',
      is_required: !!it.is_required
    }));

    return {
      template: {
        id: template.id,
        title: template.title || '',
        description: template.description || ''
      },
      recommended_items: mappedItems
    };
  }

  createDocumentChecklist(
    country,
    visa_type_key,
    marital_status,
    dependents_count,
    templateId,
    selected_item_ids
  ) {
    const templates = this._getFromStorage('document_checklist_templates', []);
    const template = templateId ? templates.find((t) => t.id === templateId) : null;
    const templateItems = this._getFromStorage('document_template_items', []);

    const selectedTemplateItems = templateItems.filter((it) =>
      selected_item_ids.indexOf(it.id) !== -1
    );

    const now = new Date().toISOString();
    const checklist = {
      id: this._generateId('dcl'),
      template_id: template ? template.id : null,
      country,
      visa_type_key,
      marital_status,
      dependents_count,
      title:
        (template && template.title) ||
        `${this._countryLabel(country)} – ${this._pathwayLabel(visa_type_key)} Checklist`,
      created_at: now
    };

    const checklists = this._getFromStorage('document_checklists', []);
    checklists.push(checklist);
    this._saveToStorage('document_checklists', checklists);

    const checklistItems = this._getFromStorage('checklist_items', []);
    const createdItems = [];

    selectedTemplateItems.forEach((it) => {
      const ci = {
        id: this._generateId('ditem'),
        checklist_id: checklist.id,
        template_item_id: it.id,
        name: it.name,
        description: it.description || '',
        is_completed: false,
        target_date: null,
        created_at: now
      };
      checklistItems.push(ci);
      createdItems.push(ci);
    });

    this._saveToStorage('checklist_items', checklistItems);

    return {
      checklist: {
        id: checklist.id,
        title: checklist.title,
        country: checklist.country,
        country_label: this._countryLabel(checklist.country),
        visa_type_key: checklist.visa_type_key,
        visa_type_label: this._pathwayLabel(checklist.visa_type_key),
        marital_status: checklist.marital_status,
        marital_status_label: this._maritalStatusLabel(checklist.marital_status),
        dependents_count: checklist.dependents_count,
        created_at: checklist.created_at
      },
      items: createdItems.map((ci) => ({
        id: ci.id,
        name: ci.name,
        description: ci.description,
        is_completed: ci.is_completed,
        target_date: ci.target_date
      }))
    };
  }

  getDocumentChecklistDetail(checklistId) {
    const checklists = this._getFromStorage('document_checklists', []);
    const checklist = checklists.find((c) => c.id === checklistId);
    if (!checklist) return null;

    const checklistItems = this._getFromStorage('checklist_items', []).filter(
      (ci) => ci.checklist_id === checklist.id
    );

    return {
      checklist: {
        id: checklist.id,
        title: checklist.title,
        country: checklist.country,
        country_label: this._countryLabel(checklist.country),
        visa_type_key: checklist.visa_type_key,
        visa_type_label: this._pathwayLabel(checklist.visa_type_key),
        marital_status: checklist.marital_status,
        marital_status_label: this._maritalStatusLabel(checklist.marital_status),
        dependents_count: checklist.dependents_count,
        created_at: checklist.created_at
      },
      items: checklistItems.map((ci) => ({
        id: ci.id,
        name: ci.name,
        description: ci.description || '',
        is_completed: ci.is_completed,
        target_date: ci.target_date
      }))
    };
  }

  updateChecklistItemTargetDate(checklistItemId, target_date) {
    let items = this._getFromStorage('checklist_items', []);
    const index = items.findIndex((ci) => ci.id === checklistItemId);
    if (index < 0) {
      return { success: false, item: null };
    }
    items[index].target_date = target_date;
    this._saveToStorage('checklist_items', items);

    const updated = items[index];
    return {
      success: true,
      item: {
        id: updated.id,
        name: updated.name,
        target_date: updated.target_date
      }
    };
  }

  // ---------------------- ELIGIBILITY CALCULATOR ----------------------

  getEligibilityCalculatorOptions() {
    const countries = [
      'canada',
      'australia',
      'united_kingdom',
      'united_states',
      'new_zealand'
    ].map((c) => ({ value: c, label: this._countryLabel(c) }));

    const pathways_by_country = [
      {
        country: 'australia',
        country_label: this._countryLabel('australia'),
        pathways: [
          { value: 'australia_skilled_worker', label: this._pathwayLabel('australia_skilled_worker') },
          {
            value: 'australia_skilled_worker_skilled_independent',
            label: this._pathwayLabel('australia_skilled_worker_skilled_independent')
          }
        ]
      },
      {
        country: 'canada',
        country_label: this._countryLabel('canada'),
        pathways: [
          { value: 'canada_express_entry', label: this._pathwayLabel('canada_express_entry') }
        ]
      },
      {
        country: 'new_zealand',
        country_label: this._countryLabel('new_zealand'),
        pathways: [
          {
            value: 'new_zealand_skilled_migrant',
            label: this._pathwayLabel('new_zealand_skilled_migrant')
          }
        ]
      },
      {
        country: 'united_kingdom',
        country_label: this._countryLabel('united_kingdom'),
        pathways: [
          { value: 'uk_family_reunification', label: this._pathwayLabel('uk_family_reunification') }
        ]
      }
    ];

    const education_levels = [
      { value: 'high_school', label: 'High school' },
      { value: 'diploma', label: 'Diploma' },
      { value: 'bachelors_degree', label: "Bachelor's degree" },
      { value: 'masters_degree', label: "Master's degree" },
      { value: 'phd', label: 'PhD' }
    ];

    const work_experience_ranges = [
      { value: 'less_than_three_years', label: 'Less than 3 years' },
      { value: 'three_to_five_years', label: '3–5 years' },
      { value: 'five_to_seven_years', label: '5–7 years' },
      { value: 'more_than_seven_years', label: 'More than 7 years' }
    ];

    const language_tests = [
      { value: 'ielts', label: 'IELTS' },
      { value: 'toefl', label: 'TOEFL' },
      { value: 'pte', label: 'PTE' },
      { value: 'none', label: 'None' }
    ];

    const english_proficiency_levels = [
      { value: 'basic', label: this._englishProficiencyLabel('basic'), order: 1 },
      { value: 'intermediate', label: this._englishProficiencyLabel('intermediate'), order: 2 },
      {
        value: 'upper_intermediate',
        label: this._englishProficiencyLabel('upper_intermediate'),
        order: 3
      },
      { value: 'advanced', label: this._englishProficiencyLabel('advanced'), order: 4 },
      { value: 'proficient', label: this._englishProficiencyLabel('proficient'), order: 5 }
    ];

    return {
      countries,
      pathways_by_country,
      education_levels,
      work_experience_ranges,
      language_tests,
      english_proficiency_levels
    };
  }

  calculateEligibilityPoints(
    country,
    pathway_key,
    age,
    education_level,
    work_experience_years,
    language_test,
    english_proficiency_level
  ) {
    // Age points
    let age_points = 0;
    if (age >= 25 && age <= 32) age_points = 25;
    else if (age >= 18 && age <= 24) age_points = 20;
    else if (age >= 33 && age <= 39) age_points = 20;
    else age_points = 10;

    // Education points
    let education_points = 0;
    if (education_level === 'high_school') education_points = 5;
    else if (education_level === 'diploma') education_points = 10;
    else if (education_level === 'bachelors_degree') education_points = 15;
    else if (education_level === 'masters_degree') education_points = 20;
    else if (education_level === 'phd') education_points = 25;

    // Work experience points
    let work_experience_points = 0;
    if (work_experience_years === 'less_than_three_years') work_experience_points = 5;
    else if (work_experience_years === 'three_to_five_years') work_experience_points = 8;
    else if (work_experience_years === 'five_to_seven_years') work_experience_points = 10;
    else if (work_experience_years === 'more_than_seven_years') work_experience_points = 15;

    // Language points
    let language_points = 0;
    if (english_proficiency_level === 'basic') language_points = 0;
    else if (english_proficiency_level === 'intermediate') language_points = 5;
    else if (english_proficiency_level === 'upper_intermediate') language_points = 10;
    else if (english_proficiency_level === 'advanced') language_points = 25;
    else if (english_proficiency_level === 'proficient') language_points = 30;

    const other_points = 0;
    const total_points = age_points + education_points + work_experience_points + language_points + other_points;
    const is_eligible = total_points >= 65;

    const calculation_run_id = this._createEligibilityCalculationRunRecord({
      country,
      pathway_key,
      age,
      education_level,
      work_experience_years,
      language_test,
      english_proficiency_level,
      total_points,
      is_eligible
    });

    return {
      calculation_run_id,
      total_points,
      is_eligible,
      points_breakdown: {
        age_points,
        education_points,
        work_experience_points,
        language_points,
        other_points
      }
    };
  }

  // ---------------------- PATHWAY COMPARISON & SAVED PLANS ----------------------

  getPathwayOptions() {
    const plans = this._getFromStorage('pathway_plans', []).filter(
      (p) => p.status === 'active'
    );

    const countryMap = {};
    const pathwaysByCountry = {};

    plans.forEach((p) => {
      if (!countryMap[p.country]) {
        countryMap[p.country] = {
          value: p.country,
          label: this._countryLabel(p.country)
        };
      }
      if (!pathwaysByCountry[p.country]) pathwaysByCountry[p.country] = {};
      if (!pathwaysByCountry[p.country][p.pathway_key]) {
        pathwaysByCountry[p.country][p.pathway_key] = {
          pathway_key: p.pathway_key,
          pathway_label: this._pathwayLabel(p.pathway_key)
        };
      }
    });

    const countries = Object.values(countryMap);

    const pathways_by_country = Object.keys(pathwaysByCountry).map((country) => ({
      country,
      country_label: this._countryLabel(country),
      pathways: Object.values(pathwaysByCountry[country])
    }));

    return {
      countries,
      pathways_by_country
    };
  }

  comparePathwayPlans(first_country, first_pathway_key, second_country, second_pathway_key) {
    const plans = this._getFromStorage('pathway_plans', []);

    const first_plan_obj = plans.find(
      (p) => p.country === first_country && p.pathway_key === first_pathway_key
    ) || null;
    const second_plan_obj = plans.find(
      (p) => p.country === second_country && p.pathway_key === second_pathway_key
    ) || null;

    const mapPlan = (p) =>
      p
        ? {
            id: p.id,
            country: p.country,
            country_label: this._countryLabel(p.country),
            pathway_key: p.pathway_key,
            name: p.name,
            description: p.description || '',
            total_government_fees: p.total_government_fees,
            fee_currency: p.fee_currency,
            average_processing_time_number: p.average_processing_time_number,
            average_processing_time_unit: p.average_processing_time_unit
          }
        : null;

    return {
      first_plan: mapPlan(first_plan_obj),
      second_plan: mapPlan(second_plan_obj)
    };
  }

  getPathwayPlanDetail(pathwayPlanId) {
    const plans = this._getFromStorage('pathway_plans', []);
    const p = plans.find((pl) => pl.id === pathwayPlanId);
    if (!p) return null;
    return {
      id: p.id,
      country: p.country,
      country_label: this._countryLabel(p.country),
      pathway_key: p.pathway_key,
      name: p.name,
      description: p.description || '',
      total_government_fees: p.total_government_fees,
      fee_currency: p.fee_currency,
      average_processing_time_number: p.average_processing_time_number,
      average_processing_time_unit: p.average_processing_time_unit,
      steps: Array.isArray(p.steps) ? p.steps : [],
      documentation_overview: p.documentation_overview || ''
    };
  }

  savePathwayPlan(pathwayPlanId) {
    const plans = this._getFromStorage('pathway_plans', []);
    const plan = plans.find((p) => p.id === pathwayPlanId);
    if (!plan) {
      return { success: false, saved_plan: null };
    }

    const savedPlans = this._getFromStorage('saved_pathway_plans', []);
    let existing = savedPlans.find((s) => s.pathway_plan_id === pathwayPlanId);
    if (!existing) {
      existing = {
        id: this._generateId('spath'),
        pathway_plan_id: pathwayPlanId,
        saved_at: new Date().toISOString()
      };
      savedPlans.push(existing);
      this._saveToStorage('saved_pathway_plans', savedPlans);
    }

    return {
      success: true,
      saved_plan: {
        saved_id: existing.id,
        pathway_plan_id: existing.pathway_plan_id,
        saved_at: existing.saved_at
      }
    };
  }

  getSavedPathwayPlans() {
    const savedPlans = this._getFromStorage('saved_pathway_plans', []);
    const plans = this._getFromStorage('pathway_plans', []);

    return savedPlans.map((s) => {
      const plan = plans.find((p) => p.id === s.pathway_plan_id) || null;
      return {
        saved_id: s.id,
        pathway_plan_id: s.pathway_plan_id,
        pathway_plan: plan,
        name: plan ? plan.name : null,
        country_label: plan ? this._countryLabel(plan.country) : null,
        pathway_label: plan ? this._pathwayLabel(plan.pathway_key) : null,
        saved_at: s.saved_at
      };
    });
  }

  // ---------------------- VISA GUIDES & BOOKMARKS ----------------------

  getVisaGuideFilterOptions() {
    const regions = ['europe', 'north_america', 'oceania', 'asia', 'global', 'other'].map(
      (r) => ({ value: r, label: this._regionLabel(r) })
    );

    const visa_types = ['tourist', 'study', 'work', 'family', 'permanent_residency'].map((v) => ({
      value: v,
      label: this._visaTypeLabel(v)
    }));

    const duration_categories = [
      { value: 'up_to_30_days', label: 'Up to 30 days' },
      { value: 'thirty_one_to_ninety_days', label: '31–90 days' },
      { value: 'more_than_ninety_days', label: 'More than 90 days' }
    ];

    const rating_filter = {
      min_rating: 0,
      max_rating: 5
    };

    return {
      regions,
      visa_types,
      duration_categories,
      rating_filter
    };
  }

  searchVisaGuides(
    region,
    visa_type,
    keyword,
    duration_category,
    min_rating,
    min_review_count,
    page = 1,
    page_size = 20
  ) {
    let guides = this._getFromStorage('visa_guides', []).filter(
      (g) => g.status === 'published'
    );

    if (region) {
      guides = guides.filter((g) => g.region === region);
    }
    if (visa_type) {
      guides = guides.filter((g) => g.visa_type === visa_type);
    }
    if (duration_category) {
      guides = guides.filter((g) => g.duration_category === duration_category);
    }
    if (typeof min_rating === 'number') {
      guides = guides.filter((g) => (g.rating || 0) >= min_rating);
    }
    if (typeof min_review_count === 'number') {
      guides = guides.filter((g) => (g.review_count || 0) >= min_review_count);
    }
    if (keyword) {
      const q = String(keyword).toLowerCase();
      guides = guides.filter((g) => {
        const inTitle = (g.title || '').toLowerCase().indexOf(q) !== -1;
        const inSummary = (g.summary || '').toLowerCase().indexOf(q) !== -1;
        const inKeywords = Array.isArray(g.keywords)
          ? g.keywords.some((k) => String(k).toLowerCase().indexOf(q) !== -1)
          : false;
        return inTitle || inSummary || inKeywords;
      });
    }

    const total_count = guides.length;
    const start = (page - 1) * page_size;
    const paged = guides.slice(start, start + page_size);

    const items = paged.map((g) => ({
      id: g.id,
      title: g.title,
      region: g.region,
      region_label: this._regionLabel(g.region),
      country: g.country,
      country_label: g.country ? this._countryLabel(g.country) : null,
      visa_type: g.visa_type,
      visa_type_label: g.visa_type ? this._visaTypeLabel(g.visa_type) : null,
      duration_category: g.duration_category,
      summary: g.summary || '',
      rating: g.rating || 0,
      review_count: g.review_count || 0
    }));

    return {
      items,
      total_count,
      page,
      page_size
    };
  }

  getVisaGuideDetail(guideId) {
    const guides = this._getFromStorage('visa_guides', []);
    const g = guides.find((guide) => guide.id === guideId);
    if (!g) return null;
    return {
      id: g.id,
      title: g.title,
      region: g.region,
      region_label: this._regionLabel(g.region),
      country: g.country,
      country_label: g.country ? this._countryLabel(g.country) : null,
      visa_type: g.visa_type,
      visa_type_label: g.visa_type ? this._visaTypeLabel(g.visa_type) : null,
      duration_category: g.duration_category,
      summary: g.summary || '',
      content: g.content || '',
      rating: g.rating || 0,
      review_count: g.review_count || 0
    };
  }

  getBookmarkFolders() {
    // Ensure default folders exist
    this._getOrCreateDefaultBookmarkFolder('visa_guides');
    this._getOrCreateDefaultBookmarkFolder('faq_favorites');

    const folders = this._getFromStorage('bookmark_folders', []);
    return folders.map((f) => ({
      id: f.id,
      name: f.name,
      code: f.code
    }));
  }

  bookmarkVisaGuide(guideId, folderId) {
    const guides = this._getFromStorage('visa_guides', []);
    const guide = guides.find((g) => g.id === guideId);
    if (!guide) {
      return { success: false, bookmark: null };
    }

    let folder = null;
    if (folderId) {
      const folders = this._getFromStorage('bookmark_folders', []);
      folder = folders.find((f) => f.id === folderId) || null;
    }
    if (!folder) {
      folder = this._getOrCreateDefaultBookmarkFolder('visa_guides');
    }

    const bookmarks = this._getFromStorage('guide_bookmarks', []);
    let existing = bookmarks.find(
      (b) => b.guide_id === guideId && b.folder_id === folder.id
    );

    if (!existing) {
      existing = {
        id: this._generateId('gbook'),
        guide_id: guideId,
        folder_id: folder.id,
        saved_at: new Date().toISOString()
      };
      bookmarks.push(existing);
      this._saveToStorage('guide_bookmarks', bookmarks);
    }

    return {
      success: true,
      bookmark: existing
    };
  }

  getBookmarkedVisaGuides(folderId) {
    const bookmarks = this._getFromStorage('guide_bookmarks', []);
    const guides = this._getFromStorage('visa_guides', []);
    const folders = this._getFromStorage('bookmark_folders', []);

    let filtered = bookmarks;
    if (folderId) {
      filtered = filtered.filter((b) => b.folder_id === folderId);
    }

    return filtered.map((b) => {
      const guide = guides.find((g) => g.id === b.guide_id) || null;
      const folder = folders.find((f) => f.id === b.folder_id) || null;
      return {
        bookmark_id: b.id,
        guide_id: b.guide_id,
        guide,
        title: guide ? guide.title : null,
        folder_id: b.folder_id,
        folder_name: folder ? folder.name : null,
        folder,
        saved_at: b.saved_at
      };
    });
  }

  // ---------------------- FAQ & FAVORITES ----------------------

  getFaqFilterOptions() {
    const faqs = this._getFromStorage('faqs', []);

    const countriesSet = new Set();
    faqs.forEach((f) => {
      if (f.country) countriesSet.add(f.country);
    });

    const countries = Array.from(countriesSet).map((c) => ({
      value: c,
      label: this._countryLabel(c)
    }));

    const categoriesSet = new Set();
    faqs.forEach((f) => {
      if (Array.isArray(f.categories)) {
        f.categories.forEach((cat) => categoriesSet.add(cat));
      }
    });

    const categories = Array.from(categoriesSet).map((c) => ({
      value: c,
      label: c
    }));

    return {
      countries,
      categories
    };
  }

  searchFaqs(query, country, category, page = 1, page_size = 20) {
    let faqs = this._getFromStorage('faqs', []).filter(
      (f) => f.status === 'published'
    );

    if (country) {
      faqs = faqs.filter((f) => f.country === country);
    }
    if (category) {
      faqs = faqs.filter((f) => Array.isArray(f.categories) && f.categories.indexOf(category) !== -1);
    }
    if (query) {
      const q = String(query).toLowerCase();
      faqs = faqs.filter((f) => {
        const inTitle = (f.title || '').toLowerCase().indexOf(q) !== -1;
        const inQuestion = (f.question || '').toLowerCase().indexOf(q) !== -1;
        const inAnswer = (f.answer || '').toLowerCase().indexOf(q) !== -1;
        const inPreview = (f.preview_text || '').toLowerCase().indexOf(q) !== -1;
        return inTitle || inQuestion || inAnswer || inPreview;
      });
    }

    const total_count = faqs.length;
    const start = (page - 1) * page_size;
    const paged = faqs.slice(start, start + page_size);

    const items = paged.map((f) => ({
      id: f.id,
      title: f.title,
      country: f.country,
      country_label: f.country ? this._countryLabel(f.country) : null,
      preview_text: f.preview_text || ''
    }));

    return {
      items,
      total_count,
      page,
      page_size
    };
  }

  getFaqDetail(faqId) {
    const faqs = this._getFromStorage('faqs', []);
    const f = faqs.find((faq) => faq.id === faqId);
    if (!f) return null;
    return {
      id: f.id,
      title: f.title,
      question: f.question || '',
      answer: f.answer || '',
      country: f.country,
      country_label: f.country ? this._countryLabel(f.country) : null
    };
  }

  favoriteFaq(faqId) {
    const faqs = this._getFromStorage('faqs', []);
    const faq = faqs.find((f) => f.id === faqId);
    if (!faq) {
      return { success: false, favorite: null };
    }

    const favorites = this._getFromStorage('faq_favorites', []);
    let existing = favorites.find((fav) => fav.faq_id === faqId);

    if (!existing) {
      existing = {
        id: this._generateId('ffav'),
        faq_id: faqId,
        saved_at: new Date().toISOString()
      };
      favorites.push(existing);
      this._saveToStorage('faq_favorites', favorites);
    }

    return {
      success: true,
      favorite: existing
    };
  }

  getFavoriteFaqs() {
    const favorites = this._getFromStorage('faq_favorites', []);
    const faqs = this._getFromStorage('faqs', []);

    return favorites.map((fav) => {
      const faq = faqs.find((f) => f.id === fav.faq_id) || null;
      return {
        favorite_id: fav.id,
        faq_id: fav.faq_id,
        faq,
        title: faq ? faq.title : null,
        saved_at: fav.saved_at
      };
    });
  }

  // ---------------------- CART & CHECKOUT ----------------------

  getCartDetails() {
    const cart = this._getOrCreateCart();
    return {
      cart: this._buildCartResponse(cart)
    };
  }

  updateCartItemSchedulePreferences(cartItemId, preferred_date_range_start, preferred_date_range_end) {
    let items = this._getFromStorage('cart_items', []);
    const index = items.findIndex((ci) => ci.id === cartItemId);
    if (index < 0) {
      return { success: false, cart_item: null };
    }
    items[index].preferred_date_range_start = preferred_date_range_start;
    items[index].preferred_date_range_end = preferred_date_range_end;
    this._saveToStorage('cart_items', items);

    const ci = items[index];
    return {
      success: true,
      cart_item: {
        cart_item_id: ci.id,
        preferred_date_range_start: ci.preferred_date_range_start,
        preferred_date_range_end: ci.preferred_date_range_end
      }
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let items = this._getFromStorage('cart_items', []);
    const index = items.findIndex((ci) => ci.id === cartItemId);
    if (index < 0) {
      return { success: false };
    }
    const q = quantity > 0 ? quantity : 1;
    items[index].quantity = q;
    items[index].total_price = q * (items[index].unit_price || 0);
    this._saveToStorage('cart_items', items);
    return { success: true };
  }

  removeCartItem(cartItemId) {
    let items = this._getFromStorage('cart_items', []);
    const index = items.findIndex((ci) => ci.id === cartItemId);
    if (index < 0) {
      return { success: false };
    }
    items.splice(index, 1);
    this._saveToStorage('cart_items', items);
    return { success: true };
  }

  createCheckoutSessionFromCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []).filter(
      (ci) => ci.cart_id === cart.id
    );
    const servicePackages = this._getFromStorage('service_packages', []);
    const consultationTypes = this._getFromStorage('consultation_types', []);

    let items_count = 0;
    let total_amount = 0;
    let currency = null;

    cartItems.forEach((ci) => {
      items_count += ci.quantity || 0;
      total_amount += ci.total_price || 0;
      if (!currency) {
        if (ci.item_type === 'service_package') {
          const sp = servicePackages.find((s) => s.id === ci.service_package_id);
          if (sp) currency = sp.currency;
        } else if (ci.item_type === 'consultation_type') {
          const ct = consultationTypes.find((c) => c.id === ci.consultation_type_id);
          if (ct) currency = ct.currency;
        }
      }
    });

    const now = new Date().toISOString();
    const session = {
      id: this._generateId('chk'),
      cart_id: cart.id,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      status: 'in_review',
      created_at: now,
      updated_at: now
    };

    const sessions = this._getFromStorage('checkout_sessions', []);
    sessions.push(session);
    this._saveToStorage('checkout_sessions', sessions);

    return {
      checkout_session: {
        id: session.id,
        cart_id: session.cart_id,
        status: session.status,
        created_at: session.created_at
      },
      cart_snapshot: {
        items_count,
        total_amount,
        currency
      }
    };
  }

  getCheckoutSummary(checkoutSessionId) {
    let session = null;
    const sessions = this._getFromStorage('checkout_sessions', []);

    if (checkoutSessionId) {
      session = sessions.find((s) => s.id === checkoutSessionId) || null;
    } else {
      session = this._getCurrentCheckoutSession();
    }

    if (!session) {
      return {
        checkout_session: null,
        items: [],
        totals: {
          subtotal: 0,
          tax: 0,
          grand_total: 0,
          currency: null
        },
        disclaimers: []
      };
    }

    const cart = this._getFromStorage('cart', []).find((c) => c.id === session.cart_id);
    const cartItems = this._getFromStorage('cart_items', []).filter(
      (ci) => ci.cart_id === session.cart_id
    );
    const servicePackages = this._getFromStorage('service_packages', []);
    const consultationTypes = this._getFromStorage('consultation_types', []);

    const items = [];
    let subtotal = 0;
    let currency = null;

    cartItems.forEach((ci) => {
      let display_name = '';
      let country_label = null;
      let details = '';
      let itemCurrency = null;

      if (ci.item_type === 'service_package') {
        const sp = servicePackages.find((s) => s.id === ci.service_package_id);
        if (sp) {
          display_name = sp.name;
          country_label = this._countryLabel(sp.country);
          details = this._serviceCategoryLabel(sp.service_category);
          itemCurrency = sp.currency;
        }
      } else if (ci.item_type === 'consultation_type') {
        const ct = consultationTypes.find((c2) => c2.id === ci.consultation_type_id);
        if (ct) {
          display_name = ct.name;
          country_label = this._countryLabel(ct.country);
          details = `Duration: ${ct.duration_minutes} minutes`;
          itemCurrency = ct.currency;
        }
      }

      subtotal += ci.total_price || 0;
      if (!currency) currency = itemCurrency;

      items.push({
        cart_item_id: ci.id,
        item_type: ci.item_type,
        display_name,
        country_label,
        details,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price
      });
    });

    const tax = 0;
    const grand_total = subtotal + tax;

    const checkout_session = {
      id: session.id,
      cart_id: session.cart_id,
      status: session.status,
      contact_name: session.contact_name,
      contact_email: session.contact_email,
      contact_phone: session.contact_phone
    };

    const disclaimers = [
      'All prices exclude government filing fees and third-party costs.',
      'Consultation availability is subject to confirmation.'
    ];

    return {
      checkout_session,
      items,
      totals: {
        subtotal,
        tax,
        grand_total,
        currency
      },
      disclaimers
    };
  }

  updateCheckoutContactDetails(checkoutSessionId, contact_name, contact_email, contact_phone) {
    let sessions = this._getFromStorage('checkout_sessions', []);
    const index = sessions.findIndex((s) => s.id === checkoutSessionId);
    if (index < 0) {
      return { success: false };
    }
    sessions[index].contact_name = contact_name;
    sessions[index].contact_email = contact_email;
    sessions[index].contact_phone = contact_phone || null;
    sessions[index].updated_at = new Date().toISOString();
    this._saveToStorage('checkout_sessions', sessions);
    return { success: true };
  }

  completeCheckout(checkoutSessionId) {
    let sessions = this._getFromStorage('checkout_sessions', []);
    const sIndex = sessions.findIndex((s) => s.id === checkoutSessionId);
    if (sIndex < 0) {
      return { success: false };
    }

    const session = sessions[sIndex];
    session.status = 'completed';
    session.updated_at = new Date().toISOString();
    sessions[sIndex] = session;
    this._saveToStorage('checkout_sessions', sessions);

    let carts = this._getFromStorage('cart', []);
    const cIndex = carts.findIndex((c) => c.id === session.cart_id);
    if (cIndex >= 0) {
      carts[cIndex].status = 'checked_out';
      carts[cIndex].updated_at = new Date().toISOString();
      this._saveToStorage('cart', carts);
    }

    return { success: true };
  }

  // ---------------------- CONTACT REQUEST ----------------------

  submitContactRequest(name, email, phone, topic, message) {
    const requests = this._getFromStorage('contact_requests', []);
    const now = new Date().toISOString();
    const record = {
      id: this._generateId('creq'),
      name,
      email,
      phone: phone || null,
      topic: topic || null,
      message,
      created_at: now
    };
    requests.push(record);
    this._saveToStorage('contact_requests', requests);
    return { success: true };
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
