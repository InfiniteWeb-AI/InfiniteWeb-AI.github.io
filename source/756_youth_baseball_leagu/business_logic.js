// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const keys = [
      'users', // unused but kept for compatibility with template
      'products',
      'cart',
      'cart_items',
      'seasons',
      'divisions',
      'fields',
      'teams',
      'games',
      'saved_games',
      'camps',
      'camp_registrations',
      'volunteer_slots',
      'volunteer_signups',
      'rule_documents',
      'saved_documents',
      'coach_messages',
      'standings_records',
      'favorite_lists',
      'favorite_teams',
      'saved_fields',
      'news_articles',
      'team_announcement_shares'
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

  // Generic foreign-key resolver: adds properties like season, team, field, etc.
  _resolveForeignKeys(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const fkMap = {
      seasonId: { key: 'season', storage: 'seasons' },
      divisionId: { key: 'division', storage: 'divisions' },
      fieldId: { key: 'field', storage: 'fields' },
      homeTeamId: { key: 'homeTeam', storage: 'teams' },
      awayTeamId: { key: 'awayTeam', storage: 'teams' },
      teamId: { key: 'team', storage: 'teams' },
      primaryFieldId: { key: 'primaryField', storage: 'fields' },
      campId: { key: 'camp', storage: 'camps' },
      volunteerSlotId: { key: 'volunteerSlot', storage: 'volunteer_slots' },
      ruleDocumentId: { key: 'ruleDocument', storage: 'rule_documents' },
      favoriteListId: { key: 'favoriteList', storage: 'favorite_lists' },
      gameId: { key: 'game', storage: 'games' },
      productId: { key: 'product', storage: 'products' },
      cartId: { key: 'cart', storage: 'cart' },
      articleId: { key: 'article', storage: 'news_articles' }
    };
    const result = { ...obj };
    const storageCache = {};
    Object.keys(fkMap).forEach((fkField) => {
      if (Object.prototype.hasOwnProperty.call(obj, fkField) && obj[fkField] != null) {
        const { key, storage } = fkMap[fkField];
        if (!storageCache[storage]) {
          storageCache[storage] = this._getFromStorage(storage);
        }
        const collection = storageCache[storage];
        result[key] = collection.find((i) => i.id === obj[fkField]) || null;
      }
    });
    return result;
  }

  _formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  _formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  _formatPrice(value) {
    if (typeof value !== 'number') return '';
    return '$' + value.toFixed(2);
  }

  _getTimeOfDayFromDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return h + ':' + m;
  }

  // Internal helper to determine current season
  _getCurrentSeason() {
    const seasons = this._getFromStorage('seasons');
    if (!seasons.length) return null;
    const now = new Date();
    let active = seasons.find(
      (s) => s.startDate && s.endDate && new Date(s.startDate) <= now && now <= new Date(s.endDate)
    );
    if (active) return active;
    // Fallback: most recent by startDate or year
    const copy = seasons.slice();
    copy.sort((a, b) => {
      if (a.startDate && b.startDate) {
        return new Date(b.startDate) - new Date(a.startDate);
      }
      if (a.year && b.year) return b.year - a.year;
      return 0;
    });
    return copy[0] || null;
  }

  // Approximate distance in miles from zip to field
  _calculateDistanceFromZip(zip, field) {
    if (!field) return null;
    if (field.zip && zip && field.zip === zip) return 0;
    const zipNum = parseInt(zip, 10);
    const fieldZipNum = parseInt(field.zip || '', 10);
    if (!Number.isNaN(zipNum) && !Number.isNaN(fieldZipNum)) {
      const diff = Math.abs(zipNum - fieldZipNum);
      return Math.round((diff / 10) * 10) / 10;
    }
    if (typeof field.latitude === 'number' && typeof field.longitude === 'number') {
      return 5;
    }
    return 10;
  }

  // Apply schedule filters/sorting
  _applyGameFiltersAndSorting(games, options) {
    const { seasonId, divisionId, teamId, startDate, endDate, location, sortBy } = options || {};
    let result = games;
    if (seasonId) {
      result = result.filter((g) => g.seasonId === seasonId);
    }
    if (divisionId) {
      result = result.filter((g) => g.divisionId === divisionId);
    }
    if (teamId) {
      result = result.filter((g) => g.homeTeamId === teamId || g.awayTeamId === teamId);
      if (location === 'home') {
        result = result.filter((g) => g.homeTeamId === teamId);
      } else if (location === 'away') {
        result = result.filter((g) => g.awayTeamId === teamId);
      }
    }
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const end = endDate ? new Date(endDate + 'T23:59:59.999') : null;
      result = result.filter((g) => {
        const dt = new Date(g.dateTime);
        if (start && dt < start) return false;
        if (end && dt > end) return false;
        return true;
      });
    }
    const sort = sortBy || 'date_time_asc';
    const sorted = result.slice().sort((a, b) => {
      const da = new Date(a.dateTime).getTime();
      const db = new Date(b.dateTime).getTime();
      if (sort === 'date_time_desc') return db - da;
      return da - db;
    });
    return sorted;
  }

  // Apply shop product filters/sorting
  _applyProductFiltersAndSorting(products, options) {
    const { category, minPrice, maxPrice, size, hasLeagueLogo, sortBy } = options || {};
    let result = products.filter((p) => p.isActive !== false);
    if (category) {
      result = result.filter((p) => p.category === category);
    }
    if (typeof minPrice === 'number') {
      result = result.filter((p) => p.price >= minPrice);
    }
    if (typeof maxPrice === 'number') {
      result = result.filter((p) => p.price <= maxPrice);
    }
    if (size) {
      result = result.filter((p) => p.size === size);
    }
    if (typeof hasLeagueLogo === 'boolean') {
      result = result.filter((p) => p.hasLeagueLogo === hasLeagueLogo);
    }
    const sort = sortBy || 'name_asc';
    const sorted = result.slice().sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      if (sort === 'name_desc') return (b.name || '').localeCompare(a.name || '');
      return (a.name || '').localeCompare(b.name || '');
    });
    return sorted;
  }

  // Ensure a FavoriteList record exists by name
  _ensureFavoriteListExists(name) {
    const lists = this._getFromStorage('favorite_lists');
    let list = lists.find((l) => l.name === name);
    if (!list) {
      list = {
        id: this._generateId('favorite_list'),
        name,
        description: ''
      };
      lists.push(list);
      this._saveToStorage('favorite_lists', lists);
    }
    return list;
  }

  // Get or create single-user cart
  _getOrCreateCart() {
    const carts = this._getFromStorage('cart');
    let cart = carts[0];
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      const newCarts = carts.slice();
      newCarts.push(cart);
      this._saveToStorage('cart', newCarts);
    }
    return cart;
  }

  // =========================
  // Interface implementations
  // =========================

  // getHomepageHighlights
  getHomepageHighlights() {
    const currentSeason = this._getCurrentSeason();
    const games = this._getFromStorage('games');
    const camps = this._getFromStorage('camps');
    const news = this._getFromStorage('news_articles');
    const divisions = this._getFromStorage('divisions');
    const teams = this._getFromStorage('teams');
    const fields = this._getFromStorage('fields');
    const now = new Date();

    let nextGamesRaw = games.filter((g) => new Date(g.dateTime) >= now);
    if (currentSeason) {
      nextGamesRaw = nextGamesRaw.filter((g) => g.seasonId === currentSeason.id);
    }
    nextGamesRaw = nextGamesRaw
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
      .slice(0, 5);

    const nextGames = nextGamesRaw.map((g) => {
      const gameExt = this._resolveForeignKeys(g);
      const division = divisions.find((d) => d.id === g.divisionId);
      const homeTeam = teams.find((t) => t.id === g.homeTeamId);
      const awayTeam = teams.find((t) => t.id === g.awayTeamId);
      const field = fields.find((f) => f.id === g.fieldId);
      return {
        game: gameExt,
        divisionName: division ? division.name : '',
        homeTeamName: homeTeam ? homeTeam.name : '',
        awayTeamName: awayTeam ? awayTeam.name : '',
        fieldName: field ? field.name : '',
        formattedDate: this._formatDate(g.dateTime),
        formattedTime: this._formatTime(g.dateTime)
      };
    });

    let upcomingCampsRaw = camps.filter((c) => new Date(c.startDate) >= now);
    if (currentSeason) {
      upcomingCampsRaw = upcomingCampsRaw.filter((c) => !c.seasonId || c.seasonId === currentSeason.id);
    }
    upcomingCampsRaw = upcomingCampsRaw
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 5);

    const upcomingCamps = upcomingCampsRaw.map((c) => {
      const campExt = this._resolveForeignKeys(c);
      const field = fields.find((f) => f.id === c.fieldId);
      const ageRangeLabel =
        typeof c.ageMin === 'number' && typeof c.ageMax === 'number' ? c.ageMin + '-' + c.ageMax : '';
      const dateRangeLabel = this._formatDate(c.startDate) + ' - ' + this._formatDate(c.endDate);
      const dailyTimeLabel = (c.dailyStartTime || '') + (c.dailyEndTime ? ' - ' + c.dailyEndTime : '');
      return {
        camp: campExt,
        ageRangeLabel,
        dateRangeLabel,
        dailyTimeLabel,
        fieldName: field ? field.name : ''
      };
    });

    let latestNewsRaw = news.filter((a) => a.isActive !== false);
    latestNewsRaw = latestNewsRaw
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, 5);

    const categoryLabelMap = {
      weather_cancellations: 'Weather & Cancellations',
      general_news: 'General News',
      league_updates: 'League Updates',
      events: 'Events'
    };

    const latestNews = latestNewsRaw.map((a) => {
      const articleExt = this._resolveForeignKeys(a);
      const field = fields.find((f) => f.id === a.fieldId);
      return {
        article: articleExt,
        categoryLabel: categoryLabelMap[a.category] || '',
        publishedDateLabel: this._formatDate(a.publishedAt),
        fieldName: field ? field.name : ''
      };
    });

    return {
      currentSeason,
      nextGames,
      upcomingCamps,
      latestNews
    };
  }

  // getScheduleFilterOptions
  getScheduleFilterOptions() {
    const seasons = this._getFromStorage('seasons');
    const divisions = this._getFromStorage('divisions');
    const teams = this._getFromStorage('teams');
    const locations = [
      { value: 'all', label: 'All' },
      { value: 'home', label: 'Home' },
      { value: 'away', label: 'Away' }
    ];
    const currentSeason = this._getCurrentSeason();
    const defaultSeasonId = currentSeason
      ? currentSeason.id
      : seasons[0]
      ? seasons[0].id
      : null;
    return { seasons, divisions, teams, locations, defaultSeasonId };
  }

  // getGames
  getGames(seasonId, divisionId, teamId, startDate, endDate, location, sortBy) {
    const allGames = this._getFromStorage('games');
    const filteredGames = this._applyGameFiltersAndSorting(allGames, {
      seasonId,
      divisionId,
      teamId,
      startDate,
      endDate,
      location,
      sortBy
    });

    const divisions = this._getFromStorage('divisions');
    const teams = this._getFromStorage('teams');
    const fields = this._getFromStorage('fields');
    const savedGames = this._getFromStorage('saved_games');

    return filteredGames.map((g) => {
      const gameExt = this._resolveForeignKeys(g);
      const division = divisions.find((d) => d.id === g.divisionId);
      const homeTeam = teams.find((t) => t.id === g.homeTeamId);
      const awayTeam = teams.find((t) => t.id === g.awayTeamId);
      const field = fields.find((f) => f.id === g.fieldId);
      const isHomeGameForFilteredTeam = !!(teamId && g.homeTeamId === teamId);
      let locationLabel = '';
      if (teamId) {
        if (g.homeTeamId === teamId) locationLabel = 'Home';
        else if (g.awayTeamId === teamId) locationLabel = 'Away';
      }
      const alreadySaved = savedGames.some((sg) => sg.gameId === g.id);
      return {
        game: gameExt,
        divisionName: division ? division.name : '',
        homeTeamName: homeTeam ? homeTeam.name : '',
        awayTeamName: awayTeam ? awayTeam.name : '',
        fieldName: field ? field.name : '',
        isHomeGameForFilteredTeam,
        formattedDate: this._formatDate(g.dateTime),
        formattedTime: this._formatTime(g.dateTime),
        locationLabel,
        canAddToMySchedule: !alreadySaved
      };
    });
  }

  // addGameToMySchedule
  addGameToMySchedule(gameId) {
    const games = this._getFromStorage('games');
    const game = games.find((g) => g.id === gameId);
    if (!game) {
      return { success: false, savedGame: null, message: 'Game not found' };
    }
    const savedGames = this._getFromStorage('saved_games');
    const existing = savedGames.find((sg) => sg.gameId === gameId);
    if (existing) {
      return { success: true, savedGame: existing, message: 'Game already in My Schedule' };
    }
    const savedGame = {
      id: this._generateId('saved_game'),
      gameId,
      addedAt: new Date().toISOString()
    };
    savedGames.push(savedGame);
    this._saveToStorage('saved_games', savedGames);
    return { success: true, savedGame, message: 'Game added to My Schedule' };
  }

  // getMySchedule
  getMySchedule() {
    const savedGames = this._getFromStorage('saved_games');
    const games = this._getFromStorage('games');
    const divisions = this._getFromStorage('divisions');
    const teams = this._getFromStorage('teams');
    const fields = this._getFromStorage('fields');

    return savedGames.map((sg) => {
      const game = games.find((g) => g.id === sg.gameId);
      const gameExt = game ? this._resolveForeignKeys(game) : null;
      const division = game ? divisions.find((d) => d.id === game.divisionId) : null;
      const homeTeam = game ? teams.find((t) => t.id === game.homeTeamId) : null;
      const awayTeam = game ? teams.find((t) => t.id === game.awayTeamId) : null;
      const field = game ? fields.find((f) => f.id === game.fieldId) : null;
      return {
        savedGame: this._resolveForeignKeys(sg),
        game: gameExt,
        divisionName: division ? division.name : '',
        homeTeamName: homeTeam ? homeTeam.name : '',
        awayTeamName: awayTeam ? awayTeam.name : '',
        fieldName: field ? field.name : '',
        formattedDate: game ? this._formatDate(game.dateTime) : '',
        formattedTime: game ? this._formatTime(game.dateTime) : ''
      };
    });
  }

  // getCampsFilterOptions
  getCampsFilterOptions() {
    const seasons = this._getFromStorage('seasons');
    const ageRanges = [
      { label: 'Ages 5-6', minAge: 5, maxAge: 6 },
      { label: 'Ages 7-8', minAge: 7, maxAge: 8 },
      { label: 'Ages 9-10', minAge: 9, maxAge: 10 },
      { label: 'Ages 11-12', minAge: 11, maxAge: 12 }
    ];
    const campTypes = [
      { value: 'camp', label: 'Camp' },
      { value: 'clinic', label: 'Clinic' }
    ];
    const defaultSpringBreakDateRange = {
      startDate: '2025-03-15',
      endDate: '2025-03-31'
    };
    return { seasons, ageRanges, campTypes, defaultSpringBreakDateRange };
  }

  // getCampsAndClinics
  getCampsAndClinics(
    minAge,
    maxAge,
    seasonId,
    campType,
    startDate,
    endDate,
    isSpringBreak,
    sortBy
  ) {
    const camps = this._getFromStorage('camps');
    const fields = this._getFromStorage('fields');

    let result = camps.slice();

    if (typeof minAge === 'number' || typeof maxAge === 'number') {
      result = result.filter((c) => {
        const cMin = typeof c.ageMin === 'number' ? c.ageMin : null;
        const cMax = typeof c.ageMax === 'number' ? c.ageMax : null;
        const minOk = typeof minAge === 'number' ? cMax == null || cMax >= minAge : true;
        const maxOk = typeof maxAge === 'number' ? cMin == null || cMin <= maxAge : true;
        return minOk && maxOk;
      });
    }
    if (seasonId) {
      result = result.filter((c) => c.seasonId === seasonId);
    }
    if (campType) {
      result = result.filter((c) => c.campType === campType);
    }
    if (typeof isSpringBreak === 'boolean') {
      result = result.filter((c) => !!c.isSpringBreak === isSpringBreak);
    }
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const endD = endDate ? new Date(endDate + 'T23:59:59.999') : null;
      result = result.filter((c) => {
        const sd = new Date(c.startDate);
        const ed = new Date(c.endDate);
        if (start && ed < start) return false;
        if (endD && sd > endD) return false;
        return true;
      });
    }

    const sort = sortBy || 'date_asc';
    result = result.slice().sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      if (sort === 'date_desc') return new Date(b.startDate) - new Date(a.startDate);
      if (sort === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      // date_asc default
      return new Date(a.startDate) - new Date(b.startDate);
    });

    return result.map((c) => {
      const campExt = this._resolveForeignKeys(c);
      const field = fields.find((f) => f.id === c.fieldId);
      const ageRangeLabel =
        typeof c.ageMin === 'number' && typeof c.ageMax === 'number' ? c.ageMin + '-' + c.ageMax : '';
      const dateRangeLabel = this._formatDate(c.startDate) + ' - ' + this._formatDate(c.endDate);
      const dailyTimeLabel = (c.dailyStartTime || '') + (c.dailyEndTime ? ' - ' + c.dailyEndTime : '');
      const priceLabel = this._formatPrice(c.price);
      return {
        camp: campExt,
        ageRangeLabel,
        dateRangeLabel,
        dailyTimeLabel,
        fieldName: field ? field.name : '',
        priceLabel
      };
    });
  }

  // getCampDetails
  getCampDetails(campId) {
    const camps = this._getFromStorage('camps');
    const fields = this._getFromStorage('fields');
    const seasons = this._getFromStorage('seasons');
    const camp = camps.find((c) => c.id === campId) || null;
    if (!camp) {
      return {
        camp: null,
        field: null,
        season: null,
        ageRangeLabel: '',
        dateRangeLabel: '',
        dailyTimeLabel: '',
        priceLabel: '',
        canRegister: false
      };
    }
    const campExt = this._resolveForeignKeys(camp);
    const field = fields.find((f) => f.id === camp.fieldId) || null;
    const season = seasons.find((s) => s.id === camp.seasonId) || null;
    const ageRangeLabel =
      typeof camp.ageMin === 'number' && typeof camp.ageMax === 'number' ? camp.ageMin + '-' + camp.ageMax : '';
    const dateRangeLabel = this._formatDate(camp.startDate) + ' - ' + this._formatDate(camp.endDate);
    const dailyTimeLabel = (camp.dailyStartTime || '') + (camp.dailyEndTime ? ' - ' + camp.dailyEndTime : '');
    const priceLabel = this._formatPrice(camp.price);
    const now = new Date();
    // In this simplified environment, treat all listed camps/clinics as open for registration
    const canRegister = true;
    return {
      camp: campExt,
      field,
      season,
      ageRangeLabel,
      dateRangeLabel,
      dailyTimeLabel,
      priceLabel,
      canRegister
    };
  }

  // registerForCamp
  registerForCamp(
    campId,
    playerName,
    playerDateOfBirth,
    playerCurrentAge,
    emergencyContactPhone,
    paymentMethod
  ) {
    const camps = this._getFromStorage('camps');
    const registrations = this._getFromStorage('camp_registrations');
    const camp = camps.find((c) => c.id === campId);
    if (!camp) {
      return {
        success: false,
        registration: null,
        camp: null,
        reviewSummary: null,
        message: 'Camp not found'
      };
    }
    if (paymentMethod !== 'pay_at_field' && paymentMethod !== 'credit_card') {
      return {
        success: false,
        registration: null,
        camp: null,
        reviewSummary: null,
        message: 'Invalid payment method'
      };
    }
    const registration = {
      id: this._generateId('camp_registration'),
      campId,
      playerName,
      playerDateOfBirth,
      playerCurrentAge,
      emergencyContactPhone,
      paymentMethod,
      status: 'pending',
      registrationDate: new Date().toISOString(),
      notes: ''
    };
    registrations.push(registration);
    this._saveToStorage('camp_registrations', registrations);

    const dateRangeLabel = this._formatDate(camp.startDate) + ' - ' + this._formatDate(camp.endDate);
    const dailyTimeLabel = (camp.dailyStartTime || '') + (camp.dailyEndTime ? ' - ' + camp.dailyEndTime : '');
    const paymentMethodLabel = paymentMethod === 'pay_at_field' ? 'Pay at Field' : 'Credit Card';
    const priceLabel = this._formatPrice(camp.price);
    const reviewSummary = {
      playerName,
      campName: camp.name,
      dateRangeLabel,
      dailyTimeLabel,
      paymentMethodLabel,
      priceLabel
    };
    return {
      success: true,
      registration: this._resolveForeignKeys(registration),
      camp: this._resolveForeignKeys(camp),
      reviewSummary,
      message: 'Registration submitted'
    };
  }

  // getVolunteerFilterOptions
  getVolunteerFilterOptions() {
    const roles = [
      { value: 'scorekeeper', label: 'Scorekeeper' },
      { value: 'concessions', label: 'Concessions' },
      { value: 'field_crew', label: 'Field Crew' },
      { value: 'announcer', label: 'Announcer' }
    ];
    const fields = this._getFromStorage('fields');
    const seasons = this._getFromStorage('seasons');
    return { roles, fields, seasons };
  }

  // getVolunteerSlots
  getVolunteerSlots(
    role,
    seasonId,
    month,
    startDate,
    endDate,
    fieldId,
    earliestStartTime,
    latestStartTime
  ) {
    const slots = this._getFromStorage('volunteer_slots');
    const divisions = this._getFromStorage('divisions');
    const teams = this._getFromStorage('teams');
    const fields = this._getFromStorage('fields');

    let result = slots.slice();

    if (role) {
      result = result.filter((s) => s.role === role);
    }
    if (seasonId) {
      result = result.filter((s) => s.seasonId === seasonId);
    }
    if (month) {
      const parts = month.split('-');
      const year = parseInt(parts[0], 10);
      const mon = parseInt(parts[1], 10) - 1;
      result = result.filter((s) => {
        const d = new Date(s.dateTime);
        return d.getFullYear() === year && d.getMonth() === mon;
      });
    }
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate + 'T00:00:00') : null;
      const endD = endDate ? new Date(endDate + 'T23:59:59.999') : null;
      result = result.filter((s) => {
        const dt = new Date(s.dateTime);
        if (start && dt < start) return false;
        if (endD && dt > endD) return false;
        return true;
      });
    }
    if (fieldId) {
      result = result.filter((s) => s.fieldId === fieldId);
    }
    if (earliestStartTime || latestStartTime) {
      result = result.filter((s) => {
        const time = this._getTimeOfDayFromDateTime(s.dateTime);
        if (earliestStartTime && time < earliestStartTime) return false;
        if (latestStartTime && time > latestStartTime) return false;
        return true;
      });
    }

    const statusLabelMap = {
      open: 'Open',
      filled: 'Filled',
      cancelled: 'Cancelled'
    };

    return result.map((s) => {
      const slotExt = this._resolveForeignKeys(s);
      const division = s.divisionId ? divisions.find((d) => d.id === s.divisionId) : null;
      const homeTeam = s.homeTeamId ? teams.find((t) => t.id === s.homeTeamId) : null;
      const awayTeam = s.awayTeamId ? teams.find((t) => t.id === s.awayTeamId) : null;
      const field = fields.find((f) => f.id === s.fieldId);
      const d = new Date(s.dateTime);
      const day = d.getDay(); // 0=Sun, 6=Sat
      const isWeekday = day >= 1 && day <= 5;
      const isSaturday = day === 6;
      return {
        slot: slotExt,
        divisionName: division ? division.name : '',
        homeTeamName: homeTeam ? homeTeam.name : '',
        awayTeamName: awayTeam ? awayTeam.name : '',
        fieldName: field ? field.name : '',
        formattedDate: this._formatDate(s.dateTime),
        formattedTime: this._formatTime(s.dateTime),
        statusLabel: statusLabelMap[s.status] || '',
        isWeekday,
        isSaturday
      };
    });
  }

  // signUpForVolunteerSlot
  signUpForVolunteerSlot(volunteerSlotId, fullName, email, mobilePhone, preferredContactMethod) {
    const slots = this._getFromStorage('volunteer_slots');
    const slotIndex = slots.findIndex((s) => s.id === volunteerSlotId);
    if (slotIndex === -1) {
      return { success: false, signup: null, slot: null, message: 'Volunteer slot not found' };
    }
    const slot = slots[slotIndex];
    if (slot.status !== 'open') {
      return {
        success: false,
        signup: null,
        slot: this._resolveForeignKeys(slot),
        message: 'Volunteer slot is not open'
      };
    }
    if (!['text_message', 'email', 'phone_call'].includes(preferredContactMethod)) {
      return {
        success: false,
        signup: null,
        slot: this._resolveForeignKeys(slot),
        message: 'Invalid contact method'
      };
    }
    const signups = this._getFromStorage('volunteer_signups');
    const signup = {
      id: this._generateId('volunteer_signup'),
      volunteerSlotId,
      fullName,
      email,
      mobilePhone,
      preferredContactMethod,
      signedUpAt: new Date().toISOString()
    };
    signups.push(signup);
    slot.status = 'filled';
    const updatedSlots = slots.slice();
    updatedSlots[slotIndex] = slot;
    this._saveToStorage('volunteer_signups', signups);
    this._saveToStorage('volunteer_slots', updatedSlots);
    return {
      success: true,
      signup: this._resolveForeignKeys(signup),
      slot: this._resolveForeignKeys(slot),
      message: 'Volunteer signup submitted'
    };
  }

  // searchFields
  searchFields(zip, hasLights, hasRestrooms, hasBattingCages, hasParking, sortBy) {
    const fields = this._getFromStorage('fields');
    let result = fields.slice();
    if (typeof hasLights === 'boolean') {
      result = result.filter((f) => !!f.hasLights === hasLights);
    }
    if (typeof hasRestrooms === 'boolean') {
      result = result.filter((f) => !!f.hasRestrooms === hasRestrooms);
    }
    if (typeof hasBattingCages === 'boolean') {
      result = result.filter((f) => !!f.hasBattingCages === hasBattingCages);
    }
    if (typeof hasParking === 'boolean') {
      result = result.filter((f) => !!f.hasParking === hasParking);
    }

    const withDistances = result.map((f) => {
      const distanceMiles = this._calculateDistanceFromZip(zip, f);
      const distanceLabel = distanceMiles != null ? distanceMiles.toFixed(1) + ' mi' : '';
      const facilities = [];
      if (f.hasLights) facilities.push('Lights');
      if (f.hasRestrooms) facilities.push('Restrooms');
      if (f.hasBattingCages) facilities.push('Batting Cages');
      if (f.hasParking) facilities.push('Parking');
      const facilitySummary = facilities.join(', ');
      return {
        field: f,
        distanceMiles,
        distanceLabel,
        facilitySummary
      };
    });

    const sort = sortBy || 'distance_asc';
    withDistances.sort((a, b) => {
      if (sort === 'name_asc') {
        return (a.field.name || '').localeCompare(b.field.name || '');
      }
      const da = typeof a.distanceMiles === 'number' ? a.distanceMiles : Number.POSITIVE_INFINITY;
      const db = typeof b.distanceMiles === 'number' ? b.distanceMiles : Number.POSITIVE_INFINITY;
      return da - db;
    });

    return withDistances;
  }

  // getFieldDetails
  getFieldDetails(fieldId) {
    const fields = this._getFromStorage('fields');
    const games = this._getFromStorage('games');
    const divisions = this._getFromStorage('divisions');
    const teams = this._getFromStorage('teams');
    const savedFields = this._getFromStorage('saved_fields');

    const field = fields.find((f) => f.id === fieldId) || null;
    if (!field) {
      return {
        field: null,
        fullAddressLabel: '',
        facilityFlags: {
          hasLights: false,
          hasRestrooms: false,
          hasBattingCages: false,
          hasParking: false
        },
        rulesText: '',
        upcomingGames: [],
        isSavedToMyFields: false
      };
    }
    const fieldExt = this._resolveForeignKeys(field);
    const addressParts = [
      field.addressLine1,
      field.addressLine2,
      field.city,
      field.state,
      field.zip
    ].filter(Boolean);
    const fullAddressLabel = addressParts.join(', ');
    const facilityFlags = {
      hasLights: !!field.hasLights,
      hasRestrooms: !!field.hasRestrooms,
      hasBattingCages: !!field.hasBattingCages,
      hasParking: !!field.hasParking
    };
    const now = new Date();
    const upcomingGamesRaw = games
      .filter((g) => g.fieldId === fieldId && new Date(g.dateTime) >= now)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
      .slice(0, 10);
    const upcomingGames = upcomingGamesRaw.map((g) => {
      const gameExt = this._resolveForeignKeys(g);
      const division = divisions.find((d) => d.id === g.divisionId);
      const homeTeam = teams.find((t) => t.id === g.homeTeamId);
      const awayTeam = teams.find((t) => t.id === g.awayTeamId);
      return {
        game: gameExt,
        divisionName: division ? division.name : '',
        homeTeamName: homeTeam ? homeTeam.name : '',
        awayTeamName: awayTeam ? awayTeam.name : '',
        formattedDate: this._formatDate(g.dateTime),
        formattedTime: this._formatTime(g.dateTime)
      };
    });
    const isSavedToMyFields = savedFields.some((sf) => sf.fieldId === fieldId);
    return {
      field: fieldExt,
      fullAddressLabel,
      facilityFlags,
      rulesText: field.rulesText || '',
      upcomingGames,
      isSavedToMyFields
    };
  }

  // saveFieldToMyFields
  saveFieldToMyFields(fieldId) {
    const fields = this._getFromStorage('fields');
    const field = fields.find((f) => f.id === fieldId);
    if (!field) {
      return { success: false, savedField: null, message: 'Field not found' };
    }
    const savedFields = this._getFromStorage('saved_fields');
    const existing = savedFields.find((sf) => sf.fieldId === fieldId);
    if (existing) {
      return { success: true, savedField: existing, message: 'Field already saved' };
    }
    const savedField = {
      id: this._generateId('saved_field'),
      fieldId,
      addedAt: new Date().toISOString()
    };
    savedFields.push(savedField);
    this._saveToStorage('saved_fields', savedFields);
    return { success: true, savedField, message: 'Field saved to My Fields' };
  }

  // getRulesFilterOptions
  getRulesFilterOptions() {
    const seasons = this._getFromStorage('seasons');
    const divisions = this._getFromStorage('divisions');
    const categories = [
      { value: 'equipment', label: 'Equipment' },
      { value: 'general_rules', label: 'General Rules' },
      { value: 'code_of_conduct', label: 'Code of Conduct' },
      { value: 'safety', label: 'Safety' },
      { value: 'other', label: 'Other' }
    ];
    const currentSeason = this._getCurrentSeason();
    const defaultSeasonId = currentSeason
      ? currentSeason.id
      : seasons[0]
      ? seasons[0].id
      : null;
    return { seasons, divisions, categories, defaultSeasonId };
  }

  // getRuleDocuments
  getRuleDocuments(seasonId, divisionId, category) {
    const docs = this._getFromStorage('rule_documents');
    let result = docs.slice();
    if (seasonId) {
      result = result.filter((d) => d.seasonId === seasonId);
    }
    if (divisionId) {
      result = result.filter((d) => d.divisionId === divisionId);
    }
    if (category) {
      result = result.filter((d) => d.category === category);
    }
    return result.map((d) => this._resolveForeignKeys(d));
  }

  // getRuleDocumentDetail
  getRuleDocumentDetail(ruleDocumentId) {
    const docs = this._getFromStorage('rule_documents');
    const seasons = this._getFromStorage('seasons');
    const divisions = this._getFromStorage('divisions');
    const savedDocs = this._getFromStorage('saved_documents');
    const document = docs.find((d) => d.id === ruleDocumentId) || null;
    if (!document) {
      return {
        document: null,
        season: null,
        division: null,
        categoryLabel: '',
        isBookmarked: false
      };
    }
    const season = document.seasonId ? seasons.find((s) => s.id === document.seasonId) : null;
    const division = document.divisionId ? divisions.find((d) => d.id === document.divisionId) : null;
    const categoryLabelMap = {
      equipment: 'Equipment',
      general_rules: 'General Rules',
      code_of_conduct: 'Code of Conduct',
      safety: 'Safety',
      other: 'Other'
    };
    const isBookmarked = savedDocs.some((sd) => sd.ruleDocumentId === ruleDocumentId);
    return {
      document: this._resolveForeignKeys(document),
      season,
      division,
      categoryLabel: categoryLabelMap[document.category] || '',
      isBookmarked
    };
  }

  // saveRuleDocumentBookmark
  saveRuleDocumentBookmark(ruleDocumentId, customLabel) {
    const docs = this._getFromStorage('rule_documents');
    const doc = docs.find((d) => d.id === ruleDocumentId);
    if (!doc) {
      return { success: false, savedDocument: null, message: 'Rule document not found' };
    }
    const savedDocs = this._getFromStorage('saved_documents');
    const savedDocument = {
      id: this._generateId('saved_document'),
      ruleDocumentId,
      customLabel,
      savedAt: new Date().toISOString()
    };
    savedDocs.push(savedDocument);
    this._saveToStorage('saved_documents', savedDocs);
    return { success: true, savedDocument, message: 'Rule document bookmarked' };
  }

  // getTeamsFilterOptions
  getTeamsFilterOptions() {
    const seasons = this._getFromStorage('seasons');
    const divisions = this._getFromStorage('divisions');
    const currentSeason = this._getCurrentSeason();
    const defaultSeasonId = currentSeason
      ? currentSeason.id
      : seasons[0]
      ? seasons[0].id
      : null;
    return { seasons, divisions, defaultSeasonId };
  }

  // getTeams
  getTeams(seasonId, divisionId, searchQuery) {
    const teams = this._getFromStorage('teams');
    const divisions = this._getFromStorage('divisions');
    const seasons = this._getFromStorage('seasons');
    const fields = this._getFromStorage('fields');

    let result = teams.slice();
    if (seasonId) {
      result = result.filter((t) => t.seasonId === seasonId);
    }
    if (divisionId) {
      result = result.filter((t) => t.divisionId === divisionId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => (t.name || '').toLowerCase().includes(q));
    }

    return result.map((t) => {
      const teamExt = this._resolveForeignKeys(t);
      const division = divisions.find((d) => d.id === t.divisionId);
      const season = seasons.find((s) => s.id === t.seasonId);
      const primaryField = t.primaryFieldId ? fields.find((f) => f.id === t.primaryFieldId) : null;
      return {
        team: teamExt,
        divisionName: division ? division.name : '',
        seasonName: season ? season.name : '',
        coachName: t.coachName || '',
        primaryFieldName: primaryField ? primaryField.name : ''
      };
    });
  }

  // getTeamDetail
  getTeamDetail(teamId) {
    const teams = this._getFromStorage('teams');
    const divisions = this._getFromStorage('divisions');
    const seasons = this._getFromStorage('seasons');
    const fields = this._getFromStorage('fields');
    const games = this._getFromStorage('games');
    const shares = this._getFromStorage('team_announcement_shares');
    const articles = this._getFromStorage('news_articles');

    const team = teams.find((t) => t.id === teamId) || null;
    if (!team) {
      return {
        team: null,
        division: null,
        season: null,
        primaryField: null,
        upcomingGames: [],
        announcements: [],
        isFavoriteInFavoriteTeamsList: false
      };
    }
    const division = divisions.find((d) => d.id === team.divisionId) || null;
    const season = seasons.find((s) => s.id === team.seasonId) || null;
    const primaryField = team.primaryFieldId ? fields.find((f) => f.id === team.primaryFieldId) : null;

    const now = new Date();
    const upcomingGamesRaw = games
      .filter((g) => (g.homeTeamId === teamId || g.awayTeamId === teamId) && new Date(g.dateTime) >= now)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
    const upcomingGames = upcomingGamesRaw.map((g) => {
      const field = fields.find((f) => f.id === g.fieldId);
      return {
        game: this._resolveForeignKeys(g),
        fieldName: field ? field.name : '',
        formattedDate: this._formatDate(g.dateTime),
        formattedTime: this._formatTime(g.dateTime)
      };
    });

    const teamShares = shares.filter((s) => s.teamId === teamId);
    const announcements = teamShares.map((s) => {
      const article = articles.find((a) => a.id === s.articleId) || null;
      return {
        article: article ? this._resolveForeignKeys(article) : null,
        sharedAt: s.sharedAt
      };
    });

    const favoriteList = this._ensureFavoriteListExists('Favorite Teams');
    const favoriteTeams = this._getFromStorage('favorite_teams');
    const isFavoriteInFavoriteTeamsList = favoriteTeams.some(
      (ft) => ft.favoriteListId === favoriteList.id && ft.teamId === teamId
    );

    return {
      team: this._resolveForeignKeys(team),
      division,
      season,
      primaryField,
      upcomingGames,
      announcements,
      isFavoriteInFavoriteTeamsList
    };
  }

  // sendCoachMessage
  sendCoachMessage(teamId, parentName, parentEmail, subject, messageBody) {
    const teams = this._getFromStorage('teams');
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      return { success: false, messageRecord: null, message: 'Team not found' };
    }
    const messages = this._getFromStorage('coach_messages');
    const messageRecord = {
      id: this._generateId('coach_message'),
      teamId,
      parentName,
      parentEmail,
      subject,
      messageBody,
      sentAt: new Date().toISOString()
    };
    messages.push(messageRecord);
    this._saveToStorage('coach_messages', messages);
    return {
      success: true,
      messageRecord: this._resolveForeignKeys(messageRecord),
      message: 'Message sent to coach'
    };
  }

  // getStandingsFilterOptions
  getStandingsFilterOptions() {
    const seasons = this._getFromStorage('seasons');
    const divisions = this._getFromStorage('divisions');
    const currentSeason = this._getCurrentSeason();
    const defaultSeasonId = currentSeason
      ? currentSeason.id
      : seasons[0]
      ? seasons[0].id
      : null;
    return { seasons, divisions, defaultSeasonId };
  }

  // getStandings
  getStandings(seasonId, divisionId, minimumWins, sortBy) {
    const records = this._getFromStorage('standings_records');
    const teams = this._getFromStorage('teams');
    const divisions = this._getFromStorage('divisions');
    const favoriteList = this._ensureFavoriteListExists('Favorite Teams');
    const favoriteTeams = this._getFromStorage('favorite_teams');

    let result = records.filter((r) => r.seasonId === seasonId && r.divisionId === divisionId);
    if (typeof minimumWins === 'number') {
      result = result.filter((r) => r.wins >= minimumWins);
    }
    const sort = sortBy || 'win_percentage_desc';
    result = result.slice().sort((a, b) => {
      if (sort === 'win_percentage_asc') return a.winPercentage - b.winPercentage;
      if (sort === 'wins_desc') return b.wins - a.wins;
      if (sort === 'wins_asc') return a.wins - b.wins;
      return b.winPercentage - a.winPercentage;
    });

    return result.map((r, index) => {
      const team = teams.find((t) => t.id === r.teamId);
      const division = divisions.find((d) => d.id === r.divisionId);
      const isFavorite = favoriteTeams.some(
        (ft) => ft.favoriteListId === favoriteList.id && ft.teamId === r.teamId
      );
      const winLossLabel = [r.wins, r.losses, typeof r.ties === 'number' ? r.ties : 0].join('-');
      const winPercentageLabel = r.winPercentage != null ? r.winPercentage.toFixed(3) : '';
      return {
        rank: index + 1,
        record: this._resolveForeignKeys(r),
        teamName: team ? team.name : '',
        divisionName: division ? division.name : '',
        winLossLabel,
        winPercentageLabel,
        isFavoriteInFavoriteTeamsList: isFavorite
      };
    });
  }

  // getFavoriteLists
  getFavoriteLists() {
    return this._getFromStorage('favorite_lists');
  }

  // addTeamToFavoriteList
  addTeamToFavoriteList(teamId, favoriteListId) {
    const teams = this._getFromStorage('teams');
    const team = teams.find((t) => t.id === teamId);
    // Allow adding favorite teams even if full team record is not present in storage,
    // as long as a valid teamId is provided.
    if (!team && !teamId) {
      return { success: false, favoriteTeam: null, message: 'Team not found' };
    }
    const lists = this._getFromStorage('favorite_lists');
    const list = lists.find((l) => l.id === favoriteListId);
    if (!list) {
      return { success: false, favoriteTeam: null, message: 'Favorite list not found' };
    }
    const favoriteTeams = this._getFromStorage('favorite_teams');
    let favoriteTeam = favoriteTeams.find(
      (ft) => ft.favoriteListId === favoriteListId && ft.teamId === teamId
    );
    if (favoriteTeam) {
      return { success: true, favoriteTeam, message: 'Team already in favorite list' };
    }
    favoriteTeam = {
      id: this._generateId('favorite_team'),
      favoriteListId,
      teamId,
      addedAt: new Date().toISOString()
    };
    favoriteTeams.push(favoriteTeam);
    this._saveToStorage('favorite_teams', favoriteTeams);
    return { success: true, favoriteTeam, message: 'Team added to favorite list' };
  }

  // getNewsFilterOptions
  getNewsFilterOptions() {
    const categories = [
      { value: 'weather_cancellations', label: 'Weather & Cancellations' },
      { value: 'general_news', label: 'General News' },
      { value: 'league_updates', label: 'League Updates' },
      { value: 'events', label: 'Events' }
    ];
    const fields = this._getFromStorage('fields');
    return { categories, fields };
  }

  // getNewsArticles
  getNewsArticles(category, fieldId, sortBy, onlyActive) {
    const articles = this._getFromStorage('news_articles');
    const fields = this._getFromStorage('fields');

    let result = articles.slice();
    if (category) {
      result = result.filter((a) => a.category === category);
    }
    if (fieldId) {
      result = result.filter((a) => a.fieldId === fieldId);
    }
    const activeFlag = typeof onlyActive === 'boolean' ? onlyActive : true;
    if (activeFlag) {
      result = result.filter((a) => a.isActive !== false);
    }
    const sort = sortBy || 'published_desc';
    result = result.slice().sort((a, b) => {
      const da = new Date(a.publishedAt);
      const db = new Date(b.publishedAt);
      if (sort === 'published_asc') return da - db;
      return db - da;
    });

    const categoryLabelMap = {
      weather_cancellations: 'Weather & Cancellations',
      general_news: 'General News',
      league_updates: 'League Updates',
      events: 'Events'
    };

    return result.map((a) => {
      const articleExt = this._resolveForeignKeys(a);
      const field = fields.find((f) => f.id === a.fieldId);
      return {
        article: articleExt,
        categoryLabel: categoryLabelMap[a.category] || '',
        publishedDateLabel: this._formatDate(a.publishedAt),
        fieldName: field ? field.name : ''
      };
    });
  }

  // getNewsArticleDetail
  getNewsArticleDetail(articleId) {
    const articles = this._getFromStorage('news_articles');
    const fields = this._getFromStorage('fields');
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        field: null,
        publishedDateLabel: '',
        categoryLabel: ''
      };
    }
    const field = article.fieldId ? fields.find((f) => f.id === article.fieldId) : null;
    const categoryLabelMap = {
      weather_cancellations: 'Weather & Cancellations',
      general_news: 'General News',
      league_updates: 'League Updates',
      events: 'Events'
    };
    return {
      article: this._resolveForeignKeys(article),
      field,
      publishedDateLabel: this._formatDate(article.publishedAt),
      categoryLabel: categoryLabelMap[article.category] || ''
    };
  }

  // shareNewsArticleToTeam
  shareNewsArticleToTeam(articleId, teamId) {
    const articles = this._getFromStorage('news_articles');
    const teams = this._getFromStorage('teams');
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, shareRecord: null, message: 'Article not found' };
    }
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      return { success: false, shareRecord: null, message: 'Team not found' };
    }
    const shares = this._getFromStorage('team_announcement_shares');
    const shareRecord = {
      id: this._generateId('team_announcement_share'),
      articleId,
      teamId,
      sharedAt: new Date().toISOString(),
      note: ''
    };
    shares.push(shareRecord);
    this._saveToStorage('team_announcement_shares', shares);
    return {
      success: true,
      shareRecord: this._resolveForeignKeys(shareRecord),
      message: 'Announcement shared to team page'
    };
  }

  // getShopFilterOptions
  getShopFilterOptions() {
    const categories = [
      { value: 'apparel', label: 'Apparel' },
      { value: 'equipment', label: 'Equipment' },
      { value: 'accessories', label: 'Accessories' }
    ];
    const sizes = [
      { value: 'youth', label: 'Youth' },
      { value: 'adult', label: 'Adult' },
      { value: 'one_size', label: 'One Size' }
    ];
    const logoOptions = [
      { value: true, label: 'With League Logo' },
      { value: false, label: 'Without League Logo' }
    ];
    const products = this._getFromStorage('products');
    const suggestedMaxPrice = products.length
      ? Math.ceil(Math.max.apply(null, products.map((p) => p.price || 0)))
      : 0;
    return { categories, sizes, logoOptions, suggestedMaxPrice };
  }

  // getProducts
  getProducts(category, minPrice, maxPrice, size, hasLeagueLogo, sortBy) {
    const products = this._getFromStorage('products');
    const filtered = this._applyProductFiltersAndSorting(products, {
      category,
      minPrice,
      maxPrice,
      size,
      hasLeagueLogo,
      sortBy
    });
    return filtered;
  }

  // addProductToCart
  addProductToCart(productId, quantity) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, cart: null, cartItems: [], message: 'Product not found' };
    }
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    let cartItem = cartItems.find((ci) => ci.cartId === cart.id && ci.productId === productId);
    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.unitPrice = product.price;
      cartItem.addedAt = new Date().toISOString();
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        productId,
        quantity: qty,
        unitPrice: product.price,
        addedAt: new Date().toISOString()
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.items)) {
        cart.items = [];
      }
      if (!cart.items.includes(cartItem.id)) {
        cart.items.push(cartItem.id);
      }
    }
    cart.updatedAt = new Date().toISOString();

    const carts = this._getFromStorage('cart');
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    const newCarts = carts.slice();
    if (cartIndex === -1) {
      newCarts.push(cart);
    } else {
      newCarts[cartIndex] = cart;
    }
    this._saveToStorage('cart', newCarts);
    this._saveToStorage('cart_items', cartItems);

    const updatedCartItems = cartItems
      .filter((ci) => ci.cartId === cart.id)
      .map((ci) => this._resolveForeignKeys(ci));
    return {
      success: true,
      cart,
      cartItems: updatedCartItems,
      message: 'Product added to cart'
    };
  }

  // getCartSummary
  getCartSummary() {
    const carts = this._getFromStorage('cart');
    const cart = carts[0] || null;
    if (!cart) {
      return {
        cart: null,
        items: [],
        cartTotal: 0,
        cartTotalLabel: this._formatPrice(0)
      };
    }
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cartId === cart.id && ci.quantity > 0
    );
    const products = this._getFromStorage('products');
    let cartTotal = 0;
    const items = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.productId) || null;
      const lineSubtotal = ci.quantity * ci.unitPrice;
      cartTotal += lineSubtotal;
      return {
        cartItem: this._resolveForeignKeys(ci),
        product,
        lineSubtotal
      };
    });
    return {
      cart,
      items,
      cartTotal,
      cartTotalLabel: this._formatPrice(cartTotal)
    };
  }

  // updateCartQuantities
  updateCartQuantities(items) {
    const carts = this._getFromStorage('cart');
    const cart = carts[0] || null;
    if (!cart) {
      return {
        success: false,
        cart: null,
        items: [],
        cartTotal: 0,
        cartTotalLabel: this._formatPrice(0),
        message: 'Cart not found'
      };
    }
    const cartItems = this._getFromStorage('cart_items');
    const idsToRemove = [];
    if (Array.isArray(items)) {
      items.forEach((update) => {
        const ciIndex = cartItems.findIndex(
          (ci) => ci.id === update.cartItemId && ci.cartId === cart.id
        );
        if (ciIndex !== -1) {
          const quantity = update.quantity;
          if (typeof quantity === 'number' && quantity > 0) {
            cartItems[ciIndex].quantity = quantity;
          } else {
            idsToRemove.push(cartItems[ciIndex].id);
            cartItems.splice(ciIndex, 1);
          }
        }
      });
    }
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => !idsToRemove.includes(id));
    }
    cart.updatedAt = new Date().toISOString();
    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', carts);

    const summary = this.getCartSummary();
    return {
      success: true,
      cart: summary.cart,
      items: summary.items,
      cartTotal: summary.cartTotal,
      cartTotalLabel: summary.cartTotalLabel,
      message: 'Cart updated'
    };
  }

  // getMyStuffOverview
  getMyStuffOverview() {
    const savedGamesView = this.getMySchedule();
    const savedFields = this._getFromStorage('saved_fields');
    const fields = this._getFromStorage('fields');
    const savedDocuments = this._getFromStorage('saved_documents');
    const ruleDocuments = this._getFromStorage('rule_documents');
    const favoriteTeams = this._getFromStorage('favorite_teams');
    const teams = this._getFromStorage('teams');
    const divisions = this._getFromStorage('divisions');
    const seasons = this._getFromStorage('seasons');

    const savedFieldsView = savedFields.map((sf) => {
      const field = fields.find((f) => f.id === sf.fieldId) || null;
      const addressParts = field
        ? [field.addressLine1, field.addressLine2, field.city, field.state, field.zip].filter(Boolean)
        : [];
      const fullAddressLabel = addressParts.join(', ');
      return {
        savedField: this._resolveForeignKeys(sf),
        field,
        fullAddressLabel
      };
    });

    const savedDocumentsView = savedDocuments.map((sd) => {
      const document = ruleDocuments.find((d) => d.id === sd.ruleDocumentId) || null;
      return {
        savedDocument: this._resolveForeignKeys(sd),
        document: document ? this._resolveForeignKeys(document) : null
      };
    });

    const favoriteTeamsView = favoriteTeams.map((ft) => {
      const team = teams.find((t) => t.id === ft.teamId) || null;
      const division = team ? divisions.find((d) => d.id === team.divisionId) : null;
      const season = team ? seasons.find((s) => s.id === team.seasonId) : null;
      return {
        favoriteTeam: this._resolveForeignKeys(ft),
        team: team ? this._resolveForeignKeys(team) : null,
        divisionName: division ? division.name : '',
        seasonName: season ? season.name : ''
      };
    });

    return {
      savedGames: savedGamesView,
      savedFields: savedFieldsView,
      savedDocuments: savedDocumentsView,
      favoriteTeams: favoriteTeamsView
    };
  }

  // getLeagueInfo
  getLeagueInfo() {
    const divisions = this._getFromStorage('divisions');
    const seasons = this._getFromStorage('seasons');
    const missionText =
      'To provide a fun, safe, and competitive youth baseball experience for all players.';
    const contactInfo = {
      email: 'info@exampleleague.org',
      phone: '',
      mailingAddress: ''
    };
    const leadershipSummary = '';
    return {
      missionText,
      divisions,
      seasons,
      contactInfo,
      leadershipSummary
    };
  }
}

// Browser global + Node.js export
if (typeof globalThis !== 'undefined') {
  globalThis.BusinessLogic = BusinessLogic;
  globalThis.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
