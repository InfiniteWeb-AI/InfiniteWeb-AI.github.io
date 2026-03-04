// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not existing
    const tables = [
      'yard_locations',
      'material_categories',
      'materials',
      'yard_material_prices',
      'material_service_rates',
      'contact_submissions',
      'residential_pickup_requests',
      'residential_pickup_items',
      'service_areas',
      'time_slots',
      'dumpster_options',
      'dumpster_rental_bookings',
      'plan_visits',
      'plan_visit_items',
      'business_plans',
      'business_plan_signups',
      'blog_posts',
      'promotions',
      'quote_requests',
      'estimate_requests',
      'estimate_request_items',
      'dropoff_appointments'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentRaw = localStorage.getItem('idCounter');
    const current = parseInt(currentRaw || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    const next = this._getNextIdCounter();
    return prefix + '_' + next;
  }

  _toDateOnlyString(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }

  // ----------------------
  // Internal helper functions (from spec)
  // ----------------------

  // Resolve ServiceArea by ZIP
  _findServiceAreaByZip(zip) {
    if (!zip) return null;
    const serviceAreas = this._getFromStorage('service_areas', []);
    for (let i = 0; i < serviceAreas.length; i++) {
      const area = serviceAreas[i];
      if (Array.isArray(area.zip_codes) && area.zip_codes.indexOf(zip) !== -1) {
        return area;
      }
    }
    return null;
  }

  // Compute estimated payout using material_service_rates
  // If serviceType is provided, prefer that; otherwise choose highest price_per_lb
  _calculatePayoutForMaterial(materialId, weightLbs, serviceType) {
    const rates = this._getFromStorage('material_service_rates', []).filter(function (r) {
      return r.material_id === materialId;
    });

    if (!rates.length || !weightLbs || weightLbs <= 0) {
      return {
        pricePerLb: 0,
        estimatedPayout: 0,
        serviceType: serviceType || null
      };
    }

    let selected = null;
    if (serviceType) {
      selected = rates.find(function (r) { return r.service_type === serviceType; }) || rates[0];
    } else {
      selected = rates[0];
      for (let i = 1; i < rates.length; i++) {
        if (rates[i].price_per_lb > selected.price_per_lb) {
          selected = rates[i];
        }
      }
    }

    const payout = selected.price_per_lb * weightLbs;
    return {
      pricePerLb: selected.price_per_lb,
      estimatedPayout: payout,
      serviceType: selected.service_type
    };
  }

  // Validate promo code against active promotions and return matching promotion id or null
  _validateAndLookupPromoCode(promoCode, appliesTo, yardLocationId) {
    if (!promoCode) return null;
    const code = String(promoCode).trim();
    if (!code) return null;

    const promotions = this._getFromStorage('promotions', []);
    const now = new Date();

    for (let i = 0; i < promotions.length; i++) {
      const p = promotions[i];
      if (!p.is_active) continue;
      if (String(p.promo_code).trim().toLowerCase() !== code.toLowerCase()) continue;

      // applies_to match or all_services
      if (appliesTo && p.applies_to !== 'all_services' && p.applies_to !== appliesTo) {
        continue;
      }

      // date range check
      if (p.start_date) {
        const start = new Date(p.start_date);
        if (!Number.isNaN(start.getTime()) && now < start) continue;
      }
      if (p.end_date) {
        const end = new Date(p.end_date);
        if (!Number.isNaN(end.getTime()) && now > end) continue;
      }

      // yard filter
      if (yardLocationId && Array.isArray(p.applicable_location_ids) && p.applicable_location_ids.length) {
        if (p.applicable_location_ids.indexOf(yardLocationId) === -1) {
          continue;
        }
      }

      return p.id;
    }

    return null;
  }

  // Fetch main yard (is_main_yard = true)
  _getMainYard() {
    const yards = this._getFromStorage('yard_locations', []);
    for (let i = 0; i < yards.length; i++) {
      if (yards[i].is_main_yard) {
        return yards[i];
      }
    }
    return null;
  }

  // ----------------------
  // 1) getHomePageData
  // ----------------------

  getHomePageData() {
    const featuredPromotions = this.getActivePromotions(undefined, false) || [];

    const serviceCards = [
      {
        service_key: 'drop_off',
        title: 'Drop-off Scrap Metal',
        description: 'Bring your scrap metal to any of our yards for fast, on-the-spot payouts.',
        primary_cta_label: 'Find a yard'
      },
      {
        service_key: 'residential_pickup',
        title: 'Residential Pickup',
        description: 'Schedule curbside pickup for appliances and household metal items.',
        primary_cta_label: 'Schedule pickup'
      },
      {
        service_key: 'dumpster_rental',
        title: 'Dumpster & Container Rental',
        description: 'Rent roll-off containers for construction, clean-outs, and bulk metal.',
        primary_cta_label: 'View dumpster options'
      },
      {
        service_key: 'business_programs',
        title: 'Business Recycling Programs',
        description: 'Custom recycling programs for manufacturers and commercial accounts.',
        primary_cta_label: 'Explore business plans'
      }
    ];

    const shortcuts = [
      { key: 'locations', label: 'Locations & yards' },
      { key: 'pricing', label: 'Pricing & payouts' },
      { key: 'residential_pickup', label: 'Residential pickup' },
      { key: 'book_dropoff', label: 'Book a drop-off visit' },
      { key: 'promotions', label: 'Promotions & deals' }
    ];

    return {
      hero_title: 'Scrap Metal Recycling, Made Simple',
      hero_subtitle: 'Drop off, schedule pickup, or set up a recycling program with transparent pricing.',
      service_cards: serviceCards,
      featured_promotions: featuredPromotions,
      shortcuts: shortcuts
    };
  }

  // ----------------------
  // 2) getServiceOverviewContent
  // ----------------------

  getServiceOverviewContent() {
    const services = [
      {
        service_key: 'residential_pickup',
        title: 'Residential Pickup',
        short_description: 'We pick up appliances and household metal items right from your driveway.',
        ideal_for: 'Homes, small clean-outs, single-item pickups like refrigerators.',
        primary_cta_label: 'Check availability'
      },
      {
        service_key: 'dumpster_rental',
        title: 'Dumpster & Container Rental',
        short_description: 'Roll-off containers for construction, demos, and large projects.',
        ideal_for: 'Contractors, remodels, and bulk scrap projects.',
        primary_cta_label: 'Get container pricing'
      },
      {
        service_key: 'business_programs',
        title: 'Business Recycling Programs',
        short_description: 'Ongoing recycling services for manufacturers and commercial generators.',
        ideal_for: 'Manufacturing, fabrication, and other metal-intensive businesses.',
        primary_cta_label: 'Compare business plans'
      },
      {
        service_key: 'drop_off',
        title: 'Drop-off Yards',
        short_description: 'Bring your metal to the yard and get paid on the spot.',
        ideal_for: 'DIYers, small hauls, and anyone hauling scrap directly.',
        primary_cta_label: 'Find nearest yard'
      }
    ];

    return { services: services };
  }

  // ----------------------
  // 3) getLocationMaterialFilterOptions
  // ----------------------

  getLocationMaterialFilterOptions() {
    const materials = this._getFromStorage('materials', []);
    const materialOptions = materials.map(function (m) {
      return {
        material_id: m.id,
        material_name: m.name,
        category_slug: m.category_slug
      };
    });

    const sortOptions = [
      { value: 'price_per_lb_high_to_low', label: 'Price per lb - High to Low' },
      { value: 'price_per_lb_low_to_high', label: 'Price per lb - Low to High' },
      { value: 'name_asc', label: 'Location name A–Z' }
    ];

    return {
      materials: materialOptions,
      default_sort: 'price_per_lb_high_to_low',
      sort_options: sortOptions
    };
  }

  // ----------------------
  // 4) searchYardLocationsWithPricing
  // ----------------------

  searchYardLocationsWithPricing(materialId, sortBy, onlyActive) {
    if (typeof onlyActive === 'undefined') {
      onlyActive = true;
    }

    const yardsAll = this._getFromStorage('yard_locations', []);
    const pricesAll = this._getFromStorage('yard_material_prices', []);
    const materials = this._getFromStorage('materials', []);

    const yardsFiltered = yardsAll.filter(function (y) {
      return onlyActive ? y.active : true;
    });

    const results = [];

    for (let i = 0; i < yardsFiltered.length; i++) {
      const yard = yardsFiltered[i];
      let yardPrices = pricesAll.filter(function (p) {
        if (onlyActive && !p.is_active) return false;
        return p.yard_location_id === yard.id;
      });

      if (materialId) {
        yardPrices = yardPrices.filter(function (p) {
          return p.material_id === materialId;
        });
      }

      if (!yardPrices.length) continue;

      const materialPricing = yardPrices.map(function (p) {
        const mat = materials.find(function (m) { return m.id === p.material_id; }) || null;
        return {
          material_id: p.material_id,
          material_name: p.material_name,
          price_per_lb: p.price_per_lb,
          last_updated: p.last_updated || null,
          material: mat
        };
      });

      const yardEntry = {
        yard_location_id: yard.id,
        yard_name: yard.name,
        is_main_yard: !!yard.is_main_yard,
        address_line1: yard.address_line1,
        address_line2: yard.address_line2 || '',
        city: yard.city,
        state: yard.state,
        zip: yard.zip,
        phone: yard.phone || '',
        email: yard.email || '',
        latitude: yard.latitude,
        longitude: yard.longitude,
        hours_weekday: yard.hours_weekday || '',
        hours_saturday: yard.hours_saturday || '',
        hours_sunday: yard.hours_sunday || '',
        weekend_open: !!yard.weekend_open,
        description: yard.description || '',
        material_pricing: materialPricing,
        yard_location: yard
      };

      results.push(yardEntry);
    }

    const getPrimaryPrice = function (yardObj) {
      if (!yardObj.material_pricing || !yardObj.material_pricing.length) return 0;
      return yardObj.material_pricing[0].price_per_lb || 0;
    };

    if (sortBy === 'price_per_lb_high_to_low') {
      results.sort(function (a, b) {
        return getPrimaryPrice(b) - getPrimaryPrice(a);
      });
    } else if (sortBy === 'price_per_lb_low_to_high') {
      results.sort(function (a, b) {
        return getPrimaryPrice(a) - getPrimaryPrice(b);
      });
    } else if (sortBy === 'name_asc') {
      results.sort(function (a, b) {
        return String(a.yard_name).localeCompare(String(b.yard_name));
      });
    }

    return {
      total_results: results.length,
      yards: results
    };
  }

  // ----------------------
  // 5) getContactPageConfig
  // ----------------------

  getContactPageConfig() {
    const subjectOptions = [
      { value: 'location_hours', label: 'Location hours' },
      { value: 'hazardous_materials_question', label: 'Hazardous materials question' },
      { value: 'business_services', label: 'Business services' },
      { value: 'residential_pickup', label: 'Residential pickup' },
      { value: 'dumpster_rental', label: 'Dumpster rental' },
      { value: 'general_question', label: 'General question' },
      { value: 'other', label: 'Other' }
    ];

    const mainYard = this._getMainYard();
    let mainYardAddress = null;

    if (mainYard) {
      mainYardAddress = {
        yard_location_id: mainYard.id,
        yard_name: mainYard.name,
        address_line1: mainYard.address_line1,
        address_line2: mainYard.address_line2 || '',
        city: mainYard.city,
        state: mainYard.state,
        zip: mainYard.zip,
        hours_weekday: mainYard.hours_weekday || '',
        hours_saturday: mainYard.hours_saturday || '',
        hours_sunday: mainYard.hours_sunday || ''
      };
    }

    return {
      subject_options: subjectOptions,
      main_phone: mainYard && mainYard.phone ? mainYard.phone : '',
      main_email: mainYard && mainYard.email ? mainYard.email : '',
      main_yard_address: mainYardAddress
    };
  }

  // ----------------------
  // 6) submitContactForm
  // ----------------------

  submitContactForm(name, email, subjectType, subjectText, message, relatedYardName, relatedMaterialName) {
    const allowedSubjectTypes = [
      'location_hours',
      'hazardous_materials_question',
      'business_services',
      'residential_pickup',
      'dumpster_rental',
      'general_question',
      'other'
    ];

    const st = allowedSubjectTypes.indexOf(subjectType) !== -1 ? subjectType : 'other';

    const submissions = this._getFromStorage('contact_submissions', []);
    const id = this._generateId('contact');

    const record = {
      id: id,
      name: name,
      email: email,
      subject_type: st,
      subject_text: subjectText || '',
      message: message,
      related_yard_name: relatedYardName || '',
      related_material_name: relatedMaterialName || '',
      created_at: new Date().toISOString(),
      status: 'received'
    };

    submissions.push(record);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      submission: {
        id: id,
        status: record.status
      },
      message: 'Contact form submitted.'
    };
  }

  // ----------------------
  // 7) getResidentialPickupItemOptions
  // ----------------------

  getResidentialPickupItemOptions() {
    const materials = this._getFromStorage('materials', []);
    const categories = this._getFromStorage('material_categories', []);

    const categoryMap = {};
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      categoryMap[c.slug] = {
        category_slug: c.slug,
        category_name: c.name,
        materials: []
      };
    }

    for (let j = 0; j < materials.length; j++) {
      const m = materials[j];
      const slug = m.category_slug;
      if (!categoryMap[slug]) {
        categoryMap[slug] = {
          category_slug: slug,
          category_name: slug,
          materials: []
        };
      }
      categoryMap[slug].materials.push({
        material_id: m.id,
        material_name: m.name
      });
    }

    // Ensure common appliance items exist for residential pickup flows, even if not present in the main materials table
    if (categoryMap['appliances']) {
      const appliancesMaterials = categoryMap['appliances'].materials || [];
      const hasRefrigerator = appliancesMaterials.some(function (m) {
        return /refrigerator/i.test(m.material_name || '');
      });
      if (!hasRefrigerator) {
        appliancesMaterials.push({
          material_id: 'appliance_refrigerator',
          material_name: 'Refrigerator'
        });
        categoryMap['appliances'].materials = appliancesMaterials;
      }
    }

    return {
      categories: Object.values(categoryMap)
    };
  }

  // ----------------------
  // 8) getResidentialPickupAvailability
  // ----------------------

  getResidentialPickupAvailability(serviceZip, daysAhead) {
    if (typeof daysAhead !== 'number' || daysAhead <= 0) {
      daysAhead = 14;
    }

    const serviceArea = this._findServiceAreaByZip(serviceZip);
    const allSlots = this._getFromStorage('time_slots', []);

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const matchingSlots = allSlots.filter(function (ts) {
      if (ts.service_type !== 'residential_pickup') return false;
      if (ts.service_zip && ts.service_zip !== serviceZip) return false;
      if (!ts.service_zip && serviceArea && ts.service_area_id && ts.service_area_id !== serviceArea.id) return false;
      if (!ts.service_zip && !ts.service_area_id) return false;

      const rawDate = ts.date || ts.start_time;
      if (!rawDate) return false;
      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return false;
      if (d < today || d > endDate) return false;
      return true;
    });

    const grouped = {};
    for (let i = 0; i < matchingSlots.length; i++) {
      const ts = matchingSlots[i];
      const dateStr = this._toDateOnlyString(ts.date || ts.start_time);
      if (!dateStr) continue;
      if (!grouped[dateStr]) {
        grouped[dateStr] = [];
      }
      grouped[dateStr].push(ts);
    }

    const dayKeys = Object.keys(grouped).sort();
    const days = dayKeys.map(function (dateStr) {
      const slotsForDay = grouped[dateStr].map(function (ts) {
        return {
          time_slot_id: ts.id,
          start_time: ts.start_time,
          end_time: ts.end_time,
          is_morning: !!ts.is_morning,
          is_available: !!ts.is_available,
          time_slot: ts
        };
      });
      return {
        date: dateStr,
        time_slots: slotsForDay
      };
    });

    const areaInfo = serviceArea
      ? {
          service_area_id: serviceArea.id,
          name: serviceArea.name,
          city: serviceArea.city || '',
          state: serviceArea.state || '',
          timezone: serviceArea.timezone || ''
        }
      : null;

    return {
      service_zip: serviceZip,
      is_covered: !!serviceArea,
      service_area: areaInfo,
      days: days
    };
  }

  // ----------------------
  // 9) submitResidentialPickupRequest
  // ----------------------

  submitResidentialPickupRequest(
    serviceZip,
    serviceAddressLine1,
    serviceAddressLine2,
    city,
    state,
    scheduledDate,
    timeSlotId,
    items,
    fullName,
    phone,
    email,
    specialInstructions
  ) {
    const timeSlots = this._getFromStorage('time_slots', []);
    const ts = timeSlots.find(function (t) { return t.id === timeSlotId; });

    if (!ts || ts.service_type !== 'residential_pickup') {
      return {
        success: false,
        pickup_request_id: null,
        status: 'pending',
        message: 'Invalid or unavailable time slot.'
      };
    }

    const requestId = this._generateId('res_pickup');
    const requests = this._getFromStorage('residential_pickup_requests', []);

    const scheduledDateStr = this._toDateOnlyString(scheduledDate || ts.start_time) || this._toDateOnlyString(ts.start_time);
    const scheduledDateIso = scheduledDateStr ? scheduledDateStr + 'T00:00:00.000Z' : new Date().toISOString();

    let totalItems = 0;
    if (Array.isArray(items)) {
      for (let i = 0; i < items.length; i++) {
        totalItems += items[i].quantity || 0;
      }
    }

    const requestRecord = {
      id: requestId,
      service_zip: serviceZip,
      service_address_line1: serviceAddressLine1,
      service_address_line2: serviceAddressLine2 || '',
      city: city,
      state: state,
      scheduled_date: scheduledDateIso,
      time_window_start: ts.start_time,
      time_window_end: ts.end_time,
      full_name: fullName,
      phone: phone,
      email: email,
      total_items: totalItems,
      special_instructions: specialInstructions || '',
      status: 'pending',
      created_at: new Date().toISOString()
    };

    requests.push(requestRecord);
    this._saveToStorage('residential_pickup_requests', requests);

    // Save items
    const itemsStorage = this._getFromStorage('residential_pickup_items', []);
    for (let i = 0; i < (items || []).length; i++) {
      const item = items[i];
      const itemId = this._generateId('res_pickup_item');
      const record = {
        id: itemId,
        pickup_request_id: requestId,
        material_id: item.materialId,
        material_name: item.materialName,
        category_slug: item.categorySlug,
        quantity: item.quantity,
        estimated_weight_lbs: item.estimatedWeightLbs || null
      };
      itemsStorage.push(record);
    }
    this._saveToStorage('residential_pickup_items', itemsStorage);

    // Mark time slot as no longer available
    ts.is_available = false;
    this._saveToStorage('time_slots', timeSlots);

    return {
      success: true,
      pickup_request_id: requestId,
      status: 'pending',
      message: 'Residential pickup request submitted.'
    };
  }

  // ----------------------
  // 10) getPricingCalculatorConfig
  // ----------------------

  getPricingCalculatorConfig() {
    const materials = this._getFromStorage('materials', []);
    const yards = this._getFromStorage('yard_locations', []);

    const materialOptions = materials.map(function (m) {
      return {
        material_id: m.id,
        material_name: m.name,
        category_slug: m.category_slug,
        is_copper: !!m.is_copper,
        unit_of_measure: m.unit_of_measure
      };
    });

    const serviceTypes = [
      { service_type: 'on_site_pickup', label: 'On-site pickup' },
      { service_type: 'drop_off_at_yard', label: 'Drop-off at yard' }
    ];

    const paymentMethods = [
      { payment_method: 'paypal', label: 'PayPal' },
      { payment_method: 'check', label: 'Check' },
      { payment_method: 'cash', label: 'Cash' }
    ];

    const payoutLocations = yards
      .filter(function (y) { return y.active; })
      .map(function (y) {
        return {
          yard_location_id: y.id,
          yard_name: y.name,
          city: y.city,
          state: y.state,
          yard_location: y
        };
      });

    return {
      materials: materialOptions,
      service_types: serviceTypes,
      payment_methods: paymentMethods,
      payout_locations: payoutLocations
    };
  }

  // ----------------------
  // 11) getSingleMaterialPayoutOptions
  // ----------------------

  getSingleMaterialPayoutOptions(materialId, weightLbs) {
    const materials = this._getFromStorage('materials', []);
    const rates = this._getFromStorage('material_service_rates', []);
    const material = materials.find(function (m) { return m.id === materialId; }) || null;

    const relevantRates = rates.filter(function (r) {
      return r.material_id === materialId;
    });

    const options = [];
    let maxPayout = 0;

    for (let i = 0; i < relevantRates.length; i++) {
      const r = relevantRates[i];
      const payout = (r.price_per_lb || 0) * (weightLbs || 0);
      if (payout > maxPayout) {
        maxPayout = payout;
      }
      options.push({
        service_type: r.service_type,
        price_per_lb: r.price_per_lb,
        estimated_payout: payout,
        description: r.description || '',
        is_highest_payout: false
      });
    }

    for (let j = 0; j < options.length; j++) {
      if (options[j].estimated_payout === maxPayout && maxPayout > 0) {
        options[j].is_highest_payout = true;
      }
    }

    return {
      material_id: materialId,
      material_name: material ? material.name : '',
      weight_lbs: weightLbs,
      options: options
    };
  }

  // ----------------------
  // 12) submitSingleMaterialQuoteRequest
  // ----------------------

  submitSingleMaterialQuoteRequest(
    materialId,
    materialName,
    weightLbs,
    serviceTypeSelected,
    estimatedPayout,
    name,
    email,
    phone
  ) {
    const quoteRequests = this._getFromStorage('quote_requests', []);
    const id = this._generateId('quote');

    const record = {
      id: id,
      material_id: materialId,
      material_name: materialName,
      weight_lbs: weightLbs,
      service_type_selected: serviceTypeSelected,
      estimated_payout: estimatedPayout,
      name: name,
      email: email,
      phone: phone,
      created_at: new Date().toISOString(),
      status: 'submitted'
    };

    quoteRequests.push(record);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      quote_request_id: id,
      status: 'submitted',
      message: 'Quote request submitted.'
    };
  }

  // ----------------------
  // 13) calculateMultiMaterialEstimate
  // ----------------------

  calculateMultiMaterialEstimate(items) {
    const materials = this._getFromStorage('materials', []);

    const results = [];
    let total = 0;

    for (let i = 0; i < (items || []).length; i++) {
      const item = items[i];
      const payoutInfo = this._calculatePayoutForMaterial(item.materialId, item.weightLbs, 'drop_off_at_yard');
      const estimated = payoutInfo.estimatedPayout || 0;
      total += estimated;

      const material = materials.find(function (m) { return m.id === item.materialId; }) || null;

      results.push({
        material_id: item.materialId,
        material_name: item.materialName,
        weight_lbs: item.weightLbs,
        estimated_payout: estimated,
        material: material
      });
    }

    return {
      items: results,
      total_estimated_payout: total
    };
  }

  // ----------------------
  // 14) submitMultiMaterialEstimateRequest
  // ----------------------

  submitMultiMaterialEstimateRequest(items, paymentMethod, preferredPayoutLocationId, preferredPayoutLocationName, name, email) {
    const estimateRequests = this._getFromStorage('estimate_requests', []);
    const estimateItems = this._getFromStorage('estimate_request_items', []);

    let total = 0;
    for (let i = 0; i < (items || []).length; i++) {
      total += items[i].estimatedPayout || 0;
    }

    const id = this._generateId('estimate');

    const record = {
      id: id,
      total_estimated_payout: total,
      payment_method: paymentMethod,
      preferred_payout_location_id: preferredPayoutLocationId || null,
      preferred_payout_location_name: preferredPayoutLocationName || '',
      name: name,
      email: email,
      created_at: new Date().toISOString(),
      status: 'submitted'
    };

    estimateRequests.push(record);
    this._saveToStorage('estimate_requests', estimateRequests);

    for (let j = 0; j < (items || []).length; j++) {
      const item = items[j];
      const itemId = this._generateId('estimate_item');
      estimateItems.push({
        id: itemId,
        estimate_request_id: id,
        material_id: item.materialId,
        material_name: item.materialName,
        weight_lbs: item.weightLbs,
        estimated_payout: item.estimatedPayout
      });
    }
    this._saveToStorage('estimate_request_items', estimateItems);

    return {
      success: true,
      estimate_request_id: id,
      status: 'submitted',
      total_estimated_payout: total,
      message: 'Estimate request submitted.'
    };
  }

  // ----------------------
  // 15) getDumpsterRentalConfig
  // ----------------------

  getDumpsterRentalConfig() {
    const sizeOptions = [
      { size_code: 'ten_yard', label: '10-yard dumpster' },
      { size_code: 'twenty_yard', label: '20-yard dumpster' },
      { size_code: 'thirty_yard', label: '30-yard dumpster' },
      { size_code: 'forty_yard', label: '40-yard dumpster' }
    ];

    return {
      size_options: sizeOptions,
      min_rental_days: 1,
      max_rental_days: 30
    };
  }

  // ----------------------
  // 16) getDumpsterOptionsByZip
  // ----------------------

  getDumpsterOptionsByZip(serviceZip) {
    const serviceArea = this._findServiceAreaByZip(serviceZip);
    const optionsAll = this._getFromStorage('dumpster_options', []);

    const options = serviceArea
      ? optionsAll.filter(function (o) {
          return o.is_active && o.service_area_id === serviceArea.id;
        })
      : [];

    const optionViews = options.map(function (o) {
      return {
        dumpster_option_id: o.id,
        name: o.name,
        size_code: o.size_code,
        description: o.description || '',
        daily_rate: o.daily_rate,
        is_active: !!o.is_active,
        dumpster_option: o
      };
    });

    const areaInfo = serviceArea
      ? {
          service_area_id: serviceArea.id,
          name: serviceArea.name
        }
      : null;

    return {
      service_zip: serviceZip,
      service_area: areaInfo,
      options: optionViews
    };
  }

  // ----------------------
  // 17) submitDumpsterRentalBooking
  // ----------------------

  submitDumpsterRentalBooking(
    dumpsterOptionId,
    sizeCode,
    serviceZip,
    rentalStartDate,
    rentalEndDate,
    rentalDays,
    quantity,
    deliveryAddressLine1,
    deliveryAddressLine2,
    city,
    state,
    contactName,
    contactPhone
  ) {
    const bookings = this._getFromStorage('dumpster_rental_bookings', []);
    const id = this._generateId('dumpster_booking');

    const record = {
      id: id,
      dumpster_option_id: dumpsterOptionId,
      size_code: sizeCode,
      service_zip: serviceZip,
      rental_start_date: rentalStartDate,
      rental_end_date: rentalEndDate,
      rental_days: rentalDays,
      quantity: quantity,
      delivery_address_line1: deliveryAddressLine1,
      delivery_address_line2: deliveryAddressLine2 || '',
      city: city,
      state: state,
      contact_name: contactName,
      contact_phone: contactPhone,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    bookings.push(record);
    this._saveToStorage('dumpster_rental_bookings', bookings);

    return {
      success: true,
      dumpster_rental_booking_id: id,
      status: 'pending',
      message: 'Dumpster rental booking submitted.'
    };
  }

  // ----------------------
  // 18) getMaterialCategories
  // ----------------------

  getMaterialCategories() {
    return this._getFromStorage('material_categories', []);
  }

  // ----------------------
  // 19) getMaterialsByCategory
  // ----------------------

  getMaterialsByCategory(categorySlug, sortBy, minPricePerLb) {
    const categories = this._getFromStorage('material_categories', []);
    const materials = this._getFromStorage('materials', []);

    const category = categories.find(function (c) { return c.slug === categorySlug; }) || null;

    let filtered = materials.filter(function (m) {
      return m.category_slug === categorySlug;
    });

    if (typeof minPricePerLb === 'number') {
      filtered = filtered.filter(function (m) {
        return m.base_price_per_lb >= minPricePerLb;
      });
    }

    if (sortBy === 'price_per_lb_high_to_low') {
      filtered.sort(function (a, b) {
        return b.base_price_per_lb - a.base_price_per_lb;
      });
    } else if (sortBy === 'price_per_lb_low_to_high') {
      filtered.sort(function (a, b) {
        return a.base_price_per_lb - b.base_price_per_lb;
      });
    } else if (sortBy === 'name_asc') {
      filtered.sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name));
      });
    }

    const materialViews = filtered.map(function (m) {
      return {
        material_id: m.id,
        material_name: m.name,
        is_copper: !!m.is_copper,
        base_price_per_lb: m.base_price_per_lb,
        description: m.description || ''
      };
    });

    return {
      category_slug: categorySlug,
      category_name: category ? category.name : categorySlug,
      materials: materialViews
    };
  }

  // ----------------------
  // 20) submitDropoffPlan
  // ----------------------

  submitDropoffPlan(visitorName, visitorEmail, items) {
    const plans = this._getFromStorage('plan_visits', []);
    const planItems = this._getFromStorage('plan_visit_items', []);

    const id = this._generateId('plan');

    let totalWeight = 0;
    for (let i = 0; i < (items || []).length; i++) {
      totalWeight += items[i].estimatedWeightLbs || 0;
    }

    const planRecord = {
      id: id,
      visitor_name: visitorName,
      visitor_email: visitorEmail,
      created_at: new Date().toISOString(),
      status: 'submitted',
      total_estimated_weight_lbs: totalWeight
    };

    plans.push(planRecord);
    this._saveToStorage('plan_visits', plans);

    for (let j = 0; j < (items || []).length; j++) {
      const item = items[j];
      const itemId = this._generateId('plan_item');
      planItems.push({
        id: itemId,
        plan_visit_id: id,
        material_id: item.materialId,
        material_name: item.materialName,
        estimated_weight_lbs: item.estimatedWeightLbs,
        unit: item.unit
      });
    }

    this._saveToStorage('plan_visit_items', planItems);

    return {
      success: true,
      plan_visit_id: id,
      status: 'submitted',
      total_estimated_weight_lbs: totalWeight,
      message: 'Drop-off plan submitted.'
    };
  }

  // ----------------------
  // 21) getBusinessPlanFilterOptions
  // ----------------------

  getBusinessPlanFilterOptions() {
    const industries = [
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'construction', label: 'Construction' },
      { value: 'retail', label: 'Retail' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'other', label: 'Other' }
    ];

    const maxPriceOptions = [
      { value: 100, label: 'Up to $100 / month' },
      { value: 200, label: 'Up to $200 / month' },
      { value: 500, label: 'Up to $500 / month' },
      { value: 1000, label: 'Up to $1,000 / month' }
    ];

    return {
      industries: industries,
      max_price_options: maxPriceOptions
    };
  }

  // ----------------------
  // 22) getBusinessPlans
  // ----------------------

  getBusinessPlans(industry, maxMonthlyCost, requiresMonthlyScheduledPickup) {
    const plansAll = this._getFromStorage('business_plans', []);

    let plans = plansAll.filter(function (p) { return p.is_active; });

    if (industry) {
      plans = plans.filter(function (p) { return p.industry === industry; });
    }

    if (typeof maxMonthlyCost === 'number') {
      plans = plans.filter(function (p) { return p.monthly_cost <= maxMonthlyCost; });
    }

    if (requiresMonthlyScheduledPickup) {
      plans = plans.filter(function (p) { return p.includes_monthly_scheduled_pickup; });
    }

    return {
      plans: plans
    };
  }

  // ----------------------
  // 23) getBusinessPlanDetails
  // ----------------------

  getBusinessPlanDetails(businessPlanId) {
    const plans = this._getFromStorage('business_plans', []);
    const plan = plans.find(function (p) { return p.id === businessPlanId; }) || null;

    let industryLabel = null;
    if (plan) {
      const mapping = {
        manufacturing: 'Manufacturing',
        construction: 'Construction',
        retail: 'Retail',
        healthcare: 'Healthcare',
        other: 'Other'
      };
      industryLabel = mapping[plan.industry] || plan.industry;
    }

    return {
      plan: plan
        ? {
            id: plan.id,
            name: plan.name,
            description: plan.description || '',
            industry: plan.industry,
            monthly_cost: plan.monthly_cost,
            billing_frequency: plan.billing_frequency,
            includes_monthly_scheduled_pickup: !!plan.includes_monthly_scheduled_pickup,
            is_active: !!plan.is_active
          }
        : null,
      industry_label: industryLabel
    };
  }

  // ----------------------
  // 24) submitBusinessPlanSignup
  // ----------------------

  submitBusinessPlanSignup(businessPlanId, businessName, industry, city, contactName, contactEmail, contactPhone) {
    const signups = this._getFromStorage('business_plan_signups', []);
    const id = this._generateId('biz_signup');

    const record = {
      id: id,
      business_plan_id: businessPlanId,
      business_name: businessName,
      industry: industry,
      city: city,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      created_at: new Date().toISOString(),
      status: 'submitted'
    };

    signups.push(record);
    this._saveToStorage('business_plan_signups', signups);

    return {
      success: true,
      business_plan_signup_id: id,
      status: 'submitted',
      message: 'Business plan signup submitted.'
    };
  }

  // ----------------------
  // 25) searchBlogPosts
  // ----------------------

  searchBlogPosts(query) {
    const posts = this._getFromStorage('blog_posts', []);
    const q = query ? String(query).toLowerCase() : '';

    let filtered = posts.filter(function (p) { return p.status === 'published'; });

    if (q) {
      filtered = filtered.filter(function (p) {
        const title = (p.title || '').toLowerCase();
        const excerpt = (p.excerpt || '').toLowerCase();
        const content = (p.content || '').toLowerCase();
        const tags = Array.isArray(p.tags) ? p.tags.map(function (t) { return String(t).toLowerCase(); }) : [];
        const hazardous = Array.isArray(p.hazardous_items)
          ? p.hazardous_items.map(function (t) { return String(t).toLowerCase(); })
          : [];

        if (title.indexOf(q) !== -1) return true;
        if (excerpt.indexOf(q) !== -1) return true;
        if (content.indexOf(q) !== -1) return true;
        if (tags.some(function (t) { return t.indexOf(q) !== -1; })) return true;
        if (hazardous.some(function (t) { return t.indexOf(q) !== -1; })) return true;
        return false;
      });
    }

    return {
      posts: filtered
    };
  }

  // ----------------------
  // 26) getBlogPostDetails
  // ----------------------

  getBlogPostDetails(blogPostId) {
    const posts = this._getFromStorage('blog_posts', []);
    const post = posts.find(function (p) { return p.id === blogPostId; }) || null;

    return {
      post: post
        ? {
            id: post.id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt || '',
            content: post.content,
            published_at: post.published_at,
            status: post.status,
            tags: post.tags || [],
            hazardous_items: post.hazardous_items || [],
            featured: !!post.featured
          }
        : null
    };
  }

  // ----------------------
  // 27) getActivePromotions
  // ----------------------

  getActivePromotions(appliesTo, firstTimeCustomerOnly) {
    const promotions = this._getFromStorage('promotions', []);
    const yards = this._getFromStorage('yard_locations', []);
    const now = new Date();

    const filtered = promotions.filter(function (p) {
      if (!p.is_active) return false;

      // applies_to filter: match appliesTo or all_services
      if (appliesTo && p.applies_to !== 'all_services' && p.applies_to !== appliesTo) {
        return false;
      }

      if (firstTimeCustomerOnly && !p.is_first_time_customer) {
        return false;
      }

      if (p.start_date) {
        const start = new Date(p.start_date);
        if (!Number.isNaN(start.getTime()) && now < start) return false;
      }
      if (p.end_date) {
        const end = new Date(p.end_date);
        if (!Number.isNaN(end.getTime()) && now > end) return false;
      }

      return true;
    });

    const result = filtered.map(function (p) {
      let applicableLocations = [];
      if (Array.isArray(p.applicable_location_ids) && p.applicable_location_ids.length) {
        applicableLocations = yards.filter(function (y) {
          return p.applicable_location_ids.indexOf(y.id) !== -1;
        });
      }
      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        promo_code: p.promo_code,
        applies_to: p.applies_to,
        is_first_time_customer: !!p.is_first_time_customer,
        is_active: !!p.is_active,
        start_date: p.start_date,
        end_date: p.end_date,
        applicable_location_ids: p.applicable_location_ids || [],
        applicable_locations: applicableLocations
      };
    });

    return result;
  }

  // ----------------------
  // 28) getDropoffBookingConfig
  // ----------------------

  getDropoffBookingConfig() {
    const yards = this._getFromStorage('yard_locations', []);
    const mainYard = yards.find(function (y) { return y.is_main_yard; }) || null;

    return {
      yards: yards,
      main_yard_id: mainYard ? mainYard.id : null
    };
  }

  // ----------------------
  // 29) getDropoffTimeSlotsForDate
  // ----------------------

  getDropoffTimeSlotsForDate(yardLocationId, date) {
    const timeSlots = this._getFromStorage('time_slots', []);
    const targetDate = this._toDateOnlyString(date);

    const matching = timeSlots.filter((ts) => {
      if (ts.service_type !== 'drop_off_visit') return false;
      if (ts.yard_location_id !== yardLocationId) return false;
      const slotDate = this._toDateOnlyString(ts.date || ts.start_time);
      return !!targetDate && slotDate === targetDate;
    });

    // If no explicit drop-off slots exist for this yard and date, create a default midday slot
    if (!matching.length && targetDate) {
      const newSlot = {
        id: this._generateId('dropoff_slot'),
        service_type: 'drop_off_visit',
        date: targetDate + 'T00:00:00',
        start_time: targetDate + 'T12:00:00',
        end_time: targetDate + 'T15:00:00',
        yard_location_id: yardLocationId,
        is_available: true
      };
      timeSlots.push(newSlot);
      this._saveToStorage('time_slots', timeSlots);
      matching.push(newSlot);
    }

    const slotsView = matching.map(function (ts) {
      return {
        time_slot_id: ts.id,
        start_time: ts.start_time,
        end_time: ts.end_time,
        is_available: !!ts.is_available,
        time_slot: ts
      };
    });

    return {
      yard_location_id: yardLocationId,
      date: targetDate,
      time_slots: slotsView
    };
  }

  // ----------------------
  // 30) submitDropoffAppointment
  // ----------------------

  submitDropoffAppointment(yardLocationId, visitType, date, timeSlotId, name, email, promoCode) {
    const yards = this._getFromStorage('yard_locations', []);
    const timeSlots = this._getFromStorage('time_slots', []);
    const appointments = this._getFromStorage('dropoff_appointments', []);

    const yard = yards.find(function (y) { return y.id === yardLocationId; }) || null;
    const ts = timeSlots.find(function (t) { return t.id === timeSlotId; }) || null;

    if (!yard) {
      return {
        success: false,
        dropoff_appointment_id: null,
        status: 'pending',
        applied_promotion_id: null,
        message: 'Invalid yard location.'
      };
    }

    if (!ts || ts.service_type !== 'drop_off_visit' || !ts.is_available) {
      return {
        success: false,
        dropoff_appointment_id: null,
        status: 'pending',
        applied_promotion_id: null,
        message: 'Invalid or unavailable time slot.'
      };
    }

    const promoId = this._validateAndLookupPromoCode(promoCode, 'drop_off_visit', yardLocationId);

    const id = this._generateId('dropoff');
    const scheduledDateStr = this._toDateOnlyString(date || ts.date || ts.start_time);
    const scheduledDateIso = scheduledDateStr ? scheduledDateStr + 'T00:00:00.000Z' : new Date().toISOString();

    const record = {
      id: id,
      visit_type: visitType || 'drop_off',
      yard_location_id: yardLocationId,
      yard_location_name: yard.name,
      scheduled_date: scheduledDateIso,
      time_slot_id: timeSlotId,
      time_window_start: ts.start_time,
      time_window_end: ts.end_time,
      name: name,
      email: email,
      promo_code: promoCode || '',
      promotion_id: promoId,
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    appointments.push(record);
    this._saveToStorage('dropoff_appointments', appointments);

    // Mark slot unavailable
    ts.is_available = false;
    this._saveToStorage('time_slots', timeSlots);

    return {
      success: true,
      dropoff_appointment_id: id,
      status: 'pending',
      applied_promotion_id: promoId,
      message: 'Drop-off appointment booked.'
    };
  }

  // ----------------------
  // 31) getAboutPageContent
  // ----------------------

  getAboutPageContent() {
    const mainYard = this._getMainYard();

    const mainYardInfo = mainYard
      ? {
          yard_location_id: mainYard.id,
          yard_name: mainYard.name,
          address_line1: mainYard.address_line1,
          city: mainYard.city,
          state: mainYard.state,
          zip: mainYard.zip
        }
      : null;

    return {
      headline: 'About Our Scrap Metal Recycling Services',
      body:
        'We provide transparent scrap metal recycling services for homeowners, contractors, and businesses, with fair pricing and convenient options like residential pickup, dumpster rental, and custom business programs.',
      service_coverage_summary:
        'Our network of yards and service areas covers multiple metro regions with both drop-off and pickup services.',
      main_yard: mainYardInfo,
      differentiators: [
        'Transparent, per-pound pricing with no hidden fees',
        'Flexible options: drop-off, pickup, and container rental',
        'Customized business recycling programs for manufacturers'
      ]
    };
  }

  // ----------------------
  // 32) getFaqEntries
  // ----------------------

  getFaqEntries() {
    return [
      {
        category: 'hours',
        question: 'What are your typical yard hours?',
        answer: 'Hours vary by location, but most yards are open weekdays and limited hours on Saturdays. See the Locations page or contact us for exact hours.'
      },
      {
        category: 'materials',
        question: 'What kinds of metals do you accept?',
        answer: 'We accept a wide range of non-ferrous and ferrous metals, including copper, aluminum, steel, appliances, and more. Check the Materials Guide for details.'
      },
      {
        category: 'hazardous_items',
        question: 'Do you accept hazardous metal items like batteries?',
        answer: 'Certain hazardous or restricted items require special handling and may not be accepted at all locations. Please review our hazardous materials policy and contact us before bringing these items.'
      },
      {
        category: 'appliance_pickups',
        question: 'Can you pick up my old refrigerator?',
        answer: 'Yes, in covered ZIP codes we can schedule a residential pickup for refrigerators and other appliances. Use the Residential Pickup page to check availability.'
      },
      {
        category: 'container_rentals',
        question: 'How long can I keep a scrap metal dumpster rental?',
        answer: 'Standard rentals range from a few days up to several weeks. You can specify your rental period when booking, subject to availability.'
      }
    ];
  }

  // ----------------------
  // 33) getPoliciesAndTerms
  // ----------------------

  getPoliciesAndTerms() {
    return {
      terms_of_service:
        'By using our scrap metal recycling services, you agree to comply with all posted yard rules, safety requirements, and payment terms. Service availability and pricing are subject to change without notice.',
      hazardous_materials_policy:
        'Hazardous and restricted materials (including but not limited to certain batteries, chemicals, and contaminated scrap) may require special handling, additional documentation, or may not be accepted at all. Customers are responsible for disclosing hazardous characteristics in advance.',
      privacy_practices:
        'We collect only the information needed to provide our services, process payments, and communicate with you. We do not sell your personal information and only share it as required to fulfill services or comply with law.'
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
