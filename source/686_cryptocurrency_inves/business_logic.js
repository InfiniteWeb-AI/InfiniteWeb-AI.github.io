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
  }

  _initStorage() {
    const tableKeys = [
      'exchanges',
      'coins',
      'referral_offers',
      'articles',
      'portfolios',
      'portfolio_positions',
      'favorite_exchanges',
      'exchange_comparisons',
      'shortlisted_exchanges',
      'review_tags',
      'exchange_reviews',
      'watchlist_items',
      'price_alerts',
      'roi_scenarios',
      'reading_lists',
      'reading_list_items',
      'article_bookmarks',
      'referral_campaigns',
      'contact_messages'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Selection state for exchange comparison
    if (!localStorage.getItem('exchange_comparison_selection')) {
      localStorage.setItem(
        'exchange_comparison_selection',
        JSON.stringify({ selectedExchangeIds: [] })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      if (typeof defaultValue !== 'undefined') {
        return defaultValue;
      }
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // Corrupted data, reset to default
      if (typeof defaultValue !== 'undefined') {
        return defaultValue;
      }
      return [];
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

  _nowIso() {
    return new Date().toISOString();
  }

  _applyPagination(items, page = 1, pageSize = 20) {
    const total = items.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const pagedItems = items.slice(start, end);
    return { items: pagedItems, total, page: p, pageSize: ps };
  }

  _getOrCreateDefaultPortfolio() {
    let portfolios = this._getFromStorage('portfolios');
    let portfolio = portfolios.find((p) => p.isDefault === true);
    if (!portfolio) {
      portfolio = {
        id: this._generateId('portfolio'),
        name: 'My Portfolio',
        description: '',
        isDefault: true,
        createdAt: this._nowIso(),
        updatedAt: this._nowIso()
      };
      portfolios.push(portfolio);
      this._saveToStorage('portfolios', portfolios);
    }
    return portfolio;
  }

  _getOrCreateComparisonSelectionState() {
    let state = this._getFromStorage('exchange_comparison_selection', null);
    if (!state || !Array.isArray(state.selectedExchangeIds)) {
      state = { selectedExchangeIds: [] };
      this._saveToStorage('exchange_comparison_selection', state);
    }
    return state;
  }

  _saveComparisonSelectionState(state) {
    this._saveToStorage('exchange_comparison_selection', state);
  }

  _generateReferralCampaignLink(campaignId) {
    // Pure generation without relying on window/document
    return 'https://example.com/referral?campaign_id=' + encodeURIComponent(campaignId);
  }

  _computeRoiForScenario(coin, {
    initialInvestmentUsd,
    recurringInvestmentUsd = 0,
    frequency,
    durationMonths
  }) {
    const months = durationMonths || 0;
    const perfPercent = coin && typeof coin.performance1yPercent === 'number'
      ? coin.performance1yPercent
      : 0;

    const annualReturn = perfPercent / 100;
    const monthlyRate = annualReturn !== 0
      ? Math.pow(1 + annualReturn, 1 / 12) - 1
      : 0;

    // Normalize recurring investment to monthly equivalent
    let monthlyRecurring = recurringInvestmentUsd || 0;
    switch (frequency) {
      case 'weekly':
        monthlyRecurring = recurringInvestmentUsd * 4;
        break;
      case 'daily':
        monthlyRecurring = recurringInvestmentUsd * 30;
        break;
      case 'quarterly':
        monthlyRecurring = recurringInvestmentUsd / 3;
        break;
      case 'yearly':
        monthlyRecurring = recurringInvestmentUsd / 12;
        break;
      case 'monthly':
      default:
        monthlyRecurring = recurringInvestmentUsd;
        break;
    }

    let finalInitial;
    let finalRecurring;

    if (monthlyRate === 0) {
      finalInitial = initialInvestmentUsd;
      finalRecurring = monthlyRecurring * months;
    } else {
      finalInitial = initialInvestmentUsd * Math.pow(1 + monthlyRate, months);
      const factor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
      finalRecurring = monthlyRecurring * factor;
    }

    const computedFinalValueUsd = finalInitial + finalRecurring;
    const totalInvested = initialInvestmentUsd + monthlyRecurring * months;
    const computedRoiPercent = totalInvested > 0
      ? ((computedFinalValueUsd - totalInvested) / totalInvested) * 100
      : 0;

    return {
      computedFinalValueUsd,
      computedRoiPercent
    };
  }

  // =======================
  // Homepage & Global Search
  // =======================

  getHomepageOverview() {
    const exchanges = this._getFromStorage('exchanges');
    const coins = this._getFromStorage('coins');
    const referralOffers = this._getFromStorage('referral_offers');
    const articles = this._getFromStorage('articles');

    const featuredExchanges = exchanges
      .slice()
      .sort((a, b) => {
        const ra = typeof a.avgUserRating === 'number' ? a.avgUserRating : 0;
        const rb = typeof b.avgUserRating === 'number' ? b.avgUserRating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.reviewCount === 'number' ? a.reviewCount : 0;
        const cb = typeof b.reviewCount === 'number' ? b.reviewCount : 0;
        return cb - ca;
      })
      .slice(0, 5);

    const trendingCoins = coins
      .slice()
      .sort((a, b) => {
        const pa = typeof a.performance1yPercent === 'number' ? a.performance1yPercent : -Infinity;
        const pb = typeof b.performance1yPercent === 'number' ? b.performance1yPercent : -Infinity;
        return pb - pa;
      })
      .slice(0, 5);

    const topReferralOffersRaw = referralOffers
      .filter((o) => o.isActive !== false)
      .slice()
      .sort((a, b) => {
        const ba = typeof a.bonusAmountUsd === 'number' ? a.bonusAmountUsd : 0;
        const bb = typeof b.bonusAmountUsd === 'number' ? b.bonusAmountUsd : 0;
        return bb - ba;
      })
      .slice(0, 5);

    // Foreign key resolution for offers: attach exchange
    const topReferralOffers = topReferralOffersRaw.map((offer) => ({
      ...offer,
      exchange: exchanges.find((e) => e.id === offer.exchangeId) || null
    }));

    const latestArticles = articles
      .slice()
      .sort((a, b) => {
        const da = a.publishDate ? Date.parse(a.publishDate) : 0;
        const db = b.publishDate ? Date.parse(b.publishDate) : 0;
        return db - da;
      })
      .slice(0, 5);

    return {
      featuredExchanges,
      trendingCoins,
      topReferralOffers,
      latestArticles
    };
  }

  globalSearch(query, limitPerType = 5) {
    const q = (query || '').toLowerCase().trim();
    const limit = typeof limitPerType === 'number' && limitPerType > 0 ? limitPerType : 5;

    const exchanges = this._getFromStorage('exchanges');
    const coins = this._getFromStorage('coins');
    const referralOffers = this._getFromStorage('referral_offers');
    const articles = this._getFromStorage('articles');

    const matchesText = (text) => (text || '').toLowerCase().includes(q);

    let exchangesRes = exchanges;
    let coinsRes = coins;
    let offersRes = referralOffers;
    let articlesRes = articles;

    if (q) {
      exchangesRes = exchanges.filter((e) =>
        matchesText(e.name) ||
        matchesText(e.description) ||
        matchesText(e.websiteUrl)
      );

      coinsRes = coins.filter((c) =>
        matchesText(c.name) ||
        matchesText(c.symbol) ||
        matchesText(c.description)
      );

      offersRes = referralOffers.filter((o) =>
        matchesText(o.name) || matchesText(o.description)
      );

      articlesRes = articles.filter((a) =>
        matchesText(a.title) || matchesText(a.summary) || matchesText(a.body)
      );
    }

    exchangesRes = exchangesRes.slice(0, limit);
    coinsRes = coinsRes.slice(0, limit);

    // Resolve foreign keys for referral offers (attach exchange)
    const offersResWithExchange = offersRes.slice(0, limit).map((offer) => ({
      ...offer,
      exchange: exchanges.find((e) => e.id === offer.exchangeId) || null
    }));

    articlesRes = articlesRes.slice(0, limit);

    return {
      exchanges: exchangesRes,
      coins: coinsRes,
      referralOffers: offersResWithExchange,
      articles: articlesRes
    };
  }

  // ==================
  // Exchanges
  // ==================

  getExchangeFilterOptions() {
    const exchanges = this._getFromStorage('exchanges');

    // Regions derived from supportedCountries
    const regionMap = new Map();
    exchanges.forEach((ex) => {
      (ex.supportedCountries || []).forEach((c) => {
        if (!regionMap.has(c)) {
          regionMap.set(c, { code: c, label: c });
        }
      });
    });
    const regions = Array.from(regionMap.values());

    const experienceLevels = ['beginner_friendly', 'intermediate', 'advanced'];

    const feeRanges = [
      { maxSpotTradingFeePercent: 0.1, label: 'Up to 0.1%' },
      { maxSpotTradingFeePercent: 0.2, label: 'Up to 0.2%' },
      { maxSpotTradingFeePercent: 0.5, label: 'Up to 0.5%' },
      { maxSpotTradingFeePercent: 1.0, label: 'Up to 1%' }
    ];

    const volumeRanges = [
      { minTwentyFourHourVolumeUsd: 50000000, label: '≥ $50M 24h volume' },
      { minTwentyFourHourVolumeUsd: 100000000, label: '≥ $100M 24h volume' },
      { minTwentyFourHourVolumeUsd: 500000000, label: '≥ $500M 24h volume' },
      { minTwentyFourHourVolumeUsd: 1000000000, label: '≥ $1B 24h volume' }
    ];

    const sortOptions = [
      { value: 'user_rating_desc', label: 'User rating: High to Low' },
      { value: 'fee_asc', label: 'Trading fees: Low to High' },
      { value: 'volume_desc', label: '24h volume: High to Low' }
    ];

    return {
      regions,
      experienceLevels,
      feeRanges,
      volumeRanges,
      sortOptions
    };
  }

  searchExchanges(filters = {}, sort = 'user_rating_desc', page = 1, pageSize = 20) {
    const exchanges = this._getFromStorage('exchanges');
    const favorites = this._getFromStorage('favorite_exchanges');
    const selectionState = this._getOrCreateComparisonSelectionState();

    let results = exchanges.slice();

    if (filters.supportedCountry) {
      results = results.filter((ex) =>
        Array.isArray(ex.supportedCountries) && ex.supportedCountries.includes(filters.supportedCountry)
      );
    }

    if (filters.isBeginnerFriendlyOnly) {
      results = results.filter((ex) => ex.isBeginnerFriendly === true);
    }

    if (typeof filters.maxSpotTradingFeePercent === 'number') {
      results = results.filter((ex) =>
        typeof ex.maxSpotTradingFeePercent === 'number' &&
        ex.maxSpotTradingFeePercent <= filters.maxSpotTradingFeePercent
      );
    }

    if (typeof filters.minTwentyFourHourVolumeUsd === 'number') {
      results = results.filter((ex) =>
        typeof ex.twentyFourHourVolumeUsd === 'number' &&
        ex.twentyFourHourVolumeUsd >= filters.minTwentyFourHourVolumeUsd
      );
    }

    if (filters.hasUsdSpotTrading) {
      results = results.filter((ex) => {
        if (ex.hasUsdSpotTrading === true) return true;
        if (Array.isArray(ex.supportedFiatCurrencies)) {
          return ex.supportedFiatCurrencies.includes('USD');
        }
        return false;
      });
    }

    const sortKey = sort || 'user_rating_desc';
    if (sortKey === 'user_rating_desc') {
      results.sort((a, b) => {
        const ra = typeof a.avgUserRating === 'number' ? a.avgUserRating : 0;
        const rb = typeof b.avgUserRating === 'number' ? b.avgUserRating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.reviewCount === 'number' ? a.reviewCount : 0;
        const cb = typeof b.reviewCount === 'number' ? b.reviewCount : 0;
        return cb - ca;
      });
    } else if (sortKey === 'fee_asc') {
      results.sort((a, b) => {
        const fa = typeof a.maxSpotTradingFeePercent === 'number' ? a.maxSpotTradingFeePercent : Infinity;
        const fb = typeof b.maxSpotTradingFeePercent === 'number' ? b.maxSpotTradingFeePercent : Infinity;
        return fa - fb;
      });
    } else if (sortKey === 'volume_desc') {
      results.sort((a, b) => {
        const va = typeof a.twentyFourHourVolumeUsd === 'number' ? a.twentyFourHourVolumeUsd : 0;
        const vb = typeof b.twentyFourHourVolumeUsd === 'number' ? b.twentyFourHourVolumeUsd : 0;
        return vb - va;
      });
    }

    const { items, total, page: p, pageSize: ps } = this._applyPagination(results, page, pageSize);

    const itemsWithFlags = items.map((exchange) => {
      const isFavorited = favorites.some((f) => f.exchangeId === exchange.id);
      const isSelectedForComparison = selectionState.selectedExchangeIds.includes(exchange.id);
      return { exchange, isFavorited, isSelectedForComparison };
    });

    return {
      items: itemsWithFlags,
      total,
      page: p,
      pageSize: ps
    };
  }

  getExchangeDetail(exchangeId) {
    const exchanges = this._getFromStorage('exchanges');
    const favorites = this._getFromStorage('favorite_exchanges');
    const selectionState = this._getOrCreateComparisonSelectionState();
    const referralOffers = this._getFromStorage('referral_offers');
    const reviews = this._getFromStorage('exchange_reviews');

    const exchange = exchanges.find((e) => e.id === exchangeId) || null;

    const isFavorited = favorites.some((f) => f.exchangeId === exchangeId);
    const isSelectedForComparison = selectionState.selectedExchangeIds.includes(exchangeId);

    const relatedReferralOffersRaw = referralOffers.filter((o) => o.exchangeId === exchangeId && o.isActive !== false);
    const relatedReferralOffers = relatedReferralOffersRaw.map((offer) => ({
      ...offer,
      exchange
    }));

    const exchangeReviews = reviews.filter((r) => r.exchangeId === exchangeId);
    const reviewCount = exchangeReviews.length;
    const avgRating = reviewCount
      ? exchangeReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviewCount
      : 0;

    return {
      exchange,
      isFavorited,
      isSelectedForComparison,
      relatedReferralOffers,
      reviewSummary: {
        avgRating,
        reviewCount
      }
    };
  }

  toggleExchangeSelectedForComparison(exchangeId, selected) {
    const state = this._getOrCreateComparisonSelectionState();
    const existsIndex = state.selectedExchangeIds.indexOf(exchangeId);

    if (selected) {
      if (existsIndex === -1) {
        state.selectedExchangeIds.push(exchangeId);
      }
    } else {
      if (existsIndex !== -1) {
        state.selectedExchangeIds.splice(existsIndex, 1);
      }
    }

    this._saveComparisonSelectionState(state);

    return {
      selectedExchangeIds: state.selectedExchangeIds.slice(),
      selectionCount: state.selectedExchangeIds.length
    };
  }

  getExchangeComparisonSelectionSummary() {
    const state = this._getOrCreateComparisonSelectionState();
    const exchanges = this._getFromStorage('exchanges');
    const selectedExchanges = exchanges.filter((e) => state.selectedExchangeIds.includes(e.id));
    return {
      selectedExchanges,
      selectionCount: state.selectedExchangeIds.length
    };
  }

  createExchangeComparisonSessionFromSelection() {
    const state = this._getOrCreateComparisonSelectionState();
    const exchanges = this._getFromStorage('exchanges');
    const sessions = this._getFromStorage('exchange_comparisons');

    const session = {
      id: this._generateId('exchangecomp'),
      exchangeIds: state.selectedExchangeIds.slice(),
      selectedPair: null,
      tradeAmountUsd: null,
      feeResults: [],
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    sessions.push(session);
    this._saveToStorage('exchange_comparisons', sessions);

    const sessionExchanges = exchanges.filter((e) => session.exchangeIds.includes(e.id));

    return {
      session,
      exchanges: sessionExchanges
    };
  }

  getExchangeComparisonSession(comparisonSessionId) {
    const sessions = this._getFromStorage('exchange_comparisons');
    const exchanges = this._getFromStorage('exchanges');
    const session = sessions.find((s) => s.id === comparisonSessionId) || null;
    const sessionExchanges = session
      ? exchanges.filter((e) => session.exchangeIds.includes(e.id))
      : [];
    return {
      session,
      exchanges: sessionExchanges
    };
  }

  updateExchangeComparisonFees(comparisonSessionId, selectedPair, tradeAmountUsd) {
    const sessions = this._getFromStorage('exchange_comparisons');
    const exchanges = this._getFromStorage('exchanges');
    const sessionIndex = sessions.findIndex((s) => s.id === comparisonSessionId);
    if (sessionIndex === -1) {
      return { session: null };
    }

    const session = sessions[sessionIndex];
    session.selectedPair = selectedPair;
    session.tradeAmountUsd = tradeAmountUsd;

    const feeResults = session.exchangeIds.map((exchangeId) => {
      const ex = exchanges.find((e) => e.id === exchangeId);
      if (!ex) {
        return { exchangeId, feeUsd: 0 };
      }
      const feePercent =
        typeof ex.spotTakerFeePercent === 'number' ? ex.spotTakerFeePercent :
        typeof ex.spotMakerFeePercent === 'number' ? ex.spotMakerFeePercent :
        typeof ex.maxSpotTradingFeePercent === 'number' ? ex.maxSpotTradingFeePercent :
        0;
      const feeUsd = tradeAmountUsd * (feePercent / 100);
      return { exchangeId, feeUsd };
    });

    session.feeResults = feeResults;
    session.updatedAt = this._nowIso();

    sessions[sessionIndex] = session;
    this._saveToStorage('exchange_comparisons', sessions);

    return { session };
  }

  shortlistExchangeFromComparison(comparisonSessionId, exchangeId, reason) {
    const shortlisted = this._getFromStorage('shortlisted_exchanges');
    const entry = {
      id: this._generateId('shortlistedexchange'),
      exchangeId,
      reason: reason || '',
      createdAt: this._nowIso()
    };
    shortlisted.push(entry);
    this._saveToStorage('shortlisted_exchanges', shortlisted);
    return { shortlistedExchange: entry };
  }

  // ==================
  // Favorites & Reviews
  // ==================

  addExchangeToFavorites(exchangeId, label) {
    const favorites = this._getFromStorage('favorite_exchanges');
    let favorite = favorites.find((f) => f.exchangeId === exchangeId);
    if (favorite) {
      return { favorite, isNew: false };
    }
    favorite = {
      id: this._generateId('favoriteexchange'),
      exchangeId,
      label: label || '',
      createdAt: this._nowIso()
    };
    favorites.push(favorite);
    this._saveToStorage('favorite_exchanges', favorites);
    return { favorite, isNew: true };
  }

  removeExchangeFromFavorites(favoriteExchangeId) {
    const favorites = this._getFromStorage('favorite_exchanges');
    const newFavorites = favorites.filter((f) => f.id !== favoriteExchangeId);
    const success = newFavorites.length !== favorites.length;
    this._saveToStorage('favorite_exchanges', newFavorites);
    return { success };
  }

  getFavoriteExchangesOverview() {
    const favorites = this._getFromStorage('favorite_exchanges');
    const exchanges = this._getFromStorage('exchanges');
    const items = favorites.map((favorite) => ({
      favorite,
      exchange: exchanges.find((e) => e.id === favorite.exchangeId) || null
    }));
    return { favorites: items };
  }

  updateFavoriteExchangeLabel(favoriteExchangeId, label) {
    const favorites = this._getFromStorage('favorite_exchanges');
    const idx = favorites.findIndex((f) => f.id === favoriteExchangeId);
    if (idx === -1) {
      return { favorite: null };
    }
    favorites[idx].label = label || '';
    this._saveToStorage('favorite_exchanges', favorites);
    return { favorite: favorites[idx] };
  }

  reorderFavoriteExchanges(favoriteExchangeIds) {
    const favorites = this._getFromStorage('favorite_exchanges');
    const idSet = new Set(favoriteExchangeIds || []);
    const ordered = [];

    (favoriteExchangeIds || []).forEach((id) => {
      const fav = favorites.find((f) => f.id === id);
      if (fav) ordered.push(fav);
    });

    favorites.forEach((fav) => {
      if (!idSet.has(fav.id)) {
        ordered.push(fav);
      }
    });

    this._saveToStorage('favorite_exchanges', ordered);
    return { favorites: ordered };
  }

  getExchangeReviews(exchangeId, page = 1, pageSize = 10) {
    const reviews = this._getFromStorage('exchange_reviews');
    const exchange = this._getFromStorage('exchanges').find((e) => e.id === exchangeId) || null;
    const tags = this._getFromStorage('review_tags');

    const filtered = reviews
      .filter((r) => r.exchangeId === exchangeId)
      .sort((a, b) => {
        const da = a.createdAt ? Date.parse(a.createdAt) : 0;
        const db = b.createdAt ? Date.parse(b.createdAt) : 0;
        return db - da;
      });

    const { items, total, page: p, pageSize: ps } = this._applyPagination(filtered, page, pageSize);

    const enrichedItems = items.map((r) => ({
      ...r,
      exchange,
      tags: (r.tagIds || []).map((tid) => tags.find((t) => t.id === tid) || null).filter((t) => t)
    }));

    return {
      items: enrichedItems,
      total,
      page: p,
      pageSize: ps
    };
  }

  getExchangeReviewTagOptions() {
    const tags = this._getFromStorage('review_tags');
    return tags.filter((t) => t.entityType === 'exchange');
  }

  createExchangeReview(exchangeId, rating, title, body, tagIds) {
    const reviews = this._getFromStorage('exchange_reviews');
    const review = {
      id: this._generateId('exchangereview'),
      exchangeId,
      rating,
      title: title || '',
      body,
      tagIds: Array.isArray(tagIds) ? tagIds.slice() : [],
      createdAt: this._nowIso()
    };
    reviews.push(review);
    this._saveToStorage('exchange_reviews', reviews);
    return { review };
  }

  // ==================
  // Coins & Portfolio
  // ==================

  getCoinFilterOptions() {
    const categories = [
      { value: 'layer_1', label: 'Layer 1' },
      { value: 'defi', label: 'DeFi' },
      { value: 'stablecoin', label: 'Stablecoin' },
      { value: 'layer_2', label: 'Layer 2' },
      { value: 'exchange_token', label: 'Exchange Token' },
      { value: 'gaming', label: 'Gaming' },
      { value: 'nft', label: 'NFT' },
      { value: 'meme', label: 'Meme' },
      { value: 'other', label: 'Other' }
    ];

    const riskScoreRanges = [
      { maxRiskScore: 3, label: 'Low risk (≤3)' },
      { maxRiskScore: 5, label: 'Medium risk (≤5)' },
      { maxRiskScore: 7, label: 'Higher risk (≤7)' }
    ];

    const performanceRanges = [
      { minPerformance1yPercent: 0, label: 'Any performance' },
      { minPerformance1yPercent: 25, label: '≥ +25% 1Y' },
      { minPerformance1yPercent: 50, label: '≥ +50% 1Y' },
      { minPerformance1yPercent: 100, label: '≥ +100% 1Y' }
    ];

    const sortOptions = [
      { value: 'market_cap_desc', label: 'Market cap: High to Low' },
      { value: 'performance_1y_desc', label: '1Y performance: High to Low' },
      { value: 'risk_score_asc', label: 'Risk score: Low to High' }
    ];

    return {
      categories,
      riskScoreRanges,
      performanceRanges,
      sortOptions
    };
  }

  searchCoins(filters = {}, sort = 'market_cap_desc', page = 1, pageSize = 20) {
    const coins = this._getFromStorage('coins');
    const watchlistItems = this._getFromStorage('watchlist_items');
    const portfolio = this._getOrCreateDefaultPortfolio();
    const positions = this._getFromStorage('portfolio_positions').filter((p) => p.portfolioId === portfolio.id);

    let results = coins.slice();

    if (typeof filters.minMarketCapUsd === 'number') {
      results = results.filter((c) =>
        typeof c.marketCapUsd === 'number' && c.marketCapUsd >= filters.minMarketCapUsd
      );
    }

    if (typeof filters.maxRiskScore === 'number') {
      results = results.filter((c) =>
        typeof c.riskScore === 'number' && c.riskScore <= filters.maxRiskScore
      );
    }

    if (filters.category) {
      results = results.filter((c) => c.category === filters.category);
    }

    if (typeof filters.minPerformance1yPercent === 'number') {
      results = results.filter((c) =>
        typeof c.performance1yPercent === 'number' && c.performance1yPercent >= filters.minPerformance1yPercent
      );
    }

    const sortKey = sort || 'market_cap_desc';
    if (sortKey === 'market_cap_desc') {
      results.sort((a, b) => {
        const ma = typeof a.marketCapUsd === 'number' ? a.marketCapUsd : 0;
        const mb = typeof b.marketCapUsd === 'number' ? b.marketCapUsd : 0;
        return mb - ma;
      });
    } else if (sortKey === 'performance_1y_desc') {
      results.sort((a, b) => {
        const pa = typeof a.performance1yPercent === 'number' ? a.performance1yPercent : -Infinity;
        const pb = typeof b.performance1yPercent === 'number' ? b.performance1yPercent : -Infinity;
        return pb - pa;
      });
    } else if (sortKey === 'risk_score_asc') {
      results.sort((a, b) => {
        const ra = typeof a.riskScore === 'number' ? a.riskScore : Infinity;
        const rb = typeof b.riskScore === 'number' ? b.riskScore : Infinity;
        return ra - rb;
      });
    }

    const { items, total, page: p, pageSize: ps } = this._applyPagination(results, page, pageSize);

    const enrichedItems = items.map((coin) => {
      const isInWatchlist = watchlistItems.some((w) => w.coinId === coin.id);
      const position = positions.find((pos) => pos.coinId === coin.id);
      const portfolioAllocationPercent = position ? position.allocationPercent : 0;
      return {
        coin,
        isInWatchlist,
        portfolioAllocationPercent
      };
    });

    return {
      items: enrichedItems,
      total,
      page: p,
      pageSize: ps
    };
  }

  getCoinDetail(coinId) {
    const coins = this._getFromStorage('coins');
    const watchlistItems = this._getFromStorage('watchlist_items');
    const priceAlerts = this._getFromStorage('price_alerts');
    const roiScenarios = this._getFromStorage('roi_scenarios');
    const portfolio = this._getOrCreateDefaultPortfolio();
    const positions = this._getFromStorage('portfolio_positions');

    const coin = coins.find((c) => c.id === coinId) || null;
    const watchlistItem = watchlistItems.find((w) => w.coinId === coinId) || null;
    const isInWatchlist = !!watchlistItem;

    const portfolioPosition = positions.find(
      (p) => p.portfolioId === portfolio.id && p.coinId === coinId
    ) || null;

    const coinAlerts = priceAlerts.filter((a) => a.coinId === coinId && a.isActive !== false);
    const alertSummary = {
      activeAlertCount: coinAlerts.length,
      mainConditions: coinAlerts.map((a) => ({
        conditionType: a.conditionType,
        thresholdPercent: a.thresholdPercent,
        timeWindowHours: a.timeWindowHours
      }))
    };

    const roiScenarioSummary = roiScenarios.filter((s) => s.coinId === coinId);

    return {
      coin,
      isInWatchlist,
      portfolioPosition,
      alertSummary,
      roiScenarioSummary
    };
  }

  addCoinToPortfolio(coinId, allocationPercent, note) {
    const portfolio = this._getOrCreateDefaultPortfolio();
    const positions = this._getFromStorage('portfolio_positions');
    const now = this._nowIso();

    let position = positions.find(
      (p) => p.portfolioId === portfolio.id && p.coinId === coinId
    );

    if (position) {
      position.allocationPercent = allocationPercent;
      if (typeof note !== 'undefined') {
        position.note = note;
      }
    } else {
      position = {
        id: this._generateId('portfolioposition'),
        portfolioId: portfolio.id,
        coinId,
        allocationPercent,
        note: note || '',
        createdAt: now
      };
      positions.push(position);
    }

    portfolio.updatedAt = now;

    this._saveToStorage('portfolio_positions', positions);

    // Update portfolio record
    const portfolios = this._getFromStorage('portfolios');
    const idx = portfolios.findIndex((p) => p.id === portfolio.id);
    if (idx !== -1) {
      portfolios[idx] = portfolio;
      this._saveToStorage('portfolios', portfolios);
    }

    return { portfolio, position };
  }

  getPortfolioOverview() {
    const portfolio = this._getOrCreateDefaultPortfolio();
    const positions = this._getFromStorage('portfolio_positions').filter((p) => p.portfolioId === portfolio.id);
    const coins = this._getFromStorage('coins');
    const roiScenarios = this._getFromStorage('roi_scenarios');

    let totalValueUnits = 0;
    const positionDetails = positions.map((position) => {
      const coin = coins.find((c) => c.id === position.coinId) || null;
      const currentValueUsd = position.allocationPercent || 0; // treat allocation as value units
      totalValueUnits += currentValueUsd;
      return {
        position,
        coin,
        currentValueUsd
      };
    });

    let averageRiskScore = 0;
    if (positionDetails.length > 0) {
      let weightedRiskSum = 0;
      let weightSum = 0;
      positionDetails.forEach(({ position, coin }) => {
        if (!coin || typeof coin.riskScore !== 'number') return;
        const weight = position.allocationPercent || 0;
        weightedRiskSum += coin.riskScore * weight;
        weightSum += weight;
      });
      averageRiskScore = weightSum > 0 ? weightedRiskSum / weightSum : 0;
    }

    const categoryMap = new Map();
    positionDetails.forEach(({ position, coin }) => {
      if (!coin) return;
      const cat = coin.category || 'other';
      const current = categoryMap.get(cat) || 0;
      categoryMap.set(cat, current + (position.allocationPercent || 0));
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, allocationPercent]) => ({
      category,
      allocationPercent
    }));

    const portfolioCoinIds = new Set(positions.map((p) => p.coinId));
    const portfolioRoiScenarios = roiScenarios.filter((s) => portfolioCoinIds.has(s.coinId));

    return {
      portfolio,
      positions: positionDetails,
      metrics: {
        totalValueUsd: totalValueUnits,
        averageRiskScore,
        categoryBreakdown
      },
      roiScenarios: portfolioRoiScenarios
    };
  }

  updatePortfolioPosition(portfolioPositionId, allocationPercent, note) {
    const positions = this._getFromStorage('portfolio_positions');
    const idx = positions.findIndex((p) => p.id === portfolioPositionId);
    if (idx === -1) {
      return { position: null };
    }

    if (typeof allocationPercent === 'number') {
      positions[idx].allocationPercent = allocationPercent;
    }
    if (typeof note !== 'undefined') {
      positions[idx].note = note;
    }

    this._saveToStorage('portfolio_positions', positions);
    return { position: positions[idx] };
  }

  removePortfolioPosition(portfolioPositionId) {
    const positions = this._getFromStorage('portfolio_positions');
    const newPositions = positions.filter((p) => p.id !== portfolioPositionId);
    const success = newPositions.length !== positions.length;
    this._saveToStorage('portfolio_positions', newPositions);
    return { success };
  }

  // ==================
  // ROI Calculator
  // ==================

  calculateCoinRoiPreview(coinId, initialInvestmentUsd, recurringInvestmentUsd = 0, frequency, durationMonths) {
    const coins = this._getFromStorage('coins');
    const coin = coins.find((c) => c.id === coinId) || null;
    const { computedFinalValueUsd, computedRoiPercent } = this._computeRoiForScenario(coin, {
      initialInvestmentUsd,
      recurringInvestmentUsd,
      frequency,
      durationMonths
    });
    return { computedFinalValueUsd, computedRoiPercent };
  }

  saveRoiScenario(coinId, name, initialInvestmentUsd, recurringInvestmentUsd = 0, frequency, durationMonths) {
    const coins = this._getFromStorage('coins');
    const coin = coins.find((c) => c.id === coinId) || null;
    const { computedFinalValueUsd, computedRoiPercent } = this._computeRoiForScenario(coin, {
      initialInvestmentUsd,
      recurringInvestmentUsd,
      frequency,
      durationMonths
    });

    const scenarios = this._getFromStorage('roi_scenarios');
    const now = this._nowIso();
    const scenario = {
      id: this._generateId('roiscenario'),
      coinId,
      name,
      initialInvestmentUsd,
      recurringInvestmentUsd,
      frequency,
      durationMonths,
      startDate: now,
      computedFinalValueUsd,
      computedRoiPercent,
      createdAt: now,
      updatedAt: now
    };

    scenarios.push(scenario);
    this._saveToStorage('roi_scenarios', scenarios);
    return { scenario };
  }

  getCoinRoiScenarios(coinId) {
    const scenarios = this._getFromStorage('roi_scenarios');
    return scenarios.filter((s) => s.coinId === coinId);
  }

  getPortfolioRoiScenariosSummary() {
    const portfolio = this._getOrCreateDefaultPortfolio();
    const positions = this._getFromStorage('portfolio_positions').filter((p) => p.portfolioId === portfolio.id);
    const scenarios = this._getFromStorage('roi_scenarios');
    const coinIds = new Set(positions.map((p) => p.coinId));
    return scenarios.filter((s) => coinIds.has(s.coinId));
  }

  // ==================
  // Watchlist & Alerts
  // ==================

  addCoinToWatchlist(coinId, notes) {
    const watchlistItems = this._getFromStorage('watchlist_items');
    let item = watchlistItems.find((w) => w.coinId === coinId);
    if (item) {
      if (typeof notes !== 'undefined') {
        item.notes = notes;
        this._saveToStorage('watchlist_items', watchlistItems);
      }
      return { watchlistItem: item, isNew: false };
    }

    item = {
      id: this._generateId('watchlistitem'),
      coinId,
      notes: notes || '',
      createdAt: this._nowIso()
    };

    watchlistItems.push(item);
    this._saveToStorage('watchlist_items', watchlistItems);

    return { watchlistItem: item, isNew: true };
  }

  removeCoinFromWatchlist(watchlistItemId) {
    const watchlistItems = this._getFromStorage('watchlist_items');
    const newItems = watchlistItems.filter((w) => w.id !== watchlistItemId);
    const success = newItems.length !== watchlistItems.length;
    this._saveToStorage('watchlist_items', newItems);
    return { success };
  }

  getWatchlistOverview() {
    const watchlistItems = this._getFromStorage('watchlist_items');
    const coins = this._getFromStorage('coins');
    const alerts = this._getFromStorage('price_alerts');

    const items = watchlistItems.map((watchlistItem) => {
      const coin = coins.find((c) => c.id === watchlistItem.coinId) || null;
      const priceUsd = coin && typeof coin.priceUsd === 'number' ? coin.priceUsd : null;
      const activeAlerts = alerts.filter(
        (a) => a.coinId === watchlistItem.coinId && a.isActive !== false
      );
      const change24hPercent = null; // Not available in model

      return {
        watchlistItem,
        coin,
        priceUsd,
        change24hPercent,
        activeAlerts
      };
    });

    return { items };
  }

  getCoinAlerts(coinId) {
    const alerts = this._getFromStorage('price_alerts');
    return alerts.filter((a) => a.coinId === coinId);
  }

  createPriceAlert(coinId, conditionType, thresholdPercent, thresholdValueUsd, timeWindowHours, channels) {
    const alerts = this._getFromStorage('price_alerts');
    const alert = {
      id: this._generateId('pricealert'),
      coinId,
      conditionType,
      thresholdPercent: typeof thresholdPercent === 'number' ? thresholdPercent : undefined,
      thresholdValueUsd: typeof thresholdValueUsd === 'number' ? thresholdValueUsd : undefined,
      timeWindowHours: typeof timeWindowHours === 'number' ? timeWindowHours : undefined,
      channels: Array.isArray(channels) ? channels.slice() : [],
      isActive: true,
      createdAt: this._nowIso()
    };
    alerts.push(alert);
    this._saveToStorage('price_alerts', alerts);
    return { alert };
  }

  // ==================
  // Referral Offers & Campaigns
  // ==================

  getReferralOfferFilterOptions() {
    const bonusTypes = [
      { value: 'instant_bonus', label: 'Instant bonus' },
      { value: 'locked_bonus', label: 'Locked bonus' },
      { value: 'vesting_bonus', label: 'Vesting bonus' },
      { value: 'cashback', label: 'Cashback' },
      { value: 'fee_discount', label: 'Fee discount' },
      { value: 'other', label: 'Other' }
    ];

    const minDepositRanges = [
      { maxMinDepositUsd: 100, label: 'Up to $100 min deposit' },
      { maxMinDepositUsd: 500, label: 'Up to $500 min deposit' },
      { maxMinDepositUsd: 1000, label: 'Up to $1,000 min deposit' }
    ];

    const sortOptions = [
      { value: 'bonus_amount_desc', label: 'Bonus amount: High to Low' },
      { value: 'min_deposit_asc', label: 'Minimum deposit: Low to High' }
    ];

    return { bonusTypes, minDepositRanges, sortOptions };
  }

  getReferralOffers(filters = {}, sort = 'bonus_amount_desc', page = 1, pageSize = 20) {
    const offers = this._getFromStorage('referral_offers');
    const exchanges = this._getFromStorage('exchanges');

    let results = offers.slice();

    if (typeof filters.maxMinDepositUsd === 'number') {
      results = results.filter((o) =>
        typeof o.minDepositUsd === 'number' && o.minDepositUsd <= filters.maxMinDepositUsd
      );
    }

    if (filters.bonusType) {
      results = results.filter((o) => o.bonusType === filters.bonusType);
    }

    if (filters.isActiveOnly) {
      results = results.filter((o) => o.isActive !== false);
    }

    const sortKey = sort || 'bonus_amount_desc';
    if (sortKey === 'bonus_amount_desc') {
      results.sort((a, b) => {
        const ba = typeof a.bonusAmountUsd === 'number' ? a.bonusAmountUsd : 0;
        const bb = typeof b.bonusAmountUsd === 'number' ? b.bonusAmountUsd : 0;
        return bb - ba;
      });
    } else if (sortKey === 'min_deposit_asc') {
      results.sort((a, b) => {
        const da = typeof a.minDepositUsd === 'number' ? a.minDepositUsd : Infinity;
        const db = typeof b.minDepositUsd === 'number' ? b.minDepositUsd : Infinity;
        return da - db;
      });
    }

    const { items, total, page: p, pageSize: ps } = this._applyPagination(results, page, pageSize);

    const enrichedItems = items.map((offer) => ({
      offer: {
        ...offer,
        exchange: exchanges.find((e) => e.id === offer.exchangeId) || null
      },
      exchange: exchanges.find((e) => e.id === offer.exchangeId) || null
    }));

    return {
      items: enrichedItems,
      total,
      page: p,
      pageSize: ps
    };
  }

  getReferralOfferDetail(referralOfferId) {
    const offers = this._getFromStorage('referral_offers');
    const exchanges = this._getFromStorage('exchanges');
    const offerRaw = offers.find((o) => o.id === referralOfferId) || null;
    const exchange = offerRaw
      ? exchanges.find((e) => e.id === offerRaw.exchangeId) || null
      : null;
    const offer = offerRaw ? { ...offerRaw, exchange } : null;
    return { offer, exchange };
  }

  updateReferralOfferUserNote(referralOfferId, userNote) {
    const offers = this._getFromStorage('referral_offers');
    const idx = offers.findIndex((o) => o.id === referralOfferId);
    if (idx === -1) {
      return { offer: null };
    }
    offers[idx].userNote = userNote || '';
    offers[idx].updatedAt = this._nowIso();
    this._saveToStorage('referral_offers', offers);
    return { offer: offers[idx] };
  }

  getReferralCampaignsOverview() {
    return this._getFromStorage('referral_campaigns');
  }

  createReferralCampaign(name, landingPage, medium) {
    const campaigns = this._getFromStorage('referral_campaigns');
    const now = this._nowIso();
    const id = this._generateId('referralcampaign');
    const campaign = {
      id,
      name,
      landingPage,
      medium,
      referralLink: this._generateReferralCampaignLink(id),
      internalNote: '',
      createdAt: now,
      updatedAt: now
    };
    campaigns.push(campaign);
    this._saveToStorage('referral_campaigns', campaigns);
    return { campaign };
  }

  updateReferralCampaignNote(referralCampaignId, internalNote) {
    const campaigns = this._getFromStorage('referral_campaigns');
    const idx = campaigns.findIndex((c) => c.id === referralCampaignId);
    if (idx === -1) {
      return { campaign: null };
    }
    campaigns[idx].internalNote = internalNote || '';
    campaigns[idx].updatedAt = this._nowIso();
    this._saveToStorage('referral_campaigns', campaigns);
    return { campaign: campaigns[idx] };
  }

  // ==================
  // Instrumentation Helpers (Task Tracking)
  // ==================

  // Records when a user copies a referral offer's code or link (Task 3)
  recordReferralOfferCodeCopied(copiedOfferId) {
    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task3_copyAction',
        JSON.stringify({
          referralOfferId: copiedOfferId,
          copiedAt: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }
  }

  // Records when a user copies a referral campaign link (Task 9)
  recordReferralCampaignLinkCopied(campaignId) {
    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task9_campaignLinkCopy',
        JSON.stringify({
          referralCampaignId: campaignId,
          copiedAt: this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }
  }

  // ==================
  // Articles, Bookmarks, Reading Lists
  // ==================

  getArticleFilterOptions() {
    const difficultyLevels = [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' }
    ];

    const dateRanges = [
      { value: 'last_30_days', label: 'Last 30 days' },
      { value: 'last_6_months', label: 'Last 6 months' },
      { value: 'last_12_months', label: 'Last 12 months' },
      { value: 'all_time', label: 'All time' }
    ];

    return { difficultyLevels, dateRanges };
  }

  searchArticles(query, difficultyLevel, publishedAfter, page = 1, pageSize = 20) {
    const articles = this._getFromStorage('articles');
    const q = (query || '').toLowerCase().trim();

    let results = articles.slice();

    if (q) {
      const matchesText = (text) => (text || '').toLowerCase().includes(q);
      results = results.filter((a) => {
        if (matchesText(a.title) || matchesText(a.summary) || matchesText(a.body)) {
          return true;
        }
        if (Array.isArray(a.topics)) {
          return a.topics.some((t) => matchesText(t));
        }
        return false;
      });
    }

    if (difficultyLevel) {
      results = results.filter((a) => a.difficultyLevel === difficultyLevel);
    }

    if (publishedAfter) {
      const cutoff = Date.parse(publishedAfter);
      if (!Number.isNaN(cutoff)) {
        results = results.filter((a) => {
          const d = a.publishDate ? Date.parse(a.publishDate) : 0;
          return d >= cutoff;
        });
      }
    }

    results.sort((a, b) => {
      const da = a.publishDate ? Date.parse(a.publishDate) : 0;
      const db = b.publishDate ? Date.parse(b.publishDate) : 0;
      return db - da;
    });

    const { items, total, page: p, pageSize: ps } = this._applyPagination(results, page, pageSize);
    return { items, total, page: p, pageSize: ps };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const bookmarks = this._getFromStorage('article_bookmarks');
    const readingLists = this._getFromStorage('reading_lists');
    const readingListItems = this._getFromStorage('reading_list_items');

    const article = articles.find((a) => a.id === articleId) || null;
    const bookmark = bookmarks.find((b) => b.articleId === articleId) || null;
    const isBookmarked = !!bookmark;

    const readingListsContainingArticle = readingLists.filter((list) =>
      readingListItems.some(
        (item) => item.readingListId === list.id && item.articleId === articleId
      )
    );

    return {
      article,
      isBookmarked,
      readingListsContainingArticle
    };
  }

  bookmarkArticle(articleId, bookmarked) {
    const bookmarks = this._getFromStorage('article_bookmarks');
    let existingIndex = bookmarks.findIndex((b) => b.articleId === articleId);

    if (bookmarked) {
      if (existingIndex === -1) {
        const bookmark = {
          id: this._generateId('articlebookmark'),
          articleId,
          createdAt: this._nowIso()
        };
        bookmarks.push(bookmark);
        this._saveToStorage('article_bookmarks', bookmarks);
        return { bookmark, isBookmarked: true };
      } else {
        return { bookmark: bookmarks[existingIndex], isBookmarked: true };
      }
    } else {
      if (existingIndex !== -1) {
        const removed = bookmarks.splice(existingIndex, 1)[0];
        this._saveToStorage('article_bookmarks', bookmarks);
        return { bookmark: removed, isBookmarked: false };
      } else {
        return { bookmark: null, isBookmarked: false };
      }
    }
  }

  getReadingListsOverview() {
    const readingLists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    return readingLists.map((readingList) => {
      const articleCount = items.filter((i) => i.readingListId === readingList.id).length;
      return { readingList, articleCount };
    });
  }

  createReadingList(name, description) {
    const readingLists = this._getFromStorage('reading_lists');
    const now = this._nowIso();
    const readingList = {
      id: this._generateId('readinglist'),
      name,
      description: description || '',
      createdAt: now,
      updatedAt: now
    };
    readingLists.push(readingList);
    this._saveToStorage('reading_lists', readingLists);
    return { readingList };
  }

  addArticleToReadingList(readingListId, articleId) {
    const items = this._getFromStorage('reading_list_items');
    const exists = items.find(
      (i) => i.readingListId === readingListId && i.articleId === articleId
    );
    if (exists) {
      return { readingListItem: exists };
    }
    const readingListItem = {
      id: this._generateId('readinglistitem'),
      readingListId,
      articleId,
      addedAt: this._nowIso()
    };
    items.push(readingListItem);
    this._saveToStorage('reading_list_items', items);
    return { readingListItem };
  }

  // ==================
  // Informational Pages & Contact
  // ==================

  getInformationalPageContent(pageSlug) {
    const now = new Date();
    const lastUpdated = now.toISOString().slice(0, 10);

    const pages = {
      about: {
        title: 'About Us',
        body: 'This platform provides independent reviews of cryptocurrency exchanges, coins, and referral offers to help users make informed decisions.',
        lastUpdated
      },
      help_faq: {
        title: 'Help & FAQ',
        body: 'Find answers to common questions about using our crypto review, portfolio, and referral tools.',
        lastUpdated
      },
      terms_of_use: {
        title: 'Terms of Use',
        body: 'By using this site, you agree that none of the content constitutes financial advice. Always do your own research.',
        lastUpdated
      },
      privacy_policy: {
        title: 'Privacy Policy',
        body: 'We store only the data needed to operate your account and preferences, including local device storage for faster access.',
        lastUpdated
      }
    };

    const key = pageSlug in pages ? pageSlug : 'about';
    return pages[key];
  }

  submitContactForm(name, email, subject, message, category) {
    const contacts = this._getFromStorage('contact_messages');
    const entry = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      category: category || 'general_question',
      createdAt: this._nowIso()
    };
    contacts.push(entry);
    this._saveToStorage('contact_messages', contacts);
    return {
      success: true,
      message: 'Your message has been received.'
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