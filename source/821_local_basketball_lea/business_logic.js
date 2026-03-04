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

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Entity tables
    ensureArrayKey('leaguedivisions');
    ensureArrayKey('teams');
    ensureArrayKey('gymlocations');
    ensureArrayKey('courts');
    ensureArrayKey('games');
    ensureArrayKey('sponsorshiptiers');
    ensureArrayKey('volunteerroles');
    ensureArrayKey('contactinquiries');
    ensureArrayKey('youth_division_fees');

    // Content / config tables
    if (!localStorage.getItem('about_league_content')) {
      localStorage.setItem('about_league_content', JSON.stringify({
        mission: '',
        history: '',
        structure: '',
        organizers: [],
        recommended_links: []
      }));
    }

    ensureArrayKey('faq_entries');
    ensureArrayKey('registration_periods');
    ensureArrayKey('announcements');
    ensureArrayKey('popular_actions');

    if (!localStorage.getItem('contact_form_config')) {
      localStorage.setItem('contact_form_config', JSON.stringify(this._getDefaultContactFormConfig()));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      // Return a deep copy of defaultValue to avoid accidental mutation
      return typeof defaultValue === 'object' ? JSON.parse(JSON.stringify(defaultValue)) : defaultValue;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return typeof defaultValue === 'object' ? JSON.parse(JSON.stringify(defaultValue)) : defaultValue;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ------------------------
  // Helper functions
  // ------------------------

  _generateContactInquiryId() {
    // Uses the shared counter for predictable uniqueness
    return this._generateId('ci');
  }

  _normalizeDayOfWeek(input) {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim().toLowerCase();
    const map = {
      mon: 'monday',
      monday: 'monday',
      tue: 'tuesday',
      tues: 'tuesday',
      tuesday: 'tuesday',
      wed: 'wednesday',
      wedn: 'wednesday',
      weds: 'wednesday',
      wednesday: 'wednesday',
      thu: 'thursday',
      thur: 'thursday',
      thurs: 'thursday',
      thursday: 'thursday',
      fri: 'friday',
      friday: 'friday',
      sat: 'saturday',
      saturday: 'saturday',
      sun: 'sunday',
      sunday: 'sunday'
    };
    return map[s] || null;
  }

  _parseAndFormatTime(input) {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim();
    if (!s) return null;

    // Already in 24h HH:MM
    if (/^\d{1,2}:\d{2}$/.test(s)) {
      const [hStr, mStr] = s.split(':');
      let h = parseInt(hStr, 10);
      let m = parseInt(mStr, 10);
      if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return s;
      return (h < 10 ? '0' + h : String(h)) + ':' + (m < 10 ? '0' + m : String(m));
    }

    // 12h formats like "7", "7pm", "7:30 pm"
    const match = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (!match) {
      return s; // fallback: return original if unrecognized
    }

    let hour = parseInt(match[1], 10);
    let minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridian = match[3] ? match[3].toLowerCase() : null;

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 12 || minute < 0 || minute > 59) {
      return s;
    }

    if (meridian) {
      if (hour === 12) hour = 0;
      if (meridian === 'pm') hour += 12;
    }

    const hh = hour < 10 ? '0' + hour : String(hour);
    const mm = minute < 10 ? '0' + minute : String(minute);
    return hh + ':' + mm;
  }

  _getDefaultContactFormConfig() {
    // Static config describing which conditional fields to show per reason
    const reasons = [
      {
        value: 'join_team',
        label: 'Join a Team',
        description: 'Questions about joining an existing team or being placed on a team.'
      },
      {
        value: 'registration_question',
        label: 'Registration Question',
        description: 'General questions about registration, fees, and deadlines.'
      },
      {
        value: 'youth_league_info',
        label: 'Youth League Info',
        description: 'Questions about youth leagues, including ages, fees, and discounts.'
      },
      {
        value: 'scores_standings_issue',
        label: 'Scores & Standings Issue',
        description: 'Report an error in scores or standings.'
      },
      {
        value: 'sponsorship_inquiry',
        label: 'Sponsorship Inquiry',
        description: 'Questions about sponsoring the league or a team.'
      },
      {
        value: 'schedule_change_request',
        label: 'Schedule Change Request',
        description: 'Request a game reschedule or time change.'
      },
      {
        value: 'volunteer_referee',
        label: 'Volunteer / Referee',
        description: 'Volunteer to help, including refereeing youth games.'
      },
      {
        value: 'facility_issue',
        label: 'Facility / Gym Issue',
        description: 'Report a problem with a gym, court, or equipment.'
      },
      {
        value: 'media_request',
        label: 'Media / Photo Request',
        description: 'Request media access or permission to film/photograph games.'
      },
      {
        value: 'lost_and_found',
        label: 'Lost & Found',
        description: 'Report a lost or found item at a game.'
      },
      {
        value: 'general_question',
        label: 'General Question',
        description: 'Any other questions about the league.'
      }
    ];

    const reasonFieldConfig = [
      {
        reason: 'join_team',
        show_division: true,
        show_team_name: false,
        show_opponent_team_name: false,
        show_game_id: false,
        show_game_date: false,
        show_game_start_time: false,
        show_gym: false,
        show_court: false,
        show_number_of_players: false,
        show_preferred_contact_method: true,
        show_organization_name: false,
        show_date_of_incident: false,
        show_availability_days: true,
        show_availability_time_window: true,
        show_age: true,
        show_skill_level: true,
        show_sponsorship_tier: false,
        show_marketing_budget: false,
        show_volunteer_role: false,
        show_lost_item_details: false,
        show_phone: false,
        show_is_media_courtside_requested: false
      },
      {
        reason: 'registration_question',
        show_division: true,
        show_team_name: false,
        show_opponent_team_name: false,
        show_game_id: false,
        show_game_date: false,
        show_game_start_time: false,
        show_gym: false,
        show_court: false,
        show_number_of_players: false,
        show_preferred_contact_method: true,
        show_organization_name: false,
        show_date_of_incident: false,
        show_availability_days: false,
        show_availability_time_window: false,
        show_age: false,
        show_skill_level: false,
        show_sponsorship_tier: false,
        show_marketing_budget: false,
        show_volunteer_role: false,
        show_lost_item_details: false,
        show_phone: false,
        show_is_media_courtside_requested: false
      },
      {
        reason: 'youth_league_info',
        show_division: true,
        show_team_name: false,
        show_opponent_team_name: false,
        show_game_id: false,
        show_game_date: false,
        show_game_start_time: false,
        show_gym: false,
        show_court: false,
        show_number_of_players: true,
        show_preferred_contact_method: true,
        show_organization_name: false,
        show_date_of_incident: false,
        show_availability_days: false,
        show_availability_time_window: false,
        show_age: false,
        show_skill_level: false,
        show_sponsorship_tier: false,
        show_marketing_budget: false,
        show_volunteer_role: false,
        show_lost_item_details: false,
        show_phone: false,
        show_is_media_courtside_requested: false
      },
      {
        reason: 'scores_standings_issue',
        show_division: true,
        show_team_name: true,
        show_opponent_team_name: true,
        show_game_id: true,
        show_game_date: true,
        show_game_start_time: true,
        show_gym: true,
        show_court: false,
        show_number_of_players: false,
        show_preferred_contact_method: true,
        show_organization_name: false,
        show_date_of_incident: false,
        show_availability_days: false,
        show_availability_time_window: false,
        show_age: false,
        show_skill_level: false,
        show_sponsorship_tier: false,
        show_marketing_budget: false,
        show_volunteer_role: false,
        show_lost_item_details: false,
        show_phone: false,
        show_is_media_courtside_requested: false
      },
      {
        reason: 'sponsorship_inquiry',
        show_division: false,
        show_team_name: false,
        show_opponent_team_name: false,
        show_game_id: false,
        show_game_date: false,
        show_game_start_time: false,
        show_gym: false,
        show_court: false,
        show_number_of_players: false,
        show_preferred_contact_method: true,
        show_organization_name: true,
        show_date_of_incident: false,
        show_availability_days: false,
        show_availability_time_window: false,
        show_age: false,
        show_skill_level: false,
        show_sponsorship_tier: true,
        show_marketing_budget: true,
        show_volunteer_role: false,
        show_lost_item_details: false,
        show_phone: false,
        show_is_media_courtside_requested: false
      },
      {
        reason: 'schedule_change_request',
        show_division: true,
        show_team_name: true,
        show_opponent_team_name: true,
        show_game_id: true,
        show_game_date: true,
        show_game_start_time: true,
        show_gym: true,
        show_court: false,
        show_number_of_players: false,
        show_preferred_contact_method: true,
        show_organization_name: false,
        show_date_of_incident: false,
        show_availability_days: false,
        show_availability_time_window: false,
        show_age: false,
        show_skill_level: false,
        show_sponsorship_tier: false,
        show_marketing_budget: false,
        show_volunteer_role: false,
        show_lost_item_details: false,
        show_phone: true,
        show_is_media_courtside_requested: false
      },
      {
        reason: 'volunteer_referee',
        show_division: false,
        show_team_name: false,
        show_opponent_team_name: false,
        show_game_id: false,
        show_game_date: false,
        show_game_start_time: false,
        show_gym: false,
        show_court: false,
        show_number_of_players: false,
        show_preferred_contact_method: true,
        show_organization_name: false,
        show_date_of_incident: false,
        show_availability_days: true,
        show_availability_time_window: true,
        show_age: true,
        show_skill_level: false,
        show_sponsorship_tier: false,
        show_marketing_budget: false,
        show_volunteer_role: true,
        show_lost_item_details: false,
        show_phone: true,
        show_is_media_courtside_requested: false
      },
      {
        reason: 'facility_issue',
        show_division: true,
        show_team_name: true,
        show_opponent_team_name: false,
        show_game_id: true,
        show_game_date: true,
        show_game_start_time: true,
        show_gym: true,
        show_court: true,
        show_number_of_players: false,
        show_preferred_contact_method: true,
        show_organization_name: false,
        show_date_of_incident: true,
        show_availability_days: false,
        show_availability_time_window: false,
        show_age: false,
        show_skill_level: false,
        show_sponsorship_tier: false,
        show_marketing_budget: false,
        show_volunteer_role: false,
        show_lost_item_details: false,
        show_phone: true,
        show_is_media_courtside_requested: false
      },
      {
        reason: 'media_request',
        show_division: true,
        show_team_name: false,
        show_opponent_team_name: false,
        show_game_id: true,
        show_game_date: true,
        show_game_start_time: true,
        show_gym: true,
        show_court: false,
        show_number_of_players: false,
        show_preferred_contact_method: true,
        show_organization_name: true,
        show_date_of_incident: false,
        show_availability_days: false,
        show_availability_time_window: false,
        show_age: false,
        show_skill_level: false,
        show_sponsorship_tier: false,
        show_marketing_budget: false,
        show_volunteer_role: false,
        show_lost_item_details: false,
        show_phone: true,
        show_is_media_courtside_requested: true
      },
      {
        reason: 'lost_and_found',
        show_division: true,
        show_team_name: true,
        show_opponent_team_name: true,
        show_game_id: true,
        show_game_date: true,
        show_game_start_time: true,
        show_gym: true,
        show_court: true,
        show_number_of_players: false,
        show_preferred_contact_method: true,
        show_organization_name: false,
        show_date_of_incident: true,
        show_availability_days: false,
        show_availability_time_window: false,
        show_age: false,
        show_skill_level: false,
        show_sponsorship_tier: false,
        show_marketing_budget: false,
        show_volunteer_role: false,
        show_lost_item_details: true,
        show_phone: true,
        show_is_media_courtside_requested: false
      },
      {
        reason: 'general_question',
        show_division: false,
        show_team_name: false,
        show_opponent_team_name: false,
        show_game_id: false,
        show_game_date: false,
        show_game_start_time: false,
        show_gym: false,
        show_court: false,
        show_number_of_players: false,
        show_preferred_contact_method: true,
        show_organization_name: false,
        show_date_of_incident: false,
        show_availability_days: false,
        show_availability_time_window: false,
        show_age: false,
        show_skill_level: false,
        show_sponsorship_tier: false,
        show_marketing_budget: false,
        show_volunteer_role: false,
        show_lost_item_details: false,
        show_phone: false,
        show_is_media_courtside_requested: false
      }
    ];

    return { reasons, reason_field_config: reasonFieldConfig };
  }

  // ------------------------
  // Core interface implementations
  // ------------------------

  // 1. getHomeHighlights
  getHomeHighlights() {
    const games = this._getFromStorage('games', []);
    const divisions = this._getFromStorage('leaguedivisions', []);
    const teams = this._getFromStorage('teams', []);

    const now = new Date();
    const playoffGames = games.filter(g => g.is_playoff === true && g.status === 'scheduled');

    // Map of division_id -> earliest upcoming playoff game
    const byDivision = {};
    playoffGames.forEach(g => {
      if (!g.start_datetime) return;
      const dKey = g.division_id;
      const gameDate = new Date(g.start_datetime);
      if (!byDivision[dKey] || new Date(byDivision[dKey].start_datetime) > gameDate) {
        byDivision[dKey] = g;
      }
    });

    const upcoming_playoff_highlights = Object.keys(byDivision).map(divisionId => {
      const game = byDivision[divisionId];
      const division = divisions.find(d => d.id === divisionId) || null;
      const homeTeam = teams.find(t => t.id === game.home_team_id) || null;
      const awayTeam = teams.find(t => t.id === game.away_team_id) || null;
      const opponents = [homeTeam ? homeTeam.name : game.home_team_id, 'vs', awayTeam ? awayTeam.name : game.away_team_id].join(' ');
      return {
        division_id: divisionId,
        division_name: division ? division.name : '',
        division: division,
        next_playoff_game_date: game.start_datetime,
        next_playoff_game_opponents: opponents,
        is_championship: !!game.is_championship
      };
    });

    const totalUpcomingGames = games.filter(g => g.status === 'scheduled' && g.start_datetime && new Date(g.start_datetime) >= now).length;
    const uniqueDivisions = Array.from(new Set(games.map(g => g.division_id))).filter(Boolean).length;

    const season_overview = totalUpcomingGames > 0
      ? `There are ${totalUpcomingGames} upcoming scheduled games across ${uniqueDivisions} division(s).`
      : '';

    const registration_periods = this._getFromStorage('registration_periods', []);
    const announcements = this._getFromStorage('announcements', []);
    const popular_actions = this._getFromStorage('popular_actions', []);

    return {
      season_overview,
      registration_periods,
      upcoming_playoff_highlights,
      announcements,
      popular_actions
    };
  }

  // 2. getDivisionsByType
  getDivisionsByType(division_type) {
    if (!division_type) return [];
    const allowed = ['adult', 'youth', 'playoff'];
    if (allowed.indexOf(division_type) === -1) return [];

    const divisions = this._getFromStorage('leaguedivisions', []);
    return divisions
      .filter(d => d.division_type === division_type)
      .map(d => ({
        division_id: d.id,
        division_name: d.name,
        description: d.description || '',
        division_type: d.division_type,
        skill_level: d.skill_level || null,
        is_coed: typeof d.is_coed === 'boolean' ? d.is_coed : null,
        age_min: typeof d.age_min === 'number' ? d.age_min : null,
        age_max: typeof d.age_max === 'number' ? d.age_max : null
      }));
  }

  // 3. getAdultDivisionsSummary
  getAdultDivisionsSummary() {
    const divisions = this._getFromStorage('leaguedivisions', []);
    const gyms = this._getFromStorage('gymlocations', []);

    return divisions
      .filter(d => d.division_type === 'adult')
      .map(d => {
        const gym = d.default_gym_id ? gyms.find(g => g.id === d.default_gym_id) || null : null;
        return {
          division_id: d.id,
          division_name: d.name,
          description: d.description || '',
          skill_level: d.skill_level || null,
          is_coed: typeof d.is_coed === 'boolean' ? d.is_coed : null,
          age_min: typeof d.age_min === 'number' ? d.age_min : null,
          age_max: typeof d.age_max === 'number' ? d.age_max : null,
          typical_game_days: Array.isArray(d.typical_game_days) ? d.typical_game_days : [],
          typical_game_time_start: d.typical_game_time_start || null,
          typical_game_time_end: d.typical_game_time_end || null,
          default_gym_id: d.default_gym_id || null,
          default_gym_name: gym ? gym.name : null,
          // Foreign key resolution
          default_gym: gym
        };
      });
  }

  // 4. getYouthDivisionsSummary
  getYouthDivisionsSummary() {
    const divisions = this._getFromStorage('leaguedivisions', []);
    const fees = this._getFromStorage('youth_division_fees', []);

    let youthDivisions = divisions.filter(d => d.division_type === 'youth');

    // Fallback: if no explicit youth divisions are configured, synthesize a generic one
    if (youthDivisions.length === 0) {
      youthDivisions = [{
        id: 'youth_generic',
        name: 'Youth Recreational League',
        description: 'General youth division for ages 8-13.',
        division_type: 'youth',
        age_min: 8,
        age_max: 13,
        is_coed: true
      }];
    }

    return youthDivisions
      .map(d => {
        const fee = fees.find(f => f.division_id === d.id) || null;
        // Provide a sensible default season fee if none is configured
        const defaultSeasonFee = 150;
        const seasonFee = fee && typeof fee.season_fee === 'number' ? fee.season_fee : defaultSeasonFee;
        const feeCurrency = fee && fee.fee_currency ? fee.fee_currency : 'USD';

        return {
          division_id: d.id,
          division_name: d.name,
          description: d.description || '',
          age_min: typeof d.age_min === 'number' ? d.age_min : null,
          age_max: typeof d.age_max === 'number' ? d.age_max : null,
          is_coed: typeof d.is_coed === 'boolean' ? d.is_coed : null,
          season_fee: seasonFee,
          fee_currency: feeCurrency
        };
      });
  }

  // 5. getDivisionDetails
  getDivisionDetails(divisionId) {
    if (!divisionId) return null;
    const divisions = this._getFromStorage('leaguedivisions', []);
    const gyms = this._getFromStorage('gymlocations', []);
    const fees = this._getFromStorage('youth_division_fees', []);

    const d = divisions.find(div => div.id === divisionId);
    if (!d) return null;

    const gym = d.default_gym_id ? gyms.find(g => g.id === d.default_gym_id) || null : null;
    const fee = fees.find(f => f.division_id === d.id) || null;

    return {
      division_id: d.id,
      division_name: d.name,
      description: d.description || '',
      division_type: d.division_type,
      skill_level: d.skill_level || null,
      is_coed: typeof d.is_coed === 'boolean' ? d.is_coed : null,
      age_min: typeof d.age_min === 'number' ? d.age_min : null,
      age_max: typeof d.age_max === 'number' ? d.age_max : null,
      typical_game_days: Array.isArray(d.typical_game_days) ? d.typical_game_days : [],
      typical_game_time_start: d.typical_game_time_start || null,
      typical_game_time_end: d.typical_game_time_end || null,
      default_gym_id: d.default_gym_id || null,
      default_gym_name: gym ? gym.name : null,
      default_gym: gym,
      youth_season_fee: fee && typeof fee.season_fee === 'number' ? fee.season_fee : null
    };
  }

  // 6. getScheduleAndStandingsByDivision
  getScheduleAndStandingsByDivision(divisionId) {
    if (!divisionId) return {
      division_id: null,
      division_name: '',
      upcoming_games: [],
      completed_games: [],
      standings: []
    };

    const divisions = this._getFromStorage('leaguedivisions', []);
    const games = this._getFromStorage('games', []);
    const gyms = this._getFromStorage('gymlocations', []);
    const courts = this._getFromStorage('courts', []);
    const teams = this._getFromStorage('teams', []);

    const division = divisions.find(d => d.id === divisionId) || null;

    const divisionGames = games.filter(g => g.division_id === divisionId);

    const mapGame = (g) => {
      const gym = gyms.find(x => x.id === g.location_gym_id) || null;
      const court = g.location_court_id ? (courts.find(c => c.id === g.location_court_id) || null) : null;
      const homeTeam = teams.find(t => t.id === g.home_team_id) || null;
      const awayTeam = teams.find(t => t.id === g.away_team_id) || null;
      return {
        game_id: g.id,
        division_id: divisionId,
        division_name: division ? division.name : '',
        start_datetime: g.start_datetime,
        day_of_week: g.day_of_week,
        location_gym_id: g.location_gym_id,
        location_gym_name: gym ? gym.name : null,
        location_gym: gym,
        location_court_id: g.location_court_id || null,
        location_court_name: court ? court.name : null,
        location_court: court,
        home_team_id: g.home_team_id,
        home_team_name: homeTeam ? homeTeam.name : null,
        home_team: homeTeam,
        away_team_id: g.away_team_id,
        away_team_name: awayTeam ? awayTeam.name : null,
        away_team: awayTeam,
        recorded_home_score: typeof g.recorded_home_score === 'number' ? g.recorded_home_score : null,
        recorded_away_score: typeof g.recorded_away_score === 'number' ? g.recorded_away_score : null,
        status: g.status,
        is_playoff: !!g.is_playoff,
        is_championship: !!g.is_championship
      };
    };

    const upcomingGames = divisionGames
      .filter(g => g.status !== 'completed')
      .sort((a, b) => {
        if (!a.start_datetime || !b.start_datetime) return 0;
        return new Date(a.start_datetime) - new Date(b.start_datetime);
      })
      .map(mapGame);

    const completedGames = divisionGames
      .filter(g => g.status === 'completed')
      .sort((a, b) => {
        if (!a.start_datetime || !b.start_datetime) return 0;
        return new Date(a.start_datetime) - new Date(b.start_datetime);
      })
      .map(mapGame);

    // Standings calculation
    const teamMap = {};
    teams
      .filter(t => t.division_id === divisionId)
      .forEach(t => {
        teamMap[t.id] = {
          team_id: t.id,
          team_name: t.name,
          wins: 0,
          losses: 0,
          ties: 0,
          points_for: 0,
          points_against: 0,
          rank: null
        };
      });

    divisionGames
      .filter(g => g.status === 'completed')
      .forEach(g => {
        const home = teamMap[g.home_team_id];
        const away = teamMap[g.away_team_id];
        const hs = typeof g.recorded_home_score === 'number' ? g.recorded_home_score : null;
        const as = typeof g.recorded_away_score === 'number' ? g.recorded_away_score : null;
        if (!home || !away || hs === null || as === null) return;

        home.points_for += hs;
        home.points_against += as;
        away.points_for += as;
        away.points_against += hs;

        if (hs > as) {
          home.wins += 1;
          away.losses += 1;
        } else if (hs < as) {
          away.wins += 1;
          home.losses += 1;
        } else {
          home.ties += 1;
          away.ties += 1;
        }
      });

    const standings = Object.values(teamMap)
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (a.losses !== b.losses) return a.losses - b.losses;
        const diffA = a.points_for - a.points_against;
        const diffB = b.points_for - b.points_against;
        if (diffB !== diffA) return diffB - diffA;
        return a.team_name.localeCompare(b.team_name);
      })
      .map((t, index) => ({
        ...t,
        rank: index + 1
      }));

    return {
      division_id: divisionId,
      division_name: division ? division.name : '',
      upcoming_games: upcomingGames,
      completed_games: completedGames,
      standings
    };
  }

  // 7. searchTeamsByName
  searchTeamsByName(query, divisionId, limit) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return [];

    const teams = this._getFromStorage('teams', []);
    const divisions = this._getFromStorage('leaguedivisions', []);
    const max = typeof limit === 'number' && limit > 0 ? limit : 10;

    const filtered = teams.filter(t => {
      if (divisionId && t.division_id !== divisionId) return false;
      return t.name && t.name.toLowerCase().indexOf(q) !== -1;
    });

    return filtered.slice(0, max).map(t => {
      const division = divisions.find(d => d.id === t.division_id) || null;
      return {
        team_id: t.id,
        team_name: t.name,
        division_id: t.division_id,
        division_name: division ? division.name : '',
        is_active: typeof t.is_active === 'boolean' ? t.is_active : null,
        division
      };
    });
  }

  // 8. getTeamGames
  getTeamGames(teamId, timeframe, limit, includeScores) {
    if (!teamId) return [];
    const tf = timeframe || 'all';
    const max = typeof limit === 'number' && limit > 0 ? limit : 20;
    const withScores = typeof includeScores === 'boolean' ? includeScores : true;

    const games = this._getFromStorage('games', []);
    const divisions = this._getFromStorage('leaguedivisions', []);
    const gyms = this._getFromStorage('gymlocations', []);
    const courts = this._getFromStorage('courts', []);
    const teams = this._getFromStorage('teams', []);

    const now = new Date();

    let teamGames = games.filter(g => g.home_team_id === teamId || g.away_team_id === teamId);

    teamGames = teamGames.filter(g => {
      if (!g.start_datetime) return tf === 'all';
      const date = new Date(g.start_datetime);
      if (tf === 'upcoming') {
        return g.status !== 'completed' || date >= now;
      }
      if (tf === 'past') {
        return g.status === 'completed' || date < now;
      }
      return true;
    });

    teamGames.sort((a, b) => {
      if (!a.start_datetime || !b.start_datetime) return 0;
      return new Date(a.start_datetime) - new Date(b.start_datetime);
    });

    const mapped = teamGames.slice(0, max).map(g => {
      const division = divisions.find(d => d.id === g.division_id) || null;
      const gym = gyms.find(x => x.id === g.location_gym_id) || null;
      const court = g.location_court_id ? (courts.find(c => c.id === g.location_court_id) || null) : null;
      const homeTeam = teams.find(t => t.id === g.home_team_id) || null;
      const awayTeam = teams.find(t => t.id === g.away_team_id) || null;

      return {
        game_id: g.id,
        division_id: g.division_id,
        division_name: division ? division.name : '',
        division,
        start_datetime: g.start_datetime,
        end_datetime: g.end_datetime || null,
        day_of_week: g.day_of_week,
        location_gym_id: g.location_gym_id,
        location_gym_name: gym ? gym.name : null,
        location_gym: gym,
        location_court_id: g.location_court_id || null,
        location_court_name: court ? court.name : null,
        location_court: court,
        home_team_id: g.home_team_id,
        home_team_name: homeTeam ? homeTeam.name : null,
        home_team: homeTeam,
        away_team_id: g.away_team_id,
        away_team_name: awayTeam ? awayTeam.name : null,
        away_team: awayTeam,
        recorded_home_score: withScores && typeof g.recorded_home_score === 'number' ? g.recorded_home_score : null,
        recorded_away_score: withScores && typeof g.recorded_away_score === 'number' ? g.recorded_away_score : null,
        status: g.status,
        is_playoff: !!g.is_playoff,
        is_championship: !!g.is_championship
      };
    });

    return mapped;
  }

  // 9. getPlayoffScheduleByDivision
  getPlayoffScheduleByDivision(divisionId) {
    if (!divisionId) {
      return {
        division_id: null,
        division_name: '',
        bracket_description: '',
        games: []
      };
    }

    const divisions = this._getFromStorage('leaguedivisions', []);
    const games = this._getFromStorage('games', []);
    const gyms = this._getFromStorage('gymlocations', []);
    const courts = this._getFromStorage('courts', []);
    const teams = this._getFromStorage('teams', []);

    const division = divisions.find(d => d.id === divisionId) || null;

    const playoffGames = games
      .filter(g => g.division_id === divisionId && g.is_playoff === true)
      .sort((a, b) => {
        if (!a.start_datetime || !b.start_datetime) return 0;
        return new Date(a.start_datetime) - new Date(b.start_datetime);
      });

    const mappedGames = playoffGames.map(g => {
      const gym = gyms.find(x => x.id === g.location_gym_id) || null;
      const court = g.location_court_id ? (courts.find(c => c.id === g.location_court_id) || null) : null;
      const homeTeam = teams.find(t => t.id === g.home_team_id) || null;
      const awayTeam = teams.find(t => t.id === g.away_team_id) || null;

      return {
        game_id: g.id,
        start_datetime: g.start_datetime,
        day_of_week: g.day_of_week,
        location_gym_id: g.location_gym_id,
        location_gym_name: gym ? gym.name : null,
        location_gym: gym,
        location_court_id: g.location_court_id || null,
        location_court_name: court ? court.name : null,
        location_court: court,
        home_team_id: g.home_team_id,
        home_team_name: homeTeam ? homeTeam.name : null,
        home_team: homeTeam,
        away_team_id: g.away_team_id,
        away_team_name: awayTeam ? awayTeam.name : null,
        away_team: awayTeam,
        status: g.status,
        is_championship: !!g.is_championship
      };
    });

    // Bracket description could be stored separately if needed.
    const bracket_description = '';

    return {
      division_id: divisionId,
      division_name: division ? division.name : '',
      bracket_description,
      games: mappedGames
    };
  }

  // 10. getChampionshipGames
  getChampionshipGames() {
    const games = this._getFromStorage('games', []);
    const divisions = this._getFromStorage('leaguedivisions', []);
    const gyms = this._getFromStorage('gymlocations', []);
    const courts = this._getFromStorage('courts', []);
    const teams = this._getFromStorage('teams', []);

    const champs = games.filter(g => g.is_championship === true);

    return champs.map(g => {
      const division = divisions.find(d => d.id === g.division_id) || null;
      const gym = gyms.find(x => x.id === g.location_gym_id) || null;
      const court = g.location_court_id ? (courts.find(c => c.id === g.location_court_id) || null) : null;
      const homeTeam = teams.find(t => t.id === g.home_team_id) || null;
      const awayTeam = teams.find(t => t.id === g.away_team_id) || null;

      return {
        game_id: g.id,
        division_id: g.division_id,
        division_name: division ? division.name : '',
        division,
        start_datetime: g.start_datetime,
        day_of_week: g.day_of_week,
        location_gym_id: g.location_gym_id,
        location_gym_name: gym ? gym.name : null,
        location_gym: gym,
        location_court_id: g.location_court_id || null,
        location_court_name: court ? court.name : null,
        location_court: court,
        home_team_id: g.home_team_id,
        home_team_name: homeTeam ? homeTeam.name : null,
        home_team: homeTeam,
        away_team_id: g.away_team_id,
        away_team_name: awayTeam ? awayTeam.name : null,
        away_team: awayTeam,
        status: g.status
      };
    });
  }

  // 11. getGymLocationsSummary
  getGymLocationsSummary() {
    const gyms = this._getFromStorage('gymlocations', []);
    const courts = this._getFromStorage('courts', []);
    const divisions = this._getFromStorage('leaguedivisions', []);

    return gyms.map(gym => {
      const gymCourts = courts
        .filter(c => c.gym_id === gym.id)
        .map(c => ({
          court_id: c.id,
          court_name: c.name,
          is_main_court: typeof c.is_main_court === 'boolean' ? c.is_main_court : null
        }));

      const typicalDivisions = divisions
        .filter(d => d.default_gym_id === gym.id)
        .map(d => ({
          division_id: d.id,
          division_name: d.name,
          division_type: d.division_type,
          typical_game_days: Array.isArray(d.typical_game_days) ? d.typical_game_days : [],
          typical_game_time_start: d.typical_game_time_start || null,
          typical_game_time_end: d.typical_game_time_end || null
        }));

      return {
        gym_id: gym.id,
        gym_name: gym.name,
        address_line1: gym.address_line1 || '',
        address_line2: gym.address_line2 || '',
        city: gym.city || '',
        state: gym.state || '',
        postal_code: gym.postal_code || '',
        description: gym.description || '',
        courts: gymCourts,
        typical_divisions: typicalDivisions
      };
    });
  }

  // 12. getGymDetails
  getGymDetails(gymId) {
    if (!gymId) return null;
    const gyms = this._getFromStorage('gymlocations', []);
    const courts = this._getFromStorage('courts', []);
    const divisions = this._getFromStorage('leaguedivisions', []);

    const gym = gyms.find(g => g.id === gymId);
    if (!gym) return null;

    const gymCourts = courts
      .filter(c => c.gym_id === gym.id)
      .map(c => ({
        court_id: c.id,
        court_name: c.name,
        is_main_court: typeof c.is_main_court === 'boolean' ? c.is_main_court : null
      }));

    const typicalDivisions = divisions
      .filter(d => d.default_gym_id === gym.id)
      .map(d => ({
        division_id: d.id,
        division_name: d.name,
        division_type: d.division_type,
        typical_game_days: Array.isArray(d.typical_game_days) ? d.typical_game_days : [],
        typical_game_time_start: d.typical_game_time_start || null,
        typical_game_time_end: d.typical_game_time_end || null
      }));

    return {
      gym_id: gym.id,
      gym_name: gym.name,
      address_line1: gym.address_line1 || '',
      address_line2: gym.address_line2 || '',
      city: gym.city || '',
      state: gym.state || '',
      postal_code: gym.postal_code || '',
      description: gym.description || '',
      courts: gymCourts,
      typical_divisions: typicalDivisions
    };
  }

  // 13. getSponsorshipTiersSummary
  getSponsorshipTiersSummary() {
    const tiers = this._getFromStorage('sponsorshiptiers', []);
    return tiers.map(t => ({
      tier_id: t.id,
      name: t.name,
      price: typeof t.price === 'number' ? t.price : null,
      description: t.description || '',
      benefits: Array.isArray(t.benefits) ? t.benefits : []
    }));
  }

  // 14. getVolunteerRolesSummary
  getVolunteerRolesSummary() {
    const roles = this._getFromStorage('volunteerroles', []);
    return roles.map(r => ({
      role_id: r.id,
      name: r.name,
      description: r.description || '',
      min_age: typeof r.min_age === 'number' ? r.min_age : null,
      availability_requirements: r.availability_requirements || '',
      typical_days: Array.isArray(r.typical_days) ? r.typical_days : [],
      typical_time_window: r.typical_time_window || '',
      paid: typeof r.paid === 'boolean' ? r.paid : null,
      pay_per_game: typeof r.pay_per_game === 'number' ? r.pay_per_game : null
    }));
  }

  // 15. getAboutLeagueContent
  getAboutLeagueContent() {
    const content = this._getFromStorage('about_league_content', {
      mission: '',
      history: '',
      structure: '',
      organizers: [],
      recommended_links: []
    });

    return {
      mission: content.mission || '',
      history: content.history || '',
      structure: content.structure || '',
      organizers: Array.isArray(content.organizers) ? content.organizers : [],
      recommended_links: Array.isArray(content.recommended_links) ? content.recommended_links : []
    };
  }

  // 16. getFaqEntries
  getFaqEntries(category) {
    const faqs = this._getFromStorage('faq_entries', []);
    if (!category) return faqs;
    const cat = category.toLowerCase();
    return faqs.filter(f => Array.isArray(f.categories) && f.categories.map(c => (c || '').toLowerCase()).indexOf(cat) !== -1);
  }

  // 17. getContactFormConfig
  getContactFormConfig() {
    let config = this._getFromStorage('contact_form_config', null);
    if (!config || typeof config !== 'object') {
      config = this._getDefaultContactFormConfig();
      this._saveToStorage('contact_form_config', config);
    }
    return config;
  }

  // 18. submitContactInquiry
  submitContactInquiry(
    reason,
    name,
    email,
    subject,
    message,
    preferred_contact_method,
    phone,
    organization_name,
    number_of_players,
    division_id,
    team_name,
    opponent_team_name,
    game_id,
    game_date,
    game_start_time,
    gym_id,
    gym_court_id,
    gym_name_override,
    date_of_incident,
    availability_days,
    availability_time_window,
    skill_level,
    age,
    sponsorship_tier_id,
    marketing_budget,
    volunteer_role_id,
    is_media_courtside_requested,
    lost_item_description,
    lost_item_brand,
    lost_item_color
  ) {
    const inquiryId = this._generateContactInquiryId();
    const createdAt = new Date().toISOString();

    const normalizedGameStartTime = game_start_time ? this._parseAndFormatTime(game_start_time) : null;

    const payload = {
      id: inquiryId,
      created_at: createdAt,
      reason,
      name,
      email,
      subject,
      message,
      preferred_contact_method: preferred_contact_method || null,
      phone: phone || null,
      organization_name: organization_name || null,
      number_of_players: typeof number_of_players === 'number' ? number_of_players : null,
      division_id: division_id || null,
      team_name: team_name || null,
      opponent_team_name: opponent_team_name || null,
      game_id: game_id || null,
      game_date: game_date || null,
      game_start_time: normalizedGameStartTime || (game_start_time || null),
      gym_id: gym_id || null,
      gym_court_id: gym_court_id || null,
      gym_name_override: gym_name_override || null,
      date_of_incident: date_of_incident || null,
      availability_days: Array.isArray(availability_days) ? availability_days : (availability_days ? [availability_days] : []),
      availability_time_window: availability_time_window || null,
      skill_level: skill_level || null,
      age: typeof age === 'number' ? age : null,
      sponsorship_tier_id: sponsorship_tier_id || null,
      marketing_budget: typeof marketing_budget === 'number' ? marketing_budget : null,
      volunteer_role_id: volunteer_role_id || null,
      is_media_courtside_requested: typeof is_media_courtside_requested === 'boolean' ? is_media_courtside_requested : null,
      lost_item_description: lost_item_description || null,
      lost_item_brand: lost_item_brand || null,
      lost_item_color: lost_item_color || null,
      status: 'received'
    };

    const inquiries = this._getFromStorage('contactinquiries', []);
    inquiries.push(payload);
    this._saveToStorage('contactinquiries', inquiries);

    return {
      success: true,
      inquiry_id: inquiryId,
      status: 'received',
      message: 'Your inquiry has been received. We will respond as soon as possible.',
      estimated_response_time_hours: 48
    };
  }

  // 19. getContactInquiryStatus
  getContactInquiryStatus(inquiryId) {
    if (!inquiryId) {
      return { found: false, inquiry: null };
    }
    const inquiries = this._getFromStorage('contactinquiries', []);
    const inquiry = inquiries.find(i => i.id === inquiryId) || null;
    if (!inquiry) {
      return { found: false, inquiry: null };
    }
    return {
      found: true,
      inquiry: {
        id: inquiry.id,
        created_at: inquiry.created_at,
        reason: inquiry.reason,
        subject: inquiry.subject,
        status: inquiry.status || 'received'
      }
    };
  }

  // NO test or demo methods in this class
}

// Browser global + Node.js export
if (typeof window !== 'undefined') {
  window.BusinessLogic = BusinessLogic;
  window.WebsiteSDK = new BusinessLogic();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BusinessLogic;
}
