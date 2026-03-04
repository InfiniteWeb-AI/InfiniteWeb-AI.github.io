/* localStorage polyfill for Node.js and environments without localStorage */
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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const tables = [
      'games',
      'draws',
      'prize_tiers',
      'watched_draws',
      'starred_draws',
      'favorite_games',
      'hot_number_sets',
      'custom_results_views',
      'reminders',
      'draw_notes',
      'ticket_checks',
      'number_checker_searches'
    ];

    tables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single-user state object
    if (!localStorage.getItem('user_state')) {
      localStorage.setItem(
        'user_state',
        JSON.stringify({
          id: 'user_state_singleton',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
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
    const currentStr = localStorage.getItem('idCounter') || '1000';
    const current = parseInt(currentStr, 10) || 1000;
    const next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ----------------------
  // General helpers
  // ----------------------

  _normalizeDate(dateLike) {
    if (!dateLike) return null;

    // If the input is already a plain ISO date (YYYY-MM-DD), return it as-is
    // to avoid timezone shifts when converting to a Date object.
    if (typeof dateLike === 'string') {
      const m = dateLike.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        return m[1] + '-' + m[2] + '-' + m[3];
      }
    }

    const d = new Date(dateLike);
    if (Number.isNaN(d.getTime())) return null;
    // Use UTC date portion to avoid environment-dependent timezone offsets
    const iso = d.toISOString();
    return iso.slice(0, 10);
  }

  _parseDateTime(dateTimeLike) {
    if (!dateTimeLike) return null;
    const d = new Date(dateTimeLike);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  _isDateInRange(dateTimeLike, startDateIso, endDateIso) {
    const d = this._parseDateTime(dateTimeLike);
    if (!d) return false;
    if (startDateIso) {
      const sd = this._parseDateTime(startDateIso + 'T00:00:00Z');
      if (sd && d < sd) return false;
    }
    if (endDateIso) {
      const ed = this._parseDateTime(endDateIso + 'T23:59:59Z');
      if (ed && d > ed) return false;
    }
    return true;
  }

  _getGameById(gameId) {
    if (!gameId) return null;
    const games = this._getFromStorage('games');
    return games.find((g) => g.id === gameId) || null;
  }

  _sortByDate(draws, field, direction) {
    const dir = direction === 'asc' ? 1 : -1;
    return draws.slice().sort((a, b) => {
      const da = this._parseDateTime(a[field]);
      const db = this._parseDateTime(b[field]);
      const ta = da ? da.getTime() : 0;
      const tb = db ? db.getTime() : 0;
      if (ta === tb) return 0;
      return ta < tb ? -1 * dir : 1 * dir;
    });
  }

  _sortByNumber(items, field, direction) {
    const dir = direction === 'asc' ? 1 : -1;
    return items.slice().sort((a, b) => {
      const va = typeof a[field] === 'number' ? a[field] : 0;
      const vb = typeof b[field] === 'number' ? b[field] : 0;
      if (va === vb) return 0;
      return va < vb ? -1 * dir : 1 * dir;
    });
  }

  _arraysEqual(arr1, arr2) {
    if (!Array.isArray(arr1) || !Array.isArray(arr2)) return false;
    if (arr1.length !== arr2.length) return false;
    for (let i = 0; i < arr1.length; i += 1) {
      if (arr1[i] !== arr2[i]) return false;
    }
    return true;
  }

  _sortedNumbersSignature(numbers) {
    if (!Array.isArray(numbers)) return '';
    const copy = numbers.slice().map((n) => Number(n));
    copy.sort((a, b) => a - b);
    return copy.join(',');
  }

  _getOrCreateUserStateStore() {
    // Single-user state object; mostly placeholder, can be extended
    let state = this._getFromStorage('user_state', null);
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      state = {
        id: 'user_state_singleton',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this._saveToStorage('user_state', state);
    }
    return state;
  }

  _updateUserState(mutator) {
    const state = this._getOrCreateUserStateStore();
    const updated = mutator ? mutator(state) || state : state;
    updated.updatedAt = new Date().toISOString();
    this._saveToStorage('user_state', updated);
    return updated;
  }

  _findDrawByGameAndDate(gameId, drawDateIso) {
    const draws = this._getFromStorage('draws');
    const targetDate = this._normalizeDate(drawDateIso);
    if (!gameId || !targetDate) return null;

    const matches = draws.filter((d) => {
      if (d.gameId !== gameId) return false;
      const dDate = this._normalizeDate(d.drawDateTime);
      return dDate === targetDate;
    });

    if (!matches.length) return null;

    // Prefer completed draws, then earliest time
    const completed = matches.filter((d) => d.drawStatus === 'completed');
    const pool = completed.length ? completed : matches;
    const sorted = this._sortByDate(pool, 'drawDateTime', 'asc');
    return sorted[0] || null;
  }

  _upsertReminderForDraw(drawId, notifyAtIso, deliveryMethod, note) {
    let reminders = this._getFromStorage('reminders');
    const nowIso = new Date().toISOString();
    let reminder = reminders.find((r) => r.drawId === drawId && r.reminderStatus !== 'canceled');

    if (reminder) {
      if (notifyAtIso) reminder.notifyAt = notifyAtIso;
      if (deliveryMethod) reminder.deliveryMethod = deliveryMethod;
      if (note !== undefined) reminder.note = note;
      reminder.reminderStatus = 'active';
      reminder.updatedAt = nowIso;
    } else {
      reminder = {
        id: this._generateId('reminder'),
        drawId: drawId,
        reminderStatus: 'active',
        notifyAt: notifyAtIso || null,
        deliveryMethod: deliveryMethod || 'onsite',
        note: note || '',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      reminders.push(reminder);
    }

    this._saveToStorage('reminders', reminders);
    return reminder;
  }

  // ----------------------
  // Interface: getGamesList
  // ----------------------

  getGamesList(gameType, onlyActive) {
    const games = this._getFromStorage('games');
    const activeFlag = onlyActive === undefined ? true : !!onlyActive;

    return games.filter((g) => {
      if (activeFlag && g.isActive === false) return false;
      if (gameType && g.gameType !== gameType) return false;
      return true;
    });
  }

  // ----------------------
  // Interface: getHomeOverview
  // ----------------------

  getHomeOverview() {
    const games = this._getFromStorage('games');
    const draws = this._getFromStorage('draws');
    const watched = this._getFromStorage('watched_draws');
    const favorites = this._getFromStorage('favorite_games');
    const hotSets = this._getFromStorage('hot_number_sets');
    const reminders = this._getFromStorage('reminders');

    const nextDrawsRaw = draws.filter((d) => d.drawStatus === 'scheduled');
    const nextDrawsSorted = this._sortByDate(nextDrawsRaw, 'drawDateTime', 'asc').slice(0, 5);
    const nextDraws = nextDrawsSorted.map((d) => ({
      draw: d,
      game: this._getGameById(d.gameId)
    }));

    const biggestJackpots = games
      .filter((g) => g.isActive !== false)
      .slice()
      .sort((a, b) => {
        const ja = typeof a.currentJackpotAmount === 'number' ? a.currentJackpotAmount : 0;
        const jb = typeof b.currentJackpotAmount === 'number' ? b.currentJackpotAmount : 0;
        if (ja === jb) return 0;
        return ja < jb ? 1 : -1;
      })
      .slice(0, 5)
      .map((g) => ({
        game: g,
        currentJackpotAmount: typeof g.currentJackpotAmount === 'number' ? g.currentJackpotAmount : 0,
        currentJackpotCurrency: g.currentJackpotCurrency || 'mop'
      }));

    const completedDraws = draws.filter((d) => d.drawStatus === 'completed');
    const latestResultsRaw = this._sortByDate(completedDraws, 'drawDateTime', 'desc').slice(0, 5);
    const latestResults = latestResultsRaw.map((d) => ({
      draw: d,
      game: this._getGameById(d.gameId)
    }));

    const activeRemindersCount = reminders.filter((r) => r.reminderStatus === 'active').length;

    return {
      nextDraws: nextDraws,
      biggestJackpots: biggestJackpots,
      latestResults: latestResults,
      userSectionsSummary: {
        watchedDrawsCount: watched.length,
        favoriteGamesCount: favorites.length,
        hotNumberSetsCount: hotSets.length,
        activeRemindersCount: activeRemindersCount
      }
    };
  }

  // -----------------------------
  // Interface: getJackpotOverviewDraws
  // -----------------------------

  getJackpotOverviewDraws(gameId, timeRangeType, startDate, endDate, sortOrder, limit) {
    const draws = this._getFromStorage('draws');
    const games = this._getFromStorage('games');

    const now = new Date();
    const todayIso = this._normalizeDate(now.toISOString());

    let computedStart = null;
    let computedEnd = null;
    const trType = timeRangeType || 'last_30_days';

    if (trType === 'upcoming_only') {
      computedStart = todayIso;
      computedEnd = null;
    } else if (trType === 'last_7_days') {
      const d = new Date(now.getTime());
      d.setDate(d.getDate() - 7);
      computedStart = this._normalizeDate(d.toISOString());
      computedEnd = todayIso;
    } else if (trType === 'last_30_days') {
      const d = new Date(now.getTime());
      d.setDate(d.getDate() - 30);
      computedStart = this._normalizeDate(d.toISOString());
      computedEnd = todayIso;
    } else if (trType === 'last_12_months') {
      const d = new Date(now.getTime());
      d.setMonth(d.getMonth() - 12);
      computedStart = this._normalizeDate(d.toISOString());
      computedEnd = todayIso;
    } else if (trType === 'all_available') {
      computedStart = null;
      computedEnd = null;
    }

    if (startDate) computedStart = startDate;
    if (endDate) computedEnd = endDate;

    let filtered = draws.filter((d) => {
      if (gameId && d.gameId !== gameId) return false;
      if (computedStart || computedEnd) {
        if (!this._isDateInRange(d.drawDateTime, computedStart, computedEnd)) return false;
      }
      return typeof d.jackpotAmount === 'number';
    });

    const order = sortOrder || 'jackpot_high_to_low';

    if (order === 'jackpot_high_to_low') {
      filtered = filtered.slice().sort((a, b) => {
        const ja = typeof a.jackpotAmount === 'number' ? a.jackpotAmount : 0;
        const jb = typeof b.jackpotAmount === 'number' ? b.jackpotAmount : 0;
        if (ja === jb) return 0;
        return ja < jb ? 1 : -1;
      });
    } else if (order === 'jackpot_low_to_high') {
      filtered = filtered.slice().sort((a, b) => {
        const ja = typeof a.jackpotAmount === 'number' ? a.jackpotAmount : 0;
        const jb = typeof b.jackpotAmount === 'number' ? b.jackpotAmount : 0;
        if (ja === jb) return 0;
        return ja < jb ? -1 : 1;
      });
    } else if (order === 'date_newest_first') {
      filtered = this._sortByDate(filtered, 'drawDateTime', 'desc');
    } else if (order === 'date_oldest_first') {
      filtered = this._sortByDate(filtered, 'drawDateTime', 'asc');
    }

    if (typeof limit === 'number') {
      filtered = filtered.slice(0, limit);
    }

    const resultDraws = filtered.map((d) => ({
      draw: d,
      game: games.find((g) => g.id === d.gameId) || null
    }));

    return {
      draws: resultDraws,
      appliedFilters: {
        timeRangeType: trType,
        sortOrder: order
      }
    };
  }

  // -----------------------------
  // Interface: getJackpotHistoryDraws
  // -----------------------------

  getJackpotHistoryDraws(gameId, year, startDate, endDate, sortOrder, jackpotMin, jackpotMax) {
    const draws = this._getFromStorage('draws');
    const games = this._getFromStorage('games');

    let s = startDate || null;
    let e = endDate || null;

    if (year && (!s || !e)) {
      s = year + '-01-01';
      e = year + '-12-31';
    }

    let filtered = draws.filter((d) => {
      if (d.gameId !== gameId) return false;
      if (s || e) {
        if (!this._isDateInRange(d.drawDateTime, s, e)) return false;
      }
      if (typeof jackpotMin === 'number' && (typeof d.jackpotAmount !== 'number' || d.jackpotAmount < jackpotMin)) return false;
      if (typeof jackpotMax === 'number' && (typeof d.jackpotAmount !== 'number' || d.jackpotAmount > jackpotMax)) return false;
      return true;
    });

    const order = sortOrder || 'date_newest_first';
    if (order === 'date_oldest_first') {
      filtered = this._sortByDate(filtered, 'drawDateTime', 'asc');
    } else if (order === 'date_newest_first') {
      filtered = this._sortByDate(filtered, 'drawDateTime', 'desc');
    } else if (order === 'jackpot_high_to_low') {
      filtered = this._sortByNumber(filtered, 'jackpotAmount', 'desc');
    } else if (order === 'jackpot_low_to_high') {
      filtered = this._sortByNumber(filtered, 'jackpotAmount', 'asc');
    }

    const resultDraws = filtered.map((d) => ({
      draw: d,
      game: games.find((g) => g.id === d.gameId) || null
    }));

    return { draws: resultDraws };
  }

  // ----------------------
  // Interface: getDrawDetails
  // ----------------------

  getDrawDetails(drawId) {
    const draws = this._getFromStorage('draws');
    const watched = this._getFromStorage('watched_draws');
    const starred = this._getFromStorage('starred_draws');
    const notes = this._getFromStorage('draw_notes');
    const prizeTiers = this._getFromStorage('prize_tiers');

    const draw = draws.find((d) => d.id === drawId) || null;
    const game = draw ? this._getGameById(draw.gameId) : null;
    const isWatched = !!watched.find((w) => w.drawId === drawId);
    const isStarred = !!starred.find((s) => s.drawId === drawId);
    const drawNotes = notes.filter((n) => n.drawId === drawId);

    const hasPrize = draw
      ? draw.prizeBreakdownAvailable === true || prizeTiers.some((p) => p.drawId === draw.id)
      : false;

    return {
      draw: draw,
      game: game,
      isWatched: isWatched,
      isStarred: isStarred,
      notes: drawNotes,
      prizeBreakdownAvailable: hasPrize
    };
  }

  // ----------------------
  // Watched Draws
  // ----------------------

  addDrawToWatched(drawId, source) {
    const draws = this._getFromStorage('draws');
    const draw = draws.find((d) => d.id === drawId);
    if (!draw) {
      return { success: false, watchedDraw: null, message: 'Draw not found' };
    }

    let watched = this._getFromStorage('watched_draws');
    let existing = watched.find((w) => w.drawId === drawId);
    if (existing) {
      return { success: true, watchedDraw: existing, message: 'Already in watched draws' };
    }

    const nowIso = new Date().toISOString();
    const watchedDraw = {
      id: this._generateId('watched'),
      drawId: drawId,
      addedAt: nowIso,
      source: source || 'other'
    };

    watched.push(watchedDraw);
    this._saveToStorage('watched_draws', watched);

    return { success: true, watchedDraw: watchedDraw, message: 'Draw added to watched draws' };
  }

  removeWatchedDraw(watchedDrawId) {
    let watched = this._getFromStorage('watched_draws');
    const initialLen = watched.length;
    watched = watched.filter((w) => w.id !== watchedDrawId);
    this._saveToStorage('watched_draws', watched);
    const success = watched.length !== initialLen;
    return { success: success, message: success ? 'Removed' : 'Not found' };
  }

  getWatchedDraws(sortOrder) {
    const watched = this._getFromStorage('watched_draws');
    const draws = this._getFromStorage('draws');
    const games = this._getFromStorage('games');

    const records = watched.map((w) => {
      const draw = draws.find((d) => d.id === w.drawId) || null;
      const game = draw ? games.find((g) => g.id === draw.gameId) || null : null;
      return { watched: w, draw: draw, game: game };
    });

    const order = sortOrder || 'date_newest_first';

    const sorted = records.slice().sort((a, b) => {
      if (!a.draw || !b.draw) return 0;
      if (order === 'date_newest_first' || order === 'date_oldest_first') {
        const dir = order === 'date_newest_first' ? -1 : 1;
        const da = this._parseDateTime(a.draw.drawDateTime);
        const db = this._parseDateTime(b.draw.drawDateTime);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        if (ta === tb) return 0;
        return ta < tb ? -1 * dir : 1 * dir;
      }
      if (order === 'jackpot_high_to_low' || order === 'jackpot_low_to_high') {
        const dir = order === 'jackpot_high_to_low' ? -1 : 1;
        const ja = a.draw && typeof a.draw.jackpotAmount === 'number' ? a.draw.jackpotAmount : 0;
        const jb = b.draw && typeof b.draw.jackpotAmount === 'number' ? b.draw.jackpotAmount : 0;
        if (ja === jb) return 0;
        return ja < jb ? -1 * dir : 1 * dir;
      }
      return 0;
    });

    return sorted;
  }

  // ----------------------
  // Starred Draws
  // ----------------------

  starDraw(drawId, source) {
    const draws = this._getFromStorage('draws');
    const draw = draws.find((d) => d.id === drawId);
    if (!draw) {
      return { success: false, starredDraw: null, message: 'Draw not found' };
    }

    let starred = this._getFromStorage('starred_draws');
    let existing = starred.find((s) => s.drawId === drawId);
    if (existing) {
      return { success: true, starredDraw: existing, message: 'Already starred' };
    }

    const nowIso = new Date().toISOString();
    const starredDraw = {
      id: this._generateId('starred'),
      drawId: drawId,
      starredAt: nowIso,
      source: source || 'other'
    };

    starred.push(starredDraw);
    this._saveToStorage('starred_draws', starred);

    return { success: true, starredDraw: starredDraw, message: 'Draw starred' };
  }

  unstarDraw(drawId) {
    let starred = this._getFromStorage('starred_draws');
    const initialLen = starred.length;
    starred = starred.filter((s) => s.drawId !== drawId);
    this._saveToStorage('starred_draws', starred);
    const success = starred.length !== initialLen;
    return { success: success, message: success ? 'Unstarred' : 'Not found' };
  }

  // ----------------------
  // Ticket Checker Config
  // ----------------------

  getTicketCheckerConfig() {
    const games = this._getFromStorage('games');

    const items = games
      .filter((g) => g.isActive !== false)
      .map((g) => {
        let supportedPlayTypes = ['other'];
        if (g.gameType === 'daily_numbers' || g.gameType === 'pick_4') {
          supportedPlayTypes = ['straight', 'box', 'straight_box', 'combo'];
        } else if (g.gameType === 'lotto' || g.gameType === 'keno') {
          supportedPlayTypes = ['other'];
        }
        return { game: g, supportedPlayTypes: supportedPlayTypes };
      });

    const defaultGameId = items.length ? items[0].game.id : null;

    return { games: items, defaultGameId: defaultGameId };
  }

  // ----------------------
  // Interface: checkTicket
  // ----------------------

  checkTicket(gameId, drawDate, numbers, playType) {
    const games = this._getFromStorage('games');
    const prizeTiers = this._getFromStorage('prize_tiers');
    const draws = this._getFromStorage('draws');

    const game = games.find((g) => g.id === gameId) || null;
    if (!game) {
      return { ticketCheck: null, draw: null, game: null, matchedPrizeTier: null };
    }

    const draw = this._findDrawByGameAndDate(gameId, drawDate);
    if (!draw) {
      return { ticketCheck: null, draw: null, game: game, matchedPrizeTier: null };
    }

    const enteredNumbers = Array.isArray(numbers) ? numbers.map((n) => Number(n)) : [];
    const winningNumbers = Array.isArray(draw.mainNumbers) ? draw.mainNumbers.map((n) => Number(n)) : [];

    let isWinner = false;
    let matchedPrizeTier = null;

    if (playType === 'straight') {
      if (this._arraysEqual(enteredNumbers, winningNumbers)) {
        isWinner = true;
      }
    } else {
      // Fallback: for non-straight types, keep simple exact match as well
      if (this._arraysEqual(enteredNumbers, winningNumbers)) {
        isWinner = true;
      }
    }

    if (isWinner) {
      // Try to find a prize tier that corresponds to this playType
      const tiersForDraw = prizeTiers.filter((p) => p.drawId === draw.id && p.gameId === game.id);
      const lowerPlayType = String(playType || '').toLowerCase();
      matchedPrizeTier =
        tiersForDraw.find((t) =>
          (t.tierName && String(t.tierName).toLowerCase().indexOf(lowerPlayType) !== -1) ||
          (t.matchDescription && String(t.matchDescription).toLowerCase().indexOf(lowerPlayType) !== -1)
        ) ||
        tiersForDraw.find((t) => t.tierLevel === 1) ||
        null;
    }

    let prizeAmount = null;
    let prizeCurrency = null;
    let resultMessage = 'No win';

    if (isWinner && matchedPrizeTier) {
      prizeAmount = matchedPrizeTier.prizeAmount || null;
      prizeCurrency = matchedPrizeTier.prizeCurrency || game.currentJackpotCurrency || 'mop';
      resultMessage = matchedPrizeTier.tierName ? matchedPrizeTier.tierName : 'Winning ticket';
    } else if (isWinner) {
      resultMessage = 'Winning ticket';
    }

    const nowIso = new Date().toISOString();

    const ticketCheck = {
      id: this._generateId('ticket_check'),
      gameId: game.id,
      drawId: draw.id,
      drawDateTime: draw.drawDateTime || null,
      numbers: enteredNumbers,
      playType: playType || 'other',
      checkedAt: nowIso,
      isWinner: !!isWinner,
      matchedPrizeTierId: matchedPrizeTier ? matchedPrizeTier.id : null,
      prizeAmount: prizeAmount,
      prizeCurrency: prizeCurrency,
      resultMessage: resultMessage
    };

    const existingChecks = this._getFromStorage('ticket_checks');
    existingChecks.push(ticketCheck);
    this._saveToStorage('ticket_checks', existingChecks);

    return {
      ticketCheck: ticketCheck,
      draw: draw,
      game: game,
      matchedPrizeTier: matchedPrizeTier || null
    };
  }

  // ----------------------
  // Interface: getPrizeBreakdown
  // ----------------------

  getPrizeBreakdown(drawId) {
    const draws = this._getFromStorage('draws');
    const prizeTiers = this._getFromStorage('prize_tiers');

    const draw = draws.find((d) => d.id === drawId) || null;
    const game = draw ? this._getGameById(draw.gameId) : null;
    const tiers = prizeTiers.filter((p) => p.drawId === drawId);

    // Instrumentation for task completion tracking
    try {
      if (draw) {
        localStorage.setItem(
          'task2_prizeBreakdownView',
          JSON.stringify({
            drawId: draw.id,
            gameId: draw.gameId,
            viewedAt: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      draw: draw,
      game: game,
      prizeTiers: tiers
    };
  }

  // ----------------------
  // Interface: getGameDetails
  // ----------------------

  getGameDetails(gameId) {
    const games = this._getFromStorage('games');
    const draws = this._getFromStorage('draws');
    const favorites = this._getFromStorage('favorite_games');

    const game = games.find((g) => g.id === gameId) || null;
    const isFavorite = !!favorites.find((f) => f.gameId === gameId);

    const recentDraws = this._sortByDate(
      draws.filter((d) => d.gameId === gameId),
      'drawDateTime',
      'desc'
    ).slice(0, 10);

    const description = (game && game.description) || '';
    const rulesHtml = '<p>' + String(description) + '</p>';

    return {
      game: game,
      rulesHtml: rulesHtml,
      isFavorite: isFavorite,
      recentDraws: recentDraws
    };
  }

  // ----------------------
  // Favorite Games
  // ----------------------

  addGameToFavorites(gameId, source) {
    const games = this._getFromStorage('games');
    const game = games.find((g) => g.id === gameId);
    if (!game) {
      return { success: false, favoriteGame: null, message: 'Game not found' };
    }

    let favorites = this._getFromStorage('favorite_games');
    const existing = favorites.find((f) => f.gameId === gameId);
    if (existing) {
      return { success: true, favoriteGame: existing, message: 'Already in favorites' };
    }

    const nowIso = new Date().toISOString();
    const favorite = {
      id: this._generateId('favorite_game'),
      gameId: gameId,
      addedAt: nowIso,
      source: source || 'other'
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_games', favorites);

    return { success: true, favoriteGame: favorite, message: 'Game added to favorites' };
  }

  removeFavoriteGame(gameId) {
    let favorites = this._getFromStorage('favorite_games');
    const initialLen = favorites.length;
    favorites = favorites.filter((f) => f.gameId !== gameId);
    this._saveToStorage('favorite_games', favorites);
    const success = favorites.length !== initialLen;
    return { success: success, message: success ? 'Removed' : 'Not found' };
  }

  getFavoriteGames(sortOrder) {
    const favorites = this._getFromStorage('favorite_games');
    const games = this._getFromStorage('games');

    let records = favorites.map((f) => {
      const game = games.find((g) => g.id === f.gameId) || null;
      return { favorite: f, game: game };
    });

    const order = sortOrder || 'name_a_to_z';

    records = records.slice().sort((a, b) => {
      if (!a.game || !b.game) return 0;
      if (order === 'name_a_to_z') {
        const na = String(a.game.name || '').toLowerCase();
        const nb = String(b.game.name || '').toLowerCase();
        if (na === nb) return 0;
        return na < nb ? -1 : 1;
      }
      if (order === 'jackpot_high_to_low') {
        const ja = typeof a.game.currentJackpotAmount === 'number' ? a.game.currentJackpotAmount : 0;
        const jb = typeof b.game.currentJackpotAmount === 'number' ? b.game.currentJackpotAmount : 0;
        if (ja === jb) return 0;
        return ja < jb ? 1 : -1;
      }
      if (order === 'next_draw_soonest') {
        const da = this._parseDateTime(a.game.nextDrawDateTime);
        const db = this._parseDateTime(b.game.nextDrawDateTime);
        const ta = da ? da.getTime() : Number.MAX_SAFE_INTEGER;
        const tb = db ? db.getTime() : Number.MAX_SAFE_INTEGER;
        if (ta === tb) return 0;
        return ta < tb ? -1 : 1;
      }
      return 0;
    });

    return records;
  }

  // ----------------------
  // Interface: compareGames
  // ----------------------

  compareGames(firstGameId, secondGameId, minCurrentJackpot, sortBy) {
    const games = this._getFromStorage('games');
    const first = games.find((g) => g.id === firstGameId) || null;
    const second = games.find((g) => g.id === secondGameId) || null;

    const minJackpot = typeof minCurrentJackpot === 'number' ? minCurrentJackpot : null;
    const sort = sortBy || 'odds_of_winning_any_prize_best_first';

    const list = [first, second]
      .filter((g) => !!g)
      .map((g) => {
        const amount = typeof g.currentJackpotAmount === 'number' ? g.currentJackpotAmount : 0;
        const meets = minJackpot === null ? true : amount >= minJackpot;
        return {
          game: g,
          meetsMinJackpot: meets,
          oddsOfWinningAnyPrize: typeof g.oddsOfWinningAnyPrize === 'number' ? g.oddsOfWinningAnyPrize : null,
          currentJackpotAmount: amount
        };
      });

    let sorted = list.slice();
    if (sort === 'odds_of_winning_any_prize_best_first') {
      sorted.sort((a, b) => {
        const oa = typeof a.oddsOfWinningAnyPrize === 'number' ? a.oddsOfWinningAnyPrize : Number.MAX_SAFE_INTEGER;
        const ob = typeof b.oddsOfWinningAnyPrize === 'number' ? b.oddsOfWinningAnyPrize : Number.MAX_SAFE_INTEGER;
        if (oa === ob) return 0;
        return oa < ob ? -1 : 1; // smaller denominator = better odds
      });
    } else if (sort === 'jackpot_high_to_low') {
      sorted.sort((a, b) => {
        if (a.currentJackpotAmount === b.currentJackpotAmount) return 0;
        return a.currentJackpotAmount < b.currentJackpotAmount ? 1 : -1;
      });
    }

    return {
      games: sorted,
      appliedMinCurrentJackpot: minJackpot,
      sortBy: sort
    };
  }

  // ----------------------
  // Number Frequency / Statistics
  // ----------------------

  getNumberFrequencyStats(gameId, rangeType, lastDraws, startDate, endDate, sortOrder) {
    const games = this._getFromStorage('games');
    const draws = this._getFromStorage('draws');

    const game = games.find((g) => g.id === gameId) || null;

    let relevantDraws = draws.filter((d) => d.gameId === gameId && Array.isArray(d.mainNumbers));

    let rangeDescription = '';

    if (rangeType === 'last_n_draws') {
      const n = typeof lastDraws === 'number' ? lastDraws : 0;
      relevantDraws = this._sortByDate(relevantDraws, 'drawDateTime', 'desc').slice(0, n);
      rangeDescription = 'Last ' + String(n) + ' draws';
    } else if (rangeType === 'date_range') {
      relevantDraws = relevantDraws.filter((d) => this._isDateInRange(d.drawDateTime, startDate, endDate));
      rangeDescription = 'From ' + String(startDate || '') + ' to ' + String(endDate || '');
    } else if (rangeType === 'all_available') {
      rangeDescription = 'All available draws';
    }

    const frequencyMap = {};
    const lastDateMap = {};

    relevantDraws.forEach((d) => {
      const dDate = this._normalizeDate(d.drawDateTime);
      (d.mainNumbers || []).forEach((num) => {
        const n = Number(num);
        if (!Number.isNaN(n)) {
          if (!frequencyMap[n]) frequencyMap[n] = 0;
          frequencyMap[n] += 1;
          if (!lastDateMap[n]) {
            lastDateMap[n] = dDate;
          } else {
            const existing = this._parseDateTime(lastDateMap[n] + 'T00:00:00Z');
            const current = this._parseDateTime(dDate + 'T00:00:00Z');
            if (existing && current && current > existing) {
              lastDateMap[n] = dDate;
            }
          }
        }
      });
    });

    let frequencies = Object.keys(frequencyMap).map((k) => ({
      number: Number(k),
      frequency: frequencyMap[k],
      lastDrawDate: lastDateMap[k] || null
    }));

    const order = sortOrder || 'frequency_desc';
    frequencies.sort((a, b) => {
      if (order === 'frequency_desc' || order === 'frequency_asc') {
        const dir = order === 'frequency_desc' ? -1 : 1;
        if (a.frequency === b.frequency) {
          if (a.number === b.number) return 0;
          return a.number < b.number ? -1 : 1;
        }
        return a.frequency < b.frequency ? -1 * dir : 1 * dir;
      }
      if (order === 'number_asc') {
        if (a.number === b.number) return 0;
        return a.number < b.number ? -1 : 1;
      }
      if (order === 'number_desc') {
        if (a.number === b.number) return 0;
        return a.number < b.number ? 1 : -1;
      }
      return 0;
    });

    return {
      game: game,
      rangeDescription: rangeDescription,
      frequencies: frequencies
    };
  }

  // ----------------------
  // Hot Number Sets
  // ----------------------

  createHotNumberSet(gameId, name, numbers, setType, originSource, originDescription) {
    const games = this._getFromStorage('games');
    const game = games.find((g) => g.id === gameId);
    if (!game) {
      return { success: false, hotNumberSet: null, message: 'Game not found' };
    }

    const nowIso = new Date().toISOString();
    const hotNumberSet = {
      id: this._generateId('hot_number_set'),
      name: name,
      gameId: gameId,
      numbers: Array.isArray(numbers) ? numbers.slice() : [],
      setType: setType,
      originSource: originSource || 'other',
      originDescription: originDescription || '',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const sets = this._getFromStorage('hot_number_sets');
    sets.push(hotNumberSet);
    this._saveToStorage('hot_number_sets', sets);

    return { success: true, hotNumberSet: hotNumberSet, message: 'Hot number set created' };
  }

  getHotNumberSets(gameId, setType) {
    const sets = this._getFromStorage('hot_number_sets');
    const games = this._getFromStorage('games');

    return sets
      .filter((s) => {
        if (gameId && s.gameId !== gameId) return false;
        if (setType && s.setType !== setType) return false;
        return true;
      })
      .map((s) => ({
        ...s,
        game: games.find((g) => g.id === s.gameId) || null
      }));
  }

  getHotNumberSetDetails(hotNumberSetId) {
    const sets = this._getFromStorage('hot_number_sets');
    const set = sets.find((s) => s.id === hotNumberSetId) || null;
    if (!set) return null;
    const game = this._getGameById(set.gameId);
    return { ...set, game: game };
  }

  renameHotNumberSet(hotNumberSetId, newName) {
    const sets = this._getFromStorage('hot_number_sets');
    const set = sets.find((s) => s.id === hotNumberSetId) || null;
    if (!set) {
      return { success: false, hotNumberSet: null, message: 'Hot number set not found' };
    }
    set.name = newName;
    set.updatedAt = new Date().toISOString();
    this._saveToStorage('hot_number_sets', sets);
    return { success: true, hotNumberSet: set, message: 'Renamed' };
  }

  deleteHotNumberSet(hotNumberSetId) {
    let sets = this._getFromStorage('hot_number_sets');
    const initialLen = sets.length;
    sets = sets.filter((s) => s.id !== hotNumberSetId);
    this._saveToStorage('hot_number_sets', sets);
    const success = sets.length !== initialLen;
    return { success: success, message: success ? 'Deleted' : 'Not found' };
  }

  // ----------------------
  // Custom Results Views
  // ----------------------

  createCustomResultsView(name, gameIds, drawTimeFilter, sortOrder, maxDraws, isDefault) {
    const nowIso = new Date().toISOString();
    const views = this._getFromStorage('custom_results_views');

    const view = {
      id: this._generateId('custom_view'),
      name: name,
      gameIds: Array.isArray(gameIds) ? gameIds.slice() : [],
      drawTimeFilter: drawTimeFilter,
      sortOrder: sortOrder,
      maxDraws: maxDraws,
      isDefault: !!isDefault,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    if (isDefault) {
      views.forEach((v) => {
        v.isDefault = false;
      });
    }

    views.push(view);
    this._saveToStorage('custom_results_views', views);

    return { success: true, view: view, message: 'Custom view created' };
  }

  getCustomResultsViews() {
    const views = this._getFromStorage('custom_results_views');
    const games = this._getFromStorage('games');

    return views.map((v) => ({
      ...v,
      // Resolve referenced games for convenience
      games: v.gameIds.map((id) => games.find((g) => g.id === id) || null)
    }));
  }

  getCustomResultsViewResults(viewId) {
    const views = this._getFromStorage('custom_results_views');
    const view = views.find((v) => v.id === viewId) || null;
    const draws = this._getFromStorage('draws');
    const games = this._getFromStorage('games');

    if (!view) {
      return { view: null, draws: [] };
    }

    let filtered = draws.filter((d) => {
      if (view.gameIds && view.gameIds.length && view.gameIds.indexOf(d.gameId) === -1) return false;
      if (view.drawTimeFilter && view.drawTimeFilter !== 'all') {
        if (d.session !== view.drawTimeFilter) return false;
      }
      return d.drawStatus === 'completed';
    });

    if (view.sortOrder === 'date_newest_first') {
      filtered = this._sortByDate(filtered, 'drawDateTime', 'desc');
    } else if (view.sortOrder === 'date_oldest_first') {
      filtered = this._sortByDate(filtered, 'drawDateTime', 'asc');
    } else if (view.sortOrder === 'jackpot_high_to_low') {
      filtered = this._sortByNumber(filtered, 'jackpotAmount', 'desc');
    } else if (view.sortOrder === 'jackpot_low_to_high') {
      filtered = this._sortByNumber(filtered, 'jackpotAmount', 'asc');
    }

    if (typeof view.maxDraws === 'number') {
      filtered = filtered.slice(0, view.maxDraws);
    }

    const resultDraws = filtered.map((d) => ({
      draw: d,
      game: games.find((g) => g.id === d.gameId) || null
    }));

    return { view: view, draws: resultDraws };
  }

  // ----------------------
  // Draw Calendar & Reminders
  // ----------------------

  getDrawCalendar(year, month, gameId, drawTimeFilter) {
    const draws = this._getFromStorage('draws');
    const games = this._getFromStorage('games');
    const reminders = this._getFromStorage('reminders');

    const targetGame = gameId ? games.find((g) => g.id === gameId) || null : null;
    const sessionFilter = drawTimeFilter || 'all';

    const monthIndex = month - 1; // JS months 0-11
    const firstDay = new Date(year, monthIndex, 1);
    const days = [];

    const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    let d = new Date(firstDay.getTime());
    while (d.getMonth() === monthIndex) {
      const isoDate = this._normalizeDate(d.toISOString());
      const weekday = weekdayNames[d.getDay()];

      const drawsForDay = draws
        .filter((dr) => {
          const drDate = this._normalizeDate(dr.drawDateTime);
          if (drDate !== isoDate) return false;
          if (gameId && dr.gameId !== gameId) return false;
          if (sessionFilter && sessionFilter !== 'all' && dr.session !== sessionFilter) return false;
          return true;
        })
        .map((dr) => {
          const game = games.find((g) => g.id === dr.gameId) || null;
          const hasReminder = !!reminders.find(
            (r) => r.drawId === dr.id && r.reminderStatus === 'active'
          );
          return { draw: dr, game: game, hasReminder: hasReminder };
        });

      days.push({
        date: isoDate,
        weekday: weekday,
        draws: drawsForDay
      });

      d.setDate(d.getDate() + 1);
    }

    return {
      year: year,
      month: month,
      game: targetGame,
      days: days
    };
  }

  createReminderForDraw(drawId, notifyAt, deliveryMethod, note) {
    const draws = this._getFromStorage('draws');
    const draw = draws.find((d) => d.id === drawId);
    if (!draw) {
      return { success: false, reminder: null, message: 'Draw not found' };
    }

    const notifyAtIso = notifyAt || draw.drawDateTime || new Date().toISOString();
    const reminder = this._upsertReminderForDraw(drawId, notifyAtIso, deliveryMethod || 'onsite', note);

    return { success: true, reminder: reminder, message: 'Reminder set' };
  }

  getReminders(statusFilter) {
    const reminders = this._getFromStorage('reminders');
    const draws = this._getFromStorage('draws');
    const games = this._getFromStorage('games');

    const filter = statusFilter || 'active_only';
    const now = new Date();

    let filtered = reminders.filter((r) => {
      if (filter === 'all') return true;
      if (filter === 'active_only') return r.reminderStatus === 'active';
      if (filter === 'upcoming_only') {
        if (r.reminderStatus !== 'active') return false;
        if (!r.notifyAt) return false;
        const t = this._parseDateTime(r.notifyAt);
        return t && t >= now;
      }
      if (filter === 'past_only') {
        if (!r.notifyAt) return false;
        const t = this._parseDateTime(r.notifyAt);
        return t && t < now;
      }
      return true;
    });

    filtered = filtered.slice().sort((a, b) => {
      const ta = this._parseDateTime(a.notifyAt) || this._parseDateTime(
        (draws.find((d) => d.id === a.drawId) || {}).drawDateTime
      );
      const tb = this._parseDateTime(b.notifyAt) || this._parseDateTime(
        (draws.find((d) => d.id === b.drawId) || {}).drawDateTime
      );
      const va = ta ? ta.getTime() : 0;
      const vb = tb ? tb.getTime() : 0;
      if (va === vb) return 0;
      return va < vb ? -1 : 1;
    });

    return filtered.map((r) => {
      const draw = draws.find((d) => d.id === r.drawId) || null;
      const game = draw ? games.find((g) => g.id === draw.gameId) || null : null;
      return { reminder: r, draw: draw, game: game };
    });
  }

  updateReminderStatus(reminderId, reminderStatus) {
    const reminders = this._getFromStorage('reminders');
    const reminder = reminders.find((r) => r.id === reminderId) || null;
    if (!reminder) {
      return { success: false, reminder: null, message: 'Reminder not found' };
    }
    reminder.reminderStatus = reminderStatus;
    reminder.updatedAt = new Date().toISOString();
    this._saveToStorage('reminders', reminders);
    return { success: true, reminder: reminder, message: 'Reminder updated' };
  }

  // ----------------------
  // Multi-game Results
  // ----------------------

  getMultiGameResults(date, gameIds, sortOrder) {
    const draws = this._getFromStorage('draws');
    const games = this._getFromStorage('games');
    const targetDate = this._normalizeDate(date);

    let filtered = draws.filter((d) => {
      const dDate = this._normalizeDate(d.drawDateTime);
      if (dDate !== targetDate) return false;
      if (Array.isArray(gameIds) && gameIds.length && gameIds.indexOf(d.gameId) === -1) return false;
      return d.drawStatus === 'completed';
    });

    const order = sortOrder || 'time_earliest_first';

    if (order === 'time_earliest_first' || order === 'time_latest_first') {
      const dir = order === 'time_earliest_first' ? 1 : -1;
      filtered = filtered.slice().sort((a, b) => {
        const da = this._parseDateTime(a.drawDateTime);
        const db = this._parseDateTime(b.drawDateTime);
        const ta = da ? da.getTime() : 0;
        const tb = db ? db.getTime() : 0;
        if (ta === tb) return 0;
        return ta < tb ? -1 * dir : 1 * dir;
      });
    } else if (order === 'game_name_a_to_z') {
      filtered = filtered.slice().sort((a, b) => {
        const ga = games.find((g) => g.id === a.gameId) || {};
        const gb = games.find((g) => g.id === b.gameId) || {};
        const na = String(ga.name || '').toLowerCase();
        const nb = String(gb.name || '').toLowerCase();
        if (na === nb) return 0;
        return na < nb ? -1 : 1;
      });
    }

    const resultDraws = filtered.map((d) => ({
      draw: d,
      game: games.find((g) => g.id === d.gameId) || null
    }));

    return {
      date: targetDate,
      draws: resultDraws
    };
  }

  // ----------------------
  // Notes / Tags on Draws
  // ----------------------

  addNoteToDraw(drawId, text, type) {
    const draws = this._getFromStorage('draws');
    const draw = draws.find((d) => d.id === drawId);
    if (!draw) {
      return { success: false, drawNote: null, message: 'Draw not found' };
    }

    const nowIso = new Date().toISOString();
    const drawNote = {
      id: this._generateId('draw_note'),
      drawId: drawId,
      text: text,
      type: type || 'tag',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const notes = this._getFromStorage('draw_notes');
    notes.push(drawNote);
    this._saveToStorage('draw_notes', notes);

    return { success: true, drawNote: drawNote, message: 'Note added' };
  }

  updateDrawNote(drawNoteId, text) {
    const notes = this._getFromStorage('draw_notes');
    const note = notes.find((n) => n.id === drawNoteId) || null;
    if (!note) {
      return { success: false, drawNote: null, message: 'Note not found' };
    }
    note.text = text;
    note.updatedAt = new Date().toISOString();
    this._saveToStorage('draw_notes', notes);
    return { success: true, drawNote: note, message: 'Note updated' };
  }

  deleteDrawNote(drawNoteId) {
    let notes = this._getFromStorage('draw_notes');
    const initialLen = notes.length;
    notes = notes.filter((n) => n.id !== drawNoteId);
    this._saveToStorage('draw_notes', notes);
    const success = notes.length !== initialLen;
    return { success: success, message: success ? 'Deleted' : 'Not found' };
  }

  getMyNotesAndTags(searchText, typeFilter) {
    const notes = this._getFromStorage('draw_notes');
    const draws = this._getFromStorage('draws');
    const games = this._getFromStorage('games');

    const query = searchText ? String(searchText).toLowerCase() : '';
    const typeF = typeFilter || 'all';

    const filtered = notes.filter((n) => {
      if (typeF !== 'all' && n.type !== typeF) return false;
      if (query && String(n.text || '').toLowerCase().indexOf(query) === -1) return false;
      return true;
    });

    return filtered.map((n) => {
      const draw = draws.find((d) => d.id === n.drawId) || null;
      const game = draw ? games.find((g) => g.id === draw.gameId) || null : null;
      return { drawNote: n, draw: draw, game: game };
    });
  }

  // ----------------------
  // Number Checker Searches
  // ----------------------

  runNumberCheckerSearch(gameId, startDate, endDate, mainNumbers, bonusNumbers, matchType) {
    const games = this._getFromStorage('games');
    const draws = this._getFromStorage('draws');

    const game = games.find((g) => g.id === gameId) || null;
    const targetMainSig = this._sortedNumbersSignature(mainNumbers || []);
    const targetMainArr = Array.isArray(mainNumbers) ? mainNumbers.map((n) => Number(n)) : [];

    let matchedDraws = draws.filter((d) => {
      if (d.gameId !== gameId) return false;
      if (!this._isDateInRange(d.drawDateTime, startDate, endDate)) return false;
      if (!Array.isArray(d.mainNumbers)) return false;

      const drawMain = d.mainNumbers.map((n) => Number(n));
      const drawSig = this._sortedNumbersSignature(drawMain);

      if (matchType === 'exact_main_numbers') {
        return drawSig === targetMainSig;
      }
      if (matchType === 'contains_all_main_numbers') {
        return targetMainArr.every((n) => drawMain.indexOf(n) !== -1);
      }
      if (matchType === 'contains_any_main_numbers') {
        return targetMainArr.some((n) => drawMain.indexOf(n) !== -1);
      }
      if (matchType === 'includes_bonus') {
        // Treat as contains_any_main_numbers on main numbers; bonus ignored here
        return targetMainArr.some((n) => drawMain.indexOf(n) !== -1);
      }
      return false;
    });

    // Sort matches by date newest first
    matchedDraws = this._sortByDate(matchedDraws, 'drawDateTime', 'desc');

    return {
      game: game,
      startDate: startDate,
      endDate: endDate,
      mainNumbers: Array.isArray(mainNumbers) ? mainNumbers.slice() : [],
      bonusNumbers: Array.isArray(bonusNumbers) ? bonusNumbers.slice() : [],
      matchType: matchType,
      matchedDraws: matchedDraws
    };
  }

  saveNumberCheckerSearch(name, gameId, startDate, endDate, mainNumbers, bonusNumbers, matchType, notes) {
    const games = this._getFromStorage('games');
    const game = games.find((g) => g.id === gameId);
    if (!game) {
      return { success: false, search: null, message: 'Game not found' };
    }

    // Optionally run search once to store lastResultCount
    const runResult = this.runNumberCheckerSearch(
      gameId,
      startDate,
      endDate,
      mainNumbers,
      bonusNumbers,
      matchType
    );

    const nowIso = new Date().toISOString();
    const searches = this._getFromStorage('number_checker_searches');

    const search = {
      id: this._generateId('number_search'),
      name: name,
      gameId: gameId,
      startDate: startDate,
      endDate: endDate,
      mainNumbers: Array.isArray(mainNumbers) ? mainNumbers.slice() : [],
      bonusNumbers: Array.isArray(bonusNumbers) ? bonusNumbers.slice() : [],
      matchType: matchType,
      createdAt: nowIso,
      lastRunAt: nowIso,
      lastResultCount: Array.isArray(runResult.matchedDraws) ? runResult.matchedDraws.length : 0,
      notes: notes || ''
    };

    searches.push(search);
    this._saveToStorage('number_checker_searches', searches);

    return { success: true, search: search, message: 'Search saved' };
  }

  getSavedNumberCheckerSearches() {
    const searches = this._getFromStorage('number_checker_searches');
    const games = this._getFromStorage('games');

    return searches.map((s) => ({
      ...s,
      game: games.find((g) => g.id === s.gameId) || null
    }));
  }

  getNumberCheckerSearchDetails(searchId) {
    const searches = this._getFromStorage('number_checker_searches');
    const search = searches.find((s) => s.id === searchId) || null;
    if (!search) return null;
    const game = this._getGameById(search.gameId);
    return { ...search, game: game };
  }

  renameNumberCheckerSearch(searchId, newName) {
    const searches = this._getFromStorage('number_checker_searches');
    const search = searches.find((s) => s.id === searchId) || null;
    if (!search) {
      return { success: false, search: null, message: 'Search not found' };
    }
    search.name = newName;
    // no updatedAt field in schema, but we can update lastRunAt as metadata
    search.lastRunAt = new Date().toISOString();
    this._saveToStorage('number_checker_searches', searches);
    return { success: true, search: search, message: 'Renamed' };
  }

  deleteNumberCheckerSearch(searchId) {
    let searches = this._getFromStorage('number_checker_searches');
    const initialLen = searches.length;
    searches = searches.filter((s) => s.id !== searchId);
    this._saveToStorage('number_checker_searches', searches);
    const success = searches.length !== initialLen;
    return { success: success, message: success ? 'Deleted' : 'Not found' };
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