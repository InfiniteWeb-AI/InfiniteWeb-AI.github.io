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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const arrayKeys = [
      "services",
      "service_packages",
      "quote_requests",
      "quote_paint_selections",
      "consultation_bookings",
      "testimonials",
      "projects",
      "paint_colors",
      "room_presets",
      "service_teams",
      "onsite_visit_requests",
      "cost_estimates",
      "blog_articles",
      "saved_items",
      "newsletter_subscriptions",
      "maintenance_plans",
      "maintenance_plan_orders",
      "contact_form_submissions"
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem("calculator_view_state")) {
      // leave uninitialized; helper will create a proper object
    }

    if (!localStorage.getItem("saved_items_view_state")) {
      // leave uninitialized; helper will create a proper object
    }

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
    return prefix + "_" + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // -------------------- Internal helpers --------------------

  _getOrCreateCurrentQuoteRequest() {
    const quotes = this._getFromStorage("quote_requests", []);
    // Prefer latest draft, then latest submitted
    let activeQuote = null;
    const sorted = quotes
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    activeQuote = sorted.find((q) => q.status === "draft") || sorted.find((q) => q.status === "submitted") || null;

    if (!activeQuote) {
      activeQuote = {
        id: this._generateId("quote"),
        created_at: this._nowIso(),
        service_type: "interior_painting",
        property_type: "other",
        bedrooms: null,
        bathrooms: null,
        other_rooms_description: null,
        estimated_square_footage: null,
        max_budget: null,
        preferred_start_date: null,
        timeframe: null,
        urgency_notes: null,
        contact_name: "",
        contact_phone: "",
        contact_email: "",
        contact_preferred_method: "either",
        project_address: "",
        additional_details: "",
        status: "draft"
      };
      quotes.push(activeQuote);
      this._saveToStorage("quote_requests", quotes);
    }

    return activeQuote;
  }

  _resolveSavedItem(savedItem) {
    const type = savedItem.item_type;
    let originSectionKey = null;
    let testimonial = null;
    let project = null;
    let article = null;
    let paintColor = null;

    if (type === "testimonial") {
      const testimonials = this._getFromStorage("testimonials", []);
      testimonial = testimonials.find((t) => t.id === savedItem.item_id) || null;
      originSectionKey = "testimonials";
    } else if (type === "project") {
      const projects = this._getFromStorage("projects", []);
      project = projects.find((p) => p.id === savedItem.item_id) || null;
      originSectionKey = "gallery";
    } else if (type === "article") {
      const articles = this._getFromStorage("blog_articles", []);
      article = articles.find((a) => a.id === savedItem.item_id) || null;
      originSectionKey = "blog";
    } else if (type === "paint_color") {
      const paintColors = this._getFromStorage("paint_colors", []);
      paintColor = paintColors.find((c) => c.id === savedItem.item_id) || null;
      originSectionKey = "paint_selector";
    }

    return {
      itemType: type,
      originSectionKey,
      testimonial,
      project,
      article,
      paintColor
    };
  }

  _calculateEstimateCosts(input) {
    const {
      project_type,
      total_square_footage,
      paint_quality,
      additional_services = [],
      schedule_preference
    } = input;

    const sqft = Number(total_square_footage) || 0;

    // Base rates per sqft by paint quality
    let baseRate = 1.0;
    if (paint_quality === "premium") {
      baseRate = 1.3;
    } else if (paint_quality === "ultra_premium") {
      baseRate = 1.6;
    }

    // Project type modifier
    let projectModifier = 1.0;
    if (project_type === "combined") {
      projectModifier = 1.2;
    } else if (project_type === "maintenance") {
      projectModifier = 0.8;
    }

    let baseCost = sqft * baseRate * projectModifier;

    // Additional services
    let extras = 0;
    if (additional_services.includes("furniture_moving")) {
      extras += 100;
    }
    if (additional_services.includes("minor_wall_repairs")) {
      extras += sqft * 0.15;
    }

    baseCost += extras;

    // Schedule preference rush multiplier
    let scheduleMultiplier = 1.0;
    if (schedule_preference === "within_1_week") {
      scheduleMultiplier = 1.1;
    } else if (schedule_preference === "within_2_weeks") {
      scheduleMultiplier = 1.05;
    }

    const total = Math.round(baseCost * scheduleMultiplier);

    // Split labor/materials approx
    const estimated_material_cost = Math.round(total * 0.4);
    const estimated_labor_cost = total - estimated_material_cost;

    return {
      estimated_labor_cost,
      estimated_material_cost,
      estimated_total_cost: total
    };
  }

  _getOrCreateCalculatorViewState() {
    let state = this._getFromStorage("calculator_view_state", null);
    if (!state || typeof state !== "object" || !state.id) {
      state = {
        id: "calculator_view_state",
        current_view: "default",
        last_updated: this._nowIso()
      };
      this._saveToStorage("calculator_view_state", state);
    }
    return state;
  }

  _getOrCreateSavedItemsViewState() {
    let state = this._getFromStorage("saved_items_view_state", null);
    if (!state || typeof state !== "object" || !state.id) {
      state = {
        id: "saved_items_view_state",
        current_view: "favorites",
        last_updated: this._nowIso()
      };
      this._saveToStorage("saved_items_view_state", state);
    }
    return state;
  }

  // -------------------- Interfaces implementation --------------------

  // getHomePageOverview
  getHomePageOverview() {
    const services = this._getFromStorage("services", []).filter((s) => s.is_active);
    const featuredPackages = this._getFromStorage("service_packages", []).filter((p) => p.is_default);
    const featuredTestimonials = this._getFromStorage("testimonials", []).filter((t) => t.featured);

    const seasonalPromotions = [];

    const quickLinks = [
      { targetKey: "gallery", label: "View project gallery" },
      { targetKey: "color_tools", label: "Explore color tools" },
      { targetKey: "pricing", label: "See pricing & estimates" },
      { targetKey: "blog", label: "Read painting tips" },
      { targetKey: "maintenance_plans", label: "Maintenance plans" }
    ];

    return {
      heroTitle: "Local Painting & Decorating Professionals",
      heroSubtitle: "Interior, exterior, and maintenance painting with clean, reliable crews.",
      heroImageUrl: "",
      services,
      featuredPackages,
      featuredTestimonials,
      seasonalPromotions,
      quickLinks
    };
  }

  // getServicesOverview
  getServicesOverview() {
    const services = this._getFromStorage("services", []).filter((s) => s.is_active);

    const overview = services.map((service) => {
      let categoryLabel = "Painting";
      if (service.category === "interior") categoryLabel = "Interior painting";
      else if (service.category === "exterior") categoryLabel = "Exterior painting";
      else if (service.category === "maintenance") categoryLabel = "Maintenance";
      else if (service.category === "specialty") categoryLabel = "Specialty finishes";

      let primaryCtaType = "request_quote";
      if (service.code === "maintenance") {
        primaryCtaType = "view_pricing";
      } else if (service.code === "interior_painting" || service.code === "exterior_painting") {
        primaryCtaType = "schedule_consultation";
      }

      const keyBenefits = [];
      if (service.code === "interior_painting") {
        keyBenefits.push("Careful prep and protection of your home");
        keyBenefits.push("Low-odor, low-VOC options available");
      } else if (service.code === "exterior_painting") {
        keyBenefits.push("Weather-resistant finishes");
        keyBenefits.push("Thorough surface prep");
      } else if (service.code === "cabinet_painting") {
        keyBenefits.push("Factory-smooth cabinet finishes");
      } else if (service.code === "deck_staining") {
        keyBenefits.push("Long-lasting deck protection");
      } else if (service.code === "maintenance") {
        keyBenefits.push("Proactive inspections and touch-ups");
      }

      return {
        service,
        categoryLabel,
        keyBenefits,
        primaryCtaType
      };
    });

    return { services: overview };
  }

  // getServiceDetail(serviceCode)
  getServiceDetail(serviceCode) {
    const services = this._getFromStorage("services", []);
    const service = services.find((s) => s.code === serviceCode) || null;

    const allPackages = this._getFromStorage("service_packages", []);
    const packages = service ? allPackages.filter((p) => p.service_id === service.id) : [];

    let processSteps = [];
    if (serviceCode === "interior_painting") {
      processSteps = [
        "Initial walk-through and color discussion",
        "Protect floors, furniture, and fixtures",
        "Surface prep: patch, sand, and caulk",
        "Apply primer where needed",
        "Apply finish coats",
        "Final touch-ups and clean-up",
        "Final walk-through with you"
      ];
    } else if (serviceCode === "exterior_painting") {
      processSteps = [
        "Power wash and surface cleaning",
        "Scrape, sand, and repair damaged areas",
        "Prime bare substrates",
        "Apply high-quality exterior coatings",
        "Job-site clean-up and inspection"
      ];
    } else {
      processSteps = ["On-site evaluation", "Detailed proposal", "Professional execution", "Final inspection"];
    }

    let typicalTimelineLabel = "Varies by project";
    if (service && typeof service.typical_lead_time_weeks === "number") {
      typicalTimelineLabel = `${service.typical_lead_time_weeks} week lead time (typical)`;
    }

    const faqs = [
      {
        question: "Do I need to be home while you work?",
        answer:
          "You don't have to be home the whole time, but we do recommend being available at the start and end of the project for walk-throughs."
      },
      {
        question: "What paints do you use?",
        answer:
          "We work with major brands and can recommend zero-VOC and washable options based on your space and budget."
      }
    ];

    return {
      service,
      processSteps,
      typicalTimelineLabel,
      packages,
      faqs
    };
  }

  // getServicePackageComparison(serviceCode, packageCodes)
  getServicePackageComparison(serviceCode, packageCodes) {
    const services = this._getFromStorage("services", []);
    const service = services.find((s) => s.code === serviceCode) || null;
    const allPackages = this._getFromStorage("service_packages", []);

    let packages = [];
    if (service) {
      packages = allPackages.filter((p) => p.service_id === service.id);
    }

    if (Array.isArray(packageCodes) && packageCodes.length > 0) {
      packages = packages.filter((p) => packageCodes.includes(p.package_code));
    }

    // Build comparison matrix
    const featureMap = {};

    packages.forEach((pkg) => {
      if (Array.isArray(pkg.features)) {
        pkg.features.forEach((f) => {
          const key = f.toLowerCase();
          if (!featureMap[key]) {
            featureMap[key] = {
              featureKey: key,
              label: f,
              includedInPackages: []
            };
          }
          featureMap[key].includedInPackages.push(pkg.package_code);
        });
      }
      // Wall repair as explicit feature
      const wallKey = "includes_wall_repair";
      if (!featureMap[wallKey]) {
        featureMap[wallKey] = {
          featureKey: wallKey,
          label: "Includes minor wall repairs",
          includedInPackages: []
        };
      }
      if (pkg.includes_wall_repair) {
        featureMap[wallKey].includedInPackages.push(pkg.package_code);
      }
    });

    const comparisonMatrix = Object.values(featureMap);

    return {
      packages,
      comparisonMatrix
    };
  }

  // getConsultationAvailability(servicePackageId, meetingType, dateRange)
  getConsultationAvailability(servicePackageId, meetingType, dateRange) {
    const packages = this._getFromStorage("service_packages", []);
    const servicePackage = packages.find((p) => p.id === servicePackageId) || null;

    const slots = [];
    if (!servicePackage) {
      return { servicePackage: null, availableSlots: [] };
    }

    const now = new Date();
    let startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 14);

    if (dateRange && dateRange.startDate) {
      startDate = new Date(dateRange.startDate);
    }
    if (dateRange && dateRange.endDate) {
      endDate = new Date(dateRange.endDate);
    }

    const allowedMeetingTypes = ["video_call", "phone_call", "in_person"];
    const mtFilter = meetingType && allowedMeetingTypes.includes(meetingType) ? meetingType : null;

    for (
      let d = new Date(startDate.getTime());
      d.getTime() <= endDate.getTime();
      d.setDate(d.getDate() + 1)
    ) {
      const day = d.getDay();
      const isWeekday = day !== 0 && day !== 6;
      if (!isWeekday) continue;

      // Generate simple slots: 10-11, 11-12, 13-14, 14-15, 15-16
      const baseDateStr = d.toISOString().substring(0, 10);
      const slotTemplates = [
        { start: "10:00", end: "11:00" },
        { start: "11:00", end: "12:00" },
        { start: "13:00", end: "14:00" },
        { start: "14:00", end: "15:00" },
        { start: "15:00", end: "16:00" }
      ];

      slotTemplates.forEach((tpl, index) => {
        const slotMeetingType = mtFilter || "video_call";
        const startIso = `${baseDateStr}T${tpl.start}:00.000Z`;
        const endIso = `${baseDateStr}T${tpl.end}:00.000Z`;
        slots.push({
          slotId: `${baseDateStr}_${index}_${slotMeetingType}`,
          meetingType: slotMeetingType,
          start: startIso,
          end: endIso,
          isWeekday: true,
          timeWindowLabel: `${tpl.start} - ${tpl.end}`
        });
      });
    }

    return {
      servicePackage,
      availableSlots: slots
    };
  }

  // createConsultationBooking
  createConsultationBooking(
    servicePackageId,
    meetingType,
    meetingDate,
    timeSlotStart,
    timeSlotEnd,
    contactName,
    contactPhone,
    contactEmail,
    notes
  ) {
    const packages = this._getFromStorage("service_packages", []);
    const servicePackage = packages.find((p) => p.id === servicePackageId) || null;

    if (!servicePackage) {
      return {
        booking: null,
        success: false,
        message: "Service package not found"
      };
    }

    const bookings = this._getFromStorage("consultation_bookings", []);

    const booking = {
      id: this._generateId("consultation"),
      service_package_id: servicePackageId,
      service_id: servicePackage.service_id || null,
      meeting_type: meetingType,
      meeting_date: meetingDate,
      time_slot_start: timeSlotStart,
      time_slot_end: timeSlotEnd,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      notes: notes || "",
      status: "pending",
      created_at: this._nowIso()
    };

    bookings.push(booking);
    this._saveToStorage("consultation_bookings", bookings);

    return {
      booking,
      success: true,
      message: "Consultation booking created"
    };
  }

  // getQuoteFormOptions
  getQuoteFormOptions() {
    const serviceTypes = [
      { value: "interior_painting", label: "Interior painting" },
      { value: "exterior_painting", label: "Exterior painting" },
      { value: "cabinet_painting", label: "Cabinet painting" },
      { value: "deck_staining", label: "Deck staining" },
      { value: "maintenance", label: "Maintenance" }
    ];

    const propertyTypes = [
      { value: "apartment_condo", label: "Apartment / Condo" },
      { value: "single_family_home", label: "Single-family home" },
      { value: "townhouse", label: "Townhouse" },
      { value: "commercial_space", label: "Commercial space" },
      { value: "other", label: "Other" }
    ];

    const timeframes = [
      { value: "within_1_2_weeks", label: "Within 1–2 weeks" },
      { value: "within_4_weeks", label: "Within 4 weeks" },
      { value: "within_1_2_months", label: "Within 1–2 months" },
      { value: "flexible", label: "Flexible" },
      { value: "asap", label: "As soon as possible" }
    ];

    const today = new Date();
    const minStartDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
      .toISOString()
      .substring(0, 10);

    const maxBudgetHint = "Most interior repaint projects range from $1,500 to $8,000 depending on size and scope.";

    return {
      serviceTypes,
      propertyTypes,
      timeframes,
      maxBudgetHint,
      minStartDate
    };
  }

  // submitQuoteRequest
  submitQuoteRequest(
    serviceType,
    propertyType,
    bedrooms,
    bathrooms,
    otherRoomsDescription,
    estimatedSquareFootage,
    maxBudget,
    preferredStartDate,
    timeframe,
    urgencyNotes,
    contactName,
    contactPhone,
    contactEmail,
    contactPreferredMethod,
    projectAddress,
    additionalDetails
  ) {
    const quotes = this._getFromStorage("quote_requests", []);

    const quoteRequest = {
      id: this._generateId("quote"),
      created_at: this._nowIso(),
      service_type: serviceType,
      property_type: propertyType,
      bedrooms: bedrooms != null ? Number(bedrooms) : null,
      bathrooms: bathrooms != null ? Number(bathrooms) : null,
      other_rooms_description: otherRoomsDescription || "",
      estimated_square_footage:
        estimatedSquareFootage != null ? Number(estimatedSquareFootage) : null,
      max_budget: maxBudget != null ? Number(maxBudget) : null,
      preferred_start_date: preferredStartDate || null,
      timeframe: timeframe || null,
      urgency_notes: urgencyNotes || "",
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      contact_preferred_method: contactPreferredMethod || "either",
      project_address: projectAddress || "",
      additional_details: additionalDetails || "",
      status: "submitted"
    };

    quotes.push(quoteRequest);
    this._saveToStorage("quote_requests", quotes);

    return {
      quoteRequest,
      success: true,
      message: "Quote request submitted"
    };
  }

  // attachPaintColorToCurrentQuote
  attachPaintColorToCurrentQuote(paintColorId, applicationArea, quantityGallons, notes) {
    const paintColors = this._getFromStorage("paint_colors", []);
    const paintColor = paintColors.find((c) => c.id === paintColorId) || null;

    if (!paintColor) {
      return {
        quoteRequest: null,
        paintSelection: null,
        success: false,
        message: "Paint color not found"
      };
    }

    const quoteRequest = this._getOrCreateCurrentQuoteRequest();

    const selections = this._getFromStorage("quote_paint_selections", []);

    const paintSelection = {
      id: this._generateId("qp"),
      quote_request_id: quoteRequest.id,
      paint_color_id: paintColorId,
      application_area: applicationArea,
      quantity_gallons: quantityGallons != null ? Number(quantityGallons) : null,
      notes: notes || ""
    };

    selections.push(paintSelection);
    this._saveToStorage("quote_paint_selections", selections);

    return {
      quoteRequest,
      paintSelection,
      success: true,
      message: "Paint color attached to quote"
    };
  }

  // getCurrentQuoteSummary
  getCurrentQuoteSummary() {
    const quotes = this._getFromStorage("quote_requests", []);
    if (!quotes.length) {
      return {
        hasActiveQuote: false,
        quoteRequest: null,
        paintSelections: []
      };
    }

    const sorted = quotes
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const quoteRequest =
      sorted.find((q) => q.status === "draft") ||
      sorted.find((q) => q.status === "submitted") ||
      sorted[0];

    const selections = this._getFromStorage("quote_paint_selections", []);
    const paintColors = this._getFromStorage("paint_colors", []);

    const selectionDetails = selections
      .filter((s) => s.quote_request_id === quoteRequest.id)
      .map((selection) => {
        const paintColor = paintColors.find((c) => c.id === selection.paint_color_id) || null;
        return { selection, paintColor };
      });

    return {
      hasActiveQuote: !!quoteRequest,
      quoteRequest,
      paintSelections: selectionDetails
    };
  }

  // searchTestimonials
  searchTestimonials(
    ratingMin,
    ratingMax,
    keyword,
    projectType,
    roomCategory,
    page,
    pageSize
  ) {
    const testimonials = this._getFromStorage("testimonials", []);

    let results = testimonials.slice();

    const min = ratingMin != null ? Number(ratingMin) : 0;
    const max = ratingMax != null ? Number(ratingMax) : 5;

    results = results.filter((t) => {
      const rating = Number(t.rating) || 0;
      return rating >= min && rating <= max;
    });

    if (keyword && keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      results = results.filter((t) => {
        return (
          (t.title && t.title.toLowerCase().includes(kw)) ||
          (t.body && t.body.toLowerCase().includes(kw))
        );
      });
    }

    if (projectType) {
      results = results.filter((t) => t.project_type === projectType);
    }

    if (roomCategory) {
      results = results.filter((t) => t.room_category === roomCategory);
    }

    const p = page != null ? Number(page) : 1;
    const ps = pageSize != null ? Number(pageSize) : 20;
    const total = results.length;
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      total,
      page: p,
      pageSize: ps,
      results: paged
    };
  }

  // getTestimonialDetail
  getTestimonialDetail(testimonialId) {
    const testimonials = this._getFromStorage("testimonials", []);
    return testimonials.find((t) => t.id === testimonialId) || null;
  }

  // saveItemToList
  saveItemToList(itemType, listType, itemId, notes) {
    const savedItems = this._getFromStorage("saved_items", []);

    let savedItem = savedItems.find(
      (s) => s.item_type === itemType && s.list_type === listType && s.item_id === itemId
    );

    const now = this._nowIso();

    if (savedItem) {
      savedItem.notes = notes || savedItem.notes || "";
      savedItem.saved_at = now;
    } else {
      savedItem = {
        id: this._generateId("saved"),
        item_type: itemType,
        list_type: listType,
        item_id: itemId,
        saved_at: now,
        notes: notes || ""
      };
      savedItems.push(savedItem);
    }

    this._saveToStorage("saved_items", savedItems);

    return { savedItem, success: true };
  }

  // getSavedItemsByView
  getSavedItemsByView(view) {
    const savedItems = this._getFromStorage("saved_items", []);
    const filtered = savedItems.filter((s) => s.list_type === view);

    const items = filtered.map((savedItem) => ({
      savedItem,
      resolvedItem: this._resolveSavedItem(savedItem)
    }));

    return { view, items };
  }

  // removeSavedItem
  removeSavedItem(savedItemId) {
    const savedItems = this._getFromStorage("saved_items", []);
    const before = savedItems.length;
    const afterItems = savedItems.filter((s) => s.id !== savedItemId);
    this._saveToStorage("saved_items", afterItems);
    return { success: afterItems.length < before };
  }

  // searchProjects
  searchProjects(
    category,
    minBudget,
    maxBudget,
    minCompletionYear,
    tags,
    sort,
    page,
    pageSize
  ) {
    const projects = this._getFromStorage("projects", []);
    let results = projects.slice();

    if (category) {
      results = results.filter((p) => p.category === category);
    }

    if (minBudget != null) {
      const mb = Number(minBudget);
      results = results.filter(
        (p) => typeof p.budget_amount === "number" && p.budget_amount >= mb
      );
    }

    if (maxBudget != null) {
      const xb = Number(maxBudget);
      results = results.filter(
        (p) => typeof p.budget_amount === "number" && p.budget_amount <= xb
      );
    }

    if (minCompletionYear != null) {
      const y = Number(minCompletionYear);
      results = results.filter(
        (p) => typeof p.completion_year === "number" && p.completion_year >= y
      );
    }

    if (Array.isArray(tags) && tags.length > 0) {
      const tagSet = tags.map((t) => String(t).toLowerCase());
      results = results.filter((p) => {
        if (!Array.isArray(p.tags)) return false;
        const projectTags = p.tags.map((t) => String(t).toLowerCase());
        return tagSet.every((tg) => projectTags.includes(tg));
      });
    }

    if (sort === "budget_low_to_high") {
      results.sort((a, b) => {
        const av = typeof a.budget_amount === "number" ? a.budget_amount : Number.POSITIVE_INFINITY;
        const bv = typeof b.budget_amount === "number" ? b.budget_amount : Number.POSITIVE_INFINITY;
        return av - bv;
      });
    } else if (sort === "budget_high_to_low") {
      results.sort((a, b) => {
        const av = typeof a.budget_amount === "number" ? a.budget_amount : 0;
        const bv = typeof b.budget_amount === "number" ? b.budget_amount : 0;
        return bv - av;
      });
    } else if (sort === "most_recent") {
      results.sort((a, b) => {
        const ay = typeof a.completion_year === "number" ? a.completion_year : 0;
        const by = typeof b.completion_year === "number" ? b.completion_year : 0;
        if (ay !== by) return by - ay;
        const ad = a.completion_date ? new Date(a.completion_date).getTime() : 0;
        const bd = b.completion_date ? new Date(b.completion_date).getTime() : 0;
        return bd - ad;
      });
    }

    const p = page != null ? Number(page) : 1;
    const ps = pageSize != null ? Number(pageSize) : 20;
    const total = results.length;
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      total,
      page: p,
      pageSize: ps,
      results: paged
    };
  }

  // getProjectDetail
  getProjectDetail(projectId) {
    const projects = this._getFromStorage("projects", []);
    return projects.find((p) => p.id === projectId) || null;
  }

  // getPaintSelectorOptions
  getPaintSelectorOptions() {
    const roomPresets = this._getFromStorage("room_presets", []);

    const colorFamilies = [
      "blue",
      "green",
      "red",
      "yellow",
      "neutral",
      "gray",
      "white",
      "black",
      "brown",
      "multicolor",
      "other"
    ];

    const finishes = [
      "matte",
      "washable_matte",
      "eggshell",
      "satin",
      "semi_gloss",
      "gloss"
    ];

    const ecoAttributes = [
      { value: "zero_voc", label: "Zero VOC" },
      { value: "low_voc", label: "Low VOC" },
      { value: "standard", label: "Standard" }
    ];

    return {
      roomPresets,
      colorFamilies,
      finishes,
      ecoAttributes
    };
  }

  // searchPaintColors
  searchPaintColors(
    roomPresetKey,
    colorFamily,
    finish,
    vocLevel,
    mustBeWashable,
    sortBy,
    page,
    pageSize
  ) {
    const paintColors = this._getFromStorage("paint_colors", []);
    let results = paintColors.slice();

    if (colorFamily) {
      results = results.filter((c) => c.color_family === colorFamily);
    }

    if (finish) {
      results = results.filter((c) => c.finish === finish);
    }

    if (vocLevel) {
      results = results.filter((c) => c.voc_level === vocLevel);
    }

    if (mustBeWashable) {
      results = results.filter((c) => c.is_washable === true);
    }

    if (roomPresetKey) {
      const presets = this._getFromStorage("room_presets", []);
      const preset = presets.find((p) => p.key === roomPresetKey) || null;
      let allowedIds = [];
      if (preset && Array.isArray(preset.recommended_paint_color_ids)) {
        allowedIds = preset.recommended_paint_color_ids.slice();
      }

      results = results.filter((c) => {
        const byRecommendedRooms = Array.isArray(c.recommended_rooms)
          ? c.recommended_rooms.includes(roomPresetKey)
          : false;
        const byPresetList = allowedIds.includes(c.id);
        return byRecommendedRooms || byPresetList || !roomPresetKey;
      });
    }

    if (sortBy === "price_per_gallon_asc") {
      results.sort((a, b) => {
        const av = typeof a.price_per_gallon === "number" ? a.price_per_gallon : Number.POSITIVE_INFINITY;
        const bv = typeof b.price_per_gallon === "number" ? b.price_per_gallon : Number.POSITIVE_INFINITY;
        return av - bv;
      });
    } else if (sortBy === "price_per_gallon_desc") {
      results.sort((a, b) => {
        const av = typeof a.price_per_gallon === "number" ? a.price_per_gallon : 0;
        const bv = typeof b.price_per_gallon === "number" ? b.price_per_gallon : 0;
        return bv - av;
      });
    } else if (sortBy === "name") {
      results.sort((a, b) => {
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    const p = page != null ? Number(page) : 1;
    const ps = pageSize != null ? Number(pageSize) : 24;
    const total = results.length;
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      total,
      page: p,
      pageSize: ps,
      results: paged
    };
  }

  // getPaintColorDetail
  getPaintColorDetail(paintColorId) {
    const paintColors = this._getFromStorage("paint_colors", []);
    return paintColors.find((c) => c.id === paintColorId) || null;
  }

  // lookupServiceTeamsByZip
  lookupServiceTeamsByZip(postalCode) {
    const teams = this._getFromStorage("service_teams", []);
    const matches = [];

    teams.forEach((team) => {
      const zips = Array.isArray(team.coverage_zip_codes) ? team.coverage_zip_codes : [];
      if (zips.includes(postalCode)) {
        matches.push({ serviceTeam: team, distanceMiles: 0 });
      }
    });

    matches.sort((a, b) => a.distanceMiles - b.distanceMiles);

    return {
      postalCode,
      isServed: matches.length > 0,
      serviceTeams: matches
    };
  }

  // getServiceTeamDetail
  getServiceTeamDetail(serviceTeamId) {
    const teams = this._getFromStorage("service_teams", []);
    const serviceTeam = teams.find((t) => t.id === serviceTeamId) || null;
    return { serviceTeam };
  }

  // submitOnSiteVisitRequest
  submitOnSiteVisitRequest(
    serviceTeamId,
    requestedZip,
    visitType,
    preferredTimeOfDay,
    preferredDate,
    contactName,
    contactPhone,
    contactEmail,
    projectDetails
  ) {
    const teams = this._getFromStorage("service_teams", []);
    const team = teams.find((t) => t.id === serviceTeamId) || null;

    if (!team) {
      return {
        visitRequest: null,
        success: false,
        message: "Service team not found"
      };
    }

    const requests = this._getFromStorage("onsite_visit_requests", []);

    const visitRequest = {
      id: this._generateId("visit"),
      service_team_id: serviceTeamId,
      requested_zip: requestedZip,
      visit_type: visitType,
      preferred_time_of_day: preferredTimeOfDay,
      preferred_date: preferredDate || null,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      project_details: projectDetails || "",
      created_at: this._nowIso(),
      status: "submitted"
    };

    requests.push(visitRequest);
    this._saveToStorage("onsite_visit_requests", requests);

    return {
      visitRequest,
      success: true,
      message: "On-site visit request submitted"
    };
  }

  // getPricingOverview
  getPricingOverview() {
    const introText =
      "Every project is different, but these typical ranges and cost factors will help you plan your budget.";

    const typicalRanges = [
      {
        projectType: "interior_painting",
        minCost: 1500,
        maxCost: 8000,
        unit: "per project",
        description: "2–4 room interior repaints with standard prep."
      },
      {
        projectType: "exterior_painting",
        minCost: 3500,
        maxCost: 15000,
        unit: "per project",
        description: "Typical single-family home exteriors."
      },
      {
        projectType: "maintenance",
        minCost: 250,
        maxCost: 600,
        unit: "per year",
        description: "Annual inspection and touch-up plans."
      }
    ];

    const costFactors = [
      {
        id: "prep",
        label: "Surface preparation",
        description: "Repairs, sanding, and priming can significantly affect cost."
      },
      {
        id: "paint_quality",
        label: "Paint quality",
        description: "Higher-quality and zero-VOC paints cost more but last longer."
      },
      {
        id: "access",
        label: "Access & complexity",
        description: "High ceilings, stairwells, and difficult access areas affect pricing."
      }
    ];

    return {
      introText,
      typicalRanges,
      costFactors
    };
  }

  // getCostCalculatorConfig
  getCostCalculatorConfig() {
    const projectTypes = [
      { value: "interior_painting", label: "Interior painting" },
      { value: "exterior_painting", label: "Exterior painting" },
      { value: "combined", label: "Interior & exterior" },
      { value: "maintenance", label: "Maintenance plan" }
    ];

    const paintQualities = [
      { value: "standard", label: "Standard" },
      { value: "premium", label: "Premium" },
      { value: "ultra_premium", label: "Ultra premium" }
    ];

    const additionalServices = [
      {
        value: "furniture_moving",
        label: "Furniture moving",
        description: "We move and protect furniture as needed."
      },
      {
        value: "minor_wall_repairs",
        label: "Minor wall repairs",
        description: "Includes patching small holes and cracks."
      }
    ];

    const schedulePreferences = [
      { value: "within_1_week", label: "Within 1 week" },
      { value: "within_2_weeks", label: "Within 2 weeks" },
      { value: "within_4_weeks", label: "Within 4 weeks" },
      { value: "flexible", label: "Flexible" }
    ];

    return {
      projectTypes,
      paintQualities,
      additionalServices,
      schedulePreferences
    };
  }

  // getCalculatorViewState
  getCalculatorViewState() {
    return this._getOrCreateCalculatorViewState();
  }

  // setCalculatorViewState
  setCalculatorViewState(currentView) {
    const state = this._getOrCreateCalculatorViewState();
    state.current_view = currentView;
    state.last_updated = this._nowIso();
    this._saveToStorage("calculator_view_state", state);
    return state;
  }

  // calculateInstantEstimate
  calculateInstantEstimate(
    projectType,
    bedrooms,
    livingDiningRooms,
    otherRooms,
    totalSquareFootage,
    paintQuality,
    additionalServices,
    schedulePreference
  ) {
    const estimates = this._getFromStorage("cost_estimates", []);

    const base = {
      id: this._generateId("estimate"),
      created_at: this._nowIso(),
      project_type: projectType,
      bedrooms: bedrooms != null ? Number(bedrooms) : null,
      living_dining_rooms:
        livingDiningRooms != null ? Number(livingDiningRooms) : null,
      other_rooms: otherRooms != null ? Number(otherRooms) : null,
      total_square_footage: totalSquareFootage != null ? Number(totalSquareFootage) : 0,
      paint_quality: paintQuality,
      additional_services: Array.isArray(additionalServices)
        ? additionalServices.slice()
        : [],
      schedule_preference: schedulePreference || null,
      estimated_labor_cost: null,
      estimated_material_cost: null,
      estimated_total_cost: 0,
      estimate_valid_until: null,
      email_to_send: null,
      project_nickname: null,
      status: "draft"
    };

    const costs = this._calculateEstimateCosts({
      project_type: base.project_type,
      total_square_footage: base.total_square_footage,
      paint_quality: base.paint_quality,
      additional_services: base.additional_services,
      schedule_preference: base.schedule_preference
    });

    base.estimated_labor_cost = costs.estimated_labor_cost;
    base.estimated_material_cost = costs.estimated_material_cost;
    base.estimated_total_cost = costs.estimated_total_cost;

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 30);
    base.estimate_valid_until = validUntil.toISOString();

    estimates.push(base);
    this._saveToStorage("cost_estimates", estimates);

    return base;
  }

  // saveOrEmailEstimate
  saveOrEmailEstimate(estimateId, emailToSend, projectNickname) {
    const estimates = this._getFromStorage("cost_estimates", []);
    const estimate = estimates.find((e) => e.id === estimateId) || null;

    if (!estimate) {
      return {
        costEstimate: null,
        success: false,
        message: "Estimate not found"
      };
    }

    estimate.email_to_send = emailToSend;
    estimate.project_nickname = projectNickname;
    estimate.status = "emailed";

    this._saveToStorage("cost_estimates", estimates);

    return {
      costEstimate: estimate,
      success: true,
      message: "Estimate saved and email queued"
    };
  }

  // searchBlogArticles
  searchBlogArticles(query, topic, maxReadingTimeMinutes, tags, page, pageSize) {
    const articles = this._getFromStorage("blog_articles", []);

    let results = articles.slice();

    if (query && query.trim()) {
      const q = query.trim().toLowerCase();
      const terms = q.split(/\s+/).filter(Boolean);
      results = results.filter((a) => {
        const haystack = ((a.title || "") + " " + (a.excerpt || "") + " " + (a.content || "")).toLowerCase();
        // Require that all search terms appear somewhere in the article text
        // so multi-word queries like "exterior painting winter" still match
        // even if the exact phrase isn't present.
        return terms.every((term) => haystack.includes(term));
      });
    }

    if (topic) {
      results = results.filter((a) => a.topic === topic);
    }

    if (maxReadingTimeMinutes != null) {
      const mr = Number(maxReadingTimeMinutes);
      results = results.filter(
        (a) => typeof a.reading_time_minutes === "number" && a.reading_time_minutes <= mr
      );
    }

    if (Array.isArray(tags) && tags.length > 0) {
      const tagSet = tags.map((t) => String(t).toLowerCase());
      results = results.filter((a) => {
        if (!Array.isArray(a.tags)) return false;
        const atags = a.tags.map((t) => String(t).toLowerCase());
        return tagSet.every((tg) => atags.includes(tg));
      });
    }

    const p = page != null ? Number(page) : 1;
    const ps = pageSize != null ? Number(pageSize) : 10;
    const total = results.length;
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      total,
      page: p,
      pageSize: ps,
      results: paged
    };
  }

  // getBlogArticleDetail
  getBlogArticleDetail(slug) {
    const articles = this._getFromStorage("blog_articles", []);
    return articles.find((a) => a.slug === slug) || null;
  }

  // subscribeToNewsletterFromArticle
  subscribeToNewsletterFromArticle(name, email, preferences, source) {
    const subs = this._getFromStorage("newsletter_subscriptions", []);

    const sub = {
      id: this._generateId("ns"),
      name: name || "",
      email,
      preferences: Array.isArray(preferences) ? preferences.slice() : [],
      created_at: this._nowIso(),
      source: source || "article_embed"
    };

    subs.push(sub);
    this._saveToStorage("newsletter_subscriptions", subs);

    return sub;
  }

  // getRelatedBlogArticles
  getRelatedBlogArticles(articleId, limit) {
    const articles = this._getFromStorage("blog_articles", []);
    const base = articles.find((a) => a.id === articleId) || null;
    if (!base) return [];

    const lim = limit != null ? Number(limit) : 3;
    const baseTags = Array.isArray(base.tags)
      ? base.tags.map((t) => String(t).toLowerCase())
      : [];

    const others = articles
      .filter((a) => a.id !== base.id)
      .map((a) => {
        let score = 0;
        if (a.topic === base.topic) score += 2;
        if (Array.isArray(a.tags) && baseTags.length) {
          const atags = a.tags.map((t) => String(t).toLowerCase());
          baseTags.forEach((t) => {
            if (atags.includes(t)) score += 1;
          });
        }
        return { article: a, score };
      })
      .filter((x) => x.score > 0);

    others.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ad = a.article.published_at ? new Date(a.article.published_at).getTime() : 0;
      const bd = b.article.published_at ? new Date(b.article.published_at).getTime() : 0;
      return bd - ad;
    });

    return others.slice(0, lim).map((x) => x.article);
  }

  // getMaintenancePlans
  getMaintenancePlans(billingFrequency, maxPricePerYear, includesAnnualInspection) {
    const plans = this._getFromStorage("maintenance_plans", []);

    let results = plans.filter((p) => p.active);

    if (billingFrequency) {
      results = results.filter((p) => p.billing_frequency === billingFrequency);
    }

    if (maxPricePerYear != null) {
      const mp = Number(maxPricePerYear);
      results = results.filter(
        (p) => typeof p.price_per_year === "number" && p.price_per_year <= mp
      );
    }

    if (includesAnnualInspection != null) {
      results = results.filter(
        (p) => p.includes_annual_inspection === !!includesAnnualInspection
      );
    }

    return results;
  }

  // getMaintenancePlanDetail
  getMaintenancePlanDetail(maintenancePlanId) {
    const plans = this._getFromStorage("maintenance_plans", []);
    return plans.find((p) => p.id === maintenancePlanId) || null;
  }

  // configureMaintenancePlanOrder
  configureMaintenancePlanOrder(
    maintenancePlanId,
    selectedCoverage,
    visitSchedule,
    paymentOption,
    contactName,
    contactPhone,
    contactEmail,
    serviceAddress,
    serviceCity,
    serviceState,
    servicePostalCode
  ) {
    const plans = this._getFromStorage("maintenance_plans", []);
    const plan = plans.find((p) => p.id === maintenancePlanId) || null;
    if (!plan) {
      return null;
    }

    const orders = this._getFromStorage("maintenance_plan_orders", []);

    const order = {
      id: this._generateId("mpo"),
      maintenance_plan_id: maintenancePlanId,
      selected_coverage: selectedCoverage,
      visit_schedule: visitSchedule,
      payment_option: paymentOption,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail || "",
      service_address: serviceAddress || "",
      service_city: serviceCity || "",
      service_state: serviceState || "",
      service_postal_code: servicePostalCode || "",
      created_at: this._nowIso(),
      status: "pending_review"
    };

    orders.push(order);
    this._saveToStorage("maintenance_plan_orders", orders);

    return order;
  }

  // getMaintenancePlanOrderSummary
  getMaintenancePlanOrderSummary(maintenancePlanOrderId) {
    const orders = this._getFromStorage("maintenance_plan_orders", []);
    const order = orders.find((o) => o.id === maintenancePlanOrderId) || null;
    const plans = this._getFromStorage("maintenance_plans", []);
    const plan = order
      ? plans.find((p) => p.id === order.maintenance_plan_id) || null
      : null;

    return { order, plan };
  }

  // submitMaintenancePlanOrder
  submitMaintenancePlanOrder(maintenancePlanOrderId) {
    const orders = this._getFromStorage("maintenance_plan_orders", []);
    const order = orders.find((o) => o.id === maintenancePlanOrderId) || null;

    if (!order) {
      return {
        order: null,
        success: false,
        message: "Maintenance plan order not found"
      };
    }

    order.status = "confirmed";
    this._saveToStorage("maintenance_plan_orders", orders);

    return {
      order,
      success: true,
      message: "Maintenance plan order confirmed"
    };
  }

  // getSavedItemsViewState
  getSavedItemsViewState() {
    return this._getOrCreateSavedItemsViewState();
  }

  // setSavedItemsViewState
  setSavedItemsViewState(currentView) {
    const state = this._getOrCreateSavedItemsViewState();
    state.current_view = currentView;
    state.last_updated = this._nowIso();
    this._saveToStorage("saved_items_view_state", state);
    return state;
  }

  // getAboutPageContent
  getAboutPageContent() {
    const companyStory =
      "We are a locally owned painting and decorating company focused on clean, reliable work and clear communication.";
    const mission =
      "To make repainting your home simple, transparent, and worry-free with professional crews and quality materials.";
    const yearsOfExperience = 10;

    const certifications = [
      { name: "Lead-safe certified", issuer: "EPA" }
    ];

    const affiliations = [
      {
        name: "Local builders association",
        description: "Active member supporting local trades."
      }
    ];

    const featuredTeamMembers = [];

    const coverageSummary =
      "We serve homeowners and businesses across our metro area with flexible scheduling for interior and exterior work.";

    return {
      companyStory,
      mission,
      yearsOfExperience,
      certifications,
      affiliations,
      featuredTeamMembers,
      coverageSummary
    };
  }

  // getContactPageContent
  getContactPageContent() {
    const primaryPhone = "";
    const primaryEmail = "";
    const businessHours = [
      { day: "Monday", open: "08:00", close: "17:00" },
      { day: "Tuesday", open: "08:00", close: "17:00" },
      { day: "Wednesday", open: "08:00", close: "17:00" },
      { day: "Thursday", open: "08:00", close: "17:00" },
      { day: "Friday", open: "08:00", close: "17:00" }
    ];

    const mainOfficeAddress = "";
    const serviceRegionDescription =
      "We provide painting and decorating services across the surrounding neighborhoods.";

    return {
      primaryPhone,
      primaryEmail,
      businessHours,
      mainOfficeAddress,
      serviceRegionDescription
    };
  }

  // submitContactForm
  submitContactForm(name, email, phone, subject, message, sourcePage) {
    const submissions = this._getFromStorage("contact_form_submissions", []);

    const submission = {
      id: this._generateId("contact"),
      name,
      email,
      phone: phone || "",
      subject: subject || "",
      message,
      created_at: this._nowIso(),
      source_page: sourcePage || null
    };

    submissions.push(submission);
    this._saveToStorage("contact_form_submissions", submissions);

    return {
      submission,
      success: true
    };
  }

  // getLegalContent
  getLegalContent(policyType) {
    let title = "";
    let contentHtml = "";

    if (policyType === "privacy_policy") {
      title = "Privacy Policy";
      contentHtml = "<p>We respect your privacy and only use your information to respond to your requests and maintain our services.</p>";
    } else if (policyType === "terms_of_service") {
      title = "Terms of Service";
      contentHtml = "<p>Use of this website constitutes acceptance of these terms and conditions.</p>";
    } else if (policyType === "cookies_policy") {
      title = "Cookies Policy";
      contentHtml = "<p>We use cookies to improve your browsing experience and analyze site traffic.</p>";
    } else {
      title = "Legal";
      contentHtml = "<p>No content available.</p>";
    }

    return {
      policyType,
      title,
      contentHtml,
      lastUpdated: this._nowIso().substring(0, 10)
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
