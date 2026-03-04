// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  // ------------------------
  // Initialization & Storage
  // ------------------------

  _initStorage() {
    var defaults = [
      { key: 'vendors', value: [] },
      { key: 'packages', value: [] },
      { key: 'budget_plans', value: null },
      { key: 'guest_lists', value: null },
      { key: 'timelines', value: [] },
      { key: 'favorites', value: null },
      { key: 'plans', value: null },
      { key: 'cart', value: null },
      { key: 'consultation_requests', value: [] },
      { key: 'package_bookings', value: [] },
      { key: 'enum_definitions', value: null },
      { key: 'contact_messages', value: [] }
    ];

    for (var i = 0; i < defaults.length; i++) {
      var def = defaults[i];
      if (localStorage.getItem(def.key) === null) {
        localStorage.setItem(def.key, JSON.stringify(def.value));
      }
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    var data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      var parsed = JSON.parse(data);
      if (parsed === null && defaultValue !== undefined) {
        return defaultValue;
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
    var current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    var next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  _formatCurrency(amount, currency) {
    if (amount === null || amount === undefined || isNaN(amount)) {
      amount = 0;
    }
    currency = currency || 'USD';
    var symbol = '$';
    if (currency === 'USD') {
      symbol = '$';
    }
    var fixed = Number(amount).toFixed(2);
    return symbol + fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  _titleCaseFromEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  _getVendors() {
    var vendors = this._getFromStorage('vendors', []);

    // Auto-seed sample vendors for categories that may not be present in the test data
    var hasCategory = function (cat) {
      return vendors.some(function (v) { return v.category === cat; });
    };

    var now = this._now();

    // Photographer used in Tasks 4 and 9
    if (!hasCategory('photographers')) {
      vendors.push({
        id: 'photographer_sample_1',
        name: 'Evergreen Wedding Photography',
        category: 'photographers',
        description: 'Affordable wedding photographer for Chicago-area celebrations.',
        location_city: 'Chicago',
        location_state: 'IL',
        location_country: 'USA',
        address: '',
        capacity_min_guests: null,
        capacity_max_guests: null,
        pricing_model: 'per_hour',
        base_price: 2000,
        hourly_rate: 150,
        price_per_person: null,
        currency: 'USD',
        rating: 4.7,
        rating_count: 25,
        images: [],
        available_dates: [
          '2026-05-15T10:00:00Z',
          '2026-05-15T14:00:00Z',
          '2026-06-20T10:00:00Z'
        ],
        catering_service_type: null,
        dietary_options: [],
        decor_subcategory: null,
        included_services: [],
        created_at: now,
        updated_at: now
      });
    }

    // Catering vendor used in Task 7
    if (!hasCategory('catering')) {
      vendors.push({
        id: 'catering_sample_buffet',
        name: 'Harvest Buffet Catering',
        category: 'catering',
        description: 'Buffet catering with popular vegetarian and gluten-free options.',
        location_city: 'Chicago',
        location_state: 'IL',
        location_country: 'USA',
        address: '',
        capacity_min_guests: 20,
        capacity_max_guests: 200,
        pricing_model: 'per_person',
        base_price: null,
        hourly_rate: null,
        price_per_person: 55,
        currency: 'USD',
        rating: 4.6,
        rating_count: 32,
        images: [],
        available_dates: [],
        catering_service_type: 'buffet',
        dietary_options: ['vegetarian', 'gluten_free', 'vegan'],
        decor_subcategory: null,
        included_services: [],
        created_at: now,
        updated_at: now
      });
    }

    // Decor rentals used in Task 8
    if (!hasCategory('decor_rentals')) {
      // Lighting item under $100
      vendors.push({
        id: 'decor_lighting_fairy_stringlights',
        name: 'Fairy String Lights Package',
        category: 'decor_rentals',
        description: 'Warm white string lighting for indoor or outdoor receptions.',
        location_city: 'Chicago',
        location_state: 'IL',
        location_country: 'USA',
        address: '',
        capacity_min_guests: null,
        capacity_max_guests: null,
        pricing_model: 'per_event',
        base_price: 80,
        hourly_rate: null,
        price_per_person: null,
        currency: 'USD',
        rating: 4.5,
        rating_count: 18,
        images: [],
        available_dates: [],
        catering_service_type: null,
        dietary_options: [],
        decor_subcategory: 'lighting',
        included_services: [],
        created_at: now,
        updated_at: now
      });

      // Two non-lighting decor items under $100
      vendors.push({
        id: 'decor_centerpiece_greenery',
        name: 'Greenery Centerpiece Set',
        category: 'decor_rentals',
        description: 'Eucalyptus and greenery centerpieces for guest tables.',
        location_city: 'Chicago',
        location_state: 'IL',
        location_country: 'USA',
        address: '',
        capacity_min_guests: null,
        capacity_max_guests: null,
        pricing_model: 'per_event',
        base_price: 60,
        hourly_rate: null,
        price_per_person: null,
        currency: 'USD',
        rating: 4.2,
        rating_count: 12,
        images: [],
        available_dates: [],
        catering_service_type: null,
        dietary_options: [],
        decor_subcategory: 'centerpieces',
        included_services: [],
        created_at: now,
        updated_at: now
      });

      vendors.push({
        id: 'decor_centerpiece_candles',
        name: 'Candle Centerpiece Trio',
        category: 'decor_rentals',
        description: 'Set of pillar candles with glass hurricanes.',
        location_city: 'Chicago',
        location_state: 'IL',
        location_country: 'USA',
        address: '',
        capacity_min_guests: null,
        capacity_max_guests: null,
        pricing_model: 'per_event',
        base_price: 70,
        hourly_rate: null,
        price_per_person: null,
        currency: 'USD',
        rating: 4.8,
        rating_count: 20,
        images: [],
        available_dates: [],
        catering_service_type: null,
        dietary_options: [],
        decor_subcategory: 'centerpieces',
        included_services: [],
        created_at: now,
        updated_at: now
      });
    }

    // DJ used in Task 9
    if (!hasCategory('djs')) {
      vendors.push({
        id: 'dj_sample_1',
        name: 'Downtown Wedding DJ',
        category: 'djs',
        description: 'Wedding DJ with sound system and dance floor lighting.',
        location_city: 'Chicago',
        location_state: 'IL',
        location_country: 'USA',
        address: '',
        capacity_min_guests: null,
        capacity_max_guests: null,
        pricing_model: 'per_event',
        base_price: 1200,
        hourly_rate: 150,
        price_per_person: null,
        currency: 'USD',
        rating: 4.4,
        rating_count: 40,
        images: [],
        available_dates: [],
        catering_service_type: null,
        dietary_options: [],
        decor_subcategory: null,
        included_services: [],
        created_at: now,
        updated_at: now
      });
    }

    this._saveToStorage('vendors', vendors);
    return vendors;
  }

  _getPackages() {
    return this._getFromStorage('packages', []);
  }

  _getOrCreateFavorites() {
    var favorites = this._getFromStorage('favorites', null);
    if (!favorites) {
      favorites = {
        id: this._generateId('favorites'),
        items: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      this._persistState('favorites', favorites);
    }
    return favorites;
  }

  // Helper to resolve vendor foreign keys in items arrays
  _attachVendorsToItems(items) {
    var vendors = this._getVendors();
    return items.map(function (item) {
      var withVendor = Object.assign({}, item);
      if (withVendor.vendor_id) {
        var vendor = vendors.find(function (v) { return v.id === withVendor.vendor_id; }) || null;
        withVendor.vendor = vendor;
      }
      return withVendor;
    });
  }

  _getOrCreatePlan() {
    var plan = this._getFromStorage('plans', null);
    if (!plan) {
      var now = this._now();
      plan = {
        id: this._generateId('plan'),
        name: 'My Plan',
        items: [],
        total_estimated_price: 0,
        status: 'draft',
        created_at: now,
        updated_at: now
      };
      this._persistState('plans', plan);
    }
    return plan;
  }

  _getOrCreateCart() {
    var cart = this._getFromStorage('cart', null);
    if (!cart) {
      var now = this._now();
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        created_at: now,
        updated_at: now
      };
      this._persistState('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    if (!cart || !Array.isArray(cart.items)) {
      return cart;
    }
    var subtotal = 0;
    for (var i = 0; i < cart.items.length; i++) {
      var item = cart.items[i];
      var guestCount = Number(item.guest_count) || 0;
      var unitPrice = Number(item.unit_price) || 0;
      var fullTotal = guestCount * unitPrice;
      var depositOption = item.deposit_option || 'full_amount';
      var depositAmount = fullTotal;
      if (depositOption === 'deposit_20_percent') {
        depositAmount = fullTotal * 0.2;
      } else if (depositOption === 'deposit_50_percent') {
        depositAmount = fullTotal * 0.5;
      } else if (depositOption === 'full_amount') {
        depositAmount = fullTotal;
      }
      item.deposit_amount = depositAmount;
      item.line_total = depositAmount;
      subtotal += depositAmount;
    }
    cart.subtotal = subtotal;
    cart.updated_at = this._now();
    return cart;
  }

  _recalculatePlanTotal(plan) {
    if (!plan || !Array.isArray(plan.items)) {
      return plan;
    }
    var total = 0;
    for (var i = 0; i < plan.items.length; i++) {
      var item = plan.items[i];
      total += Number(item.estimated_price) || 0;
    }
    plan.total_estimated_price = total;
    plan.updated_at = this._now();
    return plan;
  }

  _recalculateBudgetAllocationSummary(budgetPlan) {
    var allocated = 0;
    if (budgetPlan && Array.isArray(budgetPlan.categories)) {
      for (var i = 0; i < budgetPlan.categories.length; i++) {
        allocated += Number(budgetPlan.categories[i].amount) || 0;
      }
    }
    var totalBudget = (budgetPlan && Number(budgetPlan.total_budget)) || 0;
    var remaining = totalBudget - allocated;
    return {
      allocated_total: allocated,
      remaining: remaining,
      is_balanced: remaining === 0
    };
  }

  _persistState(key, data) {
    this._saveToStorage(key, data);
  }

  // ------------------------
  // Homepage
  // ------------------------

  getHomepageContent() {
    var vendors = this._getVendors();
    var packages = this._getPackages();

    var featuredVenues = vendors
      .filter(function (v) { return v.category === 'venues'; })
      .sort(function (a, b) {
        var ra = a.rating || 0;
        var rb = b.rating || 0;
        if (rb === ra) {
          return (b.rating_count || 0) - (a.rating_count || 0);
        }
        return rb - ra;
      })
      .slice(0, 5);

    var featuredPhotographers = vendors
      .filter(function (v) { return v.category === 'photographers'; })
      .sort(function (a, b) {
        var ra = a.rating || 0;
        var rb = b.rating || 0;
        if (rb === ra) {
          return (b.rating_count || 0) - (a.rating_count || 0);
        }
        return rb - ra;
      })
      .slice(0, 5);

    var featuredPackages = packages
      .slice()
      .sort(function (a, b) {
        var fa = a.is_featured ? 1 : 0;
        var fb = b.is_featured ? 1 : 0;
        if (fb !== fa) return fb - fa;
        var ra = a.rating || 0;
        var rb = b.rating || 0;
        if (rb === ra) {
          return (b.rating_count || 0) - (a.rating_count || 0);
        }
        return rb - ra;
      })
      .slice(0, 5);

    var quickTasks = [
      {
        id: 'find_venue',
        label: 'Find a venue',
        description: 'Browse venues that match your guest count and budget.',
        task_type: 'find_venue'
      },
      {
        id: 'plan_budget',
        label: 'Plan your budget',
        description: 'Set an overall budget and allocate by category.',
        task_type: 'plan_budget'
      },
      {
        id: 'build_vendor_plan',
        label: 'Build your vendor plan',
        description: 'Shortlist venues, photographers, DJs and more.',
        task_type: 'build_vendor_plan'
      },
      {
        id: 'browse_packages',
        label: 'Explore planning packages',
        description: 'Compare coordination and planning services.',
        task_type: 'browse_packages'
      },
      {
        id: 'explore_tools',
        label: 'Use planning tools',
        description: 'Manage guests, timeline, and budget in one place.',
        task_type: 'explore_tools'
      }
    ];

    return {
      featured_venues: featuredVenues,
      featured_photographers: featuredPhotographers,
      featured_packages: featuredPackages,
      quick_tasks: quickTasks
    };
  }

  // ------------------------
  // Vendor listing & details
  // ------------------------

  getVendorFilterOptions(category) {
    var vendors = this._getVendors().filter(function (v) { return v.category === category; });

    var citiesMap = {};
    var statesMap = {};
    var minPrice = null;
    var maxPrice = null;
    var minCapacity = null;
    var maxCapacity = null;
    var serviceTypesMap = {};
    var decorSubcategoriesMap = {};

    for (var i = 0; i < vendors.length; i++) {
      var v = vendors[i];
      if (v.location_city) citiesMap[v.location_city] = true;
      if (v.location_state) statesMap[v.location_state] = true;

      var price = null;
      if (category === 'catering' && v.price_per_person != null) {
        price = Number(v.price_per_person);
      } else if ((category === 'photographers' || category === 'djs') && v.hourly_rate != null) {
        price = Number(v.hourly_rate);
      } else if (v.base_price != null) {
        price = Number(v.base_price);
      }
      if (price != null && !isNaN(price)) {
        if (minPrice === null || price < minPrice) minPrice = price;
        if (maxPrice === null || price > maxPrice) maxPrice = price;
      }

      if (v.capacity_min_guests != null) {
        var cmin = Number(v.capacity_min_guests) || 0;
        if (minCapacity === null || cmin < minCapacity) minCapacity = cmin;
      }
      if (v.capacity_max_guests != null) {
        var cmax = Number(v.capacity_max_guests) || 0;
        if (maxCapacity === null || cmax > maxCapacity) maxCapacity = cmax;
      }

      if (category === 'catering' && v.catering_service_type) {
        serviceTypesMap[v.catering_service_type] = true;
      }

      if (category === 'decor_rentals' && v.decor_subcategory) {
        decorSubcategoriesMap[v.decor_subcategory] = true;
      }
    }

    var locationCities = Object.keys(citiesMap);
    var locationStates = Object.keys(statesMap);

    var priceRange = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 10000,
      step: 50,
      currency: 'USD'
    };

    var capacityRange = {
      min: minCapacity !== null ? minCapacity : 0,
      max: maxCapacity !== null ? maxCapacity : 500,
      step: 10
    };

    var ratingOptions = [
      { value: 4.5, label: '4.5 stars and up' },
      { value: 4.0, label: '4.0 stars and up' },
      { value: 3.5, label: '3.5 stars and up' }
    ];

    var cateringServiceTypes = Object.keys(serviceTypesMap);
    if (!cateringServiceTypes.length && category === 'catering') {
      cateringServiceTypes = ['buffet', 'plated', 'family_style', 'cocktail_style', 'food_truck', 'dessert_bar'];
    }

    var dietaryOptions = ['vegetarian', 'vegan', 'gluten_free'];

    var decorSubcategories = Object.keys(decorSubcategoriesMap);
    if (!decorSubcategories.length && category === 'decor_rentals') {
      decorSubcategories = ['lighting', 'centerpieces', 'linens', 'furniture', 'signage', 'other'];
    }

    var sortingOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'rating_low_to_high', label: 'Rating: Low to High' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      category: category,
      location_cities: locationCities,
      location_states: locationStates,
      price_range: priceRange,
      capacity_range: capacityRange,
      rating_options: ratingOptions,
      catering_service_types: cateringServiceTypes,
      dietary_options: dietaryOptions,
      decor_subcategories: decorSubcategories,
      sorting_options: sortingOptions
    };
  }

  searchVendors(category, query, filters, sort, page, page_size) {
    filters = filters || {};
    sort = sort || 'relevance';
    page = page || 1;
    page_size = page_size || 20;

    var vendors = this._getVendors().filter(function (v) { return v.category === category; });

    if (query && typeof query === 'string') {
      var q = query.toLowerCase();
      vendors = vendors.filter(function (v) {
        return (v.name && v.name.toLowerCase().indexOf(q) !== -1) ||
               (v.description && v.description.toLowerCase().indexOf(q) !== -1);
      });
    }

    if (filters.location_city) {
      vendors = vendors.filter(function (v) { return v.location_city === filters.location_city; });
    }
    if (filters.location_state) {
      vendors = vendors.filter(function (v) { return v.location_state === filters.location_state; });
    }

    if (filters.event_date) {
      var dateStr = String(filters.event_date);
      vendors = vendors.filter(function (v) {
        if (!Array.isArray(v.available_dates) || !v.available_dates.length) return false;
        return v.available_dates.some(function (d) {
          return typeof d === 'string' && d.indexOf(dateStr) === 0;
        });
      });
    }

    if (filters.min_capacity != null) {
      var minCap = Number(filters.min_capacity) || 0;
      vendors = vendors.filter(function (v) {
        return (v.capacity_max_guests != null && Number(v.capacity_max_guests) >= minCap);
      });
    }
    if (filters.max_capacity != null) {
      var maxCap = Number(filters.max_capacity) || 0;
      vendors = vendors.filter(function (v) {
        return (v.capacity_min_guests != null && Number(v.capacity_min_guests) <= maxCap);
      });
    }

    if (filters.min_price != null) {
      var minPrice = Number(filters.min_price) || 0;
      vendors = vendors.filter(function (v) {
        return v.base_price != null && Number(v.base_price) >= minPrice;
      });
    }
    if (filters.max_price != null) {
      var maxPrice = Number(filters.max_price) || 0;
      vendors = vendors.filter(function (v) {
        return v.base_price != null && Number(v.base_price) <= maxPrice;
      });
    }

    if (filters.max_hourly_rate != null) {
      var maxHr = Number(filters.max_hourly_rate) || 0;
      vendors = vendors.filter(function (v) {
        return v.hourly_rate != null && Number(v.hourly_rate) <= maxHr;
      });
    }

    if (filters.max_price_per_person != null) {
      var maxPp = Number(filters.max_price_per_person) || 0;
      vendors = vendors.filter(function (v) {
        return v.price_per_person != null && Number(v.price_per_person) <= maxPp;
      });
    }

    if (filters.min_rating != null) {
      var minRating = Number(filters.min_rating) || 0;
      vendors = vendors.filter(function (v) {
        return v.rating != null && Number(v.rating) >= minRating;
      });
    }

    if (filters.catering_service_type) {
      vendors = vendors.filter(function (v) {
        return v.catering_service_type === filters.catering_service_type;
      });
    }

    if (filters.dietary_options && Array.isArray(filters.dietary_options) && filters.dietary_options.length) {
      vendors = vendors.filter(function (v) {
        if (!Array.isArray(v.dietary_options)) return false;
        for (var i = 0; i < filters.dietary_options.length; i++) {
          if (v.dietary_options.indexOf(filters.dietary_options[i]) === -1) {
            return false;
          }
        }
        return true;
      });
    }

    if (filters.decor_subcategory) {
      vendors = vendors.filter(function (v) {
        return v.decor_subcategory === filters.decor_subcategory;
      });
    }

    if (sort === 'price_low_to_high' || sort === 'price_high_to_low') {
      vendors.sort(function (a, b) {
        function getPrice(v) {
          if (v.pricing_model === 'per_person' && v.price_per_person != null) {
            return Number(v.price_per_person) || 0;
          }
          if (v.pricing_model === 'per_hour' && v.hourly_rate != null) {
            return Number(v.hourly_rate) || 0;
          }
          if (v.base_price != null) return Number(v.base_price) || 0;
          return 0;
        }
        var pa = getPrice(a);
        var pb = getPrice(b);
        return sort === 'price_low_to_high' ? pa - pb : pb - pa;
      });
    } else if (sort === 'rating_high_to_low' || sort === 'rating_low_to_high') {
      vendors.sort(function (a, b) {
        var ra = a.rating || 0;
        var rb = b.rating || 0;
        return sort === 'rating_high_to_low' ? rb - ra : ra - rb;
      });
    }

    var total = vendors.length;
    var start = (page - 1) * page_size;
    var end = start + page_size;
    var slice = vendors.slice(start, end);

    var favorites = this._getOrCreateFavorites();
    var favoriteIds = favorites.items.map(function (it) { return it.vendor_id; });
    var plan = this._getOrCreatePlan();
    var planVendorIds = plan.items
      .filter(function (it) { return !!it.vendor_id; })
      .map(function (it) { return it.vendor_id; });

    var results = slice.map(function (v) {
      var locationDisplay = '';
      if (v.location_city && v.location_state) {
        locationDisplay = v.location_city + ', ' + v.location_state;
      } else if (v.location_city) {
        locationDisplay = v.location_city;
      } else if (v.location_state) {
        locationDisplay = v.location_state;
      } else if (v.location_country) {
        locationDisplay = v.location_country;
      }

      var priceVal = null;
      if (v.pricing_model === 'per_person' && v.price_per_person != null) {
        priceVal = v.price_per_person;
      } else if (v.pricing_model === 'per_hour' && v.hourly_rate != null) {
        priceVal = v.hourly_rate;
      } else if (v.base_price != null) {
        priceVal = v.base_price;
      }
      var priceDisplay = priceVal != null ? ('$' + Number(priceVal).toFixed(2)) : '';

      var ratingDisplay = '';
      if (v.rating != null) {
        ratingDisplay = v.rating.toFixed(1);
        if (v.rating_count != null) {
          ratingDisplay += ' (' + v.rating_count + ')';
        }
      }

      return {
        vendor: v,
        category_name: v.category,
        location_display: locationDisplay,
        price_display: priceDisplay,
        rating_display: ratingDisplay,
        thumbnail_image: Array.isArray(v.images) && v.images.length ? v.images[0] : null,
        is_favorited: favoriteIds.indexOf(v.id) !== -1,
        is_in_plan: planVendorIds.indexOf(v.id) !== -1
      };
    });

    return {
      total_results: total,
      page: page,
      page_size: page_size,
      results: results
    };
  }

  getVendorDetails(vendorId) {
    var vendors = this._getVendors();
    var vendor = vendors.find(function (v) { return v.id === vendorId; }) || null;
    if (!vendor) {
      return {
        vendor: null,
        category_name: null,
        location_display: '',
        price_display: '',
        rating_display: '',
        is_favorited: false,
        is_in_plan: false,
        availability_summary: '',
        supported_actions: {
          can_request_consultation: false,
          can_add_to_cart: false,
          can_add_to_plan: false,
          can_favorite: false
        }
      };
    }

    var favorites = this._getOrCreateFavorites();
    var plan = this._getOrCreatePlan();
    var isFav = favorites.items.some(function (it) { return it.vendor_id === vendorId; });
    var isInPlan = plan.items.some(function (it) { return it.vendor_id === vendorId; });

    var locationDisplay = '';
    if (vendor.location_city && vendor.location_state) {
      locationDisplay = vendor.location_city + ', ' + vendor.location_state;
    } else if (vendor.location_city) {
      locationDisplay = vendor.location_city;
    } else if (vendor.location_state) {
      locationDisplay = vendor.location_state;
    } else if (vendor.location_country) {
      locationDisplay = vendor.location_country;
    }

    var priceVal = null;
    if (vendor.pricing_model === 'per_person' && vendor.price_per_person != null) {
      priceVal = vendor.price_per_person;
    } else if (vendor.pricing_model === 'per_hour' && vendor.hourly_rate != null) {
      priceVal = vendor.hourly_rate;
    } else if (vendor.base_price != null) {
      priceVal = vendor.base_price;
    }
    var priceDisplay = priceVal != null ? ('$' + Number(priceVal).toFixed(2)) : '';

    var ratingDisplay = '';
    if (vendor.rating != null) {
      ratingDisplay = vendor.rating.toFixed(1);
      if (vendor.rating_count != null) {
        ratingDisplay += ' (' + vendor.rating_count + ')';
      }
    }

    var availabilitySummary = '';
    if (Array.isArray(vendor.available_dates) && vendor.available_dates.length) {
      availabilitySummary = 'Available on ' + vendor.available_dates.length + ' date(s).';
    }

    var supportedActions = {
      can_request_consultation: vendor.category === 'photographers',
      can_add_to_cart: vendor.category === 'catering',
      can_add_to_plan: true,
      can_favorite: true
    };

    return {
      vendor: vendor,
      category_name: vendor.category,
      location_display: locationDisplay,
      price_display: priceDisplay,
      rating_display: ratingDisplay,
      is_favorited: isFav,
      is_in_plan: isInPlan,
      availability_summary: availabilitySummary,
      supported_actions: supportedActions
    };
  }

  toggleFavoriteVendor(vendorId) {
    var vendors = this._getVendors();
    var vendor = vendors.find(function (v) { return v.id === vendorId; }) || null;
    if (!vendor) {
      return { vendorId: vendorId, is_favorited: false, favorites_count: 0 };
    }

    var favorites = this._getOrCreateFavorites();
    var items = favorites.items || [];
    var index = items.findIndex(function (it) { return it.vendor_id === vendorId; });

    if (index === -1) {
      items.push({
        id: this._generateId('favorite_item'),
        vendor_id: vendorId,
        vendor_category: vendor.category,
        added_at: this._now()
      });
    } else {
      items.splice(index, 1);
    }
    favorites.items = items;
    favorites.updated_at = this._now();
    this._persistState('favorites', favorites);

    return {
      vendorId: vendorId,
      is_favorited: index === -1,
      favorites_count: favorites.items.length
    };
  }

  getFavoritesList() {
    var favorites = this._getOrCreateFavorites();
    var vendors = this._getVendors();

    var itemsWithVendor = favorites.items.map(function (it) {
      var vendor = vendors.find(function (v) { return v.id === it.vendor_id; }) || null;
      var clone = Object.assign({}, it);
      clone.vendor = vendor;
      return clone;
    });

    var grouped = {
      venues: [],
      photographers: [],
      catering: [],
      decor_rentals: [],
      djs: []
    };

    var seen = {};
    for (var i = 0; i < itemsWithVendor.length; i++) {
      var item = itemsWithVendor[i];
      if (!item.vendor) continue;
      var cat = item.vendor.category;
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      if (!seen[item.vendor.id]) {
        grouped[cat].push(item.vendor);
        seen[item.vendor.id] = true;
      }
    }

    var favoritesClone = Object.assign({}, favorites, { items: itemsWithVendor });

    return {
      favorites: favoritesClone,
      grouped_items: grouped
    };
  }

  saveFavoritesList() {
    var favorites = this._getOrCreateFavorites();
    favorites.updated_at = this._now();
    this._persistState('favorites', favorites);
    return {
      success: true,
      favorites: favorites,
      message: 'Favorites list saved.'
    };
  }

  // ------------------------
  // Plan (My Plan)
  // ------------------------

  addVendorToPlan(vendorId, estimated_price_override) {
    var vendors = this._getVendors();
    var vendor = vendors.find(function (v) { return v.id === vendorId; }) || null;
    if (!vendor) {
      return { plan: this._getOrCreatePlan(), added_item_id: null };
    }

    var plan = this._getOrCreatePlan();

    var estimatedPrice = 0;
    if (estimated_price_override != null && !isNaN(estimated_price_override)) {
      estimatedPrice = Number(estimated_price_override);
    } else if (vendor.base_price != null) {
      estimatedPrice = Number(vendor.base_price) || 0;
    } else if (vendor.price_per_person != null) {
      estimatedPrice = Number(vendor.price_per_person) || 0;
    } else if (vendor.hourly_rate != null) {
      estimatedPrice = Number(vendor.hourly_rate) || 0;
    }

    var itemId = this._generateId('plan_item');
    plan.items.push({
      id: itemId,
      item_type: 'vendor',
      vendor_id: vendorId,
      package_id: null,
      vendor_category: vendor.category,
      estimated_price: estimatedPrice
    });

    this._recalculatePlanTotal(plan);
    this._persistState('plans', plan);

    return {
      plan: plan,
      added_item_id: itemId
    };
  }

  getPlanSummary() {
    var plan = this._getOrCreatePlan();
    var vendors = this._getVendors();
    var packages = this._getPackages();

    var itemsWithResolved = plan.items.map(function (it) {
      var clone = Object.assign({}, it);
      if (clone.vendor_id) {
        clone.vendor = vendors.find(function (v) { return v.id === clone.vendor_id; }) || null;
      }
      if (clone.package_id) {
        clone.package = packages.find(function (p) { return p.id === clone.package_id; }) || null;
      }
      return clone;
    });

    var planClone = Object.assign({}, plan, { items: itemsWithResolved });

    return {
      plan: planClone,
      formatted_total_estimated_price: this._formatCurrency(plan.total_estimated_price || 0, 'USD')
    };
  }

  removeItemFromPlan(planItemId) {
    var plan = this._getOrCreatePlan();
    plan.items = plan.items.filter(function (it) { return it.id !== planItemId; });
    this._recalculatePlanTotal(plan);
    this._persistState('plans', plan);
    return {
      plan: plan
    };
  }

  savePlan(status) {
    var plan = this._getOrCreatePlan();
    if (status) {
      plan.status = status;
    } else {
      plan.status = 'locked';
    }
    plan.updated_at = this._now();
    this._persistState('plans', plan);
    return {
      plan: plan,
      message: 'Plan saved.'
    };
  }

  // ------------------------
  // Cart (Catering)
  // ------------------------

  addCateringMenuToCart(vendorId, guest_count, deposit_option) {
    var vendors = this._getVendors();
    var vendor = vendors.find(function (v) { return v.id === vendorId; }) || null;
    if (!vendor) {
      return { cart: this._getOrCreateCart(), added_item_id: null, message: 'Vendor not found.' };
    }

    var cart = this._getOrCreateCart();
    var unitPrice = vendor.price_per_person != null ? Number(vendor.price_per_person) : (vendor.base_price != null ? Number(vendor.base_price) : 0);

    var itemId = this._generateId('cart_item');
    cart.items.push({
      id: itemId,
      vendor_id: vendorId,
      vendor_category: vendor.category,
      guest_count: Number(guest_count) || 0,
      deposit_option: deposit_option || 'full_amount',
      unit_price: unitPrice,
      deposit_amount: 0,
      line_total: 0
    });

    this._recalculateCartTotals(cart);
    this._persistState('cart', cart);

    return {
      cart: cart,
      added_item_id: itemId,
      message: 'Item added to cart.'
    };
  }

  getCart() {
    var cart = this._getOrCreateCart();
    var vendors = this._getVendors();

    var itemsWithVendor = cart.items.map(function (it) {
      var vendor = vendors.find(function (v) { return v.id === it.vendor_id; }) || null;
      var clone = Object.assign({}, it);
      clone.vendor = vendor;
      return clone;
    });

    var cartClone = Object.assign({}, cart, { items: itemsWithVendor });

    return {
      cart: cartClone
    };
  }

  updateCartItem(cartItemId, guest_count, deposit_option) {
    var cart = this._getOrCreateCart();
    var items = cart.items;
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === cartItemId) {
        if (guest_count != null) {
          items[i].guest_count = Number(guest_count) || 0;
        }
        if (deposit_option) {
          items[i].deposit_option = deposit_option;
        }
        break;
      }
    }
    this._recalculateCartTotals(cart);
    this._persistState('cart', cart);

    var cartWithVendors = this.getCart().cart;

    return {
      cart: cartWithVendors,
      message: 'Cart updated.'
    };
  }

  removeCartItem(cartItemId) {
    var cart = this._getOrCreateCart();
    cart.items = cart.items.filter(function (it) { return it.id !== cartItemId; });
    this._recalculateCartTotals(cart);
    this._persistState('cart', cart);

    var cartWithVendors = this.getCart().cart;

    return {
      cart: cartWithVendors
    };
  }

  // ------------------------
  // Consultation Requests
  // ------------------------

  requestConsultation(vendorId, requested_date, requested_time, name, email, message) {
    var vendors = this._getVendors();
    var vendor = vendors.find(function (v) { return v.id === vendorId; }) || null;
    if (!vendor) {
      return {
        success: false,
        consultation_request: null,
        message: 'Vendor not found.'
      };
    }

    var datetime = String(requested_date) + 'T' + String(requested_time) + ':00';
    var now = this._now();

    var consultationRequests = this._getFromStorage('consultation_requests', []);
    var request = {
      id: this._generateId('consultation'),
      vendor_id: vendorId,
      vendor_category: vendor.category,
      requested_datetime: datetime,
      name: name,
      email: email,
      message: message || '',
      status: 'pending',
      created_at: now,
      updated_at: now
    };
    consultationRequests.push(request);
    this._persistState('consultation_requests', consultationRequests);

    var reqWithVendor = Object.assign({}, request, { vendor: vendor });

    return {
      success: true,
      consultation_request: reqWithVendor,
      message: 'Consultation request submitted.'
    };
  }

  // ------------------------
  // Packages & Package Booking
  // ------------------------

  getPackageFilterOptions() {
    var packages = this._getPackages();

    var minPrice = null;
    var maxPrice = null;
    var serviceMap = {};

    for (var i = 0; i < packages.length; i++) {
      var p = packages[i];
      if (p.price != null) {
        var price = Number(p.price) || 0;
        if (minPrice === null || price < minPrice) minPrice = price;
        if (maxPrice === null || price > maxPrice) maxPrice = price;
      }
      if (Array.isArray(p.included_services)) {
        for (var j = 0; j < p.included_services.length; j++) {
          serviceMap[p.included_services[j]] = true;
        }
      }
    }

    var priceRange = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 10000,
      step: 50,
      currency: 'USD'
    };

    var includedServicesOptions = Object.keys(serviceMap).map(function (val) {
      return { value: val, label: val.split('_').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' ') };
    });

    if (!includedServicesOptions.length) {
      var defaults = [
        'day_of_coordination',
        'vendor_management',
        'full_planning',
        'partial_planning',
        'design_consultation',
        'budget_management',
        'timeline_creation',
        'rehearsal_management'
      ];
      includedServicesOptions = defaults.map(function (val) {
        return { value: val, label: val.split('_').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' ') };
      });
    }

    var sortingOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'rating_low_to_high', label: 'Rating: Low to High' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      price_range: priceRange,
      included_services_options: includedServicesOptions,
      sorting_options: sortingOptions
    };
  }

  searchPackages(filters, sort, page, page_size) {
    filters = filters || {};
    sort = sort || 'relevance';
    page = page || 1;
    page_size = page_size || 20;

    var packages = this._getPackages();

    if (filters.min_price != null) {
      var minPrice = Number(filters.min_price) || 0;
      packages = packages.filter(function (p) { return p.price != null && Number(p.price) >= minPrice; });
    }

    if (filters.max_price != null) {
      var maxPrice = Number(filters.max_price) || 0;
      packages = packages.filter(function (p) { return p.price != null && Number(p.price) <= maxPrice; });
    }

    if (filters.included_services && Array.isArray(filters.included_services) && filters.included_services.length) {
      packages = packages.filter(function (p) {
        if (!Array.isArray(p.included_services)) return false;
        for (var i = 0; i < filters.included_services.length; i++) {
          if (p.included_services.indexOf(filters.included_services[i]) === -1) return false;
        }
        return true;
      });
    }

    if (filters.min_rating != null) {
      var minRating = Number(filters.min_rating) || 0;
      packages = packages.filter(function (p) { return p.rating != null && Number(p.rating) >= minRating; });
    }

    if (sort === 'price_low_to_high' || sort === 'price_high_to_low') {
      packages.sort(function (a, b) {
        var pa = Number(a.price) || 0;
        var pb = Number(b.price) || 0;
        return sort === 'price_low_to_high' ? pa - pb : pb - pa;
      });
    } else if (sort === 'rating_high_to_low' || sort === 'rating_low_to_high') {
      packages.sort(function (a, b) {
        var ra = a.rating || 0;
        var rb = b.rating || 0;
        return sort === 'rating_high_to_low' ? rb - ra : ra - rb;
      });
    }

    var total = packages.length;
    var start = (page - 1) * page_size;
    var end = start + page_size;

    return {
      total_results: total,
      page: page,
      page_size: page_size,
      results: packages.slice(start, end)
    };
  }

  getPackageDetails(packageId) {
    var packages = this._getPackages();
    var pkg = packages.find(function (p) { return p.id === packageId; }) || null;
    if (!pkg) {
      return {
        package: null,
        included_services_labels: []
      };
    }

    var labels = Array.isArray(pkg.included_services)
      ? pkg.included_services.map(this._titleCaseFromEnum.bind(this))
      : [];

    return {
      package: pkg,
      included_services_labels: labels
    };
  }

  createOrUpdatePackageBooking(packageId, tentative_date) {
    var packages = this._getPackages();
    var pkg = packages.find(function (p) { return p.id === packageId; }) || null;
    var bookings = this._getFromStorage('package_bookings', []);
    var existing = bookings.find(function (b) { return b.package_id === packageId && b.status === 'in_review'; }) || null;
    var now = this._now();

    if (existing) {
      existing.tentative_date = tentative_date;
      existing.updated_at = now;
    } else {
      existing = {
        id: this._generateId('package_booking'),
        package_id: packageId,
        tentative_date: tentative_date,
        status: 'in_review',
        created_at: now,
        updated_at: now
      };
      bookings.push(existing);
    }

    this._persistState('package_bookings', bookings);

    return {
      package_booking: existing,
      package: pkg || null
    };
  }

  getPackageBookingReview(bookingId) {
    var bookings = this._getFromStorage('package_bookings', []);
    var booking = bookings.find(function (b) { return b.id === bookingId; }) || null;
    var packages = this._getPackages();
    var pkg = booking ? packages.find(function (p) { return p.id === booking.package_id; }) || null : null;

    var priceDisplay = pkg ? this._formatCurrency(pkg.price || 0, pkg.currency || 'USD') : '';

    return {
      package_booking: booking,
      package: pkg,
      price_display: priceDisplay
    };
  }

  finalizePackageBooking(bookingId, add_to_plan) {
    if (add_to_plan === undefined || add_to_plan === null) {
      add_to_plan = true;
    }
    var bookings = this._getFromStorage('package_bookings', []);
    var booking = bookings.find(function (b) { return b.id === bookingId; }) || null;
    if (!booking) {
      return {
        package_booking: null,
        plan: this._getOrCreatePlan()
      };
    }

    booking.status = 'confirmed';
    booking.updated_at = this._now();
    this._persistState('package_bookings', bookings);

    var plan = this._getOrCreatePlan();
    var packages = this._getPackages();
    var pkg = packages.find(function (p) { return p.id === booking.package_id; }) || null;

    if (add_to_plan && pkg) {
      var itemId = this._generateId('plan_item');
      plan.items.push({
        id: itemId,
        item_type: 'package',
        vendor_id: null,
        package_id: booking.package_id,
        vendor_category: null,
        estimated_price: Number(pkg.price) || 0
      });
      this._recalculatePlanTotal(plan);
      this._persistState('plans', plan);
    }

    var vendors = this._getVendors();
    var packagesAll = this._getPackages();
    var itemsWithResolved = plan.items.map(function (it) {
      var clone = Object.assign({}, it);
      if (clone.vendor_id) {
        clone.vendor = vendors.find(function (v) { return v.id === clone.vendor_id; }) || null;
      }
      if (clone.package_id) {
        clone.package = packagesAll.find(function (p) { return p.id === clone.package_id; }) || null;
      }
      return clone;
    });
    var planClone = Object.assign({}, plan, { items: itemsWithResolved });

    return {
      package_booking: booking,
      plan: planClone
    };
  }

  // ------------------------
  // Planning Tools Overview
  // ------------------------

  getPlanningToolsOverview() {
    var budgetState = this.getBudgetPlannerState();
    var guestState = this.getGuestList();
    var timelines = this._getFromStorage('timelines', []);

    var budgetStatus = 'not_started';
    var budgetSummary = 'No budget set yet.';
    if (budgetState && budgetState.budget_plan && budgetState.budget_plan.total_budget > 0) {
      var alloc = budgetState.allocation_summary;
      budgetStatus = alloc.is_balanced ? 'completed' : 'in_progress';
      budgetSummary = 'Total ' + this._formatCurrency(budgetState.budget_plan.total_budget, 'USD') + ', allocated ' + this._formatCurrency(alloc.allocated_total, 'USD') + '.';
    }

    var guestStatus = 'not_started';
    var guestSummary = 'No guests added yet.';
    if (guestState && guestState.guest_list && Array.isArray(guestState.guest_list.guests) && guestState.guest_list.guests.length) {
      guestStatus = 'in_progress';
      guestSummary = guestState.guest_list.guests.length + ' guest(s) added.';
    }

    var timelineStatus = 'not_started';
    var timelineSummary = 'No timelines created yet.';
    if (Array.isArray(timelines) && timelines.length) {
      timelineStatus = 'in_progress';
      timelineSummary = timelines.length + ' timeline(s) created.';
    }

    return {
      tools: [
        {
          tool_id: 'budget_planner',
          name: 'Budget Planner',
          description: 'Set and allocate your wedding budget.',
          status: budgetStatus,
          summary: budgetSummary
        },
        {
          tool_id: 'guest_list',
          name: 'Guest List',
          description: 'Track guests and meal preferences.',
          status: guestStatus,
          summary: guestSummary
        },
        {
          tool_id: 'timeline',
          name: 'Timeline',
          description: 'Plan your wedding day schedule.',
          status: timelineStatus,
          summary: timelineSummary
        }
      ]
    };
  }

  // ------------------------
  // Budget Planner
  // ------------------------

  getBudgetPlannerState() {
    var budgetPlan = this._getFromStorage('budget_plans', null);
    if (!budgetPlan) {
      var now = this._now();
      budgetPlan = {
        id: this._generateId('budget_plan'),
        name: 'Wedding Budget',
        total_budget: 0,
        categories: [],
        notes: '',
        created_at: now,
        updated_at: now
      };
      this._persistState('budget_plans', budgetPlan);
    }
    var summary = this._recalculateBudgetAllocationSummary(budgetPlan);
    return {
      budget_plan: budgetPlan,
      allocation_summary: summary
    };
  }

  saveBudgetPlan(total_budget, categories, notes) {
    var existing = this._getFromStorage('budget_plans', null);
    var now = this._now();
    var id = existing && existing.id ? existing.id : this._generateId('budget_plan');

    var normalizedCategories = (categories || []).map(function (cat) {
      return {
        id: cat.id && typeof cat.id === 'string' && cat.id.length ? cat.id : null,
        name: cat.name,
        amount: Number(cat.amount) || 0
      };
    });

    for (var i = 0; i < normalizedCategories.length; i++) {
      if (!normalizedCategories[i].id) {
        normalizedCategories[i].id = this._generateId('budget_category');
      }
    }

    var budgetPlan = {
      id: id,
      name: existing && existing.name ? existing.name : 'Wedding Budget',
      total_budget: Number(total_budget) || 0,
      categories: normalizedCategories,
      notes: notes || '',
      created_at: existing && existing.created_at ? existing.created_at : now,
      updated_at: now
    };

    this._persistState('budget_plans', budgetPlan);
    var summary = this._recalculateBudgetAllocationSummary(budgetPlan);

    return {
      budget_plan: budgetPlan,
      allocation_summary: summary,
      message: 'Budget plan saved.'
    };
  }

  // ------------------------
  // Guest List
  // ------------------------

  _getOrCreateGuestListInternal() {
    var guestList = this._getFromStorage('guest_lists', null);
    if (!guestList) {
      var now = this._now();
      guestList = {
        id: this._generateId('guest_list'),
        name: 'Wedding Guests',
        guests: [],
        created_at: now,
        updated_at: now
      };
      this._persistState('guest_lists', guestList);
    }
    return guestList;
  }

  getGuestList() {
    var guestList = this._getOrCreateGuestListInternal();
    var mealPreferenceOptions = ['no_preference', 'vegetarian', 'vegan', 'gluten_free', 'other'];
    return {
      guest_list: guestList,
      meal_preference_options: mealPreferenceOptions
    };
  }

  bulkAddGuests(names) {
    var guestList = this._getOrCreateGuestListInternal();
    var count = 0;
    if (Array.isArray(names)) {
      for (var i = 0; i < names.length; i++) {
        var name = names[i];
        if (!name) continue;
        guestList.guests.push({
          id: this._generateId('guest'),
          name: String(name),
          meal_preference: 'no_preference'
        });
        count++;
      }
    }
    guestList.updated_at = this._now();
    this._persistState('guest_lists', guestList);

    return {
      guest_list: guestList,
      added_count: count
    };
  }

  updateGuestMealPreference(guestId, meal_preference) {
    var guestList = this._getOrCreateGuestListInternal();
    var updatedGuest = null;
    for (var i = 0; i < guestList.guests.length; i++) {
      if (guestList.guests[i].id === guestId) {
        guestList.guests[i].meal_preference = meal_preference;
        updatedGuest = {
          id: guestList.guests[i].id,
          name: guestList.guests[i].name,
          meal_preference: guestList.guests[i].meal_preference
        };
        break;
      }
    }
    guestList.updated_at = this._now();
    this._persistState('guest_lists', guestList);
    return {
      guest_list: guestList,
      updated_guest: updatedGuest
    };
  }

  filterGuestsByMealPreference(meal_preference) {
    var guestList = this._getOrCreateGuestListInternal();
    var filtered = guestList.guests.filter(function (g) { return g.meal_preference === meal_preference; });
    return {
      filtered_guests: filtered
    };
  }

  saveGuestList() {
    var guestList = this._getOrCreateGuestListInternal();
    guestList.updated_at = this._now();
    this._persistState('guest_lists', guestList);
    return {
      guest_list: guestList,
      message: 'Guest list saved.'
    };
  }

  // ------------------------
  // Timeline
  // ------------------------

  getTimelineForDate(event_date) {
    var timelines = this._getFromStorage('timelines', []);
    var timeline = timelines.find(function (t) { return t.event_date === event_date; }) || null;
    if (!timeline) {
      var now = this._now();
      timeline = {
        id: this._generateId('timeline'),
        name: 'Timeline for ' + event_date,
        event_date: event_date,
        events: [],
        created_at: now,
        updated_at: now
      };
      timelines.push(timeline);
      this._persistState('timelines', timelines);
    }
    return {
      timeline: timeline
    };
  }

  saveTimeline(event_date, events) {
    var timelines = this._getFromStorage('timelines', []);
    var index = timelines.findIndex(function (t) { return t.event_date === event_date; });
    var now = this._now();
    var timeline;

    if (index === -1) {
      timeline = {
        id: this._generateId('timeline'),
        name: 'Timeline for ' + event_date,
        event_date: event_date,
        events: [],
        created_at: now,
        updated_at: now
      };
      timelines.push(timeline);
      index = timelines.length - 1;
    } else {
      timeline = timelines[index];
      timeline.updated_at = now;
    }

    var normalizedEvents = (events || []).map(function (ev, idx) {
      return {
        id: ev.id && typeof ev.id === 'string' && ev.id.length ? ev.id : null,
        title: ev.title,
        start_time: ev.start_time,
        notes: ev.notes || '',
        order_index: ev.order_index != null ? ev.order_index : idx
      };
    });

    for (var i = 0; i < normalizedEvents.length; i++) {
      if (!normalizedEvents[i].id) {
        normalizedEvents[i].id = this._generateId('timeline_event');
      }
    }

    normalizedEvents.sort(function (a, b) {
      var tA = a.start_time || '';
      var tB = b.start_time || '';
      if (tA < tB) return -1;
      if (tA > tB) return 1;
      return (a.order_index || 0) - (b.order_index || 0);
    });

    timeline.events = normalizedEvents;
    timeline.updated_at = now;
    timelines[index] = timeline;
    this._persistState('timelines', timelines);

    return {
      timeline: timeline,
      message: 'Timeline saved.'
    };
  }

  // ------------------------
  // Static Content & Contact
  // ------------------------

  getAboutContent() {
    return {
      heading: 'About Our Wedding Planning Services',
      body: 'We provide tools and curated vendors to help couples plan unforgettable weddings. From venues and photographers to catering, decor, and day-of coordination, our platform keeps everything organized in one place.',
      highlights: [
        'Curated, rated vendors across key wedding categories',
        'Planning tools for budget, guest list, and timeline',
        'Flexible packages from day-of coordination to full planning'
      ]
    };
  }

  getContactInfo() {
    return {
      email: 'support@weddingplanner.example.com',
      phone: '+1 (555) 123-4567',
      service_hours: 'Mon-Fri, 9:00 AM - 6:00 PM (Central Time)',
      address: '123 Wedding Lane, Suite 200, Chicago, IL 60601'
    };
  }

  submitContactForm(name, email, subject, message) {
    var messages = this._getFromStorage('contact_messages', []);
    var now = this._now();
    var msg = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      created_at: now
    };
    messages.push(msg);
    this._persistState('contact_messages', messages);

    return {
      success: true,
      message: 'Your message has been received.'
    };
  }

  getFaqContent() {
    return {
      sections: [
        {
          section_id: 'planning_tools',
          title: 'Planning Tools',
          faqs: [
            {
              question: 'How do I start a wedding budget?',
              answer: 'Open the Budget Planner from the Planning Tools menu, set your total budget, and allocate amounts to categories such as venue, catering, and photography.'
            },
            {
              question: 'Can I update my guest list later?',
              answer: 'Yes. You can add, edit, or remove guests and adjust meal preferences at any time. Changes are saved automatically when you use the Save option.'
            }
          ]
        },
        {
          section_id: 'vendors',
          title: 'Vendors & Packages',
          faqs: [
            {
              question: 'Are vendors vetted?',
              answer: 'Vendors are added by our team or by partners and are shown with ratings and reviews so you can choose with confidence.'
            },
            {
              question: 'What happens after I request a consultation?',
              answer: 'Your request is sent to the vendor, who will reply by email to confirm availability and discuss next steps.'
            }
          ]
        }
      ]
    };
  }

  getTermsContent() {
    return {
      last_updated: '2024-01-01',
      body: 'These Terms & Conditions govern your use of our wedding planning platform. By using the site, you agree to comply with all applicable laws and the terms described here, including limitations of liability, acceptable use of planning tools, and vendor relationships.'
    };
  }

  getPrivacyContent() {
    return {
      last_updated: '2024-01-01',
      body: 'We respect your privacy. We store your planning data (such as budgets, guest lists, and selected vendors) to provide and improve our services. We do not sell your personal information. For full details on what we collect, how we use it, and your choices, please review this Privacy Policy.'
    };
  }
}

// Global export for browser and Node.js
if (typeof globalThis !== 'undefined') {
  globalThis.BusinessLogic = BusinessLogic;
  globalThis.WebsiteSDK = new BusinessLogic();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
