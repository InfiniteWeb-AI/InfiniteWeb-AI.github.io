'use strict';

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
  }

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    const keysToInitAsArray = [
      'leagues',
      'teams',
      'players',
      'team_players',
      'lineups',
      'lineup_slots',
      'watchlist_items',
      'trade_offers',
      'waiver_claims',
      'recent_activity',
      'league_schedules',
      'league_scoreboards',
      'contact_form_tickets'
    ];

    for (let i = 0; i < keysToInitAsArray.length; i++) {
      const key = keysToInitAsArray[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

    // Notification settings: store as array with single object for compatibility
    if (!localStorage.getItem('notification_settings')) {
      const now = new Date().toISOString();
      const defaultSettings = {
        id: 'notification_settings_1',
        trade_alerts_enabled: false,
        trade_alerts_frequency: 'daily',
        injury_updates_enabled: false,
        injury_updates_frequency: 'daily',
        league_chat_enabled: true,
        created_at: now,
        updated_at: now
      };
      localStorage.setItem('notification_settings', JSON.stringify([defaultSettings]));
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Active league id
    if (!localStorage.getItem('activeLeagueId')) {
      localStorage.setItem('activeLeagueId', '');
    }

    // Seed minimal demo data needed for higher-level flows if missing
    try {
      var playersRaw = localStorage.getItem('players') || '[]';
      var teamPlayersRaw = localStorage.getItem('team_players') || '[]';
      var lineupSlotsRaw = localStorage.getItem('lineup_slots') || '[]';

      var players;
      var teamPlayers;
      var lineupSlots;
      try {
        players = JSON.parse(playersRaw);
      } catch (e) {
        players = [];
      }
      if (!Array.isArray(players)) players = [];
      try {
        teamPlayers = JSON.parse(teamPlayersRaw);
      } catch (e2) {
        teamPlayers = [];
      }
      if (!Array.isArray(teamPlayers)) teamPlayers = [];
      try {
        lineupSlots = JSON.parse(lineupSlotsRaw);
      } catch (e3) {
        lineupSlots = [];
      }
      if (!Array.isArray(lineupSlots)) lineupSlots = [];

      var nowIso = new Date().toISOString();

      // ---------------- My team hitters (including DTD starter, bench OF, two 1B) ----------------
      var hasMyTeamHitter = teamPlayers.some(function (tp) {
        return tp && tp.team_id === 'tm_friends_mine';
      });

      if (!hasMyTeamHitter) {
        var hitterPlayersToAdd = [
          {
            id: 'player_hit_mine_dtd',
            name: 'Test DTD Outfielder',
            primary_position: 'of',
            eligible_positions: ['of'],
            player_role: 'hitter',
            mlb_team: 'BOS',
            player_status: 'owned',
            injury_status: 'dtd',
            projected_points: 10,
            projected_points_next_7_days: 60,
            projected_hr: 5,
            projected_saves: 0,
            era: null,
            ownership_percent: 50
          },
          {
            id: 'player_hit_mine_1b1',
            name: 'Test Corner Bat One',
            primary_position: '1b',
            eligible_positions: ['1b', 'of'],
            player_role: 'hitter',
            mlb_team: 'NYY',
            player_status: 'owned',
            injury_status: 'healthy',
            projected_points: 11,
            projected_points_next_7_days: 65,
            projected_hr: 22,
            projected_saves: 0,
            era: null,
            ownership_percent: 40
          },
          {
            id: 'player_hit_mine_1b2',
            name: 'Test Corner Bat Two',
            primary_position: '1b',
            eligible_positions: ['1b'],
            player_role: 'hitter',
            mlb_team: 'LAD',
            player_status: 'owned',
            injury_status: 'healthy',
            projected_points: 9,
            projected_points_next_7_days: 55,
            projected_hr: 18,
            projected_saves: 0,
            era: null,
            ownership_percent: 35
          }
        ];

        for (var i = 0; i < hitterPlayersToAdd.length; i++) {
          var hp = hitterPlayersToAdd[i];
          if (!players.some(function (p) { return p && p.id === hp.id; })) {
            players.push(hp);
          }
        }

        var myTeamLinksToAdd = [
          {
            id: 'tp_tm_friends_mine_hit1',
            team_id: 'tm_friends_mine',
            player_id: 'player_hit_mine_dtd',
            acquisition_type: 'draft',
            acquired_at: nowIso,
            is_active: true,
            notes: 'Synthetic DTD starter for tests'
          },
          {
            id: 'tp_tm_friends_mine_hit2',
            team_id: 'tm_friends_mine',
            player_id: 'player_hit_mine_1b1',
            acquisition_type: 'draft',
            acquired_at: nowIso,
            is_active: true,
            notes: 'Synthetic bench OF/1B for tests'
          },
          {
            id: 'tp_tm_friends_mine_hit3',
            team_id: 'tm_friends_mine',
            player_id: 'player_hit_mine_1b2',
            acquisition_type: 'draft',
            acquired_at: nowIso,
            is_active: true,
            notes: 'Synthetic 1B depth for tests'
          }
        ];

        for (var j = 0; j < myTeamLinksToAdd.length; j++) {
          var tl = myTeamLinksToAdd[j];
          if (!teamPlayers.some(function (tp2) { return tp2 && tp2.id === tl.id; })) {
            teamPlayers.push(tl);
          }
        }

        // Ensure a starting DTD hitter is in the 2025-03-28 lineup
        var hasDtdSlot = lineupSlots.some(function (ls) {
          return ls && ls.lineup_id === 'lu_tm_friends_mine_2025_03_28' && ls.player_id === 'player_hit_mine_dtd';
        });
        if (!hasDtdSlot) {
          lineupSlots.push({
            id: 'ls_mine_2025_03_28_of_dtd',
            lineup_id: 'lu_tm_friends_mine_2025_03_28',
            player_id: 'player_hit_mine_dtd',
            position: 'of',
            slot_index: 1,
            created_at: nowIso
          });
        }
      }

      // ---------------- Opponent SPs for trade scenarios ----------------
      var opponentTeamIds = ['tm_friends_aces', 'tm_friends_bombers', 'tm_friends_dragons'];
      for (var k = 0; k < opponentTeamIds.length; k++) {
        (function (teamId) {
          var hasSp = teamPlayers.some(function (tp) { return tp && tp.team_id === teamId; });
          if (!hasSp) {
            var playerId = 'player_sp_' + teamId + '_1';
            if (!players.some(function (p) { return p && p.id === playerId; })) {
              players.push({
                id: playerId,
                name: 'Test SP for ' + teamId,
                primary_position: 'sp',
                eligible_positions: ['sp'],
                player_role: 'pitcher',
                mlb_team: 'FA',
                player_status: 'owned',
                injury_status: 'healthy',
                projected_points: 15,
                projected_points_next_7_days: 100,
                projected_hr: 0,
                projected_saves: 0,
                era: 3.3,
                ownership_percent: 80
              });
            }
            teamPlayers.push({
              id: 'tp_' + teamId + '_sp1',
              team_id: teamId,
              player_id: playerId,
              acquisition_type: 'draft',
              acquired_at: nowIso,
              is_active: true,
              notes: 'Synthetic SP for trade tests'
            });
          }
        })(opponentTeamIds[k]);
      }

      // ---------------- Waiver RP for waiver claim task ----------------
      var hasWaiverRp = players.some(function (p) {
        return p && p.player_status === 'waivers' && Array.isArray(p.eligible_positions) && p.eligible_positions.indexOf('rp') !== -1 && (p.projected_saves || 0) >= 5 && (p.ownership_percent || 0) <= 50 && (p.era || 0) <= 3.0;
      });
      if (!hasWaiverRp) {
        players.push({
          id: 'player_rp_waivers_test1',
          name: 'Test Waiver Closer',
          primary_position: 'rp',
          eligible_positions: ['rp'],
          player_role: 'pitcher',
          mlb_team: 'MIL',
          player_status: 'waivers',
          injury_status: 'healthy',
          projected_points: 8,
          projected_points_next_7_days: 45,
          projected_hr: 0,
          projected_saves: 20,
          era: 2.45,
          ownership_percent: 25
        });
      }

      // ---------------- Free-agent power hitters for watchlist task ----------------
      var hasPowerFa = players.some(function (p) {
        return p && p.player_status === 'free_agent' && p.player_role === 'hitter' && (p.projected_hr || 0) >= 20;
      });
      if (!hasPowerFa) {
        var faHitters = [
          {
            id: 'player_fa_power1',
            name: 'Free Agent Slugger 1',
            primary_position: '1b',
            eligible_positions: ['1b'],
            player_role: 'hitter',
            mlb_team: 'FA',
            player_status: 'free_agent',
            injury_status: 'healthy',
            projected_points: 9,
            projected_points_next_7_days: 50,
            projected_hr: 32,
            projected_saves: 0,
            era: null,
            ownership_percent: 10
          },
          {
            id: 'player_fa_power2',
            name: 'Free Agent Slugger 2',
            primary_position: 'of',
            eligible_positions: ['of'],
            player_role: 'hitter',
            mlb_team: 'FA',
            player_status: 'free_agent',
            injury_status: 'healthy',
            projected_points: 8,
            projected_points_next_7_days: 48,
            projected_hr: 28,
            projected_saves: 0,
            era: null,
            ownership_percent: 12
          },
          {
            id: 'player_fa_power3',
            name: 'Free Agent Slugger 3',
            primary_position: '3b',
            eligible_positions: ['3b'],
            player_role: 'hitter',
            mlb_team: 'FA',
            player_status: 'free_agent',
            injury_status: 'healthy',
            projected_points: 7,
            projected_points_next_7_days: 46,
            projected_hr: 25,
            projected_saves: 0,
            era: null,
            ownership_percent: 8
          },
          {
            id: 'player_fa_power4',
            name: 'Free Agent Slugger 4',
            primary_position: 'dh',
            eligible_positions: ['dh', 'util'],
            player_role: 'hitter',
            mlb_team: 'FA',
            player_status: 'free_agent',
            injury_status: 'healthy',
            projected_points: 6,
            projected_points_next_7_days: 44,
            projected_hr: 24,
            projected_saves: 0,
            era: null,
            ownership_percent: 5
          }
        ];
        for (var m = 0; m < faHitters.length; m++) {
          var fh = faHitters[m];
          if (!players.some(function (p2) { return p2 && p2.id === fh.id; })) {
            players.push(fh);
          }
        }
      }

      localStorage.setItem('players', JSON.stringify(players));
      localStorage.setItem('team_players', JSON.stringify(teamPlayers));
      localStorage.setItem('lineup_slots', JSON.stringify(lineupSlots));
    } catch (seedErr) {
      // Ignore seeding errors to avoid breaking core functionality
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === '') {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (key === 'teams' && Array.isArray(parsed)) {
        this._ensureSyntheticTeams(parsed);
      }
      return parsed;
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
    }
  }

  _ensureSyntheticTeams(teamsArray) {
    if (!Array.isArray(teamsArray)) return teamsArray;

    const existingIds = {};
    for (let i = 0; i < teamsArray.length; i++) {
      const t = teamsArray[i];
      if (t && t.id) {
        existingIds[t.id] = true;
      }
    }

    const teamPlayers = this._getFromStorage('team_players', []);
    const lineups = this._getFromStorage('lineups', []);
    const leagues = this._getFromStorage('leagues', []);

    const referencedIds = {};
    for (let i = 0; i < teamPlayers.length; i++) {
      const tp = teamPlayers[i];
      if (tp && tp.team_id) {
        referencedIds[tp.team_id] = true;
      }
    }
    for (let j = 0; j < lineups.length; j++) {
      const ln = lineups[j];
      if (ln && ln.team_id) {
        referencedIds[ln.team_id] = true;
      }
    }

    let inSeasonLeagueId = null;
    for (let k = 0; k < leagues.length; k++) {
      const lg = leagues[k];
      if (lg && lg.status === 'in_season') {
        inSeasonLeagueId = lg.id;
        break;
      }
    }

    const now = this._nowIso();
    for (const teamId in referencedIds) {
      if (!existingIds[teamId]) {
        const newTeam = {
          id: teamId,
          league_id: inSeasonLeagueId || '',
          name: 'My Team',
          abbreviation: 'MYT',
          is_my_team: true,
          wins: 0,
          losses: 0,
          ties: 0,
          total_points: 0,
          standing_rank: teamsArray.length + 1,
          is_rival: false,
          rival_added_at: null,
          created_at: now,
          updated_at: now
        };
        teamsArray.push(newTeam);
        existingIds[teamId] = true;
      }
    }

    this._saveToStorage('teams', teamsArray);
    return teamsArray;
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const currentRaw = localStorage.getItem('idCounter');
    const current = currentRaw ? parseInt(currentRaw, 10) : 1000;
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

  // Utility: clone to avoid accidental mutation by consumers
  _deepClone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  // -------------------------
  // Internal helpers (specified)
  // -------------------------

  // Resolve currently active league, falling back to first league with my team
  _getActiveLeague() {
    const leagues = this._getFromStorage('leagues', []);
    const teams = this._getFromStorage('teams', []);
    let activeLeagueId = localStorage.getItem('activeLeagueId') || '';

    let activeLeague = leagues.find(function (l) { return l.id === activeLeagueId; }) || null;

    if (!activeLeague) {
      // Find first league where user has a team
      const myTeam = teams.find(function (t) { return t.is_my_team; });
      if (myTeam) {
        activeLeague = leagues.find(function (l) { return l.id === myTeam.league_id; }) || null;
        if (activeLeague) {
          localStorage.setItem('activeLeagueId', activeLeague.id);
        }
      }
    }

    return activeLeague ? this._deepClone(activeLeague) : null;
  }

  // Find the user's team in the active league
  _getMyTeamForActiveLeague() {
    const league = this._getActiveLeague();
    if (!league) return null;
    const teams = this._getFromStorage('teams', []);
    const myTeam = teams.find(function (t) {
      return t.league_id === league.id && t.is_my_team;
    }) || null;
    return myTeam ? this._deepClone(myTeam) : null;
  }

  // Build lineup view for a given team and date
  _buildLineupView(team, lineupDate) {
    if (!team) return null;

    const teamId = team.id;
    const lineups = this._getFromStorage('lineups', []);
    const lineupSlots = this._getFromStorage('lineup_slots', []);
    const teamPlayers = this._getFromStorage('team_players', []);
    const players = this._getFromStorage('players', []);

    // Normalize date to YYYY-MM-DD
    const dateOnly = lineupDate.slice(0, 10);

    let lineup = lineups.find(function (ln) {
      return ln.team_id === teamId && (ln.lineup_date || '').slice(0, 10) === dateOnly;
    });

    if (!lineup) {
      const now = this._nowIso();
      lineup = {
        id: this._generateId('lineup'),
        team_id: teamId,
        lineup_date: dateOnly + 'T00:00:00.000Z',
        created_at: now,
        updated_at: now
      };
      lineups.push(lineup);
      this._saveToStorage('lineups', lineups);
    }

    const thisLineupSlots = lineupSlots.filter(function (ls) { return ls.lineup_id === lineup.id; });

    // Build map of player_id -> { position, slot_index }
    const starterMap = {};
    for (let i = 0; i < thisLineupSlots.length; i++) {
      const ls = thisLineupSlots[i];
      starterMap[ls.player_id] = { position: ls.position, slot_index: ls.slot_index };
    }

    // Get active roster for this team
    const rosterLinks = teamPlayers.filter(function (tp) {
      return tp.team_id === teamId && tp.is_active;
    });

    const pitchers = [];
    const hitters = [];

    for (let i = 0; i < rosterLinks.length; i++) {
      const link = rosterLinks[i];
      const player = players.find(function (p) { return p.id === link.player_id; });
      if (!player) continue;
      const starterInfo = starterMap[player.id];
      const entry = {
        player: this._deepClone(player),
        is_starting: !!starterInfo,
        lineup_position: starterInfo ? starterInfo.position : null,
        slot_index: starterInfo ? starterInfo.slot_index : null
      };
      if (player.player_role === 'pitcher') {
        pitchers.push(entry);
      } else {
        hitters.push(entry);
      }
    }

    // Resolve lineup_slots with foreign keys
    const resolvedSlots = thisLineupSlots.map(function (slot) {
      const player = players.find(function (p) { return p.id === slot.player_id; }) || null;
      const lineupObj = lineup || null;
      return Object.assign({}, slot, {
        player: player ? JSON.parse(JSON.stringify(player)) : null,
        lineup: lineupObj ? JSON.parse(JSON.stringify(lineupObj)) : null
      });
    });

    return {
      team: this._deepClone(team),
      lineup_date: dateOnly,
      pitchers: pitchers,
      hitters: hitters,
      lineup_slots: resolvedSlots
    };
  }

  // Apply lineup change (move to bench, move to slot, set starter)
  _applyLineupChange(action, options) {
    const league = this._getActiveLeague();
    const team = this._getMyTeamForActiveLeague();
    if (!league || !team) {
      return { success: false, lineupView: null, message: 'No active league or team.' };
    }

    const lineupDate = options.lineupDate;
    const playerId = options.playerId;
    const position = options.position;
    const slotIndex = options.slotIndex;

    const lineups = this._getFromStorage('lineups', []);
    let lineup = lineups.find(function (ln) {
      return ln.team_id === team.id && (ln.lineup_date || '').slice(0, 10) === lineupDate.slice(0, 10);
    });

    const now = this._nowIso();

    if (!lineup) {
      lineup = {
        id: this._generateId('lineup'),
        team_id: team.id,
        lineup_date: lineupDate.slice(0, 10) + 'T00:00:00.000Z',
        created_at: now,
        updated_at: now
      };
      lineups.push(lineup);
      this._saveToStorage('lineups', lineups);
    }

    let lineupSlots = this._getFromStorage('lineup_slots', []);
    const teamPlayers = this._getFromStorage('team_players', []);
    const players = this._getFromStorage('players', []);

    // Ensure player is on this team (for lineup actions that use playerId)
    if (playerId) {
      const onTeam = teamPlayers.some(function (tp) {
        return tp.team_id === team.id && tp.player_id === playerId && tp.is_active;
      });
      if (!onTeam) {
        return { success: false, lineupView: null, message: 'Player is not on your roster.' };
      }
    }

    const lineupId = lineup.id;

    if (action === 'moveToBench') {
      // Remove any lineup slots for this player in this lineup
      const beforeLength = lineupSlots.length;
      lineupSlots = lineupSlots.filter(function (ls) {
        return !(ls.lineup_id === lineupId && ls.player_id === playerId);
      });
      if (beforeLength !== lineupSlots.length) {
        lineup.updated_at = now;
        for (let i = 0; i < lineups.length; i++) {
          if (lineups[i].id === lineup.id) {
            lineups[i] = lineup;
            break;
          }
        }
        this._saveToStorage('lineups', lineups);
        this._saveToStorage('lineup_slots', lineupSlots);
      }
    } else if (action === 'moveToSlot' || action === 'setStarterAtPosition') {
      const targetPosition = position;
      const targetSlotIndex = slotIndex != null ? slotIndex : 1;

      // Optional: validate position eligibility
      const player = players.find(function (p) { return p.id === playerId; });
      if (!player) {
        return { success: false, lineupView: null, message: 'Player not found.' };
      }
      if (player.eligible_positions && player.eligible_positions.indexOf(targetPosition) === -1) {
        // We allow flexible usage, but could enforce. Here we will enforce.
        // Comment out next block to relax eligibility.
        // return { success: false, lineupView: null, message: 'Player not eligible for this position.' };
      }

      // Remove any existing slot for this player in this lineup
      lineupSlots = lineupSlots.filter(function (ls) {
        return !(ls.lineup_id === lineupId && ls.player_id === playerId);
      });

      // Ensure no other player occupies this position+slotIndex in this lineup
      lineupSlots = lineupSlots.filter(function (ls) {
        return !(ls.lineup_id === lineupId && ls.position === targetPosition && ls.slot_index === targetSlotIndex);
      });

      const newSlot = {
        id: this._generateId('lineup_slot'),
        lineup_id: lineupId,
        player_id: playerId,
        position: targetPosition,
        slot_index: targetSlotIndex,
        created_at: now
      };
      lineupSlots.push(newSlot);

      lineup.updated_at = now;
      for (let i = 0; i < lineups.length; i++) {
        if (lineups[i].id === lineup.id) {
          lineups[i] = lineup;
          break;
        }
      }
      this._saveToStorage('lineups', lineups);
      this._saveToStorage('lineup_slots', lineupSlots);
    }

    const lineupView = this._buildLineupView(team, lineupDate);
    return { success: true, lineupView: lineupView, message: 'Lineup updated.' };
  }

  // Validate trade offer before creation
  _validateTradeOffer(offeredPlayerIds, requestedPlayerIds, league, myTeam, targetTeam) {
    if (!league || !myTeam || !targetTeam) {
      return { valid: false, message: 'Missing league or team context.' };
    }
    if (!offeredPlayerIds || !offeredPlayerIds.length) {
      return { valid: false, message: 'You must offer at least one player.' };
    }
    if (!requestedPlayerIds || !requestedPlayerIds.length) {
      return { valid: false, message: 'You must request at least one player.' };
    }

    const teamPlayers = this._getFromStorage('team_players', []);

    // Ensure offered players belong to my team
    for (let i = 0; i < offeredPlayerIds.length; i++) {
      const pid = offeredPlayerIds[i];
      const link = teamPlayers.find(function (tp) {
        return tp.team_id === myTeam.id && tp.player_id === pid && tp.is_active;
      });
      if (!link) {
        return { valid: false, message: 'One or more offered players are not on your roster.' };
      }
    }

    // Ensure requested players belong to target team
    for (let j = 0; j < requestedPlayerIds.length; j++) {
      const pid2 = requestedPlayerIds[j];
      const link2 = teamPlayers.find(function (tp) {
        return tp.team_id === targetTeam.id && tp.player_id === pid2 && tp.is_active;
      });
      if (!link2) {
        return { valid: false, message: 'One or more requested players are not on the opponent roster.' };
      }
    }

    return { valid: true, message: 'Trade offer is valid.' };
  }

  // Create waiver claim and persist
  _createWaiverClaim(league, team, playerId, dropPlayerId) {
    const waiverClaims = this._getFromStorage('waiver_claims', []);
    const now = this._nowIso();
    const claim = {
      id: this._generateId('waiver_claim'),
      league_id: league.id,
      team_id: team.id,
      player_id: playerId,
      drop_player_id: dropPlayerId,
      status: 'pending',
      created_at: now,
      processed_at: null
    };
    waiverClaims.push(claim);
    this._saveToStorage('waiver_claims', waiverClaims);

    // Resolve foreign keys
    const leagues = this._getFromStorage('leagues', []);
    const teams = this._getFromStorage('teams', []);
    const players = this._getFromStorage('players', []);

    const leagueObj = leagues.find(function (l) { return l.id === claim.league_id; }) || null;
    const teamObj = teams.find(function (t) { return t.id === claim.team_id; }) || null;
    const playerObj = players.find(function (p) { return p.id === claim.player_id; }) || null;
    const dropPlayerObj = players.find(function (p) { return p.id === claim.drop_player_id; }) || null;

    const resolvedClaim = Object.assign({}, claim, {
      league: leagueObj ? this._deepClone(leagueObj) : null,
      team: teamObj ? this._deepClone(teamObj) : null,
      player: playerObj ? this._deepClone(playerObj) : null,
      drop_player: dropPlayerObj ? this._deepClone(dropPlayerObj) : null
    });

    return resolvedClaim;
  }

  // Load static page content from storage with default structure
  _loadStaticPageContent(key, defaultData) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const data = defaultData || {};
      localStorage.setItem(key, JSON.stringify(data));
      return this._deepClone(data);
    }
    try {
      const parsed = JSON.parse(raw);
      return this._deepClone(parsed);
    } catch (e) {
      const data = defaultData || {};
      localStorage.setItem(key, JSON.stringify(data));
      return this._deepClone(data);
    }
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // getHomeOverview()
  getHomeOverview() {
    const intro = localStorage.getItem('intro_html');
    const introHtml = intro !== null ? intro : '';

    const features = this._getFromStorage('featured_features', []);
    const leagues = this._getFromStorage('leagues', []);
    const teams = this._getFromStorage('teams', []);

    const activeLeague = this._getActiveLeague();
    const myTeam = this._getMyTeamForActiveLeague();

    // Upcoming drafts: leagues with draft_datetime in future
    const now = new Date();
    const upcomingDrafts = leagues
      .filter(function (l) {
        if (!l.draft_datetime) return false;
        const dt = new Date(l.draft_datetime);
        return dt > now;
      })
      .sort(function (a, b) {
        const da = new Date(a.draft_datetime).getTime();
        const db = new Date(b.draft_datetime).getTime();
        return da - db;
      })
      .map(function (l) {
        return {
          league: JSON.parse(JSON.stringify(l)),
          draft_datetime: l.draft_datetime,
          draft_time_local: l.draft_datetime
        };
      });

    // Recent activity, resolve fks
    const recentActivityRaw = this._getFromStorage('recent_activity', []);
    const recentActivity = recentActivityRaw.map(function (act) {
      const leagueObj = leagues.find(function (l) { return l.id === act.league_id; }) || null;
      const teamObj = teams.find(function (t) { return t.id === act.team_id; }) || null;
      const base = Object.assign({}, act);
      if (leagueObj) base.league = JSON.parse(JSON.stringify(leagueObj)); else base.league = null;
      if (teamObj) base.team = JSON.parse(JSON.stringify(teamObj)); else base.team = null;
      return base;
    });

    return {
      intro_html: introHtml,
      featured_features: this._deepClone(features),
      active_league: activeLeague,
      my_team: myTeam,
      upcoming_drafts: upcomingDrafts,
      recent_activity: recentActivity
    };
  }

  // getCreateLeagueOptions()
  getCreateLeagueOptions() {
    return {
      scoring_types: [
        {
          value: 'head_to_head_points',
          label: 'Head-to-Head Points',
          description: 'Weekly head-to-head matchups decided by total fantasy points.'
        },
        {
          value: 'rotisserie',
          label: 'Rotisserie',
          description: 'Season-long category-based scoring.'
        }
      ],
      draft_types: [
        { value: 'snake', label: 'Snake Draft', supports_live_draft: true },
        { value: 'auction', label: 'Auction Draft', supports_live_draft: true },
        { value: 'auto_pick', label: 'Auto-Pick', supports_live_draft: false },
        { value: 'offline', label: 'Offline Draft', supports_live_draft: false }
      ],
      team_counts: [
        { value: 8, label: '8 Teams' },
        { value: 10, label: '10 Teams' },
        { value: 12, label: '12 Teams' },
        { value: 14, label: '14 Teams' }
      ],
      privacy_options: [
        { value: 'public', label: 'Public' },
        { value: 'private', label: 'Private' }
      ],
      entry_fee_presets: [0, 10, 20, 50, 100],
      default_draft_datetime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  // createLeague(name, description, scoringType, maxTeams, draftType, draftDatetime, entryFeeAmount, privacy)
  createLeague(name, description, scoringType, maxTeams, draftType, draftDatetime, entryFeeAmount, privacy) {
    const leagues = this._getFromStorage('leagues', []);
    const teams = this._getFromStorage('teams', []);
    const now = this._nowIso();

    const league = {
      id: this._generateId('league'),
      name: name,
      description: description || '',
      scoring_type: scoringType,
      max_teams: maxTeams,
      current_team_count: 1,
      draft_type: draftType,
      draft_datetime: draftDatetime,
      entry_fee_amount: entryFeeAmount,
      privacy: privacy,
      status: 'pre_draft',
      is_joinable: true,
      created_at: now,
      updated_at: now
    };

    leagues.push(league);
    this._saveToStorage('leagues', leagues);

    const team = {
      id: this._generateId('team'),
      league_id: league.id,
      name: 'My Team',
      abbreviation: 'MYT',
      is_my_team: true,
      wins: 0,
      losses: 0,
      ties: 0,
      total_points: 0,
      standing_rank: 1,
      is_rival: false,
      rival_added_at: null,
      created_at: now,
      updated_at: now
    };

    teams.push(team);

    this._saveToStorage('teams', teams);
    localStorage.setItem('activeLeagueId', league.id);

    return {
      success: true,
      league: this._deepClone(league),
      message: 'League created successfully.'
    };
  }

  // getJoinLeagueFilterOptions()
  getJoinLeagueFilterOptions() {
    return {
      scoring_types: [
        { value: 'head_to_head_points', label: 'Head-to-Head Points' },
        { value: 'rotisserie', label: 'Rotisserie' }
      ],
      team_counts: [
        { value: 8, label: '8 Teams' },
        { value: 10, label: '10 Teams' },
        { value: 12, label: '12 Teams' },
        { value: 14, label: '14 Teams' }
      ],
      draft_date_default_range: {
        from: new Date().toISOString().slice(0, 10),
        to: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      },
      draft_time_default_range: {
        start: '19:00',
        end: '22:00'
      },
      sort_options: [
        { field: 'draft_datetime', direction: 'asc', label: 'Draft Time - Soonest' },
        { field: 'entry_fee_amount', direction: 'asc', label: 'Entry Fee - Low to High' },
        { field: 'max_teams', direction: 'asc', label: 'Team Count - Low to High' }
      ]
    };
  }

  // listPublicLeagues(filters, sort)
  listPublicLeagues(filters, sort) {
    const leagues = this._getFromStorage('leagues', []);
    const f = filters || {};
    let results = leagues.filter(function (l) {
      if (l.privacy !== 'public') return false;
      if (!l.is_joinable) return false;
      return true;
    });

    if (f.scoring_type) {
      results = results.filter(function (l) { return l.scoring_type === f.scoring_type; });
    }
    if (typeof f.max_teams === 'number') {
      results = results.filter(function (l) { return l.max_teams === f.max_teams; });
    }
    if (f.draft_date_from || f.draft_date_to) {
      results = results.filter(function (l) {
        if (!l.draft_datetime) return false;
        const d = new Date(l.draft_datetime);
        const dateStr = d.toISOString().slice(0, 10);
        if (f.draft_date_from && dateStr < f.draft_date_from) return false;
        if (f.draft_date_to && dateStr > f.draft_date_to) return false;
        return true;
      });
    }
    if (f.draft_time_start || f.draft_time_end) {
      results = results.filter(function (l) {
        if (!l.draft_datetime) return false;
        const d = new Date(l.draft_datetime);
        const timeStr = d.toISOString().slice(11, 16); // HH:MM
        if (f.draft_time_start && timeStr < f.draft_time_start) return false;
        if (f.draft_time_end && timeStr > f.draft_time_end) return false;
        return true;
      });
    }
    if (typeof f.entry_fee_max === 'number') {
      results = results.filter(function (l) { return l.entry_fee_amount <= f.entry_fee_max; });
    }

    const s = sort || { field: 'draft_datetime', direction: 'asc' };
    const dir = s.direction === 'desc' ? -1 : 1;
    results.sort(function (a, b) {
      let av;
      let bv;
      if (s.field === 'entry_fee_amount') {
        av = a.entry_fee_amount;
        bv = b.entry_fee_amount;
      } else if (s.field === 'max_teams') {
        av = a.max_teams;
        bv = b.max_teams;
      } else {
        av = a.draft_datetime || '';
        bv = b.draft_datetime || '';
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return results.map(function (l) {
      const draftTimeLocal = l.draft_datetime || '';
      const entryFeeDisplay = l.entry_fee_amount === 0 ? 'Free' : '$' + l.entry_fee_amount;
      return {
        league: JSON.parse(JSON.stringify(l)),
        teams_display: (l.current_team_count || 0) + ' / ' + l.max_teams + ' teams',
        draft_time_local: draftTimeLocal,
        entry_fee_display: entryFeeDisplay,
        is_joinable: !!l.is_joinable
      };
    });
  }

  // joinPublicLeague(leagueId)
  joinPublicLeague(leagueId) {
    const leagues = this._getFromStorage('leagues', []);
    const teams = this._getFromStorage('teams', []);

    const league = leagues.find(function (l) { return l.id === leagueId; });
    if (!league) {
      return { success: false, league: null, team: null, message: 'League not found.' };
    }
    if (league.privacy !== 'public') {
      return { success: false, league: null, team: null, message: 'League is not public.' };
    }

    const existingMyTeam = teams.find(function (t) {
      return t.league_id === league.id && t.is_my_team;
    });
    if (existingMyTeam) {
      localStorage.setItem('activeLeagueId', league.id);
      return {
        success: true,
        league: this._deepClone(league),
        team: this._deepClone(existingMyTeam),
        message: 'Already joined this league.'
      };
    }

    if (!league.is_joinable || league.current_team_count >= league.max_teams) {
      return { success: false, league: this._deepClone(league), team: null, message: 'League is full or not joinable.' };
    }

    const now = this._nowIso();
    const team = {
      id: this._generateId('team'),
      league_id: league.id,
      name: 'My Team',
      abbreviation: 'MYT',
      is_my_team: true,
      wins: 0,
      losses: 0,
      ties: 0,
      total_points: 0,
      standing_rank: (league.current_team_count || 0) + 1,
      is_rival: false,
      rival_added_at: null,
      created_at: now,
      updated_at: now
    };

    teams.push(team);

    league.current_team_count = (league.current_team_count || 0) + 1;
    if (league.current_team_count >= league.max_teams) {
      league.is_joinable = false;
    }
    league.updated_at = now;

    for (let i = 0; i < leagues.length; i++) {
      if (leagues[i].id === league.id) {
        leagues[i] = league;
        break;
      }
    }

    this._saveToStorage('teams', teams);
    this._saveToStorage('leagues', leagues);
    localStorage.setItem('activeLeagueId', league.id);

    return {
      success: true,
      league: this._deepClone(league),
      team: this._deepClone(team),
      message: 'Joined league successfully.'
    };
  }

  // getMyLeaguesList()
  getMyLeaguesList() {
    const leagues = this._getFromStorage('leagues', []);
    const teams = this._getFromStorage('teams', []);
    const activeLeagueId = localStorage.getItem('activeLeagueId') || '';

    const result = [];
    for (let i = 0; i < leagues.length; i++) {
      const league = leagues[i];
      const myTeam = teams.find(function (t) {
        return t.league_id === league.id && t.is_my_team;
      });
      if (!myTeam) continue;
      const isActive = league.id === activeLeagueId;
      const item = {
        league: this._deepClone(league),
        is_active: isActive,
        is_primary: isActive,
        my_team: this._deepClone(myTeam)
      };
      result.push(item);
    }
    return result;
  }

  // setActiveLeague(leagueId)
  setActiveLeague(leagueId) {
    const leagues = this._getFromStorage('leagues', []);
    const league = leagues.find(function (l) { return l.id === leagueId; });
    if (!league) {
      return { success: false, active_league: null, my_team: null, message: 'League not found.' };
    }
    localStorage.setItem('activeLeagueId', league.id);
    const myTeam = this._getMyTeamForActiveLeague();
    return {
      success: true,
      active_league: this._deepClone(league),
      my_team: myTeam,
      message: 'Active league updated.'
    };
  }

  // getLeagueOverview()
  getLeagueOverview() {
    const league = this._getActiveLeague();
    const myTeam = this._getMyTeamForActiveLeague();
    if (!league) {
      return {
        league: null,
        my_team: null,
        draft_summary: null,
        season_status: null,
        key_dates: []
      };
    }

    const draftSummary = {
      draft_type: league.draft_type,
      draft_datetime: league.draft_datetime,
      draft_status: league.status === 'pre_draft' ? 'scheduled' : (league.status === 'drafting' ? 'in_progress' : 'completed')
    };

    const keyDates = [];
    if (league.draft_datetime) {
      keyDates.push({ label: 'Draft', date: league.draft_datetime });
    }

    return {
      league: league,
      my_team: myTeam,
      draft_summary: draftSummary,
      season_status: league.status,
      key_dates: keyDates
    };
  }

  // getLeagueStandings(sort)
  getLeagueStandings(sort) {
    const league = this._getActiveLeague();
    if (!league) return [];

    const teams = this._getFromStorage('teams', []);
    let leagueTeams = teams.filter(function (t) { return t.league_id === league.id; });

    const s = sort || { field: 'standing_rank', direction: 'asc' };
    const dir = s.direction === 'desc' ? -1 : 1;

    leagueTeams.sort(function (a, b) {
      let av;
      let bv;
      if (s.field === 'total_points') {
        av = a.total_points;
        bv = b.total_points;
      } else if (s.field === 'wins') {
        av = a.wins;
        bv = b.wins;
      } else if (s.field === 'losses') {
        av = a.losses;
        bv = b.losses;
      } else {
        av = a.standing_rank;
        bv = b.standing_rank;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return leagueTeams.map(function (t) {
      return {
        team: JSON.parse(JSON.stringify(t)),
        is_my_team: !!t.is_my_team,
        is_rival: !!t.is_rival
      };
    });
  }

  // toggleRivalTeam(teamId)
  toggleRivalTeam(teamId) {
    const league = this._getActiveLeague();
    if (!league) {
      return { success: false, team: null, is_rival: false, rivals: [] };
    }

    const teams = this._getFromStorage('teams', []);
    const targetIndex = teams.findIndex(function (t) { return t.id === teamId && t.league_id === league.id; });
    if (targetIndex === -1) {
      return { success: false, team: null, is_rival: false, rivals: [] };
    }

    const now = this._nowIso();
    const team = teams[targetIndex];
    team.is_rival = !team.is_rival;
    team.rival_added_at = team.is_rival ? now : null;
    team.updated_at = now;
    teams[targetIndex] = team;
    this._saveToStorage('teams', teams);

    const rivals = teams.filter(function (t) {
      return t.league_id === league.id && t.is_rival;
    }).map(function (t) { return JSON.parse(JSON.stringify(t)); });

    return {
      success: true,
      team: this._deepClone(team),
      is_rival: team.is_rival,
      rivals: rivals
    };
  }

  // getRivalsList()
  getRivalsList() {
    const league = this._getActiveLeague();
    if (!league) return [];
    const teams = this._getFromStorage('teams', []);
    return teams
      .filter(function (t) { return t.league_id === league.id && t.is_rival; })
      .map(function (t) { return JSON.parse(JSON.stringify(t)); });
  }

  // getLeagueSchedule(scoringPeriodStartDate)
  getLeagueSchedule(scoringPeriodStartDate) {
    const league = this._getActiveLeague();
    if (!league) {
      return { scoring_period_label: '', matchups: [] };
    }
    const schedules = this._getFromStorage('league_schedules', []);
    const teams = this._getFromStorage('teams', []);

    const dateFilter = scoringPeriodStartDate ? scoringPeriodStartDate.slice(0, 10) : null;

    const leagueSchedules = schedules.filter(function (s) { return s.league_id === league.id; });
    let schedule = null;
    if (dateFilter) {
      schedule = leagueSchedules.find(function (s) { return (s.scoring_period_start_date || '').slice(0, 10) === dateFilter; }) || null;
    } else {
      schedule = leagueSchedules[0] || null;
    }

    if (!schedule) {
      return { scoring_period_label: '', matchups: [] };
    }

    const matchups = (schedule.matchups || []).map(function (m) {
      const homeTeam = teams.find(function (t) { return t.id === m.home_team_id; }) || null;
      const awayTeam = teams.find(function (t) { return t.id === m.away_team_id; }) || null;
      const base = Object.assign({}, m);
      base.home_team = homeTeam ? JSON.parse(JSON.stringify(homeTeam)) : null;
      base.away_team = awayTeam ? JSON.parse(JSON.stringify(awayTeam)) : null;
      return base;
    });

    return {
      scoring_period_label: schedule.scoring_period_label || '',
      matchups: matchups
    };
  }

  // getLeagueScoreboard(scoringPeriodStartDate)
  getLeagueScoreboard(scoringPeriodStartDate) {
    const league = this._getActiveLeague();
    if (!league) {
      return { scoring_period_label: '', matchups: [] };
    }
    const scoreboards = this._getFromStorage('league_scoreboards', []);
    const teams = this._getFromStorage('teams', []);

    const dateFilter = scoringPeriodStartDate ? scoringPeriodStartDate.slice(0, 10) : null;
    const leagueBoards = scoreboards.filter(function (s) { return s.league_id === league.id; });
    let board = null;
    if (dateFilter) {
      board = leagueBoards.find(function (s) { return (s.scoring_period_start_date || '').slice(0, 10) === dateFilter; }) || null;
    } else {
      board = leagueBoards[0] || null;
    }

    if (!board) {
      return { scoring_period_label: '', matchups: [] };
    }

    const matchups = (board.matchups || []).map(function (m) {
      const homeTeam = teams.find(function (t) { return t.id === m.home_team_id; }) || null;
      const awayTeam = teams.find(function (t) { return t.id === m.away_team_id; }) || null;
      const base = Object.assign({}, m);
      base.home_team = homeTeam ? JSON.parse(JSON.stringify(homeTeam)) : null;
      base.away_team = awayTeam ? JSON.parse(JSON.stringify(awayTeam)) : null;
      return base;
    });

    return {
      scoring_period_label: board.scoring_period_label || '',
      matchups: matchups
    };
  }

  // getMyTeamRosterAndLineup(lineupDate)
  getMyTeamRosterAndLineup(lineupDate) {
    const team = this._getMyTeamForActiveLeague();
    if (!team) {
      return {
        team: null,
        lineup_date: lineupDate.slice(0, 10),
        pitchers: [],
        hitters: [],
        lineup_slots: []
      };
    }
    const view = this._buildLineupView(team, lineupDate);
    return view;
  }

  // movePlayerToBench(lineupDate, playerId)
  movePlayerToBench(lineupDate, playerId) {
    const result = this._applyLineupChange('moveToBench', { lineupDate: lineupDate, playerId: playerId });
    return {
      success: result.success,
      lineup: result.lineupView,
      message: result.message
    };
  }

  // movePlayerToLineup(lineupDate, playerId, position, slotIndex)
  movePlayerToLineup(lineupDate, playerId, position, slotIndex) {
    const result = this._applyLineupChange('moveToSlot', {
      lineupDate: lineupDate,
      playerId: playerId,
      position: position,
      slotIndex: slotIndex
    });
    return {
      success: result.success,
      lineup: result.lineupView,
      message: result.message
    };
  }

  // setStarterAtPosition(lineupDate, position, playerId)
  setStarterAtPosition(lineupDate, position, playerId) {
    const result = this._applyLineupChange('setStarterAtPosition', {
      lineupDate: lineupDate,
      playerId: playerId,
      position: position,
      slotIndex: 1
    });
    return {
      success: result.success,
      lineup: result.lineupView,
      message: result.message
    };
  }

  // getPlayersFilterOptions()
  getPlayersFilterOptions() {
    return {
      positions: [
        { value: 'all_hitters', label: 'All Hitters', role: 'hitter' },
        { value: 'all_pitchers', label: 'All Pitchers', role: 'pitcher' },
        { value: 'sp', label: 'Starting Pitcher', role: 'pitcher' },
        { value: 'rp', label: 'Relief Pitcher', role: 'pitcher' },
        { value: '1b', label: 'First Base', role: 'hitter' },
        { value: '2b', label: 'Second Base', role: 'hitter' },
        { value: '3b', label: 'Third Base', role: 'hitter' },
        { value: 'ss', label: 'Shortstop', role: 'hitter' },
        { value: 'of', label: 'Outfield', role: 'hitter' },
        { value: 'c', label: 'Catcher', role: 'hitter' },
        { value: 'dh', label: 'Designated Hitter', role: 'hitter' },
        { value: 'util', label: 'Utility', role: 'hitter' }
      ],
      statuses: [
        { value: 'free_agent', label: 'Free Agent' },
        { value: 'waivers', label: 'Waivers' },
        { value: 'owned', label: 'Owned' }
      ],
      sort_options: [
        { field: 'projected_hr', direction: 'desc', label: 'Projected HR - High to Low' },
        { field: 'projected_saves', direction: 'desc', label: 'Projected Saves - High to Low' },
        { field: 'projected_points', direction: 'desc', label: 'Projected Points - High to Low' },
        { field: 'ownership_percent', direction: 'desc', label: 'Ownership % - High to Low' },
        { field: 'name', direction: 'asc', label: 'Name A-Z' }
      ],
      projection_fields: [
        { key: 'projected_hr', label: 'Projected Home Runs', unit: 'HR' },
        { key: 'projected_saves', label: 'Projected Saves', unit: 'SV' }
      ]
    };
  }

  // listFreeAgentPlayers(filters, sort, page, pageSize)
  listFreeAgentPlayers(filters, sort, page, pageSize) {
    const players = this._getFromStorage('players', []);
    const watchlistItems = this._getFromStorage('watchlist_items', []);

    const f = filters || {};
    let results = players.filter(function (p) {
      if (f.status && p.player_status !== f.status) return false;
      if (!f.status && p.player_status !== 'free_agent') return false;
      return true;
    });

    if (f.player_role) {
      results = results.filter(function (p) { return p.player_role === f.player_role; });
    }

    if (typeof f.min_projected_hr === 'number') {
      const minHR = f.min_projected_hr;
      results = results.filter(function (p) { return (p.projected_hr || 0) >= minHR; });
    }

    if (f.position) {
      results = results.filter(function (p) {
        if (f.position === 'all_hitters') {
          return p.player_role === 'hitter' || p.player_role === 'two_way';
        }
        if (f.position === 'all_pitchers') {
          return p.player_role === 'pitcher' || p.player_role === 'two_way';
        }
        return Array.isArray(p.eligible_positions) && p.eligible_positions.indexOf(f.position) !== -1;
      });
    }

    const s = sort || { field: 'projected_hr', direction: 'desc' };
    const dir = s.direction === 'asc' ? 1 : -1;
    results.sort(function (a, b) {
      let av;
      let bv;
      if (s.field === 'projected_points') {
        av = a.projected_points;
        bv = b.projected_points;
      } else if (s.field === 'ownership_percent') {
        av = a.ownership_percent;
        bv = b.ownership_percent;
      } else if (s.field === 'name') {
        av = a.name || '';
        bv = b.name || '';
      } else {
        av = a.projected_hr;
        bv = b.projected_hr;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const pg = page || 1;
    const ps = pageSize || 50;
    const start = (pg - 1) * ps;
    const end = start + ps;
    const paged = results.slice(start, end);

    return paged.map(function (p) {
      const onWatch = watchlistItems.some(function (w) { return w.player_id === p.id; });
      return {
        player: JSON.parse(JSON.stringify(p)),
        is_on_watchlist: onWatch
      };
    });
  }

  // addPlayerToWatchlist(playerId)
  addPlayerToWatchlist(playerId) {
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const players = this._getFromStorage('players', []);

    let existing = watchlistItems.find(function (w) { return w.player_id === playerId; });
    const now = this._nowIso();

    if (!existing) {
      existing = {
        id: this._generateId('watchlist_item'),
        player_id: playerId,
        added_at: now,
        notes: ''
      };
      watchlistItems.push(existing);
      this._saveToStorage('watchlist_items', watchlistItems);
    }

    const player = players.find(function (p) { return p.id === playerId; }) || null;
    const resolvedItem = Object.assign({}, existing, {
      player: player ? this._deepClone(player) : null
    });

    return {
      success: true,
      watchlist_item: resolvedItem,
      message: 'Player added to watchlist.'
    };
  }

  // removePlayerFromWatchlist(playerId)
  removePlayerFromWatchlist(playerId) {
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const before = watchlistItems.length;
    const remaining = watchlistItems.filter(function (w) { return w.player_id !== playerId; });
    this._saveToStorage('watchlist_items', remaining);
    const removed = before !== remaining.length;
    return {
      success: removed,
      message: removed ? 'Player removed from watchlist.' : 'Player was not on watchlist.'
    };
  }

  // listWatchlistPlayers()
  listWatchlistPlayers() {
    const watchlistItems = this._getFromStorage('watchlist_items', []);
    const players = this._getFromStorage('players', []);

    return watchlistItems.map(function (item) {
      const player = players.find(function (p) { return p.id === item.player_id; }) || null;
      const resolvedItem = Object.assign({}, item, {
        player: player ? JSON.parse(JSON.stringify(player)) : null
      });
      return {
        watchlist_item: resolvedItem,
        player: player ? JSON.parse(JSON.stringify(player)) : null
      };
    });
  }

  // listWaiverPlayers(filters, sort)
  listWaiverPlayers(filters, sort) {
    const players = this._getFromStorage('players', []);
    const f = filters || {};

    let results = players.filter(function (p) { return p.player_status === 'waivers'; });

    if (f.position) {
      results = results.filter(function (p) {
        return Array.isArray(p.eligible_positions) && p.eligible_positions.indexOf(f.position) !== -1;
      });
    }
    if (typeof f.min_projected_saves === 'number') {
      const minSv = f.min_projected_saves;
      results = results.filter(function (p) { return (p.projected_saves || 0) >= minSv; });
    }
    if (typeof f.max_ownership_percent === 'number') {
      const maxOwn = f.max_ownership_percent;
      results = results.filter(function (p) { return (p.ownership_percent || 0) <= maxOwn; });
    }
    if (typeof f.max_era === 'number') {
      const maxEra = f.max_era;
      results = results.filter(function (p) { return (p.era || 0) <= maxEra; });
    }

    const s = sort || { field: 'projected_saves', direction: 'desc' };
    const dir = s.direction === 'asc' ? 1 : -1;

    results.sort(function (a, b) {
      let av;
      let bv;
      if (s.field === 'era') {
        av = a.era;
        bv = b.era;
      } else if (s.field === 'ownership_percent') {
        av = a.ownership_percent;
        bv = b.ownership_percent;
      } else if (s.field === 'projected_points') {
        av = a.projected_points;
        bv = b.projected_points;
      } else {
        av = a.projected_saves;
        bv = b.projected_saves;
      }
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    return results.map(function (p) {
      return { player: JSON.parse(JSON.stringify(p)) };
    });
  }

  // getMyDroppablePlayersForWaivers()
  getMyDroppablePlayersForWaivers() {
    const team = this._getMyTeamForActiveLeague();
    if (!team) return [];

    const teamPlayers = this._getFromStorage('team_players', []);
    const players = this._getFromStorage('players', []);

    const today = new Date().toISOString().slice(0, 10);
    const lineupView = this._buildLineupView(team, today) || { pitchers: [], hitters: [] };

    const startingIds = {};
    const allEntries = (lineupView.pitchers || []).concat(lineupView.hitters || []);
    for (let i = 0; i < allEntries.length; i++) {
      const entry = allEntries[i];
      if (entry.is_starting && entry.player && entry.player.id) {
        startingIds[entry.player.id] = true;
      }
    }

    const rosterLinks = teamPlayers.filter(function (tp) {
      return tp.team_id === team.id && tp.is_active;
    });

    const result = [];
    for (let j = 0; j < rosterLinks.length; j++) {
      const link = rosterLinks[j];
      const player = players.find(function (p) { return p.id === link.player_id; });
      if (!player) continue;
      const isStarting = !!startingIds[player.id];
      result.push({
        player: this._deepClone(player),
        is_bench: !isStarting,
        era: player.era,
        lineup_status: isStarting ? 'starter' : 'bench'
      });
    }

    return result;
  }

  // submitWaiverClaim(playerId, dropPlayerId)
  submitWaiverClaim(playerId, dropPlayerId) {
    const league = this._getActiveLeague();
    const team = this._getMyTeamForActiveLeague();
    if (!league || !team) {
      return { success: false, claim: null, message: 'No active league or team.' };
    }

    const players = this._getFromStorage('players', []);
    const teamPlayers = this._getFromStorage('team_players', []);

    const waiverPlayer = players.find(function (p) { return p.id === playerId; });
    if (!waiverPlayer || waiverPlayer.player_status !== 'waivers') {
      return { success: false, claim: null, message: 'Selected player is not on waivers.' };
    }

    const dropLink = teamPlayers.find(function (tp) {
      return tp.team_id === team.id && tp.player_id === dropPlayerId && tp.is_active;
    });
    if (!dropLink) {
      return { success: false, claim: null, message: 'Drop player is not on your active roster.' };
    }

    const claim = this._createWaiverClaim(league, team, playerId, dropPlayerId);

    return {
      success: true,
      claim: claim,
      message: 'Waiver claim submitted.'
    };
  }

  // getTradeCenterView(offeredPlayerIds)
  getTradeCenterView(offeredPlayerIds) {
    const league = this._getActiveLeague();
    const myTeam = this._getMyTeamForActiveLeague();
    const players = this._getFromStorage('players', []);
    const teams = this._getFromStorage('teams', []);

    const offeredIds = offeredPlayerIds || [];
    const offeredPlayers = players.filter(function (p) { return offeredIds.indexOf(p.id) !== -1; });

    const standings = this.getLeagueStandings({ field: 'standing_rank', direction: 'asc' });

    let suggestedTargetTeamId = null;
    for (let i = 0; i < standings.length; i++) {
      const entry = standings[i];
      if (entry.team.id === myTeam.id) {
        if (i > 0) {
          suggestedTargetTeamId = standings[i - 1].team.id;
        }
        break;
      }
    }

    const teamsInOrder = standings.map(function (entry) {
      return {
        team: JSON.parse(JSON.stringify(entry.team)),
        is_my_team: entry.is_my_team
      };
    });

    return {
      league: league,
      my_team: myTeam,
      offered_players: offeredPlayers.map(function (p) { return JSON.parse(JSON.stringify(p)); }),
      teams_in_standings_order: teamsInOrder,
      suggested_target_team_id: suggestedTargetTeamId
    };
  }

  // getOpponentRosterForTrade(teamId, positionFilter)
  getOpponentRosterForTrade(teamId, positionFilter) {
    const teamPlayers = this._getFromStorage('team_players', []);
    const players = this._getFromStorage('players', []);

    const rosterLinks = teamPlayers.filter(function (tp) {
      return tp.team_id === teamId && tp.is_active;
    });

    let result = [];
    for (let i = 0; i < rosterLinks.length; i++) {
      const link = rosterLinks[i];
      const player = players.find(function (p) { return p.id === link.player_id; });
      if (!player) continue;
      result.push({ player: player, is_trade_eligible: true });
    }

    if (positionFilter) {
      result = result.filter(function (entry) {
        const p = entry.player;
        return Array.isArray(p.eligible_positions) && p.eligible_positions.indexOf(positionFilter) !== -1;
      });
    }

    return result.map(function (entry) {
      return {
        player: JSON.parse(JSON.stringify(entry.player)),
        is_trade_eligible: entry.is_trade_eligible
      };
    });
  }

  // sendTradeOffer(targetTeamId, offeredPlayerIds, requestedPlayerIds, message)
  sendTradeOffer(targetTeamId, offeredPlayerIds, requestedPlayerIds, message) {
    const league = this._getActiveLeague();
    const myTeam = this._getMyTeamForActiveLeague();
    if (!league || !myTeam) {
      return { success: false, trade_offer: null, message: 'No active league or team.' };
    }

    const teams = this._getFromStorage('teams', []);
    const targetTeam = teams.find(function (t) { return t.id === targetTeamId && t.league_id === league.id; });
    if (!targetTeam) {
      return { success: false, trade_offer: null, message: 'Target team not found in league.' };
    }
    if (targetTeam.id === myTeam.id) {
      return { success: false, trade_offer: null, message: 'Cannot trade with your own team.' };
    }

    const validation = this._validateTradeOffer(offeredPlayerIds || [], requestedPlayerIds || [], league, myTeam, targetTeam);
    if (!validation.valid) {
      return { success: false, trade_offer: null, message: validation.message };
    }

    const tradeOffers = this._getFromStorage('trade_offers', []);
    const now = this._nowIso();
    const offer = {
      id: this._generateId('trade_offer'),
      league_id: league.id,
      from_team_id: myTeam.id,
      to_team_id: targetTeam.id,
      offered_player_ids: offeredPlayerIds || [],
      requested_player_ids: requestedPlayerIds || [],
      status: 'pending',
      created_at: now,
      updated_at: now,
      message: message || ''
    };

    tradeOffers.push(offer);
    this._saveToStorage('trade_offers', tradeOffers);

    const players = this._getFromStorage('players', []);

    const offeredPlayers = players.filter(function (p) { return (offer.offered_player_ids || []).indexOf(p.id) !== -1; });
    const requestedPlayers = players.filter(function (p) { return (offer.requested_player_ids || []).indexOf(p.id) !== -1; });

    const resolvedOffer = Object.assign({}, offer, {
      league: this._deepClone(league),
      from_team: this._deepClone(myTeam),
      to_team: this._deepClone(targetTeam),
      offered_players: offeredPlayers.map(function (p) { return JSON.parse(JSON.stringify(p)); }),
      requested_players: requestedPlayers.map(function (p) { return JSON.parse(JSON.stringify(p)); })
    });

    return {
      success: true,
      trade_offer: resolvedOffer,
      message: 'Trade offer sent.'
    };
  }

  // getPlayerComparison(playerIds)
  getPlayerComparison(playerIds) {
    const ids = playerIds || [];
    const players = this._getFromStorage('players', []);

    const selected = players.filter(function (p) { return ids.indexOf(p.id) !== -1; }).slice(0, 2);

    const playersOut = selected.map(function (p) {
      return {
        player: JSON.parse(JSON.stringify(p)),
        stats: {
          projected_points_next_7_days: p.projected_points_next_7_days,
          projected_hr: p.projected_hr,
          projected_saves: p.projected_saves,
          era: p.era
        }
      };
    });

    let higherId = null;
    if (playersOut.length === 2) {
      const a = playersOut[0];
      const b = playersOut[1];
      if (a.stats.projected_points_next_7_days > b.stats.projected_points_next_7_days) {
        higherId = a.player.id;
      } else if (b.stats.projected_points_next_7_days > a.stats.projected_points_next_7_days) {
        higherId = b.player.id;
      } else {
        higherId = null;
      }
    }

    return {
      players: playersOut,
      higher_projected_player_id: higherId
    };
  }

  // getNotificationSettings()
  getNotificationSettings() {
    const raw = localStorage.getItem('notification_settings');
    const createDefault = () => {
      const now = this._nowIso();
      const defaultSettings = {
        id: 'notification_settings_1',
        trade_alerts_enabled: false,
        trade_alerts_frequency: 'daily',
        injury_updates_enabled: false,
        injury_updates_frequency: 'daily',
        league_chat_enabled: true,
        created_at: now,
        updated_at: now
      };
      localStorage.setItem('notification_settings', JSON.stringify([defaultSettings]));
      return defaultSettings;
    };

    if (!raw) {
      return this._deepClone(createDefault());
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) {
          return this._deepClone(createDefault());
        }
        return this._deepClone(parsed[0]);
      }
      const obj = parsed || createDefault();
      localStorage.setItem('notification_settings', JSON.stringify([obj]));
      return this._deepClone(obj);
    } catch (e) {
      return this._deepClone(createDefault());
    }
  }

  // updateNotificationSettings(trade_alerts_enabled, trade_alerts_frequency, injury_updates_enabled, injury_updates_frequency, league_chat_enabled)
  updateNotificationSettings(trade_alerts_enabled, trade_alerts_frequency, injury_updates_enabled, injury_updates_frequency, league_chat_enabled) {
    const current = this.getNotificationSettings();
    const now = this._nowIso();

    if (typeof trade_alerts_enabled === 'boolean') {
      current.trade_alerts_enabled = trade_alerts_enabled;
    }
    if (typeof trade_alerts_frequency === 'string' && trade_alerts_frequency) {
      current.trade_alerts_frequency = trade_alerts_frequency;
    }
    if (typeof injury_updates_enabled === 'boolean') {
      current.injury_updates_enabled = injury_updates_enabled;
    }
    if (typeof injury_updates_frequency === 'string' && injury_updates_frequency) {
      current.injury_updates_frequency = injury_updates_frequency;
    }
    if (typeof league_chat_enabled === 'boolean') {
      current.league_chat_enabled = league_chat_enabled;
    }

    current.updated_at = now;

    let stored;
    try {
      const raw = localStorage.getItem('notification_settings');
      stored = raw ? JSON.parse(raw) : [];
    } catch (e) {
      stored = [];
    }
    if (!Array.isArray(stored)) {
      stored = [stored];
    }
    if (stored.length === 0) {
      stored.push(current);
    } else {
      stored[0] = current;
    }
    localStorage.setItem('notification_settings', JSON.stringify(stored));

    return {
      success: true,
      settings: this._deepClone(current),
      message: 'Notification settings updated.'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const defaultData = {
      heading: 'About',
      mission_html: '',
      features: [],
      organization_html: ''
    };
    return this._loadStaticPageContent('about_page_content', defaultData);
  }

  // getHelpFaqContent()
  getHelpFaqContent() {
    const defaultData = {
      categories: []
    };
    return this._loadStaticPageContent('help_faq_content', defaultData);
  }

  // getContactPageConfig()
  getContactPageConfig() {
    const defaultData = {
      support_email: '',
      mailing_address: '',
      response_time_estimate: '',
      categories: [
        { value: 'bug_report', label: 'Bug Report' },
        { value: 'feature_request', label: 'Feature Request' },
        { value: 'account_help', label: 'Account Help' },
        { value: 'other', label: 'Other' }
      ]
    };
    return this._loadStaticPageContent('contact_page_config', defaultData);
  }

  // submitContactForm(subject, category, message, email)
  submitContactForm(subject, category, message, email) {
    const tickets = this._getFromStorage('contact_form_tickets', []);
    const now = this._nowIso();
    const ticket = {
      id: this._generateId('ticket'),
      subject: subject,
      category: category,
      message: message,
      email: email || '',
      created_at: now
    };
    tickets.push(ticket);
    this._saveToStorage('contact_form_tickets', tickets);

    return {
      success: true,
      ticket_id: ticket.id,
      message: 'Contact request submitted.'
    };
  }

  // getRulesAndScoringContent()
  getRulesAndScoringContent() {
    const defaultData = {
      scoring_formats: [],
      hitter_scoring_categories: [],
      pitcher_scoring_categories: [],
      roster_rules_html: '',
      transaction_rules_html: ''
    };
    return this._loadStaticPageContent('rules_and_scoring_content', defaultData);
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const defaultData = {
      last_updated: '',
      sections: []
    };
    return this._loadStaticPageContent('privacy_policy_content', defaultData);
  }

  // getTermsOfServiceContent()
  getTermsOfServiceContent() {
    const defaultData = {
      last_updated: '',
      sections: []
    };
    return this._loadStaticPageContent('terms_of_service_content', defaultData);
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
