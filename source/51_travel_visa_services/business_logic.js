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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tables = [
      'countries',
      'visa_purposes',
      'visa_products',
      'visa_variants',
      'processing_options',
      'visa_applications',
      'group_applications',
      'travelers',
      'trip_planner_items',
      'appointment_locations',
      'appointment_categories',
      'appointment_slots',
      'appointment_bookings',
      'add_on_services',
      'promo_codes',
      'carts',
      'cart_items',
      'shipping_methods',
      'orders',
      'order_items',
      'order_messages',
      'help_articles',
      'help_article_bookmarks'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Checkout state is a single object, not an array
    if (!localStorage.getItem('checkout_state')) {
      localStorage.setItem('checkout_state', JSON.stringify(null));
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _findById(collection, id) {
    return collection.find((item) => item.id === id) || null;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // ---------------------- Cart Helpers ----------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('current_cart_id');
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        item_ids: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        promo_code_id: null,
        created_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', cart.id);
    }

    return cart;
  }

  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const promoCodes = this._getFromStorage('promo_codes');

    const items = cartItems.filter((ci) => ci.cart_id === cart.id);
    const subtotal = items.reduce((sum, item) => sum + (item.total_price || 0), 0);

    let discountTotal = 0;
    let promo = null;
    if (cart.promo_code_id) {
      promo = promoCodes.find((p) => p.id === cart.promo_code_id && p.is_active);
    }

    if (promo) {
      const now = new Date();
      const validFrom = promo.valid_from ? new Date(promo.valid_from) : null;
      const validTo = promo.valid_to ? new Date(promo.valid_to) : null;
      const isWithinDates = (!validFrom || now >= validFrom) && (!validTo || now <= validTo);
      const meetsMinSubtotal = !promo.min_subtotal || subtotal >= promo.min_subtotal;

      if (isWithinDates && meetsMinSubtotal) {
        if (promo.discount_type === 'percentage') {
          discountTotal = subtotal * (promo.discount_value / 100);
        } else if (promo.discount_type === 'fixed_amount') {
          discountTotal = promo.discount_value;
        }
      } else {
        // Promo no longer valid for this cart
        cart.promo_code_id = null;
      }
    }

    if (discountTotal > subtotal) discountTotal = subtotal;

    cart.subtotal = Number(subtotal.toFixed(2));
    cart.discount_total = Number(discountTotal.toFixed(2));
    cart.total = Number((cart.subtotal - cart.discount_total).toFixed(2));

    const updatedCarts = carts.map((c) => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', updatedCarts);
  }

  // ---------------------- Checkout Helpers ----------------------

  _getCurrentCheckoutState() {
    const cart = this._getOrCreateCart();
    let state = this._getFromStorage('checkout_state', null);

    if (!state || state.cart_id !== cart.id) {
      state = {
        cart_id: cart.id,
        shipping_method_id: null,
        shipping_total: 0,
        contact_info: {},
        shipping_address: {}
      };
      this._saveToStorage('checkout_state', state);
    }

    return { cart, state };
  }

  _saveCheckoutState(state) {
    this._saveToStorage('checkout_state', state);
  }

  // ---------------------- Shipping Helpers ----------------------

  _evaluateShippingTotals(baseSubtotal, discountTotal, shippingMethod, numberOfPassports) {
    const count = typeof numberOfPassports === 'number' && numberOfPassports > 0 ? numberOfPassports : 1;
    const perPassport = !!shippingMethod.is_per_passport;
    const shippingTotal = perPassport ? shippingMethod.price * count : shippingMethod.price;
    const resultingOrderTotal = baseSubtotal - discountTotal + shippingTotal;
    return {
      shipping_total: Number(shippingTotal.toFixed(2)),
      resulting_order_total: Number(resultingOrderTotal.toFixed(2))
    };
  }

  // ---------------------- Application Route Helper ----------------------

  _getApplicationRouteOptions() {
    // Derive valid destination/citizenship/purpose combinations from existing visa_products
    const visaProducts = this._getFromStorage('visa_products');
    const visaPurposes = this._getFromStorage('visa_purposes');

    const routesMap = {};
    for (const vp of visaProducts) {
      const purpose = visaPurposes.find((p) => p.id === vp.purpose_id);
      if (!purpose) continue;
      const key = vp.destination_country_id + '|' + vp.citizenship_country_id + '|' + purpose.code;
      routesMap[key] = {
        destination_country_id: vp.destination_country_id,
        citizenship_country_id: vp.citizenship_country_id,
        purpose_code: purpose.code
      };
    }
    return Object.values(routesMap);
  }

  // ---------------------- Core Interfaces ----------------------
  // 1) Homepage & Promotions

  getHomePageHighlights() {
    const countries = this._getFromStorage('countries');
    const visaProducts = this._getFromStorage('visa_products');
    const visaPurposes = this._getFromStorage('visa_purposes');
    const promoCodes = this._getFromStorage('promo_codes');

    // Popular destinations by count of visa_products
    const destCount = {};
    for (const vp of visaProducts) {
      if (!vp.destination_country_id) continue;
      destCount[vp.destination_country_id] = (destCount[vp.destination_country_id] || 0) + 1;
    }
    const popular_destinations = Object.keys(destCount)
      .sort((a, b) => destCount[b] - destCount[a])
      .map((countryId) => {
        const country = countries.find((c) => c.id === countryId) || {};
        return {
          country_id: countryId,
          country_name: country.name || '',
          iso_code: country.iso_code || '',
          is_schengen: !!country.is_schengen
        };
      });

    // Featured visa products: all active products
    const featured_visa_products = visaProducts
      .filter((vp) => vp.status === 'active')
      .map((vp) => {
        const dest = countries.find((c) => c.id === vp.destination_country_id) || {};
        const cit = countries.find((c) => c.id === vp.citizenship_country_id) || {};
        const purpose = visaPurposes.find((p) => p.id === vp.purpose_id) || {};
        return {
          visa_product_id: vp.id,
          name: vp.name,
          slug: vp.slug,
          visa_category: vp.visa_category,
          purpose_code: purpose.code || '',
          destination_country_name: dest.name || '',
          citizenship_country_name: cit.name || '',
          allowed_stay_description: vp.allowed_stay_description || '',
          from_price: vp.base_service_fee || 0,
          currency: vp.currency,
          requires_appointment: !!vp.requires_appointment,
          is_multi_applicant_supported: !!vp.is_multi_applicant_supported
        };
      });

    // Promo banners from active promotions
    const now = new Date();
    const promo_banners = promoCodes
      .filter((p) => {
        if (!p.is_active) return false;
        const validFrom = p.valid_from ? new Date(p.valid_from) : null;
        const validTo = p.valid_to ? new Date(p.valid_to) : null;
        if (validFrom && now < validFrom) return false;
        if (validTo && now > validTo) return false;
        return true;
      })
      .map((p) => ({
        promo_code: p.code,
        title: p.description || p.code,
        description: p.description || '',
        discount_type: p.discount_type,
        discount_value: p.discount_value,
        min_subtotal: p.min_subtotal || 0
      }));

    return {
      popular_destinations,
      featured_visa_products,
      promo_banners
    };
  }

  getActivePromotions() {
    const promoCodes = this._getFromStorage('promo_codes');
    const now = new Date();

    const promotions = promoCodes
      .filter((p) => {
        if (!p.is_active) return false;
        const validFrom = p.valid_from ? new Date(p.valid_from) : null;
        const validTo = p.valid_to ? new Date(p.valid_to) : null;
        if (validFrom && now < validFrom) return false;
        if (validTo && now > validTo) return false;
        return true;
      })
      .map((p) => ({
        promo_code: p.code,
        description: p.description || '',
        discount_type: p.discount_type,
        discount_value: p.discount_value,
        min_subtotal: p.min_subtotal || 0,
        valid_to: p.valid_to || null
      }));

    return { promotions };
  }

  // 2) Visa Search & Requirements

  searchVisaServices(query, filters) {
    const q = (query || '').trim().toLowerCase();
    const filterObj = filters || {};

    const visaProducts = this._getFromStorage('visa_products');
    const countries = this._getFromStorage('countries');
    const visaPurposes = this._getFromStorage('visa_purposes');

    let results = visaProducts.filter((vp) => vp.status === 'active');

    if (q) {
      results = results.filter((vp) => {
        const name = (vp.name || '').toLowerCase();
        const desc = (vp.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (filterObj.destination_country_id) {
      results = results.filter((vp) => vp.destination_country_id === filterObj.destination_country_id);
    }

    if (filterObj.citizenship_country_id) {
      results = results.filter((vp) => vp.citizenship_country_id === filterObj.citizenship_country_id);
    }

    if (filterObj.purpose_code) {
      results = results.filter((vp) => {
        const purpose = visaPurposes.find((p) => p.id === vp.purpose_id);
        return purpose && purpose.code === filterObj.purpose_code;
      });
    }

    // Sorting
    if (filterObj.sort_by === 'price_low_to_high') {
      results.sort((a, b) => (a.base_service_fee || 0) - (b.base_service_fee || 0));
    } else if (filterObj.sort_by === 'price_high_to_low') {
      results.sort((a, b) => (b.base_service_fee || 0) - (a.base_service_fee || 0));
    } else if (filterObj.sort_by === 'processing_time_asc') {
      // approximate: use min processing time across options
      const processingOptions = this._getFromStorage('processing_options');
      const minTimeMap = {};
      for (const po of processingOptions) {
        const current = minTimeMap[po.visa_product_id];
        if (po.processing_time_business_days == null) continue;
        if (current == null || po.processing_time_business_days < current) {
          minTimeMap[po.visa_product_id] = po.processing_time_business_days;
        }
      }
      results.sort((a, b) => (minTimeMap[a.id] || 0) - (minTimeMap[b.id] || 0));
    }

    const mappedResults = results.map((vp) => {
      const dest = countries.find((c) => c.id === vp.destination_country_id) || {};
      const cit = countries.find((c) => c.id === vp.citizenship_country_id) || {};
      const purpose = visaPurposes.find((p) => p.id === vp.purpose_id) || {};
      return {
        visa_product_id: vp.id,
        name: vp.name,
        slug: vp.slug,
        visa_category: vp.visa_category,
        purpose_code: purpose.code || '',
        destination_country_name: dest.name || '',
        citizenship_country_name: cit.name || '',
        allowed_stay_description: vp.allowed_stay_description || '',
        from_price: vp.base_service_fee || 0,
        currency: vp.currency,
        requires_appointment: !!vp.requires_appointment,
        is_multi_applicant_supported: !!vp.is_multi_applicant_supported
      };
    });

    return {
      results: mappedResults,
      total_results: mappedResults.length,
      suggestions: [],
      applied_filters: {
        destination_country_id: filterObj.destination_country_id || null,
        citizenship_country_id: filterObj.citizenship_country_id || null,
        purpose_code: filterObj.purpose_code || null,
        sort_by: filterObj.sort_by || 'relevance'
      }
    };
  }

  getVisaSearchFilterOptions() {
    const destinations = this._getFromStorage('countries').map((c) => ({
      country_id: c.id,
      country_name: c.name,
      is_schengen: !!c.is_schengen
    }));

    const citizenships = destinations.slice();

    const purposes = this._getFromStorage('visa_purposes').map((p) => ({
      code: p.code,
      name: p.name
    }));

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'processing_time_asc', label: 'Fastest processing' }
    ];

    return {
      destinations,
      citizenships,
      purposes,
      sort_options
    };
  }

  getVisaRequirementsFormOptions() {
    const citizenship_countries = this._getFromStorage('countries');
    const destination_countries = citizenship_countries.slice();
    const purposes = this._getFromStorage('visa_purposes');
    const length_of_stay_units = ['days', 'weeks', 'months'];

    return {
      citizenship_countries,
      destination_countries,
      purposes,
      length_of_stay_units
    };
  }

  getVisaRequirementsResults(citizenship_country_id, destination_country_id, purpose_code, length_of_stay_days) {
    const countries = this._getFromStorage('countries');
    const visaProducts = this._getFromStorage('visa_products');
    const visaPurposes = this._getFromStorage('visa_purposes');

    const matchesRaw = visaProducts.filter((vp) => {
      if (vp.status !== 'active') return false;
      if (vp.citizenship_country_id !== citizenship_country_id) return false;
      if (vp.destination_country_id !== destination_country_id) return false;
      const purpose = visaPurposes.find((p) => p.id === vp.purpose_id);
      if (!purpose || purpose.code !== purpose_code) return false;
      if (vp.allowed_stay_max_days != null && typeof length_of_stay_days === 'number') {
        return length_of_stay_days <= vp.allowed_stay_max_days;
      }
      return true;
    });

    const matches = matchesRaw.map((vp) => {
      const dest = countries.find((c) => c.id === vp.destination_country_id) || {};
      const cit = countries.find((c) => c.id === vp.citizenship_country_id) || {};
      const purpose = visaPurposes.find((p) => p.id === vp.purpose_id) || {};
      return {
        visa_product_id: vp.id,
        name: vp.name,
        description: vp.description || '',
        visa_category: vp.visa_category,
        purpose_code: purpose.code || '',
        destination_country_name: dest.name || '',
        citizenship_country_name: cit.name || '',
        allowed_stay_max_days: vp.allowed_stay_max_days || null,
        allowed_stay_description: vp.allowed_stay_description || '',
        currency: vp.currency,
        base_service_fee_from: vp.base_service_fee || 0,
        requires_appointment: !!vp.requires_appointment
      };
    });

    const recommendation_note = matches.length
      ? 'Results are based on your citizenship, destination, purpose of travel, and stay length.'
      : 'No visa products matched your criteria. Please adjust your selections.';

    return { matches, recommendation_note };
  }

  getVisaProductDetails(visa_product_id) {
    const visaProducts = this._getFromStorage('visa_products');
    const visaVariants = this._getFromStorage('visa_variants');
    const countries = this._getFromStorage('countries');
    const visaPurposes = this._getFromStorage('visa_purposes');

    const vp = visaProducts.find((p) => p.id === visa_product_id);
    if (!vp) {
      return {
        product: null,
        variants: [],
        default_variant_id: null,
        required_documents_summary: '',
        consular_notes: ''
      };
    }

    const dest = countries.find((c) => c.id === vp.destination_country_id) || {};
    const cit = countries.find((c) => c.id === vp.citizenship_country_id) || {};
    const purpose = visaPurposes.find((p) => p.id === vp.purpose_id) || {};

    const product = {
      visa_product_id: vp.id,
      name: vp.name,
      slug: vp.slug,
      description: vp.description || '',
      visa_category: vp.visa_category,
      purpose_code: purpose.code || '',
      destination_country_name: dest.name || '',
      citizenship_country_name: cit.name || '',
      allowed_stay_max_days: vp.allowed_stay_max_days || null,
      allowed_stay_description: vp.allowed_stay_description || '',
      requires_appointment: !!vp.requires_appointment,
      is_multi_applicant_supported: !!vp.is_multi_applicant_supported,
      base_service_fee: vp.base_service_fee || 0,
      government_fee: vp.government_fee || 0,
      currency: vp.currency
    };

    const variantsRaw = visaVariants.filter((v) => v.visa_product_id === visa_product_id);
    const variants = variantsRaw.map((v) => ({
      ...v,
      visa_product: vp // foreign key resolution
    }));

    const defaultVariant = variantsRaw.find((v) => v.is_default) || variantsRaw[0] || null;
    const default_variant_id = defaultVariant ? defaultVariant.id : null;

    const required_documents_summary = 'Required documents vary by traveler and consulate. Review the checklist after starting your application.';
    const consular_notes = 'Processing times and requirements are subject to change by the destination consulate.';

    return {
      product,
      variants,
      default_variant_id,
      required_documents_summary,
      consular_notes
    };
  }

  getVisaProductProcessingOptions(visa_product_id, sort_by) {
    const processingOptions = this._getFromStorage('processing_options');
    let options = processingOptions.filter((po) => po.visa_product_id === visa_product_id);

    if (sort_by === 'price_low_to_high') {
      options = options.sort((a, b) => (a.total_price || 0) - (b.total_price || 0));
    } else if (sort_by === 'price_high_to_low') {
      options = options.sort((a, b) => (b.total_price || 0) - (a.total_price || 0));
    } else if (sort_by === 'fastest_first') {
      options = options.sort((a, b) => (a.processing_time_business_days || 0) - (b.processing_time_business_days || 0));
    }

    return { processing_options: options };
  }

  // 3) Trip Planner

  saveVisaToTripPlanner(visa_product_id, title, note) {
    const tripItems = this._getFromStorage('trip_planner_items');
    const newItem = {
      id: this._generateId('trip'),
      visa_product_id,
      title: title || 'Saved visa option',
      note: note || '',
      created_at: this._nowIso()
    };
    tripItems.push(newItem);
    this._saveToStorage('trip_planner_items', tripItems);
    return { trip_planner_item: newItem };
  }

  getTripPlannerItems() {
    const tripItems = this._getFromStorage('trip_planner_items');
    const visaProducts = this._getFromStorage('visa_products');
    const countries = this._getFromStorage('countries');

    const items = tripItems.map((item) => {
      const vp = visaProducts.find((p) => p.id === item.visa_product_id) || null;
      let destination_country_name = '';
      if (vp) {
        const dest = countries.find((c) => c.id === vp.destination_country_id) || {};
        destination_country_name = dest.name || '';
      }
      return {
        trip_planner_item_id: item.id,
        visa_product_id: item.visa_product_id,
        title: item.title,
        note: item.note || '',
        created_at: item.created_at,
        visa_name: vp ? vp.name : '',
        destination_country_name,
        visa_product: vp // foreign key resolution
      };
    });

    return { items };
  }

  updateTripPlannerItemNote(trip_planner_item_id, note) {
    const tripItems = this._getFromStorage('trip_planner_items');
    const idx = tripItems.findIndex((t) => t.id === trip_planner_item_id);
    if (idx === -1) {
      return { trip_planner_item: null };
    }
    tripItems[idx].note = note;
    this._saveToStorage('trip_planner_items', tripItems);
    return { trip_planner_item: tripItems[idx] };
  }

  removeTripPlannerItem(trip_planner_item_id) {
    const tripItems = this._getFromStorage('trip_planner_items');
    const remaining = tripItems.filter((t) => t.id !== trip_planner_item_id);
    this._saveToStorage('trip_planner_items', remaining);
    return { success: true, remaining_count: remaining.length };
  }

  // 4) Single Visa Application (Wizard)

  getSingleApplicationStartOptions() {
    const destination_countries = this._getFromStorage('countries');
    const citizenship_countries = destination_countries.slice();
    const purposes = this._getFromStorage('visa_purposes');

    return {
      destination_countries,
      citizenship_countries,
      purposes
    };
  }

  getVisaTypeOptionsForRoute(destination_country_id, citizenship_country_id, purpose_code) {
    const visaProducts = this._getFromStorage('visa_products');
    const visaVariants = this._getFromStorage('visa_variants');
    const visaPurposes = this._getFromStorage('visa_purposes');

    const matchingProducts = visaProducts.filter((vp) => {
      if (vp.status !== 'active') return false;
      if (vp.destination_country_id !== destination_country_id) return false;
      if (vp.citizenship_country_id !== citizenship_country_id) return false;
      const purpose = visaPurposes.find((p) => p.id === vp.purpose_id);
      return purpose && purpose.code === purpose_code;
    });

    const visa_type_options = [];

    for (const vp of matchingProducts) {
      const variants = visaVariants.filter((v) => v.visa_product_id === vp.id);
      for (const v of variants) {
        visa_type_options.push({
          visa_product_id: vp.id,
          visa_variant_id: v.id,
          product_name: vp.name,
          variant_name: v.name,
          entry_type: v.entry_type,
          duration_days: v.duration_days,
          service_fee: v.service_fee,
          government_fee: vp.government_fee || 0,
          currency: vp.currency,
          description: v.description || '',
          is_recommended: !!v.is_default
        });
      }
    }

    return { visa_type_options };
  }

  submitSingleVisaApplication(visa_product_id, visa_variant_id, processing_option_id, traveler, planned_entry_date) {
    const visaProducts = this._getFromStorage('visa_products');
    const visaVariants = this._getFromStorage('visa_variants');
    const processingOptions = this._getFromStorage('processing_options');
    const travelers = this._getFromStorage('travelers');
    const visaApplications = this._getFromStorage('visa_applications');

    const vp = visaProducts.find((p) => p.id === visa_product_id) || null;
    const vv = visaVariants.find((v) => v.id === visa_variant_id) || null;
    const po = processingOptions.find((p) => p.id === processing_option_id) || null;

    if (!vp || !vv || !po) {
      return { visa_application: null, traveler: null, next_step: null };
    }

    const travelerRecord = {
      id: this._generateId('traveler'),
      full_name: traveler.full_name,
      date_of_birth: traveler.date_of_birth,
      passport_number: traveler.passport_number,
      nationality_country_id: traveler.nationality_country_id || vp.citizenship_country_id || null,
      traveler_type: 'adult',
      group_application_id: null,
      visa_application_id: null
    };

    const visaApplicationRecord = {
      id: this._generateId('visa_app'),
      visa_product_id,
      visa_variant_id,
      processing_option_id,
      traveler_id: travelerRecord.id,
      planned_entry_date,
      application_status: 'draft',
      created_at: this._nowIso(),
      updated_at: null
    };

    travelerRecord.visa_application_id = visaApplicationRecord.id;

    travelers.push(travelerRecord);
    visaApplications.push(visaApplicationRecord);

    this._saveToStorage('travelers', travelers);
    this._saveToStorage('visa_applications', visaApplications);

    return {
      visa_application: visaApplicationRecord,
      traveler: travelerRecord,
      next_step: 'shipping'
    };
  }

  // 5) Group / Family Applications

  getGroupApplicationStartOptions() {
    const destination_countries = this._getFromStorage('countries');
    const citizenship_countries = destination_countries.slice();
    return { destination_countries, citizenship_countries };
  }

  initGroupApplication(destination_country_id, citizenship_country_id, number_of_travelers) {
    const groupApplications = this._getFromStorage('group_applications');
    const newGroup = {
      id: this._generateId('group_app'),
      destination_country_id,
      citizenship_country_id,
      number_of_travelers,
      traveler_ids: [],
      selected_shipping_method_id: null,
      application_status: 'draft',
      created_at: this._nowIso(),
      updated_at: null
    };
    groupApplications.push(newGroup);
    this._saveToStorage('group_applications', groupApplications);
    return { group_application: newGroup };
  }

  saveGroupTravelers(group_application_id, travelersInput) {
    const groupApplications = this._getFromStorage('group_applications');
    const travelers = this._getFromStorage('travelers');

    const group = groupApplications.find((g) => g.id === group_application_id);
    if (!group) {
      return { travelers: [] };
    }

    const resultTravelers = [];

    for (const t of travelersInput) {
      if (t.traveler_id) {
        const existingIdx = travelers.findIndex((tr) => tr.id === t.traveler_id && tr.group_application_id === group.id);
        if (existingIdx !== -1) {
          travelers[existingIdx] = {
            ...travelers[existingIdx],
            full_name: t.full_name,
            date_of_birth: t.date_of_birth,
            passport_number: t.passport_number,
            traveler_type: t.traveler_type
          };
          resultTravelers.push(travelers[existingIdx]);
          if (!group.traveler_ids.includes(travelers[existingIdx].id)) {
            group.traveler_ids.push(travelers[existingIdx].id);
          }
          continue;
        }
      }

      const newTraveler = {
        id: this._generateId('traveler'),
        full_name: t.full_name,
        date_of_birth: t.date_of_birth,
        passport_number: t.passport_number,
        nationality_country_id: group.citizenship_country_id,
        traveler_type: t.traveler_type,
        group_application_id: group.id,
        visa_application_id: null
      };
      travelers.push(newTraveler);
      group.traveler_ids.push(newTraveler.id);
      resultTravelers.push(newTraveler);
    }

    group.number_of_travelers = group.traveler_ids.length;
    group.updated_at = this._nowIso();

    this._saveToStorage('travelers', travelers);

    const updatedGroups = groupApplications.map((g) => (g.id === group.id ? group : g));
    this._saveToStorage('group_applications', updatedGroups);

    return { travelers: resultTravelers };
  }

  getGroupShippingOptions(group_application_id) {
    const groupApplications = this._getFromStorage('group_applications');
    const shippingMethods = this._getFromStorage('shipping_methods');

    const group = groupApplications.find((g) => g.id === group_application_id);
    if (!group) {
      return { shipping_options: [] };
    }

    const numberOfTravelers = group.number_of_travelers || (group.traveler_ids ? group.traveler_ids.length : 1);

    let cheapestTotal = null;
    const options = shippingMethods.map((sm) => {
      const evalResult = this._evaluateShippingTotals(0, 0, sm, numberOfTravelers);
      if (cheapestTotal == null || evalResult.shipping_total < cheapestTotal) {
        cheapestTotal = evalResult.shipping_total;
      }
      return {
        shipping_method_id: sm.id,
        name: sm.name,
        method_type: sm.method_type,
        description: sm.description || '',
        price: sm.price,
        currency: sm.currency,
        is_per_passport: !!sm.is_per_passport,
        total_price_for_group: evalResult.shipping_total,
        is_recommended_cheapest: false
      };
    });

    const markedOptions = options.map((opt) => ({
      ...opt,
      is_recommended_cheapest: opt.total_price_for_group === cheapestTotal
    }));

    return { shipping_options: markedOptions };
  }

  selectGroupShippingMethod(group_application_id, shipping_method_id) {
    const groupApplications = this._getFromStorage('group_applications');
    const groupIdx = groupApplications.findIndex((g) => g.id === group_application_id);
    if (groupIdx === -1) {
      return { group_application: null, next_step: null };
    }

    const group = groupApplications[groupIdx];
    group.selected_shipping_method_id = shipping_method_id;
    group.application_status = 'in_progress';
    group.updated_at = this._nowIso();

    groupApplications[groupIdx] = group;
    this._saveToStorage('group_applications', groupApplications);

    return { group_application: group, next_step: 'order_summary' };
  }

  // 6) Cart & Add-on Services

  addVisaProductToCart(visa_product_id, visa_variant_id, processing_option_id, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const visaProducts = this._getFromStorage('visa_products');
    const visaVariants = this._getFromStorage('visa_variants');

    const product = visaProducts.find((p) => p.id === visa_product_id);
    const variant = visaVariants.find((v) => v.id === visa_variant_id);

    const basePrice = product ? product.base_service_fee || 0 : 0;
    const unit_price = basePrice;
    const total_price = unit_price * qty;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'visa_product',
      visa_product_id,
      visa_variant_id: visa_variant_id || null,
      add_on_service_id: null,
      quantity: qty,
      unit_price,
      total_price
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids.push(cartItem.id);
    this._recalculateCartTotals(cart);

    // Instrumentation for task completion tracking
    try {
      if (processing_option_id != null) {
        localStorage.setItem(
          'task2_selectedProcessingOption',
          JSON.stringify({ visa_product_id, processing_option_id })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { cart };
  }

  addAddOnServiceToCart(add_on_service_id, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const addOnServices = this._getFromStorage('add_on_services');

    const service = addOnServices.find((s) => s.id === add_on_service_id);
    const unit_price = service ? service.price : 0;
    const total_price = unit_price * qty;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'add_on_service',
      visa_product_id: null,
      visa_variant_id: null,
      add_on_service_id,
      quantity: qty,
      unit_price,
      total_price
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids.push(cartItem.id);
    this._recalculateCartTotals(cart);

    return { cart };
  }

  removeCartItem(cart_item_id) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    cartItems = cartItems.filter((ci) => ci.id !== cart_item_id);
    this._saveToStorage('cart_items', cartItems);

    cart.item_ids = cart.item_ids.filter((id) => id !== cart_item_id);
    this._recalculateCartTotals(cart);

    return { cart };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const idx = cartItems.findIndex((ci) => ci.id === cart_item_id && ci.cart_id === cart.id);
    if (idx === -1) {
      return { cart };
    }

    const item = cartItems[idx];
    item.quantity = qty;
    item.total_price = item.unit_price * qty;
    cartItems[idx] = item;

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return { cart };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const visaProducts = this._getFromStorage('visa_products');
    const visaVariants = this._getFromStorage('visa_variants');
    const addOnServices = this._getFromStorage('add_on_services');
    const promoCodes = this._getFromStorage('promo_codes');

    const itemsRaw = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = itemsRaw.map((item) => ({
      ...item,
      visa_product: item.visa_product_id
        ? visaProducts.find((p) => p.id === item.visa_product_id) || null
        : null,
      visa_variant: item.visa_variant_id
        ? visaVariants.find((v) => v.id === item.visa_variant_id) || null
        : null,
      add_on_service: item.add_on_service_id
        ? addOnServices.find((s) => s.id === item.add_on_service_id) || null
        : null
    }));

    const promo = cart.promo_code_id
      ? promoCodes.find((p) => p.id === cart.promo_code_id) || null
      : null;

    const promo_code = promo
      ? { code: promo.code, description: promo.description || '' }
      : null;

    return {
      cart: {
        id: cart.id,
        items,
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total,
        promo_code
      }
    };
  }

  getAvailableAddOnServices() {
    const add_on_services = this._getFromStorage('add_on_services');
    return { add_on_services };
  }

  applyPromoCodeToCart(promo_code) {
    const code = (promo_code || '').trim();
    const cart = this._getOrCreateCart();
    const promoCodes = this._getFromStorage('promo_codes');

    if (!code) {
      return { success: false, message: 'Promo code is required.', cart };
    }

    const promo = promoCodes.find((p) => p.code.toLowerCase() === code.toLowerCase());
    if (!promo || !promo.is_active) {
      return { success: false, message: 'Invalid or inactive promo code.', cart };
    }

    const now = new Date();
    const validFrom = promo.valid_from ? new Date(promo.valid_from) : null;
    const validTo = promo.valid_to ? new Date(promo.valid_to) : null;
    if ((validFrom && now < validFrom) || (validTo && now > validTo)) {
      return { success: false, message: 'Promo code is not currently valid.', cart };
    }

    // Temporarily apply to recalc totals and validate min_subtotal
    cart.promo_code_id = promo.id;
    this._recalculateCartTotals(cart);

    if (promo.min_subtotal && cart.subtotal < promo.min_subtotal) {
      cart.promo_code_id = null;
      this._recalculateCartTotals(cart);
      return { success: false, message: 'Order does not meet minimum subtotal for this promo.', cart };
    }

    return { success: true, message: 'Promo code applied.', cart };
  }

  proceedToCheckoutAsGuest() {
    const cart = this._getOrCreateCart();
    if (!cart.item_ids || cart.item_ids.length === 0) {
      return { success: false, next_step: null };
    }

    const { state } = this._getCurrentCheckoutState();
    this._saveCheckoutState(state);

    return { success: true, next_step: 'checkout' };
  }

  // 7) Checkout

  getCheckoutSummary() {
    const { cart, state } = this._getCurrentCheckoutState();
    const cartItems = this._getFromStorage('cart_items');
    const visaProducts = this._getFromStorage('visa_products');
    const visaVariants = this._getFromStorage('visa_variants');
    const addOnServices = this._getFromStorage('add_on_services');
    const promoCodes = this._getFromStorage('promo_codes');
    const shippingMethods = this._getFromStorage('shipping_methods');

    const itemsRaw = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = itemsRaw.map((item) => ({
      ...item,
      visa_product: item.visa_product_id
        ? visaProducts.find((p) => p.id === item.visa_product_id) || null
        : null,
      visa_variant: item.visa_variant_id
        ? visaVariants.find((v) => v.id === item.visa_variant_id) || null
        : null,
      add_on_service: item.add_on_service_id
        ? addOnServices.find((s) => s.id === item.add_on_service_id) || null
        : null
    }));

    const promo = cart.promo_code_id
      ? promoCodes.find((p) => p.id === cart.promo_code_id) || null
      : null;

    const shippingMethod = state.shipping_method_id
      ? shippingMethods.find((sm) => sm.id === state.shipping_method_id) || null
      : null;

    const shipping_total = state.shipping_total || 0;
    const total = cart.total + shipping_total;

    const order_preview = {
      items,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      shipping_total,
      total,
      shipping_method: shippingMethod
        ? {
            shipping_method_id: shippingMethod.id,
            name: shippingMethod.name,
            price: shippingMethod.price,
            currency: shippingMethod.currency
          }
        : null,
      promo_code: promo
        ? { code: promo.code, description: promo.description || '' }
        : null,
      contact_info: state.contact_info || {}
    };

    return { order_preview };
  }

  updateCheckoutContactInfo(contact) {
    const { state } = this._getCurrentCheckoutState();
    state.contact_info = {
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      phone: contact.phone
    };
    this._saveCheckoutState(state);
    return { order_preview: { contact_info: state.contact_info } };
  }

  updateCheckoutShippingAddress(address) {
    const { state } = this._getCurrentCheckoutState();
    state.shipping_address = {
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country
    };
    this._saveCheckoutState(state);
    return { order_preview: { shipping_address: state.shipping_address } };
  }

  setCheckoutShippingMethod(shipping_method_id) {
    const { cart, state } = this._getCurrentCheckoutState();
    const shippingMethods = this._getFromStorage('shipping_methods');
    const shippingMethod = shippingMethods.find((sm) => sm.id === shipping_method_id);

    if (!shippingMethod) {
      return { order_preview: null };
    }

    const evalResult = this._evaluateShippingTotals(cart.subtotal, cart.discount_total, shippingMethod, 1);

    state.shipping_method_id = shipping_method_id;
    state.shipping_total = evalResult.shipping_total;
    this._saveCheckoutState(state);

    const order_preview = {
      shipping_method: {
        shipping_method_id: shippingMethod.id,
        name: shippingMethod.name,
        price: shippingMethod.price,
        currency: shippingMethod.currency
      },
      shipping_total: evalResult.shipping_total,
      total: evalResult.resulting_order_total
    };

    return { order_preview };
  }

  placeOrder(payment) {
    const { cart, state } = this._getCurrentCheckoutState();
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');
    const shippingMethods = this._getFromStorage('shipping_methods');

    const itemsRaw = cartItems.filter((ci) => ci.cart_id === cart.id);
    const shippingMethod = state.shipping_method_id
      ? shippingMethods.find((sm) => sm.id === state.shipping_method_id) || null
      : null;

    const shipping_total = state.shipping_total || (shippingMethod ? shippingMethod.price : 0) || 0;
    const subtotal = cart.subtotal;
    const discount_total = cart.discount_total;
    const total = subtotal - discount_total + shipping_total;

    const orderId = this._generateId('ORD');

    const contactInfo = state.contact_info || {};

    const order = {
      id: orderId,
      status: 'pending',
      created_at: this._nowIso(),
      updated_at: null,
      contact_first_name: contactInfo.first_name || '',
      contact_last_name: contactInfo.last_name || '',
      contact_email: contactInfo.email || '',
      subtotal,
      discount_total,
      shipping_total,
      total,
      shipping_method_id: shippingMethod ? shippingMethod.id : null,
      cart_id: cart.id,
      visa_application_id: null,
      group_application_id: null
    };

    // Create order items from cart items
    for (const ci of itemsRaw) {
      const oi = {
        id: this._generateId('order_item'),
        order_id: order.id,
        item_type: ci.item_type === 'add_on_service' ? 'add_on_service' : 'visa_product',
        visa_product_id: ci.visa_product_id || null,
        visa_variant_id: ci.visa_variant_id || null,
        description: '',
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price
      };
      orderItems.push(oi);
    }

    // Shipping fee as order item
    if (shipping_total > 0) {
      const shippingItem = {
        id: this._generateId('order_item'),
        order_id: order.id,
        item_type: 'shipping_fee',
        visa_product_id: null,
        visa_variant_id: null,
        description: shippingMethod ? shippingMethod.name : 'Shipping',
        quantity: 1,
        unit_price: shipping_total,
        total_price: shipping_total
      };
      orderItems.push(shippingItem);
    }

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart & checkout state after placing order
    const remainingItems = cartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remainingItems);

    const remainingCarts = carts.filter((c) => c.id !== cart.id);
    this._saveToStorage('carts', remainingCarts);
    localStorage.removeItem('current_cart_id');

    this._saveCheckoutState(null);

    return { order };
  }

  // 8) Appointments

  getAppointmentFormOptions() {
    const locations = this._getFromStorage('appointment_locations');
    const categories = this._getFromStorage('appointment_categories');
    return { locations, categories };
  }

  getAppointmentCalendar(location_id, category_id, month, year) {
    const slots = this._getFromStorage('appointment_slots');

    const filtered = slots.filter((s) => {
      if (s.location_id !== location_id) return false;
      if (s.category_id !== category_id) return false;
      if (!s.start_datetime) return false;
      const d = new Date(s.start_datetime);
      return d.getUTCFullYear() === year && d.getUTCMonth() + 1 === month;
    });

    const dayMap = {};
    for (const s of filtered) {
      const d = new Date(s.start_datetime);
      const dayStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!dayMap[dayStr]) {
        dayMap[dayStr] = {
          date: dayStr,
          has_morning_slots: false,
          has_afternoon_slots: false,
          has_any_slots: false,
          has_available: false
        };
      }
      const dayInfo = dayMap[dayStr];
      dayInfo.has_any_slots = true;
      if (s.is_morning) {
        dayInfo.has_morning_slots = true;
      } else {
        dayInfo.has_afternoon_slots = true;
      }
      if (s.is_available) {
        dayInfo.has_available = true;
      }
    }

    const days = Object.values(dayMap).map((d) => ({
      date: d.date,
      has_morning_slots: d.has_morning_slots,
      has_afternoon_slots: d.has_afternoon_slots,
      is_fully_booked: d.has_any_slots && !d.has_available
    }));

    return { days };
  }

  getAppointmentSlotsForDate(location_id, category_id, date) {
    const slots = this._getFromStorage('appointment_slots');
    const locations = this._getFromStorage('appointment_locations');
    const categories = this._getFromStorage('appointment_categories');

    const slotsForDate = slots.filter((s) => {
      if (s.location_id !== location_id) return false;
      if (s.category_id !== category_id) return false;
      const d = new Date(s.start_datetime);
      const dayStr = d.toISOString().slice(0, 10);
      return dayStr === date;
    });

    const resolvedSlots = slotsForDate.map((s) => ({
      ...s,
      location: locations.find((l) => l.id === s.location_id) || null,
      category: categories.find((c) => c.id === s.category_id) || null
    }));

    return { slots: resolvedSlots };
  }

  bookAppointmentSlot(slot_id, contact_name, contact_email) {
    const slots = this._getFromStorage('appointment_slots');
    const bookings = this._getFromStorage('appointment_bookings');

    const slotIdx = slots.findIndex((s) => s.id === slot_id);
    if (slotIdx === -1) {
      return { booking: null };
    }

    const slot = slots[slotIdx];
    if (!slot.is_available) {
      // Still allow booking object but mark based on slot
      return { booking: null };
    }

    const booking = {
      id: this._generateId('booking'),
      slot_id: slot.id,
      status: 'booked',
      contact_name: contact_name || '',
      contact_email: contact_email || '',
      created_at: this._nowIso()
    };

    bookings.push(booking);

    // Mark slot as no longer available
    slot.is_available = false;
    slots[slotIdx] = slot;

    this._saveToStorage('appointment_bookings', bookings);
    this._saveToStorage('appointment_slots', slots);

    return { booking };
  }

  // 9) Help Center & Articles

  getHelpCenterOverview() {
    const helpArticles = this._getFromStorage('help_articles');

    const categoryMap = {};
    for (const a of helpArticles) {
      const cat = a.category || 'General';
      if (!categoryMap[cat]) categoryMap[cat] = 0;
      categoryMap[cat] += 1;
    }

    const categories = Object.keys(categoryMap).map((cat) => ({
      category: cat,
      article_count: categoryMap[cat]
    }));

    // Simple heuristic: first few articles as featured
    const featured_articles = helpArticles.slice(0, 5);

    return { categories, featured_articles };
  }

  searchHelpArticles(query) {
    const q = (query || '').trim().toLowerCase();
    const helpArticles = this._getFromStorage('help_articles');

    const results = helpArticles.filter((a) => {
      if (!q) return true;
      const title = (a.title || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      const preview = (a.preview_text || '').toLowerCase();
      return title.includes(q) || content.includes(q) || preview.includes(q);
    });

    return { results, total_results: results.length };
  }

  getHelpArticleDetails(article_id) {
    const helpArticles = this._getFromStorage('help_articles');
    const bookmarks = this._getFromStorage('help_article_bookmarks');

    const article = helpArticles.find((a) => a.id === article_id) || null;
    const is_bookmarked = !!bookmarks.find((b) => b.article_id === article_id);

    return { article, is_bookmarked };
  }

  bookmarkHelpArticle(article_id) {
    const bookmarks = this._getFromStorage('help_article_bookmarks');
    const existing = bookmarks.find((b) => b.article_id === article_id);
    if (existing) {
      return { bookmark: existing };
    }

    const bookmark = {
      id: this._generateId('bookmark'),
      article_id,
      created_at: this._nowIso()
    };
    bookmarks.push(bookmark);
    this._saveToStorage('help_article_bookmarks', bookmarks);
    return { bookmark };
  }

  removeHelpArticleBookmark(bookmark_id) {
    const bookmarks = this._getFromStorage('help_article_bookmarks');
    const remaining = bookmarks.filter((b) => b.id !== bookmark_id);
    this._saveToStorage('help_article_bookmarks', remaining);
    return { success: true };
  }

  getBookmarkedHelpArticles() {
    const bookmarks = this._getFromStorage('help_article_bookmarks');
    const helpArticles = this._getFromStorage('help_articles');

    const mapped = bookmarks.map((b) => {
      const article = helpArticles.find((a) => a.id === b.article_id) || null;
      return {
        bookmark_id: b.id,
        article_id: b.article_id,
        title: article ? article.title : '',
        created_at: b.created_at,
        article
      };
    });

    return { bookmarks: mapped };
  }

  // 10) Orders: lookup, messages, shipping changes

  lookupOrder(order_id, email_or_last_name) {
    const orders = this._getFromStorage('orders');
    const search = (email_or_last_name || '').trim().toLowerCase();

    const order = orders.find((o) => {
      if (o.id !== order_id) return false;
      const lastName = (o.contact_last_name || '').toLowerCase();
      const email = (o.contact_email || '').toLowerCase();
      return lastName === search || email === search;
    });

    if (!order) {
      return { success: false, order_summary: null, error_message: 'Order not found.' };
    }

    const order_summary = {
      order_id: order.id,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      contact_last_name: order.contact_last_name,
      subtotal: order.subtotal,
      discount_total: order.discount_total,
      shipping_total: order.shipping_total,
      total: order.total
    };

    return { success: true, order_summary, error_message: null };
  }

  getOrderDetails(order_id) {
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');
    const shippingMethods = this._getFromStorage('shipping_methods');
    const visaProducts = this._getFromStorage('visa_products');
    const visaVariants = this._getFromStorage('visa_variants');
    const addOnServices = this._getFromStorage('add_on_services');

    const orderRecord = orders.find((o) => o.id === order_id) || null;
    if (!orderRecord) {
      return { order: null };
    }

    const shipping_method = orderRecord.shipping_method_id
      ? shippingMethods.find((sm) => sm.id === orderRecord.shipping_method_id) || null
      : null;

    const itemsRaw = orderItems.filter((oi) => oi.order_id === orderRecord.id);
    const items = itemsRaw.map((oi) => ({
      ...oi,
      visa_product: oi.visa_product_id
        ? visaProducts.find((p) => p.id === oi.visa_product_id) || null
        : null,
      visa_variant: oi.visa_variant_id
        ? visaVariants.find((v) => v.id === oi.visa_variant_id) || null
        : null,
      add_on_service:
        oi.item_type === 'add_on_service' && oi.visa_product_id
          ? addOnServices.find((s) => s.id === oi.visa_product_id) || null
          : null
    }));

    const order = {
      order_id: orderRecord.id,
      status: orderRecord.status,
      created_at: orderRecord.created_at,
      updated_at: orderRecord.updated_at,
      contact_first_name: orderRecord.contact_first_name,
      contact_last_name: orderRecord.contact_last_name,
      contact_email: orderRecord.contact_email,
      subtotal: orderRecord.subtotal,
      discount_total: orderRecord.discount_total,
      shipping_total: orderRecord.shipping_total,
      total: orderRecord.total,
      shipping_method,
      items,
      visa_application_id: orderRecord.visa_application_id || null,
      group_application_id: orderRecord.group_application_id || null
    };

    return { order };
  }

  getOrderMessages(order_id) {
    const orderMessages = this._getFromStorage('order_messages');
    const orders = this._getFromStorage('orders');

    const messagesRaw = orderMessages.filter((m) => m.order_id === order_id);
    const order = orders.find((o) => o.id === order_id) || null;

    const messages = messagesRaw.map((m) => ({
      ...m,
      order
    }));

    return { messages };
  }

  sendOrderMessage(order_id, message_text) {
    const orderMessages = this._getFromStorage('order_messages');

    const message = {
      id: this._generateId('ordermsg'),
      order_id,
      message_text,
      direction: 'from_customer',
      created_at: this._nowIso()
    };

    orderMessages.push(message);
    this._saveToStorage('order_messages', orderMessages);

    return { message };
  }

  getOrderShippingOptions(order_id) {
    const orders = this._getFromStorage('orders');
    const shippingMethods = this._getFromStorage('shipping_methods');

    const order = orders.find((o) => o.id === order_id) || null;
    if (!order) {
      return { shipping_options: [] };
    }

    const options = shippingMethods.map((sm) => {
      const evalResult = this._evaluateShippingTotals(order.subtotal, order.discount_total, sm, 1);
      return {
        shipping_method_id: sm.id,
        name: sm.name,
        method_type: sm.method_type,
        price: sm.price,
        currency: sm.currency,
        is_per_passport: !!sm.is_per_passport,
        description: sm.description || '',
        resulting_order_total: evalResult.resulting_order_total,
        shipping_method: sm
      };
    });

    return { shipping_options: options };
  }

  updateOrderShippingMethod(order_id, shipping_method_id) {
    const orders = this._getFromStorage('orders');
    const shippingMethods = this._getFromStorage('shipping_methods');

    const orderIdx = orders.findIndex((o) => o.id === order_id);
    if (orderIdx === -1) {
      return { order: null };
    }

    const order = orders[orderIdx];
    const shippingMethod = shippingMethods.find((sm) => sm.id === shipping_method_id);
    if (!shippingMethod) {
      return { order: null };
    }

    const evalResult = this._evaluateShippingTotals(order.subtotal, order.discount_total, shippingMethod, 1);

    order.shipping_method_id = shippingMethod.id;
    order.shipping_total = evalResult.shipping_total;
    order.total = evalResult.resulting_order_total;
    order.updated_at = this._nowIso();

    orders[orderIdx] = order;
    this._saveToStorage('orders', orders);

    return { order };
  }

  confirmOrderChanges(order_id) {
    const orders = this._getFromStorage('orders');
    const order = orders.find((o) => o.id === order_id) || null;
    if (!order) {
      return { success: false, order_status: null };
    }
    // No additional state to change for confirmation in this business-logic-only layer
    return { success: true, order_status: order.status };
  }

  // 11) Static-like Content (About, Contact, Terms, Privacy)

  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (stored) {
      return stored;
    }
    // Fallback minimal structure if nothing in storage
    return {
      headline: '',
      body: '',
      highlights: [],
      testimonials: []
    };
  }

  getContactPageContent() {
    const stored = this._getFromStorage('contact_page_content', null);
    if (stored) {
      return stored;
    }
    return {
      email_addresses: [],
      phone_numbers: [],
      office_locations: [],
      business_hours: '',
      response_time_note: ''
    };
  }

  submitContactForm(name, email, subject, message) {
    // Pure business logic: simulate ticket creation, persist minimal metadata if desired
    const tickets = this._getFromStorage('contact_tickets');
    const ticket = {
      id: this._generateId('ticket'),
      name,
      email,
      subject,
      message,
      created_at: this._nowIso()
    };
    tickets.push(ticket);
    this._saveToStorage('contact_tickets', tickets);
    return {
      success: true,
      ticket_id: ticket.id,
      message: 'Your message has been received.'
    };
  }

  getTermsAndConditions() {
    const stored = this._getFromStorage('terms_and_conditions', null);
    if (stored) {
      return stored;
    }
    return {
      last_updated: '',
      sections: []
    };
  }

  getPrivacyPolicy() {
    const stored = this._getFromStorage('privacy_policy', null);
    if (stored) {
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