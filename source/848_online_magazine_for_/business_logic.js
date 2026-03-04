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

  // --------------------------
  // Storage / ID helpers
  // --------------------------
  _initStorage() {
    const keysToInitAsArray = [
      'articles',
      'reading_lists',
      'reading_list_items',
      'favorite_collections',
      'favorite_items',
      'projects',
      'project_comparisons',
      'events',
      'event_lists',
      'event_list_items',
      'profiles',
      'comments',
      'products',
      'moodboards',
      'moodboard_items',
      'newsletter_subscriptions',
      // optional tables
      'contact_inquiries'
    ];

    keysToInitAsArray.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Feed preferences: single object (or null if not set yet)
    if (!localStorage.getItem('feed_preferences')) {
      localStorage.setItem('feed_preferences', 'null');
    }

    // CMS-like content keys (about, contact, privacy, terms) left unset or set to null
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem('about_page_content', 'null');
    }
    if (!localStorage.getItem('contact_page_info')) {
      localStorage.setItem('contact_page_info', 'null');
    }
    if (!localStorage.getItem('privacy_policy_content')) {
      localStorage.setItem('privacy_policy_content', 'null');
    }
    if (!localStorage.getItem('terms_and_conditions_content')) {
      localStorage.setItem('terms_and_conditions_content', 'null');
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

  // --------------------------
  // Generic helper utilities
  // --------------------------
  _parseDateSafe(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _toTitleCaseFromEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map((p) => (p ? p.charAt(0).toUpperCase() + p.slice(1) : ''))
      .join(' ');
  }

  _formatRegionLabel(region) {
    if (!region) return '';
    const map = {
      north_america: 'North America',
      south_america: 'South America',
      europe: 'Europe',
      africa: 'Africa',
      middle_east: 'Middle East',
      asia: 'Asia',
      asia_pacific: 'Asia-Pacific',
      oceania: 'Oceania',
      global: 'Global'
    };
    return map[region] || this._toTitleCaseFromEnum(region);
  }

  _formatArticleCategoryLabel(category) {
    if (!category) return '';
    const map = {
      hotels: 'Hotels',
      bars_restaurants: 'Bars & Restaurants',
      resorts: 'Resorts',
      offices: 'Offices',
      coworking: 'Coworking',
      lighting: 'Lighting',
      sustainability: 'Sustainability',
      news: 'News',
      opinion: 'Opinion',
      case_studies: 'Case Studies',
      product_roundups: 'Product Roundups',
      profiles: 'Profiles'
    };
    return map[category] || this._toTitleCaseFromEnum(category);
  }

  _formatProjectCategoryLabel(category) {
    if (!category) return '';
    const map = {
      bars_restaurants: 'Bars & Restaurants',
      hotels: 'Hotels',
      resorts: 'Resorts',
      offices: 'Offices',
      coworking: 'Coworking',
      mixed_use: 'Mixed Use',
      other: 'Other'
    };
    return map[category] || this._toTitleCaseFromEnum(category);
  }

  _formatProjectTypeLabel(projectType) {
    if (!projectType) return '';
    const map = {
      hotel_lobby: 'Hotel Lobby',
      bars_restaurants: 'Bars & Restaurants',
      bar: 'Bar',
      restaurant: 'Restaurant',
      hotel: 'Hotel',
      resort: 'Resort',
      office: 'Office',
      coworking: 'Coworking',
      spa: 'Spa',
      other: 'Other'
    };
    return map[projectType] || this._toTitleCaseFromEnum(projectType);
  }

  _formatEventTypeLabel(eventType) {
    return this._toTitleCaseFromEnum(eventType);
  }

  _formatSectorLabel(sector) {
    return this._toTitleCaseFromEnum(sector);
  }

  _formatProductCategoryLabel(category) {
    const map = {
      lighting: 'Lighting',
      furniture: 'Furniture',
      finishes: 'Finishes',
      textiles: 'Textiles',
      accessories: 'Accessories',
      other: 'Other'
    };
    return map[category] || this._toTitleCaseFromEnum(category);
  }

  _formatProductSubcategoryLabel(subcategory) {
    const map = {
      wall_sconces: 'Wall Sconces',
      pendant_lights: 'Pendant Lights',
      table_lamps: 'Table Lamps',
      floor_lamps: 'Floor Lamps',
      chandeliers: 'Chandeliers',
      other_lighting: 'Other Lighting',
      chairs: 'Chairs',
      stools: 'Stools',
      tables: 'Tables',
      other: 'Other'
    };
    return map[subcategory] || this._toTitleCaseFromEnum(subcategory);
  }

  _formatAvailabilityLabel(status) {
    const map = {
      in_stock: 'In Stock',
      out_of_stock: 'Out of Stock',
      backorder: 'Backorder',
      discontinued: 'Discontinued',
      pre_order: 'Pre-order'
    };
    return map[status] || this._toTitleCaseFromEnum(status);
  }

  _matchQueryOnFields(item, query, fields) {
    if (!query) return true;
    const q = query.toLowerCase();
    return fields.some((field) => {
      const val = item[field];
      if (Array.isArray(val)) {
        return val.some((v) => (v && String(v).toLowerCase().includes(q)));
      }
      if (val === undefined || val === null) return false;
      return String(val).toLowerCase().includes(q);
    });
  }

  _paginate(array, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    return {
      page: p,
      pageSize: ps,
      totalItems: array.length,
      items: array.slice(start, end)
    };
  }

  // --------------------------
  // Required private helpers
  // --------------------------
  _getOrCreateFeedPreference() {
    const raw = localStorage.getItem('feed_preferences');
    let pref = raw ? JSON.parse(raw) : null;
    if (!pref) {
      // Defaults: fairly neutral
      pref = {
        id: this._generateId('feedpref'),
        primary_region: 'global',
        top_category: 'other',
        office_enabled: true,
        coworking_enabled: true,
        resort_enabled: true,
        case_studies_enabled: true,
        product_roundups_enabled: true,
        job_listings_enabled: true,
        last_updated: new Date().toISOString()
      };
      localStorage.setItem('feed_preferences', JSON.stringify(pref));
    }
    return pref;
  }

  _saveFeedPreference(pref) {
    localStorage.setItem('feed_preferences', JSON.stringify(pref));
  }

  _getOrCreateReadingListByName(name) {
    const normalized = name.trim().toLowerCase();
    let readingLists = this._getFromStorage('reading_lists');
    let existing = readingLists.find(
      (rl) => rl.name && rl.name.trim().toLowerCase() === normalized
    );
    let created = false;
    if (!existing) {
      const now = new Date().toISOString();
      existing = {
        id: this._generateId('readinglist'),
        name: name,
        description: '',
        created_at: now,
        updated_at: now
      };
      readingLists.push(existing);
      this._saveToStorage('reading_lists', readingLists);
      created = true;
    }
    return { readingList: existing, created };
  }

  _getOrCreateFavoriteCollectionByName(name) {
    const normalized = name.trim().toLowerCase();
    let collections = this._getFromStorage('favorite_collections');
    let existing = collections.find(
      (c) => c.name && c.name.trim().toLowerCase() === normalized
    );
    let created = false;
    if (!existing) {
      const now = new Date().toISOString();
      existing = {
        id: this._generateId('favcol'),
        name: name,
        description: '',
        created_at: now,
        updated_at: now
      };
      collections.push(existing);
      this._saveToStorage('favorite_collections', collections);
      created = true;
    }
    return { favoriteCollection: existing, created };
  }

  _getOrCreateMoodboardByName(name) {
    const normalized = name.trim().toLowerCase();
    let moodboards = this._getFromStorage('moodboards');
    let existing = moodboards.find(
      (m) => m.name && m.name.trim().toLowerCase() === normalized
    );
    let created = false;
    if (!existing) {
      const now = new Date().toISOString();
      existing = {
        id: this._generateId('moodboard'),
        name: name,
        description: '',
        created_at: now,
        updated_at: now
      };
      moodboards.push(existing);
      this._saveToStorage('moodboards', moodboards);
      created = true;
    }
    return { moodboard: existing, created };
  }

  _getOrCreateDefaultEventList() {
    let lists = this._getFromStorage('event_lists');
    let existing = lists.find((l) => l.is_default === true);
    let created = false;
    if (!existing) {
      const now = new Date().toISOString();
      existing = {
        id: this._generateId('eventlist'),
        name: 'My Events',
        is_default: true,
        created_at: now
      };
      lists.push(existing);
      this._saveToStorage('event_lists', lists);
      created = true;
    }
    return { eventList: existing, created };
  }

  // --------------------------
  // Homepage Feed & Personalization
  // --------------------------

  // getHomepageFeed(page, pageSize, section, overrideRegion)
  getHomepageFeed(page, pageSize, section, overrideRegion) {
    const pref = this._getOrCreateFeedPreference();
    const effectiveRegion = overrideRegion || pref.primary_region;

    const articles = this._getFromStorage('articles');
    const projects = this._getFromStorage('projects');
    const products = this._getFromStorage('products');
    const events = this._getFromStorage('events');

    const filterByRegion = (itemRegion) => {
      if (!effectiveRegion || effectiveRegion === 'global') return true;
      return itemRegion === effectiveRegion;
    };

    const categoryDisabled = (item) => {
      // Office / Coworking disabling: apply to relevant entities
      if (pref.office_enabled === false) {
        if (
          (item.category && item.category === 'offices') ||
          (item.project_type && item.project_type === 'office')
        ) {
          return true;
        }
      }
      if (pref.coworking_enabled === false) {
        if (
          (item.category && item.category === 'coworking') ||
          (item.project_type && item.project_type === 'coworking')
        ) {
          return true;
        }
      }
      return false;
    };

    const articleTypeDisabled = (article) => {
      if (pref.case_studies_enabled === false) {
        if (
          article.article_type === 'case_study' ||
          article.category === 'case_studies'
        ) {
          return true;
        }
      }
      if (pref.product_roundups_enabled === false) {
        if (
          article.article_type === 'product_roundup' ||
          article.category === 'product_roundups'
        ) {
          return true;
        }
      }
      // job_listings_enabled has no corresponding entity here
      return false;
    };

    const feedItems = [];

    if (!section || section === 'mixed' || section === 'articles') {
      articles.forEach((a) => {
        if (categoryDisabled(a) || articleTypeDisabled(a)) return;
        if (!filterByRegion(a.region)) return;
        feedItems.push({
          id: a.id,
          item_type: 'article',
          title: a.title,
          summary: a.summary || '',
          image_url: a.hero_image_url || '',
          publish_date: a.publish_date || '',
          category_label: this._formatArticleCategoryLabel(a.category),
          region_label: this._formatRegionLabel(a.region),
          link_type: 'article_detail',
          _topCategoryMatch: this._isTopCategoryMatch(pref.top_category, a.category, null, null)
        });
      });
    }

    if (!section || section === 'mixed' || section === 'projects') {
      projects.forEach((p) => {
        if (categoryDisabled(p)) return;
        if (!filterByRegion(p.region)) return;
        feedItems.push({
          id: p.id,
          item_type: 'project',
          title: p.title,
          summary: p.summary || '',
          image_url: p.hero_image_url || '',
          publish_date: p.created_at || (p.opening_year ? String(p.opening_year) : ''),
          category_label: this._formatProjectCategoryLabel(p.category) || this._formatProjectTypeLabel(p.project_type),
          region_label: this._formatRegionLabel(p.region),
          link_type: 'project_detail',
          _topCategoryMatch: this._isTopCategoryMatch(pref.top_category, p.category, p.project_type, null)
        });
      });
    }

    if (!section || section === 'mixed' || section === 'products') {
      products.forEach((pr) => {
        // Products have no region; always allowed regardless of region filter
        feedItems.push({
          id: pr.id,
          item_type: 'product',
          title: pr.name,
          summary: pr.description || '',
          image_url: (pr.images && pr.images[0]) || '',
          publish_date: pr.created_at || '',
          category_label: this._formatProductCategoryLabel(pr.category),
          region_label: 'Global',
          link_type: 'product_detail',
          _topCategoryMatch: this._isTopCategoryMatch(pref.top_category, null, null, pr.category)
        });
      });
    }

    if (!section || section === 'mixed' || section === 'events') {
      events.forEach((ev) => {
        if (!filterByRegion(ev.region)) return;
        feedItems.push({
          id: ev.id,
          item_type: 'event',
          title: ev.title,
          summary: ev.description || '',
          image_url: '',
          publish_date: ev.start_datetime || '',
          category_label: this._formatSectorLabel(ev.sector) || this._formatEventTypeLabel(ev.event_type),
          region_label: this._formatRegionLabel(ev.region),
          link_type: 'event_detail',
          _topCategoryMatch: this._isTopCategoryMatch(pref.top_category, null, null, null)
        });
      });
    }

    // Sort: top_category matches first, then by publish/start date newest first
    feedItems.sort((a, b) => {
      if (a._topCategoryMatch !== b._topCategoryMatch) {
        return a._topCategoryMatch ? -1 : 1;
      }
      const da = this._parseDateSafe(a.publish_date);
      const db = this._parseDateSafe(b.publish_date);
      if (da && db) return db - da; // newest first
      if (da && !db) return -1;
      if (!da && db) return 1;
      return 0;
    });

    const { page: p, pageSize: ps, totalItems, items } = this._paginate(feedItems, page, pageSize);

    // Strip internal helper field
    const cleanedItems = items.map(({ _topCategoryMatch, ...rest }) => rest);

    return {
      page: p,
      pageSize: ps,
      totalItems,
      items: cleanedItems
    };
  }

  _isTopCategoryMatch(topCategory, articleCategory, projectType, productCategory) {
    if (!topCategory || topCategory === 'other') return false;
    // Map high-level feed category to underlying entities
    if (topCategory === 'resort') {
      return (
        articleCategory === 'resorts' ||
        projectType === 'resort'
      );
    }
    if (topCategory === 'hotel') {
      return (
        articleCategory === 'hotels' ||
        projectType === 'hotel' ||
        projectType === 'hotel_lobby'
      );
    }
    if (topCategory === 'restaurant') {
      return (
        articleCategory === 'bars_restaurants' ||
        projectType === 'restaurant' ||
        projectType === 'bars_restaurants'
      );
    }
    if (topCategory === 'bar') {
      return (
        articleCategory === 'bars_restaurants' ||
        projectType === 'bar' ||
        projectType === 'bars_restaurants'
      );
    }
    if (topCategory === 'office') {
      return (
        articleCategory === 'offices' ||
        projectType === 'office'
      );
    }
    if (topCategory === 'coworking') {
      return (
        articleCategory === 'coworking' ||
        projectType === 'coworking'
      );
    }
    return false;
  }

  // getHomepageFeaturedContent()
  getHomepageFeaturedContent() {
    const articles = this._getFromStorage('articles');
    const products = this._getFromStorage('products');

    const top10_roundups = articles
      .filter((a) => a.article_type === 'top_10_roundup')
      .sort((a, b) => {
        const da = this._parseDateSafe(a.publish_date);
        const db = this._parseDateSafe(b.publish_date);
        if (da && db) return db - da;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      })
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        hero_image_url: a.hero_image_url || '',
        publish_date: a.publish_date || '',
        category_label: this._formatArticleCategoryLabel(a.category),
        region_label: this._formatRegionLabel(a.region)
      }));

    const recent_case_studies = articles
      .filter((a) => a.category === 'case_studies' || a.article_type === 'case_study')
      .sort((a, b) => {
        const da = this._parseDateSafe(a.publish_date);
        const db = this._parseDateSafe(b.publish_date);
        if (da && db) return db - da;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      })
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        title: a.title,
        summary: a.summary || '',
        hero_image_url: a.hero_image_url || '',
        publish_date: a.publish_date || '',
        category_label: this._formatArticleCategoryLabel(a.category),
        region_label: this._formatRegionLabel(a.region)
      }));

    const highlighted_products = products
      .slice()
      .sort((a, b) => {
        const da = this._parseDateSafe(a.created_at);
        const db = this._parseDateSafe(b.created_at);
        if (da && db) return db - da;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      })
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        name: p.name,
        image_url: (p.images && p.images[0]) || '',
        price: p.price || 0,
        currency: p.currency || 'usd',
        category_label: this._formatProductCategoryLabel(p.category)
      }));

    return {
      top10_roundups,
      recent_case_studies,
      highlighted_products
    };
  }

  // getFeedPersonalizationSettings()
  getFeedPersonalizationSettings() {
    const pref = this._getOrCreateFeedPreference();
    return {
      primary_region: pref.primary_region,
      top_category: pref.top_category,
      office_enabled: pref.office_enabled,
      coworking_enabled: pref.coworking_enabled,
      resort_enabled: pref.resort_enabled,
      case_studies_enabled: pref.case_studies_enabled,
      product_roundups_enabled: pref.product_roundups_enabled,
      job_listings_enabled: pref.job_listings_enabled,
      last_updated: pref.last_updated
    };
  }

  // updateFeedPersonalizationSettings(primary_region, top_category, office_enabled, coworking_enabled, resort_enabled, case_studies_enabled, product_roundups_enabled, job_listings_enabled)
  updateFeedPersonalizationSettings(
    primary_region,
    top_category,
    office_enabled,
    coworking_enabled,
    resort_enabled,
    case_studies_enabled,
    product_roundups_enabled,
    job_listings_enabled
  ) {
    const pref = this._getOrCreateFeedPreference();

    if (primary_region !== undefined) pref.primary_region = primary_region;
    if (top_category !== undefined) pref.top_category = top_category;
    if (office_enabled !== undefined) pref.office_enabled = office_enabled;
    if (coworking_enabled !== undefined) pref.coworking_enabled = coworking_enabled;
    if (resort_enabled !== undefined) pref.resort_enabled = resort_enabled;
    if (case_studies_enabled !== undefined) pref.case_studies_enabled = case_studies_enabled;
    if (product_roundups_enabled !== undefined)
      pref.product_roundups_enabled = product_roundups_enabled;
    if (job_listings_enabled !== undefined) pref.job_listings_enabled = job_listings_enabled;

    pref.last_updated = new Date().toISOString();
    this._saveFeedPreference(pref);

    return {
      success: true,
      message: 'Feed personalization settings updated.',
      updated_preferences: {
        primary_region: pref.primary_region,
        top_category: pref.top_category,
        office_enabled: pref.office_enabled,
        coworking_enabled: pref.coworking_enabled,
        resort_enabled: pref.resort_enabled,
        case_studies_enabled: pref.case_studies_enabled,
        product_roundups_enabled: pref.product_roundups_enabled,
        job_listings_enabled: pref.job_listings_enabled,
        last_updated: pref.last_updated
      }
    };
  }

  // --------------------------
  // Articles
  // --------------------------

  // getArticleFilterOptions()
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles');

    const unique = (arr) => Array.from(new Set(arr.filter((v) => v !== undefined && v !== null)));

    const categoriesValues = unique(articles.map((a) => a.category));
    const regionsValues = unique(articles.map((a) => a.region));
    const articleTypesValues = unique(articles.map((a) => a.article_type));
    const yearsValues = unique(
      articles
        .map((a) => this._parseDateSafe(a.publish_date))
        .filter((d) => !!d)
        .map((d) => d.getFullYear())
    );

    const topicSet = new Set();
    articles.forEach((a) => {
      if (Array.isArray(a.topics)) {
        a.topics.forEach((t) => {
          if (t) topicSet.add(t);
        });
      }
    });

    const categories = categoriesValues.map((value) => ({
      value,
      label: this._formatArticleCategoryLabel(value)
    }));
    const regions = regionsValues.map((value) => ({
      value,
      label: this._formatRegionLabel(value)
    }));
    const article_types = articleTypesValues.map((value) => ({
      value,
      label: this._toTitleCaseFromEnum(value)
    }));
    const years = yearsValues
      .sort((a, b) => b - a)
      .map((value) => ({
        value,
        label: String(value)
      }));
    const topics = Array.from(topicSet).map((value) => ({
      value,
      label: value
    }));

    return {
      categories,
      regions,
      article_types,
      years,
      topics
    };
  }

  // searchArticles(query, page, pageSize, sortBy, filters)
  searchArticles(query, page, pageSize, sortBy, filters) {
    const articles = this._getFromStorage('articles');
    const q = query && typeof query === 'string' ? query.trim() : '';
    const f = filters || {};

    let results = articles.filter((a) => {
      if (q && !this._matchQueryOnFields(a, q, ['title', 'summary', 'tags'])) {
        return false;
      }

      if (f.category && a.category !== f.category) return false;
      if (f.topic) {
        if (!Array.isArray(a.topics) || !a.topics.includes(f.topic)) return false;
      }
      if (f.region && a.region !== f.region) return false;
      if (f.article_type && a.article_type !== f.article_type) return false;
      if (f.year) {
        const d = this._parseDateSafe(a.publish_date);
        if (!d || d.getFullYear() !== f.year) return false;
      }
      if (f.date_from) {
        const d = this._parseDateSafe(a.publish_date);
        const from = this._parseDateSafe(f.date_from);
        if (from && (!d || d < from)) return false;
      }
      if (f.date_to) {
        const d = this._parseDateSafe(a.publish_date);
        const to = this._parseDateSafe(f.date_to);
        if (to && (!d || d > to)) return false;
      }

      return true;
    });

    const sb = sortBy || 'newest_first';
    if (sb === 'newest_first' || sb === 'most_popular') {
      // Use publish_date as proxy for popularity
      results.sort((a, b) => {
        const da = this._parseDateSafe(a.publish_date);
        const db = this._parseDateSafe(b.publish_date);
        if (da && db) return db - da;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      });
    } else if (sb === 'oldest_first') {
      results.sort((a, b) => {
        const da = this._parseDateSafe(a.publish_date);
        const db = this._parseDateSafe(b.publish_date);
        if (da && db) return da - db;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      });
    }

    const { page: p, pageSize: ps, totalItems, items } = this._paginate(results, page, pageSize);

    const mapped = items.map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      hero_image_url: a.hero_image_url || '',
      publish_date: a.publish_date || '',
      category: a.category || null,
      category_label: this._formatArticleCategoryLabel(a.category),
      region: a.region || null,
      region_label: this._formatRegionLabel(a.region),
      article_type: a.article_type || null,
      topics: Array.isArray(a.topics) ? a.topics : [],
      tags: Array.isArray(a.tags) ? a.tags : []
    }));

    return {
      page: p,
      pageSize: ps,
      totalItems,
      results: mapped
    };
  }

  // getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const favorites = this._getFromStorage('favorite_items');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return null;
    }
    const isFavorited = favorites.some((fi) => fi.article_id === articleId);

    return {
      id: article.id,
      title: article.title,
      summary: article.summary || '',
      content: article.content || '',
      hero_image_url: article.hero_image_url || '',
      publish_date: article.publish_date || '',
      author_name: article.author_name || '',
      category: article.category || null,
      category_label: this._formatArticleCategoryLabel(article.category),
      region: article.region || null,
      region_label: this._formatRegionLabel(article.region),
      article_type: article.article_type || null,
      topics: Array.isArray(article.topics) ? article.topics : [],
      tags: Array.isArray(article.tags) ? article.tags : [],
      is_favorited: isFavorited
    };
  }

  // getRelatedContentForArticle(articleId)
  getRelatedContentForArticle(articleId) {
    const articles = this._getFromStorage('articles');
    const projects = this._getFromStorage('projects');
    const base = articles.find((a) => a.id === articleId);
    if (!base) {
      return {
        related_articles: [],
        related_projects: [],
        related_topics: []
      };
    }

    const baseTopics = new Set(Array.isArray(base.topics) ? base.topics : []);
    const baseTags = new Set(Array.isArray(base.tags) ? base.tags : []);

    const related_articles = articles
      .filter((a) => a.id !== base.id)
      .filter((a) => {
        if (a.region && base.region && a.region === base.region) return true;
        if (Array.isArray(a.topics)) {
          if (a.topics.some((t) => baseTopics.has(t))) return true;
        }
        if (Array.isArray(a.tags)) {
          if (a.tags.some((t) => baseTags.has(t))) return true;
        }
        return false;
      })
      .sort((a, b) => {
        const da = this._parseDateSafe(a.publish_date);
        const db = this._parseDateSafe(b.publish_date);
        if (da && db) return db - da;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      })
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        title: a.title,
        publish_date: a.publish_date || ''
      }));

    const related_projects = projects
      .filter((p) => {
        if (p.region && base.region && p.region === base.region) return true;
        if (Array.isArray(p.tags)) {
          if (p.tags.some((t) => baseTopics.has(t) || baseTags.has(t))) return true;
        }
        return false;
      })
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        title: p.title,
        project_type_label: this._formatProjectTypeLabel(p.project_type),
        region_label: this._formatRegionLabel(p.region)
      }));

    const related_topics = Array.from(baseTopics.size ? baseTopics : baseTags);

    return {
      related_articles,
      related_projects,
      related_topics
    };
  }

  // --------------------------
  // Reading Lists
  // --------------------------

  // getReadingListsSummary()
  getReadingListsSummary() {
    const readingLists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    return readingLists.map((rl) => {
      const count = items.filter((it) => it.reading_list_id === rl.id).length;
      return {
        id: rl.id,
        name: rl.name,
        description: rl.description || '',
        created_at: rl.created_at || '',
        updated_at: rl.updated_at || '',
        item_count: count
      };
    });
  }

  // saveArticleToReadingList(articleId, readingListId, readingListName)
  saveArticleToReadingList(articleId, readingListId, readingListName) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        created_new_list: false,
        reading_list: null,
        message: 'Article not found.'
      };
    }

    let readingLists = this._getFromStorage('reading_lists');
    let readingListItems = this._getFromStorage('reading_list_items');

    let targetList = null;
    let createdNew = false;

    if (readingListId) {
      targetList = readingLists.find((rl) => rl.id === readingListId) || null;
      if (!targetList) {
        return {
          success: false,
          created_new_list: false,
          reading_list: null,
          message: 'Reading list not found.'
        };
      }
    } else if (readingListName) {
      const { readingList, created } = this._getOrCreateReadingListByName(readingListName);
      targetList = readingList;
      createdNew = created;
      // refresh readingLists after potential creation
      readingLists = this._getFromStorage('reading_lists');
    } else {
      return {
        success: false,
        created_new_list: false,
        reading_list: null,
        message: 'Either readingListId or readingListName must be provided.'
      };
    }

    const exists = readingListItems.some(
      (it) => it.reading_list_id === targetList.id && it.article_id === articleId
    );
    if (!exists) {
      const now = new Date().toISOString();
      const newItem = {
        id: this._generateId('rli'),
        reading_list_id: targetList.id,
        article_id: articleId,
        added_at: now
      };
      readingListItems.push(newItem);
      this._saveToStorage('reading_list_items', readingListItems);

      // update updated_at
      readingLists = this._getFromStorage('reading_lists');
      const idx = readingLists.findIndex((rl) => rl.id === targetList.id);
      if (idx !== -1) {
        readingLists[idx].updated_at = now;
        this._saveToStorage('reading_lists', readingLists);
        targetList = readingLists[idx];
      }
    }

    const finalItems = this._getFromStorage('reading_list_items');
    const itemCount = finalItems.filter((it) => it.reading_list_id === targetList.id).length;

    return {
      success: true,
      created_new_list: createdNew,
      reading_list: {
        id: targetList.id,
        name: targetList.name,
        description: targetList.description || '',
        created_at: targetList.created_at || '',
        updated_at: targetList.updated_at || '',
        item_count: itemCount
      },
      message: 'Article saved to reading list.'
    };
  }

  // removeArticleFromReadingList(readingListId, articleId)
  removeArticleFromReadingList(readingListId, articleId) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter(
      (it) => !(it.reading_list_id === readingListId && it.article_id === articleId)
    );
    this._saveToStorage('reading_list_items', items);

    const removed = before !== items.length;
    return {
      success: removed,
      message: removed ? 'Article removed from reading list.' : 'Article was not in reading list.'
    };
  }

  // --------------------------
  // Favorites (Favorite Collections)
  // --------------------------

  // getFavoriteCollectionsSummary()
  getFavoriteCollectionsSummary() {
    const collections = this._getFromStorage('favorite_collections');
    const items = this._getFromStorage('favorite_items');

    return collections.map((c) => {
      const count = items.filter((it) => it.favorite_collection_id === c.id).length;
      return {
        id: c.id,
        name: c.name,
        description: c.description || '',
        created_at: c.created_at || '',
        updated_at: c.updated_at || '',
        item_count: count
      };
    });
  }

  // addArticleToFavoriteCollection(articleId, favoriteCollectionId, collectionName)
  addArticleToFavoriteCollection(articleId, favoriteCollectionId, collectionName) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        success: false,
        created_new_collection: false,
        favorite_collection: null,
        message: 'Article not found.'
      };
    }

    let collections = this._getFromStorage('favorite_collections');
    let items = this._getFromStorage('favorite_items');

    let targetCollection = null;
    let createdNew = false;

    if (favoriteCollectionId) {
      targetCollection = collections.find((c) => c.id === favoriteCollectionId) || null;
      if (!targetCollection) {
        return {
          success: false,
          created_new_collection: false,
          favorite_collection: null,
          message: 'Favorite collection not found.'
        };
      }
    } else if (collectionName) {
      const { favoriteCollection, created } = this._getOrCreateFavoriteCollectionByName(collectionName);
      targetCollection = favoriteCollection;
      createdNew = created;
      collections = this._getFromStorage('favorite_collections');
    } else {
      return {
        success: false,
        created_new_collection: false,
        favorite_collection: null,
        message: 'Either favoriteCollectionId or collectionName must be provided.'
      };
    }

    const exists = items.some(
      (it) => it.favorite_collection_id === targetCollection.id && it.article_id === articleId
    );
    if (!exists) {
      const now = new Date().toISOString();
      const newItem = {
        id: this._generateId('fvi'),
        favorite_collection_id: targetCollection.id,
        article_id: articleId,
        added_at: now
      };
      items.push(newItem);
      this._saveToStorage('favorite_items', items);

      collections = this._getFromStorage('favorite_collections');
      const idx = collections.findIndex((c) => c.id === targetCollection.id);
      if (idx !== -1) {
        collections[idx].updated_at = now;
        this._saveToStorage('favorite_collections', collections);
        targetCollection = collections[idx];
      }
    }

    const finalItems = this._getFromStorage('favorite_items');
    const itemCount = finalItems.filter((it) => it.favorite_collection_id === targetCollection.id).length;

    return {
      success: true,
      created_new_collection: createdNew,
      favorite_collection: {
        id: targetCollection.id,
        name: targetCollection.name,
        description: targetCollection.description || '',
        created_at: targetCollection.created_at || '',
        updated_at: targetCollection.updated_at || '',
        item_count: itemCount
      },
      message: 'Article added to favorites.'
    };
  }

  // removeArticleFromFavoriteCollection(favoriteCollectionId, articleId)
  removeArticleFromFavoriteCollection(favoriteCollectionId, articleId) {
    let items = this._getFromStorage('favorite_items');
    const before = items.length;
    items = items.filter(
      (it) => !(it.favorite_collection_id === favoriteCollectionId && it.article_id === articleId)
    );
    this._saveToStorage('favorite_items', items);

    const removed = before !== items.length;
    return {
      success: removed,
      message: removed ? 'Article removed from favorites.' : 'Article was not in this favorites collection.'
    };
  }

  // --------------------------
  // Projects & Comparisons
  // --------------------------

  // getProjectFilterOptions()
  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects');
    const unique = (arr) => Array.from(new Set(arr.filter((v) => v !== undefined && v !== null)));

    const projectTypesValues = unique(projects.map((p) => p.project_type));
    const categoriesValues = unique(projects.map((p) => p.category));
    const regionsValues = unique(projects.map((p) => p.region));
    const openingYearsValues = unique(projects.map((p) => p.opening_year).filter((y) => typeof y === 'number'));

    const project_types = projectTypesValues.map((value) => ({
      value,
      label: this._formatProjectTypeLabel(value)
    }));

    const categories = categoriesValues.map((value) => ({
      value,
      label: this._formatProjectCategoryLabel(value)
    }));

    const regions = regionsValues.map((value) => ({
      value,
      label: this._formatRegionLabel(value)
    }));

    const opening_years = openingYearsValues
      .sort((a, b) => b - a)
      .map((value) => ({
        value,
        label: String(value)
      }));

    // Size buckets: derive from existing sizes if any
    const sizes = projects
      .map((p) => p.size_sqm)
      .filter((s) => typeof s === 'number' && !isNaN(s));
    let size_buckets_sqm = [];
    if (sizes.length) {
      const min = Math.min(...sizes);
      const max = Math.max(...sizes);
      const mid = min + (max - min) / 2;
      size_buckets_sqm = [
        { min: min, max: mid, label: `${Math.round(min)}–${Math.round(mid)} sqm` },
        { min: mid, max: max, label: `${Math.round(mid)}–${Math.round(max)} sqm` }
      ];
    }

    return {
      project_types,
      categories,
      regions,
      opening_years,
      size_buckets_sqm
    };
  }

  // searchProjects(query, page, pageSize, sortBy, filters)
  searchProjects(query, page, pageSize, sortBy, filters) {
    const projects = this._getFromStorage('projects');
    const q = query && typeof query === 'string' ? query.trim() : '';
    const f = filters || {};

    let results = projects.filter((p) => {
      if (q && !this._matchQueryOnFields(p, q, ['title', 'summary', 'tags'])) {
        return false;
      }

      if (f.project_type && p.project_type !== f.project_type) return false;
      if (f.category && p.category !== f.category) return false;
      if (f.region && p.region !== f.region) return false;
      if (typeof f.opening_year_min === 'number') {
        if (typeof p.opening_year !== 'number' || p.opening_year < f.opening_year_min) return false;
      }
      if (typeof f.opening_year_max === 'number') {
        if (typeof p.opening_year !== 'number' || p.opening_year > f.opening_year_max) return false;
      }
      if (typeof f.size_sqm_min === 'number') {
        if (typeof p.size_sqm !== 'number' || p.size_sqm < f.size_sqm_min) return false;
      }
      if (typeof f.size_sqm_max === 'number') {
        if (typeof p.size_sqm !== 'number' || p.size_sqm > f.size_sqm_max) return false;
      }
      if (Array.isArray(f.tags) && f.tags.length) {
        if (!Array.isArray(p.tags)) return false;
        const hasAny = f.tags.some((t) => p.tags.includes(t));
        if (!hasAny) return false;
      }

      return true;
    });

    const sb = sortBy || 'newest_first';
    const getProjectSortDate = (p) => {
      const d = this._parseDateSafe(p.created_at);
      if (d) return d;
      if (typeof p.opening_year === 'number') {
        return new Date(String(p.opening_year));
      }
      return null;
    };

    if (sb === 'newest_first' || sb === 'relevance') {
      results.sort((a, b) => {
        const da = getProjectSortDate(a);
        const db = getProjectSortDate(b);
        if (da && db) return db - da;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      });
    } else if (sb === 'oldest_first') {
      results.sort((a, b) => {
        const da = getProjectSortDate(a);
        const db = getProjectSortDate(b);
        if (da && db) return da - db;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      });
    }

    const { page: p, pageSize: ps, totalItems, items } = this._paginate(results, page, pageSize);

    const mapped = items.map((pr) => ({
      id: pr.id,
      title: pr.title,
      summary: pr.summary || '',
      hero_image_url: pr.hero_image_url || '',
      project_type: pr.project_type || null,
      project_type_label: this._formatProjectTypeLabel(pr.project_type),
      category: pr.category || null,
      category_label: this._formatProjectCategoryLabel(pr.category),
      region: pr.region || null,
      region_label: this._formatRegionLabel(pr.region),
      opening_year: typeof pr.opening_year === 'number' ? pr.opening_year : null,
      size_sqm: typeof pr.size_sqm === 'number' ? pr.size_sqm : null,
      seating_capacity: typeof pr.seating_capacity === 'number' ? pr.seating_capacity : null,
      is_bookmarked: !!pr.is_bookmarked
    }));

    return {
      page: p,
      pageSize: ps,
      totalItems,
      results: mapped
    };
  }

  // getProjectDetails(projectId)
  getProjectDetails(projectId) {
    const projects = this._getFromStorage('projects');
    const p = projects.find((pr) => pr.id === projectId);
    if (!p) return null;

    return {
      id: p.id,
      title: p.title,
      summary: p.summary || '',
      description: p.description || '',
      hero_image_url: p.hero_image_url || '',
      project_type: p.project_type || null,
      project_type_label: this._formatProjectTypeLabel(p.project_type),
      category: p.category || null,
      category_label: this._formatProjectCategoryLabel(p.category),
      region: p.region || null,
      region_label: this._formatRegionLabel(p.region),
      country: p.country || '',
      city: p.city || '',
      opening_year: typeof p.opening_year === 'number' ? p.opening_year : null,
      size_sqm: typeof p.size_sqm === 'number' ? p.size_sqm : null,
      seating_capacity: typeof p.seating_capacity === 'number' ? p.seating_capacity : null,
      designer_name: p.designer_name || '',
      is_bookmarked: !!p.is_bookmarked,
      image_gallery_urls: Array.isArray(p.image_gallery_urls) ? p.image_gallery_urls : []
    };
  }

  // getRelatedContentForProject(projectId)
  getRelatedContentForProject(projectId) {
    const projects = this._getFromStorage('projects');
    const articles = this._getFromStorage('articles');
    const base = projects.find((p) => p.id === projectId);
    if (!base) {
      return {
        related_projects: [],
        related_articles: []
      };
    }

    const related_projects = projects
      .filter((p) => p.id !== base.id)
      .filter((p) => {
        if (p.region && base.region && p.region === base.region) return true;
        if (p.category && base.category && p.category === base.category) return true;
        return false;
      })
      .slice(0, 10)
      .map((p) => ({
        id: p.id,
        title: p.title,
        project_type_label: this._formatProjectTypeLabel(p.project_type),
        region_label: this._formatRegionLabel(p.region)
      }));

    const related_articles = articles
      .filter((a) => {
        if (a.region && base.region && a.region === base.region) return true;
        if (Array.isArray(a.tags) && Array.isArray(base.tags)) {
          const set = new Set(base.tags);
          if (a.tags.some((t) => set.has(t))) return true;
        }
        return false;
      })
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        title: a.title,
        publish_date: a.publish_date || ''
      }));

    return {
      related_projects,
      related_articles
    };
  }

  // bookmarkProject(projectId, bookmarked)
  bookmarkProject(projectId, bookmarked) {
    const projects = this._getFromStorage('projects');
    const idx = projects.findIndex((p) => p.id === projectId);
    if (idx === -1) {
      return {
        success: false,
        is_bookmarked: false,
        message: 'Project not found.'
      };
    }

    projects[idx].is_bookmarked = !!bookmarked;
    this._saveToStorage('projects', projects);

    return {
      success: true,
      is_bookmarked: !!bookmarked,
      message: bookmarked ? 'Project bookmarked.' : 'Project bookmark removed.'
    };
  }

  // getProjectComparison(projectIds)
  getProjectComparison(projectIds) {
    const projects = this._getFromStorage('projects');
    const selected = (Array.isArray(projectIds) ? projectIds : []).map((id) =>
      projects.find((p) => p.id === id)
    ).filter(Boolean);

    const comparisons = selected.map((p) => ({
      id: p.id,
      title: p.title,
      project_type_label: this._formatProjectTypeLabel(p.project_type),
      region_label: this._formatRegionLabel(p.region),
      opening_year: typeof p.opening_year === 'number' ? p.opening_year : null,
      size_sqm: typeof p.size_sqm === 'number' ? p.size_sqm : null,
      seating_capacity: typeof p.seating_capacity === 'number' ? p.seating_capacity : null,
      city: p.city || '',
      country: p.country || ''
    }));

    const allEqualOrNull = (values) => {
      const filtered = values.filter((v) => v !== null && v !== undefined);
      if (filtered.length <= 1) return false;
      return !filtered.some((v) => v !== filtered[0]);
    };

    const seatingVals = comparisons.map((c) => c.seating_capacity);
    const sizeVals = comparisons.map((c) => c.size_sqm);
    const yearVals = comparisons.map((c) => c.opening_year);
    const regionVals = comparisons.map((c) => c.region_label);

    const highlighted_differences = {
      seating_capacity_differs: !allEqualOrNull(seatingVals),
      size_sqm_differs: !allEqualOrNull(sizeVals),
      opening_year_differs: !allEqualOrNull(yearVals),
      region_differs: !allEqualOrNull(regionVals)
    };

    return {
      projects: comparisons,
      highlighted_differences
    };
  }

  // saveProjectComparison(name, projectIds)
  saveProjectComparison(name, projectIds) {
    const projects = this._getFromStorage('projects');
    const validIds = (Array.isArray(projectIds) ? projectIds : []).filter((id) =>
      projects.some((p) => p.id === id)
    );

    const comparisons = this._getFromStorage('project_comparisons');
    const now = new Date().toISOString();
    const id = this._generateId('projcmp');

    const record = {
      id,
      name,
      project_ids: validIds,
      created_at: now
    };
    comparisons.push(record);
    this._saveToStorage('project_comparisons', comparisons);

    return {
      success: true,
      comparison_id: id,
      name,
      project_ids: validIds,
      created_at: now,
      message: 'Project comparison saved.'
    };
  }

  // getSavedProjectComparisons()
  getSavedProjectComparisons() {
    const comparisons = this._getFromStorage('project_comparisons');
    return comparisons.map((c) => ({
      id: c.id,
      name: c.name,
      project_ids: Array.isArray(c.project_ids) ? c.project_ids : [],
      created_at: c.created_at || ''
    }));
  }

  // --------------------------
  // Events & Event Lists
  // --------------------------

  // getEventsFilterOptions()
  getEventsFilterOptions() {
    const events = this._getFromStorage('events');
    const unique = (arr) => Array.from(new Set(arr.filter((v) => v !== undefined && v !== null)));

    const eventTypesValues = unique(events.map((e) => e.event_type));
    const sectorsValues = unique(events.map((e) => e.sector));
    const regionsValues = unique(events.map((e) => e.region));

    const event_types = eventTypesValues.map((value) => ({
      value,
      label: this._formatEventTypeLabel(value)
    }));

    const sectors = sectorsValues.map((value) => ({
      value,
      label: this._formatSectorLabel(value)
    }));

    const regions = regionsValues.map((value) => ({
      value,
      label: this._formatRegionLabel(value)
    }));

    return {
      event_types,
      sectors,
      regions
    };
  }

  // getEventsCalendarMonth(year, month, filters)
  getEventsCalendarMonth(year, month, filters) {
    const events = this._getFromStorage('events');
    const f = filters || {};

    const yearNum = typeof year === 'number' ? year : null;
    const monthNum = typeof month === 'number' ? month : null; // 1-12

    const filtered = events.filter((ev) => {
      const d = this._parseDateSafe(ev.start_datetime);
      if (!d) return false;
      if (yearNum && d.getFullYear() !== yearNum) return false;
      if (monthNum && d.getMonth() + 1 !== monthNum) return false;
      if (f.event_type && ev.event_type !== f.event_type) return false;
      if (f.sector && ev.sector !== f.sector) return false;
      if (f.region && ev.region !== f.region) return false;
      return true;
    });

    const daysMap = new Map();
    filtered.forEach((ev) => {
      const d = this._parseDateSafe(ev.start_datetime);
      if (!d) return;
      const day = d.getDate();
      if (!daysMap.has(day)) daysMap.set(day, []);
      daysMap.get(day).push({
        id: ev.id,
        title: ev.title,
        start_datetime: ev.start_datetime || '',
        event_type_label: this._formatEventTypeLabel(ev.event_type),
        sector_label: this._formatSectorLabel(ev.sector),
        region_label: this._formatRegionLabel(ev.region),
        is_online: !!ev.is_online
      });
    });

    const daysArr = Array.from(daysMap.keys())
      .sort((a, b) => a - b)
      .map((day) => ({
        day,
        events: daysMap.get(day)
      }));

    return {
      year: yearNum,
      month: monthNum,
      days: daysArr
    };
  }

  // searchEvents(page, pageSize, filters)
  searchEvents(page, pageSize, filters) {
    const events = this._getFromStorage('events');
    const f = filters || {};

    let results = events.filter((ev) => {
      if (f.event_type && ev.event_type !== f.event_type) return false;
      if (f.sector && ev.sector !== f.sector) return false;
      if (f.region && ev.region !== f.region) return false;
      if (typeof f.year === 'number' || typeof f.month === 'number') {
        const d = this._parseDateSafe(ev.start_datetime);
        if (!d) return false;
        if (typeof f.year === 'number' && d.getFullYear() !== f.year) return false;
        if (typeof f.month === 'number' && d.getMonth() + 1 !== f.month) return false;
      }
      return true;
    });

    results.sort((a, b) => {
      const da = this._parseDateSafe(a.start_datetime);
      const db = this._parseDateSafe(b.start_datetime);
      if (da && db) return da - db; // soonest first
      if (da && !db) return -1;
      if (!da && db) return 1;
      return 0;
    });

    const { page: p, pageSize: ps, totalItems, items } = this._paginate(results, page, pageSize);

    const mapped = items.map((ev) => ({
      id: ev.id,
      title: ev.title,
      start_datetime: ev.start_datetime || '',
      end_datetime: ev.end_datetime || '',
      event_type_label: this._formatEventTypeLabel(ev.event_type),
      sector_label: this._formatSectorLabel(ev.sector),
      region_label: this._formatRegionLabel(ev.region),
      is_online: !!ev.is_online
    }));

    return {
      page: p,
      pageSize: ps,
      totalItems,
      results: mapped
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return null;

    return {
      id: ev.id,
      title: ev.title,
      description: ev.description || '',
      start_datetime: ev.start_datetime || '',
      end_datetime: ev.end_datetime || '',
      event_type: ev.event_type || null,
      event_type_label: this._formatEventTypeLabel(ev.event_type),
      sector: ev.sector || null,
      sector_label: this._formatSectorLabel(ev.sector),
      region: ev.region || null,
      region_label: this._formatRegionLabel(ev.region),
      city: ev.city || '',
      country: ev.country || '',
      is_online: !!ev.is_online,
      registration_url: ev.registration_url || ''
    };
  }

  // getEventListsSummary()
  getEventListsSummary() {
    const lists = this._getFromStorage('event_lists');
    const items = this._getFromStorage('event_list_items');

    return lists.map((l) => {
      const count = items.filter((it) => it.event_list_id === l.id).length;
      return {
        id: l.id,
        name: l.name,
        is_default: !!l.is_default,
        created_at: l.created_at || '',
        item_count: count
      };
    });
  }

  // addEventToMyEvents(eventId, eventListId)
  addEventToMyEvents(eventId, eventListId) {
    const events = this._getFromStorage('events');
    const ev = events.find((e) => e.id === eventId);
    if (!ev) {
      return {
        success: false,
        event_list: null,
        message: 'Event not found.'
      };
    }

    let lists = this._getFromStorage('event_lists');
    let items = this._getFromStorage('event_list_items');

    let targetList = null;
    if (eventListId) {
      targetList = lists.find((l) => l.id === eventListId) || null;
      if (!targetList) {
        return {
          success: false,
          event_list: null,
          message: 'Event list not found.'
        };
      }
    } else {
      const { eventList } = this._getOrCreateDefaultEventList();
      targetList = eventList;
      lists = this._getFromStorage('event_lists');
    }

    const exists = items.some(
      (it) => it.event_list_id === targetList.id && it.event_id === eventId
    );
    if (!exists) {
      const now = new Date().toISOString();
      const newItem = {
        id: this._generateId('eli'),
        event_list_id: targetList.id,
        event_id: eventId,
        added_at: now
      };
      items.push(newItem);
      this._saveToStorage('event_list_items', items);
    }

    return {
      success: true,
      event_list: {
        id: targetList.id,
        name: targetList.name,
        is_default: !!targetList.is_default,
        created_at: targetList.created_at || ''
      },
      message: 'Event added to list.'
    };
  }

  // --------------------------
  // Profiles & Comments
  // --------------------------

  // getProfileFilterOptions()
  getProfileFilterOptions() {
    const profiles = this._getFromStorage('profiles');
    const unique = (arr) => Array.from(new Set(arr.filter((v) => v !== undefined && v !== null)));

    const regionsValues = unique(profiles.map((p) => p.region));
    const countriesValues = unique(profiles.map((p) => p.country));

    const regions = regionsValues.map((value) => ({
      value,
      label: this._formatRegionLabel(value)
    }));

    const countries = countriesValues.map((value) => ({
      value,
      label: value
    }));

    return {
      regions,
      countries
    };
  }

  // searchProfiles(query, page, pageSize, sortBy, filters)
  searchProfiles(query, page, pageSize, sortBy, filters) {
    const profiles = this._getFromStorage('profiles');
    const q = query && typeof query === 'string' ? query.trim() : '';
    const f = filters || {};

    let results = profiles.filter((p) => {
      if (
        q &&
        !this._matchQueryOnFields(p, q, ['name', 'role', 'firm', 'biography', 'specialties'])
      ) {
        return false;
      }

      if (f.region && p.region !== f.region) return false;
      if (f.country && p.country !== f.country) return false;
      if (typeof f.is_interview === 'boolean') {
        if (!!p.is_interview !== f.is_interview) return false;
      }

      return true;
    });

    const sb = sortBy || 'most_recent';
    if (sb === 'most_recent') {
      results.sort((a, b) => {
        const da = this._parseDateSafe(a.created_at);
        const db = this._parseDateSafe(b.created_at);
        if (da && db) return db - da;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      });
    } else if (sb === 'name_az') {
      results.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sb === 'name_za') {
      results.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }

    const { page: p, pageSize: ps, totalItems, items } = this._paginate(results, page, pageSize);

    const mapped = items.map((pr) => ({
      id: pr.id,
      name: pr.name,
      role: pr.role || '',
      firm: pr.firm || '',
      region_label: this._formatRegionLabel(pr.region),
      country: pr.country || '',
      city: pr.city || '',
      is_interview: !!pr.is_interview
    }));

    return {
      page: p,
      pageSize: ps,
      totalItems,
      results: mapped
    };
  }

  // getProfileDetails(profileId)
  getProfileDetails(profileId) {
    const profiles = this._getFromStorage('profiles');
    const pr = profiles.find((p) => p.id === profileId);
    if (!pr) return null;

    return {
      id: pr.id,
      name: pr.name,
      role: pr.role || '',
      firm: pr.firm || '',
      region_label: this._formatRegionLabel(pr.region),
      country: pr.country || '',
      city: pr.city || '',
      biography: pr.biography || '',
      specialties: Array.isArray(pr.specialties) ? pr.specialties : [],
      is_interview: !!pr.is_interview,
      interview_content: pr.interview_content || ''
    };
  }

  // getProfileComments(profileId)
  getProfileComments(profileId) {
    const comments = this._getFromStorage('comments');
    const filtered = comments
      .filter((c) => c.profile_id === profileId && c.status === 'published')
      .sort((a, b) => {
        const da = this._parseDateSafe(a.created_at);
        const db = this._parseDateSafe(b.created_at);
        if (da && db) return da - db;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      });

    return filtered.map((c) => ({
      id: c.id,
      author_name: c.author_name,
      text: c.text,
      created_at: c.created_at || ''
    }));
  }

  // postProfileComment(profileId, author_name, text)
  postProfileComment(profileId, author_name, text) {
    const profiles = this._getFromStorage('profiles');
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) {
      return {
        success: false,
        comment: null,
        message: 'Profile not found.'
      };
    }

    const comments = this._getFromStorage('comments');
    const now = new Date().toISOString();
    const commentRecord = {
      id: this._generateId('comment'),
      profile_id: profileId,
      author_name: author_name,
      text: text,
      created_at: now,
      status: 'published',
      is_guest: true
    };
    comments.push(commentRecord);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      comment: {
        id: commentRecord.id,
        author_name: commentRecord.author_name,
        text: commentRecord.text,
        created_at: commentRecord.created_at,
        status: commentRecord.status
      },
      message: 'Comment posted.'
    };
  }

  // --------------------------
  // Products & Moodboards
  // --------------------------

  // getProductFilterOptions()
  getProductFilterOptions() {
    const products = this._getFromStorage('products');
    const unique = (arr) => Array.from(new Set(arr.filter((v) => v !== undefined && v !== null)));

    const categoriesValues = unique(products.map((p) => p.category));
    const subcategoriesValues = unique(products.map((p) => p.subcategory));

    const applicationSet = new Set();
    products.forEach((p) => {
      if (Array.isArray(p.application_spaces)) {
        p.application_spaces.forEach((s) => {
          if (s) applicationSet.add(s);
        });
      }
    });

    const availabilityValues = unique(products.map((p) => p.availability_status));

    const colorRangesSet = new Set();
    const colorRanges = [];
    products.forEach((p) => {
      if (
        typeof p.color_temperature_min_k === 'number' &&
        typeof p.color_temperature_max_k === 'number'
      ) {
        const key = `${p.color_temperature_min_k}-${p.color_temperature_max_k}`;
        if (!colorRangesSet.has(key)) {
          colorRangesSet.add(key);
          colorRanges.push({
            min: p.color_temperature_min_k,
            max: p.color_temperature_max_k,
            label: `${p.color_temperature_min_k}K–${p.color_temperature_max_k}K`
          });
        }
      }
    });

    const categories = categoriesValues.map((value) => ({
      value,
      label: this._formatProductCategoryLabel(value)
    }));

    const subcategories = subcategoriesValues.map((value) => ({
      value,
      label: this._formatProductSubcategoryLabel(value)
    }));

    const application_spaces = Array.from(applicationSet).map((value) => ({
      value,
      label: this._toTitleCaseFromEnum(value)
    }));

    const availability_statuses = availabilityValues.map((value) => ({
      value,
      label: this._formatAvailabilityLabel(value)
    }));

    const color_temperature_ranges_k = colorRanges;

    return {
      categories,
      subcategories,
      application_spaces,
      availability_statuses,
      color_temperature_ranges_k
    };
  }

  // searchProducts(query, page, pageSize, sortBy, filters)
  searchProducts(query, page, pageSize, sortBy, filters) {
    const products = this._getFromStorage('products');
    const q = query && typeof query === 'string' ? query.trim() : '';
    const f = filters || {};

    let results = products.filter((p) => {
      if (q && !this._matchQueryOnFields(p, q, ['name', 'description', 'brand'])) {
        return false;
      }

      if (f.category && p.category !== f.category) return false;
      if (f.subcategory && p.subcategory !== f.subcategory) return false;
      if (f.application_space) {
        if (!Array.isArray(p.application_spaces) || !p.application_spaces.includes(f.application_space)) return false;
      }
      if (typeof f.min_price === 'number') {
        if (typeof p.price !== 'number' || p.price < f.min_price) return false;
      }
      if (typeof f.max_price === 'number') {
        if (typeof p.price !== 'number' || p.price > f.max_price) return false;
      }
      if (f.availability_status && p.availability_status !== f.availability_status) return false;

      if (typeof f.color_temperature_min_k === 'number') {
        const maxK = p.color_temperature_max_k;
        if (typeof maxK !== 'number' || maxK < f.color_temperature_min_k) return false;
      }
      if (typeof f.color_temperature_max_k === 'number') {
        const minK = p.color_temperature_min_k;
        if (typeof minK !== 'number' || minK > f.color_temperature_max_k) return false;
      }

      return true;
    });

    const sb = sortBy || 'newest_first';
    if (sb === 'newest_first') {
      results.sort((a, b) => {
        const da = this._parseDateSafe(a.created_at);
        const db = this._parseDateSafe(b.created_at);
        if (da && db) return db - da;
        if (da && !db) return -1;
        if (!da && db) return 1;
        return 0;
      });
    } else if (sb === 'price_low_high') {
      results.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sb === 'price_high_low') {
      results.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Number.NEGATIVE_INFINITY;
        const pb = typeof b.price === 'number' ? b.price : Number.NEGATIVE_INFINITY;
        return pb - pa;
      });
    }

    const { page: p, pageSize: ps, totalItems, items } = this._paginate(results, page, pageSize);

    const mapped = items.map((pr) => ({
      id: pr.id,
      name: pr.name,
      description: pr.description || '',
      image_url: (pr.images && pr.images[0]) || '',
      price: typeof pr.price === 'number' ? pr.price : 0,
      currency: pr.currency || 'usd',
      category_label: this._formatProductCategoryLabel(pr.category),
      subcategory_label: this._formatProductSubcategoryLabel(pr.subcategory),
      availability_status: pr.availability_status || null,
      availability_label: this._formatAvailabilityLabel(pr.availability_status),
      color_temperature_min_k: typeof pr.color_temperature_min_k === 'number' ? pr.color_temperature_min_k : null,
      color_temperature_max_k: typeof pr.color_temperature_max_k === 'number' ? pr.color_temperature_max_k : null
    }));

    return {
      page: p,
      pageSize: ps,
      totalItems,
      results: mapped
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const pr = products.find((p) => p.id === productId);
    if (!pr) return null;

    return {
      id: pr.id,
      name: pr.name,
      description: pr.description || '',
      category_label: this._formatProductCategoryLabel(pr.category),
      subcategory_label: this._formatProductSubcategoryLabel(pr.subcategory),
      application_spaces: Array.isArray(pr.application_spaces) ? pr.application_spaces : [],
      price: typeof pr.price === 'number' ? pr.price : 0,
      currency: pr.currency || 'usd',
      availability_status: pr.availability_status || null,
      availability_label: this._formatAvailabilityLabel(pr.availability_status),
      color_temperature_min_k: typeof pr.color_temperature_min_k === 'number' ? pr.color_temperature_min_k : null,
      color_temperature_max_k: typeof pr.color_temperature_max_k === 'number' ? pr.color_temperature_max_k : null,
      brand: pr.brand || '',
      images: Array.isArray(pr.images) ? pr.images : [],
      specs: pr.specs || ''
    };
  }

  // getMoodboardsSummary()
  getMoodboardsSummary() {
    const moodboards = this._getFromStorage('moodboards');
    const items = this._getFromStorage('moodboard_items');

    return moodboards.map((m) => {
      const count = items.filter((it) => it.moodboard_id === m.id).length;
      return {
        id: m.id,
        name: m.name,
        description: m.description || '',
        created_at: m.created_at || '',
        updated_at: m.updated_at || '',
        item_count: count
      };
    });
  }

  // addProductToMoodboard(productId, moodboardId, moodboardName, notes)
  addProductToMoodboard(productId, moodboardId, moodboardName, notes) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        success: false,
        created_new_moodboard: false,
        moodboard: null,
        message: 'Product not found.'
      };
    }

    let moodboards = this._getFromStorage('moodboards');
    let items = this._getFromStorage('moodboard_items');

    let targetMoodboard = null;
    let createdNew = false;

    if (moodboardId) {
      targetMoodboard = moodboards.find((m) => m.id === moodboardId) || null;
      if (!targetMoodboard) {
        return {
          success: false,
          created_new_moodboard: false,
          moodboard: null,
          message: 'Moodboard not found.'
        };
      }
    } else if (moodboardName) {
      const { moodboard, created } = this._getOrCreateMoodboardByName(moodboardName);
      targetMoodboard = moodboard;
      createdNew = created;
      moodboards = this._getFromStorage('moodboards');
    } else {
      return {
        success: false,
        created_new_moodboard: false,
        moodboard: null,
        message: 'Either moodboardId or moodboardName must be provided.'
      };
    }

    const exists = items.some(
      (it) => it.moodboard_id === targetMoodboard.id && it.product_id === productId
    );
    if (!exists) {
      const now = new Date().toISOString();
      const newItem = {
        id: this._generateId('mbi'),
        moodboard_id: targetMoodboard.id,
        product_id: productId,
        added_at: now,
        notes: notes || ''
      };
      items.push(newItem);
      this._saveToStorage('moodboard_items', items);

      moodboards = this._getFromStorage('moodboards');
      const idx = moodboards.findIndex((m) => m.id === targetMoodboard.id);
      if (idx !== -1) {
        moodboards[idx].updated_at = now;
        this._saveToStorage('moodboards', moodboards);
        targetMoodboard = moodboards[idx];
      }
    }

    const finalItems = this._getFromStorage('moodboard_items');
    const itemCount = finalItems.filter((it) => it.moodboard_id === targetMoodboard.id).length;

    return {
      success: true,
      created_new_moodboard: createdNew,
      moodboard: {
        id: targetMoodboard.id,
        name: targetMoodboard.name,
        description: targetMoodboard.description || '',
        created_at: targetMoodboard.created_at || '',
        updated_at: targetMoodboard.updated_at || '',
        item_count: itemCount
      },
      message: 'Product added to moodboard.'
    };
  }

  // --------------------------
  // Newsletter
  // --------------------------

  // getNewsletterOptions()
  getNewsletterOptions() {
    // Based on enums from NewsletterSubscription model
    const job_roles = [
      { value: 'interior_designer', label: 'Interior Designer' },
      { value: 'architect', label: 'Architect' },
      { value: 'lighting_designer', label: 'Lighting Designer' },
      { value: 'hospitality_operator', label: 'Hospitality Operator' },
      { value: 'student', label: 'Student' },
      { value: 'other', label: 'Other' }
    ];

    const frequencies = [
      { value: 'weekly_digest', label: 'Weekly Digest' },
      { value: 'daily_brief', label: 'Daily Brief' },
      { value: 'monthly_digest', label: 'Monthly Digest' },
      { value: 'event_alerts', label: 'Event Alerts' }
    ];

    // Topic keys are free-form; provide common ones relevant to site structure
    const topics_of_interest = [
      { value: 'hotel_design', label: 'Hotel Design' },
      { value: 'sustainability', label: 'Sustainability' },
      { value: 'lighting', label: 'Lighting' },
      { value: 'restaurants', label: 'Restaurants' },
      { value: 'bars', label: 'Bars' },
      { value: 'resorts', label: 'Resorts' },
      { value: 'offices', label: 'Offices' }
    ];

    const regionsEnum = [
      'north_america',
      'south_america',
      'europe',
      'africa',
      'middle_east',
      'asia',
      'asia_pacific',
      'oceania',
      'global'
    ];

    const regions = regionsEnum.map((value) => ({
      value,
      label: this._formatRegionLabel(value)
    }));

    return {
      job_roles,
      frequencies,
      topics_of_interest,
      regions
    };
  }

  // submitNewsletterSubscription(full_name, email, job_role, frequency, topics_of_interest, preferred_region)
  submitNewsletterSubscription(
    full_name,
    email,
    job_role,
    frequency,
    topics_of_interest,
    preferred_region
  ) {
    if (!full_name || !email || !frequency) {
      return {
        success: false,
        subscription_id: null,
        message: 'full_name, email, and frequency are required.'
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions');
    const now = new Date().toISOString();
    const id = this._generateId('nls');

    const record = {
      id,
      full_name,
      email,
      job_role: job_role || null,
      frequency,
      topics_of_interest: Array.isArray(topics_of_interest) ? topics_of_interest : [],
      preferred_region: preferred_region || null,
      created_at: now,
      is_active: true
    };

    subs.push(record);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription_id: id,
      message: 'Newsletter subscription submitted.'
    };
  }

  // --------------------------
  // CMS-like Content: About, Contact, Privacy, Terms
  // --------------------------

  // getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (!raw || raw === 'null') {
      // Default empty content if not configured
      return {
        headline: '',
        body: '',
        team_members: []
      };
    }
    const parsed = JSON.parse(raw);
    return {
      headline: parsed.headline || '',
      body: parsed.body || '',
      team_members: Array.isArray(parsed.team_members) ? parsed.team_members : []
    };
  }

  // getContactPageInfo()
  getContactPageInfo() {
    const raw = localStorage.getItem('contact_page_info');
    if (!raw || raw === 'null') {
      return {
        contact_emails: [],
        form_topics: []
      };
    }
    const parsed = JSON.parse(raw);
    return {
      contact_emails: Array.isArray(parsed.contact_emails) ? parsed.contact_emails : [],
      form_topics: Array.isArray(parsed.form_topics) ? parsed.form_topics : []
    };
  }

  // submitContactInquiry(name, email, topic, message)
  submitContactInquiry(name, email, topic, messageText) {
    if (!name || !email || !messageText) {
      return {
        success: false,
        message: 'name, email, and message are required.'
      };
    }

    const inquiries = this._getFromStorage('contact_inquiries');
    const now = new Date().toISOString();
    const record = {
      id: this._generateId('inq'),
      name,
      email,
      topic: topic || null,
      message: messageText,
      created_at: now
    };
    inquiries.push(record);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted.'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    if (!raw || raw === 'null') {
      return {
        last_updated: '',
        body: ''
      };
    }
    const parsed = JSON.parse(raw);
    return {
      last_updated: parsed.last_updated || '',
      body: parsed.body || ''
    };
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const raw = localStorage.getItem('terms_and_conditions_content');
    if (!raw || raw === 'null') {
      return {
        last_updated: '',
        body: ''
      };
    }
    const parsed = JSON.parse(raw);
    return {
      last_updated: parsed.last_updated || '',
      body: parsed.body || ''
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
