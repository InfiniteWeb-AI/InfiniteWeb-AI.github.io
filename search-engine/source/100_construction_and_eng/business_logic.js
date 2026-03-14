// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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
    this._idPrefix = 'id_';
  }

  // -------------------- Initialization & Storage Helpers --------------------

  _initStorage() {
    const arrayKeys = [
      'services',
      'service_timeline_options',
      'service_quote_requests',
      'project_case_studies',
      'project_comparison_lists',
      'branches',
      'branch_time_slots',
      'site_visit_appointments',
      'equipment_categories',
      'equipment_items',
      'rental_extras',
      'rental_carts',
      'rental_cart_items',
      'rental_orders',
      'maintenance_programs',
      'maintenance_quote_requests',
      'training_courses',
      'training_sessions',
      'course_registrations',
      'cost_estimates',
      'estimate_requests',
      'budget_range_options',
      'inquiries'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Config buckets as simple objects (no mock domain data, just structure)
    if (!localStorage.getItem('contact_page_config')) {
      localStorage.setItem(
        'contact_page_config',
        JSON.stringify({
          main_office: { address: '', phone: '', email: '' }
        })
      );
    }

    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem(
        'about_page_content',
        JSON.stringify({
          company_overview: '',
          history: '',
          mission: '',
          values: [],
          stats: [],
          certifications: [],
          leadership_team: []
        })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _saveObjectToStorage(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    const n = this._getNextIdCounter();
    return (prefix || this._idPrefix) + '_' + n;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    // Accept ISO or 'YYYY-MM-DD'
    if (!dateStr) return null;
    return new Date(dateStr);
  }

  _daysInclusive(startStr, endStr) {
    const start = this._parseDate(startStr);
    const end = this._parseDate(endStr);
    if (!start || !end) return 0;
    const ms = end.getTime() - start.getTime();
    const days = Math.floor(ms / 86400000) + 1;
    return days > 0 ? days : 0;
  }

  _upsertById(storageKey, entity) {
    const arr = this._getFromStorage(storageKey);
    const idx = arr.findIndex((e) => e.id === entity.id);
    if (idx >= 0) {
      arr[idx] = entity;
    } else {
      arr.push(entity);
    }
    this._saveToStorage(storageKey, arr);
    return entity;
  }

  // -------------------- Private helpers required by spec --------------------

  _getOrCreateRentalCart() {
    const currentId = localStorage.getItem('rental_cart_current_id');
    let carts = this._getFromStorage('rental_carts');
    let cart = null;

    if (currentId) {
      cart = carts.find((c) => c.id === currentId) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('rentalCart'),
        items: [], // array of RentalCartItem IDs
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('rental_carts', carts);
      localStorage.setItem('rental_cart_current_id', cart.id);
    }

    return cart;
  }

  _recalculateRentalCartTotals(cartId) {
    const carts = this._getFromStorage('rental_carts');
    const items = this._getFromStorage('rental_cart_items');
    const equipmentItems = this._getFromStorage('equipment_items');
    const extras = this._getFromStorage('rental_extras');

    const cart = carts.find((c) => c.id === cartId);
    if (!cart) {
      return {
        equipment_subtotal: 0,
        extras_subtotal: 0,
        total_estimated_cost: 0
      };
    }

    let equipmentSubtotal = 0;
    let extrasSubtotal = 0;

    const updatedItems = items.map((item) => {
      if (item.cartId !== cartId) return item;

      const equipment = equipmentItems.find((e) => e.id === item.equipmentId);
      const dailyRate = equipment ? Number(equipment.daily_rate || equipment.dailyRate || equipment.daily_rate === 0 ? equipment.daily_rate : equipment.dailyRate) : 0;
      const rentalDays = this._daysInclusive(item.rental_start_date, item.rental_end_date);

      const selectedExtraIds = Array.isArray(item.selected_extra_ids)
        ? item.selected_extra_ids
        : [];
      let extraDailyTotal = 0;
      selectedExtraIds.forEach((id) => {
        const ex = extras.find((e) => e.id === id);
        if (ex) extraDailyTotal += Number(ex.daily_price || 0);
      });

      const equipmentTotal = dailyRate * rentalDays * Number(item.quantity || 1);
      const extrasTotal = extraDailyTotal * rentalDays * Number(item.quantity || 1);

      equipmentSubtotal += equipmentTotal;
      extrasSubtotal += extrasTotal;

      return {
        ...item,
        rental_days: rentalDays,
        daily_rate: dailyRate,
        extra_daily_total: extraDailyTotal,
        line_subtotal: equipmentTotal + extrasTotal
      };
    });

    this._saveToStorage('rental_cart_items', updatedItems);

    cart.updated_at = this._nowIso();
    this._upsertById('rental_carts', cart);

    return {
      equipment_subtotal: equipmentSubtotal,
      extras_subtotal: extrasSubtotal,
      total_estimated_cost: equipmentSubtotal + extrasSubtotal
    };
  }

  _getOrCreateProjectComparisonList() {
    const currentId = localStorage.getItem('project_comparison_current_id');
    let lists = this._getFromStorage('project_comparison_lists');
    let list = null;

    if (currentId) {
      list = lists.find((l) => l.id === currentId) || null;
    }

    if (!list) {
      list = {
        id: this._generateId('projComp'),
        project_ids: [],
        created_at: this._nowIso(),
        last_updated_at: this._nowIso()
      };
      lists.push(list);
      this._saveToStorage('project_comparison_lists', lists);
      localStorage.setItem('project_comparison_current_id', list.id);
    }

    return list;
  }

  _resolveServiceTimelineOptions(serviceId) {
    const options = this._getFromStorage('service_timeline_options');
    const filtered = options
      .filter((o) => o.serviceId === serviceId)
      .sort((a, b) => {
        const am = a.min_months || 0;
        const bm = b.min_months || 0;
        return am - bm;
      });

    return filtered.map((o) => ({
      timeline_option_id: o.id,
      label: o.label,
      min_months: o.min_months || null,
      max_months: o.max_months || null,
      is_default: !!o.is_default
    }));
  }

  _findNearestBranchesByGeo(branches, postal_code) {
    // We do not have real geocoding data; use a simple heuristic
    return branches.map((b) => {
      let distance = 1000; // default far
      if (b.postal_code === postal_code) {
        distance = 5;
      } else if (
        typeof b.postal_code === 'string' &&
        typeof postal_code === 'string' &&
        b.postal_code.slice(0, 3) === postal_code.slice(0, 3)
      ) {
        distance = 25;
      } else if (
        typeof b.postal_code === 'string' &&
        typeof postal_code === 'string' &&
        b.postal_code.slice(0, 2) === postal_code.slice(0, 2)
      ) {
        distance = 75;
      }
      return { branch: b, distance_km: distance };
    });
  }

  _getAvailableBranchTimeSlotsForDate(branchId, dateStr, morning_only) {
    const timeSlots = this._getFromStorage('branch_time_slots');
    const targetDate = dateStr;

    return timeSlots.filter((slot) => {
      if (slot.branchId !== branchId) return false;
      if (!slot.is_available) return false;
      const start = this._parseDate(slot.start_datetime);
      if (!start) return false;
      const slotDate = start.toISOString().slice(0, 10);
      if (slotDate !== targetDate) return false;
      if (morning_only === true && slot.is_morning_slot === false) return false;
      return true;
    });
  }

  _matchTrainingCoursesWithSessions(filters) {
    const courses = this._getFromStorage('training_courses');
    const sessions = this._getFromStorage('training_sessions');

    const {
      query,
      category,
      min_duration_days,
      start_date_from,
      start_date_to
    } = filters || {};

    const fromDate = start_date_from ? this._parseDate(start_date_from) : null;
    const toDate = start_date_to ? this._parseDate(start_date_to) : null;

    const lowerQuery = query ? String(query).toLowerCase() : null;

    // Pre-group sessions by courseId
    const sessionsByCourse = {};
    sessions.forEach((s) => {
      if (!sessionsByCourse[s.courseId]) sessionsByCourse[s.courseId] = [];
      sessionsByCourse[s.courseId].push(s);
    });

    const results = [];

    courses.forEach((course) => {
      if (!course.is_active) return;

      if (category && course.category !== category) return;
      if (min_duration_days && Number(course.duration_days || 0) < Number(min_duration_days)) return;

      if (lowerQuery) {
        const haystack = (
          (course.title || '') + ' ' + (course.description || '')
        ).toLowerCase();
        if (!haystack.includes(lowerQuery)) return;
      }

      const courseSessions = (sessionsByCourse[course.id] || []).filter((s) => s.status === 'scheduled');

      // Filter by date window
      const filteredSessions = courseSessions.filter((s) => {
        const start = this._parseDate(s.start_date);
        if (!start) return false;
        if (fromDate && start < fromDate) return false;
        if (toDate && start > toDate) return false;
        return true;
      });

      if (fromDate || toDate) {
        // When a date filter is specified, require at least one matching session
        if (filteredSessions.length === 0) return;
      }

      const relevantSessions = filteredSessions.length > 0 ? filteredSessions : courseSessions;

      let startingFromPrice = null;
      let nextSession = null;

      relevantSessions.forEach((s) => {
        const price =
          s.price_per_participant != null
            ? Number(s.price_per_participant)
            : Number(course.base_price_per_participant || 0);
        if (startingFromPrice == null || price < startingFromPrice) {
          startingFromPrice = price;
        }
        const start = this._parseDate(s.start_date);
        if (!start) return;
        if (!nextSession || start < this._parseDate(nextSession.start_date)) {
          nextSession = s;
        }
      });

      results.push({ course, startingFromPrice, nextSession });
    });

    return results;
  }

  _calculateCostEstimateInternal(params) {
    const {
      project_type,
      floor_area_sq_ft,
      hvac_efficiency_level,
      target_energy_savings_percent
    } = params;

    const area = Number(floor_area_sq_ft) || 0;
    const savings = Number(target_energy_savings_percent) || 0;

    // Base cost per sq ft by project_type (simple heuristic)
    let basePerSqFt = 80; // default
    switch (project_type) {
      case 'warehouse_renovation':
        basePerSqFt = 75;
        break;
      case 'warehouse_new_build':
        basePerSqFt = 95;
        break;
      case 'office_new_build':
        basePerSqFt = 140;
        break;
      case 'retail_fit_out':
        basePerSqFt = 120;
        break;
      case 'hospital_new_build':
        basePerSqFt = 400;
        break;
      case 'industrial_plant_upgrade':
        basePerSqFt = 180;
        break;
      default:
        basePerSqFt = 100;
    }

    // Efficiency multiplier
    let efficiencyMultiplier = 1.0;
    if (hvac_efficiency_level === 'high_efficiency') {
      efficiencyMultiplier = 1.08;
    } else if (hvac_efficiency_level === 'ultra_high_efficiency') {
      efficiencyMultiplier = 1.15;
    }

    // Additional cost for higher energy savings targets (beyond 10%)
    const extraSavings = Math.max(0, savings - 10);
    const savingsMultiplier = 1 + extraSavings * 0.005; // +0.5% per % above 10

    const estimated = area * basePerSqFt * efficiencyMultiplier * savingsMultiplier;

    return Math.round(estimated);
  }

  // -------------------- Interface Implementations --------------------

  // 1) getHomeFeaturedServiceCategories
  getHomeFeaturedServiceCategories() {
    const services = this._getFromStorage('services');

    const categoryNameMap = {
      commercial_buildings: 'Commercial Buildings',
      industrial_facilities: 'Industrial Facilities',
      design_build: 'Design-Build',
      maintenance_programs: 'Maintenance Programs',
      training_services: 'Training & Certifications',
      equipment_rental_services: 'Equipment Rental',
      other: 'Other Services'
    };

    const grouped = {};
    services
      .filter((s) => s.is_active)
      .forEach((s) => {
        if (!grouped[s.category]) grouped[s.category] = [];
        grouped[s.category].push(s);
      });

    const result = Object.keys(grouped).map((cat) => {
      const svcList = grouped[cat];
      // Take up to 3 featured services (first ones)
      const featured = svcList.slice(0, 3).map((s) => ({
        service_id: s.id,
        service_name: s.name,
        service_slug: s.slug || '',
        typical_budget_min: s.typical_budget_min || null,
        typical_budget_max: s.typical_budget_max || null,
        typical_timeline_summary: s.typical_timeline_summary || ''
      }));
      return {
        category_code: cat,
        category_name: categoryNameMap[cat] || cat,
        category_description: '',
        featured_services: featured
      };
    });

    return result;
  }

  // 2) getHomeFeaturedProjects
  getHomeFeaturedProjects() {
    const projects = this._getFromStorage('project_case_studies');
    return projects
      .filter((p) => p.is_featured)
      .map((p) => ({
        project_id: p.id,
        name: p.name,
        sector: p.sector,
        project_type: p.project_type,
        location_city: p.location_city,
        location_state: p.location_state,
        completion_year: p.completion_year,
        budget: p.budget,
        thumbnail_url: Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : '',
        is_featured: !!p.is_featured
      }));
  }

  // 3) getServicesOverview
  getServicesOverview() {
    const services = this._getFromStorage('services');

    const categoryNameMap = {
      commercial_buildings: 'Commercial Buildings',
      industrial_facilities: 'Industrial Facilities',
      design_build: 'Design-Build',
      maintenance_programs: 'Maintenance Programs',
      training_services: 'Training & Certifications',
      equipment_rental_services: 'Equipment Rental',
      other: 'Other Services'
    };

    const grouped = {};
    services.forEach((s) => {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    });

    return Object.keys(grouped).map((cat) => ({
      category_code: cat,
      category_name: categoryNameMap[cat] || cat,
      category_description: '',
      services: grouped[cat].map((s) => ({
        service_id: s.id,
        service_name: s.name,
        service_slug: s.slug || '',
        description: s.description || '',
        typical_budget_min: s.typical_budget_min || null,
        typical_budget_max: s.typical_budget_max || null,
        typical_timeline_summary: s.typical_timeline_summary || '',
        is_active: !!s.is_active
      }))
    }));
  }

  // 4) getServiceDetail(serviceId)
  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services');
    const projects = this._getFromStorage('project_case_studies');
    const service = services.find((s) => s.id === serviceId) || null;

    const timeline_options = service ? this._resolveServiceTimelineOptions(service.id) : [];

    let related_projects = [];
    if (service) {
      // Simple heuristic: projects whose project_type matches service category/name hints
      related_projects = projects
        .filter((p) => {
          if (service.category === 'commercial_buildings' && p.project_type === 'office_building') return true;
          if (service.category === 'industrial_facilities' && p.project_type === 'warehouse') return true;
          const nameLower = (service.name || '').toLowerCase();
          if (p.name && nameLower && p.name.toLowerCase().includes(nameLower)) return true;
          return false;
        })
        .slice(0, 5)
        .map((p) => ({
          project_id: p.id,
          name: p.name,
          sector: p.sector,
          project_type: p.project_type,
          location_city: p.location_city,
          location_state: p.location_state,
          completion_year: p.completion_year,
          budget: p.budget
        }));
    }

    return {
      service: service
        ? {
            id: service.id,
            name: service.name,
            category: service.category,
            slug: service.slug || '',
            description: service.description || '',
            min_floors: service.min_floors || null,
            max_floors: service.max_floors || null,
            typical_budget_min: service.typical_budget_min || null,
            typical_budget_max: service.typical_budget_max || null,
            typical_timeline_summary: service.typical_timeline_summary || '',
            is_active: !!service.is_active
          }
        : null,
      timeline_options,
      related_projects
    };
  }

  // 5) submitServiceQuoteRequest(...)
  submitServiceQuoteRequest(
    serviceId,
    timelineOptionId,
    project_name,
    project_location,
    estimated_budget,
    number_of_floors,
    desired_completion_timeline_text,
    contact_full_name,
    contact_email,
    contact_phone,
    additional_details
  ) {
    const quoteRequests = this._getFromStorage('service_quote_requests');
    const options = this._getFromStorage('service_timeline_options');

    let timelineText = desired_completion_timeline_text || '';
    if (!timelineText && timelineOptionId) {
      const opt = options.find((o) => o.id === timelineOptionId);
      if (opt) timelineText = opt.label || '';
    }

    const newItem = {
      id: this._generateId('serviceQuote'),
      serviceId,
      timelineOptionId: timelineOptionId || null,
      project_name,
      project_location,
      estimated_budget: Number(estimated_budget),
      number_of_floors: number_of_floors != null ? Number(number_of_floors) : null,
      desired_completion_timeline_text: timelineText,
      contact_full_name,
      contact_email,
      contact_phone,
      additional_details: additional_details || '',
      created_at: this._nowIso(),
      status: 'submitted'
    };

    quoteRequests.push(newItem);
    this._saveToStorage('service_quote_requests', quoteRequests);

    return {
      success: true,
      quote_request_id: newItem.id,
      status: newItem.status,
      message: 'Quote request submitted.'
    };
  }

  // 6) getProjectFilterOptions
  getProjectFilterOptions() {
    const projects = this._getFromStorage('project_case_studies');

    const sectorsMap = {};
    const statesMap = {};
    let minYear = null;
    let maxYear = null;
    let minBudget = null;
    let maxBudget = null;

    projects.forEach((p) => {
      if (p.sector && !sectorsMap[p.sector]) {
        sectorsMap[p.sector] = {
          value: p.sector,
          label: p.sector.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        };
      }
      if (p.location_state && !statesMap[p.location_state]) {
        statesMap[p.location_state] = {
          state_code: p.location_state,
          state_name: p.location_state,
          country: p.location_country || 'US'
        };
      }
      if (typeof p.completion_year === 'number') {
        if (minYear == null || p.completion_year < minYear) minYear = p.completion_year;
        if (maxYear == null || p.completion_year > maxYear) maxYear = p.completion_year;
      }
      if (typeof p.budget === 'number') {
        if (minBudget == null || p.budget < minBudget) minBudget = p.budget;
        if (maxBudget == null || p.budget > maxBudget) maxBudget = p.budget;
      }
    });

    return {
      sectors: Object.values(sectorsMap),
      states: Object.values(statesMap),
      completion_year_range: {
        min_year: minYear,
        max_year: maxYear
      },
      budget_range: {
        min_budget: minBudget,
        max_budget: maxBudget,
        step: 1000000
      }
    };
  }

  // 7) searchProjectCaseStudies(...)
  searchProjectCaseStudies(
    sector,
    location_state,
    location_country,
    project_type,
    min_completion_year,
    max_completion_year,
    min_budget,
    max_budget,
    search_query,
    sort_by
  ) {
    const projects = this._getFromStorage('project_case_studies');
    const q = search_query ? String(search_query).toLowerCase() : null;
    const minYear = min_completion_year != null ? Number(min_completion_year) : null;
    const maxYear = max_completion_year != null ? Number(max_completion_year) : null;
    const minB = min_budget != null ? Number(min_budget) : null;
    const maxB = max_budget != null ? Number(max_budget) : null;

    let filtered = projects.filter((p) => {
      if (sector && p.sector !== sector) return false;
      if (location_state && p.location_state !== location_state) return false;
      if (location_country && p.location_country && p.location_country !== location_country) return false;
      if (project_type && p.project_type !== project_type) return false;
      if (minYear != null && p.completion_year < minYear) return false;
      if (maxYear != null && p.completion_year > maxYear) return false;
      if (minB != null && p.budget < minB) return false;
      if (maxB != null && p.budget > maxB) return false;
      if (q) {
        const text = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    if (sort_by === 'completion_date_newest_first') {
      filtered.sort((a, b) => {
        const da = a.completion_date ? this._parseDate(a.completion_date) : null;
        const db = b.completion_date ? this._parseDate(b.completion_date) : null;
        if (da && db) return db - da;
        if (db) return 1;
        if (da) return -1;
        return (b.completion_year || 0) - (a.completion_year || 0);
      });
    } else if (sort_by === 'budget_high_to_low') {
      filtered.sort((a, b) => (b.budget || 0) - (a.budget || 0));
    } else if (sort_by === 'budget_low_to_high') {
      filtered.sort((a, b) => (a.budget || 0) - (b.budget || 0));
    }

    return filtered.map((p) => ({
      project_id: p.id,
      name: p.name,
      sector: p.sector,
      project_type: p.project_type,
      location_city: p.location_city,
      location_state: p.location_state,
      completion_year: p.completion_year,
      completion_date: p.completion_date || null,
      budget: p.budget,
      thumbnail_url: Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : ''
    }));
  }

  // 8) getProjectCaseStudyDetail(projectId)
  getProjectCaseStudyDetail(projectId) {
    const projects = this._getFromStorage('project_case_studies');
    const project = projects.find((p) => p.id === projectId) || null;

    let similar_projects = [];
    if (project) {
      similar_projects = projects
        .filter((p) => p.id !== project.id && (p.sector === project.sector || p.project_type === project.project_type))
        .slice(0, 4)
        .map((p) => ({
          project_id: p.id,
          name: p.name,
          sector: p.sector,
          project_type: p.project_type,
          location_city: p.location_city,
          location_state: p.location_state,
          completion_year: p.completion_year,
          budget: p.budget
        }));
    }

    const comparisonList = this._getOrCreateProjectComparisonList();
    const is_in_comparison_list = comparisonList.project_ids.includes(projectId);

    return {
      project: project
        ? {
            id: project.id,
            name: project.name,
            sector: project.sector,
            project_type: project.project_type,
            description: project.description || '',
            location_city: project.location_city,
            location_state: project.location_state,
            location_country: project.location_country || 'US',
            completion_year: project.completion_year,
            completion_date: project.completion_date || null,
            budget: project.budget,
            size_sq_ft: project.size_sq_ft || null,
            client_name: project.client_name || '',
            image_urls: Array.isArray(project.image_urls) ? project.image_urls : []
          }
        : null,
      similar_projects,
      is_in_comparison_list
    };
  }

  // 9) addProjectToComparison(projectId)
  addProjectToComparison(projectId) {
    const list = this._getOrCreateProjectComparisonList();
    const projectsAll = this._getFromStorage('project_case_studies');

    if (!list.project_ids.includes(projectId)) {
      list.project_ids.push(projectId);
      list.last_updated_at = this._nowIso();
      this._upsertById('project_comparison_lists', list);
    }

    const projects = list.project_ids
      .map((id) => projectsAll.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({
        project_id: p.id,
        name: p.name,
        sector: p.sector,
        project_type: p.project_type,
        location_city: p.location_city,
        location_state: p.location_state,
        completion_year: p.completion_year,
        budget: p.budget
      }));

    return {
      success: true,
      comparison_list_id: list.id,
      projects,
      message: 'Project added to comparison list.'
    };
  }

  // 10) getProjectComparisonList()
  getProjectComparisonList() {
    const list = this._getOrCreateProjectComparisonList();
    const projectsAll = this._getFromStorage('project_case_studies');

    const projects = list.project_ids
      .map((id) => projectsAll.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({
        project_id: p.id,
        name: p.name,
        sector: p.sector,
        project_type: p.project_type,
        location_city: p.location_city,
        location_state: p.location_state,
        completion_year: p.completion_year,
        budget: p.budget
      }));

    return {
      comparison_list_id: list.id,
      projects
    };
  }

  // 11) removeProjectFromComparison(projectId)
  removeProjectFromComparison(projectId) {
    const list = this._getOrCreateProjectComparisonList();
    const projectsAll = this._getFromStorage('project_case_studies');

    list.project_ids = list.project_ids.filter((id) => id !== projectId);
    list.last_updated_at = this._nowIso();
    this._upsertById('project_comparison_lists', list);

    const projects = list.project_ids
      .map((id) => projectsAll.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => ({ project_id: p.id, name: p.name }));

    return {
      success: true,
      projects,
      message: 'Project removed from comparison list.'
    };
  }

  // 12) searchBranchesByPostalCode(...)
  searchBranchesByPostalCode(postal_code, country, max_distance_km, sort_by) {
    const branches = this._getFromStorage('branches').filter((b) => b.is_active);
    const withDistance = this._findNearestBranchesByGeo(branches, postal_code);

    let filtered = withDistance;

    if (country) {
      const target = String(country).toUpperCase();
      filtered = filtered.filter((b) => {
        const branchCountry = (b.branch.country || '').toUpperCase();
        if (!branchCountry) return true;
        if (branchCountry === target) return true;
        // Treat 'US' and 'USA' as equivalent country codes
        if ((branchCountry === 'US' && target === 'USA') || (branchCountry === 'USA' && target === 'US')) {
          return true;
        }
        return false;
      });
    }

    if (typeof max_distance_km === 'number') {
      filtered = filtered.filter((b) => b.distance_km <= max_distance_km);
    }

    if (sort_by === 'distance_nearest_first') {
      filtered.sort((a, b) => a.distance_km - b.distance_km);
    } else if (sort_by === 'name_a_z') {
      filtered.sort((a, b) => {
        const an = (a.branch.name || '').toLowerCase();
        const bn = (b.branch.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    return filtered.map(({ branch, distance_km }) => ({
      branch_id: branch.id,
      name: branch.name,
      address_line1: branch.address_line1,
      address_line2: branch.address_line2 || '',
      city: branch.city,
      state: branch.state,
      postal_code: branch.postal_code,
      phone_number: branch.phone_number || '',
      email: branch.email || '',
      distance_km,
      is_active: !!branch.is_active
    }));
  }

  // 13) getBranchDetail(branchId)
  getBranchDetail(branchId) {
    const branches = this._getFromStorage('branches');
    const branch = branches.find((b) => b.id === branchId) || null;

    return {
      branch: branch
        ? {
            id: branch.id,
            name: branch.name,
            address_line1: branch.address_line1,
            address_line2: branch.address_line2 || '',
            city: branch.city,
            state: branch.state,
            postal_code: branch.postal_code,
            country: branch.country || 'US',
            phone_number: branch.phone_number || '',
            email: branch.email || '',
            latitude: branch.latitude || null,
            longitude: branch.longitude || null,
            service_coverage_description: branch.service_coverage_description || '',
            is_active: !!branch.is_active
          }
        : null
    };
  }

  // 14) getBranchAvailableTimeSlots(branchId, date, project_type, morning_only)
  getBranchAvailableTimeSlots(branchId, date, project_type, morning_only) {
    const slots = this._getAvailableBranchTimeSlotsForDate(
      branchId,
      date,
      morning_only
    );

    return slots.map((slot) => ({
      time_slot_id: slot.id,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      is_available: !!slot.is_available,
      is_morning_slot: !!slot.is_morning_slot
    }));
  }

  // 15) submitSiteVisitAppointment(...)
  submitSiteVisitAppointment(
    branchId,
    project_type,
    project_address,
    preferred_date,
    timeSlotId,
    contact_name,
    contact_email,
    contact_phone,
    notes
  ) {
    const appointments = this._getFromStorage('site_visit_appointments');
    const timeSlots = this._getFromStorage('branch_time_slots');

    const slot = timeSlots.find((s) => s.id === timeSlotId && s.branchId === branchId) || null;

    let status = 'pending';
    let scheduled_start_datetime = null;
    let scheduled_end_datetime = null;

    if (slot && slot.is_available) {
      scheduled_start_datetime = slot.start_datetime;
      scheduled_end_datetime = slot.end_datetime;
      // Mark slot unavailable
      slot.is_available = false;
      this._saveToStorage('branch_time_slots', timeSlots);
      status = 'confirmed';
    }

    const newItem = {
      id: this._generateId('siteVisit'),
      branchId,
      project_type,
      project_address,
      preferred_date: this._parseDate(preferred_date)
        ? new Date(preferred_date).toISOString()
        : this._nowIso(),
      timeSlotId,
      scheduled_start_datetime,
      scheduled_end_datetime,
      contact_name,
      contact_email,
      contact_phone,
      notes: notes || '',
      created_at: this._nowIso(),
      status
    };

    appointments.push(newItem);
    this._saveToStorage('site_visit_appointments', appointments);

    return {
      success: true,
      appointment_id: newItem.id,
      status: newItem.status,
      scheduled_start_datetime,
      scheduled_end_datetime,
      message:
        newItem.status === 'confirmed'
          ? 'Site visit appointment confirmed.'
          : 'Site visit appointment submitted and pending confirmation.'
    };
  }

  // 16) getEquipmentCategories
  getEquipmentCategories() {
    const categories = this._getFromStorage('equipment_categories');
    return categories.map((c) => ({
      category_id: c.id,
      name: c.name,
      code: c.code,
      description: c.description || '',
      is_active: !!c.is_active
    }));
  }

  // 17) getEquipmentFilterOptions(categoryId)
  getEquipmentFilterOptions(categoryId) {
    const items = this._getFromStorage('equipment_items');
    const filtered = categoryId ? items.filter((i) => i.categoryId === categoryId) : items;

    let minWeight = null,
      maxWeight = null,
      minCap = null,
      maxCap = null,
      minRate = null,
      maxRate = null;

    filtered.forEach((i) => {
      if (typeof i.operating_weight_tons === 'number') {
        if (minWeight == null || i.operating_weight_tons < minWeight) minWeight = i.operating_weight_tons;
        if (maxWeight == null || i.operating_weight_tons > maxWeight) maxWeight = i.operating_weight_tons;
      }
      if (typeof i.capacity_cu_ft === 'number') {
        if (minCap == null || i.capacity_cu_ft < minCap) minCap = i.capacity_cu_ft;
        if (maxCap == null || i.capacity_cu_ft > maxCap) maxCap = i.capacity_cu_ft;
      }
      if (typeof i.daily_rate === 'number') {
        if (minRate == null || i.daily_rate < minRate) minRate = i.daily_rate;
        if (maxRate == null || i.daily_rate > maxRate) maxRate = i.daily_rate;
      }
    });

    return {
      operating_weight_range_tons: {
        min: minWeight,
        max: maxWeight,
        step: 1
      },
      capacity_range_cu_ft: {
        min: minCap,
        max: maxCap,
        step: 0.5
      },
      daily_rate_range: {
        min: minRate,
        max: maxRate,
        step: 10
      },
      rating_options: [
        { min_rating: 3, label: '3 stars & up' },
        { min_rating: 4, label: '4 stars & up' },
        { min_rating: 4.5, label: '4.5 stars & up' }
      ]
    };
  }

  // 18) searchEquipmentItems(...)
  searchEquipmentItems(
    categoryId,
    search_keyword,
    equipment_type,
    min_operating_weight_tons,
    min_capacity_cu_ft,
    max_daily_rate,
    min_customer_rating,
    only_available,
    sort_by
  ) {
    const items = this._getFromStorage('equipment_items');
    const categories = this._getFromStorage('equipment_categories');

    const q = search_keyword ? String(search_keyword).toLowerCase() : null;
    const minWeight =
      min_operating_weight_tons != null ? Number(min_operating_weight_tons) : null;
    const minCap = min_capacity_cu_ft != null ? Number(min_capacity_cu_ft) : null;
    const maxRate = max_daily_rate != null ? Number(max_daily_rate) : null;
    const minRating = min_customer_rating != null ? Number(min_customer_rating) : null;

    let filtered = items.filter((i) => {
      if (categoryId && i.categoryId !== categoryId) return false;
      if (equipment_type && i.equipment_type !== equipment_type) return false;
      if (minWeight != null && (!i.operating_weight_tons || i.operating_weight_tons < minWeight)) return false;
      if (minCap != null && (!i.capacity_cu_ft || i.capacity_cu_ft < minCap)) return false;
      if (maxRate != null && (!i.daily_rate || i.daily_rate > maxRate)) return false;
      if (minRating != null && (!i.customer_rating || i.customer_rating < minRating)) return false;
      if (only_available && !i.is_available) return false;
      if (q) {
        const text = ((i.name || '') + ' ' + (i.description || '')).toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });

    if (sort_by === 'price_low_to_high') {
      filtered.sort((a, b) => (a.daily_rate || 0) - (b.daily_rate || 0));
    } else if (sort_by === 'price_high_to_low') {
      filtered.sort((a, b) => (b.daily_rate || 0) - (a.daily_rate || 0));
    } else if (sort_by === 'rating_high_to_low') {
      filtered.sort((a, b) => (b.customer_rating || 0) - (a.customer_rating || 0));
    }

    return filtered.map((i) => {
      const category = categories.find((c) => c.id === i.categoryId);
      return {
        equipment_id: i.id,
        name: i.name,
        equipment_type: i.equipment_type,
        category_name: category ? category.name : '',
        daily_rate: i.daily_rate,
        operating_weight_tons: i.operating_weight_tons || null,
        capacity_cu_ft: i.capacity_cu_ft || null,
        customer_rating: i.customer_rating || null,
        rating_count: i.rating_count || 0,
        image_url: Array.isArray(i.image_urls) && i.image_urls.length > 0 ? i.image_urls[0] : '',
        is_available: !!i.is_available
      };
    });
  }

  // 19) getEquipmentDetail(equipmentId)
  getEquipmentDetail(equipmentId) {
    const items = this._getFromStorage('equipment_items');
    const extras = this._getFromStorage('rental_extras');

    const equipment = items.find((i) => i.id === equipmentId) || null;

    const available_extras = equipment
      ? extras
          .filter((ex) => {
            if (!Array.isArray(ex.applicable_equipment_types) || ex.applicable_equipment_types.length === 0) return true;
            return ex.applicable_equipment_types.includes(equipment.equipment_type);
          })
          .map((ex) => ({
            extra_id: ex.id,
            name: ex.name,
            code: ex.code,
            description: ex.description || '',
            daily_price: ex.daily_price,
            is_default: !!ex.is_default
          }))
      : [];

    return {
      equipment: equipment
        ? {
            id: equipment.id,
            name: equipment.name,
            equipment_type: equipment.equipment_type,
            description: equipment.description || '',
            operating_weight_tons: equipment.operating_weight_tons || null,
            capacity_cu_ft: equipment.capacity_cu_ft || null,
            power_source: equipment.power_source || null,
            daily_rate: equipment.daily_rate,
            weekly_rate: equipment.weekly_rate || null,
            monthly_rate: equipment.monthly_rate || null,
            min_rental_days: equipment.min_rental_days || null,
            customer_rating: equipment.customer_rating || null,
            rating_count: equipment.rating_count || 0,
            is_available: !!equipment.is_available,
            image_urls: Array.isArray(equipment.image_urls)
              ? equipment.image_urls
              : [],
            specs: Array.isArray(equipment.specs) ? equipment.specs : []
          }
        : null,
      available_extras
    };
  }

  // 20) addEquipmentToRentalCart(...)
  addEquipmentToRentalCart(
    equipmentId,
    rental_start_date,
    rental_end_date,
    quantity,
    selected_extra_ids
  ) {
    const cart = this._getOrCreateRentalCart();
    const items = this._getFromStorage('rental_cart_items');
    const equipmentItems = this._getFromStorage('equipment_items');
    const extras = this._getFromStorage('rental_extras');

    const equipment = equipmentItems.find((e) => e.id === equipmentId) || null;
    const dailyRate = equipment ? Number(equipment.daily_rate || 0) : 0;
    const rentalDays = this._daysInclusive(rental_start_date, rental_end_date);

    const extraIds = Array.isArray(selected_extra_ids) ? selected_extra_ids : [];
    let extraDailyTotal = 0;
    extraIds.forEach((id) => {
      const ex = extras.find((e) => e.id === id);
      if (ex) extraDailyTotal += Number(ex.daily_price || 0);
    });

    const qty = quantity != null ? Number(quantity) : 1;
    const equipmentTotal = dailyRate * rentalDays * qty;
    const extrasTotal = extraDailyTotal * rentalDays * qty;

    const newItem = {
      id: this._generateId('rentalItem'),
      cartId: cart.id,
      equipmentId,
      rental_start_date,
      rental_end_date,
      rental_days: rentalDays,
      quantity: qty,
      selected_extra_ids: extraIds,
      daily_rate: dailyRate,
      extra_daily_total: extraDailyTotal,
      line_subtotal: equipmentTotal + extrasTotal
    };

    items.push(newItem);
    this._saveToStorage('rental_cart_items', items);

    // Update cart items list
    if (!Array.isArray(cart.items)) cart.items = [];
    cart.items.push(newItem.id);
    cart.updated_at = this._nowIso();
    this._upsertById('rental_carts', cart);

    const totals = this._recalculateRentalCartTotals(cart.id);

    return {
      success: true,
      cart_id: cart.id,
      cart_item_id: newItem.id,
      message: 'Equipment added to rental cart.',
      cart_summary: {
        item_count: (cart.items || []).length,
        total_estimated_cost: totals.total_estimated_cost
      }
    };
  }

  // 21) getRentalCart()
  getRentalCart() {
    const cart = this._getOrCreateRentalCart();
    const itemsAll = this._getFromStorage('rental_cart_items');
    const equipmentItems = this._getFromStorage('equipment_items');
    const extras = this._getFromStorage('rental_extras');

    const cartItems = itemsAll.filter((i) => i.cartId === cart.id);

    // Ensure totals are consistent
    const totals = this._recalculateRentalCartTotals(cart.id);
    const itemsAfter = this._getFromStorage('rental_cart_items').filter(
      (i) => i.cartId === cart.id
    );

    const items = itemsAfter.map((item) => {
      const equipment = equipmentItems.find((e) => e.id === item.equipmentId) || null;
      const selectedExtras = (item.selected_extra_ids || []).map((id) => {
        const ex = extras.find((e) => e.id === id) || null;
        return ex
          ? {
              extra_id: ex.id,
              name: ex.name,
              code: ex.code,
              daily_price: ex.daily_price,
              extra: ex
            }
          : null;
      }).filter(Boolean);

      const imageUrl =
        equipment && Array.isArray(equipment.image_urls) && equipment.image_urls.length > 0
          ? equipment.image_urls[0]
          : '';

      return {
        cart_item_id: item.id,
        equipment_id: item.equipmentId,
        equipment_name: equipment ? equipment.name : '',
        equipment_type: equipment ? equipment.equipment_type : '',
        image_url: imageUrl,
        rental_start_date: item.rental_start_date,
        rental_end_date: item.rental_end_date,
        rental_days: item.rental_days,
        quantity: item.quantity,
        selected_extras: selectedExtras,
        daily_rate: item.daily_rate,
        extra_daily_total: item.extra_daily_total,
        line_subtotal: item.line_subtotal,
        // Foreign key resolution per requirement 10
        equipment: equipment
      };
    });

    // Recompute subtotals for consistency
    let equipmentSubtotal = 0;
    let extrasSubtotal = 0;
    items.forEach((item) => {
      const equipTotal = item.daily_rate * item.rental_days * item.quantity;
      const exDaily = item.extra_daily_total || 0;
      const exTotal = exDaily * item.rental_days * item.quantity;
      equipmentSubtotal += equipTotal;
      extrasSubtotal += exTotal;
    });

    return {
      cart_id: cart.id,
      items,
      totals: {
        equipment_subtotal: equipmentSubtotal,
        extras_subtotal: extrasSubtotal,
        total_estimated_cost: equipmentSubtotal + extrasSubtotal
      }
    };
  }

  // 22) updateRentalCartItem(...)
  updateRentalCartItem(
    cart_item_id,
    rental_start_date,
    rental_end_date,
    quantity,
    selected_extra_ids
  ) {
    const items = this._getFromStorage('rental_cart_items');
    const equipmentItems = this._getFromStorage('equipment_items');
    const extras = this._getFromStorage('rental_extras');

    const item = items.find((i) => i.id === cart_item_id) || null;
    if (!item) {
      return {
        success: false,
        updated_item: null,
        totals: {
          equipment_subtotal: 0,
          extras_subtotal: 0,
          total_estimated_cost: 0
        },
        message: 'Cart item not found.'
      };
    }

    if (rental_start_date) item.rental_start_date = rental_start_date;
    if (rental_end_date) item.rental_end_date = rental_end_date;
    if (quantity != null) item.quantity = Number(quantity);
    if (selected_extra_ids) item.selected_extra_ids = selected_extra_ids;

    const equipment = equipmentItems.find((e) => e.id === item.equipmentId) || null;
    const dailyRate = equipment ? Number(equipment.daily_rate || 0) : 0;
    const rentalDays = this._daysInclusive(item.rental_start_date, item.rental_end_date);

    const extraIds = Array.isArray(item.selected_extra_ids) ? item.selected_extra_ids : [];
    let extraDailyTotal = 0;
    extraIds.forEach((id) => {
      const ex = extras.find((e) => e.id === id);
      if (ex) extraDailyTotal += Number(ex.daily_price || 0);
    });

    const qty = Number(item.quantity || 1);
    const equipmentTotal = dailyRate * rentalDays * qty;
    const extrasTotal = extraDailyTotal * rentalDays * qty;

    item.rental_days = rentalDays;
    item.daily_rate = dailyRate;
    item.extra_daily_total = extraDailyTotal;
    item.line_subtotal = equipmentTotal + extrasTotal;

    this._saveToStorage('rental_cart_items', items);

    const totals = this._recalculateRentalCartTotals(item.cartId);

    const selectedExtrasDetailed = (item.selected_extra_ids || []).map((id) => {
      const ex = extras.find((e) => e.id === id) || null;
      return ex ? { extra_id: ex.id, name: ex.name } : null;
    }).filter(Boolean);

    const updated_item = {
      cart_item_id: item.id,
      rental_start_date: item.rental_start_date,
      rental_end_date: item.rental_end_date,
      rental_days: item.rental_days,
      quantity: item.quantity,
      selected_extras: selectedExtrasDetailed,
      line_subtotal: item.line_subtotal
    };

    return {
      success: true,
      updated_item,
      totals,
      message: 'Cart item updated.'
    };
  }

  // 23) removeRentalCartItem(cart_item_id)
  removeRentalCartItem(cart_item_id) {
    const items = this._getFromStorage('rental_cart_items');
    const carts = this._getFromStorage('rental_carts');

    const item = items.find((i) => i.id === cart_item_id) || null;
    if (!item) {
      return {
        success: false,
        remaining_items_count: items.length,
        totals: {
          equipment_subtotal: 0,
          extras_subtotal: 0,
          total_estimated_cost: 0
        },
        message: 'Cart item not found.'
      };
    }

    const cartId = item.cartId;

    const remainingItems = items.filter((i) => i.id !== cart_item_id);
    this._saveToStorage('rental_cart_items', remainingItems);

    const cart = carts.find((c) => c.id === cartId) || null;
    if (cart && Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== cart_item_id);
      cart.updated_at = this._nowIso();
      this._upsertById('rental_carts', cart);
    }

    const totals = this._recalculateRentalCartTotals(cartId);
    const remainingCount = cart && Array.isArray(cart.items) ? cart.items.length : 0;

    return {
      success: true,
      remaining_items_count: remainingCount,
      totals,
      message: 'Cart item removed.'
    };
  }

  // 24) getRentalSummary()
  getRentalSummary() {
    const cart = this._getOrCreateRentalCart();
    const itemsAll = this._getFromStorage('rental_cart_items');
    const equipmentItems = this._getFromStorage('equipment_items');
    const extras = this._getFromStorage('rental_extras');

    const cartItems = itemsAll.filter((i) => i.cartId === cart.id);

    const totals = this._recalculateRentalCartTotals(cart.id);
    const itemsAfter = this._getFromStorage('rental_cart_items').filter(
      (i) => i.cartId === cart.id
    );

    const items = itemsAfter.map((item) => {
      const equipment = equipmentItems.find((e) => e.id === item.equipmentId) || null;
      const selectedExtras = (item.selected_extra_ids || []).map((id) => {
        const ex = extras.find((e) => e.id === id) || null;
        return ex;
      }).filter(Boolean);

      const extrasSummary = selectedExtras.map((ex) => ex.name).join(', ');

      return {
        cart_item_id: item.id,
        equipment_name: equipment ? equipment.name : '',
        equipment_type: equipment ? equipment.equipment_type : '',
        rental_start_date: item.rental_start_date,
        rental_end_date: item.rental_end_date,
        rental_days: item.rental_days,
        quantity: item.quantity,
        selected_extras_summary: extrasSummary,
        line_subtotal: item.line_subtotal
      };
    });

    // Instrumentation for task completion tracking
    try {
      // Set to true whenever getRentalSummary() is called
      localStorage.setItem('task4_rentalSummaryViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      cart_id: cart.id,
      items,
      totals
    };
  }

  // 25) submitRentalOrder(...)
  submitRentalOrder(
    contact_name,
    contact_email,
    contact_phone,
    company_name,
    billing_address,
    notes
  ) {
    const cart = this._getOrCreateRentalCart();
    const orders = this._getFromStorage('rental_orders');

    const cartSummary = this.getRentalSummary();
    const total = cartSummary.totals.total_estimated_cost || 0;

    const order = {
      id: this._generateId('rentalOrder'),
      cartId: cart.id,
      order_number: 'R' + Date.now(),
      total_estimated_cost: total,
      contact_name,
      contact_email,
      contact_phone,
      company_name: company_name || '',
      billing_address: billing_address || '',
      notes: notes || '',
      created_at: this._nowIso(),
      submitted_at: this._nowIso(),
      status: 'submitted'
    };

    orders.push(order);
    this._saveToStorage('rental_orders', orders);

    return {
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      total_estimated_cost: order.total_estimated_cost,
      message: 'Rental order submitted.'
    };
  }

  // 26) getMaintenanceFilterOptions()
  getMaintenanceFilterOptions() {
    const programs = this._getFromStorage('maintenance_programs');

    const facilityTypesMap = {};
    let minFee = null;
    let maxFee = null;

    programs.forEach((p) => {
      if (p.facility_type && !facilityTypesMap[p.facility_type]) {
        facilityTypesMap[p.facility_type] = {
          value: p.facility_type,
          label: p.facility_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        };
      }
      if (typeof p.monthly_fee === 'number') {
        if (minFee == null || p.monthly_fee < minFee) minFee = p.monthly_fee;
        if (maxFee == null || p.monthly_fee > maxFee) maxFee = p.monthly_fee;
      }
    });

    const emergency_response_times = [
      { value: 'up_to_2_hours', label: 'Up to 2 hours', max_hours: 2 },
      { value: 'up_to_4_hours', label: 'Up to 4 hours', max_hours: 4 },
      { value: 'same_day', label: 'Same day', max_hours: 24 },
      { value: 'next_business_day', label: 'Next business day', max_hours: 48 }
    ];

    return {
      facility_types: Object.values(facilityTypesMap),
      emergency_response_times,
      monthly_fee_range: {
        min_fee: minFee,
        max_fee: maxFee,
        step: 50
      }
    };
  }

  // 27) searchMaintenancePrograms(...)
  searchMaintenancePrograms(
    facility_type,
    emergency_response_time,
    max_monthly_fee,
    sort_by
  ) {
    const programs = this._getFromStorage('maintenance_programs');
    const maxFee = max_monthly_fee != null ? Number(max_monthly_fee) : null;

    let filtered = programs.filter((p) => {
      if (!p.is_active) return false;
      if (facility_type && p.facility_type !== facility_type) return false;
      if (emergency_response_time && p.emergency_response_time !== emergency_response_time)
        return false;
      if (maxFee != null && p.monthly_fee > maxFee) return false;
      return true;
    });

    if (sort_by === 'warranty_length_longest_first') {
      filtered.sort((a, b) => (b.warranty_length_months || 0) - (a.warranty_length_months || 0));
    } else if (sort_by === 'monthly_fee_low_to_high') {
      filtered.sort((a, b) => (a.monthly_fee || 0) - (b.monthly_fee || 0));
    }

    return filtered.map((p) => ({
      maintenance_program_id: p.id,
      name: p.name,
      facility_type: p.facility_type,
      monthly_fee: p.monthly_fee,
      emergency_response_time: p.emergency_response_time,
      warranty_length_months: p.warranty_length_months,
      min_contract_term_months: p.min_contract_term_months || null,
      includes_parts: !!p.includes_parts,
      includes_labor: !!p.includes_labor
    }));
  }

  // 28) getMaintenanceProgramDetail(maintenanceProgramId)
  getMaintenanceProgramDetail(maintenanceProgramId) {
    const programs = this._getFromStorage('maintenance_programs');
    const p = programs.find((m) => m.id === maintenanceProgramId) || null;

    return {
      program: p
        ? {
            id: p.id,
            name: p.name,
            facility_type: p.facility_type,
            description: p.description || '',
            monthly_fee: p.monthly_fee,
            emergency_response_time: p.emergency_response_time,
            warranty_length_months: p.warranty_length_months,
            min_contract_term_months: p.min_contract_term_months || null,
            includes_parts: !!p.includes_parts,
            includes_labor: !!p.includes_labor,
            is_active: !!p.is_active
          }
        : null
    };
  }

  // 29) submitMaintenanceQuoteRequest(...)
  submitMaintenanceQuoteRequest(
    maintenanceProgramId,
    contact_name,
    contact_email,
    facility_status,
    additional_details
  ) {
    const requests = this._getFromStorage('maintenance_quote_requests');

    const newItem = {
      id: this._generateId('maintQuote'),
      maintenanceProgramId,
      contact_name,
      contact_email,
      facility_status,
      additional_details: additional_details || '',
      created_at: this._nowIso(),
      status: 'submitted'
    };

    requests.push(newItem);
    this._saveToStorage('maintenance_quote_requests', requests);

    return {
      success: true,
      quote_request_id: newItem.id,
      status: newItem.status,
      message: 'Maintenance quote request submitted.'
    };
  }

  // 30) getTrainingFilterOptions()
  getTrainingFilterOptions() {
    const courses = this._getFromStorage('training_courses');

    const categoriesMap = {};
    const durationSet = new Set();

    courses.forEach((c) => {
      if (c.category && !categoriesMap[c.category]) {
        categoriesMap[c.category] = {
          value: c.category,
          label: c.category.replace(/_/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
        };
      }
      if (typeof c.duration_days === 'number') {
        durationSet.add(c.duration_days);
      }
    });

    const durationOptions = [];
    const uniqueDurations = Array.from(durationSet).sort((a, b) => a - b);
    uniqueDurations.forEach((d) => {
      durationOptions.push({ min_days: d, label: d + ' days or longer' });
    });

    return {
      categories: Object.values(categoriesMap),
      duration_options: durationOptions
    };
  }

  // 31) searchTrainingCourses(...)
  searchTrainingCourses(
    query,
    category,
    min_duration_days,
    start_date_from,
    start_date_to,
    sort_by
  ) {
    const matches = this._matchTrainingCoursesWithSessions({
      query,
      category,
      min_duration_days,
      start_date_from,
      start_date_to
    });

    if (sort_by === 'price_low_to_high') {
      matches.sort((a, b) => (a.startingFromPrice || 0) - (b.startingFromPrice || 0));
    } else if (sort_by === 'start_date_soonest_first') {
      matches.sort((a, b) => {
        const da = a.nextSession ? this._parseDate(a.nextSession.start_date) : null;
        const db = b.nextSession ? this._parseDate(b.nextSession.start_date) : null;
        if (da && db) return da - db;
        if (da) return -1;
        if (db) return 1;
        return 0;
      });
    }

    return matches.map(({ course, startingFromPrice, nextSession }) => ({
      course_id: course.id,
      title: course.title,
      category: course.category,
      duration_days: course.duration_days,
      description_short: (course.description || '').slice(0, 160),
      starting_from_price: startingFromPrice != null ? startingFromPrice : course.base_price_per_participant,
      next_session_start_date: nextSession ? nextSession.start_date : null,
      next_session_location: nextSession
        ? ((nextSession.location_city || '') + (nextSession.location_state ? ', ' + nextSession.location_state : ''))
        : null
    }));
  }

  // 32) getTrainingCourseDetail(courseId)
  getTrainingCourseDetail(courseId) {
    const courses = this._getFromStorage('training_courses');
    const sessions = this._getFromStorage('training_sessions');

    const course = courses.find((c) => c.id === courseId) || null;

    const courseSessions = sessions
      .filter((s) => s.courseId === courseId)
      .map((s) => ({
        session_id: s.id,
        start_date: s.start_date,
        end_date: s.end_date,
        location_city: s.location_city || '',
        location_state: s.location_state || '',
        max_participants: s.max_participants || null,
        remaining_seats: s.remaining_seats || null,
        price_per_participant: s.price_per_participant || null,
        status: s.status
      }));

    return {
      course: course
        ? {
            id: course.id,
            title: course.title,
            category: course.category,
            description: course.description || '',
            duration_days: course.duration_days,
            base_price_per_participant: course.base_price_per_participant,
            tags: Array.isArray(course.tags) ? course.tags : []
          }
        : null,
      sessions: courseSessions
    };
  }

  // 33) submitCourseRegistration(...)
  submitCourseRegistration(
    courseId,
    sessionId,
    number_of_participants,
    participant_name,
    participant_email
  ) {
    const courses = this._getFromStorage('training_courses');
    const sessions = this._getFromStorage('training_sessions');
    const registrations = this._getFromStorage('course_registrations');

    const course = courses.find((c) => c.id === courseId) || null;
    const session = sessions.find((s) => s.id === sessionId && s.courseId === courseId) || null;

    if (!course || !session) {
      return {
        success: false,
        registration_id: null,
        status: 'cancelled',
        total_price: 0,
        message: 'Course or session not found.'
      };
    }

    const participants = Number(number_of_participants || 0);

    // Simple remaining seats check
    if (session.remaining_seats != null && session.remaining_seats < participants) {
      return {
        success: false,
        registration_id: null,
        status: 'cancelled',
        total_price: 0,
        message: 'Not enough seats available.'
      };
    }

    const pricePer =
      session.price_per_participant != null
        ? Number(session.price_per_participant)
        : Number(course.base_price_per_participant || 0);
    const totalPrice = pricePer * participants;

    const registration = {
      id: this._generateId('courseReg'),
      courseId,
      sessionId,
      number_of_participants: participants,
      participant_name,
      participant_email,
      total_price: totalPrice,
      created_at: this._nowIso(),
      status: 'pending'
    };

    registrations.push(registration);
    this._saveToStorage('course_registrations', registrations);

    // Decrement remaining seats
    if (session.remaining_seats != null) {
      session.remaining_seats = session.remaining_seats - participants;
      this._saveToStorage('training_sessions', sessions);
    }

    return {
      success: true,
      registration_id: registration.id,
      status: registration.status,
      total_price: registration.total_price,
      message: 'Course registration submitted.'
    };
  }

  // 34) getCostCalculatorOptions()
  getCostCalculatorOptions() {
    return {
      project_types: [
        { value: 'warehouse_renovation', label: 'Warehouse Renovation' },
        { value: 'office_new_build', label: 'New Office Build' },
        { value: 'retail_fit_out', label: 'Retail Fit-Out' },
        { value: 'hospital_new_build', label: 'New Hospital Build' },
        { value: 'warehouse_new_build', label: 'New Warehouse Build' },
        { value: 'industrial_plant_upgrade', label: 'Industrial Plant Upgrade' },
        { value: 'other', label: 'Other' }
      ],
      hvac_efficiency_levels: [
        { value: 'standard', label: 'Standard' },
        { value: 'high_efficiency', label: 'High Efficiency' },
        { value: 'ultra_high_efficiency', label: 'Ultra-High Efficiency' }
      ],
      target_energy_savings_range: {
        min_percent: 5,
        max_percent: 50,
        step: 1
      }
    };
  }

  // 35) calculateCostEstimate(...)
  calculateCostEstimate(
    project_type,
    location_city,
    location_state,
    floor_area_sq_ft,
    hvac_efficiency_level,
    target_energy_savings_percent
  ) {
    const estimates = this._getFromStorage('cost_estimates');

    const estimated_cost = this._calculateCostEstimateInternal({
      project_type,
      floor_area_sq_ft,
      hvac_efficiency_level,
      target_energy_savings_percent
    });

    const estimate = {
      id: this._generateId('costEstimate'),
      project_type,
      location_city,
      location_state,
      location_full: location_city + (location_state ? ', ' + location_state : ''),
      floor_area_sq_ft: Number(floor_area_sq_ft || 0),
      hvac_efficiency_level,
      target_energy_savings_percent: Number(target_energy_savings_percent || 0),
      estimated_cost,
      created_at: this._nowIso()
    };

    estimates.push(estimate);
    this._saveToStorage('cost_estimates', estimates);

    return {
      cost_estimate_id: estimate.id,
      project_type: estimate.project_type,
      location_city: estimate.location_city,
      location_state: estimate.location_state,
      location_full: estimate.location_full,
      floor_area_sq_ft: estimate.floor_area_sq_ft,
      hvac_efficiency_level: estimate.hvac_efficiency_level,
      target_energy_savings_percent: estimate.target_energy_savings_percent,
      estimated_cost: estimate.estimated_cost
    };
  }

  // 36) submitEstimateRequest(...)
  submitEstimateRequest(
    costEstimateId,
    name,
    email,
    facility_type,
    submitted_via,
    notes
  ) {
    const requests = this._getFromStorage('estimate_requests');

    const newItem = {
      id: this._generateId('estimateReq'),
      costEstimateId,
      name,
      email,
      facility_type,
      submitted_via,
      notes: notes || '',
      created_at: this._nowIso(),
      status: 'submitted'
    };

    requests.push(newItem);
    this._saveToStorage('estimate_requests', requests);

    return {
      success: true,
      estimate_request_id: newItem.id,
      status: newItem.status,
      message: 'Estimate request submitted.'
    };
  }

  // 37) getContactPageConfig()
  getContactPageConfig() {
    const baseConfig = this._getObjectFromStorage('contact_page_config', {
      main_office: { address: '', phone: '', email: '' }
    });

    const budgetOptionsAll = this._getFromStorage('budget_range_options');
    const budget_range_options = budgetOptionsAll
      .filter((b) => b.applies_to === 'contact_design_build' || b.applies_to === 'generic')
      .map((b) => ({
        budget_range_option_id: b.id,
        label: b.label,
        min_amount: b.min_amount,
        max_amount: b.max_amount
      }));

    const inquiry_types = [
      {
        value: 'design_build_project',
        label: 'Design-Build Project',
        description: 'New design-build project inquiry'
      },
      {
        value: 'general_inquiry',
        label: 'General Inquiry',
        description: 'General questions about services'
      },
      {
        value: 'service_support',
        label: 'Service Support',
        description: 'Support for existing projects or services'
      },
      {
        value: 'maintenance_program',
        label: 'Maintenance Program',
        description: 'Questions about maintenance plans'
      },
      {
        value: 'equipment_rental',
        label: 'Equipment Rental',
        description: 'Equipment rental inquiries'
      },
      {
        value: 'training',
        label: 'Training & Certifications',
        description: 'Training and certification inquiries'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Other questions'
      }
    ];

    const referral_sources = [
      { value: 'online_search', label: 'Online Search' },
      { value: 'social_media', label: 'Social Media' },
      { value: 'referral', label: 'Referral' },
      { value: 'repeat_client', label: 'Repeat Client' },
      { value: 'event_tradeshow', label: 'Event / Tradeshow' },
      { value: 'advertisement', label: 'Advertisement' },
      { value: 'other', label: 'Other' }
    ];

    const preferred_contact_methods = [
      { value: 'phone', label: 'Phone' },
      { value: 'email', label: 'Email' }
    ];

    const preferred_time_windows = [
      { value: 'morning_8_10', label: '8 AM – 10 AM' },
      { value: 'morning_10_12', label: '10 AM – 12 PM' },
      { value: 'afternoon_12_2', label: '12 PM – 2 PM' },
      { value: 'afternoon_2_4', label: '2 PM – 4 PM' },
      { value: 'evening_4_6', label: '4 PM – 6 PM' },
      { value: 'anytime', label: 'Anytime' }
    ];

    return {
      main_office: baseConfig.main_office || {
        address: '',
        phone: '',
        email: ''
      },
      inquiry_types,
      budget_range_options,
      referral_sources,
      preferred_contact_methods,
      preferred_time_windows
    };
  }

  // 38) submitInquiry(...)
  submitInquiry(
    inquiry_type,
    project_type,
    project_size_sq_ft,
    budgetRangeOptionId,
    budget_range_label,
    budget_min_amount,
    budget_max_amount,
    desired_start_date,
    referral_source,
    preferred_contact_method,
    preferred_contact_time_window,
    contact_full_name,
    contact_email,
    contact_phone,
    message
  ) {
    const inquiries = this._getFromStorage('inquiries');
    const budgetOptions = this._getFromStorage('budget_range_options');

    let budgetMin = budget_min_amount != null ? Number(budget_min_amount) : null;
    let budgetMax = budget_max_amount != null ? Number(budget_max_amount) : null;
    let budgetLabel = budget_range_label || '';

    if (budgetRangeOptionId) {
      const opt = budgetOptions.find((b) => b.id === budgetRangeOptionId);
      if (opt) {
        if (!budgetLabel) budgetLabel = opt.label;
        if (budgetMin == null) budgetMin = opt.min_amount;
        if (budgetMax == null) budgetMax = opt.max_amount;
      }
    }

    const inquiry = {
      id: this._generateId('inquiry'),
      inquiry_type,
      project_type: project_type || null,
      project_size_sq_ft: project_size_sq_ft != null ? Number(project_size_sq_ft) : null,
      budgetRangeOptionId: budgetRangeOptionId || null,
      budget_range_label: budgetLabel,
      budget_min_amount: budgetMin,
      budget_max_amount: budgetMax,
      desired_start_date: desired_start_date
        ? new Date(desired_start_date).toISOString()
        : null,
      referral_source: referral_source || null,
      preferred_contact_method: preferred_contact_method || null,
      preferred_contact_time_window: preferred_contact_time_window || null,
      contact_full_name,
      contact_email,
      contact_phone: contact_phone || '',
      message: message || '',
      created_at: this._nowIso(),
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('inquiries', inquiries);

    return {
      success: true,
      inquiry_id: inquiry.id,
      status: inquiry.status,
      message: 'Inquiry submitted.'
    };
  }

  // 39) getAboutPageContent()
  getAboutPageContent() {
    const content = this._getObjectFromStorage('about_page_content', {
      company_overview: '',
      history: '',
      mission: '',
      values: [],
      stats: [],
      certifications: [],
      leadership_team: []
    });

    return {
      company_overview: content.company_overview || '',
      history: content.history || '',
      mission: content.mission || '',
      values: Array.isArray(content.values) ? content.values : [],
      stats: Array.isArray(content.stats) ? content.stats : [],
      certifications: Array.isArray(content.certifications)
        ? content.certifications
        : [],
      leadership_team: Array.isArray(content.leadership_team)
        ? content.leadership_team
        : []
    };
  }

  // -------------------- End of BusinessLogic class --------------------
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}