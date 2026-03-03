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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    // Core entity tables
    const keysWithDefaults = {
      chalets: [],
      favorite_chalets: [],
      bookings: [],
      stay_extras: [],
      booking_extras: [],
      store_categories: [],
      products: [],
      product_variants: [],
      cart: null, // single-user cart object
      cart_items: [],
      orders: [],
      order_items: [],
      payment_methods: [],
      // Content / misc
      homepage_promotions: null,
      about_content: null,
      contact_info: null,
      faq_entries: [],
      policies: [],
      contact_cases: []
    };

    Object.keys(keysWithDefaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(keysWithDefaults[key]));
      }
    });

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
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
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  // ---------------------- Generic Helpers ----------------------

  _parseISODate(dateStr) {
    return new Date(dateStr + (dateStr.length === 10 ? "T00:00:00Z" : ""));
  }

  _diffNights(checkIn, checkOut) {
    const inDate = this._parseISODate(checkIn);
    const outDate = this._parseISODate(checkOut);
    const msPerNight = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.round((outDate - inDate) / msPerNight));
  }

  _getChaletById(chaletId) {
    const chalets = this._getFromStorage("chalets", []);
    return chalets.find((c) => c.id === chaletId) || null;
  }

  _getProductById(productId) {
    const products = this._getFromStorage("products", []);
    return products.find((p) => p.id === productId) || null;
  }

  _getStayExtraByType(extraType) {
    const stayExtras = this._getFromStorage("stay_extras", []);
    return stayExtras.find((e) => e.extra_type === extraType && e.is_active) || null;
  }

  _getOrCreateCart() {
    let cart = this._getFromStorage("cart", null);
    if (!cart) {
      cart = {
        id: this._generateId("cart"),
        items: [], // array of CartItem IDs
        subtotal: 0,
        estimated_shipping: 0,
        estimated_tax: 0,
        total: 0,
        delivery_option: null,
        chalet_id: null,
        chalet_name: null,
        delivery_date: null,
        created_at: new Date().toISOString(),
        updated_at: null
      };
      this._saveToStorage("cart", cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage("cart_items", []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    let subtotal = 0;
    let hasPhysicalPaidShipping = false;

    itemsForCart.forEach((item) => {
      subtotal += item.line_total || 0;
      if (item.is_digital) return;
      if (!item.is_free_shipping) {
        hasPhysicalPaidShipping = true;
      }
    });

    const estimated_shipping = hasPhysicalPaidShipping ? 10 : 0; // simple flat rule
    const estimated_tax = subtotal * 0.1; // 10% tax approximation
    const total = subtotal + estimated_shipping + estimated_tax;

    cart.subtotal = subtotal;
    cart.estimated_shipping = estimated_shipping;
    cart.estimated_tax = estimated_tax;
    cart.total = total;
    cart.updated_at = new Date().toISOString();

    this._saveToStorage("cart", cart);
    return cart;
  }

  _recalculateBookingExtrasTotals(booking) {
    const bookingExtras = this._getFromStorage("booking_extras", []);
    const extrasForBooking = bookingExtras.filter((be) => be.booking_id === booking.id);

    let extras_total = 0;
    extrasForBooking.forEach((e) => {
      extras_total += e.total_price || 0;
    });

    booking.extras_total = extras_total;
    const baseTotal = (booking.room_charges_total || 0) + (booking.taxes || 0) + (booking.fees || 0);
    booking.grand_total = baseTotal + extras_total;
    booking.updated_at = new Date().toISOString();

    // persist booking
    const bookings = this._getFromStorage("bookings", []);
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
      this._saveToStorage("bookings", bookings);
    }

    return { booking, extrasForBooking, extras_total };
  }

  _calculateChaletStayPrice(chalet, checkIn, checkOut, adults, children) {
    const nights = this._diffNights(checkIn, checkOut);
    const baseRate = chalet.base_nightly_price || 0;

    // Use the advertised base nightly rate for pricing so that search filters
    // and booking totals align with displayed prices.
    const perNight = baseRate;

    const room_charges_total = perNight * nights;
    const taxes = room_charges_total * 0.1; // 10% tax
    const fees = room_charges_total * 0.05; // 5% fees
    const total = room_charges_total + taxes + fees;

    return {
      check_in: checkIn,
      check_out: checkOut,
      nights,
      adults,
      children,
      base_nightly_rate: perNight,
      room_charges_total,
      taxes,
      fees,
      total,
      currency: chalet.currency
    };
  }

  _hydrateCart(cart) {
    if (!cart) return null;
    const cartItems = this._getFromStorage("cart_items", []);
    const products = this._getFromStorage("products", []);
    const chalets = this._getFromStorage("chalets", []);

    const items = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => {
        const product = products.find((p) => p.id === ci.product_id) || null;
        return {
          ...ci,
          product
        };
      });

    const chalet = cart.chalet_id
      ? chalets.find((c) => c.id === cart.chalet_id) || null
      : null;

    return {
      ...cart,
      items,
      chalet
    };
  }

  _hydrateOrder(order) {
    if (!order) return null;
    const orderItems = this._getFromStorage("order_items", []);
    const products = this._getFromStorage("products", []);
    const chalets = this._getFromStorage("chalets", []);

    const items = orderItems
      .filter((oi) => oi.order_id === order.id)
      .map((oi) => {
        const product = products.find((p) => p.id === oi.product_id) || null;
        return {
          ...oi,
          product
        };
      });

    const chalet = order.chalet_id
      ? chalets.find((c) => c.id === order.chalet_id) || null
      : null;

    return {
      ...order,
      items,
      chalet
    };
  }

  // ---------------------- Chalet Search & Details ----------------------

  getChaletSearchDefaults() {
    const key = "chalet_search_defaults";
    let defaults = this._getFromStorage(key, null);
    if (!defaults) {
      const today = new Date();
      const inDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const outDate = new Date(inDate.getTime() + 2 * 24 * 60 * 60 * 1000);

      const toISO = (d) => d.toISOString().slice(0, 10);

      defaults = {
        default_check_in: toISO(inDate),
        default_check_out: toISO(outDate),
        default_adults: 2,
        default_children: 0
      };
      this._saveToStorage(key, defaults);
    }
    return defaults;
  }

  getChaletFilterOptions() {
    const key = "chalet_filter_options";
    let opts = this._getFromStorage(key, null);
    if (!opts) {
      opts = {
        max_nightly_price: {
          min: 50,
          max: 2000,
          step: 10
        },
        max_total_price: {
          min: 200,
          max: 10000,
          step: 50
        },
        amenities: [
          { code: "hot_tub", label: "Hot tub" },
          { code: "sauna", label: "Sauna" },
          { code: "pet_friendly", label: "Pet-friendly" }
        ],
        bedroom_options: [
          { value: 1, label: "1+ bedrooms" },
          { value: 2, label: "2+ bedrooms" },
          { value: 3, label: "3+ bedrooms" },
          { value: 4, label: "4+ bedrooms" }
        ],
        distance_to_ski_lifts_km: {
          min: 0,
          max: 50,
          preset_options: [
            { value_km: 1, label: "Within 1 km of ski lifts" },
            { value_km: 5, label: "Within 5 km of ski lifts" },
            { value_km: 10, label: "Within 10 km of ski lifts" }
          ]
        }
      };
      this._saveToStorage(key, opts);
    }
    return opts;
  }

  getChaletSortOptions() {
    const key = "chalet_sort_options";
    let opts = this._getFromStorage(key, null);
    if (!opts) {
      opts = [
        { key: "price_low_to_high", label: "Price: Low to High" },
        { key: "price_high_to_low", label: "Price: High to Low" },
        { key: "rating_high_to_low", label: "Rating: High to Low" },
        { key: "distance_to_lifts", label: "Distance to ski lifts" }
      ];
      this._saveToStorage(key, opts);
    }
    return opts;
  }

  searchAvailableChalets(checkIn, checkOut, adults, children, filters, sortBy) {
    const chalets = this._getFromStorage("chalets", []);
    const favorites = this._getFromStorage("favorite_chalets", []);

    const results = [];

    chalets.forEach((chalet) => {
      if (chalet.status !== "active") return;

      // Capacity checks
      const totalGuests = (adults || 0) + (children || 0);
      if (typeof chalet.max_guests === "number" && totalGuests > chalet.max_guests) return;
      if (typeof chalet.max_adults === "number" && adults > chalet.max_adults) return;
      if (typeof chalet.max_children === "number" && children > chalet.max_children) return;

      // Filters
      if (filters) {
        if (
          typeof filters.maxNightlyPrice === "number" ||
          typeof filters.maxTotalPrice === "number" ||
          (filters.amenities && filters.amenities.length) ||
          typeof filters.minBedrooms === "number" ||
          typeof filters.maxDistanceToSkiLiftsKm === "number" ||
          typeof filters.isPetFriendly === "boolean"
        ) {
          // Amenities
          if (filters.amenities && filters.amenities.length) {
            const chaletAm = chalet.amenities || [];
            const hasAll = filters.amenities.every((a) => chaletAm.includes(a));
            if (!hasAll) return;
          }

          // Bedrooms
          if (typeof filters.minBedrooms === "number") {
            if ((chalet.bedroom_count || 0) < filters.minBedrooms) return;
          }

          // Distance to ski lifts
          if (typeof filters.maxDistanceToSkiLiftsKm === "number") {
            if (
              typeof chalet.distance_to_ski_lifts_km === "number" &&
              chalet.distance_to_ski_lifts_km > filters.maxDistanceToSkiLiftsKm
            ) {
              return;
            }
          }

          // Pet-friendly
          if (typeof filters.isPetFriendly === "boolean") {
            if (!!chalet.is_pet_friendly !== filters.isPetFriendly) return;
          }
        }
      }

      // Pricing (needed for price filters)
      const pricing = this._calculateChaletStayPrice(
        chalet,
        checkIn,
        checkOut,
        adults,
        children
      );
      const nightly = pricing.base_nightly_rate;
      const total = pricing.total;

      if (filters) {
        if (typeof filters.maxNightlyPrice === "number" && nightly > filters.maxNightlyPrice) {
          return;
        }
        if (typeof filters.maxTotalPrice === "number" && total > filters.maxTotalPrice) {
          return;
        }
      }

      const isFavorited = favorites.some((f) => f.chalet_id === chalet.id);

      results.push({
        chalet_id: chalet.id,
        name: chalet.name,
        short_name: chalet.short_name || null,
        base_nightly_price: chalet.base_nightly_price,
        currency: chalet.currency,
        price_per_night_for_dates: nightly,
        total_price_for_stay: total,
        rating: chalet.rating || null,
        review_count: chalet.review_count || 0,
        distance_to_ski_lifts_km: chalet.distance_to_ski_lifts_km,
        bedroom_count: chalet.bedroom_count,
        is_pet_friendly: chalet.is_pet_friendly,
        amenities: chalet.amenities || [],
        images: chalet.images || [],
        is_favorited: isFavorited
      });
    });

    // Sorting
    if (sortBy === "price_low_to_high") {
      results.sort((a, b) => a.price_per_night_for_dates - b.price_per_night_for_dates);
    } else if (sortBy === "price_high_to_low") {
      results.sort((a, b) => b.price_per_night_for_dates - a.price_per_night_for_dates);
    } else if (sortBy === "rating_high_to_low") {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "distance_to_lifts") {
      results.sort(
        (a, b) => (a.distance_to_ski_lifts_km || Infinity) - (b.distance_to_ski_lifts_km || Infinity)
      );
    }

    return results;
  }

  getChaletDetails(chaletId, checkIn, checkOut, adults, children) {
    const chalet = this._getChaletById(chaletId);
    const favorites = this._getFromStorage("favorite_chalets", []);

    if (!chalet) {
      return {
        chalet: null,
        pricing: null,
        is_favorited: false
      };
    }

    let pricing = null;
    if (checkIn && checkOut) {
      pricing = this._calculateChaletStayPrice(
        chalet,
        checkIn,
        checkOut,
        adults || 0,
        children || 0
      );
    }

    const isFavorited = favorites.some((f) => f.chalet_id === chalet.id);

    // Instrumentation for task completion tracking (task2_comparedChalets)
    try {
      const record = {
        chalet_id: chalet.id,
        check_in: checkIn || null,
        check_out: checkOut || null,
        adults: adults || null,
        children: children || null,
        viewed_at: new Date().toISOString()
      };
      let existing = [];
      const raw = localStorage.getItem("task2_comparedChalets");
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            existing = parsed;
          }
        } catch (parseErr) {
          // ignore parse error and start fresh
          existing = [];
        }
      }
      existing.push(record);
      localStorage.setItem("task2_comparedChalets", JSON.stringify(existing));
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      chalet,
      pricing,
      is_favorited: isFavorited
    };
  }

  toggleFavoriteChalet(chaletId) {
    const chalets = this._getFromStorage("chalets", []);
    const chalet = chalets.find((c) => c.id === chaletId) || null;

    let favorites = this._getFromStorage("favorite_chalets", []);
    const existingIndex = favorites.findIndex((f) => f.chalet_id === chaletId);
    let is_favorited = false;
    let favorite_id = null;

    if (existingIndex !== -1) {
      // Remove
      favorite_id = favorites[existingIndex].id;
      favorites.splice(existingIndex, 1);
      is_favorited = false;
    } else {
      // Add
      const newFav = {
        id: this._generateId("favorite"),
        chalet_id: chaletId,
        chalet_name: chalet ? chalet.name : null,
        added_at: new Date().toISOString()
      };
      favorites.push(newFav);
      is_favorited = true;
      favorite_id = newFav.id;

      // Instrumentation for task completion tracking (task2_favoritedChaletId)
      try {
        localStorage.setItem("task2_favoritedChaletId", chaletId);
      } catch (e) {
        console.error("Instrumentation error:", e);
      }
    }

    this._saveToStorage("favorite_chalets", favorites);

    return {
      success: true,
      is_favorited,
      favorite_id,
      favorites_count: favorites.length
    };
  }

  getFavoriteChalets() {
    const favorites = this._getFromStorage("favorite_chalets", []);
    const chalets = this._getFromStorage("chalets", []);

    return favorites.map((fav) => {
      const chalet = chalets.find((c) => c.id === fav.chalet_id) || null;
      return {
        favorite_id: fav.id,
        added_at: fav.added_at,
        chalet
      };
    });
  }

  getHomepagePromotions() {
    let promotions = this._getFromStorage("homepage_promotions", null);
    if (!promotions) {
      promotions = {
        featured_chalets: [],
        featured_store_bundles: [],
        seasonal_offers: []
      };
    }
    return promotions;
  }

  // ---------------------- Chalet Booking Flow ----------------------

  getChaletBookingFormData(chaletId, checkIn, checkOut, adults, children, petsCount) {
    const chalet = this._getChaletById(chaletId);
    if (!chalet) {
      return {
        chalet_summary: null,
        stay_summary: null,
        price_breakdown: null
      };
    }

    const pricing = this._calculateChaletStayPrice(
      chalet,
      checkIn,
      checkOut,
      adults,
      children
    );

    const chalet_summary = {
      chalet_id: chalet.id,
      name: chalet.name,
      address_line1: chalet.address_line1 || null,
      city: chalet.city || null,
      region: chalet.region || null,
      country: chalet.country || null,
      images: chalet.images || []
    };

    const stay_summary = {
      check_in: checkIn,
      check_out: checkOut,
      nights: pricing.nights,
      adults,
      children,
      pets: petsCount || 0
    };

    const price_breakdown = {
      base_nightly_rate: pricing.base_nightly_rate,
      room_charges_total: pricing.room_charges_total,
      taxes: pricing.taxes,
      fees: pricing.fees,
      total: pricing.total,
      currency: pricing.currency
    };

    // Instrumentation for task completion tracking (task1_bookingFormOpened)
    try {
      if (chalet && checkIn && checkOut) {
        const value = {
          chalet_id: chalet.id,
          check_in: checkIn,
          check_out: checkOut,
          adults,
          children,
          pets: petsCount || 0,
          opened_at: new Date().toISOString()
        };
        localStorage.setItem("task1_bookingFormOpened", JSON.stringify(value));
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      chalet_summary,
      stay_summary,
      price_breakdown
    };
  }

  submitChaletBookingForm(
    chaletId,
    checkIn,
    checkOut,
    adults,
    children,
    petsCount,
    leadGuestFirstName,
    leadGuestLastName,
    contactEmail,
    contactPhone,
    specialRequests
  ) {
    const chalet = this._getChaletById(chaletId);
    if (!chalet) {
      return {
        success: false,
        booking: null,
        message: "Chalet not found"
      };
    }

    const pricing = this._calculateChaletStayPrice(
      chalet,
      checkIn,
      checkOut,
      adults,
      children
    );

    const bookings = this._getFromStorage("bookings", []);

    const booking = {
      id: this._generateId("booking"),
      reference_code:
        "B" + Math.random().toString(36).substr(2, 6).toUpperCase(),
      chalet_id: chalet.id,
      chalet_name: chalet.name,
      check_in: checkIn,
      check_out: checkOut,
      nights: pricing.nights,
      adults_count: adults,
      children_count: children,
      pets_count: petsCount || 0,
      lead_guest_first_name: leadGuestFirstName,
      lead_guest_last_name: leadGuestLastName,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      special_requests: specialRequests || null,
      base_nightly_rate: pricing.base_nightly_rate,
      room_charges_total: pricing.room_charges_total,
      taxes: pricing.taxes,
      fees: pricing.fees,
      extras_total: 0,
      grand_total: pricing.total,
      currency: chalet.currency,
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: null
    };

    bookings.push(booking);
    this._saveToStorage("bookings", bookings);

    return {
      success: true,
      booking,
      message: "Booking created"
    };
  }

  getBookingReview(bookingId) {
    const bookings = this._getFromStorage("bookings", []);
    const booking = bookings.find((b) => b.id === bookingId) || null;

    const chalet = booking ? this._getChaletById(booking.chalet_id) : null;

    const policiesSource = this._getFromStorage("booking_review_policies", null);
    const policies =
      policiesSource || {
        cancellation_policy: "",
        payment_terms: "",
        house_rules: ""
      };

    // Instrumentation for task completion tracking (task3_bookingReviewOpened)
    try {
      if (booking) {
        const value = {
          booking_id: bookingId,
          opened_at: new Date().toISOString()
        };
        localStorage.setItem("task3_bookingReviewOpened", JSON.stringify(value));
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      booking,
      chalet,
      policies
    };
  }

  confirmBooking(bookingId) {
    const bookings = this._getFromStorage("bookings", []);
    const idx = bookings.findIndex((b) => b.id === bookingId);
    if (idx === -1) {
      return {
        success: false,
        booking: null,
        confirmation_message: "Booking not found"
      };
    }

    const booking = bookings[idx];
    booking.status = "confirmed";
    booking.updated_at = new Date().toISOString();
    bookings[idx] = booking;
    this._saveToStorage("bookings", bookings);

    return {
      success: true,
      booking,
      confirmation_message: "Booking confirmed"
    };
  }

  // ---------------------- Store Categories & Products ----------------------

  getTopLevelStoreCategories() {
    const categories = this._getFromStorage("store_categories", []);
    // Top-level: no parent_category_id
    return categories.filter((c) => !c.parent_category_id);
  }

  getStoreCategoryFilters(categoryKey) {
    // Generic defaults per categoryKey
    const base = {
      price_range: {
        min: 0,
        max: 1000,
        step: 1
      },
      rating_options: [
        { min_rating: 4.5, label: "4.5+ stars" },
        { min_rating: 4.0, label: "4.0+ stars" }
      ],
      shipping_options: [
        { key: "free_shipping_only", label: "Free shipping only" }
      ],
      subcategories: []
    };

    if (categoryKey === "clothing_accessories") {
      base.subcategories = [
        { key: "ski_gloves", name: "Ski gloves" },
        { key: "beanie", name: "Beanies" },
        { key: "socks", name: "Socks" },
        { key: "thermal_wear", name: "Thermal wear" }
      ];
    } else if (categoryKey === "grocery_essentials") {
      base.subcategories = [
        { key: "breakfast", name: "Breakfast" },
        { key: "dinner_ready_meals", name: "Dinner & ready meals" },
        { key: "snacks", name: "Snacks" }
      ];
    } else if (categoryKey === "fireplace_comfort") {
      base.subcategories = [
        { key: "firewood", name: "Firewood" },
        { key: "matches", name: "Matches" }
      ];
    } else if (categoryKey === "candles_ambience") {
      base.subcategories = [{ key: "candle", name: "Candles" }];
    } else if (categoryKey === "games_entertainment") {
      base.subcategories = [{ key: "board_game", name: "Board games" }];
    } else if (categoryKey === "gift_cards") {
      base.subcategories = [{ key: "gift_card", name: "Gift cards" }];
    }

    return base;
  }

  listStoreProducts(categoryKey, subcategoryKey, filters, sortBy) {
    const products = this._getFromStorage("products", []);

    let result = products.filter(
      (p) => p.status === "active" && p.category_id === categoryKey
    );

    if (subcategoryKey) {
      result = result.filter((p) => {
        if (p.product_type === subcategoryKey) return true;
        const attrs = p.attributes || [];
        return attrs.includes(subcategoryKey);
      });
    }

    if (filters) {
      const {
        minPrice,
        maxPrice,
        minRating,
        freeShippingOnly,
        productTypes,
        attributes,
        minPlayers,
        maxPlayers
      } = filters;

      if (typeof minPrice === "number") {
        result = result.filter((p) => p.price >= minPrice);
      }
      if (typeof maxPrice === "number") {
        result = result.filter((p) => p.price <= maxPrice);
      }
      if (typeof minRating === "number") {
        result = result.filter((p) => (p.rating || 0) >= minRating);
      }
      if (freeShippingOnly) {
        result = result.filter((p) => !!p.is_free_shipping);
      }
      if (productTypes && productTypes.length) {
        result = result.filter((p) => productTypes.includes(p.product_type));
      }
      if (attributes && attributes.length) {
        result = result.filter((p) => {
          const attrs = p.attributes || [];
          return attributes.every((a) => attrs.includes(a));
        });
      }
      if (typeof minPlayers === "number") {
        result = result.filter((p) => {
          if (typeof p.min_players !== "number") return false;
          return p.min_players <= minPlayers && (p.max_players || Infinity) >= minPlayers;
        });
      }
      if (typeof maxPlayers === "number") {
        result = result.filter((p) => {
          if (typeof p.max_players !== "number") return false;
          return p.min_players <= maxPlayers && p.max_players >= maxPlayers;
        });
      }
    }

    if (sortBy === "price_low_to_high") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_high_to_low") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating_high_to_low") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "name_a_to_z") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return result.map((p) => ({
      product_id: p.id,
      name: p.name,
      category_key: p.category_id,
      product_type: p.product_type,
      price: p.price,
      currency: p.currency,
      rating: p.rating || null,
      review_count: p.review_count || 0,
      is_free_shipping: !!p.is_free_shipping,
      is_digital: !!p.is_digital,
      is_physical: !!p.is_physical,
      image: p.image || null,
      can_deliver_to_chalet: !!p.can_deliver_to_chalet,
      min_players: p.min_players || null,
      max_players: p.max_players || null
    }));
  }

  getProductDetails(productId) {
    const product = this._getProductById(productId);
    if (!product) {
      return {
        product: null,
        variants: [],
        shipping: {
          is_free_shipping: false,
          can_deliver_to_chalet: false
        }
      };
    }

    const variants = this._getFromStorage("product_variants", []).filter(
      (v) => v.product_id === product.id
    );

    const shipping = {
      is_free_shipping: !!product.is_free_shipping,
      can_deliver_to_chalet: !!product.can_deliver_to_chalet
    };

    return {
      product,
      variants,
      shipping
    };
  }

  // ---------------------- Cart & Checkout ----------------------

  addProductToCart(productId, quantity = 1, selectedColor, selectedSize, giftCardConfig) {
    const product = this._getProductById(productId);
    if (!product) {
      return {
        success: false,
        cart: null,
        message: "Product not found"
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);
    const variants = this._getFromStorage("product_variants", []);

    // Determine unit price with variant adjustments
    let unitPrice = product.price;
    let variant = null;
    if (selectedColor || selectedSize) {
      variant = variants.find((v) => {
        if (v.product_id !== product.id) return false;
        if (selectedColor && v.color !== selectedColor) return false;
        if (selectedSize && v.size !== selectedSize) return false;
        return true;
      }) || null;
      if (variant && typeof variant.additional_price === "number") {
        unitPrice += variant.additional_price;
      }
    }

    const qty = quantity > 0 ? quantity : 1;
    const lineTotal = unitPrice * qty;

    let gift_card_amount = null;
    let gift_card_recipient_email = null;
    let gift_card_message = null;

    if (product.is_gift_card && giftCardConfig) {
      if (typeof giftCardConfig.amount === "number") {
        gift_card_amount = giftCardConfig.amount;
      }
      if (giftCardConfig.recipientEmail) {
        gift_card_recipient_email = giftCardConfig.recipientEmail;
      }
      if (giftCardConfig.message) {
        gift_card_message = giftCardConfig.message;
      }
    }

    const cartItem = {
      id: this._generateId("cartitem"),
      cart_id: cart.id,
      product_id: product.id,
      product_name: product.name,
      category_id: product.category_id,
      unit_price: unitPrice,
      quantity: qty,
      line_total: lineTotal,
      is_digital: !!product.is_digital,
      is_free_shipping: !!product.is_free_shipping,
      is_gift_card: !!product.is_gift_card,
      selected_color: selectedColor || null,
      gift_card_amount,
      gift_card_recipient_email,
      gift_card_message,
      min_players: product.min_players || null,
      max_players: product.max_players || null,
      created_at: new Date().toISOString()
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(cartItem.id);

    this._recalculateCartTotals(cart);

    const hydratedCart = this._hydrateCart(cart);

    return {
      success: true,
      cart: hydratedCart,
      message: "Product added to cart"
    };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    const hydrated = this._hydrateCart(cart);
    return {
      cart: hydrated
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cart: this._hydrateCart(cart)
      };
    }

    if (quantity <= 0) {
      // Remove item entirely
      const removed = cartItems.splice(idx, 1)[0];
      this._saveToStorage("cart_items", cartItems);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== removed.id);
      }
      cart = this._recalculateCartTotals(cart);
      return {
        success: true,
        cart: this._hydrateCart(cart)
      };
    }

    const item = cartItems[idx];
    item.quantity = quantity;
    item.line_total = item.unit_price * quantity;
    cartItems[idx] = item;
    this._saveToStorage("cart_items", cartItems);

    cart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: this._hydrateCart(cart)
    };
  }

  removeCartItem(cartItemId) {
    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cart: this._hydrateCart(cart)
      };
    }

    const removed = cartItems.splice(idx, 1)[0];
    this._saveToStorage("cart_items", cartItems);

    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== removed.id);
    }

    cart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: this._hydrateCart(cart)
    };
  }

  setCartDeliveryContext(deliveryOption, chaletId, deliveryDate) {
    let cart = this._getOrCreateCart();

    cart.delivery_option = deliveryOption;

    if (chaletId) {
      const chalet = this._getChaletById(chaletId);
      cart.chalet_id = chaletId;
      cart.chalet_name = chalet ? chalet.name : null;
    } else {
      cart.chalet_id = null;
      cart.chalet_name = null;
    }

    if (deliveryDate) {
      cart.delivery_date = deliveryDate;
    }

    cart.updated_at = new Date().toISOString();
    this._saveToStorage("cart", cart);
    cart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: this._hydrateCart(cart)
    };
  }

  createOrderFromCart() {
    const cart = this._getFromStorage("cart", null);
    const cartItems = this._getFromStorage("cart_items", []);

    if (!cart || !Array.isArray(cart.items) || cart.items.length === 0) {
      return {
        success: false,
        order: null
      };
    }

    const products = this._getFromStorage("products", []);

    const orders = this._getFromStorage("orders", []);
    const orderItemsAll = this._getFromStorage("order_items", []);

    // Determine currency (from first product)
    let currency = "usd";
    const firstItem = cartItems.find((ci) => ci.cart_id === cart.id);
    if (firstItem) {
      const prod = products.find((p) => p.id === firstItem.product_id);
      if (prod && prod.currency) {
        currency = prod.currency;
      }
    }

    const order = {
      id: this._generateId("order"),
      order_number:
        "O" + Math.random().toString(36).substr(2, 8).toUpperCase(),
      items: [], // OrderItem IDs
      subtotal: cart.subtotal || 0,
      tax: cart.estimated_tax || 0,
      shipping_fee: cart.estimated_shipping || 0,
      total: cart.total || 0,
      currency,
      status: "draft",
      delivery_option: cart.delivery_option || null,
      chalet_id: cart.chalet_id || null,
      chalet_name: cart.chalet_name || null,
      delivery_date: cart.delivery_date || null,
      purchaser_name: "",
      purchaser_email: "",
      billing_address_line1: "",
      billing_address_line2: "",
      billing_city: "",
      billing_region: "",
      billing_postal_code: "",
      billing_country: "",
      notes: "",
      created_at: new Date().toISOString(),
      updated_at: null
    };

    // Create order items
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    itemsForCart.forEach((ci) => {
      const orderItem = {
        id: this._generateId("orderitem"),
        order_id: order.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        category_id: ci.category_id,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        is_digital: ci.is_digital,
        is_gift_card: ci.is_gift_card,
        gift_card_amount: ci.gift_card_amount || null,
        gift_card_recipient_email: ci.gift_card_recipient_email || null,
        gift_card_message: ci.gift_card_message || null,
        min_players: ci.min_players || null,
        max_players: ci.max_players || null,
        created_at: new Date().toISOString()
      };
      orderItemsAll.push(orderItem);
      order.items.push(orderItem.id);
    });

    orders.push(order);
    this._saveToStorage("orders", orders);
    this._saveToStorage("order_items", orderItemsAll);

    return {
      success: true,
      order: this._hydrateOrder(order)
    };
  }

  updateOrderDeliveryOptions(orderId, deliveryOption, chaletId, deliveryDate) {
    const orders = this._getFromStorage("orders", []);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) {
      return {
        success: false,
        order: null
      };
    }

    const order = orders[idx];

    if (deliveryOption) {
      order.delivery_option = deliveryOption;
    }

    if (chaletId) {
      const chalet = this._getChaletById(chaletId);
      order.chalet_id = chaletId;
      order.chalet_name = chalet ? chalet.name : null;
    }

    if (deliveryDate) {
      order.delivery_date = deliveryDate;
    }

    order.updated_at = new Date().toISOString();
    orders[idx] = order;
    this._saveToStorage("orders", orders);

    return {
      success: true,
      order: this._hydrateOrder(order)
    };
  }

  updateOrderPurchaserDetails(orderId, purchaserName, purchaserEmail, billingAddress) {
    const orders = this._getFromStorage("orders", []);
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) {
      return {
        success: false,
        order: null
      };
    }

    const order = orders[idx];
    order.purchaser_name = purchaserName;
    order.purchaser_email = purchaserEmail;

    if (billingAddress) {
      order.billing_address_line1 = billingAddress.line1 || "";
      order.billing_address_line2 = billingAddress.line2 || "";
      order.billing_city = billingAddress.city || "";
      order.billing_region = billingAddress.region || "";
      order.billing_postal_code = billingAddress.postalCode || "";
      order.billing_country = billingAddress.country || "";
    }

    order.updated_at = new Date().toISOString();
    orders[idx] = order;
    this._saveToStorage("orders", orders);

    return {
      success: true,
      order: this._hydrateOrder(order)
    };
  }

  getCheckoutSummary(orderId) {
    const orders = this._getFromStorage("orders", []);
    const order = orders.find((o) => o.id === orderId) || null;
    return {
      order: this._hydrateOrder(order)
    };
  }

  getPaymentMethods(orderId) {
    // orderId currently unused but kept for interface consistency
    const methods = this._getFromStorage("payment_methods", []);

    // Instrumentation for task completion tracking (task7_paymentPageOpened)
    try {
      const value = {
        order_id: orderId,
        opened_at: new Date().toISOString()
      };
      localStorage.setItem("task7_paymentPageOpened", JSON.stringify(value));
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return methods.filter((m) => m.is_enabled);
  }

  // ---------------------- Manage Booking & Extras ----------------------

  lookupBookingByReference(referenceCode, lastName) {
    const bookings = this._getFromStorage("bookings", []);
    const match = bookings.find(
      (b) =>
        b.reference_code === referenceCode &&
        (b.lead_guest_last_name || "").toLowerCase() === (lastName || "").toLowerCase()
    );

    if (!match) {
      return {
        success: true,
        booking_found: false,
        error_code: "not_found",
        booking: null
      };
    }

    const chalet = this._getChaletById(match.chalet_id);
    const bookingWithChalet = {
      ...match,
      chalet
    };

    return {
      success: true,
      booking_found: true,
      booking: bookingWithChalet
    };
  }

  getBookingDetailsWithExtras(bookingId) {
    const bookings = this._getFromStorage("bookings", []);
    const booking = bookings.find((b) => b.id === bookingId) || null;
    const bookingExtras = this._getFromStorage("booking_extras", []);
    const stayExtras = this._getFromStorage("stay_extras", []);

    const extras = bookingExtras
      .filter((be) => be.booking_id === bookingId)
      .map((be) => {
        const stayExtra = stayExtras.find((se) => se.id === be.stay_extra_id) || null;
        return {
          ...be,
          stay_extra: stayExtra
        };
      });

    let extras_total = 0;
    extras.forEach((e) => {
      extras_total += e.total_price || 0;
    });

    const adultsCount = booking ? booking.adults_count || 0 : 0;
    const extras_per_adult = adultsCount > 0 ? extras_total / adultsCount : 0;

    return {
      booking,
      extras,
      extras_total,
      extras_per_adult,
      currency: booking ? booking.currency : null
    };
  }

  getAvailableStayExtras(bookingId) {
    // bookingId unused for now; could be used for context-specific availability
    const stayExtras = this._getFromStorage("stay_extras", []);
    return stayExtras.filter((se) => se.is_active);
  }

  updateBookingExtras(bookingId, airportTransfer, dailyBreakfast, lateCheckout) {
    const bookings = this._getFromStorage("bookings", []);
    const bookingIdx = bookings.findIndex((b) => b.id === bookingId);
    if (bookingIdx === -1) {
      return {
        success: false,
        booking: null,
        extras: [],
        extras_total: 0,
        extras_per_adult: 0,
        currency: null
      };
    }

    const booking = bookings[bookingIdx];
    let bookingExtras = this._getFromStorage("booking_extras", []);

    // Helper to remove existing extras of a type for this booking
    const removeByType = (type) => {
      bookingExtras = bookingExtras.filter(
        (be) => !(be.booking_id === booking.id && be.extra_type === type)
      );
    };

    // Airport transfer
    if (airportTransfer) {
      removeByType("airport_transfer");
      if (airportTransfer.enabled) {
        const passengersCount = airportTransfer.passengersCount || booking.adults_count || 0;
        const direction = airportTransfer.direction || "one_way";

        // Select the appropriate stay extra based on direction so that
        // pricing matches the per-booking amounts defined in the catalog.
        const allStayExtras = this._getFromStorage("stay_extras", []);
        let stayExtra = null;
        if (direction === "round_trip") {
          stayExtra = allStayExtras.find(
            (se) => se.extra_type === "airport_transfer" && /round trip/i.test(se.name || "") && se.is_active
          );
        } else {
          stayExtra = allStayExtras.find(
            (se) => se.extra_type === "airport_transfer" && /one way/i.test(se.name || "") && se.is_active
          );
        }
        if (!stayExtra) {
          stayExtra = this._getStayExtraByType("airport_transfer");
        }

        if (stayExtra) {
          // Price per booking (not per passenger or per direction)
          const unit_price = stayExtra.base_price;
          const quantity = 1;
          const total_price = unit_price * quantity;

          const be = {
            id: this._generateId("bookingextra"),
            booking_id: booking.id,
            stay_extra_id: stayExtra.id,
            extra_type: "airport_transfer",
            quantity,
            passengers_count: passengersCount,
            guests_count: null,
            direction,
            date_from: null,
            date_to: null,
            date: null,
            unit_price,
            total_price,
            currency: stayExtra.currency,
            created_at: new Date().toISOString()
          };
          bookingExtras.push(be);
        }
      }
    }

    // Daily breakfast
    if (dailyBreakfast) {
      removeByType("daily_breakfast");
      if (dailyBreakfast.enabled) {
        const stayExtra = this._getStayExtraByType("daily_breakfast");
        if (stayExtra) {
          const guestsCount = dailyBreakfast.guestsCount || booking.adults_count || 0;
          const dateFrom = dailyBreakfast.dateFrom || booking.check_in;
          const dateTo = dailyBreakfast.dateTo || booking.check_out;
          const nights = this._diffNights(dateFrom, dateTo) || booking.nights || 0;

          let unit_price = stayExtra.base_price * guestsCount;
          let quantity = nights;
          const total_price = unit_price * quantity;

          const be = {
            id: this._generateId("bookingextra"),
            booking_id: booking.id,
            stay_extra_id: stayExtra.id,
            extra_type: "daily_breakfast",
            quantity,
            passengers_count: null,
            guests_count: guestsCount,
            direction: null,
            date_from: dateFrom,
            date_to: dateTo,
            date: null,
            unit_price,
            total_price,
            currency: stayExtra.currency,
            created_at: new Date().toISOString()
          };
          bookingExtras.push(be);
        }
      }
    }

    // Late checkout
    if (lateCheckout) {
      removeByType("late_checkout");
      if (lateCheckout.enabled) {
        const stayExtra = this._getStayExtraByType("late_checkout");
        if (stayExtra) {
          const date = lateCheckout.date || booking.check_out;
          const unit_price = stayExtra.base_price;
          const quantity = 1;
          const total_price = unit_price * quantity;

          const be = {
            id: this._generateId("bookingextra"),
            booking_id: booking.id,
            stay_extra_id: stayExtra.id,
            extra_type: "late_checkout",
            quantity,
            passengers_count: null,
            guests_count: null,
            direction: null,
            date_from: null,
            date_to: null,
            date,
            unit_price,
            total_price,
            currency: stayExtra.currency,
            created_at: new Date().toISOString()
          };
          bookingExtras.push(be);
        }
      }
    }

    this._saveToStorage("booking_extras", bookingExtras);

    const { extrasForBooking, extras_total } = this._recalculateBookingExtrasTotals(booking);

    // Rehydrate extras with StayExtra
    const stayExtras = this._getFromStorage("stay_extras", []);
    const extras = extrasForBooking.map((be) => {
      const stayExtra = stayExtras.find((se) => se.id === be.stay_extra_id) || null;
      return {
        ...be,
        stay_extra: stayExtra
      };
    });

    const adultsCount = booking.adults_count || 0;
    const extras_per_adult = adultsCount > 0 ? extras_total / adultsCount : 0;

    return {
      success: true,
      booking,
      extras,
      extras_total,
      extras_per_adult,
      currency: booking.currency
    };
  }

  // ---------------------- Static Content & Contact ----------------------

  getAboutContent() {
    const about = this._getFromStorage("about_content", null);
    if (!about) {
      return {
        brand_story: "",
        mission: "",
        location_highlights: [],
        quality_and_safety: "",
        partnerships_and_certifications: ""
      };
    }
    return about;
  }

  getContactInfo() {
    const info = this._getFromStorage("contact_info", null);
    if (!info) {
      return {
        email: "",
        phone: "",
        emergency_phone: "",
        address_line1: "",
        address_line2: "",
        city: "",
        region: "",
        postal_code: "",
        country: "",
        response_time_expectation: ""
      };
    }
    return info;
  }

  submitContactForm(name, email, topic, message, bookingReference, orderNumber) {
    const cases = this._getFromStorage("contact_cases", []);
    const caseId = this._generateId("case");

    const contactCase = {
      id: caseId,
      name,
      email,
      topic,
      message,
      booking_reference: bookingReference || null,
      order_number: orderNumber || null,
      created_at: new Date().toISOString()
    };

    cases.push(contactCase);
    this._saveToStorage("contact_cases", cases);

    return {
      success: true,
      case_id: caseId,
      message: "Your message has been submitted"
    };
  }

  getFaqEntries() {
    const faqs = this._getFromStorage("faq_entries", []);
    return faqs;
  }

  getPolicies() {
    const policies = this._getFromStorage("policies", []);
    return policies;
  }
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}
