/* localStorage polyfill for Node.js and environments without localStorage */
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
    this.idCounter = this._getNextIdCounter();

    // Enum label maps
    this.sectorLabels = {
      public_sector: 'Public Sector',
      private_sector_retail: 'Private Sector – Retail',
      private_sector_other: 'Private Sector – Other',
      manufacturing: 'Manufacturing',
      logistics_supply_chain: 'Logistics & Supply Chain',
      it_software: 'IT & Software',
      it_software_procurement: 'IT & Software Procurement',
      other: 'Other'
    };

    this.serviceCategoryLabels = {
      tender_management: 'Tender Management',
      advisory: 'Advisory',
      training: 'Training & Workshops',
      other: 'Other'
    };

    this.serviceSubcategoryLabels = {
      end_to_end_tender_management: 'End-to-end tender management',
      logistics_supply_chain: 'Logistics & Supply Chain',
      strategy: 'Strategy',
      category_management: 'Category Management',
      other: 'Other'
    };

    this.regionLabels = {
      global: 'Global',
      europe_eu: 'Europe (EU)',
      north_america: 'North America',
      asia_pacific: 'Asia Pacific',
      middle_east_africa: 'Middle East & Africa',
      latin_america: 'Latin America'
    };

    this.templateCategoryLabels = {
      it_software_procurement: 'IT & Software Procurement',
      general_procurement: 'General Procurement',
      construction: 'Construction',
      services: 'Services',
      other: 'Other'
    };

    this.templateStageLabels = {
      rfp: 'RFP',
      rfi: 'RFI',
      rfq: 'RFQ',
      evaluation: 'Evaluation',
      contracting: 'Contracting',
      other: 'Other'
    };

    this.trainingFormatLabels = {
      workshop: 'Workshop',
      course: 'Course',
      webinar: 'Webinar',
      coaching: 'Coaching'
    };

    this.locationTypeLabels = {
      online: 'Online',
      in_person: 'In person',
      hybrid: 'Hybrid'
    };

    this.consultationTypeLabels = {
      initial_consultation: 'Initial consultation',
      follow_up_consultation: 'Follow-up consultation',
      workshop_briefing: 'Workshop briefing'
    };

    this.workspaceViewLabels = {
      shortlist: 'Shortlist',
      project_brief: 'Project brief',
      reading_list: 'Reading list',
      saved_scenarios: 'Saved savings scenarios',
      saved_comparisons: 'Saved comparisons',
      saved_matrices: 'Saved matrices'
    };
  }

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    const keys = [
      'services',
      'shortlists',
      'shortlist_items',
      'project_briefs',
      'project_brief_items',
      'training_courses',
      'training_enquiries',
      'training_enquiry_items',
      'templates',
      'articles',
      'market_reports',
      'reading_list_items',
      'savings_scenarios',
      'vendor_matrices',
      'vendor_criteria',
      'case_studies',
      'case_study_comparisons',
      'case_study_comparison_items',
      'consultation_bookings',
      'subscriptions',
      'workspace_view_preferences',
      'market_report_requests'
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
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
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

  _now() {
    return new Date().toISOString();
  }

  _stringContains(haystack, needle) {
    if (!haystack || !needle) return false;
    return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
  }

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // -------------------------
  // Internal helpers specified in schema
  // -------------------------

  _getOrCreateShortlist() {
    let shortlists = this._getFromStorage('shortlists');
    let shortlist = shortlists.find((s) => s.is_default) || shortlists[0];
    if (!shortlist) {
      shortlist = {
        id: this._generateId('shortlist'),
        name: 'My shortlist',
        notes: '',
        is_default: true,
        created_at: this._now(),
        updated_at: this._now()
      };
      shortlists.push(shortlist);
      this._saveToStorage('shortlists', shortlists);
    }
    return shortlist;
  }

  _getOrCreateProjectBrief() {
    let briefs = this._getFromStorage('project_briefs');
    let brief = briefs.find((b) => b.status === 'draft');
    if (!brief) {
      brief = {
        id: this._generateId('projectbrief'),
        name: 'Draft project brief',
        description: '',
        status: 'draft',
        notes: '',
        created_at: this._now(),
        updated_at: this._now()
      };
      briefs.push(brief);
      this._saveToStorage('project_briefs', briefs);
    }
    return brief;
  }

  _getOrCreateTrainingEnquiry() {
    let enquiries = this._getFromStorage('training_enquiries');
    let enquiry = enquiries.find((e) => e.status === 'draft');
    if (!enquiry) {
      enquiry = {
        id: this._generateId('trainingenquiry'),
        status: 'draft',
        contact_name: '',
        company: '',
        email: '',
        phone: '',
        overall_notes: '',
        submitted_at: null,
        created_at: this._now(),
        updated_at: this._now()
      };
      enquiries.push(enquiry);
      this._saveToStorage('training_enquiries', enquiries);
    }
    return enquiry;
  }

  _calculateConsultingFeesAndSavings(annual_spend, expected_savings_rate, currency) {
    const rate = Number(expected_savings_rate) || 0;
    const spend = Number(annual_spend) || 0;
    const estimated_savings = spend * (rate / 100);

    const levels = [
      { level: 'lite', label: 'Lite', fee_factor: 0.1 },
      { level: 'standard', label: 'Standard', fee_factor: 0.15 },
      { level: 'advanced', label: 'Advanced', fee_factor: 0.2 }
    ];

    return levels.map((l) => {
      const consulting_fee = estimated_savings * l.fee_factor;
      const roi_percent = consulting_fee > 0 ? ((estimated_savings - consulting_fee) / consulting_fee) * 100 : 0;
      return {
        engagement_level: l.level,
        engagement_label: l.label,
        consulting_fee,
        estimated_savings,
        roi_percent,
        currency
      };
    });
  }

  _validateVendorMatrixWeights(criteria) {
    const total = (criteria || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
    const rounded = Math.round(total);
    const is_valid = rounded === 100;
    const message = is_valid
      ? 'Weights sum to 100.'
      : 'Total weight must sum to 100. Current total: ' + total;
    return { is_valid, total_weight: total, message };
  }

  _getOrCreateWorkspaceViewPreference() {
    let prefs = this._getFromStorage('workspace_view_preferences');
    let pref = prefs[0];
    if (!pref) {
      pref = {
        id: this._generateId('workspaceview'),
        current_view: 'shortlist',
        updated_at: this._now()
      };
      prefs.push(pref);
      this._saveToStorage('workspace_view_preferences', prefs);
    }
    return pref;
  }

  // -------------------------
  // Enum label helpers
  // -------------------------

  _getSectorLabel(value) {
    return this.sectorLabels[value] || value || '';
  }

  _getCategoryLabel(value) {
    return this.serviceCategoryLabels[value] || value || '';
  }

  _getSubcategoryLabel(value) {
    return this.serviceSubcategoryLabels[value] || value || '';
  }

  _getRegionLabel(value) {
    return this.regionLabels[value] || value || '';
  }

  _getTemplateCategoryLabel(value) {
    return this.templateCategoryLabels[value] || value || '';
  }

  _getTemplateStageLabel(value) {
    return this.templateStageLabels[value] || value || '';
  }

  // -------------------------
  // Home interfaces
  // -------------------------

  getHomeOverview() {
    const services = this._getFromStorage('services');
    const caseStudies = this._getFromStorage('case_studies');

    // Derive sectors actually used in data
    const sectorSet = new Set();
    services.forEach((s) => { if (s.sector) sectorSet.add(s.sector); });
    caseStudies.forEach((c) => { if (c.sector) sectorSet.add(c.sector); });

    const key_sectors = Array.from(sectorSet).map((key) => ({
      key,
      label: this._getSectorLabel(key),
      description: ''
    }));

    // Derive categories actually used
    const categorySet = new Set();
    services.forEach((s) => { if (s.category) categorySet.add(s.category); });
    const core_service_categories = Array.from(categorySet).map((key) => ({
      key,
      label: this._getCategoryLabel(key),
      description: ''
    }));

    const currentYear = new Date().getFullYear();
    const years_experience = caseStudies.length
      ? Math.max(1, currentYear - Math.min(...caseStudies.map((c) => c.completion_year || currentYear)) + 1)
      : 0;

    const projects_completed = caseStudies.length;

    const average_savings_rate = caseStudies.length
      ? caseStudies.reduce((s, c) => s + (Number(c.savings_rate) || 0), 0) / caseStudies.length
      : 0;

    return {
      headline: 'Technical tendering and procurement consultancy',
      subheadline: 'Helping you plan, source and deliver high-value procurement outcomes.',
      key_sectors,
      core_service_categories,
      key_stats: {
        years_experience,
        projects_completed,
        average_savings_rate
      }
    };
  }

  getHomeFeaturedContent() {
    const services = this._getFromStorage('services').filter((s) => s.is_featured);
    const training = this._getFromStorage('training_courses').filter((t) => t.is_featured);
    const templates = this._getFromStorage('templates').filter((t) => t.is_featured);
    const articles = this._getFromStorage('articles').filter((a) => a.is_featured);
    const caseStudies = this._getFromStorage('case_studies').filter((c) => c.is_featured);

    const featured_services = services.map((s) => ({
      id: s.id,
      name: s.name,
      summary: s.summary || '',
      sector: s.sector || null,
      sector_label: this._getSectorLabel(s.sector),
      category: s.category || null,
      category_label: this._getCategoryLabel(s.category),
      price_min: s.price_min || null,
      price_max: s.price_max || null,
      currency: s.currency || null,
      duration_weeks: s.duration_weeks || null
    }));

    const featured_training_courses = training.map((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary || '',
      next_start_date: t.next_start_date || null,
      price_per_participant: t.price_per_participant,
      currency: t.currency,
      rating: t.rating || null
    }));

    const featured_templates = templates.map((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary || '',
      category: t.category || null,
      category_label: this._getTemplateCategoryLabel(t.category),
      stage: t.stage || null,
      stage_label: this._getTemplateStageLabel(t.stage)
    }));

    const featured_articles = articles.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      publication_date: a.publication_date || null,
      topic_tags: a.topic_tags || []
    }));

    const featured_case_studies = caseStudies.map((c) => ({
      id: c.id,
      title: c.title,
      client_name: c.client_name || '',
      sector_label: this._getSectorLabel(c.sector),
      region_label: this._getRegionLabel(c.region),
      project_value: c.project_value,
      currency: c.currency,
      completion_year: c.completion_year,
      summary: c.summary || ''
    }));

    return {
      featured_services,
      featured_training_courses,
      featured_templates,
      featured_articles,
      featured_case_studies
    };
  }

  // -------------------------
  // Services / Shortlist / Project Brief
  // -------------------------

  getServiceFilterOptions() {
    const services = this._getFromStorage('services');

    const sectorSet = new Set();
    const categorySet = new Set();
    const subcategorySet = new Set();
    const regionSet = new Set();
    const durations = new Set();

    services.forEach((s) => {
      if (s.sector) sectorSet.add(s.sector);
      if (s.category) categorySet.add(s.category);
      if (s.subcategory) subcategorySet.add(s.subcategory);
      if (s.region) regionSet.add(s.region);
      if (s.duration_weeks) durations.add(s.duration_weeks);
    });

    const sectors = Array.from(sectorSet).map((value) => ({ value, label: this._getSectorLabel(value) }));
    const categories = Array.from(categorySet).map((value) => ({ value, label: this._getCategoryLabel(value) }));
    const subcategories = Array.from(subcategorySet).map((value) => ({
      value,
      label: this._getSubcategoryLabel(value),
      category_value: null
    }));
    const regions = Array.from(regionSet).map((value) => ({ value, label: this._getRegionLabel(value) }));

    const prices = services
      .map((s) => [s.price_min, s.price_max])
      .reduce(
        (acc, pair) => {
          const [min, max] = pair;
          if (typeof min === 'number') acc.mins.push(min);
          if (typeof max === 'number') acc.maxs.push(max);
          return acc;
        },
        { mins: [], maxs: [] }
      );

    let budget_ranges = [];
    if (prices.mins.length || prices.maxs.length) {
      const globalMin = prices.mins.length ? Math.min(...prices.mins) : 0;
      const globalMax = prices.maxs.length ? Math.max(...prices.maxs) : globalMin;
      budget_ranges.push({ min: globalMin, max: globalMax, label: '$' + globalMin + '–$' + globalMax });
    }

    const duration_weeks_options = Array.from(durations).sort((a, b) => a - b);

    return { sectors, categories, subcategories, regions, budget_ranges, duration_weeks_options };
  }

  searchServices(query, filters = {}, sort = {}, page = 1, page_size = 20) {
    let items = this._getFromStorage('services');

    if (query) {
      items = items.filter((s) => this._stringContains(s.name, query) || this._stringContains(s.summary, query));
    }

    if (filters) {
      if (filters.sector) {
        items = items.filter((s) => s.sector === filters.sector);
      }
      if (filters.category) {
        items = items.filter((s) => s.category === filters.category);
      }
      if (filters.subcategory) {
        items = items.filter((s) => s.subcategory === filters.subcategory);
      }
      if (filters.region) {
        items = items.filter((s) => s.region === filters.region);
      }
      if (typeof filters.price_min === 'number') {
        items = items.filter((s) => {
          const max = typeof s.price_max === 'number' ? s.price_max : (typeof s.price_min === 'number' ? s.price_min : 0);
          return max >= filters.price_min;
        });
      }
      if (typeof filters.price_max === 'number') {
        items = items.filter((s) => {
          const min = typeof s.price_min === 'number' ? s.price_min : (typeof s.price_max === 'number' ? s.price_max : 0);
          return min <= filters.price_max;
        });
      }
      if (typeof filters.duration_weeks_max === 'number') {
        items = items.filter((s) => {
          if (typeof s.duration_weeks !== 'number') return false;
          return s.duration_weeks <= filters.duration_weeks_max;
        });
      }
      if (typeof filters.is_featured === 'boolean') {
        items = items.filter((s) => !!s.is_featured === filters.is_featured);
      }
    }

    const sort_by = sort.sort_by || 'name';
    const sort_direction = sort.sort_direction === 'desc' ? 'desc' : 'asc';

    items.sort((a, b) => {
      let av;
      let bv;
      if (sort_by === 'price') {
        av = typeof a.price_min === 'number' ? a.price_min : (typeof a.price_max === 'number' ? a.price_max : 0);
        bv = typeof b.price_min === 'number' ? b.price_min : (typeof b.price_max === 'number' ? b.price_max : 0);
      } else if (sort_by === 'name') {
        av = a.name || '';
        bv = b.name || '';
      } else {
        av = a.name || '';
        bv = b.name || '';
      }
      if (av < bv) return sort_direction === 'asc' ? -1 : 1;
      if (av > bv) return sort_direction === 'asc' ? 1 : -1;
      return 0;
    });

    const total = items.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = items.slice(start, end);

    const shortlist = this._getOrCreateShortlist();
    const shortlistItems = this._getFromStorage('shortlist_items').filter((i) => i.shortlist_id === shortlist.id);
    const shortlistedServiceIds = new Set(shortlistItems.map((i) => i.service_id));

    const projectBrief = this._getOrCreateProjectBrief();
    const briefItems = this._getFromStorage('project_brief_items').filter((i) => i.project_brief_id === projectBrief.id && i.item_type === 'service');
    const briefServiceIds = new Set(briefItems.map((i) => i.item_id));

    const mappedItems = paged.map((s) => ({
      id: s.id,
      name: s.name,
      summary: s.summary || '',
      sector: s.sector || null,
      sector_label: this._getSectorLabel(s.sector),
      category: s.category || null,
      category_label: this._getCategoryLabel(s.category),
      subcategory: s.subcategory || null,
      subcategory_label: this._getSubcategoryLabel(s.subcategory),
      region: s.region || null,
      region_label: this._getRegionLabel(s.region),
      price_min: s.price_min || null,
      price_max: s.price_max || null,
      currency: s.currency || null,
      duration_weeks: s.duration_weeks || null,
      duration_description: s.duration_description || '',
      is_featured: !!s.is_featured,
      is_in_shortlist: shortlistedServiceIds.has(s.id),
      is_in_project_brief: briefServiceIds.has(s.id)
    }));

    return { total, page, page_size, items: mappedItems };
  }

  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services');
    const s = services.find((x) => x.id === serviceId);
    if (!s) return null;

    const shortlist = this._getOrCreateShortlist();
    const shortlistItems = this._getFromStorage('shortlist_items').filter((i) => i.shortlist_id === shortlist.id);
    const shortlistedServiceIds = new Set(shortlistItems.map((i) => i.service_id));

    const projectBrief = this._getOrCreateProjectBrief();
    const briefItems = this._getFromStorage('project_brief_items').filter((i) => i.project_brief_id === projectBrief.id && i.item_type === 'service');
    const briefServiceIds = new Set(briefItems.map((i) => i.item_id));

    return {
      id: s.id,
      name: s.name,
      summary: s.summary || '',
      description: s.description || '',
      sector: s.sector || null,
      sector_label: this._getSectorLabel(s.sector),
      category: s.category || null,
      category_label: this._getCategoryLabel(s.category),
      subcategory: s.subcategory || null,
      subcategory_label: this._getSubcategoryLabel(s.subcategory),
      region: s.region || null,
      region_label: this._getRegionLabel(s.region),
      price_min: s.price_min || null,
      price_max: s.price_max || null,
      currency: s.currency || null,
      duration_weeks: s.duration_weeks || null,
      duration_description: s.duration_description || '',
      scope: s.scope || '',
      deliverables: s.deliverables || '',
      timeline: s.timeline || '',
      tags: s.tags || [],
      is_in_shortlist: shortlistedServiceIds.has(s.id),
      is_in_project_brief: briefServiceIds.has(s.id)
    };
  }

  getShortlist() {
    const shortlist = this._getOrCreateShortlist();
    const shortlistItems = this._getFromStorage('shortlist_items').filter((i) => i.shortlist_id === shortlist.id);
    const services = this._getFromStorage('services');

    const items = shortlistItems.map((item) => {
      const service = services.find((s) => s.id === item.service_id) || null;
      return {
        shortlist_item_id: item.id,
        service_id: item.service_id,
        service_name: service ? service.name : '',
        sector_label: service ? this._getSectorLabel(service.sector) : '',
        category_label: service ? this._getCategoryLabel(service.category) : '',
        price_min: service ? service.price_min || null : null,
        price_max: service ? service.price_max || null : null,
        currency: service ? service.currency || null : null,
        duration_weeks: service ? service.duration_weeks || null : null,
        region_label: service ? this._getRegionLabel(service.region) : '',
        added_at: item.added_at || null,
        // Foreign key resolution
        service
      };
    });

    return {
      shortlist_id: shortlist.id,
      name: shortlist.name,
      is_default: !!shortlist.is_default,
      items
    };
  }

  addServiceToShortlist(serviceId) {
    const services = this._getFromStorage('services');
    const service = services.find((s) => s.id === serviceId);
    if (!service) {
      return { success: false, shortlist_item_id: null, total_items: 0, message: 'Service not found.' };
    }

    const shortlist = this._getOrCreateShortlist();
    let shortlistItems = this._getFromStorage('shortlist_items');

    const existing = shortlistItems.find((i) => i.shortlist_id === shortlist.id && i.service_id === serviceId);
    if (existing) {
      const total = shortlistItems.filter((i) => i.shortlist_id === shortlist.id).length;
      return {
        success: true,
        shortlist_item_id: existing.id,
        total_items: total,
        message: 'Service already in shortlist.'
      };
    }

    const newItem = {
      id: this._generateId('shortlistitem'),
      shortlist_id: shortlist.id,
      service_id: serviceId,
      added_at: this._now(),
      position: shortlistItems.filter((i) => i.shortlist_id === shortlist.id).length + 1
    };

    shortlistItems.push(newItem);
    this._saveToStorage('shortlist_items', shortlistItems);

    const total_items = shortlistItems.filter((i) => i.shortlist_id === shortlist.id).length;

    return {
      success: true,
      shortlist_item_id: newItem.id,
      total_items,
      message: 'Service added to shortlist.'
    };
  }

  removeServiceFromShortlist(shortlistItemId) {
    let shortlistItems = this._getFromStorage('shortlist_items');
    const before = shortlistItems.length;
    shortlistItems = shortlistItems.filter((i) => i.id !== shortlistItemId);
    this._saveToStorage('shortlist_items', shortlistItems);
    const total_items = shortlistItems.length;

    return {
      success: before !== total_items,
      total_items,
      message: before !== total_items ? 'Item removed from shortlist.' : 'Item not found.'
    };
  }

  getCurrentProjectBrief() {
    const brief = this._getOrCreateProjectBrief();
    const itemsRaw = this._getFromStorage('project_brief_items').filter((i) => i.project_brief_id === brief.id);
    const services = this._getFromStorage('services');
    const reports = this._getFromStorage('market_reports');

    const items = itemsRaw.map((item) => {
      let source = null;
      let title = '';
      let sector_label = '';
      let region_label = '';
      let price = null;
      let currency = null;
      let source_type_label = '';

      if (item.item_type === 'service') {
        source = services.find((s) => s.id === item.item_id) || null;
        if (source) {
          title = source.name;
          sector_label = this._getSectorLabel(source.sector);
          region_label = this._getRegionLabel(source.region);
          price = source.price_min || source.price_max || null;
          currency = source.currency || null;
          source_type_label = 'Advisory service';
        }
      } else if (item.item_type === 'market_report') {
        source = reports.find((r) => r.id === item.item_id) || null;
        if (source) {
          title = source.title;
          sector_label = '';
          region_label = this._getRegionLabel(source.region);
          price = source.price;
          currency = source.currency;
          source_type_label = 'Market report';
        }
      }

      return {
        project_brief_item_id: item.id,
        item_type: item.item_type,
        item_id: item.item_id,
        title,
        source_type_label,
        sector_label,
        region_label,
        price,
        currency,
        notes: item.notes || '',
        position: item.position || null,
        added_at: item.added_at || null,
        // Foreign key resolution
        service: item.item_type === 'service' ? source : null,
        market_report: item.item_type === 'market_report' ? source : null
      };
    });

    return {
      project_brief_id: brief.id,
      name: brief.name,
      status: brief.status,
      description: brief.description || '',
      notes: brief.notes || '',
      items
    };
  }

  addItemToProjectBrief(itemType, itemId) {
    const allowed = ['service', 'market_report'];
    if (!allowed.includes(itemType)) {
      return { success: false, project_brief_id: null, project_brief_item_id: null, total_items: 0, message: 'Invalid item type.' };
    }

    const brief = this._getOrCreateProjectBrief();
    let items = this._getFromStorage('project_brief_items');

    const existing = items.find((i) => i.project_brief_id === brief.id && i.item_type === itemType && i.item_id === itemId);
    if (existing) {
      const total = items.filter((i) => i.project_brief_id === brief.id).length;
      return {
        success: true,
        project_brief_id: brief.id,
        project_brief_item_id: existing.id,
        total_items: total,
        message: 'Item already in project brief.'
      };
    }

    const newItem = {
      id: this._generateId('projectbriefitem'),
      project_brief_id: brief.id,
      item_type: itemType,
      item_id: itemId,
      notes: '',
      position: items.filter((i) => i.project_brief_id === brief.id).length + 1,
      added_at: this._now()
    };

    items.push(newItem);
    this._saveToStorage('project_brief_items', items);

    const total_items = items.filter((i) => i.project_brief_id === brief.id).length;

    return {
      success: true,
      project_brief_id: brief.id,
      project_brief_item_id: newItem.id,
      total_items,
      message: 'Item added to project brief.'
    };
  }

  removeProjectBriefItem(projectBriefItemId) {
    let items = this._getFromStorage('project_brief_items');
    const before = items.length;
    items = items.filter((i) => i.id !== projectBriefItemId);
    this._saveToStorage('project_brief_items', items);
    const total_items = items.length;

    return {
      success: before !== total_items,
      total_items,
      message: before !== total_items ? 'Item removed from project brief.' : 'Item not found.'
    };
  }

  updateProjectBriefItemNotes(projectBriefItemId, notes) {
    let items = this._getFromStorage('project_brief_items');
    const index = items.findIndex((i) => i.id === projectBriefItemId);
    if (index === -1) {
      return { success: false, message: 'Item not found.' };
    }
    items[index].notes = notes || '';
    this._saveToStorage('project_brief_items', items);
    return { success: true, message: 'Notes updated.' };
  }

  reorderProjectBriefItems(orderedItemIds) {
    let items = this._getFromStorage('project_brief_items');
    const idToItem = new Map(items.map((i) => [i.id, i]));
    const newItems = [];
    orderedItemIds.forEach((id, idx) => {
      const item = idToItem.get(id);
      if (item) {
        item.position = idx + 1;
        newItems.push(item);
      }
    });
    // Keep any items not mentioned at the end
    items
      .filter((i) => !orderedItemIds.includes(i.id))
      .forEach((i) => {
        i.position = newItems.length + 1;
        newItems.push(i);
      });

    this._saveToStorage('project_brief_items', newItems);
    return { success: true, message: 'Items reordered.' };
  }

  saveCurrentProjectBrief(name, description, notes) {
    let briefs = this._getFromStorage('project_briefs');
    const brief = this._getOrCreateProjectBrief();
    const index = briefs.findIndex((b) => b.id === brief.id);
    if (index === -1) {
      briefs.push(brief);
    }

    brief.name = name || brief.name;
    brief.description = description || brief.description || '';
    brief.notes = notes || brief.notes || '';
    brief.status = 'saved';
    brief.updated_at = this._now();

    briefs = briefs.map((b) => (b.id === brief.id ? brief : b));
    this._saveToStorage('project_briefs', briefs);

    return {
      success: true,
      project_brief_id: brief.id,
      status: brief.status,
      message: 'Project brief saved.'
    };
  }

  // -------------------------
  // Training & Workshops
  // -------------------------

  getTrainingFilterOptions() {
    const courses = this._getFromStorage('training_courses');

    const prices = courses.map((c) => c.price_per_participant).filter((p) => typeof p === 'number');
    const price_ranges = [];
    if (prices.length) {
      const max = Math.max(...prices);
      price_ranges.push({ max, label: 'Up to $' + max });
    }

    const rating_options = [
      { min_rating: 3, label: '3 stars & up' },
      { min_rating: 4, label: '4 stars & up' },
      { min_rating: 4.5, label: '4.5 stars & up' }
    ];

    const date_presets = ['soonest', 'this_quarter', 'next_quarter'];

    const formatsSet = new Set();
    const locationTypesSet = new Set();
    const sectorSet = new Set();

    courses.forEach((c) => {
      if (c.format) formatsSet.add(c.format);
      if (c.location_type) locationTypesSet.add(c.location_type);
      if (c.sector) sectorSet.add(c.sector);
    });

    const formats = Array.from(formatsSet).map((value) => ({ value, label: this.trainingFormatLabels[value] || value }));
    const location_types = Array.from(locationTypesSet).map((value) => ({ value, label: this.locationTypeLabels[value] || value }));
    const sectors = Array.from(sectorSet).map((value) => ({ value, label: this._getSectorLabel(value) }));

    return { price_ranges, rating_options, date_presets, formats, location_types, sectors };
  }

  searchTrainingCourses(query, filters = {}, sort = {}, page = 1, page_size = 20) {
    let items = this._getFromStorage('training_courses');

    if (query) {
      items = items.filter((c) => this._stringContains(c.title, query) || this._stringContains(c.summary, query));
    }

    if (filters) {
      if (typeof filters.max_price_per_participant === 'number') {
        items = items.filter((c) => c.price_per_participant <= filters.max_price_per_participant);
      }
      if (typeof filters.min_rating === 'number') {
        items = items.filter((c) => (c.rating || 0) >= filters.min_rating);
      }
      if (filters.earliest_start_date) {
        const minDate = new Date(filters.earliest_start_date);
        items = items.filter((c) => {
          if (!c.next_start_date) return false;
          return new Date(c.next_start_date) >= minDate;
        });
      }
      if (filters.latest_start_date) {
        const maxDate = new Date(filters.latest_start_date);
        items = items.filter((c) => {
          if (!c.next_start_date) return false;
          return new Date(c.next_start_date) <= maxDate;
        });
      }
      if (filters.format) {
        items = items.filter((c) => c.format === filters.format);
      }
      if (filters.location_type) {
        items = items.filter((c) => c.location_type === filters.location_type);
      }
      if (filters.sector) {
        items = items.filter((c) => c.sector === filters.sector);
      }
      if (filters.keyword) {
        items = items.filter((c) => this._stringContains(c.keyword, filters.keyword));
      }
    }

    const sort_by = sort.sort_by || 'soonest';
    const sort_direction = sort.sort_direction === 'desc' ? 'desc' : 'asc';

    items.sort((a, b) => {
      let av;
      let bv;
      if (sort_by === 'soonest') {
        av = a.next_start_date ? new Date(a.next_start_date).getTime() : Infinity;
        bv = b.next_start_date ? new Date(b.next_start_date).getTime() : Infinity;
      } else if (sort_by === 'price') {
        av = a.price_per_participant || 0;
        bv = b.price_per_participant || 0;
      } else if (sort_by === 'rating') {
        av = a.rating || 0;
        bv = b.rating || 0;
      } else {
        av = a.title || '';
        bv = b.title || '';
      }
      if (av < bv) return sort_direction === 'asc' ? -1 : 1;
      if (av > bv) return sort_direction === 'asc' ? 1 : -1;
      return 0;
    });

    const total = items.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = items.slice(start, end);

    const mappedItems = paged.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary || '',
      price_per_participant: c.price_per_participant,
      currency: c.currency,
      rating: c.rating || null,
      rating_count: c.rating_count || 0,
      next_start_date: c.next_start_date || null,
      location_type: c.location_type || null,
      location: c.location || '',
      format: c.format || null,
      topics: c.topics || []
    }));

    return { total, page, page_size, items: mappedItems };
  }

  getTrainingCourseDetail(trainingCourseId) {
    const courses = this._getFromStorage('training_courses');
    const c = courses.find((x) => x.id === trainingCourseId);
    if (!c) return null;

    const enquiry = this._getOrCreateTrainingEnquiry();
    const enquiryItems = this._getFromStorage('training_enquiry_items').filter((i) => i.training_enquiry_id === enquiry.id);
    const inEnquiry = enquiryItems.some((i) => i.training_course_id === trainingCourseId);

    return {
      id: c.id,
      title: c.title,
      summary: c.summary || '',
      description: c.description || '',
      agenda: c.agenda || '',
      learning_outcomes: c.learning_outcomes || [],
      trainer_profile: c.trainer_profile || '',
      target_audience: c.target_audience || '',
      price_per_participant: c.price_per_participant,
      currency: c.currency,
      rating: c.rating || null,
      rating_count: c.rating_count || 0,
      upcoming_sessions: c.upcoming_sessions || [],
      duration_days: c.duration_days || null,
      duration_description: c.duration_description || '',
      format: c.format || null,
      topics: c.topics || [],
      is_in_enquiry: inEnquiry
    };
  }

  addCourseToTrainingEnquiry(trainingCourseId) {
    const courses = this._getFromStorage('training_courses');
    const course = courses.find((c) => c.id === trainingCourseId);
    if (!course) {
      return { success: false, training_enquiry_id: null, training_enquiry_item_id: null, total_courses: 0, message: 'Course not found.' };
    }

    const enquiry = this._getOrCreateTrainingEnquiry();
    let items = this._getFromStorage('training_enquiry_items');

    const existing = items.find((i) => i.training_enquiry_id === enquiry.id && i.training_course_id === trainingCourseId);
    if (existing) {
      const total = items.filter((i) => i.training_enquiry_id === enquiry.id).length;
      return {
        success: true,
        training_enquiry_id: enquiry.id,
        training_enquiry_item_id: existing.id,
        total_courses: total,
        message: 'Course already in enquiry.'
      };
    }

    const newItem = {
      id: this._generateId('trainingenquiryitem'),
      training_enquiry_id: enquiry.id,
      training_course_id: trainingCourseId,
      participant_count: null,
      preferred_start_date: null,
      notes: '',
      added_at: this._now(),
      position: items.filter((i) => i.training_enquiry_id === enquiry.id).length + 1
    };

    items.push(newItem);
    this._saveToStorage('training_enquiry_items', items);

    const total_courses = items.filter((i) => i.training_enquiry_id === enquiry.id).length;

    return {
      success: true,
      training_enquiry_id: enquiry.id,
      training_enquiry_item_id: newItem.id,
      total_courses,
      message: 'Course added to training enquiry.'
    };
  }

  getCurrentTrainingEnquiry() {
    const enquiry = this._getOrCreateTrainingEnquiry();
    const itemsRaw = this._getFromStorage('training_enquiry_items').filter((i) => i.training_enquiry_id === enquiry.id);
    const courses = this._getFromStorage('training_courses');

    const items = itemsRaw.map((item) => {
      const course = courses.find((c) => c.id === item.training_course_id) || null;
      return {
        training_enquiry_item_id: item.id,
        training_course_id: item.training_course_id,
        title: course ? course.title : '',
        next_start_date: course ? course.next_start_date || null : null,
        price_per_participant: course ? course.price_per_participant : null,
        currency: course ? course.currency : null,
        participant_count: item.participant_count || null,
        preferred_start_date: item.preferred_start_date || null,
        notes: item.notes || '',
        position: item.position || null,
        // Foreign key resolution
        training_course: course
      };
    });

    const can_submit = items.length > 0 && !!enquiry.email;

    return {
      training_enquiry_id: enquiry.id,
      status: enquiry.status,
      items,
      contact: {
        contact_name: enquiry.contact_name || '',
        company: enquiry.company || '',
        email: enquiry.email || '',
        phone: enquiry.phone || ''
      },
      overall_notes: enquiry.overall_notes || '',
      can_submit
    };
  }

  updateTrainingEnquiryItem(trainingEnquiryItemId, updates) {
    let items = this._getFromStorage('training_enquiry_items');
    const index = items.findIndex((i) => i.id === trainingEnquiryItemId);
    if (index === -1) {
      return { success: false, message: 'Item not found.' };
    }
    const item = items[index];
    if (Object.prototype.hasOwnProperty.call(updates, 'participant_count')) {
      item.participant_count = updates.participant_count;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'preferred_start_date')) {
      item.preferred_start_date = updates.preferred_start_date;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'notes')) {
      item.notes = updates.notes || '';
    }
    items[index] = item;
    this._saveToStorage('training_enquiry_items', items);
    return { success: true, message: 'Training enquiry item updated.' };
  }

  removeTrainingEnquiryItem(trainingEnquiryItemId) {
    let items = this._getFromStorage('training_enquiry_items');
    const before = items.length;
    items = items.filter((i) => i.id !== trainingEnquiryItemId);
    this._saveToStorage('training_enquiry_items', items);
    const total_courses = items.length;
    return {
      success: before !== total_courses,
      total_courses,
      message: before !== total_courses ? 'Item removed from training enquiry.' : 'Item not found.'
    };
  }

  submitTrainingEnquiry(contact_name, company, email, phone, overall_notes) {
    let enquiries = this._getFromStorage('training_enquiries');
    const enquiry = this._getOrCreateTrainingEnquiry();
    const index = enquiries.findIndex((e) => e.id === enquiry.id);

    const items = this._getFromStorage('training_enquiry_items').filter((i) => i.training_enquiry_id === enquiry.id);
    if (!items.length) {
      return { success: false, training_enquiry_id: enquiry.id, status: enquiry.status, submitted_at: null, message: 'Cannot submit an empty enquiry.' };
    }

    enquiry.contact_name = contact_name;
    enquiry.company = company || '';
    enquiry.email = email;
    enquiry.phone = phone || '';
    enquiry.overall_notes = overall_notes || '';
    enquiry.status = 'submitted';
    enquiry.submitted_at = this._now();
    enquiry.updated_at = this._now();

    if (index === -1) {
      enquiries.push(enquiry);
    } else {
      enquiries[index] = enquiry;
    }

    this._saveToStorage('training_enquiries', enquiries);

    return {
      success: true,
      training_enquiry_id: enquiry.id,
      status: enquiry.status,
      submitted_at: enquiry.submitted_at,
      message: 'Training enquiry submitted.'
    };
  }

  // -------------------------
  // Templates & Resources
  // -------------------------

  getTemplateFilterOptions() {
    const templates = this._getFromStorage('templates');

    const categorySet = new Set();
    const stageSet = new Set();
    const fileFormatSet = new Set();
    const mins = [];
    const maxs = [];

    templates.forEach((t) => {
      if (t.category) categorySet.add(t.category);
      if (t.stage) stageSet.add(t.stage);
      if (t.file_format) fileFormatSet.add(t.file_format);
      if (typeof t.contract_value_min === 'number') mins.push(t.contract_value_min);
      if (typeof t.contract_value_max === 'number') maxs.push(t.contract_value_max);
    });

    const categories = Array.from(categorySet).map((value) => ({ value, label: this._getTemplateCategoryLabel(value) }));
    const stages = Array.from(stageSet).map((value) => ({ value, label: this._getTemplateStageLabel(value) }));

    const contract_value_bands = [];
    if (mins.length || maxs.length) {
      const min = mins.length ? Math.min(...mins) : 0;
      const max = maxs.length ? Math.max(...maxs) : min;
      contract_value_bands.push({ min, max, label: '$' + min + '–$' + max });
    }

    const file_formats = Array.from(fileFormatSet).map((value) => ({ value, label: value.toUpperCase() }));

    return { categories, stages, contract_value_bands, file_formats };
  }

  searchTemplates(query, filters = {}, sort_by = 'recent', page = 1, page_size = 20) {
    let items = this._getFromStorage('templates');

    if (query) {
      items = items.filter((t) => this._stringContains(t.title, query) || this._stringContains(t.summary, query));
    }

    if (filters) {
      if (filters.category) {
        items = items.filter((t) => t.category === filters.category);
      }
      if (filters.stage) {
        items = items.filter((t) => t.stage === filters.stage);
      }
      if (typeof filters.contract_value_min === 'number') {
        items = items.filter((t) => {
          const max = typeof t.contract_value_max === 'number' ? t.contract_value_max : (typeof t.contract_value_min === 'number' ? t.contract_value_min : 0);
          return max >= filters.contract_value_min;
        });
      }
      if (typeof filters.contract_value_max === 'number') {
        items = items.filter((t) => {
          const min = typeof t.contract_value_min === 'number' ? t.contract_value_min : (typeof t.contract_value_max === 'number' ? t.contract_value_max : 0);
          return min <= filters.contract_value_max;
        });
      }
      if (filters.file_format) {
        items = items.filter((t) => t.file_format === filters.file_format);
      }
    }

    items.sort((a, b) => {
      if (sort_by === 'recent') {
        const av = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bv = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bv - av;
      }
      if (sort_by === 'title') {
        const av = a.title || '';
        const bv = b.title || '';
        if (av < bv) return -1;
        if (av > bv) return 1;
        return 0;
      }
      return 0;
    });

    const total = items.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = items.slice(start, end);

    const mappedItems = paged.map((t) => ({
      id: t.id,
      title: t.title,
      summary: t.summary || '',
      category: t.category || null,
      category_label: this._getTemplateCategoryLabel(t.category),
      stage: t.stage || null,
      stage_label: this._getTemplateStageLabel(t.stage),
      contract_value_min: t.contract_value_min || null,
      contract_value_max: t.contract_value_max || null,
      contract_value_band_label: t.contract_value_band_label || '',
      file_format: t.file_format || null,
      is_free: !!t.is_free
    }));

    return { total, page, page_size, items: mappedItems };
  }

  getTemplateDetail(templateId) {
    const templates = this._getFromStorage('templates');
    const t = templates.find((x) => x.id === templateId);
    if (!t) return null;

    const articles = this._getFromStorage('articles');
    const recommended_articles = (t.recommended_article_ids || []).map((id) => {
      const a = articles.find((art) => art.id === id);
      if (!a) return null;
      return {
        article_id: a.id,
        title: a.title,
        summary: a.summary || '',
        publication_date: a.publication_date || null
      };
    }).filter(Boolean);

    return {
      id: t.id,
      title: t.title,
      summary: t.summary || '',
      description: t.description || '',
      category: t.category || null,
      category_label: this._getTemplateCategoryLabel(t.category),
      stage: t.stage || null,
      stage_label: this._getTemplateStageLabel(t.stage),
      contract_value_min: t.contract_value_min || null,
      contract_value_max: t.contract_value_max || null,
      contract_value_band_label: t.contract_value_band_label || '',
      file_format: t.file_format || null,
      file_url: t.file_url || null,
      is_free: !!t.is_free,
      recommended_articles
    };
  }

  initiateTemplateDownload(templateId) {
    const templates = this._getFromStorage('templates');
    const t = templates.find((x) => x.id === templateId);
    if (!t || !t.file_url) {
      return { success: false, file_url: null, file_format: null, message: 'Template or file URL not found.' };
    }
    const result = {
      success: true,
      file_url: t.file_url,
      file_format: t.file_format || null,
      message: 'Download initiated.'
    };

    // Instrumentation for task completion tracking
    try {
      if (result && result.success) {
        localStorage.setItem('task3_downloadedTemplateId', templateId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // -------------------------
  // Insights, Articles, Market Reports, Reading List, Subscription
  // -------------------------

  getInsightsFilterOptions() {
    const articles = this._getFromStorage('articles');
    const reports = this._getFromStorage('market_reports');

    const topicSet = new Set();
    articles.forEach((a) => {
      (a.topic_tags || []).forEach((tag) => topicSet.add(tag));
    });

    const article_topics = Array.from(topicSet).map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase())
    }));

    const regionSet = new Set();
    const countrySet = new Set();
    const prices = [];

    reports.forEach((r) => {
      if (r.region) regionSet.add(r.region);
      if (r.country) countrySet.add(r.country);
      if (typeof r.price === 'number') prices.push(r.price);
    });

    const market_report_regions = Array.from(regionSet).map((value) => ({ value, label: this._getRegionLabel(value) }));
    const countries = Array.from(countrySet);

    const market_report_price_ranges = [];
    if (prices.length) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      market_report_price_ranges.push({ min, max, label: '$' + min + '–$' + max });
    }

    return { article_topics, market_report_regions, countries, market_report_price_ranges };
  }

  searchArticles(query, filters = {}, sort_by = 'recent', page = 1, page_size = 20) {
    let items = this._getFromStorage('articles');

    if (query) {
      items = items.filter((a) => this._stringContains(a.title, query) || this._stringContains(a.summary, query));
    }

    if (filters) {
      if (filters.topic_tags && filters.topic_tags.length) {
        items = items.filter((a) => {
          const tags = a.topic_tags || [];
          return filters.topic_tags.some((t) => tags.includes(t));
        });
      }
      if (filters.min_publication_date) {
        const minDate = new Date(filters.min_publication_date);
        items = items.filter((a) => {
          if (!a.publication_date) return false;
          return new Date(a.publication_date) >= minDate;
        });
      }
      if (filters.max_publication_date) {
        const maxDate = new Date(filters.max_publication_date);
        items = items.filter((a) => {
          if (!a.publication_date) return false;
          return new Date(a.publication_date) <= maxDate;
        });
      }
    }

    items.sort((a, b) => {
      if (sort_by === 'recent') {
        const av = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const bv = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return bv - av;
      }
      if (sort_by === 'title') {
        const av = a.title || '';
        const bv = b.title || '';
        if (av < bv) return -1;
        if (av > bv) return 1;
        return 0;
      }
      return 0;
    });

    const total = items.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = items.slice(start, end);

    const mappedItems = paged.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      publication_date: a.publication_date || null,
      author: a.author || '',
      topic_tags: a.topic_tags || [],
      reading_time_minutes: a.reading_time_minutes || null,
      is_featured: !!a.is_featured
    }));

    return { total, page, page_size, items: mappedItems };
  }

  searchMarketReports(query, filters = {}, sort_by = 'recent', page = 1, page_size = 20) {
    let items = this._getFromStorage('market_reports');

    if (query) {
      items = items.filter((r) => this._stringContains(r.title, query) || this._stringContains(r.summary, query));
    }

    if (filters) {
      if (filters.region) {
        items = items.filter((r) => r.region === filters.region);
      }
      if (filters.country) {
        items = items.filter((r) => r.country === filters.country);
      }
      if (typeof filters.min_price === 'number') {
        items = items.filter((r) => r.price >= filters.min_price);
      }
      if (typeof filters.max_price === 'number') {
        items = items.filter((r) => r.price <= filters.max_price);
      }
      if (filters.sectors && filters.sectors.length) {
        items = items.filter((r) => {
          const sctors = r.sectors || [];
          return filters.sectors.some((s) => sctors.includes(s));
        });
      }
    }

    items.sort((a, b) => {
      if (sort_by === 'price') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sort_by === 'recent') {
        const av = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const bv = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return bv - av;
      }
      return 0;
    });

    const total = items.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = items.slice(start, end);

    const mappedItems = paged.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary || '',
      region: r.region || null,
      region_label: this._getRegionLabel(r.region),
      country: r.country || '',
      price: r.price,
      currency: r.currency,
      publication_date: r.publication_date || null,
      sectors: r.sectors || []
    }));

    return { total, page, page_size, items: mappedItems };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const a = articles.find((x) => x.id === articleId);
    if (!a) return null;

    const readingItems = this._getFromStorage('reading_list_items');
    const is_in_reading_list = readingItems.some((i) => i.item_type === 'article' && i.item_id === articleId);

    return {
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      content: a.content || '',
      author: a.author || '',
      publication_date: a.publication_date || null,
      topic_tags: a.topic_tags || [],
      reading_time_minutes: a.reading_time_minutes || null,
      is_featured: !!a.is_featured,
      is_in_reading_list
    };
  }

  createSubscriptionFromArticle(articleId, email, name, company, topics) {
    const allowedTopics = ['tender_strategy', 'e_procurement', 'training_updates'];
    const cleanedTopics = (topics || []).filter((t) => allowedTopics.includes(t));

    if (!email || !cleanedTopics.length) {
      return { success: false, subscription_id: null, confirm_status: 'pending', message: 'Email and at least one valid topic are required.' };
    }

    let subs = this._getFromStorage('subscriptions');
    const subscription = {
      id: this._generateId('subscription'),
      email,
      name: name || '',
      company: company || '',
      source: 'article_form',
      topics: cleanedTopics,
      confirm_status: 'pending',
      created_at: this._now(),
      article_id: articleId
    };

    subs.push(subscription);
    this._saveToStorage('subscriptions', subs);

    return {
      success: true,
      subscription_id: subscription.id,
      confirm_status: subscription.confirm_status,
      message: 'Subscription created.'
    };
  }

  addItemToReadingList(itemType, itemId) {
    const allowed = ['article', 'template', 'market_report', 'case_study'];
    if (!allowed.includes(itemType)) {
      return { success: false, reading_list_item_id: null, total_items: 0, message: 'Invalid item type.' };
    }

    let items = this._getFromStorage('reading_list_items');

    const existing = items.find((i) => i.item_type === itemType && i.item_id === itemId);
    if (existing) {
      return {
        success: true,
        reading_list_item_id: existing.id,
        total_items: items.length,
        message: 'Item already in reading list.'
      };
    }

    const newItem = {
      id: this._generateId('readinglistitem'),
      item_type: itemType,
      item_id: itemId,
      saved_at: this._now(),
      notes: '',
      is_read: false
    };

    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      reading_list_item_id: newItem.id,
      total_items: items.length,
      message: 'Item added to reading list.'
    };
  }

  getReadingListItems() {
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');
    const templates = this._getFromStorage('templates');
    const reports = this._getFromStorage('market_reports');
    const caseStudies = this._getFromStorage('case_studies');

    const mapped = items.map((i) => {
      let obj = null;
      if (i.item_type === 'article') {
        obj = articles.find((a) => a.id === i.item_id) || null;
      } else if (i.item_type === 'template') {
        obj = templates.find((t) => t.id === i.item_id) || null;
      } else if (i.item_type === 'market_report') {
        obj = reports.find((r) => r.id === i.item_id) || null;
      } else if (i.item_type === 'case_study') {
        obj = caseStudies.find((c) => c.id === i.item_id) || null;
      }

      return {
        reading_list_item_id: i.id,
        item_type: i.item_type,
        item_id: i.item_id,
        title: obj ? (obj.title || obj.name || '') : '',
        summary: obj ? (obj.summary || '') : '',
        saved_at: i.saved_at || null,
        is_read: !!i.is_read,
        // Foreign key resolution
        article: i.item_type === 'article' ? obj : null,
        template: i.item_type === 'template' ? obj : null,
        market_report: i.item_type === 'market_report' ? obj : null,
        case_study: i.item_type === 'case_study' ? obj : null
      };
    });

    return { items: mapped };
  }

  removeReadingListItem(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter((i) => i.id !== readingListItemId);
    this._saveToStorage('reading_list_items', items);
    return {
      success: before !== items.length,
      total_items: items.length,
      message: before !== items.length ? 'Item removed from reading list.' : 'Item not found.'
    };
  }

  markReadingListItemRead(readingListItemId, is_read) {
    let items = this._getFromStorage('reading_list_items');
    const index = items.findIndex((i) => i.id === readingListItemId);
    if (index === -1) {
      return { success: false };
    }
    items[index].is_read = !!is_read;
    this._saveToStorage('reading_list_items', items);
    return { success: true };
  }

  getMarketReportDetail(marketReportId) {
    const reports = this._getFromStorage('market_reports');
    const r = reports.find((x) => x.id === marketReportId);
    if (!r) return null;

    const brief = this._getOrCreateProjectBrief();
    const briefItems = this._getFromStorage('project_brief_items').filter((i) => i.project_brief_id === brief.id && i.item_type === 'market_report');
    const inBrief = briefItems.some((i) => i.item_id === marketReportId);

    return {
      id: r.id,
      title: r.title,
      summary: r.summary || '',
      content: r.content || '',
      region: r.region || null,
      region_label: this._getRegionLabel(r.region),
      country: r.country || '',
      price: r.price,
      currency: r.currency,
      publication_date: r.publication_date || null,
      sectors: r.sectors || [],
      table_of_contents: r.table_of_contents || [],
      is_in_project_brief: inBrief
    };
  }

  requestMarketReportAccess(marketReportId, contact_name, email, company, notes) {
    const reports = this._getFromStorage('market_reports');
    const report = reports.find((r) => r.id === marketReportId);
    if (!report) {
      return { success: false, request_id: null, message: 'Market report not found.' };
    }

    let requests = this._getFromStorage('market_report_requests');
    const request = {
      id: this._generateId('mrrequest'),
      market_report_id: marketReportId,
      contact_name,
      email,
      company: company || '',
      notes: notes || '',
      created_at: this._now()
    };

    requests.push(request);
    this._saveToStorage('market_report_requests', requests);

    return { success: true, request_id: request.id, message: 'Request submitted.' };
  }

  // -------------------------
  // Savings Calculator
  // -------------------------

  getSavingsCalculatorDefaults() {
    // Defaults are configuration-level, not entity data.
    const default_annual_spend = 1000000;
    const default_expected_savings_rate = 8;
    const currency = 'usd';

    const engagement_levels = [
      { value: 'lite', label: 'Lite', description: 'Light-touch support on priority categories.' },
      { value: 'standard', label: 'Standard', description: 'Balanced support across sourcing and implementation.' },
      { value: 'advanced', label: 'Advanced', description: 'Full-cycle support with advanced analytics.' }
    ];

    return { default_annual_spend, default_expected_savings_rate, currency, engagement_levels };
  }

  calculateSavingsEstimate(annual_spend, expected_savings_rate, currency = 'usd') {
    const optionsRaw = this._calculateConsultingFeesAndSavings(annual_spend, expected_savings_rate, currency);
    const options = optionsRaw.map((o) => ({
      engagement_level: o.engagement_level,
      engagement_label: o.engagement_label,
      consulting_fee: o.consulting_fee,
      estimated_savings: o.estimated_savings,
      roi_percent: o.roi_percent
    }));

    return {
      annual_spend,
      expected_savings_rate,
      currency,
      options
    };
  }

  saveSavingsScenario(name, annual_spend, expected_savings_rate, engagement_level, currency = 'usd', notes) {
    const allOptions = this._calculateConsultingFeesAndSavings(annual_spend, expected_savings_rate, currency);
    const selected = allOptions.find((o) => o.engagement_level === engagement_level);
    if (!selected) {
      return { success: false, scenario: null, message: 'Invalid engagement level.' };
    }

    let scenarios = this._getFromStorage('savings_scenarios');
    const scenario = {
      id: this._generateId('savingsscenario'),
      name,
      annual_spend,
      expected_savings_rate,
      engagement_level,
      consulting_fee: selected.consulting_fee,
      estimated_savings: selected.estimated_savings,
      currency,
      notes: notes || '',
      is_selected: true,
      created_at: this._now()
    };

    scenarios.push(scenario);
    this._saveToStorage('savings_scenarios', scenarios);

    return {
      success: true,
      scenario: {
        id: scenario.id,
        name: scenario.name,
        annual_spend: scenario.annual_spend,
        expected_savings_rate: scenario.expected_savings_rate,
        engagement_level: scenario.engagement_level,
        consulting_fee: scenario.consulting_fee,
        estimated_savings: scenario.estimated_savings,
        currency: scenario.currency,
        notes: scenario.notes,
        created_at: scenario.created_at
      },
      message: 'Savings scenario saved.'
    };
  }

  getSavedSavingsScenarios() {
    const scenarios = this._getFromStorage('savings_scenarios');
    const mapped = scenarios.map((s) => ({
      id: s.id,
      name: s.name,
      annual_spend: s.annual_spend,
      expected_savings_rate: s.expected_savings_rate,
      engagement_level: s.engagement_level,
      consulting_fee: s.consulting_fee,
      estimated_savings: s.estimated_savings,
      currency: s.currency,
      created_at: s.created_at
    }));
    return { scenarios: mapped };
  }

  deleteSavingsScenario(savingsScenarioId) {
    let scenarios = this._getFromStorage('savings_scenarios');
    const before = scenarios.length;
    scenarios = scenarios.filter((s) => s.id !== savingsScenarioId);
    this._saveToStorage('savings_scenarios', scenarios);
    return { success: before !== scenarios.length };
  }

  // -------------------------
  // Vendor Evaluation Matrix
  // -------------------------

  saveVendorMatrixConfiguration(name, description, criteria) {
    const validation = this._validateVendorMatrixWeights(criteria || []);

    if (!validation.is_valid) {
      return {
        success: false,
        vendor_matrix_id: null,
        total_weight: validation.total_weight,
        validation
      };
    }

    let matrices = this._getFromStorage('vendor_matrices');
    let crits = this._getFromStorage('vendor_criteria');

    const matrixId = this._generateId('vendormatrix');
    const now = this._now();

    const matrix = {
      id: matrixId,
      name,
      description: description || '',
      total_weight: validation.total_weight,
      created_at: now,
      updated_at: now
    };

    matrices.push(matrix);

    (criteria || []).forEach((c, idx) => {
      const crit = {
        id: this._generateId('vendorcriterion'),
        vendor_matrix_id: matrixId,
        name: c.name,
        weight: c.weight,
        position: typeof c.position === 'number' ? c.position : idx + 1
      };
      crits.push(crit);
    });

    this._saveToStorage('vendor_matrices', matrices);
    this._saveToStorage('vendor_criteria', crits);

    return {
      success: true,
      vendor_matrix_id: matrixId,
      total_weight: validation.total_weight,
      validation: { is_valid: true, message: 'Matrix saved.', total_weight: validation.total_weight }
    };
  }

  getSavedVendorMatrices() {
    const matrices = this._getFromStorage('vendor_matrices');
    const mapped = matrices.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description || '',
      total_weight: m.total_weight || 0,
      created_at: m.created_at || null,
      updated_at: m.updated_at || null
    }));
    return { matrices: mapped };
  }

  getVendorMatrixDetail(vendorMatrixId) {
    const matrices = this._getFromStorage('vendor_matrices');
    const m = matrices.find((x) => x.id === vendorMatrixId);
    if (!m) return null;

    const crits = this._getFromStorage('vendor_criteria').filter((c) => c.vendor_matrix_id === vendorMatrixId);
    const criteria = crits.map((c) => ({
      vendor_criterion_id: c.id,
      name: c.name,
      weight: c.weight,
      position: c.position || null
    }));

    return {
      id: m.id,
      name: m.name,
      description: m.description || '',
      total_weight: m.total_weight || 0,
      criteria
    };
  }

  deleteVendorMatrix(vendorMatrixId) {
    let matrices = this._getFromStorage('vendor_matrices');
    let crits = this._getFromStorage('vendor_criteria');

    const before = matrices.length;
    matrices = matrices.filter((m) => m.id !== vendorMatrixId);
    crits = crits.filter((c) => c.vendor_matrix_id !== vendorMatrixId);

    this._saveToStorage('vendor_matrices', matrices);
    this._saveToStorage('vendor_criteria', crits);

    return { success: before !== matrices.length };
  }

  // -------------------------
  // Case Studies & Comparisons
  // -------------------------

  getCaseStudyFilterOptions() {
    const cases = this._getFromStorage('case_studies');

    const sectorSet = new Set();
    const regionSet = new Set();
    const years = new Set();
    const values = [];

    cases.forEach((c) => {
      if (c.sector) sectorSet.add(c.sector);
      if (c.region) regionSet.add(c.region);
      if (typeof c.completion_year === 'number') years.add(c.completion_year);
      if (typeof c.project_value === 'number') values.push(c.project_value);
    });

    const sectors = Array.from(sectorSet).map((value) => ({ value, label: this._getSectorLabel(value) }));
    const regions = Array.from(regionSet).map((value) => ({ value, label: this._getRegionLabel(value) }));
    const completion_years = Array.from(years).sort((a, b) => a - b);

    const project_value_ranges = [];
    if (values.length) {
      const min = Math.min(...values);
      const max = Math.max(...values);
      project_value_ranges.push({ min, max, label: '$' + min + '–$' + max });
    }

    return { sectors, regions, completion_years, project_value_ranges };
  }

  searchCaseStudies(query, filters = {}, sort_by = 'year', page = 1, page_size = 20) {
    let items = this._getFromStorage('case_studies');

    if (query) {
      items = items.filter((c) => this._stringContains(c.title, query) || this._stringContains(c.client_name, query));
    }

    if (filters) {
      if (filters.sector) {
        items = items.filter((c) => c.sector === filters.sector);
      }
      if (filters.region) {
        items = items.filter((c) => c.region === filters.region);
      }
      if (filters.country) {
        items = items.filter((c) => c.country === filters.country);
      }
      if (typeof filters.completion_year_from === 'number') {
        items = items.filter((c) => (c.completion_year || 0) >= filters.completion_year_from);
      }
      if (typeof filters.completion_year_to === 'number') {
        items = items.filter((c) => (c.completion_year || 0) <= filters.completion_year_to);
      }
      if (typeof filters.project_value_min === 'number') {
        items = items.filter((c) => (c.project_value || 0) >= filters.project_value_min);
      }
      if (typeof filters.project_value_max === 'number') {
        items = items.filter((c) => (c.project_value || 0) <= filters.project_value_max);
      }
    }

    items.sort((a, b) => {
      if (sort_by === 'year') {
        return (b.completion_year || 0) - (a.completion_year || 0);
      }
      if (sort_by === 'value') {
        return (b.project_value || 0) - (a.project_value || 0);
      }
      if (sort_by === 'client_name') {
        const av = a.client_name || '';
        const bv = b.client_name || '';
        if (av < bv) return -1;
        if (av > bv) return 1;
        return 0;
      }
      return 0;
    });

    const total = items.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const paged = items.slice(start, end);

    const mappedItems = paged.map((c) => ({
      id: c.id,
      title: c.title,
      client_name: c.client_name || '',
      sector: c.sector || null,
      sector_label: this._getSectorLabel(c.sector),
      region: c.region || null,
      region_label: this._getRegionLabel(c.region),
      country: c.country || '',
      completion_year: c.completion_year || null,
      project_value: c.project_value,
      currency: c.currency,
      summary: c.summary || '',
      savings_amount: c.savings_amount || null,
      savings_rate: c.savings_rate || null
    }));

    return { total, page, page_size, items: mappedItems };
  }

  getCaseStudyDetail(caseStudyId) {
    const cases = this._getFromStorage('case_studies');
    const c = cases.find((x) => x.id === caseStudyId);
    if (!c) return null;

    return {
      id: c.id,
      title: c.title,
      client_name: c.client_name || '',
      sector_label: this._getSectorLabel(c.sector),
      region_label: this._getRegionLabel(c.region),
      country: c.country || '',
      completion_year: c.completion_year || null,
      project_value: c.project_value,
      currency: c.currency,
      summary: c.summary || '',
      approach: c.approach || '',
      timeline: c.timeline || '',
      outcomes: c.outcomes || '',
      savings_amount: c.savings_amount || null,
      savings_rate: c.savings_rate || null
    };
  }

  getCaseStudyComparisonView(caseStudyIds) {
    const cases = this._getFromStorage('case_studies');
    const ids = (caseStudyIds || []).slice(0, 3);

    const case_studies = ids.map((id) => {
      const c = cases.find((cs) => cs.id === id);
      if (!c) return null;
      return {
        id: c.id,
        title: c.title,
        client_name: c.client_name || '',
        sector_label: this._getSectorLabel(c.sector),
        region_label: this._getRegionLabel(c.region),
        country: c.country || '',
        completion_year: c.completion_year || null,
        project_value: c.project_value,
        currency: c.currency,
        timeline: c.timeline || '',
        approach: c.approach || '',
        outcomes: c.outcomes || '',
        savings_amount: c.savings_amount || null,
        savings_rate: c.savings_rate || null
      };
    }).filter(Boolean);

    return { case_studies };
  }

  saveCaseStudyComparison(caseStudyIds, name, notes, output_mode) {
    const ids = (caseStudyIds || []).slice(0, 3);
    if (!ids.length) {
      return { success: false, case_study_comparison_id: null, created_at: null, pdf_summary_available: false, pdf_summary_url: null, message: 'At least one case study ID is required.' };
    }

    const cases = this._getFromStorage('case_studies');
    const validIds = ids.filter((id) => cases.some((c) => c.id === id));
    if (!validIds.length) {
      return { success: false, case_study_comparison_id: null, created_at: null, pdf_summary_available: false, pdf_summary_url: null, message: 'No valid case study IDs.' };
    }

    let comparisons = this._getFromStorage('case_study_comparisons');
    let items = this._getFromStorage('case_study_comparison_items');

    const comparisonId = this._generateId('cscomparison');
    const now = this._now();

    const comparison = {
      id: comparisonId,
      name: name || 'Case study comparison',
      notes: notes || '',
      created_at: now
    };

    comparisons.push(comparison);

    validIds.forEach((id, idx) => {
      const item = {
        id: this._generateId('cscomparisonitem'),
        case_study_comparison_id: comparisonId,
        case_study_id: id,
        position: idx + 1,
        added_at: now
      };
      items.push(item);
    });

    this._saveToStorage('case_study_comparisons', comparisons);
    this._saveToStorage('case_study_comparison_items', items);

    const pdf_summary_available = output_mode === 'pdf_summary';
    const pdf_summary_url = pdf_summary_available ? '/case-study-comparisons/' + comparisonId + '.pdf' : null;

    return {
      success: true,
      case_study_comparison_id: comparisonId,
      created_at: now,
      pdf_summary_available,
      pdf_summary_url,
      message: 'Case study comparison saved.'
    };
  }

  getSavedCaseStudyComparisons() {
    const comps = this._getFromStorage('case_study_comparisons');
    const mapped = comps.map((c) => ({
      id: c.id,
      name: c.name || '',
      notes: c.notes || '',
      created_at: c.created_at || null
    }));
    return { comparisons: mapped };
  }

  getCaseStudyComparisonDetail(caseStudyComparisonId) {
    const comps = this._getFromStorage('case_study_comparisons');
    const c = comps.find((x) => x.id === caseStudyComparisonId);
    if (!c) return null;

    const itemsRaw = this._getFromStorage('case_study_comparison_items').filter((i) => i.case_study_comparison_id === caseStudyComparisonId);
    const cases = this._getFromStorage('case_studies');

    const items = itemsRaw.map((i) => {
      const cs = cases.find((x) => x.id === i.case_study_id) || null;
      return {
        case_study_id: i.case_study_id,
        position: i.position || null,
        title: cs ? cs.title : '',
        client_name: cs ? cs.client_name || '' : '',
        sector_label: cs ? this._getSectorLabel(cs.sector) : '',
        region_label: cs ? this._getRegionLabel(cs.region) : '',
        country: cs ? cs.country || '' : '',
        completion_year: cs ? cs.completion_year || null : null,
        project_value: cs ? cs.project_value : null,
        currency: cs ? cs.currency : null,
        timeline: cs ? cs.timeline || '' : '',
        approach: cs ? cs.approach || '' : '',
        outcomes: cs ? cs.outcomes || '' : '',
        savings_amount: cs ? cs.savings_amount || null : null,
        savings_rate: cs ? cs.savings_rate || null : null,
        // Foreign key resolution
        case_study: cs
      };
    });

    return {
      id: c.id,
      name: c.name || '',
      notes: c.notes || '',
      created_at: c.created_at || null,
      items
    };
  }

  // -------------------------
  // Consultation Booking
  // -------------------------

  getConsultationFormOptions() {
    const consultation_types = Object.keys(this.consultationTypeLabels).map((value) => ({
      value,
      label: this.consultationTypeLabels[value]
    }));

    const sector_topicsEnums = [
      'public_sector',
      'private_sector_retail',
      'private_sector_other',
      'manufacturing',
      'logistics_supply_chain',
      'it_software_procurement',
      'other'
    ];

    const sector_topics = sector_topicsEnums.map((value) => ({
      value,
      label: this._getSectorLabel(value)
    }));

    const default_time_zone = 'UTC';

    return { consultation_types, sector_topics, default_time_zone };
  }

  getConsultationAvailability(consultation_type, sector_topic, month, year, time_zone) {
    // Algorithmic generation of slots: weekdays, 09:00–17:00 every 30 minutes.
    const tz = time_zone || 'UTC'; // tz not used in calculation, but returned for consistency
    const slots_by_date = [];

    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
      if (['Saturday', 'Sunday'].includes(weekday)) continue;

      const dateStr = dateObj.toISOString().slice(0, 10);
      const slots = [];
      for (let hour = 9; hour < 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const start = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
          const end = new Date(start.getTime() + 30 * 60000);
          slots.push({
            start_datetime: start.toISOString(),
            end_datetime: end.toISOString(),
            is_available: true
          });
        }
      }
      slots_by_date.push({ date: dateStr, weekday, slots });
    }

    return { month, year, slots_by_date, time_zone: tz };
  }

  createConsultationBooking(consultation_type, sector_topic, start_datetime, duration_minutes = 30, name, company, email, phone, project_brief, serviceId) {
    const start = new Date(start_datetime);
    if (Number.isNaN(start.getTime())) {
      return { success: false, consultation_booking_id: null, status: 'requested', start_datetime: null, end_datetime: null, message: 'Invalid start date/time.' };
    }

    const duration = Number(duration_minutes) || 30;
    const end = new Date(start.getTime() + duration * 60000);

    let bookings = this._getFromStorage('consultation_bookings');

    const booking = {
      id: this._generateId('consultation'),
      consultation_type,
      sector_topic,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      duration_minutes: duration,
      name,
      company: company || '',
      email,
      phone: phone || '',
      project_brief: project_brief || '',
      status: 'requested',
      service_id: serviceId || null,
      created_at: this._now()
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    return {
      success: true,
      consultation_booking_id: booking.id,
      status: booking.status,
      start_datetime: booking.start_datetime,
      end_datetime: booking.end_datetime,
      message: 'Consultation booking requested.'
    };
  }

  // -------------------------
  // Workspace view preference & cross-entity helper
  // -------------------------

  getWorkspaceViewPreference() {
    const pref = this._getOrCreateWorkspaceViewPreference();
    return { current_view: pref.current_view, updated_at: pref.updated_at };
  }

  setWorkspaceViewPreference(current_view) {
    let prefs = this._getFromStorage('workspace_view_preferences');
    let pref = prefs[0];
    if (!pref) {
      pref = this._getOrCreateWorkspaceViewPreference();
      prefs = this._getFromStorage('workspace_view_preferences');
    }
    pref.current_view = current_view;
    pref.updated_at = this._now();
    prefs[0] = pref;
    this._saveToStorage('workspace_view_preferences', prefs);
    return { success: true };
  }

  moveShortlistItemToProjectBrief(shortlistItemId) {
    const shortlistItems = this._getFromStorage('shortlist_items');
    const item = shortlistItems.find((i) => i.id === shortlistItemId);
    if (!item) {
      return { success: false, project_brief_id: null, project_brief_item_id: null, message: 'Shortlist item not found.' };
    }

    const result = this.addItemToProjectBrief('service', item.service_id);
    return {
      success: result.success,
      project_brief_id: result.project_brief_id,
      project_brief_item_id: result.project_brief_item_id,
      message: result.message
    };
  }

  // -------------------------
  // About & Team
  // -------------------------

  getAboutOverview() {
    // Static content describing the consultancy, not entity data.
    const mission = 'Enable organisations to run robust, transparent and commercially-sound tenders across complex technical categories.';
    const experience_summary = 'Independent specialists in public-sector and private-sector procurement, from strategy through to contract award.';
    const core_sectors = ['public_sector', 'manufacturing', 'private_sector_retail', 'logistics_supply_chain', 'it_software'];
    const methodology = [
      'Clarify objectives and constraints',
      'Design fit-for-purpose sourcing strategy',
      'Draft and refine technical tender documentation',
      'Run evaluation and governance with clear audit trails',
      'Support negotiation and award recommendations'
    ];
    const engagement_models = [
      'End-to-end tender management',
      'Category and strategy advisory',
      'Training and capability uplift',
      'Embedded or fractional procurement support'
    ];

    const legal_summaries = {
      privacy_summary: 'We collect only the data needed to respond to your enquiries and deliver services, and retain it in line with applicable data protection laws.',
      terms_summary: 'Engagements are governed by written statements of work and standard consulting terms, tailored for public- and private-sector clients.',
      policy_links: [
        { link_key: 'privacy_policy', label: 'Privacy Policy' },
        { link_key: 'terms_of_business', label: 'Terms of Business' }
      ]
    };

    return {
      mission,
      experience_summary,
      core_sectors,
      methodology,
      engagement_models,
      legal_summaries
    };
  }

  getTeamProfiles() {
    // Team profiles may not be stored in entities; return empty set if none.
    const team_members = this._getFromStorage('team_members'); // optional, may be empty
    return { team_members };
  }
}

// Global exposure for browser and Node.js
if (typeof globalThis !== 'undefined') {
  // Attach class; instance creation is left to the consumer
  globalThis.BusinessLogic = BusinessLogic;
  if (!globalThis.WebsiteSDK) {
    globalThis.WebsiteSDK = new BusinessLogic();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}