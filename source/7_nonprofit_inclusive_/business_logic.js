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
    this.idCounter = parseInt(localStorage.getItem("idCounter") || "1000", 10);
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keys = [
      "events",
      "event_registrations",
      "volunteer_shifts",
      "volunteer_shift_signups",
      "recipes",
      "menus",
      "menu_items",
      "places",
      "place_favorites",
      "donation_funds",
      "donations",
      "resource_articles",
      "reading_list_items",
      "newsletter_subscriptions",
      "accessibility_features",
      "dietary_options",
      "cities",
      "neighborhoods",
      "venue_inquiries",
      "contact_messages",
      "events_listing_view_preferences"
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
    const next = this._getNextIdCounter();
    return prefix + "_" + next;
  }

  // ----------------------
  // Generic helpers
  // ----------------------

  _nowISO() {
    return new Date().toISOString();
  }

  _formatYMD(date) {
    return date.toISOString().slice(0, 10);
  }

  _addDays(date, days) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
  }

  _getCurrentMonthRange() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: this._formatYMD(start), endDate: this._formatYMD(end) };
  }

  _getNext30DaysRange() {
    const start = new Date();
    const end = this._addDays(start, 30);
    return { startDate: this._formatYMD(start), endDate: this._formatYMD(end) };
  }

  _getThisWeekRange() {
    const now = new Date();
    const day = now.getDay(); // 0-6, 0=Sun
    const diffToMonday = (day + 6) % 7; // number of days since Monday
    const monday = this._addDays(new Date(this._formatYMD(now)), -diffToMonday);
    const sunday = this._addDays(monday, 6);
    return { startDate: this._formatYMD(monday), endDate: this._formatYMD(sunday) };
  }

  _parseDateTime(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _isDateInRange(dateTimeString, startDateYMD, endDateYMD) {
    const dt = this._parseDateTime(dateTimeString);
    if (!dt) return false;
    const datePart = dt.toISOString().slice(0, 10);
    if (startDateYMD && datePart < startDateYMD) return false;
    if (endDateYMD && datePart > endDateYMD) return false;
    return true;
  }

  _getTimeOfDayBucketMatch(dateTimeString, bucket) {
    if (!bucket) return true;
    const dt = this._parseDateTime(dateTimeString);
    if (!dt) return false;
    const hour = dt.getUTCHours();
    switch (bucket) {
      case "morning":
        return hour >= 5 && hour < 12;
      case "afternoon":
        return hour >= 12 && hour < 17;
      case "evening_after_5_pm":
        return hour >= 17;
      case "evening_after_6_pm":
        return hour >= 18;
      default:
        return true;
    }
  }

  _formatCostSummary(event) {
    if (!event) return "";
    if (event.cost_type === "free") return "Free";
    if (event.cost_type === "donation_based") return "Donation-based";
    const min = event.price_min;
    const max = event.price_max;
    if (min != null && max != null && min !== max) {
      return "$" + min + "–$" + max;
    }
    const price = max != null ? max : min;
    if (price != null) return "$" + price;
    return "Paid";
  }

  _formatEventTimeSummary(event) {
    if (!event) return "";
    const start = this._parseDateTime(event.start_datetime);
    const end = this._parseDateTime(event.end_datetime);
    if (!start || !end) return "";
    const date = this._formatYMD(start);
    const pad = (n) => (n < 10 ? "0" + n : String(n));
    const startTime = pad(start.getHours()) + ":" + pad(start.getMinutes());
    const endTime = pad(end.getHours()) + ":" + pad(end.getMinutes());
    return date + " " + startTime + "–" + endTime;
  }

  _formatLocationSummary(event, place, city, neighborhood) {
    if (!event && !place) return "";
    const parts = [];
    if (place && place.name) parts.push(place.name);
    else if (event && event.location_name) parts.push(event.location_name);
    if (neighborhood && neighborhood.name) parts.push(neighborhood.name);
    if (city && city.name) parts.push(city.name);
    return parts.join(", ");
  }

  _buildMenuSummary(menuId) {
    const menus = this._getFromStorage("menus");
    const menuItems = this._getFromStorage("menu_items");
    const menu = menus.find((m) => m.id === menuId) || null;
    if (!menu) {
      return {
        menuId,
        menuName: "",
        description: "",
        servingCount: 0,
        totalRecipes: 0,
        courseCounts: {
          starter: 0,
          main: 0,
          side: 0,
          dessert: 0,
          drink: 0,
          other: 0
        }
      };
    }
    const items = menuItems.filter((mi) => mi.menu_id === menuId);
    const courseCounts = {
      starter: 0,
      main: 0,
      side: 0,
      dessert: 0,
      drink: 0,
      other: 0
    };
    for (const item of items) {
      const ct = item.course_type || "other";
      if (courseCounts.hasOwnProperty(ct)) {
        courseCounts[ct] += 1;
      } else {
        courseCounts.other += 1;
      }
    }
    return {
      menuId: menu.id,
      menuName: menu.name,
      description: menu.description || "",
      servingCount: menu.serving_count || 0,
      totalRecipes: items.length,
      courseCounts
    };
  }

  _findCityById(cityId) {
    if (!cityId) return null;
    const cities = this._getFromStorage("cities");
    return cities.find((c) => c.id === cityId) || null;
  }

  _findNeighborhoodById(neighborhoodId) {
    if (!neighborhoodId) return null;
    const neighborhoods = this._getFromStorage("neighborhoods");
    return neighborhoods.find((n) => n.id === neighborhoodId) || null;
  }

  _findPlaceById(placeId) {
    if (!placeId) return null;
    const places = this._getFromStorage("places");
    return places.find((p) => p.id === placeId) || null;
  }

  _findAccessibilityFeaturesByIds(ids) {
    if (!ids || !ids.length) return [];
    const all = this._getFromStorage("accessibility_features");
    return all.filter((f) => ids.indexOf(f.id) !== -1);
  }

  _findDietaryOptionsByIds(ids) {
    if (!ids || !ids.length) return [];
    const all = this._getFromStorage("dietary_options");
    return all.filter((d) => ids.indexOf(d.id) !== -1);
  }

  // ----------------------
  // Helper functions (from spec)
  // ----------------------

  _getOrCreateEventsListingViewPreference() {
    let prefs = this._getFromStorage("events_listing_view_preferences");
    if (!prefs.length) {
      const pref = {
        id: this._generateId("eventsview"),
        view: "events",
        updated_at: this._nowISO()
      };
      prefs.push(pref);
      this._saveToStorage("events_listing_view_preferences", prefs);
      return pref;
    }
    return prefs[0];
  }

  _getOrCreateMenuCollection() {
    const menus = this._getFromStorage("menus");
    const menuItems = this._getFromStorage("menu_items");
    return { menus, menuItems };
  }

  _getOrCreateReadingListStore() {
    const items = this._getFromStorage("reading_list_items");
    return items;
  }

  _getOrCreatePlaceFavoritesStore() {
    const items = this._getFromStorage("place_favorites");
    return items;
  }

  _getOrCreateNewsletterSubscriptionRecord() {
    let subs = this._getFromStorage("newsletter_subscriptions");
    if (!subs.length) {
      const sub = {
        id: this._generateId("newsletter"),
        email: "",
        topics: [],
        frequency: "monthly",
        city_id: null,
        accessibility_plain_text_only: false,
        status: "active",
        created_at: this._nowISO()
      };
      subs.push(sub);
      this._saveToStorage("newsletter_subscriptions", subs);
      return sub;
    }
    return subs[0];
  }

  _calculateDonationProcessingFee(amount, coverProcessingFees) {
    const options = this.getDonationOptions();
    const percent = options.defaultProcessingFeePercent || 0;
    if (!coverProcessingFees) {
      return {
        processingFeePercent: percent,
        totalChargedAmount: amount
      };
    }
    const total = Math.round(amount * (1 + percent) * 100) / 100;
    return {
      processingFeePercent: percent,
      totalChargedAmount: total
    };
  }

  // ----------------------
  // Home page interfaces
  // ----------------------

  getHomePageIntro() {
    return {
      missionHeading: "Inclusive gastronomy for everyone",
      missionBody:
        "We connect diners, community kitchens, and restaurants to create welcoming, accessible food experiences for people of all abilities.",
      keyPrograms: [
        {
          programId: "community_dinners",
          title: "Community Dinners",
          summary:
            "Pay-what-you-can community meals hosted in accessible spaces across the city.",
          primaryCtaLabel: "Explore events"
        },
        {
          programId: "inclusive_cooking_classes",
          title: "Inclusive Cooking Classes",
          summary:
            "Hands-on classes that center allergy-friendly, sensory-friendly, and adaptive cooking techniques.",
          primaryCtaLabel: "View workshops"
        },
        {
          programId: "dining_guide",
          title: "Inclusive Dining Guide",
          summary:
            "A curated directory of partner restaurants committed to accessibility and inclusive menus.",
          primaryCtaLabel: "Browse guide"
        }
      ],
      impactStats: [
        {
          label: "Shared meals",
          value: "1,000+",
          description: "Community meals served with sliding-scale pricing."
        },
        {
          label: "Partner venues",
          value: "40+",
          description: "Restaurants and community kitchens in our inclusive dining network."
        },
        {
          label: "Accessibility trainings",
          value: "120+",
          description: "Workshops delivered for hospitality teams and volunteers."
        }
      ]
    };
  }

  getHomePrimaryCTAs() {
    return [
      {
        ctaId: "events",
        title: "Attend an event",
        description: "Join a community dinner or inclusive cooking workshop this month.",
        targetPage: "events",
        primaryActionLabel: "Browse events"
      },
      {
        ctaId: "volunteer",
        title: "Volunteer in the kitchen",
        description: "Support community meals and inclusive cooking classes on-site.",
        targetPage: "volunteer",
        primaryActionLabel: "See shifts"
      },
      {
        ctaId: "donate",
        title: "Fuel inclusive cooking",
        description: "Help keep classes and community dinners affordable for everyone.",
        targetPage: "donate",
        primaryActionLabel: "Donate now"
      },
      {
        ctaId: "recipes",
        title: "Inclusive recipes",
        description: "Discover quick, allergy-friendly recipes for home cooking.",
        targetPage: "recipes",
        primaryActionLabel: "Browse recipes"
      },
      {
        ctaId: "dining_guide",
        title: "Inclusive Dining Guide",
        description: "Find partner restaurants with accessibility and dietary options.",
        targetPage: "dining_guide",
        primaryActionLabel: "Find a venue"
      }
    ];
  }

  // ----------------------
  // Newsletter interfaces
  // ----------------------

  getNewsletterSubscriptionOptions() {
    const cities = this._getFromStorage("cities");
    return {
      availableTopics: [
        { code: "inclusive_recipes", label: "Inclusive recipes" },
        { code: "accessibility_advocacy", label: "Accessibility advocacy" },
        { code: "local_events", label: "Local events" },
        { code: "fundraising_updates", label: "Fundraising updates" },
        { code: "organization_news", label: "Organization news" }
      ],
      frequencies: [
        { code: "monthly", label: "Monthly" },
        { code: "weekly", label: "Weekly" },
        { code: "biweekly", label: "Every two weeks" },
        { code: "quarterly", label: "Quarterly" }
      ],
      cities,
      defaultFrequency: "monthly"
    };
  }

  createOrUpdateNewsletterSubscription(email, topics, frequency, cityId, accessibilityPlainTextOnly) {
    let subs = this._getFromStorage("newsletter_subscriptions");
    let sub;
    if (subs.length) {
      sub = subs[0];
      sub.email = email;
      sub.topics = Array.isArray(topics) ? topics : [];
      sub.frequency = frequency;
      sub.city_id = cityId || null;
      sub.accessibility_plain_text_only = !!accessibilityPlainTextOnly;
      sub.status = "active";
    } else {
      sub = {
        id: this._generateId("newsletter"),
        email,
        topics: Array.isArray(topics) ? topics : [],
        frequency,
        city_id: cityId || null,
        accessibility_plain_text_only: !!accessibilityPlainTextOnly,
        status: "active",
        created_at: this._nowISO()
      };
      subs.push(sub);
    }
    this._saveToStorage("newsletter_subscriptions", subs);

    const city = this._findCityById(sub.city_id);

    return {
      success: true,
      subscription: {
        ...sub,
        city
      },
      message: "Newsletter subscription saved."
    };
  }

  // ----------------------
  // Events listing view preference
  // ----------------------

  getEventsListingViewPreference() {
    const pref = this._getOrCreateEventsListingViewPreference();
    return {
      view: pref.view,
      updatedAt: pref.updated_at
    };
  }

  setEventsListingViewPreference(view) {
    if (view !== "events" && view !== "workshops_trainings") {
      return { success: false, view: null };
    }
    let prefs = this._getFromStorage("events_listing_view_preferences");
    let pref;
    if (!prefs.length) {
      pref = {
        id: this._generateId("eventsview"),
        view,
        updated_at: this._nowISO()
      };
      prefs.push(pref);
    } else {
      pref = prefs[0];
      pref.view = view;
      pref.updated_at = this._nowISO();
    }
    this._saveToStorage("events_listing_view_preferences", prefs);
    return { success: true, view: pref.view };
  }

  // ----------------------
  // Events & Workshops
  // ----------------------

  getEventsFilterOptions(listingView) {
    const datePresets = [];
    const currentMonth = this._getCurrentMonthRange();
    datePresets.push({
      code: "current_month",
      label: "Current month",
      startDate: currentMonth.startDate,
      endDate: currentMonth.endDate
    });
    const next30 = this._getNext30DaysRange();
    datePresets.push({
      code: "next_30_days",
      label: "Next 30 days",
      startDate: next30.startDate,
      endDate: next30.endDate
    });
    const thisWeek = this._getThisWeekRange();
    datePresets.push({
      code: "this_week",
      label: "This week",
      startDate: thisWeek.startDate,
      endDate: thisWeek.endDate
    });

    const eventTypeOptions = [
      { value: "community_dinner", label: "Community dinner" },
      { value: "workshop_training", label: "Workshop or training" },
      { value: "fundraiser", label: "Fundraiser" },
      { value: "info_session", label: "Info session" },
      { value: "other", label: "Other" }
    ];

    const formatOptions = [
      { value: "in_person", label: "In person" },
      { value: "online", label: "Online" },
      { value: "hybrid", label: "Hybrid" }
    ];

    const costTypeOptions = [
      { value: "free", label: "Free" },
      { value: "paid", label: "Paid" },
      { value: "donation_based", label: "Donation-based" }
    ];

    const timeOfDayOptions = [
      {
        value: "morning",
        label: "Morning",
        description: "Roughly 5:00 am – 11:59 am"
      },
      {
        value: "afternoon",
        label: "Afternoon",
        description: "12:00 pm – 4:59 pm"
      },
      {
        value: "evening_after_5_pm",
        label: "Evening (after 5:00 pm)",
        description: "5:00 pm or later"
      },
      {
        value: "evening_after_6_pm",
        label: "Evening (after 6:00 pm)",
        description: "6:00 pm or later"
      }
    ];

    const events = this._getFromStorage("events");
    const relevantEvents = listingView
      ? events.filter((e) => e.listing_view_type === listingView)
      : events;
    let minPrice = null;
    let maxPrice = null;
    for (const ev of relevantEvents) {
      if (ev.cost_type !== "paid") continue;
      const pmin = ev.price_min != null ? ev.price_min : ev.price_max;
      const pmax = ev.price_max != null ? ev.price_max : ev.price_min;
      if (pmin != null) {
        if (minPrice == null || pmin < minPrice) minPrice = pmin;
      }
      if (pmax != null) {
        if (maxPrice == null || pmax > maxPrice) maxPrice = pmax;
      }
    }
    if (minPrice == null) minPrice = 0;
    if (maxPrice == null) maxPrice = 0;

    const accessibilityFeatures = this._getFromStorage("accessibility_features");
    const cities = this._getFromStorage("cities");
    const neighborhoods = this._getFromStorage("neighborhoods");

    const neighborhoodsByCity = cities.map((city) => {
      const nbs = neighborhoods
        .filter((n) => n.city_id === city.id)
        .map((n) => ({
          ...n,
          city: city
        }));
      return {
        cityId: city.id,
        neighborhoods: nbs
      };
    });

    return {
      datePresets,
      eventTypeOptions,
      formatOptions,
      costTypeOptions,
      timeOfDayOptions,
      priceRange: {
        minPrice,
        maxPrice,
        currency: "usd"
      },
      accessibilityFeatures,
      cities,
      neighborhoodsByCity
    };
  }

  searchEventsAndWorkshops(listingView, searchQuery, filters, sort) {
    const events = this._getFromStorage("events");
    const accessibilityFeatures = this._getFromStorage("accessibility_features");
    const cities = this._getFromStorage("cities");
    const neighborhoods = this._getFromStorage("neighborhoods");
    const places = this._getFromStorage("places");

    let list = events.filter((e) => e.listing_view_type === listingView);

    const q = (searchQuery || "").trim().toLowerCase();
    if (q) {
      list = list.filter((e) => {
        const title = (e.title || "").toLowerCase();
        const desc = (e.description || "").toLowerCase();
        return title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    filters = filters || {};

    // Date presets
    let startDate = filters.startDate || null;
    let endDate = filters.endDate || null;
    if (filters.datePreset === "current_month") {
      const r = this._getCurrentMonthRange();
      startDate = r.startDate;
      endDate = r.endDate;
    } else if (filters.datePreset === "next_30_days") {
      const r = this._getNext30DaysRange();
      startDate = r.startDate;
      endDate = r.endDate;
    }

    if (startDate || endDate) {
      list = list.filter((e) =>
        this._isDateInRange(e.start_datetime, startDate, endDate)
      );
    }

    if (filters.eventTypes && filters.eventTypes.length) {
      const set = new Set(filters.eventTypes);
      list = list.filter((e) => set.has(e.event_type));
    }

    if (filters.formats && filters.formats.length) {
      const set = new Set(filters.formats);
      list = list.filter((e) => set.has(e.format));
    }

    if (filters.costTypes && filters.costTypes.length) {
      const set = new Set(filters.costTypes);
      list = list.filter((e) => set.has(e.cost_type));
    }

    if (filters.accessibilityFeatureIds && filters.accessibilityFeatureIds.length) {
      const req = filters.accessibilityFeatureIds;
      list = list.filter((e) => {
        const ids = e.accessibility_feature_ids || [];
        return req.every((id) => ids.indexOf(id) !== -1);
      });
    }

    if (filters.timeOfDay) {
      list = list.filter((e) =>
        this._getTimeOfDayBucketMatch(e.start_datetime, filters.timeOfDay)
      );
    }

    if (filters.minPrice != null || filters.maxPrice != null) {
      const minP = filters.minPrice != null ? filters.minPrice : null;
      const maxP = filters.maxPrice != null ? filters.maxPrice : null;
      list = list.filter((e) => {
        if (e.cost_type === "free") {
          const price = 0;
          if (minP != null && price < minP) return false;
          if (maxP != null && price > maxP) return false;
          return true;
        }
        const pmin = e.price_min != null ? e.price_min : e.price_max;
        const pmax = e.price_max != null ? e.price_max : e.price_min;
        if (pmin == null && pmax == null) return false;
        const effMin = pmin != null ? pmin : pmax;
        const effMax = pmax != null ? pmax : pmin;
        if (minP != null && effMax < minP) return false;
        if (maxP != null && effMin > maxP) return false;
        return true;
      });
    }

    if (filters.cityId) {
      const cityId = filters.cityId;
      list = list.filter((e) => {
        if (e.city_id === cityId) return true;
        if (e.location_place_id) {
          const pl = places.find((p) => p.id === e.location_place_id);
          if (pl && pl.city_id === cityId) return true;
        }
        return false;
      });
    }

    if (filters.neighborhoodId) {
      const nbId = filters.neighborhoodId;
      list = list.filter((e) => {
        if (e.neighborhood_id === nbId) return true;
        if (e.location_place_id) {
          const pl = places.find((p) => p.id === e.location_place_id);
          if (pl && pl.neighborhood_id === nbId) return true;
        }
        return false;
      });
    }

    // Sorting
    const sortKey = sort || "date_soonest_first";
    list.sort((a, b) => {
      const da = this._parseDateTime(a.start_datetime) || new Date(0);
      const db = this._parseDateTime(b.start_datetime) || new Date(0);
      if (sortKey === "date_latest_first") {
        return db - da;
      }
      if (sortKey === "start_time_earliest_first") {
        return da - db;
      }
      if (sortKey === "price_low_to_high") {
        const ap = a.price_min != null ? a.price_min : a.price_max || 0;
        const bp = b.price_min != null ? b.price_min : b.price_max || 0;
        return ap - bp;
      }
      // default date_soonest_first
      return da - db;
    });

    const results = list.map((e) => {
      const place = e.location_place_id
        ? places.find((p) => p.id === e.location_place_id) || null
        : null;
      const cityId = e.city_id || (place && place.city_id) || null;
      const neighborhoodId = e.neighborhood_id || (place && place.neighborhood_id) || null;
      const city = cities.find((c) => c.id === cityId) || null;
      const neighborhood = neighborhoods.find((n) => n.id === neighborhoodId) || null;
      const accFeatures = this._findAccessibilityFeaturesByIds(
        e.accessibility_feature_ids || []
      );
      const accessibilityBadges = accFeatures.map((f) => f.name);

      const isOnline = e.format === "online";
      const costType = e.cost_type;
      const isFree = e.cost_type === "free";
      const card = {
        eventId: e.id,
        title: e.title,
        eventType: e.event_type,
        format: e.format,
        listingViewType: e.listing_view_type,
        startDatetime: e.start_datetime,
        endDatetime: e.end_datetime,
        timezone: e.timezone || null,
        locationName: e.location_name || (place ? place.name : null),
        cityName: city ? city.name : null,
        neighborhoodName: neighborhood ? neighborhood.name : null,
        isOnline,
        costType,
        isFree,
        priceMin: e.price_min || null,
        priceMax: e.price_max || null,
        currency: e.currency || "usd",
        accessibilityFeatureIds: e.accessibility_feature_ids || [],
        accessibilityBadges,
        tags: e.tags || [],
        capacityTotal: e.capacity_total || null,
        capacityRemaining: e.capacity_remaining || null,
        isFull: e.capacity_remaining != null ? e.capacity_remaining <= 0 : false,
        imageUrl: e.image_url || null,
        // Foreign key resolution for eventId
        event: {
          ...e,
          place,
          city,
          neighborhood
        }
      };
      return card;
    });

    return {
      results,
      totalCount: results.length,
      appliedSort: sortKey
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage("events");
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        place: null,
        city: null,
        neighborhood: null,
        accessibilityFeatures: [],
        costSummary: "",
        timeSummary: "",
        locationSummary: ""
      };
    }
    const place = this._findPlaceById(event.location_place_id);
    const cityId = event.city_id || (place && place.city_id) || null;
    const neighborhoodId = event.neighborhood_id || (place && place.neighborhood_id) || null;
    const city = this._findCityById(cityId);
    const neighborhood = this._findNeighborhoodById(neighborhoodId);
    const accessibilityFeatures = this._findAccessibilityFeaturesByIds(
      event.accessibility_feature_ids || []
    );
    const costSummary = this._formatCostSummary(event);
    const timeSummary = this._formatEventTimeSummary(event);
    const locationSummary = this._formatLocationSummary(event, place, city, neighborhood);

    const eventExtended = {
      ...event,
      place,
      city,
      neighborhood
    };

    return {
      event: eventExtended,
      place,
      city,
      neighborhood,
      accessibilityFeatures,
      costSummary,
      timeSummary,
      locationSummary
    };
  }

  registerForEvent(eventId, name, email, cityId, additionalNotes) {
    const events = this._getFromStorage("events");
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        registration: null,
        eventSummary: null,
        message: "Event not found."
      };
    }

    const regs = this._getFromStorage("event_registrations");
    const registration = {
      id: this._generateId("eventreg"),
      event_id: eventId,
      name,
      email,
      city_id: cityId || null,
      additional_notes: additionalNotes || "",
      created_at: this._nowISO()
    };
    regs.push(registration);
    this._saveToStorage("event_registrations", regs);

    const city = this._findCityById(registration.city_id);

    return {
      success: true,
      registration: {
        ...registration,
        event,
        city
      },
      eventSummary: event,
      message: "You are registered for this event."
    };
  }

  // ----------------------
  // Volunteer interfaces
  // ----------------------

  getVolunteerFilterOptions() {
    const roleTypeOptions = [
      { value: "on_site_kitchen_support", label: "On-site kitchen support" },
      { value: "event_support", label: "Event support" },
      { value: "administrative_support", label: "Administrative support" },
      { value: "outreach", label: "Outreach" },
      { value: "other", label: "Other" }
    ];

    const locations = this._getFromStorage("places");

    const daysOptions = [
      { value: "all_days", label: "All days" },
      { value: "weekdays", label: "Weekdays" },
      { value: "weekends", label: "Weekends" },
      { value: "saturday_and_sunday", label: "Saturday and Sunday" }
    ];

    const shiftLengthOptions = [
      { value: "under_3_hours", label: "Under 3 hours" },
      { value: "three_plus_hours", label: "3+ hours" },
      { value: "over_5_hours", label: "Over 5 hours" }
    ];

    const accessibilityFeatures = this._getFromStorage("accessibility_features");

    return {
      roleTypeOptions,
      locations,
      daysOptions,
      shiftLengthOptions,
      accessibilityFeatures
    };
  }

  searchVolunteerShifts(filters, sort) {
    const shifts = this._getFromStorage("volunteer_shifts");
    const places = this._getFromStorage("places");
    const accessibilityFeatures = this._getFromStorage("accessibility_features");

    filters = filters || {};
    let list = shifts.slice();

    if (filters.roleTypes && filters.roleTypes.length) {
      const set = new Set(filters.roleTypes);
      list = list.filter((s) => set.has(s.role_type));
    }

    if (filters.locationPlaceIds && filters.locationPlaceIds.length) {
      const set = new Set(filters.locationPlaceIds);
      list = list.filter((s) => set.has(s.location_place_id));
    }

    if (filters.daysFilter || filters.isWeekendOnly) {
      list = list.filter((s) => {
        const isWeekend = !!s.is_weekend;
        if (filters.isWeekendOnly && !isWeekend) return false;
        const df = filters.daysFilter;
        if (df === "weekends" || df === "saturday_and_sunday") {
          return isWeekend;
        }
        if (df === "weekdays") {
          return !isWeekend;
        }
        return true;
      });
    }

    if (filters.shiftLengthCategories && filters.shiftLengthCategories.length) {
      const set = new Set(filters.shiftLengthCategories);
      list = list.filter((s) => set.has(s.shift_length_category));
    }

    if (filters.startDate || filters.endDate) {
      const startDate = filters.startDate || null;
      const endDate = filters.endDate || null;
      list = list.filter((s) =>
        this._isDateInRange(s.start_datetime, startDate, endDate)
      );
    }

    if (filters.accessibilityFeatureIds && filters.accessibilityFeatureIds.length) {
      const req = filters.accessibilityFeatureIds;
      list = list.filter((s) => {
        const ids = s.accessibility_feature_ids || [];
        return req.every((id) => ids.indexOf(id) !== -1);
      });
    }

    const sortKey = sort || "date_soonest_first";
    list.sort((a, b) => {
      const da = this._parseDateTime(a.start_datetime) || new Date(0);
      const db = this._parseDateTime(b.start_datetime) || new Date(0);
      if (sortKey === "start_time_earliest_first") return da - db;
      // default date_soonest_first
      return da - db;
    });

    const results = list.map((s) => {
      const place = places.find((p) => p.id === s.location_place_id) || null;
      const accFeats = this._findAccessibilityFeaturesByIds(
        s.accessibility_feature_ids || []
      );
      const accessibilityBadges = accFeats.map((f) => f.name);
      return {
        shiftId: s.id,
        title: s.title,
        roleType: s.role_type,
        locationName: place ? place.name : null,
        placeId: s.location_place_id,
        startDatetime: s.start_datetime,
        endDatetime: s.end_datetime,
        timezone: s.timezone || null,
        durationHours: s.duration_hours || null,
        isWeekend: !!s.is_weekend,
        shiftLengthCategory: s.shift_length_category || null,
        accessibilityBadges,
        capacityTotal: s.capacity_total || null,
        capacityRemaining: s.capacity_remaining || null,
        isFull: s.capacity_remaining != null ? s.capacity_remaining <= 0 : false,
        // foreign key resolution for placeId & shiftId
        place,
        shift: s
      };
    });

    return {
      results,
      totalCount: results.length,
      appliedSort: sortKey
    };
  }

  getVolunteerShiftDetail(shiftId) {
    const shifts = this._getFromStorage("volunteer_shifts");
    const shift = shifts.find((s) => s.id === shiftId) || null;
    if (!shift) {
      return {
        shift: null,
        place: null,
        accessibilityFeatures: [],
        timeSummary: "",
        arrivalInstructions: "",
        contactPerson: ""
      };
    }
    const place = this._findPlaceById(shift.location_place_id);
    const accessibilityFeatures = this._findAccessibilityFeaturesByIds(
      shift.accessibility_feature_ids || []
    );
    const timeSummary = this._formatEventTimeSummary({
      start_datetime: shift.start_datetime,
      end_datetime: shift.end_datetime
    });
    const arrivalInstructions =
      "Please arrive 10 minutes early and check in with the kitchen lead.";
    const contactPerson = "Volunteer coordinator";

    return {
      shift,
      place,
      accessibilityFeatures,
      timeSummary,
      arrivalInstructions,
      contactPerson
    };
  }

  signupForVolunteerShift(shiftId, name, email, additionalNotes) {
    const shifts = this._getFromStorage("volunteer_shifts");
    const shift = shifts.find((s) => s.id === shiftId) || null;
    if (!shift) {
      return {
        success: false,
        signup: null,
        shiftSummary: null,
        message: "Shift not found."
      };
    }

    const signups = this._getFromStorage("volunteer_shift_signups");
    const signup = {
      id: this._generateId("volshift"),
      shift_id: shiftId,
      name,
      email,
      additional_notes: additionalNotes || "",
      created_at: this._nowISO()
    };
    signups.push(signup);
    this._saveToStorage("volunteer_shift_signups", signups);

    // Optionally adjust remaining capacity
    if (typeof shift.capacity_remaining === "number" && shift.capacity_remaining > 0) {
      shift.capacity_remaining -= 1;
      this._saveToStorage("volunteer_shifts", shifts);
    }

    return {
      success: true,
      signup: {
        ...signup,
        shift
      },
      shiftSummary: shift,
      message: "You are signed up for this shift."
    };
  }

  // ----------------------
  // Recipes & Menus
  // ----------------------

  getRecipeFilterOptions() {
    const recipes = this._getFromStorage("recipes");

    const servingsOptions = [
      { value: "serves_1_2", label: "Serves 1–2", minServings: 1 },
      { value: "serves_3_4", label: "Serves 3–4", minServings: 3 },
      { value: "serves_4_plus", label: "Serves 4+", minServings: 4 },
      { value: "serves_6_plus", label: "Serves 6+", minServings: 6 }
    ];

    const dietaryTagOptions = [
      { code: "gluten_free", label: "Gluten-free" },
      { code: "vegan", label: "Vegan" },
      { code: "vegetarian", label: "Vegetarian" },
      { code: "dairy_free", label: "Dairy-free" },
      { code: "nut_free", label: "Nut-free" },
      { code: "allergy_friendly", label: "Allergy-friendly" }
    ];

    const difficultyOptions = [
      { value: "easy", label: "Easy" },
      { value: "medium", label: "Medium" },
      { value: "hard", label: "Hard" }
    ];

    const cuisineSet = new Set();
    for (const r of recipes) {
      if (r.cuisine) cuisineSet.add(r.cuisine);
    }
    const cuisineOptions = Array.from(cuisineSet);

    return {
      maxCookingTimeDefault: 60,
      servingsOptions,
      dietaryTagOptions,
      cuisineOptions,
      difficultyOptions
    };
  }

  searchRecipes(query, filters, sort) {
    const recipes = this._getFromStorage("recipes");
    const menuItems = this._getFromStorage("menu_items");

    const q = (query || "").trim().toLowerCase();
    filters = filters || {};

    let list = recipes.slice();

    if (q) {
      list = list.filter((r) => {
        const t = (r.title || "").toLowerCase();
        const d = (r.description || "").toLowerCase();
        return t.indexOf(q) !== -1 || d.indexOf(q) !== -1;
      });
    }

    if (filters.maxCookingTimeMinutes != null) {
      const maxT = filters.maxCookingTimeMinutes;
      list = list.filter((r) => r.cooking_time_minutes <= maxT);
    }

    if (filters.minServings != null) {
      const minS = filters.minServings;
      list = list.filter((r) => r.servings >= minS);
    }

    if (filters.servesCategories && filters.servesCategories.length) {
      const set = new Set(filters.servesCategories);
      list = list.filter((r) => set.has(r.serves_category));
    }

    if (filters.dietaryTags && filters.dietaryTags.length) {
      const req = filters.dietaryTags;
      list = list.filter((r) => {
        const tags = r.dietary_tags || [];
        return req.every((t) => tags.indexOf(t) !== -1);
      });
    }

    if (filters.cuisine) {
      list = list.filter((r) => r.cuisine === filters.cuisine);
    }

    if (filters.difficulty) {
      list = list.filter((r) => r.difficulty === filters.difficulty);
    }

    if (filters.isQuick) {
      list = list.filter((r) => !!r.is_quick);
    }

    const sortKey = sort || "relevance";
    if (sortKey === "cooking_time_asc") {
      list.sort((a, b) => (a.cooking_time_minutes || 0) - (b.cooking_time_minutes || 0));
    } else if (sortKey === "created_at_desc") {
      list.sort((a, b) => {
        const da = this._parseDateTime(a.created_at) || new Date(0);
        const db = this._parseDateTime(b.created_at) || new Date(0);
        return db - da;
      });
    }

    const results = list.map((r) => {
      const inMenusCount = menuItems.filter((mi) => mi.recipe_id === r.id).length;
      return {
        recipeId: r.id,
        title: r.title,
        description: r.description || "",
        imageUrl: r.image_url || null,
        cookingTimeMinutes: r.cooking_time_minutes,
        servings: r.servings,
        servesCategory: r.serves_category || null,
        dietaryTags: r.dietary_tags || [],
        isQuick: !!r.is_quick,
        inMenusCount,
        isInCurrentMenu: false,
        recipe: r
      };
    });

    return {
      results,
      totalCount: results.length
    };
  }

  getRecipeDetail(recipeId) {
    const recipes = this._getFromStorage("recipes");
    const recipe = recipes.find((r) => r.id === recipeId) || null;
    if (!recipe) {
      return {
        recipe: null,
        dietaryTagsExpanded: [],
        menusContaining: [],
        accessibilityTips: []
      };
    }

    const dietaryTagLabels = {
      gluten_free: "Gluten-free",
      vegan: "Vegan",
      vegetarian: "Vegetarian",
      dairy_free: "Dairy-free",
      nut_free: "Nut-free",
      allergy_friendly: "Allergy-friendly"
    };

    const dietaryTagsExpanded = (recipe.dietary_tags || []).map((code) => ({
      code,
      label: dietaryTagLabels[code] || code
    }));

    const menus = this._getFromStorage("menus");
    const menuItems = this._getFromStorage("menu_items");
    const containing = menuItems.filter((mi) => mi.recipe_id === recipeId);
    const menusContaining = containing
      .map((mi) => menus.find((m) => m.id === mi.menu_id))
      .filter((m) => !!m)
      .map((m) => ({ menuId: m.id, menuName: m.name }));

    const accessibilityTips = [
      "Offer ingredient substitutions for common allergens when serving this recipe.",
      "Provide a large-print or digital version of the recipe for guests with low vision.",
      "Invite guests to share any sensory or texture preferences before cooking."
    ];

    return {
      recipe,
      dietaryTagsExpanded,
      menusContaining,
      accessibilityTips
    };
  }

  getUserMenusList() {
    const menus = this._getFromStorage("menus");
    return menus;
  }

  createMenu(name, description, occasion, servingCount) {
    const menus = this._getFromStorage("menus");
    const menu = {
      id: this._generateId("menu"),
      name,
      description: description || "",
      occasion: occasion || "",
      serving_count: servingCount != null ? servingCount : 0,
      created_at: this._nowISO()
    };
    menus.push(menu);
    this._saveToStorage("menus", menus);

    return {
      success: true,
      menu,
      message: "Menu created."
    };
  }

  addRecipeToMenu(menuId, recipeId, courseType, notes) {
    const menus = this._getFromStorage("menus");
    const recipes = this._getFromStorage("recipes");
    const menuItems = this._getFromStorage("menu_items");

    const menu = menus.find((m) => m.id === menuId) || null;
    const recipe = recipes.find((r) => r.id === recipeId) || null;
    if (!menu || !recipe) {
      return {
        success: false,
        menuItem: null,
        menuSummary: null,
        message: "Menu or recipe not found."
      };
    }

    const menuItem = {
      id: this._generateId("menuitem"),
      menu_id: menuId,
      recipe_id: recipeId,
      course_type: courseType || "other",
      notes: notes || "",
      added_at: this._nowISO()
    };
    menuItems.push(menuItem);
    this._saveToStorage("menu_items", menuItems);

    const menuSummary = this._buildMenuSummary(menuId);

    return {
      success: true,
      menuItem: {
        ...menuItem,
        menu,
        recipe
      },
      menuSummary: {
        ...menuSummary,
        menu
      },
      message: "Recipe added to menu."
    };
  }

  getMenuSummary(menuId) {
    const menus = this._getFromStorage("menus");
    const menu = menus.find((m) => m.id === menuId) || null;
    const summary = this._buildMenuSummary(menuId);
    return {
      ...summary,
      menu
    };
  }

  // ----------------------
  // Dining Guide (Places)
  // ----------------------

  getDiningGuideFilterOptions() {
    const cities = this._getFromStorage("cities");
    const neighborhoods = this._getFromStorage("neighborhoods");
    const accessibilityFeatures = this._getFromStorage("accessibility_features");
    const dietaryOptions = this._getFromStorage("dietary_options");
    const places = this._getFromStorage("places");

    // Price range
    let minPrice = null;
    let maxPrice = null;
    for (const p of places) {
      if (p.average_main_dish_price != null) {
        if (minPrice == null || p.average_main_dish_price < minPrice) {
          minPrice = p.average_main_dish_price;
        }
        if (maxPrice == null || p.average_main_dish_price > maxPrice) {
          maxPrice = p.average_main_dish_price;
        }
      }
    }
    if (minPrice == null) minPrice = 0;
    if (maxPrice == null) maxPrice = 0;

    const neighborhoodsByCity = cities.map((city) => {
      const nbs = neighborhoods
        .filter((n) => n.city_id === city.id)
        .map((n) => ({ ...n, city }));
      return {
        cityId: city.id,
        neighborhoods: nbs
      };
    });

    const groupSizeOptions = [
      { code: "two_to_four", label: "2–4 people", min: 2, max: 4 },
      { code: "five_to_seven", label: "5–7 people", min: 5, max: 7 },
      { code: "eight_to_ten_people", label: "8–10 people", min: 8, max: 10 },
      { code: "more_than_ten", label: "More than 10", min: 11, max: 99 }
    ];

    const transitOptions = [
      {
        code: "within_500m_accessible_transit",
        label: "Within 500m of accessible public transit"
      }
    ];

    const placeTypeOptions = [
      { value: "restaurant", label: "Restaurant" },
      { value: "cafe", label: "Café" },
      { value: "community_kitchen", label: "Community kitchen" },
      { value: "event_space", label: "Event space" },
      { value: "bar", label: "Bar" },
      { value: "food_truck", label: "Food truck" },
      { value: "other", label: "Other" }
    ];

    return {
      cities,
      neighborhoodsByCity,
      accessibilityFeatures,
      dietaryOptions,
      priceRange: {
        minAverageMainDishPrice: minPrice,
        maxAverageMainDishPrice: maxPrice,
        currency: "usd"
      },
      groupSizeOptions,
      transitOptions,
      placeTypeOptions
    };
  }

  searchPlaces(filters, sort) {
    const places = this._getFromStorage("places");
    const accessibilityFeatures = this._getFromStorage("accessibility_features");
    const dietaryOptions = this._getFromStorage("dietary_options");
    const cities = this._getFromStorage("cities");
    const neighborhoods = this._getFromStorage("neighborhoods");
    const favorites = this._getFromStorage("place_favorites");

    filters = filters || {};
    let list = places.slice();

    if (filters.cityId) {
      const cityId = filters.cityId;
      list = list.filter((p) => p.city_id === cityId);
    }

    if (filters.neighborhoodId) {
      const nbId = filters.neighborhoodId;
      list = list.filter((p) => p.neighborhood_id === nbId);
    }

    if (filters.accessibilityFeatureIds && filters.accessibilityFeatureIds.length) {
      const req = filters.accessibilityFeatureIds;
      list = list.filter((p) => {
        const ids = p.accessibility_feature_ids || [];
        return req.every((id) => ids.indexOf(id) !== -1);
      });
    }

    if (filters.dietaryOptionIds && filters.dietaryOptionIds.length) {
      const req = filters.dietaryOptionIds;
      list = list.filter((p) => {
        const ids = p.dietary_option_ids || [];
        return req.every((id) => ids.indexOf(id) !== -1);
      });
    }

    if (filters.hasBrailleMenu) {
      const brailleFeature = accessibilityFeatures.find(
        (f) => f.code === "braille_menu"
      );
      list = list.filter((p) => {
        if (p.has_braille_menu) return true;
        if (brailleFeature) {
          const ids = p.accessibility_feature_ids || [];
          return ids.indexOf(brailleFeature.id) !== -1;
        }
        return false;
      });
    }

    if (filters.hasVeganOptions) {
      const veganDiet = dietaryOptions.find(
        (d) => d.code === "vegan_options_available"
      );
      list = list.filter((p) => {
        if (p.has_vegan_options) return true;
        if (veganDiet) {
          const ids = p.dietary_option_ids || [];
          return ids.indexOf(veganDiet.id) !== -1;
        }
        return false;
      });
    }

    if (filters.maxAverageMainDishPrice != null) {
      const maxP = filters.maxAverageMainDishPrice;
      list = list.filter((p) => {
        if (p.average_main_dish_price == null) return false;
        return p.average_main_dish_price <= maxP;
      });
    }

    if (filters.minGroupSize != null || filters.maxGroupSize != null) {
      const minG = filters.minGroupSize != null ? filters.minGroupSize : 0;
      const maxG = filters.maxGroupSize != null ? filters.maxGroupSize : 9999;
      list = list.filter((p) => {
        const minCap = p.group_capacity_min != null ? p.group_capacity_min : 0;
        const maxCap = p.group_capacity_max != null ? p.group_capacity_max : 9999;
        return minCap <= minG && maxCap >= maxG;
      });
    }

    if (filters.isWithin500mAccessibleTransit) {
      const transitFeature = accessibilityFeatures.find(
        (f) => f.code === "within_500m_accessible_public_transit"
      );
      list = list.filter((p) => {
        if (p.is_within_500m_accessible_transit) return true;
        if (transitFeature) {
          const ids = p.accessibility_feature_ids || [];
          return ids.indexOf(transitFeature.id) !== -1;
        }
        return false;
      });
    }

    if (filters.placeTypes && filters.placeTypes.length) {
      const set = new Set(filters.placeTypes);
      list = list.filter((p) => set.has(p.place_type));
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.trim().toLowerCase();
      list = list.filter((p) => {
        const n = (p.name || "").toLowerCase();
        const d = (p.description || "").toLowerCase();
        return n.indexOf(q) !== -1 || d.indexOf(q) !== -1;
      });
    }

    const sortKey = sort || "rating_high_to_low";
    list.sort((a, b) => {
      if (sortKey === "rating_high_to_low") {
        const ra = a.rating != null ? a.rating : 0;
        const rb = b.rating != null ? b.rating : 0;
        return rb - ra;
      }
      if (sortKey === "price_low_to_high") {
        const pa = a.average_main_dish_price != null ? a.average_main_dish_price : Infinity;
        const pb = b.average_main_dish_price != null ? b.average_main_dish_price : Infinity;
        return pa - pb;
      }
      if (sortKey === "name_a_to_z") {
        const na = (a.name || "").toLowerCase();
        const nb = (b.name || "").toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      }
      return 0;
    });

    const results = list.map((p) => {
      const city = cities.find((c) => c.id === p.city_id) || null;
      const neighborhood = neighborhoods.find((n) => n.id === p.neighborhood_id) || null;
      const accFeats = this._findAccessibilityFeaturesByIds(
        p.accessibility_feature_ids || []
      );
      const dietOpts = this._findDietaryOptionsByIds(p.dietary_option_ids || []);
      const isFavorited = favorites.some((f) => f.place_id === p.id);
      return {
        placeId: p.id,
        name: p.name,
        placeType: p.place_type,
        cityName: city ? city.name : null,
        neighborhoodName: neighborhood ? neighborhood.name : null,
        averageMainDishPrice: p.average_main_dish_price || null,
        currency: p.currency || "usd",
        priceLevel: p.price_level || null,
        rating: p.rating || null,
        ratingCount: p.rating_count || null,
        accessibilityBadges: accFeats.map((f) => f.name),
        dietaryBadges: dietOpts.map((d) => d.name),
        hasBrailleMenu: !!p.has_braille_menu,
        hasVeganOptions: !!p.has_vegan_options,
        isWithin500mAccessibleTransit: !!p.is_within_500m_accessible_transit,
        isFavorited,
        imageUrl: p.image_url || null,
        place: p
      };
    });

    return {
      results,
      totalCount: results.length,
      appliedSort: sortKey
    };
  }

  getPlaceDetail(placeId) {
    const places = this._getFromStorage("places");
    const place = places.find((p) => p.id === placeId) || null;
    if (!place) {
      return {
        place: null,
        city: null,
        neighborhood: null,
        accessibilityFeatures: [],
        dietaryOptions: [],
        isFavorited: false,
        transitInfo: {
          distanceToAccessibleTransitMeters: null,
          isWithin500mAccessibleTransit: false,
          notes: ""
        },
        parkingInfo: ""
      };
    }

    const city = this._findCityById(place.city_id);
    const neighborhood = this._findNeighborhoodById(place.neighborhood_id);
    const accessibilityFeatures = this._findAccessibilityFeaturesByIds(
      place.accessibility_feature_ids || []
    );
    const dietaryOptions = this._findDietaryOptionsByIds(place.dietary_option_ids || []);
    const favorites = this._getFromStorage("place_favorites");
    const isFavorited = favorites.some((f) => f.place_id === place.id);

    const transitInfo = {
      distanceToAccessibleTransitMeters:
        place.distance_to_accessible_transit_meters || null,
      isWithin500mAccessibleTransit: !!place.is_within_500m_accessible_transit,
      notes: place.is_within_500m_accessible_transit
        ? "Within 500m of an accessible transit stop."
        : "Contact venue for detailed transit information."
    };

    const parkingInfo = place.parking_info || "";

    return {
      place,
      city,
      neighborhood,
      accessibilityFeatures,
      dietaryOptions,
      isFavorited,
      transitInfo,
      parkingInfo
    };
  }

  setPlaceFavoriteStatus(placeId, isFavorite) {
    const places = this._getFromStorage("places");
    const place = places.find((p) => p.id === placeId) || null;
    if (!place) {
      return {
        success: false,
        isFavorite: false,
        favoriteEntry: null,
        message: "Place not found."
      };
    }

    let favorites = this._getOrCreatePlaceFavoritesStore();
    let favoriteEntry = null;

    if (isFavorite) {
      favoriteEntry = favorites.find((f) => f.place_id === placeId) || null;
      if (!favoriteEntry) {
        favoriteEntry = {
          id: this._generateId("placefav"),
          place_id: placeId,
          created_at: this._nowISO()
        };
        favorites.push(favoriteEntry);
      }
      this._saveToStorage("place_favorites", favorites);
      return {
        success: true,
        isFavorite: true,
        favoriteEntry: {
          ...favoriteEntry,
          place
        },
        message: "Place added to favorites."
      };
    } else {
      favorites = favorites.filter((f) => f.place_id !== placeId);
      this._saveToStorage("place_favorites", favorites);
      return {
        success: true,
        isFavorite: false,
        favoriteEntry: null,
        message: "Place removed from favorites."
      };
    }
  }

  submitVenueInquiry(placeId, subject, message, groupSize, preferredDateRange, preferredTimeRange) {
    const places = this._getFromStorage("places");
    const place = places.find((p) => p.id === placeId) || null;
    if (!place) {
      return {
        success: false,
        inquiry: null,
        message: "Place not found."
      };
    }

    const inquiries = this._getFromStorage("venue_inquiries");
    const inquiry = {
      id: this._generateId("venueinq"),
      place_id: placeId,
      subject,
      message,
      group_size: groupSize != null ? groupSize : null,
      preferred_date_range: preferredDateRange || "",
      preferred_time_range: preferredTimeRange || "",
      created_at: this._nowISO()
    };
    inquiries.push(inquiry);
    this._saveToStorage("venue_inquiries", inquiries);

    return {
      success: true,
      inquiry: {
        ...inquiry,
        place
      },
      message: "Your inquiry has been sent to the venue."
    };
  }

  // ----------------------
  // Donations
  // ----------------------

  getDonationOptions() {
    const funds = this._getFromStorage("donation_funds");
    const defaultAmountSuggestions = [10, 15, 25, 50];
    const minimumAmount = 1;
    const allowedDonationTypes = ["one_time", "monthly"];
    const paymentMethods = [
      "credit_card",
      "bank_transfer",
      "paypal",
      "cash",
      "check"
    ];

    const defaultProcessingFeePercent = 0.02; // 2%

    const communicationFrequencyOptions = [
      {
        code: "impact_updates_quarterly",
        label: "Impact updates – Quarterly",
        description: "A quarterly email with stories and outcomes from your support."
      },
      {
        code: "impact_updates_monthly",
        label: "Impact updates – Monthly",
        description: "A monthly snapshot of classes, events, and impact."
      },
      {
        code: "impact_updates_weekly",
        label: "Impact updates – Weekly",
        description: "Short weekly highlights from our programs."
      },
      {
        code: "none",
        label: "No regular updates",
        description: "You will still receive donation receipts."
      }
    ];

    return {
      funds,
      defaultAmountSuggestions,
      minimumAmount,
      allowedDonationTypes,
      paymentMethods,
      defaultProcessingFeePercent,
      communicationFrequencyOptions
    };
  }

  submitDonation(amount, donationType, fundId, paymentMethod, coverProcessingFees, communicationFrequency) {
    const funds = this._getFromStorage("donation_funds");
    const fund = funds.find((f) => f.id === fundId) || null;
    if (!fund) {
      return {
        success: false,
        donation: null,
        totalChargedAmount: 0,
        message: "Donation fund not found."
      };
    }

    const { processingFeePercent, totalChargedAmount } = this._calculateDonationProcessingFee(
      amount,
      !!coverProcessingFees
    );

    const donations = this._getFromStorage("donations");
    const donation = {
      id: this._generateId("donation"),
      amount,
      currency: "usd",
      donation_type: donationType,
      fund_id: fundId,
      payment_method: paymentMethod,
      cover_processing_fees: !!coverProcessingFees,
      processing_fee_percent: processingFeePercent,
      total_charged_amount: totalChargedAmount,
      status: "completed",
      communication_frequency: communicationFrequency || null,
      created_at: this._nowISO()
    };
    donations.push(donation);
    this._saveToStorage("donations", donations);

    return {
      success: true,
      donation: {
        ...donation,
        fund
      },
      totalChargedAmount,
      message: "Thank you for your donation."
    };
  }

  // ----------------------
  // Resources & Reading list
  // ----------------------

  getResourceFilterOptions() {
    const tagOptions = [
      { code: "visual_impairment", label: "Visual impairment" },
      { code: "sensory_friendly_dining", label: "Sensory-friendly dining" },
      { code: "sensory_friendly_environments", label: "Sensory-friendly environments" },
      { code: "mobility_access", label: "Mobility access" },
      { code: "deaf_hoh_access", label: "Deaf and hard-of-hearing access" },
      { code: "cognitive_access", label: "Cognitive access" },
      { code: "allergies", label: "Food allergies" },
      { code: "general", label: "General inclusion" }
    ];

    const contentTypeOptions = [
      { code: "article", label: "Article" },
      { code: "guide", label: "Guide" },
      { code: "checklist", label: "Checklist" },
      { code: "video", label: "Video" },
      { code: "toolkit", label: "Toolkit" }
    ];

    const audienceOptions = [
      { code: "diners", label: "Diners" },
      { code: "restaurant_staff", label: "Restaurant staff" },
      { code: "community_organizers", label: "Community organizers" },
      { code: "volunteers", label: "Volunteers" },
      { code: "donors", label: "Donors" },
      { code: "general_public", label: "General public" }
    ];

    return {
      tagOptions,
      contentTypeOptions,
      audienceOptions
    };
  }

  searchResourceArticles(query, filters, sort) {
    const articles = this._getFromStorage("resource_articles");
    const readingList = this._getOrCreateReadingListStore();

    const q = (query || "").trim().toLowerCase();
    filters = filters || {};

    let list = articles.slice();

    if (q) {
      list = list.filter((a) => {
        const t = (a.title || "").toLowerCase();
        const s = (a.summary || "").toLowerCase();
        return t.indexOf(q) !== -1 || s.indexOf(q) !== -1;
      });
    }

    if (filters.tags && filters.tags.length) {
      const req = filters.tags;
      list = list.filter((a) => {
        const tags = a.tags || [];
        return req.every((t) => tags.indexOf(t) !== -1);
      });
    }

    if (filters.primaryTopics && filters.primaryTopics.length) {
      const set = new Set(filters.primaryTopics);
      list = list.filter((a) => set.has(a.primary_topic));
    }

    if (filters.audiences && filters.audiences.length) {
      const set = new Set(filters.audiences);
      list = list.filter((a) => set.has(a.audience));
    }

    if (filters.contentTypes && filters.contentTypes.length) {
      const set = new Set(filters.contentTypes);
      list = list.filter((a) => set.has(a.content_type));
    }

    const sortKey = sort || "published_at_desc";
    list.sort((a, b) => {
      if (sortKey === "published_at_asc" || sortKey === "published_at_desc") {
        const da = this._parseDateTime(a.published_at) || new Date(0);
        const db = this._parseDateTime(b.published_at) || new Date(0);
        return sortKey === "published_at_desc" ? db - da : da - db;
      }
      if (sortKey === "title_a_to_z") {
        const ta = (a.title || "").toLowerCase();
        const tb = (b.title || "").toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      }
      return 0;
    });

    const results = list.map((a) => {
      const isSavedToReadingList = readingList.some((r) => r.article_id === a.id);
      return {
        articleId: a.id,
        title: a.title,
        summary: a.summary || "",
        imageUrl: a.image_url || null,
        primaryTopic: a.primary_topic || null,
        contentType: a.content_type || null,
        audience: a.audience || null,
        publishedAt: a.published_at || null,
        isSavedToReadingList,
        article: a
      };
    });

    return {
      results,
      totalCount: results.length
    };
  }

  getResourceArticleDetail(articleId) {
    const articles = this._getFromStorage("resource_articles");
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        isSavedToReadingList: false,
        relatedArticles: []
      };
    }

    const readingList = this._getOrCreateReadingListStore();
    const isSavedToReadingList = readingList.some((r) => r.article_id === articleId);

    const relatedArticles = articles
      .filter((a) => a.id !== articleId)
      .filter((a) => a.primary_topic === article.primary_topic)
      .slice(0, 3);

    return {
      article,
      isSavedToReadingList,
      relatedArticles
    };
  }

  setReadingListStatus(articleId, isSaved) {
    const articles = this._getFromStorage("resource_articles");
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        success: false,
        isSaved: false,
        readingListItem: null,
        message: "Article not found."
      };
    }

    let readingList = this._getOrCreateReadingListStore();
    let readingListItem = null;

    if (isSaved) {
      readingListItem = readingList.find((r) => r.article_id === articleId) || null;
      if (!readingListItem) {
        readingListItem = {
          id: this._generateId("reading"),
          article_id: articleId,
          added_at: this._nowISO()
        };
        readingList.push(readingListItem);
      }
      this._saveToStorage("reading_list_items", readingList);
      return {
        success: true,
        isSaved: true,
        readingListItem: {
          ...readingListItem,
          article
        },
        message: "Article saved to your reading list."
      };
    } else {
      readingList = readingList.filter((r) => r.article_id !== articleId);
      this._saveToStorage("reading_list_items", readingList);
      return {
        success: true,
        isSaved: false,
        readingListItem: null,
        message: "Article removed from your reading list."
      };
    }
  }

  getReadingListItems() {
    const items = this._getOrCreateReadingListStore();
    const articles = this._getFromStorage("resource_articles");
    return items.map((item) => ({
      ...item,
      article: articles.find((a) => a.id === item.article_id) || null
    }));
  }

  // ----------------------
  // Contact & static pages
  // ----------------------

  submitContactMessage(name, email, subject, message) {
    const messages = this._getFromStorage("contact_messages");
    const record = {
      id: this._generateId("contact"),
      name,
      email,
      subject,
      message,
      created_at: this._nowISO()
    };
    messages.push(record);
    this._saveToStorage("contact_messages", messages);

    return {
      success: true,
      messageRecord: record,
      confirmationMessage: "Thank you for contacting us. We will reply as soon as we can."
    };
  }

  getAboutPageContent() {
    return {
      missionHeading: "Our mission",
      missionBody:
        "We believe everyone deserves to share in the joy of food. We partner with community kitchens and restaurants to make gastronomy accessible, welcoming, and affirming for disabled diners and their communities.",
      visionHeading: "Our vision",
      visionBody:
        "A world where every table, kitchen, and dining room is designed with access, dignity, and cultural inclusion at the center.",
      values: [
        {
          title: "Access first",
          description:
            "We prioritize mobility, sensory, communication, and financial access in everything we design."
        },
        {
          title: "Co-creation",
          description:
            "Disabled diners, chefs, and community members lead our programs and decision-making."
        },
        {
          title: "Joyful food",
          description:
            "We center pleasure, culture, and celebration in shared meals and cooking experiences."
        }
      ],
      programSummaries: [
        {
          programId: "community_dinners",
          title: "Community dinners",
          description:
            "Sliding-scale evening meals featuring local chefs, access-informed menu design, and space for connection.",
          primaryCtaLabel: "Find a dinner"
        },
        {
          programId: "inclusive_cooking_classes",
          title: "Inclusive cooking classes",
          description:
            "Online and in-person classes focused on allergy-friendly, adaptive, and culturally rooted recipes.",
          primaryCtaLabel: "See upcoming classes"
        },
        {
          programId: "inclusive_dining_guide",
          title: "Inclusive Dining Guide",
          description:
            "A vetted network of restaurants and venues that commit to tangible accessibility and inclusion standards.",
          primaryCtaLabel: "Browse the guide"
        }
      ],
      impactStories: [
        {
          storyId: "story_1",
          title: "From isolation to weekly community dinners",
          summary:
            "How one neighbor found connection and confidence through our sliding-scale meals."
        },
        {
          storyId: "story_2",
          title: "A restaurant’s journey toward sensory-friendly service",
          summary:
            "How staff training and small changes transformed one dining room."
        }
      ],
      partners: []
    };
  }

  getAccessibilityStatementContent() {
    return {
      introduction:
        "We are committed to making our website, programs, and partner experiences accessible to as many people as possible.",
      standards:
        "Our goal is to meet or exceed WCAG 2.1 AA guidelines across our digital experiences.",
      knownLimitations:
        "Some partner venues and legacy PDFs may not yet meet our full accessibility standards. We are actively working with partners to improve this.",
      contactInstructions:
        "If you encounter an accessibility barrier or need an accommodation, please use our contact form or email access@inclusivegastronomy.org with details.",
      assistiveTechnologyCompatibility:
        "The site is designed to work with current versions of major screen readers, browser zoom up to 200%, and keyboard-only navigation.",
      recommendedSettings:
        "For the best experience, we recommend using an up-to-date browser, enabling reduced motion if needed, and opting into our plain-text newsletter option for screen readers."
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