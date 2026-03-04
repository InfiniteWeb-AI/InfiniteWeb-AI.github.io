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
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Core entity tables
    ensureArray("stores");
    ensureArray("store_service_hours");
    ensureArray("categories");
    ensureArray("products");
    ensureArray("product_store_availabilities");
    ensureArray("weekly_ads");
    ensureArray("weekly_ad_items");
    ensureArray("cart");
    ensureArray("cart_items");
    ensureArray("shopping_lists");
    ensureArray("shopping_list_items");
    ensureArray("loyalty_enrollments");
    ensureArray("contact_requests");
    ensureArray("favorite_items");
    ensureArray("return_policies");
    // Optional legacy/example tables
    ensureArray("users");

    // Seed baseline demo products and availabilities so key flows have data
    try {
      const existingProductsRaw = localStorage.getItem("products");
      const existingProducts = existingProductsRaw ? JSON.parse(existingProductsRaw) : [];
      const existingProductIds = new Set(existingProducts.map((p) => p.id));

      const baselineProducts = [
        {
          id: "prod_laundry_eco_64load",
          name: "Eco-Friendly Laundry Detergent 64-Load",
          sku: "LDY-ECO-64",
          description: "Eco friendly liquid laundry detergent for up to 64 loads.",
          categoryId: "home_cleaning",
          categoryKey: "laundry",
          brandName: "GreenClean",
          imageUrl: "",
          thumbnailUrl: "",
          regularPrice: 19.99,
          salePrice: 17.99,
          currency: "USD",
          isOnSale: true,
          isEcoFriendly: true,
          isFragranceFree: true,
          isGrocery: false,
          isElectronics: false,
          loadCount: 64,
          screenSizeInches: null,
          hdmiPortCount: null,
          attributes: ["laundry", "eco friendly"],
          fulfillmentTags: ["same_day_pickup"],
          isEligibleSameDayPickup: true,
          minPickupHours: 2,
          sizeDescription: "64 loads",
          unitOfMeasure: "oz",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active",
          isWeeklyAdDeal: false,
          rating: 4.5,
          ratingCount: 120,
          reviewCount: 75
        },
        {
          id: "prod_tv_50in_basic",
          name: "MetroView 50\" LED TV",
          sku: "TV-50-BASIC",
          description: "50-inch 1080p LED TV with 3 HDMI ports.",
          categoryId: "tvs",
          categoryKey: "tvs",
          brandName: "MetroView",
          imageUrl: "",
          thumbnailUrl: "",
          regularPrice: 349.99,
          salePrice: 329.99,
          currency: "USD",
          isOnSale: true,
          isEcoFriendly: false,
          isFragranceFree: true,
          isGrocery: false,
          isElectronics: true,
          loadCount: null,
          screenSizeInches: 50,
          hdmiPortCount: 3,
          attributes: ["tv", "50 inch"],
          fulfillmentTags: ["same_day_pickup"],
          isEligibleSameDayPickup: false,
          minPickupHours: 2,
          sizeDescription: "50 in",
          unitOfMeasure: "in",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active",
          isWeeklyAdDeal: false,
          rating: 4.2,
          ratingCount: 45,
          reviewCount: 30
        },
        {
          id: "prod_tv_50in_premium",
          name: "MetroView 50\" 4K Smart TV",
          sku: "TV-50-4K",
          description: "50-inch 4K UHD Smart TV with 4 HDMI ports.",
          categoryId: "tvs",
          categoryKey: "tvs",
          brandName: "MetroView",
          imageUrl: "",
          thumbnailUrl: "",
          regularPrice: 399.99,
          salePrice: 379.99,
          currency: "USD",
          isOnSale: true,
          isEcoFriendly: false,
          isFragranceFree: true,
          isGrocery: false,
          isElectronics: true,
          loadCount: null,
          screenSizeInches: 50,
          hdmiPortCount: 4,
          attributes: ["tv", "50 inch", "smart"],
          fulfillmentTags: ["same_day_pickup"],
          isEligibleSameDayPickup: false,
          minPickupHours: 2,
          sizeDescription: "50 in",
          unitOfMeasure: "in",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active",
          isWeeklyAdDeal: false,
          rating: 4.6,
          ratingCount: 80,
          reviewCount: 60
        },
        {
          id: "prod_cleaning_multi_surface_32oz",
          name: "Fragrance-Free Multi-Surface Cleaner 32 oz",
          sku: "CLN-MULTI-32",
          description: "Fragrance-free multi-surface spray cleaner.",
          categoryId: "home_cleaning",
          categoryKey: "home_cleaning",
          brandName: "MetroMart Home",
          imageUrl: "",
          thumbnailUrl: "",
          regularPrice: 5.99,
          salePrice: 4.99,
          currency: "USD",
          isOnSale: true,
          isEcoFriendly: true,
          isFragranceFree: true,
          isGrocery: false,
          isElectronics: false,
          loadCount: null,
          screenSizeInches: null,
          hdmiPortCount: null,
          attributes: ["cleaning", "multi-surface"],
          fulfillmentTags: ["same_day_pickup"],
          isEligibleSameDayPickup: true,
          minPickupHours: 2,
          sizeDescription: "32 oz bottle",
          unitOfMeasure: "oz",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active",
          isWeeklyAdDeal: false,
          rating: 4.3,
          ratingCount: 40,
          reviewCount: 25
        },
        {
          id: "prod_cleaning_dish_liquid_24oz",
          name: "Fragrance-Free Dishwashing Liquid 24 oz",
          sku: "CLN-DISH-24",
          description: "Fragrance-free dishwashing liquid soap.",
          categoryId: "home_cleaning",
          categoryKey: "home_cleaning",
          brandName: "MetroMart Home",
          imageUrl: "",
          thumbnailUrl: "",
          regularPrice: 4.49,
          salePrice: 3.99,
          currency: "USD",
          isOnSale: true,
          isEcoFriendly: true,
          isFragranceFree: true,
          isGrocery: false,
          isElectronics: false,
          loadCount: null,
          screenSizeInches: null,
          hdmiPortCount: null,
          attributes: ["cleaning", "dish"],
          fulfillmentTags: ["same_day_pickup"],
          isEligibleSameDayPickup: true,
          minPickupHours: 2,
          sizeDescription: "24 oz bottle",
          unitOfMeasure: "oz",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active",
          isWeeklyAdDeal: false,
          rating: 4.1,
          ratingCount: 35,
          reviewCount: 20
        },
        {
          id: "prod_cleaning_glass_spray_26oz",
          name: "Fragrance-Free Glass Cleaner Spray 26 oz",
          sku: "CLN-GLASS-26",
          description: "Streak-free, fragrance-free glass cleaner.",
          categoryId: "home_cleaning",
          categoryKey: "home_cleaning",
          brandName: "MetroMart Home",
          imageUrl: "",
          thumbnailUrl: "",
          regularPrice: 4.99,
          salePrice: 3.99,
          currency: "USD",
          isOnSale: true,
          isEcoFriendly: true,
          isFragranceFree: true,
          isGrocery: false,
          isElectronics: false,
          loadCount: null,
          screenSizeInches: null,
          hdmiPortCount: null,
          attributes: ["cleaning", "glass"],
          fulfillmentTags: ["same_day_pickup"],
          isEligibleSameDayPickup: true,
          minPickupHours: 2,
          sizeDescription: "26 oz bottle",
          unitOfMeasure: "oz",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: "active",
          isWeeklyAdDeal: false,
          rating: 4.4,
          ratingCount: 50,
          reviewCount: 30
        }
      ];

      const mergedProducts = existingProducts.concat(
        baselineProducts.filter((p) => !existingProductIds.has(p.id))
      );
      localStorage.setItem("products", JSON.stringify(mergedProducts));

      const existingAvailRaw = localStorage.getItem("product_store_availabilities");
      const existingAvail = existingAvailRaw ? JSON.parse(existingAvailRaw) : [];
      const existingAvailIds = new Set(existingAvail.map((a) => a.id));

      const baselineAvailabilities = [
        {
          id: "psa_seed_ny10001_1_glass_26oz",
          productId: "prod_cleaning_glass_spray_26oz",
          storeId: "store_ny_10001_1",
          isAvailable: true,
          fulfillmentOptions: ["same_day_pickup", "standard_pickup"],
          sameDayPickupAvailable: true,
          pickupLeadTimeHours: 2,
          lastUpdated: new Date().toISOString()
        }
      ];

      const mergedAvail = existingAvail.concat(
        baselineAvailabilities.filter((a) => !existingAvailIds.has(a.id))
      );
      localStorage.setItem("product_store_availabilities", JSON.stringify(mergedAvail));
    } catch (e) {
      // Ignore seeding errors to avoid breaking core flows
    }

    // Preferred store config stored as single object
    if (!localStorage.getItem("preferred_store_config")) {
      localStorage.setItem("preferred_store_config", "null");
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
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

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatTime12h(hhmm) {
    if (!hhmm || hhmm === "00:00") return null;
    const parts = hhmm.split(":");
    if (parts.length < 2) return null;
    const hStr = parts[0];
    const mStr = parts[1];
    let h = parseInt(hStr, 10);
    const m = mStr || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return h + ":" + m + " " + ampm;
  }

  _getTodayDayOfWeek() {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return days[new Date().getDay()];
  }

  _getPreferredStoreConfig() {
    const raw = localStorage.getItem("preferred_store_config");
    if (!raw || raw === "null") return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  _setPreferredStoreConfig(storeId) {
    const config = {
      id: "preferred_store_singleton",
      storeId,
      setAt: new Date().toISOString()
    };
    localStorage.setItem("preferred_store_config", JSON.stringify(config));
    return config;
  }

  _getPreferredStore() {
    const config = this._getPreferredStoreConfig();
    if (!config) return null;
    const stores = this._getFromStorage("stores");
    return stores.find((s) => s.id === config.storeId) || null;
  }

  _resolvePickupStore(explicitStoreId, cartStoreId, listStoreId) {
    const stores = this._getFromStorage("stores");
    const find = (id) => stores.find((s) => s.id === id) || null;
    if (explicitStoreId) return find(explicitStoreId);
    if (cartStoreId) return find(cartStoreId);
    if (listStoreId) return find(listStoreId);
    const preferred = this._getPreferredStore();
    if (preferred) return preferred;
    return null;
  }

  _getOrCreateCart(storeId, fulfillmentType) {
    const carts = this._getFromStorage("cart");
    // Find open cart
    let cart = carts.find((c) => c.status === "open");
    if (!cart) {
      cart = {
        id: this._generateId("cart"),
        storeId: storeId || null,
        fulfillmentType: fulfillmentType || "same_day_pickup",
        items: [],
        subtotal: 0,
        estimatedTax: 0,
        estimatedTotal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "open"
      };
      carts.push(cart);
      this._saveToStorage("cart", carts);
    } else {
      if (storeId && cart.storeId !== storeId) {
        cart.storeId = storeId;
      }
      if (fulfillmentType && cart.fulfillmentType !== fulfillmentType) {
        cart.fulfillmentType = fulfillmentType;
      }
      cart.updatedAt = new Date().toISOString();
      const idx = carts.findIndex((c) => c.id === cart.id);
      if (idx !== -1) {
        carts[idx] = cart;
        this._saveToStorage("cart", carts);
      }
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage("cart_items");
    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);
    let subtotal = 0;
    itemsForCart.forEach((ci) => {
      subtotal += typeof ci.totalPrice === "number" ? ci.totalPrice : 0;
    });
    cart.subtotal = subtotal;
    // Simplified tax estimation
    cart.estimatedTax = 0;
    cart.estimatedTotal = subtotal + cart.estimatedTax;
    cart.updatedAt = new Date().toISOString();

    const carts = this._getFromStorage("cart");
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage("cart", carts);
    }
  }

  _getOrCreateDefaultShoppingList() {
    const lists = this._getFromStorage("shopping_lists");
    let list = lists.find((l) => l.isDefault) || lists[0];
    if (!list) {
      const preferredStore = this._getPreferredStore();
      list = {
        id: this._generateId("shopping_list"),
        name: "My Shopping List",
        storeId: preferredStore ? preferredStore.id : null,
        subtotal: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true
      };
      lists.push(list);
      this._saveToStorage("shopping_lists", lists);
    }
    return list;
  }

  _recalculateShoppingListSubtotal(list) {
    const items = this._getFromStorage("shopping_list_items");
    const listItems = items.filter((i) => i.shoppingListId === list.id);
    let subtotal = 0;
    listItems.forEach((i) => {
      subtotal += typeof i.totalPrice === "number" ? i.totalPrice : 0;
    });
    list.subtotal = subtotal;
    list.updatedAt = new Date().toISOString();

    const lists = this._getFromStorage("shopping_lists");
    const idx = lists.findIndex((l) => l.id === list.id);
    if (idx !== -1) {
      lists[idx] = list;
      this._saveToStorage("shopping_lists", lists);
    }
    return subtotal;
  }

  _expandCategoryIds(rootCategoryId, categories) {
    const result = [rootCategoryId];
    const stack = [rootCategoryId];
    while (stack.length > 0) {
      const current = stack.pop();
      const children = categories.filter((c) => c.parentCategoryId === current);
      children.forEach((child) => {
        result.push(child.id);
        stack.push(child.id);
      });
    }
    return result;
  }

  // ---------------- Interface implementations ----------------

  // getPreferredStoreSummary()
  getPreferredStoreSummary() {
    const config = this._getPreferredStoreConfig();
    if (!config) {
      return {
        hasPreferredStore: false,
        store: null,
        displayName: "",
        distanceText: ""
      };
    }
    const stores = this._getFromStorage("stores");
    const store = stores.find((s) => s.id === config.storeId) || null;
    if (!store) {
      return {
        hasPreferredStore: false,
        store: null,
        displayName: "",
        distanceText: ""
      };
    }
    const displayName = store.name + "  " + (store.city || "");
    let distanceText = "";
    if (typeof store.distanceMiles === "number") {
      distanceText = store.distanceMiles.toFixed(1) + " mi";
    }
    return {
      hasPreferredStore: true,
      store,
      displayName,
      distanceText
    };
  }

  // setPreferredStore(storeId)
  setPreferredStore(storeId) {
    const stores = this._getFromStorage("stores");
    const store = stores.find((s) => s.id === storeId) || null;
    if (!store) {
      return {
        success: false,
        preferredStore: null,
        message: "Store not found"
      };
    }
    this._setPreferredStoreConfig(storeId);
    const updatedStores = stores.map((s) => ({
      ...s,
      isPreferred: s.id === storeId
    }));
    this._saveToStorage("stores", updatedStores);
    return {
      success: true,
      preferredStore: { ...store, isPreferred: true },
      message: "Preferred store updated"
    };
  }

  // searchStores(postalCode, city, state, useCurrentLocation, latitude, longitude, radiusMiles, hasPharmacy, hasBakery, hasCafe, isOpen24Hours, openNow, sortBy, page, pageSize)
  searchStores(
    postalCode,
    city,
    state,
    useCurrentLocation,
    latitude,
    longitude,
    radiusMiles,
    hasPharmacy,
    hasBakery,
    hasCafe,
    isOpen24Hours,
    openNow,
    sortBy = "distance",
    page = 1,
    pageSize = 20
  ) {
    let stores = this._getFromStorage("stores");

    if (postalCode) {
      stores = stores.filter((s) => s.postalCode === postalCode);
    }
    if (city) {
      const c = city.toLowerCase();
      stores = stores.filter((s) => (s.city || "").toLowerCase() === c);
    }
    if (state) {
      const st = state.toLowerCase();
      stores = stores.filter((s) => (s.state || "").toLowerCase() === st);
    }

    if (typeof hasPharmacy === "boolean") {
      stores = stores.filter((s) => !!s.hasPharmacy === hasPharmacy);
    }
    if (typeof hasBakery === "boolean") {
      stores = stores.filter((s) => !!s.hasBakery === hasBakery);
    }
    if (typeof hasCafe === "boolean") {
      stores = stores.filter((s) => !!s.hasCafe === hasCafe);
    }
    if (typeof isOpen24Hours === "boolean") {
      stores = stores.filter((s) => !!s.isOpen24Hours === isOpen24Hours);
    }

    if (typeof radiusMiles === "number") {
      stores = stores.filter((s) => {
        if (typeof s.distanceMiles === "number") {
          return s.distanceMiles <= radiusMiles;
        }
        return true;
      });
    }

    if (openNow) {
      const hours = this._getFromStorage("store_service_hours");
      const today = this._getTodayDayOfWeek();
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      stores = stores.filter((store) => {
        if (store.isOpen24Hours) return true;
        const serviceHours = hours.find(
          (h) =>
            h.storeId === store.id &&
            h.serviceType === "store" &&
            h.dayOfWeek === today
        );
        if (!serviceHours || serviceHours.isClosed) return false;
        if (serviceHours.is24Hours) return true;
        const [openH, openM] = serviceHours.opensAt.split(":").map((n) => parseInt(n, 10));
        const [closeH, closeM] = serviceHours.closesAt.split(":").map((n) => parseInt(n, 10));
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;
        return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
      });
    }

    if (sortBy === "name") {
      stores.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else {
      stores.sort((a, b) => {
        const da = typeof a.distanceMiles === "number" ? a.distanceMiles : Number.MAX_VALUE;
        const db = typeof b.distanceMiles === "number" ? b.distanceMiles : Number.MAX_VALUE;
        if (da === db) return (a.name || "").localeCompare(b.name || "");
        return da - db;
      });
    }

    const totalResults = stores.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pagedStores = stores.slice(start, end);

    // Instrumentation for task completion tracking (task_5 - store search params)
    try {
      if (
        postalCode === "94105" &&
        typeof radiusMiles === "number" &&
        radiusMiles <= 30 &&
        hasBakery === true &&
        hasCafe === true &&
        isOpen24Hours === true
        // sortBy is optional; no strict requirement
      ) {
        localStorage.setItem(
          "task5_storeSearchParams",
          JSON.stringify({
            postalCode,
            radiusMiles,
            hasBakery,
            hasCafe,
            isOpen24Hours,
            sortBy
          })
        );
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      stores: pagedStores,
      totalResults,
      page,
      pageSize,
      appliedFilters: {
        postalCode: postalCode || null,
        radiusMiles: typeof radiusMiles === "number" ? radiusMiles : null,
        hasPharmacy: typeof hasPharmacy === "boolean" ? hasPharmacy : null,
        hasBakery: typeof hasBakery === "boolean" ? hasBakery : null,
        hasCafe: typeof hasCafe === "boolean" ? hasCafe : null,
        isOpen24Hours: typeof isOpen24Hours === "boolean" ? isOpen24Hours : null,
        openNow: !!openNow,
        sortBy
      }
    };
  }

  // getStoreDetails(storeId)
  getStoreDetails(storeId) {
    const stores = this._getFromStorage("stores");
    const store = stores.find((s) => s.id === storeId) || null;
    if (!store) {
      return {
        store: null,
        todayHoursSummary: "",
        pharmacyWeekdayHoursSummary: "",
        amenities: [],
        mapSummary: {
          latitude: null,
          longitude: null,
          staticMapLabel: ""
        }
      };
    }
    const hours = this._getFromStorage("store_service_hours");
    const today = this._getTodayDayOfWeek();

    let todayHoursSummary = "";
    const todayStoreHours = hours.find(
      (h) =>
        h.storeId === store.id &&
        h.serviceType === "store" &&
        h.dayOfWeek === today
    );
    if (store.isOpen24Hours || (todayStoreHours && todayStoreHours.is24Hours)) {
      todayHoursSummary = "Open 24 hours";
    } else if (todayStoreHours && !todayStoreHours.isClosed) {
      const open = this._formatTime12h(todayStoreHours.opensAt);
      const close = this._formatTime12h(todayStoreHours.closesAt);
      todayHoursSummary = "Open today " + (open || "") + "  " + (close || "");
    }

    const weekdayDays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const weekdayPharmacyHours = hours.filter(
      (h) =>
        h.storeId === store.id &&
        h.serviceType === "pharmacy" &&
        weekdayDays.indexOf(h.dayOfWeek) !== -1 &&
        !h.isClosed
    );
    let pharmacyWeekdayHoursSummary = "";
    if (weekdayPharmacyHours.length > 0) {
      let latestClose = "00:00";
      weekdayPharmacyHours.forEach((h) => {
        if (h.is24Hours) {
          latestClose = "23:59";
        } else if (h.closesAt > latestClose) {
          latestClose = h.closesAt;
        }
      });
      const close12 = this._formatTime12h(latestClose);
      if (close12) {
        pharmacyWeekdayHoursSummary = "Pharmacy: MonFri until " + close12;
      }
    }

    const amenities = [];
    if (store.hasPharmacy) amenities.push("Pharmacy");
    if (store.hasBakery) amenities.push("Bakery");
    if (store.hasCafe) amenities.push("Caf e9");
    if (store.isOpen24Hours) amenities.push("Open 24 hours");

    const mapSummary = {
      latitude: typeof store.latitude === "number" ? store.latitude : null,
      longitude: typeof store.longitude === "number" ? store.longitude : null,
      staticMapLabel: store.name + "  " + (store.city || "")
    };

    // Instrumentation for task completion tracking (task_5 - selected store)
    try {
      const isInZip94105 = store.postalCode === "94105";
      const hasBakeryCafe24 =
        store.hasBakery === true &&
        store.hasCafe === true &&
        store.isOpen24Hours === true;
      let withinRadius = true;
      if (typeof store.distanceMiles === "number") {
        withinRadius = store.distanceMiles <= 30;
      }
      if (isInZip94105 && hasBakeryCafe24 && withinRadius) {
        localStorage.setItem("task5_selectedStoreId", store.id);
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      store,
      todayHoursSummary,
      pharmacyWeekdayHoursSummary,
      amenities,
      mapSummary
    };
  }

  // getStoreServiceHours(storeId)
  getStoreServiceHours(storeId) {
    const hours = this._getFromStorage("store_service_hours");
    const stores = this._getFromStorage("stores");
    const store = stores.find((s) => s.id === storeId) || null;
    return hours
      .filter((h) => h.storeId === storeId)
      .map((h) => ({
        ...h,
        store
      }));
  }

  // getHomepageContent()
  getHomepageContent() {
    const preferredSummary = this.getPreferredStoreSummary();
    const categories = this._getFromStorage("categories");
    const products = this._getFromStorage("products");
    const weeklyAds = this._getFromStorage("weekly_ads");
    const weeklyAdItems = this._getFromStorage("weekly_ad_items");

    const featuredCategories = categories
      .filter((c) => !c.parentCategoryId)
      .sort((a, b) => {
        const da = typeof a.displayOrder === "number" ? a.displayOrder : 0;
        const db = typeof b.displayOrder === "number" ? b.displayOrder : 0;
        return da - db;
      });

    let weeklyGroceryHighlights = [];
    if (preferredSummary.hasPreferredStore && preferredSummary.store) {
      const now = new Date();
      const storeId = preferredSummary.store.id;
      const adsForStore = weeklyAds.filter((ad) => ad.storeId === storeId);
      const currentAd =
        adsForStore.find((ad) => {
          const start = this._parseDate(ad.startDate);
          const end = this._parseDate(ad.endDate);
          if (!start || !end) return false;
          return start <= now && now <= end;
        }) || adsForStore[0];
      if (currentAd) {
        const itemsForAd = weeklyAdItems.filter(
          (item) =>
            item.weeklyAdId === currentAd.id &&
            item.categoryKey === "grocery"
        );
        weeklyGroceryHighlights = itemsForAd.slice(0, 10).map((wai) => {
          const product = products.find((p) => p.id === wai.productId) || null;
          return { weeklyAdItem: wai, product };
        });
      }
    }

    const featuredElectronics = products.filter(
      (p) =>
        (p.categoryKey === "electronics" || p.categoryKey === "tvs") &&
        p.status === "active"
    );
    const featuredHomeCleaning = products.filter(
      (p) =>
        (p.categoryKey === "home_cleaning" ||
          p.categoryKey === "cleaning_supplies" ||
          p.categoryKey === "household_cleaning") &&
        p.status === "active"
    );

    return {
      preferredStore: preferredSummary,
      featuredCategories,
      weeklyGroceryHighlights,
      featuredElectronics,
      featuredHomeCleaning
    };
  }

  // getTopLevelCategories()
  getTopLevelCategories() {
    const categories = this._getFromStorage("categories");
    return categories.filter((c) => !c.parentCategoryId);
  }

  // getChildCategories(parentCategoryId)
  getChildCategories(parentCategoryId) {
    const categories = this._getFromStorage("categories");
    return categories.filter((c) => c.parentCategoryId === parentCategoryId);
  }

  // getWeeklyAdForStore(storeId)
  getWeeklyAdForStore(storeId) {
    const weeklyAds = this._getFromStorage("weekly_ads");
    const stores = this._getFromStorage("stores");
    const store = stores.find((s) => s.id === storeId) || null;
    const now = new Date();
    const adsForStore = weeklyAds.filter((ad) => ad.storeId === storeId);
    let weeklyAd = null;
    let isCurrentAd = false;
    if (adsForStore.length > 0) {
      weeklyAd =
        adsForStore.find((ad) => {
          const start = this._parseDate(ad.startDate);
          const end = this._parseDate(ad.endDate);
          if (!start || !end) return false;
          return start <= now && now <= end;
        }) ||
        adsForStore
          .slice()
          .sort((a, b) => {
            const sa = this._parseDate(a.startDate) || new Date(0);
            const sb = this._parseDate(b.startDate) || new Date(0);
            return sb - sa;
          })[0];
      const start = this._parseDate(weeklyAd.startDate);
      const end = this._parseDate(weeklyAd.endDate);
      isCurrentAd = !!(start && end && start <= now && now <= end);
    }
    return {
      weeklyAd,
      store,
      isCurrentAd
    };
  }

  // getWeeklyAdItems(weeklyAdId, categoryKey, minPrice, maxPrice, sortBy, page, pageSize)
  getWeeklyAdItems(
    weeklyAdId,
    categoryKey,
    minPrice,
    maxPrice,
    sortBy = "relevance",
    page = 1,
    pageSize = 24
  ) {
    const weeklyAdItems = this._getFromStorage("weekly_ad_items");
    const products = this._getFromStorage("products");

    let items = weeklyAdItems.filter((i) => i.weeklyAdId === weeklyAdId);
    if (categoryKey) {
      items = items.filter(
        (i) =>
          i.categoryKey === categoryKey ||
          (!i.categoryKey &&
            products.some(
              (p) => p.id === i.productId && p.categoryKey === categoryKey
            ))
      );
    }
    if (typeof minPrice === "number") {
      items = items.filter((i) => i.salePrice >= minPrice);
    }
    if (typeof maxPrice === "number") {
      items = items.filter((i) => i.salePrice <= maxPrice);
    }

    if (sortBy === "price_low_to_high") {
      items.sort((a, b) => a.salePrice - b.salePrice);
    } else if (sortBy === "price_high_to_low") {
      items.sort((a, b) => b.salePrice - a.salePrice);
    }

    const totalResults = items.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = items.slice(start, end).map((wai) => {
      const product = products.find((p) => p.id === wai.productId) || null;
      return { weeklyAdItem: wai, product };
    });

    return {
      items: paged,
      totalResults,
      page,
      pageSize
    };
  }

  // getWeeklyAdItemDetails(weeklyAdItemId)
  getWeeklyAdItemDetails(weeklyAdItemId) {
    const weeklyAdItems = this._getFromStorage("weekly_ad_items");
    const products = this._getFromStorage("products");
    const weeklyAdItem = weeklyAdItems.find((i) => i.id === weeklyAdItemId) || null;
    const product = weeklyAdItem
      ? products.find((p) => p.id === weeklyAdItem.productId) || null
      : null;
    return {
      weeklyAdItem,
      product
    };
  }

  // getProductFilterOptions(contextType, categoryId, query)
  getProductFilterOptions(contextType, categoryId, query) {
    let products = this._getFromStorage("products");
    const categories = this._getFromStorage("categories");

    if (contextType === "category" && categoryId) {
      const categoryIds = this._expandCategoryIds(categoryId, categories);
      products = products.filter((p) => categoryIds.indexOf(p.categoryId) !== -1);
    } else if (contextType === "search" && query) {
      const q = query.toLowerCase();
      products = products.filter(
        (p) =>
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    let minPrice = null;
    let maxPrice = null;
    products.forEach((p) => {
      const price = typeof p.salePrice === "number" ? p.salePrice : p.regularPrice;
      if (typeof price !== "number") return;
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
    });
    const priceRanges = [];
    if (minPrice !== null && maxPrice !== null && minPrice < maxPrice) {
      const step = (maxPrice - minPrice) / 4 || maxPrice;
      let start = minPrice;
      for (let i = 0; i < 4; i++) {
        const end = i === 3 ? maxPrice : start + step;
        priceRanges.push({
          label: "$" + start.toFixed(2) + " - $" + end.toFixed(2),
          min: start,
          max: end
        });
        start = end;
      }
    }

    const ratingOptions = [
      { minRating: 4, label: "4 stars & up" },
      { minRating: 3, label: "3 stars & up" },
      { minRating: 2, label: "2 stars & up" }
    ];

    const fulfillmentOptions = [
      { key: "same_day_pickup", label: "Same-day pickup" },
      { key: "scheduled_pickup", label: "Scheduled pickup" },
      { key: "standard_pickup", label: "Standard pickup" }
    ];

    const attributeFilters = [
      { key: "eco_friendly", label: "Eco friendly" },
      { key: "fragrance_free", label: "Fragrance free" }
    ];

    return {
      priceRanges,
      ratingOptions,
      fulfillmentOptions,
      attributeFilters
    };
  }

  // getCategoryProducts(...)
  getCategoryProducts(
    categoryId,
    minPrice,
    maxPrice,
    minRating,
    isEcoFriendly,
    isFragranceFree,
    fulfillmentOptions,
    screenSizeMin,
    screenSizeMax,
    sortBy = "relevance",
    page = 1,
    pageSize = 24
  ) {
    const categories = this._getFromStorage("categories");
    const products = this._getFromStorage("products");
    const availabilities = this._getFromStorage("product_store_availabilities");
    const preferredStore = this._getPreferredStore();

    const category = categories.find((c) => c.id === categoryId) || null;
    const categoryIds = this._expandCategoryIds(categoryId, categories);

    let filtered = products.filter(
      (p) => categoryIds.indexOf(p.categoryId) !== -1 && p.status === "active"
    );

    filtered = filtered.filter((p) => {
      const price = typeof p.salePrice === "number" ? p.salePrice : p.regularPrice;
      if (typeof price !== "number") return false;
      if (typeof minPrice === "number" && price < minPrice) return false;
      if (typeof maxPrice === "number" && price > maxPrice) return false;
      if (typeof minRating === "number") {
        if (typeof p.rating !== "number" || p.rating < minRating) return false;
      }
      if (typeof isEcoFriendly === "boolean" && !!p.isEcoFriendly !== isEcoFriendly) return false;
      if (typeof isFragranceFree === "boolean" && !!p.isFragranceFree !== isFragranceFree) return false;
      if (typeof screenSizeMin === "number" && typeof p.screenSizeInches === "number") {
        if (p.screenSizeInches < screenSizeMin) return false;
      }
      if (typeof screenSizeMax === "number" && typeof p.screenSizeInches === "number") {
        if (p.screenSizeInches > screenSizeMax) return false;
      }
      return true;
    });

    if (Array.isArray(fulfillmentOptions) && fulfillmentOptions.length > 0) {
      filtered = filtered.filter((p) => {
        const avs = availabilities.filter((a) => a.productId === p.id && a.isAvailable);
        if (avs.length === 0) {
          // Fallback to product-level fulfillment tags when no availability records exist
          return fulfillmentOptions.every((opt) => {
            if (opt === "same_day_pickup") {
              return (
                !!p.isEligibleSameDayPickup ||
                (Array.isArray(p.fulfillmentTags) &&
                  p.fulfillmentTags.indexOf("same_day_pickup") !== -1)
              );
            }
            return Array.isArray(p.fulfillmentTags)
              ? p.fulfillmentTags.indexOf(opt) !== -1
              : false;
          });
        }
        return avs.some((a) =>
          fulfillmentOptions.every((opt) => {
            if (opt === "same_day_pickup") {
              return a.sameDayPickupAvailable;
            }
            return Array.isArray(a.fulfillmentOptions)
              ? a.fulfillmentOptions.indexOf(opt) !== -1
              : false;
          })
        );
      });
    }

    if (sortBy === "price_low_to_high") {
      filtered.sort((a, b) => {
        const pa = typeof a.salePrice === "number" ? a.salePrice : a.regularPrice;
        const pb = typeof b.salePrice === "number" ? b.salePrice : b.regularPrice;
        return pa - pb;
      });
    } else if (sortBy === "price_high_to_low") {
      filtered.sort((a, b) => {
        const pa = typeof a.salePrice === "number" ? a.salePrice : a.regularPrice;
        const pb = typeof b.salePrice === "number" ? b.salePrice : b.regularPrice;
        return pb - pa;
      });
    } else if (sortBy === "rating_desc") {
      filtered.sort((a, b) => {
        const ra = typeof a.rating === "number" ? a.rating : 0;
        const rb = typeof b.rating === "number" ? b.rating : 0;
        return rb - ra;
      });
    }

    const totalResults = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = filtered.slice(start, end).map((product) => {
      let availabilitySummary = {
        isAvailableAtPreferredStore: false,
        sameDayPickupAvailable: false
      };
      if (preferredStore) {
        const av = availabilities.find(
          (a) => a.productId === product.id && a.storeId === preferredStore.id
        );
        if (av) {
          availabilitySummary = {
            isAvailableAtPreferredStore: !!av.isAvailable,
            sameDayPickupAvailable: !!av.sameDayPickupAvailable
          };
        }
      }
      return { product, availabilitySummary };
    });

    return {
      category,
      products: paged,
      totalResults,
      page,
      pageSize
    };
  }

  // searchProducts(...)
  searchProducts(
    query,
    categoryKey,
    minPrice,
    maxPrice,
    minRating,
    isEcoFriendly,
    isFragranceFree,
    fulfillmentOptions,
    loadCountMin,
    sortBy = "relevance",
    page = 1,
    pageSize = 24
  ) {
    const products = this._getFromStorage("products");
    const availabilities = this._getFromStorage("product_store_availabilities");
    const q = (query || "").toLowerCase().trim();
    const tokens = q.length ? q.split(/\s+/).filter(Boolean) : [];

    let filtered = products.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const description = (p.description || "").toLowerCase();
      const textMatch =
        !tokens.length ||
        tokens.some((token) => name.includes(token) || description.includes(token));
      if (!textMatch) return false;
      if (categoryKey && p.categoryKey !== categoryKey) return false;
      const price = typeof p.salePrice === "number" ? p.salePrice : p.regularPrice;
      if (typeof price !== "number") return false;
      if (typeof minPrice === "number" && price < minPrice) return false;
      if (typeof maxPrice === "number" && price > maxPrice) return false;
      if (typeof minRating === "number") {
        if (
          typeof p.rating === "number" &&
          p.rating > 0 &&
          p.rating < minRating
        ) {
          return false;
        }
      }
      if (typeof isEcoFriendly === "boolean" && !!p.isEcoFriendly !== isEcoFriendly) return false;
      if (typeof isFragranceFree === "boolean" && !!p.isFragranceFree !== isFragranceFree) return false;
      if (typeof loadCountMin === "number") {
        if (typeof p.loadCount === "number" && p.loadCount < loadCountMin) return false;
      }
      return true;
    });

    if (Array.isArray(fulfillmentOptions) && fulfillmentOptions.length > 0) {
      filtered = filtered.filter((p) => {
        const avs = availabilities.filter((a) => a.productId === p.id && a.isAvailable);
        if (avs.length === 0) {
          // Fallback to product-level fulfillment tags when no availability records exist
          return fulfillmentOptions.every((opt) => {
            if (opt === "same_day_pickup") {
              return (
                !!p.isEligibleSameDayPickup ||
                (Array.isArray(p.fulfillmentTags) &&
                  p.fulfillmentTags.indexOf("same_day_pickup") !== -1)
              );
            }
            return Array.isArray(p.fulfillmentTags)
              ? p.fulfillmentTags.indexOf(opt) !== -1
              : false;
          });
        }
        return avs.some((a) =>
          fulfillmentOptions.every((opt) => {
            if (opt === "same_day_pickup") return a.sameDayPickupAvailable;
            return Array.isArray(a.fulfillmentOptions)
              ? a.fulfillmentOptions.indexOf(opt) !== -1
              : false;
          })
        );
      });
    }

    if (sortBy === "price_low_to_high") {
      filtered.sort((a, b) => {
        const pa = typeof a.salePrice === "number" ? a.salePrice : a.regularPrice;
        const pb = typeof b.salePrice === "number" ? b.salePrice : b.regularPrice;
        return pa - pb;
      });
    } else if (sortBy === "price_high_to_low") {
      filtered.sort((a, b) => {
        const pa = typeof a.salePrice === "number" ? a.salePrice : a.regularPrice;
        const pb = typeof b.salePrice === "number" ? b.salePrice : b.regularPrice;
        return pb - pa;
      });
    } else if (sortBy === "rating_desc") {
      filtered.sort((a, b) => {
        const ra = typeof a.rating === "number" ? a.rating : 0;
        const rb = typeof b.rating === "number" ? b.rating : 0;
        return rb - ra;
      });
    }

    const totalResults = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paged = filtered.slice(start, end);

    const appliedFilters = {
      categoryKey: categoryKey || null,
      minPrice: typeof minPrice === "number" ? minPrice : null,
      maxPrice: typeof maxPrice === "number" ? maxPrice : null,
      minRating: typeof minRating === "number" ? minRating : null,
      isEcoFriendly: typeof isEcoFriendly === "boolean" ? isEcoFriendly : null,
      isFragranceFree: typeof isFragranceFree === "boolean" ? isFragranceFree : null,
      fulfillmentOptions: Array.isArray(fulfillmentOptions) ? fulfillmentOptions : []
    };

    return {
      products: paged,
      totalResults,
      page,
      pageSize,
      appliedFilters
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage("products");
    const categories = this._getFromStorage("categories");
    const stores = this._getFromStorage("stores");
    const availabilities = this._getFromStorage("product_store_availabilities");

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        ratingSummary: {
          averageRating: null,
          ratingCount: 0,
          reviewCount: 0
        },
        specifications: {
          screenSizeInches: null,
          hdmiPortCount: null,
          loadCount: null,
          sizeDescription: null,
          unitOfMeasure: null
        },
        preferredStoreAvailability: null,
        otherStoreAvailability: []
      };
    }
    const category = categories.find((c) => c.id === product.categoryId) || null;
    const ratingSummary = {
      averageRating: typeof product.rating === "number" ? product.rating : null,
      ratingCount: typeof product.ratingCount === "number" ? product.ratingCount : 0,
      reviewCount: typeof product.reviewCount === "number" ? product.reviewCount : 0
    };
    const specifications = {
      screenSizeInches:
        typeof product.screenSizeInches === "number" ? product.screenSizeInches : null,
      hdmiPortCount: typeof product.hdmiPortCount === "number" ? product.hdmiPortCount : null,
      loadCount: typeof product.loadCount === "number" ? product.loadCount : null,
      sizeDescription: product.sizeDescription || null,
      unitOfMeasure: product.unitOfMeasure || null
    };

    const preferredConfig = this._getPreferredStoreConfig();
    let preferredStoreAvailability = null;
    if (preferredConfig) {
      const store = stores.find((s) => s.id === preferredConfig.storeId) || null;
      if (store) {
        const availability =
          availabilities.find(
            (a) => a.productId === product.id && a.storeId === store.id
          ) || null;
        if (availability) {
          preferredStoreAvailability = { store, availability };
        }
      }
    }

    const otherStoreAvailability = stores
      .map((s) => {
        const availability = availabilities.find(
          (a) => a.productId === product.id && a.storeId === s.id
        );
        if (!availability) return null;
        if (preferredStoreAvailability && preferredStoreAvailability.store.id === s.id) {
          return null;
        }
        return { store: s, availability };
      })
      .filter(Boolean);

    return {
      product,
      category,
      ratingSummary,
      specifications,
      preferredStoreAvailability,
      otherStoreAvailability
    };
  }

  // addToCart(productId, quantity = 1, storeId, fulfillmentType = 'same_day_pickup')
  addToCart(productId, quantity = 1, storeId, fulfillmentType = "same_day_pickup") {
    const products = this._getFromStorage("products");
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        cart: null,
        addedItem: null,
        message: "Product not found"
      };
    }
    const carts = this._getFromStorage("cart");
    const existingCart = carts.find((c) => c.status === "open") || null;
    const resolvedStore = this._resolvePickupStore(
      storeId,
      existingCart ? existingCart.storeId : null,
      null
    );
    const pickupStoreId = resolvedStore ? resolvedStore.id : null;

    const cart = this._getOrCreateCart(pickupStoreId, fulfillmentType);
    const cartItems = this._getFromStorage("cart_items");

    const unitPrice =
      typeof product.salePrice === "number" && product.isOnSale
        ? product.salePrice
        : product.regularPrice;
    const qty = quantity > 0 ? quantity : 1;
    const totalPrice = unitPrice * qty;

    const newItem = {
      id: this._generateId("cart_item"),
      cartId: cart.id,
      productId: product.id,
      quantity: qty,
      unitPrice,
      totalPrice,
      addedAt: new Date().toISOString(),
      fulfillmentType: fulfillmentType || cart.fulfillmentType || "same_day_pickup",
      pickupStoreId
    };

    cartItems.push(newItem);
    this._saveToStorage("cart_items", cartItems);

    cart.items = Array.isArray(cart.items) ? cart.items : [];
    cart.items.push(newItem.id);
    this._recalculateCartTotals(cart);

    return {
      success: true,
      cart,
      addedItem: newItem,
      message: "Item added to cart"
    };
  }

  // getCart()
  getCart() {
    const carts = this._getFromStorage("cart");
    const cart = carts.find((c) => c.status === "open") || null;
    const cartItems = this._getFromStorage("cart_items");
    const products = this._getFromStorage("products");
    const stores = this._getFromStorage("stores");

    if (!cart) {
      return {
        cart: null,
        items: [],
        store: null
      };
    }

    const itemsForCart = cartItems
      .filter((ci) => ci.cartId === cart.id)
      .map((ci) => {
        const product = products.find((p) => p.id === ci.productId) || null;
        const pickupStore = ci.pickupStoreId
          ? stores.find((s) => s.id === ci.pickupStoreId) || null
          : null;
        return {
          item: { ...ci, pickupStore },
          product
        };
      });
    const store = cart.storeId
      ? stores.find((s) => s.id === cart.storeId) || null
      : null;

    return {
      cart,
      items: itemsForCart,
      store
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage("cart_items");
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cart: null,
        updatedItem: null,
        message: "Cart item not found"
      };
    }
    if (quantity <= 0) {
      return this.removeCartItem(cartItemId);
    }
    const item = cartItems[idx];
    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;
    item.addedAt = item.addedAt || new Date().toISOString();
    cartItems[idx] = item;
    this._saveToStorage("cart_items", cartItems);

    const carts = this._getFromStorage("cart");
    const cart = carts.find((c) => c.id === item.cartId) || null;
    if (cart) {
      this._recalculateCartTotals(cart);
    }

    return {
      success: true,
      cart,
      updatedItem: item,
      message: "Cart item updated"
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage("cart_items");
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cart: null,
        removedItemId: null,
        message: "Cart item not found"
      };
    }
    const item = cartItems[idx];
    cartItems.splice(idx, 1);
    this._saveToStorage("cart_items", cartItems);

    const carts = this._getFromStorage("cart");
    const cart = carts.find((c) => c.id === item.cartId) || null;
    if (cart) {
      cart.items = Array.isArray(cart.items)
        ? cart.items.filter((id) => id !== cartItemId)
        : [];
      this._recalculateCartTotals(cart);
    }

    return {
      success: true,
      cart,
      removedItemId: cartItemId,
      message: "Cart item removed"
    };
  }

  // setCartFulfillment(storeId, fulfillmentType)
  setCartFulfillment(storeId, fulfillmentType) {
    if (!fulfillmentType) {
      return {
        success: false,
        cart: null,
        message: "fulfillmentType is required"
      };
    }
    const carts = this._getFromStorage("cart");
    let cart = carts.find((c) => c.status === "open") || null;
    const resolvedStore = this._resolvePickupStore(
      storeId,
      cart ? cart.storeId : null,
      null
    );
    const storeIdToUse = resolvedStore ? resolvedStore.id : null;

    if (!cart) {
      cart = this._getOrCreateCart(storeIdToUse, fulfillmentType);
    } else {
      cart.storeId = storeIdToUse;
      cart.fulfillmentType = fulfillmentType;
      cart.updatedAt = new Date().toISOString();
      const idx = carts.findIndex((c) => c.id === cart.id);
      if (idx !== -1) {
        carts[idx] = cart;
        this._saveToStorage("cart", carts);
      }
    }
    return {
      success: true,
      cart,
      message: "Cart fulfillment updated"
    };
  }

  // addProductToShoppingList(...)
  addProductToShoppingList(
    productId,
    quantity = 1,
    shoppingListId,
    source = "product_detail",
    notes,
    weeklyAdItemId
  ) {
    const products = this._getFromStorage("products");
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        shoppingListId: null,
        item: null,
        message: "Product not found"
      };
    }
    const lists = this._getFromStorage("shopping_lists");
    let list = null;
    if (shoppingListId) {
      list = lists.find((l) => l.id === shoppingListId) || null;
    }
    if (!list) {
      list = this._getOrCreateDefaultShoppingList();
    }

    const shoppingListItems = this._getFromStorage("shopping_list_items");
    const unitPrice =
      typeof product.salePrice === "number" && product.isOnSale
        ? product.salePrice
        : product.regularPrice;
    const qty = quantity > 0 ? quantity : 1;
    const totalPrice =
      typeof unitPrice === "number" ? unitPrice * qty : null;

    const newItem = {
      id: this._generateId("shopping_list_item"),
      shoppingListId: list.id,
      productId: product.id,
      quantity: qty,
      unitPrice: unitPrice != null ? unitPrice : null,
      totalPrice,
      addedAt: new Date().toISOString(),
      source,
      notes: notes || null,
      weeklyAdItemId: weeklyAdItemId || null
    };

    shoppingListItems.push(newItem);
    this._saveToStorage("shopping_list_items", shoppingListItems);

    this._recalculateShoppingListSubtotal(list);

    return {
      success: true,
      shoppingListId: list.id,
      item: newItem,
      message: "Item added to shopping list"
    };
  }

  // getShoppingList(shoppingListId)
  getShoppingList(shoppingListId) {
    const lists = this._getFromStorage("shopping_lists");
    const products = this._getFromStorage("products");
    const stores = this._getFromStorage("stores");
    let list = null;
    if (shoppingListId) {
      list = lists.find((l) => l.id === shoppingListId) || null;
    }
    if (!list) {
      list = this._getOrCreateDefaultShoppingList();
    }

    const itemsAll = this._getFromStorage("shopping_list_items");
    const listItems = itemsAll
      .filter((i) => i.shoppingListId === list.id)
      .map((i) => {
        const product = products.find((p) => p.id === i.productId) || null;
        return { item: i, product };
      });

    const estimatedSubtotal = typeof list.subtotal === "number" ? list.subtotal : 0;
    const store = list.storeId
      ? stores.find((s) => s.id === list.storeId) || null
      : null;

    return {
      shoppingList: list,
      items: listItems,
      estimatedSubtotal,
      store
    };
  }

  // updateShoppingListItem(shoppingListItemId, quantity, notes)
  updateShoppingListItem(shoppingListItemId, quantity, notes) {
    const shoppingListItems = this._getFromStorage("shopping_list_items");
    const idx = shoppingListItems.findIndex((i) => i.id === shoppingListItemId);
    if (idx === -1) {
      return {
        success: false,
        shoppingList: null,
        updatedItem: null,
        estimatedSubtotal: 0,
        message: "Shopping list item not found"
      };
    }
    const item = shoppingListItems[idx];
    if (typeof quantity === "number") {
      if (quantity <= 0) {
        return this.removeShoppingListItem(shoppingListItemId);
      }
      item.quantity = quantity;
      if (typeof item.unitPrice === "number") {
        item.totalPrice = item.unitPrice * quantity;
      }
    }
    if (typeof notes === "string") {
      item.notes = notes;
    }
    shoppingListItems[idx] = item;
    this._saveToStorage("shopping_list_items", shoppingListItems);

    const lists = this._getFromStorage("shopping_lists");
    const list = lists.find((l) => l.id === item.shoppingListId) || null;
    let estimatedSubtotal = 0;
    if (list) {
      estimatedSubtotal = this._recalculateShoppingListSubtotal(list);
    }

    return {
      success: true,
      shoppingList: list,
      updatedItem: item,
      estimatedSubtotal,
      message: "Shopping list item updated"
    };
  }

  // removeShoppingListItem(shoppingListItemId)
  removeShoppingListItem(shoppingListItemId) {
    const shoppingListItems = this._getFromStorage("shopping_list_items");
    const idx = shoppingListItems.findIndex((i) => i.id === shoppingListItemId);
    if (idx === -1) {
      return {
        success: false,
        shoppingList: null,
        removedItemId: null,
        estimatedSubtotal: 0,
        message: "Shopping list item not found"
      };
    }
    const item = shoppingListItems[idx];
    shoppingListItems.splice(idx, 1);
    this._saveToStorage("shopping_list_items", shoppingListItems);

    const lists = this._getFromStorage("shopping_lists");
    const list = lists.find((l) => l.id === item.shoppingListId) || null;
    let estimatedSubtotal = 0;
    if (list) {
      estimatedSubtotal = this._recalculateShoppingListSubtotal(list);
    }

    return {
      success: true,
      shoppingList: list,
      removedItemId: shoppingListItemId,
      estimatedSubtotal,
      message: "Shopping list item removed"
    };
  }

  // moveShoppingListItemsToCart(shoppingListId, itemIds, fulfillmentType, storeId)
  moveShoppingListItemsToCart(
    shoppingListId,
    itemIds,
    fulfillmentType,
    storeId
  ) {
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return {
        success: false,
        cart: null,
        movedItemIds: [],
        message: "No items specified"
      };
    }
    const lists = this._getFromStorage("shopping_lists");
    let list = null;
    if (shoppingListId) {
      list = lists.find((l) => l.id === shoppingListId) || null;
    }
    if (!list) {
      list = this._getOrCreateDefaultShoppingList();
    }

    const shoppingListItems = this._getFromStorage("shopping_list_items");
    const products = this._getFromStorage("products");

    const resolvedStore = this._resolvePickupStore(
      storeId,
      null,
      list.storeId || null
    );
    const pickupStoreId = resolvedStore ? resolvedStore.id : null;
    const cart = this._getOrCreateCart(pickupStoreId, fulfillmentType);

    const cartItems = this._getFromStorage("cart_items");
    const movedIds = [];

    itemIds.forEach((id) => {
      const idx = shoppingListItems.findIndex((i) => i.id === id);
      if (idx === -1) return;
      const listItem = shoppingListItems[idx];
      const product = products.find((p) => p.id === listItem.productId) || null;
      if (!product) return;

      const unitPrice =
        typeof product.salePrice === "number" && product.isOnSale
          ? product.salePrice
          : product.regularPrice;
      const qty = listItem.quantity > 0 ? listItem.quantity : 1;
      const totalPrice = unitPrice * qty;

      const newCartItem = {
        id: this._generateId("cart_item"),
        cartId: cart.id,
        productId: product.id,
        quantity: qty,
        unitPrice,
        totalPrice,
        addedAt: new Date().toISOString(),
        fulfillmentType: fulfillmentType || cart.fulfillmentType || "same_day_pickup",
        pickupStoreId
      };
      cartItems.push(newCartItem);
      cart.items = Array.isArray(cart.items) ? cart.items : [];
      cart.items.push(newCartItem.id);

      shoppingListItems.splice(idx, 1);
      movedIds.push(id);
    });

    this._saveToStorage("cart_items", cartItems);
    this._saveToStorage("shopping_list_items", shoppingListItems);
    this._recalculateCartTotals(cart);
    this._recalculateShoppingListSubtotal(list);

    return {
      success: true,
      cart,
      movedItemIds: movedIds,
      message: "Items moved to cart"
    };
  }

  // saveFavoriteItem(productId)
  saveFavoriteItem(productId) {
    const products = this._getFromStorage("products");
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        favoriteItem: null,
        message: "Product not found"
      };
    }
    const favorites = this._getFromStorage("favorite_items");
    let favorite = favorites.find((f) => f.productId === productId) || null;
    if (!favorite) {
      favorite = {
        id: this._generateId("favorite_item"),
        productId,
        addedAt: new Date().toISOString()
      };
      favorites.push(favorite);
      this._saveToStorage("favorite_items", favorites);
    }
    return {
      success: true,
      favoriteItem: favorite,
      message: "Item saved to favorites"
    };
  }

  // getFavoriteItems()
  getFavoriteItems() {
    const favorites = this._getFromStorage("favorite_items");
    const products = this._getFromStorage("products");
    const items = favorites.map((f) => {
      const product = products.find((p) => p.id === f.productId) || null;
      return { favorite: f, product };
    });
    return { items };
  }

  // getLoyaltyProgramInfo()
  getLoyaltyProgramInfo() {
    return {
      headline: "Join Our Rewards Program",
      description:
        "Earn points every time you shop in-store. Redeem rewards on groceries, electronics, home & kitchen, and more.",
      benefits: [
        {
          title: "Earn points on every purchase",
          description: "Get closer to rewards every time you shop with us."
        },
        {
          title: "Member-only offers",
          description: "Access weekly deals and personalized discounts."
        },
        {
          title: "Birthday bonus",
          description: "Enjoy a special reward during your birthday month."
        }
      ],
      faqItems: [
        {
          question: "Does it cost anything to join?",
          answer: "No, enrollment in our rewards program is free."
        },
        {
          question: "How do I earn points?",
          answer:
            "Provide your loyalty email or phone number at checkout to earn points on eligible purchases."
        }
      ]
    };
  }

  // enrollInLoyaltyProgram(...)
  enrollInLoyaltyProgram(
    firstName,
    lastName,
    email,
    mobilePhone,
    postalCode,
    preferredStoreId,
    interestCategories,
    communicationPreferences
  ) {
    const stores = this._getFromStorage("stores");
    const store = stores.find((s) => s.id === preferredStoreId) || null;
    if (!store) {
      return {
        success: false,
        enrollment: null,
        message: "Preferred store not found"
      };
    }

    const enrollments = this._getFromStorage("loyalty_enrollments");
    const enrollment = {
      id: this._generateId("loyalty_enrollment"),
      firstName,
      lastName,
      email,
      mobilePhone,
      postalCode,
      preferredStoreId,
      interestCategories: Array.isArray(interestCategories)
        ? interestCategories
        : [],
      communicationPreferences: Array.isArray(communicationPreferences)
        ? communicationPreferences
        : [],
      enrollmentSource: "website",
      enrollmentDate: new Date().toISOString()
    };
    enrollments.push(enrollment);
    this._saveToStorage("loyalty_enrollments", enrollments);

    this._setPreferredStoreConfig(preferredStoreId);

    return {
      success: true,
      enrollment,
      message: "Enrolled in loyalty program"
    };
  }

  // getContactTopics()
  getContactTopics() {
    return {
      topics: [
        {
          key: "product_demonstration",
          label: "Product Demonstration",
          description: "Request an in-store product demo at your local store."
        },
        {
          key: "order_issue",
          label: "Order Issue",
          description: "Get help with an existing order or pickup."
        },
        {
          key: "store_feedback",
          label: "Store Feedback",
          description: "Share feedback about your in-store experience."
        },
        {
          key: "other",
          label: "Other",
          description: "All other questions and comments."
        }
      ]
    };
  }

  // submitContactRequest(...)
  submitContactRequest(
    topic,
    name,
    email,
    phone,
    storeId,
    requestedDate,
    requestedTime,
    message
  ) {
    const stores = this._getFromStorage("stores");
    const store = stores.find((s) => s.id === storeId) || null;
    if (!store) {
      return {
        success: false,
        contactRequest: null,
        message: "Store not found"
      };
    }
    if (!topic || !name || !email || !message) {
      return {
        success: false,
        contactRequest: null,
        message: "Missing required fields"
      };
    }
    const contactRequests = this._getFromStorage("contact_requests");
    const contactRequest = {
      id: this._generateId("contact_request"),
      topic,
      name,
      email,
      phone: phone || null,
      storeId,
      requestedDate: requestedDate ? new Date(requestedDate).toISOString() : null,
      requestedTime: requestedTime || null,
      message,
      status: "submitted",
      createdAt: new Date().toISOString()
    };
    contactRequests.push(contactRequest);
    this._saveToStorage("contact_requests", contactRequests);

    return {
      success: true,
      contactRequest,
      message: "Contact request submitted"
    };
  }

  // getHelpTopics()
  getHelpTopics() {
    return {
      topics: [
        {
          key: "returns_exchanges",
          label: "Returns & Exchanges",
          description: "Learn about our return and exchange policies.",
          destinationSlug: "returns"
        },
        {
          key: "store_services",
          label: "Store Services",
          description: "Pharmacy, bakery, caf e9, and more.",
          destinationSlug: "store_services"
        },
        {
          key: "orders",
          label: "Orders & Pickup",
          description: "Help with orders, pickup, and payments.",
          destinationSlug: "orders"
        },
        {
          key: "contact_options",
          label: "Contact Us",
          description: "Ways to reach our customer support team.",
          destinationSlug: "contact_us"
        }
      ]
    };
  }

  // getReturnPolicies(channel, category, includeInactive = false)
  getReturnPolicies(channel, category, includeInactive = false) {
    const policies = this._getFromStorage("return_policies");
    const categories = this._getFromStorage("categories");
    let filtered = policies;

    if (channel) {
      filtered = filtered.filter((p) => p.channel === channel);
    }
    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }
    if (!includeInactive) {
      filtered = filtered.filter((p) => p.isActive);
    }

    const augmented = filtered.map((p) => {
      let categoryEntity = null;
      if (p.categoryId) {
        categoryEntity = categories.find((c) => c.id === p.categoryId) || null;
      }
      return { ...p, categoryEntity };
    });

    // Instrumentation for task completion tracking (task_9 - return policies params)
    try {
      const isInStore =
        typeof channel === "string" &&
        channel.toLowerCase() === "in_store";
      const isElectronicsCategory =
        typeof category === "string" &&
        category.toLowerCase().startsWith("electronics");
      if (isInStore && isElectronicsCategory) {
        localStorage.setItem(
          "task9_returnPoliciesParams",
          JSON.stringify({
            channel,
            category,
            includeInactive
          })
        );
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      policies: augmented
    };
  }

  // getReturnPolicyDetails(policyId)
  getReturnPolicyDetails(policyId) {
    const policies = this._getFromStorage("return_policies");
    const categories = this._getFromStorage("categories");
    const policy = policies.find((p) => p.id === policyId) || null;
    if (!policy) return null;
    let categoryEntity = null;
    if (policy.categoryId) {
      categoryEntity = categories.find((c) => c.id === policy.categoryId) || null;
    }

    // Instrumentation for task completion tracking (task_9 - viewed policy)
    try {
      const channel = policy.channel;
      const category = policy.category;
      const isInStore =
        typeof channel === "string" &&
        channel.toLowerCase() === "in_store";
      const isElectronicsCategory =
        typeof category === "string" &&
        category.toLowerCase().startsWith("electronics");
      if (isInStore && isElectronicsCategory && policy.isActive) {
        localStorage.setItem("task9_viewedPolicyId", policy.id);
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return { ...policy, categoryEntity };
  }

  // getAboutUsContent()
  getAboutUsContent() {
    const stores = this._getFromStorage("stores");
    return {
      headline: "About Our Stores",
      historyText:
        "Founded as a single neighborhood market, we have grown into a trusted retail destination for families across the country.",
      missionText:
        "Our mission is to make everyday shopping easier with great value, friendly service, and convenient in-store experiences.",
      coreValues: [
        {
          title: "Customer First",
          description: "We listen, respond, and constantly improve."
        },
        {
          title: "Community",
          description: "We support the communities where we live and work."
        },
        {
          title: "Sustainability",
          description: "We offer eco-friendly products and reduce our footprint."
        }
      ],
      serviceHighlights: [
        "Pharmacy",
        "Bakery",
        "Caf e9",
        "Same-day pickup",
        "Loyalty rewards"
      ],
      storeCount: stores.length,
      serviceAreasDescription:
        "We operate stores in urban, suburban, and rural communities, with convenient locations near where you live and work."
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
