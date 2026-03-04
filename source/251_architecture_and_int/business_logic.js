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
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const tables = [
      'interior_design_packages',
      'quote_requests',
      'quote_request_items',
      'professionals',
      'professional_availability_slots',
      'consultation_bookings',
      'visit_requests',
      'portfolio_projects',
      'renovation_estimates',
      'add_on_services',
      'service_bundles',
      'service_bundle_items',
      'blog_articles',
      'project_inquiries',
      'style_quiz_questions',
      'style_quiz_options',
      'style_quiz_results',
      'saved_style_recommendations',
      'custom_package_configs',
      'custom_package_rooms'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
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
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _findById(collectionKey, id) {
    const items = this._getFromStorage(collectionKey);
    return items.find((i) => i.id === id) || null;
  }

  // Generic helper for filtering + sorting + pagination
  _applySearchFiltersAndSorting(items, filterFn, sortFn, page, pageSize) {
    let result = items;
    if (typeof filterFn === 'function') {
      result = result.filter(filterFn);
    }
    if (typeof sortFn === 'function') {
      result = result.slice().sort(sortFn);
    }
    const total = result.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const paged = result.slice(start, end);
    return { items: paged, total, page: p, page_size: ps };
  }

  // ----------------------
  // Internal helpers specific to this domain
  // ----------------------

  _getOrCreateQuoteRequest() {
    const quoteRequests = this._getFromStorage('quote_requests');
    let active = quoteRequests.find((q) => q.status === 'draft');
    if (!active) {
      active = {
        id: this._generateId('quote_request'),
        status: 'draft',
        created_at: this._nowISO(),
        submitted_at: null,
        contact_name: null,
        contact_email: null,
        preferred_contact_method: 'none',
        notes: null,
        items: []
      };
      quoteRequests.push(active);
      this._saveToStorage('quote_requests', quoteRequests);
    }
    return active;
  }

  _getActiveQuoteRequest() {
    const quoteRequests = this._getFromStorage('quote_requests');
    return quoteRequests.find((q) => q.status === 'draft') || null;
  }

  _getOrCreateServiceBundle() {
    const bundles = this._getFromStorage('service_bundles');
    let active = bundles.find((b) => b.status === 'active');
    if (!active) {
      active = {
        id: this._generateId('service_bundle'),
        created_at: this._nowISO(),
        updated_at: null,
        status: 'active',
        items: []
      };
      bundles.push(active);
      this._saveToStorage('service_bundles', bundles);
    }
    return active;
  }

  _getActiveServiceBundle() {
    const bundles = this._getFromStorage('service_bundles');
    return bundles.find((b) => b.status === 'active') || null;
  }

  _calculateRenovationEstimateCost(roomType, roomQuantity, roomAreaSqFt, materialsQuality, includeLightingUpgrade, includeBuiltInWardrobe, includeFlooringReplacement) {
    // Simple pricing model; uses only function inputs (no mocked data rows)
    const baseRatePerSqFtByRoom = {
      bedroom: 40,
      living_room: 45,
      kitchen: 60,
      bathroom: 70,
      dining_room: 45,
      home_office: 50,
      other: 40
    };

    const qualityMultiplier = {
      basic: 1,
      mid_range: 1.3,
      premium: 1.6
    };

    const baseRatePerSqFt = baseRatePerSqFtByRoom[roomType] || baseRatePerSqFtByRoom.other;
    const qualityMult = qualityMultiplier[materialsQuality] || 1;

    const totalArea = roomQuantity * roomAreaSqFt;
    let cost = totalArea * baseRatePerSqFt * qualityMult;

    const lightingCostPerRoom = 500;
    const wardrobeCostPerRoom = 800;
    const flooringCostPerRoom = 1000;

    if (includeLightingUpgrade) {
      cost += roomQuantity * lightingCostPerRoom;
    }
    if (includeBuiltInWardrobe) {
      cost += roomQuantity * wardrobeCostPerRoom;
    }
    if (includeFlooringReplacement) {
      cost += roomQuantity * flooringCostPerRoom;
    }

    return Math.round(cost);
  }

  _calculateCustomPackagePricing(designStyle, timelineOption, paymentPlan, rooms) {
    // Base prices per room type and service level
    const basePriceLookups = {
      bedroom: {
        basic: 800,
        standard: 1200,
        full_service: 1600,
        premium: 2000
      },
      living_room: {
        basic: 900,
        standard: 1300,
        full_service: 1700,
        premium: 2100
      },
      kitchen: {
        basic: 1500,
        standard: 2100,
        full_service: 2700,
        premium: 3300
      },
      bathroom: {
        basic: 1000,
        standard: 1400,
        full_service: 1800,
        premium: 2200
      },
      dining_room: {
        basic: 900,
        standard: 1300,
        full_service: 1700,
        premium: 2100
      },
      home_office: {
        basic: 950,
        standard: 1350,
        full_service: 1750,
        premium: 2150
      },
      other: {
        basic: 900,
        standard: 1300,
        full_service: 1700,
        premium: 2100
      }
    };

    const timelineMultiplier = timelineOption === 'express' ? 1.2 : 1.0;
    // For now, paymentPlan does not affect total price; kept for future rules

    let basePriceTotal = 0;
    let totalPrice = 0;
    const roomPricing = [];

    for (const r of rooms) {
      const roomType = r.room_type || 'other';
      const qty = r.quantity || 0;
      const serviceLevel = r.service_level || 'standard';
      const roomLookup = basePriceLookups[roomType] || basePriceLookups.other;
      const basePerRoom = roomLookup[serviceLevel] || roomLookup.standard;
      const pricePerRoomWithTimeline = basePerRoom * timelineMultiplier;
      const roomTotal = pricePerRoomWithTimeline * qty;

      basePriceTotal += basePerRoom * qty;
      totalPrice += roomTotal;

      roomPricing.push({
        room_type: roomType,
        quantity: qty,
        service_level: serviceLevel,
        base_price_per_room: basePerRoom,
        total_price: roomTotal
      });
    }

    return { base_price: basePriceTotal, total_price: totalPrice, room_pricing: roomPricing };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomeFeaturedContent
  getHomeFeaturedContent() {
    const packages = this._getFromStorage('interior_design_packages').filter((p) => p.is_active);
    const addOns = this._getFromStorage('add_on_services').filter((a) => a.is_active);
    const projects = this._getFromStorage('portfolio_projects');
    const articles = this._getFromStorage('blog_articles').filter((a) => a.is_published);

    const featured_interior_design_packages = packages
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4);

    const featured_add_on_services = addOns
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4);

    const featured_portfolio_projects = projects.slice(0, 6);

    const recent_blog_articles = articles
      .slice()
      .sort((a, b) => this._parseDate(b.published_at) - this._parseDate(a.published_at))
      .slice(0, 5);

    return {
      featured_interior_design_packages,
      featured_add_on_services,
      featured_portfolio_projects,
      recent_blog_articles
    };
  }

  // getServicesOverviewContent
  getServicesOverviewContent() {
    return {
      hero_title: 'Architecture & Interior Design Services',
      hero_subtitle: 'From single-room makeovers to full office buildings, configure the services that match your needs and budget.',
      service_categories: [
        {
          id: 'interior_design_packages',
          name: 'Interior Design Packages',
          description: 'Predefined room-specific packages including layout, finishes, and 3D visuals.'
        },
        {
          id: 'custom_packages',
          name: 'Custom Multi-room Packages',
          description: 'Build a tailored package across multiple rooms with flexible timelines and payment plans.'
        },
        {
          id: 'add_on_services',
          name: 'Decor & Styling Add-ons',
          description: 'Layer in decor, styling, and other enhancements to existing projects.'
        },
        {
          id: 'architecture_projects',
          name: 'Architecture & Office Projects',
          description: 'Concept-to-completion services for office, commercial, and mixed-use buildings.'
        }
      ]
    };
  }

  // getInteriorDesignPackageFilterOptions
  getInteriorDesignPackageFilterOptions() {
    const packages = this._getFromStorage('interior_design_packages');
    const roomTypeEnum = [
      { value: 'living_room', label: 'Living Room' },
      { value: 'bedroom', label: 'Bedroom' },
      { value: 'kitchen', label: 'Kitchen' },
      { value: 'bathroom', label: 'Bathroom' },
      { value: 'dining_room', label: 'Dining Room' },
      { value: 'home_office', label: 'Home Office' },
      { value: 'full_home', label: 'Full Home' },
      { value: 'other', label: 'Other' }
    ];

    const prices = packages.map((p) => p.base_price || 0);
    const minPrice = prices.length ? Math.min.apply(null, prices) : 0;
    const maxPrice = prices.length ? Math.max.apply(null, prices) : 10000;

    // Derive feature filters from existing packages
    const featureSet = new Set();
    for (const p of packages) {
      if (p.other_features && Array.isArray(p.other_features)) {
        for (const f of p.other_features) {
          featureSet.add(f);
        }
      }
    }
    const feature_filters = [];
    // Explicit 3D visualization filter
    feature_filters.push({ id: 'includes_3d_visualization', label: '3D visualization / 3D renderings' });
    featureSet.forEach((f) => {
      feature_filters.push({ id: f, label: f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) });
    });

    const sort_options = [
      { value: 'rating_desc', label: 'Customer Rating (high to low)' },
      { value: 'price_asc', label: 'Price (low to high)' },
      { value: 'price_desc', label: 'Price (high to low)' },
      { value: 'popularity_desc', label: 'Most popular' }
    ];

    return {
      room_types: roomTypeEnum,
      feature_filters,
      price_range: {
        min: minPrice,
        max: maxPrice,
        step: 50,
        currency: 'usd'
      },
      sort_options
    };
  }

  // searchInteriorDesignPackages(filters, sort)
  searchInteriorDesignPackages(filters, sort) {
    const packages = this._getFromStorage('interior_design_packages');
    const f = filters || {};
    const s = sort || {};

    const filterFn = (p) => {
      if (f.room_type && p.room_type !== f.room_type) return false;
      if (typeof f.min_price === 'number' && p.base_price < f.min_price) return false;
      if (typeof f.max_price === 'number' && p.base_price > f.max_price) return false;
      if (typeof f.includes_3d_visualization === 'boolean' && p.includes_3d_visualization !== f.includes_3d_visualization) return false;
      if (f.other_feature_ids && f.other_feature_ids.length) {
        const other = Array.isArray(p.other_features) ? p.other_features : [];
        for (const feat of f.other_feature_ids) {
          if (!other.includes(feat)) return false;
        }
      }
      if (f.only_active && !p.is_active) return false;
      return true;
    };

    const sortFn = (a, b) => {
      switch (s.sort_by) {
        case 'price_asc':
          return (a.base_price || 0) - (b.base_price || 0);
        case 'price_desc':
          return (b.base_price || 0) - (a.base_price || 0);
        case 'popularity_desc':
          return (b.rating_count || 0) - (a.rating_count || 0);
        case 'rating_desc':
        default:
          return (b.rating || 0) - (a.rating || 0);
      }
    };

    return this._applySearchFiltersAndSorting(packages, filterFn, sortFn, s.page, s.page_size);
  }

  // getInteriorDesignPackageDetails(packageId)
  getInteriorDesignPackageDetails(packageId) {
    const pkg = this._findById('interior_design_packages', packageId);
    const addOns = this._getFromStorage('add_on_services').filter((a) => a.is_active);
    // Simple heuristic: decor/styling add-ons as related
    const related_add_on_services = addOns.filter((a) => a.category === 'decor_styling_add_ons').slice(0, 6);
    return {
      package: pkg || null,
      related_add_on_services
    };
  }

  // addInteriorDesignPackageToQuoteRequest(packageId, quantity, notes)
  addInteriorDesignPackageToQuoteRequest(packageId, quantity, notes) {
    const pkg = this._findById('interior_design_packages', packageId);
    if (!pkg || !pkg.is_active) {
      return { success: false, quote_request: null, added_item: null, message: 'Design package not found or inactive.' };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const quoteRequests = this._getFromStorage('quote_requests');
    const items = this._getFromStorage('quote_request_items');

    const quoteReq = this._getOrCreateQuoteRequest();

    const newItem = {
      id: this._generateId('quote_request_item'),
      quote_request_id: quoteReq.id,
      item_type: 'design_package',
      item_ref_id: pkg.id,
      name_snapshot: pkg.name,
      unit_price_snapshot: pkg.base_price,
      quantity: qty,
      added_at: this._nowISO()
    };

    items.push(newItem);

    const qrIndex = quoteRequests.findIndex((q) => q.id === quoteReq.id);
    if (qrIndex !== -1) {
      const updatedItems = Array.isArray(quoteRequests[qrIndex].items) ? quoteRequests[qrIndex].items.slice() : [];
      updatedItems.push(newItem.id);
      quoteRequests[qrIndex] = { ...quoteRequests[qrIndex], items: updatedItems };
    } else {
      // If the quote request was just created in _getOrCreateQuoteRequest, it may not
      // be present in our local array yet. In that case, add it with the new item id.
      const newQuoteRequest = { ...quoteReq, items: [newItem.id] };
      quoteRequests.push(newQuoteRequest);
    }

    this._saveToStorage('quote_request_items', items);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      quote_request: quoteRequests.find((q) => q.id === quoteReq.id) || quoteReq,
      added_item: newItem,
      message: 'Design package added to quote request.'
    };
  }

  // getActiveQuoteRequestSummary
  getActiveQuoteRequestSummary() {
    const quoteReq = this._getActiveQuoteRequest();
    const items = this._getFromStorage('quote_request_items');
    const packages = this._getFromStorage('interior_design_packages');

    if (!quoteReq) {
      return {
        quote_request: null,
        items: [],
        total_estimated_price: 0,
        currency: 'usd'
      };
    }

    const filteredItems = items.filter((i) => i.quote_request_id === quoteReq.id);

    // Resolve foreign keys: quote_request_id -> quote_request, item_ref_id -> item_ref (design package)
    const resolvedItems = filteredItems.map((item) => {
      let itemRef = null;
      if (item.item_type === 'design_package') {
        itemRef = packages.find((p) => p.id === item.item_ref_id) || null;
      }
      return {
        ...item,
        quote_request: quoteReq,
        item_ref: itemRef
      };
    });

    const total = resolvedItems.reduce((sum, i) => {
      const unit = typeof i.unit_price_snapshot === 'number' ? i.unit_price_snapshot : 0;
      return sum + unit * (i.quantity || 0);
    }, 0);

    return {
      quote_request: quoteReq,
      items: resolvedItems,
      total_estimated_price: total,
      currency: 'usd'
    };
  }

  // getProfessionalDirectoryFilterOptions
  getProfessionalDirectoryFilterOptions() {
    const pros = this._getFromStorage('professionals');

    const roles = [
      { value: 'designer', label: 'Designer' },
      { value: 'architect', label: 'Architect' }
    ];

    const styleEnum = [
      'modern',
      'scandinavian',
      'industrial',
      'minimalist',
      'contemporary',
      'traditional',
      'bohemian',
      'eclectic',
      'mid_century_modern'
    ];
    const style_specializations = styleEnum.map((s) => ({
      value: s,
      label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const ratings = pros
      .map((p) => p.rating || 0)
      .filter((v) => v > 0);
    const rating_thresholds = ratings.length ? [3, 3.5, 4, 4.5] : [4, 4.5];

    const expValues = pros.map((p) => p.years_experience || 0);
    const minExp = expValues.length ? Math.min.apply(null, expValues) : 0;
    const maxExp = expValues.length ? Math.max.apply(null, expValues) : 40;

    const projValues = pros.map((p) => p.completed_projects_count || 0);
    const minProj = projValues.length ? Math.min.apply(null, projValues) : 0;
    const maxProj = projValues.length ? Math.max.apply(null, projValues) : 100;

    const sort_options = [
      { value: 'rating_desc', label: 'Rating (high to low)' },
      { value: 'projects_desc', label: 'Completed projects (high to low)' },
      { value: 'experience_desc', label: 'Experience (high to low)' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      roles,
      style_specializations,
      rating_thresholds,
      experience_range: {
        min: minExp,
        max: maxExp,
        step: 1
      },
      completed_projects_range: {
        min: minProj,
        max: maxProj,
        step: 1
      },
      sort_options
    };
  }

  // searchProfessionals(filters, sort)
  searchProfessionals(filters, sort) {
    const pros = this._getFromStorage('professionals');
    const f = filters || {};
    const s = sort || {};

    const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : v);

    const filterFn = (p) => {
      if (f.role && p.role !== f.role) return false;
      if (f.location_city && toLower(p.location_city) !== toLower(f.location_city)) return false;
      if (f.location_state && toLower(p.location_state) !== toLower(f.location_state)) return false;
      if (f.location_country && toLower(p.location_country) !== toLower(f.location_country)) return false;

      if (f.style_specialization) {
        const style = f.style_specialization;
        const arr = Array.isArray(p.style_specializations) ? p.style_specializations : [];
        if (p.primary_style !== style && !arr.includes(style)) return false;
      }

      if (typeof f.min_rating === 'number' && (p.rating || 0) < f.min_rating) return false;
      if (typeof f.min_years_experience === 'number' && (p.years_experience || 0) < f.min_years_experience) return false;
      if (typeof f.min_completed_projects === 'number' && (p.completed_projects_count || 0) < f.min_completed_projects) return false;
      if (f.only_active && !p.is_active) return false;
      return true;
    };

    const sortFn = (a, b) => {
      switch (s.sort_by) {
        case 'projects_desc':
          return (b.completed_projects_count || 0) - (a.completed_projects_count || 0);
        case 'experience_desc':
          return (b.years_experience || 0) - (a.years_experience || 0);
        case 'rating_desc':
        case 'relevance':
        default:
          return (b.rating || 0) - (a.rating || 0);
      }
    };

    return this._applySearchFiltersAndSorting(pros, filterFn, sortFn, s.page, s.page_size);
  }

  // getProfessionalProfile(professionalId)
  getProfessionalProfile(professionalId) {
    const professional = this._findById('professionals', professionalId);
    const sample_projects = []; // No explicit FK in schema; left empty
    return { professional: professional || null, sample_projects };
  }

  // getProfessionalConsultationTypes(professionalId)
  getProfessionalConsultationTypes(professionalId) {
    const professional = this._findById('professionals', professionalId);
    const baseRate = professional && typeof professional.hourly_rate === 'number' ? professional.hourly_rate : null;

    const priceForMinutes = (mins, multiplier) => {
      if (baseRate == null) return null;
      const hours = mins / 60;
      return Math.round(baseRate * hours * (multiplier || 1));
    };

    const consultation_types = [
      {
        type: 'online_30_min',
        label: '30-minute online consultation',
        duration_minutes: 30,
        price: priceForMinutes(30, 1),
        currency: 'usd'
      },
      {
        type: 'online_60_min',
        label: '60-minute online consultation',
        duration_minutes: 60,
        price: priceForMinutes(60, 1),
        currency: 'usd'
      },
      {
        type: 'online_90_min',
        label: '90-minute online consultation',
        duration_minutes: 90,
        price: priceForMinutes(90, 1),
        currency: 'usd'
      },
      {
        type: 'in_person_60_min',
        label: '60-minute in-person consultation',
        duration_minutes: 60,
        price: priceForMinutes(60, 1.5),
        currency: 'usd'
      }
    ];

    return {
      professional_id: professionalId,
      consultation_types
    };
  }

  // getProfessionalAvailability(professionalId, date, slotType)
  getProfessionalAvailability(professionalId, date, slotType) {
    const slots = this._getFromStorage('professional_availability_slots');
    const professional = this._findById('professionals', professionalId);
    const targetDate = date;

    const filtered = slots.filter((s) => {
      if (s.professional_id !== professionalId) return false;
      if (s.is_booked) return false;
      // If a specific slotType is requested (e.g. 'consultation'), allow slots
      // of that type or generic 'either' slots. If slotType is 'either' or not
      // provided, accept all slot types.
      if (slotType && slotType !== 'either') {
        if (s.slot_type !== slotType && s.slot_type !== 'either') return false;
      }
      if (targetDate) {
        const d = s.start_datetime ? s.start_datetime.slice(0, 10) : null;
        if (d !== targetDate) return false;
      }
      return true;
    });

    const resolvedSlots = filtered.map((slot) => ({
      ...slot,
      professional: professional || null
    }));

    return {
      professional_id: professionalId,
      date: targetDate,
      slots: resolvedSlots
    };
  }

  // bookConsultation(professionalId, consultationType, startDatetime, clientName, clientEmail, projectDescription)
  bookConsultation(professionalId, consultationType, startDatetime, clientName, clientEmail, projectDescription) {
    const professional = this._findById('professionals', professionalId);
    if (!professional) {
      return { success: false, booking: null, message: 'Professional not found.' };
    }

    const slots = this._getFromStorage('professional_availability_slots');
    const bookings = this._getFromStorage('consultation_bookings');

    // Match an available consultation or either slot at the exact start time
    let matchedSlot = null;
    for (const s of slots) {
      if (s.professional_id !== professionalId) continue;
      if (s.is_booked) continue;
      if (s.slot_type !== 'consultation' && s.slot_type !== 'either') continue;
      if (s.start_datetime === startDatetime) {
        matchedSlot = s;
        break;
      }
    }

    const scheduled_end = matchedSlot ? matchedSlot.end_datetime : null;

    const booking = {
      id: this._generateId('consultation_booking'),
      professional_id: professionalId,
      consultation_type: consultationType,
      scheduled_start: startDatetime,
      scheduled_end: scheduled_end,
      client_name: clientName,
      client_email: clientEmail,
      project_description: projectDescription || null,
      created_at: this._nowISO(),
      status: 'pending'
    };

    bookings.push(booking);

    if (matchedSlot) {
      const idx = slots.findIndex((s) => s.id === matchedSlot.id);
      if (idx !== -1) {
        slots[idx] = { ...slots[idx], is_booked: true };
      }
      this._saveToStorage('professional_availability_slots', slots);
    }

    this._saveToStorage('consultation_bookings', bookings);

    return {
      success: true,
      booking,
      message: 'Consultation booked and pending confirmation.'
    };
  }

  // requestOnSiteVisit(professionalId, scheduledStartDatetime, budgetMin, budgetMax, clientName, clientPhone, projectAddress)
  requestOnSiteVisit(professionalId, scheduledStartDatetime, budgetMin, budgetMax, clientName, clientPhone, projectAddress) {
    const professional = this._findById('professionals', professionalId);
    if (!professional) {
      return { success: false, visit_request: null, message: 'Professional not found.' };
    }

    const slots = this._getFromStorage('professional_availability_slots');
    const visits = this._getFromStorage('visit_requests');

    let matchedSlot = null;
    for (const s of slots) {
      if (s.professional_id !== professionalId) continue;
      if (s.is_booked) continue;
      if (s.slot_type !== 'on_site_visit' && s.slot_type !== 'either') continue;
      if (s.start_datetime === scheduledStartDatetime) {
        matchedSlot = s;
        break;
      }
    }

    const scheduled_end = matchedSlot ? matchedSlot.end_datetime : null;

    const visit_request = {
      id: this._generateId('visit_request'),
      professional_id: professionalId,
      scheduled_start: scheduledStartDatetime,
      scheduled_end: scheduled_end,
      budget_min: budgetMin,
      budget_max: budgetMax,
      client_name: clientName,
      client_phone: clientPhone,
      project_address: projectAddress,
      created_at: this._nowISO(),
      status: 'pending'
    };

    visits.push(visit_request);

    if (matchedSlot) {
      const idx = slots.findIndex((s) => s.id === matchedSlot.id);
      if (idx !== -1) {
        slots[idx] = { ...slots[idx], is_booked: true };
      }
      this._saveToStorage('professional_availability_slots', slots);
    }

    this._saveToStorage('visit_requests', visits);

    return {
      success: true,
      visit_request,
      message: 'On-site visit request submitted.'
    };
  }

  // getPortfolioFilterOptions
  getPortfolioFilterOptions() {
    const projects = this._getFromStorage('portfolio_projects');

    const projectTypeEnum = [
      { value: 'office', label: 'Office' },
      { value: 'commercial_offices', label: 'Commercial Offices' },
      { value: 'residential', label: 'Residential' },
      { value: 'retail', label: 'Retail' },
      { value: 'hospitality', label: 'Hospitality' },
      { value: 'mixed_use', label: 'Mixed Use' },
      { value: 'other', label: 'Other' }
    ];

    const sizes = projects.map((p) => p.size_sq_ft || 0);
    const minSize = sizes.length ? Math.min.apply(null, sizes) : 0;
    const maxSize = sizes.length ? Math.max.apply(null, sizes) : 100000;

    const sort_options = [
      { value: 'recent_desc', label: 'Most recent' },
      { value: 'size_asc', label: 'Size (small to large)' },
      { value: 'size_desc', label: 'Size (large to small)' },
      { value: 'title_asc', label: 'Title (A–Z)' }
    ];

    return {
      project_types: projectTypeEnum,
      size_sq_ft_range: {
        min: minSize,
        max: maxSize,
        step: 100
      },
      sort_options
    };
  }

  // searchPortfolioProjects(filters, sort)
  searchPortfolioProjects(filters, sort) {
    const projects = this._getFromStorage('portfolio_projects');
    const f = filters || {};
    const s = sort || {};
    const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : v);

    const filterFn = (p) => {
      if (f.project_type && p.project_type !== f.project_type) return false;
      if (typeof f.min_size_sq_ft === 'number' && (p.size_sq_ft || 0) < f.min_size_sq_ft) return false;
      if (f.location_city && toLower(p.location_city) !== toLower(f.location_city)) return false;
      if (f.location_state && toLower(p.location_state) !== toLower(f.location_state)) return false;
      if (f.location_country && toLower(p.location_country) !== toLower(f.location_country)) return false;
      return true;
    };

    const sortFn = (a, b) => {
      switch (s.sort_by) {
        case 'size_asc':
          return (a.size_sq_ft || 0) - (b.size_sq_ft || 0);
        case 'size_desc':
          return (b.size_sq_ft || 0) - (a.size_sq_ft || 0);
        case 'title_asc':
          return (a.title || '').localeCompare(b.title || '');
        case 'recent_desc':
        default:
          return (this._parseDate(b.completion_date) || 0) - (this._parseDate(a.completion_date) || 0);
      }
    };

    return this._applySearchFiltersAndSorting(projects, filterFn, sortFn, s.page, s.page_size);
  }

  // getPortfolioProjectDetails(projectId)
  getPortfolioProjectDetails(projectId) {
    const project = this._findById('portfolio_projects', projectId);
    return project || null;
  }

  // setPortfolioProjectFavorite(projectId, isFavorite)
  setPortfolioProjectFavorite(projectId, isFavorite) {
    const projects = this._getFromStorage('portfolio_projects');
    const idx = projects.findIndex((p) => p.id === projectId);
    if (idx === -1) {
      return { success: false, project: null, message: 'Project not found.' };
    }
    projects[idx] = { ...projects[idx], is_favorite: !!isFavorite };
    this._saveToStorage('portfolio_projects', projects);
    return { success: true, project: projects[idx], message: 'Favorite status updated.' };
  }

  // getRenovationCalculatorOptions
  getRenovationCalculatorOptions() {
    const room_types = [
      { value: 'bedroom', label: 'Bedroom' },
      { value: 'living_room', label: 'Living Room' },
      { value: 'kitchen', label: 'Kitchen' },
      { value: 'bathroom', label: 'Bathroom' },
      { value: 'dining_room', label: 'Dining Room' },
      { value: 'home_office', label: 'Home Office' },
      { value: 'other', label: 'Other' }
    ];

    const materials_qualities = [
      { value: 'basic', label: 'Basic', cost_multiplier: 1 },
      { value: 'mid_range', label: 'Mid-range', cost_multiplier: 1.3 },
      { value: 'premium', label: 'Premium', cost_multiplier: 1.6 }
    ];

    const optional_features = [
      {
        id: 'lighting_upgrade',
        label: 'Lighting upgrade',
        description: 'New fixtures, switches, and layered lighting plan.'
      },
      {
        id: 'built_in_wardrobe',
        label: 'Built-in wardrobe or custom storage',
        description: 'Custom storage solutions integrated into the design.'
      },
      {
        id: 'flooring_replacement',
        label: 'Flooring replacement',
        description: 'New flooring materials and installation.'
      }
    ];

    return {
      room_types,
      materials_qualities,
      optional_features
    };
  }

  // calculateRenovationEstimate(roomType, roomQuantity, roomAreaSqFt, materialsQuality, includeLightingUpgrade, includeBuiltInWardrobe, includeFlooringReplacement)
  calculateRenovationEstimate(roomType, roomQuantity, roomAreaSqFt, materialsQuality, includeLightingUpgrade, includeBuiltInWardrobe, includeFlooringReplacement) {
    const estimates = this._getFromStorage('renovation_estimates');

    const estimated_cost = this._calculateRenovationEstimateCost(
      roomType,
      roomQuantity,
      roomAreaSqFt,
      materialsQuality,
      includeLightingUpgrade,
      includeBuiltInWardrobe,
      includeFlooringReplacement
    );

    const estimate = {
      id: this._generateId('renovation_estimate'),
      created_at: this._nowISO(),
      room_type: roomType,
      room_quantity: roomQuantity,
      room_area_sq_ft: roomAreaSqFt,
      materials_quality: materialsQuality,
      include_lighting_upgrade: !!includeLightingUpgrade,
      include_built_in_wardrobe: !!includeBuiltInWardrobe,
      include_flooring_replacement: !!includeFlooringReplacement,
      estimated_cost,
      currency: 'usd',
      name: null,
      email: null,
      city: null,
      status: 'calculated'
    };

    estimates.push(estimate);
    this._saveToStorage('renovation_estimates', estimates);

    return estimate;
  }

  // submitRenovationEstimateRequest(estimateId, name, email, city)
  submitRenovationEstimateRequest(estimateId, name, email, city) {
    const estimates = this._getFromStorage('renovation_estimates');
    const idx = estimates.findIndex((e) => e.id === estimateId);
    if (idx === -1) {
      return { success: false, estimate: null, message: 'Estimate not found.' };
    }

    const existing = estimates[idx];
    const updated = {
      ...existing,
      name,
      email,
      city,
      status: 'submitted'
    };

    estimates[idx] = updated;
    this._saveToStorage('renovation_estimates', estimates);

    return { success: true, estimate: updated, message: 'Estimate request submitted.' };
  }

  // getAddOnServiceFilterOptions
  getAddOnServiceFilterOptions() {
    const addOns = this._getFromStorage('add_on_services');
    const categoriesEnum = [
      { value: 'decor_styling_add_ons', label: 'Decor & styling add-ons' },
      { value: 'furniture_add_ons', label: 'Furniture add-ons' },
      { value: 'lighting_add_ons', label: 'Lighting add-ons' },
      { value: 'other_add_ons', label: 'Other add-ons' }
    ];

    const prices = addOns.map((a) => a.price || 0);
    const minPrice = prices.length ? Math.min.apply(null, prices) : 0;
    const maxPrice = prices.length ? Math.max.apply(null, prices) : 1000;

    const rating_thresholds = [3, 3.5, 4, 4.5];

    const sort_options = [
      { value: 'price_asc', label: 'Price (low to high)' },
      { value: 'price_desc', label: 'Price (high to low)' },
      { value: 'rating_desc', label: 'Rating (high to low)' }
    ];

    return {
      categories: categoriesEnum,
      price_range: {
        min: minPrice,
        max: maxPrice,
        step: 5,
        currency: 'usd'
      },
      rating_thresholds,
      sort_options
    };
  }

  // searchAddOnServices(filters, sort)
  searchAddOnServices(filters, sort) {
    const addOns = this._getFromStorage('add_on_services');
    const f = filters || {};
    const s = sort || {};

    const filterFn = (a) => {
      if (f.category && a.category !== f.category) return false;
      if (typeof f.min_price === 'number' && (a.price || 0) < f.min_price) return false;
      if (typeof f.max_price === 'number' && (a.price || 0) > f.max_price) return false;
      if (typeof f.min_rating === 'number' && (a.rating || 0) < f.min_rating) return false;
      if (f.only_active && !a.is_active) return false;
      return true;
    };

    const sortFn = (a, b) => {
      switch (s.sort_by) {
        case 'price_asc':
          return (a.price || 0) - (b.price || 0);
        case 'price_desc':
          return (b.price || 0) - (a.price || 0);
        case 'rating_desc':
        default:
          return (b.rating || 0) - (a.rating || 0);
      }
    };

    return this._applySearchFiltersAndSorting(addOns, filterFn, sortFn, s.page, s.page_size);
  }

  // getAddOnServiceDetails(addOnServiceId)
  getAddOnServiceDetails(addOnServiceId) {
    const svc = this._findById('add_on_services', addOnServiceId);
    return svc || null;
  }

  // addAddOnServiceToBundle(addOnServiceId, quantity)
  addAddOnServiceToBundle(addOnServiceId, quantity) {
    const svc = this._findById('add_on_services', addOnServiceId);
    if (!svc || !svc.is_active) {
      return { success: false, bundle: null, added_item: null, message: 'Add-on service not found or inactive.' };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const bundles = this._getFromStorage('service_bundles');
    const items = this._getFromStorage('service_bundle_items');

    const bundle = this._getOrCreateServiceBundle();

    const newItem = {
      id: this._generateId('service_bundle_item'),
      bundle_id: bundle.id,
      item_type: 'add_on_service',
      item_ref_id: svc.id,
      name_snapshot: svc.name,
      unit_price: svc.price,
      quantity: qty,
      total_price: (svc.price || 0) * qty,
      added_at: this._nowISO()
    };

    items.push(newItem);

    const bIndex = bundles.findIndex((b) => b.id === bundle.id);
    if (bIndex !== -1) {
      const updatedItems = Array.isArray(bundles[bIndex].items) ? bundles[bIndex].items.slice() : [];
      updatedItems.push(newItem.id);
      bundles[bIndex] = { ...bundles[bIndex], items: updatedItems, updated_at: this._nowISO() };
    } else {
      // If the bundle was just created in _getOrCreateServiceBundle, it may not
      // be present in our local array yet. In that case, add it with the new item id.
      const newBundle = { ...bundle, items: [newItem.id], updated_at: this._nowISO() };
      bundles.push(newBundle);
    }

    this._saveToStorage('service_bundle_items', items);
    this._saveToStorage('service_bundles', bundles);

    return {
      success: true,
      bundle: bundles.find((b) => b.id === bundle.id) || bundle,
      added_item: newItem,
      message: 'Add-on service added to bundle.'
    };
  }

  // getActiveServiceBundleSummary
  getActiveServiceBundleSummary() {
    const bundle = this._getActiveServiceBundle();
    if (!bundle) {
      return {
        bundle: null,
        items: [],
        total_price: 0,
        currency: 'usd'
      };
    }

    const items = this._getFromStorage('service_bundle_items').filter((i) => i.bundle_id === bundle.id);
    const addOns = this._getFromStorage('add_on_services');
    const customConfigs = this._getFromStorage('custom_package_configs');
    const designPackages = this._getFromStorage('interior_design_packages');

    const resolvedItems = items.map((item) => {
      let itemRef = null;
      if (item.item_type === 'add_on_service') {
        itemRef = addOns.find((a) => a.id === item.item_ref_id) || null;
      } else if (item.item_type === 'custom_package') {
        itemRef = customConfigs.find((c) => c.id === item.item_ref_id) || null;
      } else if (item.item_type === 'design_package') {
        itemRef = designPackages.find((p) => p.id === item.item_ref_id) || null;
      }
      return {
        ...item,
        bundle,
        item_ref: itemRef
      };
    });

    const total = resolvedItems.reduce((sum, i) => sum + (i.total_price || 0), 0);

    return {
      bundle,
      items: resolvedItems,
      total_price: total,
      currency: 'usd'
    };
  }

  // updateServiceBundleItemQuantity(bundleItemId, quantity)
  updateServiceBundleItemQuantity(bundleItemId, quantity) {
    const items = this._getFromStorage('service_bundle_items');
    const bundles = this._getFromStorage('service_bundles');

    const idx = items.findIndex((i) => i.id === bundleItemId);
    if (idx === -1) {
      return { bundle: null, updated_item: null };
    }

    const existing = items[idx];
    const qty = quantity > 0 ? quantity : 1;
    const updatedItem = {
      ...existing,
      quantity: qty,
      total_price: (existing.unit_price || 0) * qty
    };

    items[idx] = updatedItem;
    this._saveToStorage('service_bundle_items', items);

    const bIndex = bundles.findIndex((b) => b.id === existing.bundle_id);
    if (bIndex !== -1) {
      bundles[bIndex] = { ...bundles[bIndex], updated_at: this._nowISO() };
      this._saveToStorage('service_bundles', bundles);
      return { bundle: bundles[bIndex], updated_item: updatedItem };
    }

    return { bundle: null, updated_item: updatedItem };
  }

  // removeServiceBundleItem(bundleItemId)
  removeServiceBundleItem(bundleItemId) {
    let items = this._getFromStorage('service_bundle_items');
    const bundles = this._getFromStorage('service_bundles');

    const item = items.find((i) => i.id === bundleItemId);
    if (!item) {
      return { bundle: null, success: false, message: 'Item not found.' };
    }

    items = items.filter((i) => i.id !== bundleItemId);
    this._saveToStorage('service_bundle_items', items);

    const bIndex = bundles.findIndex((b) => b.id === item.bundle_id);
    let bundle = null;
    if (bIndex !== -1) {
      const bundleItems = Array.isArray(bundles[bIndex].items) ? bundles[bIndex].items.filter((id) => id !== bundleItemId) : [];
      bundles[bIndex] = { ...bundles[bIndex], items: bundleItems, updated_at: this._nowISO() };
      this._saveToStorage('service_bundles', bundles);
      bundle = bundles[bIndex];
    }

    return { bundle, success: true, message: 'Item removed from bundle.' };
  }

  // getBlogFilterOptions
  getBlogFilterOptions() {
    const now = new Date();
    const last12Months = new Date(now.getTime());
    last12Months.setMonth(last12Months.getMonth() - 12);

    return {
      date_ranges: [
        {
          value: 'last_12_months',
          label: 'Last 12 months',
          from: last12Months.toISOString().slice(0, 10),
          to: now.toISOString().slice(0, 10)
        }
      ]
    };
  }

  // searchBlogArticles(query, filters, sort)
  searchBlogArticles(query, filters, sort) {
    const articles = this._getFromStorage('blog_articles').filter((a) => a.is_published);
    const q = query || '';
    const f = filters || {};
    const s = sort || {};

    const qLower = q.toLowerCase();

    const filterFn = (a) => {
      if (qLower) {
        const inTitle = (a.title || '').toLowerCase().includes(qLower);
        const inContent = (a.content || '').toLowerCase().includes(qLower);
        if (!inTitle && !inContent) return false;
      }
      if (f.published_from) {
        if (this._parseDate(a.published_at) < this._parseDate(f.published_from)) return false;
      }
      if (f.published_to) {
        if (this._parseDate(a.published_at) > this._parseDate(f.published_to)) return false;
      }
      return true;
    };

    const sortFn = (a, b) => {
      switch (s.sort_by) {
        case 'published_asc':
          return this._parseDate(a.published_at) - this._parseDate(b.published_at);
        case 'published_desc':
        case 'relevance':
        default:
          return this._parseDate(b.published_at) - this._parseDate(a.published_at);
      }
    };

    return this._applySearchFiltersAndSorting(articles, filterFn, sortFn, s.page, s.page_size);
  }

  // getBlogArticleDetails(articleId)
  getBlogArticleDetails(articleId) {
    const article = this._findById('blog_articles', articleId);
    return article || null;
  }

  // getProjectInquiryFormOptions(source, sourceArticleId)
  getProjectInquiryFormOptions(source, sourceArticleId) {
    const src = source || 'other';
    const article = sourceArticleId ? this._findById('blog_articles', sourceArticleId) : null;

    const project_types_enum = [
      { value: 'small_apartment_design', label: 'Small apartment design' },
      { value: 'small_space_interior_design', label: 'Small space interior design' },
      { value: 'full_home_interior', label: 'Full home interior' },
      { value: 'commercial_office_design', label: 'Commercial office design' },
      { value: 'architecture_project', label: 'Architecture project' },
      { value: 'other', label: 'Other' }
    ];

    let default_project_type = 'other';
    if (src === 'article_page' && article) {
      const title = (article.title || '').toLowerCase();
      if (title.includes('small apartment')) {
        default_project_type = 'small_apartment_design';
      } else if (title.includes('small space') || title.includes('studio')) {
        default_project_type = 'small_space_interior_design';
      }
    }

    return {
      project_types: project_types_enum,
      default_project_type,
      source: src,
      source_article: article
    };
  }

  // submitProjectInquiry(source, sourceArticleId, projectType, name, email, phone, approxSizeSqFt, message)
  submitProjectInquiry(source, sourceArticleId, projectType, name, email, phone, approxSizeSqFt, message) {
    const inquiries = this._getFromStorage('project_inquiries');

    const inquiry = {
      id: this._generateId('project_inquiry'),
      created_at: this._nowISO(),
      source: source || 'other',
      source_article_id: sourceArticleId || null,
      project_type: projectType,
      name,
      email,
      phone: phone || null,
      approx_size_sq_ft: typeof approxSizeSqFt === 'number' ? approxSizeSqFt : null,
      message: message || null,
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('project_inquiries', inquiries);

    return {
      success: true,
      inquiry,
      message: 'Project inquiry submitted.'
    };
  }

  // getStyleQuizQuestions
  getStyleQuizQuestions() {
    const questions = this._getFromStorage('style_quiz_questions').filter((q) => q.is_active);
    const options = this._getFromStorage('style_quiz_options');

    const sortedQuestions = questions.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

    const resolvedQuestions = sortedQuestions.map((q) => {
      let qOptions = options
        .filter((o) => o.question_id === q.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
      // Fallback: if no separate options are stored, use the embedded options on the question
      if (!qOptions.length && Array.isArray(q.options)) {
        qOptions = q.options;
      }
      return {
        ...q,
        options: qOptions
      };
    });

    return { questions: resolvedQuestions };
  }

  // submitStyleQuizAnswers(answers)
  submitStyleQuizAnswers(answers) {
    const opts = this._getFromStorage('style_quiz_options');
    const styleScores = {
      modern: 0,
      scandinavian: 0,
      industrial: 0,
      minimalist: 0,
      contemporary: 0,
      traditional: 0,
      bohemian: 0,
      eclectic: 0,
      mid_century_modern: 0
    };

    if (Array.isArray(answers)) {
      for (const ans of answers) {
        const option = opts.find((o) => o.id === ans.optionId);
        if (!option || !option.associated_style) continue;
        const style = option.associated_style;
        const score = typeof option.score === 'number' ? option.score : 1;
        if (styleScores.hasOwnProperty(style)) {
          styleScores[style] += score;
        }
      }
    }

    // Determine primary and secondary styles
    const styleEntries = Object.entries(styleScores).filter(([, v]) => v > 0);
    if (!styleEntries.length) {
      // Fallback: choose modern as default
      styleEntries.push(['modern', 1]);
    }

    styleEntries.sort((a, b) => b[1] - a[1]);

    const primary_style = styleEntries[0][0];
    const secondary_styles = styleEntries.slice(1).map((e) => e[0]);

    const explanation = 'Based on your selections, your primary style is ' + primary_style.replace(/_/g, ' ') + '.';

    const results = this._getFromStorage('style_quiz_results');

    const result = {
      id: this._generateId('style_quiz_result'),
      created_at: this._nowISO(),
      answers: Array.isArray(answers) ? answers : [],
      primary_style,
      secondary_styles,
      explanation
    };

    results.push(result);
    this._saveToStorage('style_quiz_results', results);

    return {
      success: true,
      result,
      message: 'Style quiz result computed.'
    };
  }

  // getStyleQuizResult(resultId)
  getStyleQuizResult(resultId) {
    const results = this._getFromStorage('style_quiz_results');
    return results.find((r) => r.id === resultId) || null;
  }

  // saveStyleRecommendation(styleQuizResultId, name, email)
  saveStyleRecommendation(styleQuizResultId, name, email) {
    const results = this._getFromStorage('style_quiz_results');
    const res = results.find((r) => r.id === styleQuizResultId);
    if (!res) {
      return { success: false, saved_recommendation: null, message: 'Style quiz result not found.' };
    }

    const saved = this._getFromStorage('saved_style_recommendations');

    const recommendation = {
      id: this._generateId('saved_style_recommendation'),
      style_quiz_result_id: styleQuizResultId,
      style: res.primary_style,
      name,
      email,
      created_at: this._nowISO()
    };

    saved.push(recommendation);
    this._saveToStorage('saved_style_recommendations', saved);

    return {
      success: true,
      saved_recommendation: recommendation,
      message: 'Style recommendation saved.'
    };
  }

  // getCustomPackageBuilderOptions
  getCustomPackageBuilderOptions() {
    const room_types = [
      { value: 'bedroom', label: 'Bedroom' },
      { value: 'living_room', label: 'Living Room' },
      { value: 'kitchen', label: 'Kitchen' },
      { value: 'bathroom', label: 'Bathroom' },
      { value: 'dining_room', label: 'Dining Room' },
      { value: 'home_office', label: 'Home Office' },
      { value: 'other', label: 'Other' }
    ];

    const design_styles = [
      'modern',
      'scandinavian',
      'industrial',
      'minimalist',
      'contemporary',
      'traditional',
      'bohemian',
      'eclectic',
      'mid_century_modern'
    ].map((s) => ({ value: s, label: s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) }));

    const timeline_options = [
      { value: 'standard', label: 'Standard timeline' },
      { value: 'express', label: 'Express timeline' }
    ];

    const payment_plans = [
      { value: 'monthly', label: 'Monthly payments' },
      { value: 'one_time', label: 'One-time payment' }
    ];

    const service_levels = [
      {
        value: 'basic',
        label: 'Basic',
        description: 'Concept layout and mood board.'
      },
      {
        value: 'standard',
        label: 'Standard',
        description: 'Layout, finishes, and simple styling guidance.'
      },
      {
        value: 'full_service',
        label: 'Full service',
        description: 'Turnkey design with sourcing support.'
      },
      {
        value: 'premium',
        label: 'Premium',
        description: 'Full service with extended revisions and priority support.'
      }
    ];

    return {
      room_types,
      design_styles,
      timeline_options,
      payment_plans,
      service_levels
    };
  }

  // configureCustomPackage(designStyle, timelineOption, paymentPlan, rooms)
  configureCustomPackage(designStyle, timelineOption, paymentPlan, rooms) {
    const configs = this._getFromStorage('custom_package_configs');
    const roomEntities = this._getFromStorage('custom_package_rooms');

    const roomsArray = Array.isArray(rooms) ? rooms : [];
    const pricing = this._calculateCustomPackagePricing(designStyle, timelineOption, paymentPlan, roomsArray);

    const configId = this._generateId('custom_package_config');

    const config = {
      id: configId,
      design_style: designStyle,
      timeline_option: timelineOption,
      payment_plan: paymentPlan,
      rooms: [],
      base_price: pricing.base_price,
      total_price: pricing.total_price,
      currency: 'usd',
      created_at: this._nowISO(),
      is_added_to_bundle: false
    };

    const newRoomIds = [];

    for (const r of pricing.room_pricing) {
      const matchingInput = roomsArray.find((ri) => ri.room_type === r.room_type && ri.service_level === r.service_level && ri.quantity === r.quantity) || {};
      const roomEntity = {
        id: this._generateId('custom_package_room'),
        package_config_id: configId,
        room_type: r.room_type,
        quantity: r.quantity,
        service_level: r.service_level,
        base_price_per_room: r.base_price_per_room,
        total_price: r.total_price
      };
      newRoomIds.push(roomEntity.id);
      roomEntities.push(roomEntity);
    }

    config.rooms = newRoomIds;

    configs.push(config);

    this._saveToStorage('custom_package_configs', configs);
    this._saveToStorage('custom_package_rooms', roomEntities);

    return config;
  }

  // addCustomPackageToBundle(customPackageConfigId)
  addCustomPackageToBundle(customPackageConfigId) {
    const configs = this._getFromStorage('custom_package_configs');
    const configIdx = configs.findIndex((c) => c.id === customPackageConfigId);
    if (configIdx === -1) {
      return { success: false, bundle: null, added_item: null, message: 'Custom package configuration not found.' };
    }

    const config = configs[configIdx];

    const bundles = this._getFromStorage('service_bundles');
    const items = this._getFromStorage('service_bundle_items');

    const bundle = this._getOrCreateServiceBundle();

    const nameSnapshot = 'Custom package - ' + (config.design_style || 'design');

    const newItem = {
      id: this._generateId('service_bundle_item'),
      bundle_id: bundle.id,
      item_type: 'custom_package',
      item_ref_id: config.id,
      name_snapshot: nameSnapshot,
      unit_price: config.total_price,
      quantity: 1,
      total_price: config.total_price,
      added_at: this._nowISO()
    };

    items.push(newItem);

    const bIndex = bundles.findIndex((b) => b.id === bundle.id);
    if (bIndex !== -1) {
      const updatedItems = Array.isArray(bundles[bIndex].items) ? bundles[bIndex].items.slice() : [];
      updatedItems.push(newItem.id);
      bundles[bIndex] = { ...bundles[bIndex], items: updatedItems, updated_at: this._nowISO() };
    } else {
      // Handle case where bundle was created in _getOrCreateServiceBundle but is
      // not yet present in this local bundles array.
      const newBundle = { ...bundle, items: [newItem.id], updated_at: this._nowISO() };
      bundles.push(newBundle);
    }

    configs[configIdx] = { ...config, is_added_to_bundle: true };

    this._saveToStorage('service_bundle_items', items);
    this._saveToStorage('service_bundles', bundles);
    this._saveToStorage('custom_package_configs', configs);

    return {
      success: true,
      bundle: bundles.find((b) => b.id === bundle.id) || bundle,
      added_item: newItem,
      message: 'Custom package added to bundle.'
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return {
      mission: 'We create thoughtful architecture and interiors that maximize space, light, and comfort for homes and workplaces.',
      background: 'Our studio brings together architects and interior designers with experience across residential, commercial office, and hospitality projects.',
      approach: 'We combine strategic planning, 3D visualization, and meticulous detailing to deliver spaces that feel both beautiful and practical.',
      contact_email: 'hello@example-architecture.com',
      contact_phone: '+1 (000) 000-0000',
      contact_address: '123 Design Street, Sample City'
    };
  }

  // getAboutPageTeamHighlights
  getAboutPageTeamHighlights() {
    const pros = this._getFromStorage('professionals').filter((p) => p.is_active);
    const team_members = pros
      .slice()
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);

    return { team_members };
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
