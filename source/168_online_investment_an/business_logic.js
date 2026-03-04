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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    // Core entity tables
    const tables = [
      'stocks',
      'etfs',
      'mutual_funds',
      'savings_products',
      'portfolios',
      'stock_holdings',
      'etf_holdings',
      'mutual_fund_holdings',
      'savings_positions',
      'cash_balances',
      'trade_orders',
      'recurring_investment_plans',
      'price_alerts',
      'watchlists',
      'watchlist_items',
      'etf_comparison_sessions',
      'etf_comparison_items',
      'cash_transfers',
      // dashboard & content
      'dashboard_alerts',
      'recent_activity',
      'faqs'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Single-object content stores
    if (!localStorage.getItem('about_page_content')) {
      const about = {
        mission: 'Empower individual investors with simple, transparent tools to trade and invest for the long term.',
        core_features: [
          'Low-cost trading in stocks, ETFs, and mutual funds',
          'Automated recurring investments',
          'Custom watchlists and price alerts',
          'High-yield savings and cash management options'
        ],
        company_background: 'This is placeholder About content. You can overwrite it in localStorage under key "about_page_content".'
      };
      localStorage.setItem('about_page_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('support_contact_info')) {
      const support = {
        email: 'support@example-broker.com',
        phone: '+1 (800) 000-0000',
        support_hours: 'Mon–Fri, 9:00 AM – 5:00 PM ET'
      };
      localStorage.setItem('support_contact_info', JSON.stringify(support));
    }

    if (!localStorage.getItem('fees_pricing')) {
      const fees = {
        trading_commissions: [
          {
            asset_type: 'stock_etf',
            description: 'Online stock and ETF trades',
            commission: '$0 per trade'
          },
          {
            asset_type: 'mutual_fund',
            description: 'No-load mutual funds',
            commission: '$0 per trade'
          }
        ],
        account_fees: [
          {
            fee_type: 'account_maintenance',
            description: 'Account maintenance fee',
            amount: '$0'
          }
        ],
        other_charges: [
          {
            description: 'Regulatory and exchange fees may apply to certain trades.',
            amount: 'Varies'
          }
        ]
      };
      localStorage.setItem('fees_pricing', JSON.stringify(fees));
    }

    if (!localStorage.getItem('legal_documents')) {
      const legal = {
        terms_of_use: {
          title: 'Terms of Use',
          body: 'These are placeholder Terms of Use. Replace via localStorage key "legal_documents" as needed.'
        },
        privacy_policy: {
          title: 'Privacy Policy',
          body: 'This is placeholder Privacy Policy text. Replace via localStorage.'
        },
        risk_disclosures: {
          title: 'Risk Disclosures',
          body: 'Investing involves risk, including loss of principal. These are placeholder disclosures.'
        }
      };
      localStorage.setItem('legal_documents', JSON.stringify(legal));
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

  _getObjectFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  _saveObjectToStorage(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
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

  _nowISO() {
    return new Date().toISOString();
  }

  // ----------------------
  // Helper functions required by spec
  // ----------------------

  _getOrCreateEtfComparisonSession() {
    const sessions = this._getFromStorage('etf_comparison_sessions');
    let session = sessions[0] || null;
    if (!session) {
      session = {
        id: this._generateId('etfcomp'),
        name: 'Current Comparison',
        created_at: this._nowISO()
      };
      sessions.push(session);
      this._saveToStorage('etf_comparison_sessions', sessions);
    }
    return session;
  }

  _getDefaultBrokerageCashAccount() {
    const cashBalances = this._getFromStorage('cash_balances');
    let acct = cashBalances.find(cb => cb.account_type === 'brokerage_cash');
    return acct || null;
  }

  _computeNextRecurringInvestmentStartDate(frequency, day_of_month) {
    const now = new Date();
    if (frequency === 'monthly') {
      const dom = typeof day_of_month === 'number' && day_of_month >= 1 && day_of_month <= 31 ? day_of_month : now.getDate();
      let year = now.getFullYear();
      let month = now.getMonth(); // 0-based
      if (now.getDate() > dom) {
        month += 1;
        if (month > 11) {
          month = 0;
          year += 1;
        }
      }
      const d = new Date(year, month, dom, 9, 0, 0);
      return d.toISOString();
    }
    // Simple default: next day for non-monthly
    const d = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return d.toISOString();
  }

  _validateAndBuildTradeOrderPayload(
    order_side,
    order_type,
    time_in_force,
    session,
    security_type,
    stockId,
    etfId,
    mutualFundId,
    quantity,
    notional_amount,
    limit_price,
    stop_price
  ) {
    const errors = [];
    const validSides = ['buy', 'sell'];
    const validOrderTypes = ['market', 'limit', 'stop', 'stop_limit'];
    const validTif = ['good_for_day', 'good_till_canceled', 'immediate_or_cancel', 'fill_or_kill'];
    const validSessions = ['regular', 'extended', 'all_sessions'];
    const validSecTypes = ['stock', 'etf', 'mutual_fund'];

    if (!validSides.includes(order_side)) {
      errors.push('Invalid order_side');
    }
    if (!validOrderTypes.includes(order_type)) {
      errors.push('Invalid order_type');
    }
    if (!validTif.includes(time_in_force)) {
      errors.push('Invalid time_in_force');
    }
    if (!validSessions.includes(session)) {
      errors.push('Invalid session');
    }
    if (!validSecTypes.includes(security_type)) {
      errors.push('Invalid security_type');
    }

    let idCount = 0;
    if (stockId) idCount += 1;
    if (etfId) idCount += 1;
    if (mutualFundId) idCount += 1;
    if (idCount !== 1) {
      errors.push('Exactly one of stockId, etfId, or mutualFundId must be provided');
    } else {
      if (security_type === 'stock' && !stockId) {
        errors.push('stockId is required for security_type="stock"');
      }
      if (security_type === 'etf' && !etfId) {
        errors.push('etfId is required for security_type="etf"');
      }
      if (security_type === 'mutual_fund' && !mutualFundId) {
        errors.push('mutualFundId is required for security_type="mutual_fund"');
      }
    }

    if ((quantity == null || quantity <= 0) && (notional_amount == null || notional_amount <= 0)) {
      errors.push('Either quantity or notional_amount must be provided and > 0');
    }

    if (order_type === 'limit' || order_type === 'stop_limit') {
      if (typeof limit_price !== 'number' || limit_price <= 0) {
        errors.push('limit_price must be provided and > 0 for limit or stop_limit orders');
      }
    }

    if (order_type === 'stop' || order_type === 'stop_limit') {
      if (typeof stop_price !== 'number' || stop_price <= 0) {
        errors.push('stop_price must be provided and > 0 for stop or stop_limit orders');
      }
    }

    if (errors.length > 0) {
      return { valid: false, payload: null, errors };
    }

    const now = this._nowISO();
    const payload = {
      id: this._generateId('order'),
      order_side,
      order_type,
      time_in_force,
      session,
      status: 'pending',
      quantity: quantity != null ? quantity : null,
      notional_amount: notional_amount != null ? notional_amount : null,
      limit_price: typeof limit_price === 'number' ? limit_price : null,
      stop_price: typeof stop_price === 'number' ? stop_price : null,
      estimated_cost: null,
      estimated_proceeds: null,
      stock_id: stockId || null,
      etf_id: etfId || null,
      mutual_fund_id: mutualFundId || null,
      created_at: now,
      submitted_at: now,
      filled_at: null
    };

    return { valid: true, payload, errors: [] };
  }

  // ----------------------
  // Dashboard interfaces
  // ----------------------

  getDashboardSnapshot() {
    const portfolios = this._getFromStorage('portfolios');
    const cashBalances = this._getFromStorage('cash_balances');

    // Choose primary portfolio as the one with highest total_market_value
    let portfolio = null;
    if (portfolios.length > 0) {
      portfolio = portfolios
        .slice()
        .sort((a, b) => (b.total_market_value || 0) - (a.total_market_value || 0))[0];
    }

    const portfolioSummary = portfolio
      ? {
          portfolio_id: portfolio.id,
          name: portfolio.name,
          total_market_value: portfolio.total_market_value || 0,
          day_change_value: 0,
          day_change_percent: 0,
          total_gain_loss: portfolio.total_gain_loss || 0,
          total_gain_loss_percent:
            portfolio.total_market_value && portfolio.total_market_value !== 0
              ? ((portfolio.total_gain_loss || 0) / portfolio.total_market_value) * 100
              : 0,
          last_updated: portfolio.last_updated || this._nowISO()
        }
      : {
          portfolio_id: null,
          name: '',
          total_market_value: 0,
          day_change_value: 0,
          day_change_percent: 0,
          total_gain_loss: 0,
          total_gain_loss_percent: 0,
          last_updated: this._nowISO()
        };

    const cash_balances = cashBalances.map(cb => ({
      cash_balance_id: cb.id,
      name: cb.name,
      account_type: cb.account_type,
      account_type_label:
        cb.account_type === 'brokerage_cash'
          ? 'Brokerage Cash'
          : cb.account_type === 'savings_cash'
          ? 'Savings Cash'
          : 'Other',
      balance: cb.balance,
      currency: cb.currency,
      last_updated: cb.last_updated || this._nowISO(),
      // foreign key resolution
      cash_balance: cb
    }));

    const snapshot = {
      portfolio: portfolioSummary,
      cash_balances,
      recent_performance: {
        one_day_percent: 0,
        one_week_percent: 0,
        one_month_percent: 0
      },
      unread_alert_count: this._getFromStorage('dashboard_alerts').filter(a => !a.is_read).length,
      recent_activity_count: this._getFromStorage('recent_activity').length
    };

    return snapshot;
  }

  getMostTradedStocksToday(limit) {
    const effectiveLimit = typeof limit === 'number' && limit > 0 ? limit : 10;
    const stocks = this._getFromStorage('stocks');
    const tradableWithRank = stocks
      .filter(s => s.is_tradable && typeof s.today_most_traded_rank === 'number')
      .sort((a, b) => a.today_most_traded_rank - b.today_most_traded_rank)
      .slice(0, effectiveLimit);

    return tradableWithRank.map(s => {
      const prev = s.previous_close_price || s.current_price || 0;
      const curr = s.current_price || 0;
      const changeVal = curr - prev;
      const changePct = prev !== 0 ? (changeVal / prev) * 100 : 0;
      return {
        stock_id: s.id,
        symbol: s.symbol,
        name: s.name,
        sector_code: s.sector,
        sector_name: this._sectorCodeToLabel(s.sector),
        current_price: curr,
        price_change_value: changeVal,
        price_change_percent: changePct,
        daily_volume: s.daily_volume,
        today_most_traded_rank: s.today_most_traded_rank,
        is_tradable: s.is_tradable,
        // foreign key resolution
        stock: s
      };
    });
  }

  getDashboardAlertsAndActivity() {
    const alerts = this._getFromStorage('dashboard_alerts');
    const recent = this._getFromStorage('recent_activity');
    return {
      alerts,
      recent_activity: recent
    };
  }

  // ----------------------
  // Stock trading / screener
  // ----------------------

  _sectorCodeToLabel(code) {
    const map = {
      technology: 'Technology',
      healthcare: 'Healthcare',
      financials: 'Financials',
      consumer_defensive: 'Consumer Defensive',
      industrials: 'Industrials',
      communication_services: 'Communication Services',
      consumer_cyclical: 'Consumer Cyclical',
      energy: 'Energy',
      materials: 'Materials',
      real_estate: 'Real Estate',
      utilities: 'Utilities',
      other: 'Other'
    };
    return map[code] || code;
  }

  getStockTradeFilterOptions() {
    const sectorOptions = [
      'technology',
      'healthcare',
      'financials',
      'consumer_defensive',
      'industrials',
      'communication_services',
      'consumer_cyclical',
      'energy',
      'materials',
      'real_estate',
      'utilities',
      'other'
    ].map(v => ({ value: v, label: this._sectorCodeToLabel(v) }));

    const price_range = { min: 0, max: 1000, step: 0.01 };
    const volume_range = { min: 0, max: 1000000000, step: 1000 };
    const market_cap_range = { min: 0, max: 1000000000000, step: 100000000 };
    const sort_options = [
      { value: 'price_asc', label: 'Price - Low to High' },
      { value: 'price_desc', label: 'Price - High to Low' },
      { value: 'daily_volume_desc', label: 'Volume - High to Low' },
      { value: 'market_cap_desc', label: 'Market Cap - High to Low' }
    ];

    return { sector_options: sectorOptions, price_range, volume_range, market_cap_range, sort_options };
  }

  searchTradableStocks(filters, sort, page, page_size) {
    const allStocks = this._getFromStorage('stocks');
    const f = filters || {};
    let results = allStocks.filter(s => s.is_tradable);

    if (f.sector) {
      results = results.filter(s => s.sector === f.sector);
    }
    if (typeof f.min_price === 'number') {
      results = results.filter(s => (s.current_price || 0) >= f.min_price);
    }
    if (typeof f.max_price === 'number') {
      results = results.filter(s => (s.current_price || 0) <= f.max_price);
    }
    if (typeof f.min_daily_volume === 'number') {
      results = results.filter(s => (s.daily_volume || 0) >= f.min_daily_volume);
    }
    if (typeof f.max_daily_volume === 'number') {
      results = results.filter(s => (s.daily_volume || 0) <= f.max_daily_volume);
    }
    if (typeof f.min_market_cap === 'number') {
      results = results.filter(s => (s.market_cap || 0) >= f.min_market_cap);
    }
    if (typeof f.max_market_cap === 'number') {
      results = results.filter(s => (s.market_cap || 0) <= f.max_market_cap);
    }

    switch (sort) {
      case 'price_asc':
        results.sort((a, b) => (a.current_price || 0) - (b.current_price || 0));
        break;
      case 'price_desc':
        results.sort((a, b) => (b.current_price || 0) - (a.current_price || 0));
        break;
      case 'daily_volume_desc':
        results.sort((a, b) => (b.daily_volume || 0) - (a.daily_volume || 0));
        break;
      case 'market_cap_desc':
        results.sort((a, b) => (b.market_cap || 0) - (a.market_cap || 0));
        break;
      default:
        break;
    }

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 25;
    const total = results.length;
    const start = (pg - 1) * ps;
    const slice = results.slice(start, start + ps);

    const mapped = slice.map(s => {
      const prev = s.previous_close_price || s.current_price || 0;
      const curr = s.current_price || 0;
      const changeVal = curr - prev;
      const changePct = prev !== 0 ? (changeVal / prev) * 100 : 0;
      return {
        stock_id: s.id,
        symbol: s.symbol,
        name: s.name,
        sector_code: s.sector,
        sector_name: this._sectorCodeToLabel(s.sector),
        current_price: curr,
        previous_close_price: s.previous_close_price || null,
        price_change_value: changeVal,
        price_change_percent: changePct,
        daily_volume: s.daily_volume,
        average_daily_volume: s.average_daily_volume || null,
        market_cap: s.market_cap,
        exchange: s.exchange || null,
        is_tradable: s.is_tradable,
        // foreign key resolution
        stock: s
      };
    });

    return {
      total,
      page: pg,
      page_size: ps,
      results: mapped
    };
  }

  getStockDetailsAndPosition(stockId) {
    const stocks = this._getFromStorage('stocks');
    const holdings = this._getFromStorage('stock_holdings');
    let stock = stocks.find(s => s.id === stockId) || null;

    // Fallback: if stock master record is missing, derive basic quote info from holding
    if (!stock) {
      const holdingForStock = holdings.find(h => h.stock_id === stockId) || null;
      if (holdingForStock) {
        const approxPrice =
          holdingForStock.quantity ? (holdingForStock.market_value || 0) / holdingForStock.quantity : 0;
        stock = {
          id: stockId,
          symbol: holdingForStock.symbol,
          name: holdingForStock.name,
          sector: 'other',
          market_cap: null,
          current_price: approxPrice || 0,
          previous_close_price: approxPrice || 0,
          daily_volume: null,
          average_daily_volume: null,
          exchange: null,
          is_tradable: true
        };
      }
    }

    let position = null;
    if (stock) {
      const holding = holdings.find(h => h.stock_id === stock.id) || null;
      if (holding) {
        const mv = holding.market_value || 0;
        const cb = holding.cost_basis_total || 0;
        const gain = typeof holding.unrealized_gain_loss === 'number' ? holding.unrealized_gain_loss : mv - cb;
        const gainPct = cb !== 0 ? (gain / cb) * 100 : 0;
        position = {
          holding_id: holding.id,
          quantity: holding.quantity,
          average_cost_per_share: holding.average_cost_per_share || null,
          cost_basis_total: cb,
          market_value: mv,
          unrealized_gain_loss: gain,
          unrealized_gain_loss_percent: gainPct
        };
      }
    }

    let stockObj = null;
    if (stock) {
      const prev = stock.previous_close_price || stock.current_price || 0;
      const curr = stock.current_price || 0;
      const changeVal = curr - prev;
      const changePct = prev !== 0 ? (changeVal / prev) * 100 : 0;
      stockObj = {
        id: stock.id,
        symbol: stock.symbol,
        name: stock.name,
        sector_code: stock.sector,
        sector_name: this._sectorCodeToLabel(stock.sector),
        market_cap: stock.market_cap,
        current_price: curr,
        previous_close_price: stock.previous_close_price || null,
        price_change_value: changeVal,
        price_change_percent: changePct,
        daily_volume: stock.daily_volume,
        average_daily_volume: stock.average_daily_volume || null,
        exchange: stock.exchange || null,
        is_tradable: stock.is_tradable
      };
    }

    const chart = {
      interval: '1D',
      points: []
    };

    const key_metrics = {
      pe_ratio: null,
      dividend_yield_percent: null,
      beta: null
    };

    return {
      stock: stockObj,
      position,
      chart,
      key_metrics
    };
  }

  // ----------------------
  // Price alerts
  // ----------------------

  getStockPriceAlerts(stockId) {
    const alerts = this._getFromStorage('price_alerts');
    const stocks = this._getFromStorage('stocks');
    return alerts
      .filter(a => a.stock_id === stockId && a.status === 'active')
      .map(a => ({
        ...a,
        // foreign key resolution
        stock: stocks.find(s => s.id === a.stock_id) || null
      }));
  }

  createPriceAlertForStock(stockId, alert_type, trigger_condition, percentage_change, price_target, is_repeatable) {
    const stocks = this._getFromStorage('stocks');
    let stock = stocks.find(s => s.id === stockId);

    // Fallback: derive stock info from existing holding if master record is missing
    if (!stock) {
      const holdings = this._getFromStorage('stock_holdings');
      const holding = holdings.find(h => h.stock_id === stockId) || null;
      if (holding) {
        const approxPrice =
          holding.quantity ? (holding.market_value || 0) / holding.quantity : 0;
        stock = {
          id: stockId,
          symbol: holding.symbol,
          name: holding.name,
          sector: null,
          market_cap: null,
          current_price: approxPrice || 0,
          previous_close_price: approxPrice || 0
        };
      }
    }

    if (!stock) {
      return { success: false, alert: null, message: 'Stock not found' };
    }

    const validAlertTypes = ['price_percentage', 'price_absolute'];
    const validConditions = [
      'price_falls_by_percent',
      'price_rises_by_percent',
      'price_crosses_above',
      'price_crosses_below'
    ];

    if (!validAlertTypes.includes(alert_type)) {
      return { success: false, alert: null, message: 'Invalid alert_type' };
    }
    if (!validConditions.includes(trigger_condition)) {
      return { success: false, alert: null, message: 'Invalid trigger_condition' };
    }

    const currentPrice = stock.current_price || stock.previous_close_price || 0;
    let pct = null;
    let targetPrice = null;

    if (alert_type === 'price_percentage') {
      if (typeof percentage_change !== 'number' || percentage_change <= 0) {
        return { success: false, alert: null, message: 'percentage_change must be > 0 for price_percentage alerts' };
      }
      pct = percentage_change;
      if (
        trigger_condition === 'price_falls_by_percent' ||
        trigger_condition === 'price_rises_by_percent'
      ) {
        const factor = trigger_condition === 'price_falls_by_percent' ? 1 - pct / 100 : 1 + pct / 100;
        targetPrice = currentPrice * factor;
      }
    } else if (alert_type === 'price_absolute') {
      if (typeof price_target !== 'number' || price_target <= 0) {
        return { success: false, alert: null, message: 'price_target must be > 0 for price_absolute alerts' };
      }
      targetPrice = price_target;
    }

    const alerts = this._getFromStorage('price_alerts');
    const alert = {
      id: this._generateId('alert'),
      stock_id: stockId,
      alert_type,
      trigger_condition,
      percentage_change: pct,
      price_target: targetPrice,
      reference_price: currentPrice,
      is_repeatable: !!is_repeatable,
      status: 'active',
      created_at: this._nowISO(),
      triggered_at: null
    };

    alerts.push(alert);
    this._saveToStorage('price_alerts', alerts);

    return { success: true, alert, message: 'Price alert created' };
  }

  updatePriceAlert(priceAlertId, percentage_change, price_target, trigger_condition, is_repeatable) {
    const alerts = this._getFromStorage('price_alerts');
    const idx = alerts.findIndex(a => a.id === priceAlertId);
    if (idx === -1) {
      return { success: false, alert: null, message: 'Alert not found' };
    }
    const alert = alerts[idx];

    if (typeof percentage_change === 'number') {
      alert.percentage_change = percentage_change;
    }
    if (typeof price_target === 'number') {
      alert.price_target = price_target;
    }
    if (typeof trigger_condition === 'string') {
      alert.trigger_condition = trigger_condition;
    }
    if (typeof is_repeatable === 'boolean') {
      alert.is_repeatable = is_repeatable;
    }

    alerts[idx] = alert;
    this._saveToStorage('price_alerts', alerts);

    return { success: true, alert, message: 'Alert updated' };
  }

  cancelPriceAlert(priceAlertId) {
    const alerts = this._getFromStorage('price_alerts');
    const idx = alerts.findIndex(a => a.id === priceAlertId);
    if (idx === -1) {
      return { success: false, message: 'Alert not found' };
    }
    alerts[idx].status = 'canceled';
    this._saveToStorage('price_alerts', alerts);
    return { success: true, message: 'Alert canceled' };
  }

  // ----------------------
  // Watchlists
  // ----------------------

  getWatchlistsOverview() {
    const watchlists = this._getFromStorage('watchlists');
    const items = this._getFromStorage('watchlist_items');

    return watchlists.map(wl => ({
      watchlist_id: wl.id,
      name: wl.name,
      description: wl.description || '',
      item_count: items.filter(i => i.watchlist_id === wl.id).length,
      created_at: wl.created_at,
      updated_at: wl.updated_at || wl.created_at
    }));
  }

  getWatchlistItemsWithQuotes(watchlistId) {
    const watchlists = this._getFromStorage('watchlists');
    const items = this._getFromStorage('watchlist_items');
    const stocks = this._getFromStorage('stocks');
    const etfs = this._getFromStorage('etfs');

    const wl = watchlists.find(w => w.id === watchlistId) || null;

    const wlItems = items.filter(i => i.watchlist_id === watchlistId).map(i => {
      let security_type = 'stock';
      let last_price = null;
      let price_change_value = null;
      let price_change_percent = null;
      let daily_volume = null;
      let stock = null;
      let etf = null;

      if (i.stock_id) {
        stock = stocks.find(s => s.id === i.stock_id) || null;
        if (stock) {
          const prev = stock.previous_close_price || stock.current_price || 0;
          const curr = stock.current_price || 0;
          last_price = curr;
          price_change_value = curr - prev;
          price_change_percent = prev !== 0 ? (price_change_value / prev) * 100 : 0;
          daily_volume = stock.daily_volume || null;
        }
        security_type = 'stock';
      } else if (i.etf_id) {
        etf = etfs.find(e => e.id === i.etf_id) || null;
        // ETF entity does not include price; leave quote fields null
        security_type = 'etf';
      }

      return {
        watchlist_item_id: i.id,
        symbol: i.symbol,
        security_type,
        stock_id: i.stock_id || null,
        etf_id: i.etf_id || null,
        name: stock ? stock.name : etf ? etf.name : null,
        last_price,
        price_change_value,
        price_change_percent,
        daily_volume,
        // foreign key resolution
        stock,
        etf
      };
    });

    return {
      watchlist: wl
        ? {
            watchlist_id: wl.id,
            name: wl.name,
            description: wl.description || ''
          }
        : null,
      items: wlItems
    };
  }

  createWatchlist(name, description) {
    if (!name || typeof name !== 'string') {
      return { watchlist: null, message: 'Name is required' };
    }
    const watchlists = this._getFromStorage('watchlists');
    const now = this._nowISO();
    const wl = {
      id: this._generateId('watchlist'),
      name,
      description: description || '',
      created_at: now,
      updated_at: now
    };
    watchlists.push(wl);
    this._saveToStorage('watchlists', watchlists);
    return { watchlist: wl, message: 'Watchlist created' };
  }

  renameWatchlist(watchlistId, new_name, new_description) {
    const watchlists = this._getFromStorage('watchlists');
    const idx = watchlists.findIndex(w => w.id === watchlistId);
    if (idx === -1) {
      return { watchlist: null, message: 'Watchlist not found' };
    }
    if (!new_name) {
      return { watchlist: null, message: 'new_name is required' };
    }
    watchlists[idx].name = new_name;
    if (typeof new_description === 'string') {
      watchlists[idx].description = new_description;
    }
    watchlists[idx].updated_at = this._nowISO();
    this._saveToStorage('watchlists', watchlists);
    return { watchlist: watchlists[idx], message: 'Watchlist updated' };
  }

  deleteWatchlist(watchlistId) {
    const watchlists = this._getFromStorage('watchlists');
    const items = this._getFromStorage('watchlist_items');
    const idx = watchlists.findIndex(w => w.id === watchlistId);
    if (idx === -1) {
      return { success: false, message: 'Watchlist not found' };
    }
    watchlists.splice(idx, 1);
    const remainingItems = items.filter(i => i.watchlist_id !== watchlistId);
    this._saveToStorage('watchlists', watchlists);
    this._saveToStorage('watchlist_items', remainingItems);
    return { success: true, message: 'Watchlist deleted' };
  }

  addSecurityToWatchlist(watchlistId, stockId, etfId, symbol) {
    const watchlists = this._getFromStorage('watchlists');
    const wl = watchlists.find(w => w.id === watchlistId);
    if (!wl) {
      return { watchlist_item: null, message: 'Watchlist not found' };
    }
    if (!symbol) {
      return { watchlist_item: null, message: 'symbol is required' };
    }
    if (!stockId && !etfId) {
      return { watchlist_item: null, message: 'Either stockId or etfId must be provided' };
    }

    const items = this._getFromStorage('watchlist_items');
    const now = this._nowISO();
    const item = {
      id: this._generateId('wlitem'),
      watchlist_id: watchlistId,
      stock_id: stockId || null,
      etf_id: etfId || null,
      symbol,
      added_at: now
    };
    items.push(item);
    this._saveToStorage('watchlist_items', items);

    return { watchlist_item: item, message: 'Added to watchlist' };
  }

  removeWatchlistItem(watchlistItemId) {
    const items = this._getFromStorage('watchlist_items');
    const idx = items.findIndex(i => i.id === watchlistItemId);
    if (idx === -1) {
      return { success: false, message: 'Watchlist item not found' };
    }
    items.splice(idx, 1);
    this._saveToStorage('watchlist_items', items);
    return { success: true, message: 'Watchlist item removed' };
  }

  // ----------------------
  // ETF screener & comparison
  // ----------------------

  getEtfScreenerFilterOptions() {
    const asset_class_options = [
      { value: 'equity', label: 'Equity' },
      { value: 'bond', label: 'Bond' },
      { value: 'commodity', label: 'Commodity' },
      { value: 'multi_asset', label: 'Multi-Asset' },
      { value: 'alternative', label: 'Alternative' },
      { value: 'other', label: 'Other' }
    ];

    const region_options = [
      { value: 'us', label: 'U.S.' },
      { value: 'international_global', label: 'International/Global' },
      { value: 'emerging_markets', label: 'Emerging Markets' },
      { value: 'europe', label: 'Europe' },
      { value: 'asia_pacific', label: 'Asia Pacific' },
      { value: 'other', label: 'Other' }
    ];

    const category_options = [];

    const rating_options = [
      { min_stars: 1, label: '1 star & up' },
      { min_stars: 2, label: '2 stars & up' },
      { min_stars: 3, label: '3 stars & up' },
      { min_stars: 4, label: '4 stars & up' },
      { min_stars: 5, label: '5 stars only' }
    ];

    const sort_options = [
      { value: 'return_5y_desc', label: '5-Year Return - High to Low' },
      { value: 'aum_desc', label: 'Assets Under Management - High to Low' },
      { value: 'expense_ratio_asc', label: 'Expense Ratio - Low to High' }
    ];

    return { asset_class_options, region_options, category_options, rating_options, sort_options };
  }

  searchEtfsForScreener(filters, sort, page, page_size) {
    const allEtfs = this._getFromStorage('etfs');
    const f = filters || {};
    let results = allEtfs.filter(e => e.is_tradable);

    if (f.asset_class) {
      results = results.filter(e => e.asset_class === f.asset_class);
    }
    if (f.category) {
      results = results.filter(e => (e.category || '').toLowerCase() === String(f.category).toLowerCase());
    }
    if (f.region) {
      results = results.filter(e => e.region === f.region);
    }
    if (typeof f.max_expense_ratio === 'number') {
      results = results.filter(e => (e.expense_ratio || 0) <= f.max_expense_ratio);
    }
    if (typeof f.min_rating_stars === 'number') {
      results = results.filter(e => (e.rating_stars || 0) >= f.min_rating_stars);
    }
    if (typeof f.min_aum === 'number') {
      results = results.filter(e => (e.aum || 0) >= f.min_aum);
    }

    switch (sort) {
      case 'return_5y_desc':
        results.sort((a, b) => (b.return_5y || 0) - (a.return_5y || 0));
        break;
      case 'aum_desc':
        results.sort((a, b) => (b.aum || 0) - (a.aum || 0));
        break;
      case 'expense_ratio_asc':
        results.sort((a, b) => (a.expense_ratio || 0) - (b.expense_ratio || 0));
        break;
      default:
        break;
    }

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 25;
    const total = results.length;
    const start = (pg - 1) * ps;
    const slice = results.slice(start, start + ps);

    const mapped = slice.map(e => ({
      etf_id: e.id,
      symbol: e.symbol,
      name: e.name,
      asset_class: e.asset_class,
      category: e.category || null,
      region: e.region,
      expense_ratio: e.expense_ratio,
      rating_stars: e.rating_stars,
      aum: e.aum,
      return_1y: e.return_1y || null,
      return_5y: e.return_5y || null,
      is_tradable: e.is_tradable,
      // foreign key resolution
      etf: e
    }));

    return { total, page: pg, page_size: ps, results: mapped };
  }

  getEtfDetails(etfId) {
    const etfs = this._getFromStorage('etfs');
    const holdings = this._getFromStorage('etf_holdings');

    const etf = etfs.find(e => e.id === etfId) || null;
    let position = null;
    if (etf) {
      const holding = holdings.find(h => h.etf_id === etf.id) || null;
      if (holding) {
        const mv = holding.market_value || 0;
        const cb = holding.cost_basis_total || 0;
        const gain = typeof holding.unrealized_gain_loss === 'number' ? holding.unrealized_gain_loss : mv - cb;
        const gainPct = cb !== 0 ? (gain / cb) * 100 : 0;
        position = {
          holding_id: holding.id,
          quantity: holding.quantity,
          average_cost_per_share: holding.average_cost_per_share || null,
          cost_basis_total: cb,
          market_value: mv,
          unrealized_gain_loss: gain,
          unrealized_gain_loss_percent: gainPct
        };
      }
    }

    const performance = {
      return_1y: etf ? etf.return_1y || null : null,
      return_3y: null,
      return_5y: etf ? etf.return_5y || null : null
    };

    const top_holdings = [];

    return {
      etf,
      position,
      performance,
      top_holdings
    };
  }

  addEtfToComparison(etfId) {
    const session = this._getOrCreateEtfComparisonSession();
    const items = this._getFromStorage('etf_comparison_items');

    const existing = items.find(
      i => i.comparison_session_id === session.id && i.etf_id === etfId
    );
    if (!existing) {
      const position =
        items.filter(i => i.comparison_session_id === session.id).length + 1;
      const item = {
        id: this._generateId('etfcompi'),
        comparison_session_id: session.id,
        etf_id: etfId,
        position,
        added_at: this._nowISO()
      };
      items.push(item);
      this._saveToStorage('etf_comparison_items', items);
    }

    const sessionItems = items.filter(i => i.comparison_session_id === session.id);
    return { comparison_session: session, items: sessionItems, message: 'ETF added to comparison' };
  }

  removeEtfFromComparison(etfId) {
    const session = this._getOrCreateEtfComparisonSession();
    const items = this._getFromStorage('etf_comparison_items');
    const remaining = items.filter(
      i => !(i.comparison_session_id === session.id && i.etf_id === etfId)
    );

    // Re-number positions within session
    let pos = 1;
    for (const item of remaining.filter(i => i.comparison_session_id === session.id)) {
      item.position = pos++;
    }

    this._saveToStorage('etf_comparison_items', remaining);
    const sessionItems = remaining.filter(i => i.comparison_session_id === session.id);
    return { comparison_session: session, items: sessionItems, message: 'ETF removed from comparison' };
  }

  getCurrentEtfComparisonView() {
    const session = this._getOrCreateEtfComparisonSession();
    const items = this._getFromStorage('etf_comparison_items').filter(
      i => i.comparison_session_id === session.id
    );
    const etfs = this._getFromStorage('etfs');

    const viewEtfs = items
      .slice()
      .sort((a, b) => (a.position || 0) - (b.position || 0))
      .map(item => {
        const etf = etfs.find(e => e.id === item.etf_id) || null;
        const key_metrics = {
          expense_ratio: etf ? etf.expense_ratio : null,
          aum: etf ? etf.aum : null,
          return_1y: etf ? etf.return_1y || null : null,
          return_5y: etf ? etf.return_5y || null : null,
          volatility_3y: null
        };
        return {
          etf,
          comparison_item: item,
          key_metrics
        };
      });

    return { comparison_session: session, etfs: viewEtfs };
  }

  // ----------------------
  // Mutual funds & recurring investments
  // ----------------------

  searchMutualFunds(query, filters, page, page_size) {
    const all = this._getFromStorage('mutual_funds');
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = all.filter(mf => {
      if (q) {
        const hay = (mf.name + ' ' + mf.symbol + ' ' + (mf.benchmark_index || ''))
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (typeof f.max_minimum_initial_investment === 'number') {
      results = results.filter(
        mf => (mf.minimum_initial_investment || 0) <= f.max_minimum_initial_investment
      );
    }
    if (typeof f.is_index_fund === 'boolean') {
      results = results.filter(mf => !!mf.is_index_fund === f.is_index_fund);
    }

    results.sort((a, b) => a.name.localeCompare(b.name));

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof page_size === 'number' && page_size > 0 ? page_size : 25;
    const total = results.length;
    const start = (pg - 1) * ps;
    const slice = results.slice(start, start + ps);

    const mapped = slice.map(mf => ({
      mutual_fund_id: mf.id,
      symbol: mf.symbol,
      name: mf.name,
      category: mf.category || null,
      is_index_fund: !!mf.is_index_fund,
      benchmark_index: mf.benchmark_index || null,
      minimum_initial_investment: mf.minimum_initial_investment,
      expense_ratio: mf.expense_ratio || null,
      return_1y: mf.return_1y || null,
      return_5y: mf.return_5y || null,
      is_open_to_new_investors: mf.is_open_to_new_investors != null ? mf.is_open_to_new_investors : true,
      is_tradable: mf.is_tradable,
      // foreign key resolution
      mutual_fund: mf
    }));

    return { total, page: pg, page_size: ps, results: mapped };
  }

  getMutualFundDetails(mutualFundId) {
    const funds = this._getFromStorage('mutual_funds');
    const holdings = this._getFromStorage('mutual_fund_holdings');
    const mf = funds.find(f => f.id === mutualFundId) || null;

    let position = null;
    if (mf) {
      const holding = holdings.find(h => h.mutual_fund_id === mf.id) || null;
      if (holding) {
        const mv = holding.market_value || 0;
        const cb = holding.cost_basis_total || 0;
        const gain = typeof holding.unrealized_gain_loss === 'number' ? holding.unrealized_gain_loss : mv - cb;
        const gainPct = cb !== 0 ? (gain / cb) * 100 : 0;
        position = {
          holding_id: holding.id,
          quantity: holding.quantity,
          average_cost_per_share: holding.average_cost_per_share || null,
          cost_basis_total: cb,
          market_value: mv,
          unrealized_gain_loss: gain,
          unrealized_gain_loss_percent: gainPct
        };
      }
    }

    return { mutual_fund: mf, position };
  }

  getRecurringInvestmentPlansForFund(mutualFundId) {
    const plans = this._getFromStorage('recurring_investment_plans');
    const funds = this._getFromStorage('mutual_funds');
    return plans
      .filter(p => p.mutual_fund_id === mutualFundId)
      .map(p => ({
        ...p,
        // foreign key resolution
        mutual_fund: funds.find(f => f.id === p.mutual_fund_id) || null
      }));
  }

  createRecurringInvestmentPlan(mutualFundId, amount, frequency, day_of_month, start_date) {
    const funds = this._getFromStorage('mutual_funds');
    const mf = funds.find(f => f.id === mutualFundId);
    if (!mf) {
      return { plan: null, message: 'Mutual fund not found' };
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return { plan: null, message: 'amount must be > 0' };
    }
    const validFreq = ['monthly', 'weekly', 'quarterly', 'annually'];
    if (!validFreq.includes(frequency)) {
      return { plan: null, message: 'Invalid frequency' };
    }

    const plans = this._getFromStorage('recurring_investment_plans');
    const now = this._nowISO();
    const effectiveStart = start_date || this._computeNextRecurringInvestmentStartDate(frequency, day_of_month);

    const plan = {
      id: this._generateId('recur'),
      mutual_fund_id: mutualFundId,
      amount,
      frequency,
      day_of_month: frequency === 'monthly' ? day_of_month || null : null,
      start_date: effectiveStart,
      end_date: null,
      status: 'active',
      created_at: now,
      last_executed_at: null
    };

    plans.push(plan);
    this._saveToStorage('recurring_investment_plans', plans);

    return { plan, message: 'Recurring investment plan created' };
  }

  updateRecurringInvestmentPlan(planId, amount, frequency, day_of_month, status) {
    const plans = this._getFromStorage('recurring_investment_plans');
    const idx = plans.findIndex(p => p.id === planId);
    if (idx === -1) {
      return { plan: null, message: 'Recurring investment plan not found' };
    }
    const plan = plans[idx];

    if (typeof amount === 'number' && amount > 0) {
      plan.amount = amount;
    }
    if (typeof frequency === 'string') {
      plan.frequency = frequency;
    }
    if (typeof day_of_month === 'number') {
      plan.day_of_month = day_of_month;
    }
    if (typeof status === 'string') {
      plan.status = status;
    }

    plans[idx] = plan;
    this._saveToStorage('recurring_investment_plans', plans);
    return { plan, message: 'Recurring investment plan updated' };
  }

  cancelRecurringInvestmentPlan(planId) {
    const plans = this._getFromStorage('recurring_investment_plans');
    const idx = plans.findIndex(p => p.id === planId);
    if (idx === -1) {
      return { plan: null, message: 'Recurring investment plan not found' };
    }
    plans[idx].status = 'canceled';
    this._saveToStorage('recurring_investment_plans', plans);
    return { plan: plans[idx], message: 'Recurring investment plan canceled' };
  }

  // ----------------------
  // Trade order preview & placement
  // ----------------------

  previewTradeOrder(
    order_side,
    order_type,
    time_in_force,
    session,
    security_type,
    stockId,
    etfId,
    mutualFundId,
    quantity,
    notional_amount,
    limit_price,
    stop_price
  ) {
    const validation = this._validateAndBuildTradeOrderPayload(
      order_side,
      order_type,
      time_in_force,
      session,
      security_type,
      stockId,
      etfId,
      mutualFundId,
      quantity,
      notional_amount,
      limit_price,
      stop_price
    );

    const warnings = [];
    if (!validation.valid) {
      return {
        estimated_cost: 0,
        estimated_proceeds: 0,
        fees_estimate: 0,
        warnings: validation.errors
      };
    }

    let estimated_cost = 0;
    let estimated_proceeds = 0;

    if (security_type === 'stock') {
      const stocks = this._getFromStorage('stocks');
      let stock = stocks.find(s => s.id === stockId);

      // Fallback: approximate price from existing holding if stock quote is missing
      if (!stock) {
        const holdings = this._getFromStorage('stock_holdings');
        const holding = holdings.find(h => h.stock_id === stockId) || null;
        if (holding) {
          const approxPrice =
            holding.quantity ? (holding.market_value || 0) / holding.quantity : 0;
          stock = {
            id: stockId,
            symbol: holding.symbol,
            name: holding.name,
            current_price: approxPrice || 0,
            previous_close_price: approxPrice || 0
          };
        }
      }

      const refPrice =
        typeof limit_price === 'number' && (order_type === 'limit' || order_type === 'stop_limit')
          ? limit_price
          : stock
          ? stock.current_price || stock.previous_close_price || 0
          : 0;
      const qty = quantity || 0;
      const amt = qty * refPrice;
      if (order_side === 'buy') {
        estimated_cost = amt;
      } else {
        estimated_proceeds = amt;
      }
    } else if (security_type === 'etf' || security_type === 'mutual_fund') {
      if (typeof notional_amount === 'number' && notional_amount > 0) {
        if (order_side === 'buy') {
          estimated_cost = notional_amount;
        } else {
          estimated_proceeds = notional_amount;
        }
      } else {
        warnings.push('Price data unavailable; estimated amounts are 0 because only share quantity was provided.');
      }
    }

    const fees_estimate = 0;
    return { estimated_cost, estimated_proceeds, fees_estimate, warnings };
  }

  placeTradeOrder(
    order_side,
    order_type,
    time_in_force,
    session,
    security_type,
    stockId,
    etfId,
    mutualFundId,
    quantity,
    notional_amount,
    limit_price,
    stop_price
  ) {
    const validation = this._validateAndBuildTradeOrderPayload(
      order_side,
      order_type,
      time_in_force,
      session,
      security_type,
      stockId,
      etfId,
      mutualFundId,
      quantity,
      notional_amount,
      limit_price,
      stop_price
    );

    if (!validation.valid) {
      return {
        success: false,
        order: null,
        message: validation.errors.join('; ')
      };
    }

    const preview = this.previewTradeOrder(
      order_side,
      order_type,
      time_in_force,
      session,
      security_type,
      stockId,
      etfId,
      mutualFundId,
      quantity,
      notional_amount,
      limit_price,
      stop_price
    );

    const orders = this._getFromStorage('trade_orders');
    const order = {
      ...validation.payload,
      estimated_cost: preview.estimated_cost,
      estimated_proceeds: preview.estimated_proceeds
    };

    orders.push(order);
    this._saveToStorage('trade_orders', orders);

    return {
      success: true,
      order,
      message: 'Order placed (simulated, status=pending)'
    };
  }

  // ----------------------
  // Portfolio overview & holdings
  // ----------------------

  getPortfolioOverview() {
    const portfolios = this._getFromStorage('portfolios');
    const cashBalances = this._getFromStorage('cash_balances');

    let portfolio = null;
    if (portfolios.length > 0) {
      portfolio = portfolios
        .slice()
        .sort((a, b) => (b.total_market_value || 0) - (a.total_market_value || 0))[0];
    }

    const cash_balance_total = cashBalances.reduce((sum, cb) => sum + (cb.balance || 0), 0);

    const day_change_value = 0;
    const day_change_percent = 0;

    return {
      portfolio,
      day_change_value,
      day_change_percent,
      cash_balance_total
    };
  }

  getPortfolioHoldings(sort_by, sort_direction, asset_type) {
    const stocks = this._getFromStorage('stocks');
    const etfs = this._getFromStorage('etfs');
    const funds = this._getFromStorage('mutual_funds');

    const stockHoldings = this._getFromStorage('stock_holdings').map(h => {
      const stock = stocks.find(s => s.id === h.stock_id) || null;
      const mv = h.market_value || 0;
      const cb = h.cost_basis_total || 0;
      const gain = typeof h.unrealized_gain_loss === 'number' ? h.unrealized_gain_loss : mv - cb;
      const gainPct = cb !== 0 ? (gain / cb) * 100 : 0;
      return {
        holding_type: 'stock',
        holding_id: h.id,
        symbol: h.symbol,
        name: h.name || (stock ? stock.name : null),
        quantity: h.quantity,
        market_value: mv,
        cost_basis_total: cb,
        unrealized_gain_loss: gain,
        unrealized_gain_loss_percent: gainPct,
        stock_id: h.stock_id,
        etf_id: null,
        mutual_fund_id: null,
        sector_or_category: stock ? stock.sector : null,
        stock,
        etf: null,
        mutual_fund: null
      };
    });

    const etfHoldings = this._getFromStorage('etf_holdings').map(h => {
      const etf = etfs.find(e => e.id === h.etf_id) || null;
      const mv = h.market_value || 0;
      const cb = h.cost_basis_total || 0;
      const gain = typeof h.unrealized_gain_loss === 'number' ? h.unrealized_gain_loss : mv - cb;
      const gainPct = cb !== 0 ? (gain / cb) * 100 : 0;
      return {
        holding_type: 'etf',
        holding_id: h.id,
        symbol: h.symbol,
        name: h.name || (etf ? etf.name : null),
        quantity: h.quantity,
        market_value: mv,
        cost_basis_total: cb,
        unrealized_gain_loss: gain,
        unrealized_gain_loss_percent: gainPct,
        stock_id: null,
        etf_id: h.etf_id,
        mutual_fund_id: null,
        sector_or_category: etf ? etf.category || etf.asset_class : null,
        stock: null,
        etf,
        mutual_fund: null
      };
    });

    const fundHoldings = this._getFromStorage('mutual_fund_holdings').map(h => {
      const mf = funds.find(f => f.id === h.mutual_fund_id) || null;
      const mv = h.market_value || 0;
      const cb = h.cost_basis_total || 0;
      const gain = typeof h.unrealized_gain_loss === 'number' ? h.unrealized_gain_loss : mv - cb;
      const gainPct = cb !== 0 ? (gain / cb) * 100 : 0;
      return {
        holding_type: 'mutual_fund',
        holding_id: h.id,
        symbol: h.symbol,
        name: h.name || (mf ? mf.name : null),
        quantity: h.quantity,
        market_value: mv,
        cost_basis_total: cb,
        unrealized_gain_loss: gain,
        unrealized_gain_loss_percent: gainPct,
        stock_id: null,
        etf_id: null,
        mutual_fund_id: h.mutual_fund_id,
        sector_or_category: mf ? mf.category : null,
        stock: null,
        etf: null,
        mutual_fund: mf
      };
    });

    let all = [...stockHoldings, ...etfHoldings, ...fundHoldings];

    if (asset_type === 'stock' || asset_type === 'etf' || asset_type === 'mutual_fund') {
      all = all.filter(h => h.holding_type === asset_type);
    }

    const dir = sort_direction === 'asc' ? 1 : -1;
    switch (sort_by) {
      case 'market_value':
        all.sort((a, b) => ((a.market_value || 0) - (b.market_value || 0)) * dir);
        break;
      case 'symbol':
        all.sort((a, b) => a.symbol.localeCompare(b.symbol) * dir);
        break;
      case 'unrealized_gain_loss':
        all.sort((a, b) => ((a.unrealized_gain_loss || 0) - (b.unrealized_gain_loss || 0)) * dir);
        break;
      default:
        break;
    }

    return all;
  }

  // ----------------------
  // Cash & savings
  // ----------------------

  getCashAndSavingsOverview() {
    const brokerageCashEntity = this._getDefaultBrokerageCashAccount();
    const savingsPositions = this._getFromStorage('savings_positions');
    const products = this._getFromStorage('savings_products');
    const transfers = this._getFromStorage('cash_transfers');
    const cashBalances = this._getFromStorage('cash_balances');

    const brokerage_cash = brokerageCashEntity
      ? {
          cash_balance_id: brokerageCashEntity.id,
          name: brokerageCashEntity.name,
          balance: brokerageCashEntity.balance,
          currency: brokerageCashEntity.currency,
          cash_balance: brokerageCashEntity
        }
      : null;

    const savings_positions = savingsPositions.map(pos => ({
      position: pos,
      product: products.find(p => p.id === pos.savings_product_id) || null
    }));

    const recent_transfers = transfers.map(t => ({
      ...t,
      source_cash_balance:
        t.source_cash_balance_id
          ? cashBalances.find(cb => cb.id === t.source_cash_balance_id) || null
          : null,
      destination_cash_balance:
        t.destination_cash_balance_id
          ? cashBalances.find(cb => cb.id === t.destination_cash_balance_id) || null
          : null,
      source_savings_product:
        t.source_savings_product_id
          ? products.find(p => p.id === t.source_savings_product_id) || null
          : null,
      destination_savings_product:
        t.destination_savings_product_id
          ? products.find(p => p.id === t.destination_savings_product_id) || null
          : null
    }));

    return {
      brokerage_cash,
      savings_positions,
      recent_transfers
    };
  }

  searchSavingsProducts(filters, sort) {
    const all = this._getFromStorage('savings_products').filter(p => p.is_active);
    const f = filters || {};
    let results = all;

    if (typeof f.min_interest_rate === 'number') {
      results = results.filter(p => (p.interest_rate || 0) >= f.min_interest_rate);
    }
    if (Array.isArray(f.product_types) && f.product_types.length > 0) {
      const set = new Set(f.product_types);
      results = results.filter(p => set.has(p.product_type));
    }

    switch (sort) {
      case 'interest_rate_desc':
        results.sort((a, b) => (b.interest_rate || 0) - (a.interest_rate || 0));
        break;
      case 'minimum_balance_asc':
        results.sort(
          (a, b) => (a.minimum_balance || 0) - (b.minimum_balance || 0)
        );
        break;
      default:
        break;
    }

    return results;
  }

  moveCashToSavingsProduct(savingsProductId, amount) {
    const products = this._getFromStorage('savings_products');
    const product = products.find(p => p.id === savingsProductId && p.is_active);
    if (!product) {
      return { transfer: null, message: 'Savings product not found or inactive' };
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return { transfer: null, message: 'amount must be > 0' };
    }

    const cashBalances = this._getFromStorage('cash_balances');
    const brokerage = this._getDefaultBrokerageCashAccount();
    if (!brokerage) {
      return { transfer: null, message: 'No brokerage cash account available' };
    }
    if ((brokerage.balance || 0) < amount) {
      return { transfer: null, message: 'Insufficient brokerage cash balance' };
    }

    // Update brokerage cash balance
    const cbIdx = cashBalances.findIndex(cb => cb.id === brokerage.id);
    if (cbIdx !== -1) {
      cashBalances[cbIdx] = {
        ...cashBalances[cbIdx],
        balance: (cashBalances[cbIdx].balance || 0) - amount,
        last_updated: this._nowISO()
      };
    }

    // Update or create savings position
    const positions = this._getFromStorage('savings_positions');
    const posIdx = positions.findIndex(p => p.savings_product_id === savingsProductId);
    if (posIdx === -1) {
      positions.push({
        id: this._generateId('savpos'),
        savings_product_id: savingsProductId,
        account_name: product.name,
        current_balance: amount,
        last_updated: this._nowISO()
      });
    } else {
      positions[posIdx] = {
        ...positions[posIdx],
        current_balance: (positions[posIdx].current_balance || 0) + amount,
        last_updated: this._nowISO()
      };
    }

    // Create transfer record
    const transfers = this._getFromStorage('cash_transfers');
    const now = this._nowISO();
    const transfer = {
      id: this._generateId('cashtr'),
      source_type: 'brokerage_cash',
      source_cash_balance_id: brokerage.id,
      source_savings_product_id: null,
      destination_type: 'savings_product',
      destination_cash_balance_id: null,
      destination_savings_product_id: savingsProductId,
      amount,
      status: 'completed',
      created_at: now,
      completed_at: now
    };
    transfers.push(transfer);

    this._saveToStorage('cash_balances', cashBalances);
    this._saveToStorage('savings_positions', positions);
    this._saveToStorage('cash_transfers', transfers);

    return { transfer, message: 'Cash moved to savings product' };
  }

  // ----------------------
  // Dashboard content & support
  // ----------------------

  getAboutPageContent() {
    return this._getObjectFromStorage('about_page_content');
  }

  getHelpFaqs() {
    return this._getFromStorage('faqs');
  }

  getSupportContactInfo() {
    return this._getObjectFromStorage('support_contact_info');
  }

  getFeesAndPricing() {
    return this._getObjectFromStorage('fees_pricing');
  }

  getLegalDocuments() {
    return this._getObjectFromStorage('legal_documents');
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