/* localStorage polyfill for Node.js and environments without localStorage */
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

  _initStorage() {
    const keys = [
      'service_categories',
      'services',
      'bundles',
      'bundle_included_services',
      'project_plans',
      'project_items',
      'quote_requests',
      'bookings',
      'financing_requests',
      'promo_codes',
      'inspiration_ideas',
      'favorite_ideas',
      'faq_items',
      'contact_inquiries'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  _enumLabel(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _getServiceCategoryName(slug) {
    const categories = this._getFromStorage('service_categories');
    const cat = categories.find((c) => c.slug === slug);
    return cat ? cat.name : '';
  }

  _getBundleIncludedCategoryNames(bundle) {
    if (!bundle || !Array.isArray(bundle.included_categories)) return [];
    return bundle.included_categories.map((slug) => this._getServiceCategoryName(slug));
  }

  _getOrCreateActiveProjectPlan() {
    let plans = this._getFromStorage('project_plans');
    let plan = plans.find((p) => p.status === 'active');
    if (!plan) {
      plan = {
        id: this._generateId('projectplan'),
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: null,
        promo_codes_applied: [],
        subtotal_estimated: 0,
        discount_total: 0,
        total_estimated: 0,
        currency: 'USD',
        overall_notes: ''
      };
      plans.push(plan);
      this._saveToStorage('project_plans', plans);
    }
    return plan;
  }

  _getProjectItemsForPlan(projectPlanId) {
    const items = this._getFromStorage('project_items');
    return items.filter((i) => i.project_plan_id === projectPlanId);
  }

  _getServiceApproxBudgetRange(service) {
    const min = this._toNumber(service.min_project_price || service.base_price || service.starting_from_price, 0);
    const max = this._toNumber(service.max_project_price || min, min);
    return { min, max };
  }

  _computeServicePricingForConfiguration(service, projectItem) {
    if (!service || !projectItem) {
      return {
        unit_price: 0,
        line_subtotal_estimated: 0,
        line_total_estimated: 0
      };
    }

    const priceUnit = service.price_unit;
    let unitPrice = 0;
    let subtotal = 0;

    const quantity = this._toNumber(projectItem.quantity || 1, 1);
    const numRooms = this._toNumber(projectItem.num_rooms || 0, 0);
    const avgSqFtPerRoom = this._toNumber(projectItem.avg_sq_ft_per_room || 0, 0);
    const areaSqFt = this._toNumber(projectItem.area_sq_ft || 0, 0);

    let totalAreaSqFt = this._toNumber(projectItem.total_area_sq_ft || 0, 0);
    if (!totalAreaSqFt) {
      if (areaSqFt) {
        totalAreaSqFt = areaSqFt;
      } else if (numRooms && avgSqFtPerRoom) {
        totalAreaSqFt = numRooms * avgSqFtPerRoom;
      }
    }

    const basePrice = this._toNumber(
      service.base_price || service.starting_from_price || service.min_project_price,
      0
    );

    const pricePerSqFt = this._toNumber(service.price_per_sq_ft, 0);
    const pricePerRoom = this._toNumber(service.price_per_room, 0);

    if (priceUnit === 'per_sq_ft') {
      unitPrice = pricePerSqFt;
      subtotal = unitPrice * totalAreaSqFt;
    } else if (priceUnit === 'per_room') {
      unitPrice = pricePerRoom;
      const rooms = numRooms || 1;
      subtotal = unitPrice * rooms;
    } else if (
      priceUnit === 'per_project' ||
      priceUnit === 'consultation_flat' ||
      priceUnit === 'add_on_flat'
    ) {
      unitPrice = basePrice;
      subtotal = unitPrice * quantity;
    } else if (priceUnit === 'per_hour') {
      unitPrice = basePrice;
      const hours = quantity || 1;
      subtotal = unitPrice * hours;
    }

    // Apply paint tier multipliers if applicable
    let multiplier = 1;
    if (projectItem.paint_quality_tier === 'mid_tier') {
      multiplier = 1.15;
    } else if (projectItem.paint_quality_tier === 'premium') {
      multiplier = 1.3;
    }
    unitPrice *= multiplier;
    subtotal *= multiplier;

    const minProjectPrice = this._toNumber(service.min_project_price, 0);
    if (minProjectPrice && subtotal < minProjectPrice) {
      subtotal = minProjectPrice;
    }

    const cleanUnit = Number(unitPrice.toFixed(2));
    const cleanSubtotal = Number(subtotal.toFixed(2));

    const existingDiscount = this._toNumber(projectItem.promo_discount_amount || 0, 0);
    const lineTotal = Math.max(cleanSubtotal - existingDiscount, 0);

    return {
      unit_price: cleanUnit,
      line_subtotal_estimated: cleanSubtotal,
      line_total_estimated: Number(lineTotal.toFixed(2))
    };
  }

  _validateAndApplyPromoCode(projectPlan, promo, projectItems, options = {}) {
    const addToPlanCodes = !!options.addToPlanCodes;
    const code = promo.code;
    const now = new Date();

    if (!promo.is_active) {
      return { success: false, message: 'Promo code is not active.' };
    }

    if (promo.start_date) {
      const start = new Date(promo.start_date);
      if (start.toString() !== 'Invalid Date' && now < start) {
        return { success: false, message: 'Promo code is not yet active.' };
      }
    }

    if (promo.end_date) {
      const end = new Date(promo.end_date);
      if (end.toString() !== 'Invalid Date' && now > end) {
        return { success: false, message: 'Promo code has expired.' };
      }
    }

    const existingCodes = Array.isArray(projectPlan.promo_codes_applied)
      ? projectPlan.promo_codes_applied
      : [];

    if (addToPlanCodes) {
      const already = existingCodes.some((c) => c.toLowerCase() === code.toLowerCase());
      if (already) {
        return { success: false, message: 'Promo code already applied to project.' };
      }
      if (
        promo.max_uses_per_project &&
        existingCodes.length >= this._toNumber(promo.max_uses_per_project, 0)
      ) {
        return { success: false, message: 'Promo code usage limit reached for this project.' };
      }
    }

    const subtotal = this._toNumber(projectPlan.subtotal_estimated, 0);
    if (promo.minimum_project_subtotal && subtotal < promo.minimum_project_subtotal) {
      return {
        success: false,
        message: 'Project subtotal does not meet minimum required for this promo code.'
      };
    }

    // Determine eligible items based on scope
    let eligibleItems = [];
    if (promo.applies_to_scope === 'entire_project') {
      eligibleItems = projectItems.slice();
    } else if (promo.applies_to_scope === 'category') {
      eligibleItems = projectItems.filter(
        (item) => item.category_slug && item.category_slug === promo.applicable_category_slug
      );
    } else if (promo.applies_to_scope === 'service') {
      const serviceIds = Array.isArray(promo.applicable_service_ids)
        ? promo.applicable_service_ids
        : [];
      eligibleItems = projectItems.filter((item) => serviceIds.includes(item.service_id));
    } else if (promo.applies_to_scope === 'bundle') {
      eligibleItems = projectItems.filter((item) => item.item_type === 'bundle');
    }

    if (!eligibleItems.length) {
      return { success: false, message: 'Promo code does not apply to any items in project.' };
    }

    const totalEligibleSubtotal = eligibleItems.reduce(
      (sum, item) => sum + this._toNumber(item.line_subtotal_estimated, 0),
      0
    );

    if (!totalEligibleSubtotal) {
      return {
        success: false,
        message: 'Eligible items do not have any subtotal to discount.'
      };
    }

    const isPercentage = promo.discount_type === 'percentage';
    const discountValue = this._toNumber(promo.discount_value, 0);

    eligibleItems.forEach((item) => {
      const itemSubtotal = this._toNumber(item.line_subtotal_estimated, 0);
      if (!itemSubtotal) return;

      let discountForItem = 0;
      if (isPercentage) {
        discountForItem = (itemSubtotal * discountValue) / 100;
      } else {
        // fixed_amount: distribute proportionally by subtotal
        const share = itemSubtotal / totalEligibleSubtotal;
        discountForItem = discountValue * share;
      }

      const prevDiscount = this._toNumber(item.promo_discount_amount || 0, 0);
      const newDiscount = prevDiscount + discountForItem;
      const cappedDiscount = Math.min(newDiscount, itemSubtotal);

      item.promo_discount_amount = Number(cappedDiscount.toFixed(2));
      const lineTotal = itemSubtotal - item.promo_discount_amount;
      item.line_total_estimated = Number(Math.max(lineTotal, 0).toFixed(2));
    });

    if (addToPlanCodes) {
      const updatedCodes = Array.isArray(projectPlan.promo_codes_applied)
        ? projectPlan.promo_codes_applied.slice()
        : [];
      updatedCodes.push(code);
      projectPlan.promo_codes_applied = updatedCodes;
    }

    return { success: true, message: 'Promo code applied.' };
  }

  _recalculateProjectTotals(projectPlan) {
    if (!projectPlan) return null;

    const plans = this._getFromStorage('project_plans');
    const items = this._getFromStorage('project_items');
    const services = this._getFromStorage('services');
    const bundles = this._getFromStorage('bundles');
    const promoCodes = this._getFromStorage('promo_codes');

    const planIndex = plans.findIndex((p) => p.id === projectPlan.id);
    if (planIndex === -1) return projectPlan;

    const planItems = items.filter((i) => i.project_plan_id === projectPlan.id);

    // Reset pricing and discounts based on current configuration
    planItems.forEach((item) => {
      if (item.item_type === 'service') {
        const service = services.find((s) => s.id === item.service_id);
        const pricing = this._computeServicePricingForConfiguration(service, item);
        item.unit_price = pricing.unit_price;
        item.line_subtotal_estimated = pricing.line_subtotal_estimated;
        item.promo_discount_amount = 0;
        item.line_total_estimated = pricing.line_subtotal_estimated;
      } else if (item.item_type === 'bundle') {
        const bundle = bundles.find((b) => b.id === item.bundle_id);
        const quantity = this._toNumber(item.quantity || 1, 1);
        const unitPrice = bundle ? this._toNumber(bundle.total_bundle_price, 0) : 0;
        const subtotal = unitPrice * quantity;
        item.unit_price = Number(unitPrice.toFixed(2));
        item.line_subtotal_estimated = Number(subtotal.toFixed(2));
        item.promo_discount_amount = 0;
        item.line_total_estimated = item.line_subtotal_estimated;
      }
    });

    let subtotal = 0;
    planItems.forEach((item) => {
      subtotal += this._toNumber(item.line_subtotal_estimated, 0);
    });

    projectPlan.subtotal_estimated = Number(subtotal.toFixed(2));
    projectPlan.discount_total = 0;
    projectPlan.total_estimated = projectPlan.subtotal_estimated;

    // Re-apply any promo codes stored on the plan
    if (Array.isArray(projectPlan.promo_codes_applied)) {
      projectPlan.promo_codes_applied.forEach((code) => {
        const promo = promoCodes.find((p) => p.code && p.code.toLowerCase() === code.toLowerCase());
        if (!promo) return;
        this._validateAndApplyPromoCode(projectPlan, promo, planItems, {
          addToPlanCodes: false
        });
      });
    }

    let discountTotal = 0;
    planItems.forEach((item) => {
      discountTotal += this._toNumber(item.promo_discount_amount || 0, 0);
    });

    projectPlan.discount_total = Number(discountTotal.toFixed(2));
    projectPlan.total_estimated = Number(
      Math.max(projectPlan.subtotal_estimated - projectPlan.discount_total, 0).toFixed(2)
    );
    projectPlan.updated_at = new Date().toISOString();

    // Persist changes
    const updatedItems = items.map((i) => {
      const updated = planItems.find((pi) => pi.id === i.id);
      return updated || i;
    });

    plans[planIndex] = projectPlan;

    this._saveToStorage('project_items', updatedItems);
    this._saveToStorage('project_plans', plans);

    return projectPlan;
  }

  _generateBookingTimeslotsForDate(serviceId, date) {
    // date is 'YYYY-MM-DD'
    const bookings = this._getFromStorage('bookings').filter(
      (b) => b.service_id === serviceId && b.appointment_date === date
    );

    const startHour = 9; // 9 AM
    const endHour = 19; // 7 PM
    const slotDurationHours = 1;

    const timeslots = [];

    for (let hour = startHour; hour < endHour; hour += slotDurationHours) {
      const startISO = new Date(date + 'T' + String(hour).padStart(2, '0') + ':00:00.000Z');
      const endISO = new Date(date + 'T' + String(hour + slotDurationHours).padStart(2, '0') + ':00:00.000Z');

      const isBooked = bookings.some((b) => {
        const bStart = new Date(b.timeslot_start);
        return bStart.getUTCHours() === startISO.getUTCHours();
      });

      timeslots.push({
        timeslot_start: startISO.toISOString(),
        timeslot_end: endISO.toISOString(),
        is_available: !isBooked
      });
    }

    return {
      service_id: serviceId,
      date,
      timeslots
    };
  }

  _createContactInquiryForProjectSubmission(projectPlan, contact_name, contact_email, contact_phone, additional_notes) {
    const inquiries = this._getFromStorage('contact_inquiries');
    const messageParts = [];

    messageParts.push('Project Plan ID: ' + projectPlan.id);
    messageParts.push('Status: ' + projectPlan.status);
    messageParts.push('Subtotal: ' + projectPlan.subtotal_estimated);
    messageParts.push('Discount: ' + projectPlan.discount_total);
    messageParts.push('Total: ' + projectPlan.total_estimated);
    if (projectPlan.overall_notes) {
      messageParts.push('Project Notes: ' + projectPlan.overall_notes);
    }
    if (additional_notes) {
      messageParts.push('Additional Submission Notes: ' + additional_notes);
    }

    const inquiry = {
      id: this._generateId('contactinquiry'),
      topic: 'existing_project',
      message: messageParts.join('\n'),
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      created_at: new Date().toISOString(),
      status: 'new'
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);
    return inquiry;
  }

  // =====================
  // Core Interface Methods
  // =====================

  // Get top-level service categories for nav
  getServiceCategoriesForNav() {
    const categories = this._getFromStorage('service_categories');
    const result = categories
      .map((category) => ({
        category,
        display_name: category.name,
        icon: category.icon || '',
        sort_order: this._toNumber(category.sort_order || 0, 0)
      }))
      .sort((a, b) => a.sort_order - b.sort_order);
    return result;
  }

  // Get homepage featured content
  getHomeFeaturedContent() {
    const services = this._getFromStorage('services');
    const bundles = this._getFromStorage('bundles');
    const promos = this._getFromStorage('promo_codes');

    const featured_services = services
      .filter((s) => s.is_featured)
      .map((service) => {
        const category_name = this._getServiceCategoryName(service.category_slug);

        let price_summary = '';
        if (service.price_unit === 'per_sq_ft' && service.price_per_sq_ft) {
          price_summary = '$' + Number(service.price_per_sq_ft).toFixed(2) + ' per sq ft';
        } else if (service.price_unit === 'per_room' && service.price_per_room) {
          price_summary = '$' + Number(service.price_per_room).toFixed(2) + ' per room';
        } else if (service.price_unit === 'per_project') {
          const approx = this._getServiceApproxBudgetRange(service);
          price_summary = 'From $' + approx.min.toFixed(0) + ' per project';
        } else if (service.price_unit === 'consultation_flat' || service.price_unit === 'add_on_flat') {
          const base = this._toNumber(
            service.base_price || service.starting_from_price || service.min_project_price,
            0
          );
          price_summary = '$' + base.toFixed(2) + ' flat';
        }

        let rating_summary = '';
        if (service.rating_average) {
          const avg = Number(service.rating_average).toFixed(1);
          const count = this._toNumber(service.rating_count || 0, 0);
          rating_summary = avg + ' stars (' + count + ' reviews)';
        }

        const badge_texts = [];
        if (service.includes_free_inspection) badge_texts.push('Free inspection');
        if (service.warranty_years) {
          badge_texts.push(service.warranty_years + '-year warranty');
        }
        if (service.is_add_on) badge_texts.push('Add-on');

        return {
          service,
          category_name,
          price_summary,
          rating_summary,
          badge_texts
        };
      });

    const featured_bundles = bundles
      .filter((b) => b.is_featured)
      .map((bundle) => {
        const included_category_names = this._getBundleIncludedCategoryNames(bundle);
        let savings_summary = '';
        if (bundle.savings_percentage && bundle.original_price_sum) {
          savings_summary =
            'Save ' + bundle.savings_percentage + '% vs $' + bundle.original_price_sum;
        }
        return {
          bundle,
          included_category_names,
          savings_summary
        };
      });

    const now = new Date();
    const active_promotions = promos.filter((p) => {
      if (!p.is_active) return false;
      if (p.start_date) {
        const start = new Date(p.start_date);
        if (start.toString() !== 'Invalid Date' && now < start) return false;
      }
      if (p.end_date) {
        const end = new Date(p.end_date);
        if (end.toString() !== 'Invalid Date' && now > end) return false;
      }
      return true;
    });

    const how_it_works_steps = [
      {
        step_number: 1,
        title: 'Share your project',
        description: 'Tell us about your remodel goals, budget, and timeline.'
      },
      {
        step_number: 2,
        title: 'Customize your plan',
        description: 'Mix and match services, bundles, and add-ons that fit your home.'
      },
      {
        step_number: 3,
        title: 'Get estimates & schedule',
        description: 'Request quotes, explore financing, and book your start date.'
      }
    ];

    return {
      featured_services,
      featured_bundles,
      active_promotions,
      how_it_works_steps
    };
  }

  // Get lightweight summary of active project plan
  getActiveProjectPlanSummary() {
    const plan = this._getOrCreateActiveProjectPlan();
    const items = this._getProjectItemsForPlan(plan.id);

    // ensure totals up-to-date
    this._recalculateProjectTotals(plan);

    const refreshedPlans = this._getFromStorage('project_plans');
    const refreshedPlan = refreshedPlans.find((p) => p.id === plan.id) || plan;

    return {
      project_plan: refreshedPlan,
      item_count: items.length,
      total_estimated: this._toNumber(refreshedPlan.total_estimated || 0, 0),
      currency: refreshedPlan.currency || 'USD'
    };
  }

  // Service listing filter options
  getServiceFilterOptions(category_slug, add_on_subcategory) {
    let services = this._getFromStorage('services').filter(
      (s) => s.category_slug === category_slug
    );

    if (category_slug === 'add_ons') {
      services = services.filter((s) => s.is_add_on === true);
      if (add_on_subcategory) {
        services = services.filter((s) => s.add_on_subcategory === add_on_subcategory);
      }
    }

    let minBudget = Infinity;
    let maxBudget = 0;
    let minPsf = Infinity;
    let maxPsf = 0;
    const projectTypesSet = new Set();
    const materialTypesSet = new Set();
    const ratingsSet = new Set();
    const warrantiesSet = new Set();

    services.forEach((s) => {
      const range = this._getServiceApproxBudgetRange(s);
      if (range.min < minBudget) minBudget = range.min;
      if (range.max > maxBudget) maxBudget = range.max;

      if (s.price_per_sq_ft) {
        const psf = Number(s.price_per_sq_ft);
        if (psf < minPsf) minPsf = psf;
        if (psf > maxPsf) maxPsf = psf;
      }

      if (s.project_type) projectTypesSet.add(s.project_type);
      if (s.material_type) materialTypesSet.add(s.material_type);
      if (s.rating_average) ratingsSet.add(Math.floor(s.rating_average));
      if (s.warranty_years) warrantiesSet.add(s.warranty_years);
    });

    if (!isFinite(minBudget)) minBudget = 0;
    if (!maxBudget) maxBudget = 0;
    if (!isFinite(minPsf)) minPsf = 0;
    if (!maxPsf) maxPsf = 0;

    const project_type_options = Array.from(projectTypesSet).map((value) => ({
      value,
      label: this._enumLabel(value)
    }));

    const material_type_options = Array.from(materialTypesSet).map((value) => ({
      value,
      label: this._enumLabel(value)
    }));

    const rating_options = Array.from(ratingsSet).sort((a, b) => a - b);
    const warranty_year_options = Array.from(warrantiesSet).sort((a, b) => a - b);

    const special_feature_options = [
      { key: 'includes_free_inspection', label: 'Free inspection' }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'rating_high_to_low', label: 'Rating - High to Low' },
      { value: 'rating_low_to_high', label: 'Rating - Low to High' },
      { value: 'name_az', label: 'Name A-Z' }
    ];

    return {
      budget_range: { min: minBudget, max: maxBudget },
      project_type_options,
      material_type_options,
      price_per_sq_ft_range: { min: minPsf, max: maxPsf },
      rating_options,
      warranty_year_options,
      special_feature_options,
      sort_options
    };
  }

  // Service listing with filters + sorting
  getServicesByCategory(category_slug, filters, sort_option, page, page_size) {
    filters = filters || {};
    page = page || 1;
    page_size = page_size || 20;

    const servicesAll = this._getFromStorage('services');
    const categories = this._getFromStorage('service_categories');

    let services = servicesAll.filter((s) => s.category_slug === category_slug);

    if (filters.min_budget != null || filters.max_budget != null) {
      services = services.filter((s) => {
        const range = this._getServiceApproxBudgetRange(s);
        if (filters.min_budget != null && range.max < filters.min_budget) return false;
        if (filters.max_budget != null && range.min > filters.max_budget) return false;
        return true;
      });
    }

    if (Array.isArray(filters.project_types) && filters.project_types.length) {
      services = services.filter((s) => filters.project_types.includes(s.project_type));
    }

    if (Array.isArray(filters.material_types) && filters.material_types.length) {
      services = services.filter((s) => filters.material_types.includes(s.material_type));
    }

    if (filters.min_price_per_sq_ft != null) {
      services = services.filter(
        (s) =>
          s.price_per_sq_ft != null &&
          Number(s.price_per_sq_ft) >= Number(filters.min_price_per_sq_ft)
      );
    }

    if (filters.max_price_per_sq_ft != null) {
      services = services.filter(
        (s) =>
          s.price_per_sq_ft != null &&
          Number(s.price_per_sq_ft) <= Number(filters.max_price_per_sq_ft)
      );
    }

    if (filters.min_rating != null) {
      services = services.filter(
        (s) => s.rating_average != null && Number(s.rating_average) >= Number(filters.min_rating)
      );
    }

    if (filters.min_warranty_years != null) {
      services = services.filter(
        (s) => s.warranty_years != null && Number(s.warranty_years) >= Number(filters.min_warranty_years)
      );
    }

    if (filters.includes_free_inspection === true) {
      services = services.filter((s) => s.includes_free_inspection === true);
    }

    if (category_slug === 'add_ons') {
      if (filters.is_add_on != null) {
        services = services.filter((s) => s.is_add_on === filters.is_add_on);
      }
      if (filters.add_on_subcategory) {
        services = services.filter(
          (s) => s.add_on_subcategory === filters.add_on_subcategory
        );
      }
    }

    if (sort_option) {
      if (sort_option === 'price_low_to_high' || sort_option === 'price_high_to_low') {
        services.sort((a, b) => {
          const aRange = this._getServiceApproxBudgetRange(a);
          const bRange = this._getServiceApproxBudgetRange(b);
          const aPrice = aRange.min;
          const bPrice = bRange.min;
          return sort_option === 'price_low_to_high' ? aPrice - bPrice : bPrice - aPrice;
        });
      } else if (sort_option === 'rating_high_to_low' || sort_option === 'rating_low_to_high') {
        services.sort((a, b) => {
          const aRating = this._toNumber(a.rating_average || 0, 0);
          const bRating = this._toNumber(b.rating_average || 0, 0);
          return sort_option === 'rating_high_to_low'
            ? bRating - aRating
            : aRating - bRating;
        });
      } else if (sort_option === 'name_az') {
        services.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      }
    }

    const total_items = services.length;
    const total_pages = Math.max(Math.ceil(total_items / page_size), 1);
    const startIndex = (page - 1) * page_size;
    const pagedServices = services.slice(startIndex, startIndex + page_size);

    const results = pagedServices.map((service) => {
      const category = categories.find((c) => c.slug === service.category_slug);
      const category_name = category ? category.name : '';

      let price_summary = '';
      if (service.price_unit === 'per_sq_ft' && service.price_per_sq_ft) {
        price_summary = '$' + Number(service.price_per_sq_ft).toFixed(2) + ' per sq ft';
      } else if (service.price_unit === 'per_room' && service.price_per_room) {
        price_summary = '$' + Number(service.price_per_room).toFixed(2) + ' per room';
      } else if (service.price_unit === 'per_project') {
        const range = this._getServiceApproxBudgetRange(service);
        price_summary = 'From $' + range.min.toFixed(0) + ' per project';
      } else if (
        service.price_unit === 'consultation_flat' ||
        service.price_unit === 'add_on_flat'
      ) {
        const base = this._toNumber(
          service.base_price || service.starting_from_price || service.min_project_price,
          0
        );
        price_summary = '$' + base.toFixed(2) + ' flat';
      }

      let rating_summary = '';
      if (service.rating_average) {
        const avg = Number(service.rating_average).toFixed(1);
        const count = this._toNumber(service.rating_count || 0, 0);
        rating_summary = avg + ' stars (' + count + ' reviews)';
      }

      let warranty_summary = '';
      if (service.warranty_years) {
        warranty_summary = service.warranty_years + '-year warranty';
      }

      const tags = [];
      if (service.material_type) tags.push(this._enumLabel(service.material_type));
      if (service.includes_free_inspection) tags.push('Free inspection');
      if (service.is_add_on) tags.push('Add-on');

      return {
        service,
        category_name,
        price_summary,
        rating_summary,
        warranty_summary,
        tags
      };
    });

    return {
      services: results,
      page,
      total_pages,
      total_items
    };
  }

  // Service detail
  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services');
    const categories = this._getFromStorage('service_categories');

    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      return {
        service: null,
        category_name: '',
        pricing_summary: '',
        timeline_summary: '',
        configuration_schema: {},
        media: [],
        breadcrumbs: []
      };
    }

    const category = categories.find((c) => c.slug === service.category_slug);
    const category_name = category ? category.name : '';

    let pricing_summary = '';
    if (service.price_unit === 'per_sq_ft' && service.price_per_sq_ft) {
      pricing_summary = 'Pricing: $' + Number(service.price_per_sq_ft).toFixed(2) + ' per sq ft';
    } else if (service.price_unit === 'per_room' && service.price_per_room) {
      pricing_summary = 'Pricing: $' + Number(service.price_per_room).toFixed(2) + ' per room';
    } else if (service.price_unit === 'per_project') {
      const range = this._getServiceApproxBudgetRange(service);
      pricing_summary =
        'Pricing: From $' + range.min.toFixed(0) +
        (range.max && range.max !== range.min ? ' up to $' + range.max.toFixed(0) : '') +
        ' per project';
    } else if (
      service.price_unit === 'consultation_flat' ||
      service.price_unit === 'add_on_flat'
    ) {
      const base = this._toNumber(
        service.base_price || service.starting_from_price || service.min_project_price,
        0
      );
      pricing_summary = 'Pricing: $' + base.toFixed(2) + ' flat';
    }

    let timeline_summary = '';
    if (service.average_timeline_weeks) {
      timeline_summary =
        'Estimated timeline: about ' + Number(service.average_timeline_weeks).toFixed(0) +
        ' weeks on average.';
    }

    const configuration_schema = {
      supports_room_configuration: !!service.supports_room_configuration,
      supports_area_configuration: !!service.supports_area_configuration,
      supports_fixture_configuration: !!service.supports_fixture_configuration,
      supports_color_selection: !!service.supports_color_selection,
      available_paint_tiers: Array.isArray(service.available_paint_tiers)
        ? service.available_paint_tiers
        : [],
      available_color_families: [
        'neutral_white',
        'warm_white',
        'cool_white',
        'gray',
        'beige',
        'blue',
        'green',
        'bold_color',
        'other_color'
      ],
      min_rooms: null,
      max_rooms: null,
      min_sq_ft: null,
      max_sq_ft: null,
      min_fixtures: null,
      max_fixtures: null
    };

    const media = [];

    const breadcrumbs = [
      { label: 'Home' },
      { label: category_name || 'Services' },
      { label: service.name }
    ];

    return {
      service,
      category_name,
      pricing_summary,
      timeline_summary,
      configuration_schema,
      media,
      breadcrumbs
    };
  }

  // Quote request
  createQuoteRequest(
    serviceId,
    max_budget,
    number_of_fixtures,
    desired_completion_time_option,
    contact_name,
    contact_email,
    contact_phone,
    additional_details
  ) {
    const services = this._getFromStorage('services');
    const quotes = this._getFromStorage('quote_requests');

    const service = services.find((s) => s.id === serviceId) || null;

    const quote = {
      id: this._generateId('quoterequest'),
      service_id: serviceId,
      service_name_snapshot: service ? service.name : null,
      created_at: new Date().toISOString(),
      max_budget: max_budget != null ? Number(max_budget) : null,
      number_of_fixtures:
        number_of_fixtures != null ? Number(number_of_fixtures) : null,
      desired_completion_time_option: desired_completion_time_option || null,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      additional_details: additional_details || null,
      status: 'submitted'
    };

    quotes.push(quote);
    this._saveToStorage('quote_requests', quotes);

    return {
      quote_request: quote,
      message: 'Quote request submitted.'
    };
  }

  // Booking timeslots
  getBookingTimeSlots(serviceId, date) {
    return this._generateBookingTimeslotsForDate(serviceId, date);
  }

  // Submit booking
  submitBooking(
    serviceId,
    booking_type,
    appointment_date,
    timeslot_start,
    timeslot_end,
    contact_name,
    contact_email,
    contact_phone,
    project_notes
  ) {
    const bookings = this._getFromStorage('bookings');
    const services = this._getFromStorage('services');

    const service = services.find((s) => s.id === serviceId) || null;

    const booking = {
      id: this._generateId('booking'),
      service_id: serviceId,
      service_name_snapshot: service ? service.name : null,
      booking_type,
      appointment_date,
      timeslot_start,
      timeslot_end: timeslot_end || null,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      project_notes: project_notes || null,
      created_at: new Date().toISOString(),
      status: 'pending'
    };

    bookings.push(booking);
    this._saveToStorage('bookings', bookings);

    return {
      booking,
      message: 'Booking submitted.'
    };
  }

  // Add service to project plan
  addServiceToProjectPlan(serviceId, configuration) {
    configuration = configuration || {};
    const plan = this._getOrCreateActiveProjectPlan();
    const services = this._getFromStorage('services');
    const items = this._getFromStorage('project_items');

    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      return {
        project_plan: plan,
        added_item: null,
        project_items: this._getProjectItemsForPlan(plan.id)
      };
    }

    const nowIso = new Date().toISOString();
    const item = {
      id: this._generateId('projectitem'),
      project_plan_id: plan.id,
      item_type: 'service',
      service_id: serviceId,
      bundle_id: null,
      name: service.name,
      category_slug: service.category_slug,
      quantity: configuration.quantity != null ? Number(configuration.quantity) : 1,
      area_sq_ft:
        configuration.area_sq_ft != null ? Number(configuration.area_sq_ft) : null,
      num_rooms: configuration.num_rooms != null ? Number(configuration.num_rooms) : null,
      avg_sq_ft_per_room:
        configuration.avg_sq_ft_per_room != null
          ? Number(configuration.avg_sq_ft_per_room)
          : null,
      total_area_sq_ft:
        configuration.total_area_sq_ft != null
          ? Number(configuration.total_area_sq_ft)
          : null,
      number_of_fixtures:
        configuration.number_of_fixtures != null
          ? Number(configuration.number_of_fixtures)
          : null,
      paint_quality_tier: configuration.paint_quality_tier || null,
      color_name: configuration.color_name || null,
      color_family: configuration.color_family || null,
      material_type: configuration.material_type || service.material_type || null,
      desired_completion_time_option:
        configuration.desired_completion_time_option || null,
      scheduled_start_date: null,
      unit_price: 0,
      line_subtotal_estimated: 0,
      promo_discount_amount: 0,
      line_total_estimated: 0,
      notes: configuration.notes || null,
      added_at: nowIso
    };

    const pricing = this._computeServicePricingForConfiguration(service, item);
    item.unit_price = pricing.unit_price;
    item.line_subtotal_estimated = pricing.line_subtotal_estimated;
    item.line_total_estimated = pricing.line_total_estimated;

    items.push(item);
    this._saveToStorage('project_items', items);

    const updatedPlan = this._recalculateProjectTotals(plan);
    const project_items = this._getProjectItemsForPlan(plan.id);

    return {
      project_plan: updatedPlan,
      added_item: item,
      project_items
    };
  }

  // Add bundle to project plan
  addBundleToProjectPlan(bundleId) {
    const plan = this._getOrCreateActiveProjectPlan();
    const bundles = this._getFromStorage('bundles');
    const items = this._getFromStorage('project_items');

    const bundle = bundles.find((b) => b.id === bundleId);
    if (!bundle) {
      return {
        project_plan: plan,
        added_item: null,
        project_items: this._getProjectItemsForPlan(plan.id)
      };
    }

    const nowIso = new Date().toISOString();
    const quantity = 1;
    const unitPrice = this._toNumber(bundle.total_bundle_price, 0);
    const subtotal = unitPrice * quantity;

    const item = {
      id: this._generateId('projectitem'),
      project_plan_id: plan.id,
      item_type: 'bundle',
      service_id: null,
      bundle_id: bundleId,
      name: bundle.name,
      category_slug: null,
      quantity,
      area_sq_ft: null,
      num_rooms: null,
      avg_sq_ft_per_room: null,
      total_area_sq_ft: null,
      number_of_fixtures: null,
      paint_quality_tier: null,
      color_name: null,
      color_family: null,
      material_type: null,
      desired_completion_time_option: null,
      scheduled_start_date: null,
      unit_price: Number(unitPrice.toFixed(2)),
      line_subtotal_estimated: Number(subtotal.toFixed(2)),
      promo_discount_amount: 0,
      line_total_estimated: Number(subtotal.toFixed(2)),
      notes: null,
      added_at: nowIso
    };

    items.push(item);
    this._saveToStorage('project_items', items);

    const updatedPlan = this._recalculateProjectTotals(plan);
    const project_items = this._getProjectItemsForPlan(plan.id);

    return {
      project_plan: updatedPlan,
      added_item: item,
      project_items
    };
  }

  // Full active project plan detail
  getActiveProjectPlanDetail() {
    const plan = this._getOrCreateActiveProjectPlan();
    const project_plan = this._recalculateProjectTotals(plan) || plan;

    const items = this._getProjectItemsForPlan(project_plan.id);
    const services = this._getFromStorage('services');
    const bundles = this._getFromStorage('bundles');

    const detailedItems = items.map((item) => {
      const service = item.item_type === 'service'
        ? services.find((s) => s.id === item.service_id) || null
        : null;
      const bundle = item.item_type === 'bundle'
        ? bundles.find((b) => b.id === item.bundle_id) || null
        : null;
      return {
        project_item: item,
        service,
        bundle
      };
    });

    return {
      project_plan,
      items: detailedItems
    };
  }

  // Update project item configuration
  updateProjectItemConfiguration(projectItemId, updates) {
    updates = updates || {};

    const items = this._getFromStorage('project_items');
    const services = this._getFromStorage('services');
    const bundles = this._getFromStorage('bundles');
    const plans = this._getFromStorage('project_plans');

    const itemIndex = items.findIndex((i) => i.id === projectItemId);
    if (itemIndex === -1) {
      return {
        project_plan: null,
        updated_item: null
      };
    }

    const item = items[itemIndex];

    const updatableFields = [
      'quantity',
      'area_sq_ft',
      'num_rooms',
      'avg_sq_ft_per_room',
      'total_area_sq_ft',
      'number_of_fixtures',
      'paint_quality_tier',
      'color_name',
      'color_family',
      'material_type',
      'desired_completion_time_option',
      'notes'
    ];

    updatableFields.forEach((field) => {
      if (updates[field] !== undefined) {
        if (
          [
            'quantity',
            'area_sq_ft',
            'num_rooms',
            'avg_sq_ft_per_room',
            'total_area_sq_ft',
            'number_of_fixtures'
          ].includes(field)
        ) {
          item[field] = updates[field] != null ? Number(updates[field]) : null;
        } else {
          item[field] = updates[field];
        }
      }
    });

    // Recompute pricing for this item
    if (item.item_type === 'service') {
      const service = services.find((s) => s.id === item.service_id) || null;
      const pricing = this._computeServicePricingForConfiguration(service, item);
      item.unit_price = pricing.unit_price;
      item.line_subtotal_estimated = pricing.line_subtotal_estimated;
      item.line_total_estimated = pricing.line_total_estimated;
    } else if (item.item_type === 'bundle') {
      const bundle = bundles.find((b) => b.id === item.bundle_id) || null;
      const quantity = this._toNumber(item.quantity || 1, 1);
      const unitPrice = bundle ? this._toNumber(bundle.total_bundle_price, 0) : 0;
      const subtotal = unitPrice * quantity;
      item.unit_price = Number(unitPrice.toFixed(2));
      item.line_subtotal_estimated = Number(subtotal.toFixed(2));
      item.line_total_estimated = item.line_subtotal_estimated;
    }

    items[itemIndex] = item;
    this._saveToStorage('project_items', items);

    const plan = plans.find((p) => p.id === item.project_plan_id) || null;
    const updatedPlan = plan ? this._recalculateProjectTotals(plan) : null;

    return {
      project_plan: updatedPlan,
      updated_item: item
    };
  }

  // Remove project item
  removeProjectItem(projectItemId) {
    const items = this._getFromStorage('project_items');
    const item = items.find((i) => i.id === projectItemId) || null;
    if (!item) {
      return {
        success: false,
        removed_item_id: null,
        project_plan: null
      };
    }

    const remainingItems = items.filter((i) => i.id !== projectItemId);
    this._saveToStorage('project_items', remainingItems);

    const plans = this._getFromStorage('project_plans');
    const plan = plans.find((p) => p.id === item.project_plan_id) || null;
    let updatedPlan = null;
    if (plan) {
      updatedPlan = this._recalculateProjectTotals(plan);
    }

    return {
      success: true,
      removed_item_id: projectItemId,
      project_plan: updatedPlan
    };
  }

  // Apply promo code
  applyPromoCodeToProject(promo_code) {
    const normalizedCode = (promo_code || '').trim();
    if (!normalizedCode) {
      return {
        success: false,
        message: 'Promo code is required.',
        project_plan: this._getOrCreateActiveProjectPlan(),
        items: this._getProjectItemsForPlan(this._getOrCreateActiveProjectPlan().id)
      };
    }

    const plan = this._getOrCreateActiveProjectPlan();
    const promos = this._getFromStorage('promo_codes');
    const items = this._getProjectItemsForPlan(plan.id);

    const promo = promos.find(
      (p) => p.code && p.code.toLowerCase() === normalizedCode.toLowerCase()
    );

    if (!promo) {
      return {
        success: false,
        message: 'Promo code not found.',
        project_plan: plan,
        items
      };
    }

    // First recalc base totals
    const updatedPlanBase = this._recalculateProjectTotals(plan);
    const refreshedItems = this._getProjectItemsForPlan(plan.id);

    const result = this._validateAndApplyPromoCode(
      updatedPlanBase,
      promo,
      refreshedItems,
      { addToPlanCodes: true }
    );

    // Recalculate final totals after applying promo
    let discountTotal = 0;
    refreshedItems.forEach((item) => {
      discountTotal += this._toNumber(item.promo_discount_amount || 0, 0);
    });
    updatedPlanBase.discount_total = Number(discountTotal.toFixed(2));
    updatedPlanBase.total_estimated = Number(
      Math.max(updatedPlanBase.subtotal_estimated - updatedPlanBase.discount_total, 0).toFixed(2)
    );
    updatedPlanBase.updated_at = new Date().toISOString();

    // Persist plan + items
    const plans = this._getFromStorage('project_plans');
    const planIndex = plans.findIndex((p) => p.id === updatedPlanBase.id);
    if (planIndex !== -1) {
      plans[planIndex] = updatedPlanBase;
      this._saveToStorage('project_plans', plans);
    }

    const allItems = this._getFromStorage('project_items');
    const mergedItems = allItems.map((i) => {
      const updated = refreshedItems.find((pi) => pi.id === i.id);
      return updated || i;
    });
    this._saveToStorage('project_items', mergedItems);

    return {
      success: result.success,
      message: result.message,
      project_plan: updatedPlanBase,
      items: refreshedItems
    };
  }

  // Update overall project notes
  updateProjectOverallNotes(overall_notes) {
    const plan = this._getOrCreateActiveProjectPlan();
    const plans = this._getFromStorage('project_plans');

    const planIndex = plans.findIndex((p) => p.id === plan.id);
    if (planIndex === -1) {
      return { project_plan: plan };
    }

    plan.overall_notes = overall_notes || '';
    plan.updated_at = new Date().toISOString();
    plans[planIndex] = plan;
    this._saveToStorage('project_plans', plans);

    return { project_plan: plan };
  }

  // Submit active project for final quote
  submitProjectForFinalQuote(contact_name, contact_email, contact_phone, additional_notes) {
    const plan = this._getOrCreateActiveProjectPlan();
    const updatedPlan = this._recalculateProjectTotals(plan);

    const plans = this._getFromStorage('project_plans');
    const planIndex = plans.findIndex((p) => p.id === updatedPlan.id);
    if (planIndex !== -1) {
      updatedPlan.status = 'submitted';
      updatedPlan.updated_at = new Date().toISOString();
      plans[planIndex] = updatedPlan;
      this._saveToStorage('project_plans', plans);
    }

    const contact_inquiry = this._createContactInquiryForProjectSubmission(
      updatedPlan,
      contact_name,
      contact_email,
      contact_phone,
      additional_notes
    );

    return {
      success: true,
      project_plan: updatedPlan,
      contact_inquiry,
      message: 'Project submitted for final quote.'
    };
  }

  // Financing overview content
  getFinancingOverviewContent() {
    const faqs = this._getFromStorage('faq_items').filter(
      (f) => f.category === 'financing'
    );

    return {
      intro_text:
        'Explore flexible financing options for your remodeling project with loan terms that fit your budget.',
      min_loan_amount: 1000,
      max_loan_amount: 75000,
      supported_terms_months: [12, 24, 36, 48, 60],
      financing_highlights: [
        'No obligation pre-qualification in minutes',
        'Fixed monthly payments',
        'No prepayment penalties on most plans'
      ],
      related_faqs: faqs
    };
  }

  // Submit financing pre-qualification
  submitFinancingPreQualification(
    loan_amount,
    term_months,
    project_type,
    contact_name,
    contact_email,
    zip_code,
    consent_accepted
  ) {
    const financingRequests = this._getFromStorage('financing_requests');

    const request = {
      id: this._generateId('financingrequest'),
      loan_amount: Number(loan_amount),
      term_months: Number(term_months),
      project_type,
      contact_name,
      contact_email,
      zip_code,
      consent_accepted: !!consent_accepted,
      created_at: new Date().toISOString(),
      status: 'submitted',
      response_summary: null
    };

    financingRequests.push(request);
    this._saveToStorage('financing_requests', financingRequests);

    return {
      financing_request: request,
      message: 'Financing pre-qualification submitted.'
    };
  }

  // Inspiration gallery filter options
  getInspirationFilterOptions() {
    const ideas = this._getFromStorage('inspiration_ideas');

    const styleSet = new Set();
    const roomTypeSet = new Set();

    ideas.forEach((idea) => {
      if (idea.style) styleSet.add(idea.style);
      if (idea.room_type) roomTypeSet.add(idea.room_type);
    });

    const style_options = Array.from(styleSet).map((value) => ({
      value,
      label: this._enumLabel(value)
    }));

    const room_type_options = Array.from(roomTypeSet).map((value) => ({
      value,
      label: this._enumLabel(value)
    }));

    return {
      style_options,
      room_type_options
    };
  }

  // Inspiration ideas listing
  getInspirationIdeas(filters, sort_option, page, page_size) {
    filters = filters || {};
    page = page || 1;
    page_size = page_size || 20;

    let ideas = this._getFromStorage('inspiration_ideas');

    if (filters.style) {
      ideas = ideas.filter((i) => i.style === filters.style);
    }

    if (filters.room_type) {
      ideas = ideas.filter((i) => i.room_type === filters.room_type);
    }

    if (Array.isArray(filters.tags) && filters.tags.length) {
      ideas = ideas.filter((i) => {
        if (!Array.isArray(i.tags)) return false;
        return filters.tags.every((tag) => i.tags.includes(tag));
      });
    }

    if (sort_option === 'most_popular') {
      ideas.sort((a, b) => {
        const aScore = this._toNumber(a.popularity_score || 0, 0);
        const bScore = this._toNumber(b.popularity_score || 0, 0);
        return bScore - aScore;
      });
    } else if (sort_option === 'newest') {
      ideas.sort((a, b) => {
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bDate - aDate;
      });
    }

    const total_items = ideas.length;
    const total_pages = Math.max(Math.ceil(total_items / page_size), 1);
    const startIndex = (page - 1) * page_size;
    const paged = ideas.slice(startIndex, startIndex + page_size);

    return {
      ideas: paged,
      page,
      total_pages,
      total_items
    };
  }

  // Inspiration idea detail
  getInspirationIdeaDetail(ideaId) {
    const ideas = this._getFromStorage('inspiration_ideas');
    const categories = this._getFromStorage('service_categories');

    const idea = ideas.find((i) => i.id === ideaId) || null;
    if (!idea) {
      return {
        idea: null,
        related_ideas: [],
        related_service_category_name: ''
      };
    }

    const related_ideas = ideas
      .filter(
        (i) =>
          i.id !== idea.id && i.style === idea.style && i.room_type === idea.room_type
      )
      .slice(0, 6);

    let related_service_category_name = '';
    if (idea.related_service_category_slug) {
      const cat = categories.find(
        (c) => c.slug === idea.related_service_category_slug
      );
      related_service_category_name = cat ? cat.name : '';
    }

    return {
      idea,
      related_ideas,
      related_service_category_name
    };
  }

  // Add inspiration idea to favorites
  addIdeaToFavorites(ideaId, notes) {
    const favorites = this._getFromStorage('favorite_ideas');
    const favorite = {
      id: this._generateId('favoriteidea'),
      idea_id: ideaId,
      saved_at: new Date().toISOString(),
      notes: notes || null
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_ideas', favorites);

    return {
      favorite,
      total_favorites: favorites.length
    };
  }

  // Get favorite ideas (resolve foreign key)
  getFavoriteIdeas() {
    const favorites = this._getFromStorage('favorite_ideas');
    const ideas = this._getFromStorage('inspiration_ideas');

    const result = favorites.map((favorite) => ({
      favorite,
      idea: ideas.find((i) => i.id === favorite.idea_id) || null
    }));

    return {
      favorites: result
    };
  }

  // Remove favorite idea
  removeFavoriteIdea(favoriteId) {
    const favorites = this._getFromStorage('favorite_ideas');
    const remaining = favorites.filter((f) => f.id !== favoriteId);
    const success = remaining.length !== favorites.length;

    this._saveToStorage('favorite_ideas', remaining);

    return {
      success,
      removed_favorite_id: success ? favoriteId : null,
      total_favorites: remaining.length
    };
  }

  // Bundle filter options
  getBundleFilterOptions() {
    const bundles = this._getFromStorage('bundles');

    const bundleTypeSet = new Set();
    let minPrice = Infinity;
    let maxPrice = 0;
    const ratingSet = new Set();

    bundles.forEach((b) => {
      if (b.bundle_type) bundleTypeSet.add(b.bundle_type);
      const price = this._toNumber(b.total_bundle_price || 0, 0);
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
      if (b.rating_average) ratingSet.add(Math.floor(b.rating_average));
    });

    if (!isFinite(minPrice)) minPrice = 0;
    if (!maxPrice) maxPrice = 0;

    const bundle_type_options = Array.from(bundleTypeSet).map((value) => ({
      value,
      label: this._enumLabel(value)
    }));

    const rating_options = Array.from(ratingSet).sort((a, b) => a - b);

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price - Low to High' },
      { value: 'price_high_to_low', label: 'Price - High to Low' },
      { value: 'rating_high_to_low', label: 'Rating - High to Low' }
    ];

    return {
      bundle_type_options,
      price_range: { min: minPrice, max: maxPrice },
      rating_options,
      sort_options
    };
  }

  // Bundles listing
  getBundles(filters, sort_option, page, page_size) {
    filters = filters || {};
    page = page || 1;
    page_size = page_size || 20;

    let bundles = this._getFromStorage('bundles');
    const categories = this._getFromStorage('service_categories');

    if (Array.isArray(filters.bundle_types) && filters.bundle_types.length) {
      bundles = bundles.filter((b) => filters.bundle_types.includes(b.bundle_type));
    }

    if (filters.min_bundle_price != null) {
      bundles = bundles.filter(
        (b) =>
          b.total_bundle_price != null &&
          Number(b.total_bundle_price) >= Number(filters.min_bundle_price)
      );
    }

    if (filters.max_bundle_price != null) {
      bundles = bundles.filter(
        (b) =>
          b.total_bundle_price != null &&
          Number(b.total_bundle_price) <= Number(filters.max_bundle_price)
      );
    }

    if (filters.min_rating != null) {
      bundles = bundles.filter(
        (b) => b.rating_average != null && Number(b.rating_average) >= Number(filters.min_rating)
      );
    }

    if (filters.featured_only) {
      bundles = bundles.filter((b) => b.is_featured === true);
    }

    if (sort_option === 'price_low_to_high' || sort_option === 'price_high_to_low') {
      bundles.sort((a, b) => {
        const aPrice = this._toNumber(a.total_bundle_price || 0, 0);
        const bPrice = this._toNumber(b.total_bundle_price || 0, 0);
        return sort_option === 'price_low_to_high' ? aPrice - bPrice : bPrice - aPrice;
      });
    } else if (sort_option === 'rating_high_to_low') {
      bundles.sort((a, b) => {
        const aRating = this._toNumber(a.rating_average || 0, 0);
        const bRating = this._toNumber(b.rating_average || 0, 0);
        return bRating - aRating;
      });
    }

    const total_items = bundles.length;
    const total_pages = Math.max(Math.ceil(total_items / page_size), 1);
    const startIndex = (page - 1) * page_size;
    const pagedBundles = bundles.slice(startIndex, startIndex + page_size);

    const results = pagedBundles.map((bundle) => {
      const included_category_names =
        Array.isArray(bundle.included_categories) && bundle.included_categories.length
          ? bundle.included_categories.map((slug) => {
              const cat = categories.find((c) => c.slug === slug);
              return cat ? cat.name : '';
            })
          : [];

      let savings_summary = '';
      if (bundle.savings_percentage && bundle.original_price_sum) {
        savings_summary =
          'Save ' + bundle.savings_percentage + '% vs $' + bundle.original_price_sum;
      }

      return {
        bundle,
        included_category_names,
        savings_summary
      };
    });

    return {
      bundles: results,
      page,
      total_pages,
      total_items
    };
  }

  // Bundle detail
  getBundleDetail(bundleId) {
    const bundles = this._getFromStorage('bundles');
    const includedServices = this._getFromStorage('bundle_included_services');
    const services = this._getFromStorage('services');

    const bundle = bundles.find((b) => b.id === bundleId) || null;
    if (!bundle) {
      return {
        bundle: null,
        included_services: [],
        recommended_add_ons: []
      };
    }

    const included_services = includedServices
      .filter((bis) => bis.bundle_id === bundleId)
      .map((bis) => ({
        bundle_included_service: bis,
        service: services.find((s) => s.id === bis.service_id) || null
      }));

    const recommended_add_ons = services.filter(
      (s) => s.category_slug === 'add_ons' && s.is_add_on === true
    );

    return {
      bundle,
      included_services,
      recommended_add_ons
    };
  }

  // About page content
  getAboutPageContent() {
    return {
      company_overview:
        'We are a full-service home remodeling company specializing in kitchens, bathrooms, flooring, painting, roofing, and custom add-ons.',
      values: [
        'Craftsmanship and attention to detail',
        'Transparent pricing and communication',
        'Respect for your home and timeline'
      ],
      service_areas: [
        'Primary metro area and surrounding suburbs',
        'Contact us to confirm availability in your neighborhood'
      ],
      credentials: [
        'Licensed, bonded, and insured',
        'Background-checked crews',
        'Manufacturer-certified installers where applicable'
      ],
      warranty_highlights: [
        'Workmanship warranty on most projects',
        'Extended warranties available on select services',
        'Roofing and major systems backed by multi-year coverage'
      ]
    };
  }

  // Contact page content
  getContactPageContent() {
    const topic_options = [
      { value: 'general_question', label: 'General question' },
      { value: 'existing_project', label: 'Question about an existing project' },
      { value: 'financing', label: 'Financing & payment' },
      { value: 'technical_issue', label: 'Technical issue with the website' },
      { value: 'other', label: 'Other' }
    ];

    return {
      phone: '(555) 000-0000',
      email: 'support@example-remodeling.com',
      address: '123 Remodel Way, Suite 100, Your City, ST 00000',
      service_area_description:
        'We currently serve the greater metro area and nearby suburbs. Contact us to confirm service in your neighborhood.',
      topic_options
    };
  }

  // Submit contact inquiry
  submitContactInquiry(topic, message, contact_name, contact_email, contact_phone) {
    const inquiries = this._getFromStorage('contact_inquiries');

    const inquiry = {
      id: this._generateId('contactinquiry'),
      topic,
      message,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      created_at: new Date().toISOString(),
      status: 'new'
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      contact_inquiry: inquiry,
      message: 'Inquiry submitted.'
    };
  }

  // FAQ items
  getFAQItems(category, featured_only) {
    let faqs = this._getFromStorage('faq_items');

    if (category) {
      faqs = faqs.filter((f) => f.category === category);
    }

    if (featured_only) {
      faqs = faqs.filter((f) => f.is_featured === true);
    }

    return faqs;
  }

  // Legal content
  getLegalContent(section) {
    let title = '';
    let body_html = '';

    if (section === 'terms') {
      title = 'Terms & Conditions';
      body_html =
        '<h1>Terms &amp; Conditions</h1>' +
        '<p>By using this website, you agree to the following terms and conditions. All project timelines and pricing are estimates until confirmed in a written agreement.</p>' +
        '<p>Services, promotions, and financing options are subject to change without notice.</p>';
    } else if (section === 'privacy') {
      title = 'Privacy Policy';
      body_html =
        '<h1>Privacy Policy</h1>' +
        '<p>We respect your privacy and use your information only to provide remodeling services, respond to inquiries, and process financing requests as authorized.</p>' +
        '<p>We do not sell your personal information.</p>';
    } else {
      title = '';
      body_html = '';
    }

    return {
      section,
      title,
      body_html,
      last_updated: new Date().toISOString()
    };
  }
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}