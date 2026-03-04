// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    var arrayKeys = [
      'flavors',
      'topping_options',
      'menu_items',
      'gift_card_products',
      'gift_card_purchases',
      'catering_packages',
      'catering_booking_requests',
      'locations',
      'location_hours',
      'pickup_slots',
      'coupons',
      'loyalty_enrollments',
      'contact_messages',
      'cart',
      'cart_items',
      'orders',
      'static_pages'
    ];

    for (var i = 0; i < arrayKeys.length; i++) {
      var key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Optional config keys; do not pre-populate with domain data
    if (!localStorage.getItem('homepage_content')) {
      localStorage.setItem('homepage_content', JSON.stringify({}));
    }
    if (!localStorage.getItem('rewards_program_details')) {
      localStorage.setItem('rewards_program_details', JSON.stringify({}));
    }
    if (!localStorage.getItem('tax_rate')) {
      // default 0 tax if not configured
      localStorage.setItem('tax_rate', '0');
    }
  }

  _getFromStorage(key, defaultValue) {
    var data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  // ----------------------
  // General helpers
  // ----------------------

  _humanizeKey(key) {
    if (!key) return '';
    return key
      .split('_')
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  _getDayOfWeekString(date) {
    var days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  _isoDateOnly(date) {
    return date.toISOString().slice(0, 10);
  }

  _parseDateOnly(isoDateString) {
    // Expect 'YYYY-MM-DD'
    return new Date(isoDateString + 'T00:00:00');
  }

  _safeNumber(value, fallback) {
    var n = parseFloat(value);
    if (isNaN(n)) return typeof fallback !== 'undefined' ? fallback : 0;
    return n;
  }

  // ----------------------
  // Cart helpers
  // ----------------------

  _getExistingCart() {
    var carts = this._getFromStorage('cart', []);
    if (!carts.length) return null;
    var currentId = localStorage.getItem('current_cart_id');
    var cart = null;
    if (currentId) {
      for (var i = 0; i < carts.length; i++) {
        if (carts[i].id === currentId) {
          cart = carts[i];
          break;
        }
      }
    }
    if (!cart) {
      cart = carts[carts.length - 1];
      localStorage.setItem('current_cart_id', cart.id);
    }
    return cart || null;
  }

  _getOrCreateCart() {
    var cart = this._getExistingCart();
    if (cart) return cart;

    var carts = this._getFromStorage('cart', []);
    var defaultLocation = this._getDefaultPickupLocation();
    var nowIso = new Date().toISOString();

    cart = {
      id: this._generateId('cart'),
      items: [],
      subtotal: 0,
      discount_total: 0,
      total: 0,
      coupon_code: null,
      coupon_discount: 0,
      pickup_method: 'pickup',
      pickup_date: null,
      pickup_time_slot_id: null,
      location_id: defaultLocation ? defaultLocation.id : null,
      created_at: nowIso,
      updated_at: nowIso
    };

    carts.push(cart);
    this._saveToStorage('cart', carts);
    localStorage.setItem('current_cart_id', cart.id);
    return cart;
  }

  _saveCart(cart) {
    var carts = this._getFromStorage('cart', []);
    var updated = false;
    for (var i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i] = cart;
        updated = true;
        break;
      }
    }
    if (!updated) {
      carts.push(cart);
    }
    this._saveToStorage('cart', carts);
  }

  _getCartItems(cartId) {
    var items = this._getFromStorage('cart_items', []);
    var result = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].cart_id === cartId) {
        result.push(items[i]);
      }
    }
    return result;
  }

  _recalculateCartTotals(cart) {
    var items = this._getCartItems(cart.id);
    var subtotal = 0;
    for (var i = 0; i < items.length; i++) {
      subtotal += this._safeNumber(items[i].line_total, 0);
    }
    cart.subtotal = Number(subtotal.toFixed(2));

    var discount = 0;
    var couponDiscount = 0;
    if (cart.coupon_code) {
      var validation = this._validateCouponForCart(cart.coupon_code, cart, items, true);
      if (validation.valid) {
        discount = validation.discount;
        couponDiscount = validation.discount;
      } else {
        cart.coupon_code = null;
      }
    }

    cart.discount_total = Number(discount.toFixed(2));
    cart.coupon_discount = Number(couponDiscount.toFixed(2));
    cart.total = Number((cart.subtotal - cart.discount_total).toFixed(2));
    cart.updated_at = new Date().toISOString();
    this._saveCart(cart);
  }

  _validateCouponForCart(couponCode, cart, cartItems, allowMinTotalFailure) {
    var coupons = this._getFromStorage('coupons', []);
    if (!couponCode) {
      return { valid: false, discount: 0, reason: 'no_coupon' };
    }

    var coupon = null;
    var lower = String(couponCode).toLowerCase();
    for (var i = 0; i < coupons.length; i++) {
      if (String(coupons[i].code || '').toLowerCase() === lower) {
        coupon = coupons[i];
        break;
      }
    }

    if (!coupon || coupon.is_active === false) {
      return { valid: false, discount: 0, reason: 'not_found_or_inactive' };
    }

    var now = new Date();
    if (coupon.start_date) {
      var start = new Date(coupon.start_date);
      if (now < start) {
        return { valid: false, discount: 0, reason: 'not_started' };
      }
    }
    if (coupon.end_date) {
      var end = new Date(coupon.end_date);
      if (now > end) {
        return { valid: false, discount: 0, reason: 'expired' };
      }
    }

    var subtotal = cart.subtotal || 0;
    if (coupon.min_order_total && subtotal < coupon.min_order_total) {
      return {
        valid: allowMinTotalFailure ? false : false,
        discount: 0,
        reason: 'min_total_not_met'
      };
    }

    var discount = 0;
    if (coupon.discount_type === 'percent_off') {
      discount = subtotal * (coupon.discount_value / 100);
    } else if (coupon.discount_type === 'amount_off') {
      discount = coupon.discount_value;
    } else {
      // For other types (free_item etc.), not implemented; treat as zero
      discount = 0;
    }

    if (discount > subtotal) {
      discount = subtotal;
    }

    return { valid: true, discount: Number(discount.toFixed(2)), reason: null };
  }

  _loadAvailablePickupSlots(dateIso, locationId) {
    var slots = this._getFromStorage('pickup_slots', []);
    var filtered = [];
    for (var i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (slot.location_id === locationId) {
        var slotDate = slot.date ? String(slot.date).slice(0, 10) : null;
        if (slotDate === dateIso) {
          filtered.push(slot);
        }
      }
    }

    // Determine earliest available
    var earliestIndex = -1;
    var earliestSort = Number.POSITIVE_INFINITY;
    for (var j = 0; j < filtered.length; j++) {
      var s = filtered[j];
      if (s.is_available && typeof s.sort_index === 'number') {
        if (s.sort_index < earliestSort) {
          earliestSort = s.sort_index;
          earliestIndex = j;
        }
      }
    }

    var result = [];
    for (var k = 0; k < filtered.length; k++) {
      var fs = filtered[k];
      result.push({
        slot_id: fs.id,
        time_label: fs.time_label,
        is_available: !!fs.is_available,
        is_earliest: k === earliestIndex
      });
    }
    return result;
  }

  _getDefaultPickupLocation() {
    var locations = this._getFromStorage('locations', []);
    if (!locations.length) return null;

    var preferredId = localStorage.getItem('preferred_pickup_location_id');
    var i;

    if (preferredId) {
      for (i = 0; i < locations.length; i++) {
        if (locations[i].id === preferredId && locations[i].is_active !== false) {
          return locations[i];
        }
      }
    }

    for (i = 0; i < locations.length; i++) {
      var loc = locations[i];
      if (loc.is_active !== false && loc.default_pickup_enabled) {
        return loc;
      }
    }

    for (i = 0; i < locations.length; i++) {
      if (locations[i].is_active !== false) {
        return locations[i];
      }
    }

    return locations[0];
  }

  _computeUpcoming7DaysForLocation(locationId) {
    var hours = this._getFromStorage('location_hours', []);
    var relevant = [];
    for (var i = 0; i < hours.length; i++) {
      if (hours[i].location_id === locationId) {
        relevant.push(hours[i]);
      }
    }

    var results = [];
    var today = new Date();
    for (var d = 0; d < 7; d++) {
      var date = new Date(today.getTime());
      date.setDate(today.getDate() + d);
      var dayOfWeek = this._getDayOfWeekString(date);
      var dateIso = this._isoDateOnly(date);

      var matched = null;
      for (var j = 0; j < relevant.length; j++) {
        var h = relevant[j];
        if (h.day_of_week === dayOfWeek) {
          var validFromOk = true;
          var validToOk = true;
          if (h.valid_from) {
            var vf = new Date(h.valid_from);
            if (date < vf) validFromOk = false;
          }
          if (h.valid_to) {
            var vt = new Date(h.valid_to);
            if (date > vt) validToOk = false;
          }
          if (validFromOk && validToOk) {
            matched = h;
            break;
          }
        }
      }

      if (!matched) {
        results.push({
          date: dateIso,
          day_of_week: dayOfWeek,
          open_time: null,
          close_time: null,
          is_closed: true
        });
      } else {
        results.push({
          date: dateIso,
          day_of_week: matched.day_of_week,
          open_time: matched.is_closed ? null : matched.open_time,
          close_time: matched.is_closed ? null : matched.close_time,
          is_closed: !!matched.is_closed
        });
      }
    }

    return results;
  }

  _validateSundaeConfiguration(sizeId, scoopFlavorIds, toppingIds, sauceIds, addOnIds, config) {
    var errors = [];
    var sizes = config.sizes || [];
    var sizeConf = null;
    for (var i = 0; i < sizes.length; i++) {
      if (sizes[i].id === sizeId) {
        sizeConf = sizes[i];
        break;
      }
    }
    if (!sizeConf) {
      errors.push('Invalid sundae size selected.');
    } else {
      var expectedScoops = sizeConf.scoop_count || 0;
      if (scoopFlavorIds.length !== expectedScoops) {
        errors.push('You must select exactly ' + expectedScoops + ' scoops.');
      }
    }

    var rules = config.rules || {};

    // Build flavor lookup
    var availableFlavors = config.available_flavors || [];
    var flavorMap = {};
    for (i = 0; i < availableFlavors.length; i++) {
      flavorMap[availableFlavors[i].id] = availableFlavors[i];
    }

    // Validate flavors exist
    for (i = 0; i < scoopFlavorIds.length; i++) {
      if (!flavorMap[scoopFlavorIds[i]]) {
        errors.push('Selected scoop flavor is not available.');
        break;
      }
    }

    if (rules.required_chocolate_flavor) {
      var hasChocolate = false;
      for (i = 0; i < scoopFlavorIds.length; i++) {
        var f = flavorMap[scoopFlavorIds[i]];
        if (!f) continue;
        var name = String(f.name || '');
        if ((f.flavor_category === 'chocolate') || name.toLowerCase().indexOf('chocolate') !== -1) {
          hasChocolate = true;
          break;
        }
      }
      if (!hasChocolate) {
        errors.push('At least one scoop must be a chocolate flavor.');
      }
    }

    // Toppings
    var toppingOptions = config.topping_options || [];
    var toppingMap = {};
    for (i = 0; i < toppingOptions.length; i++) {
      toppingMap[toppingOptions[i].id] = toppingOptions[i];
    }

    if (rules.max_toppings && toppingIds.length > rules.max_toppings) {
      errors.push('You may select at most ' + rules.max_toppings + ' toppings.');
    }

    for (i = 0; i < toppingIds.length; i++) {
      var t = toppingMap[toppingIds[i]];
      if (!t) {
        errors.push('One or more selected toppings are not available.');
        break;
      }
      if (rules.toppings_must_be_nut_free && t.contains_nuts) {
        errors.push('Selected toppings must be nut-free.');
        break;
      }
      if (rules.allowed_topping_max_price != null && typeof rules.allowed_topping_max_price !== 'undefined') {
        if (t.price > rules.allowed_topping_max_price) {
          errors.push('One or more toppings exceed the allowed price limit.');
          break;
        }
      }
    }

    // Sauces
    var sauceOptions = config.sauce_options || [];
    var sauceMap = {};
    for (i = 0; i < sauceOptions.length; i++) {
      sauceMap[sauceOptions[i].id] = sauceOptions[i];
    }

    for (i = 0; i < sauceIds.length; i++) {
      if (!sauceMap[sauceIds[i]]) {
        errors.push('One or more selected sauces are not available.');
        break;
      }
    }

    if (rules.require_chocolate_style_sauce) {
      var hasChocolateSauce = false;
      for (i = 0; i < sauceIds.length; i++) {
        var s = sauceMap[sauceIds[i]];
        if (s && s.is_chocolate_style) {
          hasChocolateSauce = true;
          break;
        }
      }
      if (!hasChocolateSauce) {
        errors.push('A chocolate-style sauce is required.');
      }
    }

    // Add-ons validation
    var addOnOptions = config.add_on_options || [];
    var addOnMap = {};
    for (i = 0; i < addOnOptions.length; i++) {
      addOnMap[addOnOptions[i].id] = addOnOptions[i];
    }
    for (i = 0; i < addOnIds.length; i++) {
      if (!addOnMap[addOnIds[i]]) {
        errors.push('One or more selected add-ons are not available.');
        break;
      }
    }

    return errors;
  }

  _buildCartItemDisplayName(item, flavor) {
    var base = flavor ? flavor.name : item.flavor_name || '';
    if (item.item_type === 'pint') {
      return base + ' Pint';
    }
    if (item.item_type === 'quart') {
      return base + ' Quart';
    }
    if (item.item_type === 'single_scoop') {
      return base + ' - Single Scoop ' + (item.serving_style === 'cone' ? 'Cone' : 'Cup');
    }
    if (item.item_type === 'custom_sundae') {
      return 'Custom Sundae';
    }
    if (item.item_type === 'gift_card') {
      return 'Gift Card';
    }
    if (item.item_type === 'catering_package') {
      return 'Catering Package';
    }
    return base || 'Item';
  }

  _getPickupTimeLabelFromCart(cart) {
    if (!cart.pickup_time_slot_id) return null;
    var slots = this._getFromStorage('pickup_slots', []);
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].id === cart.pickup_time_slot_id) {
        return slots[i].time_label || null;
      }
    }
    return null;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1. getHomePageData
  getHomePageData() {
    var homepageContent = this._getFromStorage('homepage_content', {});
    var flavors = this._getFromStorage('flavors', []);
    var activeFlavors = [];
    for (var i = 0; i < flavors.length; i++) {
      if (flavors[i].is_active !== false) {
        activeFlavors.push(flavors[i]);
      }
    }

    // Featured flavors: pick top by rating
    activeFlavors.sort(function (a, b) {
      var ra = a.average_rating || 0;
      var rb = b.average_rating || 0;
      return rb - ra;
    });
    var featuredFlavors = activeFlavors.slice(0, 4).map(function (f) {
      return {
        id: f.id,
        name: f.name,
        short_description: f.description || '',
        availability_type: f.availability_type,
        flavor_category: f.flavor_category || null,
        image_url: f.image_url || null,
        average_rating: f.average_rating || 0
      };
    });

    // Seasonal flavors
    var seasonalRaw = [];
    for (var j = 0; j < activeFlavors.length; j++) {
      var fl = activeFlavors[j];
      if (fl.availability_type === 'seasonal' || fl.availability_type === 'limited_time') {
        seasonalRaw.push(fl);
      }
    }
    var seasonalFlavors = seasonalRaw.map(function (f) {
      return {
        id: f.id,
        name: f.name,
        short_description: f.description || '',
        availability_type: f.availability_type,
        single_scoop_base_price: f.single_scoop_base_price || null,
        image_url: f.image_url || null
      };
    });

    var defaultLocation = this._getDefaultPickupLocation();
    var defaultLocationPayload = null;
    if (defaultLocation) {
      defaultLocationPayload = {
        id: defaultLocation.id,
        name: defaultLocation.name,
        address_line1: defaultLocation.address_line1 || '',
        city: defaultLocation.city || '',
        state: defaultLocation.state || '',
        today_open_time: defaultLocation.today_open_time || null,
        today_close_time: defaultLocation.today_close_time || null
      };
    }

    return {
      hero_tagline: homepageContent.hero_tagline || '',
      hero_subtitle: homepageContent.hero_subtitle || '',
      hero_image_url: homepageContent.hero_image_url || '',
      featured_flavors: featuredFlavors,
      seasonal_flavors: seasonalFlavors,
      default_pickup_location: defaultLocationPayload,
      rewards_teaser: homepageContent.rewards_teaser || '',
      catering_teaser: homepageContent.catering_teaser || ''
    };
  }

  // 2. getCartContext
  getCartContext() {
    var cart = this._getExistingCart();
    if (!cart) {
      return {
        has_active_cart: false,
        cart_id: null,
        item_count: 0,
        subtotal: 0,
        pickup_method: 'pickup',
        pickup_date: null,
        pickup_time_label: null,
        location: null
      };
    }

    var items = this._getCartItems(cart.id);
    var itemCount = 0;
    for (var i = 0; i < items.length; i++) {
      itemCount += items[i].quantity || 0;
    }

    var locations = this._getFromStorage('locations', []);
    var loc = null;
    for (i = 0; i < locations.length; i++) {
      if (locations[i].id === cart.location_id) {
        loc = locations[i];
        break;
      }
    }
    if (!loc) {
      loc = this._getDefaultPickupLocation();
    }

    var pickupDate = cart.pickup_date ? String(cart.pickup_date) : null;
    var pickupTimeLabel = this._getPickupTimeLabelFromCart(cart);

    return {
      has_active_cart: itemCount > 0,
      cart_id: cart.id,
      item_count: itemCount,
      subtotal: cart.subtotal || 0,
      pickup_method: cart.pickup_method || 'pickup',
      pickup_date: pickupDate,
      pickup_time_label: pickupTimeLabel,
      location: loc
        ? {
            id: loc.id,
            name: loc.name,
            city: loc.city || '',
            state: loc.state || ''
          }
        : null
    };
  }

  // 3. getOrderCategories
  getOrderCategories() {
    var menuItems = this._getFromStorage('menu_items', []);
    var categoriesMap = {};

    for (var i = 0; i < menuItems.length; i++) {
      var item = menuItems[i];
      if (item.is_active === false) continue;
      var key = item.order_category_key || item.display_category;
      if (!key) continue;
      if (!categoriesMap[key]) {
        categoriesMap[key] = {
          key: key,
          display_name: this._humanizeKey(key),
          description: '',
          order_category_key: key
        };
      }
    }

    var result = [];
    for (var k in categoriesMap) {
      if (Object.prototype.hasOwnProperty.call(categoriesMap, k)) {
        result.push(categoriesMap[k]);
      }
    }
    return result;
  }

  // 4. getOrderCategoryFilters
  getOrderCategoryFilters(categoryKey) {
    var containerTypes = [];
    if (categoryKey === 'pints_quarts') {
      containerTypes = [
        { id: 'pint', label: 'Pints' },
        { id: 'quart', label: 'Quarts' }
      ];
    } else if (categoryKey === 'single_scoops') {
      containerTypes = [
        { id: 'cup', label: 'Cups' },
        { id: 'cone', label: 'Cones' }
      ];
    }

    var dietaryTags = [
      { id: 'dairy_free', label: 'Dairy-Free' },
      { id: 'vegan', label: 'Vegan' },
      { id: 'gluten_free', label: 'Gluten-Free' },
      { id: 'nut_free', label: 'Nut-Free' }
    ];

    var priceRanges = [
      { id: 'under_5', label: 'Under $5', min_price: 0, max_price: 5 },
      { id: '5_to_7', label: '$5 - $7', min_price: 5, max_price: 7 },
      { id: '7_to_10', label: '$7 - $10', min_price: 7, max_price: 10 }
    ];

    var sortOptions = [
      { id: 'price_low_to_high', label: 'Price: Low to High' },
      { id: 'price_high_to_low', label: 'Price: High to Low' },
      { id: 'rating_high_to_low', label: 'Customer Rating: High to Low' }
    ];

    return {
      container_types: containerTypes,
      dietary_tags: dietaryTags,
      price_ranges: priceRanges,
      sort_options: sortOptions
    };
  }

  // 5. listOrderProducts
  listOrderProducts(categoryKey, filters, sortOptionId, page, pageSize) {
    filters = filters || {};
    sortOptionId = sortOptionId || 'price_low_to_high';
    page = page || 1;
    pageSize = pageSize || 20;

    var flavors = this._getFromStorage('flavors', []);
    var filtered = [];

    for (var i = 0; i < flavors.length; i++) {
      var f = flavors[i];
      if (f.is_active === false) continue;

      if (categoryKey === 'pints_quarts') {
        if (f.pint_price == null && f.quart_price == null) continue;
      } else if (categoryKey === 'single_scoops') {
        if (f.single_scoop_cup_price == null && f.single_scoop_cone_price == null) continue;
      }

      // dietary filters
      if (filters.dietary_tag_ids && filters.dietary_tag_ids.length) {
        var labels = f.dietary_labels || [];
        var allMatch = true;
        for (var d = 0; d < filters.dietary_tag_ids.length; d++) {
          if (labels.indexOf(filters.dietary_tag_ids[d]) === -1) {
            allMatch = false;
            break;
          }
        }
        if (!allMatch) continue;
      }

      // container + price filtering
      var containerIds = filters.container_type_ids || [];
      var candidatePrices = [];
      if (categoryKey === 'pints_quarts') {
        if (!containerIds.length || containerIds.indexOf('pint') !== -1) {
          if (typeof f.pint_price === 'number') candidatePrices.push(f.pint_price);
        }
        if (!containerIds.length || containerIds.indexOf('quart') !== -1) {
          if (typeof f.quart_price === 'number') candidatePrices.push(f.quart_price);
        }
      } else if (categoryKey === 'single_scoops') {
        if (!containerIds.length || containerIds.indexOf('cup') !== -1) {
          if (typeof f.single_scoop_cup_price === 'number') candidatePrices.push(f.single_scoop_cup_price);
        }
        if (!containerIds.length || containerIds.indexOf('cone') !== -1) {
          if (typeof f.single_scoop_cone_price === 'number') candidatePrices.push(f.single_scoop_cone_price);
        }
      }

      if (!candidatePrices.length) continue;
      var minPrice = Math.min.apply(null, candidatePrices);

      if (filters.min_unit_price != null && minPrice < filters.min_unit_price) {
        continue;
      }
      if (filters.max_unit_price != null && minPrice > filters.max_unit_price) {
        continue;
      }

      // Attach helper property for sorting
      f._order_unit_price = minPrice;
      filtered.push(f);
    }

    // Sorting
    filtered.sort(function (a, b) {
      if (sortOptionId === 'price_low_to_high') {
        return (a._order_unit_price || 0) - (b._order_unit_price || 0);
      }
      if (sortOptionId === 'price_high_to_low') {
        return (b._order_unit_price || 0) - (a._order_unit_price || 0);
      }
      if (sortOptionId === 'rating_high_to_low') {
        var ra = a.average_rating || 0;
        var rb = b.average_rating || 0;
        if (rb === ra) {
          var rc = (b.rating_count || 0) - (a.rating_count || 0);
          if (rc !== 0) return rc;
          return (a._order_unit_price || 0) - (b._order_unit_price || 0);
        }
        return rb - ra;
      }
      return 0;
    });

    var totalCount = filtered.length;
    var startIndex = (page - 1) * pageSize;
    var endIndex = startIndex + pageSize;
    var pageItems = filtered.slice(startIndex, endIndex);

    var products = [];
    for (i = 0; i < pageItems.length; i++) {
      var fl = pageItems[i];
      products.push({
        product_id: fl.id,
        flavor_id: fl.id,
        flavor: fl, // foreign key resolution
        name: fl.name,
        short_description: fl.description || '',
        availability_type: fl.availability_type,
        flavor_category: fl.flavor_category || null,
        dietary_labels: fl.dietary_labels || [],
        single_scoop_cup_price: fl.single_scoop_cup_price || null,
        single_scoop_cone_price: fl.single_scoop_cone_price || null,
        double_scoop_cup_price: fl.double_scoop_cup_price || null,
        double_scoop_cone_price: fl.double_scoop_cone_price || null,
        pint_price: fl.pint_price || null,
        quart_price: fl.quart_price || null,
        image_url: fl.image_url || null,
        average_rating: fl.average_rating || 0,
        rating_count: fl.rating_count || 0
      });
    }

    // Clean temporary property
    for (i = 0; i < filtered.length; i++) {
      delete filtered[i]._order_unit_price;
    }

    // Instrumentation for task completion tracking (task_1)
    try {
      var containerTypeIds = filters.container_type_ids || [];
      if (
        categoryKey === 'pints_quarts' &&
        Array.isArray(containerTypeIds) &&
        containerTypeIds.indexOf('pint') !== -1 &&
        sortOptionId === 'price_low_to_high'
      ) {
        localStorage.setItem(
          'task1_pintsFilterAndSort',
          JSON.stringify({
            categoryKey: categoryKey,
            filters: filters,
            sortOptionId: sortOptionId,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {}

    return {
      products: products,
      total_count: totalCount
    };
  }

  // 6. addFlavorToCart
  addFlavorToCart(flavorId, itemType, size, servingStyle, quantity, pickupDatetime) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    var flavors = this._getFromStorage('flavors', []);
    var flavor = null;
    for (var i = 0; i < flavors.length; i++) {
      if (flavors[i].id === flavorId) {
        flavor = flavors[i];
        break;
      }
    }
    if (!flavor || flavor.is_active === false) {
      return {
        success: false,
        cart_id: null,
        added_item: null,
        message: 'Flavor not found or inactive.'
      };
    }

    var unitPrice = null;
    if (itemType === 'pint' || size === 'pint') {
      unitPrice = flavor.pint_price;
    } else if (itemType === 'quart' || size === 'quart') {
      unitPrice = flavor.quart_price;
    } else if (itemType === 'single_scoop' && size === 'single_scoop') {
      if (servingStyle === 'cone') {
        unitPrice = flavor.single_scoop_cone_price;
      } else {
        unitPrice = flavor.single_scoop_cup_price;
      }
    } else if (itemType === 'single_scoop' && size === 'double_scoop') {
      if (servingStyle === 'cone') {
        unitPrice = flavor.double_scoop_cone_price;
      } else {
        unitPrice = flavor.double_scoop_cup_price;
      }
    }

    if (typeof unitPrice !== 'number') {
      return {
        success: false,
        cart_id: null,
        added_item: null,
        message: 'Pricing not available for selected configuration.'
      };
    }

    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items', []);

    var lineTotal = Number(unitPrice * quantity);
    var nowIso = new Date().toISOString();

    var cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: itemType,
      flavor_id: flavor.id,
      flavor_name: flavor.name,
      serving_style: servingStyle || 'none',
      size: size,
      quantity: quantity,
      unit_price: Number(unitPrice.toFixed(2)),
      line_total: Number(lineTotal.toFixed(2)),
      gift_card_purchase_id: null,
      catering_booking_request_id: null,
      customizations: null,
      pickup_datetime: pickupDatetime || null,
      created_at: nowIso,
      updated_at: nowIso
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    var displayName = this._buildCartItemDisplayName(cartItem, flavor);

    return {
      success: true,
      cart_id: cart.id,
      added_item: {
        cart_item_id: cartItem.id,
        display_name: displayName,
        quantity: cartItem.quantity,
        unit_price: cartItem.unit_price,
        line_total: cartItem.line_total
      },
      message: 'Item added to cart.'
    };
  }

  // 7. getCartSummary
  getCartSummary() {
    var cart = this._getOrCreateCart();
    var items = this._getCartItems(cart.id);

    var flavors = this._getFromStorage('flavors', []);
    var flavorMap = {};
    for (var i = 0; i < flavors.length; i++) {
      flavorMap[flavors[i].id] = flavors[i];
    }

    var giftCardPurchases = this._getFromStorage('gift_card_purchases', []);
    var giftCardMap = {};
    for (i = 0; i < giftCardPurchases.length; i++) {
      giftCardMap[giftCardPurchases[i].id] = giftCardPurchases[i];
    }

    var giftCardProducts = this._getFromStorage('gift_card_products', []);
    var giftCardProductMap = {};
    for (i = 0; i < giftCardProducts.length; i++) {
      giftCardProductMap[giftCardProducts[i].id] = giftCardProducts[i];
    }

    var cateringRequests = this._getFromStorage('catering_booking_requests', []);
    var cateringRequestMap = {};
    for (i = 0; i < cateringRequests.length; i++) {
      cateringRequestMap[cateringRequests[i].id] = cateringRequests[i];
    }

    var cateringPackages = this._getFromStorage('catering_packages', []);
    var cateringPackageMap = {};
    for (i = 0; i < cateringPackages.length; i++) {
      cateringPackageMap[cateringPackages[i].id] = cateringPackages[i];
    }

    var locations = this._getFromStorage('locations', []);
    var location = null;
    for (i = 0; i < locations.length; i++) {
      if (locations[i].id === cart.location_id) {
        location = locations[i];
        break;
      }
    }

    var pickupTimeLabel = this._getPickupTimeLabelFromCart(cart);

    var itemPayloads = [];
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      var fl = it.flavor_id ? flavorMap[it.flavor_id] : null;
      var displayName = this._buildCartItemDisplayName(it, fl);

      var pickupDisplay = it.pickup_datetime ? String(it.pickup_datetime) : null;
      var customSummary = null;
      if (it.customizations) {
        try {
          var c = JSON.parse(it.customizations);
          customSummary = JSON.stringify(c);
        } catch (e) {
          customSummary = it.customizations;
        }
      }

      var isGiftCard = !!it.gift_card_purchase_id;
      var isCatering = !!it.catering_booking_request_id;

      var giftPurchase = isGiftCard ? giftCardMap[it.gift_card_purchase_id] : null;
      var giftProduct = giftPurchase ? giftCardProductMap[giftPurchase.gift_card_product_id] : null;
      var cateringReq = isCatering ? cateringRequestMap[it.catering_booking_request_id] : null;
      var cateringPack = cateringReq ? cateringPackageMap[cateringReq.catering_package_id] : null;

      itemPayloads.push({
        cart_item_id: it.id,
        item_type: it.item_type,
        size: it.size,
        serving_style: it.serving_style,
        display_name: displayName,
        flavor_name: it.flavor_name || (fl ? fl.name : null),
        quantity: it.quantity,
        unit_price: it.unit_price,
        line_total: it.line_total,
        is_gift_card: isGiftCard,
        is_catering: isCatering,
        pickup_datetime_display: pickupDisplay,
        customizations_summary: customSummary,
        flavor: fl || null,
        gift_card_purchase: giftPurchase || null,
        gift_card_product: giftProduct || null,
        catering_booking_request: cateringReq || null,
        catering_package: cateringPack || null
      });
    }

    var couponDiscount = cart.coupon_discount || 0;

    return {
      cart: {
        id: cart.id,
        subtotal: cart.subtotal || 0,
        discount_total: cart.discount_total || 0,
        total: cart.total || 0,
        coupon_code: cart.coupon_code || null,
        coupon_discount: couponDiscount,
        pickup_method: cart.pickup_method || 'pickup',
        pickup_date: cart.pickup_date || null,
        pickup_time_label: pickupTimeLabel,
        location_name: location ? location.name : null
      },
      items: itemPayloads
    };
  }

  // 8. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    var cartItems = this._getFromStorage('cart_items', []);
    var item = null;
    var i;
    for (i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        item = cartItems[i];
        break;
      }
    }

    if (!item) {
      return {
        success: false,
        cart: { subtotal: 0, discount_total: 0, total: 0 },
        items: [],
        message: 'Cart item not found.'
      };
    }

    var cartId = item.cart_id;

    if (quantity <= 0) {
      // Remove item
      cartItems.splice(i, 1);
    } else {
      item.quantity = quantity;
      item.line_total = Number((item.unit_price * quantity).toFixed(2));
      item.updated_at = new Date().toISOString();
      cartItems[i] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    var cart = this._getExistingCart();
    if (!cart || cart.id !== cartId) {
      // Find exact cart
      var carts = this._getFromStorage('cart', []);
      for (i = 0; i < carts.length; i++) {
        if (carts[i].id === cartId) {
          cart = carts[i];
          break;
        }
      }
    }

    if (!cart) {
      return {
        success: false,
        cart: { subtotal: 0, discount_total: 0, total: 0 },
        items: [],
        message: 'Cart not found.'
      };
    }

    this._recalculateCartTotals(cart);

    var updatedItems = this._getCartItems(cart.id).map(function (ci) {
      return {
        cart_item_id: ci.id,
        quantity: ci.quantity,
        line_total: ci.line_total
      };
    });

    return {
      success: true,
      cart: {
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total
      },
      items: updatedItems,
      message: 'Cart item updated.'
    };
  }

  // 9. removeCartItem
  removeCartItem(cartItemId) {
    var cartItems = this._getFromStorage('cart_items', []);
    var itemIndex = -1;
    var cartId = null;
    for (var i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        itemIndex = i;
        cartId = cartItems[i].cart_id;
        break;
      }
    }

    if (itemIndex === -1) {
      return {
        success: false,
        cart: { subtotal: 0, discount_total: 0, total: 0 },
        remaining_item_count: 0,
        message: 'Cart item not found.'
      };
    }

    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    var carts = this._getFromStorage('cart', []);
    var cart = null;
    for (i = 0; i < carts.length; i++) {
      if (carts[i].id === cartId) {
        cart = carts[i];
        break;
      }
    }

    if (!cart) {
      return {
        success: false,
        cart: { subtotal: 0, discount_total: 0, total: 0 },
        remaining_item_count: 0,
        message: 'Cart not found.'
      };
    }

    this._recalculateCartTotals(cart);

    var remaining = 0;
    for (i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id) {
        remaining++;
      }
    }

    return {
      success: true,
      cart: {
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total
      },
      remaining_item_count: remaining,
      message: 'Item removed from cart.'
    };
  }

  // 10. applyCouponToCart
  applyCouponToCart(couponCode) {
    var cart = this._getOrCreateCart();
    var items = this._getCartItems(cart.id);

    var validation = this._validateCouponForCart(couponCode, cart, items, false);
    if (!validation.valid) {
      cart.coupon_code = null;
      cart.coupon_discount = 0;
      cart.discount_total = 0;
      this._saveCart(cart);
      this._recalculateCartTotals(cart);
      return {
        success: false,
        cart: {
          subtotal: cart.subtotal,
          discount_total: cart.discount_total,
          total: cart.total,
          coupon_code: cart.coupon_code,
          coupon_discount: cart.coupon_discount
        },
        message: 'Coupon is not valid: ' + (validation.reason || 'unknown reason')
      };
    }

    cart.coupon_code = couponCode;
    cart.coupon_discount = validation.discount;
    cart.discount_total = validation.discount;
    this._saveCart(cart);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: {
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total,
        coupon_code: cart.coupon_code,
        coupon_discount: cart.coupon_discount
      },
      message: 'Coupon applied.'
    };
  }

  // 11. getCartPickupOptions
  getCartPickupOptions() {
    var cart = this._getOrCreateCart();
    var locationId = cart.location_id;
    var location = null;
    var locations = this._getFromStorage('locations', []);
    for (var i = 0; i < locations.length; i++) {
      if (locations[i].id === locationId) {
        location = locations[i];
        break;
      }
    }
    if (!location) {
      location = this._getDefaultPickupLocation();
      if (location) {
        cart.location_id = location.id;
        this._saveCart(cart);
      }
    }

    var slots = this._getFromStorage('pickup_slots', []);
    var today = new Date();
    var todayIso = this._isoDateOnly(today);

    var dateMap = {};
    for (i = 0; i < slots.length; i++) {
      var slot = slots[i];
      if (!location || slot.location_id !== location.id) continue;
      var dateStr = String(slot.date).slice(0, 10);
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = [];
      }
      dateMap[dateStr].push(slot);
    }

    var dates = [];
    var dateKeys = Object.keys(dateMap).sort();
    for (i = 0; i < dateKeys.length; i++) {
      var dateKey = dateKeys[i];
      var slotList = dateMap[dateKey];
      slotList.sort(function (a, b) {
        return (a.sort_index || 0) - (b.sort_index || 0);
      });

      var earliestIndex = -1;
      var earliestSort = Number.POSITIVE_INFINITY;
      for (var j = 0; j < slotList.length; j++) {
        var s = slotList[j];
        if (s.is_available && typeof s.sort_index === 'number') {
          if (s.sort_index < earliestSort) {
            earliestSort = s.sort_index;
            earliestIndex = j;
          }
        }
      }

      var timeSlots = [];
      for (j = 0; j < slotList.length; j++) {
        var ss = slotList[j];
        timeSlots.push({
          slot_id: ss.id,
          time_label: ss.time_label,
          is_available: !!ss.is_available,
          is_earliest: j === earliestIndex
        });
      }

      var dateObj = this._parseDateOnly(dateKey);
      var label = dateKey;
      var diffDays = Math.round((dateObj - this._parseDateOnly(todayIso)) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) label = 'Today';
      else if (diffDays === 1) label = 'Tomorrow';

      dates.push({
        date: dateKey,
        is_today: dateKey === todayIso,
        label: label,
        time_slots: timeSlots
      });
    }

    var availableMethods = [
      { id: 'pickup', label: 'Pickup' }
    ];

    return {
      pickup_method: cart.pickup_method || 'pickup',
      available_methods: availableMethods,
      dates: dates
    };
  }

  // 12. setCartPickupDetails
  setCartPickupDetails(pickupMethod, pickupDate, pickupTimeSlotId) {
    var cart = this._getOrCreateCart();
    if (pickupMethod !== 'pickup' && pickupMethod !== 'delivery') {
      return {
        success: false,
        cart: {
          pickup_method: cart.pickup_method,
          pickup_date: cart.pickup_date,
          pickup_time_label: this._getPickupTimeLabelFromCart(cart)
        },
        message: 'Invalid pickup method.'
      };
    }

    var slots = this._getFromStorage('pickup_slots', []);
    var slot = null;
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].id === pickupTimeSlotId) {
        slot = slots[i];
        break;
      }
    }

    if (!slot) {
      return {
        success: false,
        cart: {
          pickup_method: cart.pickup_method,
          pickup_date: cart.pickup_date,
          pickup_time_label: this._getPickupTimeLabelFromCart(cart)
        },
        message: 'Pickup time slot not found.'
      };
    }

    var slotDate = String(slot.date).slice(0, 10);
    if (slotDate !== pickupDate) {
      return {
        success: false,
        cart: {
          pickup_method: cart.pickup_method,
          pickup_date: cart.pickup_date,
          pickup_time_label: this._getPickupTimeLabelFromCart(cart)
        },
        message: 'Pickup date does not match selected slot.'
      };
    }

    cart.pickup_method = pickupMethod;
    cart.pickup_date = pickupDate;
    cart.pickup_time_slot_id = pickupTimeSlotId;
    if (!cart.location_id) {
      cart.location_id = slot.location_id;
    }
    cart.updated_at = new Date().toISOString();
    this._saveCart(cart);

    return {
      success: true,
      cart: {
        pickup_method: cart.pickup_method,
        pickup_date: cart.pickup_date,
        pickup_time_label: slot.time_label || null
      },
      message: 'Pickup details updated.'
    };
  }

  // 13. getCheckoutSummary
  getCheckoutSummary() {
    var cart = this._getOrCreateCart();
    var items = this._getCartItems(cart.id);
    var flavors = this._getFromStorage('flavors', []);
    var flavorMap = {};
    for (var i = 0; i < flavors.length; i++) {
      flavorMap[flavors[i].id] = flavors[i];
    }

    var itemSummaries = [];
    for (i = 0; i < items.length; i++) {
      var it = items[i];
      var fl = it.flavor_id ? flavorMap[it.flavor_id] : null;
      var displayName = this._buildCartItemDisplayName(it, fl);
      itemSummaries.push({
        display_name: displayName,
        quantity: it.quantity,
        line_total: it.line_total
      });
    }

    var taxRate = this._safeNumber(localStorage.getItem('tax_rate'), 0);
    var taxTotal = Number(((cart.subtotal - (cart.discount_total || 0)) * taxRate).toFixed(2));
    if (taxTotal < 0) taxTotal = 0;

    var locations = this._getFromStorage('locations', []);
    var location = null;
    for (i = 0; i < locations.length; i++) {
      if (locations[i].id === cart.location_id) {
        location = locations[i];
        break;
      }
    }

    var pickupTimeLabel = this._getPickupTimeLabelFromCart(cart);

    var total = Number((cart.subtotal - (cart.discount_total || 0) + taxTotal).toFixed(2));

    return {
      items: itemSummaries,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      tax_total: taxTotal,
      total: total,
      coupon_code: cart.coupon_code || null,
      pickup_method: cart.pickup_method || 'pickup',
      pickup_date: cart.pickup_date || null,
      pickup_time_label: pickupTimeLabel,
      location_name: location ? location.name : null
    };
  }

  // 14. placeOrder
  placeOrder(customerName, customerEmail, customerPhone, paymentMethodToken) {
    var cart = this._getOrCreateCart();
    var cartItems = this._getCartItems(cart.id);

    var orders = this._getFromStorage('orders', []);
    var nowIso = new Date().toISOString();

    var orderItemsSnapshot = [];
    for (var i = 0; i < cartItems.length; i++) {
      orderItemsSnapshot.push(cartItems[i]);
    }

    var pickupTimeLabel = this._getPickupTimeLabelFromCart(cart);

    var paymentStatus = paymentMethodToken ? 'paid' : 'pending';
    var orderStatus = 'pending';

    var order = {
      id: this._generateId('order'),
      cart_id: cart.id,
      items: orderItemsSnapshot,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      total: cart.total || 0,
      coupon_code: cart.coupon_code || null,
      pickup_method: cart.pickup_method || 'pickup',
      pickup_date: cart.pickup_date || null,
      pickup_time_slot_id: cart.pickup_time_slot_id || null,
      location_id: cart.location_id || null,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      payment_status: paymentStatus,
      order_status: orderStatus,
      created_at: nowIso,
      updated_at: nowIso
    };

    orders.push(order);
    this._saveToStorage('orders', orders);

    var locations = this._getFromStorage('locations', []);
    var location = null;
    for (i = 0; i < locations.length; i++) {
      if (locations[i].id === order.location_id) {
        location = locations[i];
        break;
      }
    }

    return {
      success: true,
      order: {
        order_id: order.id,
        subtotal: order.subtotal,
        discount_total: order.discount_total,
        total: order.total,
        pickup_method: order.pickup_method,
        pickup_date: order.pickup_date,
        pickup_time_label: pickupTimeLabel,
        location_name: location ? location.name : null,
        payment_status: order.payment_status,
        order_status: order.order_status
      },
      message: 'Order placed.'
    };
  }

  // 15. getFlavorFilterOptions
  getFlavorFilterOptions() {
    var dietaryFilters = [
      { id: 'dairy_free', label: 'Dairy-Free' },
      { id: 'vegan', label: 'Vegan' },
      { id: 'gluten_free', label: 'Gluten-Free' },
      { id: 'nut_free', label: 'Nut-Free' }
    ];

    var availabilityFilters = [
      { id: 'standard', label: 'Standard' },
      { id: 'seasonal', label: 'Seasonal' },
      { id: 'limited_time', label: 'Limited Time' }
    ];

    var flavorCategories = [
      { id: 'chocolate', label: 'Chocolate' },
      { id: 'vanilla', label: 'Vanilla' },
      { id: 'fruit', label: 'Fruit' },
      { id: 'coffee', label: 'Coffee' },
      { id: 'nut', label: 'Nut' },
      { id: 'other', label: 'Other' }
    ];

    var priceRanges = [
      { id: 'under_4', label: 'Under $4', min_price: 0, max_price: 4 },
      { id: '4_to_6', label: '$4 - $6', min_price: 4, max_price: 6 },
      { id: '6_to_8', label: '$6 - $8', min_price: 6, max_price: 8 }
    ];

    var sortOptions = [
      { id: 'rating_high_to_low', label: 'Rating: High to Low' },
      { id: 'alphabetical', label: 'Alphabetical' },
      { id: 'price_low_to_high', label: 'Price: Low to High' }
    ];

    return {
      dietary_filters: dietaryFilters,
      availability_filters: availabilityFilters,
      flavor_categories: flavorCategories,
      price_ranges: priceRanges,
      sort_options: sortOptions
    };
  }

  // 16. listFlavors
  listFlavors(filters, sortOptionId, page, pageSize) {
    filters = filters || {};
    sortOptionId = sortOptionId || 'rating_high_to_low';
    page = page || 1;
    pageSize = pageSize || 24;

    var flavors = this._getFromStorage('flavors', []);
    var result = [];

    for (var i = 0; i < flavors.length; i++) {
      var f = flavors[i];
      if (f.is_active === false) continue;

      // dietary_filter_ids
      if (filters.dietary_filter_ids && filters.dietary_filter_ids.length) {
        var labels = f.dietary_labels || [];
        var okAll = true;
        for (var d = 0; d < filters.dietary_filter_ids.length; d++) {
          if (labels.indexOf(filters.dietary_filter_ids[d]) === -1) {
            okAll = false;
            break;
          }
        }
        if (!okAll) continue;
      }

      // availability_filter_ids
      if (filters.availability_filter_ids && filters.availability_filter_ids.length) {
        if (filters.availability_filter_ids.indexOf(f.availability_type) === -1) {
          continue;
        }
      }

      // flavor_category_ids
      if (filters.flavor_category_ids && filters.flavor_category_ids.length) {
        if (filters.flavor_category_ids.indexOf(f.flavor_category) === -1) {
          continue;
        }
      }

      // max_price_per_scoop
      if (filters.max_price_per_scoop != null) {
        var basePrice = f.single_scoop_base_price;
        if (typeof basePrice !== 'number') {
          // If no base price, exclude from max price filter
          continue;
        }
        if (basePrice > filters.max_price_per_scoop) continue;
      }

      // search_query
      if (filters.search_query) {
        var q = String(filters.search_query).toLowerCase();
        var name = String(f.name || '').toLowerCase();
        var desc = String(f.description || '').toLowerCase();
        if (name.indexOf(q) === -1 && desc.indexOf(q) === -1) {
          continue;
        }
      }

      result.push(f);
    }

    // Sorting
    result.sort(function (a, b) {
      if (sortOptionId === 'rating_high_to_low') {
        var ra = a.average_rating || 0;
        var rb = b.average_rating || 0;
        if (rb === ra) {
          return (b.rating_count || 0) - (a.rating_count || 0);
        }
        return rb - ra;
      }
      if (sortOptionId === 'alphabetical') {
        var na = (a.name || '').toLowerCase();
        var nb = (b.name || '').toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      }
      if (sortOptionId === 'price_low_to_high') {
        var pa = typeof a.single_scoop_base_price === 'number' ? a.single_scoop_base_price : Number.POSITIVE_INFINITY;
        var pb = typeof b.single_scoop_base_price === 'number' ? b.single_scoop_base_price : Number.POSITIVE_INFINITY;
        return pa - pb;
      }
      return 0;
    });

    var totalCount = result.length;
    var startIndex = (page - 1) * pageSize;
    var endIndex = startIndex + pageSize;
    var pageFlavors = result.slice(startIndex, endIndex);

    var payload = [];
    for (i = 0; i < pageFlavors.length; i++) {
      var fl = pageFlavors[i];
      payload.push({
        id: fl.id,
        name: fl.name,
        description: fl.description || '',
        availability_type: fl.availability_type,
        flavor_category: fl.flavor_category || null,
        dietary_labels: fl.dietary_labels || [],
        single_scoop_base_price: fl.single_scoop_base_price || null,
        single_scoop_cup_price: fl.single_scoop_cup_price || null,
        single_scoop_cone_price: fl.single_scoop_cone_price || null,
        calories_per_single_scoop: fl.calories_per_single_scoop || null,
        average_rating: fl.average_rating || 0,
        rating_count: fl.rating_count || 0,
        image_url: fl.image_url || null
      });
    }

    // Instrumentation for task completion tracking (task_4)
    try {
      var dietaryFilterIds = filters.dietary_filter_ids || [];
      if (
        Array.isArray(dietaryFilterIds) &&
        (dietaryFilterIds.indexOf('dairy_free') !== -1 || dietaryFilterIds.indexOf('vegan') !== -1)
      ) {
        localStorage.setItem(
          'task4_dairyFreeFlavorFilter',
          JSON.stringify({
            dietary_filter_ids: dietaryFilterIds,
            sortOptionId: sortOptionId,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {}

    // Instrumentation for task completion tracking (task_9)
    try {
      var availabilityFilterIds = filters.availability_filter_ids || [];
      if (
        Array.isArray(availabilityFilterIds) &&
        (availabilityFilterIds.indexOf('seasonal') !== -1 || availabilityFilterIds.indexOf('limited_time') !== -1) &&
        filters.max_price_per_scoop != null &&
        sortOptionId === 'rating_high_to_low'
      ) {
        localStorage.setItem(
          'task9_seasonalFlavorsFilterAndSort',
          JSON.stringify({
            availability_filter_ids: availabilityFilterIds,
            max_price_per_scoop: filters.max_price_per_scoop,
            sortOptionId: sortOptionId,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {}

    return {
      flavors: payload,
      total_count: totalCount
    };
  }

  // 17. getFlavorDetails
  getFlavorDetails(flavorId) {
    var flavors = this._getFromStorage('flavors', []);
    for (var i = 0; i < flavors.length; i++) {
      if (flavors[i].id === flavorId) {
        var f = flavors[i];
        return {
          id: f.id,
          name: f.name,
          description: f.description || '',
          availability_type: f.availability_type,
          flavor_category: f.flavor_category || null,
          dietary_labels: f.dietary_labels || [],
          is_dairy_free: !!f.is_dairy_free,
          is_vegan: !!f.is_vegan,
          contains_nuts: !!f.contains_nuts,
          ingredients: f.ingredients || '',
          calories_per_single_scoop: f.calories_per_single_scoop || null,
          single_scoop_base_price: f.single_scoop_base_price || null,
          single_scoop_cup_price: f.single_scoop_cup_price || null,
          single_scoop_cone_price: f.single_scoop_cone_price || null,
          double_scoop_cup_price: f.double_scoop_cup_price || null,
          double_scoop_cone_price: f.double_scoop_cone_price || null,
          pint_price: f.pint_price || null,
          quart_price: f.quart_price || null,
          average_rating: f.average_rating || 0,
          rating_count: f.rating_count || 0,
          image_url: f.image_url || null
        };
      }
    }
    return null;
  }

  // 18. getAvailablePickupSlotsForDate
  getAvailablePickupSlotsForDate(date) {
    var cart = this._getExistingCart();
    var location = null;
    var locations = this._getFromStorage('locations', []);

    if (cart && cart.location_id) {
      for (var i = 0; i < locations.length; i++) {
        if (locations[i].id === cart.location_id) {
          location = locations[i];
          break;
        }
      }
    }
    if (!location) {
      location = this._getDefaultPickupLocation();
    }

    var locationName = location ? location.name : null;
    var locationId = location ? location.id : null;

    var timeSlots = [];
    if (locationId) {
      timeSlots = this._loadAvailablePickupSlots(date, locationId);
    }

    return {
      date: date,
      location_name: locationName,
      time_slots: timeSlots
    };
  }

  // 19. getMenuSections
  getMenuSections() {
    var menuItems = this._getFromStorage('menu_items', []);
    var sectionsMap = {};

    for (var i = 0; i < menuItems.length; i++) {
      var item = menuItems[i];
      if (item.is_active === false) continue;
      var key = item.display_category || 'other';
      if (!sectionsMap[key]) {
        sectionsMap[key] = {
          section_key: key,
          section_name: this._humanizeKey(key),
          section_description: '',
          starting_price: item.base_price || 0,
          items: []
        };
      }

      var section = sectionsMap[key];
      if (item.base_price != null && (section.starting_price === 0 || item.base_price < section.starting_price)) {
        section.starting_price = item.base_price;
      }

      section.items.push({
        id: item.id,
        name: item.name,
        description: item.description || '',
        display_category: item.display_category || null,
        type: item.type,
        page_filename: item.page_filename || null,
        base_price: item.base_price || 0,
        image_url: item.image_url || null,
        is_highlighted: !!item.is_highlighted
      });
    }

    var sections = [];
    for (var key in sectionsMap) {
      if (Object.prototype.hasOwnProperty.call(sectionsMap, key)) {
        sections.push(sectionsMap[key]);
      }
    }

    return sections;
  }

  // 20. getSundaeBuilderConfig
  getSundaeBuilderConfig() {
    // Sizes config is static (business rules configuration, not domain data)
    var sizes = [
      { id: 'regular_2_scoops', label: 'Regular (2 scoops)', scoop_count: 2, base_price: 0 },
      { id: 'kids_1_scoop', label: 'Kids (1 scoop)', scoop_count: 1, base_price: 0 }
    ];

    var flavors = this._getFromStorage('flavors', []);
    var availableFlavors = [];
    for (var i = 0; i < flavors.length; i++) {
      if (flavors[i].is_active === false) continue;
      availableFlavors.push({
        id: flavors[i].id,
        name: flavors[i].name,
        flavor_category: flavors[i].flavor_category || null,
        dietary_labels: flavors[i].dietary_labels || []
      });
    }

    var toppingsRaw = this._getFromStorage('topping_options', []);
    var toppingOptions = [];
    var sauceOptions = [];
    var addOnOptions = [];
    for (i = 0; i < toppingsRaw.length; i++) {
      var t = toppingsRaw[i];
      if (t.is_active === false) continue;
      var base = {
        id: t.id,
        name: t.name,
        category: t.category,
        price: t.price,
        contains_nuts: t.contains_nuts,
        image_url: t.image_url || null
      };
      if (t.category === 'topping') {
        toppingOptions.push(base);
      } else if (t.category === 'sauce') {
        sauceOptions.push({
          id: t.id,
          name: t.name,
          category: t.category,
          price: t.price,
          is_chocolate_style: !!t.is_chocolate_style
        });
      } else if (t.category === 'add_on') {
        addOnOptions.push({
          id: t.id,
          name: t.name,
          category: t.category,
          price: t.price
        });
      }
    }

    if (sauceOptions.length === 0) {
      sauceOptions.push({
        id: 'default_chocolate_sauce',
        name: 'Chocolate Sauce',
        category: 'sauce',
        price: 0,
        is_chocolate_style: true
      });
    }

    var rules = {
      max_toppings: 10,
      required_chocolate_flavor: false,
      allowed_topping_max_price: null,
      toppings_must_be_nut_free: false,
      require_chocolate_style_sauce: false
    };

    return {
      sizes: sizes,
      available_flavors: availableFlavors,
      topping_options: toppingOptions,
      sauce_options: sauceOptions,
      add_on_options: addOnOptions,
      rules: rules
    };
  }

  // 21. createCustomSundaeInCart
  createCustomSundaeInCart(size, scoopFlavorIds, toppingIds, sauceIds, addOnIds, specialInstructions, quantity) {
    quantity = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    scoopFlavorIds = scoopFlavorIds || [];
    toppingIds = toppingIds || [];
    sauceIds = sauceIds || [];
    addOnIds = addOnIds || [];

    var config = this.getSundaeBuilderConfig();
    var errors = this._validateSundaeConfiguration(size, scoopFlavorIds, toppingIds, sauceIds, addOnIds, config);
    if (errors.length) {
      return {
        success: false,
        validation_errors: errors,
        cart_id: null,
        added_item_id: null,
        message: 'Sundae configuration is not valid.'
      };
    }

    // Build lookup maps
    var flavorMap = {};
    for (var i = 0; i < config.available_flavors.length; i++) {
      flavorMap[config.available_flavors[i].id] = config.available_flavors[i];
    }

    var toppingMap = {};
    for (i = 0; i < config.topping_options.length; i++) {
      toppingMap[config.topping_options[i].id] = config.topping_options[i];
    }

    var sauceMap = {};
    for (i = 0; i < config.sauce_options.length; i++) {
      sauceMap[config.sauce_options[i].id] = config.sauce_options[i];
    }

    var addOnMap = {};
    for (i = 0; i < config.add_on_options.length; i++) {
      addOnMap[config.add_on_options[i].id] = config.add_on_options[i];
    }

    var sizeConf = null;
    for (i = 0; i < config.sizes.length; i++) {
      if (config.sizes[i].id === size) {
        sizeConf = config.sizes[i];
        break;
      }
    }

    var basePrice = sizeConf ? sizeConf.base_price || 0 : 0;
    var toppingsPrice = 0;
    for (i = 0; i < toppingIds.length; i++) {
      var t = toppingMap[toppingIds[i]];
      if (t) toppingsPrice += t.price || 0;
    }
    var saucesPrice = 0;
    for (i = 0; i < sauceIds.length; i++) {
      var s = sauceMap[sauceIds[i]];
      if (s) saucesPrice += s.price || 0;
    }
    var addOnsPrice = 0;
    for (i = 0; i < addOnIds.length; i++) {
      var a = addOnMap[addOnIds[i]];
      if (a) addOnsPrice += a.price || 0;
    }

    var unitPrice = Number((basePrice + toppingsPrice + saucesPrice + addOnsPrice).toFixed(2));
    var lineTotal = Number((unitPrice * quantity).toFixed(2));

    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items', []);
    var nowIso = new Date().toISOString();

    var customizations = {
      size: size,
      scoop_flavor_ids: scoopFlavorIds,
      topping_ids: toppingIds,
      sauce_ids: sauceIds,
      add_on_ids: addOnIds,
      special_instructions: specialInstructions || ''
    };

    var cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'custom_sundae',
      flavor_id: null,
      flavor_name: null,
      serving_style: 'none',
      size: 'regular_2_scoops',
      quantity: quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
      gift_card_purchase_id: null,
      catering_booking_request_id: null,
      customizations: JSON.stringify(customizations),
      pickup_datetime: null,
      created_at: nowIso,
      updated_at: nowIso
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      validation_errors: [],
      cart_id: cart.id,
      added_item_id: cartItem.id,
      message: 'Custom sundae added to cart.'
    };
  }

  // 22. getGiftCardOptions
  getGiftCardOptions() {
    var products = this._getFromStorage('gift_card_products', []);
    var result = [];
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      if (p.is_active === false) continue;
      result.push({
        id: p.id,
        name: p.name,
        type: p.type,
        description: p.description || '',
        min_amount: p.min_amount || null,
        max_amount: p.max_amount || null,
        default_amount: p.default_amount || null,
        delivery_methods_allowed: p.delivery_methods_allowed || [],
        image_url: p.image_url || null
      });
    }
    return result;
  }

  // 23. addGiftCardToCart
  addGiftCardToCart(giftCardProductId, amount, deliveryMethod, recipientName, recipientEmail, senderName, message, deliveryDate) {
    var products = this._getFromStorage('gift_card_products', []);
    var product = null;
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === giftCardProductId) {
        product = products[i];
        break;
      }
    }
    if (!product || product.is_active === false) {
      return {
        success: false,
        gift_card_purchase_id: null,
        cart_id: null,
        message: 'Gift card product not found or inactive.'
      };
    }

    amount = this._safeNumber(amount, 0);
    if (amount <= 0) {
      return {
        success: false,
        gift_card_purchase_id: null,
        cart_id: null,
        message: 'Invalid gift card amount.'
      };
    }

    if (product.min_amount != null && amount < product.min_amount) {
      return {
        success: false,
        gift_card_purchase_id: null,
        cart_id: null,
        message: 'Amount is below minimum allowed.'
      };
    }

    if (product.max_amount != null && amount > product.max_amount) {
      return {
        success: false,
        gift_card_purchase_id: null,
        cart_id: null,
        message: 'Amount exceeds maximum allowed.'
      };
    }

    var methodsAllowed = product.delivery_methods_allowed || [];
    if (methodsAllowed.length && methodsAllowed.indexOf(deliveryMethod) === -1) {
      return {
        success: false,
        gift_card_purchase_id: null,
        cart_id: null,
        message: 'Delivery method not allowed for this gift card.'
      };
    }

    if (deliveryMethod === 'email' && !recipientEmail) {
      return {
        success: false,
        gift_card_purchase_id: null,
        cart_id: null,
        message: 'Recipient email is required for email delivery.'
      };
    }

    var purchases = this._getFromStorage('gift_card_purchases', []);
    var nowIso = new Date().toISOString();

    var purchase = {
      id: this._generateId('gift_card_purchase'),
      gift_card_product_id: product.id,
      amount: amount,
      delivery_method: deliveryMethod,
      recipient_name: recipientName,
      recipient_email: recipientEmail || null,
      sender_name: senderName || null,
      message: message || null,
      delivery_date: deliveryDate,
      status: 'pending',
      created_at: nowIso
    };

    purchases.push(purchase);
    this._saveToStorage('gift_card_purchases', purchases);

    var cart = this._getOrCreateCart();
    var cartItems = this._getFromStorage('cart_items', []);

    var cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'gift_card',
      flavor_id: null,
      flavor_name: null,
      serving_style: 'none',
      size: 'other',
      quantity: 1,
      unit_price: amount,
      line_total: amount,
      gift_card_purchase_id: purchase.id,
      catering_booking_request_id: null,
      customizations: null,
      pickup_datetime: null,
      created_at: nowIso,
      updated_at: nowIso
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      gift_card_purchase_id: purchase.id,
      cart_id: cart.id,
      message: 'Gift card added to cart.'
    };
  }

  // 24. getRewardsProgramDetails
  getRewardsProgramDetails() {
    var details = this._getFromStorage('rewards_program_details', {});
    return {
      headline: details.headline || '',
      description: details.description || '',
      benefits: details.benefits || [],
      how_it_works: details.how_it_works || []
    };
  }

  // 25. enrollInLoyaltyProgram
  enrollInLoyaltyProgram(firstName, lastName, email, mobilePhone, favoriteFlavorCategory, emailOptIn, smsOptIn) {
    if (!firstName || !lastName || !email || !mobilePhone) {
      return {
        success: false,
        enrollment_id: null,
        message: 'Missing required fields.'
      };
    }

    var enrollments = this._getFromStorage('loyalty_enrollments', []);
    var nowIso = new Date().toISOString();

    var enrollment = {
      id: this._generateId('loyalty_enrollment'),
      first_name: firstName,
      last_name: lastName,
      email: email,
      mobile_phone: mobilePhone,
      favorite_flavor_category: favoriteFlavorCategory || null,
      email_opt_in: !!emailOptIn,
      sms_opt_in: !!smsOptIn,
      created_at: nowIso
    };

    enrollments.push(enrollment);
    this._saveToStorage('loyalty_enrollments', enrollments);

    return {
      success: true,
      enrollment_id: enrollment.id,
      message: 'Enrolled in loyalty program.'
    };
  }

  // 26. listCateringPackages
  listCateringPackages(filters, sortOptionId) {
    filters = filters || {};
    sortOptionId = sortOptionId || 'price_low_to_high';

    var packages = this._getFromStorage('catering_packages', []);
    var result = [];

    for (var i = 0; i < packages.length; i++) {
      var p = packages[i];
      if (p.is_active === false) continue;

      if (filters.category && p.category !== filters.category) continue;
      if (filters.min_guests && (p.max_guests != null ? p.max_guests < filters.min_guests : p.min_guests > filters.min_guests)) continue;
      if (filters.max_price && p.price > filters.max_price) continue;

      result.push(p);
    }

    result.sort(function (a, b) {
      if (sortOptionId === 'price_low_to_high') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortOptionId === 'price_high_to_low') {
        return (b.price || 0) - (a.price || 0);
      }
      return 0;
    });

    var payload = [];
    for (i = 0; i < result.length; i++) {
      var p2 = result[i];
      payload.push({
        id: p2.id,
        name: p2.name,
        category: p2.category,
        price: p2.price,
        min_guests: p2.min_guests,
        max_guests: p2.max_guests || null,
        short_description: p2.description || '',
        image_url: p2.image_url || null
      });
    }

    // Instrumentation for task completion tracking (task_6)
    try {
      if (typeof filters.category !== 'undefined' && filters.category !== null && sortOptionId === 'price_low_to_high') {
        localStorage.setItem(
          'task6_kidsPackagesFilterAndSort',
          JSON.stringify({
            filters: filters,
            sortOptionId: sortOptionId,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {}

    return {
      packages: payload,
      total_count: result.length
    };
  }

  // 27. getCateringPackageDetails
  getCateringPackageDetails(cateringPackageId) {
    var packages = this._getFromStorage('catering_packages', []);
    for (var i = 0; i < packages.length; i++) {
      if (packages[i].id === cateringPackageId) {
        var p = packages[i];
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          min_guests: p.min_guests,
          max_guests: p.max_guests || null,
          description: p.description || '',
          included_items: p.included_items || [],
          notes: p.notes || '',
          image_url: p.image_url || null
        };
      }
    }
    return null;
  }

  // 28. requestCateringBooking
  requestCateringBooking(cateringPackageId, eventType, guestCount, eventDateTime, specialRequests) {
    var packages = this._getFromStorage('catering_packages', []);
    var pkg = null;
    for (var i = 0; i < packages.length; i++) {
      if (packages[i].id === cateringPackageId) {
        pkg = packages[i];
        break;
      }
    }

    if (!pkg || pkg.is_active === false) {
      return {
        success: false,
        booking_request_id: null,
        status: null,
        message: 'Catering package not found or inactive.'
      };
    }

    guestCount = this._safeNumber(guestCount, 0);
    if (guestCount <= 0) {
      return {
        success: false,
        booking_request_id: null,
        status: null,
        message: 'Guest count must be positive.'
      };
    }

    if (guestCount < pkg.min_guests) {
      return {
        success: false,
        booking_request_id: null,
        status: null,
        message: 'Guest count below package minimum.'
      };
    }

    if (pkg.max_guests && guestCount > pkg.max_guests) {
      return {
        success: false,
        booking_request_id: null,
        status: null,
        message: 'Guest count exceeds package maximum.'
      };
    }

    var requests = this._getFromStorage('catering_booking_requests', []);
    var nowIso = new Date().toISOString();

    var request = {
      id: this._generateId('catering_booking_request'),
      catering_package_id: pkg.id,
      event_type: eventType,
      guest_count: guestCount,
      event_datetime: eventDateTime,
      special_requests: specialRequests || null,
      status: 'submitted',
      created_at: nowIso
    };

    requests.push(request);
    this._saveToStorage('catering_booking_requests', requests);

    return {
      success: true,
      booking_request_id: request.id,
      status: request.status,
      message: 'Catering booking request submitted.'
    };
  }

  // 29. listLocations
  listLocations() {
    var locations = this._getFromStorage('locations', []);
    var preferredId = localStorage.getItem('preferred_pickup_location_id');

    var today = new Date();
    var todayDow = this._getDayOfWeekString(today);
    var hours = this._getFromStorage('location_hours', []);

    var locationHoursMap = {};
    for (var i = 0; i < hours.length; i++) {
      var h = hours[i];
      if (!locationHoursMap[h.location_id]) {
        locationHoursMap[h.location_id] = {};
      }
      if (!locationHoursMap[h.location_id][h.day_of_week]) {
        locationHoursMap[h.location_id][h.day_of_week] = h;
      }
    }

    var payload = [];
    for (i = 0; i < locations.length; i++) {
      var loc = locations[i];
      if (loc.is_active === false) continue;

      var todayOpen = loc.today_open_time || null;
      var todayClose = loc.today_close_time || null;
      var perLoc = locationHoursMap[loc.id];
      if ((!todayOpen || !todayClose) && perLoc && perLoc[todayDow] && !perLoc[todayDow].is_closed) {
        todayOpen = perLoc[todayDow].open_time;
        todayClose = perLoc[todayDow].close_time;
      }

      payload.push({
        id: loc.id,
        name: loc.name,
        address_line1: loc.address_line1 || '',
        address_line2: loc.address_line2 || '',
        city: loc.city || '',
        state: loc.state || '',
        postal_code: loc.postal_code || '',
        phone: loc.phone || '',
        today_open_time: todayOpen,
        today_close_time: todayClose,
        default_pickup_enabled: !!loc.default_pickup_enabled,
        is_default_pickup_location: preferredId ? loc.id === preferredId : !!loc.default_pickup_enabled
      });
    }

    return { locations: payload };
  }

  // 30. setPreferredPickupLocation
  setPreferredPickupLocation(locationId) {
    var locations = this._getFromStorage('locations', []);
    var location = null;
    for (var i = 0; i < locations.length; i++) {
      if (locations[i].id === locationId) {
        location = locations[i];
        break;
      }
    }

    if (!location) {
      return {
        success: false,
        location: null,
        message: 'Location not found.'
      };
    }

    localStorage.setItem('preferred_pickup_location_id', location.id);

    // Update current cart
    var cart = this._getExistingCart();
    if (cart) {
      cart.location_id = location.id;
      cart.updated_at = new Date().toISOString();
      this._saveCart(cart);
    }

    return {
      success: true,
      location: {
        id: location.id,
        name: location.name,
        city: location.city || '',
        state: location.state || ''
      },
      message: 'Preferred pickup location updated.'
    };
  }

  // 31. getLocationDetails
  getLocationDetails(locationId) {
    var locations = this._getFromStorage('locations', []);
    var location = null;
    for (var i = 0; i < locations.length; i++) {
      if (locations[i].id === locationId) {
        location = locations[i];
        break;
      }
    }
    if (!location) {
      return {
        location: null,
        weekly_hours: [],
        upcoming_7_days: []
      };
    }

    // Instrumentation for task completion tracking (task_8)
    try {
      if (location && location.name === 'Downtown Main Street') {
        localStorage.setItem(
          'task8_downtownLocationViewed',
          JSON.stringify({
            location_id: location.id,
            name: location.name,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {}

    var hours = this._getFromStorage('location_hours', []);
    var weekly = [];
    for (i = 0; i < hours.length; i++) {
      var h = hours[i];
      if (h.location_id === location.id) {
        weekly.push({
          day_of_week: h.day_of_week,
          open_time: h.is_closed ? null : h.open_time,
          close_time: h.is_closed ? null : h.close_time,
          is_closed: !!h.is_closed
        });
      }
    }

    var upcoming = this._computeUpcoming7DaysForLocation(location.id);

    return {
      location: {
        id: location.id,
        name: location.name,
        address_line1: location.address_line1 || '',
        address_line2: location.address_line2 || '',
        city: location.city || '',
        state: location.state || '',
        postal_code: location.postal_code || '',
        phone: location.phone || '',
        email: location.email || '',
        map_url: location.map_url || ''
      },
      weekly_hours: weekly,
      upcoming_7_days: upcoming
    };
  }

  // 32. getContactSubjects
  getContactSubjects() {
    return [
      { id: 'allergy_or_ingredient_question', label: 'Allergy or Ingredient Question' },
      { id: 'general_question', label: 'General Question' },
      { id: 'catering_inquiry', label: 'Catering Inquiry' },
      { id: 'feedback', label: 'Feedback' },
      { id: 'other', label: 'Other' }
    ];
  }

  // 33. submitContactMessage
  submitContactMessage(name, email, subject, message) {
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        contact_message_id: null,
        message_text: 'Missing required fields.'
      };
    }

    var messages = this._getFromStorage('contact_messages', []);
    var nowIso = new Date().toISOString();

    var record = {
      id: this._generateId('contact_message'),
      name: name,
      email: email,
      subject: subject,
      message: message,
      created_at: nowIso,
      status: 'received'
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      contact_message_id: record.id,
      message_text: 'Your message has been received.'
    };
  }

  // 34. getStaticPageContent
  getStaticPageContent(pageKey) {
    var pages = this._getFromStorage('static_pages', []);
    for (var i = 0; i < pages.length; i++) {
      if (pages[i].pageKey === pageKey) {
        return {
          title: pages[i].title || '',
          body_html: pages[i].body_html || '',
          last_updated: pages[i].last_updated || null
        };
      }
    }

    return {
      title: '',
      body_html: '',
      last_updated: null
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