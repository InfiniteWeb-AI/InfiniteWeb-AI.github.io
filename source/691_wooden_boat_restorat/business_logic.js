/* localStorage polyfill for Node.js and environments without localStorage */
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

  /* =====================
   * Initialization & Helpers
   * ===================== */

  _initStorage() {
    // Helper to ensure a key exists with default JSON value
    const ensure = (key, defaultValue) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core ID counter
    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }

    // Single-user state: cart, restoration estimate, restoration plan
    ensure("single_user_state", {
      cartId: null,
      restorationEstimateId: null,
      restorationPlanId: null
    });

    // Entities (tables)
    ensure("boat_listings", []);
    ensure("prepurchase_survey_options", []);
    ensure("boat_reservations", []);
    ensure("restoration_service_definitions", []);
    ensure("restoration_quote_requests", []);
    ensure("varnish_packages", []);
    ensure("restoration_estimates", []);
    ensure("restoration_estimate_items", []);
    ensure("tour_bookings", []);
    ensure("accessory_products", []);
    ensure("carts", []);
    ensure("cart_items", []);
    ensure("shipping_options", []);
    ensure("payment_plans", []);
    ensure("restoration_plans", []);
    ensure("restoration_plan_service_items", []);
    ensure("resource_articles", []);
    ensure("reading_collections", []);
    ensure("saved_articles", []);
    ensure("restoration_projects", []);
    ensure("gallery_inquiries", []);
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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
    const current = parseInt(localStorage.getItem("idCounter") || "1000", 10);
    const next = current + 1;
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  _getSingleUserState() {
    const state = this._getFromStorage("single_user_state", null);
    if (!state || typeof state !== "object") {
      return {
        cartId: null,
        restorationEstimateId: null,
        restorationPlanId: null
      };
    }
    if (!Object.prototype.hasOwnProperty.call(state, "cartId")) {
      state.cartId = null;
    }
    if (!Object.prototype.hasOwnProperty.call(state, "restorationEstimateId")) {
      state.restorationEstimateId = null;
    }
    if (!Object.prototype.hasOwnProperty.call(state, "restorationPlanId")) {
      state.restorationPlanId = null;
    }
    return state;
  }

  _persistSingleUserState(state) {
    this._saveToStorage("single_user_state", state);
  }

  /* =====================
   * Cart helpers
   * ===================== */

  _getOrCreateCart() {
    const state = this._getSingleUserState();
    let carts = this._getFromStorage("carts", []);
    let cart = null;

    if (state.cartId) {
      cart = carts.find(function (c) { return c.id === state.cartId; }) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId("cart"),
        item_ids: [],
        shipping_option_id: null,
        subtotal: 0,
        shipping_cost: 0,
        total: 0,
        currency: "usd",
        created_at: this._getCurrentTimestamp(),
        updated_at: this._getCurrentTimestamp()
      };
      carts.push(cart);
      this._saveToStorage("carts", carts);
      state.cartId = cart.id;
      this._persistSingleUserState(state);
    }

    return cart;
  }

  _recalculateCartTotals(cartId) {
    const carts = this._getFromStorage("carts", []);
    const cartIndex = carts.findIndex(function (c) { return c.id === cartId; });
    if (cartIndex === -1) {
      return null;
    }
    const cart = carts[cartIndex];
    const cartItems = this._getFromStorage("cart_items", []);
    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });

    let subtotal = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      const item = itemsForCart[i];
      subtotal += Number(item.line_total) || 0;
    }

    const shippingOptions = this._getFromStorage("shipping_options", []);
    let shippingCost = 0;
    if (cart.shipping_option_id) {
      const opt = shippingOptions.find(function (o) { return o.id === cart.shipping_option_id; });
      if (opt) {
        shippingCost = Number(opt.cost) || 0;
      }
    }

    cart.subtotal = subtotal;
    cart.shipping_cost = shippingCost;
    cart.total = subtotal + shippingCost;
    cart.updated_at = this._getCurrentTimestamp();

    carts[cartIndex] = cart;
    this._saveToStorage("carts", carts);
    return cart;
  }

  /* =====================
   * Restoration Estimate helpers
   * ===================== */

  _getOrCreateRestorationEstimate() {
    const state = this._getSingleUserState();
    let estimates = this._getFromStorage("restoration_estimates", []);
    let estimate = null;

    if (state.restorationEstimateId) {
      estimate = estimates.find(function (e) { return e.id === state.restorationEstimateId; }) || null;
    }

    if (!estimate) {
      estimate = {
        id: this._generateId("restest"),
        created_at: this._getCurrentTimestamp(),
        boat_description: null,
        total_price: 0,
        currency: "usd",
        item_ids: []
      };
      estimates.push(estimate);
      this._saveToStorage("restoration_estimates", estimates);
      state.restorationEstimateId = estimate.id;
      this._persistSingleUserState(state);
    }

    return estimate;
  }

  _recalculateRestorationEstimateTotals(estimateId) {
    const estimates = this._getFromStorage("restoration_estimates", []);
    const idx = estimates.findIndex(function (e) { return e.id === estimateId; });
    if (idx === -1) {
      return null;
    }
    const estimate = estimates[idx];
    const items = this._getFromStorage("restoration_estimate_items", []);
    const itemsForEstimate = items.filter(function (it) { return it.estimate_id === estimate.id; });

    let total = 0;
    for (let i = 0; i < itemsForEstimate.length; i++) {
      total += Number(itemsForEstimate[i].line_total) || 0;
    }

    estimate.total_price = total;
    estimates[idx] = estimate;
    this._saveToStorage("restoration_estimates", estimates);
    return estimate;
  }

  /* =====================
   * Restoration Plan helpers
   * ===================== */

  _getOrCreateRestorationPlan() {
    const state = this._getSingleUserState();
    let plans = this._getFromStorage("restoration_plans", []);
    let plan = null;

    if (state.restorationPlanId) {
      plan = plans.find(function (p) { return p.id === state.restorationPlanId; }) || null;
    }

    if (!plan) {
      const now = this._getCurrentTimestamp();
      plan = {
        id: this._generateId("restplan"),
        boat_type: "other",
        boat_length_feet: 0,
        target_budget: null,
        total_estimate: 0,
        currency: "usd",
        payment_plan_id: null,
        service_item_ids: [],
        notes: null,
        created_at: now,
        updated_at: now
      };
      plans.push(plan);
      this._saveToStorage("restoration_plans", plans);
      state.restorationPlanId = plan.id;
      this._persistSingleUserState(state);
    }

    return plan;
  }

  /* =====================
   * Misc helpers
   * ===================== */

  _capitalizeWords(str) {
    if (!str) return "";
    return String(str)
      .split(/[_\s]+/)
      .map(function (s) {
        if (!s) return "";
        return s.charAt(0).toUpperCase() + s.slice(1);
      })
      .join(" ");
  }

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /* =====================
   * Interface implementations
   * ===================== */

  /* ------------ Homepage ------------ */

  getHomepageContent() {
    const boats = this._getFromStorage("boat_listings", []);
    const services = this._getFromStorage("restoration_service_definitions", []);
    const varnishPackages = this._getFromStorage("varnish_packages", []);
    const projects = this._getFromStorage("restoration_projects", []);
    const articles = this._getFromStorage("resource_articles", []);

    const featuredBoats = this._clone(
      boats
        .slice()
        .sort(function (a, b) {
          return (b.created_at || "").localeCompare(a.created_at || "");
        })
        .slice(0, 5)
    );

    const featuredRestorationServices = this._clone(services.slice(0, 5));

    const featuredVarnishPackages = this._clone(
      varnishPackages
        .filter(function (p) { return p.is_active; })
        .sort(function (a, b) { return a.price - b.price; })
        .slice(0, 5)
    );

    const featuredProjects = this._clone(
      projects
        .filter(function (p) { return p.is_featured; })
        .sort(function (a, b) {
          return (b.gallery_sort_date || "").localeCompare(a.gallery_sort_date || "");
        })
        .slice(0, 5)
    );

    const featuredArticles = this._clone(
      articles
        .slice()
        .sort(function (a, b) {
          return (b.published_at || "").localeCompare(a.published_at || "");
        })
        .slice(0, 5)
    );

    const primaryCallsToAction = [
      {
        targetPage: "boats_for_sale",
        label: "Browse Boats for Sale",
        description: "Explore classic wooden sailboats, runabouts, and cruisers."
      },
      {
        targetPage: "restoration_services",
        label: "Request a Restoration Quote",
        description: "Get a detailed estimate for your wooden boat restoration."
      },
      {
        targetPage: "custom_planner",
        label: "Build a Custom Restoration Plan",
        description: "Configure services and payment plans for your project."
      },
      {
        targetPage: "accessories",
        label: "Shop Accessories",
        description: "Find life jackets, maintenance kits, and more."
      },
      {
        targetPage: "gallery",
        label: "View Restoration Gallery",
        description: "See before-and-after photos of recent projects."
      },
      {
        targetPage: "guides",
        label: "Read Maintenance Guides",
        description: "Learn how to care for classic wooden boats."
      },
      {
        targetPage: "tours",
        label: "Visit Our Yard",
        description: "Schedule a guided tour of current restorations."
      }
    ];

    return {
      featuredBoats: featuredBoats,
      featuredRestorationServices: featuredRestorationServices,
      featuredVarnishPackages: featuredVarnishPackages,
      featuredProjects: featuredProjects,
      featuredArticles: featuredArticles,
      primaryCallsToAction: primaryCallsToAction
    };
  }

  /* ------------ Boats for sale & dinghies ------------ */

  getBoatListingFilterOptions(listingCategoryId) {
    const boats = this._getFromStorage("boat_listings", []);
    const filtered = boats.filter(function (b) {
      return b.listing_category_id === listingCategoryId;
    });

    const boatTypeMap = {};
    const materialMap = {};

    let minPrice = null;
    let maxPrice = null;
    let minLength = null;
    let maxLength = null;
    let minYear = null;
    let maxYear = null;

    for (let i = 0; i < filtered.length; i++) {
      const b = filtered[i];
      if (b.boat_type) {
        boatTypeMap[b.boat_type] = true;
      }
      if (b.material) {
        materialMap[b.material] = true;
      }
      if (typeof b.price === "number") {
        if (minPrice === null || b.price < minPrice) minPrice = b.price;
        if (maxPrice === null || b.price > maxPrice) maxPrice = b.price;
      }
      if (typeof b.length_feet === "number") {
        if (minLength === null || b.length_feet < minLength) minLength = b.length_feet;
        if (maxLength === null || b.length_feet > maxLength) maxLength = b.length_feet;
      }
      if (typeof b.year_built === "number") {
        if (minYear === null || b.year_built < minYear) minYear = b.year_built;
        if (maxYear === null || b.year_built > maxYear) maxYear = b.year_built;
      }
    }

    const boatTypes = Object.keys(boatTypeMap).map((function (_this) {
      return function (value) {
        return {
          value: value,
          label: _this._capitalizeWords(value)
        };
      };
    })(this));

    const materials = Object.keys(materialMap).map((function (_this) {
      return function (value) {
        return {
          value: value,
          label: _this._capitalizeWords(value)
        };
      };
    })(this));

    const priceRange = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      step: 1000
    };

    const lengthFeetRange = {
      min: minLength !== null ? minLength : 0,
      max: maxLength !== null ? maxLength : 0,
      step: 1
    };

    const yearBuiltRange = {
      minYear: minYear !== null ? minYear : 1900,
      maxYear: maxYear !== null ? maxYear : new Date().getFullYear()
    };

    const conditionRatingOptions = [1, 2, 3, 4].map(function (minValue) {
      return {
        minValue: minValue,
        label: minValue + "/5 or better"
      };
    });

    const starRatingOptions = [1, 2, 3, 4].map(function (minValue) {
      return {
        minValue: minValue,
        label: minValue + " stars & up"
      };
    });

    const specialBenefits = [
      {
        code: "free_first_winter_storage",
        label: "Includes free first winter storage"
      }
    ];

    const sortOptions = [
      { value: "price_low_to_high", label: "Price: Low to High" },
      { value: "price_high_to_low", label: "Price: High to Low" },
      { value: "earliest_pickup_date", label: "Earliest pickup date" },
      { value: "most_recent", label: "Most recent" }
    ];

    return {
      boatTypes: boatTypes,
      materials: materials,
      priceRange: priceRange,
      lengthFeetRange: lengthFeetRange,
      yearBuiltRange: yearBuiltRange,
      conditionRatingOptions: conditionRatingOptions,
      starRatingOptions: starRatingOptions,
      specialBenefits: specialBenefits,
      sortOptions: sortOptions
    };
  }

  searchBoatListings(listingCategoryId, filters, sort, page, pageSize) {
    const allBoats = this._getFromStorage("boat_listings", []);
    const f = filters || {};
    let results = allBoats.filter(function (b) {
      if (b.listing_category_id !== listingCategoryId) return false;
      if (b.sales_status && b.sales_status !== "available") return false;
      if (f.boatType && b.boat_type !== f.boatType) return false;
      if (f.material && b.material !== f.material) return false;
      if (typeof f.minPrice === "number" && b.price < f.minPrice) return false;
      if (typeof f.maxPrice === "number" && b.price > f.maxPrice) return false;
      if (typeof f.minLengthFeet === "number" && b.length_feet < f.minLengthFeet) return false;
      if (typeof f.maxLengthFeet === "number" && b.length_feet > f.maxLengthFeet) return false;
      if (typeof f.minYearBuilt === "number" && b.year_built < f.minYearBuilt) return false;
      if (typeof f.maxYearBuilt === "number" && b.year_built > f.maxYearBuilt) return false;
      if (typeof f.minConditionRating === "number" && b.condition_rating < f.minConditionRating) return false;
      if (typeof f.minAverageRatingStars === "number") {
        const stars = typeof b.average_rating_stars === "number" ? b.average_rating_stars : 0;
        if (stars < f.minAverageRatingStars) return false;
      }
      if (typeof f.hasFreeFirstWinterStorage === "boolean") {
        if (!!b.has_free_first_winter_storage !== f.hasFreeFirstWinterStorage) return false;
      }
      return true;
    });

    const s = sort || "most_recent";
    results = results.slice();

    if (s === "price_low_to_high") {
      results.sort(function (a, b) { return a.price - b.price; });
    } else if (s === "price_high_to_low") {
      results.sort(function (a, b) { return b.price - a.price; });
    } else if (s === "earliest_pickup_date") {
      results.sort(function (a, b) {
        const ad = a.earliest_pickup_date || null;
        const bd = b.earliest_pickup_date || null;
        if (!ad && !bd) return 0;
        if (!ad) return 1;
        if (!bd) return -1;
        return ad.localeCompare(bd);
      });
    } else if (s === "most_recent") {
      results.sort(function (a, b) {
        const ac = a.created_at || "";
        const bc = b.created_at || "";
        return bc.localeCompare(ac);
      });
    }

    const p = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const start = (p - 1) * ps;
    const end = start + ps;
    const listings = this._clone(results.slice(start, end));

    return {
      totalResults: totalResults,
      page: p,
      pageSize: ps,
      listings: listings
    };
  }

  getBoatDetail(boatId) {
    const boats = this._getFromStorage("boat_listings", []);
    const boat = boats.find(function (b) { return b.id === boatId; }) || null;

    if (!boat) {
      return {
        boat: null,
        listingCategoryLabel: "",
        boatTypeLabel: "",
        materialLabel: "",
        conditionRatingLabel: "",
        benefits: [],
        isReservable: false,
        availablePickupDates: [],
        includesPrepurchaseSurveyLabel: "",
        availablePrepurchaseSurveys: []
      };
    }

    const listingCategoryLabel = boat.listing_category_id === "boats_for_sale"
      ? "Boats for Sale"
      : boat.listing_category_id === "small_craft_dinghies"
        ? "Small craft & dinghies"
        : this._capitalizeWords(boat.listing_category_id);

    const boatTypeLabel = this._capitalizeWords(boat.boat_type);
    const materialLabel = this._capitalizeWords(boat.material);
    const conditionRatingLabel = (boat.condition_rating || "") + "/5";

    const benefits = [];
    if (boat.has_free_first_winter_storage) {
      benefits.push("Includes free first winter storage");
    }

    const surveyOptions = this._getFromStorage("prepurchase_survey_options", []);
    const availableIds = boat.available_survey_option_ids || [];
    const availablePrepurchaseSurveys = surveyOptions.filter(function (opt) {
      return availableIds.indexOf(opt.id) !== -1;
    });

    let includesPrepurchaseSurveyLabel = "";
    if (boat.includes_prepurchase_survey) {
      // Try to find default option matching boat type
      let defaultOption = null;
      for (let i = 0; i < surveyOptions.length; i++) {
        const opt = surveyOptions[i];
        if (opt.is_default_for_applicable && opt.applicable_boat_types && opt.applicable_boat_types.indexOf(boat.boat_type) !== -1) {
          defaultOption = opt;
          break;
        }
      }
      if (!defaultOption && availablePrepurchaseSurveys.length > 0) {
        defaultOption = availablePrepurchaseSurveys[0];
      }
      if (defaultOption) {
        includesPrepurchaseSurveyLabel = defaultOption.label;
      }
    }

    const availablePickupDates = (boat.available_pickup_dates || []).map(function (d) { return d; });

    return {
      boat: this._clone(boat),
      listingCategoryLabel: listingCategoryLabel,
      boatTypeLabel: boatTypeLabel,
      materialLabel: materialLabel,
      conditionRatingLabel: conditionRatingLabel,
      benefits: benefits,
      isReservable: !!boat.is_reservable,
      availablePickupDates: availablePickupDates,
      includesPrepurchaseSurveyLabel: includesPrepurchaseSurveyLabel,
      availablePrepurchaseSurveys: this._clone(availablePrepurchaseSurveys)
    };
  }

  addBoatToCart(boatId, quantity, prepurchaseSurveyOptionId) {
    const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;
    const boats = this._getFromStorage("boat_listings", []);
    const boat = boats.find(function (b) { return b.id === boatId; }) || null;
    if (!boat) {
      return { success: false, cartId: null, message: "Boat not found", cartSummary: null };
    }

    let surveyOption = null;
    if (prepurchaseSurveyOptionId) {
      const surveyOptions = this._getFromStorage("prepurchase_survey_options", []);
      surveyOption = surveyOptions.find(function (s) { return s.id === prepurchaseSurveyOptionId; }) || null;
      const availableIds = boat.available_survey_option_ids || [];
      if (!surveyOption || availableIds.indexOf(surveyOption.id) === -1) {
        return { success: false, cartId: null, message: "Selected survey option is not available for this boat", cartSummary: null };
      }
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);

    const surveyPrice = surveyOption ? Number(surveyOption.price) || 0 : 0;
    const unitPrice = (Number(boat.price) || 0) + surveyPrice;
    const lineTotal = unitPrice * qty;

    const cartItem = {
      id: this._generateId("cartitem"),
      cart_id: cart.id,
      item_type: "boat",
      boat_id: boat.id,
      accessory_id: null,
      varnish_package_id: null,
      prepurchase_survey_option_id: surveyOption ? surveyOption.id : null,
      quantity: qty,
      unit_price: unitPrice,
      line_total: lineTotal,
      added_at: this._getCurrentTimestamp()
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    // Update cart.item_ids
    const carts = this._getFromStorage("carts", []);
    const cartIndex = carts.findIndex(function (c) { return c.id === cart.id; });
    if (cartIndex !== -1) {
      const updatedCart = carts[cartIndex];
      if (!Array.isArray(updatedCart.item_ids)) {
        updatedCart.item_ids = [];
      }
      updatedCart.item_ids.push(cartItem.id);
      updatedCart.updated_at = this._getCurrentTimestamp();
      carts[cartIndex] = updatedCart;
      this._saveToStorage("carts", carts);
    }

    const updatedCart = this._recalculateCartTotals(cart.id);

    // Build cart summary
    const itemsForCart = this._getFromStorage("cart_items", []).filter(function (ci) { return ci.cart_id === updatedCart.id; });
    let itemCount = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      itemCount += itemsForCart[i].quantity || 0;
    }

    const cartSummary = {
      subtotal: updatedCart.subtotal,
      shippingCost: updatedCart.shipping_cost,
      total: updatedCart.total,
      currency: updatedCart.currency,
      itemCount: itemCount
    };

    return {
      success: true,
      cartId: updatedCart.id,
      message: "Boat added to cart",
      cartSummary: cartSummary
    };
  }

  createBoatReservation(boatId, pickupDate, notes) {
    const boats = this._getFromStorage("boat_listings", []);
    const boat = boats.find(function (b) { return b.id === boatId; }) || null;
    if (!boat) {
      return { success: false, reservation: null, message: "Boat not found" };
    }
    if (!boat.is_reservable) {
      return { success: false, reservation: null, message: "Boat is not reservable" };
    }

    const reservation = {
      id: this._generateId("boatres"),
      boat_id: boat.id,
      reserved_at: this._getCurrentTimestamp(),
      pickup_date: pickupDate,
      status: "pending",
      notes: notes || null
    };

    const reservations = this._getFromStorage("boat_reservations", []);
    reservations.push(reservation);
    this._saveToStorage("boat_reservations", reservations);

    // Optionally update boat status to reserved
    const boatsAll = this._getFromStorage("boat_listings", []);
    const idx = boatsAll.findIndex(function (b) { return b.id === boat.id; });
    if (idx !== -1) {
      boatsAll[idx].sales_status = "reserved";
      this._saveToStorage("boat_listings", boatsAll);
    }

    return {
      success: true,
      reservation: this._clone(reservation),
      message: "Reservation created"
    };
  }

  /* ------------ Restoration overview & quotes ------------ */

  getRestorationOverviewContent() {
    const services = this._getFromStorage("restoration_service_definitions", []);
    const categoriesMap = {};

    for (let i = 0; i < services.length; i++) {
      const svc = services[i];
      if (!categoriesMap[svc.category]) {
        categoriesMap[svc.category] = [];
      }
      categoriesMap[svc.category].push(svc);
    }

    const serviceCategories = Object.keys(categoriesMap).map((function (_this) {
      return function (code) {
        const exampleServices = categoriesMap[code].slice(0, 5);
        return {
          code: code,
          name: _this._capitalizeWords(code),
          description: "Services related to " + _this._capitalizeWords(code) + ".",
          exampleServices: _this._clone(exampleServices)
        };
      };
    })(this));

    const faqEntries = [
      {
        question: "How long does a typical restoration take?",
        answer: "Timelines vary based on boat size and scope. After your quote request, we provide an estimated schedule."
      },
      {
        question: "Do you work on non-wooden boats?",
        answer: "Our primary focus is wooden boats, but some services may apply to other materials."
      }
    ];

    const contactSummary = {
      phone: "",
      email: "",
      notes: "Use the quote request form or contact us directly for complex projects."
    };

    return {
      serviceCategories: serviceCategories,
      faqEntries: faqEntries,
      contactSummary: contactSummary
    };
  }

  getRestorationQuoteFormOptions() {
    const boatTypes = ["sailboat", "runabout", "cabin_cruiser", "dinghy", "other"].map((function (_this) {
      return function (value) {
        return { value: value, label: _this._capitalizeWords(value) };
      };
    })(this));

    const serviceOptions = this._getFromStorage("restoration_service_definitions", []);

    const budgetRanges = [
      { value: "under_10000", label: "Under $10,000" },
      { value: "10000_15000", label: "$10,000–$15,000" },
      { value: "15000_25000", label: "$15,000–$25,000" },
      { value: "25000_50000", label: "$25,000–$50,000" },
      { value: "50000_100000", label: "$50,000–$100,000" },
      { value: "over_100000", label: "Over $100,000" }
    ];

    const timelines = [
      { value: "asap", label: "As soon as possible" },
      { value: "within_1_month", label: "Within 1 month" },
      { value: "within_3_months", label: "Within 3 months" },
      { value: "flexible", label: "Flexible" },
      { value: "other", label: "Other" }
    ];

    const contactMethods = [
      { value: "phone", label: "Phone" },
      { value: "email", label: "Email" }
    ];

    return {
      boatTypes: boatTypes,
      serviceOptions: this._clone(serviceOptions),
      budgetRanges: budgetRanges,
      timelines: timelines,
      contactMethods: contactMethods
    };
  }

  submitRestorationQuoteRequest(
    boatType,
    boatLengthFeet,
    boatYearBuilt,
    conditionNotes,
    requestedServiceIds,
    budgetRange,
    timeline,
    preferredContactMethod,
    phoneNumber,
    email,
    additionalNotes
  ) {
    const services = this._getFromStorage("restoration_service_definitions", []);
    const validServiceIds = Array.isArray(requestedServiceIds) ? requestedServiceIds.filter(function (id) {
      return services.some(function (s) { return s.id === id; });
    }) : [];

    const quoteRequest = {
      id: this._generateId("restquote"),
      created_at: this._getCurrentTimestamp(),
      boat_type: boatType,
      boat_length_feet: boatLengthFeet,
      boat_year_built: boatYearBuilt,
      condition_notes: conditionNotes || null,
      requested_service_ids: validServiceIds,
      budget_range: budgetRange,
      timeline: timeline,
      preferred_contact_method: preferredContactMethod,
      phone_number: phoneNumber || null,
      email: email || null,
      additional_notes: additionalNotes || null,
      status: "submitted"
    };

    const existing = this._getFromStorage("restoration_quote_requests", []);
    existing.push(quoteRequest);
    this._saveToStorage("restoration_quote_requests", existing);

    return {
      success: true,
      quoteRequestId: quoteRequest.id,
      status: quoteRequest.status,
      message: "Quote request submitted",
      createdAt: quoteRequest.created_at
    };
  }

  /* ------------ Varnish packages & simple estimate ------------ */

  getVarnishFilterOptions() {
    const packages = this._getFromStorage("varnish_packages", []);

    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (typeof p.price === "number") {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }

    const serviceTypes = [
      { value: "exterior_varnish", label: "Exterior varnish" },
      { value: "interior_varnish", label: "Interior varnish" }
    ];

    const priceRange = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      step: 50
    };

    const coatOptions = [
      { minCoats: 1, maxCoats: 4, label: "Up to 4 coats" },
      { minCoats: 5, maxCoats: 7, label: "5–7 coats" },
      { minCoats: 8, maxCoats: null, label: "8+ coats" }
    ];

    const sortOptions = [
      { value: "total_price_low_to_high", label: "Total price: Low to High" },
      { value: "total_price_high_to_low", label: "Total price: High to Low" },
      { value: "num_coats_desc", label: "Most coats first" },
      { value: "num_coats_asc", label: "Fewest coats first" }
    ];

    return {
      serviceTypes: serviceTypes,
      priceRange: priceRange,
      coatOptions: coatOptions,
      sortOptions: sortOptions
    };
  }

  searchVarnishPackages(filters, sort, page, pageSize) {
    const all = this._getFromStorage("varnish_packages", []);
    const f = filters || {};

    let results = all.filter(function (p) {
      if (f.serviceType && p.service_type !== f.serviceType) return false;
      if (typeof f.minPrice === "number" && p.price < f.minPrice) return false;
      if (typeof f.maxPrice === "number" && p.price > f.maxPrice) return false;
      if (typeof f.minCoats === "number" && p.num_coats < f.minCoats) return false;
      if (typeof f.maxCoats === "number" && p.num_coats > f.maxCoats) return false;
      if (typeof f.isActive === "boolean" && !!p.is_active !== f.isActive) return false;
      return true;
    });

    const s = sort || "total_price_low_to_high";
    results = results.slice();

    if (s === "total_price_low_to_high") {
      results.sort(function (a, b) { return a.price - b.price; });
    } else if (s === "total_price_high_to_low") {
      results.sort(function (a, b) { return b.price - a.price; });
    } else if (s === "num_coats_desc") {
      results.sort(function (a, b) { return b.num_coats - a.num_coats; });
    } else if (s === "num_coats_asc") {
      results.sort(function (a, b) { return a.num_coats - b.num_coats; });
    }

    const p = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const start = (p - 1) * ps;
    const end = start + ps;

    return {
      totalResults: totalResults,
      page: p,
      pageSize: ps,
      packages: this._clone(results.slice(start, end))
    };
  }

  getVarnishPackageDetail(varnishPackageId) {
    const pkgs = this._getFromStorage("varnish_packages", []);
    const pkg = pkgs.find(function (p) { return p.id === varnishPackageId; }) || null;
    return {
      package: pkg ? this._clone(pkg) : null
    };
  }

  addVarnishPackageToEstimate(varnishPackageId, quantity) {
    const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;
    const pkgs = this._getFromStorage("varnish_packages", []);
    const pkg = pkgs.find(function (p) { return p.id === varnishPackageId; }) || null;
    if (!pkg) {
      return { success: false, estimateId: null, totalPrice: 0, currency: "usd", message: "Varnish package not found" };
    }

    const estimate = this._getOrCreateRestorationEstimate();
    let items = this._getFromStorage("restoration_estimate_items", []);

    const unitPrice = Number(pkg.price) || 0;
    const lineTotal = unitPrice * qty;

    const item = {
      id: this._generateId("restestitem"),
      estimate_id: estimate.id,
      varnish_package_id: pkg.id,
      quantity: qty,
      unit_price: unitPrice,
      line_total: lineTotal
    };

    items.push(item);
    this._saveToStorage("restoration_estimate_items", items);

    // Update estimate.item_ids
    const estimates = this._getFromStorage("restoration_estimates", []);
    const idx = estimates.findIndex(function (e) { return e.id === estimate.id; });
    if (idx !== -1) {
      const est = estimates[idx];
      if (!Array.isArray(est.item_ids)) {
        est.item_ids = [];
      }
      est.item_ids.push(item.id);
      estimates[idx] = est;
      this._saveToStorage("restoration_estimates", estimates);
    }

    const updatedEstimate = this._recalculateRestorationEstimateTotals(estimate.id);

    return {
      success: true,
      estimateId: updatedEstimate.id,
      totalPrice: updatedEstimate.total_price,
      currency: updatedEstimate.currency,
      message: "Varnish package added to estimate"
    };
  }

  getCurrentRestorationEstimate() {
    const state = this._getSingleUserState();
    if (!state.restorationEstimateId) {
      return { estimate: null, items: [] };
    }
    const estimates = this._getFromStorage("restoration_estimates", []);
    const estimate = estimates.find(function (e) { return e.id === state.restorationEstimateId; }) || null;
    if (!estimate) {
      return { estimate: null, items: [] };
    }

    const itemsAll = this._getFromStorage("restoration_estimate_items", []);
    const itemsForEstimate = itemsAll.filter(function (it) { return it.estimate_id === estimate.id; });
    const pkgs = this._getFromStorage("varnish_packages", []);

    const enrichedItems = itemsForEstimate.map(function (it) {
      const pkg = pkgs.find(function (p) { return p.id === it.varnish_package_id; }) || null;
      const cloned = JSON.parse(JSON.stringify(it));
      cloned.varnishPackage = pkg ? JSON.parse(JSON.stringify(pkg)) : null;
      return cloned;
    });

    return {
      estimate: this._clone(estimate),
      items: enrichedItems
    };
  }

  /* ------------ Custom Restoration Planner ------------ */

  getPlannerServiceOptions(boatType, boatLengthFeet) {
    // In this simple implementation, all services are available; a real implementation could filter by boatType/length
    const services = this._getFromStorage("restoration_service_definitions", []);
    return {
      availableServices: this._clone(services)
    };
  }

  configureCustomRestorationPlan(boatType, boatLengthFeet, targetBudget, services) {
    const plan = this._getOrCreateRestorationPlan();
    const allPlans = this._getFromStorage("restoration_plans", []);
    const planIndex = allPlans.findIndex(function (p) { return p.id === plan.id; });

    const allServiceDefs = this._getFromStorage("restoration_service_definitions", []);
    let planItems = this._getFromStorage("restoration_plan_service_items", []);

    // Remove existing items for this plan
    planItems = planItems.filter(function (it) { return it.plan_id !== plan.id; });

    const tierMultiplier = function (tier) {
      if (tier === "basic") return 1.0;
      if (tier === "standard") return 1.5;
      if (tier === "premium") return 2.0;
      return 1.0;
    };

    const newItemIds = [];
    const serviceInputs = Array.isArray(services) ? services : [];

    for (let i = 0; i < serviceInputs.length; i++) {
      const s = serviceInputs[i];
      const def = allServiceDefs.find(function (d) { return d.id === s.serviceDefinitionId; }) || null;
      if (!def) continue;

      const tier = s.tier || "standard";
      const mult = tierMultiplier(tier);
      const qty = typeof s.quantity === "number" && s.quantity > 0 ? s.quantity : 1;

      let base = Number(def.base_price) || 0;
      let unitPrice = base;
      if (def.price_unit === "per_foot") {
        unitPrice = base * (Number(boatLengthFeet) || 0) * mult;
      } else {
        unitPrice = base * mult;
      }

      const lineTotal = unitPrice * qty;

      const item = {
        id: this._generateId("restplanitem"),
        plan_id: plan.id,
        service_definition_id: def.id,
        tier: tier,
        is_addon: !!s.isAddon,
        quantity: qty,
        unit_price: unitPrice,
        line_total: lineTotal
      };

      planItems.push(item);
      newItemIds.push(item.id);
    }

    this._saveToStorage("restoration_plan_service_items", planItems);

    // Update plan
    const now = this._getCurrentTimestamp();
    plan.boat_type = boatType;
    plan.boat_length_feet = boatLengthFeet;
    plan.target_budget = typeof targetBudget === "number" ? targetBudget : null;
    plan.service_item_ids = newItemIds;

    let totalEstimate = 0;
    for (let i = 0; i < planItems.length; i++) {
      const it = planItems[i];
      if (it.plan_id === plan.id) {
        totalEstimate += Number(it.line_total) || 0;
      }
    }
    plan.total_estimate = totalEstimate;
    plan.updated_at = now;

    if (planIndex !== -1) {
      allPlans[planIndex] = plan;
    } else {
      allPlans.push(plan);
    }
    this._saveToStorage("restoration_plans", allPlans);

    const isWithinTargetBudget = typeof targetBudget === "number" ? totalEstimate <= targetBudget : true;

    // Enrich items with serviceDefinition for return (not stored)
    const enrichedItems = planItems
      .filter(function (it) { return it.plan_id === plan.id; })
      .map(function (it) {
        const def = allServiceDefs.find(function (d) { return d.id === it.service_definition_id; }) || null;
        const cloned = JSON.parse(JSON.stringify(it));
        cloned.serviceDefinition = def ? JSON.parse(JSON.stringify(def)) : null;
        return cloned;
      });

    return {
      success: true,
      plan: this._clone(plan),
      serviceItems: enrichedItems,
      isWithinTargetBudget: isWithinTargetBudget,
      message: "Restoration plan updated"
    };
  }

  getPaymentPlanOptions() {
    const plans = this._getFromStorage("payment_plans", []);
    return this._clone(plans);
  }

  setRestorationPlanPaymentPlan(paymentPlanId) {
    const paymentPlans = this._getFromStorage("payment_plans", []);
    const paymentPlan = paymentPlans.find(function (p) { return p.id === paymentPlanId; }) || null;
    if (!paymentPlan) {
      return { success: false, plan: null, message: "Payment plan not found" };
    }

    const plan = this._getOrCreateRestorationPlan();
    const allPlans = this._getFromStorage("restoration_plans", []);
    const idx = allPlans.findIndex(function (p) { return p.id === plan.id; });

    plan.payment_plan_id = paymentPlan.id;
    plan.updated_at = this._getCurrentTimestamp();

    if (idx !== -1) {
      allPlans[idx] = plan;
    } else {
      allPlans.push(plan);
    }
    this._saveToStorage("restoration_plans", allPlans);

    return {
      success: true,
      plan: this._clone(plan),
      message: "Payment plan selected"
    };
  }

  getCurrentRestorationPlan() {
    const state = this._getSingleUserState();
    if (!state.restorationPlanId) {
      return { plan: null, serviceItems: [], paymentPlan: null };
    }
    const plans = this._getFromStorage("restoration_plans", []);
    const plan = plans.find(function (p) { return p.id === state.restorationPlanId; }) || null;
    if (!plan) {
      return { plan: null, serviceItems: [], paymentPlan: null };
    }

    const itemsAll = this._getFromStorage("restoration_plan_service_items", []);
    const itemsForPlan = itemsAll.filter(function (it) { return it.plan_id === plan.id; });
    const serviceDefs = this._getFromStorage("restoration_service_definitions", []);

    const enrichedItems = itemsForPlan.map(function (it) {
      const def = serviceDefs.find(function (d) { return d.id === it.service_definition_id; }) || null;
      const cloned = JSON.parse(JSON.stringify(it));
      cloned.serviceDefinition = def ? JSON.parse(JSON.stringify(def)) : null;
      return cloned;
    });

    let paymentPlan = null;
    if (plan.payment_plan_id) {
      const paymentPlans = this._getFromStorage("payment_plans", []);
      paymentPlan = paymentPlans.find(function (p) { return p.id === plan.payment_plan_id; }) || null;
      if (paymentPlan) {
        paymentPlan = this._clone(paymentPlan);
      }
    }

    return {
      plan: this._clone(plan),
      serviceItems: enrichedItems,
      paymentPlan: paymentPlan
    };
  }

  /* ------------ Tours ------------ */

  getTourOptionsAndInfo() {
    const tourTypes = [
      {
        code: "yard_tour",
        name: "Yard tour",
        description: "Guided tour of our yard and current restoration projects.",
        defaultDurationMinutes: 60
      },
      {
        code: "private_consultation",
        name: "Private consultation",
        description: "One-on-one consultation about your specific boat.",
        defaultDurationMinutes: 90
      }
    ];

    const visitGuidelines = [
      "Please wear closed-toe shoes in the yard.",
      "Children must be supervised at all times.",
      "Some areas may be noisy; hearing protection is recommended."
    ];

    const bookingInstructions = "Choose your preferred tour type, party size, and date/time to request a booking.";

    return {
      tourTypes: tourTypes,
      visitGuidelines: visitGuidelines,
      bookingInstructions: bookingInstructions,
      defaultTourType: "yard_tour"
    };
  }

  scheduleTour(tourType, partySize, startDateTime, notes) {
    if (!tourType) {
      return { success: false, booking: null, message: "Tour type is required" };
    }
    const booking = {
      id: this._generateId("tour"),
      tour_type: tourType,
      party_size: partySize,
      start_datetime: startDateTime,
      notes: notes || null,
      status: "requested",
      created_at: this._getCurrentTimestamp()
    };

    const bookings = this._getFromStorage("tour_bookings", []);
    bookings.push(booking);
    this._saveToStorage("tour_bookings", bookings);

    return {
      success: true,
      booking: this._clone(booking),
      message: "Tour scheduled (pending confirmation)"
    };
  }

  /* ------------ Accessories & cart ------------ */

  getAccessoryFilterOptions(category) {
    const products = this._getFromStorage("accessory_products", []);
    const filtered = category ? products.filter(function (p) { return p.category === category; }) : products;

    const categoryMap = {};
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      categoryMap[p.category] = true;
    }
    const categories = Object.keys(categoryMap).map((function (_this) {
      return function (value) {
        return { value: value, label: _this._capitalizeWords(value) };
      };
    })(this));

    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      if (typeof p.price === "number") {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }

    const priceRange = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      step: 5
    };

    const ratingOptions = [1, 2, 3, 4].map(function (minValue) {
      return {
        minValue: minValue,
        label: minValue + " stars & up"
      };
    });

    const lifeJacketSizeGroups = ["adult", "child", "infant", "universal"].map((function (_this) {
      return function (value) {
        return { value: value, label: _this._capitalizeWords(value) };
      };
    })(this));

    const pieceCountOptions = [
      { minPieces: 1, label: "1+ pieces" },
      { minPieces: 3, label: "3+ pieces" },
      { minPieces: 5, label: "5+ pieces" },
      { minPieces: 10, label: "10+ pieces" }
    ];

    return {
      categories: categories,
      priceRange: priceRange,
      ratingOptions: ratingOptions,
      lifeJacketSizeGroups: lifeJacketSizeGroups,
      pieceCountOptions: pieceCountOptions
    };
  }

  searchAccessoryProducts(category, filters, sort, page, pageSize) {
    const all = this._getFromStorage("accessory_products", []);
    const f = filters || {};

    let results = all.filter(function (p) {
      if (p.category !== category) return false;
      if (typeof p.is_active === "boolean" && !p.is_active) return false;
      if (typeof f.minPrice === "number" && p.price < f.minPrice) return false;
      if (typeof f.maxPrice === "number" && p.price > f.maxPrice) return false;
      if (typeof f.minAverageRatingStars === "number") {
        const stars = typeof p.average_rating_stars === "number" ? p.average_rating_stars : 0;
        if (stars < f.minAverageRatingStars) return false;
      }
      if (typeof f.isLifeJacket === "boolean" && !!p.is_life_jacket !== f.isLifeJacket) return false;
      if (f.lifeJacketSizeGroup && p.life_jacket_size_group !== f.lifeJacketSizeGroup) return false;
      if (typeof f.minPieceCount === "number") {
        const count = typeof p.piece_count === "number" ? p.piece_count : 0;
        if (count < f.minPieceCount) return false;
      }
      return true;
    });

    const s = sort || "price_low_to_high";
    results = results.slice();

    if (s === "price_low_to_high") {
      results.sort(function (a, b) { return a.price - b.price; });
    } else if (s === "price_high_to_low") {
      results.sort(function (a, b) { return b.price - a.price; });
    } else if (s === "rating_high_to_low") {
      results.sort(function (a, b) {
        const ar = typeof a.average_rating_stars === "number" ? a.average_rating_stars : 0;
        const br = typeof b.average_rating_stars === "number" ? b.average_rating_stars : 0;
        return br - ar;
      });
    } else if (s === "name_a_to_z") {
      results.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); });
    }

    const p = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const start = (p - 1) * ps;
    const end = start + ps;

    return {
      totalResults: totalResults,
      page: p,
      pageSize: ps,
      products: this._clone(results.slice(start, end))
    };
  }

  getAccessoryProductDetail(accessoryId) {
    const products = this._getFromStorage("accessory_products", []);
    const product = products.find(function (p) { return p.id === accessoryId; }) || null;
    if (!product) {
      return { product: null, relatedProducts: [] };
    }

    const relatedProducts = products
      .filter(function (p) { return p.category === product.category && p.id !== product.id && p.is_active; })
      .slice(0, 4);

    return {
      product: this._clone(product),
      relatedProducts: this._clone(relatedProducts)
    };
  }

  addAccessoryToCart(accessoryId, quantity) {
    const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage("accessory_products", []);
    const product = products.find(function (p) { return p.id === accessoryId; }) || null;
    if (!product) {
      return { success: false, cartId: null, message: "Accessory not found", cartSummary: null };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);

    const unitPrice = Number(product.price) || 0;
    const lineTotal = unitPrice * qty;

    const cartItem = {
      id: this._generateId("cartitem"),
      cart_id: cart.id,
      item_type: "accessory",
      boat_id: null,
      accessory_id: product.id,
      varnish_package_id: null,
      prepurchase_survey_option_id: null,
      quantity: qty,
      unit_price: unitPrice,
      line_total: lineTotal,
      added_at: this._getCurrentTimestamp()
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    const carts = this._getFromStorage("carts", []);
    const cartIndex = carts.findIndex(function (c) { return c.id === cart.id; });
    if (cartIndex !== -1) {
      const updatedCart = carts[cartIndex];
      if (!Array.isArray(updatedCart.item_ids)) {
        updatedCart.item_ids = [];
      }
      updatedCart.item_ids.push(cartItem.id);
      updatedCart.updated_at = this._getCurrentTimestamp();
      carts[cartIndex] = updatedCart;
      this._saveToStorage("carts", carts);
    }

    const updatedCart = this._recalculateCartTotals(cart.id);

    const itemsForCart = this._getFromStorage("cart_items", []).filter(function (ci) { return ci.cart_id === updatedCart.id; });
    let itemCount = 0;
    for (let i = 0; i < itemsForCart.length; i++) {
      itemCount += itemsForCart[i].quantity || 0;
    }

    const cartSummary = {
      subtotal: updatedCart.subtotal,
      shippingCost: updatedCart.shipping_cost,
      total: updatedCart.total,
      currency: updatedCart.currency,
      itemCount: itemCount
    };

    return {
      success: true,
      cartId: updatedCart.id,
      message: "Accessory added to cart",
      cartSummary: cartSummary
    };
  }

  getCartSummary() {
    const state = this._getSingleUserState();
    if (!state.cartId) {
      return {
        cartId: null,
        subtotal: 0,
        shippingCost: 0,
        total: 0,
        currency: "usd",
        items: [],
        selectedShippingOption: null
      };
    }

    const carts = this._getFromStorage("carts", []);
    const cart = carts.find(function (c) { return c.id === state.cartId; }) || null;
    if (!cart) {
      return {
        cartId: null,
        subtotal: 0,
        shippingCost: 0,
        total: 0,
        currency: "usd",
        items: [],
        selectedShippingOption: null
      };
    }

    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    const cartItems = this._getFromStorage("cart_items", []).filter(function (ci) { return ci.cart_id === updatedCart.id; });
    const boats = this._getFromStorage("boat_listings", []);
    const accessories = this._getFromStorage("accessory_products", []);
    const varnishPackages = this._getFromStorage("varnish_packages", []);
    const surveys = this._getFromStorage("prepurchase_survey_options", []);

    const items = cartItems.map(function (ci) {
      const boat = ci.boat_id ? (boats.find(function (b) { return b.id === ci.boat_id; }) || null) : null;
      const accessory = ci.accessory_id ? (accessories.find(function (a) { return a.id === ci.accessory_id; }) || null) : null;
      const vPkg = ci.varnish_package_id ? (varnishPackages.find(function (v) { return v.id === ci.varnish_package_id; }) || null) : null;
      const survey = ci.prepurchase_survey_option_id ? (surveys.find(function (s) { return s.id === ci.prepurchase_survey_option_id; }) || null) : null;

      return {
        cartItemId: ci.id,
        itemType: ci.item_type,
        quantity: ci.quantity,
        unitPrice: ci.unit_price,
        lineTotal: ci.line_total,
        boatId: ci.boat_id || null,
        boatName: boat ? boat.name : null,
        boat: boat ? JSON.parse(JSON.stringify(boat)) : null,
        accessoryId: ci.accessory_id || null,
        accessoryName: accessory ? accessory.name : null,
        accessory: accessory ? JSON.parse(JSON.stringify(accessory)) : null,
        varnishPackageId: ci.varnish_package_id || null,
        varnishPackageName: vPkg ? vPkg.name : null,
        varnishPackage: vPkg ? JSON.parse(JSON.stringify(vPkg)) : null,
        prepurchaseSurveyLabel: survey ? survey.label : null
      };
    });

    const shippingOptions = this._getFromStorage("shipping_options", []);
    let selectedShippingOption = null;
    if (updatedCart.shipping_option_id) {
      const opt = shippingOptions.find(function (o) { return o.id === updatedCart.shipping_option_id; }) || null;
      if (opt) {
        selectedShippingOption = {
          shippingOptionId: opt.id,
          code: opt.code,
          name: opt.name,
          cost: opt.cost
        };
      }
    }

    return {
      cartId: updatedCart.id,
      subtotal: updatedCart.subtotal,
      shippingCost: updatedCart.shipping_cost,
      total: updatedCart.total,
      currency: updatedCart.currency,
      items: items,
      selectedShippingOption: selectedShippingOption
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage("cart_items", []);
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return { success: false, cartId: null, subtotal: 0, shippingCost: 0, total: 0, message: "Cart item not found" };
    }

    const item = cartItems[idx];
    const cartId = item.cart_id;

    if (quantity <= 0) {
      // Remove item
      cartItems.splice(idx, 1);
    } else {
      item.quantity = quantity;
      item.line_total = item.unit_price * quantity;
      cartItems[idx] = item;
    }

    this._saveToStorage("cart_items", cartItems);

    // Update cart.item_ids (remove if deleted)
    const carts = this._getFromStorage("carts", []);
    const cartIndex = carts.findIndex(function (c) { return c.id === cartId; });
    if (cartIndex !== -1) {
      const cart = carts[cartIndex];
      if (!Array.isArray(cart.item_ids)) {
        cart.item_ids = [];
      }
      if (quantity <= 0) {
        cart.item_ids = cart.item_ids.filter(function (id) { return id !== cartItemId; });
      }
      cart.updated_at = this._getCurrentTimestamp();
      carts[cartIndex] = cart;
      this._saveToStorage("carts", carts);
    }

    const updatedCart = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cartId: updatedCart ? updatedCart.id : cartId,
      subtotal: updatedCart ? updatedCart.subtotal : 0,
      shippingCost: updatedCart ? updatedCart.shipping_cost : 0,
      total: updatedCart ? updatedCart.total : 0,
      message: quantity <= 0 ? "Cart item removed" : "Cart item updated"
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage("cart_items", []);
    const idx = cartItems.findIndex(function (ci) { return ci.id === cartItemId; });
    if (idx === -1) {
      return { success: false, cartId: null, subtotal: 0, shippingCost: 0, total: 0, message: "Cart item not found" };
    }

    const item = cartItems[idx];
    const cartId = item.cart_id;

    cartItems.splice(idx, 1);
    this._saveToStorage("cart_items", cartItems);

    const carts = this._getFromStorage("carts", []);
    const cartIndex = carts.findIndex(function (c) { return c.id === cartId; });
    if (cartIndex !== -1) {
      const cart = carts[cartIndex];
      if (!Array.isArray(cart.item_ids)) {
        cart.item_ids = [];
      }
      cart.item_ids = cart.item_ids.filter(function (id) { return id !== cartItemId; });
      cart.updated_at = this._getCurrentTimestamp();
      carts[cartIndex] = cart;
      this._saveToStorage("carts", carts);
    }

    const updatedCart = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cartId: updatedCart ? updatedCart.id : cartId,
      subtotal: updatedCart ? updatedCart.subtotal : 0,
      shippingCost: updatedCart ? updatedCart.shipping_cost : 0,
      total: updatedCart ? updatedCart.total : 0,
      message: "Cart item removed"
    };
  }

  getAvailableShippingOptions() {
    const options = this._getFromStorage("shipping_options", []);
    return this._clone(options);
  }

  selectShippingOption(shippingOptionId) {
    const options = this._getFromStorage("shipping_options", []);
    const opt = options.find(function (o) { return o.id === shippingOptionId; }) || null;
    if (!opt) {
      return { success: false, cartId: null, shippingOptionId: null, shippingCost: 0, total: 0, message: "Shipping option not found" };
    }

    const cart = this._getOrCreateCart();
    const carts = this._getFromStorage("carts", []);
    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx !== -1) {
      carts[idx].shipping_option_id = opt.id;
      carts[idx].updated_at = this._getCurrentTimestamp();
      this._saveToStorage("carts", carts);
    }

    const updatedCart = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      cartId: updatedCart.id,
      shippingOptionId: opt.id,
      shippingCost: updatedCart.shipping_cost,
      total: updatedCart.total,
      message: "Shipping option selected"
    };
  }

  /* ------------ Resources & guides ------------ */

  getResourceFilterOptions() {
    const topics = [
      "maintenance",
      "restoration",
      "buying_selling",
      "storage",
      "safety",
      "other"
    ].map((function (_this) {
      return function (value) {
        return { value: value, label: _this._capitalizeWords(value) };
      };
    })(this));

    const subtopics = [
      "winterizing",
      "cleaning",
      "inspections",
      "varnishing",
      "repairs",
      "general",
      "other"
    ].map((function (_this) {
      return function (value) {
        return { value: value, label: _this._capitalizeWords(value) };
      };
    })(this));

    const boatAgeCategories = [
      "all_ages",
      "under_10_years",
      "between_10_30_years",
      "boats_30_plus_years"
    ].map((function (_this) {
      return function (value) {
        return { value: value, label: _this._capitalizeWords(value) };
      };
    })(this));

    const sortOptions = [
      { value: "reading_time_longest_first", label: "Reading time: Longest first" },
      { value: "reading_time_shortest_first", label: "Reading time: Shortest first" },
      { value: "most_recent", label: "Most recent" },
      { value: "oldest", label: "Oldest" }
    ];

    return {
      topics: topics,
      subtopics: subtopics,
      boatAgeCategories: boatAgeCategories,
      sortOptions: sortOptions
    };
  }

  searchResourceArticles(filters, sort, page, pageSize) {
    const all = this._getFromStorage("resource_articles", []);
    const f = filters || {};

    let results = all.filter(function (a) {
      if (f.topic && a.topic !== f.topic) return false;
      if (f.subtopic && a.subtopic !== f.subtopic) return false;
      if (f.boatAgeCategory && a.boat_age_category !== f.boatAgeCategory) return false;
      if (typeof f.minReadingTimeMinutes === "number" && a.reading_time_minutes < f.minReadingTimeMinutes) return false;
      if (typeof f.maxReadingTimeMinutes === "number" && a.reading_time_minutes > f.maxReadingTimeMinutes) return false;
      return true;
    });

    const s = sort || "reading_time_longest_first";
    results = results.slice();

    if (s === "reading_time_longest_first") {
      results.sort(function (a, b) { return b.reading_time_minutes - a.reading_time_minutes; });
    } else if (s === "reading_time_shortest_first") {
      results.sort(function (a, b) { return a.reading_time_minutes - b.reading_time_minutes; });
    } else if (s === "most_recent") {
      results.sort(function (a, b) {
        return (b.published_at || "").localeCompare(a.published_at || "");
      });
    } else if (s === "oldest") {
      results.sort(function (a, b) {
        return (a.published_at || "").localeCompare(b.published_at || "");
      });
    }

    const p = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const start = (p - 1) * ps;
    const end = start + ps;

    return {
      totalResults: totalResults,
      page: p,
      pageSize: ps,
      articles: this._clone(results.slice(start, end))
    };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage("resource_articles", []);
    const article = articles.find(function (a) { return a.id === articleId; }) || null;
    if (!article) {
      return { article: null, estimatedReadingTimeMinutes: 0, isSaved: false };
    }
    const saved = this._getFromStorage("saved_articles", []);
    const isSaved = saved.some(function (s) { return s.article_id === article.id; });

    return {
      article: this._clone(article),
      estimatedReadingTimeMinutes: article.reading_time_minutes,
      isSaved: isSaved
    };
  }

  getReadingCollections() {
    const collections = this._getFromStorage("reading_collections", []);
    return this._clone(collections);
  }

  saveArticleToCollection(articleId, collectionId) {
    const savedArticles = this._getFromStorage("saved_articles", []);
    const newSaved = {
      id: this._generateId("savedarticle"),
      article_id: articleId,
      collection_id: collectionId,
      saved_at: this._getCurrentTimestamp()
    };
    savedArticles.push(newSaved);
    this._saveToStorage("saved_articles", savedArticles);

    return {
      success: true,
      savedArticleId: newSaved.id,
      message: "Article saved to collection"
    };
  }

  /* ------------ Restoration gallery ------------ */

  getRestorationGalleryFilterOptions() {
    const projects = this._getFromStorage("restoration_projects", []);

    let minLength = null;
    let maxLength = null;
    let minYear = null;
    let maxYear = null;

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      if (typeof p.boat_length_feet === "number") {
        if (minLength === null || p.boat_length_feet < minLength) minLength = p.boat_length_feet;
        if (maxLength === null || p.boat_length_feet > maxLength) maxLength = p.boat_length_feet;
      }
      if (typeof p.boat_year_built === "number") {
        if (minYear === null || p.boat_year_built < minYear) minYear = p.boat_year_built;
        if (maxYear === null || p.boat_year_built > maxYear) maxYear = p.boat_year_built;
      }
    }

    const boatTypes = ["sailboat", "runabout", "cabin_cruiser", "dinghy", "other"].map((function (_this) {
      return function (value) {
        return { value: value, label: _this._capitalizeWords(value) };
      };
    })(this));

    const lengthFeetRange = {
      min: minLength !== null ? minLength : 0,
      max: maxLength !== null ? maxLength : 0,
      step: 1
    };

    const yearBuiltRange = {
      minYear: minYear !== null ? minYear : 1900,
      maxYear: maxYear !== null ? maxYear : new Date().getFullYear()
    };

    const budgetRanges = [
      { value: "under_50000", label: "Under $50,000" },
      { value: "50000_100000", label: "$50,000–$100,000" },
      { value: "over_100000", label: "Over $100,000" }
    ];

    const sortOptions = [
      { value: "most_recent", label: "Most recent" },
      { value: "oldest", label: "Oldest" },
      { value: "budget_low_to_high", label: "Budget: Low to High" },
      { value: "budget_high_to_low", label: "Budget: High to Low" }
    ];

    return {
      boatTypes: boatTypes,
      lengthFeetRange: lengthFeetRange,
      yearBuiltRange: yearBuiltRange,
      budgetRanges: budgetRanges,
      sortOptions: sortOptions
    };
  }

  searchRestorationProjects(filters, sort, page, pageSize) {
    const all = this._getFromStorage("restoration_projects", []);
    const f = filters || {};

    let results = all.filter(function (p) {
      if (f.boatType && p.boat_type !== f.boatType) return false;
      if (typeof f.minLengthFeet === "number" && p.boat_length_feet < f.minLengthFeet) return false;
      if (typeof f.maxLengthFeet === "number" && p.boat_length_feet > f.maxLengthFeet) return false;
      if (typeof f.minYearBuilt === "number" && p.boat_year_built < f.minYearBuilt) return false;
      if (typeof f.maxYearBuilt === "number" && p.boat_year_built > f.maxYearBuilt) return false;

      if (f.budgetRange) {
        if (f.budgetRange === "under_50000") {
          if (!(p.budget_max < 50000)) return false;
        } else if (f.budgetRange === "50000_100000") {
          if (!(p.budget_min >= 50000 && p.budget_max <= 100000)) return false;
        } else if (f.budgetRange === "over_100000") {
          if (!(p.budget_min > 100000 || p.budget_max > 100000)) return false;
        }
      }
      return true;
    });

    const s = sort || "most_recent";
    results = results.slice();

    if (s === "most_recent") {
      results.sort(function (a, b) {
        return (b.gallery_sort_date || "").localeCompare(a.gallery_sort_date || "");
      });
    } else if (s === "oldest") {
      results.sort(function (a, b) {
        return (a.gallery_sort_date || "").localeCompare(b.gallery_sort_date || "");
      });
    } else if (s === "budget_low_to_high") {
      results.sort(function (a, b) { return a.budget_min - b.budget_min; });
    } else if (s === "budget_high_to_low") {
      results.sort(function (a, b) { return b.budget_max - a.budget_max; });
    }

    const p = typeof page === "number" && page > 0 ? page : 1;
    const ps = typeof pageSize === "number" && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const start = (p - 1) * ps;
    const end = start + ps;

    return {
      totalResults: totalResults,
      page: p,
      pageSize: ps,
      projects: this._clone(results.slice(start, end))
    };
  }

  getRestorationProjectDetail(projectId) {
    const projects = this._getFromStorage("restoration_projects", []);
    const project = projects.find(function (p) { return p.id === projectId; }) || null;
    return {
      project: project ? this._clone(project) : null
    };
  }

  submitGalleryInquiry(projectId, email, message) {
    const inquiry = {
      id: this._generateId("galleryinq"),
      project_id: projectId,
      email: email,
      message: message,
      created_at: this._getCurrentTimestamp(),
      status: "submitted"
    };

    const inquiries = this._getFromStorage("gallery_inquiries", []);
    inquiries.push(inquiry);
    this._saveToStorage("gallery_inquiries", inquiries);

    return {
      success: true,
      inquiryId: inquiry.id,
      status: inquiry.status,
      message: "Inquiry submitted"
    };
  }

  /* ------------ About, policies & terms ------------ */

  getAboutAndContactContent() {
    const aboutText = "We specialize in the restoration, maintenance, and sale of classic wooden boats.";
    const history = "Founded by craftspeople with decades of experience, our yard has restored wooden sailboats, runabouts, and cruisers for owners around the world.";
    const philosophy = "We believe in preserving traditional craftsmanship while using modern best practices for safety and longevity.";

    const expertiseHighlights = [
      "Full-keel and fin-keel wooden sailboat restorations",
      "Engine overhauls and mechanical systems for classic runabouts",
      "Custom varnish and brightwork finishing",
      "Long-term storage and winterizing for wooden boats"
    ];

    const contactDetails = {
      phone: "",
      email: "",
      addressLines: []
    };

    const relatedLinks = [
      { targetPage: "tours", label: "Visit our yard" },
      { targetPage: "restoration_services", label: "Explore restoration services" },
      { targetPage: "boats_for_sale", label: "Browse boats for sale" }
    ];

    return {
      aboutText: aboutText,
      history: history,
      philosophy: philosophy,
      expertiseHighlights: expertiseHighlights,
      contactDetails: contactDetails,
      relatedLinks: relatedLinks
    };
  }

  getPoliciesAndTermsContent(section) {
    const sections = [
      {
        code: "terms_of_service",
        title: "Terms of Service",
        contentHtml: "<p>Use of this website and our services is subject to these terms of service. All projects are quoted individually and subject to written agreement.</p>"
      },
      {
        code: "purchase_policies",
        title: "Purchase Policies",
        contentHtml: "<p>All boat sales are subject to contract. Pre-purchase surveys are recommended and may be included or offered as add-ons depending on the listing.</p>"
      },
      {
        code: "reservation_policies",
        title: "Reservation Policies",
        contentHtml: "<p>Reservations for dinghies and small craft are typically held for a limited time pending payment and completion of paperwork.</p>"
      },
      {
        code: "shipping_policies",
        title: "Shipping Policies",
        contentHtml: "<p>Accessories are shipped using the method selected at checkout. Delivery timeframes are estimates only.</p>"
      },
      {
        code: "storage_policies",
        title: "Storage Policies",
        contentHtml: "<p>Winter storage offers and free first-winter storage benefits apply only where explicitly indicated in the listing or contract.</p>"
      },
      {
        code: "cancellation_policies",
        title: "Cancellation Policies",
        contentHtml: "<p>Project and tour cancellations may be subject to fees depending on timing and costs already incurred.</p>"
      },
      {
        code: "warranty_and_liability",
        title: "Warranty and Liability",
        contentHtml: "<p>Restoration work is warranted as specified in your written agreement. Wooden boats require ongoing maintenance; no guarantee is made beyond the agreed scope.</p>"
      }
    ];

    if (section && section !== "all") {
      const filtered = sections.filter(function (s) { return s.code === section; });
      return { sections: filtered };
    }

    return { sections: sections };
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
