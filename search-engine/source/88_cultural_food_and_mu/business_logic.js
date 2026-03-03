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

  // -------------------- STORAGE HELPERS --------------------

  _initStorage() {
    const keys = [
      // Core data entities
      "ticket_types",
      "ticket_tiers",
      "carts",
      "cart_items",
      "checkout_sessions",
      "stages",
      "artists",
      "performances",
      "my_schedule_items",
      "vendors",
      "dishes",
      "tasting_list_items",
      "activities",
      "workshop_registrations",
      "family_plan_items",
      "artist_favorites",
      "artist_lists",
      "artist_list_items",
      "map_locations",
      "saved_map_locations",
      "donation_funds",
      "donations",
      "newsletter_subscriptions",
      // Misc/support
      "contact_form_submissions"
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  // Time helpers
  _timeStringToMinutes(timeStr) {
    // Accept "HH:MM" or "H:MM"
    if (!timeStr) return null;
    const parts = timeStr.split(":");
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _dateTimeToMinutes(dtStr) {
    if (!dtStr) return null;
    // If it's already HH:MM
    if (dtStr.indexOf("T") === -1 && dtStr.indexOf("-") === -1 && dtStr.indexOf(":") !== -1) {
      return this._timeStringToMinutes(dtStr);
    }
    const d = new Date(dtStr);
    if (isNaN(d.getTime())) return null;
    return d.getHours() * 60 + d.getMinutes();
  }

  _getTodayFestivalDay() {
    const d = new Date();
    const dow = d.getDay(); // 0=Sun, 5=Fri, 6=Sat
    if (dow === 5) return "friday";
    if (dow === 6) return "saturday";
    if (dow === 0) return "sunday";
    // Default to friday if outside festival days
    return "friday";
  }

  // -------------------- CART & CHECKOUT HELPERS --------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage("carts");
    let cart = carts.find(c => c.status === "open");
    if (!cart) {
      cart = {
        id: this._generateId("cart"),
        status: "open",
        subtotal: 0,
        total: 0,
        items: [], // array of cart_item ids
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage("carts", carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart, cartItemsAll) {
    const carts = this._getFromStorage("carts");
    const items = cartItemsAll.filter(ci => ci.cart_id === cart.id);
    const subtotal = items.reduce((sum, ci) => sum + (ci.line_total || 0), 0);
    cart.subtotal = subtotal;
    cart.total = subtotal; // no extra fees/taxes modeled here
    cart.updated_at = this._nowIso();

    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage("carts", carts);
    }
  }

  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage("checkout_sessions");
    let session = sessions.find(s => s.cart_id === cart.id);
    if (!session) {
      session = {
        id: this._generateId("chk"),
        cart_id: cart.id,
        delivery_method: "mobile_ticket",
        purchaser_name: "",
        purchaser_email: "",
        purchaser_phone: "",
        current_step: "delivery",
        created_at: this._nowIso()
      };
      sessions.push(session);
      this._saveToStorage("checkout_sessions", sessions);
    }
    return session;
  }

  // -------------------- PERSONAL STORES HELPERS --------------------

  _getOrCreateMyScheduleStore() {
    // Just ensure key exists
    const items = this._getFromStorage("my_schedule_items");
    return items;
  }

  _saveMyScheduleStore(items) {
    this._saveToStorage("my_schedule_items", items);
  }

  _getOrCreateTastingListStore() {
    return this._getFromStorage("tasting_list_items");
  }

  _saveTastingListStore(items) {
    this._saveToStorage("tasting_list_items", items);
  }

  _getOrCreateFamilyPlanStore() {
    return this._getFromStorage("family_plan_items");
  }

  _saveFamilyPlanStore(items) {
    this._saveToStorage("family_plan_items", items);
  }

  _getOrCreateArtistFavoritesStore() {
    return this._getFromStorage("artist_favorites");
  }

  _saveArtistFavoritesStore(items) {
    this._saveToStorage("artist_favorites", items);
  }

  _getOrCreateArtistListsStore() {
    const lists = this._getFromStorage("artist_lists");
    const listItems = this._getFromStorage("artist_list_items");
    return { lists, listItems };
  }

  _saveArtistListsStore(lists, listItems) {
    this._saveToStorage("artist_lists", lists);
    this._saveToStorage("artist_list_items", listItems);
  }

  _getOrCreateSavedMapLocationsStore() {
    return this._getFromStorage("saved_map_locations");
  }

  _saveSavedMapLocationsStore(items) {
    this._saveToStorage("saved_map_locations", items);
  }

  _getOrCreateNewsletterSubscription(email, name, optIn, source) {
    let subs = this._getFromStorage("newsletter_subscriptions");
    let sub = subs.find(s => s.email === email);
    let created = false;
    if (!sub) {
      sub = {
        id: this._generateId("ns"),
        email,
        name: name || "",
        subscribed: !!optIn,
        source: source || "other",
        created_at: this._nowIso()
      };
      subs.push(sub);
      created = true;
    } else {
      if (optIn && !sub.subscribed) {
        sub.subscribed = true;
      }
      if (name && !sub.name) {
        sub.name = name;
      }
    }
    this._saveToStorage("newsletter_subscriptions", subs);
    return { subscription: sub, created };
  }

  // -------------------- INTERFACE IMPLEMENTATIONS --------------------

  // 1) getHomePageContent()
  getHomePageContent() {
    const hero_message = "Welcome to the Cultural Food & Music Festival";
    const today_day = this._getTodayFestivalDay();

    const performances = this._getFromStorage("performances");
    const artists = this._getFromStorage("artists");
    const stages = this._getFromStorage("stages");
    const mySchedule = this._getFromStorage("my_schedule_items");
    const dishes = this._getFromStorage("dishes");
    const vendors = this._getFromStorage("vendors");
    const donationFunds = this._getFromStorage("donation_funds");
    const tastingList = this._getFromStorage("tasting_list_items");
    const artistFavorites = this._getFromStorage("artist_favorites");
    const familyPlan = this._getFromStorage("family_plan_items");
    const savedMapLocations = this._getFromStorage("saved_map_locations");

    // Today schedule preview: first few performances on today's day
    const todayPerformances = performances
      .filter(p => p.day === today_day)
      .sort((a, b) => {
        const ma = this._dateTimeToMinutes(a.start_time) || 0;
        const mb = this._dateTimeToMinutes(b.start_time) || 0;
        return ma - mb;
      })
      .slice(0, 5)
      .map(p => {
        const artist = artists.find(a => a.id === p.artist_id) || {};
        const stage = stages.find(s => s.id === p.stage_id) || {};
        const inSchedule = mySchedule.some(ms => ms.performance_id === p.id);
        return {
          performance_id: p.id,
          artist_name: artist.name || "",
          stage_name: stage.name || "",
          day: p.day,
          start_time: p.start_time,
          end_time: p.end_time,
          is_in_my_schedule: inSchedule
        };
      });

    // Featured artists: pick up to 5 active artists (prefer headliners)
    const activeArtists = artists.filter(a => a.is_active !== false);
    const featured_artists = activeArtists
      .sort((a, b) => {
        // headliner first
        const rank = v => (v === "headliner" ? 0 : v === "guest" ? 1 : v === "local" ? 2 : 3);
        return rank(a.artist_type) - rank(b.artist_type);
      })
      .slice(0, 5)
      .map(a => ({
        artist_id: a.id,
        name: a.name,
        artist_type: a.artist_type,
        genre: a.genre || "",
        cultural_background: a.cultural_background || "",
        photo_url: a.photo_url || ""
      }));

    // Featured dishes: highest rated
    const featured_dishes = dishes
      .filter(d => typeof d.average_rating === "number")
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0))
      .slice(0, 5)
      .map(d => {
        const v = vendors.find(vd => vd.id === d.vendor_id) || {};
        return {
          dish_id: d.id,
          name: d.name,
          cuisine: d.cuisine,
          price: d.price,
          currency: d.currency,
          average_rating: d.average_rating || 0,
          vendor_name: v.name || ""
        };
      });

    // Active donation campaign: first active fund
    const activeFund = donationFunds.find(f => f.is_active !== false) || null;
    const active_donation_campaign = activeFund
      ? {
          fund_id: activeFund.id,
          name: activeFund.name,
          description: activeFund.description || "",
          suggested_amounts: activeFund.suggested_amounts || []
        }
      : null;

    const planner_counts = {
      schedule_count: mySchedule.length,
      tasting_list_count: tastingList.length,
      lineup_favorites_count: artistFavorites.length,
      family_plan_count: familyPlan.length,
      saved_map_locations_count: savedMapLocations.length
    };

    return {
      hero_message,
      today_day,
      today_schedule_preview: todayPerformances,
      featured_artists,
      featured_dishes,
      active_donation_campaign,
      planner_counts
    };
  }

  // 2) getTicketPurchaseOptions()
  getTicketPurchaseOptions() {
    const ticketTypes = this._getFromStorage("ticket_types");
    const ticketTiers = this._getFromStorage("ticket_tiers");

    const enriched = ticketTypes.map(tt => {
      const tiers = ticketTiers.filter(t => t.ticket_type_id === tt.id);
      const availableTiers = tiers.filter(t => t.is_available !== false);
      const cheapest = availableTiers.length
        ? availableTiers.reduce((min, t) => (t.price < min ? t.price : min), availableTiers[0].price)
        : null;
      return {
        id: tt.id,
        name: tt.name,
        description: tt.description || "",
        pass_type: tt.pass_type,
        ticket_category: tt.ticket_category,
        valid_days: tt.valid_days || [],
        base_price: tt.base_price,
        currency: tt.currency,
        is_child: !!tt.is_child,
        is_active: tt.is_active !== false,
        display_order: typeof tt.display_order === "number" ? tt.display_order : 0,
        tiers: tiers.map(t => ({
          id: t.id,
          name: t.name,
          description: t.description || "",
          seating_type: t.seating_type,
          price: t.price,
          currency: t.currency,
          is_default: !!t.is_default,
          is_available: t.is_available !== false
        })),
        cheapest_available_price: cheapest
      };
    });

    return { ticket_types: enriched };
  }

  // 3) simulateTicketSelection(selections, budget)
  simulateTicketSelection(selections, budget) {
    const ticketTypes = this._getFromStorage("ticket_types");
    const ticketTiers = this._getFromStorage("ticket_tiers");

    const line_items = [];
    let subtotal = 0;
    let currency = "";

    (selections || []).forEach(sel => {
      const tt = ticketTypes.find(t => t.id === sel.ticketTypeId);
      const tier = ticketTiers.find(t => t.id === sel.ticketTierId);
      if (!tt || !tier) return;
      const unit_price = tier.price;
      const line_total = unit_price * sel.quantity;
      subtotal += line_total;
      currency = tier.currency || tt.currency || currency || "USD";
      line_items.push({
        ticket_type_id: tt.id,
        ticket_type_name: tt.name,
        ticket_tier_id: tier.id,
        ticket_tier_name: tier.name,
        quantity: sel.quantity,
        unit_price,
        line_total
      });
    });

    const within = typeof budget === "number" ? subtotal <= budget : true;
    const over = typeof budget === "number" ? Math.max(0, subtotal - budget) : 0;

    return {
      subtotal,
      currency: currency || "USD",
      budget: typeof budget === "number" ? budget : null,
      is_within_budget: within,
      amount_over_budget: over,
      line_items
    };
  }

  // 4) addTicketsToCart(selections)
  addTicketsToCart(selections) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items");
    const ticketTypes = this._getFromStorage("ticket_types");
    const ticketTiers = this._getFromStorage("ticket_tiers");

    (selections || []).forEach(sel => {
      const tt = ticketTypes.find(t => t.id === sel.ticketTypeId);
      const tier = ticketTiers.find(t => t.id === sel.ticketTierId);
      if (!tt || !tier) return;
      const unit_price = tier.price;
      const quantity = sel.quantity;
      const line_total = unit_price * quantity;
      const item = {
        id: this._generateId("cart_item"),
        cart_id: cart.id,
        ticket_type_id: tt.id,
        ticket_tier_id: tier.id,
        quantity,
        unit_price,
        line_total,
        description: (tt.name || "") + (tier.name ? " - " + tier.name : "")
      };
      cartItems.push(item);
      if (!Array.isArray(cart.items)) cart.items = [];
      cart.items.push(item.id);
    });

    this._saveToStorage("cart_items", cartItems);
    this._recalculateCartTotals(cart, cartItems);

    // Build cart summary for return (with FK resolution)
    const ticketTypesMap = this._getFromStorage("ticket_types");
    const ticketTiersMap = this._getFromStorage("ticket_tiers");
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id).map(ci => {
      const tt = ticketTypesMap.find(t => t.id === ci.ticket_type_id) || null;
      const tier = ticketTiersMap.find(t => t.id === ci.ticket_tier_id) || null;
      return {
        cart_item_id: ci.id,
        ticket_type_name: tt ? tt.name : "",
        ticket_tier_name: tier ? tier.name : "",
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total,
        ticket_type_id: ci.ticket_type_id,
        ticket_tier_id: ci.ticket_tier_id,
        ticket_type: tt,
        ticket_tier: tier
      };
    });

    return {
      success: true,
      message: "Tickets added to cart",
      cart: {
        cart_id: cart.id,
        status: cart.status,
        items: itemsForCart,
        subtotal: cart.subtotal,
        total: cart.total,
        currency: itemsForCart[0] && itemsForCart[0].ticket_tier && itemsForCart[0].ticket_tier.currency
          ? itemsForCart[0].ticket_tier.currency
          : "USD"
      }
    };
  }

  // 5) getCartSummary()
  getCartSummary() {
    const carts = this._getFromStorage("carts");
    let cart = carts.find(c => c.status === "open");
    if (!cart) {
      return {
        cart_id: null,
        status: "open",
        items: [],
        subtotal: 0,
        total: 0,
        currency: "USD"
      };
    }
    const cartItems = this._getFromStorage("cart_items");
    const ticketTypes = this._getFromStorage("ticket_types");
    const ticketTiers = this._getFromStorage("ticket_tiers");

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const tt = ticketTypes.find(t => t.id === ci.ticket_type_id) || null;
        const tier = ticketTiers.find(t => t.id === ci.ticket_tier_id) || null;
        return {
          cart_item_id: ci.id,
          ticket_type_id: ci.ticket_type_id,
          ticket_type_name: tt ? tt.name : "",
          ticket_tier_id: ci.ticket_tier_id,
          ticket_tier_name: tier ? tier.name : "",
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total,
          ticket_type: tt,
          ticket_tier: tier
        };
      });

    const currency = items[0] && items[0].ticket_tier && items[0].ticket_tier.currency
      ? items[0].ticket_tier.currency
      : "USD";

    return {
      cart_id: cart.id,
      status: cart.status,
      items,
      subtotal: cart.subtotal || 0,
      total: cart.total || 0,
      currency
    };
  }

  // 6) updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage("cart_items");
    const carts = this._getFromStorage("carts");

    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: "Cart item not found", cart: null };
    }

    const item = cartItems[idx];
    const cart = carts.find(c => c.id === item.cart_id);
    if (!cart) {
      return { success: false, message: "Cart not found for item", cart: null };
    }

    if (quantity <= 0) {
      // Remove item
      cartItems = cartItems.filter(ci => ci.id !== cartItemId);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== cartItemId);
      }
    } else {
      item.quantity = quantity;
      item.line_total = item.unit_price * quantity;
      cartItems[idx] = item;
    }

    this._saveToStorage("cart_items", cartItems);
    this._recalculateCartTotals(cart, cartItems);

    const ticketTypes = this._getFromStorage("ticket_types");
    const ticketTiers = this._getFromStorage("ticket_tiers");

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const tt = ticketTypes.find(t => t.id === ci.ticket_type_id) || null;
        const tier = ticketTiers.find(t => t.id === ci.ticket_tier_id) || null;
        return {
          cart_item_id: ci.id,
          ticket_type_name: tt ? tt.name : "",
          ticket_tier_name: tier ? tier.name : "",
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total,
          ticket_type_id: ci.ticket_type_id,
          ticket_tier_id: ci.ticket_tier_id,
          ticket_type: tt,
          ticket_tier: tier
        };
      });

    return {
      success: true,
      message: "Cart updated",
      cart: {
        cart_id: cart.id,
        status: cart.status,
        items,
        subtotal: cart.subtotal || 0,
        total: cart.total || 0,
        currency: items[0] && items[0].ticket_tier && items[0].ticket_tier.currency
          ? items[0].ticket_tier.currency
          : "USD"
      }
    };
  }

  // 7) removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage("cart_items");
    const carts = this._getFromStorage("carts");

    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return { success: false, message: "Cart item not found", cart: null };
    }

    const item = cartItems[idx];
    const cart = carts.find(c => c.id === item.cart_id);
    if (!cart) {
      return { success: false, message: "Cart not found for item", cart: null };
    }

    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter(id => id !== cartItemId);
    }

    this._saveToStorage("cart_items", cartItems);
    this._recalculateCartTotals(cart, cartItems);

    const ticketTypes = this._getFromStorage("ticket_types");
    const ticketTiers = this._getFromStorage("ticket_tiers");

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const tt = ticketTypes.find(t => t.id === ci.ticket_type_id) || null;
        const tier = ticketTiers.find(t => t.id === ci.ticket_tier_id) || null;
        return {
          cart_item_id: ci.id,
          ticket_type_name: tt ? tt.name : "",
          ticket_tier_name: tier ? tier.name : "",
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total,
          ticket_type_id: ci.ticket_type_id,
          ticket_tier_id: ci.ticket_tier_id,
          ticket_type: tt,
          ticket_tier: tier
        };
      });

    return {
      success: true,
      message: "Cart item removed",
      cart: {
        cart_id: cart.id,
        status: cart.status,
        items,
        subtotal: cart.subtotal || 0,
        total: cart.total || 0,
        currency: items[0] && items[0].ticket_tier && items[0].ticket_tier.currency
          ? items[0].ticket_tier.currency
          : "USD"
      }
    };
  }

  // 8) startOrGetCheckoutSession()
  startOrGetCheckoutSession() {
    const session = this._getOrCreateCheckoutSession();
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items");
    const ticketTypes = this._getFromStorage("ticket_types");
    const ticketTiers = this._getFromStorage("ticket_tiers");

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const tt = ticketTypes.find(t => t.id === ci.ticket_type_id) || null;
        const tier = ticketTiers.find(t => t.id === ci.ticket_tier_id) || null;
        return {
          ticket_type_name: tt ? tt.name : "",
          ticket_tier_name: tier ? tier.name : "",
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total,
          ticket_type_id: ci.ticket_type_id,
          ticket_tier_id: ci.ticket_tier_id,
          ticket_type: tt,
          ticket_tier: tier
        };
      });

    const currency = items[0] && items[0].ticket_tier && items[0].ticket_tier.currency
      ? items[0].ticket_tier.currency
      : "USD";

    return {
      checkout_session_id: session.id,
      delivery_method: session.delivery_method,
      available_delivery_methods: ["mobile_ticket", "e_ticket", "mail", "will_call"],
      purchaser_name: session.purchaser_name || "",
      purchaser_email: session.purchaser_email || "",
      purchaser_phone: session.purchaser_phone || "",
      current_step: session.current_step,
      order_summary: {
        items,
        subtotal: cart.subtotal || 0,
        total: cart.total || 0,
        currency
      }
    };
  }

  // 9) updateCheckoutDeliveryAndDetails(deliveryMethod, purchaserName, purchaserEmail, purchaserPhone)
  updateCheckoutDeliveryAndDetails(deliveryMethod, purchaserName, purchaserEmail, purchaserPhone) {
    const allowed = ["mobile_ticket", "e_ticket", "mail", "will_call"];
    if (!allowed.includes(deliveryMethod)) {
      return {
        checkout_session_id: null,
        success: false,
        current_step: "delivery",
        message: "Invalid delivery method"
      };
    }

    const session = this._getOrCreateCheckoutSession();
    session.delivery_method = deliveryMethod;
    if (typeof purchaserName === "string") session.purchaser_name = purchaserName;
    if (typeof purchaserEmail === "string") session.purchaser_email = purchaserEmail;
    if (typeof purchaserPhone === "string") session.purchaser_phone = purchaserPhone;
    session.current_step = "delivery";

    const sessions = this._getFromStorage("checkout_sessions");
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx !== -1) {
      sessions[idx] = session;
      this._saveToStorage("checkout_sessions", sessions);
    }

    return {
      checkout_session_id: session.id,
      success: true,
      current_step: session.current_step,
      message: "Checkout details updated"
    };
  }

  // 10) proceedToPaymentStep()
  proceedToPaymentStep() {
    const session = this._getOrCreateCheckoutSession();
    session.current_step = "payment";
    const sessions = this._getFromStorage("checkout_sessions");
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx !== -1) {
      sessions[idx] = session;
      this._saveToStorage("checkout_sessions", sessions);
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items");
    const ticketTypes = this._getFromStorage("ticket_types");
    const ticketTiers = this._getFromStorage("ticket_tiers");

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const tt = ticketTypes.find(t => t.id === ci.ticket_type_id) || null;
        const tier = ticketTiers.find(t => t.id === ci.ticket_tier_id) || null;
        return {
          ticket_type_name: tt ? tt.name : "",
          ticket_tier_name: tier ? tier.name : "",
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_total: ci.line_total,
          ticket_type_id: ci.ticket_type_id,
          ticket_tier_id: ci.ticket_tier_id,
          ticket_type: tt,
          ticket_tier: tier
        };
      });

    const currency = items[0] && items[0].ticket_tier && items[0].ticket_tier.currency
      ? items[0].ticket_tier.currency
      : "USD";

    return {
      checkout_session_id: session.id,
      success: true,
      current_step: session.current_step,
      order_summary: {
        items,
        total: cart.total || 0,
        currency
      }
    };
  }

  // 11) getScheduleFilterOptions()
  getScheduleFilterOptions() {
    const performances = this._getFromStorage("performances");
    const stages = this._getFromStorage("stages");

    const daySet = new Set(performances.map(p => p.day));
    const days = Array.from(daySet).filter(Boolean);

    const time_ranges_presets = [
      { id: "afternoon_evening", label: "Afternoon & Evening (2 PM - 10 PM)", start_time: "14:00", end_time: "22:00" },
      { id: "evening", label: "Evening (6 PM - 11 PM)", start_time: "18:00", end_time: "23:00" },
      { id: "daytime", label: "Daytime (12 PM - 6 PM)", start_time: "12:00", end_time: "18:00" }
    ];

    const stageOptions = stages.map(s => ({
      stage_id: s.id,
      name: s.name,
      is_main_stage: !!s.is_main_stage
    }));

    return { days, time_ranges_presets, stages: stageOptions };
  }

  // 12) getSchedule(day, filters)
  getSchedule(day, filters) {
    const performances = this._getFromStorage("performances");
    const artists = this._getFromStorage("artists");
    const stages = this._getFromStorage("stages");
    const mySchedule = this._getFromStorage("my_schedule_items");

    const f = filters || {};
    const minMinutes = f.startTimeFrom ? this._timeStringToMinutes(f.startTimeFrom) : null;
    const maxMinutes = f.startTimeTo ? this._timeStringToMinutes(f.startTimeTo) : null;
    const stageIds = Array.isArray(f.stageIds) ? f.stageIds : null;
    const musicOnly = !!f.isMusicOnly;

    const results = performances
      .filter(p => p.day === day)
      .filter(p => {
        if (musicOnly && !p.is_music_performance) return false;
        const m = this._dateTimeToMinutes(p.start_time);
        if (minMinutes != null && m != null && m < minMinutes) return false;
        if (maxMinutes != null && m != null && m > maxMinutes) return false;
        if (stageIds && stageIds.length && !stageIds.includes(p.stage_id)) return false;
        return true;
      })
      .sort((a, b) => {
        const ma = this._dateTimeToMinutes(a.start_time) || 0;
        const mb = this._dateTimeToMinutes(b.start_time) || 0;
        return ma - mb;
      })
      .map(p => {
        const artist = artists.find(a => a.id === p.artist_id) || {};
        const stage = stages.find(s => s.id === p.stage_id) || {};
        const inSchedule = mySchedule.some(ms => ms.performance_id === p.id);
        return {
          performance_id: p.id,
          performance_name: p.name || artist.name || "",
          artist_id: artist.id,
          artist_name: artist.name || "",
          stage_id: stage.id,
          stage_name: stage.name || "",
          day: p.day,
          start_time: p.start_time,
          end_time: p.end_time,
          description: p.description || "",
          is_music_performance: !!p.is_music_performance,
          is_in_my_schedule: inSchedule,
          artist,
          stage
        };
      });

    return results;
  }

  // 13) getEventDetails(performanceId)
  getEventDetails(performanceId) {
    const performances = this._getFromStorage("performances");
    const artists = this._getFromStorage("artists");
    const stages = this._getFromStorage("stages");
    const mySchedule = this._getFromStorage("my_schedule_items");

    const p = performances.find(perf => perf.id === performanceId);
    if (!p) return {};

    const artist = artists.find(a => a.id === p.artist_id) || {};
    const stage = stages.find(s => s.id === p.stage_id) || {};
    const inSchedule = mySchedule.some(ms => ms.performance_id === p.id);

    return {
      performance_id: p.id,
      performance_name: p.name || artist.name || "",
      day: p.day,
      start_time: p.start_time,
      end_time: p.end_time,
      description: p.description || "",
      is_music_performance: !!p.is_music_performance,
      stage: {
        stage_id: stage.id,
        name: stage.name || "",
        description: stage.description || ""
      },
      artist: {
        artist_id: artist.id,
        name: artist.name || "",
        genre: artist.genre || "",
        cultural_background: artist.cultural_background || "",
        artist_type: artist.artist_type || ""
      },
      is_in_my_schedule: inSchedule
    };
  }

  // 14) addPerformanceToMySchedule(performanceId)
  addPerformanceToMySchedule(performanceId) {
    let store = this._getOrCreateMyScheduleStore();
    const exists = store.find(i => i.performance_id === performanceId);
    if (exists) {
      return {
        my_schedule_item_id: exists.id,
        success: true,
        is_in_my_schedule: true,
        my_schedule_count: store.length
      };
    }

    const item = {
      id: this._generateId("ms"),
      performance_id: performanceId,
      added_at: this._nowIso()
    };
    store.push(item);
    this._saveMyScheduleStore(store);

    return {
      my_schedule_item_id: item.id,
      success: true,
      is_in_my_schedule: true,
      my_schedule_count: store.length
    };
  }

  // 15) removePerformanceFromMySchedule(performanceId)
  removePerformanceFromMySchedule(performanceId) {
    let store = this._getOrCreateMyScheduleStore();
    const before = store.length;
    store = store.filter(i => i.performance_id !== performanceId);
    this._saveMyScheduleStore(store);
    return {
      success: true,
      is_in_my_schedule: false,
      my_schedule_count: store.length
    };
  }

  // 16) getMyScheduleOverview()
  getMyScheduleOverview() {
    const itemsStore = this._getOrCreateMyScheduleStore();
    const performances = this._getFromStorage("performances");
    const artists = this._getFromStorage("artists");
    const stages = this._getFromStorage("stages");

    const items = itemsStore.map(ms => {
      const p = performances.find(perf => perf.id === ms.performance_id) || {};
      const artist = artists.find(a => a.id === p.artist_id) || {};
      const stage = stages.find(s => s.id === p.stage_id) || {};
      return {
        my_schedule_item_id: ms.id,
        performance_id: ms.performance_id,
        performance_name: p.name || artist.name || "",
        artist_name: artist.name || "",
        stage_name: stage.name || "",
        day: p.day || "",
        start_time: p.start_time || "",
        end_time: p.end_time || "",
        performance: p
      };
    });

    return { items };
  }

  // 17) getLineupFilterOptions()
  getLineupFilterOptions() {
    const performances = this._getFromStorage("performances");
    const stages = this._getFromStorage("stages");

    const daySet = new Set(performances.map(p => p.day));
    const days = Array.from(daySet).filter(Boolean);

    const stageOptions = stages.map(s => ({ stage_id: s.id, name: s.name }));

    const artist_types = [
      { value: "headliner", label: "Headliner" },
      { value: "local", label: "Local" },
      { value: "emerging", label: "Emerging" },
      { value: "guest", label: "Guest" }
    ];

    return { days, stages: stageOptions, artist_types };
  }

  // 18) getLineup(day, filters)
  getLineup(day, filters) {
    const artists = this._getFromStorage("artists");
    const performances = this._getFromStorage("performances");
    const stages = this._getFromStorage("stages");
    const favorites = this._getFromStorage("artist_favorites");

    const f = filters || {};
    const minMinutes = f.timeStartFrom ? this._timeStringToMinutes(f.timeStartFrom) : null;
    const maxMinutes = f.timeStartTo ? this._timeStringToMinutes(f.timeStartTo) : null;
    const artistTypesFilter = Array.isArray(f.artistTypes) && f.artistTypes.length ? f.artistTypes : null;
    const stageIdsFilter = Array.isArray(f.stageIds) && f.stageIds.length ? f.stageIds : null;

    // Filter performances by day/time/stage
    const perfFiltered = performances.filter(p => {
      if (day && p.day !== day) return false;
      const m = this._dateTimeToMinutes(p.start_time);
      if (minMinutes != null && m != null && m < minMinutes) return false;
      if (maxMinutes != null && m != null && m > maxMinutes) return false;
      if (stageIdsFilter && !stageIdsFilter.includes(p.stage_id)) return false;
      return true;
    });

    // Group performances by artist
    const perArtist = new Map();
    for (const p of perfFiltered) {
      if (!perArtist.has(p.artist_id)) perArtist.set(p.artist_id, []);
      perArtist.get(p.artist_id).push(p);
    }

    const results = [];

    for (const artist of artists) {
      if (artist.is_active === false) continue;
      if (artistTypesFilter && !artistTypesFilter.includes(artist.artist_type)) continue;
      const perfs = perArtist.get(artist.id) || [];
      let nextPerf = null;

      if (perfs.length) {
        // Pick earliest start_time among filtered performances for this artist
        nextPerf = perfs.slice().sort((a, b) => {
          const ma = this._dateTimeToMinutes(a.start_time) || 0;
          const mb = this._dateTimeToMinutes(b.start_time) || 0;
          return ma - mb;
        })[0];
      } else {
        // Allow local/emerging artists with no scheduled performances when those
        // types are explicitly requested so they can still appear in custom lists.
        if (!(artistTypesFilter && (artist.artist_type === "local" || artist.artist_type === "emerging"))) {
          continue;
        }
      }

      const stage = nextPerf ? stages.find(s => s.id === nextPerf.stage_id) || {} : {};
      const isFav = favorites.some(fav => fav.artist_id === artist.id);
      results.push({
        artist_id: artist.id,
        name: artist.name,
        artist_type: artist.artist_type,
        genre: artist.genre || "",
        cultural_background: artist.cultural_background || "",
        photo_url: artist.photo_url || "",
        next_performance_day: nextPerf ? nextPerf.day : null,
        next_performance_start_time: nextPerf ? nextPerf.start_time : null,
        next_performance_end_time: nextPerf ? nextPerf.end_time : null,
        next_performance_stage_name: stage.name || "",
        is_in_favorites: isFav,
        artist
      });
    }

    return results;
  }

  // 19) getArtistDetails(artistId)
  getArtistDetails(artistId) {
    const artists = this._getFromStorage("artists");
    const performances = this._getFromStorage("performances");
    const stages = this._getFromStorage("stages");
    const favorites = this._getFromStorage("artist_favorites");

    const artist = artists.find(a => a.id === artistId);
    if (!artist) return {};

    const isFav = favorites.some(f => f.artist_id === artist.id);

    const perfs = performances
      .filter(p => p.artist_id === artist.id)
      .map(p => {
        const stage = stages.find(s => s.id === p.stage_id) || {};
        return {
          performance_id: p.id,
          day: p.day,
          start_time: p.start_time,
          end_time: p.end_time,
          stage_name: stage.name || "",
          stage
        };
      });

    return {
      artist_id: artist.id,
      name: artist.name,
      bio: artist.bio || "",
      genre: artist.genre || "",
      cultural_background: artist.cultural_background || "",
      photo_url: artist.photo_url || "",
      artist_type: artist.artist_type,
      home_city: artist.home_city || "",
      home_country: artist.home_country || "",
      is_in_favorites: isFav,
      performances: perfs
    };
  }

  // 20) addArtistToFavorites(artistId)
  addArtistToFavorites(artistId) {
    let store = this._getOrCreateArtistFavoritesStore();
    const existing = store.find(f => f.artist_id === artistId);
    if (existing) {
      return {
        artist_favorite_id: existing.id,
        success: true,
        is_in_favorites: true,
        favorites_count: store.length
      };
    }

    const item = {
      id: this._generateId("af"),
      artist_id: artistId,
      added_at: this._nowIso()
    };
    store.push(item);
    this._saveArtistFavoritesStore(store);

    return {
      artist_favorite_id: item.id,
      success: true,
      is_in_favorites: true,
      favorites_count: store.length
    };
  }

  // 21) removeArtistFromFavorites(artistId)
  removeArtistFromFavorites(artistId) {
    let store = this._getOrCreateArtistFavoritesStore();
    store = store.filter(f => f.artist_id !== artistId);
    this._saveArtistFavoritesStore(store);

    return {
      success: true,
      is_in_favorites: false,
      favorites_count: store.length
    };
  }

  // 22) getMyLineupOverview()
  getMyLineupOverview() {
    const favoritesStore = this._getOrCreateArtistFavoritesStore();
    const artists = this._getFromStorage("artists");
    const { lists, listItems } = this._getOrCreateArtistListsStore();

    const favorites = favoritesStore.map(f => {
      const artist = artists.find(a => a.id === f.artist_id) || {};
      return {
        artist_id: artist.id,
        name: artist.name || "",
        artist_type: artist.artist_type || "",
        artist
      };
    });

    const listsEnriched = lists.map(l => {
      const count = listItems.filter(li => li.artist_list_id === l.id).length;
      return {
        artist_list_id: l.id,
        name: l.name,
        description: l.description || "",
        artist_count: count
      };
    });

    return { favorites, lists: listsEnriched };
  }

  // 23) upsertArtistList(artistListId, name, description)
  upsertArtistList(artistListId, name, description) {
    let { lists, listItems } = this._getOrCreateArtistListsStore();
    let list;

    if (artistListId) {
      list = lists.find(l => l.id === artistListId);
    }

    if (list) {
      list.name = name;
      if (typeof description === "string") list.description = description;
      list.updated_at = this._nowIso();
    } else {
      list = {
        id: this._generateId("alist"),
        name,
        description: description || "",
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      lists.push(list);
    }

    this._saveArtistListsStore(lists, listItems);

    return {
      artist_list_id: list.id,
      name: list.name,
      description: list.description || ""
    };
  }

  // 24) assignArtistsToList(artistListId, artistIds, append)
  assignArtistsToList(artistListId, artistIds, append) {
    let { lists, listItems } = this._getOrCreateArtistListsStore();
    const list = lists.find(l => l.id === artistListId);
    if (!list) {
      return { artist_list_id: artistListId, success: false, total_artists_in_list: 0 };
    }

    const idsSet = new Set(artistIds || []);

    if (!append) {
      listItems = listItems.filter(li => li.artist_list_id !== artistListId);
    } else {
      // Remove duplicates that will be re-added
      listItems = listItems.filter(li => !(li.artist_list_id === artistListId && idsSet.has(li.artist_id)));
    }

    let orderBase = listItems.filter(li => li.artist_list_id === artistListId).length;

    (artistIds || []).forEach(aid => {
      const item = {
        id: this._generateId("ali"),
        artist_list_id: artistListId,
        artist_id: aid,
        order: orderBase++,
        added_at: this._nowIso()
      };
      listItems.push(item);
    });

    this._saveArtistListsStore(lists, listItems);

    const total = listItems.filter(li => li.artist_list_id === artistListId).length;

    return { artist_list_id: artistListId, success: true, total_artists_in_list: total };
  }

  // 25) getFoodFilterOptions()
  getFoodFilterOptions() {
    const dishes = this._getFromStorage("dishes");

    const dish_types = [
      { value: "main", label: "Mains" },
      { value: "dessert", label: "Desserts" },
      { value: "drink", label: "Drinks" },
      { value: "side", label: "Sides" },
      { value: "snack", label: "Snacks" }
    ];

    const cuisineSet = new Set(dishes.map(d => d.cuisine).filter(Boolean));
    const cuisines = Array.from(cuisineSet);

    const dietarySet = new Set();
    dishes.forEach(d => {
      if (Array.isArray(d.dietary_tags)) {
        d.dietary_tags.forEach(t => dietarySet.add(t));
      }
    });
    const dietary_tags = Array.from(dietarySet);

    const price_ranges = [
      { min: 0, max: 10, label: "Under $10" },
      { min: 0, max: 15, label: "Under $15" },
      { min: 0, max: 20, label: "Under $20" }
    ];

    const rating_options = [
      { min_rating: 3.5, label: "3.5+ stars" },
      { min_rating: 4.0, label: "4.0+ stars" },
      { min_rating: 4.5, label: "4.5+ stars" }
    ];

    return { dish_types, cuisines, dietary_tags, price_ranges, rating_options };
  }

  // 26) searchDishes(query, filters)
  searchDishes(query, filters) {
    const dishes = this._getFromStorage("dishes");
    const vendors = this._getFromStorage("vendors");
    const q = (query || "").toLowerCase();
    const f = filters || {};

    const results = dishes
      .filter(d => {
        if (q) {
          const v = vendors.find(vd => vd.id === d.vendor_id) || {};
          const hay = (d.name || "") + " " + (v.name || "");
          if (hay.toLowerCase().indexOf(q) === -1) return false;
        }
        if (f.dishType && d.dish_type !== f.dishType) return false;
        if (typeof f.maxPrice === "number" && d.price > f.maxPrice) return false;
        if (typeof f.minRating === "number" && (d.average_rating || 0) < f.minRating) return false;
        if (f.isVegetarian && !(d.is_vegetarian || (Array.isArray(d.dietary_tags) && d.dietary_tags.includes("vegetarian")))) {
          return false;
        }
        if (f.cuisine && d.cuisine && d.cuisine.toLowerCase() !== f.cuisine.toLowerCase()) return false;
        return true;
      })
      .map(d => {
        const v = vendors.find(vd => vd.id === d.vendor_id) || {};
        return {
          dish_id: d.id,
          name: d.name,
          cuisine: d.cuisine,
          dish_type: d.dish_type,
          price: d.price,
          currency: d.currency,
          is_vegetarian: !!d.is_vegetarian,
          is_vegan: !!d.is_vegan,
          average_rating: d.average_rating || 0,
          vendor_id: v.id,
          vendor_name: v.name || "",
          vendor_food_type: v.vendor_food_type || "other",
          dish: d,
          vendor: v
        };
      });

    return results;
  }

  // 27) getDishDetails(dishId)
  getDishDetails(dishId) {
    const dishes = this._getFromStorage("dishes");
    const vendors = this._getFromStorage("vendors");
    const mapLocations = this._getFromStorage("map_locations");
    const tastingList = this._getFromStorage("tasting_list_items");

    const dish = dishes.find(d => d.id === dishId);
    if (!dish) return {};

    const vendor = vendors.find(v => v.id === dish.vendor_id) || {};
    const loc = mapLocations.find(m => m.id === vendor.location_id) || {};
    const inList = tastingList.some(t => t.dish_id === dish.id);

    return {
      dish_id: dish.id,
      name: dish.name,
      cuisine: dish.cuisine,
      description: dish.description || "",
      dish_type: dish.dish_type,
      price: dish.price,
      currency: dish.currency,
      dietary_tags: dish.dietary_tags || [],
      is_vegetarian: !!dish.is_vegetarian,
      is_vegan: !!dish.is_vegan,
      average_rating: dish.average_rating || 0,
      rating_count: dish.rating_count || 0,
      vendor: {
        vendor_id: vendor.id,
        vendor_name: vendor.name || "",
        vendor_food_type: vendor.vendor_food_type || "other",
        location_id: loc.id,
        location_name: loc.name || ""
      },
      is_in_tasting_list: inList
    };
  }

  // 28) addDishToTastingList(dishId)
  addDishToTastingList(dishId) {
    let store = this._getOrCreateTastingListStore();
    const existing = store.find(t => t.dish_id === dishId);
    if (existing) {
      return {
        tasting_list_item_id: existing.id,
        success: true,
        is_in_tasting_list: true,
        tasting_list_count: store.length
      };
    }

    const item = {
      id: this._generateId("tl"),
      dish_id: dishId,
      added_at: this._nowIso()
    };
    store.push(item);
    this._saveTastingListStore(store);

    return {
      tasting_list_item_id: item.id,
      success: true,
      is_in_tasting_list: true,
      tasting_list_count: store.length
    };
  }

  // 29) removeDishFromTastingList(dishId)
  removeDishFromTastingList(dishId) {
    let store = this._getOrCreateTastingListStore();
    store = store.filter(t => t.dish_id !== dishId);
    this._saveTastingListStore(store);

    return {
      success: true,
      is_in_tasting_list: false,
      tasting_list_count: store.length
    };
  }

  // 30) getTastingList()
  getTastingList() {
    const store = this._getOrCreateTastingListStore();
    const dishes = this._getFromStorage("dishes");
    const vendors = this._getFromStorage("vendors");

    const items = store.map(t => {
      const dish = dishes.find(d => d.id === t.dish_id) || {};
      const vendor = vendors.find(v => v.id === dish.vendor_id) || {};
      return {
        tasting_list_item_id: t.id,
        dish_id: t.dish_id,
        name: dish.name || "",
        cuisine: dish.cuisine || "",
        dish_type: dish.dish_type || "",
        price: dish.price || 0,
        currency: dish.currency || "USD",
        average_rating: dish.average_rating || 0,
        vendor_name: vendor.name || "",
        added_at: t.added_at,
        dish
      };
    });

    return { items };
  }

  // 31) getActivityFilterOptions()
  getActivityFilterOptions() {
    const activities = this._getFromStorage("activities");

    const activity_types = [
      { value: "dance_workshop", label: "Dance Workshops" },
      { value: "music_workshop", label: "Music Workshops" },
      { value: "kids_activity", label: "Kids Activities" },
      { value: "family_activity", label: "Family Activities" },
      { value: "cultural_demo", label: "Cultural Demos" },
      { value: "other", label: "Other" }
    ];

    const daySet = new Set(activities.map(a => a.day));
    const days = Array.from(daySet).filter(Boolean);

    const levels = [
      { value: "beginner", label: "Beginner" },
      { value: "intermediate", label: "Intermediate" },
      { value: "advanced", label: "Advanced" },
      { value: "all_levels", label: "All Levels" },
      { value: "not_applicable", label: "Not Applicable" }
    ];

    const price_ranges = [
      { min: 0, max: 0, label: "Free" },
      { min: 0, max: 20, label: "Up to $20" }
    ];

    const rating_options = [
      { min_rating: 4.0, label: "4.0+ stars" },
      { min_rating: 4.5, label: "4.5+ stars" }
    ];

    return { activity_types, days, levels, price_ranges, rating_options };
  }

  // 32) searchActivities(query, filters)
  searchActivities(query, filters) {
    const activities = this._getFromStorage("activities");
    const mapLocations = this._getFromStorage("map_locations");

    const q = (query || "").toLowerCase();
    const f = filters || {};

    const results = activities
      .filter(a => {
        if (q) {
          const hay = (a.name || "") + " " + (a.description || "");
          if (hay.toLowerCase().indexOf(q) === -1) return false;
        }
        if (Array.isArray(f.activityTypes) && f.activityTypes.length && !f.activityTypes.includes(a.activity_type)) {
          return false;
        }
        if (f.day && a.day !== f.day) return false;
        const m = this._dateTimeToMinutes(a.start_time);
        const minM = f.startTimeFrom ? this._timeStringToMinutes(f.startTimeFrom) : null;
        const maxM = f.startTimeTo ? this._timeStringToMinutes(f.startTimeTo) : null;
        if (minM != null && m != null && m < minM) return false;
        if (maxM != null && m != null && m > maxM) return false;
        if (typeof f.maxPrice === "number" && a.price > f.maxPrice) return false;
        if (f.isFree && !a.is_free) return false;
        if (f.level && a.level !== f.level) return false;
        if (typeof f.minRating === "number" && (a.average_rating || 0) < f.minRating) return false;
        if (f.kidsOnly && !a.is_kids_focused) return false;
        if (f.familyFriendlyOnly && !a.is_family_friendly) return false;
        return true;
      })
      .map(a => {
        const loc = mapLocations.find(m => m.id === a.location_id) || {};
        return {
          activity_id: a.id,
          name: a.name,
          activity_type: a.activity_type,
          day: a.day,
          start_time: a.start_time,
          end_time: a.end_time,
          price: a.price,
          currency: a.currency,
          is_free: !!a.is_free,
          level: a.level,
          average_rating: a.average_rating || 0,
          rating_count: a.rating_count || 0,
          is_kids_focused: !!a.is_kids_focused,
          is_family_friendly: !!a.is_family_friendly,
          location_name: loc.name || "",
          activity: a,
          location: loc
        };
      });

    return results;
  }

  // 33) getActivityDetails(activityId)
  getActivityDetails(activityId) {
    const activities = this._getFromStorage("activities");
    const mapLocations = this._getFromStorage("map_locations");
    const familyPlan = this._getFromStorage("family_plan_items");

    const a = activities.find(act => act.id === activityId);
    if (!a) return {};

    const loc = mapLocations.find(m => m.id === a.location_id) || {};
    const inFamily = familyPlan.some(fp => fp.activity_id === a.id);

    return {
      activity_id: a.id,
      name: a.name,
      description: a.description || "",
      activity_type: a.activity_type,
      day: a.day,
      start_time: a.start_time,
      end_time: a.end_time,
      location_name: loc.name || "",
      price: a.price,
      currency: a.currency,
      is_free: !!a.is_free,
      level: a.level,
      average_rating: a.average_rating || 0,
      rating_count: a.rating_count || 0,
      is_kids_focused: !!a.is_kids_focused,
      is_family_friendly: !!a.is_family_friendly,
      instructor_name: a.instructor_name || "",
      registration_available: true,
      requires_registration: true,
      is_in_family_plan: inFamily
    };
  }

  // 34) registerForWorkshop(activityId, registrantName, registrantEmail, registrantPhone)
  registerForWorkshop(activityId, registrantName, registrantEmail, registrantPhone) {
    const activities = this._getFromStorage("activities");
    const activity = activities.find(a => a.id === activityId);
    if (!activity) {
      return { registration_id: null, status: "pending", success: false, message: "Activity not found" };
    }

    let regs = this._getFromStorage("workshop_registrations");
    const reg = {
      id: this._generateId("wr"),
      activity_id: activityId,
      registrant_name: registrantName,
      registrant_email: registrantEmail,
      registrant_phone: registrantPhone,
      registered_at: this._nowIso(),
      status: "pending"
    };
    regs.push(reg);
    this._saveToStorage("workshop_registrations", regs);

    return {
      registration_id: reg.id,
      status: reg.status,
      success: true,
      message: "Registration submitted"
    };
  }

  // 35) addActivityToFamilyPlan(activityId)
  addActivityToFamilyPlan(activityId) {
    let store = this._getOrCreateFamilyPlanStore();
    const existing = store.find(f => f.activity_id === activityId);
    if (existing) {
      return {
        family_plan_item_id: existing.id,
        success: true,
        is_in_family_plan: true,
        family_plan_count: store.length
      };
    }

    const item = {
      id: this._generateId("fp"),
      activity_id: activityId,
      added_at: this._nowIso()
    };
    store.push(item);
    this._saveFamilyPlanStore(store);

    return {
      family_plan_item_id: item.id,
      success: true,
      is_in_family_plan: true,
      family_plan_count: store.length
    };
  }

  // 36) removeActivityFromFamilyPlan(activityId)
  removeActivityFromFamilyPlan(activityId) {
    let store = this._getOrCreateFamilyPlanStore();
    store = store.filter(f => f.activity_id !== activityId);
    this._saveFamilyPlanStore(store);

    return {
      success: true,
      is_in_family_plan: false,
      family_plan_count: store.length
    };
  }

  // 37) getFamilyPlan()
  getFamilyPlan() {
    const store = this._getOrCreateFamilyPlanStore();
    const activities = this._getFromStorage("activities");

    const items = store.map(fp => {
      const a = activities.find(act => act.id === fp.activity_id) || {};
      return {
        family_plan_item_id: fp.id,
        activity_id: fp.activity_id,
        name: a.name || "",
        day: a.day || "",
        start_time: a.start_time || "",
        end_time: a.end_time || "",
        average_rating: a.average_rating || 0,
        is_kids_focused: !!a.is_kids_focused,
        is_family_friendly: !!a.is_family_friendly,
        activity: a
      };
    });

    return { items };
  }

  // 38) getMapOverview()
  getMapOverview() {
    const mapLocations = this._getFromStorage("map_locations");
    const stages = this._getFromStorage("stages");

    let main_stage_location = null;
    const mainStage = stages.find(s => s.is_main_stage);
    if (mainStage) {
      const loc = mapLocations.find(m => m.id === mainStage.location_id);
      if (loc) {
        main_stage_location = {
          map_location_id: loc.id,
          name: loc.name,
          latitude: loc.latitude || 0,
          longitude: loc.longitude || 0
        };
      }
    }

    let bounds = null;
    if (mapLocations.length) {
      const lats = mapLocations.map(m => m.latitude).filter(v => typeof v === "number");
      const lngs = mapLocations.map(m => m.longitude).filter(v => typeof v === "number");
      if (lats.length && lngs.length) {
        bounds = {
          min_latitude: Math.min.apply(null, lats),
          max_latitude: Math.max.apply(null, lats),
          min_longitude: Math.min.apply(null, lngs),
          max_longitude: Math.max.apply(null, lngs)
        };
      }
    }

    const available_filters = {
      location_types: [
        { value: "stage", label: "Stages" },
        { value: "food_vendor", label: "Food Vendors" },
        { value: "activity_area", label: "Activities" },
        { value: "entrance", label: "Entrances" },
        { value: "info_booth", label: "Info Booths" },
        { value: "restroom", label: "Restrooms" },
        { value: "other", label: "Other" }
      ],
      food_vendor_types: [
        { value: "main", label: "Mains" },
        { value: "dessert", label: "Desserts" },
        { value: "drink", label: "Drinks" }
      ]
    };

    return {
      main_stage_location,
      map_bounds: bounds,
      available_filters
    };
  }

  // 39) searchMapLocations(query, filters)
  searchMapLocations(query, filters) {
    const mapLocations = this._getFromStorage("map_locations");
    const q = (query || "").toLowerCase();
    const f = filters || {};
    const locationTypes = Array.isArray(f.locationTypes) && f.locationTypes.length ? f.locationTypes : null;

    const results = mapLocations
      .filter(m => {
        if (q && (m.name || "").toLowerCase().indexOf(q) === -1) return false;
        if (locationTypes && !locationTypes.includes(m.location_type)) return false;
        return true;
      })
      .map(m => ({
        map_location_id: m.id,
        name: m.name,
        description: m.description || "",
        location_type: m.location_type,
        latitude: m.latitude || 0,
        longitude: m.longitude || 0,
        is_near_main_stage: !!m.is_near_main_stage,
        walking_time_from_main_stage: typeof m.walking_time_from_main_stage === "number" ? m.walking_time_from_main_stage : null,
        map_location: m
      }));

    return results;
  }

  // 40) getFoodVendorsNearLocation(locationId, maxWalkingTimeMinutes, vendorFoodTypes)
  getFoodVendorsNearLocation(locationId, maxWalkingTimeMinutes, vendorFoodTypes) {
    const vendors = this._getFromStorage("vendors");
    const mapLocations = this._getFromStorage("map_locations");
    const stages = this._getFromStorage("stages");

    // Determine main stage location for walking time reference
    const mainStage = stages.find(s => s.is_main_stage);
    const mainLoc = mainStage ? mapLocations.find(m => m.id === mainStage.location_id) : null;
    const isFromMainStage = mainLoc && mainLoc.id === locationId;

    const typesFilter = Array.isArray(vendorFoodTypes) && vendorFoodTypes.length ? vendorFoodTypes : null;

    const results = vendors
      .map(v => {
        const loc = mapLocations.find(m => m.id === v.location_id) || {};
        const walking = typeof loc.walking_time_from_main_stage === "number" ? loc.walking_time_from_main_stage : null;
        return { vendor: v, loc, walking };
      })
      .filter(({ vendor, loc, walking }) => {
        if (typesFilter && !typesFilter.includes(vendor.vendor_food_type)) return false;
        if (typeof maxWalkingTimeMinutes === "number") {
          if (walking == null) return false;
          if (!isFromMainStage) {
            // We only have walking time from main stage; for other origins we still approximate
            if (walking > maxWalkingTimeMinutes) return false;
          } else {
            if (walking > maxWalkingTimeMinutes) return false;
          }
        }
        return true;
      })
      .map(({ vendor, loc, walking }) => ({
        vendor_id: vendor.id,
        vendor_name: vendor.name,
        vendor_food_type: vendor.vendor_food_type,
        cuisine: vendor.cuisine || "",
        average_rating: vendor.average_rating || 0,
        map_location_id: loc.id,
        map_location_name: loc.name || "",
        walking_time_from_main_stage: walking,
        vendor,
        map_location: loc
      }));

    return results;
  }

  // 41) pinMapLocation(mapLocationId, routeOrder)
  pinMapLocation(mapLocationId, routeOrder) {
    let store = this._getOrCreateSavedMapLocationsStore();
    // If already pinned, update routeOrder if provided
    let existing = store.find(s => s.map_location_id === mapLocationId);
    if (existing) {
      if (typeof routeOrder === "number") {
        existing.route_order = routeOrder;
        this._saveSavedMapLocationsStore(store);
      }
      return {
        saved_map_location_id: existing.id,
        route_order: existing.route_order,
        success: true
      };
    }

    let nextOrder;
    if (typeof routeOrder === "number") {
      nextOrder = routeOrder;
    } else {
      const orders = store.map(s => typeof s.route_order === "number" ? s.route_order : 0);
      nextOrder = orders.length ? Math.max.apply(null, orders) + 1 : 0;
    }

    const item = {
      id: this._generateId("sml"),
      map_location_id: mapLocationId,
      added_at: this._nowIso(),
      route_order: nextOrder
    };
    store.push(item);
    this._saveSavedMapLocationsStore(store);

    return {
      saved_map_location_id: item.id,
      route_order: item.route_order,
      success: true
    };
  }

  // 42) getSavedMapLocations()
  getSavedMapLocations() {
    const store = this._getOrCreateSavedMapLocationsStore();
    const mapLocations = this._getFromStorage("map_locations");
    const vendors = this._getFromStorage("vendors");

    const items = store
      .slice()
      .sort((a, b) => (a.route_order || 0) - (b.route_order || 0))
      .map(s => {
        const loc = mapLocations.find(m => m.id === s.map_location_id) || {};
        let relatedType = null;
        if (loc.location_type === "food_vendor") {
          const vendor = vendors.find(v => v.location_id === loc.id);
          relatedType = vendor ? vendor.vendor_food_type : null;
        }
        return {
          saved_map_location_id: s.id,
          map_location_id: s.map_location_id,
          name: loc.name || "",
          location_type: loc.location_type || "other",
          route_order: s.route_order,
          walking_time_from_main_stage:
            typeof loc.walking_time_from_main_stage === "number" ? loc.walking_time_from_main_stage : null,
          related_vendor_food_type: relatedType,
          map_location: loc
        };
      });

    return { items };
  }

  // 43) reorderSavedMapLocations(orderedSavedLocationIds)
  reorderSavedMapLocations(orderedSavedLocationIds) {
    let store = this._getOrCreateSavedMapLocationsStore();
    const idToItem = new Map(store.map(s => [s.id, s]));
    let order = 0;
    const newItems = [];
    (orderedSavedLocationIds || []).forEach(id => {
      const item = idToItem.get(id);
      if (item) {
        item.route_order = order++;
        newItems.push(item);
      }
    });
    // Append any not included, preserving their order
    store.forEach(item => {
      if (!newItems.includes(item)) {
        item.route_order = order++;
        newItems.push(item);
      }
    });

    this._saveSavedMapLocationsStore(newItems);

    const mapLocations = this._getFromStorage("map_locations");
    const items = newItems.map(s => {
      const loc = mapLocations.find(m => m.id === s.map_location_id) || {};
      return {
        saved_map_location_id: s.id,
        map_location_id: s.map_location_id,
        name: loc.name || "",
        location_type: loc.location_type || "other",
        route_order: s.route_order,
        map_location: loc
      };
    });

    return { success: true, items };
  }

  // 44) getDonationPageOptions()
  getDonationPageOptions() {
    const funds = this._getFromStorage("donation_funds");
    const activeFunds = funds.filter(f => f.is_active !== false);

    const fundsOut = activeFunds.map(f => ({
      fund_id: f.id,
      name: f.name,
      description: f.description || "",
      suggested_amounts: f.suggested_amounts || []
    }));

    let default_amount = null;
    if (activeFunds.length) {
      const sa = activeFunds[0].suggested_amounts || [];
      default_amount = sa.length ? sa[0] : 25;
    } else {
      default_amount = 25;
    }

    const payment_methods = [
      { value: "credit_card", label: "Credit Card" },
      { value: "paypal", label: "PayPal" },
      { value: "bank_transfer", label: "Bank Transfer" },
      { value: "cash", label: "Cash" },
      { value: "other", label: "Other" }
    ];

    return { funds: fundsOut, default_amount, payment_methods };
  }

  // 45) submitDonation(fundId, amount, paymentMethod, donorName, donorEmail, newsletterOptIn)
  submitDonation(fundId, amount, paymentMethod, donorName, donorEmail, newsletterOptIn) {
    const funds = this._getFromStorage("donation_funds");
    const fund = funds.find(f => f.id === fundId);
    if (!fund) {
      return {
        donation_id: null,
        success: false,
        message: "Donation fund not found",
        newsletter_subscription_created: false
      };
    }

    const donations = this._getFromStorage("donations");
    const donation = {
      id: this._generateId("don"),
      fund_id: fundId,
      amount,
      currency: "USD",
      payment_method: paymentMethod,
      donor_name: donorName,
      donor_email: donorEmail,
      newsletter_opt_in: !!newsletterOptIn,
      created_at: this._nowIso()
    };
    donations.push(donation);
    this._saveToStorage("donations", donations);

    const nsResult = this._getOrCreateNewsletterSubscription(
      donorEmail,
      donorName,
      !!newsletterOptIn,
      "donation"
    );

    return {
      donation_id: donation.id,
      success: true,
      message: "Donation submitted (simulated, no real payment processed)",
      newsletter_subscription_created: nsResult.created
    };
  }

  // 46) getMyPlannerOverview()
  getMyPlannerOverview() {
    const myScheduleStore = this._getOrCreateMyScheduleStore();
    const performances = this._getFromStorage("performances");
    const artists = this._getFromStorage("artists");

    const schedule_preview = myScheduleStore
      .slice()
      .sort((a, b) => {
        const pa = performances.find(p => p.id === a.performance_id) || {};
        const pb = performances.find(p => p.id === b.performance_id) || {};
        const ma = this._dateTimeToMinutes(pa.start_time) || 0;
        const mb = this._dateTimeToMinutes(pb.start_time) || 0;
        return ma - mb;
      })
      .slice(0, 5)
      .map(ms => {
        const p = performances.find(perf => perf.id === ms.performance_id) || {};
        const artist = artists.find(a => a.id === p.artist_id) || {};
        return {
          performance_id: p.id,
          performance_name: p.name || artist.name || "",
          artist_name: artist.name || "",
          day: p.day || "",
          start_time: p.start_time || "",
          performance: p
        };
      });

    const tastingStore = this._getOrCreateTastingListStore();
    const dishes = this._getFromStorage("dishes");
    const tasting_list_preview = tastingStore
      .slice(0, 5)
      .map(t => {
        const d = dishes.find(di => di.id === t.dish_id) || {};
        return {
          dish_id: d.id,
          name: d.name || "",
          cuisine: d.cuisine || "",
          price: d.price || 0,
          dish: d
        };
      });

    const favoritesStore = this._getOrCreateArtistFavoritesStore();
    const lineup_preview = favoritesStore
      .slice(0, 5)
      .map(f => {
        const artist = artists.find(a => a.id === f.artist_id) || {};
        return {
          artist_id: artist.id,
          name: artist.name || "",
          artist_type: artist.artist_type || "",
          artist
        };
      });

    const familyStore = this._getOrCreateFamilyPlanStore();
    const activities = this._getFromStorage("activities");
    const family_plan_preview = familyStore
      .slice(0, 5)
      .map(fp => {
        const a = activities.find(act => act.id === fp.activity_id) || {};
        return {
          activity_id: a.id,
          name: a.name || "",
          day: a.day || "",
          start_time: a.start_time || "",
          activity: a
        };
      });

    const savedMap = this._getOrCreateSavedMapLocationsStore();
    const mapLocations = this._getFromStorage("map_locations");
    const saved_map_locations_preview = savedMap
      .slice()
      .sort((a, b) => (a.route_order || 0) - (b.route_order || 0))
      .slice(0, 5)
      .map(s => {
        const loc = mapLocations.find(m => m.id === s.map_location_id) || {};
        return {
          saved_map_location_id: s.id,
          name: loc.name || "",
          location_type: loc.location_type || "other",
          route_order: s.route_order,
          map_location: loc
        };
      });

    return {
      my_schedule_preview: schedule_preview,
      tasting_list_preview,
      lineup_preview,
      family_plan_preview,
      saved_map_locations_preview
    };
  }

  // 47) getAboutPageContent()
  getAboutPageContent() {
    // Static/semi-static content; not stored in localStorage
    const mission_text = "Our festival celebrates the rich diversity of global cultures through music, dance, and food.";
    const cultural_focus_text = "From street food to classical performances, we highlight traditions from around the world while supporting local artists and vendors.";
    const history_text = "Started as a neighborhood block party, the festival has grown into a three-day celebration welcoming thousands of visitors each year.";

    const location_info = {
      venue_name: "City Park Festival Grounds",
      address_text: "123 Festival Way, Your City",
      map_location_id: null
    };

    const festival_dates = [
      { label: "Festival Weekend", date_range_text: "Friday – Sunday" }
    ];

    const general_policies = [
      {
        title: "Re-entry",
        body: "Same-day re-entry is allowed with a valid wristband or mobile ticket."
      },
      {
        title: "Prohibited Items",
        body: "No weapons, outside alcohol, or glass containers are permitted on the festival grounds."
      }
    ];

    const faq_sections = [
      {
        question: "Is the festival family-friendly?",
        answer: "Yes. We offer dedicated kids activities, family areas, and stroller-friendly paths."
      },
      {
        question: "What happens if it rains?",
        answer: "The festival is rain-or-shine except in cases of severe weather. Updates will be posted on our website and social channels."
      }
    ];

    const accessibility_info = "The festival site includes accessible entrances, viewing areas, and restrooms. Please contact us for specific accommodation requests.";
    const terms_summary = "Attendance is subject to our standard terms and conditions, including code of conduct, liability limitations, and refund policy.";
    const privacy_summary = "We respect your privacy and only use your data to manage tickets, donations, and festival communications you opt into.";
    const volunteer_info = "Interested in volunteering? Help us run stages, info booths, and activities in exchange for festival perks.";

    return {
      mission_text,
      cultural_focus_text,
      history_text,
      location_info,
      festival_dates,
      general_policies,
      faq_sections,
      accessibility_info,
      terms_summary,
      privacy_summary,
      volunteer_info
    };
  }

  // 48) getContactPageContent()
  getContactPageContent() {
    const contact_email_addresses = [
      { label: "General Inquiries", email: "info@festival.example" },
      { label: "Tickets & Support", email: "tickets@festival.example" },
      { label: "Vendors & Artists", email: "partners@festival.example" }
    ];

    const phone_numbers = [
      { label: "Festival Office", phone: "+1 (555) 123-4567" },
      { label: "On-site Info Booth", phone: "+1 (555) 987-6543" }
    ];

    const on_site_help = "Visit any Info Booth on the map for lost & found, accessibility assistance, and real-time schedule updates.";

    const common_issue_links = [
      { topic: "tickets", label: "Ticket help & FAQs", related_page: "tickets" },
      { topic: "accessibility", label: "Accessibility information", related_page: "about" },
      { topic: "lost_and_found", label: "Lost & Found", related_page: "about" }
    ];

    const contact_topics = [
      "tickets",
      "accessibility",
      "vendors",
      "artists",
      "media",
      "general_question"
    ];

    return {
      contact_email_addresses,
      phone_numbers,
      on_site_help,
      common_issue_links,
      contact_topics
    };
  }

  // 49) submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    const submissions = this._getFromStorage("contact_form_submissions");
    const id = this._generateId("cf");
    submissions.push({
      id,
      name,
      email,
      topic,
      message,
      created_at: this._nowIso()
    });
    this._saveToStorage("contact_form_submissions", submissions);

    return {
      success: true,
      message: "Your message has been received.",
      case_reference: id
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