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

  _initStorage() {
    const keys = [
      'equipment_categories',
      'equipment_items',
      'event_packages',
      'event_package_tiers',
      'event_package_addons',
      'venues',
      'venue_availability_slots',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'promo_codes',
      'bookings',
      'account_profiles',
      'venue_inquiries',
      // content & messages
      'about_page_content',
      'faq_content',
      'policies_content',
      'contact_page_info',
      'general_contact_messages'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        if (
          key === 'about_page_content' ||
          key === 'faq_content' ||
          key === 'policies_content' ||
          key === 'contact_page_info'
        ) {
          // Store empty object for content containers; will be lazily filled with defaults
          localStorage.setItem(key, JSON.stringify({}));
        } else if (key === 'general_contact_messages') {
          localStorage.setItem(key, JSON.stringify([]));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    try {
      return data ? JSON.parse(data) : defaultValue;
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

  _now() {
    return new Date().toISOString();
  }

  // -------------------- Helper: Cart & Wishlist --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem IDs
        subtotal: 0,
        discount_total: 0,
        total: 0,
        promo_code_id: null,
        promo_code_snapshot: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _saveCart(cart) {
    let carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
    } else {
      carts.push(cart);
    }
    this._saveToStorage('carts', carts);
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let wishlist = wishlists[0] || null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _saveWishlist(wishlist) {
    let wishlists = this._getFromStorage('wishlists');
    const idx = wishlists.findIndex(w => w.id === wishlist.id);
    if (idx >= 0) {
      wishlists[idx] = wishlist;
    } else {
      wishlists.push(wishlist);
    }
    this._saveToStorage('wishlists', wishlists);
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    let subtotal = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      const it = itemsForCart[i];
      const duration = it.rental_duration_days || 1;
      const qty = it.quantity || 1;
      subtotal += (it.unit_price || 0) * qty * duration;
    }

    let discountTotal = 0;
    if (cart.promo_code_id) {
      const promoCodes = this._getFromStorage('promo_codes');
      const promo = promoCodes.find(p => p.id === cart.promo_code_id) || null;
      if (promo && promo.is_active !== false) {
        const now = new Date();
        const validFrom = promo.valid_from ? new Date(promo.valid_from) : null;
        const validTo = promo.valid_to ? new Date(promo.valid_to) : null;
        const inRange = (!validFrom || now >= validFrom) && (!validTo || now <= validTo);
        const meetsMin = promo.min_subtotal == null || subtotal >= promo.min_subtotal;
        if (inRange && meetsMin) {
          if (promo.discount_type === 'fixed_amount') {
            discountTotal = promo.discount_value || 0;
          } else if (promo.discount_type === 'percentage') {
            discountTotal = subtotal * (promo.discount_value || 0) / 100;
          }
        }
      }
    }

    if (discountTotal > subtotal) {
      discountTotal = subtotal;
    }

    cart.subtotal = subtotal;
    cart.discount_total = discountTotal;
    cart.total = subtotal - discountTotal;
    cart.updated_at = this._now();
    this._saveCart(cart);
  }

  _findPromoCodeByCode(code) {
    if (!code) return null;
    const normalized = String(code).trim().toLowerCase();
    const promoCodes = this._getFromStorage('promo_codes');
    const promo = promoCodes.find(p => (p.code || '').toLowerCase() === normalized) || null;
    if (!promo) return null;

    if (promo.is_active === false) return null;
    const now = new Date();
    if (promo.valid_from) {
      const from = new Date(promo.valid_from);
      if (now < from) return null;
    }
    if (promo.valid_to) {
      const to = new Date(promo.valid_to);
      if (now > to) return null;
    }
    return promo;
  }

  _calculateEventPackagePrice(eventPackageId, tierId, selectedAddonIds) {
    const packages = this._getFromStorage('event_packages');
    const tiers = this._getFromStorage('event_package_tiers');
    const addons = this._getFromStorage('event_package_addons');

    const pkg = packages.find(p => p.id === eventPackageId) || null;
    if (!pkg) return 0;

    let basePrice = 0;
    let tier = null;
    if (tierId) {
      tier = tiers.find(t => t.id === tierId && t.event_package_id === eventPackageId) || null;
    }
    if (tier) {
      basePrice = tier.price || 0;
    } else if (pkg.base_price != null) {
      basePrice = pkg.base_price;
    } else if (pkg.price_min != null) {
      basePrice = pkg.price_min;
    } else if (pkg.price_max != null) {
      basePrice = pkg.price_max;
    }

    let addonsTotal = 0;
    const selectedSet = new Set(selectedAddonIds || []);
    for (let i = 0; i < addons.length; i++) {
      const ad = addons[i];
      if (ad.event_package_id !== eventPackageId) continue;
      // Only optional addons contribute when explicitly selected
      if (ad.is_optional && selectedSet.has(ad.id)) {
        addonsTotal += ad.price || 0;
      }
    }

    return basePrice + addonsTotal;
  }

  _findEarliestVenueAvailabilitySlot(venueId, startDateISO, endDateISO) {
    if (!venueId || !startDateISO || !endDateISO) return null;
    const slots = this._getFromStorage('venue_availability_slots');
    const startDate = new Date(startDateISO);
    const endDate = new Date(endDateISO);
    let earliest = null;
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (s.venue_id !== venueId || s.is_available === false) continue;
      const sd = new Date(s.start_datetime);
      if (sd < startDate || sd > endDate) continue;
      if (!earliest || sd < new Date(earliest.start_datetime)) {
        earliest = s;
      }
    }
    return earliest;
  }

  _buildSearchIndexResult(entityType, entity, extra) {
    const result = {
      type: entityType,
      id: entity.id,
      name: entity.name,
      short_description: entity.short_description || '',
      image_url: '',
      average_rating: entity.average_rating || 0,
      rating_count: entity.rating_count || 0,
      price_from: 0,
      context_snippet: '',
      metadata: {}
    };

    const extras = extra || {};

    if (entityType === 'equipment') {
      const categories = this._getFromStorage('equipment_categories');
      const cat = categories.find(c => c.id === entity.category_id) || null;
      result.image_url = (entity.images && entity.images[0]) || '';
      result.price_from = entity.daily_rental_price || 0;
      result.metadata.category_name = cat ? cat.name : '';
    } else if (entityType === 'event_package') {
      result.image_url = (entity.images && entity.images[0]) || '';
      if (entity.price_min != null) result.price_from = entity.price_min;
      else if (entity.base_price != null) result.price_from = entity.base_price;
      else if (entity.price_max != null) result.price_from = entity.price_max;
      result.metadata.event_type = entity.event_type;
    } else if (entityType === 'venue') {
      result.image_url = (entity.images && entity.images[0]) || '';
      result.metadata.venue_type = entity.venue_type;
      result.metadata.location_city = entity.location_city;
    }

    if (extras.context_snippet) {
      result.context_snippet = extras.context_snippet;
    }

    return result;
  }

  // -------------------- Search & Catalog --------------------

  // searchCatalog(query, types?, page=1, pageSize=20)
  searchCatalog(query, types, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const typeFilter = Array.isArray(types) && types.length ? types : ['equipment', 'event_package', 'venue'];
    const pageNum = page || 1;
    const size = pageSize || 20;

    const results = [];

    if (typeFilter.indexOf('equipment') !== -1) {
      const items = this._getFromStorage('equipment_items');
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.is_active === false) continue;
        if (!q) continue; // global search requires query
        const haystack = (
          (it.name || '') + ' ' +
          (it.short_description || '') + ' ' +
          (it.long_description || '') + ' ' +
          ((it.tags || []).join(' '))
        ).toLowerCase();
        if (haystack.indexOf(q) === -1) continue;
        const context = it.short_description || it.long_description || '';
        results.push(this._buildSearchIndexResult('equipment', it, { context_snippet: context }));
      }
    }

    if (typeFilter.indexOf('event_package') !== -1) {
      const pkgs = this._getFromStorage('event_packages');
      for (let i = 0; i < pkgs.length; i++) {
        const p = pkgs[i];
        if (p.is_active === false) continue;
        if (!q) continue;
        const haystack = (
          (p.name || '') + ' ' +
          (p.short_description || '') + ' ' +
          (p.long_description || '') + ' ' +
          ((p.included_services || []).join(' '))
        ).toLowerCase();
        if (haystack.indexOf(q) === -1) continue;
        const context = p.short_description || p.long_description || '';
        results.push(this._buildSearchIndexResult('event_package', p, { context_snippet: context }));
      }
    }

    if (typeFilter.indexOf('venue') !== -1) {
      const venues = this._getFromStorage('venues');
      for (let i = 0; i < venues.length; i++) {
        const v = venues[i];
        if (v.is_active === false) continue;
        if (!q) continue;
        const haystack = (
          (v.name || '') + ' ' +
          (v.short_description || '') + ' ' +
          (v.long_description || '') + ' ' +
          (v.address || '') + ' ' +
          ((v.amenities || []).join(' '))
        ).toLowerCase();
        if (haystack.indexOf(q) === -1) continue;
        const context = v.short_description || v.long_description || '';
        results.push(this._buildSearchIndexResult('venue', v, { context_snippet: context }));
      }
    }

    const total = results.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paged = results.slice(start, end);

    return {
      results: paged,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // getHomeFeaturedEquipmentCategories()
  getHomeFeaturedEquipmentCategories() {
    const cats = this._getFromStorage('equipment_categories');
    const sorted = cats.slice().sort((a, b) => {
      const ao = a.display_order == null ? 9999 : a.display_order;
      const bo = b.display_order == null ? 9999 : b.display_order;
      if (ao === bo) return (a.name || '').localeCompare(b.name || '');
      return ao - bo;
    });
    return sorted;
  }

  // getHomeFeaturedEventTypes()
  getHomeFeaturedEventTypes() {
    const pkgs = this._getFromStorage('event_packages');
    const known = ['birthday_party', 'wedding', 'conference', 'corporate', 'other'];
    const labels = {
      birthday_party: 'Birthday Party',
      wedding: 'Wedding',
      conference: 'Conference',
      corporate: 'Corporate Event',
      other: 'Other Event'
    };
    const descriptions = {
      birthday_party: 'Packages tailored for memorable birthday celebrations.',
      wedding: 'Venues and packages for weddings and receptions.',
      conference: 'Professional conference and meeting planning.',
      corporate: 'Corporate events, launches, and team gatherings.',
      other: 'Flexible options for any type of event.'
    };

    const set = new Set();
    for (let i = 0; i < pkgs.length; i++) {
      if (pkgs[i].event_type) set.add(pkgs[i].event_type);
    }

    const types = (set.size ? Array.from(set) : known).filter(t => known.indexOf(t) !== -1);

    return types.map(t => ({
      event_type: t,
      label: labels[t] || t,
      description: descriptions[t] || '',
      image_url: ''
    }));
  }

  // getEquipmentFilterOptions(category_code?, search?)
  getEquipmentFilterOptions(category_code, search) {
    const items = this._getFromStorage('equipment_items');
    const q = (search || '').trim().toLowerCase();
    let filtered = items.filter(it => it.is_active !== false);

    if (category_code) {
      filtered = filtered.filter(it => it.category_code === category_code);
    }
    if (q) {
      filtered = filtered.filter(it => {
        const hay = (
          (it.name || '') + ' ' +
          (it.short_description || '') + ' ' +
          (it.long_description || '') + ' ' +
          ((it.tags || []).join(' '))
        ).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    const rentalDurationsSet = new Set();
    let minPrice = null;
    let maxPrice = null;
    const tableSeats = [];
    const brightnessValues = [];

    for (let i = 0; i < filtered.length; i++) {
      const it = filtered[i];
      const minD = it.min_rental_days || 1;
      const maxD = it.max_rental_days || it.min_rental_days || 1;
      rentalDurationsSet.add(minD);
      rentalDurationsSet.add(maxD);
      const price = it.daily_rental_price || 0;
      if (minPrice == null || price < minPrice) minPrice = price;
      if (maxPrice == null || price > maxPrice) maxPrice = price;
      if (it.seats_per_table != null) tableSeats.push(it.seats_per_table);
      if (it.brightness_lumens != null) brightnessValues.push(it.brightness_lumens);
    }

    const rental_durations = Array.from(rentalDurationsSet).filter(Boolean).sort((a, b) => a - b);

    let seats_per_table_ranges = [];
    if (tableSeats.length) {
      let minSeats = Math.min.apply(null, tableSeats);
      let maxSeats = Math.max.apply(null, tableSeats);
      seats_per_table_ranges.push({
        min: minSeats,
        max: maxSeats,
        label: minSeats + '-' + maxSeats + ' seats'
      });
    }

    let brightness_lumens_ranges = [];
    if (brightnessValues.length) {
      let minLum = Math.min.apply(null, brightnessValues);
      let maxLum = Math.max.apply(null, brightnessValues);
      brightness_lumens_ranges.push({
        min: minLum,
        max: maxLum,
        label: minLum + '-' + maxLum + ' lumens'
      });
    }

    const rating_options = [3, 4, 4.5, 5];

    return {
      rental_durations: rental_durations,
      price_range: {
        min_price: minPrice == null ? 0 : minPrice,
        max_price: maxPrice == null ? 0 : maxPrice
      },
      rating_options: rating_options,
      category_specific_filters: {
        seats_per_table_ranges: seats_per_table_ranges,
        brightness_lumens_ranges: brightness_lumens_ranges
      }
    };
  }

  // listEquipmentItems(category_code?, search?, filters?, sort_by='relevance', page=1, pageSize=20)
  listEquipmentItems(category_code, search, filters, sort_by, page, pageSize) {
    const items = this._getFromStorage('equipment_items');
    const categories = this._getFromStorage('equipment_categories');
    const q = (search || '').trim().toLowerCase();
    const f = filters || {};
    const sortBy = sort_by || 'relevance';
    const pageNum = page || 1;
    const size = pageSize || 20;

    let filtered = items.filter(it => it.is_active !== false);

    if (category_code) {
      filtered = filtered.filter(it => it.category_code === category_code);
    }

    if (q) {
      filtered = filtered.filter(it => {
        const hay = (
          (it.name || '') + ' ' +
          (it.short_description || '') + ' ' +
          (it.long_description || '') + ' ' +
          ((it.tags || []).join(' '))
        ).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    if (f.rental_duration_days) {
      const rd = f.rental_duration_days;
      filtered = filtered.filter(it => {
        const minD = it.min_rental_days || 1;
        const maxD = it.max_rental_days || rd;
        return rd >= minD && rd <= maxD;
      });
    }
    if (f.min_price != null) {
      filtered = filtered.filter(it => (it.daily_rental_price || 0) >= f.min_price);
    }
    if (f.max_price != null) {
      filtered = filtered.filter(it => (it.daily_rental_price || 0) <= f.max_price);
    }
    if (f.min_rating != null) {
      filtered = filtered.filter(it => (it.average_rating || 0) >= f.min_rating);
    }
    if (f.seats_per_table_min != null) {
      filtered = filtered.filter(it => (it.seats_per_table || 0) >= f.seats_per_table_min);
    }
    if (f.seats_per_table_max != null) {
      filtered = filtered.filter(it => (it.seats_per_table || 0) <= f.seats_per_table_max);
    }

    if (sortBy === 'price_asc') {
      filtered.sort((a, b) => (a.daily_rental_price || 0) - (b.daily_rental_price || 0));
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => (b.daily_rental_price || 0) - (a.daily_rental_price || 0));
    } else if (sortBy === 'rating_desc') {
      filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === 'rating_asc') {
      filtered.sort((a, b) => (a.average_rating || 0) - (b.average_rating || 0));
    }

    const total = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paged = filtered.slice(start, end);

    const mapped = paged.map(it => {
      const cat = categories.find(c => c.id === it.category_id) || null;
      return {
        id: it.id,
        name: it.name,
        short_description: it.short_description || '',
        category_code: it.category_code,
        category_name: cat ? cat.name : '',
        daily_rental_price: it.daily_rental_price || 0,
        average_rating: it.average_rating || 0,
        rating_count: it.rating_count || 0,
        brightness_lumens: it.brightness_lumens || null,
        seats_per_table: it.seats_per_table || null,
        thumbnail_image_url: (it.images && it.images[0]) || '',
        is_active: it.is_active !== false,
        // Foreign key resolution
        category: cat || null,
        category_id: it.category_id
      };
    });

    return {
      items: mapped,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // getEquipmentItemDetails(equipmentItemId)
  getEquipmentItemDetails(equipmentItemId) {
    const items = this._getFromStorage('equipment_items');
    const categories = this._getFromStorage('equipment_categories');
    const it = items.find(e => e.id === equipmentItemId) || null;
    if (!it) {
      return {
        equipment: null,
        suggested_rental_durations: []
      };
    }
    const cat = categories.find(c => c.id === it.category_id) || null;
    const minD = it.min_rental_days || 1;
    const maxD = it.max_rental_days || minD;
    const durations = [];
    if (minD && durations.indexOf(minD) === -1) durations.push(minD);
    if (maxD && durations.indexOf(maxD) === -1) durations.push(maxD);

    return {
      equipment: {
        id: it.id,
        name: it.name,
        short_description: it.short_description || '',
        long_description: it.long_description || '',
        category_code: it.category_code,
        category_name: cat ? cat.name : '',
        images: it.images || [],
        daily_rental_price: it.daily_rental_price || 0,
        min_rental_days: it.min_rental_days || null,
        max_rental_days: it.max_rental_days || null,
        average_rating: it.average_rating || 0,
        rating_count: it.rating_count || 0,
        brightness_lumens: it.brightness_lumens || null,
        seats_per_table: it.seats_per_table || null,
        tags: it.tags || [],
        is_active: it.is_active !== false,
        // Foreign key resolution
        category: cat || null,
        category_id: it.category_id
      },
      suggested_rental_durations: durations
    };
  }

  // addEquipmentToCart(equipmentItemId, quantity=1, rental_duration_days=1)
  addEquipmentToCart(equipmentItemId, quantity, rental_duration_days) {
    const qty = quantity == null ? 1 : quantity;
    const duration = rental_duration_days == null ? 1 : rental_duration_days;
    const items = this._getFromStorage('equipment_items');
    const equipment = items.find(e => e.id === equipmentItemId) || null;
    if (!equipment || equipment.is_active === false) {
      return { success: false, message: 'Equipment item not found', cart: null };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'equipment',
      equipment_item_id: equipment.id,
      event_package_id: null,
      venue_availability_slot_id: null,
      name_snapshot: equipment.name,
      unit_price: equipment.daily_rental_price || 0,
      quantity: qty,
      rental_duration_days: duration,
      event_start_datetime: null,
      event_end_datetime: null,
      guest_count: null,
      created_at: this._now()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    this._recalculateCartTotals(cart);

    const latestCart = this.getCartDetails();
    return {
      success: true,
      message: 'Equipment added to cart',
      cart: {
        cart_id: latestCart.cart_id,
        subtotal: latestCart.subtotal,
        discount_total: latestCart.discount_total,
        total: latestCart.total,
        item_count: (latestCart.items || []).length,
        items: (latestCart.items || []).map(ci => ({
          cart_item_id: ci.cart_item_id,
          item_type: ci.item_type,
          equipment_item_id: ci.equipment_item_id,
          name: ci.name,
          rental_duration_days: ci.rental_duration_days,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_subtotal: ci.line_subtotal
        }))
      }
    };
  }

  // addEquipmentToWishlist(equipmentItemId)
  addEquipmentToWishlist(equipmentItemId) {
    const items = this._getFromStorage('equipment_items');
    const equipment = items.find(e => e.id === equipmentItemId) || null;
    if (!equipment) {
      return { success: false, message: 'Equipment item not found', wishlist: null };
    }

    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');

    const exists = wishlistItems.find(wi => wi.wishlist_id === wishlist.id && wi.equipment_item_id === equipmentItemId);
    if (exists) {
      return {
        success: true,
        message: 'Already in wishlist',
        wishlist: {
          wishlist_id: wishlist.id,
          item_count: wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length
        }
      };
    }

    const wishlistItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      equipment_item_id: equipment.id,
      added_at: this._now()
    };

    wishlistItems.push(wishlistItem);
    this._saveToStorage('wishlist_items', wishlistItems);
    wishlist.updated_at = this._now();
    this._saveWishlist(wishlist);

    return {
      success: true,
      message: 'Added to wishlist',
      wishlist: {
        wishlist_id: wishlist.id,
        item_count: wishlistItems.filter(wi => wi.wishlist_id === wishlist.id).length
      }
    };
  }

  // getEquipmentComparison(equipmentItemIds)
  getEquipmentComparison(equipmentItemIds) {
    const ids = Array.isArray(equipmentItemIds) ? equipmentItemIds : [];
    const items = this._getFromStorage('equipment_items');
    const categories = this._getFromStorage('equipment_categories');

    const selected = items.filter(it => ids.indexOf(it.id) !== -1);

    const resultItems = selected.map(it => {
      const cat = categories.find(c => c.id === it.category_id) || null;
      return {
        id: it.id,
        name: it.name,
        category_name: cat ? cat.name : '',
        daily_rental_price: it.daily_rental_price || 0,
        average_rating: it.average_rating || 0,
        rating_count: it.rating_count || 0,
        brightness_lumens: it.brightness_lumens || null,
        min_rental_days: it.min_rental_days || null,
        max_rental_days: it.max_rental_days || null,
        seats_per_table: it.seats_per_table || null,
        images: it.images || []
      };
    });

    return { items: resultItems };
  }

  // -------------------- Event Packages --------------------

  // getEventPlannerFilterOptions()
  getEventPlannerFilterOptions() {
    const pkgs = this._getFromStorage('event_packages');
    const eventTypeSet = new Set();
    let minPrice = null;
    let maxPrice = null;
    const ratings = [];

    for (let i = 0; i < pkgs.length; i++) {
      const p = pkgs[i];
      if (p.event_type) eventTypeSet.add(p.event_type);
      const pMin = p.price_min != null ? p.price_min : (p.base_price != null ? p.base_price : p.price_max);
      const pMax = p.price_max != null ? p.price_max : (p.base_price != null ? p.base_price : p.price_min);
      if (pMin != null) {
        if (minPrice == null || pMin < minPrice) minPrice = pMin;
      }
      if (pMax != null) {
        if (maxPrice == null || pMax > maxPrice) maxPrice = pMax;
      }
      if (p.average_rating != null) ratings.push(p.average_rating);
    }

    const known = ['birthday_party', 'wedding', 'conference', 'corporate', 'other'];
    const labels = {
      birthday_party: 'Birthday Party',
      wedding: 'Wedding',
      conference: 'Conference',
      corporate: 'Corporate',
      other: 'Other'
    };

    const event_types = (eventTypeSet.size ? Array.from(eventTypeSet) : known).filter(v => known.indexOf(v) !== -1).map(v => ({
      value: v,
      label: labels[v] || v
    }));

    const rating_options = [3, 4, 4.5, 5];

    return {
      event_types: event_types,
      budget_range: {
        min_price: minPrice == null ? 0 : minPrice,
        max_price: maxPrice == null ? 0 : maxPrice
      },
      rating_options: rating_options
    };
  }

  // searchEventPackages(...)
  searchEventPackages(event_type, date, start_time, end_time, guests, min_price, max_price, min_rating, search, sort_by, page, pageSize) {
    const pkgs = this._getFromStorage('event_packages');
    const tiers = this._getFromStorage('event_package_tiers');
    const q = (search || '').trim().toLowerCase();
    const sortBy = sort_by || 'relevance';
    const pageNum = page || 1;
    const size = pageSize || 20;

    let filtered = pkgs.filter(p => p.is_active !== false);

    if (event_type) {
      filtered = filtered.filter(p => p.event_type === event_type);
    }

    if (guests != null) {
      filtered = filtered.filter(p => {
        const pkgTiers = tiers.filter(t => t.event_package_id === p.id);
        if (!pkgTiers.length) return true;
        for (let i = 0; i < pkgTiers.length; i++) {
          const t = pkgTiers[i];
          if (guests >= t.min_guests && guests <= t.max_guests) return true;
        }
        return false;
      });
    }

    if (q) {
      filtered = filtered.filter(p => {
        const hay = (
          (p.name || '') + ' ' +
          (p.short_description || '') + ' ' +
          (p.long_description || '') + ' ' +
          ((p.included_services || []).join(' '))
        ).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    if (min_price != null || max_price != null) {
      filtered = filtered.filter(p => {
        const pMin = p.price_min != null ? p.price_min : (p.base_price != null ? p.base_price : p.price_max);
        const pMax = p.price_max != null ? p.price_max : (p.base_price != null ? p.base_price : p.price_min);
        let ok = true;
        if (min_price != null && pMax != null) ok = ok && pMax >= min_price;
        if (max_price != null && pMin != null) ok = ok && pMin <= max_price;
        return ok;
      });
    }

    if (min_rating != null) {
      filtered = filtered.filter(p => (p.average_rating || 0) >= min_rating);
    }

    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      filtered.sort((a, b) => {
        const aPrice = a.price_min != null ? a.price_min : (a.base_price != null ? a.base_price : a.price_max || 0);
        const bPrice = b.price_min != null ? b.price_min : (b.base_price != null ? b.base_price : b.price_max || 0);
        return sortBy === 'price_asc' ? aPrice - bPrice : bPrice - aPrice;
      });
    } else if (sortBy === 'rating_desc') {
      filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortBy === 'rating_asc') {
      filtered.sort((a, b) => (a.average_rating || 0) - (b.average_rating || 0));
    }

    const total = filtered.length;
    const start = (pageNum - 1) * size;
    const end = start + size;
    const paged = filtered.slice(start, end);

    const mapped = paged.map(p => ({
      id: p.id,
      name: p.name,
      short_description: p.short_description || '',
      event_type: p.event_type,
      price_from: p.price_min != null ? p.price_min : (p.base_price != null ? p.base_price : p.price_max || 0),
      price_to: p.price_max != null ? p.price_max : (p.base_price != null ? p.base_price : p.price_min || 0),
      average_rating: p.average_rating || 0,
      rating_count: p.rating_count || 0,
      included_services: p.included_services || [],
      primary_image_url: (p.images && p.images[0]) || ''
    }));

    return {
      items: mapped,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // getEventPackageDetails(eventPackageId)
  getEventPackageDetails(eventPackageId) {
    const pkgs = this._getFromStorage('event_packages');
    const tiers = this._getFromStorage('event_package_tiers');
    const addons = this._getFromStorage('event_package_addons');

    const pkg = pkgs.find(p => p.id === eventPackageId) || null;
    if (!pkg) {
      return {
        package: null,
        tiers: [],
        addons: []
      };
    }

    const pkgTiers = tiers.filter(t => t.event_package_id === eventPackageId).map(t => ({
      id: t.id,
      label: t.label || '',
      min_guests: t.min_guests,
      max_guests: t.max_guests,
      price: t.price
    }));

    const pkgAddons = addons.filter(a => a.event_package_id === eventPackageId).map(a => ({
      id: a.id,
      name: a.name,
      addon_type: a.addon_type,
      description: a.description || '',
      price: a.price,
      is_optional: !!a.is_optional
    }));

    return {
      package: {
        id: pkg.id,
        name: pkg.name,
        short_description: pkg.short_description || '',
        long_description: pkg.long_description || '',
        event_type: pkg.event_type,
        images: pkg.images || [],
        average_rating: pkg.average_rating || 0,
        rating_count: pkg.rating_count || 0,
        base_price: pkg.base_price || null,
        price_min: pkg.price_min || null,
        price_max: pkg.price_max || null,
        included_services: pkg.included_services || []
      },
      tiers: pkgTiers,
      addons: pkgAddons
    };
  }

  // addEventPackageToCart(eventPackageId, tierId, guest_count, selectedAddonIds, event_date, start_time, end_time)
  addEventPackageToCart(eventPackageId, tierId, guest_count, selectedAddonIds, event_date, start_time, end_time) {
    const pkgs = this._getFromStorage('event_packages');
    const pkg = pkgs.find(p => p.id === eventPackageId) || null;
    if (!pkg) {
      return { success: false, message: 'Event package not found', cart: null };
    }

    const price = this._calculateEventPackagePrice(eventPackageId, tierId, selectedAddonIds);
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let startDt = null;
    let endDt = null;
    if (event_date && start_time) {
      startDt = event_date + 'T' + start_time + ':00';
    }
    if (event_date && end_time) {
      endDt = event_date + 'T' + end_time + ':00';
    }

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'event_package',
      equipment_item_id: null,
      event_package_id: pkg.id,
      venue_availability_slot_id: null,
      name_snapshot: pkg.name,
      unit_price: price,
      quantity: 1,
      rental_duration_days: null,
      event_start_datetime: startDt,
      event_end_datetime: endDt,
      guest_count: guest_count || null,
      created_at: this._now()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);
    this._recalculateCartTotals(cart);

    const latestCart = this.getCartDetails();
    return {
      success: true,
      message: 'Event package added to cart',
      cart: {
        cart_id: latestCart.cart_id,
        subtotal: latestCart.subtotal,
        discount_total: latestCart.discount_total,
        total: latestCart.total,
        item_count: (latestCart.items || []).length,
        items: (latestCart.items || []).map(ci => ({
          cart_item_id: ci.cart_item_id,
          item_type: ci.item_type,
          event_package_id: ci.event_package_id,
          name: ci.name,
          guest_count: ci.guest_count,
          event_start_datetime: ci.event_start_datetime,
          event_end_datetime: ci.event_end_datetime,
          unit_price: ci.unit_price,
          quantity: ci.quantity,
          line_subtotal: ci.line_subtotal
        }))
      }
    };
  }

  // createBookingFromEventPackage(eventPackageId, tierId, guest_count, event_date, start_time, end_time, selectedAddonIds)
  createBookingFromEventPackage(eventPackageId, tierId, guest_count, event_date, start_time, end_time, selectedAddonIds) {
    const pkgs = this._getFromStorage('event_packages');
    const pkg = pkgs.find(p => p.id === eventPackageId) || null;
    if (!pkg) {
      return { success: false, message: 'Event package not found', booking: null };
    }

    const price = this._calculateEventPackagePrice(eventPackageId, tierId, selectedAddonIds);

    let startDt = null;
    let endDt = null;
    if (event_date && start_time) {
      startDt = event_date + 'T' + start_time + ':00';
    }
    if (event_date && end_time) {
      endDt = event_date + 'T' + end_time + ':00';
    }

    const booking = {
      id: this._generateId('booking'),
      booking_type: 'event_package',
      status: 'draft',
      cart_id: null,
      event_package_id: eventPackageId,
      venue_id: null,
      venue_availability_slot_id: null,
      event_start_datetime: startDt,
      event_end_datetime: endDt,
      guest_count: guest_count,
      total_price: price,
      notes: null,
      created_at: this._now(),
      updated_at: this._now()
    };

    const bookings = this._getFromStorage('bookings');
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      message: 'Booking created',
      booking: {
        id: booking.id,
        booking_type: booking.booking_type,
        status: booking.status,
        event_package_id: booking.event_package_id,
        event_start_datetime: booking.event_start_datetime,
        event_end_datetime: booking.event_end_datetime,
        guest_count: booking.guest_count,
        total_price: booking.total_price
      }
    };
  }

  // -------------------- Venues --------------------

  // getVenueFilterOptions()
  getVenueFilterOptions() {
    const venues = this._getFromStorage('venues');

    const venueTypeSet = new Set();
    const citiesSet = new Set();
    let minCap = null;
    let maxCap = null;
    const rating_options = [3, 4, 4.5, 5];

    for (let i = 0; i < venues.length; i++) {
      const v = venues[i];
      if (v.venue_type) venueTypeSet.add(v.venue_type);
      if (v.location_city) citiesSet.add(v.location_city);
      if (v.capacity_min != null) {
        if (minCap == null || v.capacity_min < minCap) minCap = v.capacity_min;
      }
      if (v.capacity_max != null) {
        if (maxCap == null || v.capacity_max > maxCap) maxCap = v.capacity_max;
      }
    }

    const typeLabels = {
      conference_room: 'Conference Room',
      event_hall: 'Event Hall',
      outdoor_space: 'Outdoor Space',
      other: 'Other'
    };

    const cityLabels = {
      austin: 'Austin',
      dallas: 'Dallas',
      houston: 'Houston',
      san_antonio: 'San Antonio',
      other: 'Other'
    };

    const venue_types = Array.from(venueTypeSet).map(v => ({ value: v, label: typeLabels[v] || v }));
    const cities = Array.from(citiesSet).map(c => ({ value: c, label: cityLabels[c] || c }));

    const policy_options = [
      { code: 'free_cancellation', label: 'Free cancellation' }
    ];

    return {
      venue_types: venue_types,
      cities: cities,
      capacity_range: {
        min_capacity: minCap == null ? 0 : minCap,
        max_capacity: maxCap == null ? 0 : maxCap
      },
      policy_options: policy_options,
      rating_options: rating_options
    };
  }

  // searchVenues(...)
  searchVenues(venue_type, event_type, search, location_city, start_date, end_date, min_capacity, max_capacity, has_free_cancellation, min_rating, sort_by, page, pageSize) {
    const venues = this._getFromStorage('venues');
    const slots = this._getFromStorage('venue_availability_slots');
    const q = (search || '').trim().toLowerCase();
    const sortBy = sort_by || 'relevance';
    const pageNum = page || 1;
    const size = pageSize || 20;

    let filtered = venues.filter(v => v.is_active !== false);

    if (venue_type) {
      filtered = filtered.filter(v => v.venue_type === venue_type);
    }

    if (event_type) {
      filtered = filtered.filter(v => {
        const allowed = v.allowed_event_types || [];
        return allowed.indexOf(event_type) !== -1;
      });
    }

    if (location_city) {
      filtered = filtered.filter(v => v.location_city === location_city);
    }

    if (min_capacity != null || max_capacity != null) {
      filtered = filtered.filter(v => {
        const vMin = v.capacity_min != null ? v.capacity_min : 0;
        const vMax = v.capacity_max != null ? v.capacity_max : 999999;
        let ok = true;
        if (min_capacity != null) ok = ok && vMax >= min_capacity;
        if (max_capacity != null) ok = ok && vMin <= max_capacity;
        return ok;
      });
    }

    if (has_free_cancellation != null) {
      filtered = filtered.filter(v => !!v.has_free_cancellation === !!has_free_cancellation);
    }

    if (min_rating != null) {
      filtered = filtered.filter(v => (v.average_rating || 0) >= min_rating);
    }

    if (q) {
      filtered = filtered.filter(v => {
        const hay = (
          (v.name || '') + ' ' +
          (v.short_description || '') + ' ' +
          (v.long_description || '') + ' ' +
          (v.address || '') + ' ' +
          ((v.amenities || []).join(' '))
        ).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    // Compute earliest available start datetime per venue if date range provided
    const hasDateRange = !!(start_date && end_date);
    const startDateObj = hasDateRange ? new Date(start_date) : null;
    const endDateObj = hasDateRange ? new Date(end_date) : null;

    const venueEarliestMap = {};

    if (hasDateRange) {
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        if (s.is_available === false) continue;
        if (!s.venue_id) continue;
        const sd = new Date(s.start_datetime);
        if (sd < startDateObj || sd > endDateObj) continue;
        const current = venueEarliestMap[s.venue_id];
        if (!current || sd < new Date(current.start_datetime)) {
          venueEarliestMap[s.venue_id] = s;
        }
      }

      // Filter out venues with no available slots in range
      filtered = filtered.filter(v => !!venueEarliestMap[v.id]);
    }

    if (sortBy === 'earliest_start_time' && hasDateRange) {
      filtered.sort((a, b) => {
        const sa = venueEarliestMap[a.id];
        const sb = venueEarliestMap[b.id];
        if (!sa && !sb) return 0;
        if (!sa) return 1;
        if (!sb) return -1;
        return new Date(sa.start_datetime) - new Date(sb.start_datetime);
      });
    } else if (sortBy === 'rating_desc') {
      filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }

    const total = filtered.length;
    const startIdx = (pageNum - 1) * size;
    const endIdx = startIdx + size;
    const paged = filtered.slice(startIdx, endIdx);

    const mapped = paged.map(v => ({
      id: v.id,
      name: v.name,
      short_description: v.short_description || '',
      venue_type: v.venue_type,
      location_city: v.location_city,
      address: v.address || '',
      capacity_min: v.capacity_min || null,
      capacity_max: v.capacity_max || null,
      average_rating: v.average_rating || 0,
      rating_count: v.rating_count || 0,
      has_free_cancellation: !!v.has_free_cancellation,
      primary_image_url: (v.images && v.images[0]) || '',
      earliest_available_start_datetime: hasDateRange && venueEarliestMap[v.id]
        ? venueEarliestMap[v.id].start_datetime
        : null
    }));

    return {
      items: mapped,
      total: total,
      page: pageNum,
      pageSize: size
    };
  }

  // getVenueDetails(venueId)
  getVenueDetails(venueId) {
    const venues = this._getFromStorage('venues');
    const v = venues.find(x => x.id === venueId) || null;
    if (!v) {
      return { venue: null };
    }

    return {
      venue: {
        id: v.id,
        name: v.name,
        short_description: v.short_description || '',
        long_description: v.long_description || '',
        venue_type: v.venue_type,
        address: v.address || '',
        location_city: v.location_city,
        capacity_min: v.capacity_min || null,
        capacity_max: v.capacity_max || null,
        average_rating: v.average_rating || 0,
        rating_count: v.rating_count || 0,
        has_free_cancellation: !!v.has_free_cancellation,
        cancellation_policy_description: v.cancellation_policy_description || '',
        amenities: v.amenities || [],
        allowed_event_types: v.allowed_event_types || [],
        images: v.images || []
      }
    };
  }

  // getVenueAvailability(venueId, start_date, end_date)
  getVenueAvailability(venueId, start_date, end_date) {
    const slots = this._getFromStorage('venue_availability_slots');
    const start = new Date(start_date);
    const end = new Date(end_date);
    const filtered = slots.filter(s => {
      if (s.venue_id !== venueId) return false;
      const sd = new Date(s.start_datetime);
      return sd >= start && sd <= end;
    }).sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    return {
      venue_id: venueId,
      slots: filtered.map(s => ({
        id: s.id,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        is_available: !!s.is_available
      }))
    };
  }

  // createBookingFromVenueSlot(venueAvailabilitySlotId, guest_count)
  createBookingFromVenueSlot(venueAvailabilitySlotId, guest_count) {
    const slots = this._getFromStorage('venue_availability_slots');
    const venues = this._getFromStorage('venues');
    const slot = slots.find(s => s.id === venueAvailabilitySlotId) || null;
    if (!slot || slot.is_available === false) {
      return { success: false, message: 'Venue slot not available', booking: null };
    }
    const venue = venues.find(v => v.id === slot.venue_id) || null;

    const booking = {
      id: this._generateId('booking'),
      booking_type: 'venue',
      status: 'draft',
      cart_id: null,
      event_package_id: null,
      venue_id: slot.venue_id,
      venue_availability_slot_id: slot.id,
      event_start_datetime: slot.start_datetime,
      event_end_datetime: slot.end_datetime,
      guest_count: guest_count,
      total_price: 0,
      notes: null,
      created_at: this._now(),
      updated_at: this._now()
    };

    const bookings = this._getFromStorage('bookings');
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      message: 'Booking created',
      booking: {
        id: booking.id,
        booking_type: booking.booking_type,
        status: booking.status,
        venue_id: booking.venue_id,
        venue_availability_slot_id: booking.venue_availability_slot_id,
        event_start_datetime: booking.event_start_datetime,
        event_end_datetime: booking.event_end_datetime,
        guest_count: booking.guest_count,
        total_price: booking.total_price
      }
    };
  }

  // sendVenueInquiry(venueId, sender_name, sender_email, message)
  sendVenueInquiry(venueId, sender_name, sender_email, message) {
    const venues = this._getFromStorage('venues');
    const venue = venues.find(v => v.id === venueId) || null;
    if (!venue) {
      return { success: false, message: 'Venue not found', inquiry_id: null };
    }

    const inquiry = {
      id: this._generateId('venue_inquiry'),
      venue_id: venueId,
      sender_name: sender_name,
      sender_email: sender_email,
      message: message,
      sent_at: this._now()
    };

    const inquiries = this._getFromStorage('venue_inquiries');
    inquiries.push(inquiry);
    this._saveToStorage('venue_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry sent',
      inquiry_id: inquiry.id
    };
  }

  // -------------------- Wishlist --------------------

  // getWishlistItems()
  getWishlistItems() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(wi => wi.wishlist_id === wishlist.id);
    const equipmentItems = this._getFromStorage('equipment_items');
    const categories = this._getFromStorage('equipment_categories');

    const items = wishlistItems.map(wi => {
      const eq = equipmentItems.find(e => e.id === wi.equipment_item_id) || null;
      const cat = eq ? (categories.find(c => c.id === eq.category_id) || null) : null;
      return {
        wishlist_item_id: wi.id,
        equipment_item_id: wi.equipment_item_id,
        name: eq ? eq.name : '',
        category_code: eq ? eq.category_code : null,
        category_name: cat ? cat.name : '',
        daily_rental_price: eq ? (eq.daily_rental_price || 0) : 0,
        average_rating: eq ? (eq.average_rating || 0) : 0,
        thumbnail_image_url: eq && eq.images ? (eq.images[0] || '') : '',
        added_at: wi.added_at,
        // Foreign key resolution
        equipment_item: eq,
        wishlist_id: wi.wishlist_id
      };
    });

    return {
      wishlist_id: wishlist.id,
      items: items
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    let wishlistItems = this._getFromStorage('wishlist_items');
    const idx = wishlistItems.findIndex(wi => wi.id === wishlistItemId);
    if (idx === -1) {
      return { success: false, message: 'Wishlist item not found', remaining_item_count: wishlistItems.length };
    }
    const wishlistId = wishlistItems[idx].wishlist_id;
    wishlistItems.splice(idx, 1);
    this._saveToStorage('wishlist_items', wishlistItems);
    const remaining = wishlistItems.filter(wi => wi.wishlist_id === wishlistId).length;
    return {
      success: true,
      message: 'Wishlist item removed',
      remaining_item_count: remaining
    };
  }

  // moveWishlistItemToCart(wishlistItemId, quantity=1, rental_duration_days=1)
  moveWishlistItemToCart(wishlistItemId, quantity, rental_duration_days) {
    const qty = quantity == null ? 1 : quantity;
    const duration = rental_duration_days == null ? 1 : rental_duration_days;

    let wishlistItems = this._getFromStorage('wishlist_items');
    const wishlistItem = wishlistItems.find(wi => wi.id === wishlistItemId) || null;
    if (!wishlistItem) {
      return { success: false, message: 'Wishlist item not found', wishlist_item_removed: false, cart: null };
    }

    const result = this.addEquipmentToCart(wishlistItem.equipment_item_id, qty, duration);
    if (!result.success) {
      return { success: false, message: result.message, wishlist_item_removed: false, cart: result.cart };
    }

    // Remove wishlist item
    wishlistItems = wishlistItems.filter(wi => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    const latestCart = result.cart;
    return {
      success: true,
      message: 'Moved to cart',
      wishlist_item_removed: true,
      cart: {
        cart_id: latestCart.cart_id,
        subtotal: latestCart.subtotal,
        discount_total: latestCart.discount_total,
        total: latestCart.total,
        item_count: latestCart.item_count
      }
    };
  }

  // -------------------- Cart --------------------

  // getCartDetails()
  getCartDetails() {
    const carts = this._getFromStorage('carts');
    const cart = carts[0] || null;
    const cartItems = this._getFromStorage('cart_items');
    const equipmentItems = this._getFromStorage('equipment_items');
    const eventPackages = this._getFromStorage('event_packages');
    const venues = this._getFromStorage('venues');
    const slots = this._getFromStorage('venue_availability_slots');
    const promoCodes = this._getFromStorage('promo_codes');

    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        applied_promo_code: null
      };
    }

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    const items = itemsForCart.map(ci => {
      const eq = ci.equipment_item_id ? (equipmentItems.find(e => e.id === ci.equipment_item_id) || null) : null;
      const pkg = ci.event_package_id ? (eventPackages.find(p => p.id === ci.event_package_id) || null) : null;
      const slot = ci.venue_availability_slot_id ? (slots.find(s => s.id === ci.venue_availability_slot_id) || null) : null;
      let venue = null;
      if (slot && slot.venue_id) {
        venue = venues.find(v => v.id === slot.venue_id) || null;
      }
      const duration = ci.rental_duration_days || 1;
      const qty = ci.quantity || 1;
      const lineSubtotal = (ci.unit_price || 0) * qty * duration;

      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        equipment_item_id: ci.equipment_item_id || null,
        event_package_id: ci.event_package_id || null,
        venue_availability_slot_id: ci.venue_availability_slot_id || null,
        name: ci.name_snapshot,
        unit_price: ci.unit_price || 0,
        quantity: qty,
        rental_duration_days: ci.rental_duration_days || null,
        event_start_datetime: ci.event_start_datetime || null,
        event_end_datetime: ci.event_end_datetime || null,
        guest_count: ci.guest_count || null,
        line_subtotal: lineSubtotal,
        // Foreign key resolution
        equipment_item: eq,
        event_package: pkg,
        venue_availability_slot: slot ? Object.assign({}, slot, {
          // nested foreign key resolution for slot.venue_id -> venue
          venue: venue || null
        }) : null
      };
    });

    // Ensure totals are up to date
    this._recalculateCartTotals(cart);

    let appliedPromo = null;
    if (cart.promo_code_id) {
      const promo = promoCodes.find(p => p.id === cart.promo_code_id) || null;
      if (promo) {
        appliedPromo = {
          code: promo.code,
          description: promo.description || '',
          discount_type: promo.discount_type,
          discount_value: promo.discount_value
        };
      }
    }

    return {
      cart_id: cart.id,
      items: items,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      total: cart.total || 0,
      applied_promo_code: appliedPromo
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found', cart: null };
    }

    const cartItem = cartItems[idx];

    if (quantity <= 0) {
      // Remove item
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      const carts = this._getFromStorage('carts');
      const cart = carts.find(c => c.id === cartItem.cart_id) || null;
      if (cart) this._recalculateCartTotals(cart);
      return {
        success: true,
        message: 'Cart item removed',
        cart: cart ? {
          cart_id: cart.id,
          subtotal: cart.subtotal,
          discount_total: cart.discount_total,
          total: cart.total
        } : null
      };
    }

    cartItem.quantity = quantity;
    cartItems[idx] = cartItem;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === cartItem.cart_id) || null;
    if (cart) this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Cart item quantity updated',
      cart: cart ? {
        cart_id: cart.id,
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total
      } : null
    };
  }

  // updateCartItemRentalDuration(cartItemId, rental_duration_days)
  updateCartItemRentalDuration(cartItemId, rental_duration_days) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found', cart: null };
    }
    if (rental_duration_days <= 0) {
      return { success: false, message: 'Invalid rental duration', cart: null };
    }

    const cartItem = cartItems[idx];
    cartItem.rental_duration_days = rental_duration_days;
    cartItems[idx] = cartItem;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === cartItem.cart_id) || null;
    if (cart) this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Rental duration updated',
      cart: cart ? {
        cart_id: cart.id,
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total
      } : null
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found', cart: null };
    }
    const cartId = cartItems[idx].cart_id;
    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === cartId) || null;
    if (cart) this._recalculateCartTotals(cart);

    const remainingCount = cartItems.filter(ci => ci.cart_id === cartId).length;

    return {
      success: true,
      message: 'Cart item removed',
      cart: cart ? {
        cart_id: cart.id,
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total,
        item_count: remainingCount
      } : null
    };
  }

  // applyPromoCodeToCart(promo_code)
  applyPromoCodeToCart(promo_code) {
    const carts = this._getFromStorage('carts');
    const cart = carts[0] || null;
    if (!cart) {
      return { success: false, message: 'Cart is empty', cart: null };
    }

    const promo = this._findPromoCodeByCode(promo_code);
    if (!promo) {
      return { success: false, message: 'Invalid promo code', cart: null };
    }

    cart.promo_code_id = promo.id;
    cart.promo_code_snapshot = promo_code;
    this._recalculateCartTotals(cart);

    // Instrumentation for task completion tracking (task_7)
    try {
      const normalizedCode = String(promo_code || '').trim().toLowerCase();
      if (normalizedCode === 'save50') {
        localStorage.setItem('task7_promoApplication', JSON.stringify({
          promoCode: promo.code,
          subtotalAtApply: cart.subtotal,
          discount_total: cart.discount_total,
          total: cart.total,
          applied_at: this._now()
        }));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const appliedPromo = {
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value
    };

    return {
      success: true,
      message: 'Promo code applied',
      cart: {
        cart_id: cart.id,
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total,
        applied_promo_code: appliedPromo
      }
    };
  }

  // createBookingFromCart(booking_type, notes)
  createBookingFromCart(booking_type, notes) {
    const carts = this._getFromStorage('carts');
    const cart = carts[0] || null;
    if (!cart) {
      return { success: false, message: 'Cart is empty', booking: null };
    }

    // Ensure totals are up to date
    this._recalculateCartTotals(cart);

    const booking = {
      id: this._generateId('booking'),
      booking_type: booking_type,
      status: 'draft',
      cart_id: cart.id,
      event_package_id: null,
      venue_id: null,
      venue_availability_slot_id: null,
      event_start_datetime: null,
      event_end_datetime: null,
      guest_count: null,
      total_price: cart.total || cart.subtotal || 0,
      notes: notes || null,
      created_at: this._now(),
      updated_at: this._now()
    };

    const bookings = this._getFromStorage('bookings');
    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      message: 'Booking created from cart',
      booking: {
        id: booking.id,
        booking_type: booking.booking_type,
        status: booking.status,
        cart_id: booking.cart_id,
        total_price: booking.total_price
      }
    };
  }

  // getBookingDetails(bookingId)
  getBookingDetails(bookingId) {
    const bookings = this._getFromStorage('bookings');
    const booking = bookings.find(b => b.id === bookingId) || null;
    if (!booking) {
      return {
        booking: null,
        related_items: {
          equipment_items: [],
          event_package: null,
          venue: null
        },
        policies_summary: {
          cancellation_policy: '',
          terms_and_conditions: ''
        }
      };
    }

    const cartItems = this._getFromStorage('cart_items');
    const equipmentItems = this._getFromStorage('equipment_items');
    const eventPackages = this._getFromStorage('event_packages');
    const venues = this._getFromStorage('venues');
    const slots = this._getFromStorage('venue_availability_slots');

    let equipment_items = [];

    if (booking.cart_id) {
      const itemsForCart = cartItems.filter(ci => ci.cart_id === booking.cart_id && ci.item_type === 'equipment');
      equipment_items = itemsForCart.map(ci => ({
        name: ci.name_snapshot,
        quantity: ci.quantity || 1,
        rental_duration_days: ci.rental_duration_days || 1,
        unit_price: ci.unit_price || 0,
        line_total: (ci.unit_price || 0) * (ci.quantity || 1) * (ci.rental_duration_days || 1)
      }));
    }

    let event_package = null;
    if (booking.event_package_id) {
      const pkg = eventPackages.find(p => p.id === booking.event_package_id) || null;
      if (pkg) {
        event_package = {
          name: pkg.name,
          tier_label: '',
          selected_addons: [],
          price: booking.total_price || (pkg.base_price || pkg.price_min || pkg.price_max || 0)
        };
      }
    }

    let venue = null;
    if (booking.venue_id) {
      const v = venues.find(vv => vv.id === booking.venue_id) || null;
      const slot = booking.venue_availability_slot_id
        ? (slots.find(s => s.id === booking.venue_availability_slot_id) || null)
        : null;
      if (v) {
        venue = {
          name: v.name,
          address: v.address || '',
          slot: slot ? {
            start_datetime: slot.start_datetime,
            end_datetime: slot.end_datetime
          } : null
        };
      }
    }

    // Policies summary: basic text; cancellation from venue if available
    let cancellation_policy = '';
    if (booking.venue_id) {
      const v = venues.find(vv => vv.id === booking.venue_id) || null;
      if (v && v.cancellation_policy_description) {
        cancellation_policy = v.cancellation_policy_description;
      }
    }

    const terms_and_conditions = 'By confirming this booking, you agree to the service terms and conditions.';

    // Foreign key resolution for booking
    const cart = booking.cart_id ? this._getFromStorage('carts').find(c => c.id === booking.cart_id) || null : null;
    const eventPkg = booking.event_package_id ? eventPackages.find(p => p.id === booking.event_package_id) || null : null;
    const venueEntity = booking.venue_id ? venues.find(v => v.id === booking.venue_id) || null : null;
    const slotEntity = booking.venue_availability_slot_id ? slots.find(s => s.id === booking.venue_availability_slot_id) || null : null;

    return {
      booking: {
        id: booking.id,
        booking_type: booking.booking_type,
        status: booking.status,
        cart_id: booking.cart_id,
        event_package_id: booking.event_package_id,
        venue_id: booking.venue_id,
        venue_availability_slot_id: booking.venue_availability_slot_id,
        event_start_datetime: booking.event_start_datetime,
        event_end_datetime: booking.event_end_datetime,
        guest_count: booking.guest_count,
        total_price: booking.total_price,
        notes: booking.notes,
        // Foreign key resolution
        cart: cart,
        event_package: eventPkg,
        venue: venueEntity,
        venue_availability_slot: slotEntity
      },
      related_items: {
        equipment_items: equipment_items,
        event_package: event_package,
        venue: venue
      },
      policies_summary: {
        cancellation_policy: cancellation_policy,
        terms_and_conditions: terms_and_conditions
      }
    };
  }

  // confirmBooking(bookingId)
  confirmBooking(bookingId) {
    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx === -1) {
      return { success: false, message: 'Booking not found', booking: null };
    }
    const booking = bookings[idx];
    booking.status = 'confirmed';
    booking.updated_at = this._now();
    bookings[idx] = booking;
    this._saveToStorage('bookings', bookings);

    return {
      success: true,
      message: 'Booking confirmed',
      booking: {
        id: booking.id,
        status: booking.status
      }
    };
  }

  // -------------------- Account Profile --------------------

  // getAccountProfile()
  getAccountProfile() {
    let profiles = this._getFromStorage('account_profiles');
    let profile = profiles[0] || null;
    if (!profile) {
      profile = {
        id: this._generateId('account_profile'),
        full_name: '',
        phone_number: '',
        default_event_city: null,
        preferred_contact_method: null,
        email: '',
        created_at: this._now(),
        updated_at: this._now()
      };
      profiles.push(profile);
      this._saveToStorage('account_profiles', profiles);
    }

    return {
      profile: {
        id: profile.id,
        full_name: profile.full_name || '',
        phone_number: profile.phone_number || '',
        default_event_city: profile.default_event_city || null,
        preferred_contact_method: profile.preferred_contact_method || null,
        email: profile.email || ''
      }
    };
  }

  // updateAccountProfile(full_name?, phone_number?, default_event_city?, preferred_contact_method?, email?)
  updateAccountProfile(full_name, phone_number, default_event_city, preferred_contact_method, email) {
    let profiles = this._getFromStorage('account_profiles');
    let profile = profiles[0] || null;
    if (!profile) {
      profile = {
        id: this._generateId('account_profile'),
        full_name: '',
        phone_number: '',
        default_event_city: null,
        preferred_contact_method: null,
        email: '',
        created_at: this._now(),
        updated_at: this._now()
      };
      profiles.push(profile);
    }

    if (full_name !== undefined) profile.full_name = full_name;
    if (phone_number !== undefined) profile.phone_number = phone_number;
    if (default_event_city !== undefined) profile.default_event_city = default_event_city;
    if (preferred_contact_method !== undefined) profile.preferred_contact_method = preferred_contact_method;
    if (email !== undefined) profile.email = email;
    profile.updated_at = this._now();

    profiles[0] = profile;
    this._saveToStorage('account_profiles', profiles);

    return {
      success: true,
      message: 'Profile updated',
      profile: {
        id: profile.id,
        full_name: profile.full_name || '',
        phone_number: profile.phone_number || '',
        default_event_city: profile.default_event_city || null,
        preferred_contact_method: profile.preferred_contact_method || null,
        email: profile.email || ''
      }
    };
  }

  // -------------------- Static/Content Interfaces --------------------

  // getAboutPageContent()
  getAboutPageContent() {
    let content = this._getObjectFromStorage('about_page_content', {});
    if (!content || !content.heading) {
      content = {
        heading: 'About Our Event Services',
        body_html: '<p>We provide event organization, equipment rentals, and venue booking services to make your events seamless.</p>',
        highlights: [
          'Full-service event planning',
          'High-quality audio, lighting, seating, and staging equipment',
          'Curated venues and event packages'
        ],
        contact_cta_text: 'Contact us to start planning your event.'
      };
      this._saveToStorage('about_page_content', content);
    }
    return content;
  }

  // getFAQContent()
  getFAQContent() {
    let content = this._getObjectFromStorage('faq_content', {});
    if (!content || !Array.isArray(content.sections)) {
      content = {
        sections: [
          {
            category: 'Bookings',
            questions: [
              {
                question: 'How do I book equipment or a venue?',
                answer_html: '<p>Add items to your cart and proceed to checkout to create a booking.</p>',
                related_page_codes: ['policies']
              }
            ]
          },
          {
            category: 'Cancellations',
            questions: [
              {
                question: 'What is your cancellation policy?',
                answer_html: '<p>Cancellation policies vary by venue and package. See the Policies page for details.</p>',
                related_page_codes: ['policies']
              }
            ]
          }
        ]
      };
      this._saveToStorage('faq_content', content);
    }
    return content;
  }

  // getPoliciesContent()
  getPoliciesContent() {
    let content = this._getObjectFromStorage('policies_content', {});
    if (!content || !Array.isArray(content.sections)) {
      content = {
        sections: [
          {
            id: 'terms',
            title: 'Terms of Service',
            body_html: '<p>These are the general terms of service for using our platform.</p>'
          },
          {
            id: 'privacy',
            title: 'Privacy Policy',
            body_html: '<p>We respect your privacy and protect your data.</p>'
          },
          {
            id: 'cancellation',
            title: 'Cancellation Policy',
            body_html: '<p>Cancellation terms depend on the specific venue or package selected.</p>'
          }
        ]
      };
      this._saveToStorage('policies_content', content);
    }
    return content;
  }

  // getContactPageInfo()
  getContactPageInfo() {
    let info = this._getObjectFromStorage('contact_page_info', {});
    if (!info || !info.business_email) {
      info = {
        business_email: 'support@example.com',
        business_phone: '+1 (555) 000-0000',
        office_location: 'Austin, TX',
        office_hours: 'Mon-Fri 9:00 AM - 5:00 PM',
        booking_help_page_code: 'faq'
      };
      this._saveToStorage('contact_page_info', info);
    }
    return info;
  }

  // sendGeneralContactMessage(sender_name, sender_email, topic, subject, message)
  sendGeneralContactMessage(sender_name, sender_email, topic, subject, message) {
    const msg = {
      id: this._generateId('contact_msg'),
      sender_name: sender_name,
      sender_email: sender_email,
      topic: topic || 'general',
      subject: subject || '',
      message: message,
      sent_at: this._now()
    };
    const messages = this._getFromStorage('general_contact_messages');
    messages.push(msg);
    this._saveToStorage('general_contact_messages', messages);
    return {
      success: true,
      message: 'Message sent',
      reference_id: msg.id
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