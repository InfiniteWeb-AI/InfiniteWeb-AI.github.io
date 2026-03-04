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
    const tableKeys = [
      // Core data models
      'seasons',
      'divisions',
      'season_divisions',
      'player_registrations',
      'teams',
      'season_team_standings',
      'games',
      'my_schedule_items',
      'followed_teams',
      'clinics',
      'clinic_registrations',
      'volunteer_shifts',
      'volunteer_signups',
      'policies',
      'contact_messages',
      'product_categories',
      'products',
      'shipping_methods',
      'cart_items',
      'fields',
      'carpool_plans',
      'drills',
      'practice_plans',
      // Home page extras
      'announcements',
      'quick_links',
      'featured_sections'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Single cart model stored as single object or null
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
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

  // ------------------------
  // Generic helpers
  // ------------------------

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _formatDayOfWeek(date) {
    if (!date) return '';
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  }

  _formatTime12Hour(date) {
    if (!date) return '';
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    if (hours === 0) hours = 12;
    const minStr = minutes < 10 ? '0' + minutes : String(minutes);
    return hours + ':' + minStr + ' ' + ampm;
  }

  _getCurrentSeason() {
    const seasons = this._getFromStorage('seasons', []);
    if (!seasons.length) return null;

    const now = new Date();
    let active = seasons.find(s => s.is_active === true);
    if (active) return active;

    const withDates = seasons
      .map(s => ({
        season: s,
        start: this._parseDate(s.start_date),
        end: this._parseDate(s.end_date)
      }))
      .filter(x => x.start && x.end);

    const current = withDates.find(x => x.start <= now && now <= x.end);
    if (current) return current.season;

    // Fallback to latest by start_date
    withDates.sort((a, b) => a.start - b.start);
    return withDates.length ? withDates[withDates.length - 1].season : seasons[0];
  }

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (cart && typeof cart === 'object') return cart;

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const defaultShipping = shippingMethods.find(m => m.is_default) || shippingMethods[0] || null;

    cart = {
      id: this._generateId('cart'),
      items: [],
      shipping_method_id: defaultShipping ? defaultShipping.id : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this._saveToStorage('cart', cart);
    return cart;
  }

  _calculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    let subtotal = 0;
    for (const item of itemsForCart) {
      subtotal += Number(item.line_total || 0);
    }

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const shippingMethod = shippingMethods.find(m => m.id === cart.shipping_method_id) || null;
    const shippingCost = shippingMethod ? Number(shippingMethod.cost || 0) : 0;

    return {
      subtotal,
      shipping_cost: shippingCost,
      total: subtotal + shippingCost
    };
  }

  _getOrCreateCarpoolPlan() {
    const plans = this._getFromStorage('carpool_plans', []);
    if (plans.length) return plans[0];
    const newPlan = {
      id: this._generateId('carpool_plan'),
      notes: '',
      updated_at: new Date().toISOString()
    };
    plans.push(newPlan);
    this._saveToStorage('carpool_plans', plans);
    return newPlan;
  }

  _getOrCreatePracticePlanDraft(name, ageGroup, targetDurationMinutes) {
    // For simplicity, always create a new draft; no reuse logic needed
    const practicePlans = this._getFromStorage('practice_plans', []);
    const newPlan = {
      id: this._generateId('practice_plan'),
      name,
      age_group: ageGroup || null,
      total_duration_minutes: targetDurationMinutes,
      drill_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    practicePlans.push(newPlan);
    this._saveToStorage('practice_plans', practicePlans);
    return newPlan;
  }

  _filterAndSortGames(params) {
    const {
      teamId,
      divisionId,
      seasonId,
      month,
      year,
      locationType,
      isPlayoff,
      sortBy
    } = params || {};

    const games = this._getFromStorage('games', []);

    let result = games.slice();

    if (seasonId) {
      result = result.filter(g => g.season_id === seasonId);
    }
    if (divisionId) {
      result = result.filter(g => g.division_id === divisionId);
    }
    if (teamId) {
      result = result.filter(g => g.home_team_id === teamId || g.away_team_id === teamId);
    }
    if (typeof isPlayoff === 'boolean') {
      result = result.filter(g => (g.is_playoff || false) === isPlayoff);
    }
    if (month || year) {
      result = result.filter(g => {
        const d = this._parseDate(g.date_time);
        if (!d) return false;
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        if (month && m !== month) return false;
        if (year && y !== year) return false;
        return true;
      });
    }

    if (locationType && teamId) {
      if (locationType === 'home') {
        result = result.filter(g => g.home_team_id === teamId);
      } else if (locationType === 'away') {
        result = result.filter(g => g.away_team_id === teamId);
      }
    }

    const sortKey = sortBy || 'date_time_asc';
    result.sort((a, b) => {
      const da = this._parseDate(a.date_time);
      const db = this._parseDate(b.date_time);
      const cmp = (da && db) ? da - db : 0;
      if (sortKey === 'date_time_desc') return -cmp;
      return cmp;
    });

    return result;
  }

  _filterClinics({ ageGroup, dayOfWeek, minPrice, maxPrice, sortBy }) {
    const clinics = this._getFromStorage('clinics', []);
    let result = clinics.slice();

    if (ageGroup) {
      result = result.filter(c => c.age_group === ageGroup);
    }
    if (dayOfWeek) {
      result = result.filter(c => c.day_of_week === dayOfWeek);
    }
    if (typeof minPrice === 'number') {
      result = result.filter(c => Number(c.price || 0) >= minPrice);
    }
    if (typeof maxPrice === 'number') {
      result = result.filter(c => Number(c.price || 0) <= maxPrice);
    }

    const key = sortBy || 'start_date_asc';
    result.sort((a, b) => {
      if (key === 'price_asc') return Number(a.price || 0) - Number(b.price || 0);
      if (key === 'price_desc') return Number(b.price || 0) - Number(a.price || 0);
      const da = this._parseDate(a.start_datetime);
      const db = this._parseDate(b.start_datetime);
      const cmp = (da && db) ? da - db : 0;
      return key === 'start_date_desc' ? -cmp : cmp;
    });

    return result;
  }

  _filterVolunteerShifts({ category, fieldId, daysOfWeek, startTime, endTime, sortBy }) {
    const shifts = this._getFromStorage('volunteer_shifts', []);
    let result = shifts.slice();

    if (category) {
      result = result.filter(s => s.category === category);
    }
    if (fieldId) {
      result = result.filter(s => s.field_id === fieldId);
    }
    if (Array.isArray(daysOfWeek) && daysOfWeek.length) {
      const set = new Set(daysOfWeek);
      result = result.filter(s => set.has(s.day_of_week));
    }

    const timeToMinutes = (str) => {
      if (!str) return null;
      const parts = str.split(':');
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      return h * 60 + m;
    };

    const minMinutes = timeToMinutes(startTime);
    const maxMinutes = timeToMinutes(endTime);

    if (minMinutes !== null || maxMinutes !== null) {
      result = result.filter(s => {
        const d = this._parseDate(s.start_datetime);
        if (!d) return false;
        const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
        if (minMinutes !== null && minutes < minMinutes) return false;
        if (maxMinutes !== null && minutes > maxMinutes) return false;
        return true;
      });
    }

    const key = sortBy || 'date_asc';
    result.sort((a, b) => {
      const da = this._parseDate(a.start_datetime);
      const db = this._parseDate(b.start_datetime);
      const cmp = (da && db) ? da - db : 0;
      return key === 'date_desc' ? -cmp : cmp;
    });

    return result;
  }

  _filterProducts({ categoryId, sizeTag, minPrice, maxPrice, sortBy }) {
    const products = this._getFromStorage('products', []);
    let result = products.filter(p => p.category_id === categoryId && p.is_active);

    if (sizeTag) {
      result = result.filter(p => Array.isArray(p.available_sizes) && p.available_sizes.includes(sizeTag));
    }
    if (typeof minPrice === 'number') {
      result = result.filter(p => Number(p.price || 0) >= minPrice);
    }
    if (typeof maxPrice === 'number') {
      result = result.filter(p => Number(p.price || 0) <= maxPrice);
    }

    const key = sortBy || 'price_asc';
    result.sort((a, b) => {
      if (key === 'name_asc') return (a.name || '').localeCompare(b.name || '');
      if (key === 'price_desc') return Number(b.price || 0) - Number(a.price || 0);
      return Number(a.price || 0) - Number(b.price || 0);
    });

    return result;
  }

  _filterDrills({ ageGroup, focusArea, skillTag, sortBy }) {
    const drills = this._getFromStorage('drills', []);
    let result = drills.slice();

    if (ageGroup) {
      result = result.filter(d => d.age_group === ageGroup);
    }
    if (focusArea) {
      result = result.filter(d => d.focus_area === focusArea);
    }
    if (skillTag) {
      result = result.filter(d => Array.isArray(d.skill_tags) && d.skill_tags.includes(skillTag));
    }

    const key = sortBy || 'title_asc';
    result.sort((a, b) => {
      if (key === 'duration_asc') {
        return Number(a.estimated_duration_minutes || 0) - Number(b.estimated_duration_minutes || 0);
      }
      return (a.title || '').localeCompare(b.title || '');
    });

    return result;
  }

  // ------------------------
  // 1) Home page
  // ------------------------

  getHomePageSummary() {
    const currentSeason = this._getCurrentSeason();
    const announcements = this._getFromStorage('announcements', []);
    const quickLinks = this._getFromStorage('quick_links', []);
    const featuredSections = this._getFromStorage('featured_sections', []);

    // Upcoming games preview: next few scheduled games
    const allGames = this._getFromStorage('games', []);
    const divisions = this._getFromStorage('divisions', []);
    const teams = this._getFromStorage('teams', []);
    const fields = this._getFromStorage('fields', []);

    const upcoming = allGames
      .filter(g => g.status === 'scheduled')
      .sort((a, b) => {
        const da = this._parseDate(a.date_time);
        const db = this._parseDate(b.date_time);
        if (!da || !db) return 0;
        return da - db;
      })
      .slice(0, 5)
      .map(g => {
        const division = divisions.find(d => d.id === g.division_id) || null;
        const homeTeam = teams.find(t => t.id === g.home_team_id) || null;
        const awayTeam = teams.find(t => t.id === g.away_team_id) || null;
        const field = fields.find(f => f.id === g.field_id) || null;
        const season = this._getFromStorage('seasons', []).find(s => s.id === g.season_id) || null;

        const gameDate = this._parseDate(g.date_time);

        return {
          game_id: g.id,
          date_time: g.date_time,
          division_name: division ? division.display_name : '',
          home_team_name: homeTeam ? homeTeam.name : '',
          away_team_name: awayTeam ? awayTeam.name : '',
          field_name: field ? field.name : '',
          // Foreign key resolution
          game: {
            ...g,
            season,
            division,
            home_team: homeTeam,
            away_team: awayTeam,
            field
          },
          season,
          division,
          home_team: homeTeam,
          away_team: awayTeam,
          field,
          day_of_week: gameDate ? this._formatDayOfWeek(gameDate) : '',
          start_time: gameDate ? this._formatTime12Hour(gameDate) : ''
        };
      });

    return {
      currentSeason: currentSeason || null,
      announcements,
      quickLinks,
      featuredSections,
      upcomingGamesPreview: upcoming
    };
  }

  // ------------------------
  // 2) Registration interfaces
  // ------------------------

  getRegistrationOverview() {
    const seasons = this._getFromStorage('seasons', []);
    const seasonDivisionsRaw = this._getFromStorage('season_divisions', []);
    const divisions = this._getFromStorage('divisions', []);

    const seasonDivisions = seasonDivisionsRaw.map(sd => {
      const season = seasons.find(s => s.id === sd.season_id) || null;
      const division = divisions.find(d => d.id === sd.division_id) || null;
      const out = {
        id: sd.id,
        season_id: sd.season_id,
        season_name: season ? season.name : '',
        division_id: sd.division_id,
        division_display_name: division ? division.display_name : '',
        age_min: division ? division.age_min : null,
        age_max: division ? division.age_max : null,
        name: sd.name,
        description: sd.description || '',
        base_fee: sd.base_fee,
        early_bird_fee: sd.early_bird_fee || null,
        payment_plan_available: sd.payment_plan_available,
        payment_plan_type: sd.payment_plan_type || null,
        max_players: sd.max_players || null
      };

      // Foreign key resolution
      return {
        ...out,
        season,
        division
      };
    });

    return {
      seasons,
      seasonDivisions
    };
  }

  getPlayerRegistrationFormData(seasonDivisionId) {
    const seasons = this._getFromStorage('seasons', []);
    const divisions = this._getFromStorage('divisions', []);
    const seasonDivisions = this._getFromStorage('season_divisions', []);

    const sd = seasonDivisions.find(x => x.id === seasonDivisionId) || null;
    if (!sd) {
      return {
        seasonDivision: null,
        feeSummary: null
      };
    }

    const season = seasons.find(s => s.id === sd.season_id) || null;
    const division = divisions.find(d => d.id === sd.division_id) || null;

    const totalFee = sd.early_bird_fee != null ? sd.early_bird_fee : sd.base_fee;

    const paymentOptions = [
      {
        key: 'pay_in_full',
        label: 'Pay in Full',
        description: 'Pay the full registration fee at checkout.'
      }
    ];
    if (sd.payment_plan_available && sd.payment_plan_type === 'payment_plan_3_month') {
      paymentOptions.push({
        key: 'payment_plan_3_month',
        label: '3-Month Payment Plan',
        description: 'Split the fee into three monthly payments.'
      });
    }

    const seasonDivision = {
      id: sd.id,
      season_id: sd.season_id,
      season_name: season ? season.name : '',
      division_id: sd.division_id,
      division_display_name: division ? division.display_name : '',
      age_min: division ? division.age_min : null,
      age_max: division ? division.age_max : null,
      name: sd.name,
      description: sd.description || '',
      base_fee: sd.base_fee,
      early_bird_fee: sd.early_bird_fee || null,
      payment_plan_available: sd.payment_plan_available,
      payment_plan_type: sd.payment_plan_type || null,
      max_players: sd.max_players || null,
      season,
      division
    };

    const feeSummary = {
      base_fee: sd.base_fee,
      early_bird_fee: sd.early_bird_fee || null,
      total_fee: totalFee,
      payment_plan_available: sd.payment_plan_available,
      payment_plan_type: sd.payment_plan_type || null,
      payment_options: paymentOptions
    };

    return {
      seasonDivision,
      feeSummary
    };
  }

  createPlayerRegistration(
    seasonDivisionId,
    playerFirstName,
    playerLastName,
    playerDateOfBirth,
    guardianPhone,
    guardianEmail,
    paymentOption
  ) {
    const seasonDivisions = this._getFromStorage('season_divisions', []);
    const sd = seasonDivisions.find(x => x.id === seasonDivisionId) || null;
    if (!sd) {
      return {
        success: false,
        registrationId: null,
        totalFee: 0,
        paymentOption: paymentOption,
        registrationStatus: 'canceled',
        message: 'Season/division not found.'
      };
    }

    const totalFee = sd.early_bird_fee != null ? sd.early_bird_fee : sd.base_fee;

    const registrations = this._getFromStorage('player_registrations', []);
    const registrationId = this._generateId('player_reg');
    const now = new Date().toISOString();

    const registration = {
      id: registrationId,
      season_division_id: seasonDivisionId,
      player_first_name: playerFirstName,
      player_last_name: playerLastName,
      player_date_of_birth: playerDateOfBirth,
      guardian_phone: guardianPhone,
      guardian_email: guardianEmail,
      total_fee: totalFee,
      payment_option: paymentOption,
      registration_status: 'in_progress',
      created_at: now,
      updated_at: now
    };

    registrations.push(registration);
    this._saveToStorage('player_registrations', registrations);

    return {
      success: true,
      registrationId,
      totalFee,
      paymentOption,
      registrationStatus: registration.registration_status,
      message: 'Registration created.'
    };
  }

  advanceRegistrationToWaivers(playerRegistrationId) {
    const registrations = this._getFromStorage('player_registrations', []);
    const idx = registrations.findIndex(r => r.id === playerRegistrationId);
    if (idx === -1) {
      return {
        success: false,
        registrationStatus: 'canceled',
        nextStep: null,
        waiverSections: []
      };
    }

    const reg = registrations[idx];
    reg.registration_status = 'in_progress';
    reg.updated_at = new Date().toISOString();
    registrations[idx] = reg;
    this._saveToStorage('player_registrations', registrations);

    // Instrumentation for task completion tracking (task_1)
    try {
      const existing = localStorage.getItem('task1_advancedRegistrationIds');
      let ids = [];
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          if (Array.isArray(parsed)) {
            ids = parsed;
          }
        } catch (e2) {
          // Ignore parse errors and fall back to empty array
        }
      }
      ids.push(playerRegistrationId);
      localStorage.setItem('task1_advancedRegistrationIds', JSON.stringify(ids));
    } catch (e) {
      console.error('Instrumentation error (task_1):', e);
    }

    const waiverSections = [
      {
        id: 'liability',
        title: 'Liability Waiver',
        description: 'I acknowledge the risks of youth baseball and release the league from liability.',
        required: true
      },
      {
        id: 'photo',
        title: 'Photo & Media Release',
        description: 'I consent to the use of player photos for league communications.',
        required: false
      }
    ];

    return {
      success: true,
      registrationStatus: reg.registration_status,
      nextStep: 'waivers',
      waiverSections
    };
  }

  // ------------------------
  // 3) Schedule & games
  // ------------------------

  getScheduleFilterOptions() {
    const teamsRaw = this._getFromStorage('teams', []);
    const divisions = this._getFromStorage('divisions', []);

    const teams = teamsRaw.map(t => {
      const division = divisions.find(d => d.id === t.division_id) || null;
      return {
        id: t.id,
        name: t.name,
        division_id: t.division_id,
        division_name: division ? division.display_name : '',
        division
      };
    });

    const monthsMap = new Map();
    const games = this._getFromStorage('games', []);
    for (const g of games) {
      const d = this._parseDate(g.date_time);
      if (!d) continue;
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const key = y + '-' + m;
      if (!monthsMap.has(key)) {
        const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        monthsMap.set(key, { month: m, year: y, label });
      }
    }
    const months = Array.from(monthsMap.values()).sort((a, b) => {
      if (a.year === b.year) return a.month - b.month;
      return a.year - b.year;
    });

    const locationTypes = [
      { key: 'all', label: 'All Games' },
      { key: 'home', label: 'Home' },
      { key: 'away', label: 'Away' }
    ];

    const sortOptions = [
      { key: 'date_time_asc', label: 'Date & Time - Earliest First' },
      { key: 'date_time_desc', label: 'Date & Time - Latest First' }
    ];

    return {
      teams,
      divisions,
      months,
      locationTypes,
      sortOptions
    };
  }

  getLeagueSchedule(
    teamId,
    divisionId,
    seasonId,
    month,
    year,
    locationType,
    isPlayoff,
    sortBy
  ) {
    const filteredGames = this._filterAndSortGames({
      teamId,
      divisionId,
      seasonId,
      month,
      year,
      locationType,
      isPlayoff,
      sortBy
    });

    const seasons = this._getFromStorage('seasons', []);
    const divisions = this._getFromStorage('divisions', []);
    const teams = this._getFromStorage('teams', []);
    const fields = this._getFromStorage('fields', []);

    return filteredGames.map(g => {
      const season = seasons.find(s => s.id === g.season_id) || null;
      const division = divisions.find(d => d.id === g.division_id) || null;
      const homeTeam = teams.find(t => t.id === g.home_team_id) || null;
      const awayTeam = teams.find(t => t.id === g.away_team_id) || null;
      const field = fields.find(f => f.id === g.field_id) || null;
      const d = this._parseDate(g.date_time);

      const isHomeForFilter = teamId ? g.home_team_id === teamId : false;

      return {
        game_id: g.id,
        season_id: g.season_id,
        division_id: g.division_id,
        division_name: division ? division.display_name : '',
        date_time: g.date_time,
        day_of_week: d ? this._formatDayOfWeek(d) : '',
        start_time: d ? this._formatTime12Hour(d) : '',
        home_team_id: g.home_team_id,
        home_team_name: homeTeam ? homeTeam.name : '',
        away_team_id: g.away_team_id,
        away_team_name: awayTeam ? awayTeam.name : '',
        is_home_game_for_team_filter: isHomeForFilter,
        field_id: g.field_id,
        field_name: field ? field.name : '',
        status: g.status,
        is_playoff: !!g.is_playoff,
        // Foreign key resolution
        game: g,
        season,
        division,
        home_team: homeTeam,
        away_team: awayTeam,
        field
      };
    });
  }

  getGameDetails(gameId) {
    const games = this._getFromStorage('games', []);
    const game = games.find(g => g.id === gameId) || null;
    if (!game) {
      return {
        game_id: null,
        season_name: '',
        division_name: '',
        date_time: '',
        day_of_week: '',
        home_team_id: null,
        home_team_name: '',
        away_team_id: null,
        away_team_name: '',
        field_id: null,
        field_name: '',
        status: '',
        is_playoff: false,
        notes: '',
        is_in_my_schedule: false,
        game: null,
        season: null,
        division: null,
        home_team: null,
        away_team: null,
        field: null
      };
    }

    const seasons = this._getFromStorage('seasons', []);
    const divisions = this._getFromStorage('divisions', []);
    const teams = this._getFromStorage('teams', []);
    const fields = this._getFromStorage('fields', []);
    const myScheduleItems = this._getFromStorage('my_schedule_items', []);

    const season = seasons.find(s => s.id === game.season_id) || null;
    const division = divisions.find(d => d.id === game.division_id) || null;
    const homeTeam = teams.find(t => t.id === game.home_team_id) || null;
    const awayTeam = teams.find(t => t.id === game.away_team_id) || null;
    const field = fields.find(f => f.id === game.field_id) || null;
    const d = this._parseDate(game.date_time);

    const isInMySchedule = myScheduleItems.some(i => i.game_id === game.id);

    return {
      game_id: game.id,
      season_name: season ? season.name : '',
      division_name: division ? division.display_name : '',
      date_time: game.date_time,
      day_of_week: d ? this._formatDayOfWeek(d) : '',
      home_team_id: game.home_team_id,
      home_team_name: homeTeam ? homeTeam.name : '',
      away_team_id: game.away_team_id,
      away_team_name: awayTeam ? awayTeam.name : '',
      field_id: game.field_id,
      field_name: field ? field.name : '',
      status: game.status,
      is_playoff: !!game.is_playoff,
      notes: game.notes || '',
      is_in_my_schedule: isInMySchedule,
      // foreign key resolution
      game,
      season,
      division,
      home_team: homeTeam,
      away_team: awayTeam,
      field
    };
  }

  addGameToMySchedule(gameId) {
    const games = this._getFromStorage('games', []);
    const game = games.find(g => g.id === gameId) || null;
    if (!game) {
      return {
        success: false,
        myScheduleItemId: null,
        addedAt: null,
        message: 'Game not found.'
      };
    }

    const items = this._getFromStorage('my_schedule_items', []);
    // Avoid duplicates
    const existing = items.find(i => i.game_id === gameId);
    if (existing) {
      return {
        success: true,
        myScheduleItemId: existing.id,
        addedAt: existing.added_at,
        message: 'Game already in schedule.'
      };
    }

    const id = this._generateId('my_schedule');
    const addedAt = new Date().toISOString();
    items.push({
      id,
      game_id: gameId,
      added_at: addedAt
    });
    this._saveToStorage('my_schedule_items', items);

    return {
      success: true,
      myScheduleItemId: id,
      addedAt,
      message: 'Game added to schedule.'
    };
  }

  // ------------------------
  // 4) Clinics & camps
  // ------------------------

  getClinicFilterOptions() {
    const ageGroups = [
      { key: 'ages_5_7', label: 'Ages 5-7', age_min: 5, age_max: 7 },
      { key: 'ages_8_10', label: 'Ages 8-10', age_min: 8, age_max: 10 },
      { key: 'ages_11_12', label: 'Ages 11-12', age_min: 11, age_max: 12 },
      { key: 'ages_13_15', label: 'Ages 13-15', age_min: 13, age_max: 15 }
    ];

    const daysOfWeek = [
      { key: 'monday', label: 'Monday' },
      { key: 'tuesday', label: 'Tuesday' },
      { key: 'wednesday', label: 'Wednesday' },
      { key: 'thursday', label: 'Thursday' },
      { key: 'friday', label: 'Friday' },
      { key: 'saturday', label: 'Saturday' },
      { key: 'sunday', label: 'Sunday' }
    ];

    const clinics = this._getFromStorage('clinics', []);
    let min = 0;
    let max = 0;
    if (clinics.length) {
      min = Math.min.apply(null, clinics.map(c => Number(c.price || 0)));
      max = Math.max.apply(null, clinics.map(c => Number(c.price || 0)));
    }

    const priceRange = {
      min,
      max,
      step: 5
    };

    const sortOptions = [
      { key: 'start_date_asc', label: 'Start Date - Soonest First' },
      { key: 'start_date_desc', label: 'Start Date - Latest First' },
      { key: 'price_asc', label: 'Price - Low to High' },
      { key: 'price_desc', label: 'Price - High to Low' }
    ];

    return {
      ageGroups,
      daysOfWeek,
      priceRange,
      sortOptions
    };
  }

  searchClinics(ageGroup, dayOfWeek, minPrice, maxPrice, sortBy) {
    const filtered = this._filterClinics({ ageGroup, dayOfWeek, minPrice, maxPrice, sortBy });
    const fields = this._getFromStorage('fields', []);

    const dayLabels = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };

    const focusLabels = {
      batting: 'Batting',
      pitching: 'Pitching',
      fielding: 'Fielding',
      baserunning: 'Baserunning',
      catching: 'Catching',
      general_skills: 'General Skills'
    };

    const ageLabels = {
      ages_5_7: 'Ages 5-7',
      ages_8_10: 'Ages 8-10',
      ages_11_12: 'Ages 11-12',
      ages_13_15: 'Ages 13-15'
    };

    return filtered.map(c => {
      const field = fields.find(f => f.id === c.location_field_id) || null;
      return {
        clinic_id: c.id,
        name: c.name,
        age_group: c.age_group,
        age_group_label: ageLabels[c.age_group] || '',
        start_datetime: c.start_datetime,
        end_datetime: c.end_datetime,
        day_of_week: c.day_of_week,
        day_of_week_label: dayLabels[c.day_of_week] || '',
        price: c.price,
        location_field_id: c.location_field_id,
        location_field_name: field ? field.name : '',
        focus_area: c.focus_area,
        focus_area_label: focusLabels[c.focus_area] || '',
        // foreign key resolution
        clinic: c,
        location_field: field
      };
    });
  }

  getClinicDetails(clinicId) {
    const clinics = this._getFromStorage('clinics', []);
    const clinic = clinics.find(c => c.id === clinicId) || null;
    if (!clinic) {
      return {
        clinic_id: null,
        name: '',
        description: '',
        age_group: '',
        age_group_label: '',
        age_min: null,
        age_max: null,
        start_datetime: '',
        end_datetime: '',
        day_of_week: '',
        day_of_week_label: '',
        price: 0,
        focus_area: '',
        focus_area_label: '',
        location_field: null,
        can_register: false,
        clinic: null
      };
    }

    const fields = this._getFromStorage('fields', []);
    const field = fields.find(f => f.id === clinic.location_field_id) || null;

    const ageLabels = {
      ages_5_7: 'Ages 5-7',
      ages_8_10: 'Ages 8-10',
      ages_11_12: 'Ages 11-12',
      ages_13_15: 'Ages 13-15'
    };
    const dayLabels = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    const focusLabels = {
      batting: 'Batting',
      pitching: 'Pitching',
      fielding: 'Fielding',
      baserunning: 'Baserunning',
      catching: 'Catching',
      general_skills: 'General Skills'
    };

    const startDate = this._parseDate(clinic.start_datetime);
    const canRegister = startDate ? startDate > new Date() : true;

    return {
      clinic_id: clinic.id,
      name: clinic.name,
      description: clinic.description || '',
      age_group: clinic.age_group,
      age_group_label: ageLabels[clinic.age_group] || '',
      age_min: clinic.age_min,
      age_max: clinic.age_max,
      start_datetime: clinic.start_datetime,
      end_datetime: clinic.end_datetime,
      day_of_week: clinic.day_of_week,
      day_of_week_label: dayLabels[clinic.day_of_week] || '',
      price: clinic.price,
      focus_area: clinic.focus_area,
      focus_area_label: focusLabels[clinic.focus_area] || '',
      location_field: field
        ? {
            field_id: field.id,
            name: field.name,
            address_line1: field.address_line1,
            address_line2: field.address_line2 || '',
            city: field.city,
            state: field.state,
            zip: field.zip
          }
        : null,
      can_register: canRegister,
      clinic,
      full_field: field
    };
  }

  registerForClinic(clinicId, playerName, guardianEmail, jerseySize) {
    const clinics = this._getFromStorage('clinics', []);
    const clinic = clinics.find(c => c.id === clinicId) || null;
    if (!clinic) {
      return {
        success: false,
        registrationId: null,
        message: 'Clinic not found.'
      };
    }

    const registrations = this._getFromStorage('clinic_registrations', []);
    const id = this._generateId('clinic_reg');
    const now = new Date().toISOString();

    const rec = {
      id,
      clinic_id: clinicId,
      player_name: playerName,
      guardian_email: guardianEmail,
      jersey_size: jerseySize,
      created_at: now
    };

    registrations.push(rec);
    this._saveToStorage('clinic_registrations', registrations);

    return {
      success: true,
      registrationId: id,
      message: 'Clinic registration submitted.'
    };
  }

  // ------------------------
  // 5) Volunteer shifts
  // ------------------------

  getVolunteerFilterOptions() {
    const categories = [
      { key: 'concession_stand', label: 'Concession Stand' },
      { key: 'field_maintenance', label: 'Field Maintenance' },
      { key: 'scorekeeping', label: 'Scorekeeping' },
      { key: 'umpiring', label: 'Umpiring' },
      { key: 'other', label: 'Other' }
    ];

    const fields = this._getFromStorage('fields', []).map(f => ({ id: f.id, name: f.name }));

    const daysOfWeek = [
      { key: 'monday', label: 'Monday' },
      { key: 'tuesday', label: 'Tuesday' },
      { key: 'wednesday', label: 'Wednesday' },
      { key: 'thursday', label: 'Thursday' },
      { key: 'friday', label: 'Friday' },
      { key: 'saturday', label: 'Saturday' },
      { key: 'sunday', label: 'Sunday' }
    ];

    const timeOfDayPresets = [
      { key: 'morning', label: 'Morning', start_time: '08:00', end_time: '12:00' },
      { key: 'afternoon', label: 'Afternoon', start_time: '12:00', end_time: '16:00' },
      { key: 'evening', label: 'Evening', start_time: '16:00', end_time: '21:00' }
    ];

    const sortOptions = [
      { key: 'date_asc', label: 'Date - Soonest First' },
      { key: 'date_desc', label: 'Date - Latest First' }
    ];

    return {
      categories,
      fields,
      daysOfWeek,
      timeOfDayPresets,
      sortOptions
    };
  }

  searchVolunteerShifts(category, fieldId, daysOfWeek, startTime, endTime, sortBy) {
    const filtered = this._filterVolunteerShifts({
      category,
      fieldId,
      daysOfWeek,
      startTime,
      endTime,
      sortBy
    });

    const fields = this._getFromStorage('fields', []);

    const dayLabels = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    const categoryLabels = {
      concession_stand: 'Concession Stand',
      field_maintenance: 'Field Maintenance',
      scorekeeping: 'Scorekeeping',
      umpiring: 'Umpiring',
      other: 'Other'
    };
    const statusLabels = {
      open: 'Open',
      full: 'Full',
      canceled: 'Canceled'
    };

    return filtered.map(s => {
      const field = fields.find(f => f.id === s.field_id) || null;
      return {
        shift_id: s.id,
        category: s.category,
        category_label: categoryLabels[s.category] || '',
        field_id: s.field_id,
        field_name: field ? field.name : '',
        start_datetime: s.start_datetime,
        end_datetime: s.end_datetime,
        duration_minutes: s.duration_minutes,
        day_of_week: s.day_of_week,
        day_of_week_label: dayLabels[s.day_of_week] || '',
        slots_total: s.slots_total,
        slots_filled: s.slots_filled,
        status: s.status,
        status_label: statusLabels[s.status] || '',
        // foreign key resolution
        shift: s,
        field
      };
    });
  }

  getVolunteerShiftDetails(shiftId) {
    const shifts = this._getFromStorage('volunteer_shifts', []);
    const shift = shifts.find(s => s.id === shiftId) || null;
    if (!shift) {
      return {
        shift_id: null,
        category: '',
        category_label: '',
        field: null,
        start_datetime: '',
        end_datetime: '',
        duration_minutes: 0,
        day_of_week: '',
        day_of_week_label: '',
        slots_total: 0,
        slots_filled: 0,
        status: '',
        notes: '',
        shift: null
      };
    }

    const fields = this._getFromStorage('fields', []);
    const field = fields.find(f => f.id === shift.field_id) || null;

    const dayLabels = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    const categoryLabels = {
      concession_stand: 'Concession Stand',
      field_maintenance: 'Field Maintenance',
      scorekeeping: 'Scorekeeping',
      umpiring: 'Umpiring',
      other: 'Other'
    };

    return {
      shift_id: shift.id,
      category: shift.category,
      category_label: categoryLabels[shift.category] || '',
      field: field
        ? {
            field_id: field.id,
            name: field.name,
            address_line1: field.address_line1,
            address_line2: field.address_line2 || '',
            city: field.city,
            state: field.state,
            zip: field.zip
          }
        : null,
      start_datetime: shift.start_datetime,
      end_datetime: shift.end_datetime,
      duration_minutes: shift.duration_minutes,
      day_of_week: shift.day_of_week,
      day_of_week_label: dayLabels[shift.day_of_week] || '',
      slots_total: shift.slots_total,
      slots_filled: shift.slots_filled,
      status: shift.status,
      notes: shift.notes || '',
      shift,
      full_field: field
    };
  }

  signUpForVolunteerShift(shiftId, fullName, phone) {
    const shifts = this._getFromStorage('volunteer_shifts', []);
    const idx = shifts.findIndex(s => s.id === shiftId);
    if (idx === -1) {
      return {
        success: false,
        signupId: null,
        message: 'Shift not found.'
      };
    }

    const shift = shifts[idx];
    if (shift.status !== 'open') {
      return {
        success: false,
        signupId: null,
        message: 'Shift is not open.'
      };
    }

    const signups = this._getFromStorage('volunteer_signups', []);
    const id = this._generateId('vol_signup');
    const now = new Date().toISOString();

    const rec = {
      id,
      volunteer_shift_id: shiftId,
      full_name: fullName,
      phone,
      created_at: now
    };

    signups.push(rec);

    // Update shift slots
    shift.slots_filled = (shift.slots_filled || 0) + 1;
    if (shift.slots_filled >= shift.slots_total) {
      shift.status = 'full';
    }
    shifts[idx] = shift;

    this._saveToStorage('volunteer_signups', signups);
    this._saveToStorage('volunteer_shifts', shifts);

    return {
      success: true,
      signupId: id,
      message: 'Volunteer signup submitted.'
    };
  }

  // ------------------------
  // 6) Standings & teams
  // ------------------------

  getStandingsFilterOptions() {
    const seasons = this._getFromStorage('seasons', []);
    const divisions = this._getFromStorage('divisions', []);
    return {
      seasons,
      divisions
    };
  }

  getDivisionStandings(divisionId, seasonId, sortBy) {
    const standings = this._getFromStorage('season_team_standings', []);
    const teams = this._getFromStorage('teams', []);
    const divisions = this._getFromStorage('divisions', []);
    const seasons = this._getFromStorage('seasons', []);

    let filtered = standings.filter(s => s.division_id === divisionId);
    if (seasonId) {
      filtered = filtered.filter(s => s.season_id === seasonId);
    }

    const key = sortBy || 'winning_percentage_desc';
    filtered.sort((a, b) => {
      if (key === 'winning_percentage_asc') {
        return Number(a.winning_percentage || 0) - Number(b.winning_percentage || 0);
      }
      if (key === 'wins_desc') {
        return Number(b.wins || 0) - Number(a.wins || 0);
      }
      return Number(b.winning_percentage || 0) - Number(a.winning_percentage || 0);
    });

    return filtered.map(s => {
      const team = teams.find(t => t.id === s.team_id) || null;
      const division = divisions.find(d => d.id === s.division_id) || null;
      const season = seasons.find(se => se.id === s.season_id) || null;
      return {
        team_id: s.team_id,
        team_name: team ? team.name : '',
        division_id: s.division_id,
        division_name: division ? division.display_name : '',
        games_played: s.games_played,
        wins: s.wins,
        losses: s.losses,
        ties: s.ties,
        winning_percentage: s.winning_percentage,
        runs_scored: s.runs_scored || 0,
        runs_allowed: s.runs_allowed || 0,
        rank: s.rank || null,
        // foreign key resolution
        team,
        division,
        season
      };
    });
  }

  getTeamDetailAndSchedule(teamId) {
    const teams = this._getFromStorage('teams', []);
    const divisions = this._getFromStorage('divisions', []);
    const seasons = this._getFromStorage('seasons', []);
    const standings = this._getFromStorage('season_team_standings', []);
    const games = this._getFromStorage('games', []);
    const fields = this._getFromStorage('fields', []);

    const team = teams.find(t => t.id === teamId) || null;
    if (!team) {
      return {
        team: null,
        record: null,
        schedule: [],
        isFollowed: false
      };
    }

    const division = divisions.find(d => d.id === team.division_id) || null;
    const season = team.season_id ? seasons.find(s => s.id === team.season_id) || null : null;

    // Choose standing for this team - if multiple seasons, pick latest by season year
    const teamStandings = standings.filter(s => s.team_id === team.id);
    let record = null;
    if (teamStandings.length) {
      let selected = teamStandings[0];
      if (teamStandings.length > 1) {
        selected = teamStandings
          .map(s => ({
            s,
            season: seasons.find(se => se.id === s.season_id) || null
          }))
          .sort((a, b) => {
            const ay = a.season ? a.season.year || 0 : 0;
            const by = b.season ? b.season.year || 0 : 0;
            return ay - by;
          })[teamStandings.length - 1].s;
      }
      record = {
        games_played: selected.games_played,
        wins: selected.wins,
        losses: selected.losses,
        ties: selected.ties,
        winning_percentage: selected.winning_percentage,
        rank: selected.rank || null
      };
    }

    const teamGames = games
      .filter(g => g.home_team_id === team.id || g.away_team_id === team.id)
      .sort((a, b) => {
        const da = this._parseDate(a.date_time);
        const db = this._parseDate(b.date_time);
        if (!da || !db) return 0;
        return da - db;
      });

    const schedule = teamGames.map(g => {
      const opponentId = g.home_team_id === team.id ? g.away_team_id : g.home_team_id;
      const opponent = teams.find(t => t.id === opponentId) || null;
      const field = fields.find(f => f.id === g.field_id) || null;
      const d = this._parseDate(g.date_time);
      return {
        game_id: g.id,
        date_time: g.date_time,
        day_of_week: d ? this._formatDayOfWeek(d) : '',
        opponent_team_id: opponentId,
        opponent_team_name: opponent ? opponent.name : '',
        is_home_game: g.home_team_id === team.id,
        field_name: field ? field.name : '',
        status: g.status,
        is_playoff: !!g.is_playoff,
        // foreign key resolution
        game: g,
        opponent_team: opponent,
        field
      };
    });

    const followed = this._getFromStorage('followed_teams', []);
    const isFollowed = followed.some(f => f.team_id === team.id);

    // Instrumentation for task completion tracking (task_5 - lastTeamScheduleView)
    try {
      localStorage.setItem(
        'task5_lastTeamScheduleView',
        JSON.stringify({
          teamId: teamId,
          viewedAt: new Date().toISOString()
        })
      );
    } catch (e) {
      console.error('Instrumentation error (task_5 - lastTeamScheduleView):', e);
    }

    return {
      team: {
        team_id: team.id,
        name: team.name,
        division_id: team.division_id,
        division_name: division ? division.display_name : '',
        season_id: team.season_id || null,
        season_name: season ? season.name : '',
        coach_name: team.coach_name || '',
        division,
        season
      },
      record,
      schedule,
      isFollowed
    };
  }

  followTeam(teamId) {
    const teams = this._getFromStorage('teams', []);
    const team = teams.find(t => t.id === teamId) || null;
    if (!team) {
      return {
        success: false,
        followedAt: null,
        message: 'Team not found.'
      };
    }

    const followed = this._getFromStorage('followed_teams', []);
    const existing = followed.find(f => f.team_id === teamId);
    const now = new Date().toISOString();

    if (existing) {
      return {
        success: true,
        followedAt: existing.followed_at,
        message: 'Team already followed.'
      };
    }

    const rec = {
      id: this._generateId('followed_team'),
      team_id: teamId,
      followed_at: now
    };
    followed.push(rec);
    this._saveToStorage('followed_teams', followed);

    return {
      success: true,
      followedAt: now,
      message: 'Team followed.'
    };
  }

  unfollowTeam(teamId) {
    const followed = this._getFromStorage('followed_teams', []);
    const filtered = followed.filter(f => f.team_id !== teamId);
    this._saveToStorage('followed_teams', filtered);
    return {
      success: true,
      message: 'Team unfollowed.'
    };
  }

  getMyTeamsOverview() {
    const followed = this._getFromStorage('followed_teams', []);
    const teams = this._getFromStorage('teams', []);
    const divisions = this._getFromStorage('divisions', []);
    const standings = this._getFromStorage('season_team_standings', []);
    const games = this._getFromStorage('games', []);
    const fields = this._getFromStorage('fields', []);
    const seasons = this._getFromStorage('seasons', []);

    const now = new Date();

    // Instrumentation for task completion tracking (task_5 - myTeamsViewed)
    try {
      localStorage.setItem('task5_myTeamsViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error (task_5 - myTeamsViewed):', e);
    }

    const followedTeams = followed.map(f => {
      const team = teams.find(t => t.id === f.team_id) || null;
      if (!team) {
        return null;
      }
      const division = divisions.find(d => d.id === team.division_id) || null;

      const teamStandings = standings.filter(s => s.team_id === team.id);
      let record = {
        games_played: 0,
        wins: 0,
        losses: 0,
        ties: 0,
        winning_percentage: 0
      };
      if (teamStandings.length) {
        let selected = teamStandings[0];
        if (teamStandings.length > 1) {
          selected = teamStandings
            .map(s => ({ s, season: seasons.find(se => se.id === s.season_id) || null }))
            .sort((a, b) => {
              const ay = a.season ? a.season.year || 0 : 0;
              const by = b.season ? b.season.year || 0 : 0;
              return ay - by;
            })[teamStandings.length - 1].s;
        }
        record = {
          games_played: selected.games_played,
          wins: selected.wins,
          losses: selected.losses,
          ties: selected.ties,
          winning_percentage: selected.winning_percentage
        };
      }

      const upcoming = games
        .filter(g => (g.home_team_id === team.id || g.away_team_id === team.id) && g.status === 'scheduled')
        .map(g => ({ g, date: this._parseDate(g.date_time) }))
        .filter(x => x.date && x.date >= now)
        .sort((a, b) => a.date - b.date);

      let nextGameObj = null;
      if (upcoming.length) {
        const g = upcoming[0].g;
        const opponentId = g.home_team_id === team.id ? g.away_team_id : g.home_team_id;
        const opponent = teams.find(t => t.id === opponentId) || null;
        const field = fields.find(ff => ff.id === g.field_id) || null;
        nextGameObj = {
          game_id: g.id,
          date_time: g.date_time,
          opponent_team_name: opponent ? opponent.name : '',
          is_home_game: g.home_team_id === team.id,
          field_name: field ? field.name : '',
          game: g,
          opponent_team: opponent,
          field
        };
      }

      return {
        team_id: team.id,
        team_name: team.name,
        division_name: division ? division.display_name : '',
        record,
        next_game: nextGameObj,
        team,
        division
      };
    }).filter(Boolean);

    return {
      followedTeams
    };
  }

  // ------------------------
  // 7) Policies & contact
  // ------------------------

  getPoliciesOverview() {
    const policies = this._getFromStorage('policies', []);
    const overview = policies.map(p => {
      const short = p.content ? (p.content.length > 140 ? p.content.slice(0, 140) + '...' : p.content) : '';
      return {
        policy_id: p.policy_id,
        title: p.title,
        short_description: short,
        policy: p
      };
    });
    return {
      policies: overview
    };
  }

  getPolicyContent(policyId) {
    const policies = this._getFromStorage('policies', []);
    const policy = policies.find(p => p.policy_id === policyId) || null;
    if (!policy) {
      return {
        policy_id: null,
        title: '',
        content: '',
        sections: [],
        policy: null
      };
    }

    // Basic section parsing: look for Markdown-style headings starting with '## '
    const sections = [];
    if (policy.content) {
      const lines = policy.content.split(/\r?\n/);
      for (const line of lines) {
        const match = line.match(/^#{2,}\s+(.*)$/);
        if (match) {
          const title = match[1].trim();
          const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          sections.push({ id: anchor, title, anchor });
        }
      }
    }

    // Instrumentation for task completion tracking (task_6)
    try {
      localStorage.setItem('task6_lastViewedPolicyId', policyId);
    } catch (e) {
      console.error('Instrumentation error (task_6):', e);
    }

    return {
      policy_id: policy.policy_id,
      title: policy.title,
      content: policy.content,
      sections,
      policy
    };
  }

  getContactTopics() {
    const topics = [
      {
        key: 'weather_and_field_conditions',
        label: 'Weather & Field Conditions',
        description: 'Questions about rainouts, field closures, and weather-related changes.'
      },
      {
        key: 'registration',
        label: 'Registration',
        description: 'Player registration, refunds, and waitlists.'
      },
      {
        key: 'volunteering',
        label: 'Volunteering',
        description: 'Volunteer opportunities and requirements.'
      },
      {
        key: 'store_order',
        label: 'Store Orders',
        description: 'Questions about league store orders.'
      },
      {
        key: 'general_question',
        label: 'General Question',
        description: 'Anything else related to the league.'
      }
    ];
    return { topics };
  }

  submitContactMessage(topic, name, email, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('contact');
    const now = new Date().toISOString();

    const rec = {
      id,
      topic,
      name,
      email,
      message,
      created_at: now
    };

    messages.push(rec);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      messageId: id,
      confirmationText: 'Your message has been sent. We will respond as soon as possible.'
    };
  }

  // ------------------------
  // 8) Store & cart
  // ------------------------

  getStoreCategories() {
    const categories = this._getFromStorage('product_categories', []);
    const ids = new Set(categories.map(c => c.id));
    const childrenByParent = {};
    for (const c of categories) {
      if (c.parent_id && ids.has(c.parent_id)) {
        if (!childrenByParent[c.parent_id]) childrenByParent[c.parent_id] = 0;
        childrenByParent[c.parent_id] += 1;
      }
    }

    const out = categories.map(c => ({
      id: c.id,
      name: c.name,
      parent_id: c.parent_id || null,
      description: c.description || '',
      is_leaf: !childrenByParent[c.id]
    }));

    return { categories: out };
  }

  getStoreLandingFeaturedProducts() {
    const categories = this._getFromStorage('product_categories', []);
    const products = this._getFromStorage('products', []);

    const activeProducts = products.filter(p => p.is_active);

    // Featured categories: first few categories that have active products
    const categoryHasProduct = new Set(activeProducts.map(p => p.category_id));
    const featuredCategories = categories
      .filter(c => categoryHasProduct.has(c.id))
      .slice(0, 3)
      .map(c => ({
        category_id: c.id,
        category_name: c.name,
        highlight_text: 'Shop ' + c.name,
        category: c
      }));

    const featuredProducts = activeProducts
      .slice()
      .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))
      .slice(0, 8)
      .map(p => ({
        product_id: p.id,
        name: p.name,
        category_id: p.category_id,
        category_name: (categories.find(c => c.id === p.category_id) || {}).name || '',
        price: p.price,
        image_url: p.image_url || '',
        product: p,
        category: categories.find(c => c.id === p.category_id) || null
      }));

    return {
      featuredCategories,
      featuredProducts
    };
  }

  getProductFilterOptions(categoryId) {
    const products = this._getFromStorage('products', []);
    const inCategory = products.filter(p => p.category_id === categoryId && p.is_active);

    const sizeSet = new Set();
    for (const p of inCategory) {
      if (Array.isArray(p.available_sizes)) {
        for (const s of p.available_sizes) sizeSet.add(s);
      }
    }

    const sizeLabelMap = {
      youth: 'Youth',
      adult: 'Adult',
      one_size: 'One Size'
    };

    const sizeOptions = Array.from(sizeSet).map(key => ({
      key,
      label: sizeLabelMap[key] || key
    }));

    let min = 0;
    let max = 0;
    if (inCategory.length) {
      min = Math.min.apply(null, inCategory.map(p => Number(p.price || 0)));
      max = Math.max.apply(null, inCategory.map(p => Number(p.price || 0)));
    }

    const priceRange = { min, max, step: 1 };

    const sortOptions = [
      { key: 'price_asc', label: 'Price - Low to High' },
      { key: 'price_desc', label: 'Price - High to Low' },
      { key: 'name_asc', label: 'Name - A to Z' }
    ];

    return {
      sizeOptions,
      priceRange,
      sortOptions
    };
  }

  searchProducts(categoryId, sizeTag, minPrice, maxPrice, sortBy) {
    const filtered = this._filterProducts({ categoryId, sizeTag, minPrice, maxPrice, sortBy });
    const categories = this._getFromStorage('product_categories', []);

    return filtered.map(p => {
      const category = categories.find(c => c.id === p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        category_id: p.category_id,
        category_name: category ? category.name : '',
        price: p.price,
        description: p.description || '',
        image_url: p.image_url || '',
        available_sizes: p.available_sizes || [],
        available_colors: p.available_colors || [],
        is_active: p.is_active,
        product: p,
        category
      };
    });
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return {
        product_id: null,
        name: '',
        category_id: null,
        category_name: '',
        price: 0,
        description: '',
        image_url: '',
        available_sizes: [],
        available_colors: [],
        is_active: false,
        product: null,
        category: null
      };
    }

    const categories = this._getFromStorage('product_categories', []);
    const category = categories.find(c => c.id === product.category_id) || null;

    return {
      product_id: product.id,
      name: product.name,
      category_id: product.category_id,
      category_name: category ? category.name : '',
      price: product.price,
      description: product.description || '',
      image_url: product.image_url || '',
      available_sizes: product.available_sizes || [],
      available_colors: product.available_colors || [],
      is_active: product.is_active,
      product,
      category
    };
  }

  addToCart(productId, quantity, selectedColor, selectedSize) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product || !product.is_active) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Product not found or inactive.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    let item = cartItems.find(ci =>
      ci.cart_id === cart.id &&
      ci.product_id === productId &&
      (ci.selected_color || null) === (selectedColor || null) &&
      (ci.selected_size || null) === (selectedSize || null)
    );

    if (item) {
      item.quantity += qty;
      item.line_total = Number(item.unit_price || 0) * item.quantity;
    } else {
      const id = this._generateId('cart_item');
      item = {
        id,
        cart_id: cart.id,
        product_id: productId,
        product_name: product.name,
        unit_price: product.price,
        quantity: qty,
        selected_color: selectedColor || null,
        selected_size: selectedSize || null,
        line_total: product.price * qty
      };
      cartItems.push(item);
      if (!Array.isArray(cart.items)) cart.items = [];
      if (!cart.items.includes(id)) cart.items.push(id);
    }

    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: item.id,
      message: 'Added to cart.'
    };
  }

  getCart() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cartId: null,
        items: [],
        shipping_method_id: null,
        shipping_method_name: '',
        subtotal: 0,
        shipping_cost: 0,
        total: 0
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    const items = itemsForCart.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        selected_color: ci.selected_color || null,
        selected_size: ci.selected_size || null,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        image_url: product ? product.image_url || '' : '',
        product
      };
    });

    const totals = this._calculateCartTotals(cart);
    const shippingMethod = shippingMethods.find(m => m.id === cart.shipping_method_id) || null;

    return {
      cartId: cart.id,
      items,
      shipping_method_id: cart.shipping_method_id,
      shipping_method_name: shippingMethod ? shippingMethod.name : '',
      subtotal: totals.subtotal,
      shipping_cost: totals.shipping_cost,
      total: totals.total
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cart: {
          cartId: null,
          items: [],
          subtotal: 0,
          shipping_cost: 0,
          total: 0
        }
      };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx === -1) {
      const totals = this._calculateCartTotals(cart);
      return {
        success: false,
        cart: {
          cartId: cart.id,
          items: [],
          subtotal: totals.subtotal,
          shipping_cost: totals.shipping_cost,
          total: totals.total
        }
      };
    }

    if (quantity <= 0) {
      const removed = cartItems[idx];
      cartItems.splice(idx, 1);
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== removed.id);
      }
    } else {
      const item = cartItems[idx];
      item.quantity = quantity;
      item.line_total = Number(item.unit_price || 0) * quantity;
      cartItems[idx] = item;
    }

    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);

    const products = this._getFromStorage('products', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id).map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        selected_color: ci.selected_color || null,
        selected_size: ci.selected_size || null,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        product
      };
    });

    const totals = this._calculateCartTotals(cart);

    return {
      success: true,
      cart: {
        cartId: cart.id,
        items: itemsForCart,
        subtotal: totals.subtotal,
        shipping_cost: totals.shipping_cost,
        total: totals.total
      }
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cart: {
          cartId: null,
          items: [],
          subtotal: 0,
          shipping_cost: 0,
          total: 0
        }
      };
    }

    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId && ci.cart_id === cart.id);
    if (idx !== -1) {
      cartItems.splice(idx, 1);
    }

    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter(id => id !== cartItemId);
    }

    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', cart);

    const products = this._getFromStorage('products', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id).map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        selected_color: ci.selected_color || null,
        selected_size: ci.selected_size || null,
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        product
      };
    });

    const totals = this._calculateCartTotals(cart);

    return {
      success: true,
      cart: {
        cartId: cart.id,
        items: itemsForCart,
        subtotal: totals.subtotal,
        shipping_cost: totals.shipping_cost,
        total: totals.total
      }
    };
  }

  getShippingMethods() {
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    return { shippingMethods };
  }

  setCartShippingMethod(shippingMethodId) {
    const cart = this._getOrCreateCart();
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const method = shippingMethods.find(m => m.id === shippingMethodId) || null;

    if (!method) {
      const totals = this._calculateCartTotals(cart);
      return {
        success: false,
        cartId: cart.id,
        shipping_method_id: cart.shipping_method_id,
        shipping_cost: totals.shipping_cost,
        total: totals.total
      };
    }

    cart.shipping_method_id = shippingMethodId;
    cart.updated_at = new Date().toISOString();
    this._saveToStorage('cart', cart);

    const totals = this._calculateCartTotals(cart);

    return {
      success: true,
      cartId: cart.id,
      shipping_method_id: shippingMethodId,
      shipping_cost: totals.shipping_cost,
      total: totals.total
    };
  }

  // ------------------------
  // 9) Fields & carpool planner
  // ------------------------

  getFieldFilterOptions() {
    const amenities = [
      { key: 'parking_lot', label: 'Parking Lot' },
      { key: 'restrooms', label: 'Restrooms' }
    ];

    const distanceOptions = [
      { miles: 5, label: 'Within 5 miles' },
      { miles: 10, label: 'Within 10 miles' },
      { miles: 20, label: 'Within 20 miles' },
      { miles: 50, label: 'Within 50 miles' }
    ];

    const sortOptions = [
      { key: 'distance_asc', label: 'Distance - Closest First' },
      { key: 'name_asc', label: 'Name - A to Z' }
    ];

    return {
      amenities,
      defaultZip: '',
      distanceOptions,
      sortOptions
    };
  }

  searchFields(amenities, zip, maxDistance, sortBy) {
    const fields = this._getFromStorage('fields', []);
    let result = fields.slice();

    if (Array.isArray(amenities) && amenities.length) {
      const needParking = amenities.includes('parking_lot');
      const needRestrooms = amenities.includes('restrooms');
      result = result.filter(f => {
        if (needParking && !f.has_parking_lot) return false;
        if (needRestrooms && !f.has_restrooms) return false;
        return true;
      });
    }

    if (typeof maxDistance === 'number') {
      result = result.filter(f => {
        if (typeof f.distance_from_reference !== 'number') return false;
        return f.distance_from_reference <= maxDistance;
      });
    }

    const key = sortBy || 'distance_asc';
    result.sort((a, b) => {
      if (key === 'name_asc') {
        return (a.name || '').localeCompare(b.name || '');
      }
      const da = typeof a.distance_from_reference === 'number' ? a.distance_from_reference : Number.POSITIVE_INFINITY;
      const db = typeof b.distance_from_reference === 'number' ? b.distance_from_reference : Number.POSITIVE_INFINITY;
      return da - db;
    });

    return result.map(f => ({
      field_id: f.id,
      name: f.name,
      address_line1: f.address_line1,
      city: f.city,
      state: f.state,
      zip: f.zip,
      has_parking_lot: !!f.has_parking_lot,
      has_restrooms: !!f.has_restrooms,
      distance_from_reference: typeof f.distance_from_reference === 'number' ? f.distance_from_reference : null,
      field: f
    }));
  }

  getFieldDetails(fieldId) {
    const fields = this._getFromStorage('fields', []);
    const field = fields.find(f => f.id === fieldId) || null;
    if (!field) {
      return {
        field_id: null,
        name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        zip: '',
        has_parking_lot: false,
        has_restrooms: false,
        amenities: [],
        latitude: null,
        longitude: null,
        full_address_text: '',
        field: null
      };
    }

    const addressParts = [field.address_line1];
    if (field.address_line2) addressParts.push(field.address_line2);
    addressParts.push(field.city + ', ' + field.state + ' ' + field.zip);
    const fullAddress = addressParts.join(', ');

    return {
      field_id: field.id,
      name: field.name,
      address_line1: field.address_line1,
      address_line2: field.address_line2 || '',
      city: field.city,
      state: field.state,
      zip: field.zip,
      has_parking_lot: !!field.has_parking_lot,
      has_restrooms: !!field.has_restrooms,
      amenities: field.amenities || [],
      latitude: typeof field.latitude === 'number' ? field.latitude : null,
      longitude: typeof field.longitude === 'number' ? field.longitude : null,
      full_address_text: fullAddress,
      field
    };
  }

  getCarpoolPlan() {
    const plan = this._getOrCreateCarpoolPlan();
    return {
      planId: plan.id,
      notes: plan.notes,
      updated_at: plan.updated_at
    };
  }

  saveCarpoolPlan(notes) {
    const plans = this._getFromStorage('carpool_plans', []);
    let plan;
    if (plans.length) {
      plan = plans[0];
      plan.notes = notes;
      plan.updated_at = new Date().toISOString();
      plans[0] = plan;
    } else {
      plan = {
        id: this._generateId('carpool_plan'),
        notes,
        updated_at: new Date().toISOString()
      };
      plans.push(plan);
    }
    this._saveToStorage('carpool_plans', plans);
    return {
      planId: plan.id,
      notes: plan.notes,
      updated_at: plan.updated_at
    };
  }

  // ------------------------
  // 10) Coaches corner & practice plans
  // ------------------------

  getCoachesCornerOverview() {
    const featuredResources = [
      {
        type: 'practice_plans',
        label: 'Practice Plans',
        description: 'Pre-built practice plans by age group and skill focus.',
        target: 'practice_plans_and_drills'
      },
      {
        type: 'drills',
        label: 'Drills Library',
        description: 'Browse drills for infield, outfield, pitching, hitting, and more.',
        target: 'practice_plans_and_drills'
      },
      {
        type: 'tips',
        label: 'Coaching Tips',
        description: 'Guidance on running efficient, fun youth practices.',
        target: 'coaching_tips'
      }
    ];

    const ageGroups = [
      { key: 'ages_5_7', label: 'Ages 5-7', age_min: 5, age_max: 7 },
      { key: 'ages_8_10', label: 'Ages 8-10', age_min: 8, age_max: 10 },
      { key: 'ages_11_12', label: 'Ages 11-12', age_min: 11, age_max: 12 },
      { key: 'ages_13_15', label: 'Ages 13-15', age_min: 13, age_max: 15 }
    ];

    return {
      featuredResources,
      ageGroups
    };
  }

  getDrillFilterOptions() {
    const ageGroups = [
      { key: 'ages_5_7', label: 'Ages 5-7' },
      { key: 'ages_8_10', label: 'Ages 8-10' },
      { key: 'ages_11_12', label: 'Ages 11-12' },
      { key: 'ages_13_15', label: 'Ages 13-15' }
    ];

    const focusAreas = [
      { key: 'infield', label: 'Infield' },
      { key: 'outfield', label: 'Outfield' },
      { key: 'pitching', label: 'Pitching' },
      { key: 'hitting', label: 'Hitting' },
      { key: 'baserunning', label: 'Baserunning' },
      { key: 'catching', label: 'Catching' },
      { key: 'general', label: 'General Skills' }
    ];

    // Build skill tags from existing drills
    const drills = this._getFromStorage('drills', []);
    const tagSet = new Set();
    for (const d of drills) {
      if (Array.isArray(d.skill_tags)) {
        for (const t of d.skill_tags) tagSet.add(t);
      }
    }

    const skillTags = Array.from(tagSet).map(key => ({
      key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')
    }));

    return {
      ageGroups,
      focusAreas,
      skillTags
    };
  }

  searchDrills(ageGroup, focusArea, skillTag, sortBy) {
    const filtered = this._filterDrills({ ageGroup, focusArea, skillTag, sortBy });

    const ageLabels = {
      ages_5_7: 'Ages 5-7',
      ages_8_10: 'Ages 8-10',
      ages_11_12: 'Ages 11-12',
      ages_13_15: 'Ages 13-15'
    };
    const focusLabels = {
      infield: 'Infield',
      outfield: 'Outfield',
      pitching: 'Pitching',
      hitting: 'Hitting',
      baserunning: 'Baserunning',
      catching: 'Catching',
      general: 'General Skills'
    };

    return filtered.map(d => ({
      drill_id: d.id,
      title: d.title,
      description: d.description || '',
      age_group: d.age_group,
      age_group_label: ageLabels[d.age_group] || '',
      focus_area: d.focus_area,
      focus_area_label: focusLabels[d.focus_area] || '',
      skill_tags: d.skill_tags || [],
      estimated_duration_minutes: d.estimated_duration_minutes || 0,
      drill: d
    }));
  }

  createPracticePlanDraft(name, ageGroup, targetDurationMinutes) {
    const plan = this._getOrCreatePracticePlanDraft(name, ageGroup, targetDurationMinutes);
    return {
      success: true,
      practicePlanId: plan.id,
      name: plan.name,
      age_group: plan.age_group,
      total_duration_minutes: plan.total_duration_minutes,
      drill_ids: plan.drill_ids.slice()
    };
  }

  addDrillToPracticePlan(practicePlanId, drillId) {
    const practicePlans = this._getFromStorage('practice_plans', []);
    const idx = practicePlans.findIndex(p => p.id === practicePlanId);
    if (idx === -1) {
      return {
        success: false,
        practicePlanId,
        drill_ids: []
      };
    }

    const plan = practicePlans[idx];
    if (!Array.isArray(plan.drill_ids)) plan.drill_ids = [];
    plan.drill_ids.push(drillId);
    plan.updated_at = new Date().toISOString();
    practicePlans[idx] = plan;
    this._saveToStorage('practice_plans', practicePlans);

    return {
      success: true,
      practicePlanId: plan.id,
      drill_ids: plan.drill_ids.slice()
    };
  }

  savePracticePlan(practicePlanId, totalDurationMinutes) {
    const practicePlans = this._getFromStorage('practice_plans', []);
    const idx = practicePlans.findIndex(p => p.id === practicePlanId);
    if (idx === -1) {
      return {
        success: false,
        practicePlanId,
        name: '',
        age_group: null,
        total_duration_minutes: 0,
        drill_ids: [],
        updated_at: null
      };
    }

    const plan = practicePlans[idx];
    plan.total_duration_minutes = totalDurationMinutes;
    plan.updated_at = new Date().toISOString();
    practicePlans[idx] = plan;
    this._saveToStorage('practice_plans', practicePlans);

    return {
      success: true,
      practicePlanId: plan.id,
      name: plan.name,
      age_group: plan.age_group,
      total_duration_minutes: plan.total_duration_minutes,
      drill_ids: plan.drill_ids.slice(),
      updated_at: plan.updated_at
    };
  }

  // ------------------------
  // End of class
  // ------------------------
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}