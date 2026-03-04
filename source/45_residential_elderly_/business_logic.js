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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const ensure = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensure("rooms", []);
    ensure("shortlisted_rooms", []);
    ensure("care_plans", []);
    ensure("selected_care_plans", []);
    ensure("care_plan_inquiries", []);
    ensure("tour_requests", []);
    ensure("housing_options", []);
    ensure("care_level_options", []);
    ensure("additional_service_options", []);
    ensure("therapy_service_options", []);
    ensure("transportation_plan_options", []);
    ensure("cost_estimates", []);
    ensure("activities", []);
    ensure("visit_plan_items", []);
    ensure("resident_applications", []);
    ensure("transportation_services", []);
    ensure("transportation_reservations", []);
    ensure("dishes", []);
    ensure("menu_items", []);
    ensure("meal_plan_items", []);
    ensure("staff_members", []);
    ensure("staff_contact_messages", []);

    // Content/config tables (empty skeletons so callers can rely on shape)
    ensure("home_page_content", {
      introHeadline: "",
      introBody: "",
      featuredRooms: [],
      featuredCarePlans: [],
      testimonials: [],
      primaryCallsToAction: []
    });

    ensure("pricing_overview_content", {
      overviewSections: [],
      billingFaqs: []
    });

    ensure("dining_overview_and_filters", {
      overviewSections: [],
      mealTypes: [
        { value: "breakfast", label: "Breakfast" },
        { value: "lunch", label: "Lunch" },
        { value: "dinner", label: "Dinner" },
        { value: "snack", label: "Snack" }
      ],
      dietaryFilters: [
        { code: "diabetic_friendly", label: "Diabetic-friendly" },
        { code: "low_sodium", label: "Low sodium" },
        { code: "vegetarian", label: "Vegetarian" },
        { code: "vegan", label: "Vegan" },
        { code: "gluten_free", label: "Gluten-free" },
        { code: "low_carb", label: "Low carb" },
        { code: "heart_healthy", label: "Heart healthy" }
      ],
      maxCaloriesDefault: 800
    });

    ensure("application_types", [
      {
        code: "new_resident_application",
        label: "New Resident Application",
        description: "Apply for a new resident to move into our community."
      }
    ]);

    ensure("about_us_content", {
      mission: "",
      values: "",
      servicesOverview: "",
      address: "",
      directions: "",
      mainPhone: "",
      generalEmail: "",
      privacySummary: "",
      termsSummary: ""
    });

    ensure("about_us_faqs", []);

    // Tour scheduling options config
    if (localStorage.getItem("tour_scheduling_options") === null) {
      const today = new Date();
      const nextYear = new Date(today.getTime());
      nextYear.setFullYear(today.getFullYear() + 1);
      const options = {
        tourTypes: [
          { value: "in_person", label: "In-person tour" },
          { value: "virtual", label: "Virtual tour" }
        ],
        timeSlots: [
          "09:00 AM",
          "10:00 AM",
          "11:00 AM",
          "01:00 PM",
          "02:00 PM",
          "03:00 PM"
        ],
        minDate: this._formatDateYYYYMMDD(today),
        maxDate: this._formatDateYYYYMMDD(nextYear)
      };
      localStorage.setItem("tour_scheduling_options", JSON.stringify(options));
    }

    if (localStorage.getItem("idCounter") === null) {
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

  // ------------------------
  // Generic date/time helpers
  // ------------------------

  _formatDateYYYYMMDD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  _parseYYYYMMDD(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return null;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  _parseTimeLabel(timeLabel) {
    // Expects formats like '9:00 AM', '10:30 PM'
    if (!timeLabel) {
      return { hours: 0, minutes: 0 };
    }
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(timeLabel.trim());
    if (!match) {
      return { hours: 0, minutes: 0 };
    }
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const meridiem = match[3].toUpperCase();
    if (meridiem === "AM") {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }
    return { hours, minutes };
  }

  _normalizeAndParseDateInputs(dateStr, timeLabel) {
    // Returns ISO 8601 datetime string for storage
    const date = this._parseYYYYMMDD(dateStr);
    if (!date) return null;
    const { hours, minutes } = this._parseTimeLabel(timeLabel);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  }

  // ------------------------
  // Helper: My Plan state
  // ------------------------

  _getOrCreateMyPlanState() {
    // For this single-user implementation, My Plan is just a view over
    // the various entity tables. This helper loads the raw records.
    return {
      shortlistedRooms: this._getFromStorage("shortlisted_rooms"),
      selectedCarePlans: this._getFromStorage("selected_care_plans"),
      costEstimates: this._getFromStorage("cost_estimates"),
      visitPlanItems: this._getFromStorage("visit_plan_items"),
      mealPlanItems: this._getFromStorage("meal_plan_items"),
      tourRequests: this._getFromStorage("tour_requests"),
      transportationReservations: this._getFromStorage("transportation_reservations")
    };
  }

  // ------------------------
  // Helper: Cost calculation
  // ------------------------

  _calculateCostEstimateTotal(housingOptionId, careLevelOptionId, additionalServiceOptionIds, physicalTherapyFrequency, transportationPlanOptionId) {
    const housingOptions = this._getFromStorage("housing_options");
    const careLevelOptions = this._getFromStorage("care_level_options");
    const additionalServiceOptions = this._getFromStorage("additional_service_options");
    const therapyServiceOptions = this._getFromStorage("therapy_service_options");
    const transportationPlanOptions = this._getFromStorage("transportation_plan_options");

    const housingOption = housingOptions.find(h => h.id === housingOptionId) || null;
    const careLevelOption = careLevelOptions.find(c => c.id === careLevelOptionId) || null;
    const transportationPlanOption = transportationPlanOptions.find(t => t.id === transportationPlanOptionId) || null;

    const selectedAdditionalServices = (additionalServiceOptionIds || [])
      .map(id => additionalServiceOptions.find(s => s.id === id))
      .filter(Boolean);

    const physicalTherapyOption = therapyServiceOptions.find(t => t.therapy_type === "physical_therapy") || null;

    let total = 0;
    const breakdown = [];

    if (housingOption) {
      total += housingOption.base_monthly_price || 0;
      breakdown.push(`Housing (${housingOption.label}): $${housingOption.base_monthly_price}`);
    }

    if (careLevelOption) {
      total += careLevelOption.base_monthly_price || 0;
      breakdown.push(`Care level (${careLevelOption.label}): $${careLevelOption.base_monthly_price}`);
    }

    let additionalTotal = 0;
    selectedAdditionalServices.forEach(svc => {
      const units = svc.default_units_per_period != null ? svc.default_units_per_period : 1;
      let monthlyCost = 0;
      switch (svc.billing_frequency) {
        case "monthly":
          monthlyCost = svc.price_per_unit * units;
          break;
        case "per_week":
          monthlyCost = svc.price_per_unit * units * 4; // approx 4 weeks / month
          break;
        case "per_day":
          monthlyCost = svc.price_per_unit * units * 30; // approx 30 days / month
          break;
        case "per_visit":
          monthlyCost = svc.price_per_unit * units; // interpret units as visits per month
          break;
        default:
          monthlyCost = svc.price_per_unit * units;
      }
      additionalTotal += monthlyCost;
      breakdown.push(`Service (${svc.label}): $${monthlyCost}`);
    });
    total += additionalTotal;

    // Physical therapy
    let ptMonthly = 0;
    if (physicalTherapyOption) {
      const perSession = physicalTherapyOption.base_price_per_session || 0;
      let sessionsPerMonth = 0;
      if (physicalTherapyFrequency === "1x_per_week") sessionsPerMonth = 4;
      else if (physicalTherapyFrequency === "2x_per_week") sessionsPerMonth = 8;
      else if (physicalTherapyFrequency === "3x_per_week") sessionsPerMonth = 12;
      else sessionsPerMonth = 0;
      ptMonthly = perSession * sessionsPerMonth;
      if (ptMonthly > 0) {
        breakdown.push(`Physical therapy (${physicalTherapyFrequency.replace(/_/g, " ")}): $${ptMonthly}`);
      }
    }
    total += ptMonthly;

    if (transportationPlanOption) {
      total += transportationPlanOption.monthly_price || 0;
      breakdown.push(`Transportation (${transportationPlanOption.label}): $${transportationPlanOption.monthly_price}`);
    }

    breakdown.push(`Total monthly estimate: $${total}`);

    return {
      totalMonthlyCost: total,
      breakdownNotes: breakdown.join("; ")
    };
  }

  // ------------------------
  // Helper: Tour validation
  // ------------------------

  _validateTourSlotAvailability(date, time, tourType) {
    const optionsRaw = localStorage.getItem("tour_scheduling_options");
    const options = optionsRaw ? JSON.parse(optionsRaw) : null;
    if (!options) return; // nothing to validate against

    const { minDate, maxDate, timeSlots, tourTypes } = options;

    // Ensure tourType is supported
    if (tourTypes && tourTypes.length) {
      const allowed = tourTypes.some(t => t.value === tourType);
      if (!allowed) {
        throw new Error("Requested tour type is not available.");
      }
    }

    // Validate date range (YYYY-MM-DD lexicographical compare is safe)
    if (minDate && date < minDate) {
      throw new Error("Requested tour date is earlier than allowed.");
    }
    if (maxDate && date > maxDate) {
      throw new Error("Requested tour date is later than allowed.");
    }

    // Validate time slot
    if (Array.isArray(timeSlots) && timeSlots.length) {
      if (!timeSlots.includes(time)) {
        throw new Error("Requested tour time is not available.");
      }
    }
    // Capacity/overbooking logic could be added here if needed.
  }

  // ------------------------
  // Helper: Transportation validation
  // ------------------------

  _validateTransportationReservationTime(transportationServiceId, date, time) {
    const services = this._getFromStorage("transportation_services");
    const service = services.find(s => s.id === transportationServiceId);
    if (!service) {
      throw new Error("Transportation service not found.");
    }

    // Check operating days if provided
    const jsDate = this._parseYYYYMMDD(date);
    if (jsDate && Array.isArray(service.operating_days) && service.operating_days.length) {
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const dayName = dayNames[jsDate.getDay()];
      if (!service.operating_days.includes(dayName)) {
        throw new Error("Transportation service does not operate on the selected day.");
      }
    }

    // Check operating hours if provided
    if (service.start_time && service.end_time && time) {
      const req = this._parseTimeLabel(time);
      const start = this._parseTimeLabel(service.start_time);
      const end = this._parseTimeLabel(service.end_time);
      const reqMinutes = req.hours * 60 + req.minutes;
      const startMinutes = start.hours * 60 + start.minutes;
      const endMinutes = end.hours * 60 + end.minutes;
      if (reqMinutes < startMinutes || reqMinutes > endMinutes) {
        throw new Error("Transportation reservation time is outside service operating hours.");
      }
    }
  }

  // ------------------------
  // Interface: getHomePageContent
  // ------------------------

  getHomePageContent() {
    const content = this._getFromStorage("home_page_content");
    // Ensure arrays exist
    return {
      introHeadline: content.introHeadline || "",
      introBody: content.introBody || "",
      featuredRooms: Array.isArray(content.featuredRooms) ? content.featuredRooms : [],
      featuredCarePlans: Array.isArray(content.featuredCarePlans) ? content.featuredCarePlans : [],
      testimonials: Array.isArray(content.testimonials) ? content.testimonials : [],
      primaryCallsToAction: Array.isArray(content.primaryCallsToAction) ? content.primaryCallsToAction : []
    };
  }

  // ------------------------
  // Room search & shortlist (Task 1)
  // ------------------------

  getRoomFilterOptions() {
    const rooms = this._getFromStorage("rooms");
    const prices = rooms.map(r => r.monthly_price || 0);
    const min = prices.length ? Math.min.apply(null, prices) : 0;
    const max = prices.length ? Math.max.apply(null, prices) : 0;

    return {
      roomTypes: [
        { value: "private_studio", label: "Private Studio" },
        { value: "shared_suite", label: "Shared Suite" },
        { value: "one_bedroom", label: "One Bedroom" },
        { value: "two_bedroom", label: "Two Bedroom" },
        { value: "companion_room", label: "Companion Room" },
        { value: "other", label: "Other" }
      ],
      featureOptions: ["private_bathroom", "ground_floor", "balcony", "kitchenette"],
      floorLevels: [
        { value: "ground", label: "Ground floor" },
        { value: "second", label: "Second floor" },
        { value: "third", label: "Third floor" },
        { value: "fourth", label: "Fourth floor" },
        { value: "other", label: "Other" }
      ],
      priceRange: { min, max },
      sortOptions: [
        { value: "size_desc", label: "Size (Largest first)" },
        { value: "size_asc", label: "Size (Smallest first)" },
        { value: "price_asc", label: "Price: Low to High" },
        { value: "price_desc", label: "Price: High to Low" }
      ]
    };
  }

  searchRooms(filters, sort, page = 1, pageSize = 20) {
    const rooms = this._getFromStorage("rooms");
    let results = rooms.slice();

    const f = filters || {};
    const s = sort || {};

    // Filters
    if (f.roomType) {
      results = results.filter(r => r.room_type === f.roomType);
    }
    if (typeof f.minMonthlyPrice === "number") {
      results = results.filter(r => (r.monthly_price || 0) >= f.minMonthlyPrice);
    }
    if (typeof f.maxMonthlyPrice === "number") {
      results = results.filter(r => (r.monthly_price || 0) <= f.maxMonthlyPrice);
    }
    if (typeof f.hasPrivateBathroom === "boolean") {
      results = results.filter(r => !!r.has_private_bathroom === f.hasPrivateBathroom);
    }
    if (f.floorLevel) {
      results = results.filter(r => r.floor_level === f.floorLevel);
    }
    if (Array.isArray(f.features) && f.features.length) {
      results = results.filter(r => {
        const roomFeatures = Array.isArray(r.features) ? r.features : [];
        return f.features.every(ft => roomFeatures.includes(ft));
      });
    }
    if (f.onlyAvailable !== false) {
      results = results.filter(r => r.is_available !== false);
    }

    // Sorting
    if (s.sortBy) {
      const dir = s.sortDirection === "desc" ? -1 : 1;
      const sortBy = s.sortBy;
      results.sort((a, b) => {
        const av = a[sortBy];
        const bv = b[sortBy];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    const totalCount = results.length;
    const start = (page - 1) * pageSize;
    const paged = results.slice(start, start + pageSize);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        "task1_roomSearchParams",
        JSON.stringify({
          filters: filters || {},
          sort: sort || {},
          page,
          pageSize,
          timestamp: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return {
      results: paged,
      totalCount,
      page,
      pageSize
    };
  }

  getRoomDetails(roomId) {
    const rooms = this._getFromStorage("rooms");
    return rooms.find(r => r.id === roomId) || null;
  }

  getRelatedRooms(roomId, limit = 4) {
    const rooms = this._getFromStorage("rooms");
    const base = rooms.find(r => r.id === roomId);
    if (!base) return [];
    const related = rooms
      .filter(r => r.id !== roomId && r.room_type === base.room_type)
      .slice(0, limit);
    return related;
  }

  addRoomToShortlist(roomId, notes) {
    const rooms = this._getFromStorage("rooms");
    const room = rooms.find(r => r.id === roomId) || null;
    const shortlisted = this._getFromStorage("shortlisted_rooms");

    const newItem = {
      id: this._generateId("shortlisted_room"),
      room_id: roomId,
      added_at: new Date().toISOString(),
      notes: notes || ""
    };

    shortlisted.push(newItem);
    this._saveToStorage("shortlisted_rooms", shortlisted);

    return {
      shortlistedRoom: {
        ...newItem,
        room
      },
      message: "Room added to shortlist."
    };
  }

  getShortlistedRooms() {
    const rooms = this._getFromStorage("rooms");
    const shortlisted = this._getFromStorage("shortlisted_rooms");
    return shortlisted.map(item => ({
      ...item,
      room: rooms.find(r => r.id === item.room_id) || null
    }));
  }

  // ------------------------
  // Care plans & inquiries (Task 3)
  // ------------------------

  getCarePlanFilterOptions() {
    const plans = this._getFromStorage("care_plans");
    const prices = plans.map(p => p.monthly_price || 0);
    const min = prices.length ? Math.min.apply(null, prices) : 0;
    const max = prices.length ? Math.max.apply(null, prices) : 0;

    return {
      careTypes: [
        { value: "assisted_living", label: "Assisted Living" },
        { value: "memory_care", label: "Memory Care" },
        { value: "independent_living", label: "Independent Living" },
        { value: "skilled_nursing", label: "Skilled Nursing" },
        { value: "respite_care", label: "Respite Care" }
      ],
      mealOptions: [
        { value: 1, label: "1+ meals daily" },
        { value: 2, label: "2+ meals daily" },
        { value: 3, label: "3+ meals daily" }
      ],
      priceRange: { min, max },
      sortOptions: [
        { value: "price_asc", label: "Price: Low to High" },
        { value: "price_desc", label: "Price: High to Low" }
      ]
    };
  }

  searchCarePlans(filters, sort) {
    const plans = this._getFromStorage("care_plans");
    let results = plans.slice();
    const f = filters || {};
    const s = sort || {};

    if (f.careType) {
      results = results.filter(p => p.care_type === f.careType);
    }
    if (typeof f.minMealsPerDay === "number") {
      results = results.filter(p => (p.meals_per_day || 0) >= f.minMealsPerDay);
    }
    if (typeof f.maxMonthlyPrice === "number") {
      results = results.filter(p => (p.monthly_price || 0) <= f.maxMonthlyPrice);
    }
    if (f.onlyActive !== false) {
      results = results.filter(p => p.is_active !== false);
    }

    if (s.sortBy) {
      const dir = s.sortDirection === "desc" ? -1 : 1;
      const sortBy = s.sortBy;
      results.sort((a, b) => {
        const av = a[sortBy];
        const bv = b[sortBy];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        "task3_carePlanSearchParams",
        JSON.stringify({
          filters: filters || {},
          sort: sort || {},
          timestamp: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return results;
  }

  getCarePlanDetails(carePlanId) {
    const plans = this._getFromStorage("care_plans");
    return plans.find(p => p.id === carePlanId) || null;
  }

  selectCarePlan(carePlanId, notes) {
    const plans = this._getFromStorage("care_plans");
    const plan = plans.find(p => p.id === carePlanId) || null;
    const selected = this._getFromStorage("selected_care_plans");

    const newItem = {
      id: this._generateId("selected_care_plan"),
      care_plan_id: carePlanId,
      selected_at: new Date().toISOString(),
      notes: notes || ""
    };

    selected.push(newItem);
    this._saveToStorage("selected_care_plans", selected);

    return {
      selectedCarePlan: {
        ...newItem,
        care_plan: plan
      },
      message: "Care plan selected."
    };
  }

  submitCarePlanInquiry(carePlanId, residentName, preferredStartDate, contactPhone, contactEmail, preferredContactMethod, additionalNotes) {
    const plans = this._getFromStorage("care_plans");
    const plan = plans.find(p => p.id === carePlanId) || null;
    const inquiries = this._getFromStorage("care_plan_inquiries");

    const preferredStartIso = this._normalizeAndParseDateInputs(preferredStartDate);

    const inquiry = {
      id: this._generateId("care_plan_inquiry"),
      care_plan_id: carePlanId,
      resident_name: residentName,
      preferred_start_date: preferredStartIso,
      contact_phone: contactPhone || "",
      contact_email: contactEmail || "",
      preferred_contact_method: preferredContactMethod || "either",
      additional_notes: additionalNotes || "",
      created_at: new Date().toISOString(),
      status: "submitted"
    };

    inquiries.push(inquiry);
    this._saveToStorage("care_plan_inquiries", inquiries);

    return {
      inquiry: {
        ...inquiry,
        care_plan: plan
      },
      message: "Care plan inquiry submitted."
    };
  }

  // ------------------------
  // Tours (Task 2)
  // ------------------------

  getTourSchedulingOptions() {
    const data = localStorage.getItem("tour_scheduling_options");
    if (!data) {
      // Should not happen because _initStorage seeds it, but fall back safely
      return {
        tourTypes: [],
        timeSlots: [],
        minDate: null,
        maxDate: null
      };
    }
    const parsed = JSON.parse(data);
    return {
      tourTypes: Array.isArray(parsed.tourTypes) ? parsed.tourTypes : [],
      timeSlots: Array.isArray(parsed.timeSlots) ? parsed.timeSlots : [],
      minDate: parsed.minDate || null,
      maxDate: parsed.maxDate || null
    };
  }

  createTourRequest(tourType, date, time, visitorRelationship, visitorFullName, visitorPhone, visitorEmail, accessibilityMobilityAssistance, otherAccessibilityNeeds) {
    this._validateTourSlotAvailability(date, time, tourType);

    const tourRequests = this._getFromStorage("tour_requests");
    const startIso = this._normalizeAndParseDateInputs(date, time);

    const tourRequest = {
      id: this._generateId("tour_request"),
      tour_type: tourType,
      start_datetime: startIso,
      visitor_relationship: visitorRelationship,
      visitor_full_name: visitorFullName,
      visitor_phone: visitorPhone,
      visitor_email: visitorEmail,
      accessibility_mobility_assistance: !!accessibilityMobilityAssistance,
      other_accessibility_needs: otherAccessibilityNeeds || "",
      created_at: new Date().toISOString(),
      status: "pending"
    };

    tourRequests.push(tourRequest);
    this._saveToStorage("tour_requests", tourRequests);

    return {
      tourRequest,
      message: "Tour request submitted."
    };
  }

  // ------------------------
  // Pricing overview & cost calculator (Task 4)
  // ------------------------

  getPricingOverviewContent() {
    const content = this._getFromStorage("pricing_overview_content");
    return {
      overviewSections: Array.isArray(content.overviewSections) ? content.overviewSections : [],
      billingFaqs: Array.isArray(content.billingFaqs) ? content.billingFaqs : []
    };
  }

  getCostCalculatorOptions() {
    const housingOptions = this._getFromStorage("housing_options").filter(h => h.is_active !== false);
    const careLevelOptions = this._getFromStorage("care_level_options").filter(c => c.is_active !== false);
    const additionalServiceOptions = this._getFromStorage("additional_service_options").filter(a => a.is_active !== false);
    const therapyServiceOptions = this._getFromStorage("therapy_service_options").filter(t => t.is_active !== false);
    const transportationPlanOptions = this._getFromStorage("transportation_plan_options").filter(t => t.is_active !== false);

    return {
      housingOptions,
      careLevelOptions,
      additionalServiceOptions,
      therapyServiceOptions,
      transportationPlanOptions
    };
  }

  calculateCostEstimatePreview(housingOptionId, careLevelOptionId, additionalServiceOptionIds, physicalTherapyFrequency, transportationPlanOptionId) {
    const { totalMonthlyCost, breakdownNotes } = this._calculateCostEstimateTotal(
      housingOptionId,
      careLevelOptionId,
      additionalServiceOptionIds,
      physicalTherapyFrequency,
      transportationPlanOptionId
    );
    return {
      totalMonthlyCost,
      breakdownNotes
    };
  }

  saveCostEstimateToMyPlan(housingOptionId, careLevelOptionId, additionalServiceOptionIds, physicalTherapyFrequency, transportationPlanOptionId) {
    const { totalMonthlyCost, breakdownNotes } = this._calculateCostEstimateTotal(
      housingOptionId,
      careLevelOptionId,
      additionalServiceOptionIds,
      physicalTherapyFrequency,
      transportationPlanOptionId
    );

    const estimates = this._getFromStorage("cost_estimates");

    const estimate = {
      id: this._generateId("cost_estimate"),
      created_at: new Date().toISOString(),
      housing_option_id: housingOptionId,
      care_level_option_id: careLevelOptionId,
      additional_service_option_ids: additionalServiceOptionIds || [],
      physical_therapy_frequency: physicalTherapyFrequency,
      transportation_plan_option_id: transportationPlanOptionId,
      total_monthly_cost: totalMonthlyCost,
      breakdown_notes: breakdownNotes,
      is_saved_to_my_plan: true
    };

    estimates.push(estimate);
    this._saveToStorage("cost_estimates", estimates);

    // Resolve foreign keys
    const housingOptions = this._getFromStorage("housing_options");
    const careLevelOptions = this._getFromStorage("care_level_options");
    const additionalServiceOptions = this._getFromStorage("additional_service_options");
    const transportationPlanOptions = this._getFromStorage("transportation_plan_options");

    const resolved = {
      ...estimate,
      housing_option: housingOptions.find(h => h.id === estimate.housing_option_id) || null,
      care_level_option: careLevelOptions.find(c => c.id === estimate.care_level_option_id) || null,
      additional_service_options: (estimate.additional_service_option_ids || [])
        .map(id => additionalServiceOptions.find(a => a.id === id))
        .filter(Boolean),
      transportation_plan_option: transportationPlanOptions.find(t => t.id === estimate.transportation_plan_option_id) || null
    };

    return {
      costEstimate: resolved,
      message: "Cost estimate saved to My Plan."
    };
  }

  // ------------------------
  // Activities & Visit Plan (Task 5)
  // ------------------------

  getActivityFilterOptions() {
    const activities = this._getFromStorage("activities");
    const categoriesEnum = [
      "music",
      "light_exercise",
      "arts_crafts",
      "games",
      "education",
      "social",
      "religious_spiritual",
      "outdoor",
      "other"
    ];

    const categories = categoriesEnum.map(value => ({
      value,
      label: value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    }));

    let minDate = null;
    let maxDate = null;
    if (activities.length) {
      const dates = activities.map(a => new Date(a.start_datetime));
      const minD = new Date(Math.min.apply(null, dates));
      const maxD = new Date(Math.max.apply(null, dates));
      minDate = this._formatDateYYYYMMDD(minD);
      maxDate = this._formatDateYYYYMMDD(maxD);
    }

    return {
      categories,
      minDate,
      maxDate
    };
  }

  searchActivities(startDate, endDate, categories) {
    const activities = this._getFromStorage("activities");
    const start = this._parseYYYYMMDD(startDate);
    const end = this._parseYYYYMMDD(endDate);
    const cats = Array.isArray(categories) && categories.length ? categories : null;

    let results = activities.slice();

    if (start && end) {
      results = results.filter(a => {
        const d = new Date(a.start_datetime);
        return d >= start && d <= end;
      });
    }

    if (cats) {
      results = results.filter(a => cats.includes(a.category));
    }

    results.sort((a, b) => {
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      return da - db;
    });

    // Instrumentation for task completion tracking
    try {
      if (Array.isArray(categories) && categories.includes("music")) {
        localStorage.setItem(
          "task5_musicActivitySearchParams",
          JSON.stringify({
            startDate,
            endDate,
            categories: categories || [],
            timestamp: new Date().toISOString()
          })
        );
      }
      if (Array.isArray(categories) && categories.includes("light_exercise")) {
        localStorage.setItem(
          "task5_lightExerciseActivitySearchParams",
          JSON.stringify({
            startDate,
            endDate,
            categories: categories || [],
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return results;
  }

  getActivityDetails(activityId) {
    const activities = this._getFromStorage("activities");
    const activity = activities.find(a => a.id === activityId) || null;
    if (!activity) return null;
    return activity;
  }

  addActivityToVisitPlan(activityId, notes) {
    const activities = this._getFromStorage("activities");
    const activity = activities.find(a => a.id === activityId) || null;
    const visitPlanItems = this._getFromStorage("visit_plan_items");

    const item = {
      id: this._generateId("visit_plan_item"),
      activity_id: activityId,
      added_at: new Date().toISOString(),
      notes: notes || ""
    };

    visitPlanItems.push(item);
    this._saveToStorage("visit_plan_items", visitPlanItems);

    return {
      visitPlanItem: {
        ...item,
        activity
      },
      message: "Activity added to visit plan."
    };
  }

  // ------------------------
  // Resident Application (Task 6)
  // ------------------------

  getApplicationTypes() {
    const types = this._getFromStorage("application_types");
    return Array.isArray(types) ? types : [];
  }

  submitResidentApplication(
    residentFirstName,
    residentLastName,
    residentDateOfBirth,
    residentGender,
    primaryContactName,
    primaryContactRelationship,
    primaryContactPhone,
    primaryContactEmail,
    needAssistanceWithBathing,
    needAssistanceWithDressing,
    needMedicationReminders,
    preferredLivingOption,
    preferredMoveInDate,
    agreedToTerms
  ) {
    const applications = this._getFromStorage("resident_applications");

    const dobIso = this._normalizeAndParseDateInputs(residentDateOfBirth);
    const moveInIso = this._normalizeAndParseDateInputs(preferredMoveInDate);

    const application = {
      id: this._generateId("resident_application"),
      resident_first_name: residentFirstName,
      resident_last_name: residentLastName,
      resident_date_of_birth: dobIso,
      resident_gender: residentGender,
      primary_contact_name: primaryContactName,
      primary_contact_relationship: primaryContactRelationship,
      primary_contact_phone: primaryContactPhone,
      primary_contact_email: primaryContactEmail,
      need_assistance_with_bathing: !!needAssistanceWithBathing,
      need_assistance_with_dressing: !!needAssistanceWithDressing,
      need_medication_reminders: !!needMedicationReminders,
      preferred_living_option: preferredLivingOption,
      preferred_move_in_date: moveInIso,
      agreed_to_terms: !!agreedToTerms,
      submitted_at: new Date().toISOString(),
      status: "submitted",
      internal_notes: ""
    };

    applications.push(application);
    this._saveToStorage("resident_applications", applications);

    return {
      application,
      message: "Resident application submitted."
    };
  }

  // ------------------------
  // Transportation services & reservations (Task 7)
  // ------------------------

  getTransportationFilterOptions() {
    return {
      purposes: [
        { value: "medical_appointments", label: "Medical Appointments" },
        { value: "shopping", label: "Shopping" },
        { value: "recreation", label: "Recreation" },
        { value: "religious_services", label: "Religious Services" },
        { value: "other", label: "Other" }
      ],
      costOptions: [
        { value: "no_additional_cost", label: "No additional cost" },
        { value: "flat_fee", label: "Flat fee" },
        { value: "per_mile", label: "Per mile" },
        { value: "included_in_rent", label: "Included in rent" }
      ],
      daysPerWeekOptions: [1, 2, 3, 4, 5, 6, 7]
    };
  }

  searchTransportationServices(filters) {
    const services = this._getFromStorage("transportation_services");
    const f = filters || {};
    let results = services.slice();

    if (f.purpose) {
      results = results.filter(s => s.purpose === f.purpose);
    }
    if (f.noAdditionalCostOnly) {
      // Treat 'free' and 'included_in_rent' as no additional cost
      results = results.filter(s => s.cost_type === "free" || s.cost_type === "included_in_rent");
    }
    if (typeof f.minDaysPerWeek === "number") {
      results = results.filter(s => (s.days_per_week || 0) >= f.minDaysPerWeek);
    }
    if (f.onlyActive !== false) {
      results = results.filter(s => s.is_active !== false);
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        "task7_transportSearchParams",
        JSON.stringify({
          filters: filters || {},
          timestamp: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    return results;
  }

  getTransportationServiceDetails(transportationServiceId) {
    const services = this._getFromStorage("transportation_services");
    return services.find(s => s.id === transportationServiceId) || null;
  }

  reserveTransportationSeat(transportationServiceId, date, time, residentName, notes) {
    this._validateTransportationReservationTime(transportationServiceId, date, time);

    const reservations = this._getFromStorage("transportation_reservations");
    const reservationDatetime = this._normalizeAndParseDateInputs(date, time);

    const reservation = {
      id: this._generateId("transportation_reservation"),
      transportation_service_id: transportationServiceId,
      reservation_datetime: reservationDatetime,
      resident_name: residentName,
      created_at: new Date().toISOString(),
      status: "requested",
      notes: notes || ""
    };

    reservations.push(reservation);
    this._saveToStorage("transportation_reservations", reservations);

    const services = this._getFromStorage("transportation_services");
    const service = services.find(s => s.id === transportationServiceId) || null;

    return {
      reservation: {
        ...reservation,
        transportation_service: service
      },
      message: "Transportation seat reserved."
    };
  }

  // ------------------------
  // Dining & Meal Plan (Task 8)
  // ------------------------

  getDiningOverviewAndMenuFilters() {
    const cfg = this._getFromStorage("dining_overview_and_filters");
    return {
      overviewSections: Array.isArray(cfg.overviewSections) ? cfg.overviewSections : [],
      mealTypes: Array.isArray(cfg.mealTypes) ? cfg.mealTypes : [],
      dietaryFilters: Array.isArray(cfg.dietaryFilters) ? cfg.dietaryFilters : [],
      maxCaloriesDefault: typeof cfg.maxCaloriesDefault === "number" ? cfg.maxCaloriesDefault : 800
    };
  }

  getMenuItemsForDateAndMeal(date, mealType, dietaryFilters, maxCalories) {
    const menuItems = this._getFromStorage("menu_items");
    const dishes = this._getFromStorage("dishes");

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        "task8_menuFilterParams",
        JSON.stringify({
          date,
          mealType,
          dietaryFilters: Array.isArray(dietaryFilters) ? dietaryFilters : [],
          maxCalories: maxCalories,
          timestamp: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error("Instrumentation error:", e);
    }

    const datePrefix = date; // expecting 'YYYY-MM-DD'

    const filters = Array.isArray(dietaryFilters) ? dietaryFilters : [];
    const useMaxCalories = typeof maxCalories === "number";

    let results = menuItems.filter(mi => {
      const miDate = (mi.date || "").substring(0, 10);
      if (miDate !== datePrefix) return false;
      if (mi.meal_type !== mealType) return false;
      const dish = dishes.find(d => d.id === mi.dish_id);
      if (!dish) return false;

      // Dietary filters
      for (const code of filters) {
        if (code === "diabetic_friendly" && !dish.is_diabetic_friendly) return false;
        if (code === "low_sodium" && !dish.is_low_sodium) return false;
        if (code === "vegetarian" && !dish.is_vegetarian) return false;
        if (code === "vegan" && !dish.is_vegan) return false;
        if (code === "gluten_free" && !dish.is_gluten_free) return false;
        if (code === "low_carb" && !dish.is_low_carb) return false;
        if (code === "heart_healthy" && !dish.is_heart_healthy) return false;
      }

      if (useMaxCalories && typeof dish.calories === "number" && dish.calories > maxCalories) {
        return false;
      }

      return true;
    });

    // Attach dish objects (foreign key resolution)
    results = results.map(mi => ({
      ...mi,
      dish: dishes.find(d => d.id === mi.dish_id) || null
    }));

    return results;
  }

  getDishDetails(dishId) {
    const dishes = this._getFromStorage("dishes");
    return dishes.find(d => d.id === dishId) || null;
  }

  addDishToMealPlan(menuItemId, plannedDate, mealType, notes) {
    const mealPlanItems = this._getFromStorage("meal_plan_items");
    const menuItems = this._getFromStorage("menu_items");
    const dishes = this._getFromStorage("dishes");

    const plannedDateIso = this._normalizeAndParseDateInputs(plannedDate);

    const item = {
      id: this._generateId("meal_plan_item"),
      menu_item_id: menuItemId,
      planned_date: plannedDateIso,
      meal_type: mealType,
      added_at: new Date().toISOString(),
      notes: notes || ""
    };

    mealPlanItems.push(item);
    this._saveToStorage("meal_plan_items", mealPlanItems);

    const menuItem = menuItems.find(mi => mi.id === menuItemId) || null;
    const dish = menuItem ? dishes.find(d => d.id === menuItem.dish_id) || null : null;

    return {
      mealPlanItem: {
        ...item,
        menu_item: menuItem ? { ...menuItem, dish } : null
      },
      message: "Dish added to meal plan."
    };
  }

  // ------------------------
  // About Us & Staff / Contact (Task 9)
  // ------------------------

  getAboutUsContent() {
    const content = this._getFromStorage("about_us_content");
    return {
      mission: content.mission || "",
      values: content.values || "",
      servicesOverview: content.servicesOverview || "",
      address: content.address || "",
      directions: content.directions || "",
      mainPhone: content.mainPhone || "",
      generalEmail: content.generalEmail || "",
      privacySummary: content.privacySummary || "",
      termsSummary: content.termsSummary || ""
    };
  }

  getAboutUsFaqs() {
    const faqs = this._getFromStorage("about_us_faqs");
    return Array.isArray(faqs) ? faqs : [];
  }

  getStaffDirectory() {
    const staff = this._getFromStorage("staff_members");
    return staff;
  }

  getStaffMemberDetails(staffMemberId) {
    const staff = this._getFromStorage("staff_members");
    return staff.find(s => s.id === staffMemberId) || null;
  }

  sendStaffContactMessage(staffMemberId, department, subject, message, senderName, senderEmail, emailCopyToSender) {
    const messages = this._getFromStorage("staff_contact_messages");
    const staff = this._getFromStorage("staff_members");
    const staffMember = staff.find(s => s.id === staffMemberId) || null;

    const msg = {
      id: this._generateId("staff_contact_message"),
      staff_member_id: staffMemberId,
      department: department,
      subject: subject,
      message: message,
      sender_name: senderName,
      sender_email: senderEmail,
      email_copy_to_sender: !!emailCopyToSender,
      created_at: new Date().toISOString(),
      status: "submitted"
    };

    messages.push(msg);
    this._saveToStorage("staff_contact_messages", messages);

    return {
      staffContactMessage: {
        ...msg,
        staff_member: staffMember
      },
      message: "Message sent to staff member."
    };
  }

  // ------------------------
  // My Plan overview & remove/cancel helpers
  // ------------------------

  getMyPlanOverview() {
    const rooms = this._getFromStorage("rooms");
    const carePlans = this._getFromStorage("care_plans");
    const housingOptions = this._getFromStorage("housing_options");
    const careLevelOptions = this._getFromStorage("care_level_options");
    const additionalServiceOptions = this._getFromStorage("additional_service_options");
    const transportationPlanOptions = this._getFromStorage("transportation_plan_options");
    const activities = this._getFromStorage("activities");
    const menuItems = this._getFromStorage("menu_items");
    const dishes = this._getFromStorage("dishes");
    const transportationServices = this._getFromStorage("transportation_services");

    const shortlistedRoomsRaw = this._getFromStorage("shortlisted_rooms");
    const selectedCarePlansRaw = this._getFromStorage("selected_care_plans");
    const costEstimatesRaw = this._getFromStorage("cost_estimates");
    const visitPlanItemsRaw = this._getFromStorage("visit_plan_items");
    const mealPlanItemsRaw = this._getFromStorage("meal_plan_items");
    const tourRequestsRaw = this._getFromStorage("tour_requests");
    const transportationReservationsRaw = this._getFromStorage("transportation_reservations");

    const shortlistedRooms = shortlistedRoomsRaw.map(item => ({
      ...item,
      room: rooms.find(r => r.id === item.room_id) || null
    }));

    const selectedCarePlans = selectedCarePlansRaw.map(item => ({
      ...item,
      care_plan: carePlans.find(p => p.id === item.care_plan_id) || null
    }));

    const costEstimates = costEstimatesRaw.map(est => ({
      ...est,
      housing_option: housingOptions.find(h => h.id === est.housing_option_id) || null,
      care_level_option: careLevelOptions.find(c => c.id === est.care_level_option_id) || null,
      additional_service_options: (est.additional_service_option_ids || [])
        .map(id => additionalServiceOptions.find(a => a.id === id))
        .filter(Boolean),
      transportation_plan_option: transportationPlanOptions.find(t => t.id === est.transportation_plan_option_id) || null
    }));

    const visitPlanItems = visitPlanItemsRaw.map(item => ({
      ...item,
      activity: activities.find(a => a.id === item.activity_id) || null
    }));

    const mealPlanItems = mealPlanItemsRaw.map(item => {
      const menuItem = menuItems.find(mi => mi.id === item.menu_item_id) || null;
      const dish = menuItem ? dishes.find(d => d.id === menuItem.dish_id) || null : null;
      return {
        ...item,
        menu_item: menuItem ? { ...menuItem, dish } : null
      };
    });

    const transportationReservations = transportationReservationsRaw.map(res => ({
      ...res,
      transportation_service: transportationServices.find(s => s.id === res.transportation_service_id) || null
    }));

    // tourRequests have no foreign keys
    const tourRequests = tourRequestsRaw;

    return {
      shortlistedRooms,
      selectedCarePlans,
      costEstimates,
      visitPlanItems,
      mealPlanItems,
      tourRequests,
      transportationReservations
    };
  }

  removeShortlistedRoom(shortlistedRoomId) {
    const items = this._getFromStorage("shortlisted_rooms");
    const before = items.length;
    const filtered = items.filter(i => i.id !== shortlistedRoomId);
    this._saveToStorage("shortlisted_rooms", filtered);
    return {
      success: filtered.length < before,
      message: filtered.length < before ? "Shortlisted room removed." : "Shortlisted room not found."
    };
  }

  removeSelectedCarePlan(selectedCarePlanId) {
    const items = this._getFromStorage("selected_care_plans");
    const before = items.length;
    const filtered = items.filter(i => i.id !== selectedCarePlanId);
    this._saveToStorage("selected_care_plans", filtered);
    return {
      success: filtered.length < before,
      message: filtered.length < before ? "Selected care plan removed." : "Selected care plan not found."
    };
  }

  removeCostEstimate(costEstimateId) {
    const items = this._getFromStorage("cost_estimates");
    const before = items.length;
    const filtered = items.filter(i => i.id !== costEstimateId);
    this._saveToStorage("cost_estimates", filtered);
    return {
      success: filtered.length < before,
      message: filtered.length < before ? "Cost estimate removed." : "Cost estimate not found."
    };
  }

  removeVisitPlanItem(visitPlanItemId) {
    const items = this._getFromStorage("visit_plan_items");
    const before = items.length;
    const filtered = items.filter(i => i.id !== visitPlanItemId);
    this._saveToStorage("visit_plan_items", filtered);
    return {
      success: filtered.length < before,
      message: filtered.length < before ? "Visit plan item removed." : "Visit plan item not found."
    };
  }

  removeMealPlanItem(mealPlanItemId) {
    const items = this._getFromStorage("meal_plan_items");
    const before = items.length;
    const filtered = items.filter(i => i.id !== mealPlanItemId);
    this._saveToStorage("meal_plan_items", filtered);
    return {
      success: filtered.length < before,
      message: filtered.length < before ? "Meal plan item removed." : "Meal plan item not found."
    };
  }

  cancelTourRequest(tourRequestId) {
    const items = this._getFromStorage("tour_requests");
    const idx = items.findIndex(t => t.id === tourRequestId);
    if (idx === -1) {
      return {
        tourRequest: null,
        message: "Tour request not found."
      };
    }
    const updated = { ...items[idx], status: "cancelled" };
    items[idx] = updated;
    this._saveToStorage("tour_requests", items);
    return {
      tourRequest: updated,
      message: "Tour request cancelled."
    };
  }

  cancelTransportationReservation(transportationReservationId) {
    const items = this._getFromStorage("transportation_reservations");
    const idx = items.findIndex(r => r.id === transportationReservationId);
    if (idx === -1) {
      return {
        reservation: null,
        message: "Transportation reservation not found."
      };
    }
    const updated = { ...items[idx], status: "cancelled" };
    items[idx] = updated;
    this._saveToStorage("transportation_reservations", items);
    return {
      reservation: updated,
      message: "Transportation reservation cancelled." }
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