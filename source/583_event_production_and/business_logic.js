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
  }

  // ------------------------
  // Storage helpers
  // ------------------------
  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const tables = [
      { key: 'event_packages', defaultValue: [] },
      { key: 'addon_definitions', defaultValue: [] },
      { key: 'package_addons', defaultValue: [] },
      { key: 'rental_items', defaultValue: [] },
      { key: 'rental_lists', defaultValue: [] },
      { key: 'rental_list_items', defaultValue: [] },
      { key: 'studio_rooms', defaultValue: [] },
      { key: 'room_bookings', defaultValue: [] },
      { key: 'shop_products', defaultValue: [] },
      { key: 'carts', defaultValue: [] },
      { key: 'cart_items', defaultValue: [] },
      { key: 'favorite_lists', defaultValue: [] },
      { key: 'favorite_items', defaultValue: [] },
      { key: 'blog_articles', defaultValue: [] },
      { key: 'quote_requests', defaultValue: [] },
      { key: 'support_requests', defaultValue: [] },
      { key: 'emergency_hotlines', defaultValue: [] },
      { key: 'promo_codes', defaultValue: [] },
      { key: 'shipping_options', defaultValue: [] },
      { key: 'services', defaultValue: [] },
      // Legacy/demo keys from template (kept for compatibility, but unused here)
      { key: 'users', defaultValue: [] },
      { key: 'products', defaultValue: [] }
    ];

    for (const { key, defaultValue } of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    }

    // About page content as a single object
    if (!localStorage.getItem('about_page_content')) {
      const aboutDefault = {
        company_overview_html: '',
        contact_information: {
          phone: '',
          email: '',
          address: '',
          business_hours: ''
        },
        policy_sections: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(aboutDefault));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
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

  // ------------------------
  // Small mapping helpers
  // ------------------------
  _categoryIdToLabel(categoryId) {
    switch (categoryId) {
      case 'wedding':
        return 'Wedding';
      case 'dj_mc_services':
        return 'DJ & MC Services';
      case 'lighting_only':
        return 'Lighting Only';
      case 'recommended_sound':
        return 'Recommended Sound';
      case 'concert_festival_production':
        return 'Concert & Festival Production';
      case 'sound_only':
        return 'Sound-Only Packages';
      case 'all_event_packages':
        return 'All Event Packages';
      case 'other':
        return 'Other Packages';
      default:
        return categoryId || '';
    }
  }

  _rentalCategoryIdToLabel(categoryId) {
    switch (categoryId) {
      case 'microphones':
        return 'Microphones';
      case 'speakers':
        return 'Speakers';
      case 'mixers':
        return 'Mixers';
      case 'other_rentals':
        return 'Other Rentals';
      default:
        return categoryId || '';
    }
  }

  _roomCategoryIdToLabel(categoryId) {
    switch (categoryId) {
      case 'rehearsal_rooms':
        return 'Rehearsal Rooms';
      case 'recording_studios':
        return 'Recording Studios';
      case 'other_rooms':
        return 'Other Rooms';
      default:
        return categoryId || '';
    }
  }

  _shopCategoryIdToLabel(categoryId) {
    switch (categoryId) {
      case 'cables_accessories':
        return 'Cables & Accessories';
      case 'microphones':
        return 'Microphones';
      case 'speakers':
        return 'Speakers';
      case 'mixers':
        return 'Mixers';
      case 'other':
        return 'Other';
      default:
        return categoryId || '';
    }
  }

  _productTypeToLabel(productType) {
    switch (productType) {
      case 'xlr_cable':
        return 'XLR Cable';
      case 'di_box':
        return 'DI Box';
      case 'other':
        return 'Other';
      default:
        return productType || '';
    }
  }

  _sortArray(arr, sortBy) {
    if (!sortBy) return arr;
    const copy = arr.slice();
    switch (sortBy) {
      case 'price_asc':
        copy.sort((a, b) => (a.base_price || a.price || a.daily_price || 0) - (b.base_price || b.price || b.daily_price || 0));
        break;
      case 'price_desc':
        copy.sort((a, b) => (b.base_price || b.price || b.daily_price || 0) - (a.base_price || a.price || a.daily_price || 0));
        break;
      case 'rating_desc':
        copy.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'rating_asc':
        copy.sort((a, b) => (a.rating || 0) - (b.rating || 0));
        break;
      default:
        break;
    }
    return copy;
  }

  // ------------------------
  // Cart helpers
  // ------------------------
  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    if (carts.length > 0) {
      return carts[0];
    }
    const cart = {
      id: this._generateId('cart'),
      items: [],
      promo_code: null,
      shipping_option_id: null,
      subtotal: 0,
      discount_total: 0,
      shipping_cost: 0,
      total: 0,
      created_at: new Date().toISOString(),
      updated_at: null
    };
    carts.push(cart);
    this._saveToStorage('carts', carts);
    return cart;
  }

  _recalculateCartTotals(cart) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    let subtotal = 0;
    for (const item of itemsForCart) {
      subtotal += item.subtotal || 0;
    }

    cart.subtotal = subtotal;

    // Apply promo code if any
    let discount_total = 0;
    let promoCode = cart.promo_code || null;
    if (promoCode) {
      const validation = this._validatePromoCode(promoCode, subtotal);
      if (!validation.isValid) {
        // Invalidate promo if not valid anymore
        cart.promo_code = null;
        discount_total = 0;
      } else {
        discount_total = validation.discount;
      }
    }

    cart.discount_total = discount_total;

    // Shipping cost
    const shippingOptions = this._getFromStorage('shipping_options', []);
    let shipping_cost = 0;
    if (cart.shipping_option_id) {
      const opt = shippingOptions.find(o => o.id === cart.shipping_option_id);
      if (opt && opt.is_active !== false) {
        shipping_cost = opt.cost || 0;
      }
    }
    cart.shipping_cost = shipping_cost;

    cart.total = Math.max(0, subtotal - discount_total + shipping_cost);
    cart.updated_at = new Date().toISOString();

    // Persist updated cart
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    return cart;
  }

  _validatePromoCode(promo_code, subtotal) {
    const result = {
      isValid: false,
      promo: null,
      discount: 0,
      message: ''
    };

    if (!promo_code) {
      result.message = 'No promo code.';
      return result;
    }

    const promos = this._getFromStorage('promo_codes', []);
    const promo = promos.find(p => p.code === promo_code);
    if (!promo || promo.is_active === false) {
      result.message = 'Promo code not found or inactive.';
      return result;
    }

    const now = new Date();
    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (now < from) {
        result.message = 'Promo code not yet valid.';
        return result;
      }
    }
    if (promo.valid_to) {
      const to = new Date(promo.valid_to);
      if (now > to) {
        result.message = 'Promo code expired.';
        return result;
      }
    }

    if (promo.min_order_total && subtotal < promo.min_order_total) {
      result.message = 'Order total below minimum for promo code.';
      return result;
    }

    let discount = 0;
    if (promo.discount_type === 'percent') {
      discount = subtotal * (promo.discount_value / 100);
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    }

    result.isValid = true;
    result.promo = promo;
    result.discount = discount;
    result.message = 'Promo code applied.';
    return result;
  }

  // ------------------------
  // Rental list helpers
  // ------------------------
  _getOrCreateRentalList() {
    let lists = this._getFromStorage('rental_lists', []);
    if (lists.length > 0) {
      return lists[0];
    }
    const list = {
      id: this._generateId('rentallist'),
      items: [],
      created_at: new Date().toISOString(),
      updated_at: null,
      estimated_total: 0
    };
    lists.push(list);
    this._saveToStorage('rental_lists', lists);
    return list;
  }

  _calculateRentalItemSubtotal(daily_price_snapshot, quantity, start_date, end_date) {
    const start = new Date(start_date);
    const end = new Date(end_date);
    const msPerDay = 24 * 60 * 60 * 1000;
    let days = Math.round((end - start) / msPerDay) + 1;
    if (!isFinite(days) || days < 1) days = 1;
    return daily_price_snapshot * quantity * days;
  }

  _recalculateRentalListTotals(rentalList) {
    const lists = this._getFromStorage('rental_lists', []);
    const items = this._getFromStorage('rental_list_items', []);
    const itemsForList = items.filter(i => i.rental_list_id === rentalList.id);

    let estimated_total = 0;
    for (const it of itemsForList) {
      estimated_total += it.subtotal || 0;
    }

    rentalList.estimated_total = estimated_total;
    rentalList.updated_at = new Date().toISOString();

    const idx = lists.findIndex(l => l.id === rentalList.id);
    if (idx !== -1) {
      lists[idx] = rentalList;
      this._saveToStorage('rental_lists', lists);
    }

    return rentalList;
  }

  // ------------------------
  // Favorites helpers
  // ------------------------
  _getOrCreateFavoriteList() {
    let lists = this._getFromStorage('favorite_lists', []);
    if (lists.length > 0) {
      return lists[0];
    }
    const list = {
      id: this._generateId('favoritelist'),
      items: [],
      created_at: new Date().toISOString(),
      updated_at: null
    };
    lists.push(list);
    this._saveToStorage('favorite_lists', lists);
    return list;
  }

  _getFavoriteIdsByType(item_type) {
    const favoriteList = this._getOrCreateFavoriteList();
    const favoriteItems = this._getFromStorage('favorite_items', []);
    return favoriteItems
      .filter(fi => fi.favorite_list_id === favoriteList.id && fi.item_type === item_type)
      .map(fi => fi.item_id);
  }

  // ------------------------
  // 1. getFeaturedEventPackages
  // ------------------------
  getFeaturedEventPackages() {
    const allPackages = this._getFromStorage('event_packages', []).filter(p => p.is_active !== false);

    const selectFeatured = (categoryId) => {
      const filtered = allPackages.filter(p => p.package_category_id === categoryId);
      filtered.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        return (a.base_price || 0) - (b.base_price || 0);
      });
      return filtered.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        category_label: this._categoryIdToLabel(p.package_category_id),
        summary_text: p.summary_text || '',
        base_price: p.base_price,
        currency: p.currency || 'USD',
        rating: typeof p.rating === 'number' ? p.rating : null,
        capacity_label: p.capacity_label || '',
        image_url: p.image_url || ''
      }));
    };

    return {
      wedding_packages: selectFeatured('wedding'),
      dj_packages: selectFeatured('dj_mc_services'),
      sound_only_packages: selectFeatured('sound_only')
    };
  }

  // ------------------------
  // 2. searchShopProducts
  // ------------------------
  searchShopProducts(query, filters, sort_by) {
    const products = this._getFromStorage('shop_products', []).filter(p => p.is_active !== false);
    const q = (query || '').trim().toLowerCase();

    let results = products.filter(p => {
      if (!q) return true;
      const haystack = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
      return haystack.indexOf(q) !== -1;
    });

    if (filters) {
      if (filters.category_id) {
        results = results.filter(p => p.category_id === filters.category_id);
      }
      if (filters.product_type) {
        results = results.filter(p => p.product_type === filters.product_type);
      }
      if (typeof filters.min_price === 'number') {
        results = results.filter(p => p.price >= filters.min_price);
      }
      if (typeof filters.max_price === 'number') {
        results = results.filter(p => p.price <= filters.max_price);
      }
      if (typeof filters.min_rating === 'number') {
        results = results.filter(p => (p.rating || 0) >= filters.min_rating);
      }
    }

    if (sort_by === 'price_asc' || sort_by === 'price_desc' || sort_by === 'rating_desc' || sort_by === 'rating_asc') {
      results = this._sortArray(results.map(p => ({ ...p, price: p.price })), sort_by);
    }

    return results.map(p => ({
      id: p.id,
      name: p.name,
      category_label: this._shopCategoryIdToLabel(p.category_id),
      product_type_label: this._productTypeToLabel(p.product_type),
      price: p.price,
      rating: typeof p.rating === 'number' ? p.rating : null,
      image_url: p.image_url || '',
      short_description: p.description ? String(p.description).slice(0, 140) : ''
    }));
  }

  // ------------------------
  // 3. getEventPackageCategories
  // ------------------------
  getEventPackageCategories() {
    const packages = this._getFromStorage('event_packages', []).filter(p => p.is_active !== false);
    const ids = new Set(packages.map(p => p.package_category_id));

    // Include known categories even if no packages yet
    const known = [
      'wedding',
      'dj_mc_services',
      'lighting_only',
      'recommended_sound',
      'concert_festival_production',
      'sound_only',
      'all_event_packages',
      'other'
    ];
    known.forEach(id => ids.add(id));

    const result = [];
    ids.forEach(category_id => {
      if (!category_id) return;
      result.push({
        category_id,
        name: this._categoryIdToLabel(category_id),
        description: '',
        icon_name: category_id
      });
    });

    return result;
  }

  // ------------------------
  // 4. getEventPackageFilterOptions
  // ------------------------
  getEventPackageFilterOptions(category_id) {
    let packages = this._getFromStorage('event_packages', []).filter(p => p.is_active !== false);
    if (category_id && category_id !== 'all_event_packages') {
      packages = packages.filter(p => p.package_category_id === category_id);
    }

    const capacityMap = new Map();
    let minGuests = Infinity;
    let maxGuests = -Infinity;
    let minDuration = Infinity;
    let maxDuration = -Infinity;
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    const eventTypeMap = new Map();

    for (const p of packages) {
      if (p.capacity_label) {
        const key = p.capacity_label;
        if (!capacityMap.has(key)) {
          capacityMap.set(key, {
            label: p.capacity_label,
            min_guests: typeof p.min_guests === 'number' ? p.min_guests : null,
            max_guests: typeof p.max_guests === 'number' ? p.max_guests : null
          });
        }
      }
      if (typeof p.min_guests === 'number') minGuests = Math.min(minGuests, p.min_guests);
      if (typeof p.max_guests === 'number') maxGuests = Math.max(maxGuests, p.max_guests);
      if (typeof p.duration_hours === 'number') {
        minDuration = Math.min(minDuration, p.duration_hours);
        maxDuration = Math.max(maxDuration, p.duration_hours);
      }
      if (typeof p.base_price === 'number') {
        minPrice = Math.min(minPrice, p.base_price);
        maxPrice = Math.max(maxPrice, p.base_price);
      }
      if (p.event_type_code) {
        if (!eventTypeMap.has(p.event_type_code)) {
          eventTypeMap.set(p.event_type_code, {
            code: p.event_type_code,
            label: p.event_type_label || p.event_type_code
          });
        }
      }
    }

    const audience_ranges = Array.from(capacityMap.values());

    const event_types = Array.from(eventTypeMap.values());

    const duration_range_hours = {
      min: isFinite(minDuration) ? minDuration : 0,
      max: isFinite(maxDuration) ? maxDuration : 0
    };

    const price_range = {
      min: isFinite(minPrice) ? minPrice : 0,
      max: isFinite(maxPrice) ? maxPrice : 0
    };

    const rating_thresholds = [3, 4, 4.5, 5];

    const sort_options = [
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'rating_desc', label: 'Rating: High to Low' },
      { code: 'rating_asc', label: 'Rating: Low to High' }
    ];

    return {
      audience_ranges,
      event_types,
      duration_range_hours,
      price_range,
      rating_thresholds,
      sort_options
    };
  }

  // ------------------------
  // 5. listEventPackages
  // ------------------------
  listEventPackages(category_id, filters, sort_by) {
    let packages = this._getFromStorage('event_packages', []).filter(p => p.is_active !== false);

    if (category_id && category_id !== 'all_event_packages') {
      packages = packages.filter(p => p.package_category_id === category_id);
    }

    filters = filters || {};

    if (typeof filters.min_guests === 'number') {
      const minG = filters.min_guests;
      packages = packages.filter(p => {
        const maxGuests = typeof p.max_guests === 'number' ? p.max_guests : Infinity;
        return maxGuests >= minG;
      });
    }

    if (typeof filters.max_guests === 'number') {
      const maxG = filters.max_guests;
      packages = packages.filter(p => {
        const minGuests = typeof p.min_guests === 'number' ? p.min_guests : 0;
        return minGuests <= maxG;
      });
    }

    if (typeof filters.min_duration_hours === 'number') {
      const md = filters.min_duration_hours;
      packages = packages.filter(p => (p.duration_hours || 0) >= md);
    }

    if (typeof filters.max_duration_hours === 'number') {
      const md = filters.max_duration_hours;
      packages = packages.filter(p => (p.duration_hours || 0) <= md);
    }

    if (typeof filters.min_price === 'number') {
      packages = packages.filter(p => (p.base_price || 0) >= filters.min_price);
    }

    if (typeof filters.max_price === 'number') {
      packages = packages.filter(p => (p.base_price || 0) <= filters.max_price);
    }

    if (typeof filters.min_rating === 'number') {
      packages = packages.filter(p => (p.rating || 0) >= filters.min_rating);
    }

    if (filters.event_type_code) {
      packages = packages.filter(p => p.event_type_code === filters.event_type_code);
    }

    if (sort_by) {
      packages = this._sortArray(packages.map(p => ({ ...p, base_price: p.base_price })), sort_by);
    }

    const favoritedIds = new Set(this._getFavoriteIdsByType('event_package'));

    return packages.map(p => ({
      id: p.id,
      name: p.name,
      category_label: this._categoryIdToLabel(p.package_category_id),
      summary_text: p.summary_text || '',
      base_price: p.base_price,
      currency: p.currency || 'USD',
      rating: typeof p.rating === 'number' ? p.rating : null,
      capacity_label: p.capacity_label || '',
      min_guests: typeof p.min_guests === 'number' ? p.min_guests : null,
      max_guests: typeof p.max_guests === 'number' ? p.max_guests : null,
      duration_hours: typeof p.duration_hours === 'number' ? p.duration_hours : null,
      includes: Array.isArray(p.includes) ? p.includes : [],
      is_quote_only: !!p.is_quote_only,
      image_url: p.image_url || '',
      is_favorited: favoritedIds.has(p.id)
    }));
  }

  // ------------------------
  // 6. getEventPackageDetails
  // ------------------------
  getEventPackageDetails(package_id) {
    const packages = this._getFromStorage('event_packages', []);
    const pkg = packages.find(p => p.id === package_id);
    if (!pkg) return null;

    const services = this._getFromStorage('services', []);
    let service_name = '';
    if (pkg.service_id) {
      const svc = services.find(s => s.id === pkg.service_id || s.code === pkg.service_id);
      if (svc) service_name = svc.name;
    }

    const favoritedIds = new Set(this._getFavoriteIdsByType('event_package'));

    return {
      id: pkg.id,
      name: pkg.name,
      category_id: pkg.package_category_id,
      category_label: this._categoryIdToLabel(pkg.package_category_id),
      service_name,
      summary_text: pkg.summary_text || '',
      description: pkg.description || '',
      min_guests: typeof pkg.min_guests === 'number' ? pkg.min_guests : null,
      max_guests: typeof pkg.max_guests === 'number' ? pkg.max_guests : null,
      capacity_label: pkg.capacity_label || '',
      duration_hours: typeof pkg.duration_hours === 'number' ? pkg.duration_hours : null,
      base_price: pkg.base_price,
      currency: pkg.currency || 'USD',
      rating: typeof pkg.rating === 'number' ? pkg.rating : null,
      includes: Array.isArray(pkg.includes) ? pkg.includes : [],
      is_quote_only: !!pkg.is_quote_only,
      supports_addons: !!pkg.supports_addons,
      image_url: pkg.image_url || '',
      is_active: pkg.is_active !== false,
      is_favorited: favoritedIds.has(pkg.id)
    };
  }

  // ------------------------
  // 7. getPackageAddons
  // ------------------------
  getPackageAddons(package_id) {
    const packageAddons = this._getFromStorage('package_addons', []);
    const addonDefs = this._getFromStorage('addon_definitions', []);

    const relevant = packageAddons.filter(pa => pa.package_id === package_id);

    return relevant.map(pa => {
      const def = addonDefs.find(a => a.id === pa.addon_id) || {};
      return {
        addon_id: pa.addon_id,
        name: def.name || '',
        description: def.description || '',
        addon_type: def.addon_type || 'other',
        price_type: def.price_type || 'flat_fee',
        price: typeof def.price === 'number' ? def.price : 0,
        is_optional: !!pa.is_optional,
        is_default: !!pa.is_default
      };
    });
  }

  // ------------------------
  // 8. addEventPackageToCart
  // ------------------------
  addEventPackageToCart(package_id, event_date, quantity = 1, metadata) {
    if (!package_id || !event_date) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        message: 'package_id and event_date are required.',
        cart_summary: { item_count: 0, subtotal: 0, total: 0 }
      };
    }

    const packages = this._getFromStorage('event_packages', []);
    const pkg = packages.find(p => p.id === package_id && p.is_active !== false);
    if (!pkg) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        message: 'Event package not found or inactive.',
        cart_summary: { item_count: 0, subtotal: 0, total: 0 }
      };
    }

    if (pkg.is_quote_only) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: null,
        message: 'This package is quote-only and cannot be directly added to cart.',
        cart_summary: { item_count: 0, subtotal: 0, total: 0 }
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const cart_item_id = this._generateId('cartitem');
    const itemSubtotal = (pkg.base_price || 0) * quantity;

    const cartItem = {
      id: cart_item_id,
      cart_id: cart.id,
      item_type: 'event_package',
      item_id: pkg.id,
      name_snapshot: pkg.name,
      quantity: quantity,
      unit_price_snapshot: pkg.base_price || 0,
      subtotal: itemSubtotal,
      event_date: event_date,
      metadata: metadata ? JSON.stringify(metadata) : null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    // Update cart's items array
    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      const c = carts[idx];
      if (!Array.isArray(c.items)) c.items = [];
      c.items.push(cart_item_id);
      carts[idx] = c;
      this._saveToStorage('carts', carts);
    }

    const updatedCart = this._recalculateCartTotals(cart);
    const updatedItems = this._getFromStorage('cart_items', []).filter(ci => ci.cart_id === updatedCart.id);

    return {
      success: true,
      cart_id: updatedCart.id,
      cart_item_id,
      message: 'Event package added to cart.',
      cart_summary: {
        item_count: updatedItems.length,
        subtotal: updatedCart.subtotal,
        total: updatedCart.total
      }
    };
  }

  // ------------------------
  // 9. getServices
  // ------------------------
  getServices() {
    const services = this._getFromStorage('services', []);
    return services.filter(s => s.is_active !== false).map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description || '',
      is_active: s.is_active !== false
    }));
  }

  // ------------------------
  // 10. getServicePackages
  // ------------------------
  getServicePackages(service_id, filters, sort_by) {
    const services = this._getFromStorage('services', []);
    const service = services.find(s => s.id === service_id);

    const serviceCode = service ? service.code : service_id;

    let packages = this._getFromStorage('event_packages', []).filter(p => {
      if (p.is_active === false) return false;
      // Match either by exact service_id or by code
      return p.service_id === service_id || p.service_id === serviceCode;
    });

    // If no explicit packages are linked to this service, generate a generic one
    if (packages.length === 0 && service) {
      const allPackages = this._getFromStorage('event_packages', []);
      const existingForService = allPackages.filter(
        p => p.service_id === service.id || p.service_id === service.code
      );
      if (existingForService.length > 0) {
        packages = existingForService;
      } else {
        const nowIso = new Date().toISOString();
        const generated = {
          id: this._generateId('eventpkg'),
          name: service.name + ' - Standard Production Package',
          package_category_id: 'concert_festival_production',
          service_id: service.code || service.id,
          summary_text: service.description || '',
          description: service.description || '',
          min_guests: 500,
          max_guests: 2000,
          capacity_label: 'Up to 2,000 attendees',
          duration_hours: 8,
          base_price: 4500,
          currency: 'USD',
          rating: 4.7,
          includes: [],
          is_quote_only: true,
          supports_addons: true,
          image_url: service.image || '',
          is_active: true,
          created_at: nowIso,
          updated_at: nowIso
        };
        allPackages.push(generated);
        this._saveToStorage('event_packages', allPackages);
        packages = [generated];
      }
    }

    filters = filters || {};

    if (typeof filters.min_attendees === 'number') {
      const minA = filters.min_attendees;
      packages = packages.filter(p => (typeof p.max_guests === 'number' ? p.max_guests : Infinity) >= minA);
    }

    if (typeof filters.max_attendees === 'number') {
      const maxA = filters.max_attendees;
      packages = packages.filter(p => (typeof p.min_guests === 'number' ? p.min_guests : 0) <= maxA);
    }

    if (typeof filters.min_price === 'number') {
      packages = packages.filter(p => (p.base_price || 0) >= filters.min_price);
    }

    if (typeof filters.max_price === 'number') {
      packages = packages.filter(p => (p.base_price || 0) <= filters.max_price);
    }

    if (sort_by) {
      packages = this._sortArray(packages.map(p => ({ ...p, base_price: p.base_price })), sort_by);
    }

    return packages.map(p => ({
      id: p.id,
      name: p.name,
      summary_text: p.summary_text || '',
      base_price: p.base_price,
      currency: p.currency || 'USD',
      min_guests: typeof p.min_guests === 'number' ? p.min_guests : null,
      max_guests: typeof p.max_guests === 'number' ? p.max_guests : null,
      capacity_label: p.capacity_label || '',
      rating: typeof p.rating === 'number' ? p.rating : null,
      is_quote_only: !!p.is_quote_only,
      image_url: p.image_url || ''
    }));
  }

  // ------------------------
  // 11. submitQuoteRequest
  // ------------------------
  submitQuoteRequest(package_id, selected_addon_ids, event_name, event_date, expected_attendance, city, phone, contact_preference) {
    const packages = this._getFromStorage('event_packages', []);
    const pkg = packages.find(p => p.id === package_id && p.is_active !== false);
    if (!pkg) {
      return {
        quote_request_id: null,
        status: 'error',
        created_at: new Date().toISOString(),
        message: 'Package not found.'
      };
    }

    const quote_requests = this._getFromStorage('quote_requests', []);
    const id = this._generateId('quote');

    const qr = {
      id,
      package_id: package_id,
      selected_addon_ids: Array.isArray(selected_addon_ids) ? selected_addon_ids : [],
      event_name,
      event_date: event_date,
      expected_attendance,
      city,
      phone,
      contact_preference: contact_preference === 'phone' ? 'phone' : 'email',
      status: 'submitted',
      created_at: new Date().toISOString()
    };

    quote_requests.push(qr);
    this._saveToStorage('quote_requests', quote_requests);

    return {
      quote_request_id: id,
      status: qr.status,
      created_at: qr.created_at,
      message: 'Quote request submitted.'
    };
  }

  // ------------------------
  // 12. getQuoteRequestSummary
  // ------------------------
  getQuoteRequestSummary(package_id, selected_addon_ids) {
    const packages = this._getFromStorage('event_packages', []);
    const pkg = packages.find(p => p.id === package_id);
    if (!pkg) {
      return {
        package: null,
        selected_addons: []
      };
    }

    const packageSummary = {
      id: pkg.id,
      name: pkg.name,
      summary_text: pkg.summary_text || '',
      base_price: pkg.base_price,
      currency: pkg.currency || 'USD',
      capacity_label: pkg.capacity_label || ''
    };

    const addons = this._getFromStorage('addon_definitions', []);
    const selected = Array.isArray(selected_addon_ids) ? selected_addon_ids : [];

    const selected_addons = addons
      .filter(a => selected.indexOf(a.id) !== -1)
      .map(a => ({
        addon_id: a.id,
        name: a.name,
        addon_type: a.addon_type || 'other',
        price_type: a.price_type || 'flat_fee',
        price: typeof a.price === 'number' ? a.price : 0
      }));

    return {
      package: packageSummary,
      selected_addons
    };
  }

  // ------------------------
  // 13. addFavoriteItem
  // ------------------------
  addFavoriteItem(item_type, item_id) {
    const favoriteList = this._getOrCreateFavoriteList();
    let favoriteItems = this._getFromStorage('favorite_items', []);

    const existing = favoriteItems.find(
      fi => fi.favorite_list_id === favoriteList.id && fi.item_type === item_type && fi.item_id === item_id
    );

    if (existing) {
      const total = favoriteItems.filter(fi => fi.favorite_list_id === favoriteList.id).length;
      return {
        favorite_item_id: existing.id,
        success: true,
        message: 'Item already in favorites.',
        total_favorites: total
      };
    }

    const favorite_item_id = this._generateId('favoriteitem');
    const fi = {
      id: favorite_item_id,
      favorite_list_id: favoriteList.id,
      item_type,
      item_id,
      added_at: new Date().toISOString()
    };

    favoriteItems.push(fi);
    this._saveToStorage('favorite_items', favoriteItems);

    // Update list.items
    let lists = this._getFromStorage('favorite_lists', []);
    const idx = lists.findIndex(l => l.id === favoriteList.id);
    if (idx !== -1) {
      const l = lists[idx];
      if (!Array.isArray(l.items)) l.items = [];
      l.items.push(favorite_item_id);
      l.updated_at = new Date().toISOString();
      lists[idx] = l;
      this._saveToStorage('favorite_lists', lists);
    }

    const total = favoriteItems.filter(fi => fi.favorite_list_id === favoriteList.id).length;
    return {
      favorite_item_id,
      success: true,
      message: 'Added to favorites.',
      total_favorites: total
    };
  }

  // ------------------------
  // 14. removeFavoriteItem
  // ------------------------
  removeFavoriteItem(favorite_item_id) {
    let favoriteItems = this._getFromStorage('favorite_items', []);
    const item = favoriteItems.find(fi => fi.id === favorite_item_id);
    if (!item) {
      const total = favoriteItems.length;
      return {
        success: false,
        message: 'Favorite item not found.',
        total_favorites: total
      };
    }

    favoriteItems = favoriteItems.filter(fi => fi.id !== favorite_item_id);
    this._saveToStorage('favorite_items', favoriteItems);

    // Update list.items
    let lists = this._getFromStorage('favorite_lists', []);
    const listIdx = lists.findIndex(l => l.id === item.favorite_list_id);
    if (listIdx !== -1) {
      const l = lists[listIdx];
      if (Array.isArray(l.items)) {
        l.items = l.items.filter(id => id !== favorite_item_id);
      }
      l.updated_at = new Date().toISOString();
      lists[listIdx] = l;
      this._saveToStorage('favorite_lists', lists);
    }

    const total = favoriteItems.filter(fi => fi.favorite_list_id === item.favorite_list_id).length;
    return {
      success: true,
      message: 'Favorite item removed.',
      total_favorites: total
    };
  }

  // ------------------------
  // 15. getFavoriteList (with foreign key resolution)
  // ------------------------
  getFavoriteList() {
    const favoriteList = this._getOrCreateFavoriteList();
    const favoriteItems = this._getFromStorage('favorite_items', []).filter(
      fi => fi.favorite_list_id === favoriteList.id
    );

    const eventPackages = this._getFromStorage('event_packages', []);
    const shopProducts = this._getFromStorage('shop_products', []);
    const rentalItems = this._getFromStorage('rental_items', []);
    const studioRooms = this._getFromStorage('studio_rooms', []);
    const blogArticles = this._getFromStorage('blog_articles', []);

    const items = favoriteItems.map(fi => {
      let underlying = null;
      let display = {
        title: '',
        subtitle: '',
        image_url: '',
        price: null,
        price_label: '',
        rating: null
      };

      if (fi.item_type === 'event_package') {
        underlying = eventPackages.find(p => p.id === fi.item_id) || null;
        if (underlying) {
          display.title = underlying.name || '';
          display.subtitle = underlying.capacity_label || '';
          display.image_url = underlying.image_url || '';
          display.price = underlying.base_price || 0;
          display.price_label = (underlying.currency || 'USD') + ' ' + (underlying.base_price || 0);
          display.rating = underlying.rating || null;
        }
      } else if (fi.item_type === 'shop_product') {
        underlying = shopProducts.find(p => p.id === fi.item_id) || null;
        if (underlying) {
          display.title = underlying.name || '';
          display.subtitle = this._productTypeToLabel(underlying.product_type) || '';
          display.image_url = underlying.image_url || '';
          display.price = underlying.price || 0;
          display.price_label = (underlying.currency || 'USD') + ' ' + (underlying.price || 0);
          display.rating = underlying.rating || null;
        }
      } else if (fi.item_type === 'rental_item') {
        underlying = rentalItems.find(r => r.id === fi.item_id) || null;
        if (underlying) {
          display.title = underlying.name || '';
          display.subtitle = this._rentalCategoryIdToLabel(underlying.rental_category_id) || '';
          display.image_url = underlying.image_url || '';
          display.price = underlying.daily_price || 0;
          display.price_label = 'Per day: ' + (underlying.daily_price || 0);
          display.rating = underlying.rating || null;
        }
      } else if (fi.item_type === 'studio_room') {
        underlying = studioRooms.find(r => r.id === fi.item_id) || null;
        if (underlying) {
          display.title = underlying.name || '';
          display.subtitle = underlying.capacity_label || '';
          display.image_url = underlying.image_url || '';
          display.price = underlying.hourly_rate || 0;
          display.price_label = 'Per hour: ' + (underlying.hourly_rate || 0);
          display.rating = underlying.rating || null;
        }
      } else if (fi.item_type === 'blog_article') {
        underlying = blogArticles.find(b => b.id === fi.item_id) || null;
        if (underlying) {
          display.title = underlying.title || '';
          display.subtitle = underlying.excerpt || '';
          display.image_url = '';
          display.price = null;
          display.price_label = '';
          display.rating = null;
        }
      }

      return {
        favorite_item_id: fi.id,
        item_type: fi.item_type,
        item_id: fi.item_id,
        added_at: fi.added_at,
        display,
        // Foreign key resolution: include full underlying item as `item`
        item: underlying
      };
    });

    return {
      favorite_list_id: favoriteList.id,
      items
    };
  }

  // ------------------------
  // 16. getRentalCategories
  // ------------------------
  getRentalCategories() {
    const items = this._getFromStorage('rental_items', []).filter(i => i.is_active !== false);
    const ids = new Set(items.map(i => i.rental_category_id));
    const result = [];
    ids.forEach(category_id => {
      if (!category_id) return;
      result.push({
        category_id,
        name: this._rentalCategoryIdToLabel(category_id),
        description: '',
        icon_name: category_id
      });
    });
    return result;
  }

  // ------------------------
  // 17. getRentalFilterOptions
  // ------------------------
  getRentalFilterOptions(category_id) {
    let items = this._getFromStorage('rental_items', []).filter(i => i.is_active !== false);
    items = items.filter(i => i.rental_category_id === category_id);

    const microphoneMap = new Map();
    const speakerMap = new Map();

    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const it of items) {
      if (it.microphone_type) {
        if (!microphoneMap.has(it.microphone_type)) {
          microphoneMap.set(it.microphone_type, {
            code: it.microphone_type,
            label: it.microphone_type
          });
        }
      }
      if (it.speaker_type) {
        if (!speakerMap.has(it.speaker_type)) {
          speakerMap.set(it.speaker_type, {
            code: it.speaker_type,
            label: it.speaker_type
          });
        }
      }
      if (typeof it.daily_price === 'number') {
        minPrice = Math.min(minPrice, it.daily_price);
        maxPrice = Math.max(maxPrice, it.daily_price);
      }
    }

    const price_range = {
      min: isFinite(minPrice) ? minPrice : 0,
      max: isFinite(maxPrice) ? maxPrice : 0
    };

    const rating_thresholds = [3, 4, 4.5, 5];

    const sort_options = [
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'rating_desc', label: 'Rating: High to Low' }
    ];

    return {
      microphone_types: Array.from(microphoneMap.values()),
      speaker_types: Array.from(speakerMap.values()),
      price_range,
      rating_thresholds,
      sort_options
    };
  }

  // ------------------------
  // 18. listRentalItems
  // ------------------------
  listRentalItems(category_id, filters, sort_by) {
    let items = this._getFromStorage('rental_items', []).filter(i => i.is_active !== false);
    items = items.filter(i => i.rental_category_id === category_id);

    filters = filters || {};

    if (filters.microphone_type) {
      items = items.filter(i => i.microphone_type === filters.microphone_type);
    }

    if (filters.speaker_type) {
      items = items.filter(i => i.speaker_type === filters.speaker_type);
    }

    if (typeof filters.min_rating === 'number') {
      items = items.filter(i => (i.rating || 0) >= filters.min_rating);
    }

    if (typeof filters.max_daily_price === 'number') {
      items = items.filter(i => (i.daily_price || 0) <= filters.max_daily_price);
    }

    if (sort_by) {
      items = this._sortArray(items.map(i => ({ ...i, daily_price: i.daily_price })), sort_by);
    }

    return items.map(i => ({
      id: i.id,
      name: i.name,
      category_label: this._rentalCategoryIdToLabel(i.rental_category_id),
      daily_price: i.daily_price,
      rating: typeof i.rating === 'number' ? i.rating : null,
      short_specs: i.specs ? String(i.specs).slice(0, 140) : '',
      image_url: i.image_url || ''
    }));
  }

  // ------------------------
  // 19. getRentalItemDetails
  // ------------------------
  getRentalItemDetails(rental_item_id) {
    const items = this._getFromStorage('rental_items', []);
    const it = items.find(r => r.id === rental_item_id);
    if (!it) return null;

    return {
      id: it.id,
      name: it.name,
      rental_category_id: it.rental_category_id,
      category_label: this._rentalCategoryIdToLabel(it.rental_category_id),
      microphone_type: it.microphone_type || null,
      speaker_type: it.speaker_type || null,
      daily_price: it.daily_price,
      rating: typeof it.rating === 'number' ? it.rating : null,
      description: it.description || '',
      specs: it.specs || '',
      image_url: it.image_url || '',
      is_active: it.is_active !== false
    };
  }

  // ------------------------
  // 20. addRentalItemToList
  // ------------------------
  addRentalItemToList(rental_item_id, quantity, start_date, end_date) {
    if (!rental_item_id || !start_date || !end_date) {
      return {
        rental_list_id: null,
        rental_list_item_id: null,
        success: false,
        message: 'rental_item_id, start_date, and end_date are required.',
        rental_list_summary: { item_count: 0, estimated_total: 0 }
      };
    }

    const rentalItems = this._getFromStorage('rental_items', []);
    const item = rentalItems.find(r => r.id === rental_item_id && r.is_active !== false);
    if (!item) {
      return {
        rental_list_id: null,
        rental_list_item_id: null,
        success: false,
        message: 'Rental item not found or inactive.',
        rental_list_summary: { item_count: 0, estimated_total: 0 }
      };
    }

    const rentalList = this._getOrCreateRentalList();
    let rentalListItems = this._getFromStorage('rental_list_items', []);

    const rental_list_item_id = this._generateId('rentallistitem');
    const daily_price_snapshot = item.daily_price || 0;
    const subtotal = this._calculateRentalItemSubtotal(daily_price_snapshot, quantity, start_date, end_date);

    const rli = {
      id: rental_list_item_id,
      rental_list_id: rentalList.id,
      rental_item_id: rental_item_id,
      quantity,
      start_date,
      end_date,
      daily_price_snapshot,
      subtotal
    };

    rentalListItems.push(rli);
    this._saveToStorage('rental_list_items', rentalListItems);

    // Update list.items
    const lists = this._getFromStorage('rental_lists', []);
    const idx = lists.findIndex(l => l.id === rentalList.id);
    if (idx !== -1) {
      const l = lists[idx];
      if (!Array.isArray(l.items)) l.items = [];
      l.items.push(rental_list_item_id);
      lists[idx] = l;
      this._saveToStorage('rental_lists', lists);
    }

    const updatedList = this._recalculateRentalListTotals(rentalList);
    const updatedItems = this._getFromStorage('rental_list_items', []).filter(
      i => i.rental_list_id === updatedList.id
    );

    return {
      rental_list_id: updatedList.id,
      rental_list_item_id,
      success: true,
      message: 'Rental item added to list.',
      rental_list_summary: {
        item_count: updatedItems.length,
        estimated_total: updatedList.estimated_total
      }
    };
  }

  // ------------------------
  // 21. getRentalList (with foreign key resolution)
  // ------------------------
  getRentalList() {
    const list = this._getOrCreateRentalList();
    const rentalListItems = this._getFromStorage('rental_list_items', []).filter(
      i => i.rental_list_id === list.id
    );
    const rentalItems = this._getFromStorage('rental_items', []);

    const items = rentalListItems.map(i => {
      const rental_item = rentalItems.find(r => r.id === i.rental_item_id) || null;
      return {
        rental_list_item_id: i.id,
        rental_item_id: i.rental_item_id,
        name: rental_item ? rental_item.name : '',
        quantity: i.quantity,
        start_date: i.start_date,
        end_date: i.end_date,
        daily_price: i.daily_price_snapshot,
        subtotal: i.subtotal,
        image_url: rental_item ? (rental_item.image_url || '') : '',
        // Foreign key resolution
        rental_item
      };
    });

    const updatedList = this._recalculateRentalListTotals(list);

    return {
      rental_list_id: updatedList.id,
      items,
      estimated_total: updatedList.estimated_total || 0
    };
  }

  // ------------------------
  // 22. updateRentalListItem
  // ------------------------
  updateRentalListItem(rental_list_item_id, quantity, start_date, end_date) {
    let items = this._getFromStorage('rental_list_items', []);
    const idx = items.findIndex(i => i.id === rental_list_item_id);
    if (idx === -1) {
      return {
        success: false,
        message: 'Rental list item not found.',
        updated_item: null,
        estimated_total: 0
      };
    }

    const item = items[idx];
    if (typeof quantity === 'number') {
      item.quantity = quantity;
    }
    if (start_date) {
      item.start_date = start_date;
    }
    if (end_date) {
      item.end_date = end_date;
    }

    item.subtotal = this._calculateRentalItemSubtotal(
      item.daily_price_snapshot,
      item.quantity,
      item.start_date,
      item.end_date
    );

    items[idx] = item;
    this._saveToStorage('rental_list_items', items);

    const lists = this._getFromStorage('rental_lists', []);
    const list = lists.find(l => l.id === item.rental_list_id);
    const updatedList = list ? this._recalculateRentalListTotals(list) : { estimated_total: 0 };

    return {
      success: true,
      message: 'Rental list item updated.',
      updated_item: {
        rental_list_item_id: item.id,
        quantity: item.quantity,
        start_date: item.start_date,
        end_date: item.end_date,
        subtotal: item.subtotal
      },
      estimated_total: updatedList.estimated_total || 0
    };
  }

  // ------------------------
  // 23. removeRentalListItem
  // ------------------------
  removeRentalListItem(rental_list_item_id) {
    let items = this._getFromStorage('rental_list_items', []);
    const item = items.find(i => i.id === rental_list_item_id);
    if (!item) {
      return {
        success: false,
        message: 'Rental list item not found.',
        estimated_total: 0
      };
    }

    items = items.filter(i => i.id !== rental_list_item_id);
    this._saveToStorage('rental_list_items', items);

    let lists = this._getFromStorage('rental_lists', []);
    const listIdx = lists.findIndex(l => l.id === item.rental_list_id);
    let estimated_total = 0;
    if (listIdx !== -1) {
      const l = lists[listIdx];
      if (Array.isArray(l.items)) {
        l.items = l.items.filter(id => id !== rental_list_item_id);
      }
      lists[listIdx] = l;
      this._saveToStorage('rental_lists', lists);
      const updated = this._recalculateRentalListTotals(l);
      estimated_total = updated.estimated_total || 0;
    }

    return {
      success: true,
      message: 'Rental list item removed.',
      estimated_total
    };
  }

  // ------------------------
  // 24. getRoomCategories
  // ------------------------
  getRoomCategories() {
    const rooms = this._getFromStorage('studio_rooms', []).filter(r => r.is_active !== false);
    const ids = new Set(rooms.map(r => r.room_category_id));
    const result = [];
    ids.forEach(category_id => {
      if (!category_id) return;
      result.push({
        category_id,
        name: this._roomCategoryIdToLabel(category_id),
        description: '',
        icon_name: category_id
      });
    });
    return result;
  }

  // ------------------------
  // 25. getRoomFilterOptions
  // ------------------------
  getRoomFilterOptions(category_id) {
    let rooms = this._getFromStorage('studio_rooms', []).filter(r => r.is_active !== false);
    rooms = rooms.filter(r => r.room_category_id === category_id);

    const capacityMap = new Map();
    for (const r of rooms) {
      if (r.capacity_label) {
        const key = r.capacity_label;
        if (!capacityMap.has(key)) {
          capacityMap.set(key, {
            label: r.capacity_label,
            min_musicians: typeof r.capacity_min_musicians === 'number' ? r.capacity_min_musicians : null,
            max_musicians: typeof r.capacity_max_musicians === 'number' ? r.capacity_max_musicians : null
          });
        }
      }
    }

    const rating_thresholds = [3, 4, 4.5, 5];

    const sort_options = [
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'rating_desc', label: 'Rating: High to Low' }
    ];

    return {
      capacity_ranges: Array.from(capacityMap.values()),
      rating_thresholds,
      sort_options
    };
  }

  // ------------------------
  // 26. listStudioRooms
  // ------------------------
  listStudioRooms(category_id, filters, sort_by) {
    let rooms = this._getFromStorage('studio_rooms', []).filter(r => r.is_active !== false);
    rooms = rooms.filter(r => r.room_category_id === category_id);

    filters = filters || {};

    if (typeof filters.min_musicians === 'number' && typeof filters.max_musicians === 'number') {
      const minM = filters.min_musicians;
      const maxM = filters.max_musicians;
      rooms = rooms.filter(r => {
        const capMin = typeof r.capacity_min_musicians === 'number' ? r.capacity_min_musicians : 0;
        const capMax = typeof r.capacity_max_musicians === 'number' ? r.capacity_max_musicians : Infinity;
        // Room must fully accommodate the requested musician range
        return capMin <= minM && capMax >= maxM;
      });
    } else {
      if (typeof filters.min_musicians === 'number') {
        const minM = filters.min_musicians;
        rooms = rooms.filter(r => (r.capacity_max_musicians || Infinity) >= minM);
      }

      if (typeof filters.max_musicians === 'number') {
        const maxM = filters.max_musicians;
        rooms = rooms.filter(r => (r.capacity_min_musicians || 0) <= maxM);
      }
    }

    if (typeof filters.min_rating === 'number') {
      rooms = rooms.filter(r => (r.rating || 0) >= filters.min_rating);
    }

    if (sort_by) {
      rooms = this._sortArray(rooms.map(r => ({ ...r, base_price: r.hourly_rate })), sort_by);
    }

    return rooms.map(r => ({
      id: r.id,
      name: r.name,
      capacity_label: r.capacity_label || '',
      capacity_min_musicians: typeof r.capacity_min_musicians === 'number' ? r.capacity_min_musicians : null,
      capacity_max_musicians: typeof r.capacity_max_musicians === 'number' ? r.capacity_max_musicians : null,
      hourly_rate: r.hourly_rate,
      rating: typeof r.rating === 'number' ? r.rating : null,
      image_url: r.image_url || ''
    }));
  }

  // ------------------------
  // 27. getStudioRoomDetails
  // ------------------------
  getStudioRoomDetails(room_id) {
    const rooms = this._getFromStorage('studio_rooms', []);
    const r = rooms.find(room => room.id === room_id);
    if (!r) return null;

    return {
      id: r.id,
      name: r.name,
      room_category_id: r.room_category_id,
      capacity_min_musicians: typeof r.capacity_min_musicians === 'number' ? r.capacity_min_musicians : null,
      capacity_max_musicians: typeof r.capacity_max_musicians === 'number' ? r.capacity_max_musicians : null,
      capacity_label: r.capacity_label || '',
      rating: typeof r.rating === 'number' ? r.rating : null,
      hourly_rate: r.hourly_rate,
      description: r.description || '',
      equipment: Array.isArray(r.equipment) ? r.equipment : [],
      image_url: r.image_url || '',
      is_active: r.is_active !== false
    };
  }

  // ------------------------
  // 28. createRoomBooking
  // ------------------------
  createRoomBooking(room_id, time_slots, number_of_musicians, contact_name, contact_email, contact_phone, payment_method) {
    const rooms = this._getFromStorage('studio_rooms', []);
    const room = rooms.find(r => r.id === room_id && r.is_active !== false);
    if (!room) {
      return {
        booking_id: null,
        status: 'error',
        room_name: '',
        time_slots: [],
        number_of_musicians: 0,
        total_estimated_cost: 0,
        message: 'Room not found or inactive.'
      };
    }

    const bookings = this._getFromStorage('room_bookings', []);
    const booking_id = this._generateId('roombooking');

    // Calculate cost based on hourly_rate and time_slots
    let totalHours = 0;
    if (Array.isArray(time_slots)) {
      for (const slot of time_slots) {
        if (!slot || !slot.start_time || !slot.end_time) continue;
        const [sh, sm] = slot.start_time.split(':').map(x => parseInt(x, 10) || 0);
        const [eh, em] = slot.end_time.split(':').map(x => parseInt(x, 10) || 0);
        const hours = (eh + em / 60) - (sh + sm / 60);
        if (hours > 0) totalHours += hours;
      }
    }
    const total_estimated_cost = (room.hourly_rate || 0) * totalHours;

    const booking = {
      id: booking_id,
      room_id,
      time_slots: Array.isArray(time_slots) ? time_slots : [],
      number_of_musicians,
      contact_name,
      contact_email,
      contact_phone,
      payment_method,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    bookings.push(booking);
    this._saveToStorage('room_bookings', bookings);

    return {
      booking_id,
      status: booking.status,
      room_name: room.name,
      time_slots: booking.time_slots,
      number_of_musicians,
      total_estimated_cost,
      message: 'Room booking created.'
    };
  }

  // ------------------------
  // 29. getShopCategories
  // ------------------------
  getShopCategories() {
    const products = this._getFromStorage('shop_products', []).filter(p => p.is_active !== false);
    const ids = new Set(products.map(p => p.category_id));
    const result = [];
    ids.forEach(category_id => {
      if (!category_id) return;
      result.push({
        category_id,
        name: this._shopCategoryIdToLabel(category_id),
        description: '',
        icon_name: category_id
      });
    });
    return result;
  }

  // ------------------------
  // 30. getShopFilterOptions
  // ------------------------
  getShopFilterOptions(category_id) {
    let products = this._getFromStorage('shop_products', []).filter(p => p.is_active !== false);
    products = products.filter(p => p.category_id === category_id);

    const typeMap = new Map();
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    for (const p of products) {
      if (p.product_type) {
        if (!typeMap.has(p.product_type)) {
          typeMap.set(p.product_type, {
            code: p.product_type,
            label: this._productTypeToLabel(p.product_type)
          });
        }
      }
      if (typeof p.price === 'number') {
        minPrice = Math.min(minPrice, p.price);
        maxPrice = Math.max(maxPrice, p.price);
      }
    }

    const price_range = {
      min: isFinite(minPrice) ? minPrice : 0,
      max: isFinite(maxPrice) ? maxPrice : 0
    };

    const rating_thresholds = [3, 4, 4.5, 5];

    const sort_options = [
      { code: 'price_asc', label: 'Price: Low to High' },
      { code: 'price_desc', label: 'Price: High to Low' },
      { code: 'rating_desc', label: 'Rating: High to Low' }
    ];

    return {
      product_types: Array.from(typeMap.values()),
      price_range,
      rating_thresholds,
      sort_options
    };
  }

  // ------------------------
  // 31. listShopProducts
  // ------------------------
  listShopProducts(category_id, filters, sort_by) {
    let products = this._getFromStorage('shop_products', []).filter(p => p.is_active !== false);
    products = products.filter(p => p.category_id === category_id);

    filters = filters || {};

    if (filters.product_type) {
      products = products.filter(p => p.product_type === filters.product_type);
    }
    if (typeof filters.min_price === 'number') {
      products = products.filter(p => (p.price || 0) >= filters.min_price);
    }
    if (typeof filters.max_price === 'number') {
      products = products.filter(p => (p.price || 0) <= filters.max_price);
    }
    if (typeof filters.min_rating === 'number') {
      products = products.filter(p => (p.rating || 0) >= filters.min_rating);
    }

    if (sort_by) {
      products = this._sortArray(products.map(p => ({ ...p, price: p.price })), sort_by);
    }

    return products.map(p => ({
      id: p.id,
      name: p.name,
      product_type_label: this._productTypeToLabel(p.product_type),
      price: p.price,
      rating: typeof p.rating === 'number' ? p.rating : null,
      image_url: p.image_url || '',
      short_description: p.description ? String(p.description).slice(0, 140) : '',
      stock_quantity: typeof p.stock_quantity === 'number' ? p.stock_quantity : null
    }));
  }

  // ------------------------
  // 32. getShopProductDetails
  // ------------------------
  getShopProductDetails(product_id) {
    const products = this._getFromStorage('shop_products', []);
    const p = products.find(prod => prod.id === product_id);
    if (!p) return null;

    return {
      id: p.id,
      name: p.name,
      category_id: p.category_id,
      category_label: this._shopCategoryIdToLabel(p.category_id),
      product_type: p.product_type,
      price: p.price,
      rating: typeof p.rating === 'number' ? p.rating : null,
      description: p.description || '',
      specs: p.specs || '',
      image_url: p.image_url || '',
      stock_quantity: typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
      is_active: p.is_active !== false
    };
  }

  // ------------------------
  // 33. addShopProductToCart
  // ------------------------
  addShopProductToCart(product_id, quantity) {
    if (!product_id) {
      return {
        cart_id: null,
        cart_item_id: null,
        success: false,
        message: 'product_id is required.',
        cart_summary: { item_count: 0, subtotal: 0, total: 0 }
      };
    }

    const products = this._getFromStorage('shop_products', []);
    const product = products.find(p => p.id === product_id && p.is_active !== false);
    if (!product) {
      return {
        cart_id: null,
        cart_item_id: null,
        success: false,
        message: 'Product not found or inactive.',
        cart_summary: { item_count: 0, subtotal: 0, total: 0 }
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const cart_item_id = this._generateId('cartitem');
    const unitPrice = product.price || 0;
    const subtotal = unitPrice * quantity;

    const cartItem = {
      id: cart_item_id,
      cart_id: cart.id,
      item_type: 'shop_product',
      item_id: product.id,
      name_snapshot: product.name,
      quantity,
      unit_price_snapshot: unitPrice,
      subtotal,
      event_date: null,
      metadata: null
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    // Update cart.items
    const carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      const c = carts[idx];
      if (!Array.isArray(c.items)) c.items = [];
      c.items.push(cart_item_id);
      carts[idx] = c;
      this._saveToStorage('carts', carts);
    }

    const updatedCart = this._recalculateCartTotals(cart);
    const updatedItems = this._getFromStorage('cart_items', []).filter(ci => ci.cart_id === updatedCart.id);

    return {
      cart_id: updatedCart.id,
      cart_item_id,
      success: true,
      message: 'Product added to cart.',
      cart_summary: {
        item_count: updatedItems.length,
        subtotal: updatedCart.subtotal,
        total: updatedCart.total
      }
    };
  }

  // ------------------------
  // 34. getRelatedShopProducts
  // ------------------------
  getRelatedShopProducts(product_id) {
    const products = this._getFromStorage('shop_products', []).filter(p => p.is_active !== false);
    const base = products.find(p => p.id === product_id);
    if (!base) return [];

    let related = products.filter(p => p.id !== base.id && p.category_id === base.category_id);
    if (related.length === 0) {
      related = products.filter(p => p.id !== base.id && p.product_type === base.product_type);
    }

    related = related.slice(0, 4);

    return related.map(p => ({
      id: p.id,
      name: p.name,
      product_type_label: this._productTypeToLabel(p.product_type),
      price: p.price,
      image_url: p.image_url || ''
    }));
  }

  // ------------------------
  // 35. getCart (with foreign key resolution)
  // ------------------------
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []).filter(ci => ci.cart_id === cart.id);

    const eventPackages = this._getFromStorage('event_packages', []);
    const shopProducts = this._getFromStorage('shop_products', []);
    const shippingOptions = this._getFromStorage('shipping_options', []);

    const items = cartItems.map(ci => {
      let item = null;
      if (ci.item_type === 'event_package') {
        item = eventPackages.find(p => p.id === ci.item_id) || null;
      } else if (ci.item_type === 'shop_product') {
        item = shopProducts.find(p => p.id === ci.item_id) || null;
      }

      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        item_id: ci.item_id,
        name: ci.name_snapshot,
        quantity: ci.quantity,
        unit_price: ci.unit_price_snapshot,
        subtotal: ci.subtotal,
        event_date: ci.event_date || null,
        // Foreign key resolution
        item
      };
    });

    const updatedCart = this._recalculateCartTotals(cart);

    let shipping_option = null;
    if (updatedCart.shipping_option_id) {
      shipping_option = shippingOptions.find(o => o.id === updatedCart.shipping_option_id) || null;
    }

    return {
      cart_id: updatedCart.id,
      promo_code: updatedCart.promo_code,
      shipping_option_id: updatedCart.shipping_option_id,
      shipping_option,
      items,
      subtotal: updatedCart.subtotal,
      discount_total: updatedCart.discount_total,
      shipping_cost: updatedCart.shipping_cost,
      total: updatedCart.total
    };
  }

  // ------------------------
  // 36. updateCartItem
  // ------------------------
  updateCartItem(cart_item_id, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cart_item_id);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: { subtotal: 0, discount_total: 0, shipping_cost: 0, total: 0 }
      };
    }

    const ci = cartItems[idx];
    ci.quantity = quantity;
    ci.subtotal = (ci.unit_price_snapshot || 0) * quantity;
    cartItems[idx] = ci;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === ci.cart_id) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item updated.',
      cart: {
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      }
    };
  }

  // ------------------------
  // 37. removeCartItem
  // ------------------------
  removeCartItem(cart_item_id) {
    let cartItems = this._getFromStorage('cart_items', []);
    const ci = cartItems.find(i => i.id === cart_item_id);
    if (!ci) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: { subtotal: 0, discount_total: 0, shipping_cost: 0, total: 0 }
      };
    }

    cartItems = cartItems.filter(i => i.id !== cart_item_id);
    this._saveToStorage('cart_items', cartItems);

    let carts = this._getFromStorage('carts', []);
    const cartIdx = carts.findIndex(c => c.id === ci.cart_id);
    let updatedCart;
    if (cartIdx !== -1) {
      const cart = carts[cartIdx];
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== cart_item_id);
      }
      carts[cartIdx] = cart;
      this._saveToStorage('carts', carts);
      updatedCart = this._recalculateCartTotals(cart);
    } else {
      updatedCart = { subtotal: 0, discount_total: 0, shipping_cost: 0, total: 0 };
    }

    return {
      success: true,
      message: 'Cart item removed.',
      cart: {
        subtotal: updatedCart.subtotal || 0,
        discount_total: updatedCart.discount_total || 0,
        shipping_cost: updatedCart.shipping_cost || 0,
        total: updatedCart.total || 0
      }
    };
  }

  // ------------------------
  // 38. getShippingOptions
  // ------------------------
  getShippingOptions() {
    const opts = this._getFromStorage('shipping_options', []);
    return opts.filter(o => o.is_active !== false).map(o => ({
      shipping_option_id: o.id,
      code: o.code,
      name: o.name,
      description: o.description || '',
      cost: o.cost,
      estimated_min_days: typeof o.estimated_min_days === 'number' ? o.estimated_min_days : null,
      estimated_max_days: typeof o.estimated_max_days === 'number' ? o.estimated_max_days : null,
      is_active: o.is_active !== false
    }));
  }

  // ------------------------
  // 39. updateCartShippingOption
  // ------------------------
  updateCartShippingOption(shipping_option_id) {
    const shippingOptions = this._getFromStorage('shipping_options', []);
    const opt = shippingOptions.find(o => o.id === shipping_option_id && o.is_active !== false);
    if (!opt) {
      return {
        success: false,
        message: 'Shipping option not found or inactive.',
        cart: {
          shipping_option_id: null,
          shipping_cost: 0,
          total: 0
        }
      };
    }

    const cart = this._getOrCreateCart();
    cart.shipping_option_id = shipping_option_id;
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Shipping option updated.',
      cart: {
        shipping_option_id: updatedCart.shipping_option_id,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      }
    };
  }

  // ------------------------
  // 40. applyPromoCode
  // ------------------------
  applyPromoCode(promo_code) {
    const cart = this._getOrCreateCart();
    const validation = this._validatePromoCode(promo_code, cart.subtotal || 0);

    if (!validation.isValid) {
      // Clear any existing promo if the new one is invalid
      cart.promo_code = null;
      const updatedCart = this._recalculateCartTotals(cart);
      return {
        success: false,
        message: validation.message,
        cart: {
          promo_code: updatedCart.promo_code,
          subtotal: updatedCart.subtotal,
          discount_total: updatedCart.discount_total,
          shipping_cost: updatedCart.shipping_cost,
          total: updatedCart.total
        }
      };
    }

    cart.promo_code = promo_code;
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Promo code applied.',
      cart: {
        promo_code: updatedCart.promo_code,
        subtotal: updatedCart.subtotal,
        discount_total: updatedCart.discount_total,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      }
    };
  }

  // ------------------------
  // 41. listBlogArticles
  // ------------------------
  listBlogArticles(tag, page = 1, page_size = 10) {
    let articles = this._getFromStorage('blog_articles', []).filter(a => a.is_published !== false);

    if (tag) {
      const t = tag.toLowerCase();
      articles = articles.filter(a => Array.isArray(a.tags) && a.tags.some(x => String(x).toLowerCase() === t));
    }

    // Sort by published_at desc if available
    articles.sort((a, b) => {
      const da = a.published_at ? new Date(a.published_at).getTime() : 0;
      const db = b.published_at ? new Date(b.published_at).getTime() : 0;
      return db - da;
    });

    const total = articles.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const slice = articles.slice(start, end).map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt || '',
      published_at: a.published_at || '',
      tags: Array.isArray(a.tags) ? a.tags : []
    }));

    return {
      total,
      page,
      page_size,
      articles: slice
    };
  }

  // ------------------------
  // 42. searchBlogArticles
  // ------------------------
  searchBlogArticles(query) {
    const q = (query || '').trim().toLowerCase();
    let articles = this._getFromStorage('blog_articles', []).filter(a => a.is_published !== false);

    if (!q) {
      return articles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        excerpt: a.excerpt || '',
        published_at: a.published_at || '',
        tags: Array.isArray(a.tags) ? a.tags : []
      }));
    }

    const results = articles.filter(a => {
      const text = ((a.title || '') + ' ' + (a.excerpt || '') + ' ' + (a.content || '')).toLowerCase();
      return text.indexOf(q) !== -1;
    });

    return results.map(a => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.excerpt || '',
      published_at: a.published_at || '',
      tags: Array.isArray(a.tags) ? a.tags : []
    }));
  }

  // ------------------------
  // 43. getBlogArticleDetails
  // ------------------------
  getBlogArticleDetails(article_id) {
    const articles = this._getFromStorage('blog_articles', []);
    const a = articles.find(ar => ar.id === article_id);
    if (!a) return null;

    return {
      id: a.id,
      title: a.title,
      slug: a.slug,
      content: a.content || '',
      excerpt: a.excerpt || '',
      tags: Array.isArray(a.tags) ? a.tags : [],
      published_at: a.published_at || '',
      recommended_package_category_id: a.recommended_package_category_id || null
    };
  }

  // ------------------------
  // 44. getEmergencyHotlines
  // ------------------------
  getEmergencyHotlines() {
    const hotlines = this._getFromStorage('emergency_hotlines', []);
    return hotlines.map(h => ({
      event_size_option: h.event_size_option,
      label: h.label || '',
      phone_number: h.phone_number,
      is_24_7: !!h.is_24_7,
      notes: h.notes || ''
    }));
  }

  // ------------------------
  // 45. submitSupportRequest
  // ------------------------
  submitSupportRequest(event_size_option, message, callback_number, urgency) {
    const support_requests = this._getFromStorage('support_requests', []);
    const id = this._generateId('support');

    const sr = {
      id,
      event_size_option: event_size_option || null,
      message,
      callback_number,
      urgency,
      status: 'submitted',
      created_at: new Date().toISOString()
    };

    support_requests.push(sr);
    this._saveToStorage('support_requests', support_requests);

    return {
      support_request_id: id,
      status: sr.status,
      created_at: sr.created_at,
      message: 'Support request submitted.'
    };
  }

  // ------------------------
  // 46. getAboutPageContent
  // ------------------------
  getAboutPageContent() {
    const content = this._getFromStorage('about_page_content', {
      company_overview_html: '',
      contact_information: {
        phone: '',
        email: '',
        address: '',
        business_hours: ''
      },
      policy_sections: []
    });

    return {
      company_overview_html: content.company_overview_html || '',
      contact_information: {
        phone: content.contact_information && content.contact_information.phone || '',
        email: content.contact_information && content.contact_information.email || '',
        address: content.contact_information && content.contact_information.address || '',
        business_hours: content.contact_information && content.contact_information.business_hours || ''
      },
      policy_sections: Array.isArray(content.policy_sections) ? content.policy_sections : []
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
