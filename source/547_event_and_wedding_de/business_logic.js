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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const keysWithDefaultArray = [
      "users", // unused but kept from template
      "products",
      "wishlists",
      "carts",
      "cart_items",
      "bookings",
      "consultation_requests",
      "contact_messages",
      "faq_categories",
      "faq_items",
      "promo_codes",
      "compare_lists"
    ];

    keysWithDefaultArray.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }

    // Pointers to current single-user objects
    if (!localStorage.getItem("current_cart_id")) {
      localStorage.setItem("current_cart_id", "");
    }
    if (!localStorage.getItem("current_wishlist_id")) {
      localStorage.setItem("current_wishlist_id", "");
    }
    if (!localStorage.getItem("current_compare_list_id")) {
      localStorage.setItem("current_compare_list_id", "");
    }
  }

  _getFromStorage(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback !== undefined ? fallback : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback !== undefined ? fallback : [];
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

  // -------------------- Generic helpers --------------------

  _parseDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _toISODateString(value) {
    const d = this._parseDate(value);
    if (!d) return null;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  _numberOrZero(val) {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // -------------------- Entity helpers --------------------

  _getProducts() {
    return this._getFromStorage("products", []);
  }

  _saveProducts(products) {
    this._saveToStorage("products", products);
  }

  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage("wishlists", []);
    let currentId = localStorage.getItem("current_wishlist_id") || "";
    let wishlist = wishlists.find((w) => w.id === currentId);
    if (!wishlist) {
      wishlist = {
        id: this._generateId("wishlist"),
        item_ids: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      wishlists.push(wishlist);
      this._saveToStorage("wishlists", wishlists);
      localStorage.setItem("current_wishlist_id", wishlist.id);
    }
    return wishlist;
  }

  _updateWishlist(updatedWishlist) {
    const wishlists = this._getFromStorage("wishlists", []);
    const idx = wishlists.findIndex((w) => w.id === updatedWishlist.id);
    if (idx >= 0) {
      wishlists[idx] = updatedWishlist;
      this._saveToStorage("wishlists", wishlists);
    }
  }

  _getOrCreateCart() {
    const carts = this._getFromStorage("carts", []);
    let currentId = localStorage.getItem("current_cart_id") || "";
    let cart = carts.find((c) => c.id === currentId);
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId("cart"),
        item_ids: [],
        applied_promo_codes: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage("carts", carts);
      localStorage.setItem("current_cart_id", cart.id);
    }
    return cart;
  }

  _updateCart(updatedCart) {
    const carts = this._getFromStorage("carts", []);
    const idx = carts.findIndex((c) => c.id === updatedCart.id);
    if (idx >= 0) {
      carts[idx] = updatedCart;
      this._saveToStorage("carts", carts);
    }
  }

  _getCartItems() {
    return this._getFromStorage("cart_items", []);
  }

  _saveCartItems(cartItems) {
    this._saveToStorage("cart_items", cartItems);
  }

  _getOrCreateCompareList() {
    const compareLists = this._getFromStorage("compare_lists", []);
    let currentId = localStorage.getItem("current_compare_list_id") || "";
    let list = compareLists.find((c) => c.id === currentId);
    if (!list) {
      const now = new Date().toISOString();
      list = {
        id: this._generateId("compare"),
        item_ids: [],
        created_at: now,
        updated_at: now
      };
      compareLists.push(list);
      this._saveToStorage("compare_lists", compareLists);
      localStorage.setItem("current_compare_list_id", list.id);
    }
    return list;
  }

  _updateCompareList(updatedList) {
    const lists = this._getFromStorage("compare_lists", []);
    const idx = lists.findIndex((l) => l.id === updatedList.id);
    if (idx >= 0) {
      lists[idx] = updatedList;
      this._saveToStorage("compare_lists", lists);
    }
  }

  _getPromoCodes() {
    return this._getFromStorage("promo_codes", []);
  }

  // -------------------- Cart discount helper --------------------

  _validatePromoCode(code, cart, cartItems) {
    const promoCodes = this._getPromoCodes();
    const promo = promoCodes.find(
      (p) => typeof p.code === "string" && p.code.toLowerCase() === String(code).toLowerCase()
    );
    if (!promo || promo.is_active === false) {
      return { isValid: false, discountAmount: 0 };
    }

    const now = new Date();
    if (promo.valid_from) {
      const from = this._parseDate(promo.valid_from);
      if (from && now < from) {
        return { isValid: false, discountAmount: 0 };
      }
    }
    if (promo.valid_to) {
      const to = this._parseDate(promo.valid_to);
      if (to && now > to) {
        return { isValid: false, discountAmount: 0 };
      }
    }

    const products = this._getProducts();
    const cartItemEntities = cartItems.filter((ci) => ci.cart_id === cart.id);
    const subtotal = cartItemEntities.reduce((sum, ci) => sum + this._numberOrZero(ci.line_subtotal), 0);

    if (promo.min_subtotal && subtotal < promo.min_subtotal) {
      return { isValid: false, discountAmount: 0 };
    }

    let eligibleAmount = 0;

    if (promo.applies_to_scope === "cart_total") {
      eligibleAmount = subtotal;
    } else if (promo.applies_to_scope === "product_type") {
      const targetType = promo.applies_to_value; // e.g., 'package', 'rental'
      eligibleAmount = cartItemEntities.reduce((sum, ci) => {
        if (ci.product_type === targetType) {
          return sum + this._numberOrZero(ci.line_subtotal);
        }
        return sum;
      }, 0);
    } else if (promo.applies_to_scope === "theme") {
      const targetTheme = promo.applies_to_value; // e.g., 'baby_shower'
      eligibleAmount = cartItemEntities.reduce((sum, ci) => {
        const prod = products.find((p) => p.id === ci.product_id);
        if (prod && prod.theme_tag === targetTheme) {
          return sum + this._numberOrZero(ci.line_subtotal);
        }
        return sum;
      }, 0);
    } else if (promo.applies_to_scope === "category") {
      const target = promo.applies_to_value; // could be add_on_category or rental_subcategory
      eligibleAmount = cartItemEntities.reduce((sum, ci) => {
        const prod = products.find((p) => p.id === ci.product_id);
        if (!prod) return sum;
        if (prod.add_on_category === target || prod.rental_subcategory === target) {
          return sum + this._numberOrZero(ci.line_subtotal);
        }
        return sum;
      }, 0);
    }

    if (eligibleAmount <= 0) {
      return { isValid: false, discountAmount: 0 };
    }

    let discountAmount = 0;
    if (promo.discount_type === "percentage") {
      discountAmount = (eligibleAmount * this._numberOrZero(promo.discount_value)) / 100;
    } else if (promo.discount_type === "fixed_amount") {
      discountAmount = this._numberOrZero(promo.discount_value);
      if (discountAmount > eligibleAmount) {
        discountAmount = eligibleAmount;
      }
    }

    return { isValid: true, discountAmount };
  }

  _recalculateCartTotals(cart, allCartItems) {
    const cartItems = allCartItems.filter((ci) => ci.cart_id === cart.id);
    const subtotal = cartItems.reduce((sum, ci) => sum + this._numberOrZero(ci.line_subtotal), 0);

    let discountTotal = 0;
    if (Array.isArray(cart.applied_promo_codes)) {
      cart.applied_promo_codes.forEach((code) => {
        const { isValid, discountAmount } = this._validatePromoCode(code, cart, allCartItems);
        if (isValid) {
          discountTotal += discountAmount;
        }
      });
    }

    cart.subtotal = subtotal;
    cart.discount_total = discountTotal;
    cart.total = Math.max(subtotal - discountTotal, 0);
    cart.updated_at = new Date().toISOString();
  }

  // -------------------- Homepage & general content --------------------

  getHomepageFeaturedContent() {
    const products = this._getProducts().filter((p) => p.is_active !== false);

    const sectionsMap = {};

    products.forEach((p) => {
      const eventType = p.event_type || "general_event";
      let sectionKey = eventType;
      let sectionTitle;
      if (eventType === "wedding") sectionTitle = "Weddings";
      else if (eventType === "birthday") sectionTitle = "Birthday Parties";
      else if (eventType === "corporate_event") sectionTitle = "Corporate Events";
      else if (eventType === "baby_shower") sectionTitle = "Baby Showers";
      else sectionTitle = "Events";

      if (!sectionsMap[sectionKey]) {
        sectionsMap[sectionKey] = {
          section_key: sectionKey,
          section_title: sectionTitle,
          products: []
        };
      }
      if (sectionsMap[sectionKey].products.length < 8) {
        sectionsMap[sectionKey].products.push(this._clone(p));
      }
    });

    return {
      featured_sections: Object.values(sectionsMap)
    };
  }

  getPrimaryServiceCategories() {
    return [
      {
        key: "wedding_packages",
        label: "Wedding Decorations",
        description: "Curated wedding decor packages for every guest count and style."
      },
      {
        key: "birthday_packages",
        label: "Birthday Parties",
        description: "Fun, themed birthday decoration packages for all ages."
      },
      {
        key: "decor_rentals",
        label: "Decor Rentals",
        description: "Mix and match centerpieces, lighting, and more for any event."
      },
      {
        key: "themes",
        label: "Themes",
        description: "Pre-styled themes like baby showers and seasonal celebrations."
      },
      {
        key: "add_on_services",
        label: "Add-on Services",
        description: "Heaters, tent lighting, dance floors, and more outdoor essentials."
      },
      {
        key: "free_consultation",
        label: "Free Consultation",
        description: "Talk with our team about your event vision at no cost."
      }
    ];
  }

  getHomepageHighlights() {
    const products = this._getProducts().filter((p) => p.is_active !== false);
    const promoCodes = this._getPromoCodes().filter((p) => p.is_active !== false);

    const promotions = promoCodes.map((p) => ({
      title: p.code,
      description: p.description || "Apply this promo at checkout to save on your event.",
      promo_code: p.code
    }));

    const last_minute_deals = products.filter((p) => p.is_last_minute === true);

    const popular_packages = products
      .filter((p) => p.product_type === "package")
      .sort((a, b) => (this._numberOrZero(b.popularity_score) - this._numberOrZero(a.popularity_score)))
      .slice(0, 10);

    return {
      promotions,
      last_minute_deals: this._clone(last_minute_deals),
      popular_packages: this._clone(popular_packages)
    };
  }

  // -------------------- Product search --------------------

  searchProducts(query, filters, sortBy, page = 1, pageSize = 20) {
    const products = this._getProducts().filter((p) => p.is_active !== false);
    const q = (query || "").trim().toLowerCase();

    let results = products.filter((p) => {
      if (q) {
        const haystack = `${p.name || ""} ${p.description || ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (filters) {
        if (filters.locationCity && p.location_city !== filters.locationCity) return false;
        if (filters.eventType && p.event_type !== filters.eventType) return false;
        if (typeof filters.isLastMinute === "boolean" && p.is_last_minute !== filters.isLastMinute) return false;
        if (typeof filters.minPrice === "number" && this._numberOrZero(p.base_price) < filters.minPrice) return false;
        if (typeof filters.maxPrice === "number" && this._numberOrZero(p.base_price) > filters.maxPrice) return false;

        if (filters.startDate || filters.endDate) {
          const startFilter = filters.startDate ? this._parseDate(filters.startDate) : null;
          const endFilter = filters.endDate ? this._parseDate(filters.endDate) : null;
          const availableStart = this._parseDate(p.available_date_start);
          const availableEnd = this._parseDate(p.available_date_end);

          if (startFilter && availableEnd && availableEnd < startFilter) return false;
          if (endFilter && availableStart && availableStart > endFilter) return false;
        }
      }

      return true;
    });

    if (sortBy === "earliest_available_date") {
      results.sort((a, b) => {
        const ad = this._parseDate(a.earliest_available_date || a.available_date_start) || new Date(8640000000000000);
        const bd = this._parseDate(b.earliest_available_date || b.available_date_start) || new Date(8640000000000000);
        return ad - bd;
      });
    } else if (sortBy === "price_asc") {
      results.sort((a, b) => this._numberOrZero(a.base_price) - this._numberOrZero(b.base_price));
    } else if (sortBy === "price_desc") {
      results.sort((a, b) => this._numberOrZero(b.base_price) - this._numberOrZero(a.base_price));
    } else if (sortBy === "rating_desc") {
      results.sort((a, b) => this._numberOrZero(b.average_rating) - this._numberOrZero(a.average_rating));
    }

    const total = results.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      results: this._clone(results.slice(start, end)),
      total,
      page,
      pageSize
    };
  }

  // -------------------- Wedding packages --------------------

  getWeddingFilterOptions() {
    const products = this._getProducts().filter(
      (p) => p.is_active !== false && p.product_type === "package" && p.event_type === "wedding"
    );

    let minGuests = Infinity;
    let maxGuests = -Infinity;
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let earliestDate = null;
    let latestDate = null;
    const locationsMap = {};

    products.forEach((p) => {
      if (typeof p.min_guests === "number") minGuests = Math.min(minGuests, p.min_guests);
      if (typeof p.max_guests === "number") maxGuests = Math.max(maxGuests, p.max_guests);
      if (typeof p.base_price === "number") {
        minPrice = Math.min(minPrice, p.base_price);
        maxPrice = Math.max(maxPrice, p.base_price);
      }
      const start = this._parseDate(p.available_date_start);
      const end = this._parseDate(p.available_date_end);
      if (start) {
        earliestDate = !earliestDate || start < earliestDate ? start : earliestDate;
      }
      if (end) {
        latestDate = !latestDate || end > latestDate ? end : latestDate;
      }
      if (p.location_city) {
        locationsMap[p.location_city] = {
          city: p.location_city,
          label: p.location_city
        };
      }
    });

    if (!isFinite(minGuests)) minGuests = 0;
    if (!isFinite(maxGuests)) maxGuests = 0;
    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = 0;

    return {
      guest_count_range: {
        min: minGuests,
        max: maxGuests,
        step: 10
      },
      price_range: {
        min: minPrice,
        max: maxPrice,
        step: 50
      },
      date_range: {
        earliest_date: earliestDate ? this._toISODateString(earliestDate) : null,
        latest_date: latestDate ? this._toISODateString(latestDate) : null
      },
      locations: Object.values(locationsMap),
      sort_options: [
        { key: "price_asc", label: "Price: Low to High" },
        { key: "price_desc", label: "Price: High to Low" },
        { key: "popularity", label: "Popularity" },
        { key: "rating_desc", label: "Customer Rating" }
      ]
    };
  }

  listWeddingPackages(filters, sortBy, page = 1, pageSize = 20) {
    const products = this._getProducts().filter(
      (p) => p.is_active !== false && p.product_type === "package" && p.event_type === "wedding"
    );

    const eventDate = filters && filters.eventDate ? this._parseDate(filters.eventDate) : null;

    let list = products.filter((p) => {
      const price = this._numberOrZero(p.base_price);
      const minGuests = typeof filters?.minGuests === "number" ? filters.minGuests : null;
      const maxGuests = typeof filters?.maxGuests === "number" ? filters.maxGuests : null;

      if (typeof filters?.minPrice === "number" && price < filters.minPrice) return false;
      if (typeof filters?.maxPrice === "number" && price > filters.maxPrice) return false;

      if (minGuests != null && typeof p.max_guests === "number" && p.max_guests < minGuests) return false;
      if (maxGuests != null && typeof p.min_guests === "number" && p.min_guests > maxGuests) return false;

      if (filters?.locationCity && p.location_city !== filters.locationCity) return false;

      if (eventDate) {
        const start = this._parseDate(p.available_date_start);
        const end = this._parseDate(p.available_date_end);
        if ((start && eventDate < start) || (end && eventDate > end)) return false;
      }

      return true;
    });

    if (sortBy === "price_asc") {
      list.sort((a, b) => this._numberOrZero(a.base_price) - this._numberOrZero(b.base_price));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => this._numberOrZero(b.base_price) - this._numberOrZero(a.base_price));
    } else if (sortBy === "popularity") {
      list.sort((a, b) => this._numberOrZero(b.popularity_score) - this._numberOrZero(a.popularity_score));
    } else if (sortBy === "rating_desc") {
      list.sort((a, b) => this._numberOrZero(b.average_rating) - this._numberOrZero(a.average_rating));
    }

    const total = list.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    const packages = list.slice(startIndex, endIndex).map((p) => {
      let isAvailable = true;
      if (eventDate) {
        const start = this._parseDate(p.available_date_start);
        const end = this._parseDate(p.available_date_end);
        if ((start && eventDate < start) || (end && eventDate > end)) isAvailable = false;
      }
      return {
        product: this._clone(p),
        is_available_for_event_date: !!isAvailable
      };
    });

    return { packages, total, page, pageSize };
  }

  // -------------------- Birthday packages --------------------

  getBirthdayFilterOptions() {
    const products = this._getProducts().filter(
      (p) => p.is_active !== false && p.product_type === "package" && p.event_type === "birthday"
    );

    const ageGroupSet = new Set();
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    const stylesMap = {};

    products.forEach((p) => {
      if (p.age_group) ageGroupSet.add(p.age_group);
      if (typeof p.base_price === "number") {
        minPrice = Math.min(minPrice, p.base_price);
        maxPrice = Math.max(maxPrice, p.base_price);
      }
      if (Array.isArray(p.style_tags)) {
        p.style_tags.forEach((tag) => {
          if (tag && !stylesMap[tag]) {
            stylesMap[tag] = {
              tag,
              label: tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
            };
          }
        });
      }
    });

    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = 0;

    const ageGroups = Array.from(ageGroupSet).map((key) => ({
      key,
      label:
        key === "kids_1_5"
          ? "Kids 1–5"
          : key === "kids_6_10"
          ? "Kids 6–10"
          : key === "teens_11_15"
          ? "Teens 11–15"
          : key === "adults"
          ? "Adults"
          : "All ages"
    }));

    return {
      age_groups: ageGroups,
      price_range: {
        min: minPrice,
        max: maxPrice,
        step: 25
      },
      rating_options: [
        { min_rating: 4, label: "4 stars & up" },
        { min_rating: 4.5, label: "4.5 stars & up" }
      ],
      styles: Object.values(stylesMap),
      sort_options: [
        { key: "rating_desc", label: "Customer Rating" },
        { key: "price_asc", label: "Price: Low to High" },
        { key: "price_desc", label: "Price: High to Low" },
        { key: "popularity", label: "Popularity" }
      ]
    };
  }

  listBirthdayPackages(filters, sortBy, page = 1, pageSize = 20) {
    const products = this._getProducts().filter(
      (p) => p.is_active !== false && p.product_type === "package" && p.event_type === "birthday"
    );

    let list = products.filter((p) => {
      const price = this._numberOrZero(p.base_price);
      if (filters?.ageGroup && p.age_group !== filters.ageGroup) return false;
      if (typeof filters?.minPrice === "number" && price < filters.minPrice) return false;
      if (typeof filters?.maxPrice === "number" && price > filters.maxPrice) return false;
      if (typeof filters?.minRating === "number" && this._numberOrZero(p.average_rating) < filters.minRating)
        return false;
      if (filters?.styleTag) {
        if (!Array.isArray(p.style_tags) || !p.style_tags.includes(filters.styleTag)) return false;
      }
      return true;
    });

    if (sortBy === "rating_desc") {
      list.sort((a, b) => this._numberOrZero(b.average_rating) - this._numberOrZero(a.average_rating));
    } else if (sortBy === "price_asc") {
      list.sort((a, b) => this._numberOrZero(a.base_price) - this._numberOrZero(b.base_price));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => this._numberOrZero(b.base_price) - this._numberOrZero(a.base_price));
    } else if (sortBy === "popularity") {
      list.sort((a, b) => this._numberOrZero(b.popularity_score) - this._numberOrZero(a.popularity_score));
    }

    const total = list.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      packages: this._clone(list.slice(startIndex, endIndex)),
      total,
      page,
      pageSize
    };
  }

  // -------------------- Decor rentals --------------------

  getDecorRentalFilterOptions() {
    const products = this._getProducts().filter(
      (p) => p.is_active !== false && p.product_type === "rental"
    );

    const subcategoriesMap = {};
    const stylesMap = {};
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    products.forEach((p) => {
      if (p.rental_subcategory && !subcategoriesMap[p.rental_subcategory]) {
        subcategoriesMap[p.rental_subcategory] = {
          key: p.rental_subcategory,
          label: p.rental_subcategory.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        };
      }
      if (Array.isArray(p.style_tags)) {
        p.style_tags.forEach((tag) => {
          if (tag && !stylesMap[tag]) {
            stylesMap[tag] = {
              tag,
              label: tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
            };
          }
        });
      }
      if (typeof p.base_price === "number") {
        minPrice = Math.min(minPrice, p.base_price);
        maxPrice = Math.max(maxPrice, p.base_price);
      }
    });

    if (!isFinite(minPrice)) minPrice = 0;
    if (!isFinite(maxPrice)) maxPrice = 0;

    return {
      rental_subcategories: Object.values(subcategoriesMap),
      styles: Object.values(stylesMap),
      price_range: {
        min: minPrice,
        max: maxPrice,
        step: 10
      },
      sort_options: [
        { key: "price_asc", label: "Price: Low to High" },
        { key: "price_desc", label: "Price: High to Low" },
        { key: "popularity", label: "Popularity" },
        { key: "rating_desc", label: "Customer Rating" }
      ]
    };
  }

  listDecorRentals(filters, sortBy, page = 1, pageSize = 20) {
    const products = this._getProducts().filter(
      (p) => p.is_active !== false && p.product_type === "rental"
    );

    const eventDate = filters && filters.eventDate ? this._parseDate(filters.eventDate) : null;

    let list = products.filter((p) => {
      if (filters?.subcategory && p.rental_subcategory !== filters.subcategory) return false;
      if (filters?.styleTag) {
        if (!Array.isArray(p.style_tags) || !p.style_tags.includes(filters.styleTag)) return false;
      }
      const price = this._numberOrZero(p.base_price);
      if (typeof filters?.minPrice === "number" && price < filters.minPrice) return false;
      if (typeof filters?.maxPrice === "number" && price > filters.maxPrice) return false;

      if (eventDate) {
        const start = this._parseDate(p.available_date_start);
        const end = this._parseDate(p.available_date_end);
        if ((start && eventDate < start) || (end && eventDate > end)) return false;
      }
      return true;
    });

    if (sortBy === "price_asc") {
      list.sort((a, b) => this._numberOrZero(a.base_price) - this._numberOrZero(b.base_price));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => this._numberOrZero(b.base_price) - this._numberOrZero(a.base_price));
    } else if (sortBy === "popularity") {
      list.sort((a, b) => this._numberOrZero(b.popularity_score) - this._numberOrZero(a.popularity_score));
    } else if (sortBy === "rating_desc") {
      list.sort((a, b) => this._numberOrZero(b.average_rating) - this._numberOrZero(a.average_rating));
    }

    const total = list.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      rentals: this._clone(list.slice(startIndex, endIndex)),
      total,
      page,
      pageSize
    };
  }

  // -------------------- Baby shower theme items --------------------

  getBabyShowerThemeFilterOptions() {
    const products = this._getProducts().filter(
      (p) => p.is_active !== false && p.theme_tag === "baby_shower"
    );

    const stylesMap = {};
    const sectionsMap = {};

    products.forEach((p) => {
      if (Array.isArray(p.style_tags)) {
        p.style_tags.forEach((tag) => {
          if (tag && !stylesMap[tag]) {
            stylesMap[tag] = {
              tag,
              label: tag.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
            };
          }
        });
      }
      if (p.theme_section && !sectionsMap[p.theme_section]) {
        sectionsMap[p.theme_section] = {
          key: p.theme_section,
          label: p.theme_section.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        };
      }
    });

    return {
      styles: Object.values(stylesMap),
      sections: Object.values(sectionsMap)
    };
  }

  listBabyShowerThemeItems(styleTag) {
    const products = this._getProducts().filter(
      (p) =>
        p.is_active !== false &&
        p.theme_tag === "baby_shower" &&
        p.product_type === "theme_item" &&
        (!styleTag || (Array.isArray(p.style_tags) && p.style_tags.includes(styleTag)))
    );

    const sectionsMap = {};

    products.forEach((p) => {
      const key = p.theme_section || "other";
      if (!sectionsMap[key]) {
        sectionsMap[key] = {
          section_key: key,
          section_title: key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
          products: []
        };
      }
      sectionsMap[key].products.push(this._clone(p));
    });

    return {
      theme_tag: "baby_shower",
      style_tag: styleTag || null,
      sections: Object.values(sectionsMap)
    };
  }

  // -------------------- Add-on services --------------------

  getAddOnFilterOptions() {
    const products = this._getProducts().filter(
      (p) => p.is_active !== false && p.product_type === "add_on"
    );

    const eventSettingsMap = {};
    const categoriesMap = {};

    products.forEach((p) => {
      if (p.event_setting && !eventSettingsMap[p.event_setting]) {
        eventSettingsMap[p.event_setting] = {
          key: p.event_setting,
          label:
            p.event_setting === "any_setting"
              ? "Any setting"
              : p.event_setting.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        };
      }
      if (p.add_on_category && !categoriesMap[p.add_on_category]) {
        categoriesMap[p.add_on_category] = {
          key: p.add_on_category,
          label: p.add_on_category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
        };
      }
    });

    return {
      event_settings: Object.values(eventSettingsMap),
      categories: Object.values(categoriesMap),
      sort_options: [
        { key: "price_asc", label: "Price: Low to High" },
        { key: "price_desc", label: "Price: High to Low" },
        { key: "review_count_desc", label: "Most Reviewed" },
        { key: "rating_desc", label: "Customer Rating" }
      ]
    };
  }

  listAddOnServices(filters, sortBy, page = 1, pageSize = 50) {
    const products = this._getProducts().filter(
      (p) => p.is_active !== false && p.product_type === "add_on"
    );

    let list = products.filter((p) => {
      if (filters?.eventSetting) {
        // hierarchical: 'outdoor' accepts 'outdoor' and 'any_setting'
        if (
          p.event_setting !== filters.eventSetting &&
          !(filters.eventSetting === "outdoor" && p.event_setting === "any_setting") &&
          !(filters.eventSetting === "indoor" && p.event_setting === "any_setting")
        ) {
          return false;
        }
      }

      if (Array.isArray(filters?.categories) && filters.categories.length > 0) {
        if (!filters.categories.includes(p.add_on_category)) return false;
      }

      const price = this._numberOrZero(p.base_price);
      if (typeof filters?.minPrice === "number" && price < filters.minPrice) return false;
      if (typeof filters?.maxPrice === "number" && price > filters.maxPrice) return false;

      return true;
    });

    if (sortBy === "price_asc") {
      list.sort((a, b) => this._numberOrZero(a.base_price) - this._numberOrZero(b.base_price));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => this._numberOrZero(b.base_price) - this._numberOrZero(a.base_price));
    } else if (sortBy === "review_count_desc") {
      list.sort((a, b) => this._numberOrZero(b.review_count) - this._numberOrZero(a.review_count));
    } else if (sortBy === "rating_desc") {
      list.sort((a, b) => this._numberOrZero(b.average_rating) - this._numberOrZero(a.average_rating));
    }

    const total = list.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      add_ons: this._clone(list.slice(startIndex, endIndex)),
      total,
      page,
      pageSize
    };
  }

  // -------------------- Product details & booking options --------------------

  getProductDetails(productId) {
    const products = this._getProducts();
    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      return {
        product: null,
        price_display: null,
        capacity_label: null,
        rating_summary: { average_rating: 0, review_count: 0 },
        feature_list: [],
        is_bookable: false,
        supports_wishlist: false,
        supports_cart: false
      };
    }

    const price = this._numberOrZero(product.base_price);
    const price_display = (product.currency || "$") + price.toFixed(2);

    let capacity_label = null;
    if (typeof product.min_guests === "number" && typeof product.max_guests === "number") {
      if (product.min_guests === 0) {
        capacity_label = `Up to ${product.max_guests} guests`;
      } else {
        capacity_label = `${product.min_guests}–${product.max_guests} guests`;
      }
    } else if (typeof product.max_guests === "number") {
      capacity_label = `Up to ${product.max_guests} guests`;
    }

    const rating_summary = {
      average_rating: this._numberOrZero(product.average_rating),
      review_count: this._numberOrZero(product.review_count)
    };

    const feature_list = Array.isArray(product.features) ? this._clone(product.features) : [];

    const is_bookable = product.product_type === "package";
    const supports_wishlist = true; // all products can be wishlisted
    const supports_cart = true; // all products can be added to cart (packages as bookings in cart)

    return {
      product: this._clone(product),
      price_display,
      capacity_label,
      rating_summary,
      feature_list,
      is_bookable,
      supports_wishlist,
      supports_cart
    };
  }

  getProductBookingOptions(productId) {
    const products = this._getProducts();
    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      return {
        requires_guest_count: true,
        requires_venue_city: true,
        available_date_start: null,
        available_date_end: null,
        time_slot_options: ["4:00 PM – 11:00 PM"],
        default_guest_range: { min: 0, max: 0 }
      };
    }

    const requires_guest_count = product.product_type === "package";
    const requires_venue_city = true;

    const available_date_start = product.available_date_start
      ? this._toISODateString(product.available_date_start)
      : null;
    const available_date_end = product.available_date_end
      ? this._toISODateString(product.available_date_end)
      : null;

    const default_guest_range = {
      min: typeof product.min_guests === "number" ? product.min_guests : 0,
      max: typeof product.max_guests === "number" ? product.max_guests : 0
    };

    const time_slot_options = [
      "10:00 AM – 3:00 PM",
      "4:00 PM – 11:00 PM"
    ];

    return {
      requires_guest_count,
      requires_venue_city,
      available_date_start,
      available_date_end,
      time_slot_options,
      default_guest_range
    };
  }

  getAvailableTimeSlots(productId, eventDate) {
    // For now, return a static set of generic slots; in a real app this would check availability.
    // This keeps business logic pure and avoids mocking actual booking data.
    return [
      "12:00 PM – 3:00 PM",
      "3:00 PM – 4:00 PM",
      "4:00 PM – 11:00 PM"
    ];
  }

  // -------------------- Wishlist --------------------

  addProductToWishlist(productId) {
    const products = this._getProducts();
    const product = products.find((p) => p.id === productId && p.is_active !== false);
    if (!product) {
      const wishlist = this._getOrCreateWishlist();
      const allProducts = this._getProducts();
      const wishlistItems = wishlist.item_ids
        .map((id) => allProducts.find((p) => p.id === id))
        .filter(Boolean);
      return {
        success: false,
        wishlist_id: wishlist.id,
        item_count: wishlist.item_ids.length,
        wishlist_items: this._clone(wishlistItems),
        message: "Product not found or inactive."
      };
    }

    const wishlist = this._getOrCreateWishlist();
    if (!wishlist.item_ids.includes(productId)) {
      wishlist.item_ids.push(productId);
      wishlist.updated_at = new Date().toISOString();
      this._updateWishlist(wishlist);
    }

    const wishlistProducts = wishlist.item_ids
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);

    return {
      success: true,
      wishlist_id: wishlist.id,
      item_count: wishlist.item_ids.length,
      wishlist_items: this._clone(wishlistProducts),
      message: "Added to wishlist."
    };
  }

  getWishlistItems() {
    const products = this._getProducts();
    const wishlists = this._getFromStorage("wishlists", []);
    const currentId = localStorage.getItem("current_wishlist_id") || "";
    const wishlist = wishlists.find((w) => w.id === currentId) || null;

    if (!wishlist) {
      return { wishlist_id: null, items: [] };
    }

    const items = wishlist.item_ids
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);

    return {
      wishlist_id: wishlist.id,
      items: this._clone(items)
    };
  }

  removeProductFromWishlist(productId) {
    const products = this._getProducts();
    const wishlist = this._getOrCreateWishlist();
    const index = wishlist.item_ids.indexOf(productId);
    if (index !== -1) {
      wishlist.item_ids.splice(index, 1);
      wishlist.updated_at = new Date().toISOString();
      this._updateWishlist(wishlist);
    }

    const wishlistProducts = wishlist.item_ids
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean);

    return {
      success: true,
      wishlist_id: wishlist.id,
      item_count: wishlist.item_ids.length,
      items: this._clone(wishlistProducts)
    };
  }

  // -------------------- Cart --------------------

  addProductToCart(productId, quantity = 1, options) {
    const qty = this._numberOrZero(quantity) || 1;
    const products = this._getProducts();
    const product = products.find((p) => p.id === productId && p.is_active !== false);
    if (!product) {
      const cart = this._getOrCreateCart();
      const cartItems = this._getCartItems().filter((ci) => ci.cart_id === cart.id);
      const responseItems = cartItems.map((ci) => ({
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        product_type: ci.product_type,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_subtotal: ci.line_subtotal,
        product: products.find((p) => p.id === ci.product_id) || null
      }));
      return {
        success: false,
        cart_id: cart.id,
        items: responseItems,
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total,
        message: "Product not found or inactive."
      };
    }

    const cart = this._getOrCreateCart();
    const allCartItems = this._getCartItems();

    const now = new Date().toISOString();
    const unitPrice = this._numberOrZero(product.base_price);
    const lineSubtotal = unitPrice * qty;

    const cartItem = {
      id: this._generateId("cartitem"),
      cart_id: cart.id,
      product_id: product.id,
      product_name: product.name,
      product_type: product.product_type,
      unit_price: unitPrice,
      quantity: qty,
      line_subtotal: lineSubtotal,
      event_date: options && options.eventDate ? options.eventDate : null,
      time_slot_label: options && options.timeSlotLabel ? options.timeSlotLabel : null,
      guest_count: options && typeof options.guestCount === "number" ? options.guestCount : null,
      venue_city: options && options.venueCity ? options.venueCity : null,
      is_last_minute: !!product.is_last_minute
    };

    allCartItems.push(cartItem);
    if (!Array.isArray(cart.item_ids)) cart.item_ids = [];
    cart.item_ids.push(cartItem.id);

    this._recalculateCartTotals(cart, allCartItems);

    this._updateCart(cart);
    this._saveCartItems(allCartItems);

    const cartItemsForCart = allCartItems.filter((ci) => ci.cart_id === cart.id);
    const responseItems = cartItemsForCart.map((ci) => ({
      cart_item_id: ci.id,
      product_id: ci.product_id,
      product_name: ci.product_name,
      product_type: ci.product_type,
      unit_price: ci.unit_price,
      quantity: ci.quantity,
      line_subtotal: ci.line_subtotal,
      product: products.find((p) => p.id === ci.product_id) || null
    }));

    return {
      success: true,
      cart_id: cart.id,
      items: responseItems,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      total: cart.total,
      message: "Item added to cart."
    };
  }

  getCart() {
    const products = this._getProducts();
    const carts = this._getFromStorage("carts", []);
    const allCartItems = this._getCartItems();
    const currentId = localStorage.getItem("current_cart_id") || "";
    const cart = carts.find((c) => c.id === currentId) || null;

    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        applied_promo_codes: []
      };
    }

    const cartItems = allCartItems.filter((ci) => ci.cart_id === cart.id);
    const items = cartItems.map((ci) => ({
      cart_item_id: ci.id,
      product_id: ci.product_id,
      product_name: ci.product_name,
      product_type: ci.product_type,
      unit_price: ci.unit_price,
      quantity: ci.quantity,
      line_subtotal: ci.line_subtotal,
      product: products.find((p) => p.id === ci.product_id) || null
    }));

    const promoCodes = this._getPromoCodes();
    const appliedPromoDetails = (cart.applied_promo_codes || []).map((code) => {
      const promo = promoCodes.find((p) => p.code === code);
      return {
        code,
        description: promo && promo.description ? promo.description : ""
      };
    });

    return {
      cart_id: cart.id,
      items,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      total: cart.total,
      applied_promo_codes: appliedPromoDetails
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const qty = Math.max(0, this._numberOrZero(quantity));
    const carts = this._getFromStorage("carts", []);
    const allCartItems = this._getCartItems();
    const products = this._getProducts();

    const cartItemIndex = allCartItems.findIndex((ci) => ci.id === cartItemId);
    if (cartItemIndex === -1) {
      return {
        success: false,
        cart_id: null,
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0
      };
    }

    const cartItem = allCartItems[cartItemIndex];
    const cart = carts.find((c) => c.id === cartItem.cart_id);
    if (!cart) {
      return {
        success: false,
        cart_id: null,
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0
      };
    }

    if (qty === 0) {
      // Remove the item
      allCartItems.splice(cartItemIndex, 1);
      if (Array.isArray(cart.item_ids)) {
        const idx = cart.item_ids.indexOf(cartItemId);
        if (idx !== -1) cart.item_ids.splice(idx, 1);
      }
    } else {
      cartItem.quantity = qty;
      cartItem.line_subtotal = cartItem.unit_price * qty;
      allCartItems[cartItemIndex] = cartItem;
    }

    this._recalculateCartTotals(cart, allCartItems);
    this._updateCart(cart);
    this._saveCartItems(allCartItems);

    const cartItems = allCartItems.filter((ci) => ci.cart_id === cart.id);
    const items = cartItems.map((ci) => ({
      cart_item_id: ci.id,
      product_id: ci.product_id,
      product_name: ci.product_name,
      product_type: ci.product_type,
      unit_price: ci.unit_price,
      quantity: ci.quantity,
      line_subtotal: ci.line_subtotal,
      product: products.find((p) => p.id === ci.product_id) || null
    }));

    return {
      success: true,
      cart_id: cart.id,
      items,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      total: cart.total
    };
  }

  removeCartItem(cartItemId) {
    const carts = this._getFromStorage("carts", []);
    const allCartItems = this._getCartItems();
    const products = this._getProducts();

    const cartItemIndex = allCartItems.findIndex((ci) => ci.id === cartItemId);
    if (cartItemIndex === -1) {
      return {
        success: false,
        cart_id: null,
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0
      };
    }

    const cartItem = allCartItems[cartItemIndex];
    const cart = carts.find((c) => c.id === cartItem.cart_id);
    if (!cart) {
      return {
        success: false,
        cart_id: null,
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0
      };
    }

    allCartItems.splice(cartItemIndex, 1);
    if (Array.isArray(cart.item_ids)) {
      const idx = cart.item_ids.indexOf(cartItemId);
      if (idx !== -1) cart.item_ids.splice(idx, 1);
    }

    this._recalculateCartTotals(cart, allCartItems);
    this._updateCart(cart);
    this._saveCartItems(allCartItems);

    const cartItems = allCartItems.filter((ci) => ci.cart_id === cart.id);
    const items = cartItems.map((ci) => ({
      cart_item_id: ci.id,
      product_id: ci.product_id,
      product_name: ci.product_name,
      product_type: ci.product_type,
      unit_price: ci.unit_price,
      quantity: ci.quantity,
      line_subtotal: ci.line_subtotal,
      product: products.find((p) => p.id === ci.product_id) || null
    }));

    return {
      success: true,
      cart_id: cart.id,
      items,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      total: cart.total
    };
  }

  applyPromoCodeToCart(code) {
    const carts = this._getFromStorage("carts", []);
    const allCartItems = this._getCartItems();
    const products = this._getProducts();
    const promoCodes = this._getPromoCodes();

    const currentId = localStorage.getItem("current_cart_id") || "";
    const cart = carts.find((c) => c.id === currentId);
    if (!cart) {
      return {
        success: false,
        cart_id: null,
        applied_promo_codes: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        message: "Cart not found."
      };
    }

    const promo = promoCodes.find(
      (p) => typeof p.code === "string" && p.code.toLowerCase() === String(code).toLowerCase()
    );

    if (!promo || promo.is_active === false) {
      this._recalculateCartTotals(cart, allCartItems);
      this._updateCart(cart);
      const appliedDetails = (cart.applied_promo_codes || []).map((c) => {
        const pc = promoCodes.find((p) => p.code === c);
        return { code: c, description: pc && pc.description ? pc.description : "" };
      });
      return {
        success: false,
        cart_id: cart.id,
        applied_promo_codes: appliedDetails,
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total,
        message: "Promo code not found or inactive."
      };
    }

    // Validate code impact
    const { isValid } = this._validatePromoCode(promo.code, cart, allCartItems);
    if (!isValid) {
      this._recalculateCartTotals(cart, allCartItems);
      this._updateCart(cart);
      const appliedDetails = (cart.applied_promo_codes || []).map((c) => {
        const pc = promoCodes.find((p) => p.code === c);
        return { code: c, description: pc && pc.description ? pc.description : "" };
      });
      return {
        success: false,
        cart_id: cart.id,
        applied_promo_codes: appliedDetails,
        subtotal: cart.subtotal,
        discount_total: cart.discount_total,
        total: cart.total,
        message: "Promo code is not applicable to current cart."
      };
    }

    if (!Array.isArray(cart.applied_promo_codes)) cart.applied_promo_codes = [];
    if (!cart.applied_promo_codes.includes(promo.code)) {
      cart.applied_promo_codes.push(promo.code);
    }

    this._recalculateCartTotals(cart, allCartItems);
    this._updateCart(cart);

    const appliedDetails = (cart.applied_promo_codes || []).map((c) => {
      const pc = promoCodes.find((p) => p.code === c);
      return { code: c, description: pc && pc.description ? pc.description : "" };
    });

    return {
      success: true,
      cart_id: cart.id,
      applied_promo_codes: appliedDetails,
      subtotal: cart.subtotal,
      discount_total: cart.discount_total,
      total: cart.total,
      message: "Promo code applied."
    };
  }

  // -------------------- Bookings --------------------

  createBookingDraft(productId, eventDate, timeSlotLabel, guestCount, venueCity) {
    const products = this._getProducts();
    const product = products.find((p) => p.id === productId && p.is_active !== false);

    if (!product) {
      return {
        success: false,
        booking_id: null,
        booking_status: null,
        product_name: null,
        price_total: 0,
        event_date: null,
        time_slot_label: null,
        guest_count: null,
        venue_city: null
      };
    }

    const bookings = this._getFromStorage("bookings", []);
    const now = new Date().toISOString();

    let finalEventDate = eventDate || null;
    if (!finalEventDate && product.available_date_start) {
      finalEventDate = this._toISODateString(product.available_date_start);
    }

    const booking = {
      id: this._generateId("booking"),
      product_id: product.id,
      product_name: product.name,
      event_type: product.event_type || "other_event",
      booking_status: "in_progress",
      contact_name: "",
      contact_email: "",
      contact_phone: "",
      guest_count: typeof guestCount === "number" ? guestCount : this._numberOrZero(product.min_guests) || 0,
      event_date: finalEventDate || "",
      time_slot_label: timeSlotLabel || "4:00 PM – 11:00 PM",
      venue_city: venueCity || product.location_city || "",
      special_requests: "",
      price_total: this._numberOrZero(product.base_price),
      created_at: now,
      updated_at: now
    };

    bookings.push(booking);
    this._saveToStorage("bookings", bookings);

    return {
      success: true,
      booking_id: booking.id,
      booking_status: booking.booking_status,
      product_name: booking.product_name,
      price_total: booking.price_total,
      event_date: booking.event_date,
      time_slot_label: booking.time_slot_label,
      guest_count: booking.guest_count,
      venue_city: booking.venue_city
    };
  }

  getBookingDetails(bookingId) {
    const bookings = this._getFromStorage("bookings", []);
    const booking = bookings.find((b) => b.id === bookingId) || null;
    const products = this._getProducts();

    if (!booking) {
      return {
        booking: null
      };
    }

    const product = products.find((p) => p.id === booking.product_id) || null;

    return {
      booking: {
        id: booking.id,
        product_id: booking.product_id,
        product_name: booking.product_name,
        event_type: booking.event_type,
        booking_status: booking.booking_status,
        contact_name: booking.contact_name,
        contact_email: booking.contact_email,
        contact_phone: booking.contact_phone,
        guest_count: booking.guest_count,
        event_date: booking.event_date,
        time_slot_label: booking.time_slot_label,
        venue_city: booking.venue_city,
        special_requests: booking.special_requests,
        price_total: booking.price_total,
        product: product
      }
    };
  }

  updateBookingFromForm(
    bookingId,
    contactName,
    contactEmail,
    contactPhone,
    guestCount,
    eventDate,
    timeSlotLabel,
    venueCity,
    specialRequests
  ) {
    const bookings = this._getFromStorage("bookings", []);
    const idx = bookings.findIndex((b) => b.id === bookingId);
    const errors = [];

    if (idx === -1) {
      return {
        success: false,
        booking: null,
        next_step: null,
        errors: [{ field: "bookingId", message: "Booking not found" }]
      };
    }

    if (!contactName) errors.push({ field: "contactName", message: "Name is required" });
    if (!contactEmail) errors.push({ field: "contactEmail", message: "Email is required" });
    if (!guestCount && guestCount !== 0) errors.push({ field: "guestCount", message: "Guest count is required" });
    if (!eventDate) errors.push({ field: "eventDate", message: "Event date is required" });
    if (!timeSlotLabel) errors.push({ field: "timeSlotLabel", message: "Time slot is required" });
    if (!venueCity) errors.push({ field: "venueCity", message: "Venue city is required" });

    if (errors.length > 0) {
      return {
        success: false,
        booking: null,
        next_step: null,
        errors
      };
    }

    const booking = bookings[idx];
    booking.contact_name = contactName;
    booking.contact_email = contactEmail;
    booking.contact_phone = contactPhone || "";
    booking.guest_count = guestCount;
    booking.event_date = eventDate;
    booking.time_slot_label = timeSlotLabel;
    booking.venue_city = venueCity;
    booking.special_requests = specialRequests || "";
    booking.booking_status = "submitted";
    booking.updated_at = new Date().toISOString();

    bookings[idx] = booking;
    this._saveToStorage("bookings", bookings);

    return {
      success: true,
      booking: {
        id: booking.id,
        booking_status: booking.booking_status,
        product_name: booking.product_name,
        price_total: booking.price_total
      },
      next_step: "review",
      errors: []
    };
  }

  // -------------------- Consultation requests --------------------

  getConsultationFormOptions() {
    return {
      event_types: [
        { value: "wedding", label: "Wedding" },
        { value: "corporate_event", label: "Corporate Event" },
        { value: "birthday", label: "Birthday" },
        { value: "baby_shower", label: "Baby Shower" },
        { value: "general_event", label: "General Event" },
        { value: "other_event", label: "Other" }
      ],
      services: [
        {
          key: "decor_design",
          label: "Decor Design",
          description: "Overall decor concept, layout, and styling."
        },
        {
          key: "lighting",
          label: "Lighting",
          description: "Ambient, accent, and functional lighting solutions."
        },
        {
          key: "floral",
          label: "Floral",
          description: "Bouquets, centerpieces, and floral installations."
        },
        {
          key: "rentals",
          label: "Rentals",
          description: "Furniture, draping, and specialty rentals."
        }
      ],
      time_slots: [
        "9:00 AM – 10:00 AM",
        "11:00 AM – 12:00 PM",
        "1:00 PM – 2:00 PM",
        "3:00 PM – 4:00 PM",
        "5:00 PM – 6:00 PM"
      ]
    };
  }

  submitConsultationRequest(
    eventType,
    selectedServices,
    contactName,
    contactEmail,
    contactPhone,
    preferredDate,
    preferredTimeSlot,
    eventDetails
  ) {
    const id = this._generateId("consult");
    const now = new Date().toISOString();

    const request = {
      id,
      event_type: eventType,
      selected_services: Array.isArray(selectedServices) ? selectedServices : [],
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      preferred_date: preferredDate,
      preferred_time_slot: preferredTimeSlot,
      event_details: eventDetails,
      status: "submitted",
      created_at: now
    };

    const requests = this._getFromStorage("consultation_requests", []);
    requests.push(request);
    this._saveToStorage("consultation_requests", requests);

    return {
      success: true,
      consultation_request_id: id,
      status: "submitted"
    };
  }

  // -------------------- FAQ & contact --------------------

  getFaqCategories() {
    const categories = this._getFromStorage("faq_categories", []);
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      sort_order: typeof c.sort_order === "number" ? c.sort_order : 0
    }));
  }

  getFaqItemsByCategory(categoryId) {
    const items = this._getFromStorage("faq_items", []);
    const categories = this._getFromStorage("faq_categories", []);
    const category = categories.find((c) => c.id === categoryId) || null;

    const filtered = items
      .filter((i) => i.category_id === categoryId && i.is_active !== false)
      .sort((a, b) => (this._numberOrZero(a.sort_order) - this._numberOrZero(b.sort_order)));

    return filtered.map((i) => ({
      id: i.id,
      question: i.question,
      answer: i.answer,
      slug: i.slug || null,
      sort_order: typeof i.sort_order === "number" ? i.sort_order : 0,
      category_id: i.category_id,
      category: category
    }));
  }

  searchFaqItems(query, categorySlug) {
    const q = (query || "").trim().toLowerCase();
    const categories = this._getFromStorage("faq_categories", []);
    const items = this._getFromStorage("faq_items", []);

    let categoryId = null;
    if (categorySlug) {
      const cat = categories.find((c) => c.slug === categorySlug);
      if (cat) categoryId = cat.id;
    }

    const results = items.filter((i) => {
      if (i.is_active === false) return false;
      if (categoryId && i.category_id !== categoryId) return false;
      const text = `${i.question || ""} ${i.answer || ""}`.toLowerCase();
      return q ? text.includes(q) : true;
    });

    return results.map((i) => {
      const cat = categories.find((c) => c.id === i.category_id);
      return {
        id: i.id,
        question: i.question,
        answer: i.answer,
        category_slug: cat ? cat.slug : null
      };
    });
  }

  getContactFormOptions() {
    return {
      event_types: [
        { value: "wedding", label: "Wedding" },
        { value: "corporate_event", label: "Corporate Event" },
        { value: "birthday", label: "Birthday" },
        { value: "baby_shower", label: "Baby Shower" },
        { value: "general_event", label: "General Event" },
        { value: "other_event", label: "Other" }
      ],
      topics: [
        { value: "cancellation_refund", label: "Cancellation / Refund" },
        { value: "booking_question", label: "Booking Question" },
        { value: "general_question", label: "General Question" },
        { value: "pricing_question", label: "Pricing Question" },
        { value: "other", label: "Other" }
      ]
    };
  }

  submitContactMessage(name, email, phone, eventType, topic, subject, message) {
    const id = this._generateId("contact");
    const now = new Date().toISOString();

    const msg = {
      id,
      name,
      email,
      phone: phone || "",
      event_type: eventType || null,
      topic,
      subject,
      message,
      status: "submitted",
      created_at: now
    };

    const messages = this._getFromStorage("contact_messages", []);
    messages.push(msg);
    this._saveToStorage("contact_messages", messages);

    return {
      success: true,
      contact_message_id: id,
      status: "submitted"
    };
  }

  // -------------------- Compare list --------------------

  addProductToCompareList(productId) {
    const products = this._getProducts();
    const product = products.find((p) => p.id === productId && p.is_active !== false);
    const compareList = this._getOrCreateCompareList();

    if (!product) {
      return {
        success: false,
        compare_list_id: compareList.id,
        item_ids: compareList.item_ids
      };
    }

    if (!compareList.item_ids.includes(productId)) {
      compareList.item_ids.push(productId);
      compareList.updated_at = new Date().toISOString();
      this._updateCompareList(compareList);
    }

    return {
      success: true,
      compare_list_id: compareList.id,
      item_ids: compareList.item_ids.slice()
    };
  }

  getCompareListDetails() {
    const products = this._getProducts();
    const compareLists = this._getFromStorage("compare_lists", []);
    const currentId = localStorage.getItem("current_compare_list_id") || "";
    const compareList = compareLists.find((c) => c.id === currentId) || null;

    if (!compareList) {
      return {
        compare_list_id: null,
        items: []
      };
    }

    const items = compareList.item_ids
      .map((id) => products.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => {
        const includesFlag = p.includes_floral_centerpieces === true;
        const floralFeature = Array.isArray(p.features)
          ? p.features.some((f) => typeof f === "string" && f.toLowerCase().includes("floral centerpieces"))
          : false;
        return {
          product: this._clone(p),
          includes_floral_centerpieces: includesFlag || floralFeature,
          price_total: this._numberOrZero(p.base_price),
          key_features: Array.isArray(p.features) ? this._clone(p.features) : []
        };
      });

    return {
      compare_list_id: compareList.id,
      items
    };
  }

  removeProductFromCompareList(productId) {
    const compareList = this._getOrCreateCompareList();
    const idx = compareList.item_ids.indexOf(productId);
    if (idx !== -1) {
      compareList.item_ids.splice(idx, 1);
      compareList.updated_at = new Date().toISOString();
      this._updateCompareList(compareList);
    }

    return {
      success: true,
      compare_list_id: compareList.id,
      item_ids: compareList.item_ids.slice()
    };
  }

  clearCompareList() {
    const compareLists = this._getFromStorage("compare_lists", []);
    const currentId = localStorage.getItem("current_compare_list_id") || "";
    const idx = compareLists.findIndex((c) => c.id === currentId);
    if (idx !== -1) {
      compareLists[idx].item_ids = [];
      compareLists[idx].updated_at = new Date().toISOString();
      this._saveToStorage("compare_lists", compareLists);
    }

    return { success: true };
  }

  // -------------------- About content --------------------

  getAboutContent() {
    return {
      company_name: "EverGlow Event Decor",
      tagline: "Thoughtfully designed decor for weddings, parties, and unforgettable moments.",
      mission:
        "Our mission is to make beautifully styled events accessible and stress-free by offering curated decor packages, flexible rentals, and tailored design support.",
      background:
        "EverGlow Event Decor is a small, detail-obsessed team of planners, stylists, and installers who specialize in transforming everyday spaces into warm, inviting celebrations.",
      specializations: ["weddings", "corporate_event", "birthday", "baby_shower", "themed_parties"],
      service_regions: ["Chicago", "Suburban Chicago", "Northwest Indiana", "Southeast Wisconsin"],
      typical_event_sizes: [
        { label: "Intimate gatherings", min_guests: 10, max_guests: 50 },
        { label: "Midsize celebrations", min_guests: 50, max_guests: 150 },
        { label: "Large events", min_guests: 150, max_guests: 300 }
      ],
      highlight_actions: [
        { key: "free_consultation", label: "Book a Free Consultation" },
        { key: "contact", label: "Contact Our Team" }
      ]
    };
  }

  // -------------------- Legacy template stub (optional) --------------------
  // Kept for compatibility; delegates to addProductToCart without event options.

  addToCart(userId, productId, quantity = 1) {
    // userId is ignored in this single-user localStorage implementation
    return this.addProductToCart(productId, quantity, null);
  }
}

// Global exposure (browser via globalThis) + Node.js export
if (typeof globalThis !== "undefined") {
  globalThis.BusinessLogic = BusinessLogic;
  globalThis.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}
