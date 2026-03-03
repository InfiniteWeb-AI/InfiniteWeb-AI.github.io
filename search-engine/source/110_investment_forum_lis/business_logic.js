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
    const keys = [
      // Core HYIP entities
      'programs',
      'program_plans',
      'program_comments',
      'program_polls',
      'poll_options',
      'saved_programs',
      'account_settings',
      'program_listing_filter_states',
      'forum_categories',
      'forum_threads',
      'forum_posts',
      'community_profiles',
      'private_messages',
      'risk_alerts',
      // Misc / support
      'contact_submissions'
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

  // ----------------------
  // Generic format / util
  // ----------------------

  _formatCurrencyUSD(amount) {
    if (amount == null || isNaN(amount)) return '';
    const num = Number(amount);
    return '$' + num.toFixed(2) + ' USD';
  }

  _formatPercent(value, suffix) {
    if (value == null || isNaN(value)) return '';
    const num = Number(value);
    const base = num.toFixed(2).replace(/\.00$/, '') + '%';
    return suffix ? base + ' ' + suffix : base;
  }

  _formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _mapStatusToLabel(status) {
    switch (status) {
      case 'paying':
        return 'Paying';
      case 'waiting':
        return 'Waiting';
      case 'not_paying':
        return 'Not Paying';
      case 'scam':
        return 'Scam';
      case 'closed':
        return 'Closed';
      case 'unknown':
        return 'Unknown';
      default:
        return '';
    }
  }

  _mapRiskToLabel(risk) {
    switch (risk) {
      case 'very_low':
        return 'Very Low Risk';
      case 'low':
        return 'Low Risk';
      case 'medium':
        return 'Medium Risk';
      case 'high':
        return 'High Risk';
      case 'scam':
        return 'Scam / Do Not Invest';
      default:
        return '';
    }
  }

  _ensureArray(val) {
    return Array.isArray(val) ? val : [];
  }

  // ----------------------
  // Required helpers
  // ----------------------

  // Internal helper to load account settings from storage or create defaults
  _getOrCreateAccountSettings() {
    let settingsArr = this._getFromStorage('account_settings');
    if (!Array.isArray(settingsArr)) settingsArr = [];

    if (settingsArr.length === 0) {
      const now = new Date().toISOString();
      const settings = {
        id: 'account_settings_1',
        default_currency: 'usd',
        dashboard_min_daily_roi_percent: null,
        dashboard_show_closed_programs: true,
        dashboard_status_filter: null,
        notifications_watchlist_risk_in_site: false,
        notifications_scam_alerts_in_site: false,
        created_at: now,
        updated_at: now
      };
      settingsArr.push(settings);
      this._saveToStorage('account_settings', settingsArr);
      return settings;
    }

    return settingsArr[0];
  }

  // Internal helper to persist last-used listing filter state
  _persistProgramListingFilterState(state) {
    let states = this._getFromStorage('program_listing_filter_states');
    if (!Array.isArray(states)) states = [];

    const now = new Date().toISOString();
    const id = 'listing_state_1';
    const existingIndex = states.findIndex((s) => s.id === id);

    const newState = {
      id,
      view: state.view || 'all_programs',
      status_filter: state.status_filter || null,
      payment_method_filter: state.payment_method_filter || null,
      min_daily_roi_percent: state.min_daily_roi_percent != null ? state.min_daily_roi_percent : null,
      max_daily_roi_percent: state.max_daily_roi_percent != null ? state.max_daily_roi_percent : null,
      min_min_deposit_usd: state.min_min_deposit_usd != null ? state.min_min_deposit_usd : null,
      max_min_deposit_usd: state.max_min_deposit_usd != null ? state.max_min_deposit_usd : null,
      min_running_days: state.min_running_days != null ? state.min_running_days : null,
      max_running_days: state.max_running_days != null ? state.max_running_days : null,
      start_date_from: state.start_date_from || null,
      start_date_to: state.start_date_to || null,
      min_payout_rating_value: state.min_payout_rating_value != null ? state.min_payout_rating_value : null,
      last_applied_at: now
    };

    if (existingIndex >= 0) {
      states[existingIndex] = newState;
    } else {
      states.push(newState);
    }

    this._saveToStorage('program_listing_filter_states', states);
    return newState;
  }

  // Internal helper to create, update, or delete SavedProgram records
  _getOrUpdateSavedProgram(programId, save_type, notes) {
    let savedPrograms = this._getFromStorage('saved_programs');
    if (!Array.isArray(savedPrograms)) savedPrograms = [];

    const now = new Date().toISOString();
    let saved = savedPrograms.find((s) => s.program_id === programId);

    if (save_type == null) {
      // delete
      if (saved) {
        savedPrograms = savedPrograms.filter((s) => s.program_id !== programId);
        this._saveToStorage('saved_programs', savedPrograms);
      }
      return null;
    }

    if (saved) {
      saved.save_type = save_type;
      if (typeof notes === 'string') {
        saved.notes = notes;
      }
    } else {
      saved = {
        id: this._generateId('saved'),
        program_id: programId,
        save_type,
        created_at: now,
        notes: typeof notes === 'string' ? notes : undefined
      };
      savedPrograms.push(saved);
    }

    this._saveToStorage('saved_programs', savedPrograms);
    return saved;
  }

  // Internal helper to mark RiskAlert items as read
  _recordRiskAlertReadStatus(alertIds) {
    if (!alertIds || !alertIds.length) return;
    let alerts = this._getFromStorage('risk_alerts');
    if (!Array.isArray(alerts) || alerts.length === 0) return;

    const idSet = new Set(alertIds);
    let changed = false;
    alerts = alerts.map((a) => {
      if (idSet.has(a.id) && a.is_read !== true) {
        changed = true;
        return { ...a, is_read: true };
      }
      return a;
    });

    if (changed) {
      this._saveToStorage('risk_alerts', alerts);
    }
  }

  // Internal helper to validate review body
  _validateReviewContent(body, requireMultipleSentences) {
    if (typeof body !== 'string') return { valid: false, message: 'Review text is required.' };
    const trimmed = body.trim();
    if (trimmed.length < 20) {
      return { valid: false, message: 'Review must be at least 20 characters long.' };
    }
    if (requireMultipleSentences) {
      const sentenceCount = trimmed
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0).length;
      if (sentenceCount < 2) {
        return { valid: false, message: 'Review must contain at least two sentences.' };
      }
    }
    return { valid: true, message: '' };
  }

  // Internal helper to apply dashboard filters
  _applyDashboardFilters(programs, savedPrograms, settings, riskAlerts) {
    const statusFilter = this._ensureArray(settings.dashboard_status_filter);
    const hasStatusFilter = statusFilter && statusFilter.length > 0;
    const minRoi = settings.dashboard_min_daily_roi_percent != null
      ? Number(settings.dashboard_min_daily_roi_percent)
      : null;
    const showClosed = settings.dashboard_show_closed_programs !== false;

    const active = [];
    const unreadAlertIds = [];

    savedPrograms.forEach((sp) => {
      const program = programs.find((p) => p.id === sp.program_id);
      if (!program) return;

      if (!showClosed && program.status === 'closed') return;
      if (hasStatusFilter && !statusFilter.includes(program.status)) return;

      if (minRoi != null && program.daily_roi_percent != null) {
        if (Number(program.daily_roi_percent) < minRoi) return;
      }

      const alertsForProgram = this._ensureArray(riskAlerts).filter(
        (a) => a.program_id === program.id
      );
      const has_new_alerts = alertsForProgram.some((a) => a.is_read !== true);
      if (has_new_alerts) {
        unreadAlertIds.push(
          ...alertsForProgram.filter((a) => a.is_read !== true).map((a) => a.id)
        );
      }

      const savedWithProgram = { ...sp, program };
      active.push({
        program,
        saved_program: savedWithProgram,
        daily_roi_display: this._formatPercent(program.daily_roi_percent, 'daily'),
        min_deposit_display: this._formatCurrencyUSD(program.min_deposit_usd),
        status_label: this._mapStatusToLabel(program.status),
        has_new_alerts
      });
    });

    if (unreadAlertIds.length) {
      this._recordRiskAlertReadStatus(unreadAlertIds);
    }

    return active;
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // 1. getHomeOverview
  getHomeOverview() {
    const programs = this._getFromStorage('programs');
    let riskAlerts = this._getFromStorage('risk_alerts');
    const now = new Date();

    // Featured programs: use is_featured flag
    const featured_programs = this._ensureArray(programs)
      .filter((p) => p.is_featured === true)
      .map((p) => ({
        program: p,
        highlight_reason: 'Featured program',
        daily_roi_display: this._formatPercent(p.daily_roi_percent, 'daily'),
        min_deposit_display: this._formatCurrencyUSD(p.min_deposit_usd),
        status_label: this._mapStatusToLabel(p.status)
      }));

    // New programs: sort by start_date desc
    const new_programs_sorted = [...this._ensureArray(programs)].sort((a, b) => {
      const da = this._parseDate(a.start_date);
      const db = this._parseDate(b.start_date);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });

    const new_programs = new_programs_sorted.map((p) => ({
      program: p,
      start_date_display: this._formatDate(p.start_date),
      daily_roi_display: this._formatPercent(p.daily_roi_percent, 'daily'),
      min_deposit_display: this._formatCurrencyUSD(p.min_deposit_usd)
    }));

    // Recent scam alerts: risk alerts whose programs are problematic
    const programsById = new Map();
    this._ensureArray(programs).forEach((p) => {
      programsById.set(p.id, p);
    });

    riskAlerts = this._ensureArray(riskAlerts).filter((a) => {
      const program = programsById.get(a.program_id);
      if (!program) return false;
      return program.is_problematic === true ||
        program.status === 'scam' ||
        program.status === 'not_paying';
    });

    riskAlerts.sort((a, b) => {
      const da = this._parseDate(a.created_at);
      const db = this._parseDate(b.created_at);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return tb - ta;
    });

    const recent_scam_alerts = riskAlerts.map((a) => {
      const program = programsById.get(a.program_id) || null;
      const latest_risk_alert = { ...a, program };
      return { program, latest_risk_alert };
    });

    // Mark these alerts as read
    this._recordRiskAlertReadStatus(riskAlerts.map((a) => a.id));

    // Summary counts
    const total_paying_programs = this._ensureArray(programs).filter(
      (p) => p.status === 'paying'
    ).length;

    const total_problematic_programs = this._ensureArray(programs).filter(
      (p) => p.is_problematic === true || p.status === 'scam' || p.status === 'not_paying'
    ).length;

    const total_new_programs_7d = this._ensureArray(programs).filter((p) => {
      const start = this._parseDate(p.start_date);
      if (!start) return false;
      const diffMs = now.getTime() - start.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays <= 7 && diffDays >= 0;
    }).length;

    return {
      featured_programs,
      new_programs,
      recent_scam_alerts,
      summary_counts: {
        total_paying_programs,
        total_problematic_programs,
        total_new_programs_7d
      }
    };
  }

  // 2. searchSite(query, type_filter = 'all', page = 1, page_size = 20)
  searchSite(query, type_filter = 'all', page = 1, page_size = 20) {
    const q = (query || '').toLowerCase();
    const type = type_filter || 'all';

    const programs = this._getFromStorage('programs');
    const forumThreads = this._getFromStorage('forum_threads');
    const forumCategories = this._getFromStorage('forum_categories');
    const profiles = this._getFromStorage('community_profiles');

    let program_results = [];
    let forum_thread_results = [];

    if (type === 'all' || type === 'programs') {
      program_results = this._ensureArray(programs).filter((p) => {
        const name = (p.name || '').toLowerCase();
        const slug = (p.slug || '').toLowerCase();
        return q && (name.includes(q) || slug.includes(q));
      });
    }

    if (type === 'all' || type === 'forum') {
      forum_thread_results = this._ensureArray(forumThreads).filter((t) => {
        const title = (t.title || '').toLowerCase();
        return q && title.includes(q);
      });

      // foreign key resolution for ForumThread
      const catMap = new Map();
      this._ensureArray(forumCategories).forEach((c) => catMap.set(c.id, c));
      const profileMap = new Map();
      this._ensureArray(profiles).forEach((p) => profileMap.set(p.id, p));

      forum_thread_results = forum_thread_results.map((t) => ({
        ...t,
        category: catMap.get(t.category_id) || null,
        author_profile: t.author_profile_id
          ? profileMap.get(t.author_profile_id) || null
          : null
      }));
    }

    const paginate = (arr) => {
      const total = arr.length;
      const p = Math.max(1, parseInt(page, 10) || 1);
      const size = Math.max(1, parseInt(page_size, 10) || 20);
      const start = (p - 1) * size;
      const end = start + size;
      return arr.slice(start, end);
    };

    const pagedPrograms = paginate(program_results);
    const pagedThreads = paginate(forum_thread_results);

    return {
      query: query || '',
      program_results: pagedPrograms,
      forum_thread_results: pagedThreads,
      total_program_results: program_results.length,
      total_forum_thread_results: forum_thread_results.length
    };
  }

  // 3. getProgramListingFilterOptions()
  getProgramListingFilterOptions() {
    const programs = this._getFromStorage('programs');
    const list = this._ensureArray(programs);

    // status options (static labels)
    const status_options = [
      { value: 'paying', label: 'Paying' },
      { value: 'waiting', label: 'Waiting' },
      { value: 'not_paying', label: 'Not Paying' },
      { value: 'scam', label: 'Scam' },
      { value: 'closed', label: 'Closed' },
      { value: 'unknown', label: 'Unknown' }
    ];

    // payment methods derived from data
    const pmSet = new Set();
    list.forEach((p) => {
      this._ensureArray(p.payment_methods).forEach((m) => {
        if (m) pmSet.add(m);
      });
    });
    const payment_method_options = Array.from(pmSet).map((m) => ({
      value: m,
      label: m.charAt(0).toUpperCase() + m.slice(1)
    }));

    const sort_options = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'rating_asc', label: 'Rating: Low to High' },
      { value: 'roi_desc', label: 'ROI: High to Low' },
      { value: 'roi_asc', label: 'ROI: Low to High' },
      { value: 'start_date_newest', label: 'Start Date: Newest First' },
      { value: 'start_date_oldest', label: 'Start Date: Oldest First' },
      { value: 'running_days_asc', label: 'Running Days: Fewest First' },
      { value: 'running_days_desc', label: 'Running Days: Most First' }
    ];

    let minRoi = null;
    let maxRoi = null;
    let minDep = null;
    let maxDep = null;
    let minDays = null;
    let maxDays = null;
    let minRating = null;
    let maxRating = null;

    list.forEach((p) => {
      if (p.daily_roi_percent != null) {
        const v = Number(p.daily_roi_percent);
        if (minRoi == null || v < minRoi) minRoi = v;
        if (maxRoi == null || v > maxRoi) maxRoi = v;
      }
      if (p.min_deposit_usd != null) {
        const v = Number(p.min_deposit_usd);
        if (minDep == null || v < minDep) minDep = v;
        if (maxDep == null || v > maxDep) maxDep = v;
      }
      if (p.running_days != null) {
        const v = Number(p.running_days);
        if (minDays == null || v < minDays) minDays = v;
        if (maxDays == null || v > maxDays) maxDays = v;
      }
      if (p.payout_rating_value != null) {
        const v = Number(p.payout_rating_value);
        if (minRating == null || v < minRating) minRating = v;
        if (maxRating == null || v > maxRating) maxRating = v;
      }
    });

    return {
      status_options,
      payment_method_options,
      sort_options,
      roi_range: {
        min_daily_roi_percent: minRoi,
        max_daily_roi_percent: maxRoi
      },
      min_deposit_range_usd: {
        min_value: minDep,
        max_value: maxDep
      },
      running_days_range: {
        min_days: minDays,
        max_days: maxDays
      },
      payout_rating_range: {
        min_value: minRating,
        max_value: maxRating
      }
    };
  }

  // 4. getProgramsList(view, filters, sort_by, page, page_size)
  getProgramsList(
    view = 'all_programs',
    filters = {},
    sort_by = 'rating_desc',
    page = 1,
    page_size = 20
  ) {
    const allPrograms = this._getFromStorage('programs');
    const savedPrograms = this._getFromStorage('saved_programs');

    let list = this._ensureArray(allPrograms);

    if (view === 'problematic_programs') {
      list = list.filter(
        (p) => p.is_problematic === true || p.status === 'scam' || p.status === 'not_paying'
      );
    }

    const f = filters || {};

    // status_filter
    if (Array.isArray(f.status_filter) && f.status_filter.length) {
      const stSet = new Set(f.status_filter);
      list = list.filter((p) => stSet.has(p.status));
    }

    // payment_method_filter
    if (Array.isArray(f.payment_method_filter) && f.payment_method_filter.length) {
      const pmSet = new Set(f.payment_method_filter);
      list = list.filter((p) => {
        const methods = this._ensureArray(p.payment_methods);
        return methods.some((m) => pmSet.has(m));
      });
    }

    // ROI
    if (f.min_daily_roi_percent != null) {
      const minRoi = Number(f.min_daily_roi_percent);
      list = list.filter(
        (p) => p.daily_roi_percent != null && Number(p.daily_roi_percent) >= minRoi
      );
    }
    if (f.max_daily_roi_percent != null) {
      const maxRoi = Number(f.max_daily_roi_percent);
      list = list.filter(
        (p) => p.daily_roi_percent != null && Number(p.daily_roi_percent) <= maxRoi
      );
    }

    // Min deposit
    if (f.min_min_deposit_usd != null) {
      const minDep = Number(f.min_min_deposit_usd);
      list = list.filter(
        (p) => p.min_deposit_usd != null && Number(p.min_deposit_usd) >= minDep
      );
    }
    if (f.max_min_deposit_usd != null) {
      const maxDep = Number(f.max_min_deposit_usd);
      list = list.filter(
        (p) => p.min_deposit_usd != null && Number(p.min_deposit_usd) <= maxDep
      );
    }

    // Running days
    if (f.min_running_days != null) {
      const minDays = Number(f.min_running_days);
      list = list.filter(
        (p) => p.running_days != null && Number(p.running_days) >= minDays
      );
    }
    if (f.max_running_days != null) {
      const maxDays = Number(f.max_running_days);
      list = list.filter(
        (p) => p.running_days != null && Number(p.running_days) <= maxDays
      );
    }

    // Start date range
    if (f.start_date_from) {
      const from = this._parseDate(f.start_date_from);
      if (from) {
        const fromTs = from.getTime();
        list = list.filter((p) => {
          const d = this._parseDate(p.start_date);
          return d && d.getTime() >= fromTs;
        });
      }
    }
    if (f.start_date_to) {
      const to = this._parseDate(f.start_date_to);
      if (to) {
        const toTs = to.getTime();
        list = list.filter((p) => {
          const d = this._parseDate(p.start_date);
          return d && d.getTime() <= toTs;
        });
      }
    }

    // Payout rating filter
    if (f.min_payout_rating_value != null) {
      const minRating = Number(f.min_payout_rating_value);
      list = list.filter(
        (p) => p.payout_rating_value != null && Number(p.payout_rating_value) >= minRating
      );
    }

    // Sorting
    const sort = sort_by || 'rating_desc';
    list = [...list];

    const compareNumDesc = (a, b, field) => {
      const va = a[field] != null ? Number(a[field]) : -Infinity;
      const vb = b[field] != null ? Number(b[field]) : -Infinity;
      return vb - va;
    };
    const compareNumAsc = (a, b, field) => {
      const va = a[field] != null ? Number(a[field]) : Infinity;
      const vb = b[field] != null ? Number(b[field]) : Infinity;
      return va - vb;
    };

    switch (sort) {
      case 'rating_desc':
        list.sort((a, b) => compareNumDesc(a, b, 'payout_rating_value'));
        break;
      case 'rating_asc':
        list.sort((a, b) => compareNumAsc(a, b, 'payout_rating_value'));
        break;
      case 'roi_desc':
        list.sort((a, b) => compareNumDesc(a, b, 'daily_roi_percent'));
        break;
      case 'roi_asc':
        list.sort((a, b) => compareNumAsc(a, b, 'daily_roi_percent'));
        break;
      case 'start_date_newest':
        list.sort((a, b) => {
          const da = this._parseDate(a.start_date);
          const db = this._parseDate(b.start_date);
          const ta = da ? da.getTime() : 0;
          const tb = db ? db.getTime() : 0;
          return tb - ta;
        });
        break;
      case 'start_date_oldest':
        list.sort((a, b) => {
          const da = this._parseDate(a.start_date);
          const db = this._parseDate(b.start_date);
          const ta = da ? da.getTime() : 0;
          const tb = db ? db.getTime() : 0;
          return ta - tb;
        });
        break;
      case 'running_days_asc':
        list.sort((a, b) => compareNumAsc(a, b, 'running_days'));
        break;
      case 'running_days_desc':
        list.sort((a, b) => compareNumDesc(a, b, 'running_days'));
        break;
      default:
        break;
    }

    // Pagination
    const total_items = list.length;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.max(1, parseInt(page_size, 10) || 20);
    const start = (p - 1) * size;
    const end = start + size;
    const pageItems = list.slice(start, end);

    // Saved program flags
    const savedByProgram = new Map();
    this._ensureArray(savedPrograms).forEach((sp) => {
      savedByProgram.set(sp.program_id, sp);
    });

    const items = pageItems.map((program) => {
      const sp = savedByProgram.get(program.id);
      const is_saved_watchlist = sp ? sp.save_type === 'watchlist' : false;
      const is_saved_bookmark = sp ? sp.save_type === 'bookmark' : false;
      const is_saved_blacklist = sp ? sp.save_type === 'blacklist' : false;

      return {
        program,
        daily_roi_display: this._formatPercent(program.daily_roi_percent, 'daily'),
        min_deposit_display: this._formatCurrencyUSD(program.min_deposit_usd),
        status_label: this._mapStatusToLabel(program.status),
        payout_rating_display:
          program.payout_rating_value != null
            ? this._formatPercent(program.payout_rating_value)
            : '',
        is_saved_watchlist,
        is_saved_bookmark,
        is_saved_blacklist
      };
    });

    const filters_applied = this._persistProgramListingFilterState({
      view,
      status_filter: f.status_filter || null,
      payment_method_filter: f.payment_method_filter || null,
      min_daily_roi_percent: f.min_daily_roi_percent != null ? f.min_daily_roi_percent : null,
      max_daily_roi_percent: f.max_daily_roi_percent != null ? f.max_daily_roi_percent : null,
      min_min_deposit_usd: f.min_min_deposit_usd != null ? f.min_min_deposit_usd : null,
      max_min_deposit_usd: f.max_min_deposit_usd != null ? f.max_min_deposit_usd : null,
      min_running_days: f.min_running_days != null ? f.min_running_days : null,
      max_running_days: f.max_running_days != null ? f.max_running_days : null,
      start_date_from: f.start_date_from || null,
      start_date_to: f.start_date_to || null,
      min_payout_rating_value: f.min_payout_rating_value != null ? f.min_payout_rating_value : null
    });

    return {
      view,
      filters_applied,
      items,
      pagination: {
        page: p,
        page_size: size,
        total_items,
        total_pages: Math.ceil(total_items / size) || 0
      }
    };
  }

  // 5. getProgramDetailView(programId)
  getProgramDetailView(programId) {
    const programs = this._getFromStorage('programs');
    const program_plans = this._getFromStorage('program_plans');
    const program_comments = this._getFromStorage('program_comments');
    const program_polls = this._getFromStorage('program_polls');
    const saved_programs = this._getFromStorage('saved_programs');
    const profiles = this._getFromStorage('community_profiles');

    const program = this._ensureArray(programs).find((p) => p.id === programId) || null;

    if (!program) {
      return {
        program: null,
        plans: [],
        stats_display: {},
        saved_status: {
          is_watchlisted: false,
          is_bookmarked: false,
          is_blacklisted: false
        },
        discussion_summary: {
          comment_count: 0,
          latest_comment: null
        },
        poll_summary: {
          has_active_poll: false,
          question: null,
          has_user_voted: false
        },
        risk_info: {
          risk_level: null,
          risk_label: ''
        }
      };
    }

    // Instrumentation for task completion tracking (task2_comparedProgramIds)
    try {
      if (program.status === 'paying') {
        const runningDays = Number(program.running_days);
        if (!isNaN(runningDays) && runningDays >= 10 && runningDays <= 60) {
          const key = 'task2_comparedProgramIds';
          let stored = localStorage.getItem(key);
          let obj;
          try {
            obj = stored ? JSON.parse(stored) : null;
          } catch (e) {
            obj = null;
          }
          if (
            !obj ||
            typeof obj !== 'object' ||
            !Array.isArray(obj.comparedProgramIds)
          ) {
            obj = { comparedProgramIds: [] };
          }
          const ids = obj.comparedProgramIds;
          if (!ids.includes(programId) && ids.length < 2) {
            ids.push(programId);
            localStorage.setItem(key, JSON.stringify(obj));
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    // Plans
    const plansRaw = this._ensureArray(program_plans).filter(
      (pp) => pp.program_id === programId
    );
    const plans = plansRaw.map((pp) => ({ ...pp, program }));

    // Stats display
    const stats_display = {
      daily_roi_display: this._formatPercent(program.daily_roi_percent, 'daily'),
      min_deposit_display: this._formatCurrencyUSD(program.min_deposit_usd),
      total_return_30d_display:
        program.total_return_30d_percent != null
          ? this._formatPercent(program.total_return_30d_percent)
          : '',
      running_days_display:
        program.running_days != null ? String(program.running_days) + ' days' : '',
      payout_rating_display:
        program.payout_rating_value != null
          ? this._formatPercent(program.payout_rating_value)
          : '',
      payment_methods_display: this._ensureArray(program.payment_methods).join(', ')
    };

    // Saved status
    const sp = this._ensureArray(saved_programs).find((s) => s.program_id === programId);
    const saved_status = {
      is_watchlisted: sp ? sp.save_type === 'watchlist' : false,
      is_bookmarked: sp ? sp.save_type === 'bookmark' : false,
      is_blacklisted: sp ? sp.save_type === 'blacklist' : false
    };

    // Discussion summary
    const commentsRaw = this._ensureArray(program_comments).filter(
      (c) => c.program_id === programId
    );

    let latest_comment = null;
    if (commentsRaw.length) {
      commentsRaw.sort((a, b) => {
        const da = this._parseDate(a.created_at);
        const db = this._parseDate(b.created_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      });
      const c = commentsRaw[0];
      const author_profile = c.author_profile_id
        ? this._ensureArray(profiles).find((p) => p.id === c.author_profile_id) || null
        : null;
      latest_comment = { ...c, program, author_profile };
    }

    const discussion_summary = {
      comment_count: program.comment_count != null
        ? Number(program.comment_count)
        : commentsRaw.length,
      latest_comment
    };

    // Poll summary
    const poll = this._ensureArray(program_polls).find((p) => p.program_id === programId) || null;
    const poll_summary = poll
      ? {
          has_active_poll: true,
          question: poll.question,
          has_user_voted: !!poll.has_user_voted
        }
      : {
          has_active_poll: false,
          question: null,
          has_user_voted: false
        };

    // Risk info
    const risk_level = program.risk_level || null;
    const risk_info = {
      risk_level,
      risk_label: this._mapRiskToLabel(risk_level)
    };

    return {
      program,
      plans,
      stats_display,
      saved_status,
      discussion_summary,
      poll_summary,
      risk_info
    };
  }

  // 6. saveProgram(programId, save_type, notes)
  saveProgram(programId, save_type, notes) {
    if (!programId || !save_type) {
      return {
        success: false,
        saved_program: null,
        message: 'programId and save_type are required.'
      };
    }

    if (!['watchlist', 'bookmark', 'blacklist'].includes(save_type)) {
      return {
        success: false,
        saved_program: null,
        message: 'Invalid save_type.'
      };
    }

    const programs = this._getFromStorage('programs');
    const program = this._ensureArray(programs).find((p) => p.id === programId) || null;

    // It's allowed to save even if program not found, but better to check
    if (!program) {
      return {
        success: false,
        saved_program: null,
        message: 'Program not found.'
      };
    }

    const saved = this._getOrUpdateSavedProgram(programId, save_type, notes);
    const saved_program = saved ? { ...saved, program } : null;

    // Instrumentation for task completion tracking (task2_bookmarkedProgramId)
    try {
      if (
        save_type === 'bookmark' &&
        saved &&
        program &&
        program.status === 'paying'
      ) {
        const runningDays = Number(program.running_days);
        if (!isNaN(runningDays) && runningDays >= 10 && runningDays <= 60) {
          const existing = localStorage.getItem('task2_bookmarkedProgramId');
          if (!existing) {
            localStorage.setItem('task2_bookmarkedProgramId', programId);
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: !!saved,
      saved_program,
      message: saved ? 'Program saved successfully.' : 'Unable to save program.'
    };
  }

  // 7. removeSavedProgram(programId)
  removeSavedProgram(programId) {
    if (!programId) {
      return { success: false, message: 'programId is required.' };
    }

    let savedPrograms = this._getFromStorage('saved_programs');
    const before = savedPrograms.length;
    savedPrograms = this._ensureArray(savedPrograms).filter(
      (s) => s.program_id !== programId
    );
    this._saveToStorage('saved_programs', savedPrograms);

    const removed = before !== savedPrograms.length;
    return {
      success: removed,
      message: removed ? 'Program removed from saved list.' : 'Program was not saved.'
    };
  }

  // 8. getSavedPrograms(filter_save_type = 'all')
  getSavedPrograms(filter_save_type = 'all') {
    const programs = this._getFromStorage('programs');
    const savedPrograms = this._getFromStorage('saved_programs');

    const list = this._ensureArray(savedPrograms).filter((sp) => {
      if (filter_save_type === 'all') return true;
      return sp.save_type === filter_save_type;
    });

    const byProgram = new Map();
    this._ensureArray(programs).forEach((p) => byProgram.set(p.id, p));

    const wrap = (saveType) => {
      return list
        .filter((sp) => sp.save_type === saveType)
        .map((sp) => {
          const program = byProgram.get(sp.program_id) || null;
          const saved_program = { ...sp, program };
          return { saved_program, program };
        });
    };

    return {
      watchlist: wrap('watchlist'),
      bookmarks: wrap('bookmark'),
      blacklist: wrap('blacklist')
    };
  }

  // 9. getProgramDiscussion(programId, sort_by, page, page_size)
  getProgramDiscussion(programId, sort_by = 'newest', page = 1, page_size = 20) {
    const programs = this._getFromStorage('programs');
    const program_comments = this._getFromStorage('program_comments');
    const profiles = this._getFromStorage('community_profiles');

    const program = this._ensureArray(programs).find((p) => p.id === programId) || null;

    let comments = this._ensureArray(program_comments).filter(
      (c) => c.program_id === programId
    );

    // Sort
    const sort = sort_by || 'newest';
    if (sort === 'newest') {
      comments.sort((a, b) => {
        const da = this._parseDate(a.created_at);
        const db = this._parseDate(b.created_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      });
    } else if (sort === 'oldest') {
      comments.sort((a, b) => {
        const da = this._parseDate(a.created_at);
        const db = this._parseDate(b.created_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return ta - tb;
      });
    } else if (sort === 'highest_rating') {
      comments.sort((a, b) => {
        const ra = a.rating_stars != null ? Number(a.rating_stars) : -Infinity;
        const rb = b.rating_stars != null ? Number(b.rating_stars) : -Infinity;
        return rb - ra;
      });
    }

    const total_items = comments.length;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.max(1, parseInt(page_size, 10) || 20);
    const start = (p - 1) * size;
    const end = start + size;

    const profileMap = new Map();
    this._ensureArray(profiles).forEach((pr) => profileMap.set(pr.id, pr));

    const pageComments = comments.slice(start, end).map((c) => ({
      ...c,
      program,
      author_profile: c.author_profile_id
        ? profileMap.get(c.author_profile_id) || null
        : null
    }));

    return {
      program,
      sort_by: sort,
      comments: pageComments,
      pagination: {
        page: p,
        page_size: size,
        total_items,
        total_pages: Math.ceil(total_items / size) || 0
      }
    };
  }

  // 10. postProgramReview(programId, rating_stars, body, mark_as_review)
  postProgramReview(programId, rating_stars, body, mark_as_review = true) {
    const programs = this._getFromStorage('programs');
    const program_comments = this._getFromStorage('program_comments');

    const program = this._ensureArray(programs).find((p) => p.id === programId) || null;
    if (!program) {
      return {
        success: false,
        comment: null,
        message: 'Program not found.'
      };
    }

    const requireMultipleSentences = !!mark_as_review;
    const validation = this._validateReviewContent(body, requireMultipleSentences);
    if (!validation.valid) {
      return {
        success: false,
        comment: null,
        message: validation.message
      };
    }

    let stars = rating_stars != null ? Number(rating_stars) : null;
    if (stars != null) {
      if (stars < 1) stars = 1;
      if (stars > 5) stars = 5;
    }

    const now = new Date().toISOString();
    const community_profiles = this._getFromStorage('community_profiles');
    const defaultProfile = this._ensureArray(community_profiles)[0] || null;
    const author_profile_id = defaultProfile ? defaultProfile.id : null;
    const author_username = defaultProfile ? defaultProfile.username : 'local_user';
    const comment = {
      id: this._generateId('comment'),
      program_id: programId,
      author_profile_id: author_profile_id,
      author_username: author_username,
      body: String(body),
      rating_stars: stars,
      is_review: !!mark_as_review,
      created_at: now,
      edited_at: null
    };

    const updatedComments = [...this._ensureArray(program_comments), comment];
    this._saveToStorage('program_comments', updatedComments);

    // Update program.comment_count and payout_rating_value
    const commentsForProgram = updatedComments.filter((c) => c.program_id === programId);
    const reviewStars = commentsForProgram
      .filter((c) => c.is_review && c.rating_stars != null)
      .map((c) => Number(c.rating_stars));

    let payoutRating = program.payout_rating_value;
    if (reviewStars.length) {
      const sum = reviewStars.reduce((acc, v) => acc + v, 0);
      payoutRating = sum / reviewStars.length;
    }

    const updatedPrograms = this._ensureArray(programs).map((p) => {
      if (p.id !== programId) return p;
      return {
        ...p,
        comment_count: commentsForProgram.length,
        payout_rating_value: payoutRating
      };
    });
    this._saveToStorage('programs', updatedPrograms);

    const fullComment = { ...comment, program, author_profile: null };

    return {
      success: true,
      comment: fullComment,
      message: 'Review posted successfully.'
    };
  }

  // 11. getProgramPoll(programId)
  getProgramPoll(programId) {
    const program_polls = this._getFromStorage('program_polls');
    const poll_options = this._getFromStorage('poll_options');
    const programs = this._getFromStorage('programs');

    const poll = this._ensureArray(program_polls).find((p) => p.program_id === programId) || null;
    if (!poll) {
      return {
        poll: null,
        options: []
      };
    }

    const program = this._ensureArray(programs).find((p) => p.id === programId) || null;
    const pollWithProgram = { ...poll, program };

    const options = this._ensureArray(poll_options)
      .filter((o) => o.poll_id === poll.id)
      .map((o) => ({ ...o, poll: pollWithProgram }));

    return {
      poll: pollWithProgram,
      options
    };
  }

  // 12. castProgramPollVote(pollId, optionId)
  castProgramPollVote(pollId, optionId) {
    const program_polls = this._getFromStorage('program_polls');
    const poll_options = this._getFromStorage('poll_options');
    const programs = this._getFromStorage('programs');

    let poll = this._ensureArray(program_polls).find((p) => p.id === pollId) || null;
    if (!poll) {
      return { success: false, poll: null, options: [], message: 'Poll not found.' };
    }

    const opts = this._ensureArray(poll_options).filter((o) => o.poll_id === pollId);
    const option = opts.find((o) => o.id === optionId) || null;
    if (!option) {
      return { success: false, poll: null, options: [], message: 'Option not found.' };
    }

    const updatedOptions = opts.map((o) => ({ ...o }));
    const existingOptionId = poll.user_selected_option_id;

    if (poll.has_user_voted && existingOptionId && existingOptionId !== optionId) {
      const prev = updatedOptions.find((o) => o.id === existingOptionId);
      if (prev && typeof prev.vote_count === 'number' && prev.vote_count > 0) {
        prev.vote_count -= 1;
      }
    }

    const target = updatedOptions.find((o) => o.id === optionId);
    if (target) {
      const current = typeof target.vote_count === 'number' ? target.vote_count : 0;
      target.vote_count = current + 1;
    }

    // Update poll flags
    const updatedPoll = {
      ...poll,
      has_user_voted: true,
      user_selected_option_id: optionId
    };

    // Persist
    const allPollsUpdated = this._ensureArray(program_polls).map((p) =>
      p.id === pollId ? updatedPoll : p
    );
    const allOptionsUpdated = this._ensureArray(poll_options).map((o) => {
      const match = updatedOptions.find((uo) => uo.id === o.id);
      return match || o;
    });

    this._saveToStorage('program_polls', allPollsUpdated);
    this._saveToStorage('poll_options', allOptionsUpdated);

    const program = this._ensureArray(programs).find((p) => p.id === poll.program_id) || null;
    const pollWithProgram = { ...updatedPoll, program };
    const options = updatedOptions.map((o) => ({ ...o, poll: pollWithProgram }));

    return {
      success: true,
      poll: pollWithProgram,
      options,
      message: 'Vote submitted.'
    };
  }

  // 13. getDashboardOverview()
  getDashboardOverview() {
    const settings = this._getOrCreateAccountSettings();
    const programs = this._getFromStorage('programs');
    const savedPrograms = this._getFromStorage('saved_programs');
    const riskAlerts = this._getFromStorage('risk_alerts');

    const active_saved_programs = this._applyDashboardFilters(
      this._ensureArray(programs),
      this._ensureArray(savedPrograms),
      settings,
      this._ensureArray(riskAlerts)
    );

    // Recent risk alerts (regardless of read status), newest first
    const programsById = new Map();
    this._ensureArray(programs).forEach((p) => programsById.set(p.id, p));

    const recent_risk_alerts = this._ensureArray(riskAlerts)
      .sort((a, b) => {
        const da = this._parseDate(a.created_at);
        const db = this._parseDate(b.created_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      })
      .map((a) => ({ ...a, program: programsById.get(a.program_id) || null }));

    return {
      settings_snapshot: settings,
      active_saved_programs,
      recent_risk_alerts
    };
  }

  // 14. getAccountSettings()
  getAccountSettings() {
    return this._getOrCreateAccountSettings();
  }

  // 15. updateAccountSettings(settings)
  updateAccountSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      return {
        success: false,
        settings: this._getOrCreateAccountSettings(),
        message: 'Invalid settings payload.'
      };
    }

    let current = this._getOrCreateAccountSettings();
    let settingsArr = this._getFromStorage('account_settings');
    if (!Array.isArray(settingsArr) || settingsArr.length === 0) {
      settingsArr = [current];
    }

    const updated = { ...current };

    if (settings.default_currency && typeof settings.default_currency === 'string') {
      updated.default_currency = settings.default_currency;
    }
    if (settings.dashboard_min_daily_roi_percent != null) {
      updated.dashboard_min_daily_roi_percent = Number(
        settings.dashboard_min_daily_roi_percent
      );
    }
    if (settings.dashboard_show_closed_programs != null) {
      updated.dashboard_show_closed_programs = !!settings.dashboard_show_closed_programs;
    }
    if (Array.isArray(settings.dashboard_status_filter)) {
      updated.dashboard_status_filter = settings.dashboard_status_filter.slice();
    }
    if (settings.notifications_watchlist_risk_in_site != null) {
      updated.notifications_watchlist_risk_in_site = !!settings.notifications_watchlist_risk_in_site;
    }
    if (settings.notifications_scam_alerts_in_site != null) {
      updated.notifications_scam_alerts_in_site = !!settings.notifications_scam_alerts_in_site;
    }

    updated.updated_at = new Date().toISOString();

    settingsArr[0] = updated;
    this._saveToStorage('account_settings', settingsArr);

    return {
      success: true,
      settings: updated,
      message: 'Settings updated.'
    };
  }

  // 16. toggleScamAlertsSubscription(subscribe)
  toggleScamAlertsSubscription(subscribe) {
    const result = this.updateAccountSettings({
      notifications_scam_alerts_in_site: !!subscribe
    });
    return {
      success: result.success,
      notifications_scam_alerts_in_site: result.settings
        ? !!result.settings.notifications_scam_alerts_in_site
        : !!subscribe,
      message: result.success
        ? subscribe
          ? 'Subscribed to scam alerts.'
          : 'Unsubscribed from scam alerts.'
        : 'Unable to update scam alert subscription.'
    };
  }

  // 17. getForumIndex()
  getForumIndex() {
    const categories = this._getFromStorage('forum_categories');
    return {
      categories: this._ensureArray(categories)
    };
  }

  // 18. getForumCategoryThreads(categoryId, sort_by, page, page_size)
  getForumCategoryThreads(categoryId, sort_by = 'last_updated', page = 1, page_size = 20) {
    const forum_categories = this._getFromStorage('forum_categories');
    const forum_threads = this._getFromStorage('forum_threads');
    const profiles = this._getFromStorage('community_profiles');

    const category = this._ensureArray(forum_categories).find((c) => c.id === categoryId) || null;

    let threads = this._ensureArray(forum_threads).filter(
      (t) => t.category_id === categoryId
    );

    const sort = sort_by || 'last_updated';
    if (sort === 'newest') {
      threads.sort((a, b) => {
        const da = this._parseDate(a.created_at);
        const db = this._parseDate(b.created_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      });
    } else if (sort === 'most_replied') {
      threads.sort((a, b) => {
        const ra = a.reply_count != null ? Number(a.reply_count) : 0;
        const rb = b.reply_count != null ? Number(b.reply_count) : 0;
        return rb - ra;
      });
    } else {
      // last_updated
      threads.sort((a, b) => {
        const da = this._parseDate(a.last_post_at || a.created_at);
        const db = this._parseDate(b.last_post_at || b.created_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      });
    }

    const total_items = threads.length;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.max(1, parseInt(page_size, 10) || 20);
    const start = (p - 1) * size;
    const end = start + size;

    const profileMap = new Map();
    this._ensureArray(profiles).forEach((pr) => profileMap.set(pr.id, pr));

    const threadsPage = threads.slice(start, end).map((t) => ({
      ...t,
      category,
      author_profile: t.author_profile_id
        ? profileMap.get(t.author_profile_id) || null
        : null
    }));

    return {
      category,
      threads: threadsPage,
      pagination: {
        page: p,
        page_size: size,
        total_items,
        total_pages: Math.ceil(total_items / size) || 0
      }
    };
  }

  // 19. createForumThread(categoryId, title, prefix, body, disclaimer_included)
  createForumThread(categoryId, title, prefix, body, disclaimer_included = false) {
    const forum_categories = this._getFromStorage('forum_categories');
    const forum_threads = this._getFromStorage('forum_threads');
    const forum_posts = this._getFromStorage('forum_posts');

    const category = this._ensureArray(forum_categories).find((c) => c.id === categoryId) || null;
    if (!category) {
      return {
        success: false,
        thread: null,
        first_post: null,
        message: 'Forum category not found.'
      };
    }

    const allowedPrefixes = ['none', 'high_risk', 'new', 'announcement', 'scam_warning'];
    const pf = allowedPrefixes.includes(prefix) ? prefix : 'new';
    const now = new Date().toISOString();

    const thread = {
      id: this._generateId('thread'),
      category_id: categoryId,
      author_profile_id: null,
      author_username: 'local_user',
      title: String(title || ''),
      prefix: pf,
      created_at: now,
      updated_at: now,
      reply_count: 0,
      last_post_at: now,
      is_locked: false,
      is_subscribed: false
    };

    const bodyText = String(body || '');
    let finalBody = bodyText;
    if (disclaimer_included) {
      const disclaimer =
        '\n\n[Risk Disclaimer] HYIP investments are extremely high risk. Do not invest money you cannot afford to lose.';
      finalBody = thread.title + '\n\n' + bodyText + disclaimer;
    }

    const post = {
      id: this._generateId('post'),
      thread_id: thread.id,
      author_profile_id: null,
      author_username: 'local_user',
      body: finalBody,
      is_first_post: true,
      created_at: now,
      edited_at: null
    };

    const updatedThreads = [...this._ensureArray(forum_threads), thread];
    const updatedPosts = [...this._ensureArray(forum_posts), post];

    this._saveToStorage('forum_threads', updatedThreads);
    this._saveToStorage('forum_posts', updatedPosts);

    const threadWithRelations = { ...thread, category, author_profile: null };
    const postWithRelations = { ...post, thread: threadWithRelations, author_profile: null };

    return {
      success: true,
      thread: threadWithRelations,
      first_post: postWithRelations,
      message: 'Thread created.'
    };
  }

  // 20. getForumThreadView(threadId, page, page_size, sort_direction)
  getForumThreadView(threadId, page = 1, page_size = 20, sort_direction = 'asc') {
    const forum_threads = this._getFromStorage('forum_threads');
    const forum_posts = this._getFromStorage('forum_posts');
    const forum_categories = this._getFromStorage('forum_categories');
    const profiles = this._getFromStorage('community_profiles');

    const threadRaw = this._ensureArray(forum_threads).find((t) => t.id === threadId) || null;
    if (!threadRaw) {
      return {
        thread: null,
        posts: [],
        pagination: {
          page: 1,
          page_size: page_size,
          total_items: 0,
          total_pages: 0
        }
      };
    }

    const category = this._ensureArray(forum_categories).find(
      (c) => c.id === threadRaw.category_id
    ) || null;
    const author_profile = threadRaw.author_profile_id
      ? this._ensureArray(profiles).find((p) => p.id === threadRaw.author_profile_id) || null
      : null;

    const thread = { ...threadRaw, category, author_profile };

    let posts = this._ensureArray(forum_posts).filter((p) => p.thread_id === threadId);

    const dir = sort_direction === 'desc' ? 'desc' : 'asc';
    posts.sort((a, b) => {
      const da = this._parseDate(a.created_at);
      const db = this._parseDate(b.created_at);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      return dir === 'asc' ? ta - tb : tb - ta;
    });

    const total_items = posts.length;
    const p = Math.max(1, parseInt(page, 10) || 1);
    const size = Math.max(1, parseInt(page_size, 10) || 20);
    const start = (p - 1) * size;
    const end = start + size;

    const profileMap = new Map();
    this._ensureArray(profiles).forEach((pr) => profileMap.set(pr.id, pr));

    const pagePosts = posts.slice(start, end).map((post) => ({
      ...post,
      thread,
      author_profile: post.author_profile_id
        ? profileMap.get(post.author_profile_id) || null
        : null
    }));

    return {
      thread,
      posts: pagePosts,
      pagination: {
        page: p,
        page_size: size,
        total_items,
        total_pages: Math.ceil(total_items / size) || 0
      }
    };
  }

  // 21. replyToForumThread(threadId, body)
  replyToForumThread(threadId, body) {
    const forum_threads = this._getFromStorage('forum_threads');
    const forum_posts = this._getFromStorage('forum_posts');

    const threadsArr = this._ensureArray(forum_threads);
    const threadIndex = threadsArr.findIndex((t) => t.id === threadId);
    if (threadIndex < 0) {
      return { success: false, post: null, message: 'Thread not found.' };
    }

    const thread = threadsArr[threadIndex];
    if (thread.is_locked) {
      return { success: false, post: null, message: 'Thread is locked.' };
    }

    const now = new Date().toISOString();
    const post = {
      id: this._generateId('post'),
      thread_id: threadId,
      author_profile_id: null,
      author_username: 'local_user',
      body: String(body || ''),
      is_first_post: false,
      created_at: now,
      edited_at: null
    };

    const updatedPosts = [...this._ensureArray(forum_posts), post];

    const updatedThread = {
      ...thread,
      reply_count: (thread.reply_count != null ? Number(thread.reply_count) : 0) + 1,
      last_post_at: now,
      updated_at: now
    };

    threadsArr[threadIndex] = updatedThread;

    this._saveToStorage('forum_posts', updatedPosts);
    this._saveToStorage('forum_threads', threadsArr);

    const forum_categories = this._getFromStorage('forum_categories');
    const profiles = this._getFromStorage('community_profiles');
    const category = this._ensureArray(forum_categories).find(
      (c) => c.id === updatedThread.category_id
    ) || null;
    const author_profile = null; // local user has no CommunityProfile
    const threadWithRelations = { ...updatedThread, category, author_profile };
    const postWithRelations = { ...post, thread: threadWithRelations, author_profile };

    return {
      success: true,
      post: postWithRelations,
      message: 'Reply posted.'
    };
  }

  // 22. toggleThreadSubscription(threadId, subscribe)
  toggleThreadSubscription(threadId, subscribe) {
    const forum_threads = this._getFromStorage('forum_threads');
    const threadsArr = this._ensureArray(forum_threads);

    const idx = threadsArr.findIndex((t) => t.id === threadId);
    if (idx < 0) {
      return {
        success: false,
        is_subscribed: false,
        message: 'Thread not found.'
      };
    }

    const updatedThread = {
      ...threadsArr[idx],
      is_subscribed: !!subscribe,
      updated_at: new Date().toISOString()
    };
    threadsArr[idx] = updatedThread;
    this._saveToStorage('forum_threads', threadsArr);

    return {
      success: true,
      is_subscribed: !!subscribe,
      message: subscribe ? 'Subscribed to thread.' : 'Unsubscribed from thread.'
    };
  }

  // 23. getCommunityProfile(profileId)
  getCommunityProfile(profileId) {
    const community_profiles = this._getFromStorage('community_profiles');
    const program_comments = this._getFromStorage('program_comments');
    const forum_posts = this._getFromStorage('forum_posts');
    const programs = this._getFromStorage('programs');
    const forum_threads = this._getFromStorage('forum_threads');

    const profile = this._ensureArray(community_profiles).find((p) => p.id === profileId) || null;

    const progMap = new Map();
    this._ensureArray(programs).forEach((p) => progMap.set(p.id, p));
    const threadMap = new Map();
    this._ensureArray(forum_threads).forEach((t) => threadMap.set(t.id, t));

    const recent_program_comments_raw = this._ensureArray(program_comments)
      .filter((c) => c.author_profile_id === profileId)
      .sort((a, b) => {
        const da = this._parseDate(a.created_at);
        const db = this._parseDate(b.created_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      })
      .slice(0, 20);

    const recent_program_comments = recent_program_comments_raw.map((c) => ({
      ...c,
      program: progMap.get(c.program_id) || null,
      author_profile: profile
    }));

    const recent_forum_posts_raw = this._ensureArray(forum_posts)
      .filter((p) => p.author_profile_id === profileId)
      .sort((a, b) => {
        const da = this._parseDate(a.created_at);
        const db = this._parseDate(b.created_at);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        return tb - ta;
      })
      .slice(0, 20);

    const recent_forum_posts = recent_forum_posts_raw.map((p) => ({
      ...p,
      thread: threadMap.get(p.thread_id) || null,
      author_profile: profile
    }));

    return {
      profile,
      recent_program_comments,
      recent_forum_posts
    };
  }

  // 24. sendPrivateMessage(recipientProfileId, subject, body, relatedProgramId, relatedCommentId)
  sendPrivateMessage(
    recipientProfileId,
    subject,
    body,
    relatedProgramId,
    relatedCommentId
  ) {
    const community_profiles = this._getFromStorage('community_profiles');
    const programs = this._getFromStorage('programs');
    const program_comments = this._getFromStorage('program_comments');
    const private_messages = this._getFromStorage('private_messages');

    const profile = this._ensureArray(community_profiles).find(
      (p) => p.id === recipientProfileId
    ) || null;

    const recipient_username = profile ? profile.username : 'unknown';

    const now = new Date().toISOString();
    const messageRecord = {
      id: this._generateId('pm'),
      recipient_profile_id: recipientProfileId,
      recipient_username,
      subject: String(subject || ''),
      body: String(body || ''),
      sent_at: now,
      is_read: false,
      related_program_id: relatedProgramId || null,
      related_comment_id: relatedCommentId || null
    };

    const updatedMessages = [...this._ensureArray(private_messages), messageRecord];
    this._saveToStorage('private_messages', updatedMessages);

    const related_program = relatedProgramId
      ? this._ensureArray(programs).find((p) => p.id === relatedProgramId) || null
      : null;
    const related_comment = relatedCommentId
      ? this._ensureArray(program_comments).find((c) => c.id === relatedCommentId) || null
      : null;

    const message_record = {
      ...messageRecord,
      recipient_profile: profile,
      related_program,
      related_comment
    };

    return {
      success: true,
      message_record,
      message: 'Private message sent.'
    };
  }

  // 25. getStaticPageContent(page_slug)
  getStaticPageContent(page_slug) {
    const slug = page_slug;
    const pages = {
      about: {
        title: 'About',
        body_html: '<h1>About</h1><p>Information about this HYIP listing forum.</p>'
      },
      help_faq: {
        title: 'Help / FAQ',
        body_html: '<h1>Help / FAQ</h1><p>Frequently asked questions.</p>'
      },
      terms_of_use: {
        title: 'Terms of Use',
        body_html: '<h1>Terms of Use</h1><p>Terms and conditions for using this site.</p>'
      },
      privacy_policy: {
        title: 'Privacy Policy',
        body_html: '<h1>Privacy Policy</h1><p>Details about data handling and privacy.</p>'
      },
      contact: {
        title: 'Contact',
        body_html: '<h1>Contact</h1><p>How to reach the site administrators.</p>'
      }
    };

    const defaultPage = {
      title: 'Page',
      body_html: '<h1>Page</h1><p>Content not available.</p>'
    };

    const page = pages[slug] || defaultPage;

    return {
      page_slug: slug,
      title: page.title,
      body_html: page.body_html
    };
  }

  // 26. submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        message: 'All fields are required.'
      };
    }

    const contact_submissions = this._getFromStorage('contact_submissions');
    const now = new Date().toISOString();

    const record = {
      id: this._generateId('contact'),
      name: String(name),
      email: String(email),
      subject: String(subject),
      message: String(message),
      submitted_at: now
    };

    const updatedSubmissions = [...this._ensureArray(contact_submissions), record];
    this._saveToStorage('contact_submissions', updatedSubmissions);

    return {
      success: true,
      message: 'Your message has been submitted.'
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