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
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- STORAGE HELPERS ----------------------

  _initStorage() {
    const keys = [
      'resources',
      'categories',
      'countries',
      'cities',
      'saved_resources',
      'collections',
      'collection_items',
      'reading_queue_items',
      'notes',
      'newsletter_subscriptions',
      'visa_types',
      'visa_comparisons',
      'comments',
      'ask_questions',
      'contact_messages'
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
      // If corrupted, reset to empty array to keep logic working
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

  // ---------------------- GENERIC HELPERS ----------------------

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDateISO(date) {
    return date instanceof Date ? date.toISOString() : null;
  }

  _intersects(arr, values) {
    if (!Array.isArray(arr) || !Array.isArray(values) || !arr.length || !values.length) {
      return false;
    }
    const set = new Set(arr);
    return values.some((v) => set.has(v));
  }

  _getDescendantCategoryIds(categoryId) {
    const categories = this._getFromStorage('categories');
    const result = new Set();
    const queue = [categoryId];

    while (queue.length) {
      const current = queue.shift();
      result.add(current);
      categories.forEach((c) => {
        if (c.parent_category_id === current && !result.has(c.id)) {
          queue.push(c.id);
        }
      });
    }

    return Array.from(result);
  }

  _resolveResourceForeignKeys(resource) {
    if (!resource) return null;
    const categories = this._getFromStorage('categories');
    const countries = this._getFromStorage('countries');

    const category = categories.find((c) => c.id === resource.category_id) || null;
    const primaryCountry = resource.primary_country_id
      ? countries.find((c) => c.id === resource.primary_country_id) || null
      : null;

    return {
      ...resource,
      category,
      primary_country: primaryCountry
    };
  }

  _getOrCreateSavedResourcesState() {
    // Helper mentioned in spec; essentially wrapper around saved_resources
    return this._getFromStorage('saved_resources');
  }

  _recalculateReadingQueuePositions(queueItems) {
    // Normalize positions starting from 1 based on sort order
    queueItems.sort((a, b) => {
      const pa = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
      const pb = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;
      if (pa === pb) {
        const da = this._parseDate(a.added_at) || new Date(0);
        const db = this._parseDate(b.added_at) || new Date(0);
        return da - db;
      }
      return pa - pb;
    });

    queueItems.forEach((item, index) => {
      item.position = index + 1;
    });

    return queueItems;
  }

  _computeProcessingTimelineStages(application_type, submissionDateStr, expectedDecisionDateStr) {
    const submissionDate = this._parseDate(submissionDateStr) || new Date();
    const expectedDate = this._parseDate(expectedDecisionDateStr) || new Date(submissionDate.getTime());
    const totalMs = expectedDate.getTime() - submissionDate.getTime();

    const stageAt = (fraction) => {
      const d = new Date(submissionDate.getTime() + totalMs * fraction);
      return this._formatDateISO(d);
    };

    let labels;
    if (application_type === 'permanent_residency') {
      labels = ['Application submitted', 'Eligibility review', 'Background & security checks', 'Final decision target'];
    } else if (application_type === 'work_visa') {
      labels = ['Application submitted', 'Employer verification', 'Document review', 'Decision target'];
    } else if (application_type === 'study_visa') {
      labels = ['Application submitted', 'School verification', 'Visa office review', 'Decision target'];
    } else if (application_type === 'citizenship') {
      labels = ['Application submitted', 'Background review', 'Interview / test scheduling', 'Decision target'];
    } else {
      labels = ['Application submitted', 'Initial review', 'Detailed assessment', 'Decision target'];
    }

    const fractions = [0, 0.25, 0.6, 1];

    return labels.map((label, idx) => ({
      label,
      date: stageAt(fractions[idx])
    }));
  }

  // ---------------------- CORE INTERFACES ----------------------

  // getHomePageContent()
  getHomePageContent() {
    const categories = this._getFromStorage('categories');
    const resources = this._getFromStorage('resources');
    const countries = this._getFromStorage('countries');
    const savedResources = this._getFromStorage('saved_resources');
    const readingQueue = this._getFromStorage('reading_queue_items');
    const newsletterSubs = this._getFromStorage('newsletter_subscriptions');

    const featuredResources = resources
      .filter((r) => r.is_featured)
      .map((r) => {
        const category = categories.find((c) => c.id === r.category_id) || null;
        const primaryCountry = r.primary_country_id
          ? countries.find((c) => c.id === r.primary_country_id) || null
          : null;
        return {
          id: r.id,
          title: r.title,
          summary: r.summary || '',
          resource_type: r.resource_type,
          category_id: r.category_id,
          category_name: category ? category.name : null,
          primary_country_id: r.primary_country_id || null,
          primary_country_name: primaryCountry ? primaryCountry.name : null,
          difficulty_level: r.difficulty_level || null,
          reading_time_minutes: r.reading_time_minutes || null,
          publication_date: r.publication_date || null,
          tags: Array.isArray(r.tags) ? r.tags : [],
          is_interactive: !!r.is_interactive,
          is_featured: !!r.is_featured,
          category,
          primary_country: primaryCountry
        };
      });

    const tools_highlight = this.getToolsOverview().map((t) => ({
      tool_key: t.tool_key,
      label: t.name,
      description: t.description
    }));

    const savedResourcesSorted = savedResources
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.saved_at) || new Date(0);
        const db = this._parseDate(b.saved_at) || new Date(0);
        return db - da;
      });

    const resourcesMap = new Map(resources.map((r) => [r.id, r]));

    const reading_list_preview = savedResourcesSorted.map((sr) => {
      const res = resourcesMap.get(sr.resource_id) || null;
      return {
        resource_id: sr.resource_id,
        title: res ? res.title : null,
        saved_at: sr.saved_at,
        resource: res ? this._resolveResourceForeignKeys(res) : null
      };
    });

    const has_active_newsletter_subscription = newsletterSubs.some(
      (s) => s.status === 'active'
    );

    return {
      categories,
      featured_resources: featuredResources,
      tools_highlight,
      reading_list_preview,
      reading_queue_count: readingQueue.length,
      saved_resources_count: savedResources.length,
      has_active_newsletter_subscription
    };
  }

  // getMainCategories()
  getMainCategories() {
    return this._getFromStorage('categories');
  }

  // searchResources(query, page = 1, pageSize = 20, filters)
  searchResources(query, page, pageSize, filters) {
    const q = (query || '').trim().toLowerCase();
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const resources = this._getFromStorage('resources');
    const categories = this._getFromStorage('categories');
    const countries = this._getFromStorage('countries');
    const savedResources = this._getFromStorage('saved_resources');

    const savedSet = new Set(savedResources.map((s) => s.resource_id));

    let filtered = resources.slice();

    if (q) {
      filtered = filtered.filter((r) => {
        const haystack = [r.title, r.summary, Array.isArray(r.tags) ? r.tags.join(' ') : '']
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        const words = q.split(/\s+/).filter(Boolean);
        if (!words.length) return true;
        return words.every((w) => haystack.includes(w));
      });
    }

    if (filters) {
      if (filters.publication_date_start) {
        const start = this._parseDate(filters.publication_date_start);
        if (start) {
          filtered = filtered.filter((r) => {
            const pd = this._parseDate(r.publication_date);
            return pd ? pd >= start : false;
          });
        }
      }
      if (filters.publication_date_end) {
        const end = this._parseDate(filters.publication_date_end);
        if (end) {
          filtered = filtered.filter((r) => {
            const pd = this._parseDate(r.publication_date);
            return pd ? pd <= end : false;
          });
        }
      }
      if (filters.countryId) {
        const cid = filters.countryId;
        filtered = filtered.filter((r) => {
          if (r.primary_country_id === cid) return true;
          if (Array.isArray(r.country_ids)) {
            return r.country_ids.includes(cid);
          }
          return false;
        });
      }
      if (Array.isArray(filters.resource_types) && filters.resource_types.length) {
        const set = new Set(filters.resource_types);
        filtered = filtered.filter((r) => set.has(r.resource_type));
      }
      if (Array.isArray(filters.tags) && filters.tags.length) {
        filtered = filtered.filter((r) => this._intersects(r.tags || [], filters.tags));
      }
      if (Array.isArray(filters.difficulty_levels) && filters.difficulty_levels.length) {
        const set = new Set(filters.difficulty_levels);
        filtered = filtered.filter((r) => r.difficulty_level && set.has(r.difficulty_level));
      }
    }

    const total_results = filtered.length;
    const startIndex = (currentPage - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const results = pageItems.map((r) => {
      const category = categories.find((c) => c.id === r.category_id) || null;
      const primaryCountry = r.primary_country_id
        ? countries.find((c) => c.id === r.primary_country_id) || null
        : null;
      return {
        id: r.id,
        title: r.title,
        summary: r.summary || '',
        resource_type: r.resource_type,
        category_id: r.category_id,
        category_name: category ? category.name : null,
        primary_country_id: r.primary_country_id || null,
        primary_country_name: primaryCountry ? primaryCountry.name : null,
        difficulty_level: r.difficulty_level || null,
        reading_time_minutes: r.reading_time_minutes || null,
        publication_date: r.publication_date || null,
        tags: Array.isArray(r.tags) ? r.tags : [],
        is_interactive: !!r.is_interactive,
        is_saved: savedSet.has(r.id),
        category,
        primary_country: primaryCountry
      };
    });

    return {
      total_results,
      page: currentPage,
      page_size: size,
      results
    };
  }

  // getSearchFilterOptions()
  getSearchFilterOptions() {
    const countries = this._getFromStorage('countries');
    const resources = this._getFromStorage('resources');

    const resource_types = [
      'article',
      'guide',
      'faq',
      'quiz',
      'practice_test',
      'tool_doc',
      'visa_comparison_overview'
    ];

    const difficulty_levels = [
      'beginner',
      'newcomer',
      'intermediate',
      'advanced',
      'all_levels'
    ];

    const tagSet = new Set();
    resources.forEach((r) => {
      if (Array.isArray(r.tags)) {
        r.tags.forEach((t) => tagSet.add(t));
      }
    });

    return {
      countries,
      resource_types,
      difficulty_levels,
      available_tags: Array.from(tagSet)
    };
  }

  // getResourceDetail(resourceId)
  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources');
    const categories = this._getFromStorage('categories');
    const countries = this._getFromStorage('countries');
    const savedResources = this._getFromStorage('saved_resources');
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const readingQueue = this._getFromStorage('reading_queue_items');

    const resource = resources.find((r) => r.id === resourceId) || null;

    if (!resource) {
      return {
        resource: null,
        category_name: null,
        primary_country_name: null,
        reading_time_minutes: null,
        is_saved: false,
        collections_containing: [],
        is_in_reading_queue: false,
        can_ask_question: false
      };
    }

    const category = categories.find((c) => c.id === resource.category_id) || null;
    const primaryCountry = resource.primary_country_id
      ? countries.find((c) => c.id === resource.primary_country_id) || null
      : null;

    const is_saved = savedResources.some((s) => s.resource_id === resourceId);
    const is_in_reading_queue = readingQueue.some((q) => q.resource_id === resourceId);

    const containingItems = collectionItems.filter((ci) => ci.resource_id === resourceId);
    const collections_containing = containingItems
      .map((ci) => collections.find((c) => c.id === ci.collection_id))
      .filter(Boolean);

    const can_ask_question = resource.category_id === 'help_faq';

    return {
      resource: {
        ...resource,
        category,
        primary_country: primaryCountry
      },
      category_name: category ? category.name : null,
      primary_country_name: primaryCountry ? primaryCountry.name : null,
      reading_time_minutes: resource.reading_time_minutes || null,
      is_saved,
      collections_containing,
      is_in_reading_queue,
      can_ask_question
    };
  }

  // saveResourceForLater(resourceId)
  saveResourceForLater(resourceId) {
    const savedResources = this._getFromStorage('saved_resources');
    const existing = savedResources.find((s) => s.resource_id === resourceId);

    if (existing) {
      return {
        success: true,
        saved_resource: existing,
        total_saved_count: savedResources.length,
        message: 'Resource already saved.'
      };
    }

    const saved_resource = {
      id: this._generateId('saved_resource'),
      resource_id: resourceId,
      saved_at: this._formatDateISO(new Date())
    };

    savedResources.push(saved_resource);
    this._saveToStorage('saved_resources', savedResources);

    return {
      success: true,
      saved_resource,
      total_saved_count: savedResources.length,
      message: 'Resource saved successfully.'
    };
  }

  // removeSavedResource(resourceId)
  removeSavedResource(resourceId) {
    const savedResources = this._getFromStorage('saved_resources');
    const filtered = savedResources.filter((s) => s.resource_id !== resourceId);
    const success = filtered.length !== savedResources.length;

    this._saveToStorage('saved_resources', filtered);

    return {
      success,
      total_saved_count: filtered.length,
      message: success ? 'Resource removed from saved list.' : 'Resource was not in saved list.'
    };
  }

  // addResourceToCollection(resourceId, collectionId)
  addResourceToCollection(resourceId, collectionId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const collection = collections.find((c) => c.id === collectionId) || null;
    if (!collection) {
      return {
        success: false,
        collection_item: null,
        message: 'Collection not found.'
      };
    }

    const existing = collectionItems.find(
      (ci) => ci.collection_id === collectionId && ci.resource_id === resourceId
    );

    if (existing) {
      return {
        success: true,
        collection_item: existing,
        message: 'Resource already in collection.'
      };
    }

    const collection_item = {
      id: this._generateId('collection_item'),
      collection_id: collectionId,
      resource_id: resourceId,
      added_at: this._formatDateISO(new Date())
    };

    collectionItems.push(collection_item);
    this._saveToStorage('collection_items', collectionItems);

    return {
      success: true,
      collection_item,
      message: 'Resource added to collection.'
    };
  }

  // addResourceToReadingQueue(resourceId, desiredPosition)
  addResourceToReadingQueue(resourceId, desiredPosition) {
    const queue = this._getFromStorage('reading_queue_items');

    const existing = queue.find((q) => q.resource_id === resourceId);
    if (existing) {
      return {
        success: true,
        queue_item: existing,
        queue_length: queue.length,
        message: 'Resource already in reading queue.'
      };
    }

    const nowIso = this._formatDateISO(new Date());
    const newItem = {
      id: this._generateId('reading_queue_item'),
      resource_id: resourceId,
      position: queue.length + 1,
      added_at: nowIso
    };

    if (typeof desiredPosition === 'number' && desiredPosition >= 1) {
      const pos = Math.min(desiredPosition, queue.length + 1);
      newItem.position = pos;
      queue.forEach((item) => {
        if (item.position >= pos) {
          item.position += 1;
        }
      });
    }

    queue.push(newItem);
    this._recalculateReadingQueuePositions(queue);
    this._saveToStorage('reading_queue_items', queue);

    return {
      success: true,
      queue_item: newItem,
      queue_length: queue.length,
      message: 'Resource added to reading queue.'
    };
  }

  // getCategoryResources(categoryId, page = 1, pageSize = 20, filters)
  getCategoryResources(categoryId, page, pageSize, filters) {
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const categories = this._getFromStorage('categories');
    const resources = this._getFromStorage('resources');
    const countries = this._getFromStorage('countries');
    const savedResources = this._getFromStorage('saved_resources');

    const savedSet = new Set(savedResources.map((s) => s.resource_id));
    const category = categories.find((c) => c.id === categoryId) || null;

    const categoryIds = this._getDescendantCategoryIds(categoryId);

    let filtered = resources.filter((r) => categoryIds.includes(r.category_id));

    if (filters) {
      if (Array.isArray(filters.resource_types) && filters.resource_types.length) {
        const set = new Set(filters.resource_types);
        filtered = filtered.filter((r) => set.has(r.resource_type));
      }
      if (Array.isArray(filters.difficulty_levels) && filters.difficulty_levels.length) {
        const set = new Set(filters.difficulty_levels);
        filtered = filtered.filter((r) => r.difficulty_level && set.has(r.difficulty_level));
      }
      if (typeof filters.min_reading_time_minutes === 'number') {
        filtered = filtered.filter(
          (r) => typeof r.reading_time_minutes === 'number' && r.reading_time_minutes >= filters.min_reading_time_minutes
        );
      }
      if (typeof filters.max_reading_time_minutes === 'number') {
        filtered = filtered.filter(
          (r) => typeof r.reading_time_minutes === 'number' && r.reading_time_minutes <= filters.max_reading_time_minutes
        );
      }
      if (Array.isArray(filters.tags) && filters.tags.length) {
        filtered = filtered.filter((r) => this._intersects(r.tags || [], filters.tags));
      }
      if (typeof filters.is_interactive === 'boolean') {
        filtered = filtered.filter((r) => !!r.is_interactive === filters.is_interactive);
      }
    }

    const total_results = filtered.length;
    const startIndex = (currentPage - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const results = pageItems.map((r) => {
      const primaryCountry = r.primary_country_id
        ? countries.find((c) => c.id === r.primary_country_id) || null
        : null;
      return {
        id: r.id,
        title: r.title,
        summary: r.summary || '',
        resource_type: r.resource_type,
        difficulty_level: r.difficulty_level || null,
        reading_time_minutes: r.reading_time_minutes || null,
        publication_date: r.publication_date || null,
        tags: Array.isArray(r.tags) ? r.tags : [],
        primary_country_id: r.primary_country_id || null,
        primary_country_name: primaryCountry ? primaryCountry.name : null,
        is_interactive: !!r.is_interactive,
        is_saved: savedSet.has(r.id),
        primary_country: primaryCountry
      };
    });

    return {
      category,
      total_results,
      page: currentPage,
      page_size: size,
      results
    };
  }

  // getCategoryFilterOptions(categoryId)
  getCategoryFilterOptions(categoryId) {
    const categories = this._getFromStorage('categories');
    const resources = this._getFromStorage('resources');

    const categoryIds = this._getDescendantCategoryIds(categoryId);
    const filtered = resources.filter((r) => categoryIds.includes(r.category_id));

    const resourceTypeSet = new Set();
    const difficultySet = new Set();
    const tagSet = new Set();

    filtered.forEach((r) => {
      if (r.resource_type) resourceTypeSet.add(r.resource_type);
      if (r.difficulty_level) difficultySet.add(r.difficulty_level);
      if (Array.isArray(r.tags)) {
        r.tags.forEach((t) => tagSet.add(t));
      }
    });

    const reading_time_buckets = [
      { label: 'Under 5 minutes', min_minutes: 0, max_minutes: 4 },
      { label: '5–9 minutes', min_minutes: 5, max_minutes: 9 },
      { label: '10–19 minutes', min_minutes: 10, max_minutes: 19 },
      { label: '20+ minutes', min_minutes: 20, max_minutes: 1000000 }
    ];

    return {
      resource_types: Array.from(resourceTypeSet),
      difficulty_levels: Array.from(difficultySet),
      reading_time_buckets,
      available_tags: Array.from(tagSet)
    };
  }

  // createCollection(name, description)
  createCollection(name, description) {
    const collections = this._getFromStorage('collections');
    const nowIso = this._formatDateISO(new Date());

    const collection = {
      id: this._generateId('collection'),
      name,
      description: description || '',
      created_at: nowIso,
      updated_at: nowIso
    };

    collections.push(collection);
    this._saveToStorage('collections', collections);

    return {
      collection,
      success: true,
      message: 'Collection created.'
    };
  }

  // removeResourceFromCollection(resourceId, collectionId)
  removeResourceFromCollection(resourceId, collectionId) {
    const collectionItems = this._getFromStorage('collection_items');
    const filtered = collectionItems.filter(
      (ci) => !(ci.collection_id === collectionId && ci.resource_id === resourceId)
    );
    const success = filtered.length !== collectionItems.length;
    this._saveToStorage('collection_items', filtered);
    return {
      success,
      message: success ? 'Resource removed from collection.' : 'Resource not found in collection.'
    };
  }

  // getVisaTypesForComparison(filters)
  getVisaTypesForComparison(filters) {
    const visaTypes = this._getFromStorage('visa_types');
    const categories = this._getFromStorage('categories');
    const countries = this._getFromStorage('countries');

    let filtered = visaTypes.slice();

    if (filters) {
      if (Array.isArray(filters.visa_nature_values) && filters.visa_nature_values.length) {
        const set = new Set(filters.visa_nature_values);
        filtered = filtered.filter((vt) => set.has(vt.visa_nature));
      }
      if (typeof filters.max_processing_time_months === 'number') {
        filtered = filtered.filter((vt) => {
          if (typeof vt.typical_processing_time_months !== 'number') return false;
          return vt.typical_processing_time_months <= filters.max_processing_time_months;
        });
      }
      if (filters.countryId) {
        filtered = filtered.filter((vt) => vt.country_id === filters.countryId);
      }
    }

    return filtered.map((vt) => {
      const category = categories.find((c) => c.id === vt.category_id) || null;
      const country = vt.country_id
        ? countries.find((c) => c.id === vt.country_id) || null
        : null;
      return {
        ...vt,
        category,
        country
      };
    });
  }

  // getToolsOverview()
  getToolsOverview() {
    return [
      {
        tool_key: 'cost_of_living_calculator',
        name: 'Cost of Living Calculator',
        description: 'Estimate monthly living costs for different cities based on household size.'
      },
      {
        tool_key: 'processing_time_timeline',
        name: 'Processing Time Timeline',
        description: 'Estimate when you might receive a decision on your visa or residency application.'
      },
      {
        tool_key: 'visa_eligibility_quiz',
        name: 'Visa Eligibility Quiz',
        description: 'Check your likelihood of qualifying for popular immigration pathways.'
      }
    ];
  }

  // getCostOfLivingConfig()
  getCostOfLivingConfig() {
    const citiesRaw = this._getFromStorage('cities');
    const countries = this._getFromStorage('countries');

    const cities = citiesRaw.map((city) => {
      const country = countries.find((c) => c.id === city.country_id) || null;
      return {
        ...city,
        country
      };
    });

    let default_currency = 'USD';
    if (cities.length) {
      default_currency = cities[0].default_currency || (cities[0].country && cities[0].country.default_currency) || 'USD';
    }

    return {
      cities,
      default_adults: 1,
      default_children: 0,
      default_currency
    };
  }

  // calculateCostOfLiving(cityId, adults, children)
  calculateCostOfLiving(cityId, adults, children) {
    const cities = this._getFromStorage('cities');
    const countries = this._getFromStorage('countries');

    const city = cities.find((c) => c.id === cityId) || null;
    const adultsNum = typeof adults === 'number' && adults >= 0 ? adults : 1;
    const childrenNum = typeof children === 'number' && children >= 0 ? children : 0;

    let base = 0;
    if (city && typeof city.base_monthly_cost_one_adult === 'number') {
      base = city.base_monthly_cost_one_adult;
    }

    const householdFactor = adultsNum + childrenNum * 0.5;
    const monthly_cost = base * householdFactor;

    const country = city && city.country_id
      ? countries.find((c) => c.id === city.country_id) || null
      : null;

    const currency = (city && city.default_currency) || (country && country.default_currency) || 'USD';

    return {
      city: city
        ? {
            ...city,
            country
          }
        : null,
      adults: adultsNum,
      children: childrenNum,
      monthly_cost,
      currency
    };
  }

  // getProcessingTimeToolConfig()
  getProcessingTimeToolConfig() {
    const application_types = [
      { value: 'permanent_residency', label: 'Permanent residency' },
      { value: 'work_visa', label: 'Work visa' },
      { value: 'study_visa', label: 'Study visa' },
      { value: 'citizenship', label: 'Citizenship / naturalization' },
      { value: 'other', label: 'Other application' }
    ];

    return {
      application_types,
      default_unit: 'months'
    };
  }

  // calculateProcessingTimeline(application_type, submission_date, avg_processing_time_value, avg_processing_time_unit)
  calculateProcessingTimeline(application_type, submission_date, avg_processing_time_value, avg_processing_time_unit) {
    const submissionDate = this._parseDate(submission_date) || new Date();
    const unit = avg_processing_time_unit || 'months';
    const value = typeof avg_processing_time_value === 'number' ? avg_processing_time_value : 0;

    let expectedDecisionDate = new Date(submissionDate.getTime());
    let avgMonths = 0;

    if (unit === 'months') {
      expectedDecisionDate.setMonth(expectedDecisionDate.getMonth() + value);
      avgMonths = value;
    } else if (unit === 'days') {
      expectedDecisionDate = new Date(expectedDecisionDate.getTime() + value * 24 * 60 * 60 * 1000);
      avgMonths = value / 30;
    } else {
      // Fallback: treat as months
      expectedDecisionDate.setMonth(expectedDecisionDate.getMonth() + value);
      avgMonths = value;
    }

    const expected_decision_date = this._formatDateISO(expectedDecisionDate);
    const submission_date_iso = this._formatDateISO(submissionDate);
    const timeline_stages = this._computeProcessingTimelineStages(
      application_type,
      submission_date_iso,
      expected_decision_date
    );

    return {
      application_type,
      submission_date: submission_date_iso,
      expected_decision_date,
      avg_processing_time_months: avgMonths,
      timeline_stages
    };
  }

  // getVisaEligibilityQuizConfig()
  getVisaEligibilityQuizConfig() {
    const countries = this._getFromStorage('countries');

    const visa_pathways = [
      { id: 'skilled_worker', label: 'Skilled worker', description: 'Long-term skilled employment pathways.' },
      { id: 'temporary_worker', label: 'Temporary worker', description: 'Short-term temporary work permits.' },
      { id: 'student', label: 'Student visa', description: 'Study abroad and post-graduation options.' }
    ];

    const education_levels = [
      'high_school',
      'diploma',
      'bachelors_degree',
      'masters_degree',
      'phd_or_higher'
    ];

    const language_levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

    const experience_ranges = ['0-1 years', '1-3 years', '3-5 years', '5-7 years', '7+ years'];

    const occupation_categories = ['IT', 'Engineering', 'Healthcare', 'Business', 'Other'];

    return {
      visa_pathways,
      countries,
      education_levels,
      language_levels,
      experience_ranges,
      occupation_categories
    };
  }

  // calculateVisaEligibility(visaPathwayId, destinationCountryId, age, education_level, language_level, experience_range, occupation_category)
  calculateVisaEligibility(visaPathwayId, destinationCountryId, age, education_level, language_level, experience_range, occupation_category) {
    let score = 0;

    // Age
    if (typeof age === 'number') {
      if (age >= 18 && age <= 35) score += 25;
      else if (age >= 36 && age <= 45) score += 15;
      else if (age >= 46 && age <= 55) score += 5;
    }

    // Education
    const edu = (education_level || '').toLowerCase();
    if (edu.includes('phd')) score += 25;
    else if (edu.includes('master')) score += 20;
    else if (edu.includes('bachelor')) score += 15;
    else if (edu.includes('diploma')) score += 10;
    else if (edu.includes('high_school')) score += 5;

    // Language
    const lang = (language_level || '').toUpperCase();
    if (lang === 'C2') score += 25;
    else if (lang === 'C1') score += 22;
    else if (lang === 'B2') score += 18;
    else if (lang === 'B1') score += 12;
    else if (lang === 'A2') score += 6;
    else if (lang === 'A1') score += 3;

    // Experience
    const exp = (experience_range || '').toLowerCase();
    if (exp.includes('7+')) score += 20;
    else if (exp.includes('5-7')) score += 18;
    else if (exp.includes('3-5')) score += 15;
    else if (exp.includes('1-3')) score += 10;
    else if (exp.includes('0-1')) score += 5;

    // Occupation relevance
    const occ = (occupation_category || '').toLowerCase();
    if (occ.includes('it') || occ.includes('engineering')) score += 15;
    else if (occ.includes('health')) score += 12;

    // Pathway adjustment
    const path = (visaPathwayId || '').toLowerCase();
    if (path === 'skilled_worker') score += 10;
    else if (path === 'temporary_worker') score += 5;

    let eligibility_status;
    if (score >= 80) eligibility_status = 'likely_eligible';
    else if (score >= 55) eligibility_status = 'borderline';
    else eligibility_status = 'unlikely';

    const summary =
      eligibility_status === 'likely_eligible'
        ? 'Your profile appears strong for this pathway based on the information provided.'
        : eligibility_status === 'borderline'
        ? 'You may qualify, but some aspects of your profile could be improved.'
        : 'Based on your answers, you may not meet the typical requirements for this pathway.';

    // Recommended resources: match by destination country and tags / title
    const resources = this._getFromStorage('resources');
    const recommended = [];
    const lowerKeywords = ['step-by-step', 'application guide', 'how to apply'];

    resources.forEach((r) => {
      if (destinationCountryId && r.primary_country_id && r.primary_country_id !== destinationCountryId) {
        return;
      }
      const titleLower = (r.title || '').toLowerCase();
      const tagsLower = Array.isArray(r.tags) ? r.tags.map((t) => String(t).toLowerCase()) : [];
      const matchesTitle = lowerKeywords.some((kw) => titleLower.includes(kw));
      const matchesTags = lowerKeywords.some((kw) => tagsLower.some((t) => t.includes(kw)));
      if (matchesTitle || matchesTags) {
        recommended.push(r);
      }
    });

    const savedResources = this._getFromStorage('saved_resources');
    const savedSet = new Set(savedResources.map((s) => s.resource_id));

    const recommended_resources = recommended.slice(0, 10).map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary || '',
      resource_type: r.resource_type,
      tags: Array.isArray(r.tags) ? r.tags : [],
      reading_time_minutes: r.reading_time_minutes || null,
      is_saved: savedSet.has(r.id)
    }));

    // Instrumentation for task completion tracking
    try {
      const recommended_resource_ids = recommended_resources.map((r) => r.id);
      const task3_quizSubmission = {
        visaPathwayId,
        destinationCountryId,
        age,
        education_level,
        language_level,
        experience_range,
        occupation_category,
        eligibility_score: score,
        eligibility_status,
        recommended_resource_ids
      };
      localStorage.setItem('task3_quizSubmission', JSON.stringify(task3_quizSubmission));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      eligibility_score: score,
      eligibility_status,
      summary,
      recommended_resources
    };
  }

  // getReadingOverview()
  getReadingOverview() {
    const savedResources = this._getFromStorage('saved_resources');
    const resources = this._getFromStorage('resources');
    const categories = this._getFromStorage('categories');
    const countries = this._getFromStorage('countries');
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const readingQueue = this._getFromStorage('reading_queue_items');

    const resourcesMap = new Map(resources.map((r) => [r.id, r]));

    const reading_list = savedResources.map((sr) => {
      const resource = resourcesMap.get(sr.resource_id) || null;
      const category = resource
        ? categories.find((c) => c.id === resource.category_id) || null
        : null;
      const primaryCountry = resource && resource.primary_country_id
        ? countries.find((c) => c.id === resource.primary_country_id) || null
        : null;
      return {
        saved_resource: sr,
        resource,
        category_name: category ? category.name : null,
        primary_country_name: primaryCountry ? primaryCountry.name : null,
        category,
        primary_country: primaryCountry
      };
    });

    const collectionsWithItems = collections.map((col) => {
      const items = collectionItems
        .filter((ci) => ci.collection_id === col.id)
        .map((ci) => ({
          collection_item: ci,
          resource: resourcesMap.get(ci.resource_id) || null
        }));
      return {
        collection: col,
        items
      };
    });

    const normalizedQueue = this._recalculateReadingQueuePositions(readingQueue.slice());

    const reading_queue = normalizedQueue
      .map((qi) => ({
        queue_item: qi,
        resource: resourcesMap.get(qi.resource_id) || null
      }))
      .sort((a, b) => a.queue_item.position - b.queue_item.position);

    return {
      reading_list,
      collections: collectionsWithItems,
      reading_queue
    };
  }

  // removeFromReadingQueue(resourceId)
  removeFromReadingQueue(resourceId) {
    const queue = this._getFromStorage('reading_queue_items');
    let changed = false;
    const filtered = queue.filter((qi) => {
      if (qi.resource_id === resourceId) {
        changed = true;
        return false;
      }
      return true;
    });

    this._recalculateReadingQueuePositions(filtered);
    this._saveToStorage('reading_queue_items', filtered);

    return {
      success: changed,
      queue_length: filtered.length,
      message: changed ? 'Resource removed from reading queue.' : 'Resource not found in reading queue.'
    };
  }

  // reorderReadingQueue(orderedResourceIds)
  reorderReadingQueue(orderedResourceIds) {
    const queue = this._getFromStorage('reading_queue_items');
    const idToItem = new Map(queue.map((qi) => [qi.resource_id, qi]));

    const reordered = [];
    orderedResourceIds.forEach((rid) => {
      const item = idToItem.get(rid);
      if (item) {
        reordered.push(item);
        idToItem.delete(rid);
      }
    });

    // Append any remaining items not specified in orderedResourceIds
    idToItem.forEach((item) => {
      reordered.push(item);
    });

    reordered.forEach((item, index) => {
      item.position = index + 1;
    });
    this._saveToStorage('reading_queue_items', reordered);

    return reordered;
  }

  // getNotesList()
  getNotesList() {
    const notes = this._getFromStorage('notes');
    const cities = this._getFromStorage('cities');

    return notes.map((n) => {
      const related_city = n.related_city_id
        ? cities.find((c) => c.id === n.related_city_id) || null
        : null;
      return {
        ...n,
        related_city
      };
    });
  }

  // createNote(title, body, note_type, relatedCityId, monthly_cost, application_type, submission_date, expected_decision_date, avg_processing_time_months)
  createNote(title, body, note_type, relatedCityId, monthly_cost, application_type, submission_date, expected_decision_date, avg_processing_time_months) {
    const notes = this._getFromStorage('notes');
    const nowIso = this._formatDateISO(new Date());

    const note = {
      id: this._generateId('note'),
      title,
      body: body || '',
      note_type,
      created_at: nowIso,
      updated_at: nowIso,
      related_city_id: relatedCityId || null,
      monthly_cost: typeof monthly_cost === 'number' ? monthly_cost : null,
      application_type: application_type || null,
      submission_date: submission_date || null,
      expected_decision_date: expected_decision_date || null,
      avg_processing_time_months: typeof avg_processing_time_months === 'number' ? avg_processing_time_months : null
    };

    notes.push(note);
    this._saveToStorage('notes', notes);

    return {
      note,
      success: true,
      message: 'Note created.'
    };
  }

  // updateNote(noteId, updates)
  updateNote(noteId, updates) {
    const notes = this._getFromStorage('notes');
    const note = notes.find((n) => n.id === noteId) || null;
    if (!note) {
      return {
        note: null,
        success: false
      };
    }

    if (updates.title !== undefined) note.title = updates.title;
    if (updates.body !== undefined) note.body = updates.body;
    if (updates.monthly_cost !== undefined) note.monthly_cost = updates.monthly_cost;
    if (updates.expected_decision_date !== undefined) note.expected_decision_date = updates.expected_decision_date;

    note.updated_at = this._formatDateISO(new Date());

    this._saveToStorage('notes', notes);

    return {
      note,
      success: true
    };
  }

  // deleteNote(noteId)
  deleteNote(noteId) {
    const notes = this._getFromStorage('notes');
    const filtered = notes.filter((n) => n.id !== noteId);
    const success = filtered.length !== notes.length;
    this._saveToStorage('notes', filtered);
    return { success };
  }

  // getNewsletterOptions()
  getNewsletterOptions() {
    const regions = [
      { value: 'europe', label: 'Europe' },
      { value: 'north_america', label: 'North America' },
      { value: 'south_america', label: 'South America' },
      { value: 'asia', label: 'Asia' },
      { value: 'africa', label: 'Africa' },
      { value: 'oceania', label: 'Oceania' },
      { value: 'middle_east', label: 'Middle East' },
      { value: 'global', label: 'Global' }
    ];

    const topics = [
      { code: 'student_visas', label: 'Student visas' },
      { code: 'scholarships', label: 'Scholarships' },
      { code: 'immigration_news', label: 'Immigration news' }
    ];

    const frequencies = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    return {
      regions,
      topics,
      frequencies
    };
  }

  // subscribeToNewsletter(email, region, topics, frequency, include_immigration_news)
  subscribeToNewsletter(email, region, topics, frequency, include_immigration_news) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    const nowIso = this._formatDateISO(new Date());

    let subscription = subs.find((s) => s.email === email && s.region === region) || null;

    if (subscription) {
      subscription.topics = Array.isArray(topics) ? topics : [];
      subscription.frequency = frequency;
      subscription.include_immigration_news = !!include_immigration_news;
      subscription.status = 'active';
    } else {
      subscription = {
        id: this._generateId('newsletter_subscription'),
        email,
        region,
        topics: Array.isArray(topics) ? topics : [],
        frequency,
        include_immigration_news: !!include_immigration_news,
        created_at: nowIso,
        status: 'active'
      };
      subs.push(subscription);
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription,
      success: true,
      message: 'Subscription saved.'
    };
  }

  // getHelpCenterOverview()
  getHelpCenterOverview() {
    const categories = this._getFromStorage('categories');
    const resources = this._getFromStorage('resources');

    const helpCategories = categories.filter(
      (c) => c.id === 'help_faq' || c.parent_category_id === 'help_faq'
    );

    const featured_resources = resources.filter((r) => r.category_id === 'help_faq' && r.is_featured);

    return {
      categories: helpCategories,
      featured_resources
    };
  }

  // searchHelpResources(query, page = 1, pageSize = 20)
  searchHelpResources(query, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const resources = this._getFromStorage('resources');
    const categories = this._getFromStorage('categories');
    const countries = this._getFromStorage('countries');

    let filtered = resources.filter((r) => r.category_id === 'help_faq');

    if (q) {
      filtered = filtered.filter((r) => {
        const haystack = [r.title, r.summary, Array.isArray(r.tags) ? r.tags.join(' ') : '']
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    const total_results = filtered.length;
    const startIndex = (currentPage - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const results = pageItems.map((r) => {
      const category = categories.find((c) => c.id === r.category_id) || null;
      const primaryCountry = r.primary_country_id
        ? countries.find((c) => c.id === r.primary_country_id) || null
        : null;
      return {
        ...r,
        category,
        primary_country: primaryCountry
      };
    });

    return {
      total_results,
      page: currentPage,
      page_size: size,
      results
    };
  }

  // getAskQuestionFormOptions()
  getAskQuestionFormOptions() {
    const countries = this._getFromStorage('countries');
    const visaTypes = this._getFromStorage('visa_types');
    const categories = this._getFromStorage('categories');

    const visa_types = visaTypes.map((vt) => {
      const category = categories.find((c) => c.id === vt.category_id) || null;
      const country = vt.country_id
        ? countries.find((c) => c.id === vt.country_id) || null
        : null;
      return {
        ...vt,
        category,
        country
      };
    });

    return {
      countries,
      visa_types
    };
  }

  // submitAskQuestion(subject, message, email, name, countryId, visaTypeId)
  submitAskQuestion(subject, message, email, name, countryId, visaTypeId) {
    const submissions = this._getFromStorage('ask_questions');
    const nowIso = this._formatDateISO(new Date());

    const submission = {
      id: this._generateId('ask_question'),
      subject,
      message,
      email,
      name,
      country_id: countryId || null,
      visa_type_id: visaTypeId || null,
      created_at: nowIso,
      status: 'open'
    };

    submissions.push(submission);
    this._saveToStorage('ask_questions', submissions);

    // Resolve foreign keys for return convenience
    const countries = this._getFromStorage('countries');
    const visaTypes = this._getFromStorage('visa_types');

    const country = submission.country_id
      ? countries.find((c) => c.id === submission.country_id) || null
      : null;
    const visa_type = submission.visa_type_id
      ? visaTypes.find((vt) => vt.id === submission.visa_type_id) || null
      : null;

    return {
      submission: {
        ...submission,
        country,
        visa_type
      },
      success: true,
      message: 'Question submitted.'
    };
  }

  // generateVisaComparison(leftVisaTypeId, rightVisaTypeId, processing_time_limit_months)
  generateVisaComparison(leftVisaTypeId, rightVisaTypeId, processing_time_limit_months) {
    const visaTypes = this._getFromStorage('visa_types');
    const comparisons = this._getFromStorage('visa_comparisons');

    const left = visaTypes.find((vt) => vt.id === leftVisaTypeId) || null;
    const right = visaTypes.find((vt) => vt.id === rightVisaTypeId) || null;

    const nowIso = this._formatDateISO(new Date());

    const titleParts = [];
    if (left) titleParts.push(left.name);
    if (right) titleParts.push(right.name);
    const title = titleParts.length ? titleParts.join(' vs ') : 'Visa comparison';

    const comparison = {
      id: this._generateId('visa_comparison'),
      title,
      left_visa_type_id: leftVisaTypeId,
      right_visa_type_id: rightVisaTypeId,
      processing_time_limit_months:
        typeof processing_time_limit_months === 'number' ? processing_time_limit_months : null,
      body: '',
      created_at: nowIso
    };

    comparisons.push(comparison);
    this._saveToStorage('visa_comparisons', comparisons);

    return {
      comparison,
      left_visa_type: left,
      right_visa_type: right
    };
  }

  // getVisaComparisonComments(visaComparisonId)
  getVisaComparisonComments(visaComparisonId) {
    const comments = this._getFromStorage('comments');
    return comments.filter(
      (c) => c.parent_type === 'visa_comparison' && c.parent_id === visaComparisonId && c.is_published
    );
  }

  // postVisaComparisonComment(visaComparisonId, author_name, author_email, title, body)
  postVisaComparisonComment(visaComparisonId, author_name, author_email, title, body) {
    const comments = this._getFromStorage('comments');
    const nowIso = this._formatDateISO(new Date());

    const comment = {
      id: this._generateId('comment'),
      parent_type: 'visa_comparison',
      parent_id: visaComparisonId,
      author_name: author_name || null,
      author_email: author_email || null,
      title: title || null,
      body,
      created_at: nowIso,
      is_published: true
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    return {
      comment,
      success: true,
      message: 'Comment posted.'
    };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const key = pageKey || '';
    const nowIso = this._formatDateISO(new Date());

    if (key === 'about') {
      return {
        title: 'About this site',
        body: 'This site provides immigration, visa, and citizenship information and planning tools.',
        last_updated_at: nowIso
      };
    }
    if (key === 'contact') {
      return {
        title: 'Contact us',
        body: 'Use the contact form to reach our team with feedback or partnership inquiries.',
        last_updated_at: nowIso
      };
    }
    if (key === 'privacy_policy') {
      return {
        title: 'Privacy policy',
        body: 'We respect your privacy and handle your data in accordance with applicable laws.',
        last_updated_at: nowIso
      };
    }

    return {
      title: '',
      body: '',
      last_updated_at: nowIso
    };
  }

  // submitContactMessage(name, email, subject, message)
  submitContactMessage(name, email, subject, message) {
    const messages = this._getFromStorage('contact_messages');
    const nowIso = this._formatDateISO(new Date());

    const entry = {
      id: this._generateId('contact_message'),
      name,
      email,
      subject,
      message,
      created_at: nowIso
    };

    messages.push(entry);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Message submitted.'
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