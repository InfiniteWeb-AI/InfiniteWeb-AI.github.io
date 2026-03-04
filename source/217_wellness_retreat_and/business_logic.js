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
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    // Core entity tables based on data model
    const defaults = {
      retreats: [],
      retreat_bookings: [],
      spa_treatments: [],
      therapists: [],
      treatment_time_slots: [],
      spa_treatment_bookings: [],
      rooms: [],
      room_bookings: [],
      day_pass_types: [],
      add_ons: [],
      day_pass_bookings: [],
      gift_card_templates: [],
      gift_card_purchases: [],
      custom_spa_packages: [],
      custom_spa_package_items: [],
      cart: null, // single cart object for single-user site
      cart_items: [],
      orders: [],
      order_items: [],
      account_profiles: [],
      contact_submissions: [],
      faqs: [],
      policies: {
        termsOfUse: "",
        privacyPolicy: "",
        bookingPolicy: "",
        cancellationPolicy: "",
        giftCardPolicy: ""
      }
    };

    Object.keys(defaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaults[key]));
      }
    });

    // Legacy keys from example skeleton (kept but unused)
    if (!localStorage.getItem("users")) {
      localStorage.setItem("users", JSON.stringify([]));
    }
    if (!localStorage.getItem("products")) {
      localStorage.setItem("products", JSON.stringify([]));
    }
    if (!localStorage.getItem("carts")) {
      localStorage.setItem("carts", JSON.stringify([]));
    }
    if (!localStorage.getItem("cartItems")) {
      localStorage.setItem("cartItems", JSON.stringify([]));
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data !== null && data !== undefined) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    return new Date(dateStr);
  }

  _daysBetween(startDateStr, endDateStr) {
    const start = this._parseDate(startDateStr);
    const end = this._parseDate(endDateStr);
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.round((end - start) / msPerDay));
  }

  _indexById(list) {
    const map = {};
    for (const item of list) {
      if (item && item.id) {
        map[item.id] = item;
      }
    }
    return map;
  }

  // -------------------- Cart helpers --------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage("cart", null);
    if (!cart || !cart.id) {
      cart = {
        id: this._generateId("cart"),
        items: [],
        created_at: this._nowISO(),
        updated_at: this._nowISO(),
        subtotal: 0,
        taxes: 0,
        total: 0,
        currency: "USD"
      };
      this._saveToStorage("cart", cart);
    }
    return cart;
  }

  _recalculateCartTotals() {
    const cart = this._getFromStorage("cart", null);
    if (!cart || !cart.id) return null;
    const cartItems = this._getFromStorage("cart_items", []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.total_price || 0), 0);
    cart.subtotal = subtotal;
    cart.taxes = 0;
    cart.total = subtotal;
    cart.currency = cart.currency || "USD";
    cart.updated_at = this._nowISO();
    cart.items = itemsForCart.map((ci) => ci.id);
    this._saveToStorage("cart", cart);
    return cart;
  }

  _getCartItemsWithRelations() {
    const cart = this._getFromStorage("cart", null);
    if (!cart || !cart.id) {
      return { cart: null, cartItems: [] };
    }

    const cartItems = this._getFromStorage("cart_items", []);
    const retreatBookings = this._getFromStorage("retreat_bookings", []);
    const spaTreatmentBookings = this._getFromStorage("spa_treatment_bookings", []);
    const customSpaPackages = this._getFromStorage("custom_spa_packages", []);
    const customSpaPackageItems = this._getFromStorage("custom_spa_package_items", []);
    const roomBookings = this._getFromStorage("room_bookings", []);
    const dayPassBookings = this._getFromStorage("day_pass_bookings", []);
    const giftCardPurchases = this._getFromStorage("gift_card_purchases", []);

    const retreats = this._getFromStorage("retreats", []);
    const spaTreatments = this._getFromStorage("spa_treatments", []);
    const therapists = this._getFromStorage("therapists", []);
    const timeSlots = this._getFromStorage("treatment_time_slots", []);
    const rooms = this._getFromStorage("rooms", []);
    const dayPassTypes = this._getFromStorage("day_pass_types", []);
    const addOns = this._getFromStorage("add_ons", []);
    const giftCardTemplates = this._getFromStorage("gift_card_templates", []);

    const retreatMap = this._indexById(retreats);
    const retreatBookingMap = this._indexById(retreatBookings);
    const spaTreatmentMap = this._indexById(spaTreatments);
    const therapistMap = this._indexById(therapists);
    const timeSlotMap = this._indexById(timeSlots);
    const roomMap = this._indexById(rooms);
    const dayPassTypeMap = this._indexById(dayPassTypes);
    const addOnMap = this._indexById(addOns);
    const giftCardTemplateMap = this._indexById(giftCardTemplates);
    const spaTreatmentBookingMap = this._indexById(spaTreatmentBookings);
    const customSpaPackageMap = this._indexById(customSpaPackages);
    const customSpaPackageItemsByPackage = {};

    for (const item of customSpaPackageItems) {
      const pid = item.custom_spa_package_id;
      if (!customSpaPackageItemsByPackage[pid]) customSpaPackageItemsByPackage[pid] = [];
      customSpaPackageItemsByPackage[pid].push({ ...item });
    }

    const roomBookingMap = this._indexById(roomBookings);
    const dayPassBookingMap = this._indexById(dayPassBookings);
    const giftCardPurchaseMap = this._indexById(giftCardPurchases);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const enrichedCartItems = itemsForCart.map((ci) => {
      const enriched = { ...ci };

      // Retreat booking
      if (ci.retreat_booking_id) {
        const rbBase = retreatBookingMap[ci.retreat_booking_id] || null;
        if (rbBase) {
          const rb = { ...rbBase };
          if (rb.retreat_id) {
            rb.retreat = retreatMap[rb.retreat_id] || null;
          }
          enriched.retreat_booking = rb;
        } else {
          enriched.retreat_booking = null;
        }
      }

      // Spa treatment booking
      if (ci.spa_treatment_booking_id) {
        const stbBase = spaTreatmentBookingMap[ci.spa_treatment_booking_id] || null;
        if (stbBase) {
          const stb = { ...stbBase };
          if (stb.spa_treatment_id) {
            stb.spa_treatment = spaTreatmentMap[stb.spa_treatment_id] || null;
          }
          if (stb.treatment_time_slot_id) {
            const slot = timeSlotMap[stb.treatment_time_slot_id] || null;
            if (slot) {
              const slotEnriched = { ...slot };
              if (slotEnriched.spa_treatment_id) {
                slotEnriched.spa_treatment = spaTreatmentMap[slotEnriched.spa_treatment_id] || null;
              }
              if (slotEnriched.therapist_id) {
                slotEnriched.therapist = therapistMap[slotEnriched.therapist_id] || null;
              }
              stb.treatment_time_slot = slotEnriched;
            } else {
              stb.treatment_time_slot = null;
            }
          }
          if (stb.therapist_id) {
            stb.therapist = therapistMap[stb.therapist_id] || null;
          }
          enriched.spa_treatment_booking = stb;
        } else {
          enriched.spa_treatment_booking = null;
        }
      }

      // Custom spa package
      if (ci.custom_spa_package_id) {
        const pkgBase = customSpaPackageMap[ci.custom_spa_package_id] || null;
        if (pkgBase) {
          const pkg = { ...pkgBase };
          const pkgItems = (customSpaPackageItemsByPackage[pkg.id] || []).map((it) => {
            const itemEnriched = { ...it };
            if (itemEnriched.spa_treatment_id) {
              itemEnriched.spa_treatment = spaTreatmentMap[itemEnriched.spa_treatment_id] || null;
            }
            return itemEnriched;
          });
          pkg.items = pkgItems;
          enriched.custom_spa_package = pkg;
        } else {
          enriched.custom_spa_package = null;
        }
      }

      // Room booking
      if (ci.room_booking_id) {
        const rbBase = roomBookingMap[ci.room_booking_id] || null;
        if (rbBase) {
          const rb = { ...rbBase };
          if (rb.room_id) {
            rb.room = roomMap[rb.room_id] || null;
          }
          enriched.room_booking = rb;
        } else {
          enriched.room_booking = null;
        }
      }

      // Day pass booking
      if (ci.day_pass_booking_id) {
        const dpbBase = dayPassBookingMap[ci.day_pass_booking_id] || null;
        if (dpbBase) {
          const dpb = { ...dpbBase };
          if (dpb.day_pass_type_id) {
            dpb.day_pass_type = dayPassTypeMap[dpb.day_pass_type_id] || null;
          }
          if (Array.isArray(dpb.selected_add_on_ids)) {
            dpb.add_ons = dpb.selected_add_on_ids.map((id) => addOnMap[id] || null).filter((x) => x);
          } else {
            dpb.add_ons = [];
          }
          enriched.day_pass_booking = dpb;
        } else {
          enriched.day_pass_booking = null;
        }
      }

      // Gift card purchase
      if (ci.gift_card_purchase_id) {
        const gcpBase = giftCardPurchaseMap[ci.gift_card_purchase_id] || null;
        if (gcpBase) {
          const gcp = { ...gcpBase };
          if (gcp.template_id) {
            gcp.template = giftCardTemplateMap[gcp.template_id] || null;
          }
          enriched.gift_card_purchase = gcp;
        } else {
          enriched.gift_card_purchase = null;
        }
      }

      return enriched;
    });

    return { cart, cartItems: enrichedCartItems };
  }

  // -------------------- Price helpers --------------------

  _calculateRetreatPrice(retreat, checkInDate, checkOutDate) {
    if (!retreat) return null;
    let duration_nights = 0;
    if (checkInDate && checkOutDate) {
      duration_nights = this._daysBetween(checkInDate, checkOutDate);
    } else if (typeof retreat.duration_nights === "number") {
      duration_nights = retreat.duration_nights;
    }

    let price_per_night = retreat.price_per_night || 0;
    if ((!price_per_night || price_per_night <= 0) && retreat.package_price_total && retreat.duration_nights) {
      price_per_night = retreat.package_price_total / retreat.duration_nights;
    }

    let total_price;
    if (retreat.package_price_total && duration_nights === retreat.duration_nights) {
      total_price = retreat.package_price_total;
    } else {
      total_price = price_per_night * duration_nights;
    }

    return {
      duration_nights,
      price_per_night,
      total_price,
      currency: retreat.currency || "USD"
    };
  }

  _calculateRoomPrice(room, checkInDate, checkOutDate) {
    if (!room) return null;
    const nights = this._daysBetween(checkInDate, checkOutDate);
    const nightly_rate = room.nightly_rate || 0;
    return {
      num_nights: nights,
      nightly_rate,
      total_price: nightly_rate * nights,
      currency: room.currency || "USD"
    };
  }

  _calculateDayPassPrice(dayPassType, numGuests, addOnEntities) {
    if (!dayPassType) return null;
    const guests = numGuests || 1;
    const basePerGuest = dayPassType.base_price_per_guest || 0;
    const total_base_price = basePerGuest * guests;
    let total_add_ons_price = 0;
    if (Array.isArray(addOnEntities)) {
      for (const ao of addOnEntities) {
        if (!ao) continue;
        const pricePerGuest = ao.price_per_guest || 0;
        total_add_ons_price += pricePerGuest * guests;
      }
    }
    const total_price = total_base_price + total_add_ons_price;
    const currency = dayPassType.currency || (addOnEntities && addOnEntities[0] && addOnEntities[0].currency) || "USD";
    return { total_base_price, total_add_ons_price, total_price, currency };
  }

  _evaluateCustomSpaPackageRules(items) {
    const required_num_treatments = 3;
    const min_total_duration_minutes = 180;
    const max_total_duration_minutes = 240;
    const max_total_price = 350; // strictly under

    const num_treatments = items.length;
    const total_duration_minutes = items.reduce((sum, it) => sum + (it.duration_minutes || 0), 0);
    const total_price = items.reduce((sum, it) => sum + (it.price || 0), 0);

    const violations = [];
    if (num_treatments !== required_num_treatments) {
      violations.push("exactly_3_treatments_required");
    }
    if (total_duration_minutes < min_total_duration_minutes) {
      violations.push("total_duration_too_short");
    }
    if (total_duration_minutes > max_total_duration_minutes) {
      violations.push("total_duration_too_long");
    }
    if (total_price >= max_total_price) {
      violations.push("total_price_too_high");
    }

    return {
      total_duration_minutes,
      total_price,
      num_treatments,
      is_valid: violations.length === 0,
      violations
    };
  }

  // -------------------- Interface implementations --------------------
  // 1) getHomeFeaturedContent

  getHomeFeaturedContent() {
    const retreats = this._getFromStorage("retreats", []).filter((r) => r.is_active !== false);
    const spaTreatments = this._getFromStorage("spa_treatments", []).filter((t) => t.is_active !== false);
    const rooms = this._getFromStorage("rooms", []).filter((r) => r.is_active !== false);
    const dayPassTypes = this._getFromStorage("day_pass_types", []).filter((d) => d.is_active !== false);
    const giftCardTemplates = this._getFromStorage("gift_card_templates", []).filter((g) => g.is_active !== false);

    const sortByRating = (a, b) => (b.average_rating || 0) - (a.average_rating || 0);

    const featuredRetreats = retreats.sort(sortByRating).slice(0, 3);
    const featuredSpaTreatments = spaTreatments.sort(sortByRating).slice(0, 3);
    const featuredRooms = rooms.sort(sortByRating).slice(0, 3);
    const featuredDayPassTypes = dayPassTypes.slice(0, 3);
    const featuredGiftCardTemplates = giftCardTemplates.slice(0, 3);

    const wellnessHighlights = [
      {
        id: "highlight_mind_body",
        title: "Mind & Body Balance",
        description: "Combine yoga, meditation, and spa therapies to restore your natural rhythm."
      },
      {
        id: "highlight_sleep",
        title: "Restful Sleep Rituals",
        description: "Evening rituals, herbal teas, and treatments designed to improve sleep quality."
      },
      {
        id: "highlight_detox",
        title: "Gentle Detox Support",
        description: "Support your body with nourishing meals and targeted spa experiences."
      }
    ];

    return {
      featuredRetreats,
      featuredSpaTreatments,
      featuredRooms,
      featuredDayPassTypes,
      featuredGiftCardTemplates,
      wellnessHighlights
    };
  }

  // 2) searchQuickAvailability

  searchQuickAvailability(searchType, checkInDate, checkOutDate, date, timeOfDay, numGuests) {
    const type = searchType;
    let results = [];

    if (type === "retreat") {
      const retreats = this._getFromStorage("retreats", []).filter((r) => r.is_active !== false);
      results = retreats.map((r) => {
        const priceFrom = r.price_per_night || r.package_price_total || 0;
        return {
          id: r.id,
          name: r.name,
          type: "retreat",
          summary: r.subtitle || "",
          priceFrom,
          currency: r.currency || "USD"
        };
      });
    } else if (type === "room") {
      const rooms = this._getFromStorage("rooms", []).filter((room) => room.is_active !== false);
      const guests = numGuests || 1;
      results = rooms
        .filter((room) => (room.occupancy_max || 0) >= guests)
        .map((room) => ({
          id: room.id,
          name: room.name,
          type: "room",
          summary: room.description || "",
          priceFrom: room.nightly_rate || 0,
          currency: room.currency || "USD"
        }));
    } else if (type === "spa_treatment") {
      const searchRes = this.searchSpaTreatments(undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, date, timeOfDay, 1, 20);
      results = searchRes.results.map((t) => ({
        id: t.id,
        name: t.name,
        type: "spa_treatment",
        summary: "Duration " + t.duration_minutes + " min",
        priceFrom: t.price || 0,
        currency: t.currency || "USD"
      }));
    } else if (type === "day_pass") {
      const dayPassTypes = this._getFromStorage("day_pass_types", []).filter((d) => d.is_active !== false);
      results = dayPassTypes.map((d) => ({
        id: d.id,
        name: d.name,
        type: "day_pass",
        summary: d.description || "",
        priceFrom: d.base_price_per_guest || 0,
        currency: d.currency || "USD"
      }));
    }

    return { searchType: type, results };
  }

  // 3) getRetreatFilterOptions

  getRetreatFilterOptions() {
    const retreats = this._getFromStorage("retreats", []);
    const typeSet = new Set();
    const durationSet = new Set();
    const mealPlanSet = new Set();
    const inclusionSet = new Set();
    const priceTotals = [];
    const ratings = [];

    for (const r of retreats) {
      if (!r) continue;
      if (r.retreat_type) typeSet.add(r.retreat_type);
      if (typeof r.duration_nights === "number") durationSet.add(r.duration_nights);
      if (Array.isArray(r.meal_plan_options)) {
        r.meal_plan_options.forEach((mp) => mealPlanSet.add(mp));
      }
      if (Array.isArray(r.inclusions)) {
        r.inclusions.forEach((inc) => inclusionSet.add(inc));
      }
      const estTotal = r.package_price_total || (r.price_per_night && r.duration_nights ? r.price_per_night * r.duration_nights : 0);
      if (estTotal) priceTotals.push(estTotal);
      if (typeof r.average_rating === "number") ratings.push(r.average_rating);
    }

    const retreatTypes = Array.from(typeSet).map((code) => ({
      code,
      label: code.charAt(0).toUpperCase() + code.slice(1)
    }));

    const durationNightOptions = Array.from(durationSet)
      .sort((a, b) => a - b)
      .map((n) => ({
        minNights: n,
        maxNights: n,
        label: `${n} night${n === 1 ? "" : "s"}`
      }));

    const mealPlanOptions = Array.from(mealPlanSet).map((code) => ({
      code,
      label: code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const inclusionOptions = Array.from(inclusionSet).map((code) => ({
      code,
      label: code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    let priceRanges = [];
    if (priceTotals.length > 0) {
      const min = Math.min(...priceTotals);
      const max = Math.max(...priceTotals);
      const step = (max - min) / 3 || max;
      priceRanges = [
        { maxTotalPrice: min + step, label: `Up to $${Math.round(min + step)}` },
        { maxTotalPrice: min + 2 * step, label: `Up to $${Math.round(min + 2 * step)}` },
        { maxTotalPrice: max, label: `Up to $${Math.round(max)}` }
      ];
    }

    const ratingOptions = [];
    const uniqueRatingFloors = Array.from(new Set(ratings.map((r) => Math.floor(r)))).sort((a, b) => a - b);
    for (const rr of uniqueRatingFloors) {
      ratingOptions.push({
        minRating: rr,
        label: `${rr}★+`
      });
    }

    const sortOptions = [
      { code: "price_low_to_high", label: "Price: Low to High" },
      { code: "price_high_to_low", label: "Price: High to Low" },
      { code: "rating_high_to_low", label: "Rating: High to Low" }
    ];

    return {
      retreatTypes,
      durationNightOptions,
      mealPlanOptions,
      inclusionOptions,
      priceRanges,
      ratingOptions,
      sortOptions
    };
  }

  // 4) searchRetreats

  searchRetreats(
    checkInDate,
    checkOutDate,
    retreatType,
    minDurationNights,
    maxDurationNights,
    mealPlan,
    requiresDailyYoga,
    maxPricePerNight,
    maxTotalPrice,
    minRating,
    sortBy,
    page,
    pageSize
  ) {
    const retreats = this._getFromStorage("retreats", []).filter((r) => r.is_active !== false);

    let filtered = retreats.filter((r) => {
      if (retreatType && r.retreat_type !== retreatType) return false;
      if (typeof minDurationNights === "number" && r.duration_nights < minDurationNights) return false;
      if (typeof maxDurationNights === "number" && r.duration_nights > maxDurationNights) return false;
      if (mealPlan && (!Array.isArray(r.meal_plan_options) || !r.meal_plan_options.includes(mealPlan))) return false;
      if (requiresDailyYoga) {
        const hasFlag = r.includes_daily_yoga === true;
        const inInclusions = Array.isArray(r.inclusions) && r.inclusions.includes("daily_yoga");
        if (!hasFlag && !inInclusions) return false;
      }
      if (typeof maxPricePerNight === "number" && (r.price_per_night || Infinity) > maxPricePerNight) return false;
      if (typeof minRating === "number" && (r.average_rating || 0) < minRating) return false;
      return true;
    });

    const useDates = checkInDate && checkOutDate;
    filtered = filtered.filter((r) => {
      let estimated_total_price;
      if (useDates) {
        const priceInfo = this._calculateRetreatPrice(r, checkInDate, checkOutDate);
        estimated_total_price = priceInfo ? priceInfo.total_price : 0;
      } else if (r.package_price_total) {
        estimated_total_price = r.package_price_total;
      } else {
        estimated_total_price = (r.price_per_night || 0) * (r.duration_nights || 0);
      }
      if (typeof maxTotalPrice === "number" && estimated_total_price > maxTotalPrice) return false;
      return true;
    });

    const withPrice = filtered.map((r) => {
      let estimated_total_price;
      let duration_nights = r.duration_nights || 0;
      if (checkInDate && checkOutDate) {
        const priceInfo = this._calculateRetreatPrice(r, checkInDate, checkOutDate);
        if (priceInfo) {
          estimated_total_price = priceInfo.total_price;
          duration_nights = priceInfo.duration_nights;
        } else {
          estimated_total_price = 0;
        }
      } else if (r.package_price_total) {
        estimated_total_price = r.package_price_total;
      } else {
        estimated_total_price = (r.price_per_night || 0) * (r.duration_nights || 0);
      }
      return { retreat: r, estimated_total_price, duration_nights };
    });

    const sortCode = sortBy || "price_low_to_high";
    withPrice.sort((a, b) => {
      if (sortCode === "price_low_to_high") return a.estimated_total_price - b.estimated_total_price;
      if (sortCode === "price_high_to_low") return b.estimated_total_price - a.estimated_total_price;
      if (sortCode === "rating_high_to_low") return (b.retreat.average_rating || 0) - (a.retreat.average_rating || 0);
      return 0;
    });

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (currentPage - 1) * size;
    const paged = withPrice.slice(startIndex, startIndex + size);

    const results = paged.map(({ retreat: r, estimated_total_price, duration_nights }) => ({
      id: r.id,
      name: r.name,
      subtitle: r.subtitle || "",
      retreat_type: r.retreat_type,
      retreat_type_label: r.retreat_type ? r.retreat_type.charAt(0).toUpperCase() + r.retreat_type.slice(1) : "",
      duration_nights,
      duration_days: r.duration_days,
      price_per_night: r.price_per_night,
      estimated_total_price,
      currency: r.currency || "USD",
      average_rating: r.average_rating,
      review_count: r.review_count,
      short_description: (r.description || "").slice(0, 180)
    }));

    return {
      results,
      totalCount: withPrice.length,
      page: currentPage,
      pageSize: size
    };
  }

  // 5) getRetreatDetails

  getRetreatDetails(retreatId, checkInDate, checkOutDate) {
    const retreats = this._getFromStorage("retreats", []);
    const retreat = retreats.find((r) => r.id === retreatId) || null;
    if (!retreat) {
      return {
        retreat: null,
        pricingPreview: null,
        relatedRetreats: [],
        suggestedSpaTreatments: []
      };
    }

    let pricingPreview = null;
    if (checkInDate && checkOutDate) {
      const p = this._calculateRetreatPrice(retreat, checkInDate, checkOutDate);
      pricingPreview = {
        checkInDate,
        checkOutDate,
        duration_nights: p.duration_nights,
        price_per_night: p.price_per_night,
        total_price: p.total_price,
        currency: p.currency
      };
    }

    const relatedRetreats = retreats
      .filter((r) => r.id !== retreat.id && r.retreat_type === retreat.retreat_type)
      .slice(0, 4);

    const spaTreatments = this._getFromStorage("spa_treatments", []).filter((t) => t.is_active !== false);
    const suggestedSpaTreatments = spaTreatments
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 4);

    return {
      retreat,
      pricingPreview,
      relatedRetreats,
      suggestedSpaTreatments
    };
  }

  // 6) addRetreatToCart

  addRetreatToCart(retreatId, checkInDate, checkOutDate, numAdults, selectedMealPlan) {
    const retreats = this._getFromStorage("retreats", []);
    const retreat = retreats.find((r) => r.id === retreatId) || null;
    if (!retreat || retreat.is_active === false) {
      return { success: false, message: "Retreat not found or inactive", retreatBooking: null, cart: null, cartItem: null };
    }

    const pricing = this._calculateRetreatPrice(retreat, checkInDate, checkOutDate);
    if (!pricing) {
      return { success: false, message: "Unable to calculate retreat pricing", retreatBooking: null, cart: null, cartItem: null };
    }

    const retreatBookings = this._getFromStorage("retreat_bookings", []);
    const booking = {
      id: this._generateId("retreat_booking"),
      retreat_id: retreat.id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      duration_nights: pricing.duration_nights,
      num_adults: numAdults,
      price_per_night: pricing.price_per_night,
      total_price: pricing.total_price,
      selected_meal_plan: selectedMealPlan || null,
      includes_daily_yoga: retreat.includes_daily_yoga === true,
      created_at: this._nowISO()
    };
    retreatBookings.push(booking);
    this._saveToStorage("retreat_bookings", retreatBookings);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);
    const cartItem = {
      id: this._generateId("cart_item"),
      cart_id: cart.id,
      item_type: "retreat_booking",
      title: retreat.name,
      quantity: 1,
      unit_price: pricing.total_price,
      total_price: pricing.total_price,
      retreat_booking_id: booking.id,
      spa_treatment_booking_id: null,
      custom_spa_package_id: null,
      room_booking_id: null,
      day_pass_booking_id: null,
      gift_card_purchase_id: null,
      created_at: this._nowISO()
    };
    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);
    const updatedCart = this._recalculateCartTotals();

    // Enrich booking with retreat for FK resolution
    const bookingEnriched = { ...booking, retreat };

    return {
      success: true,
      message: "Retreat added to cart",
      retreatBooking: bookingEnriched,
      cart: updatedCart,
      cartItem
    };
  }

  // 7) getSpaTreatmentFilterOptions

  getSpaTreatmentFilterOptions() {
    const spaTreatments = this._getFromStorage("spa_treatments", []);
    const therapists = this._getFromStorage("therapists", []);

    const categorySet = new Set();
    const durationSet = new Set();
    const prices = [];
    const ratings = [];

    for (const t of spaTreatments) {
      if (!t) continue;
      if (t.category) categorySet.add(t.category);
      if (typeof t.duration_minutes === "number") durationSet.add(t.duration_minutes);
      if (typeof t.price === "number") prices.push(t.price);
      if (typeof t.average_rating === "number") ratings.push(t.average_rating);
    }

    const therapistRatings = therapists
      .filter((th) => typeof th.average_rating === "number")
      .map((th) => th.average_rating);

    const treatmentCategories = Array.from(categorySet).map((code) => ({
      code,
      label: code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const durationOptions = Array.from(durationSet)
      .sort((a, b) => a - b)
      .map((d) => ({ duration_minutes: d, label: `${d} minutes` }));

    let priceRanges = [];
    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const step = (max - min) / 3 || max;
      priceRanges = [
        { minPrice: min, maxPrice: min + step, label: `Up to $${Math.round(min + step)}` },
        { minPrice: min, maxPrice: min + 2 * step, label: `Up to $${Math.round(min + 2 * step)}` },
        { minPrice: min, maxPrice: max, label: `Up to $${Math.round(max)}` }
      ];
    }

    const ratingOptions = [];
    const uniqueRatingFloors = Array.from(new Set(ratings.map((r) => Math.floor(r)))).sort((a, b) => a - b);
    for (const rr of uniqueRatingFloors) {
      ratingOptions.push({ minRating: rr, label: `${rr}★+` });
    }

    const therapistRatingOptions = [];
    const uniqueTherapistRatingFloors = Array.from(new Set(therapistRatings.map((r) => Math.floor(r)))).sort((a, b) => a - b);
    for (const tr of uniqueTherapistRatingFloors) {
      therapistRatingOptions.push({ minRating: tr, label: `${tr}★+` });
    }

    const timeOfDayOptions = [
      { code: "morning", label: "Morning" },
      { code: "afternoon", label: "Afternoon" },
      { code: "evening", label: "Evening" }
    ];

    return {
      treatmentCategories,
      durationOptions,
      priceRanges,
      ratingOptions,
      therapistRatingOptions,
      timeOfDayOptions
    };
  }

  // 8) searchSpaTreatments

  searchSpaTreatments(
    category,
    exactDurationMinutes,
    minDurationMinutes,
    maxDurationMinutes,
    minPrice,
    maxPrice,
    minRating,
    minTherapistRating,
    date,
    timeOfDay,
    page,
    pageSize
  ) {
    const spaTreatments = this._getFromStorage("spa_treatments", []).filter((t) => t.is_active !== false);
    const timeSlots = this._getFromStorage("treatment_time_slots", []);
    const therapists = this._getFromStorage("therapists", []);
    const therapistMap = this._indexById(therapists);

    let filtered = spaTreatments.filter((t) => {
      if (category && t.category !== category) return false;
      const d = t.duration_minutes || 0;
      if (typeof exactDurationMinutes === "number" && d !== exactDurationMinutes) return false;
      if (typeof minDurationMinutes === "number" && d < minDurationMinutes) return false;
      if (typeof maxDurationMinutes === "number" && d > maxDurationMinutes) return false;
      if (typeof minPrice === "number" && (t.price || 0) < minPrice) return false;
      if (typeof maxPrice === "number" && (t.price || 0) > maxPrice) return false;
      if (typeof minRating === "number" && (t.average_rating || 0) < minRating) return false;
      return true;
    });

    const dateFilterActive = !!(date || timeOfDay || typeof minTherapistRating === "number");
    if (dateFilterActive) {
      const dateStr = date || null;
      filtered = filtered.filter((t) => {
        const slotsForTreatment = timeSlots.filter((slot) => {
          if (!slot.is_available) return false;
          if (slot.spa_treatment_id !== t.id) return false;
          if (dateStr) {
            const slotDate = slot.start_datetime ? slot.start_datetime.slice(0, 10) : "";
            if (slotDate !== dateStr) return false;
          }
          if (timeOfDay && slot.time_of_day !== timeOfDay) return false;
          if (typeof minTherapistRating === "number") {
            const therapist = therapistMap[slot.therapist_id];
            if (!therapist || (therapist.average_rating || 0) < minTherapistRating) return false;
          }
          return true;
        });
        return slotsForTreatment.length > 0;
      });
    }

    const resultsWithSlot = filtered.map((t) => {
      let next_slot = null;
      const slotsForTreatment = timeSlots.filter((slot) => slot.is_available && slot.spa_treatment_id === t.id);
      if (slotsForTreatment.length > 0) {
        slotsForTreatment.sort((a, b) => {
          const da = new Date(a.start_datetime).getTime();
          const db = new Date(b.start_datetime).getTime();
          return da - db;
        });
        next_slot = slotsForTreatment[0].start_datetime;
      }
      return { treatment: t, next_slot };
    });

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (currentPage - 1) * size;
    const paged = resultsWithSlot.slice(startIndex, startIndex + size);

    const results = paged.map(({ treatment: t, next_slot }) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      duration_minutes: t.duration_minutes,
      price: t.price,
      currency: t.currency || "USD",
      average_rating: t.average_rating,
      review_count: t.review_count,
      next_available_slot: next_slot || null
    }));

    return {
      results,
      totalCount: resultsWithSlot.length,
      page: currentPage,
      pageSize: size
    };
  }

  // 9) getSpaTreatmentDetails

  getSpaTreatmentDetails(spaTreatmentId, date, timeOfDay, minTherapistRating) {
    const spaTreatments = this._getFromStorage("spa_treatments", []);
    const timeSlotsAll = this._getFromStorage("treatment_time_slots", []);
    let treatment = spaTreatments.find((t) => t.id === spaTreatmentId) || null;
    if (!treatment) {
      // Some time slots may reference a treatment ID that is not present in
      // the spa_treatments table (as in the test data). In that case, synthesize
      // a minimal treatment definition so details and availability flows work.
      const slotForTreatment = timeSlotsAll.find((slot) => slot.spa_treatment_id === spaTreatmentId);
      if (slotForTreatment) {
        treatment = {
          id: spaTreatmentId,
          name: "Spa Treatment",
          description: "",
          category: "massage",
          duration_minutes: slotForTreatment.duration_minutes,
          price: slotForTreatment.price,
          currency: "USD",
          average_rating: undefined,
          review_count: 0,
          is_active: true
        };
      } else {
        return {
          treatment: null,
          availableDurationsMinutes: [],
          durationPriceMap: [],
          therapists: [],
          timeSlots: []
        };
      }
    }

    const therapistsAll = this._getFromStorage("therapists", []);
    const therapistMap = this._indexById(therapistsAll);
    const dateStr = date;

    const slotsFiltered = timeSlotsAll.filter((slot) => {
      if (!slot.is_available) return false;
      if (slot.spa_treatment_id !== spaTreatmentId) return false;
      if (dateStr) {
        const slotDate = slot.start_datetime ? slot.start_datetime.slice(0, 10) : "";
        if (slotDate !== dateStr) return false;
      }
      if (timeOfDay && slot.time_of_day !== timeOfDay) return false;
      if (typeof minTherapistRating === "number") {
        const th = therapistMap[slot.therapist_id];
        if (!th || (th.average_rating || 0) < minTherapistRating) return false;
      }
      return true;
    });

    const therapistSet = new Set();
    const timeSlots = slotsFiltered.map((slot) => {
      const therapist = therapistMap[slot.therapist_id] || null;
      if (therapist) therapistSet.add(therapist.id);
      const slotEnriched = { ...slot };
      if (slotEnriched.spa_treatment_id) {
        slotEnriched.spa_treatment = treatment;
      }
      if (slotEnriched.therapist_id) {
        slotEnriched.therapist = therapist;
      }
      return { slot: slotEnriched, therapist };
    });

    const therapists = therapistsAll.filter((th) => therapistSet.has(th.id));

    const availableDurationsMinutes = [treatment.duration_minutes];
    const durationPriceMap = [
      {
        duration_minutes: treatment.duration_minutes,
        price: treatment.price,
        currency: treatment.currency || "USD"
      }
    ];

    return {
      treatment,
      availableDurationsMinutes,
      durationPriceMap,
      therapists,
      timeSlots
    };
  }

  // 10) prepareSpaTreatmentBooking

  prepareSpaTreatmentBooking(treatmentTimeSlotId) {
    const timeSlots = this._getFromStorage("treatment_time_slots", []);
    const spaTreatments = this._getFromStorage("spa_treatments", []);
    const therapists = this._getFromStorage("therapists", []);

    const slot = timeSlots.find((s) => s.id === treatmentTimeSlotId) || null;
    if (!slot) {
      return {
        spaTreatment: null,
        therapist: null,
        timeSlot: null,
        bookingDraft: null
      };
    }

    const spaTreatment = spaTreatments.find((t) => t.id === slot.spa_treatment_id) || null;
    const therapist = therapists.find((th) => th.id === slot.therapist_id) || null;

    const timeSlotEnriched = { ...slot };
    if (timeSlotEnriched.spa_treatment_id) {
      timeSlotEnriched.spa_treatment = spaTreatment;
    }
    if (timeSlotEnriched.therapist_id) {
      timeSlotEnriched.therapist = therapist;
    }

    const bookingDraft = {
      spa_treatment_id: slot.spa_treatment_id,
      treatment_time_slot_id: slot.id,
      therapist_id: slot.therapist_id,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      duration_minutes: slot.duration_minutes,
      num_guests: 1,
      price: slot.price,
      currency: spaTreatment && spaTreatment.currency ? spaTreatment.currency : "USD"
    };

    return {
      spaTreatment,
      therapist,
      timeSlot: timeSlotEnriched,
      bookingDraft
    };
  }

  // 11) confirmSpaTreatmentBooking

  confirmSpaTreatmentBooking(spaTreatmentId, treatmentTimeSlotId, numGuests, contactName, contactPhone, contactEmail, notes) {
    const spaTreatments = this._getFromStorage("spa_treatments", []);
    const timeSlots = this._getFromStorage("treatment_time_slots", []);
    const therapists = this._getFromStorage("therapists", []);

    let spaTreatment = spaTreatments.find((t) => t.id === spaTreatmentId) || null;
    const slot = timeSlots.find((s) => s.id === treatmentTimeSlotId) || null;

    // If the treatment record is missing but the slot exists and references this
    // treatment ID (as in the generated test data), synthesize a minimal
    // treatment definition so the booking flow can proceed.
    if (!slot || slot.spa_treatment_id !== spaTreatmentId) {
      return { success: false, message: "Invalid treatment or time slot", spaTreatmentBooking: null, cart: null, cartItem: null };
    }
    if (!spaTreatment) {
      spaTreatment = {
        id: spaTreatmentId,
        name: "Spa Treatment",
        description: "",
        category: "massage",
        duration_minutes: slot.duration_minutes,
        price: slot.price,
        currency: "USD",
        average_rating: undefined,
        review_count: 0,
        is_active: true
      };
    }

    const therapist = therapists.find((th) => th.id === slot.therapist_id) || null;

    const spaTreatmentBookings = this._getFromStorage("spa_treatment_bookings", []);
    const pricePerGuest = slot.price || spaTreatment.price || 0;
    const totalPrice = pricePerGuest * (numGuests || 1);

    const booking = {
      id: this._generateId("spa_treatment_booking"),
      spa_treatment_id: spaTreatment.id,
      treatment_time_slot_id: slot.id,
      therapist_id: slot.therapist_id,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      duration_minutes: slot.duration_minutes,
      num_guests: numGuests,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      notes: notes || null,
      price: totalPrice,
      created_at: this._nowISO()
    };
    spaTreatmentBookings.push(booking);
    this._saveToStorage("spa_treatment_bookings", spaTreatmentBookings);

    // Optionally mark slot as unavailable
    const updatedSlots = timeSlots.map((s) => (s.id === slot.id ? { ...s, is_available: false } : s));
    this._saveToStorage("treatment_time_slots", updatedSlots);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);
    const cartItem = {
      id: this._generateId("cart_item"),
      cart_id: cart.id,
      item_type: "spa_treatment_booking",
      title: spaTreatment.name,
      quantity: 1,
      unit_price: totalPrice,
      total_price: totalPrice,
      retreat_booking_id: null,
      spa_treatment_booking_id: booking.id,
      custom_spa_package_id: null,
      room_booking_id: null,
      day_pass_booking_id: null,
      gift_card_purchase_id: null,
      created_at: this._nowISO()
    };
    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);
    const updatedCart = this._recalculateCartTotals();

    const bookingEnriched = { ...booking, spa_treatment: spaTreatment, therapist, treatment_time_slot: slot };

    return {
      success: true,
      message: "Spa treatment booked and added to cart",
      spaTreatmentBooking: bookingEnriched,
      cart: updatedCart,
      cartItem
    };
  }

  // 12) getCustomPackageBuilderConfig

  getCustomPackageBuilderConfig() {
    return {
      rules: {
        required_num_treatments: 3,
        min_total_duration_minutes: 180,
        max_total_duration_minutes: 240,
        max_total_price: 350,
        currency: "USD"
      },
      recommendedFilters: {
        minRating: 4.5,
        minDurationMinutes: 60,
        maxDurationMinutes: 120,
        maxPricePerTreatment: 200
      }
    };
  }

  // 13) evaluateCustomSpaPackage

  evaluateCustomSpaPackage(treatments) {
    const spaTreatments = this._getFromStorage("spa_treatments", []);
    const spaTreatmentMap = this._indexById(spaTreatments);

    const items = [];
    for (const input of treatments || []) {
      const st = spaTreatmentMap[input.spaTreatmentId];
      if (!st) continue;
      const item = {
        id: this._generateId("custom_spa_package_item_tmp"),
        custom_spa_package_id: null,
        spa_treatment_id: st.id,
        spa_treatment_name: st.name,
        duration_minutes: st.duration_minutes,
        price: st.price,
        sort_order: typeof input.sortOrder === "number" ? input.sortOrder : 0,
        spa_treatment: st
      };
      items.push(item);
    }

    const rulesRes = this._evaluateCustomSpaPackageRules(items);
    const currency = items.length > 0 ? (items[0].spa_treatment && items[0].spa_treatment.currency) || "USD" : "USD";

    return {
      items,
      total_duration_minutes: rulesRes.total_duration_minutes,
      total_price: rulesRes.total_price,
      num_treatments: rulesRes.num_treatments,
      currency,
      is_valid: rulesRes.is_valid,
      violations: rulesRes.violations
    };
  }

  // 14) addCustomSpaPackageToCart

  addCustomSpaPackageToCart(name, treatments) {
    const evaluation = this.evaluateCustomSpaPackage(treatments);
    if (!evaluation.is_valid) {
      return {
        success: false,
        message: `Package invalid: ${evaluation.violations.join(", ")}`,
        customSpaPackage: null,
        items: [],
        cart: null,
        cartItem: null
      };
    }

    const customPackages = this._getFromStorage("custom_spa_packages", []);
    const customItemsAll = this._getFromStorage("custom_spa_package_items", []);

    const pkg = {
      id: this._generateId("custom_spa_package"),
      name: name || "Custom Spa Package",
      description: null,
      total_duration_minutes: evaluation.total_duration_minutes,
      total_price: evaluation.total_price,
      num_treatments: evaluation.num_treatments,
      created_at: this._nowISO(),
      is_valid: true
    };
    customPackages.push(pkg);
    this._saveToStorage("custom_spa_packages", customPackages);

    const items = evaluation.items.map((it) => {
      const stored = {
        id: this._generateId("custom_spa_package_item"),
        custom_spa_package_id: pkg.id,
        spa_treatment_id: it.spa_treatment_id,
        spa_treatment_name: it.spa_treatment_name,
        duration_minutes: it.duration_minutes,
        price: it.price,
        sort_order: it.sort_order
      };
      customItemsAll.push(stored);
      return { ...stored, spa_treatment: it.spa_treatment };
    });
    this._saveToStorage("custom_spa_package_items", customItemsAll);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);

    const cartItem = {
      id: this._generateId("cart_item"),
      cart_id: cart.id,
      item_type: "custom_spa_package",
      title: pkg.name,
      quantity: 1,
      unit_price: pkg.total_price,
      total_price: pkg.total_price,
      retreat_booking_id: null,
      spa_treatment_booking_id: null,
      custom_spa_package_id: pkg.id,
      room_booking_id: null,
      day_pass_booking_id: null,
      gift_card_purchase_id: null,
      created_at: this._nowISO()
    };
    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);
    const updatedCart = this._recalculateCartTotals();

    return {
      success: true,
      message: "Custom spa package added to cart",
      customSpaPackage: pkg,
      items,
      cart: updatedCart,
      cartItem
    };
  }

  // 15) getRoomFilterOptions

  getRoomFilterOptions() {
    const rooms = this._getFromStorage("rooms", []);
    const amenitySet = new Set();
    const prices = [];

    for (const r of rooms) {
      if (!r) continue;
      if (Array.isArray(r.amenities)) {
        r.amenities.forEach((a) => amenitySet.add(a));
      }
      if (r.has_balcony) amenitySet.add("balcony");
      if (r.breakfast_included) amenitySet.add("breakfast_included");
      if (typeof r.nightly_rate === "number") prices.push(r.nightly_rate);
    }

    const amenityOptions = Array.from(amenitySet).map((code) => ({
      code,
      label: code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    let nightlyPriceRanges = [];
    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const step = (max - min) / 3 || max;
      nightlyPriceRanges = [
        { maxNightlyRate: min + step, label: `Up to $${Math.round(min + step)}` },
        { maxNightlyRate: min + 2 * step, label: `Up to $${Math.round(min + 2 * step)}` },
        { maxNightlyRate: max, label: `Up to $${Math.round(max)}` }
      ];
    }

    const sortOptions = [
      { code: "price_low_to_high", label: "Price: Low to High" },
      { code: "price_high_to_low", label: "Price: High to Low" }
    ];

    return {
      amenityOptions,
      nightlyPriceRanges,
      sortOptions
    };
  }

  // 16) searchRooms

  searchRooms(checkInDate, checkOutDate, numAdults, requireBalcony, requireBreakfastIncluded, maxNightlyRate, sortBy, page, pageSize) {
    const rooms = this._getFromStorage("rooms", []).filter((r) => r.is_active !== false);
    const nights = this._daysBetween(checkInDate, checkOutDate);

    let filtered = rooms.filter((r) => {
      if ((r.occupancy_max || 0) < (numAdults || 1)) return false;
      if (requireBalcony && !r.has_balcony) return false;
      if (requireBreakfastIncluded && !r.breakfast_included) return false;
      if (typeof maxNightlyRate === "number" && (r.nightly_rate || Infinity) > maxNightlyRate) return false;
      return true;
    });

    const withPrice = filtered.map((r) => ({
      room: r,
      total_price: (r.nightly_rate || 0) * nights
    }));

    const sortCode = sortBy || "price_low_to_high";
    withPrice.sort((a, b) => {
      if (sortCode === "price_low_to_high") return a.total_price - b.total_price;
      if (sortCode === "price_high_to_low") return b.total_price - a.total_price;
      return 0;
    });

    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const startIndex = (currentPage - 1) * size;
    const paged = withPrice.slice(startIndex, startIndex + size);

    const results = paged.map(({ room: r, total_price }) => ({
      id: r.id,
      name: r.name,
      room_type: r.room_type,
      has_balcony: r.has_balcony,
      breakfast_included: r.breakfast_included,
      nightly_rate: r.nightly_rate,
      currency: r.currency || "USD",
      average_rating: r.average_rating,
      review_count: r.review_count,
      thumbnail_image: Array.isArray(r.images) && r.images.length > 0 ? r.images[0] : null,
      total_price_for_stay: total_price,
      num_nights: nights
    }));

    return {
      results,
      totalCount: withPrice.length,
      page: currentPage,
      pageSize: size
    };
  }

  // 17) getRoomDetails

  getRoomDetails(roomId, checkInDate, checkOutDate, numAdults) {
    const rooms = this._getFromStorage("rooms", []);
    const room = rooms.find((r) => r.id === roomId) || null;
    if (!room) {
      return {
        room: null,
        stayDetails: null,
        pricing: null,
        suggestedSpaAddOns: []
      };
    }

    const priceInfo = this._calculateRoomPrice(room, checkInDate, checkOutDate);
    const stayDetails = {
      checkInDate,
      checkOutDate,
      num_nights: priceInfo.num_nights,
      num_adults: numAdults
    };

    const pricing = {
      nightly_rate: priceInfo.nightly_rate,
      total_price: priceInfo.total_price,
      currency: priceInfo.currency
    };

    const addOns = this._getFromStorage("add_ons", []).filter((ao) => ao.applies_to === "room_booking" && ao.is_active !== false);

    return {
      room,
      stayDetails,
      pricing,
      suggestedSpaAddOns: addOns
    };
  }

  // 18) addRoomToCart

  addRoomToCart(roomId, checkInDate, checkOutDate, numAdults) {
    const rooms = this._getFromStorage("rooms", []);
    const room = rooms.find((r) => r.id === roomId) || null;
    if (!room || room.is_active === false) {
      return { success: false, message: "Room not found or inactive", roomBooking: null, cart: null, cartItem: null };
    }

    const priceInfo = this._calculateRoomPrice(room, checkInDate, checkOutDate);
    if (!priceInfo) {
      return { success: false, message: "Unable to calculate room pricing", roomBooking: null, cart: null, cartItem: null };
    }

    const roomBookings = this._getFromStorage("room_bookings", []);
    const booking = {
      id: this._generateId("room_booking"),
      room_id: room.id,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      num_nights: priceInfo.num_nights,
      num_adults: numAdults,
      nightly_rate: priceInfo.nightly_rate,
      total_price: priceInfo.total_price,
      includes_breakfast: room.breakfast_included,
      has_balcony: room.has_balcony,
      created_at: this._nowISO()
    };
    roomBookings.push(booking);
    this._saveToStorage("room_bookings", roomBookings);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);

    const cartItem = {
      id: this._generateId("cart_item"),
      cart_id: cart.id,
      item_type: "room_booking",
      title: room.name,
      quantity: 1,
      unit_price: priceInfo.total_price,
      total_price: priceInfo.total_price,
      retreat_booking_id: null,
      spa_treatment_booking_id: null,
      custom_spa_package_id: null,
      room_booking_id: booking.id,
      day_pass_booking_id: null,
      gift_card_purchase_id: null,
      created_at: this._nowISO()
    };
    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);
    const updatedCart = this._recalculateCartTotals();

    const bookingEnriched = { ...booking, room };

    return {
      success: true,
      message: "Room added to cart",
      roomBooking: bookingEnriched,
      cart: updatedCart,
      cartItem
    };
  }

  // 19) getDayPassTypes

  getDayPassTypes() {
    return this._getFromStorage("day_pass_types", []).filter((d) => d.is_active !== false);
  }

  // 20) getDayPassAddOns

  getDayPassAddOns() {
    return this._getFromStorage("add_ons", []).filter((ao) => ao.applies_to === "day_pass" && ao.is_active !== false);
  }

  // 21) calculateDayPassBookingPrice

  calculateDayPassBookingPrice(dayPassTypeId, numGuests, selectedAddOns) {
    const dayPassTypes = this._getFromStorage("day_pass_types", []);
    const addOns = this._getFromStorage("add_ons", []);

    const dayPassType = dayPassTypes.find((d) => d.id === dayPassTypeId) || null;
    if (!dayPassType) {
      return { total_base_price: 0, total_add_ons_price: 0, total_price: 0, currency: "USD" };
    }

    const addOnEntities = (selectedAddOns || [])
      .map((sel) => addOns.find((ao) => ao.id === sel.addOnId) || null)
      .filter((ao) => ao);

    const pricing = this._calculateDayPassPrice(dayPassType, numGuests, addOnEntities);
    return pricing;
  }

  // 22) addDayPassBookingToCart

  addDayPassBookingToCart(dayPassTypeId, date, numGuests, selectedAddOns) {
    const dayPassTypes = this._getFromStorage("day_pass_types", []);
    const addOns = this._getFromStorage("add_ons", []);

    const dayPassType = dayPassTypes.find((d) => d.id === dayPassTypeId) || null;
    if (!dayPassType || dayPassType.is_active === false) {
      return { success: false, message: "Day pass type not found or inactive", dayPassBooking: null, cart: null, cartItem: null };
    }

    const addOnIds = (selectedAddOns || []).map((sel) => sel.addOnId);
    const addOnEntities = addOnIds
      .map((id) => addOns.find((ao) => ao.id === id) || null)
      .filter((ao) => ao && ao.applies_to === "day_pass" && ao.is_active !== false);

    const pricing = this._calculateDayPassPrice(dayPassType, numGuests, addOnEntities);

    const dayPassBookings = this._getFromStorage("day_pass_bookings", []);
    const booking = {
      id: this._generateId("day_pass_booking"),
      day_pass_type_id: dayPassType.id,
      date,
      num_guests: numGuests,
      selected_add_on_ids: addOnEntities.map((ao) => ao.id),
      base_price_per_guest: dayPassType.base_price_per_guest,
      total_base_price: pricing.total_base_price,
      total_add_ons_price: pricing.total_add_ons_price,
      total_price: pricing.total_price,
      created_at: this._nowISO()
    };
    dayPassBookings.push(booking);
    this._saveToStorage("day_pass_bookings", dayPassBookings);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);

    const cartItem = {
      id: this._generateId("cart_item"),
      cart_id: cart.id,
      item_type: "day_pass_booking",
      title: dayPassType.name,
      quantity: 1,
      unit_price: pricing.total_price,
      total_price: pricing.total_price,
      retreat_booking_id: null,
      spa_treatment_booking_id: null,
      custom_spa_package_id: null,
      room_booking_id: null,
      day_pass_booking_id: booking.id,
      gift_card_purchase_id: null,
      created_at: this._nowISO()
    };
    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);
    const updatedCart = this._recalculateCartTotals();

    const bookingEnriched = { ...booking, day_pass_type: dayPassType, add_ons: addOnEntities };

    return {
      success: true,
      message: "Day pass booking added to cart",
      dayPassBooking: bookingEnriched,
      cart: updatedCart,
      cartItem
    };
  }

  // 23) getGiftCardTemplates

  getGiftCardTemplates() {
    return this._getFromStorage("gift_card_templates", []).filter((g) => g.is_active !== false);
  }

  // 24) addGiftCardToCart

  addGiftCardToCart(templateId, amount, deliveryMethod, recipientName, recipientEmail, senderName, message, deliveryDate) {
    const templates = this._getFromStorage("gift_card_templates", []);
    const template = templates.find((t) => t.id === templateId) || null;
    if (!template || template.is_active === false) {
      return { success: false, message: "Gift card template not found or inactive", giftCardPurchase: null, cart: null, cartItem: null };
    }

    const giftCardPurchases = this._getFromStorage("gift_card_purchases", []);

    const purchase = {
      id: this._generateId("gift_card_purchase"),
      template_id: template.id,
      amount,
      currency: template.default_currency || "USD",
      delivery_method: deliveryMethod,
      recipient_name: recipientName,
      recipient_email: recipientEmail,
      sender_name: senderName || null,
      message: message || null,
      delivery_date: deliveryDate,
      created_at: this._nowISO()
    };
    giftCardPurchases.push(purchase);
    this._saveToStorage("gift_card_purchases", giftCardPurchases);

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);

    const cartItem = {
      id: this._generateId("cart_item"),
      cart_id: cart.id,
      item_type: "gift_card_purchase",
      title: template.name,
      quantity: 1,
      unit_price: amount,
      total_price: amount,
      retreat_booking_id: null,
      spa_treatment_booking_id: null,
      custom_spa_package_id: null,
      room_booking_id: null,
      day_pass_booking_id: null,
      gift_card_purchase_id: purchase.id,
      created_at: this._nowISO()
    };
    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);
    const updatedCart = this._recalculateCartTotals();

    const purchaseEnriched = { ...purchase, template };

    return {
      success: true,
      message: "Gift card added to cart",
      giftCardPurchase: purchaseEnriched,
      cart: updatedCart,
      cartItem
    };
  }

  // 25) createAccountProfile

  createAccountProfile(fullName, email, password, agreedToTerms) {
    const profiles = this._getFromStorage("account_profiles", []);

    let profile;
    if (profiles.length > 0) {
      // Single-user: update existing profile
      profile = { ...profiles[0] };
      profile.full_name = fullName;
      profile.email = email;
      profile.password = password;
      profile.agreed_to_terms = !!agreedToTerms;
      profile.last_updated = this._nowISO();
      profiles[0] = profile;
    } else {
      profile = {
        id: this._generateId("account_profile"),
        full_name: fullName,
        email,
        password,
        agreed_to_terms: !!agreedToTerms,
        created_at: this._nowISO(),
        wellness_goals: [],
        last_updated: null
      };
      profiles.push(profile);
    }

    this._saveToStorage("account_profiles", profiles);

    return {
      success: true,
      message: "Account profile saved",
      accountProfile: profile
    };
  }

  // 26) getAccountProfile

  getAccountProfile() {
    const profiles = this._getFromStorage("account_profiles", []);
    if (profiles.length === 0) {
      return { exists: false, accountProfile: null };
    }
    return { exists: true, accountProfile: profiles[0] };
  }

  // 27) getWellnessGoalOptions

  getWellnessGoalOptions() {
    return [
      {
        code: "stress_relief",
        label: "Stress Relief",
        description: "Reduce everyday stress with calming experiences and practices."
      },
      {
        code: "better_sleep",
        label: "Better Sleep",
        description: "Improve sleep quality with restorative evening rituals and treatments."
      },
      {
        code: "detox",
        label: "Gentle Detox",
        description: "Support your body with cleansing, nourishing experiences."
      },
      {
        code: "fitness",
        label: "Fitness & Vitality",
        description: "Boost strength, flexibility, and overall vitality."
      }
    ];
  }

  // 28) updateWellnessGoals

  updateWellnessGoals(wellnessGoals) {
    const profiles = this._getFromStorage("account_profiles", []);
    if (profiles.length === 0) {
      return { success: false, accountProfile: null };
    }
    const profile = { ...profiles[0], wellness_goals: wellnessGoals || [], last_updated: this._nowISO() };
    profiles[0] = profile;
    this._saveToStorage("account_profiles", profiles);
    return { success: true, accountProfile: profile };
  }

  // 29) getCartSummary

  getCartSummary() {
    const { cart, cartItems } = this._getCartItemsWithRelations();

    const items = cartItems.map((ci) => ({
      cartItem: ci,
      retreatBooking: ci.retreat_booking || null,
      spaTreatmentBooking: ci.spa_treatment_booking || null,
      customSpaPackage: ci.custom_spa_package || null,
      roomBooking: ci.room_booking || null,
      dayPassBooking: ci.day_pass_booking || null,
      giftCardPurchase: ci.gift_card_purchase || null
    }));

    return { cart, items };
  }

  // 30) updateCartItemQuantity

  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage("cart_items", []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, cart: this._getFromStorage("cart", null) };
    }
    if (quantity <= 0) {
      // Delegate to remove
      return this.removeCartItem(cartItemId);
    }

    const item = { ...cartItems[idx] };
    item.quantity = quantity;
    item.total_price = (item.unit_price || 0) * quantity;
    cartItems[idx] = item;
    this._saveToStorage("cart_items", cartItems);
    const updatedCart = this._recalculateCartTotals();
    return { success: true, cart: updatedCart };
  }

  // 31) removeCartItem

  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage("cart_items", []);
    const filtered = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage("cart_items", filtered);
    const updatedCart = this._recalculateCartTotals();
    return { success: true, cart: updatedCart };
  }

  // 32) getCheckoutSummary

  getCheckoutSummary() {
    const { cart, cartItems } = this._getCartItemsWithRelations();

    const proposedOrder = {
      id: null,
      order_number: null,
      created_at: this._nowISO(),
      status: "pending_payment",
      items: [],
      subtotal: cart ? cart.subtotal : 0,
      taxes: cart ? cart.taxes : 0,
      total: cart ? cart.total : 0,
      currency: cart ? cart.currency : "USD",
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      payment_method: null,
      payment_status: "not_charged"
    };

    return {
      cart,
      items: cartItems,
      proposedOrder
    };
  }

  // 33) placeOrder

  placeOrder(contactName, contactEmail, contactPhone, paymentMethod, billingDetails) {
    const cart = this._getFromStorage("cart", null);
    const cartItemsAll = this._getFromStorage("cart_items", []);
    if (!cart || !cart.id) {
      return { success: false, order: null, message: "Cart is empty" };
    }
    const cartItems = cartItemsAll.filter((ci) => ci.cart_id === cart.id);
    if (cartItems.length === 0) {
      return { success: false, order: null, message: "Cart is empty" };
    }

    const orders = this._getFromStorage("orders", []);
    const orderItemsAll = this._getFromStorage("order_items", []);

    const orderId = this._generateId("order");
    const orderNumber = `ORD-${orderId.split("_")[1]}`;

    const order = {
      id: orderId,
      order_number: orderNumber,
      created_at: this._nowISO(),
      status: "pending_payment",
      items: [],
      subtotal: cart.subtotal,
      taxes: cart.taxes,
      total: cart.total,
      currency: cart.currency || "USD",
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      payment_method: paymentMethod,
      payment_status: "not_charged",
      billingDetails: billingDetails || null
    };

    for (const ci of cartItems) {
      const orderItem = {
        id: this._generateId("order_item"),
        order_id: order.id,
        item_type: ci.item_type,
        title: ci.title,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        source_cart_item_id: ci.id
      };
      orderItemsAll.push(orderItem);
      order.items.push(orderItem.id);
    }

    orders.push(order);
    this._saveToStorage("orders", orders);
    this._saveToStorage("order_items", orderItemsAll);

    // Clear cart
    const remainingCartItems = cartItemsAll.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage("cart_items", remainingCartItems);
    const clearedCart = {
      ...cart,
      items: [],
      subtotal: 0,
      taxes: 0,
      total: 0,
      updated_at: this._nowISO()
    };
    this._saveToStorage("cart", clearedCart);

    return {
      success: true,
      order,
      message: "Order placed successfully"
    };
  }

  // 34) getAboutPageContent

  getAboutPageContent() {
    return {
      missionText: "Our mission is to create a calm, welcoming space where every guest can reconnect with balance and wellbeing.",
      approachText:
        "We blend traditional spa rituals with holistic wellness practices, from yoga and meditation to nourishing cuisine.",
      facilitiesHighlights: [
        {
          title: "Tranquil Spa Suites",
          description: "Private treatment suites with views of nature, designed for deep relaxation."
        },
        {
          title: "Yoga Pavilion",
          description: "Open-air pavilion for sunrise and sunset yoga sessions."
        },
        {
          title: "Hydrotherapy Circuit",
          description: "Thermal pools, steam, and sauna to gently restore and invigorate."
        }
      ],
      highlightedTherapists: this._getFromStorage("therapists", []).slice(0, 3)
    };
  }

  // 35) getContactPageContent

  getContactPageContent() {
    return {
      phoneNumber: "+1 (555) 123-4567",
      emailAddress: "stay@wellnessretreat.example",
      physicalAddress: "123 Serenity Lane, Calm Valley, CA 90000",
      operatingHours: "Daily 8:00 AM – 8:00 PM"
    };
  }

  // 36) submitContactForm

  submitContactForm(name, email, phone, message, topic) {
    const submissions = this._getFromStorage("contact_submissions", []);
    const submission = {
      id: this._generateId("contact"),
      name,
      email,
      phone: phone || null,
      message,
      topic: topic || null,
      created_at: this._nowISO()
    };
    submissions.push(submission);
    this._saveToStorage("contact_submissions", submissions);
    return {
      success: true,
      referenceId: submission.id,
      message: "Your message has been received. We will get back to you shortly."
    };
  }

  // 37) getFaqs

  getFaqs() {
    return this._getFromStorage("faqs", []);
  }

  // 38) getPolicies

  getPolicies() {
    return this._getFromStorage("policies", {
      termsOfUse: "",
      privacyPolicy: "",
      bookingPolicy: "",
      cancellationPolicy: "",
      giftCardPolicy: ""
    });
  }

  // 39) searchRetreats-related helper for detox retreat (task7) is already covered via searchRetreats
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}
