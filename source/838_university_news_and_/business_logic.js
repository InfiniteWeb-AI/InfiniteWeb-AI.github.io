'use strict';

// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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

  // ----------------------
  // Storage initialization
  // ----------------------

  _initStorage() {
    const keys = [
      'sections',
      'content_items',
      'media_galleries',
      'reading_list_items',
      'watch_later_items',
      'comparison_lists',
      'comparison_items',
      'collections',
      'collection_items',
      'personal_tags',
      'personal_tag_assignments',
      'rss_feed_definitions'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Utility keys
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    if (!localStorage.getItem('current_comparison_list_id')) {
      localStorage.setItem('current_comparison_list_id', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      // If data is corrupted, reset to empty array
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentStr = localStorage.getItem('idCounter');
    let current = parseInt(currentStr, 10);
    if (!Number.isFinite(current)) current = 1000;
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d;
  }

  _compareDatesAsc(a, b) {
    const da = this._parseDate(a) || new Date(0);
    const db = this._parseDate(b) || new Date(0);
    return da - db;
  }

  _compareDatesDesc(a, b) {
    const da = this._parseDate(a) || new Date(0);
    const db = this._parseDate(b) || new Date(0);
    return db - da;
  }

  _unique(array) {
    return Array.from(new Set(array.filter(function (x) { return x !== undefined && x !== null; })));
  }

  _humanizeEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(function (part) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  _findById(list, id) {
    return list.find(function (item) { return item.id === id; }) || null;
  }

  // Simple text match for queries
  _normalizeText(text) {
    return (text || '').toString().toLowerCase();
  }

  _matchesQuery(contentItem, query) {
    if (!query) return true;
    const q = this._normalizeText(query);
    if (!q) return true;

    const fields = [
      contentItem.title,
      contentItem.summary,
      contentItem.body
    ];

    for (let i = 0; i < fields.length; i++) {
      if (this._normalizeText(fields[i]).indexOf(q) !== -1) return true;
    }

    // Check keywords array
    if (Array.isArray(contentItem.keywords)) {
      for (let i = 0; i < contentItem.keywords.length; i++) {
        if (this._normalizeText(contentItem.keywords[i]).indexOf(q) !== -1) return true;
      }
    }

    // Check system_tags as well
    if (Array.isArray(contentItem.system_tags)) {
      for (let i = 0; i < contentItem.system_tags.length; i++) {
        if (this._normalizeText(contentItem.system_tags[i]).indexOf(q) !== -1) return true;
      }
    }

    return false;
  }

  // Apply rich filters to a list of ContentItem objects
  _applyContentFilters(items, filters) {
    var self = this;
    if (!filters) return items;

    return items.filter(function (item) {
      // sectionIds handled outside when needed

      if (filters.year != null && item.year !== filters.year) return false;

      if (filters.dateFrom) {
        var df = self._parseDate(filters.dateFrom);
        var ip = self._parseDate(item.publish_date);
        if (df && ip && ip < df) return false;
      }

      if (filters.dateTo) {
        var dt = self._parseDate(filters.dateTo);
        var ip2 = self._parseDate(item.publish_date);
        if (dt && ip2 && ip2 > dt) return false;
      }

      if (filters.contentType && item.content_type !== filters.contentType) return false;

      if (filters.collegeSchool && item.college_school !== filters.collegeSchool) return false;

      if (filters.sport && item.sport !== filters.sport) return false;

      if (filters.isHomeGame != null) {
        if (!!item.is_home_game !== !!filters.isHomeGame) return false;
      }

      if (filters.isResearchHighlight != null) {
        if (!!item.is_research_highlight !== !!filters.isResearchHighlight) return false;
      }

      if (filters.isEventRecap != null) {
        if (!!item.is_event_recap !== !!filters.isEventRecap) return false;
      }

      if (filters.eventType && item.event_type !== filters.eventType) return false;

      if (filters.durationCategory && item.duration_category !== filters.durationCategory) return false;

      if (Array.isArray(filters.systemTags) && filters.systemTags.length > 0) {
        var st = Array.isArray(item.system_tags) ? item.system_tags : [];
        var hasAllSystemTags = filters.systemTags.every(function (tag) {
          return st.indexOf(tag) !== -1;
        });
        if (!hasAllSystemTags) return false;
      }

      if (Array.isArray(filters.keywords) && filters.keywords.length > 0) {
        var kw = Array.isArray(item.keywords) ? item.keywords : [];
        var hasAllKeywords = filters.keywords.every(function (k) {
          return kw.indexOf(k) !== -1;
        });
        if (!hasAllKeywords) return false;
      }

      // 'topic' may map to event_type or appear in tags/keywords
      if (filters.topic) {
        var topic = filters.topic;
        var topicMatch = false;
        if (item.event_type === topic) topicMatch = true;
        var st2 = Array.isArray(item.system_tags) ? item.system_tags : [];
        if (!topicMatch && st2.indexOf(topic) !== -1) topicMatch = true;
        var kw2 = Array.isArray(item.keywords) ? item.keywords : [];
        if (!topicMatch && kw2.indexOf(topic) !== -1) topicMatch = true;
        if (!topicMatch) return false;
      }

      return true;
    });
  }

  _applySortToContent(items, sort) {
    var sortKey = sort || 'relevance';
    var self = this;
    var cloned = items.slice();

    if (sortKey === 'newest_first') {
      cloned.sort(function (a, b) {
        return self._compareDatesDesc(a.publish_date, b.publish_date);
      });
    } else if (sortKey === 'oldest_first') {
      cloned.sort(function (a, b) {
        return self._compareDatesAsc(a.publish_date, b.publish_date);
      });
    } else if (sortKey === 'most_viewed') {
      cloned.sort(function (a, b) {
        var va = a.view_count || 0;
        var vb = b.view_count || 0;
        return vb - va;
      });
    } else if (sortKey === 'relevance') {
      // Fallback to newest_first; true relevance would require query scoring
      cloned.sort(function (a, b) {
        return self._compareDatesDesc(a.publish_date, b.publish_date);
      });
    } else {
      // Unknown sort -> default newest_first
      cloned.sort(function (a, b) {
        return self._compareDatesDesc(a.publish_date, b.publish_date);
      });
    }

    return cloned;
  }

  _paginate(items, page, pageSize) {
    var p = page && page > 0 ? page : 1;
    var ps = pageSize && pageSize > 0 ? pageSize : 20;
    var start = (p - 1) * ps;
    var end = start + ps;
    var slice = items.slice(start, end);
    return {
      items: slice,
      total: items.length,
      page: p,
      pageSize: ps
    };
  }

  // ----------------------
  // Helper functions (required in spec)
  // ----------------------

  _getOrCreateComparisonList() {
    var comparisonLists = this._getFromStorage('comparison_lists');
    var currentId = localStorage.getItem('current_comparison_list_id') || '';
    var current = currentId ? this._findById(comparisonLists, currentId) : null;

    if (!current) {
      var newList = {
        id: this._generateId('comparison_list'),
        name: 'Default Comparison List',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      comparisonLists.push(newList);
      this._saveToStorage('comparison_lists', comparisonLists);
      localStorage.setItem('current_comparison_list_id', newList.id);
      current = newList;
    }

    return current;
  }

  _getOrCreateWatchLaterQueue() {
    // We model the queue purely via watch_later_items, but ensure the key exists
    var items = this._getFromStorage('watch_later_items');
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('watch_later_items', items);
    }
    return items;
  }

  _getOrCreatePersonalTagByLabel(label) {
    var normalized = (label || '').trim();
    if (!normalized) return null;

    var personalTags = this._getFromStorage('personal_tags');
    var existing = personalTags.find(function (t) {
      return (t.label || '').toLowerCase() === normalized.toLowerCase();
    });

    if (existing) return existing;

    var newTag = {
      id: this._generateId('personal_tag'),
      label: normalized,
      created_at: this._nowIso()
    };

    personalTags.push(newTag);
    this._saveToStorage('personal_tags', personalTags);
    return newTag;
  }

  _generateRssUrlForDefinition(def) {
    // Construct a deterministic URL-like string for the RSS feed definition
    var base = 'https://example.com/rss';
    var params = [];
    if (def.source_section_id) params.push('section=' + encodeURIComponent(def.source_section_id));
    if (def.keywords) params.push('q=' + encodeURIComponent(def.keywords));
    if (def.date_preset) params.push('date_preset=' + encodeURIComponent(def.date_preset));
    if (def.date_from) params.push('from=' + encodeURIComponent(def.date_from));
    if (def.date_to) params.push('to=' + encodeURIComponent(def.date_to));
    if (def.content_type) params.push('content_type=' + encodeURIComponent(def.content_type));
    if (def.college_school) params.push('college=' + encodeURIComponent(def.college_school));
    if (def.year != null) params.push('year=' + encodeURIComponent(def.year));

    var query = params.length ? '?' + params.join('&') : '';
    return base + '/' + encodeURIComponent(def.id) + query;
  }

  _resolveSectionSpecificFilters(sectionId, filters) {
    // For future extensibility; currently just returns a shallow copy and normalizes some aliases
    var resolved = Object.assign({}, filters || {});

    if (sectionId === 'events_recaps') {
      // For events section, treat topic as eventType if it matches known event types
      if (resolved.topic && !resolved.eventType) {
        resolved.eventType = resolved.topic;
      }
    }

    if (sectionId === 'sports') {
      // For sports, topic could someday map to sport, but we keep them independent for now
    }

    return resolved;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getSectionsOverviewForHome(): Section[]
  getSectionsOverviewForHome() {
    var sections = this._getFromStorage('sections');
    return sections;
  }

  // getHomePageContent()
  getHomePageContent() {
    var sections = this._getFromStorage('sections');
    var contentItems = this._getFromStorage('content_items');
    var self = this;

    // Featured by section: take up to 3 newest per section
    var featuredBySection = sections.map(function (section) {
      var itemsForSection = contentItems.filter(function (item) {
        return item.section_id === section.id;
      });
      itemsForSection = self._applySortToContent(itemsForSection, 'newest_first').slice(0, 3);
      return {
        section: section,
        featuredItems: itemsForSection
      };
    });

    // Recent items across all sections: top 10 newest
    var recentItems = self._applySortToContent(contentItems, 'newest_first').slice(0, 10);

    return {
      featuredBySection: featuredBySection,
      recentItems: recentItems
    };
  }

  // getPersonalAreaSummary()
  getPersonalAreaSummary() {
    var readingListItems = this._getFromStorage('reading_list_items');
    var watchLaterItems = this._getFromStorage('watch_later_items');
    var collections = this._getFromStorage('collections');
    var comparisonItems = this._getFromStorage('comparison_items');

    return {
      readingListCount: readingListItems.length,
      watchLaterCount: watchLaterItems.length,
      collectionsCount: collections.length,
      comparisonListCount: comparisonItems.length
    };
  }

  // searchGlobalContent(query, filters, sort, page, pageSize)
  searchGlobalContent(query, filters, sort, page, pageSize) {
    var contentItems = this._getFromStorage('content_items');
    var q = (query || '').trim();
    var self = this;
    var effectiveFilters = Object.assign({}, filters || {});

    // Section filter
    if (Array.isArray(effectiveFilters.sectionIds) && effectiveFilters.sectionIds.length > 0) {
      contentItems = contentItems.filter(function (item) {
        return effectiveFilters.sectionIds.indexOf(item.section_id) !== -1;
      });
    }

    // Text query
    if (q) {
      contentItems = contentItems.filter(function (item) {
        return self._matchesQuery(item, q);
      });
    }

    // Apply remaining filters
    var filtered = this._applyContentFilters(contentItems, effectiveFilters);

    // Sort
    var sorted = this._applySortToContent(filtered, sort || 'relevance');

    // Paginate
    var pageResult = this._paginate(sorted, page || 1, pageSize || 20);

    return {
      items: pageResult.items,
      total: pageResult.total,
      page: pageResult.page,
      pageSize: pageResult.pageSize
    };
  }

  // getGlobalSearchFilterOptions(query)
  getGlobalSearchFilterOptions(query) {
    var contentItems = this._getFromStorage('content_items');
    var sections = this._getFromStorage('sections');
    var self = this;
    var q = (query || '').trim();

    if (q) {
      contentItems = contentItems.filter(function (item) {
        return self._matchesQuery(item, q);
      });
    }

    var sectionIdsSet = new Set();
    var yearsSet = new Set();
    var contentTypesSet = new Set();
    var eventTypesSet = new Set();
    var sportsSet = new Set();
    var collegesSet = new Set();
    var durationCategoriesSet = new Set();

    contentItems.forEach(function (item) {
      if (item.section_id) sectionIdsSet.add(item.section_id);
      if (item.year != null) yearsSet.add(item.year);
      if (item.content_type) contentTypesSet.add(item.content_type);
      if (item.event_type) eventTypesSet.add(item.event_type);
      if (item.sport) sportsSet.add(item.sport);
      if (item.college_school) collegesSet.add(item.college_school);
      if (item.duration_category) durationCategoriesSet.add(item.duration_category);
    });

    var sectionsFiltered = sections.filter(function (s) { return sectionIdsSet.has(s.id); });

    return {
      sections: sectionsFiltered,
      years: Array.from(yearsSet).sort(),
      contentTypes: Array.from(contentTypesSet),
      eventTypes: Array.from(eventTypesSet),
      sports: Array.from(sportsSet),
      collegesSchools: Array.from(collegesSet),
      durationCategories: Array.from(durationCategoriesSet)
    };
  }

  // getSectionListing(sectionId, searchQuery, filters, sort, page, pageSize)
  getSectionListing(sectionId, searchQuery, filters, sort, page, pageSize) {
    var sections = this._getFromStorage('sections');
    var section = this._findById(sections, sectionId);
    if (!section) {
      return {
        section: null,
        items: [],
        total: 0,
        page: page || 1,
        pageSize: pageSize || 20
      };
    }

    var contentItems = this._getFromStorage('content_items');
    var self = this;

    var itemsForSection = contentItems.filter(function (item) {
      return item.section_id === sectionId;
    });

    var q = (searchQuery || '').trim();
    if (q) {
      itemsForSection = itemsForSection.filter(function (item) {
        return self._matchesQuery(item, q);
      });
    }

    var effectiveFilters = this._resolveSectionSpecificFilters(sectionId, filters || {});
    var filtered = this._applyContentFilters(itemsForSection, effectiveFilters);
    var sorted = this._applySortToContent(filtered, sort || 'newest_first');
    var pageResult = this._paginate(sorted, page || 1, pageSize || 20);

    return {
      section: section,
      items: pageResult.items,
      total: pageResult.total,
      page: pageResult.page,
      pageSize: pageResult.pageSize
    };
  }

  // getSectionFilterOptions(sectionId)
  getSectionFilterOptions(sectionId) {
    var sections = this._getFromStorage('sections');
    var section = this._findById(sections, sectionId);
    if (!section) {
      return {
        years: [],
        topics: [],
        sports: [],
        contentTypes: [],
        collegesSchools: [],
        durationCategories: []
      };
    }

    var contentItems = this._getFromStorage('content_items');
    var itemsForSection = contentItems.filter(function (item) {
      return item.section_id === sectionId;
    });

    var yearsSet = new Set();
    var topicsMap = new Map();
    var sportsSet = new Set();
    var contentTypesSet = new Set();
    var collegesSet = new Set();
    var durationCategoriesSet = new Set();

    var self = this;

    itemsForSection.forEach(function (item) {
      if (item.year != null) yearsSet.add(item.year);
      if (item.event_type) {
        if (!topicsMap.has(item.event_type)) {
          topicsMap.set(item.event_type, {
            id: item.event_type,
            label: self._humanizeEnum(item.event_type)
          });
        }
      }
      // Also consider system_tags as topics
      if (Array.isArray(item.system_tags)) {
        item.system_tags.forEach(function (tag) {
          if (!topicsMap.has(tag)) {
            topicsMap.set(tag, {
              id: tag,
              label: self._humanizeEnum(tag)
            });
          }
        });
      }

      if (item.sport) sportsSet.add(item.sport);
      if (item.content_type) contentTypesSet.add(item.content_type);
      if (item.college_school) collegesSet.add(item.college_school);
      if (item.duration_category) durationCategoriesSet.add(item.duration_category);
    });

    return {
      years: Array.from(yearsSet).sort(),
      topics: Array.from(topicsMap.values()),
      sports: Array.from(sportsSet),
      contentTypes: Array.from(contentTypesSet),
      collegesSchools: Array.from(collegesSet),
      durationCategories: Array.from(durationCategoriesSet)
    };
  }

  // getContentItemDetail(contentId)
  getContentItemDetail(contentId) {
    var contentItems = this._getFromStorage('content_items');
    var sections = this._getFromStorage('sections');
    var mediaGalleries = this._getFromStorage('media_galleries');
    var readingListItems = this._getFromStorage('reading_list_items');
    var watchLaterItems = this._getFromStorage('watch_later_items');
    var comparisonItems = this._getFromStorage('comparison_items');
    var collections = this._getFromStorage('collections');
    var collectionItems = this._getFromStorage('collection_items');
    var personalTags = this._getFromStorage('personal_tags');
    var personalTagAssignments = this._getFromStorage('personal_tag_assignments');

    var contentItem = this._findById(contentItems, contentId);
    if (!contentItem) {
      return {
        contentItem: null,
        section: null,
        mediaGallery: null,
        userState: {
          isInReadingList: false,
          isInWatchLater: false,
          isInComparisonList: false,
          collections: [],
          personalTags: []
        }
      };
    }

    var section = sections.find(function (s) { return s.id === contentItem.section_id; }) || null;
    var mediaGallery = null;
    if (contentItem.media_gallery_id) {
      mediaGallery = mediaGalleries.find(function (g) { return g.id === contentItem.media_gallery_id; }) || null;
    }

    var isInReadingList = readingListItems.some(function (r) { return r.content_id === contentId; });
    var isInWatchLater = watchLaterItems.some(function (w) { return w.content_id === contentId; });
    var isInComparisonList = comparisonItems.some(function (c) { return c.content_id === contentId; });

    var collectionIdsSet = new Set();
    collectionItems.forEach(function (ci) {
      if (ci.content_id === contentId) collectionIdsSet.add(ci.collection_id);
    });
    var collectionsForContent = collections.filter(function (c) { return collectionIdsSet.has(c.id); });

    var tagIdsSet = new Set();
    personalTagAssignments.forEach(function (pta) {
      if (pta.content_id === contentId) tagIdsSet.add(pta.personal_tag_id);
    });
    var personalTagsForContent = personalTags.filter(function (t) { return tagIdsSet.has(t.id); });

    return {
      contentItem: contentItem,
      section: section,
      mediaGallery: mediaGallery,
      userState: {
        isInReadingList: isInReadingList,
        isInWatchLater: isInWatchLater,
        isInComparisonList: isInComparisonList,
        collections: collectionsForContent,
        personalTags: personalTagsForContent
      }
    };
  }

  // getMediaGalleryForContent(contentId)
  getMediaGalleryForContent(contentId) {
    var contentItems = this._getFromStorage('content_items');
    var mediaGalleries = this._getFromStorage('media_galleries');
    var contentItem = this._findById(contentItems, contentId);
    if (!contentItem || !contentItem.media_gallery_id) {
      return null;
    }
    var gallery = mediaGalleries.find(function (g) { return g.id === contentItem.media_gallery_id; }) || null;

    // Instrumentation for task completion tracking (task_7)
    try {
      if (gallery) {
        localStorage.setItem(
          'task7_galleryOpened',
          JSON.stringify({ contentId: contentId, openedAt: this._nowIso() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task7_galleryOpened):', e);
    }

    return gallery;
  }

  // saveContentToReadingList(contentId, source, notes)
  saveContentToReadingList(contentId, source, notes) {
    var contentItems = this._getFromStorage('content_items');
    var contentItem = this._findById(contentItems, contentId);
    if (!contentItem) {
      return { success: false, readingListItem: null, totalCount: this._getFromStorage('reading_list_items').length };
    }

    var readingListItems = this._getFromStorage('reading_list_items');

    var existing = readingListItems.find(function (r) { return r.content_id === contentId; });
    if (existing) {
      // Update source/notes if provided
      if (source) existing.source = source;
      if (typeof notes === 'string') existing.notes = notes;
      this._saveToStorage('reading_list_items', readingListItems);
      return {
        success: true,
        readingListItem: existing,
        totalCount: readingListItems.length
      };
    }

    var item = {
      id: this._generateId('reading_list_item'),
      content_id: contentId,
      source: source || 'bookmark',
      saved_at: this._nowIso(),
      notes: typeof notes === 'string' ? notes : undefined
    };

    readingListItems.push(item);
    this._saveToStorage('reading_list_items', readingListItems);

    return {
      success: true,
      readingListItem: item,
      totalCount: readingListItems.length
    };
  }

  // getReadingList(filters, sort, page, pageSize)
  getReadingList(filters, sort, page, pageSize) {
    var readingListItems = this._getFromStorage('reading_list_items');
    var contentItems = this._getFromStorage('content_items');
    var sections = this._getFromStorage('sections');
    var personalTags = this._getFromStorage('personal_tags');
    var personalTagAssignments = this._getFromStorage('personal_tag_assignments');

    var effectiveFilters = filters || {};

    // First, join reading list with content
    var joined = readingListItems.map(function (rli) {
      var content = contentItems.find(function (c) { return c.id === rli.content_id; }) || null;
      var section = content ? sections.find(function (s) { return s.id === content.section_id; }) || null : null;

      // Resolve personal tags for this content
      var tagIds = personalTagAssignments
        .filter(function (pta) { return pta.content_id === rli.content_id; })
        .map(function (pta) { return pta.personal_tag_id; });
      var tags = personalTags.filter(function (t) { return tagIds.indexOf(t.id) !== -1; });

      return {
        readingListItem: rli,
        content: content,
        section: section,
        personalTags: tags
      };
    });

    // Apply filters
    if (effectiveFilters.sectionId) {
      joined = joined.filter(function (item) {
        return item.section && item.section.id === effectiveFilters.sectionId;
      });
    }

    if (effectiveFilters.year != null) {
      joined = joined.filter(function (item) {
        return item.content && item.content.year === effectiveFilters.year;
      });
    }

    if (effectiveFilters.contentType) {
      joined = joined.filter(function (item) {
        return item.content && item.content.content_type === effectiveFilters.contentType;
      });
    }

    if (Array.isArray(effectiveFilters.personalTagIds) && effectiveFilters.personalTagIds.length > 0) {
      joined = joined.filter(function (item) {
        var tagIds = item.personalTags.map(function (t) { return t.id; });
        return effectiveFilters.personalTagIds.some(function (id) { return tagIds.indexOf(id) !== -1; });
      });
    }

    // Sorting
    var sortKey = sort || 'date_saved_desc';
    joined.sort(function (a, b) {
      if (sortKey === 'date_saved_asc') {
        return (a.readingListItem.saved_at || '').localeCompare(b.readingListItem.saved_at || '');
      } else if (sortKey === 'date_saved_desc') {
        return (b.readingListItem.saved_at || '').localeCompare(a.readingListItem.saved_at || '');
      } else if (sortKey === 'publish_date_asc') {
        var pa = a.content ? a.content.publish_date : null;
        var pb = b.content ? b.content.publish_date : null;
        return (pa || '').localeCompare(pb || '');
      } else if (sortKey === 'publish_date_desc') {
        var pa2 = a.content ? a.content.publish_date : null;
        var pb2 = b.content ? b.content.publish_date : null;
        return (pb2 || '').localeCompare(pa2 || '');
      }
      // Default to date_saved_desc
      return (b.readingListItem.saved_at || '').localeCompare(a.readingListItem.saved_at || '');
    });

    var p = page && page > 0 ? page : 1;
    var ps = pageSize && pageSize > 0 ? pageSize : 50;
    var start = (p - 1) * ps;
    var end = start + ps;
    var slice = joined.slice(start, end);

    return {
      items: slice,
      total: joined.length,
      page: p,
      pageSize: ps
    };
  }

  // getReadingListFilterOptions()
  getReadingListFilterOptions() {
    var readingListItems = this._getFromStorage('reading_list_items');
    var contentItems = this._getFromStorage('content_items');
    var sections = this._getFromStorage('sections');
    var personalTags = this._getFromStorage('personal_tags');

    var yearsSet = new Set();
    var sectionIdsSet = new Set();
    var contentTypesSet = new Set();

    readingListItems.forEach(function (rli) {
      var content = contentItems.find(function (c) { return c.id === rli.content_id; });
      if (!content) return;
      if (content.year != null) yearsSet.add(content.year);
      if (content.section_id) sectionIdsSet.add(content.section_id);
      if (content.content_type) contentTypesSet.add(content.content_type);
    });

    var sectionsFiltered = sections.filter(function (s) { return sectionIdsSet.has(s.id); });

    return {
      sections: sectionsFiltered,
      years: Array.from(yearsSet).sort(),
      contentTypes: Array.from(contentTypesSet),
      personalTags: personalTags
    };
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    var readingListItems = this._getFromStorage('reading_list_items');
    var initialLength = readingListItems.length;
    var filtered = readingListItems.filter(function (r) { return r.id !== readingListItemId; });
    var success = filtered.length !== initialLength;
    this._saveToStorage('reading_list_items', filtered);
    return {
      success: success,
      totalCount: filtered.length
    };
  }

  // addToWatchLater(contentId)
  addToWatchLater(contentId) {
    var contentItems = this._getFromStorage('content_items');
    var content = this._findById(contentItems, contentId);
    if (!content) {
      return { success: false, watchLaterItem: null, totalCount: this._getFromStorage('watch_later_items').length };
    }

    var watchLaterItems = this._getOrCreateWatchLaterQueue();

    var existing = watchLaterItems.find(function (w) { return w.content_id === contentId; });
    if (existing) {
      return {
        success: true,
        watchLaterItem: existing,
        totalCount: watchLaterItems.length
      };
    }

    var maxPosition = 0;
    watchLaterItems.forEach(function (w) {
      if (typeof w.position === 'number' && w.position > maxPosition) {
        maxPosition = w.position;
      }
    });

    var item = {
      id: this._generateId('watch_later_item'),
      content_id: contentId,
      added_at: this._nowIso(),
      position: maxPosition + 1
    };

    watchLaterItems.push(item);
    this._saveToStorage('watch_later_items', watchLaterItems);

    return {
      success: true,
      watchLaterItem: item,
      totalCount: watchLaterItems.length
    };
  }

  // getWatchLaterQueue(sort, groupBySection)
  getWatchLaterQueue(sort, groupBySection) {
    var watchLaterItems = this._getFromStorage('watch_later_items');
    var contentItems = this._getFromStorage('content_items');
    var sections = this._getFromStorage('sections');

    var joined = watchLaterItems.map(function (wli) {
      var content = contentItems.find(function (c) { return c.id === wli.content_id; }) || null;
      var section = content ? sections.find(function (s) { return s.id === content.section_id; }) || null : null;
      return {
        watchLaterItem: wli,
        content: content,
        section: section
      };
    });

    var sortKey = sort || 'date_added_desc';
    joined.sort(function (a, b) {
      var aDate = a.watchLaterItem.added_at || '';
      var bDate = b.watchLaterItem.added_at || '';
      if (sortKey === 'date_added_asc') {
        return aDate.localeCompare(bDate);
      }
      // default and 'date_added_desc'
      return bDate.localeCompare(aDate);
    });

    if (groupBySection) {
      // Stable sort by section name while preserving date ordering within each section
      joined.sort(function (a, b) {
        var an = a.section ? a.section.name || '' : '';
        var bn = b.section ? b.section.name || '' : '';
        if (an === bn) return 0;
        return an.localeCompare(bn);
      });
    }

    return {
      items: joined,
      total: joined.length
    };
  }

  // removeFromWatchLater(watchLaterItemId)
  removeFromWatchLater(watchLaterItemId) {
    var watchLaterItems = this._getFromStorage('watch_later_items');
    var initialLength = watchLaterItems.length;
    var filtered = watchLaterItems.filter(function (w) { return w.id !== watchLaterItemId; });
    var success = filtered.length !== initialLength;

    // Re-normalize positions
    filtered.sort(function (a, b) {
      var pa = typeof a.position === 'number' ? a.position : 0;
      var pb = typeof b.position === 'number' ? b.position : 0;
      return pa - pb;
    });
    filtered.forEach(function (w, index) {
      w.position = index + 1;
    });

    this._saveToStorage('watch_later_items', filtered);

    return {
      success: success,
      totalCount: filtered.length
    };
  }

  // reorderWatchLaterQueue(orderedItemIds)
  reorderWatchLaterQueue(orderedItemIds) {
    var watchLaterItems = this._getFromStorage('watch_later_items');
    var idToItem = new Map();
    watchLaterItems.forEach(function (w) { idToItem.set(w.id, w); });

    var newOrder = [];

    // First, items in the specified order
    orderedItemIds.forEach(function (id) {
      var item = idToItem.get(id);
      if (item) newOrder.push(item);
    });

    // Then, any remaining items in their previous relative order
    watchLaterItems.forEach(function (item) {
      if (!orderedItemIds.includes(item.id)) {
        newOrder.push(item);
      }
    });

    newOrder.forEach(function (item, index) {
      item.position = index + 1;
    });

    this._saveToStorage('watch_later_items', newOrder);

    return {
      success: true
    };
  }

  // addContentToComparisonList(contentId)
  addContentToComparisonList(contentId) {
    var contentItems = this._getFromStorage('content_items');
    var content = this._findById(contentItems, contentId);
    if (!content) {
      return { success: false, comparisonList: null, comparisonItems: [] };
    }

    var comparisonList = this._getOrCreateComparisonList();
    var comparisonItems = this._getFromStorage('comparison_items');

    var itemsForList = comparisonItems.filter(function (ci) { return ci.comparison_list_id === comparisonList.id; });

    var existing = itemsForList.find(function (ci) { return ci.content_id === contentId; });
    if (!existing) {
      var maxPosition = 0;
      itemsForList.forEach(function (ci) {
        if (typeof ci.position === 'number' && ci.position > maxPosition) maxPosition = ci.position;
      });

      var newItem = {
        id: this._generateId('comparison_item'),
        comparison_list_id: comparisonList.id,
        content_id: contentId,
        added_at: this._nowIso(),
        position: maxPosition + 1
      };

      comparisonItems.push(newItem);
      this._saveToStorage('comparison_items', comparisonItems);
      itemsForList.push(newItem);

      comparisonList.updated_at = this._nowIso();
      var comparisonLists = this._getFromStorage('comparison_lists');
      var idx = comparisonLists.findIndex(function (cl) { return cl.id === comparisonList.id; });
      if (idx !== -1) {
        comparisonLists[idx] = comparisonList;
        this._saveToStorage('comparison_lists', comparisonLists);
      }
    }

    itemsForList = comparisonItems.filter(function (ci) { return ci.comparison_list_id === comparisonList.id; });

    return {
      success: true,
      comparisonList: comparisonList,
      comparisonItems: itemsForList
    };
  }

  // getComparisonList()
  getComparisonList() {
    var comparisonList = this._getOrCreateComparisonList();
    var comparisonItems = this._getFromStorage('comparison_items');
    var contentItems = this._getFromStorage('content_items');
    var sections = this._getFromStorage('sections');

    var itemsForList = comparisonItems
      .filter(function (ci) { return ci.comparison_list_id === comparisonList.id; })
      .sort(function (a, b) {
        var pa = typeof a.position === 'number' ? a.position : 0;
        var pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });

    var joined = itemsForList.map(function (ci) {
      var content = contentItems.find(function (c) { return c.id === ci.content_id; }) || null;
      var section = content ? sections.find(function (s) { return s.id === content.section_id; }) || null : null;
      return {
        comparisonItem: ci,
        content: content,
        section: section
      };
    });

    return {
      comparisonList: comparisonList,
      items: joined
    };
  }

  // removeComparisonItem(comparisonItemId)
  removeComparisonItem(comparisonItemId) {
    var comparisonItems = this._getFromStorage('comparison_items');
    var initialLength = comparisonItems.length;
    var filtered = comparisonItems.filter(function (ci) { return ci.id !== comparisonItemId; });
    var success = filtered.length !== initialLength;

    // Re-normalize positions within each comparison_list_id
    var byList = new Map();
    filtered.forEach(function (ci) {
      if (!byList.has(ci.comparison_list_id)) byList.set(ci.comparison_list_id, []);
      byList.get(ci.comparison_list_id).push(ci);
    });
    byList.forEach(function (items) {
      items.sort(function (a, b) {
        var pa = typeof a.position === 'number' ? a.position : 0;
        var pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });
      items.forEach(function (ci, idx) {
        ci.position = idx + 1;
      });
    });

    this._saveToStorage('comparison_items', filtered);

    return {
      success: success
    };
  }

  // createCollection(name, description)
  createCollection(name, description) {
    var collections = this._getFromStorage('collections');
    var now = this._nowIso();
    var collection = {
      id: this._generateId('collection'),
      name: name,
      description: description,
      created_at: now,
      updated_at: now
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);
    return { collection: collection };
  }

  // getCollectionsOverview()
  getCollectionsOverview() {
    var collections = this._getFromStorage('collections');
    var collectionItems = this._getFromStorage('collection_items');

    var overview = collections.map(function (c) {
      var itemsForCollection = collectionItems.filter(function (ci) { return ci.collection_id === c.id; });
      var itemCount = itemsForCollection.length;
      var lastUpdatedAt = c.updated_at || c.created_at;
      itemsForCollection.forEach(function (ci) {
        if (ci.added_at && (!lastUpdatedAt || ci.added_at > lastUpdatedAt)) {
          lastUpdatedAt = ci.added_at;
        }
      });
      return {
        collection: c,
        itemCount: itemCount,
        lastUpdatedAt: lastUpdatedAt || null
      };
    });

    return overview;
  }

  // renameCollection(collectionId, newName)
  renameCollection(collectionId, newName) {
    var collections = this._getFromStorage('collections');
    var idx = collections.findIndex(function (c) { return c.id === collectionId; });
    if (idx === -1) {
      return { collection: null };
    }
    collections[idx].name = newName;
    collections[idx].updated_at = this._nowIso();
    this._saveToStorage('collections', collections);
    return { collection: collections[idx] };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    var collections = this._getFromStorage('collections');
    var collectionItems = this._getFromStorage('collection_items');

    var newCollections = collections.filter(function (c) { return c.id !== collectionId; });
    var success = newCollections.length !== collections.length;
    var newCollectionItems = collectionItems.filter(function (ci) { return ci.collection_id !== collectionId; });

    this._saveToStorage('collections', newCollections);
    this._saveToStorage('collection_items', newCollectionItems);

    return { success: success };
  }

  // addContentToCollection(collectionId, contentId)
  addContentToCollection(collectionId, contentId) {
    var collections = this._getFromStorage('collections');
    var collection = this._findById(collections, collectionId);
    if (!collection) {
      return { success: false, collectionItem: null, collection: null, totalItems: 0 };
    }

    var contentItems = this._getFromStorage('content_items');
    var content = this._findById(contentItems, contentId);
    if (!content) {
      var itemsForCollection0 = this._getFromStorage('collection_items').filter(function (ci) { return ci.collection_id === collectionId; });
      return { success: false, collectionItem: null, collection: collection, totalItems: itemsForCollection0.length };
    }

    var collectionItems = this._getFromStorage('collection_items');
    var itemsForCollection = collectionItems.filter(function (ci) { return ci.collection_id === collectionId; });

    var existing = itemsForCollection.find(function (ci) { return ci.content_id === contentId; });
    if (existing) {
      return {
        success: true,
        collectionItem: existing,
        collection: collection,
        totalItems: itemsForCollection.length
      };
    }

    var maxPosition = 0;
    itemsForCollection.forEach(function (ci) {
      if (typeof ci.position === 'number' && ci.position > maxPosition) maxPosition = ci.position;
    });

    var item = {
      id: this._generateId('collection_item'),
      collection_id: collectionId,
      content_id: contentId,
      added_at: this._nowIso(),
      position: maxPosition + 1
    };

    collectionItems.push(item);
    this._saveToStorage('collection_items', collectionItems);

    collection.updated_at = this._nowIso();
    var idx = collections.findIndex(function (c) { return c.id === collectionId; });
    if (idx !== -1) {
      collections[idx] = collection;
      this._saveToStorage('collections', collections);
    }

    var updatedItemsForCollection = collectionItems.filter(function (ci) { return ci.collection_id === collectionId; });

    return {
      success: true,
      collectionItem: item,
      collection: collection,
      totalItems: updatedItemsForCollection.length
    };
  }

  // getCollectionDetail(collectionId, sort)
  getCollectionDetail(collectionId, sort) {
    var collections = this._getFromStorage('collections');
    var collection = this._findById(collections, collectionId);
    if (!collection) {
      return {
        collection: null,
        items: []
      };
    }

    var collectionItems = this._getFromStorage('collection_items');
    var contentItems = this._getFromStorage('content_items');
    var sections = this._getFromStorage('sections');

    var itemsForCollection = collectionItems.filter(function (ci) { return ci.collection_id === collectionId; });

    var sortKey = sort || 'added_at_asc';
    itemsForCollection.sort(function (a, b) {
      if (sortKey === 'added_at_desc') {
        return (b.added_at || '').localeCompare(a.added_at || '');
      } else if (sortKey === 'year_asc' || sortKey === 'year_desc') {
        var contentA = contentItems.find(function (c) { return c.id === a.content_id; }) || null;
        var contentB = contentItems.find(function (c) { return c.id === b.content_id; }) || null;
        var ya = contentA && contentA.year != null ? contentA.year : 0;
        var yb = contentB && contentB.year != null ? contentB.year : 0;
        if (sortKey === 'year_asc') return ya - yb;
        return yb - ya;
      }
      // default added_at_asc
      return (a.added_at || '').localeCompare(b.added_at || '');
    });

    var joined = itemsForCollection.map(function (ci) {
      var content = contentItems.find(function (c) { return c.id === ci.content_id; }) || null;
      var section = content ? sections.find(function (s) { return s.id === content.section_id; }) || null : null;
      return {
        collectionItem: ci,
        content: content,
        section: section
      };
    });

    return {
      collection: collection,
      items: joined
    };
  }

  // removeCollectionItem(collectionItemId)
  removeCollectionItem(collectionItemId) {
    var collectionItems = this._getFromStorage('collection_items');
    var item = collectionItems.find(function (ci) { return ci.id === collectionItemId; });
    var collectionId = item ? item.collection_id : null;

    var filtered = collectionItems.filter(function (ci) { return ci.id !== collectionItemId; });
    var success = filtered.length !== collectionItems.length;

    // Re-normalize positions within each collection
    var byCollection = new Map();
    filtered.forEach(function (ci) {
      if (!byCollection.has(ci.collection_id)) byCollection.set(ci.collection_id, []);
      byCollection.get(ci.collection_id).push(ci);
    });
    byCollection.forEach(function (items) {
      items.sort(function (a, b) {
        var pa = typeof a.position === 'number' ? a.position : 0;
        var pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });
      items.forEach(function (ci, idx) {
        ci.position = idx + 1;
      });
    });

    this._saveToStorage('collection_items', filtered);

    var remainingCount = 0;
    if (collectionId) {
      remainingCount = filtered.filter(function (ci) { return ci.collection_id === collectionId; }).length;
    }

    return {
      success: success,
      remainingCount: remainingCount
    };
  }

  // reorderCollectionItems(collectionId, orderedItemIds)
  reorderCollectionItems(collectionId, orderedItemIds) {
    var collectionItems = this._getFromStorage('collection_items');
    var itemsForCollection = collectionItems.filter(function (ci) { return ci.collection_id === collectionId; });
    var otherItems = collectionItems.filter(function (ci) { return ci.collection_id !== collectionId; });

    var idToItem = new Map();
    itemsForCollection.forEach(function (ci) { idToItem.set(ci.id, ci); });

    var ordered = [];
    orderedItemIds.forEach(function (id) {
      var item = idToItem.get(id);
      if (item) ordered.push(item);
    });

    itemsForCollection.forEach(function (ci) {
      if (!orderedItemIds.includes(ci.id)) ordered.push(ci);
    });

    ordered.forEach(function (ci, idx) {
      ci.position = idx + 1;
    });

    var newAll = otherItems.concat(ordered);
    this._saveToStorage('collection_items', newAll);

    return {
      success: true
    };
  }

  // addPersonalTagToContent(contentId, label)
  addPersonalTagToContent(contentId, label) {
    var contentItems = this._getFromStorage('content_items');
    var content = this._findById(contentItems, contentId);
    if (!content) {
      return { personalTag: null, assignment: null };
    }

    var personalTag = this._getOrCreatePersonalTagByLabel(label);
    if (!personalTag) {
      return { personalTag: null, assignment: null };
    }

    var personalTagAssignments = this._getFromStorage('personal_tag_assignments');
    var existing = personalTagAssignments.find(function (pta) {
      return pta.personal_tag_id === personalTag.id && pta.content_id === contentId;
    });

    if (existing) {
      return { personalTag: personalTag, assignment: existing };
    }

    var assignment = {
      id: this._generateId('personal_tag_assignment'),
      personal_tag_id: personalTag.id,
      content_id: contentId,
      added_at: this._nowIso()
    };

    personalTagAssignments.push(assignment);
    this._saveToStorage('personal_tag_assignments', personalTagAssignments);

    return {
      personalTag: personalTag,
      assignment: assignment
    };
  }

  // getPersonalTags()
  getPersonalTags() {
    var personalTags = this._getFromStorage('personal_tags');
    var personalTagAssignments = this._getFromStorage('personal_tag_assignments');

    var usageMap = new Map();
    personalTagAssignments.forEach(function (pta) {
      var count = usageMap.get(pta.personal_tag_id) || 0;
      usageMap.set(pta.personal_tag_id, count + 1);
    });

    return personalTags.map(function (tag) {
      return {
        tag: tag,
        usageCount: usageMap.get(tag.id) || 0
      };
    });
  }

  // getContentPersonalTags(contentId)
  getContentPersonalTags(contentId) {
    var personalTags = this._getFromStorage('personal_tags');
    var personalTagAssignments = this._getFromStorage('personal_tag_assignments');

    var tagIds = personalTagAssignments
      .filter(function (pta) { return pta.content_id === contentId; })
      .map(function (pta) { return pta.personal_tag_id; });

    var tags = personalTags.filter(function (t) { return tagIds.indexOf(t.id) !== -1; });
    return tags;
  }

  // removePersonalTagAssignment(personalTagAssignmentId)
  removePersonalTagAssignment(personalTagAssignmentId) {
    var personalTagAssignments = this._getFromStorage('personal_tag_assignments');
    var filtered = personalTagAssignments.filter(function (pta) { return pta.id !== personalTagAssignmentId; });
    var success = filtered.length !== personalTagAssignments.length;
    this._saveToStorage('personal_tag_assignments', filtered);
    return { success: success };
  }

  // getFeedBuilderOptions()
  getFeedBuilderOptions() {
    var sections = this._getFromStorage('sections');
    var contentItems = this._getFromStorage('content_items');

    var yearsSet = new Set();
    var collegesSet = new Set();

    contentItems.forEach(function (item) {
      if (item.year != null) yearsSet.add(item.year);
      if (item.college_school) collegesSet.add(item.college_school);
    });

    var datePresets = [
      { id: 'last_7_days', label: 'Last 7 days' },
      { id: 'last_30_days', label: 'Last 30 days' },
      { id: 'last_90_days', label: 'Last 90 days' },
      { id: 'custom', label: 'Custom range' }
    ];

    var contentTypes = ['article', 'video', 'all'];

    return {
      sections: sections,
      datePresets: datePresets,
      contentTypes: contentTypes,
      collegesSchools: Array.from(collegesSet),
      years: Array.from(yearsSet).sort()
    };
  }

  // Helper to compute date range from preset
  _getDateRangeFromPreset(preset) {
    var now = new Date();
    var to = now;
    var from;

    if (preset === 'last_7_days') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (preset === 'last_30_days') {
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (preset === 'last_90_days') {
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else {
      return { from: null, to: null };
    }

    return {
      from: from.toISOString(),
      to: to.toISOString()
    };
  }

  // generateRssFeed(sourceSectionId, keywords, datePreset, dateFrom, dateTo, contentType, collegeSchool, year, name)
  generateRssFeed(sourceSectionId, keywords, datePreset, dateFrom, dateTo, contentType, collegeSchool, year, name) {
    var sections = this._getFromStorage('sections');
    var section = sections.find(function (s) { return s.id === sourceSectionId; });
    if (!section) {
      return {
        rssFeedDefinition: null,
        previewItems: []
      };
    }

    var preset = datePreset || 'last_30_days';
    var range = this._getDateRangeFromPreset(preset);

    var effectiveDateFrom = preset === 'custom' ? dateFrom : range.from;
    var effectiveDateTo = preset === 'custom' ? dateTo : range.to;

    var def = {
      id: this._generateId('rss_feed'),
      source_section_id: sourceSectionId,
      keywords: keywords || undefined,
      date_preset: preset,
      date_from: effectiveDateFrom || undefined,
      date_to: effectiveDateTo || undefined,
      content_type: contentType || 'all',
      college_school: collegeSchool || undefined,
      year: year != null ? year : undefined,
      generated_url: '',
      created_at: this._nowIso(),
      name: name || undefined
    };

    def.generated_url = this._generateRssUrlForDefinition(def);

    var rssFeedDefinitions = this._getFromStorage('rss_feed_definitions');
    rssFeedDefinitions.push(def);
    this._saveToStorage('rss_feed_definitions', rssFeedDefinitions);

    // Build preview items
    var contentItems = this._getFromStorage('content_items');
    var self = this;

    var filtered = contentItems.filter(function (item) {
      if (item.section_id !== sourceSectionId) return false;

      if (def.content_type && def.content_type !== 'all' && item.content_type !== def.content_type) {
        return false;
      }

      if (def.college_school && item.college_school !== def.college_school) return false;

      if (def.year != null && item.year !== def.year) return false;

      if (def.date_from) {
        var df = self._parseDate(def.date_from);
        var ip = self._parseDate(item.publish_date);
        if (df && ip && ip < df) return false;
      }

      if (def.date_to) {
        var dt = self._parseDate(def.date_to);
        var ip2 = self._parseDate(item.publish_date);
        if (dt && ip2 && ip2 > dt) return false;
      }

      if (def.keywords && !self._matchesQuery(item, def.keywords)) return false;

      return true;
    });

    filtered = this._applySortToContent(filtered, 'newest_first').slice(0, 10);

    return {
      rssFeedDefinition: def,
      previewItems: filtered
    };
  }

  // getRssFeedDefinition(feedDefinitionId)
  getRssFeedDefinition(feedDefinitionId) {
    var rssFeedDefinitions = this._getFromStorage('rss_feed_definitions');
    var def = this._findById(rssFeedDefinitions, feedDefinitionId);
    return def || null;
  }

  // getRssFeedPreview(feedDefinitionId, limit)
  getRssFeedPreview(feedDefinitionId, limit) {
    var rssFeedDefinitions = this._getFromStorage('rss_feed_definitions');
    var def = this._findById(rssFeedDefinitions, feedDefinitionId);
    if (!def) return [];

    var contentItems = this._getFromStorage('content_items');
    var self = this;

    var filtered = contentItems.filter(function (item) {
      if (item.section_id !== def.source_section_id) return false;

      if (def.content_type && def.content_type !== 'all' && item.content_type !== def.content_type) {
        return false;
      }

      if (def.college_school && item.college_school !== def.college_school) return false;

      if (def.year != null && item.year !== def.year) return false;

      if (def.date_from) {
        var df = self._parseDate(def.date_from);
        var ip = self._parseDate(item.publish_date);
        if (df && ip && ip < df) return false;
      }

      if (def.date_to) {
        var dt = self._parseDate(def.date_to);
        var ip2 = self._parseDate(item.publish_date);
        if (dt && ip2 && ip2 > dt) return false;
      }

      if (def.keywords && !self._matchesQuery(item, def.keywords)) return false;

      return true;
    });

    filtered = this._applySortToContent(filtered, 'newest_first');
    var lim = limit && limit > 0 ? limit : 10;
    return filtered.slice(0, lim);
  }

  // getContentShareLink(contentId)
  getContentShareLink(contentId) {
    var contentItems = this._getFromStorage('content_items');
    var content = this._findById(contentItems, contentId);
    var resolvedUrl = content ? content.url || null : null;

    // Instrumentation for task completion tracking (task_2)
    try {
      if (resolvedUrl !== null) {
        localStorage.setItem(
          'task2_shareLinkCopied',
          JSON.stringify({ contentId: contentId, url: resolvedUrl, copiedAt: this._nowIso() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task2_shareLinkCopied):', e);
    }

    return {
      url: resolvedUrl
    };
  }

  // getRssFeedShareLink(feedDefinitionId)
  getRssFeedShareLink(feedDefinitionId) {
    var rssFeedDefinitions = this._getFromStorage('rss_feed_definitions');
    var def = this._findById(rssFeedDefinitions, feedDefinitionId);
    var resolvedUrl = def ? def.generated_url || null : null;

    // Instrumentation for task completion tracking (task_8)
    try {
      if (resolvedUrl !== null) {
        localStorage.setItem(
          'task8_rssLinkCopied',
          JSON.stringify({ feedDefinitionId: feedDefinitionId, url: resolvedUrl, copiedAt: this._nowIso() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task8_rssLinkCopied):', e);
    }

    return {
      url: resolvedUrl
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    // Static content; could be extended to load from storage if desired
    return {
      html: '<h1>About the University News Archive</h1><p>This archive provides centralized access to research news, campus announcements, student stories, and more.</p>',
      lastUpdated: '2024-01-01T00:00:00.000Z'
    };
  }

  // getContactInfoAndFormConfig()
  getContactInfoAndFormConfig() {
    return {
      contactEmails: [
        { department: 'Editorial Team', email: 'news-editor@example.edu' },
        { department: 'Technical Support', email: 'news-support@example.edu' }
      ],
      supportHours: 'Monday–Friday, 9:00 a.m. – 5:00 p.m. (local time)',
      relatedLinks: [
        { label: 'University Homepage', url: 'https://www.example.edu/' },
        { label: 'Library', url: 'https://www.example.edu/library' }
      ],
      formFields: [
        { name: 'name', label: 'Your name', type: 'text', required: true },
        { name: 'email', label: 'Email address', type: 'email', required: true },
        { name: 'subject', label: 'Subject', type: 'text', required: true },
        { name: 'message', label: 'Message', type: 'textarea', required: true }
      ]
    };
  }

  // submitContactForm(name, email, subject, message, category)
  submitContactForm(name, email, subject, message, category) {
    // Pure business logic: simulate submission and return reference id
    var referenceId = 'CF-' + this._getNextIdCounter();
    var expectedResponseTime = 'Within 3 business days';

    // No persistence of contact messages per requirements

    return {
      success: true,
      referenceId: referenceId,
      expectedResponseTime: expectedResponseTime
    };
  }

  // getHelpAndFaqContent()
  getHelpAndFaqContent() {
    return {
      sections: [
        {
          id: 'search',
          title: 'Searching the archive',
          faqs: [
            {
              question: 'How do I search across all sections?',
              answerHtml: '<p>Use the global search bar at the top of the site and then refine your results using filters such as year, section, and content type.</p>'
            },
            {
              question: 'Can I filter by year or topic?',
              answerHtml: '<p>Yes. After running a search, use the filters in the sidebar to limit results by year, section, sport, event type, college, and more.</p>'
            }
          ]
        },
        {
          id: 'personal_areas',
          title: 'Reading list, Watch Later, and collections',
          faqs: [
            {
              question: 'What is the reading list?',
              answerHtml: '<p>The reading list is your personal bookmark area for articles you want to revisit. Use the bookmark icon to add or remove items.</p>'
            },
            {
              question: 'What is the Watch Later queue?',
              answerHtml: '<p>The Watch Later queue stores video content you want to view later. You can reorder or remove items from the queue at any time.</p>'
            },
            {
              question: 'What are collections?',
              answerHtml: '<p>Collections let you group related stories into thematic timelines or reading lists, such as a collection of sustainability highlights across multiple years.</p>'
            }
          ]
        },
        {
          id: 'rss',
          title: 'RSS feeds',
          faqs: [
            {
              question: 'How do I create a custom RSS feed?',
              answerHtml: '<p>Open the Advanced Search &amp; Feed Builder, select a section, keywords, and date range, then generate the feed. You can copy the RSS URL into your preferred feed reader.</p>'
            }
          ]
        }
      ]
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    return {
      html: '<h1>Privacy Policy</h1><p>This site collects minimal analytics data to improve the user experience. Personal areas such as reading lists and tags are stored only for your use.</p>',
      lastUpdated: '2024-01-01T00:00:00.000Z'
    };
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    return {
      html: '<h1>Terms of Use</h1><p>By using this archive, you agree to use the content for personal, educational, and non-commercial purposes, unless otherwise permitted by the institution.</p>',
      lastUpdated: '2024-01-01T00:00:00.000Z'
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
