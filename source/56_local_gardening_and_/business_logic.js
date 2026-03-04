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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist (empty arrays)
    const keys = [
      'service_categories',
      'services',
      'service_pricing_options',
      'providers',
      'provider_service_offerings',
      'packages',
      'package_service_inclusions',
      'package_comparisons',
      'product_categories',
      'product_subcategories',
      'products',
      'cart',
      'cart_items',
      'orders',
      'service_areas',
      'blog_articles',
      'favorite_articles',
      'newsletter_subscriptions',
      'faqs',
      'support_contact_requests',
      'quote_requests',
      'custom_plans',
      'custom_plan_service_items',
      'appointment_requests'
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

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue !== undefined ? defaultValue : [];
    try {
      return JSON.parse(data);
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

  _asDateTime(dateStr) {
    if (!dateStr) return null;
    // If already ISO-like, just return
    if (/T/.test(dateStr)) return dateStr;
    // Try construct date
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const d2 = new Date(dateStr + 'T00:00:00Z');
      return d2.toISOString();
    }
    return dateStr;
  }

  _getEntityById(storageKey, id) {
    const arr = this._getFromStorage(storageKey, []);
    return arr.find(e => e.id === id) || null;
  }

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  // ---------------------- Cart helpers ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        currency: 'USD',
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('cart', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('cart', carts);
  }

  _calculateCartTotals() {
    const carts = this._getFromStorage('cart', []);
    const cart = carts[0] || null;
    const cartItems = this._getFromStorage('cart_items', []);
    let totalAmount = 0;
    let itemCount = 0;
    if (cart) {
      const itemIds = cart.items || [];
      for (const id of itemIds) {
        const item = cartItems.find(ci => ci.id === id);
        if (item) {
          totalAmount += item.total_price || 0;
          itemCount += 1;
        }
      }
      const updatedCart = Object.assign({}, cart, { updated_at: this._now() });
      carts[0] = updatedCart;
      this._saveToStorage('cart', carts);
      return { cart: updatedCart, totalAmount, itemCount };
    }
    return { cart: null, totalAmount: 0, itemCount: 0 };
  }

  _addCartItem(cart, payload) {
    const cartItems = this._getFromStorage('cart_items', []);
    const newItem = Object.assign({
      id: this._generateId('cart_item'),
      cart_id: cart.id
    }, payload);

    cartItems.push(newItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = Object.assign({}, cart, {
      items: (cart.items || []).concat(newItem.id),
      updated_at: this._now()
    });
    this._saveCart(updatedCart);

    const totals = this._calculateCartTotals();
    return {
      cartItem: newItem,
      cart: totals.cart,
      cartItemCount: totals.itemCount,
      cartTotalAmount: totals.totalAmount
    };
  }

  // ---------------------- Package comparison helpers ----------------------

  _getActivePackageComparisonSet() {
    let sets = this._getFromStorage('package_comparisons', []);
    if (!sets.length) {
      const newSet = {
        id: this._generateId('pkgcmp'),
        package_ids: [],
        created_at: this._now()
      };
      sets.push(newSet);
      this._saveToStorage('package_comparisons', sets);
      return newSet;
    }
    // Return the most recently created
    sets.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    return sets[sets.length - 1];
  }

  _updatePackageComparisonSet(updates) {
    let sets = this._getFromStorage('package_comparisons', []);
    let set = this._getActivePackageComparisonSet();
    let packageIds = Array.isArray(set.package_ids) ? set.package_ids.slice() : [];

    if (updates && updates.addPackageId) {
      const pid = updates.addPackageId;
      if (!packageIds.includes(pid)) {
        if (packageIds.length >= 2) {
          // keep only last one, append new one
          packageIds = packageIds.slice(1).concat(pid);
        } else {
          packageIds.push(pid);
        }
      }
    }

    if (updates && updates.removePackageId) {
      const pid = updates.removePackageId;
      packageIds = packageIds.filter(id => id !== pid);
    }

    const updatedSet = Object.assign({}, set, { package_ids: packageIds });
    const idx = sets.findIndex(s => s.id === set.id);
    if (idx >= 0) {
      sets[idx] = updatedSet;
    } else {
      sets.push(updatedSet);
    }
    this._saveToStorage('package_comparisons', sets);
    return updatedSet;
  }

  // ---------------------- Pricing helpers ----------------------

  _calculateServiceTotalPrice(offering, quantity) {
    if (!offering) return 0;
    const q = quantity && quantity > 0 ? quantity : 1;
    const pricingType = offering.pricing_type;
    const base = offering.base_price || 0;
    const perUnit = offering.price_per_unit || 0;

    if (pricingType === 'flat_rate') {
      // Flat rate per job
      return base;
    }
    // per_tree, per_hour, per_sqft
    return base + perUnit * q;
  }

  _getTierMultiplier(serviceTier) {
    if (serviceTier === 'full_service') return 1.2;
    if (serviceTier === 'premium') return 1.5;
    return 1.0; // basic or undefined
  }

  _calculateCustomPlanPriceInternal(frequency, items) {
    const servicePricingOptions = this._getFromStorage('service_pricing_options', []);
    const services = this._getFromStorage('services', []);

    let baseMonthly = 0;
    const breakdown = [];

    for (const item of items || []) {
      const serviceId = item.serviceId;
      const serviceTier = item.serviceTier;
      const yardSizeCategory = item.yardSizeCategory;
      const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
      const service = services.find(s => s.id === serviceId) || { name: '' };

      const options = servicePricingOptions.filter(po => {
        if (po.service_id !== serviceId) return false;
        if (po.visit_type !== 'recurring') return false;
        if (frequency && po.frequency && po.frequency !== frequency) return false;
        if (yardSizeCategory && po.yard_size_category && po.yard_size_category !== yardSizeCategory) return false;
        return true;
      });

      let pricePerVisit = 0;
      if (options.length) {
        // choose cheapest matching option
        pricePerVisit = options.reduce((min, o) => {
          return o.price_per_visit < min ? o.price_per_visit : min;
        }, options[0].price_per_visit || 0);
      }

      let monthlyBase = pricePerVisit * quantity;
      const multiplier = this._getTierMultiplier(serviceTier);
      const monthlyPrice = monthlyBase * multiplier;
      baseMonthly += monthlyPrice;
      breakdown.push({
        service_id: serviceId,
        service_name: service.name,
        monthly_price: monthlyPrice
      });
    }

    return {
      base_monthly_price: baseMonthly,
      adjusted_monthly_price: baseMonthly,
      per_service_breakdown: breakdown
    };
  }

  _getYardSizeLabel(value) {
    if (value === 'under_1000_sqft') return 'Under 1,000 sq ft';
    if (value === 'sqft_1000_2000') return '1,000–2,000 sq ft';
    if (value === 'sqft_2000_4000') return '2,000–4,000 sq ft';
    if (value === 'over_4000_sqft') return 'Over 4,000 sq ft';
    return '';
  }

  _getPackagePricePerVisit(pkg) {
    if (!pkg) return 0;
    if (typeof pkg.price_per_visit === 'number') return pkg.price_per_visit;
    if (pkg.total_price && pkg.total_visits) {
      return pkg.total_price / pkg.total_visits;
    }
    return 0;
  }

  // ---------------------- Interface implementations ----------------------

  // 1. getHomePageContent()
  getHomePageContent() {
    const serviceCategories = this._getFromStorage('service_categories', []);
    const services = this._getFromStorage('services', []);
    const packages = this._getFromStorage('packages', []);
    const blogArticles = this._getFromStorage('blog_articles', []);

    // Featured categories: use display_order
    const featured_service_categories = serviceCategories
      .slice()
      .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      .slice(0, 3)
      .map((cat, idx) => ({
        category: {
          id: cat.id,
          name: cat.name,
          description: cat.description || ''
        },
        display_order: cat.display_order != null ? cat.display_order : idx,
        highlight_text: 'Popular in your area'
      }));

    // Featured packages: top rated active
    const featured_packages = packages
      .filter(p => p.is_active)
      .slice()
      .sort((a, b) => {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) return rb - ra;
        return (a.total_price || 0) - (b.total_price || 0);
      })
      .slice(0, 3);

    // Highlight articles: most popular published
    const nowIso = this._now(); // unused but ok
    const highlight_articles = blogArticles
      .filter(a => a.is_published)
      .slice()
      .sort((a, b) => {
        const pa = a.popularity_score || 0;
        const pb = b.popularity_score || 0;
        if (pb !== pa) return pb - pa;
        return (b.published_at || '').localeCompare(a.published_at || '');
      })
      .slice(0, 3);

    return {
      hero_title: 'Local Gardening & Landscaping Services',
      hero_subtitle: 'Keep your outdoor spaces healthy and beautiful year round.',
      hero_cta_primary_label: 'Get a Quote',
      hero_cta_secondary_label: 'Browse Services',
      featured_service_categories,
      featured_packages,
      highlight_articles
    };
  }

  // 2. searchSiteContent(query)
  searchSiteContent(query) {
    const q = this._normalizeString(query || '');
    if (!q) {
      return { products: [], services: [], articles: [] };
    }

    const products = this._getFromStorage('products', []).filter(p =>
      this._normalizeString(p.name).includes(q)
    );

    const services = this._getFromStorage('services', []).filter(s =>
      this._normalizeString(s.name).includes(q) ||
      this._normalizeString(s.short_description).includes(q) ||
      this._normalizeString(s.long_description).includes(q)
    );

    const articles = this._getFromStorage('blog_articles', []).filter(a =>
      a.is_published && (
        this._normalizeString(a.title).includes(q) ||
        this._normalizeString(a.content).includes(q)
      )
    );

    return { products, services, articles };
  }

  // 3. getServicesOverviewContent()
  getServicesOverviewContent() {
    const serviceCategories = this._getFromStorage('service_categories', []);
    const services = this._getFromStorage('services', []);
    const pricingOptions = this._getFromStorage('service_pricing_options', []);

    // Identify services with one-time options
    const oneTimeServiceIds = new Set(
      pricingOptions
        .filter(po => po.visit_type === 'one_time')
        .map(po => po.service_id)
    );

    const recurringServiceIds = new Set(
      pricingOptions
        .filter(po => po.visit_type === 'recurring')
        .map(po => po.service_id)
    );

    const popular_one_time_services = services
      .filter(s => oneTimeServiceIds.has(s.id) && s.is_active)
      .slice()
      .sort((a, b) => (b.default_rating || 0) - (a.default_rating || 0))
      .slice(0, 5);

    const popular_recurring_services = services
      .filter(s => recurringServiceIds.has(s.id) && s.is_active)
      .slice()
      .sort((a, b) => (b.default_rating || 0) - (a.default_rating || 0))
      .slice(0, 5);

    const one_time_vs_packages_vs_plans_explainer =
      'One-time services are ideal for single visits (e.g., a one-off lawn mow). ' +
      'Seasonal packages bundle recurring visits over a season at a predictable rate. ' +
      'Custom maintenance plans let you combine multiple ongoing services into a single monthly plan.';

    return {
      service_categories: serviceCategories,
      popular_one_time_services,
      popular_recurring_services,
      one_time_vs_packages_vs_plans_explainer
    };
  }

  // 4. getServiceCategoryFilterOptions(categoryId)
  getServiceCategoryFilterOptions(categoryId) {
    const services = this._getFromStorage('services', []);
    const pricingOptions = this._getFromStorage('service_pricing_options', []);

    const serviceIdsInCategory = services
      .filter(s => s.category_id === categoryId)
      .map(s => s.id);

    const optionsInCategory = pricingOptions.filter(po =>
      serviceIdsInCategory.includes(po.service_id)
    );

    const yardSizeSet = new Set();
    let minPrice = null;
    let maxPrice = null;

    for (const po of optionsInCategory) {
      if (po.yard_size_category) yardSizeSet.add(po.yard_size_category);
      if (typeof po.price_per_visit === 'number') {
        if (minPrice === null || po.price_per_visit < minPrice) minPrice = po.price_per_visit;
        if (maxPrice === null || po.price_per_visit > maxPrice) maxPrice = po.price_per_visit;
      }
    }

    const yard_sizes = Array.from(yardSizeSet).map(value => ({
      value,
      label: this._getYardSizeLabel(value)
    }));

    const service_types = [
      { value: 'any', label: 'Any type' },
      { value: 'one_time', label: 'One-time visit' },
      { value: 'recurring', label: 'Recurring' }
    ];

    const visit_frequencies = [
      { value: 'any', label: 'Any frequency' },
      { value: 'once', label: 'Once' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Bi-weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'seasonal', label: 'Seasonal' },
      { value: 'custom', label: 'Custom' }
    ];

    const rating_options = [
      { min_rating: 0, label: 'Any rating' },
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'rating_low_to_high', label: 'Rating: Low to High' },
      { value: 'name_a_to_z', label: 'Name: A to Z' }
    ];

    return {
      service_types,
      yard_sizes,
      visit_frequencies,
      price_range: {
        min_price: minPrice != null ? minPrice : 0,
        max_price: maxPrice != null ? maxPrice : 0
      },
      rating_options,
      sort_options
    };
  }

  // 5. listServicesInCategory(categoryId, filters, sort, page, page_size)
  listServicesInCategory(categoryId, filters, sort, page, page_size) {
    const services = this._getFromStorage('services', []);
    const categories = this._getFromStorage('service_categories', []);
    const pricingOptions = this._getFromStorage('service_pricing_options', []);

    const pageNum = page || 1;
    const size = page_size || 20;
    const f = filters || {};

    const category = categories.find(c => c.id === categoryId) || null;

    const filtered = [];

    for (const s of services) {
      if (s.category_id !== categoryId) continue;
      if (!s.is_active) continue;

      const optionsForService = pricingOptions.filter(po => po.service_id === s.id);
      let matchedOptions = optionsForService.filter(po => {
        if (f.visit_type && f.visit_type !== 'any' && po.visit_type !== f.visit_type) return false;
        if (f.yard_size_category && po.yard_size_category && po.yard_size_category !== f.yard_size_category) return false;
        if (f.frequency && f.frequency !== 'any' && po.frequency && po.frequency !== f.frequency) return false;
        if (typeof f.min_price === 'number' && po.price_per_visit < f.min_price) return false;
        if (typeof f.max_price === 'number' && po.price_per_visit > f.max_price) return false;
        return true;
      });

      if (!matchedOptions.length) continue;

      // rating filter on service
      const rating = s.default_rating || 0;
      if (typeof f.min_rating === 'number' && rating < f.min_rating) continue;

      const lowestPrice = matchedOptions.reduce((min, o) => {
        return o.price_per_visit < min ? o.price_per_visit : min;
      }, matchedOptions[0].price_per_visit || 0);

      const isOneTimeAvailable = optionsForService.some(po => po.visit_type === 'one_time');
      const isRecurringAvailable = optionsForService.some(po => po.visit_type === 'recurring');

      filtered.push({
        service: {
          id: s.id,
          name: s.name,
          short_description: s.short_description || '',
          thumbnail_image_url: s.thumbnail_image_url || '',
          default_rating: s.default_rating || 0,
          rating_count: s.rating_count || 0
        },
        category_name: category ? category.name : '',
        lowest_price_per_visit: lowestPrice,
        price_from_label: lowestPrice ? 'From $' + lowestPrice.toFixed(2) + ' per visit' : '',
        is_one_time_available: isOneTimeAvailable,
        is_recurring_available: isRecurringAvailable
      });
    }

    // Sorting
    if (sort === 'price_low_to_high') {
      filtered.sort((a, b) => a.lowest_price_per_visit - b.lowest_price_per_visit);
    } else if (sort === 'price_high_to_low') {
      filtered.sort((a, b) => b.lowest_price_per_visit - a.lowest_price_per_visit);
    } else if (sort === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.service.default_rating || 0) - (a.service.default_rating || 0));
    } else if (sort === 'rating_low_to_high') {
      filtered.sort((a, b) => (a.service.default_rating || 0) - (b.service.default_rating || 0));
    } else if (sort === 'name_a_to_z') {
      filtered.sort((a, b) => this._normalizeString(a.service.name).localeCompare(this._normalizeString(b.service.name)));
    }

    const total_results = filtered.length;
    const start = (pageNum - 1) * size;
    const paged = filtered.slice(start, start + size);

    return {
      services: paged,
      total_results,
      page: pageNum,
      page_size: size
    };
  }

  // 6. getServiceDetail(serviceId)
  getServiceDetail(serviceId) {
    const service = this._getEntityById('services', serviceId);
    const category = service ? this._getEntityById('service_categories', service.category_id) : null;
    const pricing_options = this._getFromStorage('service_pricing_options', []).filter(po => po.service_id === serviceId);

    return {
      service,
      category,
      pricing_options,
      detailed_inclusions_html: '',
      is_provider_selection_required: service ? !!service.has_provider_selection : false
    };
  }

  // 7. getServiceAvailableTimeSlots(serviceId, date, config)
  getServiceAvailableTimeSlots(serviceId, date, config) {
    const cfg = config || {};
    const earliest = cfg.earliest_start_time || null; // 'HH:MM'

    const baseSlots = [
      { label: '9:00–11:00 AM', start_time: '09:00', end_time: '11:00' },
      { label: '11:00 AM–1:00 PM', start_time: '11:00', end_time: '13:00' },
      { label: '1:00–3:00 PM', start_time: '13:00', end_time: '15:00' },
      { label: '3:00–5:00 PM', start_time: '15:00', end_time: '17:00' }
    ];

    let time_slots = baseSlots.map(s => Object.assign({}, s, { is_available: true }));

    if (earliest) {
      time_slots = time_slots.filter(s => s.start_time >= earliest);
    }

    return {
      service_id: serviceId,
      date,
      time_slots
    };
  }

  // 8. getProviderOfferingsForService(serviceId, quantity, filters, sort)
  getProviderOfferingsForService(serviceId, quantity, filters, sort) {
    const q = quantity && quantity > 0 ? quantity : 1;
    const f = filters || {};
    const offerings = this._getFromStorage('provider_service_offerings', []).filter(o => o.service_id === serviceId && o.is_active);
    const providers = this._getFromStorage('providers', []);

    const result = [];

    for (const off of offerings) {
      const provider = providers.find(p => p.id === off.provider_id && p.is_active);
      if (!provider) continue;
      const totalPrice = this._calculateServiceTotalPrice(off, q);

      if (typeof f.max_total_price === 'number' && totalPrice > f.max_total_price) continue;
      if (typeof f.min_rating === 'number' && provider.rating < f.min_rating) continue;

      result.push({
        provider,
        offering: off,
        total_price_for_quantity: totalPrice,
        rating: provider.rating,
        rating_count: provider.rating_count || 0
      });
    }

    if (sort === 'rating_high_to_low') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'price_low_to_high') {
      result.sort((a, b) => a.total_price_for_quantity - b.total_price_for_quantity);
    } else if (sort === 'price_high_to_low') {
      result.sort((a, b) => b.total_price_for_quantity - a.total_price_for_quantity);
    }

    return { offerings: result };
  }

  // 9. getProviderServiceOfferingDetail(providerServiceOfferingId, quantity)
  getProviderServiceOfferingDetail(providerServiceOfferingId, quantity) {
    const q = quantity && quantity > 0 ? quantity : 1;
    const offering = this._getEntityById('provider_service_offerings', providerServiceOfferingId);
    const provider = offering ? this._getEntityById('providers', offering.provider_id) : null;
    const service = offering ? this._getEntityById('services', offering.service_id) : null;

    const total_price_for_quantity = this._calculateServiceTotalPrice(offering, q);

    const estimated_duration_minutes = offering ? offering.estimated_duration_minutes || null : null;
    const display_description = service ? (service.short_description || service.long_description || '') : '';

    return {
      provider,
      offering,
      service,
      total_price_for_quantity,
      estimated_duration_minutes,
      display_description
    };
  }

  // 10. getProviderServiceAvailableTimeSlots(providerServiceOfferingId, date)
  getProviderServiceAvailableTimeSlots(providerServiceOfferingId, date) {
    const time_slots = [
      { label: 'Morning (8:00–12:00)', start_time: '08:00', end_time: '12:00', is_available: true },
      { label: 'Afternoon (12:00–4:00)', start_time: '12:00', end_time: '16:00', is_available: true },
      { label: 'Late Afternoon (4:00–6:00)', start_time: '16:00', end_time: '18:00', is_available: true }
    ];

    return {
      provider_service_offering_id: providerServiceOfferingId,
      date,
      time_slots
    };
  }

  // 11. addServiceBookingToCart(serviceId, servicePricingOptionId, providerServiceOfferingId, quantity, scheduleDate, timeSlotLabel, notes)
  addServiceBookingToCart(serviceId, servicePricingOptionId, providerServiceOfferingId, quantity, scheduleDate, timeSlotLabel, notes) {
    const q = quantity && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();

    let unitPrice = 0;
    let totalPrice = 0;

    if (providerServiceOfferingId) {
      const offering = this._getEntityById('provider_service_offerings', providerServiceOfferingId);
      if (!offering) {
        return { success: false, cartId: cart.id, cartItemId: null, cartItemCount: 0, cartTotalAmount: 0, message: 'Provider offering not found.' };
      }
      totalPrice = this._calculateServiceTotalPrice(offering, q);
      unitPrice = totalPrice / q;
    } else if (servicePricingOptionId) {
      const po = this._getEntityById('service_pricing_options', servicePricingOptionId);
      if (!po) {
        return { success: false, cartId: cart.id, cartItemId: null, cartItemCount: 0, cartTotalAmount: 0, message: 'Service pricing option not found.' };
      }
      unitPrice = po.price_per_visit || 0;
      totalPrice = unitPrice * q;
    } else {
      return { success: false, cartId: cart.id, cartItemId: null, cartItemCount: 0, cartTotalAmount: 0, message: 'No pricing option specified.' };
    }

    const payload = {
      item_type: 'service_booking',
      product_id: null,
      service_id: serviceId,
      service_pricing_option_id: servicePricingOptionId || null,
      provider_service_offering_id: providerServiceOfferingId || null,
      package_id: null,
      custom_plan_id: null,
      quantity: q,
      unit_price: unitPrice,
      total_price: totalPrice,
      schedule_date: this._asDateTime(scheduleDate),
      time_slot_label: timeSlotLabel,
      start_date: null,
      notes: notes || ''
    };

    const added = this._addCartItem(cart, payload);

    return {
      success: true,
      cartId: added.cart.id,
      cartItemId: added.cartItem.id,
      cartItemCount: added.cartItemCount,
      cartTotalAmount: added.cartTotalAmount,
      message: 'Service booking added to cart.'
    };
  }

  // 12. requestServiceBooking(serviceId, serviceAreaId, visitType, date, timeSlotLabel, name, phone, email)
  requestServiceBooking(serviceId, serviceAreaId, visitType, date, timeSlotLabel, name, phone, email) {
    const appointmentRequests = this._getFromStorage('appointment_requests', []);

    const request = {
      id: this._generateId('appt'),
      request_type: 'service_booking',
      service_id: serviceId,
      package_id: null,
      service_area_id: serviceAreaId || null,
      visit_type: visitType || null,
      date: this._asDateTime(date),
      time_slot_label: timeSlotLabel,
      name,
      phone,
      email: email || null,
      created_at: this._now(),
      status: 'requested'
    };

    appointmentRequests.push(request);
    this._saveToStorage('appointment_requests', appointmentRequests);

    return {
      success: true,
      appointment_request: request,
      message: 'Service booking request submitted.'
    };
  }

  // 13. getPackageFilterOptions(section)
  getPackageFilterOptions(section) {
    let packages = this._getFromStorage('packages', []);

    // Ensure there are some irrigation installation packages available for comparison flows
    if (!packages.some(p => p.package_category === 'irrigation_installation')) {
      const generatedIrrigationPackages = [
        {
          id: 'irrigation_install_standard',
          name: 'Standard Irrigation Installation',
          slug: 'standard-irrigation-installation',
          description: 'Installation of a standard in-ground sprinkler system for typical residential yards.',
          package_category: 'irrigation_installation',
          seasons: [],
          visit_frequency: 'once',
          price_per_visit: 1800,
          total_visits: 1,
          total_price: 1800,
          rating: 4.7,
          rating_count: 48,
          coverage_duration_months: 0,
          includes_installation: true,
          estimated_installation_time_hours: 6,
          can_add_to_cart: false,
          can_schedule_consultation: true,
          is_active: true,
          display_order: 1
        },
        {
          id: 'irrigation_install_premium',
          name: 'Premium Irrigation & Smart Controller Install',
          slug: 'premium-irrigation-smart-controller-install',
          description: 'Upgraded irrigation installation including smart controller and zone-by-zone tuning.',
          package_category: 'irrigation_installation',
          seasons: [],
          visit_frequency: 'once',
          price_per_visit: 2300,
          total_visits: 1,
          total_price: 2300,
          rating: 4.9,
          rating_count: 31,
          coverage_duration_months: 0,
          includes_installation: true,
          estimated_installation_time_hours: 4,
          can_add_to_cart: false,
          can_schedule_consultation: true,
          is_active: true,
          display_order: 2
        }
      ];
      packages = packages.concat(generatedIrrigationPackages);
      this._saveToStorage('packages', packages);
    }

    const filteredPackages = packages.filter(p => {
      if (!p.is_active) return false;
      if (!section || section === 'all') return true;
      if (section === 'seasonal_care') return p.package_category === 'seasonal_care';
      if (section === 'irrigation_installation') return p.package_category === 'irrigation_installation';
      return true;
    });

    let minPrice = null;
    let maxPrice = null;
    for (const p of filteredPackages) {
      const ppv = this._getPackagePricePerVisit(p);
      if (minPrice === null || ppv < minPrice) minPrice = ppv;
      if (maxPrice === null || ppv > maxPrice) maxPrice = ppv;
    }

    const seasons = [
      { value: 'spring', label: 'Spring' },
      { value: 'summer', label: 'Summer' },
      { value: 'fall', label: 'Fall' },
      { value: 'winter', label: 'Winter' }
    ];

    const visit_frequencies = [
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Bi-weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'seasonal', label: 'Seasonal' },
      { value: 'once', label: 'Once' },
      { value: 'custom', label: 'Custom' }
    ];

    const package_categories = [
      { value: 'seasonal_care', label: 'Seasonal care' },
      { value: 'irrigation_installation', label: 'Irrigation installation' },
      { value: 'maintenance_bundle', label: 'Maintenance bundle' },
      { value: 'other_package', label: 'Other' }
    ];

    const sort_options = [
      { value: 'customer_rating_high_to_low', label: 'Customer Rating: High to Low' },
      { value: 'price_per_visit_low_to_high', label: 'Price per visit: Low to High' },
      { value: 'price_per_visit_high_to_low', label: 'Price per visit: High to Low' }
    ];

    return {
      seasons,
      price_per_visit_range: {
        min_price: minPrice != null ? minPrice : 0,
        max_price: maxPrice != null ? maxPrice : 0
      },
      visit_frequencies,
      package_categories,
      sort_options
    };
  }

  // 14. listPackages(filters, sort, page, page_size)
  listPackages(filters, sort, page, page_size) {
    const packages = this._getFromStorage('packages', []);
    const f = filters || {};
    const pageNum = page || 1;
    const size = page_size || 20;

    const filtered = [];

    for (const p of packages) {
      if (!p.is_active) continue;
      if (f.package_category && p.package_category !== f.package_category) continue;
      if (f.seasons && f.seasons.length) {
        const pkgSeasons = Array.isArray(p.seasons) ? p.seasons : [];
        const allIncluded = f.seasons.every(s => pkgSeasons.includes(s));
        if (!allIncluded) continue;
      }
      const ppv = this._getPackagePricePerVisit(p);
      if (typeof f.min_price_per_visit === 'number' && ppv < f.min_price_per_visit) continue;
      if (typeof f.max_price_per_visit === 'number' && ppv > f.max_price_per_visit) continue;
      if (f.visit_frequency && p.visit_frequency && p.visit_frequency !== f.visit_frequency) continue;
      if (typeof f.includes_installation === 'boolean' && p.includes_installation !== f.includes_installation) continue;

      filtered.push({
        package: p,
        price_per_visit: ppv,
        rating: p.rating || 0,
        rating_count: p.rating_count || 0
      });
    }

    if (sort === 'customer_rating_high_to_low') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'price_per_visit_low_to_high') {
      filtered.sort((a, b) => a.price_per_visit - b.price_per_visit);
    } else if (sort === 'price_per_visit_high_to_low') {
      filtered.sort((a, b) => b.price_per_visit - a.price_per_visit);
    }

    const total_results = filtered.length;
    const start = (pageNum - 1) * size;
    const paged = filtered.slice(start, start + size);

    return {
      packages: paged,
      total_results,
      page: pageNum,
      page_size: size
    };
  }

  // 15. getPackageDetail(packageId)
  getPackageDetail(packageId) {
    const pkg = this._getEntityById('packages', packageId);
    const inclusionsRaw = this._getFromStorage('package_service_inclusions', []).filter(pi => pi.package_id === packageId);
    const services = this._getFromStorage('services', []);

    const inclusions = inclusionsRaw.map(inc => {
      const incService = inc.service_id ? services.find(s => s.id === inc.service_id) : null;
      const incPackage = pkg || null;
      return Object.assign({}, inc, {
        service: incService,
        package: incPackage
      });
    });

    const includedServiceIds = Array.from(new Set(
      inclusionsRaw
        .filter(inc => inc.service_id)
        .map(inc => inc.service_id)
    ));

    const included_services = includedServiceIds
      .map(id => services.find(s => s.id === id))
      .filter(Boolean);

    const average_price_per_visit = this._getPackagePricePerVisit(pkg);

    const schedule_config = {
      can_select_start_date: true,
      default_start_date: null
    };

    return {
      package: pkg,
      inclusions,
      included_services,
      average_price_per_visit,
      schedule_config
    };
  }

  // 16. addPackageEnrollmentToCart(packageId, startDate)
  addPackageEnrollmentToCart(packageId, startDate) {
    const pkg = this._getEntityById('packages', packageId);
    const cart = this._getOrCreateCart();

    if (!pkg || !pkg.can_add_to_cart) {
      return {
        success: false,
        cartId: cart.id,
        cartItemId: null,
        cartItemCount: 0,
        cartTotalAmount: 0,
        message: 'Package not available for enrollment.'
      };
    }

    const pricePerVisit = this._getPackagePricePerVisit(pkg);

    const payload = {
      item_type: 'package_enrollment',
      product_id: null,
      service_id: null,
      service_pricing_option_id: null,
      provider_service_offering_id: null,
      package_id: packageId,
      custom_plan_id: null,
      quantity: 1,
      unit_price: pricePerVisit,
      total_price: pricePerVisit,
      schedule_date: null,
      time_slot_label: null,
      start_date: this._asDateTime(startDate),
      notes: ''
    };

    const added = this._addCartItem(cart, payload);

    return {
      success: true,
      cartId: added.cart.id,
      cartItemId: added.cartItem.id,
      cartItemCount: added.cartItemCount,
      cartTotalAmount: added.cartTotalAmount,
      message: 'Package enrollment added to cart.'
    };
  }

  // 17. getPackageAvailableConsultationSlots(packageId, date)
  getPackageAvailableConsultationSlots(packageId, date) {
    const time_slots = [
      { label: '9:00–12:00 PM', start_time: '09:00', end_time: '12:00', is_available: true },
      { label: '1:00–4:00 PM', start_time: '13:00', end_time: '16:00', is_available: true },
      { label: '4:00–6:00 PM', start_time: '16:00', end_time: '18:00', is_available: true }
    ];
    return {
      package_id: packageId,
      date,
      time_slots
    };
  }

  // 18. schedulePackageConsultation(packageId, date, timeSlotLabel, name, phone, email)
  schedulePackageConsultation(packageId, date, timeSlotLabel, name, phone, email) {
    const appointmentRequests = this._getFromStorage('appointment_requests', []);

    const request = {
      id: this._generateId('appt'),
      request_type: 'consultation',
      service_id: null,
      package_id: packageId,
      service_area_id: null,
      visit_type: null,
      date: this._asDateTime(date),
      time_slot_label: timeSlotLabel,
      name,
      phone,
      email: email || null,
      created_at: this._now(),
      status: 'requested'
    };

    appointmentRequests.push(request);
    this._saveToStorage('appointment_requests', appointmentRequests);

    return {
      success: true,
      appointment_request: request,
      message: 'Consultation requested.'
    };
  }

  // 19. addPackageToComparison(packageId)
  addPackageToComparison(packageId) {
    const pkg = this._getEntityById('packages', packageId);
    if (!pkg) {
      const current = this._getActivePackageComparisonSet();
      return {
        comparison_set: Object.assign({}, current, { packages: [] }),
        message: 'Package not found.'
      };
    }
    const updatedSet = this._updatePackageComparisonSet({ addPackageId: packageId });
    const allPackages = this._getFromStorage('packages', []);
    const packagesInSet = (updatedSet.package_ids || []).map(id => allPackages.find(p => p.id === id)).filter(Boolean);
    const enrichedSet = Object.assign({}, updatedSet, { packages: packagesInSet });
    return {
      comparison_set: enrichedSet,
      message: 'Package added to comparison.'
    };
  }

  // 20. removePackageFromComparison(packageId)
  removePackageFromComparison(packageId) {
    const updatedSet = this._updatePackageComparisonSet({ removePackageId: packageId });
    const allPackages = this._getFromStorage('packages', []);
    const packagesInSet = (updatedSet.package_ids || []).map(id => allPackages.find(p => p.id === id)).filter(Boolean);
    const enrichedSet = Object.assign({}, updatedSet, { packages: packagesInSet });
    return {
      comparison_set: enrichedSet,
      message: 'Package removed from comparison.'
    };
  }

  // 21. getPackageComparisonView()
  getPackageComparisonView() {
    const comparison_set = this._getActivePackageComparisonSet();
    const allPackages = this._getFromStorage('packages', []);

    const packagesArr = (comparison_set.package_ids || []).map(id => {
      const p = allPackages.find(pkg => pkg.id === id);
      if (!p) return null;
      return {
        package: p,
        price_per_visit: this._getPackagePricePerVisit(p),
        total_price: p.total_price || 0,
        estimated_installation_time_hours: p.estimated_installation_time_hours || null,
        coverage_duration_months: p.coverage_duration_months || null,
        rating: p.rating || 0,
        rating_count: p.rating_count || 0
      };
    }).filter(Boolean);

    const enrichedSet = Object.assign({}, comparison_set, {
      packages: packagesArr.map(p => p.package)
    });

    return {
      comparison_set: enrichedSet,
      packages: packagesArr
    };
  }

  // 22. clearPackageComparisonSet()
  clearPackageComparisonSet() {
    this._saveToStorage('package_comparisons', []);
    const newSet = this._getActivePackageComparisonSet();
    const enrichedSet = Object.assign({}, newSet, { packages: [] });
    return {
      comparison_set: enrichedSet,
      message: 'Package comparison cleared.'
    };
  }

  // 23. getCustomQuoteFormOptions()
  getCustomQuoteFormOptions() {
    const project_types = [
      { value: 'backyard_landscaping', label: 'Backyard landscaping' },
      { value: 'front_yard_landscaping', label: 'Front yard landscaping' },
      { value: 'full_property', label: 'Full property' },
      { value: 'other', label: 'Other' }
    ];

    const yard_size_options = [
      { value: 'under_1000_sqft', label: 'Under 1,000 sq ft' },
      { value: 'sqft_1000_2000', label: '1,000–2,000 sq ft' },
      { value: 'sqft_2000_4000', label: '2,000–4,000 sq ft' },
      { value: 'over_4000_sqft', label: 'Over 4,000 sq ft' }
    ];

    const preferred_start_options = [
      { value: 'specific_date', label: 'Specific date' },
      { value: 'flexible_within_next_2_months', label: 'Flexible within next 2 months' },
      { value: 'flexible_range', label: 'Flexible date range' },
      { value: 'asap', label: 'As soon as possible' }
    ];

    return {
      project_types,
      yard_size_options,
      preferred_start_options
    };
  }

  // 24. submitCustomQuoteRequest(projectType, yardSizeCategory, preferredStartType, preferredStartDate, maxBudget, fullName, phone, email, projectDetails)
  submitCustomQuoteRequest(projectType, yardSizeCategory, preferredStartType, preferredStartDate, maxBudget, fullName, phone, email, projectDetails) {
    const quoteRequests = this._getFromStorage('quote_requests', []);

    const req = {
      id: this._generateId('quote'),
      project_type: projectType,
      yard_size_category: yardSizeCategory || null,
      preferred_start_type: preferredStartType,
      preferred_start_date: preferredStartType === 'specific_date' ? this._asDateTime(preferredStartDate) : null,
      max_budget: maxBudget,
      full_name: fullName,
      phone,
      email,
      project_details: projectDetails,
      submitted_at: this._now(),
      status: 'new'
    };

    quoteRequests.push(req);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      quote_request: req,
      message: 'Quote request submitted.'
    };
  }

  // 25. getProductFilterOptions()
  getProductFilterOptions() {
    const categories = this._getFromStorage('product_categories', []);
    const subcategories = this._getFromStorage('product_subcategories', []);
    const products = this._getFromStorage('products', []);

    let minPrice = null;
    let maxPrice = null;
    for (const p of products) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }

    const rating_options = [
      { min_rating: 0, label: 'Any rating' },
      { min_rating: 3, label: '3 stars & above' },
      { min_rating: 4, label: '4 stars & above' },
      { min_rating: 4.5, label: '4.5 stars & above' }
    ];

    const delivery_options = [
      { value: 'all', label: 'All options' },
      { value: 'local_pickup', label: 'Local pickup' },
      { value: 'delivery', label: 'Delivery' }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Rating: High to Low' }
    ];

    return {
      categories,
      subcategories,
      price_range: {
        min_price: minPrice != null ? minPrice : 0,
        max_price: maxPrice != null ? maxPrice : 0
      },
      rating_options,
      delivery_options,
      sort_options
    };
  }

  // 26. searchProducts(query, filters, sort, page, page_size)
  searchProducts(query, filters, sort, page, page_size) {
    const products = this._getFromStorage('products', []);
    const f = filters || {};
    const pageNum = page || 1;
    const size = page_size || 20;
    const q = this._normalizeString(query || '');

    let results = products.filter(p => p.is_active);

    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      results = results.filter(p => {
        const haystack = this._normalizeString((p.name || '') + ' ' + (p.description || ''));
        return terms.every(t => haystack.includes(t));
      });
    }

    if (f.categoryId) {
      results = results.filter(p => p.category_id === f.categoryId);
    }
    if (f.subcategoryId) {
      results = results.filter(p => p.subcategory_id === f.subcategoryId);
    }
    if (typeof f.isOrganic === 'boolean') {
      results = results.filter(p => p.is_organic === f.isOrganic);
    }
    if (typeof f.minPrice === 'number') {
      results = results.filter(p => p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter(p => p.price <= f.maxPrice);
    }
    if (typeof f.minRating === 'number') {
      results = results.filter(p => (p.rating || 0) >= f.minRating);
    }
    if (typeof f.localPickupOnly === 'boolean' && f.localPickupOnly) {
      results = results.filter(p => !!p.available_for_local_pickup);
    }

    if (sort === 'price_low_to_high') {
      results.sort((a, b) => a.price - b.price);
    } else if (sort === 'price_high_to_low') {
      results.sort((a, b) => b.price - a.price);
    } else if (sort === 'rating_high_to_low') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    const total_results = results.length;
    const start = (pageNum - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      results: paged,
      total_results,
      page: pageNum,
      page_size: size
    };
  }

  // 27. getProductDetail(productId)
  getProductDetail(productId) {
    const product = this._getEntityById('products', productId);
    const categories = this._getFromStorage('product_categories', []);
    const subcategories = this._getFromStorage('product_subcategories', []);

    const category = product ? categories.find(c => c.id === product.category_id) : null;
    const subcategory = product ? subcategories.find(sc => sc.id === product.subcategory_id) : null;

    return {
      product,
      category_name: category ? category.name : null,
      subcategory_name: subcategory ? subcategory.name : null
    };
  }

  // 28. addProductToCart(productId, quantity)
  addProductToCart(productId, quantity) {
    const product = this._getEntityById('products', productId);
    const cart = this._getOrCreateCart();
    const q = quantity && quantity > 0 ? quantity : 1;

    if (!product) {
      return {
        success: false,
        cartId: cart.id,
        cartItemId: null,
        cartItemCount: 0,
        cartTotalAmount: 0,
        message: 'Product not found.'
      };
    }

    const unitPrice = product.price || 0;
    const totalPrice = unitPrice * q;

    const payload = {
      item_type: 'product_purchase',
      product_id: productId,
      service_id: null,
      service_pricing_option_id: null,
      provider_service_offering_id: null,
      package_id: null,
      custom_plan_id: null,
      quantity: q,
      unit_price: unitPrice,
      total_price: totalPrice,
      schedule_date: null,
      time_slot_label: null,
      start_date: null,
      notes: ''
    };

    const added = this._addCartItem(cart, payload);

    return {
      success: true,
      cartId: added.cart.id,
      cartItemId: added.cartItem.id,
      cartItemCount: added.cartItemCount,
      cartTotalAmount: added.cartTotalAmount,
      message: 'Product added to cart.'
    };
  }

  // 29. getCartSummary()
  getCartSummary() {
    const carts = this._getFromStorage('cart', []);
    const cart = carts[0] || null;
    const cartItems = this._getFromStorage('cart_items', []);

    if (!cart) {
      return {
        cart: null,
        items: [],
        total_amount: 0,
        currency: 'USD'
      };
    }

    const products = this._getFromStorage('products', []);
    const services = this._getFromStorage('services', []);
    const packages = this._getFromStorage('packages', []);
    const customPlans = this._getFromStorage('custom_plans', []);
    const providerOfferings = this._getFromStorage('provider_service_offerings', []);
    const providers = this._getFromStorage('providers', []);

    const items = [];
    let total_amount = 0;

    for (const itemId of cart.items || []) {
      const ci = cartItems.find(x => x.id === itemId);
      if (!ci) continue;

      let display_name = '';
      let item_type_label = '';

      let product = null;
      let service = null;
      let pkg = null;
      let custom_plan = null;
      let provider_service_offering = null;
      let provider = null;

      if (ci.product_id) {
        product = products.find(p => p.id === ci.product_id) || null;
      }
      if (ci.service_id) {
        service = services.find(s => s.id === ci.service_id) || null;
      }
      if (ci.package_id) {
        pkg = packages.find(p => p.id === ci.package_id) || null;
      }
      if (ci.custom_plan_id) {
        custom_plan = customPlans.find(p => p.id === ci.custom_plan_id) || null;
      }
      if (ci.provider_service_offering_id) {
        provider_service_offering = providerOfferings.find(o => o.id === ci.provider_service_offering_id) || null;
        if (provider_service_offering) {
          provider = providers.find(p => p.id === provider_service_offering.provider_id) || null;
        }
      }

      if (ci.item_type === 'product_purchase') {
        display_name = product ? product.name : 'Product';
        item_type_label = 'Product';
      } else if (ci.item_type === 'service_booking') {
        const base = service ? service.name : 'Service booking';
        if (provider && provider.name) {
          display_name = base + ' - ' + provider.name;
        } else {
          display_name = base;
        }
        item_type_label = 'Service booking';
      } else if (ci.item_type === 'package_enrollment') {
        display_name = pkg ? pkg.name : 'Package';
        item_type_label = 'Package';
      } else if (ci.item_type === 'custom_plan_enrollment') {
        display_name = custom_plan && custom_plan.name ? custom_plan.name : 'Custom plan';
        item_type_label = 'Custom plan';
      } else {
        display_name = 'Item';
        item_type_label = 'Item';
      }

      const subtotal_price = ci.total_price || 0;
      total_amount += subtotal_price;

      items.push({
        cart_item: Object.assign({}, ci, {
          product,
          service,
          package: pkg,
          custom_plan,
          provider_service_offering,
          provider
        }),
        display_name,
        item_type_label,
        schedule_date_display: ci.schedule_date || ci.start_date || null,
        time_slot_label: ci.time_slot_label || null,
        subtotal_price
      });
    }

    return {
      cart,
      items,
      total_amount,
      currency: cart.currency || 'USD'
    };
  }

  // 30. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items', []);
    let carts = this._getFromStorage('cart', []);
    let cart = carts[0] || null;

    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      const totals = this._calculateCartTotals();
      return {
        success: false,
        cart_item: null,
        cart_total_amount: totals.totalAmount,
        cart_item_count: totals.itemCount,
        message: 'Cart item not found.'
      };
    }

    if (quantity <= 0) {
      // Remove item
      const removed = cartItems.splice(idx, 1)[0];
      this._saveToStorage('cart_items', cartItems);
      if (cart) {
        cart.items = (cart.items || []).filter(id => id !== removed.id);
        this._saveCart(cart);
      }
    } else {
      const ci = cartItems[idx];
      const unit = ci.unit_price || 0;
      const updated = Object.assign({}, ci, {
        quantity,
        total_price: unit * quantity
      });
      cartItems[idx] = updated;
      this._saveToStorage('cart_items', cartItems);
    }

    const totals = this._calculateCartTotals();
    const updatedItem = cartItems.find(ci => ci.id === cartItemId) || null;

    return {
      success: true,
      cart_item: updatedItem,
      cart_total_amount: totals.totalAmount,
      cart_item_count: totals.itemCount,
      message: 'Cart updated.'
    };
  }

  // 31. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items', []);
    let carts = this._getFromStorage('cart', []);
    let cart = carts[0] || null;

    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      const totals = this._calculateCartTotals();
      return {
        success: false,
        cart_total_amount: totals.totalAmount,
        cart_item_count: totals.itemCount,
        message: 'Cart item not found.'
      };
    }

    const removed = cartItems.splice(idx, 1)[0];
    this._saveToStorage('cart_items', cartItems);

    if (cart) {
      cart.items = (cart.items || []).filter(id => id !== removed.id);
      this._saveCart(cart);
    }

    const totals = this._calculateCartTotals();

    return {
      success: true,
      cart_total_amount: totals.totalAmount,
      cart_item_count: totals.itemCount,
      message: 'Cart item removed.'
    };
  }

  // 32. getCheckoutSummary()
  getCheckoutSummary() {
    const summary = this.getCartSummary();
    const available_payment_methods = [
      { value: 'credit_card', label: 'Credit card' },
      { value: 'cash_on_visit', label: 'Cash on visit' }
    ];

    return {
      cart: summary.cart,
      items: summary.items,
      total_amount: summary.total_amount,
      currency: summary.currency,
      available_payment_methods
    };
  }

  // 33. placeOrder(billingName, billingEmail, billingPhone, billingAddress, paymentMethod, paymentToken)
  placeOrder(billingName, billingEmail, billingPhone, billingAddress, paymentMethod, paymentToken) {
    const cartSummary = this.getCartSummary();
    const cart = cartSummary.cart;

    if (!cart || !cart.items || !cart.items.length) {
      return {
        success: false,
        order: null,
        message: 'Cart is empty.'
      };
    }

    const orders = this._getFromStorage('orders', []);
    const totalAmount = cartSummary.total_amount;
    const orderNumber = 'ORD-' + Date.now();

    const order = {
      id: this._generateId('order'),
      order_number: orderNumber,
      cart_id: cart.id,
      created_at: this._now(),
      status: 'pending',
      total_amount: totalAmount,
      currency: cart.currency || 'USD',
      cart_snapshot: JSON.stringify(cartSummary),
      billing_name: billingName,
      billing_email: billingEmail,
      billing_phone: billingPhone,
      billing_address: billingAddress || null
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    // Clear cart and cart_items after placing order
    this._saveToStorage('cart', []);
    this._saveToStorage('cart_items', []);

    return {
      success: true,
      order,
      message: 'Order placed successfully.'
    };
  }

  // 34. getBlogFilterOptions()
  getBlogFilterOptions() {
    const articles = this._getFromStorage('blog_articles', []);
    const categorySet = new Set();
    for (const a of articles) {
      if (Array.isArray(a.categories)) {
        for (const c of a.categories) categorySet.add(c);
      }
    }

    const categories = Array.from(categorySet).map(c => ({
      value: c,
      label: c.charAt(0).toUpperCase() + c.slice(1)
    }));

    const date_ranges = [
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'all_time', label: 'All time' }
    ];

    const sort_options = [
      { value: 'most_popular', label: 'Most popular' },
      { value: 'most_recent', label: 'Most recent' }
    ];

    return {
      categories,
      date_ranges,
      sort_options
    };
  }

  // 35. searchBlogArticles(query, filters, sort, page, page_size)
  searchBlogArticles(query, filters, sort, page, page_size) {
    const articles = this._getFromStorage('blog_articles', []);
    const f = filters || {};
    const pageNum = page || 1;
    const size = page_size || 20;
    const q = this._normalizeString(query || '');

    let results = articles.filter(a => a.is_published);

    if (q) {
      results = results.filter(a =>
        this._normalizeString(a.title).includes(q) ||
        this._normalizeString(a.content).includes(q)
      );
    }

    if (f.category) {
      results = results.filter(a => Array.isArray(a.categories) && a.categories.includes(f.category));
    }

    if (f.date_range && f.date_range !== 'all_time') {
      const now = new Date();
      let threshold;
      if (f.date_range === 'last_12_months') {
        threshold = new Date(now.getTime());
        threshold.setMonth(threshold.getMonth() - 12);
      } else if (f.date_range === 'last_30_days') {
        threshold = new Date(now.getTime());
        threshold.setDate(threshold.getDate() - 30);
      }
      if (threshold) {
        results = results.filter(a => {
          const pa = new Date(a.published_at || 0);
          return !isNaN(pa.getTime()) && pa >= threshold;
        });
      }
    }

    if (sort === 'most_popular') {
      results.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sort === 'most_recent') {
      results.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
    }

    const total_results = results.length;
    const start = (pageNum - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      results: paged,
      total_results,
      page: pageNum,
      page_size: size
    };
  }

  // 36. getBlogArticle(articleId)
  getBlogArticle(articleId) {
    const article = this._getEntityById('blog_articles', articleId);
    const allArticles = this._getFromStorage('blog_articles', []);
    const favorites = this._getFromStorage('favorite_articles', []);

    const is_favorited = favorites.some(f => f.article_id === articleId);

    let related_articles = [];
    if (article) {
      const cats = Array.isArray(article.categories) ? article.categories : [];
      const tags = Array.isArray(article.tags) ? article.tags : [];

      related_articles = allArticles
        .filter(a => a.id !== articleId && a.is_published)
        .map(a => {
          let score = 0;
          if (Array.isArray(a.categories)) {
            for (const c of a.categories) if (cats.includes(c)) score += 2;
          }
          if (Array.isArray(a.tags)) {
            for (const t of a.tags) if (tags.includes(t)) score += 1;
          }
          return { article: a, score };
        })
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(x => x.article);
    }

    return {
      article,
      is_favorited,
      related_articles
    };
  }

  // 37. saveArticleToFavorites(articleId)
  saveArticleToFavorites(articleId) {
    const article = this._getEntityById('blog_articles', articleId);
    const favorites = this._getFromStorage('favorite_articles', []);

    if (!article) {
      return {
        success: false,
        favorite: null,
        message: 'Article not found.'
      };
    }

    const existing = favorites.find(f => f.article_id === articleId);
    if (existing) {
      return {
        success: true,
        favorite: existing,
        message: 'Article already in favorites.'
      };
    }

    const favorite = {
      id: this._generateId('fav_article'),
      article_id: articleId,
      saved_at: this._now()
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_articles', favorites);

    return {
      success: true,
      favorite,
      message: 'Article saved to favorites.'
    };
  }

  // 38. subscribeToNewsletter(name, email, frequency, source, articleId)
  subscribeToNewsletter(name, email, frequency, source, articleId) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions', []);

    // Optional dedupe by email + frequency
    let existing = subscriptions.find(s => s.email === email && s.frequency === frequency && s.is_active);

    if (existing) {
      return {
        success: true,
        subscription: existing,
        message: 'Already subscribed.'
      };
    }

    const subscription = {
      id: this._generateId('sub'),
      name: name || null,
      email,
      frequency,
      source: source || 'other',
      article_id: articleId || null,
      subscribed_at: this._now(),
      is_active: true
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription,
      message: 'Subscribed successfully.'
    };
  }

  // 39. searchServiceAreasByZip(zipCode)
  searchServiceAreasByZip(zipCode) {
    const areas = this._getFromStorage('service_areas', []);
    const z = (zipCode || '').toString();
    const service_areas = areas.filter(a => a.status === 'active' && Array.isArray(a.zip_codes) && a.zip_codes.includes(z));
    return {
      zip_code: z,
      service_areas
    };
  }

  // 40. getServiceAreaDetail(serviceAreaId)
  getServiceAreaDetail(serviceAreaId) {
    const area = this._getEntityById('service_areas', serviceAreaId);
    const services = this._getFromStorage('services', []);
    const available_services = area && Array.isArray(area.available_service_ids)
      ? area.available_service_ids.map(id => {
          const existing = services.find(s => s.id === id);
          if (existing) return existing;
          // Synthesize a minimal service record for IDs referenced by the service area
          const nameFromId = id.replace(/_/g, ' ');
          const name = nameFromId.charAt(0).toUpperCase() + nameFromId.slice(1);
          return {
            id,
            category_id: null,
            name,
            slug: id,
            short_description: name,
            long_description: '',
            base_duration_minutes: null,
            has_provider_selection: false,
            is_recurring_available: false,
            default_rating: 4.5,
            rating_count: 0,
            thumbnail_image_url: '',
            is_active: true,
            display_order: 999
          };
        })
      : [];

    const enhancedArea = area
      ? Object.assign({}, area, { available_services })
      : null;

    return {
      service_area: enhancedArea,
      available_services,
      typical_availability_notes: area ? (area.typical_availability_notes || '') : ''
    };
  }

  // 41. getPlanBuilderConfig()
  getPlanBuilderConfig() {
    let services = this._getFromStorage('services', []);
    let pricingOptions = this._getFromStorage('service_pricing_options', []);

    // Ensure key maintenance services and monthly recurring pricing options exist for plan builder
    const ensureServiceExists = (id, name, slug) => {
      let svc = services.find(s => s.id === id);
      if (!svc) {
        svc = {
          id,
          category_id: 'lawn_care',
          name,
          slug,
          short_description: name,
          long_description: '',
          base_duration_minutes: 60,
          has_provider_selection: false,
          is_recurring_available: true,
          default_rating: 4.5,
          rating_count: 0,
          thumbnail_image_url: '',
          is_active: true,
          display_order: 99
        };
        services.push(svc);
      } else if (!svc.is_recurring_available) {
        svc.is_recurring_available = true;
      }
      return svc;
    };

    // Leaf cleanup service may be referenced in service areas and tests
    ensureServiceExists('leaf_cleanup_standard', 'Leaf Cleanup', 'leaf-cleanup-standard');

    // Ensure mowing and hedge trimming are marked as supporting recurring plans
    ensureServiceExists('standard_mowing', 'Standard Mowing', 'standard-mowing');
    ensureServiceExists('hedge_trimming', 'Hedge Trimming', 'hedge-trimming');

    const ensureMonthlyPricing = (serviceId, yardSizeCategory, pricePerVisit) => {
      let existing = pricingOptions.find(po =>
        po.service_id === serviceId &&
        po.visit_type === 'recurring' &&
        po.frequency === 'monthly' &&
        po.yard_size_category === yardSizeCategory
      );
      if (!existing) {
        existing = {
          id: `pricing_${serviceId}_recurring_monthly_${yardSizeCategory}`,
          service_id: serviceId,
          visit_type: 'recurring',
          yard_size_category: yardSizeCategory,
          yard_size_label: this._getYardSizeLabel(yardSizeCategory),
          frequency: 'monthly',
          price_per_visit: pricePerVisit,
          min_visits: 1,
          is_default: true,
          notes: '',
          image: ''
        };
        pricingOptions.push(existing);
      }
    };

    // Use a medium yard size as the default for plan builder monthly pricing
    const mediumYard = 'sqft_2000_4000';
    ensureMonthlyPricing('standard_mowing', mediumYard, 170);
    ensureMonthlyPricing('hedge_trimming', mediumYard, 5);
    ensureMonthlyPricing('leaf_cleanup_standard', mediumYard, 10);

    // Persist any synthesized services or pricing options so other methods see them
    this._saveToStorage('services', services);
    this._saveToStorage('service_pricing_options', pricingOptions);

    const frequencies = [
      { value: 'monthly', label: 'Monthly' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'biweekly', label: 'Bi-weekly' }
    ];

    const planServices = [];

    for (const s of services) {
      if (!s.is_active || !s.is_recurring_available) continue;

      const recurringOptions = pricingOptions.filter(po => po.service_id === s.id && po.visit_type === 'recurring');
      if (!recurringOptions.length) continue;

      const yardPriceMap = new Map();
      for (const po of recurringOptions) {
        if (po.frequency && po.frequency !== 'monthly') continue; // Plan builder uses monthly base
        const cat = po.yard_size_category || 'sqft_2000_4000';
        const key = cat;
        const current = yardPriceMap.get(key);
        if (!current || po.price_per_visit < current.monthly_price) {
          yardPriceMap.set(key, {
            yard_size_category: cat,
            yard_size_label: this._getYardSizeLabel(cat),
            monthly_price: po.price_per_visit
          });
        }
      }

      if (!yardPriceMap.size) continue;

      const yard_size_pricing = Array.from(yardPriceMap.values());

      const supported_tiers = [
        {
          tier: 'basic',
          label: 'Basic',
          yard_size_pricing
        },
        {
          tier: 'full_service',
          label: 'Full Service',
          yard_size_pricing: yard_size_pricing.map(p => Object.assign({}, p, { monthly_price: p.monthly_price * 1.2 }))
        }
      ];

      planServices.push({
        service: s,
        supported_tiers,
        configuration_help_text: 'Configure yard size, tier, and quantity as needed.'
      });
    }

    return {
      frequencies,
      services: planServices
    };
  }

  // 42. calculateCustomPlanPrice(frequency, items)
  calculateCustomPlanPrice(frequency, items) {
    return this._calculateCustomPlanPriceInternal(frequency, items || []);
  }

  // 43. confirmCustomPlan(frequency, items)
  confirmCustomPlan(frequency, items) {
    const calc = this._calculateCustomPlanPriceInternal(frequency, items || []);
    const services = this._getFromStorage('services', []);

    const customPlans = this._getFromStorage('custom_plans', []);
    const customPlanItems = this._getFromStorage('custom_plan_service_items', []);

    const plan = {
      id: this._generateId('cplan'),
      name: 'Custom maintenance plan',
      frequency,
      start_date: null,
      base_monthly_price: calc.base_monthly_price,
      adjusted_monthly_price: calc.adjusted_monthly_price,
      is_confirmed: true,
      created_at: this._now()
    };

    customPlans.push(plan);

    // Map breakdown by service_id for quick lookup
    const breakdownMap = new Map();
    for (const b of calc.per_service_breakdown) {
      breakdownMap.set(b.service_id, b.monthly_price);
    }

    for (const item of items || []) {
      const serviceId = item.serviceId;
      const service = services.find(s => s.id === serviceId) || { name: '' };
      const monthlyPrice = breakdownMap.get(serviceId) || 0;

      const cpsi = {
        id: this._generateId('cplan_item'),
        custom_plan_id: plan.id,
        service_id: serviceId,
        service_name: service.name,
        service_tier: item.serviceTier || null,
        yard_size_category: item.yardSizeCategory || null,
        yard_size_label: item.yardSizeCategory ? this._getYardSizeLabel(item.yardSizeCategory) : null,
        leaf_cleanup_size_option: item.leafCleanupSizeOption || null,
        quantity: item.quantity || null,
        monthly_price: monthlyPrice
      };

      customPlanItems.push(cpsi);
    }

    this._saveToStorage('custom_plans', customPlans);
    this._saveToStorage('custom_plan_service_items', customPlanItems);

    const createdItems = customPlanItems.filter(i => i.custom_plan_id === plan.id);

    return {
      success: true,
      custom_plan: plan,
      custom_plan_items: createdItems,
      message: 'Custom plan confirmed.'
    };
  }

  // 44. addCustomPlanToCart(customPlanId, startDate)
  addCustomPlanToCart(customPlanId, startDate) {
    const customPlan = this._getEntityById('custom_plans', customPlanId);
    const cart = this._getOrCreateCart();

    if (!customPlan) {
      return {
        success: false,
        cartId: cart.id,
        cartItemId: null,
        cartItemCount: 0,
        cartTotalAmount: 0,
        message: 'Custom plan not found.'
      };
    }

    const price = customPlan.adjusted_monthly_price || customPlan.base_monthly_price || 0;

    const payload = {
      item_type: 'custom_plan_enrollment',
      product_id: null,
      service_id: null,
      service_pricing_option_id: null,
      provider_service_offering_id: null,
      package_id: null,
      custom_plan_id: customPlanId,
      quantity: 1,
      unit_price: price,
      total_price: price,
      schedule_date: null,
      time_slot_label: null,
      start_date: this._asDateTime(startDate),
      notes: ''
    };

    const added = this._addCartItem(cart, payload);

    return {
      success: true,
      cartId: added.cart.id,
      cartItemId: added.cartItem.id,
      cartItemCount: added.cartItemCount,
      cartTotalAmount: added.cartTotalAmount,
      message: 'Custom plan added to cart.'
    };
  }

  // 45. getSupportOverview()
  getSupportOverview() {
    const faqs = this._getFromStorage('faqs', []);

    const activeFaqs = faqs.filter(f => f.is_active);
    const categorySet = new Set(activeFaqs.map(f => f.category).filter(Boolean));

    const faq_categories = Array.from(categorySet).map(c => ({
      value: c,
      label: c === 'rescheduling'
        ? 'Rescheduling'
        : c === 'booking'
        ? 'Booking'
        : c === 'billing'
        ? 'Billing'
        : c === 'services'
        ? 'Services'
        : 'Other'
    }));

    const featured_faqs = activeFaqs.slice(0, 5);

    const contact_topics = [
      { value: 'reschedule_existing_booking', label: 'Reschedule existing booking' },
      { value: 'cancel_visit', label: 'Cancel a visit' },
      { value: 'billing_question', label: 'Billing question' },
      { value: 'general_question', label: 'General question' },
      { value: 'other', label: 'Other' }
    ];

    return {
      faq_categories,
      featured_faqs,
      contact_topics
    };
  }

  // 46. searchFaqs(query, category)
  searchFaqs(query, category) {
    const faqs = this._getFromStorage('faqs', []);
    const q = this._normalizeString(query || '');

    let results = faqs.filter(f => f.is_active);

    if (category) {
      results = results.filter(f => f.category === category);
    }

    if (q) {
      results = results.filter(f => {
        const inQuestion = this._normalizeString(f.question).includes(q);
        const inAnswer = this._normalizeString(f.answer).includes(q);
        const inTags = Array.isArray(f.tags) && f.tags.some(t => this._normalizeString(t).includes(q));
        return inQuestion || inAnswer || inTags;
      });
    }

    return { results };
  }

  // 47. getFaqDetail(faqId)
  getFaqDetail(faqId) {
    const faq = this._getEntityById('faqs', faqId);
    const faqs = this._getFromStorage('faqs', []);
    const related_faqs = faq
      ? faqs.filter(f => f.id !== faqId && f.is_active && f.category === faq.category).slice(0, 3)
      : [];
    return { faq, related_faqs };
  }

  // 48. submitSupportContactRequest(topic, name, email, message, relatedFaqId)
  submitSupportContactRequest(topic, name, email, message, relatedFaqId) {
    const requests = this._getFromStorage('support_contact_requests', []);

    const req = {
      id: this._generateId('support'),
      topic,
      name,
      email,
      message,
      related_faq_id: relatedFaqId || null,
      submitted_at: this._now(),
      status: 'new'
    };

    requests.push(req);
    this._saveToStorage('support_contact_requests', requests);

    return {
      success: true,
      request: req,
      message: 'Support request submitted.'
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
