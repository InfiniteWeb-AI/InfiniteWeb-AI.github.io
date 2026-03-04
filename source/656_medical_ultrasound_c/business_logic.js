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
    this.idCounter = this._getNextIdCounter();
  }

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Core domain tables (arrays)
    const tables = [
      "specialties",
      "consultation_types",
      "consultation_slots",
      "consultation_bookings",
      "courses",
      "cart",
      "cart_items",
      "webinars",
      "webinar_registrations",
      "articles",
      "bookmarks",
      "learning_modules",
      "learning_plans",
      "learning_plan_items",
      "mentors",
      "mentorship_packages",
      "mentor_availability_slots",
      "mentorship_bookings",
      "mentorship_session_bookings",
      "notification_settings",
      "institutional_plan_templates",
      "institutional_plan_configurations"
    ];

    // Keep compatibility with example fields if present, but don't rely on them
    const legacyTables = ["users", "products", "carts", "cartItems"];

    [...tables, ...legacyTables].forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
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
    return `${prefix}_${this._getNextIdCounter()}`;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // ----------------------
  // Private domain helpers
  // ----------------------

  // Cart helpers
  _getOrCreateCart() {
    let carts = this._getFromStorage("cart", []); // array of Cart
    let cart;
    if (carts.length > 0) {
      cart = carts[0];
    } else {
      cart = {
        id: this._generateId("cart"),
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage("cart", carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    const cartItems = this._getFromStorage("cart_items", []);
    const items = cartItems.filter((ci) => ci.cart_id === cartId);
    let subtotal = 0;
    let totalItems = 0;
    items.forEach((ci) => {
      subtotal += (ci.unit_price || 0) * (ci.quantity || 0);
      totalItems += ci.quantity || 0;
    });
    return { subtotal, totalItems };
  }

  _resolveCartItemsForResponse(cartId) {
    const cartItems = this._getFromStorage("cart_items", []);
    const items = cartItems.filter((ci) => ci.cart_id === cartId);
    const courses = this._getFromStorage("courses", []);
    const webinars = this._getFromStorage("webinars", []);
    const consultationTypes = this._getFromStorage("consultation_types", []);
    const mentorshipPackages = this._getFromStorage("mentorship_packages", []);
    const institutionalTemplates = this._getFromStorage("institutional_plan_templates", []);

    return items.map((ci) => {
      const line_subtotal = (ci.unit_price || 0) * (ci.quantity || 0);
      let course = null;
      let webinar = null;
      let consultation_type = null;
      let mentorship_package = null;
      let institutional_plan_template = null;

      if (ci.item_type === "course") {
        course = courses.find((c) => c.id === ci.item_id) || null;
      } else if (ci.item_type === "webinar") {
        webinar = webinars.find((w) => w.id === ci.item_id) || null;
      } else if (ci.item_type === "consultation") {
        consultation_type = consultationTypes.find((t) => t.id === ci.item_id) || null;
      } else if (ci.item_type === "mentorship_package") {
        mentorship_package = mentorshipPackages.find((p) => p.id === ci.item_id) || null;
      } else if (ci.item_type === "institutional_plan") {
        institutional_plan_template =
          institutionalTemplates.find((p) => p.id === ci.item_id) || null;
      }

      const base = {
        cart_item_id: ci.id,
        item_type: ci.item_type,
        item_id: ci.item_id,
        title_snapshot: ci.title_snapshot,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal
      };

      if (ci.item_type === "course") {
        return { ...base, course_id: ci.item_id, course };
      }
      if (ci.item_type === "webinar") {
        return { ...base, webinar_id: ci.item_id, webinar };
      }
      if (ci.item_type === "consultation") {
        return { ...base, consultation_type_id: ci.item_id, consultation_type };
      }
      if (ci.item_type === "mentorship_package") {
        return { ...base, mentorship_package_id: ci.item_id, mentorship_package };
      }
      if (ci.item_type === "institutional_plan") {
        return {
          ...base,
          institutional_plan_template_id: ci.item_id,
          institutional_plan_template
        };
      }
      return base;
    });
  }

  // Course filter/sort helper
  _filterAndSortCourses(courses, filters, sort_by) {
    let results = courses.slice();

    if (filters) {
      if (filters.specialty_key) {
        results = results.filter((c) => c.specialty_key === filters.specialty_key);
      }
      if (filters.level) {
        results = results.filter((c) => c.level === filters.level);
      }
      if (typeof filters.max_price === "number") {
        results = results.filter((c) => c.price <= filters.max_price);
      }
      if (typeof filters.min_rating === "number") {
        results = results.filter((c) => c.rating_average >= filters.min_rating);
      }
      if (typeof filters.min_cme_credits === "number") {
        results = results.filter(
          (c) => typeof c.cme_credits === "number" && c.cme_credits >= filters.min_cme_credits
        );
      }
    }

    if (sort_by === "price_asc") {
      results.sort((a, b) => a.price - b.price);
    } else if (sort_by === "price_desc") {
      results.sort((a, b) => b.price - a.price);
    } else if (sort_by === "duration_desc") {
      results.sort((a, b) => b.duration_minutes - a.duration_minutes);
    } else if (sort_by === "rating_desc") {
      results.sort((a, b) => b.rating_average - a.rating_average);
    }

    return results;
  }

  // Webinar filter/sort helper
  _filterAndSortWebinars(webinars, filters) {
    let results = webinars.slice();

    if (filters) {
      if (filters.topic_specialty_key) {
        results = results.filter(
          (w) => w.topic_specialty_key === filters.topic_specialty_key
        );
      }

      // date_range_key or custom dates
      const now = new Date();
      if (filters.date_range_key && filters.date_range_key !== "custom") {
        let startDate = null;
        let endDate = null;
        const year = now.getFullYear();
        const month = now.getMonth();

        if (filters.date_range_key === "this_month") {
          startDate = new Date(year, month, 1);
          endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
        } else if (filters.date_range_key === "next_month") {
          const nm = month + 1;
          startDate = new Date(year, nm, 1);
          endDate = new Date(year, nm + 1, 0, 23, 59, 59, 999);
        }

        if (startDate && endDate) {
          results = results.filter((w) => {
            const d = new Date(w.start_datetime);
            return d >= startDate && d <= endDate;
          });
        }
      } else if (filters.start_date && filters.end_date) {
        const start = new Date(filters.start_date);
        const end = new Date(filters.end_date);
        results = results.filter((w) => {
          const d = new Date(w.start_datetime);
          return d >= start && d <= end;
        });
      }

      if (filters.time_of_day && filters.time_of_day !== "any") {
        results = results.filter((w) => {
          const d = new Date(w.start_datetime);
          const hour = d.getUTCHours();
          if (filters.time_of_day === "morning") return hour < 12;
          if (filters.time_of_day === "afternoon") return hour >= 12 && hour < 18;
          if (filters.time_of_day === "evening") return hour >= 18;
          return true;
        });
      }

      if (typeof filters.min_cme_credits === "number") {
        results = results.filter((w) => w.cme_credits >= filters.min_cme_credits);
      }

      if (filters.webinar_type) {
        results = results.filter((w) => w.webinar_type === filters.webinar_type);
      }

      if (filters.registration_open_only) {
        results = results.filter((w) => w.is_registration_open);
      }
    }

    // default sort by start_datetime ascending
    results.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
    return results;
  }

  // Article filter helper
  _filterArticlesByDateAndReadingTime(articles, filters) {
    let results = articles.slice();
    if (!filters) return results;

    // Date range
    if (filters.date_range_key && filters.date_range_key !== "custom") {
      const now = new Date();
      let from = null;
      if (filters.date_range_key === "last_6_months") {
        from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      } else if (filters.date_range_key === "last_2_years") {
        from = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
      }
      if (from) {
        results = results.filter((a) => new Date(a.publication_date) >= from);
      }
    } else if (filters.start_date && filters.end_date) {
      const start = new Date(filters.start_date);
      const end = new Date(filters.end_date);
      results = results.filter((a) => {
        const d = new Date(a.publication_date);
        return d >= start && d <= end;
      });
    }

    // Reading time
    if (typeof filters.min_reading_time_minutes === "number") {
      results = results.filter(
        (a) => a.reading_time_minutes >= filters.min_reading_time_minutes
      );
    }
    if (typeof filters.max_reading_time_minutes === "number") {
      results = results.filter(
        (a) => a.reading_time_minutes <= filters.max_reading_time_minutes
      );
    }

    return results;
  }

  // Learning plan duration helper
  _calculateLearningPlanTotalDuration(items) {
    const courses = this._getFromStorage("courses", []);
    const modules = this._getFromStorage("learning_modules", []);
    let total = 0;
    (items || []).forEach((it) => {
      if (!it || !it.item_type || !it.item_id) return;
      if (it.item_type === "course") {
        const c = courses.find((c) => c.id === it.item_id);
        if (c) total += c.duration_minutes || 0;
      } else if (it.item_type === "learning_module") {
        const m = modules.find((m) => m.id === it.item_id);
        if (m) total += m.duration_minutes || 0;
      }
    });
    return total;
  }

  // Institutional pricing helper
  _calculateInstitutionalPlanPricing(template, num_learners, selected_specialty_keys) {
    if (!template) return 0;
    let price = template.base_price_annual || 0;
    if (typeof template.price_per_learner === "number") {
      price += template.price_per_learner * num_learners;
    }

    // Optionally adjust by number of selected specialties vs included_specialty_keys
    if (
      Array.isArray(selected_specialty_keys) &&
      Array.isArray(template.included_specialty_keys) &&
      template.included_specialty_keys.length > 0
    ) {
      const overlapCount = selected_specialty_keys.filter((k) =>
        template.included_specialty_keys.includes(k)
      ).length;
      const ratio = overlapCount / template.included_specialty_keys.length;
      if (ratio > 0 && ratio < 1) {
        price = price * ratio;
      }
    }

    return price;
  }

  // Mentorship slots validation helper
  _validateMentorshipSlotsAgainstPackage(pkg, slots) {
    if (!pkg) return false;
    if (!Array.isArray(slots)) return false;
    if (slots.length !== pkg.session_count) return false;

    const expectedDurationMs = (pkg.session_duration_minutes || 0) * 60000;
    for (const s of slots) {
      const start = new Date(s.start_datetime).getTime();
      const end = new Date(s.end_datetime).getTime();
      if (!s.is_available) return false;
      if (end - start !== expectedDurationMs) return false;
    }
    return true;
  }

  // Notification settings persistence helper
  _persistNotificationSettings(fields) {
    let settingsArr = this._getFromStorage("notification_settings", []);
    let settings = settingsArr[0];
    if (!settings) {
      settings = {
        id: this._generateId("notif_settings"),
        session_reminder_24h_enabled: true,
        session_reminder_1h_enabled: true,
        marketing_emails_enabled: true,
        course_progress_emails_enabled: true,
        webinar_notification_mode: "all_webinars",
        updated_at: this._nowIso()
      };
      settingsArr.push(settings);
    }

    settings = {
      ...settings,
      ...fields,
      updated_at: this._nowIso()
    };
    settingsArr[0] = settings;
    this._saveToStorage("notification_settings", settingsArr);
    return settings;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // 1. getHomePageContent
  getHomePageContent() {
    const specialties = this._getFromStorage("specialties", []);
    const consultationTypes = this._getFromStorage("consultation_types", []);
    const courses = this._getFromStorage("courses", []);
    const webinars = this._getFromStorage("webinars", []);
    const learningPlans = this._getFromStorage("learning_plans", []);
    const bookmarks = this._getFromStorage("bookmarks", []);
    const articles = this._getFromStorage("articles", []);

    const specialtyNameByKey = (key) => {
      const s = specialties.find((sp) => sp.key === key);
      return s ? s.name : "";
    };

    const nav_tiles = [
      {
        key: "consultations",
        label: "Consultations",
        description: "Book 1:1 ultrasound consultation sessions"
      },
      {
        key: "courses",
        label: "Courses",
        description: "On-demand ultrasound training courses"
      },
      {
        key: "webinars",
        label: "Webinars & Live Events",
        description: "Live and recorded ultrasound webinars"
      },
      {
        key: "resources",
        label: "Resources",
        description: "Articles, guides, and POCUS resources"
      },
      {
        key: "mentorship",
        label: "Mentorship",
        description: "1:1 ultrasound mentorship packages"
      },
      {
        key: "learning_paths",
        label: "Learning Paths",
        description: "Custom learning plans and progress"
      },
      {
        key: "institutional_plans",
        label: "For Institutions",
        description: "Group and institutional ultrasound training"
      }
    ];

    // Featured consultations: active, arbitrary top 5
    const activeConsultations = consultationTypes.filter((c) => c.is_active);
    const featured_consultations = activeConsultations.slice(0, 5).map((c) => ({
      consultation_type_id: c.id,
      consultation_type: c, // foreign key resolution
      name: c.name,
      specialty_key: c.specialty_key,
      specialty_name: specialtyNameByKey(c.specialty_key),
      duration_minutes: c.duration_minutes,
      base_price: c.base_price || 0
    }));

    // Featured courses: active, highest rating, top 5
    const activeCourses = courses.filter((c) => c.is_active);
    activeCourses.sort((a, b) => b.rating_average - a.rating_average);
    const featured_courses = activeCourses.slice(0, 5).map((c) => ({
      course_id: c.id,
      course: c, // foreign key resolution
      title: c.title,
      specialty_key: c.specialty_key,
      specialty_name: specialtyNameByKey(c.specialty_key),
      level: c.level,
      price: c.price,
      rating_average: c.rating_average,
      rating_count: c.rating_count,
      duration_minutes: c.duration_minutes
    }));

    // Upcoming webinars: future & registration_open, next few
    const now = new Date();
    const upcoming = webinars
      .filter((w) => new Date(w.start_datetime) >= now && w.is_registration_open)
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5)
      .map((w) => ({
        webinar_id: w.id,
        webinar: w, // foreign key resolution
        title: w.title,
        start_datetime: w.start_datetime,
        end_datetime: w.end_datetime,
        time_zone: w.time_zone,
        topic_specialty_key: w.topic_specialty_key,
        topic_specialty_name: specialtyNameByKey(w.topic_specialty_key),
        cme_credits: w.cme_credits,
        webinar_type: w.webinar_type,
        is_registration_open: w.is_registration_open
      }));

    // Active learning plans shortcuts
    const activeLearningPlans = learningPlans.filter((lp) => lp.is_active);
    const active_learning_plans = activeLearningPlans.map((lp) => ({
      learning_plan_id: lp.id,
      learning_plan: lp, // foreign key resolution
      title: lp.title,
      specialty_key: lp.specialty_key,
      specialty_name: specialtyNameByKey(lp.specialty_key),
      total_duration_minutes: lp.total_duration_minutes,
      completion_percent: 0 // no progress tracking stored; default 0
    }));

    // Recent bookmarked articles shortcuts
    const enrichedBookmarks = bookmarks
      .map((b) => {
        const article = articles.find((a) => a.id === b.article_id);
        if (!article) return null;
        return {
          article_id: article.id,
          article, // foreign key resolution
          title: article.title,
          publication_date: article.publication_date,
          reading_time_minutes: article.reading_time_minutes,
          saved_at: b.saved_at
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at))
      .slice(0, 5);

    return {
      nav_tiles,
      featured_consultations,
      featured_courses,
      upcoming_webinars: upcoming,
      learning_shortcuts: {
        active_learning_plans,
        recent_bookmarked_articles: enrichedBookmarks
      }
    };
  }

  // 2. Consultations
  getConsultationFilterOptions() {
    const specialties = this._getFromStorage("specialties", []);
    const consultationTypes = this._getFromStorage("consultation_types", []);

    const durationsMap = {};
    consultationTypes.forEach((c) => {
      if (!durationsMap[c.duration_minutes]) {
        durationsMap[c.duration_minutes] = {
          minutes: c.duration_minutes,
          label: `${c.duration_minutes} minutes`
        };
      }
    });

    const durations = Object.values(durationsMap);

    const payment_options = [
      "pay_on_invoice",
      "pay_now_card",
      "pay_now_paypal",
      "free",
      "other"
    ];

    return {
      specialties: specialties.map((s) => ({
        key: s.key,
        name: s.name,
        description: s.description || ""
      })),
      durations,
      payment_options
    };
  }

  searchConsultations(filters, sort_by) {
    const specialties = this._getFromStorage("specialties", []);
    let consultationTypes = this._getFromStorage("consultation_types", []);

    if (filters) {
      if (filters.specialty_key) {
        consultationTypes = consultationTypes.filter(
          (c) => c.specialty_key === filters.specialty_key
        );
      }
      if (typeof filters.duration_minutes === "number") {
        consultationTypes = consultationTypes.filter(
          (c) => c.duration_minutes === filters.duration_minutes
        );
      }
      if (filters.is_active_only) {
        consultationTypes = consultationTypes.filter((c) => c.is_active);
      }
    }

    if (sort_by === "price_asc") {
      consultationTypes.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    } else if (sort_by === "duration_desc") {
      consultationTypes.sort((a, b) => b.duration_minutes - a.duration_minutes);
    } else if (sort_by === "name_asc") {
      consultationTypes.sort((a, b) => a.name.localeCompare(b.name));
    }

    const specialtyNameByKey = (key) => {
      const s = specialties.find((sp) => sp.key === key);
      return s ? s.name : "";
    };

    const results = consultationTypes.map((c) => ({
      consultation_type_id: c.id,
      consultation_type: c, // foreign key resolution
      name: c.name,
      description: c.description || "",
      specialty_key: c.specialty_key,
      specialty_name: specialtyNameByKey(c.specialty_key),
      duration_minutes: c.duration_minutes,
      base_price: c.base_price || 0,
      allow_pay_on_invoice: !!c.allow_pay_on_invoice,
      location_type: c.location_type || null,
      is_active: !!c.is_active
    }));

    return { results, total_count: results.length };
  }

  getConsultationAvailability(consultation_type_id, month, year) {
    const consultationTypes = this._getFromStorage("consultation_types", []);
    const specialties = this._getFromStorage("specialties", []);
    const slots = this._getFromStorage("consultation_slots", []);

    const ct = consultationTypes.find((c) => c.id === consultation_type_id) || null;
    if (!ct) {
      return {
        consultation_type: null,
        month,
        year,
        slots: []
      };
    }

    const specialty = specialties.find((s) => s.key === ct.specialty_key) || null;

    const filteredSlots = slots
      .filter((s) => s.consultation_type_id === consultation_type_id)
      .filter((s) => {
        const d = new Date(s.start_datetime);
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      })
      .map((s) => ({
        consultation_slot_id: s.id,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        is_available: s.is_available
      }));

    return {
      consultation_type: {
        consultation_type_id: ct.id,
        consultation_type: ct, // foreign key resolution
        name: ct.name,
        specialty_key: ct.specialty_key,
        specialty_name: specialty ? specialty.name : "",
        duration_minutes: ct.duration_minutes,
        base_price: ct.base_price || 0
      },
      month,
      year,
      slots: filteredSlots
    };
  }

  createConsultationBooking(
    consultation_type_id,
    consultation_slot_id,
    full_name,
    email,
    profession,
    payment_option,
    notes
  ) {
    const consultationTypes = this._getFromStorage("consultation_types", []);
    const consultationSlots = this._getFromStorage("consultation_slots", []);
    const specialties = this._getFromStorage("specialties", []);
    const bookings = this._getFromStorage("consultation_bookings", []);

    const ct = consultationTypes.find((c) => c.id === consultation_type_id);
    if (!ct) {
      throw new Error("Consultation type not found");
    }

    const slotIndex = consultationSlots.findIndex((s) => s.id === consultation_slot_id);
    if (slotIndex === -1) {
      throw new Error("Consultation slot not found");
    }
    const slot = consultationSlots[slotIndex];
    if (!slot.is_available) {
      throw new Error("Consultation slot is not available");
    }

    const booking = {
      id: this._generateId("consultation_booking"),
      consultation_type_id,
      consultation_slot_id,
      full_name,
      email,
      profession,
      payment_option,
      status: "confirmed",
      created_at: this._nowIso(),
      notes: notes || ""
    };

    bookings.push(booking);
    this._saveToStorage("consultation_bookings", bookings);

    // Mark slot as unavailable
    consultationSlots[slotIndex] = {
      ...slot,
      is_available: false
    };
    this._saveToStorage("consultation_slots", consultationSlots);

    const specialty = specialties.find((s) => s.key === ct.specialty_key) || null;

    return {
      booking_id: booking.id,
      status: booking.status,
      confirmation_message: "Consultation booking confirmed.",
      consultation_summary: {
        consultation_type_name: ct.name,
        specialty_name: specialty ? specialty.name : "",
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        duration_minutes: ct.duration_minutes,
        payment_option: booking.payment_option
      }
    };
  }

  // 3. Courses & Cart
  getCourseFilterOptions() {
    const specialties = this._getFromStorage("specialties", []);

    const levels = [
      { key: "beginner", label: "Beginner" },
      { key: "intermediate", label: "Intermediate" },
      { key: "advanced", label: "Advanced" }
    ];

    const price_presets = [
      { max_price: 100, label: "Up to $100" },
      { max_price: 150, label: "Up to $150" },
      { max_price: 250, label: "Up to $250" },
      { max_price: 500, label: "Up to $500" }
    ];

    const rating_thresholds = [
      { min_rating: 3.5, label: "3.5 stars & up" },
      { min_rating: 4.0, label: "4.0 stars & up" },
      { min_rating: 4.5, label: "4.5 stars & up" }
    ];

    const sort_options = [
      { key: "price_asc", label: "Price: Low to High" },
      { key: "price_desc", label: "Price: High to Low" },
      { key: "duration_desc", label: "Duration: High to Low" },
      { key: "rating_desc", label: "Rating: High to Low" }
    ];

    return {
      specialties: specialties.map((s) => ({ key: s.key, name: s.name })),
      levels,
      price_presets,
      rating_thresholds,
      sort_options
    };
  }

  searchCourses(query, filters, sort_by) {
    const specialties = this._getFromStorage("specialties", []);
    const coursesRaw = this._getFromStorage("courses", []);
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);

    // Only active courses by default
    let courses = coursesRaw.filter((c) => c.is_active);

    // Text search
    if (query && typeof query === "string" && query.trim()) {
      const q = query.trim().toLowerCase();
      courses = courses.filter((c) => {
        return (
          (c.title && c.title.toLowerCase().includes(q)) ||
          (c.description && c.description.toLowerCase().includes(q))
        );
      });
    }

    courses = this._filterAndSortCourses(courses, filters, sort_by);

    const specialtyNameByKey = (key) => {
      const s = specialties.find((sp) => sp.key === key);
      return s ? s.name : "";
    };

    const courseIdsInCart = cartItems
      .filter((ci) => ci.cart_id === cart.id && ci.item_type === "course")
      .map((ci) => ci.item_id);

    const results = courses.map((c) => ({
      course_id: c.id,
      title: c.title,
      slug: c.slug,
      specialty_key: c.specialty_key,
      specialty_name: specialtyNameByKey(c.specialty_key),
      level: c.level,
      description: c.description || "",
      price: c.price,
      rating_average: c.rating_average,
      rating_count: c.rating_count,
      duration_minutes: c.duration_minutes,
      cme_credits: c.cme_credits || 0,
      is_active: c.is_active,
      is_in_cart: courseIdsInCart.includes(c.id)
    }));

    return { results, total_count: results.length };
  }

  getCourseDetails(course_id) {
    const specialties = this._getFromStorage("specialties", []);
    const courses = this._getFromStorage("courses", []);
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage("cart_items", []);

    const course = courses.find((c) => c.id === course_id) || null;
    if (!course) {
      return null;
    }

    const specialty = specialties.find((s) => s.key === course.specialty_key) || null;

    const is_in_cart = cartItems.some(
      (ci) => ci.cart_id === cart.id && ci.item_type === "course" && ci.item_id === course_id
    );

    // Related courses: same specialty, similar level, excluding self
    const related_courses = courses
      .filter((c) => c.id !== course.id && c.specialty_key === course.specialty_key)
      .slice(0, 5)
      .map((c) => ({
        course_id: c.id,
        title: c.title,
        specialty_key: c.specialty_key,
        level: c.level,
        price: c.price
      }));

    return {
      course_id: course.id,
      title: course.title,
      slug: course.slug,
      specialty_key: course.specialty_key,
      specialty_name: specialty ? specialty.name : "",
      level: course.level,
      description: course.description || "",
      syllabus_outline: "",
      price: course.price,
      rating_average: course.rating_average,
      rating_count: course.rating_count,
      duration_minutes: course.duration_minutes,
      cme_credits: course.cme_credits || 0,
      is_active: course.is_active,
      is_in_cart,
      related_courses
    };
  }

  addCourseToCart(course_id, quantity) {
    const qty = typeof quantity === "number" && quantity > 0 ? quantity : 1;

    const courses = this._getFromStorage("courses", []);
    const course = courses.find((c) => c.id === course_id && c.is_active);
    if (!course) {
      return {
        success: false,
        message: "Course not found or inactive.",
        cart: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage("cart_items", []);

    let cartItem = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.item_type === "course" && ci.item_id === course_id
    );

    if (cartItem) {
      cartItem.quantity += qty;
    } else {
      cartItem = {
        id: this._generateId("cart_item"),
        cart_id: cart.id,
        item_type: "course",
        item_id: course_id,
        quantity: qty,
        unit_price: course.price,
        title_snapshot: course.title,
        added_at: this._nowIso()
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage("cart_items", cartItems);

    const totals = this._recalculateCartTotals(cart.id);
    const itemsResponse = this._resolveCartItemsForResponse(cart.id);

    const cartResponse = {
      cart_id: cart.id,
      total_items: totals.totalItems,
      subtotal: totals.subtotal,
      items: itemsResponse
    };

    return {
      success: true,
      message: "Course added to cart.",
      cart: cartResponse
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const totals = this._recalculateCartTotals(cart.id);
    const items = this._resolveCartItemsForResponse(cart.id);

    return {
      cart_id: cart.id,
      items,
      total_items: totals.totalItems,
      subtotal: totals.subtotal
    };
  }

  updateCartItemQuantity(cart_item_id, quantity) {
    let cartItems = this._getFromStorage("cart_items", []);
    const idx = cartItems.findIndex((ci) => ci.id === cart_item_id);
    if (idx === -1) {
      return {
        success: false,
        message: "Cart item not found.",
        cart: null
      };
    }

    const cart = this._getOrCreateCart();

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItems[idx] = {
        ...cartItems[idx],
        quantity
      };
    }

    this._saveToStorage("cart_items", cartItems);
    const totals = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      message: "Cart updated.",
      cart: {
        cart_id: cart.id,
        total_items: totals.totalItems,
        subtotal: totals.subtotal
      }
    };
  }

  removeCartItem(cart_item_id) {
    let cartItems = this._getFromStorage("cart_items", []);
    const idx = cartItems.findIndex((ci) => ci.id === cart_item_id);
    if (idx === -1) {
      return {
        success: false,
        message: "Cart item not found.",
        cart: null
      };
    }

    const cart = this._getOrCreateCart();

    cartItems.splice(idx, 1);
    this._saveToStorage("cart_items", cartItems);

    const totals = this._recalculateCartTotals(cart.id);

    return {
      success: true,
      message: "Cart item removed.",
      cart: {
        cart_id: cart.id,
        total_items: totals.totalItems,
        subtotal: totals.subtotal
      }
    };
  }

  // 4. Webinars
  getWebinarFilterOptions() {
    const specialties = this._getFromStorage("specialties", []);

    const topics = specialties.map((s) => ({
      specialty_key: s.key,
      specialty_name: s.name
    }));

    const date_range_options = [
      { key: "this_month", label: "This Month" },
      { key: "next_month", label: "Next Month" },
      { key: "custom", label: "Custom Range" }
    ];

    const time_of_day_options = [
      { key: "any", label: "Any time" },
      { key: "morning", label: "Morning" },
      { key: "afternoon", label: "Afternoon" },
      { key: "evening", label: "Evening" }
    ];

    const cme_thresholds = [
      { min_cme_credits: 0, label: "Any CME" },
      { min_cme_credits: 1, label: "1+ CME" },
      { min_cme_credits: 2, label: "2+ CME" }
    ];

    const event_types = [
      { key: "live", label: "Live" },
      { key: "recorded", label: "Recorded" },
      { key: "hybrid", label: "Hybrid" }
    ];

    return {
      topics,
      date_range_options,
      time_of_day_options,
      cme_thresholds,
      event_types
    };
  }

  searchWebinars(filters) {
    const specialties = this._getFromStorage("specialties", []);
    const webinars = this._getFromStorage("webinars", []);

    const filtered = this._filterAndSortWebinars(webinars, filters || {});

    const specialtyNameByKey = (key) => {
      const s = specialties.find((sp) => sp.key === key);
      return s ? s.name : "";
    };

    const results = filtered.map((w) => ({
      webinar_id: w.id,
      title: w.title,
      description: w.description || "",
      start_datetime: w.start_datetime,
      end_datetime: w.end_datetime,
      time_zone: w.time_zone,
      topic_specialty_key: w.topic_specialty_key,
      topic_specialty_name: specialtyNameByKey(w.topic_specialty_key),
      cme_credits: w.cme_credits,
      webinar_type: w.webinar_type,
      is_registration_open: w.is_registration_open
    }));

    return { results, total_count: results.length };
  }

  getWebinarDetails(webinar_id) {
    const specialties = this._getFromStorage("specialties", []);
    const webinars = this._getFromStorage("webinars", []);

    const webinar = webinars.find((w) => w.id === webinar_id) || null;
    if (!webinar) return null;

    const specialty = specialties.find((s) => s.key === webinar.topic_specialty_key) || null;

    return {
      webinar_id: webinar.id,
      title: webinar.title,
      slug: webinar.slug,
      description: webinar.description || "",
      agenda: webinar.agenda || "",
      speaker: webinar.speaker || "",
      start_datetime: webinar.start_datetime,
      end_datetime: webinar.end_datetime,
      time_zone: webinar.time_zone,
      topic_specialty_key: webinar.topic_specialty_key,
      topic_specialty_name: specialty ? specialty.name : "",
      cme_credits: webinar.cme_credits,
      webinar_type: webinar.webinar_type,
      is_registration_open: webinar.is_registration_open,
      capacity: webinar.capacity || null
    };
  }

  registerForWebinar(webinar_id, full_name, email, profession) {
    const webinars = this._getFromStorage("webinars", []);
    const registrations = this._getFromStorage("webinar_registrations", []);

    const webinar = webinars.find((w) => w.id === webinar_id);
    if (!webinar) {
      throw new Error("Webinar not found");
    }
    if (!webinar.is_registration_open) {
      throw new Error("Registration is closed for this webinar");
    }

    const registration = {
      id: this._generateId("webinar_registration"),
      webinar_id,
      full_name,
      email,
      profession,
      status: "registered",
      registered_at: this._nowIso()
    };

    registrations.push(registration);
    this._saveToStorage("webinar_registrations", registrations);

    return {
      registration_id: registration.id,
      status: registration.status,
      confirmation_message: "Webinar registration completed.",
      webinar_summary: {
        title: webinar.title,
        start_datetime: webinar.start_datetime,
        end_datetime: webinar.end_datetime,
        time_zone: webinar.time_zone
      }
    };
  }

  // 5. Articles & Bookmarks
  getArticleFilterOptions() {
    const date_range_options = [
      { key: "last_6_months", label: "Last 6 months" },
      { key: "last_2_years", label: "Last 2 years" },
      { key: "all_time", label: "All time" }
    ];

    const reading_time_ranges = [
      { min_minutes: 0, max_minutes: 5, label: "0-5 minutes" },
      { min_minutes: 5, max_minutes: 10, label: "5-10 minutes" },
      { min_minutes: 10, max_minutes: 20, label: "10-20 minutes" },
      { min_minutes: 20, max_minutes: 9999, label: "20+ minutes" }
    ];

    return { date_range_options, reading_time_ranges };
  }

  searchArticles(query, filters) {
    const articlesRaw = this._getFromStorage("articles", []);
    const bookmarks = this._getFromStorage("bookmarks", []);
    let articles = articlesRaw.filter((a) => a.is_published);

    // Text search
    if (query && typeof query === "string" && query.trim()) {
      const q = query.trim().toLowerCase();
      articles = articles.filter((a) => {
        return (
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.summary && a.summary.toLowerCase().includes(q)) ||
          (a.content && a.content.toLowerCase().includes(q))
        );
      });
    }

    // Date and reading time filters
    articles = this._filterArticlesByDateAndReadingTime(articles, filters || {});

    const bookmarkedIds = bookmarks.map((b) => b.article_id);

    const results = articles.map((a) => ({
      article_id: a.id,
      title: a.title,
      slug: a.slug,
      summary: a.summary || "",
      publication_date: a.publication_date,
      reading_time_minutes: a.reading_time_minutes,
      is_bookmarked: bookmarkedIds.includes(a.id)
    }));

    return { results, total_count: results.length };
  }

  getArticleDetails(article_id) {
    const articles = this._getFromStorage("articles", []);
    const bookmarks = this._getFromStorage("bookmarks", []);

    const article = articles.find((a) => a.id === article_id) || null;
    if (!article) return null;

    const is_bookmarked = bookmarks.some((b) => b.article_id === article_id);

    // Related articles: share at least one topic
    let related_articles = [];
    if (Array.isArray(article.topics) && article.topics.length > 0) {
      related_articles = articles
        .filter((a) => a.id !== article.id)
        .filter((a) =>
          Array.isArray(a.topics) &&
          a.topics.some((t) => article.topics.includes(t))
        )
        .slice(0, 5)
        .map((a) => ({ article_id: a.id, title: a.title }));
    }

    return {
      article_id: article.id,
      title: article.title,
      slug: article.slug,
      summary: article.summary || "",
      content: article.content || "",
      publication_date: article.publication_date,
      reading_time_minutes: article.reading_time_minutes,
      topics: article.topics || [],
      is_bookmarked,
      related_articles
    };
  }

  bookmarkArticle(article_id) {
    const articles = this._getFromStorage("articles", []);
    const article = articles.find((a) => a.id === article_id);
    if (!article) {
      return {
        success: false,
        message: "Article not found.",
        saved_at: null
      };
    }

    let bookmarks = this._getFromStorage("bookmarks", []);
    const existing = bookmarks.find((b) => b.article_id === article_id);
    if (existing) {
      return {
        success: true,
        message: "Article already bookmarked.",
        saved_at: existing.saved_at
      };
    }

    const saved_at = this._nowIso();
    const bookmark = {
      id: this._generateId("bookmark"),
      article_id,
      saved_at
    };

    bookmarks.push(bookmark);
    this._saveToStorage("bookmarks", bookmarks);

    return {
      success: true,
      message: "Article bookmarked.",
      saved_at
    };
  }

  getBookmarkedArticles() {
    const bookmarks = this._getFromStorage("bookmarks", []);
    const articles = this._getFromStorage("articles", []);

    const list = bookmarks
      .map((b) => {
        const article = articles.find((a) => a.id === b.article_id);
        if (!article) return null;
        return {
          bookmark_id: b.id,
          article_id: article.id,
          article, // foreign key resolution
          title: article.title,
          publication_date: article.publication_date,
          reading_time_minutes: article.reading_time_minutes,
          saved_at: b.saved_at
        };
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.saved_at) - new Date(a.saved_at));

    return list;
  }

  // 6. Learning plans
  getLearningPlansList() {
    const specialties = this._getFromStorage("specialties", []);
    const plans = this._getFromStorage("learning_plans", []);

    const specialtyNameByKey = (key) => {
      const s = specialties.find((sp) => sp.key === key);
      return s ? s.name : "";
    };

    return plans.map((lp) => ({
      learning_plan_id: lp.id,
      title: lp.title,
      specialty_key: lp.specialty_key,
      specialty_name: specialtyNameByKey(lp.specialty_key),
      total_duration_minutes: lp.total_duration_minutes,
      completion_percent: 0,
      is_active: lp.is_active
    }));
  }

  getLearningPlanDetails(learning_plan_id) {
    const specialties = this._getFromStorage("specialties", []);
    const plans = this._getFromStorage("learning_plans", []);
    const planItems = this._getFromStorage("learning_plan_items", []);
    const courses = this._getFromStorage("courses", []);
    const modules = this._getFromStorage("learning_modules", []);

    const plan = plans.find((lp) => lp.id === learning_plan_id) || null;
    if (!plan) return null;

    const specialty = specialties.find((s) => s.key === plan.specialty_key) || null;

    const items = planItems
      .filter((it) => it.learning_plan_id === learning_plan_id)
      .sort((a, b) => a.order_index - b.order_index)
      .map((it) => {
        let course = null;
        let learning_module = null;
        if (it.item_type === "course") {
          course = courses.find((c) => c.id === it.item_id) || null;
        } else if (it.item_type === "learning_module") {
          learning_module = modules.find((m) => m.id === it.item_id) || null;
        }
        return {
          learning_plan_item_id: it.id,
          item_type: it.item_type,
          item_id: it.item_id,
          title_snapshot: it.title_snapshot,
          duration_minutes: it.duration_minutes,
          order_index: it.order_index,
          course,
          learning_module
        };
      });

    return {
      learning_plan_id: plan.id,
      title: plan.title,
      specialty_key: plan.specialty_key,
      specialty_name: specialty ? specialty.name : "",
      total_duration_minutes: plan.total_duration_minutes,
      is_active: plan.is_active,
      items
    };
  }

  getLearningPlanSpecialtyOptions() {
    const specialties = this._getFromStorage("specialties", []);
    return specialties.map((s) => ({
      specialty_key: s.key,
      specialty_name: s.name,
      description: s.description || ""
    }));
  }

  getSuggestedLearningItems(specialty_key) {
    const courses = this._getFromStorage("courses", []);
    const modules = this._getFromStorage("learning_modules", []);

    const moduleItems = modules
      .filter((m) => m.specialty_key === specialty_key)
      .map((m) => ({
        item_type: "learning_module",
        item_id: m.id,
        title: m.title,
        duration_minutes: m.duration_minutes,
        difficulty_level: m.difficulty_level || null,
        is_recommended: !!m.is_recommended
      }));

    const courseItems = courses
      .filter((c) => c.specialty_key === specialty_key && c.is_active)
      .map((c) => ({
        item_type: "course",
        item_id: c.id,
        title: c.title,
        duration_minutes: c.duration_minutes,
        difficulty_level: c.level,
        is_recommended: true
      }));

    return [...moduleItems, ...courseItems];
  }

  saveLearningPlan(learning_plan_id, title, specialty_key, items) {
    let plans = this._getFromStorage("learning_plans", []);
    let planItems = this._getFromStorage("learning_plan_items", []);
    const specialties = this._getFromStorage("specialties", []);

    const total_duration_minutes = this._calculateLearningPlanTotalDuration(items || []);

    let isNew = !learning_plan_id;
    let plan;

    if (isNew) {
      plan = {
        id: this._generateId("learning_plan"),
        title,
        specialty_key,
        total_duration_minutes,
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        is_active: true
      };
      plans.push(plan);
    } else {
      const idx = plans.findIndex((lp) => lp.id === learning_plan_id);
      if (idx === -1) {
        // treat as new if not found
        plan = {
          id: this._generateId("learning_plan"),
          title,
          specialty_key,
          total_duration_minutes,
          created_at: this._nowIso(),
          updated_at: this._nowIso(),
          is_active: true
        };
        plans.push(plan);
        isNew = true;
      } else {
        plan = {
          ...plans[idx],
          title,
          specialty_key,
          total_duration_minutes,
          updated_at: this._nowIso()
        };
        plans[idx] = plan;

        // Remove existing items for this plan
        planItems = planItems.filter((it) => it.learning_plan_id !== learning_plan_id);
      }
    }

    // Recreate items
    const courses = this._getFromStorage("courses", []);
    const modules = this._getFromStorage("learning_modules", []);

    (items || []).forEach((it) => {
      if (!it || !it.item_type || !it.item_id) return;
      let title_snapshot = "";
      let duration_minutes = 0;
      if (it.item_type === "course") {
        const c = courses.find((c) => c.id === it.item_id);
        if (c) {
          title_snapshot = c.title;
          duration_minutes = c.duration_minutes || 0;
        }
      } else if (it.item_type === "learning_module") {
        const m = modules.find((m) => m.id === it.item_id);
        if (m) {
          title_snapshot = m.title;
          duration_minutes = m.duration_minutes || 0;
        }
      }

      const planItem = {
        id: this._generateId("learning_plan_item"),
        learning_plan_id: plan.id,
        item_type: it.item_type,
        item_id: it.item_id,
        title_snapshot,
        duration_minutes,
        order_index: typeof it.order_index === "number" ? it.order_index : 0,
        added_at: this._nowIso()
      };
      planItems.push(planItem);
    });

    this._saveToStorage("learning_plans", plans);
    this._saveToStorage("learning_plan_items", planItems);

    const specialty = specialties.find((s) => s.key === plan.specialty_key) || null;

    return {
      learning_plan_id: plan.id,
      title: plan.title,
      specialty_key: plan.specialty_key,
      specialty_name: specialty ? specialty.name : "",
      total_duration_minutes: plan.total_duration_minutes,
      items_count: (items || []).length,
      message: isNew ? "Learning plan created." : "Learning plan updated."
    };
  }

  // 7. Mentorship
  getMentorFilterOptions() {
    const specialties = this._getFromStorage("specialties", []);

    const rating_thresholds = [
      { min_rating: 4.0, label: "4.0 stars & up" },
      { min_rating: 4.5, label: "4.5 stars & up" },
      { min_rating: 4.7, label: "4.7 stars & up" }
    ];

    return {
      specialties: specialties.map((s) => ({ key: s.key, name: s.name })),
      rating_thresholds
    };
  }

  searchMentors(filters) {
    const mentors = this._getFromStorage("mentors", []);
    const specialties = this._getFromStorage("specialties", []);

    let results = mentors.slice();

    if (filters) {
      if (filters.is_active_only) {
        results = results.filter((m) => m.is_active);
      }
      if (filters.specialty_key) {
        const normalizeKey = (str) =>
          String(str || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
        const targetNorm = normalizeKey(filters.specialty_key);
        results = results.filter(
          (m) =>
            Array.isArray(m.specialties) &&
            m.specialties.some((spec) => {
              const specNorm = normalizeKey(spec);
              return (
                specNorm === targetNorm ||
                specNorm.indexOf(targetNorm) !== -1 ||
                targetNorm.indexOf(specNorm) !== -1
              );
            })
        );
      }
      if (typeof filters.min_rating === "number") {
        results = results.filter((m) => m.rating_average >= filters.min_rating);
      }
    }

    const specialtyNameByKey = (key) => {
      const s = specialties.find((sp) => sp.key === key);
      return s ? s.name : "";
    };

    const mapped = results.map((m) => ({
      mentor_id: m.id,
      full_name: m.full_name,
      specialties: m.specialties || [],
      primary_specialty_name:
        Array.isArray(m.specialties) && m.specialties.length > 0
          ? specialtyNameByKey(m.specialties[0])
          : "",
      rating_average: m.rating_average,
      rating_count: m.rating_count,
      years_experience: m.years_experience || 0
    }));

    return { results: mapped, total_count: mapped.length };
  }

  getMentorProfile(mentor_id) {
    const mentors = this._getFromStorage("mentors", []);
    const packages = this._getFromStorage("mentorship_packages", []);

    const mentor = mentors.find((m) => m.id === mentor_id) || null;
    if (!mentor) return null;

    const pkgs = packages
      .filter((p) => p.mentor_id === mentor_id)
      .map((p) => ({
        mentorship_package_id: p.id,
        name: p.name,
        description: p.description || "",
        session_count: p.session_count,
        session_duration_minutes: p.session_duration_minutes,
        price_total: p.price_total,
        is_active: p.is_active
      }));

    return {
      mentor_id: mentor.id,
      full_name: mentor.full_name,
      bio: mentor.bio || "",
      specialties: mentor.specialties || [],
      rating_average: mentor.rating_average,
      rating_count: mentor.rating_count,
      years_experience: mentor.years_experience || 0,
      profile_image_url: mentor.profile_image_url || "",
      packages: pkgs
    };
  }

  getMentorAvailability(mentor_id, start_date, end_date) {
    const slots = this._getFromStorage("mentor_availability_slots", []);

    const start = new Date(start_date);
    const end = new Date(end_date);

    return slots
      .filter((s) => s.mentor_id === mentor_id)
      .filter((s) => {
        const d = new Date(s.start_datetime);
        return d >= start && d <= end;
      })
      .map((s) => ({
        mentor_availability_slot_id: s.id,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        is_available: s.is_available
      }));
  }

  bookMentorshipPackage(mentor_id, mentorship_package_id, mentor_availability_slot_ids) {
    const mentors = this._getFromStorage("mentors", []);
    const packages = this._getFromStorage("mentorship_packages", []);
    let slots = this._getFromStorage("mentor_availability_slots", []);
    let bookings = this._getFromStorage("mentorship_bookings", []);
    let sessionBookings = this._getFromStorage("mentorship_session_bookings", []);

    const mentor = mentors.find((m) => m.id === mentor_id);
    if (!mentor) {
      throw new Error("Mentor not found");
    }

    const pkg = packages.find(
      (p) => p.id === mentorship_package_id && p.mentor_id === mentor_id
    );
    if (!pkg) {
      throw new Error("Mentorship package not found for this mentor");
    }

    const selectedSlots = mentor_availability_slot_ids
      .map((id) => slots.find((s) => s.id === id && s.mentor_id === mentor_id))
      .filter(Boolean);

    if (!this._validateMentorshipSlotsAgainstPackage(pkg, selectedSlots)) {
      throw new Error("Selected slots do not match package requirements");
    }

    // Create booking
    const booking = {
      id: this._generateId("mentorship_booking"),
      mentor_id,
      mentorship_package_id,
      status: "scheduled",
      created_at: this._nowIso(),
      total_price: pkg.price_total
    };

    bookings.push(booking);

    // Create session bookings and mark slots unavailable
    const sessions = [];
    slots = slots.map((s) => {
      if (!mentor_availability_slot_ids.includes(s.id)) return s;
      const session = {
        id: this._generateId("mentorship_session_booking"),
        mentorship_booking_id: booking.id,
        mentor_availability_slot_id: s.id,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime
      };
      sessions.push(session);
      sessionBookings.push(session);

      return { ...s, is_available: false };
    });

    this._saveToStorage("mentorship_bookings", bookings);
    this._saveToStorage("mentorship_session_bookings", sessionBookings);
    this._saveToStorage("mentor_availability_slots", slots);

    return {
      mentorship_booking_id: booking.id,
      status: booking.status,
      total_price: booking.total_price,
      sessions: sessions.map((s) => ({
        mentorship_session_booking_id: s.id,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime
      })),
      confirmation_message: "Mentorship package booked and sessions scheduled."
    };
  }

  // 8. Notification settings
  getNotificationSettings() {
    let settingsArr = this._getFromStorage("notification_settings", []);
    if (settingsArr.length === 0) {
      const settings = {
        id: this._generateId("notif_settings"),
        session_reminder_24h_enabled: true,
        session_reminder_1h_enabled: true,
        marketing_emails_enabled: true,
        course_progress_emails_enabled: true,
        webinar_notification_mode: "all_webinars",
        updated_at: this._nowIso()
      };
      settingsArr.push(settings);
      this._saveToStorage("notification_settings", settingsArr);
    }
    const s = settingsArr[0];
    return {
      session_reminder_24h_enabled: s.session_reminder_24h_enabled,
      session_reminder_1h_enabled: s.session_reminder_1h_enabled,
      marketing_emails_enabled: s.marketing_emails_enabled,
      course_progress_emails_enabled: s.course_progress_emails_enabled,
      webinar_notification_mode: s.webinar_notification_mode,
      updated_at: s.updated_at
    };
  }

  updateNotificationSettings(
    session_reminder_24h_enabled,
    session_reminder_1h_enabled,
    marketing_emails_enabled,
    course_progress_emails_enabled,
    webinar_notification_mode
  ) {
    const allowedModes = ["all_webinars", "registered_only", "none"];
    if (!allowedModes.includes(webinar_notification_mode)) {
      return {
        success: false,
        message: "Invalid webinar_notification_mode.",
        updated_settings: null
      };
    }

    const updated = this._persistNotificationSettings({
      session_reminder_24h_enabled,
      session_reminder_1h_enabled,
      marketing_emails_enabled,
      course_progress_emails_enabled,
      webinar_notification_mode
    });

    return {
      success: true,
      message: "Notification settings updated.",
      updated_settings: {
        session_reminder_24h_enabled: updated.session_reminder_24h_enabled,
        session_reminder_1h_enabled: updated.session_reminder_1h_enabled,
        marketing_emails_enabled: updated.marketing_emails_enabled,
        course_progress_emails_enabled: updated.course_progress_emails_enabled,
        webinar_notification_mode: updated.webinar_notification_mode,
        updated_at: updated.updated_at
      }
    };
  }

  // 9. Institutional plans
  searchInstitutionalPlans(num_learners, selected_specialty_keys, max_annual_budget) {
    const templates = this._getFromStorage("institutional_plan_templates", []);
    const specialties = this._getFromStorage("specialties", []);

    const results = templates
      .filter((t) => t.is_active)
      .filter((t) => {
        // Must include all selected specialties
        if (Array.isArray(selected_specialty_keys) && selected_specialty_keys.length > 0) {
          return selected_specialty_keys.every((key) =>
            t.included_specialty_keys.includes(key)
          );
        }
        return true;
      })
      .map((t) => {
        const estimated = this._calculateInstitutionalPlanPricing(
          t,
          num_learners,
          selected_specialty_keys || []
        );
        return {
          institutional_plan_template_id: t.id,
          institutional_plan_template: t, // foreign key resolution
          name: t.name,
          description: t.description || "",
          included_specialty_keys: t.included_specialty_keys,
          included_specialty_names: (t.included_specialty_keys || []).map((key) => {
            const s = specialties.find((sp) => sp.key === key);
            return s ? s.name : key;
          }),
          estimated_annual_price_total: estimated,
          features: t.features || []
        };
      })
      .filter((r) =>
        typeof max_annual_budget === "number"
          ? r.estimated_annual_price_total <= max_annual_budget
          : true
      );

    return { results, total_count: results.length };
  }

  getInstitutionalPlanComparison(
    institutional_plan_template_ids,
    num_learners,
    selected_specialty_keys
  ) {
    const templates = this._getFromStorage("institutional_plan_templates", []);
    const specialties = this._getFromStorage("specialties", []);

    const comparisons = (institutional_plan_template_ids || [])
      .map((id) => templates.find((t) => t.id === id))
      .filter(Boolean)
      .map((t) => {
        const estimated = this._calculateInstitutionalPlanPricing(
          t,
          num_learners,
          selected_specialty_keys || []
        );
        return {
          institutional_plan_template_id: t.id,
          institutional_plan_template: t, // foreign key resolution
          name: t.name,
          description: t.description || "",
          included_specialty_keys: t.included_specialty_keys,
          included_specialty_names: (t.included_specialty_keys || []).map((key) => {
            const s = specialties.find((sp) => sp.key === key);
            return s ? s.name : key;
          }),
          estimated_annual_price_total: estimated,
          features: t.features || []
        };
      });

    return comparisons;
  }

  createInstitutionalPlanConfiguration(
    institutional_plan_template_id,
    num_learners,
    selected_specialty_keys
  ) {
    const templates = this._getFromStorage("institutional_plan_templates", []);
    const specialties = this._getFromStorage("specialties", []);
    let configs = this._getFromStorage("institutional_plan_configurations", []);

    const template = templates.find((t) => t.id === institutional_plan_template_id);
    if (!template) {
      throw new Error("Institutional plan template not found");
    }

    const annual_price_total = this._calculateInstitutionalPlanPricing(
      template,
      num_learners,
      selected_specialty_keys || []
    );

    const config = {
      id: this._generateId("institutional_plan_config"),
      institutional_plan_template_id,
      num_learners,
      selected_specialty_keys: selected_specialty_keys || [],
      annual_price_total,
      status: "draft",
      created_at: this._nowIso()
    };

    configs.push(config);
    this._saveToStorage("institutional_plan_configurations", configs);

    return {
      institutional_plan_configuration_id: config.id,
      institutional_plan_template_id: config.institutional_plan_template_id,
      num_learners: config.num_learners,
      selected_specialty_keys: config.selected_specialty_keys,
      selected_specialty_names: (config.selected_specialty_keys || []).map((key) => {
        const s = specialties.find((sp) => sp.key === key);
        return s ? s.name : key;
      }),
      annual_price_total: config.annual_price_total,
      status: config.status
    };
  }

  getInstitutionalPlanConfiguration(institutional_plan_configuration_id) {
    const configs = this._getFromStorage("institutional_plan_configurations", []);
    const templates = this._getFromStorage("institutional_plan_templates", []);
    const specialties = this._getFromStorage("specialties", []);

    const config = configs.find((c) => c.id === institutional_plan_configuration_id);
    if (!config) return null;

    const template = templates.find(
      (t) => t.id === config.institutional_plan_template_id
    );

    const selected_specialty_names = (config.selected_specialty_keys || []).map((key) => {
      const s = specialties.find((sp) => sp.key === key);
      return s ? s.name : key;
    });

    return {
      institutional_plan_configuration_id: config.id,
      institutional_plan_template_id: config.institutional_plan_template_id,
      institutional_plan_template: template || null, // foreign key resolution
      template_name: template ? template.name : "",
      num_learners: config.num_learners,
      selected_specialty_keys: config.selected_specialty_keys,
      selected_specialty_names,
      annual_price_total: config.annual_price_total,
      features: template && template.features ? template.features : [],
      status: config.status
    };
  }

  submitInstitutionalPlanRequest(institutional_plan_configuration_id, action) {
    let configs = this._getFromStorage("institutional_plan_configurations", []);
    const idx = configs.findIndex((c) => c.id === institutional_plan_configuration_id);
    if (idx === -1) {
      throw new Error("Institutional plan configuration not found");
    }

    let status;
    if (action === "request_quote") {
      status = "requested";
    } else if (action === "save_proposal") {
      status = "saved_proposal";
    } else {
      throw new Error("Invalid action for institutional plan request");
    }

    configs[idx] = {
      ...configs[idx],
      status
    };

    this._saveToStorage("institutional_plan_configurations", configs);

    return {
      institutional_plan_configuration_id,
      status,
      message:
        status === "requested"
          ? "Institutional plan quote requested."
          : "Institutional plan proposal saved."
    };
  }

  // 10. Static content
  getAboutContent() {
    return {
      mission:
        "To elevate ultrasound practice worldwide through high-yield, case-based teaching and expert mentorship.",
      clinical_expertise:
        "Our faculty are practicing clinicians in emergency medicine, critical care, anesthesia, and internal medicine with advanced ultrasound training.",
      educational_philosophy:
        "We focus on clinically relevant ultrasound skills, emphasizing image acquisition, interpretation, and decision-making in real-world scenarios.",
      accreditation_and_partnerships:
        "Programs may be eligible for CME/CPD credit depending on local regulations. We collaborate with hospitals, residency programs, and ultrasound societies to deliver customized training.",
      faculty: []
    };
  }

  getHelpSupportContent() {
    return {
      faqs: [
        {
          category_key: "consultations",
          question: "How do I book a consultation?",
          answer:
            "Use the Consultations page to filter by specialty and duration, then select an available time slot to confirm your booking."
        },
        {
          category_key: "courses",
          question: "How long do I have access to purchased courses?",
          answer:
            "Unless otherwise stated, course access is typically granted for at least 12 months from the date of purchase."
        },
        {
          category_key: "webinars",
          question: "Are live webinars recorded?",
          answer:
            "Many live webinars are recorded and made available for on-demand viewing, subject to speaker consent and accreditation rules."
        },
        {
          category_key: "learning_paths",
          question: "Can I create my own learning plan?",
          answer:
            "Yes. Use the Learning Paths section to combine courses and modules into a custom plan that fits your goals and schedule."
        }
      ],
      support_email: "support@example-ultrasound.com",
      support_phone: "+1 (555) 000-0000",
      contact_form_info:
        "Submit support requests via the Help & Support page or email us directly with your account email and a detailed description of your issue."
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