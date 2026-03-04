// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  // ---------------------- STORAGE BASICS ----------------------

  _initStorage() {
    const keys = [
      'sports',
      'conferences',
      'seasons',
      'teams',
      'team_season_stats',
      'games',
      'game_predictions',
      'team_prediction_aggregates',
      'watchlist_items',
      'favorite_teams',
      'followed_teams',
      'betting_parlays',
      'betting_parlay_legs',
      'ranking_metric_definitions',
      'saved_ranking_views',
      'custom_lists',
      'custom_list_items',
      'team_tag_assignments',
      'articles',
      'article_table_rows',
      'tournaments',
      'bracket_template_matchups',
      'brackets',
      'bracket_picks',
      'alerts',
      'contact_requests',
      'about_content',
      'help_content',
      'parlay_draft',
      'bracket_drafts'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        // For about/help/parlay_draft/bracket_drafts we will set defaults below
        if (key === 'about_content') {
          localStorage.setItem(
            key,
            JSON.stringify({
              sections: [
                {
                  heading: 'About This Site',
                  bodyHtml:
                    '<p>This site provides college sports rankings, predictions, and tools for exploring matchups.</p>'
                },
                {
                  heading: 'Methodology',
                  bodyHtml:
                    '<p>Rankings and predictions are based on statistical models combining efficiency metrics and historical performance.</p>'
                }
              ]
            })
          );
        } else if (key === 'help_content') {
          localStorage.setItem(
            key,
            JSON.stringify({
              sections: [
                {
                  sectionSlug: 'watchlists',
                  title: 'Watchlists',
                  bodyHtml:
                    '<p>Use watchlists to track interesting upcoming games and upset candidates.</p>'
                },
                {
                  sectionSlug: 'parlays',
                  title: 'Betting Simulator & Parlays',
                  bodyHtml:
                    '<p>The betting simulator lets you create multi-game parlays with simulated odds and payouts.</p>'
                },
                {
                  sectionSlug: 'brackets',
                  title: 'Bracket Simulator',
                  bodyHtml:
                    '<p>Auto-fill a bracket by seed, then tweak picks based on our win probabilities.</p>'
                },
                {
                  sectionSlug: 'alerts',
                  title: 'Alerts',
                  bodyHtml:
                    '<p>Create alerts for when rankings move beyond thresholds you care about.</p>'
                }
              ],
              faqs: [
                {
                  question: 'Where do the predictions come from?',
                  answerHtml:
                    '<p>Predictions are generated from internal models using team strength, schedule, and efficiency metrics.</p>'
                },
                {
                  question: 'Are simulated odds real betting lines?',
                  answerHtml:
                    '<p>No. Simulated odds are for informational and educational purposes only.</p>'
                }
              ]
            })
          );
        } else if (key === 'parlay_draft') {
          localStorage.setItem(
            key,
            JSON.stringify({ legs: [], stakeAmount: 0 })
          );
        } else if (key === 'bracket_drafts') {
          localStorage.setItem(key, JSON.stringify({}));
        } else if (key === 'ranking_metric_definitions') {
          // Seed static metric definitions if absent
          localStorage.setItem(
            key,
            JSON.stringify([
              {
                id: 'metric_off_eff',
                code: 'offensive_efficiency',
                name: 'Offensive Efficiency',
                description: 'Points scored per possession adjusted for opponent strength.',
                applies_to_scope: 'team_season'
              },
              {
                id: 'metric_def_eff',
                code: 'defensive_efficiency',
                name: 'Defensive Efficiency',
                description: 'Points allowed per possession adjusted for opponent strength.',
                applies_to_scope: 'team_season'
              },
              {
                id: 'metric_overall',
                code: 'overall_rating',
                name: 'Overall Rating',
                description: 'Composite power rating based on offensive and defensive efficiency.',
                applies_to_scope: 'team_season'
              },
              {
                id: 'metric_team_rank',
                code: 'team_rank',
                name: 'Team Rank',
                description: 'Ordinal ranking position.',
                applies_to_scope: 'team_season'
              },
              {
                id: 'metric_rank_change',
                code: 'rank_change',
                name: 'Rank Change',
                description: 'Change in ranking over the selected period.',
                applies_to_scope: 'trends'
              },
              {
                id: 'metric_biggest_rise',
                code: 'biggest_rise',
                name: 'Biggest Rise',
                description: 'Teams with the largest positive rank change.',
                applies_to_scope: 'trends'
              },
              {
                id: 'metric_avg_pred_wp',
                code: 'average_predicted_win_probability',
                name: 'Average Predicted Win Probability',
                description: 'Average game-level win probability over a period.',
                applies_to_scope: 'team_aggregate'
              },
              {
                id: 'metric_fav_wp',
                code: 'favorite_win_probability',
                name: 'Favorite Win Probability',
                description: 'Win probability for favorites in games list.',
                applies_to_scope: 'game_predictions'
              },
              {
                id: 'metric_dog_wp',
                code: 'underdog_win_probability',
                name: 'Underdog Win Probability',
                description: 'Win probability for underdogs in games list.',
                applies_to_scope: 'game_predictions'
              },
              {
                id: 'metric_payout_mult',
                code: 'payout_multiplier',
                name: 'Payout Multiplier',
                description: 'Implied odds multiplier for betting legs.',
                applies_to_scope: 'betting'
              }
            ])
          );
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

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

  // ---------------------- GENERIC HELPERS ----------------------

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _isWithinDateRange(dateStr, startStr, endStr) {
    const d = this._parseDate(dateStr);
    if (!d) return false;
    if (startStr) {
      const s = this._parseDate(startStr);
      if (s && d < s) return false;
    }
    if (endStr) {
      const e = this._parseDate(endStr);
      if (e && d > e) return false;
    }
    return true;
  }

  _resolveSportNameFromCode(sportCode) {
    const sports = this._getFromStorage('sports');
    const sport = sports.find((s) => s.code === sportCode);
    if (sport && sport.name) return sport.name;
    // Fallback mapping
    const map = {
      football: 'Football',
      mens_basketball: "Men's Basketball",
      womens_soccer: "Women\'s Soccer",
      womens_volleyball: "Women\'s Volleyball"
    };
    return map[sportCode] || sportCode;
  }

  _getCurrentSeasonForSport() {
    // Without explicit sport linkage, just return the latest season by year
    const seasons = this._getFromStorage('seasons');
    if (!seasons.length) return null;
    return seasons.reduce((latest, s) => {
      if (!latest) return s;
      if (s.year > latest.year) return s;
      return latest;
    }, null);
  }

  _getSeasonById(seasonId) {
    if (!seasonId) return null;
    const seasons = this._getFromStorage('seasons');
    return seasons.find((s) => s.id === seasonId) || null;
  }

  _getTeamById(teamId) {
    if (!teamId) return null;
    const teams = this._getFromStorage('teams');
    const existing = teams.find((t) => t.id === teamId);
    if (existing) return existing;
    // Fallback: synthesize minimal team object for IDs present in games or stats (e.g., football teams in tests)
    const games = this._getFromStorage('games');
    const game = games.find((g) => g.home_team_id === teamId || g.away_team_id === teamId) || null;
    const stats = this._getFromStorage('team_season_stats');
    const stat = stats.find((s) => s.team_id === teamId) || null;
    const sportCode = (game && game.sport_code) || (stat && stat.sport_code) || null;
    return {
      id: teamId,
      name: teamId,
      short_name: teamId,
      mascot: '',
      sport_code: sportCode,
      conference_id: (stat && stat.conference_id) || null
    };
  }

  _getGameById(gameId) {
    if (!gameId) return null;
    const games = this._getFromStorage('games');
    return games.find((g) => g.id === gameId) || null;
  }

  _getConferenceById(conferenceId) {
    if (!conferenceId) return null;
    const conferences = this._getFromStorage('conferences');
    return conferences.find((c) => c.id === conferenceId) || null;
  }

  _getTeamSeasonStatsForTeam(teamId) {
    const stats = this._getFromStorage('team_season_stats');
    const filtered = stats.filter((s) => s.team_id === teamId);
    if (!filtered.length) return null;
    // Prefer full_season, then regular_season, then latest year
    const seasons = this._getFromStorage('seasons');
    const seasonById = new Map(seasons.map((s) => [s.id, s]));
    return filtered.reduce((best, s) => {
      if (!best) return s;
      const bs = seasonById.get(best.season_id) || {};
      const cs = seasonById.get(s.season_id) || {};
      const bestScore = (bs.year || 0) * 10 + (bs.season_type === 'full_season' ? 3 : bs.season_type === 'regular_season' ? 2 : 1);
      const curScore = (cs.year || 0) * 10 + (cs.season_type === 'full_season' ? 3 : cs.season_type === 'regular_season' ? 2 : 1);
      return curScore > bestScore ? s : best;
    }, null);
  }

  _getOrCreateWatchlist() {
    // Single-user global watchlist: just the watchlist_items collection
    return this._getFromStorage('watchlist_items');
  }

  _getOrCreateParlayDraft() {
    let draft = this._getFromStorage('parlay_draft');
    if (!draft || typeof draft !== 'object' || !Array.isArray(draft.legs)) {
      draft = { legs: [], stakeAmount: 0 };
      this._saveToStorage('parlay_draft', draft);
    }
    return draft;
  }

  _saveParlayDraft(draft) {
    this._saveToStorage('parlay_draft', draft);
  }

  _recalculateParlayFromLegs(legs, stakeAmount) {
    // Uses same logic as calculateParlayPayout but without updating storage
    const result = this.calculateParlayPayout(legs, stakeAmount);
    return { totalPayoutMultiplier: result.totalPayoutMultiplier, legs: result.legs };
  }

  _getCurrentBracketDraft(tournamentId) {
    const drafts = this._getFromStorage('bracket_drafts') || {};
    const brackets = this._getFromStorage('brackets');
    let bracketId = drafts[tournamentId];
    let bracket = null;
    if (bracketId) {
      bracket = brackets.find((b) => b.id === bracketId) || null;
    }
    if (!bracket) {
      // Create new bracket draft
      bracketId = this._generateId('bracket');
      const newBracket = {
        id: bracketId,
        tournament_id: tournamentId,
        name: '',
        is_auto_filled: false,
        created_at: new Date().toISOString(),
        updated_at: null
      };
      brackets.push(newBracket);
      this._saveToStorage('brackets', brackets);
      drafts[tournamentId] = bracketId;
      this._saveToStorage('bracket_drafts', drafts);
      bracket = newBracket;
    }
    return bracket;
  }

  // ---------------------- INTERFACE IMPLEMENTATIONS ----------------------

  // searchSiteContent(query, sportCode, contentType, page = 1, pageSize = 20)
  searchSiteContent(query, sportCode, contentType, page, pageSize) {
    const q = (query || '').toLowerCase().trim();
    const pageNum = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;

    const includeTeams = !contentType || contentType === 'team';
    const includeGames = !contentType || contentType === 'game';
    const includeArticles = !contentType || contentType === 'article';

    const teamsResult = [];
    const gamesResult = [];
    const articlesResult = [];

    if (includeTeams) {
      const teams = this._getFromStorage('teams');
      const teamSeasonStats = this._getFromStorage('team_season_stats');

      const filteredTeams = teams.filter((t) => {
        if (sportCode && t.sport_code !== sportCode) return false;
        if (!q) return true;
        return (t.name || '').toLowerCase().includes(q);
      });

      const statsByTeam = new Map();
      teamSeasonStats.forEach((s) => {
        const existing = statsByTeam.get(s.team_id);
        if (!existing) {
          statsByTeam.set(s.team_id, s);
        } else {
          // Prefer more recent season
          const curSeason = this._getSeasonById(existing.season_id) || {};
          const newSeason = this._getSeasonById(s.season_id) || {};
          if ((newSeason.year || 0) > (curSeason.year || 0)) {
            statsByTeam.set(s.team_id, s);
          }
        }
      });

      const start = (pageNum - 1) * size;
      const end = start + size;

      filteredTeams.slice(start, end).forEach((t) => {
        const stats = statsByTeam.get(t.id) || {};
        const sportName = this._resolveSportNameFromCode(t.sport_code);
        const currentRank = typeof stats.current_rank === 'number' ? stats.current_rank : null;
        teamsResult.push({
          teamId: t.id,
          name: t.name,
          sportCode: t.sport_code,
          sportName,
          currentRank,
          contextLabel: `${sportName} Team · ${t.name}`
        });
      });
    }

    if (includeGames) {
      const games = this._getFromStorage('games');
      const teams = this._getFromStorage('teams');
      const teamsById = new Map(teams.map((t) => [t.id, t]));

      const filteredGames = games.filter((g) => {
        if (sportCode && g.sport_code !== sportCode) return false;
        const home = (teamsById.get(g.home_team_id) || {}).name || '';
        const away = (teamsById.get(g.away_team_id) || {}).name || '';
        if (!q) return true;
        const haystack = `${home} vs ${away}`.toLowerCase();
        return haystack.includes(q);
      });

      const start = (pageNum - 1) * size;
      const end = start + size;

      filteredGames.slice(start, end).forEach((g) => {
        const homeTeam = teamsById.get(g.home_team_id) || {};
        const awayTeam = teamsById.get(g.away_team_id) || {};
        gamesResult.push({
          gameId: g.id,
          sportCode: g.sport_code,
          homeTeamName: homeTeam.name || '',
          awayTeamName: awayTeam.name || '',
          startDatetime: g.start_datetime,
          game: g // foreign key resolution
        });
      });
    }

    if (includeArticles) {
      const articles = this._getFromStorage('articles');
      const filteredArticles = articles.filter((a) => {
        if (sportCode && a.sport_code && a.sport_code !== sportCode) return false;
        if (!q) return true;
        const title = (a.title || '').toLowerCase();
        const excerpt = (a.excerpt || '').toLowerCase();
        return title.includes(q) || excerpt.includes(q);
      });

      const start = (pageNum - 1) * size;
      const end = start + size;

      filteredArticles.slice(start, end).forEach((a) => {
        articlesResult.push({
          articleId: a.id,
          title: a.title,
          excerpt: a.excerpt || '',
          sportCode: a.sport_code || null,
          primaryTopic: a.primary_topic || null,
          publishDate: a.publish_date
        });
      });
    }

    return {
      teams: teamsResult,
      games: gamesResult,
      articles: articlesResult
    };
  }

  // getHomeDashboardData()
  getHomeDashboardData() {
    const games = this._getFromStorage('games');
    const predictions = this._getFromStorage('game_predictions');
    const teams = this._getFromStorage('teams');
    const teamSeasonStats = this._getFromStorage('team_season_stats');
    const articles = this._getFromStorage('articles');
    const sports = this._getFromStorage('sports');

    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const predsByGameId = new Map(predictions.map((p) => [p.game_id, p]));

    // Featured games: upcoming scheduled games with predictions, sorted by start time
    const nowIso = new Date().toISOString();
    const featuredGames = games
      .filter((g) => g.status === 'scheduled' && g.start_datetime >= nowIso && predsByGameId.has(g.id))
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      })
      .slice(0, 10)
      .map((g) => {
        const p = predsByGameId.get(g.id) || {};
        const home = teamsById.get(g.home_team_id) || {};
        const away = teamsById.get(g.away_team_id) || {};
        return {
          gameId: g.id,
          sportCode: g.sport_code,
          sportName: this._resolveSportNameFromCode(g.sport_code),
          homeTeamName: home.name || '',
          awayTeamName: away.name || '',
          startDatetime: g.start_datetime,
          favoriteTeamName: (teamsById.get(p.favorite_team_id) || {}).name || '',
          underdogTeamName: (teamsById.get(p.underdog_team_id) || {}).name || '',
          favoriteWinProbability: p.favorite_win_probability,
          underdogWinProbability: p.underdog_win_probability,
          game: g
        };
      });

    // Rankings snippets by sport
    const statsBySport = new Map();
    teamSeasonStats.forEach((s) => {
      if (typeof s.current_rank !== 'number') return;
      const arr = statsBySport.get(s.sport_code) || [];
      arr.push(s);
      statsBySport.set(s.sport_code, arr);
    });

    const rankingsSnippets = [];
    statsBySport.forEach((stats, sportCode) => {
      const sport = sports.find((sp) => sp.code === sportCode) || null;
      const seasons = this._getFromStorage('seasons');
      const seasonById = new Map(seasons.map((s) => [s.id, s]));

      const topStats = stats
        .slice()
        .sort((a, b) => (a.current_rank || 9999) - (b.current_rank || 9999))
        .slice(0, 5);

      const topTeams = topStats.map((s) => {
        const team = teamsById.get(s.team_id) || {};
        return {
          teamId: team.id,
          teamName: team.name || '',
          currentRank: s.current_rank,
          team
        };
      });

      let seasonLabel = '';
      if (topStats.length) {
        const season = seasonById.get(topStats[0].season_id);
        seasonLabel = (season && season.label) || '';
      }

      rankingsSnippets.push({
        sportCode,
        sportName: (sport && sport.name) || this._resolveSportNameFromCode(sportCode),
        seasonLabel,
        topTeams
      });
    });

    // Recent articles
    const recentArticles = articles
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.publish_date) || new Date(0);
        const db = this._parseDate(b.publish_date) || new Date(0);
        return db - da;
      })
      .slice(0, 10)
      .map((a) => ({
        articleId: a.id,
        title: a.title,
        excerpt: a.excerpt || '',
        sportCode: a.sport_code || null,
        primaryTopic: a.primary_topic || null,
        publishDate: a.publish_date
      }));

    return {
      featuredGames,
      rankingsSnippets,
      recentArticles
    };
  }

  // getSupportedSports()
  getSupportedSports() {
    return this._getFromStorage('sports');
  }

  // getSportHubOverview(sportCode)
  getSportHubOverview(sportCode) {
    const sportName = this._resolveSportNameFromCode(sportCode);
    const currentSeason = this._getCurrentSeasonForSport();
    const currentSeasonLabel = currentSeason ? currentSeason.label : null;

    const teamSeasonStats = this._getFromStorage('team_season_stats').filter(
      (s) => s.sport_code === sportCode
    );
    const teams = this._getFromStorage('teams');
    const teamsById = new Map(teams.map((t) => [t.id, t]));

    let topRankedTeams = teamSeasonStats
      .filter((s) => typeof s.current_rank === 'number')
      .sort((a, b) => (a.current_rank || 9999) - (b.current_rank || 9999))
      .slice(0, 10)
      .map((s) => {
        const team = teamsById.get(s.team_id) || {};
        return {
          teamId: team.id,
          teamName: team.name || '',
          currentRank: s.current_rank,
          rankChangeLast7Days: s.rank_change_last_7_days || 0,
          team
        };
      });

    // Fallback for sports (like football in test data) that lack season stats
    if (!topRankedTeams.length) {
      const sportGames = this._getFromStorage('games').filter(
        (g) => g.sport_code === sportCode
      );
      const seenTeamIds = new Set();
      const fallbackTeams = [];
      sportGames.forEach((g) => {
        [g.home_team_id, g.away_team_id].forEach((tid) => {
          if (!tid || seenTeamIds.has(tid)) return;
          seenTeamIds.add(tid);
          const team = this._getTeamById(tid) || { id: tid, name: tid, sport_code: sportCode };
          fallbackTeams.push({
            teamId: team.id,
            teamName: team.name || '',
            currentRank: null,
            rankChangeLast7Days: 0,
            team
          });
        });
      });
      topRankedTeams = fallbackTeams.slice(0, 10);
    }

    const games = this._getFromStorage('games').filter(
      (g) => g.sport_code === sportCode && g.status === 'scheduled'
    );

    const featuredUpcomingGames = games
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      })
      .slice(0, 10)
      .map((g) => {
        const home = teamsById.get(g.home_team_id) || {};
        const away = teamsById.get(g.away_team_id) || {};
        return {
          gameId: g.id,
          homeTeamName: home.name || '',
          awayTeamName: away.name || '',
          startDatetime: g.start_datetime,
          game: g
        };
      });

    const articles = this._getFromStorage('articles').filter(
      (a) => !a.sport_code || a.sport_code === sportCode
    );

    const recentArticles = articles
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.publish_date) || new Date(0);
        const db = this._parseDate(b.publish_date) || new Date(0);
        return db - da;
      })
      .slice(0, 10)
      .map((a) => ({
        articleId: a.id,
        title: a.title,
        publishDate: a.publish_date,
        primaryTopic: a.primary_topic || null
      }));

    return {
      sportName,
      currentSeasonLabel,
      topRankedTeams,
      featuredUpcomingGames,
      recentArticles
    };
  }

  // getSportPredictions(sportCode, dateRangeStart, dateRangeEnd, minUnderdogWinProbability, maxUnderdogWinProbability, minFavoriteWinProbability, maxFavoriteWinProbability, sortBy, page, pageSize)
  getSportPredictions(
    sportCode,
    dateRangeStart,
    dateRangeEnd,
    minUnderdogWinProbability,
    maxUnderdogWinProbability,
    minFavoriteWinProbability,
    maxFavoriteWinProbability,
    sortBy,
    page,
    pageSize
  ) {
    const games = this._getFromStorage('games').filter(
      (g) => g.sport_code === sportCode && g.status === 'scheduled'
    );
    const predictions = this._getFromStorage('game_predictions');
    const teams = this._getFromStorage('teams');
    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const predsByGameId = new Map(predictions.map((p) => [p.game_id, p]));

    const filtered = games
      .filter((g) => this._isWithinDateRange(g.start_datetime, dateRangeStart, dateRangeEnd))
      .map((g) => {
        const p = predsByGameId.get(g.id);
        return { game: g, prediction: p };
      })
      .filter((gp) => gp.prediction);

    const resultGames = filtered
      .filter(({ prediction }) => {
        if (
          typeof minUnderdogWinProbability === 'number' &&
          prediction.underdog_win_probability < minUnderdogWinProbability
        ) {
          return false;
        }
        if (
          typeof maxUnderdogWinProbability === 'number' &&
          prediction.underdog_win_probability > maxUnderdogWinProbability
        ) {
          return false;
        }
        if (
          typeof minFavoriteWinProbability === 'number' &&
          prediction.favorite_win_probability < minFavoriteWinProbability
        ) {
          return false;
        }
        if (
          typeof maxFavoriteWinProbability === 'number' &&
          prediction.favorite_win_probability > maxFavoriteWinProbability
        ) {
          return false;
        }
        return true;
      })
      .map(({ game, prediction }) => {
        const home = teamsById.get(game.home_team_id) || {};
        const away = teamsById.get(game.away_team_id) || {};
        const favoriteTeam = teamsById.get(prediction.favorite_team_id) || {};
        const underdogTeam = teamsById.get(prediction.underdog_team_id) || {};
        return {
          gameId: game.id,
          homeTeamName: home.name || '',
          awayTeamName: away.name || '',
          startDatetime: game.start_datetime,
          favoriteTeamId: prediction.favorite_team_id,
          favoriteTeamName: favoriteTeam.name || '',
          underdogTeamId: prediction.underdog_team_id,
          underdogTeamName: underdogTeam.name || '',
          favoriteWinProbability: prediction.favorite_win_probability,
          underdogWinProbability: prediction.underdog_win_probability,
          favoriteImpliedOddsMultiplier: prediction.favorite_implied_odds_multiplier,
          underdogImpliedOddsMultiplier: prediction.underdog_implied_odds_multiplier,
          game,
          favoriteTeam,
          underdogTeam
        };
      });

    const sortKey = sortBy || 'start_time_asc';
    resultGames.sort((a, b) => {
      if (sortKey === 'underdog_win_probability_desc') {
        return (b.underdogWinProbability || 0) - (a.underdogWinProbability || 0);
      }
      if (sortKey === 'favorite_win_probability_desc') {
        return (b.favoriteWinProbability || 0) - (a.favoriteWinProbability || 0);
      }
      // default start_time_asc
      const da = this._parseDate(a.startDatetime) || new Date(0);
      const db = this._parseDate(b.startDatetime) || new Date(0);
      return da - db;
    });

    const totalCount = resultGames.length;
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 50;
    const startIdx = (p - 1) * size;
    const pagedGames = resultGames.slice(startIdx, startIdx + size);

    const availableSortOptions = [
      { key: 'start_time_asc', label: 'Start Time (Earliest First)' },
      {
        key: 'underdog_win_probability_desc',
        label: 'Underdog Win Probability (High to Low)'
      },
      {
        key: 'favorite_win_probability_desc',
        label: 'Favorite Win Probability (High to Low)'
      }
    ];

    return {
      games: pagedGames,
      totalCount,
      availableSortOptions
    };
  }

  // getSportRankings(sportCode, seasonId, rankRangeMin, rankRangeMax, conferenceIds, searchTerm, sortMetricCode, sortDirection)
  getSportRankings(
    sportCode,
    seasonId,
    rankRangeMin,
    rankRangeMax,
    conferenceIds,
    searchTerm,
    sortMetricCode,
    sortDirection
  ) {
    const stats = this._getFromStorage('team_season_stats');
    const teams = this._getFromStorage('teams');
    const conferences = this._getFromStorage('conferences');

    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const confById = new Map(conferences.map((c) => [c.id, c]));

    let filtered = stats.filter((s) => s.sport_code === sportCode);

    if (seasonId) {
      filtered = filtered.filter((s) => s.season_id === seasonId);
    }

    if (Array.isArray(conferenceIds) && conferenceIds.length) {
      const set = new Set(conferenceIds);
      filtered = filtered.filter((s) => s.conference_id && set.has(s.conference_id));
    }

    if (typeof rankRangeMin === 'number') {
      filtered = filtered.filter((s) => typeof s.current_rank === 'number' && s.current_rank >= rankRangeMin);
    }
    if (typeof rankRangeMax === 'number') {
      filtered = filtered.filter((s) => typeof s.current_rank === 'number' && s.current_rank <= rankRangeMax);
    }

    // Drop stats rows for teams that are not present in the teams collection
    filtered = filtered.filter((s) => teamsById.has(s.team_id));

    const q = (searchTerm || '').toLowerCase().trim();
    if (q) {
      filtered = filtered.filter((s) => {
        const team = teamsById.get(s.team_id) || {};
        return (team.name || '').toLowerCase().includes(q);
      });
    }

    const metric = sortMetricCode || 'team_rank';
    const dir = (sortDirection || 'asc').toLowerCase();

    const getMetricValue = (s) => {
      if (metric === 'team_rank') return s.current_rank || 9999;
      if (metric === 'offensive_efficiency') return s.offensive_efficiency || 0;
      if (metric === 'defensive_efficiency') return s.defensive_efficiency || 0;
      if (metric === 'overall_rating') return s.overall_rating || 0;
      if (metric === 'rank_change') return s.rank_change_last_7_days || 0;
      return 0;
    };

    filtered.sort((a, b) => {
      const va = getMetricValue(a);
      const vb = getMetricValue(b);
      if (dir === 'desc') return vb - va;
      return va - vb;
    });

    const rankings = filtered.map((s) => {
      const team = teamsById.get(s.team_id) || {};
      const conf = confById.get(s.conference_id) || {};
      return {
        teamId: team.id,
        teamName: team.name || '',
        conferenceName: conf.name || '',
        currentRank: s.current_rank,
        rankPoints: s.rank_points,
        offensiveEfficiency: s.offensive_efficiency,
        defensiveEfficiency: s.defensive_efficiency,
        overallRating: s.overall_rating,
        rankChangeLast7Days: s.rank_change_last_7_days,
        rankChangeLast30Days: s.rank_change_last_30_days,
        team,
        conference: conf,
        seasonId: s.season_id
      };
    });

    const season = this._getSeasonById(seasonId);
    const seasonLabel = (season && season.label) || null;

    return {
      seasonLabel,
      rankings
    };
  }

  // getRankedTeamsUpcomingGames(sportCode, seasonId, rankRangeMin, rankRangeMax, onlyRankedTeamUnderdog, minUnderdogWinProbability, maxUnderdogWinProbability, sortBy)
  getRankedTeamsUpcomingGames(
    sportCode,
    seasonId,
    rankRangeMin,
    rankRangeMax,
    onlyRankedTeamUnderdog,
    minUnderdogWinProbability,
    maxUnderdogWinProbability,
    sortBy
  ) {
    const teamStats = this._getFromStorage('team_season_stats').filter(
      (s) => s.sport_code === sportCode
    );

    let rankedStats = teamStats.filter((s) => typeof s.current_rank === 'number');
    if (seasonId) {
      rankedStats = rankedStats.filter((s) => s.season_id === seasonId);
    }
    if (typeof rankRangeMin === 'number') {
      rankedStats = rankedStats.filter((s) => s.current_rank >= rankRangeMin);
    }
    if (typeof rankRangeMax === 'number') {
      rankedStats = rankedStats.filter((s) => s.current_rank <= rankRangeMax);
    }

    const rankByTeamId = new Map();
    rankedStats.forEach((s) => {
      rankByTeamId.set(s.team_id, s.current_rank);
    });

    const games = this._getFromStorage('games').filter(
      (g) => g.sport_code === sportCode && g.status === 'scheduled'
    );
    const predictions = this._getFromStorage('game_predictions');
    const predsByGameId = new Map(predictions.map((p) => [p.game_id, p]));
    const teams = this._getFromStorage('teams');
    const teamsById = new Map(teams.map((t) => [t.id, t]));

    const results = [];

    games.forEach((g) => {
      const p = predsByGameId.get(g.id);
      if (!p) return;

      const rankedHome = rankByTeamId.has(g.home_team_id);
      const rankedAway = rankByTeamId.has(g.away_team_id);

      const pushGame = (rankedTeamId, opponentTeamId) => {
        const rankedTeamRank = rankByTeamId.get(rankedTeamId);
        if (typeof rankedTeamRank !== 'number') return;

        const isRankedTeamUnderdog = p.underdog_team_id === rankedTeamId;
        if (onlyRankedTeamUnderdog && !isRankedTeamUnderdog) return;

        let underdogWinProbability = null;
        if (p.underdog_team_id === rankedTeamId || p.underdog_team_id === opponentTeamId) {
          underdogWinProbability = p.underdog_win_probability;
        }

        if (typeof minUnderdogWinProbability === 'number') {
          if (underdogWinProbability === null || underdogWinProbability < minUnderdogWinProbability) return;
        }
        if (typeof maxUnderdogWinProbability === 'number') {
          if (underdogWinProbability === null || underdogWinProbability > maxUnderdogWinProbability) return;
        }

        const rankedTeam = teamsById.get(rankedTeamId) || {};
        const opponentTeam = teamsById.get(opponentTeamId) || {};

        results.push({
          gameId: g.id,
          rankedTeamId,
          rankedTeamName: rankedTeam.name || '',
          rankedTeamRank,
          opponentTeamId,
          opponentTeamName: opponentTeam.name || '',
          startDatetime: g.start_datetime,
          isRankedTeamUnderdog,
          underdogWinProbability,
          game: g,
          rankedTeam,
          opponentTeam
        });
      };

      if (rankedHome) pushGame(g.home_team_id, g.away_team_id);
      if (rankedAway) pushGame(g.away_team_id, g.home_team_id);
    });

    const key = sortBy || 'team_rank_asc';
    results.sort((a, b) => {
      if (key === 'team_rank_asc') {
        return (a.rankedTeamRank || 9999) - (b.rankedTeamRank || 9999);
      }
      if (key === 'start_time_asc') {
        const da = this._parseDate(a.startDatetime) || new Date(0);
        const db = this._parseDate(b.startDatetime) || new Date(0);
        return da - db;
      }
      return 0;
    });

    return results;
  }

  // getRankingsExplorerFilters()
  getRankingsExplorerFilters() {
    const sports = this._getFromStorage('sports');
    const seasons = this._getFromStorage('seasons');
    const conferences = this._getFromStorage('conferences');
    const metrics = this._getFromStorage('ranking_metric_definitions');
    return { sports, seasons, conferences, metrics };
  }

  // getRankingsExplorerView(sportCode, seasonId, conferenceIds, rankRangeMin, rankRangeMax, sortMetricCode, sortDirection, savedViewId)
  getRankingsExplorerView(
    sportCode,
    seasonId,
    conferenceIds,
    rankRangeMin,
    rankRangeMax,
    sortMetricCode,
    sortDirection,
    savedViewId
  ) {
    const savedViews = this._getFromStorage('saved_ranking_views');
    const view = savedViews.find((v) => v.id === savedViewId);

    let effSportCode = sportCode;
    let effSeasonId = seasonId;
    let effConferenceIds = conferenceIds;
    let effRankMin = rankRangeMin;
    let effRankMax = rankRangeMax;
    let effSortMetric = sortMetricCode;
    let effSortDir = sortDirection;

    if (view) {
      effSportCode = view.sport_code;
      effSeasonId = view.season_id || effSeasonId;
      effConferenceIds = view.conference_ids || effConferenceIds;
      effRankMin =
        typeof view.rank_range_min === 'number' ? view.rank_range_min : effRankMin;
      effRankMax =
        typeof view.rank_range_max === 'number' ? view.rank_range_max : effRankMax;
      effSortMetric = view.sort_metric_code || effSortMetric;
      effSortDir = view.sort_direction || effSortDir;
    }

    const rankingsResult = this.getSportRankings(
      effSportCode,
      effSeasonId,
      effRankMin,
      effRankMax,
      effConferenceIds,
      null,
      effSortMetric,
      effSortDir
    );

    const appliedView = view
      ? {
          viewId: view.id,
          name: view.name,
          isDefaultForSport: !!view.is_default_for_sport
        }
      : null;

    const teams = rankingsResult.rankings.map((r) => ({
      teamId: r.teamId,
      teamName: r.teamName,
      conferenceName: r.conferenceName,
      currentRank: r.currentRank,
      offensiveEfficiency: r.offensiveEfficiency,
      defensiveEfficiency: r.defensiveEfficiency,
      overallRating: r.overallRating,
      team: r.team,
      conference: r.conference
    }));

    return {
      appliedView,
      teams
    };
  }

  // saveRankingView(name, sportCode, seasonId, conferenceIds, rankRangeMin, rankRangeMax, sortMetricCode, sortDirection, isDefaultForSport)
  saveRankingView(
    name,
    sportCode,
    seasonId,
    conferenceIds,
    rankRangeMin,
    rankRangeMax,
    sortMetricCode,
    sortDirection,
    isDefaultForSport
  ) {
    const views = this._getFromStorage('saved_ranking_views');
    const id = this._generateId('view');
    const now = new Date().toISOString();
    const view = {
      id,
      name,
      sport_code: sportCode,
      season_id: seasonId || null,
      conference_ids: Array.isArray(conferenceIds) ? conferenceIds : [],
      rank_range_min: typeof rankRangeMin === 'number' ? rankRangeMin : null,
      rank_range_max: typeof rankRangeMax === 'number' ? rankRangeMax : null,
      sort_metric_code: sortMetricCode,
      sort_direction: sortDirection,
      is_default_for_sport: !!isDefaultForSport,
      created_at: now
    };

    if (isDefaultForSport) {
      views.forEach((v) => {
        if (v.sport_code === sportCode) v.is_default_for_sport = false;
      });
    }

    views.push(view);
    this._saveToStorage('saved_ranking_views', views);

    const sports = this._getFromStorage('sports');
    const sport = sports.find((s) => s.code === sportCode);
    const season = this._getSeasonById(seasonId);

    return {
      viewId: id,
      name: view.name,
      sportCode,
      sportName: (sport && sport.name) || this._resolveSportNameFromCode(sportCode),
      seasonLabel: (season && season.label) || null,
      isDefaultForSport: !!view.is_default_for_sport
    };
  }

  // getSavedRankingViews()
  getSavedRankingViews() {
    const views = this._getFromStorage('saved_ranking_views');
    const sports = this._getFromStorage('sports');

    return views.map((v) => {
      const sport = sports.find((s) => s.code === v.sport_code);
      return {
        viewId: v.id,
        name: v.name,
        sportCode: v.sport_code,
        sportName: (sport && sport.name) || this._resolveSportNameFromCode(v.sport_code),
        isDefaultForSport: !!v.is_default_for_sport,
        createdAt: v.created_at
      };
    });
  }

  // updateSavedRankingView(viewId, newName, isDefaultForSport)
  updateSavedRankingView(viewId, newName, isDefaultForSport) {
    const views = this._getFromStorage('saved_ranking_views');
    const view = views.find((v) => v.id === viewId);
    if (!view) {
      return { viewId, name: null, isDefaultForSport: false };
    }

    if (typeof newName === 'string' && newName.trim()) {
      view.name = newName.trim();
    }

    if (typeof isDefaultForSport === 'boolean') {
      if (isDefaultForSport) {
        views.forEach((v) => {
          if (v.sport_code === view.sport_code) v.is_default_for_sport = false;
        });
      }
      view.is_default_for_sport = isDefaultForSport;
    }

    this._saveToStorage('saved_ranking_views', views);

    return {
      viewId: view.id,
      name: view.name,
      isDefaultForSport: !!view.is_default_for_sport
    };
  }

  // deleteSavedRankingView(viewId)
  deleteSavedRankingView(viewId) {
    const views = this._getFromStorage('saved_ranking_views');
    const newViews = views.filter((v) => v.id !== viewId);
    this._saveToStorage('saved_ranking_views', newViews);
    return { success: newViews.length !== views.length };
  }

  // getTeamProfile(teamId)
  getTeamProfile(teamId) {
    const team = this._getTeamById(teamId) || {};
    const stats = this._getTeamSeasonStatsForTeam(teamId) || {};

    const games = this._getFromStorage('games');
    const predictions = this._getFromStorage('game_predictions');
    const predsByGameId = new Map(predictions.map((p) => [p.game_id, p]));
    const teams = this._getFromStorage('teams');
    const teamsById = new Map(teams.map((t) => [t.id, t]));

    const upcomingGames = games
      .filter(
        (g) =>
          g.status === 'scheduled' && (g.home_team_id === teamId || g.away_team_id === teamId)
      )
      .map((g) => {
        const p = predsByGameId.get(g.id);
        const isHome = g.home_team_id === teamId;
        const oppTeamId = isHome ? g.away_team_id : g.home_team_id;
        const opp = teamsById.get(oppTeamId) || {};
        let favoriteWinProbability = null;
        let underdogWinProbability = null;
        if (p) {
          if (p.favorite_team_id === teamId) {
            favoriteWinProbability = p.favorite_win_probability;
            underdogWinProbability = p.underdog_win_probability;
          } else if (p.underdog_team_id === teamId) {
            favoriteWinProbability = p.favorite_win_probability;
            underdogWinProbability = p.underdog_win_probability;
          }
        }
        return {
          gameId: g.id,
          opponentTeamName: opp.name || '',
          startDatetime: g.start_datetime,
          isHome,
          favoriteWinProbability,
          underdogWinProbability,
          game: g
        };
      });

    const tagAssignments = this._getFromStorage('team_tag_assignments').filter(
      (t) => t.team_id === teamId
    );
    const tags = tagAssignments.map((t) => t.tag_name);

    const favoriteTeams = this._getFromStorage('favorite_teams');
    const followedTeams = this._getFromStorage('followed_teams');

    const isFavorite = favoriteTeams.some((f) => f.team_id === teamId);
    const isFollowed = followedTeams.some((f) => f.team_id === teamId);

    const listItems = this._getFromStorage('custom_list_items').filter(
      (li) => li.team_id === teamId
    );
    const lists = this._getFromStorage('custom_lists');
    const listsSummary = listItems
      .map((li) => lists.find((l) => l.id === li.list_id))
      .filter(Boolean)
      .map((l) => ({ listSlug: l.slug, listName: l.name }));

    const alerts = this._getFromStorage('alerts').filter((a) => a.team_id === teamId);
    const alertsSummary = alerts.map((a) => ({
      alertId: a.id,
      alertType: a.alert_type,
      conditionDescription:
        a.condition_type === 'drops_below_rank'
          ? `Drops below rank ${a.threshold_rank}`
          : a.condition_type === 'rises_above_rank'
          ? `Rises above rank ${a.threshold_rank}`
          : '',
      isActive: !!a.is_active
    }));

    const conferences = this._getFromStorage('conferences');
    const conf = conferences.find((c) => c.id === stats.conference_id) || {};

    return {
      teamId: team.id,
      teamName: team.name || '',
      shortName: team.short_name || '',
      mascot: team.mascot || '',
      sportCode: team.sport_code || null,
      sportName: this._resolveSportNameFromCode(team.sport_code),
      conferenceName: conf.name || '',
      currentRank: stats.current_rank || null,
      rankChangeLast7Days: stats.rank_change_last_7_days || null,
      rankChangeLast30Days: stats.rank_change_last_30_days || null,
      offensiveEfficiency: stats.offensive_efficiency || null,
      defensiveEfficiency: stats.defensive_efficiency || null,
      overallRating: stats.overall_rating || null,
      upcomingGames,
      tags,
      isFavorite,
      isFollowed,
      lists: listsSummary,
      alertsSummary
    };
  }

  // favoriteTeam(teamId, isFavorite)
  favoriteTeam(teamId, isFavorite) {
    const favorites = this._getFromStorage('favorite_teams');
    const existing = favorites.filter((f) => f.team_id === teamId);

    if (isFavorite) {
      if (!existing.length) {
        favorites.push({
          id: this._generateId('favteam'),
          team_id: teamId,
          favorited_at: new Date().toISOString()
        });
      }
    } else {
      for (let i = favorites.length - 1; i >= 0; i -= 1) {
        if (favorites[i].team_id === teamId) favorites.splice(i, 1);
      }
    }

    this._saveToStorage('favorite_teams', favorites);
    return { teamId, isFavorite: !!isFavorite };
  }

  // followTeam(teamId, isFollowed)
  followTeam(teamId, isFollowed) {
    const follows = this._getFromStorage('followed_teams');
    const existing = follows.filter((f) => f.team_id === teamId);

    if (isFollowed) {
      if (!existing.length) {
        follows.push({
          id: this._generateId('followteam'),
          team_id: teamId,
          followed_at: new Date().toISOString()
        });
      }
    } else {
      for (let i = follows.length - 1; i >= 0; i -= 1) {
        if (follows[i].team_id === teamId) follows.splice(i, 1);
      }
    }

    this._saveToStorage('followed_teams', follows);
    return { teamId, isFollowed: !!isFollowed };
  }

  // addTeamToList(teamId, listSlug, notes)
  addTeamToList(teamId, listSlug, notes) {
    const lists = this._getFromStorage('custom_lists');
    let list = lists.find((l) => l.slug === listSlug);

    if (!list) {
      const now = new Date().toISOString();
      list = {
        id: this._generateId('list'),
        slug: listSlug,
        name: listSlug === 'upset_watch' ? 'Upset Watch' : listSlug,
        description:
          listSlug === 'upset_watch'
            ? 'Ranked teams that may be poised for upsets.'
            : '',
        is_system_list: listSlug === 'upset_watch',
        created_at: now
      };
      lists.push(list);
      this._saveToStorage('custom_lists', lists);
    }

    const items = this._getFromStorage('custom_list_items');
    const exists = items.some((i) => i.list_id === list.id && i.team_id === teamId);
    const now = new Date().toISOString();

    if (!exists) {
      items.push({
        id: this._generateId('listitem'),
        list_id: list.id,
        team_id: teamId,
        added_at: now,
        notes: notes || ''
      });
      this._saveToStorage('custom_list_items', items);
    }

    return {
      listSlug: list.slug,
      listName: list.name,
      teamId,
      addedAt: now
    };
  }

  // addTagToTeam(teamId, tagName)
  addTagToTeam(teamId, tagName) {
    const tags = this._getFromStorage('team_tag_assignments');
    const existing = tags.find(
      (t) => t.team_id === teamId && t.tag_name.toLowerCase() === tagName.toLowerCase()
    );
    if (!existing) {
      tags.push({
        id: this._generateId('teamtag'),
        team_id: teamId,
        tag_name: tagName,
        created_at: new Date().toISOString()
      });
      this._saveToStorage('team_tag_assignments', tags);
    }

    const allTags = tags
      .filter((t) => t.team_id === teamId)
      .map((t) => t.tag_name);

    return {
      teamId,
      tags: allTags
    };
  }

  // createRankingAlert(teamId, alertType, conditionType, thresholdRank, seasonId)
  createRankingAlert(teamId, alertType, conditionType, thresholdRank, seasonId) {
    const alerts = this._getFromStorage('alerts');
    const id = this._generateId('alert');
    const now = new Date().toISOString();

    const alert = {
      id,
      team_id: teamId,
      alert_type: alertType,
      condition_type: conditionType,
      threshold_rank: thresholdRank,
      season_id: seasonId,
      season_label: null,
      is_active: true,
      created_at: now,
      last_triggered_at: null
    };

    const season = this._getSeasonById(seasonId);
    if (season) alert.season_label = season.label;

    alerts.push(alert);
    this._saveToStorage('alerts', alerts);

    const team = this._getTeamById(teamId) || {};

    const conditionDescription =
      conditionType === 'drops_below_rank'
        ? `Drops below rank ${thresholdRank}`
        : conditionType === 'rises_above_rank'
        ? `Rises above rank ${thresholdRank}`
        : '';

    return {
      alertId: id,
      teamId: teamId,
      teamName: team.name || '',
      alertType: alertType,
      conditionDescription,
      seasonLabel: alert.season_label,
      isActive: true
    };
  }

  // getTeamComparisonView(baseTeamId, compareTeamId, periodType, startDate, endDate)
  getTeamComparisonView(baseTeamId, compareTeamId, periodType, startDate, endDate) {
    const aggregates = this._getFromStorage('team_prediction_aggregates');

    const filterAggregate = (teamId) => {
      let aggs = aggregates.filter((a) => a.team_id === teamId && a.period_type === periodType);
      if (periodType === 'custom_range') {
        if (startDate) aggs = aggs.filter((a) => a.start_date === startDate);
        if (endDate) aggs = aggs.filter((a) => a.end_date === endDate);
      }
      if (!aggs.length) return null;
      // if multiple, choose the one with most games
      return aggs.reduce((best, a) => {
        if (!best) return a;
        return (a.games_count || 0) > (best.games_count || 0) ? a : best;
      }, null);
    };

    const baseAgg = filterAggregate(baseTeamId);
    const compareAgg = filterAggregate(compareTeamId);

    const baseTeam = this._getTeamById(baseTeamId) || {};
    const compareTeam = this._getTeamById(compareTeamId) || {};
    const sports = this._getFromStorage('sports');

    const baseSport = sports.find((s) => s.code === baseTeam.sport_code);
    const compareSport = sports.find((s) => s.code === compareTeam.sport_code);

    const base = {
      teamId: baseTeam.id,
      teamName: baseTeam.name || '',
      sportCode: baseTeam.sport_code || null,
      isFavorite: this._getFromStorage('favorite_teams').some(
        (f) => f.team_id === baseTeamId
      ),
      averagePredictedWinProbability:
        (baseAgg && baseAgg.average_predicted_win_probability) || 0,
      gamesCount: (baseAgg && baseAgg.games_count) || 0
    };

    const compare = {
      teamId: compareTeam.id,
      teamName: compareTeam.name || '',
      sportCode: compareTeam.sport_code || null,
      isFavorite: this._getFromStorage('favorite_teams').some(
        (f) => f.team_id === compareTeamId
      ),
      averagePredictedWinProbability:
        (compareAgg && compareAgg.average_predicted_win_probability) || 0,
      gamesCount: (compareAgg && compareAgg.games_count) || 0
    };

    const period = {
      periodType,
      startDate: (baseAgg && baseAgg.start_date) || startDate || null,
      endDate: (baseAgg && baseAgg.end_date) || endDate || null
    };

    return {
      baseTeam: base,
      compareTeam: compare,
      period
    };
  }

  // getGameDetails(gameId)
  getGameDetails(gameId) {
    const game = this._getGameById(gameId) || {};
    const predictions = this._getFromStorage('game_predictions');
    const prediction = predictions.find((p) => p.game_id === gameId) || {};
    const teams = this._getFromStorage('teams');
    const teamsById = new Map(teams.map((t) => [t.id, t]));

    const homeTeam = teamsById.get(game.home_team_id) || {};
    const awayTeam = teamsById.get(game.away_team_id) || {};
    const favoriteTeam = teamsById.get(prediction.favorite_team_id) || {};
    const underdogTeam = teamsById.get(prediction.underdog_team_id) || {};

    const seasons = this._getFromStorage('seasons');
    const season = seasons.find((s) => s.id === game.season_id) || {};

    const watchlist = this._getFromStorage('watchlist_items');
    const isInWatchlist = watchlist.some((w) => w.game_id === gameId);

    return {
      gameId: game.id,
      sportCode: game.sport_code || null,
      sportName: this._resolveSportNameFromCode(game.sport_code),
      seasonLabel: season.label || null,
      homeTeamId: homeTeam.id,
      homeTeamName: homeTeam.name || '',
      awayTeamId: awayTeam.id,
      awayTeamName: awayTeam.name || '',
      homeTeamRank: null,
      awayTeamRank: null,
      startDatetime: game.start_datetime,
      venue: game.venue || '',
      locationCity: game.location_city || '',
      locationState: game.location_state || '',
      isNeutralSite: !!game.is_neutral_site,
      favoriteTeamId: favoriteTeam.id,
      favoriteTeamName: favoriteTeam.name || '',
      underdogTeamId: underdogTeam.id,
      underdogTeamName: underdogTeam.name || '',
      favoriteWinProbability: prediction.favorite_win_probability,
      underdogWinProbability: prediction.underdog_win_probability,
      favoriteImpliedOddsMultiplier: prediction.favorite_implied_odds_multiplier,
      underdogImpliedOddsMultiplier: prediction.underdog_implied_odds_multiplier,
      isInWatchlist,
      game,
      homeTeam,
      awayTeam,
      favoriteTeam,
      underdogTeam
    };
  }

  // addGameToWatchlist(gameId, notes)
  addGameToWatchlist(gameId, notes) {
    const items = this._getFromStorage('watchlist_items');
    const now = new Date().toISOString();
    const existing = items.find((i) => i.game_id === gameId);
    if (existing) {
      existing.notes = notes || existing.notes || '';
      this._saveToStorage('watchlist_items', items);
      return {
        watchlistItemId: existing.id,
        gameId,
        addedAt: existing.added_at
      };
    }

    const id = this._generateId('watch');
    items.push({
      id,
      game_id: gameId,
      added_at: now,
      notes: notes || ''
    });
    this._saveToStorage('watchlist_items', items);

    return {
      watchlistItemId: id,
      gameId,
      addedAt: now
    };
  }

  // getWatchlistItems(sportCode, status, dateRangeStart, dateRangeEnd)
  getWatchlistItems(sportCode, status, dateRangeStart, dateRangeEnd) {
    const items = this._getFromStorage('watchlist_items');
    const games = this._getFromStorage('games');
    const predictions = this._getFromStorage('game_predictions');
    const predsByGameId = new Map(predictions.map((p) => [p.game_id, p]));

    const results = [];

    items.forEach((i) => {
      const game = games.find((g) => g.id === i.game_id);
      if (!game) return;
      if (sportCode && game.sport_code !== sportCode) return;

      if (status) {
        if (status === 'upcoming') {
          if (game.status !== 'scheduled' && game.status !== 'in_progress') return;
        } else if (status === 'completed') {
          if (game.status !== 'completed') return;
        }
      }

      if (!this._isWithinDateRange(game.start_datetime, dateRangeStart, dateRangeEnd)) {
        return;
      }

      const p = predsByGameId.get(game.id) || {};

      const teams = this._getFromStorage('teams');
      const teamsById = new Map(teams.map((t) => [t.id, t]));
      const home = teamsById.get(game.home_team_id) || {};
      const away = teamsById.get(game.away_team_id) || {};

      results.push({
        watchlistItemId: i.id,
        gameId: game.id,
        sportCode: game.sport_code,
        homeTeamName: home.name || '',
        awayTeamName: away.name || '',
        startDatetime: game.start_datetime,
        status: game.status,
        favoriteWinProbability: p.favorite_win_probability,
        underdogWinProbability: p.underdog_win_probability,
        notes: i.notes || '',
        game
      });
    });

    return results;
  }

  // removeWatchlistItem(watchlistItemId)
  removeWatchlistItem(watchlistItemId) {
    const items = this._getFromStorage('watchlist_items');
    const newItems = items.filter((i) => i.id !== watchlistItemId);
    this._saveToStorage('watchlist_items', newItems);
    return { success: newItems.length !== items.length };
  }

  // getMyTeams(sportCode, relationshipType)
  getMyTeams(sportCode, relationshipType) {
    const favorites = this._getFromStorage('favorite_teams');
    const follows = this._getFromStorage('followed_teams');
    const tags = this._getFromStorage('team_tag_assignments');
    const teams = this._getFromStorage('teams');
    const sports = this._getFromStorage('sports');

    const favoriteSet = new Set(favorites.map((f) => f.team_id));
    const followSet = new Set(follows.map((f) => f.team_id));
    const tagByTeam = new Map();
    tags.forEach((t) => {
      const arr = tagByTeam.get(t.team_id) || [];
      arr.push(t.tag_name);
      tagByTeam.set(t.team_id, arr);
    });

    const allTeamIds = new Set([
      ...favoriteSet,
      ...followSet,
      ...Array.from(tagByTeam.keys())
    ]);

    const result = [];

    allTeamIds.forEach((teamId) => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;
      if (sportCode && team.sport_code !== sportCode) return;

      const isFavorite = favoriteSet.has(teamId);
      const isFollowed = followSet.has(teamId);
      const teamTags = tagByTeam.get(teamId) || [];

      if (relationshipType === 'favorite' && !isFavorite) return;
      if (relationshipType === 'followed' && !isFollowed) return;
      if (relationshipType === 'tagged' && !teamTags.length) return;

      const sport = sports.find((s) => s.code === team.sport_code);
      const stat = this._getTeamSeasonStatsForTeam(teamId) || {};

      result.push({
        teamId,
        teamName: team.name || '',
        sportCode: team.sport_code,
        sportName: (sport && sport.name) || this._resolveSportNameFromCode(team.sport_code),
        currentRank: stat.current_rank || null,
        isFavorite,
        isFollowed,
        tags: teamTags,
        team
      });
    });

    return result;
  }

  // getBettingSimulatorGames(sportCodes, dateRangeStart, dateRangeEnd, minFavoriteWinProbability, sortBy, page, pageSize)
  getBettingSimulatorGames(
    sportCodes,
    dateRangeStart,
    dateRangeEnd,
    minFavoriteWinProbability,
    sortBy,
    page,
    pageSize
  ) {
    const sportsSet = new Set(Array.isArray(sportCodes) ? sportCodes : []);
    const games = this._getFromStorage('games');
    const predictions = this._getFromStorage('game_predictions');
    const predsByGameId = new Map(predictions.map((p) => [p.game_id, p]));
    const teams = this._getFromStorage('teams');
    const teamsById = new Map(teams.map((t) => [t.id, t]));

    const filtered = games
      .filter((g) => {
        if (!sportsSet.size || !sportsSet.has(g.sport_code)) return false;
        if (g.status !== 'scheduled') return false;
        if (!this._isWithinDateRange(g.start_datetime, dateRangeStart, dateRangeEnd)) {
          return false;
        }
        const p = predsByGameId.get(g.id);
        if (!p) return false;
        if (
          typeof minFavoriteWinProbability === 'number' &&
          p.favorite_win_probability < minFavoriteWinProbability
        ) {
          return false;
        }
        return true;
      })
      .map((g) => {
        const p = predsByGameId.get(g.id) || {};
        const home = teamsById.get(g.home_team_id) || {};
        const away = teamsById.get(g.away_team_id) || {};
        const favoriteTeam = teamsById.get(p.favorite_team_id) || {};
        return {
          gameId: g.id,
          sportCode: g.sport_code,
          homeTeamName: home.name || '',
          awayTeamName: away.name || '',
          startDatetime: g.start_datetime,
          favoriteTeamId: p.favorite_team_id,
          favoriteTeamName: favoriteTeam.name || '',
          favoriteWinProbability: p.favorite_win_probability,
          legOddsMultiplier: p.favorite_implied_odds_multiplier,
          game: g,
          favoriteTeam
        };
      });

    const key = sortBy || 'payout_multiplier_asc';
    filtered.sort((a, b) => {
      if (key === 'favorite_win_probability_desc') {
        return (b.favoriteWinProbability || 0) - (a.favoriteWinProbability || 0);
      }
      // default payout_multiplier_asc
      return (a.legOddsMultiplier || 0) - (b.legOddsMultiplier || 0);
    });

    const totalCount = filtered.length;
    const p = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 100;
    const startIdx = (p - 1) * size;
    const gamesPage = filtered.slice(startIdx, startIdx + size);

    return {
      games: gamesPage,
      totalCount
    };
  }

  // calculateParlayPayout(legs, stakeAmount)
  calculateParlayPayout(legs, stakeAmount) {
    const predictions = this._getFromStorage('game_predictions');
    const predsByGameId = new Map(predictions.map((p) => [p.game_id, p]));

    const enrichedLegs = [];
    let totalMultiplier = 1;

    (legs || []).forEach((leg) => {
      const gameId = leg.gameId;
      const selectedTeamId = leg.selectedTeamId;
      const p = predsByGameId.get(gameId) || {};

      let winProbability = null;
      let legOddsMultiplier = null;

      if (p.favorite_team_id === selectedTeamId) {
        winProbability = p.favorite_win_probability;
        legOddsMultiplier = p.favorite_implied_odds_multiplier;
      } else if (p.underdog_team_id === selectedTeamId) {
        winProbability = p.underdog_win_probability;
        legOddsMultiplier = p.underdog_implied_odds_multiplier;
      }

      if (typeof legOddsMultiplier === 'number') {
        totalMultiplier *= legOddsMultiplier;
      }

      enrichedLegs.push({
        gameId,
        selectedTeamId,
        winProbability,
        legOddsMultiplier
      });
    });

    const stake = typeof stakeAmount === 'number' ? stakeAmount : 0;
    const projectedReturn = stake * totalMultiplier;

    return {
      totalPayoutMultiplier: totalMultiplier,
      projectedReturn,
      legs: enrichedLegs
    };
  }

  // saveParlay(name, stakeAmount, totalPayoutMultiplier, legs)
  saveParlay(name, stakeAmount, totalPayoutMultiplier, legs) {
    const parlays = this._getFromStorage('betting_parlays');
    const parlayLegs = this._getFromStorage('betting_parlay_legs');

    const parlayId = this._generateId('parlay');
    const now = new Date().toISOString();

    const parlay = {
      id: parlayId,
      name,
      stake_amount: stakeAmount,
      total_payout_multiplier: totalPayoutMultiplier,
      status: 'saved',
      created_at: now,
      updated_at: now
    };
    parlays.push(parlay);

    (legs || []).forEach((leg) => {
      parlayLegs.push({
        id: this._generateId('parlayleg'),
        parlay_id: parlayId,
        game_id: leg.gameId,
        selected_team_id: leg.selectedTeamId,
        win_probability: leg.winProbability,
        leg_odds_multiplier: leg.legOddsMultiplier,
        created_at: now
      });
    });

    this._saveToStorage('betting_parlays', parlays);
    this._saveToStorage('betting_parlay_legs', parlayLegs);

    return {
      parlayId,
      name,
      stakeAmount,
      totalPayoutMultiplier,
      status: 'saved'
    };
  }

  // getListsOverview()
  getListsOverview() {
    const lists = this._getFromStorage('custom_lists');
    const items = this._getFromStorage('custom_list_items');

    return lists.map((l) => {
      const teamCount = items.filter((i) => i.list_id === l.id).length;
      return {
        listSlug: l.slug,
        name: l.name,
        description: l.description || '',
        isSystemList: !!l.is_system_list,
        teamCount
      };
    });
  }

  // getListTeams(listSlug)
  getListTeams(listSlug) {
    const lists = this._getFromStorage('custom_lists');
    const list = lists.find((l) => l.slug === listSlug);
    if (!list) {
      return {
        listSlug,
        name: '',
        description: '',
        teams: []
      };
    }

    const items = this._getFromStorage('custom_list_items').filter(
      (i) => i.list_id === list.id
    );
    const teams = this._getFromStorage('teams');
    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const sports = this._getFromStorage('sports');
    const stats = this._getFromStorage('team_season_stats');
    const statsByTeam = new Map();
    stats.forEach((s) => {
      const existing = statsByTeam.get(s.team_id);
      if (!existing || (s.current_rank || 9999) < (existing.current_rank || 9999)) {
        statsByTeam.set(s.team_id, s);
      }
    });

    const games = this._getFromStorage('games');

    const teamEntries = items.map((i) => {
      const team = teamsById.get(i.team_id) || {};
      const sport = sports.find((s) => s.code === team.sport_code);
      const stat = statsByTeam.get(i.team_id) || {};

      // Find next upcoming game
      const futureGames = games
        .filter(
          (g) =>
            g.status === 'scheduled' &&
            (g.home_team_id === i.team_id || g.away_team_id === i.team_id)
        )
        .sort((a, b) => {
          const da = this._parseDate(a.start_datetime) || new Date(0);
          const db = this._parseDate(b.start_datetime) || new Date(0);
          return da - db;
        });

      let upcomingGame = null;
      if (futureGames.length) {
        const g = futureGames[0];
        const oppId = g.home_team_id === i.team_id ? g.away_team_id : g.home_team_id;
        const opp = teamsById.get(oppId) || {};
        upcomingGame = {
          gameId: g.id,
          opponentTeamName: opp.name || '',
          startDatetime: g.start_datetime,
          game: g
        };
      }

      const tagAssignments = this._getFromStorage('team_tag_assignments').filter(
        (t) => t.team_id === i.team_id
      );
      const tags = tagAssignments.map((t) => t.tag_name);

      return {
        teamId: team.id,
        teamName: team.name || '',
        sportCode: team.sport_code,
        sportName: (sport && sport.name) || this._resolveSportNameFromCode(team.sport_code),
        currentRank: stat.current_rank || null,
        upcomingGame,
        notes: i.notes || '',
        tags,
        team
      };
    });

    return {
      listSlug: list.slug,
      name: list.name,
      description: list.description || '',
      teams: teamEntries
    };
  }

  // removeTeamFromList(listSlug, teamId)
  removeTeamFromList(listSlug, teamId) {
    const lists = this._getFromStorage('custom_lists');
    const list = lists.find((l) => l.slug === listSlug);
    if (!list) return { success: false };

    const items = this._getFromStorage('custom_list_items');
    const newItems = items.filter((i) => !(i.list_id === list.id && i.team_id === teamId));
    this._saveToStorage('custom_list_items', newItems);
    return { success: newItems.length !== items.length };
  }

  // updateListItemNotes(listSlug, teamId, notes)
  updateListItemNotes(listSlug, teamId, notes) {
    const lists = this._getFromStorage('custom_lists');
    const list = lists.find((l) => l.slug === listSlug);
    if (!list) return { listSlug, teamId, notes: '' };

    const items = this._getFromStorage('custom_list_items');
    const item = items.find((i) => i.list_id === list.id && i.team_id === teamId);
    if (item) {
      item.notes = notes || '';
      this._saveToStorage('custom_list_items', items);
      return { listSlug, teamId, notes: item.notes };
    }

    return { listSlug, teamId, notes: '' };
  }

  // getInsightsArticles(sportCode, topic, startDate, endDate, sortBy, searchQuery)
  getInsightsArticles(sportCode, topic, startDate, endDate, sortBy, searchQuery) {
    const articles = this._getFromStorage('articles');
    const q = (searchQuery || '').toLowerCase().trim();

    let filtered = articles;
    if (sportCode) {
      filtered = filtered.filter(
        (a) => !a.sport_code || a.sport_code === sportCode
      );
    }
    if (topic) {
      filtered = filtered.filter(
        (a) =>
          a.primary_topic === topic ||
          (Array.isArray(a.tags) && a.tags.some((t) => t === topic))
      );
    }
    if (startDate || endDate) {
      filtered = filtered.filter((a) =>
        this._isWithinDateRange(a.publish_date, startDate, endDate)
      );
    }
    if (q) {
      filtered = filtered.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const excerpt = (a.excerpt || '').toLowerCase();
        return title.includes(q) || excerpt.includes(q);
      });
    }

    const key = sortBy || 'most_recent';
    filtered.sort((a, b) => {
      if (key === 'most_recent' || key === 'most_popular') {
        const da = this._parseDate(a.publish_date) || new Date(0);
        const db = this._parseDate(b.publish_date) || new Date(0);
        return db - da;
      }
      return 0;
    });

    return filtered.map((a) => ({
      articleId: a.id,
      title: a.title,
      excerpt: a.excerpt || '',
      sportCode: a.sport_code || null,
      primaryTopic: a.primary_topic || null,
      tags: a.tags || [],
      publishDate: a.publish_date
    }));
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = articles.find((a) => a.id === articleId) || {};
    const rows = this._getFromStorage('article_table_rows').filter(
      (r) => r.article_id === articleId
    );

    const teams = this._getFromStorage('teams');
    const teamsById = new Map(teams.map((t) => [t.id, t]));

    // Group rows by table_title
    const tablesMap = new Map();
    rows.forEach((r) => {
      const key = r.table_title;
      const arr = tablesMap.get(key) || [];
      arr.push(r);
      tablesMap.set(key, arr);
    });

    const tables = [];
    tablesMap.forEach((rowsArr, title) => {
      const tableRows = rowsArr
        .slice()
        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
        .map((r) => {
          const team = teamsById.get(r.team_id) || {};
          return {
            teamId: r.team_id,
            teamName: team.name || '',
            roundLabel: r.round_label || '',
            upsetProbability: r.upset_probability,
            orderIndex: r.order_index || 0,
            team
          };
        });
      tables.push({ tableTitle: title, rows: tableRows });
    });

    return {
      articleId: article.id,
      title: article.title || '',
      sportCode: article.sport_code || null,
      primaryTopic: article.primary_topic || null,
      tags: article.tags || [],
      publishDate: article.publish_date,
      contentHtml: article.content_html || '',
      tables
    };
  }

  // getAvailableTournaments(sportCode)
  getAvailableTournaments(sportCode) {
    const tournaments = this._getFromStorage('tournaments');
    const sports = this._getFromStorage('sports');
    const seasons = this._getFromStorage('seasons');

    return tournaments
      .filter((t) => !sportCode || t.sport_code === sportCode)
      .map((t) => {
        const sport = sports.find((s) => s.code === t.sport_code);
        const season = seasons.find((s) => s.id === t.season_id);
        return {
          tournamentId: t.id,
          code: t.code,
          name: t.name,
          sportCode: t.sport_code,
          sportName: (sport && sport.name) || this._resolveSportNameFromCode(t.sport_code),
          seasonLabel: (season && season.label) || null,
          startDate: t.start_date || null,
          endDate: t.end_date || null
        };
      });
  }

  // initializeBracket(tournamentId, autoFillStrategy)
  initializeBracket(tournamentId, autoFillStrategy) {
    const strategy = autoFillStrategy || 'none';
    const bracket = this._getCurrentBracketDraft(tournamentId);

    const matchupsTemplates = this._getFromStorage('bracket_template_matchups').filter(
      (m) => m.tournament_id === tournamentId
    );
    const picks = this._getFromStorage('bracket_picks');
    const tournaments = this._getFromStorage('tournaments');
    const tournament = tournaments.find((t) => t.id === tournamentId) || {};
    const teams = this._getFromStorage('teams');
    const teamsById = new Map(teams.map((t) => [t.id, t]));

    // Apply auto-fill if requested
    if (strategy === 'pick_higher_seed') {
      const now = new Date().toISOString();
      let updated = false;
      matchupsTemplates.forEach((m) => {
        const existingPick = picks.find(
          (p) => p.bracket_id === bracket.id && p.matchup_id === m.id
        );
        const team1Seed = m.seed_team1;
        const team2Seed = m.seed_team2;
        let pickedTeamId = null;
        if (typeof team1Seed === 'number' && typeof team2Seed === 'number') {
          pickedTeamId = team1Seed < team2Seed ? m.team1_id : m.team2_id;
        }
        if (!pickedTeamId) return;
        if (existingPick) {
          existingPick.picked_team_id = pickedTeamId;
          existingPick.round_number = m.round_number;
          updated = true;
        } else {
          picks.push({
            id: this._generateId('brpick'),
            bracket_id: bracket.id,
            matchup_id: m.id,
            picked_team_id: pickedTeamId,
            round_number: m.round_number,
            created_at: now
          });
          updated = true;
        }
      });

      if (updated) {
        bracket.is_auto_filled = true;
        bracket.updated_at = new Date().toISOString();
        const brackets = this._getFromStorage('brackets');
        const idx = brackets.findIndex((b) => b.id === bracket.id);
        if (idx >= 0) {
          brackets[idx] = bracket;
          this._saveToStorage('brackets', brackets);
        }
        this._saveToStorage('bracket_picks', picks);
      }
    }

    const matchups = matchupsTemplates.map((m) => {
      const pick = picks.find(
        (p) => p.bracket_id === bracket.id && p.matchup_id === m.id
      );
      const team1 = teamsById.get(m.team1_id) || {};
      const team2 = teamsById.get(m.team2_id) || {};
      return {
        matchupId: m.id,
        roundNumber: m.round_number,
        region: m.region || '',
        slotCode: m.slot_code,
        seedTeam1: m.seed_team1,
        seedTeam2: m.seed_team2,
        team1Id: m.team1_id,
        team1Name: team1.name || '',
        team1WinProbability: m.team1_win_probability,
        team2Id: m.team2_id,
        team2Name: team2.name || '',
        team2WinProbability: m.team2_win_probability,
        pickedTeamId: pick ? pick.picked_team_id : null,
        team1,
        team2
      };
    });

    return {
      bracketId: bracket.id,
      tournamentId: tournament.id,
      tournamentName: tournament.name || '',
      isAutoFilled: !!bracket.is_auto_filled,
      matchups
    };
  }

  // updateBracketPick(bracketId, matchupId, pickedTeamId)
  updateBracketPick(bracketId, matchupId, pickedTeamId) {
    const picks = this._getFromStorage('bracket_picks');
    const now = new Date().toISOString();
    const existing = picks.find(
      (p) => p.bracket_id === bracketId && p.matchup_id === matchupId
    );

    const matchupsTemplates = this._getFromStorage('bracket_template_matchups');
    const matchup = matchupsTemplates.find((m) => m.id === matchupId) || {};

    if (existing) {
      existing.picked_team_id = pickedTeamId;
      existing.round_number = matchup.round_number || existing.round_number;
    } else {
      picks.push({
        id: this._generateId('brpick'),
        bracket_id: bracketId,
        matchup_id: matchupId,
        picked_team_id: pickedTeamId,
        round_number: matchup.round_number || 1,
        created_at: now
      });
    }

    this._saveToStorage('bracket_picks', picks);

    return {
      bracketId,
      matchupId,
      pickedTeamId
    };
  }

  // saveBracket(bracketId, name)
  saveBracket(bracketId, name) {
    const brackets = this._getFromStorage('brackets');
    const bracket = brackets.find((b) => b.id === bracketId);
    if (!bracket) {
      return {
        bracketId,
        name: '',
        tournamentId: null,
        tournamentName: '',
        isAutoFilled: false
      };
    }

    bracket.name = name;
    bracket.updated_at = new Date().toISOString();
    this._saveToStorage('brackets', brackets);

    const tournaments = this._getFromStorage('tournaments');
    const tournament = tournaments.find((t) => t.id === bracket.tournament_id) || {};

    return {
      bracketId: bracket.id,
      name: bracket.name,
      tournamentId: bracket.tournament_id,
      tournamentName: tournament.name || '',
      isAutoFilled: !!bracket.is_auto_filled
    };
  }

  // getAlerts()
  getAlerts() {
    const alerts = this._getFromStorage('alerts');
    const teams = this._getFromStorage('teams');
    const seasons = this._getFromStorage('seasons');

    const teamsById = new Map(teams.map((t) => [t.id, t]));
    const seasonsById = new Map(seasons.map((s) => [s.id, s]));

    return alerts.map((a) => {
      const team = teamsById.get(a.team_id) || {};
      const season = seasonsById.get(a.season_id) || {};
      return {
        alertId: a.id,
        teamId: a.team_id,
        teamName: team.name || '',
        sportCode: team.sport_code || null,
        alertType: a.alert_type,
        conditionType: a.condition_type,
        thresholdRank: a.threshold_rank,
        seasonLabel: a.season_label || season.label || null,
        isActive: !!a.is_active,
        createdAt: a.created_at,
        lastTriggeredAt: a.last_triggered_at || null,
        team,
        season
      };
    });
  }

  // updateAlertStatus(alertId, isActive)
  updateAlertStatus(alertId, isActive) {
    const alerts = this._getFromStorage('alerts');
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) return { alertId, isActive: false };

    alert.is_active = !!isActive;
    this._saveToStorage('alerts', alerts);
    return { alertId, isActive: !!alert.is_active };
  }

  // updateAlert(alertId, conditionType, thresholdRank, seasonId)
  updateAlert(alertId, conditionType, thresholdRank, seasonId) {
    const alerts = this._getFromStorage('alerts');
    const alert = alerts.find((a) => a.id === alertId);
    if (!alert) {
      return {
        alertId,
        conditionType: null,
        thresholdRank: null,
        seasonLabel: null
      };
    }

    if (conditionType) alert.condition_type = conditionType;
    if (typeof thresholdRank === 'number') alert.threshold_rank = thresholdRank;
    if (seasonId) {
      alert.season_id = seasonId;
      const season = this._getSeasonById(seasonId);
      alert.season_label = (season && season.label) || alert.season_label;
    }

    this._saveToStorage('alerts', alerts);

    return {
      alertId: alert.id,
      conditionType: alert.condition_type,
      thresholdRank: alert.threshold_rank,
      seasonLabel: alert.season_label || null
    };
  }

  // deleteAlert(alertId)
  deleteAlert(alertId) {
    const alerts = this._getFromStorage('alerts');
    const newAlerts = alerts.filter((a) => a.id !== alertId);
    this._saveToStorage('alerts', newAlerts);
    return { success: newAlerts.length !== alerts.length };
  }

  // getRankingTrends(sportCode, seasonId, timePeriod, rankChangeFilter, sortBy)
  getRankingTrends(sportCode, seasonId, timePeriod, rankChangeFilter, sortBy) {
    const stats = this._getFromStorage('team_season_stats');
    const teams = this._getFromStorage('teams');
    const teamsById = new Map(teams.map((t) => [t.id, t]));

    let filtered = stats.filter((s) => s.sport_code === sportCode);
    if (seasonId) {
      const seasonFiltered = filtered.filter((s) => s.season_id === seasonId);
      filtered = seasonFiltered.length ? seasonFiltered : filtered;
    }

    const isLast7 = timePeriod === 'last_7_days';
    const isLast30 = timePeriod === 'last_30_days';

    const getChange = (s) => {
      if (isLast7) return s.rank_change_last_7_days || 0;
      if (isLast30) return s.rank_change_last_30_days || 0;
      return s.rank_change_last_7_days || 0;
    };

    if (rankChangeFilter === 'gained_5_plus_spots') {
      filtered = filtered.filter((s) => getChange(s) >= 5);
    }

    const key = sortBy || 'biggest_rise';
    filtered.sort((a, b) => {
      const ca = getChange(a);
      const cb = getChange(b);
      if (key === 'biggest_drop') return ca - cb; // most negative first
      return cb - ca; // biggest rise first
    });

    return filtered.map((s) => {
      const team = teamsById.get(s.team_id) || this._getTeamById(s.team_id) || {};
      return {
        teamId: team.id,
        teamName: team.name || '',
        currentRank: s.current_rank || null,
        rankChange: getChange(s),
        team
      };
    });
  }

  // getAboutContent()
  getAboutContent() {
    const content = this._getFromStorage('about_content');
    return content;
  }

  // getHelpContent(sectionSlug)
  getHelpContent(sectionSlug) {
    const content = this._getFromStorage('help_content');
    const sections = content.sections || [];
    const faqs = content.faqs || [];

    const filteredSections = sectionSlug
      ? sections.filter((s) => s.sectionSlug === sectionSlug)
      : sections;

    return {
      sections: filteredSections,
      faqs
    };
  }

  // submitContactRequest(name, email, category, subject, message)
  submitContactRequest(name, email, category, subject, message) {
    const requests = this._getFromStorage('contact_requests');
    const id = this._generateId('contact');
    const now = new Date().toISOString();

    requests.push({
      id,
      name,
      email,
      category,
      subject: subject || '',
      message,
      created_at: now
    });

    this._saveToStorage('contact_requests', requests);

    return {
      success: true,
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