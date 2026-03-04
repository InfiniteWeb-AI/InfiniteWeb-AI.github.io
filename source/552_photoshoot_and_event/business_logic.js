// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  // -----------------------------
  // Storage helpers
  // -----------------------------

  _initStorage() {
    const tableKeys = [
      'space_categories',
      'spaces',
      'space_availabilities',
      'packages',
      'add_ons',
      'event_configurations',
      'bookings',
      'booking_add_ons',
      'promo_codes',
      'gallery_setups',
      'inspiration_boards',
      'inspiration_board_items',
      'help_center_categories',
      'faq_articles',
      'contact_requests',
      'gift_card_templates',
      'gift_cards',
      'carts',
      'cart_items',
      'orders',
      'order_items'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    const scalarKeys = [
      'current_cart_id',
      'current_booking_id',
      'current_event_configuration_id',
      'current_inspiration_board_id'
    ];
    scalarKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, '');
      }
    });
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
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

  _nowIso() {
    return new Date().toISOString();
  }

  _addHoursToIso(startIso, hours) {
    const d = new Date(startIso);
    if (Number.isNaN(d.getTime())) return startIso;
    const ms = hours * 60 * 60 * 1000;
    const d2 = new Date(d.getTime() + ms);
    return d2.toISOString();
  }

  _addDaysToIso(startIso, days) {
    const d = new Date(startIso);
    if (Number.isNaN(d.getTime())) return startIso;
    const ms = days * 24 * 60 * 60 * 1000;
    const d2 = new Date(d.getTime() + ms);
    return d2.toISOString();
  }

  _getDayOfWeekSlug(isoDatetime) {
    const d = new Date(isoDatetime);
    if (Number.isNaN(d.getTime())) return null;
    const idx = d.getDay(); // 0-6, Sunday=0
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[idx] || null;
  }

  _getThumbnailFromImages(images) {
    if (!Array.isArray(images) || images.length === 0) return '';
    const first = images[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && first.url) return first.url;
    return '';
  }

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  _safeNumber(val, def = 0) {
    const n = typeof val === 'number' ? val : parseFloat(val);
    return Number.isFinite(n) ? n : def;
  }

  // -----------------------------
  // Private helpers required by spec
  // -----------------------------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('current_cart_id') || '';
    let cart = currentCartId ? carts.find((c) => c.id === currentCartId) : null;

    if (!cart) {
      const newId = this._generateId('cart');
      cart = {
        id: newId,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('current_cart_id', newId);
    }

    return cart;
  }

  _getOrCreateCurrentBooking(defaultType = 'time_slot') {
    const bookings = this._getFromStorage('bookings');
    let currentBookingId = localStorage.getItem('current_booking_id') || '';
    let booking = currentBookingId ? bookings.find((b) => b.id === currentBookingId) : null;

    if (!booking) {
      const newId = this._generateId('booking');
      booking = {
        id: newId,
        booking_type: defaultType,
        space_id: null,
        package_id: null,
        event_configuration_id: null,
        start_datetime: null,
        end_datetime: null,
        duration_hours: null,
        is_recurring: false,
        recurrence_frequency: 'none',
        recurrence_day_of_week: null,
        recurrence_count: null,
        status: 'draft',
        contact_name: null,
        contact_email: null,
        contact_phone: null,
        special_instructions: null,
        base_price: 0,
        package_price: 0,
        add_ons_price: 0,
        promo_code_id: null,
        discount_amount: 0,
        total_price: 0,
        created_at: this._nowIso()
      };
      bookings.push(booking);
      this._saveToStorage('bookings', bookings);
      localStorage.setItem('current_booking_id', newId);
    }

    return booking;
  }

  _getOrCreateEventConfiguration(defaultType = 'other') {
    const eventConfigs = this._getFromStorage('event_configurations');
    let currentId = localStorage.getItem('current_event_configuration_id') || '';
    let config = currentId ? eventConfigs.find((e) => e.id === currentId) : null;

    if (!config) {
      const newId = this._generateId('eventcfg');
      config = {
        id: newId,
        event_type: defaultType,
        date: this._nowIso(),
        duration_hours: 0,
        base_price: 0,
        selected_add_on_ids: [],
        add_ons_price: 0,
        total_price: 0,
        created_at: this._nowIso()
      };
      eventConfigs.push(config);
      this._saveToStorage('event_configurations', eventConfigs);
      localStorage.setItem('current_event_configuration_id', newId);
    }

    return config;
  }

  _getOrCreateInspirationBoard() {
    const boards = this._getFromStorage('inspiration_boards');
    let currentId = localStorage.getItem('current_inspiration_board_id') || '';
    let board = currentId ? boards.find((b) => b.id === currentId) : null;

    if (!board) {
      const newId = this._generateId('board');
      board = {
        id: newId,
        name: 'My Board',
        description: '',
        created_at: this._nowIso()
      };
      boards.push(board);
      this._saveToStorage('inspiration_boards', boards);
      localStorage.setItem('current_inspiration_board_id', newId);
    }

    return board;
  }

  _recalculateEventConfigurationTotals(eventConfig) {
    const addOns = this._getFromStorage('add_ons');
    const selectedAddOns = (eventConfig.selected_add_on_ids || []).map((id) =>
      addOns.find((a) => a.id === id)
    ).filter(Boolean);

    const addOnsPrice = selectedAddOns.reduce((sum, a) => sum + this._safeNumber(a.price, 0), 0);
    const basePrice = this._safeNumber(eventConfig.base_price, 0);
    const totalPrice = basePrice + addOnsPrice;

    eventConfig.add_ons_price = addOnsPrice;
    eventConfig.total_price = totalPrice;

    // persist
    const configs = this._getFromStorage('event_configurations');
    const idx = configs.findIndex((c) => c.id === eventConfig.id);
    if (idx !== -1) {
      configs[idx] = eventConfig;
      this._saveToStorage('event_configurations', configs);
    }

    return eventConfig;
  }

  _calculateBookingPrice(options) {
    const {
      bookingType,
      space,
      durationHours = 0,
      recurrenceCount = 1,
      packagePrice = 0,
      addOnsPrice = 0,
      basePriceOverride = null,
      existingDiscount = 0
    } = options || {};

    let basePrice;
    if (basePriceOverride != null) {
      basePrice = this._safeNumber(basePriceOverride, 0);
    } else if (bookingType === 'time_slot' && space) {
      const rate = this._safeNumber(space.hourly_rate, 0);
      const count = recurrenceCount && recurrenceCount > 0 ? recurrenceCount : 1;
      basePrice = rate * this._safeNumber(durationHours, 0) * count;
    } else {
      basePrice = 0;
    }

    const pkgPrice = this._safeNumber(packagePrice, 0);
    const aoPrice = this._safeNumber(addOnsPrice, 0);
    const discount = this._safeNumber(existingDiscount, 0);
    const totalBefore = basePrice + pkgPrice + aoPrice;
    const total = Math.max(0, totalBefore - discount);

    return {
      base_price: basePrice,
      package_price: pkgPrice,
      add_ons_price: aoPrice,
      discount_amount: discount,
      total_price: total
    };
  }

  _applyPromoCodeToAmount(promoDef, amount) {
    const currentTotal = this._safeNumber(amount, 0);
    if (!promoDef || !promoDef.is_active) {
      return { discountAmount: 0, newTotal: currentTotal };
    }

    const now = new Date();
    if (promoDef.valid_from) {
      const from = new Date(promoDef.valid_from);
      if (!Number.isNaN(from.getTime()) && now < from) {
        return { discountAmount: 0, newTotal: currentTotal };
      }
    }
    if (promoDef.valid_to) {
      const to = new Date(promoDef.valid_to);
      if (!Number.isNaN(to.getTime()) && now > to) {
        return { discountAmount: 0, newTotal: currentTotal };
      }
    }

    const type = promoDef.discount_type;
    const value = this._safeNumber(promoDef.discount_value, 0);
    let discount = 0;
    if (type === 'percentage') {
      discount = (currentTotal * value) / 100;
    } else if (type === 'fixed_amount') {
      discount = value;
    }
    if (discount < 0) discount = 0;
    if (discount > currentTotal) discount = currentTotal;

    const newTotal = currentTotal - discount;
    return { discountAmount: discount, newTotal: newTotal };
  }

  // -----------------------------
  // Interface implementations
  // -----------------------------

  // 1. getHomeHighlights
  getHomeHighlights() {
    const spaces = this._getFromStorage('spaces').filter((s) => s.is_active !== false);
    const categories = this._getFromStorage('space_categories');
    const gallerySetups = this._getFromStorage('gallery_setups').filter((g) => g.is_active !== false);

    const catById = {};
    categories.forEach((c) => {
      catById[c.id] = c;
    });

    const photoshootSpaces = spaces
      .filter((s) => {
        const cat = catById[s.category_id];
        return cat && cat.slug === 'photoshoot_studios';
      })
      .sort((a, b) => {
        const ra = this._safeNumber(a.average_rating, 0);
        const rb = this._safeNumber(b.average_rating, 0);
        if (rb !== ra) return rb - ra;
        const ca = this._safeNumber(a.rating_count, 0);
        const cb = this._safeNumber(b.rating_count, 0);
        return cb - ca;
      })
      .slice(0, 5)
      .map((s) => {
        const cat = catById[s.category_id] || {};
        return {
          space_id: s.id,
          name: s.name,
          category_slug: cat.slug || null,
          category_name: cat.name || null,
          location: s.location || '',
          hourly_rate: this._safeNumber(s.hourly_rate, 0),
          capacity_max: this._safeNumber(s.capacity_max, 0),
          average_rating: this._safeNumber(s.average_rating, 0),
          rating_count: this._safeNumber(s.rating_count, 0),
          thumbnail_image_url: this._getThumbnailFromImages(s.images)
        };
      });

    const eventSpaces = spaces
      .filter((s) => {
        const cat = catById[s.category_id];
        return cat && cat.slug === 'event_venues';
      })
      .sort((a, b) => {
        const ra = this._safeNumber(a.average_rating, 0);
        const rb = this._safeNumber(b.average_rating, 0);
        if (rb !== ra) return rb - ra;
        const ca = this._safeNumber(a.rating_count, 0);
        const cb = this._safeNumber(b.rating_count, 0);
        return cb - ca;
      })
      .slice(0, 5)
      .map((s) => {
        const cat = catById[s.category_id] || {};
        return {
          space_id: s.id,
          name: s.name,
          category_slug: cat.slug || null,
          category_name: cat.name || null,
          location: s.location || '',
          hourly_rate: this._safeNumber(s.hourly_rate, 0),
          capacity_max: this._safeNumber(s.capacity_max, 0),
          average_rating: this._safeNumber(s.average_rating, 0),
          rating_count: this._safeNumber(s.rating_count, 0),
          thumbnail_image_url: this._getThumbnailFromImages(s.images)
        };
      });

    const featuredGallery = gallerySetups.slice(0, 8).map((g) => ({
      setup_id: g.id,
      title: g.title,
      style: g.style || '',
      location_type: g.location_type,
      thumbnail_image_url: this._getThumbnailFromImages(g.images)
    }));

    return {
      featured_photoshoot_spaces: photoshootSpaces,
      featured_event_venues: eventSpaces,
      featured_gallery_setups: featuredGallery
    };
  }

  // 2. searchSpacesAndVenues(query, limit = 20)
  searchSpacesAndVenues(query, limit) {
    const q = this._normalizeString(query || '');
    const lim = typeof limit === 'number' && limit > 0 ? limit : 20;

    if (!q) return [];

    // Split query into tokens so that multi-word searches can match across name and description
    const qTokens = q.split(/\s+/).filter(Boolean);

    const spaces = this._getFromStorage('spaces').filter((s) => s.is_active !== false);
    const categories = this._getFromStorage('space_categories');
    const catById = {};
    categories.forEach((c) => {
      catById[c.id] = c;
    });

    const results = spaces
      .filter((s) => {
        const haystack = this._normalizeString(
          [s.name, s.description, s.location].filter(Boolean).join(' ')
        );
        if (!qTokens.length) return true;
        return qTokens.every((token) => haystack.includes(token));
      })
      .sort((a, b) => {
        const ra = this._safeNumber(a.average_rating, 0);
        const rb = this._safeNumber(b.average_rating, 0);
        if (rb !== ra) return rb - ra;
        const ca = this._safeNumber(a.rating_count, 0);
        const cb = this._safeNumber(b.rating_count, 0);
        return cb - ca;
      })
      .slice(0, lim)
      .map((s) => {
        const cat = catById[s.category_id] || {};
        const desc = s.description || '';
        const snippet = desc.length > 160 ? desc.slice(0, 157) + '...' : desc;
        return {
          space_id: s.id,
          name: s.name,
          snippet_description: snippet,
          category_slug: cat.slug || null,
          category_name: cat.name || null,
          location: s.location || '',
          average_rating: this._safeNumber(s.average_rating, 0),
          rating_count: this._safeNumber(s.rating_count, 0),
          supports_packages: !!s.supports_packages,
          supports_recurring: !!s.supports_recurring,
          thumbnail_image_url: this._getThumbnailFromImages(s.images),
          result_type: 'space'
        };
      });

    return results;
  }

  // 3. getSpaceListingFilters(categorySlug)
  getSpaceListingFilters(categorySlug) {
    const categories = this._getFromStorage('space_categories');
    const category = categories.find((c) => c.slug === categorySlug) || null;
    if (!category) {
      return {
        capacity: { min: 0, max: 0, step: 1 },
        price_per_hour: { min: 0, max: 0, step: 1, currency: 'USD' },
        package_price: {
          min: 0,
          max: 0,
          step: 1,
          default_duration_hours: 4,
          currency: 'USD'
        },
        amenities: [],
        rating_options: [3, 4, 4.5, 5],
        supports_recurring_available: false
      };
    }

    const spaces = this._getFromStorage('spaces').filter(
      (s) => s.is_active !== false && s.category_id === category.id
    );
    const packages = this._getFromStorage('packages');

    let minCapacity = Infinity;
    let maxCapacity = 0;
    let minPrice = Infinity;
    let maxPrice = 0;

    const amenitySet = new Set();
    let supportsRecurring = false;

    spaces.forEach((s) => {
      if (typeof s.capacity_min === 'number') {
        if (s.capacity_min < minCapacity) minCapacity = s.capacity_min;
      }
      if (typeof s.capacity_max === 'number') {
        if (s.capacity_max > maxCapacity) maxCapacity = s.capacity_max;
      }
      if (typeof s.hourly_rate === 'number') {
        if (s.hourly_rate < minPrice) minPrice = s.hourly_rate;
        if (s.hourly_rate > maxPrice) maxPrice = s.hourly_rate;
      }
      (s.amenities || []).forEach((a) => amenitySet.add(a));
      if (s.supports_recurring) supportsRecurring = true;
    });

    if (minCapacity === Infinity) minCapacity = 0;
    const capStep = 1;
    if (minPrice === Infinity) minPrice = 0;
    const priceStep = 5;

    const defaultDuration = 4;
    let minPackagePrice = Infinity;
    let maxPackagePrice = 0;

    spaces.forEach((s) => {
      const spPkgs = packages.filter(
        (p) => p.space_id === s.id && p.is_active !== false && p.duration_hours === defaultDuration
      );
      spPkgs.forEach((p) => {
        const pt = this._safeNumber(p.price_total, 0);
        if (pt < minPackagePrice) minPackagePrice = pt;
        if (pt > maxPackagePrice) maxPackagePrice = pt;
      });
    });

    if (minPackagePrice === Infinity) minPackagePrice = 0;

    const amenities = Array.from(amenitySet).map((id) => ({
      id,
      name: id
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    }));

    return {
      capacity: { min: minCapacity, max: maxCapacity, step: capStep },
      price_per_hour: { min: minPrice, max: maxPrice, step: priceStep, currency: 'USD' },
      package_price: {
        min: minPackagePrice,
        max: maxPackagePrice,
        step: 10,
        default_duration_hours: defaultDuration,
        currency: 'USD'
      },
      amenities,
      rating_options: [3, 4, 4.5, 5],
      supports_recurring_available: supportsRecurring
    };
  }

  // 4. listSpaces(categorySlug, filters = {}, sortBy = 'recommended', page = 1, pageSize = 20)
  listSpaces(categorySlug, filters, sortBy, page, pageSize) {
    const f = filters || {};
    const sort = sortBy || 'recommended';
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    const categories = this._getFromStorage('space_categories');
    const category = categories.find((c) => c.slug === categorySlug) || null;
    if (!category) {
      return { spaces: [], totalResults: 0, page: pg, pageSize: ps };
    }

    const spacesAll = this._getFromStorage('spaces').filter(
      (s) => s.is_active !== false && s.category_id === category.id
    );
    const packages = this._getFromStorage('packages');
    const spaceAvailabilities = this._getFromStorage('space_availabilities');

    const defaultDuration = 4; // hours

    // Precompute min package price for default duration per space
    const minPackageBySpace = {};
    spacesAll.forEach((s) => {
      const spPkgs = packages.filter(
        (p) => p.space_id === s.id && p.is_active !== false && p.duration_hours === defaultDuration
      );
      if (spPkgs.length) {
        minPackageBySpace[s.id] = spPkgs.reduce((min, p) => {
          const price = this._safeNumber(p.price_total, 0);
          return price < min ? price : min;
        }, Infinity);
      }
    });

    let spaces = spacesAll.slice();

    if (typeof f.minCapacity === 'number') {
      const minCap = f.minCapacity;
      spaces = spaces.filter((s) => this._safeNumber(s.capacity_max, 0) >= minCap);
    }

    if (typeof f.maxPricePerHour === 'number') {
      const maxPrice = f.maxPricePerHour;
      spaces = spaces.filter((s) => this._safeNumber(s.hourly_rate, 0) <= maxPrice);
    }

    if (typeof f.maxPackagePriceForDurationHours === 'number') {
      const threshold = f.maxPackagePriceForDurationHours;
      spaces = spaces.filter((s) => {
        const minPkg = minPackageBySpace[s.id];
        if (typeof minPkg !== 'number' || !Number.isFinite(minPkg)) return false;
        return minPkg <= threshold;
      });
    }

    if (Array.isArray(f.amenities) && f.amenities.length) {
      spaces = spaces.filter((s) => {
        const ams = s.amenities || [];
        return f.amenities.every((a) => ams.includes(a));
      });
    }

    if (f.hasOnsiteParking) {
      spaces = spaces.filter((s) => (s.amenities || []).includes('onsite_parking'));
    }

    if (f.allowsOutsideCatering) {
      spaces = spaces.filter((s) => (s.amenities || []).includes('outside_catering_allowed'));
    }

    if (typeof f.minRating === 'number') {
      const minRating = f.minRating;
      spaces = spaces.filter((s) => this._safeNumber(s.average_rating, 0) >= minRating);
    }

    if (f.supportsRecurring) {
      spaces = spaces.filter((s) => !!s.supports_recurring);
    }

    if (f.availabilityDate) {
      const dateStr = f.availabilityDate;
      spaces = spaces.filter((s) => {
        const hasSlot = spaceAvailabilities.some((slot) => {
          if (slot.space_id !== s.id || slot.is_available === false) return false;
          if (!slot.start_datetime) return false;
          return slot.start_datetime.slice(0, 10) === dateStr;
        });
        return hasSlot;
      });
    }

    if (f.bookingType === 'package') {
      spaces = spaces.filter((s) => !!s.supports_packages);
    }

    // Sorting
    spaces.sort((a, b) => {
      const rateA = this._safeNumber(a.hourly_rate, 0);
      const rateB = this._safeNumber(b.hourly_rate, 0);
      const ratingA = this._safeNumber(a.average_rating, 0);
      const ratingB = this._safeNumber(b.average_rating, 0);

      if (sort === 'price_low_to_high') return rateA - rateB;
      if (sort === 'price_high_to_low') return rateB - rateA;
      if (sort === 'rating_high_to_low') return ratingB - ratingA;
      if (sort === 'rating_low_to_high') return ratingA - ratingB;

      // recommended: by rating desc then rating_count desc
      const rcA = this._safeNumber(a.rating_count, 0);
      const rcB = this._safeNumber(b.rating_count, 0);
      if (ratingB !== ratingA) return ratingB - ratingA;
      return rcB - rcA;
    });

    // Instrumentation for task completion tracking
    try {
      if (categorySlug === 'photoshoot_studios') {
        localStorage.setItem(
          'task1_spaceListFilters',
          JSON.stringify({ categorySlug, filters: f, sortBy: sort, page: pg, pageSize: ps })
        );
        if (f && f.supportsRecurring) {
          localStorage.setItem(
            'task6_spaceListFilters',
            JSON.stringify({ categorySlug, filters: f, sortBy: sort, page: pg, pageSize: ps })
          );
        }
      }
      if (categorySlug === 'event_venues') {
        localStorage.setItem(
          'task2_spaceListFilters',
          JSON.stringify({ categorySlug, filters: f, sortBy: sort, page: pg, pageSize: ps })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const totalResults = spaces.length;
    const startIdx = (pg - 1) * ps;
    const endIdx = startIdx + ps;
    const slice = spaces.slice(startIdx, endIdx);

    const resultSpaces = slice.map((s) => ({
      space_id: s.id,
      name: s.name,
      description_snippet: (s.description || '').slice(0, 160),
      category_slug: categorySlug,
      category_name: category.name,
      location: s.location || '',
      capacity_min: this._safeNumber(s.capacity_min, 0),
      capacity_max: this._safeNumber(s.capacity_max, 0),
      hourly_rate: this._safeNumber(s.hourly_rate, 0),
      supports_packages: !!s.supports_packages,
      supports_recurring: !!s.supports_recurring,
      average_rating: this._safeNumber(s.average_rating, 0),
      rating_count: this._safeNumber(s.rating_count, 0),
      amenities: s.amenities || [],
      thumbnail_image_url: this._getThumbnailFromImages(s.images),
      min_package_price_for_default_duration: Number.isFinite(minPackageBySpace[s.id])
        ? minPackageBySpace[s.id]
        : null
    }));

    return {
      spaces: resultSpaces,
      totalResults,
      page: pg,
      pageSize: ps
    };
  }

  // 5. getSpaceDetail(spaceId)
  getSpaceDetail(spaceId) {
    const spaces = this._getFromStorage('spaces');
    const categories = this._getFromStorage('space_categories');

    const space = spaces.find((s) => s.id === spaceId);
    if (!space) {
      return null;
    }

    const category = categories.find((c) => c.id === space.category_id) || {};
    const amenities = (space.amenities || []).map((id) => ({
      id,
      name: id
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    }));

    const images = Array.isArray(space.images)
      ? space.images.map((img) => {
          if (typeof img === 'string') {
            return { url: img, alt: space.name || '' };
          }
          return { url: img.url || '', alt: img.alt || space.name || '' };
        })
      : [];

    return {
      space_id: space.id,
      name: space.name,
      category_slug: category.slug || null,
      category_name: category.name || null,
      description: space.description || '',
      location: space.location || '',
      capacity_min: this._safeNumber(space.capacity_min, 0),
      capacity_max: this._safeNumber(space.capacity_max, 0),
      hourly_rate: this._safeNumber(space.hourly_rate, 0),
      supports_packages: !!space.supports_packages,
      supports_recurring: !!space.supports_recurring,
      average_rating: this._safeNumber(space.average_rating, 0),
      rating_count: this._safeNumber(space.rating_count, 0),
      amenities,
      images,
      policies: space.policies || '',
      cancellation_policy_summary: space.cancellation_policy_summary || '',
      is_active: space.is_active !== false
    };
  }

  // 6. getSpaceAvailabilityForDate(spaceId, date)
  getSpaceAvailabilityForDate(spaceId, date) {
    const slots = this._getFromStorage('space_availabilities').filter((slot) => {
      if (slot.space_id !== spaceId) return false;
      if (!slot.start_datetime) return false;
      return slot.start_datetime.slice(0, 10) === date;
    });

    return {
      space_id: spaceId,
      date,
      time_slots: slots.map((slot) => ({
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        is_available: slot.is_available !== false,
        is_recurring_slot: !!slot.is_recurring_slot
      }))
    };
  }

  // 7. getSpacePackages(spaceId)
  getSpacePackages(spaceId) {
    const packages = this._getFromStorage('packages').filter(
      (p) => p.space_id === spaceId && p.is_active !== false
    );

    return packages.map((p) => ({
      package_id: p.id,
      name: p.name,
      package_type: p.package_type,
      description: p.description || '',
      duration_hours: this._safeNumber(p.duration_hours, 0),
      price_total: this._safeNumber(p.price_total, 0),
      is_active: p.is_active !== false
    }));
  }

  // 8. startTimeSlotBooking(spaceId, startDatetime, durationHours, isRecurring = false, recurrenceFrequency = 'none', recurrenceCount, recurrenceDayOfWeek)
  startTimeSlotBooking(
    spaceId,
    startDatetime,
    durationHours,
    isRecurring,
    recurrenceFrequency,
    recurrenceCount,
    recurrenceDayOfWeek
  ) {
    const spaces = this._getFromStorage('spaces');
    const categories = this._getFromStorage('space_categories');
    const bookings = this._getFromStorage('bookings');

    const space = spaces.find((s) => s.id === spaceId);
    if (!space) {
      return {
        success: false,
        booking: null,
        message: 'Space not found'
      };
    }

    const category = categories.find((c) => c.id === space.category_id) || {};
    const dur = this._safeNumber(durationHours, 0) || 0;
    const startIso = startDatetime;
    const endIso = this._addHoursToIso(startIso, dur);

    const recurring = !!isRecurring;
    const freq = recurring ? recurrenceFrequency || 'weekly' : 'none';
    const recCount = recurring ? (recurrenceCount || 1) : 1;
    const daySlug = recurring
      ? recurrenceDayOfWeek || this._getDayOfWeekSlug(startIso) || 'tuesday'
      : null;

    // Use helper to get or create current booking
    let booking = this._getOrCreateCurrentBooking('time_slot');

    booking.booking_type = 'time_slot';
    booking.space_id = space.id;
    booking.package_id = null;
    booking.event_configuration_id = null;
    booking.start_datetime = startIso;
    booking.end_datetime = endIso;
    booking.duration_hours = dur;
    booking.is_recurring = recurring;
    booking.recurrence_frequency = freq;
    booking.recurrence_day_of_week = recurring ? daySlug : null;
    booking.recurrence_count = recurring ? recCount : null;
    booking.status = 'draft';

    const priceInfo = this._calculateBookingPrice({
      bookingType: 'time_slot',
      space,
      durationHours: dur,
      recurrenceCount: recCount,
      packagePrice: 0,
      addOnsPrice: 0,
      basePriceOverride: null,
      existingDiscount: 0
    });

    booking.base_price = priceInfo.base_price;
    booking.package_price = 0;
    booking.add_ons_price = 0;
    booking.discount_amount = 0;
    booking.total_price = priceInfo.total_price;

    // persist booking
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
    } else {
      bookings.push(booking);
    }
    this._saveToStorage('bookings', bookings);
    localStorage.setItem('current_booking_id', booking.id);

    return {
      success: true,
      booking: {
        booking_id: booking.id,
        booking_type: booking.booking_type,
        space_id: booking.space_id,
        space_name: space.name,
        category_slug: category.slug || null,
        location: space.location || '',
        start_datetime: booking.start_datetime,
        end_datetime: booking.end_datetime,
        duration_hours: booking.duration_hours,
        is_recurring: booking.is_recurring,
        recurrence_frequency: booking.recurrence_frequency,
        recurrence_day_of_week: booking.recurrence_day_of_week,
        recurrence_count: booking.recurrence_count,
        status: booking.status,
        base_price: booking.base_price,
        package_price: booking.package_price,
        add_ons_price: booking.add_ons_price,
        discount_amount: booking.discount_amount,
        total_price: booking.total_price,
        currency: 'USD'
      },
      message: 'Booking draft created'
    };
  }

  // 9. startPackageBooking(spaceId, packageId, startDatetime)
  startPackageBooking(spaceId, packageId, startDatetime) {
    const spaces = this._getFromStorage('spaces');
    const categories = this._getFromStorage('space_categories');
    const packages = this._getFromStorage('packages');
    const bookings = this._getFromStorage('bookings');

    const space = spaces.find((s) => s.id === spaceId);
    if (!space) {
      return { success: false, booking: null, message: 'Space not found' };
    }
    const pkg = packages.find((p) => p.id === packageId && p.space_id === spaceId);
    if (!pkg) {
      return { success: false, booking: null, message: 'Package not found for space' };
    }

    const category = categories.find((c) => c.id === space.category_id) || {};
    const dur = this._safeNumber(pkg.duration_hours, 0) || 0;
    const startIso = startDatetime || this._nowIso();
    const endIso = this._addHoursToIso(startIso, dur);

    let booking = this._getOrCreateCurrentBooking('package');

    booking.booking_type = 'package';
    booking.space_id = space.id;
    booking.package_id = pkg.id;
    booking.event_configuration_id = null;
    booking.start_datetime = startIso;
    booking.end_datetime = endIso;
    booking.duration_hours = dur;
    booking.is_recurring = false;
    booking.recurrence_frequency = 'none';
    booking.recurrence_day_of_week = null;
    booking.recurrence_count = null;
    booking.status = 'draft';

    const priceInfo = this._calculateBookingPrice({
      bookingType: 'package',
      space,
      durationHours: dur,
      recurrenceCount: 1,
      packagePrice: this._safeNumber(pkg.price_total, 0),
      addOnsPrice: 0,
      basePriceOverride: 0,
      existingDiscount: 0
    });

    booking.base_price = priceInfo.base_price; // should be 0 for package
    booking.package_price = priceInfo.package_price;
    booking.add_ons_price = 0;
    booking.discount_amount = 0;
    booking.total_price = priceInfo.total_price;

    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
    } else {
      bookings.push(booking);
    }
    this._saveToStorage('bookings', bookings);
    localStorage.setItem('current_booking_id', booking.id);

    return {
      success: true,
      booking: {
        booking_id: booking.id,
        booking_type: booking.booking_type,
        space_id: booking.space_id,
        space_name: space.name,
        category_slug: category.slug || null,
        location: space.location || '',
        package_id: pkg.id,
        package_name: pkg.name,
        package_description: pkg.description || '',
        package_duration_hours: dur,
        start_datetime: booking.start_datetime,
        end_datetime: booking.end_datetime,
        status: booking.status,
        base_price: booking.base_price,
        package_price: booking.package_price,
        add_ons_price: booking.add_ons_price,
        discount_amount: booking.discount_amount,
        total_price: booking.total_price,
        currency: 'USD'
      },
      message: 'Package booking draft created'
    };
  }

  // 10. getCurrentBookingForDetails()
  getCurrentBookingForDetails() {
    const currentId = localStorage.getItem('current_booking_id') || '';
    if (!currentId) {
      return { booking_id: null };
    }

    const bookings = this._getFromStorage('bookings');
    const spaces = this._getFromStorage('spaces');
    const categories = this._getFromStorage('space_categories');
    const packages = this._getFromStorage('packages');
    const eventConfigs = this._getFromStorage('event_configurations');
    const addOns = this._getFromStorage('add_ons');
    const promoCodes = this._getFromStorage('promo_codes');

    const booking = bookings.find((b) => b.id === currentId);
    if (!booking) {
      return { booking_id: null };
    }

    const space = booking.space_id ? spaces.find((s) => s.id === booking.space_id) : null;
    const category = space
      ? categories.find((c) => c.id === space.category_id) || null
      : null;

    const pkg = booking.package_id
      ? packages.find((p) => p.id === booking.package_id)
      : null;

    const eventConfig = booking.event_configuration_id
      ? eventConfigs.find((e) => e.id === booking.event_configuration_id)
      : null;

    const selectedAddOns = eventConfig
      ? (eventConfig.selected_add_on_ids || []).map((id) => addOns.find((a) => a.id === id)).filter(Boolean)
      : [];

    const datesTimes = [];
    if (booking.start_datetime && booking.end_datetime) {
      datesTimes.push({
        start_datetime: booking.start_datetime,
        end_datetime: booking.end_datetime
      });
      if (booking.is_recurring && booking.recurrence_frequency === 'weekly') {
        const count = booking.recurrence_count || 1;
        const durHours = this._safeNumber(booking.duration_hours, 0);
        for (let i = 1; i < count; i++) {
          const startIso = this._addDaysToIso(booking.start_datetime, 7 * i);
          const endIso = this._addHoursToIso(startIso, durHours);
          datesTimes.push({ start_datetime: startIso, end_datetime: endIso });
        }
      }
    }

    const basePrice = this._safeNumber(booking.base_price, 0);
    const packagePrice = this._safeNumber(booking.package_price, 0);
    const addOnsPrice = this._safeNumber(booking.add_ons_price, 0);
    const discountAmount = this._safeNumber(booking.discount_amount, 0);
    const totalBeforeDiscount = basePrice + packagePrice + addOnsPrice;
    const totalAfterDiscount = Math.max(0, totalBeforeDiscount - discountAmount);

    const promo = booking.promo_code_id
      ? promoCodes.find((p) => p.id === booking.promo_code_id)
      : null;

    return {
      booking_id: booking.id,
      booking_type: booking.booking_type,
      space: space
        ? {
            space_id: space.id,
            name: space.name,
            category_slug: category ? category.slug : null,
            category_name: category ? category.name : null,
            location: space.location || ''
          }
        : null,
      dates_times: datesTimes,
      duration_hours: this._safeNumber(booking.duration_hours, 0),
      is_recurring: !!booking.is_recurring,
      recurrence_frequency: booking.recurrence_frequency || 'none',
      recurrence_day_of_week: booking.recurrence_day_of_week || null,
      recurrence_count: booking.recurrence_count || null,
      package: pkg
        ? {
            package_id: pkg.id,
            name: pkg.name,
            description: pkg.description || '',
            duration_hours: this._safeNumber(pkg.duration_hours, 0),
            price_total: this._safeNumber(pkg.price_total, 0)
          }
        : null,
      event_configuration: eventConfig
        ? {
            event_configuration_id: eventConfig.id,
            event_type: eventConfig.event_type,
            date: eventConfig.date,
            duration_hours: this._safeNumber(eventConfig.duration_hours, 0),
            base_price: this._safeNumber(eventConfig.base_price, 0),
            selected_add_ons: selectedAddOns.map((a) => ({
              add_on_id: a.id,
              name: a.name,
              category: a.category,
              price: this._safeNumber(a.price, 0),
              includes_arch: !!a.includes_arch
            })),
            add_ons_price: this._safeNumber(eventConfig.add_ons_price, 0),
            total_price: this._safeNumber(eventConfig.total_price, 0)
          }
        : null,
      price_breakdown: {
        base_price: basePrice,
        package_price: packagePrice,
        add_ons_price: addOnsPrice,
        discount_amount: discountAmount,
        total_before_discount: totalBeforeDiscount,
        total_after_discount: totalAfterDiscount,
        currency: 'USD'
      },
      promo_code: promo
        ? {
            code: promo.code,
            description: promo.description || ''
          }
        : null,
      contact_info: {
        contact_name: booking.contact_name || '',
        contact_email: booking.contact_email || '',
        contact_phone: booking.contact_phone || '',
        special_instructions: booking.special_instructions || ''
      }
    };
  }

  // 11. updateCurrentBookingContactInfo(contactName, contactEmail, contactPhone, specialInstructions)
  updateCurrentBookingContactInfo(contactName, contactEmail, contactPhone, specialInstructions) {
    const bookings = this._getFromStorage('bookings');
    let currentId = localStorage.getItem('current_booking_id') || '';
    let booking = currentId ? bookings.find((b) => b.id === currentId) : null;

    if (!booking) {
      booking = this._getOrCreateCurrentBooking('time_slot');
    }

    booking.contact_name = contactName;
    booking.contact_email = contactEmail;
    booking.contact_phone = contactPhone || null;
    booking.special_instructions = specialInstructions || null;

    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
    } else {
      bookings.push(booking);
    }
    this._saveToStorage('bookings', bookings);
    localStorage.setItem('current_booking_id', booking.id);

    return {
      success: true,
      booking_id: booking.id,
      message: 'Contact information updated'
    };
  }

  // 12. applyPromoCodeToCurrentBooking(promoCode)
  applyPromoCodeToCurrentBooking(promoCode) {
    const codeInput = (promoCode || '').trim();
    if (!codeInput) {
      return {
        success: false,
        promo_code_applied: false,
        promo_code_description: '',
        discount_amount: 0,
        new_total_price: 0,
        currency: 'USD',
        message: 'Promo code is required'
      };
    }

    const currentId = localStorage.getItem('current_booking_id') || '';
    if (!currentId) {
      return {
        success: false,
        promo_code_applied: false,
        promo_code_description: '',
        discount_amount: 0,
        new_total_price: 0,
        currency: 'USD',
        message: 'No current booking'
      };
    }

    const bookings = this._getFromStorage('bookings');
    const promoCodes = this._getFromStorage('promo_codes');
    const spaces = this._getFromStorage('spaces');
    const categories = this._getFromStorage('space_categories');

    const booking = bookings.find((b) => b.id === currentId);
    if (!booking) {
      return {
        success: false,
        promo_code_applied: false,
        promo_code_description: '',
        discount_amount: 0,
        new_total_price: 0,
        currency: 'USD',
        message: 'No current booking'
      };
    }

    const promo = promoCodes.find(
      (p) => this._normalizeString(p.code) === this._normalizeString(codeInput)
    );
    if (!promo || promo.is_active === false) {
      return {
        success: false,
        promo_code_applied: false,
        promo_code_description: '',
        discount_amount: 0,
        new_total_price: this._safeNumber(booking.total_price, 0),
        currency: 'USD',
        message: 'Promo code not found or inactive'
      };
    }

    // Check applicability
    let applies = false;
    if (promo.applies_to === 'all_bookings') {
      applies = true;
    } else if (promo.applies_to === 'photoshoot_bookings' || promo.applies_to === 'event_bookings') {
      let categorySlug = null;
      if (booking.space_id) {
        const space = spaces.find((s) => s.id === booking.space_id);
        if (space) {
          const cat = categories.find((c) => c.id === space.category_id);
          categorySlug = cat ? cat.slug : null;
        }
      }
      if (!categorySlug && booking.booking_type === 'event_planner') {
        // treat event_planner as event booking
        categorySlug = 'event_venues';
      }
      if (promo.applies_to === 'photoshoot_bookings') {
        applies = categorySlug === 'photoshoot_studios';
      } else if (promo.applies_to === 'event_bookings') {
        applies = categorySlug === 'event_venues';
      }
    } else {
      // promo.applies_to === 'gift_cards' not applicable to bookings
      applies = false;
    }

    const basePrice = this._safeNumber(booking.base_price, 0);
    const packagePrice = this._safeNumber(booking.package_price, 0);
    const addOnsPrice = this._safeNumber(booking.add_ons_price, 0);
    const totalBefore = basePrice + packagePrice + addOnsPrice;

    if (!applies) {
      return {
        success: false,
        promo_code_applied: false,
        promo_code_description: promo.description || '',
        discount_amount: 0,
        new_total_price: totalBefore,
        currency: 'USD',
        message: 'Promo code does not apply to this booking'
      };
    }

    const { discountAmount, newTotal } = this._applyPromoCodeToAmount(promo, totalBefore);

    booking.promo_code_id = promo.id;
    booking.discount_amount = discountAmount;
    booking.total_price = newTotal;

    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
      this._saveToStorage('bookings', bookings);
    }

    return {
      success: true,
      promo_code_applied: true,
      promo_code_description: promo.description || '',
      discount_amount: discountAmount,
      new_total_price: newTotal,
      currency: 'USD',
      message: 'Promo code applied'
    };
  }

  // 13. getCurrentBookingSummary()
  getCurrentBookingSummary() {
    const currentId = localStorage.getItem('current_booking_id') || '';
    if (!currentId) {
      return { booking_id: null };
    }

    const bookings = this._getFromStorage('bookings');
    const spaces = this._getFromStorage('spaces');
    const categories = this._getFromStorage('space_categories');
    const packages = this._getFromStorage('packages');
    const eventConfigs = this._getFromStorage('event_configurations');
    const addOns = this._getFromStorage('add_ons');
    const promoCodes = this._getFromStorage('promo_codes');

    const booking = bookings.find((b) => b.id === currentId);
    if (!booking) {
      return { booking_id: null };
    }

    const space = booking.space_id ? spaces.find((s) => s.id === booking.space_id) : null;
    const category = space
      ? categories.find((c) => c.id === space.category_id) || null
      : null;

    const pkg = booking.package_id
      ? packages.find((p) => p.id === booking.package_id)
      : null;

    const eventConfig = booking.event_configuration_id
      ? eventConfigs.find((e) => e.id === booking.event_configuration_id)
      : null;

    const selectedAddOns = eventConfig
      ? (eventConfig.selected_add_on_ids || []).map((id) => addOns.find((a) => a.id === id)).filter(Boolean)
      : [];

    const datesTimes = [];
    if (booking.start_datetime && booking.end_datetime) {
      datesTimes.push({
        start_datetime: booking.start_datetime,
        end_datetime: booking.end_datetime
      });
      if (booking.is_recurring && booking.recurrence_frequency === 'weekly') {
        const count = booking.recurrence_count || 1;
        const durHours = this._safeNumber(booking.duration_hours, 0);
        for (let i = 1; i < count; i++) {
          const startIso = this._addDaysToIso(booking.start_datetime, 7 * i);
          const endIso = this._addHoursToIso(startIso, durHours);
          datesTimes.push({ start_datetime: startIso, end_datetime: endIso });
        }
      }
    }

    const basePrice = this._safeNumber(booking.base_price, 0);
    const packagePrice = this._safeNumber(booking.package_price, 0);
    const addOnsPrice = this._safeNumber(booking.add_ons_price, 0);
    const discountAmount = this._safeNumber(booking.discount_amount, 0);
    const finalTotal = this._safeNumber(booking.total_price, 0);

    const promo = booking.promo_code_id
      ? promoCodes.find((p) => p.id === booking.promo_code_id)
      : null;

    const canConfirm = !!(booking.contact_name && booking.contact_email) && booking.status === 'draft';

    return {
      booking_id: booking.id,
      status: booking.status,
      booking_type: booking.booking_type,
      space: space
        ? {
            space_id: space.id,
            name: space.name,
            category_slug: category ? category.slug : null,
            category_name: category ? category.name : null,
            location: space.location || ''
          }
        : null,
      dates_times: datesTimes,
      duration_hours: this._safeNumber(booking.duration_hours, 0),
      is_recurring: !!booking.is_recurring,
      recurrence_frequency: booking.recurrence_frequency || 'none',
      recurrence_day_of_week: booking.recurrence_day_of_week || null,
      recurrence_count: booking.recurrence_count || null,
      package: pkg
        ? {
            package_id: pkg.id,
            name: pkg.name,
            duration_hours: this._safeNumber(pkg.duration_hours, 0),
            price_total: this._safeNumber(pkg.price_total, 0)
          }
        : null,
      event_configuration: eventConfig
        ? {
            event_configuration_id: eventConfig.id,
            event_type: eventConfig.event_type,
            date: eventConfig.date,
            duration_hours: this._safeNumber(eventConfig.duration_hours, 0),
            base_price: this._safeNumber(eventConfig.base_price, 0),
            selected_add_ons: selectedAddOns.map((a) => ({
              add_on_id: a.id,
              name: a.name,
              category: a.category,
              price: this._safeNumber(a.price, 0),
              includes_arch: !!a.includes_arch
            })),
            add_ons_price: this._safeNumber(eventConfig.add_ons_price, 0),
            total_price: this._safeNumber(eventConfig.total_price, 0)
          }
        : null,
      price_breakdown: {
        base_price: basePrice,
        package_price: packagePrice,
        add_ons_price: addOnsPrice,
        discount_amount: discountAmount,
        final_total_price: finalTotal,
        currency: 'USD'
      },
      promo_code: promo
        ? {
            code: promo.code,
            description: promo.description || ''
          }
        : null,
      contact_info: {
        contact_name: booking.contact_name || '',
        contact_email: booking.contact_email || '',
        contact_phone: booking.contact_phone || '',
        special_instructions: booking.special_instructions || ''
      },
      can_confirm: canConfirm
    };
  }

  // 14. confirmCurrentBooking()
  confirmCurrentBooking() {
    const currentId = localStorage.getItem('current_booking_id') || '';
    if (!currentId) {
      return { success: false, booking: null, message: 'No current booking' };
    }

    const bookings = this._getFromStorage('bookings');
    const booking = bookings.find((b) => b.id === currentId);
    if (!booking) {
      return { success: false, booking: null, message: 'No current booking' };
    }

    if (booking.status === 'confirmed') {
      return {
        success: true,
        booking: {
          booking_id: booking.id,
          status: booking.status,
          total_price: this._safeNumber(booking.total_price, 0),
          currency: 'USD'
        },
        message: 'Booking already confirmed'
      };
    }

    // Optional validation: require contact name and email
    if (!booking.contact_name || !booking.contact_email) {
      return {
        success: false,
        booking: null,
        message: 'Contact information is required before confirmation'
      };
    }

    booking.status = 'confirmed';
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
      this._saveToStorage('bookings', bookings);
    }

    return {
      success: true,
      booking: {
        booking_id: booking.id,
        status: booking.status,
        total_price: this._safeNumber(booking.total_price, 0),
        currency: 'USD'
      },
      message: 'Booking confirmed'
    };
  }

  // 15. configureEventBasics(eventType, date, durationHours)
  configureEventBasics(eventType, date, durationHours) {
    const cfg = this._getOrCreateEventConfiguration(eventType || 'other');

    cfg.event_type = eventType;
    // date is ISO date (YYYY-MM-DD). Store as ISO string with no time if provided
    if (date) {
      // Ensure just date portion
      cfg.date = date;
    }
    cfg.duration_hours = this._safeNumber(durationHours, 0) || 0;

    // Simple pricing rule: base price = 100 per hour
    const hourlyBase = 100;
    cfg.base_price = hourlyBase * cfg.duration_hours;

    this._recalculateEventConfigurationTotals(cfg);

    localStorage.setItem('current_event_configuration_id', cfg.id);

    return {
      success: true,
      event_configuration: {
        event_configuration_id: cfg.id,
        event_type: cfg.event_type,
        date: cfg.date,
        duration_hours: this._safeNumber(cfg.duration_hours, 0),
        base_price: this._safeNumber(cfg.base_price, 0),
        selected_add_on_ids: cfg.selected_add_on_ids || [],
        add_ons_price: this._safeNumber(cfg.add_ons_price, 0),
        total_price: this._safeNumber(cfg.total_price, 0),
        currency: 'USD'
      },
      message: 'Event configuration updated'
    };
  }

  // 16. listAvailableAddOnsForCurrentEvent(category)
  listAvailableAddOnsForCurrentEvent(category) {
    const cfg = this._getOrCreateEventConfiguration('other');
    // cfg is not used for filtering add-ons right now, but kept for future logic
    const addOns = this._getFromStorage('add_ons');

    let list = addOns.filter((a) => a.is_active !== false);
    if (category) {
      list = list.filter((a) => a.category === category);
    }

    return list.map((a) => ({
      add_on_id: a.id,
      name: a.name,
      category: a.category,
      description: a.description || '',
      price: this._safeNumber(a.price, 0),
      includes_arch: !!a.includes_arch,
      is_active: a.is_active !== false
    }));
  }

  // 17. getAddOnDetails(addOnId)
  getAddOnDetails(addOnId) {
    const addOns = this._getFromStorage('add_ons');
    const a = addOns.find((x) => x.id === addOnId);
    if (!a) return null;
    return {
      add_on_id: a.id,
      name: a.name,
      category: a.category,
      description: a.description || '',
      price: this._safeNumber(a.price, 0),
      includes_arch: !!a.includes_arch,
      is_active: a.is_active !== false
    };
  }

  // 18. selectAddOnForCurrentEvent(addOnId)
  selectAddOnForCurrentEvent(addOnId) {
    const cfg = this._getOrCreateEventConfiguration('other');
    const addOns = this._getFromStorage('add_ons');
    const addOn = addOns.find((a) => a.id === addOnId && a.is_active !== false);

    if (!addOn) {
      return { success: false, event_configuration: null, message: 'Add-on not found' };
    }

    if (!Array.isArray(cfg.selected_add_on_ids)) cfg.selected_add_on_ids = [];
    if (!cfg.selected_add_on_ids.includes(addOnId)) {
      cfg.selected_add_on_ids.push(addOnId);
    }

    this._recalculateEventConfigurationTotals(cfg);

    const selectedAddOns = (cfg.selected_add_on_ids || [])
      .map((id) => addOns.find((a) => a.id === id))
      .filter(Boolean);

    return {
      success: true,
      event_configuration: {
        event_configuration_id: cfg.id,
        event_type: cfg.event_type,
        date: cfg.date,
        duration_hours: this._safeNumber(cfg.duration_hours, 0),
        base_price: this._safeNumber(cfg.base_price, 0),
        selected_add_ons: selectedAddOns.map((a) => ({
          add_on_id: a.id,
          name: a.name,
          category: a.category,
          price: this._safeNumber(a.price, 0),
          includes_arch: !!a.includes_arch
        })),
        add_ons_price: this._safeNumber(cfg.add_ons_price, 0),
        total_price: this._safeNumber(cfg.total_price, 0),
        currency: 'USD'
      },
      message: 'Add-on selected'
    };
  }

  // 19. removeAddOnFromCurrentEvent(addOnId)
  removeAddOnFromCurrentEvent(addOnId) {
    const cfg = this._getOrCreateEventConfiguration('other');
    if (!Array.isArray(cfg.selected_add_on_ids)) cfg.selected_add_on_ids = [];

    cfg.selected_add_on_ids = cfg.selected_add_on_ids.filter((id) => id !== addOnId);
    this._recalculateEventConfigurationTotals(cfg);

    return {
      success: true,
      event_configuration: {
        event_configuration_id: cfg.id,
        selected_add_on_ids: cfg.selected_add_on_ids,
        add_ons_price: this._safeNumber(cfg.add_ons_price, 0),
        total_price: this._safeNumber(cfg.total_price, 0),
        currency: 'USD'
      },
      message: 'Add-on removed'
    };
  }

  // 20. getCurrentEventConfigurationSummary()
  getCurrentEventConfigurationSummary() {
    const currentId = localStorage.getItem('current_event_configuration_id') || '';
    if (!currentId) {
      return { event_configuration_id: null };
    }

    const configs = this._getFromStorage('event_configurations');
    const addOns = this._getFromStorage('add_ons');
    const cfg = configs.find((c) => c.id === currentId);
    if (!cfg) {
      return { event_configuration_id: null };
    }

    const selectedAddOns = (cfg.selected_add_on_ids || [])
      .map((id) => addOns.find((a) => a.id === id))
      .filter(Boolean);

    return {
      event_configuration_id: cfg.id,
      event_type: cfg.event_type,
      date: cfg.date,
      duration_hours: this._safeNumber(cfg.duration_hours, 0),
      base_price: this._safeNumber(cfg.base_price, 0),
      selected_add_ons: selectedAddOns.map((a) => ({
        add_on_id: a.id,
        name: a.name,
        category: a.category,
        price: this._safeNumber(a.price, 0),
        includes_arch: !!a.includes_arch
      })),
      add_ons_price: this._safeNumber(cfg.add_ons_price, 0),
      total_price: this._safeNumber(cfg.total_price, 0),
      currency: 'USD'
    };
  }

  // 21. createBookingFromCurrentEventConfiguration()
  createBookingFromCurrentEventConfiguration() {
    const currentId = localStorage.getItem('current_event_configuration_id') || '';
    if (!currentId) {
      return { success: false, booking: null, message: 'No current event configuration' };
    }

    const configs = this._getFromStorage('event_configurations');
    const bookings = this._getFromStorage('bookings');

    const cfg = configs.find((c) => c.id === currentId);
    if (!cfg) {
      return { success: false, booking: null, message: 'No current event configuration' };
    }

    const priceInfo = this._calculateBookingPrice({
      bookingType: 'event_planner',
      space: null,
      durationHours: this._safeNumber(cfg.duration_hours, 0),
      recurrenceCount: 1,
      packagePrice: 0,
      addOnsPrice: this._safeNumber(cfg.add_ons_price, 0),
      basePriceOverride: this._safeNumber(cfg.base_price, 0),
      existingDiscount: 0
    });

    const bookingId = this._generateId('booking');
    const booking = {
      id: bookingId,
      booking_type: 'event_planner',
      space_id: null,
      package_id: null,
      event_configuration_id: cfg.id,
      start_datetime: null,
      end_datetime: null,
      duration_hours: this._safeNumber(cfg.duration_hours, 0),
      is_recurring: false,
      recurrence_frequency: 'none',
      recurrence_day_of_week: null,
      recurrence_count: null,
      status: 'draft',
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      special_instructions: null,
      base_price: priceInfo.base_price,
      package_price: 0,
      add_ons_price: priceInfo.add_ons_price,
      promo_code_id: null,
      discount_amount: 0,
      total_price: priceInfo.total_price,
      created_at: this._nowIso()
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);
    localStorage.setItem('current_booking_id', bookingId);

    return {
      success: true,
      booking: {
        booking_id: booking.id,
        booking_type: booking.booking_type,
        event_configuration_id: booking.event_configuration_id,
        status: booking.status,
        base_price: booking.base_price,
        add_ons_price: booking.add_ons_price,
        package_price: booking.package_price,
        discount_amount: booking.discount_amount,
        total_price: booking.total_price,
        currency: 'USD'
      },
      message: 'Booking created from event configuration'
    };
  }

  // 22. getGalleryFilterOptions()
  getGalleryFilterOptions() {
    const setups = this._getFromStorage('gallery_setups').filter((s) => s.is_active !== false);

    const styleMap = new Map();
    const locMap = new Map();

    setups.forEach((s) => {
      if (s.style) {
        const val = this._normalizeString(s.style);
        if (!styleMap.has(val)) styleMap.set(val, s.style);
      }
      if (s.location_type) {
        const val = s.location_type;
        if (!locMap.has(val)) locMap.set(val, val.charAt(0).toUpperCase() + val.slice(1));
      }
    });

    const styles = Array.from(styleMap.entries()).map(([value, label]) => ({ value, label }));
    const location_types = Array.from(locMap.entries()).map(([value, label]) => ({
      value,
      label
    }));

    return { styles, location_types };
  }

  // 23. listGallerySetups(filters = {}, page = 1, pageSize = 20)
  listGallerySetups(filters, page, pageSize) {
    const f = filters || {};
    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task5_galleryFilters',
        JSON.stringify({ filters: f, page: pg, pageSize: ps })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const setupsAll = this._getFromStorage('gallery_setups').filter(
      (s) => s.is_active !== false
    );

    const board = this._getOrCreateInspirationBoard();
    const boardItems = this._getFromStorage('inspiration_board_items').filter(
      (bi) => bi.board_id === board.id
    );
    const savedSet = new Set(boardItems.map((bi) => bi.setup_id));

    let setups = setupsAll.slice();

    if (f.style) {
      const styleNorm = this._normalizeString(f.style);
      setups = setups.filter((s) => this._normalizeString(s.style).includes(styleNorm));
    }

    if (f.locationType) {
      setups = setups.filter((s) => s.location_type === f.locationType);
    }

    if (Array.isArray(f.tags) && f.tags.length) {
      setups = setups.filter((s) => {
        const tags = s.tags || [];
        return f.tags.every((t) => tags.includes(t));
      });
    }

    const totalResults = setups.length;
    const startIdx = (pg - 1) * ps;
    const endIdx = startIdx + ps;
    const slice = setups.slice(startIdx, endIdx);

    const resultSetups = slice.map((s) => ({
      setup_id: s.id,
      title: s.title,
      style: s.style || '',
      location_type: s.location_type,
      thumbnail_image_url: this._getThumbnailFromImages(s.images),
      short_description: (s.description || '').slice(0, 160),
      is_saved_to_board: savedSet.has(s.id)
    }));

    return {
      setups: resultSetups,
      totalResults,
      page: pg,
      pageSize: ps
    };
  }

  // 24. getSetupDetail(setupId)
  getSetupDetail(setupId) {
    const setups = this._getFromStorage('gallery_setups');
    const setup = setups.find((s) => s.id === setupId);
    if (!setup) return null;

    const board = this._getOrCreateInspirationBoard();
    const boardItems = this._getFromStorage('inspiration_board_items').filter(
      (bi) => bi.board_id === board.id
    );
    const saved = boardItems.some((bi) => bi.setup_id === setup.id);

    const images = Array.isArray(setup.images)
      ? setup.images.map((img) => {
          if (typeof img === 'string') return { url: img, alt: setup.title || '' };
          return { url: img.url || '', alt: img.alt || setup.title || '' };
        })
      : [];

    return {
      setup_id: setup.id,
      title: setup.title,
      description: setup.description || '',
      style: setup.style || '',
      location_type: setup.location_type,
      images,
      tags: setup.tags || [],
      is_saved_to_board: saved
    };
  }

  // 25. saveSetupToBoard(setupId)
  saveSetupToBoard(setupId) {
    const board = this._getOrCreateInspirationBoard();
    const items = this._getFromStorage('inspiration_board_items');
    const setups = this._getFromStorage('gallery_setups');

    const existing = items.find((i) => i.board_id === board.id && i.setup_id === setupId);
    if (!existing) {
      const item = {
        id: this._generateId('boarditem'),
        board_id: board.id,
        setup_id: setupId,
        added_at: this._nowIso()
      };
      items.push(item);
      this._saveToStorage('inspiration_board_items', items);
    }

    const boardItems = items.filter((i) => i.board_id === board.id);

    const resultItems = boardItems.map((bi) => {
      const setup = setups.find((s) => s.id === bi.setup_id);
      return {
        setup_id: bi.setup_id,
        title: setup ? setup.title : '',
        thumbnail_image_url: setup ? this._getThumbnailFromImages(setup.images) : '',
        added_at: bi.added_at
      };
    });

    return {
      success: true,
      board: {
        board_id: board.id,
        name: board.name,
        description: board.description || '',
        items: resultItems
      },
      message: 'Setup saved to board'
    };
  }

  // 26. removeSetupFromBoard(setupId)
  removeSetupFromBoard(setupId) {
    const board = this._getOrCreateInspirationBoard();
    let items = this._getFromStorage('inspiration_board_items');
    const setups = this._getFromStorage('gallery_setups');

    items = items.filter((i) => !(i.board_id === board.id && i.setup_id === setupId));
    this._saveToStorage('inspiration_board_items', items);

    const boardItems = items.filter((i) => i.board_id === board.id);
    const resultItems = boardItems.map((bi) => {
      const setup = setups.find((s) => s.id === bi.setup_id);
      return {
        setup_id: bi.setup_id,
        title: setup ? setup.title : '',
        thumbnail_image_url: setup ? this._getThumbnailFromImages(setup.images) : '',
        added_at: bi.added_at
      };
    });

    return {
      success: true,
      board: {
        board_id: board.id,
        items: resultItems
      },
      message: 'Setup removed from board'
    };
  }

  // 27. getInspirationBoard()
  getInspirationBoard() {
    const board = this._getOrCreateInspirationBoard();
    const items = this._getFromStorage('inspiration_board_items');
    const setups = this._getFromStorage('gallery_setups');

    const boardItems = items.filter((i) => i.board_id === board.id);
    const resultItems = boardItems.map((bi) => {
      const setup = setups.find((s) => s.id === bi.setup_id);
      return {
        setup_id: bi.setup_id,
        title: setup ? setup.title : '',
        thumbnail_image_url: setup ? this._getThumbnailFromImages(setup.images) : '',
        added_at: bi.added_at
      };
    });

    return {
      board_id: board.id,
      name: board.name,
      description: board.description || '',
      items: resultItems
    };
  }

  // 28. getHelpCenterCategories()
  getHelpCenterCategories() {
    const cats = this._getFromStorage('help_center_categories');
    return cats
      .slice()
      .sort((a, b) => this._safeNumber(a.sort_order, 0) - this._safeNumber(b.sort_order, 0))
      .map((c) => ({
        category_id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || '',
        sort_order: this._safeNumber(c.sort_order, 0)
      }));
  }

  // 29. getFAQArticlesByCategory(categorySlug)
  getFAQArticlesByCategory(categorySlug) {
    const cats = this._getFromStorage('help_center_categories');
    const faqs = this._getFromStorage('faq_articles');

    const cat = cats.find((c) => c.slug === categorySlug);
    if (!cat) return [];

    return faqs
      .filter((f) => f.category_id === cat.id && f.is_active !== false)
      .sort((a, b) => this._safeNumber(a.sort_order, 0) - this._safeNumber(b.sort_order, 0))
      .map((f) => ({
        faq_article_id: f.id,
        title: f.title,
        slug: f.slug || '',
        content_preview: (f.content || '').slice(0, 200),
        content_full: f.content || '',
        is_active: f.is_active !== false,
        sort_order: this._safeNumber(f.sort_order, 0)
      }));
  }

  // 30. getFAQArticleDetails(faqArticleId)
  getFAQArticleDetails(faqArticleId) {
    const faqs = this._getFromStorage('faq_articles');
    const f = faqs.find((x) => x.id === faqArticleId);
    if (!f) return null;

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task8_lastViewedFaqArticleId', String(f.id));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      faq_article_id: f.id,
      title: f.title,
      slug: f.slug || '',
      content: f.content || '',
      is_active: f.is_active !== false
    };
  }

  // 31. submitContactRequest(name, email, message, relatedCategorySlug, source)
  submitContactRequest(name, email, message, relatedCategorySlug, source) {
    const cats = this._getFromStorage('help_center_categories');
    const requests = this._getFromStorage('contact_requests');

    let relatedCategoryId = null;
    if (relatedCategorySlug) {
      const cat = cats.find((c) => c.slug === relatedCategorySlug);
      if (cat) relatedCategoryId = cat.id;
    }

    const id = this._generateId('contact');
    const req = {
      id,
      name,
      email,
      message,
      related_category_id: relatedCategoryId,
      status: 'new',
      source: source || 'other',
      created_at: this._nowIso()
    };

    requests.push(req);
    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
      request_id: req.id,
      status: req.status,
      message: 'Contact request submitted'
    };
  }

  // 32. getGiftCardTemplates()
  getGiftCardTemplates() {
    const templates = this._getFromStorage('gift_card_templates');
    return templates
      .filter((t) => t.is_active !== false)
      .map((t) => ({
        gift_card_template_id: t.id,
        name: t.name,
        type: t.type,
        preset_amount: typeof t.preset_amount === 'number' ? t.preset_amount : null,
        min_amount: typeof t.min_amount === 'number' ? t.min_amount : null,
        max_amount: typeof t.max_amount === 'number' ? t.max_amount : null,
        description: t.description || '',
        is_active: t.is_active !== false
      }));
  }

  // 33. addGiftCardToCart(giftCardTemplateId, amount, deliveryMethod, recipientEmail, message)
  addGiftCardToCart(giftCardTemplateId, amount, deliveryMethod, recipientEmail, message) {
    const templates = this._getFromStorage('gift_card_templates');
    const template = templates.find((t) => t.id === giftCardTemplateId && t.is_active !== false);
    if (!template) {
      return { success: false, cart: null, message: 'Gift card template not found' };
    }

    const amt = this._safeNumber(amount, 0);
    if (template.type === 'preset_amount') {
      if (typeof template.preset_amount === 'number' && amt !== template.preset_amount) {
        return {
          success: false,
          cart: null,
          message: 'Amount must match preset amount'
        };
      }
    } else if (template.type === 'custom_amount') {
      const min = typeof template.min_amount === 'number' ? template.min_amount : 0;
      const max = typeof template.max_amount === 'number' ? template.max_amount : Infinity;
      if (amt < min || amt > max) {
        return {
          success: false,
          cart: null,
          message: 'Amount out of allowed range'
        };
      }
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const unitPrice = amt;
    const totalPrice = unitPrice; // quantity 1

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'gift_card',
      gift_card_template_id: template.id,
      gift_card_amount: amt,
      gift_card_delivery_method: deliveryMethod,
      recipient_email: recipientEmail || null,
      quantity: 1,
      unit_price: unitPrice,
      total_price: totalPrice,
      description: template.name + ' - $' + amt
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    // Recalculate cart subtotal
    const allItems = cartItems.filter((ci) => ci.cart_id === cart.id);
    const subtotal = allItems.reduce((sum, ci) => sum + this._safeNumber(ci.total_price, 0), 0);

    cart.updated_at = this._nowIso();
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    const responseItems = allItems.map((ci) => ({
      cart_item_id: ci.id,
      item_type: ci.item_type,
      description: ci.description,
      quantity: this._safeNumber(ci.quantity, 0),
      unit_price: this._safeNumber(ci.unit_price, 0),
      total_price: this._safeNumber(ci.total_price, 0),
      gift_card_amount: this._safeNumber(ci.gift_card_amount, 0),
      gift_card_delivery_method: ci.gift_card_delivery_method || null,
      recipient_email: ci.recipient_email || null
    }));

    return {
      success: true,
      cart: {
        cart_id: cart.id,
        items: responseItems,
        subtotal,
        currency: 'USD'
      },
      message: 'Gift card added to cart'
    };
  }

  // 34. getCartDetails()
  getCartDetails() {
    const currentId = localStorage.getItem('current_cart_id') || '';
    if (!currentId) {
      return { cart_id: null, items: [], subtotal: 0, currency: 'USD' };
    }

    const cart = this._getFromStorage('carts').find((c) => c.id === currentId);
    if (!cart) {
      return { cart_id: null, items: [], subtotal: 0, currency: 'USD' };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const subtotal = cartItems.reduce((sum, ci) => sum + this._safeNumber(ci.total_price, 0), 0);

    const items = cartItems.map((ci) => ({
      cart_item_id: ci.id,
      item_type: ci.item_type,
      description: ci.description,
      quantity: this._safeNumber(ci.quantity, 0),
      unit_price: this._safeNumber(ci.unit_price, 0),
      total_price: this._safeNumber(ci.total_price, 0),
      gift_card_amount: this._safeNumber(ci.gift_card_amount, 0),
      gift_card_delivery_method: ci.gift_card_delivery_method || null,
      recipient_email: ci.recipient_email || null
    }));

    return {
      cart_id: cart.id,
      items,
      subtotal,
      currency: 'USD'
    };
  }

  // 35. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const qty = this._safeNumber(quantity, 0);
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null, message: 'Cart item not found' };
    }

    const cartId = item.cart_id;

    if (qty <= 0) {
      // remove item
      const filtered = cartItems.filter((ci) => ci.id !== cartItemId);
      this._saveToStorage('cart_items', filtered);
    } else {
      item.quantity = qty;
      item.total_price = this._safeNumber(item.unit_price, 0) * qty;
      const idx = cartItems.findIndex((ci) => ci.id === item.id);
      if (idx !== -1) {
        cartItems[idx] = item;
        this._saveToStorage('cart_items', cartItems);
      }
    }

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId);
    if (!cart) {
      return { success: true, cart: null, message: 'Cart updated' };
    }

    const currentItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id === cart.id
    );
    const subtotal = currentItems.reduce((sum, ci) => sum + this._safeNumber(ci.total_price, 0), 0);

    cart.updated_at = this._nowIso();
    const cartIdx = carts.findIndex((c) => c.id === cart.id);
    if (cartIdx !== -1) {
      carts[cartIdx] = cart;
      this._saveToStorage('carts', carts);
    }

    const responseItems = currentItems.map((ci) => ({
      cart_item_id: ci.id,
      description: ci.description,
      quantity: this._safeNumber(ci.quantity, 0),
      unit_price: this._safeNumber(ci.unit_price, 0),
      total_price: this._safeNumber(ci.total_price, 0)
    }));

    return {
      success: true,
      cart: {
        cart_id: cart.id,
        items: responseItems,
        subtotal,
        currency: 'USD'
      },
      message: 'Cart item quantity updated'
    };
  }

  // 36. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return { success: false, cart: null, message: 'Cart item not found' };
    }

    const cartId = item.cart_id;
    const remaining = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', remaining);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId);
    if (!cart) {
      return { success: true, cart: null, message: 'Cart item removed' };
    }

    const currentItems = remaining.filter((ci) => ci.cart_id === cart.id);
    const subtotal = currentItems.reduce((sum, ci) => sum + this._safeNumber(ci.total_price, 0), 0);

    cart.updated_at = this._nowIso();
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    const responseItems = currentItems.map((ci) => ({
      cart_item_id: ci.id,
      description: ci.description,
      quantity: this._safeNumber(ci.quantity, 0),
      unit_price: this._safeNumber(ci.unit_price, 0),
      total_price: this._safeNumber(ci.total_price, 0)
    }));

    return {
      success: true,
      cart: {
        cart_id: cart.id,
        items: responseItems,
        subtotal,
        currency: 'USD'
      },
      message: 'Cart item removed'
    };
  }

  // 37. getCheckoutSummary()
  getCheckoutSummary() {
    const currentId = localStorage.getItem('current_cart_id') || '';
    if (!currentId) {
      return {
        items: [],
        subtotal: 0,
        total: 0,
        currency: 'USD',
        guest_checkout_supported: true
      };
    }

    const cart = this._getFromStorage('carts').find((c) => c.id === currentId);
    if (!cart) {
      return {
        items: [],
        subtotal: 0,
        total: 0,
        currency: 'USD',
        guest_checkout_supported: true
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    const subtotal = cartItems.reduce((sum, ci) => sum + this._safeNumber(ci.total_price, 0), 0);

    const items = cartItems.map((ci) => ({
      description: ci.description,
      quantity: this._safeNumber(ci.quantity, 0),
      unit_price: this._safeNumber(ci.unit_price, 0),
      total_price: this._safeNumber(ci.total_price, 0)
    }));

    return {
      items,
      subtotal,
      total: subtotal,
      currency: 'USD',
      guest_checkout_supported: true
    };
  }

  // 38. placeOrder(guestCheckout, purchaserName, purchaserEmail)
  placeOrder(guestCheckout, purchaserName, purchaserEmail) {
    const currentId = localStorage.getItem('current_cart_id') || '';
    if (!currentId) {
      return { success: false, order: null, message: 'No current cart' };
    }

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === currentId);
    if (!cart) {
      return { success: false, order: null, message: 'No current cart' };
    }

    const cartItems = this._getFromStorage('cart_items').filter((ci) => ci.cart_id === cart.id);
    if (cartItems.length === 0) {
      return { success: false, order: null, message: 'Cart is empty' };
    }

    const subtotal = cartItems.reduce((sum, ci) => sum + this._safeNumber(ci.total_price, 0), 0);

    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');
    const giftCards = this._getFromStorage('gift_cards');

    const orderId = this._generateId('order');
    const order = {
      id: orderId,
      cart_id: cart.id,
      total_amount: subtotal,
      status: 'pending',
      guest_checkout: !!guestCheckout,
      purchaser_name: purchaserName,
      purchaser_email: purchaserEmail,
      created_at: this._nowIso()
    };

    orders.push(order);

    // Create order items and gift cards
    cartItems.forEach((ci) => {
      if (ci.item_type === 'gift_card') {
        const quantity = this._safeNumber(ci.quantity, 0) || 0;
        for (let i = 0; i < quantity; i++) {
          const gcId = this._generateId('giftcard');
          const code = 'GC-' + this._getNextIdCounter();
          const gc = {
            id: gcId,
            code,
            amount: this._safeNumber(ci.gift_card_amount, 0),
            balance: this._safeNumber(ci.gift_card_amount, 0),
            delivery_method: ci.gift_card_delivery_method || 'digital_voucher',
            recipient_email: ci.recipient_email || null,
            purchaser_email: purchaserEmail || null,
            message: null,
            order_id: orderId,
            status: 'active',
            created_at: this._nowIso()
          };
          giftCards.push(gc);

          const oi = {
            id: this._generateId('orderitem'),
            order_id: orderId,
            item_type: 'gift_card',
            gift_card_id: gcId,
            description: ci.description,
            quantity: 1,
            unit_price: this._safeNumber(ci.unit_price, 0),
            total_price: this._safeNumber(ci.unit_price, 0)
          };
          orderItems.push(oi);
        }
      } else {
        const oi = {
          id: this._generateId('orderitem'),
          order_id: orderId,
          item_type: ci.item_type || 'other',
          gift_card_id: null,
          description: ci.description,
          quantity: this._safeNumber(ci.quantity, 0),
          unit_price: this._safeNumber(ci.unit_price, 0),
          total_price: this._safeNumber(ci.total_price, 0)
        };
        orderItems.push(oi);
      }
    });

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);
    this._saveToStorage('gift_cards', giftCards);

    // Clear cart items and current cart id (conceptually cart is now checked out)
    const allCartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id !== cart.id
    );
    this._saveToStorage('cart_items', allCartItems);

    // Keep cart record but not current
    localStorage.setItem('current_cart_id', '');

    return {
      success: true,
      order: {
        order_id: order.id,
        total_amount: this._safeNumber(order.total_amount, 0),
        status: order.status,
        guest_checkout: !!order.guest_checkout,
        purchaser_name: order.purchaser_name,
        purchaser_email: order.purchaser_email
      },
      message: 'Order placed (pending payment)'
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