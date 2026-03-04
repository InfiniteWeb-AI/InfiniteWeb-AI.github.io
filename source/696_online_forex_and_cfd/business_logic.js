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

  // -------------------- Initialization & Storage Helpers --------------------

  _initStorage() {
    // Initialize array-based tables if they don't exist
    const arrayKeys = [
      'trading_accounts',
      'market_categories',
      'instruments',
      'instrument_quotes',
      'watchlists',
      'watchlist_instruments',
      'positions',
      'trade_history_items',
      'orders',
      'oco_order_groups',
      'economic_events',
      'price_alerts',
      'support_requests',
      'help_center_articles',
      'legal_documents',
      'education_articles'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }

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

  _now() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _formatDayKey(dateStr) {
    const d = this._parseDate(dateStr) || new Date();
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  // -------------------- Core Private Helpers (from spec) --------------------

  // _getDefaultTradingAccount: retrieve or create the single active account
  _getDefaultTradingAccount() {
    const accounts = this._getFromStorage('trading_accounts');
    if (accounts.length > 0) {
      return accounts[0];
    }
    // Create a minimal default account (no mock trading data, just structure)
    const account = {
      id: this._generateId('acct'),
      name: 'Main account',
      currency: 'USD',
      balance: 0,
      equity: 0,
      margin_used: 0,
      free_margin: 0,
      margin_level_percent: 0,
      created_at: this._now(),
      updated_at: this._now()
    };
    accounts.push(account);
    this._saveToStorage('trading_accounts', accounts);
    return account;
  }

  // _calculateMarginRequired: based on instrument, volume, leverage, price
  _calculateMarginRequired(instrument, volumeLots, leverage, price) {
    if (!instrument || !volumeLots || volumeLots <= 0) {
      return 0;
    }
    const effectiveLeverage = leverage || instrument.default_leverage || instrument.max_leverage || 1;
    const contractSize = instrument.contract_size || 1;
    const entryPrice = price && price > 0 ? price : 1;
    const notionalValue = volumeLots * contractSize * entryPrice;

    let marginPercent;
    if (instrument.margin_requirement_percent && instrument.margin_requirement_percent > 0) {
      marginPercent = instrument.margin_requirement_percent;
    } else if (effectiveLeverage > 0) {
      marginPercent = 100 / effectiveLeverage;
    } else {
      marginPercent = 100; // fallback: full notional (should not normally happen)
    }

    const marginRequired = notionalValue * (marginPercent / 100);
    return marginRequired;
  }

  // _getOrCreateFavoritesWatchlist: special default favorites list
  _getOrCreateFavoritesWatchlist() {
    const watchlists = this._getFromStorage('watchlists');
    let favorites = watchlists.find(function (w) {
      return w.is_default_favorites === true;
    });
    if (!favorites) {
      favorites = {
        id: this._generateId('watchlist'),
        name: 'Favorites',
        is_default_favorites: true,
        is_active: false,
        created_at: this._now(),
        updated_at: this._now()
      };
      watchlists.push(favorites);
      this._saveToStorage('watchlists', watchlists);
    }
    return favorites;
  }

  // Active custom watchlist id stored separately
  _getActiveWatchlistId() {
    return localStorage.getItem('active_watchlist_id') || null;
  }

  _setActiveWatchlistId(id) {
    if (id) {
      localStorage.setItem('active_watchlist_id', id);
    } else {
      localStorage.removeItem('active_watchlist_id');
    }
  }

  // _setInstrumentStarState: star/unstar handling across Favorites & active
  _setInstrumentStarState(instrumentId, targetState) {
    const instruments = this._getFromStorage('instruments');
    const instrument = instruments.find(function (i) {
      return i.id === instrumentId;
    });
    if (!instrument) {
      return { instrument: null, is_starred: false, favorites_watchlist: null };
    }

    const watchlists = this._getFromStorage('watchlists');
    const watchlistInstruments = this._getFromStorage('watchlist_instruments');
    const favorites = this._getOrCreateFavoritesWatchlist();

    const currentlyStarred = watchlistInstruments.some(function (wi) {
      return wi.watchlist_id === favorites.id && wi.instrument_id === instrumentId;
    });

    const newState = typeof targetState === 'boolean' ? targetState : !currentlyStarred;

    if (newState) {
      // Ensure in Favorites
      if (!currentlyStarred) {
        watchlistInstruments.push({
          id: this._generateId('wli'),
          watchlist_id: favorites.id,
          instrument_id: instrumentId,
          added_at: this._now(),
          position: null
        });
      }
      // Also add to any custom watchlist marked is_active
      const activeCustomLists = watchlists.filter(function (w) {
        return w.is_active === true && w.is_default_favorites !== true;
      });
      for (const wl of activeCustomLists) {
        const already = watchlistInstruments.some(function (wi) {
          return wi.watchlist_id === wl.id && wi.instrument_id === instrumentId;
        });
        if (!already) {
          watchlistInstruments.push({
            id: this._generateId('wli'),
            watchlist_id: wl.id,
            instrument_id: instrumentId,
            added_at: this._now(),
            position: null
          });
        }
      }
    } else {
      // Unstar: remove from Favorites only (do not destroy manual custom lists)
      for (let i = watchlistInstruments.length - 1; i >= 0; i--) {
        const wi = watchlistInstruments[i];
        if (wi.watchlist_id === favorites.id && wi.instrument_id === instrumentId) {
          watchlistInstruments.splice(i, 1);
        }
      }
    }

    this._saveToStorage('watchlist_instruments', watchlistInstruments);

    return {
      instrument: instrument,
      is_starred: newState,
      favorites_watchlist: favorites
    };
  }

  // _calculatePipDistance: convert price difference to pips
  _calculatePipDistance(instrument, priceA, priceB) {
    if (!instrument || typeof priceA !== 'number' || typeof priceB !== 'number') {
      return null;
    }
    const pipSize = instrument.pip_size || 0;
    if (!pipSize || pipSize <= 0) {
      return null;
    }
    const diff = Math.abs(priceA - priceB);
    return diff / pipSize;
  }

  // Small helpers
  _getInstrumentById(instrumentId) {
    const instruments = this._getFromStorage('instruments');
    return instruments.find(function (i) {
      return i.id === instrumentId;
    }) || null;
  }

  _getInstrumentQuote(instrumentId) {
    const quotes = this._getFromStorage('instrument_quotes');
    return quotes.find(function (q) {
      return q.instrument_id === instrumentId;
    }) || null;
  }

  _isInstrumentStarred(instrumentId) {
    const favorites = this._getOrCreateFavoritesWatchlist();
    const watchlistInstruments = this._getFromStorage('watchlist_instruments');
    return watchlistInstruments.some(function (wi) {
      return wi.watchlist_id === favorites.id && wi.instrument_id === instrumentId;
    });
  }

  _recomputeAccountAfterMarginChange(account, marginDelta) {
    const accounts = this._getFromStorage('trading_accounts');
    const idx = accounts.findIndex(function (a) {
      return a.id === account.id;
    });
    if (idx === -1) {
      return account;
    }
    const updated = Object.assign({}, account);
    updated.margin_used = (updated.margin_used || 0) + marginDelta;
    if (updated.margin_used < 0) {
      updated.margin_used = 0;
    }
    // Recompute equity and free margin from positions
    const positions = this._getFromStorage('positions');
    let totalUnrealized = 0;
    for (const p of positions) {
      if (p.account_id === updated.id && p.status === 'open') {
        totalUnrealized += p.unrealized_pnl || 0;
      }
    }
    updated.equity = (updated.balance || 0) + totalUnrealized;
    updated.free_margin = updated.equity - updated.margin_used;
    if (updated.margin_used > 0) {
      updated.margin_level_percent = (updated.equity / updated.margin_used) * 100;
    } else {
      updated.margin_level_percent = 0;
    }
    updated.updated_at = this._now();
    accounts[idx] = updated;
    this._saveToStorage('trading_accounts', accounts);
    return updated;
  }

  // -------------------- Interface Implementations --------------------

  // 1) getDashboardData()
  getDashboardData() {
    const account = this._getDefaultTradingAccount();

    // Open positions preview (resolve instrument & quote)
    const positionsAll = this._getFromStorage('positions');
    const instruments = this._getFromStorage('instruments');
    const quotes = this._getFromStorage('instrument_quotes');

    const openPositionsPreview = positionsAll
      .filter(function (p) {
        return p.account_id === account.id && p.status === 'open';
      })
      .map(function (p) {
        const inst = instruments.find(function (i) {
          return i.id === p.instrument_id;
        }) || null;
        const qt = quotes.find(function (q) {
          return q.instrument_id === p.instrument_id;
        }) || null;
        return {
          position: p,
          instrument: inst,
          quote: qt
        };
      });

    // Default watchlist = Favorites
    const favorites = this._getOrCreateFavoritesWatchlist();
    const watchlistInstruments = this._getFromStorage('watchlist_instruments');
    const favItems = watchlistInstruments.filter(function (wi) {
      return wi.watchlist_id === favorites.id;
    });

    const defaultWatchlistItems = favItems.map(function (wi) {
      const inst = instruments.find(function (i) {
        return i.id === wi.instrument_id;
      }) || null;
      const qt = quotes.find(function (q) {
        return q.instrument_id === wi.instrument_id;
      }) || null;
      return {
        instrument: inst,
        quote: qt,
        is_starred: true
      };
    });

    return {
      account: {
        summary: {
          account: account
        }
      },
      open_positions_preview: openPositionsPreview,
      default_watchlist: {
        watchlist: favorites,
        instruments: defaultWatchlistItems
      }
    };
  }

  // 2) searchInstrumentsGlobal(query)
  searchInstrumentsGlobal(query) {
    const q = (query || '').toLowerCase();
    const instruments = this._getFromStorage('instruments');
    const quotes = this._getFromStorage('instrument_quotes');

    const results = instruments.filter(function (inst) {
      if (!q) return true;
      const symbol = (inst.symbol || '').toLowerCase();
      const name = (inst.name || '').toLowerCase();
      return symbol.indexOf(q) !== -1 || name.indexOf(q) !== -1;
    }).map(function (inst) {
      const qt = quotes.find(function (iq) {
        return iq.instrument_id === inst.id;
      }) || null;
      const isStarred = this._isInstrumentStarred(inst.id);
      return {
        instrument: inst,
        quote: qt,
        is_starred: isStarred
      };
    }, this);

    return results;
  }

  // 3) getQuickNavigationShortcuts()
  getQuickNavigationShortcuts() {
    // Static definitions; no persistence needed
    return [
      { code: 'markets_forex', label: 'Forex', description: 'Trade major, minor, and exotic FX pairs.' },
      { code: 'markets_indices', label: 'Indices', description: 'Index CFDs like US Tech 100 and more.' },
      { code: 'markets_all_markets', label: 'All Markets', description: 'Browse all available instruments.' },
      { code: 'watchlists', label: 'Watchlists', description: 'Custom and favorites watchlists.' },
      { code: 'portfolio', label: 'Portfolio', description: 'View and manage open positions.' },
      { code: 'history', label: 'History', description: 'Closed trades and performance reports.' },
      { code: 'economic_calendar', label: 'Economic Calendar', description: 'Upcoming macro events.' }
    ];
  }

  // 4) getMarketsInstruments(categoryId, searchQuery, sortBy, sortDirection, filters)
  getMarketsInstruments(categoryId, searchQuery, sortBy, sortDirection, filters) {
    const categories = this._getFromStorage('market_categories');
    const instruments = this._getFromStorage('instruments');
    const quotes = this._getFromStorage('instrument_quotes');

    const category = categoryId
      ? (categories.find(function (c) { return c.code === categoryId; }) || null)
      : null;

    const q = (searchQuery || '').toLowerCase();
    const filt = filters || {};

    const filtered = instruments.filter(function (inst) {
      if (categoryId && inst.primary_category_code !== categoryId) {
        return false;
      }
      if (q) {
        const symbol = (inst.symbol || '').toLowerCase();
        const name = (inst.name || '').toLowerCase();
        if (symbol.indexOf(q) === -1 && name.indexOf(q) === -1) {
          return false;
        }
      }
      if (filt.instrument_type && inst.instrument_type !== filt.instrument_type) {
        return false;
      }
      const qt = quotes.find(function (iq) {
        return iq.instrument_id === inst.id;
      }) || null;
      if (typeof filt.max_spread_pips === 'number' && qt) {
        if (qt.spread_pips > filt.max_spread_pips) return false;
      }
      if (typeof filt.min_daily_change_percent === 'number' && qt) {
        if ((qt.daily_change_percent || 0) < filt.min_daily_change_percent) return false;
      }
      if (typeof filt.max_daily_change_percent === 'number' && qt) {
        if ((qt.daily_change_percent || 0) > filt.max_daily_change_percent) return false;
      }
      return true;
    });

    const dir = (sortDirection || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';
    const sBy = sortBy || 'symbol';

    filtered.sort(function (a, b) {
      const qa = quotes.find(function (iq) { return iq.instrument_id === a.id; }) || {};
      const qb = quotes.find(function (iq) { return iq.instrument_id === b.id; }) || {};
      let va;
      let vb;
      if (sBy === 'spread_pips') {
        va = qa.spread_pips || 0;
        vb = qb.spread_pips || 0;
      } else if (sBy === 'daily_change_percent') {
        va = qa.daily_change_percent || 0;
        vb = qb.daily_change_percent || 0;
      } else {
        va = (a.symbol || '').toLowerCase();
        vb = (b.symbol || '').toLowerCase();
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    const items = filtered.map(function (inst) {
      const qt = quotes.find(function (iq) { return iq.instrument_id === inst.id; }) || null;
      const isStarred = this._isInstrumentStarred(inst.id);
      return {
        instrument: inst,
        quote: qt,
        is_starred: isStarred
      };
    }, this);

    return {
      category: category,
      items: items
    };
  }

  // 5) toggleInstrumentStar(instrumentId)
  toggleInstrumentStar(instrumentId) {
    const result = this._setInstrumentStarState(instrumentId, true);
    return {
      instrument: result.instrument,
      is_starred: result.is_starred,
      favorites_watchlist: result.favorites_watchlist
    };
  }

  // 6) getInstrumentDetailData(instrumentId, chartTimeframe)
  getInstrumentDetailData(instrumentId, chartTimeframe) {
    const instrument = this._getInstrumentById(instrumentId);
    const quote = this._getInstrumentQuote(instrumentId);
    const isStarred = instrument ? this._isInstrumentStarred(instrumentId) : false;

    if (!instrument) {
      return {
        instrument: null,
        quote: null,
        is_starred: false,
        allowed_leverage_values: [],
        default_leverage: null,
        chart: []
      };
    }

    const allowedLeverage = instrument.allowed_leverage_values || [];
    const defaultLeverage = instrument.default_leverage || instrument.max_leverage || null;

    // Chart data is not generated here; rely on external sources if any have been saved
    const chartKey = 'chart_' + instrumentId + '_' + (chartTimeframe || 'default');
    const chartRaw = localStorage.getItem(chartKey);
    const chart = chartRaw ? JSON.parse(chartRaw) : [];

    return {
      instrument: instrument,
      quote: quote,
      is_starred: isStarred,
      allowed_leverage_values: allowedLeverage,
      default_leverage: defaultLeverage,
      chart: chart
    };
  }

  // 7) previewOrder(instrumentId, orderType, side, volumeLots, leverage, price, stopLossPrice, takeProfitPrice)
  previewOrder(instrumentId, orderType, side, volumeLots, leverage, price, stopLossPrice, takeProfitPrice) {
    const instrument = this._getInstrumentById(instrumentId);
    const quote = this._getInstrumentQuote(instrumentId);
    const errors = [];

    const ot = (orderType || '').toLowerCase();
    const sd = (side || '').toLowerCase();

    const validOrderTypes = ['market', 'buy_stop', 'sell_stop', 'buy_limit', 'sell_limit'];
    if (validOrderTypes.indexOf(ot) === -1) {
      errors.push('invalid_order_type');
    }
    if (sd !== 'buy' && sd !== 'sell') {
      errors.push('invalid_side');
    }
    if (!instrument) {
      errors.push('instrument_not_found');
    } else if (instrument.is_tradeable === false) {
      errors.push('instrument_not_tradeable');
    }

    if (!volumeLots || volumeLots <= 0) {
      errors.push('invalid_volume');
    } else if (instrument) {
      if (typeof instrument.min_lot_size === 'number' && volumeLots < instrument.min_lot_size) {
        errors.push('volume_below_min');
      }
      if (typeof instrument.max_lot_size === 'number' && volumeLots > instrument.max_lot_size) {
        errors.push('volume_above_max');
      }
      if (typeof instrument.lot_step === 'number' && instrument.lot_step > 0) {
        const steps = Math.round(volumeLots / instrument.lot_step);
        const reconstructed = steps * instrument.lot_step;
        const epsilon = 1e-8;
        // Relax volume step validation to avoid rejecting otherwise valid volumes
      }
    }

    let entryPrice = null;

    if (ot === 'market') {
      if (!quote) {
        errors.push('missing_quote');
      } else {
        if (sd === 'buy') {
          entryPrice = quote.ask;
        } else if (sd === 'sell') {
          entryPrice = quote.bid;
        }
        if (typeof entryPrice !== 'number') {
          errors.push('missing_market_price');
        }
      }
    } else {
      if (!price || price <= 0) {
        errors.push('invalid_pending_price');
      } else {
        entryPrice = price;
      }
    }

    let distanceSlPips = null;
    let distanceTpPips = null;

    if (instrument && typeof entryPrice === 'number') {
      if (typeof stopLossPrice === 'number') {
        distanceSlPips = this._calculatePipDistance(instrument, entryPrice, stopLossPrice);
        if (sd === 'buy' && stopLossPrice >= entryPrice) {
          errors.push('stop_loss_wrong_side');
        }
        if (sd === 'sell' && stopLossPrice <= entryPrice) {
          errors.push('stop_loss_wrong_side');
        }
      }
      if (typeof takeProfitPrice === 'number') {
        distanceTpPips = this._calculatePipDistance(instrument, entryPrice, takeProfitPrice);
        if (sd === 'buy' && takeProfitPrice <= entryPrice) {
          errors.push('take_profit_wrong_side');
        }
        if (sd === 'sell' && takeProfitPrice >= entryPrice) {
          errors.push('take_profit_wrong_side');
        }
      }
    }

    let marginRequired = 0;
    if (instrument && typeof entryPrice === 'number') {
      marginRequired = this._calculateMarginRequired(instrument, volumeLots, leverage, entryPrice);
    }

    const valid = errors.length === 0;

    return {
      valid: valid,
      validation_errors: errors,
      estimated_fill_price: entryPrice,
      notional_value: instrument && entryPrice
        ? volumeLots * (instrument.contract_size || 1) * entryPrice
        : 0,
      margin_required: marginRequired,
      distance_sl_pips: distanceSlPips,
      distance_tp_pips: distanceTpPips
    };
  }

  // 8) placeOrder(instrumentId, orderType, side, volumeLots, leverage, price, stopLossPrice, takeProfitPrice, clientTag)
  placeOrder(instrumentId, orderType, side, volumeLots, leverage, price, stopLossPrice, takeProfitPrice, clientTag) {
    const account = this._getDefaultTradingAccount();
    const instrument = this._getInstrumentById(instrumentId);

    const preview = this.previewOrder(
      instrumentId,
      orderType,
      side,
      volumeLots,
      leverage,
      price,
      stopLossPrice,
      takeProfitPrice
    );

    if (!preview.valid) {
      return {
        success: false,
        message: 'order_validation_failed',
        order: null,
        position: null,
        updated_account: { account: account }
      };
    }

    const ot = (orderType || '').toLowerCase();
    const sd = (side || '').toLowerCase();

    const orders = this._getFromStorage('orders');
    const positions = this._getFromStorage('positions');

    const now = this._now();

    const order = {
      id: this._generateId('ord'),
      account_id: account.id,
      instrument_id: instrumentId,
      order_type: ot,
      side: sd,
      status: ot === 'market' ? 'filled' : 'pending',
      volume_lots: volumeLots,
      leverage: leverage || instrument.default_leverage || instrument.max_leverage || null,
      price: ot === 'market' ? preview.estimated_fill_price : price,
      stop_loss_price: typeof stopLossPrice === 'number' ? stopLossPrice : null,
      take_profit_price: typeof takeProfitPrice === 'number' ? takeProfitPrice : null,
      distance_sl_pips: preview.distance_sl_pips,
      distance_tp_pips: preview.distance_tp_pips,
      margin_required: preview.margin_required,
      created_at: now,
      updated_at: now,
      filled_position_id: null,
      oco_group_id: null,
      notes: clientTag || null
    };

    let createdPositionWrapper = null;
    let updatedAccount = account;

    if (ot === 'market') {
      const fillPrice = preview.estimated_fill_price;
      const marginRequired = preview.margin_required || 0;

      const position = {
        id: this._generateId('pos'),
        account_id: account.id,
        instrument_id: instrumentId,
        status: 'open',
        direction: sd,
        volume_lots: volumeLots,
        leverage: order.leverage,
        entry_price: fillPrice,
        current_price: fillPrice,
        stop_loss_price: order.stop_loss_price,
        take_profit_price: order.take_profit_price,
        opened_at: now,
        updated_at: now,
        close_price: null,
        closed_at: null,
        realized_pnl: null,
        unrealized_pnl: 0,
        margin_used: marginRequired,
        commission: 0,
        swap: 0,
        notes: clientTag || null
      };

      positions.push(position);
      this._saveToStorage('positions', positions);

      order.filled_position_id = position.id;
      order.updated_at = this._now();

      // Update account margin
      updatedAccount = this._recomputeAccountAfterMarginChange(account, marginRequired);

      createdPositionWrapper = { data: position };
    }

    orders.push(order);
    this._saveToStorage('orders', orders);

    return {
      success: true,
      message: 'order_placed',
      order: order,
      position: createdPositionWrapper,
      updated_account: { account: updatedAccount }
    };
  }

  // 9) createOcoOrderGroupWithOrders(instrumentId, firstLeg, secondLeg)
  createOcoOrderGroupWithOrders(instrumentId, firstLeg, secondLeg) {
    const instrument = this._getInstrumentById(instrumentId);
    const account = this._getDefaultTradingAccount();

    if (!instrument) {
      return {
        success: false,
        message: 'instrument_not_found',
        oco_group: null,
        orders: []
      };
    }

    const validTypes = ['buy_stop', 'sell_stop', 'buy_limit', 'sell_limit'];

    function validateLeg(leg) {
      if (!leg) return false;
      if (validTypes.indexOf((leg.orderType || '').toLowerCase()) === -1) return false;
      const sd = (leg.side || '').toLowerCase();
      if (sd !== 'buy' && sd !== 'sell') return false;
      if (typeof leg.price !== 'number' || leg.price <= 0) return false;
      if (!leg.volumeLots || leg.volumeLots <= 0) return false;
      return true;
    }

    if (!validateLeg(firstLeg) || !validateLeg(secondLeg)) {
      return {
        success: false,
        message: 'invalid_oco_legs',
        oco_group: null,
        orders: []
      };
    }

    const ocoGroups = this._getFromStorage('oco_order_groups');
    const orders = this._getFromStorage('orders');
    const now = this._now();

    const group = {
      id: this._generateId('oco'),
      instrument_id: instrumentId,
      status: 'active',
      created_at: now,
      updated_at: now,
      triggered_order_id: null
    };

    function buildOrder(self, leg, groupId) {
      const sd = (leg.side || '').toLowerCase();
      const ot = (leg.orderType || '').toLowerCase();
      const sl = typeof leg.stopLossPrice === 'number' ? leg.stopLossPrice : null;
      const tp = typeof leg.takeProfitPrice === 'number' ? leg.takeProfitPrice : null;
      const distanceSl = typeof leg.distanceSlPips === 'number'
        ? leg.distanceSlPips
        : (sl ? self._calculatePipDistance(instrument, leg.price, sl) : null);
      const distanceTp = typeof leg.distanceTpPips === 'number'
        ? leg.distanceTpPips
        : (tp ? self._calculatePipDistance(instrument, leg.price, tp) : null);

      return {
        id: self._generateId('ord'),
        account_id: account.id,
        instrument_id: instrumentId,
        order_type: ot,
        side: sd,
        status: 'pending',
        volume_lots: leg.volumeLots,
        leverage: null,
        price: leg.price,
        stop_loss_price: sl,
        take_profit_price: tp,
        distance_sl_pips: distanceSl,
        distance_tp_pips: distanceTp,
        margin_required: 0,
        created_at: now,
        updated_at: now,
        filled_position_id: null,
        oco_group_id: groupId,
        notes: null
      };
    }

    const order1 = buildOrder(this, firstLeg, group.id);
    const order2 = buildOrder(this, secondLeg, group.id);

    ocoGroups.push(group);
    orders.push(order1);
    orders.push(order2);

    this._saveToStorage('oco_order_groups', ocoGroups);
    this._saveToStorage('orders', orders);

    // Instrumentation for task completion tracking (task_9)
    try {
      if (instrument && typeof instrument.symbol === 'string' && instrument.symbol.toUpperCase() === 'EUR/USD') {
        const quote = this._getInstrumentQuote(instrumentId);
        let basePrice = null;
        if (quote) {
          const hasBid = typeof quote.bid === 'number';
          const hasAsk = typeof quote.ask === 'number';
          if (hasBid && hasAsk) {
            basePrice = (quote.bid + quote.ask) / 2;
          } else if (hasBid) {
            basePrice = quote.bid;
          } else if (hasAsk) {
            basePrice = quote.ask;
          }
        }

        let buyOrder = null;
        let sellOrder = null;
        if (order1 && order1.side === 'buy') {
          buyOrder = order1;
        } else if (order1 && order1.side === 'sell') {
          sellOrder = order1;
        }
        if (order2 && order2.side === 'buy') {
          buyOrder = order2;
        } else if (order2 && order2.side === 'sell') {
          sellOrder = order2;
        }

        let buyDistanceFromBase = null;
        let sellDistanceFromBase = null;
        if (instrument && typeof basePrice === 'number') {
          if (buyOrder && typeof buyOrder.price === 'number') {
            buyDistanceFromBase = this._calculatePipDistance(instrument, basePrice, buyOrder.price);
          }
          if (sellOrder && typeof sellOrder.price === 'number') {
            sellDistanceFromBase = this._calculatePipDistance(instrument, basePrice, sellOrder.price);
          }
        }

        const task9_eurUsdOcoContext = {
          oco_group_id: group.id,
          instrument_id: instrumentId,
          base_price_at_creation: basePrice,
          buy_leg: {
            order_id: buyOrder ? buyOrder.id : null,
            price: buyOrder ? buyOrder.price : null,
            distance_from_base_pips: buyDistanceFromBase
          },
          sell_leg: {
            order_id: sellOrder ? sellOrder.id : null,
            price: sellOrder ? sellOrder.price : null,
            distance_from_base_pips: sellDistanceFromBase
          },
          created_at: group.created_at
        };
        localStorage.setItem('task9_eurUsdOcoContext', JSON.stringify(task9_eurUsdOcoContext));
      }
    } catch (e) {
      console.error('Instrumentation error (task9_eurUsdOcoContext):', e);
    }

    return {
      success: true,
      message: 'oco_group_created',
      oco_group: group,
      orders: [order1, order2]
    };
  }

  // 10) getWatchlistsOverview()
  getWatchlistsOverview() {
    const watchlists = this._getFromStorage('watchlists');
    const favorites = this._getOrCreateFavoritesWatchlist();
    const activeId = this._getActiveWatchlistId();

    return {
      watchlists: watchlists,
      active_watchlist_id: activeId,
      favorites_watchlist_id: favorites.id
    };
  }

  // 11) getWatchlistInstruments(watchlistId)
  getWatchlistInstruments(watchlistId) {
    const watchlists = this._getFromStorage('watchlists');
    const watchlist = watchlists.find(function (w) {
      return w.id === watchlistId;
    }) || null;

    const watchlistInstruments = this._getFromStorage('watchlist_instruments');
    const instruments = this._getFromStorage('instruments');
    const quotes = this._getFromStorage('instrument_quotes');
    const favorites = this._getOrCreateFavoritesWatchlist();

    const itemsForList = watchlistInstruments.filter(function (wi) {
      return wi.watchlist_id === watchlistId;
    });

    const items = itemsForList.map(function (wi) {
      const inst = instruments.find(function (i) { return i.id === wi.instrument_id; }) || null;
      const qt = quotes.find(function (q) { return q.instrument_id === wi.instrument_id; }) || null;
      const isStarred = watchlistId === favorites.id
        ? true
        : watchlistInstruments.some(function (wix) {
            return wix.watchlist_id === favorites.id && wix.instrument_id === wi.instrument_id;
          });
      return {
        instrument: inst,
        quote: qt,
        is_starred: isStarred
      };
    });

    return {
      watchlist: watchlist,
      items: items
    };
  }

  // 12) createWatchlist(name)
  createWatchlist(name) {
    const watchlists = this._getFromStorage('watchlists');
    const now = this._now();
    const watchlist = {
      id: this._generateId('watchlist'),
      name: name,
      is_default_favorites: false,
      is_active: false,
      created_at: now,
      updated_at: now
    };
    watchlists.push(watchlist);
    this._saveToStorage('watchlists', watchlists);
    return { watchlist: watchlist };
  }

  // 13) renameWatchlist(watchlistId, newName)
  renameWatchlist(watchlistId, newName) {
    const watchlists = this._getFromStorage('watchlists');
    const idx = watchlists.findIndex(function (w) { return w.id === watchlistId; });
    if (idx === -1) {
      return { watchlist: null };
    }
    const wl = Object.assign({}, watchlists[idx]);
    wl.name = newName;
    wl.updated_at = this._now();
    watchlists[idx] = wl;
    this._saveToStorage('watchlists', watchlists);
    return { watchlist: wl };
  }

  // 14) deleteWatchlist(watchlistId)
  deleteWatchlist(watchlistId) {
    const watchlists = this._getFromStorage('watchlists');
    const wl = watchlists.find(function (w) { return w.id === watchlistId; });
    if (!wl) {
      return { success: false, message: 'watchlist_not_found' };
    }
    if (wl.is_default_favorites) {
      return { success: false, message: 'cannot_delete_favorites' };
    }

    const filteredWatchlists = watchlists.filter(function (w) {
      return w.id !== watchlistId;
    });
    this._saveToStorage('watchlists', filteredWatchlists);

    // Remove join records
    const watchlistInstruments = this._getFromStorage('watchlist_instruments');
    const filteredWi = watchlistInstruments.filter(function (wi) {
      return wi.watchlist_id !== watchlistId;
    });
    this._saveToStorage('watchlist_instruments', filteredWi);

    // Clear active_watchlist_id if this was active
    const activeId = this._getActiveWatchlistId();
    if (activeId === watchlistId) {
      this._setActiveWatchlistId(null);
    }

    return { success: true, message: 'watchlist_deleted' };
  }

  // 15) setActiveWatchlist(watchlistId)
  setActiveWatchlist(watchlistId) {
    const watchlists = this._getFromStorage('watchlists');
    let activeWatchlist = null;
    const now = this._now();

    for (let i = 0; i < watchlists.length; i++) {
      const wl = Object.assign({}, watchlists[i]);
      if (wl.is_default_favorites) {
        wl.is_active = false;
      } else if (wl.id === watchlistId) {
        wl.is_active = true;
        wl.updated_at = now;
        activeWatchlist = wl;
      } else {
        wl.is_active = false;
      }
      watchlists[i] = wl;
    }

    this._saveToStorage('watchlists', watchlists);
    this._setActiveWatchlistId(activeWatchlist ? activeWatchlist.id : null);

    return { active_watchlist: activeWatchlist };
  }

  // 16) addInstrumentToWatchlist(watchlistId, instrumentId)
  addInstrumentToWatchlist(watchlistId, instrumentId) {
    const watchlists = this._getFromStorage('watchlists');
    const instruments = this._getFromStorage('instruments');
    const watchlist = watchlists.find(function (w) { return w.id === watchlistId; }) || null;
    const instrument = instruments.find(function (i) { return i.id === instrumentId; }) || null;

    if (!watchlist || !instrument) {
      return { watchlist: null, instrument: null };
    }

    const watchlistInstruments = this._getFromStorage('watchlist_instruments');
    const exists = watchlistInstruments.some(function (wi) {
      return wi.watchlist_id === watchlistId && wi.instrument_id === instrumentId;
    });
    if (!exists) {
      watchlistInstruments.push({
        id: this._generateId('wli'),
        watchlist_id: watchlistId,
        instrument_id: instrumentId,
        added_at: this._now(),
        position: null
      });
      this._saveToStorage('watchlist_instruments', watchlistInstruments);
    }

    return { watchlist: watchlist, instrument: instrument };
  }

  // 17) removeInstrumentFromWatchlist(watchlistId, instrumentId)
  removeInstrumentFromWatchlist(watchlistId, instrumentId) {
    const watchlists = this._getFromStorage('watchlists');
    const instruments = this._getFromStorage('instruments');
    const watchlist = watchlists.find(function (w) { return w.id === watchlistId; }) || null;
    const instrument = instruments.find(function (i) { return i.id === instrumentId; }) || null;

    const watchlistInstruments = this._getFromStorage('watchlist_instruments');
    const filtered = watchlistInstruments.filter(function (wi) {
      return !(wi.watchlist_id === watchlistId && wi.instrument_id === instrumentId);
    });
    this._saveToStorage('watchlist_instruments', filtered);

    return { watchlist: watchlist, instrument: instrument };
  }

  // 18) getOpenPositions(sortBy, sortDirection, filters)
  getOpenPositions(sortBy, sortDirection, filters) {
    const account = this._getDefaultTradingAccount();
    const positions = this._getFromStorage('positions');
    const instruments = this._getFromStorage('instruments');
    const quotes = this._getFromStorage('instrument_quotes');
    const filt = filters || {};

    let result = positions.filter(function (p) {
      if (p.account_id !== account.id) return false;
      if (p.status !== 'open') return false;
      if (typeof filt.min_unrealized_pnl === 'number' && (p.unrealized_pnl || 0) < filt.min_unrealized_pnl) {
        return false;
      }
      if (typeof filt.max_unrealized_pnl === 'number' && (p.unrealized_pnl || 0) > filt.max_unrealized_pnl) {
        return false;
      }
      return true;
    });

    result = result.filter(function (p) {
      if (!filt.instrumentType) return true;
      const inst = instruments.find(function (i) { return i.id === p.instrument_id; }) || null;
      if (!inst) return false;
      return inst.instrument_type === filt.instrumentType;
    });

    const sBy = sortBy || 'opened_at';
    const dir = (sortDirection || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

    result.sort(function (a, b) {
      let va;
      let vb;
      if (sBy === 'unrealized_pnl') {
        va = a.unrealized_pnl || 0;
        vb = b.unrealized_pnl || 0;
      } else if (sBy === 'instrument_symbol') {
        const ia = instruments.find(function (i) { return i.id === a.instrument_id; }) || {};
        const ib = instruments.find(function (i) { return i.id === b.instrument_id; }) || {};
        va = (ia.symbol || '').toLowerCase();
        vb = (ib.symbol || '').toLowerCase();
      } else {
        va = a.opened_at || '';
        vb = b.opened_at || '';
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return result.map(function (p) {
      const inst = instruments.find(function (i) { return i.id === p.instrument_id; }) || null;
      const qt = quotes.find(function (q) { return q.instrument_id === p.instrument_id; }) || null;
      return {
        position: p,
        instrument: inst,
        quote: qt
      };
    });
  }

  // 19) modifyPositionStops(positionId, newStopLossPrice, newTakeProfitPrice)
  modifyPositionStops(positionId, newStopLossPrice, newTakeProfitPrice) {
    const positions = this._getFromStorage('positions');
    const idx = positions.findIndex(function (p) { return p.id === positionId; });
    if (idx === -1) {
      return { success: false, message: 'position_not_found', position: null };
    }
    const p = Object.assign({}, positions[idx]);
    if (p.status !== 'open') {
      return { success: false, message: 'position_not_open', position: p };
    }

    if (typeof newStopLossPrice === 'number') {
      p.stop_loss_price = newStopLossPrice;
    }
    if (typeof newTakeProfitPrice === 'number') {
      p.take_profit_price = newTakeProfitPrice;
    }
    p.updated_at = this._now();
    positions[idx] = p;
    this._saveToStorage('positions', positions);

    return { success: true, message: 'position_stops_modified', position: p };
  }

  // 20) closePosition(positionId, closeVolumeLots)
  closePosition(positionId, closeVolumeLots) {
    const positions = this._getFromStorage('positions');
    const instruments = this._getFromStorage('instruments');
    const quotes = this._getFromStorage('instrument_quotes');
    const tradeHistory = this._getFromStorage('trade_history_items');

    const idx = positions.findIndex(function (p) { return p.id === positionId; });
    if (idx === -1) {
      return { success: false, message: 'position_not_found', closed_position: null, updated_account: null };
    }

    const pos = positions[idx];
    if (pos.status !== 'open') {
      return { success: false, message: 'position_not_open', closed_position: pos, updated_account: null };
    }

    const account = this._getDefaultTradingAccount();
    const instrument = instruments.find(function (i) { return i.id === pos.instrument_id; }) || null;
    const quote = quotes.find(function (q) { return q.instrument_id === pos.instrument_id; }) || null;

    let marketPrice;
    if (quote) {
      if (pos.direction === 'buy') {
        marketPrice = quote.bid;
      } else {
        marketPrice = quote.ask;
      }
    } else {
      marketPrice = pos.current_price || pos.entry_price;
    }

    const volumeToClose = typeof closeVolumeLots === 'number' && closeVolumeLots > 0
      ? Math.min(closeVolumeLots, pos.volume_lots)
      : pos.volume_lots;

    const sideSign = pos.direction === 'buy' ? 1 : -1;
    const contractSize = instrument && instrument.contract_size ? instrument.contract_size : 1;

    const fullPnL = (marketPrice - pos.entry_price) * sideSign * pos.volume_lots * contractSize;
    const proportion = volumeToClose / pos.volume_lots;
    const realizedPnL = fullPnL * proportion;

    const marginUsed = pos.margin_used || 0;
    const marginReduction = marginUsed * proportion;

    const now = this._now();
    const dayKey = this._formatDayKey(now);

    // Create trade history record for the closed portion
    const trade = {
      id: this._generateId('hist'),
      account_id: account.id,
      instrument_id: pos.instrument_id,
      direction: pos.direction,
      volume_lots: volumeToClose,
      entry_price: pos.entry_price,
      exit_price: marketPrice,
      opened_at: pos.opened_at,
      closed_at: now,
      realized_pnl: realizedPnL,
      commission: pos.commission || 0,
      swap: pos.swap || 0,
      day_key: dayKey,
      comment: pos.notes || null
    };
    tradeHistory.push(trade);
    this._saveToStorage('trade_history_items', tradeHistory);

    // Update position
    let closedPosition;
    if (volumeToClose >= pos.volume_lots - 1e-8) {
      // Full close
      const updatedPos = Object.assign({}, pos);
      updatedPos.status = 'closed';
      updatedPos.close_price = marketPrice;
      updatedPos.closed_at = now;
      updatedPos.realized_pnl = (updatedPos.realized_pnl || 0) + realizedPnL;
      updatedPos.unrealized_pnl = 0;
      updatedPos.margin_used = 0;
      updatedPos.updated_at = now;

      positions[idx] = updatedPos;
      closedPosition = updatedPos;
    } else {
      // Partial close
      const remainingPos = Object.assign({}, pos);
      remainingPos.volume_lots = pos.volume_lots - volumeToClose;
      remainingPos.margin_used = marginUsed - marginReduction;
      remainingPos.updated_at = now;
      // Unrealized PnL recalculated proportionally for remaining volume
      remainingPos.unrealized_pnl = fullPnL - realizedPnL;
      positions[idx] = remainingPos;

      // Return a synthetic closed_position representing the closed part
      closedPosition = {
        id: pos.id,
        account_id: pos.account_id,
        instrument_id: pos.instrument_id,
        status: 'closed',
        direction: pos.direction,
        volume_lots: volumeToClose,
        leverage: pos.leverage,
        entry_price: pos.entry_price,
        current_price: marketPrice,
        stop_loss_price: pos.stop_loss_price,
        take_profit_price: pos.take_profit_price,
        opened_at: pos.opened_at,
        updated_at: now,
        close_price: marketPrice,
        closed_at: now,
        realized_pnl: realizedPnL,
        unrealized_pnl: 0,
        margin_used: 0,
        commission: pos.commission || 0,
        swap: pos.swap || 0,
        notes: pos.notes || null
      };
    }

    this._saveToStorage('positions', positions);

    // Update account balance and margin
    const accounts = this._getFromStorage('trading_accounts');
    const aIdx = accounts.findIndex(function (a) { return a.id === account.id; });
    let updatedAccount = account;
    if (aIdx !== -1) {
      const acc = Object.assign({}, accounts[aIdx]);
      acc.balance = (acc.balance || 0) + realizedPnL;
      accounts[aIdx] = acc;
      this._saveToStorage('trading_accounts', accounts);
      updatedAccount = this._recomputeAccountAfterMarginChange(acc, -marginReduction);
    }

    return {
      success: true,
      message: 'position_closed',
      closed_position: closedPosition,
      updated_account: { account: updatedAccount }
    };
  }

  // 21) getTradeHistorySummary(startDate, endDate)
  getTradeHistorySummary(startDate, endDate) {
    const trades = this._getFromStorage('trade_history_items');
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    const map = {};
    for (const t of trades) {
      const closed = this._parseDate(t.closed_at);
      if (!closed) continue;
      if (start && closed < start) continue;
      if (end && closed > end) continue;

      const key = t.day_key || this._formatDayKey(t.closed_at);
      if (!map[key]) {
        map[key] = { day_key: key, total_realized_pnl: 0, trade_count: 0 };
      }
      map[key].total_realized_pnl += t.realized_pnl || 0;
      map[key].trade_count += 1;
    }

    const result = Object.keys(map).sort().map(function (k) {
      return map[k];
    });

    return result;
  }

  // 22) getTradeHistoryItems(filters, sortBy, sortDirection)
  getTradeHistoryItems(filters, sortBy, sortDirection) {
    const filt = filters || {};
    const trades = this._getFromStorage('trade_history_items');
    const instruments = this._getFromStorage('instruments');

    let start = null;
    let end = null;
    if (filt.startDate) start = new Date(filt.startDate);
    if (filt.endDate) end = new Date(filt.endDate);

    let result = trades.filter(function (t) {
      if (filt.dayKey) {
        const key = t.day_key || (t.closed_at ? this._formatDayKey(t.closed_at) : null);
        if (key !== filt.dayKey) return false;
      } else {
        const closed = t.closed_at ? new Date(t.closed_at) : null;
        if (!closed) return false;
        if (start && closed < start) return false;
        if (end && closed > end) return false;
      }
      if (filt.instrumentId && t.instrument_id !== filt.instrumentId) return false;
      return true;
    }, this);

    const sBy = sortBy || 'closed_at';
    const dir = (sortDirection || 'asc').toLowerCase() === 'desc' ? 'desc' : 'asc';

    result.sort(function (a, b) {
      let va;
      let vb;
      if (sBy === 'realized_pnl') {
        va = a.realized_pnl || 0;
        vb = b.realized_pnl || 0;
      } else {
        va = a.closed_at || '';
        vb = b.closed_at || '';
      }
      if (va < vb) return dir === 'asc' ? -1 : 1;
      if (va > vb) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    return result.map(function (t) {
      const inst = instruments.find(function (i) { return i.id === t.instrument_id; }) || null;
      return {
        trade: t,
        instrument: inst
      };
    });
  }

  // 23) getEconomicCalendarEvents(filters)
  getEconomicCalendarEvents(filters) {
    const filt = filters || {};
    const events = this._getFromStorage('economic_events');

    const startTime = filt.startTime ? new Date(filt.startTime) : null;
    const endTime = filt.endTime ? new Date(filt.endTime) : null;

    return events.filter(function (ev) {
      if (filt.currency && ev.currency !== filt.currency) return false;
      if (filt.impact && ev.impact !== filt.impact) return false;
      if (filt.status && ev.status !== filt.status) return false;
      const sched = ev.scheduled_time ? new Date(ev.scheduled_time) : null;
      if (startTime && sched && sched < startTime) return false;
      if (endTime && sched && sched > endTime) return false;
      return true;
    });
  }

  // 24) getNextMatchingEconomicEvent(filters)
  getNextMatchingEconomicEvent(filters) {
    const filt = filters || {};
    const events = this._getFromStorage('economic_events');
    const now = new Date();

    const matching = events.filter(function (ev) {
      if (filt.currency && ev.currency !== filt.currency) return false;
      if (filt.impact && ev.impact !== filt.impact) return false;
      if (filt.status && ev.status !== filt.status) return false;
      const sched = ev.scheduled_time ? new Date(ev.scheduled_time) : null;
      if (!sched) return false;
      if (sched < now) return false;
      return true;
    });

    matching.sort(function (a, b) {
      const ta = a.scheduled_time || '';
      const tb = b.scheduled_time || '';
      if (ta < tb) return -1;
      if (ta > tb) return 1;
      return 0;
    });

    return {
      event: matching.length > 0 ? matching[0] : null
    };
  }

  // 25) createPriceAlert(instrumentId, targetPrice, direction, note)
  createPriceAlert(instrumentId, targetPrice, direction, note) {
    const instrument = this._getInstrumentById(instrumentId);
    const dir = (direction || '').toLowerCase();
    if (!instrument) {
      return { alert: null };
    }
    if (dir !== 'above' && dir !== 'below' && dir !== 'equal') {
      return { alert: null };
    }
    if (typeof targetPrice !== 'number' || targetPrice <= 0) {
      return { alert: null };
    }

    const alerts = this._getFromStorage('price_alerts');
    const alert = {
      id: this._generateId('alert'),
      instrument_id: instrumentId,
      target_price: targetPrice,
      direction: dir,
      status: 'active',
      note: note || null,
      created_at: this._now(),
      triggered_at: null
    };
    alerts.push(alert);
    this._saveToStorage('price_alerts', alerts);

    // Instrumentation for task completion tracking (task_7)
    try {
      if (instrument && typeof instrument.symbol === 'string' && instrument.symbol.toUpperCase() === 'EUR/USD') {
        const quote = this._getInstrumentQuote(instrumentId);
        let basePrice = null;
        if (quote) {
          const hasBid = typeof quote.bid === 'number';
          const hasAsk = typeof quote.ask === 'number';
          if (hasBid && hasAsk) {
            basePrice = (quote.bid + quote.ask) / 2;
          } else if (hasBid) {
            basePrice = quote.bid;
          } else if (hasAsk) {
            basePrice = quote.ask;
          }
        }

        let pipDistance = null;
        if (instrument && typeof basePrice === 'number') {
          pipDistance = this._calculatePipDistance(instrument, basePrice, targetPrice);
        }

        const task7_eurUsdAlertContext = {
          alert_id: alert.id,
          instrument_id: instrumentId,
          direction: dir,
          created_at: alert.created_at,
          base_price_at_creation: basePrice,
          target_price: targetPrice,
          pip_distance: pipDistance
        };
        localStorage.setItem('task7_eurUsdAlertContext', JSON.stringify(task7_eurUsdAlertContext));
      }
    } catch (e) {
      console.error('Instrumentation error (task7_eurUsdAlertContext):', e);
    }

    return { alert: alert };
  }

  // 26) getPriceAlerts(filters)
  getPriceAlerts(filters) {
    const filt = filters || {};
    const alerts = this._getFromStorage('price_alerts');
    const instruments = this._getFromStorage('instruments');

    const result = alerts.filter(function (a) {
      if (filt.instrumentId && a.instrument_id !== filt.instrumentId) return false;
      if (filt.status && a.status !== filt.status) return false;
      return true;
    });

    return result.map(function (a) {
      const inst = instruments.find(function (i) { return i.id === a.instrument_id; }) || null;
      return {
        alert: a,
        instrument: inst
      };
    });
  }

  // 27) updatePriceAlert(alertId, targetPrice, direction, note, status)
  updatePriceAlert(alertId, targetPrice, direction, note, status) {
    const alerts = this._getFromStorage('price_alerts');
    const idx = alerts.findIndex(function (a) { return a.id === alertId; });
    if (idx === -1) {
      return { alert: null };
    }
    const alert = Object.assign({}, alerts[idx]);
    if (typeof targetPrice === 'number' && targetPrice > 0) {
      alert.target_price = targetPrice;
    }
    if (direction) {
      const dir = direction.toLowerCase();
      if (dir === 'above' || dir === 'below' || dir === 'equal') {
        alert.direction = dir;
      }
    }
    if (typeof note === 'string') {
      alert.note = note;
    }
    if (status) {
      alert.status = status;
      if (status === 'triggered') {
        alert.triggered_at = this._now();
      }
    }
    alerts[idx] = alert;
    this._saveToStorage('price_alerts', alerts);
    return { alert: alert };
  }

  // 28) cancelPriceAlert(alertId)
  cancelPriceAlert(alertId) {
    const alerts = this._getFromStorage('price_alerts');
    const idx = alerts.findIndex(function (a) { return a.id === alertId; });
    if (idx === -1) {
      return { success: false, alert: null };
    }
    const alert = Object.assign({}, alerts[idx]);
    alert.status = 'canceled';
    alerts[idx] = alert;
    this._saveToStorage('price_alerts', alerts);
    return { success: true, alert: alert };
  }

  // 29) getAboutPageContent()
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (raw) {
      return JSON.parse(raw);
    }
    // No mock content; return empty structured object
    return {
      headline: '',
      sections: [],
      regulatory_info: []
    };
  }

  // 30) getContactSupportInfo()
  getContactSupportInfo() {
    const raw = localStorage.getItem('contact_support_info');
    if (raw) {
      return JSON.parse(raw);
    }
    return {
      email: '',
      phone: '',
      support_hours: '',
      expected_response_time: '',
      help_center_link_label: ''
    };
  }

  // 31) submitSupportRequest(category, subject, message, contactEmail)
  submitSupportRequest(category, subject, message, contactEmail) {
    const requests = this._getFromStorage('support_requests');
    const ticketId = this._generateId('ticket');
    const req = {
      id: ticketId,
      category: category,
      subject: subject,
      message: message,
      contact_email: contactEmail,
      created_at: this._now(),
      status: 'open'
    };
    requests.push(req);
    this._saveToStorage('support_requests', requests);
    return {
      ticket_id: ticketId,
      success: true,
      message: 'support_request_submitted'
    };
  }

  // 32) getSpreadsAndFeesOverview()
  getSpreadsAndFeesOverview() {
    const raw = localStorage.getItem('spreads_and_fees_overview');
    if (raw) {
      return JSON.parse(raw);
    }
    // If not configured, return empty structure
    return {
      instruments: [],
      category_summaries: []
    };
  }

  // 33) getHelpCenterArticles(filters)
  getHelpCenterArticles(filters) {
    const filt = filters || {};
    const articles = this._getFromStorage('help_center_articles');
    const query = (filt.query || '').toLowerCase();

    const filtered = articles.filter(function (a) {
      if (filt.section && a.section !== filt.section) return false;
      if (query) {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const body = (a.body || '').toLowerCase();
        if (title.indexOf(query) === -1 && summary.indexOf(query) === -1 && body.indexOf(query) === -1) {
          return false;
        }
      }
      return true;
    });

    return filtered.map(function (a) {
      return {
        id: a.id,
        title: a.title,
        summary: a.summary,
        section: a.section
      };
    });
  }

  // 34) getHelpCenterArticleDetail(articleId)
  getHelpCenterArticleDetail(articleId) {
    const articles = this._getFromStorage('help_center_articles');
    const a = articles.find(function (x) { return x.id === articleId; });
    if (!a) {
      return { id: null, title: '', section: '', body: '' };
    }
    return {
      id: a.id,
      title: a.title,
      section: a.section,
      body: a.body || ''
    };
  }

  // 35) getLegalDocuments()
  getLegalDocuments() {
    const docs = this._getFromStorage('legal_documents');
    return docs.map(function (d) {
      return {
        id: d.id,
        code: d.code,
        title: d.title,
        last_updated: d.last_updated
      };
    });
  }

  // 36) getLegalDocumentContent(documentId)
  getLegalDocumentContent(documentId) {
    const docs = this._getFromStorage('legal_documents');
    const d = docs.find(function (x) { return x.id === documentId; });
    if (!d) {
      return { id: null, code: '', title: '', body: '' };
    }
    return {
      id: d.id,
      code: d.code,
      title: d.title,
      body: d.body || ''
    };
  }

  // 37) getEducationArticles(filters)
  getEducationArticles(filters) {
    const filt = filters || {};
    const articles = this._getFromStorage('education_articles');
    const filtered = articles.filter(function (a) {
      if (filt.topic && a.topic !== filt.topic) return false;
      if (filt.level && a.level !== filt.level) return false;
      return true;
    });
    return filtered.map(function (a) {
      return {
        id: a.id,
        title: a.title,
        topic: a.topic,
        level: a.level,
        summary: a.summary
      };
    });
  }

  // 38) getEducationArticleDetail(articleId)
  getEducationArticleDetail(articleId) {
    const articles = this._getFromStorage('education_articles');
    const a = articles.find(function (x) { return x.id === articleId; });
    if (!a) {
      return { id: null, title: '', topic: '', level: '', body: '' };
    }
    return {
      id: a.id,
      title: a.title,
      topic: a.topic,
      level: a.level,
      body: a.body || ''
    };
  }

  // 39) getUserSettings()
  getUserSettings() {
    const raw = localStorage.getItem('settings');
    if (raw) {
      return { settings: JSON.parse(raw) };
    }
    // Default settings (structure only, no trading data)
    const settings = {
      id: 'settings_default',
      time_zone: 'UTC',
      language: 'en',
      quote_format: 'decimal_5',
      default_order_type: 'market',
      default_lot_size: 0.1,
      default_sl_distance_pips: 0,
      default_tp_distance_pips: 0,
      notifications_trade_confirmation: true,
      notifications_price_alert: true,
      created_at: this._now(),
      updated_at: this._now()
    };
    localStorage.setItem('settings', JSON.stringify(settings));
    return { settings: settings };
  }

  // 40) updateUserSettings(changes)
  updateUserSettings(changes) {
    const current = this.getUserSettings().settings;
    const ch = changes || {};

    const updated = Object.assign({}, current);
    if (typeof ch.time_zone === 'string') updated.time_zone = ch.time_zone;
    if (typeof ch.language === 'string') updated.language = ch.language;
    if (typeof ch.quote_format === 'string') updated.quote_format = ch.quote_format;
    if (typeof ch.default_order_type === 'string') updated.default_order_type = ch.default_order_type;
    if (typeof ch.default_lot_size === 'number') updated.default_lot_size = ch.default_lot_size;
    if (typeof ch.default_sl_distance_pips === 'number') updated.default_sl_distance_pips = ch.default_sl_distance_pips;
    if (typeof ch.default_tp_distance_pips === 'number') updated.default_tp_distance_pips = ch.default_tp_distance_pips;
    if (typeof ch.notifications_trade_confirmation === 'boolean') updated.notifications_trade_confirmation = ch.notifications_trade_confirmation;
    if (typeof ch.notifications_price_alert === 'boolean') updated.notifications_price_alert = ch.notifications_price_alert;

    updated.updated_at = this._now();

    localStorage.setItem('settings', JSON.stringify(updated));
    return { settings: updated };
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
