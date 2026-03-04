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

  // ---------------------------
  // Storage helpers
  // ---------------------------

  _initStorage() {
    const keys = [
      'catalog_items',
      'branches',
      'subjects',
      'reading_lists',
      'reading_list_items',
      'favorite_items',
      'holds',
      'loans',
      'popular_search_terms',
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

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
      return defaultValue;
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

  // ---------------------------
  // Internal helper functions (private)
  // ---------------------------

  // Load or initialize per-user state (single-user context)
  _getOrInitializeUserState() {
    // Ensure base tables exist (handled by _initStorage, but be defensive)
    this._initStorage();
    return {
      readingLists: this._getFromStorage('reading_lists'),
      readingListItems: this._getFromStorage('reading_list_items'),
      favoriteItems: this._getFromStorage('favorite_items'),
      holds: this._getFromStorage('holds'),
      loans: this._getFromStorage('loans')
    };
  }

  // Collect all descendant subject ids for hierarchical filtering
  _collectDescendantSubjectIds(subjects, rootId) {
    const result = new Set([rootId]);
    const queue = [rootId];
    while (queue.length > 0) {
      const currentId = queue.shift();
      subjects.forEach((s) => {
        if (s.parent_subject_id === currentId && !result.has(s.id)) {
          result.add(s.id);
          queue.push(s.id);
        }
      });
    }
    return Array.from(result);
  }

  // Apply query, filters, sorting, and pagination to catalog_items
  _applySearchFilters(query, filters, sort, page, pageSize) {
    const allItemsRaw = this._getFromStorage('catalog_items');
    const subjects = this._getFromStorage('subjects');
    const branches = this._getFromStorage('branches');

    let items = allItemsRaw.map((i) => ({ ...i }));

    const normalizedQuery = (query || '').trim().toLowerCase();

    // Basic relevance scoring if query is present
    if (normalizedQuery) {
      items.forEach((item) => {
        let score = 0;
        const haystacks = [
          item.title,
          item.subtitle,
          item.author,
          item.description,
          item.series_title
        ]
          .filter(Boolean)
          .map((s) => String(s).toLowerCase());
        haystacks.forEach((text) => {
          if (text.includes(normalizedQuery)) {
            score += 2;
          }
        });
        item._relevanceScore = score;
      });
    }

    const f = filters || {};

    // Audience level filter (OR logic)
    if (Array.isArray(f.audienceLevels) && f.audienceLevels.length > 0) {
      const allowed = new Set(f.audienceLevels);
      items = items.filter((item) => allowed.has(item.audience_level));
    }

    // Format filter (OR)
    if (Array.isArray(f.formats) && f.formats.length > 0) {
      const allowed = new Set(f.formats);
      items = items.filter((item) => allowed.has(item.format));
    }

    // Language filter
    if (f.language) {
      items = items.filter((item) => item.language === f.language);
    }

    // Branch/location filter (by availability at specific branches)
    if (Array.isArray(f.branchIds) && f.branchIds.length > 0) {
      const branchIdSet = new Set(f.branchIds);
      items = items.filter((item) => {
        if (!Array.isArray(item.available_branch_ids) || item.available_branch_ids.length === 0) {
          return false;
        }
        return item.available_branch_ids.some((bid) => branchIdSet.has(bid));
      });
    }

    // Time period filter
    if (Array.isArray(f.timePeriods) && f.timePeriods.length > 0) {
      const allowed = new Set(f.timePeriods);
      items = items.filter((item) => item.time_period && allowed.has(item.time_period));
    }

    // Minimum page count filter
    if (typeof f.minPageCount === 'number') {
      items = items.filter((item) => {
        if (typeof item.page_count !== 'number') return false;
        return item.page_count >= f.minPageCount;
      });
    }

    // Minimum duration (minutes) filter for audiobooks
    if (typeof f.minDurationMinutes === 'number') {
      items = items.filter((item) => {
        if (typeof item.duration_minutes !== 'number') return false;
        return item.duration_minutes >= f.minDurationMinutes;
      });
    }

    // Availability filter (based on branches and their types)
    if (f.availability && f.availability !== 'any') {
      const allBranchesById = new Map(branches.map((b) => [b.id, b]));

      if (f.availability === 'available_now_district') {
        items = items.filter((item) => Array.isArray(item.available_branch_ids) && item.available_branch_ids.length > 0);
      } else if (f.availability === 'available_now_elementary') {
        items = items.filter((item) => {
          if (!Array.isArray(item.available_branch_ids)) return false;
          return item.available_branch_ids.some((bid) => {
            const br = allBranchesById.get(bid);
            return br && br.branch_type === 'elementary_school';
          });
        });
      } else if (f.availability === 'available_now_high_school') {
        items = items.filter((item) => {
          if (!Array.isArray(item.available_branch_ids)) return false;
          return item.available_branch_ids.some((bid) => {
            const br = allBranchesById.get(bid);
            return br && br.branch_type === 'high_school';
          });
        });
      } else if (f.availability === 'available_now_at_selected_branches') {
        if (Array.isArray(f.branchIds) && f.branchIds.length > 0) {
          const branchIdSet = new Set(f.branchIds);
          items = items.filter((item) => {
            if (!Array.isArray(item.available_branch_ids)) return false;
            return item.available_branch_ids.some((bid) => branchIdSet.has(bid));
          });
        } else {
          // If no selected branches provided, no items match this availability mode
          items = [];
        }
      }
    }

    // Series title filter
    if (f.seriesTitle) {
      const target = String(f.seriesTitle).trim().toLowerCase();
      items = items.filter((item) => item.series_title && String(item.series_title).toLowerCase() === target);
    }

    // Subject filter with hierarchy
    if (f.subjectId) {
      const subjectIdsToInclude = this._collectDescendantSubjectIds(subjects, f.subjectId);
      const subjectIdSet = new Set(subjectIdsToInclude);
      items = items.filter((item) => {
        if (!Array.isArray(item.subject_ids)) return false;
        return item.subject_ids.some((sid) => subjectIdSet.has(sid));
      });
    }

    // Publication year range
    if (typeof f.publicationYearMin === 'number') {
      items = items.filter((item) => typeof item.publication_year === 'number' && item.publication_year >= f.publicationYearMin);
    }
    if (typeof f.publicationYearMax === 'number') {
      items = items.filter((item) => typeof item.publication_year === 'number' && item.publication_year <= f.publicationYearMax);
    }

    // Additional relevance filter: if query exists, drop items with zero score
    if (normalizedQuery) {
      items = items.filter((item) => (item._relevanceScore || 0) > 0);
    }

    // Sorting
    const sortId = sort || 'relevance';
    items.sort((a, b) => {
      if (sortId === 'publication_date_desc') {
        const ay = typeof a.publication_year === 'number' ? a.publication_year : 0;
        const by = typeof b.publication_year === 'number' ? b.publication_year : 0;
        if (by !== ay) return by - ay;
        return String(a.title || '').localeCompare(String(b.title || ''));
      }
      if (sortId === 'most_popular') {
        const ap = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const bp = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        if (bp !== ap) return bp - ap;
        return String(a.title || '').localeCompare(String(b.title || ''));
      }
      if (sortId === 'rating_desc') {
        const ar = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const br = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (br !== ar) return br - ar;
        const ac = typeof a.ratings_count === 'number' ? a.ratings_count : 0;
        const bc = typeof b.ratings_count === 'number' ? b.ratings_count : 0;
        if (bc !== ac) return bc - ac;
        return String(a.title || '').localeCompare(String(b.title || ''));
      }
      if (sortId === 'series_volume_asc') {
        const as = String(a.series_title || '');
        const bs = String(b.series_title || '');
        const cmpSeries = as.localeCompare(bs);
        if (cmpSeries !== 0) return cmpSeries;
        const av = typeof a.series_volume_number === 'number' ? a.series_volume_number : Number.POSITIVE_INFINITY;
        const bv = typeof b.series_volume_number === 'number' ? b.series_volume_number : Number.POSITIVE_INFINITY;
        if (av !== bv) return av - bv;
        return String(a.title || '').localeCompare(String(b.title || ''));
      }
      // Default: relevance
      const ar = typeof a._relevanceScore === 'number' ? a._relevanceScore : 0;
      const br = typeof b._relevanceScore === 'number' ? b._relevanceScore : 0;
      if (br !== ar) return br - ar;
      return String(a.title || '').localeCompare(String(b.title || ''));
    });

    const totalCount = items.length;
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const currentPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * currentPageSize;
    const end = start + currentPageSize;
    const pageItems = items.slice(start, end).map((item) => {
      const clone = { ...item };
      delete clone._relevanceScore;
      return clone;
    });

    return {
      totalCount,
      page: currentPage,
      pageSize: currentPageSize,
      items: pageItems
    };
  }

  // Create or update a Hold record
  _createOrUpdateHoldRecord(itemId, pickupBranchId) {
    const items = this._getFromStorage('catalog_items');
    const branches = this._getFromStorage('branches');
    const holds = this._getFromStorage('holds');

    const item = items.find((it) => it.id === itemId);
    if (!item) {
      return {
        success: false,
        hold: null,
        message: 'Item not found.'
      };
    }

    const branch = branches.find((b) => b.id === pickupBranchId);
    if (!branch) {
      return {
        success: false,
        hold: null,
        message: 'Pickup branch not found.'
      };
    }
    if (!branch.is_pickup_location) {
      return {
        success: false,
        hold: null,
        message: 'Selected branch is not a pickup location.'
      };
    }

    // If an active or ready_for_pickup hold already exists for this item at this branch, return it
    const existingHold = holds.find(
      (h) => h.item_id === itemId && h.pickup_branch_id === pickupBranchId && (h.status === 'active' || h.status === 'ready_for_pickup')
    );

    const nowIso = new Date().toISOString();

    if (existingHold) {
      return {
        success: true,
        hold: existingHold,
        message: 'Hold already exists.'
      };
    }

    const newHold = {
      id: this._generateId('hold'),
      item_id: itemId,
      pickup_branch_id: pickupBranchId,
      placed_at: nowIso,
      status: 'active',
      is_digital: !!item.is_digital,
      pickup_by: null,
      notes: null
    };

    holds.push(newHold);
    this._saveToStorage('holds', holds);

    return {
      success: true,
      hold: newHold,
      message: 'Hold placed successfully.'
    };
  }

  // Create Loan from a digital item
  _createLoanFromDigitalItem(itemId, loanPeriodDays) {
    const items = this._getFromStorage('catalog_items');
    const loans = this._getFromStorage('loans');

    const item = items.find((it) => it.id === itemId);
    if (!item) {
      return {
        success: false,
        loan: null,
        message: 'Item not found.'
      };
    }

    if (!item.is_digital || !item.is_borrowable) {
      return {
        success: false,
        loan: null,
        message: 'Item is not borrowable as a digital resource.'
      };
    }

    if (!Array.isArray(item.loan_period_options_days) || item.loan_period_options_days.length === 0) {
      return {
        success: false,
        loan: null,
        message: 'No loan period options are configured for this item.'
      };
    }

    if (!item.loan_period_options_days.includes(loanPeriodDays)) {
      return {
        success: false,
        loan: null,
        message: 'Requested loan period is not allowed for this item.'
      };
    }

    const now = new Date();
    const due = new Date(now.getTime() + loanPeriodDays * 24 * 60 * 60 * 1000);

    const newLoan = {
      id: this._generateId('loan'),
      item_id: itemId,
      checked_out_at: now.toISOString(),
      due_at: due.toISOString(),
      loan_period_days: loanPeriodDays,
      renewed_count: 0,
      max_renewals: typeof item.max_renewals === 'number' ? item.max_renewals : 2,
      can_renew: true
    };

    loans.push(newLoan);
    this._saveToStorage('loans', loans);

    return {
      success: true,
      loan: newLoan,
      message: 'Digital item borrowed successfully.'
    };
  }

  // Update favorites state
  _updateFavoritesState(itemId, isFavorite) {
    const favorites = this._getFromStorage('favorite_items');

    if (isFavorite) {
      const existing = favorites.find((f) => f.item_id === itemId);
      if (existing) {
        return { favorite: existing, isFavorite: true };
      }
      const nowIso = new Date().toISOString();
      const newFav = {
        id: this._generateId('fav'),
        item_id: itemId,
        added_at: nowIso
      };
      favorites.push(newFav);
      this._saveToStorage('favorite_items', favorites);
      return { favorite: newFav, isFavorite: true };
    }

    const index = favorites.findIndex((f) => f.item_id === itemId);
    let removed = null;
    if (index !== -1) {
      removed = favorites[index];
      favorites.splice(index, 1);
      this._saveToStorage('favorite_items', favorites);
    }
    return { favorite: removed, isFavorite: false };
  }

  // ---------------------------
  // Core interface implementations
  // ---------------------------

  // getHomepageContent(): featured subjects/items and popular search terms
  getHomepageContent() {
    const subjects = this._getFromStorage('subjects');
    const items = this._getFromStorage('catalog_items');
    const popularSearchTerms = this._getFromStorage('popular_search_terms'); // expected to be array of strings

    const featuredSubjects = subjects.filter((s) => !s.parent_subject_id).slice(0, 8);

    const featuredItems = items
      .slice()
      .sort((a, b) => {
        const ap = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const bp = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        if (bp !== ap) return bp - ap;
        return String(a.title || '').localeCompare(String(b.title || ''));
      })
      .slice(0, 12);

    return {
      featuredSubjects,
      featuredItems,
      popularSearchTerms
    };
  }

  // getSearchFilterOptions(): labels for search filters/sorts
  getSearchFilterOptions() {
    const audienceLevels = [
      {
        id: 'prek_k',
        label: 'PreK–K',
        description: 'Materials for preschool and kindergarten.'
      },
      {
        id: 'grades_4_5',
        label: 'Grades 4–5',
        description: 'Upper elementary materials.'
      },
      {
        id: 'grade_6',
        label: 'Grade 6',
        description: 'Sixth grade materials.'
      },
      {
        id: 'grade_8',
        label: 'Grade 8',
        description: 'Eighth grade materials.'
      },
      {
        id: 'grades_7_8',
        label: 'Grades 7–8',
        description: 'Middle school materials.'
      },
      {
        id: 'grades_9_12',
        label: 'Grades 9–12',
        description: 'High school materials.'
      },
      {
        id: 'grade_10',
        label: 'Grade 10',
        description: 'Tenth grade materials.'
      }
    ];

    const formats = [
      { id: 'print_book', label: 'Print Book' },
      { id: 'ebook', label: 'eBook' },
      { id: 'audiobook', label: 'Audiobook' },
      { id: 'picture_book', label: 'Picture Book' },
      { id: 'graphic_novel', label: 'Graphic Novel' },
      { id: 'online_article_database', label: 'Online Article / Database' }
    ];

    const languages = [
      { id: 'english', label: 'English' },
      { id: 'spanish', label: 'Spanish' },
      { id: 'other', label: 'Other languages' }
    ];

    const availabilityOptions = [
      { id: 'any', label: 'Any availability', description: 'Show all matching items.' },
      {
        id: 'available_now_district',
        label: 'Available now in district',
        description: 'Items with at least one available copy anywhere in the district.'
      },
      {
        id: 'available_now_elementary',
        label: 'Available now at elementary schools',
        description: 'Items available at one or more elementary school libraries.'
      },
      {
        id: 'available_now_high_school',
        label: 'Available now at high schools',
        description: 'Items available at one or more high school libraries.'
      },
      {
        id: 'available_now_at_selected_branches',
        label: 'Available now at selected branches',
        description: 'Items available at specific branches you choose.'
      }
    ];

    const sortOptions = [
      {
        id: 'relevance',
        label: 'Relevance',
        description: 'Best match for your search terms.'
      },
      {
        id: 'publication_date_desc',
        label: 'Publication Date - Newest First',
        description: 'Newest publication year first.'
      },
      {
        id: 'most_popular',
        label: 'Most Popular',
        description: 'Items with highest popularity or checkout counts.'
      },
      {
        id: 'rating_desc',
        label: 'Rating - Highest First',
        description: 'Items with highest average star ratings.'
      },
      {
        id: 'series_volume_asc',
        label: 'Series Order (Volume) - Ascending',
        description: 'Series ordered from first volume onward.'
      }
    ];

    const timePeriods = [
      { id: 'nineteenth_century_1800_1899', label: '19th Century (1800–1899)' }
    ];

    const branchTypes = [
      { id: 'elementary_school', label: 'Elementary School' },
      { id: 'middle_school', label: 'Middle School' },
      { id: 'high_school', label: 'High School' },
      { id: 'district_digital', label: 'District Digital Collection' }
    ];

    return {
      audienceLevels,
      formats,
      languages,
      availabilityOptions,
      sortOptions,
      timePeriods,
      branchTypes
    };
  }

  // searchCatalog(query, filters, sort, page, pageSize)
  searchCatalog(query, filters, sort, page, pageSize) {
    return this._applySearchFilters(query, filters, sort, page, pageSize);
  }

  // getCatalogItemDetail(catalogItemId)
  getCatalogItemDetail(catalogItemId) {
    const items = this._getFromStorage('catalog_items');
    const branches = this._getFromStorage('branches');

    const item = items.find((it) => it.id === catalogItemId) || null;
    if (!item) {
      return { item: null, availableBranches: [] };
    }

    const availableBranches = Array.isArray(item.available_branch_ids)
      ? branches.filter((b) => item.available_branch_ids.includes(b.id))
      : [];

    return { item, availableBranches };
  }

  // getTopLevelSubjects()
  getTopLevelSubjects() {
    const subjects = this._getFromStorage('subjects');
    return subjects.filter((s) => !s.parent_subject_id);
  }

  // getSubjectsForAudience(audienceLevel)
  getSubjectsForAudience(audienceLevel) {
    const items = this._getFromStorage('catalog_items');
    const subjects = this._getFromStorage('subjects');

    const subjectIdSet = new Set();
    items.forEach((item) => {
      if (item.audience_level === audienceLevel && Array.isArray(item.subject_ids)) {
        item.subject_ids.forEach((sid) => subjectIdSet.add(sid));
      }
    });

    return subjects.filter((s) => subjectIdSet.has(s.id));
  }

  // getBranches(onlyPickupLocations, branchType)
  getBranches(onlyPickupLocations, branchType) {
    const branches = this._getFromStorage('branches');
    return branches.filter((b) => {
      if (onlyPickupLocations && !b.is_pickup_location) return false;
      if (branchType && b.branch_type !== branchType) return false;
      return true;
    });
  }

  // placeHold(itemId, pickupBranchId)
  placeHold(itemId, pickupBranchId) {
    return this._createOrUpdateHoldRecord(itemId, pickupBranchId);
  }

  // borrowDigitalItem(itemId, loanPeriodDays)
  borrowDigitalItem(itemId, loanPeriodDays) {
    return this._createLoanFromDigitalItem(itemId, loanPeriodDays);
  }

  // getAccountOverview()
  getAccountOverview() {
    const state = this._getOrInitializeUserState();
    const now = new Date();

    const totalLoans = state.loans.length;
    const totalHolds = state.holds.filter((h) => h.status !== 'cancelled').length;

    let overdueCount = 0;
    let nextDueAt = null;

    state.loans.forEach((loan) => {
      const dueDate = new Date(loan.due_at);
      if (dueDate < now) {
        overdueCount += 1;
      } else {
        if (!nextDueAt || dueDate < new Date(nextDueAt)) {
          nextDueAt = dueDate.toISOString();
        }
      }
    });

    return {
      totalLoans,
      totalHolds,
      overdueCount,
      nextDueAt
    };
  }

  // getLoans(dueFilter, page, pageSize)
  getLoans(dueFilter, page, pageSize) {
    const loans = this._getFromStorage('loans');
    const items = this._getFromStorage('catalog_items');

    const filter = dueFilter || 'all';
    const now = new Date();
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    let filteredLoans = loans.filter((loan) => {
      const dueDate = new Date(loan.due_at);
      if (filter === 'due_within_7_days') {
        return dueDate >= now && dueDate <= inSevenDays;
      }
      if (filter === 'overdue') {
        return dueDate < now;
      }
      return true; // 'all'
    });

    // Instrumentation for task completion tracking (task_3 - due within 7 days loans)
    try {
      if (dueFilter === 'due_within_7_days') {
        const instrumentationValue = {
          capturedAt: new Date().toISOString(),
          loanIds: filteredLoans.map((l) => l.id)
        };
        localStorage.setItem('task3_dueWithin7DaysLoans', JSON.stringify(instrumentationValue));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const currentPageSize = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 50;
    const start = (currentPage - 1) * currentPageSize;
    const end = start + currentPageSize;

    const pageLoans = filteredLoans.slice(start, end);

    const itemsById = new Map(items.map((it) => [it.id, it]));

    const resultItems = pageLoans.map((loan) => ({
      loan,
      item: itemsById.get(loan.item_id) || null
    }));

    return {
      totalCount: filteredLoans.length,
      items: resultItems
    };
  }

  // renewLoans(loanIds)
  renewLoans(loanIds) {
    const loans = this._getFromStorage('loans');
    const idSet = Array.isArray(loanIds) ? loanIds : [];

    // Instrumentation for task completion tracking (task_3 - last renew request)
    try {
      const instrumentationValue = {
        calledAt: new Date().toISOString(),
        loanIds: Array.from(idSet)
      };
      localStorage.setItem('task3_lastRenewRequest', JSON.stringify(instrumentationValue));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const results = [];
    let anySuccess = false;

    const now = new Date();

    idSet.forEach((loanId) => {
      const loan = loans.find((l) => l.id === loanId);
      if (!loan) {
        results.push({
          loanId,
          success: false,
          message: 'Loan not found.',
          updatedLoan: null
        });
        return;
      }

      if (!loan.can_renew) {
        results.push({
          loanId,
          success: false,
          message: 'Loan cannot be renewed.',
          updatedLoan: { ...loan }
        });
        return;
      }

      if (loan.renewed_count >= loan.max_renewals) {
        loan.can_renew = false;
        results.push({
          loanId,
          success: false,
          message: 'Maximum number of renewals reached.',
          updatedLoan: { ...loan }
        });
        return;
      }

      const baseDate = new Date(loan.due_at) > now ? new Date(loan.due_at) : now;
      const newDue = new Date(baseDate.getTime() + loan.loan_period_days * 24 * 60 * 60 * 1000);

      loan.renewed_count += 1;
      loan.due_at = newDue.toISOString();
      if (loan.renewed_count >= loan.max_renewals) {
        loan.can_renew = false;
      }

      anySuccess = true;
      results.push({
        loanId,
        success: true,
        message: 'Loan renewed successfully.',
        updatedLoan: { ...loan }
      });
    });

    this._saveToStorage('loans', loans);

    return {
      overallSuccess: anySuccess,
      results
    };
  }

  // getUserHolds(statusFilter)
  getUserHolds(statusFilter) {
    const holds = this._getFromStorage('holds');
    const items = this._getFromStorage('catalog_items');
    const branches = this._getFromStorage('branches');

    const status = statusFilter || 'all';

    const filtered = holds.filter((h) => {
      if (status === 'all') return true;
      return h.status === status;
    });

    const itemsById = new Map(items.map((it) => [it.id, it]));
    const branchesById = new Map(branches.map((b) => [b.id, b]));

    return filtered.map((hold) => ({
      hold,
      item: itemsById.get(hold.item_id) || null,
      pickupBranch: branchesById.get(hold.pickup_branch_id) || null
    }));
  }

  // getUserReadingLists()
  getUserReadingLists() {
    const lists = this._getFromStorage('reading_lists');
    return lists;
  }

  // createReadingList(name, description)
  createReadingList(name, description) {
    const lists = this._getFromStorage('reading_lists');
    const nowIso = new Date().toISOString();
    const newList = {
      id: this._generateId('list'),
      name,
      description: description || '',
      created_at: nowIso,
      updated_at: nowIso
    };
    lists.push(newList);
    this._saveToStorage('reading_lists', lists);
    return newList;
  }

  // renameReadingList(listId, newName)
  renameReadingList(listId, newName) {
    const lists = this._getFromStorage('reading_lists');
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return null;
    }
    list.name = newName;
    list.updated_at = new Date().toISOString();
    this._saveToStorage('reading_lists', lists);
    return list;
  }

  // deleteReadingList(listId)
  deleteReadingList(listId) {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    const listIndex = lists.findIndex((l) => l.id === listId);
    if (listIndex === -1) {
      return { success: false, message: 'List not found.' };
    }

    lists.splice(listIndex, 1);
    const remainingItems = items.filter((it) => it.list_id !== listId);

    this._saveToStorage('reading_lists', lists);
    this._saveToStorage('reading_list_items', remainingItems);

    return { success: true, message: 'List deleted.' };
  }

  // getReadingListDetail(listId)
  getReadingListDetail(listId) {
    const lists = this._getFromStorage('reading_lists');
    const listItems = this._getFromStorage('reading_list_items');
    const items = this._getFromStorage('catalog_items');

    const list = lists.find((l) => l.id === listId) || null;

    const itemsById = new Map(items.map((it) => [it.id, it]));

    const filtered = listItems
      .filter((li) => li.list_id === listId)
      .slice()
      .sort((a, b) => {
        const ao = typeof a.sort_order === 'number' ? a.sort_order : Number.POSITIVE_INFINITY;
        const bo = typeof b.sort_order === 'number' ? b.sort_order : Number.POSITIVE_INFINITY;
        if (ao !== bo) return ao - bo;
        return new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
      });

    const detailedItems = filtered.map((li) => ({
      listItemId: li.id,
      item: itemsById.get(li.item_id) || null,
      addedAt: li.added_at,
      sortOrder: li.sort_order
    }));

    return {
      list,
      items: detailedItems
    };
  }

  // addItemToReadingList(listId, itemId)
  addItemToReadingList(listId, itemId) {
    const listItems = this._getFromStorage('reading_list_items');
    const nowIso = new Date().toISOString();

    const existingForList = listItems.filter((li) => li.list_id === listId);
    let maxSort = 0;
    existingForList.forEach((li) => {
      if (typeof li.sort_order === 'number' && li.sort_order > maxSort) {
        maxSort = li.sort_order;
      }
    });

    const newItem = {
      id: this._generateId('listitem'),
      list_id: listId,
      item_id: itemId,
      added_at: nowIso,
      notes: null,
      sort_order: maxSort + 1
    };

    listItems.push(newItem);
    this._saveToStorage('reading_list_items', listItems);

    return newItem;
  }

  // createReadingListAndAddItem(listName, listDescription, itemId)
  createReadingListAndAddItem(listName, listDescription, itemId) {
    const list = this.createReadingList(listName, listDescription);
    const listItem = this.addItemToReadingList(list.id, itemId);
    return { list, listItem };
  }

  // removeItemFromReadingList(listItemId)
  removeItemFromReadingList(listItemId) {
    const listItems = this._getFromStorage('reading_list_items');
    const idx = listItems.findIndex((li) => li.id === listItemId);
    if (idx === -1) {
      return { success: false };
    }
    listItems.splice(idx, 1);
    this._saveToStorage('reading_list_items', listItems);
    return { success: true };
  }

  // reorderReadingListItems(listId, orderedListItemIds)
  reorderReadingListItems(listId, orderedListItemIds) {
    const lists = this._getFromStorage('reading_lists');
    const listItems = this._getFromStorage('reading_list_items');

    const orderMap = new Map();
    (orderedListItemIds || []).forEach((id, index) => {
      orderMap.set(id, index + 1);
    });

    listItems.forEach((li) => {
      if (li.list_id === listId && orderMap.has(li.id)) {
        li.sort_order = orderMap.get(li.id);
      }
    });

    const list = lists.find((l) => l.id === listId) || null;
    if (list) {
      list.updated_at = new Date().toISOString();
    }

    this._saveToStorage('reading_list_items', listItems);
    this._saveToStorage('reading_lists', lists);

    return list;
  }

  // getFavoriteItems(sort)
  getFavoriteItems(sort) {
    const favorites = this._getFromStorage('favorite_items');
    const items = this._getFromStorage('catalog_items');

    const itemsById = new Map(items.map((it) => [it.id, it]));

    const enriched = favorites.map((fav) => ({
      favorite: fav,
      item: itemsById.get(fav.item_id) || null
    }));

    const sortId = sort || 'date_added_desc';

    // Instrumentation for task completion tracking (task_6 - last favorites sort)
    try {
      const instrumentationValue = {
        sortId: sortId,
        calledAt: new Date().toISOString()
      };
      localStorage.setItem('task6_lastFavoritesSort', JSON.stringify(instrumentationValue));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    enriched.sort((aWrap, bWrap) => {
      const a = aWrap.favorite;
      const b = bWrap.favorite;
      const parseNumericId = (id) => {
        if (!id) return 0;
        const parts = String(id).split('_');
        const num = parseInt(parts[parts.length - 1], 10);
        return Number.isNaN(num) ? 0 : num;
      };
      if (sortId === 'date_added_asc') {
        const tDiff = new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        if (tDiff !== 0) return tDiff;
        // Tie-breaker: earlier-created id comes first
        return parseNumericId(a.id) - parseNumericId(b.id);
      }
      if (sortId === 'title_asc') {
        const at = String((aWrap.item && aWrap.item.title) || '');
        const bt = String((bWrap.item && bWrap.item.title) || '');
        return at.localeCompare(bt);
      }
      // default date_added_desc
      const tDiffDesc = new Date(b.added_at).getTime() - new Date(a.added_at).getTime();
      if (tDiffDesc !== 0) return tDiffDesc;
      // Tie-breaker: later-created id is considered newer
      return parseNumericId(b.id) - parseNumericId(a.id);
    });

    return enriched;
  }

  // setFavoriteItem(itemId, isFavorite)
  setFavoriteItem(itemId, isFavorite) {
    return this._updateFavoritesState(itemId, isFavorite);
  }

  // getAboutContent()
  getAboutContent() {
    const obj = this._getObjectFromStorage('about_content', { title: '', body: '' });
    return obj;
  }

  // getHelpContent()
  getHelpContent() {
    const obj = this._getObjectFromStorage('help_content', { faqs: [], taskGuides: [] });
    if (!Array.isArray(obj.faqs)) obj.faqs = [];
    if (!Array.isArray(obj.taskGuides)) obj.taskGuides = [];
    return obj;
  }

  // getPoliciesContent()
  getPoliciesContent() {
    const obj = this._getObjectFromStorage('policies_content', { sections: [] });
    if (!Array.isArray(obj.sections)) obj.sections = [];
    return obj;
  }

  // getContactInfo()
  getContactInfo() {
    const obj = this._getObjectFromStorage('contact_info', {
      email: '',
      phone: '',
      officeHours: '',
      expectedResponseTime: ''
    });
    return obj;
  }

  // submitContactForm(name, email, topic, message)
  submitContactForm(name, email, topic, message) {
    const submissions = this._getFromStorage('contact_submissions');
    const id = this._generateId('ticket');
    const nowIso = new Date().toISOString();
    const record = {
      id,
      name,
      email,
      topic,
      message,
      submitted_at: nowIso
    };
    submissions.push(record);
    this._saveToStorage('contact_submissions', submissions);

    return {
      success: true,
      ticketId: id,
      message: 'Your request has been submitted.'
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