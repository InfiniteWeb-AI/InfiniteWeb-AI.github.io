// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  _initStorage() {
    var arrayKeys = [
      'tokens',
      'staking_pools',
      'staking_positions',
      'stake_transactions',
      'unstake_transactions',
      'reward_programs',
      'reward_claims',
      'promotions',
      'promotion_applications',
      'governance_proposals',
      'governance_votes',
      'earnings_calculator_scenarios',
      'auto_stake_plans',
      'saved_portfolio_views',
      'users',
      'support_requests'
    ];
    for (var i = 0; i < arrayKeys.length; i++) {
      if (!localStorage.getItem(arrayKeys[i])) {
        localStorage.setItem(arrayKeys[i], '[]');
      }
    }

    if (!localStorage.getItem('session')) {
      localStorage.setItem('session', JSON.stringify({
        is_authenticated: false,
        username: null,
        display_name: ''
      }));
    }

    if (!localStorage.getItem('support_contact_options')) {
      localStorage.setItem('support_contact_options', JSON.stringify({
        email_addresses: [],
        chat_available: false,
        status_page_url: ''
      }));
    }

    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem('about_page_content', JSON.stringify({
        mission_text: '',
        vision_text: '',
        security_practices_text: '',
        supported_tokens: [],
        feature_overview: []
      }));
    }

    if (!localStorage.getItem('faq_entries')) {
      localStorage.setItem('faq_entries', JSON.stringify([]));
    }

    if (!localStorage.getItem('terms_of_use_content')) {
      localStorage.setItem('terms_of_use_content', JSON.stringify({
        last_updated: '',
        content_markdown: ''
      }));
    }

    if (!localStorage.getItem('privacy_policy_content')) {
      localStorage.setItem('privacy_policy_content', JSON.stringify({
        last_updated: '',
        content_markdown: ''
      }));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    var raw = localStorage.getItem(key);
    if (!raw) {
      if (typeof defaultValue !== 'undefined') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      if (typeof defaultValue !== 'undefined') {
        return JSON.parse(JSON.stringify(defaultValue));
      }
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    var raw = localStorage.getItem('idCounter');
    var current = parseInt(raw || '1000', 10);
    if (isNaN(current)) {
      current = 1000;
    }
    var next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _getOrCreateUserSession() {
    var raw = localStorage.getItem('session');
    if (!raw) {
      var session = {
        is_authenticated: false,
        username: null,
        display_name: ''
      };
      localStorage.setItem('session', JSON.stringify(session));
      return session;
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      var sessionFallback = {
        is_authenticated: false,
        username: null,
        display_name: ''
      };
      localStorage.setItem('session', JSON.stringify(sessionFallback));
      return sessionFallback;
    }
  }

  _saveUserSession(session) {
    localStorage.setItem('session', JSON.stringify(session));
  }

  _resolveTokenBySymbol(symbol) {
    if (!symbol) return null;
    var tokens = this._getFromStorage('tokens');
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i].symbol === symbol) return tokens[i];
    }
    return null;
  }

  _resolvePoolById(poolId) {
    if (!poolId) return null;
    var pools = this._getFromStorage('staking_pools');
    for (var i = 0; i < pools.length; i++) {
      if (pools[i].id === poolId) return pools[i];
    }
    return null;
  }

  _resolvePositionById(positionId) {
    if (!positionId) return null;
    var positions = this._getFromStorage('staking_positions');
    for (var i = 0; i < positions.length; i++) {
      if (positions[i].id === positionId) return positions[i];
    }
    return null;
  }

  _applyStakingPoolFilters(pools, filters) {
    if (!filters) return pools.slice();
    var tokenSymbols = filters.token_symbols || null;
    var minApy = typeof filters.min_apy_percent === 'number' ? filters.min_apy_percent : null;
    var maxApy = typeof filters.max_apy_percent === 'number' ? filters.max_apy_percent : null;
    var minLock = typeof filters.min_lock_duration_days === 'number' ? filters.min_lock_duration_days : null;
    var maxLock = typeof filters.max_lock_duration_days === 'number' ? filters.max_lock_duration_days : null;
    var lockTypes = filters.lock_types || null;
    var minFee = typeof filters.min_platform_fee_percent === 'number' ? filters.min_platform_fee_percent : null;
    var maxFee = typeof filters.max_platform_fee_percent === 'number' ? filters.max_platform_fee_percent : null;
    var rewardsTokenSymbols = filters.rewards_token_symbols || null;
    var statuses = filters.statuses || null;
    var promotionEligibleOnly = !!filters.promotion_eligible_only;

    return pools.filter(function (pool) {
      if (tokenSymbols && tokenSymbols.length && tokenSymbols.indexOf(pool.token_symbol) === -1) {
        return false;
      }
      if (minApy !== null && pool.apy_percent < minApy) return false;
      if (maxApy !== null && pool.apy_percent > maxApy) return false;
      if (minLock !== null && pool.lock_duration_days < minLock) return false;
      if (maxLock !== null && pool.lock_duration_days > maxLock) return false;
      if (lockTypes && lockTypes.length && lockTypes.indexOf(pool.lock_type) === -1) return false;
      if (minFee !== null && pool.platform_fee_percent < minFee) return false;
      if (maxFee !== null && pool.platform_fee_percent > maxFee) return false;
      if (rewardsTokenSymbols && rewardsTokenSymbols.length) {
        var anyReward = false;
        for (var i = 0; i < rewardsTokenSymbols.length; i++) {
          if (pool.rewards_token_options && pool.rewards_token_options.indexOf(rewardsTokenSymbols[i]) !== -1) {
            anyReward = true;
            break;
          }
        }
        if (!anyReward) return false;
      }
      if (statuses && statuses.length && statuses.indexOf(pool.status) === -1) return false;
      if (promotionEligibleOnly && !pool.promotion_eligible) return false;
      return true;
    });
  }

  _applyPortfolioFiltersAndSorting(positions, filters, sort) {
    var tokenSymbols = filters && (filters.token_symbols || filters.included_token_symbols) || null;
    var minApy = filters && typeof filters.min_apy_percent === 'number' ? filters.min_apy_percent : null;
    var maxApy = filters && typeof filters.max_apy_percent === 'number' ? filters.max_apy_percent : null;
    var minLock = filters && typeof filters.min_lock_duration_days === 'number' ? filters.min_lock_duration_days : null;
    var maxLock = filters && typeof filters.max_lock_duration_days === 'number' ? filters.max_lock_duration_days : null;
    var lockTypes = filters && (filters.lock_types || filters.included_lock_types) || null;
    var rewardsTokenSymbols = filters && (filters.rewards_token_symbols || filters.included_rewards_token_symbols) || null;
    var promotionFilter = filters && filters.promotion_filter ? filters.promotion_filter : 'any';

    var filtered = positions.filter(function (pos) {
      if (tokenSymbols && tokenSymbols.length && tokenSymbols.indexOf(pos.token_symbol) === -1) return false;
      if (minApy !== null && pos.apy_percent < minApy) return false;
      if (maxApy !== null && pos.apy_percent > maxApy) return false;
      if (minLock !== null && pos.lock_duration_days < minLock) return false;
      if (maxLock !== null && pos.lock_duration_days > maxLock) return false;
      if (lockTypes && lockTypes.length && lockTypes.indexOf(pos.lock_type) === -1) return false;
      if (rewardsTokenSymbols && rewardsTokenSymbols.length && rewardsTokenSymbols.indexOf(pos.rewards_token_symbol) === -1) return false;
      if (promotionFilter === 'with_active_promotion' && !pos.has_active_promotion) return false;
      if (promotionFilter === 'without_promotion' && pos.has_active_promotion) return false;
      return true;
    });

    if (sort && sort.sort_by) {
      var sortBy = sort.sort_by;
      var dir = sort.sort_direction === 'asc' ? 1 : -1;
      filtered.sort(function (a, b) {
        var av;
        var bv;
        if (sortBy === 'apy') {
          av = a.apy_percent || 0;
          bv = b.apy_percent || 0;
        } else if (sortBy === 'staked_amount') {
          av = a.staked_amount || 0;
          bv = b.staked_amount || 0;
        } else if (sortBy === 'lock_duration') {
          av = a.lock_duration_days || 0;
          bv = b.lock_duration_days || 0;
        } else if (sortBy === 'created_at') {
          av = new Date(a.created_at || 0).getTime();
          bv = new Date(b.created_at || 0).getTime();
        } else {
          av = 0;
          bv = 0;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    return filtered;
  }

  _calculateProjectedEarnings(stake_amount, apy_percent, duration_days, compounding_frequency) {
    if (!stake_amount || !apy_percent || !duration_days) return 0;
    var r = apy_percent / 100;
    var t = duration_days / 365;
    if (compounding_frequency === 'none') {
      return stake_amount * r * t;
    }
    var n;
    if (compounding_frequency === 'daily') {
      n = 365;
    } else if (compounding_frequency === 'weekly') {
      n = 52;
    } else if (compounding_frequency === 'monthly') {
      n = 12;
    } else {
      return stake_amount * r * t;
    }
    var amount = stake_amount * Math.pow(1 + r / n, n * t);
    return amount - stake_amount;
  }

  // Interface: login
  login(username, password) {
    var users = this._getFromStorage('users');
    var user = null;
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === username) {
        user = users[i];
        break;
      }
    }

    if (!user) {
      var now = new Date().toISOString();
      user = {
        id: this._generateId('user'),
        username: username,
        password: password,
        display_name: username,
        created_at: now
      };
      users.push(user);
      this._saveToStorage('users', users);
    } else if (user.password !== password) {
      var failedSession = {
        is_authenticated: false,
        username: null,
        display_name: ''
      };
      this._saveUserSession(failedSession);
      return {
        success: false,
        message: 'Invalid credentials',
        display_name: '',
        is_authenticated: false
      };
    }

    var session = {
      is_authenticated: true,
      username: user.username,
      display_name: user.display_name || user.username
    };
    this._saveUserSession(session);

    return {
      success: true,
      message: 'Login successful',
      display_name: session.display_name,
      is_authenticated: true
    };
  }

  // Interface: logout
  logout() {
    var session = {
      is_authenticated: false,
      username: null,
      display_name: ''
    };
    this._saveUserSession(session);
    return {
      success: true,
      message: 'Logged out'
    };
  }

  // Interface: getCurrentUserSummary
  getCurrentUserSummary() {
    var session = this._getOrCreateUserSession();
    if (!session.is_authenticated) {
      return {
        is_authenticated: false,
        display_name: '',
        total_portfolio_value_usd: 0,
        total_staked_value_usd: 0,
        available_balances: []
      };
    }

    var tokens = this._getFromStorage('tokens');

    var availableBalances = [];
    for (var j = 0; j < tokens.length; j++) {
      availableBalances.push({
        token_symbol: tokens[j].symbol,
        token_name: tokens[j].name,
        token_icon_url: tokens[j].icon_url || '',
        balance: 0,
        balance_formatted: '0'
      });
    }

    return {
      is_authenticated: true,
      display_name: session.display_name,
      total_portfolio_value_usd: 0,
      total_staked_value_usd: 0,
      available_balances: availableBalances
    };
  }

  // Interface: getHomeOverview
  getHomeOverview() {
    var positions = this._getFromStorage('staking_positions');
    var tokens = this._getFromStorage('tokens');

    var tokenMap = {};
    for (var i = 0; i < tokens.length; i++) {
      tokenMap[tokens[i].symbol] = tokens[i];
    }

    var totalApy = 0;
    for (var j = 0; j < positions.length; j++) {
      totalApy += positions[j].apy_percent || 0;
    }
    var avgApy = positions.length ? totalApy / positions.length : 0;

    var recent_earnings = [];

    var sortedPositions = positions.slice().sort(function (a, b) {
      var av = a.staked_amount || 0;
      var bv = b.staked_amount || 0;
      if (av < bv) return 1;
      if (av > bv) return -1;
      return 0;
    });
    var topCount = sortedPositions.length > 3 ? 3 : sortedPositions.length;
    var top_positions = [];
    for (var k = 0; k < topCount; k++) {
      var pos = sortedPositions[k];
      var token = tokenMap[pos.token_symbol] || {};
      top_positions.push({
        position: pos,
        token_name: token.name || pos.token_symbol,
        token_symbol: pos.token_symbol,
        token_icon_url: token.icon_url || '',
        current_apy_percent: pos.apy_percent || 0,
        current_apy_display: (pos.apy_percent || 0) + '%'
      });
    }

    return {
      portfolio_snapshot: {
        total_staked_value_usd: 0,
        total_estimated_apy_percent: avgApy,
        total_estimated_daily_rewards_usd: 0,
        position_count: positions.length
      },
      recent_earnings: recent_earnings,
      top_positions: top_positions
    };
  }

  // Interface: getFeaturedStakingPools
  getFeaturedStakingPools() {
    var pools = this._getFromStorage('staking_pools');
    var tokens = this._getFromStorage('tokens');
    var tokenMap = {};
    for (var i = 0; i < tokens.length; i++) {
      tokenMap[tokens[i].symbol] = tokens[i];
    }

    var activePools = pools.filter(function (p) {
      return p.status === 'active';
    });

    activePools.sort(function (a, b) {
      var av = a.apy_percent || 0;
      var bv = b.apy_percent || 0;
      if (av < bv) return 1;
      if (av > bv) return -1;
      return 0;
    });

    var count = activePools.length > 3 ? 3 : activePools.length;
    var result = [];
    for (var j = 0; j < count; j++) {
      var pool = activePools[j];
      var token = tokenMap[pool.token_symbol] || {};
      result.push({
        pool: pool,
        token_name: token.name || pool.token_symbol,
        token_icon_url: token.icon_url || '',
        highlight_reason: 'High APY',
        effective_apy_display: (pool.apy_percent || 0) + '%'
      });
    }
    return result;
  }

  // Interface: getFeaturedPromotions
  getFeaturedPromotions() {
    var promotions = this._getFromStorage('promotions');
    var active = promotions.filter(function (p) {
      return p.status === 'active';
    });
    return active;
  }

  // Interface: getFeaturedGovernanceProposals
  getFeaturedGovernanceProposals() {
    var proposals = this._getFromStorage('governance_proposals');
    var active = proposals.filter(function (p) {
      return p.status === 'active';
    });
    active.sort(function (a, b) {
      var av = new Date(a.voting_end_datetime || 0).getTime();
      var bv = new Date(b.voting_end_datetime || 0).getTime();
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    return active;
  }

  // Interface: getStakingPoolFilterOptions
  getStakingPoolFilterOptions() {
    var tokens = this._getFromStorage('tokens');
    var pools = this._getFromStorage('staking_pools');

    var apyMin = 0;
    var apyMax = 0;
    var lockMin = 0;
    var lockMax = 0;
    var feeMin = 0;
    var feeMax = 0;

    if (pools.length) {
      apyMin = pools[0].apy_percent;
      apyMax = pools[0].apy_percent;
      lockMin = pools[0].lock_duration_days;
      lockMax = pools[0].lock_duration_days;
      feeMin = pools[0].platform_fee_percent;
      feeMax = pools[0].platform_fee_percent;
      for (var i = 1; i < pools.length; i++) {
        var p = pools[i];
        if (p.apy_percent < apyMin) apyMin = p.apy_percent;
        if (p.apy_percent > apyMax) apyMax = p.apy_percent;
        if (p.lock_duration_days < lockMin) lockMin = p.lock_duration_days;
        if (p.lock_duration_days > lockMax) lockMax = p.lock_duration_days;
        if (p.platform_fee_percent < feeMin) feeMin = p.platform_fee_percent;
        if (p.platform_fee_percent > feeMax) feeMax = p.platform_fee_percent;
      }
    }

    var lock_types = [];
    var lockTypeSet = {};
    for (var j = 0; j < pools.length; j++) {
      if (!lockTypeSet[pools[j].lock_type]) {
        lockTypeSet[pools[j].lock_type] = true;
        lock_types.push(pools[j].lock_type);
      }
    }

    var rewardsTokenSymbolsSet = {};
    var rewards_tokens = [];
    for (var k = 0; k < pools.length; k++) {
      var pool = pools[k];
      if (pool.rewards_token_options && pool.rewards_token_options.length) {
        for (var m = 0; m < pool.rewards_token_options.length; m++) {
          var sym = pool.rewards_token_options[m];
          if (!rewardsTokenSymbolsSet[sym]) {
            rewardsTokenSymbolsSet[sym] = true;
            var token = this._resolveTokenBySymbol(sym) || { symbol: sym, name: sym };
            rewards_tokens.push(token);
          }
        }
      }
    }

    var sort_options = [
      { id: 'apy', label: 'APY' },
      { id: 'platform_fee', label: 'Platform fee' },
      { id: 'lock_duration', label: 'Lock duration' },
      { id: 'name', label: 'Name' }
    ];

    return {
      tokens: tokens,
      apy_range: {
        min_percent: apyMin,
        max_percent: apyMax,
        step_percent: 0.1
      },
      lock_duration_range_days: {
        min_days: lockMin,
        max_days: lockMax,
        step_days: 1
      },
      lock_types: lock_types,
      platform_fee_range: {
        min_percent: feeMin,
        max_percent: feeMax,
        step_percent: 0.01
      },
      rewards_tokens: rewards_tokens,
      sort_options: sort_options
    };
  }

  // Interface: getStakingPools
  getStakingPools(filters, sort, pagination) {
    var pools = this._getFromStorage('staking_pools');
    var tokens = this._getFromStorage('tokens');
    var tokenMap = {};
    for (var i = 0; i < tokens.length; i++) {
      tokenMap[tokens[i].symbol] = tokens[i];
    }

    var filtered = this._applyStakingPoolFilters(pools, filters || {});

    if (sort && sort.sort_by) {
      var sortBy = sort.sort_by;
      var dir = sort.sort_direction === 'asc' ? 1 : -1;
      filtered.sort(function (a, b) {
        var av;
        var bv;
        if (sortBy === 'apy') {
          av = a.apy_percent || 0;
          bv = b.apy_percent || 0;
        } else if (sortBy === 'platform_fee') {
          av = a.platform_fee_percent || 0;
          bv = b.platform_fee_percent || 0;
        } else if (sortBy === 'lock_duration') {
          av = a.lock_duration_days || 0;
          bv = b.lock_duration_days || 0;
        } else if (sortBy === 'name') {
          av = a.name || '';
          bv = b.name || '';
        } else {
          av = 0;
          bv = 0;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    var total_count = filtered.length;
    var page = pagination && pagination.page ? pagination.page : 1;
    var pageSize = pagination && pagination.page_size ? pagination.page_size : total_count;
    var start = (page - 1) * pageSize;
    var end = start + pageSize;
    var paged = filtered.slice(start, end);

    var result = [];
    for (var j = 0; j < paged.length; j++) {
      var pool = paged[j];
      var token = tokenMap[pool.token_symbol] || {};
      var lockLabel = pool.lock_type === 'flexible' ? 'Flexible' : (pool.lock_duration_days + ' days');
      result.push({
        pool: pool,
        token_name: token.name || pool.token_symbol,
        token_icon_url: token.icon_url || '',
        lock_duration_label: lockLabel,
        apy_display: (pool.apy_percent || 0) + '%',
        platform_fee_display: (pool.platform_fee_percent || 0) + '%',
        is_featured: false
      });
    }

    return {
      pools: result,
      total_count: total_count
    };
  }

  // Interface: getStakingPoolDetail
  getStakingPoolDetail(poolId) {
    var pool = this._resolvePoolById(poolId);
    if (!pool) {
      return {
        pool: null,
        token: null,
        lock_duration_label: '',
        apy_display: '',
        platform_fee_display: '',
        rewards_token_details: [],
        user_position: null,
        user_position_summary: null
      };
    }
    var token = this._resolveTokenBySymbol(pool.token_symbol);
    var lockLabel = pool.lock_type === 'flexible' ? 'Flexible' : (pool.lock_duration_days + ' days');
    var positions = this._getFromStorage('staking_positions');
    var userPosition = null;
    for (var i = 0; i < positions.length; i++) {
      if (positions[i].pool_id === pool.id) {
        userPosition = positions[i];
        break;
      }
    }

    var rewards_token_details = [];
    if (pool.rewards_token_options && pool.rewards_token_options.length) {
      for (var j = 0; j < pool.rewards_token_options.length; j++) {
        var sym = pool.rewards_token_options[j];
        var rt = this._resolveTokenBySymbol(sym);
        if (rt) rewards_token_details.push(rt);
      }
    }

    var user_position_summary = null;
    if (userPosition) {
      user_position_summary = {
        staked_amount_display: String(userPosition.staked_amount || 0),
        current_apy_percent: userPosition.apy_percent || 0,
        current_apy_display: (userPosition.apy_percent || 0) + '%',
        estimated_daily_rewards: 0
      };
    }

    return {
      pool: pool,
      token: token,
      lock_duration_label: lockLabel,
      apy_display: (pool.apy_percent || 0) + '%',
      platform_fee_display: (pool.platform_fee_percent || 0) + '%',
      rewards_token_details: rewards_token_details,
      user_position: userPosition,
      user_position_summary: user_position_summary
    };
  }

  // Interface: submitStake
  submitStake(poolId, amount, rewards_token_symbol, auto_compound_enabled, auto_compound_frequency) {
    var pool = this._resolvePoolById(poolId);
    if (!pool || pool.status !== 'active') {
      return {
        success: false,
        message: 'Invalid or inactive pool',
        stake_transaction: null,
        updated_position: null
      };
    }

    var stakeAmount = Number(amount);
    if (!stakeAmount || stakeAmount <= 0) {
      return {
        success: false,
        message: 'Invalid stake amount',
        stake_transaction: null,
        updated_position: null
      };
    }

    var positions = this._getFromStorage('staking_positions');
    var existingPosition = null;
    for (var i = 0; i < positions.length; i++) {
      if (positions[i].pool_id === pool.id) {
        existingPosition = positions[i];
        break;
      }
    }

    var now = new Date();
    var nowIso = now.toISOString();

    var autoEnabled = !!auto_compound_enabled && pool.auto_compound_supported;
    var autoFreq = 'none';
    if (autoEnabled) {
      autoFreq = auto_compound_frequency || pool.auto_compound_default_frequency || 'daily';
      if (autoFreq === 'none') {
        autoEnabled = false;
      }
    }

    var rewardsTokenSymbol = rewards_token_symbol || pool.default_rewards_token_symbol || pool.token_symbol;
    if (pool.rewards_token_options && pool.rewards_token_options.length && pool.rewards_token_options.indexOf(rewardsTokenSymbol) === -1) {
      rewardsTokenSymbol = pool.rewards_token_options[0];
    }

    var position;
    var transactionType;
    if (existingPosition) {
      existingPosition.staked_amount = (existingPosition.staked_amount || 0) + stakeAmount;
      if (typeof auto_compound_enabled !== 'undefined') {
        existingPosition.auto_compound_enabled = autoEnabled;
        existingPosition.auto_compound_frequency = autoEnabled ? autoFreq : 'none';
      }
      existingPosition.last_updated = nowIso;
      position = existingPosition;
      transactionType = 'restake';
    } else {
      var lockEnd = null;
      if (pool.lock_type === 'fixed' && pool.lock_duration_days > 0) {
        lockEnd = new Date(now.getTime() + pool.lock_duration_days * 24 * 60 * 60 * 1000).toISOString();
      }
      position = {
        id: this._generateId('position'),
        pool_id: pool.id,
        token_symbol: pool.token_symbol,
        staked_amount: stakeAmount,
        rewards_token_symbol: rewardsTokenSymbol,
        base_apy_percent: pool.apy_percent,
        apy_percent: pool.apy_percent,
        lock_type: pool.lock_type,
        lock_duration_days: pool.lock_duration_days,
        lock_start_datetime: nowIso,
        lock_end_datetime: lockEnd,
        auto_compound_enabled: autoEnabled,
        auto_compound_frequency: autoEnabled ? autoFreq : 'none',
        has_active_promotion: false,
        created_at: nowIso,
        last_updated: nowIso
      };
      positions.push(position);
      transactionType = 'stake';
    }

    this._saveToStorage('staking_positions', positions);

    var stakeTransactions = this._getFromStorage('stake_transactions');
    var stakeTransaction = {
      id: this._generateId('stake_tx'),
      pool_id: pool.id,
      position_id: position.id,
      token_symbol: pool.token_symbol,
      amount: stakeAmount,
      rewards_token_symbol: rewardsTokenSymbol,
      auto_compound_enabled: autoEnabled,
      auto_compound_frequency: autoEnabled ? autoFreq : 'none',
      transaction_type: transactionType,
      status: 'completed',
      created_at: nowIso,
      completed_at: nowIso
    };
    stakeTransactions.push(stakeTransaction);
    this._saveToStorage('stake_transactions', stakeTransactions);

    return {
      success: true,
      message: 'Stake submitted',
      stake_transaction: stakeTransaction,
      updated_position: position
    };
  }

  // Interface: getStakeTransactionStatus
  getStakeTransactionStatus(stakeTransactionId) {
    var stakeTransactions = this._getFromStorage('stake_transactions');
    var tx = null;
    for (var i = 0; i < stakeTransactions.length; i++) {
      if (stakeTransactions[i].id === stakeTransactionId) {
        tx = stakeTransactions[i];
        break;
      }
    }
    if (!tx) return null;
    var pool = this._resolvePoolById(tx.pool_id);
    var position = this._resolvePositionById(tx.position_id);
    return Object.assign({}, tx, {
      pool: pool || null,
      position: position || null
    });
  }

  // Interface: createAutoStakePlan
  createAutoStakePlan(poolId, token_symbol, stake_amount_per_occurrence, frequency, occurrence_count, start_date) {
    var pool = this._resolvePoolById(poolId);
    if (!pool) {
      return null;
    }
    var amount = Number(stake_amount_per_occurrence);
    var occ = Number(occurrence_count);
    if (!amount || amount <= 0 || !occ || occ <= 0) {
      return null;
    }

    var startDate = new Date(start_date);
    if (isNaN(startDate.getTime())) {
      return null;
    }
    var endDate = null;
    var msPerDay = 24 * 60 * 60 * 1000;
    if (frequency === 'daily') {
      endDate = new Date(startDate.getTime() + (occ - 1) * msPerDay).toISOString();
    } else if (frequency === 'weekly') {
      endDate = new Date(startDate.getTime() + (occ - 1) * 7 * msPerDay).toISOString();
    } else if (frequency === 'monthly') {
      endDate = new Date(startDate.getTime() + (occ - 1) * 30 * msPerDay).toISOString();
    }

    var nowIso = new Date().toISOString();
    var plans = this._getFromStorage('auto_stake_plans');
    var plan = {
      id: this._generateId('auto_stake_plan'),
      pool_id: pool.id,
      token_symbol: token_symbol,
      stake_amount_per_occurrence: amount,
      frequency: frequency,
      occurrence_count: occ,
      start_date: startDate.toISOString(),
      end_date: endDate,
      status: 'active',
      created_at: nowIso,
      last_run_at: null
    };
    plans.push(plan);
    this._saveToStorage('auto_stake_plans', plans);
    return plan;
  }

  // Interface: getPortfolioSummary
  getPortfolioSummary() {
    var positions = this._getFromStorage('staking_positions');
    var totalApy = 0;
    for (var i = 0; i < positions.length; i++) {
      totalApy += positions[i].apy_percent || 0;
    }
    var avgApy = positions.length ? totalApy / positions.length : 0;
    return {
      total_positions: positions.length,
      total_staked_value_usd: 0,
      average_apy_percent: avgApy,
      total_estimated_daily_rewards_usd: 0
    };
  }

  // Interface: getPortfolioFilterOptions
  getPortfolioFilterOptions() {
    var tokens = this._getFromStorage('tokens');
    var positions = this._getFromStorage('staking_positions');

    var rewardsTokenSymbolsSet = {};
    var rewards_tokens = [];
    for (var i = 0; i < positions.length; i++) {
      var sym = positions[i].rewards_token_symbol;
      if (sym && !rewardsTokenSymbolsSet[sym]) {
        rewardsTokenSymbolsSet[sym] = true;
        var token = this._resolveTokenBySymbol(sym) || { symbol: sym, name: sym };
        rewards_tokens.push(token);
      }
    }

    var apyMin = 0;
    var apyMax = 0;
    var lockMin = 0;
    var lockMax = 0;
    if (positions.length) {
      apyMin = positions[0].apy_percent;
      apyMax = positions[0].apy_percent;
      lockMin = positions[0].lock_duration_days;
      lockMax = positions[0].lock_duration_days;
      for (var j = 1; j < positions.length; j++) {
        var p = positions[j];
        if (p.apy_percent < apyMin) apyMin = p.apy_percent;
        if (p.apy_percent > apyMax) apyMax = p.apy_percent;
        if (p.lock_duration_days < lockMin) lockMin = p.lock_duration_days;
        if (p.lock_duration_days > lockMax) lockMax = p.lock_duration_days;
      }
    }

    var lock_types = [];
    var lockTypeSet = {};
    for (var k = 0; k < positions.length; k++) {
      if (!lockTypeSet[positions[k].lock_type]) {
        lockTypeSet[positions[k].lock_type] = true;
        lock_types.push(positions[k].lock_type);
      }
    }

    var promotion_filter_options = ['any', 'with_active_promotion', 'without_promotion'];

    return {
      tokens: tokens,
      rewards_tokens: rewards_tokens,
      apy_range: {
        min_percent: apyMin,
        max_percent: apyMax,
        step_percent: 0.1
      },
      lock_duration_range_days: {
        min_days: lockMin,
        max_days: lockMax,
        step_days: 1
      },
      lock_types: lock_types,
      promotion_filter_options: promotion_filter_options
    };
  }

  // Interface: getPortfolioPositions
  getPortfolioPositions(filters, sort) {
    var positions = this._getFromStorage('staking_positions');
    var pools = this._getFromStorage('staking_pools');
    var tokens = this._getFromStorage('tokens');

    var poolMap = {};
    for (var i = 0; i < pools.length; i++) {
      poolMap[pools[i].id] = pools[i];
    }
    var tokenMap = {};
    for (var j = 0; j < tokens.length; j++) {
      tokenMap[tokens[j].symbol] = tokens[j];
    }

    var filtered = this._applyPortfolioFiltersAndSorting(positions, filters || {}, sort || null);

    var result = [];
    var now = new Date();
    for (var k = 0; k < filtered.length; k++) {
      var pos = filtered[k];
      var pool = poolMap[pos.pool_id] || null;
      var token = tokenMap[pos.token_symbol] || null;
      var lockRemainingDays = 0;
      var lockRemainingDisplay = 'Unlocked';
      if (pos.lock_type === 'fixed' && pos.lock_end_datetime) {
        var end = new Date(pos.lock_end_datetime);
        var diffMs = end.getTime() - now.getTime();
        var days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
        if (days < 0) days = 0;
        lockRemainingDays = days;
        lockRemainingDisplay = days + ' days';
      }

      var rewardsTokenName = '';
      if (pos.rewards_token_symbol) {
        var rt = tokenMap[pos.rewards_token_symbol];
        rewardsTokenName = rt ? rt.name : pos.rewards_token_symbol;
      }

      result.push({
        position: pos,
        pool: pool,
        token: token,
        staked_amount_display: String(pos.staked_amount || 0),
        lock_remaining_days: lockRemainingDays,
        lock_remaining_display: lockRemainingDisplay,
        apy_display: (pos.apy_percent || 0) + '%',
        rewards_token_name: rewardsTokenName,
        has_active_promotion: !!pos.has_active_promotion
      });
    }

    return result;
  }

  // Interface: getStakingPositionDetail
  getStakingPositionDetail(positionId) {
    var position = this._resolvePositionById(positionId);
    if (!position) {
      return {
        position: null,
        pool: null,
        token: null,
        current_apy_display: '',
        lock_remaining_days: 0,
        lock_remaining_display: '',
        eligible_withdrawal_types: [],
        active_promotions: []
      };
    }
    var pool = this._resolvePoolById(position.pool_id);
    var token = this._resolveTokenBySymbol(position.token_symbol);

    var now = new Date();
    var lockRemainingDays = 0;
    var lockRemainingDisplay = 'Unlocked';
    if (position.lock_type === 'fixed' && position.lock_end_datetime) {
      var end = new Date(position.lock_end_datetime);
      var diffMs = end.getTime() - now.getTime();
      var days = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
      if (days < 0) days = 0;
      lockRemainingDays = days;
      lockRemainingDisplay = days + ' days';
    }

    var eligible_withdrawal_types;
    if (position.lock_type === 'flexible') {
      eligible_withdrawal_types = ['standard', 'instant'];
    } else {
      eligible_withdrawal_types = ['standard'];
    }

    var promotionApps = this._getFromStorage('promotion_applications');
    var promotions = this._getFromStorage('promotions');
    var active_promotions = [];
    for (var i = 0; i < promotionApps.length; i++) {
      var app = promotionApps[i];
      if (app.position_id === position.id && app.status === 'active') {
        for (var j = 0; j < promotions.length; j++) {
          if (promotions[j].id === app.promotion_id) {
            active_promotions.push(promotions[j]);
            break;
          }
        }
      }
    }

    return {
      position: position,
      pool: pool,
      token: token,
      current_apy_display: (position.apy_percent || 0) + '%',
      lock_remaining_days: lockRemainingDays,
      lock_remaining_display: lockRemainingDisplay,
      eligible_withdrawal_types: eligible_withdrawal_types,
      active_promotions: active_promotions
    };
  }

  // Interface: submitUnstake
  submitUnstake(positionId, amount, withdrawal_type) {
    var position = this._resolvePositionById(positionId);
    if (!position) {
      return {
        success: false,
        message: 'Position not found',
        unstake_transaction: null,
        updated_position: null
      };
    }
    var unstakeAmount = Number(amount);
    if (!unstakeAmount || unstakeAmount <= 0) {
      return {
        success: false,
        message: 'Invalid unstake amount',
        unstake_transaction: null,
        updated_position: null
      };
    }
    if (unstakeAmount > position.staked_amount) {
      return {
        success: false,
        message: 'Unstake amount exceeds staked amount',
        unstake_transaction: null,
        updated_position: null
      };
    }

    position.staked_amount = position.staked_amount - unstakeAmount;
    position.last_updated = new Date().toISOString();

    var positions = this._getFromStorage('staking_positions');
    for (var i = 0; i < positions.length; i++) {
      if (positions[i].id === position.id) {
        positions[i] = position;
        break;
      }
    }
    this._saveToStorage('staking_positions', positions);

    var unstakeTransactions = this._getFromStorage('unstake_transactions');
    var nowIso = new Date().toISOString();
    var tx = {
      id: this._generateId('unstake_tx'),
      position_id: position.id,
      pool_id: position.pool_id,
      token_symbol: position.token_symbol,
      amount: unstakeAmount,
      withdrawal_type: withdrawal_type,
      status: 'completed',
      requested_at: nowIso,
      completed_at: nowIso
    };
    unstakeTransactions.push(tx);
    this._saveToStorage('unstake_transactions', unstakeTransactions);

    return {
      success: true,
      message: 'Unstake submitted',
      unstake_transaction: tx,
      updated_position: position
    };
  }

  // Interface: getUnstakeTransactionStatus
  getUnstakeTransactionStatus(unstakeTransactionId) {
    var txs = this._getFromStorage('unstake_transactions');
    var tx = null;
    for (var i = 0; i < txs.length; i++) {
      if (txs[i].id === unstakeTransactionId) {
        tx = txs[i];
        break;
      }
    }
    if (!tx) return null;
    var pool = this._resolvePoolById(tx.pool_id);
    var position = this._resolvePositionById(tx.position_id);
    return Object.assign({}, tx, {
      pool: pool || null,
      position: position || null
    });
  }

  // Interface: savePortfolioView
  savePortfolioView(name, filters, sort) {
    var nowIso = new Date().toISOString();
    var views = this._getFromStorage('saved_portfolio_views');
    var view = {
      id: this._generateId('portfolio_view'),
      name: name,
      min_apy_percent: filters && typeof filters.min_apy_percent === 'number' ? filters.min_apy_percent : null,
      max_apy_percent: filters && typeof filters.max_apy_percent === 'number' ? filters.max_apy_percent : null,
      min_lock_duration_days: filters && typeof filters.min_lock_duration_days === 'number' ? filters.min_lock_duration_days : null,
      max_lock_duration_days: filters && typeof filters.max_lock_duration_days === 'number' ? filters.max_lock_duration_days : null,
      included_lock_types: filters && filters.included_lock_types ? filters.included_lock_types.slice() : null,
      included_rewards_token_symbols: filters && filters.included_rewards_token_symbols ? filters.included_rewards_token_symbols.slice() : null,
      included_token_symbols: filters && filters.included_token_symbols ? filters.included_token_symbols.slice() : null,
      promotion_filter: filters && filters.promotion_filter ? filters.promotion_filter : 'any',
      sort_by: sort && sort.sort_by ? sort.sort_by : null,
      sort_direction: sort && sort.sort_direction ? sort.sort_direction : null,
      created_at: nowIso
    };
    views.push(view);
    this._saveToStorage('saved_portfolio_views', views);
    return view;
  }

  // Interface: getSavedPortfolioViews
  getSavedPortfolioViews() {
    return this._getFromStorage('saved_portfolio_views');
  }

  // Interface: loadSavedPortfolioView
  loadSavedPortfolioView(savedViewId) {
    var views = this._getFromStorage('saved_portfolio_views');
    var view = null;
    for (var i = 0; i < views.length; i++) {
      if (views[i].id === savedViewId) {
        view = views[i];
        break;
      }
    }
    if (!view) {
      return {
        view: null,
        positions: []
      };
    }
    var positions = this._getFromStorage('staking_positions');
    var pools = this._getFromStorage('staking_pools');
    var tokens = this._getFromStorage('tokens');

    var poolMap = {};
    for (var j = 0; j < pools.length; j++) {
      poolMap[pools[j].id] = pools[j];
    }
    var tokenMap = {};
    for (var k = 0; k < tokens.length; k++) {
      tokenMap[tokens[k].symbol] = tokens[k];
    }

    var filters = {
      min_apy_percent: view.min_apy_percent,
      max_apy_percent: view.max_apy_percent,
      min_lock_duration_days: view.min_lock_duration_days,
      max_lock_duration_days: view.max_lock_duration_days,
      included_lock_types: view.included_lock_types,
      included_rewards_token_symbols: view.included_rewards_token_symbols,
      included_token_symbols: view.included_token_symbols,
      promotion_filter: view.promotion_filter
    };
    var sort = {
      sort_by: view.sort_by,
      sort_direction: view.sort_direction
    };

    var filteredPositions = this._applyPortfolioFiltersAndSorting(positions, filters, sort);
    var resultPositions = [];
    for (var m = 0; m < filteredPositions.length; m++) {
      var pos = filteredPositions[m];
      resultPositions.push({
        position: pos,
        pool: poolMap[pos.pool_id] || null,
        token: tokenMap[pos.token_symbol] || null
      });
    }

    return {
      view: view,
      positions: resultPositions
    };
  }

  // Interface: getRewardsOverview
  getRewardsOverview() {
    var programs = this._getFromStorage('reward_programs');
    var totalEarned = 0;
    var totalClaimed = 0;
    var totalUnclaimed = 0;
    for (var i = 0; i < programs.length; i++) {
      totalEarned += programs[i].total_points_earned || 0;
      totalClaimed += programs[i].total_points_claimed || 0;
      totalUnclaimed += programs[i].unclaimed_points || 0;
    }
    return {
      total_points_earned: totalEarned,
      total_points_claimed: totalClaimed,
      total_unclaimed_points: totalUnclaimed
    };
  }

  // Interface: getUnclaimedRewardPrograms
  getUnclaimedRewardPrograms(sort_by_unclaimed_points_desc) {
    var programs = this._getFromStorage('reward_programs');
    var unclaimed = programs.filter(function (p) {
      return (p.unclaimed_points || 0) > 0;
    });
    if (sort_by_unclaimed_points_desc) {
      unclaimed.sort(function (a, b) {
        var av = a.unclaimed_points || 0;
        var bv = b.unclaimed_points || 0;
        if (av < bv) return 1;
        if (av > bv) return -1;
        return 0;
      });
    }
    return unclaimed;
  }

  // Interface: getRewardProgramDetail
  getRewardProgramDetail(programId) {
    var programs = this._getFromStorage('reward_programs');
    for (var i = 0; i < programs.length; i++) {
      if (programs[i].id === programId) return programs[i];
    }
    return null;
  }

  // Interface: submitRewardClaim
  submitRewardClaim(programId, points_to_claim) {
    var programs = this._getFromStorage('reward_programs');
    var program = null;
    for (var i = 0; i < programs.length; i++) {
      if (programs[i].id === programId) {
        program = programs[i];
        break;
      }
    }
    if (!program || (program.unclaimed_points || 0) <= 0) {
      return {
        claim: null,
        updated_program: program
      };
    }

    var available = program.unclaimed_points || 0;
    var points = typeof points_to_claim === 'number' && points_to_claim > 0 ? points_to_claim : available;
    if (points > available) points = available;

    var nowIso = new Date().toISOString();
    var claims = this._getFromStorage('reward_claims');
    var claim = {
      id: this._generateId('reward_claim'),
      program_id: program.id,
      points_claimed: points,
      claimed_at: nowIso,
      status: 'completed',
      notes: null
    };
    claims.push(claim);
    this._saveToStorage('reward_claims', claims);

    program.unclaimed_points = available - points;
    program.total_points_claimed = (program.total_points_claimed || 0) + points;
    program.last_updated = nowIso;

    for (var j = 0; j < programs.length; j++) {
      if (programs[j].id === program.id) {
        programs[j] = program;
        break;
      }
    }
    this._saveToStorage('reward_programs', programs);

    return {
      claim: claim,
      updated_program: program
    };
  }

  // Interface: getRewardClaimHistory
  getRewardClaimHistory(limit, offset) {
    var claims = this._getFromStorage('reward_claims');
    var programs = this._getFromStorage('reward_programs');
    var programMap = {};
    for (var i = 0; i < programs.length; i++) {
      programMap[programs[i].id] = programs[i];
    }

    claims.sort(function (a, b) {
      var av = new Date(a.claimed_at || 0).getTime();
      var bv = new Date(b.claimed_at || 0).getTime();
      if (av < bv) return 1;
      if (av > bv) return -1;
      return 0;
    });

    var off = typeof offset === 'number' && offset > 0 ? offset : 0;
    var lim = typeof limit === 'number' && limit > 0 ? limit : claims.length;
    var sliced = claims.slice(off, off + lim);

    return sliced.map(function (c) {
      return Object.assign({}, c, {
        program: programMap[c.program_id] || null
      });
    });
  }

  // Interface: getPromotionFilterOptions
  getPromotionFilterOptions() {
    var tokens = this._getFromStorage('tokens');
    var promotions = this._getFromStorage('promotions');

    var apyMin = 0;
    var apyMax = 0;
    var durMin = 0;
    var durMax = 0;
    if (promotions.length) {
      apyMin = promotions[0].apy_boost_percent || 0;
      apyMax = promotions[0].apy_boost_percent || 0;
      durMin = promotions[0].promotion_duration_days || 0;
      durMax = promotions[0].promotion_duration_days || 0;
      for (var i = 1; i < promotions.length; i++) {
        var p = promotions[i];
        var apy = p.apy_boost_percent || 0;
        var dur = p.promotion_duration_days || 0;
        if (apy < apyMin) apyMin = apy;
        if (apy > apyMax) apyMax = apy;
        if (dur < durMin) durMin = dur;
        if (dur > durMax) durMax = dur;
      }
    }

    var promotion_types = ['boosted_apy', 'fee_discount', 'bonus_rewards'];

    return {
      tokens: tokens,
      promotion_types: promotion_types,
      apy_boost_range: {
        min_percent: apyMin,
        max_percent: apyMax,
        step_percent: 0.1
      },
      promotion_duration_range_days: {
        min_days: durMin,
        max_days: durMax,
        step_days: 1
      }
    };
  }

  // Interface: getPromotions
  getPromotions(filters, sort) {
    var promotions = this._getFromStorage('promotions');
    var tokenSymbols = filters && filters.token_symbols || null;
    var types = filters && filters.promotion_types || null;
    var minBoost = filters && typeof filters.min_apy_boost_percent === 'number' ? filters.min_apy_boost_percent : null;
    var minDur = filters && typeof filters.min_promotion_duration_days === 'number' ? filters.min_promotion_duration_days : null;
    var statuses = filters && filters.statuses || null;

    var filtered = promotions.filter(function (p) {
      if (tokenSymbols && tokenSymbols.length && tokenSymbols.indexOf(p.token_symbol) === -1) return false;
      if (types && types.length && types.indexOf(p.promotion_type) === -1) return false;
      if (minBoost !== null && (p.apy_boost_percent || 0) < minBoost) return false;
      if (minDur !== null && (p.promotion_duration_days || 0) < minDur) return false;
      if (statuses && statuses.length && statuses.indexOf(p.status) === -1) return false;
      return true;
    });

    if (sort && sort.sort_by) {
      var sortBy = sort.sort_by;
      var dir = sort.sort_direction === 'asc' ? 1 : -1;
      filtered.sort(function (a, b) {
        var av;
        var bv;
        if (sortBy === 'apy_boost') {
          av = a.apy_boost_percent || 0;
          bv = b.apy_boost_percent || 0;
        } else if (sortBy === 'promotion_duration') {
          av = a.promotion_duration_days || 0;
          bv = b.promotion_duration_days || 0;
        } else if (sortBy === 'end_datetime') {
          av = new Date(a.end_datetime || 0).getTime();
          bv = new Date(b.end_datetime || 0).getTime();
        } else {
          av = 0;
          bv = 0;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    return filtered;
  }

  // Interface: getPromotionDetail
  getPromotionDetail(promotionId) {
    var promotions = this._getFromStorage('promotions');
    for (var i = 0; i < promotions.length; i++) {
      if (promotions[i].id === promotionId) return promotions[i];
    }
    return null;
  }

  // Interface: getPromotionEligiblePositions
  getPromotionEligiblePositions(promotionId, sort) {
    var promotion = this.getPromotionDetail(promotionId);
    if (!promotion) return [];

    var positions = this._getFromStorage('staking_positions');
    var pools = this._getFromStorage('staking_pools');
    var tokens = this._getFromStorage('tokens');

    var poolMap = {};
    for (var i = 0; i < pools.length; i++) {
      poolMap[pools[i].id] = pools[i];
    }
    var tokenMap = {};
    for (var j = 0; j < tokens.length; j++) {
      tokenMap[tokens[j].symbol] = tokens[j];
    }

    var now = new Date();
    var eligible = [];
    for (var k = 0; k < positions.length; k++) {
      var pos = positions[k];
      if (pos.token_symbol !== promotion.token_symbol) continue;
      var pool = poolMap[pos.pool_id];
      if (!pool || !pool.promotion_eligible) continue;
      if (promotion.status !== 'active') continue;
      var start = new Date(promotion.start_datetime);
      var end = new Date(promotion.end_datetime);
      if (now < start || now > end) continue;
      var meetsMin = true;
      if (typeof promotion.min_staked_amount === 'number') {
        meetsMin = (pos.staked_amount || 0) >= promotion.min_staked_amount;
      }
      eligible.push({
        position: pos,
        pool: pool,
        token: tokenMap[pos.token_symbol] || null,
        staked_amount_display: String(pos.staked_amount || 0),
        meets_min_staked_amount: meetsMin
      });
    }

    if (sort && sort.sort_by) {
      var sortBy = sort.sort_by;
      var dir = sort.sort_direction === 'asc' ? 1 : -1;
      eligible.sort(function (a, b) {
        var av;
        var bv;
        if (sortBy === 'staked_amount') {
          av = a.position.staked_amount || 0;
          bv = b.position.staked_amount || 0;
        } else if (sortBy === 'apy') {
          av = a.position.apy_percent || 0;
          bv = b.position.apy_percent || 0;
        } else if (sortBy === 'lock_duration') {
          av = a.position.lock_duration_days || 0;
          bv = b.position.lock_duration_days || 0;
        } else {
          av = 0;
          bv = 0;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    return eligible;
  }

  // Interface: applyPromotionToPosition
  applyPromotionToPosition(promotionId, positionId) {
    var promotion = this.getPromotionDetail(promotionId);
    var position = this._resolvePositionById(positionId);
    if (!promotion || !position) {
      return {
        promotion_application: null,
        updated_position: position || null
      };
    }

    var nowIso = new Date().toISOString();
    var apps = this._getFromStorage('promotion_applications');
    var effectiveBoost = promotion.apy_boost_percent || 0;

    var app = {
      id: this._generateId('promotion_app'),
      promotion_id: promotion.id,
      position_id: position.id,
      applied_at: nowIso,
      status: 'active',
      effective_apy_boost_percent: effectiveBoost
    };
    apps.push(app);
    this._saveToStorage('promotion_applications', apps);

    position.has_active_promotion = true;
    position.apy_percent = (position.base_apy_percent || 0) + effectiveBoost;
    position.last_updated = nowIso;

    var positions = this._getFromStorage('staking_positions');
    for (var i = 0; i < positions.length; i++) {
      if (positions[i].id === position.id) {
        positions[i] = position;
        break;
      }
    }
    this._saveToStorage('staking_positions', positions);

    return {
      promotion_application: app,
      updated_position: position
    };
  }

  // Interface: getGovernanceFilterOptions
  getGovernanceFilterOptions() {
    var proposals = this._getFromStorage('governance_proposals');
    var quorumMin = 0;
    var quorumMax = 0;
    if (proposals.length) {
      quorumMin = proposals[0].quorum_requirement_percent || 0;
      quorumMax = proposals[0].quorum_requirement_percent || 0;
      for (var i = 1; i < proposals.length; i++) {
        var q = proposals[i].quorum_requirement_percent || 0;
        if (q < quorumMin) quorumMin = q;
        if (q > quorumMax) quorumMax = q;
      }
    }
    var statuses = ['draft', 'active', 'passed', 'rejected', 'expired'];
    return {
      statuses: statuses,
      quorum_requirement_range_percent: {
        min_percent: quorumMin,
        max_percent: quorumMax,
        step_percent: 1
      }
    };
  }

  // Interface: getGovernanceProposals
  getGovernanceProposals(filters, sort) {
    var proposals = this._getFromStorage('governance_proposals');
    var statuses = filters && filters.statuses || null;
    var endingWithin = filters && typeof filters.ending_within_days === 'number' ? filters.ending_within_days : null;
    var minQuorum = filters && typeof filters.min_quorum_requirement_percent === 'number' ? filters.min_quorum_requirement_percent : null;

    var now = new Date();
    var filtered = proposals.filter(function (p) {
      if (statuses && statuses.length && statuses.indexOf(p.status) === -1) return false;
      if (endingWithin !== null) {
        var end = new Date(p.voting_end_datetime);
        var diffMs = end.getTime() - now.getTime();
        var days = diffMs / (24 * 60 * 60 * 1000);
        if (days < 0 || days > endingWithin) return false;
      }
      if (minQuorum !== null && (p.quorum_requirement_percent || 0) < minQuorum) return false;
      return true;
    });

    if (sort && sort.sort_by) {
      var sortBy = sort.sort_by;
      var dir = sort.sort_direction === 'asc' ? 1 : -1;
      filtered.sort(function (a, b) {
        var av;
        var bv;
        if (sortBy === 'ending_soonest') {
          av = new Date(a.voting_end_datetime || 0).getTime();
          bv = new Date(b.voting_end_datetime || 0).getTime();
        } else if (sortBy === 'quorum_requirement') {
          av = a.quorum_requirement_percent || 0;
          bv = b.quorum_requirement_percent || 0;
        } else {
          av = 0;
          bv = 0;
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    return filtered;
  }

  // Interface: getGovernanceProposalDetail
  getGovernanceProposalDetail(proposalId) {
    var proposals = this._getFromStorage('governance_proposals');
    for (var i = 0; i < proposals.length; i++) {
      if (proposals[i].id === proposalId) return proposals[i];
    }
    return null;
  }

  // Interface: getGovernanceVotingPowerSummary
  getGovernanceVotingPowerSummary() {
    var positions = this._getFromStorage('staking_positions');
    var stakingPower = 0;
    for (var i = 0; i < positions.length; i++) {
      if (positions[i].token_symbol === 'LUMA') {
        stakingPower += positions[i].staked_amount || 0;
      }
    }
    return {
      total_voting_power_luma: stakingPower,
      staking_balance_power_luma: stakingPower,
      wallet_balance_power_luma: 0,
      delegated_power_luma: 0
    };
  }

  // Interface: castGovernanceVote
  castGovernanceVote(proposalId, choice, voting_power_luma, voting_power_source) {
    var proposals = this._getFromStorage('governance_proposals');
    var proposalExists = false;
    for (var i = 0; i < proposals.length; i++) {
      if (proposals[i].id === proposalId) {
        proposalExists = true;
        break;
      }
    }
    if (!proposalExists) return null;

    var nowIso = new Date().toISOString();
    var votes = this._getFromStorage('governance_votes');
    var vote = {
      id: this._generateId('gov_vote'),
      proposal_id: proposalId,
      choice: choice,
      voting_power_luma: Number(voting_power_luma) || 0,
      voting_power_source: voting_power_source,
      submitted_at: nowIso,
      status: 'completed'
    };
    votes.push(vote);
    this._saveToStorage('governance_votes', votes);
    return vote;
  }

  // Interface: getEarningsCalculatorOptions
  getEarningsCalculatorOptions() {
    var tokens = this._getFromStorage('tokens');
    return {
      supported_tokens: tokens,
      default_compounding_frequency: 'daily',
      max_simulation_duration_days: 3650
    };
  }

  // Interface: runEarningsSimulation
  runEarningsSimulation(poolId, token_symbol, stake_amount, duration_days, compounding_frequency) {
    var pool = this._resolvePoolById(poolId);
    if (!pool) {
      return {
        apy_percent: 0,
        projected_earnings: 0,
        projection_token_symbol: token_symbol
      };
    }
    var apy = pool.apy_percent || 0;
    var earnings = this._calculateProjectedEarnings(Number(stake_amount) || 0, apy, Number(duration_days) || 0, compounding_frequency);
    return {
      apy_percent: apy,
      projected_earnings: earnings,
      projection_token_symbol: token_symbol
    };
  }

  // Interface: saveEarningsScenario
  saveEarningsScenario(name, poolId, token_symbol, stake_amount, duration_days, apy_percent, compounding_frequency, projected_earnings, projection_token_symbol) {
    var scenarios = this._getFromStorage('earnings_calculator_scenarios');
    var nowIso = new Date().toISOString();
    var scenario = {
      id: this._generateId('earnings_scenario'),
      name: name,
      token_symbol: token_symbol,
      pool_id: poolId,
      stake_amount: Number(stake_amount) || 0,
      duration_days: Number(duration_days) || 0,
      apy_percent: Number(apy_percent) || 0,
      compounding_frequency: compounding_frequency,
      projected_earnings: Number(projected_earnings) || 0,
      projection_token_symbol: projection_token_symbol,
      created_at: nowIso
    };
    scenarios.push(scenario);
    this._saveToStorage('earnings_calculator_scenarios', scenarios);
    return scenario;
  }

  // Interface: getSavedEarningsScenarios
  getSavedEarningsScenarios() {
    var scenarios = this._getFromStorage('earnings_calculator_scenarios');
    var pools = this._getFromStorage('staking_pools');
    var tokens = this._getFromStorage('tokens');
    var poolMap = {};
    for (var i = 0; i < pools.length; i++) {
      poolMap[pools[i].id] = pools[i];
    }
    var tokenMap = {};
    for (var j = 0; j < tokens.length; j++) {
      tokenMap[tokens[j].symbol] = tokens[j];
    }
    return scenarios.map(function (s) {
      return Object.assign({}, s, {
        pool: poolMap[s.pool_id] || null,
        token: tokenMap[s.token_symbol] || null
      });
    });
  }

  // Interface: getEarningsScenarioDetail
  getEarningsScenarioDetail(scenarioId) {
    var scenarios = this._getFromStorage('earnings_calculator_scenarios');
    var scenario = null;
    for (var i = 0; i < scenarios.length; i++) {
      if (scenarios[i].id === scenarioId) {
        scenario = scenarios[i];
        break;
      }
    }
    if (!scenario) return null;
    var pool = this._resolvePoolById(scenario.pool_id);
    var token = this._resolveTokenBySymbol(scenario.token_symbol);
    return Object.assign({}, scenario, {
      pool: pool || null,
      token: token || null
    });
  }

  // Interface: getAboutPageContent
  getAboutPageContent() {
    return this._getFromStorage('about_page_content', {
      mission_text: '',
      vision_text: '',
      security_practices_text: '',
      supported_tokens: [],
      feature_overview: []
    });
  }

  // Interface: getFaqEntries
  getFaqEntries() {
    return this._getFromStorage('faq_entries', []);
  }

  // Interface: submitSupportRequest
  submitSupportRequest(email, subject, message, category) {
    var requests = this._getFromStorage('support_requests');
    var nowIso = new Date().toISOString();
    var ticket = {
      id: this._generateId('support'),
      email: email,
      subject: subject,
      message: message,
      category: category || null,
      created_at: nowIso,
      status: 'open'
    };
    requests.push(ticket);
    this._saveToStorage('support_requests', requests);
    return {
      success: true,
      ticket_id: ticket.id,
      message: 'Support request submitted'
    };
  }

  // Interface: getSupportContactOptions
  getSupportContactOptions() {
    var raw = localStorage.getItem('support_contact_options');
    if (!raw) {
      return {
        email_addresses: [],
        chat_available: false,
        status_page_url: ''
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {
        email_addresses: [],
        chat_available: false,
        status_page_url: ''
      };
    }
  }

  // Interface: getTermsOfUseContent
  getTermsOfUseContent() {
    var raw = localStorage.getItem('terms_of_use_content');
    if (!raw) {
      return {
        last_updated: '',
        content_markdown: ''
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {
        last_updated: '',
        content_markdown: ''
      };
    }
  }

  // Interface: getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    var raw = localStorage.getItem('privacy_policy_content');
    if (!raw) {
      return {
        last_updated: '',
        content_markdown: ''
      };
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {
        last_updated: '',
        content_markdown: ''
      };
    }
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
