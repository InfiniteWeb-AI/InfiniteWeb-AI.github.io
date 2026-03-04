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
  }

  // --------------------
  // Initialization & helpers
  // --------------------

  _initStorage() {
    // Initialize all entity tables as arrays if they do not exist
    const tableKeys = [
      'service_categories',
      'service_packages',
      'quote_requests',
      'portfolio_projects',
      'project_images',
      'project_shortlist',
      'blog_posts',
      'reading_list',
      'estimator_configs',
      'estimator_addons',
      'cost_estimates',
      'saved_estimates',
      'faq_items',
      'contact_messages',
      'consultation_bookings',
      'project_briefs',
      'mood_presets',
      'mood_images',
      'newsletter_subscriptions'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // CMS-like singletons are optional; do not create defaults to avoid mock data

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

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // Internal helper to retrieve or initialize the ProjectShortlist object
  _getOrCreateProjectShortlist() {
    let lists = this._getFromStorage('project_shortlist');
    if (!Array.isArray(lists)) {
      lists = [];
    }
    if (lists.length === 0) {
      const shortlist = {
        id: this._generateId('shortlist'),
        project_ids: [],
        updated_at: this._getCurrentTimestamp()
      };
      lists.push(shortlist);
      this._saveToStorage('project_shortlist', lists);
      return shortlist;
    }
    return lists[0];
  }

  // Internal helper to retrieve or initialize the ReadingList object
  _getOrCreateReadingList() {
    let lists = this._getFromStorage('reading_list');
    if (!Array.isArray(lists)) {
      lists = [];
    }
    if (lists.length === 0) {
      const readingList = {
        id: this._generateId('reading_list'),
        blog_post_ids: [],
        updated_at: this._getCurrentTimestamp()
      };
      lists.push(readingList);
      this._saveToStorage('reading_list', lists);
      return readingList;
    }
    return lists[0];
  }

  // Internal helper to persist a CostEstimate
  _persistCostEstimate(configId, project_type, scope, floor_area_m2, add_on_ids, base_cost, add_ons_cost, total_cost) {
    const estimates = this._getFromStorage('cost_estimates');
    const estimate = {
      id: this._generateId('estimate'),
      config_id: configId || null,
      project_type,
      scope,
      floor_area_m2,
      add_on_ids: Array.isArray(add_on_ids) ? add_on_ids : [],
      base_cost,
      add_ons_cost,
      total_cost,
      created_at: this._getCurrentTimestamp()
    };
    estimates.push(estimate);
    this._saveToStorage('cost_estimates', estimates);
    return estimate;
  }

  // --------------------
  // Interface implementations
  // --------------------

  // getHomePageSummary
  getHomePageSummary() {
    // Optional CMS-configured home page summary
    let homeConfig = {};
    const raw = localStorage.getItem('home_page_summary');
    if (raw) {
      try {
        homeConfig = JSON.parse(raw) || {};
      } catch (e) {
        homeConfig = {};
      }
    }

    const serviceCategories = this._getFromStorage('service_categories').filter((c) => c.is_active !== false);
    const core_services = serviceCategories.map((cat) => ({
      service_category_key: cat.key,
      service_category_name: cat.name,
      short_description: cat.description || ''
    }));

    const trust_signals = Array.isArray(homeConfig.trust_signals) ? homeConfig.trust_signals : [];

    const projects = this._getFromStorage('portfolio_projects').filter((p) => p.is_published);
    let featuredProjectsArray = [];
    if (Array.isArray(homeConfig.featured_project_ids) && homeConfig.featured_project_ids.length > 0) {
      const idSet = new Set(homeConfig.featured_project_ids);
      featuredProjectsArray = projects.filter((p) => idSet.has(p.id));
    } else {
      featuredProjectsArray = projects.slice(0, 6);
    }

    const featured_projects = featuredProjectsArray.map((p) => ({
      project_id: p.id,
      title: p.title,
      slug: p.slug,
      thumbnail_url: p.thumbnail_url,
      project_category_label: p.project_category_label || '',
      completion_year: p.completion_year
    }));

    const blogPosts = this._getFromStorage('blog_posts').filter((b) => b.is_published);
    blogPosts.sort((a, b) => {
      const da = a.publish_date ? new Date(a.publish_date).getTime() : 0;
      const db = b.publish_date ? new Date(b.publish_date).getTime() : 0;
      return db - da;
    });
    const recent_articles = blogPosts.slice(0, 5).map((p) => ({
      blog_post_id: p.id,
      title: p.title,
      slug: p.slug,
      featured_image_url: p.featured_image_url || '',
      publish_date: p.publish_date,
      tags: Array.isArray(p.tags) ? p.tags : []
    }));

    return {
      hero_title: homeConfig.hero_title || '',
      hero_subtitle: homeConfig.hero_subtitle || '',
      core_services,
      trust_signals,
      featured_projects,
      recent_articles,
      show_cta_start_project:
        typeof homeConfig.show_cta_start_project === 'boolean' ? homeConfig.show_cta_start_project : true,
      show_cta_book_consultation:
        typeof homeConfig.show_cta_book_consultation === 'boolean' ? homeConfig.show_cta_book_consultation : true
    };
  }

  // getServiceCategoriesForDisplay
  getServiceCategoriesForDisplay() {
    const categories = this._getFromStorage('service_categories');
    return categories.filter((c) => c.is_active !== false);
  }

  // getServicePackages
  getServicePackages(
    service_category_key,
    property_type,
    scope,
    package_type,
    min_still_renders,
    resolution,
    max_price_usd,
    sort_by_price_asc
  ) {
    const packages = this._getFromStorage('service_packages').filter((p) => p.is_active !== false);
    const categories = this._getFromStorage('service_categories');

    let filtered = packages;

    if (service_category_key) {
      filtered = filtered.filter((pkg) => {
        const cat = categories.find((c) => c.id === pkg.service_category_id);
        return cat && cat.key === service_category_key;
      });
    }

    if (property_type) {
      filtered = filtered.filter((pkg) => pkg.property_type === property_type);
    }

    if (scope) {
      filtered = filtered.filter((pkg) => pkg.scope === scope);
    }

    if (package_type) {
      filtered = filtered.filter((pkg) => pkg.package_type === package_type);
    }

    if (typeof min_still_renders === 'number') {
      filtered = filtered.filter((pkg) => {
        const min = typeof pkg.min_still_renders === 'number' ? pkg.min_still_renders : 0;
        const max = typeof pkg.max_still_renders === 'number' ? pkg.max_still_renders : Infinity;
        return max >= min_still_renders && min <= min_still_renders;
      });
    }

    if (resolution) {
      filtered = filtered.filter((pkg) => pkg.resolution === resolution);
    }

    if (typeof max_price_usd === 'number') {
      filtered = filtered.filter((pkg) => typeof pkg.base_price_usd === 'number' && pkg.base_price_usd <= max_price_usd);
    }

    const sortAsc = sort_by_price_asc !== false; // default true
    filtered.sort((a, b) => {
      const pa = typeof a.base_price_usd === 'number' ? a.base_price_usd : 0;
      const pb = typeof b.base_price_usd === 'number' ? b.base_price_usd : 0;
      return sortAsc ? pa - pb : pb - pa;
    });

    return filtered.map((pkg) => {
      const category = categories.find((c) => c.id === pkg.service_category_id) || null;
      return {
        service_package: Object.assign({}, pkg, {
          service_category: category
        }),
        id: pkg.id,
        name: pkg.name,
        description: pkg.description || '',
        service_category_key: category ? category.key : null,
        service_category_name: category ? category.name : null,
        package_type: pkg.package_type,
        property_type: pkg.property_type,
        scope: pkg.scope,
        min_still_renders: pkg.min_still_renders,
        max_still_renders: pkg.max_still_renders,
        includes_animation: pkg.includes_animation || false,
        resolution: pkg.resolution,
        delivery_time_weeks: pkg.delivery_time_weeks,
        base_price_usd: pkg.base_price_usd,
        is_featured: pkg.is_featured || false
      };
    });
  }

  // getQuoteFormOptions
  getQuoteFormOptions() {
    return {
      project_types: ['residential', 'commercial', 'mixed'],
      scopes: ['interior', 'exterior', 'both'],
      delivery_timelines: [
        { value: 'one_week_or_less', label: '1 week or less' },
        { value: 'two_weeks_or_less', label: '2 weeks or less' },
        { value: 'three_weeks_or_less', label: '3 weeks or less' },
        { value: 'more_than_three_weeks', label: 'More than 3 weeks' }
      ]
    };
  }

  // submitQuoteRequest
  submitQuoteRequest(name, email, project_type, scope, selected_package_id, delivery_timeline, message) {
    const quoteRequests = this._getFromStorage('quote_requests');
    const newQuote = {
      id: this._generateId('quote'),
      name,
      email,
      project_type,
      scope: scope || null,
      selected_package_id,
      delivery_timeline,
      message: message || '',
      status: 'received',
      created_at: this._getCurrentTimestamp()
    };
    quoteRequests.push(newQuote);
    this._saveToStorage('quote_requests', quoteRequests);

    // Foreign key resolution: selected_package_id -> selected_package
    const servicePackages = this._getFromStorage('service_packages');
    const selected_package = servicePackages.find((p) => p.id === selected_package_id) || null;

    const quoteWithRelations = Object.assign({}, newQuote, {
      selected_package
    });

    return {
      success: true,
      quote_request: quoteWithRelations,
      message: 'Quote request submitted.'
    };
  }

  // getPortfolioFilterOptions
  getPortfolioFilterOptions() {
    const projects = this._getFromStorage('portfolio_projects').filter((p) => p.is_published);

    let completion_year_min = null;
    let completion_year_max = null;
    let floor_area_m2_min = null;
    let floor_area_m2_max = null;

    projects.forEach((p) => {
      if (typeof p.completion_year === 'number') {
        if (completion_year_min === null || p.completion_year < completion_year_min) {
          completion_year_min = p.completion_year;
        }
        if (completion_year_max === null || p.completion_year > completion_year_max) {
          completion_year_max = p.completion_year;
        }
      }
      if (typeof p.floor_area_m2 === 'number') {
        if (floor_area_m2_min === null || p.floor_area_m2 < floor_area_m2_min) {
          floor_area_m2_min = p.floor_area_m2;
        }
        if (floor_area_m2_max === null || p.floor_area_m2 > floor_area_m2_max) {
          floor_area_m2_max = p.floor_area_m2;
        }
      }
    });

    const project_type_options = [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'mixed', label: 'Mixed use' }
    ];

    const scope_options = [
      { value: 'interior', label: 'Interior' },
      { value: 'exterior', label: 'Exterior' },
      { value: 'both', label: 'Interior & Exterior' }
    ];

    const season_options = [
      { value: 'winter', label: 'Winter' },
      { value: 'snow', label: 'Snow' },
      { value: 'summer', label: 'Summer' },
      { value: 'spring', label: 'Spring' },
      { value: 'autumn', label: 'Autumn' },
      { value: 'unspecified', label: 'Unspecified' }
    ];

    return {
      project_type_options,
      scope_options,
      completion_year_min,
      completion_year_max,
      floor_area_m2_min,
      floor_area_m2_max,
      season_options
    };
  }

  // searchPortfolioProjects
  searchPortfolioProjects(
    project_type_filter,
    project_type,
    scope,
    min_completion_year,
    max_completion_year,
    min_floor_area_m2,
    environment_season,
    limit,
    offset
  ) {
    let derivedProjectType = null;
    let derivedScope = null;
    if (project_type_filter) {
      const parts = String(project_type_filter).split('_');
      if (parts.length >= 2) {
        derivedProjectType = parts[0];
        derivedScope = parts[1];
      }
    }

    const typeToUse = project_type || derivedProjectType;
    const scopeToUse = scope || derivedScope;

    let projects = this._getFromStorage('portfolio_projects').filter((p) => p.is_published);

    if (typeToUse) {
      projects = projects.filter((p) => p.project_type === typeToUse);
    }

    if (scopeToUse) {
      projects = projects.filter((p) => p.scope === scopeToUse);
    }

    if (typeof min_completion_year === 'number') {
      projects = projects.filter((p) => typeof p.completion_year === 'number' && p.completion_year >= min_completion_year);
    }

    if (typeof max_completion_year === 'number') {
      projects = projects.filter((p) => typeof p.completion_year === 'number' && p.completion_year <= max_completion_year);
    }

    if (typeof min_floor_area_m2 === 'number') {
      projects = projects.filter((p) => typeof p.floor_area_m2 === 'number' && p.floor_area_m2 >= min_floor_area_m2);
    }

    if (environment_season) {
      projects = projects.filter((p) => p.environment_season === environment_season);
    }

    projects.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    const total_results = projects.length;

    const effLimit = typeof limit === 'number' ? limit : 24;
    const effOffset = typeof offset === 'number' ? offset : 0;

    const pageProjects = projects.slice(effOffset, effOffset + effLimit);

    const shortlist = this._getOrCreateProjectShortlist();
    const shortlistedSet = new Set(shortlist.project_ids || []);

    const mapped = pageProjects.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      thumbnail_url: p.thumbnail_url,
      project_category_label: p.project_category_label || '',
      project_type: p.project_type,
      scope: p.scope,
      completion_year: p.completion_year,
      floor_area_m2: typeof p.floor_area_m2 === 'number' ? p.floor_area_m2 : null,
      location: p.location || '',
      environment_season: p.environment_season || 'unspecified',
      image_count: typeof p.image_count === 'number' ? p.image_count : 0,
      is_shortlisted: shortlistedSet.has(p.id)
    }));

    return { total_results, projects: mapped };
  }

  // getPortfolioProjectDetail
  getPortfolioProjectDetail(project_slug) {
    const projects = this._getFromStorage('portfolio_projects');
    const project = projects.find((p) => p.slug === project_slug) || null;

    const allImages = this._getFromStorage('project_images');
    let images = [];
    if (project) {
      images = allImages.filter((img) => img.project_id === project.id);
      images.sort((a, b) => {
        const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return sa - sb;
      });
    }

    const shortlist = this._getOrCreateProjectShortlist();
    const is_shortlisted = project ? (shortlist.project_ids || []).includes(project.id) : false;

    // Foreign key resolution for ProjectImage.project_id -> project
    const imagesWithProject = images.map((img) =>
      Object.assign({}, img, {
        project
      })
    );

    return {
      project,
      images: imagesWithProject,
      is_shortlisted
    };
  }

  // toggleProjectInShortlist
  toggleProjectInShortlist(projectId) {
    let lists = this._getFromStorage('project_shortlist');
    if (!Array.isArray(lists)) {
      lists = [];
    }
    let shortlist = lists[0];
    if (!shortlist) {
      shortlist = {
        id: this._generateId('shortlist'),
        project_ids: [],
        updated_at: this._getCurrentTimestamp()
      };
      lists.push(shortlist);
    }

    const ids = Array.isArray(shortlist.project_ids) ? shortlist.project_ids : [];
    const index = ids.indexOf(projectId);
    let is_shortlisted;
    if (index === -1) {
      ids.push(projectId);
      is_shortlisted = true;
    } else {
      ids.splice(index, 1);
      is_shortlisted = false;
    }
    shortlist.project_ids = ids;
    shortlist.updated_at = this._getCurrentTimestamp();
    lists[0] = shortlist;
    this._saveToStorage('project_shortlist', lists);

    return {
      is_shortlisted,
      shortlist
    };
  }

  // getProjectShortlist
  getProjectShortlist() {
    const lists = this._getFromStorage('project_shortlist');
    let shortlist = lists[0];
    if (!shortlist) {
      shortlist = this._getOrCreateProjectShortlist();
    }
    const projectIds = shortlist.project_ids || [];
    const allProjects = this._getFromStorage('portfolio_projects');
    const projects = allProjects.filter((p) => projectIds.includes(p.id));

    return {
      project_shortlist: shortlist,
      projects
    };
  }

  // getBlogFilterOptions
  getBlogFilterOptions() {
    const posts = this._getFromStorage('blog_posts').filter((p) => p.is_published);
    const tagSet = new Set();
    const yearSet = new Set();

    posts.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t) => tagSet.add(t));
      }
      if (typeof p.publish_year === 'number') {
        yearSet.add(p.publish_year);
      } else if (p.publish_date) {
        const year = new Date(p.publish_date).getFullYear();
        if (!Number.isNaN(year)) {
          yearSet.add(year);
        }
      }
    });

    const tag_options = Array.from(tagSet).map((t) => ({ value: t, label: t }));
    const year_options = Array.from(yearSet).sort((a, b) => b - a);

    return { tag_options, year_options };
  }

  // searchBlogPosts
  searchBlogPosts(tag, publish_year, limit, offset) {
    let posts = this._getFromStorage('blog_posts').filter((p) => p.is_published);

    if (tag) {
      posts = posts.filter((p) => Array.isArray(p.tags) && p.tags.includes(tag));
    }

    if (typeof publish_year === 'number') {
      posts = posts.filter((p) => {
        if (typeof p.publish_year === 'number') return p.publish_year === publish_year;
        if (p.publish_date) {
          const year = new Date(p.publish_date).getFullYear();
          return year === publish_year;
        }
        return false;
      });
    }

    posts.sort((a, b) => {
      const da = a.publish_date ? new Date(a.publish_date).getTime() : 0;
      const db = b.publish_date ? new Date(b.publish_date).getTime() : 0;
      return db - da;
    });

    const total_results = posts.length;

    const effLimit = typeof limit === 'number' ? limit : 20;
    const effOffset = typeof offset === 'number' ? offset : 0;

    const pagePosts = posts.slice(effOffset, effOffset + effLimit);

    return {
      total_results,
      posts: pagePosts
    };
  }

  // getBlogPostDetail
  getBlogPostDetail(post_slug) {
    const posts = this._getFromStorage('blog_posts');
    const post = posts.find((p) => p.slug === post_slug) || null;

    const readingList = this._getOrCreateReadingList();
    const savedSet = new Set(readingList.blog_post_ids || []);
    const is_saved = post ? savedSet.has(post.id) : false;

    let related_posts = [];
    if (post && Array.isArray(post.tags) && post.tags.length > 0) {
      const tagSet = new Set(post.tags);
      related_posts = posts
        .filter((p) => p.id !== post.id && p.is_published)
        .filter((p) => Array.isArray(p.tags) && p.tags.some((t) => tagSet.has(t)));
      related_posts.sort((a, b) => {
        const da = a.publish_date ? new Date(a.publish_date).getTime() : 0;
        const db = b.publish_date ? new Date(b.publish_date).getTime() : 0;
        return db - da;
      });
      related_posts = related_posts.slice(0, 3);
    }

    return {
      post,
      is_saved,
      related_posts
    };
  }

  // toggleReadingListBlogPost
  toggleReadingListBlogPost(blogPostId) {
    let lists = this._getFromStorage('reading_list');
    if (!Array.isArray(lists)) {
      lists = [];
    }
    let readingList = lists[0];
    if (!readingList) {
      readingList = {
        id: this._generateId('reading_list'),
        blog_post_ids: [],
        updated_at: this._getCurrentTimestamp()
      };
      lists.push(readingList);
    }

    const ids = Array.isArray(readingList.blog_post_ids) ? readingList.blog_post_ids : [];
    const index = ids.indexOf(blogPostId);
    let is_saved;
    if (index === -1) {
      ids.push(blogPostId);
      is_saved = true;
    } else {
      ids.splice(index, 1);
      is_saved = false;
    }

    readingList.blog_post_ids = ids;
    readingList.updated_at = this._getCurrentTimestamp();
    lists[0] = readingList;
    this._saveToStorage('reading_list', lists);

    return {
      is_saved,
      reading_list: readingList
    };
  }

  // getReadingListSummary
  getReadingListSummary() {
    const lists = this._getFromStorage('reading_list');
    let readingList = lists[0];
    if (!readingList) {
      readingList = this._getOrCreateReadingList();
    }
    const allPosts = this._getFromStorage('blog_posts');
    const ids = readingList.blog_post_ids || [];
    const posts = allPosts.filter((p) => ids.includes(p.id));

    return {
      reading_list: readingList,
      posts
    };
  }

  // getEstimatorConfigForUI
  getEstimatorConfigForUI() {
    const configs = this._getFromStorage('estimator_configs');
    const addons = this._getFromStorage('estimator_addons').filter((a) => a.is_active !== false);
    const config = configs.length > 0 ? configs[0] : null;
    return { config, addons };
  }

  // calculateProjectCostEstimate
  calculateProjectCostEstimate(project_type, scope, floor_area_m2, add_on_ids) {
    const configs = this._getFromStorage('estimator_configs');
    const config = configs.length > 0 ? configs[0] : null;
    const allAddons = this._getFromStorage('estimator_addons').filter((a) => a.is_active !== false);

    const areaInput = typeof floor_area_m2 === 'number' ? floor_area_m2 : 0;

    let adjusted_floor_area_m2 = areaInput;
    if (config) {
      if (typeof config.min_area_m2 === 'number' && adjusted_floor_area_m2 < config.min_area_m2) {
        adjusted_floor_area_m2 = config.min_area_m2;
      }
      if (typeof config.max_area_m2 === 'number' && adjusted_floor_area_m2 > config.max_area_m2) {
        adjusted_floor_area_m2 = config.max_area_m2;
      }
      if (typeof config.area_step_m2 === 'number' && config.area_step_m2 > 0) {
        const step = config.area_step_m2;
        adjusted_floor_area_m2 = Math.round(adjusted_floor_area_m2 / step) * step;
      }
    }

    const is_within_area_limits = adjusted_floor_area_m2 === areaInput;

    let baseRate = 0;
    if (config) {
      if (project_type === 'residential' && scope === 'interior') {
        baseRate = config.base_rate_residential_interior_per_m2 || 0;
      } else if (project_type === 'residential' && scope === 'exterior') {
        baseRate = config.base_rate_residential_exterior_per_m2 || 0;
      } else if (project_type === 'commercial' && scope === 'interior') {
        baseRate = config.base_rate_commercial_interior_per_m2 || 0;
      } else if (project_type === 'commercial' && scope === 'exterior') {
        baseRate = config.base_rate_commercial_exterior_per_m2 || 0;
      } else if (scope === 'both') {
        // Approximate: average of interior + exterior when available
        let rates = [];
        if (project_type === 'residential') {
          if (typeof config.base_rate_residential_interior_per_m2 === 'number') {
            rates.push(config.base_rate_residential_interior_per_m2);
          }
          if (typeof config.base_rate_residential_exterior_per_m2 === 'number') {
            rates.push(config.base_rate_residential_exterior_per_m2);
          }
        } else if (project_type === 'commercial') {
          if (typeof config.base_rate_commercial_interior_per_m2 === 'number') {
            rates.push(config.base_rate_commercial_interior_per_m2);
          }
          if (typeof config.base_rate_commercial_exterior_per_m2 === 'number') {
            rates.push(config.base_rate_commercial_exterior_per_m2);
          }
        }
        if (rates.length > 0) {
          baseRate = rates.reduce((sum, r) => sum + r, 0) / rates.length;
        }
      }
    }

    const base_cost = baseRate * adjusted_floor_area_m2;

    const effectiveAddonIds = Array.isArray(add_on_ids) ? add_on_ids : [];

    let add_ons_cost = 0;
    effectiveAddonIds.forEach((id) => {
      const addon = allAddons.find((a) => a.id === id);
      if (!addon) return;
      if (addon.pricing_type === 'flat') {
        add_ons_cost += addon.price || 0;
      } else if (addon.pricing_type === 'per_m2') {
        add_ons_cost += (addon.price || 0) * adjusted_floor_area_m2;
      }
    });

    const total_cost = base_cost + add_ons_cost;

    const persisted = this._persistCostEstimate(
      config ? config.id : null,
      project_type,
      scope,
      adjusted_floor_area_m2,
      effectiveAddonIds,
      base_cost,
      add_ons_cost,
      total_cost
    );

    // Foreign key resolution: config_id -> config, add_on_ids -> add_ons
    const resolvedAddons = effectiveAddonIds
      .map((id) => allAddons.find((a) => a.id === id) || null)
      .filter((a) => a !== null);

    const estimateWithRelations = Object.assign({}, persisted, {
      config,
      add_ons: resolvedAddons
    });

    return {
      estimate: estimateWithRelations,
      validation: {
        is_within_area_limits,
        adjusted_floor_area_m2
      }
    };
  }

  // saveProjectCostEstimate
  saveProjectCostEstimate(email, project_type, scope, floor_area_m2, add_on_ids) {
    const result = this.calculateProjectCostEstimate(project_type, scope, floor_area_m2, add_on_ids);
    const estimate = result.estimate;

    const savedEstimates = this._getFromStorage('saved_estimates');

    const saved = {
      id: this._generateId('saved_estimate'),
      email,
      project_type,
      scope,
      floor_area_m2: estimate.floor_area_m2,
      add_on_ids: Array.isArray(estimate.add_on_ids) ? estimate.add_on_ids : [],
      base_cost: estimate.base_cost,
      add_ons_cost: estimate.add_ons_cost,
      total_cost: estimate.total_cost,
      created_at: this._getCurrentTimestamp()
    };

    savedEstimates.push(saved);
    this._saveToStorage('saved_estimates', savedEstimates);

    const allAddons = this._getFromStorage('estimator_addons');
    const resolvedAddons = (saved.add_on_ids || [])
      .map((id) => allAddons.find((a) => a.id === id) || null)
      .filter((a) => a !== null);

    const savedWithRelations = Object.assign({}, saved, {
      add_ons: resolvedAddons
    });

    return {
      success: true,
      saved_estimate: savedWithRelations,
      message: 'Estimate saved and will be emailed to you.'
    };
  }

  // getFAQCategories
  getFAQCategories() {
    return [
      { value: 'general', label: 'General' },
      { value: 'process_and_revisions', label: 'Process & Revisions' },
      { value: 'pricing', label: 'Pricing' },
      { value: 'file_delivery', label: 'File delivery' },
      { value: 'technical', label: 'Technical' }
    ];
  }

  // getFAQItems
  getFAQItems(category) {
    let items = this._getFromStorage('faq_items');
    if (category) {
      items = items.filter((item) => item.category === category);
    }
    items.sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
      return sa - sb;
    });
    return items;
  }

  // searchFAQItems
  searchFAQItems(query, category) {
    const q = String(query || '').toLowerCase();
    let items = this._getFromStorage('faq_items');
    if (category) {
      items = items.filter((item) => item.category === category);
    }
    if (q) {
      items = items.filter((item) => {
        const text = (item.question || '') + ' ' + (item.answer || '');
        return text.toLowerCase().includes(q);
      });
    }
    items.sort((a, b) => {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
      return sa - sb;
    });
    return items;
  }

  // getContactFormOptions
  getContactFormOptions() {
    const subject_options = [
      { value: 'question_about_revision_policy', label: 'Question about revision policy' },
      { value: 'general_inquiry', label: 'General inquiry' },
      { value: 'project_inquiry', label: 'Project inquiry' },
      { value: 'support', label: 'Support' }
    ];

    let studio_email = '';
    let studio_phone = '';
    let studio_address = '';

    const raw = localStorage.getItem('studio_contact_info');
    if (raw) {
      try {
        const info = JSON.parse(raw) || {};
        studio_email = info.email || '';
        studio_phone = info.phone || '';
        studio_address = info.address || '';
      } catch (e) {}
    }

    return {
      subject_options,
      studio_email,
      studio_phone,
      studio_address
    };
  }

  // submitContactMessage
  submitContactMessage(name, email, subject, message, related_faq_id) {
    const contactMessages = this._getFromStorage('contact_messages');

    const newMessage = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      related_faq_id: related_faq_id || null,
      status: 'received',
      created_at: this._getCurrentTimestamp()
    };

    contactMessages.push(newMessage);
    this._saveToStorage('contact_messages', contactMessages);

    // Foreign key resolution: related_faq_id -> related_faq
    const faqItems = this._getFromStorage('faq_items');
    const related_faq = related_faq_id ? faqItems.find((f) => f.id === related_faq_id) || null : null;

    const messageWithRelations = Object.assign({}, newMessage, {
      related_faq
    });

    return {
      success: true,
      contact_message: messageWithRelations,
      message: 'Message submitted.'
    };
  }

  // getConsultationBookingConfig
  getConsultationBookingConfig() {
    const project_type_options = [
      { value: 'interior', label: 'Interior' },
      { value: 'exterior', label: 'Exterior' },
      { value: 'mixed', label: 'Interior & Exterior' }
    ];

    const duration_options = [
      { minutes: 15, label: '15 minutes' },
      { minutes: 30, label: '30 minutes' },
      { minutes: 60, label: '60 minutes' }
    ];

    const meeting_format_options = [
      { value: 'video_call', label: 'Video call' },
      { value: 'phone_call', label: 'Phone call' },
      { value: 'in_person', label: 'In person' }
    ];

    let timezone = 'UTC';
    try {
      if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
        const opts = Intl.DateTimeFormat().resolvedOptions();
        if (opts && opts.timeZone) {
          timezone = opts.timeZone;
        }
      }
    } catch (e) {}

    return {
      project_type_options,
      duration_options,
      meeting_format_options,
      timezone
    };
  }

  // getAvailableConsultationSlots
  getAvailableConsultationSlots(date, duration_minutes, consultation_project_type) {
    const duration = typeof duration_minutes === 'number' ? duration_minutes : 30;
    const day = String(date || '').slice(0, 10); // YYYY-MM-DD

    // Working hours: 09:00 to 18:00 local time
    const startHour = 9;
    const endHour = 18;

    const toDate = (h, m) => new Date(day + 'T' + String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':00');

    const slots = [];

    let start = toDate(startHour, 0);
    const endOfDay = toDate(endHour, 0);

    const bookings = this._getFromStorage('consultation_bookings').filter(
      (b) => b.consultation_project_type === consultation_project_type
    );

    const overlapsExisting = (startDt, endDt) => {
      const startTime = startDt.getTime();
      const endTime = endDt.getTime();
      return bookings.some((b) => {
        const bStart = new Date(b.start_datetime).getTime();
        const bEnd = new Date(b.end_datetime).getTime();
        // Only compare bookings on the same date
        if (String(b.start_datetime).slice(0, 10) !== day) return false;
        return startTime < bEnd && endTime > bStart;
      });
    };

    while (start.getTime() + duration * 60000 <= endOfDay.getTime()) {
      const end = new Date(start.getTime() + duration * 60000);
      const is_available = !overlapsExisting(start, end);
      slots.push({
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        is_available
      });
      start = new Date(start.getTime() + duration * 60000);
    }

    return slots;
  }

  // createConsultationBooking
  createConsultationBooking(
    consultation_project_type,
    duration_minutes,
    start_datetime,
    contact_name,
    contact_email,
    contact_phone,
    preferred_meeting_format,
    notes
  ) {
    const bookings = this._getFromStorage('consultation_bookings');

    const duration = typeof duration_minutes === 'number' ? duration_minutes : 30;
    const start = new Date(start_datetime);
    const end = new Date(start.getTime() + duration * 60000);
    const day = start.toISOString().slice(0, 10);

    const hasOverlap = bookings.some((b) => {
      if (b.consultation_project_type !== consultation_project_type) return false;
      if (String(b.start_datetime).slice(0, 10) !== day) return false;
      const bStart = new Date(b.start_datetime).getTime();
      const bEnd = new Date(b.end_datetime).getTime();
      const s = start.getTime();
      const e = end.getTime();
      return s < bEnd && e > bStart;
    });

    if (hasOverlap) {
      return {
        success: false,
        booking: null,
        message: 'Selected time slot is no longer available.'
      };
    }

    const booking = {
      id: this._generateId('booking'),
      consultation_project_type,
      duration_minutes: duration,
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      contact_name,
      contact_email,
      contact_phone,
      preferred_meeting_format,
      notes: notes || '',
      status: 'pending',
      created_at: this._getCurrentTimestamp()
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    return {
      success: true,
      booking,
      message: 'Consultation booking created.'
    };
  }

  // getProjectBriefConfig
  getProjectBriefConfig() {
    const project_type_options = [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'mixed', label: 'Mixed use' }
    ];

    const space_type_options = [
      { value: 'office', label: 'Office' },
      { value: 'retail', label: 'Retail' },
      { value: 'hospitality', label: 'Hospitality' },
      { value: 'residential_space', label: 'Residential space' },
      { value: 'other', label: 'Other' }
    ];

    const design_style_options = [
      { value: 'minimalist', label: 'Minimalist' },
      { value: 'industrial', label: 'Industrial' },
      { value: 'scandinavian', label: 'Scandinavian' },
      { value: 'contemporary', label: 'Contemporary' },
      { value: 'classic', label: 'Classic' },
      { value: 'other', label: 'Other' }
    ];

    const mood_presets = this._getFromStorage('mood_presets');
    const mood_images = this._getFromStorage('mood_images');

    const mood_images_by_preset = mood_presets.map((preset) => ({
      preset_id: preset.id,
      images: mood_images.filter((img) => img.preset_id === preset.id)
    }));

    const budget_range_options = [
      { value: 'usd_0_20000', label: '$0–$20,000' },
      { value: 'usd_20000_40000', label: '$20,000–$40,000' },
      { value: 'usd_40000_60000', label: '$40,000–$60,000' },
      { value: 'usd_60000_plus', label: '$60,000+' }
    ];

    return {
      project_type_options,
      space_type_options,
      design_style_options,
      mood_presets,
      mood_images_by_preset,
      budget_range_options
    };
  }

  // submitProjectBrief
  submitProjectBrief(
    project_type,
    space_type,
    design_style,
    mood_preset_id,
    mood_image_ids,
    budget_range,
    description,
    contact_name,
    contact_email,
    company_name
  ) {
    const briefs = this._getFromStorage('project_briefs');

    const moodPresetId = mood_preset_id || null;
    const moodImageIds = Array.isArray(mood_image_ids) ? mood_image_ids : [];

    const brief = {
      id: this._generateId('brief'),
      project_type,
      space_type,
      design_style,
      mood_preset_id: moodPresetId,
      mood_image_ids: moodImageIds,
      budget_range,
      description,
      contact_name,
      contact_email,
      company_name: company_name || '',
      status: 'submitted',
      created_at: this._getCurrentTimestamp()
    };

    briefs.push(brief);
    this._saveToStorage('project_briefs', briefs);

    // Foreign key resolution: mood_preset_id -> mood_preset, mood_image_ids -> mood_images
    const mood_presets = this._getFromStorage('mood_presets');
    const mood_images = this._getFromStorage('mood_images');

    const mood_preset = moodPresetId ? mood_presets.find((p) => p.id === moodPresetId) || null : null;
    const mood_images_resolved = moodImageIds
      .map((id) => mood_images.find((img) => img.id === id) || null)
      .filter((img) => img !== null);

    const briefWithRelations = Object.assign({}, brief, {
      mood_preset,
      mood_images: mood_images_resolved
    });

    return {
      success: true,
      project_brief: briefWithRelations,
      message: 'Project brief submitted.'
    };
  }

  // getNewsletterOptions
  getNewsletterOptions() {
    const role_options = [
      { value: 'architect', label: 'Architect' },
      { value: 'interior_designer', label: 'Interior designer' },
      { value: 'developer', label: 'Developer' },
      { value: 'student', label: 'Student' },
      { value: 'other', label: 'Other' }
    ];

    const frequency_options = [
      { value: 'weekly', label: 'Weekly' },
      { value: 'bi_weekly', label: 'Every 2 weeks' },
      { value: 'monthly_digest', label: 'Monthly digest' }
    ];

    const interest_options = [
      { value: 'interior_rendering', label: 'Interior rendering' },
      { value: 'exterior_rendering', label: 'Exterior rendering' },
      { value: 'animation_walkthroughs', label: 'Animation & walkthroughs' },
      { value: 'vr_ar', label: 'VR/AR' }
    ];

    return {
      role_options,
      frequency_options,
      interest_options
    };
  }

  // subscribeToNewsletter
  subscribeToNewsletter(email, role, frequency, interests) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');

    const subscription = {
      id: this._generateId('newsletter'),
      email,
      role,
      frequency,
      interests: Array.isArray(interests) ? interests : [],
      is_active: true,
      created_at: this._getCurrentTimestamp()
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription,
      message: 'Subscribed to newsletter.'
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    let data = {};
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      try {
        data = JSON.parse(raw) || {};
      } catch (e) {
        data = {};
      }
    }

    return {
      history: data.history || '',
      mission: data.mission || '',
      specialization: data.specialization || '',
      process_summary: Array.isArray(data.process_summary) ? data.process_summary : [],
      team_members: Array.isArray(data.team_members) ? data.team_members : []
    };
  }

  // getTermsOfServiceContent
  getTermsOfServiceContent() {
    let data = {};
    const raw = localStorage.getItem('terms_of_service_content');
    if (raw) {
      try {
        data = JSON.parse(raw) || {};
      } catch (e) {
        data = {};
      }
    }

    return {
      last_updated: data.last_updated || '',
      content_html: data.content_html || ''
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    let data = {};
    const raw = localStorage.getItem('privacy_policy_content');
    if (raw) {
      try {
        data = JSON.parse(raw) || {};
      } catch (e) {
        data = {};
      }
    }

    return {
      last_updated: data.last_updated || '',
      content_html: data.content_html || ''
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
