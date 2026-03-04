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

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    const keys = [
      'derivatives_contracts',
      'derivatives_contract_stats',
      'watchlist_items',
      'positions',
      'orders',
      'trade_history_entries',
      'price_alerts',
      'fee_rates',
      'fee_calculations',
      'pages',
      'navigation_links',
      'tool_resources'
    ];

    keys.forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // current_contract_id is a single value, do not initialize to keep it unset by default
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

  _nowIso() {
    return new Date().toISOString();
  }

  // -------------------- Core Private Helpers --------------------

  // Resolve current contract context based on a stored contract id
  _getCurrentContractContext() {
    const raw = localStorage.getItem('current_contract_id');
    if (!raw) return null;
    const storedId = JSON.parse(raw);
    if (!storedId) return null;

    const contracts = this._getFromStorage('derivatives_contracts');
    let contract = contracts.find(c => c.id === storedId);

    // Fallback: try resolve by symbol_id or symbol if id not found
    if (!contract) {
      contract = contracts.find(c => c.symbol_id === storedId || c.symbol === storedId) || null;
    }

    return contract || null;
  }

  // Optional public setter for current contract context (not part of core interfaces)
  setCurrentContractContext(contractIdentifier) {
    const contracts = this._getFromStorage('derivatives_contracts');
    let contract = contracts.find(c => c.id === contractIdentifier);
    if (!contract) {
      contract = contracts.find(c => c.symbol_id === contractIdentifier || c.symbol === contractIdentifier) || null;
    }
    if (!contract) {
      throw new Error('Contract not found for identifier: ' + contractIdentifier);
    }
    localStorage.setItem('current_contract_id', JSON.stringify(contract.id));
    return contract;
  }

  _getLatestStatsForContract(contractId) {
    const allStats = this._getFromStorage('derivatives_contract_stats');
    const statsForContract = allStats.filter(s => s.contract_id === contractId);
    if (statsForContract.length === 0) return null;
    if (statsForContract.length === 1) return statsForContract[0];
    // pick the one with latest updated_at
    return statsForContract.reduce((latest, current) => {
      if (!latest) return current;
      const tLatest = latest.updated_at ? Date.parse(latest.updated_at) : 0;
      const tCurrent = current.updated_at ? Date.parse(current.updated_at) : 0;
      return tCurrent > tLatest ? current : latest;
    }, null);
  }

  _roundToLotSize(quantity, contract) {
    if (!contract || typeof contract.lot_size !== 'number' || contract.lot_size <= 0) {
      return quantity;
    }
    const lot = contract.lot_size;
    return Math.floor(quantity / lot) * lot;
  }

  // Calculate order notional and quantity based on inputs
  _calculateOrderNotionalAndQuantity(params) {
    const { quantity, marginAmount, leverage, price, contract } = params;
    let finalQuantity = null;
    let finalNotional = null;

    const quantityProvided = typeof quantity === 'number' && quantity > 0;

    if (quantityProvided) {
      finalQuantity = quantity;
      if (typeof price === 'number' && price > 0) {
        finalNotional = quantity * price;
      } else if (typeof marginAmount === 'number' && typeof leverage === 'number') {
        finalNotional = marginAmount * leverage;
      }
    } else if (typeof marginAmount === 'number' && typeof leverage === 'number') {
      finalNotional = marginAmount * leverage;
      if (typeof price === 'number' && price > 0) {
        finalQuantity = finalNotional / price;
      }
    }

    if (typeof finalQuantity === 'number' && contract && !quantityProvided) {
      finalQuantity = this._roundToLotSize(finalQuantity, contract);
    }

    return {
      quantity: typeof finalQuantity === 'number' && finalQuantity > 0 ? finalQuantity : null,
      notional: typeof finalNotional === 'number' && finalNotional > 0 ? finalNotional : null
    };
  }

  _getApplicableFeeRate(contractId, productType) {
    const contracts = this._getFromStorage('derivatives_contracts');
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return null;

    const feeRates = this._getFromStorage('fee_rates');
    const applicable = feeRates.filter(fr =>
      fr.product_type === productType &&
      fr.contract_type === contract.contract_type
    );

    if (applicable.length === 0) return null;

    // Prefer contract-specific symbol_id; fallback to generic ones (symbol_id == null)
    let specific = applicable.filter(fr => fr.symbol_id === contract.symbol_id);
    let pool = specific.length > 0 ? specific : applicable.filter(fr => !fr.symbol_id);
    if (pool.length === 0) {
      pool = applicable;
    }

    return pool.reduce((latest, current) => {
      if (!latest) return current;
      const tLatest = latest.effective_since ? Date.parse(latest.effective_since) : 0;
      const tCurrent = current.effective_since ? Date.parse(current.effective_since) : 0;
      return tCurrent > tLatest ? current : latest;
    }, null);
  }

  _applyTradeHistoryFilters(entries, filters, sortBy, sortDirection) {
    const { productType, status, startDate, endDate } = filters;
    const start = startDate ? Date.parse(startDate) : null;
    const end = endDate ? Date.parse(endDate) : null;

    const contracts = this._getFromStorage('derivatives_contracts');

    let filtered = entries.filter(e => {
      if (productType && e.product_type !== productType) return false;
      if (status && e.status !== status) return false;
      const closedAtTs = e.closed_at ? Date.parse(e.closed_at) : null;
      if (start !== null && closedAtTs !== null && closedAtTs < start) return false;
      if (end !== null && closedAtTs !== null && closedAtTs > end) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let av, bv;
      if (sortBy === 'realized_pnl') {
        av = typeof a.realized_pnl === 'number' ? a.realized_pnl : 0;
        bv = typeof b.realized_pnl === 'number' ? b.realized_pnl : 0;
      } else if (sortBy === 'symbol') {
        const ca = contracts.find(c => c.id === a.contract_id);
        const cb = contracts.find(c => c.id === b.contract_id);
        av = ca && ca.symbol ? ca.symbol.toLowerCase() : '';
        bv = cb && cb.symbol ? cb.symbol.toLowerCase() : '';
      } else { // closed_at
        av = a.closed_at ? Date.parse(a.closed_at) : 0;
        bv = b.closed_at ? Date.parse(b.closed_at) : 0;
      }

      if (av < bv) return sortDirection === 'asc' ? -1 : 1;
      if (av > bv) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  _findOpenPosition(contractId, positionSide) {
    const positions = this._getFromStorage('positions');
    return positions.find(p =>
      p.contract_id === contractId &&
      p.status === 'open' &&
      (!positionSide || p.side === positionSide)
    ) || null;
  }

  // -------------------- Interface Implementations --------------------

  // 1. getHomePageContent
  getHomePageContent() {
    const contracts = this._getFromStorage('derivatives_contracts');
    const statsAll = this._getFromStorage('derivatives_contract_stats');
    const watchlistItems = this._getFromStorage('watchlist_items');
    const watchSet = new Set(watchlistItems.map(w => w.contract_id));

    // Map latest stats by contract
    const latestStatsByContract = {};
    statsAll.forEach(s => {
      const existing = latestStatsByContract[s.contract_id];
      if (!existing) {
        latestStatsByContract[s.contract_id] = s;
      } else {
        const tExisting = existing.updated_at ? Date.parse(existing.updated_at) : 0;
        const tNew = s.updated_at ? Date.parse(s.updated_at) : 0;
        if (tNew > tExisting) latestStatsByContract[s.contract_id] = s;
      }
    });

    const activeDeriv = contracts.filter(c => c.product_type === 'derivatives' && c.contract_type === 'perpetual' && c.status === 'active');

    const featured = activeDeriv
      .map(contract => {
        const stats = latestStatsByContract[contract.id] || null;
        return {
          contract,
          stats,
          label: contract.display_name || contract.symbol,
          is_favorited: watchSet.has(contract.id)
        };
      })
      .sort((a, b) => {
        const va = a.stats && typeof a.stats.volume_24h === 'number' ? a.stats.volume_24h : 0;
        const vb = b.stats && typeof b.stats.volume_24h === 'number' ? b.stats.volume_24h : 0;
        return vb - va;
      })
      .slice(0, 5);

    const btcContract = activeDeriv.find(c => c.base_asset === 'BTC');

    const shortcuts = [];
    if (btcContract) {
      shortcuts.push({
        key: 'open_btc_perpetual_terminal',
        label: 'Trade ' + (btcContract.display_name || btcContract.symbol),
        target_type: 'trading_terminal',
        target_identifier: btcContract.id
      });
    }
    shortcuts.push(
      {
        key: 'go_to_markets',
        label: 'Browse USDT-M Perpetual Markets',
        target_type: 'markets',
        target_identifier: 'derivatives'
      },
      {
        key: 'go_to_trade_history',
        label: 'View Derivatives Trade History',
        target_type: 'trade_history',
        target_identifier: 'derivatives'
      },
      {
        key: 'go_to_tools_resources',
        label: 'Open Tools & Resources',
        target_type: 'tools_resources',
        target_identifier: 'derivatives'
      }
    );

    return {
      summary: {
        headline: 'Trade USDT-Margined Perpetual Futures',
        tagline: 'Isolated & cross margin, up to high leverage on major crypto pairs.',
        bulletPoints: [
          'Perpetual futures on BTC, ETH, SOL, and altcoins',
          'Advanced order types with TP/SL and conditional stops',
          'Built-in fee calculator and risk disclosures'
        ]
      },
      featuredContracts: featured,
      shortcuts
    };
  }

  // 2. getMarketsFilterOptions
  getMarketsFilterOptions() {
    return {
      productTypes: [
        { value: 'spot', label: 'Spot' },
        { value: 'derivatives', label: 'Derivatives' }
      ],
      derivativesSubtabs: [
        { value: 'usdt_m_perpetual', label: 'USDT-M Perpetual' }
      ],
      sortOptions: [
        { value: 'symbol', label: 'Symbol' },
        { value: 'last_price', label: 'Last Price' },
        { value: 'volume_24h', label: '24h Volume' },
        { value: 'open_interest', label: 'Open Interest' },
        { value: 'price_change_24h', label: '24h Change %' }
      ],
      baseFilters: {
        supportsAltcoinOnly: true,
        supportsWatchlistOnly: true
      }
    };
  }

  // 3. getDerivativesMarketsTable
  getDerivativesMarketsTable(subtab, filters, sortBy = 'volume_24h', sortDirection = 'desc', page = 1, pageSize = 50) {
    if (subtab !== 'usdt_m_perpetual') {
      return { rows: [], page, pageSize, totalCount: 0 };
    }

    const contracts = this._getFromStorage('derivatives_contracts');
    const statsAll = this._getFromStorage('derivatives_contract_stats');
    const watchlistItems = this._getFromStorage('watchlist_items');
    const watchSet = new Set(watchlistItems.map(w => w.contract_id));

    const latestStatsByContract = {};
    statsAll.forEach(s => {
      const existing = latestStatsByContract[s.contract_id];
      if (!existing) {
        latestStatsByContract[s.contract_id] = s;
      } else {
        const tExisting = existing.updated_at ? Date.parse(existing.updated_at) : 0;
        const tNew = s.updated_at ? Date.parse(s.updated_at) : 0;
        if (tNew > tExisting) latestStatsByContract[s.contract_id] = s;
      }
    });

    let rows = contracts
      .filter(c => c.product_type === 'derivatives' && c.contract_type === 'perpetual' && c.status === 'active')
      .map(contract => ({
        contract,
        stats: latestStatsByContract[contract.id] || null,
        is_favorited: watchSet.has(contract.id)
      }));

    // Apply filters
    if (filters) {
      const { searchQuery, altcoinOnly, watchlistOnly, minOpenInterest, maxLastPrice } = filters;

      if (searchQuery && searchQuery.trim() !== '') {
        const q = searchQuery.trim().toLowerCase();
        rows = rows.filter(row => {
          const c = row.contract;
          return (
            (c.symbol && c.symbol.toLowerCase().includes(q)) ||
            (c.display_name && c.display_name.toLowerCase().includes(q)) ||
            (c.base_asset && c.base_asset.toLowerCase().includes(q)) ||
            (c.quote_asset && c.quote_asset.toLowerCase().includes(q))
          );
        });
      }

      if (altcoinOnly) {
        rows = rows.filter(row => row.contract.is_altcoin === true);
      }

      if (watchlistOnly) {
        rows = rows.filter(row => row.is_favorited);
      }

      if (typeof minOpenInterest === 'number') {
        rows = rows.filter(row => {
          const s = row.stats;
          return s && typeof s.open_interest === 'number' && s.open_interest >= minOpenInterest;
        });
      }

      if (typeof maxLastPrice === 'number') {
        rows = rows.filter(row => {
          const s = row.stats;
          return s && typeof s.last_price === 'number' && s.last_price <= maxLastPrice;
        });
      }
    }

    // Sorting
    rows.sort((a, b) => {
      let av, bv;
      const sa = a.stats || {};
      const sb = b.stats || {};

      if (sortBy === 'symbol') {
        av = a.contract.symbol ? a.contract.symbol.toLowerCase() : '';
        bv = b.contract.symbol ? b.contract.symbol.toLowerCase() : '';
      } else if (sortBy === 'last_price') {
        av = typeof sa.last_price === 'number' ? sa.last_price : 0;
        bv = typeof sb.last_price === 'number' ? sb.last_price : 0;
      } else if (sortBy === 'volume_24h') {
        av = typeof sa.volume_24h === 'number' ? sa.volume_24h : 0;
        bv = typeof sb.volume_24h === 'number' ? sb.volume_24h : 0;
      } else if (sortBy === 'open_interest') {
        av = typeof sa.open_interest === 'number' ? sa.open_interest : 0;
        bv = typeof sb.open_interest === 'number' ? sb.open_interest : 0;
      } else { // price_change_24h
        av = typeof sa.price_change_24h === 'number' ? sa.price_change_24h : 0;
        bv = typeof sb.price_change_24h === 'number' ? sb.price_change_24h : 0;
      }

      if (av < bv) return sortDirection === 'asc' ? -1 : 1;
      if (av > bv) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    const totalCount = rows.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pagedRows = rows.slice(start, end);

    return {
      rows: pagedRows,
      page,
      pageSize,
      totalCount
    };
  }

  // 4. getWatchlistContractsWithStats
  getWatchlistContractsWithStats() {
    const watchlistItems = this._getFromStorage('watchlist_items');
    const contracts = this._getFromStorage('derivatives_contracts');
    const statsAll = this._getFromStorage('derivatives_contract_stats');

    const latestStatsByContract = {};
    statsAll.forEach(s => {
      const existing = latestStatsByContract[s.contract_id];
      if (!existing) {
        latestStatsByContract[s.contract_id] = s;
      } else {
        const tExisting = existing.updated_at ? Date.parse(existing.updated_at) : 0;
        const tNew = s.updated_at ? Date.parse(s.updated_at) : 0;
        if (tNew > tExisting) latestStatsByContract[s.contract_id] = s;
      }
    });

    return watchlistItems.map(item => {
      const contract = contracts.find(c => c.id === item.contract_id) || null;
      const stats = contract ? (latestStatsByContract[contract.id] || null) : null;
      return {
        watchlistItem: item,
        contract,
        stats
      };
    });
  }

  // 5. addContractToWatchlist
  addContractToWatchlist(contractId) {
    const contracts = this._getFromStorage('derivatives_contracts');
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      return {
        watchlistItem: null,
        message: 'Contract not found.'
      };
    }

    const watchlistItems = this._getFromStorage('watchlist_items');
    const existing = watchlistItems.find(w => w.contract_id === contractId);
    if (existing) {
      return {
        watchlistItem: existing,
        message: 'Contract already in watchlist.'
      };
    }

    const newItem = {
      id: this._generateId('watchlist'),
      contract_id: contractId,
      created_at: this._nowIso()
    };

    watchlistItems.push(newItem);
    this._saveToStorage('watchlist_items', watchlistItems);

    return {
      watchlistItem: newItem,
      message: 'Contract added to watchlist.'
    };
  }

  // 6. removeContractFromWatchlist
  removeContractFromWatchlist(contractId) {
    const watchlistItems = this._getFromStorage('watchlist_items');
    const initialLength = watchlistItems.length;
    const filtered = watchlistItems.filter(w => w.contract_id !== contractId);
    this._saveToStorage('watchlist_items', filtered);

    const removed = filtered.length < initialLength;
    return {
      success: removed,
      message: removed ? 'Contract removed from watchlist.' : 'Contract not found in watchlist.'
    };
  }

  // 7. getTradingTerminalState
  getTradingTerminalState() {
    const contract = this._getCurrentContractContext();
    if (!contract) {
      return {
        contract: null,
        stats: null,
        openPosition: null,
        openOrders: [],
        recentUserTrades: [],
        priceAlerts: []
      };
    }

    const stats = this._getLatestStatsForContract(contract.id);

    // Open position for this contract (any side)
    const positions = this._getFromStorage('positions');
    const openPositionRaw = positions.find(p => p.contract_id === contract.id && p.status === 'open') || null;
    const openPosition = openPositionRaw
      ? {
          ...openPositionRaw,
          contract
        }
      : null;

    const openOrders = this.getOpenOrdersForCurrentContract();
    const recentUserTrades = this.getRecentUserTradesForCurrentContract(50);
    const priceAlerts = this.getPriceAlertsForCurrentContract();

    return {
      contract,
      stats,
      openPosition,
      openOrders,
      recentUserTrades,
      priceAlerts
    };
  }

  // 8. getContractChartData
  // Chart data is assumed to be pre-populated elsewhere under key `contract_chart_data_<contractId>`
  getContractChartData(timeframe, limit = 200) {
    const contract = this._getCurrentContractContext();
    if (!contract) return [];

    const key = 'contract_chart_data_' + contract.id + '_' + timeframe;
    let data = this._getFromStorage(key);

    // If no chart data exists yet, synthesize a minimal series from latest stats
    if (!Array.isArray(data) || data.length === 0) {
      const stats = this._getLatestStatsForContract(contract.id);
      if (!stats || typeof stats.last_price !== 'number') {
        return [];
      }

      const basePrice = stats.last_price;
      const now = Date.now();

      // Create a simple single-candle series using last/mark/index prices as rough OHLC
      const candle = {
        timestamp: now,
        open: typeof stats.index_price === 'number' ? stats.index_price : basePrice,
        high: typeof stats.high_24h === 'number' ? stats.high_24h : basePrice,
        low: typeof stats.low_24h === 'number' ? stats.low_24h : basePrice,
        close: basePrice,
        volume: typeof stats.volume_24h === 'number' ? stats.volume_24h : 0
      };

      data = [candle];
      localStorage.setItem(key, JSON.stringify(data));
    }

    return data.slice(-limit);
  }

  // 9. placeDerivativesOrder
  placeDerivativesOrder(
    contractId,
    side,
    positionSide,
    orderType,
    marginMode,
    leverage,
    price,
    stopPrice,
    limitPrice,
    marginAmount,
    quantity,
    reduceOnly,
    takeProfitPrice,
    stopLossPrice,
    timeInForce
  ) {
    const contracts = this._getFromStorage('derivatives_contracts');
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      throw new Error('Contract not found for order.');
    }

    // Update current contract context whenever an order is placed
    localStorage.setItem('current_contract_id', JSON.stringify(contract.id));

    const stats = this._getLatestStatsForContract(contractId);

    const normalizedPositionSide = positionSide || (side === 'buy' ? 'long' : 'short');

    // Determine a price reference for notional/quantity calculations
    let priceForCalc = null;
    if (orderType === 'limit') {
      priceForCalc = typeof price === 'number' ? price : null;
    } else if (orderType === 'market') {
      priceForCalc = stats && typeof stats.last_price === 'number' ? stats.last_price : null;
    } else if (orderType === 'stop_limit') {
      priceForCalc = typeof limitPrice === 'number' ? limitPrice : null;
    }

    const calc = this._calculateOrderNotionalAndQuantity({
      quantity,
      marginAmount,
      leverage,
      price: priceForCalc,
      contract
    });

    const finalQuantity = calc.quantity;
    const finalNotional = calc.notional;

    const now = this._nowIso();
    const orders = this._getFromStorage('orders');
    const positions = this._getFromStorage('positions');

    let status;
    if (orderType === 'market') {
      status = 'filled';
    } else {
      status = 'open';
    }

    const order = {
      id: this._generateId('order'),
      contract_id: contractId,
      position_id: null,
      side,
      position_side: normalizedPositionSide,
      order_type: orderType,
      margin_mode: marginMode || null,
      leverage: typeof leverage === 'number' ? leverage : null,
      price: typeof price === 'number' ? price : null,
      stop_price: typeof stopPrice === 'number' ? stopPrice : null,
      limit_price: typeof limitPrice === 'number' ? limitPrice : null,
      quantity: finalQuantity,
      margin_amount: typeof marginAmount === 'number' ? marginAmount : null,
      notional_value: finalNotional,
      time_in_force: timeInForce || 'gtc',
      reduce_only: !!reduceOnly,
      take_profit_price: typeof takeProfitPrice === 'number' ? takeProfitPrice : null,
      stop_loss_price: typeof stopLossPrice === 'number' ? stopLossPrice : null,
      status,
      created_at: now,
      updated_at: now,
      filled_at: status === 'filled' ? now : null
    };

    let updatedPosition = null;

    if (orderType === 'market') {
      if (reduceOnly) {
        // Reduce-only market order: close or reduce existing position
        const existing = this._findOpenPosition(contractId, normalizedPositionSide);
        if (existing && typeof finalQuantity === 'number' && finalQuantity > 0) {
          const oldQty = existing.quantity;
          const closingQty = Math.min(oldQty, finalQuantity);
          const remainingQty = oldQty - closingQty;

          if (remainingQty <= 0) {
            existing.status = 'closed';
            existing.closed_at = now;
            existing.quantity = 0;
            existing.notional_value = 0;
            existing.margin = 0;
            existing.isolated_margin = 0;
          } else {
            const ratio = remainingQty / oldQty;
            existing.quantity = remainingQty;
            existing.notional_value = existing.notional_value * ratio;
            existing.margin = existing.margin * ratio;
            if (typeof existing.isolated_margin === 'number') {
              existing.isolated_margin = existing.isolated_margin * ratio;
            }
          }

          existing.last_updated_at = now;
          updatedPosition = existing;
          order.position_id = existing.id;

          // Save updated positions
          const idx = positions.findIndex(p => p.id === existing.id);
          if (idx !== -1) {
            positions[idx] = existing;
          }
        }
      } else {
        // Market order that opens/increases a position
        if (typeof finalQuantity === 'number' && finalQuantity > 0 && typeof priceForCalc === 'number' && priceForCalc > 0) {
          let existing = this._findOpenPosition(contractId, normalizedPositionSide);
          const posMarginMode = marginMode || 'cross';
          const posLeverage = typeof leverage === 'number' ? leverage : 1;

          if (!existing) {
            const marginUsed = typeof marginAmount === 'number'
              ? marginAmount
              : (typeof finalNotional === 'number' && posLeverage > 0
                ? finalNotional / posLeverage
                : null);

            existing = {
              id: this._generateId('position'),
              contract_id: contractId,
              side: normalizedPositionSide,
              margin_mode: posMarginMode,
              leverage: posLeverage,
              quantity: finalQuantity,
              notional_value: typeof finalNotional === 'number' ? finalNotional : finalQuantity * priceForCalc,
              entry_price: priceForCalc,
              liquidation_price: null,
              margin: typeof marginUsed === 'number' ? marginUsed : null,
              isolated_margin: posMarginMode === 'isolated' ? marginUsed : null,
              unrealized_pnl: 0,
              realized_pnl: 0,
              status: 'open',
              opened_at: now,
              closed_at: null,
              last_updated_at: now
            };

            positions.push(existing);
          } else {
            const oldQty = existing.quantity;
            const oldNotional = existing.notional_value;
            const newNotional = oldNotional + (typeof finalNotional === 'number' ? finalNotional : finalQuantity * priceForCalc);
            const newQty = oldQty + finalQuantity;
            const newEntryPrice = newQty > 0 ? newNotional / newQty : existing.entry_price;

            existing.quantity = newQty;
            existing.notional_value = newNotional;
            existing.entry_price = newEntryPrice;
            existing.leverage = posLeverage;
            if (typeof marginAmount === 'number') {
              existing.margin = (existing.margin || 0) + marginAmount;
              if (existing.margin_mode === 'isolated') {
                existing.isolated_margin = (existing.isolated_margin || 0) + marginAmount;
              }
            }
            existing.last_updated_at = now;

            const idx = positions.findIndex(p => p.id === existing.id);
            if (idx !== -1) {
              positions[idx] = existing;
            }
          }

          updatedPosition = existing;
          order.position_id = existing.id;
        }
      }
    }

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('positions', positions);

    return {
      order,
      updatedPosition,
      message: 'Order placed successfully.'
    };
  }

  // 10. getOpenPositionsOverview
  getOpenPositionsOverview() {
    const positions = this._getFromStorage('positions');
    const contracts = this._getFromStorage('derivatives_contracts');
    const statsAll = this._getFromStorage('derivatives_contract_stats');

    const latestStatsByContract = {};
    statsAll.forEach(s => {
      const existing = latestStatsByContract[s.contract_id];
      if (!existing) {
        latestStatsByContract[s.contract_id] = s;
      } else {
        const tExisting = existing.updated_at ? Date.parse(existing.updated_at) : 0;
        const tNew = s.updated_at ? Date.parse(s.updated_at) : 0;
        if (tNew > tExisting) latestStatsByContract[s.contract_id] = s;
      }
    });

    return positions
      .filter(p => p.status === 'open')
      .map(p => {
        const contract = contracts.find(c => c.id === p.contract_id) || null;
        const stats = contract ? (latestStatsByContract[contract.id] || null) : null;
        return {
          ...p,
          contract,
          stats
        };
      });
  }

  // 11. updatePositionMarginSettings
  updatePositionMarginSettings(positionId, newMarginMode, newLeverage, isolatedMarginAmount) {
    const positions = this._getFromStorage('positions');
    const idx = positions.findIndex(p => p.id === positionId);
    if (idx === -1) {
      throw new Error('Position not found.');
    }

    const position = positions[idx];
    position.margin_mode = newMarginMode;
    position.leverage = newLeverage;

    if (newMarginMode === 'isolated') {
      if (typeof isolatedMarginAmount === 'number') {
        position.isolated_margin = isolatedMarginAmount;
        position.margin = isolatedMarginAmount;
      } else if (typeof position.margin === 'number') {
        position.isolated_margin = position.margin;
      }
    } else if (newMarginMode === 'cross') {
      position.isolated_margin = null;
    }

    position.last_updated_at = this._nowIso();
    positions[idx] = position;
    this._saveToStorage('positions', positions);

    return {
      position,
      message: 'Position margin settings updated.'
    };
  }

  // 12. getOpenOrdersForCurrentContract
  getOpenOrdersForCurrentContract() {
    const contract = this._getCurrentContractContext();
    if (!contract) return [];

    const orders = this._getFromStorage('orders');
    const positions = this._getFromStorage('positions');

    return orders
      .filter(o =>
        o.contract_id === contract.id &&
        (o.status === 'open' || o.status === 'partially_filled')
      )
      .map(o => {
        const position = o.position_id ? (positions.find(p => p.id === o.position_id) || null) : null;
        return {
          ...o,
          contract,
          position
        };
      });
  }

  // 13. getRecentUserTradesForCurrentContract
  getRecentUserTradesForCurrentContract(limit = 50) {
    const contract = this._getCurrentContractContext();
    if (!contract) return [];

    const entries = this._getFromStorage('trade_history_entries');
    const orders = this._getFromStorage('orders');
    const positions = this._getFromStorage('positions');

    const filtered = entries
      .filter(e => e.contract_id === contract.id && e.product_type === 'derivatives')
      .sort((a, b) => {
        const ta = a.closed_at ? Date.parse(a.closed_at) : 0;
        const tb = b.closed_at ? Date.parse(b.closed_at) : 0;
        return tb - ta;
      })
      .slice(0, limit)
      .map(e => {
        const order = e.order_id ? (orders.find(o => o.id === e.order_id) || null) : null;
        const position = e.position_id ? (positions.find(p => p.id === e.position_id) || null) : null;
        return {
          ...e,
          contract,
          order,
          position
        };
      });

    return filtered;
  }

  // 14. getPriceAlertsForCurrentContract
  getPriceAlertsForCurrentContract() {
    const contract = this._getCurrentContractContext();
    if (!contract) return [];

    const alerts = this._getFromStorage('price_alerts');
    return alerts
      .filter(a => a.contract_id === contract.id)
      .map(a => ({
        ...a,
        contract
      }));
  }

  // 15. createPriceAlert
  createPriceAlert(contractId, basis, operator, thresholdPrice, notificationMethod) {
    const contracts = this._getFromStorage('derivatives_contracts');
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      throw new Error('Contract not found for price alert.');
    }

    const alerts = this._getFromStorage('price_alerts');
    const alert = {
      id: this._generateId('price_alert'),
      contract_id: contractId,
      basis,
      operator,
      threshold_price: thresholdPrice,
      notification_method: notificationMethod,
      is_active: true,
      triggered_at: null,
      created_at: this._nowIso(),
      cancelled_at: null
    };

    alerts.push(alert);
    this._saveToStorage('price_alerts', alerts);

    return {
      priceAlert: alert,
      message: 'Price alert created.'
    };
  }

  // 16. deletePriceAlert
  deletePriceAlert(priceAlertId) {
    const alerts = this._getFromStorage('price_alerts');
    const idx = alerts.findIndex(a => a.id === priceAlertId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Price alert not found.'
      };
    }

    alerts[idx].is_active = false;
    alerts[idx].cancelled_at = this._nowIso();
    this._saveToStorage('price_alerts', alerts);

    return {
      success: true,
      message: 'Price alert deleted.'
    };
  }

  // 17. getToolsAndResourcesList
  getToolsAndResourcesList() {
    const tools = this._getFromStorage('tool_resources');
    // Optional: resolve page relationship by page_filename
    const pages = this._getFromStorage('pages');
    return tools.map(t => {
      const page = t.page_filename ? (pages.find(p => p.filename === t.page_filename) || null) : null;
      return {
        ...t,
        page
      };
    });
  }

  // 18. getFeeCalculatorConfig
  getFeeCalculatorConfig() {
    const contracts = this._getFromStorage('derivatives_contracts');
    const derivativesContracts = contracts.filter(c => c.product_type === 'derivatives' && c.contract_type === 'perpetual' && c.status === 'active');

    return {
      productTypes: [
        { value: 'spot', label: 'Spot' },
        { value: 'derivatives', label: 'Derivatives' }
      ],
      derivativesContracts,
      defaultProductType: 'derivatives'
    };
  }

  // 19. calculateFeeForDerivativesTrade
  calculateFeeForDerivativesTrade(contractId, notionalValue, leverage, orderType) {
    const contracts = this._getFromStorage('derivatives_contracts');
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) {
      throw new Error('Contract not found for fee calculation.');
    }

    const feeRate = this._getApplicableFeeRate(contractId, 'derivatives');
    if (!feeRate) {
      throw new Error('Applicable fee rate not found.');
    }

    let rate;
    if (orderType === 'market_taker') {
      rate = feeRate.taker_fee_rate;
    } else if (orderType === 'limit_maker') {
      rate = feeRate.maker_fee_rate;
    } else {
      throw new Error('Invalid orderType for fee calculation.');
    }

    const estimatedFee = notionalValue * rate;

    const calculations = this._getFromStorage('fee_calculations');
    const feeCalculation = {
      id: this._generateId('fee_calc'),
      contract_id: contractId,
      product_type: 'derivatives',
      notional_value: notionalValue,
      leverage,
      order_type: orderType,
      fee_rate_id: feeRate.id,
      estimated_fee: estimatedFee,
      created_at: this._nowIso()
    };

    calculations.push(feeCalculation);
    this._saveToStorage('fee_calculations', calculations);

    return {
      feeCalculation,
      feeRate,
      contract
    };
  }

  // 20. getTradeHistoryFilterOptions
  getTradeHistoryFilterOptions() {
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      productTypes: [
        { value: 'spot', label: 'Spot' },
        { value: 'derivatives', label: 'Derivatives' }
      ],
      statuses: [
        { value: 'closed', label: 'Closed' },
        { value: 'cancelled', label: 'Cancelled' }
      ],
      defaultDateRange: {
        startDate: start.toISOString(),
        endDate: now.toISOString()
      },
      sortOptions: [
        { value: 'closed_at', label: 'Close Time' },
        { value: 'realized_pnl', label: 'Realized PnL' },
        { value: 'symbol', label: 'Symbol' }
      ]
    };
  }

  // 21. getTradeHistoryEntries
  getTradeHistoryEntries(filters, sortBy = 'closed_at', sortDirection = 'desc', page = 1, pageSize = 50) {
    const entries = this._getFromStorage('trade_history_entries');
    const filteredSorted = this._applyTradeHistoryFilters(entries, filters, sortBy, sortDirection);

    const totalCount = filteredSorted.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageEntries = filteredSorted.slice(start, end);

    // Resolve foreign keys
    const contracts = this._getFromStorage('derivatives_contracts');
    const orders = this._getFromStorage('orders');
    const positions = this._getFromStorage('positions');

    const enriched = pageEntries.map(e => {
      const contract = contracts.find(c => c.id === e.contract_id) || null;
      const order = e.order_id ? (orders.find(o => o.id === e.order_id) || null) : null;
      const position = e.position_id ? (positions.find(p => p.id === e.position_id) || null) : null;
      return {
        ...e,
        contract,
        order,
        position
      };
    });

    return {
      entries: enriched,
      page,
      pageSize,
      totalCount
    };
  }

  // 22. getAboutPageContent
  getAboutPageContent() {
    return {
      overview: {
        title: 'About Our Derivatives Trading Platform',
        body: 'This platform provides USDT-margined perpetual futures on leading cryptocurrencies, with support for isolated and cross margin, configurable leverage, and advanced order types. It is designed to give traders precise control over risk while offering deep liquidity and robust analytics.'
      },
      features: [
        {
          title: 'USDT-Margined Perpetual Contracts',
          description: 'Trade perpetual futures with USDT as margin and settlement currency, including BTC/USDT, ETH/USDT, SOL/USDT, and a range of altcoins.'
        },
        {
          title: 'Advanced Order Types',
          description: 'Use market, limit, and stop-limit orders with attached take-profit and stop-loss, plus reduce-only behavior for precise position management.'
        },
        {
          title: 'Risk Management',
          description: 'Switch between cross and isolated margin, adjust leverage per position, and use price alerts and protective stops to manage downside risk.'
        },
        {
          title: 'Transparent Fees & Funding',
          description: 'View fee tiers, funding intervals, and example scenarios, and estimate trading fees in advance with the Fee Calculator.'
        }
      ],
      references: [
        { key: 'fees_and_funding', label: 'Fees & Funding' },
        { key: 'risk_disclosure', label: 'Risk Disclosure' },
        { key: 'help_center', label: 'Help Center' }
      ]
    };
  }

  // 23. getHelpCenterContent
  getHelpCenterContent() {
    return {
      faqs: [
        {
          id: 'orders_types',
          category: 'orders',
          question: 'What order types are available for derivatives trades?',
          answer: 'You can place market, limit, and stop-limit orders on derivatives contracts. Market orders execute immediately at the best available price. Limit orders execute at your specified price or better. Stop-limit orders trigger a limit order once the stop price is reached, enabling protective stops and breakout entries.'
        },
        {
          id: 'margin_modes',
          category: 'margin_and_leverage',
          question: 'What is the difference between cross and isolated margin?',
          answer: 'In cross margin mode, all available margin in your account can be used to support open positions, sharing risk across contracts. In isolated margin mode, each position has a dedicated margin amount, and liquidation is limited to that position. You can convert positions between cross and isolated and adjust leverage as needed.'
        },
        {
          id: 'markets_usage',
          category: 'markets',
          question: 'How do I use the Markets page to find contracts?',
          answer: 'On the Markets page, select the Derivatives tab and the USDT-M Perpetual sub-tab. Use search to locate specific contracts (e.g., BTC/USDT Perpetual), sort by volume, open interest, or price change, and apply filters such as Altcoin-only or Watchlist-only to narrow results.'
        },
        {
          id: 'alerts_usage',
          category: 'alerts',
          question: 'How do price alerts work?',
          answer: 'Price alerts monitor either the last traded price or mark price for a contract. You can set alerts to trigger when price moves above or below a threshold. When triggered, an in-app notification (and other channels if enabled) will be sent, and the alert may be deactivated automatically.'
        },
        {
          id: 'fees_info',
          category: 'fees',
          question: 'How are derivatives trading fees calculated?',
          answer: 'Derivatives trades incur maker fees for resting limit orders that add liquidity, and taker fees for market or aggressively priced limit orders that remove liquidity. Fees are charged on the notional value of your trade. You can view current fee tiers on the Fees & Funding page or estimate specific trades using the Fee Calculator.'
        }
      ],
      guides: [
        {
          id: 'guide_open_position',
          title: 'Opening and Managing a Perpetual Futures Position',
          body: 'To open a perpetual position, navigate to the trading page for your chosen contract, select margin mode and leverage, then submit a market or limit order. Once your position is open, you can attach take-profit and stop-loss orders, adjust isolated margin, or switch between cross and isolated modes. Monitoring unrealized PnL, margin ratio, and liquidation price is critical for effective risk management.'
        },
        {
          id: 'guide_stop_limit',
          title: 'Using Stop-Limit Orders for Protection',
          body: 'Stop-limit orders allow you to predefine a stop price at which a limit order will be placed. For example, if you hold an ETH perpetual long, you can set a stop price 5% below the current last price and a limit price 6% below to reduce slippage. When the stop price is reached, your sell limit order is submitted and will execute if the market trades at your limit price or better.'
        }
      ],
      references: [
        { key: 'fees_and_funding', label: 'Fees & Funding' },
        { key: 'risk_disclosure', label: 'Risk Disclosure' },
        { key: 'trade_history', label: 'Trade History' }
      ]
    };
  }

  // 24. getFeesAndFundingInfo
  getFeesAndFundingInfo() {
    const feeRates = this._getFromStorage('fee_rates');
    const derivativesFeeRates = feeRates.filter(fr => fr.product_type === 'derivatives' && fr.contract_type === 'perpetual');

    return {
      derivativesFeeRates,
      fundingOverview: {
        description: 'Perpetual futures use a funding mechanism to keep contract prices in line with the underlying index. Funding payments are exchanged periodically between longs and shorts based on the funding rate and your position size.',
        fundingIntervalHours: 8,
        exampleScenarios: [
          {
            title: 'Positive funding rate',
            body: 'If the funding rate is positive, traders who are long the perpetual contract pay funding to traders who are short. For example, with a 0.01% funding rate and a 10,000 USDT notional long position, you would pay 1 USDT at the funding time.'
          },
          {
            title: 'Negative funding rate',
            body: 'If the funding rate is negative, short positions pay funding to long positions. With a -0.02% funding rate and a 20,000 USDT notional short position, you would pay 4 USDT to longs at the funding time.'
          }
        ]
      },
      references: [
        { key: 'fee_calculator', label: 'Fee Calculator' },
        { key: 'risk_disclosure', label: 'Risk Disclosure' },
        { key: 'help_center', label: 'Help Center' }
      ]
    };
  }

  // 25. getRiskDisclosureContent
  getRiskDisclosureContent() {
    return {
      sections: [
        {
          id: 'leverage_risk',
          title: 'Leverage and Margin Risk',
          body: 'Trading leveraged derivatives amplifies both gains and losses. A relatively small move in the underlying asset can result in large percentage changes in your equity. You should carefully select leverage and margin mode, and never risk more than you can afford to lose.'
        },
        {
          id: 'liquidation_mechanics',
          title: 'Liquidation Mechanics',
          body: 'If the margin supporting your position falls below maintenance requirements, your position may be liquidated. In isolated margin mode, only the margin assigned to that position is at risk; in cross margin mode, your entire account balance may be used to prevent liquidation. Liquidation prices are estimates and can change with funding, fees, and market volatility.'
        },
        {
          id: 'market_risk',
          title: 'Market Volatility and Gaps',
          body: 'Cryptocurrency markets can be highly volatile and may experience gaps or sudden price moves. Stop and limit orders do not guarantee execution at a particular price. In fast markets, slippage may cause execution at a worse price than expected, or orders may not execute at all.'
        },
        {
          id: 'best_practices',
          title: 'Risk Management Best Practices',
          body: 'Use conservative leverage, size positions appropriately, and always define your maximum acceptable loss before entering a trade. Consider using isolated margin for speculative trades, placing protective stop orders, and diversifying across instruments. Regularly review your open positions, realized PnL, and exposure.'
        }
      ],
      references: [
        { key: 'help_center', label: 'Help Center' },
        { key: 'fees_and_funding', label: 'Fees & Funding' }
      ]
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
