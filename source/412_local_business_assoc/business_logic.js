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
  }

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const tables = [
      'business_categories',
      'businesses',
      'comparison_lists',
      'comparison_list_items',
      'membership_plans',
      'membership_applications',
      'events',
      'event_registrations',
      'sponsorship_packages',
      'sponsorship_orders',
      'resource_categories',
      'resources',
      'reading_lists',
      'reading_list_items',
      'deal_categories',
      'deals',
      'coupon_wallets',
      'coupon_wallet_items',
      'job_listings',
      'leadership_profiles',
      'contact_messages',
      'business_contact_messages',
      'navigation_links'
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

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
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

  _now() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _paginateResults(items, page = 1, pageSize = 20) {
    const total = items.length;
    const p = Math.max(1, page || 1);
    const s = Math.max(1, pageSize || 20);
    const start = (p - 1) * s;
    const results = items.slice(start, start + s);
    return { total, page: p, pageSize: s, results };
  }

  _validateDateRange(startStr, endStr) {
    let start = this._parseDate(startStr);
    let end = this._parseDate(endStr);

    if (!start && !end) {
      return { start: null, end: null };
    }

    if (!start && end) {
      // if only end provided, use beginning of today as start
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      start = today;
    }

    if (start && !end) {
      // if only start provided, leave end null
      return { start: start.toISOString(), end: null };
    }

    if (start && end && start > end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    return {
      start: start ? start.toISOString() : null,
      end: end ? end.toISOString() : null
    };
  }

  _getOrCreateComparisonList() {
    const idKey = 'currentComparisonListId';
    let currentId = localStorage.getItem(idKey);
    let lists = this._getFromStorage('comparison_lists', []);
    let list = currentId ? lists.find(l => l.id === currentId) : null;

    if (!list) {
      list = {
        id: this._generateId('cmp'),
        name: 'Business Comparison',
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('comparison_lists', lists);
      localStorage.setItem(idKey, list.id);
    }

    return list;
  }

  _getOrCreateReadingList() {
    const idKey = 'currentReadingListId';
    let currentId = localStorage.getItem(idKey);
    let lists = this._getFromStorage('reading_lists', []);
    let list = currentId ? lists.find(l => l.id === currentId) : null;

    if (!list) {
      list = {
        id: this._generateId('read'),
        name: 'Reading List',
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
      localStorage.setItem(idKey, list.id);
    }

    return list;
  }

  _getOrCreateCouponWallet() {
    const idKey = 'currentCouponWalletId';
    let currentId = localStorage.getItem(idKey);
    let wallets = this._getFromStorage('coupon_wallets', []);
    let wallet = currentId ? wallets.find(w => w.id === currentId) : null;

    if (!wallet) {
      wallet = {
        id: this._generateId('coup'),
        name: 'Coupon Wallet',
        created_at: this._now(),
        updated_at: this._now()
      };
      wallets.push(wallet);
      this._saveToStorage('coupon_wallets', wallets);
      localStorage.setItem(idKey, wallet.id);
    }

    return wallet;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomepageHighlights()
  getHomepageHighlights() {
    const events = this._getFromStorage('events', []);
    const deals = this._getFromStorage('deals', []);
    const resources = this._getFromStorage('resources', []);
    const dealCategories = this._getFromStorage('deal_categories', []);
    const businesses = this._getFromStorage('businesses', []);
    const resourceCategories = this._getFromStorage('resource_categories', []);

    // Featured events: upcoming scheduled, soonest first, limit 3
    const now = new Date();
    const featured_events = events
      .filter(e => e.status === 'scheduled' && this._parseDate(e.start_datetime) && this._parseDate(e.start_datetime) >= now)
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      })
      .slice(0, 3)
      .map(e => ({
        event_id: e.id,
        title: e.title,
        event_type: e.event_type,
        start_datetime: e.start_datetime,
        time_of_day: e.time_of_day,
        location_name: e.location_name,
        city: e.city,
        ticket_price: e.ticket_price,
        currency: e.currency
      }));

    // Featured deals: active, not expired, earliest expiry, limit 3
    const featured_deals = deals
      .filter(d => d.is_active !== false && this._parseDate(d.expiry_date) && this._parseDate(d.expiry_date) >= now)
      .sort((a, b) => {
        const da = this._parseDate(a.expiry_date) || new Date(8640000000000000);
        const db = this._parseDate(b.expiry_date) || new Date(8640000000000000);
        return da - db;
      })
      .slice(0, 3)
      .map(d => {
        const category = d.category_id ? dealCategories.find(c => c.id === d.category_id) : null;
        const business = d.business_id ? businesses.find(b => b.id === d.business_id) : null;
        return {
          deal_id: d.id,
          title: d.title,
          discount_percent: d.discount_percent,
          expiry_date: d.expiry_date,
          category_name: category ? category.name : null,
          business_name: business ? business.name : null
        };
      });

    // Featured resources: prefer is_featured, else newest, limit 3
    let sortedResources = resources.slice();
    sortedResources.sort((a, b) => {
      const af = a.is_featured ? 1 : 0;
      const bf = b.is_featured ? 1 : 0;
      if (af !== bf) return bf - af;
      const da = this._parseDate(a.published_at) || new Date(0);
      const db = this._parseDate(b.published_at) || new Date(0);
      return db - da;
    });

    const featured_resources = sortedResources.slice(0, 3).map(r => {
      const category = resourceCategories.find(c => c.id === r.category_id);
      return {
        resource_id: r.id,
        title: r.title,
        summary: r.summary,
        category_name: category ? category.name : null,
        published_at: r.published_at,
        is_featured: !!r.is_featured
      };
    });

    const membership_cta = {
      headline: 'Grow your business with local connections',
      subheadline: 'Join the association to access networking events, promotion opportunities, and member-only benefits.',
      primary_button_label: 'View Memberships',
      secondary_button_label: 'Contact Us'
    };

    return {
      featured_events,
      featured_deals,
      featured_resources,
      membership_cta
    };
  }

  // getBusinessDirectoryFilterOptions()
  getBusinessDirectoryFilterOptions() {
    const categories = this._getFromStorage('business_categories', []);
    const businesses = this._getFromStorage('businesses', []);

    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';
    let minRating = null;
    let maxRating = null;

    for (const b of businesses) {
      if (typeof b.average_price === 'number') {
        if (minPrice === null || b.average_price < minPrice) minPrice = b.average_price;
        if (maxPrice === null || b.average_price > maxPrice) maxPrice = b.average_price;
        if (b.price_currency) currency = b.price_currency;
      }
      if (typeof b.average_rating === 'number') {
        if (minRating === null || b.average_rating < minRating) minRating = b.average_rating;
        if (maxRating === null || b.average_rating > maxRating) maxRating = b.average_rating;
      }
    }

    const price_range = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      step: 1,
      currency
    };

    const rating_range = {
      min: minRating !== null ? minRating : 0,
      max: maxRating !== null ? maxRating : 5,
      step: 0.5
    };

    const categoriesFormatted = categories.map(c => ({
      category_id: c.id,
      name: c.name,
      description: c.description || null
    }));

    const service_type_options = [
      'breakfast',
      'lunch',
      'dinner',
      'brunch',
      'takeout',
      'delivery',
      'other'
    ];

    const distance_options_miles = [
      { value: 5, label: 'Within 5 miles' },
      { value: 10, label: 'Within 10 miles' },
      { value: 25, label: 'Within 25 miles' },
      { value: 50, label: 'Within 50 miles' }
    ];

    const sort_options = [
      { value: 'rating_desc', label: 'Rating - High to Low' },
      { value: 'distance_asc', label: 'Distance - Closest first' },
      { value: 'name_asc', label: 'Name - A to Z' },
      { value: 'price_asc', label: 'Price - Low to High' }
    ];

    return {
      categories: categoriesFormatted,
      price_range,
      service_type_options,
      rating_range,
      distance_options_miles,
      sort_options
    };
  }

  // searchBusinesses(query, filters, sort, page, pageSize)
  searchBusinesses(query, filters, sort, page, pageSize) {
    const businesses = this._getFromStorage('businesses', []);
    const categories = this._getFromStorage('business_categories', []);
    const comparisonItems = this._getFromStorage('comparison_list_items', []);
    const comparisonLists = this._getFromStorage('comparison_lists', []);
    const currentComparisonListId = localStorage.getItem('currentComparisonListId');

    let listItemIds = new Set();
    if (currentComparisonListId) {
      for (const item of comparisonItems) {
        if (item.comparison_list_id === currentComparisonListId) {
          listItemIds.add(item.business_id);
        }
      }
    }

    let results = businesses.slice();

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      results = results.filter(b => {
        return (
          (b.name && b.name.toLowerCase().includes(q)) ||
          (b.description && b.description.toLowerCase().includes(q))
        );
      });
    }

    if (filters && typeof filters === 'object') {
      if (filters.categoryId) {
        results = results.filter(b => b.category_id === filters.categoryId);
      }
      if (typeof filters.minAveragePrice === 'number') {
        results = results.filter(b => typeof b.average_price === 'number' && b.average_price >= filters.minAveragePrice);
      }
      if (typeof filters.maxAveragePrice === 'number') {
        results = results.filter(b => typeof b.average_price === 'number' && b.average_price <= filters.maxAveragePrice);
      }
      if (filters.serviceTypes && Array.isArray(filters.serviceTypes) && filters.serviceTypes.length > 0) {
        results = results.filter(b => {
          if (!Array.isArray(b.service_types)) return false;
          return filters.serviceTypes.some(st => b.service_types.includes(st));
        });
      }
      if (typeof filters.minRating === 'number') {
        results = results.filter(b => typeof b.average_rating === 'number' && b.average_rating >= filters.minRating);
      }
      if (typeof filters.maxDistanceFromCityCenterMiles === 'number') {
        results = results.filter(b => typeof b.distance_from_city_center_miles === 'number' && b.distance_from_city_center_miles <= filters.maxDistanceFromCityCenterMiles);
      }
      if (filters.city) {
        const cityLower = filters.city.toLowerCase();
        results = results.filter(b => b.city && b.city.toLowerCase() === cityLower);
      }
      if (filters.state) {
        const stateLower = filters.state.toLowerCase();
        results = results.filter(b => b.state && b.state.toLowerCase() === stateLower);
      }
    }

    // Sorting
    const sortKey = sort || 'rating_desc';
    results.sort((a, b) => {
      switch (sortKey) {
        case 'distance_asc': {
          const da = typeof a.distance_from_city_center_miles === 'number' ? a.distance_from_city_center_miles : Number.POSITIVE_INFINITY;
          const db = typeof b.distance_from_city_center_miles === 'number' ? b.distance_from_city_center_miles : Number.POSITIVE_INFINITY;
          return da - db;
        }
        case 'name_asc': {
          const na = (a.name || '').toLowerCase();
          const nb = (b.name || '').toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return 0;
        }
        case 'price_asc': {
          const pa = typeof a.average_price === 'number' ? a.average_price : Number.POSITIVE_INFINITY;
          const pb = typeof b.average_price === 'number' ? b.average_price : Number.POSITIVE_INFINITY;
          return pa - pb;
        }
        case 'rating_desc':
        default: {
          const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
          const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
          if (rb !== ra) return rb - ra;
          const na = (a.name || '').toLowerCase();
          const nb = (b.name || '').toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return 0;
        }
      }
    });

    const paged = this._paginateResults(results, page, pageSize);

    const mappedResults = paged.results.map(b => {
      const category = categories.find(c => c.id === b.category_id);
      return {
        business_id: b.id,
        name: b.name,
        category_id: b.category_id,
        category_name: category ? category.name : null,
        description: b.description || null,
        average_price: b.average_price,
        price_currency: b.price_currency || null,
        service_types: Array.isArray(b.service_types) ? b.service_types : [],
        address: b.address || null,
        city: b.city || null,
        state: b.state || null,
        postal_code: b.postal_code || null,
        distance_from_city_center_miles: b.distance_from_city_center_miles,
        phone: b.phone || null,
        website: b.website || null,
        average_rating: b.average_rating,
        rating_count: b.rating_count,
        is_in_comparison_list: listItemIds.has(b.id),
        // Foreign key resolution: category
        category: category || null
      };
    });

    return {
      total: paged.total,
      page: paged.page,
      pageSize: paged.pageSize,
      results: mappedResults
    };
  }

  // getBusinessDetails(businessId)
  getBusinessDetails(businessId) {
    const businesses = this._getFromStorage('businesses', []);
    const categories = this._getFromStorage('business_categories', []);
    const comparisonItems = this._getFromStorage('comparison_list_items', []);
    const currentComparisonListId = localStorage.getItem('currentComparisonListId');

    const b = businesses.find(x => x.id === businessId);
    if (!b) {
      return null;
    }

    let isInComparison = false;
    if (currentComparisonListId) {
      isInComparison = comparisonItems.some(item => item.comparison_list_id === currentComparisonListId && item.business_id === businessId);
    }

    const category = categories.find(c => c.id === b.category_id);

    return {
      business_id: b.id,
      name: b.name,
      category_id: b.category_id,
      category_name: category ? category.name : null,
      description: b.description || null,
      average_price: b.average_price,
      price_currency: b.price_currency || null,
      service_types: Array.isArray(b.service_types) ? b.service_types : [],
      address: b.address || null,
      city: b.city || null,
      state: b.state || null,
      postal_code: b.postal_code || null,
      latitude: b.latitude,
      longitude: b.longitude,
      distance_from_city_center_miles: b.distance_from_city_center_miles,
      phone: b.phone || null,
      email: b.email || null,
      website: b.website || null,
      average_rating: b.average_rating,
      rating_count: b.rating_count,
      is_in_comparison_list: isInComparison,
      // Foreign key resolution
      category: category || null
    };
  }

  // addBusinessToComparison(businessId)
  addBusinessToComparison(businessId) {
    const businesses = this._getFromStorage('businesses', []);
    const categories = this._getFromStorage('business_categories', []);
    const comparisonList = this._getOrCreateComparisonList();
    let items = this._getFromStorage('comparison_list_items', []);

    const business = businesses.find(b => b.id === businessId);
    if (!business) {
      return {
        success: false,
        message: 'Business not found',
        comparison_list: null
      };
    }

    const existing = items.find(i => i.comparison_list_id === comparisonList.id && i.business_id === businessId);
    if (!existing) {
      const newItem = {
        id: this._generateId('cmp_item'),
        comparison_list_id: comparisonList.id,
        business_id: businessId,
        added_at: this._now()
      };
      items.push(newItem);
      comparisonList.updated_at = this._now();
      const lists = this._getFromStorage('comparison_lists', []);
      const idx = lists.findIndex(l => l.id === comparisonList.id);
      if (idx >= 0) {
        lists[idx] = comparisonList;
        this._saveToStorage('comparison_lists', lists);
      }
      this._saveToStorage('comparison_list_items', items);
    }

    const updatedItems = items
      .filter(i => i.comparison_list_id === comparisonList.id)
      .map(i => {
        const b = businesses.find(bb => bb.id === i.business_id);
        const category = b ? categories.find(c => c.id === b.category_id) : null;
        return {
          business_id: i.business_id,
          business_name: b ? b.name : null,
          category_name: category ? category.name : null,
          average_price: b ? b.average_price : null,
          price_currency: b ? b.price_currency : null,
          average_rating: b ? b.average_rating : null,
          // Foreign key resolution
          business: b || null,
          category: category || null
        };
      });

    return {
      success: true,
      message: 'Business added to comparison list',
      comparison_list: {
        comparison_list_id: comparisonList.id,
        name: comparisonList.name,
        items: updatedItems
      }
    };
  }

  // removeBusinessFromComparison(businessId)
  removeBusinessFromComparison(businessId) {
    const currentComparisonListId = localStorage.getItem('currentComparisonListId');
    if (!currentComparisonListId) {
      return {
        success: false,
        message: 'No comparison list found',
        comparison_list: null
      };
    }

    const businesses = this._getFromStorage('businesses', []);
    const categories = this._getFromStorage('business_categories', []);
    const lists = this._getFromStorage('comparison_lists', []);
    let items = this._getFromStorage('comparison_list_items', []);

    const list = lists.find(l => l.id === currentComparisonListId);
    if (!list) {
      return {
        success: false,
        message: 'Comparison list not found',
        comparison_list: null
      };
    }

    const beforeLen = items.length;
    items = items.filter(i => !(i.comparison_list_id === list.id && i.business_id === businessId));
    const afterLen = items.length;

    list.updated_at = this._now();
    const listIdx = lists.findIndex(l => l.id === list.id);
    if (listIdx >= 0) {
      lists[listIdx] = list;
      this._saveToStorage('comparison_lists', lists);
    }
    this._saveToStorage('comparison_list_items', items);

    const updatedItems = items
      .filter(i => i.comparison_list_id === list.id)
      .map(i => {
        const b = businesses.find(bb => bb.id === i.business_id);
        const category = b ? categories.find(c => c.id === b.category_id) : null;
        return {
          business_id: i.business_id,
          business_name: b ? b.name : null,
          category_name: category ? category.name : null,
          average_price: b ? b.average_price : null,
          price_currency: b ? b.price_currency : null,
          average_rating: b ? b.average_rating : null,
          business: b || null,
          category: category || null
        };
      });

    return {
      success: afterLen < beforeLen,
      message: afterLen < beforeLen ? 'Business removed from comparison list' : 'Business was not in comparison list',
      comparison_list: {
        comparison_list_id: list.id,
        name: list.name,
        items: updatedItems
      }
    };
  }

  // getComparisonList()
  getComparisonList() {
    const comparisonList = this._getOrCreateComparisonList();
    const businesses = this._getFromStorage('businesses', []);
    const categories = this._getFromStorage('business_categories', []);
    const items = this._getFromStorage('comparison_list_items', []);

    const listItems = items
      .filter(i => i.comparison_list_id === comparisonList.id)
      .map(i => {
        const b = businesses.find(bb => bb.id === i.business_id);
        const category = b ? categories.find(c => c.id === b.category_id) : null;
        return {
          business_id: i.business_id,
          business_name: b ? b.name : null,
          category_name: category ? category.name : null,
          average_price: b ? b.average_price : null,
          price_currency: b ? b.price_currency : null,
          average_rating: b ? b.average_rating : null,
          business: b || null,
          category: category || null
        };
      });

    return {
      comparison_list_id: comparisonList.id,
      name: comparisonList.name,
      items: listItems
    };
  }

  // getRelatedBusinesses(businessId, limit)
  getRelatedBusinesses(businessId, limit = 3) {
    const businesses = this._getFromStorage('businesses', []);
    const categories = this._getFromStorage('business_categories', []);
    const base = businesses.find(b => b.id === businessId);
    if (!base) return [];

    const related = businesses
      .filter(b => b.id !== base.id && b.category_id === base.category_id)
      .sort((a, b) => {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (rb !== ra) return rb - ra;
        const da = typeof a.distance_from_city_center_miles === 'number' ? a.distance_from_city_center_miles : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_from_city_center_miles === 'number' ? b.distance_from_city_center_miles : Number.POSITIVE_INFINITY;
        return da - db;
      })
      .slice(0, limit)
      .map(b => {
        const category = categories.find(c => c.id === b.category_id);
        return {
          business_id: b.id,
          name: b.name,
          category_name: category ? category.name : null,
          average_rating: b.average_rating,
          distance_from_city_center_miles: b.distance_from_city_center_miles,
          category: category || null
        };
      });

    return related;
  }

  // getSavedListsOverview()
  getSavedListsOverview() {
    const comparison = this.getComparisonList();
    const reading = this.getReadingList();
    const coupon = this.getCouponWallet();

    const comparison_list_summary = {
      count: comparison.items.length,
      items: comparison.items.map(i => ({
        business_id: i.business_id,
        business_name: i.business_name,
        average_rating: i.average_rating
      }))
    };

    const reading_list_summary = {
      count: reading.items.length,
      items: reading.items.map(i => ({
        resource_id: i.resource_id,
        title: i.title,
        category_name: i.category_name
      }))
    };

    const coupon_wallet_summary = {
      count: coupon.items.length,
      items: coupon.items.map(i => ({
        deal_id: i.deal_id,
        title: i.title,
        discount_percent: i.discount_percent
      }))
    };

    return {
      comparison_list_summary,
      reading_list_summary,
      coupon_wallet_summary
    };
  }

  // getReadingList()
  getReadingList() {
    const list = this._getOrCreateReadingList();
    const items = this._getFromStorage('reading_list_items', []);
    const resources = this._getFromStorage('resources', []);
    const categories = this._getFromStorage('resource_categories', []);

    const mappedItems = items
      .filter(i => i.reading_list_id === list.id)
      .map(i => {
        const r = resources.find(rr => rr.id === i.resource_id);
        const category = r ? categories.find(c => c.id === r.category_id) : null;
        return {
          resource_id: i.resource_id,
          title: r ? r.title : null,
          category_name: category ? category.name : null,
          published_at: r ? r.published_at : null,
          is_featured: r ? !!r.is_featured : false,
          resource: r || null,
          category: category || null
        };
      });

    return {
      reading_list_id: list.id,
      name: list.name,
      items: mappedItems
    };
  }

  // addResourceToReadingList(resourceId)
  addResourceToReadingList(resourceId) {
    const list = this._getOrCreateReadingList();
    let items = this._getFromStorage('reading_list_items', []);
    const resources = this._getFromStorage('resources', []);
    const categories = this._getFromStorage('resource_categories', []);

    const resource = resources.find(r => r.id === resourceId);
    if (!resource) {
      return {
        success: false,
        message: 'Resource not found',
        reading_list: null
      };
    }

    const exists = items.some(i => i.reading_list_id === list.id && i.resource_id === resourceId);
    if (!exists) {
      const newItem = {
        id: this._generateId('read_item'),
        reading_list_id: list.id,
        resource_id: resourceId,
        added_at: this._now()
      };
      items.push(newItem);
      list.updated_at = this._now();
      const lists = this._getFromStorage('reading_lists', []);
      const idx = lists.findIndex(l => l.id === list.id);
      if (idx >= 0) {
        lists[idx] = list;
        this._saveToStorage('reading_lists', lists);
      }
      this._saveToStorage('reading_list_items', items);
    }

    const mappedItems = items
      .filter(i => i.reading_list_id === list.id)
      .map(i => {
        const r = resources.find(rr => rr.id === i.resource_id);
        const category = r ? categories.find(c => c.id === r.category_id) : null;
        return {
          resource_id: i.resource_id,
          title: r ? r.title : null,
          resource: r || null,
          category: category || null
        };
      });

    return {
      success: true,
      message: 'Resource added to reading list',
      reading_list: {
        reading_list_id: list.id,
        name: list.name,
        items: mappedItems
      }
    };
  }

  // removeResourceFromReadingList(resourceId)
  removeResourceFromReadingList(resourceId) {
    const currentReadingListId = localStorage.getItem('currentReadingListId');
    if (!currentReadingListId) {
      return {
        success: false,
        message: 'No reading list found'
      };
    }
    let items = this._getFromStorage('reading_list_items', []);
    const beforeLen = items.length;
    items = items.filter(i => !(i.reading_list_id === currentReadingListId && i.resource_id === resourceId));
    this._saveToStorage('reading_list_items', items);

    return {
      success: items.length < beforeLen,
      message: items.length < beforeLen ? 'Resource removed from reading list' : 'Resource was not in reading list'
    };
  }

  // getCouponWallet()
  getCouponWallet() {
    const wallet = this._getOrCreateCouponWallet();
    const items = this._getFromStorage('coupon_wallet_items', []);
    const deals = this._getFromStorage('deals', []);
    const dealCategories = this._getFromStorage('deal_categories', []);
    const businesses = this._getFromStorage('businesses', []);

    const mappedItems = items
      .filter(i => i.coupon_wallet_id === wallet.id)
      .map(i => {
        const d = deals.find(dd => dd.id === i.deal_id);
        const category = d && d.category_id ? dealCategories.find(c => c.id === d.category_id) : null;
        const business = d && d.business_id ? businesses.find(b => b.id === d.business_id) : null;
        return {
          deal_id: i.deal_id,
          title: d ? d.title : null,
          discount_percent: d ? d.discount_percent : null,
          expiry_date: d ? d.expiry_date : null,
          category_name: category ? category.name : null,
          business_name: business ? business.name : null,
          deal: d || null,
          category: category || null,
          business: business || null
        };
      });

    return {
      coupon_wallet_id: wallet.id,
      name: wallet.name,
      items: mappedItems
    };
  }

  // addDealToCouponWallet(dealId)
  addDealToCouponWallet(dealId) {
    const wallet = this._getOrCreateCouponWallet();
    let items = this._getFromStorage('coupon_wallet_items', []);
    const deals = this._getFromStorage('deals', []);
    const dealCategories = this._getFromStorage('deal_categories', []);
    const businesses = this._getFromStorage('businesses', []);

    const deal = deals.find(d => d.id === dealId);
    if (!deal) {
      return {
        success: false,
        message: 'Deal not found',
        coupon_wallet: null
      };
    }

    const exists = items.some(i => i.coupon_wallet_id === wallet.id && i.deal_id === dealId);
    if (!exists) {
      const newItem = {
        id: this._generateId('coup_item'),
        coupon_wallet_id: wallet.id,
        deal_id: dealId,
        saved_at: this._now()
      };
      items.push(newItem);
      wallet.updated_at = this._now();
      const wallets = this._getFromStorage('coupon_wallets', []);
      const idx = wallets.findIndex(w => w.id === wallet.id);
      if (idx >= 0) {
        wallets[idx] = wallet;
        this._saveToStorage('coupon_wallets', wallets);
      }
      this._saveToStorage('coupon_wallet_items', items);
    }

    const mappedItems = items
      .filter(i => i.coupon_wallet_id === wallet.id)
      .map(i => {
        const d = deals.find(dd => dd.id === i.deal_id);
        const category = d && d.category_id ? dealCategories.find(c => c.id === d.category_id) : null;
        const business = d && d.business_id ? businesses.find(b => b.id === d.business_id) : null;
        return {
          deal_id: i.deal_id,
          title: d ? d.title : null,
          deal: d || null,
          category: category || null,
          business: business || null
        };
      });

    return {
      success: true,
      message: 'Deal added to coupon wallet',
      coupon_wallet: {
        coupon_wallet_id: wallet.id,
        name: wallet.name,
        items: mappedItems
      }
    };
  }

  // removeDealFromCouponWallet(dealId)
  removeDealFromCouponWallet(dealId) {
    const currentCouponWalletId = localStorage.getItem('currentCouponWalletId');
    if (!currentCouponWalletId) {
      return {
        success: false,
        message: 'No coupon wallet found'
      };
    }
    let items = this._getFromStorage('coupon_wallet_items', []);
    const beforeLen = items.length;
    items = items.filter(i => !(i.coupon_wallet_id === currentCouponWalletId && i.deal_id === dealId));
    this._saveToStorage('coupon_wallet_items', items);

    return {
      success: items.length < beforeLen,
      message: items.length < beforeLen ? 'Deal removed from coupon wallet' : 'Deal was not in coupon wallet'
    };
  }

  // getMembershipOverviewContent()
  getMembershipOverviewContent() {
    const plans = this._getFromStorage('membership_plans', []);

    const intro_html = '<p>Our business association connects local companies with resources, advocacy, and community.</p>';

    const benefits = [
      {
        title: 'Networking & Referrals',
        description: 'Meet other local business owners and generate new referrals through regular events.'
      },
      {
        title: 'Marketing & Promotion',
        description: 'Get listed in our online directory and be featured in association promotions.'
      },
      {
        title: 'Advocacy',
        description: 'Have a voice in local policy that impacts your business.'
      }
    ];

    const typeLabels = {
      business: 'Business Membership',
      individual: 'Individual Membership',
      nonprofit: 'Nonprofit Membership'
    };

    const membershipTypeMap = {};
    for (const p of plans) {
      if (p.plan_type && !membershipTypeMap[p.plan_type]) {
        membershipTypeMap[p.plan_type] = {
          plan_type: p.plan_type,
          label: typeLabels[p.plan_type] || p.plan_type,
          description: ''
        };
      }
    }
    const membership_types = Object.values(membershipTypeMap);

    const businessPlans = plans.filter(p => p.plan_type === 'business' && (p.is_active !== false));

    businessPlans.sort((a, b) => {
      const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
      const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
      return pa - pb;
    });

    const featured_business_plans = businessPlans.slice(0, 3).map(p => ({
      plan_id: p.id,
      name: p.name,
      price: p.price,
      currency: p.currency || 'USD',
      billing_cycle: p.billing_cycle || 'annual',
      min_employees: p.min_employees,
      max_employees: p.max_employees
    }));

    return {
      intro_html,
      benefits,
      membership_types,
      featured_business_plans
    };
  }

  // getMembershipFilterOptions()
  getMembershipFilterOptions() {
    const plans = this._getFromStorage('membership_plans', []);

    const rangesMap = {};
    for (const p of plans) {
      if (p.plan_type !== 'business') continue;
      const key = (p.min_employees || 0) + '-' + (p.max_employees || 0);
      if (!rangesMap[key]) {
        const label = (p.min_employees != null && p.max_employees != null)
          ? p.min_employees + '-' + p.max_employees + ' employees'
          : (p.min_employees != null ? p.min_employees + '+ employees' : 'All sizes');
        rangesMap[key] = {
          min: p.min_employees || 0,
          max: p.max_employees || Number.POSITIVE_INFINITY,
          label
        };
      }
    }
    const employee_ranges = Object.values(rangesMap);

    const planTypesMap = {};
    const typeLabels = {
      business: 'Business',
      individual: 'Individual',
      nonprofit: 'Nonprofit'
    };
    for (const p of plans) {
      if (p.plan_type && !planTypesMap[p.plan_type]) {
        planTypesMap[p.plan_type] = {
          value: p.plan_type,
          label: typeLabels[p.plan_type] || p.plan_type
        };
      }
    }
    const plan_types = Object.values(planTypesMap);

    const sort_options = [
      { value: 'price_asc', label: 'Price - Low to High' },
      { value: 'price_desc', label: 'Price - High to Low' },
      { value: 'name_asc', label: 'Name - A to Z' }
    ];

    return {
      employee_ranges,
      plan_types,
      sort_options
    };
  }

  // getBusinessMembershipPlans(minEmployeesNeeded, maxEmployeesNeeded, sort, onlyActive)
  getBusinessMembershipPlans(minEmployeesNeeded, maxEmployeesNeeded, sort, onlyActive = true) {
    const plans = this._getFromStorage('membership_plans', []);

    let results = plans.filter(p => p.plan_type === 'business');

    if (onlyActive) {
      results = results.filter(p => p.is_active !== false);
    }

    if (typeof minEmployeesNeeded === 'number') {
      results = results.filter(p => {
        const min = typeof p.min_employees === 'number' ? p.min_employees : 0;
        const max = typeof p.max_employees === 'number' ? p.max_employees : Number.POSITIVE_INFINITY;
        return min <= minEmployeesNeeded && max >= minEmployeesNeeded;
      });
    }

    if (typeof maxEmployeesNeeded === 'number') {
      results = results.filter(p => {
        const min = typeof p.min_employees === 'number' ? p.min_employees : 0;
        return min <= maxEmployeesNeeded;
      });
    }

    const sortKey = sort || 'price_asc';
    results.sort((a, b) => {
      switch (sortKey) {
        case 'price_desc': {
          const pa = typeof a.price === 'number' ? a.price : 0;
          const pb = typeof b.price === 'number' ? b.price : 0;
          return pb - pa;
        }
        case 'name_asc': {
          const na = (a.name || '').toLowerCase();
          const nb = (b.name || '').toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return 0;
        }
        case 'price_asc':
        default: {
          const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
          const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
          return pa - pb;
        }
      }
    });

    return results.map(p => ({
      plan_id: p.id,
      name: p.name,
      description: p.description || null,
      plan_type: p.plan_type,
      min_employees: p.min_employees,
      max_employees: p.max_employees,
      price: p.price,
      currency: p.currency || 'USD',
      billing_cycle: p.billing_cycle || 'annual',
      is_active: p.is_active !== false
    }));
  }

  // prepareMembershipApplication(membershipPlanId)
  prepareMembershipApplication(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans', []);
    const plan = plans.find(p => p.id === membershipPlanId);
    if (!plan) {
      return {
        membership_plan: null,
        form_defaults: {
          business_name: '',
          number_of_employees: 0,
          billing_method: 'invoice',
          primary_contact_email: ''
        }
      };
    }

    return {
      membership_plan: {
        plan_id: plan.id,
        name: plan.name,
        description: plan.description || null,
        price: plan.price,
        currency: plan.currency || 'USD',
        billing_cycle: plan.billing_cycle || 'annual',
        min_employees: plan.min_employees,
        max_employees: plan.max_employees
      },
      form_defaults: {
        business_name: '',
        number_of_employees: plan.min_employees || 1,
        billing_method: 'invoice',
        primary_contact_email: ''
      }
    };
  }

  // reviewMembershipApplication(membershipPlanId, businessName, numberOfEmployees, billingMethod, primaryContactEmail)
  reviewMembershipApplication(membershipPlanId, businessName, numberOfEmployees, billingMethod, primaryContactEmail) {
    const plans = this._getFromStorage('membership_plans', []);
    const applications = this._getFromStorage('membership_applications', []);

    const validation_errors = [];
    const plan = plans.find(p => p.id === membershipPlanId);
    if (!plan) {
      validation_errors.push({ field: 'membershipPlanId', message: 'Selected membership plan not found.' });
    }
    if (!businessName || !businessName.trim()) {
      validation_errors.push({ field: 'businessName', message: 'Business name is required.' });
    }
    if (typeof numberOfEmployees !== 'number' || numberOfEmployees <= 0) {
      validation_errors.push({ field: 'numberOfEmployees', message: 'Number of employees must be a positive number.' });
    } else if (plan) {
      const min = typeof plan.min_employees === 'number' ? plan.min_employees : 0;
      const max = typeof plan.max_employees === 'number' ? plan.max_employees : Number.POSITIVE_INFINITY;
      if (numberOfEmployees < min || numberOfEmployees > max) {
        validation_errors.push({ field: 'numberOfEmployees', message: 'Selected plan does not support this employee count.' });
      }
    }
    if (billingMethod !== 'invoice' && billingMethod !== 'credit_card') {
      validation_errors.push({ field: 'billingMethod', message: 'Invalid billing method.' });
    }
    if (!primaryContactEmail || primaryContactEmail.indexOf('@') === -1) {
      validation_errors.push({ field: 'primaryContactEmail', message: 'Valid email is required.' });
    }

    if (validation_errors.length > 0) {
      return {
        application: null,
        success: false,
        validation_errors
      };
    }

    const application = {
      id: this._generateId('mapp'),
      membership_plan_id: membershipPlanId,
      business_name: businessName,
      number_of_employees: numberOfEmployees,
      billing_method: billingMethod,
      primary_contact_email: primaryContactEmail,
      status: 'in_review',
      created_at: this._now(),
      updated_at: this._now()
    };

    applications.push(application);
    this._saveToStorage('membership_applications', applications);

    return {
      application: {
        application_id: application.id,
        membership_plan_id: application.membership_plan_id,
        business_name: application.business_name,
        number_of_employees: application.number_of_employees,
        billing_method: application.billing_method,
        primary_contact_email: application.primary_contact_email,
        status: application.status
      },
      success: true,
      validation_errors: []
    };
  }

  // submitMembershipApplication(applicationId)
  submitMembershipApplication(applicationId) {
    const applications = this._getFromStorage('membership_applications', []);
    const idx = applications.findIndex(a => a.id === applicationId);
    if (idx === -1) {
      return {
        application: null,
        success: false,
        message: 'Application not found.'
      };
    }

    const application = applications[idx];
    application.status = 'submitted';
    application.updated_at = this._now();
    applications[idx] = application;
    this._saveToStorage('membership_applications', applications);

    return {
      application: {
        application_id: application.id,
        status: application.status
      },
      success: true,
      message: 'Application submitted.'
    };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    const eventTypeMap = {};
    for (const e of events) {
      if (e.event_type && !eventTypeMap[e.event_type]) {
        const label = e.event_type.charAt(0).toUpperCase() + e.event_type.slice(1);
        eventTypeMap[e.event_type] = { value: e.event_type, label };
      }
    }
    const event_types = Object.values(eventTypeMap);

    const time_of_day_options = [
      { value: 'morning', label: 'Morning (before 12 pm)' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'all_day', label: 'All day' }
    ];

    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';
    for (const e of events) {
      if (typeof e.ticket_price === 'number') {
        if (minPrice === null || e.ticket_price < minPrice) minPrice = e.ticket_price;
        if (maxPrice === null || e.ticket_price > maxPrice) maxPrice = e.ticket_price;
        if (e.currency) currency = e.currency;
      }
    }

    const price_range = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      step: 1,
      currency
    };

    const date_presets = [
      { key: 'next_7_days', label: 'Next 7 days', num_days: 7 },
      { key: 'next_30_days', label: 'Next 30 days', num_days: 30 }
    ];

    const sort_options = [
      { value: 'date_asc', label: 'Date - Soonest first' },
      { value: 'date_desc', label: 'Date - Latest first' },
      { value: 'price_asc', label: 'Price - Low to High' }
    ];

    return {
      event_types,
      time_of_day_options,
      price_range,
      date_presets,
      sort_options
    };
  }

  // searchEvents(query, filters, sort, page, pageSize)
  searchEvents(query, filters, sort, page, pageSize) {
    let events = this._getFromStorage('events', []);

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      events = events.filter(e => (
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q))
      ));
    }

    if (filters && typeof filters === 'object') {
      if (filters.eventType) {
        events = events.filter(e => e.event_type === filters.eventType);
      }
      if (filters.timeOfDay) {
        events = events.filter(e => e.time_of_day === filters.timeOfDay);
      }
      if (typeof filters.maxTicketPrice === 'number') {
        events = events.filter(e => typeof e.ticket_price === 'number' && e.ticket_price <= filters.maxTicketPrice);
      }
      if (filters.status) {
        events = events.filter(e => e.status === filters.status);
      }
      if (filters.dateRangeStart || filters.dateRangeEnd) {
        const range = this._validateDateRange(filters.dateRangeStart, filters.dateRangeEnd);
        events = events.filter(e => {
          const start = this._parseDate(e.start_datetime);
          if (!start) return false;
          if (range.start && start < this._parseDate(range.start)) return false;
          if (range.end && start > this._parseDate(range.end)) return false;
          return true;
        });
      }
    }

    const sortKey = sort || 'date_asc';
    events.sort((a, b) => {
      switch (sortKey) {
        case 'date_desc': {
          const da = this._parseDate(a.start_datetime) || new Date(0);
          const db = this._parseDate(b.start_datetime) || new Date(0);
          return db - da;
        }
        case 'price_asc': {
          const pa = typeof a.ticket_price === 'number' ? a.ticket_price : Number.POSITIVE_INFINITY;
          const pb = typeof b.ticket_price === 'number' ? b.ticket_price : Number.POSITIVE_INFINITY;
          return pa - pb;
        }
        case 'date_asc':
        default: {
          const da = this._parseDate(a.start_datetime) || new Date(0);
          const db = this._parseDate(b.start_datetime) || new Date(0);
          return da - db;
        }
      }
    });

    const paged = this._paginateResults(events, page, pageSize);

    const mapped = paged.results.map(e => ({
      event_id: e.id,
      title: e.title,
      description_short: e.description || null,
      event_type: e.event_type,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime,
      time_of_day: e.time_of_day,
      location_name: e.location_name,
      city: e.city,
      state: e.state,
      ticket_price: e.ticket_price,
      currency: e.currency,
      status: e.status
    }));

    return {
      total: paged.total,
      page: paged.page,
      pageSize: paged.pageSize,
      results: mapped
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const e = events.find(ev => ev.id === eventId);
    if (!e) return null;

    return {
      event_id: e.id,
      title: e.title,
      description: e.description || null,
      event_type: e.event_type,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime,
      time_of_day: e.time_of_day,
      location_name: e.location_name,
      address: e.address || null,
      city: e.city || null,
      state: e.state || null,
      postal_code: e.postal_code || null,
      ticket_price: e.ticket_price,
      currency: e.currency,
      status: e.status,
      remaining_tickets: e.remaining_tickets
    };
  }

  // registerForEvent(eventId, numTickets, attendeeName)
  registerForEvent(eventId, numTickets, attendeeName) {
    const events = this._getFromStorage('events', []);
    const registrations = this._getFromStorage('event_registrations', []);

    const eIdx = events.findIndex(ev => ev.id === eventId);
    if (eIdx === -1) {
      return {
        registration_id: null,
        event_id: eventId,
        num_tickets: numTickets,
        attendee_name: attendeeName,
        status: 'pending',
        success: false,
        message: 'Event not found.'
      };
    }

    const event = events[eIdx];
    if (event.status !== 'scheduled') {
      return {
        registration_id: null,
        event_id: eventId,
        num_tickets: numTickets,
        attendee_name: attendeeName,
        status: 'pending',
        success: false,
        message: 'Event is not open for registration.'
      };
    }

    if (typeof numTickets !== 'number' || numTickets <= 0) {
      return {
        registration_id: null,
        event_id: eventId,
        num_tickets: numTickets,
        attendee_name: attendeeName,
        status: 'pending',
        success: false,
        message: 'Number of tickets must be positive.'
      };
    }

    if (typeof event.remaining_tickets === 'number' && event.remaining_tickets < numTickets) {
      return {
        registration_id: null,
        event_id: eventId,
        num_tickets: numTickets,
        attendee_name: attendeeName,
        status: 'pending',
        success: false,
        message: 'Not enough tickets remaining.'
      };
    }

    const reg = {
      id: this._generateId('ereg'),
      event_id: eventId,
      num_tickets: numTickets,
      attendee_name: attendeeName,
      registration_datetime: this._now(),
      status: 'confirmed'
    };
    registrations.push(reg);

    if (typeof event.remaining_tickets === 'number') {
      event.remaining_tickets = event.remaining_tickets - numTickets;
      if (event.remaining_tickets < 0) event.remaining_tickets = 0;
    }
    events[eIdx] = event;

    this._saveToStorage('event_registrations', registrations);
    this._saveToStorage('events', events);

    return {
      registration_id: reg.id,
      event_id: reg.event_id,
      num_tickets: reg.num_tickets,
      attendee_name: reg.attendee_name,
      status: reg.status,
      success: true,
      message: 'Registration confirmed.'
    };
  }

  // getSponsorshipFilterOptions()
  getSponsorshipFilterOptions() {
    const events = this._getFromStorage('events', []);
    const packages = this._getFromStorage('sponsorship_packages', []);

    const eventsList = events.map(e => ({
      event_id: e.id,
      title: e.title,
      event_type: e.event_type
    }));

    const benefitSet = new Set();
    for (const p of packages) {
      if (Array.isArray(p.benefits)) {
        for (const b of p.benefits) {
          benefitSet.add(b);
        }
      }
    }
    const benefit_options = Array.from(benefitSet);

    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';
    for (const p of packages) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
        if (p.currency) currency = p.currency;
      }
    }
    const budget_range = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      step: 50,
      currency
    };

    const sort_options = [
      { value: 'price_asc', label: 'Price - Low to High' },
      { value: 'price_desc', label: 'Price - High to Low' },
      { value: 'display_order', label: 'Featured order' }
    ];

    return {
      events: eventsList,
      benefit_options,
      budget_range,
      sort_options
    };
  }

  // searchSponsorshipPackages(filters, sort)
  searchSponsorshipPackages(filters, sort) {
    const packages = this._getFromStorage('sponsorship_packages', []);
    const events = this._getFromStorage('events', []);

    let results = packages.slice();

    if (filters && typeof filters === 'object') {
      if (filters.eventId) {
        results = results.filter(p => p.event_id === filters.eventId);
      }
      if (typeof filters.includesLogoOnWebsite === 'boolean') {
        results = results.filter(p => !!p.includes_logo_on_website === filters.includesLogoOnWebsite);
      }
      if (typeof filters.minPrice === 'number') {
        results = results.filter(p => typeof p.price === 'number' && p.price >= filters.minPrice);
      }
      if (typeof filters.maxPrice === 'number') {
        results = results.filter(p => typeof p.price === 'number' && p.price <= filters.maxPrice);
      }
      if (filters.availabilityStatus) {
        results = results.filter(p => p.availability_status === filters.availabilityStatus);
      }
    }

    const sortKey = sort || 'display_order';
    results.sort((a, b) => {
      switch (sortKey) {
        case 'price_asc': {
          const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
          const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
          return pa - pb;
        }
        case 'price_desc': {
          const pa = typeof a.price === 'number' ? a.price : 0;
          const pb = typeof b.price === 'number' ? b.price : 0;
          return pb - pa;
        }
        case 'display_order':
        default: {
          const da = typeof a.display_order === 'number' ? a.display_order : Number.POSITIVE_INFINITY;
          const db = typeof b.display_order === 'number' ? b.display_order : Number.POSITIVE_INFINITY;
          return da - db;
        }
      }
    });

    const mapped = results.map(p => {
      const ev = events.find(e => e.id === p.event_id);
      return {
        sponsorship_package_id: p.id,
        event_id: p.event_id,
        event_title: ev ? ev.title : null,
        name: p.name,
        description: p.description || null,
        price: p.price,
        currency: p.currency || 'USD',
        includes_logo_on_website: !!p.includes_logo_on_website,
        availability_status: p.availability_status || null,
        event: ev || null
      };
    });

    return {
      total: mapped.length,
      results: mapped
    };
  }

  // getSponsorshipCheckoutContext(sponsorshipPackageId)
  getSponsorshipCheckoutContext(sponsorshipPackageId) {
    const packages = this._getFromStorage('sponsorship_packages', []);
    const events = this._getFromStorage('events', []);
    const p = packages.find(sp => sp.id === sponsorshipPackageId);
    if (!p) {
      return {
        package: null,
        form_defaults: {
          organization_name: '',
          payment_method: 'credit_card'
        }
      };
    }
    const ev = events.find(e => e.id === p.event_id);

    return {
      package: {
        sponsorship_package_id: p.id,
        event_title: ev ? ev.title : null,
        name: p.name,
        description: p.description || null,
        price: p.price,
        currency: p.currency || 'USD',
        benefits: Array.isArray(p.benefits) ? p.benefits : [],
        includes_logo_on_website: !!p.includes_logo_on_website,
        event: ev || null
      },
      form_defaults: {
        organization_name: '',
        payment_method: 'credit_card'
      }
    };
  }

  // createSponsorshipOrder(sponsorshipPackageId, organizationName, paymentMethod)
  createSponsorshipOrder(sponsorshipPackageId, organizationName, paymentMethod) {
    const packages = this._getFromStorage('sponsorship_packages', []);
    const orders = this._getFromStorage('sponsorship_orders', []);

    const p = packages.find(sp => sp.id === sponsorshipPackageId);
    if (!p) {
      return {
        order_id: null,
        sponsorship_package_id: sponsorshipPackageId,
        organization_name: organizationName,
        payment_method: paymentMethod,
        status: 'cancelled',
        success: false,
        message: 'Sponsorship package not found.'
      };
    }
    if (paymentMethod !== 'credit_card' && paymentMethod !== 'invoice') {
      return {
        order_id: null,
        sponsorship_package_id: sponsorshipPackageId,
        organization_name: organizationName,
        payment_method: paymentMethod,
        status: 'cancelled',
        success: false,
        message: 'Invalid payment method.'
      };
    }

    const order = {
      id: this._generateId('sord'),
      sponsorship_package_id: sponsorshipPackageId,
      organization_name: organizationName,
      payment_method: paymentMethod,
      status: 'in_progress',
      created_at: this._now()
    };

    orders.push(order);
    this._saveToStorage('sponsorship_orders', orders);

    return {
      order_id: order.id,
      sponsorship_package_id: order.sponsorship_package_id,
      organization_name: order.organization_name,
      payment_method: order.payment_method,
      status: order.status,
      success: true,
      message: 'Sponsorship order created.'
    };
  }

  // getResourceFilterOptions()
  getResourceFilterOptions() {
    const categories = this._getFromStorage('resource_categories', []);

    const categoriesFormatted = categories.map(c => ({
      category_id: c.id,
      name: c.name,
      description: c.description || null
    }));

    const published_date_options = [
      { key: 'last_3_months', label: 'Last 3 months', months: 3 },
      { key: 'last_6_months', label: 'Last 6 months', months: 6 },
      { key: 'last_12_months', label: 'Last 12 months', months: 12 }
    ];

    const sort_options = [
      { value: 'published_desc', label: 'Newest first' },
      { value: 'published_asc', label: 'Oldest first' }
    ];

    return {
      categories: categoriesFormatted,
      published_date_options,
      sort_options
    };
  }

  // searchResources(query, filters, sort, page, pageSize)
  searchResources(query, filters, sort, page, pageSize) {
    const resources = this._getFromStorage('resources', []);
    const categories = this._getFromStorage('resource_categories', []);
    const readingList = localStorage.getItem('currentReadingListId');
    const readingItems = this._getFromStorage('reading_list_items', []);

    const inReadingSet = new Set();
    if (readingList) {
      for (const i of readingItems) {
        if (i.reading_list_id === readingList) {
          inReadingSet.add(i.resource_id);
        }
      }
    }

    let results = resources.slice();

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      results = results.filter(r => (
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.summary && r.summary.toLowerCase().includes(q)) ||
        (Array.isArray(r.tags) && r.tags.some(t => (t || '').toLowerCase().includes(q)))
      ));
    }

    if (filters && typeof filters === 'object') {
      if (filters.categoryId) {
        results = results.filter(r => r.category_id === filters.categoryId);
      }

      if (typeof filters.publishedInLastMonths === 'number' && filters.publishedInLastMonths > 0) {
        const now = new Date();
        const from = new Date(now);
        from.setMonth(from.getMonth() - filters.publishedInLastMonths);
        results = results.filter(r => {
          const d = this._parseDate(r.published_at);
          return d && d >= from && d <= now;
        });
      } else if (filters.publishedFrom || filters.publishedTo) {
        const range = this._validateDateRange(filters.publishedFrom, filters.publishedTo);
        results = results.filter(r => {
          const d = this._parseDate(r.published_at);
          if (!d) return false;
          if (range.start && d < this._parseDate(range.start)) return false;
          if (range.end && d > this._parseDate(range.end)) return false;
          return true;
        });
      }

      if (filters.tags && Array.isArray(filters.tags) && filters.tags.length > 0) {
        const tagSet = new Set(filters.tags.map(t => (t || '').toLowerCase()));
        results = results.filter(r => Array.isArray(r.tags) && r.tags.some(t => tagSet.has((t || '').toLowerCase())));
      }
    }

    const sortKey = sort || 'published_desc';
    results.sort((a, b) => {
      const da = this._parseDate(a.published_at) || new Date(0);
      const db = this._parseDate(b.published_at) || new Date(0);
      if (sortKey === 'published_asc') {
        return da - db;
      }
      return db - da;
    });

    const paged = this._paginateResults(results, page, pageSize);

    const mapped = paged.results.map(r => {
      const category = categories.find(c => c.id === r.category_id);
      return {
        resource_id: r.id,
        title: r.title,
        summary: r.summary || null,
        category_name: category ? category.name : null,
        published_at: r.published_at,
        author: r.author || null,
        tags: Array.isArray(r.tags) ? r.tags : [],
        is_in_reading_list: inReadingSet.has(r.id),
        category: category || null
      };
    });

    return {
      total: paged.total,
      page: paged.page,
      pageSize: paged.pageSize,
      results: mapped
    };
  }

  // getResourceDetails(resourceId)
  getResourceDetails(resourceId) {
    const resources = this._getFromStorage('resources', []);
    const categories = this._getFromStorage('resource_categories', []);
    const readingListId = localStorage.getItem('currentReadingListId');
    const readingItems = this._getFromStorage('reading_list_items', []);

    const r = resources.find(res => res.id === resourceId);
    if (!r) return null;

    let isInReading = false;
    if (readingListId) {
      isInReading = readingItems.some(i => i.reading_list_id === readingListId && i.resource_id === resourceId);
    }

    // Instrumentation for task completion tracking
    try {
      if (isInReading) {
        localStorage.setItem(
          'task6_openedResourceFromReadingList',
          JSON.stringify({ resourceId: resourceId, openedAt: this._now() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const category = categories.find(c => c.id === r.category_id);

    return {
      resource_id: r.id,
      title: r.title,
      content: r.content || null,
      summary: r.summary || null,
      category_name: category ? category.name : null,
      published_at: r.published_at,
      author: r.author || null,
      tags: Array.isArray(r.tags) ? r.tags : [],
      is_in_reading_list: isInReading,
      category: category || null
    };
  }

  // getDealFilterOptions()
  getDealFilterOptions() {
    const categories = this._getFromStorage('deal_categories', []);
    const deals = this._getFromStorage('deals', []);

    const categoriesFormatted = categories.map(c => ({
      category_id: c.id,
      name: c.name,
      description: c.description || null
    }));

    let minDiscount = null;
    let maxDiscount = null;
    for (const d of deals) {
      if (typeof d.discount_percent === 'number') {
        if (minDiscount === null || d.discount_percent < minDiscount) minDiscount = d.discount_percent;
        if (maxDiscount === null || d.discount_percent > maxDiscount) maxDiscount = d.discount_percent;
      }
    }

    const discount_range = {
      min: minDiscount !== null ? minDiscount : 0,
      max: maxDiscount !== null ? maxDiscount : 0,
      step: 1
    };

    const expiry_date_presets = [
      { key: 'this_month', label: 'Expires this month', end_of_current_month: true }
    ];

    const sort_options = [
      { value: 'discount_desc', label: 'Discount - High to Low' },
      { value: 'expiry_asc', label: 'Expiry - Soonest first' }
    ];

    return {
      categories: categoriesFormatted,
      discount_range,
      expiry_date_presets,
      sort_options
    };
  }

  // searchDeals(query, filters, sort, page, pageSize)
  searchDeals(query, filters, sort, page, pageSize) {
    const deals = this._getFromStorage('deals', []);
    const categories = this._getFromStorage('deal_categories', []);
    const businesses = this._getFromStorage('businesses', []);
    const walletId = localStorage.getItem('currentCouponWalletId');
    const walletItems = this._getFromStorage('coupon_wallet_items', []);

    const inWalletSet = new Set();
    if (walletId) {
      for (const i of walletItems) {
        if (i.coupon_wallet_id === walletId) {
          inWalletSet.add(i.deal_id);
        }
      }
    }

    let results = deals.slice();

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      results = results.filter(d => (
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.description && d.description.toLowerCase().includes(q))
      ));
    }

    if (filters && typeof filters === 'object') {
      if (filters.categoryId) {
        results = results.filter(d => d.category_id === filters.categoryId);
      }
      if (typeof filters.minDiscountPercent === 'number') {
        results = results.filter(d => typeof d.discount_percent === 'number' && d.discount_percent >= filters.minDiscountPercent);
      }
      if (filters.isActive !== undefined) {
        results = results.filter(d => !!d.is_active === filters.isActive);
      }
      if (filters.expiryDateFrom || filters.expiryDateTo) {
        const range = this._validateDateRange(filters.expiryDateFrom, filters.expiryDateTo);
        results = results.filter(d => {
          const ed = this._parseDate(d.expiry_date);
          if (!ed) return false;
          if (range.start && ed < this._parseDate(range.start)) return false;
          if (range.end && ed > this._parseDate(range.end)) return false;
          return true;
        });
      }
    }

    const sortKey = sort || 'expiry_asc';
    results.sort((a, b) => {
      switch (sortKey) {
        case 'discount_desc': {
          const da = typeof a.discount_percent === 'number' ? a.discount_percent : 0;
          const db = typeof b.discount_percent === 'number' ? b.discount_percent : 0;
          return db - da;
        }
        case 'expiry_asc':
        default: {
          const ea = this._parseDate(a.expiry_date) || new Date(8640000000000000);
          const eb = this._parseDate(b.expiry_date) || new Date(8640000000000000);
          return ea - eb;
        }
      }
    });

    const paged = this._paginateResults(results, page, pageSize);

    const mapped = paged.results.map(d => {
      const category = d.category_id ? categories.find(c => c.id === d.category_id) : null;
      const business = d.business_id ? businesses.find(b => b.id === d.business_id) : null;
      return {
        deal_id: d.id,
        title: d.title,
        description_short: d.description || null,
        discount_percent: d.discount_percent,
        original_price: d.original_price,
        discounted_price: d.discounted_price,
        expiry_date: d.expiry_date,
        category_name: category ? category.name : null,
        business_name: business ? business.name : null,
        is_in_coupon_wallet: inWalletSet.has(d.id),
        category: category || null,
        business: business || null
      };
    });

    return {
      total: paged.total,
      page: paged.page,
      pageSize: paged.pageSize,
      results: mapped
    };
  }

  // getDealDetails(dealId)
  getDealDetails(dealId) {
    const deals = this._getFromStorage('deals', []);
    const categories = this._getFromStorage('deal_categories', []);
    const businesses = this._getFromStorage('businesses', []);
    const walletId = localStorage.getItem('currentCouponWalletId');
    const walletItems = this._getFromStorage('coupon_wallet_items', []);

    const d = deals.find(deal => deal.id === dealId);
    if (!d) return null;

    let isInWallet = false;
    if (walletId) {
      isInWallet = walletItems.some(i => i.coupon_wallet_id === walletId && i.deal_id === dealId);
    }

    // Instrumentation for task completion tracking
    try {
      if (isInWallet) {
        localStorage.setItem(
          'task7_openedDealFromWallet',
          JSON.stringify({ dealId: dealId, openedAt: this._now() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const category = d.category_id ? categories.find(c => c.id === d.category_id) : null;
    const business = d.business_id ? businesses.find(b => b.id === d.business_id) : null;

    return {
      deal_id: d.id,
      title: d.title,
      description: d.description || null,
      discount_percent: d.discount_percent,
      original_price: d.original_price,
      discounted_price: d.discounted_price,
      expiry_date: d.expiry_date,
      start_date: d.start_date || null,
      terms: d.terms || null,
      promo_code: d.promo_code || null,
      category_name: category ? category.name : null,
      business_name: business ? business.name : null,
      is_in_coupon_wallet: isInWallet,
      category: category || null,
      business: business || null
    };
  }

  // getJobListings(query, filters, sort, page, pageSize)
  getJobListings(query, filters, sort, page, pageSize) {
    let jobs = this._getFromStorage('job_listings', []);

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      jobs = jobs.filter(j => (
        (j.title && j.title.toLowerCase().includes(q)) ||
        (j.company_name && j.company_name.toLowerCase().includes(q))
      ));
    }

    if (filters && typeof filters === 'object') {
      const statusFilter = filters.status || 'published';
      if (statusFilter) {
        jobs = jobs.filter(j => j.status === statusFilter);
      }
      if (filters.employmentType) {
        jobs = jobs.filter(j => j.employment_type === filters.employmentType);
      }
    } else {
      jobs = jobs.filter(j => j.status === 'published');
    }

    const sortKey = sort || 'published_desc';
    jobs.sort((a, b) => {
      switch (sortKey) {
        case 'title_asc': {
          const ta = (a.title || '').toLowerCase();
          const tb = (b.title || '').toLowerCase();
          if (ta < tb) return -1;
          if (ta > tb) return 1;
          return 0;
        }
        case 'published_desc':
        default: {
          const da = this._parseDate(a.published_at) || new Date(0);
          const db = this._parseDate(b.published_at) || new Date(0);
          return db - da;
        }
      }
    });

    const paged = this._paginateResults(jobs, page, pageSize);

    const mapped = paged.results.map(j => ({
      job_listing_id: j.id,
      title: j.title,
      company_name: j.company_name,
      employment_type: j.employment_type,
      min_salary: j.min_salary,
      max_salary: j.max_salary,
      salary_currency: j.salary_currency || 'USD',
      location: j.location || null,
      status: j.status,
      published_at: j.published_at || null
    }));

    return {
      total: paged.total,
      page: paged.page,
      pageSize: paged.pageSize,
      results: mapped
    };
  }

  // previewJobListing(jobDetails)
  previewJobListing(jobDetails) {
    const jobs = this._getFromStorage('job_listings', []);
    const validation_errors = [];

    if (!jobDetails || typeof jobDetails !== 'object') {
      return {
        job_listing: null,
        success: false,
        validation_errors: [{ field: 'jobDetails', message: 'Job details are required.' }]
      };
    }

    const title = jobDetails.title;
    const employmentType = jobDetails.employmentType;
    const minSalary = jobDetails.minSalary;
    const maxSalary = jobDetails.maxSalary;
    const salaryCurrency = jobDetails.salaryCurrency || 'USD';
    const companyName = jobDetails.companyName;
    const contactEmail = jobDetails.contactEmail;
    const description = jobDetails.description || null;
    const location = jobDetails.location || null;
    const existingId = jobDetails.existingJobListingId;

    if (!title || !title.trim()) {
      validation_errors.push({ field: 'title', message: 'Job title is required.' });
    }
    if (!employmentType) {
      validation_errors.push({ field: 'employmentType', message: 'Employment type is required.' });
    }
    if (!companyName || !companyName.trim()) {
      validation_errors.push({ field: 'companyName', message: 'Company name is required.' });
    }
    if (!contactEmail || contactEmail.indexOf('@') === -1) {
      validation_errors.push({ field: 'contactEmail', message: 'Valid contact email is required.' });
    }
    if (typeof minSalary === 'number' && typeof maxSalary === 'number' && minSalary > maxSalary) {
      validation_errors.push({ field: 'minSalary', message: 'Minimum salary cannot exceed maximum salary.' });
    }

    if (validation_errors.length > 0) {
      return {
        job_listing: null,
        success: false,
        validation_errors
      };
    }

    let job;
    if (existingId) {
      const idx = jobs.findIndex(j => j.id === existingId);
      if (idx >= 0) {
        job = jobs[idx];
      }
    }

    if (!job) {
      job = {
        id: this._generateId('job'),
        status: 'draft',
        created_at: this._now(),
        published_at: null
      };
      jobs.push(job);
    }

    job.title = title;
    job.employment_type = employmentType;
    job.min_salary = typeof minSalary === 'number' ? minSalary : null;
    job.max_salary = typeof maxSalary === 'number' ? maxSalary : null;
    job.salary_currency = salaryCurrency;
    job.company_name = companyName;
    job.contact_email = contactEmail;
    job.description = description;
    job.location = location;

    const jobIdx = jobs.findIndex(j => j.id === job.id);
    if (jobIdx >= 0) {
      jobs[jobIdx] = job;
    }

    this._saveToStorage('job_listings', jobs);

    return {
      job_listing: {
        job_listing_id: job.id,
        title: job.title,
        employment_type: job.employment_type,
        min_salary: job.min_salary,
        max_salary: job.max_salary,
        salary_currency: job.salary_currency,
        company_name: job.company_name,
        contact_email: job.contact_email,
        description: job.description,
        location: job.location,
        status: job.status
      },
      success: true,
      validation_errors: []
    };
  }

  // publishJobListing(jobListingId)
  publishJobListing(jobListingId) {
    const jobs = this._getFromStorage('job_listings', []);
    const idx = jobs.findIndex(j => j.id === jobListingId);
    if (idx === -1) {
      return {
        job_listing: null,
        success: false,
        message: 'Job listing not found.'
      };
    }

    const job = jobs[idx];
    job.status = 'published';
    job.published_at = this._now();
    jobs[idx] = job;
    this._saveToStorage('job_listings', jobs);

    return {
      job_listing: {
        job_listing_id: job.id,
        status: job.status,
        published_at: job.published_at
      },
      success: true,
      message: 'Job listing published.'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const mission_html = '<p>We are a local business association dedicated to helping our members thrive.</p>';
    const history_html = '<p>Founded by local entrepreneurs, our association has supported businesses for years.</p>';

    const additional_sections = [
      {
        title: 'Our Values',
        body_html: '<p>Collaboration, integrity, and community impact guide everything we do.</p>'
      }
    ];

    return {
      mission_html,
      history_html,
      additional_sections
    };
  }

  // getLeadershipProfiles()
  getLeadershipProfiles() {
    const profiles = this._getFromStorage('leadership_profiles', []);
    const mapped = profiles.map(p => ({
      profile_id: p.id,
      full_name: p.full_name,
      role_title: p.role_title,
      bio: p.bio || null,
      email: p.email || null,
      phone: p.phone || null,
      photo_url: p.photo_url || null,
      display_order: p.display_order
    }));

    mapped.sort((a, b) => {
      const da = typeof a.display_order === 'number' ? a.display_order : Number.POSITIVE_INFINITY;
      const db = typeof b.display_order === 'number' ? b.display_order : Number.POSITIVE_INFINITY;
      return da - db;
    });

    return { profiles: mapped };
  }

  // getContactFormOptions()
  getContactFormOptions() {
    const subjects = [
      { value: 'general_inquiry', label: 'General inquiry' },
      { value: 'membership', label: 'Membership' },
      { value: 'sponsorship', label: 'Sponsorship' },
      { value: 'events', label: 'Events' },
      { value: 'jobs', label: 'Jobs & Hiring' },
      { value: 'other', label: 'Other' }
    ];

    return {
      subjects,
      default_subject: 'general_inquiry'
    };
  }

  // submitContactMessage(subject, fromName, fromEmail, messageBody, staffRecipientId, recipientName)
  submitContactMessage(subject, fromName, fromEmail, messageBody, staffRecipientId, recipientName) {
    const messages = this._getFromStorage('contact_messages', []);

    if (!subject) subject = 'general_inquiry';

    const msg = {
      id: this._generateId('cmsg'),
      subject,
      from_name: fromName,
      from_email: fromEmail,
      message_body: messageBody,
      created_at: this._now(),
      staff_recipient_id: staffRecipientId || null,
      recipient_name: recipientName || null
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      contact_message_id: msg.id,
      subject: msg.subject,
      from_name: msg.from_name,
      from_email: msg.from_email,
      created_at: msg.created_at,
      success: true,
      message: 'Message submitted.'
    };
  }

  // contactBusiness(businessId, fromEmail, messageBody)
  contactBusiness(businessId, fromEmail, messageBody) {
    const businesses = this._getFromStorage('businesses', []);
    const messages = this._getFromStorage('business_contact_messages', []);

    const b = businesses.find(biz => biz.id === businessId);
    if (!b) {
      return {
        business_contact_message_id: null,
        business_id: businessId,
        created_at: null,
        success: false,
        message: 'Business not found.'
      };
    }

    const msg = {
      id: this._generateId('bcmsg'),
      business_id: businessId,
      from_email: fromEmail,
      message_body: messageBody,
      created_at: this._now()
    };

    messages.push(msg);
    this._saveToStorage('business_contact_messages', messages);

    return {
      business_contact_message_id: msg.id,
      business_id: msg.business_id,
      created_at: msg.created_at,
      success: true,
      message: 'Message sent to business.'
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