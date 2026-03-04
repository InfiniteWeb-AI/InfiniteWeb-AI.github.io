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
    this.idCounter = this._getNextIdCounter(); // advances counter once; IDs start after this
  }

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    // Initialize all data tables in localStorage if not exist (arrays)
    const arrayKeys = [
      'service_categories',
      'services',
      'appointment_slots',
      'inquiries',
      'portfolio_looks',
      'favorite_looks',
      'product_categories',
      'products',
      'cart_items',
      'newsletter_subscriptions',
      'blog_posts',
      'reading_list_items',
      'faq_items',
      'rate_configs',
      'rate_estimates'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single cart instance (may be null initially)
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', JSON.stringify(null));
    }

    // Generic content/config slots (optional, may be overridden externally)
    if (!localStorage.getItem('home_overview')) {
      localStorage.setItem('home_overview', JSON.stringify({}));
    }
    if (!localStorage.getItem('about_content')) {
      localStorage.setItem('about_content', JSON.stringify({}));
    }
    if (!localStorage.getItem('policies_content')) {
      localStorage.setItem('policies_content', JSON.stringify({ sections: [] }));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    if (typeof defaultValue === 'undefined') {
      defaultValue = [];
    }
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue;
    }
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

  // ----------------------
  // Private helpers (from spec)
  // ----------------------

  // Internal helper to get or create the single Cart
  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        currency: 'usd',
        notes: '',
        createdAt: now,
        updatedAt: now
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  // Internal helper to recalculate cart totals after cart items change.
  _recalculateCartTotals(items, currency) {
    const subtotal = items.reduce((sum, item) => {
      const lineTotal = typeof item.totalPrice === 'number' ? item.totalPrice : 0;
      return sum + lineTotal;
    }, 0);
    return {
      subtotal: subtotal,
      currency: currency || 'usd'
    };
  }

  // Internal helper to retrieve the active RateConfig
  _getActiveRateConfig() {
    const configs = this._getFromStorage('rate_configs', []);
    const activeConfigs = configs.filter((c) => c && c.isActive);
    if (activeConfigs.length > 0) {
      // Use the first active config by default
      return activeConfigs[0];
    }
    return null;
  }

  // Internal helper to create an Inquiry record
  _createInquiry(options) {
    const inquiries = this._getFromStorage('inquiries', []);
    const now = new Date().toISOString();

    const inquiry = {
      id: this._generateId('inquiry'),
      type: options.type, // 'contact', 'service_booking', 'package_booking', 'rate_quote', 'general'
      source_page: options.source_page, // 'contact', 'service_detail', 'pricing', 'shop', 'home', 'other'
      name: options.name || null,
      email: options.email || null,
      phone: options.phone || null,
      event_type: options.event_type || null,
      number_of_people:
        typeof options.number_of_people === 'number' ? options.number_of_people : null,
      service_id: options.service_id || null,
      appointment_slot_id: options.appointment_slot_id || null,
      rate_estimate_id: options.rate_estimate_id || null,
      message: options.message || null,
      preferred_date: options.preferred_date || null,
      preferred_time: options.preferred_time || null,
      status: 'new',
      createdAt: now
    };

    inquiries.push(inquiry);
    this._saveToStorage('inquiries', inquiries);

    return inquiry;
  }

  // Internal helper to compute basic availability summary for homepage
  _findNextAvailableSlotSummary() {
    const slots = this._getFromStorage('appointment_slots', []);
    const services = this._getFromStorage('services', []);
    const now = new Date();

    // Identify trial-related services
    const trialServiceIds = services
      .filter((s) => s && (s.isTrial || s.category_key === 'trials'))
      .map((s) => s.id);

    const relevantSlots = slots
      .filter((slot) => {
        if (!slot || !slot.startDateTime) return false;
        if (!slot.isAvailable || slot.status !== 'available') return false;
        if (trialServiceIds.length && trialServiceIds.indexOf(slot.serviceId) === -1) {
          return false;
        }
        let dt;
        try {
          dt = new Date(slot.startDateTime);
        } catch (e) {
          return false;
        }
        if (isNaN(dt.getTime())) return false;
        return dt >= now;
      })
      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

    let summaryText = '';
    let nextDateStr = null;

    if (relevantSlots.length > 0) {
      const nextSlot = relevantSlots[0];
      const d = new Date(nextSlot.startDateTime);
      nextDateStr = d.toISOString();
      summaryText = 'Next available trial: ' + d.toDateString();
    } else {
      summaryText = 'No upcoming trial availability found.';
    }

    let timezone = 'UTC';
    try {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) timezone = tz;
      }
    } catch (e) {}

    return {
      summaryText: summaryText,
      nextAvailableTrialDate: nextDateStr,
      timezone: timezone
    };
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomeOverview
  getHomeOverview() {
    const homeConfig = this._getFromStorage('home_overview', {}) || {};
    const serviceCategories = this._getFromStorage('service_categories', []);
    const portfolioLooks = this._getFromStorage('portfolio_looks', []);
    const blogPosts = this._getFromStorage('blog_posts', []);

    const basicAvailabilitySummary = this._findNextAvailableSlotSummary();

    // Featured service categories
    let featuredServiceCategories;
    if (
      Array.isArray(homeConfig.featuredServiceCategoryIds) &&
      homeConfig.featuredServiceCategoryIds.length
    ) {
      featuredServiceCategories = serviceCategories.filter((cat) =>
        homeConfig.featuredServiceCategoryIds.indexOf(cat.id) !== -1
      );
    } else {
      featuredServiceCategories = serviceCategories
        .slice()
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .slice(0, 4);
    }

    // Featured portfolio looks
    let featuredPortfolioLooks = portfolioLooks.filter((l) => l && l.isFeatured);
    if (!featuredPortfolioLooks.length) {
      featuredPortfolioLooks = portfolioLooks.slice(0, 6);
    }

    // Featured blog posts (published only)
    const publishedPosts = blogPosts.filter((p) => p && p.status === 'published');
    const featuredBlogPosts = publishedPosts
      .slice()
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt,
        publishedAt: p.publishedAt,
        year: p.year,
        featuredImageUrl: p.featuredImageUrl
      }));

    const specialties =
      Array.isArray(homeConfig.specialties) && homeConfig.specialties.length
        ? homeConfig.specialties
        : serviceCategories.map((cat) => ({
            label: cat.name,
            description: cat.description || ''
          }));

    const locationsServed = Array.isArray(homeConfig.locationsServed)
      ? homeConfig.locationsServed
      : [];

    return {
      heroTitle: homeConfig.heroTitle || '',
      heroSubtitle: homeConfig.heroSubtitle || '',
      specialties: specialties,
      locationsServed: locationsServed,
      basicAvailabilitySummary: basicAvailabilitySummary,
      featuredServiceCategories: featuredServiceCategories,
      featuredPortfolioLooks: featuredPortfolioLooks,
      featuredBlogPosts: featuredBlogPosts
    };
  }

  // getServiceCategories
  getServiceCategories() {
    return this._getFromStorage('service_categories', []);
  }

  // getServiceFilterOptions
  getServiceFilterOptions() {
    const categoriesRaw = this._getFromStorage('service_categories', []);
    const services = this._getFromStorage('services', []);

    const categories = categoriesRaw.map((cat) => ({
      key: cat.key,
      name: cat.name,
      isBridal: !!cat.isBridal
    }));

    let minPrice = null;
    let maxPrice = null;
    let currency = 'usd';

    services.forEach((s) => {
      if (!s || s.status !== 'active') return;
      const price = s.basePrice;
      if (typeof price !== 'number') return;
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
      if (s.currency) currency = s.currency;
    });

    const flags = {
      supportsTrialFilter: services.some((s) => s && s.isTrial),
      supportsPackageFilter: services.some((s) => s && s.isPackage),
      supportsIncludesFalseLashesFilter: services.some(
        (s) => s && s.includesFalseLashes
      ),
      supportsIncludesTravelWithinCityFilter: services.some(
        (s) => s && s.includesTravelWithinCity
      )
    };

    return {
      categories: categories,
      price: {
        minPrice: minPrice,
        maxPrice: maxPrice,
        currency: currency
      },
      flags: flags
    };
  }

  // getServices(filters)
  getServices(filters) {
    const allServices = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);
    const f = filters || {};

    let services = allServices.filter((s) => !!s);

    if (f.category_key) {
      services = services.filter((s) => s.category_key === f.category_key);
    }

    if (typeof f.minPrice === 'number') {
      services = services.filter((s) => typeof s.basePrice === 'number' && s.basePrice >= f.minPrice);
    }

    if (typeof f.maxPrice === 'number') {
      services = services.filter((s) => typeof s.basePrice === 'number' && s.basePrice <= f.maxPrice);
    }

    if (typeof f.isBridal === 'boolean') {
      services = services.filter((s) => !!s.isBridal === f.isBridal);
    }

    if (typeof f.isTrial === 'boolean') {
      services = services.filter((s) => !!s.isTrial === f.isTrial);
    }

    if (typeof f.isPackage === 'boolean') {
      services = services.filter((s) => !!s.isPackage === f.isPackage);
    }

    if (typeof f.includesFalseLashes === 'boolean') {
      services = services.filter(
        (s) => !!s.includesFalseLashes === f.includesFalseLashes
      );
    }

    if (typeof f.includesTravelWithinCity === 'boolean') {
      services = services.filter(
        (s) => !!s.includesTravelWithinCity === f.includesTravelWithinCity
      );
    }

    if (f.status) {
      services = services.filter((s) => s.status === f.status);
    }

    if (f.sortBy) {
      const sortBy = f.sortBy;
      if (sortBy === 'price_asc') {
        services.sort((a, b) => (a.basePrice || 0) - (b.basePrice || 0));
      } else if (sortBy === 'price_desc') {
        services.sort((a, b) => (b.basePrice || 0) - (a.basePrice || 0));
      } else if (sortBy === 'name') {
        services.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      } else if (sortBy === 'created_desc') {
        services.sort(
          (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
        );
      }
    }

    const result = services.map((service) => {
      const category = categories.find((c) => c.key === service.category_key) || null;
      return {
        service: service,
        category_name: category ? category.name : null
      };
    });

    return result;
  }

  // getServiceDetail(serviceId)
  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);

    const service = services.find((s) => s && s.id === serviceId) || null;
    if (!service) {
      return {
        service: null,
        category: null,
        relatedServices: []
      };
    }

    const category =
      categories.find((c) => c && c.key === service.category_key) || null;

    const relatedServices = services.filter(
      (s) =>
        s &&
        s.id !== service.id &&
        s.category_key === service.category_key &&
        s.status === 'active'
    );

    // Instrumentation for task completion tracking (task_3)
    try {
      if (service && service.isPackage === true && service.category_key === 'bridal_packages') {
        let existingRaw = localStorage.getItem('task3_comparedPackageIds');
        let existing;
        try {
          existing = existingRaw ? JSON.parse(existingRaw) : [];
        } catch (e2) {
          existing = [];
        }
        if (!Array.isArray(existing)) {
          existing = [];
        }
        if (existing.indexOf(service.id) === -1) {
          existing.push(service.id);
        }
        if (existing.length > 2) {
          existing = existing.slice(0, 2);
        }
        localStorage.setItem('task3_comparedPackageIds', JSON.stringify(existing));
      }
    } catch (e) {
      console.error('Instrumentation error (task_3):', e);
    }

    return {
      service: service,
      category: category,
      relatedServices: relatedServices
    };
  }

  // getServiceAvailableSlots(serviceId, fromDate, toDate, onlyWeekdays, onlyAvailable)
  getServiceAvailableSlots(serviceId, fromDate, toDate, onlyWeekdays, onlyAvailable) {
    const allSlots = this._getFromStorage('appointment_slots', []);
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s && s.id === serviceId) || null;

    let slots = allSlots.filter((slot) => slot && slot.serviceId === serviceId);

    let fromDt = null;
    let toDt = null;
    if (fromDate) {
      try {
        fromDt = new Date(fromDate + 'T00:00:00Z');
      } catch (e) {
        fromDt = null;
      }
    }
    if (toDate) {
      try {
        toDt = new Date(toDate + 'T23:59:59Z');
      } catch (e) {
        toDt = null;
      }
    }

    slots = slots.filter((slot) => {
      if (!slot.startDateTime) return false;
      let dt;
      try {
        dt = new Date(slot.startDateTime);
      } catch (e) {
        return false;
      }
      if (isNaN(dt.getTime())) return false;
      if (fromDt && dt < fromDt) return false;
      if (toDt && dt > toDt) return false;
      return true;
    });

    if (onlyWeekdays) {
      slots = slots.filter((slot) => !!slot.isWeekday);
    }

    if (onlyAvailable) {
      slots = slots.filter(
        (slot) => slot.isAvailable && slot.status === 'available'
      );
    }

    slots.sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime));

    // Foreign key resolution: serviceId -> service
    return slots.map((slot) => ({
      ...slot,
      service: service
    }));
  }

  // submitServiceBookingInquiry
  submitServiceBookingInquiry(
    serviceId,
    appointmentSlotId,
    name,
    email,
    phone,
    event_type,
    number_of_people,
    message
  ) {
    const services = this._getFromStorage('services', []);
    const slots = this._getFromStorage('appointment_slots', []);

    const service = services.find((s) => s && s.id === serviceId) || null;
    const slot = appointmentSlotId
      ? slots.find((sl) => sl && sl.id === appointmentSlotId) || null
      : null;

    let derivedEventType = event_type || null;
    if (!derivedEventType && service) {
      if (service.isBridal || service.category_key === 'bridal_makeup' || service.category_key === 'bridal_packages' || service.category_key === 'trials') {
        derivedEventType = 'bridal';
      } else if (service.category_key === 'photoshoot') {
        derivedEventType = 'photoshoot';
      } else if (service.category_key === 'special_occasion') {
        derivedEventType = 'special_occasion';
      } else if (service.category_key === 'lessons') {
        derivedEventType = 'lesson';
      } else if (service.category_key === 'editorial') {
        derivedEventType = 'editorial';
      } else {
        derivedEventType = 'other';
      }
    }

    let type = 'service_booking';
    if (service && service.isPackage) {
      type = 'package_booking';
    }

    let preferred_date = null;
    let preferred_time = null;
    if (slot && slot.startDateTime) {
      const dt = new Date(slot.startDateTime);
      if (!isNaN(dt.getTime())) {
        preferred_date = dt.toISOString();
        preferred_time = dt.toTimeString().slice(0, 5); // HH:MM
      }
    }

    const inquiry = this._createInquiry({
      type: type,
      source_page: 'service_detail',
      name: name,
      email: email,
      phone: phone,
      event_type: derivedEventType,
      number_of_people: number_of_people,
      service_id: serviceId,
      appointment_slot_id: appointmentSlotId || null,
      rate_estimate_id: null,
      message: message,
      preferred_date: preferred_date,
      preferred_time: preferred_time
    });

    return {
      success: true,
      inquiry: inquiry,
      confirmationMessage: 'Your booking request has been submitted.'
    };
  }

  // getPortfolioFilterOptions
  getPortfolioFilterOptions() {
    const looks = this._getFromStorage('portfolio_looks', []);

    const occasionSet = new Set();
    const styleSet = new Set();
    const yearSet = new Set();

    looks.forEach((look) => {
      if (!look) return;
      if (look.occasion) occasionSet.add(look.occasion);
      if (Array.isArray(look.style_tags)) {
        look.style_tags.forEach((tag) => {
          if (tag) styleSet.add(tag);
        });
      }
      if (typeof look.year === 'number') yearSet.add(look.year);
    });

    const occasions = Array.from(occasionSet).map((val) => ({
      value: val,
      label: val
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const styleTags = Array.from(styleSet);
    const years = Array.from(yearSet).sort((a, b) => b - a);

    return {
      occasions: occasions,
      styleTags: styleTags,
      years: years
    };
  }

  // getPortfolioLooks(filters, page, pageSize)
  getPortfolioLooks(filters, page, pageSize) {
    const looks = this._getFromStorage('portfolio_looks', []);
    const f = filters || {};

    let items = looks.filter((l) => !!l);

    if (Array.isArray(f.occasions) && f.occasions.length) {
      items = items.filter((l) => f.occasions.indexOf(l.occasion) !== -1);
    }

    if (Array.isArray(f.style_tags) && f.style_tags.length) {
      const wanted = f.style_tags.map((t) => t.toLowerCase());
      items = items.filter((l) => {
        if (!Array.isArray(l.style_tags)) return false;
        const lowered = l.style_tags.map((t) => String(t).toLowerCase());
        return wanted.some((w) => lowered.indexOf(w) !== -1);
      });
    }

    if (typeof f.year === 'number') {
      items = items.filter((l) => l.year === f.year);
    }

    if (typeof f.isFeatured === 'boolean') {
      items = items.filter((l) => !!l.isFeatured === f.isFeatured);
    }

    if (f.query) {
      const q = f.query.toLowerCase();
      items = items.filter((l) => {
        const title = (l.title || '').toLowerCase();
        const desc = (l.description || '').toLowerCase();
        return title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    if (f.sortBy) {
      const sortBy = f.sortBy;
      if (sortBy === 'newest') {
        items.sort((a, b) => {
          const da = a.shoot_date ? new Date(a.shoot_date) : new Date(a.year || 0, 0, 1);
          const db = b.shoot_date ? new Date(b.shoot_date) : new Date(b.year || 0, 0, 1);
          return db - da;
        });
      } else if (sortBy === 'oldest') {
        items.sort((a, b) => {
          const da = a.shoot_date ? new Date(a.shoot_date) : new Date(a.year || 0, 0, 1);
          const db = b.shoot_date ? new Date(b.shoot_date) : new Date(b.year || 0, 0, 1);
          return da - db;
        });
      } else if (sortBy === 'title') {
        items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      }
    }

    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalCount = items.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = items.slice(start, end);

    return {
      items: pageItems,
      totalCount: totalCount,
      page: pg,
      pageSize: size
    };
  }

  // addLookToFavorites(lookId)
  addLookToFavorites(lookId) {
    const favorites = this._getFromStorage('favorite_looks', []);

    let existing = favorites.find((f) => f && f.lookId === lookId);
    if (existing) {
      return {
        success: true,
        favorite: existing
      };
    }

    const favorite = {
      id: this._generateId('favorite'),
      lookId: lookId,
      favoritedAt: new Date().toISOString()
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_looks', favorites);

    return {
      success: true,
      favorite: favorite
    };
  }

  // removeLookFromFavorites(lookId)
  removeLookFromFavorites(lookId) {
    const favorites = this._getFromStorage('favorite_looks', []);
    const newFavorites = favorites.filter((f) => f && f.lookId !== lookId);
    const success = newFavorites.length !== favorites.length;
    this._saveToStorage('favorite_looks', newFavorites);
    return { success: success };
  }

  // getFavoriteLooks()
  getFavoriteLooks() {
    const favorites = this._getFromStorage('favorite_looks', []);
    const looks = this._getFromStorage('portfolio_looks', []);

    return favorites.map((favorite) => {
      const look = looks.find((l) => l && l.id === favorite.lookId) || null;
      return {
        favorite: favorite,
        look: look
      };
    });
  }

  // getProductCategories()
  getProductCategories() {
    return this._getFromStorage('product_categories', []);
  }

  // getProducts(filters, page, pageSize)
  getProducts(filters, page, pageSize) {
    const allProducts = this._getFromStorage('products', []);
    const f = filters || {};

    let items = allProducts.filter((p) => !!p);

    if (f.category_key) {
      items = items.filter((p) => p.category_key === f.category_key);
    }

    if (f.type) {
      items = items.filter((p) => p.type === f.type);
    }

    if (typeof f.isDigital === 'boolean') {
      items = items.filter((p) => !!p.isDigital === f.isDigital);
    }

    if (typeof f.isGiftCard === 'boolean') {
      items = items.filter((p) => !!p.isGiftCard === f.isGiftCard);
    }

    if (typeof f.minPrice === 'number') {
      items = items.filter((p) => {
        const price =
          typeof p.basePrice === 'number'
            ? p.basePrice
            : typeof p.minPrice === 'number'
            ? p.minPrice
            : null;
        return price !== null && price >= f.minPrice;
      });
    }

    if (typeof f.maxPrice === 'number') {
      items = items.filter((p) => {
        const price =
          typeof p.basePrice === 'number'
            ? p.basePrice
            : typeof p.maxPrice === 'number'
            ? p.maxPrice
            : null;
        return price !== null && price <= f.maxPrice;
      });
    }

    if (f.status) {
      items = items.filter((p) => p.status === f.status);
    }

    if (f.searchQuery) {
      const q = f.searchQuery.toLowerCase();
      items = items.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const sd = (p.shortDescription || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return (
          name.indexOf(q) !== -1 || sd.indexOf(q) !== -1 || desc.indexOf(q) !== -1
        );
      });
    }

    if (f.sortBy) {
      const sortBy = f.sortBy;
      if (sortBy === 'price_asc') {
        items.sort((a, b) => {
          const pa =
            typeof a.basePrice === 'number'
              ? a.basePrice
              : typeof a.minPrice === 'number'
              ? a.minPrice
              : 0;
          const pb =
            typeof b.basePrice === 'number'
              ? b.basePrice
              : typeof b.minPrice === 'number'
              ? b.minPrice
              : 0;
          return pa - pb;
        });
      } else if (sortBy === 'price_desc') {
        items.sort((a, b) => {
          const pa =
            typeof a.basePrice === 'number'
              ? a.basePrice
              : typeof a.minPrice === 'number'
              ? a.minPrice
              : 0;
          const pb =
            typeof b.basePrice === 'number'
              ? b.basePrice
              : typeof b.minPrice === 'number'
              ? b.minPrice
              : 0;
          return pb - pa;
        });
      } else if (sortBy === 'name') {
        items.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
    }

    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalCount = items.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = items.slice(start, end);

    return {
      items: pageItems,
      totalCount: totalCount,
      page: pg,
      pageSize: size
    };
  }

  // getProductDetail(productId)
  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    return products.find((p) => p && p.id === productId) || null;
  }

  // addProductToCart(productId, quantity, selectedDenomination, recipientName, personalMessage, isDigitalDelivery)
  addProductToCart(
    productId,
    quantity,
    selectedDenomination,
    recipientName,
    personalMessage,
    isDigitalDelivery
  ) {
    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p && p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        cartId: null,
        item: null,
        message: 'Product not found.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const qty = quantity && quantity > 0 ? quantity : 1;

    let unitPrice = null;
    if (product.isGiftCard && typeof selectedDenomination === 'number') {
      unitPrice = selectedDenomination;
    } else if (typeof product.basePrice === 'number') {
      unitPrice = product.basePrice;
    } else if (typeof product.minPrice === 'number') {
      unitPrice = product.minPrice;
    } else {
      unitPrice = 0;
    }

    const item = {
      id: this._generateId('cart_item'),
      cartId: cart.id,
      productId: product.id,
      productName: product.name,
      productType: product.type,
      category_key: product.category_key,
      quantity: qty,
      unitPrice: unitPrice,
      totalPrice: unitPrice * qty,
      selectedDenomination: typeof selectedDenomination === 'number' ? selectedDenomination : null,
      recipientName: recipientName || null,
      personalMessage: personalMessage || null,
      isDigitalDelivery:
        typeof isDigitalDelivery === 'boolean' ? isDigitalDelivery : !!product.isDigital,
      lineNotes: null,
      addedAt: new Date().toISOString()
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    cart.updatedAt = new Date().toISOString();
    this._saveToStorage('cart', cart);

    return {
      success: true,
      cartId: cart.id,
      item: item,
      message: 'Item added to cart.'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getFromStorage('cart', null);
    const allItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);

    if (!cart) {
      return {
        cart: null,
        items: [],
        totals: {
          subtotal: 0,
          currency: 'usd'
        }
      };
    }

    const itemsForCart = allItems.filter((i) => i && i.cartId === cart.id);

    const itemsWithResolved = itemsForCart.map((item) => {
      const product = products.find((p) => p && p.id === item.productId) || null;
      return {
        ...item,
        product: product,
        cart: cart
      };
    });

    const totals = this._recalculateCartTotals(itemsForCart, cart.currency);

    return {
      cart: cart,
      items: itemsWithResolved,
      totals: totals
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex((i) => i && i.id === cartItemId);
    if (idx === -1 || !cart) {
      return {
        success: false,
        cart: cart,
        items: this.getCartSummary().items
      };
    }

    if (!quantity || quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      const item = cartItems[idx];
      item.quantity = quantity;
      item.totalPrice = (item.unitPrice || 0) * quantity;
      cartItems[idx] = item;
    }

    this._saveToStorage('cart_items', cartItems);
    cart.updatedAt = new Date().toISOString();
    this._saveToStorage('cart', cart);

    const summary = this.getCartSummary();

    return {
      success: true,
      cart: summary.cart,
      items: summary.items
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    const cartItems = this._getFromStorage('cart_items', []);

    const newItems = cartItems.filter((i) => i && i.id !== cartItemId);
    const success = newItems.length !== cartItems.length;

    this._saveToStorage('cart_items', newItems);
    if (cart) {
      cart.updatedAt = new Date().toISOString();
      this._saveToStorage('cart', cart);
    }

    const summary = this.getCartSummary();
    return {
      success: success,
      cart: summary.cart,
      items: summary.items
    };
  }

  // getPricingOverview()
  getPricingOverview() {
    const services = this._getFromStorage('services', []);
    const rateConfig = this._getActiveRateConfig();

    let bridalServiceStartingAt = null;
    let specialOccasionStartingAt = null;
    let currency = 'usd';

    services.forEach((s) => {
      if (!s || s.status !== 'active') return;
      if (s.currency) currency = s.currency;
      if ((s.isBridal || s.category_key === 'bridal_makeup') && typeof s.basePrice === 'number') {
        if (
          bridalServiceStartingAt === null ||
          s.basePrice < bridalServiceStartingAt
        ) {
          bridalServiceStartingAt = s.basePrice;
        }
      }
      if (s.category_key === 'special_occasion' && typeof s.basePrice === 'number') {
        if (
          specialOccasionStartingAt === null ||
          s.basePrice < specialOccasionStartingAt
        ) {
          specialOccasionStartingAt = s.basePrice;
        }
      }
    });

    return {
      bridalServiceStartingAt: bridalServiceStartingAt,
      specialOccasionStartingAt: specialOccasionStartingAt,
      currency: currency,
      notes: '',
      rateConfigSummary: rateConfig
    };
  }

  // getRateCalculatorConfig()
  getRateCalculatorConfig() {
    return this._getActiveRateConfig();
  }

  // calculateRateEstimate(bride_count, bridesmaid_count, additional_people_count, location_type)
  calculateRateEstimate(bride_count, bridesmaid_count, additional_people_count, location_type) {
    const rateConfig = this._getActiveRateConfig();
    const estimates = this._getFromStorage('rate_estimates', []);

    const brideCount = bride_count || 0;
    const bridesmaidCount = bridesmaid_count || 0;
    const additionalCount = additional_people_count || 0;
    const locType = location_type === 'in_studio' ? 'in_studio' : 'on_site';

    let brideRate = 0;
    let bridesmaidRate = 0;
    let additionalRate = 0;
    let travelFee = 0;

    if (rateConfig) {
      if (locType === 'on_site') {
        brideRate = rateConfig.bride_rate_on_site || 0;
        bridesmaidRate = rateConfig.bridesmaid_rate_on_site || 0;
        additionalRate =
          rateConfig.additional_person_rate_on_site ||
          rateConfig.bridesmaid_rate_on_site ||
          0;
        travelFee = rateConfig.travel_fee_flat || 0;
      } else {
        brideRate = rateConfig.bride_rate_in_studio || 0;
        bridesmaidRate = rateConfig.bridesmaid_rate_in_studio || 0;
        additionalRate =
          rateConfig.additional_person_rate_in_studio ||
          rateConfig.bridesmaid_rate_in_studio ||
          0;
        travelFee = 0;
      }
    }

    const calculated_subtotal =
      brideCount * brideRate + bridesmaidCount * bridesmaidRate + additionalCount * additionalRate;

    const discount_amount = 0;
    const total = calculated_subtotal + travelFee - discount_amount;

    const details =
      'Bride: ' +
      brideCount +
      ', Bridesmaids: ' +
      bridesmaidCount +
      ', Additional: ' +
      additionalCount +
      ', Location: ' +
      locType;

    const estimate = {
      id: this._generateId('rate_estimate'),
      rate_config_id: rateConfig ? rateConfig.id : null,
      bride_count: brideCount,
      bridesmaid_count: bridesmaidCount,
      additional_people_count: additionalCount,
      location_type: locType,
      calculated_subtotal: calculated_subtotal,
      travel_fee: travelFee,
      discount_amount: discount_amount,
      total: total,
      details: details,
      createdAt: new Date().toISOString()
    };

    estimates.push(estimate);
    this._saveToStorage('rate_estimates', estimates);

    // Foreign key resolution for rate_config_id
    return {
      ...estimate,
      rate_config: rateConfig || null
    };
  }

  // startRateEstimateInquiry(rateEstimateId, name, email, phone, message)
  startRateEstimateInquiry(rateEstimateId, name, email, phone, message) {
    const rateEstimates = this._getFromStorage('rate_estimates', []);
    const estimate = rateEstimates.find((re) => re && re.id === rateEstimateId) || null;

    const inquiry = this._createInquiry({
      type: 'rate_quote',
      source_page: 'pricing',
      name: name || null,
      email: email || null,
      phone: phone || null,
      event_type: 'bridal',
      number_of_people: estimate
        ? estimate.bride_count + estimate.bridesmaid_count + (estimate.additional_people_count || 0)
        : null,
      service_id: null,
      appointment_slot_id: null,
      rate_estimate_id: rateEstimateId,
      message: message,
      preferred_date: null,
      preferred_time: null
    });

    return {
      success: true,
      inquiry: inquiry,
      confirmationMessage: 'Your rate estimate inquiry has been submitted.'
    };
  }

  // submitContactInquiry(name, email, phone, event_type, number_of_people, message, preferred_date, preferred_time)
  submitContactInquiry(
    name,
    email,
    phone,
    event_type,
    number_of_people,
    message,
    preferred_date,
    preferred_time
  ) {
    const inquiry = this._createInquiry({
      type: 'contact',
      source_page: 'contact',
      name: name,
      email: email,
      phone: phone || null,
      event_type: event_type || null,
      number_of_people: number_of_people || null,
      service_id: null,
      appointment_slot_id: null,
      rate_estimate_id: null,
      message: message,
      preferred_date: preferred_date || null,
      preferred_time: preferred_time || null
    });

    return {
      success: true,
      inquiry: inquiry,
      confirmationMessage: 'Your inquiry has been sent.'
    };
  }

  // subscribeToNewsletter(email, name, interests, consentGiven, source)
  subscribeToNewsletter(email, name, interests, consentGiven, source) {
    const subs = this._getFromStorage('newsletter_subscriptions', []);
    const now = new Date().toISOString();

    const normalizedInterests = Array.isArray(interests) ? interests : [];

    let existing = subs.find((s) => s && s.email === email) || null;

    if (existing) {
      existing.name = name || existing.name || null;
      existing.interests = normalizedInterests;
      existing.consentGiven = !!consentGiven;
      existing.source = source || existing.source || 'other';
      existing.active = !!consentGiven;
    } else {
      existing = {
        id: this._generateId('newsletter'),
        email: email,
        name: name || null,
        interests: normalizedInterests,
        consentGiven: !!consentGiven,
        subscribedAt: now,
        source: source || 'footer',
        active: !!consentGiven
      };
      subs.push(existing);
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return existing;
  }

  // getBlogFilterOptions()
  getBlogFilterOptions() {
    const posts = this._getFromStorage('blog_posts', []);

    const yearSet = new Set();
    const tagSet = new Set();
    const categorySet = new Set();

    posts.forEach((p) => {
      if (!p || p.status !== 'published') return;
      if (typeof p.year === 'number') yearSet.add(p.year);
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (t) tagSet.add(t);
        });
      }
      if (p.category) categorySet.add(p.category);
    });

    return {
      years: Array.from(yearSet).sort((a, b) => b - a),
      tags: Array.from(tagSet),
      categories: Array.from(categorySet)
    };
  }

  // searchBlogPosts(query, year, tags, category, page, pageSize)
  searchBlogPosts(query, year, tags, category, page, pageSize) {
    const posts = this._getFromStorage('blog_posts', []);

    let items = posts.filter((p) => p && p.status === 'published');

    if (query) {
      const q = query.toLowerCase();
      const tokens = q.split(/\s+/).filter((t) => t);
      if (tokens.length) {
        items = items.filter((p) => {
          const haystack = (
            (p.title || '') +
            ' ' +
            (p.excerpt || '') +
            ' ' +
            (p.content || '')
          ).toLowerCase();
          return tokens.every((t) => haystack.indexOf(t) !== -1);
        });
      }
    }

    if (typeof year === 'number') {
      items = items.filter((p) => p.year === year);
    }

    if (Array.isArray(tags) && tags.length) {
      const wanted = tags.map((t) => t.toLowerCase());
      items = items.filter((p) => {
        if (!Array.isArray(p.tags)) return false;
        const lowerTags = p.tags.map((t) => String(t).toLowerCase());
        return wanted.some((w) => lowerTags.indexOf(w) !== -1);
      });
    }

    if (category) {
      items = items.filter((p) => p.category === category);
    }

    // Sort newest first by publishedAt
    items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const pg = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const totalCount = items.length;
    const start = (pg - 1) * size;
    const end = start + size;
    const pageItems = items.slice(start, end).map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      publishedAt: p.publishedAt,
      year: p.year,
      tags: p.tags || [],
      featuredImageUrl: p.featuredImageUrl,
      readTimeMinutes: p.readTimeMinutes
    }));

    return {
      items: pageItems,
      totalCount: totalCount,
      page: pg,
      pageSize: size
    };
  }

  // getBlogPostDetail(blogPostId)
  getBlogPostDetail(blogPostId) {
    const posts = this._getFromStorage('blog_posts', []);
    return posts.find((p) => p && p.id === blogPostId) || null;
  }

  // saveBlogPostToReadingList(blogPostId)
  saveBlogPostToReadingList(blogPostId) {
    const items = this._getFromStorage('reading_list_items', []);

    let existing = items.find((i) => i && i.blogPostId === blogPostId) || null;
    if (existing) {
      return {
        success: true,
        item: existing
      };
    }

    const item = {
      id: this._generateId('reading_list'),
      blogPostId: blogPostId,
      savedAt: new Date().toISOString()
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      item: item
    };
  }

  // getReadingListItems()
  getReadingListItems() {
    const items = this._getFromStorage('reading_list_items', []);
    const posts = this._getFromStorage('blog_posts', []);

    return items.map((item) => {
      const post = posts.find((p) => p && p.id === item.blogPostId) || null;
      return {
        item: item,
        post: post
      };
    });
  }

  // removeReadingListItem(blogPostId)
  removeReadingListItem(blogPostId) {
    const items = this._getFromStorage('reading_list_items', []);
    const newItems = items.filter((i) => i && i.blogPostId !== blogPostId);
    const success = newItems.length !== items.length;
    this._saveToStorage('reading_list_items', newItems);
    return { success: success };
  }

  // getRelatedBlogPosts(blogPostId)
  getRelatedBlogPosts(blogPostId) {
    const posts = this._getFromStorage('blog_posts', []);

    const published = posts.filter((p) => p && p.status === 'published');
    if (!published.length) return [];

    published.sort((a, b) => new Date(a.publishedAt) - new Date(b.publishedAt));

    const index = published.findIndex((p) => p.id === blogPostId);
    if (index === -1) return [];

    const related = [];

    if (index > 0) {
      const prev = published[index - 1];
      related.push({
        id: prev.id,
        title: prev.title,
        slug: prev.slug,
        relation_type: 'previous'
      });
    }

    if (index < published.length - 1) {
      const next = published[index + 1];
      related.push({
        id: next.id,
        title: next.title,
        slug: next.slug,
        relation_type: 'next'
      });
    }

    // Optionally, add another post from same category as 'related'
    const current = published[index];
    if (current && current.category) {
      const sameCategory = published.find(
        (p, idx) => idx !== index && p.category === current.category
      );
      if (sameCategory) {
        related.push({
          id: sameCategory.id,
          title: sameCategory.title,
          slug: sameCategory.slug,
          relation_type: 'related'
        });
      }
    }

    return related;
  }

  // searchFAQItems(query, category, tag)
  searchFAQItems(query, category, tag) {
    const faqs = this._getFromStorage('faq_items', []);

    let items = faqs.filter((f) => !!f);

    if (query) {
      const q = query.toLowerCase();
      items = items.filter((f) => {
        const question = (f.question || '').toLowerCase();
        const answer = (f.answer || '').toLowerCase();
        return question.indexOf(q) !== -1 || answer.indexOf(q) !== -1;
      });
    }

    if (category) {
      items = items.filter((f) => f.category === category);
    }

    if (tag) {
      const t = tag.toLowerCase();
      items = items.filter((f) => {
        if (!Array.isArray(f.tags)) return false;
        const lower = f.tags.map((x) => String(x).toLowerCase());
        return lower.indexOf(t) !== -1;
      });
    }

    // Instrumentation for task completion tracking (task_8)
    try {
      if (
        typeof query === 'string' &&
        query.trim() &&
        query.toLowerCase().indexOf('cancellation') !== -1 &&
        items &&
        items.length > 0
      ) {
        const payload = {
          query: query,
          category: category || null,
          tag: tag || null,
          resultIds: items.map((f) => f.id)
        };
        localStorage.setItem('task8_cancellationFaqSearch', JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Instrumentation error (task_8):', e);
    }

    return items;
  }

  // getAboutContent()
  getAboutContent() {
    const about = this._getFromStorage('about_content', {});
    return {
      heading: about.heading || '',
      body: about.body || '',
      experienceHighlights: Array.isArray(about.experienceHighlights)
        ? about.experienceHighlights
        : [],
      notableClients: Array.isArray(about.notableClients)
        ? about.notableClients
        : [],
      testimonials: Array.isArray(about.testimonials) ? about.testimonials : []
    };
  }

  // getPoliciesContent()
  getPoliciesContent() {
    const policies = this._getFromStorage('policies_content', { sections: [] });
    return {
      sections: Array.isArray(policies.sections) ? policies.sections : []
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
