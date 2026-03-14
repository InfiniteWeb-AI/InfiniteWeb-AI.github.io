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
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const ensureKey = (key, defaultValue) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core data tables
    ensureKey('projects', []); // Project[]
    ensureKey('portfolio_filters', null); // PortfolioFilterState | null
    ensureKey('project_inquiries', []); // ProjectInquiry[]

    ensureKey('plans', []); // Plan[]
    ensureKey('plan_filters', null); // PlanFilterState | null
    ensureKey('plan_consultations', []); // PlanConsultation[]

    ensureKey('services', []); // Service[]
    ensureKey('cost_calculator_configs', []); // CostCalculatorConfig[]
    ensureKey('detailed_estimate_requests', []); // DetailedEstimateRequest[]

    ensureKey('articles', []); // Article[]
    ensureKey('blog_filters', null); // BlogFilterState | null

    ensureKey('saved_items', []); // SavedItem[]

    ensureKey('testimonials', []); // Testimonial[]
    ensureKey('testimonial_filters', null); // TestimonialFilterState | null
    ensureKey('testimonial_shares', []); // internal analytics records

    ensureKey('contact_inquiries', []); // ContactInquiry[]
    ensureKey('consultation_bookings', []); // ConsultationBooking[]

    // Generic id counter
    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
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

  _formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return null;
    try {
      return '$' + amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
    } catch (e) {
      return '$' + Math.round(amount);
    }
  }

  _parseISODate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (String(d) === 'Invalid Date') return null;
    return d;
  }

  _getDatePart(isoDateTime) {
    if (!isoDateTime || typeof isoDateTime !== 'string') return null;
    return isoDateTime.substring(0, 10); // YYYY-MM-DD
  }

  _getTimePart(isoDateTime) {
    if (!isoDateTime || typeof isoDateTime !== 'string') return null;
    return isoDateTime.substring(11, 16); // HH:MM
  }

  // -------------------- Filter state helpers --------------------

  _getOrCreatePortfolioFilterState() {
    let state = this._getFromStorage('portfolio_filters', null);
    if (!state) {
      state = {
        id: 'portfolio_filters_default',
        project_type: null,
        style: null,
        context: null,
        room_type: 'any',
        min_size_sq_ft: null,
        max_size_sq_ft: null,
        min_budget: null,
        max_budget: null,
        completion_year_from: null,
        completion_year_to: null,
        sort_by: 'recency_new_to_old',
        last_updated: this._nowIso()
      };
      this._saveToStorage('portfolio_filters', state);
    }
    return state;
  }

  _getOrCreatePlanFilterState() {
    let state = this._getFromStorage('plan_filters', null);
    if (!state) {
      state = {
        id: 'plan_filters_default',
        min_bedrooms: null,
        max_bedrooms: null,
        min_bathrooms: null,
        max_bathrooms: null,
        min_size_sq_ft: null,
        max_size_sq_ft: null,
        style: null,
        max_budget: null,
        sort_by: 'cost_low_to_high',
        last_updated: this._nowIso()
      };
      this._saveToStorage('plan_filters', state);
    }
    return state;
  }

  _getOrCreateBlogFilterState() {
    let state = this._getFromStorage('blog_filters', null);
    if (!state) {
      state = {
        id: 'blog_filters_default',
        tag: null,
        year: null,
        sort_by: 'date_new_to_old',
        last_updated: this._nowIso()
      };
      this._saveToStorage('blog_filters', state);
    }
    return state;
  }

  _getOrCreateTestimonialFilterState() {
    let state = this._getFromStorage('testimonial_filters', null);
    if (!state) {
      state = {
        id: 'testimonial_filters_default',
        project_type: null,
        context: null,
        min_budget: null,
        max_budget: null,
        sort_by: 'budget_high_to_low',
        last_updated: this._nowIso()
      };
      this._saveToStorage('testimonial_filters', state);
    }
    return state;
  }

  // -------------------- Saved items helpers --------------------

  _saveItemInternal(item_type, item_id) {
    const saved = this._getFromStorage('saved_items', []);
    const existing = saved.find(
      (s) => s.item_type === item_type && s.item_id === item_id
    );
    if (existing) {
      return { created: false, saved_item: existing };
    }

    let entity = null;
    let title = '';
    let thumbnail_url = null;
    let item_url = null;
    let item_metadata = [];

    if (item_type === 'project') {
      const projects = this._getFromStorage('projects', []);
      entity = projects.find((p) => p.id === item_id) || null;
      if (!entity) return { created: false, saved_item: null };
      title = entity.name || '';
      thumbnail_url = entity.hero_image_url || (entity.gallery_image_urls && entity.gallery_image_urls[0]) || null;
      item_url = entity.slug ? '/projects/' + entity.slug : null;
      if (typeof entity.size_sq_ft === 'number') {
        item_metadata.push('size: ' + entity.size_sq_ft + ' sq ft');
      }
      const cost = entity.estimated_cost || entity.budget_max || entity.budget_min;
      if (typeof cost === 'number') {
        item_metadata.push('cost: ' + this._formatCurrency(cost));
      }
    } else if (item_type === 'plan') {
      const plans = this._getFromStorage('plans', []);
      entity = plans.find((p) => p.id === item_id) || null;
      if (!entity) return { created: false, saved_item: null };
      title = entity.name || '';
      thumbnail_url = entity.hero_image_url || (entity.gallery_image_urls && entity.gallery_image_urls[0]) || null;
      item_url = entity.slug ? '/plans/' + entity.slug : null;
      if (typeof entity.size_sq_ft === 'number') {
        item_metadata.push('size: ' + entity.size_sq_ft + ' sq ft');
      }
      if (typeof entity.estimated_build_cost === 'number') {
        item_metadata.push('estimated build: ' + this._formatCurrency(entity.estimated_build_cost));
      }
    } else if (item_type === 'article') {
      const articles = this._getFromStorage('articles', []);
      entity = articles.find((a) => a.id === item_id) || null;
      if (!entity) return { created: false, saved_item: null };
      title = entity.title || '';
      thumbnail_url = entity.hero_image_url || null;
      item_url = entity.slug ? '/blog/' + entity.slug : null;
      if (entity.year) {
        item_metadata.push('year: ' + entity.year);
      }
      if (entity.tags && entity.tags.length) {
        item_metadata.push('tags: ' + entity.tags.join(', '));
      }
    } else if (item_type === 'testimonial') {
      const testimonials = this._getFromStorage('testimonials', []);
      entity = testimonials.find((t) => t.id === item_id) || null;
      if (!entity) return { created: false, saved_item: null };
      title = entity.project_name || entity.client_name || 'Testimonial';
      item_url = entity.url_slug ? '/testimonials/' + entity.url_slug : null;
      if (typeof entity.budget_total === 'number') {
        item_metadata.push('budget: ' + this._formatCurrency(entity.budget_total));
      }
      if (entity.context) {
        item_metadata.push('context: ' + entity.context);
      }
    } else {
      return { created: false, saved_item: null };
    }

    const saved_item = {
      id: this._generateId('saved'),
      item_type,
      item_id,
      title,
      thumbnail_url,
      item_url,
      saved_at: this._nowIso(),
      item_metadata
    };

    saved.push(saved_item);
    this._saveToStorage('saved_items', saved);

    return { created: true, saved_item };
  }

  _removeItemInternal(item_type, item_id) {
    const saved = this._getFromStorage('saved_items', []);
    const newSaved = saved.filter(
      (s) => !(s.item_type === item_type && s.item_id === item_id)
    );
    const removed = newSaved.length !== saved.length;
    this._saveToStorage('saved_items', newSaved);

    const counts = {
      project: 0,
      plan: 0,
      article: 0,
      testimonial: 0
    };
    for (let i = 0; i < newSaved.length; i++) {
      const t = newSaved[i].item_type;
      if (counts.hasOwnProperty(t)) counts[t]++;
    }

    return { removed, remaining_counts: counts };
  }

  _attachItemToSavedItem(savedItem) {
    if (!savedItem) return null;
    const item_type = savedItem.item_type;
    const item_id = savedItem.item_id;
    let collectionKey = null;
    if (item_type === 'project') collectionKey = 'projects';
    else if (item_type === 'plan') collectionKey = 'plans';
    else if (item_type === 'article') collectionKey = 'articles';
    else if (item_type === 'testimonial') collectionKey = 'testimonials';

    let item = null;
    if (collectionKey) {
      const items = this._getFromStorage(collectionKey, []);
      item = items.find((e) => e.id === item_id) || null;
    }

    // Following the foreign key rule: item_id -> item
    return Object.assign({}, savedItem, { item });
  }

  // -------------------- Cost calculator helper --------------------

  _calculateBuildCostInternal(config) {
    const sqft = Math.max(0, Number(config.total_square_footage) || 0);
    let baseRate = 200; // default per sq ft

    if (config.finish_level === 'economy') baseRate = 180;
    else if (config.finish_level === 'mid_range') baseRate = 220;
    else if (config.finish_level === 'high_end') baseRate = 280;
    else if (config.finish_level === 'luxury') baseRate = 350;

    // Style factor
    let styleMultiplier = 1;
    if (config.style === 'modern' || config.style === 'contemporary' || config.style === 'industrial') {
      styleMultiplier = 1.05;
    }

    // Location factor (simple heuristic: San Francisco / Bay Area higher)
    let locationMultiplier = 1;
    if (typeof config.location_zip === 'string') {
      if (config.location_zip.startsWith('94')) {
        locationMultiplier = 1.2;
      }
    }

    const cost = sqft * baseRate * styleMultiplier * locationMultiplier;
    return Math.round(cost);
  }

  // -------------------- Inquiry & booking helpers --------------------

  _createInquiryRecordInternal(kind, payload) {
    if (kind === 'project_inquiry') {
      const inquiries = this._getFromStorage('project_inquiries', []);
      const record = {
        id: this._generateId('projinq'),
        project_id: payload.project_id || null,
        project_name_snapshot: payload.project_name_snapshot || null,
        inquiry_kind: payload.inquiry_kind, // 'similar_project_quote' | 'general_project_question' | 'investor_commercial_inquiry'
        name: payload.name,
        email: payload.email || null,
        phone: payload.phone || null,
        target_budget: typeof payload.target_budget === 'number' ? payload.target_budget : null,
        message: payload.message,
        preferred_start_date: payload.preferred_start_date || null,
        created_at: this._nowIso(),
        source_page: payload.source_page || 'project_detail'
      };
      inquiries.push(record);
      this._saveToStorage('project_inquiries', inquiries);
      return record;
    }

    if (kind === 'plan_consultation') {
      const consultations = this._getFromStorage('plan_consultations', []);
      const record = {
        id: this._generateId('plancon'),
        plan_id: payload.plan_id || null,
        plan_name_snapshot: payload.plan_name_snapshot || null,
        name: payload.name,
        email: payload.email,
        message: payload.message,
        created_at: this._nowIso(),
        source_page: payload.source_page || 'plan_detail'
      };
      consultations.push(record);
      this._saveToStorage('plan_consultations', consultations);
      return record;
    }

    if (kind === 'detailed_estimate_request') {
      const requests = this._getFromStorage('detailed_estimate_requests', []);
      const record = {
        id: this._generateId('estimate'),
        calculator_config_id: payload.calculator_config_id || null,
        service_id: payload.service_id,
        name: payload.name,
        email: payload.email,
        project_description: payload.project_description,
        estimate_type: payload.estimate_type, // 'custom_home_cost_calculator' | 'renovation_estimate' | 'commercial_estimate'
        status: 'new',
        created_at: this._nowIso()
      };
      requests.push(record);
      this._saveToStorage('detailed_estimate_requests', requests);
      return record;
    }

    if (kind === 'contact_inquiry') {
      const inquiries = this._getFromStorage('contact_inquiries', []);
      const record = {
        id: this._generateId('contact'),
        name: payload.name,
        email: payload.email,
        phone: payload.phone || null,
        message: payload.message,
        inquiry_type: payload.inquiry_type || 'general',
        source_page: payload.source_page || 'contact_page',
        created_at: this._nowIso()
      };
      inquiries.push(record);
      this._saveToStorage('contact_inquiries', inquiries);
      return record;
    }

    return null;
  }

  _createConsultationBookingInternal(params) {
    const bookings = this._getFromStorage('consultation_bookings', []);
    const appointment_type = params.appointment_type;
    const appointment_datetime = params.appointment_datetime;

    const dt = this._parseISODate(appointment_datetime);
    if (!dt) {
      return { success: false, error: 'invalid_datetime', booking: null };
    }

    const datePart = this._getDatePart(appointment_datetime);
    const timePart = this._getTimePart(appointment_datetime);

    // Check if slot already booked for same type and exact datetime
    const conflict = bookings.find((b) => {
      return (
        b.appointment_type === appointment_type &&
        this._getDatePart(b.appointment_datetime) === datePart &&
        this._getTimePart(b.appointment_datetime) === timePart &&
        b.booking_status !== 'cancelled'
      );
    });
    if (conflict) {
      return { success: false, error: 'slot_unavailable', booking: null };
    }

    const record = {
      id: this._generateId('booking'),
      appointment_type,
      appointment_datetime,
      name: params.name,
      email: params.email,
      notes: params.notes || null,
      booking_status: 'pending',
      source_page: params.source_page || 'contact_page',
      created_at: this._nowIso()
    };

    bookings.push(record);
    this._saveToStorage('consultation_bookings', bookings);

    return { success: true, error: null, booking: record };
  }

  // -------------------- ENUM label helpers --------------------

  _projectTypeLabel(value) {
    const map = {
      single_family_home: 'Single-Family Home',
      renovation: 'Renovation',
      commercial: 'Commercial',
      multi_family: 'Multi-Family',
      mixed_use: 'Mixed Use',
      interior_only: 'Interior Only'
    };
    return map[value] || value || '';
  }

  _styleLabel(value) {
    const map = {
      modern: 'Modern',
      traditional: 'Traditional',
      transitional: 'Transitional',
      contemporary: 'Contemporary',
      farmhouse: 'Farmhouse',
      industrial: 'Industrial',
      craftsman: 'Craftsman',
      mediterranean: 'Mediterranean'
    };
    return map[value] || value || '';
  }

  _contextLabel(value) {
    const map = {
      urban_infill: 'Urban Infill',
      city_lot: 'City Lot',
      suburban_lot: 'Suburban Lot',
      rural_property: 'Rural Property',
      condo_unit: 'Condo Unit',
      townhouse: 'Townhouse'
    };
    return map[value] || value || '';
  }

  // -------------------- Core interface implementations --------------------

  // getHomePageSummary
  getHomePageSummary() {
    const services = this._getFromStorage('services', []);
    const projects = this._getFromStorage('projects', []);
    const plans = this._getFromStorage('plans', []);
    const articles = this._getFromStorage('articles', []);
    const testimonials = this._getFromStorage('testimonials', []);

    const featured_services = services
      .filter((s) => s.is_active)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    const featured_projects = projects.filter((p) => p.is_featured);
    const featured_plans = plans.filter((p) => p.is_featured);
    const featured_articles = articles.filter((a) => a.status === 'published').slice(0, 5);

    // For testimonials, also resolve project (FK)
    const projectById = {};
    for (let i = 0; i < projects.length; i++) {
      projectById[projects[i].id] = projects[i];
    }
    const featured_testimonials_raw = testimonials.filter((t) => !!t.highlight_quote || !!t.mentions_communication || !!t.mentions_timeline);
    const featured_testimonials = featured_testimonials_raw.map((t) => {
      const project = t.project_id ? projectById[t.project_id] || null : null;
      return Object.assign({}, t, { project });
    });

    return {
      hero_title: 'Thoughtful architecture for modern living',
      hero_subtitle: 'Custom homes, renovations, and commercial spaces shaped around how you live and work.',
      hero_background_image_url: null,
      primary_ctas: [
        { label: 'View Portfolio', target_page_key: 'portfolio' },
        { label: 'Browse House Plans', target_page_key: 'plans' },
        { label: 'Schedule a Consultation', target_page_key: 'consultation' }
      ],
      featured_services,
      featured_projects,
      featured_plans,
      featured_articles,
      featured_testimonials
    };
  }

  // -------------------- Portfolio / Projects --------------------

  getPortfolioFilterOptions() {
    const projects = this._getFromStorage('projects', []);

    const project_types = [
      'single_family_home',
      'renovation',
      'commercial',
      'multi_family',
      'mixed_use',
      'interior_only'
    ].map((v) => ({ value: v, label: this._projectTypeLabel(v) }));

    const styles = [
      'modern',
      'traditional',
      'transitional',
      'contemporary',
      'farmhouse',
      'industrial',
      'craftsman',
      'mediterranean'
    ].map((v) => ({ value: v, label: this._styleLabel(v) }));

    const contexts = [
      'urban_infill',
      'city_lot',
      'suburban_lot',
      'rural_property',
      'condo_unit',
      'townhouse'
    ].map((v) => ({ value: v, label: this._contextLabel(v) }));

    const room_types = [
      { value: 'any', label: 'Any' },
      { value: 'kitchen', label: 'Kitchen' },
      { value: 'bathroom', label: 'Bathroom' },
      { value: 'living_space', label: 'Living Space' },
      { value: 'addition', label: 'Addition' },
      { value: 'basement', label: 'Basement' },
      { value: 'exterior', label: 'Exterior' },
      { value: 'commercial_space', label: 'Commercial Space' }
    ];

    let minSize = null;
    let maxSize = null;
    let minBudget = null;
    let maxBudget = null;
    let minYear = null;
    let maxYear = null;

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      if (typeof p.size_sq_ft === 'number') {
        if (minSize === null || p.size_sq_ft < minSize) minSize = p.size_sq_ft;
        if (maxSize === null || p.size_sq_ft > maxSize) maxSize = p.size_sq_ft;
      }
      const cost = p.estimated_cost || p.budget_max || p.budget_min;
      if (typeof cost === 'number') {
        if (minBudget === null || cost < minBudget) minBudget = cost;
        if (maxBudget === null || cost > maxBudget) maxBudget = cost;
      }
      const year = p.completion_year;
      if (typeof year === 'number') {
        if (minYear === null || year < minYear) minYear = year;
        if (maxYear === null || year > maxYear) maxYear = year;
      }
    }

    const size_sq_ft_range = {
      min: minSize || 0,
      max: maxSize || 0,
      step: 50
    };

    const budget_range = {
      min: minBudget || 0,
      max: maxBudget || 0,
      step: 5000
    };

    const completion_year_range = {
      min_year: minYear || new Date().getFullYear(),
      max_year: maxYear || new Date().getFullYear()
    };

    const sort_options = [
      { value: 'cost_high_to_low', label: 'Cost: High to Low' },
      { value: 'cost_low_to_high', label: 'Cost: Low to High' },
      { value: 'recency_new_to_old', label: 'Newest First' },
      { value: 'recency_old_to_new', label: 'Oldest First' },
      { value: 'name_a_to_z', label: 'Name A to Z' },
      { value: 'name_z_to_a', label: 'Name Z to A' }
    ];

    return {
      project_types,
      styles,
      contexts,
      room_types,
      size_sq_ft_range,
      budget_range,
      completion_year_range,
      sort_options
    };
  }

  getPortfolioFilterState() {
    return this._getOrCreatePortfolioFilterState();
  }

  updatePortfolioFilterState(changes) {
    const current = this._getOrCreatePortfolioFilterState();
    // Treat each update as a fresh filter application so previous criteria
    // (like style, room_type, size, or year ranges) don't persist between flows.
    const cleared = {
      id: current && current.id ? current.id : 'portfolio_filters_default',
      project_type: null,
      style: null,
      context: null,
      room_type: 'any',
      min_size_sq_ft: null,
      max_size_sq_ft: null,
      min_budget: null,
      max_budget: null,
      completion_year_from: null,
      completion_year_to: null,
      sort_by: 'recency_new_to_old',
      last_updated: this._nowIso()
    };
    const merged = Object.assign({}, cleared, changes || {}, { last_updated: this._nowIso() });
    this._saveToStorage('portfolio_filters', merged);
    return merged;
  }

  getPortfolioProjects(page = 1, pageSize = 20) {
    const filters = this._getOrCreatePortfolioFilterState();
    const projects = this._getFromStorage('projects', []);

    const filtered = projects.filter((p) => {
      if (filters.project_type && p.project_type !== filters.project_type) return false;
      if (filters.style && p.style !== filters.style) return false;
      if (filters.context && p.context !== filters.context) return false;

      if (filters.room_type && filters.room_type !== 'any') {
        const roomTagMatch = Array.isArray(p.room_tags) && p.room_tags.indexOf(filters.room_type) !== -1;
        const primaryMatch = p.primary_space === filters.room_type;
        if (!roomTagMatch && !primaryMatch) return false;
      }

      if (typeof filters.min_size_sq_ft === 'number') {
        if (typeof p.size_sq_ft !== 'number' || p.size_sq_ft < filters.min_size_sq_ft) return false;
      }
      if (typeof filters.max_size_sq_ft === 'number') {
        if (typeof p.size_sq_ft !== 'number' || p.size_sq_ft > filters.max_size_sq_ft) return false;
      }

      const cost = p.estimated_cost || p.budget_max || p.budget_min;
      if (typeof filters.min_budget === 'number') {
        if (typeof cost !== 'number' || cost < filters.min_budget) return false;
      }
      if (typeof filters.max_budget === 'number') {
        if (typeof cost !== 'number' || cost > filters.max_budget) return false;
      }

      let year = p.completion_year;
      if (typeof year !== 'number' && p.completion_date) {
        const d = this._parseISODate(p.completion_date);
        if (d) year = d.getFullYear();
      }
      if (typeof filters.completion_year_from === 'number') {
        if (typeof year !== 'number' || year < filters.completion_year_from) return false;
      }
      if (typeof filters.completion_year_to === 'number') {
        if (typeof year !== 'number' || year > filters.completion_year_to) return false;
      }

      return true;
    });

    const sortBy = filters.sort_by || 'recency_new_to_old';

    filtered.sort((a, b) => {
      const costA = a.estimated_cost || a.budget_max || a.budget_min || 0;
      const costB = b.estimated_cost || b.budget_max || b.budget_min || 0;

      const dateA = this._parseISODate(a.completion_date) || (a.completion_year ? new Date(a.completion_year, 0, 1) : null);
      const dateB = this._parseISODate(b.completion_date) || (b.completion_year ? new Date(b.completion_year, 0, 1) : null);

      if (sortBy === 'cost_high_to_low') return costB - costA;
      if (sortBy === 'cost_low_to_high') return costA - costB;
      if (sortBy === 'recency_new_to_old') {
        if (dateA && dateB) return dateB - dateA;
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return 0;
      }
      if (sortBy === 'recency_old_to_new') {
        if (dateA && dateB) return dateA - dateB;
        if (dateA && !dateB) return 1;
        if (!dateA && dateB) return -1;
        return 0;
      }
      if (sortBy === 'name_a_to_z') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name_z_to_a') return (b.name || '').localeCompare(a.name || '');
      return 0;
    });

    const total_count = filtered.length;
    const page_size = pageSize;
    const total_pages = page_size > 0 ? Math.max(1, Math.ceil(total_count / page_size)) : 1;
    const currentPage = Math.min(Math.max(1, page), total_pages);
    const start = (currentPage - 1) * page_size;
    const end = start + page_size;
    const pageItems = filtered.slice(start, end);

    return {
      filters,
      projects: pageItems,
      page: currentPage,
      page_size,
      total_count,
      total_pages
    };
  }

  getProjectDetail(projectSlug) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.slug === projectSlug) || null;
    if (!project) {
      return {
        project: null,
        is_saved: false,
        project_type_label: '',
        style_label: '',
        context_label: '',
        budget_display: null,
        size_display: null,
        can_request_similar_project: false,
        can_request_investor_inquiry: false,
        similar_projects: []
      };
    }

    const saved = this._getFromStorage('saved_items', []);
    const is_saved = !!saved.find(
      (s) => s.item_type === 'project' && s.item_id === project.id
    );

    const cost = project.estimated_cost || project.budget_max || project.budget_min || null;
    const budget_display = cost ? this._formatCurrency(cost) : null;
    const size_display = typeof project.size_sq_ft === 'number'
      ? project.size_sq_ft.toLocaleString('en-US') + ' sq ft'
      : null;

    const can_request_similar_project = project.status === 'completed';
    const can_request_investor_inquiry = project.project_type === 'commercial';

    const similar_projects = projects
      .filter((p) => p.id !== project.id && p.project_type === project.project_type && p.style === project.style)
      .slice(0, 4);

    return {
      project,
      is_saved,
      project_type_label: this._projectTypeLabel(project.project_type),
      style_label: this._styleLabel(project.style),
      context_label: this._contextLabel(project.context),
      budget_display,
      size_display,
      can_request_similar_project,
      can_request_investor_inquiry,
      similar_projects
    };
  }

  saveProjectToFavorites(projectId) {
    const result = this._saveItemInternal('project', projectId);
    const saved = this._getFromStorage('saved_items', []);
    const total_saved_projects = saved.filter((s) => s.item_type === 'project').length;
    if (!result.saved_item) {
      return {
        success: false,
        saved_item: null,
        total_saved_projects,
        message: 'Project not found.'
      };
    }
    return {
      success: true,
      saved_item: result.saved_item,
      total_saved_projects,
      message: result.created ? 'Project added to favorites.' : 'Project already in favorites.'
    };
  }

  requestSimilarProjectQuote(projectId, name, phone, target_budget, message, preferred_start_date) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) {
      return {
        success: false,
        project_inquiry: null,
        confirmation_message: 'Project not found.'
      };
    }

    const inquiry = this._createInquiryRecordInternal('project_inquiry', {
      project_id: project.id,
      project_name_snapshot: project.name,
      inquiry_kind: 'similar_project_quote',
      name,
      phone,
      target_budget: typeof target_budget === 'number' ? target_budget : null,
      message,
      preferred_start_date: preferred_start_date || null,
      source_page: 'project_detail'
    });

    const project_inquiry = Object.assign({}, inquiry, { project });

    return {
      success: true,
      project_inquiry,
      confirmation_message: 'Your quote request has been submitted.'
    };
  }

  requestProjectInvestorInquiry(projectId, name, email, message) {
    const projects = this._getFromStorage('projects', []);
    const project = projects.find((p) => p.id === projectId) || null;
    if (!project) {
      return {
        success: false,
        project_inquiry: null,
        confirmation_message: 'Project not found.'
      };
    }

    const inquiry = this._createInquiryRecordInternal('project_inquiry', {
      project_id: project.id,
      project_name_snapshot: project.name,
      inquiry_kind: 'investor_commercial_inquiry',
      name,
      email,
      message,
      source_page: 'project_detail'
    });

    const project_inquiry = Object.assign({}, inquiry, { project });

    return {
      success: true,
      project_inquiry,
      confirmation_message: 'Your commercial project inquiry has been submitted.'
    };
  }

  // -------------------- Plans --------------------

  getPlanFilterOptions() {
    const plans = this._getFromStorage('plans', []);

    const bedroomSet = new Set();
    const bathroomSet = new Set();
    let minSize = null;
    let maxSize = null;
    let minBudget = null;
    let maxBudget = null;

    for (let i = 0; i < plans.length; i++) {
      const p = plans[i];
      if (typeof p.bedrooms === 'number') bedroomSet.add(p.bedrooms);
      if (typeof p.bathrooms === 'number') bathroomSet.add(p.bathrooms);
      if (typeof p.size_sq_ft === 'number') {
        if (minSize === null || p.size_sq_ft < minSize) minSize = p.size_sq_ft;
        if (maxSize === null || p.size_sq_ft > maxSize) maxSize = p.size_sq_ft;
      }
      if (typeof p.estimated_build_cost === 'number') {
        if (minBudget === null || p.estimated_build_cost < minBudget) minBudget = p.estimated_build_cost;
        if (maxBudget === null || p.estimated_build_cost > maxBudget) maxBudget = p.estimated_build_cost;
      }
    }

    const bedroom_counts = Array.from(bedroomSet).sort((a, b) => a - b);
    const bathroom_counts = Array.from(bathroomSet).sort((a, b) => a - b);

    const size_sq_ft_range = {
      min: minSize || 0,
      max: maxSize || 0,
      step: 50
    };

    const max_budget_range = {
      min: minBudget || 0,
      max: maxBudget || 0,
      step: 5000
    };

    const styles = [
      'modern',
      'traditional',
      'transitional',
      'contemporary',
      'farmhouse',
      'industrial',
      'craftsman',
      'mediterranean'
    ].map((v) => ({ value: v, label: this._styleLabel(v) }));

    const sort_options = [
      { value: 'cost_low_to_high', label: 'Cost: Low to High' },
      { value: 'cost_high_to_low', label: 'Cost: High to Low' },
      { value: 'size_low_to_high', label: 'Size: Small to Large' },
      { value: 'size_high_to_low', label: 'Size: Large to Small' },
      { value: 'popularity_high_to_low', label: 'Popularity' }
    ];

    return {
      bedroom_counts,
      bathroom_counts,
      size_sq_ft_range,
      max_budget_range,
      styles,
      sort_options
    };
  }

  getPlanFilterState() {
    return this._getOrCreatePlanFilterState();
  }

  updatePlanFilterState(changes) {
    const current = this._getOrCreatePlanFilterState();
    const merged = Object.assign({}, current, changes || {}, { last_updated: this._nowIso() });
    this._saveToStorage('plan_filters', merged);
    return merged;
  }

  getPlansList(page = 1, pageSize = 20) {
    const filters = this._getOrCreatePlanFilterState();
    const plans = this._getFromStorage('plans', []);

    const filtered = plans.filter((p) => {
      if (typeof filters.min_bedrooms === 'number') {
        if (typeof p.bedrooms !== 'number' || p.bedrooms < filters.min_bedrooms) return false;
      }
      if (typeof filters.max_bedrooms === 'number') {
        if (typeof p.bedrooms !== 'number' || p.bedrooms > filters.max_bedrooms) return false;
      }
      if (typeof filters.min_bathrooms === 'number') {
        if (typeof p.bathrooms !== 'number' || p.bathrooms < filters.min_bathrooms) return false;
      }
      if (typeof filters.max_bathrooms === 'number') {
        if (typeof p.bathrooms !== 'number' || p.bathrooms > filters.max_bathrooms) return false;
      }
      if (typeof filters.min_size_sq_ft === 'number') {
        if (typeof p.size_sq_ft !== 'number' || p.size_sq_ft < filters.min_size_sq_ft) return false;
      }
      if (typeof filters.max_size_sq_ft === 'number') {
        if (typeof p.size_sq_ft !== 'number' || p.size_sq_ft > filters.max_size_sq_ft) return false;
      }
      if (filters.style && p.style && p.style !== filters.style) return false;
      if (typeof filters.max_budget === 'number') {
        if (typeof p.estimated_build_cost !== 'number' || p.estimated_build_cost > filters.max_budget) return false;
      }
      return true;
    });

    const sortBy = filters.sort_by || 'cost_low_to_high';
    filtered.sort((a, b) => {
      const costA = a.estimated_build_cost || 0;
      const costB = b.estimated_build_cost || 0;
      const sizeA = a.size_sq_ft || 0;
      const sizeB = b.size_sq_ft || 0;
      const popA = a.popularity_score || 0;
      const popB = b.popularity_score || 0;

      if (sortBy === 'cost_high_to_low') return costB - costA;
      if (sortBy === 'cost_low_to_high') return costA - costB;
      if (sortBy === 'size_high_to_low') return sizeB - sizeA;
      if (sortBy === 'size_low_to_high') return sizeA - sizeB;
      if (sortBy === 'popularity_high_to_low') return popB - popA;
      return 0;
    });

    const total_count = filtered.length;
    const page_size = pageSize;
    const total_pages = page_size > 0 ? Math.max(1, Math.ceil(total_count / page_size)) : 1;
    const currentPage = Math.min(Math.max(1, page), total_pages);
    const start = (currentPage - 1) * page_size;
    const end = start + page_size;
    const pageItems = filtered.slice(start, end);

    return {
      filters,
      plans: pageItems,
      page: currentPage,
      page_size,
      total_count,
      total_pages
    };
  }

  getPlanDetail(planSlug) {
    const plans = this._getFromStorage('plans', []);
    const plan = plans.find((p) => p.slug === planSlug) || null;
    if (!plan) {
      return {
        plan: null,
        is_saved: false,
        estimated_cost_display: null,
        size_display: null,
        comparison_highlights: [],
        similar_plans: []
      };
    }

    const saved = this._getFromStorage('saved_items', []);
    const is_saved = !!saved.find(
      (s) => s.item_type === 'plan' && s.item_id === plan.id
    );

    const estimated_cost_display = this._formatCurrency(plan.estimated_build_cost);
    const size_display = typeof plan.size_sq_ft === 'number'
      ? plan.size_sq_ft.toLocaleString('en-US') + ' sq ft'
      : null;

    const comparison_highlights = [];
    if (typeof plan.bedrooms === 'number') comparison_highlights.push(plan.bedrooms + ' bedrooms');
    if (typeof plan.bathrooms === 'number') comparison_highlights.push(plan.bathrooms + ' bathrooms');
    if (size_display) comparison_highlights.push(size_display);
    if (estimated_cost_display) comparison_highlights.push('Estimated build: ' + estimated_cost_display);

    const similar_plans = plans
      .filter((p) => p.id !== plan.id && p.status === 'active' && p.bedrooms === plan.bedrooms)
      .slice(0, 4);

    // Instrumentation for task completion tracking
    try {
      if (
        plan &&
        plan.bedrooms === 3 &&
        typeof plan.size_sq_ft === 'number' &&
        plan.size_sq_ft < 2000
      ) {
        const arr = JSON.parse(localStorage.getItem('task3_comparedPlanIds') || '[]');
        if (Array.isArray(arr) && !arr.includes(plan.id) && arr.length < 2) {
          arr.push(plan.id);
          localStorage.setItem('task3_comparedPlanIds', JSON.stringify(arr));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      plan,
      is_saved,
      estimated_cost_display,
      size_display,
      comparison_highlights,
      similar_plans
    };
  }

  savePlanToFavorites(planId) {
    const result = this._saveItemInternal('plan', planId);
    const saved = this._getFromStorage('saved_items', []);
    const total_saved_plans = saved.filter((s) => s.item_type === 'plan').length;
    if (!result.saved_item) {
      return {
        success: false,
        saved_item: null,
        total_saved_plans,
        message: 'Plan not found.'
      };
    }
    return {
      success: true,
      saved_item: result.saved_item,
      total_saved_plans,
      message: result.created ? 'Plan added to favorites.' : 'Plan already in favorites.'
    };
  }

  requestPlanConsultation(planId, name, email, message) {
    const plans = this._getFromStorage('plans', []);
    const plan = plans.find((p) => p.id === planId) || null;
    if (!plan) {
      return {
        success: false,
        plan_consultation: null,
        confirmation_message: 'Plan not found.'
      };
    }

    const record = this._createInquiryRecordInternal('plan_consultation', {
      plan_id: plan.id,
      plan_name_snapshot: plan.name,
      name,
      email,
      message,
      source_page: 'plan_detail'
    });

    const plan_consultation = Object.assign({}, record, { plan });

    // Instrumentation for task completion tracking
    try {
      if (
        plan &&
        plan.bedrooms === 3 &&
        typeof plan.size_sq_ft === 'number' &&
        plan.size_sq_ft < 2000 &&
        record
      ) {
        localStorage.setItem('task3_selectedCheaperPlanId', plan.id);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      plan_consultation,
      confirmation_message: 'Your consultation request has been submitted.'
    };
  }

  // -------------------- Services & Cost Calculator --------------------

  getServicesList() {
    const services = this._getFromStorage('services', []);
    return services
      .filter((s) => s.is_active)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  }

  getServiceDetail(serviceSlug) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.slug === serviceSlug) || null;
    const projects = this._getFromStorage('projects', []);

    if (!service) {
      return {
        service: null,
        has_cost_calculator: false,
        related_projects: []
      };
    }

    // Map service_key to project_type(s) for hierarchical relationships
    const serviceToProjectTypes = {
      custom_home_design: ['single_family_home', 'multi_family'],
      renovations_remodels: ['renovation', 'interior_only'],
      commercial_architecture: ['commercial', 'mixed_use'],
      interior_design: ['interior_only'],
      consulting_only: []
    };

    const allowedTypes = serviceToProjectTypes[service.service_key] || [];
    const related_projects = projects.filter((p) => allowedTypes.indexOf(p.project_type) !== -1);

    return {
      service,
      has_cost_calculator: !!service.has_cost_calculator,
      related_projects
    };
  }

  runCostCalculator(serviceId, total_square_footage, style, bedrooms, bathrooms, finish_level, location_zip) {
    const services = this._getFromStorage('services', []);
    const service = services.find((s) => s.id === serviceId) || null;
    if (!service) {
      // Still create a config but with unknown service
    }

    const config = {
      id: this._generateId('calc'),
      service_id: serviceId,
      total_square_footage: Number(total_square_footage) || 0,
      style: style || null,
      bedrooms: typeof bedrooms === 'number' ? bedrooms : null,
      bathrooms: typeof bathrooms === 'number' ? bathrooms : null,
      finish_level,
      location_zip,
      calculated_estimated_cost: 0,
      last_calculated_at: this._nowIso()
    };

    config.calculated_estimated_cost = this._calculateBuildCostInternal(config);

    const configs = this._getFromStorage('cost_calculator_configs', []);
    configs.push(config);
    this._saveToStorage('cost_calculator_configs', configs);

    return config;
  }

  requestDetailedEstimateFromCalculator(calculatorConfigId, serviceId, name, email, project_description) {
    const configs = this._getFromStorage('cost_calculator_configs', []);
    const services = this._getFromStorage('services', []);
    const config = configs.find((c) => c.id === calculatorConfigId) || null;
    const service = services.find((s) => s.id === serviceId) || null;

    if (!config || !service) {
      return {
        success: false,
        detailed_estimate_request: null,
        confirmation_message: 'Calculator configuration or service not found.'
      };
    }

    let estimate_type = 'custom_home_cost_calculator';
    if (service.service_key === 'renovations_remodels') estimate_type = 'renovation_estimate';
    else if (service.service_key === 'commercial_architecture') estimate_type = 'commercial_estimate';

    const record = this._createInquiryRecordInternal('detailed_estimate_request', {
      calculator_config_id: config.id,
      service_id: service.id,
      name,
      email,
      project_description,
      estimate_type
    });

    const detailed_estimate_request = Object.assign({}, record, {
      calculator_config: config,
      service
    });

    return {
      success: true,
      detailed_estimate_request,
      confirmation_message: 'Your detailed estimate request has been submitted.'
    };
  }

  // -------------------- Blog / Articles --------------------

  getBlogFilterOptions() {
    const articles = this._getFromStorage('articles', []);
    const tagSet = new Set();
    const yearSet = new Set();

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (typeof a.year === 'number') yearSet.add(a.year);
      if (Array.isArray(a.tags)) {
        for (let j = 0; j < a.tags.length; j++) {
          tagSet.add(a.tags[j]);
        }
      }
    }

    const tags = Array.from(tagSet).sort().map((t) => ({ value: t, label: t.replace(/_/g, ' ') }));
    const years = Array.from(yearSet).sort((a, b) => b - a);

    const sort_options = [
      { value: 'date_new_to_old', label: 'Newest First' },
      { value: 'date_old_to_new', label: 'Oldest First' },
      { value: 'popularity_high_to_low', label: 'Popularity' }
    ];

    return { tags, years, sort_options };
  }

  getBlogFilterState() {
    return this._getOrCreateBlogFilterState();
  }

  updateBlogFilterState(changes) {
    const current = this._getOrCreateBlogFilterState();
    const merged = Object.assign({}, current, changes || {}, { last_updated: this._nowIso() });
    this._saveToStorage('blog_filters', merged);
    return merged;
  }

  getBlogArticlesList(page = 1, pageSize = 20) {
    const filters = this._getOrCreateBlogFilterState();
    const articles = this._getFromStorage('articles', []);

    const filtered = articles.filter((a) => {
      if (a.status !== 'published') return false;

      if (filters.tag) {
        const tag = filters.tag;
        const tags = Array.isArray(a.tags) ? a.tags : [];
        const hasTag = tags.indexOf(tag) !== -1;
        // Hierarchical: sustainability-related includes is_sustainability_focused
        if (tag === 'sustainability' || tag === 'green_building') {
          if (!hasTag && !a.is_sustainability_focused) return false;
        } else if (!hasTag) {
          return false;
        }
      }

      if (typeof filters.year === 'number') {
        if (a.year !== filters.year) return false;
      }

      return true;
    });

    const sortBy = filters.sort_by || 'date_new_to_old';
    filtered.sort((a, b) => {
      const dateA = this._parseISODate(a.publication_date);
      const dateB = this._parseISODate(b.publication_date);
      if (sortBy === 'date_new_to_old') {
        if (dateA && dateB) return dateB - dateA;
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return 0;
      }
      if (sortBy === 'date_old_to_new') {
        if (dateA && dateB) return dateA - dateB;
        if (dateA && !dateB) return 1;
        if (!dateA && dateB) return -1;
        return 0;
      }
      // popularity_high_to_low – no explicit field, keep stable
      return 0;
    });

    const total_count = filtered.length;
    const page_size = pageSize;
    const total_pages = page_size > 0 ? Math.max(1, Math.ceil(total_count / page_size)) : 1;
    const currentPage = Math.min(Math.max(1, page), total_pages);
    const start = (currentPage - 1) * page_size;
    const end = start + page_size;
    const pageItems = filtered.slice(start, end);

    return {
      filters,
      articles: pageItems,
      page: currentPage,
      page_size,
      total_count,
      total_pages
    };
  }

  getArticleDetail(articleSlug) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.slug === articleSlug) || null;
    if (!article) {
      return {
        article: null,
        is_saved: false,
        related_articles: [],
        previous_article: null,
        next_article: null
      };
    }

    const saved = this._getFromStorage('saved_items', []);
    const is_saved = !!saved.find(
      (s) => s.item_type === 'article' && s.item_id === article.id
    );

    const related_articles = articles
      .filter((a) => a.id !== article.id && a.status === 'published')
      .filter((a) => {
        if (!Array.isArray(article.tags) || article.tags.length === 0) return false;
        const tags = Array.isArray(a.tags) ? a.tags : [];
        for (let i = 0; i < article.tags.length; i++) {
          if (tags.indexOf(article.tags[i]) !== -1) return true;
        }
        return false;
      })
      .slice(0, 4);

    const sorted = articles
      .filter((a) => a.status === 'published')
      .slice()
      .sort((a, b) => {
        const dateA = this._parseISODate(a.publication_date);
        const dateB = this._parseISODate(b.publication_date);
        if (dateA && dateB) return dateA - dateB;
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;
        return 0;
      });

    let previous_article = null;
    let next_article = null;
    const idx = sorted.findIndex((a) => a.id === article.id);
    if (idx !== -1) {
      if (idx > 0) previous_article = sorted[idx - 1];
      if (idx < sorted.length - 1) next_article = sorted[idx + 1];
    }

    return {
      article,
      is_saved,
      related_articles,
      previous_article,
      next_article
    };
  }

  saveArticleToReadingList(articleId) {
    const result = this._saveItemInternal('article', articleId);
    const saved = this._getFromStorage('saved_items', []);
    const total_saved_articles = saved.filter((s) => s.item_type === 'article').length;
    if (!result.saved_item) {
      return {
        success: false,
        saved_item: null,
        total_saved_articles,
        message: 'Article not found.'
      };
    }
    return {
      success: true,
      saved_item: result.saved_item,
      total_saved_articles,
      message: result.created ? 'Article added to reading list.' : 'Article already in reading list.'
    };
  }

  // -------------------- Saved Items --------------------

  getSavedItems(itemType) {
    const saved = this._getFromStorage('saved_items', []);
    const filtered = itemType ? saved.filter((s) => s.item_type === itemType) : saved.slice();

    const items = filtered.map((s) => this._attachItemToSavedItem(s));

    const counts = {
      project: 0,
      plan: 0,
      article: 0,
      testimonial: 0
    };
    for (let i = 0; i < saved.length; i++) {
      const t = saved[i].item_type;
      if (counts.hasOwnProperty(t)) counts[t]++;
    }

    return {
      items,
      counts_by_type: counts
    };
  }

  removeSavedItem(itemType, itemId) {
    const result = this._removeItemInternal(itemType, itemId);
    return {
      success: result.removed,
      message: result.removed ? 'Item removed from saved items.' : 'Item not found in saved items.',
      remaining_counts: result.remaining_counts
    };
  }

  // -------------------- Testimonials --------------------

  getTestimonialsFilterOptions() {
    const project_types = [
      'single_family_home',
      'renovation',
      'commercial',
      'multi_family',
      'mixed_use',
      'interior_only'
    ].map((v) => ({ value: v, label: this._projectTypeLabel(v) }));

    const contexts = [
      'urban_infill',
      'city_lot',
      'suburban_lot',
      'rural_property',
      'condo_unit',
      'townhouse'
    ].map((v) => ({ value: v, label: this._contextLabel(v) }));

    const budget_bands = [
      { min_budget: 0, max_budget: 200000, label: 'Under $200k' },
      { min_budget: 200000, max_budget: 500000, label: '$200k–$500k' },
      { min_budget: 500000, max_budget: 800000, label: '$500k–$800k' },
      { min_budget: 800000, max_budget: null, label: '$800k+' }
    ];

    const sort_options = [
      { value: 'budget_high_to_low', label: 'Budget: High to Low' },
      { value: 'budget_low_to_high', label: 'Budget: Low to High' },
      { value: 'recency_new_to_old', label: 'Newest First' },
      { value: 'recency_old_to_new', label: 'Oldest First' }
    ];

    return {
      project_types,
      contexts,
      budget_bands,
      sort_options
    };
  }

  getTestimonialsFilterState() {
    return this._getOrCreateTestimonialFilterState();
  }

  updateTestimonialsFilterState(changes) {
    const current = this._getOrCreateTestimonialFilterState();
    const merged = Object.assign({}, current, changes || {}, { last_updated: this._nowIso() });
    this._saveToStorage('testimonial_filters', merged);
    return merged;
  }

  getTestimonialsList(page = 1, pageSize = 20) {
    const filters = this._getOrCreateTestimonialFilterState();
    const testimonials = this._getFromStorage('testimonials', []);
    const projects = this._getFromStorage('projects', []);

    const projectById = {};
    for (let i = 0; i < projects.length; i++) {
      projectById[projects[i].id] = projects[i];
    }

    const filtered = testimonials.filter((t) => {
      if (filters.project_type && t.project_type && t.project_type !== filters.project_type) return false;
      if (filters.context && t.context && t.context !== filters.context) return false;
      if (typeof filters.min_budget === 'number') {
        if (typeof t.budget_total !== 'number' || t.budget_total < filters.min_budget) return false;
      }
      if (typeof filters.max_budget === 'number') {
        if (typeof t.budget_total !== 'number' || t.budget_total > filters.max_budget) return false;
      }
      return true;
    });

    const sortBy = filters.sort_by || 'budget_high_to_low';
    filtered.sort((a, b) => {
      const budgetA = a.budget_total || 0;
      const budgetB = b.budget_total || 0;
      const yearA = a.completion_year || 0;
      const yearB = b.completion_year || 0;

      if (sortBy === 'budget_high_to_low') return budgetB - budgetA;
      if (sortBy === 'budget_low_to_high') return budgetA - budgetB;
      if (sortBy === 'recency_new_to_old') return yearB - yearA;
      if (sortBy === 'recency_old_to_new') return yearA - yearB;
      return 0;
    });

    const total_count = filtered.length;
    const page_size = pageSize;
    const total_pages = page_size > 0 ? Math.max(1, Math.ceil(total_count / page_size)) : 1;
    const currentPage = Math.min(Math.max(1, page), total_pages);
    const start = (currentPage - 1) * page_size;
    const end = start + page_size;
    const pageItemsRaw = filtered.slice(start, end);

    const testimonialsWithProject = pageItemsRaw.map((t) => {
      const project = t.project_id ? projectById[t.project_id] || null : null;
      return Object.assign({}, t, { project });
    });

    return {
      filters,
      testimonials: testimonialsWithProject,
      page: currentPage,
      page_size,
      total_count,
      total_pages
    };
  }

  getTestimonialDetail(testimonialSlug) {
    const testimonials = this._getFromStorage('testimonials', []);
    const projects = this._getFromStorage('projects', []);
    const testimonial = testimonials.find((t) => t.url_slug === testimonialSlug) || null;

    if (!testimonial) {
      return {
        testimonial: null,
        related_project: null,
        canonical_url: null
      };
    }

    const related_project = testimonial.project_id
      ? projects.find((p) => p.id === testimonial.project_id) || null
      : null;

    const canonical_url = 'https://example.com/testimonials/' + testimonial.url_slug;

    // Also attach project on the testimonial object according to FK rule
    const testimonialWithProject = Object.assign({}, testimonial, {
      project: related_project
    });

    return {
      testimonial: testimonialWithProject,
      related_project,
      canonical_url
    };
  }

  trackTestimonialShare(testimonialId, method) {
    const testimonials = this._getFromStorage('testimonials', []);
    const testimonial = testimonials.find((t) => t.id === testimonialId) || null;
    if (!testimonial) {
      return {
        success: false,
        message: 'Testimonial not found.'
      };
    }

    const shares = this._getFromStorage('testimonial_shares', []);
    const record = {
      id: this._generateId('tshare'),
      testimonial_id: testimonialId,
      method,
      created_at: this._nowIso()
    };
    shares.push(record);
    this._saveToStorage('testimonial_shares', shares);

    return {
      success: true,
      message: 'Testimonial share recorded.'
    };
  }

  // -------------------- Contact & Consultation --------------------

  getContactPageContent() {
    return {
      page_title: 'Contact & Consultations',
      intro_text: 'Tell us a bit about your project or book a time to talk with our team.',
      appointment_types: [
        { value: 'custom_home_consultation', label: 'Custom Home Consultation' },
        { value: 'renovation_consultation', label: 'Renovation Consultation' },
        { value: 'commercial_project_consultation', label: 'Commercial Project Consultation' },
        { value: 'general_consultation', label: 'General Consultation' }
      ]
    };
  }

  submitContactInquiry(name, email, phone, message, inquiry_type = 'general') {
    const record = this._createInquiryRecordInternal('contact_inquiry', {
      name,
      email,
      phone,
      message,
      inquiry_type: inquiry_type || 'general',
      source_page: 'contact_page'
    });

    return {
      success: true,
      contact_inquiry: record,
      confirmation_message: 'Your message has been sent. We will get back to you shortly.'
    };
  }

  getConsultationAvailability(appointment_type, date) {
    const bookings = this._getFromStorage('consultation_bookings', []);
    const dayBookings = bookings.filter(
      (b) =>
        b.appointment_type === appointment_type &&
        this._getDatePart(b.appointment_datetime) === date &&
        b.booking_status !== 'cancelled'
    );

    // Simple fixed schedule with a 3:00 PM slot
    const baseSlots = ['09:00', '11:00', '13:00', '15:00', '17:00'];
    const time_slots = baseSlots.map((time) => {
      const isTaken = !!dayBookings.find((b) => this._getTimePart(b.appointment_datetime) === time);
      return { time, is_available: !isTaken };
    });

    return {
      appointment_type,
      date,
      time_slots
    };
  }

  bookConsultationAppointment(appointment_type, appointment_datetime, name, email, notes) {
    const result = this._createConsultationBookingInternal({
      appointment_type,
      appointment_datetime,
      name,
      email,
      notes,
      source_page: 'contact_page'
    });

    if (!result.success) {
      const message = result.error === 'slot_unavailable'
        ? 'Selected time slot is no longer available.'
        : 'Unable to book consultation with the provided information.';
      return {
        success: false,
        consultation_booking: null,
        confirmation_message: message
      };
    }

    return {
      success: true,
      consultation_booking: result.booking,
      confirmation_message: 'Your consultation has been requested. We will confirm via email.'
    };
  }

  // -------------------- Static Content Pages --------------------

  getAboutPageContent() {
    return {
      page_title: 'About Our Studio',
      history: 'Our architecture studio focuses on thoughtful, context-sensitive design across custom homes, renovations, and commercial work.',
      mission: 'To create spaces that balance beauty, performance, and long-term value for our clients and communities.',
      values: [
        {
          title: 'Client-Centered Design',
          description: 'We start every project by deeply understanding your goals, lifestyle, and priorities.'
        },
        {
          title: 'Sustainability',
          description: 'We integrate sustainable strategies that match your budget and performance targets.'
        },
        {
          title: 'Clear Communication',
          description: 'We keep you informed at every step with transparent timelines and decisions.'
        }
      ],
      team_members: [],
      awards: []
    };
  }

  getProcessPageContent() {
    return {
      page_title: 'Our Design & Build Process',
      intro_text: 'We guide you from early ideas through construction with a clear, phased process.',
      phases: [
        {
          phase_key: 'discovery',
          title: 'Discovery & Feasibility',
          description: 'We clarify your goals, constraints, and budget, and review the site or existing structure.',
          client_requirements: 'Initial project questionnaire, site information, and any inspiration images.',
          communication_notes: 'Kickoff meeting and follow-up summary outlining next steps.'
        },
        {
          phase_key: 'design',
          title: 'Concept & Schematic Design',
          description: 'We explore plan options, massing, and aesthetics that align with your priorities.',
          client_requirements: 'Review concept options and provide feedback on layout and style.',
          communication_notes: 'Regular design reviews with clear change tracking.'
        },
        {
          phase_key: 'documentation',
          title: 'Detailed Design & Documentation',
          description: 'We develop detailed drawings and specifications for pricing, permitting, and construction.',
          client_requirements: 'Decisions on finishes, fixtures, and key product selections.',
          communication_notes: 'Shared milestone schedule and coordination with consultants as needed.'
        },
        {
          phase_key: 'construction',
          title: 'Construction Support',
          description: 'We collaborate with your builder to answer questions and review key milestones.',
          client_requirements: 'Timely responses to field questions and change decisions.',
          communication_notes: 'Site visits as agreed and structured progress updates.'
        }
      ]
    };
  }

  getFaqEntries() {
    return [
      {
        question: 'How much does a custom home typically cost?',
        answer: 'Costs vary by site, size, and finish level. Our cost calculator provides a starting range, and we refine this during early design and builder pricing.',
        category: 'costs'
      },
      {
        question: 'How long does the design and permitting process take?',
        answer: 'Most custom homes require 4–8 months for design and permitting, depending on jurisdiction and project complexity.',
        category: 'timelines'
      },
      {
        question: 'How do you communicate during a project?',
        answer: 'We use regular check-ins, shared documents, and clear decision logs so you always know what is happening next.',
        category: 'communication'
      },
      {
        question: 'Can you work with my preferred builder?',
        answer: 'Yes. We frequently collaborate with client-selected builders and can also recommend partners suited to your project.',
        category: 'process'
      }
    ];
  }

  getPrivacyPolicyContent() {
    return {
      title: 'Privacy Policy',
      last_updated: '2024-01-01',
      sections: [
        {
          heading: 'Information We Collect',
          body_html: '<p>We collect contact information and project details that you choose to share with us through forms and consultations.</p>'
        },
        {
          heading: 'How We Use Your Information',
          body_html: '<p>We use your information to respond to inquiries, provide estimates, and improve our services. We do not sell your data.</p>'
        },
        {
          heading: 'Your Rights',
          body_html: '<p>You may request access to, correction of, or deletion of your personal information by contacting us.</p>'
        }
      ]
    };
  }

  getTermsOfServiceContent() {
    return {
      title: 'Terms of Service',
      last_updated: '2024-01-01',
      sections: [
        {
          heading: 'Use of This Website',
          body_html: '<p>This website is provided for informational purposes only and does not constitute professional advice or a binding offer.</p>'
        },
        {
          heading: 'Intellectual Property',
          body_html: '<p>All designs, images, and content are the intellectual property of their respective owners and may not be reused without permission.</p>'
        },
        {
          heading: 'Limitation of Liability',
          body_html: '<p>We are not liable for any damages arising from your use of this website or reliance on its content.</p>'
        }
      ]
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