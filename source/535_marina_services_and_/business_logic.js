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

  _initStorage() {
    // Core collections (from original template, kept for compatibility)
    const baseKeys = [
      "users",
      "products", // store products
      "carts",
      "cartItems" // legacy key, not used by core logic but preserved
    ];

    // Domain collections based on provided data models
    const domainKeys = [
      "cart_items", // CartItem
      "slips",
      "transient_reservations",
      "boats",
      "winter_storage_plans",
      "winter_storage_reservations",
      "rack_storage_options",
      "rack_storage_reservations",
      "service_categories",
      "service_packages",
      "technicians",
      "service_time_slots",
      "technician_availability",
      "add_on_services",
      "service_appointments",
      "store_categories",
      "classes",
      "class_sessions",
      "class_registrations",
      "seasonal_slip_plans",
      "seasonal_slip_quote_requests",
      "amenities",
      "fuel_dock_info",
      "operating_hours",
      "contact_messages"
    ];

    const allKeys = baseKeys.concat(domainKeys);

    allKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (localStorage.getItem("idCounter") === null) {
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
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _parseDateOnly(isoString) {
    if (!isoString || typeof isoString !== "string") return null;
    return isoString.substring(0, 10); // YYYY-MM-DD
  }

  _daysBetween(startIso, endIso) {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = (end - start) / msPerDay;
    return diff > 0 ? diff : 0;
  }

  _monthsBetween(startIso, endIso) {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const years = end.getFullYear() - start.getFullYear();
    const months = end.getMonth() - start.getMonth();
    let total = years * 12 + months;
    if (end.getDate() > start.getDate()) {
      total += 1;
    }
    return total > 0 ? total : 0;
  }

  _findById(collectionKey, id) {
    const items = this._getFromStorage(collectionKey, []);
    return items.find((x) => x.id === id) || null;
  }

  // ---------- Helper Functions (private) ----------

  // Cart helper
  _getOrCreateCart() {
    const carts = this._getFromStorage("carts", []);
    let cart = carts.find((c) => c.status === "open");
    if (!cart) {
      cart = {
        id: this._generateId("cart"),
        status: "open",
        created_at: new Date().toISOString(),
        updated_at: null
      };
      carts.push(cart);
      this._saveToStorage("carts", carts);
    }
    return cart;
  }

  // Boat helper - currently always creates a boat record when details provided
  _getOrCreateBoatFromInput(boatDetails) {
    if (!boatDetails) return null;
    const boats = this._getFromStorage("boats", []);

    // Simple strategy: always create a new boat record
    const boat = {
      id: this._generateId("boat"),
      name: boatDetails.boatName || null,
      boat_type: boatDetails.boatType || "other",
      length_ft: boatDetails.lengthFt || boatDetails.length_ft || 0,
      beam_ft: boatDetails.beamFt || null,
      draft_ft: boatDetails.draftFt || null,
      make: boatDetails.make || null,
      model: boatDetails.model || null,
      year: boatDetails.year || null,
      registration_number: boatDetails.registration_number || null,
      notes: boatDetails.notes || null
    };

    boats.push(boat);
    this._saveToStorage("boats", boats);
    return boat.id;
  }

  _calculateTransientSlipPrice(slip, checkIn, checkOut) {
    const nights = this._daysBetween(checkIn, checkOut);
    const nightlyRate = slip && typeof slip.nightly_rate === "number" ? slip.nightly_rate : 0;
    const totalPrice = nightlyRate * nights;
    return {
      nights,
      nightly_rate: nightlyRate,
      total_price: totalPrice
    };
  }

  _calculateWinterStoragePrice(plan, startDate, endDate, boatLengthFt) {
    if (!plan) return 0;
    const days = this._daysBetween(startDate, endDate);
    const length = boatLengthFt || 0;
    let total = 0;

    if (plan.pricing_model === "per_foot_per_day") {
      const rate = plan.rate_per_foot_per_day || 0;
      total = rate * length * days;
    } else if (plan.pricing_model === "per_foot_per_season") {
      const rate = plan.rate_per_foot_per_day || 0; // reused field per spec comment
      total = rate * length;
    } else if (plan.pricing_model === "flat_per_season") {
      total = plan.season_flat_price || 0;
    }

    return total;
  }

  _calculateSeasonalSlipPrice(plan, startDate, endDate, boatLengthFt) {
    if (!plan) return 0;
    const length = boatLengthFt || 0;
    let total = 0;

    if (plan.price_model === "flat_per_season") {
      total = plan.base_price || 0;
    } else if (plan.price_model === "per_foot_per_season") {
      total = (plan.base_price || 0) * length;
    } else if (plan.price_model === "per_month") {
      const months = this._monthsBetween(startDate, endDate) || 1;
      total = (plan.base_price || 0) * months;
    }

    return total;
  }

  _calculateRackStorageReservation(option, startDate, durationMonths) {
    const start = new Date(startDate || new Date().toISOString());
    const duration = durationMonths && durationMonths > 0 ? durationMonths : 1;
    const end = new Date(start.getTime());
    end.setMonth(end.getMonth() + duration);

    const monthlyPrice = option && typeof option.monthly_price === "number" ? option.monthly_price : 0;
    const totalPrice = monthlyPrice * duration;

    return {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      duration_months: duration,
      monthly_price: monthlyPrice,
      total_price: totalPrice
    };
  }

  _validateAddOnEligibility(servicePackageId, addOnServiceIds, boatLengthFt) {
    if (!Array.isArray(addOnServiceIds) || addOnServiceIds.length === 0) return [];
    const addOns = this._getFromStorage("add_on_services", []);
    const length = boatLengthFt || 0;

    const eligibleIds = [];

    addOnServiceIds.forEach((id) => {
      const addOn = addOns.find((a) => a.id === id && a.status === "active");
      if (!addOn) return;

      // Check service package applicability if specified
      if (Array.isArray(addOn.applicable_service_package_ids) && addOn.applicable_service_package_ids.length > 0) {
        if (!addOn.applicable_service_package_ids.includes(servicePackageId)) {
          return; // not applicable
        }
      }

      // Eligibility rule by boat length
      if (addOn.eligibility_rule === "boat_over_30ft") {
        if (length <= 30) return;
      } else if (addOn.eligibility_rule === "boat_under_30ft") {
        if (length >= 30) return;
      }

      eligibleIds.push(id);
    });

    return eligibleIds;
  }

  _findNextAvailableServiceDate(servicePackageId, fromDateIso) {
    const slots = this._getFromStorage("service_time_slots", []);
    const fromDate = fromDateIso ? new Date(fromDateIso) : new Date();

    const filtered = slots
      .filter((s) => s.service_package_id === servicePackageId && s.is_available)
      .filter((s) => new Date(s.start_datetime) >= fromDate)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

    if (!filtered.length) return null;
    return this._parseDateOnly(filtered[0].start_datetime);
  }

  _hasOverlappingTransientReservation(slipId, checkIn, checkOut) {
    const reservations = this._getFromStorage("transient_reservations", []);
    const start = new Date(checkIn);
    const end = new Date(checkOut);

    return reservations.some((r) => {
      if (r.slip_id !== slipId) return false;
      if (r.status === "cancelled") return false;
      const rStart = new Date(r.check_in);
      const rEnd = new Date(r.check_out);
      return start < rEnd && end > rStart;
    });
  }

  // ---------- Interface Implementations ----------

  // 1) getHomepageContent
  getHomepageContent() {
    const raw = localStorage.getItem("homepage_content");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    // Default empty structure (not persisted, no mock content)
    return {
      hero_title: "",
      hero_subtitle: "",
      hero_image_url: "",
      primary_ctas: [],
      key_services: [],
      notices: [],
      featured_offers: []
    };
  }

  // 2) getTransientSlipSearchOptions
  getTransientSlipSearchOptions() {
    const slips = this._getFromStorage("slips", []);

    const has30a = slips.some((s) => s.shore_power_30a === true);
    const has50a = slips.some((s) => s.shore_power_50a === true);
    const has100a = slips.some((s) => s.shore_power_100a === true);
    const hasWater = slips.some((s) => s.has_water_hookup === true);
    const hasWifi = slips.some((s) => s.has_wifi === true);

    return {
      boat_types: ["powerboat", "sailboat", "personal_watercraft", "other"],
      amenity_filters: {
        supports_shore_power_30a: has30a,
        supports_shore_power_50a: has50a,
        has_water_hookup: hasWater,
        has_wifi: hasWifi,
        // shore_power_100a not directly requested but implied
        supports_shore_power_100a: has100a
      },
      sort_options: [
        { id: "price_asc", label: "Price: Low to High" },
        { id: "price_desc", label: "Price: High to Low" },
        { id: "dock_name_asc", label: "Dock Name" }
      ]
    };
  }

  // 3) searchTransientSlips
  searchTransientSlips(checkIn, checkOut, boatLengthFt, boatType, filters, sortBy) {
    const slips = this._getFromStorage("slips", []);
    const effectiveFilters = filters || {};

    let results = slips.filter((s) => s.status === "active");

    // Boat fit by length
    results = results.filter((s) => {
      const maxOk = typeof s.max_length_ft === "number" ? s.max_length_ft >= boatLengthFt : true;
      const minOk = typeof s.min_length_ft === "number" ? s.min_length_ft <= boatLengthFt : true;
      return maxOk && minOk;
    });

    // Additional filters
    if (effectiveFilters.requiresShorePower30A) {
      results = results.filter((s) => s.shore_power_30a === true);
    }
    if (effectiveFilters.requiresShorePower50A) {
      results = results.filter((s) => s.shore_power_50a === true);
    }
    if (effectiveFilters.requiresWaterHookup) {
      results = results.filter((s) => s.has_water_hookup === true);
    }
    if (effectiveFilters.requiresWifi) {
      results = results.filter((s) => s.has_wifi === true);
    }
    if (typeof effectiveFilters.minSlipLengthFt === "number") {
      results = results.filter((s) => (typeof s.max_length_ft === "number" ? s.max_length_ft >= effectiveFilters.minSlipLengthFt : true));
    }

    // Build result entries with pricing and availability
    const mapped = results.map((s) => {
      const pricing = this._calculateTransientSlipPrice(s, checkIn, checkOut);
      const isUnavailable = this._hasOverlappingTransientReservation(s.id, checkIn, checkOut);

      return {
        slip_id: s.id,
        slip_name: s.name,
        dock_name: s.dock_name || "",
        max_length_ft: s.max_length_ft,
        min_length_ft: s.min_length_ft || 0,
        shore_power_30a: !!s.shore_power_30a,
        shore_power_50a: !!s.shore_power_50a,
        shore_power_100a: !!s.shore_power_100a,
        has_water_hookup: !!s.has_water_hookup,
        has_wifi: !!s.has_wifi,
        nightly_rate: pricing.nightly_rate,
        currency: "USD",
        nights: pricing.nights,
        total_price: pricing.total_price,
        photos: Array.isArray(s.photos) ? s.photos : [],
        is_available_for_dates: !isUnavailable,
        unavailable_reason: isUnavailable ? "reserved" : ""
      };
    });

    // Only return available slips
    let availableResults = mapped.filter((r) => r.is_available_for_dates);

    // Sorting
    if (sortBy === "price_asc") {
      availableResults.sort((a, b) => a.total_price - b.total_price);
    } else if (sortBy === "price_desc") {
      availableResults.sort((a, b) => b.total_price - a.total_price);
    } else if (sortBy === "dock_name_asc") {
      availableResults.sort((a, b) => (a.dock_name || "").localeCompare(b.dock_name || ""));
    }

    return availableResults;
  }

  // 4) getTransientSlipDetailForStay
  getTransientSlipDetailForStay(slipId, checkIn, checkOut, boatLengthFt, boatType) {
    const slip = this._findById("slips", slipId);
    if (!slip) {
      return {
        slip: null,
        photos: [],
        amenities: {
          shore_power_30a: false,
          shore_power_50a: false,
          shore_power_100a: false,
          has_water_hookup: false,
          has_wifi: false
        },
        stay_summary: {
          check_in: checkIn,
          check_out: checkOut,
          nights: 0,
          nightly_rate: 0,
          total_price: 0,
          currency: "USD",
          boat_length_ft: boatLengthFt,
          boat_type: boatType,
          boat_fits: false,
          fit_message: "Slip not found"
        }
      };
    }

    const pricing = this._calculateTransientSlipPrice(slip, checkIn, checkOut);
    const maxOk = typeof slip.max_length_ft === "number" ? slip.max_length_ft >= boatLengthFt : true;
    const minOk = typeof slip.min_length_ft === "number" ? slip.min_length_ft <= boatLengthFt : true;
    const boatFits = maxOk && minOk;

    return {
      slip,
      photos: Array.isArray(slip.photos) ? slip.photos : [],
      amenities: {
        shore_power_30a: !!slip.shore_power_30a,
        shore_power_50a: !!slip.shore_power_50a,
        shore_power_100a: !!slip.shore_power_100a,
        has_water_hookup: !!slip.has_water_hookup,
        has_wifi: !!slip.has_wifi
      },
      stay_summary: {
        check_in: checkIn,
        check_out: checkOut,
        nights: pricing.nights,
        nightly_rate: pricing.nightly_rate,
        total_price: pricing.total_price,
        currency: "USD",
        boat_length_ft: boatLengthFt,
        boat_type: boatType,
        boat_fits: boatFits,
        fit_message: boatFits ? "Boat fits in this slip" : "Boat length outside slip limits"
      }
    };
  }

  // 5) createTransientReservation
  createTransientReservation(slipId, checkIn, checkOut, boatLengthFt, boatType, contactName, contactEmail, contactPhone, notes) {
    const slips = this._getFromStorage("slips", []);
    const slip = slips.find((s) => s.id === slipId);
    if (!slip) {
      return { success: false, reservation: null, message: "Slip not found" };
    }

    if (this._hasOverlappingTransientReservation(slipId, checkIn, checkOut)) {
      return { success: false, reservation: null, message: "Slip is not available for selected dates" };
    }

    const pricing = this._calculateTransientSlipPrice(slip, checkIn, checkOut);

    const boatId = this._getOrCreateBoatFromInput({
      boatType: boatType,
      lengthFt: boatLengthFt
    });

    const reservations = this._getFromStorage("transient_reservations", []);
    const reservation = {
      id: this._generateId("transient_res"),
      slip_id: slipId,
      boat_id: boatId,
      check_in: checkIn,
      check_out: checkOut,
      nights: pricing.nights,
      nightly_rate: pricing.nightly_rate,
      total_price: pricing.total_price,
      status: "pending",
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      created_at: new Date().toISOString(),
      notes: notes || null
    };

    reservations.push(reservation);
    this._saveToStorage("transient_reservations", reservations);

    return {
      success: true,
      reservation,
      message: "Transient reservation submitted"
    };
  }

  // 6) getWinterStorageOptions
  getWinterStorageOptions(startDate, endDate, boatLengthFt, boatType) {
    const plansRaw = this._getFromStorage("winter_storage_plans", []);

    const plans = plansRaw
      .filter((p) => p.status === "active")
      .map((p) => {
        const minOk = typeof p.min_length_ft === "number" ? p.min_length_ft <= boatLengthFt : true;
        const maxOk = typeof p.max_length_ft === "number" ? p.max_length_ft >= boatLengthFt : true;
        const supported = minOk && maxOk;
        const total = supported ? this._calculateWinterStoragePrice(p, startDate, endDate, boatLengthFt) : 0;
        return {
          plan: p,
          storage_type: p.storage_type,
          boat_supported: supported,
          total_price: total,
          currency: "USD"
        };
      });

    // Compute indoor/outdoor price difference using cheapest of each if available
    const indoorPlans = plans.filter((x) => x.storage_type === "indoor" && x.boat_supported);
    const outdoorPlans = plans.filter((x) => x.storage_type === "outdoor" && x.boat_supported);

    let indoorOutdoorDiff = 0;
    if (indoorPlans.length && outdoorPlans.length) {
      const minIndoor = indoorPlans.reduce((min, p) => (p.total_price < min ? p.total_price : min), indoorPlans[0].total_price);
      const minOutdoor = outdoorPlans.reduce((min, p) => (p.total_price < min ? p.total_price : min), outdoorPlans[0].total_price);
      indoorOutdoorDiff = minIndoor - minOutdoor;
    }

    return {
      plans,
      indoor_outdoor_price_difference: indoorOutdoorDiff
    };
  }

  // 7) createWinterStorageReservation
  createWinterStorageReservation(winterStoragePlanId, startDate, endDate, boatLengthFt, boatType, contactName, contactEmail, contactPhone, notes) {
    const plans = this._getFromStorage("winter_storage_plans", []);
    const plan = plans.find((p) => p.id === winterStoragePlanId);
    if (!plan) {
      return { success: false, reservation: null, message: "Winter storage plan not found" };
    }

    const totalPrice = this._calculateWinterStoragePrice(plan, startDate, endDate, boatLengthFt);

    const boatId = this._getOrCreateBoatFromInput({
      boatType: boatType,
      lengthFt: boatLengthFt
    });

    const reservations = this._getFromStorage("winter_storage_reservations", []);
    const reservation = {
      id: this._generateId("winter_res"),
      winter_storage_plan_id: winterStoragePlanId,
      boat_id: boatId,
      start_date: startDate,
      end_date: endDate,
      total_price: totalPrice,
      status: "pending",
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      created_at: new Date().toISOString(),
      notes: notes || null
    };

    reservations.push(reservation);
    this._saveToStorage("winter_storage_reservations", reservations);

    return {
      success: true,
      reservation,
      message: "Winter storage reservation submitted"
    };
  }

  // 8) getRackStorageFilterOptions
  getRackStorageFilterOptions() {
    const options = this._getFromStorage("rack_storage_options", []);
    const prices = options.map((o) => o.monthly_price).filter((p) => typeof p === "number");
    const uniquePrices = Array.from(new Set(prices)).sort((a, b) => a - b);

    return {
      boat_types: ["personal_watercraft", "powerboat", "sailboat", "other"],
      max_price_suggestions: uniquePrices
    };
  }

  // 9) searchRackStorageOptions
  searchRackStorageOptions(boatType, isIndoor, maxMonthlyPrice, sortBy) {
    let options = this._getFromStorage("rack_storage_options", []).filter((o) => o.status === "active");

    options = options.filter((o) => {
      const supportsBoat = !Array.isArray(o.supported_boat_types) || o.supported_boat_types.includes(boatType);
      return supportsBoat;
    });

    if (typeof isIndoor === "boolean") {
      options = options.filter((o) => !!o.is_indoor === isIndoor);
    }

    if (typeof maxMonthlyPrice === "number") {
      options = options.filter((o) => typeof o.monthly_price === "number" && o.monthly_price <= maxMonthlyPrice);
    }

    if (sortBy === "price_asc") {
      options.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
    } else if (sortBy === "price_desc") {
      options.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
    }

    return options.map((o) => ({
      rack_storage_option_id: o.id,
      name: o.name,
      description: o.description || "",
      is_indoor: !!o.is_indoor,
      location: o.location || "",
      monthly_price: o.monthly_price || 0,
      currency: "USD",
      max_length_ft: o.max_length_ft || null,
      supports_selected_boat_type: !Array.isArray(o.supported_boat_types) || o.supported_boat_types.includes(boatType)
    }));
  }

  // 10) getRackStorageOptionDetail
  getRackStorageOptionDetail(rackStorageOptionId, startDate, durationMonths) {
    const option = this._findById("rack_storage_options", rackStorageOptionId);
    if (!option) {
      return {
        option: null,
        pricing: {
          start_date: startDate || null,
          end_date: null,
          duration_months: durationMonths || 0,
          monthly_price: 0,
          total_price: 0,
          currency: "USD"
        }
      };
    }

    const pricing = this._calculateRackStorageReservation(option, startDate, durationMonths);

    return {
      option,
      pricing: {
        ...pricing,
        currency: "USD"
      }
    };
  }

  // 11) createRackStorageReservation
  createRackStorageReservation(rackStorageOptionId, startDate, durationMonths, boatLengthFt, boatType, contactName, contactEmail, contactPhone, notes) {
    const option = this._findById("rack_storage_options", rackStorageOptionId);
    if (!option) {
      return { success: false, reservation: null, message: "Rack storage option not found" };
    }

    const pricing = this._calculateRackStorageReservation(option, startDate, durationMonths);

    let boatId = null;
    if (boatLengthFt || boatType) {
      boatId = this._getOrCreateBoatFromInput({
        boatType: boatType,
        lengthFt: boatLengthFt
      });
    }

    const reservations = this._getFromStorage("rack_storage_reservations", []);
    const reservation = {
      id: this._generateId("rack_res"),
      rack_storage_option_id: rackStorageOptionId,
      boat_id: boatId,
      start_date: pricing.start_date,
      end_date: pricing.end_date,
      duration_months: pricing.duration_months,
      monthly_price_at_booking: pricing.monthly_price,
      total_price: pricing.total_price,
      status: "pending",
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      created_at: new Date().toISOString(),
      notes: notes || null
    };

    reservations.push(reservation);
    this._saveToStorage("rack_storage_reservations", reservations);

    return {
      success: true,
      reservation,
      message: "Rack storage reservation submitted"
    };
  }

  // 12) getServiceCategoriesWithPackages
  getServiceCategoriesWithPackages() {
    const categories = this._getFromStorage("service_categories", []);
    const packages = this._getFromStorage("service_packages", []);

    const serviceContactRaw = localStorage.getItem("service_contact_info");
    let serviceContact = null;
    if (serviceContactRaw) {
      try {
        serviceContact = JSON.parse(serviceContactRaw);
      } catch (e) {}
    }

    return categories.map((cat) => {
      const catPackages = packages.filter((p) => p.service_category_id === cat.id && p.status === "active");
      return {
        category: cat,
        packages: catPackages,
        contact_phone: serviceContact ? serviceContact.phone || null : null,
        contact_email: serviceContact ? serviceContact.email || null : null
      };
    });
  }

  // 13) getServicePackagesForCategory
  getServicePackagesForCategory(serviceCategoryId) {
    const categories = this._getFromStorage("service_categories", []);
    const category = categories.find((c) => c.id === serviceCategoryId) || null;
    const packages = this._getFromStorage("service_packages", []).filter((p) => p.service_category_id === serviceCategoryId && p.status === "active");

    // Foreign key resolution: include category in each package
    return packages.map((p) => ({
      ...p,
      service_category: category
    }));
  }

  // 14) getServicePackageDetail
  getServicePackageDetail(servicePackageId) {
    const pkg = this._findById("service_packages", servicePackageId);
    const category = pkg ? this._findById("service_categories", pkg.service_category_id) : null;

    if (!pkg) {
      return {
        package: null,
        category: null,
        detailed_features: [],
        additional_notes: ""
      };
    }

    const detailedFeatures = Array.isArray(pkg.features) ? pkg.features : [];

    return {
      package: pkg,
      category,
      detailed_features: detailedFeatures,
      additional_notes: pkg.description || ""
    };
  }

  // 15) getServiceTimeSlots
  getServiceTimeSlots(servicePackageId, date, timeOfDay) {
    const slots = this._getFromStorage("service_time_slots", []);
    const packageObj = this._findById("service_packages", servicePackageId);
    const targetDate = this._parseDateOnly(date);

    let filtered = slots.filter((s) => s.service_package_id === servicePackageId);

    if (targetDate) {
      filtered = filtered.filter((s) => this._parseDateOnly(s.start_datetime) === targetDate);
    }

    if (timeOfDay) {
      filtered = filtered.filter((s) => s.time_of_day === timeOfDay);
    }

    const techAvail = this._getFromStorage("technician_availability", []);
    const technicians = this._getFromStorage("technicians", []);

    return filtered.map((s) => {
      const availableTechs = techAvail.filter((ta) => ta.service_time_slot_id === s.id && ta.is_available);
      const count = availableTechs.reduce((acc, ta) => {
        const tech = technicians.find((t) => t.id === ta.technician_id && t.is_active);
        return tech ? acc + 1 : acc;
      }, 0);

      return {
        time_slot: {
          ...s,
          service_package: packageObj || null
        },
        available_technicians_count: count
      };
    });
  }

  // 16) getAvailableTechniciansForTimeSlot
  getAvailableTechniciansForTimeSlot(serviceTimeSlotId) {
    const techAvail = this._getFromStorage("technician_availability", []);
    const technicians = this._getFromStorage("technicians", []);

    const availableIds = techAvail
      .filter((ta) => ta.service_time_slot_id === serviceTimeSlotId && ta.is_available)
      .map((ta) => ta.technician_id);

    const availableTechs = technicians
      .filter((t) => availableIds.includes(t.id) && t.is_active)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return availableTechs;
  }

  // 17) getAddOnServicesForPackage
  getAddOnServicesForPackage(servicePackageId, boatLengthFt) {
    const addOns = this._getFromStorage("add_on_services", []).filter((a) => a.status === "active");
    const length = boatLengthFt || 0;

    return addOns.filter((a) => {
      if (Array.isArray(a.applicable_service_package_ids) && a.applicable_service_package_ids.length > 0) {
        if (!a.applicable_service_package_ids.includes(servicePackageId)) return false;
      }

      if (a.eligibility_rule === "boat_over_30ft") {
        return length > 30;
      } else if (a.eligibility_rule === "boat_under_30ft") {
        return length < 30 && length > 0;
      }
      // "none" or unknown
      return true;
    });
  }

  // 18) bookServiceAppointment
  bookServiceAppointment(servicePackageId, serviceTimeSlotId, technicianId, boatDetails, addOnServiceIds, contactName, contactEmail, contactPhone, notes) {
    const pkg = this._findById("service_packages", servicePackageId);
    if (!pkg) {
      return { success: false, appointment: null, message: "Service package not found" };
    }

    const slot = this._findById("service_time_slots", serviceTimeSlotId);
    if (!slot) {
      return { success: false, appointment: null, message: "Service time slot not found" };
    }

    if (!slot.is_available) {
      // Slot may still be bookable if capacity > 0; check capacity
      if (typeof slot.capacity === "number" && slot.capacity <= 0) {
        return { success: false, appointment: null, message: "Service time slot is not available" };
      }
    }

    const lengthFt = boatDetails && (boatDetails.lengthFt || boatDetails.length_ft) ? (boatDetails.lengthFt || boatDetails.length_ft) : 0;
    const eligibleAddOnIds = this._validateAddOnEligibility(servicePackageId, addOnServiceIds || [], lengthFt);

    const boatId = boatDetails ? this._getOrCreateBoatFromInput(boatDetails) : null;

    const appointments = this._getFromStorage("service_appointments", []);
    const appointment = {
      id: this._generateId("svc_appt"),
      service_package_id: servicePackageId,
      service_time_slot_id: serviceTimeSlotId,
      technician_id: technicianId || null,
      boat_id: boatId,
      scheduled_start: slot.start_datetime,
      scheduled_end: slot.end_datetime || null,
      status: "pending",
      add_on_service_ids: eligibleAddOnIds,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      created_at: new Date().toISOString(),
      notes: notes || null
    };

    appointments.push(appointment);
    this._saveToStorage("service_appointments", appointments);

    // Update slot capacity and availability if we track capacity
    const slots = this._getFromStorage("service_time_slots", []);
    const slotIndex = slots.findIndex((s) => s.id === serviceTimeSlotId);
    if (slotIndex !== -1) {
      const s = slots[slotIndex];
      if (typeof s.capacity === "number" && s.capacity > 0) {
        s.capacity -= 1;
        if (s.capacity <= 0) {
          s.is_available = false;
        }
        slots[slotIndex] = s;
        this._saveToStorage("service_time_slots", slots);
      }
    }

    return {
      success: true,
      appointment,
      message: "Service appointment booked"
    };
  }

  // 19) getSeasonalSlipPlanOptions
  getSeasonalSlipPlanOptions(startDate, endDate, boatLengthFt, boatType) {
    const plans = this._getFromStorage("seasonal_slip_plans", []).filter((p) => p.status === "active");

    return plans.map((p) => {
      const minOk = typeof p.min_length_ft === "number" ? p.min_length_ft <= boatLengthFt : true;
      const maxOk = typeof p.max_length_ft === "number" ? p.max_length_ft >= boatLengthFt : true;
      const supported = minOk && maxOk;
      const price = supported ? this._calculateSeasonalSlipPrice(p, startDate, endDate, boatLengthFt) : 0;

      return {
        plan: p,
        plan_type: p.plan_type,
        max_length_ft: p.max_length_ft,
        boat_supported: supported,
        estimated_price: price,
        currency: "USD"
      };
    });
  }

  // 20) createSeasonalSlipQuoteRequest
  createSeasonalSlipQuoteRequest(seasonalSlipPlanId, startDate, endDate, boatLengthFt, boatType, contactName, contactEmail, contactPhone, notes) {
    const plan = this._findById("seasonal_slip_plans", seasonalSlipPlanId);
    if (!plan) {
      return { success: false, quote_request: null, message: "Seasonal slip plan not found" };
    }

    const estimatedPrice = this._calculateSeasonalSlipPrice(plan, startDate, endDate, boatLengthFt);

    const boatId = this._getOrCreateBoatFromInput({
      boatType: boatType,
      lengthFt: boatLengthFt
    });

    const requests = this._getFromStorage("seasonal_slip_quote_requests", []);
    const quoteRequest = {
      id: this._generateId("seasonal_quote"),
      seasonal_slip_plan_id: seasonalSlipPlanId,
      boat_id: boatId,
      start_date: startDate,
      end_date: endDate,
      estimated_price: estimatedPrice,
      status: "submitted",
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      created_at: new Date().toISOString(),
      notes: notes || null
    };

    requests.push(quoteRequest);
    this._saveToStorage("seasonal_slip_quote_requests", requests);

    return {
      success: true,
      quote_request: quoteRequest,
      message: "Seasonal slip quote request submitted"
    };
  }

  // 21) getYardServicePackages
  getYardServicePackages() {
    const packages = this._getFromStorage("service_packages", []).filter((p) => p.package_type === "yard_service" && p.status === "active");
    const categories = this._getFromStorage("service_categories", []);

    // Foreign key resolution: include category in each package
    return packages.map((p) => {
      const category = categories.find((c) => c.id === p.service_category_id) || null;
      return {
        ...p,
        service_category: category
      };
    });
  }

  // 22) getStoreCategories
  getStoreCategories() {
    const categories = this._getFromStorage("store_categories", []);
    return categories;
  }

  // 23) getStoreFilterOptions
  getStoreFilterOptions(categoryId) {
    const products = this._getFromStorage("products", []).filter((p) => p.category_id === categoryId && p.status === "active");

    const prices = products.map((p) => p.price).filter((p) => typeof p === "number");
    let priceRanges = [];

    if (prices.length) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const mid = min + (max - min) / 2;
      priceRanges = [
        { label: `Up to $${mid.toFixed(2)}`, min_price: min, max_price: mid },
        { label: `Above $${mid.toFixed(2)}`, min_price: mid, max_price: max }
      ];
    }

    const rating_thresholds = [3, 4, 4.5, 5];

    const sort_options = [
      { id: "price_asc", label: "Price: Low to High" },
      { id: "price_desc", label: "Price: High to Low" },
      { id: "rating_desc", label: "Rating: High to Low" }
    ];

    return {
      price_ranges: priceRanges,
      rating_thresholds,
      sort_options
    };
  }

  // 24) getStoreCategoryProducts
  getStoreCategoryProducts(categoryId, filters, sortBy) {
    const categories = this._getFromStorage("store_categories", []);
    const category = categories.find((c) => c.id === categoryId) || null;
    const products = this._getFromStorage("products", []);

    const effectiveFilters = filters || {};

    let filtered = products.filter((p) => p.category_id === categoryId && p.status === "active");

    if (typeof effectiveFilters.maxPrice === "number") {
      filtered = filtered.filter((p) => p.price <= effectiveFilters.maxPrice);
    }

    if (typeof effectiveFilters.minRating === "number") {
      filtered = filtered.filter((p) => typeof p.rating === "number" && p.rating >= effectiveFilters.minRating);
    }

    if (sortBy === "price_asc") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price_desc") {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating_desc") {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return filtered.map((product) => ({
      product: {
        ...product,
        category
      },
      category_name: category ? category.name : ""
    }));
  }

  // 25) getProductDetail
  getProductDetail(productId) {
    const product = this._findById("products", productId);
    if (!product) {
      return {
        product: null,
        category: null,
        images: [],
        specifications: []
      };
    }

    const category = this._findById("store_categories", product.category_id);

    const images = [];
    if (product.image_url) images.push(product.image_url);

    return {
      product: {
        ...product,
        category
      },
      category,
      images,
      specifications: Array.isArray(product.attributes) ? product.attributes : []
    };
  }

  // 26) addToCart
  addToCart(productId, quantity) {
    const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p.id === productId && p.status === "active");

    if (!product) {
      return { success: false, cart: null, items: [], message: "Product not found or not active" };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);

    let item = cartItems.find((ci) => ci.cart_id === cart.id && ci.product_id === productId);

    if (item) {
      item.quantity += qty;
      item.total_price = item.unit_price * item.quantity;
      item.added_at = item.added_at || new Date().toISOString();
    } else {
      item = {
        id: this._generateId("cart_item"),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price,
        total_price: product.price * qty,
        added_at: new Date().toISOString()
      };
      cartItems.push(item);
    }

    // Update cart updated_at
    const carts = this._getFromStorage("carts", []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].updated_at = new Date().toISOString();
      this._saveToStorage("carts", carts);
    }

    this._saveToStorage("cart_items", cartItems);

    // Return updated cart summary
    const summary = this.getCartSummary();
    return {
      success: true,
      cart: summary.cart,
      items: summary.items.map((i) => i.item),
      message: "Item added to cart"
    };
  }

  // 27) getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []).filter((ci) => ci.cart_id === cart.id);
    const products = this._getFromStorage("products", []);

    let totalItems = 0;
    let totalPrice = 0;

    const items = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      totalItems += ci.quantity;
      totalPrice += ci.total_price;

      return {
        item: {
          ...ci,
          product,
          cart
        },
        product_name: product ? product.name : "",
        product_image_url: product ? product.image_url || "" : ""
      };
    });

    return {
      cart,
      items,
      total_items: totalItems,
      total_price: totalPrice,
      currency: "USD"
    };
  }

  // 28) getClassFilterOptions
  getClassFilterOptions() {
    const sessions = this._getFromStorage("class_sessions", []);

    const weekdays = Array.from(new Set(sessions.map((s) => s.weekday))).filter(Boolean);
    const timeOfDayOptions = Array.from(new Set(sessions.map((s) => s.time_of_day))).filter(Boolean);
    const prices = sessions.map((s) => s.price).filter((p) => typeof p === "number");
    const maxPriceSuggestions = Array.from(new Set(prices)).sort((a, b) => a - b);

    return {
      course_types: ["boating_safety", "navigation", "sailing", "other"],
      weekdays,
      time_of_day_options: timeOfDayOptions,
      max_price_suggestions: maxPriceSuggestions
    };
  }

  // 29) searchClasses
  searchClasses(courseType, weekendOnly, maxPrice, timeOfDayFilter, sortBy) {
    const classes = this._getFromStorage("classes", []);
    const sessions = this._getFromStorage("class_sessions", []);

    let filteredSessions = sessions.filter((s) => true);

    if (typeof weekendOnly === "boolean" && weekendOnly) {
      filteredSessions = filteredSessions.filter((s) => s.is_weekend === true);
    }

    if (typeof maxPrice === "number") {
      filteredSessions = filteredSessions.filter((s) => typeof s.price === "number" && s.price <= maxPrice);
    }

    if (timeOfDayFilter) {
      filteredSessions = filteredSessions.filter((s) => s.time_of_day === timeOfDayFilter);
    }

    // Join with classes and filter by course type
    const results = filteredSessions
      .map((session) => {
        const cls = classes.find((c) => c.id === session.class_id);
        return { session, class: cls };
      })
      .filter((pair) => pair.class && pair.class.course_type === courseType);

    const sorted = results.slice();
    if (sortBy === "start_datetime_asc" || !sortBy) {
      sorted.sort((a, b) => new Date(a.session.start_datetime) - new Date(b.session.start_datetime));
    }

    // Store last search filters for use in getClassSessionDetail
    const lastFilters = {
      courseType,
      weekendOnly: !!weekendOnly,
      maxPrice: typeof maxPrice === "number" ? maxPrice : null,
      timeOfDayFilter: timeOfDayFilter || null
    };
    localStorage.setItem("last_class_search_filters", JSON.stringify(lastFilters));

    return sorted;
  }

  // 30) getClassSessionDetail
  getClassSessionDetail(classSessionId) {
    const session = this._findById("class_sessions", classSessionId);
    const cls = session ? this._findById("classes", session.class_id) : null;

    let priceUnderSelectedMax = true;

    const filtersRaw = localStorage.getItem("last_class_search_filters");
    if (filtersRaw) {
      try {
        const filters = JSON.parse(filtersRaw);
        if (filters && typeof filters.maxPrice === "number" && session) {
          priceUnderSelectedMax = typeof session.price === "number" ? session.price <= filters.maxPrice : true;
        }
      } catch (e) {}
    }

    return {
      session,
      class: cls,
      meets_filters_summary: {
        is_weekend: session ? !!session.is_weekend : false,
        time_of_day: session ? session.time_of_day || "" : "",
        price_under_selected_max: priceUnderSelectedMax
      }
    };
  }

  // 31) registerForClassSession
  registerForClassSession(classSessionId, attendeeName, attendeeEmail, attendeePhone, notes) {
    const session = this._findById("class_sessions", classSessionId);
    if (!session) {
      return { success: false, registration: null, message: "Class session not found" };
    }

    // Capacity handling
    if (typeof session.seats_available === "number" && session.seats_available <= 0) {
      return { success: false, registration: null, message: "Class session is full" };
    }

    const registrations = this._getFromStorage("class_registrations", []);
    const registration = {
      id: this._generateId("class_reg"),
      class_session_id: classSessionId,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      attendee_phone: attendeePhone || null,
      status: "pending",
      created_at: new Date().toISOString(),
      notes: notes || null
    };

    registrations.push(registration);
    this._saveToStorage("class_registrations", registrations);

    // Decrement seats_available if present
    const sessions = this._getFromStorage("class_sessions", []);
    const idx = sessions.findIndex((s) => s.id === classSessionId);
    if (idx !== -1 && typeof sessions[idx].seats_available === "number") {
      sessions[idx].seats_available = Math.max(0, sessions[idx].seats_available - 1);
      this._saveToStorage("class_sessions", sessions);
    }

    return {
      success: true,
      registration,
      message: "Class registration submitted"
    };
  }

  // 32) getAmenitiesOverview
  getAmenitiesOverview() {
    const amenities = this._getFromStorage("amenities", []);
    const hours = this._getFromStorage("operating_hours", []);

    return amenities.map((a) => {
      const amenityHours = hours.filter((h) => h.amenity_id === a.id && !h.is_closed);
      let sampleHours = "";
      if (amenityHours.length) {
        const h = amenityHours[0];
        sampleHours = `${h.day_of_week}: ${h.open_time || ""} - ${h.close_time || ""}`;
      }

      return {
        amenity: a,
        short_description: a.description || "",
        has_detail_page: !!a.detail_page_url,
        sample_hours: sampleHours
      };
    });
  }

  // 33) getFuelDockDetail
  getFuelDockDetail() {
    const amenities = this._getFromStorage("amenities", []);
    const fuelAmenity = amenities.find((a) => a.amenity_type === "fuel_dock" && a.is_active) || null;

    let fuelInfo = null;
    const fuelDockInfos = this._getFromStorage("fuel_dock_info", []);
    if (fuelAmenity) {
      fuelInfo = fuelDockInfos.find((f) => f.amenity_id === fuelAmenity.id) || null;
    }

    const hours = this._getFromStorage("operating_hours", []);
    let operatingHours = [];
    if (fuelAmenity) {
      operatingHours = hours
        .filter((h) => h.amenity_id === fuelAmenity.id)
        .map((h) => ({
          ...h,
          amenity: fuelAmenity
        }));
    }

    return {
      amenity: fuelAmenity,
      fuel_dock_info: fuelInfo,
      operating_hours: operatingHours
    };
  }

  // 34) getContactPageInfo
  getContactPageInfo() {
    const raw = localStorage.getItem("contact_page_info");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      phone: "",
      email: "",
      address: "",
      map_embed_url: "",
      office_hours: ""
    };
  }

  // 35) submitContactMessage
  submitContactMessage(name, email, phone, subject, message, relatedPage) {
    const messages = this._getFromStorage("contact_messages", []);

    const contactMessage = {
      id: this._generateId("contact_msg"),
      name,
      email,
      phone: phone || null,
      subject: subject || null,
      message,
      related_page: relatedPage || null,
      created_at: new Date().toISOString(),
      status: "new"
    };

    messages.push(contactMessage);
    this._saveToStorage("contact_messages", messages);

    return {
      success: true,
      contact_message: contactMessage,
      message: "Contact message submitted"
    };
  }

  // 36) getAboutPageContent
  getAboutPageContent() {
    const raw = localStorage.getItem("about_page_content");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }
    return {
      history: "",
      mission: "",
      values: [],
      staff: [],
      office_hours: "",
      location_context: ""
    };
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