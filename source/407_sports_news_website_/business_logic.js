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

  // ----------------------
  // Storage & ID helpers
  // ----------------------

  _initStorage() {
    // Array-based entity tables
    const arrayKeys = [
      'competitions',
      'teams',
      'players',
      'player_stats',
      'matches',
      'league_table_entries',
      'tags',
      'articles',
      'videos',
      'collections',
      'collection_items',
      'reading_list_items',
      'watch_later_items',
      'followed_teams',
      'followed_players',
      'match_alert_subscriptions',
      'notification_preferences',
      'dashboard_pinned_items',
      'feed_preferences',
      'profiles',
      // Additional utility tables
      'static_pages',
      'contact_messages'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        this._saveToStorage(key, []);
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) return Array.isArray(defaultValue) || typeof defaultValue === 'object' ? JSON.parse(JSON.stringify(defaultValue)) : defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      // If corrupted, reset to default
      this._saveToStorage(key, defaultValue);
      return Array.isArray(defaultValue) || typeof defaultValue === 'object' ? JSON.parse(JSON.stringify(defaultValue)) : defaultValue;
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

  _now() {
    return new Date().toISOString();
  }

  _indexById(array) {
    const map = {};
    for (const item of array) {
      if (item && item.id) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _findById(key, id) {
    const items = this._getFromStorage(key, []);
    return items.find(i => i.id === id) || null;
  }

  _parseDateOnly(str) {
    // Expects 'YYYY-MM-DD' or full ISO, returns 'YYYY-MM-DD'
    if (!str) return null;
    if (str.length >= 10) return str.slice(0, 10);
    return str;
  }

  _compareDatesDesc(a, b) {
    const ta = a ? Date.parse(a) : 0;
    const tb = b ? Date.parse(b) : 0;
    return tb - ta;
  }

  // ----------------------
  // Required helper functions
  // ----------------------

  _getOrCreateReadingListStore() {
    const items = this._getFromStorage('reading_list_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('reading_list_items', []);
      return [];
    }
    return items;
  }

  _getOrCreateWatchLaterStore() {
    const items = this._getFromStorage('watch_later_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('watch_later_items', []);
      return [];
    }
    return items;
  }

  _getOrCreateFollowedTeamsStore() {
    const items = this._getFromStorage('followed_teams', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('followed_teams', []);
      return [];
    }
    return items;
  }

  _getOrCreateFeedPreferencesStore() {
    let prefsArr = this._getFromStorage('feed_preferences', []);
    if (!Array.isArray(prefsArr)) {
      prefsArr = [];
    }
    if (prefsArr.length === 0) {
      const now = this._now();
      const pref = {
        id: this._generateId('feedpref'),
        competitionIds: [],
        teamIds: [],
        tagIds: [],
        lastUpdated: now
      };
      prefsArr.push(pref);
      this._saveToStorage('feed_preferences', prefsArr);
      return pref;
    }
    return prefsArr[0];
  }

  _getOrCreateDashboardStore() {
    const items = this._getFromStorage('dashboard_pinned_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('dashboard_pinned_items', []);
      return [];
    }
    return items;
  }

  _getCurrentProfileRecord() {
    let profiles = this._getFromStorage('profiles', []);
    if (!Array.isArray(profiles)) {
      profiles = [];
    }
    if (profiles.length === 0) {
      const now = this._now();
      const profile = {
        id: this._generateId('profile'),
        displayName: '',
        preferredTeamId: null,
        personalNotes: '',
        createdAt: now,
        updatedAt: now
      };
      profiles.push(profile);
      this._saveToStorage('profiles', profiles);
      return profile;
    }
    return profiles[0];
  }

  _getOrCreateNotificationPreference() {
    let prefs = this._getFromStorage('notification_preferences', []);
    if (!Array.isArray(prefs)) {
      prefs = [];
    }
    if (prefs.length === 0) {
      const now = this._now();
      const pref = {
        id: this._generateId('notifpref'),
        deliveryMethod: 'on_site_only',
        lastUpdated: now
      };
      prefs.push(pref);
      this._saveToStorage('notification_preferences', prefs);
      return pref;
    }
    return prefs[0];
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageContent()
  getHomePageContent() {
    const articles = this._getFromStorage('articles', []);
    const videos = this._getFromStorage('videos', []);
    const matches = this._getFromStorage('matches', []);
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const teamIndex = this._indexById(teams);
    const compIndex = this._indexById(competitions);

    // Top stories: latest articles
    const sortedArticles = articles.slice().sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt));
    const topStories = sortedArticles.slice(0, 10).map(a => ({
      articleId: a.id,
      title: a.title,
      subtitle: a.subtitle || '',
      articleType: a.articleType,
      publishedAt: a.publishedAt,
      primaryTeamName: a.primaryTeamId && teamIndex[a.primaryTeamId] ? teamIndex[a.primaryTeamId].name : '',
      competitionName: a.competitionId && compIndex[a.competitionId] ? compIndex[a.competitionId].name : '',
      heroImageUrl: a.heroImageUrl || ''
    }));

    // Featured matches: pick recent/next matches
    const sortedMatches = matches.slice().sort((a, b) => this._compareDatesDesc(a.kickoffTime, b.kickoffTime));
    const featuredMatches = sortedMatches.slice(0, 10).map(m => ({
      matchId: m.id,
      competitionName: m.competitionId && compIndex[m.competitionId] ? compIndex[m.competitionId].name : '',
      homeTeamName: m.homeTeamId && teamIndex[m.homeTeamId] ? teamIndex[m.homeTeamId].name : '',
      awayTeamName: m.awayTeamId && teamIndex[m.awayTeamId] ? teamIndex[m.awayTeamId].name : '',
      kickoffTime: m.kickoffTime,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      hasMatchReport: !!m.hasMatchReport,
      hasLiveCommentary: !!m.hasLiveCommentary,
      competition: m.competitionId ? (compIndex[m.competitionId] || null) : null,
      homeTeam: m.homeTeamId ? (teamIndex[m.homeTeamId] || null) : null,
      awayTeam: m.awayTeamId ? (teamIndex[m.awayTeamId] || null) : null
    }));

    // Key videos: latest videos
    const sortedVideos = videos.slice().sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt));
    const keyVideos = sortedVideos.slice(0, 10).map(v => ({
      videoId: v.id,
      title: v.title,
      durationSeconds: v.durationSeconds,
      publishedAt: v.publishedAt,
      thumbnailUrl: v.thumbnailUrl || '',
      primaryTeamNames: Array.isArray(v.teamIds) ? v.teamIds.map(tid => (teamIndex[tid] ? teamIndex[tid].name : '')) : [],
      competitionName: v.competitionId && compIndex[v.competitionId] ? compIndex[v.competitionId].name : ''
    }));

    // Shortcuts
    const readingListItems = this._getOrCreateReadingListStore();
    const watchLaterItems = this._getOrCreateWatchLaterStore();
    const followedTeams = this._getOrCreateFollowedTeamsStore();
    const articleIndex = this._indexById(articles);
    const videoIndex = this._indexById(videos);

    const readingListSorted = readingListItems.slice().sort((a, b) => this._compareDatesDesc(a.addedAt, b.addedAt));
    const readingListPreview = readingListSorted.slice(0, 5).map(ri => ({
      readingListItemId: ri.id,
      articleId: ri.articleId,
      title: ri.articleId && articleIndex[ri.articleId] ? articleIndex[ri.articleId].title : '',
      addedAt: ri.addedAt,
      article: ri.articleId ? (articleIndex[ri.articleId] || null) : null
    }));

    const watchLaterSorted = watchLaterItems.slice().sort((a, b) => this._compareDatesDesc(a.addedAt, b.addedAt));
    const watchLaterPreview = watchLaterSorted.slice(0, 5).map(wi => ({
      watchLaterItemId: wi.id,
      videoId: wi.videoId,
      title: wi.videoId && videoIndex[wi.videoId] ? videoIndex[wi.videoId].title : '',
      durationSeconds: wi.videoId && videoIndex[wi.videoId] ? videoIndex[wi.videoId].durationSeconds : 0,
      video: wi.videoId ? (videoIndex[wi.videoId] || null) : null
    }));

    const myTeamsPreview = followedTeams.map(ft => {
      const t = ft.teamId ? (teamIndex[ft.teamId] || null) : null;
      return {
        teamId: ft.teamId,
        teamName: t ? t.name : '',
        badgeImageUrl: t ? (t.badgeImageUrl || '') : '',
        competitionName: t && t.primaryCompetitionId && compIndex[t.primaryCompetitionId] ? compIndex[t.primaryCompetitionId].name : '',
        team: t
      };
    });

    // My feed recent items
    const feedItemsResult = this.getMyFeedItems(1, 5);
    const myFeedRecentItems = Array.isArray(feedItemsResult.items) ? feedItemsResult.items : [];

    return {
      topStories,
      featuredMatches,
      keyVideos,
      shortcuts: {
        readingListCount: readingListItems.length,
        readingListPreview,
        watchLaterCount: watchLaterItems.length,
        watchLaterPreview,
        myTeamsPreview,
        myFeedRecentItems
      }
    };
  }

  // getCompetitionOptions(typeFilter)
  getCompetitionOptions(typeFilter) {
    const competitions = this._getFromStorage('competitions', []);
    return competitions
      .filter(c => !typeFilter || c.type === typeFilter)
      .map(c => ({
        competitionId: c.id,
        name: c.name,
        shortName: c.shortName || '',
        code: c.code || '',
        type: c.type,
        country: c.country || '',
        level: typeof c.level === 'number' ? c.level : null
      }));
  }

  // getTeamOptions(competitionId, includeNationalTeams)
  getTeamOptions(competitionId, includeNationalTeams) {
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const compIndex = this._indexById(competitions);
    return teams
      .filter(t => {
        if (competitionId && t.primaryCompetitionId !== competitionId) return false;
        if (includeNationalTeams === false && t.teamType === 'national_team') return false;
        return true;
      })
      .map(t => ({
        teamId: t.id,
        name: t.name,
        shortName: t.shortName || '',
        badgeImageUrl: t.badgeImageUrl || '',
        teamType: t.teamType,
        competitionName: t.primaryCompetitionId && compIndex[t.primaryCompetitionId] ? compIndex[t.primaryCompetitionId].name : '',
        team: t,
        competition: t.primaryCompetitionId ? (compIndex[t.primaryCompetitionId] || null) : null
      }));
  }

  // listMatches(competitionId, date, teamId, statusFilter, sortBy)
  listMatches(competitionId, date, teamId, statusFilter, sortBy) {
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const compIndex = this._indexById(competitions);
    const teamIndex = this._indexById(teams);
    const dateOnly = this._parseDateOnly(date);

    let filtered = matches.filter(m => m.competitionId === competitionId && this._parseDateOnly(m.kickoffTime) === dateOnly);
    if (teamId) {
      filtered = filtered.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
    }
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }
    if (sortBy === 'kickoff_time') {
      filtered = filtered.slice().sort((a, b) => {
        const ta = Date.parse(a.kickoffTime || '');
        const tb = Date.parse(b.kickoffTime || '');
        return ta - tb;
      });
    }

    return filtered.map(m => ({
      matchId: m.id,
      competitionName: m.competitionId && compIndex[m.competitionId] ? compIndex[m.competitionId].name : '',
      homeTeamName: m.homeTeamId && teamIndex[m.homeTeamId] ? teamIndex[m.homeTeamId].name : '',
      awayTeamName: m.awayTeamId && teamIndex[m.awayTeamId] ? teamIndex[m.awayTeamId].name : '',
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      kickoffTime: m.kickoffTime,
      venueName: m.venueName || '',
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      hasMatchReport: !!m.hasMatchReport,
      hasLiveCommentary: !!m.hasLiveCommentary,
      competition: m.competitionId ? (compIndex[m.competitionId] || null) : null,
      homeTeam: m.homeTeamId ? (teamIndex[m.homeTeamId] || null) : null,
      awayTeam: m.awayTeamId ? (teamIndex[m.awayTeamId] || null) : null
    }));
  }

  // getMatchCentre(matchId)
  getMatchCentre(matchId) {
    const matches = this._getFromStorage('matches', []);
    const match = matches.find(m => m.id === matchId) || null;
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const compIndex = this._indexById(competitions);
    const teamIndex = this._indexById(teams);
    const articles = this._getFromStorage('articles', []);
    const videos = this._getFromStorage('videos', []);
    const alerts = this._getFromStorage('match_alert_subscriptions', []);

    if (!match) {
      return {
        match: null,
        hasMatchReport: false,
        matchReportArticleId: null,
        matchReportTitle: '',
        hasLiveCommentary: false,
        alertSubscription: {
          enabled: false,
          alertScope: null
        },
        relatedVideos: [],
        relatedArticles: []
      };
    }

    const competitionName = match.competitionId && compIndex[match.competitionId] ? compIndex[match.competitionId].name : '';
    const homeTeamName = match.homeTeamId && teamIndex[match.homeTeamId] ? teamIndex[match.homeTeamId].name : '';
    const awayTeamName = match.awayTeamId && teamIndex[match.awayTeamId] ? teamIndex[match.awayTeamId].name : '';

    const matchReport = articles
      .filter(a => a.matchId === matchId && a.articleType === 'match_report')
      .sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt))[0] || null;

    const alert = alerts.find(a => a.matchId === matchId) || null;

    const relatedVideos = videos
      .filter(v => v.matchId === matchId)
      .map(v => ({
        videoId: v.id,
        title: v.title,
        thumbnailUrl: v.thumbnailUrl || '',
        durationSeconds: v.durationSeconds,
        video: v
      }));

    const relatedArticles = articles
      .filter(a => a.matchId === matchId && (!matchReport || a.id !== matchReport.id))
      .map(a => ({
        articleId: a.id,
        title: a.title,
        articleType: a.articleType,
        publishedAt: a.publishedAt,
        article: a
      }));

    return {
      match: {
        matchId: match.id,
        competitionName,
        homeTeamName,
        awayTeamName,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        kickoffTime: match.kickoffTime,
        venueName: match.venueName || '',
        status: match.status,
        competition: match.competitionId ? (compIndex[match.competitionId] || null) : null,
        homeTeam: match.homeTeamId ? (teamIndex[match.homeTeamId] || null) : null,
        awayTeam: match.awayTeamId ? (teamIndex[match.awayTeamId] || null) : null
      },
      hasMatchReport: !!matchReport,
      matchReportArticleId: matchReport ? matchReport.id : null,
      matchReportTitle: matchReport ? matchReport.title : '',
      hasLiveCommentary: !!match.hasLiveCommentary,
      alertSubscription: {
        enabled: alert ? !!alert.enabled : false,
        alertScope: alert ? alert.alertScope || null : null
      },
      relatedVideos,
      relatedArticles
    };
  }

  // getMatchReport(matchId)
  getMatchReport(matchId) {
    const articles = this._getFromStorage('articles', []);
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const compIndex = this._indexById(competitions);
    const teamIndex = this._indexById(teams);

    const report = articles
      .filter(a => a.matchId === matchId && a.articleType === 'match_report')
      .sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt))[0] || null;

    if (!report) {
      return {
        articleId: null,
        title: '',
        authorName: '',
        publishedAt: null,
        updatedAt: null,
        summary: '',
        body: '',
        competitionName: '',
        homeTeamName: '',
        awayTeamName: ''
      };
    }

    const match = matches.find(m => m.id === matchId) || null;
    const competitionName = report.competitionId && compIndex[report.competitionId] ? compIndex[report.competitionId].name : (match && match.competitionId && compIndex[match.competitionId] ? compIndex[match.competitionId].name : '');
    const homeTeamName = match && match.homeTeamId && teamIndex[match.homeTeamId] ? teamIndex[match.homeTeamId].name : '';
    const awayTeamName = match && match.awayTeamId && teamIndex[match.awayTeamId] ? teamIndex[match.awayTeamId].name : '';

    return {
      articleId: report.id,
      title: report.title,
      authorName: report.authorName || '',
      publishedAt: report.publishedAt,
      updatedAt: report.updatedAt || null,
      summary: report.summary || '',
      body: report.body || '',
      competitionName,
      homeTeamName,
      awayTeamName
    };
  }

  // addArticleToReadingList(articleId, source)
  addArticleToReadingList(articleId, source) {
    let items = this._getOrCreateReadingListStore();
    const existing = items.find(i => i.articleId === articleId);
    const now = this._now();

    if (existing) {
      return {
        success: true,
        readingListItemId: existing.id,
        addedAt: existing.addedAt,
        message: 'already_in_list'
      };
    }

    const newItem = {
      id: this._generateId('rli'),
      articleId,
      addedAt: now,
      source: source || 'other'
    };
    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      readingListItemId: newItem.id,
      addedAt: now,
      message: 'added'
    };
  }

  // getReadingList()
  getReadingList() {
    const items = this._getOrCreateReadingListStore();
    const articles = this._getFromStorage('articles', []);
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const articleIndex = this._indexById(articles);
    const teamIndex = this._indexById(teams);
    const compIndex = this._indexById(competitions);

    const sorted = items.slice().sort((a, b) => this._compareDatesDesc(a.addedAt, b.addedAt));

    const result = sorted.map(ri => {
      const a = ri.articleId ? (articleIndex[ri.articleId] || null) : null;
      const primaryTeamName = a && a.primaryTeamId && teamIndex[a.primaryTeamId] ? teamIndex[a.primaryTeamId].name : '';
      const competitionName = a && a.competitionId && compIndex[a.competitionId] ? compIndex[a.competitionId].name : '';
      return {
        readingListItemId: ri.id,
        articleId: ri.articleId,
        title: a ? a.title : '',
        subtitle: a ? (a.subtitle || '') : '',
        articleType: a ? a.articleType : '',
        isMatchReport: a ? a.articleType === 'match_report' : false,
        primaryTeamName,
        competitionName,
        publishedAt: a ? a.publishedAt : null,
        addedAt: ri.addedAt,
        article: a
      };
    });

    // Instrumentation for task completion tracking (task_1)
    try {
      localStorage.setItem('task1_readingListOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    let items = this._getOrCreateReadingListStore();
    const initialLength = items.length;
    items = items.filter(i => i.id !== readingListItemId);
    this._saveToStorage('reading_list_items', items);
    return {
      success: items.length !== initialLength,
      message: items.length !== initialLength ? 'removed' : 'not_found'
    };
  }

  // listLiveMatches(competitionId, teamId)
  listLiveMatches(competitionId, teamId) {
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const compIndex = this._indexById(competitions);
    const teamIndex = this._indexById(teams);

    let filtered = matches.filter(m => m.status === 'live');
    if (competitionId) {
      filtered = filtered.filter(m => m.competitionId === competitionId);
    }
    if (teamId) {
      filtered = filtered.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
    }

    return filtered.map(m => ({
      matchId: m.id,
      competitionName: m.competitionId && compIndex[m.competitionId] ? compIndex[m.competitionId].name : '',
      homeTeamName: m.homeTeamId && teamIndex[m.homeTeamId] ? teamIndex[m.homeTeamId].name : '',
      awayTeamName: m.awayTeamId && teamIndex[m.awayTeamId] ? teamIndex[m.awayTeamId].name : '',
      kickoffTime: m.kickoffTime,
      status: m.status,
      competition: m.competitionId ? (compIndex[m.competitionId] || null) : null,
      homeTeam: m.homeTeamId ? (teamIndex[m.homeTeamId] || null) : null,
      awayTeam: m.awayTeamId ? (teamIndex[m.awayTeamId] || null) : null
    }));
  }

  // getLiveCommentary(matchId)
  getLiveCommentary(matchId) {
    const matches = this._getFromStorage('matches', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const match = matches.find(m => m.id === matchId) || null;
    const compIndex = this._indexById(competitions);
    const teamIndex = this._indexById(teams);

    const header = match
      ? {
          homeTeamName: match.homeTeamId && teamIndex[match.homeTeamId] ? teamIndex[match.homeTeamId].name : '',
          awayTeamName: match.awayTeamId && teamIndex[match.awayTeamId] ? teamIndex[match.awayTeamId].name : '',
          competitionName: match.competitionId && compIndex[match.competitionId] ? compIndex[match.competitionId].name : '',
          status: match.status,
          minute: ''
        }
      : {
          homeTeamName: '',
          awayTeamName: '',
          competitionName: '',
          status: '',
          minute: ''
        };

    const key = 'live_commentary_' + matchId;
    const events = this._getFromStorage(key, []);
    const lastUpdatedKey = 'live_commentary_lastUpdated_' + matchId;
    const lastUpdated = localStorage.getItem(lastUpdatedKey) || null;

    return {
      matchHeader: header,
      events: Array.isArray(events) ? events : [],
      lastUpdated
    };
  }

  // pinLiveCommentaryToDashboard(matchId)
  pinLiveCommentaryToDashboard(matchId) {
    let items = this._getOrCreateDashboardStore();
    const existing = items.find(i => i.itemType === 'live_commentary' && i.matchId === matchId && i.isActive);
    if (existing) {
      return {
        success: true,
        dashboardItemId: existing.id,
        message: 'already_pinned'
      };
    }
    const now = this._now();
    const maxSort = items.reduce((max, i) => (typeof i.sortOrder === 'number' && i.sortOrder > max ? i.sortOrder : max), 0);
    const item = {
      id: this._generateId('dash'),
      itemType: 'live_commentary',
      matchId,
      articleId: null,
      videoId: null,
      teamId: null,
      statsViewKey: null,
      createdAt: now,
      sortOrder: maxSort + 1,
      isActive: true
    };
    items.push(item);
    this._saveToStorage('dashboard_pinned_items', items);
    return {
      success: true,
      dashboardItemId: item.id,
      message: 'pinned'
    };
  }

  // getLeagueTable(competitionId, season, sortBy, sortDirection)
  getLeagueTable(competitionId, season, sortBy, sortDirection) {
    const entries = this._getFromStorage('league_table_entries', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const compIndex = this._indexById(competitions);
    const teamIndex = this._indexById(teams);

    let filtered = entries.filter(e => e.competitionId === competitionId);
    if (season) {
      filtered = filtered.filter(e => e.season === season);
    }

    const direction = sortDirection === 'asc' ? 1 : -1;
    const sortField = sortBy || 'position';

    filtered = filtered.slice().sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * direction;
      }
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      return String(av).localeCompare(String(bv)) * direction;
    });

    const comp = competitions.find(c => c.id === competitionId) || null;

    return {
      competitionName: comp ? comp.name : '',
      season: season || (comp ? comp.currentSeason || '' : ''),
      entries: filtered.map(e => ({
        entryId: e.id,
        teamId: e.teamId,
        teamName: e.teamId && teamIndex[e.teamId] ? teamIndex[e.teamId].name : '',
        played: e.played,
        won: e.won,
        drawn: e.drawn,
        lost: e.lost,
        goalsFor: e.goalsFor,
        goalsAgainst: e.goalsAgainst,
        goalDifference: e.goalDifference,
        points: e.points,
        position: e.position,
        lastUpdated: e.lastUpdated || null,
        team: e.teamId ? (teamIndex[e.teamId] || null) : null,
        competition: e.competitionId ? (compIndex[e.competitionId] || null) : null
      }))
    };
  }

  // getTeamPage(teamId)
  getTeamPage(teamId) {
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const matches = this._getFromStorage('matches', []);
    const leagueEntries = this._getFromStorage('league_table_entries', []);
    const articles = this._getFromStorage('articles', []);
    const followedTeams = this._getOrCreateFollowedTeamsStore();
    const compIndex = this._indexById(competitions);

    const team = teams.find(t => t.id === teamId) || null;
    const isFollowed = !!followedTeams.find(f => f.teamId === teamId);

    let keyStats = {
      currentLeaguePosition: null,
      points: null,
      recentForm: ''
    };

    if (team && team.primaryCompetitionId) {
      const entry = leagueEntries.find(e => e.competitionId === team.primaryCompetitionId && e.teamId === teamId) || null;
      if (entry) {
        keyStats.currentLeaguePosition = entry.position || null;
        keyStats.points = entry.points || null;
      }
    }

    // Recent form from last 5 completed matches
    const teamMatches = matches
      .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.status === 'completed')
      .sort((a, b) => this._compareDatesDesc(a.kickoffTime, b.kickoffTime));
    const lastFive = teamMatches.slice(0, 5);
    const formChars = lastFive.map(m => {
      const isHome = m.homeTeamId === teamId;
      const gf = isHome ? m.homeScore : m.awayScore;
      const ga = isHome ? m.awayScore : m.homeScore;
      if (gf > ga) return 'W';
      if (gf === ga) return 'D';
      return 'L';
    });
    keyStats.recentForm = formChars.join('');

    const upcomingFixtures = matches
      .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.status === 'scheduled')
      .sort((a, b) => this._compareDatesDesc(b.kickoffTime, a.kickoffTime))
      .reverse()
      .slice(0, 5)
      .map(m => ({
        matchId: m.id,
        competitionName: m.competitionId && compIndex[m.competitionId] ? compIndex[m.competitionId].name : '',
        opponentName: m.homeTeamId === teamId ? (teams.find(t => t.id === m.awayTeamId)?.name || '') : (teams.find(t => t.id === m.homeTeamId)?.name || ''),
        kickoffTime: m.kickoffTime,
        venueType: m.homeTeamId === teamId ? 'home' : (m.awayTeamId === teamId ? 'away' : 'neutral'),
        match: m
      }));

    const recentResults = teamMatches.slice(0, 5).map(m => {
      const isHome = m.homeTeamId === teamId;
      const gf = isHome ? m.homeScore : m.awayScore;
      const ga = isHome ? m.awayScore : m.homeScore;
      let result = 'draw';
      if (gf > ga) result = 'win';
      if (gf < ga) result = 'loss';
      return {
        matchId: m.id,
        competitionName: m.competitionId && compIndex[m.competitionId] ? compIndex[m.competitionId].name : '',
        opponentName: isHome ? (teams.find(t => t.id === m.awayTeamId)?.name || '') : (teams.find(t => t.id === m.homeTeamId)?.name || ''),
        isHome,
        scoreline: (m.homeScore != null && m.awayScore != null) ? (m.homeScore + '-' + m.awayScore) : '',
        result,
        match: m
      };
    });

    const latestNews = articles
      .filter(a => a.primaryTeamId === teamId && a.articleType !== 'transfer_news')
      .sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt))
      .slice(0, 10)
      .map(a => ({
        articleId: a.id,
        title: a.title,
        articleType: a.articleType,
        publishedAt: a.publishedAt,
        article: a
      }));

    const latestTransfers = articles
      .filter(a => a.primaryTeamId === teamId && a.articleType === 'transfer_news')
      .sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt))
      .slice(0, 10)
      .map(a => ({
        articleId: a.id,
        title: a.title,
        publishedAt: a.publishedAt,
        article: a
      }));

    return {
      team: team
        ? {
            teamId: team.id,
            name: team.name,
            shortName: team.shortName || '',
            badgeImageUrl: team.badgeImageUrl || '',
            teamType: team.teamType,
            competitionName: team.primaryCompetitionId && compIndex[team.primaryCompetitionId] ? compIndex[team.primaryCompetitionId].name : '',
            homeStadium: team.homeStadium || '',
            city: team.city || '',
            country: team.country || '',
            summary: team.summary || '',
            primaryColor: team.primaryColor || ''
          }
        : null,
      isFollowed,
      keyStats,
      upcomingFixtures,
      recentResults,
      latestNews,
      latestTransfers
    };
  }

  // getTeamFixtures(teamId, month, fromDate, toDate)
  getTeamFixtures(teamId, month, fromDate, toDate) {
    const matches = this._getFromStorage('matches', []);
    const alerts = this._getFromStorage('match_alert_subscriptions', []);
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const compIndex = this._indexById(competitions);
    const teamIndex = this._indexById(teams);

    let teamMatches = matches.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);

    if (month) {
      const prefix = month; // 'YYYY-MM'
      teamMatches = teamMatches.filter(m => (m.kickoffTime || '').startsWith(prefix));
    } else if (fromDate || toDate) {
      const fromTs = fromDate ? Date.parse(fromDate) : null;
      const toTs = toDate ? Date.parse(toDate) : null;
      teamMatches = teamMatches.filter(m => {
        const ts = Date.parse(this._parseDateOnly(m.kickoffTime) || '');
        if (fromTs && ts < fromTs) return false;
        if (toTs && ts > toTs) return false;
        return true;
      });
    }

    return teamMatches
      .sort((a, b) => this._compareDatesDesc(b.kickoffTime, a.kickoffTime))
      .reverse()
      .map(m => {
        const sub = alerts.find(s => s.matchId === m.id) || null;
        return {
          matchId: m.id,
          competitionName: m.competitionId && compIndex[m.competitionId] ? compIndex[m.competitionId].name : '',
          opponentName: m.homeTeamId === teamId ? (teamIndex[m.awayTeamId]?.name || '') : (teamIndex[m.homeTeamId]?.name || ''),
          kickoffTime: m.kickoffTime,
          venueType: m.homeTeamId === teamId ? 'home' : (m.awayTeamId === teamId ? 'away' : 'neutral'),
          status: m.status,
          alertEnabled: sub ? !!sub.enabled : false,
          alertScope: sub ? (sub.alertScope || null) : null,
          match: m
        };
      });
  }

  // setMatchAlert(matchId, enabled, alertScope, source)
  setMatchAlert(matchId, enabled, alertScope, source) {
    let subs = this._getFromStorage('match_alert_subscriptions', []);
    let sub = subs.find(s => s.matchId === matchId) || null;
    const now = this._now();

    if (!sub) {
      sub = {
        id: this._generateId('matchalert'),
        matchId,
        enabled: !!enabled,
        alertScope: alertScope || 'all_events',
        source: source || 'team_fixtures_tab',
        createdAt: now,
        updatedAt: now
      };
      subs.push(sub);
    } else {
      sub.enabled = !!enabled;
      if (alertScope) sub.alertScope = alertScope;
      if (source) sub.source = source;
      sub.updatedAt = now;
    }

    this._saveToStorage('match_alert_subscriptions', subs);

    return {
      success: true,
      subscriptionId: sub.id,
      enabled: sub.enabled,
      alertScope: sub.alertScope
    };
  }

  // getNotificationPreferences()
  getNotificationPreferences() {
    const pref = this._getOrCreateNotificationPreference();
    return {
      deliveryMethod: pref.deliveryMethod,
      lastUpdated: pref.lastUpdated
    };
  }

  // updateNotificationPreferences(deliveryMethod)
  updateNotificationPreferences(deliveryMethod) {
    let prefs = this._getFromStorage('notification_preferences', []);
    const now = this._now();
    if (!Array.isArray(prefs) || prefs.length === 0) {
      const pref = {
        id: this._generateId('notifpref'),
        deliveryMethod,
        lastUpdated: now
      };
      prefs = [pref];
      this._saveToStorage('notification_preferences', prefs);
      return {
        success: true,
        updatedPreference: {
          deliveryMethod: pref.deliveryMethod,
          lastUpdated: pref.lastUpdated
        }
      };
    }
    prefs[0].deliveryMethod = deliveryMethod;
    prefs[0].lastUpdated = now;
    this._saveToStorage('notification_preferences', prefs);
    return {
      success: true,
      updatedPreference: {
        deliveryMethod: prefs[0].deliveryMethod,
        lastUpdated: prefs[0].lastUpdated
      }
    };
  }

  // listPlayerStats(competitionId, season, metricType, minValue, sortBy, sortDirection, page, pageSize)
  listPlayerStats(competitionId, season, metricType, minValue, sortBy, sortDirection, page, pageSize) {
    const stats = this._getFromStorage('player_stats', []);
    const players = this._getFromStorage('players', []);
    const teams = this._getFromStorage('teams', []);
    const playerIndex = this._indexById(players);
    const teamIndex = this._indexById(teams);

    let filtered = stats.filter(s => s.competitionId === competitionId && s.metricType === metricType);
    if (season) {
      filtered = filtered.filter(s => s.season === season);
    }
    if (typeof minValue === 'number') {
      filtered = filtered.filter(s => s.value >= minValue);
    }

    // Only include stats for players that exist in the players table
    filtered = filtered.filter(s => !!playerIndex[s.playerId]);

    let results = filtered.map(s => {
      const p = playerIndex[s.playerId] || null;
      const team = p && p.teamId ? (teamIndex[p.teamId] || null) : null;
      return {
        playerId: s.playerId,
        playerName: p ? p.fullName : '',
        teamId: team ? team.id : null,
        teamName: team ? team.name : '',
        position: p ? (p.position || '') : '',
        nationality: p ? (p.nationality || '') : '',
        value: s.value,
        per90Value: s.per90Value != null ? s.per90Value : null,
        player: p,
        team
      };
    });

    const sortField = sortBy === 'per90' ? 'per90Value' : (sortBy === 'player_name' ? 'playerName' : (sortBy === 'team_name' ? 'teamName' : 'value'));
    const direction = sortDirection === 'asc' ? 1 : -1;

    results = results.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * direction;
      }
      if (av == null) return 1;
      if (bv == null) return -1;
      return String(av).localeCompare(String(bv)) * direction;
    });

    const totalCount = results.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : totalCount;
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      results: paged,
      totalCount
    };
  }

  // getPlayerProfile(playerId)
  getPlayerProfile(playerId) {
    const players = this._getFromStorage('players', []);
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const stats = this._getFromStorage('player_stats', []);
    const followedPlayers = this._getFromStorage('followed_players', []);

    const player = players.find(p => p.id === playerId) || null;
    const team = player && player.teamId ? teams.find(t => t.id === player.teamId) || null : null;
    const isFollowed = !!followedPlayers.find(fp => fp.playerId === playerId);
    const compIndex = this._indexById(competitions);

    const relevantStats = stats.filter(s => s.playerId === playerId);
    const grouped = {};
    for (const s of relevantStats) {
      const key = (s.competitionId || '') + '|' + (s.season || '');
      if (!grouped[key]) {
        grouped[key] = {
          competitionId: s.competitionId,
          season: s.season || '',
          goals: 0,
          assists: 0,
          appearances: 0,
          minutesPlayed: 0
        };
      }
      if (s.metricType === 'goals') grouped[key].goals += s.value;
      if (s.metricType === 'assists') grouped[key].assists += s.value;
      if (s.metricType === 'appearances') grouped[key].appearances += s.value;
      if (s.metricType === 'minutes_played') grouped[key].minutesPlayed += s.value;
    }

    const seasonStats = Object.values(grouped).map(g => ({
      competitionName: g.competitionId && compIndex[g.competitionId] ? compIndex[g.competitionId].name : '',
      season: g.season,
      goals: g.goals,
      assists: g.assists,
      appearances: g.appearances,
      minutesPlayed: g.minutesPlayed
    }));

    return {
      player: player
        ? {
            playerId: player.id,
            fullName: player.fullName,
            knownName: player.knownName || '',
            photoUrl: player.photoUrl || '',
            position: player.position || '',
            shirtNumber: player.shirtNumber != null ? player.shirtNumber : null,
            nationality: player.nationality || '',
            dateOfBirth: player.dateOfBirth || null,
            biography: player.biography || ''
          }
        : null,
      currentTeamName: team ? team.name : '',
      isFollowed,
      seasonStats
    };
  }

  // followPlayer(playerId, source)
  followPlayer(playerId, source) {
    let followed = this._getFromStorage('followed_players', []);
    const existing = followed.find(fp => fp.playerId === playerId);
    const now = this._now();
    if (existing) {
      return {
        success: true,
        followedPlayerId: existing.id,
        followedSince: existing.followedSince
      };
    }
    const record = {
      id: this._generateId('fplayer'),
      playerId,
      followedSince: now,
      source: source || 'player_page'
    };
    followed.push(record);
    this._saveToStorage('followed_players', followed);
    return {
      success: true,
      followedPlayerId: record.id,
      followedSince: record.followedSince
    };
  }

  // unfollowPlayer(playerId)
  unfollowPlayer(playerId) {
    let followed = this._getFromStorage('followed_players', []);
    const initialLength = followed.length;
    followed = followed.filter(fp => fp.playerId !== playerId);
    this._saveToStorage('followed_players', followed);
    return {
      success: followed.length !== initialLength
    };
  }

  // followTeam(teamId, source)
  followTeam(teamId, source) {
    let followed = this._getOrCreateFollowedTeamsStore();
    const existing = followed.find(ft => ft.teamId === teamId);
    const now = this._now();
    if (existing) {
      return {
        success: true,
        followedTeamId: existing.id,
        followedSince: existing.followedSince
      };
    }
    const record = {
      id: this._generateId('fteam'),
      teamId,
      followedSince: now,
      source: source || 'team_page'
    };
    followed.push(record);
    this._saveToStorage('followed_teams', followed);
    return {
      success: true,
      followedTeamId: record.id,
      followedSince: record.followedSince
    };
  }

  // unfollowTeam(teamId)
  unfollowTeam(teamId) {
    let followed = this._getOrCreateFollowedTeamsStore();
    const initialLength = followed.length;
    followed = followed.filter(ft => ft.teamId !== teamId);
    this._saveToStorage('followed_teams', followed);
    return {
      success: followed.length !== initialLength
    };
  }

  // getMyTeams()
  getMyTeams() {
    const followed = this._getOrCreateFollowedTeamsStore();
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const teamIndex = this._indexById(teams);
    const compIndex = this._indexById(competitions);

    const result = followed.map(ft => {
      const t = ft.teamId ? (teamIndex[ft.teamId] || null) : null;
      return {
        followedTeamId: ft.id,
        teamId: ft.teamId,
        teamName: t ? t.name : '',
        badgeImageUrl: t ? (t.badgeImageUrl || '') : '',
        competitionName: t && t.primaryCompetitionId && compIndex[t.primaryCompetitionId] ? compIndex[t.primaryCompetitionId].name : '',
        followedSince: ft.followedSince,
        team: t,
        competition: t && t.primaryCompetitionId ? (compIndex[t.primaryCompetitionId] || null) : null
      };
    });

    // Instrumentation for task completion tracking (task_2)
    try {
      localStorage.setItem('task2_myTeamsOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // listTransferArticles(teamId, dateRangeLabel, fromDate, toDate)
  listTransferArticles(teamId, dateRangeLabel, fromDate, toDate) {
    const articles = this._getFromStorage('articles', []);
    const teams = this._getFromStorage('teams', []);
    const teamIndex = this._indexById(teams);

    let filtered = articles.filter(a => a.articleType === 'transfer_news');

    if (teamId) {
      filtered = filtered.filter(a => a.primaryTeamId === teamId || (Array.isArray(a.teamIds) && a.teamIds.includes(teamId)));
    }

    let fromTs = null;
    let toTs = null;
    const today = new Date();

    if (dateRangeLabel === 'last_7_days') {
      toTs = Date.parse(this._parseDateOnly(today.toISOString()));
      const d = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      fromTs = Date.parse(this._parseDateOnly(d.toISOString()));
    } else if (dateRangeLabel === 'last_30_days') {
      toTs = Date.parse(this._parseDateOnly(today.toISOString()));
      const d = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      fromTs = Date.parse(this._parseDateOnly(d.toISOString()));
    } else if (fromDate || toDate) {
      fromTs = fromDate ? Date.parse(fromDate) : null;
      toTs = toDate ? Date.parse(toDate) : null;
    }

    if (fromTs || toTs) {
      filtered = filtered.filter(a => {
        const ts = Date.parse(this._parseDateOnly(a.publishedAt) || '');
        if (fromTs && ts < fromTs) return false;
        if (toTs && ts > toTs) return false;
        return true;
      });
    }

    filtered = filtered.sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt));

    return filtered.map(a => ({
      articleId: a.id,
      title: a.title,
      summary: a.summary || '',
      publishedAt: a.publishedAt,
      primaryTeamName: a.primaryTeamId && teamIndex[a.primaryTeamId] ? teamIndex[a.primaryTeamId].name : '',
      article: a
    }));
  }

  // getArticle(articleId)
  getArticle(articleId) {
    const articles = this._getFromStorage('articles', []);
    const tags = this._getFromStorage('tags', []);
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const readingListItems = this._getOrCreateReadingListStore();
    const collections = this._getFromStorage('collections', []);
    const collectionItems = this._getFromStorage('collection_items', []);

    const tagIndex = this._indexById(tags);
    const teamIndex = this._indexById(teams);
    const compIndex = this._indexById(competitions);

    const a = articles.find(x => x.id === articleId) || null;
    if (!a) {
      return {
        articleId: null,
        title: '',
        subtitle: '',
        articleType: '',
        authorName: '',
        publishedAt: null,
        updatedAt: null,
        summary: '',
        body: '',
        competitionName: '',
        primaryTeamName: '',
        teamNames: [],
        tagNames: [],
        shareUrl: '',
        heroImageUrl: '',
        isInReadingList: false,
        collectionsContaining: []
      };
    }

    // Instrumentation for task completion tracking (task_6 - feed article opened)
    try {
      const pref = this._getOrCreateFeedPreferencesStore();
      const competitionIds = pref.competitionIds || [];
      const teamIds = pref.teamIds || [];
      const tagIds = pref.tagIds || [];

      const matchArticleForFeed = (article) => {
        if (competitionIds.length && (!article.competitionId || !competitionIds.includes(article.competitionId))) return false;
        if (teamIds.length) {
          const primary = article.primaryTeamId && teamIds.includes(article.primaryTeamId);
          const others = Array.isArray(article.teamIds) && article.teamIds.some(tid => teamIds.includes(tid));
          if (!primary && !others) return false;
        }
        if (tagIds.length) {
          const hasTag = Array.isArray(article.tagIds) && article.tagIds.some(tid => tagIds.includes(tid));
          if (!hasTag) return false;
        }
        return true;
      };

      if (matchArticleForFeed(a)) {
        localStorage.setItem('task6_feedArticleOpenedId', String(articleId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const teamNames = Array.isArray(a.teamIds) ? a.teamIds.map(tid => (teamIndex[tid] ? teamIndex[tid].name : '')).filter(Boolean) : [];
    const tagNames = Array.isArray(a.tagIds) ? a.tagIds.map(tid => (tagIndex[tid] ? tagIndex[tid].name : '')).filter(Boolean) : [];
    const primaryTeamName = a.primaryTeamId && teamIndex[a.primaryTeamId] ? teamIndex[a.primaryTeamId].name : '';
    const competitionName = a.competitionId && compIndex[a.competitionId] ? compIndex[a.competitionId].name : '';
    const isInReadingList = !!readingListItems.find(ri => ri.articleId === articleId);

    const collectionsContaining = collectionItems
      .filter(ci => ci.contentType === 'article' && ci.contentId === articleId)
      .map(ci => {
        const col = collections.find(c => c.id === ci.collectionId) || null;
        return col
          ? {
              collectionId: col.id,
              collectionName: col.name
            }
          : null;
      })
      .filter(Boolean);

    return {
      articleId: a.id,
      title: a.title,
      subtitle: a.subtitle || '',
      articleType: a.articleType,
      authorName: a.authorName || '',
      publishedAt: a.publishedAt,
      updatedAt: a.updatedAt || null,
      summary: a.summary || '',
      body: a.body || '',
      competitionName,
      primaryTeamName,
      teamNames,
      tagNames,
      shareUrl: a.shareUrl || '',
      heroImageUrl: a.heroImageUrl || '',
      isInReadingList,
      collectionsContaining
    };
  }

  // getUserCollections(contentType)
  getUserCollections(contentType) {
    const collections = this._getFromStorage('collections', []);
    const collectionItems = this._getFromStorage('collection_items', []);

    return collections
      .filter(c => !contentType || c.contentType === contentType)
      .map(c => ({
        collectionId: c.id,
        name: c.name,
        description: c.description || '',
        contentType: c.contentType,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt || null,
        itemCount: collectionItems.filter(ci => ci.collectionId === c.id).length
      }));
  }

  // createCollectionAndAddArticle(name, description, contentType, articleId)
  createCollectionAndAddArticle(name, description, contentType, articleId) {
    let collections = this._getFromStorage('collections', []);
    let items = this._getFromStorage('collection_items', []);
    const now = this._now();

    const collection = {
      id: this._generateId('col'),
      name,
      description: description || '',
      contentType,
      createdAt: now,
      updatedAt: now
    };
    collections.push(collection);

    const item = {
      id: this._generateId('colitem'),
      collectionId: collection.id,
      contentType: 'article',
      contentId: articleId,
      addedAt: now
    };
    items.push(item);

    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', items);

    return {
      success: true,
      collectionId: collection.id,
      collectionName: collection.name,
      collectionItemId: item.id,
      message: 'created_and_added'
    };
  }

  // addArticleToCollection(collectionId, articleId)
  addArticleToCollection(collectionId, articleId) {
    let items = this._getFromStorage('collection_items', []);
    const now = this._now();

    const existing = items.find(ci => ci.collectionId === collectionId && ci.contentType === 'article' && ci.contentId === articleId);
    if (existing) {
      return {
        success: true,
        collectionItemId: existing.id,
        addedAt: existing.addedAt
      };
    }

    const item = {
      id: this._generateId('colitem'),
      collectionId,
      contentType: 'article',
      contentId: articleId,
      addedAt: now
    };
    items.push(item);
    this._saveToStorage('collection_items', items);

    return {
      success: true,
      collectionItemId: item.id,
      addedAt: item.addedAt
    };
  }

  // getCollectionsWithItems()
  getCollectionsWithItems() {
    const collections = this._getFromStorage('collections', []);
    const items = this._getFromStorage('collection_items', []);
    const articles = this._getFromStorage('articles', []);
    const videos = this._getFromStorage('videos', []);
    const articleIndex = this._indexById(articles);
    const videoIndex = this._indexById(videos);

    return collections.map(c => ({
      collectionId: c.id,
      name: c.name,
      contentType: c.contentType,
      itemCount: items.filter(ci => ci.collectionId === c.id).length,
      items: items
        .filter(ci => ci.collectionId === c.id)
        .sort((a, b) => this._compareDatesDesc(a.addedAt, b.addedAt))
        .map(ci => {
          let title = '';
          let content = null;
          if (ci.contentType === 'article') {
            const a = articleIndex[ci.contentId] || null;
            title = a ? a.title : '';
            content = a;
          } else if (ci.contentType === 'video') {
            const v = videoIndex[ci.contentId] || null;
            title = v ? v.title : '';
            content = v;
          }
          return {
            collectionItemId: ci.id,
            contentType: ci.contentType,
            contentId: ci.contentId,
            title,
            addedAt: ci.addedAt,
            article: ci.contentType === 'article' ? content : null,
            video: ci.contentType === 'video' ? content : null
          };
        })
    }));
  }

  // listVideos(teamId, competitionId, videoType, venueType, minDurationSeconds, page, pageSize)
  listVideos(teamId, competitionId, videoType, venueType, minDurationSeconds, page, pageSize) {
    const videos = this._getFromStorage('videos', []);
    const teams = this._getFromStorage('teams', []);
    const competitions = this._getFromStorage('competitions', []);
    const watchLater = this._getOrCreateWatchLaterStore();
    const teamIndex = this._indexById(teams);
    const compIndex = this._indexById(competitions);

    let filtered = videos.slice();

    if (teamId) {
      filtered = filtered.filter(v => v.homeTeamId === teamId || v.awayTeamId === teamId || (Array.isArray(v.teamIds) && v.teamIds.includes(teamId)));
    }
    if (competitionId) {
      filtered = filtered.filter(v => v.competitionId === competitionId);
    }
    if (videoType) {
      filtered = filtered.filter(v => v.videoType === videoType);
    }
    if (venueType) {
      filtered = filtered.filter(v => v.venueType === venueType);
    }
    if (typeof minDurationSeconds === 'number') {
      filtered = filtered.filter(v => v.durationSeconds >= minDurationSeconds);
    }

    filtered = filtered.sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt));

    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : filtered.length;
    const start = (pg - 1) * ps;
    const paged = filtered.slice(start, start + ps);

    return paged.map(v => ({
      videoId: v.id,
      title: v.title,
      description: v.description || '',
      videoType: v.videoType,
      durationSeconds: v.durationSeconds,
      publishedAt: v.publishedAt,
      thumbnailUrl: v.thumbnailUrl || '',
      primaryTeamNames: Array.isArray(v.teamIds) ? v.teamIds.map(tid => (teamIndex[tid] ? teamIndex[tid].name : '')).filter(Boolean) : [],
      competitionName: v.competitionId && compIndex[v.competitionId] ? compIndex[v.competitionId].name : '',
      venueType: v.venueType || '',
      isInWatchLater: !!watchLater.find(w => w.videoId === v.id),
      video: v
    }));
  }

  // getVideo(videoId)
  getVideo(videoId) {
    const videos = this._getFromStorage('videos', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const watchLater = this._getOrCreateWatchLaterStore();

    const v = videos.find(x => x.id === videoId) || null;
    const compIndex = this._indexById(competitions);
    const teamIndex = this._indexById(teams);

    if (!v) {
      return {
        video: null,
        isInWatchLater: false,
        relatedVideos: []
      };
    }

    const isInWatchLater = !!watchLater.find(w => w.videoId === videoId);

    let relatedVideos = videos.filter(x => x.id !== videoId && (x.matchId && v.matchId && x.matchId === v.matchId));
    if (relatedVideos.length === 0 && Array.isArray(v.teamIds) && v.teamIds.length > 0) {
      relatedVideos = videos.filter(x => x.id !== videoId && Array.isArray(x.teamIds) && x.teamIds.some(tid => v.teamIds.includes(tid)));
    }
    relatedVideos = relatedVideos.sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt)).slice(0, 5);

    const videoObj = {
      videoId: v.id,
      title: v.title,
      description: v.description || '',
      videoType: v.videoType,
      durationSeconds: v.durationSeconds,
      publishedAt: v.publishedAt,
      competitionName: v.competitionId && compIndex[v.competitionId] ? compIndex[v.competitionId].name : '',
      teamNames: Array.isArray(v.teamIds) ? v.teamIds.map(tid => (teamIndex[tid] ? teamIndex[tid].name : '')).filter(Boolean) : [],
      homeTeamName: v.homeTeamId && teamIndex[v.homeTeamId] ? teamIndex[v.homeTeamId].name : '',
      awayTeamName: v.awayTeamId && teamIndex[v.awayTeamId] ? teamIndex[v.awayTeamId].name : '',
      venueType: v.venueType || '',
      videoUrl: v.videoUrl,
      thumbnailUrl: v.thumbnailUrl || ''
    };

    const relatedVideosOutput = relatedVideos.map(rv => ({
      videoId: rv.id,
      title: rv.title,
      thumbnailUrl: rv.thumbnailUrl || '',
      durationSeconds: rv.durationSeconds,
      video: rv
    }));

    const result = {
      video: videoObj,
      isInWatchLater,
      relatedVideos: relatedVideosOutput
    };

    // Instrumentation for task completion tracking (task_5 - watch later video played)
    try {
      if (isInWatchLater) {
        localStorage.setItem('task5_watchLaterVideoPlayedId', String(videoId));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // addVideoToWatchLater(videoId, source)
  addVideoToWatchLater(videoId, source) {
    let items = this._getOrCreateWatchLaterStore();
    const existing = items.find(i => i.videoId === videoId);
    const now = this._now();

    if (existing) {
      return {
        success: true,
        watchLaterItemId: existing.id,
        addedAt: existing.addedAt
      };
    }

    const item = {
      id: this._generateId('wli'),
      videoId,
      addedAt: now,
      source: source || 'video_page'
    };
    items.push(item);
    this._saveToStorage('watch_later_items', items);

    return {
      success: true,
      watchLaterItemId: item.id,
      addedAt: item.addedAt
    };
  }

  // removeWatchLaterItem(watchLaterItemId)
  removeWatchLaterItem(watchLaterItemId) {
    let items = this._getOrCreateWatchLaterStore();
    const initialLength = items.length;
    items = items.filter(i => i.id !== watchLaterItemId);
    this._saveToStorage('watch_later_items', items);
    return {
      success: items.length !== initialLength
    };
  }

  // getWatchLaterList()
  getWatchLaterList() {
    const items = this._getOrCreateWatchLaterStore();
    const videos = this._getFromStorage('videos', []);
    const videoIndex = this._indexById(videos);

    const sorted = items.slice().sort((a, b) => this._compareDatesDesc(a.addedAt, b.addedAt));

    const result = sorted.map(i => {
      const v = i.videoId ? (videoIndex[i.videoId] || null) : null;
      return {
        watchLaterItemId: i.id,
        videoId: i.videoId,
        title: v ? v.title : '',
        thumbnailUrl: v ? (v.thumbnailUrl || '') : '',
        durationSeconds: v ? v.durationSeconds : 0,
        publishedAt: v ? v.publishedAt : null,
        addedAt: i.addedAt,
        video: v
      };
    });

    // Instrumentation for task completion tracking (task_5 - watch later opened)
    try {
      localStorage.setItem('task5_watchLaterOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // getFeedPreferences()
  getFeedPreferences() {
    const pref = this._getOrCreateFeedPreferencesStore();
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const tags = this._getFromStorage('tags', []);

    const competitionsSelected = competitions.filter(c => Array.isArray(pref.competitionIds) && pref.competitionIds.includes(c.id)).map(c => ({
      competitionId: c.id,
      name: c.name
    }));

    const teamsSelected = teams.filter(t => Array.isArray(pref.teamIds) && pref.teamIds.includes(t.id)).map(t => ({
      teamId: t.id,
      name: t.name
    }));

    const tagsSelected = tags.filter(tg => Array.isArray(pref.tagIds) && pref.tagIds.includes(tg.id)).map(tg => ({
      tagId: tg.id,
      name: tg.name
    }));

    return {
      competitionIds: pref.competitionIds || [],
      competitions: competitionsSelected,
      teamIds: pref.teamIds || [],
      teams: teamsSelected,
      tagIds: pref.tagIds || [],
      tags: tagsSelected,
      lastUpdated: pref.lastUpdated
    };
  }

  // updateFeedPreferences(competitionIds, teamIds, tagIds)
  updateFeedPreferences(competitionIds, teamIds, tagIds) {
    let prefsArr = this._getFromStorage('feed_preferences', []);
    const now = this._now();
    if (!Array.isArray(prefsArr) || prefsArr.length === 0) {
      const pref = {
        id: this._generateId('feedpref'),
        competitionIds: competitionIds || [],
        teamIds: teamIds || [],
        tagIds: tagIds || [],
        lastUpdated: now
      };
      prefsArr = [pref];
      this._saveToStorage('feed_preferences', prefsArr);
      return {
        success: true,
        lastUpdated: pref.lastUpdated
      };
    }
    if (competitionIds) prefsArr[0].competitionIds = competitionIds;
    if (teamIds) prefsArr[0].teamIds = teamIds;
    if (tagIds) prefsArr[0].tagIds = tagIds;
    prefsArr[0].lastUpdated = now;
    this._saveToStorage('feed_preferences', prefsArr);
    return {
      success: true,
      lastUpdated: prefsArr[0].lastUpdated
    };
  }

  // getMyFeedItems(page, pageSize)
  getMyFeedItems(page, pageSize) {
    const pref = this._getOrCreateFeedPreferencesStore();
    const articles = this._getFromStorage('articles', []);
    const videos = this._getFromStorage('videos', []);
    const competitions = this._getFromStorage('competitions', []);
    const teams = this._getFromStorage('teams', []);
    const compIndex = this._indexById(competitions);
    const teamIndex = this._indexById(teams);

    const competitionIds = pref.competitionIds || [];
    const teamIds = pref.teamIds || [];
    const tagIds = pref.tagIds || [];

    const matchArticle = a => {
      if (competitionIds.length && (!a.competitionId || !competitionIds.includes(a.competitionId))) return false;
      if (teamIds.length) {
        const primary = a.primaryTeamId && teamIds.includes(a.primaryTeamId);
        const others = Array.isArray(a.teamIds) && a.teamIds.some(tid => teamIds.includes(tid));
        if (!primary && !others) return false;
      }
      if (tagIds.length) {
        const hasTag = Array.isArray(a.tagIds) && a.tagIds.some(tid => tagIds.includes(tid));
        if (!hasTag) return false;
      }
      return true;
    };

    const matchVideo = v => {
      if (competitionIds.length && (!v.competitionId || !competitionIds.includes(v.competitionId))) return false;
      if (teamIds.length) {
        const homeAway = (v.homeTeamId && teamIds.includes(v.homeTeamId)) || (v.awayTeamId && teamIds.includes(v.awayTeamId));
        const others = Array.isArray(v.teamIds) && v.teamIds.some(tid => teamIds.includes(tid));
        if (!homeAway && !others) return false;
      }
      // Tags for videos are not modeled, so ignore tagIds here
      return true;
    };

    const articleItems = articles.filter(matchArticle).map(a => ({
      itemType: 'article',
      id: a.id,
      title: a.title,
      subtitleOrDescription: a.subtitle || a.summary || '',
      articleTypeOrVideoType: a.articleType,
      publishedAt: a.publishedAt,
      primaryTeamName: a.primaryTeamId && teamIndex[a.primaryTeamId] ? teamIndex[a.primaryTeamId].name : '',
      competitionName: a.competitionId && compIndex[a.competitionId] ? compIndex[a.competitionId].name : ''
    }));

    const videoItems = videos.filter(matchVideo).map(v => ({
      itemType: 'video',
      id: v.id,
      title: v.title,
      subtitleOrDescription: v.description || '',
      articleTypeOrVideoType: v.videoType,
      publishedAt: v.publishedAt,
      primaryTeamName: Array.isArray(v.teamIds) && v.teamIds[0] && teamIndex[v.teamIds[0]] ? teamIndex[v.teamIds[0]].name : '',
      competitionName: v.competitionId && compIndex[v.competitionId] ? compIndex[v.competitionId].name : ''
    }));

    let items = articleItems.concat(videoItems);
    items = items.sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt));

    const totalCount = items.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : totalCount;
    const start = (pg - 1) * ps;
    const paged = items.slice(start, start + ps);

    const result = {
      items: paged,
      totalCount
    };

    // Instrumentation for task completion tracking (task_6 - my feed opened)
    try {
      localStorage.setItem('task6_myFeedOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return result;
  }

  // searchContent(query, contentCategories, articleTypes, dateFrom, dateTo, page, pageSize)
  searchContent(query, contentCategories, articleTypes, dateFrom, dateTo, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    const cats = Array.isArray(contentCategories) && contentCategories.length > 0
      ? contentCategories
      : ['article', 'video', 'team', 'player', 'competition'];

    const results = [];

    const dateFromTs = dateFrom ? Date.parse(dateFrom) : null;
    const dateToTs = dateTo ? Date.parse(dateTo) : null;

    const matchesDate = (isoStr) => {
      if (!isoStr || (!dateFromTs && !dateToTs)) return true;
      const ts = Date.parse(this._parseDateOnly(isoStr) || '');
      if (dateFromTs && ts < dateFromTs) return false;
      if (dateToTs && ts > dateToTs) return false;
      return true;
    };

    if (cats.includes('article')) {
      const articles = this._getFromStorage('articles', []);
      for (const a of articles) {
        if (Array.isArray(articleTypes) && articleTypes.length > 0 && !articleTypes.includes(a.articleType)) continue;
        if (!matchesDate(a.publishedAt)) continue;
        const text = (a.title + ' ' + (a.subtitle || '') + ' ' + (a.summary || '') + ' ' + (a.body || '')).toLowerCase();
        if (q && !text.includes(q)) continue;
        results.push({
          resultType: 'article',
          id: a.id,
          titleOrName: a.title,
          articleType: a.articleType,
          publishedAt: a.publishedAt,
          snippet: a.summary || (a.body ? a.body.slice(0, 140) : '')
        });
      }
    }

    if (cats.includes('video')) {
      const videos = this._getFromStorage('videos', []);
      for (const v of videos) {
        if (!matchesDate(v.publishedAt)) continue;
        const text = (v.title + ' ' + (v.description || '')).toLowerCase();
        if (q && !text.includes(q)) continue;
        results.push({
          resultType: 'video',
          id: v.id,
          titleOrName: v.title,
          articleType: null,
          publishedAt: v.publishedAt,
          snippet: v.description ? v.description.slice(0, 140) : ''
        });
      }
    }

    if (cats.includes('team')) {
      const teams = this._getFromStorage('teams', []);
      for (const t of teams) {
        const text = (t.name + ' ' + (t.shortName || '') + ' ' + (t.summary || '')).toLowerCase();
        if (q && !text.includes(q)) continue;
        results.push({
          resultType: 'team',
          id: t.id,
          titleOrName: t.name,
          articleType: null,
          publishedAt: null,
          snippet: t.summary || ''
        });
      }
    }

    if (cats.includes('player')) {
      const players = this._getFromStorage('players', []);
      for (const p of players) {
        const text = (p.fullName + ' ' + (p.knownName || '') + ' ' + (p.biography || '')).toLowerCase();
        if (q && !text.includes(q)) continue;
        results.push({
          resultType: 'player',
          id: p.id,
          titleOrName: p.fullName,
          articleType: null,
          publishedAt: null,
          snippet: p.biography ? p.biography.slice(0, 140) : ''
        });
      }
    }

    if (cats.includes('competition')) {
      const competitions = this._getFromStorage('competitions', []);
      for (const c of competitions) {
        const text = (c.name + ' ' + (c.shortName || '') + ' ' + (c.code || '')).toLowerCase();
        if (q && !text.includes(q)) continue;
        results.push({
          resultType: 'competition',
          id: c.id,
          titleOrName: c.name,
          articleType: null,
          publishedAt: null,
          snippet: c.code || ''
        });
      }
    }

    results.sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt));

    const totalCount = results.length;
    const pg = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : totalCount;
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      results: paged,
      totalCount
    };
  }

  // getDashboardOverview()
  getDashboardOverview() {
    const pinned = this._getOrCreateDashboardStore();
    const matches = this._getFromStorage('matches', []);
    const articles = this._getFromStorage('articles', []);
    const videos = this._getFromStorage('videos', []);
    const teams = this._getFromStorage('teams', []);

    const matchIndex = this._indexById(matches);
    const articleIndex = this._indexById(articles);
    const videoIndex = this._indexById(videos);
    const teamIndex = this._indexById(teams);

    const activePinned = pinned.filter(p => p.isActive).slice().sort((a, b) => {
      const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
      const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
      return sa - sb;
    });

    const pinnedItems = activePinned.map(p => {
      let title = '';
      let subtitle = '';
      let status = '';
      if (p.itemType === 'live_commentary' && p.matchId) {
        const m = matchIndex[p.matchId] || null;
        if (m) {
          const home = m.homeTeamId && teamIndex[m.homeTeamId] ? teamIndex[m.homeTeamId].name : '';
          const away = m.awayTeamId && teamIndex[m.awayTeamId] ? teamIndex[m.awayTeamId].name : '';
          title = home + ' vs ' + away;
          subtitle = m.status;
          status = m.status;
        }
      } else if (p.itemType === 'article' && p.articleId) {
        const a = articleIndex[p.articleId] || null;
        if (a) {
          title = a.title;
          subtitle = a.summary || '';
          status = 'article';
        }
      } else if (p.itemType === 'video' && p.videoId) {
        const v = videoIndex[p.videoId] || null;
        if (v) {
          title = v.title;
          subtitle = v.description || '';
          status = 'video';
        }
      } else if (p.itemType === 'team' && p.teamId) {
        const t = teamIndex[p.teamId] || null;
        if (t) {
          title = t.name;
          subtitle = 'team';
          status = 'team';
        }
      }
      return {
        dashboardItemId: p.id,
        itemType: p.itemType,
        matchId: p.matchId || null,
        articleId: p.articleId || null,
        videoId: p.videoId || null,
        teamId: p.teamId || null,
        title,
        subtitle,
        status,
        sortOrder: p.sortOrder,
        isActive: p.isActive,
        match: p.matchId ? (matchIndex[p.matchId] || null) : null,
        article: p.articleId ? (articleIndex[p.articleId] || null) : null,
        video: p.videoId ? (videoIndex[p.videoId] || null) : null,
        team: p.teamId ? (teamIndex[p.teamId] || null) : null
      };
    });

    // Upcoming fixtures: simple next scheduled matches
    const upcomingFixturesRaw = matches
      .filter(m => m.status === 'scheduled')
      .sort((a, b) => this._compareDatesDesc(b.kickoffTime, a.kickoffTime))
      .reverse()
      .slice(0, 10);

    const competitions = this._getFromStorage('competitions', []);
    const compIndex = this._indexById(competitions);

    const upcomingFixtures = upcomingFixturesRaw.map(m => ({
      matchId: m.id,
      competitionName: m.competitionId && compIndex[m.competitionId] ? compIndex[m.competitionId].name : '',
      homeTeamName: m.homeTeamId && teamIndex[m.homeTeamId] ? teamIndex[m.homeTeamId].name : '',
      awayTeamName: m.awayTeamId && teamIndex[m.awayTeamId] ? teamIndex[m.awayTeamId].name : '',
      kickoffTime: m.kickoffTime,
      match: m
    }));

    // Latest from followed teams and players
    const followedTeams = this._getOrCreateFollowedTeamsStore();
    const followedPlayers = this._getFromStorage('followed_players', []);
    const teamIds = followedTeams.map(ft => ft.teamId);
    const playerIds = followedPlayers.map(fp => fp.playerId);

    const latestItems = [];

    for (const a of articles) {
      if (teamIds.length) {
        const hasTeam = (a.primaryTeamId && teamIds.includes(a.primaryTeamId)) || (Array.isArray(a.teamIds) && a.teamIds.some(tid => teamIds.includes(tid)));
        if (!hasTeam) continue;
      }
      // Player linkage not modeled; ignore playerIds
      latestItems.push({
        itemType: 'article',
        id: a.id,
        title: a.title,
        sourceName: a.primaryTeamId && teamIndex[a.primaryTeamId] ? teamIndex[a.primaryTeamId].name : '',
        publishedAt: a.publishedAt
      });
    }

    for (const v of videos) {
      if (teamIds.length) {
        const hasTeam = (v.homeTeamId && teamIds.includes(v.homeTeamId)) || (v.awayTeamId && teamIds.includes(v.awayTeamId)) || (Array.isArray(v.teamIds) && v.teamIds.some(tid => teamIds.includes(tid)));
        if (!hasTeam) continue;
      }
      latestItems.push({
        itemType: 'video',
        id: v.id,
        title: v.title,
        sourceName: Array.isArray(v.teamIds) && v.teamIds[0] && teamIndex[v.teamIds[0]] ? teamIndex[v.teamIds[0]].name : '',
        publishedAt: v.publishedAt
      });
    }

    latestItems.sort((a, b) => this._compareDatesDesc(a.publishedAt, b.publishedAt));

    const overview = {
      pinnedItems,
      upcomingFixtures,
      latestFromFollowedTeamsAndPlayers: latestItems.slice(0, 20)
    };

    // Instrumentation for task completion tracking (task_8 - dashboard opened)
    try {
      localStorage.setItem('task8_dashboardOpened', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return overview;
  }

  // unpinDashboardItem(dashboardItemId)
  unpinDashboardItem(dashboardItemId) {
    let items = this._getOrCreateDashboardStore();
    let updated = false;
    items = items.map(i => {
      if (i.id === dashboardItemId && i.isActive) {
        updated = true;
        return { ...i, isActive: false };
      }
      return i;
    });
    this._saveToStorage('dashboard_pinned_items', items);
    return {
      success: updated
    };
  }

  // reorderDashboardItems(orderUpdates)
  reorderDashboardItems(orderUpdates) {
    if (!Array.isArray(orderUpdates)) {
      return { success: false };
    }
    let items = this._getOrCreateDashboardStore();
    const map = {};
    for (const u of orderUpdates) {
      map[u.dashboardItemId] = u.sortOrder;
    }
    items = items.map(i => (Object.prototype.hasOwnProperty.call(map, i.id) ? { ...i, sortOrder: map[i.id] } : i));
    this._saveToStorage('dashboard_pinned_items', items);
    return {
      success: true
    };
  }

  // getProfile()
  getProfile() {
    const profile = this._getCurrentProfileRecord();
    const teams = this._getFromStorage('teams', []);
    const team = profile.preferredTeamId ? teams.find(t => t.id === profile.preferredTeamId) || null : null;

    return {
      profileId: profile.id,
      displayName: profile.displayName || '',
      preferredTeamId: profile.preferredTeamId || null,
      preferredTeamName: team ? team.name : '',
      personalNotes: profile.personalNotes || '',
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt
    };
  }

  // updateProfile(displayName, preferredTeamId, personalNotes)
  updateProfile(displayName, preferredTeamId, personalNotes) {
    let profiles = this._getFromStorage('profiles', []);
    const now = this._now();
    if (!Array.isArray(profiles) || profiles.length === 0) {
      const profile = {
        id: this._generateId('profile'),
        displayName: displayName || '',
        preferredTeamId: preferredTeamId || null,
        personalNotes: personalNotes || '',
        createdAt: now,
        updatedAt: now
      };
      profiles = [profile];
      this._saveToStorage('profiles', profiles);
    } else {
      if (displayName !== undefined) profiles[0].displayName = displayName;
      if (preferredTeamId !== undefined) profiles[0].preferredTeamId = preferredTeamId;
      if (personalNotes !== undefined) profiles[0].personalNotes = personalNotes;
      profiles[0].updatedAt = now;
      this._saveToStorage('profiles', profiles);
    }

    const teams = this._getFromStorage('teams', []);
    const team = profiles[0].preferredTeamId ? teams.find(t => t.id === profiles[0].preferredTeamId) || null : null;

    return {
      success: true,
      profile: {
        profileId: profiles[0].id,
        displayName: profiles[0].displayName || '',
        preferredTeamId: profiles[0].preferredTeamId || null,
        preferredTeamName: team ? team.name : '',
        personalNotes: profiles[0].personalNotes || '',
        updatedAt: profiles[0].updatedAt
      }
    };
  }

  // getStaticPageContent(pageKey)
  getStaticPageContent(pageKey) {
    const pages = this._getFromStorage('static_pages', []);
    const page = pages.find(p => p.pageKey === pageKey) || null;
    if (!page) {
      return {
        title: '',
        bodySections: [],
        lastUpdated: null
      };
    }
    return {
      title: page.title || '',
      bodySections: Array.isArray(page.bodySections) ? page.bodySections : [],
      lastUpdated: page.lastUpdated || null
    };
  }

  // sendContactMessage(name, email, subject, message, topic)
  sendContactMessage(name, email, subject, message, topic) {
    let msgs = this._getFromStorage('contact_messages', []);
    const now = this._now();
    const msg = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      topic: topic || 'other',
      submittedAt: now
    };
    msgs.push(msg);
    this._saveToStorage('contact_messages', msgs);
    return {
      success: true,
      messageId: msg.id,
      submittedAt: msg.submittedAt
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