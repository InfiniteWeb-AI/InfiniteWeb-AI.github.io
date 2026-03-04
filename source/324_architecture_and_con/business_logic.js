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
    const tableKeys = [
      // Legacy/example keys from skeleton
      'users',
      'products',
      'carts',
      'cartItems',
      // Domain-specific entities
      'service_categories',
      'services',
      'quote_requests',
      'portfolio_projects',
      'project_shortlists',
      'consultation_bookings',
      'design_packages',
      'package_inquiries',
      'saved_estimates',
      'blog_articles',
      'reading_lists',
      'offices',
      'office_inquiries',
      'build_component_options',
      'custom_package_configurations',
      'inquiry_carts',
      'testimonials',
      'testimonial_favorites'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Ensure default build component options exist so configurator has all core categories
    const existingBuildOptions = this._getFromStorage('build_component_options');
    if (!existingBuildOptions || existingBuildOptions.length === 0) {
      const defaultBuildOptions = [
        {
          id: 'framing_standard_2x6',
          component_type: 'framing',
          name: 'Standard 2x6 Wood Framing',
          description:
            'Efficient 2x6 exterior wall framing with advanced framing details for material savings.',
          cost_adjustment: 0,
          cost_level: 'low',
          is_default: true,
          is_premium: false
        },
        {
          id: 'roofing_asphalt_basic',
          component_type: 'roofing',
          name: 'Architectural Asphalt Shingle Roof',
          description:
            'Durable architectural asphalt shingles with standard underlayment and flashing.',
          cost_adjustment: 18000,
          cost_level: 'mid',
          is_default: true,
          is_premium: false
        },
        {
          id: 'finishes_standard_package',
          component_type: 'finishes',
          name: 'Standard Durable Finishes Package',
          description:
            'Cost-conscious interior finishes including LVP flooring, stock cabinets, and quartz counters.',
          cost_adjustment: 20000,
          cost_level: 'mid',
          is_default: true,
          is_premium: false
        }
      ];
      this._saveToStorage('build_component_options', defaultBuildOptions);
    }

    // id counter
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

  _nowIso() {
    return new Date().toISOString();
  }

  // ----------------------
  // Private helper entities
  // ----------------------

  _getOrCreateProjectShortlist() {
    const key = 'project_shortlists';
    const lists = this._getFromStorage(key);
    if (lists.length > 0) {
      return lists[0];
    }
    const now = this._nowIso();
    const shortlist = {
      id: this._generateId('shortlist'),
      project_ids: [],
      created_at: now,
      updated_at: now
    };
    lists.push(shortlist);
    this._saveToStorage(key, lists);
    return shortlist;
  }

  _getOrCreateReadingList() {
    const key = 'reading_lists';
    const lists = this._getFromStorage(key);
    if (lists.length > 0) {
      return lists[0];
    }
    const now = this._nowIso();
    const list = {
      id: this._generateId('reading_list'),
      article_ids: [],
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage(key, lists);
    return list;
  }

  _getOrCreateInquiryCart() {
    const key = 'inquiry_carts';
    const carts = this._getFromStorage(key);
    if (carts.length > 0) {
      return carts[0];
    }
    const now = this._nowIso();
    const cart = {
      id: this._generateId('inquiry_cart'),
      design_package_ids: [],
      custom_package_configuration_ids: [],
      created_at: now,
      updated_at: now
    };
    carts.push(cart);
    this._saveToStorage(key, carts);
    return cart;
  }

  _getOrCreateTestimonialFavoritesList() {
    const key = 'testimonial_favorites';
    const lists = this._getFromStorage(key);
    if (lists.length > 0) {
      return lists[0];
    }
    const now = this._nowIso();
    const list = {
      id: this._generateId('testimonial_favorites'),
      testimonial_ids: [],
      created_at: now,
      updated_at: now
    };
    lists.push(list);
    this._saveToStorage(key, lists);
    return list;
  }

  // Construction estimate calculation helper
  _calculateConstructionEstimate(projectType, locationZip, homeSizeSqFt, finishLevel) {
    const size = Number(homeSizeSqFt) || 0;

    // Base cost per sq ft by project type
    let basePerSqFt = 200; // default
    if (projectType === 'single_family_home') basePerSqFt = 220;
    else if (projectType === 'multi_family_home') basePerSqFt = 210;
    else if (projectType === 'townhome') basePerSqFt = 215;
    else if (projectType === 'apartment') basePerSqFt = 190;
    else if (projectType === 'renovation') basePerSqFt = 150;

    // Regional adjustment based on ZIP prefix (very simple heuristic)
    let regionMultiplier = 1;
    if (typeof locationZip === 'string') {
      if (locationZip.startsWith('94') || locationZip.startsWith('100') || locationZip.startsWith('101')) {
        regionMultiplier = 1.2; // higher-cost urban areas
      } else if (locationZip.startsWith('90') || locationZip.startsWith('91')) {
        regionMultiplier = 1.1;
      }
    }

    // Finish level multiplier
    let finishMultiplier = 1;
    if (finishLevel === 'basic') finishMultiplier = 0.9;
    else if (finishLevel === 'mid_range') finishMultiplier = 1.0;
    else if (finishLevel === 'premium') finishMultiplier = 1.2;
    else if (finishLevel === 'luxury') finishMultiplier = 1.4;

    const base_cost = basePerSqFt * size * regionMultiplier;
    const finishes_cost = base_cost * (finishMultiplier - 1 + 0.15); // add some dedicated finishes cost
    const labor_cost = base_cost * 0.3;
    const subtotal = base_cost + finishes_cost + labor_cost;
    const contingency_cost = subtotal * 0.1;

    const total_estimated_cost = Math.round(base_cost + finishes_cost + labor_cost + contingency_cost);

    return {
      project_type: projectType,
      location_zip: locationZip,
      home_size_sq_ft: size,
      finish_level: finishLevel,
      total_estimated_cost,
      cost_breakdown: {
        base_cost: Math.round(base_cost),
        finishes_cost: Math.round(finishes_cost),
        labor_cost: Math.round(labor_cost),
        contingency_cost: Math.round(contingency_cost)
      }
    };
  }

  // Custom package total helper
  _calculateCustomPackageTotal(basePrice, componentOptions) {
    const base = Number(basePrice) || 0;
    const adjustments = (componentOptions || []).reduce((sum, opt) => {
      return sum + (Number(opt && opt.cost_adjustment) || 0);
    }, 0);
    return base + adjustments;
  }

  // Utility: shallow clone array and update entity in storage
  _updateEntityInCollection(storageKey, updatedEntity) {
    const list = this._getFromStorage(storageKey);
    const idx = list.findIndex((item) => item.id === updatedEntity.id);
    if (idx >= 0) {
      list[idx] = updatedEntity;
      this._saveToStorage(storageKey, list);
    }
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // 1) getHomePageSummary
  getHomePageSummary() {
    const serviceCategories = this._getFromStorage('service_categories');
    const portfolioProjects = this._getFromStorage('portfolio_projects');
    const testimonials = this._getFromStorage('testimonials');

    const residentialProjects = portfolioProjects.filter((p) => p.category === 'residential');
    const commercialProjects = portfolioProjects.filter((p) => p.category === 'commercial');

    const sortByDateDesc = (arr) => {
      return arr
        .slice()
        .sort((a, b) => {
          const da = a.completion_date ? new Date(a.completion_date).getTime() : 0;
          const db = b.completion_date ? new Date(b.completion_date).getTime() : 0;
          return db - da;
        });
    };

    const pickFeaturedOrRecent = (arr, limit) => {
      const featured = arr.filter((p) => p.is_featured);
      const source = featured.length > 0 ? featured : sortByDateDesc(arr);
      return source.slice(0, limit);
    };

    const featured_residential_projects = pickFeaturedOrRecent(residentialProjects, 3);
    const featured_commercial_projects = pickFeaturedOrRecent(commercialProjects, 3);

    const highlight_testimonials = testimonials
      .slice()
      .sort((a, b) => {
        const ra = Number(a.rating) || 0;
        const rb = Number(b.rating) || 0;
        if (rb !== ra) return rb - ra;
        const da = a.completion_date ? new Date(a.completion_date).getTime() : 0;
        const db = b.completion_date ? new Date(b.completion_date).getTime() : 0;
        return db - da;
      })
      .slice(0, 3);

    const company_overview =
      'We are a full-service architecture and construction studio specializing in residential renovations, custom homes, and carefully managed commercial projects.';

    const primary_calls_to_action = [
      {
        key: 'request_renovation_quote',
        label: 'Request a Renovation Quote',
        description: 'Share a few details about your project to receive a tailored budget range.'
      },
      {
        key: 'book_consultation',
        label: 'Book a Consultation',
        description: 'Schedule a 60-minute consultation with our design-build team.'
      },
      {
        key: 'view_design_packages',
        label: 'Browse House Plans',
        description: 'Explore pre-designed house plans that can be customized to your site.'
      }
    ];

    return {
      company_overview,
      featured_service_categories: serviceCategories,
      featured_residential_projects,
      featured_commercial_projects,
      highlight_testimonials,
      primary_calls_to_action
    };
  }

  // 2) getServiceCategories
  getServiceCategories() {
    return this._getFromStorage('service_categories');
  }

  // 3) getServicesByCategoryKey(categoryKey)
  getServicesByCategoryKey(categoryKey) {
    const services = this._getFromStorage('services');
    return services.filter((s) => s.category_key === categoryKey);
  }

  // 4) getServiceDetail(serviceKey)
  getServiceDetail(serviceKey) {
    const services = this._getFromStorage('services');
    const categories = this._getFromStorage('service_categories');
    const projects = this._getFromStorage('portfolio_projects');

    const service = services.find((s) => s.key === serviceKey) || null;
    if (!service) {
      return {
        service: null,
        related_portfolio_projects: [],
        quote_form_defaults: {
          default_project_type: 'other',
          suggested_budget_min: null,
          suggested_budget_max: null,
          default_area_unit: 'sq_ft',
          notes: 'Service not found.'
        }
      };
    }

    const category = categories.find((c) => c.key === service.category_key) || null;
    const category_name = category ? category.name : '';

    // Determine related projects based on residential/commercial flags
    let related_portfolio_projects = [];
    if (service.is_residential) {
      related_portfolio_projects = projects.filter((p) => p.category === 'residential');
    } else if (service.is_commercial) {
      related_portfolio_projects = projects.filter((p) => p.category === 'commercial');
    }

    // Sort related projects by most recent
    related_portfolio_projects = related_portfolio_projects
      .slice()
      .sort((a, b) => {
        const da = a.completion_date ? new Date(a.completion_date).getTime() : 0;
        const db = b.completion_date ? new Date(b.completion_date).getTime() : 0;
        return db - da;
      })
      .slice(0, 6);

    // Map service.key to a default project_type enum where possible
    const validProjectTypes = [
      'kitchen_renovation',
      'bathroom_renovation',
      'home_extension',
      'single_family_home',
      'commercial_interior_fit_out',
      'small_commercial_project',
      'renovation',
      'other'
    ];
    const defaultProjectType = validProjectTypes.includes(service.key)
      ? service.key
      : 'other';

    const quote_form_defaults = {
      default_project_type: defaultProjectType,
      suggested_budget_min: service.typical_min_budget || null,
      suggested_budget_max: service.typical_max_budget || null,
      default_area_unit: service.project_size_unit || 'sq_ft',
      notes: 'These ranges are typical and will be refined after a consultation.'
    };

    const serviceWithCategoryName = {
      id: service.id,
      name: service.name,
      key: service.key,
      category_key: service.category_key,
      category_name,
      short_description: service.short_description || '',
      long_description: service.long_description || '',
      typical_min_budget: service.typical_min_budget || null,
      typical_max_budget: service.typical_max_budget || null,
      min_project_size: service.min_project_size || null,
      max_project_size: service.max_project_size || null,
      project_size_unit: service.project_size_unit || null,
      is_residential: !!service.is_residential,
      is_commercial: !!service.is_commercial,
      hero_image: service.hero_image || ''
    };

    return {
      service: serviceWithCategoryName,
      related_portfolio_projects,
      quote_form_defaults
    };
  }

  // 5) submitQuoteRequest
  submitQuoteRequest(
    serviceId,
    projectType,
    projectTitle,
    projectLocation,
    city,
    state,
    zipCode,
    areaSize,
    areaUnit,
    budgetMin,
    budgetMax,
    preferredStartDate,
    additionalDetails,
    contactName,
    contactEmail,
    contactPhone
  ) {
    const quote_requests = this._getFromStorage('quote_requests');

    const id = this._generateId('quote');
    const now = this._nowIso();

    const record = {
      id,
      service_id: serviceId || null,
      project_type: projectType,
      project_title: projectTitle || null,
      project_location: projectLocation,
      city: city || null,
      state: state || null,
      zip_code: zipCode || null,
      area_size: areaSize != null ? Number(areaSize) : null,
      area_unit: areaUnit || null,
      budget_min: budgetMin != null ? Number(budgetMin) : null,
      budget_max: Number(budgetMax),
      preferred_start_date: preferredStartDate || null,
      additional_details: additionalDetails || null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      created_at: now
    };

    quote_requests.push(record);
    this._saveToStorage('quote_requests', quote_requests);

    return {
      success: true,
      quote_request_id: id,
      message: 'Quote request submitted successfully.',
      created_quote_request: {
        id,
        project_type: record.project_type,
        project_location: record.project_location,
        budget_max: record.budget_max,
        preferred_start_date: record.preferred_start_date,
        created_at: record.created_at
      }
    };
  }

  // 6) getPortfolioFilterOptions
  getPortfolioFilterOptions(category) {
    let projects = this._getFromStorage('portfolio_projects');
    if (category) {
      projects = projects.filter((p) => p.category === category);
    }

    const stylesSet = new Set();
    const yearsSet = new Set();
    let budgetMin = null;
    let budgetMax = null;

    projects.forEach((p) => {
      if (p.style) stylesSet.add(p.style);
      const year = p.completion_year || (p.completion_date ? new Date(p.completion_date).getFullYear() : null);
      if (year) yearsSet.add(year);

      const val =
        p.budget_total != null
          ? Number(p.budget_total)
          : p.budget_max != null
          ? Number(p.budget_max)
          : p.budget_min != null
          ? Number(p.budget_min)
          : null;
      if (val != null && !isNaN(val)) {
        if (budgetMin == null || val < budgetMin) budgetMin = val;
        if (budgetMax == null || val > budgetMax) budgetMax = val;
      }
    });

    const styles = Array.from(stylesSet);
    const completion_years = Array.from(yearsSet).sort((a, b) => b - a);

    return {
      styles,
      completion_years,
      budget_min: budgetMin,
      budget_max: budgetMax
    };
  }

  // 7) searchPortfolioProjects
  searchPortfolioProjects(category, style, completionYears, budgetMin, budgetMax, sortBy) {
    let projects = this._getFromStorage('portfolio_projects');

    if (category) {
      projects = projects.filter((p) => p.category === category);
    }

    if (style) {
      projects = projects.filter((p) => p.style === style);
    }

    if (Array.isArray(completionYears) && completionYears.length > 0) {
      const yearSet = new Set(completionYears.map((y) => Number(y)));
      projects = projects.filter((p) => {
        const y = p.completion_year || (p.completion_date ? new Date(p.completion_date).getFullYear() : null);
        return y != null && yearSet.has(Number(y));
      });
    }

    if (budgetMin != null || budgetMax != null) {
      const minVal = budgetMin != null ? Number(budgetMin) : null;
      const maxVal = budgetMax != null ? Number(budgetMax) : null;
      projects = projects.filter((p) => {
        const val =
          p.budget_total != null
            ? Number(p.budget_total)
            : p.budget_max != null
            ? Number(p.budget_max)
            : p.budget_min != null
            ? Number(p.budget_min)
            : null;
        if (val == null || isNaN(val)) return false;
        if (minVal != null && val < minVal) return false;
        if (maxVal != null && val > maxVal) return false;
        return true;
      });
    }

    const toDate = (p) => (p.completion_date ? new Date(p.completion_date).getTime() : 0);

    if (sortBy === 'most_recent') {
      projects = projects.slice().sort((a, b) => toDate(b) - toDate(a));
    } else if (sortBy === 'budget_low_to_high') {
      projects = projects.slice().sort((a, b) => {
        const av =
          a.budget_total != null
            ? Number(a.budget_total)
            : a.budget_max != null
            ? Number(a.budget_max)
            : a.budget_min != null
            ? Number(a.budget_min)
            : 0;
        const bv =
          b.budget_total != null
            ? Number(b.budget_total)
            : b.budget_max != null
            ? Number(b.budget_max)
            : b.budget_min != null
            ? Number(b.budget_min)
            : 0;
        return av - bv;
      });
    } else if (sortBy === 'budget_high_to_low') {
      projects = projects.slice().sort((a, b) => {
        const av =
          a.budget_total != null
            ? Number(a.budget_total)
            : a.budget_max != null
            ? Number(a.budget_max)
            : a.budget_min != null
            ? Number(a.budget_min)
            : 0;
        const bv =
          b.budget_total != null
            ? Number(b.budget_total)
            : b.budget_max != null
            ? Number(b.budget_max)
            : b.budget_min != null
            ? Number(b.budget_min)
            : 0;
        return bv - av;
      });
    }

    return projects;
  }

  // 8) addProjectToShortlist
  addProjectToShortlist(projectId) {
    const shortlist = this._getOrCreateProjectShortlist();
    if (!shortlist.project_ids.includes(projectId)) {
      shortlist.project_ids.push(projectId);
      shortlist.updated_at = this._nowIso();
      this._updateEntityInCollection('project_shortlists', shortlist);
    }

    return {
      success: true,
      shortlist_id: shortlist.id,
      project_ids: shortlist.project_ids.slice(),
      total_projects: shortlist.project_ids.length,
      message: 'Project added to shortlist.'
    };
  }

  // 9) removeProjectFromShortlist
  removeProjectFromShortlist(projectId) {
    const shortlist = this._getOrCreateProjectShortlist();
    const idx = shortlist.project_ids.indexOf(projectId);
    if (idx >= 0) {
      shortlist.project_ids.splice(idx, 1);
      shortlist.updated_at = this._nowIso();
      this._updateEntityInCollection('project_shortlists', shortlist);
    }
    return {
      success: true,
      shortlist_id: shortlist.id,
      project_ids: shortlist.project_ids.slice(),
      total_projects: shortlist.project_ids.length,
      message: 'Project removed from shortlist.'
    };
  }

  // 10) getProjectShortlist (with FK resolution)
  getProjectShortlist() {
    const shortlist = this._getOrCreateProjectShortlist();
    const projectsAll = this._getFromStorage('portfolio_projects');

    const projects = shortlist.project_ids
      .map((id) => projectsAll.find((p) => p.id === id) || null)
      .filter((p) => p !== null);

    return {
      shortlist_id: shortlist.id,
      projects,
      total_projects: projects.length,
      last_updated: shortlist.updated_at || shortlist.created_at
    };
  }

  // 11) getConsultationBookingOptions
  getConsultationBookingOptions() {
    const consultation_types = ['on_site', 'virtual', 'phone'];
    const project_types = [
      'kitchen_renovation',
      'bathroom_renovation',
      'home_extension',
      'single_family_home',
      'commercial_interior_fit_out',
      'small_commercial_project',
      'renovation',
      'other'
    ];
    const available_time_slots = [
      '9:00 AM',
      '10:00 AM',
      '11:00 AM',
      '1:00 PM',
      '2:00 PM',
      '3:00 PM'
    ];
    const default_duration_minutes = 60;

    return {
      consultation_types,
      project_types,
      available_time_slots,
      default_duration_minutes
    };
  }

  // Helper: combine date and time slot into ISO string (best-effort)
  _combineDateAndTimeSlot(preferredDate, timeSlot) {
    const date = new Date(preferredDate);
    if (isNaN(date.getTime())) {
      return preferredDate || null;
    }
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(timeSlot || '');
    if (!m) {
      return date.toISOString();
    }
    let hour = parseInt(m[1], 10);
    const minute = parseInt(m[2], 10);
    const ampm = m[3].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  }

  // 12) submitConsultationBooking
  submitConsultationBooking(
    consultationType,
    projectType,
    projectDescription,
    preferredDate,
    timeSlot,
    durationMinutes,
    budgetMin,
    budgetMax,
    contactName,
    contactEmail,
    contactPhone
  ) {
    const bookings = this._getFromStorage('consultation_bookings');
    const id = this._generateId('consult');
    const now = this._nowIso();

    const scheduledIso = this._combineDateAndTimeSlot(preferredDate, timeSlot);

    const record = {
      id,
      consultation_type: consultationType,
      project_type: projectType,
      project_description: projectDescription || null,
      preferred_date: scheduledIso,
      time_slot: timeSlot,
      duration_minutes: durationMinutes != null ? Number(durationMinutes) : 60,
      budget_min: Number(budgetMin),
      budget_max: Number(budgetMax),
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      status: 'requested',
      created_at: now
    };

    bookings.push(record);
    this._saveToStorage('consultation_bookings', bookings);

    return {
      success: true,
      booking_id: id,
      status: 'requested',
      message: 'Consultation booking submitted successfully.',
      scheduled_at: scheduledIso
    };
  }

  // 13) getDesignPackageFilterOptions
  getDesignPackageFilterOptions() {
    const packages = this._getFromStorage('design_packages');
    const bedroomSet = new Set();
    const styleSet = new Set();
    let floorMin = null;
    let floorMax = null;
    let priceMin = null;
    let priceMax = null;

    packages.forEach((p) => {
      if (p.bedrooms != null) bedroomSet.add(Number(p.bedrooms));
      if (p.style) styleSet.add(p.style);

      const area = p.floor_area_sq_ft != null ? Number(p.floor_area_sq_ft) : null;
      if (area != null && !isNaN(area)) {
        if (floorMin == null || area < floorMin) floorMin = area;
        if (floorMax == null || area > floorMax) floorMax = area;
      }
      const price = p.base_price != null ? Number(p.base_price) : null;
      if (price != null && !isNaN(price)) {
        if (priceMin == null || price < priceMin) priceMin = price;
        if (priceMax == null || price > priceMax) priceMax = price;
      }
    });

    return {
      bedroom_options: Array.from(bedroomSet).sort((a, b) => a - b),
      floor_area_min_sq_ft: floorMin,
      floor_area_max_sq_ft: floorMax,
      price_min: priceMin,
      price_max: priceMax,
      styles: Array.from(styleSet)
    };
  }

  // 14) searchDesignPackages
  searchDesignPackages(
    minBedrooms,
    maxBedrooms,
    minFloorAreaSqFt,
    maxFloorAreaSqFt,
    minPrice,
    maxPrice,
    style,
    sortBy
  ) {
    let packages = this._getFromStorage('design_packages');

    if (minBedrooms != null) {
      const minB = Number(minBedrooms);
      packages = packages.filter((p) => p.bedrooms != null && Number(p.bedrooms) >= minB);
    }
    if (maxBedrooms != null) {
      const maxB = Number(maxBedrooms);
      packages = packages.filter((p) => p.bedrooms != null && Number(p.bedrooms) <= maxB);
    }

    if (minFloorAreaSqFt != null) {
      const minA = Number(minFloorAreaSqFt);
      packages = packages.filter(
        (p) => p.floor_area_sq_ft != null && Number(p.floor_area_sq_ft) >= minA
      );
    }
    if (maxFloorAreaSqFt != null) {
      const maxA = Number(maxFloorAreaSqFt);
      packages = packages.filter(
        (p) => p.floor_area_sq_ft != null && Number(p.floor_area_sq_ft) <= maxA
      );
    }

    if (minPrice != null) {
      const minP = Number(minPrice);
      packages = packages.filter((p) => p.base_price != null && Number(p.base_price) >= minP);
    }
    if (maxPrice != null) {
      const maxP = Number(maxPrice);
      packages = packages.filter((p) => p.base_price != null && Number(p.base_price) <= maxP);
    }

    if (style) {
      packages = packages.filter((p) => p.style === style);
    }

    if (sortBy === 'price_low_to_high') {
      packages = packages.slice().sort((a, b) => Number(a.base_price || 0) - Number(b.base_price || 0));
    } else if (sortBy === 'price_high_to_low') {
      packages = packages.slice().sort((a, b) => Number(b.base_price || 0) - Number(a.base_price || 0));
    } else if (sortBy === 'floor_area_low_to_high') {
      packages = packages
        .slice()
        .sort((a, b) => Number(a.floor_area_sq_ft || 0) - Number(b.floor_area_sq_ft || 0));
    }

    return packages;
  }

  // 15) getDesignPackageDetail
  getDesignPackageDetail(slug) {
    const packages = this._getFromStorage('design_packages');
    const design_package = packages.find((p) => p.slug === slug) || null;

    if (!design_package) {
      return {
        design_package: null,
        related_design_packages: []
      };
    }

    const related_design_packages = packages
      .filter((p) => p.id !== design_package.id && p.style === design_package.style)
      .slice(0, 4);

    return {
      design_package,
      related_design_packages
    };
  }

  // 16) addDesignPackageToInquiryCart
  addDesignPackageToInquiryCart(designPackageId) {
    const cart = this._getOrCreateInquiryCart();
    if (!Array.isArray(cart.design_package_ids)) {
      cart.design_package_ids = [];
    }
    if (!cart.design_package_ids.includes(designPackageId)) {
      cart.design_package_ids.push(designPackageId);
      cart.updated_at = this._nowIso();
      this._updateEntityInCollection('inquiry_carts', cart);
    }

    return {
      success: true,
      inquiry_cart_id: cart.id,
      design_package_ids: cart.design_package_ids.slice(),
      total_design_packages: cart.design_package_ids.length,
      message: 'Design package added to inquiry cart.'
    };
  }

  // 17) submitPackageInquiry
  submitPackageInquiry(designPackageId, message, contactName, contactEmail, contactPhone) {
    const inquiries = this._getFromStorage('package_inquiries');
    const id = this._generateId('package_inquiry');
    const now = this._nowIso();

    const record = {
      id,
      design_package_id: designPackageId,
      message: message || null,
      contact_name: contactName || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      created_at: now
    };

    inquiries.push(record);
    this._saveToStorage('package_inquiries', inquiries);

    return {
      success: true,
      package_inquiry_id: id,
      message: 'Package inquiry submitted successfully.'
    };
  }

  // 18) getCostCalculatorOptions
  getCostCalculatorOptions() {
    const project_types = [
      'single_family_home',
      'multi_family_home',
      'townhome',
      'apartment',
      'renovation',
      'other'
    ];
    const finish_levels = ['basic', 'mid_range', 'premium', 'luxury'];
    const default_home_size_sq_ft = 1600;
    const default_location_zip = '94110';

    return {
      project_types,
      finish_levels,
      default_home_size_sq_ft,
      default_location_zip
    };
  }

  // 19) getConstructionEstimate
  getConstructionEstimate(projectType, locationZip, homeSizeSqFt, finishLevel) {
    return this._calculateConstructionEstimate(projectType, locationZip, homeSizeSqFt, finishLevel);
  }

  // 20) saveConstructionEstimate
  saveConstructionEstimate(projectType, locationZip, homeSizeSqFt, finishLevel, notes) {
    const estimates = this._getFromStorage('saved_estimates');
    const estimate = this._calculateConstructionEstimate(
      projectType,
      locationZip,
      homeSizeSqFt,
      finishLevel
    );

    const id = this._generateId('estimate');
    const now = this._nowIso();

    const record = {
      id,
      project_type: projectType,
      location_zip: locationZip,
      home_size_sq_ft: Number(homeSizeSqFt) || 0,
      finish_level: finishLevel,
      total_estimated_cost: estimate.total_estimated_cost,
      created_at: now,
      notes: notes || null
    };

    estimates.push(record);
    this._saveToStorage('saved_estimates', estimates);

    return {
      success: true,
      saved_estimate_id: id,
      total_estimated_cost: estimate.total_estimated_cost,
      message: 'Estimate saved successfully.'
    };
  }

  // 21) getSavedEstimatesList
  getSavedEstimatesList() {
    return this._getFromStorage('saved_estimates');
  }

  // 22) getSavedEstimateDetail
  getSavedEstimateDetail(savedEstimateId) {
    const estimates = this._getFromStorage('saved_estimates');
    const saved_estimate = estimates.find((e) => e.id === savedEstimateId) || null;
    return { saved_estimate };
  }

  // 23) getBlogFilterOptions
  getBlogFilterOptions() {
    const articles = this._getFromStorage('blog_articles');
    const yearsSet = new Set();
    const tagsSet = new Set();
    const readingTimeSet = new Set();

    articles.forEach((a) => {
      if (a.published_date) {
        const y = new Date(a.published_date).getFullYear();
        if (!isNaN(y)) yearsSet.add(y);
      }
      if (Array.isArray(a.tags)) {
        a.tags.forEach((t) => tagsSet.add(t));
      }
      if (a.reading_time_minutes != null) {
        readingTimeSet.add(Number(a.reading_time_minutes));
      }
    });

    return {
      available_years: Array.from(yearsSet).sort((a, b) => b - a),
      available_tags: Array.from(tagsSet),
      reading_time_options_minutes: Array.from(readingTimeSet).sort((a, b) => a - b)
    };
  }

  // 24) searchBlogArticles
  searchBlogArticles(
    query,
    minPublishedYear,
    maxPublishedYear,
    tags,
    maxReadingTimeMinutes,
    sortBy
  ) {
    let articles = this._getFromStorage('blog_articles');

    if (query) {
      const q = query.toLowerCase();
      articles = articles.filter((a) => {
        const haystack = [a.title, a.excerpt, a.content]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (minPublishedYear != null || maxPublishedYear != null) {
      const minY = minPublishedYear != null ? Number(minPublishedYear) : null;
      const maxY = maxPublishedYear != null ? Number(maxPublishedYear) : null;
      articles = articles.filter((a) => {
        if (!a.published_date) return false;
        const y = new Date(a.published_date).getFullYear();
        if (isNaN(y)) return false;
        if (minY != null && y < minY) return false;
        if (maxY != null && y > maxY) return false;
        return true;
      });
    }

    if (Array.isArray(tags) && tags.length > 0) {
      const tagSet = new Set(tags);
      articles = articles.filter((a) => {
        if (!Array.isArray(a.tags)) return false;
        return a.tags.some((t) => tagSet.has(t));
      });
    }

    if (maxReadingTimeMinutes != null) {
      const maxRt = Number(maxReadingTimeMinutes);
      articles = articles.filter(
        (a) => a.reading_time_minutes != null && Number(a.reading_time_minutes) <= maxRt
      );
    }

    if (sortBy === 'newest_first') {
      articles = articles
        .slice()
        .sort(
          (a, b) =>
            new Date(b.published_date || 0).getTime() - new Date(a.published_date || 0).getTime()
        );
    } else if (sortBy === 'oldest_first') {
      articles = articles
        .slice()
        .sort(
          (a, b) =>
            new Date(a.published_date || 0).getTime() - new Date(b.published_date || 0).getTime()
        );
    }

    return articles;
  }

  // 25) getBlogArticleDetail
  getBlogArticleDetail(slug) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find((a) => a.slug === slug) || null;
    const readingList = this._getOrCreateReadingList();

    const is_saved = !!(article && readingList.article_ids.includes(article.id));
    return {
      article,
      is_saved
    };
  }

  // 26) addArticleToReadingList
  addArticleToReadingList(articleId) {
    const list = this._getOrCreateReadingList();
    if (!Array.isArray(list.article_ids)) {
      list.article_ids = [];
    }
    if (!list.article_ids.includes(articleId)) {
      list.article_ids.push(articleId);
      list.updated_at = this._nowIso();
      this._updateEntityInCollection('reading_lists', list);
    }

    return {
      success: true,
      reading_list_id: list.id,
      article_ids: list.article_ids.slice(),
      total_articles: list.article_ids.length,
      message: 'Article added to reading list.'
    };
  }

  // 27) getReadingList (with FK resolution)
  getReadingList() {
    const list = this._getOrCreateReadingList();
    const articlesAll = this._getFromStorage('blog_articles');
    const articles = list.article_ids
      .map((id) => articlesAll.find((a) => a.id === id) || null)
      .filter((a) => a !== null);

    return {
      reading_list_id: list.id,
      articles,
      total_articles: articles.length,
      updated_at: list.updated_at || list.created_at
    };
  }

  // 28) searchOfficesByLocation
  searchOfficesByLocation(zipCode, city, state) {
    let offices = this._getFromStorage('offices');

    if (zipCode) {
      const z = String(zipCode);
      offices = offices.filter((o) => {
        if (o.zip_code === z) return true;
        if (Array.isArray(o.service_area_zip_codes)) {
          return o.service_area_zip_codes.includes(z);
        }
        return false;
      });
      return offices;
    }

    if (city || state) {
      const cityLower = city ? city.toLowerCase() : null;
      const stateLower = state ? state.toLowerCase() : null;
      offices = offices.filter((o) => {
        const oc = (o.city || '').toLowerCase();
        const os = (o.state || '').toLowerCase();
        if (cityLower && oc !== cityLower) return false;
        if (stateLower && os !== stateLower) return false;
        return true;
      });
    }

    return offices;
  }

  // 29) getOfficeDetail
  getOfficeDetail(officeId) {
    const offices = this._getFromStorage('offices');
    const office = offices.find((o) => o.id === officeId) || null;

    if (!office) {
      return { office: null };
    }

    const officeWithHours = {
      ...office,
      hours: office.hours || 'By appointment only'
    };

    return {
      office: officeWithHours
    };
  }

  // 30) submitOfficeInquiry
  submitOfficeInquiry(
    officeId,
    projectType,
    message,
    budgetMin,
    budgetMax,
    contactName,
    contactEmail,
    contactPhone
  ) {
    const inquiries = this._getFromStorage('office_inquiries');
    const id = this._generateId('office_inquiry');
    const now = this._nowIso();

    const record = {
      id,
      office_id: officeId,
      project_type: projectType,
      message,
      budget_min: budgetMin != null ? Number(budgetMin) : null,
      budget_max: budgetMax != null ? Number(budgetMax) : null,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      created_at: now
    };

    inquiries.push(record);
    this._saveToStorage('office_inquiries', inquiries);

    return {
      success: true,
      office_inquiry_id: id,
      message: 'Office inquiry submitted successfully.'
    };
  }

  // 31) getCustomBuildConfiguratorOptions
  getCustomBuildConfiguratorOptions() {
    const options = this._getFromStorage('build_component_options');

    const foundation_options = options.filter((o) => o.component_type === 'foundation');
    const framing_options = options.filter((o) => o.component_type === 'framing');
    const roofing_options = options.filter((o) => o.component_type === 'roofing');
    const finishes_options = options.filter((o) => o.component_type === 'finishes');

    // Base price constant for custom build (not stored as data content)
    const base_price = 250000;

    return {
      base_price,
      foundation_options,
      framing_options,
      roofing_options,
      finishes_options
    };
  }

  // 32) addCustomPackageConfigurationToInquiryCart
  addCustomPackageConfigurationToInquiryCart(
    foundationOptionId,
    framingOptionId,
    roofingOptionId,
    finishesOptionId,
    notes
  ) {
    const allOptions = this._getFromStorage('build_component_options');
    const foundation = allOptions.find((o) => o.id === foundationOptionId) || null;
    const framing = allOptions.find((o) => o.id === framingOptionId) || null;
    const roofing = allOptions.find((o) => o.id === roofingOptionId) || null;
    const finishes = finishesOptionId
      ? allOptions.find((o) => o.id === finishesOptionId) || null
      : null;

    const base_price = 250000;
    const total_estimated_cost = this._calculateCustomPackageTotal(base_price, [
      foundation,
      framing,
      roofing,
      finishes
    ]);

    const configs = this._getFromStorage('custom_package_configurations');
    const id = this._generateId('custom_package');
    const now = this._nowIso();

    const record = {
      id,
      foundation_option_id: foundationOptionId,
      framing_option_id: framingOptionId,
      roofing_option_id: roofingOptionId,
      finishes_option_id: finishesOptionId || null,
      base_price,
      total_estimated_cost,
      notes: notes || null,
      created_at: now
    };

    configs.push(record);
    this._saveToStorage('custom_package_configurations', configs);

    const cart = this._getOrCreateInquiryCart();
    if (!Array.isArray(cart.custom_package_configuration_ids)) {
      cart.custom_package_configuration_ids = [];
    }
    if (!cart.custom_package_configuration_ids.includes(id)) {
      cart.custom_package_configuration_ids.push(id);
      cart.updated_at = now;
      this._updateEntityInCollection('inquiry_carts', cart);
    }

    return {
      success: true,
      custom_package_configuration_id: id,
      total_estimated_cost,
      inquiry_cart_id: cart.id,
      message: 'Custom package configuration added to inquiry cart.'
    };
  }

  // 33) getInquiryCartSummary (with FK resolution for custom package options)
  getInquiryCartSummary() {
    const cart = this._getOrCreateInquiryCart();
    const designPackagesAll = this._getFromStorage('design_packages');
    const configsAll = this._getFromStorage('custom_package_configurations');
    const optionsAll = this._getFromStorage('build_component_options');

    const design_packages = (cart.design_package_ids || [])
      .map((id) => designPackagesAll.find((p) => p.id === id) || null)
      .filter((p) => p !== null);

    const custom_package_configurations_raw = (cart.custom_package_configuration_ids || [])
      .map((id) => configsAll.find((c) => c.id === id) || null)
      .filter((c) => c !== null);

    const custom_package_configurations = custom_package_configurations_raw.map((cfg) => {
      const foundation_option = optionsAll.find((o) => o.id === cfg.foundation_option_id) || null;
      const framing_option = optionsAll.find((o) => o.id === cfg.framing_option_id) || null;
      const roofing_option = optionsAll.find((o) => o.id === cfg.roofing_option_id) || null;
      const finishes_option = cfg.finishes_option_id
        ? optionsAll.find((o) => o.id === cfg.finishes_option_id) || null
        : null;

      return {
        ...cfg,
        foundation_option,
        framing_option,
        roofing_option,
        finishes_option
      };
    });

    const total_items = design_packages.length + custom_package_configurations.length;

    return {
      inquiry_cart_id: cart.id,
      design_packages,
      custom_package_configurations,
      total_items,
      last_updated: cart.updated_at || cart.created_at
    };
  }

  // 34) getTestimonialsFilterOptions
  getTestimonialsFilterOptions() {
    const testimonials = this._getFromStorage('testimonials');
    const projectTypeSet = new Set();
    const ratingSet = new Set();

    testimonials.forEach((t) => {
      if (t.project_type) projectTypeSet.add(t.project_type);
      if (t.rating != null) ratingSet.add(Number(t.rating));
    });

    const project_types = Array.from(projectTypeSet);

    const duration_ranges = [
      { key: '0_3_months', label: '0–3 months', max_months: 3 },
      { key: '3_4_months', label: '3–4 months', max_months: 4 },
      { key: '4_6_months', label: '4–6 months', max_months: 6 },
      { key: '6_plus_months', label: '6+ months', max_months: 999 }
    ];

    let rating_options = Array.from(ratingSet).sort((a, b) => a - b);
    if (rating_options.length === 0) {
      rating_options = [3, 4, 5];
    }

    return {
      project_types,
      duration_ranges,
      rating_options
    };
  }

  // 35) searchTestimonials
  searchTestimonials(projectType, maxProjectDurationMonths, minRating, sortBy) {
    let testimonials = this._getFromStorage('testimonials');

    if (projectType) {
      testimonials = testimonials.filter((t) => t.project_type === projectType);
    }

    if (maxProjectDurationMonths != null) {
      const maxDur = Number(maxProjectDurationMonths);
      testimonials = testimonials.filter((t) => {
        if (t.project_duration_months == null) return false;
        return Number(t.project_duration_months) <= maxDur;
      });
    }

    if (minRating != null) {
      const minR = Number(minRating);
      testimonials = testimonials.filter((t) => Number(t.rating || 0) >= minR);
    }

    if (sortBy === 'highest_rated') {
      testimonials = testimonials.slice().sort((a, b) => {
        const ra = Number(a.rating) || 0;
        const rb = Number(b.rating) || 0;
        if (rb !== ra) return rb - ra;
        const da = a.completion_date ? new Date(a.completion_date).getTime() : 0;
        const db = b.completion_date ? new Date(b.completion_date).getTime() : 0;
        return db - da;
      });
    } else if (sortBy === 'most_recent') {
      testimonials = testimonials.slice().sort((a, b) => {
        const da = a.completion_date ? new Date(a.completion_date).getTime() : 0;
        const db = b.completion_date ? new Date(b.completion_date).getTime() : 0;
        return db - da;
      });
    }

    return testimonials;
  }

  // 36) addTestimonialToFavorites
  addTestimonialToFavorites(testimonialId) {
    const list = this._getOrCreateTestimonialFavoritesList();
    if (!Array.isArray(list.testimonial_ids)) {
      list.testimonial_ids = [];
    }
    if (!list.testimonial_ids.includes(testimonialId)) {
      list.testimonial_ids.push(testimonialId);
      list.updated_at = this._nowIso();
      this._updateEntityInCollection('testimonial_favorites', list);
    }

    return {
      success: true,
      favorites_list_id: list.id,
      testimonial_ids: list.testimonial_ids.slice(),
      total_testimonials: list.testimonial_ids.length,
      message: 'Testimonial added to favorites.'
    };
  }

  // 37) getTestimonialFavorites (with FK resolution)
  getTestimonialFavorites() {
    const list = this._getOrCreateTestimonialFavoritesList();
    const allTestimonials = this._getFromStorage('testimonials');

    const testimonials = list.testimonial_ids
      .map((id) => allTestimonials.find((t) => t.id === id) || null)
      .filter((t) => t !== null);

    return {
      favorites_list_id: list.id,
      testimonials,
      total_testimonials: testimonials.length,
      updated_at: list.updated_at || list.created_at
    };
  }

  // 38) getAboutPageContent
  getAboutPageContent() {
    const offices = this._getFromStorage('offices');
    const services = this._getFromStorage('services');

    const company_history =
      'Founded by architects and builders, our studio has delivered thoughtfully detailed projects across residential and commercial sectors.';

    const mission =
      'Our mission is to align beautiful, durable design with clear budgets and reliable construction timelines.';

    const design_build_philosophy =
      'We operate as an integrated design-build team, where architects and construction managers collaborate from day one to control cost, quality, and schedule.';

    let service_areas_summary;
    if (offices.length > 0) {
      const regions = new Set();
      offices.forEach((o) => {
        if (o.city && o.state) {
          regions.add(o.city + ', ' + o.state);
        }
      });
      const regionList = Array.from(regions).join('; ');
      service_areas_summary =
        'We currently support projects from our offices in: ' + (regionList || 'multiple regions.');
    } else {
      service_areas_summary =
        'We support projects in select metropolitan and suburban regions. Contact us to confirm coverage for your site.';
    }

    const projectTypeSet = new Set();
    services.forEach((s) => {
      if (s.category_key === 'residential_renovations') {
        projectTypeSet.add('Residential renovations');
      }
      if (s.category_key === 'commercial_services') {
        projectTypeSet.add('Commercial interiors');
      }
      if (s.category_key === 'new_construction') {
        projectTypeSet.add('New construction');
      }
    });
    const project_types_summary =
      projectTypeSet.size > 0
        ? 'We regularly deliver: ' + Array.from(projectTypeSet).join(', ') + '.'
        : 'We deliver a mix of residential, commercial, and ground-up construction projects.';

    const leadership_team = [];

    const key_calls_to_action = [
      {
        key: 'book_consultation',
        label: 'Book a Consultation',
        description: 'Discuss your site, budget, and timeline with our team.'
      },
      {
        key: 'view_services',
        label: 'Explore Services',
        description: 'See how we support renovations, custom homes, and commercial fit-outs.'
      },
      {
        key: 'find_locations',
        label: 'Find a Local Office',
        description: 'Connect with the team that serves your ZIP code.'
      }
    ];

    return {
      company_history,
      mission,
      design_build_philosophy,
      service_areas_summary,
      project_types_summary,
      leadership_team,
      key_calls_to_action
    };
  }

  // ----------------------
  // Example legacy method from skeleton (kept for completeness, not used)
  // ----------------------
  addToCart(userId, productId, quantity = 1) {
    // Legacy example, unrelated to main domain; kept minimal
    let carts = this._getFromStorage('carts');
    let cartItems = this._getFromStorage('cartItems');

    let cart = carts.find((c) => c.userId === userId);
    if (!cart) {
      cart = { id: this._generateId('cart'), userId };
      carts.push(cart);
    }

    let item = cartItems.find((ci) => ci.cartId === cart.id && ci.productId === productId);
    if (!item) {
      item = {
        id: this._generateId('cartItem'),
        cartId: cart.id,
        productId,
        quantity: 0
      };
      cartItems.push(item);
    }
    item.quantity += quantity;

    this._saveToStorage('carts', carts);
    this._saveToStorage('cartItems', cartItems);

    return { success: true, cartId: cart.id };
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
