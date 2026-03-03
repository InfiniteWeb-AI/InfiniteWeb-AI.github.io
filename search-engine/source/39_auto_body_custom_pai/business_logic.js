// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // =========================
  // Storage helpers
  // =========================

  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    const ensureObjectKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    };

    // Core entity tables (arrays)
    ensureArrayKey('service_packages');
    ensureArrayKey('cart_items');
    // single cart is stored as object under key 'cart' (created lazily)
    ensureArrayKey('bookings');
    ensureArrayKey('special_offers');
    ensureArrayKey('paint_configurations');
    ensureArrayKey('saved_configurations');
    ensureArrayKey('locations');
    ensureArrayKey('appointment_slots');
    ensureArrayKey('gallery_items');
    ensureArrayKey('favorite_gallery_items');
    ensureArrayKey('comparison_lists');
    ensureArrayKey('contact_inquiries');
    ensureArrayKey('service_categories');
    ensureArrayKey('faq_entries');

    // CMS / config objects
    ensureObjectKey('homepage_content');
    ensureObjectKey('configurator_init_data');
    ensureObjectKey('gallery_filter_options');
    ensureObjectKey('contact_form_options');
    ensureObjectKey('about_page_content');
    ensureObjectKey('terms_of_service_content');
    ensureObjectKey('privacy_policy_content');

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultVal) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultVal !== undefined ? defaultVal : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultVal !== undefined ? defaultVal : [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // =========================
  // Common lookup helpers
  // =========================

  _getServiceCategoriesMap() {
    const cats = this._getFromStorage('service_categories', []);
    const map = {};
    cats.forEach((c) => {
      if (c && c.category) {
        map[c.category] = c;
      }
    });
    return map;
  }

  _getCategoryLabel(category, categoriesMap) {
    if (!categoriesMap) categoriesMap = this._getServiceCategoriesMap();
    return categoriesMap[category]?.name || category || '';
  }

  _formatClearCoatTypeLabel(value) {
    if (!value) return '';
    switch (value) {
      case 'standard_clear_coat':
        return 'Standard Clear Coat';
      case 'ceramic_clear_coat':
        return 'Ceramic Clear Coat';
      case 'no_clear_coat':
        return 'No Clear Coat';
      default:
        return value;
    }
  }

  _formatFinishTypeLabel(value) {
    if (!value) return '';
    switch (value) {
      case 'matte':
        return 'Matte';
      case 'gloss':
        return 'Gloss';
      case 'satin':
        return 'Satin';
      default:
        return value;
    }
  }

  _formatVehicleTypeLabel(value) {
    if (!value) return '';
    switch (value) {
      case 'suv':
        return 'SUV';
      case 'coupe':
        return 'Coupe';
      case '2_door_coupe':
        return '2-Door Coupe';
      case 'sedan':
        return 'Sedan';
      case 'truck':
        return 'Truck';
      case 'van':
        return 'Van';
      case 'hatchback':
        return 'Hatchback';
      case 'other_vehicle':
        return 'Other Vehicle';
      default:
        return value;
    }
  }

  // =========================
  // Cart & promo helpers
  // =========================

  _getRawCart() {
    const data = localStorage.getItem('cart');
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  _saveCart(cart) {
    cart.updated_at = this._nowIso();
    this._saveToStorage('cart', cart);
  }

  _getOrCreateCart() {
    let cart = this._getRawCart();
    if (!cart) {
      const now = this._nowIso();
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem ids
        subtotal: 0,
        promo_code: null,
        discount_amount: 0,
        total: 0,
        created_at: now,
        updated_at: now
      };
      this._saveCart(cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const relatedItems = cartItems.filter((ci) => ci.cart_id === cart.id);
    const subtotal = relatedItems.reduce((sum, ci) => sum + (ci.line_total || 0), 0);
    cart.subtotal = subtotal;
    if (!cart.discount_amount) {
      cart.discount_amount = 0;
    }
    cart.total = Math.max(subtotal - cart.discount_amount, 0);
    this._saveCart(cart);
    return cart;
  }

  _serializeCart(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const packages = this._getFromStorage('service_packages', []);
    const configurations = this._getFromStorage('paint_configurations', []);
    const categoriesMap = this._getServiceCategoriesMap();

    const items = (cart.items || []).map((cartItemId) => {
      const ci = cartItems.find((x) => x.id === cartItemId);
      if (!ci) return null;
      const pkg = packages.find((p) => p.id === ci.package_id) || null;
      const config = ci.configuration_id
        ? configurations.find((c) => c.id === ci.configuration_id) || null
        : null;
      return {
        cart_item_id: ci.id,
        package_id: ci.package_id,
        package_name: pkg ? pkg.name : '',
        category_label: pkg ? this._getCategoryLabel(pkg.category, categoriesMap) : '',
        vehicle_type: ci.vehicle_type,
        configuration_id: ci.configuration_id || null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        image_url: pkg && pkg.image_url ? pkg.image_url : '',
        // Foreign key resolution for frontend convenience
        package: pkg,
        configuration: config
      };
    }).filter(Boolean);

    return {
      id: cart.id,
      subtotal: cart.subtotal || 0,
      promo_code: cart.promo_code || null,
      discount_amount: cart.discount_amount || 0,
      total: cart.total || cart.subtotal || 0,
      items
    };
  }

  /**
   * Validate a promo code for either a full cart or a single package context.
   * context can be:
   *   { cart } OR { packageIds, subtotal }
   */
  _validateAndResolvePromoCode(promoCode, context) {
    const code = (promoCode || '').trim();
    if (!code) {
      return { valid: false, offer: null, discount_amount: 0, message: 'Promo code is empty.' };
    }

    const offers = this._getFromStorage('special_offers', []);
    const now = new Date();
    const matchedOffer = offers.find((o) => {
      if (!o || !o.promo_code) return false;
      if (String(o.promo_code).toLowerCase() !== code.toLowerCase()) return false;
      if (o.status && o.status !== 'active') return false;
      if (o.start_date) {
        const sd = new Date(o.start_date);
        if (now < sd) return false;
      }
      if (o.end_date) {
        const ed = new Date(o.end_date);
        if (now > ed) return false;
      }
      return true;
    });

    if (!matchedOffer) {
      return { valid: false, offer: null, discount_amount: 0, message: 'Promo code not found or not active.' };
    }

    // Determine applicable package ids in context
    let contextPackageIds = [];
    let subtotal = 0;

    if (context && context.cart) {
      const cart = context.cart;
      const cartItems = this._getFromStorage('cart_items', []);
      const packages = this._getFromStorage('service_packages', []);
      const relatedItems = cartItems.filter((ci) => ci.cart_id === cart.id);
      contextPackageIds = relatedItems.map((ci) => ci.package_id);
      subtotal = cart.subtotal || relatedItems.reduce((sum, ci) => sum + (ci.line_total || 0), 0);
    } else if (context && Array.isArray(context.packageIds)) {
      contextPackageIds = context.packageIds;
      subtotal = typeof context.subtotal === 'number' ? context.subtotal : 0;
    }

    if (!contextPackageIds.length) {
      return { valid: false, offer: matchedOffer, discount_amount: 0, message: 'No applicable items for promo.' };
    }

    const packages = this._getFromStorage('service_packages', []);

    // Check applicability by categories / package ids
    let applicable = false;

    const offerPackageIds = Array.isArray(matchedOffer.applicable_package_ids)
      ? matchedOffer.applicable_package_ids
      : null;
    const offerCategories = Array.isArray(matchedOffer.applicable_categories)
      ? matchedOffer.applicable_categories
      : null;

    if (offerPackageIds && offerPackageIds.length) {
      applicable = contextPackageIds.some((pid) => offerPackageIds.includes(pid));
    } else if (offerCategories && offerCategories.length) {
      const ctxCategories = contextPackageIds
        .map((pid) => packages.find((p) => p.id === pid))
        .filter(Boolean)
        .map((p) => p.category);
      applicable = ctxCategories.some((cat) => offerCategories.includes(cat));
    } else {
      // No specific restriction => applies to any
      applicable = true;
    }

    if (!applicable) {
      return { valid: false, offer: matchedOffer, discount_amount: 0, message: 'Promo code does not apply to selected services.' };
    }

    if (typeof matchedOffer.min_order_amount === 'number' && subtotal < matchedOffer.min_order_amount) {
      return {
        valid: false,
        offer: matchedOffer,
        discount_amount: 0,
        message: 'Order total does not meet the minimum amount for this promo.'
      };
    }

    // Since SpecialOffer has no structured discount field, apply a generic 10% discount.
    const discount_amount = Math.round(subtotal * 0.10 * 100) / 100;

    return { valid: true, offer: matchedOffer, discount_amount, message: 'Promo applied successfully.' };
  }

  // =========================
  // Paint configuration helpers
  // =========================

  _filterAndSortPaintConfigurations(configs, filters, sortBy) {
    let result = Array.isArray(configs) ? configs.slice() : [];
    const f = filters || {};

    if (f.vehicleType) {
      result = result.filter((c) => c.vehicle_type === f.vehicleType);
    }
    if (f.primaryColor) {
      const v = String(f.primaryColor).toLowerCase();
      result = result.filter((c) => String(c.primary_color || '').toLowerCase() === v);
    }
    if (f.secondaryColor) {
      const v = String(f.secondaryColor).toLowerCase();
      result = result.filter((c) => String(c.secondary_color || '').toLowerCase() === v);
    }
    if (f.primaryFinish) {
      result = result.filter((c) => c.primary_finish === f.primaryFinish);
    }
    if (f.secondaryFinish) {
      result = result.filter((c) => c.secondary_finish === f.secondaryFinish);
    }
    if (typeof f.isTwoTone === 'boolean') {
      result = result.filter((c) => !!c.is_two_tone === f.isTwoTone);
    }
    if (typeof f.maxPrice === 'number') {
      result = result.filter((c) => typeof c.price === 'number' && c.price <= f.maxPrice);
    }

    if (sortBy === 'price_low_to_high') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'newest_first') {
      // No created_at in model; keep insertion order.
    }

    return result;
  }

  // =========================
  // Service package helpers
  // =========================

  _filterAndSortServicePackages(packages, filters, sortBy) {
    let result = Array.isArray(packages) ? packages.slice() : [];
    const f = filters || {};

    if (f.category) {
      result = result.filter((p) => p.category === f.category);
    }
    if (f.vehicleType) {
      result = result.filter((p) => Array.isArray(p.vehicle_types) && p.vehicle_types.includes(f.vehicleType));
    }
    if (typeof f.minPrice === 'number') {
      result = result.filter((p) => typeof p.current_price === 'number' && p.current_price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      result = result.filter((p) => typeof p.current_price === 'number' && p.current_price <= f.maxPrice);
    }
    if (typeof f.allowOnlineBooking === 'boolean') {
      result = result.filter((p) => !!p.allow_online_booking === f.allowOnlineBooking);
    }
    if (f.clearCoatType) {
      result = result.filter((p) => p.clear_coat_type === f.clearCoatType);
    }
    if (f.searchQuery) {
      const q = String(f.searchQuery).toLowerCase();
      result = result.filter((p) => {
        return (
          String(p.name || '').toLowerCase().includes(q) ||
          String(p.short_label || '').toLowerCase().includes(q) ||
          String(p.description || '').toLowerCase().includes(q)
        );
      });
    }

    if (sortBy === 'price_low_to_high') {
      result.sort((a, b) => (a.current_price || 0) - (b.current_price || 0));
    } else if (sortBy === 'price_high_to_low') {
      result.sort((a, b) => (b.current_price || 0) - (a.current_price || 0));
    } else if (sortBy === 'rating_high_to_low') {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'warranty_high_to_low') {
      result.sort((a, b) => (b.warranty_months || 0) - (a.warranty_months || 0));
    }

    return result;
  }

  // =========================
  // Location & appointment helpers
  // =========================

  _findNearestLocationsByZip(postalCode, radiusMiles) {
    const all = this._getFromStorage('locations', []);
    if (!postalCode) return all.filter((l) => l.is_active !== false);

    const target = String(postalCode).trim();
    const active = all.filter((l) => l.is_active !== false);

    // Without real geocoding, approximate by exact postal code match,
    // then fall back to same first 3 digits if radiusMiles is provided.
    let exact = active.filter((l) => String(l.postal_code || '').trim() === target);
    if (exact.length) return exact;

    if (radiusMiles && radiusMiles > 0 && target.length >= 3) {
      const prefix = target.slice(0, 3);
      const approx = active.filter((l) => String(l.postal_code || '').slice(0, 3) === prefix);
      if (approx.length) return approx;
    }

    return active;
  }

  _getAvailableSlotsForDate(locationId, packageId, date, startTime, endTime) {
    const slots = this._getFromStorage('appointment_slots', []);
    const targetDate = String(date);
    const hasStart = !!startTime;
    const hasEnd = !!endTime;

    const filtered = slots.filter((s) => {
      if (!s.is_available) return false;
      if (s.location_id !== locationId) return false;
      if (packageId && s.package_id && s.package_id !== packageId) return false;
      if (!s.start_datetime) return false;
      const d = String(s.start_datetime).slice(0, 10);
      if (d !== targetDate) return false;

      if (hasStart || hasEnd) {
        const t = String(s.start_datetime).slice(11, 16); // HH:MM
        if (hasStart && t < startTime) return false;
        if (hasEnd && t > endTime) return false;
      }
      return true;
    });

    // Sort by start_datetime ascending
    filtered.sort((a, b) => {
      const ta = new Date(a.start_datetime).getTime();
      const tb = new Date(b.start_datetime).getTime();
      return ta - tb;
    });

    return filtered;
  }

  // =========================
  // Favorites helpers
  // =========================

  _getUserFavoritesState() {
    return this._getFromStorage('favorite_gallery_items', []);
  }

  // =========================
  // Comparison helpers
  // =========================

  _getOrCreateComparisonList() {
    let lists = this._getFromStorage('comparison_lists', []);
    let list = lists[0];
    if (!list) {
      list = {
        id: this._generateId('comparison'),
        package_ids: [],
        created_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('comparison_lists', lists);
    }
    return list;
  }

  // =========================
  // Core interface implementations
  // =========================

  // ---------- Homepage & general content ----------

  getHomepageContent() {
    const homepage = this._getFromStorage('homepage_content', {}) || {};
    const serviceCategories = this._getFromStorage('service_categories', []);
    const servicePackages = this._getFromStorage('service_packages', []);
    const categoriesMap = this._getServiceCategoriesMap();

    // Featured categories: use stored list if present, else all categories
    let featured_categories = Array.isArray(homepage.featured_categories)
      ? homepage.featured_categories
      : serviceCategories.map((c) => ({
          category: c.category,
          category_label: c.name,
          description: c.description || ''
        }));

    // Featured packages: if homepage.featured_package_ids present, map them; otherwise top 4 by rating
    let featuredPackagesSource = [];
    if (Array.isArray(homepage.featured_package_ids) && homepage.featured_package_ids.length) {
      featuredPackagesSource = servicePackages.filter((p) => homepage.featured_package_ids.includes(p.id));
    } else {
      featuredPackagesSource = servicePackages
        .slice()
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 4);
    }

    const featured_packages = featuredPackagesSource.map((p) => ({
      id: p.id,
      name: p.name,
      short_label: p.short_label || '',
      category: p.category,
      category_label: this._getCategoryLabel(p.category, categoriesMap),
      starting_from_price: p.current_price || p.base_price || 0,
      currency: p.currency || 'USD',
      image_url: p.image_url || ''
    }));

    // Trust highlights derived from packages + optional stored overrides
    let ratingSum = 0;
    let ratingCount = 0;
    let totalReviews = 0;
    let maxWarranty = 0;
    servicePackages.forEach((p) => {
      if (typeof p.rating === 'number') {
        ratingSum += p.rating;
        ratingCount += 1;
      }
      if (typeof p.review_count === 'number') {
        totalReviews += p.review_count;
      }
      if (typeof p.warranty_months === 'number' && p.warranty_months > maxWarranty) {
        maxWarranty = p.warranty_months;
      }
    });

    const trust_highlights = {
      average_rating: ratingCount ? ratingSum / ratingCount : 0,
      review_count: totalReviews,
      max_warranty_months: maxWarranty,
      certifications: (homepage.trust_highlights && homepage.trust_highlights.certifications) || []
    };

    return {
      hero_title: homepage.hero_title || '',
      hero_subtitle: homepage.hero_subtitle || '',
      featured_categories,
      featured_packages,
      trust_highlights
    };
  }

  getServiceCategories() {
    let categories = this._getFromStorage('service_categories', []);
    if (!Array.isArray(categories) || categories.length === 0) {
      const packages = this._getFromStorage('service_packages', []);
      const map = {};
      packages.forEach((p) => {
        if (p && p.category && !map[p.category]) {
          const raw = String(p.category);
          const label = raw
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
          map[p.category] = {
            category: p.category,
            name: label,
            description: p.description || ''
          };
        }
      });
      categories = Object.values(map);
      this._saveToStorage('service_categories', categories);
    }
    return categories;
  }

  // ---------- Service packages & cart ----------

  getServicePackages(filters, sortBy, page, pageSize) {
    let all = this._getFromStorage('service_packages', []);
    // Ensure at least one default custom racing stripes package exists for coupe bookings
    if (!all.find((p) => p && p.id === 'stripes_coupe_basic')) {
      const defaultStripesPackage = {
        id: 'stripes_coupe_basic',
        name: 'Basic Racing Stripes - Coupe',
        category: 'custom_racing_stripes',
        short_label: 'Coupe Racing Stripes',
        description: 'Entry-level custom racing stripes package for coupes.',
        base_price: 399,
        current_price: 399,
        currency: 'USD',
        vehicle_types: ['coupe', '2_door_coupe'],
        clear_coat_type: null,
        default_finish_type: 'gloss',
        available_finish_types: ['gloss', 'matte', 'satin'],
        warranty_months: 12,
        warranty_description: '12-month workmanship warranty on stripe installation.',
        image_url: '',
        features: ['Dual over-the-top stripes', 'Basic design consultation'],
        estimated_duration_hours: 3,
        allow_online_booking: true,
        location_specific: false,
        eligible_for_promos: true
      };
      all = all.concat([defaultStripesPackage]);
      this._saveToStorage('service_packages', all);
    }
    const categoriesMap = this._getServiceCategoriesMap();

    const filteredSorted = this._filterAndSortServicePackages(all, filters || {}, sortBy);
    const total_count = filteredSorted.length;

    let items = filteredSorted;
    if (page && pageSize) {
      const start = (page - 1) * pageSize;
      items = filteredSorted.slice(start, start + pageSize);
    }

    const packages = items.map((p) => ({
      id: p.id,
      name: p.name,
      short_label: p.short_label || '',
      category: p.category,
      category_label: this._getCategoryLabel(p.category, categoriesMap),
      description: p.description || '',
      base_price: p.base_price || 0,
      current_price: p.current_price || p.base_price || 0,
      currency: p.currency || 'USD',
      vehicle_types: Array.isArray(p.vehicle_types) ? p.vehicle_types : [],
      clear_coat_type: p.clear_coat_type || null,
      default_finish_type: p.default_finish_type || null,
      warranty_months: p.warranty_months || 0,
      warranty_description: p.warranty_description || '',
      rating: p.rating || 0,
      review_count: p.review_count || 0,
      image_url: p.image_url || '',
      features: Array.isArray(p.features) ? p.features : [],
      allow_online_booking: !!p.allow_online_booking
    }));

    return { packages, total_count };
  }

  getServicePackageDetails(packageId) {
    const all = this._getFromStorage('service_packages', []);
    const pkg = all.find((p) => p.id === packageId) || null;
    const categoriesMap = this._getServiceCategoriesMap();

    if (!pkg) {
      return { package: null, eligible_special_offers: [] };
    }

    const detailedPackage = {
      id: pkg.id,
      name: pkg.name,
      short_label: pkg.short_label || '',
      category: pkg.category,
      category_label: this._getCategoryLabel(pkg.category, categoriesMap),
      description: pkg.description || '',
      base_price: pkg.base_price || 0,
      current_price: pkg.current_price || pkg.base_price || 0,
      currency: pkg.currency || 'USD',
      vehicle_types: Array.isArray(pkg.vehicle_types) ? pkg.vehicle_types : [],
      clear_coat_type: pkg.clear_coat_type || null,
      clear_coat_type_label: this._formatClearCoatTypeLabel(pkg.clear_coat_type),
      default_finish_type: pkg.default_finish_type || null,
      default_finish_type_label: this._formatFinishTypeLabel(pkg.default_finish_type),
      available_finish_types: Array.isArray(pkg.available_finish_types) ? pkg.available_finish_types : [],
      warranty_months: pkg.warranty_months || 0,
      warranty_description: pkg.warranty_description || '',
      rating: pkg.rating || 0,
      review_count: pkg.review_count || 0,
      image_url: pkg.image_url || '',
      features: Array.isArray(pkg.features) ? pkg.features : [],
      estimated_duration_hours: pkg.estimated_duration_hours || null,
      allow_online_booking: !!pkg.allow_online_booking,
      eligible_for_promos: pkg.eligible_for_promos !== false
    };

    // Determine eligible special offers for this package
    const offers = this._getFromStorage('special_offers', []);
    const now = new Date();
    const eligible_special_offers = offers.filter((o) => {
      if (!o || o.status !== 'active') return false;
      if (o.start_date) {
        const sd = new Date(o.start_date);
        if (now < sd) return false;
      }
      if (o.end_date) {
        const ed = new Date(o.end_date);
        if (now > ed) return false;
      }

      const byPackage = Array.isArray(o.applicable_package_ids) && o.applicable_package_ids.length;
      const byCategory = Array.isArray(o.applicable_categories) && o.applicable_categories.length;

      if (byPackage && !o.applicable_package_ids.includes(pkg.id)) return false;
      if (byCategory && !o.applicable_categories.includes(pkg.category)) return false;

      if (typeof o.min_order_amount === 'number') {
        const price = detailedPackage.current_price;
        if (price < o.min_order_amount) return false;
      }
      return true;
    }).map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description || '',
      promo_code: o.promo_code,
      min_order_amount: typeof o.min_order_amount === 'number' ? o.min_order_amount : null,
      terms: o.terms || ''
    }));

    return { package: detailedPackage, eligible_special_offers };
  }

  addPackageToCart(packageId, vehicleType, configurationId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const packages = this._getFromStorage('service_packages', []);
    const pkg = packages.find((p) => p.id === packageId) || null;

    if (!pkg) {
      return { success: false, message: 'Service package not found.', cart: null };
    }

    if (Array.isArray(pkg.vehicle_types) && !pkg.vehicle_types.includes(vehicleType)) {
      return { success: false, message: 'Selected vehicle type is not supported for this package.', cart: null };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const unitPrice = pkg.current_price || pkg.base_price || 0;
    const lineTotal = unitPrice * qty;

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      package_id: packageId,
      configuration_id: configurationId || null,
      vehicle_type: vehicleType,
      location_id: null,
      quantity: qty,
      unit_price: unitPrice,
      line_total: lineTotal,
      notes: ''
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);

    this._recalculateCartTotals(cart);

    const serialized = this._serializeCart(cart);

    return {
      success: true,
      message: 'Package added to cart.',
      cart: serialized
    };
  }

  getCartSummary() {
    const cart = this._getRawCart();
    if (!cart || !Array.isArray(cart.items) || !cart.items.length) {
      return { has_cart: false, cart: null };
    }
    this._recalculateCartTotals(cart);
    const serialized = this._serializeCart(cart);
    return {
      has_cart: true,
      cart: serialized
    };
  }

  applyPromoCodeToCart(promoCode) {
    const cart = this._getRawCart();
    if (!cart || !Array.isArray(cart.items) || !cart.items.length) {
      return {
        success: false,
        message: 'Cart is empty.',
        applied_offer: null,
        cart: null
      };
    }

    this._recalculateCartTotals(cart);

    const validation = this._validateAndResolvePromoCode(promoCode, { cart });

    if (!validation.valid) {
      cart.promo_code = null;
      cart.discount_amount = 0;
      cart.total = cart.subtotal;
      this._saveCart(cart);
      const serialized = this._serializeCart(cart);
      return {
        success: false,
        message: validation.message,
        applied_offer: null,
        cart: serialized
      };
    }

    cart.promo_code = promoCode;
    cart.discount_amount = validation.discount_amount;
    cart.total = Math.max(cart.subtotal - validation.discount_amount, 0);
    this._saveCart(cart);
    const serialized = this._serializeCart(cart);

    return {
      success: true,
      message: validation.message,
      applied_offer: {
        id: validation.offer.id,
        title: validation.offer.title,
        promo_code: validation.offer.promo_code,
        description: validation.offer.description || '',
        min_order_amount: typeof validation.offer.min_order_amount === 'number'
          ? validation.offer.min_order_amount
          : null
      },
      cart: serialized
    };
  }

  // ---------- Booking & appointments ----------

  getBookingPageData(packageId, configurationId) {
    const packages = this._getFromStorage('service_packages', []);
    const pkg = packages.find((p) => p.id === packageId) || null;
    const categoriesMap = this._getServiceCategoriesMap();
    const locations = this._getFromStorage('locations', []);

    if (!pkg) {
      return {
        package_summary: null,
        allowed_vehicle_types: [],
        location_options: [],
        appointment_type_options: [],
        price_summary: null
      };
    }

    const package_summary = {
      id: pkg.id,
      name: pkg.name,
      short_label: pkg.short_label || '',
      category_label: this._getCategoryLabel(pkg.category, categoriesMap),
      current_price: pkg.current_price || pkg.base_price || 0,
      currency: pkg.currency || 'USD',
      warranty_months: pkg.warranty_months || 0,
      warranty_description: pkg.warranty_description || '',
      clear_coat_type_label: this._formatClearCoatTypeLabel(pkg.clear_coat_type),
      default_finish_type_label: this._formatFinishTypeLabel(pkg.default_finish_type),
      image_url: pkg.image_url || '',
      features: Array.isArray(pkg.features) ? pkg.features : []
    };

    const allowed_vehicle_types = (pkg.vehicle_types || []).map((vt) => ({
      value: vt,
      label: this._formatVehicleTypeLabel(vt)
    }));

    const location_options = locations
      .filter((l) => l.is_active !== false)
      .filter((l) => {
        if (Array.isArray(l.services_offered) && l.services_offered.length) {
          return l.services_offered.includes(pkg.category);
        }
        // If location does not specify, assume all services
        return true;
      })
      .map((l) => ({
        id: l.id,
        name: l.name,
        city: l.city || '',
        state: l.state || '',
        postal_code: l.postal_code || '',
        rating: l.rating || 0,
        review_count: l.review_count || 0
      }));

    const appointment_type_options = [
      { value: 'drop_off', label: 'Drop-off' },
      { value: 'wait', label: 'Wait at shop' }
    ];

    const price_summary = {
      base_price: pkg.base_price || 0,
      current_price: pkg.current_price || pkg.base_price || 0,
      currency: pkg.currency || 'USD'
    };

    return {
      package_summary,
      allowed_vehicle_types,
      location_options,
      appointment_type_options,
      price_summary
    };
  }

  getAvailableAppointmentSlots(locationId, packageId, date, startTime, endTime) {
    const slots = this._getAvailableSlotsForDate(locationId, packageId, date, startTime, endTime);
    const locations = this._getFromStorage('locations', []);
    const packages = this._getFromStorage('service_packages', []);

    // Resolve foreign keys: location_id -> location, package_id -> package
    return slots.map((s) => {
      const loc = locations.find((l) => l.id === s.location_id) || null;
      const pkg = s.package_id ? packages.find((p) => p.id === s.package_id) || null : null;
      return {
        id: s.id,
        location_id: s.location_id,
        package_id: s.package_id || null,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        is_available: !!s.is_available,
        max_vehicles: s.max_vehicles || null,
        notes: s.notes || '',
        location: loc,
        package: pkg
      };
    });
  }

  calculatePackagePriceWithPromo(packageId, vehicleType, configurationId, promoCode) {
    const packages = this._getFromStorage('service_packages', []);
    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return {
        base_price: 0,
        current_price_before_discount: 0,
        discount_amount: 0,
        total_price_after_discount: 0,
        currency: 'USD',
        promo_applied: false,
        promo_code: promoCode || null,
        promo_message: 'Service package not found.'
      };
    }

    const configurations = this._getFromStorage('paint_configurations', []);
    const config = configurationId
      ? configurations.find((c) => c.id === configurationId) || null
      : null;

    const base_price = pkg.base_price || 0;
    const current_price_before_discount = config && typeof config.price === 'number'
      ? config.price
      : (pkg.current_price || pkg.base_price || 0);

    let discount_amount = 0;
    let promo_applied = false;
    let promo_message = '';

    if (promoCode) {
      const validation = this._validateAndResolvePromoCode(promoCode, {
        packageIds: [pkg.id],
        subtotal: current_price_before_discount
      });

      if (validation.valid) {
        discount_amount = validation.discount_amount;
        promo_applied = true;
        promo_message = validation.message;
      } else {
        discount_amount = 0;
        promo_applied = false;
        promo_message = validation.message;
      }
    }

    const total_price_after_discount = Math.max(current_price_before_discount - discount_amount, 0);

    return {
      base_price,
      current_price_before_discount,
      discount_amount,
      total_price_after_discount,
      currency: pkg.currency || 'USD',
      promo_applied,
      promo_code: promo_applied ? promoCode : null,
      promo_message
    };
  }

  placeBooking(
    packageId,
    configurationId,
    vehicleType,
    locationId,
    appointmentSlotId,
    appointmentType,
    contactName,
    contactEmail,
    contactPhone,
    promoCode
  ) {
    const packages = this._getFromStorage('service_packages', []);
    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return { success: false, message: 'Service package not found.', booking: null };
    }

    if (Array.isArray(pkg.vehicle_types) && !pkg.vehicle_types.includes(vehicleType)) {
      return { success: false, message: 'Selected vehicle type is not supported for this package.', booking: null };
    }

    const locations = this._getFromStorage('locations', []);
    const location = locations.find((l) => l.id === locationId) || null;
    if (!location) {
      return { success: false, message: 'Location not found.', booking: null };
    }

    const slots = this._getFromStorage('appointment_slots', []);
    const slotIndex = slots.findIndex((s) => s.id === appointmentSlotId);
    if (slotIndex === -1) {
      return { success: false, message: 'Appointment slot not found.', booking: null };
    }
    const slot = slots[slotIndex];
    if (!slot.is_available) {
      return { success: false, message: 'Selected appointment slot is no longer available.', booking: null };
    }

    if (slot.location_id !== locationId) {
      return { success: false, message: 'Appointment slot does not belong to selected location.', booking: null };
    }
    if (slot.package_id && slot.package_id !== packageId) {
      return { success: false, message: 'Appointment slot does not match selected package.', booking: null };
    }

    const priceInfo = this.calculatePackagePriceWithPromo(
      packageId,
      vehicleType,
      configurationId,
      promoCode || null
    );

    const bookingId = this._generateId('booking');
    const createdAt = this._nowIso();

    const bookingRecord = {
      id: bookingId,
      package_id: packageId,
      configuration_id: configurationId || null,
      location_id: locationId,
      status: 'confirmed',
      vehicle_type: vehicleType,
      appointment_type: appointmentType || null,
      appointment_start: slot.start_datetime,
      appointment_end: slot.end_datetime,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      promo_code: priceInfo.promo_applied ? promoCode : null,
      promo_discount_amount: priceInfo.discount_amount || 0,
      base_price: priceInfo.base_price,
      total_price: priceInfo.total_price_after_discount,
      created_at: createdAt
    };

    const bookings = this._getFromStorage('bookings', []);
    bookings.push(bookingRecord);
    this._saveToStorage('bookings', bookings);

    // Mark slot as no longer available
    slots[slotIndex].is_available = false;
    this._saveToStorage('appointment_slots', slots);

    const responseBooking = {
      id: bookingRecord.id,
      status: bookingRecord.status,
      package_id: bookingRecord.package_id,
      package_name: pkg.name,
      configuration_id: bookingRecord.configuration_id,
      location_id: bookingRecord.location_id,
      location_name: location.name,
      vehicle_type: bookingRecord.vehicle_type,
      appointment_type: bookingRecord.appointment_type,
      appointment_start: bookingRecord.appointment_start,
      appointment_end: bookingRecord.appointment_end,
      contact_name: bookingRecord.contact_name,
      contact_email: bookingRecord.contact_email,
      contact_phone: bookingRecord.contact_phone,
      promo_code: bookingRecord.promo_code,
      promo_discount_amount: bookingRecord.promo_discount_amount,
      base_price: bookingRecord.base_price,
      total_price: bookingRecord.total_price,
      created_at: bookingRecord.created_at,
      // Foreign key resolution
      package: pkg,
      location: location
    };

    return {
      success: true,
      message: 'Booking placed successfully.',
      booking: responseBooking
    };
  }

  getBookingDetails(bookingId) {
    const bookings = this._getFromStorage('bookings', []);
    const bookingRecord = bookings.find((b) => b.id === bookingId) || null;
    if (!bookingRecord) {
      return { booking: null, preparation_instructions: '' };
    }

    const packages = this._getFromStorage('service_packages', []);
    const locations = this._getFromStorage('locations', []);

    const pkg = packages.find((p) => p.id === bookingRecord.package_id) || null;
    const location = locations.find((l) => l.id === bookingRecord.location_id) || null;

    const responseBooking = {
      id: bookingRecord.id,
      status: bookingRecord.status,
      package_id: bookingRecord.package_id,
      package_name: pkg ? pkg.name : '',
      location_id: bookingRecord.location_id,
      location_name: location ? location.name : '',
      address_line1: location ? location.address_line1 : '',
      city: location ? location.city : '',
      state: location ? location.state : '',
      postal_code: location ? location.postal_code : '',
      vehicle_type: bookingRecord.vehicle_type,
      appointment_type: bookingRecord.appointment_type,
      appointment_start: bookingRecord.appointment_start,
      appointment_end: bookingRecord.appointment_end,
      contact_name: bookingRecord.contact_name,
      contact_email: bookingRecord.contact_email,
      contact_phone: bookingRecord.contact_phone,
      promo_code: bookingRecord.promo_code,
      promo_discount_amount: bookingRecord.promo_discount_amount,
      total_price: bookingRecord.total_price,
      created_at: bookingRecord.created_at,
      // Foreign key resolution
      package: pkg,
      location: location
    };

    const preparation_instructions = '';

    return {
      booking: responseBooking,
      preparation_instructions
    };
  }

  // ---------- Custom Paint Configurator ----------

  getConfiguratorInitData() {
    let data = this._getFromStorage('configurator_init_data', null);

    if (!data || typeof data !== 'object' || !Array.isArray(data.vehicle_types)) {
      // Provide sensible defaults if not configured
      data = {
        vehicle_types: [
          { value: '2_door_coupe', label: '2-Door Coupe' },
          { value: 'coupe', label: 'Coupe' },
          { value: 'suv', label: 'SUV' },
          { value: 'sedan', label: 'Sedan' }
        ],
        color_options: [
          { value: 'red', label: 'Red', hex: '#ff0000' },
          { value: 'black', label: 'Black', hex: '#000000' },
          { value: 'gray', label: 'Gray', hex: '#808080' },
          { value: 'white', label: 'White', hex: '#ffffff' }
        ],
        finish_types: [
          { value: 'matte', label: 'Matte' },
          { value: 'gloss', label: 'Gloss' },
          { value: 'satin', label: 'Satin' }
        ],
        budget_defaults: {
          min_price: 500,
          max_price: 5000,
          step: 50
        }
      };
      this._saveToStorage('configurator_init_data', data);
    }

    return data;
  }

  getPaintConfigurations(filters, sortBy) {
    const configs = this._getFromStorage('paint_configurations', []);
    const filteredSorted = this._filterAndSortPaintConfigurations(configs, filters || {}, sortBy);
    const total_count = filteredSorted.length;

    const packages = this._getFromStorage('service_packages', []);
    const categoriesMap = this._getServiceCategoriesMap();

    const configurations = filteredSorted.map((c) => {
      const pkg = packages.find((p) => p.id === c.package_id) || null;
      const category_label = pkg ? this._getCategoryLabel(pkg.category, categoriesMap) : '';
      return {
        id: c.id,
        name: c.name || '',
        vehicle_type: c.vehicle_type,
        primary_color: c.primary_color,
        secondary_color: c.secondary_color || null,
        primary_finish: c.primary_finish,
        secondary_finish: c.secondary_finish || null,
        is_two_tone: !!c.is_two_tone,
        price: c.price || 0,
        image_url: c.image_url || '',
        package_id: c.package_id,
        package_name: pkg ? pkg.name : '',
        category_label,
        // Foreign key resolution
        package: pkg
      };
    });

    return { configurations, total_count };
  }

  getPaintConfigurationDetails(configurationId) {
    const configs = this._getFromStorage('paint_configurations', []);
    const config = configs.find((c) => c.id === configurationId) || null;
    if (!config) {
      return { configuration: null, package: null };
    }

    const packages = this._getFromStorage('service_packages', []);
    const pkg = packages.find((p) => p.id === config.package_id) || null;

    const configuration = {
      id: config.id,
      name: config.name || '',
      vehicle_type: config.vehicle_type,
      primary_color: config.primary_color,
      secondary_color: config.secondary_color || null,
      primary_finish: config.primary_finish,
      secondary_finish: config.secondary_finish || null,
      is_two_tone: !!config.is_two_tone,
      price: config.price || 0,
      image_url: config.image_url || ''
    };

    const packageInfo = pkg
      ? {
          id: pkg.id,
          name: pkg.name,
          description: pkg.description || '',
          category_label: this._getCategoryLabel(pkg.category, this._getServiceCategoriesMap()),
          base_price: pkg.base_price || 0,
          current_price: pkg.current_price || pkg.base_price || 0,
          currency: pkg.currency || 'USD',
          warranty_months: pkg.warranty_months || 0,
          warranty_description: pkg.warranty_description || ''
        }
      : null;

    return { configuration, package: packageInfo };
  }

  savePaintConfiguration(configurationId, savedName) {
    const configs = this._getFromStorage('paint_configurations', []);
    const config = configs.find((c) => c.id === configurationId) || null;
    if (!config) {
      return { success: false, message: 'Configuration not found.', saved_configuration: null };
    }

    const savedConfigurations = this._getFromStorage('saved_configurations', []);
    const saved = {
      id: this._generateId('saved_config'),
      configuration_id: configurationId,
      saved_name: savedName || '',
      saved_at: this._nowIso()
    };
    savedConfigurations.push(saved);
    this._saveToStorage('saved_configurations', savedConfigurations);

    return {
      success: true,
      message: 'Configuration saved.',
      saved_configuration: saved
    };
  }

  getSavedConfigurations() {
    const savedConfigurations = this._getFromStorage('saved_configurations', []);
    const configs = this._getFromStorage('paint_configurations', []);
    const packages = this._getFromStorage('service_packages', []);

    return savedConfigurations.map((s) => {
      const config = configs.find((c) => c.id === s.configuration_id) || null;
      let enrichedConfig = null;
      if (config) {
        const pkg = packages.find((p) => p.id === config.package_id) || null;
        enrichedConfig = {
          id: config.id,
          name: config.name || '',
          vehicle_type: config.vehicle_type,
          primary_color: config.primary_color,
          secondary_color: config.secondary_color || null,
          primary_finish: config.primary_finish,
          secondary_finish: config.secondary_finish || null,
          is_two_tone: !!config.is_two_tone,
          price: config.price || 0,
          image_url: config.image_url || '',
          package: pkg
        };
      }
      return {
        saved_configuration_id: s.id,
        saved_name: s.saved_name || '',
        saved_at: s.saved_at,
        configuration: enrichedConfig
      };
    });
  }

  // ---------- Locations & shop search ----------

  searchLocations(postalCode, radiusMiles, sortBy, serviceCategory) {
    let locations = this._findNearestLocationsByZip(postalCode, radiusMiles);

    if (serviceCategory) {
      locations = locations.filter((l) => {
        if (Array.isArray(l.services_offered) && l.services_offered.length) {
          return l.services_offered.includes(serviceCategory);
        }
        return true;
      });
    }

    if (sortBy === 'rating_high_to_low') {
      locations.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'name_a_to_z') {
      locations.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    } else if (sortBy === 'distance_asc') {
      // Without real distances, preserve order from _findNearestLocationsByZip
    }

    return locations;
  }

  getLocationDetails(locationId) {
    const locations = this._getFromStorage('locations', []);
    const location = locations.find((l) => l.id === locationId) || null;

    // Instrumentation for task completion tracking (task_6)
    try {
      localStorage.setItem('task6_openedLocationDetailsId', String(locationId));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { location };
  }

  // ---------- Gallery & favorites ----------

  getGalleryFilterOptions() {
    let options = this._getFromStorage('gallery_filter_options', null);
    if (!options || typeof options !== 'object' || !Array.isArray(options.finish_types)) {
      // Derive from gallery items or default
      const items = this._getFromStorage('gallery_items', []);
      const finishSet = new Set();
      const colorSet = new Set();
      items.forEach((it) => {
        if (it.finish_type) finishSet.add(it.finish_type);
        if (Array.isArray(it.dominant_colors)) {
          it.dominant_colors.forEach((c) => colorSet.add(c));
        }
      });

      const finish_types = finishSet.size
        ? Array.from(finishSet).map((v) => ({ value: v, label: this._formatFinishTypeLabel(v) }))
        : [
            { value: 'matte', label: 'Matte' },
            { value: 'gloss', label: 'Gloss' },
            { value: 'satin', label: 'Satin' }
          ];

      const color_values = colorSet.size
        ? Array.from(colorSet)
        : ['black', 'gray', 'red', 'white'];

      const color_options = color_values.map((v) => ({
        value: v,
        label: v.charAt(0).toUpperCase() + v.slice(1)
      }));

      options = { finish_types, color_options };
      this._saveToStorage('gallery_filter_options', options);
    }
    return options;
  }

  getGalleryItems(filters, sortBy, page, pageSize) {
    const all = this._getFromStorage('gallery_items', []);
    const f = filters || {};

    let items = all.slice();

    if (Array.isArray(f.finishTypes) && f.finishTypes.length) {
      items = items.filter((it) => f.finishTypes.includes(it.finish_type));
    }

    if (Array.isArray(f.colors) && f.colors.length) {
      items = items.filter((it) => {
        if (!Array.isArray(it.dominant_colors) || !it.dominant_colors.length) return false;
        return it.dominant_colors.some((c) => f.colors.includes(c));
      });
    }

    if (f.vehicleType) {
      items = items.filter((it) => it.vehicle_type === f.vehicleType);
    }

    if (f.serviceCategory) {
      items = items.filter((it) => it.service_category === f.serviceCategory);
    }

    if (sortBy === 'newest_first') {
      items.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });
    } else if (sortBy === 'oldest_first') {
      items.sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return ta - tb;
      });
    }

    const total_count = items.length;

    if (page && pageSize) {
      const start = (page - 1) * pageSize;
      items = items.slice(start, start + pageSize);
    }

    return { items, total_count };
  }

  addFavoriteGalleryItem(galleryItemId) {
    const items = this._getFromStorage('gallery_items', []);
    const item = items.find((it) => it.id === galleryItemId) || null;
    if (!item) {
      return {
        success: false,
        message: 'Gallery item not found.',
        favorite: null,
        total_favorites_count: this._getUserFavoritesState().length
      };
    }

    let favorites = this._getUserFavoritesState();
    const existing = favorites.find((f) => f.gallery_item_id === galleryItemId);
    if (existing) {
      return {
        success: true,
        message: 'Already in favorites.',
        favorite: existing,
        total_favorites_count: favorites.length
      };
    }

    const favorite = {
      id: this._generateId('favorite_gallery'),
      gallery_item_id: galleryItemId,
      created_at: this._nowIso()
    };
    favorites.push(favorite);
    this._saveToStorage('favorite_gallery_items', favorites);

    return {
      success: true,
      message: 'Added to favorites.',
      favorite,
      total_favorites_count: favorites.length
    };
  }

  removeFavoriteGalleryItem(galleryItemId) {
    let favorites = this._getUserFavoritesState();
    const initialLen = favorites.length;
    favorites = favorites.filter((f) => f.gallery_item_id !== galleryItemId);
    this._saveToStorage('favorite_gallery_items', favorites);

    const removed = favorites.length < initialLen;

    return {
      success: removed,
      message: removed ? 'Removed from favorites.' : 'Favorite not found.',
      total_favorites_count: favorites.length
    };
  }

  getFavoriteGalleryItems() {
    const favorites = this._getUserFavoritesState();
    const items = this._getFromStorage('gallery_items', []);

    const result = favorites.map((f) => {
      const item = items.find((it) => it.id === f.gallery_item_id) || null;
      return {
        favorite_id: f.id,
        saved_at: f.created_at,
        gallery_item: item
      };
    });

    // Instrumentation for task completion tracking (task_8)
    try {
      localStorage.setItem('task8_favoritesPageViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // ---------- Contact form ----------

  getContactFormOptions() {
    let options = this._getFromStorage('contact_form_options', null);
    if (!options || typeof options !== 'object' || !Array.isArray(options.inquiry_types)) {
      options = {
        inquiry_types: [
          {
            value: 'fleet_commercial',
            label: 'Fleet & Commercial',
            description: 'Fleet and commercial vehicle services'
          },
          {
            value: 'business_services',
            label: 'Business Services',
            description: 'Business partnerships and accounts'
          },
          {
            value: 'general',
            label: 'General Inquiry',
            description: 'Questions about services, pricing, or booking'
          },
          {
            value: 'other',
            label: 'Other',
            description: 'Anything else'
          }
        ],
        preferred_contact_methods: [
          { value: 'phone', label: 'Phone' },
          { value: 'email', label: 'Email' }
        ],
        main_phone: '',
        main_email: ''
      };
      this._saveToStorage('contact_form_options', options);
    }
    return options;
  }

  submitContactInquiry(
    inquiryType,
    name,
    email,
    phone,
    preferredContactMethod,
    message,
    fleetSize
  ) {
    if (!inquiryType || !name || !email || !message) {
      return {
        success: false,
        message: 'Missing required fields.',
        inquiry_id: null,
        created_at: null
      };
    }

    const inquiries = this._getFromStorage('contact_inquiries', []);
    const id = this._generateId('contact');
    const createdAt = this._nowIso();

    const inquiry = {
      id,
      inquiry_type: inquiryType,
      name,
      email,
      phone: phone || '',
      preferred_contact_method: preferredContactMethod || null,
      message,
      fleet_size: typeof fleetSize === 'number' ? fleetSize : null,
      created_at: createdAt,
      status: 'open'
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted.',
      inquiry_id: id,
      created_at: createdAt
    };
  }

  // ---------- Special offers & promos ----------

  getActiveSpecialOffers(serviceCategory) {
    const offers = this._getFromStorage('special_offers', []);
    const now = new Date();
    const categoriesMap = this._getServiceCategoriesMap();

    const active = offers.filter((o) => {
      if (!o || o.status !== 'active') return false;
      if (o.start_date) {
        const sd = new Date(o.start_date);
        if (now < sd) return false;
      }
      if (o.end_date) {
        const ed = new Date(o.end_date);
        if (now > ed) return false;
      }
      if (serviceCategory) {
        const cats = Array.isArray(o.applicable_categories) ? o.applicable_categories : [];
        if (cats.length && !cats.includes(serviceCategory)) return false;
      }
      return true;
    });

    return active.map((o) => {
      const applicable_categories = Array.isArray(o.applicable_categories)
        ? o.applicable_categories
        : [];
      const applicable_category_labels = applicable_categories.map((cat) =>
        this._getCategoryLabel(cat, categoriesMap)
      );
      return {
        id: o.id,
        title: o.title,
        description: o.description || '',
        promo_code: o.promo_code,
        status: o.status,
        start_date: o.start_date || null,
        end_date: o.end_date || null,
        min_order_amount: typeof o.min_order_amount === 'number' ? o.min_order_amount : null,
        applicable_categories,
        applicable_category_labels,
        terms: o.terms || ''
      };
    });
  }

  // ---------- Comparison list ----------

  addPackageToComparison(packageId) {
    const packages = this._getFromStorage('service_packages', []);
    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) {
      return { success: false, message: 'Service package not found.', comparison_list: null };
    }

    const list = this._getOrCreateComparisonList();
    let lists = this._getFromStorage('comparison_lists', []);

    if (!Array.isArray(list.package_ids)) list.package_ids = [];
    if (!list.package_ids.includes(packageId)) {
      list.package_ids.push(packageId);
      // Persist
      lists = lists.map((l) => (l.id === list.id ? list : l));
      this._saveToStorage('comparison_lists', lists);
    }

    return {
      success: true,
      message: 'Package added to comparison list.',
      comparison_list: list
    };
  }

  removePackageFromComparison(packageId) {
    const list = this._getOrCreateComparisonList();
    let lists = this._getFromStorage('comparison_lists', []);

    const initialLen = Array.isArray(list.package_ids) ? list.package_ids.length : 0;
    list.package_ids = (list.package_ids || []).filter((id) => id !== packageId);

    lists = lists.map((l) => (l.id === list.id ? list : l));
    this._saveToStorage('comparison_lists', lists);

    const removed = (list.package_ids || []).length < initialLen;

    return {
      success: removed,
      message: removed ? 'Package removed from comparison list.' : 'Package not in comparison list.',
      comparison_list: list
    };
  }

  getComparisonListDetails() {
    const list = this._getOrCreateComparisonList();
    const packages = this._getFromStorage('service_packages', []);
    const categoriesMap = this._getServiceCategoriesMap();

    const result = (list.package_ids || []).map((id) => {
      const pkg = packages.find((p) => p.id === id) || null;
      if (!pkg) return null;
      return {
        id: pkg.id,
        name: pkg.name,
        short_label: pkg.short_label || '',
        category: pkg.category,
        category_label: this._getCategoryLabel(pkg.category, categoriesMap),
        base_price: pkg.base_price || 0,
        current_price: pkg.current_price || pkg.base_price || 0,
        currency: pkg.currency || 'USD',
        clear_coat_type: pkg.clear_coat_type || null,
        clear_coat_type_label: this._formatClearCoatTypeLabel(pkg.clear_coat_type),
        warranty_months: pkg.warranty_months || 0,
        warranty_description: pkg.warranty_description || '',
        features: Array.isArray(pkg.features) ? pkg.features : [],
        rating: pkg.rating || 0,
        review_count: pkg.review_count || 0
      };
    }).filter(Boolean);

    return { packages: result };
  }

  clearComparisonList() {
    this._saveToStorage('comparison_lists', []);
    return { success: true, message: 'Comparison list cleared.' };
  }

  // ---------- Static / CMS content ----------

  getAboutPageContent() {
    let content = this._getFromStorage('about_page_content', null);
    if (!content || typeof content !== 'object') {
      content = {
        headline: '',
        body_html: '',
        years_in_business: 0,
        average_rating: 0,
        locations_count: 0,
        warranty_overview: ''
      };
      this._saveToStorage('about_page_content', content);
    }
    return content;
  }

  getFaqEntries(category) {
    const entries = this._getFromStorage('faq_entries', []);
    if (!category) return entries;
    return entries.filter((e) => e.category === category);
  }

  getTermsOfServiceContent() {
    let content = this._getFromStorage('terms_of_service_content', null);
    if (!content || typeof content !== 'object') {
      content = {
        last_updated: this._nowIso(),
        content_html: '',
        key_sections: []
      };
      this._saveToStorage('terms_of_service_content', content);
    }
    return content;
  }

  getPrivacyPolicyContent() {
    let content = this._getFromStorage('privacy_policy_content', null);
    if (!content || typeof content !== 'object') {
      content = {
        last_updated: this._nowIso(),
        content_html: '',
        data_retention_summary: '',
        contact_email: ''
      };
      this._saveToStorage('privacy_policy_content', content);
    }
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