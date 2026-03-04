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
      store = store || {};
      store[key] = String(value);
    },
    removeItem: function (key) {
      store = store || {};
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

  // ----------------------------
  // Storage helpers
  // ----------------------------

  _initStorage() {
    const tableKeys = [
      'stablecoins',
      'watchlist_items',
      'stablecoin_comparison_sets',
      'tools',
      'yield_projections',
      'conversion_quotes',
      'tags',
      'articles',
      'reading_list_items',
      'risk_quizzes',
      'risk_quiz_questions',
      'risk_quiz_options',
      'risk_quiz_completions',
      'risk_profile_results',
      'risk_profile_recommendations',
      'help_articles',
      'support_requests',
      'newsletter_subscriptions'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) return Array.isArray(defaultValue) ? [] : defaultValue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null || typeof parsed === 'undefined') {
        return Array.isArray(defaultValue) ? [] : defaultValue;
      }
      return parsed;
    } catch (e) {
      return Array.isArray(defaultValue) ? [] : defaultValue;
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

  _getNowIso() {
    return new Date().toISOString();
  }

  // ----------------------------
  // Private domain helpers
  // ----------------------------

  _getOrCreateWatchlistStore() {
    let items = this._getFromStorage('watchlist_items');
    if (!Array.isArray(items)) items = [];
    this._saveToStorage('watchlist_items', items);
    return items;
  }

  _getOrCreateReadingListStore() {
    let items = this._getFromStorage('reading_list_items');
    if (!Array.isArray(items)) items = [];
    this._saveToStorage('reading_list_items', items);
    return items;
  }

  _getOrCreateComparisonSetStore() {
    let items = this._getFromStorage('stablecoin_comparison_sets');
    if (!Array.isArray(items)) items = [];
    this._saveToStorage('stablecoin_comparison_sets', items);
    return items;
  }

  _persistRiskQuizCompletion(completion) {
    const completions = this._getFromStorage('risk_quiz_completions');
    completions.push(completion);
    this._saveToStorage('risk_quiz_completions', completions);
    return completion;
  }

  _persistNewsletterSubscription(subscription) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);
    return subscription;
  }

  _getCurrentSavedItemsSnapshot() {
    const watchlistItems = this._getFromStorage('watchlist_items');
    const readingListItems = this._getFromStorage('reading_list_items');
    const stablecoins = this._getFromStorage('stablecoins');
    const articles = this._getFromStorage('articles');

    const watchlist = watchlistItems.map((item) => ({
      watchlist_item_id: item.id,
      added_at: item.added_at,
      source: item.source,
      stablecoin: stablecoins.find((s) => s.id === item.stablecoin_id) || null
    }));

    const reading_list = readingListItems.map((item) => ({
      reading_list_item_id: item.id,
      saved_at: item.saved_at,
      source: item.source,
      article: articles.find((a) => a.id === item.article_id) || null
    }));

    return { watchlist, reading_list };
  }

  _getWatchlistIdSet() {
    const watchlistItems = this._getFromStorage('watchlist_items');
    const set = new Set();
    for (const item of watchlistItems) {
      if (item && item.stablecoin_id) set.add(item.stablecoin_id);
    }
    return set;
  }

  _getReadingListArticleIdSet() {
    const readingListItems = this._getFromStorage('reading_list_items');
    const set = new Set();
    for (const item of readingListItems) {
      if (item && item.article_id) set.add(item.article_id);
    }
    return set;
  }

  _sortByDateDesc(items, field) {
    return items.slice().sort((a, b) => {
      const da = a && a[field] ? new Date(a[field]).getTime() : 0;
      const db = b && b[field] ? new Date(b[field]).getTime() : 0;
      return db - da;
    });
  }

  _validateEmail(email) {
    if (typeof email !== 'string') return false;
    // Simple email pattern
    return /.+@.+\..+/.test(email);
  }

  // ----------------------------
  // Interface implementations
  // ----------------------------

  // getHomePageData()
  getHomePageData() {
    const stablecoins = this._getFromStorage('stablecoins');
    const articles = this._getFromStorage('articles');
    const tags = this._getFromStorage('tags');
    const watchlistIdSet = this._getWatchlistIdSet();
    const readingListIdSet = this._getReadingListArticleIdSet();
    const riskQuizzes = this._getFromStorage('risk_quizzes');

    const featured_stablecoins = stablecoins
      .filter((s) => s.is_featured && s.status === 'active')
      .map((s) => ({
        id: s.id,
        name: s.name,
        symbol: s.symbol,
        peg_currency: s.peg_currency,
        market_cap_usd: s.market_cap_usd,
        risk_score: s.risk_score,
        base_apy_percent: s.base_apy_percent,
        status: s.status,
        is_featured: !!s.is_featured,
        is_in_watchlist: watchlistIdSet.has(s.id)
      }));

    const featured_articles_raw = articles.filter((a) => a.is_featured);
    const featured_articles_sorted = this._sortByDateDesc(featured_articles_raw, 'publication_date');
    const featured_articles = featured_articles_sorted.map((a) => {
      const tagNames = (a.tag_ids || [])
        .map((tid) => {
          const t = tags.find((tg) => tg.id === tid);
          return t ? t.name : null;
        })
        .filter((x) => !!x);
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        content_type: a.content_type,
        level: a.level,
        reading_time_minutes: a.reading_time_minutes,
        rating: a.rating,
        summary: a.summary,
        publication_date: a.publication_date,
        tag_names: tagNames,
        is_saved: readingListIdSet.has(a.id)
      };
    });

    const recent_news_raw = articles.filter((a) => a.content_type === 'news');
    const recent_news_sorted = this._sortByDateDesc(recent_news_raw, 'publication_date').slice(0, 5);
    const recent_news = recent_news_sorted.map((a) => {
      const tagNames = (a.tag_ids || [])
        .map((tid) => {
          const t = tags.find((tg) => tg.id === tid);
          return t ? t.name : null;
        })
        .filter((x) => !!x);
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        publication_date: a.publication_date,
        region: a.region,
        category: a.category,
        tag_names: tagNames
      };
    });

    const activeQuiz = riskQuizzes.find((q) => q.status === 'active') || null;
    const active_risk_quiz = activeQuiz
      ? {
          id: activeQuiz.id,
          title: activeQuiz.title,
          description: activeQuiz.description,
          estimated_time_minutes: activeQuiz.estimated_time_minutes
        }
      : null;

    const newsletter_highlight = {
      title: 'Stay ahead of stablecoin risk',
      description: 'Get weekly insights on market caps, peg stability, and regulatory changes for leading stablecoins.',
      cta_label: 'Subscribe to newsletter'
    };

    return {
      hero_title: 'Understand Stablecoins Before You Use Them',
      hero_subtitle: 'Data-driven insights on USD, EUR, and GBP stablecoins.',
      hero_body:
        'Explore market caps, risk scores, yields, and regulatory news to make more informed decisions about stablecoins.',
      featured_stablecoins,
      featured_articles,
      recent_news,
      active_risk_quiz,
      newsletter_highlight
    };
  }

  // getStablecoinDirectoryView(pegCurrencies, minRiskScore, maxRiskScore, minMarketCapUsd, maxMarketCapUsd, sortBy, page, pageSize)
  getStablecoinDirectoryView(pegCurrencies, minRiskScore, maxRiskScore, minMarketCapUsd, maxMarketCapUsd, sortBy, page, pageSize) {
    let items = this._getFromStorage('stablecoins');
    const watchlistIdSet = this._getWatchlistIdSet();

    // Filters
    if (Array.isArray(pegCurrencies) && pegCurrencies.length > 0) {
      const set = new Set(pegCurrencies);
      items = items.filter((s) => set.has(s.peg_currency));
    }

    if (typeof minRiskScore === 'number') {
      items = items.filter((s) => typeof s.risk_score === 'number' && s.risk_score >= minRiskScore);
    }

    if (typeof maxRiskScore === 'number') {
      items = items.filter((s) => typeof s.risk_score === 'number' && s.risk_score <= maxRiskScore);
    }

    if (typeof minMarketCapUsd === 'number') {
      items = items.filter((s) => typeof s.market_cap_usd === 'number' && s.market_cap_usd >= minMarketCapUsd);
    }

    if (typeof maxMarketCapUsd === 'number') {
      items = items.filter((s) => typeof s.market_cap_usd === 'number' && s.market_cap_usd <= maxMarketCapUsd);
    }

    // Only active stablecoins in directory
    items = items.filter((s) => s.status === 'active');

    // Sorting
    const sortKey = sortBy || 'market_cap_desc';
    items = items.slice();
    items.sort((a, b) => {
      const mcA = typeof a.market_cap_usd === 'number' ? a.market_cap_usd : 0;
      const mcB = typeof b.market_cap_usd === 'number' ? b.market_cap_usd : 0;
      const rsA = typeof a.risk_score === 'number' ? a.risk_score : Infinity;
      const rsB = typeof b.risk_score === 'number' ? b.risk_score : Infinity;
      const apyA = typeof a.base_apy_percent === 'number' ? a.base_apy_percent : 0;
      const apyB = typeof b.base_apy_percent === 'number' ? b.base_apy_percent : 0;

      switch (sortKey) {
        case 'market_cap_asc':
          return mcA - mcB;
        case 'risk_score_asc':
          return rsA - rsB;
        case 'risk_score_desc':
          return rsB - rsA;
        case 'apy_desc':
          return apyB - apyA;
        case 'apy_asc':
          return apyA - apyB;
        case 'name_asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'market_cap_desc':
        default:
          return mcB - mcA;
      }
    });

    const total_count = items.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const pagedItems = items.slice(start, start + size).map((s) => ({
      id: s.id,
      name: s.name,
      symbol: s.symbol,
      peg_currency: s.peg_currency,
      market_cap_usd: s.market_cap_usd,
      risk_score: s.risk_score,
      base_apy_percent: s.base_apy_percent,
      status: s.status,
      is_featured: !!s.is_featured,
      is_in_watchlist: watchlistIdSet.has(s.id)
    }));

    // Available filters metadata
    const allActive = this._getFromStorage('stablecoins').filter((s) => s.status === 'active');
    const pegSet = new Set();
    let riskMin = null;
    let riskMax = null;
    let mcMin = null;
    let mcMax = null;
    for (const s of allActive) {
      if (s.peg_currency) pegSet.add(s.peg_currency);
      if (typeof s.risk_score === 'number') {
        if (riskMin === null || s.risk_score < riskMin) riskMin = s.risk_score;
        if (riskMax === null || s.risk_score > riskMax) riskMax = s.risk_score;
      }
      if (typeof s.market_cap_usd === 'number') {
        if (mcMin === null || s.market_cap_usd < mcMin) mcMin = s.market_cap_usd;
        if (mcMax === null || s.market_cap_usd > mcMax) mcMax = s.market_cap_usd;
      }
    }

    const available_filters = {
      peg_currencies: Array.from(pegSet),
      risk_score_min: riskMin,
      risk_score_max: riskMax,
      market_cap_min: mcMin,
      market_cap_max: mcMax
    };

    return {
      items: pagedItems,
      total_count,
      page: currentPage,
      page_size: size,
      available_filters
    };
  }

  // getStablecoinDetail(stablecoinId)
  getStablecoinDetail(stablecoinId) {
    const stablecoins = this._getFromStorage('stablecoins');
    const s = stablecoins.find((x) => x.id === stablecoinId);
    if (!s) {
      return null;
    }
    const watchlistIdSet = this._getWatchlistIdSet();

    return {
      id: s.id,
      name: s.name,
      symbol: s.symbol,
      peg_currency: s.peg_currency,
      market_cap_usd: s.market_cap_usd,
      risk_score: s.risk_score,
      base_apy_percent: s.base_apy_percent,
      issuer_name: s.issuer_name,
      peg_mechanism: s.peg_mechanism,
      reserves_summary: s.reserves_summary,
      fees_summary: s.fees_summary,
      notable_risks: s.notable_risks,
      redemption_guidance: s.redemption_guidance,
      website_url: s.website_url,
      is_featured: !!s.is_featured,
      status: s.status,
      last_updated: s.last_updated,
      is_in_watchlist: watchlistIdSet.has(s.id),
      recommendation_context: s.recommendation_context || null
    };
  }

  // toggleStablecoinWatchlist(stablecoinId, source)
  toggleStablecoinWatchlist(stablecoinId, source) {
    const validSources = new Set(['directory', 'stablecoin_detail', 'risk_quiz']);
    const src = validSources.has(source) ? source : 'directory';

    let items = this._getOrCreateWatchlistStore();
    const existingIndex = items.findIndex((w) => w.stablecoin_id === stablecoinId);
    let action;
    let watchlist_item = null;

    if (existingIndex >= 0) {
      if (src === 'risk_quiz') {
        const existing = items[existingIndex];
        action = 'added';
        watchlist_item = existing || null;
      } else {
        const removed = items.splice(existingIndex, 1)[0];
        action = 'removed';
        watchlist_item = removed || null;
      }
    } else {
      const newItem = {
        id: this._generateId('watchlist'),
        stablecoin_id: stablecoinId,
        added_at: this._getNowIso(),
        source: src
      };
      items.push(newItem);
      action = 'added';
      watchlist_item = newItem;
    }

    this._saveToStorage('watchlist_items', items);

    return {
      success: true,
      action,
      watchlist_item,
      total_watchlist_count: items.length
    };
  }

  // createStablecoinComparisonSet(stablecoinIds)
  createStablecoinComparisonSet(stablecoinIds) {
    const idsArray = Array.isArray(stablecoinIds) ? stablecoinIds : [];
    const uniqueIds = Array.from(new Set(idsArray));

    const comparisonSets = this._getOrCreateComparisonSetStore();
    const now = this._getNowIso();
    const newSet = {
      id: this._generateId('comp'),
      stablecoin_ids: uniqueIds,
      created_at: now,
      last_updated: now
    };
    comparisonSets.push(newSet);
    this._saveToStorage('stablecoin_comparison_sets', comparisonSets);

    const stablecoins = this._getFromStorage('stablecoins');
    const included = stablecoins.filter((s) => uniqueIds.includes(s.id));

    return {
      comparison_set_id: newSet.id,
      created_at: newSet.created_at,
      stablecoins: included.map((s) => ({
        id: s.id,
        name: s.name,
        symbol: s.symbol,
        peg_currency: s.peg_currency,
        market_cap_usd: s.market_cap_usd,
        risk_score: s.risk_score,
        base_apy_percent: s.base_apy_percent,
        fees_summary: s.fees_summary,
        notable_risks: s.notable_risks,
        status: s.status
      }))
    };
  }

  // getStablecoinComparisonSet(comparisonSetId)
  getStablecoinComparisonSet(comparisonSetId) {
    const comparisonSets = this._getFromStorage('stablecoin_comparison_sets');
    const set = comparisonSets.find((cs) => cs.id === comparisonSetId);
    if (!set) {
      return null;
    }

    const stablecoins = this._getFromStorage('stablecoins');
    const included = stablecoins.filter((s) => (set.stablecoin_ids || []).includes(s.id));

    return {
      comparison_set_id: set.id,
      created_at: set.created_at,
      last_updated: set.last_updated,
      stablecoins: included.map((s) => ({
        id: s.id,
        name: s.name,
        symbol: s.symbol,
        peg_currency: s.peg_currency,
        market_cap_usd: s.market_cap_usd,
        risk_score: s.risk_score,
        base_apy_percent: s.base_apy_percent,
        fees_summary: s.fees_summary,
        notable_risks: s.notable_risks,
        status: s.status
      }))
    };
  }

  // removeStablecoinFromComparisonSet(comparisonSetId, stablecoinId)
  removeStablecoinFromComparisonSet(comparisonSetId, stablecoinId) {
    const comparisonSets = this._getFromStorage('stablecoin_comparison_sets');
    const idx = comparisonSets.findIndex((cs) => cs.id === comparisonSetId);
    if (idx === -1) {
      return {
        success: false,
        comparison_set_id: null,
        stablecoins: []
      };
    }
    const set = comparisonSets[idx];
    set.stablecoin_ids = (set.stablecoin_ids || []).filter((id) => id !== stablecoinId);
    set.last_updated = this._getNowIso();
    comparisonSets[idx] = set;
    this._saveToStorage('stablecoin_comparison_sets', comparisonSets);

    const stablecoins = this._getFromStorage('stablecoins');
    const included = stablecoins.filter((s) => (set.stablecoin_ids || []).includes(s.id));

    return {
      success: true,
      comparison_set_id: set.id,
      stablecoins: included.map((s) => ({
        id: s.id,
        name: s.name,
        symbol: s.symbol,
        peg_currency: s.peg_currency,
        market_cap_usd: s.market_cap_usd,
        risk_score: s.risk_score,
        base_apy_percent: s.base_apy_percent,
        fees_summary: s.fees_summary,
        notable_risks: s.notable_risks,
        status: s.status
      }))
    };
  }

  // getToolsList()
  getToolsList() {
    const tools = this._getFromStorage('tools');
    const activeTools = tools.filter((t) => t.is_active !== false);
    activeTools.sort((a, b) => {
      const soA = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const soB = typeof b.sort_order === 'number' ? b.sort_order : 0;
      if (soA !== soB) return soA - soB;
      return (a.name || '').localeCompare(b.name || '');
    });
    return { tools: activeTools };
  }

  // getYieldCalculatorOptions()
  getYieldCalculatorOptions() {
    const stablecoins = this._getFromStorage('stablecoins');
    const options = stablecoins
      .filter((s) => s.status === 'active')
      .map((s) => ({
        id: s.id,
        name: s.name,
        symbol: s.symbol,
        peg_currency: s.peg_currency,
        risk_score: s.risk_score,
        base_apy_percent: s.base_apy_percent,
        status: s.status
      }));
    return { stablecoins: options };
  }

  // calculateYieldProjection(stablecoinId, investmentAmountUsd, durationMonths, compoundingFrequency)
  calculateYieldProjection(stablecoinId, investmentAmountUsd, durationMonths, compoundingFrequency) {
    const stablecoins = this._getFromStorage('stablecoins');
    const s = stablecoins.find((x) => x.id === stablecoinId);
    const apy = s && typeof s.base_apy_percent === 'number' ? s.base_apy_percent : 0;

    const principal = typeof investmentAmountUsd === 'number' ? investmentAmountUsd : 0;
    const months = typeof durationMonths === 'number' ? durationMonths : 0;
    const freq = compoundingFrequency || 'none';

    let periods = 0;
    let ratePerPeriod = 0;

    if (apy > 0) {
      const annualRate = apy / 100;
      switch (freq) {
        case 'daily':
          periods = Math.round(months * 365 / 12);
          ratePerPeriod = annualRate / 365;
          break;
        case 'weekly':
          periods = Math.round(months * 52 / 12);
          ratePerPeriod = annualRate / 52;
          break;
        case 'monthly':
          periods = Math.round(months);
          ratePerPeriod = annualRate / 12;
          break;
        case 'quarterly':
          periods = Math.round(months / 3);
          ratePerPeriod = annualRate / 4;
          break;
        case 'yearly':
          periods = Math.max(1, Math.round(months / 12));
          ratePerPeriod = annualRate;
          break;
        case 'none':
        default:
          periods = 1;
          ratePerPeriod = annualRate * (months / 12);
          break;
      }
    } else {
      periods = 1;
      ratePerPeriod = 0;
    }

    const breakdown = [];
    let balance = principal;

    if (freq === 'none') {
      const interest = principal * (apy / 100) * (months / 12);
      breakdown.push({
        period_label: 'End of period',
        period_index: 1,
        starting_balance: principal,
        interest_earned: interest,
        ending_balance: principal + interest
      });
      balance = principal + interest;
    } else {
      for (let i = 1; i <= periods; i++) {
        const starting = balance;
        const interest = starting * ratePerPeriod;
        balance = starting + interest;
        breakdown.push({
          period_label: 'Period ' + i,
          period_index: i,
          starting_balance: starting,
          interest_earned: interest,
          ending_balance: balance
        });
      }
    }

    const projected_balance_end = balance;
    const total_interest_earned = projected_balance_end - principal;

    const projection = {
      id: this._generateId('yieldproj'),
      stablecoin_id: stablecoinId,
      stablecoin_name_snapshot: s ? s.name : '',
      apy_percent_used: apy,
      investment_amount_usd: principal,
      duration_months: months,
      compounding_frequency: freq,
      projected_balance_end,
      total_interest_earned,
      breakdown,
      created_at: this._getNowIso()
    };

    const projections = this._getFromStorage('yield_projections');
    projections.push(projection);
    this._saveToStorage('yield_projections', projections);

    return projection;
  }

  // getConversionToolOptions()
  getConversionToolOptions() {
    const stablecoins = this._getFromStorage('stablecoins');
    const active = stablecoins.filter((s) => s.status === 'active');
    const from_stablecoins = active.map((s) => ({
      id: s.id,
      name: s.name,
      symbol: s.symbol,
      peg_currency: s.peg_currency,
      status: s.status
    }));
    const to_stablecoins = from_stablecoins.slice();
    return { from_stablecoins, to_stablecoins };
  }

  // getConversionQuote(fromStablecoinId, toStablecoinId, fromAmount, slippageTolerancePercent)
  getConversionQuote(fromStablecoinId, toStablecoinId, fromAmount, slippageTolerancePercent) {
    const stablecoins = this._getFromStorage('stablecoins');
    const from = stablecoins.find((s) => s.id === fromStablecoinId) || null;
    const to = stablecoins.find((s) => s.id === toStablecoinId) || null;

    const amount = typeof fromAmount === 'number' ? fromAmount : 0;
    const slippage = typeof slippageTolerancePercent === 'number' ? slippageTolerancePercent : 0;

    // Simple simulated rate: default 1.0 if no external FX data available
    let price_rate = 1;
    if (from && to && from.peg_currency && to.peg_currency && from.peg_currency === to.peg_currency) {
      price_rate = 1;
    }

    const grossTo = amount * price_rate;
    const feeRate = 0.001; // 0.1% fee simulation
    const fee_amount = grossTo * feeRate;
    const afterFee = grossTo - fee_amount;
    const slippageLoss = afterFee * (slippage / 100);
    const estimated_to_amount = afterFee - slippageLoss;
    const effective_rate = amount > 0 ? estimated_to_amount / amount : 0;

    const quote = {
      id: this._generateId('convquote'),
      from_stablecoin_id: fromStablecoinId,
      to_stablecoin_id: toStablecoinId,
      from_amount: amount,
      slippage_tolerance_percent: slippage,
      price_rate,
      estimated_to_amount,
      fee_amount,
      effective_rate,
      breakdown: [
        {
          label: 'Base rate',
          type: 'rate',
          amount: price_rate,
          currency: to ? to.symbol : '',
          description: 'Simulated quote rate based on peg currencies.'
        },
        {
          label: 'Estimated fees',
          type: 'fee',
          amount: fee_amount,
          currency: to ? to.symbol : '',
          description: 'Simulated fee at 0.1% of destination amount.'
        },
        {
          label: 'Max slippage impact',
          type: 'slippage',
          amount: slippageLoss,
          currency: to ? to.symbol : '',
          description: 'Potential reduction assuming full slippage tolerance is used.'
        }
      ],
      created_at: this._getNowIso()
    };

    const quotes = this._getFromStorage('conversion_quotes');
    quotes.push(quote);
    this._saveToStorage('conversion_quotes', quotes);

    // Foreign key resolution: include full stablecoin objects
    return {
      ...quote,
      from_stablecoin: from,
      to_stablecoin: to
    };
  }

  // getEducationFilterOptions()
  getEducationFilterOptions() {
    const levels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const reading_time_ranges = [
      { id: 'under_5', label: 'Under 5 minutes', min_minutes: 0, max_minutes: 5 },
      { id: '5_10', label: '5–10 minutes', min_minutes: 5, max_minutes: 10 },
      { id: '10_20', label: '10–20 minutes', min_minutes: 10, max_minutes: 20 },
      { id: 'over_20', label: 'Over 20 minutes', min_minutes: 20, max_minutes: 9999 }
    ];

    const rating_options = [
      { min_rating: 3, label: '3.0+ stars' },
      { min_rating: 4, label: '4.0+ stars' },
      { min_rating: 4.5, label: '4.5+ stars' }
    ];

    return { levels, reading_time_ranges, rating_options };
  }

  // searchEducationalArticles(query, levels, minReadingTimeMinutes, maxReadingTimeMinutes, minRating, sortBy, page, pageSize)
  searchEducationalArticles(query, levels, minReadingTimeMinutes, maxReadingTimeMinutes, minRating, sortBy, page, pageSize) {
    const articles = this._getFromStorage('articles');
    const tags = this._getFromStorage('tags');
    const readingListIdSet = this._getReadingListArticleIdSet();

    let items = articles.filter((a) => a.content_type === 'education');

    const q = typeof query === 'string' && query.trim().length > 0 ? query.trim().toLowerCase() : null;
    if (q) {
      items = items.filter((a) => {
        const haystack = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.content || '')).toLowerCase();
        return haystack.includes(q);
      });
    }

    if (Array.isArray(levels) && levels.length > 0) {
      const levelSet = new Set(levels);
      items = items.filter((a) => levelSet.has(a.level));
    }

    if (typeof minReadingTimeMinutes === 'number') {
      items = items.filter((a) => typeof a.reading_time_minutes === 'number' && a.reading_time_minutes >= minReadingTimeMinutes);
    }

    if (typeof maxReadingTimeMinutes === 'number') {
      items = items.filter((a) => typeof a.reading_time_minutes === 'number' && a.reading_time_minutes <= maxReadingTimeMinutes);
    }

    if (typeof minRating === 'number') {
      items = items.filter((a) => typeof a.rating === 'number' && a.rating >= minRating);
    }

    const sortKey = sortBy || 'relevance';
    items = items.slice();
    items.sort((a, b) => {
      if (sortKey === 'most_recent') {
        const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
        const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
        return db - da;
      }
      if (sortKey === 'highest_rated') {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        return rb - ra;
      }
      if (sortKey === 'reading_time_asc') {
        const ta = typeof a.reading_time_minutes === 'number' ? a.reading_time_minutes : Infinity;
        const tb = typeof b.reading_time_minutes === 'number' ? b.reading_time_minutes : Infinity;
        return ta - tb;
      }
      if (sortKey === 'reading_time_desc') {
        const ta = typeof a.reading_time_minutes === 'number' ? a.reading_time_minutes : -Infinity;
        const tb = typeof b.reading_time_minutes === 'number' ? b.reading_time_minutes : -Infinity;
        return tb - ta;
      }
      // relevance: simple most_recent fallback
      const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
      const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
      return db - da;
    });

    const total_count = items.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const pageItems = items.slice(start, start + size).map((a) => {
      const tagNames = (a.tag_ids || [])
        .map((tid) => {
          const t = tags.find((tg) => tg.id === tid);
          return t ? t.name : null;
        })
        .filter((x) => !!x);
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        level: a.level,
        reading_time_minutes: a.reading_time_minutes,
        rating: a.rating,
        rating_count: a.rating_count,
        summary: a.summary,
        publication_date: a.publication_date,
        tag_names: tagNames,
        is_saved: readingListIdSet.has(a.id)
      };
    });

    return {
      items: pageItems,
      total_count,
      page: currentPage,
      page_size: size
    };
  }

  // searchNewsArticles(region, category, dateFrom, dateTo, sortBy, page, pageSize)
  searchNewsArticles(region, category, dateFrom, dateTo, sortBy, page, pageSize) {
    const articles = this._getFromStorage('articles');
    const tags = this._getFromStorage('tags');
    const readingListIdSet = this._getReadingListArticleIdSet();

    let items = articles.filter((a) => a.content_type === 'news');

    if (region) {
      items = items.filter((a) => a.region === region);
    }

    if (category) {
      items = items.filter((a) => a.category === category);
    }

    let fromTs = null;
    let toTs = null;
    if (dateFrom) {
      const d = new Date(dateFrom);
      if (!isNaN(d.getTime())) fromTs = d.getTime();
    }
    if (dateTo) {
      const d = new Date(dateTo);
      if (!isNaN(d.getTime())) toTs = d.getTime();
    }

    if (fromTs !== null || toTs !== null) {
      items = items.filter((a) => {
        const ts = a.publication_date ? new Date(a.publication_date).getTime() : null;
        if (ts === null) return false;
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;
        return true;
      });
    }

    const sortKey = sortBy || 'most_recent';
    items = items.slice();
    items.sort((a, b) => {
      const da = a.publication_date ? new Date(a.publication_date).getTime() : 0;
      const db = b.publication_date ? new Date(b.publication_date).getTime() : 0;
      if (sortKey === 'oldest') return da - db;
      return db - da;
    });

    const total_count = items.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;

    const pageItems = items.slice(start, start + size).map((a) => {
      const tagNames = (a.tag_ids || [])
        .map((tid) => {
          const t = tags.find((tg) => tg.id === tid);
          return t ? t.name : null;
        })
        .filter((x) => !!x);
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        publication_date: a.publication_date,
        region: a.region,
        category: a.category,
        tag_names: tagNames,
        is_saved: readingListIdSet.has(a.id)
      };
    });

    return {
      items: pageItems,
      total_count,
      page: currentPage,
      page_size: size
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const tags = this._getFromStorage('tags');
    const readingListIdSet = this._getReadingListArticleIdSet();

    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        article: null,
        tags: [],
        is_saved: false
      };
    }

    const tagObjs = (article.tag_ids || [])
      .map((tid) => tags.find((t) => t.id === tid))
      .filter((t) => !!t)
      .map((t) => ({ id: t.id, name: t.name, slug: t.slug }));

    return {
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        content_type: article.content_type,
        level: article.level,
        reading_time_minutes: article.reading_time_minutes,
        rating: article.rating,
        rating_count: article.rating_count,
        author_name: article.author_name,
        publication_date: article.publication_date,
        region: article.region,
        category: article.category,
        summary: article.summary,
        thumbnail_image_url: article.thumbnail_image_url,
        is_featured: article.is_featured
      },
      tags: tagObjs,
      is_saved: readingListIdSet.has(article.id)
    };
  }

  // toggleReadingListItem(articleId, source)
  toggleReadingListItem(articleId, source) {
    const validSources = new Set(['education', 'news']);
    const src = validSources.has(source) ? source : 'education';

    let items = this._getOrCreateReadingListStore();
    const existingIndex = items.findIndex((r) => r.article_id === articleId);
    let action;
    let reading_list_item = null;

    if (existingIndex >= 0) {
      const removed = items.splice(existingIndex, 1)[0];
      action = 'removed';
      reading_list_item = removed || null;
    } else {
      const newItem = {
        id: this._generateId('reading'),
        article_id: articleId,
        saved_at: this._getNowIso(),
        source: src
      };
      items.push(newItem);
      action = 'added';
      reading_list_item = newItem;
    }

    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      action,
      reading_list_item,
      total_reading_list_count: items.length
    };
  }

  // getTagArticles(tagId)
  getTagArticles(tagId) {
    const tags = this._getFromStorage('tags');
    const articles = this._getFromStorage('articles');
    const readingListIdSet = this._getReadingListArticleIdSet();

    const tag = tags.find((t) => t.id === tagId) || null;

    const taggedArticles = articles.filter((a) => Array.isArray(a.tag_ids) && a.tag_ids.includes(tagId));

    const allTagsById = new Map(tags.map((t) => [t.id, t]));

    const mappedArticles = taggedArticles.map((a) => {
      const tagNames = (a.tag_ids || [])
        .map((tid) => {
          const t = allTagsById.get(tid);
          return t ? t.name : null;
        })
        .filter((x) => !!x);
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        content_type: a.content_type,
        summary: a.summary,
        publication_date: a.publication_date,
        reading_time_minutes: a.reading_time_minutes,
        rating: a.rating,
        tag_names: tagNames,
        is_saved: readingListIdSet.has(a.id)
      };
    });

    return {
      tag: tag ? { id: tag.id, name: tag.name, slug: tag.slug } : null,
      articles: mappedArticles
    };
  }

  // getActiveRiskQuiz()
  getActiveRiskQuiz() {
    const quizzes = this._getFromStorage('risk_quizzes');
    const questions = this._getFromStorage('risk_quiz_questions');
    const options = this._getFromStorage('risk_quiz_options');

    const quiz = quizzes.find((q) => q.status === 'active') || null;
    if (!quiz) {
      return {
        quiz: null,
        questions: []
      };
    }

    const quizQuestions = questions
      .filter((q) => q.quiz_id === quiz.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((q) => {
        const qOptions = options
          .filter((o) => o.question_id === q.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((o) => ({ id: o.id, order: o.order, label: o.label, value: o.value }));
        return {
          id: q.id,
          order: q.order,
          text: q.text,
          question_type: q.question_type,
          is_required: q.is_required,
          options: qOptions
        };
      });

    return {
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        estimated_time_minutes: quiz.estimated_time_minutes,
        status: quiz.status
      },
      questions: quizQuestions
    };
  }

  // submitRiskQuizAnswers(quizId, answers)
  submitRiskQuizAnswers(quizId, answers) {
    const quizzes = this._getFromStorage('risk_quizzes');
    const questions = this._getFromStorage('risk_quiz_questions');
    const options = this._getFromStorage('risk_quiz_options');
    const profileResults = this._getFromStorage('risk_profile_results');
    const recommendations = this._getFromStorage('risk_profile_recommendations');
    const stablecoins = this._getFromStorage('stablecoins');
    const watchlistIdSet = this._getWatchlistIdSet();

    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) {
      return {
        completion: null,
        profile_result: null,
        recommended_stablecoins: []
      };
    }

    const answersArr = Array.isArray(answers) ? answers : [];

    // Build lookups
    const optionsById = new Map();
    for (const opt of options) {
      optionsById.set(opt.id, opt);
    }

    let totalWeight = 0;
    let countWeight = 0;

    const storedAnswers = [];
    for (const ans of answersArr) {
      if (!ans || !ans.questionId || !ans.optionId) continue;
      const opt = optionsById.get(ans.optionId);
      if (opt && typeof opt.risk_weight === 'number') {
        totalWeight += opt.risk_weight;
        countWeight += 1;
      }
      storedAnswers.push({ question_id: ans.questionId, option_id: ans.optionId });
    }

    const avgWeight = countWeight > 0 ? totalWeight / countWeight : 0;
    let profile_key = 'conservative';
    if (avgWeight > 1.5 && avgWeight <= 2.5) {
      profile_key = 'moderate';
    } else if (avgWeight > 2.5) {
      profile_key = 'aggressive';
    }

    const completion = {
      id: this._generateId('riskcompletion'),
      quiz_id: quiz.id,
      completed_at: this._getNowIso(),
      answers: storedAnswers,
      calculated_profile_key: profile_key,
      summary:
        profile_key === 'conservative'
          ? 'You prefer lower risk and steadier returns.'
          : profile_key === 'moderate'
          ? 'You are comfortable with some risk for potentially higher returns.'
          : 'You are willing to take higher risk for higher potential returns.'
    };

    this._persistRiskQuizCompletion(completion);

    // Find profile result
    let profile_result = profileResults.find((pr) => pr.profile_key === profile_key) || null;
    if (!profile_result) {
      // Fallback in case storage is empty
      profile_result = {
        id: 'generated_' + profile_key,
        profile_key,
        title:
          profile_key === 'conservative'
            ? 'Conservative Profile'
            : profile_key === 'moderate'
            ? 'Moderate Profile'
            : 'Aggressive Profile',
        description: completion.summary
      };
    }

    // Recommendations
    const profileRecs = recommendations.filter((r) => r.profile_result_id === profile_result.id);
    const recommended_stablecoins = profileRecs.map((r) => {
      const sc = stablecoins.find((s) => s.id === r.stablecoin_id);
      if (!sc) return null;
      return {
        stablecoin_id: sc.id,
        name: sc.name,
        symbol: sc.symbol,
        peg_currency: sc.peg_currency,
        risk_score: sc.risk_score,
        base_apy_percent: sc.base_apy_percent,
        note: r.note,
        is_in_watchlist: watchlistIdSet.has(sc.id)
      };
    }).filter((x) => !!x);

    return {
      completion,
      profile_result,
      recommended_stablecoins
    };
  }

  // searchHelpArticles(query, sortBy, page, pageSize)
  searchHelpArticles(query, sortBy, page, pageSize) {
    const helpArticles = this._getFromStorage('help_articles');
    const q = typeof query === 'string' ? query.trim().toLowerCase() : '';

    let items = helpArticles.filter((a) => a.is_published !== false);

    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      items = items.filter((a) => {
        const content = (a.title || '') + ' ' + (a.content || '');
        const keywords = Array.isArray(a.related_keywords) ? a.related_keywords.join(' ') : '';
        const haystack = (content + ' ' + keywords).toLowerCase();
        if (tokens.length === 0) return true;
        return tokens.some((token) => haystack.includes(token));
      });
    }

    const sortKey = sortBy || 'relevance';
    items = items.slice();
    items.sort((a, b) => {
      if (sortKey === 'most_viewed') {
        const va = typeof a.view_count === 'number' ? a.view_count : 0;
        const vb = typeof b.view_count === 'number' ? b.view_count : 0;
        return vb - va;
      }
      if (sortKey === 'most_recent') {
        const da = a.updated_at ? new Date(a.updated_at).getTime() : a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.updated_at ? new Date(b.updated_at).getTime() : b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      }
      // relevance: keep as-is
      return 0;
    });

    const total_count = items.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;

    const pageItems = items.slice(start, start + size).map((a) => {
      const content = a.content || '';
      const snippet = content.length > 200 ? content.slice(0, 197) + '...' : content;
      return {
        id: a.id,
        title: a.title,
        slug: a.slug,
        snippet,
        category: a.category,
        view_count: a.view_count,
        is_published: a.is_published
      };
    });

    return {
      items: pageItems,
      total_count,
      page: currentPage,
      page_size: size
    };
  }

  // getHelpArticleDetail(helpArticleId)
  getHelpArticleDetail(helpArticleId) {
    const helpArticles = this._getFromStorage('help_articles');
    const article = helpArticles.find((a) => a.id === helpArticleId) || null;

    if (!article) {
      return {
        article: null,
        related_keywords: []
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task7_openedHelpArticleId', helpArticleId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        content: article.content,
        category: article.category,
        view_count: article.view_count,
        created_at: article.created_at,
        updated_at: article.updated_at,
        is_published: article.is_published
      },
      related_keywords: Array.isArray(article.related_keywords) ? article.related_keywords : []
    };
  }

  // submitSupportRequest(subject, message, email)
  submitSupportRequest(subject, message, email) {
    const support_requests = this._getFromStorage('support_requests');

    const req = {
      id: this._generateId('support'),
      subject: subject || '',
      message: message || '',
      email: email || '',
      created_at: this._getNowIso(),
      status: 'submitted'
    };

    support_requests.push(req);
    this._saveToStorage('support_requests', support_requests);

    return {
      success: true,
      support_request: req
    };
  }

  // getNewsletterConfig()
  getNewsletterConfig() {
    const frequencies = [
      {
        value: 'daily',
        label: 'Daily',
        description: 'Brief daily snapshot of major stablecoin moves.'
      },
      {
        value: 'weekly',
        label: 'Weekly',
        description: 'Once-a-week roundup of yields, risks, and regulation.'
      },
      {
        value: 'monthly',
        label: 'Monthly',
        description: 'Deep-dive summary of key stablecoin developments.'
      }
    ];

    const topics = [
      {
        value: 'market_updates',
        label: 'Market Updates',
        description: 'Market cap shifts, depegs, and liquidity changes.'
      },
      {
        value: 'regulation_alerts',
        label: 'Regulation Alerts',
        description: 'New laws, guidance, and enforcement affecting stablecoins.'
      },
      {
        value: 'yield_opportunities',
        label: 'Yield Opportunities',
        description: 'New platforms, rates, and risk-adjusted yield ideas.'
      }
    ];

    const content_formats = [
      {
        value: 'brief_summary',
        label: 'Brief summary (max 5 minutes)',
        description: 'Concise bullets with links to read more when you have time.'
      },
      {
        value: 'full_analysis',
        label: 'Full analysis',
        description: 'Long-form explanations and data tables.'
      }
    ];

    return { frequencies, topics, content_formats };
  }

  // submitNewsletterSubscription(name, email, frequency, topics, content_format, agreed_to_terms)
  submitNewsletterSubscription(name, email, frequency, topics, content_format, agreed_to_terms) {
    const validFrequencies = new Set(['daily', 'weekly', 'monthly']);
    const validFormats = new Set(['brief_summary', 'full_analysis']);

    if (!this._validateEmail(email) || !validFrequencies.has(frequency) || !validFormats.has(content_format) || !agreed_to_terms) {
      return {
        success: false,
        subscription: null
      };
    }

    const sub = {
      id: this._generateId('newsletter'),
      name: name || '',
      email,
      frequency,
      topics: Array.isArray(topics) ? topics : [],
      content_format,
      agreed_to_terms: !!agreed_to_terms,
      created_at: this._getNowIso(),
      status: 'active'
    };

    this._persistNewsletterSubscription(sub);

    return {
      success: true,
      subscription: sub
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const sections = [
      {
        id: 'mission',
        title: 'Our Mission',
        body:
          'We help people understand the risks, mechanics, and opportunities behind major stablecoins so they can make informed decisions without hype.',
        section_type: 'mission'
      },
      {
        id: 'risk_scoring',
        title: 'Risk Scoring Methodology',
        body:
          'Risk scores combine issuer transparency, reserve quality, market liquidity, historical peg stability, and regulatory posture on a simple numeric scale where lower is less risky.',
        section_type: 'risk_scoring'
      },
      {
        id: 'data_sources',
        title: 'Data Sources',
        body:
          'We aggregate data from on-chain feeds, issuer attestations, independent analytics providers, and major exchanges. Values may lag real-time markets and are not investment advice.',
        section_type: 'data_sources'
      },
      {
        id: 'disclosures',
        title: 'Disclosures',
        body:
          'Nothing on this site is financial advice. Always do your own research and consider speaking with a licensed professional before making investment decisions.',
        section_type: 'disclosures'
      }
    ];

    return { sections };
  }

  // getLegalContent(documentType)
  getLegalContent(documentType) {
    const now = this._getNowIso();
    if (documentType === 'privacy_policy') {
      return {
        document_type: 'privacy_policy',
        title: 'Privacy Policy',
        content_html:
          '<h1>Privacy Policy</h1><p>We respect your privacy and only store the minimum data required to operate this site. Data is stored in your browser where possible.</p>',
        last_updated: now
      };
    }

    if (documentType === 'terms_of_use') {
      return {
        document_type: 'terms_of_use',
        title: 'Terms of Use',
        content_html:
          '<h1>Terms of Use</h1><p>By using this site, you agree that all information is provided for educational purposes only and does not constitute financial advice.</p>',
        last_updated: now
      };
    }

    return {
      document_type: documentType,
      title: '',
      content_html: '',
      last_updated: now
    };
  }

  // getSavedItemsOverview()
  getSavedItemsOverview() {
    return this._getCurrentSavedItemsSnapshot();
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
