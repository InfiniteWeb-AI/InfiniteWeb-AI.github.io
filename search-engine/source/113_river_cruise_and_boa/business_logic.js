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
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- STORAGE HELPERS ----------------------

  _initStorage() {
    const ensureArray = (key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };
    const ensureObject = (key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    };
    const ensureValue = (key, value) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    };

    // Core data tables
    ensureArray('categories'); // Category
    ensureArray('departure_locations'); // DepartureLocation
    ensureArray('cruise_tours'); // CruiseTour
    ensureArray('time_slots'); // TimeSlot
    ensureObject('cruise_tour_extras'); // map: { [cruiseTourId]: extras[] }

    // Cart & cart items (single active cart)
    if (localStorage.getItem('cart') === null) {
      // Store null initially; _getOrCreateCart will create on demand
      localStorage.setItem('cart', 'null');
    }
    ensureArray('cart_items'); // CartItem[]

    // Gift cards & promos
    ensureArray('gift_card_templates'); // GiftCardTemplate[]
    ensureArray('gift_card_items'); // GiftCardItem[]
    ensureArray('promo_codes'); // PromoCode[]

    // Booking orders
    ensureArray('booking_orders'); // BookingOrder[]
    ensureArray('booking_items'); // BookingItem[]

    // CMS / content
    ensureObject('home_content');
    ensureObject('about_page_content');
    ensureObject('contact_page_content');
    ensureArray('faq_entries');
    ensureObject('terms_and_conditions_content');
    ensureObject('privacy_policy_content');
    ensureObject('cancellation_policy_content');
    ensureArray('contact_form_submissions');

    // ID counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, fallback) {
    const data = localStorage.getItem(key);
    if (data === null || typeof data === 'undefined') {
      return typeof fallback === 'undefined' ? null : fallback;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof fallback === 'undefined' ? null : fallback;
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

  // ---------------------- GENERIC HELPERS ----------------------

  _roundCurrency(value) {
    const num = Number(value) || 0;
    return Number(num.toFixed(2));
  }

  _parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _getDayOfWeekFromDate(dateStr) {
    // returns 'monday'...'sunday'
    const d = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(d.getTime())) return null;
    const dayIndex = d.getUTCDay(); // 0=Sunday
    const map = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return map[dayIndex] || null;
  }

  _getDayOfWeekLabel(dayId) {
    if (!dayId) return '';
    return dayId.charAt(0).toUpperCase() + dayId.slice(1);
  }

  _toTitleCase(str) {
    if (!str) return '';
    return str.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }

  // ---------------------- CART HELPERS ----------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || typeof cart !== 'object') {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem IDs
        created_at: now,
        updated_at: now,
        subtotal_amount: 0,
        discount_amount: 0,
        total_amount: 0,
        applied_promo_code: null
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _validateAndApplyPromoCode(promoCode, cart, cartItems) {
    const result = {
      success: false,
      message: '',
      discount_amount: 0
    };

    if (!promoCode) {
      cart.applied_promo_code = null;
      cart.discount_amount = 0;
      return result;
    }

    const promoCodes = this._getFromStorage('promo_codes', []);
    const now = new Date();

    const promo = promoCodes.find((p) => {
      if (!p || !p.is_active) return false;
      if (!p.code) return false;
      if (String(p.code).toLowerCase() !== String(promoCode).toLowerCase()) return false;
      if (p.valid_from) {
        const from = new Date(p.valid_from);
        if (!isNaN(from.getTime()) && now < from) return false;
      }
      if (p.valid_to) {
        const to = new Date(p.valid_to);
        if (!isNaN(to.getTime()) && now > to) return false;
      }
      return true;
    });

    if (!promo) {
      cart.applied_promo_code = null;
      cart.discount_amount = 0;
      result.message = 'Invalid or expired promo code.';
      return result;
    }

    // Determine eligible items
    let eligibleItems = [];
    const subtotal = Number(cart.subtotal_amount) || 0;

    if (promo.applies_to_scope === 'entire_cart') {
      eligibleItems = cartItems.slice();
    } else if (promo.applies_to_scope === 'tour_only') {
      eligibleItems = cartItems.filter((i) => i.item_type === 'tour_booking' || i.item_type === 'charter_booking');
    } else if (promo.applies_to_scope === 'gift_card_only') {
      eligibleItems = cartItems.filter((i) => i.item_type === 'gift_card');
    } else if (promo.applies_to_scope === 'specific_category' || promo.applies_to_scope === 'specific_product') {
      const cruises = this._getFromStorage('cruise_tours', []);
      eligibleItems = cartItems.filter((i) => {
        if (!i.cruise_tour_id) return false;
        const cruise = cruises.find((c) => c.id === i.cruise_tour_id);
        if (!cruise) return false;
        if (promo.applies_to_scope === 'specific_category') {
          if (!promo.applicable_category_ids || !promo.applicable_category_ids.length) return false;
          if (!cruise.categories || !cruise.categories.length) return false;
          return cruise.categories.some((catId) => promo.applicable_category_ids.indexOf(catId) !== -1);
        } else {
          if (!promo.applicable_product_ids || !promo.applicable_product_ids.length) return false;
          return promo.applicable_product_ids.indexOf(cruise.id) !== -1;
        }
      });
    }

    const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + (Number(item.line_subtotal) || 0), 0);

    if (promo.min_cart_total && subtotal < promo.min_cart_total) {
      cart.applied_promo_code = null;
      cart.discount_amount = 0;
      result.message = 'Promo code conditions not met.';
      return result;
    }

    if (eligibleSubtotal <= 0) {
      cart.applied_promo_code = null;
      cart.discount_amount = 0;
      result.message = 'Promo code not applicable to selected items.';
      return result;
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = eligibleSubtotal * (promo.discount_value / 100);
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
      if (discount > eligibleSubtotal) {
        discount = eligibleSubtotal;
      }
    }

    discount = this._roundCurrency(discount);

    cart.applied_promo_code = promo.code;
    cart.discount_amount = discount;

    result.success = true;
    result.message = 'Promo code applied.';
    result.discount_amount = discount;
    return result;
  }

  _recalculateCartTotals(cart) {
    const allItems = this._getFromStorage('cart_items', []);
    const cartItems = allItems.filter((i) => i.cart_id === cart.id);

    const subtotal = cartItems.reduce((sum, item) => sum + (Number(item.line_subtotal) || 0), 0);
    cart.subtotal_amount = this._roundCurrency(subtotal);

    let promoResult = { success: false, message: '', discount_amount: 0 };
    if (cart.applied_promo_code) {
      promoResult = this._validateAndApplyPromoCode(cart.applied_promo_code, cart, cartItems);
    } else {
      cart.discount_amount = 0;
    }

    const total = Math.max(0, cart.subtotal_amount - (cart.discount_amount || 0));
    cart.total_amount = this._roundCurrency(total);
    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart', cart);
    return { cart, cartItems, promoResult };
  }

  _buildCartResponse(cart) {
    const allItems = this._getFromStorage('cart_items', []);
    const cartItems = allItems.filter((i) => i.cart_id === cart.id);
    const cruises = this._getFromStorage('cruise_tours', []);
    const giftCards = this._getFromStorage('gift_card_items', []);

    const itemsWithRefs = cartItems.map((item) => {
      const resultItem = Object.assign({}, item);
      resultItem.cart_item_id = item.id;

      if (item.cruise_tour_id) {
        const cruise = cruises.find((c) => c.id === item.cruise_tour_id) || null;
        resultItem.cruise_tour = cruise;
        if (cruise) {
          resultItem.name = cruise.name;
          resultItem.short_description = cruise.short_description || '';
          resultItem.currency = cruise.currency;
          resultItem.product_type = cruise.product_type;
          resultItem.pricing_model = cruise.pricing_model;
        }
      }

      if (item.gift_card_item_id) {
        const gc = giftCards.find((g) => g.id === item.gift_card_item_id) || null;
        resultItem.gift_card_item = gc;
        if (gc) {
          if (!resultItem.name) {
            resultItem.name = 'Gift Card ' + this._roundCurrency(gc.amount) + ' ' + (gc.currency || '');
          }
          resultItem.currency = gc.currency;
          if (!resultItem.product_type) {
            resultItem.product_type = 'gift_card';
          }
          if (!resultItem.pricing_model) {
            resultItem.pricing_model = 'per_person';
          }
        }
      }

      return resultItem;
    });

    return {
      cart_id: cart.id,
      subtotal_amount: cart.subtotal_amount || 0,
      discount_amount: cart.discount_amount || 0,
      total_amount: cart.total_amount || 0,
      applied_promo_code: cart.applied_promo_code || null,
      items: itemsWithRefs
    };
  }

  // ---------------------- PUBLIC INTERFACES ----------------------

  // getPrimaryNavCategories
  getPrimaryNavCategories() {
    const categories = this._getFromStorage('categories', []) || [];
    const primary = categories.filter((c) => c && c.is_primary_nav);
    return { categories: primary };
  }

  // getHomeFeaturedContent
  getHomeFeaturedContent() {
    const home = this._getFromStorage('home_content', {}) || {};
    const categories = this._getFromStorage('categories', []) || [];
    const cruises = this._getFromStorage('cruise_tours', []) || [];
    const departureLocations = this._getFromStorage('departure_locations', []) || [];
    const promoCodes = this._getFromStorage('promo_codes', []) || [];

    const hero = home.hero || {
      title: '',
      subtitle: '',
      background_image_url: ''
    };

    let featuredCategories = home.featured_categories || null;
    if (!featuredCategories) {
      featuredCategories = categories
        .filter((c) => c && c.is_primary_nav)
        .map((c) => ({
          category_id: c.id,
          category_name: c.name,
          slug: c.slug,
          nav_category_id: c.nav_category_id || null,
          description: c.description || ''
        }));
    }

    const mapCruiseToFeatured = (cruise) => {
      const dep = departureLocations.find((d) => d.id === cruise.departure_location_id);
      const catNames = (cruise.categories || []).map((catId) => {
        const cat = categories.find((c) => c.nav_category_id === catId || c.id === catId);
        return cat ? cat.name : catId;
      });
      const freeCancellation = !!(
        (cruise.features || []).indexOf('free_cancellation') !== -1 ||
        (typeof cruise.free_cancellation_cutoff_hours === 'number' && cruise.free_cancellation_cutoff_hours > 0)
      );
      return {
        cruise_tour_id: cruise.id,
        name: cruise.name,
        short_description: cruise.short_description || '',
        category_names: catNames,
        departure_location_name: dep ? dep.name : '',
        duration_minutes: cruise.duration_minutes,
        time_of_day_tags: cruise.time_of_day_tags || [],
        features: cruise.features || [],
        average_rating: cruise.average_rating || 0,
        review_count: cruise.review_count || 0,
        from_price_adult: cruise.base_price_adult || 0,
        currency: cruise.currency || 'USD',
        default_start_time: cruise.default_start_time || null,
        hero_image_url: cruise.hero_image_url || null,
        free_cancellation_badge: freeCancellation
      };
    };

    let featuredCruises = home.featured_cruises || null;
    if (!featuredCruises) {
      const activeCruises = cruises.filter((c) => c && c.is_active);
      activeCruises.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      featuredCruises = activeCruises.slice(0, 5).map(mapCruiseToFeatured);
    }

    let popularCruises = home.popular_cruises || null;
    if (!popularCruises) {
      const activeCruises = cruises.filter((c) => c && c.is_active);
      activeCruises.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
      popularCruises = activeCruises.slice(0, 5).map((cruise) => {
        const dep = departureLocations.find((d) => d.id === cruise.departure_location_id);
        const catNames = (cruise.categories || []).map((catId) => {
          const cat = categories.find((c) => c.nav_category_id === catId || c.id === catId);
          return cat ? cat.name : catId;
        });
        return {
          cruise_tour_id: cruise.id,
          name: cruise.name,
          short_description: cruise.short_description || '',
          category_names: catNames,
          departure_location_name: dep ? dep.name : '',
          average_rating: cruise.average_rating || 0,
          review_count: cruise.review_count || 0,
          from_price_adult: cruise.base_price_adult || 0,
          currency: cruise.currency || 'USD',
          default_start_time: cruise.default_start_time || null,
          hero_image_url: cruise.hero_image_url || null
        };
      });
    }

    let specialOffers = home.special_offers || null;
    if (!specialOffers) {
      specialOffers = promoCodes
        .filter((p) => p && p.is_active)
        .map((p) => ({
          title: p.code,
          short_description: p.description || '',
          promo_code: p.code,
          highlight_text:
            p.discount_type === 'percentage'
              ? (p.discount_value || 0) + '% off'
              : '$' + this._roundCurrency(p.discount_value || 0) + ' off'
        }));
    }

    return {
      hero,
      featured_categories: featuredCategories,
      featured_cruises: featuredCruises,
      popular_cruises: popularCruises,
      special_offers: specialOffers
    };
  }

  // getActivePromotions
  getActivePromotions() {
    const promos = this._getFromStorage('promo_codes', []) || [];
    const now = new Date();
    const active = promos.filter((p) => {
      if (!p || !p.is_active) return false;
      if (p.valid_from) {
        const from = new Date(p.valid_from);
        if (!isNaN(from.getTime()) && now < from) return false;
      }
      if (p.valid_to) {
        const to = new Date(p.valid_to);
        if (!isNaN(to.getTime()) && now > to) return false;
      }
      return true;
    });

    const mapped = active.map((p) => ({
      code: p.code,
      description: p.description || '',
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      applies_to_scope: p.applies_to_scope,
      min_cart_total: p.min_cart_total || 0,
      is_highlighted: false
    }));

    return { promotions: mapped };
  }

  // getDepartureLocations
  getDepartureLocations(onlyPrimary) {
    const locations = this._getFromStorage('departure_locations', []) || [];
    const filtered = onlyPrimary ? locations.filter((l) => l && l.is_primary_departure_point) : locations;
    return { locations: filtered };
  }

  // getCruiseTourFilterOptions
  getCruiseTourFilterOptions(categoryId, context) {
    let cruises = this._getFromStorage('cruise_tours', []) || [];
    cruises = cruises.filter((c) => c && c.is_active);

    const categories = this._getFromStorage('categories', []) || [];

    if (categoryId) {
      // Resolve categoryId to nav_category_id if possible
      let navCatId = categoryId;
      const cat = categories.find((c) => c.id === categoryId || c.nav_category_id === categoryId);
      if (cat && cat.nav_category_id) {
        navCatId = cat.nav_category_id;
      }
      cruises = cruises.filter((ct) => (ct.categories || []).indexOf(navCatId) !== -1);
    }

    // time_of_day_options
    const timeOfDaySet = new Set();
    cruises.forEach((c) => {
      (c.time_of_day_tags || []).forEach((t) => timeOfDaySet.add(t));
    });
    const time_of_day_options = Array.from(timeOfDaySet).map((id) => ({ id, label: this._toTitleCase(id) }));

    // feature_options
    const featureSet = new Set();
    cruises.forEach((c) => {
      (c.features || []).forEach((f) => featureSet.add(f));
    });
    const feature_options = Array.from(featureSet).map((id) => ({ id, label: this._toTitleCase(id) }));

    // price_range
    let minPrice = null;
    let maxPrice = null;
    cruises.forEach((c) => {
      if (c.pricing_model === 'per_person' && typeof c.base_price_adult === 'number') {
        if (minPrice === null || c.base_price_adult < minPrice) minPrice = c.base_price_adult;
        if (maxPrice === null || c.base_price_adult > maxPrice) maxPrice = c.base_price_adult;
      }
    });
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;
    const price_range = {
      min_price_adult: minPrice,
      max_price_adult: maxPrice,
      suggested_step: maxPrice > minPrice ? Math.round((maxPrice - minPrice) / 5) || 1 : 1
    };

    // duration_range
    let minDuration = null;
    let maxDuration = null;
    cruises.forEach((c) => {
      const dMin = typeof c.min_duration_minutes === 'number' && c.min_duration_minutes > 0 ? c.min_duration_minutes : c.duration_minutes;
      const dMax = typeof c.max_duration_minutes === 'number' && c.max_duration_minutes > 0 ? c.max_duration_minutes : c.duration_minutes;
      if (typeof dMin === 'number') {
        if (minDuration === null || dMin < minDuration) minDuration = dMin;
      }
      if (typeof dMax === 'number') {
        if (maxDuration === null || dMax > maxDuration) maxDuration = dMax;
      }
    });
    if (minDuration === null) minDuration = 0;
    if (maxDuration === null) maxDuration = 0;

    const duration_range = {
      min_duration_minutes: minDuration,
      max_duration_minutes: maxDuration,
      presets: []
    };

    // group_size_range
    let minGroup = null;
    let maxGroup = null;
    cruises.forEach((c) => {
      if (typeof c.min_group_size === 'number') {
        if (minGroup === null || c.min_group_size < minGroup) minGroup = c.min_group_size;
      }
      if (typeof c.max_group_size === 'number') {
        if (maxGroup === null || c.max_group_size > maxGroup) maxGroup = c.max_group_size;
      }
    });
    if (minGroup === null) minGroup = 0;
    if (maxGroup === null) maxGroup = 0;
    const group_size_range = {
      min_group_size: minGroup,
      max_group_size: maxGroup
    };

    // day_of_week_options
    const daySet = new Set();
    cruises.forEach((c) => {
      (c.available_days_of_week || []).forEach((d) => daySet.add(d));
    });
    const day_of_week_options = Array.from(daySet).map((id) => ({ id, label: this._getDayOfWeekLabel(id) }));

    // month_options: generic 1-12
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const month_options = monthNames.map((label, index) => ({ month_number: index + 1, label }));

    const departure_locations = this._getFromStorage('departure_locations', []) || [];

    return {
      time_of_day_options,
      feature_options,
      price_range,
      duration_range,
      group_size_range,
      day_of_week_options,
      month_options,
      departure_locations
    };
  }

  // searchCruiseTours
  searchCruiseTours(
    query,
    categoryId,
    departureLocationId,
    specificDate,
    dateFrom,
    dateTo,
    daysOfWeek,
    timeOfDay,
    departureTimeAfter,
    departureTimeBefore,
    minPriceAdult,
    maxPriceAdult,
    minTotalBudget,
    maxTotalBudget,
    minDurationMinutes,
    maxDurationMinutes,
    minGroupSize,
    maxGroupSize,
    features,
    productType,
    pricingModel,
    sortBy,
    page,
    pageSize
  ) {
    const cruises = (this._getFromStorage('cruise_tours', []) || []).filter((c) => c && c.is_active);
    const categories = this._getFromStorage('categories', []) || [];
    const departureLocations = this._getFromStorage('departure_locations', []) || [];

    let filtered = cruises.slice();

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      filtered = filtered.filter((c) => {
        const name = (c.name || '').toLowerCase();
        const desc = (c.short_description || '').toLowerCase();
        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    if (categoryId) {
      let navCatId = categoryId;
      const cat = categories.find((c) => c.id === categoryId || c.nav_category_id === categoryId);
      if (cat && cat.nav_category_id) {
        navCatId = cat.nav_category_id;
      }
      filtered = filtered.filter((c) => (c.categories || []).indexOf(navCatId) !== -1);
    }

    if (departureLocationId) {
      filtered = filtered.filter((c) => c.departure_location_id === departureLocationId);
    }

    // Date filters: we don't have per-date availability; we only respect daysOfWeek via available_days_of_week
    if (daysOfWeek && Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
      const set = new Set(daysOfWeek);
      filtered = filtered.filter((c) => {
        if (!c.available_days_of_week || !c.available_days_of_week.length) return true;
        return c.available_days_of_week.some((d) => set.has(d));
      });
    }

    if (timeOfDay && Array.isArray(timeOfDay) && timeOfDay.length > 0) {
      const set = new Set(timeOfDay);
      filtered = filtered.filter((c) => {
        if (!c.time_of_day_tags || !c.time_of_day_tags.length) return true;
        return c.time_of_day_tags.some((t) => set.has(t));
      });
    }

    if (departureTimeAfter) {
      const minMinutes = this._parseTimeToMinutes(departureTimeAfter);
      if (minMinutes !== null) {
        filtered = filtered.filter((c) => {
          const m = this._parseTimeToMinutes(c.default_start_time);
          if (m === null) return true;
          return m >= minMinutes;
        });
      }
    }

    if (departureTimeBefore) {
      const maxMinutes = this._parseTimeToMinutes(departureTimeBefore);
      if (maxMinutes !== null) {
        filtered = filtered.filter((c) => {
          const m = this._parseTimeToMinutes(c.default_start_time);
          if (m === null) return true;
          return m <= maxMinutes;
        });
      }
    }

    if (typeof minPriceAdult === 'number') {
      filtered = filtered.filter((c) => {
        if (c.pricing_model !== 'per_person') return true;
        if (typeof c.base_price_adult !== 'number') return false;
        return c.base_price_adult >= minPriceAdult;
      });
    }

    if (typeof maxPriceAdult === 'number') {
      filtered = filtered.filter((c) => {
        if (c.pricing_model !== 'per_person') return true;
        if (typeof c.base_price_adult !== 'number') return false;
        return c.base_price_adult <= maxPriceAdult;
      });
    }

    if (typeof minTotalBudget === 'number') {
      filtered = filtered.filter((c) => {
        if (c.pricing_model === 'per_charter') {
          if (typeof c.base_price_per_charter !== 'number') return false;
          return c.base_price_per_charter >= minTotalBudget;
        }
        return true;
      });
    }

    if (typeof maxTotalBudget === 'number') {
      filtered = filtered.filter((c) => {
        if (c.pricing_model === 'per_charter') {
          if (typeof c.base_price_per_charter !== 'number') return false;
          return c.base_price_per_charter <= maxTotalBudget;
        }
        return true;
      });
    }

    if (typeof minDurationMinutes === 'number') {
      filtered = filtered.filter((c) => {
        const dMin = typeof c.min_duration_minutes === 'number' && c.min_duration_minutes > 0 ? c.min_duration_minutes : c.duration_minutes;
        if (typeof dMin !== 'number') return true;
        return dMin >= minDurationMinutes;
      });
    }

    if (typeof maxDurationMinutes === 'number') {
      filtered = filtered.filter((c) => {
        const dMax = typeof c.max_duration_minutes === 'number' && c.max_duration_minutes > 0 ? c.max_duration_minutes : c.duration_minutes;
        if (typeof dMax !== 'number') return true;
        return dMax <= maxDurationMinutes;
      });
    }

    if (typeof minGroupSize === 'number') {
      filtered = filtered.filter((c) => {
        if (typeof c.max_group_size !== 'number') return true;
        return c.max_group_size >= minGroupSize;
      });
    }

    if (typeof maxGroupSize === 'number') {
      filtered = filtered.filter((c) => {
        if (typeof c.min_group_size !== 'number') return true;
        return c.min_group_size <= maxGroupSize;
      });
    }

    if (features && Array.isArray(features) && features.length > 0) {
      const set = new Set(features);
      filtered = filtered.filter((c) => {
        const feat = c.features || [];
        return Array.from(set).every((f) => feat.indexOf(f) !== -1);
      });
    }

    if (productType) {
      filtered = filtered.filter((c) => c.product_type === productType);
    }

    if (pricingModel) {
      filtered = filtered.filter((c) => c.pricing_model === pricingModel);
    }

    // Sorting
    const sortKey = sortBy || 'relevance';
    const getPriceKey = (c) => {
      if (c.pricing_model === 'per_person') {
        return typeof c.base_price_adult === 'number' ? c.base_price_adult : Number.POSITIVE_INFINITY;
      }
      if (c.pricing_model === 'per_charter') {
        return typeof c.base_price_per_charter === 'number' ? c.base_price_per_charter : Number.POSITIVE_INFINITY;
      }
      return Number.POSITIVE_INFINITY;
    };

    if (sortKey === 'price_asc') {
      filtered.sort((a, b) => getPriceKey(a) - getPriceKey(b));
    } else if (sortKey === 'price_desc') {
      filtered.sort((a, b) => getPriceKey(b) - getPriceKey(a));
    } else if (sortKey === 'rating_desc') {
      filtered.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sortKey === 'duration_desc') {
      filtered.sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
    } else if (sortKey === 'departure_time_asc') {
      filtered.sort((a, b) => {
        const ma = this._parseTimeToMinutes(a.default_start_time) || 0;
        const mb = this._parseTimeToMinutes(b.default_start_time) || 0;
        return ma - mb;
      });
    }

    // Pagination
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const total_results = filtered.length;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = filtered.slice(start, end);

    const results = pageItems.map((c) => {
      const dep = departureLocations.find((d) => d.id === c.departure_location_id) || null;
      const catIds = c.categories || [];
      const catNames = catIds.map((catId) => {
        const cat = categories.find((cc) => cc.nav_category_id === catId || cc.id === catId);
        return cat ? cat.name : catId;
      });
      const freeCancellation = !!(
        (c.features || []).indexOf('free_cancellation') !== -1 ||
        (typeof c.free_cancellation_cutoff_hours === 'number' && c.free_cancellation_cutoff_hours > 0)
      );

      let estimatedTotal = null;
      if (c.pricing_model === 'per_person') {
        const adult = typeof c.base_price_adult === 'number' ? c.base_price_adult : 0;
        const child = typeof c.base_price_child === 'number' ? c.base_price_child : adult;
        estimatedTotal = this._roundCurrency(adult * 2 + child);
      } else if (c.pricing_model === 'per_charter') {
        const charter = typeof c.base_price_per_charter === 'number' ? c.base_price_per_charter : 0;
        estimatedTotal = this._roundCurrency(charter);
      }

      const item = {
        cruise_tour_id: c.id,
        name: c.name,
        short_description: c.short_description || '',
        product_type: c.product_type,
        pricing_model: c.pricing_model,
        category_ids: catIds,
        category_names: catNames,
        departure_location_id: c.departure_location_id,
        departure_location_name: dep ? dep.name : '',
        duration_minutes: c.duration_minutes,
        min_duration_minutes: c.min_duration_minutes || null,
        max_duration_minutes: c.max_duration_minutes || null,
        time_of_day_tags: c.time_of_day_tags || [],
        features: c.features || [],
        average_rating: c.average_rating || 0,
        review_count: c.review_count || 0,
        base_price_adult: c.base_price_adult || 0,
        base_price_child: c.base_price_child || 0,
        base_price_per_charter: c.base_price_per_charter || 0,
        currency: c.currency || 'USD',
        default_start_time: c.default_start_time || null,
        available_days_of_week: c.available_days_of_week || [],
        hero_image_url: c.hero_image_url || null,
        free_cancellation_cutoff_hours: c.free_cancellation_cutoff_hours || null,
        free_cancellation_badge: freeCancellation,
        estimated_total_for_two_adults_one_child: estimatedTotal,
        // Foreign key resolution
        departure_location: dep
      };

      // Add resolved categories array for hierarchical access
      item.categories = catIds.map((catId) => {
        const cat = categories.find((cc) => cc.nav_category_id === catId || cc.id === catId);
        return cat || null;
      }).filter(Boolean);

      return item;
    });

    return {
      results,
      total_results,
      page: currentPage,
      page_size: size
    };
  }

  // getCruiseTourDetails
  getCruiseTourDetails(cruiseTourId) {
    const cruises = this._getFromStorage('cruise_tours', []) || [];
    const categories = this._getFromStorage('categories', []) || [];
    const departureLocations = this._getFromStorage('departure_locations', []) || [];

    // Instrumentation for task completion tracking
    try {
      const key = 'task8_viewedCruiseIds';
      let existing = localStorage.getItem(key);
      let ids = [];
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (Array.isArray(parsed)) {
            ids = parsed;
          }
        } catch (e) {
          // ignore parse error and reset ids to empty array
          ids = [];
        }
      }
      if (ids.indexOf(cruiseTourId) === -1) {
        ids.push(cruiseTourId);
        localStorage.setItem(key, JSON.stringify(ids));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const cruise = cruises.find((c) => c.id === cruiseTourId) || null;
    if (!cruise) {
      return {
        cruise_tour: null,
        category_names: [],
        departure_location: null,
        inclusions: [],
        cancellation_policy_summary: '',
        free_cancellation_cutoff_hours: null,
        pricing_info: null,
        media: {
          hero_image_url: null,
          gallery_image_urls: []
        }
      };
    }

    const catNames = (cruise.categories || []).map((catId) => {
      const cat = categories.find((c) => c.nav_category_id === catId || c.id === catId);
      return cat ? cat.name : catId;
    });

    const departureLocation = departureLocations.find((d) => d.id === cruise.departure_location_id) || null;

    // Derive inclusions from features where possible
    const inclusions = cruise.features ? cruise.features.slice() : [];

    const pricing_info = {
      pricing_model: cruise.pricing_model,
      base_price_adult: cruise.base_price_adult || 0,
      base_price_child: cruise.base_price_child || 0,
      base_price_senior: cruise.base_price_senior || 0,
      base_price_infant: cruise.base_price_infant || 0,
      base_price_per_charter: cruise.base_price_per_charter || 0,
      currency: cruise.currency || 'USD',
      tax_included: !!cruise.tax_included
    };

    const media = {
      hero_image_url: cruise.hero_image_url || null,
      gallery_image_urls: cruise.gallery_image_urls || []
    };

    return {
      cruise_tour: cruise,
      category_names: catNames,
      departure_location: departureLocation,
      inclusions,
      cancellation_policy_summary: cruise.cancellation_policy_summary || '',
      free_cancellation_cutoff_hours: cruise.free_cancellation_cutoff_hours || null,
      pricing_info,
      media
    };
  }

  // getCruiseTourAvailability
  getCruiseTourAvailability(cruiseTourId, dateFrom, dateTo, daysOfWeek, timeOfDay) {
    const cruises = this._getFromStorage('cruise_tours', []) || [];
    const timeSlotsAll = this._getFromStorage('time_slots', []) || [];

    const cruise = cruises.find((c) => c.id === cruiseTourId) || null;
    if (!cruise) {
      return { cruise_tour_id: cruiseTourId, dates: [] };
    }

    let tsForCruise = timeSlotsAll.filter((ts) => ts.cruise_tour_id === cruiseTourId && ts.is_active);
    // If no explicit time slots are defined for this cruise, fall back to a synthetic
    // time slot based on the cruise's default_start_time so that simple cruises
    // without configured time_slots still expose availability.
    if (!tsForCruise.length && cruise.default_start_time) {
      const fallbackTimeOfDay = (cruise.time_of_day_tags && cruise.time_of_day_tags[0]) || null;
      tsForCruise = [
        {
          id: cruise.id + '_default_slot',
          cruise_tour_id: cruise.id,
          label: 'Default departure',
          start_time: cruise.default_start_time,
          end_time: null,
          time_of_day: fallbackTimeOfDay,
          is_default: true,
          is_active: true
        }
      ];
    }
    const timeOfDaySet = timeOfDay && Array.isArray(timeOfDay) && timeOfDay.length > 0 ? new Set(timeOfDay) : null;

    const start = new Date(dateFrom + 'T00:00:00Z');
    const end = new Date(dateTo + 'T00:00:00Z');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return { cruise_tour_id: cruiseTourId, dates: [] };
    }

    const requestedDaysSet = daysOfWeek && Array.isArray(daysOfWeek) && daysOfWeek.length > 0 ? new Set(daysOfWeek) : null;

    const resultDates = [];
    for (let d = new Date(start.getTime()); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const dayId = this._getDayOfWeekFromDate(dateStr);

      // filter by daysOfWeek parameter
      if (requestedDaysSet && !requestedDaysSet.has(dayId)) {
        continue;
      }

      // filter using cruise.available_days_of_week if defined
      if (cruise.available_days_of_week && cruise.available_days_of_week.length) {
        if (cruise.available_days_of_week.indexOf(dayId) === -1) {
          continue;
        }
      }

      const timeSlotsForDate = tsForCruise
        .filter((ts) => {
          if (!timeOfDaySet) return true;
          return timeOfDaySet.has(ts.time_of_day);
        })
        .map((ts) => ({
          time_slot_id: ts.id,
          label: ts.label || '',
          start_time: ts.start_time,
          end_time: ts.end_time || null,
          time_of_day: ts.time_of_day,
          is_default: !!ts.is_default,
          is_available: true
        }));

      if (!timeSlotsForDate.length) continue;

      resultDates.push({
        date: dateStr,
        time_slots: timeSlotsForDate
      });
    }

    return {
      cruise_tour_id: cruiseTourId,
      dates: resultDates
    };
  }

  // getCruiseTourExtrasOptions
  getCruiseTourExtrasOptions(cruiseTourId) {
    const extrasMap = this._getFromStorage('cruise_tour_extras', {}) || {};
    const extras = extrasMap[cruiseTourId] || [];
    return { extras };
  }

  // getCruiseTourPricingPreview
  getCruiseTourPricingPreview(
    cruiseTourId,
    date,
    timeSlotId,
    adultCount,
    childCount,
    seniorCount,
    guestCount,
    selectedExtras
  ) {
    const cruises = this._getFromStorage('cruise_tours', []) || [];
    const timeSlotsAll = this._getFromStorage('time_slots', []) || [];
    const extrasMap = this._getFromStorage('cruise_tour_extras', {}) || {};

    const cruise = cruises.find((c) => c.id === cruiseTourId) || null;
    if (!cruise) {
      return {
        is_available: false,
        currency: 'USD',
        pricing_model: null,
        adult_count: adultCount || 0,
        child_count: childCount || 0,
        senior_count: seniorCount || 0,
        guest_count: guestCount || 0,
        unit_price_adult: 0,
        unit_price_child: 0,
        unit_price_senior: 0,
        unit_price_per_charter: 0,
        extras_total: 0,
        base_fare_total: 0,
        line_subtotal: 0,
        taxes_and_fees: 0,
        total_amount: 0,
        messages: ['Cruise not found.']
      };
    }

    const messages = [];
    const pricingModel = cruise.pricing_model;
    const currency = cruise.currency || 'USD';

    const aCount = adultCount || 0;
    const cCount = childCount || 0;
    const sCount = seniorCount || 0;
    const gCount = guestCount || 0;

    const timeSlot = timeSlotId ? timeSlotsAll.find((ts) => ts.id === timeSlotId) : null;

    const dayId = date ? this._getDayOfWeekFromDate(date) : null;

    let isAvailable = !!cruise.is_active;
    if (isAvailable && dayId && cruise.available_days_of_week && cruise.available_days_of_week.length) {
      if (cruise.available_days_of_week.indexOf(dayId) === -1) {
        isAvailable = false;
        messages.push('Cruise not available on selected day of week.');
      }
    }

    const unitPriceAdult = typeof cruise.base_price_adult === 'number' ? cruise.base_price_adult : 0;
    const unitPriceChild = typeof cruise.base_price_child === 'number' ? cruise.base_price_child : unitPriceAdult;
    const unitPriceSenior = typeof cruise.base_price_senior === 'number' ? cruise.base_price_senior : unitPriceAdult;
    const unitPriceCharter = typeof cruise.base_price_per_charter === 'number' ? cruise.base_price_per_charter : 0;

    let baseFareTotal = 0;

    if (pricingModel === 'per_person') {
      baseFareTotal = unitPriceAdult * aCount + unitPriceChild * cCount + unitPriceSenior * sCount;
    } else if (pricingModel === 'per_charter') {
      baseFareTotal = unitPriceCharter;
      if (typeof cruise.max_group_size === 'number' && gCount > cruise.max_group_size) {
        messages.push('Selected guest count exceeds maximum capacity.');
      }
    }

    const extrasForCruise = extrasMap[cruiseTourId] || [];
    const selectedExtraIds = selectedExtras && Array.isArray(selectedExtras) ? selectedExtras : [];
    let extrasTotal = 0;

    selectedExtraIds.forEach((id) => {
      const extra = extrasForCruise.find((e) => e.extra_id === id);
      if (!extra) return;
      if (pricingModel === 'per_person') {
        const priceAdult = extra.price_per_adult || 0;
        const priceChild = extra.price_per_child || 0;
        extrasTotal += priceAdult * aCount + priceChild * cCount;
      } else if (pricingModel === 'per_charter') {
        extrasTotal += extra.price_per_charter || 0;
      }
    });

    baseFareTotal = this._roundCurrency(baseFareTotal);
    extrasTotal = this._roundCurrency(extrasTotal);

    const lineSubtotal = this._roundCurrency(baseFareTotal + extrasTotal);
    const taxesAndFees = 0; // tax handling could be added if needed
    const totalAmount = this._roundCurrency(lineSubtotal + taxesAndFees);

    return {
      is_available: isAvailable,
      currency,
      pricing_model: pricingModel,
      adult_count: aCount,
      child_count: cCount,
      senior_count: sCount,
      guest_count: gCount,
      unit_price_adult: unitPriceAdult,
      unit_price_child: unitPriceChild,
      unit_price_senior: unitPriceSenior,
      unit_price_per_charter: unitPriceCharter,
      extras_total: extrasTotal,
      base_fare_total: baseFareTotal,
      line_subtotal: lineSubtotal,
      taxes_and_fees: taxesAndFees,
      total_amount: totalAmount,
      messages
    };
  }

  // addTourBookingToCart
  addTourBookingToCart(
    cruiseTourId,
    date,
    timeSlotId,
    adultCount,
    childCount,
    seniorCount,
    guestCount,
    selectedExtras,
    notes
  ) {
    const cruises = this._getFromStorage('cruise_tours', []) || [];
    const timeSlotsAll = this._getFromStorage('time_slots', []) || [];
    const cruise = cruises.find((c) => c.id === cruiseTourId) || null;
    if (!cruise) {
      return { success: false, cart_item_id: null, message: 'Cruise not found.', cart: null };
    }

    const preview = this.getCruiseTourPricingPreview(
      cruiseTourId,
      date,
      timeSlotId,
      adultCount,
      childCount,
      seniorCount,
      guestCount,
      selectedExtras
    );

    if (!preview.is_available) {
      return { success: false, cart_item_id: null, message: 'Selected cruise is not available.', cart: null };
    }

    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items', []) || [];

    const timeSlot = timeSlotId ? timeSlotsAll.find((ts) => ts.id === timeSlotId) : null;
    const departure_time = timeSlot ? timeSlot.start_time : cruise.default_start_time || null;

    const itemType = cruise.product_type === 'private_charter' ? 'charter_booking' : 'tour_booking';

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: itemType,
      cruise_tour_id: cruise.id,
      gift_card_item_id: null,
      date: date ? new Date(date + 'T00:00:00Z').toISOString() : null,
      time_slot_id: timeSlotId || null,
      departure_time: departure_time || null,
      adult_count: adultCount || 0,
      child_count: childCount || 0,
      senior_count: seniorCount || 0,
      guest_count: guestCount || 0,
      unit_price_adult: preview.unit_price_adult || 0,
      unit_price_child: preview.unit_price_child || 0,
      unit_price_per_charter: preview.unit_price_per_charter || 0,
      line_subtotal: preview.line_subtotal || 0,
      notes: notes || '',
      selected_extra_ids: selectedExtras && Array.isArray(selectedExtras) ? selectedExtras.slice() : []
    };

    allCartItems.push(cartItem);
    this._saveToStorage('cart_items', allCartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_item_id: cartItem.id,
      message: 'Added to cart.',
      cart: this._buildCartResponse(updatedCart)
    };
  }

  // getGiftCardTemplates
  getGiftCardTemplates() {
    const templates = this._getFromStorage('gift_card_templates', []) || [];
    return { templates };
  }

  // addGiftCardToCart
  addGiftCardToCart(
    templateId,
    amount,
    currency,
    appliesToScope,
    applicableCategoryIds,
    applicableProductIds,
    recipient_name,
    recipient_email,
    sender_name,
    message,
    delivery_method
  ) {
    const templates = this._getFromStorage('gift_card_templates', []) || [];
    const allGiftCards = this._getFromStorage('gift_card_items', []) || [];

    let template = null;
    if (templateId) {
      template = templates.find((t) => t.id === templateId) || null;
    }

    const now = new Date().toISOString();

    const giftCardItem = {
      id: this._generateId('gift_card_item'),
      template_id: template ? template.id : null,
      amount: amount || 0,
      currency: currency || 'USD',
      applies_to_scope: appliesToScope || (template ? template.default_applies_to_scope : 'all_cruises'),
      applicable_category_ids: applicableCategoryIds && Array.isArray(applicableCategoryIds) ? applicableCategoryIds.slice() : [],
      applicable_product_ids: applicableProductIds && Array.isArray(applicableProductIds) ? applicableProductIds.slice() : [],
      recipient_name,
      recipient_email: recipient_email || null,
      sender_name,
      message: message || '',
      delivery_method: delivery_method || 'email',
      is_in_cart: true,
      is_redeemed: false,
      created_at: now
    };

    allGiftCards.push(giftCardItem);
    this._saveToStorage('gift_card_items', allGiftCards);

    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items', []) || [];

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'gift_card',
      cruise_tour_id: null,
      gift_card_item_id: giftCardItem.id,
      date: null,
      time_slot_id: null,
      departure_time: null,
      adult_count: 0,
      child_count: 0,
      senior_count: 0,
      guest_count: 0,
      unit_price_adult: 0,
      unit_price_child: 0,
      unit_price_per_charter: 0,
      line_subtotal: amount || 0,
      notes: message || ''
    };

    allCartItems.push(cartItem);
    this._saveToStorage('cart_items', allCartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart_item_id: cartItem.id,
      message: 'Gift card added to cart.',
      cart: this._buildCartResponse(updatedCart)
    };
  }

  // getCartOverview
  getCartOverview() {
    const cart = this._getOrCreateCart();
    const { cart: updatedCart } = this._recalculateCartTotals(cart);
    return this._buildCartResponse(updatedCart);
  }

  // updateCartItemBookingDetails
  updateCartItemBookingDetails(cartItemId, bookingDetails) {
    const allCartItems = this._getFromStorage('cart_items', []) || [];
    const cruises = this._getFromStorage('cruise_tours', []) || [];

    const itemIndex = allCartItems.findIndex((i) => i.id === cartItemId);
    if (itemIndex === -1) {
      return {
        success: false,
        message: 'Cart item not found.',
        cart: this._buildCartResponse(this._getOrCreateCart())
      };
    }

    const item = allCartItems[itemIndex];

    if (item.item_type === 'gift_card') {
      // No booking details to update for gift cards
      allCartItems[itemIndex] = item;
      this._saveToStorage('cart_items', allCartItems);
      const cart = this._getOrCreateCart();
      const { cart: updatedCart } = this._recalculateCartTotals(cart);
      return {
        success: true,
        message: 'Updated.',
        cart: this._buildCartResponse(updatedCart)
      };
    }

    const cruise = cruises.find((c) => c.id === item.cruise_tour_id) || null;
    if (!cruise) {
      return {
        success: false,
        message: 'Associated cruise not found.',
        cart: this._buildCartResponse(this._getOrCreateCart())
      };
    }

    const updated = Object.assign({}, item);

    if (bookingDetails.date) {
      updated.date = new Date(bookingDetails.date + 'T00:00:00Z').toISOString();
    }
    if (bookingDetails.timeSlotId) {
      updated.time_slot_id = bookingDetails.timeSlotId;
    }
    if (typeof bookingDetails.adultCount === 'number') {
      updated.adult_count = bookingDetails.adultCount;
    }
    if (typeof bookingDetails.childCount === 'number') {
      updated.child_count = bookingDetails.childCount;
    }
    if (typeof bookingDetails.seniorCount === 'number') {
      updated.senior_count = bookingDetails.seniorCount;
    }
    if (typeof bookingDetails.guestCount === 'number') {
      updated.guest_count = bookingDetails.guestCount;
    }
    if (bookingDetails.selectedExtras && Array.isArray(bookingDetails.selectedExtras)) {
      updated.selected_extra_ids = bookingDetails.selectedExtras.slice();
    }
    if (typeof bookingDetails.notes === 'string') {
      updated.notes = bookingDetails.notes;
    }

    const preview = this.getCruiseTourPricingPreview(
      updated.cruise_tour_id,
      updated.date ? updated.date.slice(0, 10) : null,
      updated.time_slot_id,
      updated.adult_count,
      updated.child_count,
      updated.senior_count,
      updated.guest_count,
      updated.selected_extra_ids || []
    );

    updated.unit_price_adult = preview.unit_price_adult || 0;
    updated.unit_price_child = preview.unit_price_child || 0;
    updated.unit_price_per_charter = preview.unit_price_per_charter || 0;
    updated.line_subtotal = preview.line_subtotal || 0;

    allCartItems[itemIndex] = updated;
    this._saveToStorage('cart_items', allCartItems);

    const cart = this._getOrCreateCart();
    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Updated.',
      cart: this._buildCartResponse(updatedCart)
    };
  }

  // removeCartItem
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let allCartItems = this._getFromStorage('cart_items', []) || [];

    const existingLength = allCartItems.length;
    allCartItems = allCartItems.filter((i) => i.id !== cartItemId);

    if (allCartItems.length === existingLength) {
      // Nothing removed
      this._saveToStorage('cart_items', allCartItems);
      const { cart: updatedCart } = this._recalculateCartTotals(cart);
      return {
        success: false,
        message: 'Cart item not found.',
        cart: this._buildCartResponse(updatedCart)
      };
    }

    this._saveToStorage('cart_items', allCartItems);

    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== cartItemId);
    }

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    return {
      success: true,
      message: 'Removed from cart.',
      cart: this._buildCartResponse(updatedCart)
    };
  }

  // getCheckoutSummary
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    const checkout_requirements = {
      requires_contact_name: true,
      requires_contact_email: true,
      requires_contact_phone: false,
      requires_billing_address: false
    };

    return {
      cart: this._buildCartResponse(updatedCart),
      checkout_requirements
    };
  }

  // applyPromoCodeToCart
  applyPromoCodeToCart(promoCode) {
    const cart = this._getOrCreateCart();
    cart.applied_promo_code = promoCode || null;
    const { cart: updatedCart, promoResult } = this._recalculateCartTotals(cart);

    const success = !!promoResult.success;
    const message = promoResult.message || (success ? 'Promo code applied.' : 'Promo code invalid or not applicable.');

    return {
      success,
      message,
      applied_promo_code: updatedCart.applied_promo_code || null,
      cart: this._buildCartResponse(updatedCart)
    };
  }

  // submitCheckout
  submitCheckout(contact_name, contact_email, contact_phone, billing_address, payment_method, accept_terms) {
    if (!accept_terms) {
      return {
        success: false,
        booking_order_id: null,
        reference_code: null,
        total_amount: 0,
        currency: 'USD',
        payment_status: 'not_paid'
      };
    }

    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage('cart_items', []) || [];
    const cartItems = allCartItems.filter((i) => i.cart_id === cart.id);

    if (!cartItems.length) {
      return {
        success: false,
        booking_order_id: null,
        reference_code: null,
        total_amount: 0,
        currency: 'USD',
        payment_status: 'not_paid'
      };
    }

    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    const bookingOrders = this._getFromStorage('booking_orders', []) || [];
    const bookingItems = this._getFromStorage('booking_items', []) || [];

    // Determine currency based on first item
    let currency = 'USD';
    const cruises = this._getFromStorage('cruise_tours', []) || [];
    const giftCardItems = this._getFromStorage('gift_card_items', []) || [];

    if (cartItems.length) {
      const first = cartItems[0];
      if (first.cruise_tour_id) {
        const cruise = cruises.find((c) => c.id === first.cruise_tour_id);
        if (cruise && cruise.currency) currency = cruise.currency;
      } else if (first.gift_card_item_id) {
        const gc = giftCardItems.find((g) => g.id === first.gift_card_item_id);
        if (gc && gc.currency) currency = gc.currency;
      }
    }

    const booking_order_id = this._generateId('booking_order');
    const reference_code = 'RC' + String(this._getNextIdCounter());
    const now = new Date().toISOString();

    const newBookingItemsIds = [];

    cartItems.forEach((ci) => {
      const bi = {
        id: this._generateId('booking_item'),
        booking_order_id,
        item_type: ci.item_type,
        cruise_tour_id: ci.cruise_tour_id || null,
        gift_card_item_id: ci.gift_card_item_id || null,
        date: ci.date || null,
        departure_time: ci.departure_time || null,
        time_slot_id: ci.time_slot_id || null,
        adult_count: ci.adult_count || 0,
        child_count: ci.child_count || 0,
        senior_count: ci.senior_count || 0,
        guest_count: ci.guest_count || 0,
        unit_price_adult: ci.unit_price_adult || 0,
        unit_price_child: ci.unit_price_child || 0,
        unit_price_per_charter: ci.unit_price_per_charter || 0,
        line_subtotal: ci.line_subtotal || 0
      };
      bookingItems.push(bi);
      newBookingItemsIds.push(bi.id);
    });

    // Mark gift cards as no longer in cart
    const updatedGiftCards = giftCardItems.map((gc) => {
      if (cartItems.some((ci) => ci.gift_card_item_id === gc.id)) {
        return Object.assign({}, gc, { is_in_cart: false });
      }
      return gc;
    });

    const bookingOrder = {
      id: booking_order_id,
      reference_code,
      status: 'confirmed',
      created_at: now,
      updated_at: now,
      booking_item_ids: newBookingItemsIds,
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      billing_address: billing_address || null,
      subtotal_amount: updatedCart.subtotal_amount || 0,
      discount_amount: updatedCart.discount_amount || 0,
      total_amount: updatedCart.total_amount || 0,
      promo_code: updatedCart.applied_promo_code || null,
      payment_status: 'paid',
      notes: ''
    };

    bookingOrders.push(bookingOrder);

    this._saveToStorage('booking_orders', bookingOrders);
    this._saveToStorage('booking_items', bookingItems);
    this._saveToStorage('gift_card_items', updatedGiftCards);

    // Clear cart & cart items for this cart
    const remainingCartItems = allCartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);

    const emptyCart = {
      id: cart.id,
      items: [],
      created_at: cart.created_at,
      updated_at: now,
      subtotal_amount: 0,
      discount_amount: 0,
      total_amount: 0,
      applied_promo_code: null
    };
    this._saveToStorage('cart', emptyCart);

    return {
      success: true,
      booking_order_id,
      reference_code,
      total_amount: bookingOrder.total_amount,
      currency,
      payment_status: bookingOrder.payment_status
    };
  }

  // getBookingConfirmation
  getBookingConfirmation(referenceCode) {
    const bookingOrders = this._getFromStorage('booking_orders', []) || [];
    const bookingItems = this._getFromStorage('booking_items', []) || [];
    const cruises = this._getFromStorage('cruise_tours', []) || [];
    const giftCardItems = this._getFromStorage('gift_card_items', []) || [];

    const order = bookingOrders.find((o) => o.reference_code === referenceCode) || null;
    if (!order) {
      return {
        booking_order: null,
        items: []
      };
    }

    const items = bookingItems
      .filter((bi) => bi.booking_order_id === order.id)
      .map((bi) => {
        const item = Object.assign({}, bi);
        if (bi.cruise_tour_id) {
          item.cruise_tour = cruises.find((c) => c.id === bi.cruise_tour_id) || null;
        }
        if (bi.gift_card_item_id) {
          item.gift_card_item = giftCardItems.find((g) => g.id === bi.gift_card_item_id) || null;
        }
        return item;
      });

    return {
      booking_order: order,
      items
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const about = this._getFromStorage('about_page_content', {}) || {};
    return {
      title: about.title || '',
      body_html: about.body_html || '',
      highlights: about.highlights || [],
      testimonials: about.testimonials || []
    };
  }

  // getContactPageContent
  getContactPageContent() {
    const contact = this._getFromStorage('contact_page_content', {}) || {};
    const departure_locations = this._getFromStorage('departure_locations', []) || [];
    return {
      phone: contact.phone || '',
      email: contact.email || '',
      office_address: contact.office_address || '',
      map_embed: contact.map_embed || '',
      departure_locations
    };
  }

  // submitContactForm
  submitContactForm(name, email, phone, enquiry_type, subject, message, preferred_contact_method) {
    const submissions = this._getFromStorage('contact_form_submissions', []) || [];
    const ticket_id = this._generateId('contact_ticket');
    const now = new Date().toISOString();

    const submission = {
      id: ticket_id,
      name,
      email,
      phone: phone || null,
      enquiry_type,
      subject,
      message,
      preferred_contact_method: preferred_contact_method || null,
      created_at: now
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Enquiry submitted.',
      ticket_id
    };
  }

  // getFaqEntries
  getFaqEntries() {
    const faqs = this._getFromStorage('faq_entries', []) || [];
    return { faqs };
  }

  // getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    const terms = this._getFromStorage('terms_and_conditions_content', {}) || {};
    return {
      last_updated: terms.last_updated || '',
      body_html: terms.body_html || ''
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const policy = this._getFromStorage('privacy_policy_content', {}) || {};
    return {
      last_updated: policy.last_updated || '',
      body_html: policy.body_html || ''
    };
  }

  // getCancellationPolicyContent
  getCancellationPolicyContent() {
    const policy = this._getFromStorage('cancellation_policy_content', {}) || {};
    return {
      last_updated: policy.last_updated || '',
      body_html: policy.body_html || ''
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