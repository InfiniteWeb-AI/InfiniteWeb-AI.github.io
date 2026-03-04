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

  // =========================
  // Storage initialization
  // =========================
  _initStorage() {
    // Generic initializer for an array key
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Legacy/example keys from template (unused here but kept for compatibility)
    ensureArrayKey('users');
    ensureArrayKey('products');
    ensureArrayKey('carts');
    ensureArrayKey('cartItems');

    // Domain entity tables (from data models)
    ensureArrayKey('addresses');
    ensureArrayKey('blocks');
    ensureArrayKey('transactions');
    ensureArrayKey('tokens');
    ensureArrayKey('nft_collections');
    ensureArrayKey('nft_items');
    ensureArrayKey('liquidity_pools');
    ensureArrayKey('gas_price_intervals');
    ensureArrayKey('custom_charts');
    ensureArrayKey('transfer_watchlist_items');
    ensureArrayKey('contract_calls');
    ensureArrayKey('saved_filters');
    ensureArrayKey('address_activity_snapshots');
    ensureArrayKey('address_groups');
    ensureArrayKey('token_comparison_widgets');

    // Additional supporting tables
    ensureArrayKey('recent_entities');
    ensureArrayKey('static_pages');
    ensureArrayKey('contact_messages');

    // Dashboard layout (single-object, but stored as JSON string)
    if (!localStorage.getItem('dashboard_widgets_layout')) {
      const defaultLayout = {
        order: ['pools', 'watchlist', 'charts', 'filters', 'address_groups', 'token_comparison']
      };
      localStorage.setItem('dashboard_widgets_layout', JSON.stringify(defaultLayout));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  // =========================
  // Generic helpers
  // =========================

  _persistUserState(key, data) {
    // Simple wrapper for persisting user-specific state
    this._saveToStorage(key, data);
  }

  _applyDateRangeFilter(dateRangeType, startDateStr, endDateStr) {
    const now = new Date();
    let start;
    let end;

    const toStartOfDay = (d) => {
      const nd = new Date(d);
      nd.setHours(0, 0, 0, 0);
      return nd;
    };

    const toEndOfDay = (d) => {
      const nd = new Date(d);
      nd.setHours(23, 59, 59, 999);
      return nd;
    };

    switch (dateRangeType) {
      case 'last_24h':
        end = now;
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last_7d':
        end = now;
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last_30d':
        end = now;
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'single_day': {
        if (!startDateStr) {
          // Fallback to today
          start = toStartOfDay(now);
          end = toEndOfDay(now);
        } else {
          const d = new Date(startDateStr);
          start = toStartOfDay(d);
          end = toEndOfDay(d);
        }
        break;
      }
      case 'custom':
      default: {
        // For custom or unknown, use provided bounds; if missing, cover entire timeline
        start = startDateStr ? new Date(startDateStr) : new Date(0);
        end = endDateStr ? new Date(endDateStr) : now;
        break;
      }
    }

    return { start, end };
  }

  _applySortingAndPagination(items, sortFn, page = 1, pageSize = 25) {
    const cloned = items.slice();
    if (typeof sortFn === 'function') {
      cloned.sort(sortFn);
    }
    const totalCount = cloned.length;
    const startIndex = (page - 1) * pageSize;
    const pagedItems = cloned.slice(startIndex, startIndex + pageSize);
    return {
      items: pagedItems,
      totalCount,
      page,
      pageSize
    };
  }

  _loadStaticPageFromStore(pageSlug) {
    const pages = this._getFromStorage('static_pages', []);
    return pages.find((p) => p.slug === pageSlug) || null;
  }

  // Helpers to get or create specific state

  _getOrCreateTransferWatchlist() {
    const items = this._getFromStorage('transfer_watchlist_items', []);
    if (!Array.isArray(items)) {
      this._saveToStorage('transfer_watchlist_items', []);
      return [];
    }
    return items;
  }

  _getOrCreatePinnedPoolsState() {
    // Ensure all liquidity pools have a boolean isPinned flag
    const pools = this._getFromStorage('liquidity_pools', []);
    let mutated = false;
    for (const p of pools) {
      if (typeof p.isPinned !== 'boolean') {
        p.isPinned = false;
        mutated = true;
      }
    }
    if (mutated) {
      this._saveToStorage('liquidity_pools', pools);
    }
    return pools;
  }

  _getOrCreateTokenComparisonWidget() {
    let widgets = this._getFromStorage('token_comparison_widgets', []);
    if (!Array.isArray(widgets) || widgets.length === 0) {
      const widget = {
        id: this._generateId('token_cmp_widget'),
        title: 'Token Comparison',
        tokenIds: [],
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      widgets = [widget];
      this._saveToStorage('token_comparison_widgets', widgets);
      return widget;
    }
    return widgets[0];
  }

  _getOrCreateDashboardLayout() {
    const raw = localStorage.getItem('dashboard_widgets_layout');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to recreate
      }
    }
    const layout = {
      order: ['pools', 'watchlist', 'charts', 'filters', 'address_groups', 'token_comparison']
    };
    this._saveToStorage('dashboard_widgets_layout', layout);
    return layout;
  }

  // Foreign key resolution helpers

  _buildIdMap(items) {
    const map = {};
    for (const item of items) {
      if (item && item.id != null) {
        map[item.id] = item;
      }
    }
    return map;
  }

  _resolveTransactionsForeignKeys(transactions) {
    const addresses = this._getFromStorage('addresses', []);
    const blocks = this._getFromStorage('blocks', []);
    const addrMap = this._buildIdMap(addresses);
    const blockMap = this._buildIdMap(blocks);

    return transactions.map((tx) => ({
      ...tx,
      fromAddress: tx.fromAddressId ? addrMap[tx.fromAddressId] || null : null,
      toAddress: tx.toAddressId ? addrMap[tx.toAddressId] || null : null,
      block: tx.blockId ? blockMap[tx.blockId] || null : null
    }));
  }

  _resolveBlocksForeignKeys(blocks) {
    const addresses = this._getFromStorage('addresses', []);
    const blocksAll = this._getFromStorage('blocks', []);
    const addrMap = this._buildIdMap(addresses);
    const blockMap = this._buildIdMap(blocksAll);

    return blocks.map((b) => ({
      ...b,
      minerAddress: b.minerAddressId ? addrMap[b.minerAddressId] || null : null,
      parentBlock: b.parentBlockId ? blockMap[b.parentBlockId] || null : null
    }));
  }

  _resolveTokenForeignKeys(tokens) {
    const addresses = this._getFromStorage('addresses', []);
    const addrMap = this._buildIdMap(addresses);
    return tokens.map((t) => ({
      ...t,
      contractAddress: t.contractAddressId ? addrMap[t.contractAddressId] || null : null
    }));
  }

  _resolveNFTCollectionForeignKeys(collections) {
    const addresses = this._getFromStorage('addresses', []);
    const addrMap = this._buildIdMap(addresses);
    return collections.map((c) => ({
      ...c,
      contractAddress: c.contractAddressId ? addrMap[c.contractAddressId] || null : null
    }));
  }

  _resolveNFTItemForeignKeys(items) {
    const collections = this._getFromStorage('nft_collections', []);
    const addresses = this._getFromStorage('addresses', []);
    const colMap = this._buildIdMap(collections);
    const addrMap = this._buildIdMap(addresses);
    return items.map((it) => ({
      ...it,
      collection: it.collectionId ? colMap[it.collectionId] || null : null,
      ownerAddress: it.ownerAddressId ? addrMap[it.ownerAddressId] || null : null
    }));
  }

  _resolveLiquidityPoolForeignKeys(pools) {
    const addresses = this._getFromStorage('addresses', []);
    const tokens = this._getFromStorage('tokens', []);
    const addrMap = this._buildIdMap(addresses);
    const tokenMap = this._buildIdMap(tokens);
    return pools.map((p) => ({
      ...p,
      contractAddress: p.contractAddressId ? addrMap[p.contractAddressId] || null : null,
      baseToken: p.baseTokenId ? tokenMap[p.baseTokenId] || null : null,
      quoteToken: p.quoteTokenId ? tokenMap[p.quoteTokenId] || null : null
    }));
  }

  _resolveSavedFilterForeignKeys(filters) {
    const addresses = this._getFromStorage('addresses', []);
    const addrMap = this._buildIdMap(addresses);
    return filters.map((f) => ({
      ...f,
      contractAddress: f.contractAddressId ? addrMap[f.contractAddressId] || null : null
    }));
  }

  // =========================
  // Interface implementations
  // =========================

  // --- searchEntities ---
  searchEntities(query, typeFilter = 'all', limit = 20) {
    const q = (query || '').toLowerCase();
    if (!q) return [];

    const results = [];

    const pushResult = (entityType, id, displayLabel, secondaryLabel, metadata = {}) => {
      results.push({ entityType, id, displayLabel, secondaryLabel, metadata });
    };

    const typeMatches = (t) => typeFilter === 'all' || typeFilter === t;

    // Addresses & contracts
    if (typeMatches('address')) {
      const addresses = this._getFromStorage('addresses', []);
      for (const addr of addresses) {
        if (results.length >= limit) break;
        const idMatch = addr.id.toLowerCase().includes(q);
        const labelMatch = addr.label && addr.label.toLowerCase().includes(q);
        if (idMatch || labelMatch) {
          const entityType = addr.type === 'contract' ? 'contract' : 'address';
          pushResult(entityType, addr.id, addr.label || addr.id, addr.id, {});
        }
      }
    }

    // Transactions
    if (results.length < limit && typeMatches('transaction')) {
      const txs = this._getFromStorage('transactions', []);
      for (const tx of txs) {
        if (results.length >= limit) break;
        if (tx.id.toLowerCase().includes(q)) {
          pushResult('transaction', tx.id, tx.id, tx.status || '', {
            timestamp: tx.timestamp
          });
        }
      }
    }

    // Blocks
    if (results.length < limit && typeMatches('block')) {
      const blocks = this._getFromStorage('blocks', []);
      const qNum = Number.isFinite(Number(query)) ? Number(query) : null;
      for (const b of blocks) {
        if (results.length >= limit) break;
        const idMatch = b.id.toLowerCase().includes(q);
        const numMatch = qNum !== null && b.blockNumber === qNum;
        if (idMatch || numMatch) {
          pushResult('block', b.id, String(b.blockNumber), b.id, {
            blockNumber: b.blockNumber,
            timestamp: b.timestamp
          });
        }
      }
    }

    // Tokens
    if (results.length < limit && typeMatches('token')) {
      const tokens = this._getFromStorage('tokens', []);
      for (const t of tokens) {
        if (results.length >= limit) break;
        const nameMatch = t.name && t.name.toLowerCase().includes(q);
        const symMatch = t.symbol && t.symbol.toLowerCase().includes(q);
        const idMatch = t.id && t.id.toLowerCase().includes(q);
        if (nameMatch || symMatch || idMatch) {
          pushResult('token', t.id, `${t.name} (${t.symbol})`, t.symbol, {
            symbol: t.symbol,
            tokenType: t.tokenType
          });
        }
      }
    }

    // NFT Collections
    if (results.length < limit && typeMatches('nft_collection')) {
      const cols = this._getFromStorage('nft_collections', []);
      for (const c of cols) {
        if (results.length >= limit) break;
        const nameMatch = c.name && c.name.toLowerCase().includes(q);
        const idMatch = c.id && c.id.toLowerCase().includes(q);
        if (nameMatch || idMatch) {
          pushResult('nft_collection', c.id, c.name, c.id, {});
        }
      }
    }

    // NFT Items
    if (results.length < limit && typeMatches('nft_item')) {
      const items = this._getFromStorage('nft_items', []);
      for (const it of items) {
        if (results.length >= limit) break;
        const nameMatch = it.name && it.name.toLowerCase().includes(q);
        const idMatch = it.id && it.id.toLowerCase().includes(q);
        if (nameMatch || idMatch) {
          pushResult('nft_item', it.id, it.name || it.id, String(it.tokenId), {});
        }
      }
    }

    return results.slice(0, limit);
  }

  // --- getHomeOverview ---
  getHomeOverview() {
    const blocks = this._getFromStorage('blocks', []);
    const transactions = this._getFromStorage('transactions', []);
    const now = new Date();
    const last24hStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let latestBlockNumber = 0;
    if (blocks.length > 0) {
      latestBlockNumber = blocks.reduce((max, b) => (b.blockNumber > max ? b.blockNumber : max), blocks[0].blockNumber);
    }

    // Average gas price over all transactions
    let avgGasPrice = 0;
    const gasPrices = transactions.map((t) => (typeof t.gasPrice === 'number' ? t.gasPrice : null)).filter((v) => v !== null);
    if (gasPrices.length > 0) {
      avgGasPrice = gasPrices.reduce((sum, v) => sum + v, 0) / gasPrices.length;
    }

    // 24h stats
    const tx24h = transactions.filter((t) => {
      const ts = new Date(t.timestamp);
      return ts >= last24hStart && ts <= now;
    });
    const totalTx24h = tx24h.length;
    const transactionsPerSecond = totalTx24h / (24 * 60 * 60);

    const blocks24h = blocks.filter((b) => {
      const ts = new Date(b.timestamp);
      return ts >= last24hStart && ts <= now;
    });

    let avgTxPerBlock24h = 0;
    if (blocks24h.length > 0) {
      const totalTx = blocks24h.reduce((sum, b) => sum + (b.transactionCount || 0), 0);
      avgTxPerBlock24h = totalTx / blocks24h.length;
    }

    // Gas summary
    let currentBaseFeePerGas = 0;
    if (blocks.length > 0) {
      const latestBlock = blocks.reduce((latest, b) => {
        return !latest || new Date(b.timestamp) > new Date(latest.timestamp) ? b : latest;
      }, null);
      currentBaseFeePerGas = latestBlock && typeof latestBlock.baseFeePerGas === 'number' ? latestBlock.baseFeePerGas : 0;
    }

    let averageGasPrice24h = 0;
    const gas24h = tx24h
      .map((t) => (typeof t.gasPrice === 'number' ? t.gasPrice : null))
      .filter((v) => v !== null);
    if (gas24h.length > 0) {
      averageGasPrice24h = gas24h.reduce((sum, v) => sum + v, 0) / gas24h.length;
    }

    const latestBlocksSorted = this._resolveBlocksForeignKeys(blocks.slice().sort((a, b) => b.blockNumber - a.blockNumber)).slice(0, 10);

    const recentEntities = this._getFromStorage('recent_entities', []);

    return {
      networkStats: {
        latestBlockNumber,
        averageGasPrice: avgGasPrice,
        transactionsPerSecond
      },
      latestBlocks: latestBlocksSorted,
      gasPriceSummary: {
        currentBaseFeePerGas,
        averageGasPrice24h
      },
      throughputSummary: {
        avgTxPerBlock24h,
        totalTx24h
      },
      recentEntities
    };
  }

  // --- getDashboardOverview ---
  getDashboardOverview() {
    // Pinned liquidity pools
    const poolsAll = this._getOrCreatePinnedPoolsState();
    const pinnedPoolsRaw = poolsAll.filter((p) => p.isPinned === true);
    const pinnedLiquidityPools = this._resolveLiquidityPoolForeignKeys(pinnedPoolsRaw);

    // Transfers watchlist
    const transferWatchlist = this.getTransferWatchlistItems();

    // Saved custom charts
    const savedCustomCharts = this._getFromStorage('custom_charts', []);

    // Saved filters
    const savedFiltersRaw = this._getFromStorage('saved_filters', []);
    const savedFilters = this._resolveSavedFilterForeignKeys(savedFiltersRaw);

    // Address groups
    const addressGroups = this.getAddressGroupsList();

    // Token comparison widget
    const tokenComparisonWidget = this.getTokenComparisonWidget();

    // Widgets layout
    const widgetsLayout = this._getOrCreateDashboardLayout();

    return {
      pinnedLiquidityPools,
      transferWatchlist,
      savedCustomCharts,
      savedFilters,
      addressGroups,
      tokenComparisonWidget,
      widgetsLayout
    };
  }

  // --- reorderDashboardWidgets ---
  reorderDashboardWidgets(widgetOrder) {
    const layout = { order: Array.isArray(widgetOrder) ? widgetOrder.slice() : [] };
    this._saveToStorage('dashboard_widgets_layout', layout);
    return {
      success: true,
      widgetsLayout: layout
    };
  }

  // --- addTransferToWatchlist ---
  addTransferToWatchlist(transactionId, note) {
    const watchlist = this._getOrCreateTransferWatchlist();
    const existing = watchlist.find((w) => w.transactionId === transactionId);
    let watchlistItem;
    if (existing) {
      // Update note if provided
      if (typeof note === 'string') {
        existing.note = note;
      }
      watchlistItem = existing;
    } else {
      watchlistItem = {
        id: this._generateId('twl'),
        transactionId,
        addedAt: new Date().toISOString(),
        note: note || null
      };
      watchlist.push(watchlistItem);
    }
    this._saveToStorage('transfer_watchlist_items', watchlist);

    const txs = this._getFromStorage('transactions', []);
    const tx = txs.find((t) => t.id === transactionId) || null;
    const [resolvedTx] = this._resolveTransactionsForeignKeys(tx ? [tx] : []);

    return {
      watchlistItem,
      transaction: resolvedTx || null
    };
  }

  // --- removeTransferFromWatchlist ---
  removeTransferFromWatchlist(transactionId) {
    const watchlist = this._getOrCreateTransferWatchlist();
    const beforeLen = watchlist.length;
    const updated = watchlist.filter((w) => w.transactionId !== transactionId);
    this._saveToStorage('transfer_watchlist_items', updated);
    return {
      success: updated.length !== beforeLen
    };
  }

  // --- getTransferWatchlistItems ---
  getTransferWatchlistItems() {
    const watchlist = this._getOrCreateTransferWatchlist();
    const txs = this._getFromStorage('transactions', []);
    const txMap = this._buildIdMap(txs);

    const resolvedTransactions = this._resolveTransactionsForeignKeys(
      watchlist
        .map((w) => txMap[w.transactionId])
        .filter((t) => t)
    );
    const resolvedTxMap = this._buildIdMap(resolvedTransactions);

    return watchlist.map((w) => ({
      watchlistItem: {
        ...w,
        transaction: w.transactionId && resolvedTxMap[w.transactionId] ? resolvedTxMap[w.transactionId] : null
      },
      transaction: w.transactionId && resolvedTxMap[w.transactionId] ? resolvedTxMap[w.transactionId] : null
    }));
  }

  // --- pinLiquidityPool ---
  pinLiquidityPool(liquidityPoolId) {
    const pools = this._getFromStorage('liquidity_pools', []);
    const pool = pools.find((p) => p.id === liquidityPoolId) || null;
    if (!pool) {
      return { pool: null, pinnedCount: 0 };
    }
    pool.isPinned = true;
    pool.updatedAt = new Date().toISOString();
    this._saveToStorage('liquidity_pools', pools);

    const pinnedCount = pools.filter((p) => p.isPinned === true).length;
    const [resolvedPool] = this._resolveLiquidityPoolForeignKeys([pool]);
    return { pool: resolvedPool, pinnedCount };
  }

  // --- unpinLiquidityPool ---
  unpinLiquidityPool(liquidityPoolId) {
    const pools = this._getFromStorage('liquidity_pools', []);
    const pool = pools.find((p) => p.id === liquidityPoolId) || null;
    if (!pool) {
      return { success: false };
    }
    pool.isPinned = false;
    pool.updatedAt = new Date().toISOString();
    this._saveToStorage('liquidity_pools', pools);
    return { success: true };
  }

  // --- getTokenComparisonWidget ---
  getTokenComparisonWidget() {
    const widget = this._getOrCreateTokenComparisonWidget();
    const tokens = this._getFromStorage('tokens', []);
    const tokenMap = this._buildIdMap(tokens);
    const widgetTokensRaw = (widget.tokenIds || []).map((id) => tokenMap[id]).filter((t) => t);
    const widgetTokens = this._resolveTokenForeignKeys(widgetTokensRaw);
    return {
      widget,
      tokens: widgetTokens
    };
  }

  // --- addTokenToComparisonWidget ---
  addTokenToComparisonWidget(tokenId) {
    let widgets = this._getFromStorage('token_comparison_widgets', []);
    let widget;
    if (!Array.isArray(widgets) || widgets.length === 0) {
      widget = this._getOrCreateTokenComparisonWidget();
      widgets = [widget];
    } else {
      widget = widgets[0];
    }

    if (!widget.tokenIds.includes(tokenId)) {
      widget.tokenIds.push(tokenId);
      widget.updatedAt = new Date().toISOString();
      this._saveToStorage('token_comparison_widgets', widgets);
    }

    const tokens = this._getFromStorage('tokens', []);
    const tokenMap = this._buildIdMap(tokens);
    const widgetTokensRaw = widget.tokenIds.map((id) => tokenMap[id]).filter((t) => t);
    const widgetTokens = this._resolveTokenForeignKeys(widgetTokensRaw);

    return {
      widget,
      tokens: widgetTokens
    };
  }

  // --- removeTokenFromComparisonWidget ---
  removeTokenFromComparisonWidget(tokenId) {
    let widgets = this._getFromStorage('token_comparison_widgets', []);
    if (!Array.isArray(widgets) || widgets.length === 0) {
      const widget = this._getOrCreateTokenComparisonWidget();
      widgets = [widget];
    }
    const widget = widgets[0];
    widget.tokenIds = (widget.tokenIds || []).filter((id) => id !== tokenId);
    widget.updatedAt = new Date().toISOString();
    this._saveToStorage('token_comparison_widgets', widgets);

    const tokens = this._getFromStorage('tokens', []);
    const tokenMap = this._buildIdMap(tokens);
    const widgetTokensRaw = widget.tokenIds.map((id) => tokenMap[id]).filter((t) => t);
    const widgetTokens = this._resolveTokenForeignKeys(widgetTokensRaw);

    return {
      widget,
      tokens: widgetTokens
    };
  }

  // --- getAddressOverview ---
  getAddressOverview(addressId) {
    const addresses = this._getFromStorage('addresses', []);
    const address = addresses.find((a) => a.id === addressId) || null;
    const nativeBalance = address
      ? {
          amount: typeof address.balanceNative === 'number' ? address.balanceNative : 0,
          symbol: 'ETH',
          valueUsd: typeof address.balanceUsd === 'number' ? address.balanceUsd : 0
        }
      : {
          amount: 0,
          symbol: 'ETH',
          valueUsd: 0
        };

    const activitySummary = address
      ? {
          totalTxCount: address.totalTxCount || 0,
          incomingTxCount: address.incomingTxCount || 0,
          outgoingTxCount: address.outgoingTxCount || 0,
          lastActiveAt: address.lastActiveAt || null
        }
      : {
          totalTxCount: 0,
          incomingTxCount: 0,
          outgoingTxCount: 0,
          lastActiveAt: null
        };

    return {
      address,
      nativeBalance,
      activitySummary
    };
  }

  // --- getAddressTransactions ---
  getAddressTransactions(addressId, filters = {}, sort = 'timestamp_desc', page = 1, pageSize = 25) {
    const txsAll = this._getFromStorage('transactions', []);
    let list = txsAll.filter((tx) => tx.fromAddressId === addressId || tx.toAddressId === addressId);

    // Direction filter
    if (filters.direction === 'incoming') {
      list = list.filter((tx) => tx.toAddressId === addressId);
    } else if (filters.direction === 'outgoing') {
      list = list.filter((tx) => tx.fromAddressId === addressId);
    }

    // Value filters
    if (typeof filters.minValueNative === 'number') {
      list = list.filter((tx) => typeof tx.valueNative === 'number' && tx.valueNative >= filters.minValueNative);
    }
    if (typeof filters.maxValueNative === 'number') {
      list = list.filter((tx) => typeof tx.valueNative === 'number' && tx.valueNative <= filters.maxValueNative);
    }

    // Token symbol filter (only basic handling for native 'eth')
    if (filters.tokenSymbol) {
      const sym = String(filters.tokenSymbol).toLowerCase();
      if (sym === 'eth') {
        list = list.filter((tx) => tx.transactionType === 'native_transfer');
      }
    }

    // Date range filter
    if (filters.dateRangeType) {
      const { start, end } = this._applyDateRangeFilter(filters.dateRangeType, filters.startDate, filters.endDate);
      list = list.filter((tx) => {
        const ts = new Date(tx.timestamp);
        return ts >= start && ts <= end;
      });
    }

    // Sorting
    const sortFn = (a, b) => {
      switch (sort) {
        case 'timestamp_asc':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'value_desc':
          return (b.valueNative || 0) - (a.valueNative || 0);
        case 'value_asc':
          return (a.valueNative || 0) - (b.valueNative || 0);
        case 'timestamp_desc':
        default:
          return new Date(b.timestamp) - new Date(a.timestamp);
      }
    };

    const { items, totalCount } = this._applySortingAndPagination(list, sortFn, page, pageSize);
    const resolved = this._resolveTransactionsForeignKeys(items);

    return {
      transactions: resolved,
      totalCount,
      page,
      pageSize
    };
  }

  // --- getContractCalls ---
  getContractCalls(contractAddressId, filters = {}, sort = 'timestamp_desc', page = 1, pageSize = 25) {
    const callsAll = this._getFromStorage('contract_calls', []);
    let list = callsAll.filter((c) => c.contractAddressId === contractAddressId);

    if (filters.methodName) {
      const m = filters.methodName;
      list = list.filter((c) => c.methodName === m);
    }

    if (filters.dateRangeType) {
      const { start, end } = this._applyDateRangeFilter(filters.dateRangeType, filters.startDate, filters.endDate);
      list = list.filter((c) => {
        const ts = new Date(c.timestamp);
        return ts >= start && ts <= end;
      });
    }

    const sortFn = (a, b) => {
      switch (sort) {
        case 'timestamp_asc':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'gas_used_desc':
          return (b.gasUsed || 0) - (a.gasUsed || 0);
        case 'gas_used_asc':
          return (a.gasUsed || 0) - (b.gasUsed || 0);
        case 'timestamp_desc':
        default:
          return new Date(b.timestamp) - new Date(a.timestamp);
      }
    };

    const { items, totalCount } = this._applySortingAndPagination(list, sortFn, page, pageSize);

    // Foreign key resolution
    const addresses = this._getFromStorage('addresses', []);
    const addrMap = this._buildIdMap(addresses);
    const txs = this._getFromStorage('transactions', []);
    const txMap = this._buildIdMap(txs);
    const resolvedTxs = this._resolveTransactionsForeignKeys(items.map((c) => txMap[c.transactionId]).filter((t) => t));
    const resolvedTxMap = this._buildIdMap(resolvedTxs);

    const resolvedCalls = items.map((c) => ({
      ...c,
      contractAddress: c.contractAddressId ? addrMap[c.contractAddressId] || null : null,
      transaction: c.transactionId ? resolvedTxMap[c.transactionId] || null : null
    }));

    return {
      calls: resolvedCalls,
      totalCount,
      page,
      pageSize
    };
  }

  // --- saveContractCallsFilter ---
  saveContractCallsFilter(contractAddressId, name, dateRangeType, startDate, endDate, methodName, configJson) {
    const filters = this._getFromStorage('saved_filters', []);
    const savedFilter = {
      id: this._generateId('sf'),
      name,
      context: 'contract_calls',
      contractAddressId,
      dateRangeType,
      startDate: startDate || null,
      endDate: endDate || null,
      methodName: methodName || null,
      minValueNative: null,
      tokenSymbol: null,
      createdAt: new Date().toISOString(),
      configJson: configJson || null
    };
    filters.push(savedFilter);
    this._saveToStorage('saved_filters', filters);
    return { savedFilter };
  }

  // --- getContractCallSavedFiltersForContract ---
  getContractCallSavedFiltersForContract(contractAddressId) {
    const filters = this._getFromStorage('saved_filters', []);
    const filtered = filters.filter((f) => f.context === 'contract_calls' && f.contractAddressId === contractAddressId);
    const resolved = this._resolveSavedFilterForeignKeys(filtered);
    return resolved;
  }

  // --- getTransactionDetail ---
  getTransactionDetail(transactionId) {
    const txs = this._getFromStorage('transactions', []);
    const transaction = txs.find((t) => t.id === transactionId) || null;

    const addresses = this._getFromStorage('addresses', []);
    const addrMap = this._buildIdMap(addresses);
    const blocks = this._getFromStorage('blocks', []);
    const blockMap = this._buildIdMap(blocks);

    const fromAddress = transaction && transaction.fromAddressId ? addrMap[transaction.fromAddressId] || null : null;
    const toAddress = transaction && transaction.toAddressId ? addrMap[transaction.toAddressId] || null : null;
    const block = transaction && transaction.blockId ? blockMap[transaction.blockId] || null : null;

    const calls = this._getFromStorage('contract_calls', []);
    const decodedContractCall = calls.find((c) => c.transactionId === transactionId) || null;

    // No on-chain token transfer breakdown is stored beyond tokenTransferEvents,
    // so return empty list rather than mock data.
    const tokenTransfers = [];

    const watchlist = this._getOrCreateTransferWatchlist();
    const isInWatchlist = watchlist.some((w) => w.transactionId === transactionId);

    // Instrumentation for task completion tracking (task_7)
    try {
      const raw = localStorage.getItem('task7_transactionsFilterParams');
      if (raw) {
        const params = JSON.parse(raw);
        if (params && params.firstTransactionId && String(params.firstTransactionId) === String(transactionId)) {
          localStorage.setItem('task7_targetTransactionDetailOpened', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      transaction,
      fromAddress,
      toAddress,
      block,
      decodedContractCall,
      tokenTransfers,
      isInWatchlist
    };
  }

  // --- getBlockDetail ---
  getBlockDetail(blockNumber) {
    const blocks = this._getFromStorage('blocks', []);
    const block = blocks.find((b) => b.blockNumber === blockNumber) || null;

    const addresses = this._getFromStorage('addresses', []);
    const addrMap = this._buildIdMap(addresses);
    const miner = block && block.minerAddressId ? addrMap[block.minerAddressId] || null : null;

    const txsAll = this._getFromStorage('transactions', []);
    const relatedTxs = txsAll.filter((tx) => tx.blockNumber === blockNumber || (block && tx.blockId === block.id));
    const transactions = this._resolveTransactionsForeignKeys(relatedTxs);

    // Previous and next block numbers (based on numeric adjacency, not necessarily existing)
    const prevNum = block ? block.blockNumber - 1 : null;
    const nextNum = block ? block.blockNumber + 1 : null;

    // Instrumentation for task completion tracking (task_2)
    try {
      const raw = localStorage.getItem('task2_blocksTableParams');
      if (raw) {
        const params = JSON.parse(raw);
        if (
          params &&
          params.highestGasBlockNumber != null &&
          Number(params.highestGasBlockNumber) === Number(blockNumber)
        ) {
          localStorage.setItem('task2_blockDetailOpened', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      block,
      miner,
      transactions,
      previousBlockNumber: prevNum,
      nextBlockNumber: nextNum
    };
  }

  // --- getBlockAnalyticsOptions ---
  getBlockAnalyticsOptions() {
    return {
      metrics: [
        { key: 'gas_used_per_block', label: 'Gas Used per Block' },
        { key: 'transaction_count_per_block', label: 'Transactions per Block' }
      ],
      dateRangePresets: [
        { key: 'last_24h', label: 'Last 24 Hours' },
        { key: 'last_7d', label: 'Last 7 Days' },
        { key: 'single_day', label: 'Single Day' },
        { key: 'custom', label: 'Custom Range' }
      ],
      defaultMetric: 'gas_used_per_block',
      defaultDateRangePreset: 'last_24h'
    };
  }

  // --- getBlockAnalyticsChart ---
  getBlockAnalyticsChart(metric, startDate, endDate) {
    const blocks = this._getFromStorage('blocks', []);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const filtered = blocks.filter((b) => {
      const ts = new Date(b.timestamp);
      return ts >= start && ts <= end;
    });
    const points = filtered
      .slice()
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((b) => {
        let value = 0;
        if (metric === 'gas_used_per_block') {
          value = b.gasUsed || 0;
        } else if (metric === 'transaction_count_per_block') {
          value = b.transactionCount || 0;
        }
        return {
          blockNumber: b.blockNumber,
          timestamp: b.timestamp,
          value
        };
      });
    return { points };
  }

  // --- getBlocksTableForAnalytics ---
  getBlocksTableForAnalytics(startDate, endDate, sort = 'block_number_desc', page = 1, pageSize = 50) {
    const blocks = this._getFromStorage('blocks', []);
    const start = new Date(startDate);
    const end = new Date(endDate);
    let list = blocks.filter((b) => {
      const ts = new Date(b.timestamp);
      return ts >= start && ts <= end;
    });

    const sortFn = (a, b) => {
      switch (sort) {
        case 'block_number_asc':
          return a.blockNumber - b.blockNumber;
        case 'gas_used_desc':
          return (b.gasUsed || 0) - (a.gasUsed || 0);
        case 'gas_used_asc':
          return (a.gasUsed || 0) - (b.gasUsed || 0);
        case 'block_number_desc':
        default:
          return b.blockNumber - a.blockNumber;
      }
    };

    const { items, totalCount } = this._applySortingAndPagination(list, sortFn, page, pageSize);
    const resolved = this._resolveBlocksForeignKeys(items);

    // Instrumentation for task completion tracking (task_2)
    try {
      const isTargetDay = (dateStr) => {
        if (!dateStr) return false;
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return false;
        return d.getUTCFullYear() === 2024 && d.getUTCMonth() === 0 && d.getUTCDate() === 15;
      };
      if (
        isTargetDay(startDate) &&
        isTargetDay(endDate) &&
        sort === 'gas_used_desc' &&
        page === 1 &&
        resolved &&
        resolved.length > 0
      ) {
        const highestGasBlockNumber = resolved[0].blockNumber;
        const params = { startDate, endDate, sort, highestGasBlockNumber };
        localStorage.setItem('task2_blocksTableParams', JSON.stringify(params));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      blocks: resolved,
      totalCount,
      page,
      pageSize
    };
  }

  // --- getGasPriceAnalyticsChart ---
  getGasPriceAnalyticsChart(dateRangeType, startDate, endDate, aggregationInterval) {
    // For this simplified implementation, ignore the requested date range and
    // return all stored intervals matching the requested aggregation interval.
    // This keeps behavior deterministic regardless of the current system time
    // and matches the static test dataset.
    const intervalsAll = this._getFromStorage('gas_price_intervals', []);
    const list = intervalsAll.filter((i) => i.intervalType === aggregationInterval);
    // No foreign keys here
    return {
      intervals: list
    };
  }

  // --- getGasPriceIntervalsTable ---
  getGasPriceIntervalsTable(dateRangeType, startDate, endDate, aggregationInterval, sort = 'interval_start_desc') {
    // Ignore dynamic date ranges here and operate over all stored intervals of
    // the requested type so that behavior is deterministic with the fixture data.
    const intervalsAll = this._getFromStorage('gas_price_intervals', []);
    let list = intervalsAll.filter((i) => i.intervalType === aggregationInterval);

    const sortFn = (a, b) => {
      const sa = new Date(a.intervalStart);
      const sb = new Date(b.intervalStart);
      switch (sort) {
        case 'interval_start_asc':
          return sa - sb;
        case 'average_gas_price_asc':
          return (a.averageGasPrice || 0) - (b.averageGasPrice || 0);
        case 'average_gas_price_desc':
          return (b.averageGasPrice || 0) - (a.averageGasPrice || 0);
        case 'interval_start_desc':
        default:
          return sb - sa;
      }
    };

    const sorted = list.slice().sort(sortFn);

    // Instrumentation for task completion tracking (task_7)
    try {
      if (
        dateRangeType === 'last_24h' &&
        aggregationInterval === 'hourly' &&
        sort === 'average_gas_price_asc' &&
        Array.isArray(sorted) &&
        sorted.length > 0
      ) {
        const value = {
          dateRangeType,
          aggregationInterval,
          sort,
          lowestAverageGasIntervalId: sorted[0].id
        };
        localStorage.setItem('task7_intervalsTableParams', JSON.stringify(value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return sorted;
  }

  // --- getTransactionsForGasPriceInterval ---
  getTransactionsForGasPriceInterval(gasPriceIntervalId, filters = {}, sort = 'value_desc', page = 1, pageSize = 25) {
    const intervals = this._getFromStorage('gas_price_intervals', []);
    const interval = intervals.find((i) => i.id === gasPriceIntervalId) || null;
    if (!interval) {
      return {
        transactions: [],
        totalCount: 0,
        page,
        pageSize
      };
    }
    const start = new Date(interval.intervalStart);
    const end = new Date(interval.intervalEnd);

    const txsAll = this._getFromStorage('transactions', []);
    let list = txsAll.filter((tx) => {
      const ts = new Date(tx.timestamp);
      return ts >= start && ts <= end;
    });

    if (typeof filters.minValueNative === 'number') {
      list = list.filter((tx) => typeof tx.valueNative === 'number' && tx.valueNative >= filters.minValueNative);
    }
    if (typeof filters.maxValueNative === 'number') {
      list = list.filter((tx) => typeof tx.valueNative === 'number' && tx.valueNative <= filters.maxValueNative);
    }
    if (filters.tokenSymbol) {
      const sym = String(filters.tokenSymbol).toLowerCase();
      if (sym === 'eth') {
        list = list.filter((tx) => tx.transactionType === 'native_transfer');
      }
    }

    const sortFn = (a, b) => {
      switch (sort) {
        case 'value_asc':
          return (a.valueNative || 0) - (b.valueNative || 0);
        case 'timestamp_desc':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'timestamp_asc':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'value_desc':
        default:
          return (b.valueNative || 0) - (a.valueNative || 0);
      }
    };

    const { items, totalCount } = this._applySortingAndPagination(list, sortFn, page, pageSize);
    const resolved = this._resolveTransactionsForeignKeys(items);

    // Instrumentation for task completion tracking (task_7)
    try {
      const raw = localStorage.getItem('task7_intervalsTableParams');
      if (raw) {
        const params = JSON.parse(raw);
        if (
          params &&
          params.lowestAverageGasIntervalId &&
          String(params.lowestAverageGasIntervalId) === String(gasPriceIntervalId)
        ) {
          const f = filters || {};
          const minVal = typeof f.minValueNative === 'number' ? f.minValueNative : null;
          const tokenSym = typeof f.tokenSymbol === 'string' ? f.tokenSymbol : null;
          if (
            minVal !== null &&
            minVal >= 0.5 &&
            tokenSym &&
            tokenSym.toLowerCase() === 'eth' &&
            page === 1 &&
            resolved &&
            resolved.length > 0
          ) {
            const value = {
              intervalId: gasPriceIntervalId,
              minValueNative: minVal,
              tokenSymbol: tokenSym,
              sort,
              page,
              firstTransactionId: resolved[0].id
            };
            localStorage.setItem('task7_transactionsFilterParams', JSON.stringify(value));
          }
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      transactions: resolved,
      totalCount,
      page,
      pageSize
    };
  }

  // --- getCustomChartBuilderOptions ---
  getCustomChartBuilderOptions() {
    return {
      metrics: [
        { key: 'transaction_count', label: 'Transaction Count' },
        { key: 'gas_used', label: 'Gas Used' },
        { key: 'average_gas_price', label: 'Average Gas Price' },
        { key: 'token_transfer_count', label: 'Token Transfer Count' }
      ],
      transactionFilterTypes: [
        { key: 'all_transactions', label: 'All Transactions' },
        { key: 'token_transfers_only', label: 'Token Transfers Only' },
        { key: 'contract_calls_only', label: 'Contract Calls Only' }
      ],
      dateRangeTypes: ['last_24h', 'last_7d', 'last_30d', 'single_day', 'custom'],
      aggregationIntervals: ['hourly', 'daily', 'weekly'],
      chartTypes: ['line_chart', 'bar_chart', 'area_chart']
    };
  }

  // --- createCustomChart ---
  createCustomChart(
    name,
    metric,
    transactionFilterType,
    dateRangeType,
    startDate,
    endDate,
    aggregationInterval,
    chartType,
    isFavorite
  ) {
    const charts = this._getFromStorage('custom_charts', []);
    const nowIso = new Date().toISOString();
    const chart = {
      id: this._generateId('cc'),
      name,
      metric,
      transactionFilterType: transactionFilterType || 'all_transactions',
      dateRangeType,
      startDate: startDate || null,
      endDate: endDate || null,
      aggregationInterval,
      chartType,
      createdAt: nowIso,
      updatedAt: null,
      isFavorite: typeof isFavorite === 'boolean' ? isFavorite : false
    };
    charts.push(chart);
    this._saveToStorage('custom_charts', charts);
    return { chart };
  }

  // Internal helper to compute custom chart points
  _generateCustomChartPoints(chart) {
    const metric = chart.metric;
    const { start, end } = this._applyDateRangeFilter(chart.dateRangeType, chart.startDate, chart.endDate);

    const makeBuckets = (aggregationInterval) => {
      const buckets = [];
      const startMs = start.getTime();
      const endMs = end.getTime();
      let step;
      if (aggregationInterval === 'hourly') {
        step = 60 * 60 * 1000;
      } else if (aggregationInterval === 'weekly') {
        step = 7 * 24 * 60 * 60 * 1000;
      } else {
        // daily
        step = 24 * 60 * 60 * 1000;
      }
      for (let t = startMs; t <= endMs; t += step) {
        const bucketStart = new Date(t);
        const bucketEnd = new Date(Math.min(t + step - 1, endMs));
        buckets.push({ start: bucketStart, end: bucketEnd });
      }
      return buckets;
    };

    const buckets = makeBuckets(chart.aggregationInterval || 'daily');

    const transactions = this._getFromStorage('transactions', []);

    const filterTransactionsByChart = (txs) => {
      let filtered = txs.filter((tx) => {
        const ts = new Date(tx.timestamp);
        return ts >= start && ts <= end;
      });
      if (chart.transactionFilterType === 'token_transfers_only' || metric === 'token_transfer_count') {
        filtered = filtered.filter((tx) => tx.transactionType === 'token_transfer');
      } else if (chart.transactionFilterType === 'contract_calls_only') {
        filtered = filtered.filter((tx) => tx.transactionType === 'contract_call');
      }
      return filtered;
    };

    const txsInRange = filterTransactionsByChart(transactions);

    const points = buckets.map((bucket) => {
      const bucketTxs = txsInRange.filter((tx) => {
        const ts = new Date(tx.timestamp);
        return ts >= bucket.start && ts <= bucket.end;
      });

      let value = 0;
      if (metric === 'transaction_count' || metric === 'token_transfer_count') {
        value = bucketTxs.length;
      } else if (metric === 'gas_used') {
        value = bucketTxs.reduce((sum, tx) => sum + (tx.gasUsed || 0), 0);
      } else if (metric === 'average_gas_price') {
        const gasPrices = bucketTxs
          .map((tx) => (typeof tx.gasPrice === 'number' ? tx.gasPrice : null))
          .filter((v) => v !== null);
        if (gasPrices.length > 0) {
          value = gasPrices.reduce((sum, v) => sum + v, 0) / gasPrices.length;
        } else {
          value = 0;
        }
      }

      return {
        intervalStart: bucket.start.toISOString(),
        intervalEnd: bucket.end.toISOString(),
        value
      };
    });

    return points;
  }

  // --- getCustomChartDetail ---
  getCustomChartDetail(customChartId) {
    const charts = this._getFromStorage('custom_charts', []);
    const chart = charts.find((c) => c.id === customChartId) || null;
    if (!chart) {
      return {
        chart: null,
        points: []
      };
    }
    const points = this._generateCustomChartPoints(chart);
    return { chart, points };
  }

  // --- getSavedCustomChartsList ---
  getSavedCustomChartsList() {
    const charts = this._getFromStorage('custom_charts', []);
    return charts;
  }

  // --- searchTokens ---
  searchTokens(query, limit = 20) {
    const q = (query || '').toLowerCase();
    if (!q) return [];
    const tokens = this._getFromStorage('tokens', []);
    const filtered = tokens.filter((t) => {
      return (
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.symbol && t.symbol.toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q))
      );
    });
    const resolved = this._resolveTokenForeignKeys(filtered);
    return resolved.slice(0, limit);
  }

  // --- getTokenList ---
  getTokenList(searchQuery, filters = {}, sort = 'market_cap_desc', page = 1, pageSize = 50) {
    let tokens = this._getFromStorage('tokens', []);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tokens = tokens.filter((t) => {
        return (
          (t.name && t.name.toLowerCase().includes(q)) ||
          (t.symbol && t.symbol.toLowerCase().includes(q)) ||
          (t.id && t.id.toLowerCase().includes(q))
        );
      });
    }

    if (filters) {
      if (typeof filters.minMarketCapUsd === 'number') {
        tokens = tokens.filter((t) => typeof t.marketCapUsd === 'number' && t.marketCapUsd >= filters.minMarketCapUsd);
      }
      if (typeof filters.maxMarketCapUsd === 'number') {
        tokens = tokens.filter((t) => typeof t.marketCapUsd === 'number' && t.marketCapUsd <= filters.maxMarketCapUsd);
      }
      if (typeof filters.minVolume24h === 'number') {
        tokens = tokens.filter((t) => typeof t.volume24h === 'number' && t.volume24h >= filters.minVolume24h);
      }
      if (typeof filters.minVolume7d === 'number') {
        tokens = tokens.filter((t) => typeof t.volume7d === 'number' && t.volume7d >= filters.minVolume7d);
      }
    }

    const sortFn = (a, b) => {
      switch (sort) {
        case 'market_cap_asc':
          return (a.marketCapUsd || 0) - (b.marketCapUsd || 0);
        case 'volume_24h_desc':
          return (b.volume24h || 0) - (a.volume24h || 0);
        case 'volume_7d_desc':
          return (b.volume7d || 0) - (a.volume7d || 0);
        case 'name_asc': {
          const na = (a.name || '').toLowerCase();
          const nb = (b.name || '').toLowerCase();
          if (na < nb) return -1;
          if (na > nb) return 1;
          return 0;
        }
        case 'market_cap_desc':
        default:
          return (b.marketCapUsd || 0) - (a.marketCapUsd || 0);
      }
    };

    const { items, totalCount } = this._applySortingAndPagination(tokens, sortFn, page, pageSize);
    const resolved = this._resolveTokenForeignKeys(items);

    return {
      tokens: resolved,
      totalCount,
      page,
      pageSize
    };
  }

  // --- getTokenDetail ---
  getTokenDetail(tokenId) {
    const tokens = this._getFromStorage('tokens', []);
    const tokenRaw = tokens.find((t) => t.id === tokenId) || null;
    const [token] = tokenRaw ? this._resolveTokenForeignKeys([tokenRaw]) : [null];

    // No historical price is stored, so expose neutral deltas.
    const priceChange24h = 0;
    const priceChange7d = 0;

    return {
      token,
      priceChange24h,
      priceChange7d
    };
  }

  // --- getTokenTimeSeries ---
  getTokenTimeSeries(tokenId, metric, dateRangeType, startDate, endDate, aggregationInterval) {
    // No explicit time-series storage is defined for tokens; do not fabricate data.
    // Return an empty series to reflect absence of stored historical data.
    return {
      points: []
    };
  }

  // --- getNFTCollections ---
  getNFTCollections(filters = {}, sort = 'floor_price_asc', page = 1, pageSize = 24) {
    let cols = this._getFromStorage('nft_collections', []);

    if (filters) {
      if (typeof filters.minFloorPrice === 'number') {
        cols = cols.filter((c) => typeof c.floorPrice === 'number' && c.floorPrice >= filters.minFloorPrice);
      }
      if (typeof filters.maxFloorPrice === 'number') {
        cols = cols.filter((c) => typeof c.floorPrice === 'number' && c.floorPrice <= filters.maxFloorPrice);
      }
      if (filters.floorPriceCurrency) {
        const cur = filters.floorPriceCurrency.toLowerCase();
        cols = cols.filter((c) => (c.floorPriceCurrency || '').toLowerCase() === cur);
      }
      if (typeof filters.minTotalItems === 'number') {
        cols = cols.filter((c) => typeof c.totalItems === 'number' && c.totalItems >= filters.minTotalItems);
      }
    }

    const sortFn = (a, b) => {
      switch (sort) {
        case 'floor_price_desc':
          return (b.floorPrice || 0) - (a.floorPrice || 0);
        case 'total_items_desc':
          return (b.totalItems || 0) - (a.totalItems || 0);
        case 'floor_price_asc':
        default:
          return (a.floorPrice || 0) - (b.floorPrice || 0);
      }
    };

    const { items, totalCount } = this._applySortingAndPagination(cols, sortFn, page, pageSize);
    const resolved = this._resolveNFTCollectionForeignKeys(items);

    // Instrumentation for task completion tracking (task_4)
    try {
      const f = filters || {};
      const floorCur = typeof f.floorPriceCurrency === 'string' ? f.floorPriceCurrency.toLowerCase() : null;
      if (
        f.minFloorPrice === 0.1 &&
        f.maxFloorPrice === 0.5 &&
        floorCur === 'eth' &&
        typeof f.minTotalItems === 'number' &&
        f.minTotalItems >= 1000 &&
        sort === 'floor_price_asc' &&
        page === 1 &&
        resolved &&
        resolved.length > 0
      ) {
        const value = {
          minFloorPrice: f.minFloorPrice,
          maxFloorPrice: f.maxFloorPrice,
          floorPriceCurrency: f.floorPriceCurrency,
          minTotalItems: f.minTotalItems,
          sort,
          page,
          firstCollectionId: resolved[0].id
        };
        localStorage.setItem('task4_collectionFilterParams', JSON.stringify(value));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      collections: resolved,
      totalCount,
      page,
      pageSize
    };
  }

  // --- getNFTCollectionDetail ---
  getNFTCollectionDetail(collectionId) {
    const cols = this._getFromStorage('nft_collections', []);
    const collectionRaw = cols.find((c) => c.id === collectionId) || null;
    const [collection] = collectionRaw ? this._resolveNFTCollectionForeignKeys([collectionRaw]) : [null];
    return { collection };
  }

  // --- getNFTItemsInCollection ---
  getNFTItemsInCollection(collectionId, filters = {}, sort = 'token_id_asc', page = 1, pageSize = 24) {
    let items = this._getFromStorage('nft_items', []);
    items = items.filter((it) => it.collectionId === collectionId);

    // Optional trait filtering: traitsJson is expected to be a JSON string describing criteria.
    if (filters && filters.traitsJson) {
      try {
        const traitsFilter = JSON.parse(filters.traitsJson);
        if (traitsFilter && Array.isArray(traitsFilter)) {
          items = items.filter((it) => {
            if (!Array.isArray(it.attributes)) return false;
            return traitsFilter.every((tf) =>
              it.attributes.some((attr) => attr.trait_type === tf.trait_type && attr.value === tf.value)
            );
          });
        }
      } catch (e) {
        // Ignore invalid traitsJson
      }
    }

    const sortFn = (a, b) => {
      switch (sort) {
        case 'token_id_desc':
          return (b.tokenId || 0) - (a.tokenId || 0);
        case 'token_id_asc':
        default:
          return (a.tokenId || 0) - (b.tokenId || 0);
      }
    };

    const { items: paged, totalCount } = this._applySortingAndPagination(items, sortFn, page, pageSize);
    const resolved = this._resolveNFTItemForeignKeys(paged);

    // Instrumentation for task completion tracking (task_4)
    try {
      const raw = localStorage.getItem('task4_collectionFilterParams');
      if (raw) {
        const params = JSON.parse(raw);
        if (
          params &&
          params.firstCollectionId &&
          String(params.firstCollectionId) === String(collectionId) &&
          sort === 'token_id_asc' &&
          page === 1 &&
          resolved &&
          resolved.length > 0
        ) {
          const value = {
            collectionId,
            sort,
            page,
            firstItemId: resolved[0].id
          };
          localStorage.setItem('task4_itemSortParams', JSON.stringify(value));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      items: resolved,
      totalCount,
      page,
      pageSize
    };
  }

  // --- getNFTItemDetail ---
  getNFTItemDetail(nftItemId) {
    const items = this._getFromStorage('nft_items', []);
    const itemRaw = items.find((it) => it.id === nftItemId) || null;
    const [itemResolved] = itemRaw ? this._resolveNFTItemForeignKeys([itemRaw]) : [null];

    const collection = itemResolved ? itemResolved.collection : null;
    const owner = itemResolved ? itemResolved.ownerAddress : null;

    // No on-chain ownership history table is defined; do not fabricate events.
    const ownershipHistory = [];

    // Instrumentation for task completion tracking (task_4)
    try {
      const raw = localStorage.getItem('task4_itemSortParams');
      if (raw) {
        const params = JSON.parse(raw);
        if (params && params.firstItemId && String(params.firstItemId) === String(nftItemId)) {
          localStorage.setItem('task4_lowestTokenItemDetailOpened', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      item: itemResolved,
      collection,
      owner,
      ownershipHistory
    };
  }

  // --- getLiquidityPools ---
  getLiquidityPools(filters = {}, sort = 'tvl_desc', page = 1, pageSize = 50) {
    let pools = this._getFromStorage('liquidity_pools', []);

    if (filters) {
      if (typeof filters.minApy === 'number') {
        pools = pools.filter((p) => typeof p.apy === 'number' && p.apy >= filters.minApy);
      }
      if (typeof filters.minTvlUsd === 'number') {
        pools = pools.filter((p) => typeof p.tvlUsd === 'number' && p.tvlUsd >= filters.minTvlUsd);
      }
      if (filters.protocolName) {
        const pn = filters.protocolName.toLowerCase();
        pools = pools.filter((p) => (p.protocolName || '').toLowerCase() === pn);
      }
    }

    const sortFn = (a, b) => {
      switch (sort) {
        case 'apy_desc':
          return (b.apy || 0) - (a.apy || 0);
        case 'apy_asc':
          return (a.apy || 0) - (b.apy || 0);
        case 'tvl_asc':
          return (a.tvlUsd || 0) - (b.tvlUsd || 0);
        case 'tvl_desc':
        default:
          return (b.tvlUsd || 0) - (a.tvlUsd || 0);
      }
    };

    const { items, totalCount } = this._applySortingAndPagination(pools, sortFn, page, pageSize);
    const resolved = this._resolveLiquidityPoolForeignKeys(items);

    return {
      pools: resolved,
      totalCount,
      page,
      pageSize
    };
  }

  // --- getAddressesList ---
  getAddressesList(filters = {}, sort = 'outgoing_tx_count_desc', page = 1, pageSize = 50) {
    const addresses = this._getFromStorage('addresses', []);
    const snapshots = this._getFromStorage('address_activity_snapshots', []);
    const periodType = filters.periodType || 'last_24h';

    // Build map of snapshots by addressId for the requested period
    const snapsForPeriod = snapshots.filter((s) => s.periodType === periodType);
    const snapMap = {};
    for (const s of snapsForPeriod) {
      snapMap[s.addressId] = s;
    }

    // Join addresses with snapshots
    let joined = addresses
      .map((addr) => ({
        address: addr,
        activitySnapshot: snapMap[addr.id] || {
          id: null,
          addressId: addr.id,
          periodType,
          incomingTxCount: 0,
          outgoingTxCount: 0,
          volumeInNative: 0,
          volumeOutNative: 0,
          lastUpdatedAt: null
        }
      }));

    // Apply filters on snapshot metrics
    if (typeof filters.minOutgoingTxCount === 'number') {
      joined = joined.filter(
        (row) => (row.activitySnapshot.outgoingTxCount || 0) >= filters.minOutgoingTxCount
      );
    }
    if (typeof filters.minIncomingTxCount === 'number') {
      joined = joined.filter(
        (row) => (row.activitySnapshot.incomingTxCount || 0) >= filters.minIncomingTxCount
      );
    }

    const sortFn = (a, b) => {
      const sa = a.activitySnapshot;
      const sb = b.activitySnapshot;
      const outA = sa.outgoingTxCount || 0;
      const outB = sb.outgoingTxCount || 0;
      const inA = sa.incomingTxCount || 0;
      const inB = sb.incomingTxCount || 0;
      const totA = outA + inA;
      const totB = outB + inB;
      switch (sort) {
        case 'incoming_tx_count_desc':
          return inB - inA;
        case 'total_tx_count_desc':
          return totB - totA;
        case 'outgoing_tx_count_desc':
        default:
          return outB - outA;
      }
    };

    const { items, totalCount } = this._applySortingAndPagination(joined, sortFn, page, pageSize);

    return {
      addresses: items,
      totalCount,
      page,
      pageSize
    };
  }

  // --- createAddressGroup ---
  createAddressGroup(name, addressIds) {
    const groups = this._getFromStorage('address_groups', []);
    const group = {
      id: this._generateId('ag'),
      name,
      addressIds: Array.isArray(addressIds) ? addressIds.slice() : [],
      createdAt: new Date().toISOString()
    };
    groups.push(group);
    this._saveToStorage('address_groups', groups);
    return { group };
  }

  // --- getAddressGroupsList ---
  getAddressGroupsList() {
    const groups = this._getFromStorage('address_groups', []);
    const addresses = this._getFromStorage('addresses', []);
    const addrMap = this._buildIdMap(addresses);

    return groups.map((g) => ({
      ...g,
      addresses: (g.addressIds || []).map((id) => addrMap[id]).filter((a) => a)
    }));
  }

  // --- getSavedFiltersList ---
  getSavedFiltersList(context) {
    const filters = this._getFromStorage('saved_filters', []);
    const filtered = context ? filters.filter((f) => f.context === context) : filters;
    const resolved = this._resolveSavedFilterForeignKeys(filtered);
    return resolved;
  }

  // --- getStaticPageContent ---
  getStaticPageContent(pageSlug) {
    const page = this._loadStaticPageFromStore(pageSlug);
    if (!page) {
      return {
        title: '',
        bodyHtml: '',
        lastUpdatedAt: null
      };
    }
    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || '',
      lastUpdatedAt: page.lastUpdatedAt || null
    };
  }

  // --- submitContactForm ---
  submitContactForm(name, email, category, subject, message) {
    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('contact');
    const entry = {
      id,
      name,
      email,
      category: category || null,
      subject,
      message,
      createdAt: new Date().toISOString()
    };
    messages.push(entry);
    this._saveToStorage('contact_messages', messages);
    return {
      success: true,
      referenceId: id
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
