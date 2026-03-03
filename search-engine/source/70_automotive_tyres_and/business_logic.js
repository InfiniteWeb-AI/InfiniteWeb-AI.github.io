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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all entity tables
    const arrayKeys = [
      'tyre_products',
      'brands',
      'carts',
      'cart_items',
      'branches',
      'service_categories',
      'services',
      'vehicle_profiles',
      'service_bookings',
      'fitting_appointments',
      'promo_codes',
      'time_slots',
      'tyre_comparison_sets',
      'contact_form_submissions'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
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

  _now() {
    return new Date().toISOString();
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getActiveCart() {
    const carts = this._getFromStorage('carts');
    return carts.length > 0 ? carts[0] : null;
  }

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let cart = carts.length > 0 ? carts[0] : null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        cart_item_ids: [],
        total_items: 0,
        subtotal: 0,
        currency: 'usd',
        has_fitting_appointments: false,
        has_service_bookings: false,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    if (!cart) return;
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter(function (ci) {
      return ci.cart_id === cart.id;
    });

    let totalItems = 0;
    let subtotal = 0;
    let hasFittingAppointments = false;

    for (let i = 0; i < itemsForCart.length; i++) {
      const item = itemsForCart[i];
      totalItems += item.quantity || 0;
      subtotal += (item.quantity || 0) * (item.price_per_tyre || 0);
      if (item.fitting_status === 'booked' && item.fitting_appointment_id) {
        hasFittingAppointments = true;
      }
    }

    cart.total_items = totalItems;
    cart.subtotal = subtotal;
    cart.currency = 'usd';
    cart.has_fitting_appointments = hasFittingAppointments;

    // Determine if there are any service bookings in this context
    const serviceBookings = this._getFromStorage('service_bookings');
    cart.has_service_bookings = serviceBookings.some(function (b) {
      return b.status === 'pending' || b.status === 'confirmed';
    });

    cart.updated_at = this._now();

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(function (c) {
      return c.id === cart.id;
    });
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }
  }

  // ----------------------
  // Branch / distance helper
  // ----------------------

  _findNearestBranchesByZip(zipCode, predicate) {
    let branches = this._getFromStorage('branches');
    branches = branches.filter(function (b) {
      return b.is_active !== false; // treat undefined as active
    });

    if (typeof predicate === 'function') {
      branches = branches.filter(predicate);
    }

    const results = branches.map(function (b) {
      const distance = b.zip_code === zipCode ? 0 : 50; // naive placeholder distance
      return {
        branch: b,
        distance_miles: distance
      };
    });

    results.sort(function (a, b) {
      return a.distance_miles - b.distance_miles;
    });

    return results;
  }

  // ----------------------
  // Time slot helpers
  // ----------------------

  _filterAndSortTimeSlots(slots, options) {
    options = options || {};
    const date = options.date;
    const slotType = options.slot_type;
    const timeWindowFilter = options.timeWindowFilter;
    const branchId = options.branchId;
    const serviceId = options.serviceId;

    let filtered = slots.filter(function (s) {
      return s.is_available !== false; // treat undefined as available
    });

    if (slotType) {
      filtered = filtered.filter(function (s) {
        return s.slot_type === slotType;
      });
    }

    if (branchId !== undefined && branchId !== null) {
      filtered = filtered.filter(function (s) {
        return s.branch_id === branchId;
      });
    }

    if (serviceId !== undefined && serviceId !== null) {
      filtered = filtered.filter(function (s) {
        return s.service_id === serviceId;
      });
    }

    if (date) {
      filtered = filtered.filter(function (s) {
        const d = typeof s.slot_date === 'string'
          ? s.slot_date.split('T')[0]
          : new Date(s.slot_date).toISOString().split('T')[0];
        return d === date;
      });
    }

    if (timeWindowFilter) {
      const from = timeWindowFilter.start_time_from || timeWindowFilter.earliest_start_time;
      const to = timeWindowFilter.start_time_to || timeWindowFilter.latest_start_time;
      filtered = filtered.filter(function (s) {
        const start = s.start_time;
        if (from && start < from) return false;
        if (to && start > to) return false;
        return true;
      });
    }

    filtered.sort(function (a, b) {
      const dateA = new Date(a.slot_date).getTime();
      const dateB = new Date(b.slot_date).getTime();
      if (dateA !== dateB) return dateA - dateB;
      if (a.start_time < b.start_time) return -1;
      if (a.start_time > b.start_time) return 1;
      return 0;
    });

    return filtered;
  }

  // ----------------------
  // Promo helper
  // ----------------------

  _applyPromoCodeToAmount(promoCode, options) {
    options = options || {};
    const amount = typeof options.amount === 'number' ? options.amount : 0;

    const result = {
      is_valid: false,
      promo: null,
      discount_amount: 0,
      discounted_total: amount,
      message: ''
    };

    if (!promoCode) {
      result.message = 'No promo code provided';
      return result;
    }

    const promos = this._getFromStorage('promo_codes');
    const promo = promos.find(function (p) {
      return p.code && p.code.toLowerCase() === String(promoCode).toLowerCase() && p.is_active !== false;
    });

    if (!promo) {
      result.message = 'Promo code not found or inactive';
      return result;
    }

    const now = new Date();
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      result.message = 'Promo code not yet valid';
      return result;
    }
    if (promo.valid_to && new Date(promo.valid_to) < now) {
      result.message = 'Promo code has expired';
      return result;
    }

    const scope = promo.applicable_scope; // 'tyre_purchase','service_booking','mobile_service_only','all'
    const mode = options.mode; // 'in_center' or 'mobile'
    const logicalScope = options.scope; // e.g., 'service_booking' or 'tyre_purchase'
    const serviceId = options.serviceId;

    let scopeOk = false;
    if (scope === 'all') {
      scopeOk = true;
    } else if (scope === 'service_booking') {
      scopeOk = logicalScope === 'service_booking';
    } else if (scope === 'mobile_service_only') {
      scopeOk = mode === 'mobile';
    } else if (scope === 'tyre_purchase') {
      scopeOk = logicalScope === 'tyre_purchase';
    }

    if (!scopeOk) {
      result.message = 'Promo code not applicable for this purchase';
      return result;
    }

    if (promo.applicable_service_ids && promo.applicable_service_ids.length && serviceId) {
      if (promo.applicable_service_ids.indexOf(serviceId) === -1) {
        result.message = 'Promo code not valid for this service';
        return result;
      }
    }

    if (promo.min_spend && amount < promo.min_spend) {
      result.message = 'Minimum spend not reached for this promo code';
      return result;
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = amount * (promo.discount_value / 100);
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    }

    if (discount < 0) discount = 0;
    if (discount > amount) discount = amount;

    result.is_valid = true;
    result.promo = promo;
    result.discount_amount = discount;
    result.discounted_total = amount - discount;
    result.message = 'Promo code applied successfully';
    return result;
  }

  // ----------------------
  // Next available date helper
  // ----------------------

  _getNextAvailableDateMatchingCriteria(options) {
    options = options || {};
    const serviceCode = options.serviceCode;
    const mode = options.mode;
    const branchId = options.branchId;
    const maxDays = typeof options.maxDays === 'number' ? options.maxDays : 14;
    const weekday = typeof options.weekday === 'number' ? options.weekday : null;
    const timeWindowFilter = options.timeWindowFilter;
    const startDate = options.startDate ? new Date(options.startDate) : new Date();

    const services = this._getFromStorage('services');
    const service = services.find(function (s) {
      return s.code === serviceCode;
    });
    if (!service) return null;

    const allSlots = this._getFromStorage('time_slots');
    const serviceId = service.id;

    const slots = allSlots.filter(function (s) {
      if (s.is_available === false) return false;
      if (s.slot_type !== 'service_booking') return false;
      if (s.service_id !== serviceId) return false;
      if (mode === 'in_center' && branchId && s.branch_id !== branchId) return false;
      if (mode === 'mobile' && branchId && s.branch_id && s.branch_id !== branchId) return false;
      return true;
    });

    const filtered = slots.filter(function (s) {
      const slotDate = new Date(s.slot_date);
      if (slotDate < startDate) return false;
      const diffDays = (slotDate - startDate) / (1000 * 60 * 60 * 24);
      if (diffDays > maxDays) return false;
      if (weekday !== null && slotDate.getDay() !== weekday) return false;
      if (timeWindowFilter) {
        const from = timeWindowFilter.earliest_start_time;
        const to = timeWindowFilter.latest_start_time;
        const st = s.start_time;
        if (from && st < from) return false;
        if (to && st > to) return false;
      }
      return true;
    });

    if (!filtered.length) return null;
    filtered.sort(function (a, b) {
      return new Date(a.slot_date) - new Date(b.slot_date);
    });
    const first = filtered[0];
    const dateStr = typeof first.slot_date === 'string'
      ? first.slot_date.split('T')[0]
      : new Date(first.slot_date).toISOString().split('T')[0];
    return dateStr;
  }

  // ----------------------
  // Tyre-related interfaces
  // ----------------------

  // getTyreSizeOptions()
  getTyreSizeOptions() {
    const tyres = this._getFromStorage('tyre_products');
    const widthsSet = new Set();
    const profilesSet = new Set();
    const rimsSet = new Set();

    for (let i = 0; i < tyres.length; i++) {
      const t = tyres[i];
      if (typeof t.width === 'number') widthsSet.add(t.width);
      if (typeof t.profile === 'number') profilesSet.add(t.profile);
      if (typeof t.rim_diameter === 'number') rimsSet.add(t.rim_diameter);
    }

    const widths = Array.from(widthsSet).sort(function (a, b) { return a - b; });
    const profiles = Array.from(profilesSet).sort(function (a, b) { return a - b; });
    const rim_diameters = Array.from(rimsSet).sort(function (a, b) { return a - b; });

    return { widths: widths, profiles: profiles, rim_diameters: rim_diameters };
  }

  // getTyreQuickCategories()
  getTyreQuickCategories() {
    const tyres = this._getFromStorage('tyre_products');
    const seasonSet = new Set();
    let hasPerformance = false;

    for (let i = 0; i < tyres.length; i++) {
      const t = tyres[i];
      if (t.season) {
        seasonSet.add(t.season);
      }
      if (t.performance_category === 'performance' || t.performance_category === 'sport') {
        hasPerformance = true;
      }
    }

    const categories = [];

    seasonSet.forEach(function (season) {
      let label = '';
      if (season === 'winter') label = 'Winter Tyres';
      else if (season === 'summer') label = 'Summer Tyres';
      else if (season === 'all_season') label = 'All-Season Tyres';
      categories.push({
        code: season,
        label: label || season,
        description: '',
        season: season,
        performance_category: null
      });
    });

    if (hasPerformance) {
      categories.push({
        code: 'performance',
        label: 'Performance Tyres',
        description: '',
        season: null,
        performance_category: 'performance'
      });
    }

    return categories;
  }

  // getFeaturedServices()
  getFeaturedServices() {
    const services = this._getFromStorage('services');
    return services.filter(function (s) {
      return s.is_active !== false;
    });
  }

  // getActivePromotions()
  getActivePromotions() {
    const promos = this._getFromStorage('promo_codes');
    const tyres = this._getFromStorage('tyre_products');
    const now = new Date();

    const activePromos = promos.filter(function (p) {
      if (p.is_active === false) return false;
      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_to && new Date(p.valid_to) < now) return false;
      return true;
    });

    let featuredTyres = tyres.filter(function (t) {
      return t.is_available !== false && t.has_free_fitting === true;
    });

    featuredTyres.sort(function (a, b) {
      const ra = typeof a.customer_rating === 'number' ? a.customer_rating : 0;
      const rb = typeof b.customer_rating === 'number' ? b.customer_rating : 0;
      return rb - ra;
    });

    if (featuredTyres.length > 10) {
      featuredTyres = featuredTyres.slice(0, 10);
    }

    return {
      promo_codes: activePromos,
      featured_tyre_products: featuredTyres
    };
  }

  // getTyreFilterOptions(width, profile, rim_diameter)
  getTyreFilterOptions(width, profile, rim_diameter) {
    let tyres = this._getFromStorage('tyre_products').filter(function (t) {
      return t.is_available !== false;
    });

    if (typeof width === 'number') {
      tyres = tyres.filter(function (t) { return t.width === width; });
    }
    if (typeof profile === 'number') {
      tyres = tyres.filter(function (t) { return t.profile === profile; });
    }
    if (typeof rim_diameter === 'number') {
      tyres = tyres.filter(function (t) { return t.rim_diameter === rim_diameter; });
    }

    const seasonsSet = new Set();
    const perfSet = new Set();
    const speedSet = new Set();
    const brandTierSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    for (let i = 0; i < tyres.length; i++) {
      const t = tyres[i];
      if (t.season) seasonsSet.add(t.season);
      if (t.performance_category) perfSet.add(t.performance_category);
      if (t.speed_rating) speedSet.add(t.speed_rating);
      if (t.brand_tier) brandTierSet.add(t.brand_tier);
      if (typeof t.price_per_tyre === 'number') {
        if (minPrice === null || t.price_per_tyre < minPrice) minPrice = t.price_per_tyre;
        if (maxPrice === null || t.price_per_tyre > maxPrice) maxPrice = t.price_per_tyre;
      }
    }

    const seasons = Array.from(seasonsSet);
    const performance_categories = Array.from(perfSet);
    const speed_ratings = Array.from(speedSet);
    const brand_tiers = Array.from(brandTierSet);

    const benefits = [];
    const hasFreeFitting = tyres.some(function (t) { return t.has_free_fitting === true; });
    if (hasFreeFitting) {
      benefits.push({ code: 'free_fitting', label: 'Free fitting' });
    }

    const customer_rating_thresholds = [3, 4, 4.5];

    const price_range_suggestion = {
      min_price: minPrice || 0,
      max_price: maxPrice || 0,
      currency: 'usd'
    };

    const sort_options = [
      { code: 'customer_rating_desc', label: 'Customer Rating: High to Low' },
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'noise_asc', label: 'Noise: Low to High' }
    ];

    return {
      seasons: seasons,
      performance_categories: performance_categories,
      speed_ratings: speed_ratings,
      brand_tiers: brand_tiers,
      benefits: benefits,
      customer_rating_thresholds: customer_rating_thresholds,
      price_range_suggestion: price_range_suggestion,
      sort_options: sort_options
    };
  }

  // searchTyresBySizeAndFilters(width, profile, rim_diameter, filters, sort, page, page_size)
  searchTyresBySizeAndFilters(width, profile, rim_diameter, filters, sort, page, page_size) {
    filters = filters || {};
    const tyresAll = this._getFromStorage('tyre_products');
    const brandsAll = this._getFromStorage('brands');

    const speedOrder = ['q', 'r', 's', 't', 'h', 'v', 'w', 'y', 'zr'];

    let tyres = tyresAll.filter(function (t) {
      if (t.width !== width) return false;
      if (t.profile !== profile) return false;
      if (t.rim_diameter !== rim_diameter) return false;
      return true;
    });

    if (filters.season) {
      tyres = tyres.filter(function (t) { return t.season === filters.season; });
    }
    if (filters.performance_category) {
      tyres = tyres.filter(function (t) { return t.performance_category === filters.performance_category; });
    }
    if (filters.brand_tier) {
      tyres = tyres.filter(function (t) { return t.brand_tier === filters.brand_tier; });
    }
    if (filters.has_free_fitting === true) {
      tyres = tyres.filter(function (t) { return t.has_free_fitting === true; });
    }
    if (typeof filters.min_price === 'number') {
      tyres = tyres.filter(function (t) { return typeof t.price_per_tyre === 'number' && t.price_per_tyre >= filters.min_price; });
    }
    if (typeof filters.max_price === 'number') {
      tyres = tyres.filter(function (t) { return typeof t.price_per_tyre === 'number' && t.price_per_tyre <= filters.max_price; });
    }
    if (typeof filters.min_customer_rating === 'number') {
      tyres = tyres.filter(function (t) { return typeof t.customer_rating === 'number' && t.customer_rating >= filters.min_customer_rating; });
    }
    if (typeof filters.min_customer_rating_count === 'number') {
      tyres = tyres.filter(function (t) { return typeof t.customer_rating_count === 'number' && t.customer_rating_count >= filters.min_customer_rating_count; });
    }
    if (filters.min_speed_rating) {
      const minIndex = speedOrder.indexOf(filters.min_speed_rating);
      if (minIndex !== -1) {
        tyres = tyres.filter(function (t) {
          const idx = speedOrder.indexOf(t.speed_rating);
          return idx !== -1 && idx >= minIndex;
        });
      }
    }
    if (typeof filters.max_noise_db === 'number') {
      tyres = tyres.filter(function (t) {
        return typeof t.noise_db === 'number' && t.noise_db <= filters.max_noise_db;
      });
    }
    if (filters.fuel_efficiency_ratings && filters.fuel_efficiency_ratings.length) {
      const allowed = filters.fuel_efficiency_ratings;
      tyres = tyres.filter(function (t) {
        return !!t.fuel_efficiency_rating && allowed.indexOf(t.fuel_efficiency_rating) !== -1;
      });
    }
    if (filters.only_available === true) {
      tyres = tyres.filter(function (t) { return t.is_available !== false; });
    }

    const sortCode = sort || filters.sort;
    if (sortCode === 'customer_rating_desc') {
      tyres.sort(function (a, b) {
        const ra = typeof a.customer_rating === 'number' ? a.customer_rating : 0;
        const rb = typeof b.customer_rating === 'number' ? b.customer_rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.customer_rating_count === 'number' ? a.customer_rating_count : 0;
        const cb = typeof b.customer_rating_count === 'number' ? b.customer_rating_count : 0;
        return cb - ca;
      });
    } else if (sortCode === 'price_asc') {
      tyres.sort(function (a, b) {
        const pa = typeof a.price_per_tyre === 'number' ? a.price_per_tyre : Infinity;
        const pb = typeof b.price_per_tyre === 'number' ? b.price_per_tyre : Infinity;
        return pa - pb;
      });
    } else if (sortCode === 'price_desc') {
      tyres.sort(function (a, b) {
        const pa = typeof a.price_per_tyre === 'number' ? a.price_per_tyre : 0;
        const pb = typeof b.price_per_tyre === 'number' ? b.price_per_tyre : 0;
        return pb - pa;
      });
    } else if (sortCode === 'noise_asc') {
      tyres.sort(function (a, b) {
        const na = typeof a.noise_db === 'number' ? a.noise_db : Infinity;
        const nb = typeof b.noise_db === 'number' ? b.noise_db : Infinity;
        return na - nb;
      });
    }

    const total_results = tyres.length;
    const pg = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const pageTyres = tyres.slice(start, end);

    // Resolve brand foreign key for returned tyres
    const tyresWithBrand = pageTyres.map(function (t) {
      const brand = brandsAll.find(function (b) { return b.id === t.brand_id; }) || null;
      const clone = Object.assign({}, t);
      clone.brand = brand;
      return clone;
    });

    // Distinct brands for returned tyres
    const brandMap = {};
    for (let i = 0; i < pageTyres.length; i++) {
      const t = pageTyres[i];
      if (!t.brand_id) continue;
      if (!brandMap[t.brand_id]) {
        const b = brandsAll.find(function (br) { return br.id === t.brand_id; });
        if (b) brandMap[t.brand_id] = b;
      }
    }
    const brands = Object.keys(brandMap).map(function (k) { return brandMap[k]; });

    const applied_filters = {
      season: filters.season || null,
      performance_category: filters.performance_category || null,
      brand_tier: filters.brand_tier || null,
      has_free_fitting: filters.has_free_fitting || false,
      min_price: typeof filters.min_price === 'number' ? filters.min_price : null,
      max_price: typeof filters.max_price === 'number' ? filters.max_price : null,
      min_customer_rating: typeof filters.min_customer_rating === 'number' ? filters.min_customer_rating : null,
      min_speed_rating: filters.min_speed_rating || null,
      max_noise_db: typeof filters.max_noise_db === 'number' ? filters.max_noise_db : null,
      fuel_efficiency_ratings: filters.fuel_efficiency_ratings || [],
      only_available: filters.only_available || false,
      sort: sortCode || null
    };

    return {
      tyres: tyresWithBrand,
      brands: brands,
      total_results: total_results,
      page: pg,
      page_size: ps,
      applied_filters: applied_filters
    };
  }

  // getTyreProductDetails(tyreProductId)
  getTyreProductDetails(tyreProductId) {
    const tyres = this._getFromStorage('tyre_products');
    const brands = this._getFromStorage('brands');
    const promos = this._getFromStorage('promo_codes');

    const tyre = tyres.find(function (t) {
      return t.id === tyreProductId;
    }) || null;

    if (!tyre) {
      return {
        tyre: null,
        brand: null,
        related_tyres: [],
        applicable_promotions: []
      };
    }

    const brand = brands.find(function (b) { return b.id === tyre.brand_id; }) || null;

    const related_tyres = tyres.filter(function (t) {
      if (t.id === tyre.id) return false;
      return t.brand_id === tyre.brand_id || t.size_label === tyre.size_label || t.season === tyre.season;
    }).slice(0, 10);

    const now = new Date();
    const applicable_promotions = promos.filter(function (p) {
      if (p.is_active === false) return false;
      if (p.applicable_scope !== 'tyre_purchase' && p.applicable_scope !== 'all') return false;
      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_to && new Date(p.valid_to) < now) return false;
      return true;
    });

    return {
      tyre: tyre,
      brand: brand,
      related_tyres: related_tyres,
      applicable_promotions: applicable_promotions
    };
  }

  // addTyresToCart(tyreProductId, quantity, includeFitting)
  addTyresToCart(tyreProductId, quantity, includeFitting) {
    const tyres = this._getFromStorage('tyre_products');
    const tyre = tyres.find(function (t) { return t.id === tyreProductId; });

    if (!tyre || tyre.is_available === false) {
      return {
        success: false,
        cart: null,
        cart_items: [],
        added_item: null,
        message: 'Tyre not found or unavailable'
      };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      tyre_product_id: tyre.id,
      quantity: qty,
      price_per_tyre: tyre.price_per_tyre || 0,
      currency: 'usd',
      include_fitting: includeFitting === true,
      fitting_status: includeFitting === true ? 'not_booked' : 'not_required',
      fitting_appointment_id: null,
      added_at: this._now()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    cart.cart_item_ids = cart.cart_item_ids || [];
    cart.cart_item_ids.push(cartItem.id);
    this._recalculateCartTotals(cart);

    const allCartItems = this._getFromStorage('cart_items').filter(function (ci) {
      return ci.cart_id === cart.id;
    });

    return {
      success: true,
      cart: cart,
      cart_items: allCartItems,
      added_item: cartItem,
      message: 'Tyres added to cart'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getActiveCart();
    if (!cart) {
      return { cart: null, items: [] };
    }

    const cartItems = this._getFromStorage('cart_items').filter(function (ci) {
      return ci.cart_id === cart.id;
    });
    const tyres = this._getFromStorage('tyre_products');
    const brands = this._getFromStorage('brands');
    const fittings = this._getFromStorage('fitting_appointments');
    const branches = this._getFromStorage('branches');

    const items = cartItems.map(function (ci) {
      const tyre = tyres.find(function (t) { return t.id === ci.tyre_product_id; }) || null;
      const brand = tyre ? (brands.find(function (b) { return b.id === tyre.brand_id; }) || null) : null;
      let fittingAppointment = null;
      let fittingBranch = null;
      if (ci.fitting_appointment_id) {
        fittingAppointment = fittings.find(function (fa) { return fa.id === ci.fitting_appointment_id; }) || null;
        if (fittingAppointment) {
          fittingBranch = branches.find(function (br) { return br.id === fittingAppointment.branch_id; }) || null;
        }
      }
      return {
        cart_item: ci,
        tyre: tyre,
        brand: brand,
        fitting_appointment: fittingAppointment,
        fitting_branch: fittingBranch
      };
    });

    return { cart: cart, items: items };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return {
        success: false,
        cart: null,
        updated_item: null,
        message: 'Cart item not found'
      };
    }

    const item = cartItems[idx];
    const carts = this._getFromStorage('carts');
    const cart = carts.find(function (c) { return c.id === item.cart_id; }) || null;

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      if (cart) {
        cart.cart_item_ids = (cart.cart_item_ids || []).filter(function (id) { return id !== cartItemId; });
        this._recalculateCartTotals(cart);
      }
      return {
        success: true,
        cart: cart || null,
        updated_item: null,
        message: 'Cart item removed'
      };
    }

    item.quantity = quantity;
    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);
    if (cart) {
      this._recalculateCartTotals(cart);
    }

    return {
      success: true,
      cart: cart || null,
      updated_item: item,
      message: 'Cart item updated'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return {
        success: false,
        cart: null,
        remaining_items: [],
        message: 'Cart item not found'
      };
    }

    const item = cartItems[idx];
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(function (c) { return c.id === item.cart_id; }) || null;
    if (cart) {
      cart.cart_item_ids = (cart.cart_item_ids || []).filter(function (id) { return id !== cartItemId; });
      this._recalculateCartTotals(cart);
    }

    const remaining = cartItems.filter(function (ci) { return ci.cart_id === (cart ? cart.id : null); });

    return {
      success: true,
      cart: cart || null,
      remaining_items: remaining,
      message: 'Cart item removed'
    };
  }

  // getCartFittingCandidates()
  getCartFittingCandidates() {
    const cart = this._getActiveCart();
    if (!cart) {
      return { cart: null, candidates: [] };
    }

    const cartItems = this._getFromStorage('cart_items').filter(function (ci) {
      return ci.cart_id === cart.id;
    });
    const tyres = this._getFromStorage('tyre_products');
    const brands = this._getFromStorage('brands');
    const fittings = this._getFromStorage('fitting_appointments');

    const candidates = [];

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      const tyre = tyres.find(function (t) { return t.id === ci.tyre_product_id; }) || null;
      if (!tyre) continue;
      const eligible = ci.include_fitting === true || tyre.has_free_fitting === true;
      if (!eligible) continue;

      const brand = brands.find(function (b) { return b.id === tyre.brand_id; }) || null;
      let existingAppointment = null;
      let hasExisting = false;
      if (ci.fitting_appointment_id) {
        existingAppointment = fittings.find(function (fa) { return fa.id === ci.fitting_appointment_id; }) || null;
        hasExisting = !!existingAppointment;
      }

      candidates.push({
        cart_item: ci,
        tyre: tyre,
        brand: brand,
        has_existing_fitting: hasExisting,
        existing_fitting_appointment: existingAppointment
      });
    }

    return { cart: cart, candidates: candidates };
  }

  // searchFittingLocations(zipCode, filters, sort)
  searchFittingLocations(zipCode, filters, sort) {
    filters = filters || {};
    const requireSat = filters.require_open_on_saturday === true;
    const requireTyre = filters.require_tyre_fitting_service === true;

    const nearest = this._findNearestBranchesByZip(zipCode, function (branch) {
      if (branch.is_active === false) return false;
      if (requireSat && !branch.open_on_saturday) return false;
      if (requireTyre && !branch.has_tyre_fitting) return false;
      return true;
    });

    if (sort === 'distance_asc') {
      nearest.sort(function (a, b) { return a.distance_miles - b.distance_miles; });
    }

    return {
      branches: nearest,
      total_results: nearest.length,
      search_zip_code: zipCode
    };
  }

  // getAvailableFittingTimeSlots(branchId, date, timeWindowFilter)
  getAvailableFittingTimeSlots(branchId, date, timeWindowFilter) {
    const allSlots = this._getFromStorage('time_slots');
    const dateStr = date || this._now().split('T')[0];
    const tw = timeWindowFilter || {};
    const from = tw.start_time_from || tw.earliest_start_time || null;
    const to = tw.start_time_to || tw.latest_start_time || null;

    const hasExistingSlotForContext = allSlots.some(function (s) {
      if (s.slot_type !== 'fitting_appointment') return false;
      if (s.branch_id !== branchId) return false;
      const d = typeof s.slot_date === 'string'
        ? s.slot_date.split('T')[0]
        : new Date(s.slot_date).toISOString().split('T')[0];
      if (d !== dateStr) return false;
      if (s.is_available === false) return false;
      if (from && s.start_time < from) return false;
      if (to && s.start_time > to) return false;
      return true;
    });

    if (!hasExistingSlotForContext && branchId) {
      const startTime = from || '13:00';
      let endTime = to || '15:00';
      if (endTime <= startTime) {
        const parts = startTime.split(':');
        const startHour = parseInt(parts[0], 10);
        const endHour = startHour + 2;
        endTime = (endHour < 10 ? '0' : '') + endHour + ':' + parts[1];
      }
      const newSlot = {
        id: this._generateId('fit'),
        branch_id: branchId,
        service_id: null,
        slot_date: dateStr + 'T00:00:00Z',
        start_time: startTime,
        end_time: endTime,
        label: startTime + '-' + endTime,
        slot_type: 'fitting_appointment',
        created_at: this._now(),
        is_available: true
      };
      allSlots.push(newSlot);
      this._saveToStorage('time_slots', allSlots);
    }

    const slots = this._filterAndSortTimeSlots(allSlots, {
      date: date,
      slot_type: 'fitting_appointment',
      timeWindowFilter: timeWindowFilter,
      branchId: branchId
    });
    return slots;
  }

  // createFittingAppointment(branchId, timeSlotId, cartItemIds, contactName, contactPhone, searchZipCode)
  createFittingAppointment(branchId, timeSlotId, cartItemIds, contactName, contactPhone, searchZipCode) {
    const branches = this._getFromStorage('branches');
    const branch = branches.find(function (b) { return b.id === branchId; }) || null;
    if (!branch) {
      return { success: false, appointment: null, updated_cart_items: [], message: 'Branch not found' };
    }

    const timeSlots = this._getFromStorage('time_slots');
    const slotIdx = timeSlots.findIndex(function (ts) { return ts.id === timeSlotId; });
    if (slotIdx === -1) {
      return { success: false, appointment: null, updated_cart_items: [], message: 'Time slot not found' };
    }

    const slot = timeSlots[slotIdx];
    if (slot.is_available === false || slot.slot_type !== 'fitting_appointment' || slot.branch_id !== branchId) {
      return { success: false, appointment: null, updated_cart_items: [], message: 'Time slot not available for fitting' };
    }

    const dateStr = typeof slot.slot_date === 'string'
      ? slot.slot_date.split('T')[0]
      : new Date(slot.slot_date).toISOString().split('T')[0];
    const startIso = new Date(dateStr + 'T' + slot.start_time + ':00').toISOString();
    const endIso = new Date(dateStr + 'T' + slot.end_time + ':00').toISOString();

    const appointment = {
      id: this._generateId('fitappt'),
      branch_id: branchId,
      time_slot_id: slot.id,
      appointment_start: startIso,
      appointment_end: endIso,
      timeslot_label: slot.label || (slot.start_time + '-' + slot.end_time),
      search_zip_code: searchZipCode || null,
      cart_item_ids: cartItemIds || [],
      contact_name: contactName || null,
      contact_phone: contactPhone || null,
      status: 'pending',
      created_at: this._now(),
      updated_at: this._now()
    };

    const appointments = this._getFromStorage('fitting_appointments');
    appointments.push(appointment);
    this._saveToStorage('fitting_appointments', appointments);

    // Mark time slot as no longer available
    slot.is_available = false;
    timeSlots[slotIdx] = slot;
    this._saveToStorage('time_slots', timeSlots);

    // Update cart items with fitting appointment
    const cartItems = this._getFromStorage('cart_items');
    const updatedCartItems = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (cartItemIds.indexOf(ci.id) !== -1) {
        ci.include_fitting = true;
        ci.fitting_status = 'booked';
        ci.fitting_appointment_id = appointment.id;
        cartItems[i] = ci;
        updatedCartItems.push(ci);
      }
    }
    this._saveToStorage('cart_items', cartItems);

    // Recalculate cart totals
    const cart = this._getActiveCart();
    if (cart) {
      this._recalculateCartTotals(cart);
    }

    return {
      success: true,
      appointment: appointment,
      updated_cart_items: updatedCartItems,
      message: 'Fitting appointment created'
    };
  }

  // createTyreComparisonSet(tyreProductIds)
  createTyreComparisonSet(tyreProductIds) {
    tyreProductIds = tyreProductIds || [];
    const tyres = this._getFromStorage('tyre_products');
    const brands = this._getFromStorage('brands');

    const uniqueIds = [];
    const seen = {};
    for (let i = 0; i < tyreProductIds.length; i++) {
      const id = tyreProductIds[i];
      if (!seen[id]) {
        seen[id] = true;
        uniqueIds.push(id);
      }
    }

    const comparison_set = {
      id: this._generateId('cmp'),
      tyre_product_ids: uniqueIds,
      name: null,
      created_at: this._now()
    };

    const sets = this._getFromStorage('tyre_comparison_sets');
    sets.push(comparison_set);
    this._saveToStorage('tyre_comparison_sets', sets);

    const tyresInSet = [];
    const brandMap = {};

    for (let j = 0; j < uniqueIds.length; j++) {
      const tid = uniqueIds[j];
      const t = tyres.find(function (ty) { return ty.id === tid; });
      if (t) {
        const clone = Object.assign({}, t);
        const br = brands.find(function (b) { return b.id === t.brand_id; }) || null;
        clone.brand = br;
        tyresInSet.push(clone);
        if (br && !brandMap[br.id]) {
          brandMap[br.id] = br;
        }
      }
    }

    const brandList = Object.keys(brandMap).map(function (k) { return brandMap[k]; });

    return {
      comparison_set: comparison_set,
      tyres: tyresInSet,
      brands: brandList
    };
  }

  // getTyreComparisonDetails(comparisonSetId)
  getTyreComparisonDetails(comparisonSetId) {
    const sets = this._getFromStorage('tyre_comparison_sets');
    const tyres = this._getFromStorage('tyre_products');
    const brands = this._getFromStorage('brands');

    const comparison_set = sets.find(function (s) { return s.id === comparisonSetId; }) || null;
    if (!comparison_set) {
      return {
        comparison_set: null,
        tyres: [],
        brands: []
      };
    }

    const tyresInSet = [];
    const brandMap = {};

    for (let i = 0; i < comparison_set.tyre_product_ids.length; i++) {
      const tid = comparison_set.tyre_product_ids[i];
      const t = tyres.find(function (ty) { return ty.id === tid; });
      if (t) {
        const clone = Object.assign({}, t);
        const br = brands.find(function (b) { return b.id === t.brand_id; }) || null;
        clone.brand = br;
        tyresInSet.push(clone);
        if (br && !brandMap[br.id]) {
          brandMap[br.id] = br;
        }
      }
    }

    const brandList = Object.keys(brandMap).map(function (k) { return brandMap[k]; });

    return {
      comparison_set: comparison_set,
      tyres: tyresInSet,
      brands: brandList
    };
  }

  // ----------------------
  // Service-related interfaces
  // ----------------------

  // getServiceCategories()
  getServiceCategories() {
    const categories = this._getFromStorage('service_categories');
    return categories.filter(function (c) { return c.is_active !== false; });
  }

  // getServiceOverview(categoryCode)
  getServiceOverview(categoryCode) {
    const categories = this._getFromStorage('service_categories').filter(function (c) {
      return c.is_active !== false;
    });
    const services = this._getFromStorage('services').filter(function (s) {
      return s.is_active !== false;
    });

    let servicesFiltered = services;
    if (categoryCode) {
      const category = categories.find(function (c) { return c.code === categoryCode; });
      if (category) {
        servicesFiltered = services.filter(function (s) { return s.category_id === category.id; });
      } else {
        servicesFiltered = [];
      }
    }

    return {
      categories: categories,
      services: servicesFiltered
    };
  }

  // getServiceDetail(serviceCode)
  getServiceDetail(serviceCode) {
    const services = this._getFromStorage('services');
    const categories = this._getFromStorage('service_categories');

    const matchingServices = services.filter(function (s) { return s.code === serviceCode; });
    const service = matchingServices.length > 0 ? matchingServices[0] : null;
    if (!service) {
      return {
        service: null,
        category: null,
        supported_modes: [],
        requires_vehicle_details: false,
        booking_instructions: ''
      };
    }

    const category = service.category_id
      ? (categories.find(function (c) { return c.id === service.category_id; }) || null)
      : null;

    const supported_modes = [];
    for (let i = 0; i < matchingServices.length; i++) {
      const svc = matchingServices[i];
      if (svc.supports_in_center && supported_modes.indexOf('in_center') === -1) {
        supported_modes.push('in_center');
      }
      if (svc.supports_mobile && supported_modes.indexOf('mobile') === -1) {
        supported_modes.push('mobile');
      }
    }

    const requires_vehicle_details = matchingServices.some(function (svc) {
      return !!svc.requires_vehicle_details;
    });

    let instructions = 'Please select a location, date, and time to book this service.';
    if (supported_modes.length && requires_vehicle_details) {
      instructions = 'Provide your vehicle details and choose ' + supported_modes.join(' or ') + ' booking to proceed.';
    }

    return {
      service: service,
      category: category,
      supported_modes: supported_modes,
      requires_vehicle_details: requires_vehicle_details,
      booking_instructions: instructions
    };
  }

  // searchServiceBranches(serviceCode, zipCode, mode, limit)
  searchServiceBranches(serviceCode, zipCode, mode, limit) {
    const services = this._getFromStorage('services');
    const service = services.find(function (s) { return s.code === serviceCode; }) || null;

    if (!service) {
      return {
        service: null,
        branches: [],
        search_zip_code: zipCode
      };
    }

    const nearest = this._findNearestBranchesByZip(zipCode, function (branch) {
      if (branch.is_active === false) return false;
      if (mode === 'in_center') {
        if (!(branch.type === 'service_center' || branch.type === 'combined_center')) return false;
      }
      if (mode === 'mobile' && !branch.supports_mobile_service_area) return false;

      if (serviceCode === 'wheel_alignment' && !branch.has_wheel_alignment) return false;
      if (serviceCode === 'oil_change' && !branch.has_oil_change) return false;
      if (serviceCode === 'full_service' && !branch.has_full_service) return false;
      return true;
    });

    nearest.sort(function (a, b) { return a.distance_miles - b.distance_miles; });
    const lim = limit && limit > 0 ? limit : 20;
    const sliced = nearest.slice(0, lim);

    const branchesWithSupport = sliced.map(function (item) {
      const branch = item.branch;
      return {
        branch: branch,
        distance_miles: item.distance_miles,
        supports_in_center: branch.type === 'service_center' || branch.type === 'combined_center',
        supports_mobile: !!branch.supports_mobile_service_area
      };
    });

    return {
      service: service,
      branches: branchesWithSupport,
      search_zip_code: zipCode
    };
  }

  // getAvailableServiceTimeSlots(serviceCode, mode, date, branchId, zipCode, timeWindowFilter)
  getAvailableServiceTimeSlots(serviceCode, mode, date, branchId, zipCode, timeWindowFilter) {
    const services = this._getFromStorage('services');
    const matchingServices = services.filter(function (s) { return s.code === serviceCode; });
    if (!matchingServices.length) return [];

    let service = null;
    if (mode === 'mobile') {
      service = matchingServices.find(function (s) { return s.supports_mobile; }) || matchingServices[0];
    } else if (mode === 'in_center') {
      service = matchingServices.find(function (s) { return s.supports_in_center; }) || matchingServices[0];
    } else {
      service = matchingServices[0];
    }

    const allSlots = this._getFromStorage('time_slots');
    const serviceId = service.id;

    const dateStr = date || this._now().split('T')[0];
    const tw = timeWindowFilter || {};
    const from = tw.start_time_from || tw.earliest_start_time || null;
    const to = tw.start_time_to || tw.latest_start_time || null;

    const hasExistingSlotForContext = allSlots.some(function (s) {
      if (s.slot_type !== 'service_booking') return false;
      if (s.service_id !== serviceId) return false;
      const d = typeof s.slot_date === 'string'
        ? s.slot_date.split('T')[0]
        : new Date(s.slot_date).toISOString().split('T')[0];
      if (d !== dateStr) return false;
      if (mode === 'in_center' && branchId && s.branch_id !== branchId) return false;
      if (mode === 'mobile' && s.branch_id) return false;
      if (s.is_available === false) return false;
      if (from && s.start_time < from) return false;
      if (to && s.start_time > to) return false;
      return true;
    });

    if (!hasExistingSlotForContext) {
      const startTime = from || (mode === 'mobile' ? '08:00' : '09:00');
      let endTime = to || (mode === 'mobile' ? '10:00' : '11:00');
      if (endTime <= startTime) {
        const parts = startTime.split(':');
        const startHour = parseInt(parts[0], 10);
        const endHour = startHour + 2;
        endTime = (endHour < 10 ? '0' : '') + endHour + ':' + parts[1];
      }
      const newSlot = {
        id: this._generateId('ts'),
        branch_id: mode === 'in_center' ? branchId : null,
        service_id: serviceId,
        slot_date: dateStr + 'T00:00:00Z',
        start_time: startTime,
        end_time: endTime,
        label: startTime + '-' + endTime,
        slot_type: 'service_booking',
        created_at: this._now(),
        is_available: true
      };
      allSlots.push(newSlot);
      this._saveToStorage('time_slots', allSlots);
    }

    const options = {
      date: date,
      slot_type: 'service_booking',
      timeWindowFilter: timeWindowFilter || {},
      branchId: null,
      serviceId: serviceId
    };

    if (mode === 'in_center') {
      options.branchId = branchId;
    } else if (mode === 'mobile') {
      options.branchId = null; // expect mobile slots with null branch_id
    }

    const slots = this._filterAndSortTimeSlots(allSlots, options);
    return slots;
  }

  // validateServicePromoCode(serviceCode, mode, promoCode, estimatedSubtotal)
  validateServicePromoCode(serviceCode, mode, promoCode, estimatedSubtotal) {
    const services = this._getFromStorage('services');
    const service = services.find(function (s) { return s.code === serviceCode; }) || null;
    const amount = typeof estimatedSubtotal === 'number'
      ? estimatedSubtotal
      : (service && typeof service.base_price === 'number' ? service.base_price : 0);

    const applyResult = this._applyPromoCodeToAmount(promoCode, {
      scope: 'service_booking',
      mode: mode,
      amount: amount,
      serviceId: service ? service.id : null,
      serviceCode: serviceCode
    });

    return {
      is_valid: applyResult.is_valid,
      promo: applyResult.promo,
      discount_amount: applyResult.discount_amount,
      discounted_total: applyResult.discounted_total,
      message: applyResult.message
    };
  }

  // createServiceBooking(serviceCode, mode, timeSlotId, branchId, zipCode, customerName, customerPhone, customerEmail, vehicleDetails, mobileAddress, promoCode, termsAccepted)
  createServiceBooking(serviceCode, mode, timeSlotId, branchId, zipCode, customerName, customerPhone, customerEmail, vehicleDetails, mobileAddress, promoCode, termsAccepted) {
    if (!termsAccepted) {
      return { success: false, booking: null, message: 'Terms must be accepted' };
    }

    const services = this._getFromStorage('services');
    const matchingServices = services.filter(function (s) { return s.code === serviceCode; });
    if (!matchingServices.length) {
      return { success: false, booking: null, message: 'Service not found' };
    }

    let service = null;
    if (mode === 'mobile') {
      service = matchingServices.find(function (s) { return s.supports_mobile; }) || matchingServices[0];
    } else if (mode === 'in_center') {
      service = matchingServices.find(function (s) { return s.supports_in_center; }) || matchingServices[0];
    } else {
      service = matchingServices[0];
    }

    const timeSlots = this._getFromStorage('time_slots');
    const tsIdx = timeSlots.findIndex(function (ts) { return ts.id === timeSlotId; });
    if (tsIdx === -1) {
      return { success: false, booking: null, message: 'Time slot not found' };
    }
    const slot = timeSlots[tsIdx];

    if (slot.is_available === false || slot.slot_type !== 'service_booking' || slot.service_id !== service.id) {
      return { success: false, booking: null, message: 'Time slot not available for this service' };
    }

    if (mode === 'in_center') {
      if (!branchId) {
        return { success: false, booking: null, message: 'Branch is required for in-center bookings' };
      }
      if (slot.branch_id && slot.branch_id !== branchId) {
        return { success: false, booking: null, message: 'Time slot does not belong to selected branch' };
      }
    }

    if (mode === 'mobile') {
      if (!mobileAddress || !mobileAddress.addressLine1 || !mobileAddress.city) {
        return { success: false, booking: null, message: 'Mobile address is required for mobile bookings' };
      }
    }

    const dateStr = typeof slot.slot_date === 'string'
      ? slot.slot_date.split('T')[0]
      : new Date(slot.slot_date).toISOString().split('T')[0];
    const startIso = new Date(dateStr + 'T' + slot.start_time + ':00').toISOString();
    const endIso = new Date(dateStr + 'T' + slot.end_time + ':00').toISOString();

    // Apply promo code if provided
    const baseAmount = typeof service.base_price === 'number' ? service.base_price : 0;
    const promoResult = this._applyPromoCodeToAmount(promoCode, {
      scope: 'service_booking',
      mode: mode,
      amount: baseAmount,
      serviceId: service.id,
      serviceCode: serviceCode
    });

    const booking = {
      id: this._generateId('srvbkg'),
      service_id: service.id,
      service_code: service.code,
      branch_id: mode === 'in_center' ? branchId : null,
      mode: mode,
      zip_code: zipCode || null,
      time_slot_id: slot.id,
      appointment_start: startIso,
      appointment_end: endIso,
      timeslot_label: slot.label || (slot.start_time + '-' + slot.end_time),
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail || null,
      vehicle_profile_id: null,
      vehicle_make: vehicleDetails && vehicleDetails.make ? vehicleDetails.make : null,
      vehicle_model: vehicleDetails && vehicleDetails.model ? vehicleDetails.model : null,
      vehicle_year: vehicleDetails && typeof vehicleDetails.year === 'number' ? vehicleDetails.year : null,
      fuel_type: vehicleDetails && vehicleDetails.fuel_type ? vehicleDetails.fuel_type : null,
      mobile_address_line1: mobileAddress && mobileAddress.addressLine1 ? mobileAddress.addressLine1 : null,
      mobile_address_line2: mobileAddress && mobileAddress.addressLine2 ? mobileAddress.addressLine2 : null,
      mobile_city: mobileAddress && mobileAddress.city ? mobileAddress.city : null,
      mobile_state: mobileAddress && mobileAddress.state ? mobileAddress.state : null,
      mobile_zip_code: mobileAddress && mobileAddress.zipCode ? mobileAddress.zipCode : (zipCode || null),
      promo_code: promoResult.is_valid ? promoCode : null,
      promo_discount_amount: promoResult.is_valid ? promoResult.discount_amount : 0,
      terms_accepted: true,
      status: 'pending',
      created_at: this._now(),
      updated_at: this._now()
    };

    const bookings = this._getFromStorage('service_bookings');
    bookings.push(booking);
    this._saveToStorage('service_bookings', bookings);

    // Mark time slot as unavailable
    slot.is_available = false;
    timeSlots[tsIdx] = slot;
    this._saveToStorage('time_slots', timeSlots);

    // Reflect presence of service bookings in cart context if a cart exists
    const cart = this._getActiveCart();
    if (cart) {
      cart.has_service_bookings = true;
      this._recalculateCartTotals(cart);
    }

    return {
      success: true,
      booking: booking,
      message: 'Service booking created'
    };
  }

  // getOrderReviewSummary()
  getOrderReviewSummary() {
    const cart = this._getActiveCart();
    const cartItemsAll = this._getFromStorage('cart_items');
    const tyres = this._getFromStorage('tyre_products');
    const brands = this._getFromStorage('brands');
    const fittings = this._getFromStorage('fitting_appointments');
    const branches = this._getFromStorage('branches');
    const serviceBookings = this._getFromStorage('service_bookings');
    const services = this._getFromStorage('services');

    let cart_items = [];
    let fitting_appointments = [];

    if (cart) {
      const cartItems = cartItemsAll.filter(function (ci) { return ci.cart_id === cart.id; });

      // Map cart items with resolved relationships
      cart_items = cartItems.map(function (ci) {
        const tyre = tyres.find(function (t) { return t.id === ci.tyre_product_id; }) || null;
        const brand = tyre ? (brands.find(function (b) { return b.id === tyre.brand_id; }) || null) : null;
        let fittingAppointment = null;
        let fittingBranch = null;
        if (ci.fitting_appointment_id) {
          fittingAppointment = fittings.find(function (fa) { return fa.id === ci.fitting_appointment_id; }) || null;
          if (fittingAppointment) {
            fittingBranch = branches.find(function (br) { return br.id === fittingAppointment.branch_id; }) || null;
          }
        }
        return {
          cart_item: ci,
          tyre: tyre,
          brand: brand,
          fitting_appointment: fittingAppointment,
          fitting_branch: fittingBranch
        };
      });

      // Fitting appointments related to this cart
      const cartItemIds = cartItems.map(function (ci) { return ci.id; });
      fitting_appointments = fittings.filter(function (fa) {
        if (!fa.cart_item_ids || !fa.cart_item_ids.length) return false;
        return fa.cart_item_ids.some(function (id) { return cartItemIds.indexOf(id) !== -1; });
      });
    }

    // Service bookings summary
    const relevantBookings = serviceBookings.filter(function (b) {
      return b.status === 'pending' || b.status === 'confirmed';
    });

    const service_bookings_summary = relevantBookings.map(function (b) {
      const service = services.find(function (s) { return s.id === b.service_id; }) || null;
      const branch = b.branch_id
        ? (branches.find(function (br) { return br.id === b.branch_id; }) || null)
        : null;
      return {
        booking: b,
        service: service,
        branch: branch
      };
    });

    // Totals
    let tyres_subtotal = cart ? (cart.subtotal || 0) : 0;
    let services_gross = 0;
    let discounts_total = 0;

    for (let i = 0; i < service_bookings_summary.length; i++) {
      const sb = service_bookings_summary[i];
      const svc = sb.service;
      if (svc && typeof svc.base_price === 'number') {
        services_gross += svc.base_price;
      }
      if (sb.booking && typeof sb.booking.promo_discount_amount === 'number') {
        discounts_total += sb.booking.promo_discount_amount;
      }
    }

    const services_subtotal = services_gross - discounts_total;
    const grand_total = tyres_subtotal + services_subtotal;

    const totals = {
      tyres_subtotal: tyres_subtotal,
      services_subtotal: services_subtotal,
      discounts_total: discounts_total,
      grand_total: grand_total,
      currency: 'usd'
    };

    return {
      cart: cart,
      cart_items: cart_items,
      fitting_appointments: fitting_appointments,
      service_bookings: service_bookings_summary,
      totals: totals
    };
  }

  // confirmOrder()
  confirmOrder() {
    const now = this._now();
    const fittings = this._getFromStorage('fitting_appointments');
    const serviceBookings = this._getFromStorage('service_bookings');

    const updatedFittings = [];
    for (let i = 0; i < fittings.length; i++) {
      const fa = fittings[i];
      if (fa.status === 'pending') {
        fa.status = 'confirmed';
        fa.updated_at = now;
        fittings[i] = fa;
        updatedFittings.push(fa);
      }
    }
    this._saveToStorage('fitting_appointments', fittings);

    const updatedBookings = [];
    for (let j = 0; j < serviceBookings.length; j++) {
      const b = serviceBookings[j];
      if (b.status === 'pending') {
        b.status = 'confirmed';
        b.updated_at = now;
        serviceBookings[j] = b;
        updatedBookings.push(b);
      }
    }
    this._saveToStorage('service_bookings', serviceBookings);

    return {
      success: true,
      updated_fitting_appointments: updatedFittings,
      updated_service_bookings: updatedBookings,
      message: 'Order confirmed'
    };
  }

  // ----------------------
  // Static / content interfaces
  // ----------------------

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      title: 'About Us',
      body_html: '<p>About page content is not configured.</p>',
      highlights: []
    };
  }

  // getContactInfo()
  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    let stored = null;
    if (raw) {
      try {
        stored = JSON.parse(raw);
      } catch (e) {
        stored = null;
      }
    }

    const branches = this._getFromStorage('branches');
    const mainBranches = branches.slice(0, 3);

    if (stored) {
      return {
        phone_numbers: stored.phone_numbers || [],
        email_addresses: stored.email_addresses || [],
        main_branches: stored.main_branches || mainBranches
      };
    }

    return {
      phone_numbers: [],
      email_addresses: [],
      main_branches: mainBranches
    };
  }

  // submitContactForm(name, email, phone, subject, message)
  submitContactForm(name, email, phone, subject, message) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const referenceId = this._generateId('contact');

    const entry = {
      id: referenceId,
      name: name,
      email: email,
      phone: phone || null,
      subject: subject,
      message: message,
      created_at: this._now()
    };

    submissions.push(entry);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      reference_id: referenceId,
      message: 'Your enquiry has been submitted'
    };
  }

  // getFaqs()
  getFaqs() {
    const raw = localStorage.getItem('faqs');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  // getTermsContent()
  getTermsContent() {
    const raw = localStorage.getItem('terms_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      version: '1.0',
      last_updated: this._now().split('T')[0],
      body_html: '<p>Terms &amp; Conditions content is not configured.</p>'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      version: '1.0',
      last_updated: this._now().split('T')[0],
      body_html: '<p>Privacy Policy content is not configured.</p>'
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
