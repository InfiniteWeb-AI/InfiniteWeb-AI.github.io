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
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  // ------------------------
  // Storage helpers
  // ------------------------
  _initStorage() {
    const tableKeys = [
      'divisions',
      'seasons',
      'programs',
      'program_sessions',
      'players',
      'guardian_contacts',
      'program_registrations',
      'teams',
      'team_practices',
      'fields',
      'games',
      'saved_games',
      'volunteer_shifts',
      'volunteer_signups',
      'product_categories',
      'products',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'clinics',
      'clinic_registrations',
      'field_reservation_slots',
      'field_reservations',
      'saved_teams',
      'rule_documents',
      'saved_resources'
    ];

    for (let i = 0; i < tableKeys.length; i++) {
      const key = tableKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Single-user aggregate state (for convenience, derived from tables)
    if (!localStorage.getItem('single_user_state')) {
      localStorage.setItem('single_user_state', JSON.stringify({
        saved_game_ids: [],
        saved_team_ids: [],
        saved_resource_ids: [],
        volunteer_signup_ids: []
      }));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  // Basic time/date helpers
  _getTodayDateString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  _getMonthLabel(yearMonth) {
    // yearMonth: '2026-06'
    const parts = yearMonth.split('-');
    if (parts.length !== 2) return yearMonth;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const d = new Date(year, month, 1);
    const monthName = d.toLocaleString('en-US', { month: 'long' });
    return monthName + ' ' + year;
  }

  _getMonthRange(yearMonth) {
    const parts = yearMonth.split('-');
    if (parts.length !== 2) return { start: null, end: null };
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // last day of month
    const s = startDate.toISOString().slice(0, 10);
    const e = endDate.toISOString().slice(0, 10);
    return { start: s, end: e };
  }

  _compareDateStrings(a, b) {
    // a, b: 'YYYY-MM-DD' or full ISO; compare lexicographically on date
    if (!a || !b) return 0;
    const da = a.slice(0, 10);
    const db = b.slice(0, 10);
    if (da < db) return -1;
    if (da > db) return 1;
    return 0;
  }

  _compareDateTimeStrings(dateA, timeA, dateB, timeB) {
    const fullA = (dateA || '').slice(0, 10) + 'T' + (timeA || '00:00');
    const fullB = (dateB || '').slice(0, 10) + 'T' + (timeB || '00:00');
    if (fullA < fullB) return -1;
    if (fullA > fullB) return 1;
    return 0;
  }

  _timeWithinRange(time, min, max) {
    if (!time) return false;
    if (min && time < min) return false;
    if (max && time > max) return false;
    return true;
  }

  // ------------------------
  // Cart helpers
  // ------------------------
  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let openCart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        openCart = carts[i];
        break;
      }
    }
    if (!openCart) {
      openCart = {
        id: this._generateId('cart'),
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      carts.push(openCart);
      this._saveToStorage('carts', carts);
    }
    return openCart;
  }

  _recalculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items');
    let subtotal = 0;
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cart_id === cartId) {
        subtotal += (item.unit_price || 0) * (item.quantity || 0);
      }
    }
    const estimated_tax = 0; // keep simple, no mock tax logic
    const shipping_cost_estimate = 0; // no shipping estimate until checkout
    const total_estimate = subtotal + estimated_tax + shipping_cost_estimate;
    return {
      subtotal,
      estimated_tax,
      shipping_cost_estimate,
      total_estimate
    };
  }

  _saveSingleUserState() {
    // Aggregate IDs from per-entity tables into a convenient single-user snapshot
    const savedGames = this._getFromStorage('saved_games');
    const savedTeams = this._getFromStorage('saved_teams');
    const savedResources = this._getFromStorage('saved_resources');
    const volunteerSignups = this._getFromStorage('volunteer_signups');

    const state = {
      saved_game_ids: savedGames.map(g => g.game_id),
      saved_team_ids: savedTeams.map(t => t.team_id),
      saved_resource_ids: savedResources.map(r => r.rule_document_id),
      volunteer_signup_ids: volunteerSignups.map(v => v.id)
    };
    this._saveToStorage('single_user_state', state);
  }

  // Utility: resolve foreign keys in specific getters (manual per spec)
  _attachProductToCartItem(cartItem) {
    const products = this._getFromStorage('products');
    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === cartItem.product_id) {
        product = products[i];
        break;
      }
    }
    return Object.assign({}, cartItem, { product });
  }

  // ------------------------
  // Interface: getHomeOverview
  // ------------------------
  getHomeOverview() {
    const seasons = this._getFromStorage('seasons');
    const programs = this._getFromStorage('programs');
    const divisions = this._getFromStorage('divisions');
    const games = this._getFromStorage('games');
    const fields = this._getFromStorage('fields');
    const teams = this._getFromStorage('teams');
    const savedGames = this._getFromStorage('saved_games');
    const volunteerSignups = this._getFromStorage('volunteer_signups');
    const savedTeams = this._getFromStorage('saved_teams');
    const savedResources = this._getFromStorage('saved_resources');

    // featured_seasons: use all seasons (frontend can decide what to show)
    const featured_seasons = seasons.map(s => ({
      season_id: s.id,
      name: s.name,
      year: s.year,
      season_type: s.season_type,
      is_active: !!s.is_active,
      start_date: s.start_date || null,
      end_date: s.end_date || null
    }));

    // featured_programs: programs with registration_open === true
    const featured_programs = [];
    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];
      if (!p.registration_open) continue;
      let seasonName = '';
      let divisionName = '';
      for (let j = 0; j < seasons.length; j++) {
        if (seasons[j].id === p.season_id) {
          seasonName = seasons[j].name;
          break;
        }
      }
      for (let k = 0; k < divisions.length; k++) {
        if (divisions[k].id === p.division_id) {
          divisionName = divisions[k].name;
          break;
        }
      }
      featured_programs.push({
        program_id: p.id,
        program_name: p.name,
        season_name: seasonName,
        division_name: divisionName,
        registration_open: !!p.registration_open,
        base_price: p.base_price || 0,
        location_summary: p.location_summary || '',
        highlight_badge: null
      });
    }

    // today's games summary
    const today = this._getTodayDateString();
    const todayGames = [];
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      if (!g.game_date) continue;
      if (g.game_date.slice(0, 10) !== today) continue;
      let divisionName = '';
      for (let d = 0; d < divisions.length; d++) {
        if (divisions[d].id === g.division_id) {
          divisionName = divisions[d].name;
          break;
        }
      }
      let fieldName = '';
      for (let f = 0; f < fields.length; f++) {
        if (fields[f].id === g.field_id) {
          fieldName = fields[f].name;
          break;
        }
      }
      let homeTeamName = '';
      let awayTeamName = '';
      for (let t = 0; t < teams.length; t++) {
        if (teams[t].id === g.home_team_id) homeTeamName = teams[t].name;
        if (teams[t].id === g.away_team_id) awayTeamName = teams[t].name;
      }
      todayGames.push({
        game_id: g.id,
        division_name: divisionName,
        game_date: g.game_date,
        start_time: g.start_time || null,
        field_name: fieldName,
        home_team_name: homeTeamName,
        away_team_name: awayTeamName,
        status: g.status
      });
    }

    // shortcuts
    let has_12u_programs_open = false;
    let twelveDivisionId = null;
    for (let i = 0; i < divisions.length; i++) {
      if (divisions[i].code === '12u') {
        twelveDivisionId = divisions[i].id;
        break;
      }
    }
    if (twelveDivisionId) {
      for (let i = 0; i < programs.length; i++) {
        const p = programs[i];
        if (p.division_id === twelveDivisionId && p.registration_open) {
          has_12u_programs_open = true;
          break;
        }
      }
    }

    const today_games_summary = {
      has_games: todayGames.length > 0,
      total_games: todayGames.length,
      games: todayGames
    };

    const shortcuts = {
      has_12u_programs_open,
      has_games_today: todayGames.length > 0
    };

    const user_summary = {
      saved_games_count: savedGames.length,
      volunteer_shifts_count: volunteerSignups.filter(v => v.status === 'confirmed').length,
      saved_teams_count: savedTeams.length,
      saved_resources_count: savedResources.length
    };

    return {
      featured_seasons,
      featured_programs,
      today_games_summary,
      shortcuts,
      user_summary
    };
  }

  // ------------------------
  // Interface: getProgramFilterOptions
  // ------------------------
  getProgramFilterOptions() {
    const seasons = this._getFromStorage('seasons');
    const divisions = this._getFromStorage('divisions');

    const seasonsOut = seasons.map(s => ({
      season_id: s.id,
      name: s.name,
      year: s.year,
      season_type: s.season_type,
      is_active: !!s.is_active
    }));

    const divisionsOut = divisions.map(d => ({
      division_id: d.id,
      code: d.code,
      name: d.name
    }));

    const days_of_week = [
      { value: 'monday', label: 'Monday', is_weekday: true },
      { value: 'tuesday', label: 'Tuesday', is_weekday: true },
      { value: 'wednesday', label: 'Wednesday', is_weekday: true },
      { value: 'thursday', label: 'Thursday', is_weekday: true },
      { value: 'friday', label: 'Friday', is_weekday: true },
      { value: 'saturday', label: 'Saturday', is_weekday: false },
      { value: 'sunday', label: 'Sunday', is_weekday: false }
    ];

    const time_ranges = [
      { value: 'morning_08_12', label: 'Morning (8:00–12:00)', start_time: '08:00', end_time: '12:00' },
      { value: 'afternoon_12_17', label: 'Afternoon (12:00–5:00)', start_time: '12:00', end_time: '17:00' },
      { value: 'evening_17_21', label: 'Evening (5:00–9:00)', start_time: '17:00', end_time: '21:00' }
    ];

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'time_asc', label: 'Start Time: Earliest First' },
      { value: 'time_desc', label: 'Start Time: Latest First' },
      { value: 'name_asc', label: 'Name: A–Z' }
    ];

    return {
      seasons: seasonsOut,
      divisions: divisionsOut,
      days_of_week,
      time_ranges,
      sort_options
    };
  }

  // ------------------------
  // Interface: searchProgramSessions
  // ------------------------
  searchProgramSessions(seasonId, divisionId, filters, sort, page, page_size) {
    const programs = this._getFromStorage('programs');
    const sessions = this._getFromStorage('program_sessions');
    const seasons = this._getFromStorage('seasons');
    const divisions = this._getFromStorage('divisions');
    const fields = this._getFromStorage('fields');

    const pageNum = page || 1;
    const size = page_size || 25;
    const filtersObj = filters || {};
    const sortObj = sort || {};

    // Filter programs by season/division
    const programIdsAllowed = {};
    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];
      if (seasonId && p.season_id !== seasonId) continue;
      if (divisionId && p.division_id !== divisionId) continue;
      programIdsAllowed[p.id] = true;
    }

    const filtered = [];
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (seasonId || divisionId) {
        if (!programIdsAllowed[s.program_id]) continue;
      }
      if (filtersObj.days_of_week && filtersObj.days_of_week.length > 0) {
        if (filtersObj.days_of_week.indexOf(s.day_of_week) === -1) continue;
      }
      if (filtersObj.is_weekday_only) {
        if (!s.is_weekday) continue;
      }
      if (filtersObj.earliest_start_time) {
        if (!s.start_time || s.start_time < filtersObj.earliest_start_time) continue;
      }
      if (filtersObj.latest_start_time) {
        if (!s.start_time || s.start_time > filtersObj.latest_start_time) continue;
      }
      if (filtersObj.status && s.status !== filtersObj.status) continue;
      filtered.push(s);
    }

    // Sorting
    const sortBy = sortObj.sort_by || 'price';
    const dir = (sortObj.sort_direction || 'asc').toLowerCase();
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'start_time') {
        cmp = (a.start_time || '').localeCompare(b.start_time || '');
      } else if (sortBy === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '');
      } else {
        // price
        cmp = (a.price || 0) - (b.price || 0);
      }
      return dir === 'desc' ? -cmp : cmp;
    });

    const total = filtered.length;
    const startIndex = (pageNum - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    // Build lookup maps
    const seasonMap = {};
    for (let i = 0; i < seasons.length; i++) seasonMap[seasons[i].id] = seasons[i];
    const divisionMap = {};
    for (let i = 0; i < divisions.length; i++) divisionMap[divisions[i].id] = divisions[i];
    const programMap = {};
    for (let i = 0; i < programs.length; i++) programMap[programs[i].id] = programs[i];
    const fieldMap = {};
    for (let i = 0; i < fields.length; i++) fieldMap[fields[i].id] = fields[i];

    const sessionsOut = [];
    for (let i = 0; i < pageItems.length; i++) {
      const s = pageItems[i];
      const program = programMap[s.program_id] || null;
      const season = program ? seasonMap[program.season_id] : null;
      const division = program ? divisionMap[program.division_id] : null;
      const field = s.field_id ? fieldMap[s.field_id] : null;
      sessionsOut.push({
        program_session_id: s.id,
        program_name: program ? program.name : '',
        season_name: season ? season.name : '',
        division_name: division ? division.name : '',
        day_of_week: s.day_of_week,
        start_time: s.start_time || null,
        end_time: s.end_time || null,
        field_name: field ? field.name : '',
        price: s.price,
        spots_remaining: s.spots_remaining,
        status: s.status
      });
    }

    return {
      sessions: sessionsOut,
      total
    };
  }

  // ------------------------
  // Interface: getProgramSessionDetails
  // ------------------------
  getProgramSessionDetails(programSessionId) {
    const sessions = this._getFromStorage('program_sessions');
    const programs = this._getFromStorage('programs');
    const seasons = this._getFromStorage('seasons');
    const divisions = this._getFromStorage('divisions');
    const fields = this._getFromStorage('fields');

    let session = null;
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === programSessionId) {
        session = sessions[i];
        break;
      }
    }
    if (!session) {
      return null;
    }

    let program = null;
    for (let i = 0; i < programs.length; i++) {
      if (programs[i].id === session.program_id) {
        program = programs[i];
        break;
      }
    }

    let season = null;
    let division = null;
    if (program) {
      for (let i = 0; i < seasons.length; i++) {
        if (seasons[i].id === program.season_id) {
          season = seasons[i];
          break;
        }
      }
      for (let i = 0; i < divisions.length; i++) {
        if (divisions[i].id === program.division_id) {
          division = divisions[i];
          break;
        }
      }
    }

    let field = null;
    if (session.field_id) {
      for (let i = 0; i < fields.length; i++) {
        if (fields[i].id === session.field_id) {
          field = fields[i];
          break;
        }
      }
    }

    return {
      program_session_id: session.id,
      program_session_name: session.name,
      program_name: program ? program.name : '',
      season_name: season ? season.name : '',
      division_name: division ? division.name : '',
      description: program ? program.description || '' : '',
      day_of_week: session.day_of_week,
      start_time: session.start_time || null,
      end_time: session.end_time || null,
      field_name: field ? field.name : '',
      price: session.price,
      spots_remaining: session.spots_remaining,
      status: session.status,
      location_summary: program ? program.location_summary || '' : '',
      season_start_date: season ? season.start_date || null : null,
      season_end_date: season ? season.end_date || null : null,
      division_min_age: division ? division.min_age || null : null,
      division_max_age: division ? division.max_age || null : null
    };
  }

  // ------------------------
  // Interface: submitProgramRegistration
  // ------------------------
  submitProgramRegistration(programSessionId, player, guardian, payment_option) {
    const sessions = this._getFromStorage('program_sessions');
    const programs = this._getFromStorage('programs');
    const players = this._getFromStorage('players');
    const guardians = this._getFromStorage('guardian_contacts');
    const registrations = this._getFromStorage('program_registrations');

    let session = null;
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === programSessionId) {
        session = sessions[i];
        break;
      }
    }
    if (!session || session.status !== 'open') {
      return {
        success: false,
        registration_id: null,
        status: 'pending',
        amount_due: 0,
        amount_paid: 0,
        payment_option,
        confirmation_message: 'Session not available for registration.'
      };
    }
    if (typeof session.spots_remaining === 'number' && session.spots_remaining <= 0) {
      return {
        success: false,
        registration_id: null,
        status: 'pending',
        amount_due: 0,
        amount_paid: 0,
        payment_option,
        confirmation_message: 'No spots remaining in this session.'
      };
    }

    // Determine division from program
    let program = null;
    for (let i = 0; i < programs.length; i++) {
      if (programs[i].id === session.program_id) {
        program = programs[i];
        break;
      }
    }

    const now = new Date().toISOString();

    const playerId = this._generateId('player');
    const newPlayer = {
      id: playerId,
      first_name: player.first_name,
      last_name: player.last_name,
      date_of_birth: player.date_of_birth,
      division_id: program ? program.division_id : null,
      notes: player.notes || ''
    };
    players.push(newPlayer);

    const guardianId = this._generateId('guardian');
    const newGuardian = {
      id: guardianId,
      name: guardian.name,
      phone: guardian.phone,
      email: guardian.email,
      preferred_contact_method: guardian.preferred_contact_method || 'email'
    };
    guardians.push(newGuardian);

    const registrationId = this._generateId('prog_reg');
    const price = session.price || 0;
    let amount_paid = 0;
    let amount_due = price;
    if (payment_option === 'pay_in_full') {
      amount_paid = price;
      amount_due = 0;
    }

    const newReg = {
      id: registrationId,
      program_session_id: session.id,
      player_id: playerId,
      guardian_contact_id: guardianId,
      registration_date: now,
      payment_option,
      amount_due,
      amount_paid,
      status: 'confirmed'
    };
    registrations.push(newReg);

    // Decrement spots_remaining if tracked
    for (let i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        if (typeof sessions[i].spots_remaining === 'number') {
          sessions[i].spots_remaining = Math.max(0, sessions[i].spots_remaining - 1);
        }
        break;
      }
    }

    this._saveToStorage('players', players);
    this._saveToStorage('guardian_contacts', guardians);
    this._saveToStorage('program_registrations', registrations);
    this._saveToStorage('program_sessions', sessions);

    return {
      success: true,
      registration_id: registrationId,
      status: 'confirmed',
      amount_due,
      amount_paid,
      payment_option,
      confirmation_message: 'Program registration completed.'
    };
  }

  // ------------------------
  // Interface: getScheduleFilterOptions
  // ------------------------
  getScheduleFilterOptions() {
    const divisions = this._getFromStorage('divisions');
    const teams = this._getFromStorage('teams');

    const divisionsOut = divisions.map(d => ({
      division_id: d.id,
      code: d.code,
      name: d.name
    }));

    const teamsOut = teams.map(t => ({
      team_id: t.id,
      team_name: t.name,
      division_id: t.division_id,
      division_name: (divisions.find(d => d.id === t.division_id) || {}).name || ''
    }));

    const today = new Date();
    const todayStr = this._getTodayDateString();

    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const weekStr = weekFromNow.toISOString().slice(0, 10);

    const date_presets = [
      {
        value: 'today',
        label: 'Today',
        start_date: todayStr,
        end_date: todayStr
      },
      {
        value: 'next_7_days',
        label: 'Next 7 Days',
        start_date: todayStr,
        end_date: weekStr
      }
    ];

    const sort_options = [
      { value: 'date_time_asc', label: 'Earliest First' },
      { value: 'date_time_desc', label: 'Latest First' }
    ];

    return {
      divisions: divisionsOut,
      teams: teamsOut,
      date_presets,
      sort_options
    };
  }

  // ------------------------
  // Interface: searchGames
  // ------------------------
  searchGames(filters, sort, page, page_size) {
    const games = this._getFromStorage('games');
    const divisions = this._getFromStorage('divisions');
    const fields = this._getFromStorage('fields');
    const teams = this._getFromStorage('teams');
    const savedGames = this._getFromStorage('saved_games');

    const filtersObj = filters || {};
    const sortObj = sort || {};
    const pageNum = page || 1;
    const size = page_size || 50;

    const filtered = [];
    for (let i = 0; i < games.length; i++) {
      const g = games[i];
      if (filtersObj.divisionId && g.division_id !== filtersObj.divisionId) continue;
      if (filtersObj.teamId) {
        if (g.home_team_id !== filtersObj.teamId && g.away_team_id !== filtersObj.teamId) continue;
      }
      if (filtersObj.start_date) {
        if (!g.game_date || g.game_date.slice(0, 10) < filtersObj.start_date) continue;
      }
      if (filtersObj.end_date) {
        if (!g.game_date || g.game_date.slice(0, 10) > filtersObj.end_date) continue;
      }
      filtered.push(g);
    }

    const sortBy = sortObj.sort_by || 'game_date';
    const dir = (sortObj.sort_direction || 'asc').toLowerCase();
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'start_time') {
        cmp = this._compareDateTimeStrings(a.game_date, a.start_time, b.game_date, b.start_time);
      } else {
        // default sort by game_date + start_time
        cmp = this._compareDateTimeStrings(a.game_date, a.start_time, b.game_date, b.start_time);
      }
      return dir === 'desc' ? -cmp : cmp;
    });

    const total = filtered.length;
    const startIndex = (pageNum - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const divisionMap = {};
    for (let i = 0; i < divisions.length; i++) divisionMap[divisions[i].id] = divisions[i];
    const fieldMap = {};
    for (let i = 0; i < fields.length; i++) fieldMap[fields[i].id] = fields[i];
    const teamMap = {};
    for (let i = 0; i < teams.length; i++) teamMap[teams[i].id] = teams[i];

    const savedGameIdsSet = {};
    for (let i = 0; i < savedGames.length; i++) {
      savedGameIdsSet[savedGames[i].game_id] = true;
    }

    const outGames = [];
    for (let i = 0; i < pageItems.length; i++) {
      const g = pageItems[i];
      const division = divisionMap[g.division_id] || null;
      const field = g.field_id ? fieldMap[g.field_id] : null;
      const homeTeam = teamMap[g.home_team_id] || null;
      const awayTeam = teamMap[g.away_team_id] || null;
      outGames.push({
        game_id: g.id,
        division_name: division ? division.name : '',
        game_date: g.game_date,
        start_time: g.start_time || null,
        end_time: g.end_time || null,
        field_name: field ? field.name : '',
        home_team_name: homeTeam ? homeTeam.name : '',
        away_team_name: awayTeam ? awayTeam.name : '',
        status: g.status,
        is_in_my_schedule: !!savedGameIdsSet[g.id]
      });
    }

    return {
      games: outGames,
      total
    };
  }

  // ------------------------
  // Interface: addGameToMySchedule
  // ------------------------
  addGameToMySchedule(gameId) {
    const savedGames = this._getFromStorage('saved_games');

    for (let i = 0; i < savedGames.length; i++) {
      if (savedGames[i].game_id === gameId) {
        return {
          success: true,
          saved_game_id: savedGames[i].id,
          added_at: savedGames[i].added_at,
          message: 'Game already in schedule.'
        };
      }
    }

    const id = this._generateId('saved_game');
    const added_at = new Date().toISOString();
    savedGames.push({ id, game_id: gameId, added_at });
    this._saveToStorage('saved_games', savedGames);
    this._saveSingleUserState();

    return {
      success: true,
      saved_game_id: id,
      added_at,
      message: 'Game added to My Schedule.'
    };
  }

  // ------------------------
  // Interface: removeGameFromMySchedule
  // ------------------------
  removeGameFromMySchedule(gameId) {
    const savedGames = this._getFromStorage('saved_games');
    const remaining = [];
    let removed = false;
    for (let i = 0; i < savedGames.length; i++) {
      const sg = savedGames[i];
      if (sg.game_id === gameId) {
        removed = true;
        continue;
      }
      remaining.push(sg);
    }
    this._saveToStorage('saved_games', remaining);
    this._saveSingleUserState();

    return {
      success: removed,
      message: removed ? 'Game removed from My Schedule.' : 'Game not found in My Schedule.'
    };
  }

  // ------------------------
  // Interface: getMyScheduleGames (with foreign key resolution)
  // ------------------------
  getMyScheduleGames() {
    const savedGames = this._getFromStorage('saved_games');
    const games = this._getFromStorage('games');
    const divisions = this._getFromStorage('divisions');
    const fields = this._getFromStorage('fields');
    const teams = this._getFromStorage('teams');

    const gameMap = {};
    for (let i = 0; i < games.length; i++) gameMap[games[i].id] = games[i];
    const divisionMap = {};
    for (let i = 0; i < divisions.length; i++) divisionMap[divisions[i].id] = divisions[i];
    const fieldMap = {};
    for (let i = 0; i < fields.length; i++) fieldMap[fields[i].id] = fields[i];
    const teamMap = {};
    for (let i = 0; i < teams.length; i++) teamMap[teams[i].id] = teams[i];

    const out = [];
    for (let i = 0; i < savedGames.length; i++) {
      const sg = savedGames[i];
      const g = gameMap[sg.game_id] || null;
      if (!g) continue; // skip orphaned
      const division = divisionMap[g.division_id] || null;
      const field = g.field_id ? fieldMap[g.field_id] : null;
      const homeTeam = teamMap[g.home_team_id] || null;
      const awayTeam = teamMap[g.away_team_id] || null;
      out.push({
        saved_game_id: sg.id,
        game_id: g.id,
        division_name: division ? division.name : '',
        game_date: g.game_date,
        start_time: g.start_time || null,
        field_name: field ? field.name : '',
        home_team_name: homeTeam ? homeTeam.name : '',
        away_team_name: awayTeam ? awayTeam.name : '',
        status: g.status,
        // foreign key resolution per requirement
        game: g
      });
    }

    return {
      games: out,
      total: out.length
    };
  }

  // ------------------------
  // Interface: getVolunteerFilterOptions
  // ------------------------
  getVolunteerFilterOptions() {
    const shifts = this._getFromStorage('volunteer_shifts');
    const fields = this._getFromStorage('fields');

    // Derive months from existing shifts (no mocked domain data)
    const monthSet = {};
    for (let i = 0; i < shifts.length; i++) {
      const d = shifts[i].date;
      if (!d) continue;
      const ym = d.slice(0, 7); // 'YYYY-MM'
      monthSet[ym] = true;
    }
    const months = [];
    const monthKeys = Object.keys(monthSet).sort();
    for (let i = 0; i < monthKeys.length; i++) {
      const ym = monthKeys[i];
      const range = this._getMonthRange(ym);
      months.push({
        label: this._getMonthLabel(ym),
        month_value: ym,
        start_date: range.start,
        end_date: range.end
      });
    }

    const fieldsOut = fields.map(f => ({
      field_id: f.id,
      field_name: f.name,
      has_lights: !!f.has_lights
    }));

    const roles = [
      { value: 'concession_stand', label: 'Concession Stand' },
      { value: 'field_crew', label: 'Field Crew' },
      { value: 'scorekeeper', label: 'Scorekeeper' },
      { value: 'umpire', label: 'Umpire' },
      { value: 'other', label: 'Other' }
    ];

    const time_of_day_options = [
      { value: 'morning', label: 'Morning', start_time: '08:00', end_time: '12:00' },
      { value: 'afternoon', label: 'Afternoon', start_time: '12:00', end_time: '17:00' },
      { value: 'evening', label: 'Evening', start_time: '17:00', end_time: '22:00' }
    ];

    const sort_options = [
      { value: 'date_time_asc', label: 'Earliest First' },
      { value: 'date_time_desc', label: 'Latest First' }
    ];

    return {
      months,
      fields: fieldsOut,
      roles,
      time_of_day_options,
      sort_options
    };
  }

  // ------------------------
  // Interface: searchVolunteerShifts
  // ------------------------
  searchVolunteerShifts(filters, sort, page, page_size) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const fields = this._getFromStorage('fields');

    const filtersObj = filters || {};
    const sortObj = sort || {};
    const pageNum = page || 1;
    const size = page_size || 50;

    const filtered = [];
    for (let i = 0; i < shifts.length; i++) {
      const s = shifts[i];
      const dateStr = s.date ? s.date.slice(0, 10) : null;

      if (filtersObj.month) {
        if (!dateStr || dateStr.slice(0, 7) !== filtersObj.month) continue;
      }
      if (filtersObj.date_start) {
        if (!dateStr || dateStr < filtersObj.date_start) continue;
      }
      if (filtersObj.date_end) {
        if (!dateStr || dateStr > filtersObj.date_end) continue;
      }
      if (filtersObj.fieldId && s.field_id !== filtersObj.fieldId) continue;
      if (filtersObj.role && s.role !== filtersObj.role) continue;
      if (filtersObj.earliest_start_time) {
        if (!s.start_time || s.start_time < filtersObj.earliest_start_time) continue;
      }
      if (filtersObj.latest_start_time) {
        if (!s.start_time || s.start_time > filtersObj.latest_start_time) continue;
      }
      filtered.push(s);
    }

    const sortBy = sortObj.sort_by || 'date_time';
    const dir = (sortObj.sort_direction || 'asc').toLowerCase();
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date_time') {
        cmp = this._compareDateTimeStrings(a.date, a.start_time, b.date, b.start_time);
      }
      return dir === 'desc' ? -cmp : cmp;
    });

    const total = filtered.length;
    const startIndex = (pageNum - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const fieldMap = {};
    for (let i = 0; i < fields.length; i++) fieldMap[fields[i].id] = fields[i];

    const out = [];
    for (let i = 0; i < pageItems.length; i++) {
      const s = pageItems[i];
      const field = s.field_id ? fieldMap[s.field_id] : null;
      out.push({
        shift_id: s.id,
        role: s.role,
        field_name: field ? field.name : '',
        date: s.date ? s.date.slice(0, 10) : null,
        start_time: s.start_time || null,
        end_time: s.end_time || null,
        capacity: s.capacity,
        spots_remaining: s.spots_remaining,
        notes: s.notes || ''
      });
    }

    return {
      shifts: out,
      total
    };
  }

  // ------------------------
  // Interface: getVolunteerShiftDetails
  // ------------------------
  getVolunteerShiftDetails(volunteerShiftId) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const fields = this._getFromStorage('fields');

    let shift = null;
    for (let i = 0; i < shifts.length; i++) {
      if (shifts[i].id === volunteerShiftId) {
        shift = shifts[i];
        break;
      }
    }
    if (!shift) return null;

    let field = null;
    for (let i = 0; i < fields.length; i++) {
      if (fields[i].id === shift.field_id) {
        field = fields[i];
        break;
      }
    }

    return {
      shift_id: shift.id,
      role: shift.role,
      field_name: field ? field.name : '',
      date: shift.date ? shift.date.slice(0, 10) : null,
      start_time: shift.start_time || null,
      end_time: shift.end_time || null,
      capacity: shift.capacity,
      spots_remaining: shift.spots_remaining,
      notes: shift.notes || ''
    };
  }

  // ------------------------
  // Interface: submitVolunteerSignup
  // ------------------------
  submitVolunteerSignup(volunteerShiftId, volunteer) {
    const shifts = this._getFromStorage('volunteer_shifts');
    const signups = this._getFromStorage('volunteer_signups');

    let shift = null;
    for (let i = 0; i < shifts.length; i++) {
      if (shifts[i].id === volunteerShiftId) {
        shift = shifts[i];
        break;
      }
    }
    if (!shift) {
      return {
        success: false,
        volunteer_signup_id: null,
        status: 'cancelled',
        signup_time: null,
        confirmation_message: 'Shift not found.'
      };
    }
    if (typeof shift.spots_remaining === 'number' && shift.spots_remaining <= 0) {
      return {
        success: false,
        volunteer_signup_id: null,
        status: 'cancelled',
        signup_time: null,
        confirmation_message: 'No spots remaining for this shift.'
      };
    }

    const now = new Date().toISOString();
    const signupId = this._generateId('vol_signup');
    const newSignup = {
      id: signupId,
      volunteer_shift_id: volunteerShiftId,
      volunteer_name: volunteer.name,
      phone: volunteer.phone,
      email: volunteer.email,
      signup_time: now,
      status: 'confirmed'
    };
    signups.push(newSignup);

    // decrement spots_remaining
    for (let i = 0; i < shifts.length; i++) {
      if (shifts[i].id === shift.id) {
        if (typeof shifts[i].spots_remaining === 'number') {
          shifts[i].spots_remaining = Math.max(0, shifts[i].spots_remaining - 1);
        }
        break;
      }
    }

    this._saveToStorage('volunteer_signups', signups);
    this._saveToStorage('volunteer_shifts', shifts);
    this._saveSingleUserState();

    return {
      success: true,
      volunteer_signup_id: signupId,
      status: 'confirmed',
      signup_time: now,
      confirmation_message: 'Volunteer shift confirmed.'
    };
  }

  // ------------------------
  // Interface: getMyVolunteerShifts (with foreign key resolution)
  // ------------------------
  getMyVolunteerShifts() {
    const signups = this._getFromStorage('volunteer_signups');
    const shifts = this._getFromStorage('volunteer_shifts');
    const fields = this._getFromStorage('fields');

    const shiftMap = {};
    for (let i = 0; i < shifts.length; i++) shiftMap[shifts[i].id] = shifts[i];
    const fieldMap = {};
    for (let i = 0; i < fields.length; i++) fieldMap[fields[i].id] = fields[i];

    const out = [];
    for (let i = 0; i < signups.length; i++) {
      const s = signups[i];
      const shift = shiftMap[s.volunteer_shift_id] || null;
      if (!shift) continue;
      const field = shift.field_id ? fieldMap[shift.field_id] : null;
      out.push({
        volunteer_signup_id: s.id,
        shift_id: shift.id,
        role: shift.role,
        field_name: field ? field.name : '',
        date: shift.date ? shift.date.slice(0, 10) : null,
        start_time: shift.start_time || null,
        end_time: shift.end_time || null,
        status: s.status,
        // foreign key resolution
        shift
      });
    }

    return {
      shifts: out,
      total: out.length
    };
  }

  // ------------------------
  // Interface: cancelVolunteerSignup
  // ------------------------
  cancelVolunteerSignup(volunteerSignupId) {
    const signups = this._getFromStorage('volunteer_signups');
    const shifts = this._getFromStorage('volunteer_shifts');

    let found = null;
    for (let i = 0; i < signups.length; i++) {
      if (signups[i].id === volunteerSignupId) {
        found = signups[i];
        break;
      }
    }
    if (!found) {
      return {
        success: false,
        status_after: 'cancelled',
        message: 'Signup not found.'
      };
    }

    if (found.status !== 'cancelled') {
      found.status = 'cancelled';
      // increment spots_remaining back for the shift
      for (let i = 0; i < shifts.length; i++) {
        if (shifts[i].id === found.volunteer_shift_id) {
          if (typeof shifts[i].spots_remaining === 'number') {
            shifts[i].spots_remaining = shifts[i].spots_remaining + 1;
          }
          break;
        }
      }
      this._saveToStorage('volunteer_signups', signups);
      this._saveToStorage('volunteer_shifts', shifts);
      this._saveSingleUserState();
    }

    return {
      success: true,
      status_after: 'cancelled',
      message: 'Volunteer signup cancelled.'
    };
  }

  // ------------------------
  // Interface: getStoreCategories
  // ------------------------
  getStoreCategories() {
    const cats = this._getFromStorage('product_categories');
    const categories = cats.map(c => ({
      category_id: c.id,
      category_key: c.category_key,
      name: c.name,
      description: c.description || ''
    }));
    return { categories };
  }

  // ------------------------
  // Interface: getCategoryFilterOptions
  // ------------------------
  getCategoryFilterOptions(categoryId) {
    const products = this._getFromStorage('products');

    const inCategory = [];
    for (let i = 0; i < products.length; i++) {
      if (products[i].category_id === categoryId) {
        inCategory.push(products[i]);
      }
    }

    // Price ranges derived from actual products
    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < inCategory.length; i++) {
      const p = inCategory[i];
      if (minPrice === null || p.price < minPrice) minPrice = p.price;
      if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
    }
    const price_ranges = [];
    if (minPrice !== null && maxPrice !== null) {
      price_ranges.push({ label: 'All Prices', min_price: minPrice, max_price: maxPrice });
    }

    const typeSet = {};
    const sizeSegmentSet = {};
    const ratingSet = {};
    for (let i = 0; i < inCategory.length; i++) {
      const p = inCategory[i];
      if (p.product_type) typeSet[p.product_type] = true;
      if (p.is_youth) sizeSegmentSet['youth'] = true;
      if (p.is_adult) sizeSegmentSet['adult'] = true;
      if (!p.is_youth && !p.is_adult) sizeSegmentSet['one_size'] = true;
      if (typeof p.rating === 'number') {
        const bucket = Math.floor(p.rating);
        ratingSet[bucket] = true;
      }
    }

    const product_types = Object.keys(typeSet).map(v => ({ value: v, label: v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) }));

    const size_segments = Object.keys(sizeSegmentSet).map(v => ({
      value: v,
      label: v === 'one_size' ? 'One Size' : (v.charAt(0).toUpperCase() + v.slice(1))
    }));

    const ratingBuckets = Object.keys(ratingSet).sort();
    const rating_options = [];
    for (let i = 0; i < ratingBuckets.length; i++) {
      const r = parseInt(ratingBuckets[i], 10);
      if (r >= 1) {
        rating_options.push({ label: r + '.0 & up', min_rating: r });
      }
    }

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'name_asc', label: 'Name: A–Z' }
    ];

    return {
      price_ranges,
      product_types,
      size_segments,
      rating_options,
      sort_options
    };
  }

  // ------------------------
  // Interface: searchProducts
  // ------------------------
  searchProducts(categoryId, filters, sort, page, page_size) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const filtersObj = filters || {};
    const sortObj = sort || {};
    const pageNum = page || 1;
    const size = page_size || 24;

    const categoryMap = {};
    for (let i = 0; i < categories.length; i++) categoryMap[categories[i].id] = categories[i];

    const filtered = [];
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (p.category_id !== categoryId) continue;
      if (filtersObj.product_type && p.product_type !== filtersObj.product_type) continue;
      if (typeof filtersObj.min_price === 'number' && p.price < filtersObj.min_price) continue;
      if (typeof filtersObj.max_price === 'number' && p.price > filtersObj.max_price) continue;
      if (typeof filtersObj.min_rating === 'number') {
        if (typeof p.rating !== 'number' || p.rating < filtersObj.min_rating) continue;
      }
      if (filtersObj.size_segment) {
        if (filtersObj.size_segment === 'youth' && !p.is_youth) continue;
        if (filtersObj.size_segment === 'adult' && !p.is_adult) continue;
        if (filtersObj.size_segment === 'one_size' && (p.is_youth || p.is_adult)) continue;
      }
      if (filtersObj.active_only && !p.active) continue;
      if (filtersObj.search_query) {
        const q = filtersObj.search_query.toLowerCase();
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        if (name.indexOf(q) === -1 && desc.indexOf(q) === -1) continue;
      }
      filtered.push(p);
    }

    const sortBy = sortObj.sort_by || 'name';
    const dir = (sortObj.sort_direction || 'asc').toLowerCase();
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'price') {
        cmp = (a.price || 0) - (b.price || 0);
      } else if (sortBy === 'rating') {
        cmp = (a.rating || 0) - (b.rating || 0);
      } else {
        cmp = (a.name || '').localeCompare(b.name || '');
      }
      return dir === 'desc' ? -cmp : cmp;
    });

    const total = filtered.length;
    const startIndex = (pageNum - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const out = [];
    for (let i = 0; i < pageItems.length; i++) {
      const p = pageItems[i];
      const cat = categoryMap[p.category_id] || null;
      out.push({
        product_id: p.id,
        name: p.name,
        price: p.price,
        image_url: p.image_url || '',
        rating: typeof p.rating === 'number' ? p.rating : null,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : 0,
        product_type: p.product_type,
        category_name: cat ? cat.name : '',
        is_youth: !!p.is_youth,
        is_adult: !!p.is_adult,
        available_sizes: p.available_sizes || [],
        available_colors: p.available_colors || []
      });
    }

    return {
      products: out,
      total
    };
  }

  // ------------------------
  // Interface: getProductDetails
  // ------------------------
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) return null;

    let category = null;
    for (let i = 0; i < categories.length; i++) {
      if (categories[i].id === product.category_id) {
        category = categories[i];
        break;
      }
    }

    return {
      product_id: product.id,
      name: product.name,
      description: product.description || '',
      price: product.price,
      image_url: product.image_url || '',
      rating: typeof product.rating === 'number' ? product.rating : null,
      rating_count: typeof product.rating_count === 'number' ? product.rating_count : 0,
      product_type: product.product_type,
      category_name: category ? category.name : '',
      is_youth: !!product.is_youth,
      is_adult: !!product.is_adult,
      available_sizes: product.available_sizes || [],
      available_colors: product.available_colors || [],
      active: !!product.active
    };
  }

  // ------------------------
  // Interface: addProductToCart
  // ------------------------
  addProductToCart(productId, quantity, selected_size, selected_color) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let product = null;
    for (let i = 0; i < products.length; i++) {
      if (products[i].id === productId) {
        product = products[i];
        break;
      }
    }
    if (!product) {
      return {
        success: false,
        cart_item_id: null,
        message: 'Product not found.',
        cart_summary: { item_count: 0, subtotal: 0 }
      };
    }

    // Try to merge with existing line items of same product & options
    let existing = null;
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cart_id === cart.id && item.product_id === productId && item.selected_size === selected_size && item.selected_color === selected_color) {
        existing = item;
        break;
      }
    }

    if (existing) {
      existing.quantity += qty;
    } else {
      const cartItemId = this._generateId('cart_item');
      const newItem = {
        id: cartItemId,
        cart_id: cart.id,
        product_id: productId,
        quantity: qty,
        unit_price: product.price,
        selected_size: selected_size || null,
        selected_color: selected_color || null,
        added_at: new Date().toISOString()
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);

    const totals = this._recalculateCartTotals(cart.id);
    let item_count = 0;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id) item_count += cartItems[i].quantity;
    }

    const cart_item_id = existing ? existing.id : (cartItems[cartItems.length - 1] && cartItems[cartItems.length - 1].id);

    return {
      success: true,
      cart_item_id,
      message: 'Product added to cart.',
      cart_summary: {
        item_count,
        subtotal: totals.subtotal
      }
    };
  }

  // ------------------------
  // Interface: getCart (with foreign key resolution)
  // ------------------------
  getCart() {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');

    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      return {
        items: [],
        totals: {
          subtotal: 0,
          estimated_tax: 0,
          shipping_cost_estimate: 0,
          total_estimate: 0
        }
      };
    }

    const itemsForCart = [];
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id) {
        itemsForCart.push(cartItems[i]);
      }
    }

    const products = this._getFromStorage('products');
    const productMap = {};
    for (let i = 0; i < products.length; i++) productMap[products[i].id] = products[i];

    const itemsOut = [];
    for (let i = 0; i < itemsForCart.length; i++) {
      const item = itemsForCart[i];
      const product = productMap[item.product_id] || null;
      const line_subtotal = (item.unit_price || 0) * (item.quantity || 0);
      itemsOut.push({
        cart_item_id: item.id,
        product_id: item.product_id,
        product_name: product ? product.name : '',
        product_image_url: product ? product.image_url || '' : '',
        selected_size: item.selected_size || null,
        selected_color: item.selected_color || null,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_subtotal,
        // foreign key resolution
        product
      });
    }

    const totals = this._recalculateCartTotals(cart.id);

    return {
      items: itemsOut,
      totals
    };
  }

  // ------------------------
  // Interface: updateCartItemQuantity
  // ------------------------
  updateCartItemQuantity(cartItemId, quantity) {
    if (quantity < 1) {
      return {
        success: false,
        updated_item: null,
        cart_totals: {
          subtotal: 0,
          estimated_tax: 0,
          shipping_cost_estimate: 0,
          total_estimate: 0
        },
        message: 'Quantity must be at least 1.'
      };
    }

    const cartItems = this._getFromStorage('cart_items');
    let item = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        item = cartItems[i];
        break;
      }
    }
    if (!item) {
      return {
        success: false,
        updated_item: null,
        cart_totals: {
          subtotal: 0,
          estimated_tax: 0,
          shipping_cost_estimate: 0,
          total_estimate: 0
        },
        message: 'Cart item not found.'
      };
    }

    item.quantity = quantity;
    this._saveToStorage('cart_items', cartItems);

    const totals = this._recalculateCartTotals(item.cart_id);
    const updated_item = {
      cart_item_id: item.id,
      quantity: item.quantity,
      line_subtotal: (item.unit_price || 0) * (item.quantity || 0)
    };

    return {
      success: true,
      updated_item,
      cart_totals: totals,
      message: 'Cart item updated.'
    };
  }

  // ------------------------
  // Interface: removeCartItem
  // ------------------------
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    let cartId = null;
    const remaining = [];
    let removed = false;
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.id === cartItemId) {
        cartId = item.cart_id;
        removed = true;
        continue;
      }
      remaining.push(item);
    }
    this._saveToStorage('cart_items', remaining);

    let totals = {
      subtotal: 0,
      estimated_tax: 0,
      shipping_cost_estimate: 0,
      total_estimate: 0
    };
    if (cartId) {
      totals = this._recalculateCartTotals(cartId);
    }

    return {
      success: removed,
      cart_totals: totals,
      message: removed ? 'Cart item removed.' : 'Cart item not found.'
    };
  }

  // ------------------------
  // Interface: getCheckoutSummary
  // ------------------------
  getCheckoutSummary() {
    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');

    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        cart = carts[i];
        break;
      }
    }

    if (!cart) {
      return {
        items: [],
        totals: {
          subtotal: 0,
          estimated_tax: 0,
          shipping_cost_estimate: 0,
          total_estimate: 0
        },
        shipping_methods: [
          { value: 'standard', label: 'Standard Shipping', description: 'Standard delivery', cost_estimate: 0, is_default: true },
          { value: 'expedited', label: 'Expedited Shipping', description: 'Faster delivery', cost_estimate: 0, is_default: false },
          { value: 'overnight', label: 'Overnight Shipping', description: 'Next-day delivery', cost_estimate: 0, is_default: false }
        ],
        default_shipping_method: 'standard'
      };
    }

    const productMap = {};
    for (let i = 0; i < products.length; i++) productMap[products[i].id] = products[i];

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const item = cartItems[i];
      if (item.cart_id !== cart.id) continue;
      const product = productMap[item.product_id] || null;
      const line_subtotal = (item.unit_price || 0) * (item.quantity || 0);
      items.push({
        product_name: product ? product.name : '',
        selected_size: item.selected_size || null,
        selected_color: item.selected_color || null,
        unit_price: item.unit_price,
        quantity: item.quantity,
        line_subtotal
      });
    }

    const totals = this._recalculateCartTotals(cart.id);

    const shipping_methods = [
      { value: 'standard', label: 'Standard Shipping', description: 'Standard delivery', cost_estimate: 5, is_default: true },
      { value: 'expedited', label: 'Expedited Shipping', description: 'Faster delivery', cost_estimate: 10, is_default: false },
      { value: 'overnight', label: 'Overnight Shipping', description: 'Next-day delivery', cost_estimate: 20, is_default: false }
    ];

    return {
      items,
      totals,
      shipping_methods,
      default_shipping_method: 'standard'
    };
  }

  // ------------------------
  // Interface: submitOrder
  // ------------------------
  submitOrder(shipping_method, shipping_address, contact_info) {
    const validMethods = ['standard', 'expedited', 'overnight'];
    if (validMethods.indexOf(shipping_method) === -1) {
      return {
        success: false,
        order_id: null,
        status: 'cancelled',
        shipping_method,
        totals: { subtotal: 0, tax: 0, shipping_cost: 0, total: 0 },
        confirmation_message: 'Invalid shipping method.'
      };
    }

    const carts = this._getFromStorage('carts');
    const cartItems = this._getFromStorage('cart_items');

    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      return {
        success: false,
        order_id: null,
        status: 'cancelled',
        shipping_method,
        totals: { subtotal: 0, tax: 0, shipping_cost: 0, total: 0 },
        confirmation_message: 'No open cart to checkout.'
      };
    }

    let hasItems = false;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id) {
        hasItems = true;
        break;
      }
    }
    if (!hasItems) {
      return {
        success: false,
        order_id: null,
        status: 'cancelled',
        shipping_method,
        totals: { subtotal: 0, tax: 0, shipping_cost: 0, total: 0 },
        confirmation_message: 'Cart is empty.'
      };
    }

    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const cartTotals = this._recalculateCartTotals(cart.id);
    const subtotal = cartTotals.subtotal;
    const tax = 0; // keep simple
    let shipping_cost = 5;
    if (shipping_method === 'expedited') shipping_cost = 10;
    if (shipping_method === 'overnight') shipping_cost = 20;
    const total = subtotal + tax + shipping_cost;

    const orderId = this._generateId('order');
    const now = new Date().toISOString();

    const order = {
      id: orderId,
      cart_id: cart.id,
      order_date: now,
      status: 'pending',
      shipping_method,
      shipping_name: shipping_address.shipping_name,
      shipping_address_line1: shipping_address.address_line1,
      shipping_address_line2: shipping_address.address_line2 || '',
      shipping_city: shipping_address.city,
      shipping_state: shipping_address.state,
      shipping_postal_code: shipping_address.postal_code,
      shipping_country: shipping_address.country,
      contact_email: contact_info.email,
      contact_phone: contact_info.phone,
      subtotal,
      tax,
      shipping_cost,
      total
    };
    orders.push(order);

    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id !== cart.id) continue;
      const oi = {
        id: this._generateId('order_item'),
        order_id: orderId,
        product_id: ci.product_id,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        selected_size: ci.selected_size || null,
        selected_color: ci.selected_color || null
      };
      orderItems.push(oi);
    }

    // Mark cart as checked_out
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].status = 'checked_out';
        carts[i].updated_at = now;
        break;
      }
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);
    this._saveToStorage('carts', carts);

    return {
      success: true,
      order_id: orderId,
      status: order.status,
      shipping_method,
      totals: {
        subtotal,
        tax,
        shipping_cost,
        total
      },
      confirmation_message: 'Order submitted.'
    };
  }

  // ------------------------
  // Interface: getClinicFilterOptions
  // ------------------------
  getClinicFilterOptions() {
    const clinics = this._getFromStorage('clinics');

    const monthSet = {};
    for (let i = 0; i < clinics.length; i++) {
      const c = clinics[i];
      if (!c.start_date) continue;
      const ym = c.start_date.slice(0, 7);
      monthSet[ym] = true;
    }
    const months = [];
    const monthKeys = Object.keys(monthSet).sort();
    for (let i = 0; i < monthKeys.length; i++) {
      const ym = monthKeys[i];
      const range = this._getMonthRange(ym);
      months.push({
        label: this._getMonthLabel(ym),
        month_value: ym,
        start_date: range.start,
        end_date: range.end
      });
    }

    const skill_focus_options = [
      { value: 'pitching', label: 'Pitching' },
      { value: 'hitting', label: 'Hitting' },
      { value: 'fielding', label: 'Fielding' },
      { value: 'catching', label: 'Catching' },
      { value: 'conditioning', label: 'Conditioning' },
      { value: 'general_skills', label: 'General Skills' }
    ];

    let minPrice = null;
    let maxPrice = null;
    for (let i = 0; i < clinics.length; i++) {
      const c = clinics[i];
      if (minPrice === null || c.price < minPrice) minPrice = c.price;
      if (maxPrice === null || c.price > maxPrice) maxPrice = c.price;
    }
    const price_ranges = [];
    if (minPrice !== null && maxPrice !== null) {
      price_ranges.push({ label: 'All Prices', min_price: minPrice, max_price: maxPrice });
    }

    const sort_options = [
      { value: 'start_date_asc', label: 'Start Date: Earliest First' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'hours_desc', label: 'Total Training Hours: High to Low' }
    ];

    return {
      months,
      skill_focus_options,
      price_ranges,
      sort_options
    };
  }

  // ------------------------
  // Interface: searchClinics
  // ------------------------
  searchClinics(filters, sort, page, page_size) {
    const clinics = this._getFromStorage('clinics');
    const divisions = this._getFromStorage('divisions');
    const fields = this._getFromStorage('fields');

    const filtersObj = filters || {};
    const sortObj = sort || {};
    const pageNum = page || 1;
    const size = page_size || 25;

    const filtered = [];
    for (let i = 0; i < clinics.length; i++) {
      const c = clinics[i];
      const dateStr = c.start_date ? c.start_date.slice(0, 10) : null;

      if (filtersObj.month) {
        if (!dateStr || dateStr.slice(0, 7) !== filtersObj.month) continue;
      }
      if (filtersObj.start_date) {
        if (!dateStr || dateStr < filtersObj.start_date) continue;
      }
      if (filtersObj.end_date) {
        if (!dateStr || dateStr > filtersObj.end_date) continue;
      }
      if (filtersObj.skill_focus && c.skill_focus !== filtersObj.skill_focus) continue;
      if (typeof filtersObj.max_price === 'number' && c.price > filtersObj.max_price) continue;
      if (typeof filtersObj.min_training_hours === 'number' && c.total_training_hours < filtersObj.min_training_hours) continue;
      filtered.push(c);
    }

    const sortBy = sortObj.sort_by || 'start_date';
    const dir = (sortObj.sort_direction || 'asc').toLowerCase();
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'price') {
        cmp = (a.price || 0) - (b.price || 0);
      } else if (sortBy === 'total_training_hours') {
        cmp = (a.total_training_hours || 0) - (b.total_training_hours || 0);
      } else {
        cmp = this._compareDateStrings(a.start_date || '', b.start_date || '');
      }
      return dir === 'desc' ? -cmp : cmp;
    });

    const total = filtered.length;
    const startIndex = (pageNum - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const divisionMap = {};
    for (let i = 0; i < divisions.length; i++) divisionMap[divisions[i].id] = divisions[i];
    const fieldMap = {};
    for (let i = 0; i < fields.length; i++) fieldMap[fields[i].id] = fields[i];

    const out = [];
    for (let i = 0; i < pageItems.length; i++) {
      const c = pageItems[i];
      const division = c.division_id ? divisionMap[c.division_id] : null;
      const field = c.location_field_id ? fieldMap[c.location_field_id] : null;
      const summary = (c.description || '').slice(0, 140);
      out.push({
        clinic_id: c.id,
        name: c.name,
        skill_focus: c.skill_focus,
        division_name: division ? division.name : '',
        start_date: c.start_date ? c.start_date.slice(0, 10) : null,
        end_date: c.end_date ? c.end_date.slice(0, 10) : null,
        price: c.price,
        total_training_hours: c.total_training_hours,
        location_field_name: field ? field.name : '',
        description_summary: summary
      });
    }

    return {
      clinics: out,
      total
    };
  }

  // ------------------------
  // Interface: getClinicDetails
  // ------------------------
  getClinicDetails(clinicId) {
    const clinics = this._getFromStorage('clinics');
    const divisions = this._getFromStorage('divisions');
    const fields = this._getFromStorage('fields');

    let clinic = null;
    for (let i = 0; i < clinics.length; i++) {
      if (clinics[i].id === clinicId) {
        clinic = clinics[i];
        break;
      }
    }
    if (!clinic) return null;

    const division = clinic.division_id ? divisions.find(d => d.id === clinic.division_id) : null;
    const field = clinic.location_field_id ? fields.find(f => f.id === clinic.location_field_id) : null;

    return {
      clinic_id: clinic.id,
      name: clinic.name,
      skill_focus: clinic.skill_focus,
      division_name: division ? division.name : '',
      start_date: clinic.start_date ? clinic.start_date.slice(0, 10) : null,
      end_date: clinic.end_date ? clinic.end_date.slice(0, 10) : null,
      price: clinic.price,
      total_training_hours: clinic.total_training_hours,
      location_field_name: field ? field.name : '',
      schedule_details: clinic.description || '',
      description: clinic.description || ''
    };
  }

  // ------------------------
  // Interface: submitClinicRegistration
  // ------------------------
  submitClinicRegistration(clinicId, player, guardian) {
    const clinics = this._getFromStorage('clinics');
    const players = this._getFromStorage('players');
    const guardians = this._getFromStorage('guardian_contacts');
    const clinicRegistrations = this._getFromStorage('clinic_registrations');

    let clinic = null;
    for (let i = 0; i < clinics.length; i++) {
      if (clinics[i].id === clinicId) {
        clinic = clinics[i];
        break;
      }
    }
    if (!clinic) {
      return {
        success: false,
        clinic_registration_id: null,
        status: 'cancelled',
        amount_paid: 0,
        confirmation_message: 'Clinic not found.'
      };
    }

    const now = new Date().toISOString();

    const playerId = this._generateId('player');
    const newPlayer = {
      id: playerId,
      first_name: player.first_name,
      last_name: player.last_name,
      date_of_birth: player.date_of_birth,
      division_id: clinic.division_id || null,
      notes: player.notes || ''
    };
    players.push(newPlayer);

    const guardianId = this._generateId('guardian');
    const newGuardian = {
      id: guardianId,
      name: guardian.name,
      phone: guardian.phone,
      email: guardian.email,
      preferred_contact_method: guardian.preferred_contact_method || 'email'
    };
    guardians.push(newGuardian);

    const regId = this._generateId('clinic_reg');
    const reg = {
      id: regId,
      clinic_id: clinic.id,
      player_id: playerId,
      guardian_contact_id: guardianId,
      registration_date: now,
      amount_paid: clinic.price || 0,
      status: 'confirmed'
    };
    clinicRegistrations.push(reg);

    this._saveToStorage('players', players);
    this._saveToStorage('guardian_contacts', guardians);
    this._saveToStorage('clinic_registrations', clinicRegistrations);

    return {
      success: true,
      clinic_registration_id: regId,
      status: 'confirmed',
      amount_paid: clinic.price || 0,
      confirmation_message: 'Clinic registration completed.'
    };
  }

  // ------------------------
  // Interface: getFieldReservationFilterOptions
  // ------------------------
  getFieldReservationFilterOptions() {
    const slots = this._getFromStorage('field_reservation_slots');
    const divisions = this._getFromStorage('divisions');
    const fields = this._getFromStorage('fields');

    const dateSet = {};
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (!s.date) continue;
      const d = s.date.slice(0, 10);
      dateSet[d] = true;
    }
    const dateKeys = Object.keys(dateSet).sort();
    const available_dates = [];
    for (let i = 0; i < dateKeys.length; i++) {
      const dStr = dateKeys[i];
      const d = new Date(dStr + 'T00:00:00');
      const is_wednesday = d.getDay() === 3;
      available_dates.push({
        date: dStr,
        label: dStr,
        is_wednesday
      });
    }

    const divisionsOut = divisions.map(d => ({
      division_id: d.id,
      code: d.code,
      name: d.name
    }));

    const fieldsOut = fields.map(f => ({
      field_id: f.id,
      field_name: f.name,
      has_lights: !!f.has_lights
    }));

    const time_windows = [
      { label: 'Evening 6-8 PM', start_time: '18:00', end_time: '20:00' },
      { label: 'Afternoon 4-6 PM', start_time: '16:00', end_time: '18:00' }
    ];

    return {
      available_dates,
      divisions: divisionsOut,
      fields: fieldsOut,
      time_windows
    };
  }

  // ------------------------
  // Interface: searchFieldReservationSlots
  // ------------------------
  searchFieldReservationSlots(filters, sort) {
    const slots = this._getFromStorage('field_reservation_slots');
    const divisions = this._getFromStorage('divisions');
    const fields = this._getFromStorage('fields');

    const filtersObj = filters || {};
    const sortObj = sort || {};

    const fieldMap = {};
    for (let i = 0; i < fields.length; i++) fieldMap[fields[i].id] = fields[i];
    const divisionMap = {};
    for (let i = 0; i < divisions.length; i++) divisionMap[divisions[i].id] = divisions[i];

    const parseTimeToMinutes = function (timeStr) {
      if (!timeStr) return null;
      // Handle 24-hour format 'HH:MM'
      if (/^\d{2}:\d{2}$/.test(timeStr)) {
        const parts = timeStr.split(':');
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        return h * 60 + m;
      }
      // Handle 12-hour format like '6:00 PM'
      const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && h !== 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      }
      return null;
    };

    const filterStartMinutes = parseTimeToMinutes(filtersObj.start_time);
    const filterEndMinutes = parseTimeToMinutes(filtersObj.end_time);

    const filtered = [];
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      if (filtersObj.date && (!s.date || s.date.slice(0, 10) !== filtersObj.date)) continue;
      if (filtersObj.divisionId && s.division_id && s.division_id !== filtersObj.divisionId) continue;
      if (filtersObj.fieldId && s.field_id !== filtersObj.fieldId) continue;

      const slotStartMinutes = parseTimeToMinutes(s.start_time);

      if (filterStartMinutes !== null) {
        if (slotStartMinutes === null || slotStartMinutes < filterStartMinutes) continue;
      }
      if (filterEndMinutes !== null) {
        if (slotStartMinutes === null || slotStartMinutes > filterEndMinutes) continue;
      }

      if (filtersObj.require_lights) {
        const field = fieldMap[s.field_id];
        if (!field || !field.has_lights) continue;
      }
      filtered.push(s);
    }

    const sortBy = sortObj.sort_by || 'start_time';
    const dir = (sortObj.sort_direction || 'asc').toLowerCase();
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'field_name') {
        const fa = fieldMap[a.field_id];
        const fb = fieldMap[b.field_id];
        cmp = (fa ? fa.name : '').localeCompare(fb ? fb.name : '');
      } else {
        cmp = (a.start_time || '').localeCompare(b.start_time || '');
      }
      return dir === 'desc' ? -cmp : cmp;
    });

    const out = [];
    for (let i = 0; i < filtered.length; i++) {
      const s = filtered[i];
      const field = fieldMap[s.field_id] || null;
      const division = s.division_id ? divisionMap[s.division_id] : null;
      out.push({
        reservation_slot_id: s.id,
        field_name: field ? field.name : '',
        field_has_lights: field ? !!field.has_lights : false,
        division_name: division ? division.name : '',
        date: s.date ? s.date.slice(0, 10) : null,
        start_time: s.start_time,
        end_time: s.end_time,
        is_available: !!s.is_available
      });
    }

    return { slots: out };
  }

  // ------------------------
  // Interface: getFieldReservationSlotDetails
  // ------------------------
  getFieldReservationSlotDetails(reservationSlotId) {
    const slots = this._getFromStorage('field_reservation_slots');
    const fields = this._getFromStorage('fields');
    const divisions = this._getFromStorage('divisions');

    let slot = null;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].id === reservationSlotId) {
        slot = slots[i];
        break;
      }
    }
    if (!slot) return null;

    const field = fields.find(f => f.id === slot.field_id) || null;
    const division = slot.division_id ? divisions.find(d => d.id === slot.division_id) : null;

    return {
      reservation_slot_id: slot.id,
      field_name: field ? field.name : '',
      field_has_lights: field ? !!field.has_lights : false,
      division_name: division ? division.name : '',
      date: slot.date ? slot.date.slice(0, 10) : null,
      start_time: slot.start_time,
      end_time: slot.end_time,
      is_available: !!slot.is_available,
      notes: ''
    };
  }

  // ------------------------
  // Interface: submitFieldReservation
  // ------------------------
  submitFieldReservation(reservationSlotId, team_name, coach_name, contact_phone) {
    const slots = this._getFromStorage('field_reservation_slots');
    const reservations = this._getFromStorage('field_reservations');
    const fields = this._getFromStorage('fields');

    let slot = null;
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].id === reservationSlotId) {
        slot = slots[i];
        break;
      }
    }
    if (!slot || !slot.is_available) {
      return {
        success: false,
        field_reservation_id: null,
        status: 'cancelled',
        reserved_slot: null,
        confirmation_message: 'Reservation slot not available.'
      };
    }

    const now = new Date().toISOString();
    const reservationId = this._generateId('field_res');
    const newRes = {
      id: reservationId,
      reservation_slot_id: slot.id,
      team_name,
      coach_name,
      contact_phone,
      reserved_at: now,
      status: 'confirmed'
    };
    reservations.push(newRes);

    // Mark slot unavailable
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].id === slot.id) {
        slots[i].is_available = false;
        break;
      }
    }

    this._saveToStorage('field_reservations', reservations);
    this._saveToStorage('field_reservation_slots', slots);

    const field = fields.find(f => f.id === slot.field_id) || null;

    return {
      success: true,
      field_reservation_id: reservationId,
      status: 'confirmed',
      reserved_slot: {
        date: slot.date ? slot.date.slice(0, 10) : null,
        start_time: slot.start_time,
        end_time: slot.end_time,
        field_name: field ? field.name : ''
      },
      confirmation_message: 'Field reservation confirmed.'
    };
  }

  // ------------------------
  // Interface: getTeamFinderFilterOptions
  // ------------------------
  getTeamFinderFilterOptions() {
    const divisions = this._getFromStorage('divisions');

    const divisionsOut = divisions.map(d => ({
      division_id: d.id,
      code: d.code,
      name: d.name
    }));

    const skill_levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'recreational', label: 'Recreational' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
      { value: 'travel', label: 'Travel' }
    ];

    const practice_days = [
      { value: 'monday', label: 'Monday' },
      { value: 'tuesday', label: 'Tuesday' },
      { value: 'wednesday', label: 'Wednesday' },
      { value: 'thursday', label: 'Thursday' },
      { value: 'friday', label: 'Friday' },
      { value: 'saturday', label: 'Saturday' },
      { value: 'sunday', label: 'Sunday' }
    ];

    const radius_options = [
      { value: 5, label: 'Within 5 miles' },
      { value: 10, label: 'Within 10 miles' },
      { value: 20, label: 'Within 20 miles' }
    ];

    return {
      divisions: divisionsOut,
      skill_levels,
      practice_days,
      radius_options
    };
  }

  // ------------------------
  // Helper: approximate distance by ZIP equality
  // ------------------------
  _approxDistanceMiles(zipA, zipB) {
    if (!zipA || !zipB) return null;
    if (zipA === zipB) return 0;
    // Unknown distance; treat as large so radius filters will likely exclude
    return 999;
  }

  // ------------------------
  // Interface: searchTeams
  // ------------------------
  searchTeams(filters, sort, page, page_size) {
    const teams = this._getFromStorage('teams');
    const divisions = this._getFromStorage('divisions');
    const teamPractices = this._getFromStorage('team_practices');
    const fields = this._getFromStorage('fields');

    const filtersObj = filters || {};
    const sortObj = sort || {};
    const pageNum = page || 1;
    const size = page_size || 25;

    const divisionMap = {};
    for (let i = 0; i < divisions.length; i++) divisionMap[divisions[i].id] = divisions[i];
    const fieldMap = {};
    for (let i = 0; i < fields.length; i++) fieldMap[fields[i].id] = fields[i];

    // Build practices by team
    const practicesByTeam = {};
    for (let i = 0; i < teamPractices.length; i++) {
      const p = teamPractices[i];
      if (!practicesByTeam[p.team_id]) practicesByTeam[p.team_id] = [];
      practicesByTeam[p.team_id].push(p);
    }

    const filtered = [];
    for (let i = 0; i < teams.length; i++) {
      const t = teams[i];
      if (filtersObj.divisionId && t.division_id !== filtersObj.divisionId) continue;
      if (filtersObj.skill_level && t.skill_level !== filtersObj.skill_level) continue;

      let distanceMiles = null;
      if (filtersObj.zip_code && filtersObj.radius_miles) {
        distanceMiles = this._approxDistanceMiles(filtersObj.zip_code, t.zip_code);
        if (distanceMiles !== null && distanceMiles > filtersObj.radius_miles) continue;
      }

      if (filtersObj.practice_days && filtersObj.practice_days.length > 0) {
        const teamPractList = practicesByTeam[t.id] || [];
        let matchesDay = false;
        for (let j = 0; j < teamPractList.length; j++) {
          if (filtersObj.practice_days.indexOf(teamPractList[j].day_of_week) !== -1) {
            matchesDay = true;
            break;
          }
        }
        if (!matchesDay) continue;
      }

      filtered.push({ team: t, distanceMiles });
    }

    const sortBy = sortObj.sort_by || 'practice_start_time';
    const dir = (sortObj.sort_direction || 'asc').toLowerCase();
    filtered.sort((aWrap, bWrap) => {
      const a = aWrap.team;
      const b = bWrap.team;
      let cmp = 0;
      if (sortBy === 'distance') {
        const da = aWrap.distanceMiles === null ? 999 : aWrap.distanceMiles;
        const db = bWrap.distanceMiles === null ? 999 : bWrap.distanceMiles;
        cmp = da - db;
      } else {
        // practice_start_time: compare earliest practice time among chosen days
        const pa = practicesByTeam[a.id] || [];
        const pb = practicesByTeam[b.id] || [];
        let minTimeA = '99:99';
        let minTimeB = '99:99';
        for (let i = 0; i < pa.length; i++) {
          if (pa[i].start_time && pa[i].start_time < minTimeA) minTimeA = pa[i].start_time;
        }
        for (let i = 0; i < pb.length; i++) {
          if (pb[i].start_time && pb[i].start_time < minTimeB) minTimeB = pb[i].start_time;
        }
        cmp = minTimeA.localeCompare(minTimeB);
      }
      return dir === 'desc' ? -cmp : cmp;
    });

    const total = filtered.length;
    const startIndex = (pageNum - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const out = [];
    for (let i = 0; i < pageItems.length; i++) {
      const wrap = pageItems[i];
      const t = wrap.team;
      const division = divisionMap[t.division_id] || null;
      const teamPractList = practicesByTeam[t.id] || [];
      const practice_summaries = [];
      for (let j = 0; j < teamPractList.length; j++) {
        const p = teamPractList[j];
        const field = p.field_id ? fieldMap[p.field_id] : null;
        practice_summaries.push({
          day_of_week: p.day_of_week,
          start_time: p.start_time,
          end_time: p.end_time || null,
          field_name: field ? field.name : ''
        });
      }
      out.push({
        team_id: t.id,
        team_name: t.name,
        division_name: division ? division.name : '',
        skill_level: t.skill_level,
        zip_code: t.zip_code || null,
        distance_miles: wrap.distanceMiles,
        practice_summaries
      });
    }

    return {
      teams: out,
      total
    };
  }

  // ------------------------
  // Interface: getTeamDetail
  // ------------------------
  getTeamDetail(teamId) {
    const teams = this._getFromStorage('teams');
    const divisions = this._getFromStorage('divisions');
    const fields = this._getFromStorage('fields');
    const practices = this._getFromStorage('team_practices');

    let team = null;
    for (let i = 0; i < teams.length; i++) {
      if (teams[i].id === teamId) {
        team = teams[i];
        break;
      }
    }
    if (!team) return null;

    const division = divisions.find(d => d.id === team.division_id) || null;
    const homeField = team.home_field_id ? fields.find(f => f.id === team.home_field_id) : null;

    const practiceList = [];
    for (let i = 0; i < practices.length; i++) {
      const p = practices[i];
      if (p.team_id !== team.id) continue;
      const field = p.field_id ? fields.find(f => f.id === p.field_id) : null;
      practiceList.push({
        day_of_week: p.day_of_week,
        start_time: p.start_time,
        end_time: p.end_time || null,
        field_name: field ? field.name : ''
      });
    }

    return {
      team_id: team.id,
      team_name: team.name,
      division_name: division ? division.name : '',
      skill_level: team.skill_level,
      description: team.description || '',
      home_field_name: homeField ? homeField.name : '',
      zip_code: team.zip_code || null,
      coach_name: team.coach_name || '',
      coach_email: team.coach_email || '',
      coach_phone: team.coach_phone || '',
      practices: practiceList
    };
  }

  // ------------------------
  // Interface: saveTeamToMyTeams
  // ------------------------
  saveTeamToMyTeams(teamId, note) {
    const savedTeams = this._getFromStorage('saved_teams');

    for (let i = 0; i < savedTeams.length; i++) {
      if (savedTeams[i].team_id === teamId) {
        return {
          success: true,
          saved_team_id: savedTeams[i].id,
          saved_at: savedTeams[i].saved_at,
          message: 'Team already saved.'
        };
      }
    }

    const id = this._generateId('saved_team');
    const saved_at = new Date().toISOString();
    savedTeams.push({ id, team_id: teamId, note: note || '', saved_at });
    this._saveToStorage('saved_teams', savedTeams);
    this._saveSingleUserState();

    return {
      success: true,
      saved_team_id: id,
      saved_at,
      message: 'Team saved to My Teams.'
    };
  }

  // ------------------------
  // Interface: getMyTeams (with foreign key resolution)
  // ------------------------
  getMyTeams() {
    const savedTeams = this._getFromStorage('saved_teams');
    const teams = this._getFromStorage('teams');
    const divisions = this._getFromStorage('divisions');

    const teamMap = {};
    for (let i = 0; i < teams.length; i++) teamMap[teams[i].id] = teams[i];
    const divisionMap = {};
    for (let i = 0; i < divisions.length; i++) divisionMap[divisions[i].id] = divisions[i];

    const out = [];
    for (let i = 0; i < savedTeams.length; i++) {
      const st = savedTeams[i];
      const t = teamMap[st.team_id] || null;
      if (!t) continue;
      const division = divisionMap[t.division_id] || null;
      out.push({
        saved_team_id: st.id,
        team_id: t.id,
        team_name: t.name,
        division_name: division ? division.name : '',
        skill_level: t.skill_level,
        note: st.note || '',
        saved_at: st.saved_at,
        coach_name: t.coach_name || '',
        coach_email: t.coach_email || '',
        coach_phone: t.coach_phone || '',
        // foreign key resolution
        team: t
      });
    }

    return {
      teams: out,
      total: out.length
    };
  }

  // ------------------------
  // Interface: removeSavedTeam
  // ------------------------
  removeSavedTeam(savedTeamId) {
    const savedTeams = this._getFromStorage('saved_teams');
    const remaining = [];
    let removed = false;
    for (let i = 0; i < savedTeams.length; i++) {
      if (savedTeams[i].id === savedTeamId) {
        removed = true;
        continue;
      }
      remaining.push(savedTeams[i]);
    }
    this._saveToStorage('saved_teams', remaining);
    this._saveSingleUserState();

    return {
      success: removed,
      message: removed ? 'Saved team removed.' : 'Saved team not found.'
    };
  }

  // ------------------------
  // Interface: getRuleFilterOptions
  // ------------------------
  getRuleFilterOptions() {
    const divisions = this._getFromStorage('divisions');

    const divisionOptions = [{ code: 'all', name: 'All Divisions' }];
    for (let i = 0; i < divisions.length; i++) {
      divisionOptions.push({ code: divisions[i].code, name: divisions[i].name });
    }

    const categories = [
      { value: 'division_rules', label: 'Division Rules' },
      { value: 'equipment', label: 'Equipment' },
      { value: 'bat_regulations', label: 'Bat Regulations' },
      { value: 'code_of_conduct', label: 'Code of Conduct' },
      { value: 'general_policy', label: 'General Policy' },
      { value: 'other', label: 'Other' }
    ];

    return {
      divisions: divisionOptions,
      categories
    };
  }

  // ------------------------
  // Interface: listRuleDocuments
  // ------------------------
  listRuleDocuments(filters, page, page_size) {
    const docs = this._getFromStorage('rule_documents');
    const filtersObj = filters || {};
    const pageNum = page || 1;
    const size = page_size || 50;

    const filtered = [];
    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      if (filtersObj.division_code && filtersObj.division_code !== 'all' && d.division_code !== filtersObj.division_code) continue;
      if (filtersObj.category && d.category !== filtersObj.category) continue;
      filtered.push(d);
    }

    filtered.sort((a, b) => {
      const ta = a.last_updated || '';
      const tb = b.last_updated || '';
      return tb.localeCompare(ta);
    });

    const total = filtered.length;
    const startIndex = (pageNum - 1) * size;
    const pageItems = filtered.slice(startIndex, startIndex + size);

    const documents = [];
    for (let i = 0; i < pageItems.length; i++) {
      const d = pageItems[i];
      documents.push({
        rule_document_id: d.id,
        title: d.title,
        division_code: d.division_code,
        category: d.category,
        article_id: d.article_id,
        last_updated: d.last_updated || null
      });
    }

    return {
      documents,
      total
    };
  }

  // ------------------------
  // Interface: getRuleDocumentDetails
  // ------------------------
  getRuleDocumentDetails(ruleDocumentId) {
    const docs = this._getFromStorage('rule_documents');

    let doc = null;
    for (let i = 0; i < docs.length; i++) {
      if (docs[i].id === ruleDocumentId) {
        doc = docs[i];
        break;
      }
    }
    if (!doc) return null;

    return {
      rule_document_id: doc.id,
      title: doc.title,
      division_code: doc.division_code,
      category: doc.category,
      article_id: doc.article_id,
      content: doc.content,
      last_updated: doc.last_updated || null
    };
  }

  // ------------------------
  // Interface: saveRuleDocumentToMyResources
  // ------------------------
  saveRuleDocumentToMyResources(ruleDocumentId) {
    const savedResources = this._getFromStorage('saved_resources');

    for (let i = 0; i < savedResources.length; i++) {
      if (savedResources[i].rule_document_id === ruleDocumentId) {
        return {
          success: true,
          saved_resource_id: savedResources[i].id,
          saved_at: savedResources[i].saved_at,
          message: 'Resource already saved.'
        };
      }
    }

    const id = this._generateId('saved_res');
    const saved_at = new Date().toISOString();
    savedResources.push({ id, rule_document_id: ruleDocumentId, saved_at });
    this._saveToStorage('saved_resources', savedResources);
    this._saveSingleUserState();

    return {
      success: true,
      saved_resource_id: id,
      saved_at,
      message: 'Resource saved.'
    };
  }

  // ------------------------
  // Interface: getMyResources (with foreign key resolution)
  // ------------------------
  getMyResources() {
    const savedResources = this._getFromStorage('saved_resources');
    const docs = this._getFromStorage('rule_documents');

    const docMap = {};
    for (let i = 0; i < docs.length; i++) docMap[docs[i].id] = docs[i];

    const out = [];
    for (let i = 0; i < savedResources.length; i++) {
      const sr = savedResources[i];
      const doc = docMap[sr.rule_document_id] || null;
      if (!doc) continue;
      out.push({
        saved_resource_id: sr.id,
        rule_document_id: doc.id,
        title: doc.title,
        division_code: doc.division_code,
        category: doc.category,
        article_id: doc.article_id,
        saved_at: sr.saved_at,
        // foreign key resolution
        rule_document: doc
      });
    }

    return {
      resources: out,
      total: out.length
    };
  }

  // ------------------------
  // Interface: removeSavedResource
  // ------------------------
  removeSavedResource(savedResourceId) {
    const savedResources = this._getFromStorage('saved_resources');
    const remaining = [];
    let removed = false;
    for (let i = 0; i < savedResources.length; i++) {
      if (savedResources[i].id === savedResourceId) {
        removed = true;
        continue;
      }
      remaining.push(savedResources[i]);
    }
    this._saveToStorage('saved_resources', remaining);
    this._saveSingleUserState();

    return {
      success: removed,
      message: removed ? 'Saved resource removed.' : 'Saved resource not found.'
    };
  }

  // ------------------------
  // Interface: getDashboardSummary (with foreign key resolution)
  // ------------------------
  getDashboardSummary() {
    // My Schedule
    const mySchedule = this.getMyScheduleGames().games;

    // My Volunteer Shifts
    const myVol = this.getMyVolunteerShifts().shifts;

    // My Teams
    const myTeams = this.getMyTeams().teams;

    // My Resources
    const myResources = this.getMyResources().resources;

    const counts = {
      saved_games_count: mySchedule.length,
      volunteer_shifts_count: myVol.length,
      saved_teams_count: myTeams.length,
      saved_resources_count: myResources.length
    };

    return {
      my_schedule: mySchedule,
      my_volunteer_shifts: myVol,
      my_teams: myTeams,
      my_resources: myResources,
      counts
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
