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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keys = [
      'games',
      'draws',
      'collections',
      'collection_items',
      'tags',
      'draw_tags',
      'reports',
      'report_exports',
      'game_comparisons',
      'preferred_games',
      'number_searches',
      'dashboards',
      'dashboard_widgets',
      'alerts',
      'retailers',
      'retailer_stats',
      'retailer_lists',
      'inbox_messages',
      'quick_access_tiles'
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

  // -------------------- Generic helpers --------------------

  _parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareByDate(a, b, field, direction) {
    const da = this._parseDate(a[field]);
    const db = this._parseDate(b[field]);
    const va = da ? da.getTime() : 0;
    const vb = db ? db.getTime() : 0;
    return direction === 'asc' ? va - vb : vb - va;
  }

  _compareByNumber(a, b, field, direction) {
    const va = typeof a[field] === 'number' ? a[field] : 0;
    const vb = typeof b[field] === 'number' ? b[field] : 0;
    return direction === 'asc' ? va - vb : vb - va;
  }

  _resolvePresetDateRange(presetId) {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let start;

    switch (presetId) {
      case 'last_7_days':
        start = new Date(end);
        start.setDate(start.getDate() - 6);
        break;
      case 'last_30_days':
        start = new Date(end);
        start.setDate(start.getDate() - 29);
        break;
      case 'last_90_days':
        start = new Date(end);
        start.setDate(start.getDate() - 89);
        break;
      case 'last_6_months': {
        start = new Date(end);
        start.setMonth(start.getMonth() - 6);
        break;
      }
      case 'last_12_months': {
        start = new Date(end);
        start.setFullYear(start.getFullYear() - 1);
        break;
      }
      case 'today': {
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 0, 0, 0, 0);
        break;
      }
      case 'yesterday': {
        start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1, 0, 0, 0, 0);
        const yEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1, 23, 59, 59, 999);
        return { start, end: yEnd };
      }
      default:
        // Fallback to last 30 days
        start = new Date(end);
        start.setDate(start.getDate() - 29);
        break;
    }

    return { start, end };
  }

  _filterByDateRange(items, field, mode, preset, startDateStr, endDateStr) {
    if (!mode) return items;

    let start = null;
    let end = null;

    if (mode === 'preset') {
      const range = this._resolvePresetDateRange(preset);
      start = range.start;
      end = range.end;
    } else if (mode === 'custom') {
      start = startDateStr ? this._parseDate(startDateStr) : null;
      if (endDateStr) {
        const e = this._parseDate(endDateStr);
        if (e) {
          end = new Date(e.getFullYear(), e.getMonth(), e.getDate(), 23, 59, 59, 999);
        }
      }
    }

    if (!start && !end) return items;

    return items.filter((item) => {
      const d = this._parseDate(item[field]);
      if (!d) return false;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }

  _weekdayNameFromIndex(index) {
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return names[index] || '';
  }

  // -------------------- Foreign key resolution helpers --------------------

  _getGamesMap() {
    const games = this._getFromStorage('games');
    const map = {};
    games.forEach((g) => {
      if (g && g.id) map[g.id] = g;
    });
    return map;
  }

  _attachRelationsToDraw(draw, gamesMapOpt) {
    if (!draw) return null;
    const gamesMap = gamesMapOpt || this._getGamesMap();
    const game = draw.gameId ? gamesMap[draw.gameId] || null : null;
    return { ...draw, game };
  }

  _attachRelationsToReport(report, gamesMapOpt) {
    if (!report) return null;
    const gamesMap = gamesMapOpt || this._getGamesMap();
    const game = report.gameId ? gamesMap[report.gameId] || null : null;
    return { ...report, game };
  }

  _attachRelationsToAlert(alert, gamesMapOpt) {
    if (!alert) return null;
    const gamesMap = gamesMapOpt || this._getGamesMap();
    const game = alert.gameId ? gamesMap[alert.gameId] || null : null;
    return { ...alert, game };
  }

  _attachRelationsToDashboardWidget(widget, gamesMapOpt) {
    if (!widget) return null;
    const gamesMap = gamesMapOpt || this._getGamesMap();
    const game = widget.gameId ? gamesMap[widget.gameId] || null : null;
    const gameName = game ? game.name : null;
    return { ...widget, game, gameName };
  }

  _attachRelationsToPreferredGame(pref, gamesMapOpt) {
    if (!pref) return null;
    const gamesMap = gamesMapOpt || this._getGamesMap();
    const game = pref.gameId ? gamesMap[pref.gameId] || null : null;
    return { ...pref, game };
  }

  _attachRelationsToNumberSearch(search, gamesMapOpt) {
    if (!search) return null;
    const gamesMap = gamesMapOpt || this._getGamesMap();
    const game = search.gameId ? gamesMap[search.gameId] || null : null;
    return { ...search, game };
  }

  _attachRelationsToRetailerStatsItem(item, retailersMapOpt) {
    if (!item) return null;
    const retailers = this._getFromStorage('retailers');
    const map = retailersMapOpt || retailers.reduce((acc, r) => {
      if (r && r.id) acc[r.id] = r;
      return acc;
    }, {});
    const retailer = item.retailerId ? map[item.retailerId] || null : null;
    return { ...item, retailer };
  }

  // -------------------- Declared helper functions --------------------

  _resolveGameByKey(gameKey) {
    const games = this._getFromStorage('games');
    const game = games.find((g) => g.gameKey === gameKey);
    if (!game) {
      throw new Error('Game not found for key: ' + gameKey);
    }
    return game;
  }

  _getOrCreateDefaultDashboard() {
    const dashboards = this._getFromStorage('dashboards');
    let dashboard = dashboards[0] || null;
    if (!dashboard) {
      dashboard = {
        id: this._generateId('dashboard'),
        name: 'Main dashboard',
        description: '',
        layoutConfig: [],
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      dashboards.push(dashboard);
      this._saveToStorage('dashboards', dashboards);
    }
    return dashboard;
  }

  _ensureTagExists(tagLabel) {
    const label = (tagLabel || '').trim();
    if (!label) {
      throw new Error('Tag label is required');
    }
    let tags = this._getFromStorage('tags');
    let existing = tags.find((t) => t.label.toLowerCase() === label.toLowerCase());
    if (existing) return existing;

    const tag = {
      id: this._generateId('tag'),
      label,
      description: '',
      color: '',
      createdAt: new Date().toISOString()
    };
    tags.push(tag);
    this._saveToStorage('tags', tags);
    return tag;
  }

  _ensureCollectionExistsByName(name, collectionType) {
    const collections = this._getFromStorage('collections');
    let existing = collections.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const collection = {
      id: this._generateId('collection'),
      name,
      description: '',
      collectionType: collectionType || 'system',
      createdAt: new Date().toISOString()
    };
    collections.push(collection);
    this._saveToStorage('collections', collections);
    return collection;
  }

  _createOrUpdateReportFromConfig(config) {
    let reports = this._getFromStorage('reports');
    let report;

    if (config.reportId) {
      report = reports.find((r) => r.id === config.reportId);
      if (!report) {
        throw new Error('Report not found: ' + config.reportId);
      }
    } else {
      report = {
        id: this._generateId('report'),
        name: config.name || 'Untitled report',
        reportType: config.reportType,
        gameId: config.gameId || null,
        dateRangeMode: config.dateRangeMode || 'preset',
        dateRangePreset: config.dateRangePreset || 'last_30_days',
        startDate: config.startDate || null,
        endDate: config.endDate || null,
        selectedFields: config.selectedFields || [],
        groupBy: config.groupBy || 'none',
        metrics: config.metrics || [],
        metricFilterMetric: config.metricFilterMetric || null,
        metricFilterOperator: config.metricFilterOperator || null,
        metricFilterValue: typeof config.metricFilterValue === 'number' ? config.metricFilterValue : null,
        lastRunAt: null,
        lastRunRowCount: 0
      };
      reports.push(report);
    }

    // Update fields from config
    if (config.name !== undefined) report.name = config.name;
    if (config.reportType) report.reportType = config.reportType;
    if (config.gameId !== undefined) report.gameId = config.gameId || null;
    if (config.dateRangeMode) report.dateRangeMode = config.dateRangeMode;
    if (config.dateRangePreset !== undefined) report.dateRangePreset = config.dateRangePreset || null;
    if (config.startDate !== undefined) report.startDate = config.startDate || null;
    if (config.endDate !== undefined) report.endDate = config.endDate || null;
    if (config.selectedFields) report.selectedFields = config.selectedFields;
    if (config.groupBy !== undefined) report.groupBy = config.groupBy;
    if (config.metrics) report.metrics = config.metrics;
    if (config.metricFilterMetric !== undefined) report.metricFilterMetric = config.metricFilterMetric || null;
    if (config.metricFilterOperator !== undefined) report.metricFilterOperator = config.metricFilterOperator || null;
    if (config.metricFilterValue !== undefined) {
      report.metricFilterValue = typeof config.metricFilterValue === 'number' ? config.metricFilterValue : null;
    }

    this._saveToStorage('reports', reports);
    return report;
  }

  // -------------------- Interface implementations --------------------

  // getHomeOverview()
  getHomeOverview() {
    const games = this._getFromStorage('games');
    const draws = this._getFromStorage('draws');
    const alertsArr = this._getFromStorage('alerts');
    const preferredGamesArr = this._getFromStorage('preferred_games');
    const inboxMessages = this._getFromStorage('inbox_messages');
    const quickAccessTiles = this._getFromStorage('quick_access_tiles');

    const featuredGames = games.filter((g) => g.isFeatured === true);

    const upcomingJackpots = games
      .filter((g) => g.nextDrawDate && typeof g.nextAdvertisedJackpotAmount === 'number')
      .map((g) => ({
        gameId: g.id,
        gameName: g.name,
        nextDrawDate: g.nextDrawDate,
        nextAdvertisedJackpotAmount: g.nextAdvertisedJackpotAmount
      }));

    const drawsWithDate = draws.filter((d) => !!d.drawDate);
    drawsWithDate.sort((a, b) => this._compareByDate(a, b, 'drawDate', 'desc'));
    const latestDrawHighlightsRaw = drawsWithDate.slice(0, 5);
    const gamesMap = this._getGamesMap();
    const latestDrawHighlights = latestDrawHighlightsRaw.map((d) => this._attachRelationsToDraw(d, gamesMap));

    let preferredGame = null;
    if (preferredGamesArr.length > 0) {
      const sortedPref = [...preferredGamesArr].sort((a, b) => {
        const da = this._parseDate(a.createdAt);
        const db = this._parseDate(b.createdAt);
        const va = da ? da.getTime() : 0;
        const vb = db ? db.getTime() : 0;
        return vb - va;
      });
      const pg = sortedPref[0];
      const game = pg.gameId ? gamesMap[pg.gameId] || null : null;
      if (game) {
        preferredGame = {
          preferredGameId: pg.id,
          preferenceName: pg.name,
          gameId: game.id,
          gameName: game.name,
          gameKey: game.gameKey,
          nextDrawDate: game.nextDrawDate || null,
          nextAdvertisedJackpotAmount: typeof game.nextAdvertisedJackpotAmount === 'number'
            ? game.nextAdvertisedJackpotAmount
            : null
        };
      }
    }

    const activeAlerts = alertsArr.filter((a) => a.isActive);
    const recentTriggeredAlertsRaw = alertsArr
      .filter((a) => !!a.lastTriggeredAt)
      .sort((a, b) => this._compareByDate(a, b, 'lastTriggeredAt', 'desc'))
      .slice(0, 5);
    const recentTriggeredAlerts = recentTriggeredAlertsRaw.map((a) => this._attachRelationsToAlert(a, gamesMap));

    const unreadCount = inboxMessages.filter((m) => m && m.isRead === false).length;
    const recentMessages = [...inboxMessages]
      .sort((a, b) => this._compareByDate(a, b, 'createdAt', 'desc'))
      .slice(0, 5);

    return {
      featuredGames,
      upcomingJackpots,
      latestDrawHighlights,
      preferredGame,
      alertsSummary: {
        activeAlertsCount: activeAlerts.length,
        recentTriggeredAlerts
      },
      inboxSummary: {
        unreadCount,
        recentMessages
      },
      quickAccessTiles
    };
  }

  // getGamesOverview(gameType, searchQuery)
  getGamesOverview(gameType, searchQuery) {
    let games = this._getFromStorage('games');

    if (gameType) {
      games = games.filter((g) => g.gameType === gameType);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      games = games.filter((g) => {
        const name = (g.name || '').toLowerCase();
        const desc = (g.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
    }

    return { games };
  }

  // getGameDetails(gameKey)
  getGameDetails(gameKey) {
    const game = this._resolveGameByKey(gameKey);

    const rawRules = localStorage.getItem('game_rules_' + game.id);
    const rulesHtml = rawRules ? JSON.parse(rawRules) : '';

    const rawPrize = localStorage.getItem('game_prize_structure_' + game.id);
    const prizeStructure = rawPrize ? JSON.parse(rawPrize) : [];

    return {
      game,
      rulesHtml,
      prizeStructure
    };
  }

  // getGameDrawResults(gameId, dateRangeMode, dateRangePreset, startDate, endDate, minJackpotAmount, maxJackpotAmount, sortBy, page, pageSize)
  getGameDrawResults(
    gameId,
    dateRangeMode,
    dateRangePreset,
    startDate,
    endDate,
    minJackpotAmount,
    maxJackpotAmount,
    sortBy,
    page,
    pageSize
  ) {
    const drawsAll = this._getFromStorage('draws');
    const gamesMap = this._getGamesMap();

    let draws = drawsAll.filter((d) => d.gameId === gameId);

    draws = this._filterByDateRange(draws, 'drawDate', dateRangeMode, dateRangePreset, startDate, endDate);

    if (typeof minJackpotAmount === 'number') {
      draws = draws.filter((d) => typeof d.jackpotAmount === 'number' && d.jackpotAmount >= minJackpotAmount);
    }
    if (typeof maxJackpotAmount === 'number') {
      draws = draws.filter((d) => typeof d.jackpotAmount === 'number' && d.jackpotAmount <= maxJackpotAmount);
    }

    const sortKey = sortBy || 'draw_date_desc';
    if (sortKey === 'draw_date_desc') {
      draws.sort((a, b) => this._compareByDate(a, b, 'drawDate', 'desc'));
    } else if (sortKey === 'draw_date_asc') {
      draws.sort((a, b) => this._compareByDate(a, b, 'drawDate', 'asc'));
    } else if (sortKey === 'jackpot_desc') {
      draws.sort((a, b) => this._compareByNumber(a, b, 'jackpotAmount', 'desc'));
    } else if (sortKey === 'jackpot_asc') {
      draws.sort((a, b) => this._compareByNumber(a, b, 'jackpotAmount', 'asc'));
    }

    const totalCount = draws.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (p - 1) * ps;
    const pageItems = draws.slice(startIdx, startIdx + ps).map((d) => this._attachRelationsToDraw(d, gamesMap));

    return {
      draws: pageItems,
      totalCount,
      page: p,
      pageSize: ps,
      appliedFilters: {
        dateRangeMode: dateRangeMode || null,
        dateRangePreset: dateRangePreset || null,
        startDate: startDate || null,
        endDate: endDate || null,
        minJackpotAmount: typeof minJackpotAmount === 'number' ? minJackpotAmount : null,
        maxJackpotAmount: typeof maxJackpotAmount === 'number' ? maxJackpotAmount : null,
        sortBy: sortKey
      }
    };
  }

  // getDrawDetails(drawId)
  getDrawDetails(drawId) {
    const draws = this._getFromStorage('draws');
    const games = this._getFromStorage('games');
    const drawTags = this._getFromStorage('draw_tags');
    const tags = this._getFromStorage('tags');
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const draw = draws.find((d) => d.id === drawId);
    if (!draw) {
      throw new Error('Draw not found: ' + drawId);
    }

    const game = games.find((g) => g.id === draw.gameId) || null;

    const drawObj = {
      id: draw.id,
      gameId: draw.gameId,
      gameName: game ? game.name : null,
      drawNumber: draw.drawNumber || null,
      drawDate: draw.drawDate || null,
      winningNumbers: (draw.winningNumbers || []).map((n) => String(n)),
      bonusNumbers: (draw.bonusNumbers || []).map((n) => String(n)),
      jackpotAmount: typeof draw.jackpotAmount === 'number' ? draw.jackpotAmount : null,
      jackpotRolledOver: !!draw.jackpotRolledOver,
      rolloverCount: typeof draw.rolloverCount === 'number' ? draw.rolloverCount : null,
      isFinalized: !!draw.isFinalized,
      game
    };

    const prizeTiers = Array.isArray(draw.prizeTierSummary)
      ? draw.prizeTierSummary.map((t) => ({
          tierName: t.tierName || t.name || '',
          winnersCount: typeof t.winnersCount === 'number' ? t.winnersCount : (typeof t.winners === 'number' ? t.winners : 0),
          prizeAmount: typeof t.prizeAmount === 'number' ? t.prizeAmount : (typeof t.prize === 'number' ? t.prize : 0)
        }))
      : [];

    const tagIdsForDraw = drawTags.filter((dt) => dt.drawId === draw.id).map((dt) => dt.tagId);
    const tagsForDraw = tags.filter((t) => tagIdsForDraw.includes(t.id));

    const collectionIdsForDraw = collectionItems
      .filter((ci) => ci.drawId === draw.id)
      .map((ci) => ci.collectionId);
    const collectionsForDraw = collections.filter((c) => collectionIdsForDraw.includes(c.id));

    const watchlistCollection = collections.find((c) => c.collectionType === 'watchlist' || c.name === 'Watchlist');
    let isInWatchlist = false;
    if (watchlistCollection) {
      isInWatchlist = collectionItems.some(
        (ci) => ci.collectionId === watchlistCollection.id && ci.drawId === draw.id
      );
    }

    const sameGameDraws = draws.filter((d) => d.gameId === draw.gameId);
    sameGameDraws.sort((a, b) => this._compareByDate(a, b, 'drawDate', 'asc'));
    const index = sameGameDraws.findIndex((d) => d.id === draw.id);
    const previousDrawId = index > 0 ? sameGameDraws[index - 1].id : null;
    const nextDrawId = index >= 0 && index < sameGameDraws.length - 1 ? sameGameDraws[index + 1].id : null;

    return {
      draw: drawObj,
      prizeTiers,
      tags: tagsForDraw,
      collections: collectionsForDraw,
      isInWatchlist,
      navigation: {
        previousDrawId,
        nextDrawId
      }
    };
  }

  // getCollectionsOverview()
  getCollectionsOverview() {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const result = collections.map((c) => {
      const itemCount = collectionItems.filter((ci) => ci.collectionId === c.id).length;
      return {
        id: c.id,
        name: c.name,
        description: c.description || '',
        collectionType: c.collectionType,
        itemCount
      };
    });

    return { collections: result };
  }

  // getCollectionItems(collectionId, page, pageSize, sortBy)
  getCollectionItems(collectionId, page, pageSize, sortBy) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const draws = this._getFromStorage('draws');
    const gamesMap = this._getGamesMap();

    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      throw new Error('Collection not found: ' + collectionId);
    }

    const itemDrawIds = collectionItems
      .filter((ci) => ci.collectionId === collectionId)
      .map((ci) => ci.drawId);

    let drawsInCollection = draws.filter((d) => itemDrawIds.includes(d.id));

    const sortKey = sortBy || 'draw_date_desc';
    if (sortKey === 'draw_date_desc') {
      drawsInCollection.sort((a, b) => this._compareByDate(a, b, 'drawDate', 'desc'));
    } else if (sortKey === 'draw_date_asc') {
      drawsInCollection.sort((a, b) => this._compareByDate(a, b, 'drawDate', 'asc'));
    } else if (sortKey === 'jackpot_desc') {
      drawsInCollection.sort((a, b) => this._compareByNumber(a, b, 'jackpotAmount', 'desc'));
    } else if (sortKey === 'jackpot_asc') {
      drawsInCollection.sort((a, b) => this._compareByNumber(a, b, 'jackpotAmount', 'asc'));
    }

    const totalCount = drawsInCollection.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const startIdx = (p - 1) * ps;
    const pageItems = drawsInCollection
      .slice(startIdx, startIdx + ps)
      .map((d) => this._attachRelationsToDraw(d, gamesMap));

    return {
      collection: {
        id: collection.id,
        name: collection.name,
        description: collection.description || '',
        collectionType: collection.collectionType
      },
      draws: pageItems,
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  // addDrawToCollection(drawId, collectionId)
  addDrawToCollection(drawId, collectionId) {
    const collections = this._getFromStorage('collections');
    const draws = this._getFromStorage('draws');
    let collectionItems = this._getFromStorage('collection_items');

    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) {
      throw new Error('Collection not found: ' + collectionId);
    }
    const draw = draws.find((d) => d.id === drawId);
    if (!draw) {
      throw new Error('Draw not found: ' + drawId);
    }

    let existing = collectionItems.find(
      (ci) => ci.collectionId === collectionId && ci.drawId === drawId
    );

    if (!existing) {
      existing = {
        id: this._generateId('collection_item'),
        collectionId,
        drawId,
        addedAt: new Date().toISOString()
      };
      collectionItems.push(existing);
      this._saveToStorage('collection_items', collectionItems);
    }

    const gamesMap = this._getGamesMap();

    return {
      success: true,
      message: 'Draw added to collection',
      collectionItem: {
        ...existing,
        collection,
        draw: this._attachRelationsToDraw(draw, gamesMap)
      }
    };
  }

  // removeDrawFromCollection(drawId, collectionId)
  removeDrawFromCollection(drawId, collectionId) {
    let collectionItems = this._getFromStorage('collection_items');
    const before = collectionItems.length;
    collectionItems = collectionItems.filter(
      (ci) => !(ci.collectionId === collectionId && ci.drawId === drawId)
    );
    this._saveToStorage('collection_items', collectionItems);
    return { success: collectionItems.length < before };
  }

  // applyTagToDraw(drawId, tagLabel)
  applyTagToDraw(drawId, tagLabel) {
    const draws = this._getFromStorage('draws');
    const draw = draws.find((d) => d.id === drawId);
    if (!draw) {
      throw new Error('Draw not found: ' + drawId);
    }

    const tag = this._ensureTagExists(tagLabel);
    let drawTags = this._getFromStorage('draw_tags');

    const exists = drawTags.some((dt) => dt.drawId === drawId && dt.tagId === tag.id);
    if (!exists) {
      const drawTag = {
        id: this._generateId('draw_tag'),
        drawId,
        tagId: tag.id,
        appliedAt: new Date().toISOString()
      };
      drawTags.push(drawTag);
      this._saveToStorage('draw_tags', drawTags);
    }

    return { success: true, tag };
  }

  // removeTagFromDraw(drawId, tagId)
  removeTagFromDraw(drawId, tagId) {
    let drawTags = this._getFromStorage('draw_tags');
    const before = drawTags.length;
    drawTags = drawTags.filter((dt) => !(dt.drawId === drawId && dt.tagId === tagId));
    this._saveToStorage('draw_tags', drawTags);
    return { success: drawTags.length < before };
  }

  // getDashboardOverview()
  getDashboardOverview() {
    const dashboard = this._getOrCreateDefaultDashboard();
    const widgetsAll = this._getFromStorage('dashboard_widgets');
    const gamesMap = this._getGamesMap();

    const widgets = widgetsAll
      .filter((w) => w.dashboardId === dashboard.id)
      .map((w) => this._attachRelationsToDashboardWidget(w, gamesMap));

    const widgetData = widgets
      .filter((w) => w.isVisible !== false)
      .map((w) => {
        let data = { labels: [], values: [] };

        if (w.widgetType === 'number_frequency' && w.gameId) {
          const draws = this._getFromStorage('draws')
            .filter((d) => d.gameId === w.gameId && Array.isArray(d.winningNumbers))
            .sort((a, b) => this._compareByDate(a, b, 'drawDate', 'desc'));

          const limit = typeof w.basedOnLastDraws === 'number' && w.basedOnLastDraws > 0
            ? w.basedOnLastDraws
            : 100;
          const slice = draws.slice(0, limit);

          const freqMap = {};
          slice.forEach((d) => {
            (d.winningNumbers || []).forEach((n) => {
              const key = String(n);
              freqMap[key] = (freqMap[key] || 0) + 1;
            });
          });

          const entries = Object.keys(freqMap).map((num) => ({ num, count: freqMap[num] }));
          entries.sort((a, b) => b.count - a.count || a.num.localeCompare(b.num));

          const top = typeof w.showTopNumbers === 'number' && w.showTopNumbers > 0
            ? w.showTopNumbers
            : 5;
          const topEntries = entries.slice(0, top);

          data = {
            labels: topEntries.map((e) => e.num),
            values: topEntries.map((e) => e.count)
          };
        }

        return { widgetId: w.id, data };
      });

    return {
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        description: dashboard.description || ''
      },
      widgets,
      widgetData
    };
  }

  // addDashboardWidget(widgetType, title, gameId, basedOnLastDraws, showTopNumbers, displayStyle, width, height)
  addDashboardWidget(
    widgetType,
    title,
    gameId,
    basedOnLastDraws,
    showTopNumbers,
    displayStyle,
    width,
    height
  ) {
    const dashboard = this._getOrCreateDefaultDashboard();
    const widgets = this._getFromStorage('dashboard_widgets');

    const widget = {
      id: this._generateId('widget'),
      dashboardId: dashboard.id,
      widgetType,
      title: title || '',
      gameId: gameId || null,
      basedOnLastDraws: typeof basedOnLastDraws === 'number' ? basedOnLastDraws : null,
      showTopNumbers: typeof showTopNumbers === 'number' ? showTopNumbers : null,
      displayStyle: displayStyle || null,
      positionX: 0,
      positionY: 0,
      width: typeof width === 'number' ? width : null,
      height: typeof height === 'number' ? height : null,
      isVisible: true,
      createdAt: new Date().toISOString(),
      updatedAt: null
    };

    widgets.push(widget);
    this._saveToStorage('dashboard_widgets', widgets);

    return { widget };
  }

  // updateDashboardWidget(widgetId, updates)
  updateDashboardWidget(widgetId, updates) {
    let widgets = this._getFromStorage('dashboard_widgets');
    const idx = widgets.findIndex((w) => w.id === widgetId);
    if (idx === -1) {
      throw new Error('Widget not found: ' + widgetId);
    }

    const w = widgets[idx];
    const allowed = [
      'title',
      'gameId',
      'basedOnLastDraws',
      'showTopNumbers',
      'displayStyle',
      'positionX',
      'positionY',
      'width',
      'height',
      'isVisible'
    ];
    allowed.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        w[key] = updates[key];
      }
    });
    w.updatedAt = new Date().toISOString();

    widgets[idx] = w;
    this._saveToStorage('dashboard_widgets', widgets);

    const gamesMap = this._getGamesMap();
    const widgetWithRelations = this._attachRelationsToDashboardWidget(w, gamesMap);

    return { widget: widgetWithRelations };
  }

  // removeDashboardWidget(widgetId)
  removeDashboardWidget(widgetId) {
    let widgets = this._getFromStorage('dashboard_widgets');
    const before = widgets.length;
    widgets = widgets.filter((w) => w.id !== widgetId);
    this._saveToStorage('dashboard_widgets', widgets);
    return { success: widgets.length < before };
  }

  // getReportBuilderOptions(reportType)
  getReportBuilderOptions(reportType) {
    const games = this._getFromStorage('games');

    const dateRangePresets = [
      { id: 'last_7_days', label: 'Last 7 days' },
      { id: 'last_30_days', label: 'Last 30 days' },
      { id: 'last_90_days', label: 'Last 90 days' },
      { id: 'last_6_months', label: 'Last 6 months' },
      { id: 'last_12_months', label: 'Last 12 months' },
      { id: 'today', label: 'Today' },
      { id: 'yesterday', label: 'Yesterday' }
    ];

    const availableFields = [
      {
        id: 'draw_date',
        label: 'Draw date',
        description: 'Date of the draw'
      },
      {
        id: 'winning_numbers',
        label: 'Winning numbers',
        description: 'Winning number combination'
      },
      {
        id: 'jackpot_amount',
        label: 'Jackpot amount',
        description: 'Jackpot amount for the draw'
      }
    ];

    const groupByOptions = [
      { id: 'none', label: 'None' },
      { id: 'draw_date', label: 'Draw date' },
      { id: 'weekday', label: 'Weekday' },
      { id: 'month', label: 'Month' },
      { id: 'game', label: 'Game' }
    ];

    const metricOptions = [
      {
        id: 'average_jackpot',
        label: 'Average jackpot',
        description: 'Average jackpot over the period'
      },
      {
        id: 'max_jackpot',
        label: 'Max jackpot',
        description: 'Maximum jackpot over the period'
      },
      {
        id: 'min_jackpot',
        label: 'Min jackpot',
        description: 'Minimum jackpot over the period'
      },
      {
        id: 'total_jackpot',
        label: 'Total jackpot',
        description: 'Sum of jackpots over the period'
      }
    ];

    const metricFilterOperators = [
      { id: 'greater_than', label: '>' },
      { id: 'greater_or_equal', label: '>=' },
      { id: 'less_than', label: '<' },
      { id: 'less_or_equal', label: '<=' },
      { id: 'equals', label: '=' }
    ];

    return {
      availableGames: games,
      dateRangePresets,
      availableFields,
      groupByOptions,
      metricOptions,
      metricFilterOperators
    };
  }

  // runReport(config)
  runReport(config) {
    if (!config || !config.reportType) {
      throw new Error('reportType is required');
    }

    const report = this._createOrUpdateReportFromConfig(config);

    const drawsAll = this._getFromStorage('draws');
    const gamesMap = this._getGamesMap();

    let draws = drawsAll;
    if (report.gameId) {
      draws = draws.filter((d) => d.gameId === report.gameId);
    }

    draws = this._filterByDateRange(
      draws,
      'drawDate',
      report.dateRangeMode,
      report.dateRangePreset,
      report.startDate,
      report.endDate
    );

    let columns = [];
    let rows = [];

    if (report.reportType === 'detailed') {
      // Detailed report
      const fieldDefs = {
        draw_date: {
          id: 'draw_date',
          label: 'Draw date',
          dataType: 'date',
          accessor: (d) => (d.drawDate ? String(d.drawDate) : '')
        },
        winning_numbers: {
          id: 'winning_numbers',
          label: 'Winning numbers',
          dataType: 'string',
          accessor: (d) => (Array.isArray(d.winningNumbers) ? d.winningNumbers.join('-') : '')
        },
        jackpot_amount: {
          id: 'jackpot_amount',
          label: 'Jackpot amount',
          dataType: 'number',
          accessor: (d) => (typeof d.jackpotAmount === 'number' ? String(d.jackpotAmount) : '')
        }
      };

      const selectedFields = (report.selectedFields && report.selectedFields.length)
        ? report.selectedFields
        : Object.keys(fieldDefs);

      columns = selectedFields
        .filter((f) => fieldDefs[f])
        .map((f) => ({
          id: fieldDefs[f].id,
          label: fieldDefs[f].label,
          dataType: fieldDefs[f].dataType
        }));

      const p = config.page && config.page > 0 ? config.page : 1;
      const ps = config.pageSize && config.pageSize > 0 ? config.pageSize : 50;
      const totalRowCount = draws.length;
      const startIdx = (p - 1) * ps;
      const pageDraws = draws
        .sort((a, b) => this._compareByDate(a, b, 'drawDate', 'desc'))
        .slice(startIdx, startIdx + ps);

      rows = pageDraws.map((d) => {
        return selectedFields
          .filter((f) => fieldDefs[f])
          .map((f) => fieldDefs[f].accessor(d));
      });

      const lastRunAt = new Date().toISOString();
      report.lastRunAt = lastRunAt;
      report.lastRunRowCount = totalRowCount;

      const reports = this._getFromStorage('reports');
      const idx = reports.findIndex((r) => r.id === report.id);
      if (idx !== -1) {
        reports[idx] = report;
        this._saveToStorage('reports', reports);
      }

      return {
        reportId: report.id,
        name: report.name,
        reportType: report.reportType,
        columns,
        rows,
        totalRowCount,
        page: p,
        pageSize: ps,
        lastRunAt
      };
    }

    // Summary report
    const metricsRequested = Array.isArray(report.metrics) && report.metrics.length
      ? report.metrics
      : ['average_jackpot'];

    // Group draws
    const groups = {};
    const pushToGroup = (key, d) => {
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    };

    if (report.groupBy === 'weekday') {
      draws.forEach((d) => {
        const date = this._parseDate(d.drawDate);
        const idx = date ? date.getDay() : 0;
        const key = String(idx);
        pushToGroup(key, d);
      });
    } else if (report.groupBy === 'month') {
      draws.forEach((d) => {
        const date = this._parseDate(d.drawDate);
        if (!date) return;
        const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
        pushToGroup(key, d);
      });
    } else if (report.groupBy === 'game') {
      draws.forEach((d) => {
        const key = d.gameId || 'unknown';
        pushToGroup(key, d);
      });
    } else {
      // none or draw_date
      pushToGroup('all', draws);
    }

    const metricFns = {
      average_jackpot: (arr) => {
        const vals = arr.map((d) => (typeof d.jackpotAmount === 'number' ? d.jackpotAmount : 0));
        if (!vals.length) return 0;
        const sum = vals.reduce((a, b) => a + b, 0);
        return sum / vals.length;
      },
      max_jackpot: (arr) => {
        const vals = arr.map((d) => (typeof d.jackpotAmount === 'number' ? d.jackpotAmount : 0));
        return vals.length ? Math.max(...vals) : 0;
      },
      min_jackpot: (arr) => {
        const vals = arr.map((d) => (typeof d.jackpotAmount === 'number' ? d.jackpotAmount : 0));
        return vals.length ? Math.min(...vals) : 0;
      },
      total_jackpot: (arr) => {
        const vals = arr.map((d) => (typeof d.jackpotAmount === 'number' ? d.jackpotAmount : 0));
        return vals.reduce((a, b) => a + b, 0);
      }
    };

    const columnsArr = [];
    // First column: group label
    let groupLabel = 'All draws';
    if (report.groupBy === 'weekday') groupLabel = 'Weekday';
    else if (report.groupBy === 'month') groupLabel = 'Month';
    else if (report.groupBy === 'game') groupLabel = 'Game';
    columnsArr.push({ id: 'group', label: groupLabel, dataType: 'string' });

    metricsRequested.forEach((m) => {
      if (metricFns[m]) {
        let label = '';
        if (m === 'average_jackpot') label = 'Average jackpot';
        else if (m === 'max_jackpot') label = 'Max jackpot';
        else if (m === 'min_jackpot') label = 'Min jackpot';
        else if (m === 'total_jackpot') label = 'Total jackpot';
        columnsArr.push({ id: m, label, dataType: 'number' });
      }
    });

    const applyMetricFilter = (metricValue) => {
      const metricId = report.metricFilterMetric;
      if (!metricId || report.metricFilterValue == null) return true;
      if (!metricFns[metricId]) return true;
      const op = report.metricFilterOperator;
      const threshold = report.metricFilterValue;
      if (op === 'greater_than') return metricValue > threshold;
      if (op === 'greater_or_equal') return metricValue >= threshold;
      if (op === 'less_than') return metricValue < threshold;
      if (op === 'less_or_equal') return metricValue <= threshold;
      if (op === 'equals') return metricValue === threshold;
      return true;
    };

    const rowsArr = [];
    Object.keys(groups).forEach((key) => {
      const arr = groups[key];
      if (!arr.length) return;

      const metricValues = {};
      metricsRequested.forEach((m) => {
        if (metricFns[m]) {
          metricValues[m] = metricFns[m](arr);
        }
      });

      let filterMetricValue = null;
      if (report.metricFilterMetric && metricFns[report.metricFilterMetric]) {
        filterMetricValue = metricValues[report.metricFilterMetric];
      }

      if (filterMetricValue != null && !applyMetricFilter(filterMetricValue)) {
        return;
      }

      let labelValue = '';
      if (report.groupBy === 'weekday') {
        const idx = parseInt(key, 10);
        labelValue = this._weekdayNameFromIndex(idx);
      } else if (report.groupBy === 'month') {
        labelValue = key;
      } else if (report.groupBy === 'game') {
        const g = gamesMap[key];
        labelValue = g ? g.name : 'Unknown game';
      } else {
        labelValue = 'All draws';
      }

      const row = [labelValue];
      metricsRequested.forEach((m) => {
        if (metricFns[m]) {
          const v = metricValues[m];
          row.push(String(v));
        }
      });

      rowsArr.push(row);
    });

    const lastRunAt = new Date().toISOString();
    report.lastRunAt = lastRunAt;
    report.lastRunRowCount = rowsArr.length;

    const reportsAll = this._getFromStorage('reports');
    const idx = reportsAll.findIndex((r) => r.id === report.id);
    if (idx !== -1) {
      reportsAll[idx] = report;
      this._saveToStorage('reports', reportsAll);
    }

    return {
      reportId: report.id,
      name: report.name,
      reportType: report.reportType,
      columns: columnsArr,
      rows: rowsArr,
      totalRowCount: rowsArr.length,
      page: 1,
      pageSize: rowsArr.length,
      lastRunAt
    };
  }

  // exportReport(reportId, exportFormat, rowScope)
  exportReport(reportId, exportFormat, rowScope) {
    const reports = this._getFromStorage('reports');
    const report = reports.find((r) => r.id === reportId);
    if (!report) {
      throw new Error('Report not found: ' + reportId);
    }

    const exports = this._getFromStorage('report_exports');
    const exportId = this._generateId('report_export');
    const createdAt = new Date().toISOString();
    const downloadUrl = '/downloads/report/' + exportId + '.' + (exportFormat === 'csv' ? 'csv' : 'pdf');

    const exportRecord = {
      id: exportId,
      reportId,
      exportFormat,
      rowScope,
      createdAt,
      downloadUrl
    };

    exports.push(exportRecord);
    this._saveToStorage('report_exports', exports);

    return {
      success: true,
      exportId,
      downloadUrl
    };
  }

  // getSavedReportsList()
  getSavedReportsList() {
    const reports = this._getFromStorage('reports');
    const gamesMap = this._getGamesMap();
    return reports.map((r) => this._attachRelationsToReport(r, gamesMap));
  }

  // getGameComparisonOptions()
  getGameComparisonOptions() {
    const games = this._getFromStorage('games');

    const criteriaOptions = [
      {
        id: 'jackpot_odds',
        label: 'Jackpot odds',
        description: 'Compare odds of winning the jackpot'
      },
      {
        id: 'base_ticket_price',
        label: 'Base ticket price',
        description: 'Compare base ticket prices'
      }
    ];

    return {
      games,
      criteriaOptions
    };
  }

  // runGameComparison(leftGameId, rightGameId, criteria)
  runGameComparison(leftGameId, rightGameId, criteria) {
    const games = this._getFromStorage('games');
    const leftGame = games.find((g) => g.id === leftGameId);
    const rightGame = games.find((g) => g.id === rightGameId);
    if (!leftGame || !rightGame) {
      throw new Error('Both games must exist for comparison');
    }

    const leftOdds = typeof leftGame.jackpotOdds === 'number' ? leftGame.jackpotOdds : Infinity;
    const rightOdds = typeof rightGame.jackpotOdds === 'number' ? rightGame.jackpotOdds : Infinity;
    let betterJackpotOddsGameId = null;
    if (leftOdds < rightOdds) betterJackpotOddsGameId = leftGame.id;
    else if (rightOdds < leftOdds) betterJackpotOddsGameId = rightGame.id;

    const comparisonId = this._generateId('game_comparison');

    const comparison = {
      id: comparisonId,
      leftGameId,
      rightGameId,
      criteria: criteria || [],
      comparedAt: new Date().toISOString(),
      betterJackpotOddsGameId
    };

    const comparisons = this._getFromStorage('game_comparisons');
    comparisons.push(comparison);
    this._saveToStorage('game_comparisons', comparisons);

    const sections = [];

    if (Array.isArray(criteria) && criteria.includes('jackpot_odds')) {
      const leftVal = typeof leftGame.jackpotOdds === 'number'
        ? '1 in ' + leftGame.jackpotOdds
        : 'N/A';
      const rightVal = typeof rightGame.jackpotOdds === 'number'
        ? '1 in ' + rightGame.jackpotOdds
        : 'N/A';
      sections.push({
        id: 'jackpot_odds',
        label: 'Jackpot odds',
        leftValue: leftVal,
        rightValue: rightVal,
        notes: ''
      });
    }

    if (Array.isArray(criteria) && criteria.includes('base_ticket_price')) {
      const leftVal = typeof leftGame.baseTicketPrice === 'number'
        ? String(leftGame.baseTicketPrice)
        : 'N/A';
      const rightVal = typeof rightGame.baseTicketPrice === 'number'
        ? String(rightGame.baseTicketPrice)
        : 'N/A';
      sections.push({
        id: 'base_ticket_price',
        label: 'Base ticket price',
        leftValue: leftVal,
        rightValue: rightVal,
        notes: ''
      });
    }

    return {
      comparisonId,
      leftGame: {
        id: leftGame.id,
        name: leftGame.name,
        gameKey: leftGame.gameKey,
        jackpotOdds: leftGame.jackpotOdds,
        baseTicketPrice: leftGame.baseTicketPrice
      },
      rightGame: {
        id: rightGame.id,
        name: rightGame.name,
        gameKey: rightGame.gameKey,
        jackpotOdds: rightGame.jackpotOdds,
        baseTicketPrice: rightGame.baseTicketPrice
      },
      criteria: criteria || [],
      betterJackpotOddsGameId,
      sections
    };
  }

  // savePreferredGame(gameId, name)
  savePreferredGame(gameId, name) {
    const games = this._getFromStorage('games');
    const game = games.find((g) => g.id === gameId);
    if (!game) {
      throw new Error('Game not found: ' + gameId);
    }

    const preferredGames = this._getFromStorage('preferred_games');
    const id = this._generateId('preferred_game');
    const createdAt = new Date().toISOString();

    const pref = {
      id,
      name,
      gameId,
      source: 'manual_selection',
      createdAt
    };

    preferredGames.push(pref);
    this._saveToStorage('preferred_games', preferredGames);

    return {
      preferredGameId: id,
      name,
      gameId,
      source: 'manual_selection',
      createdAt
    };
  }

  // getPreferredGames()
  getPreferredGames() {
    const prefs = this._getFromStorage('preferred_games');
    const gamesMap = this._getGamesMap();
    return prefs.map((p) => this._attachRelationsToPreferredGame(p, gamesMap));
  }

  // getNumberCheckerOptions()
  getNumberCheckerOptions() {
    const games = this._getFromStorage('games');

    const dateRangePresets = [
      { id: 'last_7_days', label: 'Last 7 days' },
      { id: 'last_30_days', label: 'Last 30 days' },
      { id: 'last_90_days', label: 'Last 90 days' },
      { id: 'last_6_months', label: 'Last 6 months' },
      { id: 'last_12_months', label: 'Last 12 months' },
      { id: 'today', label: 'Today' },
      { id: 'yesterday', label: 'Yesterday' }
    ];

    const matchThresholdOptions = [
      { id: 'at_least_1_match', label: 'At least 1 matching number' },
      { id: 'at_least_2_matches', label: 'At least 2 matching numbers' },
      { id: 'at_least_3_matches', label: 'At least 3 matching numbers' },
      { id: 'at_least_4_matches', label: 'At least 4 matching numbers' },
      { id: 'at_least_5_matches', label: 'At least 5 matching numbers' },
      { id: 'all_numbers_match', label: 'All numbers match' }
    ];

    return {
      games,
      dateRangePresets,
      matchThresholdOptions
    };
  }

  // runNumberCheck(criteria)
  runNumberCheck(criteria) {
    if (!criteria || !criteria.gameId || !Array.isArray(criteria.numbers)) {
      throw new Error('Invalid number check criteria');
    }

    const drawsAll = this._getFromStorage('draws');
    const gamesMap = this._getGamesMap();

    let draws = drawsAll.filter((d) => d.gameId === criteria.gameId);

    draws = this._filterByDateRange(
      draws,
      'drawDate',
      criteria.dateRangeMode,
      criteria.dateRangePreset,
      criteria.startDate,
      criteria.endDate
    );

    const userNumbers = criteria.numbers.map((n) => String(n));

    const thresholdMap = {
      at_least_1_match: 1,
      at_least_2_matches: 2,
      at_least_3_matches: 3,
      at_least_4_matches: 4,
      at_least_5_matches: 5,
      all_numbers_match: userNumbers.length
    };

    const threshold = thresholdMap[criteria.matchThreshold] || 1;

    const results = [];

    draws.forEach((d) => {
      const winning = (d.winningNumbers || []).map((n) => String(n));
      const matchingNumbers = userNumbers.filter((n) => winning.includes(n));
      const matchCount = matchingNumbers.length;
      if (matchCount >= threshold) {
        results.push({
          drawId: d.id,
          drawDate: d.drawDate || null,
          matchingNumbers,
          matchCount,
          jackpotAmount: typeof d.jackpotAmount === 'number' ? d.jackpotAmount : null,
          draw: this._attachRelationsToDraw(d, gamesMap)
        });
      }
    });

    return {
      totalMatches: results.length,
      results
    };
  }

  // saveNumberSearch(name, criteria)
  saveNumberSearch(name, criteria) {
    if (!criteria || !criteria.gameId || !Array.isArray(criteria.numbers)) {
      throw new Error('Invalid number search criteria');
    }

    const numberSearches = this._getFromStorage('number_searches');
    const id = this._generateId('number_search');
    const createdAt = new Date().toISOString();

    const search = {
      id,
      name,
      gameId: criteria.gameId,
      numbers: criteria.numbers.map((n) => String(n)),
      dateRangeMode: criteria.dateRangeMode || 'preset',
      dateRangePreset: criteria.dateRangePreset || null,
      startDate: criteria.startDate || null,
      endDate: criteria.endDate || null,
      matchThreshold: criteria.matchThreshold || 'at_least_1_match',
      createdAt,
      lastRunAt: null
    };

    numberSearches.push(search);
    this._saveToStorage('number_searches', numberSearches);

    return {
      numberSearchId: id,
      createdAt
    };
  }

  // getSavedNumberSearches()
  getSavedNumberSearches() {
    const searches = this._getFromStorage('number_searches');
    const gamesMap = this._getGamesMap();
    return searches.map((s) => this._attachRelationsToNumberSearch(s, gamesMap));
  }

  // getAlertsOverview()
  getAlertsOverview() {
    const alertsArr = this._getFromStorage('alerts');
    const gamesMap = this._getGamesMap();
    const alertsWithRelations = alertsArr.map((a) => this._attachRelationsToAlert(a, gamesMap));

    const conditionTypes = [
      {
        id: 'next_advertised_jackpot',
        label: 'Next advertised jackpot',
        description: 'Trigger when the next advertised jackpot crosses a threshold.'
      },
      {
        id: 'jackpot_rolled_over',
        label: 'Jackpot rolled over',
        description: 'Trigger when a jackpot rolls over.'
      },
      {
        id: 'jackpot_hit',
        label: 'Jackpot hit',
        description: 'Trigger when a jackpot is won.'
      },
      {
        id: 'winning_numbers_match',
        label: 'Winning numbers match',
        description: 'Trigger based on specific winning numbers.'
      },
      {
        id: 'general_notification',
        label: 'General notification',
        description: 'Generic notification alert.'
      }
    ];

    const notificationMethods = [
      {
        id: 'in_portal_inbox',
        label: 'In-portal inbox',
        description: 'Show notifications in the portal inbox.'
      },
      {
        id: 'email',
        label: 'Email',
        description: 'Send notifications via email.'
      },
      {
        id: 'sms',
        label: 'SMS',
        description: 'Send notifications via SMS text message.'
      },
      {
        id: 'push_notification',
        label: 'Push notification',
        description: 'Send push notifications to supported devices.'
      }
    ];

    return {
      alerts: alertsWithRelations,
      conditionTypes,
      notificationMethods
    };
  }

  // createAlert(name, gameId, conditionType, thresholdAmount, notificationMethod)
  createAlert(name, gameId, conditionType, thresholdAmount, notificationMethod) {
    const games = this._getFromStorage('games');
    const game = games.find((g) => g.id === gameId);
    if (!game) {
      throw new Error('Game not found: ' + gameId);
    }

    const alertsArr = this._getFromStorage('alerts');
    const alertId = this._generateId('alert');
    const createdAt = new Date().toISOString();

    const alert = {
      id: alertId,
      name,
      gameId,
      conditionType,
      thresholdAmount: typeof thresholdAmount === 'number' ? thresholdAmount : null,
      notificationMethod,
      isActive: true,
      createdAt,
      lastTriggeredAt: null
    };

    alertsArr.push(alert);
    this._saveToStorage('alerts', alertsArr);

    return {
      alertId,
      createdAt,
      isActive: true
    };
  }

  // updateAlert(alertId, updates)
  updateAlert(alertId, updates) {
    let alertsArr = this._getFromStorage('alerts');
    const idx = alertsArr.findIndex((a) => a.id === alertId);
    if (idx === -1) {
      throw new Error('Alert not found: ' + alertId);
    }

    const alert = alertsArr[idx];
    const allowed = [
      'name',
      'gameId',
      'conditionType',
      'thresholdAmount',
      'notificationMethod',
      'isActive'
    ];
    allowed.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        alert[key] = updates[key];
      }
    });

    alertsArr[idx] = alert;
    this._saveToStorage('alerts', alertsArr);

    const gamesMap = this._getGamesMap();
    const alertWithRelations = this._attachRelationsToAlert(alert, gamesMap);

    return { alert: alertWithRelations };
  }

  // deleteAlert(alertId)
  deleteAlert(alertId) {
    let alertsArr = this._getFromStorage('alerts');
    const before = alertsArr.length;
    alertsArr = alertsArr.filter((a) => a.id !== alertId);
    this._saveToStorage('alerts', alertsArr);
    return { success: alertsArr.length < before };
  }

  // getDrawHistoryFilterOptions()
  getDrawHistoryFilterOptions() {
    const games = this._getFromStorage('games');

    const dateRangePresets = [
      { id: 'last_7_days', label: 'Last 7 days' },
      { id: 'last_30_days', label: 'Last 30 days' },
      { id: 'last_90_days', label: 'Last 90 days' },
      { id: 'last_6_months', label: 'Last 6 months' },
      { id: 'last_12_months', label: 'Last 12 months' },
      { id: 'today', label: 'Today' },
      { id: 'yesterday', label: 'Yesterday' }
    ];

    const additionalFilters = [
      {
        id: 'jackpotRolledOver',
        label: 'Jackpot rolled over',
        type: 'boolean'
      }
    ];

    return {
      games,
      dateRangePresets,
      additionalFilters
    };
  }

  // getDrawHistory(filters)
  getDrawHistory(filters) {
    const drawsAll = this._getFromStorage('draws');
    const gamesMap = this._getGamesMap();

    let draws = drawsAll;

    if (filters && filters.gameId) {
      draws = draws.filter((d) => d.gameId === filters.gameId);
    }

    draws = this._filterByDateRange(
      draws,
      'drawDate',
      filters.dateRangeMode,
      filters.dateRangePreset,
      filters.startDate,
      filters.endDate
    );

    if (filters && filters.jackpotRolledOver === true) {
      draws = draws.filter((d) => d.jackpotRolledOver === true);
    }

    const sortKey = (filters && filters.sortBy) || 'draw_date_desc';
    if (sortKey === 'draw_date_desc') {
      draws.sort((a, b) => this._compareByDate(a, b, 'drawDate', 'desc'));
    } else if (sortKey === 'draw_date_asc') {
      draws.sort((a, b) => this._compareByDate(a, b, 'drawDate', 'asc'));
    } else if (sortKey === 'jackpot_desc') {
      draws.sort((a, b) => this._compareByNumber(a, b, 'jackpotAmount', 'desc'));
    } else if (sortKey === 'jackpot_asc') {
      draws.sort((a, b) => this._compareByNumber(a, b, 'jackpotAmount', 'asc'));
    }

    const p = filters && filters.page && filters.page > 0 ? filters.page : 1;
    const ps = filters && filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 50;
    const totalCount = draws.length;
    const startIdx = (p - 1) * ps;
    const pageItems = draws
      .slice(startIdx, startIdx + ps)
      .map((d) => this._attachRelationsToDraw(d, gamesMap));

    return {
      draws: pageItems,
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  // applyTagToDraws(drawIds, tagLabel)
  applyTagToDraws(drawIds, tagLabel) {
    if (!Array.isArray(drawIds)) {
      throw new Error('drawIds must be an array');
    }

    const tag = this._ensureTagExists(tagLabel);
    let drawTags = this._getFromStorage('draw_tags');

    let affectedCount = 0;

    drawIds.forEach((drawId) => {
      const exists = drawTags.some((dt) => dt.drawId === drawId && dt.tagId === tag.id);
      if (!exists) {
        const dt = {
          id: this._generateId('draw_tag'),
          drawId,
          tagId: tag.id,
          appliedAt: new Date().toISOString()
        };
        drawTags.push(dt);
        affectedCount += 1;
      }
    });

    this._saveToStorage('draw_tags', drawTags);

    return {
      success: true,
      tag,
      affectedCount
    };
  }

  // getRetailerStats(filters)
  getRetailerStats(filters) {
    const statsAll = this._getFromStorage('retailer_stats');
    const retailersAll = this._getFromStorage('retailers');

    const retailerMap = retailersAll.reduce((acc, r) => {
      if (r && r.id) acc[r.id] = r;
      return acc;
    }, {});

    let stats = statsAll;

    if (filters && filters.periodPreset) {
      stats = stats.filter((s) => s.periodPreset === filters.periodPreset);
    }

    if (filters && filters.gameId) {
      if (filters.gameId === 'all_games') {
        stats = stats.filter((s) => s.gameId === 'all_games');
      } else {
        stats = stats.filter((s) => s.gameId === filters.gameId);
      }
    }

    if (filters && filters.cityQuery) {
      const q = filters.cityQuery.toLowerCase();
      stats = stats.filter((s) => {
        const retailer = retailerMap[s.retailerId];
        if (!retailer) return false;
        const city = (retailer.city || '').toLowerCase();
        return city.includes(q);
      });
    }

    // Aggregate per retailer
    const aggMap = {};
    stats.forEach((s) => {
      const retailerId = s.retailerId;
      const retailer = retailerMap[retailerId];
      if (!retailer) return;
      if (!aggMap[retailerId]) {
        aggMap[retailerId] = {
          retailerId,
          retailerName: retailer.name,
          city: retailer.city,
          isBookmarked: !!retailer.isBookmarked,
          totalWinningTickets: 0,
          totalJackpotWinners: 0,
          totalPrizesAmount: 0
        };
      }
      const agg = aggMap[retailerId];
      agg.totalWinningTickets += s.totalWinningTickets || 0;
      agg.totalJackpotWinners += s.totalJackpotWinners || 0;
      agg.totalPrizesAmount += s.totalPrizesAmount || 0;
    });

    let list = Object.values(aggMap);

    const sortKey = (filters && filters.sortBy) || 'total_winning_tickets_desc';
    if (sortKey === 'total_winning_tickets_desc') {
      list.sort((a, b) => b.totalWinningTickets - a.totalWinningTickets);
    } else if (sortKey === 'total_winning_tickets_asc') {
      list.sort((a, b) => a.totalWinningTickets - b.totalWinningTickets);
    }

    const p = filters && filters.page && filters.page > 0 ? filters.page : 1;
    const ps = filters && filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 50;
    const totalCount = list.length;
    const startIdx = (p - 1) * ps;
    const pageItems = list.slice(startIdx, startIdx + ps).map((item) =>
      this._attachRelationsToRetailerStatsItem(item, retailerMap)
    );

    return {
      retailers: pageItems,
      totalCount,
      page: p,
      pageSize: ps
    };
  }

  // toggleRetailerBookmark(retailerId, isBookmarked)
  toggleRetailerBookmark(retailerId, isBookmarked) {
    let retailers = this._getFromStorage('retailers');
    const idx = retailers.findIndex((r) => r.id === retailerId);
    if (idx === -1) {
      throw new Error('Retailer not found: ' + retailerId);
    }

    retailers[idx].isBookmarked = !!isBookmarked;
    this._saveToStorage('retailers', retailers);

    return {
      retailerId,
      isBookmarked: !!isBookmarked
    };
  }

  // getBookmarkedRetailers(city)
  getBookmarkedRetailers(city) {
    const retailers = this._getFromStorage('retailers');
    let list = retailers.filter((r) => r.isBookmarked);
    if (city) {
      const c = city.toLowerCase();
      list = list.filter((r) => (r.city || '').toLowerCase() === c);
    }
    return list;
  }

  // saveRetailerList(name, description, retailerIds)
  saveRetailerList(name, description, retailerIds) {
    if (!Array.isArray(retailerIds)) {
      throw new Error('retailerIds must be an array');
    }
    const lists = this._getFromStorage('retailer_lists');
    const id = this._generateId('retailer_list');
    const createdAt = new Date().toISOString();

    const list = {
      id,
      name,
      description: description || '',
      retailerIds: retailerIds.slice(),
      createdAt
    };

    lists.push(list);
    this._saveToStorage('retailer_lists', lists);

    return {
      retailerListId: id,
      createdAt
    };
  }

  // renameCollection(collectionId, name)
  renameCollection(collectionId, name) {
    const collections = this._getFromStorage('collections');
    const idx = collections.findIndex((c) => c.id === collectionId);
    if (idx === -1) {
      throw new Error('Collection not found: ' + collectionId);
    }

    collections[idx].name = name;
    this._saveToStorage('collections', collections);

    return { collection: collections[idx] };
  }

  // deleteCollection(collectionId)
  deleteCollection(collectionId) {
    let collections = this._getFromStorage('collections');
    const before = collections.length;
    collections = collections.filter((c) => c.id !== collectionId);
    this._saveToStorage('collections', collections);

    // Also remove related collection_items
    let items = this._getFromStorage('collection_items');
    items = items.filter((ci) => ci.collectionId !== collectionId);
    this._saveToStorage('collection_items', items);

    return { success: collections.length < before };
  }

  // getAboutContent()
  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      missionHtml: parsed.missionHtml || '',
      dataSourcesHtml: parsed.dataSourcesHtml || '',
      contactHtml: parsed.contactHtml || ''
    };
  }

  // getHelpContent()
  getHelpContent() {
    const raw = localStorage.getItem('help_content');
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
      tutorials: Array.isArray(parsed.tutorials) ? parsed.tutorials : [],
      supportInfoHtml: parsed.supportInfoHtml || ''
    };
  }

  // getLegalContent(documentType)
  getLegalContent(documentType) {
    const key = 'legal_content_' + documentType;
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return {
      title: parsed.title || '',
      bodyHtml: parsed.bodyHtml || '',
      lastUpdated: parsed.lastUpdated || ''
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
