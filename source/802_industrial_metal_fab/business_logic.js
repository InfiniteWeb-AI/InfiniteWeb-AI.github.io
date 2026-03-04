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
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };
    const ensureObject = (key, defaultValue) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Entity tables
    ensureArray("materials");
    ensureArray("material_cost_estimates");
    ensureArray("lead_time_options");
    ensureArray("pricing_options");
    ensureArray("tolerance_options");
    ensureArray("edge_quality_options");
    ensureArray("surface_finish_options");
    ensureArray("project_templates");
    ensureArray("operation_steps");
    ensureArray("project_configurations");
    ensureArray("laser_instant_quotes");
    ensureArray("quote_baskets");
    ensureArray("quote_items");
    ensureArray("formal_quote_requests");
    ensureArray("cnc_service_tiers");
    ensureArray("project_plans");
    ensureArray("project_plan_items");
    ensureArray("case_studies");
    ensureArray("favorite_case_studies");
    ensureArray("facilities");
    ensureArray("facility_quote_requests");
    ensureArray("technical_data_items");
    ensureArray("service_quote_requests");
    ensureArray("design_consultation_bookings");
    ensureArray("assembly_methods");
    ensureArray("assembly_method_pricings");
    ensureArray("assembly_configurations");
    ensureArray("contact_inquiries");

    // Config / content-like tables (kept minimal/empty by default)
    ensureObject("home_overview", {
      heroTitle: "",
      heroSubtitle: "",
      coreServices: [],
      quickActions: []
    });
    ensureObject("capabilities_highlights", {
      highlights: [],
      featuredCaseStudyIds: []
    });
    ensureArray("service_categories_overview");
    ensureArray("service_workflows_overview");
    ensureObject("laser_cutting_overview", {
      description: "",
      thicknessRangeMm: { min: 0, max: 0 }
    });
    ensureObject("cnc_machining_overview", {
      description: ""
    });
    ensureObject("assembly_finishing_overview", {
      description: "",
      processSummaries: []
    });
    ensureObject("capabilities_overview", {
      processCapabilities: [],
      machineTypes: [],
      volumeRanges: [],
      qualitySystemsSummary: ""
    });
    ensureObject("contact_info", {
      phone: "",
      email: "",
      addresses: [],
      visitInstructions: ""
    });
    ensureObject("design_consultation_options", {
      topics: [],
      formats: [],
      timeSlotDurationMinutes: 60
    });
    ensureObject("about_content", {
      history: "",
      mission: "",
      coreCompetencies: [],
      industryExperience: [],
      qualityAndCompliance: ""
    });
    ensureObject("legal_content", {
      privacyPolicy: "",
      termsOfService: "",
      legalContactEmail: ""
    });
    ensureObject("formal_quote_request_defaults", {
      contactName: "",
      contactEmail: "",
      company: "",
      phone: "",
      city: "",
      notes: ""
    });
    ensureObject("facility_rohs_note_drafts", {});

    if (!localStorage.getItem("current_quote_basket_id")) {
      localStorage.setItem("current_quote_basket_id", "");
    }
    if (!localStorage.getItem("project_plan_default_id")) {
      localStorage.setItem("project_plan_default_id", "");
    }

    if (!localStorage.getItem("idCounter")) {
      localStorage.setItem("idCounter", "1000");
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
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
    localStorage.setItem("idCounter", next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + "_" + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // ---------------------------------
  // Foreign key resolution helper
  // ---------------------------------

  _resolveForeignKeys(entityType, records) {
    if (!records || !records.length) return [];
    const cloned = records.map((r) => ({ ...r }));

    if (entityType === "CaseStudy") {
      const materials = this._getFromStorage("materials", []);
      cloned.forEach((cs) => {
        cs.material = materials.find((m) => m.id === cs.material_id) || null;
      });
    } else if (entityType === "FavoriteCaseStudy") {
      const caseStudies = this._getFromStorage("case_studies", []);
      cloned.forEach((fav) => {
        fav.case_study = caseStudies.find((c) => c.id === fav.case_study_id) || null;
      });
    } else if (entityType === "QuoteItem") {
      const baskets = this._getFromStorage("quote_baskets", []);
      const materials = this._getFromStorage("materials", []);
      cloned.forEach((item) => {
        item.basket = baskets.find((b) => b.id === item.basket_id) || null;
        item.material = item.material_id
          ? materials.find((m) => m.id === item.material_id) || null
          : null;
      });
    } else if (entityType === "ProjectPlanItem") {
      const plans = this._getFromStorage("project_plans", []);
      const tiers = this._getFromStorage("cnc_service_tiers", []);
      cloned.forEach((item) => {
        item.project_plan = plans.find((p) => p.id === item.project_plan_id) || null;
        item.cnc_service_tier = tiers.find((t) => t.id === item.cnc_service_tier_id) || null;
      });
    } else if (entityType === "LaserInstantQuote") {
      const materials = this._getFromStorage("materials", []);
      const toleranceOptions = this._getFromStorage("tolerance_options", []);
      const edgeQualityOptions = this._getFromStorage("edge_quality_options", []);
      const surfaceFinishOptions = this._getFromStorage("surface_finish_options", []);
      const leadTimeOptions = this._getFromStorage("lead_time_options", []);
      cloned.forEach((q) => {
        q.material = materials.find((m) => m.id === q.material_id) || null;
        q.tolerance_option = q.tolerance_option_id
          ? toleranceOptions.find((t) => t.id === q.tolerance_option_id) || null
          : null;
        q.edge_quality_option = q.edge_quality_option_id
          ? edgeQualityOptions.find((e) => e.id === q.edge_quality_option_id) || null
          : null;
        q.surface_finish_option = q.surface_finish_option_id
          ? surfaceFinishOptions.find((s) => s.id === q.surface_finish_option_id) || null
          : null;
        q.lead_time_option = q.lead_time_option_id
          ? leadTimeOptions.find((l) => l.id === q.lead_time_option_id) || null
          : null;
      });
    } else if (entityType === "ProjectConfiguration") {
      const materials = this._getFromStorage("materials", []);
      const leadTimeOptions = this._getFromStorage("lead_time_options", []);
      const pricingOptions = this._getFromStorage("pricing_options", []);
      cloned.forEach((cfg) => {
        cfg.material = materials.find((m) => m.id === cfg.material_id) || null;
        cfg.lead_time_option = cfg.lead_time_option_id
          ? leadTimeOptions.find((l) => l.id === cfg.lead_time_option_id) || null
          : null;
        cfg.pricing_option = cfg.pricing_option_id
          ? pricingOptions.find((p) => p.id === cfg.pricing_option_id) || null
          : null;
      });
    } else if (entityType === "AssemblyConfiguration") {
      const methods = this._getFromStorage("assembly_methods", []);
      cloned.forEach((cfg) => {
        cfg.selected_method = methods.find((m) => m.id === cfg.selected_method_id) || null;
      });
    } else if (entityType === "FacilityQuoteRequest") {
      const facilities = this._getFromStorage("facilities", []);
      cloned.forEach((r) => {
        r.facility = facilities.find((f) => f.id === r.facility_id) || null;
      });
    }

    return cloned;
  }

  // ---------------------------------
  // Helper functions declared in spec
  // ---------------------------------

  _getOrCreateQuoteBasket() {
    const now = this._nowIso();
    let baskets = this._getFromStorage("quote_baskets", []);
    let currentBasketId = localStorage.getItem("current_quote_basket_id") || "";

    let basket = currentBasketId
      ? baskets.find((b) => b.id === currentBasketId)
      : null;

    if (!basket) {
      const id = this._generateId("basket");
      basket = {
        id,
        items: [],
        created_at: now,
        last_updated_at: now
      };
      baskets.push(basket);
      this._saveToStorage("quote_baskets", baskets);
      localStorage.setItem("current_quote_basket_id", id);
    }

    return basket;
  }

  _estimateLaserPricing(
    materialId,
    thicknessMm,
    lengthMm,
    widthMm,
    heightMm,
    quantity,
    toleranceOptionId,
    edgeQualityOptionId,
    surfaceFinishOptionId,
    leadTimeOptionId
  ) {
    const materialCostEstimates = this._getFromStorage("material_cost_estimates", []);
    const toleranceOptions = this._getFromStorage("tolerance_options", []);
    const edgeQualityOptions = this._getFromStorage("edge_quality_options", []);
    const surfaceFinishOptions = this._getFromStorage("surface_finish_options", []);
    const leadTimeOptions = this._getFromStorage("lead_time_options", []);

    // Base cost per part from MaterialCostEstimate if available
    let baseCostPerPart = 0;
    const relevantEstimates = materialCostEstimates.filter(
      (e) =>
        e.material_id === materialId &&
        quantity >= e.quantity_min &&
        quantity <= e.quantity_max
    );
    if (relevantEstimates.length > 0) {
      baseCostPerPart = relevantEstimates[0].cost_per_part;
    } else {
      // Fallback minimal base cost when no estimate exists
      baseCostPerPart = 10; // usd, simple fallback heuristic
    }

    let multiplier = 1;

    if (toleranceOptionId) {
      const tol = toleranceOptions.find((t) => t.id === toleranceOptionId);
      if (tol) {
        if (tol.code === "tight_plus_minus_0_1mm") {
          multiplier += 0.2;
        } else if (tol.code === "loose_plus_minus_0_5mm") {
          multiplier -= 0.05;
        }
      }
    }

    if (edgeQualityOptionId) {
      const eq = edgeQualityOptions.find((e) => e.id === edgeQualityOptionId);
      if (eq) {
        if (eq.code === "high_quality_cut") {
          multiplier += 0.15;
        } else if (eq.code === "burr_free_cut") {
          multiplier += 0.25;
        }
      }
    }

    if (surfaceFinishOptionId) {
      const sf = surfaceFinishOptions.find((s) => s.id === surfaceFinishOptionId);
      if (sf) {
        if (sf.code === "no_surface_finish") {
          multiplier += 0;
        } else if (sf.code === "deburred") {
          multiplier += 0.05;
        } else if (sf.code === "powder_coated" || sf.code === "painted") {
          multiplier += 0.2;
        } else if (sf.code === "anodized") {
          multiplier += 0.25;
        }
      }
    }

    if (leadTimeOptionId) {
      const lt = leadTimeOptions.find((l) => l.id === leadTimeOptionId);
      if (lt) {
        if (lt.code === "rush_3_business_days") {
          multiplier += 0.3;
        } else if (lt.code === "expedited_5_business_days") {
          multiplier += 0.15;
        } else if (lt.code === "standard_10_business_days") {
          multiplier += 0;
        }
      }
    }

    // Simple geometry-based adjustment: larger parts cost slightly more
    const footprint = (lengthMm || 0) * (widthMm || 0);
    if (footprint > 0) {
      const areaFactor = Math.min(Math.max(footprint / (100 * 100), 0.5), 5); // normalized
      multiplier *= areaFactor;
    }

    const estimatedUnitCost = Number((baseCostPerPart * multiplier).toFixed(2));
    const estimatedTotalCost = Number((estimatedUnitCost * quantity).toFixed(2));

    return {
      estimatedUnitCost,
      estimatedTotalCost,
      currency: "usd",
      pricingNotes: "Estimate based on material cost ranges and selected options."
    };
  }

  _estimateProjectConfigurationPricing(
    projectType,
    materialId,
    sheetThicknessMm,
    widthMm,
    depthMm,
    heightMm,
    quantity,
    operations,
    leadTimeOptionId,
    pricingOptionId
  ) {
    const materialCostEstimates = this._getFromStorage("material_cost_estimates", []);
    const leadTimeOptions = this._getFromStorage("lead_time_options", []);
    const pricingOptions = this._getFromStorage("pricing_options", []);

    let baseCostPerPart = 0;
    const relevantEstimates = materialCostEstimates.filter(
      (e) =>
        e.material_id === materialId &&
        quantity >= e.quantity_min &&
        quantity <= e.quantity_max
    );
    if (relevantEstimates.length > 0) {
      baseCostPerPart = relevantEstimates[0].cost_per_part;
    } else {
      baseCostPerPart = 20; // fallback base cost for multi-process parts
    }

    let multiplier = 1;

    // Simple operation-type based multipliers
    (operations || []).forEach((op) => {
      switch (op.operationType) {
        case "laser_cutting":
          multiplier += 0.2;
          break;
        case "bending": {
          const bends = op.bendsPerPart || 1;
          multiplier += 0.05 * bends;
          break;
        }
        case "powder_coating":
          multiplier += 0.25;
          break;
        case "welding":
          multiplier += 0.3;
          break;
        case "assembly":
          multiplier += 0.15;
          break;
        default:
          break;
      }
    });

    if (leadTimeOptionId) {
      const lt = leadTimeOptions.find((l) => l.id === leadTimeOptionId);
      if (lt) {
        if (lt.code === "rush_3_business_days") multiplier += 0.3;
        else if (lt.code === "expedited_5_business_days") multiplier += 0.15;
      }
    }

    if (pricingOptionId) {
      const po = pricingOptions.find((p) => p.id === pricingOptionId);
      if (po) {
        if (po.code === "economy") multiplier -= 0.1;
        else if (po.code === "priority") multiplier += 0.2;
      }
    }

    // Very simple volume-based normalization by bounding box
    const volumeFactor = Math.max(
      ((sheetThicknessMm || 0) * (widthMm || 0) * (depthMm || 0) * (heightMm || 0)) /
        (100 * 100 * 50 * 50) || 1,
      0.5
    );
    multiplier *= Math.min(volumeFactor, 5);

    const estimatedUnitCost = Number((baseCostPerPart * multiplier).toFixed(2));
    const estimatedTotalCost = Number((estimatedUnitCost * quantity).toFixed(2));

    return {
      estimatedUnitCost,
      estimatedTotalCost,
      currency: "usd"
    };
  }

  _estimateAssemblyMethodCost(assemblyMethodId, quantity) {
    const methods = this._getFromStorage("assembly_methods", []);
    const pricings = this._getFromStorage("assembly_method_pricings", []);

    const method = methods.find((m) => m.id === assemblyMethodId) || null;
    const pricing = pricings
      .filter(
        (p) =>
          p.assembly_method_id === assemblyMethodId &&
          quantity >= p.quantity_min &&
          quantity <= p.quantity_max
      )
      .sort((a, b) => a.assembly_cost_per_unit - b.assembly_cost_per_unit)[0] || null;

    if (!method) {
      return {
        method: null,
        pricing: null,
        assemblyCostPerUnit: null,
        currency: "usd",
        disassemblable: false
      };
    }

    let assemblyCostPerUnit;
    let currency;

    if (pricing) {
      assemblyCostPerUnit = pricing.assembly_cost_per_unit;
      currency = pricing.currency;
    } else {
      // Fallback heuristic when no explicit pricing exists. For disassemblable
      // methods like bolted assemblies at moderate-to-high quantities, assume
      // a competitive cost below $5/unit so that configuration flows remain
      // usable even with sparse pricing data.
      const isDisassemblable = !!method.disassemblable;
      if (isDisassemblable && quantity >= 200) {
        assemblyCostPerUnit = 4.0;
      } else if (isDisassemblable) {
        assemblyCostPerUnit = 5.0;
      } else {
        assemblyCostPerUnit = 6.0;
      }
      currency = "usd";
    }

    return {
      method,
      pricing,
      assemblyCostPerUnit,
      currency,
      disassemblable: !!method.disassemblable
    };
  }

  _storeFacilityRohsNoteDraft(facilityId, noteText) {
    const drafts = this._getFromStorage("facility_rohs_note_drafts", {});
    drafts[facilityId] = noteText || "";
    this._saveToStorage("facility_rohs_note_drafts", drafts);
  }

  _getOrCreateDefaultProjectPlan() {
    const now = this._nowIso();
    let plans = this._getFromStorage("project_plans", []);
    let defaultId = localStorage.getItem("project_plan_default_id") || "";
    let plan = defaultId ? plans.find((p) => p.id === defaultId) : null;

    if (!plan) {
      const id = this._generateId("projectplan");
      plan = {
        id,
        name: "Default Project Plan",
        description: "",
        items: [],
        created_at: now
      };
      plans.push(plan);
      this._saveToStorage("project_plans", plans);
      localStorage.setItem("project_plan_default_id", id);
    }

    return plan;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // getHomeOverview
  getHomeOverview() {
    const overview = this._getFromStorage("home_overview", {
      heroTitle: "",
      heroSubtitle: "",
      coreServices: [],
      quickActions: []
    });

    // Provide sensible defaults if not configured
    if (!overview.coreServices || !overview.coreServices.length) {
      overview.coreServices = [
        {
          service_type: "laser_cutting",
          name: "Laser Cutting",
          supports_instant_quote: true
        },
        {
          service_type: "cnc_machining",
          name: "CNC Machining",
          supports_instant_quote: false
        },
        {
          service_type: "assembly_finishing",
          name: "Assembly & Finishing",
          supports_instant_quote: false
        }
      ];
    }

    if (!overview.quickActions || !overview.quickActions.length) {
      overview.quickActions = [
        { action_type: "start_project", label: "Start a Project" },
        { action_type: "request_quote", label: "Request a Quote" }
      ];
    }

    return overview;
  }

  // getCapabilitiesHighlights
  getCapabilitiesHighlights() {
    const cfg = this._getFromStorage("capabilities_highlights", {
      highlights: [],
      featuredCaseStudyIds: []
    });
    const allCaseStudies = this._getFromStorage("case_studies", []);
    const featuredRaw = cfg.featuredCaseStudyIds
      .map((id) => allCaseStudies.find((c) => c.id === id))
      .filter((c) => !!c);
    const featuredCaseStudies = this._resolveForeignKeys("CaseStudy", featuredRaw);
    return {
      highlights: cfg.highlights || [],
      featuredCaseStudies
    };
  }

  // getQuoteBasketSummary
  getQuoteBasketSummary() {
    const basket = this._getOrCreateQuoteBasket();
    const itemsAll = this._getFromStorage("quote_items", []);
    const items = itemsAll.filter((i) => i.basket_id === basket.id);
    let total = 0;
    items.forEach((i) => {
      if (typeof i.estimated_total_cost === "number") {
        total += i.estimated_total_cost;
      } else if (
        typeof i.estimated_unit_cost === "number" &&
        typeof i.quantity === "number"
      ) {
        total += i.estimated_unit_cost * i.quantity;
      }
    });
    return {
      basketId: basket.id,
      itemCount: items.length,
      estimatedTotalCost: Number(total.toFixed(2)),
      currency: "usd"
    };
  }

  // getQuoteBasket
  getQuoteBasket() {
    const basket = this._getOrCreateQuoteBasket();
    const allItems = this._getFromStorage("quote_items", []);
    const itemsForBasket = allItems.filter((i) => i.basket_id === basket.id);
    const resolvedItems = this._resolveForeignKeys("QuoteItem", itemsForBasket);
    return {
      basket,
      items: resolvedItems
    };
  }

  // removeQuoteBasketItem
  removeQuoteBasketItem(quoteItemId) {
    let basket = this._getOrCreateQuoteBasket();
    let items = this._getFromStorage("quote_items", []);
    const index = items.findIndex((i) => i.id === quoteItemId);
    if (index === -1) {
      const itemsForBasket = items.filter((i) => i.basket_id === basket.id);
      const resolvedItems = this._resolveForeignKeys("QuoteItem", itemsForBasket);
      return { success: false, basket, items: resolvedItems };
    }

    const item = items[index];
    items.splice(index, 1);
    this._saveToStorage("quote_items", items);

    // Update basket items and last_updated_at
    basket.items = (basket.items || []).filter((id) => id !== quoteItemId);
    basket.last_updated_at = this._nowIso();

    let baskets = this._getFromStorage("quote_baskets", []);
    const bIndex = baskets.findIndex((b) => b.id === basket.id);
    if (bIndex !== -1) {
      baskets[bIndex] = basket;
      this._saveToStorage("quote_baskets", baskets);
    }

    const itemsForBasket = items.filter((i) => i.basket_id === basket.id);
    const resolvedItems = this._resolveForeignKeys("QuoteItem", itemsForBasket);
    return { success: true, basket, items: resolvedItems };
  }

  // updateQuoteBasketItemQuantity
  updateQuoteBasketItemQuantity(quoteItemId, quantity) {
    let basket = this._getOrCreateQuoteBasket();
    let items = this._getFromStorage("quote_items", []);
    const idx = items.findIndex((i) => i.id === quoteItemId);
    if (idx === -1) {
      return { success: false, updatedItem: null, basket: null };
    }

    const item = { ...items[idx] };
    item.quantity = quantity;
    if (typeof item.estimated_unit_cost === "number") {
      item.estimated_total_cost = Number(
        (item.estimated_unit_cost * quantity).toFixed(2)
      );
    }
    items[idx] = item;
    this._saveToStorage("quote_items", items);

    basket.last_updated_at = this._nowIso();
    let baskets = this._getFromStorage("quote_baskets", []);
    const bIndex = baskets.findIndex((b) => b.id === basket.id);
    if (bIndex !== -1) {
      baskets[bIndex] = basket;
      this._saveToStorage("quote_baskets", baskets);
    }

    const [resolvedItem] = this._resolveForeignKeys("QuoteItem", [item]);
    return {
      success: true,
      updatedItem: resolvedItem,
      basket
    };
  }

  // getProjectPlansSummary
  getProjectPlansSummary() {
    return this._getFromStorage("project_plans", []);
  }

  // getServiceCategoriesOverview
  getServiceCategoriesOverview() {
    const categories = this._getFromStorage("service_categories_overview", []);
    if (!categories || !categories.length) {
      return [
        { service_type: "laser_cutting", supports_instant_quote: true },
        { service_type: "cnc_machining", supports_instant_quote: false },
        { service_type: "assembly_finishing", supports_instant_quote: false }
      ];
    }
    return categories;
  }

  // getServiceWorkflowsOverview
  getServiceWorkflowsOverview() {
    return this._getFromStorage("service_workflows_overview", []);
  }

  // getLaserCuttingOverview
  getLaserCuttingOverview() {
    const overview = this._getFromStorage("laser_cutting_overview", {
      description: "",
      thicknessRangeMm: { min: 0, max: 0 }
    });
    const materials = this._getFromStorage("materials", []);
    const toleranceOptions = this._getFromStorage("tolerance_options", []);

    // For now, treat all materials as potentially laser-cuttable
    return {
      description: overview.description || "",
      supportedMaterials: materials,
      thicknessRangeMm: overview.thicknessRangeMm || { min: 0, max: 0 },
      toleranceOptions
    };
  }

  // getLaserInstantQuoteOptions
  getLaserInstantQuoteOptions() {
    const materials = this._getFromStorage("materials", []);
    const toleranceOptions = this._getFromStorage("tolerance_options", []);
    const edgeQualityOptions = this._getFromStorage("edge_quality_options", []);
    const surfaceFinishOptions = this._getFromStorage("surface_finish_options", []);
    const leadTimeOptions = this._getFromStorage("lead_time_options", []);

    return {
      materials,
      toleranceOptions,
      edgeQualityOptions,
      surfaceFinishOptions,
      leadTimeOptions
    };
  }

  // previewLaserInstantQuoteEstimate
  previewLaserInstantQuoteEstimate(
    materialId,
    thicknessMm,
    lengthMm,
    widthMm,
    heightMm,
    quantity,
    toleranceOptionId,
    edgeQualityOptionId,
    surfaceFinishOptionId,
    leadTimeOptionId
  ) {
    return this._estimateLaserPricing(
      materialId,
      thicknessMm,
      lengthMm,
      widthMm,
      heightMm,
      quantity,
      toleranceOptionId,
      edgeQualityOptionId,
      surfaceFinishOptionId,
      leadTimeOptionId
    );
  }

  // addLaserInstantQuoteToQuoteBasket
  addLaserInstantQuoteToQuoteBasket(
    partName,
    materialId,
    thicknessMm,
    lengthMm,
    widthMm,
    heightMm,
    quantity,
    toleranceOptionId,
    edgeQualityOptionId,
    surfaceFinishOptionId,
    leadTimeOptionId
  ) {
    const now = this._nowIso();
    const pricing = this._estimateLaserPricing(
      materialId,
      thicknessMm,
      lengthMm,
      widthMm,
      heightMm,
      quantity,
      toleranceOptionId,
      edgeQualityOptionId,
      surfaceFinishOptionId,
      leadTimeOptionId
    );

    let laserQuotes = this._getFromStorage("laser_instant_quotes", []);
    const laserQuote = {
      id: this._generateId("laserquote"),
      part_name: partName || "",
      material_id: materialId,
      thickness_mm: thicknessMm,
      length_mm: lengthMm,
      width_mm: widthMm,
      height_mm: heightMm,
      quantity,
      tolerance_option_id: toleranceOptionId || null,
      edge_quality_option_id: edgeQualityOptionId || null,
      surface_finish_option_id: surfaceFinishOptionId || null,
      lead_time_option_id: leadTimeOptionId || null,
      estimated_unit_cost: pricing.estimatedUnitCost,
      estimated_total_cost: pricing.estimatedTotalCost,
      created_at: now
    };
    laserQuotes.push(laserQuote);
    this._saveToStorage("laser_instant_quotes", laserQuotes);

    const basket = this._getOrCreateQuoteBasket();
    let quoteItems = this._getFromStorage("quote_items", []);
    const quoteItem = {
      id: this._generateId("quoteitem"),
      basket_id: basket.id,
      source_type: "laser_instant_quote",
      source_reference_id: laserQuote.id,
      description: partName || "Laser-cut part",
      service_type: "laser_cutting",
      material_id: materialId,
      quantity,
      estimated_unit_cost: pricing.estimatedUnitCost,
      estimated_total_cost: pricing.estimatedTotalCost,
      currency: "usd",
      created_at: now
    };
    quoteItems.push(quoteItem);
    this._saveToStorage("quote_items", quoteItems);

    basket.items = basket.items || [];
    basket.items.push(quoteItem.id);
    basket.last_updated_at = now;
    let baskets = this._getFromStorage("quote_baskets", []);
    const bIndex = baskets.findIndex((b) => b.id === basket.id);
    if (bIndex !== -1) {
      baskets[bIndex] = basket;
    } else {
      baskets.push(basket);
    }
    this._saveToStorage("quote_baskets", baskets);

    const [resolvedLaserQuote] = this._resolveForeignKeys("LaserInstantQuote", [laserQuote]);
    const [resolvedQuoteItem] = this._resolveForeignKeys("QuoteItem", [quoteItem]);

    return {
      laserInstantQuote: resolvedLaserQuote,
      quoteItem: resolvedQuoteItem,
      basket
    };
  }

  // getLaserTechnicalData
  getLaserTechnicalData() {
    return this._getFromStorage("technical_data_items", []);
  }

  // submitLaserServiceQuoteRequest
  submitLaserServiceQuoteRequest(partName, quantity, notes) {
    const now = this._nowIso();
    let requests = this._getFromStorage("service_quote_requests", []);
    const request = {
      id: this._generateId("servicequote"),
      service_type: "laser_cutting",
      part_name: partName,
      quantity,
      notes: notes || "",
      created_at: now
    };
    requests.push(request);
    this._saveToStorage("service_quote_requests", requests);
    return { serviceQuoteRequest: request };
  }

  // getCncMachiningOverview
  getCncMachiningOverview() {
    const overview = this._getFromStorage("cnc_machining_overview", { description: "" });
    const materials = this._getFromStorage("materials", []);

    const partSizeCategories = [
      {
        code: "small_under_200mm",
        label: "Small parts (under 200 mm)",
        description: "Ideal for compact components and precision features."
      },
      {
        code: "medium_200_500mm",
        label: "Medium parts (200–500 mm)",
        description: "Typical machine components and brackets."
      },
      {
        code: "large_over_500mm",
        label: "Large parts (over 500 mm)",
        description: "Larger housings and structural elements."
      }
    ];

    return {
      description: overview.description || "",
      supportedMaterials: materials,
      partSizeCategories
    };
  }

  // getCncTierFilterOptions
  getCncTierFilterOptions() {
    const materialCategories = [
      { value: "aluminum", label: "Aluminum" },
      { value: "steel", label: "Steel" },
      { value: "stainless_steel", label: "Stainless steel" },
      { value: "any", label: "Any" },
      { value: "other", label: "Other" }
    ];

    const partSizeCategories = [
      { value: "small_under_200mm", label: "Small parts (under 200 mm)" },
      { value: "medium_200_500mm", label: "Medium parts (200–500 mm)" },
      { value: "large_over_500mm", label: "Large parts (over 500 mm)" },
      { value: "any", label: "Any size" }
    ];

    const leadTimeRangePresets = [
      { label: "1–2 business days", minBusinessDays: 1, maxBusinessDays: 2 },
      { label: "3–5 business days", minBusinessDays: 3, maxBusinessDays: 5 },
      { label: "6–10 business days", minBusinessDays: 6, maxBusinessDays: 10 }
    ];

    return {
      materialCategories,
      partSizeCategories,
      leadTimeRangePresets
    };
  }

  // getCncServiceTiers
  getCncServiceTiers(
    materialCategory,
    partSizeCategory,
    leadTimeMinBusinessDays,
    leadTimeMaxBusinessDays,
    maxHourlyRate,
    sortBy,
    sortDirection
  ) {
    let tiers = this._getFromStorage("cnc_service_tiers", []);
    tiers = tiers.filter((t) => t.is_active);

    if (materialCategory) {
      tiers = tiers.filter(
        (t) => t.material_category === materialCategory || materialCategory === "any"
      );
    }

    if (partSizeCategory) {
      tiers = tiers.filter(
        (t) => t.part_size_category === partSizeCategory || partSizeCategory === "any"
      );
    }

    if (typeof leadTimeMinBusinessDays === "number") {
      tiers = tiers.filter((t) => t.lead_time_business_days >= leadTimeMinBusinessDays);
    }

    if (typeof leadTimeMaxBusinessDays === "number") {
      tiers = tiers.filter((t) => t.lead_time_business_days <= leadTimeMaxBusinessDays);
    }

    if (typeof maxHourlyRate === "number") {
      tiers = tiers.filter((t) => t.hourly_rate <= maxHourlyRate);
    }

    if (sortBy) {
      const dir = sortDirection === "desc" ? -1 : 1;
      if (sortBy === "lead_time") {
        tiers = tiers.sort(
          (a, b) => dir * (a.lead_time_business_days - b.lead_time_business_days)
        );
      } else if (sortBy === "hourly_rate") {
        tiers = tiers.sort((a, b) => dir * (a.hourly_rate - b.hourly_rate));
      } else if (sortBy === "name") {
        tiers = tiers.sort((a, b) => {
          if (a.name < b.name) return -1 * dir;
          if (a.name > b.name) return 1 * dir;
          return 0;
        });
      }
    }

    return tiers;
  }

  // getCncServiceTierDetails
  getCncServiceTierDetails(cncServiceTierId) {
    const tiers = this._getFromStorage("cnc_service_tiers", []);
    return tiers.find((t) => t.id === cncServiceTierId) || null;
  }

  // addCncTierToProjectPlan
  addCncTierToProjectPlan(cncServiceTierId, projectName, notes) {
    const now = this._nowIso();
    let plans = this._getFromStorage("project_plans", []);
    let plan = plans.find((p) => p.name === projectName);
    if (!plan) {
      plan = {
        id: this._generateId("projectplan"),
        name: projectName,
        description: notes || "",
        items: [],
        created_at: now
      };
      plans.push(plan);
      this._saveToStorage("project_plans", plans);
    }

    let planItems = this._getFromStorage("project_plan_items", []);
    const item = {
      id: this._generateId("projectplanitem"),
      project_plan_id: plan.id,
      cnc_service_tier_id: cncServiceTierId,
      notes: notes || "",
      added_at: now
    };
    planItems.push(item);
    this._saveToStorage("project_plan_items", planItems);

    plan.items = plan.items || [];
    plan.items.push(item.id);
    plans = this._getFromStorage("project_plans", []);
    const pIndex = plans.findIndex((p) => p.id === plan.id);
    if (pIndex !== -1) {
      plans[pIndex] = plan;
      this._saveToStorage("project_plans", plans);
    }

    const [resolvedItem] = this._resolveForeignKeys("ProjectPlanItem", [item]);

    return {
      projectPlan: plan,
      projectPlanItem: resolvedItem
    };
  }

  // getProjectPlanDetails
  getProjectPlanDetails(projectPlanId) {
    const plans = this._getFromStorage("project_plans", []);
    const plan = plans.find((p) => p.id === projectPlanId) || null;
    const allItems = this._getFromStorage("project_plan_items", []);
    const items = plan
      ? allItems.filter((i) => i.project_plan_id === plan.id)
      : [];
    const resolvedItems = this._resolveForeignKeys("ProjectPlanItem", items);
    return {
      projectPlan: plan,
      items: resolvedItems
    };
  }

  // getAssemblyFinishingOverview
  getAssemblyFinishingOverview() {
    const overview = this._getFromStorage("assembly_finishing_overview", {
      description: "",
      processSummaries: []
    });
    return {
      description: overview.description || "",
      processSummaries: overview.processSummaries || []
    };
  }

  // getAssemblyConfiguratorOptions
  getAssemblyConfiguratorOptions() {
    const productTypes = [
      { value: "metal_support_frame", label: "Metal support frame" },
      { value: "outdoor_bracket", label: "Outdoor bracket" },
      { value: "sheet_metal_enclosure", label: "Sheet metal enclosure" },
      { value: "generic", label: "Generic" }
    ];
    const assemblyMethods = this._getFromStorage("assembly_methods", []);
    return {
      productTypes,
      assemblyMethods
    };
  }

  // compareAssemblyMethods
  compareAssemblyMethods(productType, quantity, methodTypes) {
    const methods = this._getFromStorage("assembly_methods", []);

    const applicableMethods = methods.filter(
      (m) =>
        methodTypes.includes(m.method_type) &&
        (m.product_type === productType || m.product_type === "generic")
    );

    return applicableMethods.map((method) => {
      const costInfo = this._estimateAssemblyMethodCost(method.id, quantity);

      return {
        assemblyMethod: method,
        pricing: costInfo.pricing,
        disassemblable: costInfo.disassemblable,
        assemblyCostPerUnit: costInfo.assemblyCostPerUnit,
        currency: costInfo.currency
      };
    });
  }

  // saveAssemblyConfigurationToProject
  saveAssemblyConfigurationToProject(
    productType,
    quantity,
    selectedMethodId,
    configurationName
  ) {
    const now = this._nowIso();
    const costInfo = this._estimateAssemblyMethodCost(selectedMethodId, quantity);
    const configuration = {
      id: this._generateId("assemblycfg"),
      product_type: productType,
      quantity,
      selected_method_id: selectedMethodId,
      configuration_name: configurationName,
      is_disassemblable: !!costInfo.disassemblable,
      assembly_cost_per_unit: costInfo.assemblyCostPerUnit,
      created_at: now
    };

    let configs = this._getFromStorage("assembly_configurations", []);
    configs.push(configuration);
    this._saveToStorage("assembly_configurations", configs);

    const [resolvedConfig] = this._resolveForeignKeys("AssemblyConfiguration", [
      configuration
    ]);
    return resolvedConfig;
  }

  // getCapabilitiesOverview
  getCapabilitiesOverview() {
    return this._getFromStorage("capabilities_overview", {
      processCapabilities: [],
      machineTypes: [],
      volumeRanges: [],
      qualitySystemsSummary: ""
    });
  }

  // getFacilityFilterOptions
  getFacilityFilterOptions() {
    const certificationOptions = [
      { code: "iso_9001", label: "ISO 9001" },
      { code: "iso_14001", label: "ISO 14001" },
      { code: "other", label: "Other" }
    ];
    return { certificationOptions };
  }

  // getFacilities
  getFacilities(requiredCertifications, requiresRoHsCompliantMaterials) {
    let facilities = this._getFromStorage("facilities", []);
    facilities = facilities.filter((f) => f.is_active);

    if (requiredCertifications && requiredCertifications.length) {
      facilities = facilities.filter((f) => {
        const certs = f.certifications || [];
        return requiredCertifications.every((c) => certs.includes(c));
      });
    }

    if (typeof requiresRoHsCompliantMaterials === "boolean") {
      facilities = facilities.filter(
        (f) => f.supports_rohs_compliant_materials === requiresRoHsCompliantMaterials
      );
    }

    return facilities;
  }

  // getFacilityDetails
  getFacilityDetails(facilityId) {
    const facilities = this._getFromStorage("facilities", []);
    return facilities.find((f) => f.id === facilityId) || null;
  }

  // copyFacilityRohsNoteToRfqDraft
  copyFacilityRohsNoteToRfqDraft(facilityId) {
    const facilities = this._getFromStorage("facilities", []);
    const facility = facilities.find((f) => f.id === facilityId) || null;
    if (!facility || !facility.rohs_note_text) {
      this._storeFacilityRohsNoteDraft(facilityId, "");
      return { success: false, copiedRohsNote: "" };
    }
    this._storeFacilityRohsNoteDraft(facilityId, facility.rohs_note_text);
    return { success: true, copiedRohsNote: facility.rohs_note_text };
  }

  // getFacilityRfqFormDefaults
  getFacilityRfqFormDefaults(facilityId) {
    const facilities = this._getFromStorage("facilities", []);
    const facility = facilities.find((f) => f.id === facilityId) || null;
    const drafts = this._getFromStorage("facility_rohs_note_drafts", {});
    const defaultNotes = drafts[facilityId] || "";

    return {
      facility,
      defaultProjectName: "",
      defaultQuantity: 0,
      defaultTargetDeliveryDate: "",
      defaultNotes
    };
  }

  // submitFacilityQuoteRequest
  submitFacilityQuoteRequest(
    facilityId,
    projectName,
    quantity,
    targetDeliveryDate,
    notes,
    contactName,
    contactEmail
  ) {
    const now = this._nowIso();
    let requests = this._getFromStorage("facility_quote_requests", []);

    let targetDateIso = null;
    if (targetDeliveryDate) {
      const d = new Date(targetDeliveryDate);
      if (!isNaN(d.getTime())) {
        targetDateIso = d.toISOString();
      }
    }

    const request = {
      id: this._generateId("facilityrfq"),
      facility_id: facilityId,
      project_name: projectName,
      quantity,
      target_delivery_date: targetDateIso,
      notes: notes || "",
      contact_name: contactName,
      contact_email: contactEmail,
      submitted_at: now
    };
    requests.push(request);
    this._saveToStorage("facility_quote_requests", requests);

    const [resolved] = this._resolveForeignKeys("FacilityQuoteRequest", [request]);
    return resolved;
  }

  // getCaseStudyFilterOptions
  getCaseStudyFilterOptions() {
    const materials = this._getFromStorage("materials", []);
    const caseStudies = this._getFromStorage("case_studies", []);

    const industries = [
      { value: "automotive", label: "Automotive" },
      { value: "industrial", label: "Industrial" },
      { value: "electronics", label: "Electronics" },
      { value: "aerospace", label: "Aerospace" },
      { value: "consumer", label: "Consumer" },
      { value: "medical", label: "Medical" },
      { value: "other", label: "Other" }
    ];

    const serviceTypes = [
      { value: "welding_assembly", label: "Welding & Assembly" },
      { value: "sheet_metal_enclosure", label: "Sheet metal enclosures" },
      { value: "laser_cutting", label: "Laser cutting" },
      { value: "cnc_machining", label: "CNC machining" },
      { value: "assembly_finishing", label: "Assembly & finishing" },
      { value: "other", label: "Other" }
    ];

    let batchSizeMin = null;
    let batchSizeMax = null;
    caseStudies.forEach((cs) => {
      if (typeof cs.batch_size_min === "number") {
        if (batchSizeMin === null || cs.batch_size_min < batchSizeMin) {
          batchSizeMin = cs.batch_size_min;
        }
      }
      if (typeof cs.batch_size_max === "number") {
        if (batchSizeMax === null || cs.batch_size_max > batchSizeMax) {
          batchSizeMax = cs.batch_size_max;
        }
      }
    });

    return {
      industries,
      materials,
      serviceTypes,
      batchSizeMin: batchSizeMin || 0,
      batchSizeMax: batchSizeMax || 0
    };
  }

  // getCaseStudies
  getCaseStudies(industry, materialId, serviceTypes, batchSizeMin) {
    let caseStudies = this._getFromStorage("case_studies", []);

    if (industry) {
      caseStudies = caseStudies.filter((cs) => cs.industry === industry);
    }
    if (materialId) {
      caseStudies = caseStudies.filter((cs) => cs.material_id === materialId);
    }
    if (serviceTypes && serviceTypes.length) {
      caseStudies = caseStudies.filter((cs) => {
        const services = cs.services || [];
        return services.some((s) => serviceTypes.includes(s));
      });
    }
    if (typeof batchSizeMin === "number") {
      caseStudies = caseStudies.filter((cs) => {
        const max = typeof cs.batch_size_max === "number" ? cs.batch_size_max : Infinity;
        return max >= batchSizeMin;
      });
    }

    return this._resolveForeignKeys("CaseStudy", caseStudies);
  }

  // getCaseStudyDetails
  getCaseStudyDetails(caseStudyId) {
    const caseStudies = this._getFromStorage("case_studies", []);
    const cs = caseStudies.find((c) => c.id === caseStudyId) || null;
    if (!cs) return null;
    const [resolved] = this._resolveForeignKeys("CaseStudy", [cs]);
    return resolved;
  }

  // saveCaseStudyFavorite
  saveCaseStudyFavorite(caseStudyId, note) {
    const now = this._nowIso();
    let favorites = this._getFromStorage("favorite_case_studies", []);
    const fav = {
      id: this._generateId("favcs"),
      case_study_id: caseStudyId,
      note: note || "",
      saved_at: now
    };
    favorites.push(fav);
    this._saveToStorage("favorite_case_studies", favorites);

    const [resolved] = this._resolveForeignKeys("FavoriteCaseStudy", [fav]);
    return resolved;
  }

  // getMaterialSelectorOptions
  getMaterialSelectorOptions() {
    const applicationTypes = [
      { value: "outdoor_structural_bracket", label: "Outdoor structural bracket" },
      { value: "indoor_bracket", label: "Indoor bracket" },
      { value: "sheet_metal_enclosure", label: "Sheet metal enclosure" },
      { value: "generic", label: "Generic" }
    ];
    const defaultBatchSize = 100;
    return {
      applicationTypes,
      defaultBatchSize
    };
  }

  // getMaterialCandidatesForApplication
  getMaterialCandidatesForApplication(applicationType, quantity) {
    const materials = this._getFromStorage("materials", []);
    const estimates = this._getFromStorage("material_cost_estimates", []);

    const candidates = materials.filter((m) => {
      const apps = m.recommended_application_types || [];
      if (apps.length === 0) return true;
      return apps.includes(applicationType);
    });

    return candidates
      .map((material) => {
        let estimate = estimates
          .filter(
            (e) =>
              e.material_id === material.id &&
              quantity >= e.quantity_min &&
              quantity <= e.quantity_max
          )
          .sort((a, b) => a.cost_per_part - b.cost_per_part)[0] || null;

        // Fallback minimal estimate when no explicit data exists so that
        // selector flows can still propose viable materials.
        if (!estimate) {
          estimate = {
            id: "fallback_" + material.id,
            material_id: material.id,
            quantity_min: 1,
            quantity_max: Number.MAX_SAFE_INTEGER,
            cost_per_part: 10,
            currency: "usd",
            is_fallback: true
          };
        }

        return {
          material,
          estimatedCost: estimate
        };
      })
      .filter((x) => !!x);
  }

  // getMaterialComparison
  getMaterialComparison(materialIds, quantity) {
    const materials = this._getFromStorage("materials", []);
    const estimates = this._getFromStorage("material_cost_estimates", []);

    return (materialIds || []).map((id) => {
      const material = materials.find((m) => m.id === id) || null;
      let corrosionResistanceRating = material
        ? material.corrosion_resistance_rating || null
        : null;
      let costEstimate = estimates
        .filter(
          (e) =>
            e.material_id === id &&
            quantity >= e.quantity_min &&
            quantity <= e.quantity_max
        )
        .sort((a, b) => a.cost_per_part - b.cost_per_part)[0] || null;

      // Provide a reasonable fallback estimate when none exists so that
      // comparison-based selection can still consider the material.
      if (!costEstimate && material) {
        costEstimate = {
          id: "fallback_" + id,
          material_id: id,
          quantity_min: 1,
          quantity_max: Number.MAX_SAFE_INTEGER,
          cost_per_part: 10,
          currency: "usd",
          is_fallback: true
        };
      }

      return {
        material,
        corrosionResistanceRating,
        costEstimate
      };
    });
  }

  // startQuoteWithMaterial
  startQuoteWithMaterial(materialId, partName) {
    const now = this._nowIso();
    const projectType = "sheet_metal_enclosure";
    const material = this._getFromStorage("materials", []).find(
      (m) => m.id === materialId
    );

    const configuration = {
      id: this._generateId("projcfg"),
      project_type: projectType,
      project_name: partName || "",
      material_id: materialId,
      sheet_thickness_mm: 1,
      width_mm: 100,
      depth_mm: 100,
      height_mm: 50,
      quantity: 1,
      lead_time_option_id: null,
      pricing_option_id: null,
      estimated_unit_cost: null,
      estimated_total_cost: null,
      created_at: now
    };

    let configs = this._getFromStorage("project_configurations", []);
    configs.push(configuration);
    this._saveToStorage("project_configurations", configs);

    const [resolvedCfg] = this._resolveForeignKeys("ProjectConfiguration", [
      configuration
    ]);

    return {
      projectType,
      initialProjectConfiguration: resolvedCfg
    };
  }

  // getProjectTemplates
  getProjectTemplates() {
    return this._getFromStorage("project_templates", []);
  }

  // getProjectConfiguratorOptions
  getProjectConfiguratorOptions(projectType) {
    const materials = this._getFromStorage("materials", []);
    const leadTimeOptions = this._getFromStorage("lead_time_options", []);
    const pricingOptions = this._getFromStorage("pricing_options", []);
    const operationTypes = [
      "laser_cutting",
      "bending",
      "powder_coating",
      "welding",
      "assembly",
      "finishing",
      "cnc_machining",
      "other"
    ];
    return {
      materials,
      leadTimeOptions,
      pricingOptions,
      operationTypes
    };
  }

  // previewProjectConfigurationQuote
  previewProjectConfigurationQuote(
    projectType,
    materialId,
    sheetThicknessMm,
    widthMm,
    depthMm,
    heightMm,
    quantity,
    operations,
    leadTimeOptionId,
    pricingOptionId
  ) {
    return this._estimateProjectConfigurationPricing(
      projectType,
      materialId,
      sheetThicknessMm,
      widthMm,
      depthMm,
      heightMm,
      quantity,
      operations,
      leadTimeOptionId,
      pricingOptionId
    );
  }

  // addProjectConfigurationToQuoteBasket
  addProjectConfigurationToQuoteBasket(
    projectType,
    projectName,
    materialId,
    sheetThicknessMm,
    widthMm,
    depthMm,
    heightMm,
    quantity,
    operations,
    leadTimeOptionId,
    pricingOptionId
  ) {
    const now = this._nowIso();
    const pricing = this._estimateProjectConfigurationPricing(
      projectType,
      materialId,
      sheetThicknessMm,
      widthMm,
      depthMm,
      heightMm,
      quantity,
      operations,
      leadTimeOptionId,
      pricingOptionId
    );

    let configs = this._getFromStorage("project_configurations", []);
    const configuration = {
      id: this._generateId("projcfg"),
      project_type: projectType,
      project_name: projectName || "",
      material_id: materialId,
      sheet_thickness_mm: sheetThicknessMm,
      width_mm: widthMm,
      depth_mm: depthMm,
      height_mm: heightMm,
      quantity,
      lead_time_option_id: leadTimeOptionId || null,
      pricing_option_id: pricingOptionId || null,
      estimated_unit_cost: pricing.estimatedUnitCost,
      estimated_total_cost: pricing.estimatedTotalCost,
      created_at: now
    };
    configs.push(configuration);
    this._saveToStorage("project_configurations", configs);

    // Operation steps
    let opSteps = this._getFromStorage("operation_steps", []);
    const operationSteps = (operations || []).map((op) => {
      const step = {
        id: this._generateId("opstep"),
        project_configuration_id: configuration.id,
        sequence_number: op.sequenceNumber,
        operation_type: op.operationType,
        description: op.description || "",
        bends_per_part: op.bendsPerPart || null,
        powder_coat_color: op.powderCoatColor || null,
        powder_coat_finish: op.powderCoatFinish || null,
        created_at: now
      };
      opSteps.push(step);
      return step;
    });
    this._saveToStorage("operation_steps", opSteps);

    // Add quote item
    const basket = this._getOrCreateQuoteBasket();
    let quoteItems = this._getFromStorage("quote_items", []);
    const quoteItem = {
      id: this._generateId("quoteitem"),
      basket_id: basket.id,
      source_type: "project_configurator",
      source_reference_id: configuration.id,
      description: projectName || "Configured project",
      service_type:
        projectType === "sheet_metal_enclosure" ? "sheet_metal_enclosure" : "other",
      material_id: materialId,
      quantity,
      estimated_unit_cost: pricing.estimatedUnitCost,
      estimated_total_cost: pricing.estimatedTotalCost,
      currency: "usd",
      created_at: now
    };
    quoteItems.push(quoteItem);
    this._saveToStorage("quote_items", quoteItems);

    basket.items = basket.items || [];
    basket.items.push(quoteItem.id);
    basket.last_updated_at = now;
    let baskets = this._getFromStorage("quote_baskets", []);
    const bIndex = baskets.findIndex((b) => b.id === basket.id);
    if (bIndex !== -1) {
      baskets[bIndex] = basket;
    } else {
      baskets.push(basket);
    }
    this._saveToStorage("quote_baskets", baskets);

    const [resolvedCfg] = this._resolveForeignKeys("ProjectConfiguration", [
      configuration
    ]);
    const [resolvedQuoteItem] = this._resolveForeignKeys("QuoteItem", [quoteItem]);

    return {
      projectConfiguration: resolvedCfg,
      operationSteps,
      quoteItem: resolvedQuoteItem,
      basket
    };
  }

  // getFormalQuoteRequestDefaults
  getFormalQuoteRequestDefaults() {
    const basket = this._getOrCreateQuoteBasket();
    const allItems = this._getFromStorage("quote_items", []);
    const items = allItems.filter((i) => i.basket_id === basket.id);
    const resolvedItems = this._resolveForeignKeys("QuoteItem", items);

    const defaults = this._getFromStorage("formal_quote_request_defaults", {
      contactName: "",
      contactEmail: "",
      company: "",
      phone: "",
      city: "",
      notes: ""
    });

    return {
      basket,
      items: resolvedItems,
      defaultContactName: defaults.contactName || "",
      defaultContactEmail: defaults.contactEmail || "",
      defaultCompany: defaults.company || "",
      defaultPhone: defaults.phone || "",
      defaultCity: defaults.city || "",
      defaultNotes: defaults.notes || ""
    };
  }

  // submitFormalQuoteRequest
  submitFormalQuoteRequest(contactName, contactEmail, company, phone, city, notes) {
    const now = this._nowIso();
    const basket = this._getOrCreateQuoteBasket();
    let requests = this._getFromStorage("formal_quote_requests", []);

    const request = {
      id: this._generateId("formalrfq"),
      basket_id: basket.id,
      contact_name: contactName,
      contact_email: contactEmail,
      company: company || "",
      phone: phone || "",
      city: city || "",
      notes: notes || "",
      submitted_at: now
    };
    requests.push(request);
    this._saveToStorage("formal_quote_requests", requests);

    // Persist defaults for next time
    const defaults = {
      contactName,
      contactEmail,
      company: company || "",
      phone: phone || "",
      city: city || "",
      notes: notes || ""
    };
    this._saveToStorage("formal_quote_request_defaults", defaults);

    return request;
  }

  // getContactInfo
  getContactInfo() {
    return this._getFromStorage("contact_info", {
      phone: "",
      email: "",
      addresses: [],
      visitInstructions: ""
    });
  }

  // submitContactInquiry
  submitContactInquiry(name, email, message) {
    const now = this._nowIso();
    let inquiries = this._getFromStorage("contact_inquiries", []);
    inquiries.push({
      id: this._generateId("contactinq"),
      name,
      email,
      message,
      created_at: now
    });
    this._saveToStorage("contact_inquiries", inquiries);
    return { success: true };
  }

  // getDesignConsultationOptions
  getDesignConsultationOptions() {
    const options = this._getFromStorage("design_consultation_options", {
      topics: [],
      formats: [],
      timeSlotDurationMinutes: 60
    });

    // If topics not populated, provide a minimal default set
    if (!options.topics || !options.topics.length) {
      options.topics = [
        { value: "new_product_development", label: "New Product Development" },
        {
          value: "design_for_manufacturability",
          label: "Design for Manufacturability"
        },
        { value: "cost_reduction", label: "Cost Reduction" },
        { value: "material_selection", label: "Material Selection" },
        { value: "other", label: "Other" }
      ];
    }

    if (!options.formats || !options.formats.length) {
      options.formats = ["video_call", "phone_call", "onsite_visit"];
    }

    if (!options.timeSlotDurationMinutes) {
      options.timeSlotDurationMinutes = 60;
    }

    return options;
  }

  // bookDesignConsultation
  bookDesignConsultation(
    topic,
    startDatetime,
    durationMinutes,
    format,
    contactName,
    contactEmail,
    company,
    projectDescription
  ) {
    const now = this._nowIso();
    let bookings = this._getFromStorage("design_consultation_bookings", []);

    const startIso = new Date(startDatetime).toISOString();
    const booking = {
      id: this._generateId("dcb"),
      topic,
      start_datetime: startIso,
      duration_minutes: durationMinutes,
      format,
      contact_name: contactName,
      contact_email: contactEmail,
      company: company || "",
      project_description: projectDescription || "",
      created_at: now
    };
    bookings.push(booking);
    this._saveToStorage("design_consultation_bookings", bookings);

    return booking;
  }

  // getAboutContent
  getAboutContent() {
    return this._getFromStorage("about_content", {
      history: "",
      mission: "",
      coreCompetencies: [],
      industryExperience: [],
      qualityAndCompliance: ""
    });
  }

  // getLegalContent
  getLegalContent() {
    return this._getFromStorage("legal_content", {
      privacyPolicy: "",
      termsOfService: "",
      legalContactEmail: ""
    });
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
