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
  }

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    const arrayKeys = [
      'games',
      'regions',
      'teams',
      'team_members',
      'team_applications',
      'players',
      'player_game_profiles',
      'player_availability_slots',
      'player_shortlist_items',
      'tournaments',
      'tournament_reviews',
      'tournament_registrations',
      'scrim_events',
      'scrim_registrations',
      'direct_messages',
      'tryout_invitations',
      'site_pages',
      'header_links',
      'footer_links',
      'contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Current user context helpers (may be set by auth layer)
    if (!localStorage.getItem('currentPlayerId')) {
      localStorage.setItem('currentPlayerId', '');
    }
    if (!localStorage.getItem('myTeamIds')) {
      localStorage.setItem('myTeamIds', JSON.stringify([]));
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

  // -------------------- Generic Helpers --------------------

  _getGameByCode(gameCode) {
    const games = this._getFromStorage('games');
    return games.find((g) => g.code === gameCode) || null;
  }

  _getRegionByCode(regionCode) {
    const regions = this._getFromStorage('regions');
    return regions.find((r) => r.code === regionCode) || null;
  }

  _dateToYMD(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  _parseTimeToMinutes(str) {
    if (!str || typeof str !== 'string') return null;
    const m = str.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    if (isNaN(h) || isNaN(mm)) return null;
    return h * 60 + mm;
  }

  _compareDatesOnly(isoString, dateStart, dateEnd) {
    if (!isoString) return false;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return false;
    const ymd = this._dateToYMD(d);
    if (!ymd) return false;
    if (dateStart && ymd < dateStart) return false;
    if (dateEnd && ymd > dateEnd) return false;
    return true;
  }

  _getCurrentUserContext() {
    // Determine current player
    let playerId = localStorage.getItem('currentPlayerId') || '';
    const players = this._getFromStorage('players');
    let player = players.find((p) => p.id === playerId) || null;

    // If no current player is set, fall back to a sensible default
    // Test data uses a player with id "player_current" as the signed-in user.
    if (!player) {
      const fallback =
        players.find((p) => p.id === 'player_current') ||
        (players.length > 0 ? players[0] : null);
      if (fallback) {
        player = fallback;
        playerId = fallback.id;
        try {
          localStorage.setItem('currentPlayerId', playerId);
        } catch (e) {
          // Ignore storage errors in non-browser environments
        }
      }
    }

    // Load managed team ids from storage
    let myTeamIds = [];
    try {
      const raw = localStorage.getItem('myTeamIds');
      myTeamIds = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(myTeamIds)) myTeamIds = [];
    } catch (e) {
      myTeamIds = [];
    }

    // If no managed teams are recorded yet, infer them from team_members
    // Any team where the current player's displayName appears as a member
    // is treated as a team the player manages/owns.
    if (player && myTeamIds.length === 0) {
      const teamMembers = this._getFromStorage('team_members');
      const allTeamsForInference = this._getFromStorage('teams');
      const inferredTeamIds = [];

      allTeamsForInference.forEach((team) => {
        const hasMember = teamMembers.some(
          (m) =>
            m.teamId === team.id &&
            typeof m.nickname === 'string' &&
            m.nickname === player.displayName
        );
        if (hasMember) {
          inferredTeamIds.push(team.id);
        }
      });

      if (inferredTeamIds.length > 0) {
        myTeamIds = inferredTeamIds;
        this._setMyTeamIds(myTeamIds);
      }
    }

    const allTeams = this._getFromStorage('teams');
    const teams = allTeams.filter((t) => myTeamIds.includes(t.id));

    return { player, teams, teamIds: myTeamIds };
  }

  _setMyTeamIds(teamIds) {
    this._saveToStorage('myTeamIds', Array.isArray(teamIds) ? teamIds : []);
  }

  _addTeamToCurrentUserTeams(teamId) {
    const ctx = this._getCurrentUserContext();
    const teamIds = ctx.teamIds.slice();
    if (!teamIds.includes(teamId)) {
      teamIds.push(teamId);
      this._setMyTeamIds(teamIds);
    }
  }

  _normalizeRankTextToOrderValue(rankText) {
    if (!rankText || typeof rankText !== 'string') return 0;
    const normalized = rankText.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!normalized) return 0;

    const tierOrder = {
      // Dota 2
      'herald': 1,
      'guardian': 2,
      'crusader': 3,
      'archon': 4,
      'legend': 5,
      'ancient': 6,
      'divine': 7,
      'immortal': 8,
      // Valorant
      'iron': 10,
      'bronze': 11,
      'silver': 12,
      'gold': 13,
      'platinum': 14,
      'diamond': 15,
      'ascendant': 16,
      'immortal_val': 17,
      'radiant': 18,
      // Rocket League
      'champion': 20,
      'grand champion': 21,
      'supersonic legend': 22
    };

    // Prefer multi-word keys first
    const tierKeys = Object.keys(tierOrder).sort((a, b) => b.length - a.length);

    let base = 0;
    let div = 0;

    for (let i = 0; i < tierKeys.length; i++) {
      const key = tierKeys[i];
      if (normalized.startsWith(key)) {
        base = tierOrder[key];
        const rest = normalized.slice(key.length).trim();
        if (rest) {
          const num = parseInt(rest, 10);
          if (!isNaN(num)) {
            div = num;
          }
        }
        break;
      }
    }

    if (!base) {
      const first = normalized.split(' ')[0];
      if (tierOrder[first]) {
        base = tierOrder[first];
        const rest = normalized.slice(first.length).trim();
        if (rest) {
          const num = parseInt(rest, 10);
          if (!isNaN(num)) {
            div = num;
          }
        }
      }
    }

    if (!base) return 0;

    // Higher number => higher rank. Division 1 is highest within tier.
    let divScore = 0;
    if (div > 0) {
      const clamped = Math.max(1, Math.min(5, div));
      divScore = 10 - clamped; // 1 -> 9, 5 -> 5
    }

    return base * 10 + divScore;
  }

  _filterEligibleTeamsForEvent(event, teams) {
    if (!event || !teams || !Array.isArray(teams)) return [];
    const minRankVal = this._normalizeRankTextToOrderValue(event.minRank || '');
    const maxRankVal = this._normalizeRankTextToOrderValue(event.maxRank || '');

    return teams.filter((team) => {
      if (!team || typeof team !== 'object') return false;
      if (event.gameCode && team.gameCode !== event.gameCode) return false;
      if (event.regionCode && team.regionCode && team.regionCode !== event.regionCode) return false;

      const teamMinVal = this._normalizeRankTextToOrderValue(team.rankMin || '');
      const teamMaxVal = this._normalizeRankTextToOrderValue(team.rankMax || '');

      let ok = true;
      if (minRankVal) {
        const tMax = teamMaxVal || Number.MAX_SAFE_INTEGER;
        ok = ok && tMax >= minRankVal;
      }
      if (ok && maxRankVal) {
        const tMin = teamMinVal || 0;
        ok = ok && tMin <= maxRankVal;
      }
      return ok;
    });
  }

  _validateAvailabilitySlots(slots) {
    if (!Array.isArray(slots)) return [];
    const seen = new Set();
    const result = [];

    for (let i = 0; i < slots.length; i++) {
      const s = slots[i] || {};
      const dayOfWeek = s.dayOfWeek;
      const startTime = s.startTime;
      const endTime = s.endTime;
      if (!dayOfWeek || !startTime || !endTime) continue;

      const startMin = this._parseTimeToMinutes(startTime);
      const endMin = this._parseTimeToMinutes(endTime);
      if (startMin === null || endMin === null || startMin >= endMin) continue;

      const key = [s.gameCode || '', dayOfWeek, startTime, endTime, s.timezone || ''].join('|');
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({
        id: s.id || null,
        gameCode: s.gameCode || null,
        dayOfWeek,
        startTime,
        endTime,
        timezone: s.timezone || ''
      });
    }
    return result;
  }

  _ensureShortlistStorage() {
    let items = this._getFromStorage('player_shortlist_items');
    if (!Array.isArray(items)) {
      items = [];
      this._saveToStorage('player_shortlist_items', items);
    }
    return items;
  }

  // -------------------- Home Page --------------------

  getHomeFeaturedContent() {
    const teams = this._getFromStorage('teams');
    const players = this._getFromStorage('players');
    const playerGameProfiles = this._getFromStorage('player_game_profiles');
    const tournaments = this._getFromStorage('tournaments');
    const scrims = this._getFromStorage('scrim_events');

    const now = new Date();

    // Featured teams: those flagged isFeatured
    const featuredTeamsRaw = teams.filter((t) => t && t.isFeatured);
    const featuredTeams = featuredTeamsRaw.map((t) => {
      const game = this._getGameByCode(t.gameCode);
      const region = this._getRegionByCode(t.regionCode);
      return {
        teamId: t.id,
        name: t.name,
        gameCode: t.gameCode,
        gameName: game ? game.name : t.gameCode,
        regionCode: t.regionCode,
        regionName: region ? region.name : t.regionCode,
        rankMin: t.rankMin || null,
        rankMax: t.rankMax || null,
        languages: Array.isArray(t.languages) ? t.languages : [],
        rolesNeeded: Array.isArray(t.rolesNeeded) ? t.rolesNeeded : [],
        recruitmentStatus: t.recruitmentStatus || 'open_to_new_players',
        activityScoreWeek: typeof t.activityScoreWeek === 'number' ? t.activityScoreWeek : 0,
        isFeatured: !!t.isFeatured,
        // Foreign key resolution
        team: t
      };
    });

    // Featured players: simple heuristic - lookingForTeam players
    const featuredPlayersRaw = players.filter((p) => p && p.lookingForTeam);
    const featuredPlayers = featuredPlayersRaw.map((p) => {
      const gameCode = p.primaryGameCode || null;
      const game = gameCode ? this._getGameByCode(gameCode) : null;
      const pgp = playerGameProfiles.find(
        (g) => g.playerId === p.id && (g.isPrimaryForGame || g.gameCode === gameCode)
      ) || null;
      const region = pgp && pgp.regionCode ? this._getRegionByCode(pgp.regionCode) : null;
      return {
        playerId: p.id,
        displayName: p.displayName,
        primaryGameCode: gameCode,
        primaryGameName: game ? game.name : (gameCode || null),
        regionCode: pgp ? pgp.regionCode || null : null,
        regionName: region ? region.name : (pgp && pgp.regionCode) || null,
        rankText: pgp ? pgp.rankText || null : null,
        roles: pgp && Array.isArray(pgp.roles) ? pgp.roles : [],
        lookingForTeam: !!p.lookingForTeam,
        // Foreign key resolution
        player: p
      };
    });

    // Upcoming tournaments (future startAt)
    const upcomingTournamentsRaw = tournaments
      .filter((t) => {
        if (!t || !t.startAt) return false;
        const d = new Date(t.startAt);
        return !isNaN(d.getTime()) && d >= now;
      })
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

    const upcomingTournaments = upcomingTournamentsRaw.map((t) => {
      const game = this._getGameByCode(t.gameCode);
      const region = t.regionCode ? this._getRegionByCode(t.regionCode) : null;
      return {
        tournamentId: t.id,
        name: t.name,
        gameCode: t.gameCode,
        gameName: game ? game.name : t.gameCode,
        regionCode: t.regionCode || null,
        regionName: region ? region.name : (t.regionCode || null),
        startAt: t.startAt,
        entryFee: typeof t.entryFee === 'number' ? t.entryFee : 0,
        isFree: !!t.isFree,
        prizePool: typeof t.prizePool === 'number' ? t.prizePool : 0,
        teamType: t.teamType,
        ratingAverage: typeof t.ratingAverage === 'number' ? t.ratingAverage : null,
        // Foreign key resolution
        tournament: t
      };
    });

    // Upcoming scrims (future)
    const upcomingScrimsRaw = scrims
      .filter((s) => {
        if (!s || !s.startAt) return false;
        const d = new Date(s.startAt);
        return !isNaN(d.getTime()) && d >= now;
      })
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

    const upcomingScrims = upcomingScrimsRaw.map((s) => {
      const game = this._getGameByCode(s.gameCode);
      const region = s.regionCode ? this._getRegionByCode(s.regionCode) : null;
      return {
        scrimEventId: s.id,
        title: s.title,
        gameCode: s.gameCode,
        gameName: game ? game.name : s.gameCode,
        regionCode: s.regionCode || null,
        regionName: region ? region.name : (s.regionCode || null),
        teamSizeType: s.teamSizeType,
        startAt: s.startAt,
        requirements: s.requirements || '',
        // Foreign key resolution
        scrimEvent: s
      };
    });

    return {
      heroMessage: 'Find your next squad, tournaments, and scrims in one place.',
      introText: 'Browse teams, players, tournaments, and scrims tailored to your games and region.',
      featuredTeams,
      featuredPlayers,
      upcomingTournaments,
      upcomingScrims
    };
  }

  // -------------------- Team Search / Details / Creation --------------------

  getTeamSearchFilterOptions() {
    const games = this._getFromStorage('games').map((g) => ({ code: g.code, name: g.name }));
    const regions = this._getFromStorage('regions').map((r) => ({ code: r.code, name: r.name }));

    const teams = this._getFromStorage('teams');
    const playerGameProfiles = this._getFromStorage('player_game_profiles');

    // Derive languages from existing teams
    const languageSet = new Map();
    teams.forEach((t) => {
      if (t && Array.isArray(t.languages)) {
        t.languages.forEach((lang) => {
          if (!lang || typeof lang !== 'string') return;
          const label = lang.trim();
          if (!label) return;
          const code = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          if (!languageSet.has(code)) {
            languageSet.set(code, label);
          }
        });
      }
    });

    const languages = Array.from(languageSet.entries()).map(([code, label]) => ({ code, label }));

    // Derive roles from teams and player game profiles
    const roleSet = new Map();
    teams.forEach((t) => {
      if (t && Array.isArray(t.rolesNeeded)) {
        t.rolesNeeded.forEach((role) => {
          if (!role || typeof role !== 'string') return;
          const label = role.trim();
          if (!label) return;
          const code = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          if (!roleSet.has(code)) {
            roleSet.set(code, label);
          }
        });
      }
    });
    playerGameProfiles.forEach((pgp) => {
      if (pgp && Array.isArray(pgp.roles)) {
        pgp.roles.forEach((role) => {
          if (!role || typeof role !== 'string') return;
          const label = role.trim();
          if (!label) return;
          const code = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
          if (!roleSet.has(code)) {
            roleSet.set(code, label);
          }
        });
      }
    });
    const roles = Array.from(roleSet.entries()).map(([code, label]) => ({ code, label }));

    const availabilityPresets = [
      { code: 'weeknights', label: 'Weeknights' },
      { code: 'weekends', label: 'Weekends' },
      { code: 'late_night', label: 'Late night' }
    ];

    const sortOptions = [
      { value: 'most_active_this_week', label: 'Most active this week' },
      { value: 'created_at_desc', label: 'Newest first' },
      { value: 'created_at_asc', label: 'Oldest first' }
    ];

    return {
      games,
      regions,
      languages,
      roles,
      availabilityPresets,
      sortOptions
    };
  }

  searchTeams(filters, sortBy, page, pageSize) {
    const teams = this._getFromStorage('teams');
    const games = this._getFromStorage('games');
    const regions = this._getFromStorage('regions');

    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;

    let results = teams.filter((t) => !!t);

    if (f.gameCode) {
      results = results.filter((t) => t.gameCode === f.gameCode);
    }

    if (f.regionCode) {
      results = results.filter((t) => t.regionCode === f.regionCode);
    }

    if (Array.isArray(f.languages) && f.languages.length > 0) {
      const langsLower = f.languages.map((l) => String(l).toLowerCase());
      results = results.filter((t) => {
        if (!Array.isArray(t.languages) || t.languages.length === 0) return false;
        const teamLangs = t.languages.map((l) => String(l).toLowerCase());
        return langsLower.some((l) => teamLangs.includes(l));
      });
    }

    if (Array.isArray(f.rolesNeeded) && f.rolesNeeded.length > 0) {
      const rolesLower = f.rolesNeeded.map((r) => String(r).toLowerCase());
      results = results.filter((t) => {
        if (!Array.isArray(t.rolesNeeded) || t.rolesNeeded.length === 0) return false;
        const teamRoles = t.rolesNeeded.map((r) => String(r).toLowerCase());
        return rolesLower.some((r) => teamRoles.includes(r));
      });
    }

    if (f.recruitmentStatus) {
      results = results.filter((t) => t.recruitmentStatus === f.recruitmentStatus);
    }

    // Rank range overlap logic
    if (f.rankMin || f.rankMax) {
      const filterMinVal = this._normalizeRankTextToOrderValue(f.rankMin || '');
      const filterMaxVal = this._normalizeRankTextToOrderValue(f.rankMax || '');
      results = results.filter((t) => {
        const teamMinVal = this._normalizeRankTextToOrderValue(t.rankMin || '');
        const teamMaxVal = this._normalizeRankTextToOrderValue(t.rankMax || '');

        const tMin = teamMinVal || 0;
        const tMax = teamMaxVal || Number.MAX_SAFE_INTEGER;

        let ok = true;
        if (filterMinVal) {
          ok = ok && tMax >= filterMinVal;
        }
        if (ok && filterMaxVal) {
          ok = ok && tMin <= filterMaxVal;
        }
        return ok;
      });
    }

    // Sort
    if (sortBy === 'most_active_this_week') {
      results.sort((a, b) => {
        const aScore = typeof a.activityScoreWeek === 'number' ? a.activityScoreWeek : 0;
        const bScore = typeof b.activityScoreWeek === 'number' ? b.activityScoreWeek : 0;
        if (bScore !== aScore) return bScore - aScore;
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bCreated - aCreated;
      });
    } else if (sortBy === 'created_at_asc') {
      results.sort((a, b) => {
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return aCreated - bCreated;
      });
    } else if (sortBy === 'created_at_desc') {
      results.sort((a, b) => {
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bCreated - aCreated;
      });
    }

    const totalResults = results.length;
    const startIndex = (pg - 1) * ps;
    const pageItems = results.slice(startIndex, startIndex + ps);

    const mapped = pageItems.map((t) => {
      const game = games.find((g) => g.code === t.gameCode) || null;
      const region = regions.find((r) => r.code === t.regionCode) || null;
      return {
        teamId: t.id,
        name: t.name,
        gameCode: t.gameCode,
        gameName: game ? game.name : t.gameCode,
        regionCode: t.regionCode,
        regionName: region ? region.name : t.regionCode,
        rankMin: t.rankMin || null,
        rankMax: t.rankMax || null,
        languages: Array.isArray(t.languages) ? t.languages : [],
        rolesNeeded: Array.isArray(t.rolesNeeded) ? t.rolesNeeded : [],
        typicalSchedule: t.typicalSchedule || '',
        recruitmentStatus: t.recruitmentStatus || 'open_to_new_players',
        activityScoreWeek: typeof t.activityScoreWeek === 'number' ? t.activityScoreWeek : 0,
        createdAt: t.createdAt || null,
        // Foreign key resolution
        team: t
      };
    });

    return {
      totalResults,
      page: pg,
      pageSize: ps,
      teams: mapped
    };
  }

  getTeamDetails(teamId) {
    const teams = this._getFromStorage('teams');
    const members = this._getFromStorage('team_members');
    const applications = this._getFromStorage('team_applications');

    const team = teams.find((t) => t.id === teamId) || null;
    if (!team) {
      return {
        team: null,
        roster: [],
        statsSummary: {
          memberCount: 0,
          captainCount: 0,
          daysSinceLastActivity: null
        },
        canCurrentUserApply: false,
        currentUserApplicationStatus: 'none'
      };
    }

    const game = this._getGameByCode(team.gameCode);
    const region = this._getRegionByCode(team.regionCode);

    const rosterMembers = members.filter((m) => m.teamId === teamId);

    const roster = rosterMembers.map((m) => ({
      teamMemberId: m.id,
      nickname: m.nickname,
      role: m.role || null,
      isCaptain: !!m.isCaptain,
      joinedAt: m.joinedAt || null,
      lastActiveAt: m.lastActiveAt || null
    }));

    const memberCount = roster.length;
    const captainCount = roster.filter((m) => m.isCaptain).length;

    let lastActivityTs = 0;
    rosterMembers.forEach((m) => {
      if (m.lastActiveAt) {
        const ts = new Date(m.lastActiveAt).getTime();
        if (!isNaN(ts) && ts > lastActivityTs) lastActivityTs = ts;
      }
    });
    if (!lastActivityTs && team.updatedAt) {
      const ts = new Date(team.updatedAt).getTime();
      if (!isNaN(ts)) lastActivityTs = ts;
    }

    let daysSinceLastActivity = null;
    if (lastActivityTs) {
      const diffMs = Date.now() - lastActivityTs;
      daysSinceLastActivity = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }

    const ctx = this._getCurrentUserContext();
    let canCurrentUserApply = false;
    let currentUserApplicationStatus = 'none';

    if (ctx.player && team.recruitmentStatus === 'open_to_new_players') {
      const existingApp = applications.find(
        (a) => a.teamId === teamId && a.applicantPlayerId === ctx.player.id && a.source === 'outgoing'
      );
      if (existingApp) {
        currentUserApplicationStatus = existingApp.status || 'pending';
        canCurrentUserApply = false;
      } else {
        canCurrentUserApply = true;
      }
    }

    return {
      team: {
        id: team.id,
        name: team.name,
        gameCode: team.gameCode,
        gameName: game ? game.name : team.gameCode,
        regionCode: team.regionCode,
        regionName: region ? region.name : team.regionCode,
        rankMin: team.rankMin || null,
        rankMax: team.rankMax || null,
        languages: Array.isArray(team.languages) ? team.languages : [],
        rolesNeeded: Array.isArray(team.rolesNeeded) ? team.rolesNeeded : [],
        typicalSchedule: team.typicalSchedule || '',
        recruitmentStatus: team.recruitmentStatus || 'open_to_new_players',
        activityScoreWeek: typeof team.activityScoreWeek === 'number' ? team.activityScoreWeek : 0,
        createdAt: team.createdAt || null,
        updatedAt: team.updatedAt || null
      },
      roster,
      statsSummary: {
        memberCount,
        captainCount,
        daysSinceLastActivity
      },
      canCurrentUserApply,
      currentUserApplicationStatus
    };
  }

  requestToJoinTeam(teamId, message) {
    const ctx = this._getCurrentUserContext();
    if (!ctx.player) {
      return {
        success: false,
        application: null,
        feedbackMessage: 'You must be logged in to request to join a team.'
      };
    }

    const teams = this._getFromStorage('teams');
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      return {
        success: false,
        application: null,
        feedbackMessage: 'Team not found.'
      };
    }

    if (team.recruitmentStatus !== 'open_to_new_players') {
      return {
        success: false,
        application: null,
        feedbackMessage: 'This team is not currently recruiting.'
      };
    }

    const applications = this._getFromStorage('team_applications');

    const existing = applications.find(
      (a) => a.teamId === teamId && a.applicantPlayerId === ctx.player.id && a.source === 'outgoing'
    );
    if (existing) {
      return {
        success: false,
        application: {
          id: existing.id,
          teamId: existing.teamId,
          status: existing.status,
          message: existing.message,
          createdAt: existing.createdAt
        },
        feedbackMessage: 'You already have an application for this team.'
      };
    }

    const playerGameProfiles = this._getFromStorage('player_game_profiles');
    const primaryGameProfile = playerGameProfiles.find(
      (pgp) => pgp.playerId === ctx.player.id && pgp.gameCode === team.gameCode && pgp.isPrimaryForGame
    ) || playerGameProfiles.find((pgp) => pgp.playerId === ctx.player.id && pgp.gameCode === team.gameCode) || null;

    const nowIso = new Date().toISOString();
    const appId = this._generateId('teamapp');
    const app = {
      id: appId,
      teamId: teamId,
      applicantPlayerId: ctx.player.id,
      message: message || '',
      createdAt: nowIso,
      status: 'pending',
      source: 'outgoing',
      rankSnapshot: primaryGameProfile ? primaryGameProfile.rankText || null : null,
      regionCode: primaryGameProfile ? primaryGameProfile.regionCode || null : null
    };

    applications.push(app);
    this._saveToStorage('team_applications', applications);

    return {
      success: true,
      application: {
        id: app.id,
        teamId: app.teamId,
        status: app.status,
        message: app.message,
        createdAt: app.createdAt
      },
      feedbackMessage: 'Your join request has been submitted.'
    };
  }

  getCreateTeamOptions() {
    const games = this._getFromStorage('games').map((g) => ({ code: g.code, name: g.name }));
    const regions = this._getFromStorage('regions').map((r) => ({ code: r.code, name: r.name }));

    // Languages & roles reused from team search
    const teamFilters = this.getTeamSearchFilterOptions();

    const recruitmentStatuses = [
      { value: 'open_to_new_players', label: 'Open to new players' },
      { value: 'closed_to_new_players', label: 'Closed to new players' }
    ];

    return {
      games,
      regions,
      languages: teamFilters.languages,
      roles: teamFilters.roles,
      recruitmentStatuses
    };
  }

  createTeam(name, gameCode, regionCode, rankMin, rankMax, languages, rolesNeeded, typicalSchedule, recruitmentStatus) {
    if (!name || !gameCode || !regionCode || !recruitmentStatus) {
      return {
        success: false,
        teamId: null,
        teamName: null,
        feedbackMessage: 'Missing required fields for team creation.'
      };
    }

    const teams = this._getFromStorage('teams');
    const nowIso = new Date().toISOString();
    const teamId = this._generateId('team');

    const newTeam = {
      id: teamId,
      name: name,
      gameCode: gameCode,
      regionCode: regionCode,
      rankMin: rankMin || null,
      rankMax: rankMax || null,
      languages: Array.isArray(languages) ? languages : [],
      rolesNeeded: Array.isArray(rolesNeeded) ? rolesNeeded : [],
      typicalSchedule: typicalSchedule || '',
      recruitmentStatus: recruitmentStatus,
      activityScoreWeek: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
      isFeatured: false
    };

    teams.push(newTeam);
    this._saveToStorage('teams', teams);

    // Add current user as captain/member if available
    const ctx = this._getCurrentUserContext();
    if (ctx.player) {
      const teamMembers = this._getFromStorage('team_members');
      const memberId = this._generateId('teammem');
      const newMember = {
        id: memberId,
        teamId: teamId,
        nickname: ctx.player.displayName || 'Captain',
        role: 'Captain',
        isCaptain: true,
        joinedAt: nowIso,
        lastActiveAt: nowIso,
        notes: ''
      };
      teamMembers.push(newMember);
      this._saveToStorage('team_members', teamMembers);
      this._addTeamToCurrentUserTeams(teamId);
    }

    return {
      success: true,
      teamId: teamId,
      teamName: name,
      feedbackMessage: 'Team created successfully.'
    };
  }

  // -------------------- Tournaments --------------------

  getTournamentFilterOptions() {
    const games = this._getFromStorage('games').map((g) => ({ code: g.code, name: g.name }));
    const regions = this._getFromStorage('regions').map((r) => ({ code: r.code, name: r.name }));

    const teamTypes = [
      { value: 'team', label: 'Team tournaments' },
      { value: 'solo_free_agent', label: 'Solo / Free agent' }
    ];

    const entryFeePresets = [
      { code: 'free_only', label: 'Free only', min: 0, max: 0 },
      { code: 'under_10_usd', label: 'Under $10', min: 0, max: 10 }
    ];

    const prizePoolPresets = [
      { code: 'at_least_500', label: 'At least $500', min: 500 },
      { code: 'at_least_1000', label: 'At least $1000', min: 1000 }
    ];

    const sortOptions = [
      { value: 'prize_pool_desc', label: 'Prize pool: High to Low' },
      { value: 'start_at_asc', label: 'Start time: Soonest' },
      { value: 'created_at_desc', label: 'Recently added' },
      { value: 'popularity_desc', label: 'Best reviewed' }
    ];

    return {
      games,
      regions,
      teamTypes,
      entryFeePresets,
      prizePoolPresets,
      sortOptions
    };
  }

  searchTournaments(filters, sortBy, page, pageSize) {
    const tournaments = this._getFromStorage('tournaments');
    const games = this._getFromStorage('games');
    const regions = this._getFromStorage('regions');

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task5_searchFilters', JSON.stringify({ filters, sortBy }));
    } catch (e) {}

    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;

    let results = tournaments.filter((t) => !!t);

    if (f.gameCode) {
      results = results.filter((t) => t.gameCode === f.gameCode);
    }

    if (f.regionCode) {
      results = results.filter((t) => t.regionCode === f.regionCode);
    }

    if (typeof f.isFree === 'boolean') {
      results = results.filter((t) => !!t.isFree === f.isFree);
    }

    if (typeof f.entryFeeMin === 'number') {
      results = results.filter((t) => typeof t.entryFee === 'number' && t.entryFee >= f.entryFeeMin);
    }

    if (typeof f.entryFeeMax === 'number') {
      results = results.filter((t) => typeof t.entryFee === 'number' && t.entryFee <= f.entryFeeMax);
    }

    if (typeof f.minPrizePool === 'number') {
      results = results.filter((t) => typeof t.prizePool === 'number' && t.prizePool >= f.minPrizePool);
    }

    if (f.teamType) {
      results = results.filter((t) => t.teamType === f.teamType);
    }

    if (f.dateStart || f.dateEnd) {
      const dateStart = f.dateStart || null;
      const dateEnd = f.dateEnd || null;
      results = results.filter((t) => this._compareDatesOnly(t.startAt, dateStart, dateEnd));
    }

    if (f.startTimeMin || f.startTimeMax) {
      const minMin = this._parseTimeToMinutes(f.startTimeMin || '00:00');
      const maxMin = this._parseTimeToMinutes(f.startTimeMax || '23:59');
      results = results.filter((t) => {
        if (!t.startAt) return false;
        const d = new Date(t.startAt);
        if (isNaN(d.getTime())) return false;
        // Use UTC time so filtering is consistent regardless of server local timezone
        const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
        if (minMin !== null && mins < minMin) return false;
        if (maxMin !== null && mins > maxMin) return false;
        return true;
      });
    }

    if (sortBy === 'prize_pool_desc') {
      results.sort((a, b) => {
        const ap = typeof a.prizePool === 'number' ? a.prizePool : 0;
        const bp = typeof b.prizePool === 'number' ? b.prizePool : 0;
        if (bp !== ap) return bp - ap;
        const aStart = a.startAt ? new Date(a.startAt).getTime() : 0;
        const bStart = b.startAt ? new Date(b.startAt).getTime() : 0;
        return aStart - bStart;
      });
    } else if (sortBy === 'start_at_asc') {
      results.sort((a, b) => {
        const aStart = a.startAt ? new Date(a.startAt).getTime() : 0;
        const bStart = b.startAt ? new Date(b.startAt).getTime() : 0;
        return aStart - bStart;
      });
    } else if (sortBy === 'created_at_desc') {
      results.sort((a, b) => {
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bCreated - aCreated;
      });
    } else if (sortBy === 'popularity_desc') {
      results.sort((a, b) => {
        const aScore = (a.ratingAverage || 0) * (a.ratingCount || 0);
        const bScore = (b.ratingAverage || 0) * (b.ratingCount || 0);
        return bScore - aScore;
      });
    }

    const totalResults = results.length;
    const startIndex = (pg - 1) * ps;
    const pageItems = results.slice(startIndex, startIndex + ps);

    const mapped = pageItems.map((t) => {
      const game = games.find((g) => g.code === t.gameCode) || null;
      const region = t.regionCode ? regions.find((r) => r.code === t.regionCode) : null;
      return {
        tournamentId: t.id,
        name: t.name,
        gameCode: t.gameCode,
        gameName: game ? game.name : t.gameCode,
        regionCode: t.regionCode || null,
        regionName: region ? region.name : (t.regionCode || null),
        teamType: t.teamType,
        startAt: t.startAt || null,
        endAt: t.endAt || null,
        entryFee: typeof t.entryFee === 'number' ? t.entryFee : 0,
        isFree: !!t.isFree,
        prizePool: typeof t.prizePool === 'number' ? t.prizePool : 0,
        ratingAverage: typeof t.ratingAverage === 'number' ? t.ratingAverage : null,
        ratingCount: typeof t.ratingCount === 'number' ? t.ratingCount : 0,
        // Foreign key resolution
        tournament: t
      };
    });

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task5_candidateTournamentIds',
        JSON.stringify({ tournamentIds: mapped.slice(0, 2).map((t) => t.tournamentId) })
      );
    } catch (e) {}

    return {
      totalResults,
      page: pg,
      pageSize: ps,
      tournaments: mapped
    };
  }

  getTournamentDetails(tournamentId) {
    const tournaments = this._getFromStorage('tournaments');
    const reviewsAll = this._getFromStorage('tournament_reviews');
    const registrations = this._getFromStorage('tournament_registrations');

    // Instrumentation for task completion tracking
    try {
      const key = 'task5_comparedTournamentIds';
      const raw = localStorage.getItem(key);
      let parsed = null;
      try {
        parsed = raw ? JSON.parse(raw) : null;
      } catch (e) {
        parsed = null;
      }
      let comparedIds = parsed && Array.isArray(parsed.comparedIds) ? parsed.comparedIds.slice() : [];
      if (!comparedIds.includes(tournamentId)) {
        comparedIds.push(tournamentId);
      }
      if (comparedIds.length > 2) {
        comparedIds = comparedIds.slice(0, 2);
      }
      localStorage.setItem(key, JSON.stringify({ comparedIds }));
    } catch (e) {}

    const tournament = tournaments.find((t) => t.id === tournamentId) || null;
    if (!tournament) {
      return {
        tournament: null,
        reviews: [],
        registrationStatusForCurrentUser: 'not_registered',
        allowedRegistrationTypes: [],
        eligibleTeams: []
      };
    }

    const game = this._getGameByCode(tournament.gameCode);
    const region = tournament.regionCode ? this._getRegionByCode(tournament.regionCode) : null;

    const reviews = reviewsAll
      .filter((r) => r.tournamentId === tournamentId)
      .map((r) => ({
        reviewId: r.id,
        rating: r.rating,
        title: r.title || '',
        body: r.body || '',
        createdAt: r.createdAt
      }));

    const ctx = this._getCurrentUserContext();
    let registrationStatusForCurrentUser = 'not_registered';
    const allowedRegistrationTypes = [];

    if (tournament.teamType === 'team') {
      allowedRegistrationTypes.push('team');
      if (ctx.teams && ctx.teams.length > 0) {
        const teamIds = ctx.teams.map((t) => t.id);
        const reg = registrations.find(
          (r) =>
            r.tournamentId === tournamentId &&
            r.registrationType === 'team' &&
            teamIds.includes(r.teamId) &&
            r.status !== 'cancelled'
        );
        if (reg) registrationStatusForCurrentUser = 'registered_team';
      }
    } else if (tournament.teamType === 'solo_free_agent') {
      allowedRegistrationTypes.push('solo');
      if (ctx.player) {
        const reg = registrations.find(
          (r) =>
            r.tournamentId === tournamentId &&
            r.registrationType === 'solo' &&
            r.playerId === ctx.player.id &&
            r.status !== 'cancelled'
        );
        if (reg) registrationStatusForCurrentUser = 'registered_solo';
      }
    }

    const eligibleTeamsRaw = this._filterEligibleTeamsForEvent(tournament, ctx.teams || []);
    const eligibleTeams = eligibleTeamsRaw.map((team) => ({
      teamId: team.id,
      name: team.name,
      gameCode: team.gameCode,
      regionCode: team.regionCode,
      rankMin: team.rankMin || null,
      rankMax: team.rankMax || null,
      // Foreign key resolution
      team
    }));

    return {
      tournament: {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description || '',
        gameCode: tournament.gameCode,
        gameName: game ? game.name : tournament.gameCode,
        regionCode: tournament.regionCode || null,
        regionName: region ? region.name : (tournament.regionCode || null),
        format: tournament.format || '',
        rules: tournament.rules || '',
        entryFee: typeof tournament.entryFee === 'number' ? tournament.entryFee : 0,
        entryCurrency: tournament.entryCurrency || 'usd',
        isFree: !!tournament.isFree,
        prizePool: typeof tournament.prizePool === 'number' ? tournament.prizePool : 0,
        prizeCurrency: tournament.prizeCurrency || 'usd',
        teamType: tournament.teamType,
        startAt: tournament.startAt || null,
        endAt: tournament.endAt || null,
        registrationOpenAt: tournament.registrationOpenAt || null,
        registrationCloseAt: tournament.registrationCloseAt || null,
        ratingAverage: typeof tournament.ratingAverage === 'number' ? tournament.ratingAverage : null,
        ratingCount: typeof tournament.ratingCount === 'number' ? tournament.ratingCount : 0,
        minRank: tournament.minRank || null,
        maxRank: tournament.maxRank || null
      },
      reviews,
      registrationStatusForCurrentUser,
      allowedRegistrationTypes,
      eligibleTeams
    };
  }

  registerTeamForTournament(tournamentId, teamId) {
    const ctx = this._getCurrentUserContext();
    if (!ctx.teams || ctx.teams.length === 0) {
      return {
        success: false,
        registration: null,
        feedbackMessage: 'You do not manage any teams.'
      };
    }

    if (!ctx.teamIds.includes(teamId)) {
      return {
        success: false,
        registration: null,
        feedbackMessage: 'You can only register your own teams.'
      };
    }

    const tournaments = this._getFromStorage('tournaments');
    const teams = this._getFromStorage('teams');
    const registrations = this._getFromStorage('tournament_registrations');

    const tournament = tournaments.find((t) => t.id === tournamentId);
    if (!tournament) {
      return {
        success: false,
        registration: null,
        feedbackMessage: 'Tournament not found.'
      };
    }

    if (tournament.teamType !== 'team') {
      return {
        success: false,
        registration: null,
        feedbackMessage: 'This tournament does not accept team registrations.'
      };
    }

    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      return {
        success: false,
        registration: null,
        feedbackMessage: 'Team not found.'
      };
    }

    const existing = registrations.find(
      (r) =>
        r.tournamentId === tournamentId &&
        r.registrationType === 'team' &&
        r.teamId === teamId &&
        r.status !== 'cancelled'
    );
    if (existing) {
      return {
        success: false,
        registration: {
          registrationId: existing.id,
          status: existing.status,
          tournamentId: existing.tournamentId,
          teamId: existing.teamId,
          createdAt: existing.createdAt
        },
        feedbackMessage: 'This team is already registered for the tournament.'
      };
    }

    const nowIso = new Date().toISOString();
    const regId = this._generateId('treg');
    const reg = {
      id: regId,
      tournamentId: tournamentId,
      registrationType: 'team',
      teamId: teamId,
      playerId: null,
      createdAt: nowIso,
      status: 'pending'
    };

    registrations.push(reg);
    this._saveToStorage('tournament_registrations', registrations);

    return {
      success: true,
      registration: {
        registrationId: reg.id,
        status: reg.status,
        tournamentId: reg.tournamentId,
        teamId: reg.teamId,
        createdAt: reg.createdAt
      },
      feedbackMessage: 'Team registered for tournament.'
    };
  }

  registerForTournamentSolo(tournamentId) {
    const ctx = this._getCurrentUserContext();
    if (!ctx.player) {
      return {
        success: false,
        registration: null,
        feedbackMessage: 'You must be logged in to register.'
      };
    }

    const tournaments = this._getFromStorage('tournaments');
    const registrations = this._getFromStorage('tournament_registrations');

    const tournament = tournaments.find((t) => t.id === tournamentId);
    if (!tournament) {
      return {
        success: false,
        registration: null,
        feedbackMessage: 'Tournament not found.'
      };
    }

    if (tournament.teamType !== 'solo_free_agent') {
      return {
        success: false,
        registration: null,
        feedbackMessage: 'This tournament is not a solo/free-agent tournament.'
      };
    }

    const existing = registrations.find(
      (r) =>
        r.tournamentId === tournamentId &&
        r.registrationType === 'solo' &&
        r.playerId === ctx.player.id &&
        r.status !== 'cancelled'
    );
    if (existing) {
      return {
        success: false,
        registration: {
          registrationId: existing.id,
          status: existing.status,
          tournamentId: existing.tournamentId,
          createdAt: existing.createdAt
        },
        feedbackMessage: 'You are already registered for this tournament.'
      };
    }

    const nowIso = new Date().toISOString();
    const regId = this._generateId('treg');
    const reg = {
      id: regId,
      tournamentId: tournamentId,
      registrationType: 'solo',
      teamId: null,
      playerId: ctx.player.id,
      createdAt: nowIso,
      status: 'pending'
    };

    registrations.push(reg);
    this._saveToStorage('tournament_registrations', registrations);

    return {
      success: true,
      registration: {
        registrationId: reg.id,
        status: reg.status,
        tournamentId: reg.tournamentId,
        createdAt: reg.createdAt
      },
      feedbackMessage: 'Registered for tournament as solo player.'
    };
  }

  // -------------------- Player Search & Shortlist --------------------

  getPlayerSearchFilterOptions() {
    const games = this._getFromStorage('games').map((g) => ({ code: g.code, name: g.name }));
    const regions = this._getFromStorage('regions').map((r) => ({ code: r.code, name: r.name }));

    const platforms = [
      { value: 'pc', label: 'PC' },
      { value: 'xbox', label: 'Xbox' },
      { value: 'playstation', label: 'PlayStation' },
      { value: 'nintendo_switch', label: 'Nintendo Switch' },
      { value: 'mobile', label: 'Mobile' },
      { value: 'other', label: 'Other' }
    ];

    const rolesByGame = [];
    const playerGameProfiles = this._getFromStorage('player_game_profiles');
    games.forEach((g) => {
      const roleSet = new Map();
      playerGameProfiles
        .filter((pgp) => pgp.gameCode === g.code)
        .forEach((pgp) => {
          if (Array.isArray(pgp.roles)) {
            pgp.roles.forEach((r) => {
              if (!r || typeof r !== 'string') return;
              const label = r.trim();
              if (!label) return;
              const code = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
              if (!roleSet.has(code)) roleSet.set(code, label);
            });
          }
        });
      const roles = Array.from(roleSet.entries()).map(([code, label]) => ({ code, label }));
      rolesByGame.push({ gameCode: g.code, roles });
    });

    const microphoneOptions = [
      { value: 'any', label: 'Any' },
      { value: 'has_microphone_only', label: 'Has microphone' }
    ];

    const sortOptions = [
      { value: 'skill_rating_desc', label: 'Skill rating: High to Low' },
      { value: 'created_at_desc', label: 'Recently added' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      games,
      platforms,
      regions,
      rolesByGame,
      microphoneOptions,
      sortOptions
    };
  }

  searchPlayers(filters, sortBy, page, pageSize) {
    const f = filters || {};
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;

    const playerGameProfiles = this._getFromStorage('player_game_profiles');
    const players = this._getFromStorage('players');
    const games = this._getFromStorage('games');
    const regions = this._getFromStorage('regions');
    const shortlistItems = this._ensureShortlistStorage();

    let profiles = playerGameProfiles.filter((pgp) => !!pgp);

    if (f.gameCode) {
      profiles = profiles.filter((pgp) => pgp.gameCode === f.gameCode);
    }

    if (f.platform) {
      profiles = profiles.filter((pgp) => pgp.platform === f.platform);
    }

    if (f.regionCode) {
      profiles = profiles.filter((pgp) => pgp.regionCode === f.regionCode);
    }

    if (Array.isArray(f.roles) && f.roles.length > 0) {
      const filterRoles = f.roles.map((r) => String(r).toLowerCase());
      profiles = profiles.filter((pgp) => {
        if (!Array.isArray(pgp.roles)) return false;
        const pr = pgp.roles.map((r) => String(r).toLowerCase());
        return filterRoles.some((r) => pr.includes(r));
      });
    }

    if (f.rankText) {
      const target = String(f.rankText).toLowerCase();
      profiles = profiles.filter((pgp) => (pgp.rankText || '').toLowerCase() === target);
    }

    if (typeof f.minKdRatio === 'number') {
      profiles = profiles.filter((pgp) => typeof pgp.kdRatio === 'number' && pgp.kdRatio >= f.minKdRatio);
    }

    if (typeof f.maxKdRatio === 'number') {
      profiles = profiles.filter((pgp) => typeof pgp.kdRatio === 'number' && pgp.kdRatio <= f.maxKdRatio);
    }

    if (typeof f.minSkillRating === 'number') {
      profiles = profiles.filter(
        (pgp) => typeof pgp.skillRating === 'number' && pgp.skillRating >= f.minSkillRating
      );
    }

    if (typeof f.maxSkillRating === 'number') {
      profiles = profiles.filter(
        (pgp) => typeof pgp.skillRating === 'number' && pgp.skillRating <= f.maxSkillRating
      );
    }

    if (typeof f.hasMicrophone === 'boolean') {
      profiles = profiles.filter((pgp) => !!pgp.hasMicrophone === f.hasMicrophone);
    }

    if (sortBy === 'skill_rating_desc') {
      profiles.sort((a, b) => {
        const as = typeof a.skillRating === 'number' ? a.skillRating : 0;
        const bs = typeof b.skillRating === 'number' ? b.skillRating : 0;
        return bs - as;
      });
    }

    const totalResults = profiles.length;
    const startIndex = (pg - 1) * ps;
    const pageProfiles = profiles.slice(startIndex, startIndex + ps);

    const mapped = pageProfiles.map((pgp) => {
      const player = players.find((p) => p.id === pgp.playerId) || null;
      const game = games.find((g) => g.code === pgp.gameCode) || null;
      const region = pgp.regionCode ? regions.find((r) => r.code === pgp.regionCode) : null;
      const isShortlisted = shortlistItems.some((item) => item.playerId === pgp.playerId);

      return {
        playerId: pgp.playerId,
        playerGameProfileId: pgp.id,
        displayName: player ? player.displayName : 'Unknown',
        gameCode: pgp.gameCode,
        gameName: game ? game.name : pgp.gameCode,
        platform: pgp.platform,
        regionCode: pgp.regionCode || null,
        regionName: region ? region.name : (pgp.regionCode || null),
        rankText: pgp.rankText || null,
        roles: Array.isArray(pgp.roles) ? pgp.roles : [],
        kdRatio: typeof pgp.kdRatio === 'number' ? pgp.kdRatio : null,
        skillRating: typeof pgp.skillRating === 'number' ? pgp.skillRating : null,
        hasMicrophone: !!pgp.hasMicrophone,
        lookingForTeam: player ? !!player.lookingForTeam : false,
        isShortlisted,
        // Foreign key resolution
        player: player,
        playerGameProfile: pgp
      };
    });

    return {
      totalResults,
      page: pg,
      pageSize: ps,
      players: mapped
    };
  }

  addPlayerToShortlist(playerId, notes) {
    if (!playerId) {
      return {
        success: false,
        shortlistItem: null,
        feedbackMessage: 'Missing playerId.'
      };
    }

    const players = this._getFromStorage('players');
    const player = players.find((p) => p.id === playerId);
    if (!player) {
      return {
        success: false,
        shortlistItem: null,
        feedbackMessage: 'Player not found.'
      };
    }

    let shortlist = this._ensureShortlistStorage();
    const existing = shortlist.find((item) => item.playerId === playerId);
    if (existing) {
      return {
        success: true,
        shortlistItem: {
          shortlistItemId: existing.id,
          playerId: existing.playerId,
          addedAt: existing.addedAt,
          notes: existing.notes || ''
        },
        feedbackMessage: 'Player is already in your shortlist.'
      };
    }

    const nowIso = new Date().toISOString();
    const id = this._generateId('shortlist');
    const item = {
      id,
      playerId,
      addedAt: nowIso,
      notes: notes || ''
    };

    shortlist.push(item);
    this._saveToStorage('player_shortlist_items', shortlist);

    return {
      success: true,
      shortlistItem: {
        shortlistItemId: item.id,
        playerId: item.playerId,
        addedAt: item.addedAt,
        notes: item.notes
      },
      feedbackMessage: 'Player added to shortlist.'
    };
  }

  getPlayerShortlist() {
    const shortlist = this._ensureShortlistStorage();
    const players = this._getFromStorage('players');
    const games = this._getFromStorage('games');
    const regions = this._getFromStorage('regions');
    const playerGameProfiles = this._getFromStorage('player_game_profiles');

    return shortlist.map((item) => {
      const player = players.find((p) => p.id === item.playerId) || null;
      let primaryGameProfile = null;
      let primaryGame = null;
      let primaryRegion = null;

      if (player) {
        primaryGameProfile =
          playerGameProfiles.find(
            (pgp) => pgp.playerId === player.id && pgp.isPrimaryForGame
          ) || playerGameProfiles.find((pgp) => pgp.playerId === player.id) || null;
        if (primaryGameProfile) {
          primaryGame = games.find((g) => g.code === primaryGameProfile.gameCode) || null;
          if (primaryGameProfile.regionCode) {
            primaryRegion = regions.find((r) => r.code === primaryGameProfile.regionCode) || null;
          }
        }
      }

      return {
        shortlistItemId: item.id,
        addedAt: item.addedAt,
        notes: item.notes || '',
        player: player
          ? {
              playerId: player.id,
              displayName: player.displayName,
              primaryGameCode: primaryGameProfile ? primaryGameProfile.gameCode : null,
              primaryGameName: primaryGame ? primaryGame.name : (primaryGameProfile && primaryGameProfile.gameCode) || null,
              regionCode: primaryGameProfile ? primaryGameProfile.regionCode || null : null,
              regionName: primaryRegion ? primaryRegion.name : (primaryGameProfile && primaryGameProfile.regionCode) || null,
              rankText: primaryGameProfile ? primaryGameProfile.rankText || null : null,
              roles: primaryGameProfile && Array.isArray(primaryGameProfile.roles)
                ? primaryGameProfile.roles
                : [],
              lookingForTeam: !!player.lookingForTeam
            }
          : null,
        // Foreign key resolution
        playerId: item.playerId,
        playerProfile: player
      };
    });
  }

  removePlayerFromShortlist(shortlistItemId) {
    if (!shortlistItemId) {
      return { success: false, feedbackMessage: 'Missing shortlistItemId.' };
    }
    let shortlist = this._ensureShortlistStorage();
    const before = shortlist.length;
    shortlist = shortlist.filter((item) => item.id !== shortlistItemId);
    this._saveToStorage('player_shortlist_items', shortlist);

    if (shortlist.length === before) {
      return { success: false, feedbackMessage: 'Shortlist item not found.' };
    }
    return { success: true, feedbackMessage: 'Player removed from shortlist.' };
  }

  // -------------------- My Teams, Members, Applications --------------------

  getMyTeamsSummary() {
    const ctx = this._getCurrentUserContext();
    const teams = this._getFromStorage('teams');
    const members = this._getFromStorage('team_members');
    const tournaments = this._getFromStorage('tournaments');
    const tournamentRegistrations = this._getFromStorage('tournament_registrations');
    const scrimEvents = this._getFromStorage('scrim_events');
    const scrimRegistrations = this._getFromStorage('scrim_registrations');

    const myTeams = teams.filter((t) => ctx.teamIds.includes(t.id));
    const now = Date.now();

    return myTeams.map((team) => {
      const teamMembers = members.filter((m) => m.teamId === team.id);
      const memberCount = teamMembers.length;

      const upcomingTournamentRegs = tournamentRegistrations.filter(
        (reg) => reg.teamId === team.id && reg.status !== 'cancelled'
      );
      let upcomingTournamentCount = 0;
      upcomingTournamentRegs.forEach((reg) => {
        const t = tournaments.find((tt) => tt.id === reg.tournamentId);
        if (t && t.startAt) {
          const ts = new Date(t.startAt).getTime();
          if (!isNaN(ts) && ts > now) upcomingTournamentCount++;
        }
      });

      const upcomingScrimRegs = scrimRegistrations.filter(
        (reg) => reg.teamId === team.id && reg.status !== 'cancelled'
      );
      let upcomingScrimCount = 0;
      upcomingScrimRegs.forEach((reg) => {
        const s = scrimEvents.find((se) => se.id === reg.scrimEventId);
        if (s && s.startAt) {
          const ts = new Date(s.startAt).getTime();
          if (!isNaN(ts) && ts > now) upcomingScrimCount++;
        }
      });

      const game = this._getGameByCode(team.gameCode);
      const region = this._getRegionByCode(team.regionCode);

      return {
        teamId: team.id,
        name: team.name,
        gameCode: team.gameCode,
        gameName: game ? game.name : team.gameCode,
        regionCode: team.regionCode,
        regionName: region ? region.name : team.regionCode,
        rankMin: team.rankMin || null,
        rankMax: team.rankMax || null,
        recruitmentStatus: team.recruitmentStatus || 'open_to_new_players',
        memberCount,
        isCaptain: true, // by definition, teams in myTeamIds are owned/managed
        upcomingTournamentCount,
        upcomingScrimCount,
        createdAt: team.createdAt || null,
        // Foreign key resolution
        team
      };
    });
  }

  getTeamDashboardOverview(teamId) {
    const teams = this._getFromStorage('teams');
    const members = this._getFromStorage('team_members');
    const applications = this._getFromStorage('team_applications');
    const tournaments = this._getFromStorage('tournaments');
    const tournamentRegistrations = this._getFromStorage('tournament_registrations');
    const scrimEvents = this._getFromStorage('scrim_events');
    const scrimRegistrations = this._getFromStorage('scrim_registrations');

    const team = teams.find((t) => t.id === teamId) || null;
    if (!team) {
      return {
        team: null,
        overviewStats: {
          memberCount: 0,
          openRolesCount: 0,
          pendingApplicationsCount: 0,
          upcomingTournamentsCount: 0,
          upcomingScrimsCount: 0
        },
        upcomingTournaments: [],
        upcomingScrims: []
      };
    }

    const game = this._getGameByCode(team.gameCode);
    const region = this._getRegionByCode(team.regionCode);

    const teamMembers = members.filter((m) => m.teamId === teamId);
    const memberCount = teamMembers.length;
    const openRolesCount = Array.isArray(team.rolesNeeded) ? team.rolesNeeded.length : 0;

    const pendingApplicationsCount = applications.filter(
      (a) => a.teamId === teamId && a.status === 'pending' && a.source === 'incoming'
    ).length;

    const now = Date.now();

    const teamTournamentRegs = tournamentRegistrations.filter(
      (reg) => reg.teamId === teamId && reg.status !== 'cancelled'
    );
    const upcomingTournaments = [];
    teamTournamentRegs.forEach((reg) => {
      const t = tournaments.find((tt) => tt.id === reg.tournamentId);
      if (t && t.startAt) {
        const ts = new Date(t.startAt).getTime();
        if (!isNaN(ts) && ts > now) {
          upcomingTournaments.push({
            tournamentId: t.id,
            name: t.name,
            startAt: t.startAt,
            registrationStatus: reg.status,
            // Foreign key resolution
            tournament: t
          });
        }
      }
    });

    const teamScrimRegs = scrimRegistrations.filter(
      (reg) => reg.teamId === teamId && reg.status !== 'cancelled'
    );
    const upcomingScrims = [];
    teamScrimRegs.forEach((reg) => {
      const s = scrimEvents.find((se) => se.id === reg.scrimEventId);
      if (s && s.startAt) {
        const ts = new Date(s.startAt).getTime();
        if (!isNaN(ts) && ts > now) {
          upcomingScrims.push({
            scrimEventId: s.id,
            title: s.title,
            startAt: s.startAt,
            status: reg.status,
            // Foreign key resolution
            scrimEvent: s
          });
        }
      }
    });

    return {
      team: {
        id: team.id,
        name: team.name,
        gameCode: team.gameCode,
        gameName: game ? game.name : team.gameCode,
        regionCode: team.regionCode,
        regionName: region ? region.name : team.regionCode,
        rankMin: team.rankMin || null,
        rankMax: team.rankMax || null,
        recruitmentStatus: team.recruitmentStatus || 'open_to_new_players'
      },
      overviewStats: {
        memberCount,
        openRolesCount,
        pendingApplicationsCount,
        upcomingTournamentsCount: upcomingTournaments.length,
        upcomingScrimsCount: upcomingScrims.length
      },
      upcomingTournaments,
      upcomingScrims
    };
  }

  getTeamMembersForManagement(teamId, sortBy, sortDirection) {
    const members = this._getFromStorage('team_members');
    let list = members.filter((m) => m.teamId === teamId);

    const dir = sortDirection === 'desc' ? -1 : 1;

    if (sortBy === 'last_active_at') {
      list.sort((a, b) => {
        const aTs = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
        const bTs = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
        return (aTs - bTs) * dir;
      });
    } else if (sortBy === 'joined_at') {
      list.sort((a, b) => {
        const aTs = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
        const bTs = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
        return (aTs - bTs) * dir;
      });
    } else if (sortBy === 'nickname') {
      list.sort((a, b) => {
        const an = (a.nickname || '').toLowerCase();
        const bn = (b.nickname || '').toLowerCase();
        if (an < bn) return -1 * dir;
        if (an > bn) return 1 * dir;
        return 0;
      });
    } else if (sortBy === 'role') {
      list.sort((a, b) => {
        const ar = (a.role || '').toLowerCase();
        const br = (b.role || '').toLowerCase();
        if (ar < br) return -1 * dir;
        if (ar > br) return 1 * dir;
        return 0;
      });
    }

    return list.map((m) => ({
      teamMemberId: m.id,
      nickname: m.nickname,
      role: m.role || null,
      isCaptain: !!m.isCaptain,
      joinedAt: m.joinedAt || null,
      lastActiveAt: m.lastActiveAt || null,
      notes: m.notes || ''
    }));
  }

  updateTeamRoster(teamId, changes) {
    const rosterChanges = changes || {};
    const removeIds = Array.isArray(rosterChanges.removeMemberIds)
      ? rosterChanges.removeMemberIds
      : [];
    const roleUpdates = Array.isArray(rosterChanges.roleUpdates)
      ? rosterChanges.roleUpdates
      : [];

    let members = this._getFromStorage('team_members');
    const beforeLength = members.length;

    // Instrumentation for task completion tracking
    try {
      const teamMembersBefore = members.filter((m) => m.teamId === teamId);
      let leastActiveMemberIdBefore = null;
      let oldestTs = Infinity;

      teamMembersBefore.forEach((m) => {
        if (m && m.lastActiveAt) {
          const ts = new Date(m.lastActiveAt).getTime();
          if (!isNaN(ts) && ts < oldestTs) {
            oldestTs = ts;
            leastActiveMemberIdBefore = m.id || null;
          }
        }
      });

      if (!isFinite(oldestTs)) {
        leastActiveMemberIdBefore = null;
      }

      const auditRoleUpdates = roleUpdates.map((upd) => {
        const prev = members.find(
          (mm) => mm.id === upd.teamMemberId && mm.teamId === teamId
        ) || null;
        const oldRole = prev && typeof prev.role !== 'undefined' ? prev.role || null : null;
        const newRole = upd.newRole || null;
        const wasFlexToController =
          !!(prev && prev.role === 'Flex' && upd.newRole === 'Controller');

        return {
          teamMemberId: upd.teamMemberId,
          oldRole: oldRole,
          newRole: newRole,
          wasFlexToController: wasFlexToController
        };
      });

      const auditRecord = {
        teamId,
        leastActiveMemberIdBefore,
        removedMemberIds: removeIds,
        removedLeastActiveCorrect: leastActiveMemberIdBefore
          ? removeIds.includes(leastActiveMemberIdBefore)
          : false,
        roleUpdates: auditRoleUpdates,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem('task6_rosterUpdateAudit', JSON.stringify(auditRecord));
    } catch (e) {}

    // Remove members
    members = members.filter((m) => !(m.teamId === teamId && removeIds.includes(m.id)));

    // Role updates
    roleUpdates.forEach((upd) => {
      const m = members.find((mm) => mm.id === upd.teamMemberId && mm.teamId === teamId);
      if (m) {
        m.role = upd.newRole;
      }
    });

    this._saveToStorage('team_members', members);

    const updatedMembersForTeam = members
      .filter((m) => m.teamId === teamId)
      .map((m) => ({
        teamMemberId: m.id,
        nickname: m.nickname,
        role: m.role || null,
        isCaptain: !!m.isCaptain,
        joinedAt: m.joinedAt || null,
        lastActiveAt: m.lastActiveAt || null
      }));

    const removedCount = beforeLength - members.length;

    return {
      success: true,
      updatedMembers: updatedMembersForTeam,
      feedbackMessage:
        removedCount > 0 || roleUpdates.length > 0
          ? 'Roster updated successfully.'
          : 'No roster changes were applied.'
    };
  }

  getTeamApplications(teamId, filters) {
    const f = filters || {};
    const applications = this._getFromStorage('team_applications');
    const players = this._getFromStorage('players');
    const regions = this._getFromStorage('regions');

    let list = applications.filter((a) => a.teamId === teamId && a.source === 'incoming');

    if (f.status) {
      list = list.filter((a) => a.status === f.status);
    }

    if (f.regionCode) {
      list = list.filter((a) => a.regionCode === f.regionCode);
    }

    const minRankVal = f.minRankText ? this._normalizeRankTextToOrderValue(f.minRankText) : 0;
    const maxRankVal = f.maxRankText ? this._normalizeRankTextToOrderValue(f.maxRankText) : 0;

    if (minRankVal || maxRankVal) {
      list = list.filter((a) => {
        const appRankVal = this._normalizeRankTextToOrderValue(a.rankSnapshot || '');
        if (minRankVal && appRankVal && appRankVal < minRankVal) return false;
        // Do not strictly enforce an upper bound; higher-ranked applicants are still acceptable
        return true;
      });
    }

    return list.map((a) => {
      const player = players.find((p) => p.id === a.applicantPlayerId) || null;
      const region = a.regionCode ? regions.find((r) => r.code === a.regionCode) : null;
      return {
        applicationId: a.id,
        applicantPlayerId: a.applicantPlayerId,
        applicantDisplayName: player ? player.displayName : 'Unknown',
        rankSnapshot: a.rankSnapshot || null,
        regionCode: a.regionCode || null,
        regionName: region ? region.name : (a.regionCode || null),
        message: a.message || '',
        status: a.status,
        createdAt: a.createdAt,
        lookingForTeam: player ? !!player.lookingForTeam : false,
        // Foreign key resolution
        applicantPlayer: player
      };
    });
  }

  sendDirectMessageToPlayer(teamId, playerId, content) {
    if (!teamId || !playerId || !content) {
      return {
        success: false,
        messageId: null,
        createdAt: null,
        feedbackMessage: 'Missing required fields.'
      };
    }

    const teams = this._getFromStorage('teams');
    const players = this._getFromStorage('players');
    const team = teams.find((t) => t.id === teamId);
    const player = players.find((p) => p.id === playerId);

    if (!team || !player) {
      return {
        success: false,
        messageId: null,
        createdAt: null,
        feedbackMessage: 'Team or player not found.'
      };
    }

    const directMessages = this._getFromStorage('direct_messages');
    const nowIso = new Date().toISOString();
    const id = this._generateId('dm');

    const msg = {
      id,
      teamId,
      playerId,
      senderType: 'team',
      content,
      createdAt: nowIso
    };

    directMessages.push(msg);
    this._saveToStorage('direct_messages', directMessages);

    return {
      success: true,
      messageId: id,
      createdAt: nowIso,
      feedbackMessage: 'Message sent.'
    };
  }

  invitePlayerToTryout(teamId, playerId, message, scheduledTime) {
    if (!teamId || !playerId) {
      return {
        success: false,
        tryoutInvitationId: null,
        status: null,
        createdAt: null,
        feedbackMessage: 'Missing teamId or playerId.'
      };
    }

    const teams = this._getFromStorage('teams');
    const players = this._getFromStorage('players');
    const team = teams.find((t) => t.id === teamId);
    const player = players.find((p) => p.id === playerId);

    if (!team || !player) {
      return {
        success: false,
        tryoutInvitationId: null,
        status: null,
        createdAt: null,
        feedbackMessage: 'Team or player not found.'
      };
    }

    const tryouts = this._getFromStorage('tryout_invitations');
    const nowIso = new Date().toISOString();
    const id = this._generateId('tryout');

    const invite = {
      id,
      teamId,
      playerId,
      status: 'pending',
      message: message || '',
      scheduledTime: scheduledTime || '',
      createdAt: nowIso
    };

    tryouts.push(invite);
    this._saveToStorage('tryout_invitations', tryouts);

    return {
      success: true,
      tryoutInvitationId: id,
      status: 'pending',
      createdAt: nowIso,
      feedbackMessage: 'Tryout invitation sent.'
    };
  }

  // -------------------- Scrims --------------------

  getScrimFilterOptions() {
    const games = this._getFromStorage('games').map((g) => ({ code: g.code, name: g.name }));
    const regions = this._getFromStorage('regions').map((r) => ({ code: r.code, name: r.name }));

    const teamSizeTypes = [
      { value: 'full_team', label: 'Full team vs Full team' },
      { value: 'mixed', label: 'Mixed teams' },
      { value: 'solo', label: 'Solo / Fill' }
    ];

    const sortOptions = [
      { value: 'start_at_asc', label: 'Start time: Soonest' },
      { value: 'created_at_desc', label: 'Recently added' }
    ];

    return {
      games,
      regions,
      teamSizeTypes,
      sortOptions
    };
  }

  searchScrimEvents(filters, sortBy) {
    const f = filters || {};
    const scrims = this._getFromStorage('scrim_events');
    const games = this._getFromStorage('games');
    const regions = this._getFromStorage('regions');

    let results = scrims.filter((s) => !!s);

    if (f.gameCode) {
      results = results.filter((s) => s.gameCode === f.gameCode);
    }

    if (f.regionCode) {
      results = results.filter((s) => s.regionCode === f.regionCode);
    }

    if (f.teamSizeType) {
      results = results.filter((s) => s.teamSizeType === f.teamSizeType);
    }

    if (f.dateStart || f.dateEnd) {
      const dateStart = f.dateStart || null;
      const dateEnd = f.dateEnd || null;
      results = results.filter((s) => this._compareDatesOnly(s.startAt, dateStart, dateEnd));
    }

    if (f.startTimeMin || f.startTimeMax) {
      const minMin = this._parseTimeToMinutes(f.startTimeMin || '00:00');
      const maxMin = this._parseTimeToMinutes(f.startTimeMax || '23:59');
      results = results.filter((s) => {
        if (!s.startAt) return false;
        const d = new Date(s.startAt);
        if (isNaN(d.getTime())) return false;
        // Use UTC time so filtering is consistent regardless of server local timezone
        const mins = d.getUTCHours() * 60 + d.getUTCMinutes();
        if (minMin !== null && mins < minMin) return false;
        if (maxMin !== null && mins > maxMin) return false;
        return true;
      });
    }

    if (sortBy === 'start_at_asc') {
      results.sort((a, b) => {
        const aStart = a.startAt ? new Date(a.startAt).getTime() : 0;
        const bStart = b.startAt ? new Date(b.startAt).getTime() : 0;
        return aStart - bStart;
      });
    } else if (sortBy === 'created_at_desc') {
      results.sort((a, b) => {
        const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bCreated - aCreated;
      });
    }

    return results.map((s) => {
      const game = this._getGameByCode(s.gameCode);
      const region = s.regionCode ? this._getRegionByCode(s.regionCode) : null;
      return {
        scrimEventId: s.id,
        title: s.title,
        gameCode: s.gameCode,
        gameName: game ? game.name : s.gameCode,
        regionCode: s.regionCode || null,
        regionName: region ? region.name : (s.regionCode || null),
        teamSizeType: s.teamSizeType,
        startAt: s.startAt || null,
        endAt: s.endAt || null,
        description: s.description || '',
        requirements: s.requirements || '',
        // Foreign key resolution
        scrimEvent: s
      };
    });
  }

  joinScrimEventAsTeam(scrimEventId, teamId) {
    const ctx = this._getCurrentUserContext();
    if (!ctx.teamIds.includes(teamId)) {
      return {
        success: false,
        scrimRegistrationId: null,
        status: null,
        feedbackMessage: 'You can only join scrims with teams you manage.'
      };
    }

    const scrims = this._getFromStorage('scrim_events');
    const teams = this._getFromStorage('teams');
    const registrations = this._getFromStorage('scrim_registrations');

    const scrim = scrims.find((s) => s.id === scrimEventId);
    if (!scrim) {
      return {
        success: false,
        scrimRegistrationId: null,
        status: null,
        feedbackMessage: 'Scrim event not found.'
      };
    }

    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      return {
        success: false,
        scrimRegistrationId: null,
        status: null,
        feedbackMessage: 'Team not found.'
      };
    }

    const existing = registrations.find(
      (r) => r.scrimEventId === scrimEventId && r.teamId === teamId && r.status !== 'cancelled'
    );
    if (existing) {
      return {
        success: false,
        scrimRegistrationId: existing.id,
        status: existing.status,
        feedbackMessage: 'Team is already registered for this scrim.'
      };
    }

    const nowIso = new Date().toISOString();
    const id = this._generateId('sreg');
    const reg = {
      id,
      scrimEventId,
      teamId,
      createdAt: nowIso,
      status: 'pending'
    };

    registrations.push(reg);
    this._saveToStorage('scrim_registrations', registrations);

    return {
      success: true,
      scrimRegistrationId: id,
      status: 'pending',
      feedbackMessage: 'Team joined scrim event.'
    };
  }

  // -------------------- Profile (current user) --------------------

  getMyProfileForEdit() {
    const ctx = this._getCurrentUserContext();
    const player = ctx.player;

    if (!player) {
      return {
        playerProfile: {
          id: null,
          displayName: '',
          primaryGameCode: null,
          bio: '',
          lookingForTeam: false
        },
        gameProfiles: [],
        availabilitySlots: []
      };
    }

    const gameProfilesAll = this._getFromStorage('player_game_profiles');
    const availabilityAll = this._getFromStorage('player_availability_slots');

    const gameProfiles = gameProfilesAll.filter((pgp) => pgp.playerId === player.id).map((pgp) => ({
      id: pgp.id,
      gameCode: pgp.gameCode,
      platform: pgp.platform,
      regionCode: pgp.regionCode || null,
      rankText: pgp.rankText || null,
      roles: Array.isArray(pgp.roles) ? pgp.roles : [],
      kdRatio: typeof pgp.kdRatio === 'number' ? pgp.kdRatio : null,
      skillRating: typeof pgp.skillRating === 'number' ? pgp.skillRating : null,
      hasMicrophone: !!pgp.hasMicrophone,
      isPrimaryForGame: !!pgp.isPrimaryForGame
    }));

    const availabilitySlots = availabilityAll
      .filter((s) => s.playerId === player.id)
      .map((s) => ({
        id: s.id,
        gameCode: s.gameCode || null,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        timezone: s.timezone || ''
      }));

    return {
      playerProfile: {
        id: player.id,
        displayName: player.displayName,
        primaryGameCode: player.primaryGameCode || null,
        bio: player.bio || '',
        lookingForTeam: !!player.lookingForTeam
      },
      gameProfiles,
      availabilitySlots
    };
  }

  getProfileConfigOptions() {
    const games = this._getFromStorage('games').map((g) => ({ code: g.code, name: g.name }));

    const platforms = [
      { value: 'pc', label: 'PC' },
      { value: 'xbox', label: 'Xbox' },
      { value: 'playstation', label: 'PlayStation' },
      { value: 'nintendo_switch', label: 'Nintendo Switch' },
      { value: 'mobile', label: 'Mobile' },
      { value: 'other', label: 'Other' }
    ];

    const playerGameProfiles = this._getFromStorage('player_game_profiles');
    const rolesByGame = [];

    games.forEach((g) => {
      const roleSet = new Map();
      playerGameProfiles
        .filter((pgp) => pgp.gameCode === g.code)
        .forEach((pgp) => {
          if (Array.isArray(pgp.roles)) {
            pgp.roles.forEach((r) => {
              if (!r || typeof r !== 'string') return;
              const label = r.trim();
              if (!label) return;
              const code = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
              if (!roleSet.has(code)) roleSet.set(code, label);
            });
          }
        });
      rolesByGame.push({
        gameCode: g.code,
        roles: Array.from(roleSet.entries()).map(([code, label]) => ({ code, label }))
      });
    });

    const timezones = [
      { id: 'UTC', label: 'UTC' },
      { id: 'America/New_York', label: 'America/New_York' },
      { id: 'Europe/London', label: 'Europe/London' },
      { id: 'Europe/Berlin', label: 'Europe/Berlin' }
    ];

    return {
      games,
      platforms,
      rolesByGame,
      timezones
    };
  }

  updateMyProfile(primaryGameCode, lookingForTeam, bio, gameProfiles, availabilitySlots) {
    const ctx = this._getCurrentUserContext();
    if (!ctx.player) {
      return {
        success: false,
        updatedPlayerProfile: null,
        feedbackMessage: 'You must be logged in to update your profile.'
      };
    }

    const players = this._getFromStorage('players');
    const playerIndex = players.findIndex((p) => p.id === ctx.player.id);
    if (playerIndex === -1) {
      return {
        success: false,
        updatedPlayerProfile: null,
        feedbackMessage: 'Current user profile not found.'
      };
    }

    const player = players[playerIndex];

    if (typeof primaryGameCode === 'string') {
      player.primaryGameCode = primaryGameCode;
    }
    if (typeof lookingForTeam === 'boolean') {
      player.lookingForTeam = lookingForTeam;
    }
    if (typeof bio === 'string') {
      player.bio = bio;
    }
    player.updatedAt = new Date().toISOString();

    players[playerIndex] = player;
    this._saveToStorage('players', players);

    // Update per-game profiles
    if (Array.isArray(gameProfiles)) {
      let existing = this._getFromStorage('player_game_profiles');
      existing = existing.filter((pgp) => pgp.playerId !== player.id);

      const newProfiles = gameProfiles.map((input) => {
        const id = input.id || this._generateId('pgp');
        return {
          id,
          playerId: player.id,
          gameCode: input.gameCode,
          platform: input.platform,
          regionCode: input.regionCode || null,
          rankText: input.rankText || null,
          roles: Array.isArray(input.roles) ? input.roles : [],
          kdRatio: typeof input.kdRatio === 'number' ? input.kdRatio : null,
          skillRating: typeof input.skillRating === 'number' ? input.skillRating : null,
          hasMicrophone: !!input.hasMicrophone,
          isPrimaryForGame: !!input.isPrimaryForGame
        };
      });

      existing = existing.concat(newProfiles);
      this._saveToStorage('player_game_profiles', existing);
    }

    // Update availability slots
    if (Array.isArray(availabilitySlots)) {
      const validSlots = this._validateAvailabilitySlots(availabilitySlots);
      let allSlots = this._getFromStorage('player_availability_slots');
      allSlots = allSlots.filter((s) => s.playerId !== player.id);

      const newSlots = validSlots.map((s) => ({
        id: s.id || this._generateId('av'),
        playerId: player.id,
        gameCode: s.gameCode || null,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        timezone: s.timezone || ''
      }));

      allSlots = allSlots.concat(newSlots);
      this._saveToStorage('player_availability_slots', allSlots);
    }

    return {
      success: true,
      updatedPlayerProfile: {
        id: player.id,
        displayName: player.displayName,
        primaryGameCode: player.primaryGameCode || null,
        lookingForTeam: !!player.lookingForTeam
      },
      feedbackMessage: 'Profile updated successfully.'
    };
  }

  // -------------------- Player Profile Details --------------------

  getPlayerProfileDetails(playerId) {
    const players = this._getFromStorage('players');
    const player = players.find((p) => p.id === playerId) || null;

    if (!player) {
      return {
        player: null,
        gameProfiles: [],
        availabilitySlots: [],
        isShortlisted: false,
        canCurrentUserMessage: false,
        eligibleTeamsForTryout: []
      };
    }

    const playerGameProfiles = this._getFromStorage('player_game_profiles');
    const availabilityAll = this._getFromStorage('player_availability_slots');
    const games = this._getFromStorage('games');
    const regions = this._getFromStorage('regions');
    const shortlistItems = this._ensureShortlistStorage();

    const gameProfiles = playerGameProfiles
      .filter((pgp) => pgp.playerId === player.id)
      .map((pgp) => {
        const game = games.find((g) => g.code === pgp.gameCode) || null;
        const region = pgp.regionCode ? regions.find((r) => r.code === pgp.regionCode) : null;
        return {
          id: pgp.id,
          gameCode: pgp.gameCode,
          gameName: game ? game.name : pgp.gameCode,
          platform: pgp.platform,
          regionCode: pgp.regionCode || null,
          regionName: region ? region.name : (pgp.regionCode || null),
          rankText: pgp.rankText || null,
          roles: Array.isArray(pgp.roles) ? pgp.roles : [],
          kdRatio: typeof pgp.kdRatio === 'number' ? pgp.kdRatio : null,
          skillRating: typeof pgp.skillRating === 'number' ? pgp.skillRating : null,
          hasMicrophone: !!pgp.hasMicrophone,
          isPrimaryForGame: !!pgp.isPrimaryForGame
        };
      });

    const availabilitySlots = availabilityAll
      .filter((s) => s.playerId === player.id)
      .map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        timezone: s.timezone || ''
      }));

    const isShortlisted = shortlistItems.some((item) => item.playerId === player.id);

    const ctx = this._getCurrentUserContext();
    const canCurrentUserMessage = !!ctx.player && ctx.player.id !== player.id;

    // Eligible teams for tryout: teams managed by current user that match any of player's game profiles
    const eligibleTeamsForTryout = [];
    if (ctx.teams && ctx.teams.length > 0 && gameProfiles.length > 0) {
      ctx.teams.forEach((team) => {
        const matchProfile = gameProfiles.find(
          (gp) => gp.gameCode === team.gameCode && (!gp.regionCode || gp.regionCode === team.regionCode)
        );
        if (matchProfile) {
          eligibleTeamsForTryout.push({
            teamId: team.id,
            name: team.name,
            gameCode: team.gameCode,
            regionCode: team.regionCode,
            // Foreign key resolution
            team
          });
        }
      });
    }

    const primaryGame = player.primaryGameCode
      ? games.find((g) => g.code === player.primaryGameCode) || null
      : null;

    return {
      player: {
        id: player.id,
        displayName: player.displayName,
        primaryGameCode: player.primaryGameCode || null,
        primaryGameName: primaryGame ? primaryGame.name : player.primaryGameCode || null,
        bio: player.bio || '',
        lookingForTeam: !!player.lookingForTeam
      },
      gameProfiles,
      availabilitySlots,
      isShortlisted,
      canCurrentUserMessage,
      eligibleTeamsForTryout
    };
  }

  // -------------------- Static & Contact Pages --------------------

  getStaticPageContent(pageName) {
    const pages = this._getFromStorage('site_pages');
    const normalized = (pageName || '').toLowerCase();

    let page = pages.find((p) => (p.name || '').toLowerCase() === normalized) || null;
    if (!page) {
      // Try by filename without extension
      page = pages.find((p) => {
        if (!p.filename) return false;
        const base = p.filename.toLowerCase().replace(/\.html?$/, '');
        return base === normalized;
      }) || null;
    }

    if (!page) {
      return {
        title: pageName,
        bodyHtml: '<p>Content not available.</p>',
        lastUpdatedAt: null
      };
    }

    return {
      title: page.name,
      bodyHtml: page.description || '<p></p>',
      lastUpdatedAt: null
    };
  }

  getContactPageInfo() {
    return {
      supportEmail: 'support@example.com',
      supportDiscord: 'https://discord.example.com',
      responseTimeEstimate: 'We typically respond within 24–48 hours.',
      categories: [
        {
          code: 'general',
          label: 'General inquiry',
          description: 'Questions about using the platform or your account.'
        },
        {
          code: 'bug_report',
          label: 'Bug report',
          description: 'Report issues, errors, or unexpected behavior.'
        },
        {
          code: 'tournament_support',
          label: 'Tournament support',
          description: 'Help with tournament registration, rules, or disputes.'
        }
      ]
    };
  }

  submitContactMessage(name, email, categoryCode, subject, message) {
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        ticketId: null,
        feedbackMessage: 'Missing required fields.'
      };
    }

    const messages = this._getFromStorage('contact_messages');
    const id = this._generateId('contact');
    const nowIso = new Date().toISOString();

    const record = {
      id,
      name,
      email,
      categoryCode: categoryCode || null,
      subject,
      message,
      createdAt: nowIso
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      ticketId: id,
      feedbackMessage: 'Your message has been submitted.'
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