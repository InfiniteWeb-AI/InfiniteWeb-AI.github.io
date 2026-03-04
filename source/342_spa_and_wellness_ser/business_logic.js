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

    // Core data tables based on storage_key values in the data model
    ensureArrayKey("service_categories");
    ensureArrayKey("branches");
    ensureArrayKey("services");
    ensureArrayKey("service_options");
    ensureArrayKey("time_slots");
    ensureArrayKey("gift_card_designs");
    ensureArrayKey("gift_card_purchases");
    ensureArrayKey("promo_codes");
    ensureArrayKey("cart");
    ensureArrayKey("cart_items");
    ensureArrayKey("service_bookings");
    ensureArrayKey("wishlist_items");
    ensureArrayKey("custom_packages");
    ensureArrayKey("custom_package_items");
    ensureArrayKey("checkout_info");

    // Content / auxiliary tables
    ensureArrayKey("quick_links");
    ensureObjectKey("about_info");
    ensureObjectKey("contact_info");
    ensureArrayKey("faq_entries");
    ensureArrayKey("policy_documents");
    ensureArrayKey("contact_form_submissions");

    // Legacy/example tables from template (kept for compatibility, unused)
    ensureArrayKey("users");
    ensureArrayKey("products");
    ensureArrayKey("carts");
    ensureArrayKey("cartItems");

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  // ------------------------
  // Internal helpers
  // ------------------------

  // Retrieve the current cart or create a new one (single-user agent)
  _getOrCreateCart() {
    const carts = this._getFromStorage("cart");
    let currentCartId = localStorage.getItem("current_cart_id");
    let cart = null;

    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId) || null;
    }

    if (!cart && carts.length > 0) {
      cart = carts[0];
      localStorage.setItem("current_cart_id", cart.id);
    }

    if (!cart) {
      const newCart = {
        id: this._generateId("cart"),
        subtotal: 0,
        tax: 0,
        total: 0,
        created_at: new Date().toISOString(),
        updated_at: null
      };
      carts.push(newCart);
      this._saveToStorage("cart", carts);
      localStorage.setItem("current_cart_id", newCart.id);
      cart = newCart;
    }

    return cart;
  }

  // Recalculate cart totals whenever items change
  _recalculateCartTotals(cartId) {
    const carts = this._getFromStorage("cart");
    const cartItems = this._getFromStorage("cart_items");

    const cart = carts.find((c) => c.id === cartId);
    if (!cart) return null;

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cartId);
    const subtotal = itemsForCart.reduce((sum, item) => sum + (item.total_price || 0), 0);

    const taxRate = 0; // No tax logic specified; keep at 0
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    cart.subtotal = subtotal;
    cart.tax = tax;
    cart.total = total;
    cart.updated_at = new Date().toISOString();

    this._saveToStorage("cart", carts);
    return cart;
  }

  _getCartItemCount(cartId) {
    const cartItems = this._getFromStorage("cart_items");
    return cartItems.filter((ci) => ci.cart_id === cartId).length;
  }

  // Resolve branch marked as default nearest location
  _getDefaultNearestBranch() {
    const branches = this._getFromStorage("branches");
    return branches.find((b) => b.is_default_nearest_location) || null;
  }

  // Custom package helpers
  _getOrCreateCustomPackage() {
    const packages = this._getFromStorage("custom_packages");
    let currentId = localStorage.getItem("current_custom_package_id");
    let pkg = null;

    if (currentId) {
      pkg = packages.find((p) => p.id === currentId) || null;
    }

    if (!pkg && packages.length > 0) {
      pkg = packages[0];
      localStorage.setItem("current_custom_package_id", pkg.id);
    }

    if (!pkg) {
      const newPkg = {
        id: this._generateId("custompkg"),
        name: "",
        description: "",
        target_max_price: null,
        total_price: 0,
        is_valid: false,
        created_at: new Date().toISOString(),
        updated_at: null
      };
      packages.push(newPkg);
      this._saveToStorage("custom_packages", packages);
      localStorage.setItem("current_custom_package_id", newPkg.id);
      pkg = newPkg;
    }

    return pkg;
  }

  _validateCustomPackage(customPackage) {
    const packages = this._getFromStorage("custom_packages");
    const items = this._getFromStorage("custom_package_items").filter(
      (i) => i.custom_package_id === customPackage.id
    );

    const totalPrice = items.reduce((sum, i) => sum + (i.price || 0), 0);
    const roles = items.map((i) => i.category_role);
    const uniqueRoles = Array.from(new Set(roles));
    const requiredRoles = ["skincare", "massage", "body_treatment"];

    const hasAllRoles =
      uniqueRoles.length === requiredRoles.length &&
      requiredRoles.every((r) => uniqueRoles.includes(r));

    const underBudget =
      customPackage.target_max_price == null ||
      totalPrice <= customPackage.target_max_price;

    customPackage.total_price = totalPrice;
    customPackage.is_valid = hasAllRoles && items.length === 3 && underBudget;
    customPackage.updated_at = new Date().toISOString();

    const idx = packages.findIndex((p) => p.id === customPackage.id);
    if (idx !== -1) {
      packages[idx] = customPackage;
      this._saveToStorage("custom_packages", packages);
    }

    const missingRoles = requiredRoles.filter((r) => !uniqueRoles.includes(r));
    return { customPackage, missingRoles };
  }

  // Promo code application helper
  _applyPromoCodeIfValid(service, bookingType, baseTotal, promoCodeString) {
    if (!promoCodeString) return { promoCodeId: null, promoCode: null, discountAmount: 0 };

    const promos = this._getFromStorage("promo_codes");
    const now = new Date();
    const promo = promos.find((p) => {
      if (!p.is_active) return false;
      if (p.code.toLowerCase() !== promoCodeString.toLowerCase()) return false;

      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_to && new Date(p.valid_to) < now) return false;

      if (p.min_spend != null && baseTotal < p.min_spend) return false;

      // Check category applicability
      if (p.applicable_category_ids && p.applicable_category_ids.length > 0) {
        if (!service || !p.applicable_category_ids.includes(service.category_id)) {
          return false;
        }
      }

      // Check specific service applicability
      if (p.applicable_service_ids && p.applicable_service_ids.length > 0) {
        if (!service || !p.applicable_service_ids.includes(service.id)) {
          return false;
        }
      }

      return true;
    });

    if (!promo) {
      return { promoCodeId: null, promoCode: promoCodeString, discountAmount: 0 };
    }

    let discount = 0;
    if (promo.discount_type === "percent") {
      discount = (baseTotal * promo.discount_value) / 100;
    } else if (promo.discount_type === "fixed_amount") {
      discount = promo.discount_value;
    }

    // Ensure discount does not exceed baseTotal
    if (discount > baseTotal) discount = baseTotal;

    return {
      promoCodeId: promo.id,
      promoCode: promo.code,
      discountAmount: discount
    };
  }

  // Time slot availability helper
  _checkTimeSlotAvailability(timeSlotId, quantity) {
    const timeSlots = this._getFromStorage("time_slots");
    const idx = timeSlots.findIndex((ts) => ts.id === timeSlotId);
    if (idx === -1) {
      return { ok: false, timeSlot: null };
    }

    const slot = timeSlots[idx];
    const q = quantity || 1;

    if (!slot.is_available) {
      return { ok: false, timeSlot: slot };
    }

    const capacity = slot.capacity != null ? slot.capacity : null;
    const booked = slot.spots_booked != null ? slot.spots_booked : 0;

    if (capacity != null && booked + q > capacity) {
      return { ok: false, timeSlot: slot };
    }

    slot.spots_booked = booked + q;
    if (capacity != null) {
      slot.is_available = slot.spots_booked < capacity;
    } else {
      slot.is_available = true;
    }

    timeSlots[idx] = slot;
    this._saveToStorage("time_slots", timeSlots);

    return { ok: true, timeSlot: slot };
  }

  _getServiceById(serviceId) {
    const services = this._getFromStorage("services");
    return services.find((s) => s.id === serviceId) || null;
  }

  _getCategoryByCode(code) {
    const categories = this._getFromStorage("service_categories");
    return categories.find((c) => c.code === code) || null;
  }

  _getBranchById(branchId) {
    const branches = this._getFromStorage("branches");
    return branches.find((b) => b.id === branchId) || null;
  }

  _getServiceOptionById(optionId) {
    const options = this._getFromStorage("service_options");
    return options.find((o) => o.id === optionId) || null;
  }

  _datePart(isoString) {
    if (!isoString) return null;
    return isoString.slice(0, 10); // yyyy-mm-dd
  }

  _timeToMinutes(hhmm) {
    if (!hhmm) return null;
    const [h, m] = hhmm.split(":").map((v) => parseInt(v, 10));
    return h * 60 + m;
  }

  _minutesOfDayFromISO(isoString) {
    const d = new Date(isoString);
    return d.getHours() * 60 + d.getMinutes();
  }

  _getServiceMinMaxPrice(service, allOptions) {
    let min = service.min_price != null ? service.min_price : null;
    let max = service.max_price != null ? service.max_price : null;

    const options = allOptions.filter((o) => o.service_id === service.id);
    if (options.length > 0) {
      const prices = options.map((o) => o.price || 0);
      const optMin = Math.min.apply(null, prices);
      const optMax = Math.max.apply(null, prices);
      if (min == null || optMin < min) min = optMin;
      if (max == null || optMax > max) max = optMax;
    }

    if (min == null && service.base_price != null) min = service.base_price;
    if (max == null && service.base_price != null) max = service.base_price;

    return { min, max };
  }

  _getServiceDefaultDuration(service, allOptions) {
    if (service.default_duration_minutes != null) return service.default_duration_minutes;
    const options = allOptions.filter((o) => o.service_id === service.id && o.duration_minutes != null);
    if (options.length === 0) return null;
    return options[0].duration_minutes;
  }

  _findNextAvailableSlotForService(service, filters) {
    const options = this._getFromStorage("service_options").filter(
      (o) => o.service_id === service.id
    );
    const timeSlots = this._getFromStorage("time_slots");
    const branches = this._getFromStorage("branches");

    const dateFilter = filters && filters.date ? filters.date : null;
    const timeStart = filters && filters.timeRangeStart ? this._timeToMinutes(filters.timeRangeStart) : null;
    const timeEnd = filters && filters.timeRangeEnd ? this._timeToMinutes(filters.timeRangeEnd) : null;
    const branchIdFilter = filters && filters.branchId ? filters.branchId : null;

    let candidates = timeSlots.filter((ts) => ts.is_available);

    const optionIds = options.map((o) => o.id);
    candidates = candidates.filter((ts) => optionIds.includes(ts.service_option_id));

    if (branchIdFilter) {
      candidates = candidates.filter((ts) => ts.branch_id === branchIdFilter);
    }

    if (dateFilter) {
      candidates = candidates.filter((ts) => this._datePart(ts.start_datetime) === dateFilter);
    }

    if (timeStart != null) {
      candidates = candidates.filter(
        (ts) => this._minutesOfDayFromISO(ts.start_datetime) >= timeStart
      );
    }
    if (timeEnd != null) {
      candidates = candidates.filter(
        (ts) => this._minutesOfDayFromISO(ts.start_datetime) <= timeEnd
      );
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    const slot = candidates[0];
    const option = options.find((o) => o.id === slot.service_option_id) || null;
    const branch = branches.find((b) => b.id === slot.branch_id) || null;

    return {
      time_slot_id: slot.id,
      service_option_id: slot.service_option_id,
      option_name: option ? option.name : null,
      branch_id: slot.branch_id,
      branch_name: branch ? branch.name : null,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      price: option ? option.price : null,
      is_available: slot.is_available,
      // Foreign key resolution for frontend convenience
      time_slot: slot,
      service_option: option,
      branch: branch
    };
  }

  // ------------------------
  // Core interface implementations
  // ------------------------

  // 1) getServiceCategoriesForNavigation
  getServiceCategoriesForNavigation() {
    const categories = this._getFromStorage("service_categories");
    const result = categories
      .filter((c) => c.is_bookable)
      .sort((a, b) => {
        const ao = a.display_order != null ? a.display_order : 0;
        const bo = b.display_order != null ? b.display_order : 0;
        if (ao !== bo) return ao - bo;
        return (a.name || "").localeCompare(b.name || "");
      });
    return result;
  }

  // 2) getHomepageFeaturedSections
  getHomepageFeaturedSections() {
    const categories = this._getFromStorage("service_categories");
    const services = this._getFromStorage("services");
    const customPackage = this._getOrCreateCustomPackage();
    const { customPackage: validatedPkg, missingRoles } = this._validateCustomPackage(
      customPackage
    );
    const quickLinks = this._getFromStorage("quick_links", []);

    const featured_categories = categories
      .filter((c) => c.is_bookable)
      .sort((a, b) => {
        const ao = a.display_order != null ? a.display_order : 0;
        const bo = b.display_order != null ? b.display_order : 0;
        if (ao !== bo) return ao - bo;
        return (a.name || "").localeCompare(b.name || "");
      });

    const featured_services = services
      .filter((s) => s.is_active)
      .slice(0, 10)
      .map((s) => {
        const cat = categories.find((c) => c.code === s.category_id) || null;
        return {
          service_id: s.id,
          service_name: s.name,
          category_code: s.category_id,
          category_name: cat ? cat.name : null,
          subtitle: s.subtitle || "",
          short_description: s.description || "",
          min_price: s.min_price != null ? s.min_price : s.base_price || null,
          max_price: s.max_price != null ? s.max_price : s.base_price || null,
          default_duration_minutes: s.default_duration_minutes || null,
          rating: s.rating != null ? s.rating : null,
          rating_count: s.rating_count != null ? s.rating_count : 0,
          image_url: s.image_url || null,
          is_package: !!s.is_package,
          is_membership: !!s.is_membership,
          // Foreign key resolution
          service: s,
          category: cat
        };
      });

    const custom_package_status = {
      has_active_package: !!validatedPkg,
      target_max_price: validatedPkg.target_max_price,
      total_price: validatedPkg.total_price,
      is_valid: validatedPkg.is_valid,
      missing_roles: missingRoles
    };

    return {
      featured_categories,
      featured_services,
      custom_package_status,
      quick_links: quickLinks
    };
  }

  // 3) getServiceFilterOptions(categoryCode)
  getServiceFilterOptions(categoryCode) {
    const services = this._getFromStorage("services").filter(
      (s) => s.category_id === categoryCode && s.is_active
    );
    const options = this._getFromStorage("service_options");
    const branches = this._getFromStorage("branches");

    let minPrice = null;
    let maxPrice = null;
    let minDuration = null;
    let maxDuration = null;

    services.forEach((s) => {
      const { min, max } = this._getServiceMinMaxPrice(s, options);
      if (min != null) {
        if (minPrice == null || min < minPrice) minPrice = min;
      }
      if (max != null) {
        if (maxPrice == null || max > maxPrice) maxPrice = max;
      }

      const d = this._getServiceDefaultDuration(s, options);
      if (d != null) {
        if (minDuration == null || d < minDuration) minDuration = d;
        if (maxDuration == null || d > maxDuration) maxDuration = d;
      }
    });

    const price = {
      min: minPrice != null ? minPrice : 0,
      max: maxPrice != null ? maxPrice : 0,
      currency: "USD"
    };

    const duration_minutes = {
      min: minDuration != null ? minDuration : 0,
      max: maxDuration != null ? maxDuration : 0,
      step: 15,
      common_values: [30, 45, 60, 90]
    };

    const rating_thresholds = [3, 3.5, 4, 4.5, 5];

    const allTags = new Set();
    services.forEach((s) => {
      if (Array.isArray(s.tags)) {
        s.tags.forEach((t) => allTags.add(t));
      }
    });

    const treatment_tags = Array.from(allTags);

    const categoryBranches = branches.filter((b) => {
      if (!Array.isArray(b.supported_category_codes) || b.supported_category_codes.length === 0) {
        return true; // if not specified, assume it supports all
      }
      return b.supported_category_codes.includes(categoryCode);
    });

    const sort_options = [
      { code: "relevance", label: "Relevance" },
      { code: "price_low_to_high", label: "Price: Low to High" },
      { code: "price_high_to_low", label: "Price: High to Low" },
      { code: "rating_high_to_low", label: "Rating: High to Low" },
      { code: "next_available", label: "Next Available" }
    ];

    return {
      price,
      duration_minutes,
      rating_thresholds,
      treatment_tags,
      branches: categoryBranches
    ,
      sort_options
    };
  }

  // 4) listServicesForCategory
  listServicesForCategory(categoryCode, filters = {}, sortBy = "relevance", page = 1, pageSize = 20) {
    const services = this._getFromStorage("services").filter(
      (s) => s.category_id === categoryCode && s.is_active
    );
    const categories = this._getFromStorage("service_categories");
    const options = this._getFromStorage("service_options");
    const branches = this._getFromStorage("branches");

    let filtered = services.slice();

    const query = filters.query ? String(filters.query).toLowerCase() : null;
    if (query) {
      filtered = filtered.filter((s) => {
        const text = (
          (s.name || "") + " " + (s.subtitle || "") + " " + (s.description || "")
        ).toLowerCase();
        const tags = Array.isArray(s.tags) ? s.tags.join(" ").toLowerCase() : "";
        return text.includes(query) || tags.includes(query);
      });
    }

    if (filters.treatmentTags && filters.treatmentTags.length > 0) {
      const tagsSet = new Set(filters.treatmentTags.map((t) => String(t).toLowerCase()));
      filtered = filtered.filter((s) => {
        if (!Array.isArray(s.tags)) return false;
        const lower = s.tags.map((t) => String(t).toLowerCase());
        return lower.some((t) => tagsSet.has(t));
      });
    }

    if (filters.isCouplesOnly) {
      filtered = filtered.filter((s) => !!s.is_couples);
    }
    if (filters.isMembershipOnly) {
      filtered = filtered.filter((s) => !!s.is_membership);
    }
    if (filters.isPackageOnly) {
      filtered = filtered.filter((s) => !!s.is_package);
    }

    // Branch filter
    if (filters.branchId) {
      filtered = filtered.filter((s) => {
        if (!Array.isArray(s.available_branch_ids) || s.available_branch_ids.length === 0) {
          return true; // assume global if not specified
        }
        return s.available_branch_ids.includes(filters.branchId);
      });
    }

    // Price filters
    if (
      filters.minPrice != null ||
      filters.maxPrice != null
    ) {
      filtered = filtered.filter((s) => {
        const { min, max } = this._getServiceMinMaxPrice(s, options);
        if (filters.minPrice != null && (min == null || max == null || max < filters.minPrice)) {
          return false;
        }
        if (filters.maxPrice != null && (min == null || min > filters.maxPrice)) {
          return false;
        }
        return true;
      });
    }

    // Duration filters
    if (filters.exactDurationMinutes != null) {
      const exact = filters.exactDurationMinutes;
      filtered = filtered.filter((s) => {
        const d = this._getServiceDefaultDuration(s, options);
        return d === exact;
      });
    } else {
      if (filters.minDurationMinutes != null) {
        const minD = filters.minDurationMinutes;
        filtered = filtered.filter((s) => {
          const d = this._getServiceDefaultDuration(s, options);
          return d == null || d >= minD;
        });
      }
      if (filters.maxDurationMinutes != null) {
        const maxD = filters.maxDurationMinutes;
        filtered = filtered.filter((s) => {
          const d = this._getServiceDefaultDuration(s, options);
          return d == null || d <= maxD;
        });
      }
    }

    // Rating filter
    if (filters.minRating != null) {
      filtered = filtered.filter((s) => {
        if (s.rating == null) return false;
        return s.rating >= filters.minRating;
      });
    }

    // Availability filter
    let availabilityFilters = null;
    if (filters.requireAvailability || filters.date || filters.timeRangeStart || filters.timeRangeEnd) {
      availabilityFilters = {
        date: filters.date || null,
        timeRangeStart: filters.timeRangeStart || null,
        timeRangeEnd: filters.timeRangeEnd || null,
        branchId: filters.branchId || null
      };

      filtered = filtered.filter((s) => {
        const slot = this._findNextAvailableSlotForService(s, availabilityFilters);
        return !!slot;
      });
    }

    // Sorting
    const optionsCache = options; // alias

    const priceOf = (s) => {
      const { min } = this._getServiceMinMaxPrice(s, optionsCache);
      return min != null ? min : Number.MAX_VALUE;
    };

    const nextSlotOf = (s) => {
      return this._findNextAvailableSlotForService(s, availabilityFilters || {});
    };

    if (sortBy === "price_low_to_high") {
      filtered.sort((a, b) => priceOf(a) - priceOf(b));
    } else if (sortBy === "price_high_to_low") {
      filtered.sort((a, b) => priceOf(b) - priceOf(a));
    } else if (sortBy === "rating_high_to_low") {
      filtered.sort((a, b) => {
        const ar = a.rating != null ? a.rating : 0;
        const br = b.rating != null ? b.rating : 0;
        if (br !== ar) return br - ar;
        return priceOf(a) - priceOf(b);
      });
    } else if (sortBy === "next_available") {
      filtered.sort((a, b) => {
        const as = nextSlotOf(a);
        const bs = nextSlotOf(b);
        if (!as && !bs) return 0;
        if (!as) return 1;
        if (!bs) return -1;
        return new Date(as.start_datetime) - new Date(bs.start_datetime);
      });
    }

    const totalItems = filtered.length;
    const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 1;
    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const itemsPage = pageSize > 0 ? filtered.slice(startIdx, endIdx) : filtered;

    const resultItems = itemsPage.map((s) => {
      const cat = categories.find((c) => c.code === s.category_id) || null;
      const { min, max } = this._getServiceMinMaxPrice(s, optionsCache);
      const defaultDuration = this._getServiceDefaultDuration(s, optionsCache);

      // available_branches summary
      const availableBranches = Array.isArray(s.available_branch_ids) && s.available_branch_ids.length > 0
        ? branches
            .filter((b) => s.available_branch_ids.includes(b.id))
            .map((b) => ({
              branch_id: b.id,
              branch_name: b.name,
              city: b.city || null,
              branch: b
            }))
        : branches
            .filter((b) => {
              if (!Array.isArray(b.supported_category_codes) || b.supported_category_codes.length === 0) {
                return true;
              }
              return b.supported_category_codes.includes(s.category_id);
            })
            .map((b) => ({
              branch_id: b.id,
              branch_name: b.name,
              city: b.city || null,
              branch: b
            }));

      const nextSlot = this._findNextAvailableSlotForService(s, availabilityFilters || {});

      return {
        service_id: s.id,
        service_name: s.name,
        category_code: s.category_id,
        category_name: cat ? cat.name : null,
        subtitle: s.subtitle || "",
        short_description: s.description || "",
        base_price: s.base_price != null ? s.base_price : null,
        min_price: min,
        max_price: max,
        default_duration_minutes: defaultDuration,
        rating: s.rating != null ? s.rating : null,
        rating_count: s.rating_count != null ? s.rating_count : 0,
        included_addons: Array.isArray(s.included_addons) ? s.included_addons : [],
        tags: Array.isArray(s.tags) ? s.tags : [],
        is_couples: !!s.is_couples,
        is_membership: !!s.is_membership,
        is_package: !!s.is_package,
        is_giftable: !!s.is_giftable,
        available_branches: availableBranches,
        next_available_slot: nextSlot,
        // Foreign key resolution
        service: s,
        category: cat
      };
    });

    return {
      items: resultItems,
      page,
      pageSize,
      totalItems,
      totalPages
    };
  }

  // 5) searchServices
  searchServices(query = "", categoryCode = null, branchId = null, date = null) {
    const services = this._getFromStorage("services").filter((s) => s.is_active);
    const categories = this._getFromStorage("service_categories");

    let filtered = services.slice();

    const q = query ? String(query).toLowerCase() : null;
    if (q) {
      filtered = filtered.filter((s) => {
        const text = (
          (s.name || "") + " " + (s.subtitle || "") + " " + (s.description || "")
        ).toLowerCase();
        const tags = Array.isArray(s.tags) ? s.tags.join(" ").toLowerCase() : "";
        return text.includes(q) || tags.includes(q);
      });
    }

    if (categoryCode) {
      filtered = filtered.filter((s) => s.category_id === categoryCode);
    }

    if (branchId) {
      filtered = filtered.filter((s) => {
        if (!Array.isArray(s.available_branch_ids) || s.available_branch_ids.length === 0) {
          return true;
        }
        return s.available_branch_ids.includes(branchId);
      });
    }

    const filters = {
      date: date || null,
      branchId: branchId || null,
      timeRangeStart: null,
      timeRangeEnd: null
    };

    const items = filtered.map((s) => {
      const cat = categories.find((c) => c.code === s.category_id) || null;
      const nextSlot = this._findNextAvailableSlotForService(s, filters);
      const min_price =
        s.min_price != null
          ? s.min_price
          : s.base_price != null
          ? s.base_price
          : null;
      return {
        service_id: s.id,
        service_name: s.name,
        category_code: s.category_id,
        category_name: cat ? cat.name : null,
        short_description: s.description || "",
        min_price,
        default_duration_minutes: s.default_duration_minutes || null,
        rating: s.rating != null ? s.rating : null,
        next_available_slot: nextSlot
        ,
        // Foreign key resolution
        service: s,
        category: cat
      };
    });

    return { items };
  }

  // 6) getServiceDetails
  getServiceDetails(serviceId) {
    const services = this._getFromStorage("services");
    const service = services.find((s) => s.id === serviceId) || null;

    if (!service) {
      return {
        service: null,
        options: []
      };
    }

    const categories = this._getFromStorage("service_categories");
    const optionsAll = this._getFromStorage("service_options");
    const branches = this._getFromStorage("branches");

    const cat = categories.find((c) => c.code === service.category_id) || null;

    const availableBranches = Array.isArray(service.available_branch_ids) &&
      service.available_branch_ids.length > 0
      ? branches.filter((b) => service.available_branch_ids.includes(b.id))
      : branches.filter((b) => {
          if (
            !Array.isArray(b.supported_category_codes) ||
            b.supported_category_codes.length === 0
          ) {
            return true;
          }
          return b.supported_category_codes.includes(service.category_id);
        });

    const serviceObj = {
      id: service.id,
      name: service.name,
      category_code: service.category_id,
      category_name: cat ? cat.name : null,
      subtitle: service.subtitle || "",
      description: service.description || "",
      base_price: service.base_price != null ? service.base_price : null,
      min_price: service.min_price != null ? service.min_price : null,
      max_price: service.max_price != null ? service.max_price : null,
      default_duration_minutes:
        service.default_duration_minutes != null ? service.default_duration_minutes : null,
      rating: service.rating != null ? service.rating : null,
      rating_count: service.rating_count != null ? service.rating_count : 0,
      included_addons: Array.isArray(service.included_addons)
        ? service.included_addons
        : [],
      tags: Array.isArray(service.tags) ? service.tags : [],
      is_couples: !!service.is_couples,
      is_membership: !!service.is_membership,
      is_package: !!service.is_package,
      is_giftable: !!service.is_giftable,
      min_participants: service.min_participants != null ? service.min_participants : null,
      max_participants: service.max_participants != null ? service.max_participants : null,
      image_url: service.image_url || null,
      available_branches: availableBranches
    };

    const options = optionsAll
      .filter((o) => o.service_id === service.id)
      .map((o) => ({
        service_option_id: o.id,
        name: o.name || "",
        duration_minutes: o.duration_minutes != null ? o.duration_minutes : null,
        price: o.price,
        is_default: !!o.is_default,
        membership_duration_days:
          o.membership_duration_days != null ? o.membership_duration_days : null,
        included_class_count:
          o.included_class_count != null ? o.included_class_count : null,
        membership_activity: o.membership_activity || null,
        event_start_datetime: o.event_start_datetime || null,
        event_end_datetime: o.event_end_datetime || null,
        is_in_person: !!o.is_in_person
      }));

    return {
      service: serviceObj,
      options
    };
  }

  // 7) getServiceAvailability
  getServiceAvailability(
    serviceId,
    serviceOptionId = null,
    branchId = null,
    date = null,
    dateRangeStart = null,
    dateRangeEnd = null,
    timeRangeStart = null,
    timeRangeEnd = null
  ) {
    const serviceOptions = this._getFromStorage("service_options").filter(
      (o) => o.service_id === serviceId
    );
    const timeSlots = this._getFromStorage("time_slots");
    const branches = this._getFromStorage("branches");

    let optionIds = serviceOptions.map((o) => o.id);
    if (serviceOptionId) {
      optionIds = optionIds.filter((id) => id === serviceOptionId);
    }

    let slots = timeSlots.filter((ts) => optionIds.includes(ts.service_option_id) && ts.is_available);

    if (branchId) {
      slots = slots.filter((ts) => ts.branch_id === branchId);
    }

    const dateStart = dateRangeStart || date;
    const dateEnd = dateRangeEnd || date;

    if (dateStart) {
      const ds = dateStart;
      const de = dateEnd || dateStart;
      slots = slots.filter((ts) => {
        const d = this._datePart(ts.start_datetime);
        return d >= ds && d <= de;
      });
    }

    const tStart = timeRangeStart ? this._timeToMinutes(timeRangeStart) : null;
    const tEnd = timeRangeEnd ? this._timeToMinutes(timeRangeEnd) : null;

    if (tStart != null) {
      slots = slots.filter((ts) => this._minutesOfDayFromISO(ts.start_datetime) >= tStart);
    }
    if (tEnd != null) {
      slots = slots.filter((ts) => this._minutesOfDayFromISO(ts.start_datetime) <= tEnd);
    }

    const result = slots
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .map((ts) => {
        const option = serviceOptions.find((o) => o.id === ts.service_option_id) || null;
        const branch = branches.find((b) => b.id === ts.branch_id) || null;
        return {
          time_slot_id: ts.id,
          service_option_id: ts.service_option_id,
          branch_id: ts.branch_id,
          branch_name: branch ? branch.name : null,
          start_datetime: ts.start_datetime,
          end_datetime: ts.end_datetime,
          capacity: ts.capacity != null ? ts.capacity : null,
          spots_booked: ts.spots_booked != null ? ts.spots_booked : 0,
          is_available: ts.is_available,
          price: option ? option.price : null,
          // Foreign key resolution
          time_slot: ts,
          service_option: option,
          branch: branch
        };
      });

    return result;
  }

  // 8) addServiceBookingToCart
  addServiceBookingToCart(
    serviceId,
    serviceOptionId = null,
    branchId = null,
    timeSlotId = null,
    startDatetime = null,
    endDatetime = null,
    numGuests = null,
    numParticipants = null,
    specialNotes = "",
    membershipStartDate = null,
    promoCode = null
  ) {
    const services = this._getFromStorage("services");
    const serviceOptions = this._getFromStorage("service_options");
    const branches = this._getFromStorage("branches");
    const timeSlots = this._getFromStorage("time_slots");
    const serviceBookings = this._getFromStorage("service_bookings");
    const cartItems = this._getFromStorage("cart_items");

    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      return {
        success: false,
        message: "Service not found",
        booking: null,
        cart: null
      };
    }

    let option = null;
    if (serviceOptionId) {
      option = serviceOptions.find((o) => o.id === serviceOptionId && o.service_id === serviceId) || null;
    } else {
      // Pick default or first option if exists
      option =
        serviceOptions.find((o) => o.service_id === serviceId && o.is_default) ||
        serviceOptions.find((o) => o.service_id === serviceId) ||
        null;
    }

    if (!option && serviceOptions.some((o) => o.service_id === serviceId)) {
      return {
        success: false,
        message: "Service option not found",
        booking: null,
        cart: null
      };
    }

    let branch = null;
    if (branchId) {
      branch = branches.find((b) => b.id === branchId) || null;
    } else {
      branch = this._getDefaultNearestBranch();
    }

    if (!branch && service.category_id !== "classes_events" && !service.is_membership) {
      return {
        success: false,
        message: "Branch not specified and nearest branch not available",
        booking: null,
        cart: null
      };
    }

    let slot = null;
    if (timeSlotId) {
      slot = timeSlots.find((ts) => ts.id === timeSlotId) || null;
      if (!slot) {
        return {
          success: false,
          message: "Time slot not found",
          booking: null,
          cart: null
        };
      }
      const quantity = numParticipants != null && numParticipants > 0 ? numParticipants : 1;
      const { ok } = this._checkTimeSlotAvailability(timeSlotId, quantity);
      if (!ok) {
        return {
          success: false,
          message: "Selected time slot is no longer available",
          booking: null,
          cart: null
        };
      }
      startDatetime = slot.start_datetime;
      endDatetime = slot.end_datetime;
      branchId = slot.branch_id;
      branch = branches.find((b) => b.id === branchId) || branch;
    }

    // Determine booking_type
    let bookingType = "standard_service";
    if (service.is_membership || service.category_id === "memberships") {
      bookingType = "membership";
    } else if (service.category_id === "classes_events") {
      bookingType = "class_event";
    } else if (service.is_package && service.is_couples) {
      bookingType = "couples_package";
    } else if (service.is_package) {
      bookingType = "spa_package";
    } else if (service.category_id === "sauna_hydrotherapy") {
      bookingType = "sauna_hydrotherapy";
    }

    const baseUnitPrice = option && option.price != null
      ? option.price
      : service.base_price != null
      ? service.base_price
      : 0;

    const quantityForPricing = bookingType === "class_event"
      ? (numParticipants != null && numParticipants > 0 ? numParticipants : 1)
      : 1;

    const baseTotal = baseUnitPrice * quantityForPricing;

    const promoResult = this._applyPromoCodeIfValid(
      service,
      bookingType,
      baseTotal,
      promoCode
    );

    const booking = {
      id: this._generateId("sb"),
      service_id: service.id,
      service_option_id: option ? option.id : null,
      branch_id: branch ? branch.id : null,
      time_slot_id: slot ? slot.id : null,
      start_datetime: startDatetime || null,
      end_datetime: endDatetime || null,
      num_guests: numGuests != null ? numGuests : null,
      num_participants: numParticipants != null ? numParticipants : null,
      special_notes: specialNotes || "",
      booking_type: bookingType,
      membership_start_date: membershipStartDate || null,
      promo_code_id: promoResult.promoCodeId,
      promo_code: promoResult.promoCode,
      discount_amount: promoResult.discountAmount,
      created_at: new Date().toISOString()
    };

    serviceBookings.push(booking);
    this._saveToStorage("service_bookings", serviceBookings);

    const finalTotal = baseTotal - promoResult.discountAmount;

    const cart = this._getOrCreateCart();

    let item_type = "service_booking";
    if (bookingType === "class_event") {
      item_type = "class_enrollment";
    } else if (bookingType === "membership") {
      item_type = "membership_purchase";
    }

    const quantity = quantityForPricing;

    const cartItem = {
      id: this._generateId("ci"),
      cart_id: cart.id,
      item_type,
      reference_id: booking.id,
      service_id: service.id,
      service_option_id: option ? option.id : null,
      quantity,
      unit_price: baseUnitPrice,
      total_price: finalTotal,
      display_name: service.name,
      created_at: new Date().toISOString()
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    const updatedCart = this._recalculateCartTotals(cart.id);

    const resultBooking = {
      service_booking_id: booking.id,
      service_id: booking.service_id,
      service_name: service.name,
      service_option_id: booking.service_option_id,
      option_name: option ? option.name : null,
      branch_id: booking.branch_id,
      branch_name: branch ? branch.name : null,
      time_slot_id: booking.time_slot_id,
      start_datetime: booking.start_datetime,
      end_datetime: booking.end_datetime,
      num_guests: booking.num_guests,
      num_participants: booking.num_participants,
      special_notes: booking.special_notes,
      membership_start_date: booking.membership_start_date,
      booking_type: booking.booking_type,
      promo_code: booking.promo_code,
      discount_amount: booking.discount_amount,
      unit_price: baseUnitPrice,
      total_price: finalTotal,
      cart_item_id: cartItem.id,
      // Foreign key resolution
      service_booking: booking,
      service,
      service_option: option,
      branch,
      time_slot: slot
    };

    const resultCart = {
      id: updatedCart.id,
      subtotal: updatedCart.subtotal,
      tax: updatedCart.tax,
      total: updatedCart.total,
      item_count: this._getCartItemCount(updatedCart.id)
    };

    return {
      success: true,
      message: "Booking added to cart",
      booking: resultBooking,
      cart: resultCart
    };
  }

  // 9) addServiceToWishlist
  addServiceToWishlist(serviceId, serviceOptionId = null, notes = "") {
    const wishlistItems = this._getFromStorage("wishlist_items");
    const services = this._getFromStorage("services");
    const options = this._getFromStorage("service_options");

    const service = services.find((s) => s.id === serviceId) || null;
    const option = serviceOptionId
      ? options.find((o) => o.id === serviceOptionId && o.service_id === serviceId) || null
      : null;

    if (!service) {
      return {
        success: false,
        message: "Service not found",
        wishlist_item: null
      };
    }

    const item = {
      id: this._generateId("wi"),
      service_id: serviceId,
      service_option_id: option ? option.id : null,
      added_at: new Date().toISOString(),
      notes: notes || "",
      is_favorite: false
    };

    wishlistItems.push(item);
    this._saveToStorage("wishlist_items", wishlistItems);

    const categories = this._getFromStorage("service_categories");
    const cat = categories.find((c) => c.code === service.category_id) || null;

    const resolved = {
      ...item,
      service,
      service_option: option,
      category: cat
    };

    return {
      success: true,
      message: "Item added to wishlist",
      wishlist_item: resolved
    };
  }

  // 10) getWishlistItems
  getWishlistItems() {
    const wishlistItems = this._getFromStorage("wishlist_items");
    const services = this._getFromStorage("services");
    const categories = this._getFromStorage("service_categories");
    const options = this._getFromStorage("service_options");

    return wishlistItems.map((item) => {
      const service = services.find((s) => s.id === item.service_id) || null;
      const option = item.service_option_id
        ? options.find((o) => o.id === item.service_option_id) || null
        : null;
      const cat = service
        ? categories.find((c) => c.code === service.category_id) || null
        : null;

      const min_price = service
        ? service.min_price != null
          ? service.min_price
          : service.base_price != null
          ? service.base_price
          : null
        : null;

      return {
        wishlist_item_id: item.id,
        service_id: item.service_id,
        service_name: service ? service.name : null,
        category_code: service ? service.category_id : null,
        category_name: cat ? cat.name : null,
        service_option_id: item.service_option_id,
        option_name: option ? option.name : null,
        min_price,
        default_duration_minutes: service ? service.default_duration_minutes || null : null,
        rating: service ? service.rating || null : null,
        included_addons: service && Array.isArray(service.included_addons)
          ? service.included_addons
          : [],
        notes: item.notes,
        is_favorite: !!item.is_favorite,
        added_at: item.added_at,
        // Foreign key resolution
        service,
        service_option: option,
        category: cat
      };
    });
  }

  // 11) removeWishlistItem
  removeWishlistItem(wishlistItemId) {
    let wishlistItems = this._getFromStorage("wishlist_items");
    const lenBefore = wishlistItems.length;
    wishlistItems = wishlistItems.filter((i) => i.id !== wishlistItemId);
    this._saveToStorage("wishlist_items", wishlistItems);

    const removed = wishlistItemId && lenBefore !== wishlistItems.length;

    return {
      success: removed,
      message: removed ? "Wishlist item removed" : "Wishlist item not found"
    };
  }

  // 12) getGiftCardDesigns
  getGiftCardDesigns(type = null) {
    const designs = this._getFromStorage("gift_card_designs");
    const filtered = designs.filter((d) => {
      if (!d.is_active) return false;
      if (type === "digital") return !!d.is_digital_supported;
      if (type === "physical") return !!d.is_physical_supported;
      return true;
    });
    return filtered;
  }

  // 13) configureGiftCardAndAddToCart
  configureGiftCardAndAddToCart(
    type,
    amount,
    designId,
    message = "",
    recipientName = "",
    senderName = "",
    deliveryMethod,
    recipientEmail = "",
    recipientAddress = "",
    sendDate = null
  ) {
    const designs = this._getFromStorage("gift_card_designs");
    const purchases = this._getFromStorage("gift_card_purchases");
    const cartItems = this._getFromStorage("cart_items");

    const design = designs.find((d) => d.id === designId && d.is_active) || null;
    if (!design) {
      return {
        success: false,
        message: "Gift card design not found or inactive",
        gift_card_purchase: null,
        cart: null
      };
    }

    if (type === "digital" && !design.is_digital_supported) {
      return {
        success: false,
        message: "Selected design does not support digital cards",
        gift_card_purchase: null,
        cart: null
      };
    }

    if (type === "physical" && !design.is_physical_supported) {
      return {
        success: false,
        message: "Selected design does not support physical cards",
        gift_card_purchase: null,
        cart: null
      };
    }

    const now = new Date();
    const sendDateValue = sendDate || now.toISOString();

    const purchase = {
      id: this._generateId("gcp"),
      type,
      amount,
      design_id: design.id,
      message: message || "",
      recipient_name: recipientName || "",
      sender_name: senderName || "",
      delivery_method: deliveryMethod,
      recipient_email: deliveryMethod === "email" ? recipientEmail || "" : "",
      recipient_address:
        deliveryMethod === "physical_mail" ? recipientAddress || "" : "",
      send_date: sendDateValue,
      created_at: now.toISOString()
    };

    purchases.push(purchase);
    this._saveToStorage("gift_card_purchases", purchases);

    const cart = this._getOrCreateCart();

    const cartItem = {
      id: this._generateId("ci"),
      cart_id: cart.id,
      item_type: "gift_card_purchase",
      reference_id: purchase.id,
      service_id: null,
      service_option_id: null,
      quantity: 1,
      unit_price: amount,
      total_price: amount,
      display_name: `Gift Card - $${amount}`,
      created_at: now.toISOString()
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    const updatedCart = this._recalculateCartTotals(cart.id);

    const resultPurchase = {
      ...purchase,
      design
    };

    const resultCart = {
      id: updatedCart.id,
      subtotal: updatedCart.subtotal,
      tax: updatedCart.tax,
      total: updatedCart.total,
      item_count: this._getCartItemCount(updatedCart.id)
    };

    return {
      success: true,
      message: "Gift card added to cart",
      gift_card_purchase: resultPurchase,
      cart: resultCart
    };
  }

  // 14) getCustomPackageSummary
  getCustomPackageSummary() {
    const customPackage = this._getOrCreateCustomPackage();
    const itemsAll = this._getFromStorage("custom_package_items");
    const items = itemsAll.filter((i) => i.custom_package_id === customPackage.id);
    const services = this._getFromStorage("services");
    const options = this._getFromStorage("service_options");

    const { customPackage: validatedPkg, missingRoles } = this._validateCustomPackage(
      customPackage
    );

    const resultItems = items.map((i) => {
      const service = services.find((s) => s.id === i.service_id) || null;
      const option = i.service_option_id
        ? options.find((o) => o.id === i.service_option_id) || null
        : null;
      return {
        custom_package_item_id: i.id,
        service_id: i.service_id,
        service_name: service ? service.name : null,
        service_option_id: i.service_option_id,
        option_name: option ? option.name : null,
        category_role: i.category_role,
        price: i.price,
        display_name: i.display_name,
        added_at: i.added_at,
        // Foreign key resolution
        service,
        service_option: option
      };
    });

    return {
      custom_package: validatedPkg,
      items: resultItems,
      missing_roles: missingRoles
    };
  }

  // 15) addServiceToCustomPackage
  addServiceToCustomPackage(serviceId, serviceOptionId = null, categoryRole) {
    const validRoles = ["skincare", "massage", "body_treatment"];
    if (!validRoles.includes(categoryRole)) {
      return {
        success: false,
        message: "Invalid category role",
        custom_package: null,
        items: []
      };
    }

    const services = this._getFromStorage("services");
    const options = this._getFromStorage("service_options");

    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return {
        success: false,
        message: "Service not found",
        custom_package: null,
        items: []
      };
    }

    // Optional enforcement of category-role mapping
    if (categoryRole === "skincare" && service.category_id !== "facials") {
      // Allow but do not block strictly; could add more complex mapping
    }
    if (categoryRole === "massage" && service.category_id !== "massages") {
      // allow
    }
    if (categoryRole === "body_treatment" && service.category_id !== "body_treatments") {
      // allow
    }

    let option = null;
    if (serviceOptionId) {
      option = options.find((o) => o.id === serviceOptionId && o.service_id === serviceId) || null;
    } else {
      option =
        options.find((o) => o.service_id === serviceId && o.is_default) ||
        options.find((o) => o.service_id === serviceId) ||
        null;
    }

    const price = option && option.price != null
      ? option.price
      : service.base_price != null
      ? service.base_price
      : 0;

    const customPackage = this._getOrCreateCustomPackage();
    let items = this._getFromStorage("custom_package_items");

    // Remove existing item for this role
    items = items.filter(
      (i) => !(i.custom_package_id === customPackage.id && i.category_role === categoryRole)
    );

    const item = {
      id: this._generateId("cpi"),
      custom_package_id: customPackage.id,
      service_id: serviceId,
      service_option_id: option ? option.id : null,
      category_role: categoryRole,
      price,
      display_name: option ? `${service.name} - ${option.name}` : service.name,
      added_at: new Date().toISOString()
    };

    items.push(item);
    this._saveToStorage("custom_package_items", items);

    const { customPackage: validatedPkg } = this._validateCustomPackage(customPackage);

    const itemsForPkg = items.filter((i) => i.custom_package_id === validatedPkg.id);

    return {
      success: true,
      message: "Service added to custom package",
      custom_package: validatedPkg,
      items: itemsForPkg
    };
  }

  // 16) removeCustomPackageItem
  removeCustomPackageItem(customPackageItemId) {
    let items = this._getFromStorage("custom_package_items");
    const item = items.find((i) => i.id === customPackageItemId) || null;
    if (!item) {
      return {
        success: false,
        message: "Custom package item not found",
        custom_package: null,
        items
      };
    }

    items = items.filter((i) => i.id !== customPackageItemId);
    this._saveToStorage("custom_package_items", items);

    const customPackage = this._getOrCreateCustomPackage();
    const { customPackage: validatedPkg } = this._validateCustomPackage(customPackage);
    const itemsForPkg = items.filter((i) => i.custom_package_id === validatedPkg.id);

    return {
      success: true,
      message: "Custom package item removed",
      custom_package: validatedPkg,
      items: itemsForPkg
    };
  }

  // 17) updateCustomPackageBudget
  updateCustomPackageBudget(targetMaxPrice) {
    const pkg = this._getOrCreateCustomPackage();
    pkg.target_max_price = targetMaxPrice;
    const { customPackage: validatedPkg } = this._validateCustomPackage(pkg);

    const itemsAll = this._getFromStorage("custom_package_items");
    const items = itemsAll.filter((i) => i.custom_package_id === validatedPkg.id);

    return {
      custom_package: validatedPkg,
      items
    };
  }

  // 18) finalizeCustomPackageAndAddToCart
  finalizeCustomPackageAndAddToCart() {
    const customPackage = this._getOrCreateCustomPackage();
    const { customPackage: validatedPkg, missingRoles } = this._validateCustomPackage(
      customPackage
    );

    const itemsAll = this._getFromStorage("custom_package_items");
    const items = itemsAll.filter((i) => i.custom_package_id === validatedPkg.id);

    if (!validatedPkg.is_valid || items.length !== 3) {
      return {
        success: false,
        message: "Custom package is not valid or does not contain exactly three services",
        custom_package: validatedPkg,
        cart_item_id: null,
        cart: null
      };
    }

    if (
      validatedPkg.target_max_price != null &&
      validatedPkg.total_price > validatedPkg.target_max_price
    ) {
      return {
        success: false,
        message: "Custom package exceeds the target budget",
        custom_package: validatedPkg,
        cart_item_id: null,
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items");

    const cartItem = {
      id: this._generateId("ci"),
      cart_id: cart.id,
      item_type: "custom_package",
      reference_id: validatedPkg.id,
      service_id: null,
      service_option_id: null,
      quantity: 1,
      unit_price: validatedPkg.total_price,
      total_price: validatedPkg.total_price,
      display_name: "Custom 3-Service Wellness Package",
      created_at: new Date().toISOString()
    };

    cartItems.push(cartItem);
    this._saveToStorage("cart_items", cartItems);

    const updatedCart = this._recalculateCartTotals(cart.id);

    const resultCart = {
      id: updatedCart.id,
      subtotal: updatedCart.subtotal,
      tax: updatedCart.tax,
      total: updatedCart.total,
      item_count: this._getCartItemCount(updatedCart.id)
    };

    return {
      success: true,
      message: "Custom package added to cart",
      custom_package: validatedPkg,
      cart_item_id: cartItem.id,
      cart: resultCart
    };
  }

  // 19) getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items").filter(
      (ci) => ci.cart_id === cart.id
    );
    const serviceBookings = this._getFromStorage("service_bookings");
    const services = this._getFromStorage("services");
    const categories = this._getFromStorage("service_categories");
    const options = this._getFromStorage("service_options");
    const branches = this._getFromStorage("branches");
    const giftCardPurchases = this._getFromStorage("gift_card_purchases");
    const giftCardDesigns = this._getFromStorage("gift_card_designs");
    const customPackages = this._getFromStorage("custom_packages");
    const customPackageItems = this._getFromStorage("custom_package_items");

    const items = cartItems.map((ci) => {
      let service_booking = null;
      let service = null;
      let category = null;
      let service_option = null;
      let branch = null;
      let gift_card_purchase = null;
      let custom_package = null;
      let start_datetime = null;
      let end_datetime = null;
      let num_guests = null;
      let num_participants = null;
      let special_notes = null;
      let membership_start_date = null;
      let promo_code = null;
      let discount_amount = null;
      let branch_name = null;
      let visit_date = null;
      let gift_card_details = null;
      let custom_package_details = null;

      if (
        ci.item_type === "service_booking" ||
        ci.item_type === "class_enrollment" ||
        ci.item_type === "membership_purchase"
      ) {
        service_booking = serviceBookings.find((sb) => sb.id === ci.reference_id) || null;
        if (service_booking) {
          service = services.find((s) => s.id === service_booking.service_id) || null;
          if (service) {
            category = categories.find((c) => c.code === service.category_id) || null;
          }
          if (service_booking.service_option_id) {
            service_option = options.find(
              (o) => o.id === service_booking.service_option_id
            ) || null;
          }
          if (service_booking.branch_id) {
            branch = branches.find((b) => b.id === service_booking.branch_id) || null;
          }
          start_datetime = service_booking.start_datetime || null;
          end_datetime = service_booking.end_datetime || null;
          num_guests = service_booking.num_guests != null ? service_booking.num_guests : null;
          num_participants =
            service_booking.num_participants != null ? service_booking.num_participants : null;
          special_notes = service_booking.special_notes || null;
          membership_start_date = service_booking.membership_start_date || null;
          promo_code = service_booking.promo_code || null;
          discount_amount = service_booking.discount_amount != null
            ? service_booking.discount_amount
            : null;
          branch_name = branch ? branch.name : null;
          visit_date = start_datetime ? this._datePart(start_datetime) : null;
        }
      } else if (ci.item_type === "gift_card_purchase") {
        gift_card_purchase =
          giftCardPurchases.find((g) => g.id === ci.reference_id) || null;
        if (gift_card_purchase) {
          const design = giftCardDesigns.find(
            (d) => d.id === gift_card_purchase.design_id
          ) || null;
          gift_card_purchase = {
            ...gift_card_purchase,
            design
          };
          gift_card_details = {
            type: gift_card_purchase.type,
            amount: gift_card_purchase.amount,
            recipient_name: gift_card_purchase.recipient_name,
            sender_name: gift_card_purchase.sender_name,
            delivery_method: gift_card_purchase.delivery_method,
            send_date: gift_card_purchase.send_date
          };
        }
      } else if (ci.item_type === "custom_package") {
        custom_package = customPackages.find((cp) => cp.id === ci.reference_id) || null;
        if (custom_package) {
          const itemsForPkg = customPackageItems.filter(
            (i) => i.custom_package_id === custom_package.id
          );
          custom_package_details = {
            custom_package_id: custom_package.id,
            total_price: custom_package.total_price,
            item_count: itemsForPkg.length
          };
        }
      }

      return {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        display_name: ci.display_name,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        service_id: service ? service.id : null,
        service_name: service ? service.name : null,
        category_code: service ? service.category_id : null,
        category_name: category ? category.name : null,
        service_option_id: service_option ? service_option.id : null,
        option_name: service_option ? service_option.name : null,
        branch_id: branch ? branch.id : null,
        branch_name,
        start_datetime,
        end_datetime,
        num_guests,
        num_participants,
        special_notes,
        membership_start_date,
        promo_code,
        discount_amount,
        visit_date,
        gift_card_details,
        custom_package_details,
        // Foreign key resolution
        cart_item: ci,
        service_booking,
        service,
        category,
        service_option,
        branch,
        gift_card_purchase,
        custom_package
      };
    });

    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    return {
      cart: updatedCart,
      items
    };
  }

  // 20) updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage("cart_items");
    const cart = this._getOrCreateCart();
    const idx = cartItems.findIndex(
      (ci) => ci.id === cartItemId && ci.cart_id === cart.id
    );
    if (idx === -1) {
      return {
        cart,
        items: cartItems
      };
    }

    const item = cartItems[idx];
    item.quantity = quantity;
    item.total_price = item.unit_price * quantity;
    cartItems[idx] = item;
    this._saveToStorage("cart_items", cartItems);

    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    return {
      cart: updatedCart,
      items: cartItems
    };
  }

  // 21) removeCartItem
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage("cart_items");
    const cart = this._getOrCreateCart();

    cartItems = cartItems.filter(
      (ci) => !(ci.id === cartItemId && ci.cart_id === cart.id)
    );
    this._saveToStorage("cart_items", cartItems);

    const updatedCart = this._recalculateCartTotals(cart.id) || cart;

    return {
      cart: updatedCart,
      items: cartItems
    };
  }

  // 22) startGuestCheckout
  startGuestCheckout() {
    const { cart, items } = this.getCartSummary();

    const can_proceed = !!cart && items.length > 0;
    const message = can_proceed
      ? "Proceed to checkout"
      : "Cart is empty. Add items before checkout.";

    const cart_summary = {
      cart,
      items: items.map((i) => ({
        cart_item_id: i.cart_item_id,
        display_name: i.display_name,
        total_price: i.total_price,
        start_datetime: i.start_datetime,
        end_datetime: i.end_datetime,
        branch_name: i.branch_name,
        visit_date: i.visit_date
      }))
    };

    return {
      can_proceed,
      message,
      cart_summary
    };
  }

  // 23) submitGuestCheckoutInfo
  submitGuestCheckoutInfo(fullName, email, phone = "") {
    const cart = this._getOrCreateCart();
    let infos = this._getFromStorage("checkout_info");

    let info = infos.find((ci) => ci.cart_id === cart.id) || null;

    if (!info) {
      info = {
        id: this._generateId("chk"),
        cart_id: cart.id,
        full_name: fullName,
        email,
        phone,
        created_at: new Date().toISOString(),
        updated_at: null
      };
      infos.push(info);
    } else {
      info.full_name = fullName;
      info.email = email;
      info.phone = phone;
      info.updated_at = new Date().toISOString();
      infos = infos.map((ci) => (ci.id === info.id ? info : ci));
    }

    this._saveToStorage("checkout_info", infos);

    return {
      success: true,
      message: "Checkout info submitted",
      checkout_info: info
    };
  }

  // 24) getAboutInfo
  getAboutInfo() {
    const stored = this._getFromStorage("about_info", {});
    const defaultObj = {
      headline: "",
      intro: "",
      mission: "",
      approach: "",
      facilities: [],
      therapist_qualifications: "",
      safety_practices: ""
    };

    const result = {
      ...defaultObj,
      ...stored
    };

    return result;
  }

  // 25) getContactInfo
  getContactInfo() {
    const stored = this._getFromStorage("contact_info", {});
    const branches = this._getFromStorage("branches");

    const defaultObj = {
      phone: "",
      email: "",
      general_hours: "",
      response_time_info: "",
      urgent_issue_instructions: "",
      branches
    };

    const result = {
      ...defaultObj,
      ...stored,
      branches
    };

    return result;
  }

  // 26) submitContactForm
  submitContactForm(name, email, phone = "", topic = "", message = "") {
    const submissions = this._getFromStorage("contact_form_submissions");

    const ticket = {
      id: this._generateId("ticket"),
      name,
      email,
      phone,
      topic,
      message,
      created_at: new Date().toISOString()
    };

    submissions.push(ticket);
    this._saveToStorage("contact_form_submissions", submissions);

    return {
      success: true,
      message: "Contact form submitted",
      ticket_id: ticket.id
    };
  }

  // 27) getFaqEntries
  getFaqEntries() {
    const faqs = this._getFromStorage("faq_entries");
    return faqs;
  }

  // 28) getPolicyDocuments
  getPolicyDocuments(policyType = null) {
    let policies = this._getFromStorage("policy_documents");
    if (policyType) {
      policies = policies.filter((p) => p.policy_type === policyType);
    }
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