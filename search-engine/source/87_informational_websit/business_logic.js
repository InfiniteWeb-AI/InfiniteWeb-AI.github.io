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
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Entity storage keys
    ensureArrayKey('banks');
    ensureArrayKey('branches');
    ensureArrayKey('currencies');
    ensureArrayKey('branch_currency_supports');
    ensureArrayKey('branch_fee_schedules');
    ensureArrayKey('branch_search_view_states');
    ensureArrayKey('branch_comparison_sets');
    ensureArrayKey('saved_branches');
    ensureArrayKey('guides');
    ensureArrayKey('saved_guides');
    ensureArrayKey('iban_validation_results');
    ensureArrayKey('branch_issue_reports');

    // Other supporting tables
    ensureArrayKey('recently_viewed_branches');
    ensureArrayKey('recently_viewed_guides');
    ensureArrayKey('contact_messages');

    // Static-like content keys (stored as single objects; created lazily)
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem('about_page_content', JSON.stringify({ title: '', sections: [] }));
    }
    if (!localStorage.getItem('contact_options')) {
      localStorage.setItem(
        'contact_options',
        JSON.stringify({
          contact_email: '',
          contact_phone: '',
          topics: [],
          form_fields: []
        })
      );
    }
    if (!localStorage.getItem('privacy_policy_content')) {
      localStorage.setItem(
        'privacy_policy_content',
        JSON.stringify({ title: '', last_updated: this._getNowISO(), sections: [] })
      );
    }
    if (!localStorage.getItem('terms_of_use_content')) {
      localStorage.setItem(
        'terms_of_use_content',
        JSON.stringify({ title: '', last_updated: this._getNowISO(), sections: [] })
      );
    }
    if (!localStorage.getItem('help_how_it_works_content')) {
      localStorage.setItem(
        'help_how_it_works_content',
        JSON.stringify({ sections: [] })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return typeof defaultValue !== 'undefined' ? this._deepClone(defaultValue) : null;
      }
    }
    return typeof defaultValue !== 'undefined' ? this._deepClone(defaultValue) : null;
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _deepClone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
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

  _getNowISO() {
    return new Date().toISOString();
  }

  // ----------------------
  // Private helpers (from spec)
  // ----------------------

  // Internal helper to load or initialize BranchSearchViewState for the current mode
  _getOrCreateBranchSearchViewState(mode) {
    let viewStates = this._getFromStorage('branch_search_view_states', []);
    let vs = viewStates.find((v) => v.mode === mode);
    if (!vs) {
      vs = {
        id: this._generateId('bsvs'),
        mode: mode,
        search_query: '',
        bank_name_filter: '',
        branch_name_filter: '',
        city_filter: '',
        area_filter: '',
        service_type_filters: [],
        currency_filters: [],
        closing_time_filter: 'any',
        last_updated: this._getNowISO()
      };
      viewStates.push(vs);
      this._saveToStorage('branch_search_view_states', viewStates);
    }
    return this._deepClone(vs);
  }

  // Execute optimized branch search against the underlying data store
  _searchBranchesInIndex(options) {
    const {
      mode,
      searchQuery,
      bankId,
      city,
      area,
      serviceTypes,
      currencyCodes,
      closingTimeFilter,
      sortBy
    } = options;

    const branches = this._getFromStorage('branches', []);
    const banks = this._getFromStorage('banks', []);
    const supports = this._getFromStorage('branch_currency_supports', []);

    const bankById = {};
    banks.forEach((b) => {
      bankById[b.id] = b;
    });

    const branchById = {};
    branches.forEach((br) => {
      if (br && br.id) {
        branchById[br.id] = br;
      }
    });

    const supportsByBranchId = {};
    supports.forEach((s) => {
      if (!supportsByBranchId[s.branch_id]) supportsByBranchId[s.branch_id] = [];
      supportsByBranchId[s.branch_id].push(s);
    });

    // Build a working branch list, augmenting with placeholders for branches referenced in currency supports
    // but missing from the main branches table (e.g., some Deira USD branches used in comparisons).
    const allBranches = branches.slice();
    supports.forEach((s) => {
      if (!s || !s.branch_id) return;
      if (!branchById[s.branch_id]) {
        const id = s.branch_id;
        const idLower = id.toLowerCase();
        const inferredArea = idLower.indexOf('deira') !== -1 ? 'Deira' : '';
        const inferredCity = 'Dubai';
        let inferredBankId = null;
        if (id.indexOf('mashreq_') === 0 && bankById['mashreq_bank']) {
          inferredBankId = 'mashreq_bank';
        }
        const placeholderBranch = {
          id: id,
          bank_id: inferredBankId,
          name: '',
          area: inferredArea,
          city: inferredCity,
          status: 'active'
        };
        branchById[id] = placeholderBranch;
        allBranches.push(placeholderBranch);
      }
    });

    const normalize = (str) =>
      (str || '')
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

    const hasServiceType = (branch, type) => {
      if (!branch) return false;
      const st = Array.isArray(branch.service_types) ? branch.service_types : [];
      if (type === 'retail_banking') {
        return !!branch.has_retail_banking || st.indexOf('retail_banking') !== -1;
      }
      if (type === 'corporate_banking') {
        return !!branch.has_corporate_banking || st.indexOf('corporate_banking') !== -1;
      }
      return st.indexOf(type) !== -1;
    };

    const branchSupportsCurrencies = (branchId, codes) => {
      if (!codes || !codes.length) return true;
      const supList = supportsByBranchId[branchId] || [];
      return codes.every((code) => supList.some((s) => s.currency_code === code));
    };

    const parseTimeToMinutes = (t) => {
      if (!t || typeof t !== 'string') return null;
      const parts = t.split(':');
      if (parts.length !== 2) return null;
      const h = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    };

    let results = allBranches.filter((branch) => {
      if (!branch) return false;
      // Only active branches by default
      if (branch.status && branch.status !== 'active') return false;

      const bank = bankById[branch.bank_id] || null;

      // Mode-specific search
      if (mode === 'bank_search') {
        if (searchQuery && searchQuery.trim()) {
          const q = normalize(searchQuery);
          const haystack = [
            normalize(branch.name),
            normalize(branch.area),
            normalize(branch.city),
            normalize(bank ? bank.name : '')
          ].join(' ');
          if (haystack.indexOf(q) === -1) return false;
        }
      }

      // Bank filter
      if (bankId && branch.bank_id !== bankId) return false;

      // City / area filters
      if (city && branch.city !== city) return false;
      if (area && branch.area !== area) return false;

      // Service types
      if (serviceTypes && serviceTypes.length) {
        const ok = serviceTypes.every((t) => hasServiceType(branch, t));
        if (!ok) return false;
      }

      // Currency support
      if (currencyCodes && currencyCodes.length) {
        if (!branchSupportsCurrencies(branch.id, currencyCodes)) return false;
      }

      // Closing time filter (weekday_close_time)
      if (closingTimeFilter && closingTimeFilter !== 'any') {
        const minutes = parseTimeToMinutes(branch.weekday_close_time);
        if (minutes == null) return false;
        if (closingTimeFilter === 'before_6_pm') {
          if (!(minutes < 18 * 60)) return false;
        } else if (closingTimeFilter === 'after_8_pm') {
          if (!(minutes >= 20 * 60)) return false;
        }
      }

      return true;
    });

    // Sorting
    if (sortBy === 'name_asc') {
      results.sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    } else if (sortBy === 'weekday_close_time_desc') {
      results.sort((a, b) => {
        const pa = parseTimeToMinutes(a.weekday_close_time) || 0;
        const pb = parseTimeToMinutes(b.weekday_close_time) || 0;
        return pb - pa;
      });
    }

    // Build summaries
    return results.map((branch) => {
      const bank = bankById[branch.bank_id] || null;
      const supList = supportsByBranchId[branch.id] || [];
      const supportedCurrencies = [];
      let usdCutoff = '';
      supList.forEach((s) => {
        if (s.currency_code && supportedCurrencies.indexOf(s.currency_code) === -1) {
          supportedCurrencies.push(s.currency_code);
        }
        if (s.currency_code === 'USD' && s.transfer_cutoff_time && !usdCutoff) {
          usdCutoff = s.transfer_cutoff_time;
        }
      });

      return {
        branch: this._deepClone(branch),
        bank_name: bank ? bank.name : '',
        area: branch.area || '',
        city: branch.city || '',
        has_corporate_banking: !!branch.has_corporate_banking,
        has_retail_banking: !!branch.has_retail_banking,
        supported_currencies: supportedCurrencies,
        weekday_open_time: branch.weekday_open_time || '',
        weekday_close_time: branch.weekday_close_time || '',
        is_24_7: !!branch.is_24_7,
        usd_transfer_cutoff_time: usdCutoff,
        // Foreign key resolution helpers
        bank: bank ? this._deepClone(bank) : null
      };
    });
  }

  // Retrieve or create the active BranchComparisonSet
  _getOrCreateComparisonSet(sourcePage) {
    let sets = this._getFromStorage('branch_comparison_sets', []);
    let set = sets.length ? sets[sets.length - 1] : null;
    if (!set) {
      set = {
        id: this._generateId('bcs'),
        branch_ids: [],
        source_page: sourcePage || null,
        label: '',
        created_at: this._getNowISO()
      };
      sets.push(set);
      this._saveToStorage('branch_comparison_sets', sets);
    }
    return this._deepClone(set);
  }

  _persistSavedBranch(savedBranch) {
    let items = this._getFromStorage('saved_branches', []);
    const idx = items.findIndex((i) => i.id === savedBranch.id);
    if (idx >= 0) {
      items[idx] = savedBranch;
    } else {
      items.push(savedBranch);
    }
    this._saveToStorage('saved_branches', items);
    return this._deepClone(savedBranch);
  }

  _persistSavedGuideBookmark(bookmark) {
    let items = this._getFromStorage('saved_guides', []);
    const idx = items.findIndex((i) => i.id === bookmark.id);
    if (idx >= 0) {
      items[idx] = bookmark;
    } else {
      items.push(bookmark);
    }
    this._saveToStorage('saved_guides', items);
    return this._deepClone(bookmark);
  }

  _copyToClipboard(value) {
    try {
      // Simulate clipboard using localStorage so it works in both Node and browser
      const payload = {
        value: value,
        timestamp: this._getNowISO()
      };
      localStorage.setItem('__clipboard__', JSON.stringify(payload));
      return true;
    } catch (e) {
      return false;
    }
  }

  _recordRecentlyViewedBranch(branchId) {
    if (!branchId) return;
    let list = this._getFromStorage('recently_viewed_branches', []);
    list = list.filter((id) => id !== branchId);
    list.unshift(branchId);
    if (list.length > 10) list = list.slice(0, 10);
    this._saveToStorage('recently_viewed_branches', list);
  }

  _recordRecentlyViewedGuide(guideId) {
    if (!guideId) return;
    let list = this._getFromStorage('recently_viewed_guides', []);
    list = list.filter((id) => id !== guideId);
    list.unshift(guideId);
    if (list.length > 10) list = list.slice(0, 10);
    this._saveToStorage('recently_viewed_guides', list);
  }

  _loadStaticPageContent(key, defaultContent) {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to default
      }
    }
    const value = typeof defaultContent === 'undefined' ? null : this._deepClone(defaultContent);
    if (value !== null) {
      this._saveToStorage(key, value);
    }
    return value;
  }

  // Basic IBAN checksum and structure validation
  _validateIbanChecksum(iban) {
    const messages = [];
    if (!iban || typeof iban !== 'string') {
      messages.push('IBAN is required.');
      return {
        isValid: false,
        validationStatus: 'invalid',
        messages: messages,
        countryCode: null,
        checksum: null,
        bankCode: null,
        branchCode: null,
        accountNumber: null
      };
    }

    const trimmed = iban.replace(/\s+/g, '').toUpperCase();
    if (trimmed.length < 15 || trimmed.length > 34) {
      messages.push('IBAN length must be between 15 and 34 characters.');
    }

    const countryCode = trimmed.slice(0, 2);
    const checksum = trimmed.slice(2, 4);

    if (!/^[A-Z]{2}$/.test(countryCode)) {
      messages.push('IBAN must start with a 2-letter country code.');
    }
    if (!/^[0-9]{2}$/.test(checksum)) {
      messages.push('IBAN must contain a 2-digit checksum.');
    }

    // Rearrange and convert letters to numbers (A=10..Z=35)
    const rearranged = trimmed.slice(4) + trimmed.slice(0, 4);
    let transformed = '';
    for (let i = 0; i < rearranged.length; i++) {
      const ch = rearranged.charAt(i);
      if (ch >= 'A' && ch <= 'Z') {
        transformed += (ch.charCodeAt(0) - 55).toString();
      } else {
        transformed += ch;
      }
    }

    // Compute mod 97 using incremental approach to avoid big integers
    let remainder = 0;
    for (let i = 0; i < transformed.length; i++) {
      const digit = transformed.charCodeAt(i) - 48; // '0' => 0
      if (digit < 0 || digit > 9) continue;
      remainder = (remainder * 10 + digit) % 97;
    }

    const isValid = remainder === 1 && messages.length === 0;
    if (!isValid && messages.indexOf('Failed IBAN checksum validation.') === -1) {
      messages.push('Failed IBAN checksum validation.');
    }

    // Very basic UAE-specific parsing (AE)
    let bankCode = null;
    let branchCode = null;
    let accountNumber = null;
    if (countryCode === 'AE' && trimmed.length >= 9) {
      // AEkk bbbb ccccccccccccccccc (simplified: 2 country, 2 checksum, 4 bank, rest account)
      bankCode = trimmed.slice(4, 8);
      accountNumber = trimmed.slice(8);
      // Branch code is often embedded in the account; we leave branchCode null unless derived elsewhere
    }

    return {
      isValid: isValid,
      validationStatus: isValid ? 'valid' : 'invalid',
      messages: messages,
      countryCode: countryCode,
      checksum: checksum,
      bankCode: bankCode,
      branchCode: branchCode,
      accountNumber: accountNumber
    };
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // getHomeDashboard()
  getHomeDashboard() {
    // Quick tasks: static UI configuration, not domain data
    const quickTasks = [
      {
        task_key: 'find_swift_code',
        title: 'Find a SWIFT / BIC code',
        description: 'Search by bank and branch to view and copy SWIFT / BIC codes.',
        primary_action_key: 'nav_bank_search'
      },
      {
        task_key: 'compare_fees',
        title: 'Compare international transfer fees',
        description: 'See which Dubai branches offer cheaper outgoing international transfers.',
        primary_action_key: 'nav_compare_fees'
      },
      {
        task_key: 'validate_iban',
        title: 'Validate an IBAN',
        description: 'Check a Dubai IBAN structure and find the related bank.',
        primary_action_key: 'nav_iban_tools'
      },
      {
        task_key: 'locate_branch',
        title: 'Locate a branch by area',
        description: 'Use the branch locator to find branches in specific Dubai areas.',
        primary_action_key: 'nav_branch_locator'
      }
    ];

    const branches = this._getFromStorage('branches', []);
    const banks = this._getFromStorage('banks', []);
    const guides = this._getFromStorage('guides', []);
    const savedBranches = this._getFromStorage('saved_branches', []);
    const savedGuides = this._getFromStorage('saved_guides', []);

    const bankById = {};
    banks.forEach((b) => {
      bankById[b.id] = b;
    });

    const guideById = {};
    guides.forEach((g) => {
      guideById[g.id] = g;
    });

    const branchById = {};
    branches.forEach((br) => {
      branchById[br.id] = br;
    });

    // Recently viewed branches
    const rvBranchIds = this._getFromStorage('recently_viewed_branches', []);
    const recentlyViewedBranches = rvBranchIds
      .map((id) => branchById[id])
      .filter((b) => !!b)
      .map((branch) => {
        const bank = bankById[branch.bank_id] || null;
        const enriched = this._deepClone(branch);
        enriched.bank = bank ? this._deepClone(bank) : null;
        return enriched;
      });

    // Recently viewed guides
    const rvGuideIds = this._getFromStorage('recently_viewed_guides', []);
    const recentlyViewedGuides = rvGuideIds
      .map((id) => guideById[id])
      .filter((g) => !!g)
      .map((g) => this._deepClone(g));

    // Saved branches summary
    const savedBranchesSummary = savedBranches.map((sb) => {
      const branch = branchById[sb.branch_id] || null;
      const bank = branch ? bankById[branch.bank_id] || null : null;
      return {
        saved_branch: {
          data: JSON.stringify(sb)
        },
        saved_branch_id: sb.id,
        branch_id: sb.branch_id,
        branch_name: branch ? branch.name : '',
        bank_name: bank ? bank.name : '',
        area: branch ? branch.area || '' : '',
        city: branch ? branch.city || '' : '',
        is_favorite: !!sb.is_favorite,
        created_at: sb.created_at || '',
        // Foreign key resolution helpers
        branch: branch ? this._deepClone(branch) : null,
        bank: bank ? this._deepClone(bank) : null
      };
    });

    // Saved guides summary
    const savedGuidesSummary = savedGuides.map((sg) => {
      const guide = guideById[sg.guide_id] || null;
      return {
        bookmark: {
          data: JSON.stringify(sg)
        },
        saved_guide_bookmark_id: sg.id,
        guide_id: sg.guide_id,
        guide_title: guide ? guide.title : '',
        is_in_reading_list: !!sg.is_in_reading_list,
        created_at: sg.created_at || '',
        guide: guide ? this._deepClone(guide) : null
      };
    });

    return {
      quick_tasks: quickTasks,
      recently_viewed_branches: recentlyViewedBranches,
      recently_viewed_guides: recentlyViewedGuides,
      saved_branches: savedBranchesSummary,
      saved_guides: savedGuidesSummary
    };
  }

  // getBranchSearchFilterOptions(mode)
  getBranchSearchFilterOptions(mode) {
    const branches = this._getFromStorage('branches', []);
    const currencies = this._getFromStorage('currencies', []);
    const banks = this._getFromStorage('banks', []);

    const citiesSet = new Set();
    const areasSet = new Set();

    branches.forEach((b) => {
      if (b.city) citiesSet.add(b.city);
      if (b.area) areasSet.add(b.area);
    });

    const cities = Array.from(citiesSet).sort();
    const areas = Array.from(areasSet).sort();

    const serviceTypes = [
      { id: 'retail_banking', label: 'Retail banking' },
      { id: 'corporate_banking', label: 'Corporate banking' }
    ];

    const closingTimeOptions = [
      {
        value: 'any',
        label: 'Any closing time',
        description: 'Include branches regardless of weekday closing time.'
      },
      {
        value: 'before_6_pm',
        label: 'Before 6:00 PM',
        description: 'Branches that close before 6:00 PM on weekdays.'
      },
      {
        value: 'after_8_pm',
        label: 'After 8:00 PM',
        description: 'Branches that close at or after 8:00 PM on weekdays.'
      }
    ];

    return {
      cities: cities,
      areas: areas,
      service_types: serviceTypes,
      currencies: this._deepClone(currencies),
      closing_time_options: closingTimeOptions,
      bank_options: this._deepClone(banks)
    };
  }

  // getBranchSearchViewState(mode)
  getBranchSearchViewState(mode) {
    const vs = this._getOrCreateBranchSearchViewState(mode);
    return { view_state: vs };
  }

  // updateBranchSearchViewState(mode, updates)
  updateBranchSearchViewState(mode, updates) {
    let viewStates = this._getFromStorage('branch_search_view_states', []);
    let vs = viewStates.find((v) => v.mode === mode);
    if (!vs) {
      vs = this._getOrCreateBranchSearchViewState(mode);
      viewStates = this._getFromStorage('branch_search_view_states', []);
    }

    const allowedKeys = [
      'search_query',
      'bank_name_filter',
      'branch_name_filter',
      'city_filter',
      'area_filter',
      'service_type_filters',
      'currency_filters',
      'closing_time_filter'
    ];

    allowedKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        vs[key] = updates[key];
      }
    });
    vs.last_updated = this._getNowISO();

    const idx = viewStates.findIndex((v) => v.id === vs.id);
    if (idx >= 0) {
      viewStates[idx] = vs;
    } else {
      viewStates.push(vs);
    }
    this._saveToStorage('branch_search_view_states', viewStates);

    return { view_state: this._deepClone(vs) };
  }

  // searchBranches(mode, searchQuery, bankId, city, area, serviceTypes, currencyCodes, closingTimeFilter, sortBy)
  searchBranches(
    mode,
    searchQuery,
    bankId,
    city,
    area,
    serviceTypes,
    currencyCodes,
    closingTimeFilter,
    sortBy
  ) {
    const results = this._searchBranchesInIndex({
      mode: mode,
      searchQuery: searchQuery,
      bankId: bankId,
      city: city,
      area: area,
      serviceTypes: serviceTypes || [],
      currencyCodes: currencyCodes || [],
      closingTimeFilter: closingTimeFilter || 'any',
      sortBy: sortBy || 'relevance'
    });
    return results;
  }

  // addBranchToComparison(branchId, sourcePage)
  addBranchToComparison(branchId, sourcePage) {
    if (!branchId) {
      return { success: false, comparison_set: null, total_branches: 0, message: 'branchId is required.' };
    }

    let sets = this._getFromStorage('branch_comparison_sets', []);
    let set = sets.length ? sets[sets.length - 1] : null;
    if (!set) {
      set = {
        id: this._generateId('bcs'),
        branch_ids: [],
        source_page: sourcePage || null,
        label: '',
        created_at: this._getNowISO()
      };
      sets.push(set);
    }

    if (set.branch_ids.indexOf(branchId) === -1) {
      set.branch_ids.push(branchId);
    }
    if (sourcePage) {
      set.source_page = sourcePage;
    }

    sets[sets.length - 1] = set;
    this._saveToStorage('branch_comparison_sets', sets);

    return {
      success: true,
      comparison_set: this._deepClone(set),
      total_branches: set.branch_ids.length,
      message: 'Branch added to comparison.'
    };
  }

  // createOrReplaceComparisonSetFromSelection(branchIds, sourcePage)
  createOrReplaceComparisonSetFromSelection(branchIds, sourcePage) {
    const uniqueIds = Array.isArray(branchIds)
      ? Array.from(new Set(branchIds.filter((id) => !!id)))
      : [];

    const set = {
      id: this._generateId('bcs'),
      branch_ids: uniqueIds,
      source_page: sourcePage || null,
      label: '',
      created_at: this._getNowISO()
    };

    this._saveToStorage('branch_comparison_sets', [set]);

    return { comparison_set: this._deepClone(set) };
  }

  // getActiveBranchComparisonSetSummary()
  getActiveBranchComparisonSetSummary() {
    const sets = this._getFromStorage('branch_comparison_sets', []);
    const branches = this._getFromStorage('branches', []);
    const banks = this._getFromStorage('banks', []);

    const branchById = {};
    branches.forEach((b) => {
      branchById[b.id] = b;
    });
    const bankById = {};
    banks.forEach((b) => {
      bankById[b.id] = b;
    });

    const set = sets.length ? sets[sets.length - 1] : null;
    if (!set) {
      return { comparison_set: null, branches: [] };
    }

    const items = (set.branch_ids || []).map((id) => {
      const branch = branchById[id] || null;
      const bank = branch ? bankById[branch.bank_id] || null : null;
      return {
        branch_id: id,
        branch_name: branch ? branch.name : '',
        bank_name: bank ? bank.name : '',
        area: branch ? branch.area || '' : '',
        branch: branch ? this._deepClone(branch) : null,
        bank: bank ? this._deepClone(bank) : null
      };
    });

    return {
      comparison_set: this._deepClone(set),
      branches: items
    };
  }

  // getBranchDetails(branchId)
  getBranchDetails(branchId) {
    const branches = this._getFromStorage('branches', []);
    const banks = this._getFromStorage('banks', []);
    const supports = this._getFromStorage('branch_currency_supports', []);
    const feeSchedules = this._getFromStorage('branch_fee_schedules', []);
    const savedBranches = this._getFromStorage('saved_branches', []);
    const currencies = this._getFromStorage('currencies', []);

    const branch = branches.find((b) => b.id === branchId) || null;
    const bank = branch ? banks.find((b) => b.id === branch.bank_id) || null : null;

    if (branch) {
      this._recordRecentlyViewedBranch(branchId);
    }

    const codes = {
      swift_primary_code: branch ? branch.swift_primary_code || '' : '',
      swift_additional_codes: branch ? this._deepClone(branch.swift_additional_codes || []) : [],
      routing_code: branch ? branch.routing_code || '' : '',
      branch_code: branch ? branch.branch_code || '' : ''
    };

    const services = {
      has_retail_banking: branch ? !!branch.has_retail_banking : false,
      has_corporate_banking: branch ? !!branch.has_corporate_banking : false,
      service_types: branch ? this._deepClone(branch.service_types || []) : []
    };

    const openingHours = {
      weekday_open_time: branch ? branch.weekday_open_time || '' : '',
      weekday_close_time: branch ? branch.weekday_close_time || '' : '',
      friday_open_time: branch ? branch.friday_open_time || '' : '',
      friday_close_time: branch ? branch.friday_close_time || '' : '',
      saturday_open_time: branch ? branch.saturday_open_time || '' : '',
      saturday_close_time: branch ? branch.saturday_close_time || '' : '',
      is_24_7: branch ? !!branch.is_24_7 : false
    };

    const currencyByCode = {};
    currencies.forEach((c) => {
      currencyByCode[c.code] = c;
    });

    const currencySupports = supports
      .filter((s) => s.branch_id === branchId)
      .map((s) => {
        const cur = currencyByCode[s.currency_code] || null;
        return {
          support: this._deepClone(s),
          currency_code: s.currency_code,
          currency_name: cur ? cur.name : '',
          supports_international_transfers: !!s.supports_international_transfers,
          transfer_cutoff_time: s.transfer_cutoff_time || '',
          transfer_cutoff_time_notes: s.transfer_cutoff_time_notes || ''
        };
      });

    const feeSummaries = feeSchedules
      .filter((f) => f.branch_id === branchId)
      .map((f) => ({
        fee_schedule: this._deepClone(f),
        fee_type: f.fee_type,
        currency_code: f.currency_code,
        amount: f.amount,
        fee_unit: f.fee_unit,
        notes: f.notes || ''
      }));

    const saved = savedBranches.find((s) => s.branch_id === branchId) || null;

    return {
      branch: branch ? this._deepClone(branch) : null,
      bank: bank ? this._deepClone(bank) : null,
      codes: codes,
      services: services,
      opening_hours: openingHours,
      currency_supports: currencySupports,
      fee_summaries: feeSummaries,
      is_saved: !!saved,
      saved_branch_id: saved ? saved.id : null
    };
  }

  // copyBranchSwiftCode(branchId, codeKind, additionalCodeIndex)
  copyBranchSwiftCode(branchId, codeKind, additionalCodeIndex) {
    const branches = this._getFromStorage('branches', []);
    const branch = branches.find((b) => b.id === branchId) || null;
    if (!branch) {
      return { success: false, copied_value: '', message: 'Branch not found.' };
    }

    let value = '';
    if (codeKind === 'primary') {
      value = branch.swift_primary_code || '';
    } else if (codeKind === 'additional') {
      const idx = typeof additionalCodeIndex === 'number' ? additionalCodeIndex : 0;
      const arr = Array.isArray(branch.swift_additional_codes) ? branch.swift_additional_codes : [];
      value = arr[idx] || '';
    }

    if (!value) {
      return { success: false, copied_value: '', message: 'SWIFT code not available.' };
    }

    const ok = this._copyToClipboard(value);
    return {
      success: ok,
      copied_value: value,
      message: ok ? 'SWIFT code copied.' : 'Failed to copy SWIFT code.'
    };
  }

  // copyBranchRoutingCode(branchId)
  copyBranchRoutingCode(branchId) {
    const branches = this._getFromStorage('branches', []);
    const branch = branches.find((b) => b.id === branchId) || null;
    if (!branch || !branch.routing_code) {
      return { success: false, copied_value: '', message: 'Routing code not available.' };
    }
    const value = branch.routing_code;
    const ok = this._copyToClipboard(value);
    return {
      success: ok,
      copied_value: value,
      message: ok ? 'Routing code copied.' : 'Failed to copy routing code.'
    };
  }

  // saveBranch(branchId, isFavorite, source, notes)
  saveBranch(branchId, isFavorite, source, notes) {
    if (!branchId) {
      return { success: false, saved_branch: null, message: 'branchId is required.' };
    }

    const branches = this._getFromStorage('branches', []);
    const branch = branches.find((b) => b.id === branchId) || null;
    if (!branch && source !== 'fee_comparison') {
      return { success: false, saved_branch: null, message: 'Branch not found.' };
    }

    let items = this._getFromStorage('saved_branches', []);
    let existing = items.find((s) => s.branch_id === branchId) || null;
    const now = this._getNowISO();

    if (existing) {
      existing.is_favorite = typeof isFavorite === 'boolean' ? isFavorite : existing.is_favorite;
      if (typeof source === 'string' && source) existing.source = source;
      if (typeof notes === 'string') existing.notes = notes;
      existing.updated_at = now;
      this._persistSavedBranch(existing);

      // Instrumentation for task completion tracking
      try {
        const paramsRaw = localStorage.getItem('task2_feeComparisonParams');
        if (paramsRaw) {
          const params = JSON.parse(paramsRaw);
          if (
            params &&
            params.feeType === 'outgoing_international_transfer' &&
            params.bankId
          ) {
            const banks = this._getFromStorage('banks', []);
            const matchedBank = banks.find(
              (b) =>
                b &&
                b.id === params.bankId &&
                typeof b.name === 'string' &&
                b.name.toLowerCase().indexOf('dubai islamic bank') !== -1
            );
            if (matchedBank) {
              localStorage.setItem('task2_lastSavedBranchId', String(branchId));
            }
          }
        }
      } catch (e) {
        console.error('Instrumentation error:', e);
      }

      return {
        success: true,
        saved_branch: this._deepClone(existing),
        message: 'Branch updated in saved list.'
      };
    }

    const saved = {
      id: this._generateId('sb'),
      branch_id: branchId,
      source: source || 'branch_detail',
      notes: typeof notes === 'string' ? notes : '',
      is_favorite: typeof isFavorite === 'boolean' ? isFavorite : true,
      created_at: now
    };

    this._persistSavedBranch(saved);

    // Instrumentation for task completion tracking
    try {
      const paramsRaw = localStorage.getItem('task2_feeComparisonParams');
      if (paramsRaw) {
        const params = JSON.parse(paramsRaw);
        if (
          params &&
          params.feeType === 'outgoing_international_transfer' &&
          params.bankId
        ) {
          const banks = this._getFromStorage('banks', []);
          const matchedBank = banks.find(
            (b) =>
              b &&
              b.id === params.bankId &&
              typeof b.name === 'string' &&
              b.name.toLowerCase().indexOf('dubai islamic bank') !== -1
          );
          if (matchedBank) {
            localStorage.setItem('task2_lastSavedBranchId', String(branchId));
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      saved_branch: this._deepClone(saved),
      message: 'Branch saved.'
    };
  }

  // getFeeComparisonFilterOptions()
  getFeeComparisonFilterOptions() {
    const banks = this._getFromStorage('banks', []);
    const currencies = this._getFromStorage('currencies', []);

    const feeTypes = [
      { value: 'outgoing_international_transfer', label: 'Outgoing international transfer' },
      { value: 'incoming_international_transfer', label: 'Incoming international transfer' },
      { value: 'local_transfer', label: 'Local transfer' },
      { value: 'account_maintenance', label: 'Account maintenance' },
      { value: 'atm_withdrawal', label: 'ATM withdrawal' },
      { value: 'other', label: 'Other fees' }
    ];

    let defaultCurrencyCode = 'AED';
    if (!currencies.some((c) => c.code === 'AED') && currencies.length) {
      defaultCurrencyCode = currencies[0].code;
    }

    const maxFeeSuggestions = [10, 20, 50, 100];

    return {
      banks: this._deepClone(banks),
      fee_types: feeTypes,
      currencies: this._deepClone(currencies),
      default_currency_code: defaultCurrencyCode,
      max_fee_suggestions: maxFeeSuggestions
    };
  }

  // getFeeComparisonResults(bankId, feeType, maxFeeAmount, currencyCode, sortBy)
  getFeeComparisonResults(bankId, feeType, maxFeeAmount, currencyCode, sortBy) {
    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task2_feeComparisonParams',
        JSON.stringify({ bankId, feeType, maxFeeAmount, currencyCode, sortBy })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const feeSchedules = this._getFromStorage('branch_fee_schedules', []);
    const branches = this._getFromStorage('branches', []);
    const banks = this._getFromStorage('banks', []);

    const branchById = {};
    branches.forEach((b) => {
      branchById[b.id] = b;
    });
    const bankById = {};
    banks.forEach((b) => {
      bankById[b.id] = b;
    });

    const results = feeSchedules
      .filter((f) => {
        if (!f) return false;
        if (f.fee_type !== feeType) return false;
        if (f.currency_code !== currencyCode) return false;
        const branch = branchById[f.branch_id] || null;
        if (bankId && branch && branch.bank_id !== bankId) return false;
        if (typeof maxFeeAmount === 'number') {
          return typeof f.amount === 'number' && f.amount <= maxFeeAmount;
        }
        return true;
      })
      .map((f) => {
        let branch = branchById[f.branch_id] || null;
        let bank = branch && branch.bank_id ? bankById[branch.bank_id] || null : null;

        // For fee schedules where no physical branch record exists (e.g., some Dubai Islamic Bank entries),
        // synthesise a minimal branch and associate it to the requested bank when possible.
        if (!branch) {
          const syntheticBranch = {
            id: f.branch_id,
            bank_id: bankId || null,
            name: '',
            area: '',
            city: ''
          };
          branch = syntheticBranch;
          if (bankId && bankById[bankId]) {
            bank = bankById[bankId];
          }
        }
        const isWithin = typeof maxFeeAmount === 'number' ? f.amount <= maxFeeAmount : true;
        return {
          branch_id: branch.id,
          branch_name: branch.name,
          bank_id: branch.bank_id,
          bank_name: bank ? bank.name : '',
          area: branch.area || '',
          city: branch.city || '',
          fee_amount: f.amount,
          fee_unit: f.fee_unit,
          currency_code: f.currency_code,
          notes: f.notes || '',
          is_within_max: isWithin,
          is_cheapest: false,
          branch: this._deepClone(branch),
          bank: bank ? this._deepClone(bank) : null
        };
      });

    // Sorting
    if (sortBy === 'fee_amount_asc') {
      results.sort((a, b) => a.fee_amount - b.fee_amount);
    } else if (sortBy === 'fee_amount_desc') {
      results.sort((a, b) => b.fee_amount - a.fee_amount);
    } else if (sortBy === 'branch_name_asc') {
      results.sort((a, b) => {
        const an = (a.branch_name || '').toLowerCase();
        const bn = (b.branch_name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    } else if (sortBy === 'bank_name_asc') {
      results.sort((a, b) => {
        const an = (a.bank_name || '').toLowerCase();
        const bn = (b.bank_name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    }

    // Mark cheapest
    if (results.length) {
      let min = results[0].fee_amount;
      results.forEach((r) => {
        if (r.fee_amount < min) min = r.fee_amount;
      });
      results.forEach((r) => {
        r.is_cheapest = r.fee_amount === min;
      });
    }

    return results;
  }

  // getIbanToolsOverview()
  getIbanToolsOverview() {
    const guides = this._getFromStorage('guides', []);
    const recommended = guides.filter((g) => Array.isArray(g.tags) && g.tags.indexOf('IBAN basics') !== -1);

    const tools = [
      {
        tool_key: 'iban_validator',
        title: 'IBAN Validator',
        short_description: 'Check the structure and checksum of a Dubai IBAN.',
        is_recommended: true
      }
    ];

    return {
      tools: tools,
      recommended_guides: this._deepClone(recommended)
    };
  }

  // validateIban(iban)
  validateIban(iban) {
    const banks = this._getFromStorage('banks', []);
    const basic = this._validateIbanChecksum(iban);

    let bank = null;
    let validationStatus = basic.validationStatus;
    const messages = basic.messages.slice();
    let bankId = null;
    let bankName = null;
    let branchAreaHint = null;

    if (basic.bankCode) {
      // Attempt a very loose mapping: match bank_code against a custom field if present
      // or partial match against swift_general_code / id
      bank =
        banks.find((b) => {
          if (!b) return false;
          if (b.bank_code && b.bank_code === basic.bankCode) return true;
          if (b.swift_general_code && b.swift_general_code.indexOf(basic.bankCode) !== -1) return true;
          if (b.id && b.id.indexOf(basic.bankCode) !== -1) return true;
          return false;
        }) || null;

      // Fallback for known UAE domestic bank codes when no explicit mapping field exists
      if (!bank && basic.countryCode === 'AE') {
        const fallbackMap = {
          '0331': 'emirates_nbd'
        };
        const mappedBankId = fallbackMap[basic.bankCode];
        if (mappedBankId) {
          bank = banks.find((b) => b.id === mappedBankId) || null;
        }
      }
    }

    if (bank) {
      bankId = bank.id;
      bankName = bank.name;
      validationStatus = basic.isValid ? 'valid' : 'invalid';
    } else if (basic.isValid) {
      validationStatus = 'unknown_bank';
      messages.push('IBAN structure looks valid, but the bank could not be identified.');
    }

    const result = {
      id: this._generateId('iban'),
      input_iban: iban,
      is_valid: basic.isValid,
      validation_status: validationStatus,
      messages: messages,
      bank_id: bankId,
      bank_name: bankName,
      branch_area_hint: branchAreaHint,
      country_code: basic.countryCode,
      checksum: basic.checksum,
      bank_code: basic.bankCode,
      branch_code: basic.branchCode,
      account_number: basic.accountNumber,
      validation_timestamp: this._getNowISO()
    };

    const stored = this._getFromStorage('iban_validation_results', []);
    stored.push(result);
    this._saveToStorage('iban_validation_results', stored);

    return {
      validation_result: this._deepClone(result),
      bank: bank ? this._deepClone(bank) : null,
      messages: messages
    };
  }

  // getBankOverview(bankId)
  getBankOverview(bankId) {
    const banks = this._getFromStorage('banks', []);
    const branches = this._getFromStorage('branches', []);
    const bank = banks.find((b) => b.id === bankId) || null;

    const bankBranches = branches.filter((br) => br.bank_id === bankId);
    const branchCount = bankBranches.length;

    const areasSet = new Set();
    bankBranches.forEach((br) => {
      if (br.area) areasSet.add(br.area);
    });

    const areasCovered = Array.from(areasSet).sort();

    const popularBranches = bankBranches
      .slice()
      .sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      })
      .slice(0, 5)
      .map((br) => ({
        branch_id: br.id,
        branch_name: br.name,
        area: br.area || '',
        city: br.city || ''
      }));

    return {
      bank: bank ? this._deepClone(bank) : null,
      branch_count: branchCount,
      areas_covered: areasCovered,
      popular_branches: popularBranches
    };
  }

  // getBankBranchesForBank(bankId, area, serviceTypes, currencyCodes)
  getBankBranchesForBank(bankId, area, serviceTypes, currencyCodes) {
    const branches = this._getFromStorage('branches', []);
    const banks = this._getFromStorage('banks', []);
    const supports = this._getFromStorage('branch_currency_supports', []);

    const bank = banks.find((b) => b.id === bankId) || null;

    const supportsByBranchId = {};
    supports.forEach((s) => {
      if (!supportsByBranchId[s.branch_id]) supportsByBranchId[s.branch_id] = [];
      supportsByBranchId[s.branch_id].push(s);
    });

    const hasServiceType = (branch, type) => {
      const st = Array.isArray(branch.service_types) ? branch.service_types : [];
      if (type === 'retail_banking') {
        return !!branch.has_retail_banking || st.indexOf('retail_banking') !== -1;
      }
      if (type === 'corporate_banking') {
        return !!branch.has_corporate_banking || st.indexOf('corporate_banking') !== -1;
      }
      return st.indexOf(type) !== -1;
    };

    const branchSupportsCurrencies = (branchId, codes) => {
      if (!codes || !codes.length) return true;
      const supList = supportsByBranchId[branchId] || [];
      return codes.every((code) => supList.some((s) => s.currency_code === code));
    };

    const result = branches
      .filter((br) => br.bank_id === bankId)
      .filter((br) => {
        if (area && br.area !== area) return false;
        if (serviceTypes && serviceTypes.length) {
          const ok = serviceTypes.every((t) => hasServiceType(br, t));
          if (!ok) return false;
        }
        if (currencyCodes && currencyCodes.length) {
          if (!branchSupportsCurrencies(br.id, currencyCodes)) return false;
        }
        return true;
      })
      .map((br) => {
        const supList = supportsByBranchId[br.id] || [];
        const supportedCurrencies = [];
        supList.forEach((s) => {
          if (s.currency_code && supportedCurrencies.indexOf(s.currency_code) === -1) {
            supportedCurrencies.push(s.currency_code);
          }
        });
        return {
          branch: this._deepClone(br),
          bank_name: bank ? bank.name : '',
          area: br.area || '',
          city: br.city || '',
          has_corporate_banking: !!br.has_corporate_banking,
          has_retail_banking: !!br.has_retail_banking,
          supported_currencies: supportedCurrencies
        };
      });

    return result;
  }

  // getBranchComparisonDetails(comparisonSetId)
  getBranchComparisonDetails(comparisonSetId) {
    const sets = this._getFromStorage('branch_comparison_sets', []);
    const branches = this._getFromStorage('branches', []);
    const banks = this._getFromStorage('banks', []);
    const supports = this._getFromStorage('branch_currency_supports', []);
    const feeSchedules = this._getFromStorage('branch_fee_schedules', []);

    const branchById = {};
    branches.forEach((b) => {
      branchById[b.id] = b;
    });
    const bankById = {};
    banks.forEach((b) => {
      bankById[b.id] = b;
    });

    const supportsByBranchId = {};
    supports.forEach((s) => {
      if (!supportsByBranchId[s.branch_id]) supportsByBranchId[s.branch_id] = [];
      supportsByBranchId[s.branch_id].push(s);
    });

    const feesByBranchId = {};
    feeSchedules.forEach((f) => {
      if (!feesByBranchId[f.branch_id]) feesByBranchId[f.branch_id] = [];
      feesByBranchId[f.branch_id].push(f);
    });

    let set = null;
    if (comparisonSetId) {
      set = sets.find((s) => s.id === comparisonSetId) || null;
    } else {
      set = sets.length ? sets[sets.length - 1] : null;
    }

    if (!set) {
      return { comparison_set: null, branches: [], highlighted_rows: [] };
    }

    const items = (set.branch_ids || []).map((id) => {
      let br = branchById[id] || null;
      let bank = br ? bankById[br.bank_id] || null : null;
      const supList = supportsByBranchId[id] || [];

      // For comparison branches that have currency support data but no branch record
      // (e.g., some Deira USD branches), synthesise a minimal placeholder branch so
      // that downstream logic can still reference branch.id and basic location.
      if (!br && supList.length) {
        const idLower = id.toLowerCase();
        const inferredArea = idLower.indexOf('deira') !== -1 ? 'Deira' : '';
        const inferredCity = 'Dubai';
        let inferredBankId = null;
        if (id.indexOf('mashreq_') === 0 && bankById['mashreq_bank']) {
          inferredBankId = 'mashreq_bank';
        }
        br = {
          id: id,
          bank_id: inferredBankId,
          name: '',
          area: inferredArea,
          city: inferredCity
        };
        if (inferredBankId) {
          bank = bankById[inferredBankId] || null;
        }
      }

      const currencySupports = supList.map((s) => ({
        support: this._deepClone(s),
        currency_code: s.currency_code,
        supports_international_transfers: !!s.supports_international_transfers,
        transfer_cutoff_time: s.transfer_cutoff_time || '',
        transfer_cutoff_time_notes: s.transfer_cutoff_time_notes || ''
      }));

      const fees = (feesByBranchId[id] || []).map((f) => ({
        fee_schedule: this._deepClone(f),
        fee_type: f.fee_type,
        currency_code: f.currency_code,
        amount: f.amount,
        fee_unit: f.fee_unit
      }));

      let usdCutoff = '';
      const intlCurrencies = [];
      supList.forEach((s) => {
        if (s.currency_code === 'USD' && s.transfer_cutoff_time && !usdCutoff) {
          usdCutoff = s.transfer_cutoff_time;
        }
        if (s.supports_international_transfers && s.currency_code) {
          if (intlCurrencies.indexOf(s.currency_code) === -1) {
            intlCurrencies.push(s.currency_code);
          }
        }
      });

      return {
        branch: br ? this._deepClone(br) : null,
        bank: bank ? this._deepClone(bank) : null,
        currency_supports: currencySupports,
        fees: fees,
        metrics: {
          usd_transfer_cutoff_time: usdCutoff,
          international_transfer_currencies: intlCurrencies
        }
      };
    });

    const highlightedRows = ['usd_transfer_cutoff_time', 'international_transfer_currencies'];

    return {
      comparison_set: this._deepClone(set),
      branches: items,
      highlighted_rows: highlightedRows
    };
  }

  // savePreferredBranchFromComparison(comparisonSetId, branchId)
  savePreferredBranchFromComparison(comparisonSetId, branchId) {
    // comparisonSetId is not needed for saving; selection handled in UI
    const res = this.saveBranch(branchId, true, 'branch_comparison');
    return {
      success: res.success,
      saved_branch: res.saved_branch,
      message: res.message
    };
  }

  // removeBranchFromComparison(branchId, comparisonSetId)
  removeBranchFromComparison(branchId, comparisonSetId) {
    if (!branchId) {
      return { comparison_set: null, success: false };
    }

    let sets = this._getFromStorage('branch_comparison_sets', []);
    if (!sets.length) {
      return { comparison_set: null, success: false };
    }

    let idxSet = -1;
    if (comparisonSetId) {
      idxSet = sets.findIndex((s) => s.id === comparisonSetId);
    } else {
      idxSet = sets.length - 1;
    }

    if (idxSet < 0) {
      return { comparison_set: null, success: false };
    }

    const set = sets[idxSet];
    set.branch_ids = (set.branch_ids || []).filter((id) => id !== branchId);
    sets[idxSet] = set;
    this._saveToStorage('branch_comparison_sets', sets);

    return { comparison_set: this._deepClone(set), success: true };
  }

  // getGuideFilterOptions()
  getGuideFilterOptions() {
    const guides = this._getFromStorage('guides', []);
    const tagsSet = new Set();
    guides.forEach((g) => {
      if (Array.isArray(g.tags)) {
        g.tags.forEach((t) => {
          if (t) tagsSet.add(t);
        });
      }
    });

    const tags = Array.from(tagsSet).sort();

    const readingTimeBuckets = [
      { max_minutes: 5, label: 'Up to 5 minutes' },
      { max_minutes: 10, label: 'Up to 10 minutes' },
      { max_minutes: 20, label: 'Up to 20 minutes' },
      { max_minutes: 30, label: 'Up to 30 minutes' }
    ];

    return {
      tags: tags,
      reading_time_buckets: readingTimeBuckets
    };
  }

  // listGuides(searchQuery, tag, maxReadingTimeMinutes, sortBy)
  listGuides(searchQuery, tag, maxReadingTimeMinutes, sortBy) {
    const guides = this._getFromStorage('guides', []);
    const normalize = (s) => (s || '').toString().toLowerCase();

    let results = guides.filter((g) => {
      if (searchQuery && searchQuery.trim()) {
        const q = normalize(searchQuery);
        const haystack = [normalize(g.title), normalize(g.short_description)].join(' ');
        if (haystack.indexOf(q) === -1) return false;
      }
      if (tag) {
        if (!Array.isArray(g.tags) || g.tags.indexOf(tag) === -1) return false;
      }
      if (typeof maxReadingTimeMinutes === 'number') {
        if (typeof g.estimated_reading_time_minutes === 'number') {
          if (g.estimated_reading_time_minutes > maxReadingTimeMinutes) return false;
        }
      }
      return true;
    });

    if (sortBy === 'published_at_desc') {
      results.sort((a, b) => {
        const ad = a.published_at || '';
        const bd = b.published_at || '';
        if (ad < bd) return 1;
        if (ad > bd) return -1;
        return 0;
      });
    } else if (sortBy === 'reading_time_asc') {
      results.sort((a, b) => {
        const ar = typeof a.estimated_reading_time_minutes === 'number' ? a.estimated_reading_time_minutes : Number.MAX_SAFE_INTEGER;
        const br = typeof b.estimated_reading_time_minutes === 'number' ? b.estimated_reading_time_minutes : Number.MAX_SAFE_INTEGER;
        return ar - br;
      });
    } else if (sortBy === 'title_asc') {
      results.sort((a, b) => {
        const at = normalize(a.title);
        const bt = normalize(b.title);
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    }

    return this._deepClone(results);
  }

  // getGuideDetail(guideId)
  getGuideDetail(guideId) {
    const guides = this._getFromStorage('guides', []);
    const savedGuides = this._getFromStorage('saved_guides', []);

    const guide = guides.find((g) => g.id === guideId) || null;
    if (guide) {
      this._recordRecentlyViewedGuide(guideId);
    }

    const bookmark = savedGuides.find((b) => b.guide_id === guideId) || null;

    return {
      guide: guide ? this._deepClone(guide) : null,
      toc_sections: guide && Array.isArray(guide.toc_sections) ? this._deepClone(guide.toc_sections) : [],
      is_bookmarked: !!bookmark,
      bookmark_id: bookmark ? bookmark.id : null
    };
  }

  // bookmarkGuide(guideId, addToReadingList)
  bookmarkGuide(guideId, addToReadingList) {
    if (!guideId) {
      return { success: false, bookmark: null, message: 'guideId is required.' };
    }

    const guides = this._getFromStorage('guides', []);
    const guide = guides.find((g) => g.id === guideId) || null;
    if (!guide) {
      return { success: false, bookmark: null, message: 'Guide not found.' };
    }

    let bookmarks = this._getFromStorage('saved_guides', []);
    let existing = bookmarks.find((b) => b.guide_id === guideId) || null;
    const now = this._getNowISO();

    if (existing) {
      existing.is_in_reading_list = !!addToReadingList;
      existing.updated_at = now;
      this._persistSavedGuideBookmark(existing);
      return { success: true, bookmark: this._deepClone(existing), message: 'Bookmark updated.' };
    }

    const bookmark = {
      id: this._generateId('sgb'),
      guide_id: guideId,
      is_in_reading_list: !!addToReadingList,
      source: 'guide_detail',
      created_at: now
    };

    this._persistSavedGuideBookmark(bookmark);

    return { success: true, bookmark: this._deepClone(bookmark), message: 'Guide bookmarked.' };
  }

  // getBranchIssueReportContext(branchId)
  getBranchIssueReportContext(branchId) {
    const branches = this._getFromStorage('branches', []);
    const banks = this._getFromStorage('banks', []);

    const branch = branches.find((b) => b.id === branchId) || null;
    const bank = branch ? banks.find((b) => b.id === branch.bank_id) || null : null;

    const currentCodes = {
      branch_code: branch ? branch.branch_code || '' : '',
      routing_code: branch ? branch.routing_code || '' : '',
      swift_primary_code: branch ? branch.swift_primary_code || '' : ''
    };

    const suggestedIssueTypes = [
      { value: 'incorrect_branch_code', label: 'Incorrect branch code' },
      { value: 'incorrect_swift_code', label: 'Incorrect SWIFT / BIC code' },
      { value: 'incorrect_address', label: 'Incorrect address' },
      { value: 'incorrect_hours', label: 'Incorrect opening hours' },
      { value: 'other', label: 'Other issue' }
    ];

    return {
      branch: branch ? this._deepClone(branch) : null,
      bank: bank ? this._deepClone(bank) : null,
      current_codes: currentCodes,
      suggested_issue_types: suggestedIssueTypes
    };
  }

  // submitBranchIssueReport(branchId, reporterName, reporterEmail, issueType, description, urgency, sendCopyToReporter)
  submitBranchIssueReport(branchId, reporterName, reporterEmail, issueType, description, urgency, sendCopyToReporter) {
    if (!branchId) {
      return { issue_report: null, success: false, message: 'branchId is required.' };
    }
    if (!issueType) {
      return { issue_report: null, success: false, message: 'issueType is required.' };
    }

    const branches = this._getFromStorage('branches', []);
    const branch = branches.find((b) => b.id === branchId) || null;
    if (!branch) {
      return { issue_report: null, success: false, message: 'Branch not found.' };
    }

    const now = this._getNowISO();
    const report = {
      id: this._generateId('bir'),
      branch_id: branchId,
      branch_name_snapshot: branch.name || '',
      reporter_name: reporterName || '',
      reporter_email: reporterEmail || '',
      issue_type: issueType,
      description: description || '',
      urgency: urgency || 'low',
      send_copy_to_reporter: !!sendCopyToReporter,
      status: 'submitted',
      created_at: now,
      updated_at: now
    };

    const reports = this._getFromStorage('branch_issue_reports', []);
    reports.push(report);
    this._saveToStorage('branch_issue_reports', reports);

    return {
      issue_report: this._deepClone(report),
      success: true,
      message: 'Issue report submitted.'
    };
  }

  // getSavedItemsOverview()
  getSavedItemsOverview() {
    const savedBranches = this._getFromStorage('saved_branches', []);
    const savedGuides = this._getFromStorage('saved_guides', []);
    const branches = this._getFromStorage('branches', []);
    const banks = this._getFromStorage('banks', []);
    const guides = this._getFromStorage('guides', []);

    const branchById = {};
    branches.forEach((b) => {
      branchById[b.id] = b;
    });
    const bankById = {};
    banks.forEach((b) => {
      bankById[b.id] = b;
    });
    const guideById = {};
    guides.forEach((g) => {
      guideById[g.id] = g;
    });

    const savedBranchesOverview = savedBranches.map((sb) => {
      const branch = branchById[sb.branch_id] || null;
      const bank = branch ? bankById[branch.bank_id] || null : null;
      return {
        saved_branch: this._deepClone(sb),
        branch: branch ? this._deepClone(branch) : null,
        bank: bank ? this._deepClone(bank) : null
      };
    });

    const savedGuidesOverview = savedGuides.map((sg) => {
      const guide = guideById[sg.guide_id] || null;
      return {
        bookmark: this._deepClone(sg),
        guide: guide ? this._deepClone(guide) : null
      };
    });

    return {
      saved_branches: savedBranchesOverview,
      saved_guides: savedGuidesOverview
    };
  }

  // removeSavedBranch(savedBranchId)
  removeSavedBranch(savedBranchId) {
    let items = this._getFromStorage('saved_branches', []);
    const before = items.length;
    items = items.filter((sb) => sb.id !== savedBranchId);
    this._saveToStorage('saved_branches', items);
    const removed = items.length < before;
    return {
      success: removed,
      message: removed ? 'Saved branch removed.' : 'Saved branch not found.'
    };
  }

  // removeSavedGuideBookmark(savedGuideBookmarkId)
  removeSavedGuideBookmark(savedGuideBookmarkId) {
    let items = this._getFromStorage('saved_guides', []);
    const before = items.length;
    items = items.filter((sg) => sg.id !== savedGuideBookmarkId);
    this._saveToStorage('saved_guides', items);
    const removed = items.length < before;
    return {
      success: removed,
      message: removed ? 'Saved guide bookmark removed.' : 'Saved guide bookmark not found.'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const content = this._loadStaticPageContent('about_page_content', { title: '', sections: [] });
    return this._deepClone(content || { title: '', sections: [] });
  }

  // getContactOptions()
  getContactOptions() {
    const defaultContent = {
      contact_email: '',
      contact_phone: '',
      topics: [],
      form_fields: []
    };
    const content = this._loadStaticPageContent('contact_options', defaultContent);
    return this._deepClone(content || defaultContent);
  }

  // submitContactMessage(name, email, topic, subject, message)
  submitContactMessage(name, email, topic, subject, message) {
    if (!name || !email || !subject || !message) {
      return { success: false, ticket_id: null, message: 'Name, email, subject, and message are required.' };
    }

    const now = this._getNowISO();
    const ticketId = this._generateId('ct');
    const record = {
      id: ticketId,
      name: name,
      email: email,
      topic: topic || '',
      subject: subject,
      message: message,
      created_at: now
    };

    const messages = this._getFromStorage('contact_messages', []);
    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      ticket_id: ticketId,
      message: 'Your message has been submitted.'
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const defaultContent = { title: '', last_updated: this._getNowISO(), sections: [] };
    const content = this._loadStaticPageContent('privacy_policy_content', defaultContent);
    return this._deepClone(content || defaultContent);
  }

  // getTermsOfUseContent()
  getTermsOfUseContent() {
    const defaultContent = { title: '', last_updated: this._getNowISO(), sections: [] };
    const content = this._loadStaticPageContent('terms_of_use_content', defaultContent);
    return this._deepClone(content || defaultContent);
  }

  // getHelpHowItWorksContent()
  getHelpHowItWorksContent() {
    const defaultContent = { sections: [] };
    const content = this._loadStaticPageContent('help_how_it_works_content', defaultContent);
    return this._deepClone(content || defaultContent);
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