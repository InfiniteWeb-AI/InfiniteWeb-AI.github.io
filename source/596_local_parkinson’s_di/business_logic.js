/// localStorage polyfill for Node.js and environments without localStorage
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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize entity tables
    const tableDefaults = {
      events: [],
      event_registrations: [],
      planner_entries: [],
      resources: [],
      saved_resources: [],
      resource_collections: [],
      resource_collection_items: [],
      providers: [],
      saved_providers: [],
      saved_support_groups: [],
      forum_categories: [],
      forum_topics: [],
      forum_posts: [],
      contact_requests: []
    };

    for (const key in tableDefaults) {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(tableDefaults[key]));
      }
    }

    // Content/config objects
    if (localStorage.getItem("home_page_data") === null) {
      const home = {
        introTitle: "",
        introBody: "",
        whoWeServeSummary: "",
        announcements: [],
        primaryCallsToAction: []
      };
      localStorage.setItem("home_page_data", JSON.stringify(home));
    }

    if (localStorage.getItem("about_content") === null) {
      const about = {
        missionTitle: "",
        missionBody: "",
        whoRunsTheGroup: "",
        whoWeServe: "",
        programsSummary: ""
      };
      localStorage.setItem("about_content", JSON.stringify(about));
    }

    if (localStorage.getItem("contact_page_data") === null) {
      const contact = {
        primaryPhone: "",
        primaryEmail: "",
        meetingLocations: [],
        nonEmergencyDisclaimer: "",
        crisisResources: []
      };
      localStorage.setItem("contact_page_data", JSON.stringify(contact));
    }

    if (localStorage.getItem("help_faqs_data") === null) {
      const helpFaqs = {
        faqs: [],
        taskGuides: []
      };
      localStorage.setItem("help_faqs_data", JSON.stringify(helpFaqs));
    }

    if (localStorage.getItem("privacy_terms_content") === null) {
      const pt = {
        privacyPolicyHtml: "",
        termsOfUseHtml: "",
        medicalDisclaimerText: "",
        cookiePolicyText: ""
      };
      localStorage.setItem("privacy_terms_content", JSON.stringify(pt));
    }

    if (localStorage.getItem("forum_overview_content") === null) {
      const forumOverview = {
        guidelinesTitle: "",
        guidelinesBody: "",
        popularCategoryIds: []
      };
      localStorage.setItem("forum_overview_content", JSON.stringify(forumOverview));
    }

    // Notification settings stored as a single object; defer initialization to helper
    if (localStorage.getItem("notification_settings") === null) {
      localStorage.setItem("notification_settings", "null");
    }

    // Global ID counter
    if (localStorage.getItem("idCounter") === null) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _getEventDaysOfWeek(event) {
    const days = [];
    if (event && event.isRecurring && event.recurrenceFrequency && event.recurrenceFrequency !== "none") {
      if (event.occursMonday) days.push("monday");
      if (event.occursTuesday) days.push("tuesday");
      if (event.occursWednesday) days.push("wednesday");
      if (event.occursThursday) days.push("thursday");
      if (event.occursFriday) days.push("friday");
      if (event.occursSaturday) days.push("saturday");
      if (event.occursSunday) days.push("sunday");
      if (days.length > 0) return days;
    }
    const start = this._parseDate(event && event.startDateTime);
    if (!start) return days;
    const map = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    days.push(map[start.getDay()]);
    return days;
  }

  _eventMatchesTimeOfDay(event, timeOfDay) {
    if (!timeOfDay) return true;
    const startStr = event && event.startDateTime;
    if (!startStr) return false;

    // Extract the local event hour from the ISO string to avoid environment timezone differences
    const match = String(startStr).match(/T(\d{2}):(\d{2})/);
    let hour = null;
    if (match) {
      hour = parseInt(match[1], 10);
    } else {
      const d = this._parseDate(startStr);
      if (!d) return false;
      hour = d.getHours();
    }

    if (timeOfDay === "morning") {
      return hour >= 8 && hour < 12;
    }
    if (timeOfDay === "afternoon") {
      return hour >= 12 && hour < 17;
    }
    if (timeOfDay === "evening") {
      return hour >= 17 && hour < 21;
    }
    return true;
  }

  _getCategoryLabel(value) {
    const map = {
      exercise: "Exercise",
      education_workshop: "Education / Workshop",
      caregiver_support: "Caregiver Support",
      support_meeting: "Support Meeting",
      support_group: "Support Group",
      social: "Social",
      other: "Other"
    };
    return map[value] || value || "";
  }

  _getDeliveryModeLabel(value) {
    const map = {
      in_person: "In person",
      online: "Online",
      hybrid: "Hybrid"
    };
    return map[value] || value || "";
  }

  // ----------------------
  // Internal helpers required by spec
  // ----------------------

  _getOrCreateNotificationSettings() {
    let settings = this._getFromStorage("notification_settings", null);
    if (!settings || typeof settings !== "object") {
      const now = this._nowIso();
      settings = {
        id: this._generateId("notif"),
        smsEnabled: false,
        emailEnabled: false,
        smsPhoneNumber: "",
        emailAddress: "",
        remindOneDayBefore: false,
        remindOneHourBefore: false,
        remindThirtyMinutesBefore: false,
        notifyExerciseClasses: false,
        notifyCaregiverSupport: false,
        notifySupportGroups: false,
        notifySupportMeetings: false,
        notifyWorkshops: false,
        notifyOtherEvents: false,
        applyToScope: "future_events",
        updatedAt: now
      };
      this._saveToStorage("notification_settings", settings);
    }
    return settings;
  }

  _getOrCreateReadingList() {
    let saved = this._getFromStorage("saved_resources", []);
    if (!Array.isArray(saved)) {
      saved = [];
      this._saveToStorage("saved_resources", saved);
    }
    return saved;
  }

  _getOrCreateResourceCollections() {
    let collections = this._getFromStorage("resource_collections", []);
    let items = this._getFromStorage("resource_collection_items", []);
    if (!Array.isArray(collections)) {
      collections = [];
      this._saveToStorage("resource_collections", collections);
    }
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage("resource_collection_items", items);
    }
    return { collections, items };
  }

  _getOrCreateCareTeam() {
    let savedProviders = this._getFromStorage("saved_providers", []);
    let savedGroups = this._getFromStorage("saved_support_groups", []);
    if (!Array.isArray(savedProviders)) {
      savedProviders = [];
      this._saveToStorage("saved_providers", savedProviders);
    }
    if (!Array.isArray(savedGroups)) {
      savedGroups = [];
      this._saveToStorage("saved_support_groups", savedGroups);
    }
    return { savedProviders, savedGroups };
  }

  _getOrCreatePlanner() {
    let entries = this._getFromStorage("planner_entries", []);
    if (!Array.isArray(entries)) {
      entries = [];
      this._saveToStorage("planner_entries", entries);
    }
    return entries;
  }

  // ----------------------
  // Interface: getHomePageData
  // ----------------------

  getHomePageData() {
    const base = this._getFromStorage("home_page_data", {
      introTitle: "",
      introBody: "",
      whoWeServeSummary: "",
      announcements: [],
      primaryCallsToAction: []
    });

    const events = this._getFromStorage("events", []);
    const now = new Date();
    const upcomingSupportMeetings = events
      .filter((e) => {
        if (!e || !e.startDateTime) return false;
        const start = this._parseDate(e.startDateTime);
        if (!start || start < now) return false;
        // treat support_meeting and support_group types as support meetings for homepage
        return e.eventType === "support_meeting" || e.eventType === "support_group" || e.category === "support_meeting";
      })
      .sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(8640000000000000);
        const db = this._parseDate(b.startDateTime) || new Date(8640000000000000);
        return da - db;
      })
      .slice(0, 5)
      .map((event) => ({
        eventId: event.id,
        title: event.title,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        deliveryMode: event.deliveryMode,
        locationName: event.locationName || "",
        isFree: !!event.isFree,
        cost: typeof event.cost === "number" ? event.cost : 0,
        // Foreign key resolution
        event: event || null
      }));

    return {
      introTitle: base.introTitle || "",
      introBody: base.introBody || "",
      whoWeServeSummary: base.whoWeServeSummary || "",
      announcements: Array.isArray(base.announcements) ? base.announcements : [],
      nextSupportMeetings: upcomingSupportMeetings,
      primaryCallsToAction: Array.isArray(base.primaryCallsToAction) ? base.primaryCallsToAction : []
    };
  }

  // ----------------------
  // Interface: getEventFilterOptions
  // ----------------------

  getEventFilterOptions() {
    const eventTypes = [
      { value: "support_meeting", label: "In-person / Online Support Meetings" },
      { value: "exercise_class", label: "Exercise Class" },
      { value: "workshop", label: "Workshop" },
      { value: "caregiver_support", label: "Caregiver Support" },
      { value: "support_group", label: "Support Group" },
      { value: "other_event", label: "Other" }
    ];

    const categories = [
      { value: "exercise", label: "Exercise" },
      { value: "education_workshop", label: "Education / Workshop" },
      { value: "caregiver_support", label: "Caregiver Support" },
      { value: "support_meeting", label: "Support Meetings" },
      { value: "support_group", label: "Support Groups" },
      { value: "social", label: "Social" },
      { value: "other", label: "Other" }
    ];

    const deliveryModes = [
      { value: "in_person", label: "In person" },
      { value: "online", label: "Online" },
      { value: "hybrid", label: "Hybrid" }
    ];

    const audiences = [
      { value: "people_with_parkinsons", label: "People with Parkinson's" },
      { value: "caregivers", label: "Caregivers" },
      { value: "both", label: "People with Parkinson's & Caregivers" },
      { value: "family_friends", label: "Family & Friends" },
      { value: "healthcare_providers", label: "Healthcare providers" }
    ];

    const stageFocusOptions = [
      { value: "all_stages", label: "All stages" },
      { value: "newly_diagnosed", label: "Newly diagnosed" },
      { value: "early_stage", label: "Early stage" },
      { value: "mid_stage", label: "Mid stage" },
      { value: "advanced_stage", label: "Advanced stage" }
    ];

    const ageFocusOptions = [
      { value: "all_ages", label: "All ages" },
      { value: "under_60", label: "Under 60" },
      { value: "age_60_plus", label: "Age 60+" },
      { value: "older_adults", label: "Older adults" },
      { value: "younger_onset", label: "Younger-onset" }
    ];

    const dateRanges = [
      { value: "next_7_days", label: "Next 7 days" },
      { value: "next_30_days", label: "Next 30 days" },
      { value: "all_upcoming", label: "All upcoming" },
      { value: "past_events", label: "Past events" }
    ];

    const timeOfDayOptions = [
      { value: "morning", label: "Morning (8am–12pm)", startHour: 8, endHour: 12 },
      { value: "afternoon", label: "Afternoon (12pm–5pm)", startHour: 12, endHour: 17 },
      { value: "evening", label: "Evening (5pm–9pm)", startHour: 17, endHour: 21 }
    ];

    const dayOfWeekOptions = [
      { value: "monday", label: "Monday" },
      { value: "tuesday", label: "Tuesday" },
      { value: "wednesday", label: "Wednesday" },
      { value: "thursday", label: "Thursday" },
      { value: "friday", label: "Friday" },
      { value: "saturday", label: "Saturday" },
      { value: "sunday", label: "Sunday" }
    ];

    const costOptions = [
      { value: "free_only", label: "Free only" },
      { value: "under_20", label: "Under $20" },
      { value: "under_50", label: "Under $50" },
      { value: "all_costs", label: "All costs" }
    ];

    const sortOptions = [
      { value: "date_soonest", label: "Date: Soonest first" },
      { value: "cost_low_to_high", label: "Cost: Low to high" },
      { value: "popularity_desc", label: "Most popular" },
      { value: "distance_nearest", label: "Distance: Nearest first" },
      { value: "title_az", label: "Title A–Z" }
    ];

    return {
      eventTypes,
      categories,
      deliveryModes,
      audiences,
      stageFocusOptions,
      ageFocusOptions,
      dateRanges,
      timeOfDayOptions,
      dayOfWeekOptions,
      costOptions,
      sortOptions
    };
  }

  // ----------------------
  // Interface: searchEvents
  // ----------------------

  searchEvents(query, filters, sortBy) {
    const events = this._getFromStorage("events", []);
    const q = (query || "").trim().toLowerCase();
    const f = filters && typeof filters === "object" ? filters : {};

    let results = events.slice();
    const now = new Date();

    // Date range handling
    const dateRange = f.dateRange || "all_upcoming";
    let rangeStart = null;
    let rangeEnd = null;

    if (dateRange === "next_7_days") {
      rangeStart = now;
      rangeEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "next_30_days") {
      rangeStart = now;
      rangeEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else if (dateRange === "all_upcoming") {
      rangeStart = now;
    } else if (dateRange === "past_events") {
      rangeEnd = now;
    }

    results = results.filter((e) => {
      const start = this._parseDate(e.startDateTime);
      if (!start) return false;
      if (rangeStart && start < rangeStart) return false;
      if (rangeEnd && start > rangeEnd) return false;
      return true;
    });

    // Text query
    if (q) {
      results = results.filter((e) => {
        const haystack = [e.title, e.shortDescription, e.description]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const topics = Array.isArray(e.topics) ? e.topics.join(" ").toLowerCase() : "";
        return haystack.includes(q) || topics.includes(q);
      });
    }

    // Enum / field filters
    if (Array.isArray(f.eventTypes) && f.eventTypes.length) {
      results = results.filter((e) => f.eventTypes.includes(e.eventType));
    }

    if (Array.isArray(f.categories) && f.categories.length) {
      results = results.filter((e) => f.categories.includes(e.category));
    }

    if (Array.isArray(f.deliveryModes) && f.deliveryModes.length) {
      results = results.filter((e) => f.deliveryModes.includes(e.deliveryMode));
    }

    if (Array.isArray(f.primaryAudiences) && f.primaryAudiences.length) {
      results = results.filter((e) => f.primaryAudiences.includes(e.primaryAudience));
    }

    if (Array.isArray(f.stageFocuses) && f.stageFocuses.length) {
      results = results.filter((e) => f.stageFocuses.includes(e.stageFocus));
    }

    if (Array.isArray(f.ageFocuses) && f.ageFocuses.length) {
      results = results.filter((e) => f.ageFocuses.includes(e.ageFocus));
    }

    // Location / distance
    const zip = f.zipCode || null;
    const radius = typeof f.distanceMiles === "number" ? f.distanceMiles : null;
    if (zip || radius !== null) {
      results = results.filter((e) => {
        if (radius !== null && typeof e.distanceMiles === "number" && e.distanceMiles > radius) {
          return false;
        }
        if (zip && e.locationZip && e.locationZip !== zip) {
          return false;
        }
        return true;
      });
    }

    // Cost
    if (f.isFreeOnly) {
      results = results.filter((e) => !!e.isFree);
    } else if (typeof f.maxCost === "number") {
      results = results.filter((e) => {
        const c = typeof e.cost === "number" ? e.cost : 0;
        return c <= f.maxCost;
      });
    }

    // Specific recurrence
    if (typeof f.recurrenceFrequency === "string" && f.recurrenceFrequency) {
      results = results.filter((e) => e.recurrenceFrequency === f.recurrenceFrequency);
    }

    // Weekend meetings per month (for support groups)
    if (typeof f.minWeekendMeetingsPerMonth === "number") {
      const min = f.minWeekendMeetingsPerMonth;
      results = results.filter((e) => {
        const val = typeof e.estimatedWeekendMeetingsPerMonth === "number" ? e.estimatedWeekendMeetingsPerMonth : 0;
        return val >= min;
      });
    }

    // Time of day
    if (f.timeOfDay) {
      results = results.filter((e) => this._eventMatchesTimeOfDay(e, f.timeOfDay));
    }

    // Days of week
    if (Array.isArray(f.daysOfWeek) && f.daysOfWeek.length) {
      const wantedDays = f.daysOfWeek;
      results = results.filter((e) => {
        const days = this._getEventDaysOfWeek(e);
        if (!days.length) return false;
        return wantedDays.some((d) => days.includes(d));
      });
    }

    // Sorting
    const sort = sortBy || "date_soonest";
    results.sort((a, b) => {
      if (sort === "date_soonest") {
        const da = this._parseDate(a.startDateTime) || new Date(8640000000000000);
        const db = this._parseDate(b.startDateTime) || new Date(8640000000000000);
        return da - db;
      }
      if (sort === "cost_low_to_high") {
        const ca = typeof a.cost === "number" ? a.cost : 0;
        const cb = typeof b.cost === "number" ? b.cost : 0;
        return ca - cb;
      }
      if (sort === "popularity_desc") {
        const pa = typeof a.popularityScore === "number" ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === "number" ? b.popularityScore : 0;
        return pb - pa;
      }
      if (sort === "distance_nearest") {
        const da = typeof a.distanceMiles === "number" ? a.distanceMiles : Number.POSITIVE_INFINITY;
        const db = typeof b.distanceMiles === "number" ? b.distanceMiles : Number.POSITIVE_INFINITY;
        return da - db;
      }
      if (sort === "title_az") {
        const ta = (a.title || "").toLowerCase();
        const tb = (b.title || "").toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      }
      return 0;
    });

    const mapped = results.map((e) => ({
      id: e.id,
      title: e.title,
      shortDescription: e.shortDescription,
      eventType: e.eventType,
      category: e.category,
      categoryLabel: this._getCategoryLabel(e.category),
      deliveryMode: e.deliveryMode,
      deliveryModeLabel: this._getDeliveryModeLabel(e.deliveryMode),
      cost: typeof e.cost === "number" ? e.cost : 0,
      isFree: !!e.isFree,
      primaryAudience: e.primaryAudience,
      stageFocus: e.stageFocus,
      ageFocus: e.ageFocus,
      topics: Array.isArray(e.topics) ? e.topics : [],
      startDateTime: e.startDateTime,
      endDateTime: e.endDateTime,
      isRecurring: !!e.isRecurring,
      recurrenceFrequency: e.recurrenceFrequency,
      locationName: e.locationName,
      locationCity: e.locationCity,
      locationState: e.locationState,
      locationZip: e.locationZip,
      distanceMiles: typeof e.distanceMiles === "number" ? e.distanceMiles : undefined,
      popularityScore: typeof e.popularityScore === "number" ? e.popularityScore : 0
    }));

    return {
      events: mapped,
      totalCount: mapped.length
    };
  }

  // ----------------------
  // Interface: getEventDetails
  // ----------------------

  getEventDetails(eventId) {
    const events = this._getFromStorage("events", []);
    const event = events.find((e) => e.id === eventId) || null;

    if (!event) {
      return {
        event: null,
        isBookmarkedSupportGroup: false,
        canRegister: false
      };
    }

    const { savedGroups } = this._getOrCreateCareTeam();
    const saved = savedGroups.find((g) => g.eventId === eventId) || null;
    const now = new Date();
    const start = this._parseDate(event.startDateTime);

    const registrations = this._getFromStorage("event_registrations", []);
    let canRegister = true;
    if (!start || start < now) {
      canRegister = false;
    }
    if (typeof event.maxCapacity === "number") {
      const confirmedCount = registrations.filter((r) => r.eventId === eventId && r.status === "confirmed").length;
      if (confirmedCount >= event.maxCapacity) {
        // still allow but will be waitlisted; keep canRegister true
        canRegister = true;
      }
    }

    const eventDetails = {
      id: event.id,
      title: event.title,
      shortDescription: event.shortDescription,
      description: event.description,
      eventType: event.eventType,
      category: event.category,
      categoryLabel: this._getCategoryLabel(event.category),
      deliveryMode: event.deliveryMode,
      deliveryModeLabel: this._getDeliveryModeLabel(event.deliveryMode),
      primaryAudience: event.primaryAudience,
      stageFocus: event.stageFocus,
      ageFocus: event.ageFocus,
      topics: Array.isArray(event.topics) ? event.topics : [],
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      durationMinutes: event.durationMinutes,
      isRecurring: !!event.isRecurring,
      recurrenceFrequency: event.recurrenceFrequency,
      recurrenceInterval: event.recurrenceInterval,
      occursMonday: !!event.occursMonday,
      occursTuesday: !!event.occursTuesday,
      occursWednesday: !!event.occursWednesday,
      occursThursday: !!event.occursThursday,
      occursFriday: !!event.occursFriday,
      occursSaturday: !!event.occursSaturday,
      occursSunday: !!event.occursSunday,
      estimatedWeekendMeetingsPerMonth: event.estimatedWeekendMeetingsPerMonth,
      cost: typeof event.cost === "number" ? event.cost : 0,
      isFree: !!event.isFree,
      locationName: event.locationName,
      locationAddress1: event.locationAddress1,
      locationAddress2: event.locationAddress2,
      locationCity: event.locationCity,
      locationState: event.locationState,
      locationZip: event.locationZip,
      locationNotes: event.locationNotes,
      virtualMeetingUrl: event.virtualMeetingUrl,
      registrationRequired: !!event.registrationRequired,
      maxCapacity: event.maxCapacity
    };

    return {
      event: eventDetails,
      isBookmarkedSupportGroup: !!saved,
      canRegister: !!canRegister
    };
  }

  // ----------------------
  // Interface: registerForEvent
  // ----------------------

  registerForEvent(eventId, fullName, role, phoneNumber) {
    const events = this._getFromStorage("events", []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        registration: null,
        message: "Event not found."
      };
    }

    let registrations = this._getFromStorage("event_registrations", []);
    const nowIso = this._nowIso();

    let status = "confirmed";
    if (typeof event.maxCapacity === "number") {
      const confirmedCount = registrations.filter((r) => r.eventId === eventId && r.status === "confirmed").length;
      if (confirmedCount >= event.maxCapacity) {
        status = "waitlisted";
      }
    }

    const registration = {
      id: this._generateId("eventreg"),
      eventId,
      fullName,
      role,
      phoneNumber,
      createdAt: nowIso,
      status
    };

    registrations.push(registration);
    this._saveToStorage("event_registrations", registrations);

    return {
      success: true,
      registration,
      message: status === "waitlisted" ? "Event is full; you have been added to the waitlist." : "Registration confirmed."
    };
  }

  // ----------------------
  // Interface: addEventToPlanner
  // ----------------------

  addEventToPlanner(eventId, dayOfWeek, startTime, endTime, recurrenceFrequency, notes) {
    const events = this._getFromStorage("events", []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        plannerEntry: null,
        message: "Event not found."
      };
    }

    let entries = this._getOrCreatePlanner();
    const entry = {
      id: this._generateId("planner"),
      eventId,
      title: event.title,
      notes: notes || "",
      dayOfWeek,
      startTime,
      endTime,
      recurrenceFrequency,
      isActive: true,
      createdAt: this._nowIso()
    };

    entries.push(entry);
    this._saveToStorage("planner_entries", entries);

    return {
      success: true,
      plannerEntry: {
        id: entry.id,
        eventId: entry.eventId,
        title: entry.title,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        recurrenceFrequency: entry.recurrenceFrequency,
        isActive: entry.isActive,
        createdAt: entry.createdAt
      },
      message: "Event added to planner."
    };
  }

  // ----------------------
  // Interface: bookmarkSupportGroup / unbookmarkSupportGroup
  // ----------------------

  bookmarkSupportGroup(eventId, notes) {
    const events = this._getFromStorage("events", []);
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        savedSupportGroup: null,
        message: "Support group not found."
      };
    }

    const careTeam = this._getOrCreateCareTeam();
    let savedGroups = careTeam.savedGroups;

    let existing = savedGroups.find((g) => g.eventId === eventId) || null;
    if (existing) {
      return {
        success: true,
        savedSupportGroup: existing,
        message: "Support group already bookmarked."
      };
    }

    const savedSupportGroup = {
      id: this._generateId("ssg"),
      eventId,
      notes: notes || "",
      bookmarkedAt: this._nowIso()
    };

    savedGroups.push(savedSupportGroup);
    this._saveToStorage("saved_support_groups", savedGroups);

    return {
      success: true,
      savedSupportGroup,
      message: "Support group bookmarked."
    };
  }

  unbookmarkSupportGroup(savedSupportGroupId) {
    const careTeam = this._getOrCreateCareTeam();
    let savedGroups = careTeam.savedGroups;
    const before = savedGroups.length;
    savedGroups = savedGroups.filter((g) => g.id !== savedSupportGroupId);
    this._saveToStorage("saved_support_groups", savedGroups);
    const removed = before !== savedGroups.length;
    return {
      success: removed,
      message: removed ? "Support group removed." : "Support group not found."
    };
  }

  // ----------------------
  // Interface: getPlannerSchedule
  // ----------------------

  getPlannerSchedule() {
    const entries = this._getOrCreatePlanner();
    const events = this._getFromStorage("events", []);

    const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    // Compute Monday of current week
    const today = new Date();
    const day = today.getDay(); // 0=Sun..6=Sat
    const diffToMonday = (day + 6) % 7; // number of days since Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() - diffToMonday);
    const weekStartDate = monday.toISOString().slice(0, 10);

    const days = daysOfWeek.map((dow) => {
      const dayEntries = entries.filter((e) => e.dayOfWeek === dow && e.isActive);
      const mappedEntries = dayEntries.map((entry) => {
        const event = events.find((ev) => ev.id === entry.eventId) || null;
        return {
          plannerEntryId: entry.id,
          eventId: entry.eventId,
          title: entry.title,
          category: event ? event.category : null,
          eventType: event ? event.eventType : null,
          startTime: entry.startTime,
          endTime: entry.endTime,
          recurrenceFrequency: entry.recurrenceFrequency,
          isActive: entry.isActive,
          // Foreign key resolution
          event: event
        };
      });
      return {
        dayOfWeek: dow,
        entries: mappedEntries
      };
    });

    return {
      weekStartDate,
      days
    };
  }

  // ----------------------
  // Interface: updatePlannerEntry / removePlannerEntry
  // ----------------------

  updatePlannerEntry(plannerEntryId, updates) {
    let entries = this._getOrCreatePlanner();
    const idx = entries.findIndex((e) => e.id === plannerEntryId);
    if (idx === -1) {
      return {
        success: false,
        plannerEntry: null,
        message: "Planner entry not found."
      };
    }

    const entry = entries[idx];
    const allowed = ["dayOfWeek", "startTime", "endTime", "recurrenceFrequency", "notes", "isActive"];
    const newEntry = Object.assign({}, entry);
    if (updates && typeof updates === "object") {
      allowed.forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(updates, field) && updates[field] !== undefined) {
          newEntry[field] = updates[field];
        }
      });
    }

    entries[idx] = newEntry;
    this._saveToStorage("planner_entries", entries);

    return {
      success: true,
      plannerEntry: {
        id: newEntry.id,
        eventId: newEntry.eventId,
        dayOfWeek: newEntry.dayOfWeek,
        startTime: newEntry.startTime,
        endTime: newEntry.endTime,
        recurrenceFrequency: newEntry.recurrenceFrequency,
        isActive: newEntry.isActive
      },
      message: "Planner entry updated."
    };
  }

  removePlannerEntry(plannerEntryId) {
    let entries = this._getOrCreatePlanner();
    const before = entries.length;
    entries = entries.filter((e) => e.id !== plannerEntryId);
    this._saveToStorage("planner_entries", entries);
    const removed = before !== entries.length;
    return {
      success: removed,
      message: removed ? "Planner entry removed." : "Planner entry not found."
    };
  }

  // ----------------------
  // Interface: getResourceFilterOptions
  // ----------------------

  getResourceFilterOptions() {
    const audiences = [
      { value: "people_with_parkinsons", label: "People with Parkinson's" },
      { value: "caregivers", label: "Caregivers" },
      { value: "both", label: "People with Parkinson's & Caregivers" },
      { value: "healthcare_providers", label: "Healthcare providers" }
    ];

    const formats = [
      { value: "article", label: "Article" },
      { value: "video", label: "Video" },
      { value: "checklist", label: "Checklist" },
      { value: "worksheet", label: "Worksheet" },
      { value: "podcast", label: "Podcast" },
      { value: "infographic", label: "Infographic" },
      { value: "other", label: "Other" }
    ];

    const durationOptions = [
      { value: "short_0_10", label: "10 minutes or less", maxMinutes: 10 },
      { value: "medium_10_30", label: "10–30 minutes", maxMinutes: 30 },
      { value: "long_30_plus", label: "30+ minutes", maxMinutes: null }
    ];

    const publicationDateRanges = [
      { value: "last_6_months", label: "Last 6 months" },
      { value: "last_2_years", label: "Last 2 years" },
      { value: "all_time", label: "All time" }
    ];

    const sortOptions = [
      { value: "most_recent", label: "Most recent" },
      { value: "most_popular", label: "Most popular" },
      { value: "relevance", label: "Relevance" }
    ];

    return {
      audiences,
      formats,
      durationOptions,
      publicationDateRanges,
      sortOptions
    };
  }

  // ----------------------
  // Interface: searchResources
  // ----------------------

  searchResources(query, filters, sortBy) {
    const resources = this._getFromStorage("resources", []);
    const q = (query || "").trim().toLowerCase();
    const f = filters && typeof filters === "object" ? filters : {};

    let results = resources.slice();

    // Text search
    if (q) {
      results = results.filter((r) => {
        const haystack = [r.title, r.summary, r.content]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const topics = Array.isArray(r.topics) ? r.topics.join(" ").replace(/_/g, " ").toLowerCase() : "";
        return haystack.includes(q) || topics.includes(q);
      });
    }

    // Audiences
    if (Array.isArray(f.audiences) && f.audiences.length) {
      results = results.filter((r) => f.audiences.includes(r.audience));
    }

    // Formats
    if (Array.isArray(f.formats) && f.formats.length) {
      results = results.filter((r) => f.formats.includes(r.format));
    }

    // Topics filter
    if (Array.isArray(f.topics) && f.topics.length) {
      results = results.filter((r) => {
        const rTopics = Array.isArray(r.topics) ? r.topics : [];
        return f.topics.every((t) => rTopics.includes(t));
      });
    }

    // Duration
    if (typeof f.maxDurationMinutes === "number") {
      const max = f.maxDurationMinutes;
      results = results.filter((r) => typeof r.durationMinutes === "number" && r.durationMinutes <= max);
    }

    // Publication date range
    if (f.publicationDateRange) {
      const now = new Date();
      let start = null;
      if (f.publicationDateRange === "last_2_years") {
        start = new Date(now.getTime());
        start.setFullYear(start.getFullYear() - 2);
      } else if (f.publicationDateRange === "last_6_months") {
        start = new Date(now.getTime());
        start.setMonth(start.getMonth() - 6);
      }
      if (start) {
        results = results.filter((r) => {
          const d = this._parseDate(r.publicationDate);
          // Treat resources published after the computed start date as "within range",
          // even if their publication date is in the future relative to the current time.
          return d && d >= start;
        });
      }
    }

    // Optional custom date range
    if (f.startDate || f.endDate) {
      const start = f.startDate ? this._parseDate(f.startDate) : null;
      const end = f.endDate ? this._parseDate(f.endDate) : null;
      results = results.filter((r) => {
        const d = this._parseDate(r.publicationDate);
        if (!d) return false;
        if (start && d < start) return false;
        if (end && d > end) return false;
        return true;
      });
    }

    // Sorting
    const sort = sortBy || "most_recent";
    results.sort((a, b) => {
      if (sort === "most_recent") {
        const da = this._parseDate(a.publicationDate) || new Date(0);
        const db = this._parseDate(b.publicationDate) || new Date(0);
        return db - da;
      }
      if (sort === "most_popular") {
        const pa = typeof a.popularityScore === "number" ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === "number" ? b.popularityScore : 0;
        return pb - pa;
      }
      if (sort === "relevance") {
        // simple relevance: popularity then recency
        const pa = typeof a.popularityScore === "number" ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === "number" ? b.popularityScore : 0;
        if (pb !== pa) return pb - pa;
        const da = this._parseDate(a.publicationDate) || new Date(0);
        const db = this._parseDate(b.publicationDate) || new Date(0);
        return db - da;
      }
      return 0;
    });

    const mapped = results.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      format: r.format,
      audience: r.audience,
      topics: Array.isArray(r.topics) ? r.topics : [],
      durationMinutes: r.durationMinutes,
      publicationDate: r.publicationDate,
      popularityScore: r.popularityScore
    }));

    return {
      resources: mapped,
      totalCount: mapped.length
    };
  }

  // ----------------------
  // Interface: getResourceDetails
  // ----------------------

  getResourceDetails(resourceId) {
    const resources = this._getFromStorage("resources", []);
    const resource = resources.find((r) => r.id === resourceId) || null;

    if (!resource) {
      return {
        resource: null,
        isInReadingList: false,
        collectionsContainingResource: []
      };
    }

    const savedResources = this._getOrCreateReadingList();
    const isInReadingList = savedResources.some((sr) => sr.resourceId === resourceId);

    const { collections, items } = this._getOrCreateResourceCollections();
    const containing = items
      .filter((it) => it.resourceId === resourceId)
      .map((it) => {
        const col = collections.find((c) => c.id === it.collectionId) || null;
        return {
          collectionId: it.collectionId,
          collectionName: col ? col.name : "",
          // Foreign key resolution
          collection: col
        };
      });

    const resourceDetails = {
      id: resource.id,
      title: resource.title,
      summary: resource.summary,
      content: resource.content,
      contentUrl: resource.contentUrl,
      format: resource.format,
      audience: resource.audience,
      topics: Array.isArray(resource.topics) ? resource.topics : [],
      durationMinutes: resource.durationMinutes,
      publicationDate: resource.publicationDate,
      estimatedReadTimeMinutes: resource.estimatedReadTimeMinutes
    };

    return {
      resource: resourceDetails,
      isInReadingList,
      collectionsContainingResource: containing
    };
  }

  // ----------------------
  // Interface: saveResourceToReadingList / removeResourceFromReadingList
  // ----------------------

  saveResourceToReadingList(resourceId, notes) {
    const resources = this._getFromStorage("resources", []);
    const resource = resources.find((r) => r.id === resourceId) || null;
    if (!resource) {
      return {
        success: false,
        savedResource: null,
        message: "Resource not found."
      };
    }

    let saved = this._getOrCreateReadingList();
    const existing = saved.find((s) => s.resourceId === resourceId) || null;
    if (existing) {
      return {
        success: true,
        savedResource: existing,
        message: "Resource already in reading list."
      };
    }

    const sortOrder = saved.length ? Math.max.apply(null, saved.map((s) => s.sortOrder || 0)) + 1 : 1;
    const savedResource = {
      id: this._generateId("savedres"),
      resourceId,
      savedAt: this._nowIso(),
      sortOrder,
      notes: notes || ""
    };

    saved.push(savedResource);
    this._saveToStorage("saved_resources", saved);

    return {
      success: true,
      savedResource,
      message: "Resource added to reading list."
    };
  }

  removeResourceFromReadingList(savedResourceId) {
    let saved = this._getOrCreateReadingList();
    const before = saved.length;
    saved = saved.filter((s) => s.id !== savedResourceId);
    this._saveToStorage("saved_resources", saved);
    const removed = before !== saved.length;
    return {
      success: removed,
      message: removed ? "Resource removed from reading list." : "Saved resource not found."
    };
  }

  // ----------------------
  // Interface: addResourceToCollection
  // ----------------------

  addResourceToCollection(resourceId, collectionId, newCollectionName) {
    const resources = this._getFromStorage("resources", []);
    const resource = resources.find((r) => r.id === resourceId) || null;
    if (!resource) {
      return {
        success: false,
        collection: null,
        collectionItem: null,
        message: "Resource not found."
      };
    }

    const data = this._getOrCreateResourceCollections();
    let collections = data.collections;
    let items = data.items;
    let collection = null;

    if (collectionId) {
      collection = collections.find((c) => c.id === collectionId) || null;
      if (!collection) {
        return {
          success: false,
          collection: null,
          collectionItem: null,
          message: "Collection not found."
        };
      }
    } else if (newCollectionName) {
      collection = {
        id: this._generateId("rcoll"),
        name: newCollectionName,
        description: "",
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      collections.push(collection);
    } else {
      return {
        success: false,
        collection: null,
        collectionItem: null,
        message: "Either collectionId or newCollectionName is required."
      };
    }

    // Avoid duplicate resource within same collection
    const existingItem = items.find((it) => it.collectionId === collection.id && it.resourceId === resourceId) || null;
    if (existingItem) {
      this._saveToStorage("resource_collections", collections);
      this._saveToStorage("resource_collection_items", items);
      return {
        success: true,
        collection,
        collectionItem: existingItem,
        message: "Resource already in collection."
      };
    }

    const sortOrder = items.length ? Math.max.apply(null, items.filter((i) => i.collectionId === collection.id).map((i) => i.sortOrder || 0).concat([0])) + 1 : 1;
    const collectionItem = {
      id: this._generateId("rcitem"),
      collectionId: collection.id,
      resourceId,
      addedAt: this._nowIso(),
      sortOrder
    };

    items.push(collectionItem);
    collection.updatedAt = this._nowIso();

    this._saveToStorage("resource_collections", collections);
    this._saveToStorage("resource_collection_items", items);

    return {
      success: true,
      collection,
      collectionItem,
      message: "Resource added to collection."
    };
  }

  // ----------------------
  // Interface: getResourceCollectionsSummary
  // ----------------------

  getResourceCollectionsSummary() {
    const { collections, items } = this._getOrCreateResourceCollections();
    return collections.map((c) => {
      const itemCount = items.filter((i) => i.collectionId === c.id).length;
      return {
        id: c.id,
        name: c.name,
        description: c.description,
        itemCount,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      };
    });
  }

  // ----------------------
  // Interface: getReadingList
  // ----------------------

  getReadingList() {
    const saved = this._getOrCreateReadingList();
    const resources = this._getFromStorage("resources", []);

    const items = saved
      .slice()
      .sort((a, b) => {
        const sa = typeof a.sortOrder === "number" ? a.sortOrder : 0;
        const sb = typeof b.sortOrder === "number" ? b.sortOrder : 0;
        if (sa !== sb) return sa - sb;
        const da = this._parseDate(a.savedAt) || new Date(0);
        const db = this._parseDate(b.savedAt) || new Date(0);
        return db - da;
      })
      .map((s) => {
        const res = resources.find((r) => r.id === s.resourceId) || null;
        return {
          savedResourceId: s.id,
          resourceId: s.resourceId,
          title: res ? res.title : "",
          summary: res ? res.summary : "",
          format: res ? res.format : null,
          durationMinutes: res ? res.durationMinutes : null,
          publicationDate: res ? res.publicationDate : null,
          savedAt: s.savedAt,
          sortOrder: s.sortOrder,
          notes: s.notes || "",
          // Foreign key resolution
          resource: res
        };
      });

    return items;
  }

  // ----------------------
  // Interface: getResourceCollectionsWithItems
  // ----------------------

  getResourceCollectionsWithItems() {
    const { collections, items } = this._getOrCreateResourceCollections();
    const resources = this._getFromStorage("resources", []);

    return collections.map((c) => {
      const colItems = items
        .filter((i) => i.collectionId === c.id)
        .sort((a, b) => {
          const sa = typeof a.sortOrder === "number" ? a.sortOrder : 0;
          const sb = typeof b.sortOrder === "number" ? b.sortOrder : 0;
          return sa - sb;
        })
        .map((i) => {
          const res = resources.find((r) => r.id === i.resourceId) || null;
          return {
            collectionItemId: i.id,
            resourceId: i.resourceId,
            title: res ? res.title : "",
            format: res ? res.format : null,
            durationMinutes: res ? res.durationMinutes : null,
            addedAt: i.addedAt,
            sortOrder: i.sortOrder,
            // Foreign key resolution
            resource: res
          };
        });

      return {
        collectionId: c.id,
        name: c.name,
        description: c.description,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        items: colItems,
        // Foreign key resolution for collectionId
        collection: c
      };
    });
  }

  // ----------------------
  // Interface: renameResourceCollection
  // ----------------------

  renameResourceCollection(collectionId, newName) {
    const data = this._getOrCreateResourceCollections();
    let collections = data.collections;
    const idx = collections.findIndex((c) => c.id === collectionId);
    if (idx === -1) {
      return {
        success: false,
        collection: null,
        message: "Collection not found."
      };
    }
    collections[idx].name = newName;
    collections[idx].updatedAt = this._nowIso();
    this._saveToStorage("resource_collections", collections);
    return {
      success: true,
      collection: {
        id: collections[idx].id,
        name: collections[idx].name,
        updatedAt: collections[idx].updatedAt
      },
      message: "Collection renamed."
    };
  }

  // ----------------------
  // Interface: updateResourceCollectionOrder
  // ----------------------

  updateResourceCollectionOrder(collectionId, itemOrder) {
    const data = this._getOrCreateResourceCollections();
    let items = data.items;
    if (!Array.isArray(itemOrder)) {
      return { success: false, message: "itemOrder must be an array." };
    }

    const orderMap = {};
    itemOrder.forEach((o) => {
      if (o && o.collectionItemId) {
        orderMap[o.collectionItemId] = o.sortOrder;
      }
    });

    items = items.map((it) => {
      if (it.collectionId === collectionId && Object.prototype.hasOwnProperty.call(orderMap, it.id)) {
        return Object.assign({}, it, { sortOrder: orderMap[it.id] });
      }
      return it;
    });

    this._saveToStorage("resource_collection_items", items);
    return {
      success: true,
      message: "Collection order updated."
    };
  }

  // ----------------------
  // Interface: removeResourceFromCollection
  // ----------------------

  removeResourceFromCollection(collectionItemId) {
    const data = this._getOrCreateResourceCollections();
    let items = data.items;
    const before = items.length;
    items = items.filter((i) => i.id !== collectionItemId);
    this._saveToStorage("resource_collection_items", items);
    const removed = before !== items.length;
    return {
      success: removed,
      message: removed ? "Resource removed from collection." : "Collection item not found."
    };
  }

  // ----------------------
  // Interface: getRelatedResources
  // ----------------------

  getRelatedResources(resourceId, limit) {
    const resources = this._getFromStorage("resources", []);
    const resource = resources.find((r) => r.id === resourceId) || null;
    if (!resource) return [];

    const limitVal = typeof limit === "number" && limit > 0 ? limit : 3;
    const topics = Array.isArray(resource.topics) ? resource.topics : [];

    let others = resources.filter((r) => r.id !== resourceId);

    others = others.map((r) => {
      const rTopics = Array.isArray(r.topics) ? r.topics : [];
      const shared = topics.filter((t) => rTopics.includes(t)).length;
      return Object.assign({}, r, { _sharedTopics: shared });
    });

    others.sort((a, b) => {
      if (b._sharedTopics !== a._sharedTopics) return b._sharedTopics - a._sharedTopics;
      const pa = typeof a.popularityScore === "number" ? a.popularityScore : 0;
      const pb = typeof b.popularityScore === "number" ? b.popularityScore : 0;
      return pb - pa;
    });

    return others.slice(0, limitVal).map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      format: r.format,
      durationMinutes: r.durationMinutes
    }));
  }

  // ----------------------
  // Interface: getProviderFilterOptions
  // ----------------------

  getProviderFilterOptions() {
    const specialties = [
      { value: "neurologist", label: "Neurologist" },
      { value: "movement_disorder_specialist", label: "Movement disorder specialist" },
      { value: "physical_therapist", label: "Physical therapist" },
      { value: "occupational_therapist", label: "Occupational therapist" },
      { value: "speech_therapist", label: "Speech therapist" },
      { value: "psychologist", label: "Psychologist" },
      { value: "social_worker", label: "Social worker" },
      { value: "primary_care_physician", label: "Primary care physician" },
      { value: "nurse_practitioner", label: "Nurse practitioner" },
      { value: "other", label: "Other" }
    ];

    const distanceOptions = [
      { miles: 5, label: "Within 5 miles" },
      { miles: 10, label: "Within 10 miles" },
      { miles: 15, label: "Within 15 miles" },
      { miles: 25, label: "Within 25 miles" },
      { miles: 50, label: "Within 50 miles" }
    ];

    const ratingThresholds = [
      { minRating: 3.0, label: "3.0+" },
      { minRating: 4.0, label: "4.0+" },
      { minRating: 4.5, label: "4.5+" }
    ];

    const sortOptions = [
      { value: "distance_nearest", label: "Distance: Nearest first" },
      { value: "rating_highest", label: "Rating: Highest first" },
      { value: "name_az", label: "Name A–Z" }
    ];

    return {
      specialties,
      distanceOptions,
      ratingThresholds,
      sortOptions
    };
  }

  // ----------------------
  // Interface: searchProviders
  // ----------------------

  searchProviders(zipCode, distanceMiles, specialties, acceptingNewPatientsOnly, acceptingNewParkinsonsPatientsOnly, minRating, sortBy) {
    const providers = this._getFromStorage("providers", []);
    const radius = typeof distanceMiles === "number" ? distanceMiles : null;
    const specialitiesArr = Array.isArray(specialties) ? specialties : [];

    let results = providers.slice();

    // Location / distance
    if (zipCode || radius !== null) {
      results = results.filter((p) => {
        if (radius !== null && typeof p.distanceMiles === "number" && p.distanceMiles > radius) {
          return false;
        }
        if (zipCode && p.zip && p.zip !== zipCode) {
          return false;
        }
        return true;
      });
    }

    // Specialties
    if (specialitiesArr.length) {
      results = results.filter((p) => specialitiesArr.includes(p.specialty));
    }

    if (acceptingNewPatientsOnly) {
      results = results.filter((p) => !!p.isAcceptingNewPatients);
    }

    if (acceptingNewParkinsonsPatientsOnly) {
      results = results.filter((p) => !!p.acceptingNewParkinsonsPatients);
    }

    if (typeof minRating === "number") {
      results = results.filter((p) => typeof p.rating === "number" && p.rating >= minRating);
    }

    const sort = sortBy || "distance_nearest";
    results.sort((a, b) => {
      if (sort === "distance_nearest") {
        const da = typeof a.distanceMiles === "number" ? a.distanceMiles : Number.POSITIVE_INFINITY;
        const db = typeof b.distanceMiles === "number" ? b.distanceMiles : Number.POSITIVE_INFINITY;
        return da - db;
      }
      if (sort === "rating_highest") {
        const ra = typeof a.rating === "number" ? a.rating : 0;
        const rb = typeof b.rating === "number" ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.ratingCount === "number" ? a.ratingCount : 0;
        const cb = typeof b.ratingCount === "number" ? b.ratingCount : 0;
        return cb - ca;
      }
      if (sort === "name_az") {
        const na = (a.fullName || "").toLowerCase();
        const nb = (b.fullName || "").toLowerCase();
        if (na < nb) return -1;
        if (na > nb) return 1;
        return 0;
      }
      return 0;
    });

    const mapped = results.map((p) => ({
      id: p.id,
      fullName: p.fullName,
      clinicName: p.clinicName,
      specialty: p.specialty,
      isAcceptingNewPatients: !!p.isAcceptingNewPatients,
      acceptingNewParkinsonsPatients: !!p.acceptingNewParkinsonsPatients,
      rating: p.rating,
      ratingCount: p.ratingCount,
      address1: p.address1,
      city: p.city,
      state: p.state,
      zip: p.zip,
      distanceMiles: typeof p.distanceMiles === "number" ? p.distanceMiles : undefined
    }));

    return {
      providers: mapped,
      totalCount: mapped.length
    };
  }

  // ----------------------
  // Interface: getProviderDetails
  // ----------------------

  getProviderDetails(providerId) {
    const providers = this._getFromStorage("providers", []);
    const provider = providers.find((p) => p.id === providerId) || null;

    if (!provider) {
      return {
        provider: null,
        isInCareTeam: false,
        savedProviderId: null
      };
    }

    const { savedProviders } = this._getOrCreateCareTeam();
    const saved = savedProviders.find((sp) => sp.providerId === providerId) || null;

    const providerDetails = {
      id: provider.id,
      fullName: provider.fullName,
      clinicName: provider.clinicName,
      specialty: provider.specialty,
      bio: provider.bio,
      isAcceptingNewPatients: !!provider.isAcceptingNewPatients,
      acceptingNewParkinsonsPatients: !!provider.acceptingNewParkinsonsPatients,
      rating: provider.rating,
      ratingCount: provider.ratingCount,
      address1: provider.address1,
      address2: provider.address2,
      city: provider.city,
      state: provider.state,
      zip: provider.zip,
      phoneNumber: provider.phoneNumber,
      email: provider.email,
      websiteUrl: provider.websiteUrl,
      officeHours: provider.officeHours,
      latitude: provider.latitude,
      longitude: provider.longitude
    };

    return {
      provider: providerDetails,
      isInCareTeam: !!saved,
      savedProviderId: saved ? saved.id : null,
      // Foreign key resolution for savedProviderId
      savedProvider: saved || null
    };
  }

  // ----------------------
  // Interface: saveProviderToCareTeam / removeProviderFromCareTeam / updateSavedProviderNotes
  // ----------------------

  saveProviderToCareTeam(providerId, label, notes) {
    const providers = this._getFromStorage("providers", []);
    const provider = providers.find((p) => p.id === providerId) || null;
    if (!provider) {
      return {
        success: false,
        savedProvider: null,
        message: "Provider not found."
      };
    }

    const careTeam = this._getOrCreateCareTeam();
    let savedProviders = careTeam.savedProviders;
    const existing = savedProviders.find((sp) => sp.providerId === providerId) || null;
    if (existing) {
      return {
        success: true,
        savedProvider: existing,
        message: "Provider already in care team."
      };
    }

    const savedProvider = {
      id: this._generateId("sprov"),
      providerId,
      label: label || "",
      notes: notes || "",
      addedAt: this._nowIso()
    };

    savedProviders.push(savedProvider);
    this._saveToStorage("saved_providers", savedProviders);

    return {
      success: true,
      savedProvider,
      message: "Provider added to care team."
    };
  }

  removeProviderFromCareTeam(savedProviderId) {
    const careTeam = this._getOrCreateCareTeam();
    let savedProviders = careTeam.savedProviders;
    const before = savedProviders.length;
    savedProviders = savedProviders.filter((sp) => sp.id !== savedProviderId);
    this._saveToStorage("saved_providers", savedProviders);
    const removed = before !== savedProviders.length;
    return {
      success: removed,
      message: removed ? "Provider removed from care team." : "Saved provider not found."
    };
  }

  updateSavedProviderNotes(savedProviderId, label, notes) {
    const careTeam = this._getOrCreateCareTeam();
    let savedProviders = careTeam.savedProviders;
    const idx = savedProviders.findIndex((sp) => sp.id === savedProviderId);
    if (idx === -1) {
      return {
        success: false,
        savedProvider: null,
        message: "Saved provider not found."
      };
    }

    if (label !== undefined) savedProviders[idx].label = label;
    if (notes !== undefined) savedProviders[idx].notes = notes;
    this._saveToStorage("saved_providers", savedProviders);

    return {
      success: true,
      savedProvider: {
        id: savedProviders[idx].id,
        label: savedProviders[idx].label,
        notes: savedProviders[idx].notes
      },
      message: "Saved provider updated."
    };
  }

  // ----------------------
  // Interface: getMyCareTeamAndGroups
  // ----------------------

  getMyCareTeamAndGroups() {
    const { savedProviders, savedGroups } = this._getOrCreateCareTeam();
    const providers = this._getFromStorage("providers", []);
    const events = this._getFromStorage("events", []);

    const providersOut = savedProviders.map((sp) => {
      const prov = providers.find((p) => p.id === sp.providerId) || null;
      return {
        savedProviderId: sp.id,
        providerId: sp.providerId,
        fullName: prov ? prov.fullName : "",
        clinicName: prov ? prov.clinicName : "",
        specialty: prov ? prov.specialty : null,
        phoneNumber: prov ? prov.phoneNumber : "",
        email: prov ? prov.email : "",
        label: sp.label || "",
        notes: sp.notes || "",
        // Foreign key resolution
        provider: prov
      };
    });

    const supportGroupsOut = savedGroups.map((sg) => {
      const ev = events.find((e) => e.id === sg.eventId) || null;
      return {
        savedSupportGroupId: sg.id,
        eventId: sg.eventId,
        title: ev ? ev.title : "",
        shortDescription: ev ? ev.shortDescription : "",
        nextMeetingDateTime: ev ? ev.startDateTime : null,
        deliveryMode: ev ? ev.deliveryMode : null,
        locationName: ev ? ev.locationName : "",
        // Foreign key resolution
        event: ev
      };
    });

    return {
      providers: providersOut,
      supportGroups: supportGroupsOut
    };
  }

  // ----------------------
  // Interface: getNotificationSettings / updateNotificationSettings
  // ----------------------

  getNotificationSettings() {
    const settings = this._getOrCreateNotificationSettings();
    const { id, ...rest } = settings;
    return rest;
  }

  updateNotificationSettings(settings) {
    const current = this._getOrCreateNotificationSettings();
    const updates = settings && typeof settings === "object" ? settings : {};
    const merged = Object.assign({}, current, updates, {
      updatedAt: this._nowIso()
    });
    this._saveToStorage("notification_settings", merged);
    const { id, ...publicSettings } = merged;
    return {
      success: true,
      notificationSettings: publicSettings,
      message: "Notification settings updated."
    };
  }

  // ----------------------
  // Forum interfaces
  // ----------------------

  getForumOverview() {
    const content = this._getFromStorage("forum_overview_content", {
      guidelinesTitle: "",
      guidelinesBody: "",
      popularCategoryIds: []
    });
    const categories = this._getFromStorage("forum_categories", []);
    return {
      guidelinesTitle: content.guidelinesTitle || "",
      guidelinesBody: content.guidelinesBody || "",
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        topicCount: c.topicCount
      })),
      popularCategoryIds: Array.isArray(content.popularCategoryIds) ? content.popularCategoryIds : []
    };
  }

  getForumCategoryWithTopics(categoryId, sortBy) {
    const categories = this._getFromStorage("forum_categories", []);
    const topics = this._getFromStorage("forum_topics", []);
    const cat = categories.find((c) => c.id === categoryId) || null;
    if (!cat) {
      return {
        category: null,
        topics: []
      };
    }

    let catTopics = topics.filter((t) => t.categoryId === categoryId);

    const sort = sortBy || "last_activity";
    catTopics.sort((a, b) => {
      if (sort === "last_activity") {
        const da = this._parseDate(a.lastActivityAt) || new Date(0);
        const db = this._parseDate(b.lastActivityAt) || new Date(0);
        return db - da;
      }
      if (sort === "most_replies") {
        return (b.replyCount || 0) - (a.replyCount || 0);
      }
      if (sort === "newest") {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      }
      return 0;
    });

    const topicsOut = catTopics.map((t) => ({
      topicId: t.id,
      title: t.title,
      bodyPreview: t.body && t.body.length > 200 ? t.body.slice(0, 200) + "..." : t.body,
      isAnonymous: !!t.isAnonymous,
      replyCount: t.replyCount || 0,
      createdAt: t.createdAt,
      lastActivityAt: t.lastActivityAt
    }));

    return {
      category: {
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        topicCount: cat.topicCount
      },
      topics: topicsOut
    };
  }

  createForumTopic(categoryId, title, body, isAnonymous) {
    const categories = this._getFromStorage("forum_categories", []);
    const topics = this._getFromStorage("forum_topics", []);

    const catIdx = categories.findIndex((c) => c.id === categoryId);
    if (catIdx === -1) {
      return {
        success: false,
        topic: null,
        message: "Forum category not found."
      };
    }

    const now = this._nowIso();
    const topic = {
      id: this._generateId("ftopic"),
      categoryId,
      title,
      body,
      isAnonymous: !!isAnonymous,
      createdAt: now,
      replyCount: 0,
      lastActivityAt: now
    };

    topics.push(topic);
    categories[catIdx].topicCount = (categories[catIdx].topicCount || 0) + 1;

    this._saveToStorage("forum_topics", topics);
    this._saveToStorage("forum_categories", categories);

    return {
      success: true,
      topic,
      message: "Topic created."
    };
  }

  getForumTopicWithPosts(topicId) {
    const topics = this._getFromStorage("forum_topics", []);
    const posts = this._getFromStorage("forum_posts", []);
    const categories = this._getFromStorage("forum_categories", []);

    const topic = topics.find((t) => t.id === topicId) || null;
    if (!topic) {
      return {
        topic: null,
        posts: []
      };
    }

    const topicPosts = posts
      .filter((p) => p.topicId === topicId)
      .sort((a, b) => {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return da - db;
      })
      .map((p) => ({
        postId: p.id,
        body: p.body,
        isAnonymous: !!p.isAnonymous,
        createdAt: p.createdAt
      }));

    const category = categories.find((c) => c.id === topic.categoryId) || null;

    return {
      topic: {
        id: topic.id,
        categoryId: topic.categoryId,
        title: topic.title,
        body: topic.body,
        isAnonymous: !!topic.isAnonymous,
        createdAt: topic.createdAt,
        replyCount: topic.replyCount || 0,
        lastActivityAt: topic.lastActivityAt,
        // Foreign key resolution
        category
      },
      posts: topicPosts
    };
  }

  replyToForumTopic(topicId, body, isAnonymous) {
    const topics = this._getFromStorage("forum_topics", []);
    const posts = this._getFromStorage("forum_posts", []);

    const idx = topics.findIndex((t) => t.id === topicId);
    if (idx === -1) {
      return {
        success: false,
        post: null,
        message: "Topic not found."
      };
    }

    const now = this._nowIso();
    const post = {
      id: this._generateId("fpost"),
      topicId,
      body,
      isAnonymous: !!isAnonymous,
      createdAt: now
    };

    posts.push(post);
    topics[idx].replyCount = (topics[idx].replyCount || 0) + 1;
    topics[idx].lastActivityAt = now;

    this._saveToStorage("forum_posts", posts);
    this._saveToStorage("forum_topics", topics);

    return {
      success: true,
      post,
      message: "Reply posted."
    };
  }

  // ----------------------
  // Interface: getAboutContent
  // ----------------------

  getAboutContent() {
    const about = this._getFromStorage("about_content", {
      missionTitle: "",
      missionBody: "",
      whoRunsTheGroup: "",
      whoWeServe: "",
      programsSummary: ""
    });
    return {
      missionTitle: about.missionTitle || "",
      missionBody: about.missionBody || "",
      whoRunsTheGroup: about.whoRunsTheGroup || "",
      whoWeServe: about.whoWeServe || "",
      programsSummary: about.programsSummary || ""
    };
  }

  // ----------------------
  // Interface: getContactPageData / submitContactRequest
  // ----------------------

  getContactPageData() {
    const contact = this._getFromStorage("contact_page_data", {
      primaryPhone: "",
      primaryEmail: "",
      meetingLocations: [],
      nonEmergencyDisclaimer: "",
      crisisResources: []
    });
    return {
      primaryPhone: contact.primaryPhone || "",
      primaryEmail: contact.primaryEmail || "",
      meetingLocations: Array.isArray(contact.meetingLocations) ? contact.meetingLocations : [],
      nonEmergencyDisclaimer: contact.nonEmergencyDisclaimer || "",
      crisisResources: Array.isArray(contact.crisisResources) ? contact.crisisResources : []
    };
  }

  submitContactRequest(name, email, phone, topic, message) {
    const requests = this._getFromStorage("contact_requests", []);
    const referenceId = this._generateId("contact");
    const req = {
      id: referenceId,
      name,
      email,
      phone: phone || "",
      topic: topic || "",
      message,
      createdAt: this._nowIso()
    };
    requests.push(req);
    this._saveToStorage("contact_requests", requests);
    return {
      success: true,
      referenceId,
      message: "Your request has been submitted."
    };
  }

  // ----------------------
  // Interface: getHelpFaqs
  // ----------------------

  getHelpFaqs() {
    const data = this._getFromStorage("help_faqs_data", {
      faqs: [],
      taskGuides: []
    });
    return {
      faqs: Array.isArray(data.faqs) ? data.faqs : [],
      taskGuides: Array.isArray(data.taskGuides) ? data.taskGuides : []
    };
  }

  // ----------------------
  // Interface: getPrivacyAndTermsContent
  // ----------------------

  getPrivacyAndTermsContent() {
    const data = this._getFromStorage("privacy_terms_content", {
      privacyPolicyHtml: "",
      termsOfUseHtml: "",
      medicalDisclaimerText: "",
      cookiePolicyText: ""
    });
    return {
      privacyPolicyHtml: data.privacyPolicyHtml || "",
      termsOfUseHtml: data.termsOfUseHtml || "",
      medicalDisclaimerText: data.medicalDisclaimerText || "",
      cookiePolicyText: data.cookiePolicyText || ""
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
