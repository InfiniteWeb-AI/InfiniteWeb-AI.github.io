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

  // =====================
  // Storage helpers
  // =====================

  _initStorage() {
    const keys = [
      'service_categories',
      'services',
      'regions',
      'service_uptime_stats',
      'service_region_performances',
      'service_region_preferences',
      'watchlists',
      'watchlist_items',
      'service_tag_assignments',
      'maintenance_windows',
      'alert_rules',
      'incidents',
      'incident_reports',
      'dashboards',
      'dashboard_widgets',
      'widget_service_entries',
      'status_pinned_services'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getFromStorageObject(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : defaultValue;
    } catch (e) {
      return defaultValue;
    }
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

  _findById(list, id) {
    return list.find(item => item.id === id) || null;
  }

  // =====================
  // Internal helpers (per spec)
  // =====================

  // Convert preset + custom inputs to concrete date range
  _computeDateRangeFromPreset(dateRangePreset, customStart, customEnd) {
    const now = new Date();
    let start;
    let end;

    switch (dateRangePreset) {
      case 'last_24_hours':
        end = now;
        start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'yesterday': {
        const todayMidnight = new Date(now);
        todayMidnight.setHours(0, 0, 0, 0);
        end = new Date(todayMidnight.getTime() - 1);
        start = new Date(todayMidnight.getTime() - 24 * 60 * 60 * 1000);
        break;
      }
      case 'last_7_days':
        end = now;
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30_days':
        end = now;
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last_90_days':
        end = now;
        start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
      default: {
        if (customStart) {
          start = new Date(customStart);
        } else {
          start = new Date(now);
          start.setHours(0, 0, 0, 0);
        }
        if (customEnd) {
          end = new Date(customEnd);
        } else {
          end = now;
        }
        break;
      }
    }

    return {
      dateRangePreset: dateRangePreset || 'custom',
      periodStart: start.toISOString(),
      periodEnd: end.toISOString()
    };
  }

  _computeMaintenanceEndTime(startTimeIso, durationMinutes) {
    const start = new Date(startTimeIso);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    return end.toISOString();
  }

  _applyIncidentFilters(incidents, options) {
    const {
      dateRangePreset,
      customStart,
      customEnd,
      severityList,
      serviceId,
      categoryId
    } = options || {};

    let filtered = incidents.slice();

    if (dateRangePreset) {
      const { periodStart, periodEnd } = this._computeDateRangeFromPreset(
        dateRangePreset,
        customStart,
        customEnd
      );
      const startTime = new Date(periodStart).getTime();
      const endTime = new Date(periodEnd).getTime();

      filtered = filtered.filter(incident => {
        const startedAt = new Date(incident.startedAt).getTime();
        return startedAt >= startTime && startedAt <= endTime;
      });
    }

    if (Array.isArray(severityList) && severityList.length > 0) {
      const allowed = new Set(severityList);
      filtered = filtered.filter(incident => allowed.has(incident.severity));
    }

    if (serviceId) {
      filtered = filtered.filter(incident => incident.serviceId === serviceId);
    }

    if (categoryId) {
      const services = this._getFromStorage('services');
      const serviceById = new Map(services.map(s => [s.id, s]));
      filtered = filtered.filter(incident => {
        const svc = serviceById.get(incident.serviceId);
        return svc && svc.categoryId === categoryId;
      });
    }

    return filtered;
  }

  _getOrCreateWatchlistByName(name, description) {
    const watchlists = this._getFromStorage('watchlists');
    let existing = watchlists.find(w => w.name === name) || null;
    if (existing) return existing;

    const now = this._nowIso();
    const watchlist = {
      id: this._generateId('watchlist'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    watchlists.push(watchlist);
    this._saveToStorage('watchlists', watchlists);
    return watchlist;
  }

  _getOrCreateDefaultDashboard() {
    let dashboards = this._getFromStorage('dashboards');
    if (dashboards.length > 0) {
      // Assume first is default
      return dashboards[0];
    }
    const now = this._nowIso();
    const dashboard = {
      id: this._generateId('dashboard'),
      name: 'Main dashboard',
      createdAt: now,
      updatedAt: now
    };
    dashboards.push(dashboard);
    this._saveToStorage('dashboards', dashboards);
    return dashboard;
  }

  // =====================
  // Core interface implementations
  // =====================

  // getHomeOverview()
  getHomeOverview() {
    const services = this._getFromStorage('services');
    const categories = this._getFromStorage('service_categories');
    const uptimeStats = this._getFromStorage('service_uptime_stats');
    const pinned = this._getFromStorage('status_pinned_services');
    const alertRules = this._getFromStorage('alert_rules');

    const categoryById = new Map(categories.map(c => [c.id, c]));
    const serviceById = new Map(services.map(s => [s.id, s]));

    // overallStatus based on worst service status
    let overallStatus = 'unknown';
    if (services.length > 0) {
      const severities = services.map(s => s.currentStatus || 'unknown');
      if (severities.includes('major_outage')) overallStatus = 'major_outage';
      else if (severities.includes('partial_outage')) overallStatus = 'partial_outage';
      else if (severities.includes('degraded_performance')) overallStatus = 'degraded_performance';
      else if (severities.includes('maintenance')) overallStatus = 'maintenance';
      else if (severities.includes('operational')) overallStatus = 'operational';
      else overallStatus = 'unknown';
    }

    const computeAvgUptime = preset => {
      const stats = uptimeStats.filter(s => s.dateRangePreset === preset);
      if (stats.length === 0) return 0;
      const sum = stats.reduce((acc, s) => acc + (s.uptimePercent || 0), 0);
      return sum / stats.length;
    };

    const overallUptimeSummary = {
      last_24_hours: computeAvgUptime('last_24_hours'),
      last_7_days: computeAvgUptime('last_7_days'),
      last_30_days: computeAvgUptime('last_30_days')
    };

    // pinnedServices
    const pinnedServices = pinned
      .filter(p => p.pinContext === 'status_overview')
      .map(p => {
        const service = serviceById.get(p.serviceId) || null;
        return {
          service,
          pinnedAt: p.pinnedAt,
          categoryName: service && service.categoryId ? (categoryById.get(service.categoryId)?.name || '') : '',
          statusOverviewUptimePercent: service ? service.statusOverviewUptimePercent || 0 : 0
        };
      });

    // keyServices: pick up to 5 highest uptime services
    const keyServices = services
      .slice()
      .sort((a, b) => {
        const ua = typeof a.statusOverviewUptimePercent === 'number' ? a.statusOverviewUptimePercent : 0;
        const ub = typeof b.statusOverviewUptimePercent === 'number' ? b.statusOverviewUptimePercent : 0;
        return ub - ua;
      })
      .slice(0, 5)
      .map(service => ({
        service,
        categoryName: service.categoryId ? (categoryById.get(service.categoryId)?.name || '') : '',
        statusOverviewUptimePercent: service.statusOverviewUptimePercent || 0
      }));

    // criticalAlerts: severity === 'critical' and isEnabled
    const criticalAlerts = alertRules
      .filter(r => r.severity === 'critical' && r.isEnabled)
      .map(alertRule => ({
        alertRule,
        service: serviceById.get(alertRule.serviceId) || null
      }));

    return {
      overallStatus,
      overallUptimeSummary,
      pinnedServices,
      keyServices,
      criticalAlerts
    };
  }

  // searchServices(query, filters, limit, offset)
  searchServices(query, filters, limit, offset) {
    const services = this._getFromStorage('services');
    const categories = this._getFromStorage('service_categories');
    const uptimeStats = this._getFromStorage('service_uptime_stats');

    const categoryById = new Map(categories.map(c => [c.id, c]));
    const q = (query || '').toLowerCase();
    const limitVal = typeof limit === 'number' ? limit : 20;
    const offsetVal = typeof offset === 'number' ? offset : 0;

    let filtered = services.slice();

    if (q) {
      filtered = filtered.filter(s => {
        const name = (s.name || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    if (filters && filters.categoryId) {
      filtered = filtered.filter(s => s.categoryId === filters.categoryId);
    }

    if (filters && filters.status) {
      filtered = filtered.filter(s => s.currentStatus === filters.status);
    }

    const totalCount = filtered.length;

    const results = filtered
      .slice(offsetVal, offsetVal + limitVal)
      .map(service => {
        const stats = uptimeStats.filter(st => st.serviceId === service.id);
        const stat7 = stats.find(st => st.dateRangePreset === 'last_7_days');
        const stat30 = stats.find(st => st.dateRangePreset === 'last_30_days');
        return {
          service,
          categoryName: service.categoryId ? (categoryById.get(service.categoryId)?.name || '') : '',
          uptimeSummary: {
            last_7_days: stat7 ? stat7.uptimePercent : 0,
            last_30_days: stat30 ? stat30.uptimePercent : 0
          }
        };
      });

    return { results, totalCount };
  }

  // getStatusOverview(categoryId, uptimeFilter, sortBy, sortDirection)
  getStatusOverview(categoryId, uptimeFilter, sortBy, sortDirection) {
    const services = this._getFromStorage('services');
    const categories = this._getFromStorage('service_categories');
    const pinned = this._getFromStorage('status_pinned_services');

    const categoryById = new Map(categories.map(c => [c.id, c]));
    const pinnedByServiceId = new Map(
      pinned
        .filter(p => p.pinContext === 'status_overview')
        .map(p => [p.serviceId, p])
    );

    const mode = uptimeFilter && uptimeFilter.mode ? uptimeFilter.mode : 'none';
    const threshold = uptimeFilter ? uptimeFilter.thresholdPercent : undefined;
    const minPercent = uptimeFilter ? uptimeFilter.minPercent : undefined;
    const maxPercent = uptimeFilter ? uptimeFilter.maxPercent : undefined;

    const matchesUptimeFilter = svc => {
      const value = typeof svc.statusOverviewUptimePercent === 'number'
        ? svc.statusOverviewUptimePercent
        : null;

      if (mode === 'none' || mode === undefined) return true;
      if (value === null) return false;

      if (mode === 'below_threshold' && typeof threshold === 'number') {
        return value < threshold;
      }
      if (mode === 'above_threshold' && typeof threshold === 'number') {
        return value > threshold;
      }
      if (mode === 'between' && typeof minPercent === 'number' && typeof maxPercent === 'number') {
        return value >= minPercent && value <= maxPercent;
      }
      return true;
    };

    let filtered = services.slice();

    if (categoryId) {
      filtered = filtered.filter(s => s.categoryId === categoryId);
    }

    filtered = filtered.filter(matchesUptimeFilter);

    const sortField = sortBy || 'service_name';
    const sortDir = sortDirection === 'desc' ? 'desc' : 'asc';
    const dirFactor = sortDir === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      if (sortField === 'uptime') {
        const ua = typeof a.statusOverviewUptimePercent === 'number' ? a.statusOverviewUptimePercent : 0;
        const ub = typeof b.statusOverviewUptimePercent === 'number' ? b.statusOverviewUptimePercent : 0;
        return (ua - ub) * dirFactor;
      }
      if (sortField === 'status') {
        const sa = (a.currentStatus || '').localeCompare(b.currentStatus || '');
        return sa * dirFactor;
      }
      // default: service_name
      const na = (a.name || '').toLowerCase();
      const nb = (b.name || '').toLowerCase();
      if (na < nb) return -1 * dirFactor;
      if (na > nb) return 1 * dirFactor;
      return 0;
    });

    const servicesResult = filtered.map(service => ({
      service,
      categoryName: service.categoryId ? (categoryById.get(service.categoryId)?.name || '') : '',
      statusOverviewUptimePercent: service.statusOverviewUptimePercent || 0,
      isPinned: pinnedByServiceId.has(service.id)
    }));

    const pinnedServices = servicesResult
      .filter(row => row.isPinned)
      .map(row => ({
        statusPinnedService: pinnedByServiceId.get(row.service.id) || null,
        service: row.service,
        categoryName: row.categoryName,
        statusOverviewUptimePercent: row.statusOverviewUptimePercent
      }));

    return {
      pinnedServices,
      services: servicesResult,
      appliedFilters: {
        categoryId: categoryId || null,
        uptimeFilter: {
          mode: mode || 'none',
          thresholdPercent: threshold,
          minPercent,
          maxPercent
        },
        sortBy: sortField,
        sortDirection: sortDir
      }
    };
  }

  // pinStatusOverviewService(serviceId)
  pinStatusOverviewService(serviceId) {
    const services = this._getFromStorage('services');
    const pinned = this._getFromStorage('status_pinned_services');

    const service = services.find(s => s.id === serviceId) || null;
    if (!service) {
      return { success: false, statusPinnedService: null, service: null, totalPinnedCount: pinned.length };
    }

    let existing = pinned.find(p => p.serviceId === serviceId && p.pinContext === 'status_overview');
    if (!existing) {
      existing = {
        id: this._generateId('statuspin'),
        serviceId,
        pinContext: 'status_overview',
        pinnedAt: this._nowIso()
      };
      pinned.push(existing);
      this._saveToStorage('status_pinned_services', pinned);
    }

    const totalPinnedCount = pinned.filter(p => p.pinContext === 'status_overview').length;

    return {
      success: true,
      statusPinnedService: existing,
      service,
      totalPinnedCount
    };
  }

  // unpinStatusOverviewService(serviceId)
  unpinStatusOverviewService(serviceId) {
    const pinned = this._getFromStorage('status_pinned_services');
    const remaining = pinned.filter(p => !(p.serviceId === serviceId && p.pinContext === 'status_overview'));
    this._saveToStorage('status_pinned_services', remaining);
    const totalPinnedCount = remaining.filter(p => p.pinContext === 'status_overview').length;
    return { success: true, totalPinnedCount };
  }

  // getReliabilityTable(dateRangePreset, customStart, customEnd, categoryId, tagLabel, sortBy, sortDirection)
  getReliabilityTable(dateRangePreset, customStart, customEnd, categoryId, tagLabel, sortBy, sortDirection) {
    const services = this._getFromStorage('services');
    const categories = this._getFromStorage('service_categories');
    const uptimeStats = this._getFromStorage('service_uptime_stats');
    const tagsAll = this._getFromStorage('service_tag_assignments');

    const categoryById = new Map(categories.map(c => [c.id, c]));

    // For each service, pick the latest stat for the given preset
    const statsByServiceId = new Map();
    const statsForPreset = uptimeStats.filter(s => s.dateRangePreset === dateRangePreset);

    statsForPreset.forEach(stat => {
      const existing = statsByServiceId.get(stat.serviceId);
      if (!existing) {
        statsByServiceId.set(stat.serviceId, stat);
      } else {
        const existingEnd = existing.periodEnd ? new Date(existing.periodEnd).getTime() : 0;
        const newEnd = stat.periodEnd ? new Date(stat.periodEnd).getTime() : 0;
        if (newEnd > existingEnd) {
          statsByServiceId.set(stat.serviceId, stat);
        }
      }
    });

    let rows = services
      .filter(s => statsByServiceId.has(s.id))
      .map(service => {
        const uptimeStat = statsByServiceId.get(service.id);
        const serviceTags = tagsAll.filter(t => t.serviceId === service.id);
        return {
          service,
          uptimeStat,
          categoryName: service.categoryId ? (categoryById.get(service.categoryId)?.name || '') : '',
          tags: serviceTags
        };
      });

    if (categoryId) {
      rows = rows.filter(r => r.service.categoryId === categoryId);
    }

    if (tagLabel) {
      rows = rows.filter(r => r.tags.some(t => t.label === tagLabel));
    }

    const sortField = sortBy || 'uptime_percent';
    const sortDir = sortDirection === 'desc' ? 'desc' : 'asc';
    const dirFactor = sortDir === 'asc' ? 1 : -1;

    rows.sort((a, b) => {
      if (sortField === 'service_name') {
        const na = (a.service.name || '').toLowerCase();
        const nb = (b.service.name || '').toLowerCase();
        if (na < nb) return -1 * dirFactor;
        if (na > nb) return 1 * dirFactor;
        return 0;
      }
      // default: uptime_percent
      const ua = a.uptimeStat?.uptimePercent || 0;
      const ub = b.uptimeStat?.uptimePercent || 0;
      return (ua - ub) * dirFactor;
    });

    const dateRange = this._computeDateRangeFromPreset(dateRangePreset, customStart, customEnd);

    return {
      rows,
      dateRange
    };
  }

  // getServiceOverview(serviceId)
  getServiceOverview(serviceId) {
    const services = this._getFromStorage('services');
    const uptimeStats = this._getFromStorage('service_uptime_stats');
    const regionPrefs = this._getFromStorage('service_region_preferences');
    const regions = this._getFromStorage('regions');
    const tags = this._getFromStorage('service_tag_assignments');
    const watchlists = this._getFromStorage('watchlists');
    const watchlistItems = this._getFromStorage('watchlist_items');

    const service = services.find(s => s.id === serviceId) || null;

    // recent uptime stats for this service
    const recentUptimeStats = uptimeStats.filter(s => s.serviceId === serviceId);

    // current preferred region: pick latest setAsPreferredAt
    const prefsForService = regionPrefs.filter(p => p.serviceId === serviceId);
    let currentPreferredRegion = null;
    if (prefsForService.length > 0) {
      prefsForService.sort((a, b) => {
        const ta = new Date(a.setAsPreferredAt).getTime();
        const tb = new Date(b.setAsPreferredAt).getTime();
        return tb - ta;
      });
      const pref = prefsForService[0];
      const region = regions.find(r => r.id === pref.regionId) || null;
      currentPreferredRegion = {
        region,
        setAsPreferredAt: pref.setAsPreferredAt
      };
    }

    const tagsForService = tags.filter(t => t.serviceId === serviceId);

    const watchlistMemberships = watchlistItems
      .filter(item => item.serviceId === serviceId)
      .map(item => {
        const watchlist = watchlists.find(w => w.id === item.watchlistId) || null;
        return {
          watchlist,
          addedAt: item.addedAt
        };
      });

    return {
      service,
      latestStatusOverviewUptimePercent: service ? service.statusOverviewUptimePercent || 0 : 0,
      recentUptimeStats,
      currentPreferredRegion,
      tags: tagsForService,
      watchlistMemberships
    };
  }

  // getServicePerformanceByRegion(serviceId, dateRangePreset, customStart, customEnd, sortBy, sortDirection)
  getServicePerformanceByRegion(serviceId, dateRangePreset, customStart, customEnd, sortBy, sortDirection) {
    const performances = this._getFromStorage('service_region_performances');
    const regions = this._getFromStorage('regions');
    const prefs = this._getFromStorage('service_region_preferences');

    const perfFiltered = performances.filter(p => p.serviceId === serviceId && p.dateRangePreset === dateRangePreset);

    // Determine current preferred region (latest preference)
    const prefsForService = prefs.filter(p => p.serviceId === serviceId);
    let preferredRegionId = null;
    if (prefsForService.length > 0) {
      prefsForService.sort((a, b) => new Date(b.setAsPreferredAt).getTime() - new Date(a.setAsPreferredAt).getTime());
      preferredRegionId = prefsForService[0].regionId;
    }

    let rows = perfFiltered.map(perf => ({
      region: regions.find(r => r.id === perf.regionId) || null,
      performance: perf,
      isPreferred: preferredRegionId === perf.regionId
    }));

    const sortField = sortBy || 'avg_response_time_ms';
    const sortDir = sortDirection === 'desc' ? 'desc' : 'asc';
    const dirFactor = sortDir === 'asc' ? 1 : -1;

    rows.sort((a, b) => {
      if (sortField === 'p95_response_time_ms') {
        const pa = a.performance.p95ResponseTimeMs || 0;
        const pb = b.performance.p95ResponseTimeMs || 0;
        return (pa - pb) * dirFactor;
      }
      // default avg_response_time_ms
      const aa = a.performance.avgResponseTimeMs || 0;
      const ab = b.performance.avgResponseTimeMs || 0;
      return (aa - ab) * dirFactor;
    });

    const dateRange = this._computeDateRangeFromPreset(dateRangePreset, customStart, customEnd);

    return {
      rows,
      dateRange
    };
  }

  // setServicePreferredRegion(serviceId, regionId)
  setServicePreferredRegion(serviceId, regionId) {
    const prefs = this._getFromStorage('service_region_preferences');
    const now = this._nowIso();
    const pref = {
      id: this._generateId('svc_region_pref'),
      serviceId,
      regionId,
      setAsPreferredAt: now
    };
    prefs.push(pref);
    this._saveToStorage('service_region_preferences', prefs);
    return { success: true, serviceRegionPreference: pref };
  }

  // addServiceToNewWatchlist(serviceId, watchlistName, description)
  addServiceToNewWatchlist(serviceId, watchlistName, description) {
    const watchlists = this._getFromStorage('watchlists');
    const items = this._getFromStorage('watchlist_items');
    const now = this._nowIso();

    const watchlist = {
      id: this._generateId('watchlist'),
      name: watchlistName,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };

    watchlists.push(watchlist);

    const watchlistItem = {
      id: this._generateId('watchlist_item'),
      watchlistId: watchlist.id,
      serviceId,
      addedAt: now
    };

    items.push(watchlistItem);

    this._saveToStorage('watchlists', watchlists);
    this._saveToStorage('watchlist_items', items);

    return {
      success: true,
      watchlist,
      watchlistItem,
      message: 'Watchlist created and service added.'
    };
  }

  // getServiceComparison(primaryServiceId, secondaryServiceId, dateRangePreset, customStart, customEnd)
  getServiceComparison(primaryServiceId, secondaryServiceId, dateRangePreset, customStart, customEnd) {
    const services = this._getFromStorage('services');
    const uptimeStats = this._getFromStorage('service_uptime_stats');
    const incidents = this._getFromStorage('incidents');

    const primaryService = services.find(s => s.id === primaryServiceId) || null;
    const secondaryService = services.find(s => s.id === secondaryServiceId) || null;

    const statsForPreset = uptimeStats.filter(s => s.dateRangePreset === dateRangePreset);

    const pickLatestStat = (serviceId) => {
      const stats = statsForPreset.filter(s => s.serviceId === serviceId);
      if (stats.length === 0) return null;
      stats.sort((a, b) => {
        const ea = a.periodEnd ? new Date(a.periodEnd).getTime() : 0;
        const eb = b.periodEnd ? new Date(b.periodEnd).getTime() : 0;
        return eb - ea;
      });
      return stats[0];
    };

    const primaryStat = pickLatestStat(primaryServiceId);
    const secondaryStat = pickLatestStat(secondaryServiceId);

    const { periodStart, periodEnd } = this._computeDateRangeFromPreset(dateRangePreset, customStart, customEnd);

    const primaryIncidents = this._applyIncidentFilters(incidents, {
      dateRangePreset,
      customStart: periodStart,
      customEnd: periodEnd,
      serviceId: primaryServiceId
    });

    const secondaryIncidents = this._applyIncidentFilters(incidents, {
      dateRangePreset,
      customStart: periodStart,
      customEnd: periodEnd,
      serviceId: secondaryServiceId
    });

    const sumDowntime = (stat, incidentList) => {
      if (stat && typeof stat.totalDowntimeMinutes === 'number') {
        return stat.totalDowntimeMinutes;
      }
      // fallback: sum incidents durations
      return incidentList.reduce((acc, inc) => {
        if (!inc.endedAt) return acc;
        const start = new Date(inc.startedAt).getTime();
        const end = new Date(inc.endedAt).getTime();
        const mins = (end - start) / (60 * 1000);
        return acc + (mins > 0 ? mins : 0);
      }, 0);
    };

    const primaryDowntime = sumDowntime(primaryStat, primaryIncidents);
    const secondaryDowntime = sumDowntime(secondaryStat, secondaryIncidents);

    let moreReliableServiceId = null;
    let isTie = false;

    if (primaryDowntime < secondaryDowntime) {
      moreReliableServiceId = primaryServiceId;
      isTie = false;
    } else if (secondaryDowntime < primaryDowntime) {
      moreReliableServiceId = secondaryServiceId;
      isTie = false;
    } else {
      // Tie on downtime: try to break tie using uptime percentages or fall back to a stable choice
      const getUptimeScore = (serviceId, stat, service) => {
        if (stat && typeof stat.uptimePercent === 'number') {
          return stat.uptimePercent;
        }
        const svc = service || services.find(s => s.id === serviceId) || null;
        if (svc && typeof svc.statusOverviewUptimePercent === 'number') {
          return svc.statusOverviewUptimePercent;
        }
        return null;
      };

      const primaryUptime = getUptimeScore(primaryServiceId, primaryStat, primaryService);
      const secondaryUptime = getUptimeScore(secondaryServiceId, secondaryStat, secondaryService);

      if (primaryUptime != null || secondaryUptime != null) {
        const a = primaryUptime != null ? primaryUptime : -Infinity;
        const b = secondaryUptime != null ? secondaryUptime : -Infinity;
        if (a > b) {
          moreReliableServiceId = primaryServiceId;
          isTie = false;
        } else if (b > a) {
          moreReliableServiceId = secondaryServiceId;
          isTie = false;
        } else {
          moreReliableServiceId = primaryServiceId || secondaryServiceId || null;
          isTie = moreReliableServiceId === null;
        }
      } else {
        moreReliableServiceId = primaryServiceId || secondaryServiceId || null;
        isTie = moreReliableServiceId === null;
      }
    }

    return {
      primary: {
        service: primaryService,
        uptimeStat: primaryStat,
        incidentSummary: {
          incidentCount: primaryIncidents.length,
          totalDowntimeMinutes: primaryDowntime
        }
      },
      secondary: {
        service: secondaryService,
        uptimeStat: secondaryStat,
        incidentSummary: {
          incidentCount: secondaryIncidents.length,
          totalDowntimeMinutes: secondaryDowntime
        }
      },
      moreReliableServiceId,
      isTie
    };
  }

  // addTagToServiceFromComparison(serviceId, label)
  addTagToServiceFromComparison(serviceId, label) {
    const tags = this._getFromStorage('service_tag_assignments');
    const now = this._nowIso();

    const tag = {
      id: this._generateId('service_tag'),
      serviceId,
      label,
      source: 'comparison_tool',
      createdAt: now
    };

    tags.push(tag);
    this._saveToStorage('service_tag_assignments', tags);

    return { success: true, serviceTagAssignment: tag };
  }

  // getMaintenanceOverview(statusFilter, dateRangePreset, customStart, customEnd, serviceId)
  getMaintenanceOverview(statusFilter, dateRangePreset, customStart, customEnd, serviceId) {
    const windows = this._getFromStorage('maintenance_windows');
    const services = this._getFromStorage('services');

    let filtered = windows.slice();

    if (Array.isArray(statusFilter) && statusFilter.length > 0) {
      const allowed = new Set(statusFilter);
      filtered = filtered.filter(w => allowed.has(w.status));
    }

    if (serviceId) {
      filtered = filtered.filter(w => w.serviceId === serviceId);
    }

    if (dateRangePreset) {
      const { periodStart, periodEnd } = this._computeDateRangeFromPreset(dateRangePreset, customStart, customEnd);
      const startTime = new Date(periodStart).getTime();
      const endTime = new Date(periodEnd).getTime();
      filtered = filtered.filter(w => {
        const st = new Date(w.startTime).getTime();
        return st >= startTime && st <= endTime;
      });
    }

    const result = filtered.map(w => {
      let service = services.find(s => s.id === w.serviceId) || null;
      if (!service) {
        service = {
          id: w.serviceId
        };
      }
      return {
        maintenanceWindow: w,
        service
      };
    });

    return { maintenanceWindows: result };
  }

  // scheduleMaintenanceWindow(serviceId, title, description, impactLevel, startTime, durationMinutes)
  scheduleMaintenanceWindow(serviceId, title, description, impactLevel, startTime, durationMinutes) {
    const windows = this._getFromStorage('maintenance_windows');
    const now = this._nowIso();

    const endTime = this._computeMaintenanceEndTime(startTime, durationMinutes);

    const windowObj = {
      id: this._generateId('maint'),
      serviceId,
      title,
      description: description || '',
      impactLevel,
      startTime,
      endTime,
      durationMinutes,
      status: 'scheduled',
      createdAt: now,
      updatedAt: now
    };

    windows.push(windowObj);
    this._saveToStorage('maintenance_windows', windows);

    return {
      success: true,
      maintenanceWindow: windowObj,
      message: 'Maintenance window scheduled.'
    };
  }

  // updateMaintenanceWindowDetails(maintenanceWindowId, title, description, impactLevel, startTime, durationMinutes)
  updateMaintenanceWindowDetails(maintenanceWindowId, title, description, impactLevel, startTime, durationMinutes) {
    const windows = this._getFromStorage('maintenance_windows');
    const idx = windows.findIndex(w => w.id === maintenanceWindowId);
    if (idx === -1) {
      return { success: false, maintenanceWindow: null };
    }

    const windowObj = windows[idx];
    let updated = { ...windowObj };
    let needsEndRecalc = false;

    if (typeof title === 'string') updated.title = title;
    if (typeof description === 'string') updated.description = description;
    if (typeof impactLevel === 'string') updated.impactLevel = impactLevel;
    if (typeof startTime === 'string') {
      updated.startTime = startTime;
      needsEndRecalc = true;
    }
    if (typeof durationMinutes === 'number') {
      updated.durationMinutes = durationMinutes;
      needsEndRecalc = true;
    }

    if (needsEndRecalc) {
      updated.endTime = this._computeMaintenanceEndTime(
        updated.startTime,
        updated.durationMinutes
      );
    }

    updated.updatedAt = this._nowIso();
    windows[idx] = updated;
    this._saveToStorage('maintenance_windows', windows);

    return { success: true, maintenanceWindow: updated };
  }

  // cancelMaintenanceWindow(maintenanceWindowId, reason)
  cancelMaintenanceWindow(maintenanceWindowId, reason) {
    const windows = this._getFromStorage('maintenance_windows');
    const idx = windows.findIndex(w => w.id === maintenanceWindowId);
    if (idx === -1) {
      return { success: false, maintenanceWindow: null };
    }

    const windowObj = { ...windows[idx] };
    windowObj.status = 'canceled';
    windowObj.updatedAt = this._nowIso();
    // Optionally append reason to description
    if (reason) {
      const existingDesc = windowObj.description || '';
      windowObj.description = existingDesc
        ? existingDesc + ' | Cancel reason: ' + reason
        : 'Cancel reason: ' + reason;
    }

    windows[idx] = windowObj;
    this._saveToStorage('maintenance_windows', windows);

    return { success: true, maintenanceWindow: windowObj };
  }

  // getAlertRulesList()
  getAlertRulesList() {
    const alertRules = this._getFromStorage('alert_rules');
    const services = this._getFromStorage('services');
    const serviceById = new Map(services.map(s => [s.id, s]));

    const result = alertRules.map(alertRule => ({
      alertRule,
      service: serviceById.get(alertRule.serviceId) || null
    }));

    return { alertRules: result };
  }

  // createAlertRule(serviceId, metricKey, thresholdValue, thresholdUnit, condition, severity, notificationMethods, name, isEnabled)
  createAlertRule(serviceId, metricKey, thresholdValue, thresholdUnit, condition, severity, notificationMethods, name, isEnabled) {
    const rules = this._getFromStorage('alert_rules');
    const now = this._nowIso();

    const rule = {
      id: this._generateId('alert_rule'),
      name: name || null,
      serviceId,
      metricKey,
      thresholdValue,
      thresholdUnit,
      condition,
      severity,
      notificationMethods: Array.isArray(notificationMethods) ? notificationMethods.slice() : [],
      isEnabled: typeof isEnabled === 'boolean' ? isEnabled : true,
      createdAt: now,
      updatedAt: now
    };

    rules.push(rule);
    this._saveToStorage('alert_rules', rules);

    return { success: true, alertRule: rule };
  }

  // updateAlertRuleStatus(alertRuleId, isEnabled)
  updateAlertRuleStatus(alertRuleId, isEnabled) {
    const rules = this._getFromStorage('alert_rules');
    const idx = rules.findIndex(r => r.id === alertRuleId);
    if (idx === -1) return { success: false, alertRule: null };

    const updated = { ...rules[idx], isEnabled: !!isEnabled, updatedAt: this._nowIso() };
    rules[idx] = updated;
    this._saveToStorage('alert_rules', rules);

    return { success: true, alertRule: updated };
  }

  // deleteAlertRule(alertRuleId)
  deleteAlertRule(alertRuleId) {
    const rules = this._getFromStorage('alert_rules');
    const remaining = rules.filter(r => r.id !== alertRuleId);
    const success = remaining.length !== rules.length;
    this._saveToStorage('alert_rules', remaining);
    return { success };
  }

  // getIncidentsList(dateRangePreset, customStart, customEnd, severityList, serviceId, categoryId)
  getIncidentsList(dateRangePreset, customStart, customEnd, severityList, serviceId, categoryId) {
    const incidents = this._getFromStorage('incidents');
    const services = this._getFromStorage('services');
    const categories = this._getFromStorage('service_categories');

    const filtered = this._applyIncidentFilters(incidents, {
      dateRangePreset,
      customStart,
      customEnd,
      severityList,
      serviceId,
      categoryId
    });

    const serviceById = new Map(services.map(s => [s.id, s]));
    const categoryById = new Map(categories.map(c => [c.id, c]));

    const incidentsResult = filtered.map(incident => {
      const svc = serviceById.get(incident.serviceId) || null;
      const categoryName = svc && svc.categoryId ? (categoryById.get(svc.categoryId)?.name || '') : '';
      return {
        incident,
        service: svc,
        categoryName
      };
    });

    const summary = {
      totalCount: incidentsResult.length,
      bySeverity: {
        minor: 0,
        major: 0,
        critical: 0
      }
    };

    incidentsResult.forEach(item => {
      const sev = item.incident.severity;
      if (sev === 'minor' || sev === 'major' || sev === 'critical') {
        summary.bySeverity[sev] = (summary.bySeverity[sev] || 0) + 1;
      }
    });

    return {
      incidents: incidentsResult,
      summary
    };
  }

  // saveIncidentReportFromFilters(name, description, filterDateRangePreset, filterStart, filterEnd, filterSeverityList)
  saveIncidentReportFromFilters(name, description, filterDateRangePreset, filterStart, filterEnd, filterSeverityList) {
    const reports = this._getFromStorage('incident_reports');
    const now = this._nowIso();

    const report = {
      id: this._generateId('incident_report'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now,
      filterDateRangePreset,
      filterStart: filterStart || null,
      filterEnd: filterEnd || null,
      filterSeverityList: Array.isArray(filterSeverityList) ? filterSeverityList.slice() : null,
      filterServiceIds: null,
      filterCategoryIds: null
    };

    reports.push(report);
    this._saveToStorage('incident_reports', reports);

    return { success: true, incidentReport: report };
  }

  // getWatchlistsOverview()
  getWatchlistsOverview() {
    const watchlists = this._getFromStorage('watchlists');
    const items = this._getFromStorage('watchlist_items');

    const countByWatchlist = new Map();
    items.forEach(item => {
      const current = countByWatchlist.get(item.watchlistId) || 0;
      countByWatchlist.set(item.watchlistId, current + 1);
    });

    const result = watchlists.map(watchlist => ({
      watchlist,
      serviceCount: countByWatchlist.get(watchlist.id) || 0
    }));

    return { watchlists: result };
  }

  // getWatchlistDetail(watchlistId)
  getWatchlistDetail(watchlistId) {
    const watchlists = this._getFromStorage('watchlists');
    const items = this._getFromStorage('watchlist_items');
    const services = this._getFromStorage('services');

    const watchlist = watchlists.find(w => w.id === watchlistId) || null;
    const serviceById = new Map(services.map(s => [s.id, s]));

    const itemsForWatchlist = items
      .filter(item => item.watchlistId === watchlistId)
      .map(item => {
        const service = serviceById.get(item.serviceId) || null;
        return {
          watchlistItem: item,
          service,
          statusOverviewUptimePercent: service ? service.statusOverviewUptimePercent || 0 : 0,
          currentStatus: service ? service.currentStatus || 'unknown' : 'unknown'
        };
      });

    return {
      watchlist,
      items: itemsForWatchlist
    };
  }

  // renameWatchlist(watchlistId, newName)
  renameWatchlist(watchlistId, newName) {
    const watchlists = this._getFromStorage('watchlists');
    const idx = watchlists.findIndex(w => w.id === watchlistId);
    if (idx === -1) return { success: false, watchlist: null };

    const updated = { ...watchlists[idx], name: newName, updatedAt: this._nowIso() };
    watchlists[idx] = updated;
    this._saveToStorage('watchlists', watchlists);

    return { success: true, watchlist: updated };
  }

  // deleteWatchlist(watchlistId)
  deleteWatchlist(watchlistId) {
    const watchlists = this._getFromStorage('watchlists');
    const items = this._getFromStorage('watchlist_items');

    const remainingWatchlists = watchlists.filter(w => w.id !== watchlistId);
    const remainingItems = items.filter(i => i.watchlistId !== watchlistId);

    const success = remainingWatchlists.length !== watchlists.length;

    this._saveToStorage('watchlists', remainingWatchlists);
    this._saveToStorage('watchlist_items', remainingItems);

    return { success };
  }

  // addServiceToWatchlist(watchlistId, serviceId)
  addServiceToWatchlist(watchlistId, serviceId) {
    const items = this._getFromStorage('watchlist_items');

    const existing = items.find(i => i.watchlistId === watchlistId && i.serviceId === serviceId);
    if (existing) {
      return { success: true, watchlistItem: existing };
    }

    const now = this._nowIso();
    const item = {
      id: this._generateId('watchlist_item'),
      watchlistId,
      serviceId,
      addedAt: now
    };

    items.push(item);
    this._saveToStorage('watchlist_items', items);

    return { success: true, watchlistItem: item };
  }

  // removeServiceFromWatchlist(watchlistId, serviceId)
  removeServiceFromWatchlist(watchlistId, serviceId) {
    const items = this._getFromStorage('watchlist_items');
    const remaining = items.filter(i => !(i.watchlistId === watchlistId && i.serviceId === serviceId));
    const success = remaining.length !== items.length;
    this._saveToStorage('watchlist_items', remaining);
    return { success };
  }

  // getIncidentReportsList()
  getIncidentReportsList() {
    const reports = this._getFromStorage('incident_reports');
    return { reports };
  }

  // getIncidentReportDetails(reportId)
  getIncidentReportDetails(reportId) {
    const reports = this._getFromStorage('incident_reports');
    const incidentReport = reports.find(r => r.id === reportId) || null;
    return { incidentReport };
  }

  // renameIncidentReport(reportId, newName)
  renameIncidentReport(reportId, newName) {
    const reports = this._getFromStorage('incident_reports');
    const idx = reports.findIndex(r => r.id === reportId);
    if (idx === -1) return { success: false, incidentReport: null };

    const updated = { ...reports[idx], name: newName, updatedAt: this._nowIso() };
    reports[idx] = updated;
    this._saveToStorage('incident_reports', reports);

    return { success: true, incidentReport: updated };
  }

  // deleteIncidentReport(reportId)
  deleteIncidentReport(reportId) {
    const reports = this._getFromStorage('incident_reports');
    const remaining = reports.filter(r => r.id !== reportId);
    const success = remaining.length !== reports.length;
    this._saveToStorage('incident_reports', remaining);
    return { success };
  }

  // getDashboardOverview()
  getDashboardOverview() {
    const dashboard = this._getOrCreateDefaultDashboard();
    const widgets = this._getFromStorage('dashboard_widgets').filter(w => w.dashboardId === dashboard.id);
    const widgetEntries = this._getFromStorage('widget_service_entries');
    const services = this._getFromStorage('services');

    const serviceById = new Map(services.map(s => [s.id, s]));

    const widgetsDetailed = widgets
      .slice()
      .sort((a, b) => (a.positionIndex || 0) - (b.positionIndex || 0))
      .map(widget => {
        const entriesForWidget = widgetEntries
          .filter(e => e.widgetId === widget.id)
          .slice()
          .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

        const servicesDetailed = entriesForWidget.map(entry => ({
          widgetServiceEntry: entry,
          service: serviceById.get(entry.serviceId) || null
        }));

        return {
          widget,
          services: servicesDetailed
        };
      });

    return {
      dashboard,
      widgets: widgetsDetailed
    };
  }

  // addDashboardWidget(widgetType, title, services)
  addDashboardWidget(widgetType, title, services) {
    const dashboard = this._getOrCreateDefaultDashboard();
    const widgets = this._getFromStorage('dashboard_widgets');
    const widgetEntries = this._getFromStorage('widget_service_entries');

    const now = this._nowIso();

    const existingForDashboard = widgets.filter(w => w.dashboardId === dashboard.id);
    const maxPosition = existingForDashboard.reduce((max, w) => (
      typeof w.positionIndex === 'number' && w.positionIndex > max ? w.positionIndex : max
    ), -1);

    let defaultTitle = title;
    if (!defaultTitle) {
      if (widgetType === 'weekly_uptime_summary') defaultTitle = 'Weekly uptime summary';
      else if (widgetType === 'incidents_list') defaultTitle = 'Incidents list';
      else if (widgetType === 'performance_overview') defaultTitle = 'Performance overview';
      else defaultTitle = 'Widget';
    }

    const widget = {
      id: this._generateId('widget'),
      dashboardId: dashboard.id,
      type: widgetType,
      title: defaultTitle,
      positionIndex: maxPosition + 1,
      createdAt: now,
      updatedAt: now
    };

    widgets.push(widget);

    const widgetServiceEntries = [];
    if (Array.isArray(services)) {
      services.forEach((svc, index) => {
        if (!svc || !svc.serviceId) return;
        const entry = {
          id: this._generateId('widget_service'),
          widgetId: widget.id,
          serviceId: svc.serviceId,
          orderIndex: index,
          addedAt: now
        };
        widgetEntries.push(entry);
        widgetServiceEntries.push(entry);
      });
    }

    this._saveToStorage('dashboard_widgets', widgets);
    this._saveToStorage('widget_service_entries', widgetEntries);

    return {
      success: true,
      widget,
      widgetServiceEntries
    };
  }

  // reorderDashboardWidgets(widgetOrder)
  reorderDashboardWidgets(widgetOrder) {
    const widgets = this._getFromStorage('dashboard_widgets');
    const now = this._nowIso();

    if (!Array.isArray(widgetOrder)) {
      return { success: false, widgets };
    }

    const orderMap = new Map();
    widgetOrder.forEach(item => {
      if (item && item.widgetId != null && typeof item.positionIndex === 'number') {
        orderMap.set(item.widgetId, item.positionIndex);
      }
    });

    const updatedWidgets = widgets.map(w => {
      if (orderMap.has(w.id)) {
        return { ...w, positionIndex: orderMap.get(w.id), updatedAt: now };
      }
      return w;
    });

    this._saveToStorage('dashboard_widgets', updatedWidgets);

    return { success: true, widgets: updatedWidgets };
  }

  // reorderWidgetServices(widgetId, orderedServiceIds)
  reorderWidgetServices(widgetId, orderedServiceIds) {
    const entries = this._getFromStorage('widget_service_entries');
    if (!Array.isArray(orderedServiceIds)) {
      return { success: false, widgetServiceEntries: [] };
    }

    const idToIndex = new Map();
    orderedServiceIds.forEach((sid, idx) => {
      idToIndex.set(sid, idx);
    });

    const updatedEntries = entries.map(entry => {
      if (entry.widgetId === widgetId && idToIndex.has(entry.serviceId)) {
        return { ...entry, orderIndex: idToIndex.get(entry.serviceId) };
      }
      return entry;
    });

    this._saveToStorage('widget_service_entries', updatedEntries);

    const forWidget = updatedEntries
      .filter(e => e.widgetId === widgetId)
      .slice()
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    return { success: true, widgetServiceEntries: forWidget };
  }

  // getAboutContent()
  getAboutContent() {
    const defaultValue = {
      title: '',
      version: '',
      body: '',
      featureSections: [],
      contactInfo: {
        supportEmail: '',
        feedbackUrl: ''
      }
    };

    const content = this._getFromStorageObject('about_content', defaultValue);

    // Ensure required fields exist
    return {
      title: typeof content.title === 'string' ? content.title : '',
      version: typeof content.version === 'string' ? content.version : '',
      body: typeof content.body === 'string' ? content.body : '',
      featureSections: Array.isArray(content.featureSections) ? content.featureSections : [],
      contactInfo: content.contactInfo && typeof content.contactInfo === 'object'
        ? {
            supportEmail: content.contactInfo.supportEmail || '',
            feedbackUrl: content.contactInfo.feedbackUrl || ''
          }
        : { supportEmail: '', feedbackUrl: '' }
    };
  }

  // getHelpTopics()
  getHelpTopics() {
    const topics = this._getFromStorageObject('help_topics', []);
    return {
      topics: Array.isArray(topics) ? topics : []
    };
  }

  // getHelpArticle(slug)
  getHelpArticle(slug) {
    const articles = this._getFromStorageObject('help_articles', []);
    if (Array.isArray(articles)) {
      const found = articles.find(a => a.slug === slug) || null;
      if (found) {
        return {
          id: found.id || null,
          slug: found.slug,
          title: found.title || '',
          body: found.body || '',
          relatedTaskIds: Array.isArray(found.relatedTaskIds) ? found.relatedTaskIds : []
        };
      }
    }

    // Not found: return empty article structure with requested slug
    return {
      id: null,
      slug,
      title: '',
      body: '',
      relatedTaskIds: []
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
