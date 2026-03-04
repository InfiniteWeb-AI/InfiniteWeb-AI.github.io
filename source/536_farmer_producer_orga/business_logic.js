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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keys = [
      // Core entities from data model
      'crops',
      'crop_performance_summaries',
      'seasons',
      'districts',
      'farmers',
      'farmer_crop_profiles',
      'farmer_deliveries',
      'farmer_lists',
      'farmer_list_memberships',
      'markets',
      'tags',
      'market_tag_assignments',
      'market_prices',
      'collection_centers',
      'harvest_forecasts',
      'vehicles',
      'pickup_schedules',
      'dashboards',
      'dashboard_pins',
      'report_templates',
      'warehouses',
      'inventory_snapshots',
      'inventory_transfers',
      'payments',
      'price_alerts',
      'notifications',
      'favorite_items',
      // Additional tables for static/config content and reports backing data
      'about_content',
      'help_topics',
      'help_articles',
      'settings',
      'sales_revenue'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        // about_content and settings are objects, others are arrays
        if (key === 'about_content') {
          localStorage.setItem(
            key,
            JSON.stringify({
              organizationName: '',
              missionStatement: '',
              portalGoals: '',
              contactInfo: { email: '', phone: '', address: '' }
            })
          );
        } else if (key === 'settings') {
          localStorage.setItem(
            key,
            JSON.stringify({
              timeZone: 'UTC',
              dateFormat: 'yyyy-MM-dd',
              defaultDashboardKey: 'management_overview',
              units: { weightUnit: 'kg', areaUnit: 'acre' },
              notificationPreferences: {
                priceAlerts: 'portal_notification',
                systemMessages: 'portal_notification'
              },
              tableDisplayOptions: { pageSizeDefault: 25, showRowStriping: true }
            })
          );
        } else if (key === 'sales_revenue') {
          // Backing data for sales & revenue reports (empty by default)
          localStorage.setItem(key, JSON.stringify([]));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return Array.isArray(data) ? [] : [];
    try {
      return JSON.parse(data);
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return {};
    try {
      return JSON.parse(data);
    } catch (e) {
      return {};
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

  _findById(list, id) {
    if (!Array.isArray(list)) return null;
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    // Accept full ISO and YYYY-MM-DD
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  _formatDate(date) {
    const d = (date instanceof Date) ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _compareDates(d1, d2) {
    const t1 = this._parseDate(d1);
    const t2 = this._parseDate(d2);
    if (!t1 || !t2) return 0;
    return t1.getTime() - t2.getTime();
  }

  _sortArray(arr, field, order) {
    if (!field) return arr;
    const sortOrder = order === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      const va = a[field];
      const vb = b[field];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') {
        return (va - vb) * sortOrder;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      if (sa < sb) return -1 * sortOrder;
      if (sa > sb) return 1 * sortOrder;
      return 0;
    });
    return arr;
  }

  // -------------------- Helper functions specified --------------------

  // Internal helper to build itemRef for crop analytics favorites
  _buildItemRefForCropAnalytics(cropId, startDate, endDate, primaryMetric) {
    const params = [];
    if (cropId) params.push('cropId=' + encodeURIComponent(cropId));
    if (startDate) params.push('startDate=' + encodeURIComponent(startDate));
    if (endDate) params.push('endDate=' + encodeURIComponent(endDate));
    if (primaryMetric) params.push('primaryMetric=' + encodeURIComponent(primaryMetric));
    return 'crop_analytics?' + params.join('&');
  }

  // Internal helper to resolve latest inventory snapshot per warehouse and product category as of a date
  _getCurrentInventorySnapshot(productCategory, asOfDate) {
    const snapshots = this._getFromStorage('inventory_snapshots');
    const targetDate = asOfDate ? this._parseDate(asOfDate) : new Date();
    const latestByWarehouse = {};
    for (let i = 0; i < snapshots.length; i++) {
      const s = snapshots[i];
      if (s.product_category !== productCategory) continue;
      const d = this._parseDate(s.as_of_date || s.as_ofDate);
      if (!d || d.getTime() > targetDate.getTime()) continue;
      const wid = s.warehouse_id;
      if (!wid) continue;
      const existing = latestByWarehouse[wid];
      if (!existing) {
        latestByWarehouse[wid] = s;
      } else {
        const ed = this._parseDate(existing.as_of_date || existing.as_ofDate);
        if (ed && d.getTime() > ed.getTime()) {
          latestByWarehouse[wid] = s;
        }
      }
    }
    return latestByWarehouse; // map warehouseId -> snapshot
  }

  // Internal helper to resolve period preset keys into start/end dates
  _resolvePeriodPresetDates(presetKey, referenceDate) {
    const today = referenceDate ? this._parseDate(referenceDate) : new Date();
    const end = new Date(today.getTime());
    let start = new Date(today.getTime());

    if (presetKey === 'today') {
      return { startDate: this._formatDate(today), endDate: this._formatDate(today) };
    }
    if (presetKey === 'last_30_days') {
      start.setDate(start.getDate() - 29);
      return { startDate: this._formatDate(start), endDate: this._formatDate(end) };
    }
    if (presetKey === 'next_7_days') {
      const s = new Date(today.getTime());
      const e = new Date(today.getTime());
      e.setDate(e.getDate() + 6);
      return { startDate: this._formatDate(s), endDate: this._formatDate(e) };
    }
    if (presetKey === 'next_30_days') {
      const s = new Date(today.getTime());
      const e = new Date(today.getTime());
      e.setDate(e.getDate() + 29);
      return { startDate: this._formatDate(s), endDate: this._formatDate(e) };
    }
    if (presetKey === 'fy_2023_24') {
      return { startDate: '2023-04-01', endDate: '2024-03-31' };
    }
    if (presetKey === 'last_12_months') {
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0); // end of current month
      const s = new Date(e.getFullYear(), e.getMonth() - 11, 1);
      return { startDate: this._formatDate(s), endDate: this._formatDate(e) };
    }
    // Default: return today
    return { startDate: this._formatDate(today), endDate: this._formatDate(today) };
  }

  // Helper to resolve latest season for a given season_type (e.g., 'kharif')
  _getLastSeasonByType(seasonType) {
    const seasons = this._getFromStorage('seasons');
    let last = null;
    for (let i = 0; i < seasons.length; i++) {
      const s = seasons[i];
      if (s.season_type !== seasonType) continue;
      if (!last || s.year > last.year) {
        last = s;
      }
    }
    return last;
  }

  // Helper to map deliveryPeriodPresetKey to season and date range
  _resolveDeliveryPeriodPreset(deliveryPeriodPresetKey) {
    if (!deliveryPeriodPresetKey) return null;
    if (deliveryPeriodPresetKey === 'last_kharif_season') {
      const s = this._getLastSeasonByType('kharif');
      if (!s) return null;
      return {
        seasonId: s.id,
        startDate: this._formatDate(s.start_date || s.startDate),
        endDate: this._formatDate(s.end_date || s.endDate)
      };
    }
    if (deliveryPeriodPresetKey === 'last_rabi_season') {
      const s = this._getLastSeasonByType('rabi');
      if (!s) return null;
      return {
        seasonId: s.id,
        startDate: this._formatDate(s.start_date || s.startDate),
        endDate: this._formatDate(s.end_date || s.endDate)
      };
    }
    // Generic season_ prefix
    if (deliveryPeriodPresetKey.indexOf('season_') === 0) {
      const seasonId = deliveryPeriodPresetKey.substring('season_'.length);
      const seasons = this._getFromStorage('seasons');
      const s = this._findById(seasons, seasonId);
      if (!s) return null;
      return {
        seasonId: s.id,
        startDate: this._formatDate(s.start_date || s.startDate),
        endDate: this._formatDate(s.end_date || s.endDate)
      };
    }
    return null;
  }

  // -------------------- getDashboardSummary --------------------

  getDashboardSummary(asOfDate) {
    const asOf = asOfDate ? this._parseDate(asOfDate) : new Date();
    const asOfStr = this._formatDate(asOf);

    // Production KPI from crop_performance_summaries
    const cps = this._getFromStorage('crop_performance_summaries');
    const crops = this._getFromStorage('crops');
    let totalProductionKg = 0;
    let totalProfit = 0;
    let topCropProfitPerAcre = null;
    let topCropName = null;
    for (let i = 0; i < cps.length; i++) {
      const row = cps[i];
      const endDate = row.end_date || row.endDate;
      if (endDate && this._compareDates(endDate, asOfStr) > 0) continue;
      if (typeof row.total_production_kg === 'number') {
        totalProductionKg += row.total_production_kg;
      }
      if (typeof row.total_profit === 'number') {
        totalProfit += row.total_profit;
      }
      if (typeof row.profit_per_acre === 'number') {
        if (topCropProfitPerAcre == null || row.profit_per_acre > topCropProfitPerAcre) {
          topCropProfitPerAcre = row.profit_per_acre;
          const crop = this._findById(crops, row.crop_id);
          topCropName = crop ? crop.name : null;
        }
      }
    }

    // Price KPI: approximate volatility per crop using market_prices
    const prices = this._getFromStorage('market_prices');
    const priceByCrop = {};
    for (let i = 0; i < prices.length; i++) {
      const p = prices[i];
      const d = p.date;
      if (d && this._compareDates(d, asOfStr) > 0) continue;
      const key = p.crop_id;
      if (!key) continue;
      if (!priceByCrop[key]) priceByCrop[key] = [];
      const avg = typeof p.average_price === 'number'
        ? p.average_price
        : (typeof p.min_price === 'number' && typeof p.max_price === 'number')
          ? (p.min_price + p.max_price) / 2
          : null;
      if (avg != null) priceByCrop[key].push(avg);
    }
    let mostVolatileCropName = null;
    let maxVolatility = null;
    let totalChangePercent = 0;
    let changeCount = 0;
    const cropMap = {};
    for (let i = 0; i < crops.length; i++) cropMap[crops[i].id] = crops[i];
    for (const cropId in priceByCrop) {
      const arr = priceByCrop[cropId];
      if (arr.length < 2) continue;
      let volatilitySum = 0;
      let volCount = 0;
      for (let j = 1; j < arr.length; j++) {
        const prev = arr[j - 1];
        const curr = arr[j];
        if (prev === 0) continue;
        const changePct = Math.abs((curr - prev) / prev) * 100;
        volatilitySum += changePct;
        volCount++;
        totalChangePercent += changePct;
        changeCount++;
      }
      if (volCount > 0) {
        const avgVol = volatilitySum / volCount;
        if (maxVolatility == null || avgVol > maxVolatility) {
          maxVolatility = avgVol;
          const crop = cropMap[cropId];
          mostVolatileCropName = crop ? crop.name : null;
        }
      }
    }
    const avgPriceChangePercent = changeCount > 0 ? totalChangePercent / changeCount : 0;

    // Membership KPI from farmers
    const farmers = this._getFromStorage('farmers');
    let totalMembers = 0;
    let newRegistrationsLast30Days = 0;
    const start30 = new Date(asOf.getTime());
    start30.setDate(start30.getDate() - 29);
    const start30Str = this._formatDate(start30);
    for (let i = 0; i < farmers.length; i++) {
      const f = farmers[i];
      if (f.membership_status === 'active') totalMembers++;
      if (f.registration_date) {
        const rd = f.registration_date || f.registrationDate;
        if (this._compareDates(rd, start30Str) >= 0 && this._compareDates(rd, asOfStr) <= 0) {
          newRegistrationsLast30Days++;
        }
      }
    }

    // Inventory KPI from inventory_snapshots and warehouses
    const warehouses = this._getFromStorage('warehouses');
    let totalWarehouses = 0;
    for (let i = 0; i < warehouses.length; i++) {
      if (warehouses[i].is_active !== false) totalWarehouses++;
    }
    const inventoryMap = this._getCurrentInventorySnapshot('fertilizer', asOfStr);
    let fertilizerBagsInStock = 0;
    for (const wid in inventoryMap) {
      const s = inventoryMap[wid];
      if (s.unit === 'bags' && typeof s.quantity === 'number') {
        fertilizerBagsInStock += s.quantity;
      }
    }

    // Payments KPI from payments
    const payments = this._getFromStorage('payments');
    let pendingAmount = 0;
    let overdueAmount = 0;
    for (let i = 0; i < payments.length; i++) {
      const p = payments[i];
      if (p.status === 'pending' || p.status === 'partially_paid' || p.status === 'overdue') {
        if (typeof p.amount === 'number') pendingAmount += p.amount;
      }
      if (p.status === 'overdue' && typeof p.amount === 'number') {
        overdueAmount += p.amount;
      }
    }

    return {
      productionKpi: {
        totalProductionKg,
        totalProfit,
        topCropName,
        topCropProfitPerAcre: topCropProfitPerAcre == null ? 0 : topCropProfitPerAcre
      },
      priceKpi: {
        mostVolatileCropName,
        avgPriceChangePercent: avgPriceChangePercent || 0
      },
      membershipKpi: {
        totalMembers,
        newRegistrationsLast30Days
      },
      inventoryKpi: {
        totalWarehouses,
        fertilizerBagsInStock
      },
      paymentsKpi: {
        pendingAmount,
        overdueAmount
      }
    };
  }

  // -------------------- getDashboardPins --------------------

  getDashboardPins(dashboardKey) {
    const dashboards = this._getFromStorage('dashboards');
    const dashboard = dashboards.find(function (d) { return d.key === dashboardKey; });
    if (!dashboard) return [];
    const pins = this._getFromStorage('dashboard_pins');
    const filtered = pins.filter(function (p) { return p.dashboard_id === dashboard.id; });
    return filtered.map(function (p) {
      return {
        pinId: p.id,
        itemType: p.item_type,
        title: p.title || '',
        itemRef: p.item_ref,
        createdAt: p.created_at || ''
      };
    });
  }

  // -------------------- getQuickAccessFavorites --------------------

  getQuickAccessFavorites() {
    const favorites = this._getFromStorage('favorite_items');
    // sort by created_at desc
    favorites.sort((a, b) => {
      const da = this._parseDate(a.created_at);
      const db = this._parseDate(b.created_at);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });
    return favorites.map(function (f) {
      return {
        favoriteId: f.id,
        itemType: f.item_type,
        label: f.label || '',
        itemRef: f.item_ref,
        createdAt: f.created_at || ''
      };
    });
  }

  // -------------------- getProductionAnalyticsFilterOptions --------------------

  getProductionAnalyticsFilterOptions() {
    const fy = this._resolvePeriodPresetDates('fy_2023_24');
    const last12 = this._resolvePeriodPresetDates('last_12_months');
    return {
      datePresets: [
        {
          key: 'fy_2023_24',
          label: 'FY 2023-24',
          startDate: fy.startDate,
          endDate: fy.endDate
        },
        {
          key: 'last_12_months',
          label: 'Last 12 months',
          startDate: last12.startDate,
          endDate: last12.endDate
        }
      ],
      metrics: [
        { key: 'profit_per_acre', label: 'Profit per acre', unit: '₹/acre' },
        { key: 'yield_per_acre_kg', label: 'Yield per acre', unit: 'kg/acre' },
        { key: 'total_production_kg', label: 'Total production', unit: 'kg' },
        { key: 'total_profit', label: 'Total profit', unit: '₹' }
      ],
      viewModes: [
        { key: 'crop_summary', label: 'Crop summary' },
        { key: 'district', label: 'By district' },
        { key: 'season', label: 'By season' }
      ]
    };
  }

  // -------------------- getProductionAnalyticsView --------------------

  getProductionAnalyticsView(startDate, endDate, primaryMetric, viewMode, sortBy, sortOrder) {
    const cps = this._getFromStorage('crop_performance_summaries');
    const crops = this._getFromStorage('crops');

    // Filter by date range
    const filtered = [];
    for (let i = 0; i < cps.length; i++) {
      const row = cps[i];
      const sd = row.start_date || row.startDate;
      const ed = row.end_date || row.endDate;
      if (sd && this._compareDates(sd, endDate) > 0) continue;
      if (ed && this._compareDates(ed, startDate) < 0) continue;
      filtered.push(row);
    }

    // Build cropSummaryRows from filtered summaries (one row per summary)
    const cropMap = {};
    for (let i = 0; i < crops.length; i++) cropMap[crops[i].id] = crops[i];

    const rows = filtered.map(function (row) {
      const crop = cropMap[row.crop_id] || null;
      return {
        cropId: row.crop_id,
        cropName: crop ? crop.name : null,
        seasonType: row.season_type || null,
        areaCultivatedAcres: row.area_cultivated_acres || 0,
        totalProductionKg: row.total_production_kg || 0,
        totalRevenue: row.total_revenue || 0,
        totalCost: row.total_cost || 0,
        totalProfit: row.total_profit || 0,
        profitPerAcre: row.profit_per_acre || 0,
        yieldPerAcreKg: row.yield_per_acre_kg || 0,
        crop: crop // foreign key resolution
      };
    });

    const sortField = sortBy || (primaryMetric === 'total_production' ? 'totalProductionKg' : (primaryMetric || 'profitPerAcre'));
    let internalSortField = sortField;
    if (sortField === 'profit_per_acre') internalSortField = 'profitPerAcre';
    if (sortField === 'yield_per_acre_kg') internalSortField = 'yieldPerAcreKg';
    if (sortField === 'total_production') internalSortField = 'totalProductionKg';
    if (sortField === 'total_profit') internalSortField = 'totalProfit';
    this._sortArray(rows, internalSortField, sortOrder || 'desc');

    // Build a simple summaryChart: series per crop using primary metric
    const series = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      let val = 0;
      if (internalSortField && typeof r[internalSortField] === 'number') {
        val = r[internalSortField];
      }
      series.push({ label: r.cropName || r.cropId, values: [val] });
    }

    return {
      summaryChart: {
        series: series
      },
      cropSummaryRows: rows
    };
  }

  // -------------------- getCropDetailAnalytics --------------------

  getCropDetailAnalytics(cropId, startDate, endDate) {
    const crops = this._getFromStorage('crops');
    const crop = this._findById(crops, cropId);
    const cps = this._getFromStorage('crop_performance_summaries');
    const deliveries = this._getFromStorage('farmer_deliveries');
    const farmers = this._getFromStorage('farmers');
    const districts = this._getFromStorage('districts');
    const collectionCenters = this._getFromStorage('collection_centers');
    const harvestForecasts = this._getFromStorage('harvest_forecasts');

    const sDate = startDate || null;
    const eDate = endDate || null;

    // Filter summaries
    const relevant = [];
    for (let i = 0; i < cps.length; i++) {
      const row = cps[i];
      if (row.crop_id !== cropId) continue;
      const sd = row.start_date || row.startDate;
      const ed = row.end_date || row.endDate;
      if (sDate && ed && this._compareDates(ed, sDate) < 0) continue;
      if (eDate && sd && this._compareDates(sd, eDate) > 0) continue;
      relevant.push(row);
    }

    let totalProfit = 0;
    let totalProductionKg = 0;
    let totalArea = 0;
    for (let i = 0; i < relevant.length; i++) {
      const r = relevant[i];
      if (typeof r.total_profit === 'number') totalProfit += r.total_profit;
      if (typeof r.total_production_kg === 'number') totalProductionKg += r.total_production_kg;
      if (typeof r.area_cultivated_acres === 'number') totalArea += r.area_cultivated_acres;
    }
    const profitPerAcre = totalArea > 0 ? totalProfit / totalArea : 0;
    const yieldPerAcreKg = totalArea > 0 ? totalProductionKg / totalArea : 0;

    // timeSeries: one point per summary using end_date
    const timeSeries = relevant.map(function (r) {
      return {
        date: r.end_date || r.endDate || '',
        profit: r.total_profit || 0,
        cost: r.total_cost || 0,
        productionKg: r.total_production_kg || 0
      };
    });

    // bySeason: group by season_type and year(start_date)
    const seasonAgg = {};
    for (let i = 0; i < relevant.length; i++) {
      const r = relevant[i];
      const sd = this._parseDate(r.start_date || r.startDate);
      const year = sd ? sd.getFullYear() : null;
      const key = (r.season_type || 'other') + '_' + (year || '');
      if (!seasonAgg[key]) {
        seasonAgg[key] = {
          seasonType: r.season_type || 'other',
          year: year,
          totalProfit: 0,
          totalArea: 0
        };
      }
      if (typeof r.total_profit === 'number') seasonAgg[key].totalProfit += r.total_profit;
      if (typeof r.area_cultivated_acres === 'number') seasonAgg[key].totalArea += r.area_cultivated_acres;
    }
    const bySeason = [];
    for (const key in seasonAgg) {
      const s = seasonAgg[key];
      const profitPerAcreSeason = s.totalArea > 0 ? s.totalProfit / s.totalArea : 0;
      bySeason.push({
        seasonName: (s.seasonType || 'other') + ' ' + (s.year || ''),
        seasonType: s.seasonType || 'other',
        year: s.year || null,
        totalProfit: s.totalProfit,
        profitPerAcre: profitPerAcreSeason
      });
    }

    // byDistrict: use farmer_deliveries joined to farmers and districts
    const startFilter = sDate;
    const endFilter = eDate;
    const districtAgg = {};
    for (let i = 0; i < deliveries.length; i++) {
      const d = deliveries[i];
      if (d.crop_id !== cropId) continue;
      const dd = d.delivery_date || d.deliveryDate;
      if (startFilter && this._compareDates(dd, startFilter) < 0) continue;
      if (endFilter && this._compareDates(dd, endFilter) > 0) continue;
      const farmer = this._findById(farmers, d.farmer_id);
      const districtId = farmer ? farmer.district_id : null;
      if (!districtId) continue;
      const key = districtId;
      if (!districtAgg[key]) {
        districtAgg[key] = {
          districtId: districtId,
          totalProductionKg: 0,
          totalProfit: 0
        };
      }
      if (typeof d.quantity_kg === 'number') districtAgg[key].totalProductionKg += d.quantity_kg;
      // Approximate profit as total_amount (revenue) due to lack of cost data
      if (typeof d.total_amount === 'number') districtAgg[key].totalProfit += d.total_amount;
    }
    const districtMap = {};
    for (let i = 0; i < districts.length; i++) districtMap[districts[i].id] = districts[i];
    const byDistrict = [];
    for (const key in districtAgg) {
      const ag = districtAgg[key];
      const dist = districtMap[ag.districtId];
      byDistrict.push({
        districtId: ag.districtId,
        districtName: dist ? dist.name : null,
        totalProductionKg: ag.totalProductionKg,
        totalProfit: ag.totalProfit
      });
    }

    // byCollectionCenter: combine deliveries and harvest forecasts
    const ccAgg = {};
    for (let i = 0; i < deliveries.length; i++) {
      const d = deliveries[i];
      if (d.crop_id !== cropId) continue;
      const dd = d.delivery_date || d.deliveryDate;
      if (startFilter && this._compareDates(dd, startFilter) < 0) continue;
      if (endFilter && this._compareDates(dd, endFilter) > 0) continue;
      const ccId = d.collection_center_id;
      if (!ccId) continue;
      if (!ccAgg[ccId]) ccAgg[ccId] = { totalDeliveredKg: 0, expectedHarvestKg: 0 };
      if (typeof d.quantity_kg === 'number') ccAgg[ccId].totalDeliveredKg += d.quantity_kg;
    }
    for (let i = 0; i < harvestForecasts.length; i++) {
      const hf = harvestForecasts[i];
      if (hf.crop_id !== cropId) continue;
      const fd = hf.forecast_date || hf.forecastDate;
      if (startFilter && this._compareDates(fd, startFilter) < 0) continue;
      if (endFilter && this._compareDates(fd, endFilter) > 0) continue;
      const ccId = hf.collection_center_id;
      if (!ccId) continue;
      if (!ccAgg[ccId]) ccAgg[ccId] = { totalDeliveredKg: 0, expectedHarvestKg: 0 };
      if (typeof hf.expected_harvest_kg === 'number') ccAgg[ccId].expectedHarvestKg += hf.expected_harvest_kg;
    }
    const ccMap = {};
    for (let i = 0; i < collectionCenters.length; i++) ccMap[collectionCenters[i].id] = collectionCenters[i];
    const byCollectionCenter = [];
    for (const ccId in ccAgg) {
      const ag = ccAgg[ccId];
      const cc = ccMap[ccId];
      byCollectionCenter.push({
        collectionCenterId: ccId,
        collectionCenterName: cc ? cc.name : null,
        expectedHarvestKg: ag.expectedHarvestKg,
        totalDeliveredKg: ag.totalDeliveredKg,
        collectionCenter: cc || null
      });
    }

    return {
      cropId: crop ? crop.id : cropId,
      cropName: crop ? crop.name : null,
      category: crop ? crop.category : null,
      overviewMetrics: {
        totalProfit,
        profitPerAcre,
        yieldPerAcreKg,
        totalProductionKg
      },
      timeSeries: timeSeries,
      bySeason: bySeason,
      byDistrict: byDistrict,
      byCollectionCenter: byCollectionCenter,
      crop: crop || null // foreign key resolution for cropId
    };
  }

  // -------------------- bookmarkCropAnalyticsView --------------------

  bookmarkCropAnalyticsView(cropId, startDate, endDate, primaryMetric, label) {
    const crops = this._getFromStorage('crops');
    const crop = this._findById(crops, cropId);
    const itemRef = this._buildItemRefForCropAnalytics(cropId, startDate, endDate, primaryMetric);
    const favorites = this._getFromStorage('favorite_items');
    const id = this._generateId('favorite');
    const now = this._formatDate(new Date());
    const favorite = {
      id: id,
      item_type: 'crop_analytics',
      item_ref: itemRef,
      label: label || (crop ? crop.name + ' analytics' : 'Crop analytics'),
      created_at: now
    };
    favorites.push(favorite);
    this._saveToStorage('favorite_items', favorites);
    return { success: true, favoriteId: id, message: 'Favorite saved' };
  }

  // -------------------- getFarmerDirectoryFilterOptions --------------------

  getFarmerDirectoryFilterOptions() {
    const crops = this._getFromStorage('crops');
    const farmerLists = this._getFromStorage('farmer_lists');
    const seasons = this._getFromStorage('seasons');

    // Build deliveryPeriodPresets from seasons
    const deliveryPeriodPresets = [];
    // Last Kharif
    const lastKharif = this._getLastSeasonByType('kharif');
    if (lastKharif) {
      deliveryPeriodPresets.push({
        key: 'last_kharif_season',
        label: 'Last Kharif season',
        seasonId: lastKharif.id,
        seasonName: lastKharif.name
      });
    }
    // Last Rabi
    const lastRabi = this._getLastSeasonByType('rabi');
    if (lastRabi) {
      deliveryPeriodPresets.push({
        key: 'last_rabi_season',
        label: 'Last Rabi season',
        seasonId: lastRabi.id,
        seasonName: lastRabi.name
      });
    }
    // Generic presets per season
    for (let i = 0; i < seasons.length; i++) {
      const s = seasons[i];
      deliveryPeriodPresets.push({
        key: 'season_' + s.id,
        label: s.name,
        seasonId: s.id,
        seasonName: s.name
      });
    }

    const landHoldingRanges = [
      { minAcres: 0, maxAcres: 2, label: '0 - 2 acres' },
      { minAcres: 2, maxAcres: 5, label: '2 - 5 acres' },
      { minAcres: 5, maxAcres: 10, label: '5 - 10 acres' },
      { minAcres: 10, maxAcres: null, label: '10+ acres' }
    ];

    const deliveryVolumeRangesKg = [
      { minKg: 0, maxKg: 500, label: '0 - 500 kg' },
      { minKg: 500, maxKg: 1000, label: '500 - 1000 kg' },
      { minKg: 1000, maxKg: 5000, label: '1 - 5 tons' },
      { minKg: 5000, maxKg: null, label: '5+ tons' }
    ];

    return {
      crops: crops,
      deliveryPeriodPresets: deliveryPeriodPresets,
      landHoldingRanges: landHoldingRanges,
      deliveryVolumeRangesKg: deliveryVolumeRangesKg,
      farmerLists: farmerLists
    };
  }

  // -------------------- searchFarmersForDirectory --------------------

  searchFarmersForDirectory(filters, page, pageSize, sortBy, sortOrder) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 25;

    const farmers = this._getFromStorage('farmers');
    const fcp = this._getFromStorage('farmer_crop_profiles');
    const deliveries = this._getFromStorage('farmer_deliveries');
    const crops = this._getFromStorage('crops');
    const districts = this._getFromStorage('districts');

    const cropId = filters.cropId || null;
    const minArea = typeof filters.minCultivatedAreaAcres === 'number' ? filters.minCultivatedAreaAcres : null;
    const maxArea = typeof filters.maxCultivatedAreaAcres === 'number' ? filters.maxCultivatedAreaAcres : null;
    const deliveryPresetKey = filters.deliveryPeriodPresetKey || null;
    const minDelivered = typeof filters.minTotalDeliveredKg === 'number' ? filters.minTotalDeliveredKg : null;
    const maxDelivered = typeof filters.maxTotalDeliveredKg === 'number' ? filters.maxTotalDeliveredKg : null;

    const farmersMap = {};
    for (let i = 0; i < farmers.length; i++) farmersMap[farmers[i].id] = farmers[i];
    const cropsMap = {};
    for (let i = 0; i < crops.length; i++) cropsMap[crops[i].id] = crops[i];
    const districtsMap = {};
    for (let i = 0; i < districts.length; i++) districtsMap[districts[i].id] = districts[i];

    const period = this._resolveDeliveryPeriodPreset(deliveryPresetKey);
    const periodStart = period ? period.startDate : null;
    const periodEnd = period ? period.endDate : null;
    const seasonId = period ? period.seasonId : null;

    // Pre-aggregate deliveries per farmer for this crop and period
    const deliveredByFarmer = {};
    for (let i = 0; i < deliveries.length; i++) {
      const d = deliveries[i];
      if (cropId && d.crop_id !== cropId) continue;
      const dd = d.delivery_date || d.deliveryDate;
      if (periodStart && this._compareDates(dd, periodStart) < 0) continue;
      if (periodEnd && this._compareDates(dd, periodEnd) > 0) continue;
      if (seasonId && d.season_id && d.season_id !== seasonId) continue;
      const farmerId = d.farmer_id;
      if (!deliveredByFarmer[farmerId]) deliveredByFarmer[farmerId] = 0;
      if (typeof d.quantity_kg === 'number') deliveredByFarmer[farmerId] += d.quantity_kg;
    }

    // Filter farmer crop profiles by crop and area
    const candidates = [];
    for (let i = 0; i < fcp.length; i++) {
      const p = fcp[i];
      if (cropId && p.crop_id !== cropId) continue;
      if (minArea != null && typeof p.cultivated_area_acres === 'number' && p.cultivated_area_acres < minArea) continue;
      if (maxArea != null && typeof p.cultivated_area_acres === 'number' && p.cultivated_area_acres > maxArea) continue;
      const farmer = farmersMap[p.farmer_id];
      if (!farmer) continue;
      const totalDelivered = deliveredByFarmer[p.farmer_id] || 0;
      if (minDelivered != null && totalDelivered < minDelivered) continue;
      if (maxDelivered != null && totalDelivered > maxDelivered) continue;
      const crop = cropsMap[p.crop_id];
      const district = farmer.district_id ? districtsMap[farmer.district_id] : null;
      candidates.push({
        farmerId: farmer.id,
        farmerName: farmer.name,
        village: farmer.village || null,
        districtName: district ? district.name : null,
        cultivatedAreaAcres: p.cultivated_area_acres || 0,
        primaryCropName: crop ? crop.name : null,
        totalDeliveredKgInPeriod: totalDelivered,
        farmer: farmer, // foreign key resolution
        district: district || null
      });
    }

    // Sorting
    let internalSortBy = sortBy || 'totalDeliveredKgInPeriod';
    if (internalSortBy === 'total_delivered_kg') internalSortBy = 'totalDeliveredKgInPeriod';
    if (internalSortBy === 'cultivated_area_acres') internalSortBy = 'cultivatedAreaAcres';
    this._sortArray(candidates, internalSortBy, sortOrder || 'asc');

    const totalCount = candidates.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paged = candidates.slice(startIndex, endIndex);

    return {
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
      farmers: paged
    };
  }

  // -------------------- addFarmersToList --------------------

  addFarmersToList(farmerListId, farmerIds, source, notes) {
    farmerIds = Array.isArray(farmerIds) ? farmerIds : [];
    source = source || 'filter_selection';

    const farmerLists = this._getFromStorage('farmer_lists');
    const targetList = this._findById(farmerLists, farmerListId);
    if (!targetList) {
      return { success: false, addedCount: 0, alreadyInListCount: 0, message: 'Farmer list not found' };
    }

    let memberships = this._getFromStorage('farmer_list_memberships');
    const existingSet = {};
    for (let i = 0; i < memberships.length; i++) {
      const m = memberships[i];
      if (m.farmer_list_id === farmerListId) {
        existingSet[m.farmer_id] = true;
      }
    }

    let addedCount = 0;
    let alreadyInListCount = 0;
    const now = this._formatDate(new Date());

    for (let i = 0; i < farmerIds.length; i++) {
      const fid = farmerIds[i];
      if (existingSet[fid]) {
        alreadyInListCount++;
        continue;
      }
      const membership = {
        id: this._generateId('farmer_list_membership'),
        farmer_list_id: farmerListId,
        farmer_id: fid,
        source: source,
        notes: notes || '',
        added_at: now
      };
      memberships.push(membership);
      existingSet[fid] = true;
      addedCount++;
    }

    this._saveToStorage('farmer_list_memberships', memberships);

    return {
      success: true,
      addedCount: addedCount,
      alreadyInListCount: alreadyInListCount,
      message: 'Farmers added to list'
    };
  }

  // -------------------- getPriceAnalyticsFilterOptions --------------------

  getPriceAnalyticsFilterOptions() {
    const crops = this._getFromStorage('crops');
    const markets = this._getFromStorage('markets');
    const today = this._resolvePeriodPresetDates('today');
    const last30 = this._resolvePeriodPresetDates('last_30_days');
    return {
      crops: crops,
      markets: markets,
      datePresets: [
        { key: 'today', label: 'Today', startDate: today.startDate, endDate: today.endDate },
        { key: 'last_30_days', label: 'Last 30 days', startDate: last30.startDate, endDate: last30.endDate }
      ]
    };
  }

  // -------------------- getMarketPriceComparison --------------------

  getMarketPriceComparison(cropId, marketIds, startDate, endDate, sortBy, sortOrder) {
    marketIds = Array.isArray(marketIds) ? marketIds : [];
    const markets = this._getFromStorage('markets');
    const prices = this._getFromStorage('market_prices');

    const marketMap = {};
    for (let i = 0; i < markets.length; i++) marketMap[markets[i].id] = markets[i];

    const rowsByMarket = {};
    const timeSeriesByMarket = {};
    let unit = null;

    for (let i = 0; i < prices.length; i++) {
      const p = prices[i];
      if (p.crop_id !== cropId) continue;
      if (marketIds.indexOf(p.market_id) === -1) continue;
      const d = p.date;
      if (startDate && this._compareDates(d, startDate) < 0) continue;
      if (endDate && this._compareDates(d, endDate) > 0) continue;
      if (!unit && p.unit) unit = p.unit;

      const mId = p.market_id;
      if (!rowsByMarket[mId]) {
        rowsByMarket[mId] = {
          marketId: mId,
          count: 0,
          sumPrice: 0,
          minPrice: null,
          maxPrice: null,
          prices: []
        };
      }
      const avg = typeof p.average_price === 'number'
        ? p.average_price
        : (typeof p.min_price === 'number' && typeof p.max_price === 'number')
          ? (p.min_price + p.max_price) / 2
          : null;
      if (avg != null) {
        const ag = rowsByMarket[mId];
        ag.count++;
        ag.sumPrice += avg;
        ag.prices.push(avg);
        if (ag.minPrice == null || avg < ag.minPrice) ag.minPrice = avg;
        if (ag.maxPrice == null || avg > ag.maxPrice) ag.maxPrice = avg;
      }

      if (!timeSeriesByMarket[mId]) timeSeriesByMarket[mId] = [];
      if (avg != null) {
        timeSeriesByMarket[mId].push({ date: d, averagePrice: avg });
      }
    }

    const marketRows = [];
    for (const mId in rowsByMarket) {
      const ag = rowsByMarket[mId];
      const market = marketMap[mId];
      let avgPrice = ag.count > 0 ? ag.sumPrice / ag.count : 0;
      // Simple volatility index: standard deviation of prices
      let volatility = 0;
      if (ag.prices.length > 1) {
        let sum = 0;
        for (let i = 0; i < ag.prices.length; i++) sum += ag.prices[i];
        const mean = sum / ag.prices.length;
        let sq = 0;
        for (let i = 0; i < ag.prices.length; i++) {
          const diff = ag.prices[i] - mean;
          sq += diff * diff;
        }
        volatility = Math.sqrt(sq / ag.prices.length);
      }
      marketRows.push({
        marketId: mId,
        marketName: market ? market.name : null,
        averageSellingPrice: avgPrice,
        minPrice: ag.minPrice == null ? 0 : ag.minPrice,
        maxPrice: ag.maxPrice == null ? 0 : ag.maxPrice,
        priceVolatilityIndex: volatility,
        market: market || null // foreign key resolution
      });
    }

    // sort
    let internalSortBy = sortBy || 'averageSellingPrice';
    if (internalSortBy === 'average_selling_price') internalSortBy = 'averageSellingPrice';
    this._sortArray(marketRows, internalSortBy, sortOrder || 'asc');

    const tsArray = [];
    for (const mId in timeSeriesByMarket) {
      const market = marketMap[mId];
      tsArray.push({
        marketId: mId,
        marketName: market ? market.name : null,
        points: timeSeriesByMarket[mId]
      });
    }

    return {
      unit: unit || 'per_quintal',
      marketRows: marketRows,
      timeSeriesByMarket: tsArray
    };
  }

  // -------------------- createPriceAlert --------------------

  createPriceAlert(cropId, marketId, conditionType, thresholdPrice, priceUnit, validityType, validFrom, validTo, primaryNotificationMethod) {
    const alerts = this._getFromStorage('price_alerts');
    const id = this._generateId('price_alert');

    const alert = {
      id: id,
      crop_id: cropId,
      market_id: marketId,
      condition_type: conditionType,
      threshold_price: thresholdPrice,
      price_unit: priceUnit,
      validity_type: validityType || 'anytime',
      valid_from: validFrom || null,
      valid_to: validTo || null,
      primary_notification_method: primaryNotificationMethod,
      is_active: true,
      created_at: this._formatDate(new Date())
    };

    alerts.push(alert);
    this._saveToStorage('price_alerts', alerts);

    return { success: true, alertId: id, message: 'Alert created' };
  }

  // -------------------- getMarketDetailOverview --------------------

  getMarketDetailOverview(marketId, cropId, startDate, endDate) {
    const markets = this._getFromStorage('markets');
    const crops = this._getFromStorage('crops');
    const districts = this._getFromStorage('districts');
    const tags = this._getFromStorage('tags');
    const tagAssignments = this._getFromStorage('market_tag_assignments');
    const prices = this._getFromStorage('market_prices');

    const market = this._findById(markets, marketId);
    const crop = this._findById(crops, cropId);
    const district = market && market.district_id ? this._findById(districts, market.district_id) : null;

    const priceHistory = [];
    let sum = 0;
    let count = 0;
    let minPrice = null;
    let maxPrice = null;
    let volatility = 0;
    const series = [];

    for (let i = 0; i < prices.length; i++) {
      const p = prices[i];
      if (p.market_id !== marketId || p.crop_id !== cropId) continue;
      const d = p.date;
      if (startDate && this._compareDates(d, startDate) < 0) continue;
      if (endDate && this._compareDates(d, endDate) > 0) continue;
      const avg = typeof p.average_price === 'number'
        ? p.average_price
        : (typeof p.min_price === 'number' && typeof p.max_price === 'number')
          ? (p.min_price + p.max_price) / 2
          : null;
      if (avg != null) {
        sum += avg;
        count++;
        if (minPrice == null || avg < minPrice) minPrice = avg;
        if (maxPrice == null || avg > maxPrice) maxPrice = avg;
        series.push(avg);
        priceHistory.push({ date: d, averagePrice: avg });
      }
    }

    if (series.length > 1) {
      let sums = 0;
      for (let i = 0; i < series.length; i++) sums += series[i];
      const mean = sums / series.length;
      let sq = 0;
      for (let i = 0; i < series.length; i++) {
        const diff = series[i] - mean;
        sq += diff * diff;
      }
      volatility = Math.sqrt(sq / series.length);
    }

    const averagePrice = count > 0 ? sum / count : 0;

    // Resolve tags
    const tagIds = [];
    for (let i = 0; i < tagAssignments.length; i++) {
      const ta = tagAssignments[i];
      if (ta.market_id === marketId) tagIds.push(ta.tag_id);
    }
    const resolvedTags = [];
    for (let i = 0; i < tags.length; i++) {
      if (tagIds.indexOf(tags[i].id) !== -1) resolvedTags.push(tags[i]);
    }

    return {
      marketId: market ? market.id : marketId,
      marketName: market ? market.name : null,
      districtName: district ? district.name : null,
      cropId: crop ? crop.id : cropId,
      cropName: crop ? crop.name : null,
      priceUnit: (prices[0] && prices[0].unit) || (crop ? crop.default_price_unit : null) || 'per_quintal',
      overviewMetrics: {
        averagePrice: averagePrice,
        minPrice: minPrice == null ? 0 : minPrice,
        maxPrice: maxPrice == null ? 0 : maxPrice,
        volatilityIndex: volatility
      },
      priceHistory: priceHistory,
      tags: resolvedTags,
      market: market || null,
      crop: crop || null
    };
  }

  // -------------------- updateMarketTags --------------------

  updateMarketTags(marketId, tagIds) {
    tagIds = Array.isArray(tagIds) ? tagIds : [];
    const tags = this._getFromStorage('tags');
    const assignments = this._getFromStorage('market_tag_assignments');

    // Remove existing assignments for this market that are not in tagIds
    const remaining = [];
    for (let i = 0; i < assignments.length; i++) {
      const a = assignments[i];
      if (a.market_id === marketId && tagIds.indexOf(a.tag_id) === -1) {
        continue;
      }
      remaining.push(a);
    }

    // Existing tag IDs after removal
    const existingIds = {};
    for (let i = 0; i < remaining.length; i++) {
      const a = remaining[i];
      if (a.market_id === marketId) existingIds[a.tag_id] = true;
    }

    const now = this._formatDate(new Date());
    for (let i = 0; i < tagIds.length; i++) {
      const tid = tagIds[i];
      if (existingIds[tid]) continue;
      remaining.push({
        id: this._generateId('market_tag_assignment'),
        market_id: marketId,
        tag_id: tid,
        added_at: now
      });
    }

    this._saveToStorage('market_tag_assignments', remaining);

    const assignedTags = [];
    for (let i = 0; i < tags.length; i++) {
      if (tagIds.indexOf(tags[i].id) !== -1) assignedTags.push(tags[i]);
    }

    return { success: true, assignedTags: assignedTags, message: 'Market tags updated' };
  }

  // -------------------- getHarvestForecastFilterOptions --------------------

  getHarvestForecastFilterOptions() {
    const crops = this._getFromStorage('crops');
    const next7 = this._resolvePeriodPresetDates('next_7_days');
    const next30 = this._resolvePeriodPresetDates('next_30_days');
    return {
      crops: crops,
      forecastPeriodPresets: [
        { key: 'next_7_days', label: 'Next 7 days', startDate: next7.startDate, endDate: next7.endDate },
        { key: 'next_30_days', label: 'Next 30 days', startDate: next30.startDate, endDate: next30.endDate }
      ],
      viewModes: [
        { key: 'by_collection_center', label: 'By collection center' },
        { key: 'by_district', label: 'By district' }
      ]
    };
  }

  // -------------------- getHarvestForecastView --------------------

  getHarvestForecastView(cropId, startDate, endDate, viewMode, sortBy, sortOrder) {
    const forecasts = this._getFromStorage('harvest_forecasts');
    const centers = this._getFromStorage('collection_centers');
    const districts = this._getFromStorage('districts');

    const centerMap = {};
    for (let i = 0; i < centers.length; i++) centerMap[centers[i].id] = centers[i];
    const districtMap = {};
    for (let i = 0; i < districts.length; i++) districtMap[districts[i].id] = districts[i];

    const rowsByCollectionCenter = [];
    const byDistrictMap = {};

    for (let i = 0; i < forecasts.length; i++) {
      const f = forecasts[i];
      if (f.crop_id !== cropId) continue;
      const d = f.forecast_date || f.forecastDate;
      if (startDate && this._compareDates(d, startDate) < 0) continue;
      if (endDate && this._compareDates(d, endDate) > 0) continue;
      const center = centerMap[f.collection_center_id];
      const district = center && center.district_id ? districtMap[center.district_id] : null;

      if (!viewMode || viewMode === 'by_collection_center') {
        rowsByCollectionCenter.push({
          collectionCenterId: f.collection_center_id,
          collectionCenterName: center ? center.name : null,
          districtName: district ? district.name : null,
          expectedHarvestKg: f.expected_harvest_kg || 0,
          collectionCenter: center || null
        });
      }

      if (!viewMode || viewMode === 'by_district') {
        const did = district ? district.id : null;
        if (!did) continue;
        if (!byDistrictMap[did]) {
          byDistrictMap[did] = {
            districtId: did,
            districtName: district.name,
            expectedHarvestKg: 0,
            district: district
          };
        }
        if (typeof f.expected_harvest_kg === 'number') {
          byDistrictMap[did].expectedHarvestKg += f.expected_harvest_kg;
        }
      }
    }

    let rowsByDistrict = [];
    for (const did in byDistrictMap) {
      rowsByDistrict.push(byDistrictMap[did]);
    }

    const sField = sortBy || 'expectedHarvestKg';
    const sOrder = sortOrder || 'desc';
    this._sortArray(rowsByCollectionCenter, sField, sOrder);
    this._sortArray(rowsByDistrict, sField, sOrder);

    return {
      unit: 'kg',
      rowsByCollectionCenter: rowsByCollectionCenter,
      rowsByDistrict: rowsByDistrict
    };
  }

  // -------------------- getCollectionCenterDetail --------------------

  getCollectionCenterDetail(collectionCenterId) {
    const centers = this._getFromStorage('collection_centers');
    const districts = this._getFromStorage('districts');
    const forecasts = this._getFromStorage('harvest_forecasts');
    const crops = this._getFromStorage('crops');

    const center = this._findById(centers, collectionCenterId);
    if (!center) {
      return {
        collectionCenterId: collectionCenterId,
        name: null,
        code: null,
        address: null,
        districtName: null,
        capacityKg: null,
        isActive: null,
        forecastByCrop: []
      };
    }

    const district = center.district_id ? this._findById(districts, center.district_id) : null;
    const cropMap = {};
    for (let i = 0; i < crops.length; i++) cropMap[crops[i].id] = crops[i];

    const agg = {};
    for (let i = 0; i < forecasts.length; i++) {
      const f = forecasts[i];
      if (f.collection_center_id !== collectionCenterId) continue;
      const key = f.crop_id + '_' + (f.forecast_date || f.forecastDate);
      if (!agg[key]) {
        agg[key] = {
          cropId: f.crop_id,
          forecastDate: f.forecast_date || f.forecastDate,
          expectedHarvestKg: 0
        };
      }
      if (typeof f.expected_harvest_kg === 'number') agg[key].expectedHarvestKg += f.expected_harvest_kg;
    }

    const forecastByCrop = [];
    for (const key in agg) {
      const v = agg[key];
      const crop = cropMap[v.cropId];
      forecastByCrop.push({
        cropId: v.cropId,
        cropName: crop ? crop.name : null,
        forecastDate: v.forecastDate,
        expectedHarvestKg: v.expectedHarvestKg,
        crop: crop || null
      });
    }

    return {
      collectionCenterId: center.id,
      name: center.name,
      code: center.code || null,
      address: center.address || null,
      districtName: district ? district.name : null,
      capacityKg: center.capacity_kg || null,
      isActive: center.is_active !== false,
      forecastByCrop: forecastByCrop
    };
  }

  // -------------------- getCollectionCenterLogisticsSummary --------------------

  getCollectionCenterLogisticsSummary(collectionCenterId, startDate, endDate) {
    const schedules = this._getFromStorage('pickup_schedules');
    const vehicles = this._getFromStorage('vehicles');
    const centers = this._getFromStorage('collection_centers');
    const crops = this._getFromStorage('crops');

    const vehicleMap = {};
    for (let i = 0; i < vehicles.length; i++) vehicleMap[vehicles[i].id] = vehicles[i];
    const center = this._findById(centers, collectionCenterId);
    const cropMap = {};
    for (let i = 0; i < crops.length; i++) cropMap[crops[i].id] = crops[i];

    const today = new Date();
    const todayStr = this._formatDate(today);
    const sDate = startDate || todayStr;
    const eDate = endDate || null;

    const upcomingPickups = [];
    const pastPickups = [];

    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (s.collection_center_id !== collectionCenterId) continue;
      const d = s.pickup_date || s.pickupDate;
      if (sDate && this._compareDates(d, sDate) < 0) continue;
      if (eDate && this._compareDates(d, eDate) > 0) continue;
      const vehicle = vehicleMap[s.vehicle_id];
      const crop = s.crop_id ? cropMap[s.crop_id] : null;
      const scheduleObj = {
        id: s.id,
        collectionCenterId: s.collection_center_id,
        vehicleId: s.vehicle_id,
        cropId: s.crop_id || null,
        pickupDate: d,
        plannedQuantityKg: s.planned_quantity_kg || 0,
        status: s.status,
        createdAt: s.created_at || null,
        collectionCenter: center || null,
        vehicle: vehicle || null,
        crop: crop || null
      };
      if (this._compareDates(d, todayStr) >= 0) {
        upcomingPickups.push(scheduleObj);
      } else {
        pastPickups.push(scheduleObj);
      }
    }

    // Available vehicles: currently active vehicles
    const availableVehicles = vehicles.filter(function (v) { return v.status === 'active'; });

    // Earliest available pickup date: max(today, startDate)
    const earliest = this._compareDates(sDate, todayStr) >= 0 ? sDate : todayStr;

    return {
      upcomingPickups: upcomingPickups,
      pastPickups: pastPickups,
      availableVehicles: availableVehicles,
      earliestAvailablePickupDate: earliest
    };
  }

  // -------------------- schedulePickup --------------------

  schedulePickup(collectionCenterId, vehicleId, cropId, pickupDate, plannedQuantityKg) {
    const schedules = this._getFromStorage('pickup_schedules');
    const id = this._generateId('pickup_schedule');
    const schedule = {
      id: id,
      collection_center_id: collectionCenterId,
      vehicle_id: vehicleId,
      crop_id: cropId || null,
      pickup_date: pickupDate,
      planned_quantity_kg: typeof plannedQuantityKg === 'number' ? plannedQuantityKg : null,
      status: 'scheduled',
      created_at: this._formatDate(new Date())
    };
    schedules.push(schedule);
    this._saveToStorage('pickup_schedules', schedules);
    return { success: true, pickupScheduleId: id, message: 'Pickup scheduled' };
  }

  // -------------------- getMembershipAnalyticsFilterOptions --------------------

  getMembershipAnalyticsFilterOptions() {
    return {
      aggregationLevels: [
        { key: 'monthly', label: 'Monthly' },
        { key: 'quarterly', label: 'Quarterly' }
      ],
      metrics: [
        { key: 'new_registrations', label: 'New registrations' },
        { key: 'active_members', label: 'Active members' }
      ]
    };
  }

  // -------------------- getMembershipAnalyticsView --------------------

  getMembershipAnalyticsView(startDate, endDate, aggregationLevel, metric, sortBy, sortOrder) {
    const farmers = this._getFromStorage('farmers');
    const sDate = this._parseDate(startDate);
    const eDate = this._parseDate(endDate);
    if (!sDate || !eDate) {
      return { summaryChart: { series: [] }, periodRows: [] };
    }

    const periodRows = [];

    if (aggregationLevel === 'monthly') {
      // iterate months from sDate to eDate
      const cursor = new Date(sDate.getFullYear(), sDate.getMonth(), 1);
      while (cursor.getTime() <= eDate.getTime()) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const periodStart = new Date(year, month, 1);
        const periodEnd = new Date(year, month + 1, 0);
        if (periodEnd.getTime() < sDate.getTime()) {
          cursor.setMonth(cursor.getMonth() + 1);
          continue;
        }
        if (periodStart.getTime() > eDate.getTime()) break;
        const periodKey = year + '-' + String(month + 1).padStart(2, '0');
        const periodLabel = cursor.toLocaleString('en-GB', { month: 'short', year: 'numeric' });
        const row = this._computeMembershipPeriodRow(farmers, periodStart, periodEnd, periodKey, periodLabel);
        periodRows.push(row);
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else if (aggregationLevel === 'quarterly') {
      const cursor = new Date(sDate.getFullYear(), sDate.getMonth(), 1);
      while (cursor.getTime() <= eDate.getTime()) {
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        const quarter = Math.floor(month / 3) + 1;
        const qStartMonth = (quarter - 1) * 3;
        const periodStart = new Date(year, qStartMonth, 1);
        const periodEnd = new Date(year, qStartMonth + 3, 0);
        if (periodEnd.getTime() < sDate.getTime()) {
          cursor.setMonth(cursor.getMonth() + 3);
          continue;
        }
        if (periodStart.getTime() > eDate.getTime()) break;
        const periodKey = year + '-Q' + quarter;
        const periodLabel = 'Q' + quarter + ' ' + year;
        const row = this._computeMembershipPeriodRow(farmers, periodStart, periodEnd, periodKey, periodLabel);
        periodRows.push(row);
        cursor.setMonth(cursor.getMonth() + 3);
      }
    }

    let sField = sortBy || (metric === 'active_members' ? 'activeMembers' : 'newRegistrations');
    if (sField === 'new_registrations') sField = 'newRegistrations';
    if (sField === 'active_members') sField = 'activeMembers';
    this._sortArray(periodRows, sField, sortOrder || 'desc');

    const values = [];
    for (let i = 0; i < periodRows.length; i++) {
      values.push(metric === 'active_members' ? periodRows[i].activeMembers : periodRows[i].newRegistrations);
    }

    return {
      summaryChart: {
        series: [
          {
            label: metric === 'active_members' ? 'Active members' : 'New registrations',
            values: values
          }
        ]
      },
      periodRows: periodRows
    };
  }

  _computeMembershipPeriodRow(farmers, periodStart, periodEnd, periodKey, periodLabel) {
    const startStr = this._formatDate(periodStart);
    const endStr = this._formatDate(periodEnd);
    let newRegistrations = 0;
    let activeMembers = 0;
    for (let i = 0; i < farmers.length; i++) {
      const f = farmers[i];
      const rd = f.registration_date || f.registrationDate;
      if (rd && this._compareDates(rd, startStr) >= 0 && this._compareDates(rd, endStr) <= 0) {
        newRegistrations++;
      }
      const isActive = f.membership_status === 'active';
      if (isActive) {
        if (!rd || this._compareDates(rd, endStr) <= 0) {
          activeMembers++;
        }
      }
    }
    return {
      periodKey: periodKey,
      periodLabel: periodLabel,
      newRegistrations: newRegistrations,
      activeMembers: activeMembers
    };
  }

  // -------------------- getMembershipMonthDetail --------------------

  getMembershipMonthDetail(periodKey) {
    const farmers = this._getFromStorage('farmers');
    const districts = this._getFromStorage('districts');

    let periodStart = null;
    let periodEnd = null;
    let periodLabel = periodKey;

    if (/^\d{4}-\d{2}$/.test(periodKey)) {
      const year = parseInt(periodKey.substring(0, 4), 10);
      const month = parseInt(periodKey.substring(5, 7), 10) - 1;
      periodStart = new Date(year, month, 1);
      periodEnd = new Date(year, month + 1, 0);
      periodLabel = periodStart.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    } else if (/^\d{4}-Q[1-4]$/.test(periodKey)) {
      const year = parseInt(periodKey.substring(0, 4), 10);
      const quarter = parseInt(periodKey.substring(6, 7), 10);
      const qStartMonth = (quarter - 1) * 3;
      periodStart = new Date(year, qStartMonth, 1);
      periodEnd = new Date(year, qStartMonth + 3, 0);
      periodLabel = 'Q' + quarter + ' ' + year;
    } else {
      // Fallback: treat as month key  
      const d = this._parseDate(periodKey + '-01');
      if (d) {
        periodStart = new Date(d.getFullYear(), d.getMonth(), 1);
        periodEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      } else {
        return {
          periodKey: periodKey,
          periodLabel: periodKey,
          newRegistrations: 0,
          activeMembers: 0,
          churnedMembers: 0,
          topDistrictsByRegistrations: []
        };
      }
    }

    const startStr = this._formatDate(periodStart);
    const endStr = this._formatDate(periodEnd);

    let newRegistrations = 0;
    let activeMembers = 0;
    let churnedMembers = 0;
    const regByDistrict = {};

    for (let i = 0; i < farmers.length; i++) {
      const f = farmers[i];
      const rd = f.registration_date || f.registrationDate;
      if (rd && this._compareDates(rd, startStr) >= 0 && this._compareDates(rd, endStr) <= 0) {
        newRegistrations++;
        const did = f.district_id;
        if (did) {
          if (!regByDistrict[did]) regByDistrict[did] = 0;
          regByDistrict[did]++;
        }
      }
      if (f.membership_status === 'active') {
        if (!rd || this._compareDates(rd, endStr) <= 0) activeMembers++;
      } else if (f.membership_status === 'inactive' || f.membership_status === 'suspended') {
        // Approximate churned as non-active with registration before period
        if (rd && this._compareDates(rd, endStr) <= 0) churnedMembers++;
      }
    }

    const districtMap = {};
    for (let i = 0; i < districts.length; i++) districtMap[districts[i].id] = districts[i];
    const topDistricts = [];
    for (const did in regByDistrict) {
      const dist = districtMap[did];
      topDistricts.push({
        districtName: dist ? dist.name : null,
        newRegistrations: regByDistrict[did]
      });
    }
    this._sortArray(topDistricts, 'newRegistrations', 'desc');

    return {
      periodKey: periodKey,
      periodLabel: periodLabel,
      newRegistrations: newRegistrations,
      activeMembers: activeMembers,
      churnedMembers: churnedMembers,
      topDistrictsByRegistrations: topDistricts
    };
  }

  // -------------------- pinMembershipMonthToDashboard --------------------

  pinMembershipMonthToDashboard(periodKey, dashboardId) {
    const dashboards = this._getFromStorage('dashboards');
    const dashboard = this._findById(dashboards, dashboardId);
    if (!dashboard) {
      return { success: false, pinId: null, message: 'Dashboard not found' };
    }
    const pins = this._getFromStorage('dashboard_pins');
    const id = this._generateId('dashboard_pin');
    const detail = this.getMembershipMonthDetail(periodKey);
    const pin = {
      id: id,
      dashboard_id: dashboardId,
      item_type: 'membership_month_summary',
      item_ref: periodKey,
      title: detail.periodLabel,
      sort_order: pins.length + 1,
      created_at: this._formatDate(new Date())
    };
    pins.push(pin);
    this._saveToStorage('dashboard_pins', pins);
    return { success: true, pinId: id, message: 'Pinned to dashboard' };
  }

  // -------------------- getReportsAndTemplatesList --------------------

  getReportsAndTemplatesList() {
    const templates = this._getFromStorage('report_templates');
    return { templates: templates };
  }

  // -------------------- getReportBuilderOptions --------------------

  getReportBuilderOptions() {
    return {
      dataSources: [
        { key: 'sales_revenue', label: 'Sales & Revenue' },
        { key: 'production', label: 'Production' },
        { key: 'membership', label: 'Membership' },
        { key: 'inventory', label: 'Inventory' },
        { key: 'payments', label: 'Payments' }
      ],
      productCategories: [
        { key: 'dairy', label: 'Dairy' },
        { key: 'fertilizer', label: 'Fertilizer' },
        { key: 'grain', label: 'Grain' },
        { key: 'vegetable', label: 'Vegetable' },
        { key: 'fruit', label: 'Fruit' },
        { key: 'input', label: 'Input' },
        { key: 'other', label: 'Other' }
      ],
      groupByDimensions: [
        { key: 'district', label: 'District' },
        { key: 'market', label: 'Market' },
        { key: 'crop', label: 'Crop' },
        { key: 'farmer', label: 'Farmer' },
        { key: 'warehouse', label: 'Warehouse' },
        { key: 'collection_center', label: 'Collection center' },
        { key: 'month', label: 'Month' }
      ],
      availableMetrics: [
        { key: 'total_revenue', label: 'Total revenue', unit: '₹' },
        { key: 'quantity_sold', label: 'Quantity sold', unit: 'units' }
      ]
    };
  }

  // -------------------- runSalesRevenueReport --------------------

  runSalesRevenueReport(startDate, endDate, productCategory, groupByDimension, metrics, minRevenueFilter) {
    metrics = Array.isArray(metrics) ? metrics : ['total_revenue'];
    const data = this._getFromStorage('sales_revenue');
    const districts = this._getFromStorage('districts');
    const markets = this._getFromStorage('markets');
    const crops = this._getFromStorage('crops');
    const farmers = this._getFromStorage('farmers');
    const warehouses = this._getFromStorage('warehouses');
    const centers = this._getFromStorage('collection_centers');

    const districtMap = {};
    for (let i = 0; i < districts.length; i++) districtMap[districts[i].id] = districts[i];
    const marketMap = {};
    for (let i = 0; i < markets.length; i++) marketMap[markets[i].id] = markets[i];
    const cropMap = {};
    for (let i = 0; i < crops.length; i++) cropMap[crops[i].id] = crops[i];
    const farmerMap = {};
    for (let i = 0; i < farmers.length; i++) farmerMap[farmers[i].id] = farmers[i];
    const warehouseMap = {};
    for (let i = 0; i < warehouses.length; i++) warehouseMap[warehouses[i].id] = warehouses[i];
    const centerMap = {};
    for (let i = 0; i < centers.length; i++) centerMap[centers[i].id] = centers[i];

    const agg = {};

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      if (row.product_category !== productCategory) continue;
      const d = row.date;
      if (startDate && this._compareDates(d, startDate) < 0) continue;
      if (endDate && this._compareDates(d, endDate) > 0) continue;

      let groupKey = null;
      let groupLabel = null;

      if (groupByDimension === 'district') {
        groupKey = row.district_id;
        const dist = groupKey ? districtMap[groupKey] : null;
        groupLabel = dist ? dist.name : null;
      } else if (groupByDimension === 'market') {
        groupKey = row.market_id;
        const m = groupKey ? marketMap[groupKey] : null;
        groupLabel = m ? m.name : null;
      } else if (groupByDimension === 'crop') {
        groupKey = row.crop_id;
        const c = groupKey ? cropMap[groupKey] : null;
        groupLabel = c ? c.name : null;
      } else if (groupByDimension === 'farmer') {
        groupKey = row.farmer_id;
        const f = groupKey ? farmerMap[groupKey] : null;
        groupLabel = f ? f.name : null;
      } else if (groupByDimension === 'warehouse') {
        groupKey = row.warehouse_id;
        const w = groupKey ? warehouseMap[groupKey] : null;
        groupLabel = w ? w.name : null;
      } else if (groupByDimension === 'collection_center') {
        groupKey = row.collection_center_id;
        const c2 = groupKey ? centerMap[groupKey] : null;
        groupLabel = c2 ? c2.name : null;
      } else if (groupByDimension === 'month') {
        const dt = this._parseDate(d);
        if (dt) {
          const pk = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
          groupKey = pk;
          groupLabel = pk;
        }
      }

      if (!groupKey) continue;

      if (!agg[groupKey]) {
        agg[groupKey] = {
          groupKey: groupKey,
          groupLabel: groupLabel,
          totalRevenue: 0
        };
      }
      const revenue = typeof row.total_revenue === 'number' ? row.total_revenue : (typeof row.revenue === 'number' ? row.revenue : 0);
      agg[groupKey].totalRevenue += revenue;
    }

    let rows = [];
    for (const gk in agg) {
      rows.push(agg[gk]);
    }

    if (typeof minRevenueFilter === 'number') {
      rows = rows.filter(function (r) { return r.totalRevenue >= minRevenueFilter; });
    }

    return {
      groupByDimension: groupByDimension,
      rows: rows
    };
  }

  // -------------------- saveReportTemplateFromCurrentConfig --------------------

  saveReportTemplateFromCurrentConfig(name, dataSource, startDate, endDate, productCategory, groupByDimension, metrics, minRevenueFilter, extraConfig) {
    const templates = this._getFromStorage('report_templates');
    const id = this._generateId('report_template');
    const template = {
      id: id,
      name: name,
      data_source: dataSource,
      start_date: startDate || null,
      end_date: endDate || null,
      product_category: productCategory || null,
      group_by_dimension: groupByDimension || null,
      metrics: Array.isArray(metrics) ? metrics : [],
      min_revenue_filter: typeof minRevenueFilter === 'number' ? minRevenueFilter : null,
      config_json: extraConfig ? JSON.stringify(extraConfig) : null,
      created_at: this._formatDate(new Date()),
      last_run_at: null
    };
    templates.push(template);
    this._saveToStorage('report_templates', templates);
    return { success: true, templateId: id, message: 'Template saved' };
  }

  // -------------------- getInventoryFilterOptions --------------------

  getInventoryFilterOptions() {
    return {
      productCategories: [
        { key: 'dairy', label: 'Dairy' },
        { key: 'fertilizer', label: 'Fertilizer' },
        { key: 'grain', label: 'Grain' },
        { key: 'vegetable', label: 'Vegetable' },
        { key: 'fruit', label: 'Fruit' },
        { key: 'input', label: 'Input' },
        { key: 'other', label: 'Other' }
      ],
      viewModes: [
        { key: 'by_warehouse', label: 'By warehouse' },
        { key: 'by_product', label: 'By product' }
      ]
    };
  }

  // -------------------- getInventoryOverviewByWarehouse --------------------

  getInventoryOverviewByWarehouse(productCategory, asOfDate, sortBy, sortOrder) {
    const warehouses = this._getFromStorage('warehouses');
    const districts = this._getFromStorage('districts');
    const latestByWarehouse = this._getCurrentInventorySnapshot(productCategory, asOfDate);

    const districtMap = {};
    for (let i = 0; i < districts.length; i++) districtMap[districts[i].id] = districts[i];

    const warehouseRows = [];
    let unit = 'bags';
    for (let i = 0; i < warehouses.length; i++) {
      const w = warehouses[i];
      const snap = latestByWarehouse[w.id];
      if (!snap) continue;
      const dist = w.district_id ? districtMap[w.district_id] : null;
      unit = snap.unit || unit;
      warehouseRows.push({
        warehouseId: w.id,
        warehouseName: w.name,
        districtName: dist ? dist.name : null,
        currentStock: snap.quantity || 0,
        warehouse: w
      });
    }

    let sField = sortBy || 'currentStock';
    if (sField === 'current_stock_bags') sField = 'currentStock';
    this._sortArray(warehouseRows, sField, sortOrder || 'desc');

    return {
      unit: unit,
      warehouseRows: warehouseRows
    };
  }

  // -------------------- getWarehouseDetail --------------------

  getWarehouseDetail(warehouseId) {
    const warehouses = this._getFromStorage('warehouses');
    const districts = this._getFromStorage('districts');
    const snapshots = this._getFromStorage('inventory_snapshots');

    const w = this._findById(warehouses, warehouseId);
    if (!w) {
      return {
        warehouseId: warehouseId,
        name: null,
        code: null,
        address: null,
        districtName: null,
        isActive: null,
        stocksByProductCategory: []
      };
    }

    const district = w.district_id ? this._findById(districts, w.district_id) : null;

    // Latest snapshot per product category
    const latestByCategory = {};
    for (let i = 0; i < snapshots.length; i++) {
      const s = snapshots[i];
      if (s.warehouse_id !== warehouseId) continue;
      const key = s.product_category;
      const d = this._parseDate(s.as_of_date || s.as_ofDate);
      if (!latestByCategory[key]) {
        latestByCategory[key] = s;
      } else {
        const existing = latestByCategory[key];
        const ed = this._parseDate(existing.as_of_date || existing.as_ofDate);
        if (d && ed && d.getTime() > ed.getTime()) latestByCategory[key] = s;
      }
    }

    const stocks = [];
    for (const cat in latestByCategory) {
      const s = latestByCategory[cat];
      stocks.push({
        productCategory: s.product_category,
        quantity: s.quantity,
        unit: s.unit
      });
    }

    return {
      warehouseId: w.id,
      name: w.name,
      code: w.code || null,
      address: w.address || null,
      districtName: district ? district.name : null,
      isActive: w.is_active !== false,
      stocksByProductCategory: stocks
    };
  }

  // -------------------- getWarehouseInventory --------------------

  getWarehouseInventory(warehouseId, asOfDate) {
    const snapshots = this._getFromStorage('inventory_snapshots');
    const targetDate = asOfDate ? this._parseDate(asOfDate) : new Date();

    const latestByCategory = {};
    for (let i = 0; i < snapshots.length; i++) {
      const s = snapshots[i];
      if (s.warehouse_id !== warehouseId) continue;
      const d = this._parseDate(s.as_of_date || s.as_ofDate);
      if (!d || d.getTime() > targetDate.getTime()) continue;
      const key = s.product_category;
      if (!latestByCategory[key]) {
        latestByCategory[key] = s;
      } else {
        const existing = latestByCategory[key];
        const ed = this._parseDate(existing.as_of_date || existing.as_ofDate);
        if (d && ed && d.getTime() > ed.getTime()) latestByCategory[key] = s;
      }
    }

    const result = [];
    for (const cat in latestByCategory) {
      result.push(latestByCategory[cat]);
    }
    return result;
  }

  // -------------------- getTransferDestinationWarehouseOptions --------------------

  getTransferDestinationWarehouseOptions(productCategory, sortByStock) {
    const warehouses = this._getFromStorage('warehouses');
    const latestByWarehouse = this._getCurrentInventorySnapshot(productCategory, null);

    const rows = [];
    for (let i = 0; i < warehouses.length; i++) {
      const w = warehouses[i];
      const snap = latestByWarehouse[w.id];
      const stock = snap ? snap.quantity || 0 : 0;
      rows.push({
        warehouseId: w.id,
        warehouseName: w.name,
        currentStock: stock,
        warehouse: w
      });
    }

    const order = sortByStock === 'high_to_low' ? 'desc' : 'asc';
    this._sortArray(rows, 'currentStock', order);
    return rows;
  }

  // -------------------- createInventoryTransfer --------------------

  createInventoryTransfer(productCategory, sourceWarehouseId, destinationWarehouseId, quantity, unit, transferDate, status) {
    const transfers = this._getFromStorage('inventory_transfers');
    const id = this._generateId('inventory_transfer');
    const transfer = {
      id: id,
      product_category: productCategory,
      source_warehouse_id: sourceWarehouseId,
      destination_warehouse_id: destinationWarehouseId,
      quantity: quantity,
      unit: unit,
      transfer_date: transferDate,
      status: status || 'planned',
      created_at: this._formatDate(new Date())
    };
    transfers.push(transfer);
    this._saveToStorage('inventory_transfers', transfers);
    return { success: true, inventoryTransferId: id, message: 'Inventory transfer created' };
  }

  // -------------------- getPaymentsFilterOptions --------------------

  getPaymentsFilterOptions() {
    return {
      statusTabs: [
        { key: 'pending', label: 'Pending' },
        { key: 'completed', label: 'Completed' },
        { key: 'overdue', label: 'Overdue' }
      ],
      overduePresets: [
        { key: 'over_30_days', label: 'Over 30 days overdue', minDaysOverdue: 30 },
        { key: 'over_60_days', label: 'Over 60 days overdue', minDaysOverdue: 60 },
        { key: 'over_90_days', label: 'Over 90 days overdue', minDaysOverdue: 90 }
      ]
    };
  }

  // -------------------- getPendingPaymentsView --------------------

  getPendingPaymentsView(status, overduePresetKey, sortBy, sortOrder, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 25;
    const payments = this._getFromStorage('payments');
    const farmers = this._getFromStorage('farmers');

    const farmersMap = {};
    for (let i = 0; i < farmers.length; i++) farmersMap[farmers[i].id] = farmers[i];

    let minDaysOverdue = 0;
    if (overduePresetKey) {
      const options = this.getPaymentsFilterOptions();
      for (let i = 0; i < options.overduePresets.length; i++) {
        const p = options.overduePresets[i];
        if (p.key === overduePresetKey) {
          minDaysOverdue = p.minDaysOverdue;
          break;
        }
      }
    }

    const today = new Date();
    const todayStr = this._formatDate(today);

    const rows = [];
    for (let i = 0; i < payments.length; i++) {
      const p = payments[i];
      // status filter: when status === 'pending', include pending, overdue, partially_paid
      if (status === 'pending') {
        if (!(p.status === 'pending' || p.status === 'overdue' || p.status === 'partially_paid')) continue;
      } else if (status && p.status !== status) {
        continue;
      }
      const dueDate = p.due_date || p.dueDate;
      let daysOverdue = typeof p.days_overdue === 'number' ? p.days_overdue : null;
      if (daysOverdue == null) {
        const dd = this._parseDate(dueDate);
        if (dd) {
          const diffMs = today.getTime() - dd.getTime();
          daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        } else {
          daysOverdue = 0;
        }
      }
      if (minDaysOverdue && daysOverdue < minDaysOverdue) continue;
      const farmer = farmersMap[p.farmer_id];
      rows.push({
        paymentId: p.id,
        farmerId: p.farmer_id,
        farmerName: farmer ? farmer.name : null,
        invoiceNumber: p.invoice_number || null,
        amount: p.amount || 0,
        dueDate: dueDate,
        daysOverdue: daysOverdue,
        farmer: farmer || null
      });
    }

    let sField = sortBy || 'dueDate';
    if (sField === 'due_date') sField = 'dueDate';
    this._sortArray(rows, sField, sortOrder || 'asc');

    const totalCount = rows.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paged = rows.slice(startIndex, endIndex);

    return {
      totalCount: totalCount,
      page: page,
      pageSize: pageSize,
      payments: paged
    };
  }

  // -------------------- getFavoriteItems --------------------

  getFavoriteItems() {
    const favorites = this._getFromStorage('favorite_items');
    const grouped = {};
    for (let i = 0; i < favorites.length; i++) {
      const f = favorites[i];
      const t = f.item_type;
      if (!grouped[t]) grouped[t] = [];
      grouped[t].push({
        favoriteId: f.id,
        label: f.label || '',
        itemRef: f.item_ref,
        createdAt: f.created_at || ''
      });
    }
    const favoritesByType = [];
    for (const t in grouped) {
      favoritesByType.push({
        itemType: t,
        items: grouped[t]
      });
    }
    return { favoritesByType: favoritesByType };
  }

  // -------------------- removeFavoriteItem --------------------

  removeFavoriteItem(favoriteId) {
    let favorites = this._getFromStorage('favorite_items');
    const before = favorites.length;
    favorites = favorites.filter(function (f) { return f.id !== favoriteId; });
    this._saveToStorage('favorite_items', favorites);
    const removed = before !== favorites.length;
    return { success: removed, message: removed ? 'Favorite removed' : 'Favorite not found' };
  }

  // -------------------- getAlertsList --------------------

  getAlertsList(includeInactive) {
    if (typeof includeInactive !== 'boolean') includeInactive = true;
    const alerts = this._getFromStorage('price_alerts');
    const crops = this._getFromStorage('crops');
    const markets = this._getFromStorage('markets');

    const cropMap = {};
    for (let i = 0; i < crops.length; i++) cropMap[crops[i].id] = crops[i];
    const marketMap = {};
    for (let i = 0; i < markets.length; i++) marketMap[markets[i].id] = markets[i];

    const filtered = alerts.filter(function (a) { return includeInactive || a.is_active; });
    return filtered.map(function (a) {
      return Object.assign({}, a, {
        crop: cropMap[a.crop_id] || null,
        market: marketMap[a.market_id] || null
      });
    });
  }

  // -------------------- updatePriceAlertStatus --------------------

  updatePriceAlertStatus(alertId, isActive) {
    const alerts = this._getFromStorage('price_alerts');
    let found = false;
    for (let i = 0; i < alerts.length; i++) {
      if (alerts[i].id === alertId) {
        alerts[i].is_active = !!isActive;
        found = true;
        break;
      }
    }
    if (found) this._saveToStorage('price_alerts', alerts);
    return { success: found, message: found ? 'Alert status updated' : 'Alert not found' };
  }

  // -------------------- deletePriceAlert --------------------

  deletePriceAlert(alertId) {
    let alerts = this._getFromStorage('price_alerts');
    const before = alerts.length;
    alerts = alerts.filter(function (a) { return a.id !== alertId; });
    this._saveToStorage('price_alerts', alerts);
    const removed = before !== alerts.length;
    return { success: removed, message: removed ? 'Alert deleted' : 'Alert not found' };
  }

  // -------------------- getNotificationsFeed --------------------

  getNotificationsFeed(includeRead) {
    if (typeof includeRead !== 'boolean') includeRead = true;
    const notifications = this._getFromStorage('notifications');
    const filtered = notifications.filter(function (n) { return includeRead || !n.is_read; });
    // sort by created_at desc
    filtered.sort((a, b) => {
      const da = this._parseDate(a.created_at);
      const db = this._parseDate(b.created_at);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });
    return filtered;
  }

  // -------------------- markNotificationRead --------------------

  markNotificationRead(notificationId) {
    const notifications = this._getFromStorage('notifications');
    let found = false;
    for (let i = 0; i < notifications.length; i++) {
      if (notifications[i].id === notificationId) {
        notifications[i].is_read = true;
        found = true;
        break;
      }
    }
    if (found) this._saveToStorage('notifications', notifications);
    return { success: found };
  }

  // -------------------- getAboutContent --------------------

  getAboutContent() {
    return this._getObjectFromStorage('about_content');
  }

  // -------------------- getHelpTopics --------------------

  getHelpTopics() {
    const topics = this._getFromStorage('help_topics');
    return topics;
  }

  // -------------------- getHelpArticleDetail --------------------

  getHelpArticleDetail(topicId) {
    const articles = this._getFromStorage('help_articles');
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].topicId === topicId) return articles[i];
    }
    return { topicId: topicId, title: '', bodyMarkdown: '', relatedTasks: [] };
  }

  // -------------------- getSettings --------------------

  getSettings() {
    return this._getObjectFromStorage('settings');
  }

  // -------------------- updateSettings --------------------

  updateSettings(settings) {
    settings = settings || {};
    const current = this._getObjectFromStorage('settings');

    function merge(target, src) {
      for (const k in src) {
        if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
        const v = src[k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          if (!target[k]) target[k] = {};
          merge(target[k], v);
        } else {
          target[k] = v;
        }
      }
    }

    merge(current, settings);
    this._saveToStorage('settings', current);
    return { success: true, message: 'Settings updated' };
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
