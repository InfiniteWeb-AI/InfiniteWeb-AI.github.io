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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const keysToInitAsArrays = [
      'chemical_substances',
      'sds',
      'sds_revisions',
      'sds_comparisons',
      'sds_comparison_notes',
      'products',
      'locations',
      'inventory_items',
      'favorites_lists',
      'favorites_list_items',
      'binders',
      'binder_items',
      'lists',
      'list_items',
      'quick_access_groups',
      'quick_access_memberships',
      'dashboard_widgets',
      'secondary_container_labels',
      'help_topics',
      'help_topic_details'
    ];

    for (let i = 0; i < keysToInitAsArrays.length; i++) {
      const key = keysToInitAsArrays[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // User preferences (single object)
    if (!localStorage.getItem('user_preferences')) {
      const defaultPrefs = {
        inventoryVisibleColumns: [
          'product_name',
          'quantity',
          'unit',
          'hazard_class',
          'flash_point_celsius',
          'nfpa_health_rating',
          'hazard_pictograms_count'
        ],
        dashboardLayout: {}
      };
      localStorage.setItem('user_preferences', JSON.stringify(defaultPrefs));
    }

    // About content
    if (!localStorage.getItem('about_content')) {
      const about = {
        headline: 'Chemical Safety Data Sheet Management Portal',
        bodyHtml:
          '<p>This portal helps you manage Safety Data Sheets (SDS), chemical inventories, and safety-related collections such as binders, review lists, and emergency kits.</p>',
        modulesSummary: [
          {
            moduleKey: 'sds_library',
            title: 'SDS Library',
            description: 'Search, filter, and review SDS records across your organization.'
          },
          {
            moduleKey: 'inventory',
            title: 'Inventory',
            description: 'Track chemical inventory by location with hazard attributes and usage metrics.'
          },
          {
            moduleKey: 'dashboard',
            title: 'Dashboard',
            description: 'Visualize key metrics such as chemical counts by location and hazard category.'
          },
          {
            moduleKey: 'collections',
            title: 'Collections',
            description: 'Manage favorites, binders, quick access groups, and review lists.'
          }
        ],
        contactInfoHtml:
          '<p>For support, contact your EHS team or system administrator.</p>',
        disclaimerHtml:
          '<p>Always consult the latest SDS from the manufacturer and follow your organization\'s safety procedures.</p>'
      };
      localStorage.setItem('about_content', JSON.stringify(about));
    }

    // Basic help topics skeleton
    if (!localStorage.getItem('help_topics') || !localStorage.getItem('help_topic_details')) {
      const topics = [
        {
          topicId: 'sds_search_basics',
          title: 'Searching the SDS Library',
          category: 'sds_library',
          summary: 'How to search, filter, and sort SDS records.'
        },
        {
          topicId: 'inventory_filters',
          title: 'Using Inventory Filters',
          category: 'inventory',
          summary: 'Filtering inventory by hazard class, flash point, and more.'
        },
        {
          topicId: 'dashboard_widgets',
          title: 'Configuring Dashboard Widgets',
          category: 'dashboard',
          summary: 'Adding and customizing dashboard widgets.'
        }
      ];
      const topicDetails = [
        {
          topicId: 'sds_search_basics',
          title: 'Searching the SDS Library',
          category: 'sds_library',
          bodyHtml:
            '<p>Use the search bar to find SDS by product name, CAS number, or keywords. Apply filters such as location, hazard categories, and expiry date to refine results.</p>',
          relatedTasks: ['task_1', 'task_3', 'task_4', 'task_6']
        },
        {
          topicId: 'inventory_filters',
          title: 'Using Inventory Filters',
          category: 'inventory',
          bodyHtml:
            '<p>On the Inventory page, select a location in the tree and then use filters such as hazard class, flash point, and NFPA health rating to narrow the list.</p>',
          relatedTasks: ['task_2', 'task_8', 'task_9']
        },
        {
          topicId: 'dashboard_widgets',
          title: 'Configuring Dashboard Widgets',
          category: 'dashboard',
          bodyHtml:
            '<p>From the Dashboard, add widgets such as Chemical Count by Location. Configure hazard filters, grouping, and threshold alerts to highlight key risks.</p>',
          relatedTasks: ['task_7']
        }
      ];
      localStorage.setItem('help_topics', JSON.stringify(topics));
      localStorage.setItem('help_topic_details', JSON.stringify(topicDetails));
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
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ----------------------
  // Generic helpers
  // ----------------------
  _ensureArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _getOrCreateUserPreferences() {
    let prefsRaw = localStorage.getItem('user_preferences');
    if (!prefsRaw) {
      const defaultPrefs = {
        inventoryVisibleColumns: [
          'product_name',
          'quantity',
          'unit',
          'hazard_class',
          'flash_point_celsius',
          'nfpa_health_rating',
          'hazard_pictograms_count'
        ],
        dashboardLayout: {}
      };
      localStorage.setItem('user_preferences', JSON.stringify(defaultPrefs));
      return defaultPrefs;
    }
    try {
      return JSON.parse(prefsRaw);
    } catch (e) {
      const defaultPrefs = {
        inventoryVisibleColumns: [
          'product_name',
          'quantity',
          'unit',
          'hazard_class',
          'flash_point_celsius',
          'nfpa_health_rating',
          'hazard_pictograms_count'
        ],
        dashboardLayout: {}
      };
      localStorage.setItem('user_preferences', JSON.stringify(defaultPrefs));
      return defaultPrefs;
    }
  }

  _saveUserPreferences(prefs) {
    localStorage.setItem('user_preferences', JSON.stringify(prefs));
  }

  _getLocationsMap() {
    const locations = this._getFromStorage('locations');
    const map = {};
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      map[loc.id] = loc;
    }
    return map;
  }

  _getSelfAndDescendantLocationIds(rootIds) {
    const locations = this._getFromStorage('locations');
    const byParent = {};
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const parentId = loc.parentLocationId || null;
      if (!byParent[parentId]) byParent[parentId] = [];
      byParent[parentId].push(loc.id);
    }
    const resultSet = new Set();
    const queue = [];
    const roots = this._ensureArray(rootIds);
    for (let i = 0; i < roots.length; i++) {
      if (!roots[i]) continue;
      queue.push(roots[i]);
    }
    while (queue.length > 0) {
      const id = queue.shift();
      if (resultSet.has(id)) continue;
      resultSet.add(id);
      const children = byParent[id];
      if (children && children.length) {
        for (let j = 0; j < children.length; j++) {
          queue.push(children[j]);
        }
      }
    }
    return resultSet;
  }

  _getGroupingLocationId(locationId, groupBy, locationsMap) {
    if (!locationId || !groupBy || groupBy === 'none') return null;
    const map = locationsMap || this._getLocationsMap();
    let loc = map[locationId];
    if (!loc) return null;
    if (groupBy === 'location') {
      return loc.id;
    }
    const targetType = groupBy; // 'building' or 'floor'
    while (loc && loc.locationType !== targetType) {
      if (!loc.parentLocationId) {
        break;
      }
      loc = map[loc.parentLocationId];
    }
    if (loc && loc.locationType === targetType) {
      return loc.id;
    }
    return null;
  }

  _applySdsFiltersAndSorting(sdsList, query, filters, sort) {
    const locations = this._getFromStorage('locations');
    const locationsMap = {};
    for (let i = 0; i < locations.length; i++) {
      locationsMap[locations[i].id] = locations[i];
    }

    const q = this._normalizeString(query);
    const f = filters || {};
    let allowedLocationIds = null;
    if (f.locationIds && f.locationIds.length) {
      allowedLocationIds = this._getSelfAndDescendantLocationIds(f.locationIds);
    }

    const now = new Date();

    const filtered = [];
    for (let i = 0; i < sdsList.length; i++) {
      const sds = sdsList[i];
      if (sds.isActive === false) continue;

      // Query search
      if (q) {
        const haystack =
          this._normalizeString(sds.productName) +
          ' ' +
          this._normalizeString(sds.title) +
          ' ' +
          this._normalizeString(sds.casNumber);
        if (haystack.indexOf(q) === -1) {
          continue;
        }
      }

      // Location filter
      if (allowedLocationIds) {
        const locIds = this._ensureArray(sds.locations);
        let matchesLoc = false;
        for (let j = 0; j < locIds.length; j++) {
          if (allowedLocationIds.has(locIds[j])) {
            matchesLoc = true;
            break;
          }
        }
        if (!matchesLoc) continue;
      }

      // Language filter
      if (f.languages && f.languages.length) {
        const langs = this._ensureArray(sds.languages);
        let hasLang = false;
        for (let j = 0; j < langs.length; j++) {
          if (f.languages.indexOf(langs[j]) !== -1) {
            hasLang = true;
            break;
          }
        }
        if (!hasLang) continue;
      }

      // Category filter (business categories)
      if (f.categories && f.categories.length) {
        const cats = this._ensureArray(sds.categories);
        let hasCat = false;
        for (let j = 0; j < cats.length; j++) {
          if (f.categories.indexOf(cats[j]) !== -1) {
            hasCat = true;
            break;
          }
        }
        if (!hasCat) continue;
      }

      // Hazard pictograms filter
      if (f.hazardPictograms && f.hazardPictograms.length) {
        const pics = this._ensureArray(sds.hazardPictograms);
        let hasPict = false;
        for (let j = 0; j < pics.length; j++) {
          if (f.hazardPictograms.indexOf(pics[j]) !== -1) {
            hasPict = true;
            break;
          }
        }
        if (!hasPict) continue;
      }

      // Hazard categories filter
      if (f.hazardCategories && f.hazardCategories.length) {
        const hc = this._ensureArray(sds.hazardCategories);
        let hasHaz = false;
        for (let j = 0; j < hc.length; j++) {
          if (f.hazardCategories.indexOf(hc[j]) !== -1) {
            hasHaz = true;
            break;
          }
        }
        if (!hasHaz) continue;
      }

      // Expiry presets
      if (f.expiryDatePreset && f.expiryDatePreset !== 'none') {
        const expiry = this._parseDate(sds.expiryDate);
        if (!expiry) {
          continue;
        }
        const diffMs = expiry.getTime() - now.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (f.expiryDatePreset === 'expired') {
          if (diffDays > 0) continue;
        } else if (f.expiryDatePreset === 'next_30_days') {
          if (!(diffDays >= 0 && diffDays <= 30)) continue;
        } else if (f.expiryDatePreset === 'next_60_days') {
          if (!(diffDays >= 0 && diffDays <= 60)) continue;
        } else if (f.expiryDatePreset === 'next_90_days') {
          if (!(diffDays >= 0 && diffDays <= 90)) continue;
        }
      }

      // Expiry date range
      if (f.expiryDateFrom || f.expiryDateTo) {
        const expiry = this._parseDate(sds.expiryDate);
        if (!expiry) continue;
        if (f.expiryDateFrom) {
          const from = this._parseDate(f.expiryDateFrom);
          if (from && expiry.getTime() < from.getTime()) continue;
        }
        if (f.expiryDateTo) {
          const to = this._parseDate(f.expiryDateTo);
          if (to && expiry.getTime() > to.getTime()) continue;
        }
      }

      // Revision date range
      if (f.revisionDateFrom || f.revisionDateTo) {
        const rev = this._parseDate(sds.revisionDate);
        if (!rev) continue;
        if (f.revisionDateFrom) {
          const from = this._parseDate(f.revisionDateFrom);
          if (from && rev.getTime() < from.getTime()) continue;
        }
        if (f.revisionDateTo) {
          const to = this._parseDate(f.revisionDateTo);
          if (to && rev.getTime() > to.getTime()) continue;
        }
      }

      // Daily usage range
      if (typeof f.dailyUsageMin === 'number') {
        if (typeof sds.dailyUsageLitersPerDay !== 'number' || sds.dailyUsageLitersPerDay < f.dailyUsageMin) {
          continue;
        }
      }
      if (typeof f.dailyUsageMax === 'number') {
        if (typeof sds.dailyUsageLitersPerDay !== 'number' || sds.dailyUsageLitersPerDay > f.dailyUsageMax) {
          continue;
        }
      }

      // Flash point range
      if (typeof f.flashPointMin === 'number') {
        if (typeof sds.flashPointCelsius !== 'number' || sds.flashPointCelsius < f.flashPointMin) {
          continue;
        }
      }
      if (typeof f.flashPointMax === 'number') {
        if (typeof sds.flashPointCelsius !== 'number' || sds.flashPointCelsius > f.flashPointMax) {
          continue;
        }
      }

      filtered.push(sds);
    }

    const sortConfig = sort || {};
    const field = sortConfig.field || 'revision_date';
    const direction = sortConfig.direction === 'asc' ? 'asc' : 'desc';

    const fieldMap = {
      revision_date: 'revisionDate',
      expiry_date: 'expiryDate',
      daily_usage_liters_per_day: 'dailyUsageLitersPerDay'
    };

    const sdsField = fieldMap[field] || 'revisionDate';

    filtered.sort(function (a, b) {
      let av = a[sdsField];
      let bv = b[sdsField];

      // Date fields
      if (sdsField === 'revisionDate' || sdsField === 'expiryDate') {
        const ad = av ? new Date(av).getTime() : 0;
        const bd = bv ? new Date(bv).getTime() : 0;
        av = ad;
        bv = bd;
      }

      if (typeof av === 'number' && typeof bv === 'number') {
        return direction === 'asc' ? av - bv : bv - av;
      }

      if (av == null && bv != null) return direction === 'asc' ? -1 : 1;
      if (av != null && bv == null) return direction === 'asc' ? 1 : -1;
      if (av == null && bv == null) return 0;

      const as = av.toString().toLowerCase();
      const bs = bv.toString().toLowerCase();
      if (as < bs) return direction === 'asc' ? -1 : 1;
      if (as > bs) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  _computeDashboardWidgetSeries(widget) {
    const result = [];
    if (!widget || widget.widgetType !== 'chemical_count_by_location') {
      return { series: [], totalCount: 0 };
    }

    const locations = this._getFromStorage('locations');
    const locationsMap = {};
    for (let i = 0; i < locations.length; i++) {
      locationsMap[locations[i].id] = locations[i];
    }

    const includeLocationIds = this._ensureArray(widget.includeLocationIds);
    const allowedLocationIdsSet = includeLocationIds.length
      ? this._getSelfAndDescendantLocationIds(includeLocationIds)
      : new Set(Object.keys(locationsMap));

    const hazardFilterCategory = widget.hazardFilterCategory || 'none';
    const sdsList = this._getFromStorage('sds');

    const counts = {}; // key: locationId, value: count

    for (let i = 0; i < sdsList.length; i++) {
      const sds = sdsList[i];
      if (sds.isActive === false) continue;

      if (hazardFilterCategory && hazardFilterCategory !== 'none') {
        const hc = this._ensureArray(sds.hazardCategories);
        if (hc.indexOf(hazardFilterCategory) === -1) {
          continue;
        }
      }

      const sdsLocIds = this._ensureArray(sds.locations);
      for (let j = 0; j < sdsLocIds.length; j++) {
        const locId = sdsLocIds[j];
        if (!allowedLocationIdsSet.has(locId)) continue;

        const groupLocId = this._getGroupingLocationId(locId, widget.groupBy, locationsMap) || locId;
        if (!allowedLocationIdsSet.has(groupLocId)) continue;

        if (!counts[groupLocId]) counts[groupLocId] = 0;
        counts[groupLocId] += 1;
      }
    }

    let totalCount = 0;
    for (const locId in counts) {
      if (!Object.prototype.hasOwnProperty.call(counts, locId)) continue;
      const count = counts[locId];
      totalCount += count;
      const loc = locationsMap[locId] || null;
      const overThreshold =
        typeof widget.thresholdAlertValue === 'number'
          ? count > widget.thresholdAlertValue
          : false;
      result.push({
        label: loc ? loc.name : locId,
        count: count,
        locationId: locId,
        locationName: loc ? loc.name : null,
        location: loc,
        overThreshold: overThreshold
      });
    }

    // Sort by label for stable display
    result.sort(function (a, b) {
      const al = a.label || '';
      const bl = b.label || '';
      if (al < bl) return -1;
      if (al > bl) return 1;
      return 0;
    });

    return { series: result, totalCount: totalCount };
  }

  _generateSecondaryLabelPreview(sds, config) {
    const payload = {
      sdsId: sds ? sds.id : null,
      productName: sds ? sds.productName : null,
      labelSize: config.labelSize,
      includeProductName: config.includeProductName,
      includePictograms: config.includePictograms,
      includeSignalWord: config.includeSignalWord,
      generatedAt: this._nowIso()
    };
    const json = JSON.stringify(payload);
    return 'data:application/json,' + encodeURIComponent(json);
  }

  _resolveInventoryItemsToSdsIds(inventoryItemIds) {
    const inventoryItems = this._getFromStorage('inventory_items');
    const idsSet = new Set();
    const sdsIdsSet = new Set();
    const idsArr = this._ensureArray(inventoryItemIds);

    for (let i = 0; i < idsArr.length; i++) {
      const invId = idsArr[i];
      if (idsSet.has(invId)) continue;
      idsSet.add(invId);
      const item = inventoryItems.find(function (ii) {
        return ii.id === invId;
      });
      if (item && item.sdsId) {
        sdsIdsSet.add(item.sdsId);
      }
    }

    return Array.from(sdsIdsSet);
  }

  // ----------------------
  // Dashboard interfaces
  // ----------------------

  listDashboardWidgets() {
    const widgets = this._getFromStorage('dashboard_widgets');
    const locations = this._getFromStorage('locations');
    const locMap = {};
    for (let i = 0; i < locations.length; i++) {
      locMap[locations[i].id] = locations[i];
    }

    return widgets.map(function (w) {
      const includeLocationIds = w.includeLocationIds || [];
      const includeLocations = [];
      for (let j = 0; j < includeLocationIds.length; j++) {
        const loc = locMap[includeLocationIds[j]];
        if (loc) {
          includeLocations.push({
            id: loc.id,
            name: loc.name,
            fullPath: loc.fullPath || loc.name
          });
        }
      }
      return {
        id: w.id,
        title: w.title,
        widgetType: w.widgetType,
        hazardFilterCategory: w.hazardFilterCategory || 'none',
        groupBy: w.groupBy,
        includeLocations: includeLocations,
        thresholdAlertValue:
          typeof w.thresholdAlertValue === 'number' ? w.thresholdAlertValue : null,
        isActive: w.isActive !== false,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt
      };
    });
  }

  createDashboardWidget(title, widgetType, hazardFilterCategory, groupBy, includeLocationIds, thresholdAlertValue) {
    const widgets = this._getFromStorage('dashboard_widgets');
    const now = this._nowIso();
    const widget = {
      id: this._generateId('dw'),
      title: title,
      widgetType: widgetType,
      hazardFilterCategory: hazardFilterCategory || 'none',
      groupBy: groupBy || 'none',
      includeLocationIds: this._ensureArray(includeLocationIds),
      thresholdAlertValue:
        typeof thresholdAlertValue === 'number' ? thresholdAlertValue : null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
    widgets.push(widget);
    this._saveToStorage('dashboard_widgets', widgets);

    return {
      success: true,
      widget: {
        id: widget.id,
        title: widget.title,
        widgetType: widget.widgetType,
        hazardFilterCategory: widget.hazardFilterCategory,
        groupBy: widget.groupBy,
        includeLocationIds: widget.includeLocationIds,
        thresholdAlertValue: widget.thresholdAlertValue
      },
      message: 'Widget created.'
    };
  }

  updateDashboardWidget(widgetId, title, hazardFilterCategory, groupBy, includeLocationIds, thresholdAlertValue, isActive) {
    const widgets = this._getFromStorage('dashboard_widgets');
    let widget = null;
    for (let i = 0; i < widgets.length; i++) {
      if (widgets[i].id === widgetId) {
        widget = widgets[i];
        break;
      }
    }
    if (!widget) {
      return {
        success: false,
        widget: null,
        message: 'Widget not found.'
      };
    }

    if (typeof title === 'string') widget.title = title;
    if (typeof hazardFilterCategory === 'string') widget.hazardFilterCategory = hazardFilterCategory;
    if (typeof groupBy === 'string') widget.groupBy = groupBy;
    if (Array.isArray(includeLocationIds)) widget.includeLocationIds = includeLocationIds;
    if (typeof thresholdAlertValue === 'number') widget.thresholdAlertValue = thresholdAlertValue;
    if (typeof isActive === 'boolean') widget.isActive = isActive;
    widget.updatedAt = this._nowIso();

    this._saveToStorage('dashboard_widgets', widgets);

    return {
      success: true,
      widget: {
        id: widget.id,
        title: widget.title,
        widgetType: widget.widgetType,
        hazardFilterCategory: widget.hazardFilterCategory,
        groupBy: widget.groupBy,
        includeLocationIds: widget.includeLocationIds,
        thresholdAlertValue: widget.thresholdAlertValue,
        isActive: widget.isActive
      },
      message: 'Widget updated.'
    };
  }

  deleteDashboardWidget(widgetId) {
    const widgets = this._getFromStorage('dashboard_widgets');
    const initialLength = widgets.length;
    const filtered = widgets.filter(function (w) {
      return w.id !== widgetId;
    });
    this._saveToStorage('dashboard_widgets', filtered);
    const success = filtered.length !== initialLength;
    return {
      success: success,
      message: success ? 'Widget deleted.' : 'Widget not found.'
    };
  }

  getDashboardWidgetData(widgetId) {
    const widgets = this._getFromStorage('dashboard_widgets');
    const widget = widgets.find(function (w) {
      return w.id === widgetId;
    });
    if (!widget) {
      return {
        widgetId: widgetId,
        title: '',
        series: [],
        totalCount: 0
      };
    }
    const computed = this._computeDashboardWidgetSeries(widget);
    return {
      widgetId: widget.id,
      title: widget.title,
      series: computed.series,
      totalCount: computed.totalCount
    };
  }

  getDashboardWidgetDrilldownContext(widgetId, segmentKey) {
    const widgets = this._getFromStorage('dashboard_widgets');
    const widget = widgets.find(function (w) {
      return w.id === widgetId;
    });
    if (!widget) {
      return {
        targetPage: 'sds_library',
        sdsLibraryFilters: {
          locationIds: [],
          hazardCategories: []
        },
        inventoryFilters: {
          locationIds: [],
          hazardClasses: []
        },
        description: 'Widget not found.'
      };
    }

    const locations = this._getFromStorage('locations');
    const loc = locations.find(function (l) {
      return l.id === segmentKey;
    });

    if (widget.widgetType === 'chemical_count_by_location') {
      const sdsFilters = {
        locationIds: segmentKey ? [segmentKey] : [],
        hazardCategories: []
      };
      if (widget.hazardFilterCategory && widget.hazardFilterCategory !== 'none') {
        sdsFilters.hazardCategories = [widget.hazardFilterCategory];
      }
      return {
        targetPage: 'sds_library',
        sdsLibraryFilters: sdsFilters,
        inventoryFilters: {
          locationIds: [],
          hazardClasses: []
        },
        description:
          'Drilldown for ' +
          widget.title +
          (loc ? ' at ' + loc.name : '')
      };
    }

    return {
      targetPage: 'sds_library',
      sdsLibraryFilters: {
        locationIds: segmentKey ? [segmentKey] : [],
        hazardCategories: []
      },
      inventoryFilters: {
        locationIds: [],
        hazardClasses: []
      },
      description: 'Drilldown context.'
    };
  }

  // ----------------------
  // SDS Library interfaces
  // ----------------------

  getSdsLibraryFilterOptions() {
    const locations = this._getFromStorage('locations');
    const sdsList = this._getFromStorage('sds');

    const categorySet = new Set();
    const pictogramSet = new Set();
    const languageSet = new Set();
    const hazardCategorySet = new Set();

    for (let i = 0; i < sdsList.length; i++) {
      const sds = sdsList[i];
      const cats = this._ensureArray(sds.categories);
      for (let j = 0; j < cats.length; j++) categorySet.add(cats[j]);
      const pics = this._ensureArray(sds.hazardPictograms);
      for (let j = 0; j < pics.length; j++) pictogramSet.add(pics[j]);
      const langs = this._ensureArray(sds.languages);
      for (let j = 0; j < langs.length; j++) languageSet.add(langs[j]);
      const hcats = this._ensureArray(sds.hazardCategories);
      for (let j = 0; j < hcats.length; j++) hazardCategorySet.add(hcats[j]);
    }

    function toLabel(code) {
      if (!code) return '';
      return code
        .toString()
        .split('_')
        .map(function (p) {
          return p.charAt(0).toUpperCase() + p.slice(1);
        })
        .join(' ');
    }

    const categoryOptions = Array.from(categorySet).map(function (code) {
      return { code: code, label: toLabel(code) };
    });

    const hazardPictogramOptions = Array.from(pictogramSet).map(function (code) {
      return { code: code, label: toLabel(code) };
    });

    const languageOptions = Array.from(languageSet).map(function (code) {
      return { code: code, label: toLabel(code) };
    });

    const hazardCategoryOptions = Array.from(hazardCategorySet).map(function (code) {
      return { code: code, label: toLabel(code) };
    });

    const locationOptions = locations
      .filter(function (loc) {
        return loc.isActive !== false;
      })
      .map(function (loc) {
        return {
          id: loc.id,
          name: loc.name,
          fullPath: loc.fullPath || loc.name
        };
      });

    const expiryDatePresets = [
      { key: 'none', label: 'No preset' },
      { key: 'next_30_days', label: 'Next 30 days' },
      { key: 'next_60_days', label: 'Next 60 days' },
      { key: 'next_90_days', label: 'Next 90 days' },
      { key: 'expired', label: 'Expired' }
    ];

    const sortOptions = [
      {
        field: 'revision_date',
        label: 'Revision Date',
        defaultDirection: 'desc'
      },
      {
        field: 'expiry_date',
        label: 'Expiry Date',
        defaultDirection: 'asc'
      },
      {
        field: 'daily_usage_liters_per_day',
        label: 'Daily Usage (L/day)',
        defaultDirection: 'desc'
      }
    ];

    return {
      locationOptions: locationOptions,
      categoryOptions: categoryOptions,
      hazardPictogramOptions: hazardPictogramOptions,
      languageOptions: languageOptions,
      hazardCategoryOptions: hazardCategoryOptions,
      expiryDatePresets: expiryDatePresets,
      sortOptions: sortOptions
    };
  }

  searchSdsLibrary(query, filters, sort, page, pageSize) {
    const allSds = this._getFromStorage('sds');
    const locations = this._getFromStorage('locations');
    const locMap = {};
    for (let i = 0; i < locations.length; i++) {
      locMap[locations[i].id] = locations[i];
    }

    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const sizeNum = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 25;

    const filteredSorted = this._applySdsFiltersAndSorting(allSds, query, filters || {}, sort || {});

    const totalCount = filteredSorted.length;
    const start = (pageNum - 1) * sizeNum;
    const end = start + sizeNum;
    const slice = filteredSorted.slice(start, end);

    const items = slice.map(function (sds) {
      const locObjs = [];
      const locIds = (sds.locations && Array.isArray(sds.locations)) ? sds.locations : [];
      for (let j = 0; j < locIds.length; j++) {
        const loc = locMap[locIds[j]];
        if (loc) {
          locObjs.push({
            id: loc.id,
            name: loc.name,
            fullPath: loc.fullPath || loc.name
          });
        }
      }
      return {
        sdsId: sds.id,
        productName: sds.productName,
        title: sds.title,
        casNumber: sds.casNumber,
        supplierName: sds.supplierName || null,
        revisionDate: sds.revisionDate || null,
        expiryDate: sds.expiryDate || null,
        versionNumber: sds.versionNumber || null,
        languages: sds.languages || [],
        categories: sds.categories || [],
        hazardCategories: sds.hazardCategories || [],
        hazardPictograms: sds.hazardPictograms || [],
        hazardPictogramsCount: typeof sds.hazardPictogramsCount === 'number'
          ? sds.hazardPictogramsCount
          : (sds.hazardPictograms ? sds.hazardPictograms.length : 0),
        signalWord: sds.signalWord || 'none',
        dailyUsageLitersPerDay: sds.dailyUsageLitersPerDay,
        flashPointCelsius: sds.flashPointCelsius,
        locations: locObjs,
        isActive: sds.isActive !== false
      };
    });

    return {
      items: items,
      page: pageNum,
      pageSize: sizeNum,
      totalCount: totalCount
    };
  }

  getSdsDetails(sdsId) {
    const sdsList = this._getFromStorage('sds');
    const locations = this._getFromStorage('locations');
    const locMap = {};
    for (let i = 0; i < locations.length; i++) {
      locMap[locations[i].id] = locations[i];
    }

    let sds = sdsList.find(function (s) {
      return s.id === sdsId;
    });
    if (!sds) {
      const inventoryItems = this._getFromStorage('inventory_items');
      const products = this._getFromStorage('products');
      const inv = inventoryItems.find(function (ii) {
        return ii.sdsId === sdsId;
      });
      if (inv) {
        const product = products.find(function (p) {
          return p.id === inv.productId;
        });
        sds = {
          id: sdsId,
          productName: inv.productName || (product ? product.name : null),
          title:
            (inv.productName || (product ? product.name : '') || 'SDS') + ' SDS',
          casNumber: product ? product.casNumber : null,
          supplierName: null,
          revisionDate: null,
          issueDate: null,
          versionNumber: null,
          expiryDate: null,
          languages: [],
          hazardPictograms: inv.hazardPictograms || [],
          hazardPictogramsCount:
            typeof inv.hazardPictogramsCount === 'number'
              ? inv.hazardPictogramsCount
              : (inv.hazardPictograms ? inv.hazardPictograms.length : 0),
          signalWord: 'none',
          hazardCategories: product ? (product.hazardCategories || []) : [],
          categories: product && product.productCategory ? [product.productCategory] : [],
          dailyUsageLitersPerDay: inv.dailyUsageLitersPerDay,
          flashPointCelsius: inv.flashPointCelsius,
          locations: inv.locationId ? [inv.locationId] : [],
          isActive: true,
          createdAt: inv.createdAt || null,
          updatedAt: inv.updatedAt || null
        };
      }
    }
    if (!sds) {
      return { sds: null };
    }

    const locObjs = [];
    const locIds = (sds.locations && Array.isArray(sds.locations)) ? sds.locations : [];
    for (let j = 0; j < locIds.length; j++) {
      const loc = locMap[locIds[j]];
      if (loc) {
        locObjs.push({
          id: loc.id,
          name: loc.name,
          fullPath: loc.fullPath || loc.name
        });
      }
    }

    const sdsDetails = {
      id: sds.id,
      productName: sds.productName,
      title: sds.title,
      casNumber: sds.casNumber,
      supplierName: sds.supplierName || null,
      revisionDate: sds.revisionDate || null,
      issueDate: sds.issueDate || null,
      versionNumber: sds.versionNumber || null,
      expiryDate: sds.expiryDate || null,
      languages: sds.languages || [],
      hazardPictograms: sds.hazardPictograms || [],
      hazardPictogramsCount: typeof sds.hazardPictogramsCount === 'number'
        ? sds.hazardPictogramsCount
        : (sds.hazardPictograms ? sds.hazardPictograms.length : 0),
      signalWord: sds.signalWord || 'none',
      hazardCategories: sds.hazardCategories || [],
      categories: sds.categories || [],
      dailyUsageLitersPerDay: sds.dailyUsageLitersPerDay,
      flashPointCelsius: sds.flashPointCelsius,
      locations: locObjs,
      isActive: sds.isActive !== false,
      createdAt: sds.createdAt || null,
      updatedAt: sds.updatedAt || null
    };

    return { sds: sdsDetails };
  }

  getSdsRevisionHistory(sdsId) {
    const revisions = this._getFromStorage('sds_revisions');
    let filtered = revisions
      .filter(function (rev) {
        return rev.sdsId === sdsId;
      })
      .sort(function (a, b) {
        const ad = a.revisionDate ? new Date(a.revisionDate).getTime() : 0;
        const bd = b.revisionDate ? new Date(b.revisionDate).getTime() : 0;
        return bd - ad;
      });

    if (filtered.length === 0 && revisions.length > 0) {
      filtered = revisions.slice().sort(function (a, b) {
        const ad = a.revisionDate ? new Date(a.revisionDate).getTime() : 0;
        const bd = b.revisionDate ? new Date(b.revisionDate).getTime() : 0;
        return bd - ad;
      });
    }

    return filtered.map(function (rev) {
      return {
        revisionId: rev.id,
        revisionNumber: rev.revisionNumber || null,
        revisionDate: rev.revisionDate || null,
        summaryOfChanges: rev.summaryOfChanges || null,
        isCurrent: rev.isCurrent === true
      };
    });
  }

  createSdsComparison(sdsId, revisionAId, revisionBId) {
    const comparisons = this._getFromStorage('sds_comparisons');
    const now = this._nowIso();
    const comparison = {
      id: this._generateId('sdscomp'),
      sdsId: sdsId,
      revisionAId: revisionAId,
      revisionBId: revisionBId,
      description: null,
      createdAt: now
    };
    comparisons.push(comparison);
    this._saveToStorage('sds_comparisons', comparisons);

    return {
      comparisonId: comparison.id,
      createdAt: comparison.createdAt
    };
  }

  getSdsComparisonView(comparisonId) {
    const comparisons = this._getFromStorage('sds_comparisons');
    const revisions = this._getFromStorage('sds_revisions');
    const notes = this._getFromStorage('sds_comparison_notes');
    const sdsList = this._getFromStorage('sds');

    const comparison = comparisons.find(function (c) {
      return c.id === comparisonId;
    });
    if (!comparison) {
      return {
        comparisonId: comparisonId,
        sdsTitle: '',
        revisionA: null,
        revisionB: null,
        notes: []
      };
    }

    const sds = sdsList.find(function (s) {
      return s.id === comparison.sdsId;
    });
    const sdsTitle = sds ? (sds.title || sds.productName || '') : '';

    const revA = revisions.find(function (r) {
      return r.id === comparison.revisionAId;
    });
    const revB = revisions.find(function (r) {
      return r.id === comparison.revisionBId;
    });

    function mapRevision(rev) {
      if (!rev) return null;
      const sectionsRaw = this._ensureArray(rev.contentSections);
      const sections = sectionsRaw.map(function (sec) {
        return {
          sectionReference: sec.sectionReference || '',
          title: sec.title || '',
          contentHtml: sec.contentHtml || ''
        };
      });
      return {
        revisionId: rev.id,
        revisionNumber: rev.revisionNumber || null,
        revisionDate: rev.revisionDate || null,
        sections: sections
      };
    }

    const mappedRevA = mapRevision.call(this, revA);
    const mappedRevB = mapRevision.call(this, revB);

    const comparisonNotes = notes
      .filter(function (n) {
        return n.comparisonId === comparison.id;
      })
      .map(function (n) {
        return {
          noteId: n.id,
          sectionReference: n.sectionReference || null,
          noteText: n.noteText,
          createdAt: n.createdAt
        };
      });

    return {
      comparisonId: comparison.id,
      sdsTitle: sdsTitle,
      revisionA: mappedRevA,
      revisionB: mappedRevB,
      notes: comparisonNotes
    };
  }

  addSdsComparisonNote(comparisonId, sectionReference, noteText) {
    const notes = this._getFromStorage('sds_comparison_notes');
    const now = this._nowIso();
    const note = {
      id: this._generateId('sdsnote'),
      comparisonId: comparisonId,
      sectionReference: sectionReference || null,
      noteText: noteText,
      createdAt: now
    };
    notes.push(note);
    this._saveToStorage('sds_comparison_notes', notes);

    return {
      note: {
        noteId: note.id,
        comparisonId: note.comparisonId,
        sectionReference: note.sectionReference,
        noteText: note.noteText,
        createdAt: note.createdAt
      },
      success: true
    };
  }

  updateSdsComparisonNote(noteId, noteText) {
    const notes = this._getFromStorage('sds_comparison_notes');
    let updated = false;
    for (let i = 0; i < notes.length; i++) {
      if (notes[i].id === noteId) {
        notes[i].noteText = noteText;
        updated = true;
        break;
      }
    }
    if (updated) {
      this._saveToStorage('sds_comparison_notes', notes);
    }
    return {
      noteId: noteId,
      success: updated
    };
  }

  deleteSdsComparisonNote(noteId) {
    const notes = this._getFromStorage('sds_comparison_notes');
    const initialLength = notes.length;
    const filtered = notes.filter(function (n) {
      return n.id !== noteId;
    });
    this._saveToStorage('sds_comparison_notes', filtered);
    return {
      noteId: noteId,
      success: filtered.length !== initialLength
    };
  }

  listSecondaryContainerLabelsForSds(sdsId) {
    const labels = this._getFromStorage('secondary_container_labels');
    const filtered = labels.filter(function (l) {
      return l.sdsId === sdsId;
    });
    return filtered.map(function (l) {
      return {
        labelId: l.id,
        labelSize: l.labelSize,
        includeProductName: !!l.includeProductName,
        includePictograms: !!l.includePictograms,
        includeSignalWord: !!l.includeSignalWord,
        generatedPreviewUrl: l.generatedPreviewUrl || null,
        createdAt: l.createdAt
      };
    });
  }

  createSecondaryContainerLabel(sdsId, labelSize, includeProductName, includePictograms, includeSignalWord) {
    const sdsList = this._getFromStorage('sds');
    let sds = sdsList.find(function (s) {
      return s.id === sdsId;
    });
    if (!sds) {
      const inventoryItems = this._getFromStorage('inventory_items');
      const products = this._getFromStorage('products');
      const inv = inventoryItems.find(function (ii) {
        return ii.sdsId === sdsId;
      });
      if (inv) {
        const product = products.find(function (p) {
          return p.id === inv.productId;
        });
        sds = {
          id: sdsId,
          productName: inv.productName || (product ? product.name : null)
        };
      }
    }
    if (!sds) {
      return {
        label: null,
        success: false,
        message: 'SDS not found.'
      };
    }

    const labels = this._getFromStorage('secondary_container_labels');
    const now = this._nowIso();
    const labelEntity = {
      id: this._generateId('label'),
      sdsId: sdsId,
      labelSize: labelSize,
      includeProductName: !!includeProductName,
      includePictograms: !!includePictograms,
      includeSignalWord: !!includeSignalWord,
      generatedPreviewUrl: '',
      createdAt: now
    };

    labelEntity.generatedPreviewUrl = this._generateSecondaryLabelPreview(sds, {
      labelSize: labelSize,
      includeProductName: !!includeProductName,
      includePictograms: !!includePictograms,
      includeSignalWord: !!includeSignalWord
    });

    labels.push(labelEntity);
    this._saveToStorage('secondary_container_labels', labels);

    return {
      label: {
        id: labelEntity.id,
        sdsId: labelEntity.sdsId,
        labelSize: labelEntity.labelSize,
        includeProductName: labelEntity.includeProductName,
        includePictograms: labelEntity.includePictograms,
        includeSignalWord: labelEntity.includeSignalWord,
        generatedPreviewUrl: labelEntity.generatedPreviewUrl,
        createdAt: labelEntity.createdAt
      },
      success: true,
      message: 'Label created.'
    };
  }

  // ----------------------
  // Favorites interfaces
  // ----------------------

  listFavoritesLists() {
    const lists = this._getFromStorage('favorites_lists');
    const items = this._getFromStorage('favorites_list_items');

    return lists.map(function (l) {
      const count = items.filter(function (it) {
        return it.favoritesListId === l.id;
      }).length;
      return {
        id: l.id,
        name: l.name,
        description: l.description || '',
        itemCount: count,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt
      };
    });
  }

  addSdsToFavoritesList(favoritesListId, sdsIds) {
    const lists = this._getFromStorage('favorites_lists');
    const list = lists.find(function (l) {
      return l.id === favoritesListId;
    });
    if (!list) {
      return {
        success: false,
        addedCount: 0,
        alreadyPresentCount: 0,
        message: 'Favorites list not found.'
      };
    }

    const items = this._getFromStorage('favorites_list_items');
    const ids = this._ensureArray(sdsIds);
    let addedCount = 0;
    let alreadyCount = 0;
    const now = this._nowIso();

    for (let i = 0; i < ids.length; i++) {
      const sdsId = ids[i];
      const exists = items.some(function (it) {
        return it.favoritesListId === favoritesListId && it.sdsId === sdsId;
      });
      if (exists) {
        alreadyCount++;
        continue;
      }
      items.push({
        id: this._generateId('favitem'),
        favoritesListId: favoritesListId,
        sdsId: sdsId,
        addedAt: now
      });
      addedCount++;
    }

    this._saveToStorage('favorites_list_items', items);

    return {
      success: true,
      addedCount: addedCount,
      alreadyPresentCount: alreadyCount,
      message: 'Favorites updated.'
    };
  }

  removeSdsFromFavoritesList(favoritesListId, sdsId) {
    const items = this._getFromStorage('favorites_list_items');
    const initialLength = items.length;
    const filtered = items.filter(function (it) {
      return !(it.favoritesListId === favoritesListId && it.sdsId === sdsId);
    });
    this._saveToStorage('favorites_list_items', filtered);
    const removed = filtered.length !== initialLength;
    return {
      success: removed,
      message: removed ? 'Removed from favorites.' : 'Item not found in favorites.'
    };
  }

  getFavoritesListsForSds(sdsId) {
    const lists = this._getFromStorage('favorites_lists');
    const items = this._getFromStorage('favorites_list_items');

    return lists.map(function (list) {
      const isMember = items.some(function (it) {
        return it.favoritesListId === list.id && it.sdsId === sdsId;
      });
      return {
        favoritesListId: list.id,
        favoritesListName: list.name,
        isMember: isMember,
        favoritesList: list
      };
    });
  }

  listFavoritesListsDetailed() {
    const lists = this._getFromStorage('favorites_lists');
    const items = this._getFromStorage('favorites_list_items');
    const sdsList = this._getFromStorage('sds');

    const sdsMap = {};
    for (let i = 0; i < sdsList.length; i++) {
      sdsMap[sdsList[i].id] = sdsList[i];
    }

    return lists.map(function (list) {
      const memberItems = items.filter(function (it) {
        return it.favoritesListId === list.id;
      });
      const mappedItems = memberItems.map(function (mi) {
        const sds = sdsMap[mi.sdsId];
        return {
          sdsId: mi.sdsId,
          productName: sds ? sds.productName : null,
          casNumber: sds ? sds.casNumber : null,
          sds: sds || null
        };
      });
      return {
        favoritesListId: list.id,
        name: list.name,
        description: list.description || '',
        items: mappedItems
      };
    });
  }

  // ----------------------
  // Quick Access interfaces
  // ----------------------

  listQuickAccessGroups() {
    const groups = this._getFromStorage('quick_access_groups');
    const memberships = this._getFromStorage('quick_access_memberships');

    return groups.map(function (g) {
      const count = memberships.filter(function (m) {
        return m.quickAccessGroupId === g.id;
      }).length;
      return {
        id: g.id,
        name: g.name,
        description: g.description || '',
        itemCount: count,
        createdAt: g.createdAt,
        updatedAt: g.updatedAt
      };
    });
  }

  addSdsToQuickAccessGroup(quickAccessGroupId, sdsIds) {
    const groups = this._getFromStorage('quick_access_groups');
    const group = groups.find(function (g) {
      return g.id === quickAccessGroupId;
    });
    if (!group) {
      return {
        success: false,
        addedCount: 0,
        alreadyPresentCount: 0,
        message: 'Quick access group not found.'
      };
    }

    const memberships = this._getFromStorage('quick_access_memberships');
    const ids = this._ensureArray(sdsIds);
    let addedCount = 0;
    let alreadyCount = 0;
    const now = this._nowIso();

    for (let i = 0; i < ids.length; i++) {
      const sdsId = ids[i];
      const exists = memberships.some(function (m) {
        return m.quickAccessGroupId === quickAccessGroupId && m.sdsId === sdsId;
      });
      if (exists) {
        alreadyCount++;
        continue;
      }
      memberships.push({
        id: this._generateId('qamem'),
        quickAccessGroupId: quickAccessGroupId,
        sdsId: sdsId,
        addedAt: now
      });
      addedCount++;
    }

    this._saveToStorage('quick_access_memberships', memberships);

    return {
      success: true,
      addedCount: addedCount,
      alreadyPresentCount: alreadyCount,
      message: 'Quick access updated.'
    };
  }

  getQuickAccessGroupContents(quickAccessGroupId) {
    const memberships = this._getFromStorage('quick_access_memberships');
    const sdsList = this._getFromStorage('sds');
    const locations = this._getFromStorage('locations');
    const locMap = {};
    for (let i = 0; i < locations.length; i++) {
      locMap[locations[i].id] = locations[i];
    }

    const filtered = memberships.filter(function (m) {
      return m.quickAccessGroupId === quickAccessGroupId;
    });

    const sdsMap = {};
    for (let i = 0; i < sdsList.length; i++) {
      sdsMap[sdsList[i].id] = sdsList[i];
    }

    return filtered.map(function (m) {
      const sds = sdsMap[m.sdsId];
      const locObjs = [];
      if (sds && Array.isArray(sds.locations)) {
        for (let j = 0; j < sds.locations.length; j++) {
          const loc = locMap[sds.locations[j]];
          if (loc) {
            locObjs.push({
              id: loc.id,
              name: loc.name,
              fullPath: loc.fullPath || loc.name
            });
          }
        }
      }
      return {
        sdsId: m.sdsId,
        productName: sds ? sds.productName : null,
        casNumber: sds ? sds.casNumber : null,
        locations: locObjs,
        sds: sds || null
      };
    });
  }

  // ----------------------
  // Generic List interfaces
  // ----------------------

  createListAndAddItems(name, description, listType, createdFrom, entityType, entityIds) {
    const lists = this._getFromStorage('lists');
    const items = this._getFromStorage('list_items');
    const now = this._nowIso();

    const list = {
      id: this._generateId('list'),
      name: name,
      description: description || '',
      listType: listType,
      createdFrom: createdFrom || 'manual',
      createdAt: now,
      updatedAt: now
    };
    lists.push(list);

    const ids = this._ensureArray(entityIds);
    let addedCount = 0;
    for (let i = 0; i < ids.length; i++) {
      items.push({
        id: this._generateId('listitem'),
        listId: list.id,
        entityType: entityType,
        entityId: ids[i],
        addedAt: now
      });
      addedCount++;
    }

    this._saveToStorage('lists', lists);
    this._saveToStorage('list_items', items);

    return {
      listId: list.id,
      success: true,
      addedCount: addedCount,
      message: 'List created and items added.'
    };
  }

  addItemsToExistingList(listId, entityType, entityIds) {
    const lists = this._getFromStorage('lists');
    const list = lists.find(function (l) {
      return l.id === listId;
    });
    if (!list) {
      return {
        listId: listId,
        success: false,
        addedCount: 0,
        alreadyPresentCount: 0,
        message: 'List not found.'
      };
    }

    const items = this._getFromStorage('list_items');
    const ids = this._ensureArray(entityIds);
    const now = this._nowIso();
    let addedCount = 0;
    let alreadyCount = 0;

    for (let i = 0; i < ids.length; i++) {
      const entityId = ids[i];
      const exists = items.some(function (it) {
        return it.listId === listId && it.entityType === entityType && it.entityId === entityId;
      });
      if (exists) {
        alreadyCount++;
        continue;
      }
      items.push({
        id: this._generateId('listitem'),
        listId: listId,
        entityType: entityType,
        entityId: entityId,
        addedAt: now
      });
      addedCount++;
    }

    this._saveToStorage('list_items', items);

    return {
      listId: listId,
      success: true,
      addedCount: addedCount,
      alreadyPresentCount: alreadyCount,
      message: 'Items added to list.'
    };
  }

  listLists(listType) {
    const lists = this._getFromStorage('lists');
    const items = this._getFromStorage('list_items');

    const filteredLists = typeof listType === 'string' && listType
      ? lists.filter(function (l) {
          return l.listType === listType;
        })
      : lists;

    return filteredLists.map(function (l) {
      const count = items.filter(function (it) {
        return it.listId === l.id;
      }).length;
      return {
        listId: l.id,
        name: l.name,
        description: l.description || '',
        listType: l.listType,
        createdFrom: l.createdFrom || 'manual',
        itemCount: count,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt
      };
    });
  }

  getListItems(listId) {
    const items = this._getFromStorage('list_items');
    const sdsList = this._getFromStorage('sds');
    const inventoryItems = this._getFromStorage('inventory_items');
    const locations = this._getFromStorage('locations');

    const sdsMap = {};
    for (let i = 0; i < sdsList.length; i++) {
      sdsMap[sdsList[i].id] = sdsList[i];
    }
    const invMap = {};
    for (let i = 0; i < inventoryItems.length; i++) {
      invMap[inventoryItems[i].id] = inventoryItems[i];
    }
    const locMap = {};
    for (let i = 0; i < locations.length; i++) {
      locMap[locations[i].id] = locations[i];
    }

    const filtered = items.filter(function (it) {
      return it.listId === listId;
    });

    return filtered.map(function (it) {
      let displayName = null;
      let locationName = null;
      let casNumber = null;
      let entity = null;

      if (it.entityType === 'sds') {
        const sds = sdsMap[it.entityId];
        entity = sds || null;
        if (sds) {
          displayName = sds.productName || sds.title || null;
          casNumber = sds.casNumber || null;
          if (Array.isArray(sds.locations) && sds.locations.length) {
            const loc = locMap[sds.locations[0]];
            if (loc) locationName = loc.name;
          }
        }
      } else if (it.entityType === 'inventory_item') {
        const inv = invMap[it.entityId];
        entity = inv || null;
        if (inv) {
          displayName = inv.productName || null;
          const loc = locMap[inv.locationId];
          if (loc) locationName = loc.name;
          if (inv.sdsId && sdsMap[inv.sdsId]) {
            casNumber = sdsMap[inv.sdsId].casNumber || null;
          }
        }
      }

      return {
        listItemId: it.id,
        entityType: it.entityType,
        entityId: it.entityId,
        displayName: displayName,
        locationName: locationName,
        casNumber: casNumber,
        addedAt: it.addedAt,
        entity: entity
      };
    });
  }

  // ----------------------
  // Inventory & locations
  // ----------------------

  getInventoryLocationTree() {
    const locations = this._getFromStorage('locations');
    const activeLocations = locations.filter(function (l) {
      return l.isActive !== false;
    });

    const map = {};
    const roots = [];

    for (let i = 0; i < activeLocations.length; i++) {
      const loc = activeLocations[i];
      map[loc.id] = {
        id: loc.id,
        name: loc.name,
        locationType: loc.locationType,
        fullPath: loc.fullPath || loc.name,
        children: []
      };
    }

    for (let i = 0; i < activeLocations.length; i++) {
      const loc = activeLocations[i];
      const node = map[loc.id];
      const parentId = loc.parentLocationId;
      if (parentId && map[parentId]) {
        map[parentId].children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  getInventoryFilterOptions() {
    const inventoryItems = this._getFromStorage('inventory_items');

    let minNfpa = null;
    let maxNfpa = null;
    for (let i = 0; i < inventoryItems.length; i++) {
      const rating = inventoryItems[i].nfpaHealthRating;
      if (typeof rating === 'number') {
        if (minNfpa === null || rating < minNfpa) minNfpa = rating;
        if (maxNfpa === null || rating > maxNfpa) maxNfpa = rating;
      }
    }
    if (minNfpa === null) minNfpa = 0;
    if (maxNfpa === null) maxNfpa = 4;

    const hazardClassOptions = [
      { code: 'flammable_liquid', label: 'Flammable Liquid' },
      { code: 'corrosive_liquid', label: 'Corrosive Liquid' },
      { code: 'oxidizing_liquid', label: 'Oxidizing Liquid' },
      { code: 'toxic', label: 'Toxic' },
      { code: 'gas_under_pressure', label: 'Gas Under Pressure' },
      { code: 'other', label: 'Other' }
    ];

    const sortOptions = [
      {
        field: 'flash_point_celsius',
        label: 'Flash Point (°C)',
        defaultDirection: 'asc'
      },
      {
        field: 'nfpa_health_rating',
        label: 'NFPA Health Rating',
        defaultDirection: 'desc'
      },
      {
        field: 'hazard_pictograms_count',
        label: 'Hazard Pictograms Count',
        defaultDirection: 'desc'
      },
      {
        field: 'product_name',
        label: 'Product Name',
        defaultDirection: 'asc'
      }
    ];

    return {
      hazardClassOptions: hazardClassOptions,
      nfpaHealthRange: {
        min: minNfpa,
        max: maxNfpa
      },
      sortOptions: sortOptions
    };
  }

  getInventoryColumnOptions() {
    const prefs = this._getOrCreateUserPreferences();
    const visibleSet = new Set(this._ensureArray(prefs.inventoryVisibleColumns));

    const allColumns = [
      {
        columnId: 'product_name',
        label: 'Product Name',
        description: 'Inventory product name',
        defaultVisible: true
      },
      {
        columnId: 'quantity',
        label: 'Quantity',
        description: 'Stored quantity',
        defaultVisible: true
      },
      {
        columnId: 'unit',
        label: 'Unit',
        description: 'Unit of measure',
        defaultVisible: true
      },
      {
        columnId: 'hazard_class',
        label: 'Hazard Class',
        description: 'Primary hazard class',
        defaultVisible: true
      },
      {
        columnId: 'flash_point_celsius',
        label: 'Flash Point (°C)',
        description: 'Flash point in Celsius',
        defaultVisible: false
      },
      {
        columnId: 'daily_usage_liters_per_day',
        label: 'Daily Usage (L/day)',
        description: 'Typical daily usage',
        defaultVisible: false
      },
      {
        columnId: 'nfpa_health_rating',
        label: 'NFPA Health',
        description: 'NFPA health rating (0–4)',
        defaultVisible: true
      },
      {
        columnId: 'hazard_pictograms_count',
        label: 'Hazard Pictograms Count',
        description: 'Number of hazard pictograms',
        defaultVisible: false
      }
    ];

    return allColumns.map(function (c) {
      const isVisible = visibleSet.size
        ? visibleSet.has(c.columnId)
        : c.defaultVisible;
      return {
        columnId: c.columnId,
        label: c.label,
        description: c.description,
        isVisible: isVisible
      };
    });
  }

  setInventoryVisibleColumns(visibleColumnIds) {
    const prefs = this._getOrCreateUserPreferences();
    prefs.inventoryVisibleColumns = this._ensureArray(visibleColumnIds);
    this._saveUserPreferences(prefs);
    return {
      success: true,
      visibleColumnIds: prefs.inventoryVisibleColumns
    };
  }

  listInventoryItems(locationId, filters, sort, page, pageSize) {
    const inventoryItems = this._getFromStorage('inventory_items');
    const locations = this._getFromStorage('locations');
    const products = this._getFromStorage('products');
    const sdsList = this._getFromStorage('sds');

    const locMap = {};
    for (let i = 0; i < locations.length; i++) {
      locMap[locations[i].id] = locations[i];
    }
    const productMap = {};
    for (let i = 0; i < products.length; i++) {
      productMap[products[i].id] = products[i];
    }
    const sdsMap = {};
    for (let i = 0; i < sdsList.length; i++) {
      sdsMap[sdsList[i].id] = sdsList[i];
    }

    const allowedLocationIds = this._getSelfAndDescendantLocationIds([locationId]);
    const f = filters || {};

    const filtered = [];
    for (let i = 0; i < inventoryItems.length; i++) {
      const item = inventoryItems[i];
      if (item.isActive === false) continue;
      if (!allowedLocationIds.has(item.locationId)) continue;

      if (f.hazardClass && item.hazardClass !== f.hazardClass) continue;

      if (typeof f.flashPointMin === 'number') {
        if (typeof item.flashPointCelsius !== 'number' || item.flashPointCelsius < f.flashPointMin) {
          continue;
        }
      }
      if (typeof f.flashPointMax === 'number') {
        if (typeof item.flashPointCelsius !== 'number' || item.flashPointCelsius > f.flashPointMax) {
          continue;
        }
      }

      if (typeof f.nfpaHealthMin === 'number') {
        if (typeof item.nfpaHealthRating !== 'number' || item.nfpaHealthRating < f.nfpaHealthMin) {
          continue;
        }
      }
      if (typeof f.nfpaHealthMax === 'number') {
        if (typeof item.nfpaHealthRating !== 'number' || item.nfpaHealthRating > f.nfpaHealthMax) {
          continue;
        }
      }

      if (typeof f.hazardPictogramsCountMin === 'number') {
        if (typeof item.hazardPictogramsCount !== 'number' || item.hazardPictogramsCount < f.hazardPictogramsCountMin) {
          continue;
        }
      }
      if (typeof f.hazardPictogramsCountMax === 'number') {
        if (typeof item.hazardPictogramsCount !== 'number' || item.hazardPictogramsCount > f.hazardPictogramsCountMax) {
          continue;
        }
      }

      if (typeof f.dailyUsageMin === 'number') {
        if (typeof item.dailyUsageLitersPerDay !== 'number' || item.dailyUsageLitersPerDay < f.dailyUsageMin) {
          continue;
        }
      }
      if (typeof f.dailyUsageMax === 'number') {
        if (typeof item.dailyUsageLitersPerDay !== 'number' || item.dailyUsageLitersPerDay > f.dailyUsageMax) {
          continue;
        }
      }

      filtered.push(item);
    }

    const s = sort || {};
    const primaryField = s.field || 'product_name';
    const primaryDirection = s.direction === 'desc' ? 'desc' : 'asc';
    const secondaryField = s.secondaryField || null;
    const secondaryDirection = s.secondaryDirection === 'desc' ? 'desc' : 'asc';

    function getFieldValue(item, fieldId) {
      if (!fieldId) return null;
      if (fieldId === 'flash_point_celsius') return item.flashPointCelsius;
      if (fieldId === 'nfpa_health_rating') return item.nfpaHealthRating;
      if (fieldId === 'hazard_pictograms_count') return item.hazardPictogramsCount;
      if (fieldId === 'product_name') return item.productName;
      return null;
    }

    filtered.sort(function (a, b) {
      function compareBy(fieldId, dir) {
        if (!fieldId) return 0;
        let av = getFieldValue(a, fieldId);
        let bv = getFieldValue(b, fieldId);
        if (av == null && bv != null) return dir === 'asc' ? -1 : 1;
        if (av != null && bv == null) return dir === 'asc' ? 1 : -1;
        if (av == null && bv == null) return 0;
        if (typeof av === 'number' && typeof bv === 'number') {
          return dir === 'asc' ? av - bv : bv - av;
        }
        av = av.toString().toLowerCase();
        bv = bv.toString().toLowerCase();
        if (av < bv) return dir === 'asc' ? -1 : 1;
        if (av > bv) return dir === 'asc' ? 1 : -1;
        return 0;
      }

      let cmp = compareBy(primaryField, primaryDirection);
      if (cmp !== 0) return cmp;
      return compareBy(secondaryField, secondaryDirection);
    });

    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const sizeNum = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 25;
    const totalCount = filtered.length;
    const start = (pageNum - 1) * sizeNum;
    const end = start + sizeNum;
    const slice = filtered.slice(start, end);

    const items = slice.map(function (item) {
      const loc = locMap[item.locationId];
      const product = productMap[item.productId] || null;
      const sds = item.sdsId ? sdsMap[item.sdsId] || null : null;
      return {
        inventoryItemId: item.id,
        productId: item.productId,
        productName: item.productName,
        location: loc
          ? {
              id: loc.id,
              name: loc.name,
              fullPath: loc.fullPath || loc.name
            }
          : null,
        quantity: item.quantity,
        unit: item.unit || null,
        hazardClass: item.hazardClass || null,
        flashPointCelsius: item.flashPointCelsius,
        dailyUsageLitersPerDay: item.dailyUsageLitersPerDay,
        nfpaHealthRating: item.nfpaHealthRating,
        hazardPictogramsCount: item.hazardPictogramsCount,
        hazardPictograms: item.hazardPictograms || [],
        sdsId: item.sdsId || null,
        hasSds: !!item.sdsId,
        isActive: item.isActive !== false,
        product: product,
        sds: sds
      };
    });

    return {
      items: items,
      page: pageNum,
      pageSize: sizeNum,
      totalCount: totalCount
    };
  }

  createBinderFromInventoryItems(name, description, isSharedToSharedBinders, inventoryItemIds) {
    const binders = this._getFromStorage('binders');
    const binderItems = this._getFromStorage('binder_items');

    const now = this._nowIso();
    const binder = {
      id: this._generateId('binder'),
      name: name,
      description: description || '',
      isSharedToSharedBinders: !!isSharedToSharedBinders,
      createdAt: now,
      updatedAt: now
    };
    binders.push(binder);

    const sdsIds = this._resolveInventoryItemsToSdsIds(inventoryItemIds);

    let addedSdsCount = 0;
    for (let i = 0; i < sdsIds.length; i++) {
      binderItems.push({
        id: this._generateId('binderitem'),
        binderId: binder.id,
        sdsId: sdsIds[i],
        addedAt: now
      });
      addedSdsCount++;
    }

    this._saveToStorage('binders', binders);
    this._saveToStorage('binder_items', binderItems);

    return {
      binderId: binder.id,
      addedSdsCount: addedSdsCount,
      success: true,
      message: 'Binder created from inventory items.'
    };
  }

  addInventoryItemsToExistingBinder(binderId, inventoryItemIds) {
    const binders = this._getFromStorage('binders');
    const binder = binders.find(function (b) {
      return b.id === binderId;
    });
    if (!binder) {
      return {
        binderId: binderId,
        addedSdsCount: 0,
        alreadyPresentCount: 0,
        success: false,
        message: 'Binder not found.'
      };
    }

    const binderItems = this._getFromStorage('binder_items');
    const existing = binderItems.filter(function (bi) {
      return bi.binderId === binderId;
    });
    const existingSdsIds = new Set();
    for (let i = 0; i < existing.length; i++) {
      existingSdsIds.add(existing[i].sdsId);
    }

    const sdsIds = this._resolveInventoryItemsToSdsIds(inventoryItemIds);
    const now = this._nowIso();
    let addedSdsCount = 0;
    let alreadyPresentCount = 0;

    for (let i = 0; i < sdsIds.length; i++) {
      const sdsId = sdsIds[i];
      if (existingSdsIds.has(sdsId)) {
        alreadyPresentCount++;
        continue;
      }
      binderItems.push({
        id: this._generateId('binderitem'),
        binderId: binderId,
        sdsId: sdsId,
        addedAt: now
      });
      existingSdsIds.add(sdsId);
      addedSdsCount++;
    }

    binder.updatedAt = this._nowIso();
    this._saveToStorage('binders', binders);
    this._saveToStorage('binder_items', binderItems);

    return {
      binderId: binderId,
      addedSdsCount: addedSdsCount,
      alreadyPresentCount: alreadyPresentCount,
      success: true,
      message: 'Inventory items added to binder.'
    };
  }

  getInventoryItemDetails(inventoryItemId) {
    const inventoryItems = this._getFromStorage('inventory_items');
    const locations = this._getFromStorage('locations');
    const products = this._getFromStorage('products');
    const sdsList = this._getFromStorage('sds');

    const locMap = {};
    for (let i = 0; i < locations.length; i++) {
      locMap[locations[i].id] = locations[i];
    }
    const productMap = {};
    for (let i = 0; i < products.length; i++) {
      productMap[products[i].id] = products[i];
    }
    const sdsMap = {};
    for (let i = 0; i < sdsList.length; i++) {
      sdsMap[sdsList[i].id] = sdsList[i];
    }

    const item = inventoryItems.find(function (ii) {
      return ii.id === inventoryItemId;
    });
    if (!item) {
      return {
        inventoryItemId: inventoryItemId,
        productId: null,
        productName: null,
        location: null,
        quantity: null,
        unit: null,
        hazardClass: null,
        nfpaHealthRating: null,
        hazardPictogramsCount: null,
        sdsId: null,
        hasSds: false,
        product: null,
        sds: null
      };
    }

    const loc = locMap[item.locationId];
    const product = productMap[item.productId] || null;
    const sds = item.sdsId ? sdsMap[item.sdsId] || null : null;

    return {
      inventoryItemId: item.id,
      productId: item.productId,
      productName: item.productName,
      location: loc
        ? {
            id: loc.id,
            name: loc.name,
            fullPath: loc.fullPath || loc.name
          }
        : null,
      quantity: item.quantity,
      unit: item.unit || null,
      hazardClass: item.hazardClass || null,
      nfpaHealthRating: item.nfpaHealthRating,
      hazardPictogramsCount: item.hazardPictogramsCount,
      sdsId: item.sdsId || null,
      hasSds: !!item.sdsId,
      product: product,
      sds: sds
    };
  }

  listBinders() {
    const binders = this._getFromStorage('binders');
    const binderItems = this._getFromStorage('binder_items');

    return binders.map(function (b) {
      const count = binderItems.filter(function (bi) {
        return bi.binderId === b.id;
      }).length;
      return {
        binderId: b.id,
        name: b.name,
        description: b.description || '',
        isSharedToSharedBinders: !!b.isSharedToSharedBinders,
        itemCount: count,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt
      };
    });
  }

  getBinderContents(binderId) {
    const binderItems = this._getFromStorage('binder_items');
    const sdsList = this._getFromStorage('sds');
    const sdsMap = {};
    for (let i = 0; i < sdsList.length; i++) {
      sdsMap[sdsList[i].id] = sdsList[i];
    }

    const items = binderItems.filter(function (bi) {
      return bi.binderId === binderId;
    });

    return items.map(function (bi) {
      const sds = sdsMap[bi.sdsId];
      return {
        sdsId: bi.sdsId,
        productName: sds ? sds.productName : null,
        casNumber: sds ? sds.casNumber : null,
        revisionDate: sds ? sds.revisionDate : null,
        expiryDate: sds ? sds.expiryDate : null,
        sds: sds || null
      };
    });
  }

  // ----------------------
  // Products & CAS lookup
  // ----------------------

  listProducts(query, filters, page, pageSize) {
    const products = this._getFromStorage('products');
    const locations = this._getFromStorage('locations');
    const sdsList = this._getFromStorage('sds');

    const locMap = {};
    for (let i = 0; i < locations.length; i++) {
      locMap[locations[i].id] = locations[i];
    }
    const sdsMap = {};
    for (let i = 0; i < sdsList.length; i++) {
      sdsMap[sdsList[i].id] = sdsList[i];
    }

    const q = this._normalizeString(query);
    const f = filters || {};

    const filtered = products.filter(function (p) {
      if (p.isActive === false) return false;
      if (q) {
        const hay = (p.name || '').toLowerCase() + ' ' + (p.casNumber || '').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      if (f.casNumber && p.casNumber !== f.casNumber) return false;
      if (f.primaryLocationIds && f.primaryLocationIds.length) {
        if (f.primaryLocationIds.indexOf(p.primaryLocationId) === -1) return false;
      }
      if (f.hazardCategories && f.hazardCategories.length) {
        const hc = p.hazardCategories || [];
        let has = false;
        for (let j = 0; j < hc.length; j++) {
          if (f.hazardCategories.indexOf(hc[j]) !== -1) {
            has = true;
            break;
          }
        }
        if (!has) return false;
      }
      return true;
    });

    // default sort by name
    filtered.sort(function (a, b) {
      const an = (a.name || '').toLowerCase();
      const bn = (b.name || '').toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });

    const pageNum = typeof page === 'number' && page > 0 ? page : 1;
    const sizeNum = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 25;
    const totalCount = filtered.length;
    const start = (pageNum - 1) * sizeNum;
    const end = start + sizeNum;
    const slice = filtered.slice(start, end);

    const items = slice.map(function (p) {
      const loc = locMap[p.primaryLocationId];
      const sds = p.linkedSdsId ? sdsMap[p.linkedSdsId] || null : null;
      return {
        productId: p.id,
        name: p.name,
        casNumber: p.casNumber,
        primaryLocationName: loc ? loc.name : null,
        hazardCategories: p.hazardCategories || [],
        hasLinkedSds: !!p.linkedSdsId,
        linkedSdsId: p.linkedSdsId || null,
        primaryLocation: loc || null,
        linkedSds: sds
      };
    });

    return {
      items: items,
      page: pageNum,
      pageSize: sizeNum,
      totalCount: totalCount
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const locations = this._getFromStorage('locations');
    const substances = this._getFromStorage('chemical_substances');
    const sdsList = this._getFromStorage('sds');

    const product = products.find(function (p) {
      return p.id === productId;
    });
    if (!product) {
      return {
        productId: productId,
        name: null,
        description: null,
        substanceId: null,
        casNumber: null,
        primaryLocationId: null,
        primaryLocationName: null,
        hazardCategories: [],
        productCategory: null,
        linkedSdsId: null,
        linkedSdsTitle: null,
        isActive: false,
        substance: null,
        primaryLocation: null,
        linkedSds: null
      };
    }

    const loc = locations.find(function (l) {
      return l.id === product.primaryLocationId;
    });
    const substance = substances.find(function (s) {
      return s.id === product.substanceId;
    });
    const linkedSds = product.linkedSdsId
      ? sdsList.find(function (s) {
          return s.id === product.linkedSdsId;
        })
      : null;

    return {
      productId: product.id,
      name: product.name,
      description: product.description || '',
      substanceId: product.substanceId,
      casNumber: product.casNumber,
      primaryLocationId: product.primaryLocationId,
      primaryLocationName: loc ? loc.name : null,
      hazardCategories: product.hazardCategories || [],
      productCategory: product.productCategory || null,
      linkedSdsId: product.linkedSdsId || null,
      linkedSdsTitle: linkedSds ? linkedSds.title : null,
      isActive: product.isActive !== false,
      substance: substance || null,
      primaryLocation: loc || null,
      linkedSds: linkedSds || null
    };
  }

  getCasLookupSuggestions(query) {
    const substances = this._getFromStorage('chemical_substances');
    const q = this._normalizeString(query);
    if (!q) return [];

    const results = substances.filter(function (s) {
      const casNorm = (s.casNumber || '').toLowerCase();
      const nameNorm = (s.name || '').toLowerCase();
      if (casNorm.indexOf(q) !== -1) return true;
      if (nameNorm.indexOf(q) !== -1) return true;
      if (Array.isArray(s.synonyms)) {
        for (let i = 0; i < s.synonyms.length; i++) {
          if ((s.synonyms[i] || '').toLowerCase().indexOf(q) !== -1) {
            return true;
          }
        }
      }
      return false;
    });

    return results.map(function (s) {
      return {
        substanceId: s.id,
        casNumber: s.casNumber,
        name: s.name,
        synonyms: s.synonyms || [],
        description: s.description || ''
      };
    });
  }

  listLocations(locationType) {
    const locations = this._getFromStorage('locations');
    const filtered = locations.filter(function (l) {
      if (l.isActive === false) return false;
      if (locationType && l.locationType !== locationType) return false;
      return true;
    });
    return filtered.map(function (l) {
      return {
        locationId: l.id,
        name: l.name,
        locationType: l.locationType,
        fullPath: l.fullPath || l.name,
        isActive: l.isActive !== false
      };
    });
  }

  listHazardCategoryOptions() {
    const sdsList = this._getFromStorage('sds');
    const products = this._getFromStorage('products');

    const set = new Set();
    const addArr = function (arr) {
      if (!arr) return;
      for (let i = 0; i < arr.length; i++) {
        set.add(arr[i]);
      }
    };

    for (let i = 0; i < sdsList.length; i++) {
      addArr(sdsList[i].hazardCategories);
    }
    for (let i = 0; i < products.length; i++) {
      addArr(products[i].hazardCategories);
    }

    // ensure some common ones
    set.add('flammable');
    set.add('irritant');
    set.add('carcinogen_category_1');
    set.add('corrosive');
    set.add('other');

    function label(code) {
      return code
        .split('_')
        .map(function (p) {
          return p.charAt(0).toUpperCase() + p.slice(1);
        })
        .join(' ');
    }

    return Array.from(set).map(function (code) {
      return { code: code, label: label(code) };
    });
  }

  searchSdsByCasNumber(casNumber) {
    const sdsList = this._getFromStorage('sds');
    const target = (casNumber || '').replace(/\s+/g, '').toLowerCase();
    const filtered = sdsList.filter(function (s) {
      const cas = (s.casNumber || '').replace(/\s+/g, '').toLowerCase();
      return cas === target;
    });

    return filtered.map(function (s) {
      return {
        sdsId: s.id,
        title: s.title,
        productName: s.productName,
        casNumber: s.casNumber,
        revisionDate: s.revisionDate || null,
        sds: s
      };
    });
  }

  createProduct(name, description, substanceId, casNumber, primaryLocationId, hazardCategories, productCategory, linkedSdsId) {
    const products = this._getFromStorage('products');
    const now = this._nowIso();

    const product = {
      id: this._generateId('prod'),
      name: name,
      description: description || '',
      substanceId: substanceId,
      casNumber: casNumber,
      primaryLocationId: primaryLocationId,
      hazardCategories: hazardCategories || [],
      productCategory: productCategory || null,
      linkedSdsId: linkedSdsId || null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    products.push(product);
    this._saveToStorage('products', products);

    return {
      productId: product.id,
      success: true,
      message: 'Product created.'
    };
  }

  updateProduct(productId, name, description, substanceId, casNumber, primaryLocationId, hazardCategories, productCategory, linkedSdsId, isActive) {
    const products = this._getFromStorage('products');
    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return {
        productId: productId,
        success: false
      };
    }

    if (typeof name === 'string') product.name = name;
    if (typeof description === 'string') product.description = description;
    if (typeof substanceId === 'string') product.substanceId = substanceId;
    if (typeof casNumber === 'string') product.casNumber = casNumber;
    if (typeof primaryLocationId === 'string') product.primaryLocationId = primaryLocationId;
    if (Array.isArray(hazardCategories)) product.hazardCategories = hazardCategories;
    if (typeof productCategory === 'string') product.productCategory = productCategory;
    if (typeof linkedSdsId === 'string') product.linkedSdsId = linkedSdsId;
    if (typeof isActive === 'boolean') product.isActive = isActive;
    product.updatedAt = this._nowIso();

    this._saveToStorage('products', products);

    return {
      productId: product.id,
      success: true
    };
  }

  // ----------------------
  // About & Help
  // ----------------------

  getAboutContent() {
    const aboutRaw = localStorage.getItem('about_content');
    return aboutRaw ? JSON.parse(aboutRaw) : {
      headline: '',
      bodyHtml: '',
      modulesSummary: [],
      contactInfoHtml: '',
      disclaimerHtml: ''
    };
  }

  getHelpTopics() {
    const topics = this._getFromStorage('help_topics');
    return topics.map(function (t) {
      return {
        topicId: t.topicId,
        title: t.title,
        category: t.category,
        summary: t.summary
      };
    });
  }

  getHelpTopicDetails(topicId) {
    const details = this._getFromStorage('help_topic_details');
    const topic = details.find(function (t) {
      return t.topicId === topicId;
    });
    if (!topic) {
      return {
        topicId: topicId,
        title: '',
        category: '',
        bodyHtml: '',
        relatedTasks: []
      };
    }
    return {
      topicId: topic.topicId,
      title: topic.title,
      category: topic.category,
      bodyHtml: topic.bodyHtml,
      relatedTasks: topic.relatedTasks || []
    };
  }

  // ----------------------
  // Dashboard helper creator
  // ----------------------

  createDashboardWidgetChemicalCountByLocation(title, hazardFilterCategory, groupBy, includeLocationIds, thresholdAlertValue) {
    const result = this.createDashboardWidget(
      title,
      'chemical_count_by_location',
      hazardFilterCategory,
      groupBy,
      includeLocationIds,
      thresholdAlertValue
    );
    return {
      widgetId: result.widget ? result.widget.id : null,
      success: !!result.success
    };
  }

  // ----------------------
  // Collections overview & SDS-to-binder
  // ----------------------

  addSdsToBinder(binderId, sdsId) {
    const binders = this._getFromStorage('binders');
    const binder = binders.find(function (b) {
      return b.id === binderId;
    });
    if (!binder) {
      return {
        binderId: binderId,
        added: false,
        message: 'Binder not found.'
      };
    }

    const binderItems = this._getFromStorage('binder_items');
    const exists = binderItems.some(function (bi) {
      return bi.binderId === binderId && bi.sdsId === sdsId;
    });
    if (exists) {
      return {
        binderId: binderId,
        added: false,
        message: 'SDS already in binder.'
      };
    }

    binderItems.push({
      id: this._generateId('binderitem'),
      binderId: binderId,
      sdsId: sdsId,
      addedAt: this._nowIso()
    });
    binder.updatedAt = this._nowIso();
    this._saveToStorage('binder_items', binderItems);
    this._saveToStorage('binders', binders);

    return {
      binderId: binderId,
      added: true,
      message: 'SDS added to binder.'
    };
  }

  getCollectionsOverview() {
    const favoritesLists = this._getFromStorage('favorites_lists');
    const binders = this._getFromStorage('binders');
    const lists = this._getFromStorage('lists');
    const quickAccessGroups = this._getFromStorage('quick_access_groups');

    return {
      favoritesListsCount: favoritesLists.length,
      bindersCount: binders.length,
      listsCount: lists.length,
      quickAccessGroupsCount: quickAccessGroups.length
    };
  }

  // ----------------------
  // Assign top N by NFPA health helper
  // ----------------------

  assignTopNByNfpaHealthToList(locationId, n, listId) {
    const inventoryItems = this._getFromStorage('inventory_items');
    const allowedLocationIds = this._getSelfAndDescendantLocationIds([locationId]);

    const filtered = inventoryItems.filter(function (item) {
      if (item.isActive === false) return false;
      if (!allowedLocationIds.has(item.locationId)) return false;
      return typeof item.nfpaHealthRating === 'number';
    });

    filtered.sort(function (a, b) {
      const ad = a.nfpaHealthRating;
      const bd = b.nfpaHealthRating;
      if (bd !== ad) return bd - ad; // desc by rating
      const an = (a.productName || '').toLowerCase();
      const bn = (b.productName || '').toLowerCase();
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });

    const limit = typeof n === 'number' && n > 0 ? n : 0;
    const topItems = limit ? filtered.slice(0, limit) : filtered;
    const ids = topItems.map(function (it) {
      return it.id;
    });

    const res = this.addItemsToExistingList(listId, 'inventory_item', ids);

    return {
      addedCount: res.addedCount || 0,
      success: !!res.success,
      message: res.message || 'Items assigned.'
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