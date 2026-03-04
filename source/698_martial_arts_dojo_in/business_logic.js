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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const defaults = {
      // Core entities
      classes: [],
      membership_plans: [],
      events: [],
      instructors: [],
      locations: [],
      training_plans: [],
      training_plan_items: [],
      articles: [],
      free_trial_requests: [],
      membership_plan_requests: [],
      class_waitlist_entries: [],
      event_registrations: [],
      faq_questions: [],
      private_lesson_requests: [],
      location_contact_messages: [],
      workshop_info_requests: [],

      // Additional content structures
      faq_pages: [
        {
          faq_page_slug: "belt_testing",
          title: "Belt Testing & Promotions",
          content:
            "Learn about our belt testing requirements, schedules, and promotion criteria for all belt levels.",
          questions: []
        }
      ], // { faq_page_slug, title, content, questions: [{question, answer_html}] }
      pages: [], // generic CMS pages for searchSite

      homepage_content: {
        hero: {
          headline: "",
          subheadline: "",
          primary_cta_label: "",
          secondary_cta_label: ""
        },
        disciplines: [],
        age_groups: [],
        teaching_philosophy: "",
        featured_events: [],
        recent_articles: []
      },

      about_page_content: {
        history_html: "",
        philosophy_html: "",
        belt_system_html: "",
        program_overview: []
      },

      general_contact_info: {
        main_phone: "",
        main_email: "",
        office_hours: ""
      },

      general_contact_inquiries: []
    };

    Object.keys(defaults).forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaults[key]));
      }
    });

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
    localStorage.setItem("idCounter", next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _normalizeDatetimeInput(input) {
    if (!input) return null;

    if (input instanceof Date) {
      const d = input;
      if (!isNaN(d.getTime())) return d.toISOString();
      return null;
    }

    if (typeof input === "string") {
      // If it's just a date (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        // Preserve plain date strings so local date comparisons remain consistent
        const d = new Date(input);
        if (!isNaN(d.getTime())) return input;
      }

      // Try letting Date parse it
      const d = new Date(input);
      if (!isNaN(d.getTime())) return d.toISOString();

      // Fallback: return as-is
      return input;
    }

    return null;
  }

  _titleCase(str) {
    if (!str) return "";
    return str
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  _getOrCreateTrainingPlan() {
    let plans = this._getFromStorage("training_plans");
    if (plans.length > 0) {
      return plans[0];
    }

    const newPlan = {
      id: this._generateId("training_plan"),
      name: "Weekly Training Plan",
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    plans.push(newPlan);
    this._saveToStorage("training_plans", plans);
    return newPlan;
  }

  _persistTrainingPlan(plan) {
    let plans = this._getFromStorage("training_plans");
    const idx = plans.findIndex((p) => p.id === plan.id);
    if (idx >= 0) {
      plans[idx] = plan;
    } else {
      plans.push(plan);
    }
    this._saveToStorage("training_plans", plans);
  }

  _calculateLocationDistances(zipCode, locations) {
    const result = {};
    if (!zipCode) {
      locations.forEach((loc) => {
        result[loc.id] = Infinity;
      });
      return result;
    }

    const origin = parseInt(String(zipCode).slice(0, 5), 10);
    locations.forEach((loc) => {
      const locZip = parseInt(String(loc.postal_code || "").slice(0, 5), 10);
      if (!isNaN(origin) && !isNaN(locZip)) {
        // Very rough numeric difference as pseudo-distance
        result[loc.id] = Math.abs(locZip - origin);
      } else {
        result[loc.id] = Infinity;
      }
    });
    return result;
  }

  // ----------------------
  // Homepage & general content
  // ----------------------

  getHomepageContent() {
    const homepage = localStorage.getItem("homepage_content")
      ? JSON.parse(localStorage.getItem("homepage_content"))
      : {
          hero: {
            headline: "",
            subheadline: "",
            primary_cta_label: "",
            secondary_cta_label: ""
          },
          disciplines: [],
          age_groups: [],
          teaching_philosophy: "",
          featured_events: [],
          recent_articles: []
        };

    const events = this._getFromStorage("events");
    const locations = this._getFromStorage("locations");
    const articles = this._getFromStorage("articles");

    // Build featured events from upcoming seminars/workshops, tournaments, etc.
    const now = new Date();
    const upcomingEvents = events
      .filter((e) => {
        if (!e.start_datetime) return false;
        const d = new Date(e.start_datetime);
        return !isNaN(d.getTime()) && d >= now;
      })
      .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
      .slice(0, 5)
      .map((e) => {
        const loc = locations.find((l) => l.id === e.location_id) || null;
        return {
          event_id: e.id,
          name: e.name,
          event_type: e.event_type,
          start_datetime: e.start_datetime,
          location_name: loc ? loc.name : null,
          // Foreign key resolution
          event: e,
          location: loc
        };
      });

    const recentArticles = articles
      .filter((a) => a.is_published)
      .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
      .slice(0, 5)
      .map((a) => ({
        article_id: a.id,
        title: a.title,
        category: a.category,
        summary: a.summary || "",
        published_at: a.published_at
      }));

    return {
      hero: homepage.hero || {
        headline: "",
        subheadline: "",
        primary_cta_label: "",
        secondary_cta_label: ""
      },
      disciplines: Array.isArray(homepage.disciplines) ? homepage.disciplines : [],
      age_groups: Array.isArray(homepage.age_groups) ? homepage.age_groups : [],
      teaching_philosophy: homepage.teaching_philosophy || "",
      featured_events: upcomingEvents,
      recent_articles: recentArticles
    };
  }

  getAboutPageContent() {
    const about = localStorage.getItem("about_page_content")
      ? JSON.parse(localStorage.getItem("about_page_content"))
      : {
          history_html: "",
          philosophy_html: "",
          belt_system_html: "",
          program_overview: []
        };

    return {
      history_html: about.history_html || "",
      philosophy_html: about.philosophy_html || "",
      belt_system_html: about.belt_system_html || "",
      program_overview: Array.isArray(about.program_overview)
        ? about.program_overview
        : []
    };
  }

  getGeneralContactInfo() {
    const info = localStorage.getItem("general_contact_info")
      ? JSON.parse(localStorage.getItem("general_contact_info"))
      : {
          main_phone: "",
          main_email: "",
          office_hours: ""
        };

    return {
      main_phone: info.main_phone || "",
      main_email: info.main_email || "",
      office_hours: info.office_hours || ""
    };
  }

  submitGeneralContactInquiry(name, email, topic, message) {
    const inquiries = this._getFromStorage("general_contact_inquiries");
    const newInquiry = {
      id: this._generateId("general_contact_inquiry"),
      name,
      email,
      topic: topic || null,
      message,
      created_at: this._nowIso()
    };
    inquiries.push(newInquiry);
    this._saveToStorage("general_contact_inquiries", inquiries);

    return {
      success: true,
      message: "Your inquiry has been submitted."
    };
  }

  // ----------------------
  // Search across site
  // ----------------------

  searchSite(query) {
    const q = (query || "").toLowerCase();

    const faqPages = this._getFromStorage("faq_pages");
    const articles = this._getFromStorage("articles");
    const classes = this._getFromStorage("classes");
    const events = this._getFromStorage("events");
    const pages = this._getFromStorage("pages");

    const contains = (text) =>
      typeof text === "string" && text.toLowerCase().includes(q);

    const faqResults = faqPages
      .filter((f) => contains(f.title) || contains(f.content))
      .map((f) => ({
        faq_page_slug: f.faq_page_slug,
        title: f.title,
        excerpt: (f.content || "").slice(0, 200)
      }));

    const articleResults = articles
      .filter(
        (a) =>
          contains(a.title) ||
          contains(a.summary) ||
          contains(a.content)
      )
      .map((a) => ({
        article_id: a.id,
        title: a.title,
        category: a.category,
        excerpt: a.summary || (a.content || "").slice(0, 200),
        published_at: a.published_at
      }));

    const classResults = classes
      .filter(
        (c) =>
          contains(c.name) ||
          contains(c.discipline) ||
          contains(c.description)
      )
      .map((c) => ({
        class_id: c.id,
        name: c.name,
        age_group: c.age_group,
        skill_level: c.skill_level,
        discipline: c.discipline
      }));

    const eventResults = events
      .filter((e) => contains(e.name) || contains(e.description))
      .map((e) => ({
        event_id: e.id,
        name: e.name,
        event_type: e.event_type,
        start_datetime: e.start_datetime
      }));

    const pageResults = pages
      .filter((p) => contains(p.title) || contains(p.content))
      .map((p) => ({
        slug: p.slug,
        title: p.title,
        excerpt: (p.content || "").slice(0, 200)
      }));

    return {
      query,
      results: {
        faq_pages: faqResults,
        articles: articleResults,
        classes: classResults,
        events: eventResults,
        pages: pageResults
      }
    };
  }

  // ----------------------
  // Classes
  // ----------------------

  getClassFilterOptions() {
    const classes = this._getFromStorage("classes");

    const dropInPrices = classes.map((c) => c.drop_in_price || 0);
    const minPrice = dropInPrices.length ? Math.min(...dropInPrices) : 0;
    const maxPrice = dropInPrices.length ? Math.max(...dropInPrices) : 0;

    return {
      age_groups: [
        { value: "kids_4_6", label: "Kids (4–6)" },
        { value: "kids_7_12", label: "Kids (7–12)" },
        { value: "teens", label: "Teens" },
        { value: "adults_18_plus", label: "Adults (18+)" },
        { value: "all_ages", label: "All Ages" }
      ],
      skill_levels: [
        { value: "beginner", label: "Beginner" },
        { value: "intermediate", label: "Intermediate" },
        { value: "advanced", label: "Advanced" },
        { value: "all_levels", label: "All Levels" }
      ],
      days_of_week: [
        { value: "monday", label: "Monday" },
        { value: "tuesday", label: "Tuesday" },
        { value: "wednesday", label: "Wednesday" },
        { value: "thursday", label: "Thursday" },
        { value: "friday", label: "Friday" },
        { value: "saturday", label: "Saturday" },
        { value: "sunday", label: "Sunday" }
      ],
      start_time_range: {
        earliest: "06:00",
        latest: "22:00",
        step_minutes: 15
      },
      drop_in_price_range: {
        min: minPrice,
        max: maxPrice,
        currency: "USD"
      },
      sort_options: [
        { value: "rating_desc", label: "Rating: High to Low" },
        { value: "start_time_asc", label: "Start Time: Early to Late" },
        { value: "start_time_desc", label: "Start Time: Late to Early" },
        { value: "price_asc", label: "Price: Low to High" },
        { value: "price_desc", label: "Price: High to Low" }
      ]
    };
  }

  searchClasses(filters, sort_by, limit, offset) {
    const classes = this._getFromStorage("classes");
    const locations = this._getFromStorage("locations");
    const instructors = this._getFromStorage("instructors");

    filters = filters || {};
    let items = classes.filter((c) => c.status === "active");

    if (filters.age_group) {
      items = items.filter(
        (c) =>
          c.age_group === filters.age_group || c.age_group === "all_ages"
      );
    }

    if (filters.skill_level) {
      items = items.filter(
        (c) =>
          c.skill_level === filters.skill_level || c.skill_level === "all_levels"
      );
    }

    if (filters.days_of_week && filters.days_of_week.length) {
      const filterDays = filters.days_of_week;
      items = items.filter((c) =>
        Array.isArray(c.days_of_week) &&
        c.days_of_week.some((d) => filterDays.includes(d))
      );
    }

    if (filters.start_time_min) {
      items = items.filter((c) => c.start_time >= filters.start_time_min);
    }

    if (filters.start_time_max) {
      items = items.filter((c) => c.start_time <= filters.start_time_max);
    }

    if (typeof filters.drop_in_price_max === "number") {
      items = items.filter(
        (c) => typeof c.drop_in_price === "number" && c.drop_in_price <= filters.drop_in_price_max
      );
    }

    if (filters.location_id) {
      items = items.filter((c) => c.location_id === filters.location_id);
    }

    if (filters.discipline) {
      items = items.filter((c) => c.discipline === filters.discipline);
    }

    // Sorting
    switch (sort_by) {
      case "start_time_asc":
        items.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
        break;
      case "start_time_desc":
        items.sort((a, b) => (b.start_time || "").localeCompare(a.start_time || ""));
        break;
      case "price_asc":
        items.sort((a, b) => (a.drop_in_price || 0) - (b.drop_in_price || 0));
        break;
      case "price_desc":
        items.sort((a, b) => (b.drop_in_price || 0) - (a.drop_in_price || 0));
        break;
      case "rating_desc":
      default:
        items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }

    const total = items.length;
    const start = typeof offset === "number" ? offset : 0;
    const end = typeof limit === "number" ? start + limit : undefined;
    const paged = items.slice(start, end);

    const mapped = paged.map((c) => {
      const loc = locations.find((l) => l.id === c.location_id) || null;
      const inst = instructors.find((i) => i.id === c.instructor_id) || null;
      return {
        class_id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        age_group: c.age_group,
        skill_level: c.skill_level,
        discipline: c.discipline,
        days_of_week: c.days_of_week || [],
        start_time: c.start_time,
        end_time: c.end_time || null,
        drop_in_price: c.drop_in_price,
        rating: c.rating || null,
        is_waitlist_enabled: !!c.is_waitlist_enabled,
        is_trial_available: !!c.is_trial_available,
        location_name: loc ? loc.name : null,
        instructor_name: inst ? inst.full_name : null,
        // Foreign key resolution
        location: loc,
        instructor: inst
      };
    });

    return {
      total,
      items: mapped
    };
  }

  getClassDetail(classId) {
    const classes = this._getFromStorage("classes");
    const locations = this._getFromStorage("locations");
    const instructors = this._getFromStorage("instructors");

    const c = classes.find((cl) => cl.id === classId);
    if (!c) return null;

    const loc = locations.find((l) => l.id === c.location_id) || null;
    const inst = instructors.find((i) => i.id === c.instructor_id) || null;

    return {
      class_id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      age_group: c.age_group,
      skill_level: c.skill_level,
      discipline: c.discipline,
      days_of_week: c.days_of_week || [],
      start_time: c.start_time,
      end_time: c.end_time || null,
      drop_in_price: c.drop_in_price,
      rating: c.rating || null,
      is_waitlist_enabled: !!c.is_waitlist_enabled,
      is_trial_available: !!c.is_trial_available,
      max_participants: c.max_participants || null,
      current_enrollment: c.current_enrollment || null,
      status: c.status,
      location: loc
        ? {
            location_id: loc.id,
            name: loc.name,
            address_line1: loc.address_line1,
            city: loc.city,
            state: loc.state
          }
        : null,
      instructor: inst
        ? {
            instructor_id: inst.id,
            full_name: inst.full_name,
            years_experience: inst.years_experience,
            rating: inst.rating || null
          }
        : null
    };
  }

  createFreeTrialRequest(classId, name, email, phone, preferredDate) {
    const classes = this._getFromStorage("classes");
    const c = classes.find((cl) => cl.id === classId);

    if (!c) {
      return {
        free_trial_request_id: null,
        status: "error",
        message: "Class not found.",
        class_summary: null
      };
    }

    const requests = this._getFromStorage("free_trial_requests");

    const newReq = {
      id: this._generateId("free_trial_request"),
      class_id: classId,
      name,
      email,
      phone,
      preferred_date: this._normalizeDatetimeInput(preferredDate),
      status: "submitted",
      created_at: this._nowIso()
    };

    requests.push(newReq);
    this._saveToStorage("free_trial_requests", requests);

    return {
      free_trial_request_id: newReq.id,
      status: newReq.status,
      message: "Free trial request submitted.",
      class_summary: {
        class_id: c.id,
        name: c.name,
        discipline: c.discipline,
        age_group: c.age_group,
        skill_level: c.skill_level
      }
    };
  }

  createClassWaitlistEntry(classId, childName, childAge, parentEmail, preferredDayOfWeek) {
    const classes = this._getFromStorage("classes");
    const c = classes.find((cl) => cl.id === classId);

    if (!c) {
      return {
        waitlist_entry_id: null,
        status: "error",
        message: "Class not found."
      };
    }

    const entries = this._getFromStorage("class_waitlist_entries");

    const newEntry = {
      id: this._generateId("class_waitlist_entry"),
      class_id: classId,
      child_name: childName,
      child_age: childAge,
      parent_email: parentEmail,
      preferred_day_of_week: preferredDayOfWeek,
      status: "active",
      created_at: this._nowIso()
    };

    entries.push(newEntry);
    this._saveToStorage("class_waitlist_entries", entries);

    return {
      waitlist_entry_id: newEntry.id,
      status: newEntry.status,
      message: "Waitlist entry created."
    };
  }

  // ----------------------
  // Training plan
  // ----------------------

  addClassToTrainingPlan(classId, dayOfWeek, startTime) {
    const classes = this._getFromStorage("classes");
    const c = classes.find((cl) => cl.id === classId);
    const plan = this._getOrCreateTrainingPlan();

    if (!c) {
      return {
        training_plan_id: plan.id,
        added_item: null,
        message: "Class not found."
      };
    }

    const planItems = this._getFromStorage("training_plan_items");

    const existingForDay = planItems.filter(
      (it) => it.training_plan_id === plan.id && it.day_of_week === dayOfWeek
    );

    const newItem = {
      id: this._generateId("training_plan_item"),
      training_plan_id: plan.id,
      class_id: classId,
      day_of_week: dayOfWeek,
      start_time: startTime || c.start_time,
      position: existingForDay.length,
      added_at: this._nowIso()
    };

    planItems.push(newItem);
    this._saveToStorage("training_plan_items", planItems);

    plan.updated_at = this._nowIso();
    this._persistTrainingPlan(plan);

    return {
      training_plan_id: plan.id,
      added_item: {
        training_plan_item_id: newItem.id,
        class_id: newItem.class_id,
        day_of_week: newItem.day_of_week,
        start_time: newItem.start_time
      },
      message: "Class added to training plan."
    };
  }

  getTrainingPlanSummary() {
    const plan = this._getOrCreateTrainingPlan();
    const items = this._getFromStorage("training_plan_items").filter(
      (it) => it.training_plan_id === plan.id
    );
    const classes = this._getFromStorage("classes");
    const locations = this._getFromStorage("locations");

    const days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday"
    ];

    const items_by_day = {};
    days.forEach((d) => {
      items_by_day[d] = [];
    });

    items.forEach((it) => {
      const c = classes.find((cl) => cl.id === it.class_id) || null;
      const loc = c
        ? locations.find((l) => l.id === c.location_id) || null
        : null;
      const day = it.day_of_week;
      if (!items_by_day[day]) items_by_day[day] = [];
      items_by_day[day].push({
        training_plan_item_id: it.id,
        class_id: it.class_id,
        class_name: c ? c.name : null,
        discipline: c ? c.discipline : null,
        start_time: it.start_time,
        location_name: loc ? loc.name : null,
        // Foreign key resolution
        class: c,
        location: loc
      });
    });

    // Instrumentation for task completion tracking
    try {
      if (plan && plan.id) {
        localStorage.setItem("task8_trainingPlanSummaryViewed", "true");
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      training_plan_id: plan.id,
      name: plan.name,
      items_by_day
    };
  }

  removeTrainingPlanItem(trainingPlanItemId) {
    const planItems = this._getFromStorage("training_plan_items");
    const idx = planItems.findIndex((it) => it.id === trainingPlanItemId);
    let trainingPlanId = null;

    if (idx >= 0) {
      trainingPlanId = planItems[idx].training_plan_id;
      planItems.splice(idx, 1);
      this._saveToStorage("training_plan_items", planItems);
    }

    return {
      training_plan_id: trainingPlanId,
      removed_item_id: trainingPlanItemId,
      message: idx >= 0 ? "Training plan item removed." : "Item not found."
    };
  }

  // ----------------------
  // Membership plans
  // ----------------------

  getMembershipFilterOptions() {
    const plans = this._getFromStorage("membership_plans");
    const prices = plans.map((p) => p.monthly_price || 0);
    const classesPerMonth = plans.map((p) => p.classes_per_month || 0);

    const priceMin = prices.length ? Math.min(...prices) : 0;
    const priceMax = prices.length ? Math.max(...prices) : 0;
    const classesMin = classesPerMonth.length ? Math.min(...classesPerMonth) : 0;
    const classesMax = classesPerMonth.length ? Math.max(...classesPerMonth) : 0;

    return {
      audiences: [
        { value: "adults", label: "Adults" },
        { value: "kids", label: "Kids" },
        { value: "teens", label: "Teens" },
        { value: "family", label: "Family" },
        { value: "all_ages", label: "All Ages" }
      ],
      contract_types: [
        { value: "no_long_term_contract", label: "No long-term contract" },
        { value: "month_to_month", label: "Month-to-month" },
        { value: "six_month", label: "6-month" },
        { value: "twelve_month", label: "12-month" },
        { value: "class_pack", label: "Class pack" }
      ],
      monthly_price_range: {
        min: priceMin,
        max: priceMax,
        currency: "USD"
      },
      classes_per_month_range: {
        min: classesMin,
        max: classesMax
      },
      sort_options: [
        { value: "price_asc", label: "Monthly Price: Low to High" },
        { value: "price_desc", label: "Monthly Price: High to Low" },
        { value: "classes_per_month_desc", label: "Classes per Month: High to Low" }
      ]
    };
  }

  searchMembershipPlans(filters, sort_by) {
    const plans = this._getFromStorage("membership_plans");
    filters = filters || {};

    let items = plans.filter((p) => p.is_active !== false);

    if (filters.audience) {
      items = items.filter(
        (p) => p.audience === filters.audience || p.audience === "all_ages"
      );
    }

    if (typeof filters.max_monthly_price === "number") {
      items = items.filter(
        (p) => typeof p.monthly_price === "number" && p.monthly_price <= filters.max_monthly_price
      );
    }

    if (filters.contract_type) {
      items = items.filter((p) => p.contract_type === filters.contract_type);
    }

    if (typeof filters.min_classes_per_month === "number") {
      items = items.filter(
        (p) => typeof p.classes_per_month === "number" && p.classes_per_month >= filters.min_classes_per_month
      );
    }

    switch (sort_by) {
      case "price_desc":
        items.sort((a, b) => (b.monthly_price || 0) - (a.monthly_price || 0));
        break;
      case "classes_per_month_desc":
        items.sort(
          (a, b) => (b.classes_per_month || 0) - (a.classes_per_month || 0)
        );
        break;
      case "price_asc":
      default:
        items.sort((a, b) => (a.monthly_price || 0) - (b.monthly_price || 0));
        break;
    }

    return {
      total: items.length,
      items: items.map((p) => ({
        membership_plan_id: p.id,
        name: p.name,
        slug: p.slug,
        audience: p.audience,
        monthly_price: p.monthly_price,
        classes_per_month: p.classes_per_month,
        contract_type: p.contract_type,
        min_commitment_months: p.min_commitment_months || null,
        includes_programs: p.includes_programs || [],
        is_trial_included: !!p.is_trial_included
      }))
    };
  }

  getMembershipPlanDetail(membershipPlanId) {
    const plans = this._getFromStorage("membership_plans");
    const p = plans.find((pl) => pl.id === membershipPlanId);
    if (!p) return null;

    return {
      membership_plan_id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || "",
      audience: p.audience,
      monthly_price: p.monthly_price,
      classes_per_month: p.classes_per_month,
      contract_type: p.contract_type,
      min_commitment_months: p.min_commitment_months || null,
      includes_programs: p.includes_programs || [],
      is_trial_included: !!p.is_trial_included,
      is_active: p.is_active !== false
    };
  }

  createMembershipPlanRequest(membershipPlanId, fullName, email, preferredStartDate) {
    const plans = this._getFromStorage("membership_plans");
    const p = plans.find((pl) => pl.id === membershipPlanId);

    if (!p) {
      return {
        membership_plan_request_id: null,
        status: "error",
        message: "Membership plan not found."
      };
    }

    const requests = this._getFromStorage("membership_plan_requests");

    const newReq = {
      id: this._generateId("membership_plan_request"),
      membership_plan_id: membershipPlanId,
      full_name: fullName,
      email,
      preferred_start_date: this._normalizeDatetimeInput(preferredStartDate),
      status: "submitted",
      created_at: this._nowIso()
    };

    requests.push(newReq);
    this._saveToStorage("membership_plan_requests", requests);

    return {
      membership_plan_request_id: newReq.id,
      status: newReq.status,
      message: "Membership plan request submitted."
    };
  }

  // ----------------------
  // Events
  // ----------------------

  getEventFilterOptions() {
    const events = this._getFromStorage("events");

    const monthSet = new Set();
    events.forEach((e) => {
      if (e.start_datetime) {
        const d = new Date(e.start_datetime);
        if (!isNaN(d.getTime())) {
          const ym = d.toISOString().slice(0, 7); // YYYY-MM
          monthSet.add(ym);
        }
      }
    });

    const months = Array.from(monthSet)
      .sort()
      .map((value) => {
        const [year, month] = value.split("-");
        const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        const label = d.toLocaleString("en-US", { month: "long", year: "numeric" });
        return { value, label };
      });

    const event_types = [
      { value: "seminar_workshop", label: "Seminar/Workshop" },
      { value: "tournament", label: "Tournament" },
      { value: "belt_testing", label: "Belt Testing" },
      { value: "open_house", label: "Open House" },
      { value: "other", label: "Other" }
    ];

    const days_of_week = [
      { value: "monday", label: "Monday" },
      { value: "tuesday", label: "Tuesday" },
      { value: "wednesday", label: "Wednesday" },
      { value: "thursday", label: "Thursday" },
      { value: "friday", label: "Friday" },
      { value: "saturday", label: "Saturday" },
      { value: "sunday", label: "Sunday" }
    ];

    return {
      months,
      event_types,
      days_of_week
    };
  }

  searchEvents(filters, sort_by) {
    const events = this._getFromStorage("events");
    const locations = this._getFromStorage("locations");

    filters = filters || {};

    let items = events.slice();

    if (filters.month) {
      items = items.filter((e) => {
        if (!e.start_datetime) return false;
        const ym = String(e.start_datetime).slice(0, 7);
        return ym === filters.month;
      });
    }

    if (filters.event_type) {
      items = items.filter((e) => e.event_type === filters.event_type);
    }

    if (filters.day_of_week) {
      items = items.filter((e) => e.day_of_week === filters.day_of_week);
    }

    switch (sort_by) {
      case "date_desc":
        items.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime));
        break;
      case "date_asc":
      default:
        items.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
        break;
    }

    const mapped = items.map((e) => {
      const loc = locations.find((l) => l.id === e.location_id) || null;
      return {
        event_id: e.id,
        name: e.name,
        slug: e.slug,
        event_type: e.event_type,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime || null,
        day_of_week: e.day_of_week,
        location_name: loc ? loc.name : null,
        experience_level: e.experience_level || null,
        is_registration_open: !!e.is_registration_open,
        // Foreign key resolution
        location: loc
      };
    });

    return {
      total: mapped.length,
      items: mapped
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage("events");
    const locations = this._getFromStorage("locations");
    const instructors = this._getFromStorage("instructors");

    const e = events.find((ev) => ev.id === eventId);
    if (!e) return null;

    const loc = locations.find((l) => l.id === e.location_id) || null;
    const inst = e.primary_instructor_id
      ? instructors.find((i) => i.id === e.primary_instructor_id) || null
      : null;

    return {
      event_id: e.id,
      name: e.name,
      slug: e.slug,
      description: e.description || "",
      event_type: e.event_type,
      start_datetime: e.start_datetime,
      end_datetime: e.end_datetime || null,
      day_of_week: e.day_of_week,
      location: loc
        ? {
            location_id: loc.id,
            name: loc.name,
            address_line1: loc.address_line1,
            city: loc.city,
            state: loc.state
          }
        : null,
      primary_instructor: inst
        ? {
            instructor_id: inst.id,
            full_name: inst.full_name,
            years_experience: inst.years_experience
          }
        : null,
      experience_level: e.experience_level || null,
      registration_types_available: e.registration_types_available || [],
      price: e.price || null,
      capacity: e.capacity || null,
      is_registration_open: !!e.is_registration_open
    };
  }

  registerForEvent(eventId, fullName, email, experienceLevel, registrationType) {
    const events = this._getFromStorage("events");
    const e = events.find((ev) => ev.id === eventId);

    if (!e) {
      return {
        event_registration_id: null,
        status: "error",
        message: "Event not found."
      };
    }

    const registrations = this._getFromStorage("event_registrations");

    const newReg = {
      id: this._generateId("event_registration"),
      event_id: eventId,
      full_name: fullName,
      email,
      experience_level: experienceLevel,
      registration_type: registrationType,
      status: e.is_registration_open ? "registered" : "waitlisted",
      created_at: this._nowIso()
    };

    registrations.push(newReg);
    this._saveToStorage("event_registrations", registrations);

    return {
      event_registration_id: newReg.id,
      status: newReg.status,
      message:
        newReg.status === "registered"
          ? "Event registration completed."
          : "Event is not open; you have been waitlisted."
    };
  }

  // ----------------------
  // FAQ
  // ----------------------

  getFaqPageContent(faqPageSlug) {
    const faqPages = this._getFromStorage("faq_pages");
    const page = faqPages.find((p) => p.faq_page_slug === faqPageSlug);

    if (!page) {
      return {
        faq_page_slug: faqPageSlug,
        title: "",
        questions: []
      };
    }

    return {
      faq_page_slug: page.faq_page_slug,
      title: page.title,
      questions: Array.isArray(page.questions)
        ? page.questions.map((q) => ({
            question: q.question,
            answer_html: q.answer_html
          }))
        : []
    };
  }

  submitFaqQuestion(faqPageSlug, name, email, topic, preferredLocationId, message) {
    const questions = this._getFromStorage("faq_questions");

    const newQ = {
      id: this._generateId("faq_question"),
      faq_page_slug: faqPageSlug,
      name,
      email,
      topic,
      preferred_location_id: preferredLocationId || null,
      message,
      status: "submitted",
      created_at: this._nowIso()
    };

    questions.push(newQ);
    this._saveToStorage("faq_questions", questions);

    return {
      faq_question_id: newQ.id,
      status: newQ.status,
      message: "Your question has been submitted."
    };
  }

  // ----------------------
  // Instructors & private lessons
  // ----------------------

  getInstructorFilterOptions() {
    const instructors = this._getFromStorage("instructors");

    const disciplineSet = new Set();
    const programSet = new Set();

    instructors.forEach((i) => {
      (i.disciplines || []).forEach((d) => disciplineSet.add(d));
      (i.programs_taught || []).forEach((p) => programSet.add(p));
    });

    const disciplines = Array.from(disciplineSet).map((d) => ({
      value: d,
      label: d
    }));

    const programs_taught = Array.from(programSet).map((p) => ({
      value: p,
      label: this._titleCase(p)
    }));

    const sort_options = [
      { value: "experience_desc", label: "Experience: High to Low" },
      { value: "experience_asc", label: "Experience: Low to High" },
      { value: "rating_desc", label: "Rating: High to Low" }
    ];

    return {
      disciplines,
      programs_taught,
      sort_options
    };
  }

  searchInstructors(filters, sort_by) {
    const instructors = this._getFromStorage("instructors");
    const locations = this._getFromStorage("locations");

    filters = filters || {};

    let items = instructors.filter((i) => i.is_active !== false);

    if (filters.discipline) {
      items = items.filter((i) =>
        Array.isArray(i.disciplines) && i.disciplines.includes(filters.discipline)
      );
    }

    if (filters.programs && filters.programs.length) {
      const filterPrograms = filters.programs;
      items = items.filter((i) => {
        const programs = i.programs_taught || [];
        return filterPrograms.every((p) => programs.includes(p));
      });
    }

    if (typeof filters.offers_private_lessons === "boolean") {
      items = items.filter(
        (i) => !!i.offers_private_lessons === filters.offers_private_lessons
      );
    }

    switch (sort_by) {
      case "experience_asc":
        items.sort(
          (a, b) => (a.years_experience || 0) - (b.years_experience || 0)
        );
        break;
      case "rating_desc":
        items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "experience_desc":
      default:
        items.sort(
          (a, b) => (b.years_experience || 0) - (a.years_experience || 0)
        );
        break;
    }

    const mapped = items.map((i) => {
      const loc = i.primary_location_id
        ? locations.find((l) => l.id === i.primary_location_id) || null
        : null;
      return {
        instructor_id: i.id,
        full_name: i.full_name,
        slug: i.slug,
        years_experience: i.years_experience,
        disciplines: i.disciplines || [],
        programs_taught: i.programs_taught || [],
        offers_private_lessons: !!i.offers_private_lessons,
        rating: i.rating || null,
        // Foreign key resolution
        primary_location: loc
      };
    });

    return {
      total: mapped.length,
      items: mapped
    };
  }

  getInstructorDetail(instructorId) {
    const instructors = this._getFromStorage("instructors");
    const locations = this._getFromStorage("locations");

    const i = instructors.find((inst) => inst.id === instructorId);
    if (!i) return null;

    const loc = i.primary_location_id
      ? locations.find((l) => l.id === i.primary_location_id) || null
      : null;

    return {
      instructor_id: i.id,
      full_name: i.full_name,
      slug: i.slug,
      bio: i.bio || "",
      years_experience: i.years_experience,
      disciplines: i.disciplines || [],
      programs_taught: i.programs_taught || [],
      offers_private_lessons: !!i.offers_private_lessons,
      private_lesson_disciplines: i.private_lesson_disciplines || [],
      private_lesson_durations_minutes: i.private_lesson_durations_minutes || [],
      rating: i.rating || null,
      primary_location: loc
        ? {
            location_id: loc.id,
            name: loc.name
          }
        : null,
      typical_private_lesson_times: i.typical_private_lesson_times || []
    };
  }

  createPrivateLessonRequest(
    instructorId,
    name,
    email,
    lessonLengthMinutes,
    preferredDatetime,
    discipline,
    notes
  ) {
    const instructors = this._getFromStorage("instructors");
    const inst = instructors.find((i) => i.id === instructorId);

    if (!inst) {
      return {
        private_lesson_request_id: null,
        status: "error",
        message: "Instructor not found."
      };
    }

    const requests = this._getFromStorage("private_lesson_requests");

    const newReq = {
      id: this._generateId("private_lesson_request"),
      instructor_id: instructorId,
      name,
      email,
      lesson_length_minutes: lessonLengthMinutes,
      preferred_datetime: this._normalizeDatetimeInput(preferredDatetime),
      discipline: discipline || null,
      notes: notes || "",
      status: "submitted",
      created_at: this._nowIso()
    };

    requests.push(newReq);
    this._saveToStorage("private_lesson_requests", requests);

    return {
      private_lesson_request_id: newReq.id,
      status: newReq.status,
      message: "Private lesson request submitted."
    };
  }

  // ----------------------
  // Locations
  // ----------------------

  getLocationProgramFilterOptions() {
    const locations = this._getFromStorage("locations");
    const programSet = new Set();

    locations.forEach((loc) => {
      (loc.programs_offered || []).forEach((p) => programSet.add(p));
    });

    const programs = Array.from(programSet).map((p) => ({
      value: p,
      label: p
    }));

    const radius_options_miles = [5, 10, 15, 20, 25];

    return {
      programs,
      radius_options_miles
    };
  }

  searchLocations(zipCode, radiusMiles, program, sort_by) {
    const locations = this._getFromStorage("locations");

    const distances = this._calculateLocationDistances(zipCode, locations);

    let items = locations.filter((loc) => loc.is_active !== false);

    if (typeof radiusMiles === "number") {
      items = items.filter((loc) => {
        const d = distances[loc.id];
        return typeof d === "number" && d <= radiusMiles;
      });
    }

    if (program) {
      items = items.filter((loc) =>
        Array.isArray(loc.programs_offered) && loc.programs_offered.includes(program)
      );
    }

    if (sort_by === "distance_asc") {
      items.sort((a, b) => (distances[a.id] || Infinity) - (distances[b.id] || Infinity));
    }

    const mapped = items.map((loc) => ({
      location_id: loc.id,
      name: loc.name,
      address_line1: loc.address_line1,
      city: loc.city,
      state: loc.state,
      postal_code: loc.postal_code,
      distance_miles: distances[loc.id] || null,
      programs_offered: loc.programs_offered || [],
      phone: loc.phone || null,
      email: loc.email || null
    }));

    return {
      origin_zip: zipCode,
      radius_miles: radiusMiles,
      items: mapped
    };
  }

  getLocationDetail(locationId) {
    const locations = this._getFromStorage("locations");
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return null;

    return {
      location_id: loc.id,
      name: loc.name,
      slug: loc.slug,
      address_line1: loc.address_line1,
      address_line2: loc.address_line2 || "",
      city: loc.city,
      state: loc.state,
      postal_code: loc.postal_code,
      country: loc.country,
      latitude: typeof loc.latitude === "number" ? loc.latitude : null,
      longitude: typeof loc.longitude === "number" ? loc.longitude : null,
      phone: loc.phone || null,
      email: loc.email || null,
      hours: loc.hours || "",
      programs_offered: loc.programs_offered || [],
      is_main_location: !!loc.is_main_location
    };
  }

  createLocationContactMessage(locationId, name, email, subject, message) {
    const locations = this._getFromStorage("locations");
    const loc = locations.find((l) => l.id === locationId);

    if (!loc) {
      return {
        location_contact_message_id: null,
        status: "error",
        message: "Location not found."
      };
    }

    const messages = this._getFromStorage("location_contact_messages");

    const newMsg = {
      id: this._generateId("location_contact_message"),
      location_id: locationId,
      name,
      email,
      subject: subject || null,
      message,
      status: "submitted",
      created_at: this._nowIso()
    };

    messages.push(newMsg);
    this._saveToStorage("location_contact_messages", messages);

    return {
      location_contact_message_id: newMsg.id,
      status: newMsg.status,
      message: "Your message has been submitted."
    };
  }

  // ----------------------
  // Articles & workshop info
  // ----------------------

  getArticleFilterOptions() {
    const categories = [
      { value: "womens_self_defense", label: "Women's Self-Defense" },
      { value: "general", label: "General" },
      { value: "news", label: "News" },
      { value: "events", label: "Events" },
      { value: "training_tips", label: "Training Tips" }
    ];

    const sort_options = [
      { value: "newest_first", label: "Newest First" },
      { value: "oldest_first", label: "Oldest First" }
    ];

    return {
      categories,
      sort_options
    };
  }

  searchArticles(filters, sort_by, limit, offset) {
    const articles = this._getFromStorage("articles");
    filters = filters || {};

    let items = articles.filter((a) => a.is_published);

    if (filters.category) {
      items = items.filter((a) => a.category === filters.category);
    }

    switch (sort_by) {
      case "published_at_asc":
      case "oldest_first":
        items.sort((a, b) => new Date(a.published_at) - new Date(b.published_at));
        break;
      case "published_at_desc":
      case "newest_first":
      default:
        items.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
        break;
    }

    const total = items.length;
    const start = typeof offset === "number" ? offset : 0;
    const end = typeof limit === "number" ? start + limit : undefined;
    const paged = items.slice(start, end);

    return {
      total,
      items: paged.map((a) => ({
        article_id: a.id,
        title: a.title,
        slug: a.slug,
        category: a.category,
        summary: a.summary || "",
        published_at: a.published_at
      }))
    };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage("articles");
    const a = articles.find((art) => art.id === articleId);
    if (!a) return null;

    return {
      article_id: a.id,
      title: a.title,
      slug: a.slug,
      category: a.category,
      content_html: a.content || "",
      author_name: a.author_name || "",
      published_at: a.published_at
    };
  }

  createWorkshopInfoRequest(
    articleId,
    name,
    email,
    referringArticleTitle,
    programOfInterest
  ) {
    const articles = this._getFromStorage("articles");
    const a = articles.find((art) => art.id === articleId);

    if (!a) {
      return {
        workshop_info_request_id: null,
        status: "error",
        message: "Article not found."
      };
    }

    const requests = this._getFromStorage("workshop_info_requests");

    const newReq = {
      id: this._generateId("workshop_info_request"),
      article_id: articleId,
      name,
      email,
      referring_article_title: referringArticleTitle,
      program_of_interest: programOfInterest,
      status: "submitted",
      created_at: this._nowIso()
    };

    requests.push(newReq);
    this._saveToStorage("workshop_info_requests", requests);

    return {
      workshop_info_request_id: newReq.id,
      status: newReq.status,
      message: "Workshop information request submitted."
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