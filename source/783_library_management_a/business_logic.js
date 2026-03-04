/* eslint-disable no-var */
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
    const tables = [
      'catalog_items',
      'browse_categories',
      'catalog_item_categories',
      'lists',
      'list_items',
      'loans',
      'holds',
      'fines',
      'payment_methods',
      'fine_payments',
      'branches',
      'rooms',
      'room_reservations',
      'purchase_suggestions'
    ];

    for (let i = 0; i < tables.length; i++) {
      const key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _formatDateDisplay(value) {
    const d = this._parseDate(value);
    if (!d) return '';
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }

  // ----------------------
  // User / Staff context helpers
  // ----------------------
  _getOrCreateUserContext() {
    // Single-user context; no real authentication in this layer
    const key = 'user_context';
    const existingRaw = localStorage.getItem(key);
    if (existingRaw) {
      try {
        return JSON.parse(existingRaw);
      } catch (e) {
        // fall through to recreate
      }
    }
    const ctx = {
      userId: 'user_1',
      displayName: 'Guest',
      isStaff: false,
      locale: 'en-US'
    };
    localStorage.setItem(key, JSON.stringify(ctx));
    return ctx;
  }

  _setUserContext(ctx) {
    localStorage.setItem('user_context', JSON.stringify(ctx));
  }

  _getStaffSession() {
    const raw = localStorage.getItem('staff_session');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  _setStaffSession(session) {
    localStorage.setItem('staff_session', JSON.stringify(session));
    // also sync to user_context
    const ctx = this._getOrCreateUserContext();
    ctx.isStaff = session && session.isStaff === true;
    ctx.displayName = session && session.displayName ? session.displayName : ctx.displayName;
    this._setUserContext(ctx);
  }

  _checkStaffPermissions() {
    const session = this._getStaffSession();
    if (!session || !session.isStaff) {
      throw new Error('Staff permissions required');
    }
    return session;
  }

  // ----------------------
  // Catalog search helpers
  // ----------------------
  _applyCatalogSearchFilters(items, query, filters) {
    filters = filters || {};
    const q = query ? String(query).trim().toLowerCase() : '';

    // Preload relationships
    const branches = this._getFromStorage('branches');
    const catalogItemCategories = this._getFromStorage('catalog_item_categories');
    const browseCategories = this._getFromStorage('browse_categories');

    // If categoryKey filter, build full list including child categories
    let categoryKeysFilter = null;
    if (filters.categoryKey) {
      const baseKey = filters.categoryKey;
      categoryKeysFilter = [baseKey];
      for (let i = 0; i < browseCategories.length; i++) {
        const bc = browseCategories[i];
        if (bc.parent_category_key === baseKey && categoryKeysFilter.indexOf(bc.category_key) === -1) {
          categoryKeysFilter.push(bc.category_key);
        }
      }
    }

    const filtered = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Keyword match
      if (q) {
        const haystack = [
          item.title || '',
          item.subtitle || '',
          item.primary_author || '',
          (item.authors || []).join(' '),
          (item.subjects || []).join(' '),
          item.description || ''
        ].join(' ').toLowerCase();
        if (haystack.indexOf(q) === -1) continue;
      }

      // materialType
      if (filters.materialType && item.material_type !== filters.materialType) continue;

      // formats array
      if (filters.formats && filters.formats.length > 0) {
        if (!item.format || filters.formats.indexOf(item.format) === -1) continue;
      }

      // branchCode
      if (filters.branchCode && item.branch_code && item.branch_code !== filters.branchCode) continue;

      // isAvailable
      if (typeof filters.isAvailable === 'boolean') {
        if (!!item.is_available !== filters.isAvailable) continue;
      }

      // availabilityStatus
      if (filters.availabilityStatus && item.availability_status !== filters.availabilityStatus) continue;

      // maxPageCount
      if (typeof filters.maxPageCount === 'number' && item.page_count != null) {
        if (item.page_count > filters.maxPageCount) continue;
      }

      // publicationYearFrom / To
      if (typeof filters.publicationYearFrom === 'number' && item.publication_year != null) {
        if (item.publication_year < filters.publicationYearFrom) continue;
      }
      if (typeof filters.publicationYearTo === 'number' && item.publication_year != null) {
        if (item.publication_year > filters.publicationYearTo) continue;
      }

      // minRating
      if (typeof filters.minRating === 'number' && item.average_rating != null) {
        if (item.average_rating < filters.minRating) continue;
      }

      // language
      if (filters.language && item.language && item.language !== filters.language) continue;

      // targetAgeMin / Max
      if (typeof filters.targetAgeMin === 'number' && item.target_age_max != null) {
        if (item.target_age_max < filters.targetAgeMin) continue;
      }
      if (typeof filters.targetAgeMax === 'number' && item.target_age_min != null) {
        if (item.target_age_min > filters.targetAgeMax) continue;
      }

      // ageRangeLabel
      if (filters.ageRangeLabel && item.age_range_label && item.age_range_label !== filters.ageRangeLabel) continue;

      // categoryKey (via CatalogItemCategory)
      if (categoryKeysFilter) {
        let inCategory = false;
        for (let j = 0; j < catalogItemCategories.length; j++) {
          const cic = catalogItemCategories[j];
          if (cic.catalog_item_id === item.id && categoryKeysFilter.indexOf(cic.category_key) !== -1) {
            inCategory = true;
            break;
          }
        }
        if (!inCategory) continue;
      }

      filtered.push(item);
    }

    // Map to result entries with display helpers
    const withDisplay = [];
    for (let i = 0; i < filtered.length; i++) {
      const item = filtered[i];
      const branch = branches.find(b => b.branch_code === item.branch_code) || null;
      const availabilityDisplay = this._buildAvailabilityDisplay(item);
      const ratingDisplay = this._buildRatingDisplay(item);
      withDisplay.push({
        catalogItem: item,
        branchName: branch ? branch.name : '',
        formatLabel: this._formatLabelForFormat(item.format),
        materialTypeLabel: this._labelForMaterialType(item.material_type),
        availabilityDisplay: availabilityDisplay,
        ratingDisplay: ratingDisplay
      });
    }

    return withDisplay;
  }

  _buildAvailabilityDisplay(item) {
    if (!item) return '';
    const status = item.availability_status;
    if (status === 'available') return 'Available';
    if (status === 'all_copies_checked_out') {
      const next = this._formatDateDisplay(item.next_available_date);
      return next ? 'All copies checked out (next available ' + next + ')' : 'All copies checked out';
    }
    if (status === 'reference_only') return 'In-library use only';
    if (status === 'on_order') return 'On order';
    return '';
  }

  _buildRatingDisplay(item) {
    if (!item || item.average_rating == null) return 'No ratings';
    const avg = Number(item.average_rating) || 0;
    const count = Number(item.rating_count) || 0;
    return avg.toFixed(1) + ' (' + count + ' ratings)';
  }

  _formatLabelForFormat(format) {
    switch (format) {
      case 'paperback': return 'Paperback';
      case 'hardcover': return 'Hardcover';
      case 'ebook_online': return 'eBook / Online';
      case 'print_book': return 'Print book';
      case 'audio_cd': return 'Audio CD';
      case 'dvd': return 'DVD';
      default: return 'Other';
    }
  }

  _labelForMaterialType(mt) {
    switch (mt) {
      case 'book': return 'Book';
      case 'ebook': return 'eBook';
      case 'audiobook': return 'Audiobook';
      case 'video': return 'Video';
      default: return 'Other';
    }
  }

  // ----------------------
  // Loan helpers
  // ----------------------
  _computeLoanStatusDisplay(loan) {
    const now = new Date();
    const due = this._parseDate(loan.due_date);
    let statusDisplay = '';
    let isDueSoon = false;
    let canRenew = !!loan.can_renew && !loan.has_holds && loan.loan_status !== 'lost';

    if (!due) {
      statusDisplay = 'Unknown due date';
    } else {
      const msDiff = due.getTime() - now.getTime();
      const daysDiff = msDiff / (1000 * 60 * 60 * 24);
      if (loan.loan_status === 'overdue' || daysDiff < 0) {
        statusDisplay = 'Overdue (was due ' + this._formatDateDisplay(loan.due_date) + ')';
        isDueSoon = false;
      } else {
        statusDisplay = 'Due ' + this._formatDateDisplay(loan.due_date);
        if (daysDiff <= 3) {
          isDueSoon = true;
        }
      }
    }

    if (loan.has_holds) {
      canRenew = false;
    }

    return { statusDisplay: statusDisplay, isDueSoon: isDueSoon, canRenew: canRenew };
  }

  // ----------------------
  // Room availability helper
  // ----------------------
  _calculateRoomAvailabilityGrid(bookingCategoryKey, date, capacityMin, timeRange) {
    const rooms = this._getFromStorage('rooms').filter(r => r.booking_category_key === bookingCategoryKey && r.is_active);
    const reservations = this._getFromStorage('room_reservations');

    const resultSlots = [];
    if (rooms.length === 0) {
      return { date: date, bookingCategoryKey: bookingCategoryKey, timeSlots: [], earliestAvailableSlotStart: null };
    }

    const dayStr = date; // 'YYYY-MM-DD'
    const startTime = (timeRange && timeRange.startTime) || '08:00';
    const endTime = (timeRange && timeRange.endTime) || '20:00';

    function toMinutes(t) {
      const parts = t.split(':');
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    }

    const startMinutes = toMinutes(startTime);
    const endMinutes = toMinutes(endTime);
    const slotSize = 30; // 30 minutes

    let earliestAvailableSlotStart = null;

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      if (typeof capacityMin === 'number' && room.capacity < capacityMin) continue;

      for (let m = startMinutes; m < endMinutes; m += slotSize) {
        const slotStartMinutes = m;
        const slotEndMinutes = m + slotSize;
        const startH = String(Math.floor(slotStartMinutes / 60)).padStart(2, '0');
        const startM = String(slotStartMinutes % 60).padStart(2, '0');
        const endH = String(Math.floor(slotEndMinutes / 60)).padStart(2, '0');
        const endM = String(slotEndMinutes % 60).padStart(2, '0');
        const startIso = dayStr + 'T' + startH + ':' + startM + ':00.000Z';
        const endIso = dayStr + 'T' + endH + ':' + endM + ':00.000Z';

        let isAvailable = true;
        for (let j = 0; j < reservations.length; j++) {
          const res = reservations[j];
          if (res.room_id !== room.id || res.reservation_status !== 'active') continue;
          const resStart = this._parseDate(res.start_datetime);
          const resEnd = this._parseDate(res.end_datetime);
          const slotStartDate = this._parseDate(startIso);
          const slotEndDate = this._parseDate(endIso);
          if (!resStart || !resEnd || !slotStartDate || !slotEndDate) continue;
          if (slotStartDate < resEnd && slotEndDate > resStart) {
            isAvailable = false;
            break;
          }
        }

        if (isAvailable && !earliestAvailableSlotStart) {
          earliestAvailableSlotStart = startIso;
        }

        resultSlots.push({
          roomId: room.id,
          roomName: room.name,
          capacity: room.capacity,
          startDatetime: startIso,
          endDatetime: endIso,
          isAvailable: isAvailable,
          // Foreign key resolution as per requirement
          room: room
        });
      }
    }

    return {
      date: date,
      bookingCategoryKey: bookingCategoryKey,
      timeSlots: resultSlots,
      earliestAvailableSlotStart: earliestAvailableSlotStart
    };
  }

  // ----------------------
  // Citation helper
  // ----------------------
  _formatCitationsForList(list, catalogItems, citationStyle) {
    const citations = [];
    for (let i = 0; i < catalogItems.length; i++) {
      const item = catalogItems[i];
      if (!item) continue;
      let citation = '';
      const author = item.primary_author || (item.authors && item.authors[0]) || '';
      const year = item.publication_year ? String(item.publication_year) : 'n.d.';
      const title = item.title || '';

      if (citationStyle === 'mla') {
        citation = (author ? author + '. ' : '') + title + '. ' + year + '.';
      } else if (citationStyle === 'chicago') {
        citation = (author ? author + '. ' : '') + '"' + title + '." ' + year + '.';
      } else {
        // default APA
        citation = (author ? author + '. ' : '') + '(' + year + '). ' + title + '.';
      }

      citations.push({
        catalogItemId: item.id,
        formattedCitation: citation,
        // Foreign key resolution
        catalogItem: item
      });
    }
    return citations;
  }

  // ----------------------
  // PUBLIC INTERFACES
  // ----------------------

  // getHomepageContent()
  getHomepageContent() {
    const browseCategories = this._getFromStorage('browse_categories');

    const featuredCategories = browseCategories.map(bc => ({
      categoryKey: bc.category_key,
      name: bc.name,
      description: bc.description || ''
    }));

    const quickLinks = [
      { linkType: 'browse_childrens_books', label: 'Children\'s Books' },
      { linkType: 'browse_picture_books', label: 'Picture Books' },
      { linkType: 'browse_all_collections', label: 'All Collections' },
      { linkType: 'account_overview', label: 'My Account' },
      { linkType: 'room_booking', label: 'Rooms & Equipment' },
      { linkType: 'advanced_search', label: 'Advanced Search' },
      { linkType: 'suggest_purchase', label: 'Suggest a Purchase' }
    ];

    const popularSearches = [];

    return {
      featuredCategories: featuredCategories,
      quickLinks: quickLinks,
      popularSearches: popularSearches
    };
  }

  // searchCatalog(query, filters, sortBy, page, pageSize)
  searchCatalog(query, filters, sortBy, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 20;
    sortBy = sortBy || 'relevance';
    filters = filters || {};

    const allItems = this._getFromStorage('catalog_items');
    const filteredResults = this._applyCatalogSearchFilters(allItems, query, filters);

    // Sorting
    const results = filteredResults.slice();
    if (sortBy === 'next_available_date_asc') {
      results.sort((a, b) => {
        const da = this._parseDate(a.catalogItem.next_available_date);
        const db = this._parseDate(b.catalogItem.next_available_date);
        const va = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
        const vb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
        return va - vb;
      });
    } else if (sortBy === 'publication_year_asc' || sortBy === 'publication_year_desc') {
      results.sort((a, b) => {
        const va = a.catalogItem.publication_year || 0;
        const vb = b.catalogItem.publication_year || 0;
        return sortBy === 'publication_year_asc' ? va - vb : vb - va;
      });
    } else if (sortBy === 'rating_desc') {
      results.sort((a, b) => {
        const va = a.catalogItem.average_rating || 0;
        const vb = b.catalogItem.average_rating || 0;
        return vb - va;
      });
    } else if (sortBy === 'title_asc' || sortBy === 'title_desc') {
      results.sort((a, b) => {
        const va = (a.catalogItem.title || '').toLowerCase();
        const vb = (b.catalogItem.title || '').toLowerCase();
        if (va < vb) return sortBy === 'title_asc' ? -1 : 1;
        if (va > vb) return sortBy === 'title_asc' ? 1 : -1;
        return 0;
      });
    }
    // 'relevance' fallback: leave as is

    const totalResults = results.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const startIndex = (page - 1) * pageSize;
    const paged = results.slice(startIndex, startIndex + pageSize);

    const appliedFilters = {
      materialType: filters.materialType || null,
      formats: filters.formats || [],
      branchCode: filters.branchCode || null,
      isAvailable: typeof filters.isAvailable === 'boolean' ? filters.isAvailable : null,
      availabilityStatus: filters.availabilityStatus || null,
      maxPageCount: typeof filters.maxPageCount === 'number' ? filters.maxPageCount : null,
      publicationYearFrom: typeof filters.publicationYearFrom === 'number' ? filters.publicationYearFrom : null,
      publicationYearTo: typeof filters.publicationYearTo === 'number' ? filters.publicationYearTo : null,
      minRating: typeof filters.minRating === 'number' ? filters.minRating : null,
      language: filters.language || null,
      targetAgeMin: typeof filters.targetAgeMin === 'number' ? filters.targetAgeMin : null,
      targetAgeMax: typeof filters.targetAgeMax === 'number' ? filters.targetAgeMax : null,
      ageRangeLabel: filters.ageRangeLabel || null,
      categoryKey: filters.categoryKey || null
    };

    const availableSortOptions = [
      { key: 'relevance', label: 'Relevance', description: 'Best match to your search' },
      { key: 'next_available_date_asc', label: 'Next available date (Soonest first)', description: 'Titles available soonest' },
      { key: 'publication_year_desc', label: 'Publication year (Newest first)', description: 'Most recent first' },
      { key: 'publication_year_asc', label: 'Publication year (Oldest first)', description: 'Oldest first' },
      { key: 'rating_desc', label: 'Rating (Highest first)', description: 'Highest user ratings first' },
      { key: 'title_asc', label: 'Title (A–Z)', description: 'Alphabetical by title' },
      { key: 'title_desc', label: 'Title (Z–A)', description: 'Reverse alphabetical by title' }
    ];

    return {
      results: paged,
      totalResults: totalResults,
      page: page,
      pageSize: pageSize,
      totalPages: totalPages,
      appliedFilters: appliedFilters,
      availableSortOptions: availableSortOptions
    };
  }

  // getCatalogFilterOptions(context)
  getCatalogFilterOptions(context) {
    const branchOptions = this._getFromStorage('branches');

    const formatOptions = [
      { value: 'paperback', label: 'Paperback' },
      { value: 'hardcover', label: 'Hardcover' },
      { value: 'ebook_online', label: 'eBook / Online' },
      { value: 'print_book', label: 'Print book' },
      { value: 'audio_cd', label: 'Audio CD' },
      { value: 'dvd', label: 'DVD' },
      { value: 'other', label: 'Other' }
    ];

    const materialTypeOptions = [
      { value: 'book', label: 'Book' },
      { value: 'ebook', label: 'eBook' },
      { value: 'audiobook', label: 'Audiobook' },
      { value: 'video', label: 'Video' },
      { value: 'other', label: 'Other' }
    ];

    const languageOptions = [
      { value: 'english', label: 'English' },
      { value: 'spanish', label: 'Spanish' },
      { value: 'french', label: 'French' },
      { value: 'german', label: 'German' },
      { value: 'other', label: 'Other' }
    ];

    const availabilityStatusOptions = [
      { value: 'available', label: 'Available' },
      { value: 'all_copies_checked_out', label: 'All copies checked out' },
      { value: 'reference_only', label: 'In-library use only' },
      { value: 'on_order', label: 'On order' }
    ];

    const ratingThresholds = [
      { value: 3.0, label: '3.0+' },
      { value: 3.5, label: '3.5+' },
      { value: 4.0, label: '4.0+' },
      { value: 4.5, label: '4.5+' }
    ];

    // Age ranges could be derived from catalog_items but that may be large; use a few defaults
    const ageRanges = [
      { ageRangeLabel: 'Ages 0–3', targetAgeMin: 0, targetAgeMax: 3 },
      { ageRangeLabel: 'Ages 4–6', targetAgeMin: 4, targetAgeMax: 6 },
      { ageRangeLabel: 'Ages 7–9', targetAgeMin: 7, targetAgeMax: 9 },
      { ageRangeLabel: 'Ages 10–12', targetAgeMin: 10, targetAgeMax: 12 }
    ];

    return {
      formatOptions: formatOptions,
      materialTypeOptions: materialTypeOptions,
      languageOptions: languageOptions,
      branchOptions: branchOptions,
      availabilityStatusOptions: availabilityStatusOptions,
      ratingThresholds: ratingThresholds,
      ageRanges: ageRanges
    };
  }

  // getAdvancedSearchOptions()
  getAdvancedSearchOptions() {
    const currentYear = new Date().getFullYear();
    const branchOptions = this._getFromStorage('branches');

    const materialTypeOptions = [
      { value: 'book', label: 'Book' },
      { value: 'ebook', label: 'eBook' },
      { value: 'audiobook', label: 'Audiobook' },
      { value: 'video', label: 'Video' },
      { value: 'other', label: 'Other' }
    ];

    const formatOptions = [
      { value: 'paperback', label: 'Paperback' },
      { value: 'hardcover', label: 'Hardcover' },
      { value: 'ebook_online', label: 'eBook / Online' },
      { value: 'print_book', label: 'Print book' },
      { value: 'audio_cd', label: 'Audio CD' },
      { value: 'dvd', label: 'DVD' },
      { value: 'other', label: 'Other' }
    ];

    return {
      defaultPublicationYearRange: {
        from: currentYear - 10,
        to: currentYear
      },
      ratingRange: {
        min: 0,
        max: 5,
        step: 0.5
      },
      materialTypeOptions: materialTypeOptions,
      formatOptions: formatOptions,
      branchOptions: branchOptions
    };
  }

  // getCatalogItemDetails(catalogItemId)
  getCatalogItemDetails(catalogItemId) {
    const items = this._getFromStorage('catalog_items');
    const branches = this._getFromStorage('branches');
    const item = items.find(it => it.id === catalogItemId) || null;
    if (!item) {
      return {
        catalogItem: null,
        branch: null,
        availability: null,
        ratingSummary: null,
        canPlaceHold: false,
        canAddToList: false,
        canEditRecordAsStaff: false
      };
    }

    const branch = branches.find(b => b.branch_code === item.branch_code) || null;

    const availability = {
      status: item.availability_status,
      isAvailable: !!item.is_available,
      nextAvailableDateDisplay: this._formatDateDisplay(item.next_available_date),
      copiesTotal: item.copies_total || 0,
      copiesAvailable: item.copies_available || 0
    };

    const ratingSummary = {
      averageRating: item.average_rating || 0,
      ratingCount: item.rating_count || 0,
      ratingDisplay: this._buildRatingDisplay(item)
    };

    const userCtx = this._getOrCreateUserContext();

    return {
      catalogItem: item,
      branch: branch,
      availability: availability,
      ratingSummary: ratingSummary,
      canPlaceHold: item.availability_status !== 'reference_only',
      canAddToList: true,
      canEditRecordAsStaff: !!userCtx.isStaff
    };
  }

  // placeHoldOnCatalogItem(catalogItemId, pickupBranchCode)
  placeHoldOnCatalogItem(catalogItemId, pickupBranchCode) {
    const catalogItems = this._getFromStorage('catalog_items');
    const branches = this._getFromStorage('branches');
    const holds = this._getFromStorage('holds');

    const item = catalogItems.find(it => it.id === catalogItemId) || null;
    if (!item) {
      return { success: false, hold: null, message: 'Catalog item not found' };
    }

    const branch = branches.find(b => b.branch_code === pickupBranchCode) || null;
    if (!branch) {
      return { success: false, hold: null, message: 'Invalid pickup location' };
    }

    const existingActiveHolds = holds.filter(h => h.catalog_item_id === catalogItemId && h.hold_status === 'active');
    const position = existingActiveHolds.length + 1;

    const hold = {
      id: this._generateId('hold'),
      catalog_item_id: catalogItemId,
      hold_status: 'active',
      pickup_branch_code: pickupBranchCode,
      placed_at: this._nowIso(),
      position_in_queue: position,
      earliest_pickup_date: null,
      expiry_date: null
    };

    holds.push(hold);
    this._saveToStorage('holds', holds);

    return { success: true, hold: hold, message: 'Hold placed successfully' };
  }

  // getPickupLocations()
  getPickupLocations() {
    const branches = this._getFromStorage('branches');
    return branches.filter(b => b.is_pickup_location);
  }

  // createList(name, description, listType, defaultCitationStyle)
  createList(name, description, listType, defaultCitationStyle) {
    const lists = this._getFromStorage('lists');
    const now = this._nowIso();

    const list = {
      id: this._generateId('list'),
      name: name,
      description: description || '',
      list_type: listType,
      default_citation_style: defaultCitationStyle || null,
      created_at: now,
      updated_at: now
    };

    lists.push(list);
    this._saveToStorage('lists', lists);

    return { success: true, list: list, message: 'List created' };
  }

  // getMyListsSummary()
  getMyListsSummary() {
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');

    const summaries = [];
    for (let i = 0; i < lists.length; i++) {
      const list = lists[i];
      const count = listItems.filter(li => li.list_id === list.id).length;
      const lastUpdatedDisplay = this._formatDateDisplay(list.updated_at);
      summaries.push({
        list: list,
        itemCount: count,
        lastUpdatedDisplay: lastUpdatedDisplay
      });
    }
    return summaries;
  }

  // addCatalogItemToList(listId, catalogItemId, position)
  addCatalogItemToList(listId, catalogItemId, position) {
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');
    const catalogItems = this._getFromStorage('catalog_items');

    const list = lists.find(l => l.id === listId) || null;
    if (!list) {
      return { success: false, listItem: null, message: 'List not found' };
    }
    const item = catalogItems.find(ci => ci.id === catalogItemId) || null;
    if (!item) {
      return { success: false, listItem: null, message: 'Catalog item not found' };
    }

    let nextPosition = position;
    if (typeof nextPosition !== 'number') {
      const positions = listItems.filter(li => li.list_id === listId && typeof li.position === 'number').map(li => li.position);
      nextPosition = positions.length ? Math.max.apply(null, positions) + 1 : 1;
    }

    const now = this._nowIso();
    const listItem = {
      id: this._generateId('listitem'),
      list_id: listId,
      catalog_item_id: catalogItemId,
      position: nextPosition,
      added_at: now
    };

    listItems.push(listItem);
    this._saveToStorage('list_items', listItems);

    // Update list updated_at
    list.updated_at = now;
    this._saveToStorage('lists', lists);

    return { success: true, listItem: listItem, message: 'Item added to list' };
  }

  // getListDetail(listId)
  getListDetail(listId) {
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');
    const catalogItems = this._getFromStorage('catalog_items');

    const list = lists.find(l => l.id === listId) || null;
    if (!list) {
      return { list: null, items: [] };
    }

    const items = listItems
      .filter(li => li.list_id === listId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      })
      .map(li => {
        const ci = catalogItems.find(c => c.id === li.catalog_item_id) || null;
        return { listItem: li, catalogItem: ci };
      });

    return { list: list, items: items };
  }

  // removeListItem(listItemId)
  removeListItem(listItemId) {
    const listItems = this._getFromStorage('list_items');
    const idx = listItems.findIndex(li => li.id === listItemId);
    if (idx === -1) {
      return { success: false, message: 'List item not found' };
    }
    listItems.splice(idx, 1);
    this._saveToStorage('list_items', listItems);
    return { success: true, message: 'List item removed' };
  }

  // reorderListItems(listId, orderedListItemIds)
  reorderListItems(listId, orderedListItemIds) {
    const listItems = this._getFromStorage('list_items');
    const idToPos = {};
    for (let i = 0; i < orderedListItemIds.length; i++) {
      idToPos[orderedListItemIds[i]] = i + 1;
    }

    for (let i = 0; i < listItems.length; i++) {
      const li = listItems[i];
      if (li.list_id === listId && idToPos[li.id] != null) {
        li.position = idToPos[li.id];
      }
    }

    this._saveToStorage('list_items', listItems);
    return { success: true, message: 'List reordered' };
  }

  // renameList(listId, newName)
  renameList(listId, newName) {
    const lists = this._getFromStorage('lists');
    const list = lists.find(l => l.id === listId) || null;
    if (!list) {
      return { success: false, list: null, message: 'List not found' };
    }

    list.name = newName;
    list.updated_at = this._nowIso();
    this._saveToStorage('lists', lists);

    return { success: true, list: list, message: 'List renamed' };
  }

  // deleteList(listId)
  deleteList(listId) {
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');

    const idx = lists.findIndex(l => l.id === listId);
    if (idx === -1) {
      return { success: false, message: 'List not found' };
    }

    lists.splice(idx, 1);
    const remainingItems = listItems.filter(li => li.list_id !== listId);

    this._saveToStorage('lists', lists);
    this._saveToStorage('list_items', remainingItems);

    return { success: true, message: 'List deleted' };
  }

  // getListCitations(listId, citationStyle)
  getListCitations(listId, citationStyle) {
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');
    const catalogItems = this._getFromStorage('catalog_items');

    const list = lists.find(l => l.id === listId) || null;
    if (!list) {
      return { listId: listId, citationStyle: citationStyle || 'apa', citations: [] };
    }

    const style = citationStyle || list.default_citation_style || 'apa';
    const itemIds = listItems
      .filter(li => li.list_id === listId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
        const pb = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;
        return pa - pb;
      })
      .map(li => li.catalog_item_id);

    const items = [];
    for (let i = 0; i < itemIds.length; i++) {
      const ci = catalogItems.find(c => c.id === itemIds[i]) || null;
      if (ci) items.push(ci);
    }

    const citations = this._formatCitationsForList(list, items, style);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task9_citationViewOpened', JSON.stringify({
        listId: listId,
        citationStyle: style,
        openedAt: this._nowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      listId: listId,
      citationStyle: style,
      citations: citations
    };
  }

  // generateListCitationExport(listId, citationStyle, exportFormat)
  generateListCitationExport(listId, citationStyle, exportFormat) {
    const citationData = this.getListCitations(listId, citationStyle);
    const style = citationData.citationStyle;
    const citations = citationData.citations || [];

    let content = '';
    if (exportFormat === 'plain_text') {
      content = citations.map(c => c.formattedCitation).join('\n\n');
    } else if (exportFormat === 'bibtex') {
      const entries = [];
      for (let i = 0; i < citations.length; i++) {
        const c = citations[i];
        const item = c.catalogItem || {};
        const key = 'item' + (i + 1);
        const author = item.primary_author || (item.authors && item.authors[0]) || '';
        const year = item.publication_year || 'n.d.';
        const title = item.title || '';
        entries.push('@book{' + key + ',\n  author = {' + author + '},\n  title = {' + title + '},\n  year = {' + year + '}\n}');
      }
      content = entries.join('\n\n');
    } else if (exportFormat === 'ris') {
      const entries = [];
      for (let i = 0; i < citations.length; i++) {
        const c = citations[i];
        const item = c.catalogItem || {};
        const author = item.primary_author || (item.authors && item.authors[0]) || '';
        const year = item.publication_year || '';
        const title = item.title || '';
        const parts = [
          'TY  - BOOK',
          author ? 'AU  - ' + author : '',
          title ? 'TI  - ' + title : '',
          year ? 'PY  - ' + year : '',
          'ER  - '
        ].filter(Boolean);
        entries.push(parts.join('\n'));
      }
      content = entries.join('\n\n');
    } else {
      content = citations.map(c => c.formattedCitation).join('\n\n');
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task9_citationExportRequested', JSON.stringify({
        listId: listId,
        citationStyle: citationStyle || 'apa',
        exportFormat: exportFormat,
        requestedAt: this._nowIso()
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      exportFormat: exportFormat,
      content: content,
      message: 'Citation export generated in ' + style.toUpperCase() + ' style'
    };
  }

  // getAccountOverview()
  getAccountOverview() {
    const userCtx = this._getOrCreateUserContext();
    const loans = this._getFromStorage('loans');
    const holds = this._getFromStorage('holds');
    const fines = this._getFromStorage('fines');
    const lists = this._getFromStorage('lists');
    const reservations = this._getFromStorage('room_reservations');

    const now = new Date();

    const activeLoans = loans.filter(l => l.loan_status === 'active');
    const overdueLoans = loans.filter(l => l.loan_status === 'overdue');

    let nearestDueDate = null;
    for (let i = 0; i < loans.length; i++) {
      const l = loans[i];
      if (l.loan_status !== 'active' && l.loan_status !== 'overdue') continue;
      const due = this._parseDate(l.due_date);
      if (!due) continue;
      if (!nearestDueDate || due < nearestDueDate) nearestDueDate = due;
    }

    const activeHolds = holds.filter(h => h.hold_status === 'active');

    const unpaidFines = fines.filter(f => f.status === 'unpaid' || f.status === 'partially_paid');
    let totalOutstanding = 0;
    for (let i = 0; i < unpaidFines.length; i++) {
      totalOutstanding += Number(unpaidFines[i].outstanding_amount || 0);
    }

    const upcomingReservations = reservations.filter(r => {
      const start = this._parseDate(r.start_datetime);
      return r.reservation_status === 'active' && start && start >= now;
    });

    let nextReservationStart = null;
    for (let i = 0; i < upcomingReservations.length; i++) {
      const r = upcomingReservations[i];
      const d = this._parseDate(r.start_datetime);
      if (!d) continue;
      if (!nextReservationStart || d < nextReservationStart) nextReservationStart = d;
    }

    return {
      displayName: userCtx.displayName,
      loansSummary: {
        activeCount: activeLoans.length,
        overdueCount: overdueLoans.length,
        nearestDueDateDisplay: nearestDueDate ? this._formatDateDisplay(nearestDueDate.toISOString()) : ''
      },
      holdsSummary: {
        activeCount: activeHolds.length
      },
      finesSummary: {
        totalOutstandingAmount: totalOutstanding,
        unpaidFinesCount: unpaidFines.length
      },
      listsSummary: {
        totalLists: lists.length
      },
      roomReservationsSummary: {
        upcomingCount: upcomingReservations.length,
        nextReservationStartDisplay: nextReservationStart ? this._formatDateDisplay(nextReservationStart.toISOString()) : ''
      }
    };
  }

  // getMyLoans(sortBy, includeReturned)
  getMyLoans(sortBy, includeReturned) {
    sortBy = sortBy || 'due_date_soonest_first';
    includeReturned = !!includeReturned;

    const loans = this._getFromStorage('loans');
    const catalogItems = this._getFromStorage('catalog_items');

    let filtered = loans.filter(l => includeReturned || (l.loan_status === 'active' || l.loan_status === 'overdue'));

    if (sortBy === 'due_date_soonest_first' || sortBy === 'due_date_latest_first') {
      filtered = filtered.slice().sort((a, b) => {
        const da = this._parseDate(a.due_date);
        const db = this._parseDate(b.due_date);
        const va = da ? da.getTime() : 0;
        const vb = db ? db.getTime() : 0;
        return sortBy === 'due_date_soonest_first' ? va - vb : vb - va;
      });
    } else if (sortBy === 'title_asc') {
      filtered = filtered.slice().sort((a, b) => {
        const ia = catalogItems.find(ci => ci.id === a.catalog_item_id) || {};
        const ib = catalogItems.find(ci => ci.id === b.catalog_item_id) || {};
        const ta = (ia.title || '').toLowerCase();
        const tb = (ib.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      });
    } else if (sortBy === 'checkout_date_desc') {
      filtered = filtered.slice().sort((a, b) => {
        const da = this._parseDate(a.checkout_date);
        const db = this._parseDate(b.checkout_date);
        const va = db ? db.getTime() : 0;
        const vb = da ? da.getTime() : 0;
        return va - vb;
      });
    }

    const result = [];
    for (let i = 0; i < filtered.length; i++) {
      const loan = filtered[i];
      const catalogItem = catalogItems.find(ci => ci.id === loan.catalog_item_id) || null;
      const statusInfo = this._computeLoanStatusDisplay(loan);
      result.push({
        loan: loan,
        catalogItem: catalogItem,
        statusDisplay: statusInfo.statusDisplay,
        isDueSoon: statusInfo.isDueSoon,
        canRenew: statusInfo.canRenew
      });
    }

    return result;
  }

  // renewLoans(loanIds)
  renewLoans(loanIds) {
    const loans = this._getFromStorage('loans');
    const now = new Date();
    const results = [];

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task3_renewLoansSnapshot', JSON.stringify({
        snapshotTime: this._nowIso(),
        attemptedLoanIds: loanIds.slice(),
        renewedLoans: loanIds.map(id => {
          const loan = loans.find(l => l.id === id) || null;
          if (!loan) return null;
          return {
            loanId: id,
            dueDateBefore: loan.due_date || null,
            hasHoldsBefore: !!loan.has_holds,
            loanStatusBefore: loan.loan_status || null,
            canRenewBefore: !!loan.can_renew && !loan.has_holds && loan.loan_status !== 'lost'
          };
        }).filter(Boolean)
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    for (let i = 0; i < loanIds.length; i++) {
      const id = loanIds[i];
      const loan = loans.find(l => l.id === id) || null;
      if (!loan) {
        results.push({ loanId: id, success: false, message: 'Loan not found', updatedLoan: null });
        continue;
      }
      if (!loan.can_renew || loan.has_holds || loan.loan_status === 'lost') {
        results.push({ loanId: id, success: false, message: 'Loan not eligible for renewal', updatedLoan: loan });
        continue;
      }

      const due = this._parseDate(loan.due_date) || now;
      const renewedDue = new Date(due.getTime() + 14 * 24 * 60 * 60 * 1000); // +14 days
      loan.due_date = renewedDue.toISOString();
      loan.renewal_count = (loan.renewal_count || 0) + 1;
      if (loan.renewal_count >= 3) {
        loan.can_renew = false;
      }

      results.push({ loanId: id, success: true, message: 'Loan renewed', updatedLoan: loan });
    }

    this._saveToStorage('loans', loans);

    const overallSuccess = results.every(r => r.success);
    return { overallSuccess: overallSuccess, results: results };
  }

  // getMyFines(filters, sortBy)
  getMyFines(filters, sortBy) {
    filters = filters || {};
    sortBy = sortBy || 'amount_low_to_high';

    const fines = this._getFromStorage('fines');
    const loans = this._getFromStorage('loans');

    let filtered = fines.slice();

    if (filters.fineType) {
      filtered = filtered.filter(f => f.fine_type === filters.fineType);
    }
    if (filters.status) {
      filtered = filtered.filter(f => f.status === filters.status);
    }
    if (typeof filters.isOver30DaysOld === 'boolean') {
      filtered = filtered.filter(f => {
        // use stored hint if present; otherwise compute
        if (typeof f.is_over_30_days_old === 'boolean') {
          return f.is_over_30_days_old === filters.isOver30DaysOld;
        }
        const assessed = this._parseDate(f.assessed_date);
        if (!assessed) return !filters.isOver30DaysOld;
        const now = new Date();
        const diffDays = (now.getTime() - assessed.getTime()) / (1000 * 60 * 60 * 24);
        const isOld = diffDays > 30;
        return isOld === filters.isOver30DaysOld;
      });
    }

    if (sortBy === 'amount_low_to_high' || sortBy === 'amount_high_to_low') {
      filtered.sort((a, b) => {
        const va = Number(a.outstanding_amount || a.amount || 0);
        const vb = Number(b.outstanding_amount || b.amount || 0);
        return sortBy === 'amount_low_to_high' ? va - vb : vb - va;
      });
    } else if (sortBy === 'assessed_date_oldest_first' || sortBy === 'assessed_date_newest_first') {
      filtered.sort((a, b) => {
        const da = this._parseDate(a.assessed_date);
        const db = this._parseDate(b.assessed_date);
        const va = da ? da.getTime() : 0;
        const vb = db ? db.getTime() : 0;
        return sortBy === 'assessed_date_oldest_first' ? va - vb : vb - va;
      });
    }

    const result = [];
    const now = new Date();

    for (let i = 0; i < filtered.length; i++) {
      const fine = filtered[i];
      const relatedLoan = fine.related_loan_id ? loans.find(l => l.id === fine.related_loan_id) || null : null;
      const assessed = this._parseDate(fine.assessed_date);
      let isOver30DaysOld = false;
      if (assessed) {
        const diffDays = (now.getTime() - assessed.getTime()) / (1000 * 60 * 60 * 24);
        isOver30DaysOld = diffDays > 30;
      }
      const titleSnapshot = relatedLoan ? (relatedLoan.title_snapshot || '') : '';

      result.push({
        fine: fine,
        relatedLoan: relatedLoan,
        titleSnapshot: titleSnapshot,
        isOver30DaysOld: isOver30DaysOld
      });
    }

    return result;
  }

  // getFinePaymentDetails(fineId)
  getFinePaymentDetails(fineId) {
    const fines = this._getFromStorage('fines');
    const fine = fines.find(f => f.id === fineId) || null;
    if (!fine) {
      return { fine: null, outstandingAmount: 0, canPay: false, suggestedPaymentAmount: 0 };
    }

    const outstanding = Number(fine.outstanding_amount || 0);
    const canPay = (fine.status === 'unpaid' || fine.status === 'partially_paid') && outstanding > 0;

    return {
      fine: fine,
      outstandingAmount: outstanding,
      canPay: canPay,
      suggestedPaymentAmount: outstanding
    };
  }

  // getMyPaymentMethods()
  getMyPaymentMethods() {
    return this._getFromStorage('payment_methods');
  }

  // payFine(fineId, paymentMethodId, amount)
  payFine(fineId, paymentMethodId, amount) {
    const fines = this._getFromStorage('fines');
    const paymentMethods = this._getFromStorage('payment_methods');
    const finePayments = this._getFromStorage('fine_payments');

    const fine = fines.find(f => f.id === fineId) || null;
    if (!fine) {
      return { success: false, finePayment: null, updatedFine: null, message: 'Fine not found' };
    }

    const pm = paymentMethods.find(p => p.id === paymentMethodId) || null;
    if (!pm) {
      return { success: false, finePayment: null, updatedFine: fine, message: 'Payment method not found' };
    }

    const outstanding = Number(fine.outstanding_amount || 0);
    const payAmount = Math.min(Number(amount || 0), outstanding);
    if (payAmount <= 0) {
      return { success: false, finePayment: null, updatedFine: fine, message: 'Invalid payment amount' };
    }

    fine.outstanding_amount = outstanding - payAmount;
    if (fine.outstanding_amount <= 0) {
      fine.outstanding_amount = 0;
      fine.status = 'paid';
    } else {
      fine.status = 'partially_paid';
    }
    fine.last_updated_at = this._nowIso();

    const finePayment = {
      id: this._generateId('finepay'),
      fine_id: fineId,
      payment_method_id: paymentMethodId,
      amount: payAmount,
      payment_status: 'success',
      processed_at: this._nowIso(),
      receipt_number: 'R' + this._getNextIdCounter()
    };

    finePayments.push(finePayment);
    this._saveToStorage('fine_payments', finePayments);
    this._saveToStorage('fines', fines);

    return { success: true, finePayment: finePayment, updatedFine: fine, message: 'Payment successful' };
  }

  // getRoomBookingCategories()
  getRoomBookingCategories() {
    const rooms = this._getFromStorage('rooms');
    const branches = this._getFromStorage('branches');

    const categoriesMap = {};

    for (let i = 0; i < rooms.length; i++) {
      const room = rooms[i];
      if (!room.is_active) continue;
      const key = room.booking_category_key;
      if (!categoriesMap[key]) {
        const branch = branches.find(b => b.branch_code === room.branch_code) || null;
        categoriesMap[key] = {
          bookingCategoryKey: key,
          name: key === 'study_rooms_central_branch' ? 'Study Rooms - Central Branch' : key,
          description: 'Rooms available for booking',
          branch: branch
        };
      }
    }

    return Object.keys(categoriesMap).map(k => categoriesMap[k]);
  }

  // getRoomAvailability(bookingCategoryKey, date, capacityMin, timeRange)
  getRoomAvailability(bookingCategoryKey, date, capacityMin, timeRange) {
    return this._calculateRoomAvailabilityGrid(bookingCategoryKey, date, capacityMin, timeRange || null);
  }

  // createRoomReservation(roomId, startDatetime, durationMinutes, purpose)
  createRoomReservation(roomId, startDatetime, durationMinutes, purpose) {
    const rooms = this._getFromStorage('rooms');
    const reservations = this._getFromStorage('room_reservations');

    const room = rooms.find(r => r.id === roomId && r.is_active) || null;
    if (!room) {
      return { success: false, reservation: null, message: 'Room not found or inactive' };
    }

    const start = this._parseDate(startDatetime);
    if (!start) {
      return { success: false, reservation: null, message: 'Invalid start datetime' };
    }

    const end = new Date(start.getTime() + Number(durationMinutes || 0) * 60 * 1000);
    if (end <= start) {
      return { success: false, reservation: null, message: 'Invalid duration' };
    }

    for (let i = 0; i < reservations.length; i++) {
      const res = reservations[i];
      if (res.room_id !== roomId || res.reservation_status !== 'active') continue;
      const rs = this._parseDate(res.start_datetime);
      const re = this._parseDate(res.end_datetime);
      if (!rs || !re) continue;
      if (start < re && end > rs) {
        return { success: false, reservation: null, message: 'Conflicting reservation exists' };
      }
    }

    const reservation = {
      id: this._generateId('res'),
      room_id: roomId,
      reservation_status: 'active',
      start_datetime: start.toISOString(),
      end_datetime: end.toISOString(),
      duration_minutes: durationMinutes,
      purpose: purpose || '',
      created_at: this._nowIso()
    };

    reservations.push(reservation);
    this._saveToStorage('room_reservations', reservations);

    return { success: true, reservation: reservation, message: 'Reservation created' };
  }

  // getMyRoomReservations(includePast)
  getMyRoomReservations(includePast) {
    includePast = !!includePast;

    const reservations = this._getFromStorage('room_reservations');
    const rooms = this._getFromStorage('rooms');
    const branches = this._getFromStorage('branches');
    const now = new Date();

    const result = [];
    for (let i = 0; i < reservations.length; i++) {
      const res = reservations[i];
      const end = this._parseDate(res.end_datetime);
      if (!includePast && end && end < now) continue;

      const room = rooms.find(r => r.id === res.room_id) || null;
      const branch = room ? (branches.find(b => b.branch_code === room.branch_code) || null) : null;

      let statusDisplay = '';
      if (res.reservation_status === 'cancelled') {
        statusDisplay = 'Cancelled';
      } else if (end && end < now) {
        statusDisplay = 'Completed';
      } else {
        statusDisplay = 'Upcoming';
      }

      result.push({
        reservation: res,
        room: room,
        branch: branch,
        statusDisplay: statusDisplay
      });
    }

    return result;
  }

  // cancelRoomReservation(reservationId)
  cancelRoomReservation(reservationId) {
    const reservations = this._getFromStorage('room_reservations');
    const res = reservations.find(r => r.id === reservationId) || null;
    if (!res) {
      return { success: false, updatedReservation: null, message: 'Reservation not found' };
    }

    res.reservation_status = 'cancelled';
    this._saveToStorage('room_reservations', reservations);

    return { success: true, updatedReservation: res, message: 'Reservation cancelled' };
  }

  // getBrowseCategories()
  getBrowseCategories() {
    return this._getFromStorage('browse_categories');
  }

  // getBrowseCategoryItems(categoryKey, filters, sortBy, page, pageSize)
  getBrowseCategoryItems(categoryKey, filters, sortBy, page, pageSize) {
    filters = filters || {};
    sortBy = sortBy || 'title_asc';
    page = page || 1;
    pageSize = pageSize || 20;

    const browseCategories = this._getFromStorage('browse_categories');
    const catalogItemCategories = this._getFromStorage('catalog_item_categories');
    const catalogItems = this._getFromStorage('catalog_items');

    const category = browseCategories.find(c => c.category_key === categoryKey) || null;

    // include hierarchical children
    const categoryKeys = [categoryKey];
    for (let i = 0; i < browseCategories.length; i++) {
      const bc = browseCategories[i];
      if (bc.parent_category_key === categoryKey && categoryKeys.indexOf(bc.category_key) === -1) {
        categoryKeys.push(bc.category_key);
      }
    }

    const itemIdsSet = {};
    for (let i = 0; i < catalogItemCategories.length; i++) {
      const cic = catalogItemCategories[i];
      if (categoryKeys.indexOf(cic.category_key) !== -1) {
        itemIdsSet[cic.catalog_item_id] = true;
      }
    }

    const selectedItems = [];
    for (let i = 0; i < catalogItems.length; i++) {
      const item = catalogItems[i];
      if (!itemIdsSet[item.id]) continue;

      if (filters.language && item.language && item.language !== filters.language) continue;
      if (filters.ageRangeLabel && item.age_range_label && item.age_range_label !== filters.ageRangeLabel) continue;
      if (typeof filters.publicationYearFrom === 'number' && item.publication_year != null) {
        if (item.publication_year < filters.publicationYearFrom) continue;
      }
      if (filters.branchCode && item.branch_code && item.branch_code !== filters.branchCode) continue;
      if (typeof filters.isAvailable === 'boolean') {
        if (!!item.is_available !== filters.isAvailable) continue;
      }

      selectedItems.push(item);
    }

    if (sortBy === 'title_asc' || sortBy === 'title_desc') {
      selectedItems.sort((a, b) => {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta < tb) return sortBy === 'title_asc' ? -1 : 1;
        if (ta > tb) return sortBy === 'title_asc' ? 1 : -1;
        return 0;
      });
    } else if (sortBy === 'publication_year_desc') {
      selectedItems.sort((a, b) => {
        const va = a.publication_year || 0;
        const vb = b.publication_year || 0;
        return vb - va;
      });
    } else if (sortBy === 'rating_desc') {
      selectedItems.sort((a, b) => {
        const va = a.average_rating || 0;
        const vb = b.average_rating || 0;
        return vb - va;
      });
    }

    const totalResults = selectedItems.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
    const startIndex = (page - 1) * pageSize;
    const pageItems = selectedItems.slice(startIndex, startIndex + pageSize);

    return {
      category: category,
      results: pageItems,
      totalResults: totalResults,
      page: page,
      pageSize: pageSize,
      totalPages: totalPages
    };
  }

  // getPurchaseSuggestionFormOptions()
  getPurchaseSuggestionFormOptions() {
    const branches = this._getFromStorage('branches');

    const formatOptions = [
      { value: 'print_book', label: 'Print book' },
      { value: 'ebook_online', label: 'eBook / Online' },
      { value: 'audio_cd', label: 'Audio CD' },
      { value: 'dvd', label: 'DVD' },
      { value: 'other', label: 'Other' }
    ];

    const pickupLocations = branches.filter(b => b.is_pickup_location);

    const reasonSuggestions = [
      'Book club selection',
      'Course or class requirement',
      'Research project',
      'Community interest',
      'Other'
    ];

    return {
      formatOptions: formatOptions,
      pickupLocations: pickupLocations,
      reasonSuggestions: reasonSuggestions
    };
  }

  // submitPurchaseSuggestion(title, author, publicationYear, format, isbn, preferredPickupBranchCode, reason)
  submitPurchaseSuggestion(title, author, publicationYear, format, isbn, preferredPickupBranchCode, reason) {
    const suggestions = this._getFromStorage('purchase_suggestions');
    const now = this._nowIso();

    const suggestion = {
      id: this._generateId('ps'),
      title: title,
      author: author || '',
      publication_year: typeof publicationYear === 'number' ? publicationYear : null,
      format: format,
      isbn: isbn || '',
      preferred_pickup_branch_code: preferredPickupBranchCode || null,
      reason: reason || '',
      status: 'submitted',
      submitted_at: now,
      updated_at: now
    };

    suggestions.push(suggestion);
    this._saveToStorage('purchase_suggestions', suggestions);

    return { success: true, suggestion: suggestion, message: 'Purchase suggestion submitted' };
  }

  // staffSignIn(username, password)
  staffSignIn(username, password) {
    // Simple check per requirements example
    if (username === 'staff1' && password === 'Password123') {
      const session = {
        username: username,
        isStaff: true,
        displayName: 'Staff 1'
      };
      this._setStaffSession(session);
      return { success: true, isStaff: true, displayName: 'Staff 1', message: 'Signed in as staff' };
    }

    // Clear any existing session on failed login
    this._setStaffSession({ username: '', isStaff: false, displayName: 'Guest' });
    return { success: false, isStaff: false, displayName: '', message: 'Invalid staff credentials' };
  }

  // getStaffDashboardSummary()
  getStaffDashboardSummary() {
    const session = this._checkStaffPermissions();
    const catalogItems = this._getFromStorage('catalog_items');

    const recent = catalogItems
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.updated_at || a.created_at);
        const db = this._parseDate(b.updated_at || b.created_at);
        const va = da ? da.getTime() : 0;
        const vb = db ? db.getTime() : 0;
        return vb - va;
      })
      .slice(0, 10)
      .map(ci => ({
        catalogItemId: ci.id,
        title: ci.title || '',
        updatedAt: (ci.updated_at || ci.created_at || ''),
        updatedBy: session.username,
        // Foreign key resolution as per requirement
        catalogItem: ci
      }));

    return {
      staffDisplayName: session.displayName,
      recentCatalogUpdates: recent,
      totalCatalogItems: catalogItems.length
    };
  }

  // getStaffCatalogItemForEdit(catalogItemId)
  getStaffCatalogItemForEdit(catalogItemId) {
    this._checkStaffPermissions();
    const catalogItems = this._getFromStorage('catalog_items');
    const item = catalogItems.find(ci => ci.id === catalogItemId) || null;

    const collectionLocationOptions = [
      { value: 'general_stacks', label: 'General Stacks' },
      { value: 'reference_2nd_floor', label: 'Reference - 2nd Floor' },
      { value: 'childrens_section', label: "Children's Section" },
      { value: 'picture_books', label: 'Picture Books' },
      { value: 'other', label: 'Other' }
    ];

    // Build subject and tag suggestions from existing items
    const subjectSet = {};
    const tagSet = {};
    for (let i = 0; i < catalogItems.length; i++) {
      const ci = catalogItems[i];
      (ci.subjects || []).forEach(s => { subjectSet[s] = true; });
      (ci.tags || []).forEach(t => { tagSet[t] = true; });
    }

    const subjectSuggestions = Object.keys(subjectSet);
    const tagSuggestions = Object.keys(tagSet);

    return {
      catalogItem: item,
      collectionLocationOptions: collectionLocationOptions,
      subjectSuggestions: subjectSuggestions,
      tagSuggestions: tagSuggestions
    };
  }

  // updateCatalogItemRecord(catalogItemId, updates)
  updateCatalogItemRecord(catalogItemId, updates) {
    this._checkStaffPermissions();
    updates = updates || {};

    const catalogItems = this._getFromStorage('catalog_items');
    const item = catalogItems.find(ci => ci.id === catalogItemId) || null;
    if (!item) {
      return { success: false, catalogItem: null, message: 'Catalog item not found' };
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'title')) {
      item.title = updates.title;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'primaryAuthor')) {
      item.primary_author = updates.primaryAuthor;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'publicationYear')) {
      item.publication_year = updates.publicationYear;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'collectionLocation')) {
      item.collection_location = updates.collectionLocation;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'subjects')) {
      item.subjects = updates.subjects || [];
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'tags')) {
      item.tags = updates.tags || [];
    }

    item.updated_at = this._nowIso();

    this._saveToStorage('catalog_items', catalogItems);

    return { success: true, catalogItem: item, message: 'Catalog item updated' };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const branches = this._getFromStorage('branches');

    const branchesInfo = branches.map(b => ({
      branch: b,
      hours: 'See branch website for hours',
      directionsText: 'See map for directions'
    }));

    const libraryDescription = 'This library system manages catalog search, user accounts, room reservations, and more.';
    const borrowingPolicies = 'Borrowing policies vary by material. Loans typically last 21 days with possible renewals.';
    const finesPolicies = 'Overdue, lost, and damaged items may incur fines as defined by the library.';
    const roomBookingPolicies = 'Study rooms can be reserved for limited durations and are subject to availability.';

    const helpTopics = [
      { id: 'search_catalog', title: 'Searching the Catalog', contentSummary: 'Learn how to search and filter catalog items.' },
      { id: 'managing_loans', title: 'Managing Your Loans', contentSummary: 'View, renew, and understand your checked-out items.' },
      { id: 'room_bookings', title: 'Booking Study Rooms', contentSummary: 'Reserve study rooms at participating branches.' }
    ];

    return {
      libraryDescription: libraryDescription,
      branchesInfo: branchesInfo,
      borrowingPolicies: borrowingPolicies,
      finesPolicies: finesPolicies,
      roomBookingPolicies: roomBookingPolicies,
      helpTopics: helpTopics
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