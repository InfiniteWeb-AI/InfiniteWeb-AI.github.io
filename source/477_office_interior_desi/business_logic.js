/*
  BusinessLogic for Office Interior Design Agency Website
  - Uses localStorage (with Node.js polyfill) for persistence
  - Implements all specified interfaces and helper functions
  - No DOM/window/document usage except localStorage/global wiring
*/

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

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    // Generic entity arrays
    const arrayKeys = [
      'portfolio_projects',
      'project_shortlists',
      'project_shortlist_items',
      'design_packages',
      'package_quote_requests',
      'consultation_time_slots',
      'consultation_bookings',
      'space_calculator_plans',
      'furniture_products',
      'moodboards',
      'moodboard_items',
      'articles',
      'reading_lists',
      'reading_list_items',
      'style_profiles',
      'style_quiz_questions',
      'style_quiz_answer_options',
      'style_quiz_results',
      'project_briefs',
      'project_brief_locations',
      'newsletter_subscriptions',
      // generic/supporting
      'contact_form_submissions'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    // CMS-like singleton objects
    if (!localStorage.getItem('homepage_content')) {
      const defaultHomepage = {
        hero: {
          headline: 'Design offices that work as hard as your team',
          subheadline: 'Hybrid-ready workplace design for startups, scaleups, and global HQs.',
          background_image: '',
          primary_cta_label: 'Book consultation',
          secondary_cta_label: 'View portfolio'
        },
        value_propositions: [],
        featured_portfolio_projects: [],
        featured_services: [],
        tools_section: {
          space_calculator_teaser: 'Estimate how much space your team really needs.',
          furniture_library_teaser: 'Curate ergonomic, on-brand furniture in minutes.'
        },
        insights_teaser: {
          headline: 'Latest insights on hybrid workspaces',
          featured_article_title: '',
          featured_article_id: ''
        },
        style_quiz_promo: {
          headline: 'Find your office style',
          description: 'Take a 2-minute quiz to discover the ideal look and feel for your workspace.',
          cta_label: 'Start style quiz'
        },
        primary_ctas: {
          book_consultation_label: 'Book consultation',
          get_a_quote_label: 'Get a quote',
          newsletter_signup_label: 'Subscribe to newsletter'
        }
      };
      localStorage.setItem('homepage_content', JSON.stringify(defaultHomepage));
    }

    if (!localStorage.getItem('services_overview')) {
      const defaultServicesOverview = {
        service_categories: [
          {
            key: 'full_redesign',
            title: 'Full office redesign',
            description: 'End-to-end spatial strategy, concept, and implementation.'
          },
          {
            key: 'light_refresh',
            title: 'Light refresh',
            description: 'Cosmetic updates, furniture swaps, and layout tweaks.'
          }
        ],
        design_packages_intro: 'Choose from flexible design packages tailored to your team size and ways of working.'
      };
      localStorage.setItem('services_overview', JSON.stringify(defaultServicesOverview));
    }

    if (!localStorage.getItem('style_quiz_intro')) {
      const defaultStyleQuizIntro = {
        headline: 'What\'s your team\'s office style?',
        description: 'Answer a few quick questions and we\'ll match you with a modern office style moodboard.',
        estimated_questions_count: 6,
        estimated_time_minutes: 2,
        start_cta_label: 'Start quiz'
      };
      localStorage.setItem('style_quiz_intro', JSON.stringify(defaultStyleQuizIntro));
    }

    if (!localStorage.getItem('about_page_content')) {
      const defaultAbout = {
        intro: 'We are a workspace design studio focused on hybrid-ready offices.',
        history: 'Founded by workplace strategists and interior designers, we\'ve helped companies of all sizes transition into modern, flexible workspaces.',
        design_philosophy: 'We balance focus, collaboration, and culture in every project.',
        team_members: [],
        credentials: [],
        client_logos: [],
        testimonials: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(defaultAbout));
    }

    if (!localStorage.getItem('contact_page_content')) {
      const defaultContact = {
        email: 'hello@example-workspaces.com',
        phone: '+1 (555) 000-0000',
        office_address: '123 Workspace Ave, Suite 400',
        office_city: 'Sample City',
        office_country: 'USA',
        business_hours: 'Mon–Fri, 9:00–18:00',
        response_time_info: 'We typically respond within one business day.'
      };
      localStorage.setItem('contact_page_content', JSON.stringify(defaultContact));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
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
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // -------------------- Label Helpers --------------------

  _mapSpaceTypeLabel(spaceType) {
    const map = {
      startup_office: 'Startup office',
      corporate_hq: 'Corporate HQ',
      satellite_office: 'Satellite office',
      coworking_space: 'Coworking space',
      open_plan_office: 'Open-plan office',
      hybrid_office: 'Hybrid office',
      executive_suite: 'Executive suite'
    };
    return map[spaceType] || spaceType || '';
  }

  _mapLayoutTypeLabel(layoutType) {
    const map = {
      open_plan_office: 'Open-plan office',
      private_office: 'Private office',
      mixed_layout: 'Mixed layout',
      activity_based: 'Activity-based',
      coworking_space: 'Coworking space'
    };
    return map[layoutType] || layoutType || '';
  }

  _dayOfWeekString(dateObj) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dateObj.getDay()];
  }

  // -------------------- Required Private Helpers --------------------

  // Internal helper to load the user's default reading list or create one if none exists.
  _getOrCreateDefaultReadingList() {
    let readingLists = this._getFromStorage('reading_lists');
    let readingList = readingLists.find((r) => r.name === 'My reading list');
    if (!readingList) {
      readingList = {
        id: this._generateId('readinglist'),
        name: 'My reading list',
        description: '',
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      readingLists.push(readingList);
      this._saveToStorage('reading_lists', readingLists);
    }
    return readingList;
  }

  // Internal helper to find an existing moodboard by name for the user or create it.
  _getOrCreateMoodboardByName(name, type, sourceOrigin) {
    let moodboards = this._getFromStorage('moodboards');
    let moodboard = moodboards.find((m) => m.name === name && m.type === type);
    if (!moodboard) {
      moodboard = {
        id: this._generateId('moodboard'),
        name,
        type,
        source_origin: sourceOrigin,
        description: '',
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      moodboards.push(moodboard);
      this._saveToStorage('moodboards', moodboards);
    }
    return moodboard;
  }

  // Internal helper to compute recommended space allocations.
  _calculateSpaceRecommendations(totalEmployees, avgDailyOccupancyPercent, workModel, layoutProfile) {
    const occupancyRatio = Math.max(0, Math.min(1, (avgDailyOccupancyPercent || 0) / 100));
    const effectiveHeads = totalEmployees * occupancyRatio;

    // Base sqft per effective person
    let sqftPerPerson = 150; // baseline
    if (workModel === 'hybrid') {
      sqftPerPerson *= 0.8;
    } else if (workModel === 'remote_first') {
      sqftPerPerson *= 0.6;
    } else if (workModel === 'office_first') {
      sqftPerPerson *= 1.0;
    }

    // Layout profile adjustments
    let collabFactor = 1;
    let focusFactor = 1;
    if (layoutProfile === 'collaboration_heavy') {
      collabFactor = 1.3;
      focusFactor = 0.7;
    } else if (layoutProfile === 'focus_heavy') {
      collabFactor = 0.7;
      focusFactor = 1.3;
    } else if (layoutProfile === 'neighborhood_based') {
      collabFactor = 1.1;
      focusFactor = 1.1;
    } else if (layoutProfile === 'hot_desking') {
      sqftPerPerson *= 0.75;
    }

    const recommended_total_sqft = Math.round(effectiveHeads * sqftPerPerson);

    // Workstations: in hybrid/hot-desking scenarios not 1:1
    let workstationRatio = 1.0;
    if (workModel === 'hybrid') workstationRatio = 0.7;
    if (workModel === 'remote_first') workstationRatio = 0.5;
    if (layoutProfile === 'hot_desking') workstationRatio *= 0.8;
    const recommended_workstations = Math.max(1, Math.round(effectiveHeads * workstationRatio));

    // Meeting rooms and focus rooms roughly by team size and factors
    const baseMeetingRooms = Math.max(1, Math.round(totalEmployees / 10));
    const baseFocusRooms = Math.max(0, Math.round(totalEmployees / 15));
    const recommended_meeting_rooms = Math.max(1, Math.round(baseMeetingRooms * collabFactor));
    const recommended_focus_rooms = Math.round(baseFocusRooms * focusFactor);

    const recommended_collab_spaces = Math.max(1, Math.round((totalEmployees / 8) * collabFactor));

    const notes = 'Auto-generated by space calculator based on employees, occupancy, work model, and layout profile.';

    return {
      recommended_total_sqft,
      recommended_workstations,
      recommended_meeting_rooms,
      recommended_focus_rooms,
      recommended_collab_spaces,
      notes
    };
  }

  // Internal helper to find an existing project shortlist by name or create one.
  _findOrCreateShortlistByName(name) {
    let shortlists = this._getFromStorage('project_shortlists');
    let shortlist = shortlists.find((s) => s.name === name);
    if (!shortlist) {
      shortlist = {
        id: this._generateId('shortlist'),
        name,
        description: '',
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      shortlists.push(shortlist);
      this._saveToStorage('project_shortlists', shortlists);
    }
    return shortlist;
  }

  // Internal helper to aggregate My Saved Items overview.
  _aggregateMySavedItems() {
    const projectShortlists = this._getFromStorage('project_shortlists');
    const shortlistItems = this._getFromStorage('project_shortlist_items');

    const project_shortlists = projectShortlists.map((s) => {
      const project_count = shortlistItems.filter((i) => i.shortlist_id === s.id).length;
      return {
        shortlist_id: s.id,
        name: s.name,
        project_count
      };
    });

    const spacePlans = this._getFromStorage('space_calculator_plans');
    const space_plans = spacePlans.map((p) => ({
      plan_id: p.id,
      name: p.name,
      total_employees: p.total_employees,
      work_model: p.work_model,
      layout_profile: p.layout_profile,
      createdAt: p.createdAt
    }));

    const moodboards = this._getFromStorage('moodboards');
    const moodboardsSummary = moodboards.map((m) => ({
      moodboard_id: m.id,
      name: m.name,
      type: m.type,
      source_origin: m.source_origin,
      createdAt: m.createdAt
    }));

    const readingLists = this._getFromStorage('reading_lists');
    const readingListItems = this._getFromStorage('reading_list_items');
    const defaultReadingList = readingLists.find((r) => r.name === 'My reading list');
    let reading_list_summary;
    if (defaultReadingList) {
      const item_count = readingListItems.filter((i) => i.reading_list_id === defaultReadingList.id).length;
      reading_list_summary = {
        reading_list_id: defaultReadingList.id,
        name: defaultReadingList.name,
        item_count
      };
    } else {
      reading_list_summary = {
        reading_list_id: null,
        name: 'My reading list',
        item_count: 0
      };
    }

    return {
      project_shortlists,
      space_plans,
      moodboards: moodboardsSummary,
      reading_list_summary
    };
  }

  // Internal helper to compute style quiz scores.
  _computeStyleQuizScores(answers) {
    const answerOptions = this._getFromStorage('style_quiz_answer_options');
    const styleProfiles = this._getFromStorage('style_profiles');

    const weightByStyle = {};

    for (const ans of answers || []) {
      const option = answerOptions.find((o) => o.id === ans.answerOptionId);
      if (!option || !option.style_weightings) continue;
      for (const w of option.style_weightings) {
        if (!w || !w.style_profile_id) continue;
        const key = w.style_profile_id;
        const weight = typeof w.weight === 'number' ? w.weight : 0;
        weightByStyle[key] = (weightByStyle[key] || 0) + weight;
      }
    }

    const totalWeight = Object.values(weightByStyle).reduce((sum, v) => sum + v, 0) || 0;

    const style_scores = Object.keys(weightByStyle).map((styleId) => {
      const profile = styleProfiles.find((s) => s.id === styleId) || null;
      const percentage = totalWeight > 0 ? (weightByStyle[styleId] / totalWeight) * 100 : 0;
      return {
        style_profile_id: styleId,
        style_name: profile ? profile.name : '',
        percentage,
        is_modern_leaning: profile ? !!profile.is_modern_leaning : false
      };
    });

    style_scores.sort((a, b) => b.percentage - a.percentage);
    const top_style_profile_id = style_scores.length ? style_scores[0].style_profile_id : null;

    return { style_scores, top_style_profile_id };
  }

  // -------------------- Interfaces Implementation --------------------

  // getHomepageContent
  getHomepageContent() {
    const homepage = JSON.parse(localStorage.getItem('homepage_content') || 'null');
    const result = homepage || {};

    // Optionally resolve featured_article_id to full article for convenience
    if (result && result.insights_teaser && result.insights_teaser.featured_article_id) {
      const articles = this._getFromStorage('articles');
      const article = articles.find((a) => a.id === result.insights_teaser.featured_article_id) || null;
      if (article) {
        result.insights_teaser.featured_article = article;
      }
    }

    return result;
  }

  // getPortfolioFilterOptions
  getPortfolioFilterOptions() {
    const space_types = [
      { value: 'startup_office', label: 'Startup office' },
      { value: 'corporate_hq', label: 'Corporate HQ' },
      { value: 'satellite_office', label: 'Satellite office' },
      { value: 'coworking_space', label: 'Coworking space' },
      { value: 'open_plan_office', label: 'Open-plan office' },
      { value: 'hybrid_office', label: 'Hybrid office' },
      { value: 'executive_suite', label: 'Executive suite' }
    ];

    const team_size_presets = [
      { min: 1, max: 10, label: '1–10' },
      { min: 10, max: 20, label: '10–20' },
      { min: 20, max: 50, label: '20–50' },
      { min: 50, max: 100, label: '50–100' }
    ];

    const budget_presets = [
      { min: 0, max: 30000, label: 'Up to $30k' },
      { min: 30000, max: 60000, label: '$30k–$60k' },
      { min: 60000, max: 100000, label: '$60k–$100k' },
      { min: 100000, max: null, label: '$100k+' }
    ];

    const sort_options = [
      { value: 'budget_low_to_high', label: 'Budget: Low to High' },
      { value: 'budget_high_to_low', label: 'Budget: High to Low' },
      { value: 'most_recent', label: 'Most recent' }
    ];

    return { space_types, team_size_presets, budget_presets, sort_options };
  }

  // searchPortfolioProjects
  searchPortfolioProjects(searchTerm, spaceType, teamSizeMin, teamSizeMax, budgetMin, budgetMax, sortBy = 'most_recent', page = 1, pageSize = 12) {
    const allProjects = this._getFromStorage('portfolio_projects');
    const term = (searchTerm || '').toLowerCase();

    let filtered = allProjects.filter((p) => {
      // search term
      if (term) {
        const haystack = [p.name, p.short_description, ...(p.tags || [])].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      // space type
      if (spaceType && p.space_type !== spaceType) return false;

      // team size range: ensure project can fully support requested range if both min and max given
      if (typeof teamSizeMin === 'number' && typeof teamSizeMax === 'number') {
        if (!(p.team_size_min <= teamSizeMin && p.team_size_max >= teamSizeMax)) return false;
      } else if (typeof teamSizeMin === 'number') {
        if (p.team_size_max < teamSizeMin) return false;
      } else if (typeof teamSizeMax === 'number') {
        if (p.team_size_min > teamSizeMax) return false;
      }

      // budget range intersection
      if (typeof budgetMin === 'number') {
        if (p.budget_max < budgetMin) return false;
      }
      if (typeof budgetMax === 'number') {
        if (p.budget_min > budgetMax) return false;
      }

      return true;
    });

    // sort
    if (sortBy === 'budget_low_to_high') {
      filtered.sort((a, b) => (a.budget_min || 0) - (b.budget_min || 0));
    } else if (sortBy === 'budget_high_to_low') {
      filtered.sort((a, b) => (b.budget_min || 0) - (a.budget_min || 0));
    } else if (sortBy === 'most_recent') {
      filtered.sort((a, b) => {
        const da = a.completion_date ? new Date(a.completion_date).getTime() : 0;
        const db = b.completion_date ? new Date(b.completion_date).getTime() : 0;
        return db - da;
      });
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end);

    const projects = pageItems.map((p) => ({
      project_id: p.id,
      name: p.name,
      slug: p.slug || '',
      space_type: p.space_type,
      space_type_label: this._mapSpaceTypeLabel(p.space_type),
      team_size_min: p.team_size_min,
      team_size_max: p.team_size_max,
      budget_min: p.budget_min,
      budget_max: p.budget_max,
      location_city: p.location_city || '',
      location_country: p.location_country || '',
      thumbnail_image: p.thumbnail_image || '',
      short_description: p.short_description || '',
      completion_date: p.completion_date || '',
      // Foreign key resolution-style convenience (project_id -> project)
      project: p
    }));

    return { projects, total, page, pageSize };
  }

  // getPortfolioProjectDetail
  getPortfolioProjectDetail(projectId) {
    const projects = this._getFromStorage('portfolio_projects');
    const p = projects.find((x) => x.id === projectId) || null;
    if (!p) {
      return { project: null };
    }
    const project = {
      id: p.id,
      name: p.name,
      slug: p.slug || '',
      space_type: p.space_type,
      space_type_label: this._mapSpaceTypeLabel(p.space_type),
      team_size_min: p.team_size_min,
      team_size_max: p.team_size_max,
      budget_min: p.budget_min,
      budget_max: p.budget_max,
      location_city: p.location_city || '',
      location_country: p.location_country || '',
      completion_date: p.completion_date || '',
      thumbnail_image: p.thumbnail_image || '',
      images: p.images || [],
      short_description: p.short_description || '',
      full_description: p.full_description || '',
      tags: p.tags || [],
      is_featured: !!p.is_featured
    };
    return { project };
  }

  // getRelatedPortfolioProjects
  getRelatedPortfolioProjects(projectId, limit = 4) {
    const projects = this._getFromStorage('portfolio_projects');
    const current = projects.find((p) => p.id === projectId) || null;
    let others = projects.filter((p) => p.id !== projectId);

    if (current) {
      // Prefer same space_type and similar team size range
      others.sort((a, b) => {
        let scoreA = 0;
        let scoreB = 0;
        if (a.space_type === current.space_type) scoreA += 2;
        if (b.space_type === current.space_type) scoreB += 2;
        const midCurrent = (current.team_size_min + current.team_size_max) / 2;
        const midA = (a.team_size_min + a.team_size_max) / 2;
        const midB = (b.team_size_min + b.team_size_max) / 2;
        scoreA -= Math.abs(midA - midCurrent) / 10;
        scoreB -= Math.abs(midB - midCurrent) / 10;
        return scoreB - scoreA;
      });
    }

    return others.slice(0, limit);
  }

  // saveProjectToShortlist
  saveProjectToShortlist(projectId, shortlistName) {
    const projects = this._getFromStorage('portfolio_projects');
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return {
        success: false,
        shortlist: null,
        shortlist_item_id: null,
        message: 'Project not found.'
      };
    }

    const shortlist = this._findOrCreateShortlistByName(shortlistName);

    let shortlistItems = this._getFromStorage('project_shortlist_items');
    let existing = shortlistItems.find((i) => i.shortlist_id === shortlist.id && i.project_id === projectId);
    if (!existing) {
      existing = {
        id: this._generateId('shortlistitem'),
        shortlist_id: shortlist.id,
        project_id: projectId,
        addedAt: new Date().toISOString()
      };
      shortlistItems.push(existing);
      this._saveToStorage('project_shortlist_items', shortlistItems);
    }

    const project_count = shortlistItems.filter((i) => i.shortlist_id === shortlist.id).length;

    return {
      success: true,
      shortlist: {
        id: shortlist.id,
        name: shortlist.name,
        project_count
      },
      shortlist_item_id: existing.id,
      message: 'Project saved to shortlist.'
    };
  }

  // getProjectShortlists
  getProjectShortlists() {
    const shortlists = this._getFromStorage('project_shortlists');
    const items = this._getFromStorage('project_shortlist_items');

    return shortlists.map((s) => {
      const project_count = items.filter((i) => i.shortlist_id === s.id).length;
      return {
        shortlist_id: s.id,
        name: s.name,
        description: s.description || '',
        project_count,
        createdAt: s.createdAt || '',
        updatedAt: s.updatedAt || ''
      };
    });
  }

  // getServicesOverview
  getServicesOverview() {
    const overview = JSON.parse(localStorage.getItem('services_overview') || 'null');
    return overview || { service_categories: [], design_packages_intro: '' };
  }

  // getDesignPackageFilterOptions
  getDesignPackageFilterOptions() {
    const layout_types = [
      { value: 'open_plan_office', label: 'Open-plan office' },
      { value: 'private_office', label: 'Private office' },
      { value: 'mixed_layout', label: 'Mixed layout' },
      { value: 'activity_based', label: 'Activity-based' },
      { value: 'coworking_space', label: 'Coworking space' }
    ];

    const feature_options = [
      { id: 'change_management_workshop', label: 'Change management workshop' },
      { id: '3d_visualizations', label: '3D visualizations' },
      { id: 'furniture_specification', label: 'Furniture specification' }
    ];

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return { layout_types, feature_options, sort_options };
  }

  // searchDesignPackages
  searchDesignPackages(numberOfEmployees, layoutType, budgetMin, budgetMax, requiredFeatures, sortBy = 'price_low_to_high', page = 1, pageSize = 10) {
    const allPackages = this._getFromStorage('design_packages');
    const required = requiredFeatures || [];

    let filtered = allPackages.filter((pkg) => {
      if (pkg.is_active === false) return false;

      if (layoutType && pkg.layout_type !== layoutType) return false;

      if (typeof numberOfEmployees === 'number') {
        if (typeof pkg.min_employees === 'number' && pkg.min_employees > numberOfEmployees) return false;
        if (typeof pkg.max_employees === 'number' && pkg.max_employees < numberOfEmployees) return false;
      }

      if (typeof budgetMin === 'number' && pkg.base_price < budgetMin) return false;
      if (typeof budgetMax === 'number' && pkg.base_price > budgetMax) return false;

      if (required.length) {
        const features = pkg.included_features || [];
        for (const f of required) {
          if (!features.includes(f)) return false;
        }
      }

      return true;
    });

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end);

    const packages = pageItems.map((pkg) => ({
      package_id: pkg.id,
      name: pkg.name,
      slug: pkg.slug || '',
      description: pkg.description || '',
      base_price: pkg.base_price,
      currency: pkg.currency,
      layout_type: pkg.layout_type,
      layout_type_label: this._mapLayoutTypeLabel(pkg.layout_type),
      min_employees: pkg.min_employees,
      max_employees: pkg.max_employees,
      included_features: pkg.included_features || [],
      has_change_management_workshop: (pkg.included_features || []).includes('change_management_workshop'),
      is_active: pkg.is_active !== false,
      // Foreign key style mapping
      package: pkg
    }));

    return { packages, total, page, pageSize };
  }

  // getDesignPackageDetail
  getDesignPackageDetail(packageId) {
    const packages = this._getFromStorage('design_packages');
    const pkg = packages.find((p) => p.id === packageId) || null;
    if (!pkg) return { package: null };

    const result = {
      id: pkg.id,
      name: pkg.name,
      slug: pkg.slug || '',
      description: pkg.description || '',
      base_price: pkg.base_price,
      currency: pkg.currency,
      min_employees: pkg.min_employees,
      max_employees: pkg.max_employees,
      layout_type: pkg.layout_type,
      layout_type_label: this._mapLayoutTypeLabel(pkg.layout_type),
      supported_space_types: pkg.supported_space_types || [],
      included_features: pkg.included_features || [],
      is_active: pkg.is_active !== false
    };

    return { package: result };
  }

  // createPackageQuoteRequest
  createPackageQuoteRequest(packageId, numberOfEmployees, layoutType, maxBudget, contactName, contactEmail, additionalNotes) {
    const packages = this._getFromStorage('design_packages');
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) {
      return {
        success: false,
        quote_request_id: null,
        status: 'submitted',
        message: 'Design package not found.'
      };
    }

    const quoteRequests = this._getFromStorage('package_quote_requests');
    const now = new Date().toISOString();
    const quote = {
      id: this._generateId('quote'),
      package_id: packageId,
      number_of_employees: typeof numberOfEmployees === 'number' ? numberOfEmployees : null,
      layout_type: layoutType || null,
      max_budget: typeof maxBudget === 'number' ? maxBudget : null,
      contact_name: contactName || '',
      contact_email: contactEmail || '',
      additional_notes: additionalNotes || '',
      status: 'submitted',
      createdAt: now
    };

    quoteRequests.push(quote);
    this._saveToStorage('package_quote_requests', quoteRequests);

    return {
      success: true,
      quote_request_id: quote.id,
      status: quote.status,
      message: 'Quote request submitted.'
    };
  }

  // getConsultationLocationOptions
  getConsultationLocationOptions() {
    return [
      { value: 'virtual_online', label: 'Virtual / Online' },
      { value: 'on_site', label: 'On-site at your office' },
      { value: 'in_studio', label: 'In our studio' }
    ];
  }

  // getConsultationAvailabilityMonth
  getConsultationAvailabilityMonth(locationType, year, month) {
    const slots = this._getFromStorage('consultation_time_slots');
    const monthSlots = slots.filter((s) => {
      if (s.location_type !== locationType) return false;
      const start = new Date(s.start_datetime);
      return start.getFullYear() === year && start.getMonth() + 1 === month;
    });

    const dayMap = {};
    for (const slot of monthSlots) {
      const start = new Date(slot.start_datetime);
      const dateStr = start.toISOString().slice(0, 10);
      if (!dayMap[dateStr]) {
        dayMap[dateStr] = {
          date: dateStr,
          day_of_week: this._dayOfWeekString(start),
          has_available_slots: false
        };
      }
      if (!slot.is_booked) {
        dayMap[dateStr].has_available_slots = true;
      }
    }

    const days = Object.values(dayMap).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    return { year, month, days };
  }

  // getConsultationDayTimeSlots
  getConsultationDayTimeSlots(locationType, date) {
    const slots = this._getFromStorage('consultation_time_slots');
    const daySlots = slots.filter((s) => {
      if (s.location_type !== locationType) return false;
      const startDate = s.start_datetime ? s.start_datetime.slice(0, 10) : '';
      return startDate === date;
    });

    return daySlots.map((s) => ({
      timeslot_id: s.id,
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      is_booked: !!s.is_booked,
      is_available: !s.is_booked,
      timeslot: s
    }));
  }

  // bookConsultation
  bookConsultation(timeslotId, name, email, consultationPurpose) {
    let slots = this._getFromStorage('consultation_time_slots');
    const slotIndex = slots.findIndex((s) => s.id === timeslotId);
    if (slotIndex === -1) {
      return {
        success: false,
        booking_id: null,
        status: 'cancelled',
        location_type: null,
        start_datetime: null,
        end_datetime: null,
        message: 'Time slot not found.'
      };
    }

    const slot = slots[slotIndex];
    if (slot.is_booked) {
      return {
        success: false,
        booking_id: null,
        status: 'cancelled',
        location_type: slot.location_type,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        message: 'Time slot is already booked.'
      };
    }

    let bookings = this._getFromStorage('consultation_bookings');
    const booking = {
      id: this._generateId('booking'),
      timeslot_id: timeslotId,
      location_type: slot.location_type,
      name,
      email,
      consultation_purpose: consultationPurpose,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      confirmation_notes: ''
    };

    bookings.push(booking);
    slot.is_booked = true;
    slots[slotIndex] = slot;
    this._saveToStorage('consultation_bookings', bookings);
    this._saveToStorage('consultation_time_slots', slots);

    return {
      success: true,
      booking_id: booking.id,
      status: booking.status,
      location_type: booking.location_type,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      message: 'Consultation booked successfully.'
    };
  }

  // calculateSpacePlan
  calculateSpacePlan(totalEmployees, avgDailyOccupancyPercent, workModel, layoutProfile) {
    return this._calculateSpaceRecommendations(totalEmployees, avgDailyOccupancyPercent, workModel, layoutProfile);
  }

  // saveSpaceCalculatorPlan
  saveSpaceCalculatorPlan(name, totalEmployees, avgDailyOccupancyPercent, workModel, layoutProfile, recommendedTotalSqft, recommendedWorkstations, recommendedMeetingRooms, recommendedFocusRooms, recommendedCollabSpaces, notes) {
    const plans = this._getFromStorage('space_calculator_plans');
    const now = new Date().toISOString();

    const plan = {
      id: this._generateId('spaceplan'),
      name,
      total_employees: totalEmployees,
      avg_daily_occupancy_percent: avgDailyOccupancyPercent,
      work_model: workModel,
      layout_profile: layoutProfile,
      recommended_total_sqft: recommendedTotalSqft || null,
      recommended_workstations: recommendedWorkstations || null,
      recommended_meeting_rooms: recommendedMeetingRooms || null,
      recommended_focus_rooms: recommendedFocusRooms || null,
      recommended_collab_spaces: recommendedCollabSpaces || null,
      notes: notes || '',
      createdAt: now
    };

    plans.push(plan);
    this._saveToStorage('space_calculator_plans', plans);

    return {
      success: true,
      plan_id: plan.id,
      message: 'Space plan saved.'
    };
  }

  // getSavedSpaceCalculatorPlans
  getSavedSpaceCalculatorPlans() {
    return this._getFromStorage('space_calculator_plans');
  }

  // getFurnitureFilterOptions
  getFurnitureFilterOptions() {
    const products = this._getFromStorage('furniture_products');
    let minPrice = null;
    let maxPrice = null;
    for (const p of products) {
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const price_range = { min: minPrice, max: maxPrice };
    const rating_thresholds = [
      { value: 3, label: '3 stars & up' },
      { value: 4, label: '4 stars & up' },
      { value: 4.5, label: '4.5 stars & up' }
    ];
    const lead_time_options = [
      { max_days: 5, label: 'Ships within 5 days' },
      { max_days: 10, label: 'Ships within 10 days' },
      { max_days: 20, label: 'Ships within 20 days' }
    ];
    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' }
    ];

    return { price_range, rating_thresholds, lead_time_options, sort_options };
  }

  // searchFurnitureProducts
  searchFurnitureProducts(query, category, maxPrice, minPrice, minRating, maxLeadTimeDays, sortBy = 'price_low_to_high', page = 1, pageSize = 20) {
    const allProducts = this._getFromStorage('furniture_products');
    const term = (query || '').toLowerCase();

    let filtered = allProducts.filter((p) => {
      if (category && p.category !== category) return false;

      if (term) {
        const keywords = (p.search_keywords || []).join(' ');
        const haystack = [p.name, p.subcategory || '', p.description || '', keywords].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (typeof minPrice === 'number' && p.price < minPrice) return false;
      if (typeof maxPrice === 'number' && p.price > maxPrice) return false;

      const rating = typeof p.average_rating === 'number' ? p.average_rating : 0;
      if (typeof minRating === 'number' && rating < minRating) return false;

      const leadTime = typeof p.lead_time_days === 'number' ? p.lead_time_days : Infinity;
      if (typeof maxLeadTimeDays === 'number' && leadTime > maxLeadTimeDays) return false;

      return true;
    });

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end);

    const products = pageItems.map((p) => ({
      product_id: p.id,
      name: p.name,
      category: p.category,
      subcategory: p.subcategory || '',
      price: p.price,
      currency: p.currency,
      average_rating: p.average_rating || 0,
      review_count: p.review_count || 0,
      lead_time_days: typeof p.lead_time_days === 'number' ? p.lead_time_days : null,
      is_ergonomic: !!p.is_ergonomic,
      thumbnail_image: p.thumbnail_image || '',
      vendor_name: p.vendor_name || '',
      available: p.available !== false,
      product: p
    }));

    return { products, total, page, pageSize };
  }

  // getMoodboards
  getMoodboards(type) {
    const moodboards = this._getFromStorage('moodboards');
    if (!type) return moodboards;
    return moodboards.filter((m) => m.type === type);
  }

  // createMoodboard
  createMoodboard(name, type, sourceOrigin) {
    const moodboards = this._getFromStorage('moodboards');
    const now = new Date().toISOString();

    const moodboard = {
      id: this._generateId('moodboard'),
      name,
      type,
      source_origin: sourceOrigin,
      description: '',
      createdAt: now,
      updatedAt: null
    };

    moodboards.push(moodboard);
    this._saveToStorage('moodboards', moodboards);

    return {
      success: true,
      moodboard,
      message: 'Moodboard created.'
    };
  }

  // addItemToMoodboard
  addItemToMoodboard(moodboardId, sourceType, sourceId) {
    const moodboards = this._getFromStorage('moodboards');
    const moodboard = moodboards.find((m) => m.id === moodboardId);
    if (!moodboard) {
      return {
        success: false,
        moodboard_item_id: null,
        message: 'Moodboard not found.'
      };
    }

    const items = this._getFromStorage('moodboard_items');
    const item = {
      id: this._generateId('moodboarditem'),
      moodboard_id: moodboardId,
      source_type: sourceType,
      source_id: sourceId,
      addedAt: new Date().toISOString()
    };

    items.push(item);
    this._saveToStorage('moodboard_items', items);

    return {
      success: true,
      moodboard_item_id: item.id,
      message: 'Item added to moodboard.'
    };
  }

  // getMoodboardDetail
  getMoodboardDetail(moodboardId) {
    const moodboards = this._getFromStorage('moodboards');
    const moodboard = moodboards.find((m) => m.id === moodboardId) || null;
    const allItems = this._getFromStorage('moodboard_items');
    const itemsForBoard = allItems.filter((i) => i.moodboard_id === moodboardId);

    const furniture = this._getFromStorage('furniture_products');
    const styles = this._getFromStorage('style_profiles');
    const projects = this._getFromStorage('portfolio_projects');
    const articles = this._getFromStorage('articles');
    const designPackages = this._getFromStorage('design_packages');

    const items = itemsForBoard.map((i) => {
      let source = null;
      let preview_title = '';
      let preview_subtitle = '';
      let preview_thumbnail = '';

      if (i.source_type === 'furniture_product') {
        source = furniture.find((f) => f.id === i.source_id) || null;
        if (source) {
          preview_title = source.name;
          preview_subtitle = source.vendor_name || '';
          preview_thumbnail = source.thumbnail_image || '';
        }
      } else if (i.source_type === 'style_profile') {
        source = styles.find((s) => s.id === i.source_id) || null;
        if (source) {
          preview_title = source.name;
          preview_subtitle = source.description || '';
          preview_thumbnail = source.hero_image || '';
        }
      } else if (i.source_type === 'portfolio_project') {
        source = projects.find((p) => p.id === i.source_id) || null;
        if (source) {
          preview_title = source.name;
          preview_subtitle = this._mapSpaceTypeLabel(source.space_type);
          preview_thumbnail = source.thumbnail_image || '';
        }
      } else if (i.source_type === 'article') {
        source = articles.find((a) => a.id === i.source_id) || null;
        if (source) {
          preview_title = source.title;
          preview_subtitle = source.excerpt || '';
          preview_thumbnail = source.hero_image || '';
        }
      } else if (i.source_type === 'design_package') {
        source = designPackages.find((p) => p.id === i.source_id) || null;
        if (source) {
          preview_title = source.name;
          preview_subtitle = this._mapLayoutTypeLabel(source.layout_type);
          preview_thumbnail = '';
        }
      }

      return {
        moodboard_item_id: i.id,
        source_type: i.source_type,
        source_id: i.source_id,
        addedAt: i.addedAt,
        preview_title,
        preview_subtitle,
        preview_thumbnail,
        source
      };
    });

    return { moodboard, items };
  }

  // updateMoodboardName
  updateMoodboardName(moodboardId, newName) {
    const moodboards = this._getFromStorage('moodboards');
    const idx = moodboards.findIndex((m) => m.id === moodboardId);
    if (idx === -1) {
      return { success: false, moodboard: null };
    }
    moodboards[idx].name = newName;
    moodboards[idx].updatedAt = new Date().toISOString();
    this._saveToStorage('moodboards', moodboards);
    return { success: true, moodboard: moodboards[idx] };
  }

  // removeMoodboardItem
  removeMoodboardItem(moodboardItemId) {
    let items = this._getFromStorage('moodboard_items');
    const originalLength = items.length;
    items = items.filter((i) => i.id !== moodboardItemId);
    this._saveToStorage('moodboard_items', items);
    const removed = items.length !== originalLength;
    return {
      success: removed,
      message: removed ? 'Item removed from moodboard.' : 'Item not found.'
    };
  }

  // getArticleFilterOptions
  getArticleFilterOptions() {
    const date_ranges = [
      { value: 'last_7_days', label: 'Last 7 days' },
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_3_months', label: 'Last 3 months' },
      { value: 'all_time', label: 'All time' }
    ];

    const reading_time_options = [
      { max_minutes: 5, label: 'Up to 5 minutes' },
      { max_minutes: 10, label: 'Up to 10 minutes' },
      { max_minutes: 20, label: 'Up to 20 minutes' }
    ];

    const sort_options = [
      { value: 'most_recent', label: 'Most recent' },
      { value: 'oldest_first', label: 'Oldest first' }
    ];

    return { date_ranges, reading_time_options, sort_options };
  }

  // searchArticles
  searchArticles(query, publishedDateRange, maxReadingTimeMinutes, topics, sortBy = 'most_recent', page = 1, pageSize = 10) {
    const allArticles = this._getFromStorage('articles');
    const term = (query || '').toLowerCase();
    const topicFilter = topics || [];

    let fromDate = null;
    if (publishedDateRange === 'last_7_days') {
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7);
    } else if (publishedDateRange === 'last_30_days') {
      fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);
    } else if (publishedDateRange === 'last_3_months') {
      fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - 3);
    }

    let filtered = allArticles.filter((a) => {
      if (term) {
        const haystack = [a.title, a.excerpt || '', a.content || '', ...(a.topics || [])].join(' ').toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      if (fromDate) {
        const pubDate = new Date(a.published_at);
        if (pubDate < fromDate) return false;
      }

      if (typeof maxReadingTimeMinutes === 'number' && a.reading_time_minutes > maxReadingTimeMinutes) return false;

      if (topicFilter.length) {
        const articleTopics = a.topics || [];
        const match = topicFilter.some((t) => articleTopics.includes(t));
        if (!match) return false;
      }

      return true;
    });

    if (sortBy === 'most_recent') {
      filtered.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    } else if (sortBy === 'oldest_first') {
      filtered.sort((a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime());
    }

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filtered.slice(start, end);

    const articles = pageItems.map((a) => ({
      article_id: a.id,
      title: a.title,
      excerpt: a.excerpt || '',
      topics: a.topics || [],
      published_at: a.published_at,
      reading_time_minutes: a.reading_time_minutes,
      hero_image: a.hero_image || '',
      author_name: a.author_name || '',
      article: a
    }));

    return { articles, total, page, pageSize };
  }

  // getArticleDetail
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || null;
    return { article };
  }

  // getRelatedArticles
  getRelatedArticles(articleId, limit = 3) {
    const articles = this._getFromStorage('articles');
    const current = articles.find((a) => a.id === articleId) || null;
    let others = articles.filter((a) => a.id !== articleId);

    if (current) {
      const currentTopics = current.topics || [];
      others.sort((a, b) => {
        const topicsA = a.topics || [];
        const topicsB = b.topics || [];
        const overlapA = topicsA.filter((t) => currentTopics.includes(t)).length;
        const overlapB = topicsB.filter((t) => currentTopics.includes(t)).length;
        if (overlapA !== overlapB) return overlapB - overlapA;
        return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      });
    } else {
      others.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
    }

    return others.slice(0, limit);
  }

  // saveArticleToReadingList
  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        reading_list_id: null,
        reading_list_item_id: null,
        message: 'Article not found.'
      };
    }

    const readingList = this._getOrCreateDefaultReadingList();
    let items = this._getFromStorage('reading_list_items');
    let existing = items.find((i) => i.reading_list_id === readingList.id && i.article_id === articleId);
    if (!existing) {
      existing = {
        id: this._generateId('readinglistitem'),
        reading_list_id: readingList.id,
        article_id: articleId,
        addedAt: new Date().toISOString()
      };
      items.push(existing);
      this._saveToStorage('reading_list_items', items);
    }

    return {
      success: true,
      reading_list_id: readingList.id,
      reading_list_item_id: existing.id,
      message: 'Article saved to reading list.'
    };
  }

  // getReadingListWithItems
  getReadingListWithItems() {
    const readingLists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');

    let reading_list = readingLists.find((r) => r.name === 'My reading list') || null;
    if (!reading_list && readingLists.length) {
      reading_list = readingLists[0];
    }
    if (!reading_list) {
      return { reading_list: null, items: [] };
    }

    const listItems = items.filter((i) => i.reading_list_id === reading_list.id).map((i) => {
      const article = articles.find((a) => a.id === i.article_id) || null;
      return {
        reading_list_item_id: i.id,
        article_id: i.article_id,
        addedAt: i.addedAt,
        title: article ? article.title : '',
        excerpt: article ? article.excerpt || '' : '',
        published_at: article ? article.published_at : '',
        reading_time_minutes: article ? article.reading_time_minutes : null,
        article
      };
    });

    return { reading_list, items: listItems };
  }

  // getStyleQuizIntro
  getStyleQuizIntro() {
    const intro = JSON.parse(localStorage.getItem('style_quiz_intro') || 'null');
    return intro || {
      headline: '',
      description: '',
      estimated_questions_count: 0,
      estimated_time_minutes: 0,
      start_cta_label: ''
    };
  }

  // getStyleQuizQuestions
  getStyleQuizQuestions() {
    const questions = this._getFromStorage('style_quiz_questions');
    const answerOptions = this._getFromStorage('style_quiz_answer_options');

    const result = questions
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((q) => {
        const options = answerOptions
          .filter((o) => o.question_id === q.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((o) => ({
            answer_option_id: o.id,
            text: o.text,
            image: o.image || '',
            order: o.order || 0
          }));
        return {
          question_id: q.id,
          text: q.text,
          order: q.order || 0,
          image: q.image || '',
          answer_options: options
        };
      });

    return result;
  }

  // submitStyleQuiz
  submitStyleQuiz(answers) {
    const { style_scores, top_style_profile_id } = this._computeStyleQuizScores(answers || []);

    const results = this._getFromStorage('style_quiz_results');
    const now = new Date().toISOString();
    const resultRecord = {
      id: this._generateId('stylequizresult'),
      answers: (answers || []).map((a) => ({ questionId: a.questionId, answerOptionId: a.answerOptionId })),
      style_scores,
      top_style_profile_id,
      selected_style_profile_id: null,
      createdAt: now
    };

    results.push(resultRecord);
    this._saveToStorage('style_quiz_results', results);

    return {
      result_id: resultRecord.id,
      style_scores,
      top_style_profile_id
    };
  }

  // getStyleProfileMoodboard
  getStyleProfileMoodboard(styleProfileId) {
    const styleProfiles = this._getFromStorage('style_profiles');
    const moodboards = this._getFromStorage('moodboards');
    const items = this._getFromStorage('moodboard_items');

    const style_profile = styleProfiles.find((s) => s.id === styleProfileId) || null;
    if (!style_profile || !style_profile.default_moodboard_id) {
      return { style_profile: null, moodboard: null, items: [] };
    }

    const moodboard = moodboards.find((m) => m.id === style_profile.default_moodboard_id) || null;
    const moodboardItems = items.filter((i) => i.moodboard_id === style_profile.default_moodboard_id);

    return {
      style_profile,
      moodboard,
      items: moodboardItems
    };
  }

  // createMoodboardFromStyleProfile
  createMoodboardFromStyleProfile(styleProfileId, name) {
    const styleProfiles = this._getFromStorage('style_profiles');
    const srcStyle = styleProfiles.find((s) => s.id === styleProfileId);
    if (!srcStyle || !srcStyle.default_moodboard_id) {
      return {
        success: false,
        moodboard: null,
        message: 'Style profile or default moodboard not found.'
      };
    }

    const moodboards = this._getFromStorage('moodboards');
    const items = this._getFromStorage('moodboard_items');

    const now = new Date().toISOString();
    const newMoodboard = {
      id: this._generateId('moodboard'),
      name,
      type: 'style',
      source_origin: 'style_quiz_generated',
      description: `Based on style profile: ${srcStyle.name}`,
      createdAt: now,
      updatedAt: null
    };

    moodboards.push(newMoodboard);

    const srcItems = items.filter((i) => i.moodboard_id === srcStyle.default_moodboard_id);
    const newItems = srcItems.map((i) => ({
      id: this._generateId('moodboarditem'),
      moodboard_id: newMoodboard.id,
      source_type: i.source_type,
      source_id: i.source_id,
      addedAt: now
    }));

    const allItems = items.concat(newItems);

    this._saveToStorage('moodboards', moodboards);
    this._saveToStorage('moodboard_items', allItems);

    return {
      success: true,
      moodboard: newMoodboard,
      message: 'Style moodboard saved.'
    };
  }

  // getProjectBriefFormOptions
  getProjectBriefFormOptions() {
    const project_types = [
      { value: 'multi_location_office', label: 'Multi-location office' },
      { value: 'single_location_office', label: 'Single-location office' },
      { value: 'hq_refresh', label: 'HQ refresh' },
      { value: 'new_build_out', label: 'New build-out' },
      { value: 'other', label: 'Other' }
    ];

    const service_levels = [
      { value: 'full_redesign', label: 'Full redesign' },
      { value: 'light_refresh', label: 'Light refresh' },
      { value: 'consultation_only', label: 'Consultation only' },
      { value: 'furniture_update_only', label: 'Furniture update only' }
    ];

    return { project_types, service_levels };
  }

  // submitProjectBrief
  submitProjectBrief(projectType, name, locations, overallBudgetEstimate, additionalNotes, contactName, contactEmail) {
    const project_briefs = this._getFromStorage('project_briefs');
    const project_brief_locations = this._getFromStorage('project_brief_locations');

    const now = new Date().toISOString();

    let computedOverallBudget = typeof overallBudgetEstimate === 'number' ? overallBudgetEstimate : 0;
    if (!overallBudgetEstimate && Array.isArray(locations)) {
      for (const loc of locations) {
        if (typeof loc.estimatedBudget === 'number') {
          computedOverallBudget += loc.estimatedBudget;
        }
      }
    }

    const brief = {
      id: this._generateId('projectbrief'),
      project_type: projectType,
      name: name || '',
      overall_budget_estimate: computedOverallBudget || null,
      additional_notes: additionalNotes || '',
      contact_name: contactName || '',
      contact_email: contactEmail || '',
      status: 'submitted',
      createdAt: now,
      submittedAt: now
    };

    project_briefs.push(brief);

    const newLocations = [];
    for (const loc of locations || []) {
      const locRecord = {
        id: this._generateId('projectbriefloc'),
        project_brief_id: brief.id,
        location_name: loc.locationName || '',
        employees_count: typeof loc.employeesCount === 'number' ? loc.employeesCount : 0,
        service_level: loc.serviceLevel,
        estimated_budget: typeof loc.estimatedBudget === 'number' ? loc.estimatedBudget : 0,
        address: loc.address || '',
        city: loc.city || '',
        country: loc.country || ''
      };
      newLocations.push(locRecord);
    }

    const mergedLocations = project_brief_locations.concat(newLocations);
    this._saveToStorage('project_briefs', project_briefs);
    this._saveToStorage('project_brief_locations', mergedLocations);

    return {
      success: true,
      project_brief_id: brief.id,
      status: brief.status,
      message: 'Project brief submitted.'
    };
  }

  // getNewsletterPreferencesOptions
  getNewsletterPreferencesOptions() {
    const topics = [
      { id: 'workspace_trends', label: 'Workspace trends' },
      { id: 'ergonomics_wellness', label: 'Ergonomics & wellness' },
      { id: 'case_studies', label: 'Case studies' },
      { id: 'product_updates', label: 'Product updates' }
    ];

    const frequency_options = [
      { value: 'monthly_summary', label: 'Monthly summary' },
      { value: 'weekly_roundup', label: 'Weekly roundup' },
      { value: 'biweekly_digest', label: 'Bi-weekly digest' },
      { value: 'realtime_alerts', label: 'Real-time alerts' }
    ];

    return { topics, frequency_options };
  }

  // subscribeToNewsletter
  subscribeToNewsletter(name, email, topics, frequency) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    const now = new Date().toISOString();
    const subscription = {
      id: this._generateId('newsletter'),
      name,
      email,
      topics: topics || [],
      frequency,
      createdAt: now,
      is_confirmed: false
    };
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription_id: subscription.id,
      is_confirmed: subscription.is_confirmed,
      message: 'Subscription received. Please check your email to confirm.'
    };
  }

  // getMySavedItemsOverview
  getMySavedItemsOverview() {
    return this._aggregateMySavedItems();
  }

  // getAboutPageContent
  getAboutPageContent() {
    const about = JSON.parse(localStorage.getItem('about_page_content') || 'null');
    return (
      about || {
        intro: '',
        history: '',
        design_philosophy: '',
        team_members: [],
        credentials: [],
        client_logos: [],
        testimonials: []
      }
    );
  }

  // getContactPageContent
  getContactPageContent() {
    const contact = JSON.parse(localStorage.getItem('contact_page_content') || 'null');
    return (
      contact || {
        email: '',
        phone: '',
        office_address: '',
        office_city: '',
        office_country: '',
        business_hours: '',
        response_time_info: ''
      }
    );
  }

  // submitContactForm
  submitContactForm(name, email, subject, message) {
    const submissions = this._getFromStorage('contact_form_submissions');
    const now = new Date().toISOString();
    const submission = {
      id: this._generateId('contact'),
      name,
      email,
      subject: subject || '',
      message,
      createdAt: now
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been sent.'
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
