(function () {
  if (typeof JSON !== "undefined" && !JSON.__cfPatched) {
    const originalParse = JSON.parse;
    JSON.parse = function (text, reviver) {
      try {
        return originalParse(text, reviver);
      } catch (e) {
        if (typeof text === "string" && text && text.indexOf("\"advocacy_campaigns\"") !== -1) {
          try {
            const fixed = (function fixJsonString(str) {
              // Replace unescaped control characters (like newlines) that appear
              // inside JSON string literals with escaped versions so JSON.parse
              // can handle them.
              let out = "";
              let inString = false;
              let escaping = false;
              for (let i = 0; i < str.length; i++) {
                const ch = str[i];
                if (!inString) {
                  if (ch === "\"") {
                    inString = true;
                  }
                  out += ch;
                } else {
                  if (escaping) {
                    // Preserve existing escapes as-is
                    out += ch;
                    escaping = false;
                  } else if (ch === "\\") {
                    out += ch;
                    escaping = true;
                  } else if (ch === "\"") {
                    inString = false;
                    out += ch;
                  } else if (ch === "\n") {
                    out += "\\n";
                  } else if (ch === "\r") {
                    out += "\\r";
                  } else {
                    out += ch;
                  }
                }
              }
              return out;
            })(text);
            return originalParse(fixed, reviver);
          } catch (e2) {
            // fall through to original error
          }
        }
        throw e;
      }
    };
    JSON.__cfPatched = true;
  }
})();

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
    this._defaultCurrency = "USD";
    this._defaultProcessingFeePercentage = 3; // 3%
    this._shippingRates = {
      standard: 5,
      expedited: 15,
      overnight: 25
    };

    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    const tables = [
      // Donations
      "donation_designations",
      "donations",
      // Events & registrations
      "events",
      "event_registrations",
      // Shop
      "product_categories",
      "products",
      "carts",
      "cart_items",
      "orders",
      "order_items",
      // Articles & reading lists
      "articles",
      "reading_lists",
      "reading_list_items",
      // Support groups
      "support_group_meetings",
      "support_group_rsvps",
      // Volunteer
      "volunteer_opportunities",
      "volunteer_signups",
      // Advocacy
      "advocacy_campaigns",
      "advocacy_messages",
      // Care checklist
      "care_topics",
      "care_checklists",
      "care_checklist_items",
      // Contact form submissions (not in data model but useful)
      "contact_form_submissions"
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

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
    localStorage.setItem("idCounter", String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _roundToTwo(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  // ==========================
  // Helper: Processing Fees
  // ==========================
  _calculateProcessingFees(amount, coverFeesSelected, processingFeePercentage) {
    const baseAmount = Number(amount) || 0;
    const pct =
      typeof processingFeePercentage === "number" && !isNaN(processingFeePercentage)
        ? processingFeePercentage
        : this._defaultProcessingFeePercentage;

    if (!coverFeesSelected || baseAmount <= 0) {
      return {
        base_amount: baseAmount,
        processing_fee_percentage: pct,
        processing_fee_amount: 0,
        total_charge_amount: baseAmount
      };
    }

    const feeAmount = this._roundToTwo((baseAmount * pct) / 100);
    const total = this._roundToTwo(baseAmount + feeAmount);

    return {
      base_amount: baseAmount,
      processing_fee_percentage: pct,
      processing_fee_amount: feeAmount,
      total_charge_amount: total
    };
  }

  // ==========================
  // Helper: Cart management
  // ==========================
  _getOrCreateCart() {
    let carts = this._getFromStorage("carts", []);
    let cart = carts[0] || null; // single-cart model for current agent

    if (!cart) {
      const now = this._nowIso();
      cart = {
        id: this._generateId("cart"),
        items_snapshot: [],
        subtotal: 0,
        selected_shipping_method: null,
        shipping_cost: 0,
        total: 0,
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage("carts", carts);
    }

    return cart;
  }

  _getShippingCost(method, subtotal) {
    if (!method) return 0;
    const rate = this._shippingRates[method] || 0;
    // Could apply free shipping thresholds here if desired
    return subtotal > 0 ? rate : 0;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage("cart_items", []);
    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const subtotal = this._roundToTwo(
      itemsForCart.reduce((sum, item) => sum + (Number(item.line_total) || 0), 0)
    );
    const shippingCost = this._getShippingCost(cart.selected_shipping_method, subtotal);
    const total = this._roundToTwo(subtotal + shippingCost);

    let carts = this._getFromStorage("carts", []);
    const idx = carts.findIndex((c) => c.id === cart.id);
    const now = this._nowIso();

    const updatedCart = {
      ...cart,
      subtotal,
      shipping_cost: shippingCost,
      total,
      updated_at: now,
      items_snapshot: itemsForCart
    };

    if (idx >= 0) {
      carts[idx] = updatedCart;
    } else {
      carts.push(updatedCart);
    }

    this._saveToStorage("carts", carts);
    return updatedCart;
  }

  // ==========================
  // Helper: Reading list
  // ==========================
  _getCurrentReadingList() {
    let lists = this._getFromStorage("reading_lists", []);
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId("reading_list"),
        name: "My Reading List",
        created_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage("reading_lists", lists);
    }
    return list;
  }

  // ==========================
  // Helper: Care checklist items
  // ==========================
  _createChecklistItemsFromTopics(checklistId, topicIds) {
    const topics = this._getFromStorage("care_topics", []);
    const topicMap = new Map(topics.map((t) => [t.id, t]));

    let checklistItems = this._getFromStorage("care_checklist_items", []);
    const createdItems = [];

    for (const topicId of topicIds) {
      const topic = topicMap.get(topicId);
      if (!topic) continue;
      const summaries = Array.isArray(topic.default_item_summaries)
        ? topic.default_item_summaries
        : [];

      let order = 0;
      for (const summary of summaries) {
        const item = {
          id: this._generateId("care_checklist_item"),
          checklist_id: checklistId,
          topic_id: topic.id,
          description: summary,
          sort_order: order,
          is_completed: false
        };
        order += 1;
        checklistItems.push(item);
        createdItems.push(item);
      }
    }

    this._saveToStorage("care_checklist_items", checklistItems);
    return createdItems;
  }

  // ==========================
  // Home page
  // ==========================
  getHomePageContent() {
    const campaigns = this._getFromStorage("advocacy_campaigns", []);
    const events = this._getFromStorage("events", []);
    const products = this._getFromStorage("products", []);
    const articles = this._getFromStorage("articles", []);

    const now = new Date();

    const featured_campaigns = campaigns
      .filter((c) => c.status === "active")
      .sort((a, b) => {
        const pa = a.priority === "high" ? 0 : 1;
        const pb = b.priority === "high" ? 0 : 1;
        if (pa !== pb) return pa - pb;
        return (a.title || "").localeCompare(b.title || "");
      });

    const upcoming_events = events
      .filter((e) => e.status === "scheduled")
      .filter((e) => {
        if (!e.start_datetime) return true;
        const d = new Date(e.start_datetime);
        return d >= now;
      })
      .sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return da - db;
      });

    const featured_products = products
      .filter((p) => p.status === "active")
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const featured_articles = articles
      .filter((a) => a.status === "published")
      .sort((a, b) => {
        const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return db - da;
      });

    const highlighted_tools = [
      {
        tool_key: "care_checklist_builder",
        title: "Care Checklist Builder",
        summary: "Create a personalized care checklist for people living with CF."
      },
      {
        tool_key: "volunteer_finder",
        title: "Volunteer Opportunities",
        summary: "Find ways to volunteer and support the CF community."
      },
      {
        tool_key: "donation",
        title: "Donate",
        summary: "Support research, care, and advocacy through a donation."
      }
    ];

    const primary_ctas = [
      {
        key: "donate",
        label: "Donate",
        description: "Make a gift to advance cystic fibrosis research and support."
      },
      {
        key: "volunteer",
        label: "Volunteer",
        description: "Give your time to support events and programs."
      },
      {
        key: "learn",
        label: "Learn about CF",
        description: "Explore resources for people living with CF and their families."
      },
      {
        key: "shop",
        label: "Shop for awareness",
        description: "Purchase CF awareness items to show your support."
      }
    ];

    return {
      featured_campaigns,
      upcoming_events,
      featured_products,
      featured_articles,
      highlighted_tools,
      primary_ctas
    };
  }

  // ==========================
  // Donate page & donations
  // ==========================
  getDonatePageConfig() {
    const designations = this._getFromStorage("donation_designations", []);

    return {
      designations,
      default_currency: this._defaultCurrency,
      one_time_default_amounts: [25, 50, 100, 250],
      recurring_default_amounts: [15, 25, 50, 100],
      processing_fee_percentage_default: this._defaultProcessingFeePercentage,
      tribute_types: ["in_honor_of", "in_memory_of"],
      recurrence_intervals: ["none", "monthly", "quarterly", "annually"]
    };
  }

  calculateDonationTotalPreview(amount, coverFeesSelected, processingFeePercentage) {
    return this._calculateProcessingFees(amount, coverFeesSelected, processingFeePercentage);
  }

  submitDonation(
    donationType,
    amount,
    currency,
    designationId,
    tributeEnabled,
    tributeType,
    tributeName,
    coverFeesSelected,
    processingFeePercentage,
    recurrenceInterval,
    recurrenceStartDate,
    donorFullName,
    donorEmail,
    cardHolderName,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardCvv
  ) {
    const donations = this._getFromStorage("donations", []);
    const designations = this._getFromStorage("donation_designations", []);

    const designation = designations.find((d) => d.id === designationId) || null;

    const feeInfo = this._calculateProcessingFees(
      amount,
      coverFeesSelected,
      processingFeePercentage
    );

    const finalRecurrenceInterval =
      donationType === "recurring" ? recurrenceInterval || "monthly" : "none";

    const donation = {
      id: this._generateId("donation"),
      donation_type: donationType,
      amount: Number(amount) || 0,
      currency: currency || this._defaultCurrency,
      designation_id: designationId,
      designation_name: designation ? designation.name : "",
      donor_full_name: donorFullName,
      donor_email: donorEmail || null,
      tribute_enabled: !!tributeEnabled,
      tribute_type: tributeEnabled ? tributeType || null : null,
      tribute_name: tributeEnabled ? tributeName || null : null,
      cover_fees_selected: !!coverFeesSelected,
      processing_fee_percentage: feeInfo.processing_fee_percentage,
      processing_fee_amount: feeInfo.processing_fee_amount,
      total_charge_amount: feeInfo.total_charge_amount,
      recurrence_interval: finalRecurrenceInterval,
      recurrence_start_date:
        finalRecurrenceInterval && finalRecurrenceInterval !== "none"
          ? recurrenceStartDate || null
          : null,
      is_active:
        donationType === "recurring" &&
        finalRecurrenceInterval &&
        finalRecurrenceInterval !== "none",
      payment_method: "credit_card",
      card_holder_name: cardHolderName,
      card_number: cardNumber,
      card_last4: cardNumber ? String(cardNumber).slice(-4) : null,
      card_expiration_month: Number(cardExpirationMonth) || null,
      card_expiration_year: Number(cardExpirationYear) || null,
      card_cvv: cardCvv,
      payment_status: "completed",
      created_at: this._nowIso()
    };

    donations.push(donation);
    this._saveToStorage("donations", donations);

    return {
      success: true,
      donation: {
        id: donation.id,
        donation_type: donation.donation_type,
        amount: donation.amount,
        currency: donation.currency,
        designation_name: donation.designation_name,
        tribute_enabled: donation.tribute_enabled,
        tribute_type: donation.tribute_type,
        tribute_name: donation.tribute_name,
        cover_fees_selected: donation.cover_fees_selected,
        processing_fee_percentage: donation.processing_fee_percentage,
        processing_fee_amount: donation.processing_fee_amount,
        total_charge_amount: donation.total_charge_amount,
        recurrence_interval: donation.recurrence_interval,
        recurrence_start_date: donation.recurrence_start_date,
        payment_status: donation.payment_status,
        created_at: donation.created_at
      },
      message: "Donation submitted successfully."
    };
  }

  // ==========================
  // Events & event registration
  // ==========================
  getEventsListingFilterOptions() {
    return {
      event_types: [
        { value: "charity_walk", label: "Charity walk" },
        { value: "gala", label: "Gala" },
        { value: "education_event", label: "Educational event" },
        { value: "support_group", label: "Support group" },
        { value: "other", label: "Other" }
      ],
      default_radius_miles: 50,
      radius_options_miles: [10, 25, 50, 100, 250],
      max_price_default: 100,
      sort_options: [
        { value: "date_asc", label: "Soonest date first" },
        { value: "date_desc", label: "Latest date first" }
      ]
    };
  }

  searchEvents(
    locationKeyword,
    postalCode,
    radiusMiles,
    eventType,
    maxRegistrationFee,
    sortBy,
    startDate,
    endDate
  ) {
    const events = this._getFromStorage("events", []);
    let results = events.slice();

    // Status: prefer scheduled
    results = results.filter((e) => e.status === "scheduled");

    if (locationKeyword) {
      const kw = String(locationKeyword).toLowerCase();
      results = results.filter((e) => {
        const city = (e.city || "").toLowerCase();
        const venue = (e.venue_name || "").toLowerCase();
        const addr = (e.address_line1 || "").toLowerCase();
        return city.includes(kw) || venue.includes(kw) || addr.includes(kw);
      });
    }

    if (postalCode) {
      results = results.filter((e) => (e.postal_code || "") === String(postalCode));
    }

    if (eventType) {
      results = results.filter((e) => e.event_type === eventType);
    }

    if (typeof maxRegistrationFee === "number") {
      results = results.filter((e) => {
        const fee = typeof e.registration_fee_adult === "number" ? e.registration_fee_adult : 0;
        return fee <= maxRegistrationFee;
      });
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      if (!isNaN(start)) {
        results = results.filter((e) => {
          if (!e.start_datetime) return false;
          const t = new Date(e.start_datetime).getTime();
          return t >= start;
        });
      }
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      if (!isNaN(end)) {
        results = results.filter((e) => {
          if (!e.start_datetime) return false;
          const t = new Date(e.start_datetime).getTime();
          return t <= end;
        });
      }
    }

    if (sortBy === "date_desc") {
      results.sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return db - da;
      });
    } else if (sortBy === "date_asc") {
      results.sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return da - db;
      });
    }

    return results;
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage("events", []);
    const event = events.find((e) => e.id === eventId) || null;

    return {
      event: event
        ? {
            id: event.id,
            title: event.title,
            short_description: event.short_description,
            full_description: event.full_description,
            event_type: event.event_type,
            start_datetime: event.start_datetime,
            end_datetime: event.end_datetime,
            timezone: event.timezone,
            venue_name: event.venue_name,
            address_line1: event.address_line1,
            address_line2: event.address_line2,
            city: event.city,
            state: event.state,
            postal_code: event.postal_code,
            country: event.country,
            registration_fee_adult: event.registration_fee_adult,
            registration_fee_child: event.registration_fee_child,
            currency: event.currency,
            remaining_slots: event.remaining_slots,
            status: event.status
          }
        : null
    };
  }

  registerForEvent(
    eventId,
    contactFullName,
    contactEmail,
    numAdultParticipants,
    numChildParticipants,
    participantNames
  ) {
    const events = this._getFromStorage("events", []);
    const event = events.find((e) => e.id === eventId) || null;

    if (!event) {
      return {
        success: false,
        registration: null,
        message: "Event not found."
      };
    }

    const adults = Number(numAdultParticipants) || 0;
    const children = Number(numChildParticipants) || 0;
    const feeAdult = typeof event.registration_fee_adult === "number" ? event.registration_fee_adult : 0;
    const feeChild = typeof event.registration_fee_child === "number" ? event.registration_fee_child : 0;

    const totalFee = this._roundToTwo(adults * feeAdult + children * feeChild);

    const registrations = this._getFromStorage("event_registrations", []);

    const registration = {
      id: this._generateId("event_registration"),
      event_id: eventId,
      contact_full_name: contactFullName,
      contact_email: contactEmail,
      num_adult_participants: adults,
      num_child_participants: children,
      participant_names: Array.isArray(participantNames) ? participantNames : [],
      total_registration_fee: totalFee,
      registration_datetime: this._nowIso(),
      status: "confirmed"
    };

    registrations.push(registration);
    this._saveToStorage("event_registrations", registrations);

    // Decrement remaining_slots if present
    const idx = events.findIndex((e) => e.id === eventId);
    if (idx >= 0 && typeof events[idx].remaining_slots === "number") {
      const totalParticipants = adults + children;
      events[idx] = {
        ...events[idx],
        remaining_slots: Math.max(0, events[idx].remaining_slots - totalParticipants)
      };
      this._saveToStorage("events", events);
    }

    return {
      success: true,
      registration,
      message: "Registration completed successfully."
    };
  }

  // ==========================
  // Shop, cart, checkout
  // ==========================
  getShopFilterOptions() {
    const categories = this._getFromStorage("product_categories", []);
    const products = this._getFromStorage("products", []);

    let maxPrice = 0;
    for (const p of products) {
      if (typeof p.price === "number" && p.price > maxPrice) {
        maxPrice = p.price;
      }
    }
    if (maxPrice === 0) maxPrice = 100;

    const color_options = ["purple", "teal", "white", "grey", "black", "blue"];

    return {
      categories,
      max_price_allowed: maxPrice,
      color_options,
      awareness_only_default: true
    };
  }

  searchProducts(query, categoryId, maxPrice, isAwarenessOnly, color, sortBy) {
    const products = this._getFromStorage("products", []);

    let results = products.filter((p) => p.status === "active");

    if (query) {
      const q = String(query).toLowerCase();
      results = results.filter((p) => {
        const name = (p.name || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (categoryId) {
      results = results.filter((p) => p.category_id === categoryId);
    }

    if (typeof maxPrice === "number") {
      results = results.filter((p) => {
        const price = typeof p.price === "number" ? p.price : 0;
        return price <= maxPrice;
      });
    }

    if (typeof isAwarenessOnly === "boolean" && isAwarenessOnly) {
      results = results.filter((p) => p.is_awareness_item === true);
    }

    if (color) {
      const c = String(color).toLowerCase();
      results = results.filter((p) => {
        const tags = (p.color_tags || p.available_colors || []).map((x) =>
          String(x).toLowerCase()
        );
        const def = p.default_color ? String(p.default_color).toLowerCase() : null;
        return tags.includes(c) || def === c;
      });
    }

    if (sortBy === "price_asc") {
      results.sort((a, b) => {
        const pa = typeof a.price === "number" ? a.price : 0;
        const pb = typeof b.price === "number" ? b.price : 0;
        return pa - pb;
      });
    } else if (sortBy === "price_desc") {
      results.sort((a, b) => {
        const pa = typeof a.price === "number" ? a.price : 0;
        const pb = typeof b.price === "number" ? b.price : 0;
        return pb - pa;
      });
    } else if (sortBy === "name_asc") {
      results.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "name_desc") {
      results.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    }

    return results;
  }

  getProductDetails(productId) {
    const products = this._getFromStorage("products", []);
    const categories = this._getFromStorage("product_categories", []);

    const product = products.find((p) => p.id === productId) || null;

    if (!product) {
      return { product: null };
    }

    const category = categories.find((c) => c.id === product.category_id) || null;

    return {
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        image_url: product.image_url,
        price: product.price,
        currency: product.currency,
        category_id: product.category_id,
        category_name: category ? category.name : null,
        is_awareness_item: product.is_awareness_item,
        available_colors: product.available_colors || [],
        default_color: product.default_color || null,
        color_tags: product.color_tags || [],
        inventory_count: product.inventory_count,
        max_quantity_per_order: product.max_quantity_per_order,
        status: product.status
      }
    };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    const cartItems = this._getFromStorage("cart_items", []);
    const products = this._getFromStorage("products", []);

    const items = cartItems
      .filter((ci) => ci.cart_id === updatedCart.id)
      .map((ci) => {
        const product = products.find((p) => p.id === ci.product_id) || null;
        return {
          cart_item: {
            id: ci.id,
            product_id: ci.product_id,
            quantity: ci.quantity,
            selected_color: ci.selected_color,
            unit_price: ci.unit_price,
            line_total: ci.line_total,
            added_at: ci.added_at
          },
          product_name: product ? product.name : null,
          product_image_url: product ? product.image_url : null,
          product
        };
      });

    return {
      cart: {
        id: updatedCart.id,
        subtotal: updatedCart.subtotal,
        selected_shipping_method: updatedCart.selected_shipping_method,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total,
        created_at: updatedCart.created_at,
        updated_at: updatedCart.updated_at
      },
      items
    };
  }

  addToCart(productId, quantity = 1, selectedColor) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);
    const products = this._getFromStorage("products", []);

    const product = products.find((p) => p.id === productId && p.status === "active") || null;
    if (!product) {
      return {
        success: false,
        cart: null,
        items: [],
        message: "Product not found or inactive."
      };
    }

    const qtyToAdd = Math.max(1, Number(quantity) || 1);
    const existing = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId && ci.selected_color === (selectedColor || product.default_color || null)
    );

    const maxPerOrder =
      typeof product.max_quantity_per_order === "number" && product.max_quantity_per_order > 0
        ? product.max_quantity_per_order
        : Infinity;
    const maxInventory =
      typeof product.inventory_count === "number" && product.inventory_count > 0
        ? product.inventory_count
        : Infinity;

    const effectiveMax = Math.min(maxPerOrder, maxInventory);

    if (existing) {
      const newQty = Math.min(existing.quantity + qtyToAdd, effectiveMax);
      existing.quantity = newQty;
      existing.line_total = this._roundToTwo(newQty * existing.unit_price);
    } else {
      const qty = Math.min(qtyToAdd, effectiveMax);
      const ci = {
        id: this._generateId("cart_item"),
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        selected_color: selectedColor || product.default_color || null,
        unit_price: product.price,
        line_total: this._roundToTwo(product.price * qty),
        added_at: this._nowIso()
      };
      cartItems.push(ci);
    }

    this._saveToStorage("cart_items", cartItems);

    const updatedCart = this._recalculateCartTotals(cart);

    const items = cartItems
      .filter((ci) => ci.cart_id === updatedCart.id)
      .map((ci) => {
        const p = products.find((pp) => pp.id === ci.product_id) || null;
        return {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: p ? p.name : null,
          selected_color: ci.selected_color,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total
        };
      });

    return {
      success: true,
      cart: {
        id: updatedCart.id,
        subtotal: updatedCart.subtotal,
        selected_shipping_method: updatedCart.selected_shipping_method,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      },
      items,
      message: "Item added to cart."
    };
  }

  updateCartItem(cartItemId, quantity) {
    let cartItems = this._getFromStorage("cart_items", []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cart: null,
        items: [],
        message: "Cart item not found."
      };
    }

    const item = cartItems[idx];
    const products = this._getFromStorage("products", []);
    const product = products.find((p) => p.id === item.product_id) || null;

    const cartId = item.cart_id;

    const qty = Number(quantity) || 0;
    if (qty <= 0) {
      // Remove item
      cartItems.splice(idx, 1);
      this._saveToStorage("cart_items", cartItems);

      const cart = this._getOrCreateCart();
      const updatedCart = this._recalculateCartTotals(cart);
      const remainingItems = cartItems
        .filter((ci) => ci.cart_id === updatedCart.id)
        .map((ci) => {
          const p = products.find((pp) => pp.id === ci.product_id) || null;
          return {
            cart_item_id: ci.id,
            product_id: ci.product_id,
            product_name: p ? p.name : null,
            selected_color: ci.selected_color,
            quantity: ci.quantity,
            unit_price: ci.unit_price,
            line_total: ci.line_total
          };
        });

      return {
        success: true,
        cart: {
          id: updatedCart.id,
          subtotal: updatedCart.subtotal,
          shipping_cost: updatedCart.shipping_cost,
          total: updatedCart.total
        },
        items: remainingItems,
        message: "Cart item removed."
      };
    }

    let newQty = qty;
    if (product) {
      const maxPerOrder =
        typeof product.max_quantity_per_order === "number" && product.max_quantity_per_order > 0
          ? product.max_quantity_per_order
          : Infinity;
      const maxInventory =
        typeof product.inventory_count === "number" && product.inventory_count > 0
          ? product.inventory_count
          : Infinity;
      const effectiveMax = Math.min(maxPerOrder, maxInventory);
      newQty = Math.min(qty, effectiveMax);
    }

    item.quantity = newQty;
    item.line_total = this._roundToTwo(newQty * item.unit_price);
    cartItems[idx] = item;
    this._saveToStorage("cart_items", cartItems);

    const carts = this._getFromStorage("carts", []);
    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);

    const items = cartItems
      .filter((ci) => ci.cart_id === updatedCart.id)
      .map((ci) => {
        const p = products.find((pp) => pp.id === ci.product_id) || null;
        return {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: p ? p.name : null,
          selected_color: ci.selected_color,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total
        };
      });

    return {
      success: true,
      cart: {
        id: updatedCart.id,
        subtotal: updatedCart.subtotal,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      },
      items,
      message: "Cart item updated."
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage("cart_items", []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cart: null,
        items: [],
        message: "Cart item not found."
      };
    }

    const cartId = cartItems[idx].cart_id;
    cartItems.splice(idx, 1);
    this._saveToStorage("cart_items", cartItems);

    const carts = this._getFromStorage("carts", []);
    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const products = this._getFromStorage("products", []);

    const items = cartItems
      .filter((ci) => ci.cart_id === updatedCart.id)
      .map((ci) => {
        const p = products.find((pp) => pp.id === ci.product_id) || null;
        return {
          cart_item_id: ci.id,
          product_id: ci.product_id,
          product_name: p ? p.name : null,
          selected_color: ci.selected_color,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total
        };
      });

    return {
      success: true,
      cart: {
        id: updatedCart.id,
        subtotal: updatedCart.subtotal,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      },
      items,
      message: "Cart item removed."
    };
  }

  setCartShippingMethod(shippingMethod) {
    const allowed = ["standard", "expedited", "overnight"];
    if (!allowed.includes(shippingMethod)) {
      return {
        success: false,
        cart: null,
        message: "Invalid shipping method."
      };
    }

    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals({
      ...cart,
      selected_shipping_method: shippingMethod
    });

    return {
      success: true,
      cart: {
        id: updatedCart.id,
        subtotal: updatedCart.subtotal,
        selected_shipping_method: updatedCart.selected_shipping_method,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      },
      message: "Shipping method updated."
    };
  }

  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const cartItems = this._getFromStorage("cart_items", []);
    const products = this._getFromStorage("products", []);

    const items = cartItems
      .filter((ci) => ci.cart_id === updatedCart.id)
      .map((ci) => {
        const product = products.find((p) => p.id === ci.product_id) || null;
        return {
          product_id: ci.product_id,
          product_name: product ? product.name : null,
          selected_color: ci.selected_color,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total,
          product
        };
      });

    return {
      cart: {
        id: updatedCart.id,
        subtotal: updatedCart.subtotal,
        selected_shipping_method: updatedCart.selected_shipping_method,
        shipping_cost: updatedCart.shipping_cost,
        total: updatedCart.total
      },
      items
    };
  }

  placeOrder(
    shippingFullName,
    shippingAddressLine1,
    shippingAddressLine2,
    shippingCity,
    shippingState,
    shippingPostalCode,
    shippingCountry,
    contactEmail,
    paymentMethod,
    cardHolderName,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardCvv
  ) {
    const cart = this._getOrCreateCart();
    const updatedCart = this._recalculateCartTotals(cart);
    const cartItems = this._getFromStorage("cart_items", []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === updatedCart.id);
    if (itemsForCart.length === 0) {
      return {
        success: false,
        order: null,
        message: "Cart is empty."
      };
    }

    if (paymentMethod !== "credit_card") {
      return {
        success: false,
        order: null,
        message: "Unsupported payment method."
      };
    }

    const now = this._nowIso();
    const orders = this._getFromStorage("orders", []);
    const orderItems = this._getFromStorage("order_items", []);
    const products = this._getFromStorage("products", []);

    const orderId = this._generateId("order");
    const orderNumber = `CF-${Date.now()}`;

    const order = {
      id: orderId,
      order_number: orderNumber,
      cart_id: updatedCart.id,
      created_at: now,
      status: "paid",
      subtotal: updatedCart.subtotal,
      shipping_cost: updatedCart.shipping_cost,
      total: updatedCart.total,
      currency: this._defaultCurrency,
      shipping_method: updatedCart.selected_shipping_method || "standard",
      shipping_full_name: shippingFullName,
      shipping_address_line1: shippingAddressLine1,
      shipping_address_line2: shippingAddressLine2 || "",
      shipping_city: shippingCity,
      shipping_state: shippingState,
      shipping_postal_code: shippingPostalCode,
      shipping_country: shippingCountry,
      contact_email: contactEmail || null,
      payment_method: paymentMethod,
      card_holder_name: cardHolderName,
      card_number: cardNumber,
      card_last4: cardNumber ? String(cardNumber).slice(-4) : null,
      card_expiration_month: Number(cardExpirationMonth) || null,
      card_expiration_year: Number(cardExpirationYear) || null,
      card_cvv: cardCvv,
      payment_status: "captured"
    };

    orders.push(order);

    for (const ci of itemsForCart) {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const oi = {
        id: this._generateId("order_item"),
        order_id: order.id,
        product_id: ci.product_id,
        product_name: product ? product.name : "",
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        selected_color: ci.selected_color || null
      };
      orderItems.push(oi);

      // Decrement inventory if tracked
      if (product && typeof product.inventory_count === "number") {
        product.inventory_count = Math.max(0, product.inventory_count - ci.quantity);
      }
    }

    this._saveToStorage("orders", orders);
    this._saveToStorage("order_items", orderItems);
    this._saveToStorage("products", products);

    // Clear cart items for this cart
    const remainingCartItems = cartItems.filter((ci) => ci.cart_id !== updatedCart.id);
    this._saveToStorage("cart_items", remainingCartItems);

    // Reset cart totals
    const carts = this._getFromStorage("carts", []);
    const cartIdx = carts.findIndex((c) => c.id === updatedCart.id);
    if (cartIdx >= 0) {
      carts[cartIdx] = {
        ...carts[cartIdx],
        subtotal: 0,
        shipping_cost: 0,
        total: 0,
        items_snapshot: [],
        updated_at: now
      };
      this._saveToStorage("carts", carts);
    }

    return {
      success: true,
      order: {
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        subtotal: order.subtotal,
        shipping_cost: order.shipping_cost,
        total: order.total,
        currency: order.currency,
        shipping_method: order.shipping_method,
        shipping_full_name: order.shipping_full_name,
        shipping_city: order.shipping_city,
        shipping_state: order.shipping_state,
        shipping_postal_code: order.shipping_postal_code,
        shipping_country: order.shipping_country,
        payment_status: order.payment_status,
        created_at: order.created_at
      },
      message: "Order placed successfully."
    };
  }

  // ==========================
  // Articles & reading list
  // ==========================
  getArticleSearchFilterOptions() {
    return {
      topics: [
        { value: "nutrition", label: "Nutrition" },
        { value: "exercise", label: "Exercise" },
        { value: "school", label: "School" },
        { value: "mental_health", label: "Mental health" },
        { value: "medications", label: "Medications" },
        { value: "research", label: "Research" },
        { value: "treatments", label: "Treatments" },
        { value: "other", label: "Other" }
      ],
      audiences: [
        { value: "adults_with_cf", label: "Adults with CF" },
        { value: "parents_and_caregivers", label: "Parents and caregivers" },
        { value: "teens_with_cf", label: "Teens with CF" },
        { value: "clinicians", label: "Clinicians" },
        { value: "donors", label: "Donors" },
        { value: "general_public", label: "General public" }
      ],
      sort_options: [
        { value: "date_newest", label: "Newest first" },
        { value: "date_oldest", label: "Oldest first" }
      ],
      default_start_date: "2023-01-01"
    };
  }

  searchArticles(query, topic, audience, startDate, endDate, sortBy) {
    const articles = this._getFromStorage("articles", []);

    let results = articles.filter((a) => a.status === "published");

    if (query) {
      const q = String(query).toLowerCase();
      results = results.filter((a) => {
        const title = (a.title || "").toLowerCase();
        const body = (a.body || "").toLowerCase();
        const summary = (a.summary || "").toLowerCase();
        return title.includes(q) || body.includes(q) || summary.includes(q);
      });
    }

    if (topic) {
      results = results.filter((a) => a.topic === topic);
    }

    if (audience) {
      results = results.filter((a) => a.audience === audience);
    }

    if (startDate) {
      const start = new Date(startDate).getTime();
      if (!isNaN(start)) {
        results = results.filter((a) => {
          if (!a.publication_date) return false;
          const t = new Date(a.publication_date).getTime();
          return t >= start;
        });
      }
    }

    if (endDate) {
      const end = new Date(endDate).getTime();
      if (!isNaN(end)) {
        results = results.filter((a) => {
          if (!a.publication_date) return false;
          const t = new Date(a.publication_date).getTime();
          return t <= end;
        });
      }
    }

    if (sortBy === "date_oldest") {
      results.sort((a, b) => {
        const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return da - db;
      });
    } else if (sortBy === "date_newest") {
      results.sort((a, b) => {
        const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return db - da;
      });
    }

    return results;
  }

  getArticleDetails(articleId) {
    const articles = this._getFromStorage("articles", []);
    const article = articles.find((a) => a.id === articleId) || null;

    if (!article) {
      return { article: null, related_articles: [] };
    }

    const related_articles = articles
      .filter((a) => a.status === "published" && a.id !== articleId && a.topic === article.topic)
      .sort((a, b) => {
        const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return db - da;
      })
      .slice(0, 3);

    return {
      article: {
        id: article.id,
        title: article.title,
        summary: article.summary,
        body: article.body,
        topic: article.topic,
        audience: article.audience,
        publication_date: article.publication_date,
        tags: article.tags || []
      },
      related_articles
    };
  }

  getOrCreateReadingList() {
    const list = this._getCurrentReadingList();
    return {
      reading_list: list
    };
  }

  getReadingListItems() {
    const list = this._getCurrentReadingList();
    const items = this._getFromStorage("reading_list_items", []);
    const articles = this._getFromStorage("articles", []);

    const results = items
      .filter((i) => i.reading_list_id === list.id)
      .map((i) => {
        const a = articles.find((aa) => aa.id === i.article_id) || null;
        return {
          reading_list_item: {
            id: i.id,
            reading_list_id: i.reading_list_id,
            article_id: i.article_id,
            saved_at: i.saved_at
          },
          article: a
            ? {
                id: a.id,
                title: a.title,
                summary: a.summary,
                topic: a.topic,
                publication_date: a.publication_date
              }
            : null
        };
      });

    return results;
  }

  saveArticleToReadingList(articleId) {
    const list = this._getCurrentReadingList();
    let items = this._getFromStorage("reading_list_items", []);

    const existing = items.find(
      (i) => i.reading_list_id === list.id && i.article_id === articleId
    );

    if (existing) {
      return {
        success: true,
        reading_list_item: existing,
        total_items: items.filter((i) => i.reading_list_id === list.id).length,
        message: "Article is already in the reading list."
      };
    }

    const item = {
      id: this._generateId("reading_list_item"),
      reading_list_id: list.id,
      article_id: articleId,
      saved_at: this._nowIso()
    };

    items.push(item);
    this._saveToStorage("reading_list_items", items);

    const total = items.filter((i) => i.reading_list_id === list.id).length;

    return {
      success: true,
      reading_list_item: item,
      total_items: total,
      message: "Article saved to reading list."
    };
  }

  // ==========================
  // Support groups & RSVP
  // ==========================
  getSupportGroupFilterOptions() {
    return {
      audience_options: [
        { value: "parents_and_caregivers", label: "Parents and caregivers" },
        { value: "adults_with_cf", label: "Adults with CF" },
        { value: "teens_with_cf", label: "Teens with CF" },
        { value: "people_with_cf", label: "People with CF" },
        { value: "mixed", label: "Mixed" }
      ],
      format_options: [
        { value: "in_person", label: "In person" },
        { value: "online", label: "Online" },
        { value: "hybrid", label: "Hybrid" }
      ],
      default_radius_miles: 25,
      radius_options_miles: [5, 10, 25, 50, 100],
      sort_options: [
        { value: "date_asc", label: "Soonest first" },
        { value: "date_desc", label: "Latest first" }
      ]
    };
  }

  searchSupportGroupMeetings(
    postalCode,
    radiusMiles,
    audience,
    format,
    month,
    sortBy
  ) {
    const meetings = this._getFromStorage("support_group_meetings", []);

    let results = meetings.filter((m) => m.status === "scheduled");

    if (postalCode) {
      results = results.filter((m) => (m.postal_code || "") === String(postalCode));
    }

    if (audience) {
      results = results.filter((m) => m.audience === audience);
    }

    if (format) {
      results = results.filter((m) => m.format === format);
    }

    if (month) {
      // month format: YYYY-MM
      results = results.filter((m) => {
        if (!m.start_datetime) return false;
        return String(m.start_datetime).slice(0, 7) === month;
      });
    }

    if (sortBy === "date_desc") {
      results.sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return db - da;
      });
    } else if (sortBy === "date_asc") {
      results.sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return da - db;
      });
    }

    return results;
  }

  getSupportGroupMeetingDetails(meetingId) {
    const meetings = this._getFromStorage("support_group_meetings", []);
    const meeting = meetings.find((m) => m.id === meetingId) || null;

    return {
      meeting: meeting
        ? {
            id: meeting.id,
            group_name: meeting.group_name,
            topic: meeting.topic,
            audience: meeting.audience,
            format: meeting.format,
            description: meeting.description,
            start_datetime: meeting.start_datetime,
            end_datetime: meeting.end_datetime,
            timezone: meeting.timezone,
            venue_name: meeting.venue_name,
            address_line1: meeting.address_line1,
            address_line2: meeting.address_line2,
            city: meeting.city,
            state: meeting.state,
            postal_code: meeting.postal_code,
            country: meeting.country,
            remaining_slots: meeting.remaining_slots,
            status: meeting.status
          }
        : null
    };
  }

  submitSupportGroupRSVP(meetingId, attendeeName, attendeeEmail, numAttendees) {
    const meetings = this._getFromStorage("support_group_meetings", []);
    const meeting = meetings.find((m) => m.id === meetingId) || null;

    if (!meeting) {
      return {
        success: false,
        rsvp: null,
        message: "Support group meeting not found."
      };
    }

    const rsvps = this._getFromStorage("support_group_rsvps", []);
    const attendees = Number(numAttendees) || 0;

    const rsvp = {
      id: this._generateId("support_group_rsvp"),
      meeting_id: meetingId,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      num_attendees: attendees,
      rsvp_datetime: this._nowIso(),
      status: "confirmed"
    };

    rsvps.push(rsvp);
    this._saveToStorage("support_group_rsvps", rsvps);

    const idx = meetings.findIndex((m) => m.id === meetingId);
    if (idx >= 0 && typeof meetings[idx].remaining_slots === "number") {
      meetings[idx] = {
        ...meetings[idx],
        remaining_slots: Math.max(0, meetings[idx].remaining_slots - attendees)
      };
      this._saveToStorage("support_group_meetings", meetings);
    }

    return {
      success: true,
      rsvp,
      message: "RSVP submitted successfully."
    };
  }

  // ==========================
  // Volunteer opportunities
  // ==========================
  getVolunteerFilterOptions() {
    return {
      commitment_types: [
        { value: "one_time", label: "One-time" },
        { value: "ongoing", label: "Ongoing" }
      ],
      day_of_week_options: [
        { value: "monday", label: "Monday" },
        { value: "tuesday", label: "Tuesday" },
        { value: "wednesday", label: "Wednesday" },
        { value: "thursday", label: "Thursday" },
        { value: "friday", label: "Friday" },
        { value: "saturday", label: "Saturday" },
        { value: "sunday", label: "Sunday" }
      ],
      duration_options_hours: [1, 2, 3, 4, 8],
      default_radius_miles: 10
    };
  }

  searchVolunteerOpportunities(
    postalCode,
    radiusMiles,
    commitmentType,
    dayOfWeek,
    maxDurationHours,
    sortBy
  ) {
    const opportunities = this._getFromStorage("volunteer_opportunities", []);

    let results = opportunities.filter((o) => o.status === "open");

    if (postalCode) {
      results = results.filter((o) => (o.postal_code || "") === String(postalCode));
    }

    if (commitmentType) {
      results = results.filter((o) => o.commitment_type === commitmentType);
    }

    if (dayOfWeek) {
      results = results.filter((o) => o.day_of_week === dayOfWeek);
    }

    if (typeof maxDurationHours === "number") {
      results = results.filter((o) => {
        const d = typeof o.duration_hours === "number" ? o.duration_hours : Infinity;
        return d <= maxDurationHours;
      });
    }

    if (sortBy === "date_desc") {
      results.sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return db - da;
      });
    } else if (sortBy === "date_asc") {
      results.sort((a, b) => {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return da - db;
      });
    }

    return results;
  }

  getVolunteerOpportunityDetails(opportunityId) {
    const opportunities = this._getFromStorage("volunteer_opportunities", []);
    const opportunity = opportunities.find((o) => o.id === opportunityId) || null;

    return {
      opportunity: opportunity
        ? {
            id: opportunity.id,
            title: opportunity.title,
            short_description: opportunity.short_description,
            full_description: opportunity.full_description,
            commitment_type: opportunity.commitment_type,
            start_datetime: opportunity.start_datetime,
            end_datetime: opportunity.end_datetime,
            day_of_week: opportunity.day_of_week,
            duration_hours: opportunity.duration_hours,
            venue_name: opportunity.venue_name,
            address_line1: opportunity.address_line1,
            address_line2: opportunity.address_line2,
            city: opportunity.city,
            state: opportunity.state,
            postal_code: opportunity.postal_code,
            country: opportunity.country,
            remaining_slots: opportunity.remaining_slots,
            status: opportunity.status
          }
        : null
    };
  }

  submitVolunteerSignup(opportunityId, volunteerName, volunteerEmail, numVolunteers) {
    const opportunities = this._getFromStorage("volunteer_opportunities", []);
    const opportunity = opportunities.find((o) => o.id === opportunityId) || null;

    if (!opportunity) {
      return {
        success: false,
        signup: null,
        message: "Volunteer opportunity not found."
      };
    }

    const signups = this._getFromStorage("volunteer_signups", []);
    const count = Number(numVolunteers) || 0;

    const signup = {
      id: this._generateId("volunteer_signup"),
      opportunity_id: opportunityId,
      volunteer_name: volunteerName,
      volunteer_email: volunteerEmail,
      num_volunteers: count,
      signup_datetime: this._nowIso(),
      status: "confirmed"
    };

    signups.push(signup);
    this._saveToStorage("volunteer_signups", signups);

    const idx = opportunities.findIndex((o) => o.id === opportunityId);
    if (idx >= 0 && typeof opportunities[idx].remaining_slots === "number") {
      opportunities[idx] = {
        ...opportunities[idx],
        remaining_slots: Math.max(0, opportunities[idx].remaining_slots - count)
      };
      this._saveToStorage("volunteer_opportunities", opportunities);
    }

    return {
      success: true,
      signup,
      message: "Volunteer signup submitted successfully."
    };
  }

  // ==========================
  // Advocacy
  // ==========================
  getAdvocacyCampaigns(status, issueArea) {
    const campaigns = this._getFromStorage("advocacy_campaigns", []);

    let results = campaigns.slice();

    if (status) {
      results = results.filter((c) => c.status === status);
    }

    if (issueArea) {
      results = results.filter((c) => c.issue_area === issueArea);
    }

    results.sort((a, b) => {
      const pa = a.priority === "high" ? 0 : 1;
      const pb = b.priority === "high" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (a.title || "").localeCompare(b.title || "");
    });

    return results;
  }

  getAdvocacyCampaignDetails(campaignId) {
    const campaigns = this._getFromStorage("advocacy_campaigns", []);
    const campaign = campaigns.find((c) => c.id === campaignId) || null;

    return {
      campaign: campaign
        ? {
            id: campaign.id,
            title: campaign.title,
            slug: campaign.slug,
            short_description: campaign.short_description,
            full_description: campaign.full_description,
            issue_area: campaign.issue_area,
            status: campaign.status,
            priority: campaign.priority,
            message_template: campaign.message_template,
            allowed_target_types: campaign.allowed_target_types || []
          }
        : null
    };
  }

  sendAdvocacyMessage(
    campaignId,
    targetType,
    senderFullName,
    senderEmail,
    senderAddressLine1,
    senderAddressLine2,
    senderCity,
    senderState,
    senderPostalCode,
    messageBody,
    consentAccepted
  ) {
    const campaigns = this._getFromStorage("advocacy_campaigns", []);
    const campaign = campaigns.find((c) => c.id === campaignId) || null;

    if (!campaign) {
      return {
        success: false,
        advocacy_message: null,
        message: "Advocacy campaign not found."
      };
    }

    if (!consentAccepted) {
      return {
        success: false,
        advocacy_message: null,
        message: "Consent must be accepted to send the message."
      };
    }

    if (
      Array.isArray(campaign.allowed_target_types) &&
      campaign.allowed_target_types.length > 0 &&
      !campaign.allowed_target_types.includes(targetType)
    ) {
      return {
        success: false,
        advocacy_message: null,
        message: "Target type is not allowed for this campaign."
      };
    }

    const messages = this._getFromStorage("advocacy_messages", []);

    const advocacyMessage = {
      id: this._generateId("advocacy_message"),
      campaign_id: campaignId,
      target_type: targetType,
      target_name: null,
      sender_full_name: senderFullName,
      sender_email: senderEmail,
      sender_address_line1: senderAddressLine1,
      sender_address_line2: senderAddressLine2 || "",
      sender_city: senderCity,
      sender_state: senderState,
      sender_postal_code: senderPostalCode,
      message_subject: "",
      message_body: messageBody,
      consent_accepted: !!consentAccepted,
      status: "sent",
      sent_at: this._nowIso()
    };

    messages.push(advocacyMessage);
    this._saveToStorage("advocacy_messages", messages);

    return {
      success: true,
      advocacy_message: advocacyMessage,
      message: "Advocacy message sent successfully."
    };
  }

  // ==========================
  // Care checklist builder
  // ==========================
  getCareChecklistOptions() {
    const topics = this._getFromStorage("care_topics", []);

    const age_groups = [
      { value: "child", label: "Child" },
      { value: "teen_13_17", label: "Teen (13–17)" },
      { value: "adult", label: "Adult" },
      { value: "older_adult", label: "Older adult" }
    ];

    const reminder_frequencies = [
      { value: "none", label: "No reminders" },
      { value: "daily", label: "Daily" },
      { value: "weekly_review", label: "Weekly review" },
      { value: "monthly", label: "Monthly" }
    ];

    return {
      age_groups,
      topics,
      reminder_frequencies
    };
  }

  generateCareChecklist(nameOnChecklist, ageGroup, topicIds, reminderFrequency) {
    const topics = this._getFromStorage("care_topics", []);
    const topicSet = new Set(topicIds || []);
    const validTopicIds = topics
      .filter((t) => topicSet.has(t.id) && t.is_active !== false)
      .map((t) => t.id);

    const checklists = this._getFromStorage("care_checklists", []);

    const checklist = {
      id: this._generateId("care_checklist"),
      name_on_checklist: nameOnChecklist,
      age_group: ageGroup,
      reminder_frequency: reminderFrequency || "none",
      topic_ids: validTopicIds,
      created_at: this._nowIso(),
      downloaded_as_pdf: false
    };

    checklists.push(checklist);
    this._saveToStorage("care_checklists", checklists);

    const items = this._createChecklistItemsFromTopics(checklist.id, validTopicIds);

    return {
      checklist,
      items
    };
  }

  downloadCareChecklistPdf(checklistId) {
    const checklists = this._getFromStorage("care_checklists", []);
    const idx = checklists.findIndex((c) => c.id === checklistId);

    if (idx === -1) {
      return {
        success: false,
        checklist_id: checklistId,
        pdf_download_url: null
      };
    }

    checklists[idx] = {
      ...checklists[idx],
      downloaded_as_pdf: true
    };

    this._saveToStorage("care_checklists", checklists);

    const pdfUrl = `/care-checklists/${encodeURIComponent(checklistId)}.pdf`;

    return {
      success: true,
      checklist_id: checklistId,
      pdf_download_url: pdfUrl
    };
  }

  // ==========================
  // About & contact
  // ==========================
  getAboutPageContent() {
    // No predefined content in storage; return empty/default values
    return {
      mission: "",
      vision: "",
      about_text: "",
      contact_email: "",
      contact_mailing_address: "",
      policies_summary: []
    };
  }

  submitContactForm(fullName, email, subject, message) {
    const submissions = this._getFromStorage("contact_form_submissions", []);

    const submission = {
      id: this._generateId("contact_submission"),
      full_name: fullName,
      email,
      subject,
      message,
      submitted_at: this._nowIso()
    };

    submissions.push(submission);
    this._saveToStorage("contact_form_submissions", submissions);

    return {
      success: true,
      message: "Your message has been submitted."
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
