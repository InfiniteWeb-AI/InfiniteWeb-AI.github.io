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

  // =========================
  // Storage helpers
  // =========================
  _initStorage() {
    // Arrays of entities
    const arrayKeys = [
      "categories", // Category
      "subcategories", // Subcategory
      "products", // Product
      "cart_items", // CartItem
      "orders", // Order
      "order_items", // OrderItem
      "installation_quote_requests", // InstallationQuoteRequest
      "service_bookings", // ServiceBooking
      "documentation_categories", // DocumentationCategory
      "documented_product_models", // DocumentedProductModel
      "documentation_files", // DocumentationFile
      "policies", // Policies for getPolicies
      "contact_messages" // For submitContactForm
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Singular objects
    const singularKeys = ["cart", "compare_list"];
    singularKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        // store JSON null
        localStorage.setItem(key, "null");
      }
    });

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

  // =========================
  // Internal domain helpers
  // =========================

  _getOrCreateCart() {
    let cart = this._getFromStorage("cart", null);
    if (!cart || typeof cart !== "object") {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId("cart"),
        items: [], // array of CartItem IDs
        created_at: now,
        updated_at: now,
        currency: "usd"
      };
      this._saveToStorage("cart", cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const allItems = this._getFromStorage("cart_items", []);
    const itemsForCart = allItems.filter((i) => i.cartId === cart.id);
    let subtotal = 0;
    itemsForCart.forEach((item) => {
      subtotal += Number(item.line_total) || 0;
    });
    const estimated_tax = 0; // tax handling can be added later
    const total = subtotal + estimated_tax;
    return { subtotal, estimated_tax, total, itemsForCart };
  }

  _buildCartResponse(cart) {
    if (!cart) return null;
    const { subtotal, estimated_tax, total, itemsForCart } = this._recalculateCartTotals(cart);
    const products = this._getFromStorage("products", []);
    const items = itemsForCart.map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.productId) || null
    }));
    return {
      id: cart.id,
      currency: cart.currency,
      items,
      subtotal,
      estimated_tax,
      total,
      updated_at: cart.updated_at
    };
  }

  _getOrCreateCompareList() {
    let list = this._getFromStorage("compare_list", null);
    if (!list || typeof list !== "object") {
      list = {
        id: this._generateId("compare"),
        productIds: [],
        created_at: new Date().toISOString()
      };
      this._saveToStorage("compare_list", list);
    }
    return list;
  }

  _getOrCreateDraftOrder(cart) {
    const orders = this._getFromStorage("orders", []);
    let order = orders.find((o) => o.cartId === cart.id && o.status === "draft");
    const now = new Date().toISOString();
    if (!order) {
      order = {
        id: this._generateId("order"),
        cartId: cart.id,
        status: "draft",
        items: [], // array of OrderItem IDs or embedded objects
        subtotal: 0,
        shipping_cost: 0,
        tax: 0,
        total: 0,
        currency: cart.currency || "usd",
        shipping_method: "standard",
        payment_method: "credit_debit_card",
        payment_status: "not_paid",
        card_last4: null,
        card_expiry_month: null,
        card_expiry_year: null,
        shipping_name: "",
        shipping_street: "",
        shipping_city: "",
        shipping_postal_code: "",
        shipping_state: "",
        shipping_country: "",
        contact_email: "",
        contact_phone: "",
        created_at: now,
        updated_at: now,
        placed_at: null
      };
      orders.push(order);
      this._saveToStorage("orders", orders);
    }
    return order;
  }

  _buildOrderSummary(order) {
    if (!order) return null;
    const orderItems = this._getFromStorage("order_items", []);
    const products = this._getFromStorage("products", []);
    const itemsForOrder = orderItems.filter((i) => i.orderId === order.id);
    const items = itemsForOrder.map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.productId) || null
    }));

    return {
      id: order.id,
      status: order.status,
      items,
      subtotal: order.subtotal,
      shipping_cost: order.shipping_cost,
      tax: order.tax,
      total: order.total,
      currency: order.currency,
      shipping_method: order.shipping_method,
      payment_method: order.payment_method,
      card_last4: order.card_last4,
      card_expiry_month: order.card_expiry_month,
      card_expiry_year: order.card_expiry_year,
      shipping_name: order.shipping_name,
      shipping_street: order.shipping_street,
      shipping_city: order.shipping_city,
      shipping_postal_code: order.shipping_postal_code,
      shipping_state: order.shipping_state,
      shipping_country: order.shipping_country,
      contact_email: order.contact_email,
      contact_phone: order.contact_phone,
      placed_at: order.placed_at
    };
  }

  _validateServiceAvailability(service_type, requested_date, time_slot) {
    // Simple placeholder: always true for now. Can be extended to check
    // against generated availability or existing bookings.
    return true;
  }

  _filterAndSortProducts(products, filters = {}, sort_by) {
    let result = Array.isArray(products) ? products.slice() : [];

    if (filters) {
      const {
        min_price,
        max_price,
        fuel_type,
        technology,
        min_floor_area_m2,
        max_floor_area_m2,
        min_power_output_watts,
        max_power_output_watts,
        min_capacity_gallons,
        max_capacity_gallons,
        mounting_type,
        application_type,
        thermostat_type,
        is_wifi_enabled,
        min_customer_rating,
        only_comparable
      } = filters;

      if (typeof min_price === "number") {
        result = result.filter((p) => typeof p.price === "number" && p.price >= min_price);
      }
      if (typeof max_price === "number") {
        result = result.filter((p) => typeof p.price === "number" && p.price <= max_price);
      }
      if (fuel_type) {
        result = result.filter((p) => p.fuel_type === fuel_type);
      }
      if (technology) {
        result = result.filter((p) => p.technology === technology);
      }
      if (typeof min_floor_area_m2 === "number") {
        result = result.filter((p) => {
          if (typeof p.max_floor_area_m2 === "number") {
            return p.max_floor_area_m2 >= min_floor_area_m2;
          }
          return true;
        });
      }
      if (typeof max_floor_area_m2 === "number") {
        result = result.filter((p) => {
          if (typeof p.min_floor_area_m2 === "number") {
            return p.min_floor_area_m2 <= max_floor_area_m2;
          }
          return true;
        });
      }
      if (typeof min_power_output_watts === "number") {
        result = result.filter((p) => {
          if (typeof p.power_output_watts_max === "number") {
            return p.power_output_watts_max >= min_power_output_watts;
          }
          return true;
        });
      }
      if (typeof max_power_output_watts === "number") {
        result = result.filter((p) => {
          if (typeof p.power_output_watts_min === "number") {
            return p.power_output_watts_min <= max_power_output_watts;
          }
          return true;
        });
      }
      if (typeof min_capacity_gallons === "number") {
        result = result.filter((p) => {
          if (typeof p.capacity_gallons === "number") {
            return p.capacity_gallons >= min_capacity_gallons;
          }
          return true;
        });
      }
      if (typeof max_capacity_gallons === "number") {
        result = result.filter((p) => {
          if (typeof p.capacity_gallons === "number") {
            return p.capacity_gallons <= max_capacity_gallons;
          }
          return true;
        });
      }
      if (mounting_type) {
        result = result.filter((p) => p.mounting_type === mounting_type);
      }
      if (application_type) {
        result = result.filter((p) => p.application_type === application_type);
      }
      if (thermostat_type) {
        result = result.filter((p) => p.thermostat_type === thermostat_type);
      }
      if (typeof is_wifi_enabled === "boolean") {
        result = result.filter((p) => p.is_wifi_enabled === is_wifi_enabled);
      }
      if (typeof min_customer_rating === "number") {
        result = result.filter((p) => typeof p.average_customer_rating === "number" && p.average_customer_rating >= min_customer_rating);
      }
      if (only_comparable) {
        result = result.filter((p) => p.is_comparable === true);
      }
    }

    if (sort_by) {
      const sortKey = sort_by;
      result.sort((a, b) => {
        switch (sortKey) {
          case "price_low_to_high": {
            const pa = typeof a.price === "number" ? a.price : Number.MAX_VALUE;
            const pb = typeof b.price === "number" ? b.price : Number.MAX_VALUE;
            return pa - pb;
          }
          case "price_high_to_low": {
            const pa = typeof a.price === "number" ? a.price : -1;
            const pb = typeof b.price === "number" ? b.price : -1;
            return pb - pa;
          }
          case "efficiency_high_to_low": {
            const ea = typeof a.efficiency_rating_percent === "number" ? a.efficiency_rating_percent : -1;
            const eb = typeof b.efficiency_rating_percent === "number" ? b.efficiency_rating_percent : -1;
            return eb - ea;
          }
          case "rating_high_to_low": {
            const ra = typeof a.average_customer_rating === "number" ? a.average_customer_rating : -1;
            const rb = typeof b.average_customer_rating === "number" ? b.average_customer_rating : -1;
            if (rb !== ra) return rb - ra;
            const rca = typeof a.review_count === "number" ? a.review_count : 0;
            const rcb = typeof b.review_count === "number" ? b.review_count : 0;
            return rcb - rca;
          }
          default:
            return 0;
        }
      });
    }

    return result;
  }

  _maskCardDetails(card_last4) {
    if (!card_last4) return null;
    const str = String(card_last4);
    return str.slice(-4);
  }

  _getShippingMethodsConfig() {
    return [
      {
        code: "standard",
        label: "Standard shipping",
        description: "Delivery in 3-7 business days",
        cost: 25,
        currency: "usd",
        estimated_days: 5
      },
      {
        code: "express",
        label: "Express shipping",
        description: "Delivery in 1-3 business days",
        cost: 50,
        currency: "usd",
        estimated_days: 2
      },
      {
        code: "next_day",
        label: "Next-day shipping",
        description: "Next business day delivery",
        cost: 80,
        currency: "usd",
        estimated_days: 1
      },
      {
        code: "pickup",
        label: "Store pickup",
        description: "Pick up at our warehouse",
        cost: 0,
        currency: "usd",
        estimated_days: 0
      }
    ];
  }

  _getPaymentMethodsConfig() {
    return [
      {
        code: "credit_debit_card",
        label: "Credit or debit card",
        description: "Pay securely by card"
      },
      {
        code: "bank_transfer",
        label: "Bank transfer",
        description: "Pay by bank transfer before dispatch"
      },
      {
        code: "cash_on_delivery",
        label: "Cash on delivery",
        description: "Pay on delivery (where available)"
      }
    ];
  }

  // =========================
  // Core interface implementations
  // =========================

  // --- Categories & Homepage ---

  getMainCategories() {
    return this._getFromStorage("categories", []);
  }

  getCategoryOverview(categorySlug) {
    const categories = this._getFromStorage("categories", []);
    const subcategories = this._getFromStorage("subcategories", []);

    const category = categories.find((c) => c.slug === categorySlug) || null;
    const subs = subcategories.filter((s) => s.categorySlug === categorySlug);

    let guidance_text = "";
    if (categorySlug === "heating_systems") {
      guidance_text = "Choose a heating subcategory such as gas boilers or radiators based on your property type and heat output needs.";
    } else if (categorySlug === "potable_water_systems") {
      guidance_text = "Browse pumps, filters, storage tanks, and water heaters to build or upgrade your potable water system.";
    } else if (categorySlug === "thermostats") {
      guidance_text = "Select smart or programmable thermostats to control your heating and hot water efficiently.";
    }

    return { category, subcategories: subs, guidance_text };
  }

  getHomepageFeaturedProducts(section) {
    const products = this._getFromStorage("products", []).filter((p) => p.is_active);
    const featured_groups = [];

    const addGroup = (sectionKey, title, description, predicate, sorter) => {
      if (section && section !== sectionKey) return;
      let groupProducts = products.filter(predicate);
      if (sorter) {
        groupProducts = groupProducts.slice().sort(sorter);
      }
      featured_groups.push({ section: sectionKey, title, description, products: groupProducts });
    };

    addGroup(
      "high_efficiency_boilers",
      "High-efficiency gas boilers",
      "Condensing gas boilers with high efficiency ratings.",
      (p) =>
        p.categorySlug === "heating_systems" &&
        p.subcategorySlug === "gas_boilers" &&
        p.technology === "condensing",
      (a, b) => {
        const ea = typeof a.efficiency_rating_percent === "number" ? a.efficiency_rating_percent : -1;
        const eb = typeof b.efficiency_rating_percent === "number" ? b.efficiency_rating_percent : -1;
        return eb - ea;
      }
    );

    addGroup(
      "top_rated_water_heaters",
      "Top-rated water heaters",
      "Electric water heaters with high customer ratings.",
      (p) =>
        p.categorySlug === "potable_water_systems" &&
        p.subcategorySlug === "water_heaters" &&
        p.fuel_type === "electric",
      (a, b) => {
        const ra = typeof a.average_customer_rating === "number" ? a.average_customer_rating : -1;
        const rb = typeof b.average_customer_rating === "number" ? b.average_customer_rating : -1;
        return rb - ra;
      }
    );

    addGroup(
      "smart_thermostats",
      "Smart & WiFi thermostats",
      "Connect your heating system to smart controls.",
      (p) =>
        p.categorySlug === "thermostats" &&
        p.subcategorySlug === "thermostats" &&
        (p.thermostat_type === "smart" ||
          p.thermostat_type === "wifi" ||
          p.is_wifi_enabled === true),
      (a, b) => {
        const ra = typeof a.average_customer_rating === "number" ? a.average_customer_rating : -1;
        const rb = typeof b.average_customer_rating === "number" ? b.average_customer_rating : -1;
        return rb - ra;
      }
    );

    return { featured_groups };
  }

  // --- Product filtering & listing ---

  getProductFilterOptions(subcategorySlug) {
    const products = this._getFromStorage("products", []).filter(
      (p) => p.subcategorySlug === subcategorySlug && p.is_active
    );

    const priceValues = products.map((p) => p.price).filter((v) => typeof v === "number");
    const floorMinValues = products
      .map((p) => p.min_floor_area_m2)
      .filter((v) => typeof v === "number");
    const floorMaxValues = products
      .map((p) => p.max_floor_area_m2)
      .filter((v) => typeof v === "number");
    const powerMinValues = products
      .map((p) => p.power_output_watts_min)
      .filter((v) => typeof v === "number");
    const powerMaxValues = products
      .map((p) => p.power_output_watts_max)
      .filter((v) => typeof v === "number");
    const capacityValues = products
      .map((p) => p.capacity_gallons)
      .filter((v) => typeof v === "number");

    const uniqueFieldValues = (field) => {
      const set = new Set();
      products.forEach((p) => {
        if (p[field]) set.add(p[field]);
      });
      return Array.from(set);
    };

    const price_range = priceValues.length
      ? {
          min: Math.min.apply(null, priceValues),
          max: Math.max.apply(null, priceValues),
          currency: "usd"
        }
      : { min: null, max: null, currency: "usd" };

    const floor_area_range_m2 =
      floorMinValues.length || floorMaxValues.length
        ? {
            min: floorMinValues.length ? Math.min.apply(null, floorMinValues) : null,
            max: floorMaxValues.length ? Math.max.apply(null, floorMaxValues) : null
          }
        : { min: null, max: null };

    const power_output_range_watts =
      powerMinValues.length || powerMaxValues.length
        ? {
            min: powerMinValues.length ? Math.min.apply(null, powerMinValues) : null,
            max: powerMaxValues.length ? Math.max.apply(null, powerMaxValues) : null
          }
        : { min: null, max: null };

    const capacity_range_gallons = capacityValues.length
      ? {
          min: Math.min.apply(null, capacityValues),
          max: Math.max.apply(null, capacityValues)
        }
      : { min: null, max: null };

    const available_fuel_types = uniqueFieldValues("fuel_type").map((v) => ({ value: v, label: v }));
    const available_technologies = uniqueFieldValues("technology").map((v) => ({ value: v, label: v }));
    const available_mounting_types = uniqueFieldValues("mounting_type").map((v) => ({ value: v, label: v }));
    const available_application_types = uniqueFieldValues("application_type").map((v) => ({ value: v, label: v }));
    const available_thermostat_types = uniqueFieldValues("thermostat_type").map((v) => ({ value: v, label: v }));

    const customer_rating_options = [
      { value: 3.0, label: "3.0 stars & up" },
      { value: 4.0, label: "4.0 stars & up" },
      { value: 4.5, label: "4.5 stars & up" }
    ];

    const sort_options = [
      { value: "price_low_to_high", label: "Price: Low to High" },
      { value: "price_high_to_low", label: "Price: High to Low" },
      { value: "efficiency_high_to_low", label: "Efficiency: High to Low" },
      { value: "rating_high_to_low", label: "Customer rating: High to Low" }
    ];

    return {
      price_range,
      available_fuel_types,
      available_technologies,
      floor_area_range_m2,
      power_output_range_watts,
      capacity_range_gallons,
      available_mounting_types,
      available_application_types,
      available_thermostat_types,
      customer_rating_options,
      sort_options
    };
  }

  getSubcategoryProducts(subcategorySlug, filters, sort_by, page = 1, page_size = 20) {
    const allProducts = this._getFromStorage("products", []).filter(
      (p) => p.subcategorySlug === subcategorySlug && p.is_active
    );

    const filteredSorted = this._filterAndSortProducts(allProducts, filters || {}, sort_by);

    const total_count = filteredSorted.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const products = filteredSorted.slice(start, end);

    return {
      products,
      total_count,
      page,
      page_size,
      applied_filters: {
        ...(filters || {})
      },
      sort_by: sort_by || null
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p.id === productId) || null;
    let related_products = [];
    if (product) {
      related_products = products
        .filter((p) => p.subcategorySlug === product.subcategorySlug && p.id !== product.id && p.is_active)
        .slice(0, 10);
    }
    return { product, related_products };
  }

  // --- Cart ---

  addToCart(productId, quantity = 1) {
    if (quantity <= 0) quantity = 1;

    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p.id === productId && p.is_active);
    if (!product) {
      return { success: false, message: "Product not found or inactive", cart: null };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);

    let item = cartItems.find((ci) => ci.cartId === cart.id && ci.productId === productId);
    if (item) {
      item.quantity += quantity;
      item.line_total = item.quantity * product.price;
    } else {
      item = {
        id: this._generateId("cartitem"),
        cartId: cart.id,
        productId: productId,
        product_name_snapshot: product.name,
        unit_price: product.price,
        quantity: quantity,
        line_total: product.price * quantity,
        added_at: new Date().toISOString()
      };
      cartItems.push(item);
      if (!Array.isArray(cart.items)) {
        cart.items = [];
      }
      if (!cart.items.includes(item.id)) {
        cart.items.push(item.id);
      }
    }

    cart.updated_at = new Date().toISOString();

    this._saveToStorage("cart_items", cartItems);
    this._saveToStorage("cart", cart);

    return {
      success: true,
      message: "Product added to cart",
      cart: this._buildCartResponse(cart)
    };
  }

  getCartDetails() {
    const cart = this._getFromStorage("cart", null);
    if (!cart) {
      return { cart: null };
    }
    return { cart: this._buildCartResponse(cart) };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);
    if (idx === -1) {
      return {
        success: false,
        message: "Cart item not found",
        cart: this._buildCartResponse(cart)
      };
    }

    if (quantity <= 0) {
      const removed = cartItems[idx];
      cartItems.splice(idx, 1);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== removed.id);
      }
    } else {
      const item = cartItems[idx];
      item.quantity = quantity;
      item.line_total = item.unit_price * quantity;
    }

    cart.updated_at = new Date().toISOString();

    this._saveToStorage("cart_items", cartItems);
    this._saveToStorage("cart", cart);

    return {
      success: true,
      message: "Cart updated",
      cart: this._buildCartResponse(cart)
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);

    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);
    if (idx === -1) {
      return {
        success: false,
        message: "Cart item not found",
        cart: this._buildCartResponse(cart)
      };
    }

    const removed = cartItems[idx];
    cartItems.splice(idx, 1);
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== removed.id);
    }

    cart.updated_at = new Date().toISOString();

    this._saveToStorage("cart_items", cartItems);
    this._saveToStorage("cart", cart);

    return {
      success: true,
      message: "Item removed from cart",
      cart: this._buildCartResponse(cart)
    };
  }

  // --- Guest Checkout / Orders ---

  initGuestCheckoutFromCart() {
    const cart = this._getOrCreateCart();
    const allCartItems = this._getFromStorage("cart_items", []);
    const itemsForCart = allCartItems.filter((ci) => ci.cartId === cart.id);

    if (!itemsForCart.length) {
      return { success: false, order: null };
    }

    const order = this._getOrCreateDraftOrder(cart);
    let orderItems = this._getFromStorage("order_items", []);

    // Remove existing items for this order to keep it in sync with cart
    orderItems = orderItems.filter((oi) => oi.orderId !== order.id);

    const newOrderItemIds = [];
    itemsForCart.forEach((ci) => {
      const oi = {
        id: this._generateId("orderitem"),
        orderId: order.id,
        productId: ci.productId,
        product_name_snapshot: ci.product_name_snapshot,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total
      };
      orderItems.push(oi);
      newOrderItemIds.push(oi.id);
    });

    order.items = newOrderItemIds;
    order.subtotal = itemsForCart.reduce((sum, ci) => sum + (Number(ci.line_total) || 0), 0);
    if (typeof order.shipping_cost !== "number") order.shipping_cost = 0;
    if (typeof order.tax !== "number") order.tax = 0;
    order.total = order.subtotal + order.shipping_cost + order.tax;
    order.updated_at = new Date().toISOString();

    // Persist
    const orders = this._getFromStorage("orders", []);
    const orderIdx = orders.findIndex((o) => o.id === order.id);
    if (orderIdx !== -1) {
      orders[orderIdx] = order;
    } else {
      orders.push(order);
    }

    this._saveToStorage("orders", orders);
    this._saveToStorage("order_items", orderItems);

    return { success: true, order: this._buildOrderSummary(order) };
  }

  updateGuestCheckoutContactAndShipping(orderId, shipping, contact) {
    const orders = this._getFromStorage("orders", []);
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, order: null };
    }

    if (shipping) {
      order.shipping_name = shipping.shipping_name || order.shipping_name;
      order.shipping_street = shipping.shipping_street || order.shipping_street;
      order.shipping_city = shipping.shipping_city || order.shipping_city;
      order.shipping_postal_code = shipping.shipping_postal_code || order.shipping_postal_code;
      order.shipping_state = shipping.shipping_state || order.shipping_state;
      order.shipping_country = shipping.shipping_country || order.shipping_country;
    }

    if (contact) {
      order.contact_email = contact.contact_email || order.contact_email;
      order.contact_phone = contact.contact_phone || order.contact_phone;
    }

    order.updated_at = new Date().toISOString();

    const idx = orders.findIndex((o) => o.id === order.id);
    orders[idx] = order;
    this._saveToStorage("orders", orders);

    return {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        shipping_name: order.shipping_name,
        shipping_street: order.shipping_street,
        shipping_city: order.shipping_city,
        shipping_postal_code: order.shipping_postal_code,
        shipping_state: order.shipping_state,
        shipping_country: order.shipping_country,
        contact_email: order.contact_email,
        contact_phone: order.contact_phone
      }
    };
  }

  getAvailableShippingMethods(orderId) {
    const orders = this._getFromStorage("orders", []);
    const order = orders.find((o) => o.id === orderId) || null;
    const methods = this._getShippingMethodsConfig();
    const selected_method_code = order ? order.shipping_method : null;
    return { methods, selected_method_code };
  }

  selectShippingMethod(orderId, shipping_method) {
    const orders = this._getFromStorage("orders", []);
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, order: null };
    }

    const methods = this._getShippingMethodsConfig();
    const method = methods.find((m) => m.code === shipping_method);
    if (!method) {
      return { success: false, order: null };
    }

    order.shipping_method = method.code;
    order.shipping_cost = method.cost;
    if (typeof order.tax !== "number") order.tax = 0;
    if (typeof order.subtotal !== "number") order.subtotal = 0;
    order.total = order.subtotal + order.shipping_cost + order.tax;
    order.updated_at = new Date().toISOString();

    const idx = orders.findIndex((o) => o.id === order.id);
    orders[idx] = order;
    this._saveToStorage("orders", orders);

    return {
      success: true,
      order: {
        id: order.id,
        shipping_method: order.shipping_method,
        shipping_cost: order.shipping_cost,
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        currency: order.currency
      }
    };
  }

  getAvailablePaymentMethods(orderId) {
    const orders = this._getFromStorage("orders", []);
    const order = orders.find((o) => o.id === orderId) || null;
    const methods = this._getPaymentMethodsConfig();
    const selected_method_code = order ? order.payment_method : null;
    return { methods, selected_method_code };
  }

  setPaymentMethodDetails(orderId, payment_method, card_last4, card_expiry_month, card_expiry_year) {
    const orders = this._getFromStorage("orders", []);
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, order: null };
    }

    const methods = this._getPaymentMethodsConfig();
    const method = methods.find((m) => m.code === payment_method);
    if (!method) {
      return { success: false, order: null };
    }

    order.payment_method = payment_method;

    if (payment_method === "credit_debit_card") {
      order.card_last4 = this._maskCardDetails(card_last4);
      order.card_expiry_month = typeof card_expiry_month === "number" ? card_expiry_month : null;
      order.card_expiry_year = typeof card_expiry_year === "number" ? card_expiry_year : null;
      order.payment_status = "authorized";
    } else {
      order.card_last4 = null;
      order.card_expiry_month = null;
      order.card_expiry_year = null;
      order.payment_status = "not_paid";
    }

    order.updated_at = new Date().toISOString();

    const idx = orders.findIndex((o) => o.id === order.id);
    orders[idx] = order;
    this._saveToStorage("orders", orders);

    return {
      success: true,
      order: {
        id: order.id,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        card_last4: order.card_last4,
        card_expiry_month: order.card_expiry_month,
        card_expiry_year: order.card_expiry_year
      }
    };
  }

  getOrderReviewSummary(orderId) {
    const orders = this._getFromStorage("orders", []);
    const order = orders.find((o) => o.id === orderId) || null;

    // Instrumentation for task completion tracking
    try {
      if (
        order &&
        typeof order.subtotal === "number" &&
        order.subtotal > 0 &&
        order.shipping_method === "standard" &&
        order.payment_method === "credit_debit_card"
      ) {
        localStorage.setItem("task9_orderReviewOrderId", order.id);
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return { order: this._buildOrderSummary(order) };
  }

  placeOrder(orderId) {
    const orders = this._getFromStorage("orders", []);
    const order = orders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, order: null, message: "Order not found" };
    }

    const now = new Date().toISOString();
    order.status = "processing";
    // Simulate immediate payment for card; otherwise keep not_paid
    if (order.payment_status === "authorized" || order.payment_method === "credit_debit_card") {
      order.payment_status = "paid";
    }
    order.placed_at = now;
    order.updated_at = now;

    const idx = orders.findIndex((o) => o.id === order.id);
    orders[idx] = order;
    this._saveToStorage("orders", orders);

    return {
      success: true,
      order: {
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        placed_at: order.placed_at
      },
      message: "Order placed successfully"
    };
  }

  getOrderSummary(orderId) {
    const orders = this._getFromStorage("orders", []);
    const order = orders.find((o) => o.id === orderId) || null;
    return { order: this._buildOrderSummary(order) };
  }

  // --- Compare list ---

  addToCompareList(productId) {
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p.id === productId && p.is_active);
    if (!product) {
      return {
        compare_list: this._getOrCreateCompareList()
      };
    }

    const list = this._getOrCreateCompareList();
    if (!list.productIds.includes(productId)) {
      list.productIds.push(productId);
      this._saveToStorage("compare_list", list);
    }

    return { compare_list: list };
  }

  removeFromCompareList(productId) {
    const list = this._getOrCreateCompareList();
    list.productIds = list.productIds.filter((id) => id !== productId);
    this._saveToStorage("compare_list", list);
    return { compare_list: list };
  }

  getCompareListDetails() {
    const list = this._getFromStorage("compare_list", null);
    if (!list) {
      return { compare_list: null, products: [] };
    }

    // Instrumentation for task completion tracking
    try {
      if (
        list &&
        Array.isArray(list.productIds) &&
        list.productIds.length >= 3 &&
        !localStorage.getItem("task8_comparisonViewSnapshot")
      ) {
        localStorage.setItem(
          "task8_comparisonViewSnapshot",
          JSON.stringify({
            productIds: list.productIds.slice(),
            viewed_at: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    const products = this._getFromStorage("products", []).filter((p) =>
      list.productIds.includes(p.id)
    );
    return { compare_list: list, products };
  }

  // --- Support overview ---

  getSupportOverview() {
    return {
      installation_quote_summary:
        "Request a tailored quote for installing heating and potable water systems.",
      service_booking_summary:
        "Book maintenance and repair visits for boilers, heat pumps, and other equipment.",
      documentation_summary:
        "Access installation manuals, user guides, and technical documentation by model.",
      contact_summary:
        "Reach our support team by phone, email, or contact form for any questions."
    };
  }

  // --- Documentation ---

  getDocumentationCategories() {
    return this._getFromStorage("documentation_categories", []);
  }

  searchDocumentationModels(doc_category_slug, query) {
    const models = this._getFromStorage("documented_product_models", []);
    const q = (query || "").toLowerCase();
    const results = models.filter((m) => {
      if (doc_category_slug && m.doc_category_slug !== doc_category_slug) return false;
      if (!q) return true;
      return (
        (m.model_code && m.model_code.toLowerCase().includes(q)) ||
        (m.name && m.name.toLowerCase().includes(q))
      );
    });

    // Instrumentation for task completion tracking
    try {
      if (q && q.includes("hbx-24c")) {
        localStorage.setItem(
          "task7_searchParams",
          JSON.stringify({ doc_category_slug, query })
        );
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return { results };
  }

  getDocumentationModelDetails(modelId) {
    const models = this._getFromStorage("documented_product_models", []);
    const model = models.find((m) => m.id === modelId) || null;
    const allFiles = this._getFromStorage("documentation_files", []);
    const files = allFiles
      .filter((f) => f.modelId === modelId)
      .map((f) => ({
        ...f,
        model: model || null
      }));

    // Instrumentation for task completion tracking
    try {
      if (
        model &&
        typeof model.model_code === "string" &&
        model.model_code.toLowerCase() === "hbx-24c"
      ) {
        localStorage.setItem("task7_openedModelId", model.id);
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return { model, files };
  }

  // --- Installation quote ---

  getInstallationQuoteFormOptions() {
    return {
      system_types: [
        { value: "air_to_water_heat_pump", label: "Air-to-water heat pump" },
        { value: "gas_boiler_system", label: "Gas boiler system" },
        { value: "electric_boiler_system", label: "Electric boiler system" },
        { value: "water_heater_system", label: "Water heater system" },
        { value: "radiator_system", label: "Radiator system" },
        { value: "other", label: "Other system type" }
      ],
      property_types: [
        { value: "one_story_house", label: "1-story house" },
        { value: "two_story_house", label: "2-story house" },
        { value: "multi_story_house", label: "Multi-story house" },
        { value: "apartment", label: "Apartment" },
        { value: "commercial_building", label: "Commercial building" },
        { value: "other", label: "Other" }
      ],
      preferred_timeframes: [
        { value: "within_2_weeks", label: "Within 2 weeks" },
        { value: "within_1_month", label: "Within 1 month" },
        { value: "within_1_3_months", label: "Within 1–3 months" },
        { value: "more_than_3_months", label: "More than 3 months" },
        { value: "unspecified", label: "No specific timeframe" }
      ],
      preferred_contact_methods: [
        { value: "phone", label: "Phone" },
        { value: "email", label: "Email" }
      ],
      floor_area_hint: "Approximate total heated floor area in square meters.",
      comments_hint:
        "Describe your existing system, desired upgrade, and any constraints (e.g., space, noise)."
    };
  }

  submitInstallationQuoteRequest(
    system_type,
    property_type,
    floor_area_m2,
    preferred_timeframe,
    preferred_contact_method,
    name,
    phone,
    email,
    postal_code,
    comments
  ) {
    const requests = this._getFromStorage("installation_quote_requests", []);
    const now = new Date().toISOString();

    const request = {
      id: this._generateId("installquote"),
      status: "submitted",
      system_type,
      property_type,
      floor_area_m2,
      preferred_timeframe,
      preferred_contact_method,
      name,
      phone,
      email,
      postal_code,
      comments: comments || "",
      created_at: now
    };

    requests.push(request);
    this._saveToStorage("installation_quote_requests", requests);

    return {
      request,
      success_message: "Your installation quote request has been submitted."
    };
  }

  // --- Service booking ---

  getServiceBookingOptions() {
    return {
      service_types: [
        { value: "boiler_maintenance", label: "Boiler maintenance" },
        { value: "annual_boiler_service", label: "Annual boiler service" },
        { value: "repair_visit", label: "Repair visit" },
        { value: "other", label: "Other service" }
      ],
      time_slots: [
        { value: "slot_08_10", label: "08:00–10:00", start_hour: 8, end_hour: 10 },
        { value: "slot_10_12", label: "10:00–12:00", start_hour: 10, end_hour: 12 },
        { value: "slot_11_13", label: "11:00–13:00", start_hour: 11, end_hour: 13 },
        { value: "slot_12_14", label: "12:00–14:00", start_hour: 12, end_hour: 14 },
        { value: "slot_14_16", label: "14:00–16:00", start_hour: 14, end_hour: 16 }
      ],
      date_selection_hint:
        "Select the earliest convenient date; we will confirm availability by email or phone."
    };
  }

  getAvailableServiceDates(service_type, min_date) {
    // Generate a simple list of the next 14 days after min_date (inclusive)
    let startDate;
    try {
      startDate = new Date(min_date);
      if (isNaN(startDate.getTime())) {
        startDate = new Date();
      }
    } catch (e) {
      startDate = new Date();
    }

    const available_dates = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(startDate.getTime());
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      available_dates.push(`${year}-${month}-${day}`);
    }

    return { available_dates };
  }

  submitServiceBookingRequest(
    service_type,
    requested_date,
    time_slot,
    street_address,
    city,
    postal_code,
    country,
    name,
    phone,
    email
  ) {
    const isAvailable = this._validateServiceAvailability(
      service_type,
      requested_date,
      time_slot
    );

    if (!isAvailable) {
      // For now, still create a booking but this could be changed to error out.
    }

    const bookings = this._getFromStorage("service_bookings", []);
    const now = new Date().toISOString();

    const booking = {
      id: this._generateId("service"),
      status: "requested",
      service_type,
      requested_date,
      time_slot,
      street_address,
      city,
      postal_code,
      country,
      name,
      phone,
      email,
      created_at: now
    };

    bookings.push(booking);
    this._saveToStorage("service_bookings", bookings);

    return {
      booking,
      success_message: "Your service booking request has been submitted."
    };
  }

  // --- Static site content ---

  getAboutUsContent() {
    return {
      headline: "Specialists in heating and potable water systems",
      body:
        "We supply, design, and support high-efficiency heating and potable water systems for residential and light commercial properties. Our team focuses on reliable brands, safe installations, and long-term performance.",
      service_regions: [
        "Regional service area 1",
        "Regional service area 2"
      ],
      certifications: [
        "Licensed HVAC contractor",
        "Certified potable water installer"
      ],
      brands: [
        "Leading boiler manufacturers",
        "Trusted pump and filtration brands"
      ],
      quality_and_safety_statement:
        "All products we supply comply with relevant efficiency, safety, and potable water standards. Installations are carried out by qualified professionals."
    };
  }

  getContactInfo() {
    return {
      phone_numbers: ["+1 555-000-0000"],
      email_addresses: ["support@example-heating-water.com"],
      physical_address: "100 Heating & Water Lane, Industry Park, Springfield",
      map_embed_info: "Map location coordinates or embed URL can be configured here.",
      support_hours: "Mon–Fri 08:00–17:00"
    };
  }

  submitContactForm(name, email, phone, subject, message) {
    const contactMessages = this._getFromStorage("contact_messages", []);
    const reference_id = this._generateId("contact");
    const now = new Date().toISOString();

    const entry = {
      id: reference_id,
      name,
      email,
      phone: phone || "",
      subject,
      message,
      created_at: now
    };

    contactMessages.push(entry);
    this._saveToStorage("contact_messages", contactMessages);

    return {
      success: true,
      reference_id,
      success_message: "Your message has been sent to our support team."
    };
  }

  getPolicies(policy_type) {
    const policies = this._getFromStorage("policies", []);
    const filtered = policy_type
      ? policies.filter((p) => p.policy_type === policy_type)
      : policies;
    return { policies: filtered };
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