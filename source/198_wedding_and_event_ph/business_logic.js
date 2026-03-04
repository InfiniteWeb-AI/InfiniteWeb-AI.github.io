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

  _initStorage() {
    // Initialize all data tables in localStorage if not exist.
    const keys = [
      // Core domain entities
      'service_packages',
      'add_ons',
      'add_on_bundles',
      'photographers',
      'preferred_photographer_selections',
      'event_package_configurations',
      'event_inquiries',
      'consultation_appointments',
      'blog_articles',
      'reading_lists',
      'portfolio_images',
      'shot_lists',
      'availability_options',
      'booking_summaries',
      'gift_card_products',
      'carts',
      'cart_items',
      'checkout_reviews',
      'quotes',
      'quote_items'
    ];

    for (const key of keys) {
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

  _toIsoDate(dateStr) {
    // dateStr expected in 'yyyy-mm-dd'
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00Z');
    return d.toISOString();
  }

  _getDatePart(isoString) {
    if (!isoString) return null;
    return isoString.slice(0, 10);
  }

  _caseInsensitiveEquals(a, b) {
    if (a == null || b == null) return false;
    return String(a).toLowerCase() === String(b).toLowerCase();
  }

  _humanizeTag(tag) {
    if (!tag) return '';
    return tag
      .replace(/[_-]+/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  _sum(arr) {
    return arr.reduce((acc, v) => acc + (typeof v === 'number' ? v : 0), 0);
  }

  // ---------- Helper objects resolution ----------

  _resolveAddOnBundle(bundle) {
    if (!bundle) return null;
    const addOns = this._getFromStorage('add_ons');
    const packages = this._getFromStorage('service_packages');
    const resolved = { ...bundle };
    if (Array.isArray(bundle.add_on_ids)) {
      resolved.add_ons = bundle.add_on_ids
        .map(id => addOns.find(a => a.id === id) || null)
        .filter(a => a);
    }
    if (bundle.base_package_id) {
      resolved.base_package =
        packages.find(p => p.id === bundle.base_package_id) || null;
    }
    return resolved;
  }

  _resolveEventPackageConfiguration(config) {
    if (!config) return null;
    const addOns = this._getFromStorage('add_ons');
    const resolved = { ...config };
    if (Array.isArray(config.add_on_ids)) {
      resolved.add_ons = config.add_on_ids
        .map(id => addOns.find(a => a.id === id) || null)
        .filter(a => a);
    }
    return resolved;
  }

  _resolveCartItemsForView(cartId) {
    const cartItemsRaw = this._getFromStorage('cart_items');
    const giftCards = this._getFromStorage('gift_card_products');
    const packages = this._getFromStorage('service_packages');
    const bundles = this._getFromStorage('add_on_bundles');

    const items = cartItemsRaw.filter(ci => ci.cart_id === cartId);

    return items.map(item => {
      let ref = null;
      let displayName = '';
      let typeLabel = '';
      if (item.item_type === 'gift_card') {
        ref = giftCards.find(g => g.id === item.item_ref_id) || null;
        displayName = ref ? ref.name : 'Gift Card';
        typeLabel = 'Gift Card';
      } else if (item.item_type === 'service_package') {
        ref = packages.find(p => p.id === item.item_ref_id) || null;
        displayName = ref ? ref.name : 'Service Package';
        typeLabel = 'Service Package';
      } else if (item.item_type === 'add_on_bundle') {
        ref = bundles.find(b => b.id === item.item_ref_id) || null;
        displayName = ref ? ref.name || 'Add-on Bundle' : 'Add-on Bundle';
        typeLabel = 'Add-on Bundle';
      }
      // Foreign key resolution for item_ref_id -> item_ref
      const itemWithRef = { ...item, item_ref: ref };
      return {
        item: itemWithRef,
        display_name: displayName,
        item_type_label: typeLabel
      };
    });
  }

  _recalculateCartTotals(cart) {
    if (!cart) return cart;
    const cartItemsRaw = this._getFromStorage('cart_items');
    const items = cartItemsRaw.filter(ci => ci.cart_id === cart.id);
    const total = this._sum(items.map(i => i.subtotal || 0));
    cart.updated_at = this._nowIso();
    cart.total_price = total;
    return cart;
  }

  _recalculateQuoteTotals(quote) {
    if (!quote) return quote;
    const quoteItems = this._getFromStorage('quote_items').filter(
      qi => qi.quote_id === quote.id
    );
    quote.total_price = this._sum(quoteItems.map(qi => qi.subtotal || 0));
    quote.updated_at = this._nowIso();
    return quote;
  }

  _recalculateBookingSummaryTotal(summary) {
    if (!summary) return summary;
    const packages = this._getFromStorage('service_packages');
    const bundles = this._getFromStorage('add_on_bundles');
    const pkg = summary.package_id
      ? packages.find(p => p.id === summary.package_id)
      : null;
    const bundle = summary.add_on_bundle_id
      ? bundles.find(b => b.id === summary.add_on_bundle_id)
      : null;
    const base = pkg ? pkg.base_price || 0 : 0;
    const extras = bundle ? bundle.total_price || 0 : 0;
    summary.total_price = base + extras;
    return summary;
  }

  // ---------- Internal helpers from spec ----------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        item_ids: [],
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getCurrentCart() {
    const carts = this._getFromStorage('carts');
    return carts.find(c => c.status === 'open') || null;
  }

  _getOrCreateReadingList() {
    const lists = this._getFromStorage('reading_lists');
    if (lists.length > 0) {
      return lists[0];
    }
    const list = {
      id: this._generateId('reading_list'),
      name: 'My Reading List',
      article_ids: [],
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  _getOrCreateShotList() {
    const lists = this._getFromStorage('shot_lists');
    if (lists.length > 0) {
      return lists[0];
    }
    const list = {
      id: this._generateId('shot_list'),
      name: 'My Shot List',
      image_ids: [],
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    lists.push(list);
    this._saveToStorage('shot_lists', lists);
    return list;
  }

  _getOrCreateEventPackageConfiguration() {
    const configs = this._getFromStorage('event_package_configurations');
    if (configs.length > 0) {
      return configs[0];
    }
    const config = {
      id: this._generateId('event_pkg_cfg'),
      event_type: 'event_corporate',
      coverage_hours: 0,
      budget_limit: 0,
      add_on_ids: [],
      includes_on_site_printing: false,
      total_estimated_price: 0,
      notes: ''
    };
    configs.push(config);
    this._saveToStorage('event_package_configurations', configs);
    return config;
  }

  _getOrCreateBookingSummary() {
    const summaries = this._getFromStorage('booking_summaries');
    if (summaries.length > 0) {
      return summaries[0];
    }
    // Do not create an incomplete summary automatically here; return null.
    return null;
  }

  _getOrCreateQuote() {
    const quotes = this._getFromStorage('quotes');
    let quote = quotes.find(q => q.status === 'draft');
    if (!quote) {
      quote = {
        id: this._generateId('quote'),
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        total_price: 0,
        status: 'draft'
      };
      quotes.push(quote);
      this._saveToStorage('quotes', quotes);
    }
    return quote;
  }

  _getCurrentCheckoutReview() {
    const cart = this._getCurrentCart();
    if (!cart) return null;
    const reviews = this._getFromStorage('checkout_reviews');
    // Prefer in_progress for current cart
    let current = reviews
      .filter(r => r.cart_id === cart.id && r.status !== 'cancelled')
      .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
      .pop();
    return current || null;
  }

  _getPreferredPhotographerSelection(context) {
    const selections = this._getFromStorage(
      'preferred_photographer_selections'
    );
    const filtered = selections.filter(s => s.context === context);
    if (filtered.length === 0) return null;
    filtered.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    return filtered[filtered.length - 1];
  }

  // ===================== Core interface implementations =====================

  // -------- Homepage --------

  getHomePageContent() {
    const servicePackages = this._getFromStorage('service_packages');
    const portfolioImages = this._getFromStorage('portfolio_images');
    const blogArticles = this._getFromStorage('blog_articles');

    const featured_wedding_packages = servicePackages
      .filter(p => p.event_type === 'wedding' && p.is_active)
      .slice(0, 3);

    const featured_event_packages = servicePackages
      .filter(p => p.event_type === 'event_corporate' && p.is_active)
      .slice(0, 3);

    const featured_portfolio_images = portfolioImages
      .slice()
      .sort((a, b) => {
        const af = a.is_featured ? 1 : 0;
        const bf = b.is_featured ? 1 : 0;
        if (af !== bf) return bf - af;
        const ad = a.shot_date || '';
        const bd = b.shot_date || '';
        return (bd || '').localeCompare(ad || '');
      })
      .slice(0, 6);

    const highlighted_blog_articles = blogArticles
      .filter(a => a.is_published)
      .slice()
      .sort((a, b) => (b.publish_date || '').localeCompare(a.publish_date || ''))
      .slice(0, 3);

    const primary_ctas = [
      { id: 'view_weddings', label: 'View Weddings', target_page: 'weddings' },
      { id: 'view_events', label: 'Corporate Events', target_page: 'events' },
      {
        id: 'check_availability',
        label: 'Check Availability',
        target_page: 'check_availability'
      },
      {
        id: 'book_consultation',
        label: 'Book a Consultation',
        target_page: 'consultation_booking'
      }
    ];

    return {
      featured_wedding_packages,
      featured_event_packages,
      featured_portfolio_images,
      highlighted_blog_articles,
      primary_ctas
    };
  }

  // -------- Weddings: packages & quote (task 1) --------

  getWeddingPackageFilterOptions() {
    const packages = this._getFromStorage('service_packages').filter(
      p => p.event_type === 'wedding'
    );

    // Duration options from coverage_hours
    const hoursSet = new Set();
    packages.forEach(p => {
      if (typeof p.coverage_hours === 'number' && p.coverage_hours > 0) {
        hoursSet.add(p.coverage_hours);
      }
    });
    const duration_options = Array.from(hoursSet)
      .sort((a, b) => a - b)
      .map(h => ({
        value_hours: h,
        label: h + ' hours',
        is_full_day: h >= 8
      }));
    // Ensure a generic full-day option exists
    if (!duration_options.some(o => o.is_full_day && o.value_hours >= 8)) {
      duration_options.push({
        value_hours: 8,
        label: 'Full Day (8+ hours)',
        is_full_day: true
      });
    }

    // Month options from available_months
    const monthSet = new Set();
    packages.forEach(p => {
      if (Array.isArray(p.available_months)) {
        p.available_months.forEach(m => monthSet.add(m));
      }
    });
    const allMonths = [
      'january',
      'february',
      'march',
      'april',
      'may',
      'june',
      'july',
      'august',
      'september',
      'october',
      'november',
      'december'
    ];
    const monthsToUse = monthSet.size > 0 ? Array.from(monthSet) : allMonths;
    const month_options = monthsToUse.map(m => ({
      value: m,
      label: this._humanizeTag(m)
    }));

    // Day-of-week options
    const days = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ];
    const day_of_week_options = days.map(d => ({
      value: d,
      label: this._humanizeTag(d)
    }));

    const included_service_options = [
      { code: 'second_photographer', label: 'Second Photographer' }
    ];

    const prices = packages.map(p => p.base_price || 0).filter(p => p > 0);
    const min_price = prices.length ? Math.min(...prices) : 0;
    const max_price = prices.length ? Math.max(...prices) : 10000;

    const budget = {
      min_price,
      max_price,
      step: 50,
      currency: 'USD'
    };

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return {
      duration_options,
      month_options,
      day_of_week_options,
      included_service_options,
      budget,
      sort_options
    };
  }

  searchWeddingPackages(filters, sort_by) {
    const f = filters || {};
    let packages = this._getFromStorage('service_packages').filter(
      p => p.event_type === 'wedding' && p.is_active
    );

    if (typeof f.min_coverage_hours === 'number') {
      packages = packages.filter(p => {
        const ch = p.coverage_hours || 0;
        return ch >= f.min_coverage_hours;
      });
    }

    if (f.is_full_day) {
      packages = packages.filter(p => {
        if (typeof p.is_full_day === 'boolean') return p.is_full_day;
        return (p.coverage_hours || 0) >= 8;
      });
    }

    if (f.available_month) {
      packages = packages.filter(p => {
        if (!Array.isArray(p.available_months) || p.available_months.length === 0) {
          return true; // if not specified, treat as available year-round
        }
        return p.available_months.includes(f.available_month);
      });
    }

    if (f.day_of_week) {
      packages = packages.filter(p => {
        if (
          !Array.isArray(p.available_days_of_week) ||
          p.available_days_of_week.length === 0
        ) {
          return true; // assume all days
        }
        return p.available_days_of_week.includes(f.day_of_week);
      });
    }

    if (typeof f.includes_second_photographer === 'boolean') {
      packages = packages.filter(p => {
        if (typeof p.includes_second_photographer === 'boolean') {
          return p.includes_second_photographer === f.includes_second_photographer;
        }
        if (typeof p.included_photographers === 'number') {
          return f.includes_second_photographer
            ? p.included_photographers >= 2
            : p.included_photographers <= 1;
        }
        return !f.includes_second_photographer;
      });
    }

    if (typeof f.max_price === 'number') {
      packages = packages.filter(p => (p.base_price || 0) <= f.max_price);
    }

    if (f.currency) {
      packages = packages.filter(p => p.currency === f.currency);
    }

    const sortKey = sort_by || 'price_low_to_high';
    if (sortKey === 'price_low_to_high') {
      packages.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    } else if (sortKey === 'price_high_to_low') {
      packages.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
    }

    return packages;
  }

  addWeddingPackageToQuote(packageId) {
    const packages = this._getFromStorage('service_packages');
    const pkg = packages.find(p => p.id === packageId && p.event_type === 'wedding');
    if (!pkg) {
      return {
        success: false,
        quote: null,
        quote_item: null,
        message: 'Package not found or not a wedding package.'
      };
    }

    const quoteItems = this._getFromStorage('quote_items');

    const quote = this._getOrCreateQuote();

    const quoteItem = {
      id: this._generateId('quote_item'),
      quote_id: quote.id,
      package_id: pkg.id,
      add_on_bundle_id: null,
      quantity: 1,
      unit_price: pkg.base_price || 0,
      subtotal: pkg.base_price || 0
    };
    quoteItems.push(quoteItem);
    this._saveToStorage('quote_items', quoteItems);

    this._recalculateQuoteTotals(quote);

    // Reload quotes after potential creation to avoid overwriting the new draft quote
    const quotesAll = this._getFromStorage('quotes');
    const updatedQuotes = quotesAll.some(q => q.id === quote.id)
      ? quotesAll.map(q => (q.id === quote.id ? quote : q))
      : quotesAll.concat(quote);
    this._saveToStorage('quotes', updatedQuotes);

    const resolvedQuoteItem = { ...quoteItem, package: pkg };

    return {
      success: true,
      quote,
      quote_item: resolvedQuoteItem,
      message: 'Package added to quote.'
    };
  }

  // -------- Events / Corporate package builder & inquiry (task 2) --------

  getEventServicesOverview() {
    const packages = this._getFromStorage('service_packages');
    const example_packages = packages
      .filter(p => p.event_type === 'event_corporate' && p.is_active)
      .slice(0, 3);

    const intro_text =
      'We provide professional photography coverage for corporate events, conferences, brand activations, and more. Build a custom package that fits your schedule, budget, and on-site needs.';

    return {
      intro_text,
      example_packages
    };
  }

  getAddOnOptions(filters) {
    const f = filters || {};
    let addOns = this._getFromStorage('add_ons');

    if (f.only_active !== false) {
      addOns = addOns.filter(a => a.is_active);
    }

    if (f.for_event_type === 'wedding') {
      addOns = addOns.filter(a =>
        typeof a.is_available_for_wedding === 'boolean'
          ? a.is_available_for_wedding
          : true
      );
    } else if (f.for_event_type === 'event_corporate') {
      addOns = addOns.filter(a =>
        typeof a.is_available_for_event === 'boolean'
          ? a.is_available_for_event
          : true
      );
    }

    if (Array.isArray(f.add_on_types) && f.add_on_types.length > 0) {
      const typesSet = new Set(f.add_on_types);
      addOns = addOns.filter(a => typesSet.has(a.add_on_type));
    }

    return addOns;
  }

  saveEventPackageConfiguration(coverage_hours, budget_limit, add_on_ids, notes) {
    const configs = this._getFromStorage('event_package_configurations');
    let config = this._getOrCreateEventPackageConfiguration();

    const validation_errors = [];

    if (coverage_hours == null || coverage_hours <= 0) {
      validation_errors.push({
        field: 'coverage_hours',
        message: 'Coverage hours must be greater than 0.'
      });
    }

    if (budget_limit == null || budget_limit <= 0) {
      validation_errors.push({
        field: 'budget_limit',
        message: 'Budget limit must be greater than 0.'
      });
    }

    const addOnsAll = this._getFromStorage('add_ons');
    const addOnIdsArr = Array.isArray(add_on_ids) ? add_on_ids : [];
    const selectedAddOns = addOnIdsArr
      .map(id => addOnsAll.find(a => a.id === id) || null)
      .filter(a => a);

    const addOnsTotal = this._sum(selectedAddOns.map(a => a.price || 0));

    if (budget_limit != null && addOnsTotal > budget_limit) {
      validation_errors.push({
        field: 'add_on_ids',
        message: 'Selected add-ons exceed the budget limit.'
      });
    }

    const includesPrinting = selectedAddOns.some(a => {
      if (a.add_on_type === 'printing') return true;
      if (a.code && a.code.toLowerCase() === 'on_site_printing') return true;
      if (a.name && /on[- ]?site printing/i.test(a.name)) return true;
      return false;
    });

    if (validation_errors.length > 0) {
      const resolvedConfig = this._resolveEventPackageConfiguration(config);
      return {
        success: false,
        configuration: resolvedConfig,
        validation_errors
      };
    }

    config.coverage_hours = coverage_hours;
    config.budget_limit = budget_limit;
    config.add_on_ids = addOnIdsArr;
    config.includes_on_site_printing = includesPrinting;
    config.total_estimated_price = addOnsTotal;
    config.notes = notes || config.notes || '';

    const updatedConfigs = configs.length
      ? configs.map(c => (c.id === config.id ? config : c))
      : [config];
    this._saveToStorage('event_package_configurations', updatedConfigs);

    const resolvedConfig = this._resolveEventPackageConfiguration(config);

    return {
      success: true,
      configuration: resolvedConfig,
      validation_errors: []
    };
  }

  getCurrentEventPackageConfiguration() {
    const config = this._getOrCreateEventPackageConfiguration();
    const resolvedConfig = this._resolveEventPackageConfiguration(config);
    return { configuration: resolvedConfig };
  }

  submitEventInquiry(
    event_name,
    event_date,
    start_time,
    end_time,
    location_city,
    location_state,
    guest_count,
    contact_full_name,
    contact_email,
    contact_phone,
    additional_message
  ) {
    const config = this._getOrCreateEventPackageConfiguration();
    if (!config || !config.id) {
      return {
        success: false,
        inquiry: null,
        message: 'No event package configuration found.'
      };
    }

    const inquiries = this._getFromStorage('event_inquiries');
    const inquiry = {
      id: this._generateId('event_inquiry'),
      event_package_configuration_id: config.id,
      event_name: event_name,
      event_type: config.event_type || 'event_corporate',
      event_date: this._toIsoDate(event_date) || this._nowIso(),
      start_time: start_time,
      end_time: end_time,
      location_city: location_city,
      location_state: location_state || null,
      guest_count: typeof guest_count === 'number' ? guest_count : null,
      contact_full_name: contact_full_name,
      contact_email: contact_email,
      contact_phone: contact_phone || null,
      additional_message: additional_message || '',
      created_at: this._nowIso(),
      status: 'new'
    };

    inquiries.push(inquiry);
    this._saveToStorage('event_inquiries', inquiries);

    return {
      success: true,
      inquiry,
      message: 'Event inquiry submitted.'
    };
  }

  // -------- Photographers (task 3) --------

  getPhotographerFilterOptions() {
    const photographers = this._getFromStorage('photographers').filter(
      p => p.is_active
    );

    const specialtySet = new Set();
    photographers.forEach(p => {
      if (Array.isArray(p.specialties)) {
        p.specialties.forEach(s => specialtySet.add(s));
      }
    });
    const specialty_options = Array.from(specialtySet).map(s => ({
      value: s,
      label: this._humanizeTag(s)
    }));

    const rating_thresholds = [4.0, 4.5, 4.8, 5.0];

    const experience_options = [
      { min_weddings: 25, label: '25+ weddings' },
      { min_weddings: 50, label: '50+ weddings' },
      { min_weddings: 100, label: '100+ weddings' }
    ];

    return {
      specialty_options,
      rating_thresholds,
      experience_options
    };
  }

  searchPhotographers(filters, sort_by) {
    const f = filters || {};
    let photographers = this._getFromStorage('photographers').filter(
      p => p.is_active
    );

    if (f.specialty) {
      photographers = photographers.filter(p =>
        Array.isArray(p.specialties) ? p.specialties.includes(f.specialty) : false
      );
    }

    if (typeof f.min_rating === 'number') {
      photographers = photographers.filter(
        p => (p.overall_rating || 0) >= f.min_rating
      );
    }

    if (typeof f.min_weddings_shot === 'number') {
      photographers = photographers.filter(
        p => (p.weddings_shot || 0) >= f.min_weddings_shot
      );
    }

    const sortKey = sort_by || 'rating_desc';
    if (sortKey === 'rating_desc') {
      photographers.sort((a, b) => {
        const rdiff = (b.overall_rating || 0) - (a.overall_rating || 0);
        if (rdiff !== 0) return rdiff;
        return (b.weddings_shot || 0) - (a.weddings_shot || 0);
      });
    } else if (sortKey === 'experience_desc') {
      photographers.sort((a, b) => {
        const aExp = a.years_experience_wedding || a.years_experience_total || 0;
        const bExp = b.years_experience_wedding || b.years_experience_total || 0;
        return bExp - aExp;
      });
    } else if (sortKey === 'name_asc') {
      photographers.sort((a, b) =>
        (a.full_name || '').localeCompare(b.full_name || '')
      );
    }

    return photographers;
  }

  getPhotographerProfile(photographerId) {
    const photographers = this._getFromStorage('photographers');
    const portfolioImages = this._getFromStorage('portfolio_images');

    const photographer = photographers.find(p => p.id === photographerId) || null;
    let highlight_images = [];

    if (photographer && Array.isArray(photographer.highlight_image_ids)) {
      highlight_images = photographer.highlight_image_ids
        .map(id => portfolioImages.find(img => img.id === id) || null)
        .filter(img => img);
    }

    // Instrumentation for task completion tracking
    try {
      const key = 'task3_comparedPhotographerIds';
      let existing = [];
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            existing = parsed;
          }
        } catch (e) {
          // Ignore JSON parse errors and fall back to empty array
        }
      }
      if (
        photographerId &&
        !existing.includes(photographerId) &&
        existing.length < 3
      ) {
        const updated = existing.concat(photographerId);
        localStorage.setItem(key, JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      photographer,
      highlight_images
    };
  }

  setPreferredPhotographer(photographerId, context) {
    const photographers = this._getFromStorage('photographers');
    const photographer = photographers.find(p => p.id === photographerId);
    if (!photographer) {
      return { success: false, selection: null };
    }

    const selections = this._getFromStorage('preferred_photographer_selections');
    let selection = selections.find(s => s.context === context);

    if (!selection) {
      selection = {
        id: this._generateId('preferred_photographer_selection'),
        photographer_id: photographerId,
        context: context,
        created_at: this._nowIso()
      };
      selections.push(selection);
    } else {
      selection.photographer_id = photographerId;
      selection.created_at = this._nowIso();
    }

    this._saveToStorage('preferred_photographer_selections', selections);

    return { success: true, selection };
  }

  getPreferredPhotographer(context) {
    const ctx = context || 'wedding';
    const selection = this._getPreferredPhotographerSelection(ctx);
    const photographers = this._getFromStorage('photographers');
    const photographer = selection
      ? photographers.find(p => p.id === selection.photographer_id) || null
      : null;
    return {
      selection,
      photographer
    };
  }

  // -------- Add-on bundles (task 4) --------

  saveAddOnBundle(add_on_ids, budget_limit, name, base_package_id) {
    const ids = Array.isArray(add_on_ids) ? add_on_ids : [];
    const validation_errors = [];

    if (ids.length < 3) {
      validation_errors.push({
        field: 'add_on_ids',
        message: 'Bundle must include at least 3 add-ons.'
      });
    }

    const addOnsAll = this._getFromStorage('add_ons');
    const selectedAddOns = ids
      .map(id => addOnsAll.find(a => a.id === id) || null)
      .filter(a => a);

    const hasPhotoBooth = selectedAddOns.some(a => {
      if (a.is_photo_booth) return true;
      if (a.add_on_type === 'photo_booth') return true;
      if (a.code && a.code.toLowerCase() === 'photo_booth') return true;
      if (a.name && /photo booth/i.test(a.name)) return true;
      return false;
    });

    if (!hasPhotoBooth) {
      validation_errors.push({
        field: 'add_on_ids',
        message: 'Bundle must include a photo booth add-on.'
      });
    }

    if (budget_limit == null || budget_limit <= 0) {
      validation_errors.push({
        field: 'budget_limit',
        message: 'Budget limit must be greater than 0.'
      });
    }

    const total = this._sum(selectedAddOns.map(a => a.price || 0));
    if (budget_limit != null && total > budget_limit) {
      validation_errors.push({
        field: 'add_on_ids',
        message: 'Bundle total exceeds budget limit.'
      });
    }

    const packages = this._getFromStorage('service_packages');
    let basePackage = null;
    if (base_package_id) {
      basePackage = packages.find(p => p.id === base_package_id) || null;
      if (!basePackage) {
        validation_errors.push({
          field: 'base_package_id',
          message: 'Base package not found.'
        });
      }
    }

    if (validation_errors.length > 0) {
      return {
        success: false,
        bundle: null,
        validation_errors
      };
    }

    const bundles = this._getFromStorage('add_on_bundles');
    const bundle = {
      id: this._generateId('add_on_bundle'),
      name: name || null,
      add_on_ids: ids,
      total_price: total,
      budget_limit: budget_limit,
      base_package_id: basePackage ? basePackage.id : base_package_id || null,
      created_at: this._nowIso()
    };

    bundles.push(bundle);
    this._saveToStorage('add_on_bundles', bundles);

    const resolvedBundle = this._resolveAddOnBundle(bundle);

    return {
      success: true,
      bundle: resolvedBundle,
      validation_errors: []
    };
  }

  getBundleAttachablePackages(event_type) {
    const type = event_type || 'wedding';
    const packages = this._getFromStorage('service_packages');
    return packages.filter(p => p.event_type === type && p.is_active);
  }

  attachAddOnBundleToPackage(add_on_bundle_id, package_id) {
    const bundles = this._getFromStorage('add_on_bundles');
    const packages = this._getFromStorage('service_packages');

    const bundle = bundles.find(b => b.id === add_on_bundle_id);
    const pkg = packages.find(p => p.id === package_id);

    if (!bundle || !pkg) {
      return {
        success: false,
        bundle: null,
        message: 'Bundle or package not found.'
      };
    }

    bundle.base_package_id = pkg.id;
    const updatedBundles = bundles.map(b => (b.id === bundle.id ? bundle : b));
    this._saveToStorage('add_on_bundles', updatedBundles);

    const resolvedBundle = this._resolveAddOnBundle(bundle);

    return {
      success: true,
      bundle: resolvedBundle,
      message: 'Bundle attached to package.'
    };
  }

  // -------- Consultation scheduler (task 5) --------

  getConsultationOptions() {
    const consultation_types = [
      { value: 'wedding_consultation', label: 'Wedding Consultation' },
      { value: 'event_consultation', label: 'Event Consultation' },
      { value: 'general_consultation', label: 'General Consultation' }
    ];

    const meeting_formats = [
      { value: 'video_call', label: 'Video Call' },
      { value: 'phone_call', label: 'Phone Call' },
      { value: 'in_person', label: 'In Person' }
    ];

    const default_duration_minutes = 30;

    return {
      consultation_types,
      meeting_formats,
      default_duration_minutes
    };
  }

  getConsultationTimeSlots(consultation_type, meeting_format, date) {
    const appointments = this._getFromStorage('consultation_appointments');

    // Generate default 30-minute slots from 09:00 to 17:00
    const time_slots = [];
    const startHour = 9;
    const endHour = 17;
    for (let h = startHour; h <= endHour; h++) {
      const hourStr = h.toString().padStart(2, '0');
      ['00', '30'].forEach(min => {
        time_slots.push({ start_time: hourStr + ':' + min, duration_minutes: 30 });
      });
    }

    // Remove already booked slots for this type/format/date
    const targetDate = date;
    const booked = appointments.filter(a => {
      if (a.consultation_type !== consultation_type) return false;
      if (a.meeting_format !== meeting_format) return false;
      const adate = this._getDatePart(a.start_datetime);
      if (adate !== targetDate) return false;
      return a.status === 'scheduled';
    });

    const bookedTimes = new Set(
      booked.map(a => a.start_datetime.slice(11, 16)) // HH:MM
    );

    const availableSlots = time_slots.filter(
      s => !bookedTimes.has(s.start_time)
    );

    return {
      date,
      time_slots: availableSlots
    };
  }

  scheduleConsultation(
    consultation_type,
    meeting_format,
    start_datetime,
    duration_minutes,
    contact_full_name,
    contact_email,
    contact_phone,
    message
  ) {
    const appointments = this._getFromStorage('consultation_appointments');

    const conflict = appointments.find(a => {
      return (
        a.consultation_type === consultation_type &&
        a.meeting_format === meeting_format &&
        a.start_datetime === start_datetime &&
        a.status === 'scheduled'
      );
    });

    if (conflict) {
      return {
        success: false,
        appointment: null,
        message: 'Selected time slot is no longer available.'
      };
    }

    const appointment = {
      id: this._generateId('consultation'),
      consultation_type,
      meeting_format,
      start_datetime,
      duration_minutes,
      contact_full_name,
      contact_email,
      contact_phone: contact_phone || null,
      message: message || '',
      status: 'scheduled',
      created_at: this._nowIso()
    };

    appointments.push(appointment);
    this._saveToStorage('consultation_appointments', appointments);

    return {
      success: true,
      appointment,
      message: 'Consultation scheduled.'
    };
  }

  // -------- Blog & reading list (task 6) --------

  getBlogFilterOptions() {
    const articles = this._getFromStorage('blog_articles');
    const tagSet = new Set();
    articles.forEach(a => {
      if (Array.isArray(a.tags)) {
        a.tags.forEach(t => tagSet.add(t));
      }
    });
    const tag_options = Array.from(tagSet).map(t => ({
      value: t,
      label: this._humanizeTag(t)
    }));
    return { tag_options };
  }

  searchBlogArticles(query, tags, page, page_size) {
    const q = (query || '').trim().toLowerCase();
    const tagArr = Array.isArray(tags) ? tags : [];
    const pageNum = page || 1;
    const size = page_size || 10;

    let articles = this._getFromStorage('blog_articles').filter(
      a => a.is_published
    );

    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      articles = articles.filter(a => {
        const text = (
          (a.title || '') +
          ' ' +
          (a.excerpt || '') +
          ' ' +
          (a.content || '')
        ).toLowerCase();
        if (!words.length) return true;
        return words.every(w => text.indexOf(w) !== -1);
      });
    }

    if (tagArr.length > 0) {
      const tagSet = new Set(tagArr);
      articles = articles.filter(a =>
        Array.isArray(a.tags)
          ? a.tags.some(t => tagSet.has(t))
          : false
      );
    }

    articles.sort((a, b) => (b.publish_date || '').localeCompare(a.publish_date || ''));

    const total_results = articles.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageArticles = articles.slice(start, end);

    return {
      total_results,
      page: pageNum,
      page_size: size,
      articles: pageArticles
    };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('blog_articles');
    return articles.find(a => a.id === articleId) || null;
  }

  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(a => a.id === articleId);
    if (!article) {
      return { success: false, reading_list: null };
    }

    const lists = this._getFromStorage('reading_lists');
    let list = this._getOrCreateReadingList();

    if (!Array.isArray(list.article_ids)) {
      list.article_ids = [];
    }

    if (!list.article_ids.includes(articleId)) {
      list.article_ids.push(articleId);
      list.updated_at = this._nowIso();
    }

    const updatedLists = lists.length
      ? lists.map(l => (l.id === list.id ? list : l))
      : [list];
    this._saveToStorage('reading_lists', updatedLists);

    return {
      success: true,
      reading_list: list
    };
  }

  getReadingList() {
    const list = this._getOrCreateReadingList();
    const articlesAll = this._getFromStorage('blog_articles');

    const articles = Array.isArray(list.article_ids)
      ? list.article_ids
          .map(id => articlesAll.find(a => a.id === id) || null)
          .filter(a => a)
      : [];

    return {
      reading_list: list,
      articles
    };
  }

  // -------- Portfolio & shot list (task 7) --------

  getPortfolioCategories() {
    const images = this._getFromStorage('portfolio_images');
    const catSet = new Set();
    images.forEach(img => {
      if (img.category) catSet.add(img.category);
    });

    const categories = Array.from(catSet).map(c => ({
      value: c,
      label: this._humanizeTag(c)
    }));

    return categories;
  }

  searchPortfolioImages(category, page, page_size) {
    const cat = category || null;
    const pageNum = page || 1;
    const size = page_size || 20;

    let images = this._getFromStorage('portfolio_images');

    if (cat) {
      images = images.filter(img => img.category === cat);
    }

    images.sort((a, b) => (b.shot_date || '').localeCompare(a.shot_date || ''));

    const total_results = images.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const pageImages = images.slice(start, end);

    return {
      total_results,
      page: pageNum,
      page_size: size,
      images: pageImages
    };
  }

  getPortfolioImageDetail(imageId) {
    const images = this._getFromStorage('portfolio_images');
    return images.find(img => img.id === imageId) || null;
  }

  addImageToShotList(imageId) {
    const images = this._getFromStorage('portfolio_images');
    const img = images.find(i => i.id === imageId);
    if (!img) {
      return { success: false, shot_list: null };
    }

    const lists = this._getFromStorage('shot_lists');
    let list = this._getOrCreateShotList();

    if (!Array.isArray(list.image_ids)) {
      list.image_ids = [];
    }

    if (!list.image_ids.includes(imageId)) {
      list.image_ids.push(imageId);
      list.updated_at = this._nowIso();
    }

    const updatedLists = lists.length
      ? lists.map(l => (l.id === list.id ? list : l))
      : [list];
    this._saveToStorage('shot_lists', updatedLists);

    return {
      success: true,
      shot_list: list
    };
  }

  getShotList() {
    const list = this._getOrCreateShotList();
    const imagesAll = this._getFromStorage('portfolio_images');

    const images = Array.isArray(list.image_ids)
      ? list.image_ids
          .map(id => imagesAll.find(i => i.id === id) || null)
          .filter(i => i)
      : [];

    return {
      shot_list: list,
      images
    };
  }

  removeImageFromShotList(imageId) {
    const lists = this._getFromStorage('shot_lists');
    let list = this._getOrCreateShotList();

    if (!Array.isArray(list.image_ids)) {
      list.image_ids = [];
    }

    const beforeLen = list.image_ids.length;
    list.image_ids = list.image_ids.filter(id => id !== imageId);
    if (list.image_ids.length !== beforeLen) {
      list.updated_at = this._nowIso();
    }

    const updatedLists = lists.length
      ? lists.map(l => (l.id === list.id ? list : l))
      : [list];
    this._saveToStorage('shot_lists', updatedLists);

    return list;
  }

  // -------- Availability & booking summary (task 8) --------

  getAvailabilitySearchOptions() {
    const event_type_options = [
      { value: 'wedding', label: 'Wedding' },
      { value: 'event_corporate', label: 'Corporate / Event' },
      { value: 'portrait', label: 'Portrait' },
      { value: 'other', label: 'Other' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' },
      { value: 'full_day', label: 'Full Day' }
    ];

    return {
      event_type_options,
      time_of_day_options
    };
  }

  checkAvailability(event_type, date, city, state, time_of_day) {
    const availOptions = this._getFromStorage('availability_options');
    const packages = this._getFromStorage('service_packages');

    const results = availOptions.filter(opt => {
      if (opt.event_type !== event_type) return false;
      if (!opt.is_available) return false;
      const optDate = this._getDatePart(opt.date);
      if (optDate !== date) return false;
      if (!this._caseInsensitiveEquals(opt.city, city)) return false;
      if (time_of_day && opt.time_of_day !== time_of_day) return false;
      if (state) {
        if (!this._caseInsensitiveEquals(opt.state || '', state)) return false;
      }
      return true;
    });

    const options = results.map(opt => {
      const pkg = opt.package_id
        ? packages.find(p => p.id === opt.package_id) || null
        : null;
      return {
        availability_option: opt,
        package: pkg
      };
    });

    return {
      search_parameters: {
        event_type,
        date,
        city,
        state: state || null,
        time_of_day
      },
      options
    };
  }

  selectAvailabilityOption(availability_option_id) {
    const availOptions = this._getFromStorage('availability_options');
    const packages = this._getFromStorage('service_packages');
    const summaries = this._getFromStorage('booking_summaries');

    const opt = availOptions.find(o => o.id === availability_option_id);
    if (!opt) {
      return {
        success: false,
        booking_summary: null
      };
    }

    let summary = summaries.length > 0 ? summaries[0] : null;
    const pkg = opt.package_id
      ? packages.find(p => p.id === opt.package_id) || null
      : null;

    if (!summary) {
      summary = {
        id: this._generateId('booking_summary'),
        event_type: opt.event_type,
        date: opt.date,
        city: opt.city,
        state: opt.state || null,
        time_of_day: opt.time_of_day,
        start_time: opt.start_time || null,
        end_time: opt.end_time || null,
        availability_option_id: opt.id,
        package_id: pkg ? pkg.id : null,
        add_on_bundle_id: null,
        preferred_photographer_id: null,
        total_price: pkg ? pkg.base_price || 0 : 0,
        created_at: this._nowIso(),
        status: 'in_progress'
      };
      summaries.push(summary);
    } else {
      summary.event_type = opt.event_type;
      summary.date = opt.date;
      summary.city = opt.city;
      summary.state = opt.state || null;
      summary.time_of_day = opt.time_of_day;
      summary.start_time = opt.start_time || null;
      summary.end_time = opt.end_time || null;
      summary.availability_option_id = opt.id;
      summary.package_id = pkg ? pkg.id : null;
      this._recalculateBookingSummaryTotal(summary);
    }

    const updatedSummaries = summaries.length
      ? summaries.map(s => (s.id === summary.id ? summary : s))
      : [summary];
    this._saveToStorage('booking_summaries', updatedSummaries);

    return {
      success: true,
      booking_summary: summary
    };
  }

  getBookingSummaryView() {
    const summaries = this._getFromStorage('booking_summaries');
    const summary = summaries.length > 0 ? summaries[0] : null;
    if (!summary) {
      return {
        summary: null,
        package: null,
        add_on_bundle: null,
        preferred_photographer: null
      };
    }

    const packages = this._getFromStorage('service_packages');
    const bundles = this._getFromStorage('add_on_bundles');
    const photographers = this._getFromStorage('photographers');

    const pkg = summary.package_id
      ? packages.find(p => p.id === summary.package_id) || null
      : null;
    const bundle = summary.add_on_bundle_id
      ? bundles.find(b => b.id === summary.add_on_bundle_id) || null
      : null;
    const photographer = summary.preferred_photographer_id
      ? photographers.find(p => p.id === summary.preferred_photographer_id) || null
      : null;

    const resolvedBundle = this._resolveAddOnBundle(bundle);

    return {
      summary,
      package: pkg,
      add_on_bundle: resolvedBundle,
      preferred_photographer: photographer
    };
  }

  updateBookingSummarySelections(updates) {
    const summaries = this._getFromStorage('booking_summaries');
    let summary = summaries.length > 0 ? summaries[0] : null;

    if (!summary) {
      return null;
    }

    const packages = this._getFromStorage('service_packages');
    const bundles = this._getFromStorage('add_on_bundles');
    const photographers = this._getFromStorage('photographers');

    if (updates.package_id) {
      const pkg = packages.find(p => p.id === updates.package_id);
      if (pkg) {
        summary.package_id = pkg.id;
      }
    }

    if (updates.add_on_bundle_id) {
      const bundle = bundles.find(b => b.id === updates.add_on_bundle_id);
      if (bundle) {
        summary.add_on_bundle_id = bundle.id;
      }
    }

    if (updates.preferred_photographer_id) {
      const photog = photographers.find(p => p.id === updates.preferred_photographer_id);
      if (photog) {
        summary.preferred_photographer_id = photog.id;
      }
    }

    this._recalculateBookingSummaryTotal(summary);

    const updatedSummaries = summaries.map(s => (s.id === summary.id ? summary : s));
    this._saveToStorage('booking_summaries', updatedSummaries);

    return summary;
  }

  // -------- Gift cards & checkout (task 9) --------

  getGiftCardProducts() {
    const products = this._getFromStorage('gift_card_products');
    return products.filter(p => p.is_active);
  }

  addGiftCardToCart(
    gift_card_product_id,
    recipient_name,
    recipient_email,
    message,
    quantity
  ) {
    const qty = quantity == null ? 1 : quantity;
    const products = this._getFromStorage('gift_card_products');
    const product = products.find(p => p.id === gift_card_product_id && p.is_active);
    if (!product) {
      return {
        success: false,
        cart: null,
        items: []
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const unitPrice = product.value || 0;
    const item = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'gift_card',
      item_ref_id: product.id,
      quantity: qty,
      unit_price: unitPrice,
      subtotal: unitPrice * qty,
      giftcard_recipient_name: recipient_name,
      giftcard_recipient_email: recipient_email,
      giftcard_message: message
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    // Update cart.item_ids and totals
    const carts = this._getFromStorage('carts');
    if (!Array.isArray(cart.item_ids)) {
      cart.item_ids = [];
    }
    cart.item_ids.push(item.id);
    this._recalculateCartTotals(cart);
    const updatedCarts = carts.map(c => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', updatedCarts);

    const itemsForView = this._resolveCartItemsForView(cart.id);

    return {
      success: true,
      cart,
      items: itemsForView
    };
  }

  getCart() {
    const cart = this._getCurrentCart();
    if (!cart) {
      return {
        cart: null,
        items: []
      };
    }

    const itemsForView = this._resolveCartItemsForView(cart.id);

    return {
      cart,
      items: itemsForView
    };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    const qty = quantity == null || quantity <= 0 ? 1 : quantity;
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cart_item_id);

    if (!item) {
      return this.getCart();
    }

    item.quantity = qty;
    item.subtotal = (item.unit_price || 0) * qty;

    const updatedCartItems = cartItems.map(ci => (ci.id === item.id ? item : ci));
    this._saveToStorage('cart_items', updatedCartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cart_id) || null;
    if (cart) {
      this._recalculateCartTotals(cart);
      const updatedCarts = carts.map(c => (c.id === cart.id ? cart : c));
      this._saveToStorage('carts', updatedCarts);
    }

    return this.getCart();
  }

  removeCartItem(cart_item_id) {
    const cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cart_item_id);

    if (!item) {
      return this.getCart();
    }

    const remainingItems = cartItems.filter(ci => ci.id !== cart_item_id);
    this._saveToStorage('cart_items', remainingItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cart_id) || null;

    if (cart) {
      if (Array.isArray(cart.item_ids)) {
        cart.item_ids = cart.item_ids.filter(id => id !== cart_item_id);
      }
      this._recalculateCartTotals(cart);
      const updatedCarts = carts.map(c => (c.id === cart.id ? cart : c));
      this._saveToStorage('carts', updatedCarts);
    }

    return this.getCart();
  }

  proceedToCheckoutReview() {
    const cart = this._getCurrentCart();
    if (!cart) {
      return {
        success: false,
        checkout_review: null,
        cart: null,
        items: []
      };
    }

    const itemsForView = this._resolveCartItemsForView(cart.id);
    if (itemsForView.length === 0) {
      return {
        success: false,
        checkout_review: null,
        cart,
        items: itemsForView
      };
    }

    const reviews = this._getFromStorage('checkout_reviews');
    let review = reviews.find(
      r => r.cart_id === cart.id && r.status !== 'cancelled'
    );

    if (!review) {
      review = {
        id: this._generateId('checkout_review'),
        cart_id: cart.id,
        purchaser_full_name: '',
        purchaser_email: '',
        created_at: this._nowIso(),
        status: 'in_progress'
      };
      reviews.push(review);
    }

    this._saveToStorage('checkout_reviews', reviews);

    return {
      success: true,
      checkout_review: review,
      cart,
      items: itemsForView
    };
  }

  saveCheckoutReviewDetails(purchaser_full_name, purchaser_email) {
    const cart = this._getCurrentCart();
    if (!cart) return null;

    const reviews = this._getFromStorage('checkout_reviews');
    let review = reviews.find(
      r => r.cart_id === cart.id && r.status !== 'cancelled'
    );

    if (!review) {
      review = {
        id: this._generateId('checkout_review'),
        cart_id: cart.id,
        purchaser_full_name: purchaser_full_name,
        purchaser_email: purchaser_email,
        created_at: this._nowIso(),
        status: 'in_progress'
      };
      reviews.push(review);
    } else {
      review.purchaser_full_name = purchaser_full_name;
      review.purchaser_email = purchaser_email;
    }

    const updatedReviews = reviews.map(r => (r.id === review.id ? review : r));
    this._saveToStorage('checkout_reviews', updatedReviews);

    return review;
  }

  getCheckoutReview() {
    const cart = this._getCurrentCart();
    const review = this._getCurrentCheckoutReview();

    if (!cart || !review) {
      return {
        checkout_review: null,
        cart: cart || null,
        items: []
      };
    }

    const itemsForView = this._resolveCartItemsForView(cart.id);

    return {
      checkout_review: review,
      cart,
      items: itemsForView
    };
  }

  // -------- About page content --------

  getAboutPageContent() {
    const photographers = this._getFromStorage('photographers').filter(
      p => p.is_active
    );

    const featured_team_members = [];
    if (photographers[0]) {
      featured_team_members.push({
        role: 'lead_photographer',
        photographer: photographers[0]
      });
    }
    if (photographers[1]) {
      featured_team_members.push({
        role: 'associate_photographer',
        photographer: photographers[1]
      });
    }
    if (photographers[2]) {
      featured_team_members.push({
        role: 'studio_manager',
        photographer: photographers[2]
      });
    }

    const content = {
      studio_name: 'Everlight Weddings & Events',
      tagline: 'Artful wedding & event photography with a timeless touch.',
      description:
        'Everlight Weddings & Events is a boutique photography studio specializing in heartfelt wedding stories and polished corporate coverage. We believe in creating images that feel honest, elegant, and full of life.',
      service_areas: ['Austin, TX', 'Chicago, IL', 'Destination Weddings'],
      featured_team_members,
      primary_cta: 'check_availability'
    };

    return content;
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
