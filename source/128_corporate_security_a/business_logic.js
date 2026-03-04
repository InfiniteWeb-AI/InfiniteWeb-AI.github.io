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

  // -------------------- INIT & STORAGE HELPERS --------------------

  _initStorage() {
    // Legacy/example keys from template
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Domain data tables
    const arrayKeys = [
      'sites',
      'locations',
      'service_offerings',
      'mobile_patrol_plans',
      'service_requests',
      'training_programs',
      'training_sessions',
      'training_bookings',
      'notification_rules',
      'monitoring_packages',
      'package_selections',
      'policies',
      'saved_resources',
      'contacts', // ContactDirectoryEntry
      'site_contact_lists',
      'technicians',
      'appointment_slots',
      'service_appointments',
      'incidents',
      'incident_compliance_reports',
      'dashboards',
      'dashboard_items',
      'quick_actions',
      'contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Object/config tables
    if (!localStorage.getItem('alarm_system_health_check_info')) {
      localStorage.setItem('alarm_system_health_check_info', JSON.stringify(null));
    }
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem('about_page_content', JSON.stringify(null));
    }
    if (!localStorage.getItem('contact_page_content')) {
      localStorage.setItem('contact_page_content', JSON.stringify(null));
    }
    if (!localStorage.getItem('user_context')) {
      localStorage.setItem('user_context', JSON.stringify(null));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue === 'undefined' ? [] : defaultValue;
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

  // -------------------- GENERIC HELPERS --------------------

  _parseTimeToMinutes(timeStr) {
    // timeStr: 'HH:MM'
    if (!timeStr || typeof timeStr !== 'string') return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  _formatTime(timeStr) {
    // Convert '22:00' to '10:00 PM'
    const minutes = this._parseTimeToMinutes(timeStr);
    if (minutes === null) return timeStr || '';
    let h24 = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    const mm = m < 10 ? '0' + m : String(m);
    return h12 + ':' + mm + ' ' + ampm;
  }

  _timeWindowIncludes(planStart, planEnd, reqStart, reqEnd) {
    // All inputs 'HH:MM', handle overnight windows (end < start)
    const ps = this._parseTimeToMinutes(planStart);
    const pe = this._parseTimeToMinutes(planEnd);
    const rs = this._parseTimeToMinutes(reqStart);
    const re = this._parseTimeToMinutes(reqEnd);
    if (ps === null || pe === null || rs === null || re === null) return false;

    const planOvernight = pe <= ps;
    const reqOvernight = re <= rs;

    const normalize = (min) => (min + 1440) % 1440;

    if (!planOvernight && !reqOvernight) {
      return ps <= rs && pe >= re;
    }

    // Convert all to range on circular 24h. We'll sample two points: rs and re, both must be within plan window.
    const inPlan = (t) => {
      const tn = normalize(t - ps);
      const en = normalize(pe - ps);
      return tn <= en;
    };

    return inPlan(rs) && inPlan(re);
  }

  _parseDate(dateStr) {
    // 'YYYY-MM-DD' -> Date at midnight UTC
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00Z');
  }

  _sameDate(dateA, dateB) {
    if (!dateA || !dateB) return false;
    const da = new Date(dateA);
    const db = new Date(dateB);
    return (
      da.getUTCFullYear() === db.getUTCFullYear() &&
      da.getUTCMonth() === db.getUTCMonth() &&
      da.getUTCDate() === db.getUTCDate()
    );
  }

  _isWithinDateRange(datetimeStr, startDateStr, endDateStr) {
    if (!datetimeStr) return false;
    const dt = new Date(datetimeStr);
    if (isNaN(dt.getTime())) return false;
    const start = startDateStr ? this._parseDate(startDateStr) : null;
    const end = endDateStr ? new Date(endDateStr + 'T23:59:59Z') : null;
    if (start && dt < start) return false;
    if (end && dt > end) return false;
    return true;
  }

  _withinTimeWindowOnDate(datetimeStr, dateStr, windowStart, windowEnd) {
    if (!datetimeStr || !dateStr) return false;
    const dt = new Date(datetimeStr);
    if (!this._sameDate(dt.toISOString(), dateStr + 'T00:00:00Z')) return false;
    const minutes = dt.getUTCHours() * 60 + dt.getUTCMinutes();
    const ws = this._parseTimeToMinutes(windowStart);
    const we = this._parseTimeToMinutes(windowEnd);
    if (ws === null || we === null) return false;
    if (we >= ws) {
      return minutes >= ws && minutes <= we;
    } else {
      // overnight window; treat as two segments
      return minutes >= ws || minutes <= we;
    }
  }

  _buildDateRangeLabel(dateRangeType, startDateStr, endDateStr) {
    if (dateRangeType === 'last_quarter') return 'Last Quarter';
    if (dateRangeType === 'last_30_days') return 'Last 30 Days';
    if (dateRangeType === 'this_month') return 'This Month';
    if (dateRangeType === 'this_year') return 'This Year';
    if (dateRangeType === 'custom') {
      if (startDateStr && endDateStr) {
        return startDateStr + ' to ' + endDateStr;
      }
      if (startDateStr) return 'From ' + startDateStr;
      if (endDateStr) return 'Until ' + endDateStr;
      return 'Custom Range';
    }
    return '';
  }

  _getLastQuarterDateRange() {
    const now = new Date();
    const currentMonth = now.getUTCMonth(); // 0-11
    const currentYear = now.getUTCFullYear();
    const currentQuarter = Math.floor(currentMonth / 3) + 1; // 1-4
    let lastQuarter = currentQuarter - 1;
    let year = currentYear;
    if (lastQuarter < 1) {
      lastQuarter = 4;
      year = currentYear - 1;
    }
    const startMonth = (lastQuarter - 1) * 3; // 0-indexed
    const endMonth = startMonth + 2;

    const start = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, endMonth + 1, 0, 23, 59, 59)); // day 0 of next month = last day of endMonth

    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    const startStr = start.getUTCFullYear() + '-' + pad(start.getUTCMonth() + 1) + '-' + pad(start.getUTCDate());
    const endStr = end.getUTCFullYear() + '-' + pad(end.getUTCMonth() + 1) + '-' + pad(end.getUTCDate());

    return { startDateStr: startStr, endDateStr: endStr };
  }

  _titleCase(str) {
    if (!str) return '';
    return str
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _buildReportSummaryText(reportSummary) {
    if (!reportSummary) return '';
    const site = reportSummary.siteName || 'Unknown Site';
    const range = reportSummary.dateRangeLabel || '';
    const types = Array.isArray(reportSummary.incidentTypes) ? reportSummary.incidentTypes.join(', ') : '';
    const rate = typeof reportSummary.complianceRate === 'number' ? reportSummary.complianceRate.toFixed(1) + '%' : 'N/A';
    return site + ' – ' + range + (types ? ' – ' + types : '') + ' – ' + rate + ' compliant';
  }

  // -------------------- INTERNAL DOMAIN HELPERS --------------------

  _getOrCreateUserContext() {
    let ctx = this._getFromStorage('user_context', null);
    if (!ctx || typeof ctx !== 'object') {
      ctx = {
        id: 'user_1',
        created_at: new Date().toISOString()
      };
      this._saveToStorage('user_context', ctx);
    }
    return ctx;
  }

  _internalCreateServiceRequest(serviceType, options) {
    const serviceRequests = this._getFromStorage('service_requests', []);

    const now = new Date().toISOString();
    const id = this._generateId('sr');

    const record = {
      id: id,
      request_type: options.requestType,
      service_type: serviceType,
      mobile_patrol_plan_id: null,
      monitoring_package_id: null,
      contact_name: options.contactName,
      contact_email: options.contactEmail,
      contact_phone: options.contactPhone,
      requested_site_id: options.requestedSiteId || null,
      requested_location_text: options.requestedLocationText || null,
      message: options.message || null,
      status: 'pending',
      submitted_at: now
    };

    if (serviceType === 'mobile_patrol') {
      record.mobile_patrol_plan_id = options.mobilePatrolPlanId || null;
    } else if (serviceType === 'video_surveillance_monitoring') {
      record.monitoring_package_id = options.monitoringPackageId || null;
    } else if (serviceType === 'alarm_system_health_check' || serviceType === 'training' || serviceType === 'other') {
      // No specific FK field defined for these; keep as is.
    }

    serviceRequests.push(record);
    this._saveToStorage('service_requests', serviceRequests);

    return record;
  }

  _internalGenerateIncidentComplianceMetrics(configRecord) {
    const incidents = this._getFromStorage('incidents', []);

    const startDateStr = configRecord.start_date;
    const endDateStr = configRecord.end_date;

    const filtered = incidents.filter((inc) => {
      if (configRecord.site_id && inc.site_id !== configRecord.site_id) return false;
      if (!configRecord.incident_types.includes(inc.incident_type)) return false;
      if (!inc.occurred_at) return false;
      const dt = new Date(inc.occurred_at);
      if (isNaN(dt.getTime())) return false;
      const start = startDateStr ? new Date(startDateStr + 'T00:00:00Z') : null;
      const end = endDateStr ? new Date(endDateStr + 'T23:59:59Z') : null;
      if (start && dt < start) return false;
      if (end && dt > end) return false;
      return true;
    });

    const totalIncidents = filtered.length;
    const compliantIncidents = filtered.filter((inc) => inc.status === 'resolved' || inc.status === 'closed').length;
    const complianceRate = totalIncidents > 0 ? (compliantIncidents / totalIncidents) * 100 : 0;

    // Breakdown by month YYYY-MM
    const breakdownMap = {};
    filtered.forEach((inc) => {
      const dt = new Date(inc.occurred_at);
      if (isNaN(dt.getTime())) return;
      const y = dt.getUTCFullYear();
      const m = dt.getUTCMonth() + 1;
      const mm = m < 10 ? '0' + m : '' + m;
      const label = y + '-' + mm;
      if (!breakdownMap[label]) {
        breakdownMap[label] = { totalIncidents: 0, compliantIncidents: 0 };
      }
      breakdownMap[label].totalIncidents += 1;
      if (inc.status === 'resolved' || inc.status === 'closed') {
        breakdownMap[label].compliantIncidents += 1;
      }
    });

    const breakdownByMonth = Object.keys(breakdownMap)
      .sort()
      .map((label) => ({
        monthLabel: label,
        totalIncidents: breakdownMap[label].totalIncidents,
        compliantIncidents: breakdownMap[label].compliantIncidents
      }));

    const incidentsSummary = filtered.map((inc) => ({
      incidentId: inc.id,
      occurred_at: inc.occurred_at,
      status: inc.status
    }));

    return {
      metrics: {
        totalIncidents: totalIncidents,
        compliantIncidents: compliantIncidents,
        complianceRate: complianceRate
      },
      breakdownByMonth: breakdownByMonth,
      incidents: incidentsSummary
    };
  }

  _getOrCreateDashboardByName(name) {
    const dashboards = this._getFromStorage('dashboards', []);
    let dashboard = dashboards.find((d) => d.name === name);
    if (!dashboard) {
      const id = this._generateId('dash');
      dashboard = {
        id: id,
        name: name,
        description: '',
        is_default: name === 'Safety KPIs'
      };
      dashboards.push(dashboard);
      this._saveToStorage('dashboards', dashboards);
    }
    return dashboard;
  }

  _getOrCreateSavedResourcesContainer() {
    // For this simple single-user context, ensuring the array exists is enough.
    let saved = this._getFromStorage('saved_resources', []);
    if (!Array.isArray(saved)) {
      saved = [];
      this._saveToStorage('saved_resources', saved);
    }
    this._getOrCreateUserContext();
    return saved;
  }

  // -------------------- CORE INTERFACES --------------------
  // 1) getHomeOverview

  getHomeOverview() {
    const serviceOfferings = this._getFromStorage('service_offerings', []);
    const featuredServices = serviceOfferings
      .filter((s) => s.is_featured)
      .map((s) => ({
        serviceOfferingId: s.id,
        name: s.name,
        slug: s.slug,
        service_type: s.service_type,
        description: s.description || '',
        is_featured: !!s.is_featured
      }));

    const quickActions = this._getFromStorage('quick_actions', []);

    const safetyOverview = this.getSafetyKPIDashboardOverview();
    const dashboard = safetyOverview.dashboard || null;
    const items = safetyOverview.items || [];

    const keyItems = items.slice(0, 3).map((item) => ({
      dashboardItemId: item.dashboardItemId,
      title: item.title,
      item_type: item.item_type,
      summaryText: this._buildReportSummaryText(item.reportSummary)
    }));

    return {
      featuredServices: featuredServices,
      quickActions: quickActions,
      safetyKpiDashboardSummary: dashboard
        ? {
            dashboardId: dashboard.id,
            name: dashboard.name,
            description: dashboard.description || '',
            keyItems: keyItems
          }
        : {
            dashboardId: null,
            name: '',
            description: '',
            keyItems: []
          }
    };
  }

  // 2) getSafetyKPIDashboardOverview

  getSafetyKPIDashboardOverview() {
    const dashboard = this._getOrCreateDashboardByName('Safety KPIs');
    const dashboardItems = this._getFromStorage('dashboard_items', []);
    const reports = this._getFromStorage('incident_compliance_reports', []);

    const itemsForDash = dashboardItems
      .filter((di) => di.dashboard_id === dashboard.id)
      .sort((a, b) => {
        if (typeof a.position === 'number' && typeof b.position === 'number') {
          return a.position - b.position;
        }
        const at = a.added_at || '';
        const bt = b.added_at || '';
        return at.localeCompare(bt);
      })
      .map((di) => {
        const report = reports.find((r) => r.id === di.incident_compliance_report_id) || null;
        let siteName = null;
        let dateRangeLabel = '';
        let incidentTypes = [];
        let complianceRate = 0;

        if (report) {
          const sites = this._getFromStorage('sites', []);
          const site = sites.find((s) => s.id === report.site_id) || null;
          siteName = report.site_name || (site ? site.name : null);
          dateRangeLabel = report.date_range_label || this._buildDateRangeLabel(report.date_range_type, report.start_date, report.end_date);
          incidentTypes = report.incident_types || [];
          if (report.metrics && typeof report.metrics.complianceRate === 'number') {
            complianceRate = report.metrics.complianceRate;
          }
        }

        return {
          dashboardItemId: di.id,
          title: di.title || (report && report.title) || 'Incident Compliance Report',
          item_type: di.item_type,
          incident_compliance_report_id: di.incident_compliance_report_id || null,
          reportSummary: {
            siteName: siteName,
            dateRangeLabel: dateRangeLabel,
            incidentTypes: incidentTypes,
            complianceRate: complianceRate
          }
        };
      });

    return {
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description || '',
        is_default: !!dashboard.is_default
      },
      items: itemsForDash
    };
  }

  // 3) getServiceOfferingsOverview

  getServiceOfferingsOverview() {
    const serviceOfferings = this._getFromStorage('service_offerings', []);
    const sorted = serviceOfferings.slice().sort((a, b) => {
      const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
      return ao - bo;
    });
    return {
      serviceOfferings: sorted.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        service_type: s.service_type,
        description: s.description || '',
        is_featured: !!s.is_featured,
        sort_order: s.sort_order || 0
      }))
    };
  }

  // 4) getMobilePatrolFilterOptions

  getMobilePatrolFilterOptions() {
    const nightsPerWeekOptions = [1, 2, 3, 4, 5, 6, 7];
    const billingFrequencies = ['per_week', 'per_month', 'per_day'];
    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'coverage_hours_desc', label: 'Coverage Hours: High to Low' }
    ];
    return {
      nightsPerWeekOptions: nightsPerWeekOptions,
      billingFrequencies: billingFrequencies,
      sortOptions: sortOptions
    };
  }

  // 5) searchMobilePatrolPlans

  searchMobilePatrolPlans(
    locationQuery,
    coverageStartTime,
    coverageEndTime,
    minCoverageHoursPerNight,
    minNightsPerWeek,
    maxWeeklyPrice,
    billingFrequency,
    sortBy
  ) {
    const plans = this._getFromStorage('mobile_patrol_plans', []);
    const sites = this._getFromStorage('sites', []);

    const query = (locationQuery || '').toLowerCase();
    const zipMatch = locationQuery ? locationQuery.match(/(\d{5})/) : null;
    const queryZip = zipMatch ? zipMatch[1] : null;

    let filtered = plans.filter((p) => p.is_active);

    filtered = filtered.filter((p) => {
      if (billingFrequency && p.billing_frequency !== billingFrequency) return false;

      // Coverage window
      if (coverageStartTime && coverageEndTime) {
        if (!this._timeWindowIncludes(p.coverage_start_time, p.coverage_end_time, coverageStartTime, coverageEndTime)) {
          return false;
        }
      }

      if (typeof minCoverageHoursPerNight === 'number' && p.coverage_hours_per_night < minCoverageHoursPerNight) {
        return false;
      }
      if (typeof minNightsPerWeek === 'number' && p.nights_per_week < minNightsPerWeek) {
        return false;
      }
      if (typeof maxWeeklyPrice === 'number' && p.weekly_price > maxWeeklyPrice) {
        return false;
      }

      // Location filtering by zip or site name
      const planZips = Array.isArray(p.service_area_zip_codes) ? p.service_area_zip_codes : [];
      const planSiteIds = Array.isArray(p.service_area_site_ids) ? p.service_area_site_ids : [];
      let matchesZip = false;
      let matchesSiteName = false;

      if (queryZip && planZips.length > 0) {
        matchesZip = planZips.indexOf(queryZip) !== -1;
      }

      if (query && planSiteIds.length > 0) {
        matchesSiteName = planSiteIds.some((sid) => {
          const s = sites.find((site) => site.id === sid);
          return s && s.name && query.indexOf(s.name.toLowerCase()) !== -1;
        });
      }

      // If plan has specific areas, require at least one match; otherwise treat as global
      if (planZips.length > 0 || planSiteIds.length > 0) {
        return matchesZip || matchesSiteName;
      }
      return true;
    });

    // Sorting
    const sort = sortBy || 'price_asc';
    filtered = filtered.slice().sort((a, b) => {
      if (sort === 'price_desc') {
        return b.weekly_price - a.weekly_price;
      }
      if (sort === 'coverage_hours_desc') {
        return b.coverage_hours_per_night - a.coverage_hours_per_night;
      }
      // default price_asc
      return a.weekly_price - b.weekly_price;
    });

    const resultPlans = filtered.map((p) => {
      const planSiteIds = Array.isArray(p.service_area_site_ids) ? p.service_area_site_ids : [];
      const siteNames = planSiteIds
        .map((sid) => {
          const s = sites.find((site) => site.id === sid);
          return s ? s.name : null;
        })
        .filter((n) => !!n);

      return {
        id: p.id,
        name: p.name,
        description: p.description || '',
        coverage_start_time: p.coverage_start_time,
        coverage_end_time: p.coverage_end_time,
        coverage_hours_per_night: p.coverage_hours_per_night,
        nights_per_week: p.nights_per_week,
        weekly_price: p.weekly_price,
        billing_frequency: p.billing_frequency,
        min_contract_term_months: p.min_contract_term_months || null,
        is_overnight_only: !!p.is_overnight_only,
        is_active: !!p.is_active,
        service_area_zip_codes: Array.isArray(p.service_area_zip_codes) ? p.service_area_zip_codes : [],
        service_area_site_names: siteNames,
        price_display: '$' + p.weekly_price.toFixed(2) + '/week',
        coverage_window_display: this._formatTime(p.coverage_start_time) + '–' + this._formatTime(p.coverage_end_time)
      };
    });

    return { plans: resultPlans };
  }

  // 6) getMobilePatrolPlanDetails

  getMobilePatrolPlanDetails(mobilePatrolPlanId) {
    const plans = this._getFromStorage('mobile_patrol_plans', []);
    const sites = this._getFromStorage('sites', []);
    const p = plans.find((pl) => pl.id === mobilePatrolPlanId) || null;
    if (!p) {
      return { plan: null };
    }

    const planSiteIds = Array.isArray(p.service_area_site_ids) ? p.service_area_site_ids : [];
    const siteNames = planSiteIds
      .map((sid) => {
        const s = sites.find((site) => site.id === sid);
        return s ? s.name : null;
      })
      .filter((n) => !!n);

    const plan = {
      id: p.id,
      name: p.name,
      description: p.description || '',
      coverage_start_time: p.coverage_start_time,
      coverage_end_time: p.coverage_end_time,
      coverage_hours_per_night: p.coverage_hours_per_night,
      nights_per_week: p.nights_per_week,
      weekly_price: p.weekly_price,
      billing_frequency: p.billing_frequency,
      min_contract_term_months: p.min_contract_term_months || null,
      is_overnight_only: !!p.is_overnight_only,
      is_active: !!p.is_active,
      service_area_zip_codes: Array.isArray(p.service_area_zip_codes) ? p.service_area_zip_codes : [],
      service_area_site_names: siteNames,
      created_at: p.created_at || null,
      coverage_window_display: this._formatTime(p.coverage_start_time) + '–' + this._formatTime(p.coverage_end_time),
      price_display: '$' + p.weekly_price.toFixed(2) + '/week',
      eligibility_notes: p.eligibility_notes || ''
    };

    return { plan: plan };
  }

  // 7) createMobilePatrolServiceRequest

  createMobilePatrolServiceRequest(
    mobilePatrolPlanId,
    requestType,
    contactName,
    contactEmail,
    contactPhone,
    requestedSiteId,
    requestedLocationText,
    message
  ) {
    const record = this._internalCreateServiceRequest('mobile_patrol', {
      mobilePatrolPlanId: mobilePatrolPlanId,
      requestType: requestType,
      contactName: contactName,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      requestedSiteId: requestedSiteId,
      requestedLocationText: requestedLocationText,
      message: message
    });

    return {
      success: true,
      serviceRequestId: record.id,
      status: record.status,
      message: 'Mobile patrol service request submitted.'
    };
  }

  // 8) getMonitoringFilterOptions

  getMonitoringFilterOptions() {
    const monitoringHourTypes = ['hours_24_7', 'business_hours', 'nights_only', 'custom'];
    const cameraCountPresets = [4, 8, 10, 16, 24, 32];
    const sortOptions = [
      { value: 'contract_length_asc', label: 'Contract length: Shortest first' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' }
    ];
    return {
      monitoringHourTypes: monitoringHourTypes,
      cameraCountPresets: cameraCountPresets,
      sortOptions: sortOptions
    };
  }

  // 9) searchMonitoringPackages

  searchMonitoringPackages(minNumCamerasIncluded, monitoringHoursType, maxMonthlyPrice, sortBy) {
    const packages = this._getFromStorage('monitoring_packages', []);

    let filtered = packages.filter((p) => p.is_active);

    if (typeof minNumCamerasIncluded === 'number') {
      filtered = filtered.filter((p) => p.num_cameras_included >= minNumCamerasIncluded);
    }
    if (monitoringHoursType) {
      filtered = filtered.filter((p) => p.monitoring_hours_type === monitoringHoursType);
    }
    if (typeof maxMonthlyPrice === 'number') {
      filtered = filtered.filter((p) => p.monthly_price <= maxMonthlyPrice);
    }

    const sort = sortBy || 'contract_length_asc';
    filtered = filtered.slice().sort((a, b) => {
      if (sort === 'price_asc') return a.monthly_price - b.monthly_price;
      if (sort === 'price_desc') return b.monthly_price - a.monthly_price;
      // default contract_length_asc
      return a.contract_term_months - b.contract_term_months;
    });

    const resultPackages = filtered.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description || '',
      num_cameras_included: p.num_cameras_included,
      max_cameras_supported: p.max_cameras_supported || null,
      monitoring_hours_type: p.monitoring_hours_type,
      monthly_price: p.monthly_price,
      contract_term_months: p.contract_term_months,
      installation_included: !!p.installation_included,
      is_active: !!p.is_active,
      price_display: '$' + p.monthly_price.toFixed(2) + '/month',
      monitoring_hours_display:
        p.monitoring_hours_type === 'hours_24_7'
          ? '24/7 Monitoring'
          : p.monitoring_hours_type === 'business_hours'
          ? 'Business Hours Monitoring'
          : p.monitoring_hours_type === 'nights_only'
          ? 'Nights Only Monitoring'
          : 'Custom Monitoring',
      contract_term_display: p.contract_term_months + ' month' + (p.contract_term_months === 1 ? '' : 's')
    }));

    return { packages: resultPackages };
  }

  // 10) getMonitoringPackageDetails

  getMonitoringPackageDetails(monitoringPackageId) {
    const packages = this._getFromStorage('monitoring_packages', []);
    const p = packages.find((pkg) => pkg.id === monitoringPackageId) || null;
    if (!p) {
      return { monitoringPackage: null };
    }
    const monitoringPackage = {
      id: p.id,
      name: p.name,
      description: p.description || '',
      num_cameras_included: p.num_cameras_included,
      max_cameras_supported: p.max_cameras_supported || null,
      monitoring_hours_type: p.monitoring_hours_type,
      monthly_price: p.monthly_price,
      contract_term_months: p.contract_term_months,
      installation_included: !!p.installation_included,
      is_active: !!p.is_active,
      created_at: p.created_at || null,
      price_display: '$' + p.monthly_price.toFixed(2) + '/month',
      monitoring_hours_display:
        p.monitoring_hours_type === 'hours_24_7'
          ? '24/7 Monitoring'
          : p.monitoring_hours_type === 'business_hours'
          ? 'Business Hours Monitoring'
          : p.monitoring_hours_type === 'nights_only'
          ? 'Nights Only Monitoring'
          : 'Custom Monitoring',
      contract_term_display: p.contract_term_months + ' month' + (p.contract_term_months === 1 ? '' : 's'),
      eligibility_notes: p.eligibility_notes || ''
    };
    return { monitoringPackage: monitoringPackage };
  }

  // 11) selectMonitoringPackage

  selectMonitoringPackage(monitoringPackageId, notes) {
    const packages = this._getFromStorage('monitoring_packages', []);
    const pkg = packages.find((p) => p.id === monitoringPackageId) || null;
    if (!pkg) {
      return { success: false, packageSelectionId: null, status: null, message: 'Monitoring package not found.' };
    }

    const selections = this._getFromStorage('package_selections', []);
    const id = this._generateId('pkg_sel');
    const now = new Date().toISOString();

    const record = {
      id: id,
      monitoring_package_id: monitoringPackageId,
      status: 'selected',
      selection_datetime: now,
      notes: notes || null
    };
    selections.push(record);
    this._saveToStorage('package_selections', selections);

    return {
      success: true,
      packageSelectionId: record.id,
      status: record.status,
      message: 'Monitoring package selected.'
    };
  }

  // 12) createMonitoringServiceRequest

  createMonitoringServiceRequest(
    monitoringPackageId,
    requestType,
    contactName,
    contactEmail,
    contactPhone,
    requestedSiteId,
    requestedLocationText,
    message
  ) {
    const record = this._internalCreateServiceRequest('video_surveillance_monitoring', {
      monitoringPackageId: monitoringPackageId,
      requestType: requestType,
      contactName: contactName,
      contactEmail: contactEmail,
      contactPhone: contactPhone,
      requestedSiteId: requestedSiteId,
      requestedLocationText: requestedLocationText,
      message: message
    });

    return {
      success: true,
      serviceRequestId: record.id,
      status: record.status,
      message: 'Monitoring service request submitted.'
    };
  }

  // 13) getAlarmSystemHealthCheckInfo

  getAlarmSystemHealthCheckInfo() {
    const stored = this._getFromStorage('alarm_system_health_check_info', null);
    if (!stored || typeof stored !== 'object') {
      return {
        overviewText: '',
        keyChecks: [],
        faqs: []
      };
    }
    return {
      overviewText: stored.overviewText || '',
      keyChecks: Array.isArray(stored.keyChecks) ? stored.keyChecks : [],
      faqs: Array.isArray(stored.faqs)
        ? stored.faqs.map((f) => ({ question: f.question || '', answer: f.answer || '' }))
        : []
    };
  }

  // 14) searchAlarmCheckTechnicians

  searchAlarmCheckTechnicians(
    date,
    timeWindowStart,
    timeWindowEnd,
    minRating,
    minCompletedVisits,
    sortBy,
    siteId
  ) {
    const technicians = this._getFromStorage('technicians', []);
    const slots = this._getFromStorage('appointment_slots', []);

    const dateStr = date;

    const activeTechs = technicians.filter((t) => t.is_active);

    const results = [];

    activeTechs.forEach((tech) => {
      if (typeof minRating === 'number' && tech.rating < minRating) return;
      if (typeof minCompletedVisits === 'number' && tech.completed_visits_count < minCompletedVisits) return;

      const techSlots = slots
        .filter((s) =>
          s.technician_id === tech.id &&
          s.service_type === 'alarm_system_health_check' &&
          !s.is_booked &&
          (!siteId || !s.site_id || s.site_id === siteId) &&
          this._withinTimeWindowOnDate(s.start_datetime, dateStr, timeWindowStart, timeWindowEnd)
        )
        .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));

      if (techSlots.length === 0) return;

      const soonest = techSlots[0];

      results.push({
        technicianId: tech.id,
        name: tech.name,
        rating: tech.rating,
        completed_visits_count: tech.completed_visits_count,
        soonestAvailableSlot: {
          appointmentSlotId: soonest.id,
          start_datetime: soonest.start_datetime,
          end_datetime: soonest.end_datetime
        }
      });
    });

    const sort = sortBy || 'soonest_availability';
    results.sort((a, b) => {
      if (sort === 'highest_rating') {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return a.soonestAvailableSlot.start_datetime.localeCompare(b.soonestAvailableSlot.start_datetime);
      }
      // default: soonest_availability
      return a.soonestAvailableSlot.start_datetime.localeCompare(b.soonestAvailableSlot.start_datetime);
    });

    return { technicians: results };
  }

  // 15) getAlarmCheckTechnicianSlots

  getAlarmCheckTechnicianSlots(technicianId, date, timeWindowStart, timeWindowEnd) {
    const slots = this._getFromStorage('appointment_slots', []);
    const dateStr = date;

    const filtered = slots.filter(
      (s) =>
        s.technician_id === technicianId &&
        s.service_type === 'alarm_system_health_check' &&
        !s.is_booked &&
        this._withinTimeWindowOnDate(s.start_datetime, dateStr, timeWindowStart, timeWindowEnd)
    );

    const mapped = filtered
      .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime))
      .map((s) => ({
        appointmentSlotId: s.id,
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        is_booked: !!s.is_booked
      }));

    return { slots: mapped };
  }

  // 16) bookAlarmSystemHealthCheck

  bookAlarmSystemHealthCheck(appointmentSlotId, siteNameText, contactPhone) {
    const slots = this._getFromStorage('appointment_slots', []);
    const technicians = this._getFromStorage('technicians', []);
    const sites = this._getFromStorage('sites', []);

    const slot = slots.find((s) => s.id === appointmentSlotId) || null;
    if (!slot) {
      return {
        success: false,
        serviceAppointmentId: null,
        status: null,
        start_datetime: null,
        end_datetime: null,
        technicianName: null,
        message: 'Appointment slot not found.'
      };
    }
    if (slot.is_booked) {
      return {
        success: false,
        serviceAppointmentId: null,
        status: null,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        technicianName: null,
        message: 'Appointment slot is already booked.'
      };
    }

    const technician = technicians.find((t) => t.id === slot.technician_id) || null;
    const site = sites.find((s) => s.id === slot.site_id) || null;

    const appointments = this._getFromStorage('service_appointments', []);
    const id = this._generateId('appt');
    const now = new Date().toISOString();

    const record = {
      id: id,
      technician_id: slot.technician_id,
      service_type: slot.service_type,
      site_id: slot.site_id || null,
      site_name_text: siteNameText || (site ? site.name : ''),
      contact_phone: contactPhone,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      status: 'pending',
      created_at: now,
      notes: null
    };

    appointments.push(record);
    this._saveToStorage('service_appointments', appointments);

    // Mark slot booked
    slot.is_booked = true;
    this._saveToStorage('appointment_slots', slots);

    return {
      success: true,
      serviceAppointmentId: record.id,
      status: record.status,
      start_datetime: record.start_datetime,
      end_datetime: record.end_datetime,
      technicianName: technician ? technician.name : null,
      message: 'Alarm system health check booked.'
    };
  }

  // 17) getTrainingProgramsOverview

  getTrainingProgramsOverview() {
    const programs = this._getFromStorage('training_programs', []);
    return {
      programs: programs.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        service_type: p.service_type,
        default_duration_hours: p.default_duration_hours || null,
        default_max_participants: p.default_max_participants || null,
        modules_available: Array.isArray(p.modules_available) ? p.modules_available : [],
        delivery_type: p.delivery_type,
        is_active: !!p.is_active
      }))
    };
  }

  // 18) getEmergencyTrainingFilterOptions

  getEmergencyTrainingFilterOptions(trainingProgramId) {
    const programs = this._getFromStorage('training_programs', []);
    const program = programs.find((p) => p.id === trainingProgramId) || null;
    const moduleOptions = [];

    if (program && Array.isArray(program.modules_available)) {
      program.modules_available.forEach((m) => {
        moduleOptions.push({ value: m, label: this._titleCase(m) });
      });
    }

    // maxParticipantPresets based on existing sessions for this program
    const sessions = this._getFromStorage('training_sessions', []);
    const capacitiesSet = {};
    sessions
      .filter((s) => s.training_program_id === trainingProgramId)
      .forEach((s) => {
        capacitiesSet[s.max_participants] = true;
      });
    const maxParticipantPresets = Object.keys(capacitiesSet)
      .map((k) => parseInt(k, 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    const sortOptions = [
      { value: 'earliest_date', label: 'Earliest available date' },
      { value: 'price_asc', label: 'Price: Low to High' }
    ];

    return {
      moduleOptions: moduleOptions,
      sortOptions: sortOptions,
      maxParticipantPresets: maxParticipantPresets
    };
  }

  // 19) searchEmergencyTrainingSessions

  searchEmergencyTrainingSessions(
    trainingProgramId,
    minParticipantCount,
    requiredModules,
    startDate,
    endDate,
    maxPrice,
    sortBy
  ) {
    const sessions = this._getFromStorage('training_sessions', []);

    let filtered = sessions.filter((s) => s.training_program_id === trainingProgramId && s.status === 'available');

    filtered = filtered.filter((s) => this._isWithinDateRange(s.start_datetime, startDate, endDate));

    if (typeof minParticipantCount === 'number') {
      filtered = filtered.filter((s) => s.max_participants >= minParticipantCount);
    }

    if (Array.isArray(requiredModules) && requiredModules.length > 0) {
      filtered = filtered.filter((s) => {
        const mods = Array.isArray(s.modules_included) ? s.modules_included : [];
        return requiredModules.every((rm) => mods.indexOf(rm) !== -1);
      });
    }

    if (typeof maxPrice === 'number') {
      filtered = filtered.filter((s) => s.price <= maxPrice);
    }

    const sort = sortBy || 'earliest_date';
    filtered = filtered.slice().sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      return a.start_datetime.localeCompare(b.start_datetime);
    });

    const resultSessions = filtered.map((s) => ({
      id: s.id,
      training_program_id: s.training_program_id,
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      duration_hours: s.duration_hours,
      max_participants: s.max_participants,
      price: s.price,
      modules_included: Array.isArray(s.modules_included) ? s.modules_included : [],
      base_location_text: s.base_location_text || '',
      status: s.status,
      date_display: s.start_datetime,
      price_display: '$' + s.price.toFixed(2)
    }));

    return { sessions: resultSessions };
  }

  // 20) getTrainingSessionDetails

  getTrainingSessionDetails(trainingSessionId) {
    const sessions = this._getFromStorage('training_sessions', []);
    const s = sessions.find((sess) => sess.id === trainingSessionId) || null;
    if (!s) {
      return { session: null };
    }
    const session = {
      id: s.id,
      training_program_id: s.training_program_id,
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      duration_hours: s.duration_hours,
      max_participants: s.max_participants,
      price: s.price,
      modules_included: Array.isArray(s.modules_included) ? s.modules_included : [],
      base_location_text: s.base_location_text || '',
      status: s.status,
      created_at: s.created_at || null,
      date_display: s.start_datetime,
      price_display: '$' + s.price.toFixed(2)
    };
    return { session: session };
  }

  // 21) createTrainingBooking

  createTrainingBooking(trainingSessionId, companyName, trainingLocationText, participantCount, specialInstructions) {
    const sessions = this._getFromStorage('training_sessions', []);
    const session = sessions.find((s) => s.id === trainingSessionId) || null;
    if (!session) {
      return {
        success: false,
        trainingBookingId: null,
        status: null,
        message: 'Training session not found.'
      };
    }

    if (participantCount > session.max_participants) {
      // Basic validation: over capacity
      return {
        success: false,
        trainingBookingId: null,
        status: null,
        message: 'Participant count exceeds session capacity.'
      };
    }

    const bookings = this._getFromStorage('training_bookings', []);
    const id = this._generateId('tbook');
    const now = new Date().toISOString();

    const record = {
      id: id,
      training_session_id: trainingSessionId,
      company_name: companyName,
      training_location_text: trainingLocationText,
      participant_count: participantCount,
      special_instructions: specialInstructions || null,
      status: 'pending',
      booking_datetime: now
    };

    bookings.push(record);
    this._saveToStorage('training_bookings', bookings);

    return {
      success: true,
      trainingBookingId: record.id,
      status: record.status,
      message: 'Training booking created.'
    };
  }

  // 22) getIncidentFormOptions

  getIncidentFormOptions() {
    const incidentTypesEnum = ['suspicious_activity', 'fire', 'fire_drill', 'medical', 'theft', 'other'];
    const prioritiesEnum = ['low', 'medium', 'high'];

    const incidentTypes = incidentTypesEnum.map((v) => ({ value: v, label: this._titleCase(v) }));
    const priorities = prioritiesEnum.map((v) => ({ value: v, label: this._titleCase(v) }));

    const sites = this._getFromStorage('sites', []);
    const locations = this._getFromStorage('locations', []);

    const locationsBySite = sites.map((s) => ({
      siteId: s.id,
      siteName: s.name,
      locations: locations
        .filter((loc) => loc.site_id === s.id)
        .map((loc) => ({ id: loc.id, name: loc.name, location_type: loc.location_type }))
    }));

    return {
      incidentTypes: incidentTypes,
      priorities: priorities,
      sites: sites.map((s) => ({ id: s.id, name: s.name })),
      locationsBySite: locationsBySite
    };
  }

  // 23) submitIncident

  submitIncident(
    incidentType,
    priority,
    occurredDate,
    occurredTime,
    siteId,
    locationId,
    locationDescription,
    description,
    notifyViaSms,
    notifyViaEmail,
    notifyViaVoiceCall
  ) {
    const incidents = this._getFromStorage('incidents', []);

    const occurredAtStr = occurredDate + 'T' + occurredTime + ':00Z';
    const now = new Date().toISOString();

    const id = this._generateId('inc');
    const referenceNumber = 'INC-' + id.split('_')[1];

    const record = {
      id: id,
      incident_type: incidentType,
      priority: priority,
      occurred_at: occurredAtStr,
      reported_at: now,
      site_id: siteId || null,
      location_id: locationId || null,
      location_description: locationDescription || null,
      description: description || null,
      status: 'open',
      notify_via_sms: !!notifyViaSms,
      notify_via_email: !!notifyViaEmail,
      notify_via_voice_call: !!notifyViaVoiceCall,
      reference_number: referenceNumber
    };

    incidents.push(record);
    this._saveToStorage('incidents', incidents);

    return {
      success: true,
      incidentId: record.id,
      referenceNumber: record.reference_number,
      status: record.status,
      message: 'Incident submitted.'
    };
  }

  // 24) listNotificationRules

  listNotificationRules() {
    const rules = this._getFromStorage('notification_rules', []);
    const locations = this._getFromStorage('locations', []);

    const mapped = rules.map((r) => {
      const locIds = Array.isArray(r.location_ids) ? r.location_ids : [];
      const location_names = locIds
        .map((lid) => {
          const loc = locations.find((l) => l.id === lid);
          return loc ? loc.name : null;
        })
        .filter((n) => !!n);

      return {
        id: r.id,
        name: r.name || '',
        incident_types: Array.isArray(r.incident_types) ? r.incident_types : [],
        severities: Array.isArray(r.severities) ? r.severities : [],
        location_names: location_names,
        delivery_channels: Array.isArray(r.delivery_channels) ? r.delivery_channels : [],
        quiet_hours_enabled: !!r.quiet_hours_enabled,
        quiet_hours_start_time: r.quiet_hours_start_time || null,
        quiet_hours_end_time: r.quiet_hours_end_time || null,
        override_quiet_hours_for_high_severity: !!r.override_quiet_hours_for_high_severity,
        is_active: !!r.is_active,
        created_at: r.created_at || null
      };
    });

    return { rules: mapped };
  }

  // 25) getNotificationRuleFormOptions

  getNotificationRuleFormOptions() {
    const incidentTypesEnum = ['fire', 'suspicious_activity', 'fire_drill', 'medical', 'theft', 'other'];
    const severitiesEnum = ['low', 'medium', 'high'];
    const deliveryChannelsEnum = ['sms', 'email', 'voice_call', 'app_push'];

    const incidentTypes = incidentTypesEnum.map((v) => ({ value: v, label: this._titleCase(v) }));
    const severities = severitiesEnum.map((v) => ({ value: v, label: this._titleCase(v) }));
    const deliveryChannels = deliveryChannelsEnum.map((v) => ({ value: v, label: this._titleCase(v) }));

    const locations = this._getFromStorage('locations', []);
    const sites = this._getFromStorage('sites', []);

    const locOptions = locations.map((loc) => {
      const site = sites.find((s) => s.id === loc.site_id) || null;
      return {
        id: loc.id,
        name: loc.name,
        siteName: site ? site.name : ''
      };
    });

    return {
      incidentTypes: incidentTypes,
      severities: severities,
      deliveryChannels: deliveryChannels,
      locations: locOptions
    };
  }

  // 26) createNotificationRule

  createNotificationRule(
    name,
    incidentTypes,
    severities,
    locationIds,
    deliveryChannels,
    quietHoursEnabled,
    quietHoursStartTime,
    quietHoursEndTime,
    overrideQuietHoursForHighSeverity
  ) {
    const rules = this._getFromStorage('notification_rules', []);

    const id = this._generateId('nrule');
    const now = new Date().toISOString();

    const record = {
      id: id,
      name: name || '',
      incident_types: Array.isArray(incidentTypes) ? incidentTypes : [],
      severities: Array.isArray(severities) ? severities : [],
      location_ids: Array.isArray(locationIds) ? locationIds : [],
      delivery_channels: Array.isArray(deliveryChannels) ? deliveryChannels : [],
      quiet_hours_enabled: !!quietHoursEnabled,
      quiet_hours_start_time: quietHoursEnabled ? quietHoursStartTime || null : null,
      quiet_hours_end_time: quietHoursEnabled ? quietHoursEndTime || null : null,
      override_quiet_hours_for_high_severity: !!overrideQuietHoursForHighSeverity,
      is_active: true,
      created_at: now
    };

    rules.push(record);
    this._saveToStorage('notification_rules', rules);

    return {
      success: true,
      notificationRuleId: record.id,
      isActive: record.is_active,
      created_at: record.created_at,
      message: 'Notification rule created.'
    };
  }

  // 27) getPolicyFilterOptions

  getPolicyFilterOptions() {
    const lastUpdatedOptions = [
      { value: 'anytime', label: 'Any time' },
      { value: 'past_30_days', label: 'Past 30 days' },
      { value: 'past_12_months', label: 'Past 12 months' }
    ];
    return { lastUpdatedOptions: lastUpdatedOptions };
  }

  // 28) searchPolicies

  searchPolicies(query, lastUpdatedFilter) {
    const policies = this._getFromStorage('policies', []);
    const q = (query || '').toLowerCase();
    const filter = lastUpdatedFilter || 'anytime';

    const now = new Date();
    let cutoff = null;
    if (filter === 'past_30_days') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (filter === 'past_12_months') {
      cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const results = policies
      .filter((p) => p.status === 'active')
      .filter((p) => {
        if (q) {
          const inTitle = (p.title || '').toLowerCase().indexOf(q) !== -1;
          const inSummary = (p.summary || '').toLowerCase().indexOf(q) !== -1;
          if (!inTitle && !inSummary) return false;
        }
        if (cutoff) {
          const updated = new Date(p.last_updated_at);
          if (isNaN(updated.getTime()) || updated < cutoff) return false;
        }
        return true;
      })
      .map((p) => ({
        id: p.id,
        title: p.title,
        summary: p.summary || '',
        status: p.status,
        last_updated_at: p.last_updated_at
      }));

    return { policies: results };
  }

  // 29) getPolicyDetails

  getPolicyDetails(policyId) {
    const policies = this._getFromStorage('policies', []);
    const sites = this._getFromStorage('sites', []);
    const p = policies.find((pol) => pol.id === policyId) || null;
    if (!p) {
      return { policy: null };
    }

    const siteIds = Array.isArray(p.applicable_site_ids) ? p.applicable_site_ids : [];
    const applicable_site_names = siteIds
      .map((sid) => {
        const s = sites.find((site) => site.id === sid);
        return s ? s.name : null;
      })
      .filter((n) => !!n);

    const policy = {
      id: p.id,
      title: p.title,
      slug: p.slug || '',
      summary: p.summary || '',
      content: p.content || '',
      version: p.version || '',
      status: p.status,
      last_updated_at: p.last_updated_at,
      applicable_site_names: applicable_site_names,
      download_url: p.download_url || ''
    };

    return { policy: policy };
  }

  // 30) savePolicyToResources

  savePolicyToResources(policyId, notes) {
    const policies = this._getFromStorage('policies', []);
    const policy = policies.find((p) => p.id === policyId) || null;
    if (!policy) {
      return { success: false, savedResourceId: null, saved_at: null, message: 'Policy not found.' };
    }

    const savedResources = this._getOrCreateSavedResourcesContainer();
    const id = this._generateId('saved');
    const now = new Date().toISOString();

    const record = {
      id: id,
      policy_id: policyId,
      saved_at: now,
      notes: notes || ''
    };

    savedResources.push(record);
    this._saveToStorage('saved_resources', savedResources);

    return {
      success: true,
      savedResourceId: record.id,
      saved_at: record.saved_at,
      message: 'Policy saved to resources.'
    };
  }

  // 31) getSavedResources

  getSavedResources() {
    const savedResources = this._getFromStorage('saved_resources', []);
    const policies = this._getFromStorage('policies', []);

    const mapped = savedResources.map((sr) => {
      const policy = policies.find((p) => p.id === sr.policy_id) || null;
      return {
        savedResourceId: sr.id,
        policy_id: sr.policy_id,
        policy_title: policy ? policy.title : null,
        saved_at: sr.saved_at,
        notes: sr.notes || '',
        policy: policy
      };
    });

    return { savedResources: mapped };
  }

  // 32) removeSavedResource

  removeSavedResource(savedResourceId) {
    let savedResources = this._getFromStorage('saved_resources', []);
    const beforeLen = savedResources.length;
    savedResources = savedResources.filter((sr) => sr.id !== savedResourceId);
    this._saveToStorage('saved_resources', savedResources);

    return { success: savedResources.length < beforeLen };
  }

  // 33) getSiteSelectionOptions

  getSiteSelectionOptions() {
    const sites = this._getFromStorage('sites', []);
    return {
      sites: sites.map((s) => ({
        id: s.id,
        name: s.name,
        site_type: s.site_type,
        city: s.city || '',
        state: s.state || '',
        country: s.country || ''
      }))
    };
  }

  // 34) getSiteContactLists

  getSiteContactLists(siteId) {
    const sites = this._getFromStorage('sites', []);
    const lists = this._getFromStorage('site_contact_lists', []);

    const site = sites.find((s) => s.id === siteId) || null;
    const siteName = site ? site.name : '';

    const contactLists = lists
      .filter((l) => l.site_id === siteId)
      .map((l) => ({
        siteContactListId: l.id,
        name: l.name,
        contact_count: Array.isArray(l.contact_ids) ? l.contact_ids.length : 0,
        created_at: l.created_at || null,
        updated_at: l.updated_at || null
      }));

    return {
      siteName: siteName,
      contactLists: contactLists
    };
  }

  // 35) getContactDirectoryFilterOptions

  getContactDirectoryFilterOptions() {
    const contacts = this._getFromStorage('contacts', []);

    const tagsSet = {};
    const responseTimesSet = {};

    contacts.forEach((c) => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t) => {
          tagsSet[t] = true;
        });
      }
      if (typeof c.estimated_response_time_minutes === 'number') {
        responseTimesSet[c.estimated_response_time_minutes] = true;
      }
    });

    const tags = Object.keys(tagsSet).sort();
    const maxResponseTimePresets = Object.keys(responseTimesSet)
      .map((k) => parseInt(k, 10))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);

    const sortOptions = [
      { value: 'response_time_asc', label: 'Response time: Fastest first' },
      { value: 'name_asc', label: 'Name: A to Z' }
    ];

    return {
      tags: tags,
      maxResponseTimePresets: maxResponseTimePresets,
      sortOptions: sortOptions
    };
  }

  // 36) searchContactDirectory

  searchContactDirectory(siteId, tags, onCall247Only, maxEstimatedResponseTimeMinutes, sortBy) {
    const contacts = this._getFromStorage('contacts', []);
    const sites = this._getFromStorage('sites', []);

    const filtered = contacts.filter((c) => {
      if (!c.is_active) return false;
      if (siteId && c.site_id && c.site_id !== siteId) return false;

      if (Array.isArray(tags) && tags.length > 0) {
        const ct = Array.isArray(c.tags) ? c.tags : [];
        const hasAll = tags.every((t) => ct.indexOf(t) !== -1);
        if (!hasAll) return false;
      }

      if (onCall247Only && !c.on_call_24_7) return false;

      if (
        typeof maxEstimatedResponseTimeMinutes === 'number' &&
        typeof c.estimated_response_time_minutes === 'number' &&
        c.estimated_response_time_minutes > maxEstimatedResponseTimeMinutes
      ) {
        return false;
      }

      return true;
    });

    const sort = sortBy || 'response_time_asc';
    filtered.sort((a, b) => {
      if (sort === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      // default response_time_asc
      const ar = typeof a.estimated_response_time_minutes === 'number' ? a.estimated_response_time_minutes : Infinity;
      const br = typeof b.estimated_response_time_minutes === 'number' ? b.estimated_response_time_minutes : Infinity;
      if (ar !== br) return ar - br;
      return (a.name || '').localeCompare(b.name || '');
    });

    const result = filtered.map((c) => {
      const site = sites.find((s) => s.id === c.site_id) || null;
      return {
        contactId: c.id,
        name: c.name,
        job_title: c.job_title || '',
        department: c.department || '',
        primary_phone: c.primary_phone,
        email: c.email || '',
        site_name: site ? site.name : '',
        tags: Array.isArray(c.tags) ? c.tags : [],
        estimated_response_time_minutes: c.estimated_response_time_minutes,
        on_call_24_7: !!c.on_call_24_7,
        is_active: !!c.is_active
      };
    });

    return { contacts: result };
  }

  // 37) createSiteContactList

  createSiteContactList(siteId, name, contactIds) {
    const sites = this._getFromStorage('sites', []);
    const site = sites.find((s) => s.id === siteId) || null;
    if (!site) {
      return { success: false, siteContactListId: null, created_at: null, message: 'Site not found.' };
    }

    const lists = this._getFromStorage('site_contact_lists', []);
    const id = this._generateId('scl');
    const now = new Date().toISOString();

    const record = {
      id: id,
      site_id: siteId,
      name: name,
      contact_ids: Array.isArray(contactIds) ? contactIds : [],
      created_at: now,
      updated_at: now
    };

    lists.push(record);
    this._saveToStorage('site_contact_lists', lists);

    return {
      success: true,
      siteContactListId: record.id,
      created_at: record.created_at,
      message: 'Site contact list created.'
    };
  }

  // 38) getAvailableReports

  getAvailableReports() {
    const reports = [
      {
        reportType: 'incident_compliance',
        name: 'Incident Compliance',
        description: 'Compliance of incidents (e.g., fire drills) by site and date range.'
      }
    ];
    return { reports: reports };
  }

  // 39) getIncidentComplianceReportOptions

  getIncidentComplianceReportOptions() {
    const sites = this._getFromStorage('sites', []);

    const dateRangeTypes = [
      { value: 'last_quarter', label: 'Last Quarter' },
      { value: 'last_30_days', label: 'Last 30 Days' },
      { value: 'this_month', label: 'This Month' },
      { value: 'this_year', label: 'This Year' },
      { value: 'custom', label: 'Custom Range' }
    ];

    const incidentTypesEnum = ['fire_drill', 'fire', 'suspicious_activity', 'medical', 'theft', 'other'];
    const incidentTypes = incidentTypesEnum.map((v) => ({ value: v, label: this._titleCase(v) }));

    return {
      dateRangeTypes: dateRangeTypes,
      sites: sites.map((s) => ({ id: s.id, name: s.name })),
      incidentTypes: incidentTypes
    };
  }

  // 40) generateIncidentComplianceReport

  generateIncidentComplianceReport(siteId, dateRangeType, startDate, endDate, incidentTypes) {
    const sites = this._getFromStorage('sites', []);
    const configs = this._getFromStorage('incident_compliance_reports', []);

    const site = sites.find((s) => s.id === siteId) || null;
    const siteName = site ? site.name : '';

    let startDateStr = startDate || null;
    let endDateStr = endDate || null;

    if (dateRangeType === 'last_quarter') {
      const range = this._getLastQuarterDateRange();
      startDateStr = range.startDateStr;
      endDateStr = range.endDateStr;
    } else if (dateRangeType === 'last_30_days') {
      const now = new Date();
      const past = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
      const pad = (n) => (n < 10 ? '0' + n : '' + n);
      startDateStr = past.getUTCFullYear() + '-' + pad(past.getUTCMonth() + 1) + '-' + pad(past.getUTCDate());
      endDateStr = now.getUTCFullYear() + '-' + pad(now.getUTCMonth() + 1) + '-' + pad(now.getUTCDate());
    } else if (dateRangeType === 'this_month') {
      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const start = new Date(Date.UTC(year, month, 1));
      const end = new Date(Date.UTC(year, month + 1, 0));
      const pad = (n) => (n < 10 ? '0' + n : '' + n);
      startDateStr = start.getUTCFullYear() + '-' + pad(start.getUTCMonth() + 1) + '-' + pad(start.getUTCDate());
      endDateStr = end.getUTCFullYear() + '-' + pad(end.getUTCMonth() + 1) + '-' + pad(end.getUTCDate());
    } else if (dateRangeType === 'this_year') {
      const now = new Date();
      const year = now.getUTCFullYear();
      startDateStr = year + '-01-01';
      endDateStr = year + '-12-31';
    } else if (dateRangeType === 'custom') {
      // use provided startDate and endDate
    }

    const id = this._generateId('icr');
    const nowIso = new Date().toISOString();

    const dateRangeLabel = this._buildDateRangeLabel(dateRangeType, startDateStr, endDateStr);

    const record = {
      id: id,
      report_type: 'incident_compliance',
      site_id: siteId,
      date_range_type: dateRangeType,
      start_date: startDateStr,
      end_date: endDateStr,
      incident_types: Array.isArray(incidentTypes) ? incidentTypes : [],
      title: 'Incident Compliance – ' + siteName + ' – ' + dateRangeLabel,
      description: '',
      generated_at: nowIso,
      site_name: siteName,
      date_range_label: dateRangeLabel
    };

    const metricsResult = this._internalGenerateIncidentComplianceMetrics(record);

    record.metrics = metricsResult.metrics;
    record.breakdown_by_month = metricsResult.breakdownByMonth;
    record.incidents_detail = metricsResult.incidents;

    configs.push(record);
    this._saveToStorage('incident_compliance_reports', configs);

    return {
      incidentComplianceReportId: record.id,
      siteName: siteName,
      dateRangeLabel: dateRangeLabel,
      incidentTypes: record.incident_types,
      generated_at: record.generated_at,
      metrics: metricsResult.metrics,
      breakdownByMonth: metricsResult.breakdownByMonth,
      incidents: metricsResult.incidents
    };
  }

  // 41) pinReportToDashboard

  pinReportToDashboard(incidentComplianceReportId, dashboardId, title) {
    const dashboards = this._getFromStorage('dashboards', []);
    const reports = this._getFromStorage('incident_compliance_reports', []);
    const items = this._getFromStorage('dashboard_items', []);

    const dashboard = dashboards.find((d) => d.id === dashboardId) || null;
    const report = reports.find((r) => r.id === incidentComplianceReportId) || null;

    if (!dashboard) {
      return { success: false, dashboardItemId: null, added_at: null, message: 'Dashboard not found.' };
    }
    if (!report) {
      return { success: false, dashboardItemId: null, added_at: null, message: 'Report not found.' };
    }

    const id = this._generateId('ditem');
    const now = new Date().toISOString();

    const maxPosition = items.reduce((max, it) => {
      if (it.dashboard_id === dashboardId && typeof it.position === 'number') {
        return Math.max(max, it.position);
      }
      return max;
    }, 0);

    const record = {
      id: id,
      dashboard_id: dashboardId,
      item_type: 'report',
      title: title || report.title || 'Incident Compliance Report',
      incident_compliance_report_id: incidentComplianceReportId,
      position: maxPosition + 1,
      added_at: now
    };

    items.push(record);
    this._saveToStorage('dashboard_items', items);

    return {
      success: true,
      dashboardItemId: record.id,
      added_at: record.added_at,
      message: 'Report pinned to dashboard.'
    };
  }

  // 42) getAboutPageContent

  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (!stored || typeof stored !== 'object') {
      return {
        mission: '',
        experienceSummary: '',
        certifications: [],
        keyDifferentiators: []
      };
    }
    return {
      mission: stored.mission || '',
      experienceSummary: stored.experienceSummary || '',
      certifications: Array.isArray(stored.certifications)
        ? stored.certifications.map((c) => ({ name: c.name || '', description: c.description || '' }))
        : [],
      keyDifferentiators: Array.isArray(stored.keyDifferentiators) ? stored.keyDifferentiators : []
    };
  }

  // 43) getContactPageContent

  getContactPageContent() {
    const stored = this._getFromStorage('contact_page_content', null);
    if (!stored || typeof stored !== 'object') {
      return {
        primaryPhone: '',
        emergencyPhone: '',
        email: '',
        addressLines: [],
        quickLinks: []
      };
    }
    return {
      primaryPhone: stored.primaryPhone || '',
      emergencyPhone: stored.emergencyPhone || '',
      email: stored.email || '',
      addressLines: Array.isArray(stored.addressLines) ? stored.addressLines : [],
      quickLinks: Array.isArray(stored.quickLinks)
        ? stored.quickLinks.map((q) => ({ label: q.label || '', targetPage: q.targetPage || '' }))
        : []
    };
  }

  // 44) submitContactForm

  submitContactForm(name, email, phone, messageType, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('cmsg');
    const now = new Date().toISOString();

    const record = {
      id: id,
      name: name,
      email: email,
      phone: phone || '',
      message_type: messageType || 'general_question',
      message: message,
      created_at: now
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      messageId: record.id,
      message: 'Contact form submitted.'
    };
  }

  // -------------------- TEMPLATE LEGACY METHOD (unused) --------------------
  // Included only to align with provided structure; does not affect domain logic.

  addToCart(userId, productId, quantity) {
    // Placeholder to keep template compatibility. Not used in this domain.
    quantity = typeof quantity === 'number' ? quantity : 1;
    let carts = this._getFromStorage('carts', []);
    let cartItems = this._getFromStorage('cartItems', []);

    let cart = carts.find((c) => c.userId === userId);
    if (!cart) {
      cart = { id: this._generateId('cart'), userId: userId };
      carts.push(cart);
    }

    let item = cartItems.find((ci) => ci.cartId === cart.id && ci.productId === productId);
    if (!item) {
      item = { id: this._generateId('citem'), cartId: cart.id, productId: productId, quantity: 0 };
      cartItems.push(item);
    }
    item.quantity += quantity;

    this._saveToStorage('carts', carts);
    this._saveToStorage('cartItems', cartItems);

    return { success: true, cartId: cart.id };
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
