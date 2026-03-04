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
    this._getNextIdCounter(); // ensure idCounter exists
  }

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const arrayKeys = [
      'sport_categories',
      'teams',
      'competitions',
      'matches',
      'articles',
      'article_comments',
      'tags',
      'tag_follow_preferences',
      'betting_tips',
      'saved_betting_tips',
      'betting_markets',
      'bet_slips',
      'bet_slip_selections',
      'feed_preferences',
      'reading_list_items',
      'live_blogs',
      'live_comments',
      'my_calendar_items',
      'podcast_episodes',
      'playlist_items',
      'contact_messages'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('user_profile')) {
      localStorage.setItem(
        'user_profile',
        JSON.stringify({ username: '', displayName: '' })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('current_bet_slip_id')) {
      localStorage.setItem('current_bet_slip_id', '');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  // -------------------- Generic helpers --------------------

  _parseDate(value) {
    return value ? new Date(value) : null;
  }

  _startOfDay(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    return d;
  }

  _endOfDay(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    return d;
  }

  _isSameDate(d1, d2) {
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  }

  _getTimeframeRange(timeframe) {
    if (!timeframe) return null;
    const now = new Date();
    const todayStart = this._startOfDay(now);
    const todayEnd = this._endOfDay(now);

    if (timeframe === 'hoje') {
      return { from: todayStart, to: todayEnd };
    }
    if (timeframe === 'amanha') {
      const t = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      return { from: this._startOfDay(t), to: this._endOfDay(t) };
    }
    if (timeframe === 'este_fim_de_semana') {
      // upcoming Saturday and Sunday
      const day = now.getDay(); // 0=Sun
      let daysUntilSaturday = (6 - day + 7) % 7;
      if (daysUntilSaturday === 0 && now > this._endOfDay(now)) {
        daysUntilSaturday = 7;
      }
      const saturday = new Date(now.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
      const sunday = new Date(saturday.getTime() + 1 * 24 * 60 * 60 * 1000);
      return { from: this._startOfDay(saturday), to: this._endOfDay(sunday) };
    }
    return null;
  }

  _getPodcastDateRange(presetKey) {
    if (!presetKey) return null;
    const now = new Date();
    if (presetKey === 'ultimos_7_dias') {
      const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from, to: now };
    }
    if (presetKey === 'ultimos_30_dias') {
      const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { from, to: now };
    }
    return null;
  }

  _ensureArray(val) {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
  }

  _arraysIntersect(a, b) {
    if (!a || !b) return false;
    for (let i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) !== -1) return true;
    }
    return false;
  }

  // Resolve foreign keys in Match objects (add homeTeam, awayTeam, competition)
  _hydrateMatch(match, teamsById, competitionsById) {
    if (!match) return null;
    const hydrated = Object.assign({}, match);
    hydrated.homeTeam = teamsById[match.homeTeamId] || null;
    hydrated.awayTeam = teamsById[match.awayTeamId] || null;
    hydrated.competition = competitionsById[match.competitionId] || null;
    return hydrated;
  }

  // -------------------- Required internal helpers --------------------

  _getOrCreateFeedPreferences() {
    let prefsList = this._getFromStorage('feed_preferences', []);
    let prefs = prefsList[0];
    if (!prefs) {
      prefs = {
        id: this._generateId('feedpref'),
        followedTeamIds: [],
        hiddenSports: [],
        showBettingContent: true,
        showTrainingContent: true,
        showPodcasts: true,
        displayName: ''
      };
      prefsList.push(prefs);
      this._saveToStorage('feed_preferences', prefsList);
    }
    return prefs;
  }

  _getOrCreateProfile() {
    const raw = localStorage.getItem('user_profile');
    let profile;
    if (!raw) {
      profile = { username: '', displayName: '' };
      localStorage.setItem('user_profile', JSON.stringify(profile));
    } else {
      try {
        profile = JSON.parse(raw);
      } catch (e) {
        profile = { username: '', displayName: '' };
        localStorage.setItem('user_profile', JSON.stringify(profile));
      }
    }
    return profile;
  }

  _getOrCreateCurrentBetSlip() {
    const betSlips = this._getFromStorage('bet_slips', []);
    let currentId = localStorage.getItem('current_bet_slip_id') || '';
    let slip = null;

    if (currentId) {
      for (let i = 0; i < betSlips.length; i++) {
        if (betSlips[i].id === currentId) {
          slip = betSlips[i];
          break;
        }
      }
    }

    if (!slip) {
      // try to find any draft slip
      for (let i = 0; i < betSlips.length; i++) {
        if (betSlips[i].status === 'draft') {
          slip = betSlips[i];
          currentId = slip.id;
          break;
        }
      }
    }

    if (!slip) {
      slip = {
        id: this._generateId('betslip'),
        type: 'accumulator',
        createdAt: new Date().toISOString(),
        stakeAmount: 0,
        potentialPayout: 0,
        status: 'draft'
      };
      betSlips.push(slip);
      this._saveToStorage('bet_slips', betSlips);
      localStorage.setItem('current_bet_slip_id', slip.id);
    } else if (!currentId) {
      localStorage.setItem('current_bet_slip_id', slip.id);
    }

    return slip;
  }

  _recalculateBetSlipPayout(betSlip) {
    if (!betSlip) return null;
    const betSlips = this._getFromStorage('bet_slips', []);
    const selections = this._getFromStorage('bet_slip_selections', []);
    const slipSelections = selections.filter(function (s) {
      return s.betSlipId === betSlip.id;
    });

    const stake = Number(betSlip.stakeAmount) || 0;
    let potential = 0;

    if (stake > 0 && slipSelections.length > 0) {
      if (betSlip.type === 'single') {
        let sum = 0;
        for (let i = 0; i < slipSelections.length; i++) {
          sum += stake * Number(slipSelections[i].odds || 0);
        }
        potential = sum;
      } else {
        let product = 1;
        for (let i = 0; i < slipSelections.length; i++) {
          product *= Number(slipSelections[i].odds || 1);
        }
        potential = stake * product;
      }
    }

    // update stored slip
    for (let i = 0; i < betSlips.length; i++) {
      if (betSlips[i].id === betSlip.id) {
        betSlips[i].stakeAmount = stake;
        betSlips[i].potentialPayout = potential;
        // if stake set, treat as simulation
        betSlips[i].status = stake > 0 ? 'simulation' : 'draft';
        betSlip = betSlips[i];
        break;
      }
    }

    this._saveToStorage('bet_slips', betSlips);
    return betSlip;
  }

  _getOrCreateMyCalendar() {
    // storage already initialized; just return the array
    return this._getFromStorage('my_calendar_items', []);
  }

  _getOrCreateSavedLists() {
    const savedBettingTips = this._getFromStorage('saved_betting_tips', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const playlistItems = this._getFromStorage('playlist_items', []);
    return { savedBettingTips, readingListItems, playlistItems };
  }

  // -------------------- Interface implementations --------------------

  // getHomepageFeed()
  getHomepageFeed() {
    const prefs = this._getOrCreateFeedPreferences();
    const articles = this._getFromStorage('articles', []);
    const matches = this._getFromStorage('matches', []);
    const bettingTips = this._getFromStorage('betting_tips', []);
    const podcastEpisodes = this._getFromStorage('podcast_episodes', []);
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);

    const teamsById = {};
    for (let i = 0; i < teams.length; i++) {
      teamsById[teams[i].id] = teams[i];
    }
    const competitionsById = {};
    for (let i = 0; i < competitions.length; i++) {
      competitionsById[competitions[i].id] = competitions[i];
    }

    const hiddenSports = prefs.hiddenSports || [];
    const followedTeamIds = prefs.followedTeamIds || [];

    // topNews: latest news articles, excluding hidden sports
    const newsArticles = articles
      .filter(function (a) {
        if (a.contentType !== 'news') return false;
        if (a.sport && hiddenSports.indexOf(a.sport) !== -1) return false;
        return true;
      })
      .sort(function (a, b) {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      });

    const topNews = [];
    for (let i = 0; i < newsArticles.length && i < 5; i++) {
      const art = newsArticles[i];
      const teamIds = this._ensureArray(art.teamIds || []);
      const primaryTeam = teamIds.length > 0 ? teamsById[teamIds[0]] || null : null;
      const competition = art.competitionId
        ? competitionsById[art.competitionId] || null
        : null;
      topNews.push({ article: art, primaryTeam: primaryTeam, competition: competition });
    }

    // personalizedFeed
    const personalizedFeed = [];

    // Articles / training
    for (let i = 0; i < articles.length; i++) {
      const art = articles[i];
      if (art.sport && hiddenSports.indexOf(art.sport) !== -1) continue;
      const teamIds = this._ensureArray(art.teamIds || []);
      if (
        followedTeamIds.length > 0 &&
        !this._arraysIntersect(teamIds, followedTeamIds)
      ) {
        // if user follows teams, prioritize content related to them
        continue;
      }
      const relatedTeams = [];
      for (let j = 0; j < teamIds.length; j++) {
        const t = teamsById[teamIds[j]];
        if (t) relatedTeams.push(t);
      }
      const competition = art.competitionId
        ? competitionsById[art.competitionId] || null
        : null;
      const card = {
        cardType: art.contentType === 'training' ? 'training' : 'article',
        article: art,
        trainingArticle: art.contentType === 'training' ? art : null,
        bettingTip: null,
        podcastEpisode: null,
        match: null,
        relatedTeams: relatedTeams,
        competition: competition
      };
      personalizedFeed.push(card);
    }

    // Betting tips
    if (prefs.showBettingContent) {
      for (let i = 0; i < bettingTips.length; i++) {
        const tip = bettingTips[i];
        if (hiddenSports.indexOf(tip.sport) !== -1) continue;
        const match = matches.find(function (m) {
          return m.id === tip.matchId;
        });
        const hydratedMatch = this._hydrateMatch(match, teamsById, competitionsById);
        const card = {
          cardType: 'betting_tip',
          article: null,
          trainingArticle: null,
          bettingTip: tip,
          podcastEpisode: null,
          match: hydratedMatch,
          relatedTeams: hydratedMatch
            ? [hydratedMatch.homeTeam, hydratedMatch.awayTeam].filter(Boolean)
            : [],
          competition: hydratedMatch ? hydratedMatch.competition : null
        };
        personalizedFeed.push(card);
      }
    }

    // Podcasts
    if (prefs.showPodcasts) {
      for (let i = 0; i < podcastEpisodes.length; i++) {
        const ep = podcastEpisodes[i];
        const card = {
          cardType: 'podcast',
          article: null,
          trainingArticle: null,
          bettingTip: null,
          podcastEpisode: ep,
          match: null,
          relatedTeams: [],
          competition: null
        };
        personalizedFeed.push(card);
      }
    }

    // Live matches today
    const now = new Date();
    const todayStart = this._startOfDay(now);
    const todayEnd = this._endOfDay(now);
    const liveMatchesToday = [];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const kickoff = this._parseDate(m.kickoffAt);
      if (!kickoff) continue;
      if (kickoff >= todayStart && kickoff <= todayEnd) {
        liveMatchesToday.push(this._hydrateMatch(m, teamsById, competitionsById));
      }
    }

    // Upcoming key matches: next few scheduled
    const upcomingKeyMatches = matches
      .filter(function (m) {
        return m.status === 'scheduled';
      })
      .sort(function (a, b) {
        const da = a.kickoffAt ? new Date(a.kickoffAt).getTime() : 0;
        const db = b.kickoffAt ? new Date(b.kickoffAt).getTime() : 0;
        return da - db;
      })
      .slice(0, 10)
      .map((m) => this._hydrateMatch(m, teamsById, competitionsById));

    // Featured betting tips
    const featuredBettingTips = bettingTips.filter(function (t) {
      return !!t.isFeatured;
    });

    // Training highlights
    const trainingHighlights = articles
      .filter(function (a) {
        return a.contentType === 'training';
      })
      .sort(function (a, b) {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 10);

    // Podcast highlights (latest few)
    const podcastHighlights = podcastEpisodes
      .slice()
      .sort(function (a, b) {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 10);

    const preferencesSummary = {
      followedTeamsCount: followedTeamIds.length,
      hiddenSports: hiddenSports
    };

    // Instrumentation for task completion tracking (Task 2)
    try {
      localStorage.setItem('task2_homeFeedViewed', 'true');
    } catch (e) {
      // swallow instrumentation errors
    }

    return {
      topNews: topNews,
      personalizedFeed: personalizedFeed,
      featuredBettingTips: featuredBettingTips,
      trainingHighlights: trainingHighlights,
      liveMatchesToday: liveMatchesToday,
      upcomingKeyMatches: upcomingKeyMatches,
      podcastHighlights: podcastHighlights,
      preferencesSummary: preferencesSummary
    };
  }

  // searchSiteContent(query, filters)
  searchSiteContent(query, filters) {
    const q = (query || '').toLowerCase();
    const f = filters || {};
    const contentTypes = this._ensureArray(f.contentTypes || []);

    const articles = this._getFromStorage('articles', []);
    const liveBlogs = this._getFromStorage('live_blogs', []);
    const podcastEpisodes = this._getFromStorage('podcast_episodes', []);
    const tags = this._getFromStorage('tags', []);
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);

    const teamsById = {};
    for (let i = 0; i < teams.length; i++) teamsById[teams[i].id] = teams[i];
    const competitionsById = {};
    for (let i = 0; i < competitions.length; i++) competitionsById[competitions[i].id] = competitions[i];

    const sportFilter = f.sport || null;

    const filteredArticles = articles
      .filter(function (a) {
        if (sportFilter && a.sport && a.sport !== sportFilter) return false;
        if (contentTypes.length > 0 && contentTypes.indexOf(a.contentType) === -1) {
          return false;
        }
        const text = ((a.title || '') + ' ' + (a.excerpt || '') + ' ' + (a.body || '')).toLowerCase();
        if (!q) return true;
        if (text.indexOf(q) !== -1) return true;
        const terms = q.split(/\s+/).filter(Boolean);
        for (let i = 0; i < terms.length; i++) {
          if (text.indexOf(terms[i]) !== -1) {
            return true;
          }
        }
        return false;
      })
      .map((a) => {
        const clone = Object.assign({}, a);
        const teamIds = this._ensureArray(clone.teamIds || []);
        clone.teams = teamIds.map((id) => teamsById[id]).filter(Boolean);
        clone.competition = clone.competitionId
          ? competitionsById[clone.competitionId] || null
          : null;
        return clone;
      });

    const filteredLiveBlogs = liveBlogs.filter(function (lb) {
      const text = (lb.title || '').toLowerCase();
      return text.indexOf(q) !== -1;
    });

    const filteredPodcastEpisodes = podcastEpisodes.filter(function (ep) {
      if (
        contentTypes.length > 0 &&
        contentTypes.indexOf('podcast') === -1
      ) {
        return false;
      }
      const text = ((ep.title || '') + ' ' + (ep.description || '')).toLowerCase();
      return text.indexOf(q) !== -1;
    });

    const filteredTags = tags.filter(function (t) {
      const text = ((t.name || '') + ' ' + (t.description || '')).toLowerCase();
      return text.indexOf(q) !== -1;
    });

    // Instrumentation for task completion tracking (Task 4 search)
    try {
      const containsFluminense = q.indexOf('fluminense') !== -1;
      const containsBoca = q.indexOf('boca') !== -1;
      const containsLibertadores = q.indexOf('libertadores') !== -1;
      const hasAnalysisType =
        contentTypes.indexOf('analise') !== -1 ||
        contentTypes.indexOf('pre_jogo') !== -1;

      if (containsFluminense && containsBoca && containsLibertadores && hasAnalysisType) {
        localStorage.setItem(
          'task4_searchParams',
          JSON.stringify({
            query: q,
            contentTypes: contentTypes,
            timestamp: new Date().toISOString()
          })
        );
        const firstTwoIds = filteredArticles.slice(0, 2).map(function (a) {
          return a.id;
        });
        localStorage.setItem('task4_firstTwoResultIds', JSON.stringify(firstTwoIds));
      }
    } catch (e) {
      // swallow instrumentation errors
    }

    return {
      articles: filteredArticles,
      liveBlogs: filteredLiveBlogs,
      podcastEpisodes: filteredPodcastEpisodes,
      tags: filteredTags
    };
  }

  // getBettingTipFilterOptions()
  getBettingTipFilterOptions() {
    const sports = this._getFromStorage('sport_categories', []);
    const competitions = this._getFromStorage('competitions', []).filter(function (c) {
      return c.sport === 'futebol';
    });

    const datePresets = [
      { key: 'hoje', label: 'Hoje' },
      { key: 'amanha', label: 'Amanhã' },
      { key: 'este_fim_de_semana', label: 'Este fim de semana' }
    ];

    const tips = this._getFromStorage('betting_tips', []);
    let min = null;
    let max = null;
    for (let i = 0; i < tips.length; i++) {
      const o = Number(tips[i].odds);
      if (!isNaN(o)) {
        if (min === null || o < min) min = o;
        if (max === null || o > max) max = o;
      }
    }
    const defaultOddsRange = {
      min: min !== null ? min : 1.01,
      max: max !== null ? max : 100
    };

    return { sports: sports, competitions: competitions, datePresets: datePresets, defaultOddsRange: defaultOddsRange };
  }

  // getBettingTips(filters, sortBy)
  getBettingTips(filters, sortBy) {
    const f = filters || {};
    const tips = this._getFromStorage('betting_tips', []);
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const saved = this._getFromStorage('saved_betting_tips', []);

    const matchesById = {};
    const competitionsById = {};
    const teamsById = {};
    for (let i = 0; i < matches.length; i++) matchesById[matches[i].id] = matches[i];
    for (let i = 0; i < competitions.length; i++) competitionsById[competitions[i].id] = competitions[i];
    for (let i = 0; i < teams.length; i++) teamsById[teams[i].id] = teams[i];

    const timeframeRange = f.timeframe ? this._getTimeframeRange(f.timeframe) : null;
    const dateFrom = f.dateFrom ? new Date(f.dateFrom) : null;
    const dateTo = f.dateTo ? new Date(f.dateTo) : null;

    const filteredTips = tips.filter((tip) => {
      if (f.sport && tip.sport !== f.sport) return false;
      if (f.competitionId && tip.competitionId !== f.competitionId) return false;
      if (f.status && tip.status !== f.status) return false;

      if (typeof f.minOdds === 'number' && Number(tip.odds) < f.minOdds) return false;
      if (typeof f.maxOdds === 'number' && Number(tip.odds) > f.maxOdds) return false;

      const refDateStr = tip.tipForDate || (matchesById[tip.matchId] && matchesById[tip.matchId].kickoffAt) || null;
      const refDate = refDateStr ? new Date(refDateStr) : null;
      if (timeframeRange && refDate) {
        if (refDate < timeframeRange.from || refDate > timeframeRange.to) return false;
      }
      if (dateFrom && refDate && refDate < dateFrom) return false;
      if (dateTo && refDate && refDate > dateTo) return false;

      return true;
    });

    if (sortBy === 'tip_for_date_asc') {
      filteredTips.sort(function (a, b) {
        const da = a.tipForDate ? new Date(a.tipForDate).getTime() : 0;
        const db = b.tipForDate ? new Date(b.tipForDate).getTime() : 0;
        return da - db;
      });
    } else if (sortBy === 'tip_for_date_desc') {
      filteredTips.sort(function (a, b) {
        const da = a.tipForDate ? new Date(a.tipForDate).getTime() : 0;
        const db = b.tipForDate ? new Date(b.tipForDate).getTime() : 0;
        return db - da;
      });
    } else if (sortBy === 'odds_desc') {
      filteredTips.sort(function (a, b) {
        return Number(b.odds || 0) - Number(a.odds || 0);
      });
    }

    const resultTips = [];
    for (let i = 0; i < filteredTips.length; i++) {
      const tip = filteredTips[i];
      const match = matchesById[tip.matchId] || null;
      const competition = competitionsById[tip.competitionId] || null;
      const homeTeam = match ? teamsById[match.homeTeamId] || null : null;
      const awayTeam = match ? teamsById[match.awayTeamId] || null : null;
      const isSaved = saved.some(function (s) {
        return s.bettingTipId === tip.id;
      });
      resultTips.push({
        tip: tip,
        match: match,
        competition: competition,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        isSaved: isSaved
      });
    }

    return { tips: resultTips, total: resultTips.length };
  }

  // saveBettingTip(bettingTipId, note)
  saveBettingTip(bettingTipId, note) {
    const tips = this._getFromStorage('betting_tips', []);
    const tip = tips.find(function (t) {
      return t.id === bettingTipId;
    });
    if (!tip) {
      return { savedItem: null, success: false, message: 'Betting tip not found' };
    }
    const saved = this._getFromStorage('saved_betting_tips', []);
    const existing = saved.find(function (s) {
      return s.bettingTipId === bettingTipId;
    });
    if (existing) {
      return { savedItem: existing, success: true, message: 'Already saved' };
    }
    const item = {
      id: this._generateId('savedtip'),
      bettingTipId: bettingTipId,
      savedAt: new Date().toISOString(),
      note: note || ''
    };
    saved.push(item);
    this._saveToStorage('saved_betting_tips', saved);
    return { savedItem: item, success: true, message: 'Saved successfully' };
  }

  // unsaveBettingTip(bettingTipId)
  unsaveBettingTip(bettingTipId) {
    const saved = this._getFromStorage('saved_betting_tips', []);
    const newSaved = saved.filter(function (s) {
      return s.bettingTipId !== bettingTipId;
    });
    const success = newSaved.length !== saved.length;
    this._saveToStorage('saved_betting_tips', newSaved);
    return { success: success, message: success ? 'Removed' : 'Not found' };
  }

  // getSavedBettingTips()
  getSavedBettingTips() {
    const saved = this._getFromStorage('saved_betting_tips', []);
    const tips = this._getFromStorage('betting_tips', []);
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);

    const tipsById = {};
    const matchesById = {};
    const competitionsById = {};
    const teamsById = {};
    for (let i = 0; i < tips.length; i++) tipsById[tips[i].id] = tips[i];
    for (let i = 0; i < matches.length; i++) matchesById[matches[i].id] = matches[i];
    for (let i = 0; i < competitions.length; i++) competitionsById[competitions[i].id] = competitions[i];
    for (let i = 0; i < teams.length; i++) teamsById[teams[i].id] = teams[i];

    const items = [];
    for (let i = 0; i < saved.length; i++) {
      const s = saved[i];
      const tip = tipsById[s.bettingTipId] || null;
      const match = tip ? matchesById[tip.matchId] || null : null;
      const competition = tip ? competitionsById[tip.competitionId] || null : null;
      const homeTeam = match ? teamsById[match.homeTeamId] || null : null;
      const awayTeam = match ? teamsById[match.awayTeamId] || null : null;
      items.push({
        saved: s,
        tip: tip,
        match: match,
        competition: competition,
        homeTeam: homeTeam,
        awayTeam: awayTeam
      });
    }

    // Instrumentation for task completion tracking (Task 1)
    try {
      localStorage.setItem('task1_savedTipsViewed', 'true');
    } catch (e) {
      // swallow instrumentation errors
    }

    return { items: items };
  }

  // getBettingMarketsForSimulator(filters)
  getBettingMarketsForSimulator(filters) {
    const f = filters || {};
    const markets = this._getFromStorage('betting_markets', []);
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);

    const matchesById = {};
    const competitionsById = {};
    const teamsById = {};
    for (let i = 0; i < matches.length; i++) matchesById[matches[i].id] = matches[i];
    for (let i = 0; i < competitions.length; i++) competitionsById[competitions[i].id] = competitions[i];
    for (let i = 0; i < teams.length; i++) teamsById[teams[i].id] = teams[i];

    const filtered = markets.filter(function (m) {
      if (!m.isActive) return false;
      if (f.sport && m.sport !== f.sport) return false;
      if (f.competitionId && m.competitionId && m.competitionId !== f.competitionId) return false;
      return true;
    });

    const result = [];
    for (let i = 0; i < filtered.length; i++) {
      const market = filtered[i];
      const match = matchesById[market.matchId] || null;
      const competition = market.competitionId
        ? competitionsById[market.competitionId] || null
        : match
        ? competitionsById[match.competitionId] || null
        : null;
      const homeTeam = match ? teamsById[match.homeTeamId] || null : null;
      const awayTeam = match ? teamsById[match.awayTeamId] || null : null;
      result.push({
        market: market,
        match: match,
        competition: competition,
        homeTeam: homeTeam,
        awayTeam: awayTeam
      });
    }

    return { markets: result };
  }

  // addSelectionToCurrentBetSlip(bettingMarketId, description)
  addSelectionToCurrentBetSlip(bettingMarketId, description) {
    const markets = this._getFromStorage('betting_markets', []);
    const market = markets.find(function (m) {
      return m.id === bettingMarketId;
    });
    if (!market) {
      return { betSlip: null, selections: [] };
    }

    const slip = this._getOrCreateCurrentBetSlip();
    const selections = this._getFromStorage('bet_slip_selections', []);

    // prevent duplicate selection of same market in same slip
    const exists = selections.some(function (s) {
      return s.betSlipId === slip.id && s.bettingMarketId === bettingMarketId;
    });
    if (!exists) {
      const selection = {
        id: this._generateId('betsel'),
        betSlipId: slip.id,
        bettingMarketId: bettingMarketId,
        matchId: market.matchId,
        description: description || market.selectionName || '',
        odds: market.odds,
        createdAt: new Date().toISOString()
      };
      selections.push(selection);
      this._saveToStorage('bet_slip_selections', selections);
    }

    const updatedSlip = this._recalculateBetSlipPayout(slip);
    const slipSelections = this._getFromStorage('bet_slip_selections', []).filter(function (s) {
      return s.betSlipId === updatedSlip.id;
    });

    return { betSlip: updatedSlip, selections: slipSelections };
  }

  // removeSelectionFromCurrentBetSlip(selectionId)
  removeSelectionFromCurrentBetSlip(selectionId) {
    const selections = this._getFromStorage('bet_slip_selections', []);
    let slipId = null;
    for (let i = 0; i < selections.length; i++) {
      if (selections[i].id === selectionId) {
        slipId = selections[i].betSlipId;
        break;
      }
    }
    const newSelections = selections.filter(function (s) {
      return s.id !== selectionId;
    });
    this._saveToStorage('bet_slip_selections', newSelections);

    let slip = null;
    if (slipId) {
      const betSlips = this._getFromStorage('bet_slips', []);
      for (let i = 0; i < betSlips.length; i++) {
        if (betSlips[i].id === slipId) {
          slip = betSlips[i];
          break;
        }
      }
    }

    if (slip) {
      slip = this._recalculateBetSlipPayout(slip);
      const slipSelections = this._getFromStorage('bet_slip_selections', []).filter(function (s) {
        return s.betSlipId === slip.id;
      });
      return { betSlip: slip, selections: slipSelections };
    }

    // if we cannot resolve slip, return current slip
    const currentSlip = this._getOrCreateCurrentBetSlip();
    const slipSelections = this._getFromStorage('bet_slip_selections', []).filter(function (s) {
      return s.betSlipId === currentSlip.id;
    });
    return { betSlip: currentSlip, selections: slipSelections };
  }

  // setCurrentBetSlipType(type)
  setCurrentBetSlipType(type) {
    const slip = this._getOrCreateCurrentBetSlip();
    const betSlips = this._getFromStorage('bet_slips', []);
    for (let i = 0; i < betSlips.length; i++) {
      if (betSlips[i].id === slip.id) {
        betSlips[i].type = type;
        this._saveToStorage('bet_slips', betSlips);
        const updated = this._recalculateBetSlipPayout(betSlips[i]);
        return { betSlip: updated };
      }
    }
    return { betSlip: slip };
  }

  // setCurrentBetSlipStake(stakeAmount)
  setCurrentBetSlipStake(stakeAmount) {
    const slip = this._getOrCreateCurrentBetSlip();
    const betSlips = this._getFromStorage('bet_slips', []);
    let updatedSlip = slip;
    for (let i = 0; i < betSlips.length; i++) {
      if (betSlips[i].id === slip.id) {
        betSlips[i].stakeAmount = Number(stakeAmount) || 0;
        updatedSlip = betSlips[i];
        break;
      }
    }
    this._saveToStorage('bet_slips', betSlips);
    updatedSlip = this._recalculateBetSlipPayout(updatedSlip);
    const selections = this._getFromStorage('bet_slip_selections', []).filter(function (s) {
      return s.betSlipId === updatedSlip.id;
    });
    return { betSlip: updatedSlip, selections: selections };
  }

  // getCurrentBetSlip()
  getCurrentBetSlip() {
    const slip = this._getOrCreateCurrentBetSlip();
    const updatedSlip = this._recalculateBetSlipPayout(slip);
    const selections = this._getFromStorage('bet_slip_selections', []).filter(function (s) {
      return s.betSlipId === updatedSlip.id;
    });
    return { betSlip: updatedSlip, selections: selections };
  }

  // getTrainingFilterOptions()
  getTrainingFilterOptions() {
    const sports = this._getFromStorage('sport_categories', []);
    const levels = ['iniciante', 'intermediario', 'avancado'];
    const distances = ['5km', '10km', '15km', '21km', '42km', 'outros'];

    const articles = this._getFromStorage('articles', []);
    const topicSet = {};
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (a.contentType === 'training' && Array.isArray(a.trainingTopics)) {
        for (let j = 0; j < a.trainingTopics.length; j++) {
          topicSet[a.trainingTopics[j]] = true;
        }
      }
    }
    const topics = Object.keys(topicSet);

    return { sports: sports, levels: levels, distances: distances, topics: topics };
  }

  // getTrainingArticles(filters, sortBy)
  getTrainingArticles(filters, sortBy) {
    const f = filters || {};
    const articles = this._getFromStorage('articles', []);

    const filtered = articles.filter((a) => {
      if (a.contentType !== 'training') return false;
      if (f.sport && a.sport && a.sport !== f.sport) return false;
      if (f.trainingLevel && a.trainingLevel && a.trainingLevel !== f.trainingLevel) return false;
      if (f.trainingDistance && a.trainingDistance && a.trainingDistance !== f.trainingDistance) {
        return false;
      }
      if (Array.isArray(f.trainingTopics) && f.trainingTopics.length > 0) {
        const articleTopics = this._ensureArray(a.trainingTopics || []);
        if (!this._arraysIntersect(articleTopics, f.trainingTopics)) return false;
      }
      if (
        typeof f.minReadingTimeMinutes === 'number' &&
        typeof a.readingTimeMinutes === 'number' &&
        a.readingTimeMinutes < f.minReadingTimeMinutes
      ) {
        return false;
      }
      return true;
    });

    if (sortBy === 'published_at_desc') {
      filtered.sort(function (a, b) {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      });
    } else if (sortBy === 'reading_time_desc') {
      filtered.sort(function (a, b) {
        return (b.readingTimeMinutes || 0) - (a.readingTimeMinutes || 0);
      });
    }

    return { articles: filtered, total: filtered.length };
  }

  // saveArticleToReadingList(articleId, source)
  saveArticleToReadingList(articleId, source) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(function (a) {
      return a.id === articleId;
    });
    if (!article) {
      return { item: null, success: false, message: 'Article not found' };
    }
    const items = this._getFromStorage('reading_list_items', []);
    const existing = items.find(function (it) {
      return it.articleId === articleId;
    });
    if (existing) {
      return { item: existing, success: true, message: 'Already saved' };
    }
    const item = {
      id: this._generateId('readitem'),
      articleId: articleId,
      savedAt: new Date().toISOString(),
      source: source || 'other'
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);
    return { item: item, success: true, message: 'Saved successfully' };
  }

  // removeFromReadingList(readingListItemId)
  removeFromReadingList(readingListItemId) {
    const items = this._getFromStorage('reading_list_items', []);
    const newItems = items.filter(function (i) {
      return i.id !== readingListItemId;
    });
    const success = newItems.length !== items.length;
    this._saveToStorage('reading_list_items', newItems);
    return { success: success, message: success ? 'Removed' : 'Not found' };
  }

  // getReadingListItems()
  getReadingListItems() {
    const items = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);
    const articlesById = {};
    for (let i = 0; i < articles.length; i++) articlesById[articles[i].id] = articles[i];

    const result = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      result.push({ readingListItem: it, article: articlesById[it.articleId] || null });
    }

    // Instrumentation for task completion tracking (Task 3)
    try {
      localStorage.setItem('task3_readingListViewed', 'true');
    } catch (e) {
      // swallow instrumentation errors
    }

    return { items: result };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const article = articles.find(function (a) {
      return a.id === articleId;
    });

    // Instrumentation for task completion tracking (Task 4 article comparison)
    try {
      const storedFirstTwo = localStorage.getItem('task4_firstTwoResultIds');
      if (storedFirstTwo) {
        const firstTwoIds = JSON.parse(storedFirstTwo);
        if (Array.isArray(firstTwoIds) && firstTwoIds.indexOf(articleId) !== -1) {
          let comparedIds = [];
          const existing = localStorage.getItem('task4_comparedArticleIds');
          if (existing) {
            try {
              const parsedExisting = JSON.parse(existing);
              if (Array.isArray(parsedExisting)) {
                comparedIds = parsedExisting;
              }
            } catch (e2) {
              // ignore parse error, will overwrite with fresh array
            }
          }
          if (comparedIds.indexOf(articleId) === -1) {
            comparedIds.push(articleId);
            localStorage.setItem('task4_comparedArticleIds', JSON.stringify(comparedIds));
          }
        }
      }
    } catch (e) {
      // swallow instrumentation errors
    }

    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const tags = this._getFromStorage('tags', []);
    const comments = this._getFromStorage('article_comments', []);
    const readingList = this._getFromStorage('reading_list_items', []);
    const tagPrefs = this._getFromStorage('tag_follow_preferences', []);
    const feedPrefs = this._getOrCreateFeedPreferences();

    const teamsById = {};
    const competitionsById = {};
    const tagsById = {};
    for (let i = 0; i < teams.length; i++) teamsById[teams[i].id] = teams[i];
    for (let i = 0; i < competitions.length; i++) competitionsById[competitions[i].id] = competitions[i];
    for (let i = 0; i < tags.length; i++) tagsById[tags[i].id] = tags[i];

    if (!article) {
      return {
        article: null,
        teams: [],
        competition: null,
        tags: [],
        commentCount: 0,
        isInReadingList: false,
        followedTeams: [],
        followedTags: []
      };
    }

    const teamIds = this._ensureArray(article.teamIds || []);
    const articleTeams = teamIds.map((id) => teamsById[id]).filter(Boolean);

    const competition = article.competitionId
      ? competitionsById[article.competitionId] || null
      : null;

    const tagIds = this._ensureArray(article.tagIds || []);
    const articleTags = tagIds.map((id) => tagsById[id]).filter(Boolean);

    const commentCountFromEntity = typeof article.commentCount === 'number' ? article.commentCount : null;
    const commentCount = commentCountFromEntity !== null
      ? commentCountFromEntity
      : comments.filter(function (c) {
          return c.articleId === article.id;
        }).length;

    const isInReadingList = readingList.some(function (r) {
      return r.articleId === article.id;
    });

    const followedTeams = (feedPrefs.followedTeamIds || [])
      .map((id) => teamsById[id])
      .filter(Boolean);

    const followedTags = tagPrefs
      .filter(function (p) {
        return p.followed && tagIds.indexOf(p.tagId) !== -1;
      })
      .map(function (p) {
        return tagsById[p.tagId];
      })
      .filter(Boolean);

    return {
      article: article,
      teams: articleTeams,
      competition: competition,
      tags: articleTags,
      commentCount: commentCount,
      isInReadingList: isInReadingList,
      followedTeams: followedTeams,
      followedTags: followedTags
    };
  }

  // getArticleComments(articleId, sortBy, limit, offset)
  getArticleComments(articleId, sortBy, limit, offset) {
    const comments = this._getFromStorage('article_comments', []);
    let filtered = comments.filter(function (c) {
      return c.articleId === articleId;
    });

    if (sortBy === 'created_at_asc') {
      filtered.sort(function (a, b) {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return da - db;
      });
    } else if (sortBy === 'created_at_desc') {
      filtered.sort(function (a, b) {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return db - da;
      });
    }

    const total = filtered.length;
    const off = typeof offset === 'number' ? offset : 0;
    let lim = typeof limit === 'number' ? limit : null;
    if (lim !== null) {
      filtered = filtered.slice(off, off + lim);
    } else if (off > 0) {
      filtered = filtered.slice(off);
    }

    return { comments: filtered, total: total };
  }

  // postArticleComment(articleId, text, displayName)
  postArticleComment(articleId, text, displayName) {
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return { comment: null, success: false, message: 'Empty text', newCommentCount: 0 };
    }

    const profile = this._getOrCreateProfile();
    const finalName = displayName || profile.displayName || profile.username || '';

    const comments = this._getFromStorage('article_comments', []);
    const comment = {
      id: this._generateId('artcmt'),
      articleId: articleId,
      text: trimmed,
      displayName: finalName,
      createdAt: new Date().toISOString(),
      isPinned: false,
      likeCount: 0
    };
    comments.push(comment);
    this._saveToStorage('article_comments', comments);

    // update article.commentCount
    const articles = this._getFromStorage('articles', []);
    let newCount = 0;
    for (let i = 0; i < comments.length; i++) {
      if (comments[i].articleId === articleId) newCount++;
    }
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        articles[i].commentCount = newCount;
        break;
      }
    }
    this._saveToStorage('articles', articles);

    return {
      comment: comment,
      success: true,
      message: 'Comment posted',
      newCommentCount: newCount
    };
  }

  // getLiveMatches(filters)
  getLiveMatches(filters) {
    const f = filters || {};
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const liveBlogs = this._getFromStorage('live_blogs', []);

    const competitionsById = {};
    const teamsById = {};
    const liveBlogByMatchId = {};
    for (let i = 0; i < competitions.length; i++) competitionsById[competitions[i].id] = competitions[i];
    for (let i = 0; i < teams.length; i++) teamsById[teams[i].id] = teams[i];
    for (let i = 0; i < liveBlogs.length; i++) liveBlogByMatchId[liveBlogs[i].matchId] = liveBlogs[i];

    const datePreset = f.datePreset || null;
    const dateStr = f.date || null;

    let fromDate = null;
    let toDate = null;

    if (datePreset === 'hoje' || datePreset === 'amanha') {
      const now = new Date();
      const base = datePreset === 'hoje' ? now : new Date(now.getTime() + 24 * 60 * 60 * 1000);
      fromDate = this._startOfDay(base);
      toDate = this._endOfDay(base);
    } else if (dateStr) {
      const d = new Date(dateStr);
      fromDate = this._startOfDay(d);
      toDate = this._endOfDay(d);
    }

    const teamSearchText = (f.teamIdSearch || '').toLowerCase();

    const result = [];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const kickoff = this._parseDate(m.kickoffAt);
      if (fromDate && kickoff && kickoff < fromDate) continue;
      if (toDate && kickoff && kickoff > toDate) continue;
      if (f.competitionId && m.competitionId !== f.competitionId) continue;

      const homeTeam = teamsById[m.homeTeamId] || null;
      const awayTeam = teamsById[m.awayTeamId] || null;

      if (teamSearchText) {
        const nameMatch =
          (homeTeam && homeTeam.name && homeTeam.name.toLowerCase().indexOf(teamSearchText) !== -1) ||
          (awayTeam && awayTeam.name && awayTeam.name.toLowerCase().indexOf(teamSearchText) !== -1);
        if (!nameMatch) continue;
      }

      const competition = competitionsById[m.competitionId] || null;
      const liveBlog = liveBlogByMatchId[m.id] || null;

      result.push({
        match: this._hydrateMatch(m, teamsById, competitionsById),
        competition: competition,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        liveBlog: liveBlog
      });
    }

    return { matches: result };
  }

  // getLiveBlogDetail(liveBlogId)
  getLiveBlogDetail(liveBlogId) {
    const liveBlogs = this._getFromStorage('live_blogs', []);
    const matches = this._getFromStorage('matches', []);
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const comments = this._getFromStorage('live_comments', []);

    const liveBlog = liveBlogs.find(function (lb) {
      return lb.id === liveBlogId;
    });

    const teamsById = {};
    const competitionsById = {};
    const matchesById = {};
    for (let i = 0; i < teams.length; i++) teamsById[teams[i].id] = teams[i];
    for (let i = 0; i < competitions.length; i++) competitionsById[competitions[i].id] = competitions[i];
    for (let i = 0; i < matches.length; i++) matchesById[matches[i].id] = matches[i];

    let match = null;
    let homeTeam = null;
    let awayTeam = null;
    let competition = null;

    if (liveBlog) {
      match = matchesById[liveBlog.matchId] || null;
      if (match) {
        match = this._hydrateMatch(match, teamsById, competitionsById);
        homeTeam = teamsById[match.homeTeamId] || null;
        awayTeam = teamsById[match.awayTeamId] || null;
        competition = competitionsById[match.competitionId] || null;
      }
    }

    const blogComments = comments
      .filter(function (c) {
        return c.liveBlogId === liveBlogId && !c.isDeleted;
      })
      .sort(function (a, b) {
        const da = new Date(a.createdAt).getTime();
        const db = new Date(b.createdAt).getTime();
        return da - db;
      });

    return {
      liveBlog: liveBlog || null,
      match: match,
      homeTeam: homeTeam,
      awayTeam: awayTeam,
      competition: competition,
      comments: blogComments
    };
  }

  // postLiveComment(liveBlogId, text, displayName)
  postLiveComment(liveBlogId, text, displayName) {
    const trimmed = (text || '').trim();
    if (trimmed.length < 20) {
      return {
        comment: null,
        success: false,
        message: 'Comment must be at least 20 characters'
      };
    }

    const profile = this._getOrCreateProfile();
    const finalName = displayName || profile.displayName || profile.username || '';

    const comments = this._getFromStorage('live_comments', []);
    const comment = {
      id: this._generateId('livecmt'),
      liveBlogId: liveBlogId,
      text: trimmed,
      displayName: finalName,
      createdAt: new Date().toISOString(),
      source: 'user',
      isDeleted: false
    };
    comments.push(comment);
    this._saveToStorage('live_comments', comments);

    return { comment: comment, success: true, message: 'Comment posted' };
  }

  // getTagDetail(tagId)
  getTagDetail(tagId) {
    const tags = this._getFromStorage('tags', []);
    const articles = this._getFromStorage('articles', []);
    const podcastEpisodes = this._getFromStorage('podcast_episodes', []);
    const tagPrefs = this._getFromStorage('tag_follow_preferences', []);

    const tag = tags.find(function (t) {
      return t.id === tagId;
    });

    const followPreference = tagPrefs.find(function (p) {
      return p.tagId === tagId;
    }) || null;

    const recentArticles = articles
      .filter((a) => {
        const tagIds = this._ensureArray(a.tagIds || []);
        return tagIds.indexOf(tagId) !== -1;
      })
      .sort(function (a, b) {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 20);

    const recentPodcastEpisodes = podcastEpisodes
      .filter((ep) => {
        const tagIds = this._ensureArray(ep.tagIds || []);
        return tagIds.indexOf(tagId) !== -1;
      })
      .sort(function (a, b) {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      })
      .slice(0, 20);

    return {
      tag: tag || null,
      followPreference: followPreference,
      recentArticles: recentArticles,
      recentPodcastEpisodes: recentPodcastEpisodes
    };
  }

  // setTagFollowStatus(tagId, followed)
  setTagFollowStatus(tagId, followed) {
    const prefs = this._getFromStorage('tag_follow_preferences', []);
    let pref = prefs.find(function (p) {
      return p.tagId === tagId;
    });

    const nowStr = new Date().toISOString();

    if (!pref) {
      pref = {
        id: this._generateId('tagpref'),
        tagId: tagId,
        followed: !!followed,
        notificationLevel: 'important_only',
        notificationsEnabled: !!followed,
        createdAt: nowStr,
        updatedAt: nowStr
      };
      prefs.push(pref);
    } else {
      pref.followed = !!followed;
      if (followed && !pref.notificationLevel) {
        pref.notificationLevel = 'important_only';
      }
      pref.notificationsEnabled = !!followed;
      pref.updatedAt = nowStr;
    }

    this._saveToStorage('tag_follow_preferences', prefs);
    return { preference: pref, success: true };
  }

  // updateTagNotificationPreferences(tagId, notificationLevel, notificationsEnabled)
  updateTagNotificationPreferences(tagId, notificationLevel, notificationsEnabled) {
    const prefs = this._getFromStorage('tag_follow_preferences', []);
    let pref = prefs.find(function (p) {
      return p.tagId === tagId;
    });
    const nowStr = new Date().toISOString();

    if (!pref) {
      pref = {
        id: this._generateId('tagpref'),
        tagId: tagId,
        followed: true,
        notificationLevel: notificationLevel,
        notificationsEnabled: !!notificationsEnabled,
        createdAt: nowStr,
        updatedAt: nowStr
      };
      prefs.push(pref);
    } else {
      pref.notificationLevel = notificationLevel;
      pref.notificationsEnabled = !!notificationsEnabled;
      pref.updatedAt = nowStr;
    }

    this._saveToStorage('tag_follow_preferences', prefs);
    return { preference: pref, success: true };
  }

  // setTeamFollowStatus(teamId, followed)
  setTeamFollowStatus(teamId, followed) {
    const prefs = this._getOrCreateFeedPreferences();
    const list = prefs.followedTeamIds || [];
    const idx = list.indexOf(teamId);
    if (followed) {
      if (idx === -1) list.push(teamId);
    } else {
      if (idx !== -1) list.splice(idx, 1);
    }
    prefs.followedTeamIds = list;

    const allPrefs = this._getFromStorage('feed_preferences', []);
    if (allPrefs.length === 0) {
      allPrefs.push(prefs);
    } else {
      allPrefs[0] = prefs;
    }
    this._saveToStorage('feed_preferences', allPrefs);

    return { feedPreferences: prefs, success: true };
  }

  // getMatchesCalendar(filters)
  getMatchesCalendar(filters) {
    const f = filters || {};
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const calItems = this._getFromStorage('my_calendar_items', []);

    const competitionsById = {};
    const teamsById = {};
    const calendarMatchIds = {};
    for (let i = 0; i < competitions.length; i++) competitionsById[competitions[i].id] = competitions[i];
    for (let i = 0; i < teams.length; i++) teamsById[teams[i].id] = teams[i];
    for (let i = 0; i < calItems.length; i++) calendarMatchIds[calItems[i].matchId] = true;

    const fromDate = f.fromDate ? new Date(f.fromDate) : null;
    const toDate = f.toDate ? new Date(f.toDate) : null;
    const minKickoffTime = f.minKickoffTime || null; // 'HH:MM'
    let minHours = null;
    let minMinutes = null;
    if (minKickoffTime) {
      const parts = minKickoffTime.split(':');
      if (parts.length === 2) {
        minHours = parseInt(parts[0], 10);
        minMinutes = parseInt(parts[1], 10);
      }
    }

    const result = [];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      if (f.teamId && m.homeTeamId !== f.teamId && m.awayTeamId !== f.teamId) continue;
      if (f.competitionId && m.competitionId !== f.competitionId) continue;

      const kickoff = this._parseDate(m.kickoffAt);
      if (fromDate && kickoff && kickoff < fromDate) continue;
      if (toDate && kickoff && kickoff > toDate) continue;

      if (minHours !== null && kickoff) {
        let hour = kickoff.getHours();
        let min = kickoff.getMinutes();
        if (m.kickoffAt && typeof m.kickoffAt === 'string') {
          const timeMatch = m.kickoffAt.match(/T(\d{2}):(\d{2})/);
          if (timeMatch) {
            hour = parseInt(timeMatch[1], 10);
            min = parseInt(timeMatch[2], 10);
          }
        }
        if (hour < minHours || (hour === minHours && min < minMinutes)) {
          continue;
        }
      }

      const competition = competitionsById[m.competitionId] || null;
      const homeTeam = teamsById[m.homeTeamId] || null;
      const awayTeam = teamsById[m.awayTeamId] || null;
      const isInMyCalendar = !!calendarMatchIds[m.id];

      result.push({
        match: this._hydrateMatch(m, teamsById, competitionsById),
        competition: competition,
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        isInMyCalendar: isInMyCalendar
      });
    }

    return { matches: result };
  }

  // addMatchToMyCalendar(matchId, reminderMinutesBefore)
  addMatchToMyCalendar(matchId, reminderMinutesBefore) {
    const matches = this._getFromStorage('matches', []);
    const match = matches.find(function (m) {
      return m.id === matchId;
    });
    if (!match) {
      return { item: null, success: false, message: 'Match not found' };
    }

    const items = this._getOrCreateMyCalendar();
    const existing = items.find(function (it) {
      return it.matchId === matchId;
    });
    if (existing) {
      return { item: existing, success: true, message: 'Already in calendar' };
    }

    const item = {
      id: this._generateId('mycal'),
      matchId: matchId,
      addedAt: new Date().toISOString(),
      reminderMinutesBefore: typeof reminderMinutesBefore === 'number' ? reminderMinutesBefore : null
    };
    items.push(item);
    this._saveToStorage('my_calendar_items', items);
    return { item: item, success: true, message: 'Added to calendar' };
  }

  // removeMatchFromMyCalendar(myCalendarItemId)
  removeMatchFromMyCalendar(myCalendarItemId) {
    const items = this._getFromStorage('my_calendar_items', []);
    const newItems = items.filter(function (it) {
      return it.id !== myCalendarItemId;
    });
    const success = newItems.length !== items.length;
    this._saveToStorage('my_calendar_items', newItems);
    return { success: success, message: success ? 'Removed' : 'Not found' };
  }

  // getMyCalendarItems()
  getMyCalendarItems() {
    const items = this._getFromStorage('my_calendar_items', []);
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);

    const matchesById = {};
    const competitionsById = {};
    const teamsById = {};
    for (let i = 0; i < matches.length; i++) matchesById[matches[i].id] = matches[i];
    for (let i = 0; i < competitions.length; i++) competitionsById[competitions[i].id] = competitions[i];
    for (let i = 0; i < teams.length; i++) teamsById[teams[i].id] = teams[i];

    const result = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const match = matchesById[it.matchId] || null;
      const competition = match ? competitionsById[match.competitionId] || null : null;
      const homeTeam = match ? teamsById[match.homeTeamId] || null : null;
      const awayTeam = match ? teamsById[match.awayTeamId] || null : null;
      result.push({
        myCalendarItem: it,
        match: match ? this._hydrateMatch(match, teamsById, competitionsById) : null,
        competition: competition,
        homeTeam: homeTeam,
        awayTeam: awayTeam
      });
    }

    // Instrumentation for task completion tracking (Task 7)
    try {
      localStorage.setItem('task7_calendarViewed', 'true');
    } catch (e) {
      // swallow instrumentation errors
    }

    return { items: result };
  }

  // getPodcastFilterOptions()
  getPodcastFilterOptions() {
    const categories = [
      { key: 'futebol_feminino', label: 'Futebol Feminino' },
      { key: 'geral', label: 'Geral' },
      { key: 'entrevistas', label: 'Entrevistas' },
      { key: 'analises', label: 'Análises' },
      { key: 'outros', label: 'Outros' }
    ];

    const datePresets = [
      { key: 'ultimos_7_dias', label: 'Últimos 7 dias' },
      { key: 'ultimos_30_dias', label: 'Últimos 30 dias' }
    ];

    const sortOptions = [
      { key: 'duration_desc', label: 'Maior duração' },
      { key: 'duration_asc', label: 'Menor duração' },
      { key: 'published_at_desc', label: 'Mais recentes' }
    ];

    return { categories: categories, datePresets: datePresets, sortOptions: sortOptions };
  }

  // getPodcastEpisodes(filters, sortBy)
  getPodcastEpisodes(filters, sortBy) {
    const f = filters || {};
    const episodes = this._getFromStorage('podcast_episodes', []);

    const dateRange = f.datePreset ? this._getPodcastDateRange(f.datePreset) : null;
    const dateFrom = f.dateFrom ? new Date(f.dateFrom) : null;
    const dateTo = f.dateTo ? new Date(f.dateTo) : null;

    const filtered = episodes.filter((ep) => {
      if (f.category && ep.category !== f.category) return false;
      const pub = ep.publishedAt ? new Date(ep.publishedAt) : null;
      if (dateRange && pub && (pub < dateRange.from || pub > dateRange.to)) return false;
      if (dateFrom && pub && pub < dateFrom) return false;
      if (dateTo && pub && pub > dateTo) return false;
      return true;
    });

    if (sortBy === 'duration_desc') {
      filtered.sort(function (a, b) {
        return (b.durationMinutes || 0) - (a.durationMinutes || 0);
      });
    } else if (sortBy === 'duration_asc') {
      filtered.sort(function (a, b) {
        return (a.durationMinutes || 0) - (b.durationMinutes || 0);
      });
    } else if (sortBy === 'published_at_desc') {
      filtered.sort(function (a, b) {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      });
    }

    return { episodes: filtered, total: filtered.length };
  }

  // addEpisodeToPlaylist(episodeId)
  addEpisodeToPlaylist(episodeId) {
    const episodes = this._getFromStorage('podcast_episodes', []);
    const episode = episodes.find(function (ep) {
      return ep.id === episodeId;
    });
    if (!episode) {
      return { item: null, success: false, message: 'Episode not found' };
    }

    const items = this._getFromStorage('playlist_items', []);
    const existing = items.find(function (it) {
      return it.episodeId === episodeId;
    });
    if (existing) {
      return { item: existing, success: true, message: 'Already in playlist' };
    }

    let maxOrder = -1;
    for (let i = 0; i < items.length; i++) {
      if (typeof items[i].orderIndex === 'number' && items[i].orderIndex > maxOrder) {
        maxOrder = items[i].orderIndex;
      }
    }

    const item = {
      id: this._generateId('plitem'),
      episodeId: episodeId,
      addedAt: new Date().toISOString(),
      orderIndex: maxOrder + 1
    };

    items.push(item);
    this._saveToStorage('playlist_items', items);

    return { item: item, success: true, message: 'Added to playlist' };
  }

  // removeFromPlaylist(playlistItemId)
  removeFromPlaylist(playlistItemId) {
    const items = this._getFromStorage('playlist_items', []);
    const newItems = items.filter(function (it) {
      return it.id !== playlistItemId;
    });
    const success = newItems.length !== items.length;
    this._saveToStorage('playlist_items', newItems);
    return { success: success, message: success ? 'Removed' : 'Not found' };
  }

  // getPlaylistItems()
  getPlaylistItems() {
    const items = this._getFromStorage('playlist_items', []);
    const episodes = this._getFromStorage('podcast_episodes', []);
    const episodesById = {};
    for (let i = 0; i < episodes.length; i++) episodesById[episodes[i].id] = episodes[i];

    const result = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      result.push({
        playlistItem: it,
        episode: episodesById[it.episodeId] || null
      });
    }

    // Instrumentation for task completion tracking (Task 9)
    try {
      localStorage.setItem('task9_playlistViewed', 'true');
    } catch (e) {
      // swallow instrumentation errors
    }

    return { items: result };
  }

  // getUserProfileAndPreferences()
  getUserProfileAndPreferences() {
    const profile = this._getOrCreateProfile();
    const feedPreferences = this._getOrCreateFeedPreferences();
    const teams = this._getFromStorage('teams', []);

    const teamsById = {};
    for (let i = 0; i < teams.length; i++) teamsById[teams[i].id] = teams[i];

    const followedTeams = (feedPreferences.followedTeamIds || [])
      .map((id) => teamsById[id])
      .filter(Boolean);

    const hiddenSports = feedPreferences.hiddenSports || [];

    return {
      profile: { username: profile.username, displayName: profile.displayName },
      feedPreferences: feedPreferences,
      followedTeams: followedTeams,
      hiddenSports: hiddenSports
    };
  }

  // updateUserProfile(username, displayName)
  updateUserProfile(username, displayName) {
    const profile = this._getOrCreateProfile();
    if (typeof username === 'string') profile.username = username;
    if (typeof displayName === 'string') profile.displayName = displayName;
    localStorage.setItem('user_profile', JSON.stringify(profile));

    // also sync displayName into feed preferences
    const prefs = this._getOrCreateFeedPreferences();
    if (typeof displayName === 'string') {
      prefs.displayName = displayName;
      const allPrefs = this._getFromStorage('feed_preferences', []);
      if (allPrefs.length === 0) {
        allPrefs.push(prefs);
      } else {
        allPrefs[0] = prefs;
      }
      this._saveToStorage('feed_preferences', allPrefs);
    }

    return { profile: { username: profile.username, displayName: profile.displayName }, success: true };
  }

  // updateFeedPreferences(followedTeamIds, hiddenSports, showBettingContent, showTrainingContent, showPodcasts)
  updateFeedPreferences(followedTeamIds, hiddenSports, showBettingContent, showTrainingContent, showPodcasts) {
    const prefs = this._getOrCreateFeedPreferences();
    if (Array.isArray(followedTeamIds)) {
      prefs.followedTeamIds = followedTeamIds.slice();
    }
    if (Array.isArray(hiddenSports)) {
      prefs.hiddenSports = hiddenSports.slice();
    }
    if (typeof showBettingContent === 'boolean') prefs.showBettingContent = showBettingContent;
    if (typeof showTrainingContent === 'boolean') prefs.showTrainingContent = showTrainingContent;
    if (typeof showPodcasts === 'boolean') prefs.showPodcasts = showPodcasts;

    const allPrefs = this._getFromStorage('feed_preferences', []);
    if (allPrefs.length === 0) {
      allPrefs.push(prefs);
    } else {
      allPrefs[0] = prefs;
    }
    this._saveToStorage('feed_preferences', allPrefs);

    return { feedPreferences: prefs, success: true };
  }

  // searchTeams(query, sport)
  searchTeams(query, sport) {
    const q = (query || '').toLowerCase();
    const teams = this._getFromStorage('teams', []);
    const filtered = teams.filter(function (t) {
      if (sport && t.sport && t.sport !== sport) return false;
      const text = (t.name || '').toLowerCase();
      return text.indexOf(q) !== -1;
    });
    return { teams: filtered };
  }

  // getSportCategories()
  getSportCategories() {
    const sports = this._getFromStorage('sport_categories', []);
    return { sports: sports };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const key = pageKey || '';
    let title = '';
    let body = '';

    if (key === 'about') {
      title = 'Sobre o site';
      body = 'Blog brasileiro de notícias esportivas, análises e dicas de apostas.';
    } else if (key === 'privacy_policy') {
      title = 'Política de Privacidade';
      body = 'Esta página descreve como tratamos seus dados pessoais.';
    } else if (key === 'terms_of_use') {
      title = 'Termos de Uso';
      body = 'Condições para uso do nosso site e dos nossos serviços.';
    } else {
      title = 'Página';
      body = '';
    }

    return { title: title, body: body, lastUpdatedAt: new Date().toISOString() };
  }

  // sendContactMessage(name, email, category, message)
  sendContactMessage(name, email, category, message) {
    const trimmed = (message || '').trim();
    if (!trimmed) {
      return { success: false, message: 'Mensagem vazia' };
    }
    const msgs = this._getFromStorage('contact_messages', []);
    const item = {
      id: this._generateId('contact'),
      name: name || '',
      email: email || '',
      category: category || '',
      message: trimmed,
      createdAt: new Date().toISOString()
    };
    msgs.push(item);
    this._saveToStorage('contact_messages', msgs);
    return { success: true, message: 'Mensagem enviada com sucesso' };
  }

  // getSavedContentSummary()
  getSavedContentSummary() {
    const savedTips = this._getFromStorage('saved_betting_tips', []);
    const readingItems = this._getFromStorage('reading_list_items', []);
    const playlistItems = this._getFromStorage('playlist_items', []);
    return {
      savedTipsCount: savedTips.length,
      readingListCount: readingItems.length,
      playlistCount: playlistItems.length
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