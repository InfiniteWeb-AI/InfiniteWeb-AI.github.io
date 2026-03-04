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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // NOTE: Do not seed domain data; only ensure keys exist with empty structures
    const ensureKey = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Legacy from template (kept for compatibility, unused by core logic)
    ensureKey("users", []);
    ensureKey("products", []);
    ensureKey("carts", []); // legacy
    ensureKey("cartItems", []); // legacy

    // Core storage based on provided data models
    ensureKey("categories", []);
    ensureKey("products", []); // already ensured
    ensureKey("gallery_wall_set_frame_templates", []);

    // Single-user cart and related
    if (localStorage.getItem("cart") === null) {
      localStorage.setItem("cart", JSON.stringify(null));
    }
    ensureKey("cart_items", []);
    ensureKey("cart_item_frame_overrides", []);

    // Wishlist (single) and items
    if (localStorage.getItem("wishlist") === null) {
      localStorage.setItem("wishlist", JSON.stringify(null));
    }
    ensureKey("wishlist_items", []);

    // Compare list (single list stored inside an array) and items
    ensureKey("compare_lists", []);
    ensureKey("compare_items", []);

    // Promotions and shipping
    ensureKey("promo_codes", []);
    ensureKey("shipping_methods", []);

    // Orders and related
    ensureKey("orders", []);
    ensureKey("order_items", []);
    ensureKey("shipping_addresses", []);
    ensureKey("payments", []);

    // Static pages, FAQ, contact requests
    ensureKey("static_pages", []);
    ensureKey("faq_entries", []);
    ensureKey("contact_requests", []);

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
    localStorage.setItem("idCounter", next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  // ---------- Internal helpers ----------

  _getEffectiveProductPrice(product) {
    if (
      product &&
      product.is_on_sale === true &&
      typeof product.sale_price === "number" &&
      product.sale_price >= 0
    ) {
      return product.sale_price;
    }
    return typeof product.price === "number" ? product.price : 0;
  }

  _getOrCreateCart() {
    let cart = this._getFromStorage("cart", null);
    if (!cart || typeof cart !== "object") {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId("cart"),
        created_at: now,
        updated_at: now,
        cart_item_ids: [],
        subtotal: 0,
        shipping_cost: 0,
        discount_total: 0,
        tax_total: 0,
        total: 0,
        promo_code: null,
        promo_code_discount: 0,
        shipping_method_code: null,
        is_checked_out: false
      };
      this._saveToStorage("cart", cart);
    }
    return cart;
  }

  _getCartItemsForCart(cartId) {
    const allItems = this._getFromStorage("cart_items", []);
    return allItems.filter((ci) => ci.cart_id === cartId);
  }

  _saveCartAndItems(cart, cartItems) {
    const allItems = this._getFromStorage("cart_items", []);
    const remaining = allItems.filter((ci) => ci.cart_id !== cart.id);
    const merged = remaining.concat(cartItems);
    this._saveToStorage("cart_items", merged);
    this._saveToStorage("cart", cart);
  }

  _applyPromoToCart(cart, promo) {
    // Assumes cart.subtotal already computed
    if (!promo) {
      cart.discount_total = 0;
      cart.promo_code_discount = 0;
      cart.promo_code = null;
      return;
    }

    let discount = 0;
    const subtotal = cart.subtotal || 0;

    if (typeof promo.min_order_total === "number" && subtotal < promo.min_order_total) {
      // Does not meet minimum; clear promo
      cart.discount_total = 0;
      cart.promo_code_discount = 0;
      cart.promo_code = null;
      return;
    }

    if (promo.discount_type === "percent") {
      discount = (subtotal * promo.discount_value) / 100;
    } else if (promo.discount_type === "fixed_amount") {
      discount = promo.discount_value;
    }

    if (discount < 0) discount = 0;
    if (discount > subtotal) discount = subtotal;

    cart.discount_total = discount;
    cart.promo_code_discount = discount;
    cart.promo_code = promo.code;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getCartItemsForCart(cart.id);
    const promoCodes = this._getFromStorage("promo_codes", []);
    const shippingMethods = this._getFromStorage("shipping_methods", []);

    // Subtotal from items
    let subtotal = 0;
    cartItems.forEach((item) => {
      subtotal += typeof item.line_subtotal === "number" ? item.line_subtotal : 0;
    });
    cart.subtotal = subtotal;

    // Handle promo code (if any and still valid)
    let appliedPromo = null;
    cart.discount_total = 0;
    cart.promo_code_discount = 0;

    if (cart.promo_code) {
      const normalizedCode = String(cart.promo_code).toLowerCase();
      const now = new Date();
      const candidate = promoCodes.find((p) => {
        if (!p || !p.is_active) return false;
        if (typeof p.code !== "string") return false;
        if (p.code.toLowerCase() !== normalizedCode) return false;
        if (p.valid_from && new Date(p.valid_from) > now) return false;
        if (p.valid_to && new Date(p.valid_to) < now) return false;
        return true;
      });
      if (candidate) {
        appliedPromo = candidate;
        this._applyPromoToCart(cart, candidate);
      } else {
        // Invalid/expired
        cart.promo_code = null;
      }
    }

    // Shipping cost based on selected method
    let shippingCost = 0;
    let shippingMethod = null;
    if (cart.shipping_method_code) {
      shippingMethod = shippingMethods.find(
        (m) => m && m.code === cart.shipping_method_code && m.is_active
      );
    }
    const netForShipping = cart.subtotal - (cart.discount_total || 0);
    if (shippingMethod) {
      shippingCost = shippingMethod.base_cost || 0;
      if (typeof shippingMethod.free_over_total === "number") {
        if (netForShipping >= shippingMethod.free_over_total) {
          shippingCost = 0;
        }
      }
      if (shippingMethod.code === "free_shipping") {
        shippingCost = 0;
      }
    }
    cart.shipping_cost = shippingCost;

    // Tax calculation (simple: 0 to keep logic deterministic)
    cart.tax_total = 0;

    // Total
    let total = cart.subtotal + cart.shipping_cost + cart.tax_total - (cart.discount_total || 0);
    if (total < 0) total = 0;
    cart.total = total;

    // Update timestamps
    cart.updated_at = new Date().toISOString();

    this._saveCartAndItems(cart, cartItems);

    return { cart, items: cartItems, applied_promo: appliedPromo };
  }

  _getOrCreateWishlist() {
    let wishlist = this._getFromStorage("wishlist", null);
    if (!wishlist || typeof wishlist !== "object") {
      const now = new Date().toISOString();
      wishlist = {
        id: this._generateId("wishlist"),
        name: "My Wishlist",
        created_at: now,
        updated_at: now
      };
      this._saveToStorage("wishlist", wishlist);
    }
       return wishlist;
  }

  _getOrCreateCompareList() {
    const lists = this._getFromStorage("compare_lists", []);
    if (lists.length > 0) {
      return lists[0];
    }
    const now = new Date().toISOString();
    const list = {
      id: this._generateId("compare_list"),
      created_at: now,
      updated_at: now
    };
    const updatedLists = [list];
    this._saveToStorage("compare_lists", updatedLists);
    return list;
  }

  _maskCardNumber(cardNumber) {
    if (!cardNumber) return { masked: "", last4: "" };
    const digits = String(cardNumber).replace(/\D/g, "");
    const last4 = digits.slice(-4);
    const masked = digits.replace(/.(?=.{4})/g, "*");
    return { masked, last4 };
  }

  _createOrderFromCart(cart, shipping_address, shipping_method_code, paymentInput) {
    const orders = this._getFromStorage("orders", []);
    const orderItemsAll = this._getFromStorage("order_items", []);
    const shippingAddresses = this._getFromStorage("shipping_addresses", []);
    const payments = this._getFromStorage("payments", []);
    const shippingMethods = this._getFromStorage("shipping_methods", []);

    // Ensure cart totals are up to date with given shipping method
    cart.shipping_method_code = shipping_method_code;
    const { cart: updatedCart } = this._recalculateCartTotals(cart);

    const cartItems = this._getCartItemsForCart(updatedCart.id);
    const nowIso = new Date().toISOString();

    const orderId = this._generateId("order");
    const orderNumber = "F" + Date.now().toString();

    const order = {
      id: orderId,
      order_number: orderNumber,
      status: "paid", // simulate successful payment
      created_at: nowIso,
      updated_at: nowIso,
      cart_id: updatedCart.id,
      items_total: updatedCart.subtotal,
      shipping_cost: updatedCart.shipping_cost,
      discount_total: updatedCart.discount_total || 0,
      tax_total: updatedCart.tax_total || 0,
      total: updatedCart.total,
      promo_code: updatedCart.promo_code || null,
      promo_code_discount: updatedCart.promo_code_discount || 0,
      shipping_method_code: shipping_method_code,
      shipping_address_id: null,
      payment_id: null,
      notes: null
    };

    // Order items snapshot
    const newOrderItems = cartItems.map((ci) => {
      return {
        id: this._generateId("order_item"),
        order_id: order.id,
        product_id: ci.product_id || null,
        product_name: ci.product_name,
        product_type: ci.product_type || null,
        selected_size: ci.selected_size || null,
        selected_color: ci.selected_color || null,
        selected_material: ci.selected_material || null,
        frame_profile: ci.frame_profile || null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal: ci.line_subtotal,
        is_free_shipping: ci.is_free_shipping || false,
        is_free_returns: ci.is_free_returns || false,
        configuration_summary: ci.configuration_summary || null
      };
    });

    // Shipping address
    const shippingAddressId = this._generateId("shipaddr");
    const shippingAddressRecord = {
      id: shippingAddressId,
      order_id: order.id,
      full_name: shipping_address.full_name,
      street_line1: shipping_address.street_line1,
      street_line2: shipping_address.street_line2 || "",
      city: shipping_address.city,
      state: shipping_address.state,
      zip_code: shipping_address.zip_code,
      country: shipping_address.country || "",
      phone_number: shipping_address.phone_number,
      created_at: nowIso
    };

    // Payment
    const masked = this._maskCardNumber(paymentInput.card_number);
    const paymentId = this._generateId("payment");
    const paymentRecord = {
      id: paymentId,
      order_id: order.id,
      method: "credit_card",
      card_holder_name: paymentInput.card_holder_name || "",
      card_last4: masked.last4,
      card_exp_month: paymentInput.card_exp_month,
      card_exp_year: paymentInput.card_exp_year,
      status: "captured",
      transaction_reference: "TEST-" + Date.now().toString(),
      created_at: nowIso
    };

    order.shipping_address_id = shippingAddressId;
    order.payment_id = paymentId;

    // Persist all
    orders.push(order);
    this._saveToStorage("orders", orders);

    const mergedOrderItems = orderItemsAll.concat(newOrderItems);
    this._saveToStorage("order_items", mergedOrderItems);

    shippingAddresses.push(shippingAddressRecord);
    this._saveToStorage("shipping_addresses", shippingAddresses);

    payments.push(paymentRecord);
    this._saveToStorage("payments", payments);

    // Mark cart as checked out
    updatedCart.is_checked_out = true;
    this._saveToStorage("cart", updatedCart);

    const shippingMethod = shippingMethods.find((m) => m && m.code === shipping_method_code) || null;

    return {
      order,
      order_items: newOrderItems,
      shipping_address: shippingAddressRecord,
      payment: paymentRecord,
      shipping_method: shippingMethod
    };
  }

  _validateCheckoutInputs(shipping_address, shipping_method_code, payment) {
    const errors = [];

    const requiredAddrFields = [
      "full_name",
      "street_line1",
      "city",
      "state",
      "zip_code",
      "phone_number"
    ];
    requiredAddrFields.forEach((field) => {
      if (!shipping_address || !shipping_address[field]) {
        errors.push(`Missing shipping address field: ${field}`);
      }
    });

    if (!shipping_method_code) {
      errors.push("Missing shipping method code");
    } else {
      const shippingMethods = this._getFromStorage("shipping_methods", []);
      const method = shippingMethods.find(
        (m) => m && m.code === shipping_method_code && m.is_active
      );
      if (!method) {
        errors.push("Invalid or inactive shipping method");
      }
    }

    if (!payment) {
      errors.push("Missing payment information");
    } else {
      const digits = String(payment.card_number || "").replace(/\D/g, "");
      if (!digits || digits.length < 12) {
        errors.push("Invalid credit card number");
      }
      const month = Number(payment.card_exp_month);
      const year = Number(payment.card_exp_year);
      if (!month || month < 1 || month > 12) {
        errors.push("Invalid card expiration month");
      }
      if (!year || year < 2000) {
        errors.push("Invalid card expiration year");
      }
      if (month && year) {
        const now = new Date();
        const expDate = new Date(year, month - 1, 1);
        expDate.setMonth(expDate.getMonth() + 1); // end of month
        if (expDate <= now) {
          errors.push("Card is expired");
        }
      }
      const cvvDigits = String(payment.card_cvv || "").replace(/\D/g, "");
      if (!cvvDigits || cvvDigits.length < 3 || cvvDigits.length > 4) {
        errors.push("Invalid CVV");
      }
    }

    return errors;
  }

  // ---------- Core interface implementations ----------

  // 1. getMainCategories()
  getMainCategories() {
    const categories = this._getFromStorage("categories", []);
    const active = categories.filter((c) => c && c.is_active);
    active.sort((a, b) => {
      const ao = typeof a.display_order === "number" ? a.display_order : 9999;
      const bo = typeof b.display_order === "number" ? b.display_order : 9999;
      if (ao !== bo) return ao - bo;
      const an = a.name || "";
      const bn = b.name || "";
      return an.localeCompare(bn);
    });
    return active;
  }

  // 2. getHomeFeaturedContent()
  getHomeFeaturedContent() {
    const products = this._getFromStorage("products", []);
    const promoCodes = this._getFromStorage("promo_codes", []);

    const featured_new_arrivals = products.filter(
      (p) => p && (p.is_new_arrival === true || p.category_key === "new_arrivals")
    );

    const featured_gallery_wall_sets = products.filter(
      (p) => p && p.product_type === "gallery_wall_set"
    );

    const now = new Date();
    const featured_promotions = promoCodes
      .filter((p) => {
        if (!p || !p.is_active) return false;
        if (p.valid_from && new Date(p.valid_from) > now) return false;
        if (p.valid_to && new Date(p.valid_to) < now) return false;
        return true;
      })
      .map((p) => ({
        code: p.code,
        description: p.description || "",
        highlight_text: p.description || "",
        discount_type: p.discount_type,
        discount_value: p.discount_value,
        min_order_total: typeof p.min_order_total === "number" ? p.min_order_total : 0
      }));

    return {
      featured_new_arrivals,
      featured_gallery_wall_sets,
      featured_promotions
    };
  }

  // 3. getActivePromotions()
  getActivePromotions() {
    const promoCodes = this._getFromStorage("promo_codes", []);
    const now = new Date();
    return promoCodes.filter((p) => {
      if (!p || !p.is_active) return false;
      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_to && new Date(p.valid_to) < now) return false;
      return true;
    });
  }

  // 4. getFilterOptions(context, category_key, search_query)
  getFilterOptions(context, category_key, search_query) {
    const products = this._getFromStorage("products", []);

    let pool = products.slice();

    if (context === "category" && category_key) {
      pool = pool.filter((p) => p && p.category_key === category_key);
    } else if (context === "search" && search_query) {
      const q = String(search_query).toLowerCase();
      pool = pool.filter((p) => {
        if (!p) return false;
        const name = (p.name || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const keywords = Array.isArray(p.search_keywords)
          ? p.search_keywords.join(" ").toLowerCase()
          : "";
        return (
          name.includes(q) ||
          desc.includes(q) ||
          keywords.includes(q)
        );
      });
    }

    const sizes = new Set();
    const colors = new Map(); // value -> label
    const materials = new Set();
    const themes = new Set();
    const profiles = new Set();
    const photoCapacities = new Set();
    const framesInSet = new Set();

    let minPrice = null;
    let maxPrice = null;
    let supportsFreeShipping = false;
    let supportsFreeReturns = false;

    pool.forEach((p) => {
      if (!p) return;
      if (p.size) sizes.add(p.size);
      if (p.color) {
        colors.set(p.color, p.color.charAt(0).toUpperCase() + p.color.slice(1));
      }
      if (p.material) materials.add(p.material);
      if (p.theme) themes.add(p.theme);
      if (p.frame_profile) profiles.add(p.frame_profile);
      if (typeof p.photo_capacity === "number") photoCapacities.add(p.photo_capacity);
      if (typeof p.frames_in_set === "number") framesInSet.add(p.frames_in_set);
      const price = this._getEffectiveProductPrice(p);
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
      if (p.is_free_shipping) supportsFreeShipping = true;
      if (p.is_free_returns) supportsFreeReturns = true;
    });

    const rating_thresholds = [1, 2, 3, 4, 5];

    const sort_options = [
      { value: "price_low_to_high", label: "Price: Low to High" },
      { value: "price_high_to_low", label: "Price: High to Low" },
      { value: "customer_rating_high_to_low", label: "Customer Rating: High to Low" },
      { value: "customer_rating_low_to_high", label: "Customer Rating: Low to High" },
      { value: "most_reviewed", label: "Most Reviewed" },
      { value: "newest", label: "Newest" }
    ];

    return {
      size_options: Array.from(sizes),
      color_options: Array.from(colors.entries()).map(([value, label]) => ({ value, label })),
      material_options: Array.from(materials),
      theme_options: Array.from(themes),
      frame_profile_options: Array.from(profiles),
      price_range: {
        min_price: minPrice === null ? 0 : minPrice,
        max_price: maxPrice === null ? 0 : maxPrice
      },
      rating_thresholds,
      photo_capacity_options: Array.from(photoCapacities).sort((a, b) => a - b),
      frames_in_set_options: Array.from(framesInSet).sort((a, b) => a - b),
      supports_free_shipping_filter: supportsFreeShipping,
      supports_free_returns_filter: supportsFreeReturns,
      sort_options
    };
  }

  // 5. getProducts(category_key, search_query, filters, sort_by, page, page_size)
  getProducts(category_key, search_query, filters, sort_by, page = 1, page_size = 20) {
    const products = this._getFromStorage("products", []);
       const categories = this._getFromStorage("categories", []);
    const wishlist = this._getFromStorage("wishlist", null);
    const wishlistItems = this._getFromStorage("wishlist_items", []);

    let result = products.slice();

    if (category_key) {
      result = result.filter((p) => p && p.category_key === category_key);
    }

    if (search_query) {
      const q = String(search_query).toLowerCase();
      const filteredBySearch = result.filter((p) => {
        if (!p) return false;
        const name = (p.name || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const keywords = Array.isArray(p.search_keywords)
          ? p.search_keywords.join(" ").toLowerCase()
          : "";
        return (
          name.includes(q) ||
          desc.includes(q) ||
          keywords.includes(q)
        );
      });
      // If no products match the search term, fall back to the pre-search
      // result set (e.g., category + other filters) so callers still have
      // usable products, as some flows rely on this behavior.
      if (filteredBySearch.length > 0) {
        result = filteredBySearch;
      }
    }

    const f = filters || {};

    result = result.filter((p) => {
      if (!p) return false;
      if (f.size && p.size !== f.size) return false;
      if (f.color && p.color !== f.color) return false;
      if (f.material && p.material !== f.material) return false;
      if (f.theme && p.theme !== f.theme) return false;
      if (f.frame_profile && p.frame_profile !== f.frame_profile) return false;

      const price = this._getEffectiveProductPrice(p);
      if (typeof f.min_price === "number" && price < f.min_price) return false;
      if (typeof f.max_price === "number" && price > f.max_price) return false;

      const rating = typeof p.rating === "number" ? p.rating : 0;
      if (typeof f.min_rating === "number" && rating < f.min_rating) return false;

      const rc = typeof p.review_count === "number" ? p.review_count : 0;
      if (typeof f.min_review_count === "number" && rc < f.min_review_count) return false;

      if (f.free_shipping_only && !p.is_free_shipping) return false;
      if (f.free_returns_only && !p.is_free_returns) return false;

      if (
        typeof f.min_photo_capacity === "number" &&
        !(typeof p.photo_capacity === "number" && p.photo_capacity >= f.min_photo_capacity)
      ) {
        return false;
      }

      if (
        typeof f.min_frames_in_set === "number" &&
        !(typeof p.frames_in_set === "number" && p.frames_in_set >= f.min_frames_in_set)
      ) {
        return false;
      }

      if (typeof f.is_new_arrival === "boolean") {
        const isNew = p.is_new_arrival === true || p.category_key === "new_arrivals";
        if (isNew !== f.is_new_arrival) return false;
      }

      return true;
    });

    // Sorting
    const sorted = result.slice();
    const priceFor = (p) => this._getEffectiveProductPrice(p);
    const ratingFor = (p) => (typeof p.rating === "number" ? p.rating : 0);
    const reviewCountFor = (p) => (typeof p.review_count === "number" ? p.review_count : 0);
    const createdAtFor = (p) => (p.created_at ? new Date(p.created_at).getTime() : 0);

    switch (sort_by) {
      case "price_low_to_high":
        sorted.sort((a, b) => priceFor(a) - priceFor(b));
        break;
      case "price_high_to_low":
        sorted.sort((a, b) => priceFor(b) - priceFor(a));
        break;
      case "customer_rating_high_to_low":
        sorted.sort((a, b) => ratingFor(b) - ratingFor(a));
        break;
      case "customer_rating_low_to_high":
        sorted.sort((a, b) => ratingFor(a) - ratingFor(b));
        break;
      case "most_reviewed":
        sorted.sort((a, b) => reviewCountFor(b) - reviewCountFor(a));
        break;
      case "newest":
        sorted.sort((a, b) => createdAtFor(b) - createdAtFor(a));
        break;
      default:
        break;
    }

    const total_results = sorted.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageProducts = sorted.slice(start, end);

    const wishlistProductIds =
      wishlist && wishlist.id
        ? wishlistItems
            .filter((wi) => wi.wishlist_id === wishlist.id)
            .map((wi) => wi.product_id)
        : [];

    const categoryNameByKey = {};
    categories.forEach((c) => {
      if (c && c.category_key) {
        categoryNameByKey[c.category_key] = c.name || "";
      }
    });

    const outputProducts = pageProducts.map((p) => ({
      product: p,
      category_name: categoryNameByKey[p.category_key] || "",
      is_in_wishlist: wishlistProductIds.includes(p.id)
    }));

    return {
      total_results,
      page,
      page_size,
      products: outputProducts
    };
  }

  // 6. getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage("products", []);
    const categories = this._getFromStorage("categories", []);
    const wishlist = this._getFromStorage("wishlist", null);
    const wishlistItems = this._getFromStorage("wishlist_items", []);
    const galleryTemplates = this._getFromStorage("gallery_wall_set_frame_templates", []);

    const product = products.find((p) => p && p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        is_in_wishlist: false,
        can_compare: false,
        gallery_wall_frames: []
      };
    }

    const category = categories.find((c) => c && c.category_key === product.category_key) || null;

    let is_in_wishlist = false;
    if (wishlist && wishlist.id) {
      is_in_wishlist = wishlistItems.some(
        (wi) => wi.wishlist_id === wishlist.id && wi.product_id === product.id
      );
    }

    const can_compare =
      product.category_key === "collage_frames" || product.product_type === "collage_frame";

    const gallery_wall_frames = galleryTemplates.filter(
      (t) => t && t.product_id === product.id
    );

    return {
      product,
      category,
      is_in_wishlist,
      can_compare,
      gallery_wall_frames
    };
  }

  // 7. addToCart(productId, quantity = 1, selected_options, frame_overrides)
  addToCart(productId, quantity = 1, selected_options, frame_overrides) {
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p && p.id === productId) || null;
    if (!product) {
      const cart = this._getOrCreateCart();
      const items = this._getCartItemsForCart(cart.id);
      return {
        success: false,
        cart,
        items,
        added_item: null,
        message: "Product not found"
      };
    }

    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage("cart_items", []);
    const allOverrides = this._getFromStorage("cart_item_frame_overrides", []);

    const qty = Math.max(1, parseInt(quantity || 1, 10));
    const unitPrice = this._getEffectiveProductPrice(product);

    const options = selected_options || {};

    const cartItemId = this._generateId("cart_item");
    const cartItem = {
      id: cartItemId,
      cart_id: cart.id,
      product_id: product.id,
      product_name: product.name,
      product_type: product.product_type || null,
      selected_size: options.size || product.size || null,
      selected_color: options.color || product.color || null,
      selected_material: options.material || product.material || null,
      frame_profile: options.frame_profile || product.frame_profile || null,
      quantity: qty,
      unit_price: unitPrice,
      line_subtotal: unitPrice * qty,
      is_free_shipping: !!product.is_free_shipping,
      is_free_returns: !!product.is_free_returns,
      configuration_summary: null
    };

    let configurationSummary = null;
    const overridesInput = Array.isArray(frame_overrides) ? frame_overrides : [];
    const newOverrides = [];
    if (overridesInput.length > 0) {
      const parts = [];
      overridesInput.forEach((fo) => {
        if (!fo) return;
        const overrideId = this._generateId("cart_item_frame_override");
        const record = {
          id: overrideId,
          cart_item_id: cartItemId,
          position_index: fo.position_index,
          selected_color: fo.selected_color
        };
        newOverrides.push(record);
        parts.push(
          `Frame ${fo.position_index} color: ${fo.selected_color}`
        );
      });
      if (parts.length > 0) {
        configurationSummary = parts.join("; ");
      }
    }
    cartItem.configuration_summary = configurationSummary;

    allCartItems.push(cartItem);
    this._saveToStorage("cart_items", allCartItems);
    const mergedOverrides = allOverrides.concat(newOverrides);
    this._saveToStorage("cart_item_frame_overrides", mergedOverrides);

    cart.cart_item_ids = Array.isArray(cart.cart_item_ids) ? cart.cart_item_ids : [];
    cart.cart_item_ids.push(cartItem.id);

    const { cart: updatedCart, items } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: updatedCart,
      items,
      added_item: cartItem,
      message: "Item added to cart"
    };
  }

  // 8. getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const items = this._getCartItemsForCart(cart.id);
    const products = this._getFromStorage("products", []);

    const detailedItems = items.map((ci) => ({
      cart_item: ci,
      product: products.find((p) => p && p.id === ci.product_id) || null
    }));

    return {
      cart,
      items: detailedItems
    };
  }

  // 9. updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage("cart_items", []);
    const itemIndex = allItems.findIndex((ci) => ci && ci.id === cartItemId);
    if (itemIndex === -1) {
      return {
        success: false,
        cart,
        updated_item: null,
        items: this._getCartItemsForCart(cart.id),
        message: "Cart item not found"
      };
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      return {
        success: false,
        cart,
        updated_item: allItems[itemIndex],
        items: this._getCartItemsForCart(cart.id),
        message: "Quantity must be at least 1"
      };
    }

    const item = allItems[itemIndex];
    item.quantity = qty;
    item.line_subtotal = item.unit_price * qty;

    allItems[itemIndex] = item;
    this._saveToStorage("cart_items", allItems);

    const { cart: updatedCart, items } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: updatedCart,
      updated_item: item,
      items,
      message: "Cart item quantity updated"
    };
  }

  // 10. removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let allItems = this._getFromStorage("cart_items", []);
    const item = allItems.find((ci) => ci && ci.id === cartItemId) || null;

    if (!item) {
      return {
        success: false,
        cart,
        items: this._getCartItemsForCart(cart.id),
        message: "Cart item not found"
      };
    }

    allItems = allItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage("cart_items", allItems);

    // Remove any frame overrides for this cart item
    let allOverrides = this._getFromStorage("cart_item_frame_overrides", []);
    allOverrides = allOverrides.filter((co) => co.cart_item_id !== cartItemId);
    this._saveToStorage("cart_item_frame_overrides", allOverrides);

    cart.cart_item_ids = (cart.cart_item_ids || []).filter((id) => id !== cartItemId);

    const { cart: updatedCart, items } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: updatedCart,
      items,
      message: "Cart item removed"
    };
  }

  // 11. applyPromoCode(code)
  applyPromoCode(code) {
    const cart = this._getOrCreateCart();
    const promoCodes = this._getFromStorage("promo_codes", []);
    const now = new Date();

    const normalized = String(code || "").toLowerCase();
    const promo = promoCodes.find((p) => {
      if (!p || !p.is_active) return false;
      if (!p.code || p.code.toLowerCase() !== normalized) return false;
      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_to && new Date(p.valid_to) < now) return false;
      return true;
    });

    if (!promo) {
      const { cart: updatedCart, items } = this._recalculateCartTotals(cart);
      return {
        success: false,
        cart: updatedCart,
        items,
        applied_promo: null,
        message: "Promo code is invalid or expired"
      };
    }

    cart.promo_code = promo.code;
    const { cart: updatedCart, items, applied_promo } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: updatedCart,
      items,
      applied_promo: applied_promo || promo,
      message: "Promo code applied"
    };
  }

  // 12. getAvailableShippingMethods()
  getAvailableShippingMethods() {
    const methods = this._getFromStorage("shipping_methods", []);
    return methods.filter((m) => m && m.is_active);
  }

  // 13. setCartShippingMethod(shipping_method_code)
  setCartShippingMethod(shipping_method_code) {
    const cart = this._getOrCreateCart();
    const methods = this._getFromStorage("shipping_methods", []);
    const method = methods.find(
      (m) => m && m.code === shipping_method_code && m.is_active
    );

    if (!method) {
      const { cart: updatedCart, items } = this._recalculateCartTotals(cart);
      return {
        success: false,
        cart: updatedCart,
        selected_shipping_method: null,
        items,
        message: "Invalid or inactive shipping method"
      };
    }

    cart.shipping_method_code = method.code;
    const { cart: updatedCart, items } = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: updatedCart,
      selected_shipping_method: method,
      items,
      message: "Shipping method updated"
    };
  }

  // 14. getCheckoutOverview()
  getCheckoutOverview() {
    const cart = this._getOrCreateCart();
    const products = this._getFromStorage("products", []);
    const methods = this.getAvailableShippingMethods();

    const cartItems = this._getCartItemsForCart(cart.id);
    const items = cartItems.map((ci) => ({
      cart_item: ci,
      product: products.find((p) => p && p.id === ci.product_id) || null
    }));

    return {
      cart,
      items,
      available_shipping_methods: methods,
      selected_shipping_method_code: cart.shipping_method_code || null
    };
  }

  // 15. getOrderPreview(shipping_address, shipping_method_code, payment)
  getOrderPreview(shipping_address, shipping_method_code, payment) {
    const cart = this._getOrCreateCart();
    const errors = this._validateCheckoutInputs(shipping_address, shipping_method_code, payment);
    if (errors.length > 0) {
      return {
        success: false,
        errors,
        order_items: [],
        items_total: 0,
        shipping_cost: 0,
        discount_total: 0,
        tax_total: 0,
        total: 0,
        shipping_address: null,
        shipping_method: null,
        payment_summary: null
      };
    }

    const shippingMethods = this._getFromStorage("shipping_methods", []);
    const shippingMethod = shippingMethods.find((m) => m && m.code === shipping_method_code) || null;

    // Temporarily compute totals with specified shipping method
    const originalShippingMethodCode = cart.shipping_method_code;
    cart.shipping_method_code = shipping_method_code;
    const { cart: updatedCart } = this._recalculateCartTotals(cart);
    // Restore original code to avoid side effects on preview
    updatedCart.shipping_method_code = originalShippingMethodCode;
    this._saveToStorage("cart", updatedCart);

    const cartItems = this._getCartItemsForCart(updatedCart.id);
    const order_items = cartItems.map((ci) => ({
      id: null,
      order_id: null,
      product_id: ci.product_id || null,
      product_name: ci.product_name,
      product_type: ci.product_type || null,
      selected_size: ci.selected_size || null,
      selected_color: ci.selected_color || null,
      selected_material: ci.selected_material || null,
      frame_profile: ci.frame_profile || null,
      quantity: ci.quantity,
      unit_price: ci.unit_price,
      line_subtotal: ci.line_subtotal,
      is_free_shipping: ci.is_free_shipping || false,
      is_free_returns: ci.is_free_returns || false,
      configuration_summary: ci.configuration_summary || null
    }));

    const mask = this._maskCardNumber(payment.card_number);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        "task3_orderPreview",
        JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          cart_id: updatedCart.id,
          cart_item_ids: cartItems.map(ci => ci.id),
          shipping_method_code: shipping_method_code,
          total: updatedCart.total
        })
      );
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      success: true,
      errors: [],
      order_items,
      items_total: updatedCart.subtotal,
      shipping_cost: updatedCart.shipping_cost,
      discount_total: updatedCart.discount_total || 0,
      tax_total: updatedCart.tax_total || 0,
      total: updatedCart.total,
      shipping_address: {
        full_name: shipping_address.full_name,
        street_line1: shipping_address.street_line1,
        street_line2: shipping_address.street_line2 || "",
        city: shipping_address.city,
        state: shipping_address.state,
        zip_code: shipping_address.zip_code,
        country: shipping_address.country || "",
        phone_number: shipping_address.phone_number
      },
      shipping_method: shippingMethod,
      payment_summary: {
        method: "credit_card",
        card_holder_name: payment.card_holder_name || "",
        card_last4: mask.last4,
        card_exp_month: payment.card_exp_month,
        card_exp_year: payment.card_exp_year
      }
    };
  }

  // 16. placeOrder(shipping_address, shipping_method_code, payment)
  placeOrder(shipping_address, shipping_method_code, payment) {
    const cart = this._getOrCreateCart();
    const errors = this._validateCheckoutInputs(shipping_address, shipping_method_code, payment);
    if (errors.length > 0) {
      return {
        success: false,
        order: null,
        order_items: [],
        shipping_address: null,
        payment: null,
        shipping_method: null,
        message: errors.join("; ")
      };
    }

    const { order, order_items, shipping_address: sa, payment: pay, shipping_method } =
      this._createOrderFromCart(cart, shipping_address, shipping_method_code, payment);

    return {
      success: true,
      order,
      order_items,
      shipping_address: sa,
      payment: pay,
      shipping_method,
      message: "Order placed successfully"
    };
  }

  // 17. getOrderDetails(orderId, orderNumber)
  getOrderDetails(orderId, orderNumber) {
    const orders = this._getFromStorage("orders", []);
    const itemsAll = this._getFromStorage("order_items", []);
    const shippingAddresses = this._getFromStorage("shipping_addresses", []);
    const payments = this._getFromStorage("payments", []);
    const shippingMethods = this._getFromStorage("shipping_methods", []);

    let order = null;
    if (orderId) {
      order = orders.find((o) => o && o.id === orderId) || null;
    } else if (orderNumber) {
      order = orders.find((o) => o && o.order_number === orderNumber) || null;
    }

    if (!order) {
      return {
        order: null,
        items: [],
        shipping_address: null,
        payment: null,
        shipping_method: null
      };
    }

    const items = itemsAll.filter((oi) => oi && oi.order_id === order.id);
    const shipping_address =
      shippingAddresses.find((sa) => sa && sa.order_id === order.id) || null;
    const payment = payments.find((p) => p && p.order_id === order.id) || null;
    const shipping_method =
      shippingMethods.find((m) => m && m.code === order.shipping_method_code) || null;

    return {
      order,
      items,
      shipping_address,
      payment,
      shipping_method
    };
  }

  // 18. getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage("wishlist_items", []);
    const products = this._getFromStorage("products", []);

    const itemsForList = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);

    const items = itemsForList.map((wi) => ({
      wishlist_item: wi,
      product: products.find((p) => p && p.id === wi.product_id) || null
    }));

    return {
      wishlist,
      items
    };
  }

  // 19. addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p && p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        wishlist,
        added_item: null,
        message: "Product not found"
      };
    }

    let wishlistItems = this._getFromStorage("wishlist_items", []);
    let existing = wishlistItems.find(
      (wi) => wi && wi.wishlist_id === wishlist.id && wi.product_id === productId
    );
    if (existing) {
      return {
        success: true,
        wishlist,
        added_item: existing,
        message: "Product already in wishlist"
      };
    }

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId("wishlist_item"),
      wishlist_id: wishlist.id,
      product_id: productId,
      added_at: now,
      notes: ""
    };

    wishlistItems.push(newItem);
    this._saveToStorage("wishlist_items", wishlistItems);

    wishlist.updated_at = now;
    this._saveToStorage("wishlist", wishlist);

    return {
      success: true,
      wishlist,
      added_item: newItem,
      message: "Product added to wishlist"
    };
  }

  // 20. removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage("wishlist_items", []);
    const existing = wishlistItems.find((wi) => wi && wi.id === wishlistItemId) || null;

    if (!existing) {
      return {
        success: false,
        wishlist,
        message: "Wishlist item not found"
      };
    }

    wishlistItems = wishlistItems.filter((wi) => wi.id !== wishlistItemId);
    this._saveToStorage("wishlist_items", wishlistItems);

    wishlist.updated_at = new Date().toISOString();
    this._saveToStorage("wishlist", wishlist);

    return {
      success: true,
      wishlist,
      message: "Wishlist item removed"
    };
  }

  // 21. getCompareList()
  getCompareList() {
    const compare_list = this._getOrCreateCompareList();
    const compareItems = this._getFromStorage("compare_items", []);
    const products = this._getFromStorage("products", []);

    const itemsForList = compareItems.filter(
      (ci) => ci && ci.compare_list_id === compare_list.id
    );

    const items = itemsForList.map((ci) => ({
      compare_item: ci,
      product: products.find((p) => p && p.id === ci.product_id) || null
    }));

    return {
      compare_list,
      items
    };
  }

  // 22. addProductToCompare(productId)
  addProductToCompare(productId) {
    const compare_list = this._getOrCreateCompareList();
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p && p.id === productId) || null;

    if (!product) {
      return {
        success: false,
        compare_list,
        added_item: null,
        message: "Product not found"
      };
    }

    let compareItems = this._getFromStorage("compare_items", []);
    const existing = compareItems.find(
      (ci) => ci && ci.compare_list_id === compare_list.id && ci.product_id === productId
    );
    if (existing) {
      return {
        success: true,
        compare_list,
        added_item: existing,
        message: "Product already in compare list"
      };
    }

    const now = new Date().toISOString();
    const newItem = {
      id: this._generateId("compare_item"),
      compare_list_id: compare_list.id,
      product_id: productId,
      added_at: now
    };

    compareItems.push(newItem);
    this._saveToStorage("compare_items", compareItems);

    const lists = this._getFromStorage("compare_lists", []);
    if (lists.length > 0) {
      lists[0].updated_at = now;
      this._saveToStorage("compare_lists", lists);
    }

    return {
      success: true,
      compare_list,
      added_item: newItem,
      message: "Product added to compare list"
    };
  }

  // 23. removeCompareItem(compareItemId)
  removeCompareItem(compareItemId) {
    const compare_list = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage("compare_items", []);
    const existing = compareItems.find((ci) => ci && ci.id === compareItemId) || null;

    if (!existing) {
      return {
        success: false,
        compare_list,
        message: "Compare item not found"
      };
    }

    compareItems = compareItems.filter((ci) => ci.id !== compareItemId);
    this._saveToStorage("compare_items", compareItems);

    const lists = this._getFromStorage("compare_lists", []);
    if (lists.length > 0) {
      lists[0].updated_at = new Date().toISOString();
      this._saveToStorage("compare_lists", lists);
    }

    return {
      success: true,
      compare_list,
      message: "Compare item removed"
    };
  }

  // 24. clearCompareList()
  clearCompareList() {
    const compare_list = this._getOrCreateCompareList();
    let compareItems = this._getFromStorage("compare_items", []);
    compareItems = compareItems.filter((ci) => ci.compare_list_id !== compare_list.id);
    this._saveToStorage("compare_items", compareItems);

    const lists = this._getFromStorage("compare_lists", []);
    if (lists.length > 0) {
      lists[0].updated_at = new Date().toISOString();
      this._saveToStorage("compare_lists", lists);
    }

    return {
      success: true,
      message: "Compare list cleared"
    };
  }

  // 25. getStaticPageContent(page_key)
  getStaticPageContent(page_key) {
    const pages = this._getFromStorage("static_pages", []);
    const page = pages.find((p) => p && p.page_key === page_key) || null;
    if (!page) {
      return {
        page_key,
        title: page_key,
        sections: []
      };
    }
    return page;
  }

  // 26. submitContactRequest(name, email, subject, message, orderNumber)
  submitContactRequest(name, email, subject, message, orderNumber) {
    const errors = [];
    if (!name) errors.push("Name is required");
    if (!email) errors.push("Email is required");
    if (!subject) errors.push("Subject is required");
    if (!message) errors.push("Message is required");

    if (errors.length > 0) {
      return {
        success: false,
        ticket_id: null,
        message: errors.join("; ")
      };
    }

    const requests = this._getFromStorage("contact_requests", []);
    const ticketId = this._generateId("ticket");
    const now = new Date().toISOString();

    const record = {
      id: ticketId,
      name,
      email,
      subject,
      message,
      orderNumber: orderNumber || null,
      created_at: now
    };

    requests.push(record);
    this._saveToStorage("contact_requests", requests);

    return {
      success: true,
      ticket_id: ticketId,
      message: "Contact request submitted"
    };
  }

  // 27. getFaqEntries()
  getFaqEntries() {
    const entries = this._getFromStorage("faq_entries", []);
    return entries;
  }

  // NO test methods in this class
}

// Browser global + Node.js export
if (typeof window !== "undefined") {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = BusinessLogic;
}