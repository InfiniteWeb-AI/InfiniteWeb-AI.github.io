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

  // ---------------------- Storage & ID Helpers ----------------------

  _initStorage() {
    // Generic helper to init any key with default value
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Legacy/example keys from skeleton (kept for compatibility)
    ensure('users', []);
    ensure('products', []); // used by Product entity
    ensure('carts', []); // legacy, not used in new logic
    ensure('cartItems', []); // legacy, not used in new logic

    // ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }

    // Domain-specific storage tables (all as arrays)
    ensure('interior_estimates', []);
    ensure('interior_estimate_rooms', []);
    ensure('interior_quote_requests', []);

    ensure('exterior_estimates', []);
    ensure('residential_exterior_quote_requests', []);
    ensure('add_on_options', []);

    ensure('interior_packages', []);
    ensure('package_bookings', []);

    ensure('projects', []);
    ensure('favorite_projects', []);

    ensure('articles', []);
    ensure('reading_list_items', []);

    ensure('maintenance_plans', []);
    ensure('maintenance_plan_inquiries', []);

    ensure('availability_slots', []);
    ensure('appointments', []);

    ensure('quote_cart', []); // array of QuoteCart, single-user but kept as array
    ensure('quote_cart_items', []);
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
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

  _nowISO() {
    return new Date().toISOString();
  }

  _formatCurrencyUSD(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
    return '$' + amount.toFixed(2);
  }

  // ---------------------- Interior Estimate Helpers ----------------------

  _getOrCreateInteriorEstimateSession() {
    const estimates = this._getFromStorage('interior_estimates');
    let estimate = null;

    if (estimates.length > 0) {
      // Use the most recently created as the current session
      estimate = estimates[estimates.length - 1];
    }

    if (!estimate) {
      estimate = {
        id: this._generateId('int_est'),
        created_at: this._nowISO(),
        updated_at: null,
        total_sq_ft: 0,
        prep_level: 'standard',
        eco_paint_selected: false,
        estimated_total: 0,
        currency: 'usd',
        room_ids: []
      };
      estimates.push(estimate);
      this._saveToStorage('interior_estimates', estimates);
    }

    return estimate;
  }

  _recalculateInteriorEstimateTotals(estimate, roomsForEstimate) {
    const estimates = this._getFromStorage('interior_estimates');

    // Compute total square footage
    const totalSqFt = roomsForEstimate.reduce((sum, room) => sum + (room.area_sq_ft || 0), 0);

    // Base rate per sq ft depending on surfaces
    const surfaceRate = (room) => {
      switch (room.surfaces) {
        case 'walls_and_ceiling':
          return 2.5;
        case 'walls_ceiling_and_trim':
          return 3.0;
        case 'walls_only':
        default:
          return 2.0;
      }
    };

    let baseLaborMaterials = 0;
    for (const room of roomsForEstimate) {
      baseLaborMaterials += (room.area_sq_ft || 0) * surfaceRate(room);
    }

    // Prep level multiplier
    let prepMultiplier = 1.0;
    if (estimate.prep_level === 'standard') prepMultiplier = 1.1;
    else if (estimate.prep_level === 'extensive') prepMultiplier = 1.3;

    baseLaborMaterials *= prepMultiplier;

    // Eco paint surcharge (e.g., +15%)
    let ecoSurcharge = 0;
    if (estimate.eco_paint_selected) {
      ecoSurcharge = baseLaborMaterials * 0.15;
    }

    const estimatedTotal = baseLaborMaterials + ecoSurcharge;

    // Update estimate record
    const updatedEstimate = {
      ...estimate,
      total_sq_ft: totalSqFt,
      estimated_total: estimatedTotal,
      updated_at: this._nowISO(),
      currency: 'usd'
    };

    const idx = estimates.findIndex((e) => e.id === estimate.id);
    if (idx !== -1) {
      estimates[idx] = updatedEstimate;
      this._saveToStorage('interior_estimates', estimates);
    }

    return {
      estimate: updatedEstimate,
      pricing_summary: {
        base_labor_materials: Number(baseLaborMaterials.toFixed(2)),
        eco_paint_surcharge: Number(ecoSurcharge.toFixed(2)),
        estimated_total: Number(estimatedTotal.toFixed(2)),
        estimated_total_display: this._formatCurrencyUSD(estimatedTotal)
      }
    };
  }

  // ---------------------- Exterior Estimate Helpers ----------------------

  _getOrCreateExteriorEstimateSession() {
    const estimates = this._getFromStorage('exterior_estimates');
    let estimate = null;

    if (estimates.length > 0) {
      estimate = estimates[estimates.length - 1];
    }

    if (!estimate) {
      estimate = {
        id: this._generateId('ext_est'),
        created_at: this._nowISO(),
        house_type: 'two_story_house',
        exterior_area_sq_ft: 0,
        condition: 'good',
        selected_add_on_ids: [],
        base_price: 0,
        add_ons_price: 0,
        total_price: 0,
        currency: 'usd'
      };
      estimates.push(estimate);
      this._saveToStorage('exterior_estimates', estimates);
    }

    return estimate;
  }

  _recalculateExteriorEstimateTotals(estimate) {
    const estimates = this._getFromStorage('exterior_estimates');
    const addOns = this._getFromStorage('add_on_options');

    // Base rate per sq ft by house type
    let ratePerSqFt = 2.0;
    if (estimate.house_type === 'two_story_house') ratePerSqFt = 2.5;
    else if (estimate.house_type === 'three_story_house' || estimate.house_type === 'multi_unit_building') ratePerSqFt = 3.0;
    else if (estimate.house_type === 'townhouse') ratePerSqFt = 2.2;

    // Condition multiplier
    let conditionMultiplier = 1.0;
    if (estimate.condition === 'fair') conditionMultiplier = 1.15;
    else if (estimate.condition === 'poor') conditionMultiplier = 1.3;

    const basePrice = (estimate.exterior_area_sq_ft || 0) * ratePerSqFt * conditionMultiplier;

    // Add-ons
    let addOnsPrice = 0;
    const selectedAddOnIds = Array.isArray(estimate.selected_add_on_ids) ? estimate.selected_add_on_ids : [];
    const selectedAddOns = addOns.filter((a) => selectedAddOnIds.includes(a.id));

    for (const addOn of selectedAddOns) {
      if (!addOn.is_active) continue;
      if (addOn.applicable_service_category !== 'residential_exterior') continue;
      if (addOn.price_type === 'per_sq_ft') {
        addOnsPrice += (estimate.exterior_area_sq_ft || 0) * addOn.price_amount;
      } else if (addOn.price_type === 'flat_fee') {
        addOnsPrice += addOn.price_amount;
      }
    }

    const totalPrice = basePrice + addOnsPrice;

    const updatedEstimate = {
      ...estimate,
      base_price: Number(basePrice.toFixed(2)),
      add_ons_price: Number(addOnsPrice.toFixed(2)),
      total_price: Number(totalPrice.toFixed(2)),
      currency: 'usd'
    };

    const idx = estimates.findIndex((e) => e.id === estimate.id);
    if (idx !== -1) {
      estimates[idx] = updatedEstimate;
      this._saveToStorage('exterior_estimates', estimates);
    }

    return {
      estimate: updatedEstimate,
      pricing_summary: {
        base_price: updatedEstimate.base_price,
        add_ons_price: updatedEstimate.add_ons_price,
        total_price: updatedEstimate.total_price,
        total_price_display: this._formatCurrencyUSD(totalPrice)
      }
    };
  }

  // ---------------------- Quote Cart Helpers ----------------------

  _getOrCreateQuoteCart() {
    const carts = this._getFromStorage('quote_cart');
    let cart = carts.find((c) => c.status === 'open');

    if (!cart) {
      cart = {
        id: this._generateId('qcart'),
        created_at: this._nowISO(),
        updated_at: null,
        status: 'open',
        item_ids: []
      };
      carts.push(cart);
      this._saveToStorage('quote_cart', carts);
    }

    return cart;
  }

  // ---------------------- Favorites & Reading List Helpers ----------------------

  _getCurrentFavoritesList() {
    return this._getFromStorage('favorite_projects');
  }

  _getCurrentReadingList() {
    return this._getFromStorage('reading_list_items');
  }

  // ---------------------- Availability Helpers ----------------------

  _searchAvailabilitySlotsInternal(params) {
    const {
      service_category,
      appointment_type,
      property_type,
      from_date,
      to_date,
      min_start_time,
      max_start_time,
      only_weekdays
    } = params;

    const slots = this._getFromStorage('availability_slots');

    const fromDate = new Date(from_date + 'T00:00:00Z');
    const toDate = new Date(to_date + 'T23:59:59Z');

    const parseTime = (t) => {
      if (!t) return null;
      const [h, m] = t.split(':').map((x) => parseInt(x, 10));
      return { h, m };
    };

    const minTime = parseTime(min_start_time);
    const maxTime = parseTime(max_start_time);

    const result = slots.filter((slot) => {
      if (slot.is_booked) return false;
      if (slot.service_category !== service_category) return false;
      if (slot.appointment_type !== appointment_type) return false;
      if (property_type && slot.property_type && slot.property_type !== property_type) return false;

      const start = new Date(slot.start_datetime);
      if (isNaN(start.getTime())) return false;
      if (start < fromDate || start > toDate) return false;

      if (only_weekdays) {
        const day = start.getDay(); // 0=Sun,1=Mon,...
        if (day === 0 || day === 6) return false;
      }

      if (minTime || maxTime) {
        const h = start.getUTCHours();
        const m = start.getUTCMinutes();
        if (minTime) {
          if (h < minTime.h || (h === minTime.h && m < minTime.m)) {
            return false;
          }
        }
        if (maxTime) {
          if (h > maxTime.h || (h === maxTime.h && m > maxTime.m)) {
            return false;
          }
        }
      }

      return true;
    });

    // Sort by start_datetime ascending for deterministic earliest selection
    result.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    return result;
  }

  // ---------------------- Homepage ----------------------

  getHomepageContent() {
    const projects = this._getFromStorage('projects');
    const articles = this._getFromStorage('articles');

    const featuredProjects = projects.filter((p) => p.featured === true);

    const publishedArticles = articles.filter((a) => a.status === 'published');
    publishedArticles.sort((a, b) => new Date(b.publish_date) - new Date(a.publish_date));
    const featuredArticles = publishedArticles.slice(0, 3);

    return {
      hero: {
        headline: 'Trusted Residential & Commercial Painting Services',
        subheadline: 'Eco-friendly options, detailed prep, and professional crews for homes and businesses.',
        primary_cta_label: 'Get a Residential Quote',
        primary_cta_action_key: 'start_residential_quote',
        secondary_cta_label: 'Book Commercial Consultation',
        secondary_cta_action_key: 'book_commercial_consultation'
      },
      residential_highlight: {
        title: 'Residential Painting',
        summary: 'Interior and exterior painting for homes, condos, and apartments with flexible scheduling.',
        cta_label: 'Explore Residential Services',
        cta_action_key: 'view_residential_services'
      },
      commercial_highlight: {
        title: 'Commercial Painting',
        summary: 'Exterior, interior, and maintenance plans tailored to offices, retail, and more.',
        cta_label: 'Explore Commercial Services',
        cta_action_key: 'view_commercial_services'
      },
      featured_projects: featuredProjects,
      featured_articles: featuredArticles
    };
  }

  // ---------------------- Residential Services Overview ----------------------

  getResidentialServicesOverview() {
    return {
      services: [
        {
          service_key: 'interior_painting',
          title: 'Interior Painting',
          description: 'Rooms, hallways, ceilings, and trim with low-odor paints and careful prep.',
          starting_price_display: 'Starting at $2.00/sq ft',
          primary_cta_label: 'Get Interior Estimate',
          primary_cta_action_key: 'start_interior_estimate'
        },
        {
          service_key: 'exterior_painting',
          title: 'Exterior Painting',
          description: 'Durable exterior coatings for 1–3 story homes including trim and accents.',
          starting_price_display: 'Starting at $2.50/sq ft',
          primary_cta_label: 'Get Exterior Estimate',
          primary_cta_action_key: 'start_exterior_estimate'
        },
        {
          service_key: 'interior_packages',
          title: 'Interior Packages',
          description: 'Standard and Premium packages bundling walls, ceilings, and trim for popular layouts.',
          starting_price_display: 'Packages from $1,200',
          primary_cta_label: 'View Interior Packages',
          primary_cta_action_key: 'view_interior_packages'
        }
      ]
    };
  }

  // ---------------------- Residential Interior Page ----------------------

  getResidentialInteriorPageContent() {
    return {
      intro_title: 'Residential Interior Painting',
      intro_body: 'Refresh your living spaces with professional interior painting. We handle surface prep, minor repairs, and clean finishes using premium paints.',
      typical_pricing_summary: 'Most interior projects range from $2.00–$3.00 per sq ft depending on prep level, number of colors, and whether ceilings and trim are included.',
      prep_level_options: [
        {
          value: 'basic',
          label: 'Basic Prep',
          description: 'Light cleaning and minimal patching for newer, well-maintained walls.'
        },
        {
          value: 'standard',
          label: 'Standard Prep',
          description: 'Includes patching nail holes, light sanding, and caulking as needed.'
        },
        {
          value: 'extensive',
          label: 'Extensive Prep',
          description: 'Heavier repair work, multiple patching areas, and intensive sanding or skim-coating.'
        }
      ],
      eco_paint_info: 'Eco-friendly, low- and zero-VOC paint options are available for most projects with a modest surcharge.',
      priority_service_info: 'Priority interior service offers faster scheduling and extended evening hours for apartments and small homes.'
    };
  }

  // ---------------------- Interior Estimate Interfaces ----------------------

  getCurrentInteriorEstimate() {
    const estimate = this._getOrCreateInteriorEstimateSession();
    const allRooms = this._getFromStorage('interior_estimate_rooms');
    const rooms = allRooms.filter((r) => r.estimate_id === estimate.id);

    const { estimate: updatedEstimate, pricing_summary } = this._recalculateInteriorEstimateTotals(estimate, rooms);

    return {
      estimate: updatedEstimate,
      rooms,
      pricing_summary
    };
  }

  upsertInteriorEstimateRoom(room) {
    if (!room || typeof room !== 'object') {
      throw new Error('room parameter is required and must be an object');
    }

    const estimate = this._getOrCreateInteriorEstimateSession();
    const allRooms = this._getFromStorage('interior_estimate_rooms');

    let updatedRooms = allRooms.filter((r) => r.estimate_id === estimate.id);

    if (room.id) {
      // Update existing
      const index = allRooms.findIndex((r) => r.id === room.id && r.estimate_id === estimate.id);
      if (index !== -1) {
        const existing = allRooms[index];
        const updated = {
          ...existing,
          name: room.name,
          area_sq_ft: room.area_sq_ft,
          surfaces: room.surfaces,
          notes: room.notes || existing.notes || ''
        };
        allRooms[index] = updated;
      }
    } else {
      // Create new room
      const newRoom = {
        id: this._generateId('int_room'),
        estimate_id: estimate.id,
        name: room.name,
        area_sq_ft: room.area_sq_ft,
        surfaces: room.surfaces,
        notes: room.notes || ''
      };
      allRooms.push(newRoom);

      // Update estimate.room_ids
      const estimates = this._getFromStorage('interior_estimates');
      const idx = estimates.findIndex((e) => e.id === estimate.id);
      if (idx !== -1) {
        const roomIds = Array.isArray(estimates[idx].room_ids) ? estimates[idx].room_ids.slice() : [];
        roomIds.push(newRoom.id);
        estimates[idx] = { ...estimates[idx], room_ids: roomIds, updated_at: this._nowISO() };
        this._saveToStorage('interior_estimates', estimates);
      }
    }

    this._saveToStorage('interior_estimate_rooms', allRooms);

    const refreshedRooms = allRooms.filter((r) => r.estimate_id === estimate.id);
    const { estimate: updatedEstimate, pricing_summary } = this._recalculateInteriorEstimateTotals(estimate, refreshedRooms);

    return {
      estimate: updatedEstimate,
      rooms: refreshedRooms,
      pricing_summary: {
        estimated_total: pricing_summary.estimated_total,
        estimated_total_display: pricing_summary.estimated_total_display
      }
    };
  }

  removeInteriorEstimateRoom(roomId) {
    const estimate = this._getOrCreateInteriorEstimateSession();
    let allRooms = this._getFromStorage('interior_estimate_rooms');

    const beforeLength = allRooms.length;
    allRooms = allRooms.filter((r) => !(r.id === roomId && r.estimate_id === estimate.id));

    if (allRooms.length !== beforeLength) {
      this._saveToStorage('interior_estimate_rooms', allRooms);

      // Update estimate.room_ids
      const estimates = this._getFromStorage('interior_estimates');
      const idx = estimates.findIndex((e) => e.id === estimate.id);
      if (idx !== -1) {
        const roomIds = Array.isArray(estimates[idx].room_ids) ? estimates[idx].room_ids.filter((id) => id !== roomId) : [];
        estimates[idx] = { ...estimates[idx], room_ids: roomIds, updated_at: this._nowISO() };
        this._saveToStorage('interior_estimates', estimates);
      }
    }

    const refreshedRooms = allRooms.filter((r) => r.estimate_id === estimate.id);
    const { estimate: updatedEstimate, pricing_summary } = this._recalculateInteriorEstimateTotals(estimate, refreshedRooms);

    return {
      estimate: updatedEstimate,
      rooms: refreshedRooms,
      pricing_summary: {
        estimated_total: pricing_summary.estimated_total,
        estimated_total_display: pricing_summary.estimated_total_display
      }
    };
  }

  setInteriorEstimateOptions(prep_level, eco_paint_selected) {
    const estimate = this._getOrCreateInteriorEstimateSession();
    const estimates = this._getFromStorage('interior_estimates');

    const idx = estimates.findIndex((e) => e.id === estimate.id);
    if (idx === -1) {
      throw new Error('Current interior estimate not found');
    }

    const updated = { ...estimates[idx] };

    if (typeof prep_level === 'string') {
      // Only accept allowed enum values
      if (['standard', 'basic', 'extensive'].includes(prep_level)) {
        updated.prep_level = prep_level;
      }
    }

    if (typeof eco_paint_selected === 'boolean') {
      updated.eco_paint_selected = eco_paint_selected;
    }

    updated.updated_at = this._nowISO();

    estimates[idx] = updated;
    this._saveToStorage('interior_estimates', estimates);

    const allRooms = this._getFromStorage('interior_estimate_rooms');
    const rooms = allRooms.filter((r) => r.estimate_id === updated.id);

    const { estimate: finalEstimate, pricing_summary } = this._recalculateInteriorEstimateTotals(updated, rooms);

    return {
      estimate: finalEstimate,
      rooms,
      pricing_summary
    };
  }

  submitInteriorQuoteRequest(customer_name, email, phone, zip_code) {
    const estimate = this._getOrCreateInteriorEstimateSession();
    const quoteRequests = this._getFromStorage('interior_quote_requests');

    const newRequest = {
      id: this._generateId('int_quote'),
      interior_estimate_id: estimate.id,
      customer_name,
      email,
      phone,
      zip_code,
      created_at: this._nowISO(),
      status: 'submitted'
    };

    quoteRequests.push(newRequest);
    this._saveToStorage('interior_quote_requests', quoteRequests);

    return {
      quote_request: newRequest,
      estimate,
      message: 'Interior quote request submitted.'
    };
  }

  // ---------------------- Residential Exterior Page ----------------------

  getResidentialExteriorPageContent() {
    const addOns = this._getFromStorage('add_on_options');
    const extAddOns = addOns.filter(
      (a) => a.applicable_service_category === 'residential_exterior' && a.is_active
    );

    return {
      intro_title: 'Residential Exterior Painting',
      intro_body: 'Protect and refresh your home with high-quality exterior paints and thorough surface preparation.',
      house_type_options: [
        { value: 'one_story_house', label: '1-Story House' },
        { value: 'two_story_house', label: '2-Story House' },
        { value: 'three_story_house', label: '3-Story House' },
        { value: 'townhouse', label: 'Townhouse' },
        { value: 'multi_unit_building', label: 'Multi-unit Building' },
        { value: 'other', label: 'Other' }
      ],
      condition_options: [
        { value: 'good', label: 'Good' },
        { value: 'fair', label: 'Fair' },
        { value: 'poor', label: 'Poor' }
      ],
      add_on_descriptions: extAddOns
    };
  }

  // ---------------------- Exterior Estimate Interfaces ----------------------

  getCurrentExteriorEstimate() {
    const estimate = this._getOrCreateExteriorEstimateSession();
    const addOns = this._getFromStorage('add_on_options');
    const selectedAddOns = addOns.filter((a) => (estimate.selected_add_on_ids || []).includes(a.id));

    const { estimate: updatedEstimate, pricing_summary } = this._recalculateExteriorEstimateTotals(estimate);

    return {
      estimate: updatedEstimate,
      selected_add_ons: selectedAddOns,
      pricing_summary
    };
  }

  setExteriorEstimateDetails(house_type, exterior_area_sq_ft, condition) {
    const estimate = this._getOrCreateExteriorEstimateSession();
    const estimates = this._getFromStorage('exterior_estimates');
    const idx = estimates.findIndex((e) => e.id === estimate.id);
    if (idx === -1) throw new Error('Current exterior estimate not found');

    const updated = { ...estimates[idx] };

    if (typeof house_type === 'string') {
      const allowed = [
        'one_story_house',
        'two_story_house',
        'three_story_house',
        'townhouse',
        'multi_unit_building',
        'other'
      ];
      if (allowed.includes(house_type)) {
        updated.house_type = house_type;
      }
    }

    if (typeof exterior_area_sq_ft === 'number' && !isNaN(exterior_area_sq_ft)) {
      updated.exterior_area_sq_ft = exterior_area_sq_ft;
    }

    if (typeof condition === 'string') {
      const allowedCond = ['good', 'fair', 'poor'];
      if (allowedCond.includes(condition)) {
        updated.condition = condition;
      }
    }

    estimates[idx] = updated;
    this._saveToStorage('exterior_estimates', estimates);

    const { estimate: finalEstimate, pricing_summary } = this._recalculateExteriorEstimateTotals(updated);

    return {
      estimate: finalEstimate,
      pricing_summary: {
        base_price: pricing_summary.base_price,
        base_price_display: this._formatCurrencyUSD(pricing_summary.base_price),
        total_price: pricing_summary.total_price,
        total_price_display: pricing_summary.total_price_display
      }
    };
  }

  setExteriorEstimateAddOns(add_on_codes) {
    if (!Array.isArray(add_on_codes)) {
      throw new Error('add_on_codes must be an array');
    }

    const estimate = this._getOrCreateExteriorEstimateSession();
    const estimates = this._getFromStorage('exterior_estimates');
    const allAddOns = this._getFromStorage('add_on_options');

    const selectedAddOns = allAddOns.filter(
      (a) =>
        add_on_codes.includes(a.code) &&
        a.is_active &&
        a.applicable_service_category === 'residential_exterior'
    );

    const selectedIds = selectedAddOns.map((a) => a.id);

    const idx = estimates.findIndex((e) => e.id === estimate.id);
    if (idx === -1) throw new Error('Current exterior estimate not found');

    const updated = {
      ...estimates[idx],
      selected_add_on_ids: selectedIds
    };

    estimates[idx] = updated;
    this._saveToStorage('exterior_estimates', estimates);

    const { estimate: finalEstimate, pricing_summary } = this._recalculateExteriorEstimateTotals(updated);

    return {
      estimate: finalEstimate,
      selected_add_ons: selectedAddOns,
      pricing_summary: {
        add_ons_price: pricing_summary.add_ons_price,
        add_ons_price_display: this._formatCurrencyUSD(pricing_summary.add_ons_price),
        total_price: pricing_summary.total_price,
        total_price_display: pricing_summary.total_price_display
      }
    };
  }

  submitResidentialExteriorQuoteRequest(customer_name, email, phone, zip_code) {
    const estimate = this._getOrCreateExteriorEstimateSession();
    const requests = this._getFromStorage('residential_exterior_quote_requests');

    const newRequest = {
      id: this._generateId('ext_quote'),
      exterior_estimate_id: estimate.id,
      customer_name,
      email,
      phone,
      zip_code,
      created_at: this._nowISO(),
      status: 'submitted'
    };

    requests.push(newRequest);
    this._saveToStorage('residential_exterior_quote_requests', requests);

    return {
      quote_request: newRequest,
      estimate,
      message: 'Exterior quote request submitted.'
    };
  }

  // ---------------------- Residential Interior Packages ----------------------

  getResidentialInteriorPackagesList() {
    const packages = this._getFromStorage('interior_packages');
    const active = packages.filter((p) => p.status === 'active');

    active.sort((a, b) => {
      const ao = typeof a.display_order === 'number' ? a.display_order : 0;
      const bo = typeof b.display_order === 'number' ? b.display_order : 0;
      if (ao !== bo) return ao - bo;
      return (a.base_price || 0) - (b.base_price || 0);
    });

    const wrapped = active.map((p) => ({
      package: p,
      includes_ceiling_painting: !!p.includes_ceiling_painting,
      includes_trim_painting: !!p.includes_trim_painting,
      base_price_display: this._formatCurrencyUSD(p.base_price || 0)
    }));

    return { packages: wrapped };
  }

  getInteriorPackageDetail(packageSlug) {
    const packages = this._getFromStorage('interior_packages');
    const pkg = packages.find((p) => p.slug === packageSlug);

    if (!pkg) {
      return {
        package: null,
        features_display: [],
        includes_ceiling_painting: false,
        base_price_display: this._formatCurrencyUSD(0)
      };
    }

    const featuresDisplay = Array.isArray(pkg.features) ? pkg.features.slice() : [];

    return {
      package: pkg,
      features_display: featuresDisplay,
      includes_ceiling_painting: !!pkg.includes_ceiling_painting,
      base_price_display: this._formatCurrencyUSD(pkg.base_price || 0)
    };
  }

  startPackageBooking(packageSlug, customer_name, email, phone, zip_code) {
    const packages = this._getFromStorage('interior_packages');
    const pkg = packages.find((p) => p.slug === packageSlug);

    if (!pkg) {
      return {
        booking: null,
        package: null,
        message: 'Package not found.'
      };
    }

    const bookings = this._getFromStorage('package_bookings');

    const booking = {
      id: this._generateId('pkg_book'),
      package_id: pkg.id,
      customer_name,
      email,
      phone,
      zip_code,
      created_at: this._nowISO(),
      status: 'started'
    };

    bookings.push(booking);
    this._saveToStorage('package_bookings', bookings);

    return {
      booking,
      package: pkg,
      message: 'Package booking started.'
    };
  }

  // ---------------------- Commercial Services Overview ----------------------

  getCommercialServicesOverview() {
    return {
      intro_title: 'Commercial Painting Services',
      intro_body: 'Exterior and interior painting, scheduled maintenance, and flexible crews for offices, retail, and more.',
      service_cards: [
        {
          service_key: 'commercial_exterior',
          title: 'Commercial Exterior Painting',
          description: 'Long-lasting exterior finishes for offices, retail centers, and other commercial buildings.',
          cta_label: 'Book Exterior Consultation',
          cta_action_key: 'book_commercial_exterior_consultation'
        },
        {
          service_key: 'commercial_interior',
          title: 'Commercial Interior Painting',
          description: 'Low-disruption interior painting for offices, lobbies, corridors, and more.',
          cta_label: 'Request Interior Quote',
          cta_action_key: 'request_commercial_interior_quote'
        },
        {
          service_key: 'maintenance_plans',
          title: 'Maintenance Plans',
          description: 'Ongoing painting and touch-up plans with extended warranties for commercial properties.',
          cta_label: 'Explore Maintenance Plans',
          cta_action_key: 'view_maintenance_plans'
        }
      ]
    };
  }

  getCommercialExteriorPageContent() {
    return {
      intro_title: 'Commercial Exterior Painting',
      intro_body: 'Boost curb appeal and protect your property with durable exterior coatings designed for commercial buildings.',
      service_scope: 'We service offices, retail, mixed-use, and light industrial exteriors, including trim, doors, and railings.',
      property_type_options: [
        { value: 'office', label: 'Office' },
        { value: 'retail', label: 'Retail' },
        { value: 'restaurant', label: 'Restaurant' },
        { value: 'warehouse', label: 'Warehouse' },
        { value: 'mixed_use', label: 'Mixed Use' },
        { value: 'other', label: 'Other' }
      ],
      consultation_service_types: [
        {
          value: 'on_site_exterior_painting_consultation',
          label: 'On-site Exterior Painting Consultation'
        }
      ]
    };
  }

  // ---------------------- Commercial Maintenance Plans ----------------------

  getCommercialMaintenancePlanFilterOptions() {
    return {
      property_type_options: [
        { value: 'retail', label: 'Retail' },
        { value: 'office', label: 'Office' },
        { value: 'restaurant', label: 'Restaurant' },
        { value: 'warehouse', label: 'Warehouse' },
        { value: 'mixed_use', label: 'Mixed Use' },
        { value: 'other', label: 'Other' }
      ],
      visit_frequency_options: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'quarterly', label: 'Quarterly' },
        { value: 'biannually', label: 'Biannually' },
        { value: 'annually', label: 'Annually' }
      ],
      sort_options: [
        { value: 'warranty_desc', label: 'Warranty (Longest First)' },
        { value: 'price_asc', label: 'Price (Low to High)' },
        { value: 'price_desc', label: 'Price (High to Low)' }
      ]
    };
  }

  searchMaintenancePlans(property_type, min_sq_ft, max_sq_ft, max_monthly_price, sort_by) {
    const plans = this._getFromStorage('maintenance_plans').filter((p) => p.status === 'active');

    let filtered = plans.slice();

    if (property_type) {
      filtered = filtered.filter((p) => p.property_type === property_type);
    }

    if (typeof min_sq_ft === 'number' && !isNaN(min_sq_ft)) {
      filtered = filtered.filter((p) => {
        if (typeof p.max_sq_ft === 'number') {
          return p.max_sq_ft >= min_sq_ft;
        }
        return true;
      });
    }

    if (typeof max_sq_ft === 'number' && !isNaN(max_sq_ft)) {
      filtered = filtered.filter((p) => {
        if (typeof p.min_sq_ft === 'number') {
          return p.min_sq_ft <= max_sq_ft;
        }
        return true;
      });
    }

    if (typeof max_monthly_price === 'number' && !isNaN(max_monthly_price)) {
      filtered = filtered.filter((p) => (p.monthly_price || 0) <= max_monthly_price);
    }

    if (sort_by === 'warranty_desc') {
      filtered.sort((a, b) => (b.warranty_months || 0) - (a.warranty_months || 0));
    } else if (sort_by === 'price_asc') {
      filtered.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
    } else if (sort_by === 'price_desc') {
      filtered.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
    }

    return {
      plans: filtered,
      total_count: filtered.length
    };
  }

  getMaintenancePlanDetail(planId) {
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find((p) => p.id === planId) || null;

    if (!plan) {
      return {
        plan: null,
        warranty_display: '',
        monthly_price_display: this._formatCurrencyUSD(0)
      };
    }

    const years = plan.warranty_months / 12;
    const warrantyDisplay = plan.warranty_months
      ? `${plan.warranty_months} months${years >= 1 ? ' (' + years.toFixed(1) + ' years)' : ''}`
      : '';

    return {
      plan,
      warranty_display: warrantyDisplay,
      monthly_price_display: this._formatCurrencyUSD(plan.monthly_price || 0)
    };
  }

  submitMaintenancePlanInquiry(planId, business_name, contact_name, email, phone) {
    const plans = this._getFromStorage('maintenance_plans');
    const plan = plans.find((p) => p.id === planId) || null;

    const inquiries = this._getFromStorage('maintenance_plan_inquiries');

    const inquiry = {
      id: this._generateId('mp_inq'),
      plan_id: planId,
      business_name,
      contact_name: contact_name || '',
      email,
      phone,
      created_at: this._nowISO(),
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('maintenance_plan_inquiries', inquiries);

    return {
      inquiry,
      plan,
      message: 'Maintenance plan inquiry submitted.'
    };
  }

  // ---------------------- Projects & Favorites ----------------------

  getProjectFilterOptions() {
    return {
      property_type_options: [
        { value: 'single_family_home', label: 'Single-family Home' },
        { value: 'apartment_condo', label: 'Apartment / Condo' },
        { value: 'office', label: 'Office' },
        { value: 'retail', label: 'Retail' },
        { value: 'industrial', label: 'Industrial' },
        { value: 'other', label: 'Other' }
      ],
      service_type_options: [
        { value: 'interior', label: 'Interior' },
        { value: 'exterior', label: 'Exterior' },
        { value: 'interior_exterior', label: 'Interior & Exterior' }
      ],
      radius_options_miles: [5, 10, 20, 50]
    };
  }

  searchProjects(property_type, service_type, segment, zip_code, radius_miles, completed_after, page, page_size) {
    const projects = this._getFromStorage('projects');

    let filtered = projects.slice();

    if (property_type) {
      filtered = filtered.filter((p) => p.property_type === property_type);
    }

    if (service_type) {
      filtered = filtered.filter((p) => p.service_type === service_type);
    }

    if (segment) {
      filtered = filtered.filter((p) => p.segment === segment);
    }

    if (zip_code) {
      // If radius_miles is provided and we have coordinates, approximate distance by lat/long
      if (typeof radius_miles === 'number' && radius_miles > 0) {
        const origin = projects.find(
          (p) =>
            p.zip_code === zip_code &&
            typeof p.latitude === 'number' &&
            typeof p.longitude === 'number'
        );

        if (origin) {
          const toRad = (deg) => (deg * Math.PI) / 180;
          const R = 3958.8; // Earth radius in miles

          filtered = filtered.filter((p) => {
            if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number') return false;
            const dLat = toRad(p.latitude - origin.latitude);
            const dLon = toRad(p.longitude - origin.longitude);
            const lat1 = toRad(origin.latitude);
            const lat2 = toRad(p.latitude);
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;
            return distance <= radius_miles;
          });
        } else {
          // Fallback: filter by exact ZIP if we cannot determine an origin point
          filtered = filtered.filter((p) => p.zip_code === zip_code);
        }
      } else {
        // No radius requested: filter by exact ZIP
        filtered = filtered.filter((p) => p.zip_code === zip_code);
      }
    }

    if (completed_after) {
      const afterDate = new Date(completed_after);
      filtered = filtered.filter((p) => new Date(p.completion_date) >= afterDate);
    }

    // Sort by completion_date desc for recency
    filtered.sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date));

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;

    const paged = filtered.slice(start, end);

    return {
      projects: paged,
      total_count: filtered.length,
      page: pg,
      page_size: ps
    };
  }

  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects');
    const favorites = this._getFromStorage('favorite_projects');

    const project = projects.find((p) => p.id === projectId) || null;
    const is_favorited = favorites.some((f) => f.project_id === projectId);

    return {
      project,
      is_favorited
    };
  }

  addProjectToFavorites(projectId) {
    const projects = this._getFromStorage('projects');
    const project = projects.find((p) => p.id === projectId) || null;

    const favorites = this._getFromStorage('favorite_projects');
    let favorite = favorites.find((f) => f.project_id === projectId);

    if (!favorite) {
      favorite = {
        id: this._generateId('fav_proj'),
        project_id: projectId,
        added_at: this._nowISO()
      };
      favorites.push(favorite);
      this._saveToStorage('favorite_projects', favorites);
    }

    return {
      favorite,
      project,
      is_favorited: true,
      message: 'Project added to favorites.'
    };
  }

  removeProjectFromFavorites(projectId) {
    let favorites = this._getFromStorage('favorite_projects');
    const before = favorites.length;

    favorites = favorites.filter((f) => f.project_id !== projectId);
    const removed = favorites.length !== before;

    if (removed) {
      this._saveToStorage('favorite_projects', favorites);
    }

    return {
      removed,
      message: removed ? 'Project removed from favorites.' : 'Project not found in favorites.'
    };
  }

  getFavoriteProjects() {
    const favorites = this._getFromStorage('favorite_projects');
    const projects = this._getFromStorage('projects');

    const items = favorites
      .slice()
      .sort((a, b) => new Date(b.added_at) - new Date(a.added_at))
      .map((fav) => ({
        favorite: fav,
        project: projects.find((p) => p.id === fav.project_id) || null
      }));

    return { favorites: items };
  }

  // ---------------------- Blog & Reading List ----------------------

  getBlogFilterOptions() {
    const articles = this._getFromStorage('articles');

    const categoriesSet = new Set();
    const tagsSet = new Set();

    for (const a of articles) {
      if (a.category) categoriesSet.add(a.category);
      if (Array.isArray(a.tags)) {
        for (const t of a.tags) {
          tagsSet.add(t);
        }
      }
    }

    return {
      categories: Array.from(categoriesSet),
      tag_suggestions: Array.from(tagsSet),
      default_date_range_years: 2
    };
  }

  searchArticles(query, published_after, published_before, category, tags, page, page_size) {
    const articles = this._getFromStorage('articles').filter((a) => a.status === 'published');

    let filtered = articles.slice();

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      filtered = filtered.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const excerpt = (a.excerpt || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        return title.includes(q) || excerpt.includes(q) || content.includes(q);
      });
    }

    if (published_after) {
      const after = new Date(published_after);
      filtered = filtered.filter((a) => new Date(a.publish_date) >= after);
    }

    if (published_before) {
      const before = new Date(published_before);
      filtered = filtered.filter((a) => new Date(a.publish_date) <= before);
    }

    if (category) {
      filtered = filtered.filter((a) => a.category === category);
    }

    if (Array.isArray(tags) && tags.length > 0) {
      filtered = filtered.filter((a) => {
        if (!Array.isArray(a.tags)) return false;
        // Require all requested tags to be present
        return tags.every((t) => a.tags.includes(t));
      });
    }

    // Sort by publish_date desc
    filtered.sort((a, b) => new Date(b.publish_date) - new Date(a.publish_date));

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const paged = filtered.slice(start, end);

    return {
      articles: paged,
      total_count: filtered.length,
      page: pg,
      page_size: ps
    };
  }

  getArticleDetail(articleSlug) {
    const articles = this._getFromStorage('articles');
    const readingList = this._getFromStorage('reading_list_items');

    const article = articles.find((a) => a.slug === articleSlug) || null;
    const is_in_reading_list = article
      ? readingList.some((item) => item.article_id === article.id)
      : false;

    return {
      article,
      is_in_reading_list
    };
  }

  addArticleToReadingList(articleSlug) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.slug === articleSlug) || null;

    if (!article) {
      return {
        item: null,
        article: null,
        is_in_reading_list: false,
        message: 'Article not found.'
      };
    }

    const readingList = this._getFromStorage('reading_list_items');
    let item = readingList.find((i) => i.article_id === article.id);

    if (!item) {
      item = {
        id: this._generateId('rl_item'),
        article_id: article.id,
        added_at: this._nowISO()
      };
      readingList.push(item);
      this._saveToStorage('reading_list_items', readingList);
    }

    return {
      item,
      article,
      is_in_reading_list: true,
      message: 'Article added to reading list.'
    };
  }

  removeArticleFromReadingList(articleSlug) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.slug === articleSlug) || null;

    if (!article) {
      return {
        removed: false,
        message: 'Article not found.'
      };
    }

    let readingList = this._getFromStorage('reading_list_items');
    const before = readingList.length;

    readingList = readingList.filter((i) => i.article_id !== article.id);
    const removed = readingList.length !== before;

    if (removed) {
      this._saveToStorage('reading_list_items', readingList);
    }

    return {
      removed,
      message: removed ? 'Article removed from reading list.' : 'Article not in reading list.'
    };
  }

  getReadingList() {
    const readingList = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    const items = readingList
      .slice()
      .sort((a, b) => new Date(b.added_at) - new Date(a.added_at))
      .map((item) => ({
        item,
        article: articles.find((a) => a.id === item.article_id) || null
      }));

    return { items };
  }

  // ---------------------- Products & Quote Cart ----------------------

  getProductFilterOptions() {
    return {
      category_options: [
        { value: 'interior_paint', label: 'Interior Paint' },
        { value: 'exterior_paint', label: 'Exterior Paint' },
        { value: 'primer', label: 'Primer' },
        { value: 'stain', label: 'Stain' },
        { value: 'tools_supplies', label: 'Tools & Supplies' },
        { value: 'other', label: 'Other' }
      ],
      finish_options: [
        { value: 'eggshell', label: 'Eggshell' },
        { value: 'matte', label: 'Matte' },
        { value: 'flat', label: 'Flat' },
        { value: 'satin', label: 'Satin' },
        { value: 'semi_gloss', label: 'Semi-gloss' },
        { value: 'gloss', label: 'Gloss' },
        { value: 'high_gloss', label: 'High Gloss' }
      ],
      voc_level_options: [
        { value: 'zero_voc', label: 'Zero-VOC' },
        { value: 'low_voc', label: 'Low-VOC' },
        { value: 'standard_voc', label: 'Standard VOC' }
      ],
      sort_options: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'price_asc', label: 'Price (Low to High)' },
        { value: 'price_desc', label: 'Price (High to Low)' }
      ]
    };
  }

  searchProducts(category, finish, voc_level, min_price, max_price, application_area, sort_by, page, page_size) {
    const products = this._getFromStorage('products').filter((p) => p.is_active);

    let filtered = products.slice();

    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }

    if (finish) {
      filtered = filtered.filter((p) => p.finish === finish);
    }

    if (voc_level) {
      filtered = filtered.filter((p) => p.voc_level === voc_level);
    }

    if (application_area) {
      filtered = filtered.filter((p) => p.application_area === application_area);
    }

    if (typeof min_price === 'number' && !isNaN(min_price)) {
      filtered = filtered.filter((p) => (p.price_per_gallon || 0) >= min_price);
    }

    if (typeof max_price === 'number' && !isNaN(max_price)) {
      filtered = filtered.filter((p) => (p.price_per_gallon || 0) <= max_price);
    }

    if (sort_by === 'price_asc') {
      filtered.sort((a, b) => (a.price_per_gallon || 0) - (b.price_per_gallon || 0));
    } else if (sort_by === 'price_desc') {
      filtered.sort((a, b) => (b.price_per_gallon || 0) - (a.price_per_gallon || 0));
    } // 'relevance' leaves as-is

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const paged = filtered.slice(start, end);

    return {
      products: paged,
      total_count: filtered.length,
      page: pg,
      page_size: ps
    };
  }

  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;

    const price = product ? product.price_per_gallon || 0 : 0;
    const price_display = this._formatCurrencyUSD(price) + (product ? ` per ${product.unit}` : '');

    return {
      product,
      price_display
    };
  }

  addProductToQuoteCart(productId, quantity, unit, selected_color) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      return {
        cart: null,
        items: [],
        added_item: null,
        success: false,
        message: 'Product not found.'
      };
    }

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateQuoteCart();

    const allItems = this._getFromStorage('quote_cart_items');

    const itemUnit = unit || product.unit;
    const unitPrice = product.price_per_gallon || 0;
    const totalPrice = unitPrice * qty;

    const newItem = {
      id: this._generateId('qitem'),
      cart_id: cart.id,
      product_id: productId,
      quantity: qty,
      unit: itemUnit,
      selected_color: selected_color || product.default_color || null,
      unit_price: unitPrice,
      total_price: Number(totalPrice.toFixed(2)),
      added_at: this._nowISO()
    };

    allItems.push(newItem);
    this._saveToStorage('quote_cart_items', allItems);

    // Update cart item_ids and updated_at
    const carts = this._getFromStorage('quote_cart');
    const cidx = carts.findIndex((c) => c.id === cart.id);
    if (cidx !== -1) {
      const ids = Array.isArray(carts[cidx].item_ids) ? carts[cidx].item_ids.slice() : [];
      ids.push(newItem.id);
      carts[cidx] = {
        ...carts[cidx],
        item_ids: ids,
        updated_at: this._nowISO()
      };
      this._saveToStorage('quote_cart', carts);
    }

    const itemsForCart = allItems.filter((i) => i.cart_id === cart.id);
    const itemsWithProduct = itemsForCart.map((i) => ({
      ...i,
      product: products.find((p) => p.id === i.product_id) || null
    }));

    const added_item = {
      ...newItem,
      product
    };

    return {
      cart: carts[cidx] || cart,
      items: itemsWithProduct,
      added_item,
      success: true,
      message: 'Product added to quote cart.'
    };
  }

  getQuoteCartSummary() {
    const carts = this._getFromStorage('quote_cart');
    const products = this._getFromStorage('products');
    const allItems = this._getFromStorage('quote_cart_items');

    const cart = carts.find((c) => c.status === 'open') || null;

    if (!cart) {
      return {
        cart: null,
        items: [],
        total_items: 0,
        total_price: 0,
        total_price_display: this._formatCurrencyUSD(0)
      };
    }

    const itemsForCart = allItems.filter((i) => i.cart_id === cart.id);

    const itemsWithProduct = itemsForCart.map((i) => ({
      ...i,
      product: products.find((p) => p.id === i.product_id) || null
    }));

    const total_items = itemsForCart.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const total_price = itemsForCart.reduce((sum, i) => sum + (i.total_price || 0), 0);

    return {
      cart,
      items: itemsWithProduct,
      total_items,
      total_price: Number(total_price.toFixed(2)),
      total_price_display: this._formatCurrencyUSD(total_price)
    };
  }

  clearQuoteCart() {
    const carts = this._getFromStorage('quote_cart');
    const allItems = this._getFromStorage('quote_cart_items');

    const cart = carts.find((c) => c.status === 'open') || null;

    if (!cart) {
      return {
        cleared: false,
        message: 'No open quote cart to clear.'
      };
    }

    const remainingItems = allItems.filter((i) => i.cart_id !== cart.id);
    this._saveToStorage('quote_cart_items', remainingItems);

    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = {
        ...carts[idx],
        item_ids: [],
        status: 'cleared',
        updated_at: this._nowISO()
      };
      this._saveToStorage('quote_cart', carts);
    }

    return {
      cleared: true,
      message: 'Quote cart cleared.'
    };
  }

  // ---------------------- Availability & Appointments ----------------------

  searchAvailabilitySlots(
    service_category,
    appointment_type,
    property_type,
    zip_code,
    from_date,
    to_date,
    min_start_time,
    max_start_time,
    only_weekdays
  ) {
    // zip_code parameter is accepted but AvailabilitySlot has no ZIP field; ignored in filtering
    const slots = this._searchAvailabilitySlotsInternal({
      service_category,
      appointment_type,
      property_type,
      from_date,
      to_date,
      min_start_time,
      max_start_time,
      only_weekdays
    });

    return { slots };
  }

  bookAppointment(
    slotId,
    service_category,
    appointment_type,
    property_type,
    business_name,
    contact_name,
    email,
    phone,
    address,
    zip_code,
    preferred_communication_method,
    property_size_type,
    property_size_value
  ) {
    const slots = this._getFromStorage('availability_slots');
    const slotIndex = slots.findIndex((s) => s.id === slotId);

    if (slotIndex === -1) {
      return {
        appointment: null,
        slot: null,
        success: false,
        message: 'Slot not found.'
      };
    }

    const slot = slots[slotIndex];
    if (slot.is_booked) {
      return {
        appointment: null,
        slot,
        success: false,
        message: 'Slot already booked.'
      };
    }

    const appointments = this._getFromStorage('appointments');

    const appointment = {
      id: this._generateId('appt'),
      slot_id: slotId,
      service_category,
      appointment_type,
      property_type: property_type || null,
      business_name: business_name || null,
      contact_name,
      email,
      phone,
      address: address || null,
      zip_code: zip_code || null,
      preferred_communication_method: preferred_communication_method || null,
      property_size_type: property_size_type || null,
      property_size_value: typeof property_size_value === 'number' ? property_size_value : null,
      status: 'pending',
      created_at: this._nowISO()
    };

    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    // Mark slot as booked
    slots[slotIndex] = {
      ...slot,
      is_booked: true
    };
    this._saveToStorage('availability_slots', slots);

    return {
      appointment,
      slot: slots[slotIndex],
      success: true,
      message: 'Appointment booked.'
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
