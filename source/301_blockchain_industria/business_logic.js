/* localStorage polyfill for Node.js and environments without localStorage */
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

  /* =========================
   * Initialization & Helpers
   * ========================= */

  _initStorage() {
    const keys = [
      'sites',
      'production_lines',
      'machines',
      'dashboards',
      'dashboard_widgets',
      'alert_rules',
      'alerts',
      'metric_readings',
      'devices',
      'blockchain_transactions',
      'auditor_notes',
      'roles',
      'saved_reports',
      'favorites',
      'activity_log',
      'about_content',
      'help_articles',
      'terms_content',
      'privacy_content',
      'single_user_settings'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        if (key === 'about_content') {
          localStorage.setItem(
            key,
            JSON.stringify({
              purpose: '',
              blockchainOverview: '',
              keyFeatures: [],
              architectureSummary: ''
            })
          );
        } else if (key === 'terms_content' || key === 'privacy_content') {
          localStorage.setItem(key, JSON.stringify({ lastUpdated: '', contentHtml: '' }));
        } else if (key === 'single_user_settings') {
          localStorage.setItem(key, JSON.stringify({}));
        } else if (key === 'help_articles') {
          localStorage.setItem(key, JSON.stringify([]));
        } else if (key === 'activity_log') {
          localStorage.setItem(key, JSON.stringify([]));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _indexById(list) {
    const map = {};
    if (Array.isArray(list)) {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item && item.id !== undefined) {
          map[item.id] = item;
        }
      }
    }
    return map;
  }

  _logActivity(type, description) {
    const activities = this._getFromStorage('activity_log', []);
    activities.push({ type, description, timestamp: this._now() });
    this._saveToStorage('activity_log', activities);
  }

  _getSiteById(siteId) {
    const sites = this._getFromStorage('sites', []);
    return sites.find((s) => s.id === siteId) || null;
  }

  _getProductionLineById(lineId) {
    const lines = this._getFromStorage('production_lines', []);
    return lines.find((l) => l.id === lineId) || null;
  }

  _getMachineById(machineId) {
    const machines = this._getFromStorage('machines', []);
    return machines.find((m) => m.id === machineId) || null;
  }

  _getAssetByTypeAndId(assetType, assetId) {
    if (!assetType || !assetId) return { entity: null, label: null };
    if (assetType === 'site') {
      const site = this._getSiteById(assetId);
      return { entity: site, label: site ? site.name : assetId };
    }
    if (assetType === 'production_line') {
      const line = this._getProductionLineById(assetId);
      return { entity: line, label: line ? line.name : assetId };
    }
    if (assetType === 'machine') {
      const machine = this._getMachineById(assetId);
      return { entity: machine, label: machine ? (machine.name || machine.id) : assetId };
    }
    return { entity: null, label: assetId };
  }

  _getAssetLabel(assetType, assetId) {
    return this._getAssetByTypeAndId(assetType, assetId).label;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  /* Helper required by spec: get or create favorites store */
  _getOrCreateFavoritesStore() {
    let favorites = this._getFromStorage('favorites', null);
    if (!Array.isArray(favorites)) {
      favorites = [];
      this._saveToStorage('favorites', favorites);
    }
    return favorites;
  }

  /* Helper: resolve time range preset to absolute timestamps */
  _resolveTimeRangePreset(timeRangePreset, customStart, customEnd) {
    const now = new Date();
    let start;
    let end = now;
    let label = '';
    const preset = timeRangePreset || 'last_24_hours';

    if (preset === 'last_24_hours') {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      label = 'Last 24 hours';
    } else if (preset === 'last_7_days') {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      label = 'Last 7 days';
    } else if (preset === 'last_30_days') {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      label = 'Last 30 days';
    } else if (preset === 'custom') {
      const cs = this._parseDate(customStart) || now;
      const ce = this._parseDate(customEnd) || now;
      start = cs;
      end = ce;
      label = 'Custom';
    } else {
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      label = 'Last 24 hours';
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      label
    };
  }

  /* Helper: map entities to display labels (basic implementation) */
  _mapEntitiesToDisplayLabels(entities, type) {
    if (!Array.isArray(entities)) return [];
    return entities.map((e) => {
      const copy = Object.assign({}, e);
      if (type === 'site') {
        copy.label = e.name;
      } else if (type === 'production_line') {
        copy.label = e.name;
      } else if (type === 'machine') {
        copy.label = e.name || e.id;
      }
      return copy;
    });
  }

  /* Helper: update Role.memberNames when assigning/removing users */
  _updateRoleMemberNames(role, userName, assign) {
    if (!role) return;
    if (!Array.isArray(role.memberNames)) {
      role.memberNames = [];
    }
    const idx = role.memberNames.indexOf(userName);
    if (assign) {
      if (idx === -1) {
        role.memberNames.push(userName);
      }
    } else {
      if (idx !== -1) {
        role.memberNames.splice(idx, 1);
      }
    }
  }

  /* Helper: persist single user settings (placeholder) */
  _persistSingleUserSettings(settings) {
    const current = this._getFromStorage('single_user_settings', {});
    const updated = Object.assign({}, current, settings || {});
    this._saveToStorage('single_user_settings', updated);
    return updated;
  }

  /* =========================
   * Sites, Lines, Machines
   * ========================= */

  listSites() {
    // Returns raw Site objects (no foreign keys to resolve)
    return this._getFromStorage('sites', []);
  }

  listProductionLines(siteId, includeInactive) {
    const lines = this._getFromStorage('production_lines', []);
    const sites = this._getFromStorage('sites', []);
    const siteIndex = this._indexById(sites);

    let filtered = lines;
    if (siteId) {
      filtered = filtered.filter((l) => l.siteId === siteId);
    }
    const includeInactiveFlag = !!includeInactive;
    if (!includeInactiveFlag) {
      filtered = filtered.filter((l) => l.isActive !== false);
    }

    return filtered.map((l) => {
      const site = siteIndex[l.siteId] || null;
      return Object.assign({}, l, {
        siteName: site ? site.name : null,
        site
      });
    });
  }

  listMachines(siteId, productionLineId, searchQuery, onlyActive) {
    const machines = this._getFromStorage('machines', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);

    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);

    const onlyActiveFlag = onlyActive !== false; // default true

    let filtered = machines;
    if (siteId) {
      filtered = filtered.filter((m) => m.siteId === siteId);
    }
    if (productionLineId) {
      filtered = filtered.filter((m) => m.productionLineId === productionLineId);
    }
    if (onlyActiveFlag) {
      filtered = filtered.filter((m) => m.isActive !== false);
    }
    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((m) => {
        return (
          (m.id && m.id.toLowerCase().includes(q)) ||
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.code && m.code.toLowerCase().includes(q))
        );
      });
    }

    return filtered.map((m) => {
      const site = siteIndex[m.siteId] || null;
      const line = m.productionLineId ? lineIndex[m.productionLineId] || null : null;
      return Object.assign({}, m, {
        siteName: site ? site.name : null,
        productionLineName: line ? line.name : null,
        site,
        productionLine: line
      });
    });
  }

  /* =========================
   * Home Overview
   * ========================= */

  getHomeOverview() {
    const alerts = this._getFromStorage('alerts', []);
    const metricReadings = this._getFromStorage('metric_readings', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const machines = this._getFromStorage('machines', []);
    const activities = this._getFromStorage('activity_log', []);

    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);
    const machineIndex = this._indexById(machines);

    // Alerts summary
    const alertsSummary = {
      totalOpen: 0,
      criticalOpen: 0,
      highOpen: 0,
      recentAlerts: []
    };

    const openAlerts = alerts.filter((a) => a.status === 'open');
    alertsSummary.totalOpen = openAlerts.length;
    alertsSummary.criticalOpen = openAlerts.filter((a) => a.severity === 'critical').length;
    alertsSummary.highOpen = openAlerts.filter((a) => a.severity === 'high').length;

    const sortedAlerts = alerts.slice().sort((a, b) => {
      const at = this._parseDate(a.startTime);
      const bt = this._parseDate(b.startTime);
      const av = at ? at.getTime() : 0;
      const bv = bt ? bt.getTime() : 0;
      return bv - av;
    });

    alertsSummary.recentAlerts = sortedAlerts.slice(0, 5).map((a) => {
      const assetInfo = this._getAssetByTypeAndId(a.assetType, a.assetId);
      return {
        alertId: a.id,
        name: a.name,
        severity: a.severity,
        startTime: a.startTime,
        assetLabel: assetInfo.label
      };
    });

    // Energy summary (last 24h)
    const tr24 = this._resolveTimeRangePreset('last_24_hours');
    const start24 = this._parseDate(tr24.start);
    const end24 = this._parseDate(tr24.end);

    const energyReadings = metricReadings.filter((r) => {
      if (r.metricType !== 'energy_kwh') return false;
      const t = this._parseDate(r.timestamp);
      if (!t) return false;
      return t >= start24 && t <= end24;
    });

    let totalKwhLast24h = 0;
    const machineEnergyMap = {};

    for (let i = 0; i < energyReadings.length; i++) {
      const r = energyReadings[i];
      totalKwhLast24h += Number(r.value) || 0;
      if (r.assetType === 'machine') {
        if (!machineEnergyMap[r.assetId]) {
          machineEnergyMap[r.assetId] = { sum: 0, count: 0 };
        }
        machineEnergyMap[r.assetId].sum += Number(r.value) || 0;
        machineEnergyMap[r.assetId].count += 1;
      }
    }

    const energySummary = {
      totalKwhLast24h,
      topConsumers: []
    };

    const machineEnergyArray = Object.keys(machineEnergyMap).map((machineId) => {
      const entry = machineEnergyMap[machineId];
      const m = machineIndex[machineId] || null;
      const site = m ? siteIndex[m.siteId] || null : null;
      return {
        machineId,
        machineName: m ? (m.name || m.id) : machineId,
        siteName: site ? site.name : null,
        averageKwh: entry.count > 0 ? entry.sum / entry.count : 0
      };
    });

    machineEnergyArray.sort((a, b) => b.averageKwh - a.averageKwh);
    energySummary.topConsumers = machineEnergyArray.slice(0, 5);

    // Uptime summary (last 7 days)
    const tr7 = this._resolveTimeRangePreset('last_7_days');
    const start7 = this._parseDate(tr7.start);
    const end7 = this._parseDate(tr7.end);

    const uptimeReadings = metricReadings.filter((r) => {
      if (r.metricType !== 'uptime_percentage') return false;
      if (r.assetType !== 'production_line') return false;
      const t = this._parseDate(r.timestamp);
      if (!t) return false;
      return t >= start7 && t <= end7;
    });

    const lineUptimeMap = {};
    for (let i = 0; i < uptimeReadings.length; i++) {
      const r = uptimeReadings[i];
      if (!lineUptimeMap[r.assetId]) {
        lineUptimeMap[r.assetId] = { sum: 0, count: 0 };
      }
      lineUptimeMap[r.assetId].sum += Number(r.value) || 0;
      lineUptimeMap[r.assetId].count += 1;
    }

    const lineUptimeArray = Object.keys(lineUptimeMap).map((lineId) => {
      const entry = lineUptimeMap[lineId];
      const line = lineIndex[lineId] || null;
      const site = line ? siteIndex[line.siteId] || null : null;
      return {
        productionLineId: lineId,
        productionLineName: line ? line.name : lineId,
        siteName: site ? site.name : null,
        uptimePercentage: entry.count > 0 ? entry.sum / entry.count : 0
      };
    });

    let totalUptime = 0;
    let totalCount = 0;
    for (let i = 0; i < lineUptimeArray.length; i++) {
      totalUptime += lineUptimeArray[i].uptimePercentage;
      totalCount += 1;
    }

    const uptimeSummary = {
      averageUptimeLast7d: totalCount > 0 ? totalUptime / totalCount : 0,
      lowestUptimeLines: []
    };

    const sortedLinesByUptime = lineUptimeArray.slice().sort((a, b) => a.uptimePercentage - b.uptimePercentage);
    uptimeSummary.lowestUptimeLines = sortedLinesByUptime.slice(0, 5);

    // Recent activity (just return last 20 sorted desc)
    const recentActivity = activities
      .slice()
      .sort((a, b) => {
        const at = this._parseDate(a.timestamp);
        const bt = this._parseDate(b.timestamp);
        const av = at ? at.getTime() : 0;
        const bv = bt ? bt.getTime() : 0;
        return bv - av;
      })
      .slice(0, 20);

    return {
      alertsSummary,
      energySummary,
      uptimeSummary,
      recentActivity
    };
  }

  /* =========================
   * Dashboards & Widgets
   * ========================= */

  listDashboards(searchQuery, siteId, productionLineId, timeRangePreset, sort) {
    const dashboards = this._getFromStorage('dashboards', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);

    let filtered = dashboards;

    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((d) => {
        return (
          (d.name && d.name.toLowerCase().includes(q)) ||
          (d.description && d.description.toLowerCase().includes(q))
        );
      });
    }

    if (siteId) {
      filtered = filtered.filter((d) => d.siteId === siteId);
    }
    if (productionLineId) {
      filtered = filtered.filter((d) => d.productionLineId === productionLineId);
    }
    if (timeRangePreset) {
      filtered = filtered.filter((d) => d.timeRangePreset === timeRangePreset);
    }

    let sorted = filtered.slice();
    if (sort && sort.field) {
      const field = sort.field === 'updated_at' ? 'updatedAt' : sort.field === 'created_at' ? 'createdAt' : sort.field;
      const dir = sort.direction === 'asc' ? 1 : -1;
      sorted.sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      });
    }

    const result = sorted.map((d) => {
      const site = d.siteId ? siteIndex[d.siteId] || null : null;
      const line = d.productionLineId ? lineIndex[d.productionLineId] || null : null;
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        siteId: d.siteId,
        siteName: site ? site.name : null,
        productionLineId: d.productionLineId,
        productionLineName: line ? line.name : null,
        timeRangePreset: d.timeRangePreset,
        isArchived: d.isArchived === true,
        updatedAt: d.updatedAt || d.createdAt || null,
        site,
        productionLine: line
      };
    });

    return {
      dashboards: result,
      totalCount: result.length
    };
  }

  getDashboardDetails(dashboardId) {
    const dashboards = this._getFromStorage('dashboards', []);
    const widgets = this._getFromStorage('dashboard_widgets', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const machines = this._getFromStorage('machines', []);

    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);
    const machineIndex = this._indexById(machines);

    const d = dashboards.find((x) => x.id === dashboardId) || null;
    if (!d) {
      return { dashboard: null, widgets: [] };
    }

    const site = d.siteId ? siteIndex[d.siteId] || null : null;
    const line = d.productionLineId ? lineIndex[d.productionLineId] || null : null;

    const dash = {
      id: d.id,
      name: d.name,
      description: d.description,
      siteId: d.siteId,
      siteName: site ? site.name : null,
      productionLineId: d.productionLineId,
      productionLineName: line ? line.name : null,
      timeRangePreset: d.timeRangePreset,
      customStart: d.customStart || null,
      customEnd: d.customEnd || null,
      isArchived: d.isArchived === true,
      site,
      productionLine: line
    };

    const dashWidgets = widgets
      .filter((w) => w.dashboardId === dashboardId)
      .map((w) => {
        let assetEntity = null;
        let assetLabel = null;
        if (w.assetType === 'site') {
          assetEntity = siteIndex[w.assetId] || null;
          assetLabel = assetEntity ? assetEntity.name : w.assetId;
        } else if (w.assetType === 'production_line') {
          assetEntity = lineIndex[w.assetId] || null;
          assetLabel = assetEntity ? assetEntity.name : w.assetId;
        } else if (w.assetType === 'machine') {
          assetEntity = machineIndex[w.assetId] || null;
          assetLabel = assetEntity ? assetEntity.name || assetEntity.id : w.assetId;
        }
        return {
          id: w.id,
          title: w.title,
          widgetType: w.widgetType,
          metricType: w.metricType,
          assetType: w.assetType,
          assetId: w.assetId,
          assetLabel,
          aggregation: w.aggregation,
          useDashboardTimeRange: !!w.useDashboardTimeRange,
          customStart: w.customStart || null,
          customEnd: w.customEnd || null,
          positionRow: w.positionRow,
          positionColumn: w.positionColumn,
          sizeRows: w.sizeRows,
          sizeColumns: w.sizeColumns,
          config: w.config || null,
          dashboard: d,
          asset: assetEntity
        };
      });

    return {
      dashboard: dash,
      widgets: dashWidgets
    };
  }

  getDashboardCreationContext() {
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const linesBySite = {};

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!linesBySite[l.siteId]) {
        linesBySite[l.siteId] = [];
      }
      linesBySite[l.siteId].push({ id: l.id, name: l.name });
    }

    const productionLinesBySite = sites.map((s) => ({
      siteId: s.id,
      siteName: s.name,
      productionLines: linesBySite[s.id] || []
    }));

    return {
      sites: sites.map((s) => ({ id: s.id, name: s.name })),
      productionLinesBySite,
      timeRangePresets: ['last_24_hours', 'last_7_days', 'last_30_days', 'custom']
    };
  }

  createDashboard(name, description, siteId, productionLineId, timeRangePreset, customStart, customEnd) {
    const dashboards = this._getFromStorage('dashboards', []);
    const now = this._now();

    const dashboard = {
      id: this._generateId('dashboard'),
      name,
      description: description || '',
      siteId: siteId || null,
      productionLineId: productionLineId || null,
      timeRangePreset: timeRangePreset || 'last_24_hours',
      customStart: customStart || null,
      customEnd: customEnd || null,
      isArchived: false,
      createdAt: now,
      updatedAt: now
    };

    dashboards.push(dashboard);
    this._saveToStorage('dashboards', dashboards);
    this._logActivity('dashboard_created', 'Dashboard created: ' + name);

    return { dashboardId: dashboard.id, message: 'Dashboard created' };
  }

  updateDashboardMetadata(dashboardId, name, description, siteId, productionLineId) {
    const dashboards = this._getFromStorage('dashboards', []);
    const idx = dashboards.findIndex((d) => d.id === dashboardId);
    if (idx === -1) {
      return { success: false, message: 'Dashboard not found' };
    }
    const d = dashboards[idx];
    if (name !== undefined) d.name = name;
    if (description !== undefined) d.description = description;
    if (siteId !== undefined) d.siteId = siteId;
    if (productionLineId !== undefined) d.productionLineId = productionLineId;
    d.updatedAt = this._now();

    dashboards[idx] = d;
    this._saveToStorage('dashboards', dashboards);
    this._logActivity('dashboard_updated', 'Dashboard updated: ' + d.name);
    return { success: true, message: 'Dashboard updated' };
  }

  updateDashboardTimeRange(dashboardId, timeRangePreset, customStart, customEnd) {
    const dashboards = this._getFromStorage('dashboards', []);
    const idx = dashboards.findIndex((d) => d.id === dashboardId);
    if (idx === -1) {
      return { success: false, message: 'Dashboard not found' };
    }
    const d = dashboards[idx];
    d.timeRangePreset = timeRangePreset || d.timeRangePreset || 'last_24_hours';
    d.customStart = customStart || null;
    d.customEnd = customEnd || null;
    d.updatedAt = this._now();
    dashboards[idx] = d;
    this._saveToStorage('dashboards', dashboards);
    this._logActivity('dashboard_updated', 'Dashboard time range updated: ' + d.name);
    return { success: true, message: 'Dashboard time range updated' };
  }

  addDashboardWidget(
    dashboardId,
    title,
    widgetType,
    metricType,
    assetType,
    assetId,
    aggregation,
    useDashboardTimeRange,
    customStart,
    customEnd,
    layout,
    config
  ) {
    const widgets = this._getFromStorage('dashboard_widgets', []);
    const now = this._now();

    const widget = {
      id: this._generateId('widget'),
      dashboardId,
      title: title || null,
      widgetType,
      metricType,
      assetType,
      assetId,
      aggregation,
      useDashboardTimeRange: !!useDashboardTimeRange,
      customStart: customStart || null,
      customEnd: customEnd || null,
      positionRow: layout && layout.positionRow !== undefined ? layout.positionRow : null,
      positionColumn: layout && layout.positionColumn !== undefined ? layout.positionColumn : null,
      sizeRows: layout && layout.sizeRows !== undefined ? layout.sizeRows : null,
      sizeColumns: layout && layout.sizeColumns !== undefined ? layout.sizeColumns : null,
      config: config || null,
      createdAt: now,
      updatedAt: now
    };

    widgets.push(widget);
    this._saveToStorage('dashboard_widgets', widgets);
    this._logActivity('dashboard_updated', 'Widget added to dashboard: ' + dashboardId);

    return { widgetId: widget.id, message: 'Widget added' };
  }

  updateDashboardWidgetConfig(
    widgetId,
    title,
    metricType,
    aggregation,
    assetType,
    assetId,
    useDashboardTimeRange,
    customStart,
    customEnd,
    config
  ) {
    const widgets = this._getFromStorage('dashboard_widgets', []);
    const idx = widgets.findIndex((w) => w.id === widgetId);
    if (idx === -1) {
      return { success: false, message: 'Widget not found' };
    }
    const w = widgets[idx];
    if (title !== undefined) w.title = title;
    if (metricType !== undefined) w.metricType = metricType;
    if (aggregation !== undefined) w.aggregation = aggregation;
    if (assetType !== undefined) w.assetType = assetType;
    if (assetId !== undefined) w.assetId = assetId;
    if (useDashboardTimeRange !== undefined) w.useDashboardTimeRange = !!useDashboardTimeRange;
    if (customStart !== undefined) w.customStart = customStart;
    if (customEnd !== undefined) w.customEnd = customEnd;
    if (config !== undefined) w.config = config;
    w.updatedAt = this._now();

    widgets[idx] = w;
    this._saveToStorage('dashboard_widgets', widgets);
    this._logActivity('dashboard_updated', 'Widget updated: ' + widgetId);
    return { success: true, message: 'Widget updated' };
  }

  updateDashboardWidgetLayout(widgetId, positionRow, positionColumn, sizeRows, sizeColumns) {
    const widgets = this._getFromStorage('dashboard_widgets', []);
    const idx = widgets.findIndex((w) => w.id === widgetId);
    if (idx === -1) {
      return { success: false };
    }
    const w = widgets[idx];
    if (positionRow !== undefined) w.positionRow = positionRow;
    if (positionColumn !== undefined) w.positionColumn = positionColumn;
    if (sizeRows !== undefined) w.sizeRows = sizeRows;
    if (sizeColumns !== undefined) w.sizeColumns = sizeColumns;
    w.updatedAt = this._now();
    widgets[idx] = w;
    this._saveToStorage('dashboard_widgets', widgets);
    this._logActivity('dashboard_updated', 'Widget layout updated: ' + widgetId);
    return { success: true };
  }

  removeDashboardWidget(widgetId) {
    const widgets = this._getFromStorage('dashboard_widgets', []);
    const newWidgets = widgets.filter((w) => w.id !== widgetId);
    const success = newWidgets.length !== widgets.length;
    this._saveToStorage('dashboard_widgets', newWidgets);
    if (success) {
      this._logActivity('dashboard_updated', 'Widget removed: ' + widgetId);
    }
    return { success };
  }

  saveDashboardConfiguration(dashboardId) {
    const dashboards = this._getFromStorage('dashboards', []);
    const idx = dashboards.findIndex((d) => d.id === dashboardId);
    if (idx === -1) {
      return { success: false, message: 'Dashboard not found', updatedAt: null };
    }
    dashboards[idx].updatedAt = this._now();
    this._saveToStorage('dashboards', dashboards);
    this._logActivity('dashboard_updated', 'Dashboard configuration saved: ' + dashboardId);
    return { success: true, message: 'Dashboard configuration saved', updatedAt: dashboards[idx].updatedAt };
  }

  deleteDashboard(dashboardId, hardDelete) {
    const dashboards = this._getFromStorage('dashboards', []);
    const idx = dashboards.findIndex((d) => d.id === dashboardId);
    if (idx === -1) {
      return { success: false };
    }
    const hard = !!hardDelete;
    if (hard) {
      const newDashboards = dashboards.filter((d) => d.id !== dashboardId);
      this._saveToStorage('dashboards', newDashboards);
      // Also remove related widgets
      const widgets = this._getFromStorage('dashboard_widgets', []);
      const newWidgets = widgets.filter((w) => w.dashboardId !== dashboardId);
      this._saveToStorage('dashboard_widgets', newWidgets);
      this._logActivity('dashboard_deleted', 'Dashboard deleted: ' + dashboardId);
    } else {
      dashboards[idx].isArchived = true;
      dashboards[idx].updatedAt = this._now();
      this._saveToStorage('dashboards', dashboards);
      this._logActivity('dashboard_archived', 'Dashboard archived: ' + dashboardId);
    }
    return { success: true };
  }

  duplicateDashboard(sourceDashboardId, newName) {
    const dashboards = this._getFromStorage('dashboards', []);
    const widgets = this._getFromStorage('dashboard_widgets', []);
    const source = dashboards.find((d) => d.id === sourceDashboardId);
    if (!source) {
      return { newDashboardId: null, message: 'Source dashboard not found' };
    }
    const now = this._now();
    const newDashboardId = this._generateId('dashboard');
    const copy = Object.assign({}, source, {
      id: newDashboardId,
      name: newName || source.name + ' (Copy)',
      createdAt: now,
      updatedAt: now,
      isArchived: false
    });
    dashboards.push(copy);

    const newWidgets = widgets.slice();
    for (let i = 0; i < widgets.length; i++) {
      const w = widgets[i];
      if (w.dashboardId === sourceDashboardId) {
        const wCopy = Object.assign({}, w, {
          id: this._generateId('widget'),
          dashboardId: newDashboardId,
          createdAt: now,
          updatedAt: now
        });
        newWidgets.push(wCopy);
      }
    }
    this._saveToStorage('dashboards', dashboards);
    this._saveToStorage('dashboard_widgets', newWidgets);
    this._logActivity('dashboard_created', 'Dashboard duplicated from ' + sourceDashboardId);

    return { newDashboardId, message: 'Dashboard duplicated' };
  }

  /* =========================
   * Alerts & Alert Rules
   * ========================= */

  getAlertFilterOptions() {
    return {
      alertTypes: ['temperature', 'vibration', 'downtime', 'energy', 'generic'],
      severities: ['low', 'medium', 'high', 'critical'],
      statuses: ['open', 'acknowledged', 'closed'],
      timeRangePresets: ['last_24_hours', 'last_7_days', 'last_30_days', 'custom']
    };
  }

  listAlerts(filters, sort, page, pageSize) {
    const alerts = this._getFromStorage('alerts', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const machines = this._getFromStorage('machines', []);
    const rules = this._getFromStorage('alert_rules', []);

    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);
    const machineIndex = this._indexById(machines);
    const ruleIndex = this._indexById(rules);

    let filtered = alerts;
    const f = filters || {};

    if (f.alertType) {
      filtered = filtered.filter((a) => a.alertType === f.alertType);
    }
    if (f.severity) {
      filtered = filtered.filter((a) => a.severity === f.severity);
    }
    if (f.status) {
      filtered = filtered.filter((a) => a.status === f.status);
    }

    // Site filter considering hierarchy
    if (f.siteId) {
      const siteId = f.siteId;
      filtered = filtered.filter((a) => {
        if (a.assetType === 'site') {
          return a.assetId === siteId;
        }
        if (a.assetType === 'production_line') {
          const line = lineIndex[a.assetId];
          return line && line.siteId === siteId;
        }
        if (a.assetType === 'machine') {
          const m = machineIndex[a.assetId];
          return m && m.siteId === siteId;
        }
        return false;
      });
    }

    // Time range filter
    if (f.timeRangePreset) {
      const tr = this._resolveTimeRangePreset(f.timeRangePreset, f.customStart, f.customEnd);
      const start = this._parseDate(tr.start);
      const end = this._parseDate(tr.end);
      filtered = filtered.filter((a) => {
        const t = this._parseDate(a.startTime);
        if (!t) return false;
        return t >= start && t <= end;
      });
    }

    // Map to enriched alerts for sorting and output
    let enriched = filtered.map((a) => {
      const assetInfo = this._getAssetByTypeAndId(a.assetType, a.assetId);
      const rule = a.ruleId ? ruleIndex[a.ruleId] || null : null;
      return Object.assign({}, a, {
        assetLabel: assetInfo.label,
        asset: assetInfo.entity,
        rule
      });
    });

    // Sorting
    if (sort && sort.field) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      const field = sort.field === 'start_time' ? 'startTime' : sort.field === 'asset_label' ? 'assetLabel' : sort.field;
      enriched = enriched.sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      });
    }

    const totalCount = enriched.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 25;
    const startIndex = (p - 1) * ps;
    const pageItems = enriched.slice(startIndex, startIndex + ps).map((a) => ({
      id: a.id,
      name: a.name,
      alertType: a.alertType,
      severity: a.severity,
      status: a.status,
      assetType: a.assetType,
      assetId: a.assetId,
      assetLabel: a.assetLabel,
      startTime: a.startTime,
      durationMinutes: a.durationMinutes || null,
      asset: a.asset,
      rule: a.rule
    }));

    return {
      alerts: pageItems,
      totalCount
    };
  }

  getAlertDetails(alertId) {
    const alerts = this._getFromStorage('alerts', []);
    const rules = this._getFromStorage('alert_rules', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const machines = this._getFromStorage('machines', []);

    const ruleIndex = this._indexById(rules);
    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);
    const machineIndex = this._indexById(machines);

    const a = alerts.find((x) => x.id === alertId) || null;
    if (!a) {
      return { alert: null };
    }

    let assetEntity = null;
    if (a.assetType === 'site') assetEntity = siteIndex[a.assetId] || null;
    else if (a.assetType === 'production_line') assetEntity = lineIndex[a.assetId] || null;
    else if (a.assetType === 'machine') assetEntity = machineIndex[a.assetId] || null;

    const assetLabel = assetEntity ? assetEntity.name || assetEntity.id : a.assetId;
    const rule = a.ruleId ? ruleIndex[a.ruleId] || null : null;

    const alertDetail = {
      id: a.id,
      name: a.name,
      alertType: a.alertType,
      severity: a.severity,
      status: a.status,
      assetType: a.assetType,
      assetId: a.assetId,
      assetLabel,
      metricType: a.metricType || null,
      thresholdValue: a.thresholdValue || null,
      currentValue: a.currentValue || null,
      unit: a.unit || null,
      durationMinutes: a.durationMinutes || null,
      startTime: a.startTime || null,
      endTime: a.endTime || null,
      acknowledgedAt: a.acknowledgedAt || null,
      acknowledgmentComment: a.acknowledgmentComment || null,
      followUpDate: a.followUpDate || null,
      asset: assetEntity,
      rule
    };

    return { alert: alertDetail };
  }

  acknowledgeAlert(alertId, comment, followUpDate) {
    const alerts = this._getFromStorage('alerts', []);
    const idx = alerts.findIndex((a) => a.id === alertId);
    if (idx === -1) {
      return { success: false, updatedAlert: null };
    }
    const now = this._now();
    const a = alerts[idx];
    a.status = 'acknowledged';
    a.acknowledgedAt = now;
    a.acknowledgmentComment = comment;
    if (followUpDate !== undefined && followUpDate !== null) {
      a.followUpDate = followUpDate;
    }
    a.updatedAt = now;
    alerts[idx] = a;
    this._saveToStorage('alerts', alerts);
    this._logActivity('alert_acknowledged', 'Alert acknowledged: ' + alertId);

    return {
      success: true,
      updatedAlert: {
        id: a.id,
        status: a.status,
        acknowledgedAt: a.acknowledgedAt,
        acknowledgmentComment: a.acknowledgmentComment,
        followUpDate: a.followUpDate || null
      }
    };
  }

  updateAlertStatus(alertId, status) {
    const allowed = ['open', 'acknowledged', 'closed'];
    if (allowed.indexOf(status) === -1) {
      return { success: false };
    }
    const alerts = this._getFromStorage('alerts', []);
    const idx = alerts.findIndex((a) => a.id === alertId);
    if (idx === -1) {
      return { success: false };
    }
    alerts[idx].status = status;
    alerts[idx].updatedAt = this._now();
    this._saveToStorage('alerts', alerts);
    this._logActivity('alert_status_changed', 'Alert status changed: ' + alertId + ' -> ' + status);
    return { success: true };
  }

  listAlertRules(searchQuery, assetType, severity, status) {
    const rules = this._getFromStorage('alert_rules', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const machines = this._getFromStorage('machines', []);

    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);
    const machineIndex = this._indexById(machines);

    let filtered = rules;
    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) => {
        return (
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q))
        );
      });
    }
    if (assetType) {
      filtered = filtered.filter((r) => r.assetType === assetType);
    }
    if (severity) {
      filtered = filtered.filter((r) => r.severity === severity);
    }
    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    return filtered.map((r) => {
      let assetEntity = null;
      if (r.assetType === 'site') assetEntity = siteIndex[r.assetId] || null;
      else if (r.assetType === 'production_line') assetEntity = lineIndex[r.assetId] || null;
      else if (r.assetType === 'machine') assetEntity = machineIndex[r.assetId] || null;
      const assetLabel = assetEntity ? assetEntity.name || assetEntity.id : r.assetId;
      return {
        id: r.id,
        name: r.name,
        assetType: r.assetType,
        assetId: r.assetId,
        assetLabel,
        metricType: r.metricType,
        operator: r.operator,
        thresholdValue: r.thresholdValue,
        thresholdUnit: r.thresholdUnit || null,
        durationMinutes: r.durationMinutes || null,
        severity: r.severity,
        status: r.status,
        asset: assetEntity
      };
    });
  }

  getAlertRuleDetails(alertRuleId) {
    const rules = this._getFromStorage('alert_rules', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const machines = this._getFromStorage('machines', []);

    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);
    const machineIndex = this._indexById(machines);

    const r = rules.find((x) => x.id === alertRuleId) || null;
    if (!r) {
      return { rule: null };
    }

    let assetEntity = null;
    if (r.assetType === 'site') assetEntity = siteIndex[r.assetId] || null;
    else if (r.assetType === 'production_line') assetEntity = lineIndex[r.assetId] || null;
    else if (r.assetType === 'machine') assetEntity = machineIndex[r.assetId] || null;

    const assetLabel = assetEntity ? assetEntity.name || assetEntity.id : r.assetId;

    const ruleDetail = {
      id: r.id,
      name: r.name,
      description: r.description || '',
      assetType: r.assetType,
      assetId: r.assetId,
      assetLabel,
      metricType: r.metricType,
      operator: r.operator,
      thresholdValue: r.thresholdValue,
      thresholdUnit: r.thresholdUnit || null,
      durationMinutes: r.durationMinutes || null,
      severity: r.severity,
      notificationChannels: r.notificationChannels || [],
      scheduleIs24x7: !!r.scheduleIs24x7,
      scheduleDescription: r.scheduleDescription || '',
      status: r.status,
      asset: assetEntity
    };

    return { rule: ruleDetail };
  }

  getAlertRuleCreationContext() {
    const machines = this._getFromStorage('machines', []);
    const machineOptions = machines.map((m) => ({
      id: m.id,
      label: m.name ? m.id + ' - ' + m.name : m.id
    }));
    return {
      machines: machineOptions,
      metricTypes: ['temperature_c', 'vibration_level', 'unplanned_downtime_minutes', 'energy_kwh', 'uptime_percentage'],
      operators: ['greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'equal', 'not_equal'],
      severities: ['low', 'medium', 'high', 'critical'],
      notificationChannels: ['in_app_notification', 'banner']
    };
  }

  createAlertRule(
    name,
    description,
    assetType,
    assetId,
    metricType,
    operator,
    thresholdValue,
    thresholdUnit,
    durationMinutes,
    severity,
    notificationChannels,
    scheduleIs24x7,
    scheduleDescription,
    status
  ) {
    const rules = this._getFromStorage('alert_rules', []);
    const now = this._now();
    const rule = {
      id: this._generateId('alertrule'),
      name,
      description: description || '',
      assetType,
      assetId,
      metricType,
      operator,
      thresholdValue,
      thresholdUnit: thresholdUnit || null,
      durationMinutes: durationMinutes !== undefined ? durationMinutes : null,
      severity,
      notificationChannels: Array.isArray(notificationChannels) ? notificationChannels.slice() : [],
      scheduleIs24x7: !!scheduleIs24x7,
      scheduleDescription: scheduleDescription || '',
      status,
      createdAt: now,
      updatedAt: now
    };
    rules.push(rule);
    this._saveToStorage('alert_rules', rules);
    this._logActivity('alert_rule_created', 'Alert rule created: ' + name);
    return { alertRuleId: rule.id, message: 'Alert rule created' };
  }

  updateAlertRule(alertRuleId, updates) {
    const rules = this._getFromStorage('alert_rules', []);
    const idx = rules.findIndex((r) => r.id === alertRuleId);
    if (idx === -1) {
      return { success: false };
    }
    const r = rules[idx];
    const u = updates || {};
    Object.keys(u).forEach((k) => {
      if (k === 'notificationChannels' && Array.isArray(u[k])) {
        r[k] = u[k].slice();
      } else if (u[k] !== undefined) {
        r[k] = u[k];
      }
    });
    r.updatedAt = this._now();
    rules[idx] = r;
    this._saveToStorage('alert_rules', rules);
    this._logActivity('alert_rule_updated', 'Alert rule updated: ' + alertRuleId);
    return { success: true };
  }

  toggleAlertRuleStatus(alertRuleId, status) {
    const rules = this._getFromStorage('alert_rules', []);
    const idx = rules.findIndex((r) => r.id === alertRuleId);
    if (idx === -1) {
      return { success: false };
    }
    rules[idx].status = status;
    rules[idx].updatedAt = this._now();
    this._saveToStorage('alert_rules', rules);
    this._logActivity('alert_rule_status_changed', 'Alert rule status changed: ' + alertRuleId + ' -> ' + status);
    return { success: true };
  }

  cloneAlertRule(sourceAlertRuleId, newName) {
    const rules = this._getFromStorage('alert_rules', []);
    const source = rules.find((r) => r.id === sourceAlertRuleId);
    if (!source) {
      return { newAlertRuleId: null, message: 'Source alert rule not found' };
    }
    const now = this._now();
    const copy = Object.assign({}, source, {
      id: this._generateId('alertrule'),
      name: newName || source.name + ' (Copy)',
      status: 'disabled',
      createdAt: now,
      updatedAt: now
    });
    rules.push(copy);
    this._saveToStorage('alert_rules', rules);
    this._logActivity('alert_rule_created', 'Alert rule cloned from ' + sourceAlertRuleId);
    return { newAlertRuleId: copy.id, message: 'Alert rule cloned' };
  }

  /* =========================
   * Energy Analytics
   * ========================= */

  getEnergyAnalyticsByMachine(siteId, timeRangePreset, customStart, customEnd, sort) {
    const sites = this._getFromStorage('sites', []);
    const machines = this._getFromStorage('machines', []);
    const lines = this._getFromStorage('production_lines', []);
    const metricReadings = this._getFromStorage('metric_readings', []);

    const site = sites.find((s) => s.id === siteId) || null;
    const siteName = site ? site.name : null;

    const tr = this._resolveTimeRangePreset(timeRangePreset || 'last_24_hours', customStart, customEnd);
    const start = this._parseDate(tr.start);
    const end = this._parseDate(tr.end);

    const siteMachines = machines.filter((m) => m.siteId === siteId);
    const machineIds = siteMachines.map((m) => m.id);

    const energyReadings = metricReadings.filter((r) => {
      if (r.metricType !== 'energy_kwh') return false;
      if (r.assetType !== 'machine') return false;
      if (machineIds.indexOf(r.assetId) === -1) return false;
      const t = this._parseDate(r.timestamp);
      if (!t) return false;
      return t >= start && t <= end;
    });

    const lineIndex = this._indexById(lines);
    const energyMap = {};
    for (let i = 0; i < energyReadings.length; i++) {
      const r = energyReadings[i];
      if (!energyMap[r.assetId]) {
        energyMap[r.assetId] = { sum: 0, count: 0 };
      }
      energyMap[r.assetId].sum += Number(r.value) || 0;
      energyMap[r.assetId].count += 1;
    }

    let machinesResult = siteMachines.map((m) => {
      const entry = energyMap[m.id] || { sum: 0, count: 0 };
      const avg = entry.count > 0 ? entry.sum / entry.count : 0;
      const line = m.productionLineId ? lineIndex[m.productionLineId] || null : null;
      return {
        machineId: m.id,
        machineName: m.name || m.id,
        productionLineName: line ? line.name : null,
        averageKwh: avg,
        machine: m,
        productionLine: line
      };
    });

    if (sort && sort.field) {
      const dir = sort.direction === 'asc' ? 1 : -1;
      const field = sort.field === 'average_kwh' ? 'averageKwh' : sort.field === 'machine_name' ? 'machineName' : sort.field;
      machinesResult = machinesResult.sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      });
    }

    return {
      siteName,
      timeRangeLabel: tr.label,
      machines: machinesResult
    };
  }

  /* =========================
   * Machine Detail
   * ========================= */

  getMachineDetail(machineId) {
    const machines = this._getFromStorage('machines', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const metricReadings = this._getFromStorage('metric_readings', []);
    const alerts = this._getFromStorage('alerts', []);
    const transactions = this._getFromStorage('blockchain_transactions', []);
    const devices = this._getFromStorage('devices', []);
    const favorites = this._getFromStorage('favorites', []);

    const machine = machines.find((m) => m.id === machineId) || null;
    if (!machine) {
      return {
        machine: null,
        metricsSummary: null,
        recentAlerts: [],
        maintenanceTransactions: [],
        devices: []
      };
    }

    const site = sites.find((s) => s.id === machine.siteId) || null;
    const line = machine.productionLineId ? lines.find((l) => l.id === machine.productionLineId) || null : null;
    const isFavorited = favorites.some((f) => f.itemType === 'machine' && f.itemId === machineId);

    const metricsSummary = { temperatureC: null, vibrationLevel: null, energyKwh: null };
    const machineReadings = metricReadings.filter((r) => r.assetType === 'machine' && r.assetId === machineId);

    const latestByType = {};
    for (let i = 0; i < machineReadings.length; i++) {
      const r = machineReadings[i];
      const t = this._parseDate(r.timestamp);
      if (!t) continue;
      if (!latestByType[r.metricType] || this._parseDate(latestByType[r.metricType].timestamp) < t) {
        latestByType[r.metricType] = r;
      }
    }

    if (latestByType.temperature_c) metricsSummary.temperatureC = latestByType.temperature_c.value;
    if (latestByType.vibration_level) metricsSummary.vibrationLevel = latestByType.vibration_level.value;
    if (latestByType.energy_kwh) metricsSummary.energyKwh = latestByType.energy_kwh.value;

    const machineAlerts = alerts
      .filter((a) => a.assetType === 'machine' && a.assetId === machineId)
      .sort((a, b) => {
        const at = this._parseDate(a.startTime);
        const bt = this._parseDate(b.startTime);
        const av = at ? at.getTime() : 0;
        const bv = bt ? bt.getTime() : 0;
        return bv - av;
      })
      .slice(0, 10)
      .map((a) => ({
        alertId: a.id,
        name: a.name,
        severity: a.severity,
        status: a.status,
        startTime: a.startTime
      }));

    const maintenanceTransactions = transactions
      .filter((t) => t.machineId === machineId && t.transactionType === 'maintenance')
      .sort((a, b) => {
        const at = this._parseDate(a.timestamp);
        const bt = this._parseDate(b.timestamp);
        const av = at ? at.getTime() : 0;
        const bv = bt ? bt.getTime() : 0;
        return bv - av;
      })
      .map((t) => ({
        transactionId: t.id,
        transactionHash: t.transactionHash,
        transactionType: t.transactionType,
        timestamp: t.timestamp,
        payloadSummary: t.payloadSummary || ''
      }));

    const machineDevices = devices
      .filter((d) => d.machineId === machineId)
      .map((d) => ({
        deviceId: d.id,
        deviceType: d.deviceType,
        pollingIntervalSeconds: d.pollingIntervalSeconds,
        status: d.status || null
      }));

    return {
      machine: {
        id: machine.id,
        name: machine.name || machine.id,
        siteName: site ? site.name : null,
        productionLineName: line ? line.name : null,
        machineType: machine.machineType || null,
        description: machine.description || '',
        isFavorited,
        site,
        productionLine: line
      },
      metricsSummary,
      recentAlerts: machineAlerts,
      maintenanceTransactions,
      devices: machineDevices
    };
  }

  /* =========================
   * Favorites
   * ========================= */

  pinFavoriteItem(itemType, itemId, label) {
    let favorites = this._getOrCreateFavoritesStore();
    const existing = favorites.find((f) => f.itemType === itemType && f.itemId === itemId);
    if (existing) {
      return {
        favoriteId: existing.id,
        itemType: existing.itemType,
        itemId: existing.itemId,
        label: existing.label
      };
    }

    let computedLabel = label;
    if (!computedLabel) {
      if (itemType === 'machine') {
        const m = this._getMachineById(itemId);
        computedLabel = m ? m.name || m.id : itemId;
      } else if (itemType === 'production_line') {
        const l = this._getProductionLineById(itemId);
        computedLabel = l ? l.name : itemId;
      } else if (itemType === 'dashboard') {
        const dashboards = this._getFromStorage('dashboards', []);
        const d = dashboards.find((x) => x.id === itemId);
        computedLabel = d ? d.name : itemId;
      } else {
        computedLabel = itemId;
      }
    }

    const fav = {
      id: this._generateId('favorite'),
      itemType,
      itemId,
      label: computedLabel,
      createdAt: this._now()
    };

    favorites.push(fav);
    this._saveToStorage('favorites', favorites);
    this._logActivity('favorite_pinned', 'Item favorited: ' + itemType + ' ' + itemId);

    return {
      favoriteId: fav.id,
      itemType: fav.itemType,
      itemId: fav.itemId,
      label: fav.label
    };
  }

  listFavorites() {
    const favorites = this._getFromStorage('favorites', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const machines = this._getFromStorage('machines', []);
    const dashboards = this._getFromStorage('dashboards', []);

    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);
    const machineIndex = this._indexById(machines);
    const dashboardIndex = this._indexById(dashboards);

    const result = {
      machines: [],
      productionLines: [],
      dashboards: []
    };

    for (let i = 0; i < favorites.length; i++) {
      const f = favorites[i];
      if (f.itemType === 'machine') {
        const m = machineIndex[f.itemId] || null;
        const site = m ? siteIndex[m.siteId] || null : null;
        result.machines.push({
          favoriteId: f.id,
          machineId: f.itemId,
          machineName: m ? m.name || m.id : f.label,
          siteName: site ? site.name : null,
          machine: m
        });
      } else if (f.itemType === 'production_line') {
        const l = lineIndex[f.itemId] || null;
        const site = l ? siteIndex[l.siteId] || null : null;
        result.productionLines.push({
          favoriteId: f.id,
          productionLineId: f.itemId,
          productionLineName: l ? l.name : f.label,
          siteName: site ? site.name : null,
          productionLine: l
        });
      } else if (f.itemType === 'dashboard') {
        const d = dashboardIndex[f.itemId] || null;
        result.dashboards.push({
          favoriteId: f.id,
          dashboardId: f.itemId,
          dashboardName: d ? d.name : f.label,
          dashboard: d
        });
      }
    }

    return result;
  }

  unpinFavoriteItem(favoriteId) {
    const favorites = this._getFromStorage('favorites', []);
    const newFavs = favorites.filter((f) => f.id !== favoriteId);
    const success = newFavs.length !== favorites.length;
    this._saveToStorage('favorites', newFavs);
    if (success) {
      this._logActivity('favorite_unpinned', 'Favorite removed: ' + favoriteId);
    }
    return { success };
  }

  /* =========================
   * Uptime Analytics
   * ========================= */

  getUptimeComparison(siteId, productionLineIds, timeRangePreset, customStart, customEnd) {
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const metricReadings = this._getFromStorage('metric_readings', []);

    const site = sites.find((s) => s.id === siteId) || null;
    const siteName = site ? site.name : null;

    const tr = this._resolveTimeRangePreset(timeRangePreset || 'last_7_days', customStart, customEnd);
    const start = this._parseDate(tr.start);
    const end = this._parseDate(tr.end);

    const targetLineIds = Array.isArray(productionLineIds) ? productionLineIds : [];

    const siteLines = lines.filter((l) => l.siteId === siteId && targetLineIds.indexOf(l.id) !== -1);
    const lineIds = siteLines.map((l) => l.id);

    const readings = metricReadings.filter((r) => {
      if (r.metricType !== 'uptime_percentage') return false;
      if (r.assetType !== 'production_line') return false;
      if (lineIds.indexOf(r.assetId) === -1) return false;
      const t = this._parseDate(r.timestamp);
      if (!t) return false;
      return t >= start && t <= end;
    });

    const uptimeMap = {};
    for (let i = 0; i < readings.length; i++) {
      const r = readings[i];
      if (!uptimeMap[r.assetId]) {
        uptimeMap[r.assetId] = { sum: 0, count: 0 };
      }
      uptimeMap[r.assetId].sum += Number(r.value) || 0;
      uptimeMap[r.assetId].count += 1;
    }

    const linesResult = siteLines.map((l) => {
      const entry = uptimeMap[l.id] || { sum: 0, count: 0 };
      const uptime = entry.count > 0 ? entry.sum / entry.count : 0;
      return {
        productionLineId: l.id,
        productionLineName: l.name,
        uptimePercentage: uptime,
        productionLine: l
      };
    });

    return {
      siteName,
      timeRangeLabel: tr.label,
      lines: linesResult
    };
  }

  /* =========================
   * Devices & Sensors
   * ========================= */

  listDevices(filters) {
    const devices = this._getFromStorage('devices', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const machines = this._getFromStorage('machines', []);

    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);
    const machineIndex = this._indexById(machines);

    let filtered = devices;
    const f = filters || {};

    if (f.deviceType) filtered = filtered.filter((d) => d.deviceType === f.deviceType);
    if (f.status) filtered = filtered.filter((d) => d.status === f.status);

    // Hierarchical site filter
    if (f.siteId) {
      const siteId = f.siteId;
      filtered = filtered.filter((d) => {
        if (d.siteId === siteId) return true;
        if (d.machineId) {
          const m = machineIndex[d.machineId];
          if (m && m.siteId === siteId) return true;
        }
        if (d.productionLineId) {
          const l = lineIndex[d.productionLineId];
          if (l && l.siteId === siteId) return true;
        }
        return false;
      });
    }

    if (f.productionLineId) {
      filtered = filtered.filter((d) => d.productionLineId === f.productionLineId);
    }
    if (f.machineId) {
      filtered = filtered.filter((d) => d.machineId === f.machineId);
    }

    return filtered.map((d) => {
      const m = d.machineId ? machineIndex[d.machineId] || null : null;
      const line = d.productionLineId ? lineIndex[d.productionLineId] || null : null;
      let site = d.siteId ? siteIndex[d.siteId] || null : null;
      if (!site && m) site = siteIndex[m.siteId] || null;
      if (!site && line) site = siteIndex[line.siteId] || null;

      return {
        id: d.id,
        name: d.name || d.id,
        deviceType: d.deviceType,
        siteName: site ? site.name : null,
        productionLineName: line ? line.name : null,
        machineId: d.machineId || null,
        machineName: m ? m.name || m.id : null,
        pollingIntervalSeconds: d.pollingIntervalSeconds,
        status: d.status || null,
        lastDataReceivedAt: d.lastDataReceivedAt || null,
        site,
        productionLine: line,
        machine: m
      };
    });
  }

  getDeviceDetails(deviceId) {
    const devices = this._getFromStorage('devices', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const machines = this._getFromStorage('machines', []);

    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);
    const machineIndex = this._indexById(machines);

    const d = devices.find((x) => x.id === deviceId) || null;
    if (!d) {
      return { device: null };
    }

    const m = d.machineId ? machineIndex[d.machineId] || null : null;
    const line = d.productionLineId ? lineIndex[d.productionLineId] || null : null;
    let site = d.siteId ? siteIndex[d.siteId] || null : null;
    if (!site && m) site = siteIndex[m.siteId] || null;
    if (!site && line) site = siteIndex[line.siteId] || null;

    return {
      device: {
        id: d.id,
        name: d.name || d.id,
        deviceType: d.deviceType,
        siteId: site ? site.id : d.siteId || null,
        siteName: site ? site.name : null,
        productionLineId: line ? line.id : d.productionLineId || null,
        productionLineName: line ? line.name : null,
        machineId: m ? m.id : d.machineId || null,
        machineName: m ? m.name || m.id : null,
        pollingIntervalSeconds: d.pollingIntervalSeconds,
        status: d.status || null,
        lastDataReceivedAt: d.lastDataReceivedAt || null,
        site,
        productionLine: line,
        machine: m
      }
    };
  }

  getDeviceCreationContext() {
    const deviceTypes = ['vibration', 'temperature', 'energy', 'generic'];
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const machines = this._getFromStorage('machines', []);

    const linesBySite = {};
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!linesBySite[l.siteId]) linesBySite[l.siteId] = [];
      linesBySite[l.siteId].push({ id: l.id, name: l.name });
    }

    const productionLinesBySite = sites.map((s) => ({
      siteId: s.id,
      siteName: s.name,
      productionLines: linesBySite[s.id] || []
    }));

    const machineOptions = machines.map((m) => ({
      id: m.id,
      label: m.name ? m.id + ' - ' + m.name : m.id
    }));

    return {
      deviceTypes,
      sites: sites.map((s) => ({ id: s.id, name: s.name })),
      productionLinesBySite,
      machines: machineOptions
    };
  }

  registerDevice(deviceId, name, deviceType, siteId, productionLineId, machineId, pollingIntervalSeconds) {
    const devices = this._getFromStorage('devices', []);
    const now = this._now();
    const idx = devices.findIndex((d) => d.id === deviceId);

    if (idx !== -1) {
      const d = devices[idx];
      d.name = name || d.name;
      d.deviceType = deviceType || d.deviceType;
      d.siteId = siteId || d.siteId || null;
      d.productionLineId = productionLineId || d.productionLineId || null;
      d.machineId = machineId || d.machineId || null;
      if (pollingIntervalSeconds !== undefined && pollingIntervalSeconds !== null) {
        d.pollingIntervalSeconds = pollingIntervalSeconds;
      }
      d.updatedAt = now;
      devices[idx] = d;
      this._saveToStorage('devices', devices);
      this._logActivity('device_updated', 'Device updated: ' + deviceId);
      return { deviceId: deviceId, message: 'Device updated' };
    }

    const device = {
      id: deviceId,
      name: name || deviceId,
      deviceType,
      siteId: siteId || null,
      productionLineId: productionLineId || null,
      machineId: machineId || null,
      pollingIntervalSeconds,
      status: 'online',
      lastDataReceivedAt: null,
      createdAt: now,
      updatedAt: now
    };
    devices.push(device);
    this._saveToStorage('devices', devices);
    this._logActivity('device_registered', 'Device registered: ' + deviceId);
    return { deviceId: device.id, message: 'Device registered' };
  }

  updateDevice(deviceId, updates) {
    const devices = this._getFromStorage('devices', []);
    const idx = devices.findIndex((d) => d.id === deviceId);
    if (idx === -1) {
      return { success: false };
    }
    const d = devices[idx];
    const u = updates || {};
    Object.keys(u).forEach((k) => {
      if (u[k] !== undefined) {
        d[k] = u[k];
      }
    });
    d.updatedAt = this._now();
    devices[idx] = d;
    this._saveToStorage('devices', devices);
    this._logActivity('device_updated', 'Device updated: ' + deviceId);
    return { success: true };
  }

  /* =========================
   * Blockchain Ledger & Auditor Notes
   * ========================= */

  listBlockchainTransactions(filters, sort, page, pageSize) {
    const transactions = this._getFromStorage('blockchain_transactions', []);
    const machines = this._getFromStorage('machines', []);
    const machineIndex = this._indexById(machines);

    const f = filters || {};
    let filtered = transactions;

    if (f.machineId) {
      filtered = filtered.filter((t) => t.machineId === f.machineId);
    }
    if (f.transactionType) {
      filtered = filtered.filter((t) => t.transactionType === f.transactionType);
    }
    if (f.dateStart || f.dateEnd) {
      const start = this._parseDate(f.dateStart) || new Date(0);
      const end = this._parseDate(f.dateEnd) || new Date();
      filtered = filtered.filter((t) => {
        const ts = this._parseDate(t.timestamp);
        if (!ts) return false;
        return ts >= start && ts <= end;
      });
    }

    let enriched = filtered.map((t) => {
      const m = machineIndex[t.machineId] || null;
      return {
        id: t.id,
        transactionHash: t.transactionHash,
        machineId: t.machineId,
        machineLabel: m ? m.name || m.id : t.machineId,
        transactionType: t.transactionType,
        timestamp: t.timestamp,
        payloadSummary: t.payloadSummary || '',
        confirmations: t.confirmations || 0,
        machine: m
      };
    });

    if (sort && sort.field) {
      const field = sort.field;
      const dir = sort.direction === 'asc' ? 1 : -1;
      enriched = enriched.sort((a, b) => {
        const av = a[field];
        const bv = b[field];
        if (av === bv) return 0;
        return av > bv ? dir : -dir;
      });
    }

    const totalCount = enriched.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 25;
    const startIndex = (p - 1) * ps;
    const pageItems = enriched.slice(startIndex, startIndex + ps);

    return {
      transactions: pageItems,
      totalCount
    };
  }

  getBlockchainTransactionDetails(transactionId) {
    const transactions = this._getFromStorage('blockchain_transactions', []);
    const notes = this._getFromStorage('auditor_notes', []);
    const machines = this._getFromStorage('machines', []);

    const t = transactions.find((x) => x.id === transactionId) || null;
    if (!t) {
      return { transaction: null, auditorNote: null };
    }

    const machine = machines.find((m) => m.id === t.machineId) || null;
    const machineLabel = machine ? machine.name || machine.id : t.machineId;

    const note = notes.find((n) => n.transactionId === transactionId) || null;

    return {
      transaction: {
        id: t.id,
        transactionHash: t.transactionHash,
        blockHash: t.blockHash || null,
        previousBlockHash: t.previousBlockHash || null,
        machineId: t.machineId,
        machineLabel,
        transactionType: t.transactionType,
        timestamp: t.timestamp,
        payloadSummary: t.payloadSummary || '',
        rawPayload: t.rawPayload || '',
        confirmations: t.confirmations || 0,
        machine
      },
      auditorNote: note
        ? {
            noteId: note.id,
            content: note.content,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt || null
          }
        : null
    };
  }

  saveAuditorNote(transactionId, content) {
    const notes = this._getFromStorage('auditor_notes', []);
    const now = this._now();
    const idx = notes.findIndex((n) => n.transactionId === transactionId);

    if (idx !== -1) {
      const n = notes[idx];
      n.content = content;
      n.updatedAt = now;
      notes[idx] = n;
      this._saveToStorage('auditor_notes', notes);
      this._logActivity('auditor_note_updated', 'Auditor note updated for tx: ' + transactionId);
      return {
        noteId: n.id,
        content: n.content,
        createdAt: n.createdAt,
        updatedAt: n.updatedAt
      };
    }

    const note = {
      id: this._generateId('audnote'),
      transactionId,
      content,
      createdAt: now,
      updatedAt: null
    };
    notes.push(note);
    this._saveToStorage('auditor_notes', notes);
    this._logActivity('auditor_note_created', 'Auditor note created for tx: ' + transactionId);
    return {
      noteId: note.id,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    };
  }

  /* =========================
   * Reports & Saved Reports
   * ========================= */

  getReportTemplates() {
    return [
      {
        reportType: 'alerts',
        label: 'Alerts Report',
        description: 'Summary and details of alerts by plant, time range, and severity.'
      },
      {
        reportType: 'energy',
        label: 'Energy Report',
        description: 'Energy consumption analytics by plant and machine.'
      },
      {
        reportType: 'uptime',
        label: 'Uptime Report',
        description: 'Uptime and OEE metrics by plant and production line.'
      }
    ];
  }

  generateAlertsReport(siteId, timeRangePreset, customStart, customEnd, severity, minDurationMinutes) {
    const alerts = this._getFromStorage('alerts', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);
    const machines = this._getFromStorage('machines', []);

    const site = sites.find((s) => s.id === siteId) || null;
    const siteName = site ? site.name : null;

    const lineIndex = this._indexById(lines);
    const machineIndex = this._indexById(machines);

    const tr = this._resolveTimeRangePreset(timeRangePreset || 'last_30_days', customStart, customEnd);
    const start = this._parseDate(tr.start);
    const end = this._parseDate(tr.end);

    let filtered = alerts;

    // Site filter with hierarchy
    filtered = filtered.filter((a) => {
      if (a.assetType === 'site') {
        return a.assetId === siteId;
      }
      if (a.assetType === 'production_line') {
        const l = lineIndex[a.assetId];
        return l && l.siteId === siteId;
      }
      if (a.assetType === 'machine') {
        const m = machineIndex[a.assetId];
        return m && m.siteId === siteId;
      }
      return false;
    });

    // Time range
    filtered = filtered.filter((a) => {
      const t = this._parseDate(a.startTime);
      if (!t) return false;
      return t >= start && t <= end;
    });

    if (severity) {
      filtered = filtered.filter((a) => a.severity === severity);
    }

    const minDur = minDurationMinutes !== undefined && minDurationMinutes !== null ? Number(minDurationMinutes) : null;

    const now = new Date();
    const enriched = filtered
      .map((a) => {
        let duration = a.durationMinutes;
        if ((duration === undefined || duration === null) && a.startTime) {
          const st = this._parseDate(a.startTime);
          if (st) {
            const et = a.endTime ? this._parseDate(a.endTime) : now;
            if (et) {
              duration = (et.getTime() - st.getTime()) / 60000;
            }
          }
        }
        const assetLabel = this._getAssetLabel(a.assetType, a.assetId);
        return {
          alertId: a.id,
          name: a.name,
          severity: a.severity,
          assetLabel,
          startTime: a.startTime,
          endTime: a.endTime || null,
          durationMinutes: duration !== undefined && duration !== null ? duration : null
        };
      })
      .filter((a) => {
        if (minDur === null) return true;
        const d = a.durationMinutes;
        if (d === null || d === undefined) return false;
        return d >= minDur;
      });

    let totalDurationMinutes = 0;
    for (let i = 0; i < enriched.length; i++) {
      const d = enriched[i].durationMinutes;
      if (d !== null && d !== undefined) totalDurationMinutes += d;
    }

    return {
      siteName,
      timeRangeLabel: tr.label,
      severity: severity || null,
      minDurationMinutes: minDur,
      summary: {
        totalAlerts: enriched.length,
        totalDurationMinutes
      },
      alerts: enriched
    };
  }

  listSavedReports() {
    const saved = this._getFromStorage('saved_reports', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);

    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);

    return saved.map((r) => {
      const site = r.siteId ? siteIndex[r.siteId] || null : null;
      const line = r.productionLineId ? lineIndex[r.productionLineId] || null : null;
      return {
        savedReportId: r.id,
        name: r.name,
        description: r.description || '',
        reportType: r.reportType,
        siteId: r.siteId || null,
        siteName: site ? site.name : null,
        severity: r.severity || null,
        minDurationMinutes: r.minDurationMinutes || null,
        timeRangePreset: r.timeRangePreset,
        createdAt: r.createdAt || null,
        site,
        productionLine: line
      };
    });
  }

  getSavedReportDetails(savedReportId) {
    const saved = this._getFromStorage('saved_reports', []);
    const sites = this._getFromStorage('sites', []);
    const lines = this._getFromStorage('production_lines', []);

    const siteIndex = this._indexById(sites);
    const lineIndex = this._indexById(lines);

    const r = saved.find((x) => x.id === savedReportId) || null;
    if (!r) {
      return { savedReport: null };
    }

    const site = r.siteId ? siteIndex[r.siteId] || null : null;
    const line = r.productionLineId ? lineIndex[r.productionLineId] || null : null;

    return {
      savedReport: {
        id: r.id,
        name: r.name,
        description: r.description || '',
        reportType: r.reportType,
        siteId: r.siteId || null,
        siteName: site ? site.name : null,
        productionLineId: r.productionLineId || null,
        productionLineName: line ? line.name : null,
        severity: r.severity || null,
        minDurationMinutes: r.minDurationMinutes || null,
        timeRangePreset: r.timeRangePreset,
        customStart: r.customStart || null,
        customEnd: r.customEnd || null,
        site,
        productionLine: line
      }
    };
  }

  saveReportConfiguration(
    name,
    description,
    reportType,
    siteId,
    productionLineId,
    severity,
    minDurationMinutes,
    timeRangePreset,
    customStart,
    customEnd
  ) {
    const saved = this._getFromStorage('saved_reports', []);
    const now = this._now();
    const report = {
      id: this._generateId('savereport'),
      name,
      description: description || '',
      reportType,
      siteId: siteId || null,
      productionLineId: productionLineId || null,
      severity: severity || null,
      minDurationMinutes: minDurationMinutes !== undefined ? minDurationMinutes : null,
      timeRangePreset,
      customStart: customStart || null,
      customEnd: customEnd || null,
      createdAt: now,
      updatedAt: now
    };
    saved.push(report);
    this._saveToStorage('saved_reports', saved);
    this._logActivity('report_saved', 'Report configuration saved: ' + name);
    return { savedReportId: report.id, message: 'Report configuration saved' };
  }

  deleteSavedReport(savedReportId) {
    const saved = this._getFromStorage('saved_reports', []);
    const newSaved = saved.filter((r) => r.id !== savedReportId);
    const success = newSaved.length !== saved.length;
    this._saveToStorage('saved_reports', newSaved);
    if (success) {
      this._logActivity('report_deleted', 'Saved report deleted: ' + savedReportId);
    }
    return { success };
  }

  /* =========================
   * Roles & Users
   * ========================= */

  listRoles() {
    const roles = this._getFromStorage('roles', []);
    return roles.map((r) => ({
      roleId: r.id,
      name: r.name,
      description: r.description || '',
      memberCount: Array.isArray(r.memberNames) ? r.memberNames.length : 0
    }));
  }

  getRoleDetails(roleId) {
    const roles = this._getFromStorage('roles', []);
    const r = roles.find((x) => x.id === roleId) || null;
    if (!r) {
      return { role: null };
    }

    const role = {
      id: r.id,
      name: r.name,
      description: r.description || '',
      dashboardsView: !!r.dashboardsView,
      dashboardsEdit: !!r.dashboardsEdit,
      dashboardsDelete: !!r.dashboardsDelete,
      alertsView: !!r.alertsView,
      alertsEdit: !!r.alertsEdit,
      alertsDelete: !!r.alertsDelete,
      blockchainLedgerView: !!r.blockchainLedgerView,
      blockchainLedgerEdit: !!r.blockchainLedgerEdit,
      blockchainLedgerDelete: !!r.blockchainLedgerDelete,
      memberNames: Array.isArray(r.memberNames) ? r.memberNames.slice() : []
    };

    return { role };
  }

  createRole(name, description, permissions) {
    const roles = this._getFromStorage('roles', []);
    const now = this._now();
    const perms = permissions || {};
    const role = {
      id: this._generateId('role'),
      name,
      description: description || '',
      dashboardsView: !!perms.dashboardsView,
      dashboardsEdit: !!perms.dashboardsEdit,
      dashboardsDelete: !!perms.dashboardsDelete,
      alertsView: !!perms.alertsView,
      alertsEdit: !!perms.alertsEdit,
      alertsDelete: !!perms.alertsDelete,
      blockchainLedgerView: !!perms.blockchainLedgerView,
      blockchainLedgerEdit: !!perms.blockchainLedgerEdit,
      blockchainLedgerDelete: !!perms.blockchainLedgerDelete,
      memberNames: [],
      createdAt: now,
      updatedAt: now
    };
    roles.push(role);
    this._saveToStorage('roles', roles);
    this._logActivity('role_created', 'Role created: ' + name);
    return { roleId: role.id, message: 'Role created' };
  }

  updateRolePermissions(roleId, permissions) {
    const roles = this._getFromStorage('roles', []);
    const idx = roles.findIndex((r) => r.id === roleId);
    if (idx === -1) {
      return { success: false };
    }
    const r = roles[idx];
    const p = permissions || {};
    const fields = [
      'dashboardsView',
      'dashboardsEdit',
      'dashboardsDelete',
      'alertsView',
      'alertsEdit',
      'alertsDelete',
      'blockchainLedgerView',
      'blockchainLedgerEdit',
      'blockchainLedgerDelete'
    ];
    fields.forEach((f) => {
      if (p[f] !== undefined) {
        r[f] = !!p[f];
      }
    });
    r.updatedAt = this._now();
    roles[idx] = r;
    this._saveToStorage('roles', roles);
    this._logActivity('role_permissions_updated', 'Role permissions updated: ' + roleId);
    return { success: true };
  }

  listUsers() {
    const roles = this._getFromStorage('roles', []);
    const userMap = {};
    for (let i = 0; i < roles.length; i++) {
      const r = roles[i];
      const members = Array.isArray(r.memberNames) ? r.memberNames : [];
      for (let j = 0; j < members.length; j++) {
        const userName = members[j];
        if (!userMap[userName]) userMap[userName] = [];
        userMap[userName].push(r.name);
      }
    }

    return Object.keys(userMap).map((userName) => ({
      userName,
      roles: userMap[userName]
    }));
  }

  getUserDetails(userName) {
    const roles = this._getFromStorage('roles', []);
    const userRoles = [];
    for (let i = 0; i < roles.length; i++) {
      const r = roles[i];
      const members = Array.isArray(r.memberNames) ? r.memberNames : [];
      if (members.indexOf(userName) !== -1) {
        userRoles.push(r.name);
      }
    }
    return {
      userName,
      roles: userRoles
    };
  }

  assignRoleToUser(userName, roleId, assign) {
    const roles = this._getFromStorage('roles', []);
    const idx = roles.findIndex((r) => r.id === roleId);
    if (idx === -1) {
      return {
        userName,
        roles: []
      };
    }
    const assignFlag = assign !== false;
    this._updateRoleMemberNames(roles[idx], userName, assignFlag);
    roles[idx].updatedAt = this._now();
    this._saveToStorage('roles', roles);
    this._logActivity('role_membership_changed', 'Role membership changed: ' + roleId + ' for ' + userName);

    // recompute roles for this user
    const userDetails = this.getUserDetails(userName);
    return userDetails;
  }

  /* =========================
   * Static / Content APIs
   * ========================= */

  getAboutContent() {
    const content = this._getFromStorage('about_content', null);
    if (content && typeof content === 'object') {
      return content;
    }
    return {
      purpose: '',
      blockchainOverview: '',
      keyFeatures: [],
      architectureSummary: ''
    };
  }

  getHelpArticles() {
    const articles = this._getFromStorage('help_articles', []);
    return articles.map((a) => ({
      articleId: a.articleId,
      title: a.title,
      summary: a.summary,
      category: a.category
    }));
  }

  getHelpArticleDetails(articleId) {
    const articles = this._getFromStorage('help_articles', []);
    const a = articles.find((x) => x.articleId === articleId) || null;
    if (!a) {
      return { articleId: null, title: '', contentHtml: '' };
    }
    return {
      articleId: a.articleId,
      title: a.title,
      contentHtml: a.contentHtml || ''
    };
  }

  getTermsContent() {
    const content = this._getFromStorage('terms_content', null);
    if (content && typeof content === 'object') {
      return content;
    }
    return {
      lastUpdated: '',
      contentHtml: ''
    };
  }

  getPrivacyContent() {
    const content = this._getFromStorage('privacy_content', null);
    if (content && typeof content === 'object') {
      return content;
    }
    return {
      lastUpdated: '',
      contentHtml: ''
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
