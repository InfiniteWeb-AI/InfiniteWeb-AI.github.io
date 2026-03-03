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
  }

  // ---------- Storage helpers ----------

  _initStorage() {
    // Initialize all data tables in localStorage if not present
    const tables = [
      'packages',
      'package_shortlists',
      'package_shortlist_items',
      'package_compare_sets',
      'package_compare_items',
      'quote_requests',
      'consultation_bookings',
      'projects',
      'ideas_lists',
      'ideas_list_items',
      'cost_estimates',
      'cost_estimate_emails',
      'articles',
      'reading_lists',
      'reading_list_items',
      'faq_items',
      'contact_messages',
      'renovation_plans',
      'renovation_plan_projects'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Session-like pointers
    if (!localStorage.getItem('currentPackageShortlistId')) {
      localStorage.setItem('currentPackageShortlistId', '');
    }
    if (!localStorage.getItem('activePackageCompareSetId')) {
      localStorage.setItem('activePackageCompareSetId', '');
    }
    if (!localStorage.getItem('currentIdeasListId')) {
      localStorage.setItem('currentIdeasListId', '');
    }
    if (!localStorage.getItem('currentReadingListId')) {
      localStorage.setItem('currentReadingListId', '');
    }
    if (!localStorage.getItem('currentRenovationPlanId')) {
      localStorage.setItem('currentRenovationPlanId', '');
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

  _nowISO() {
    return new Date().toISOString();
  }

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  _toNumber(value) {
    const n = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(n) ? 0 : n;
  }

  _isWeekday(date) {
    const d = date.getDay();
    return d >= 1 && d <= 5; // Mon-Fri
  }

  _labelFromEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  // ---------- Helper functions required by spec ----------

  // Package shortlist
  _getOrCreatePackageShortlist() {
    const now = this._nowISO();
    let shortlists = this._getFromStorage('package_shortlists');
    let shortlistId = localStorage.getItem('currentPackageShortlistId') || '';
    let shortlist = null;

    if (shortlistId) {
      for (let i = 0; i < shortlists.length; i++) {
        if (shortlists[i].id === shortlistId) {
          shortlist = shortlists[i];
          break;
        }
      }
    }

    if (!shortlist) {
      shortlist = {
        id: this._generateId('shortlist'),
        created_at: now,
        updated_at: now
      };
      shortlists.push(shortlist);
      this._saveToStorage('package_shortlists', shortlists);
      localStorage.setItem('currentPackageShortlistId', shortlist.id);
    }

    const allItems = this._getFromStorage('package_shortlist_items');
    const items = [];
    for (let j = 0; j < allItems.length; j++) {
      if (allItems[j].shortlist_id === shortlist.id) {
        items.push(allItems[j]);
      }
    }

    return { shortlist: shortlist, items: items };
  }

  // Package compare set
  _getOrCreatePackageCompareSet() {
    const now = this._nowISO();
    let compareSets = this._getFromStorage('package_compare_sets');
    let activeId = localStorage.getItem('activePackageCompareSetId') || '';
    let activeSet = null;

    if (activeId) {
      for (let i = 0; i < compareSets.length; i++) {
        if (compareSets[i].id === activeId && compareSets[i].is_active) {
          activeSet = compareSets[i];
          break;
        }
      }
    }

    if (!activeSet) {
      // deactivate previous ones
      for (let i = 0; i < compareSets.length; i++) {
        compareSets[i].is_active = false;
      }
      activeSet = {
        id: this._generateId('compare_set'),
        created_at: now,
        is_active: true
      };
      compareSets.push(activeSet);
      this._saveToStorage('package_compare_sets', compareSets);
      localStorage.setItem('activePackageCompareSetId', activeSet.id);
    }

    const allItems = this._getFromStorage('package_compare_items');
    const items = [];
    for (let j = 0; j < allItems.length; j++) {
      if (allItems[j].compare_set_id === activeSet.id) {
        items.push(allItems[j]);
      }
    }

    return { compareSet: activeSet, items: items };
  }

  // Ideas list
  _getOrCreateIdeasList() {
    const now = this._nowISO();
    let ideasLists = this._getFromStorage('ideas_lists');
    let ideasListId = localStorage.getItem('currentIdeasListId') || '';
    let ideasList = null;

    if (ideasListId) {
      for (let i = 0; i < ideasLists.length; i++) {
        if (ideasLists[i].id === ideasListId) {
          ideasList = ideasLists[i];
          break;
        }
      }
    }

    if (!ideasList) {
      ideasList = {
        id: this._generateId('ideas_list'),
        created_at: now,
        updated_at: now
      };
      ideasLists.push(ideasList);
      this._saveToStorage('ideas_lists', ideasLists);
      localStorage.setItem('currentIdeasListId', ideasList.id);
    }

    const allItems = this._getFromStorage('ideas_list_items');
    const items = [];
    for (let j = 0; j < allItems.length; j++) {
      if (allItems[j].ideas_list_id === ideasList.id) {
        items.push(allItems[j]);
      }
    }

    return { ideasList: ideasList, items: items };
  }

  // Reading list
  _getOrCreateReadingList() {
    const now = this._nowISO();
    let readingLists = this._getFromStorage('reading_lists');
    let readingListId = localStorage.getItem('currentReadingListId') || '';
    let readingList = null;

    if (readingListId) {
      for (let i = 0; i < readingLists.length; i++) {
        if (readingLists[i].id === readingListId) {
          readingList = readingLists[i];
          break;
        }
      }
    }

    if (!readingList) {
      readingList = {
        id: this._generateId('reading_list'),
        created_at: now,
        updated_at: now
      };
      readingLists.push(readingList);
      this._saveToStorage('reading_lists', readingLists);
      localStorage.setItem('currentReadingListId', readingList.id);
    }

    const allItems = this._getFromStorage('reading_list_items');
    const items = [];
    for (let j = 0; j < allItems.length; j++) {
      if (allItems[j].reading_list_id === readingList.id) {
        items.push(allItems[j]);
      }
    }

    return { readingList: readingList, items: items };
  }

  // Renovation plan draft
  _getOrCreateRenovationPlanDraft() {
    const now = this._nowISO();
    let plans = this._getFromStorage('renovation_plans');
    let planId = localStorage.getItem('currentRenovationPlanId') || '';
    let plan = null;

    if (planId) {
      for (let i = 0; i < plans.length; i++) {
        if (plans[i].id === planId) {
          plan = plans[i];
          break;
        }
      }
    }

    if (!plan || plan.status === 'submitted') {
      plan = {
        id: this._generateId('plan'),
        created_at: now,
        submitted_at: null,
        name: '',
        email: '',
        phone: '',
        postcode: '',
        total_budget: 0,
        status: 'draft'
      };
      plans.push(plan);
      this._saveToStorage('renovation_plans', plans);
      localStorage.setItem('currentRenovationPlanId', plan.id);
    }

    const allProjects = this._getFromStorage('renovation_plan_projects');
    const projects = [];
    for (let j = 0; j < allProjects.length; j++) {
      if (allProjects[j].plan_id === plan.id) {
        projects.push(allProjects[j]);
      }
    }

    // Sort by order_index if present
    projects.sort(function (a, b) {
      const ai = typeof a.order_index === 'number' ? a.order_index : 0;
      const bi = typeof b.order_index === 'number' ? b.order_index : 0;
      return ai - bi;
    });

    // Update total budget
    let total = 0;
    for (let k = 0; k < projects.length; k++) {
      total += this._toNumber(projects[k].budget);
    }
    plan.total_budget = total;
    this._saveToStorage('renovation_plans', plans);

    return { plan: plan, projects: projects };
  }

  // Cost estimate calculator core
  _calculateCostEstimate(project_type, bedrooms, bathrooms, finish_level, budget) {
    const basePerBedroom = 30000; // AUD
    const basePerBathroom = 20000;
    const typeMultiplierMap = {
      rear_extension: 1.1,
      deck_extension: 0.8,
      loft_conversion: 1.15,
      kitchen_renovation: 1.0,
      bathroom_renovation: 0.9,
      full_home_renovation: 1.2,
      other: 1.0
    };
    const finishMultiplierMap = {
      basic: 0.9,
      mid_range: 1.0,
      premium: 1.25
    };

    const typeMul = typeMultiplierMap[project_type] || 1.0;
    const finishMul = finishMultiplierMap[finish_level] || 1.0;

    const b = this._toNumber(bedrooms);
    const ba = this._toNumber(bathrooms);
    const budgetNum = this._toNumber(budget);

    let estimate = (b * basePerBedroom + ba * basePerBathroom) * typeMul * finishMul;

    // Nudge estimate towards user budget (simple heuristic)
    if (budgetNum > 0) {
      estimate = (estimate * 0.7) + (budgetNum * 0.3);
    }

    estimate = Math.round(estimate / 1000) * 1000; // round to nearest 1k

    const breakdownItems = [
      {
        label: 'Structural & building works',
        amount: Math.round(estimate * 0.4)
      },
      {
        label: 'Kitchens, bathrooms & joinery',
        amount: Math.round(estimate * 0.3)
      },
      {
        label: 'Finishes & fixtures',
        amount: Math.round(estimate * 0.2)
      },
      {
        label: 'Design, permits & contingency',
        amount: estimate - Math.round(estimate * 0.4) - Math.round(estimate * 0.3) - Math.round(estimate * 0.2)
      }
    ];

    const notes = 'Estimate is indicative only and subject to site inspection and detailed scope.';

    return { estimated_cost: estimate, breakdown_items: breakdownItems, notes: notes };
  }

  // Consultation slot validation
  _validateConsultationSlot(packageId, project_type, consultation_date, time_slot_label, time_of_day) {
    const dateObj = new Date(consultation_date);
    if (isNaN(dateObj.getTime())) {
      return { valid: false, reason: 'Invalid consultation date.' };
    }

    if (!this._isWeekday(dateObj)) {
      return { valid: false, reason: 'Consultation date must be on a weekday.' };
    }

    if (time_of_day !== 'morning' && time_of_day !== 'afternoon' && time_of_day !== 'evening') {
      return { valid: false, reason: 'Invalid time of day.' };
    }

    const bookings = this._getFromStorage('consultation_bookings');
    const dateISO = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD

    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      const bDate = (b.consultation_date || '').slice(0, 10);
      if (
        b.package_id === packageId &&
        b.project_type === project_type &&
        bDate === dateISO &&
        b.time_slot_label === time_slot_label &&
        b.status !== 'cancelled'
      ) {
        return { valid: false, reason: 'Selected consultation slot is no longer available.' };
      }
    }

    return { valid: true, reason: '' };
  }

  // Apply filters and sorting for packages
  _applyPackageFiltersAndSorting(packages, filters, sort_by) {
    let result = [];
    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (filters) {
        if (filters.extension_type && p.extension_type && p.extension_type !== filters.extension_type) {
          continue;
        }
        if (filters.project_type && p.project_type !== filters.project_type) {
          continue;
        }
        if (typeof filters.min_size_sqm === 'number' && p.size_sqm != null && p.size_sqm < filters.min_size_sqm) {
          continue;
        }
        if (typeof filters.max_size_sqm === 'number' && p.size_sqm != null && p.size_sqm > filters.max_size_sqm) {
          continue;
        }
        if (typeof filters.min_price === 'number' && p.price < filters.min_price) {
          continue;
        }
        if (typeof filters.max_price === 'number' && p.price > filters.max_price) {
          continue;
        }
      }
      result.push(p);
    }

    const sortKey = sort_by || null;

    result.sort(function (a, b) {
      if (sortKey === 'price_asc') {
        return a.price - b.price;
      }
      if (sortKey === 'price_desc') {
        return b.price - a.price;
      }
      if (sortKey === 'size_desc') {
        const as = a.size_sqm || 0;
        const bs = b.size_sqm || 0;
        return bs - as;
      }
      if (sortKey === 'rating_desc') {
        const ar = a.rating || 0;
        const br = b.rating || 0;
        return br - ar;
      }
      // default - no change
      return 0;
    });

    return result;
  }

  // Apply filters and sorting for projects
  _applyProjectFiltersAndSorting(projects, filters, sort_by) {
    let result = [];
    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      if (filters) {
        if (filters.project_type && p.project_type !== filters.project_type) {
          continue;
        }
        if (typeof filters.min_completion_year === 'number' && p.completion_year < filters.min_completion_year) {
          continue;
        }
        if (typeof filters.max_completion_year === 'number' && p.completion_year > filters.max_completion_year) {
          continue;
        }
        if (typeof filters.min_rating === 'number' && p.rating < filters.min_rating) {
          continue;
        }
        if (filters.location && p.location && p.location !== filters.location) {
          continue;
        }
      }
      result.push(p);
    }

    const sortKey = sort_by || null;

    result.sort(function (a, b) {
      if (sortKey === 'rating_desc') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortKey === 'year_desc') {
        return (b.completion_year || 0) - (a.completion_year || 0);
      }
      if (sortKey === 'year_asc') {
        return (a.completion_year || 0) - (b.completion_year || 0);
      }
      return 0;
    });

    return result;
  }

  // Contact message source normalization
  _recordContactMessageSource(source_page, related_faq_id) {
    const allowedSources = ['contact_page', 'faq_page', 'other'];
    let source = source_page || 'other';
    if (allowedSources.indexOf(source) === -1) {
      source = 'other';
    }

    let faqId = related_faq_id || null;
    if (faqId) {
      const faqs = this._getFromStorage('faq_items');
      let exists = false;
      for (let i = 0; i < faqs.length; i++) {
        if (faqs[i].id === faqId) {
          exists = true;
          break;
        }
      }
      if (!exists) {
        faqId = null;
      }
    }

    return { source_page: source, related_faq_id: faqId };
  }

  // ---------- Core interface implementations ----------

  // Homepage overview
  getHomepageOverview() {
    const packages = this._getFromStorage('packages');
    const projects = this._getFromStorage('projects');
    const articles = this._getFromStorage('articles');
    const faqs = this._getFromStorage('faq_items');

    // core_services derived from available packages (unique by project_type & category_id)
    const coreServiceMap = {};
    for (let i = 0; i < packages.length; i++) {
      const p = packages[i];
      if (!p.is_active) continue;
      const key = p.category_id + '|' + p.project_type;
      if (!coreServiceMap[key]) {
        coreServiceMap[key] = {
          id: key,
          label: this._labelFromEnum(p.project_type),
          category_id: p.category_id,
          project_type: p.project_type,
          description: p.description || ''
        };
      }
    }
    const core_services = Object.keys(coreServiceMap).map(function (k) {
      return coreServiceMap[k];
    });

    const featured_packages = [];
    for (let j = 0; j < packages.length; j++) {
      if (packages[j].is_featured && packages[j].is_active) {
        featured_packages.push(packages[j]);
      }
    }

    const featured_projects = [];
    for (let k = 0; k < projects.length; k++) {
      if (projects[k].is_featured) {
        featured_projects.push(projects[k]);
      }
    }

    // recent articles - published & newest first
    const publishedArticles = [];
    for (let i2 = 0; i2 < articles.length; i2++) {
      if (articles[i2].is_published) {
        publishedArticles.push(articles[i2]);
      }
    }
    publishedArticles.sort(function (a, b) {
      const ad = new Date(a.published_at).getTime();
      const bd = new Date(b.published_at).getTime();
      return bd - ad;
    });
    const recent_articles = publishedArticles.slice(0, 3);

    // FAQ highlights - by sort_order then first few
    const faqsCopy = faqs.slice();
    faqsCopy.sort(function (a, b) {
      const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
      return ao - bo;
    });
    const faq_highlights = faqsCopy.slice(0, 5);

    const contact_summary = {
      phone: '+61 0 0000 0000',
      email: 'info@examplebuilder.com',
      service_area_note: 'Servicing metropolitan and greater area suburbs.'
    };

    return {
      hero_summary: {
        headline: 'Renovations, extensions and conversions made simple.',
        subheadline: 'Plan, price and manage your home renovation in one place.'
      },
      core_services: core_services,
      featured_packages: featured_packages,
      featured_projects: featured_projects,
      recent_articles: recent_articles,
      faq_highlights: faq_highlights,
      contact_summary: contact_summary,
      calculator_cta_label: 'Get an instant renovation estimate',
      plan_builder_cta_label: 'Build your multi-project renovation plan'
    };
  }

  // Package filter options
  getPackageFilterOptions(categoryId) {
    const packages = this._getFromStorage('packages');
    const relevant = [];
    for (let i = 0; i < packages.length; i++) {
      if (packages[i].category_id === categoryId && packages[i].is_active) {
        relevant.push(packages[i]);
      }
    }

    const extensionTypeSet = {};
    let minSize = null;
    let maxSize = null;
    let minPrice = null;
    let maxPrice = null;

    for (let j = 0; j < relevant.length; j++) {
      const p = relevant[j];
      if (categoryId === 'extensions' && p.extension_type && p.extension_type !== 'not_applicable') {
        extensionTypeSet[p.extension_type] = true;
      }

      if (typeof p.size_sqm === 'number') {
        if (minSize === null || p.size_sqm < minSize) minSize = p.size_sqm;
        if (maxSize === null || p.size_sqm > maxSize) maxSize = p.size_sqm;
      }

      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
    }

    const extension_types = Object.keys(extensionTypeSet).map(function (value) {
      return { value: value, label: value.split('_').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' ') };
    });

    const size_sqm_range = {
      min: minSize != null ? minSize : 0,
      max: maxSize != null ? maxSize : 0,
      step: 1
    };

    const price_range = {
      min: minPrice != null ? minPrice : 0,
      max: maxPrice != null ? maxPrice : 0,
      step: 1000,
      currency: 'aud'
    };

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'size_desc', label: 'Size: Largest first' },
      { value: 'rating_desc', label: 'Rating: High to Low' }
    ];

    return {
      extension_types: extension_types,
      size_sqm_range: size_sqm_range,
      price_range: price_range,
      sort_options: sort_options
    };
  }

  // List packages
  listPackages(categoryId, filters, sort_by, page, page_size) {
    const all = this._getFromStorage('packages');
    const filteredByCategory = [];
    for (let i = 0; i < all.length; i++) {
      if (all[i].category_id === categoryId && all[i].is_active) {
        filteredByCategory.push(all[i]);
      }
    }

    const appliedFilters = filters || {};
    const sortedFiltered = this._applyPackageFiltersAndSorting(filteredByCategory, filters || {}, sort_by);

    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const items = sortedFiltered.slice(start, start + ps);

    return {
      items: items,
      total_count: sortedFiltered.length,
      page: p,
      page_size: ps,
      applied_filters: {
        extension_type: appliedFilters.extension_type || null,
        project_type: appliedFilters.project_type || null,
        min_size_sqm: typeof appliedFilters.min_size_sqm === 'number' ? appliedFilters.min_size_sqm : null,
        max_size_sqm: typeof appliedFilters.max_size_sqm === 'number' ? appliedFilters.max_size_sqm : null,
        min_price: typeof appliedFilters.min_price === 'number' ? appliedFilters.min_price : null,
        max_price: typeof appliedFilters.max_price === 'number' ? appliedFilters.max_price : null
      },
      sort_by: sort_by || null
    };
  }

  // Package details
  getPackageDetails(packageId) {
    const packages = this._getFromStorage('packages');
    let pkg = null;
    for (let i = 0; i < packages.length; i++) {
      if (packages[i].id === packageId) {
        pkg = packages[i];
        break;
      }
    }

    let related = [];
    if (pkg) {
      for (let j = 0; j < packages.length; j++) {
        const p = packages[j];
        if (!p.is_active) continue;
        if (p.id === pkg.id) continue;
        if (p.category_id === pkg.category_id && p.project_type === pkg.project_type) {
          related.push(p);
        }
      }
      // sort related by price ascending
      related.sort(function (a, b) { return a.price - b.price; });
      related = related.slice(0, 4);
    }

    return {
      package: pkg,
      related_packages: related
    };
  }

  // Shortlist operations
  addPackageToShortlist(packageId) {
    const packages = this._getFromStorage('packages');
    let pkg = null;
    for (let i = 0; i < packages.length; i++) {
      if (packages[i].id === packageId && packages[i].is_active) {
        pkg = packages[i];
        break;
      }
    }
    if (!pkg) {
      return { success: false, message: 'Package not found or inactive.', shortlist: [] };
    }

    const now = this._nowISO();
    const ctx = this._getOrCreatePackageShortlist();
    const shortlist = ctx.shortlist;
    const existingItems = ctx.items;

    for (let j = 0; j < existingItems.length; j++) {
      if (existingItems[j].package_id === packageId) {
        // already in shortlist
        const packagesInShortlist = this._packagesForShortlist(shortlist.id);
        return { success: true, message: 'Package already in shortlist.', shortlist: packagesInShortlist };
      }
    }

    const allItems = this._getFromStorage('package_shortlist_items');
    const newItem = {
      id: this._generateId('shortlist_item'),
      shortlist_id: shortlist.id,
      package_id: packageId,
      added_at: now
    };
    allItems.push(newItem);
    this._saveToStorage('package_shortlist_items', allItems);

    // Update shortlist updated_at
    let shortlists = this._getFromStorage('package_shortlists');
    for (let k = 0; k < shortlists.length; k++) {
      if (shortlists[k].id === shortlist.id) {
        shortlists[k].updated_at = now;
        break;
      }
    }
    this._saveToStorage('package_shortlists', shortlists);

    const packagesInShortlist = this._packagesForShortlist(shortlist.id);
    return { success: true, message: 'Package added to shortlist.', shortlist: packagesInShortlist };
  }

  removePackageFromShortlist(packageId) {
    const ctx = this._getOrCreatePackageShortlist();
    const shortlist = ctx.shortlist;

    const allItems = this._getFromStorage('package_shortlist_items');
    const newAll = [];
    let removed = false;
    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i];
      if (it.shortlist_id === shortlist.id && it.package_id === packageId) {
        removed = true;
        continue;
      }
      newAll.push(it);
    }
    this._saveToStorage('package_shortlist_items', newAll);

    const packagesInShortlist = this._packagesForShortlist(shortlist.id);
    return {
      success: removed,
      message: removed ? 'Package removed from shortlist.' : 'Package was not in shortlist.',
      shortlist: packagesInShortlist
    };
  }

  getPackageShortlist() {
    const ctx = this._getOrCreatePackageShortlist();
    const packagesInShortlist = this._packagesForShortlist(ctx.shortlist.id);
    return {
      items: packagesInShortlist,
      total_count: packagesInShortlist.length
    };
  }

  _packagesForShortlist(shortlistId) {
    const allItems = this._getFromStorage('package_shortlist_items');
    const packages = this._getFromStorage('packages');
    const ids = [];
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].shortlist_id === shortlistId) {
        ids.push(allItems[i].package_id);
      }
    }
    const result = [];
    for (let j = 0; j < packages.length; j++) {
      if (ids.indexOf(packages[j].id) !== -1) {
        result.push(packages[j]);
      }
    }
    return result;
  }

  // Compare
  addPackageToCompare(packageId) {
    const packages = this._getFromStorage('packages');
    let pkg = null;
    for (let i = 0; i < packages.length; i++) {
      if (packages[i].id === packageId && packages[i].is_active) {
        pkg = packages[i];
        break;
      }
    }
    if (!pkg) {
      return { success: false, message: 'Package not found or inactive.', compare_set_id: null, items: [], is_full: false };
    }

    const MAX_ITEMS = 4;
    const now = this._nowISO();
    const ctx = this._getOrCreatePackageCompareSet();
    const compareSet = ctx.compareSet;
    const existingItems = ctx.items;

    for (let j = 0; j < existingItems.length; j++) {
      if (existingItems[j].package_id === packageId) {
        const pkgs = this._packagesForCompareSet(compareSet.id);
        return { success: true, message: 'Package already in comparison.', compare_set_id: compareSet.id, items: pkgs, is_full: existingItems.length >= MAX_ITEMS };
      }
    }

    if (existingItems.length >= MAX_ITEMS) {
      const pkgs = this._packagesForCompareSet(compareSet.id);
      return { success: false, message: 'Comparison set is full.', compare_set_id: compareSet.id, items: pkgs, is_full: true };
    }

    const allItems = this._getFromStorage('package_compare_items');
    const newItem = {
      id: this._generateId('compare_item'),
      compare_set_id: compareSet.id,
      package_id: packageId,
      added_at: now
    };
    allItems.push(newItem);
    this._saveToStorage('package_compare_items', allItems);

    const pkgs = this._packagesForCompareSet(compareSet.id);
    return { success: true, message: 'Package added to comparison.', compare_set_id: compareSet.id, items: pkgs, is_full: pkgs.length >= MAX_ITEMS };
  }

  removePackageFromCompare(packageId) {
    const ctx = this._getOrCreatePackageCompareSet();
    const compareSet = ctx.compareSet;
    const allItems = this._getFromStorage('package_compare_items');
    const newAll = [];
    let removed = false;
    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i];
      if (it.compare_set_id === compareSet.id && it.package_id === packageId) {
        removed = true;
        continue;
      }
      newAll.push(it);
    }
    this._saveToStorage('package_compare_items', newAll);

    const pkgs = this._packagesForCompareSet(compareSet.id);
    return { success: removed, message: removed ? 'Package removed from comparison.' : 'Package not in comparison.', compare_set_id: compareSet.id, items: pkgs };
  }

  getActiveCompareSet() {
    const ctx = this._getOrCreatePackageCompareSet();
    const compareSet = ctx.compareSet;
    const pkgs = this._packagesForCompareSet(compareSet.id);
    return {
      compare_set_id: compareSet.id,
      created_at: compareSet.created_at,
      items: pkgs
    };
  }

  _packagesForCompareSet(compareSetId) {
    const allItems = this._getFromStorage('package_compare_items');
    const packages = this._getFromStorage('packages');
    const ids = [];
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].compare_set_id === compareSetId) {
        ids.push(allItems[i].package_id);
      }
    }
    const result = [];
    for (let j = 0; j < packages.length; j++) {
      if (ids.indexOf(packages[j].id) !== -1) {
        result.push(packages[j]);
      }
    }
    return result;
  }

  // Quote request
  submitQuoteRequest(packageId, customer_name, email, phone, postcode, budget, note) {
    const packages = this._getFromStorage('packages');
    let pkg = null;
    for (let i = 0; i < packages.length; i++) {
      if (packages[i].id === packageId && packages[i].is_active) {
        pkg = packages[i];
        break;
      }
    }
    if (!pkg) {
      return { success: false, message: 'Package not found or inactive.', quote_request: null };
    }

    const now = this._nowISO();
    const quotes = this._getFromStorage('quote_requests');
    const qr = {
      id: this._generateId('quote'),
      package_id: pkg.id,
      package_name_snapshot: pkg.name,
      created_at: now,
      customer_name: customer_name,
      email: email,
      phone: phone,
      postcode: postcode,
      budget: this._toNumber(budget),
      note: note || '',
      status: 'new'
    };
    quotes.push(qr);
    this._saveToStorage('quote_requests', quotes);

    // Return with resolved package for convenience (not persisted in record)
    const qrWithResolved = this._clone(qr);
    qrWithResolved.package = pkg;

    return { success: true, message: 'Quote request submitted.', quote_request: qrWithResolved };
  }

  // Consultation availability
  getConsultationAvailability(packageId, project_type, from_date, to_date) {
    const from = new Date(from_date);
    const to = new Date(to_date);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) {
      return { slots: [] };
    }

    const bookings = this._getFromStorage('consultation_bookings');

    // predefined slots per day
    const dailySlots = [
      { label: '9:00 am', tod: 'morning' },
      { label: '11:00 am', tod: 'morning' },
      { label: '2:00 pm', tod: 'afternoon' },
      { label: '3:00 pm', tod: 'afternoon' },
      { label: '6:00 pm', tod: 'evening' }
    ];

    const slots = [];
    for (let d = new Date(from.getTime()); d <= to; d.setDate(d.getDate() + 1)) {
      const isWeekday = this._isWeekday(d);
      const dateISO = d.toISOString().slice(0, 10);
      for (let i = 0; i < dailySlots.length; i++) {
        const slot = dailySlots[i];
        let available = isWeekday;
        if (available) {
          for (let j = 0; j < bookings.length; j++) {
            const b = bookings[j];
            if (b.package_id !== packageId || b.project_type !== project_type) continue;
            const bDate = (b.consultation_date || '').slice(0, 10);
            if (bDate === dateISO && b.time_slot_label === slot.label && b.status !== 'cancelled') {
              available = false;
              break;
            }
          }
        }
        slots.push({
          date: dateISO,
          time_slot_label: slot.label,
          time_of_day: slot.tod,
          is_weekday: isWeekday,
          is_available: available
        });
      }
    }

    return { slots: slots };
  }

  // Consultation booking
  submitConsultationBooking(packageId, project_type, consultation_date, time_slot_label, time_of_day, customer_name, email, phone) {
    const packages = this._getFromStorage('packages');
    let pkg = null;
    for (let i = 0; i < packages.length; i++) {
      if (packages[i].id === packageId && packages[i].is_active) {
        pkg = packages[i];
        break;
      }
    }
    if (!pkg) {
      return { success: false, message: 'Package not found or inactive.', booking: null };
    }

    const validation = this._validateConsultationSlot(packageId, project_type, consultation_date, time_slot_label, time_of_day);
    if (!validation.valid) {
      return { success: false, message: validation.reason, booking: null };
    }

    const now = this._nowISO();
    const bookings = this._getFromStorage('consultation_bookings');
    const booking = {
      id: this._generateId('booking'),
      package_id: pkg.id,
      package_name_snapshot: pkg.name,
      project_type: project_type,
      consultation_date: new Date(consultation_date).toISOString(),
      time_slot_label: time_slot_label,
      time_of_day: time_of_day,
      status: 'pending',
      customer_name: customer_name,
      email: email,
      phone: phone,
      created_at: now
    };
    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    const bookingWithResolved = this._clone(booking);
    bookingWithResolved.package = pkg;

    return { success: true, message: 'Consultation booking submitted.', booking: bookingWithResolved };
  }

  // Project filter options
  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects');
    const projectTypeSet = {};
    let minYear = null;
    let maxYear = null;
    const ratingSet = {};
    const locationSet = {};

    for (let i = 0; i < projects.length; i++) {
      const p = projects[i];
      projectTypeSet[p.project_type] = true;
      if (typeof p.completion_year === 'number') {
        if (minYear === null || p.completion_year < minYear) minYear = p.completion_year;
        if (maxYear === null || p.completion_year > maxYear) maxYear = p.completion_year;
      }
      if (typeof p.rating === 'number') {
        ratingSet[p.rating] = true;
      }
      if (p.location) {
        locationSet[p.location] = true;
      }
    }

    const project_types = Object.keys(projectTypeSet).map(function (value) {
      return { value: value, label: value.split('_').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' ') };
    });

    const completion_year_range = {
      min: minYear != null ? minYear : 0,
      max: maxYear != null ? maxYear : 0
    };

    const rating_options = Object.keys(ratingSet).map(function (k) { return parseFloat(k); }).sort(function (a, b) { return b - a; });
    const locations = Object.keys(locationSet);

    const sort_options = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'year_desc', label: 'Newest first' },
      { value: 'year_asc', label: 'Oldest first' }
    ];

    return {
      project_types: project_types,
      completion_year_range: completion_year_range,
      rating_options: rating_options,
      locations: locations,
      sort_options: sort_options
    };
  }

  // List projects
  listProjects(filters, sort_by, page, page_size) {
    const projects = this._getFromStorage('projects');
    const filtered = this._applyProjectFiltersAndSorting(projects, filters || {}, sort_by);

    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const items = filtered.slice(start, start + ps);

    const applied = filters || {};

    return {
      items: items,
      total_count: filtered.length,
      page: p,
      page_size: ps,
      applied_filters: {
        project_type: applied.project_type || null,
        min_completion_year: typeof applied.min_completion_year === 'number' ? applied.min_completion_year : null,
        max_completion_year: typeof applied.max_completion_year === 'number' ? applied.max_completion_year : null,
        min_rating: typeof applied.min_rating === 'number' ? applied.min_rating : null,
        location: applied.location || null
      },
      sort_by: sort_by || null
    };
  }

  // Project details
  getProjectDetails(projectId) {
    const projects = this._getFromStorage('projects');
    let proj = null;
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].id === projectId) {
        proj = projects[i];
        break;
      }
    }

    let related = [];
    if (proj) {
      for (let j = 0; j < projects.length; j++) {
        const p = projects[j];
        if (p.id === proj.id) continue;
        if (p.project_type === proj.project_type) {
          related.push(p);
        }
      }
      related.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
      related = related.slice(0, 4);
    }

    return {
      project: proj,
      related_projects: related
    };
  }

  // Ideas list operations
  addProjectToIdeas(projectId) {
    const projects = this._getFromStorage('projects');
    let proj = null;
    for (let i = 0; i < projects.length; i++) {
      if (projects[i].id === projectId) {
        proj = projects[i];
        break;
      }
    }
    if (!proj) {
      return { success: false, message: 'Project not found.', ideas: [] };
    }

    const now = this._nowISO();
    const ctx = this._getOrCreateIdeasList();
    const ideasList = ctx.ideasList;
    const existingItems = ctx.items;

    for (let j = 0; j < existingItems.length; j++) {
      if (existingItems[j].project_id === projectId) {
        const projectsInIdeas = this._projectsForIdeasList(ideasList.id);
        return { success: true, message: 'Project already in Ideas list.', ideas: projectsInIdeas };
      }
    }

    const allItems = this._getFromStorage('ideas_list_items');
    const newItem = {
      id: this._generateId('ideas_item'),
      ideas_list_id: ideasList.id,
      project_id: projectId,
      added_at: now
    };
    allItems.push(newItem);
    this._saveToStorage('ideas_list_items', allItems);

    // update ideas list updated_at
    let lists = this._getFromStorage('ideas_lists');
    for (let k = 0; k < lists.length; k++) {
      if (lists[k].id === ideasList.id) {
        lists[k].updated_at = now;
        break;
      }
    }
    this._saveToStorage('ideas_lists', lists);

    const projectsInIdeas = this._projectsForIdeasList(ideasList.id);
    return { success: true, message: 'Project added to Ideas list.', ideas: projectsInIdeas };
  }

  removeProjectFromIdeas(projectId) {
    const ctx = this._getOrCreateIdeasList();
    const ideasList = ctx.ideasList;

    const allItems = this._getFromStorage('ideas_list_items');
    const newAll = [];
    let removed = false;
    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i];
      if (it.ideas_list_id === ideasList.id && it.project_id === projectId) {
        removed = true;
        continue;
      }
      newAll.push(it);
    }
    this._saveToStorage('ideas_list_items', newAll);

    const projectsInIdeas = this._projectsForIdeasList(ideasList.id);
    return {
      success: removed,
      message: removed ? 'Project removed from Ideas list.' : 'Project not in Ideas list.',
      ideas: projectsInIdeas
    };
  }

  getIdeasList() {
    const ctx = this._getOrCreateIdeasList();
    const projectsInIdeas = this._projectsForIdeasList(ctx.ideasList.id);
    return {
      items: projectsInIdeas,
      total_count: projectsInIdeas.length
    };
  }

  _projectsForIdeasList(ideasListId) {
    const allItems = this._getFromStorage('ideas_list_items');
    const projects = this._getFromStorage('projects');
    const ids = [];
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].ideas_list_id === ideasListId) {
        ids.push(allItems[i].project_id);
      }
    }
    const result = [];
    for (let j = 0; j < projects.length; j++) {
      if (ids.indexOf(projects[j].id) !== -1) {
        result.push(projects[j]);
      }
    }
    return result;
  }

  // Cost calculator options
  getCostCalculatorOptions() {
    const project_types = [
      { value: 'rear_extension', label: 'Rear extension' },
      { value: 'deck_extension', label: 'Deck extension' },
      { value: 'loft_conversion', label: 'Loft conversion' },
      { value: 'kitchen_renovation', label: 'Kitchen renovation' },
      { value: 'bathroom_renovation', label: 'Bathroom renovation' },
      { value: 'full_home_renovation', label: 'Full home renovation' },
      { value: 'other', label: 'Other project' }
    ];

    const finish_levels = [
      { value: 'basic', label: 'Basic' },
      { value: 'mid_range', label: 'Mid-range' },
      { value: 'premium', label: 'Premium' }
    ];

    const bedroom_options = [1, 2, 3, 4, 5];
    const bathroom_options = [1, 2, 3, 4];

    const default_budget_range = {
      min: 50000,
      max: 500000,
      step: 5000,
      currency: 'aud'
    };

    return {
      project_types: project_types,
      finish_levels: finish_levels,
      bedroom_options: bedroom_options,
      bathroom_options: bathroom_options,
      default_budget_range: default_budget_range
    };
  }

  // Create cost estimate
  createCostEstimate(project_type, bedrooms, bathrooms, finish_level, budget) {
    const now = this._nowISO();
    const calc = this._calculateCostEstimate(project_type, bedrooms, bathrooms, finish_level, budget);

    const estimates = this._getFromStorage('cost_estimates');
    const estimate = {
      id: this._generateId('estimate'),
      created_at: now,
      project_type: project_type,
      bedrooms: this._toNumber(bedrooms),
      bathrooms: this._toNumber(bathrooms),
      finish_level: finish_level,
      budget: this._toNumber(budget),
      estimated_cost: calc.estimated_cost,
      currency: 'aud',
      breakdown_items: calc.breakdown_items,
      notes: calc.notes
    };

    estimates.push(estimate);
    this._saveToStorage('cost_estimates', estimates);

    return { estimate: estimate };
  }

  // Send cost estimate summary
  sendCostEstimateSummary(estimateId, recipient_name, recipient_email) {
    const estimates = this._getFromStorage('cost_estimates');
    let estimate = null;
    for (let i = 0; i < estimates.length; i++) {
      if (estimates[i].id === estimateId) {
        estimate = estimates[i];
        break;
      }
    }
    if (!estimate) {
      return { success: false, message: 'Estimate not found.', email_record: null };
    }

    const now = this._nowISO();
    const emails = this._getFromStorage('cost_estimate_emails');
    const emailRecord = {
      id: this._generateId('estimate_email'),
      estimate_id: estimate.id,
      recipient_name: recipient_name,
      recipient_email: recipient_email,
      sent_at: now
    };
    emails.push(emailRecord);
    this._saveToStorage('cost_estimate_emails', emails);

    const emailWithResolved = this._clone(emailRecord);
    emailWithResolved.estimate = estimate;

    return { success: true, message: 'Estimate summary sent (simulated).', email_record: emailWithResolved };
  }

  // Blog filter options
  getBlogFilterOptions() {
    const articles = this._getFromStorage('articles');
    let minYear = null;
    let maxYear = null;
    const categorySet = {};
    const tagSet = {};

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (typeof a.year === 'number') {
        if (minYear === null || a.year < minYear) minYear = a.year;
        if (maxYear === null || a.year > maxYear) maxYear = a.year;
      }
      if (Array.isArray(a.categories)) {
        for (let j = 0; j < a.categories.length; j++) {
          categorySet[a.categories[j]] = true;
        }
      }
      if (Array.isArray(a.tags)) {
        for (let k = 0; k < a.tags.length; k++) {
          tagSet[a.tags[k]] = true;
        }
      }
    }

    const categories = Object.keys(categorySet).map(function (value) {
      return { value: value, label: value.split('_').map(function (s) { return s.charAt(0).toUpperCase() + s.slice(1); }).join(' ') };
    });

    const tags = Object.keys(tagSet).map(function (value) {
      return { value: value, label: value };
    });

    return {
      year_range: {
        min: minYear != null ? minYear : 0,
        max: maxYear != null ? maxYear : 0
      },
      categories: categories,
      tags: tags
    };
  }

  // Search blog articles
  searchBlogArticles(query, filters, page, page_size) {
    const articles = this._getFromStorage('articles');
    const q = (query || '').toLowerCase();
    const f = filters || {};

    // Instrumentation for task completion tracking (task6_searchParams)
    try {
      const hasTokens =
        q &&
        q.indexOf('planning') !== -1 &&
        q.indexOf('permit') !== -1 &&
        q.indexOf('extension') !== -1;
      if (hasTokens && typeof f.min_year === 'number' && f.min_year >= 2023) {
        const obj = {
          query: query,
          min_year: filters && typeof filters.min_year === 'number' ? filters.min_year : null,
          max_year: filters && typeof filters.max_year === 'number' ? filters.max_year : null,
          category: filters && filters.category ? filters.category : null,
          tag: filters && filters.tag ? filters.tag : null
        };
        localStorage.setItem('task6_searchParams', JSON.stringify(obj));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const matched = [];
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (!a.is_published) continue;

      if (typeof f.min_year === 'number' && a.year < f.min_year) continue;
      if (typeof f.max_year === 'number' && a.year > f.max_year) continue;
      if (f.category && Array.isArray(a.categories) && a.categories.indexOf(f.category) === -1) continue;
      if (f.tag && Array.isArray(a.tags) && a.tags.indexOf(f.tag) === -1) continue;

      if (q) {
        const haystack = [a.title || '', a.content || '', a.excerpt || ''].join(' ').toLowerCase();
        let tagStr = '';
        if (Array.isArray(a.tags)) {
          tagStr = a.tags.join(' ').toLowerCase();
        }
        if (haystack.indexOf(q) === -1 && tagStr.indexOf(q) === -1) {
          continue;
        }
      }

      matched.push(a);
    }

    // sort by published_at desc
    matched.sort(function (a, b) {
      const ad = new Date(a.published_at).getTime();
      const bd = new Date(b.published_at).getTime();
      return bd - ad;
    });

    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 10;
    const start = (p - 1) * ps;
    const items = matched.slice(start, start + ps);

    return {
      items: items,
      total_count: matched.length,
      page: p,
      page_size: ps,
      applied_filters: {
        min_year: typeof f.min_year === 'number' ? f.min_year : null,
        max_year: typeof f.max_year === 'number' ? f.max_year : null,
        category: f.category || null,
        tag: f.tag || null
      }
    };
  }

  // Article details
  getArticleDetails(articleId) {
    // Instrumentation for task completion tracking (task6_reopenedArticleId)
    try {
      const raw = localStorage.getItem('task6_savedArticleMeta');
      if (raw) {
        const meta = JSON.parse(raw);
        if (meta && meta.article_id === articleId) {
          localStorage.setItem('task6_reopenedArticleId', articleId);
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const articles = this._getFromStorage('articles');
    let article = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        article = articles[i];
        break;
      }
    }

    let related = [];
    if (article) {
      const tags = Array.isArray(article.tags) ? article.tags : [];
      const categories = Array.isArray(article.categories) ? article.categories : [];
      for (let j = 0; j < articles.length; j++) {
        const a = articles[j];
        if (a.id === article.id) continue;
        let shared = false;
        if (Array.isArray(a.tags)) {
          for (let t = 0; t < a.tags.length; t++) {
            if (tags.indexOf(a.tags[t]) !== -1) { shared = true; break; }
          }
        }
        if (!shared && Array.isArray(a.categories)) {
          for (let c = 0; c < a.categories.length; c++) {
            if (categories.indexOf(a.categories[c]) !== -1) { shared = true; break; }
          }
        }
        if (shared) {
          related.push(a);
        }
      }
      related.sort(function (a, b) {
        const ad = new Date(a.published_at).getTime();
        const bd = new Date(b.published_at).getTime();
        return bd - ad;
      });
      related = related.slice(0, 4);
    }

    return {
      article: article,
      related_articles: related
    };
  }

  // Reading list operations
  addArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    let article = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        article = articles[i];
        break;
      }
    }
    if (!article) {
      return { success: false, message: 'Article not found.', reading_list: [] };
    }

    const now = this._nowISO();
    const ctx = this._getOrCreateReadingList();
    const readingList = ctx.readingList;
    const existingItems = ctx.items;

    for (let j = 0; j < existingItems.length; j++) {
      if (existingItems[j].article_id === articleId) {
        const articlesInList = this._articlesForReadingList(readingList.id);
        return { success: true, message: 'Article already in reading list.', reading_list: articlesInList };
      }
    }

    const allItems = this._getFromStorage('reading_list_items');
    const newItem = {
      id: this._generateId('reading_item'),
      reading_list_id: readingList.id,
      article_id: articleId,
      added_at: now
    };
    allItems.push(newItem);
    this._saveToStorage('reading_list_items', allItems);

    let lists = this._getFromStorage('reading_lists');
    for (let k = 0; k < lists.length; k++) {
      if (lists[k].id === readingList.id) {
        lists[k].updated_at = now;
        break;
      }
    }
    this._saveToStorage('reading_lists', lists);

    const articlesInList = this._articlesForReadingList(readingList.id);

    // Instrumentation for task completion tracking (task6_savedArticleMeta)
    try {
      const year = typeof article.year === 'number' ? article.year : null;
      const textParts = [
        article.title || '',
        article.excerpt || '',
        article.content || '',
        Array.isArray(article.tags) ? article.tags.join(' ') : ''
      ];
      const combined = textParts.join(' ').toLowerCase();
      const hasPlanningPermit = combined.indexOf('planning permit') !== -1;
      const hasExtension = combined.indexOf('extension') !== -1;

      if (year !== null && year >= 2023 && hasPlanningPermit && hasExtension) {
        const obj = {
          article_id: article.id,
          year: article.year || null,
          title: article.title || ''
        };
        localStorage.setItem('task6_savedArticleMeta', JSON.stringify(obj));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { success: true, message: 'Article added to reading list.', reading_list: articlesInList };
  }

  removeArticleFromReadingList(articleId) {
    const ctx = this._getOrCreateReadingList();
    const readingList = ctx.readingList;
    const allItems = this._getFromStorage('reading_list_items');
    const newAll = [];
    let removed = false;
    for (let i = 0; i < allItems.length; i++) {
      const it = allItems[i];
      if (it.reading_list_id === readingList.id && it.article_id === articleId) {
        removed = true;
        continue;
      }
      newAll.push(it);
    }
    this._saveToStorage('reading_list_items', newAll);

    const articlesInList = this._articlesForReadingList(readingList.id);
    return {
      success: removed,
      message: removed ? 'Article removed from reading list.' : 'Article not in reading list.',
      reading_list: articlesInList
    };
  }

  getReadingList() {
    const ctx = this._getOrCreateReadingList();
    const articlesInList = this._articlesForReadingList(ctx.readingList.id);
    return {
      items: articlesInList,
      total_count: articlesInList.length
    };
  }

  _articlesForReadingList(readingListId) {
    const allItems = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('articles');
    const ids = [];
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].reading_list_id === readingListId) {
        ids.push(allItems[i].article_id);
      }
    }
    const result = [];
    for (let j = 0; j < articles.length; j++) {
      if (ids.indexOf(articles[j].id) !== -1) {
        result.push(articles[j]);
      }
    }
    return result;
  }

  // FAQ categories
  getFaqCategories() {
    const faqs = this._getFromStorage('faq_items');
    const map = {};
    for (let i = 0; i < faqs.length; i++) {
      const c = faqs[i].category;
      if (!map[c]) {
        map[c] = 0;
      }
      map[c]++;
    }
    const result = [];
    for (const cat in map) {
      if (Object.prototype.hasOwnProperty.call(map, cat)) {
        result.push({
          category: cat,
          label: this._labelFromEnum(cat),
          count: map[cat]
        });
      }
    }
    return result;
  }

  // Search FAQs
  searchFaqs(query, category, page, page_size) {
    const faqs = this._getFromStorage('faq_items');
    const q = (query || '').toLowerCase();

    const matched = [];
    for (let i = 0; i < faqs.length; i++) {
      const f = faqs[i];
      if (category && f.category !== category) continue;

      if (q) {
        const haystack = (f.question + ' ' + f.answer).toLowerCase();
        let keywordStr = '';
        if (Array.isArray(f.keywords)) {
          keywordStr = f.keywords.join(' ').toLowerCase();
        }
        if (haystack.indexOf(q) === -1 && keywordStr.indexOf(q) === -1) {
          continue;
        }
      }

      matched.push(f);
    }

    // simple sort by sort_order then question
    matched.sort(function (a, b) {
      const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
      if (ao !== bo) return ao - bo;
      return (a.question || '').localeCompare(b.question || '');
    });

    const p = page && page > 0 ? page : 1;
    const ps = page_size && page_size > 0 ? page_size : 20;
    const start = (p - 1) * ps;
    const items = matched.slice(start, start + ps);

    return {
      items: items,
      total_count: matched.length,
      page: p,
      page_size: ps
    };
  }

  // FAQ item details
  getFaqItemDetails(faqItemId) {
    const faqs = this._getFromStorage('faq_items');
    let faq = null;
    for (let i = 0; i < faqs.length; i++) {
      if (faqs[i].id === faqItemId) {
        faq = faqs[i];
        break;
      }
    }

    let related = [];
    if (faq) {
      for (let j = 0; j < faqs.length; j++) {
        const f = faqs[j];
        if (f.id === faq.id) continue;
        if (f.category === faq.category) {
          related.push(f);
        }
      }
      related.sort(function (a, b) {
        const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return ao - bo;
      });
      related = related.slice(0, 5);
    }

    return {
      faq: faq,
      related_faqs: related
    };
  }

  // Submit contact message
  submitContactMessage(subject_type, message, name, email, phone, source_page, related_faq_id) {
    const normalized = this._recordContactMessageSource(source_page, related_faq_id);
    const now = this._nowISO();

    const messages = this._getFromStorage('contact_messages');
    const cm = {
      id: this._generateId('contact'),
      created_at: now,
      subject_type: subject_type,
      message: message,
      name: name,
      email: email,
      phone: phone || null,
      source_page: normalized.source_page,
      related_faq_id: normalized.related_faq_id,
      status: 'new'
    };
    messages.push(cm);
    this._saveToStorage('contact_messages', messages);

    const cmWithResolved = this._clone(cm);
    if (cm.related_faq_id) {
      const faqs = this._getFromStorage('faq_items');
      for (let i = 0; i < faqs.length; i++) {
        if (faqs[i].id === cm.related_faq_id) {
          cmWithResolved.related_faq = faqs[i];
          break;
        }
      }
    } else {
      cmWithResolved.related_faq = null;
    }

    return { success: true, message: 'Message submitted.', contact_message: cmWithResolved };
  }

  // Renovation plan draft getters
  getRenovationPlanDraft() {
    const ctx = this._getOrCreateRenovationPlanDraft();
    const plan = ctx.plan;
    const projects = ctx.projects.map(function (p) {
      const copy = JSON.parse(JSON.stringify(p));
      copy.plan = plan;
      return copy;
    });

    return {
      plan: plan,
      projects: projects
    };
  }

  addProjectToRenovationPlan(project_type, budget, property_type, description) {
    const ctx = this._getOrCreateRenovationPlanDraft();
    const plan = ctx.plan;
    const existingProjects = ctx.projects;
    const allProjects = this._getFromStorage('renovation_plan_projects');

    let maxOrder = -1;
    for (let i = 0; i < existingProjects.length; i++) {
      const oi = typeof existingProjects[i].order_index === 'number' ? existingProjects[i].order_index : 0;
      if (oi > maxOrder) maxOrder = oi;
    }

    const proj = {
      id: this._generateId('plan_project'),
      plan_id: plan.id,
      project_type: project_type,
      budget: this._toNumber(budget),
      property_type: property_type,
      description: description || '',
      order_index: maxOrder + 1
    };

    allProjects.push(proj);
    this._saveToStorage('renovation_plan_projects', allProjects);

    // update plan total_budget
    const ctxAfter = this._getOrCreateRenovationPlanDraft();
    const updatedPlan = ctxAfter.plan;
    const updatedProjects = ctxAfter.projects.map(function (p) {
      const copy = JSON.parse(JSON.stringify(p));
      copy.plan = updatedPlan;
      return copy;
    });

    return {
      success: true,
      message: 'Project added to renovation plan.',
      plan: updatedPlan,
      projects: updatedProjects
    };
  }

  removeProjectFromRenovationPlan(planProjectId) {
    const ctx = this._getOrCreateRenovationPlanDraft();
    const plan = ctx.plan;

    const allProjects = this._getFromStorage('renovation_plan_projects');
    const newAll = [];
    let removed = false;
    for (let i = 0; i < allProjects.length; i++) {
      const p = allProjects[i];
      if (p.id === planProjectId && p.plan_id === plan.id) {
        removed = true;
        continue;
      }
      newAll.push(p);
    }
    this._saveToStorage('renovation_plan_projects', newAll);

    const ctxAfter = this._getOrCreateRenovationPlanDraft();
    const updatedPlan = ctxAfter.plan;
    const updatedProjects = ctxAfter.projects.map(function (p) {
      const copy = JSON.parse(JSON.stringify(p));
      copy.plan = updatedPlan;
      return copy;
    });

    return {
      success: removed,
      message: removed ? 'Project removed from renovation plan.' : 'Project not found in plan.',
      plan: updatedPlan,
      projects: updatedProjects
    };
  }

  updateRenovationPlanDetails(name, email, phone, postcode) {
    const ctx = this._getOrCreateRenovationPlanDraft();
    let plan = ctx.plan;
    const plans = this._getFromStorage('renovation_plans');

    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === plan.id) {
        plans[i].name = name;
        plans[i].email = email;
        plans[i].phone = phone;
        plans[i].postcode = postcode;
        plan = plans[i];
        break;
      }
    }
    this._saveToStorage('renovation_plans', plans);

    return {
      success: true,
      message: 'Renovation plan details updated.',
      plan: plan
    };
  }

  submitRenovationPlan() {
    const ctx = this._getOrCreateRenovationPlanDraft();
    let plan = ctx.plan;
    const plans = this._getFromStorage('renovation_plans');

    const now = this._nowISO();
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].id === plan.id) {
        plans[i].status = 'submitted';
        plans[i].submitted_at = now;
        plan = plans[i];
        break;
      }
    }
    this._saveToStorage('renovation_plans', plans);

    // After submission, next call to _getOrCreateRenovationPlanDraft will create a new draft

    return {
      success: true,
      message: 'Renovation plan submitted.',
      plan: plan
    };
  }

  // About page content
  getAboutPageContent() {
    return {
      company_overview: 'We are a specialist home renovation and extension builder focused on quality, transparency and clear communication from first sketch through to handover.',
      history: 'Founded by a team of licensed builders and architects, we have delivered a wide range of renovations, extensions and conversions over many years.',
      expertise: [
        {
          title: 'Extensions & additions',
          description: 'Rear, side, wraparound and deck extensions that integrate seamlessly with your existing home.'
        },
        {
          title: 'Interior renovations',
          description: 'Kitchens, bathrooms and full-home refurbishments with carefully specified finishes and fixtures.'
        },
        {
          title: 'Loft conversions',
          description: 'Attic and loft conversions that unlock underutilised roof space while meeting structural and planning requirements.'
        }
      ],
      qualifications: [
        {
          label: 'Licensed builders',
          details: 'All projects are supervised by fully licensed and insured builders.'
        },
        {
          label: 'Planning & permits',
          details: 'Support with planning applications, building permits and compliance documentation.'
        }
      ],
      service_areas: [
        {
          name: 'Inner suburbs',
          description: 'Renovations and extensions for period homes and contemporary properties.'
        },
        {
          name: 'Outer suburbs',
          description: 'Extensions, additions and upgrades for growing families.'
        }
      ],
      typical_project_sizes: [
        'Kitchen renovations',
        'Bathroom upgrades',
        '20–60 sqm extensions',
        'Full home renovations'
      ],
      cta_sections: [
        {
          label: 'Request a quote',
          action_type: 'request_quote'
        },
        {
          label: 'View recent projects',
          action_type: 'view_projects'
        },
        {
          label: 'Talk to the team',
          action_type: 'contact_team'
        }
      ]
    };
  }

  // Legal content
  getLegalContent(section) {
    const now = new Date().toISOString().slice(0, 10);
    let title = '';
    let content = '';

    if (section === 'terms_of_use') {
      title = 'Terms of Use';
      content = 'These Terms of Use govern your use of this renovation and extension planning website. All estimates are indicative only and do not constitute a formal quotation until confirmed in writing.';
    } else if (section === 'privacy_policy') {
      title = 'Privacy Policy';
      content = 'We collect and store information you provide, such as contact details and project information, to prepare quotes and manage your renovation. We do not sell your personal information to third parties.';
    } else if (section === 'cookies') {
      title = 'Cookies';
      content = 'We may use cookies or similar technologies to understand how the website is used and to improve your experience.';
    } else {
      title = 'Legal';
      content = 'Information on this site is provided as a general guide only. Please contact us for advice specific to your project.';
    }

    return {
      section: section,
      title: title,
      content: content,
      last_updated: now
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