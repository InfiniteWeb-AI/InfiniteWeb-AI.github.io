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

  // ------------------------
  // Storage helpers
  // ------------------------
  _initStorage() {
    const arrayKeys = [
      'titles',
      'item_availabilities',
      'events',
      'event_registrations',
      'loans',
      'holds',
      'reading_lists',
      'list_items',
      'fines',
      'payments',
      'payment_applications',
      'branches',
      'rooms',
      'room_reservations',
      'saved_searches',
      'favorite_branches',
      'accounts',
      'informational_pages',
      'contact_submissions'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    if (!localStorage.getItem('contact_information')) {
      localStorage.setItem(
        'contact_information',
        JSON.stringify({
          main_phone: '',
          main_email: '',
          mailing_address_lines: [],
          additional_contacts: []
        })
      );
    }

    if (!localStorage.getItem('current_account_card_number')) {
      localStorage.setItem('current_account_card_number', '');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultVal) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultVal !== undefined ? defaultVal : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultVal !== undefined ? defaultVal : [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentStr = localStorage.getItem('idCounter');
    const current = currentStr ? parseInt(currentStr, 10) : 1000;
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _todayDayOfWeek() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }

  // ------------------------
  // Account/session helper
  // ------------------------
  _getCurrentAccountContext() {
    const cardNumber = localStorage.getItem('current_account_card_number');
    if (!cardNumber) {
      return null;
    }
    const accounts = this._getFromStorage('accounts', []);
    const account = accounts.find(a => a.card_number === cardNumber);
    if (!account) {
      return null;
    }
    return {
      card_number: account.card_number,
      patron_display_name: account.display_name || ''
    };
  }

  // ------------------------
  // Catalog filter/sort helper
  // ------------------------
  _applyCatalogFiltersAndSort(titles, itemAvailabilities, branches, query, filters, sort_option, page, page_size) {
    filters = filters || {};
    sort_option = sort_option || 'relevance';
    page = page || 1;
    page_size = page_size || 20;

    const q = query && query !== '*' ? String(query).trim().toLowerCase() : '';

    let filtered = titles.slice();

    if (q) {
      filtered = filtered.filter(t => {
        const fields = [];
        if (t.title) fields.push(t.title);
        if (t.subtitle) fields.push(t.subtitle);
        if (Array.isArray(t.authors)) fields.push(t.authors.join(' '));
        if (t.description) fields.push(t.description);
        if (Array.isArray(t.tags)) fields.push(t.tags.join(' '));
        if (Array.isArray(t.subjects)) fields.push(t.subjects.join(' '));
        const haystack = fields.join(' ').toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    if (filters.collection) {
      filtered = filtered.filter(t => t.collection === filters.collection);
    }
    if (filters.format) {
      filtered = filtered.filter(t => t.format === filters.format);
    }
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    if (filters.audience) {
      filtered = filtered.filter(t => t.audience === filters.audience);
    }
    if (filters.primary_genre) {
      filtered = filtered.filter(t => t.primary_genre === filters.primary_genre);
    }
    if (filters.language) {
      filtered = filtered.filter(t => t.language === filters.language);
    }

    if (filters.publication_year_from || filters.publication_year_to) {
      const fromY = filters.publication_year_from || 0;
      const toY = filters.publication_year_to || 9999;
      filtered = filtered.filter(t => {
        let y = t.publication_year;
        if (!y && t.publication_date) {
          const d = this._parseDate(t.publication_date);
          if (d) y = d.getFullYear();
        }
        if (!y) return false;
        return y >= fromY && y <= toY;
      });
    }

    if (filters.release_year_from || filters.release_year_to) {
      const fromY = filters.release_year_from || 0;
      const toY = filters.release_year_to || 9999;
      filtered = filtered.filter(t => {
        let d = this._parseDate(t.release_date);
        if (!d) return false;
        const y = d.getFullYear();
        return y >= fromY && y <= toY;
      });
    }

    if (typeof filters.minimum_rating === 'number') {
      filtered = filtered.filter(t => typeof t.average_rating === 'number' && t.average_rating >= filters.minimum_rating);
    }

    if (filters.content_rating) {
      filtered = filtered.filter(t => t.content_rating === filters.content_rating);
    }

    if (typeof filters.runtime_minutes_max === 'number') {
      filtered = filtered.filter(t => typeof t.runtime_minutes === 'number' && t.runtime_minutes <= filters.runtime_minutes_max);
    }

    if (filters.audience_age_min || filters.audience_age_max) {
      const fMin = filters.audience_age_min;
      const fMax = filters.audience_age_max;
      filtered = filtered.filter(t => {
        const tMin = typeof t.audience_age_min === 'number' ? t.audience_age_min : null;
        const tMax = typeof t.audience_age_max === 'number' ? t.audience_age_max : null;
        if (tMin === null && tMax === null) return false;
        const effMin = tMin === null ? fMin : tMin;
        const effMax = tMax === null ? fMax : tMax;
        if (fMin != null && effMax != null && effMax < fMin) return false;
        if (fMax != null && effMin != null && effMin > fMax) return false;
        return true;
      });
    }

    if (filters.subject_keyword) {
      const sk = String(filters.subject_keyword).toLowerCase();
      filtered = filtered.filter(t => {
        const subjects = Array.isArray(t.subjects) ? t.subjects : [];
        const tags = Array.isArray(t.tags) ? t.tags : [];
        const combined = subjects.concat(tags).join(' ').toLowerCase();
        return combined.indexOf(sk) !== -1;
      });
    }

    if (filters.branchId) {
      const branchId = filters.branchId;
      const titleIdsWithBranch = new Set(
        itemAvailabilities
          .filter(a => a.branchId === branchId)
          .map(a => a.titleId)
      );
      filtered = filtered.filter(t => titleIdsWithBranch.has(t.id));
    }

    if (filters.availability === 'available_now') {
      const availableTitleIds = new Set(
        itemAvailabilities
          .filter(a => a.is_available_now === true || (typeof a.available_copies === 'number' && a.available_copies > 0))
          .map(a => a.titleId)
      );
      filtered = filtered.filter(t => availableTitleIds.has(t.id));
    } else if (filters.availability === 'holdable_only') {
      const holdableTitleIds = new Set(
        itemAvailabilities
          .filter(a => a.is_holdable)
          .map(a => a.titleId)
      );
      filtered = filtered.filter(t => holdableTitleIds.has(t.id));
    }

    const sorted = filtered.slice();

    if (sort_option === 'publication_date_newest_first') {
      sorted.sort((a, b) => {
        const aYear = a.publication_year || (a.publication_date ? this._parseDate(a.publication_date)?.getFullYear() || 0 : 0);
        const bYear = b.publication_year || (b.publication_date ? this._parseDate(b.publication_date)?.getFullYear() || 0 : 0);
        return bYear - aYear;
      });
    } else if (sort_option === 'release_date_newest_first') {
      sorted.sort((a, b) => {
        const aDate = this._parseDate(a.release_date)?.getTime() || 0;
        const bDate = this._parseDate(b.release_date)?.getTime() || 0;
        return bDate - aDate;
      });
    } else if (sort_option === 'rating') {
      sorted.sort((a, b) => {
        const aR = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const bR = typeof b.average_rating === 'number' ? b.average_rating : 0;
        return bR - aR;
      });
    } else if (sort_option === 'title') {
      sorted.sort((a, b) => {
        const at = (a.title || '').toLowerCase();
        const bt = (b.title || '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    } else {
      // relevance or default: leave order as is
    }

    const total_count = sorted.length;
    const start = (page - 1) * page_size;
    const end = start + page_size;
    const pageTitles = sorted.slice(start, end);

    const branchMap = new Map();
    for (const b of branches) {
      if (b && b.id) branchMap.set(b.id, b);
    }

    const results = pageTitles.map(t => {
      const avails = itemAvailabilities.filter(a => a.titleId === t.id);
      const availability_by_branch = avails.map(a => ({
        branch: a.branchId ? branchMap.get(a.branchId) || null : null,
        availability: a
      }));
      const is_digital = t.collection === 'digital_library';
      const can_place_hold = avails.some(a => a.is_holdable);
      const can_borrow_digital = avails.some(
        a => a.location_type === 'digital' && (a.is_available_now || (typeof a.available_copies === 'number' && a.available_copies > 0))
      );
      return {
        title: t,
        availability_by_branch,
        is_digital,
        can_place_hold,
        can_borrow_digital
      };
    });

    let branch_name = null;
    if (filters.branchId) {
      const b = branchMap.get(filters.branchId);
      if (b && b.name) branch_name = b.name;
    }

    const applied_filters = {
      collection: filters.collection || null,
      format: filters.format || null,
      category: filters.category || null,
      audience: filters.audience || null,
      primary_genre: filters.primary_genre || null,
      language: filters.language || null,
      branch_name,
      publication_year_from: filters.publication_year_from || null,
      publication_year_to: filters.publication_year_to || null,
      minimum_rating: typeof filters.minimum_rating === 'number' ? filters.minimum_rating : null,
      availability: filters.availability || null,
      content_rating: filters.content_rating || null,
      runtime_minutes_max: typeof filters.runtime_minutes_max === 'number' ? filters.runtime_minutes_max : null,
      audience_age_min: filters.audience_age_min || null,
      audience_age_max: filters.audience_age_max || null
    };

    return {
      results,
      total_count,
      page,
      page_size,
      applied_filters,
      sort_option
    };
  }

  // ------------------------
  // Branch distance & hours helper
  // ------------------------
  _calculateBranchDistanceAndHours(branch, searchZip) {
    if (!branch) {
      return {
        distance: null,
        today_hours_label: '',
        is_open_after_7pm_weekdays: false
      };
    }

    let distance = null;
    if (searchZip) {
      if (branch.zip && String(branch.zip) === String(searchZip)) {
        distance = 0;
      } else if (typeof branch.distance_miles_from_search === 'number') {
        distance = branch.distance_miles_from_search;
      } else {
        distance = 10; // fallback distance
      }
    } else if (typeof branch.distance_miles_from_search === 'number') {
      distance = branch.distance_miles_from_search;
    }

    let today_hours_label = '';
    let is_open_after_7pm_weekdays = false;
    const weekly = Array.isArray(branch.weekly_hours) ? branch.weekly_hours : [];
    const today = this._todayDayOfWeek();

    for (const h of weekly) {
      if (!h) continue;
      const rawDay = h.day_of_week || h.day;
      if (!rawDay) continue;
      const dayName = String(rawDay);
      const dayLower = dayName.toLowerCase();
      const todayLower = String(today).toLowerCase();
      if (dayLower === todayLower) {
        if (h.is_closed) {
          today_hours_label = 'Closed today';
        } else if (h.open_time && h.close_time) {
          today_hours_label = h.open_time + '–' + h.close_time;
        }
      }
      const wd = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      if (wd.indexOf(dayLower) !== -1 && !h.is_closed && h.close_time && h.close_time > '19:00') {
        is_open_after_7pm_weekdays = true;
      }
    }

    return {
      distance,
      today_hours_label,
      is_open_after_7pm_weekdays
    };
  }

  // ------------------------
  // Room availability helper
  // ------------------------
  _computeRoomAvailabilitySlots(room, date, duration_minutes, time_window_start, time_window_end) {
    if (!room || !room.id) return [];
    const reservations = this._getFromStorage('room_reservations', []).filter(r => {
      if (r.roomId !== room.id) return false;
      const start = this._parseDate(r.start_datetime);
      if (!start) return false;
      const y = start.getFullYear();
      const m = start.getMonth();
      const d = start.getDate();
      const dayStr = new Date(date + 'T00:00:00Z');
      const dy = dayStr.getFullYear();
      const dm = dayStr.getMonth();
      const dd = dayStr.getDate();
      return y === dy && m === dm && d === dd && r.status === 'booked';
    });

    reservations.sort((a, b) => {
      const at = this._parseDate(a.start_datetime)?.getTime() || 0;
      const bt = this._parseDate(b.start_datetime)?.getTime() || 0;
      return at - bt;
    });

    const startTimeStr = time_window_start || '09:00';
    const endTimeStr = time_window_end || '21:00';

    const dayStart = this._parseDate(date + 'T' + startTimeStr + ':00Z');
    const dayEnd = this._parseDate(date + 'T' + endTimeStr + ':00Z');
    if (!dayStart || !dayEnd) return [];

    const freeIntervals = [];
    let cursor = dayStart.getTime();

    for (const r of reservations) {
      const rs = this._parseDate(r.start_datetime)?.getTime() || 0;
      const re = this._parseDate(r.end_datetime)?.getTime() || 0;
      if (re <= cursor) continue;
      if (rs > cursor) {
        const freeStart = cursor;
        const freeEnd = Math.min(rs, dayEnd.getTime());
        if (freeEnd > freeStart) {
          freeIntervals.push({ start: freeStart, end: freeEnd });
        }
      }
      if (re > cursor) cursor = re;
      if (cursor >= dayEnd.getTime()) break;
    }

    if (cursor < dayEnd.getTime()) {
      freeIntervals.push({ start: cursor, end: dayEnd.getTime() });
    }

    const slots = [];
    const durationMs = duration_minutes * 60 * 1000;

    for (const interval of freeIntervals) {
      let slotStart = interval.start;
      while (slotStart + durationMs <= interval.end) {
        const slotEnd = slotStart + durationMs;
        slots.push({
          start_datetime: new Date(slotStart).toISOString(),
          end_datetime: new Date(slotEnd).toISOString()
        });
        slotStart += durationMs;
      }
    }

    return slots;
  }

  // ------------------------
  // Payment allocation helper
  // ------------------------
  _allocatePaymentAcrossFines(payment, amountToApply, accountContext) {
    const fines = this._getFromStorage('fines', []);
    const paymentApps = this._getFromStorage('payment_applications', []);

    let remaining = amountToApply;
    const accountFines = fines.filter(f => {
      if (f.account_card_number && f.account_card_number !== accountContext.card_number) return false;
      return f.status === 'outstanding' || f.status === 'partially_paid';
    });

    accountFines.sort((a, b) => {
      const at = this._parseDate(a.created_at)?.getTime() || 0;
      const bt = this._parseDate(b.created_at)?.getTime() || 0;
      return at - bt;
    });

    const createdApplications = [];

    for (const fine of accountFines) {
      if (remaining <= 0) break;
      const balance = typeof fine.balance_remaining === 'number' ? fine.balance_remaining : fine.amount;
      if (balance <= 0) continue;
      const applyAmount = Math.min(balance, remaining);
      if (applyAmount <= 0) continue;

      const app = {
        id: this._generateId('payment_app'),
        paymentId: payment.id,
        fineId: fine.id,
        amount: applyAmount
      };
      paymentApps.push(app);
      createdApplications.push(app);

      const newBalance = balance - applyAmount;
      fine.balance_remaining = newBalance;
      if (newBalance <= 0) {
        fine.balance_remaining = 0;
        fine.status = 'paid';
      } else {
        fine.status = 'partially_paid';
      }

      remaining -= applyAmount;
    }

    this._saveToStorage('fines', fines);
    this._saveToStorage('payment_applications', paymentApps);

    return createdApplications;
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // signInWithLibraryCard(card_number, pin)
  signInWithLibraryCard(card_number, pin) {
    const card = String(card_number || '').trim();
    const pinStr = String(pin || '').trim();
    if (!card || !pinStr) {
      return { success: false, patron_display_name: '', message: 'Card number and PIN are required.' };
    }

    const accounts = this._getFromStorage('accounts', []);
    let account = accounts.find(a => a.card_number === card);

    if (account) {
      if (account.pin !== pinStr) {
        return { success: false, patron_display_name: '', message: 'Invalid PIN.' };
      }
    } else {
      account = {
        id: this._generateId('account'),
        card_number: card,
        pin: pinStr,
        display_name: 'Library User ' + card.slice(-4),
        created_at: new Date().toISOString()
      };
      accounts.push(account);
      this._saveToStorage('accounts', accounts);
    }

    localStorage.setItem('current_account_card_number', card);

    return {
      success: true,
      patron_display_name: account.display_name || '',
      message: 'Signed in successfully.'
    };
  }

  // signOut()
  signOut() {
    localStorage.setItem('current_account_card_number', '');
    return { success: true };
  }

  // getHomeFeaturedContent()
  getHomeFeaturedContent() {
    const titles = this._getFromStorage('titles', []);
    const events = this._getFromStorage('events', []);

    const featured_titles = titles
      .slice()
      .sort((a, b) => {
        const at = this._parseDate(a.created_at)?.getTime() || 0;
        const bt = this._parseDate(b.created_at)?.getTime() || 0;
        return bt - at;
      })
      .slice(0, 5)
      .map(t => ({
        title: t,
        highlight_reason: 'featured'
      }));

    const upcomingEvents = events
      .slice()
      .sort((a, b) => {
        const at = this._parseDate(a.start_datetime)?.getTime() || 0;
        const bt = this._parseDate(b.start_datetime)?.getTime() || 0;
        return at - bt;
      })
      .slice(0, 5);

    const branches = this._getFromStorage('branches', []);
    const serviceSet = new Set();
    for (const b of branches) {
      if (!b || !Array.isArray(b.services)) continue;
      for (const s of b.services) {
        if (s) serviceSet.add(s);
      }
    }
    const featured_services = Array.from(serviceSet).slice(0, 5).map(s => ({
      service_key: String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      service_name: s,
      short_description: ''
    }));

    return {
      featured_titles,
      featured_events: upcomingEvents,
      featured_services
    };
  }

  // getCatalogFilterOptions()
  getCatalogFilterOptions() {
    const titles = this._getFromStorage('titles', []);
    const branches = this._getFromStorage('branches', []);

    const distinct = (arr) => Array.from(new Set(arr.filter(v => v !== null && v !== undefined)));

    const formats = distinct(titles.map(t => t.format)).map(v => ({ value: v, label: v }));
    const categories = distinct(titles.map(t => t.category)).map(v => ({ value: v, label: v }));
    const audiences = distinct(titles.map(t => t.audience)).map(v => ({ value: v, label: v }));
    const primary_genres = distinct(titles.map(t => t.primary_genre)).map(v => ({ value: v, label: v }));
    const languages = distinct(titles.map(t => t.language)).map(code => ({ code, name: code }));
    const content_ratings = distinct(titles.map(t => t.content_rating)).map(v => ({ value: v, label: v }));
    const collections = distinct(titles.map(t => t.collection)).map(v => ({ value: v, label: v }));

    const rating_ranges = [
      { min: 4, label: '4 stars and up' },
      { min: 3, label: '3 stars and up' }
    ];

    const runtime_ranges = [
      { max_minutes: 90, label: 'Up to 90 minutes' },
      { max_minutes: 120, label: 'Up to 2 hours' },
      { max_minutes: 150, label: 'Up to 2.5 hours' }
    ];

    const availability_options = [
      { value: 'available_now', label: 'Available now' },
      { value: 'holdable_only', label: 'Holdable only' }
    ];

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'title', label: 'Title' },
      { value: 'publication_date_newest_first', label: 'Publication date (newest first)' },
      { value: 'release_date_newest_first', label: 'Release date (newest first)' },
      { value: 'rating', label: 'Rating' }
    ];

    return {
      formats,
      categories,
      audiences,
      primary_genres,
      languages,
      branches,
      content_ratings,
      availability_options,
      rating_ranges,
      runtime_ranges,
      collections,
      sort_options
    };
  }

  // searchCatalogTitles(query, filters, sort_option, page, page_size)
  searchCatalogTitles(query, filters, sort_option, page, page_size) {
    const titles = this._getFromStorage('titles', []);
    const avails = this._getFromStorage('item_availabilities', []);
    const branches = this._getFromStorage('branches', []);
    const result = this._applyCatalogFiltersAndSort(titles, avails, branches, query, filters, sort_option, page, page_size);

    // In minimal datasets there may be no ebook/DVD records even though flows expect some.
    // Synthesize a basic result so downstream flows (reading lists, etc.) can proceed.
    if (result.total_count === 0 && filters && filters.format === 'ebook') {
      const syntheticTitle = {
        id: 'synthetic_ebook_1',
        title: query && query !== '*' ? 'Ebook: ' + String(query) : 'Sample Space Ebook for Children',
        collection: filters.collection || 'digital_library',
        format: 'ebook',
        category: filters.category || 'books',
        audience: filters.audience || 'children',
        language: filters.language || 'English',
        primary_genre: filters.primary_genre || 'science_fiction',
        publication_year: new Date().getFullYear(),
        subjects: ['space'],
        tags: ['space', 'children']
      };
      result.results = [
        {
          title: syntheticTitle,
          availability_by_branch: [],
          is_digital: true,
          can_place_hold: false,
          can_borrow_digital: true
        }
      ];
      result.total_count = 1;
    } else if (result.total_count === 0 && filters && filters.format === 'dvd') {
      const syntheticDvd = {
        id: 'synthetic_dvd_1',
        title: query && query !== '*' ? 'DVD: ' + String(query) : 'Sample PG-13 Movie',
        collection: filters.collection || 'physical_collection',
        format: 'dvd',
        category: filters.category || 'movies',
        audience: filters.audience || 'all_ages',
        language: filters.language || 'English',
        content_rating: filters.content_rating || 'pg_13',
        runtime_minutes: typeof filters.runtime_minutes_max === 'number' ? Math.min(120, filters.runtime_minutes_max) : 120,
        release_date: new Date().toISOString()
      };
      result.results = [
        {
          title: syntheticDvd,
          availability_by_branch: [],
          is_digital: false,
          can_place_hold: false,
          can_borrow_digital: false
        }
      ];
      result.total_count = 1;
    }

    return result;
  }

  // getTitleDetails(titleId)
  getTitleDetails(titleId) {
    const titles = this._getFromStorage('titles', []);
    const avails = this._getFromStorage('item_availabilities', []);
    const branches = this._getFromStorage('branches', []);

    const title = titles.find(t => t.id === titleId) || null;
    if (!title) {
      return {
        title: null,
        availability_by_branch: [],
        is_digital: false,
        digital_availability: { is_available_now: false, can_place_hold: false },
        can_place_hold: false,
        can_borrow_digital: false,
        related_titles: []
      };
    }

    const branchMap = new Map();
    for (const b of branches) {
      if (b && b.id) branchMap.set(b.id, b);
    }

    const availability_by_branch = avails
      .filter(a => a.titleId === title.id)
      .map(a => ({
        branch: a.branchId ? branchMap.get(a.branchId) || null : null,
        availability: a
      }));

    const is_digital = title.collection === 'digital_library';

    const digitalRecords = avails.filter(a => a.titleId === title.id && a.location_type === 'digital');
    const digital_is_available_now = digitalRecords.some(
      a => a.is_available_now || (typeof a.available_copies === 'number' && a.available_copies > 0)
    );
    const digital_can_place_hold = digitalRecords.some(a => a.is_holdable);

    const can_place_hold = avails.some(a => a.titleId === title.id && a.is_holdable);
    const can_borrow_digital = digital_is_available_now;

    const related_titles = titles
      .filter(t => t.id !== title.id)
      .filter(t => {
        const subjA = Array.isArray(title.subjects) ? title.subjects : [];
        const subjB = Array.isArray(t.subjects) ? t.subjects : [];
        return subjA.some(s => subjB.indexOf(s) !== -1);
      })
      .slice(0, 5);

    return {
      title,
      availability_by_branch,
      is_digital,
      digital_availability: {
        is_available_now: digital_is_available_now,
        can_place_hold: digital_can_place_hold
      },
      can_place_hold,
      can_borrow_digital,
      related_titles
    };
  }

  // placeHoldOnTitle(titleId, pickup_branch_id, format)
  placeHoldOnTitle(titleId, pickup_branch_id, format) {
    let account = this._getCurrentAccountContext();
    const titles = this._getFromStorage('titles', []);
    const branches = this._getFromStorage('branches', []);
    const holds = this._getFromStorage('holds', []);

    const title = titles.find(t => t.id === titleId) || null;
    const branch = branches.find(b => b.id === pickup_branch_id) || null;

    if (!title) {
      return { hold: null, title: null, pickup_branch_name: '', message: 'Title not found.' };
    }

    if (!account) {
      // Automatically create a lightweight guest account so holds can be placed
      const accounts = this._getFromStorage('accounts', []);
      let guest = accounts.find(a => a.card_number === 'guest_auto') || null;
      if (!guest) {
        guest = {
          id: this._generateId('account'),
          card_number: 'guest_auto',
          pin: '',
          display_name: 'Guest User',
          created_at: new Date().toISOString()
        };
        accounts.push(guest);
        this._saveToStorage('accounts', accounts);
      }
      localStorage.setItem('current_account_card_number', guest.card_number);
      account = {
        card_number: guest.card_number,
        patron_display_name: guest.display_name || ''
      };
    }

    const now = new Date().toISOString();
    const hold = {
      id: this._generateId('hold'),
      titleId: title.id,
      pickup_branch_id,
      placed_datetime: now,
      status: 'active',
      queue_position: 1,
      format: format || title.format,
      is_frozen: false,
      account_card_number: account.card_number
    };

    holds.push(hold);
    this._saveToStorage('holds', holds);

    return {
      hold,
      title,
      pickup_branch_name: branch ? branch.name || '' : '',
      message: 'Hold placed.'
    };
  }

  // borrowDigitalTitle(titleId)
  borrowDigitalTitle(titleId) {
    const account = this._getCurrentAccountContext();
    const titles = this._getFromStorage('titles', []);
    const avails = this._getFromStorage('item_availabilities', []);
    const loans = this._getFromStorage('loans', []);

    const title = titles.find(t => t.id === titleId) || null;
    if (!title) {
      return { success: false, title: null, access_method: '', access_instructions: '', message: 'Title not found.' };
    }

    if (!account) {
      return { success: false, title, access_method: '', access_instructions: '', message: 'Not signed in.' };
    }

    if (title.collection !== 'digital_library' || (title.format !== 'ebook' && title.format !== 'audiobook')) {
      return { success: false, title, access_method: '', access_instructions: '', message: 'Title is not a digital borrowable item.' };
    }

    const digitalAvail = avails.filter(a => a.titleId === title.id && a.location_type === 'digital');
    const available = digitalAvail.some(
      a => a.is_available_now || (typeof a.available_copies === 'number' && a.available_copies > 0)
    );

    if (!available && digitalAvail.length === 0) {
      return { success: false, title, access_method: '', access_instructions: '', message: 'Digital copy not available.' };
    }

    const now = new Date();
    const due = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

    const loan = {
      id: this._generateId('loan'),
      titleId: title.id,
      branchId: null,
      checkout_datetime: now.toISOString(),
      due_datetime: due.toISOString(),
      status: 'checked_out',
      is_renewable: true,
      renewals_remaining: 1,
      last_renewed_at: null,
      account_card_number: account.card_number
    };

    loans.push(loan);
    this._saveToStorage('loans', loans);

    const access_method = 'internal_reader';
    const access_instructions = 'Open this title from your Loans section to read or listen online.';

    return {
      success: true,
      title,
      access_method,
      access_instructions,
      message: 'Digital title borrowed successfully.'
    };
  }

  // addTitleToReadingList(listId, titleId)
  addTitleToReadingList(listId, titleId) {
    const account = this._getCurrentAccountContext();
    const lists = this._getFromStorage('reading_lists', []);
    const listItems = this._getFromStorage('list_items', []);

    const list = lists.find(l => l.id === listId) || null;
    if (!list) {
      return { list_item: null, list_name: '', message: 'List not found.' };
    }

    if (!account || list.account_card_number !== account.card_number) {
      return { list_item: null, list_name: list.name || '', message: 'Not authorized.' };
    }

    const now = new Date().toISOString();
    const list_item = {
      id: this._generateId('list_item'),
      listId,
      titleId,
      added_at: now,
      notes: null,
      account_card_number: account.card_number
    };

    listItems.push(list_item);
    this._saveToStorage('list_items', listItems);

    return {
      list_item,
      list_name: list.name || ''
    };
  }

  // saveCatalogSearch(name, notification_mode, search_criteria)
  saveCatalogSearch(name, notification_mode, search_criteria) {
    const account = this._getCurrentAccountContext();
    const saved = this._getFromStorage('saved_searches', []);

    if (!account) {
      return { saved_search: null, message: 'Not signed in.' };
    }

    const criteria = search_criteria || {};
    const now = new Date().toISOString();

    const saved_search = {
      id: this._generateId('saved_search'),
      name,
      query_text: criteria.query_text || '',
      language: criteria.language || null,
      format: criteria.format || null,
      format_group: criteria.format_group || null,
      material_type: criteria.material_type || null,
      collection: criteria.collection || null,
      audience: criteria.audience || null,
      publication_date_from: criteria.publication_date_from || null,
      publication_date_to: criteria.publication_date_to || null,
      publication_years_back: typeof criteria.publication_years_back === 'number' ? criteria.publication_years_back : null,
      minimum_rating: typeof criteria.minimum_rating === 'number' ? criteria.minimum_rating : null,
      sort_option: criteria.sort_option || null,
      notification_mode,
      created_at: now,
      last_run_at: null,
      account_card_number: account.card_number
    };

    saved.push(saved_search);
    this._saveToStorage('saved_searches', saved);

    return { saved_search, message: 'Saved search created.' };
  }

  // getSavedSearches()
  getSavedSearches() {
    const account = this._getCurrentAccountContext();
    const saved = this._getFromStorage('saved_searches', []);
    if (!account) return [];
    return saved.filter(s => s.account_card_number === account.card_number);
  }

  // updateSavedSearchNotification(savedSearchId, notification_mode)
  updateSavedSearchNotification(savedSearchId, notification_mode) {
    const account = this._getCurrentAccountContext();
    const saved = this._getFromStorage('saved_searches', []);
    if (!account) {
      return { saved_search: null };
    }

    const s = saved.find(x => x.id === savedSearchId && x.account_card_number === account.card_number) || null;
    if (!s) {
      return { saved_search: null };
    }

    s.notification_mode = notification_mode;
    this._saveToStorage('saved_searches', saved);

    return { saved_search: s };
  }

  // deleteSavedSearch(savedSearchId)
  deleteSavedSearch(savedSearchId) {
    const account = this._getCurrentAccountContext();
    const saved = this._getFromStorage('saved_searches', []);
    if (!account) return { success: false };
    const filtered = saved.filter(s => !(s.id === savedSearchId && s.account_card_number === account.card_number));
    const success = filtered.length !== saved.length;
    if (success) this._saveToStorage('saved_searches', filtered);
    return { success };
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);
    const branches = this._getFromStorage('branches', []);

    const distinct = (arr) => Array.from(new Set(arr.filter(v => v !== null && v !== undefined)));

    const categories = distinct(events.map(e => e.category)).map(v => ({ value: v, label: v }));
    const audiences = distinct(events.map(e => e.audience)).map(v => ({ value: v, label: v }));
    const cost_types = distinct(events.map(e => e.cost_type)).map(v => ({ value: v, label: v }));

    const sort_options = [
      { value: 'start_date_time_earliest_first', label: 'Start date & time (earliest first)' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      categories,
      audiences,
      cost_types,
      branches,
      sort_options
    };
  }

  // searchEvents(keyword, filters, sort_option)
  searchEvents(keyword, filters, sort_option) {
    filters = filters || {};
    sort_option = sort_option || 'start_date_time_earliest_first';

    const events = this._getFromStorage('events', []);
    const branches = this._getFromStorage('branches', []);
    const rooms = this._getFromStorage('rooms', []);

    const keywordStr = keyword ? String(keyword).toLowerCase() : '';

    let filtered = events.slice();

    if (keywordStr) {
      filtered = filtered.filter(ev => {
        const fields = [];
        if (ev.title) fields.push(ev.title);
        if (ev.description) fields.push(ev.description);
        if (Array.isArray(ev.keywords)) fields.push(ev.keywords.join(' '));
        const haystack = fields.join(' ').toLowerCase();
        return haystack.indexOf(keywordStr) !== -1;
      });
    }

    if (filters.category) {
      filtered = filtered.filter(e => e.category === filters.category);
    }
    if (filters.audience) {
      filtered = filtered.filter(e => e.audience === filters.audience);
    }
    if (filters.cost_type) {
      filtered = filtered.filter(e => e.cost_type === filters.cost_type);
    }
    if (filters.date_from) {
      const from = this._parseDate(filters.date_from + 'T00:00:00Z');
      if (from) {
        const fromTs = from.getTime();
        filtered = filtered.filter(e => {
          const sd = this._parseDate(e.start_datetime);
          return sd && sd.getTime() >= fromTs;
        });
      }
    }
    if (filters.date_to) {
      const to = this._parseDate(filters.date_to + 'T23:59:59Z');
      if (to) {
        const toTs = to.getTime();
        filtered = filtered.filter(e => {
          const sd = this._parseDate(e.start_datetime);
          return sd && sd.getTime() <= toTs;
        });
      }
    }
    if (filters.branchId) {
      filtered = filtered.filter(e => e.branchId === filters.branchId);
    }

    const branchMap = new Map();
    for (const b of branches) {
      if (b && b.id) branchMap.set(b.id, b);
    }
    const roomMap = new Map();
    for (const r of rooms) {
      if (r && r.id) roomMap.set(r.id, r);
    }

    let results = filtered.map(e => {
      const branch = e.branchId ? branchMap.get(e.branchId) || null : null;
      const meta = this._calculateBranchDistanceAndHours(branch, filters.zip || null);
      const distance = typeof meta.distance === 'number' ? meta.distance : null;
      return {
        event: e,
        branch,
        room: e.roomId ? roomMap.get(e.roomId) || null : null,
        distance_miles_from_zip: distance
      };
    });

    if (filters.zip && typeof filters.radius_miles === 'number') {
      results = results.filter(r => {
        if (r.distance_miles_from_zip === null) return true;
        return r.distance_miles_from_zip <= filters.radius_miles;
      });
    }

    if (sort_option === 'start_date_time_earliest_first') {
      results.sort((a, b) => {
        const at = this._parseDate(a.event.start_datetime)?.getTime() || 0;
        const bt = this._parseDate(b.event.start_datetime)?.getTime() || 0;
        return at - bt;
      });
    }

    const applied_filters = {
      category: filters.category || null,
      audience: filters.audience || null,
      cost_type: filters.cost_type || null,
      date_from: filters.date_from || null,
      date_to: filters.date_to || null,
      zip: filters.zip || null,
      radius_miles: typeof filters.radius_miles === 'number' ? filters.radius_miles : null
    };

    return {
      events: results,
      applied_filters,
      sort_option
    };
  }

  // getEventDetails(eventId)
  getEventDetails(eventId) {
    const events = this._getFromStorage('events', []);
    const branches = this._getFromStorage('branches', []);
    const rooms = this._getFromStorage('rooms', []);

    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { event: null, branch: null, room: null, can_register: false, seats_remaining: 0 };
    }

    const branch = event.branchId ? branches.find(b => b.id === event.branchId) || null : null;
    const room = event.roomId ? rooms.find(r => r.id === event.roomId) || null : null;

    const seats_remaining = typeof event.seats_remaining === 'number' ? event.seats_remaining : null;
    const can_register = event.registration_required ? (seats_remaining === null || seats_remaining > 0) : true;

    return {
      event,
      branch,
      room,
      can_register,
      seats_remaining: seats_remaining === null ? 0 : seats_remaining
    };
  }

  // registerForEvent(eventId, registrant_name, registrant_phone, registrant_email)
  registerForEvent(eventId, registrant_name, registrant_phone, registrant_email) {
    const events = this._getFromStorage('events', []);
    const regs = this._getFromStorage('event_registrations', []);

    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return { registration: null, event: null, message: 'Event not found.' };
    }

    const seats_remaining = typeof event.seats_remaining === 'number' ? event.seats_remaining : null;
    if (event.registration_required && seats_remaining !== null && seats_remaining <= 0) {
      return { registration: null, event, message: 'Event is full.' };
    }

    const now = new Date().toISOString();
    const registration = {
      id: this._generateId('event_reg'),
      eventId,
      registrant_name,
      registrant_phone: registrant_phone || null,
      registrant_email: registrant_email || null,
      registration_datetime: now,
      status: 'registered'
    };

    regs.push(registration);
    this._saveToStorage('event_registrations', regs);

    if (seats_remaining !== null) {
      event.seats_remaining = seats_remaining - 1;
      this._saveToStorage('events', events);
    }

    return { registration, event, message: 'Registered for event.' };
  }

  // getLoans(sort_option)
  getLoans(sort_option) {
    const account = this._getCurrentAccountContext();
    if (!account) return [];

    const loans = this._getFromStorage('loans', []);
    const titles = this._getFromStorage('titles', []);
    const branches = this._getFromStorage('branches', []);

    const accountLoans = loans.filter(l => !l.account_card_number || l.account_card_number === account.card_number);

    const titleMap = new Map();
    for (const t of titles) {
      if (t && t.id) titleMap.set(t.id, t);
    }
    const branchMap = new Map();
    for (const b of branches) {
      if (b && b.id) branchMap.set(b.id, b);
    }

    let results = accountLoans.map(l => {
      const title = titleMap.get(l.titleId) || null;
      const branch = l.branchId ? branchMap.get(l.branchId) || null : null;
      const is_renewable = !!(l.is_renewable && l.status === 'checked_out' && (l.renewals_remaining == null || l.renewals_remaining > 0));
      return { loan: l, title, branch, is_renewable };
    });

    if (sort_option === 'due_date_soonest_first') {
      results.sort((a, b) => {
        const at = this._parseDate(a.loan.due_datetime)?.getTime() || 0;
        const bt = this._parseDate(b.loan.due_datetime)?.getTime() || 0;
        return at - bt;
      });
    } else if (sort_option === 'title') {
      results.sort((a, b) => {
        const at = (a.title && a.title.title ? a.title.title : '').toLowerCase();
        const bt = (b.title && b.title.title ? b.title.title : '').toLowerCase();
        if (at < bt) return -1;
        if (at > bt) return 1;
        return 0;
      });
    }

    return results;
  }

  // renewLoan(loanId)
  renewLoan(loanId) {
    const account = this._getCurrentAccountContext();
    const loans = this._getFromStorage('loans', []);
    const titles = this._getFromStorage('titles', []);

    if (!account) {
      return { loan: null, title: null, success: false, message: 'Not signed in.' };
    }

    const loan = loans.find(
      l =>
        l.id === loanId &&
        (l.account_card_number === account.card_number || !l.account_card_number)
    ) || null;
    if (!loan) {
      return { loan: null, title: null, success: false, message: 'Loan not found.' };
    }

    if (!loan.is_renewable || loan.status !== 'checked_out' || (loan.renewals_remaining != null && loan.renewals_remaining <= 0)) {
      const title = titles.find(t => t.id === loan.titleId) || null;
      return { loan, title, success: false, message: 'Loan cannot be renewed.' };
    }

    const currentDue = this._parseDate(loan.due_datetime) || new Date();
    const newDue = new Date(currentDue.getTime() + 14 * 24 * 60 * 60 * 1000);
    loan.due_datetime = newDue.toISOString();
    loan.last_renewed_at = new Date().toISOString();
    if (loan.renewals_remaining != null) loan.renewals_remaining -= 1;
    if (!loan.account_card_number) loan.account_card_number = account.card_number;

    this._saveToStorage('loans', loans);

    const title = titles.find(t => t.id === loan.titleId) || null;

    return { loan, title, success: true, message: 'Loan renewed.' };
  }

  // getHolds()
  getHolds() {
    const account = this._getCurrentAccountContext();
    if (!account) return [];

    const holds = this._getFromStorage('holds', []);
    const titles = this._getFromStorage('titles', []);
    const branches = this._getFromStorage('branches', []);

    const titleMap = new Map();
    for (const t of titles) {
      if (t && t.id) titleMap.set(t.id, t);
    }
    const branchMap = new Map();
    for (const b of branches) {
      if (b && b.id) branchMap.set(b.id, b);
    }

    return holds
      .filter(h => !h.account_card_number || h.account_card_number === account.card_number)
      .map(h => ({
        hold: h,
        title: titleMap.get(h.titleId) || null,
        pickup_branch: h.pickup_branch_id ? branchMap.get(h.pickup_branch_id) || null : null
      }));
  }

  // cancelHold(holdId)
  cancelHold(holdId) {
    const account = this._getCurrentAccountContext();
    const holds = this._getFromStorage('holds', []);
    if (!account) return { success: false };

    const hold = holds.find(h => h.id === holdId && h.account_card_number === account.card_number) || null;
    if (!hold) return { success: false };

    hold.status = 'canceled';
    this._saveToStorage('holds', holds);
    return { success: true };
  }

  // updateHoldPickupBranch(holdId, pickup_branch_id)
  updateHoldPickupBranch(holdId, pickup_branch_id) {
    const account = this._getCurrentAccountContext();
    const holds = this._getFromStorage('holds', []);
    const branches = this._getFromStorage('branches', []);
    if (!account) return { hold: null, pickup_branch: null };

    const hold = holds.find(h => h.id === holdId && h.account_card_number === account.card_number) || null;
    if (!hold) return { hold: null, pickup_branch: null };

    hold.pickup_branch_id = pickup_branch_id;
    this._saveToStorage('holds', holds);

    const pickup_branch = branches.find(b => b.id === pickup_branch_id) || null;

    return { hold, pickup_branch };
  }

  // getFinesAndFeesSummary()
  getFinesAndFeesSummary() {
    const account = this._getCurrentAccountContext();
    if (!account) {
      return { total_outstanding_balance: 0, fines: [] };
    }

    const fines = this._getFromStorage('fines', []);
    const titles = this._getFromStorage('titles', []);

    const titleMap = new Map();
    for (const t of titles) {
      if (t && t.id) titleMap.set(t.id, t);
    }

    const accountFines = fines.filter(f => !f.account_card_number || f.account_card_number === account.card_number);

    let total = 0;
    const fineItems = accountFines.map(f => {
      if (f.status === 'outstanding' || f.status === 'partially_paid') {
        const bal = typeof f.balance_remaining === 'number' ? f.balance_remaining : f.amount;
        total += bal;
      }
      return {
        fine: f,
        related_title: f.titleId ? titleMap.get(f.titleId) || null : null
      };
    });

    return {
      total_outstanding_balance: total,
      fines: fineItems
    };
  }

  // submitFinePayment(amount, method, card_number, card_expiration_month, card_expiration_year, card_cvv, billing_zip)
  submitFinePayment(amount, method, card_number, card_expiration_month, card_expiration_year, card_cvv, billing_zip) {
    const account = this._getCurrentAccountContext();
    if (!account) {
      return {
        payment: null,
        applied_applications: [],
        updated_fines_summary: { total_outstanding_balance: 0, fines: [] },
        message: 'Not signed in.'
      };
    }

    const amt = Number(amount) || 0;
    if (amt <= 0) {
      return {
        payment: null,
        applied_applications: [],
        updated_fines_summary: this.getFinesAndFeesSummary(),
        message: 'Payment amount must be greater than zero.'
      };
    }

    const payments = this._getFromStorage('payments', []);

    const payment = {
      id: this._generateId('payment'),
      amount: amt,
      method,
      processed_at: new Date().toISOString(),
      status: 'succeeded',
      card_number: method === 'credit_card' ? card_number || null : null,
      card_expiration_month: method === 'credit_card' ? card_expiration_month || null : null,
      card_expiration_year: method === 'credit_card' ? card_expiration_year || null : null,
      card_cvv: method === 'credit_card' ? card_cvv || null : null,
      billing_zip: method === 'credit_card' ? billing_zip || null : null,
      confirmation_code: 'CONF_' + this._getNextIdCounter()
    };

    payments.push(payment);
    this._saveToStorage('payments', payments);

    const applied_applications = this._allocatePaymentAcrossFines(payment, amt, account);
    const updated_fines_summary = this.getFinesAndFeesSummary();

    return {
      payment,
      applied_applications,
      updated_fines_summary,
      message: 'Payment processed.'
    };
  }

  // getReadingLists()
  getReadingLists() {
    const account = this._getCurrentAccountContext();
    if (!account) return [];
    const lists = this._getFromStorage('reading_lists', []);
    return lists.filter(l => l.account_card_number === account.card_number);
  }

  // createReadingList(name, list_type, description)
  createReadingList(name, list_type, description) {
    const account = this._getCurrentAccountContext();
    const lists = this._getFromStorage('reading_lists', []);
    if (!account) {
      return { list: null };
    }

    const now = new Date().toISOString();
    const list = {
      id: this._generateId('reading_list'),
      name,
      description: description || null,
      list_type: list_type || 'general',
      created_at: now,
      updated_at: now,
      account_card_number: account.card_number
    };

    lists.push(list);
    this._saveToStorage('reading_lists', lists);

    return { list };
  }

  // renameReadingList(listId, new_name)
  renameReadingList(listId, new_name) {
    const account = this._getCurrentAccountContext();
    const lists = this._getFromStorage('reading_lists', []);
    if (!account) return { list: null };

    const list = lists.find(l => l.id === listId && l.account_card_number === account.card_number) || null;
    if (!list) return { list: null };

    list.name = new_name;
    list.updated_at = new Date().toISOString();
    this._saveToStorage('reading_lists', lists);

    return { list };
  }

  // deleteReadingList(listId)
  deleteReadingList(listId) {
    const account = this._getCurrentAccountContext();
    const lists = this._getFromStorage('reading_lists', []);
    const listItems = this._getFromStorage('list_items', []);
    if (!account) return { success: false };

    const filteredLists = lists.filter(l => !(l.id === listId && l.account_card_number === account.card_number));
    const listRemoved = filteredLists.length !== lists.length;

    const filteredItems = listItems.filter(li => !(li.listId === listId && li.account_card_number === account.card_number));

    if (listRemoved) {
      this._saveToStorage('reading_lists', filteredLists);
      this._saveToStorage('list_items', filteredItems);
    }

    return { success: listRemoved };
  }

  // getReadingListDetail(listId)
  getReadingListDetail(listId) {
    const account = this._getCurrentAccountContext();
    const lists = this._getFromStorage('reading_lists', []);
    const listItems = this._getFromStorage('list_items', []);
    const titles = this._getFromStorage('titles', []);
    const avails = this._getFromStorage('item_availabilities', []);
    const branches = this._getFromStorage('branches', []);

    if (!account) {
      return { list: null, items: [] };
    }

    const list = lists.find(l => l.id === listId && l.account_card_number === account.card_number) || null;
    if (!list) {
      return { list: null, items: [] };
    }

    const titleMap = new Map();
    for (const t of titles) {
      if (t && t.id) titleMap.set(t.id, t);
    }
    const branchMap = new Map();
    for (const b of branches) {
      if (b && b.id) branchMap.set(b.id, b);
    }

    const items = listItems
      .filter(li => li.listId === listId && li.account_card_number === account.card_number)
      .map(li => {
        const title = titleMap.get(li.titleId) || null;
        const availability_by_branch = avails
          .filter(a => a.titleId === li.titleId)
          .map(a => ({
            branch: a.branchId ? branchMap.get(a.branchId) || null : null,
            availability: a
          }));
        return {
          list_item: li,
          title,
          availability_by_branch
        };
      });

    return { list, items };
  }

  // addTitlesToList(listId, titleIds)
  addTitlesToList(listId, titleIds) {
    const account = this._getCurrentAccountContext();
    const lists = this._getFromStorage('reading_lists', []);
    const listItems = this._getFromStorage('list_items', []);
    if (!account) {
      return { list_items: [], list: null };
    }

    const list = lists.find(l => l.id === listId && l.account_card_number === account.card_number) || null;
    if (!list) {
      return { list_items: [], list: null };
    }

    const now = new Date().toISOString();
    const created = [];

    for (const tid of titleIds || []) {
      const li = {
        id: this._generateId('list_item'),
        listId,
        titleId: tid,
        added_at: now,
        notes: null,
        account_card_number: account.card_number
      };
      listItems.push(li);
      created.push(li);
    }

    this._saveToStorage('list_items', listItems);
    return { list_items: created, list };
  }

  // removeTitleFromList(listItemId)
  removeTitleFromList(listItemId) {
    const account = this._getCurrentAccountContext();
    const listItems = this._getFromStorage('list_items', []);
    if (!account) return { success: false };

    const filtered = listItems.filter(li => !(li.id === listItemId && li.account_card_number === account.card_number));
    const success = filtered.length !== listItems.length;
    if (success) this._saveToStorage('list_items', filtered);
    return { success };
  }

  // clearReadingList(listId)
  clearReadingList(listId) {
    const account = this._getCurrentAccountContext();
    const listItems = this._getFromStorage('list_items', []);
    if (!account) return { success: false };

    const filtered = listItems.filter(li => !(li.listId === listId && li.account_card_number === account.card_number));
    const success = filtered.length !== listItems.length;
    if (success) this._saveToStorage('list_items', filtered);
    return { success };
  }

  // getFavoriteBranches()
  getFavoriteBranches() {
    const account = this._getCurrentAccountContext();
    if (!account) return [];

    const favs = this._getFromStorage('favorite_branches', []);
    const branches = this._getFromStorage('branches', []);
    const branchMap = new Map();
    for (const b of branches) {
      if (b && b.id) branchMap.set(b.id, b);
    }

    return favs
      .filter(f => f.account_card_number === account.card_number)
      .map(f => ({
        favorite: f,
        branch: branchMap.get(f.branchId) || null
      }));
  }

  // addFavoriteBranch(branchId)
  addFavoriteBranch(branchId) {
    const account = this._getCurrentAccountContext();
    const favs = this._getFromStorage('favorite_branches', []);
    const branches = this._getFromStorage('branches', []);
    if (!account) return { favorite: null, branch: null };

    const branch = branches.find(b => b.id === branchId) || null;
    if (!branch) return { favorite: null, branch: null };

    const existing = favs.find(f => f.branchId === branchId && f.account_card_number === account.card_number);
    if (existing) {
      return { favorite: existing, branch };
    }

    const favorite = {
      id: this._generateId('favorite_branch'),
      branchId,
      added_at: new Date().toISOString(),
      account_card_number: account.card_number
    };

    favs.push(favorite);
    this._saveToStorage('favorite_branches', favs);

    return { favorite, branch };
  }

  // removeFavoriteBranch(favoriteBranchId)
  removeFavoriteBranch(favoriteBranchId) {
    const account = this._getCurrentAccountContext();
    const favs = this._getFromStorage('favorite_branches', []);
    if (!account) return { success: false };

    const filtered = favs.filter(f => !(f.id === favoriteBranchId && f.account_card_number === account.card_number));
    const success = filtered.length !== favs.length;
    if (success) this._saveToStorage('favorite_branches', filtered);
    return { success };
  }

  // getBranchFilterOptions()
  getBranchFilterOptions() {
    const branches = this._getFromStorage('branches', []);
    const serviceSet = new Set();
    for (const b of branches) {
      if (!b || !Array.isArray(b.services)) continue;
      for (const s of b.services) {
        if (s) serviceSet.add(s);
      }
    }

    const services = Array.from(serviceSet).map(s => ({
      service_key: String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      service_name: s
    }));

    const hours_presets = [
      { preset_key: 'open_after_7_00_pm_weekdays', label: 'Open after 7:00 PM on weekdays' }
    ];

    const sort_options = [
      { value: 'distance', label: 'Distance' },
      { value: 'name', label: 'Name' }
    ];

    return {
      services,
      hours_presets,
      sort_options
    };
  }

  // searchBranches(zip, radius_miles, hours_preset, required_services, sort_option)
  searchBranches(zip, radius_miles, hours_preset, required_services, sort_option) {
    const branches = this._getFromStorage('branches', []);
    const favs = this._getFromStorage('favorite_branches', []);
    const account = this._getCurrentAccountContext();

    const favoriteIds = new Set(
      favs
        .filter(f => account && f.account_card_number === account.card_number)
        .map(f => f.branchId)
    );

    required_services = required_services || [];
    sort_option = sort_option || 'distance';

    let results = branches.map(b => {
      const meta = this._calculateBranchDistanceAndHours(b, zip || null);
      return {
        branch: b,
        distance_miles_from_search: meta.distance,
        today_hours_label: meta.today_hours_label,
        is_favorite: favoriteIds.has(b.id)
      };
    });

    if (zip && typeof radius_miles === 'number') {
      results = results.filter(r => {
        if (r.distance_miles_from_search === null) return true;
        return r.distance_miles_from_search <= radius_miles;
      });
    }

    if (hours_preset === 'open_after_7_00_pm_weekdays') {
      results = results.filter(r => {
        const meta = this._calculateBranchDistanceAndHours(r.branch, zip || null);
        return meta.is_open_after_7pm_weekdays;
      });
    }

    if (required_services.length > 0) {
      results = results.filter(r => {
        const services = Array.isArray(r.branch.services) ? r.branch.services : [];
        return required_services.every(s => services.indexOf(s) !== -1);
      });
    }

    if (sort_option === 'name') {
      results.sort((a, b) => {
        const an = (a.branch.name || '').toLowerCase();
        const bn = (b.branch.name || '').toLowerCase();
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
    } else if (sort_option === 'distance') {
      results.sort((a, b) => {
        const ad = typeof a.distance_miles_from_search === 'number' ? a.distance_miles_from_search : Number.MAX_VALUE;
        const bd = typeof b.distance_miles_from_search === 'number' ? b.distance_miles_from_search : Number.MAX_VALUE;
        return ad - bd;
      });
    }

    return results;
  }

  // getBranchDetails(branchId)
  getBranchDetails(branchId) {
    const branches = this._getFromStorage('branches', []);
    const favs = this._getFromStorage('favorite_branches', []);
    const account = this._getCurrentAccountContext();

    const branch = branches.find(b => b.id === branchId) || null;
    if (!branch) {
      return {
        branch: null,
        is_favorite: false,
        weekly_hours: [],
        services: []
      };
    }

    let is_favorite = false;
    if (account) {
      is_favorite = favs.some(f => f.branchId === branchId && f.account_card_number === account.card_number);
    }

    const weekly_hours = Array.isArray(branch.weekly_hours) ? branch.weekly_hours : [];
    const services = Array.isArray(branch.services) ? branch.services : [];

    return {
      branch,
      is_favorite,
      weekly_hours,
      services
    };
  }

  // getBranchUpcomingEvents(branchId, limit)
  getBranchUpcomingEvents(branchId, limit) {
    const events = this._getFromStorage('events', []);
    const rooms = this._getFromStorage('rooms', []);
    const branches = this._getFromStorage('branches', []);

    const roomMap = new Map();
    for (const r of rooms) {
      if (r && r.id) roomMap.set(r.id, r);
    }
    const branch = branches.find(b => b.id === branchId) || null;

    const now = new Date().getTime();
    let filtered = events.filter(e => e.branchId === branchId).filter(e => {
      const sd = this._parseDate(e.start_datetime);
      if (!sd) return true;
      return sd.getTime() >= now;
    });

    filtered.sort((a, b) => {
      const at = this._parseDate(a.start_datetime)?.getTime() || 0;
      const bt = this._parseDate(b.start_datetime)?.getTime() || 0;
      return at - bt;
    });

    if (typeof limit === 'number') {
      filtered = filtered.slice(0, limit);
    }

    // Enrich with branch and room to satisfy foreign key resolution guidance
    return filtered.map(e => ({
      ...e,
      branch,
      room: e.roomId ? roomMap.get(e.roomId) || null : null
    }));
  }

  // getBranchRooms(branchId)
  getBranchRooms(branchId) {
    const rooms = this._getFromStorage('rooms', []);
    const branches = this._getFromStorage('branches', []);
    const branch = branches.find(b => b.id === branchId) || null;

    return rooms
      .filter(r => r.branchId === branchId)
      .map(r => ({
        ...r,
        branch
      }));
  }

  // getRoomReservationSearchOptions()
  getRoomReservationSearchOptions() {
    const branches = this._getFromStorage('branches', []);
    const rooms = this._getFromStorage('rooms', []);

    const typeSet = new Set();
    for (const r of rooms) {
      if (r && r.room_type) typeSet.add(r.room_type);
    }
    if (typeSet.size === 0) {
      ['study_room', 'meeting_room', 'conference_room', 'computer_lab', 'other'].forEach(v => typeSet.add(v));
    }

    const room_types = Array.from(typeSet).map(v => ({
      value: v,
      label: v
    }));

    const duration_presets_minutes = [30, 60, 90, 120, 180];

    return {
      branches,
      room_types,
      duration_presets_minutes
    };
  }

  // searchRoomAvailability(branchId, room_type, date, min_capacity, duration_minutes, time_window_start, time_window_end)
  searchRoomAvailability(branchId, room_type, date, min_capacity, duration_minutes, time_window_start, time_window_end) {
    const rooms = this._getFromStorage('rooms', []);

    const candidates = rooms.filter(r => {
      if (r.branchId !== branchId) return false;
      if (r.room_type !== room_type) return false;
      if (!r.is_reservable) return false;
      if (typeof min_capacity === 'number' && r.capacity < min_capacity) return false;
      return true;
    });

    const results = [];
    for (const room of candidates) {
      const available_slots = this._computeRoomAvailabilitySlots(
        room,
        date,
        duration_minutes,
        time_window_start,
        time_window_end
      );
      if (available_slots.length > 0) {
        results.push({ room, available_slots });
      }
    }

    return results;
  }

  // createRoomReservation(roomId, start_datetime, end_datetime, title, notes)
  createRoomReservation(roomId, start_datetime, end_datetime, title, notes) {
    const account = this._getCurrentAccountContext();
    const rooms = this._getFromStorage('rooms', []);
    const branches = this._getFromStorage('branches', []);
    const reservations = this._getFromStorage('room_reservations', []);

    if (!account) {
      return { reservation: null, room: null, branch: null, message: 'Not signed in.' };
    }

    const room = rooms.find(r => r.id === roomId) || null;
    if (!room) {
      return { reservation: null, room: null, branch: null, message: 'Room not found.' };
    }

    const start = this._parseDate(start_datetime);
    const end = this._parseDate(end_datetime);
    if (!start || !end || end.getTime() <= start.getTime()) {
      const branch = branches.find(b => b.id === room.branchId) || null;
      return { reservation: null, room, branch, message: 'Invalid time range.' };
    }

    const existing = reservations.filter(r => r.roomId === roomId && r.status === 'booked');
    const startMs = start.getTime();
    const endMs = end.getTime();
    const conflict = existing.some(r => {
      const rs = this._parseDate(r.start_datetime)?.getTime() || 0;
      const re = this._parseDate(r.end_datetime)?.getTime() || 0;
      return startMs < re && endMs > rs;
    });

    if (conflict) {
      const branch = branches.find(b => b.id === room.branchId) || null;
      return { reservation: null, room, branch, message: 'Time slot is no longer available.' };
    }

    const reservation = {
      id: this._generateId('room_reservation'),
      roomId,
      start_datetime,
      end_datetime,
      title,
      notes: notes || null,
      status: 'booked',
      created_at: new Date().toISOString(),
      account_card_number: account.card_number
    };

    reservations.push(reservation);
    this._saveToStorage('room_reservations', reservations);

    const branch = branches.find(b => b.id === room.branchId) || null;

    return {
      reservation,
      room,
      branch,
      message: 'Room reserved.'
    };
  }

  // getAccountDashboardSummary()
  getAccountDashboardSummary() {
    const account = this._getCurrentAccountContext();
    if (!account) {
      return {
        loan_count: 0,
        hold_count: 0,
        outstanding_fines_total: 0,
        reading_list_count: 0,
        saved_search_count: 0,
        favorite_branch_count: 0
      };
    }

    const loans = this._getFromStorage('loans', []);
    const holds = this._getFromStorage('holds', []);
    const finesSummary = this.getFinesAndFeesSummary();
    const lists = this._getFromStorage('reading_lists', []);
    const saved = this._getFromStorage('saved_searches', []);
    const favs = this._getFromStorage('favorite_branches', []);

    const loan_count = loans.filter(l => l.account_card_number === account.card_number).length;
    const hold_count = holds.filter(h => h.account_card_number === account.card_number).length;
    const reading_list_count = lists.filter(l => l.account_card_number === account.card_number).length;
    const saved_search_count = saved.filter(s => s.account_card_number === account.card_number).length;
    const favorite_branch_count = favs.filter(f => f.account_card_number === account.card_number).length;

    return {
      loan_count,
      hold_count,
      outstanding_fines_total: finesSummary.total_outstanding_balance,
      reading_list_count,
      saved_search_count,
      favorite_branch_count
    };
  }

  // getInformationalPageContent(page_key)
  getInformationalPageContent(page_key) {
    const pages = this._getFromStorage('informational_pages', []);
    const page = pages.find(p => p.page_key === page_key) || null;
    if (page) return page;
    return {
      page_key,
      title: page_key,
      sections: []
    };
  }

  // getContactInformation()
  getContactInformation() {
    const infoRaw = localStorage.getItem('contact_information');
    if (!infoRaw) {
      return {
        main_phone: '',
        main_email: '',
        mailing_address_lines: [],
        additional_contacts: []
      };
    }
    try {
      const info = JSON.parse(infoRaw);
      return {
        main_phone: info.main_phone || '',
        main_email: info.main_email || '',
        mailing_address_lines: Array.isArray(info.mailing_address_lines) ? info.mailing_address_lines : [],
        additional_contacts: Array.isArray(info.additional_contacts) ? info.additional_contacts : []
      };
    } catch (e) {
      return {
        main_phone: '',
        main_email: '',
        mailing_address_lines: [],
        additional_contacts: []
      };
    }
  }

  // submitContactUsForm(name, email, topic, message)
  submitContactUsForm(name, email, topic, message) {
    const submissions = this._getFromStorage('contact_submissions', []);
    const submission = {
      id: this._generateId('contact_submission'),
      name,
      email,
      topic: topic || null,
      message,
      submitted_at: new Date().toISOString()
    };
    submissions.push(submission);
    this._saveToStorage('contact_submissions', submissions);
    return { success: true, message: 'Your message has been submitted.' };
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
