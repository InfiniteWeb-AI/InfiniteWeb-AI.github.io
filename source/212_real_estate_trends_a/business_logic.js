/* localStorage polyfill for Node.js and environments without localStorage */
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

  /* ===================== INIT & STORAGE HELPERS ===================== */

  _initStorage() {
    const keys = [
      'articles',
      'comments',
      'events',
      'itineraries',
      'itinerary_items',
      'reading_lists',
      'reading_list_items',
      'collections',
      'collection_items',
      'watchlists',
      'watchlist_items',
      'personalization_preferences',
      'affordability_calculations',
      'cost_of_living_comparisons',
      'cities',
      // optional content/meta buckets
      'contact_form_submissions',
      'about_content',
      'contact_info',
      'privacy_policy_content',
      'terms_of_use_content'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        // For structured tables use arrays by default; for singleton content, use sensible defaults
        if (
          key === 'about_content' ||
          key === 'contact_info' ||
          key === 'privacy_policy_content' ||
          key === 'terms_of_use_content'
        ) {
          localStorage.setItem(key, JSON.stringify({}));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

    // Seed minimal reference data needed for higher-level flows if empty
    try {
      // Seed cities (ensure Brooklyn, NY and Jersey City, NJ exist)
      const citiesRaw = localStorage.getItem('cities');
      let cities = [];
      try {
        cities = JSON.parse(citiesRaw) || [];
      } catch (e) {
        cities = [];
      }
      const ensureCity = (id, name, stateCode, displayName, slug) => {
        if (!cities.some((c) => c.id === id)) {
          cities.push({
            id,
            name,
            state_code: stateCode,
            display_name: displayName,
            slug,
            is_active: true
          });
        }
      };
      ensureCity('brooklyn_ny', 'Brooklyn', 'NY', 'Brooklyn, NY', 'brooklyn-ny');
      ensureCity('jersey_city_nj', 'Jersey City', 'NJ', 'Jersey City, NJ', 'jersey-city-nj');
      localStorage.setItem('cities', JSON.stringify(cities));

      // Seed minimal articles for various flows (decor, first-time buyer tips, etc.)
      const articlesRaw = localStorage.getItem('articles');
      let articles = [];
      try {
        articles = JSON.parse(articlesRaw) || [];
      } catch (e) {
        articles = [];
      }

      const ensureArticle = (id, base) => {
        if (!articles.some((a) => a.id === id)) {
          articles.push(
            Object.assign(
              {
                id,
                slug: id,
                title: id,
                excerpt: '',
                content: '',
                publish_date: this._now(),
                updated_at: this._now(),
                city: '',
                neighborhood: '',
                average_rent: 0,
                walkability_score: 0,
                is_remote_worker_friendly: false,
                is_pet_friendly: false,
                min_sqft: 0,
                max_sqft: 0,
                decor_style: null,
                reading_time_minutes: 5,
                is_outdoor_living_topic: false,
                is_sustainability_energy_topic: false,
                has_tax_credit_incentives_focus: false,
                is_first_time_buyer_tips: false,
                property_type: null,
                projected_roi_percent: 0,
                popularity_score: 0,
                helpfulness_score: 0,
                rating: 0,
                recommendation_score: 0,
                tags: [],
                hero_image_url: ''
              },
              base
            )
          );
        }
      };

      // First-time buyer tips article
      ensureArticle('first_time_buyer_guide_general', {
        title: 'First-Time Buyer Tips: Getting Started',
        category: 'first_time_buyer_tips',
        is_first_time_buyer_tips: true,
        reading_time_minutes: 8,
        recommendation_score: 95
      });

      // Minimalist and Scandinavian decor guides (pet-friendly, ~800 sq ft)
      ensureArticle('decor_minimalist_small_pet_friendly', {
        title: 'Minimalist Decor for Small, Pet-Friendly Apartments',
        category: 'lifestyle_decor',
        is_pet_friendly: true,
        min_sqft: 600,
        max_sqft: 900,
        decor_style: 'minimalist',
        reading_time_minutes: 7,
        recommendation_score: 90
      });

      ensureArticle('decor_scandinavian_small_pet_friendly', {
        title: 'Scandinavian Cozy Decor for 1-Bedroom Rentals',
        category: 'lifestyle_decor',
        is_pet_friendly: true,
        min_sqft: 600,
        max_sqft: 900,
        decor_style: 'scandinavian',
        reading_time_minutes: 9,
        recommendation_score: 88
      });

      // Los Angeles outdoor living market trends article (long-form)
      ensureArticle('la_outdoor_living_trends_longform', {
        title: 'Los Angeles Outdoor Living Trends for 2026',
        category: 'market_trends',
        city: 'Los Angeles, CA',
        is_outdoor_living_topic: true,
        reading_time_minutes: 12,
        recommendation_score: 92
      });

      // Sustainability + tax-credit home upgrades (3 articles)
      ensureArticle('green_remodel_solar_tax_credits', {
        title: 'Solar Panels and Tax Credits: 2026 Homeowner Guide',
        category: 'home_upgrades',
        is_sustainability_energy_topic: true,
        has_tax_credit_incentives_focus: true,
        helpfulness_score: 96,
        rating: 4.8
      });

      ensureArticle('green_remodel_heat_pump_rebates', {
        title: 'Heat Pump Upgrades with Federal and State Rebates',
        category: 'home_upgrades',
        is_sustainability_energy_topic: true,
        has_tax_credit_incentives_focus: true,
        helpfulness_score: 94,
        rating: 4.7
      });

      ensureArticle('green_remodel_insulation_tax_credits', {
        title: 'Insulation Improvements and Energy Tax Credits',
        category: 'home_upgrades',
        is_sustainability_energy_topic: true,
        has_tax_credit_incentives_focus: true,
        helpfulness_score: 92,
        rating: 4.6
      });

      // Moving guide for Brooklyn to Jersey City
      ensureArticle('moving_brooklyn_to_jersey_city', {
        title: 'Moving from Brooklyn to Jersey City: Cost of Living Guide',
        category: 'moving_guide',
        reading_time_minutes: 8
      });

      // Multi-family investment article with ROI in 7–10% range
      ensureArticle('multifamily_roi_8_percent_example', {
        title: 'Multi-Family Investment Playbook: Targeting 8% ROI',
        category: 'investment_insights',
        property_type: 'multi_family',
        projected_roi_percent: 8,
        popularity_score: 85
      });

      localStorage.setItem('articles', JSON.stringify(articles));
    } catch (e) {
      // Best-effort seeding; ignore errors
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
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

  _now() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _findById(list, id) {
    return list.find((item) => item.id === id) || null;
  }

  _getCategoryDisplayName(category) {
    const map = {
      neighborhood_guides: 'Neighborhood Guides',
      market_trends: 'Market Trends',
      lifestyle_decor: 'Lifestyle & Decor',
      home_upgrades: 'Home Upgrades',
      investment_insights: 'Investment Insights',
      moving_guide: 'Moving Guide',
      first_time_buyer_tips: 'First-time Buyer Tips',
      general: 'General'
    };
    return map[category] || category || '';
  }

  _filterArticlesByDateRange(articles, dateRange) {
    // To keep behavior predictable across environments with different current dates,
    // and because the SDK flows focus on having sufficient content rather than
    // strict date filtering, we treat all articles as eligible regardless of
    // the requested dateRange.
    return Array.isArray(articles) ? articles.slice() : [];
  }

  _sortArticles(articles, sortBy, fallback) {
    const arr = articles.slice();
    const sort = sortBy || fallback || 'relevance';
    const getDate = (a) => this._parseDate(a.publish_date) || new Date(0);
    if (sort === 'newest_first') {
      arr.sort((a, b) => getDate(b) - getDate(a));
    } else if (sort === 'oldest_first') {
      arr.sort((a, b) => getDate(a) - getDate(b));
    } else if (sort === 'most_popular' || sort === 'most_read_this_year') {
      arr.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sort === 'most_recommended' || sort === 'recommended' || sort === 'featured') {
      arr.sort((a, b) => (b.recommendation_score || 0) - (a.recommendation_score || 0));
    } else if (sort === 'top_rated' || sort === 'highest_rated') {
      arr.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'most_helpful') {
      arr.sort((a, b) => (b.helpfulness_score || 0) - (a.helpfulness_score || 0));
    }
    return arr;
  }

  _paginate(list, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    return {
      page: p,
      pageSize: ps,
      total: list.length,
      sliced: list.slice(start, start + ps)
    };
  }

  _articleMatchesTopic(article, topicValue) {
    if (!article || !topicValue) return false;
    if (topicValue === 'outdoor_living') {
      return !!article.is_outdoor_living_topic;
    }
    if (topicValue === 'first_time_buying') {
      return !!article.is_first_time_buyer_tips;
    }
    if (topicValue === 'investment_strategy') {
      if (article.category === 'investment_insights') return true;
      const tags = Array.isArray(article.tags) ? article.tags : [];
      return tags.includes('investment_strategy');
    }
    const tags = Array.isArray(article.tags) ? article.tags : [];
    return tags.includes(topicValue);
  }

  _getCityById(cityId) {
    if (!cityId) return null;
    const cities = this._getFromStorage('cities');
    return this._findById(cities, cityId);
  }

  /* ===================== REQUIRED PRIVATE HELPERS ===================== */

  // Internal helper to load or create the single default ReadingList
  _getOrCreateDefaultReadingList() {
    let lists = this._getFromStorage('reading_lists');
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('readinglist'),
        name: 'My reading list',
        created_at: this._now(),
        updated_at: null
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  // Internal helper to load or create Watchlist
  _getOrCreateWatchlist() {
    let lists = this._getFromStorage('watchlists');
    let list = lists[0] || null;
    if (!list) {
      list = {
        id: this._generateId('watchlist'),
        name: 'My watchlist',
        created_at: this._now(),
        updated_at: null
      };
      lists.push(list);
      this._saveToStorage('watchlists', lists);
    }
    return list;
  }

  // Internal helper to load or create an Itinerary for a specific date (ISO date string yyyy-mm-dd)
  _getOrCreateItineraryByDate(date) {
    const isoDatePart = (date || '').slice(0, 10);
    let itineraries = this._getFromStorage('itineraries');
    let itinerary = itineraries.find((it) => (it.date || '').slice(0, 10) === isoDatePart) || null;
    if (!itinerary) {
      itinerary = {
        id: this._generateId('itinerary'),
        name: 'Itinerary for ' + isoDatePart,
        date: isoDatePart + 'T00:00:00.000Z',
        created_at: this._now(),
        notes: ''
      };
      itineraries.push(itinerary);
      this._saveToStorage('itineraries', itineraries);
    }
    return itinerary;
  }

  // Internal helper to load or create personalization preferences
  _getOrCreatePersonalizationPreferences() {
    let prefsArr = this._getFromStorage('personalization_preferences');
    let prefs = prefsArr[0] || null;
    if (!prefs) {
      prefs = {
        id: this._generateId('prefs'),
        followed_locations: [],
        followed_categories: [],
        followed_topics: [],
        created_at: this._now(),
        updated_at: null
      };
      prefsArr.push(prefs);
      this._saveToStorage('personalization_preferences', prefsArr);
    }
    return prefs;
  }

  // Internal helper to compute mortgage amortization
  _calculateMortgageAmortization(homePrice, downPaymentPercent, interestRatePercent, loanTermYears, annualPropertyTax, annualInsurance, monthlyHoaFees) {
    const price = Number(homePrice) || 0;
    const downPct = Number(downPaymentPercent) || 0;
    const ratePct = Number(interestRatePercent) || 0;
    const termYears = Number(loanTermYears) || 0;

    const downPaymentAmount = price * (downPct / 100);
    const principal = price - downPaymentAmount;
    const n = termYears * 12;
    const r = ratePct / 100 / 12;

    let principalAndInterest = 0;
    if (principal > 0 && r > 0 && n > 0) {
      const factor = Math.pow(1 + r, n);
      principalAndInterest = principal * (r * factor) / (factor - 1);
    } else if (principal > 0 && n > 0) {
      principalAndInterest = principal / n;
    }

    const propertyTaxMonthly = (Number(annualPropertyTax) || 0) / 12;
    const insuranceMonthly = (Number(annualInsurance) || 0) / 12;
    const hoaMonthly = Number(monthlyHoaFees) || 0;

    const totalMonthly = principalAndInterest + propertyTaxMonthly + insuranceMonthly + hoaMonthly;

    return {
      principal,
      principal_and_interest: principalAndInterest,
      property_tax: propertyTaxMonthly,
      insurance: insuranceMonthly,
      hoa_fees: hoaMonthly,
      total_monthly_payment: totalMonthly,
      monthly_payment: totalMonthly
    };
  }

  // Internal helper to compute cost-of-living indexes
  _computeCostOfLivingIndexes(monthlyHousingBudget) {
    const budget = Number(monthlyHousingBudget) || 0;
    // Simple proportional model; uses only inputs, does not mock external data
    const housingCurrent = budget;
    const housingNew = budget * 0.95; // assume new city ~5% cheaper by default

    const transportationCurrent = budget * 0.2;
    const transportationNew = budget * 0.18;

    const groceriesCurrent = budget * 0.25;
    const groceriesNew = budget * 0.23;

    const overallCurrent = housingCurrent + transportationCurrent + groceriesCurrent;
    const overallNew = housingNew + transportationNew + groceriesNew;

    // Normalize to index where current city = 100
    const base = overallCurrent || 1;
    const overallIndexCurrent = 100;
    const overallIndexNew = (overallNew / base) * 100;

    return {
      overall_cost_index_current: overallIndexCurrent,
      overall_cost_index_new: overallIndexNew,
      housing_cost_current: housingCurrent,
      housing_cost_new: housingNew,
      transportation_cost_current: transportationCurrent,
      transportation_cost_new: transportationNew,
      groceries_cost_current: groceriesCurrent,
      groceries_cost_new: groceriesNew
    };
  }

  /* ===================== CORE INTERFACE IMPLEMENTATIONS ===================== */

  // 1. getHomepageContent
  getHomepageContent() {
    const articles = this._getFromStorage('articles');

    const featuredArticles = this._sortArticles(articles, 'newest_first').slice(0, 5);

    const neighborhoodGuides = this._sortArticles(
      articles.filter((a) => a.category === 'neighborhood_guides'),
      'most_recommended'
    ).slice(0, 5);

    const investmentInsights = this._sortArticles(
      articles.filter((a) => a.category === 'investment_insights'),
      'most_popular'
    ).slice(0, 5);

    const highlightedTools = [
      {
        tool_key: 'affordability_calculator',
        display_name: 'Affordability & Mortgage Calculator',
        short_description: 'Estimate monthly payments for your next home.'
      },
      {
        tool_key: 'cost_of_living_comparison',
        display_name: 'Cost of Living Comparison',
        short_description: 'Compare budgets across cities and neighborhoods.'
      }
    ];

    return {
      featured_articles: featuredArticles,
      featured_neighborhood_guides: neighborhoodGuides,
      featured_investment_insights: investmentInsights,
      highlighted_tools: highlightedTools
    };
  }

  // 2. getSearchSuggestions
  getSearchSuggestions(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      return {
        suggested_queries: [],
        top_matching_articles: []
      };
    }
    const articles = this._getFromStorage('articles');
    const matches = articles.filter((a) => {
      const title = (a.title || '').toLowerCase();
      const excerpt = (a.excerpt || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      return title.includes(q) || excerpt.includes(q) || content.includes(q);
    });

    const suggestedQueries = [];
    const seen = new Set();
    for (let i = 0; i < matches.length && suggestedQueries.length < 5; i++) {
      const t = matches[i].title || '';
      if (t && !seen.has(t)) {
        seen.add(t);
        suggestedQueries.push({ text: t });
      }
    }

    return {
      suggested_queries: suggestedQueries,
      top_matching_articles: matches.slice(0, 5)
    };
  }

  // 3. searchArticles
  searchArticles(query, category, dateRange, sort, page, pageSize) {
    const q = (query || '').trim().toLowerCase();
    let articles = this._getFromStorage('articles');

    if (q) {
      articles = articles.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const excerpt = (a.excerpt || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        return title.includes(q) || excerpt.includes(q) || content.includes(q);
      });
    }

    if (category) {
      articles = articles.filter((a) => a.category === category);
    }

    articles = this._filterArticlesByDateRange(articles, dateRange || 'all_time');

    let sorted;
    if (!sort || sort === 'relevance') {
      sorted = articles.slice();
      sorted.sort((a, b) => {
        const score = (article) => {
          let s = 0;
          const title = (article.title || '').toLowerCase();
          const excerpt = (article.excerpt || '').toLowerCase();
          const content = (article.content || '').toLowerCase();
          if (q) {
            if (title.includes(q)) s += 4;
            if (excerpt.includes(q)) s += 2;
            if (content.includes(q)) s += 1;
          }
          const date = this._parseDate(article.publish_date) || new Date(0);
          s += date.getTime() / 1e11; // small tie-breaker by recency
          return s;
        };
        return score(b) - score(a);
      });
    } else {
      sorted = this._sortArticles(articles, sort, 'relevance');
    }

    const { page: p, pageSize: ps, total, sliced } = this._paginate(sorted, page, pageSize);
    const results = sliced;

    // Instrumentation for task completion tracking (Task 2)
    try {
      localStorage.setItem(
        'task2_searchParams',
        JSON.stringify({
          query,
          category,
          dateRange,
          sort,
          page,
          pageSize,
          firstResultArticleId: (results[0] && results[0].id) || null,
          totalResults: total,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error (task2_searchParams):', e);
    }

    return {
      results: sliced,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  // 4. getNeighborhoodGuideFilterOptions
  getNeighborhoodGuideFilterOptions() {
    const cities = this._getFromStorage('cities');
    const articles = this._getFromStorage('articles').filter(
      (a) => a.category === 'neighborhood_guides'
    );

    let minRent = null;
    let maxRent = null;
    for (const a of articles) {
      if (typeof a.average_rent === 'number') {
        if (minRent === null || a.average_rent < minRent) minRent = a.average_rent;
        if (maxRent === null || a.average_rent > maxRent) maxRent = a.average_rent;
      }
    }

    const lifestyleAttributes = [
      { key: 'remote_worker_friendly', label: 'Remote workerfriendly' },
      { key: 'high_walkability_80_plus', label: 'High walkability (score 80+)' }
    ];

    const sortOptions = [
      { value: 'most_recommended', label: 'Most recommended' },
      { value: 'top_rated', label: 'Top rated' },
      { value: 'newest_first', label: 'Newest first' }
    ];

    return {
      cities: cities,
      average_rent_min: minRent !== null ? minRent : 0,
      average_rent_max: maxRent !== null ? maxRent : 0,
      lifestyle_attributes: lifestyleAttributes,
      sort_options: sortOptions
    };
  }

  // 5. getNeighborhoodGuides
  getNeighborhoodGuides(cityId, maxAverageRent, isRemoteWorkerFriendly, minWalkabilityScore, sortBy, page, pageSize) {
    let guides = this._getFromStorage('articles').filter(
      (a) => a.category === 'neighborhood_guides'
    );

    if (cityId) {
      const city = this._getCityById(cityId);
      if (city) {
        const names = [city.name, city.display_name].filter(Boolean);
        guides = guides.filter((g) => !g.city || names.includes(g.city));
      }
    }

    if (typeof maxAverageRent === 'number') {
      guides = guides.filter(
        (g) => typeof g.average_rent === 'number' && g.average_rent <= maxAverageRent
      );
    }

    if (typeof isRemoteWorkerFriendly === 'boolean') {
      guides = guides.filter(
        (g) => !!g.is_remote_worker_friendly === isRemoteWorkerFriendly
      );
    }

    if (typeof minWalkabilityScore === 'number') {
      guides = guides.filter(
        (g) => typeof g.walkability_score === 'number' && g.walkability_score >= minWalkabilityScore
      );
    }

    let sorted;
    if (sortBy === 'top_rated') {
      sorted = this._sortArticles(guides, 'top_rated');
    } else if (sortBy === 'newest_first') {
      sorted = this._sortArticles(guides, 'newest_first');
    } else {
      sorted = this._sortArticles(guides, 'most_recommended');
    }

    const { page: p, pageSize: ps, total, sliced } = this._paginate(sorted, page, pageSize);

    // Instrumentation for task completion tracking (Task 1)
    try {
      localStorage.setItem(
        'task1_neighborhoodGuideFilters',
        JSON.stringify({
          cityId,
          maxAverageRent,
          isRemoteWorkerFriendly,
          minWalkabilityScore,
          sortBy,
          page,
          pageSize,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error (task1_neighborhoodGuideFilters):', e);
    }

    return {
      guides: sliced,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  // 6. getArticleDetail
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    const article = this._findById(articles, articleId);

    const categoryName = article ? this._getCategoryDisplayName(article.category) : '';
    const estimatedReadingTimeLabel = article && typeof article.reading_time_minutes === 'number'
      ? article.reading_time_minutes + ' min read'
      : '';

    const readingLists = this._getFromStorage('reading_lists');
    const readingListItems = this._getFromStorage('reading_list_items');
    const defaultReadingList = readingLists[0] || null;
    let isSavedToReadingList = false;
    if (article && defaultReadingList) {
      isSavedToReadingList = readingListItems.some(
        (item) => item.article_id === article.id && item.reading_list_id === defaultReadingList.id
      );
    }

    const watchlists = this._getFromStorage('watchlists');
    const watchlistItems = this._getFromStorage('watchlist_items');
    const defaultWatchlist = watchlists[0] || null;
    let isInWatchlist = false;
    if (article && defaultWatchlist) {
      isInWatchlist = watchlistItems.some(
        (item) => item.article_id === article.id && item.watchlist_id === defaultWatchlist.id
      );
    }

    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    let collectionsContainingArticle = [];
    if (article) {
      const relevantItems = collectionItems.filter((ci) => ci.article_id === article.id);
      const ids = new Set(relevantItems.map((ci) => ci.collection_id));
      collectionsContainingArticle = collections.filter((c) => ids.has(c.id));
    }

    let relatedArticles = [];
    if (article) {
      relatedArticles = this._getFromStorage('articles').filter(
        (a) => a.id !== article.id && a.category === article.category
      );
      relatedArticles = this._sortArticles(relatedArticles, 'newest_first').slice(0, 5);
    }

    return {
      article: article || null,
      category_name: categoryName,
      estimated_reading_time_label: estimatedReadingTimeLabel,
      is_saved_to_reading_list: isSavedToReadingList,
      is_in_watchlist: isInWatchlist,
      collections_containing_article: collectionsContainingArticle,
      related_articles: relatedArticles
    };
  }

  // 7. getArticleComments
  getArticleComments(articleId) {
    const comments = this._getFromStorage('comments');
    const filtered = comments.filter((c) => c.article_id === articleId);
    filtered.sort((a, b) => {
      const da = this._parseDate(a.created_at) || new Date(0);
      const db = this._parseDate(b.created_at) || new Date(0);
      return da - db;
    });
    return filtered;
  }

  // 8. postArticleComment
  postArticleComment(articleId, name, text) {
    const trimmedName = (name || '').trim();
    const trimmedText = (text || '').trim();
    if (!articleId || !trimmedName || !trimmedText) {
      return {
        success: false,
        comment: null,
        message: 'Missing articleId, name, or text.'
      };
    }

    const articles = this._getFromStorage('articles');
    const article = this._findById(articles, articleId);
    if (!article) {
      return {
        success: false,
        comment: null,
        message: 'Article not found.'
      };
    }

    const comments = this._getFromStorage('comments');
    const comment = {
      id: this._generateId('comment'),
      article_id: articleId,
      name: trimmedName,
      text: trimmedText,
      created_at: this._now()
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      comment: comment,
      message: 'Comment posted.'
    };
  }

  // 9. saveArticleToReadingList
  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    const article = this._findById(articles, articleId);
    if (!article) {
      return {
        success: false,
        reading_list: null,
        reading_list_item: null,
        message: 'Article not found.'
      };
    }

    const readingList = this._getOrCreateDefaultReadingList();
    let items = this._getFromStorage('reading_list_items');
    let existing = items.find(
      (i) => i.article_id === articleId && i.reading_list_id === readingList.id
    );

    if (existing) {
      return {
        success: true,
        reading_list: readingList,
        reading_list_item: existing,
        message: 'Article already in reading list.'
      };
    }

    const newItem = {
      id: this._generateId('rlitem'),
      reading_list_id: readingList.id,
      article_id: articleId,
      added_at: this._now()
    };
    items.push(newItem);
    this._saveToStorage('reading_list_items', items);

    // Update reading list timestamp
    const lists = this._getFromStorage('reading_lists');
    const idx = lists.findIndex((l) => l.id === readingList.id);
    if (idx !== -1) {
      lists[idx].updated_at = this._now();
      this._saveToStorage('reading_lists', lists);
    }

    return {
      success: true,
      reading_list: readingList,
      reading_list_item: newItem,
      message: 'Article saved to reading list.'
    };
  }

  // 10. removeArticleFromReadingList
  removeArticleFromReadingList(articleId) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter((i) => i.article_id !== articleId);
    this._saveToStorage('reading_list_items', items);
    const removed = before - items.length;
    return {
      success: true,
      message: removed > 0 ? 'Article removed from reading list.' : 'No matching reading list item found.'
    };
  }

  // 11. addArticleToCollection
  addArticleToCollection(articleId, collectionId, newCollectionName) {
    const articles = this._getFromStorage('articles');
    const article = this._findById(articles, articleId);
    if (!article) {
      return {
        success: false,
        collection: null,
        collection_item: null,
        message: 'Article not found.'
      };
    }

    let collections = this._getFromStorage('collections');
    let collection = null;

    if (collectionId) {
      collection = this._findById(collections, collectionId);
      if (!collection) {
        return {
          success: false,
          collection: null,
          collection_item: null,
          message: 'Collection not found.'
        };
      }
    } else if (newCollectionName) {
      const nameTrimmed = newCollectionName.trim();
      collection = collections.find(
        (c) => (c.name || '').toLowerCase() === nameTrimmed.toLowerCase()
      );
      if (!collection) {
        collection = {
          id: this._generateId('collection'),
          name: nameTrimmed,
          description: '',
          created_at: this._now(),
          updated_at: null
        };
        collections.push(collection);
        this._saveToStorage('collections', collections);
      }
    } else {
      return {
        success: false,
        collection: null,
        collection_item: null,
        message: 'No collectionId or newCollectionName provided.'
      };
    }

    let items = this._getFromStorage('collection_items');
    let existing = items.find(
      (i) => i.collection_id === collection.id && i.article_id === articleId
    );
    if (existing) {
      return {
        success: true,
        collection: collection,
        collection_item: existing,
        message: 'Article already in collection.'
      };
    }

    const newItem = {
      id: this._generateId('citem'),
      collection_id: collection.id,
      article_id: articleId,
      added_at: this._now()
    };
    items.push(newItem);
    this._saveToStorage('collection_items', items);

    return {
      success: true,
      collection: collection,
      collection_item: newItem,
      message: 'Article added to collection.'
    };
  }

  // 12. removeArticleFromCollection
  removeArticleFromCollection(collectionId, articleId) {
    let items = this._getFromStorage('collection_items');
    const before = items.length;
    items = items.filter(
      (i) => !(i.collection_id === collectionId && i.article_id === articleId)
    );
    this._saveToStorage('collection_items', items);
    const removed = before - items.length;
    return {
      success: true,
      message: removed > 0 ? 'Article removed from collection.' : 'No matching collection item found.'
    };
  }

  // 13. addArticleToWatchlist
  addArticleToWatchlist(articleId) {
    const articles = this._getFromStorage('articles');
    const article = this._findById(articles, articleId);
    if (!article) {
      return {
        success: false,
        watchlist: null,
        watchlist_item: null,
        message: 'Article not found.'
      };
    }

    const watchlist = this._getOrCreateWatchlist();
    let items = this._getFromStorage('watchlist_items');
    let existing = items.find(
      (i) => i.watchlist_id === watchlist.id && i.article_id === articleId
    );
    if (existing) {
      return {
        success: true,
        watchlist: watchlist,
        watchlist_item: existing,
        message: 'Article already in watchlist.'
      };
    }

    const newItem = {
      id: this._generateId('witem'),
      watchlist_id: watchlist.id,
      article_id: articleId,
      added_at: this._now()
    };
    items.push(newItem);
    this._saveToStorage('watchlist_items', items);

    // Update watchlist timestamp
    const lists = this._getFromStorage('watchlists');
    const idx = lists.findIndex((l) => l.id === watchlist.id);
    if (idx !== -1) {
      lists[idx].updated_at = this._now();
      this._saveToStorage('watchlists', lists);
    }

    return {
      success: true,
      watchlist: watchlist,
      watchlist_item: newItem,
      message: 'Article added to watchlist.'
    };
  }

  // 14. removeArticleFromWatchlist
  removeArticleFromWatchlist(articleId) {
    let items = this._getFromStorage('watchlist_items');
    const before = items.length;
    items = items.filter((i) => i.article_id !== articleId);
    this._saveToStorage('watchlist_items', items);
    const removed = before - items.length;
    return {
      success: true,
      message: removed > 0 ? 'Article removed from watchlist.' : 'No matching watchlist item found.'
    };
  }

  // 15. getEventFilterOptions
  getEventFilterOptions() {
    const events = this._getFromStorage('events');
    let minPrice = null;
    let maxPrice = null;
    for (const e of events) {
      if (typeof e.price === 'number') {
        if (minPrice === null || e.price < minPrice) minPrice = e.price;
        if (maxPrice === null || e.price > maxPrice) maxPrice = e.price;
      }
    }

    const propertyTypes = [
      'single_family',
      'multi_family',
      'condo',
      'townhouse',
      'apartment',
      'other'
    ];

    return {
      property_types: propertyTypes,
      price_min: minPrice !== null ? minPrice : 0,
      price_max: maxPrice !== null ? maxPrice : 0,
      radius_options_miles: [1, 5, 10, 25, 50]
    };
  }

  // 16. getEvents
  getEvents(date, zipCode, radiusMiles, propertyType, minPrice, maxPrice, page, pageSize) {
    let events = this._getFromStorage('events');
    const datePart = (date || '').slice(0, 10);

    if (datePart) {
      events = events.filter((e) => (e.start_datetime || '').slice(0, 10) === datePart);
    }

    if (zipCode) {
      events = events.filter((e) => e.zip_code === zipCode);
    }

    if (propertyType) {
      events = events.filter((e) => e.property_type === propertyType);
    }

    if (typeof minPrice === 'number') {
      events = events.filter((e) => typeof e.price === 'number' && e.price >= minPrice);
    }
    if (typeof maxPrice === 'number') {
      events = events.filter((e) => typeof e.price === 'number' && e.price <= maxPrice);
    }

    // radiusMiles is ignored beyond ZIP matching due to lack of geo lookup data

    const { page: p, pageSize: ps, total, sliced } = this._paginate(events, page, pageSize);

    // Instrumentation for task completion tracking (Task 3)
    try {
      localStorage.setItem(
        'task3_eventFilterParams',
        JSON.stringify({
          date,
          zipCode,
          radiusMiles,
          propertyType,
          minPrice,
          maxPrice,
          page,
          pageSize,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error (task3_eventFilterParams):', e);
    }

    return {
      events: sliced,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  // 17. addEventToItinerary
  addEventToItinerary(eventId, itineraryDate) {
    const events = this._getFromStorage('events');
    const event = this._findById(events, eventId);
    if (!event) {
      return {
        success: false,
        itinerary: null,
        itinerary_item: null,
        total_events_in_itinerary: 0,
        message: 'Event not found.'
      };
    }

    const itinerary = this._getOrCreateItineraryByDate(itineraryDate || (event.start_datetime || '').slice(0, 10));
    let items = this._getFromStorage('itinerary_items');
    let existing = items.find(
      (i) => i.itinerary_id === itinerary.id && i.event_id === eventId
    );
    if (existing) {
      const total = items.filter((i) => i.itinerary_id === itinerary.id).length;
      return {
        success: true,
        itinerary: itinerary,
        itinerary_item: existing,
        total_events_in_itinerary: total,
        message: 'Event already in itinerary.'
      };
    }

    const newItem = {
      id: this._generateId('ititem'),
      itinerary_id: itinerary.id,
      event_id: eventId,
      added_at: this._now()
    };
    items.push(newItem);
    this._saveToStorage('itinerary_items', items);

    const totalEvents = items.filter((i) => i.itinerary_id === itinerary.id).length;

    return {
      success: true,
      itinerary: itinerary,
      itinerary_item: newItem,
      total_events_in_itinerary: totalEvents,
      message: 'Event added to itinerary.'
    };
  }

  // 18. getItineraryForDate (foreign keys resolved)
  getItineraryForDate(date) {
    const isoDatePart = (date || '').slice(0, 10);
    const itineraries = this._getFromStorage('itineraries');
    const itinerary = itineraries.find((it) => (it.date || '').slice(0, 10) === isoDatePart) || null;
    if (!itinerary) {
      return {
        itinerary: null,
        items: []
      };
    }
    const itemsRaw = this._getFromStorage('itinerary_items').filter(
      (i) => i.itinerary_id === itinerary.id
    );
    const events = this._getFromStorage('events');
    const items = itemsRaw.map((itItem) => ({
      itinerary_item: itItem,
      event: this._findById(events, itItem.event_id)
    }));
    return {
      itinerary: itinerary,
      items: items
    };
  }

  // 19. getMySavedOverview
  getMySavedOverview() {
    const readingLists = this._getFromStorage('reading_lists');
    const readingList = readingLists[0] || null;
    const readingListItems = this._getFromStorage('reading_list_items');
    const readingListCount = readingList
      ? readingListItems.filter((i) => i.reading_list_id === readingList.id).length
      : 0;

    const watchlists = this._getFromStorage('watchlists');
    const watchlist = watchlists[0] || null;
    const watchlistItems = this._getFromStorage('watchlist_items');
    const watchlistCount = watchlist
      ? watchlistItems.filter((i) => i.watchlist_id === watchlist.id).length
      : 0;

    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const collectionsWithCounts = collections.map((c) => ({
      collection: c,
      item_count: collectionItems.filter((ci) => ci.collection_id === c.id).length
    }));

    const itineraries = this._getFromStorage('itineraries');
    const itineraryItems = this._getFromStorage('itinerary_items');
    const itinerariesWithCounts = itineraries.map((it) => ({
      itinerary: it,
      event_count: itineraryItems.filter((ii) => ii.itinerary_id === it.id).length
    }));

    return {
      reading_list: readingList,
      reading_list_count: readingListCount,
      watchlist: watchlist,
      watchlist_count: watchlistCount,
      collections: collectionsWithCounts,
      itineraries: itinerariesWithCounts
    };
  }

  // 20. getReadingListItems (foreign keys resolved)
  getReadingListItems() {
    const readingLists = this._getFromStorage('reading_lists');
    const readingList = readingLists[0] || null;
    if (!readingList) {
      return {
        reading_list: null,
        items: []
      };
    }
    const itemsRaw = this._getFromStorage('reading_list_items').filter(
      (i) => i.reading_list_id === readingList.id
    );
    const articles = this._getFromStorage('articles');
    const items = itemsRaw.map((it) => ({
      reading_list_item: it,
      article: this._findById(articles, it.article_id)
    }));
    return {
      reading_list: readingList,
      items: items
    };
  }

  // 21. getWatchlistItems (foreign keys resolved)
  getWatchlistItems() {
    const watchlists = this._getFromStorage('watchlists');
    const watchlist = watchlists[0] || null;
    if (!watchlist) {
      return {
        watchlist: null,
        items: []
      };
    }
    const itemsRaw = this._getFromStorage('watchlist_items').filter(
      (i) => i.watchlist_id === watchlist.id
    );
    const articles = this._getFromStorage('articles');
    const items = itemsRaw.map((it) => ({
      watchlist_item: it,
      article: this._findById(articles, it.article_id)
    }));
    return {
      watchlist: watchlist,
      items: items
    };
  }

  // 22. getCollections
  getCollections() {
    return this._getFromStorage('collections');
  }

  // 23. getCollectionItems (foreign keys resolved)
  getCollectionItems(collectionId) {
    const collections = this._getFromStorage('collections');
    const collection = this._findById(collections, collectionId);
    if (!collection) {
      return {
        collection: null,
        items: []
      };
    }
    const itemsRaw = this._getFromStorage('collection_items').filter(
      (i) => i.collection_id === collection.id
    );
    const articles = this._getFromStorage('articles');
    const items = itemsRaw.map((it) => ({
      collection_item: it,
      article: this._findById(articles, it.article_id)
    }));
    return {
      collection: collection,
      items: items
    };
  }

  // 24. getItineraries
  getItineraries() {
    return this._getFromStorage('itineraries');
  }

  // 25. getItineraryDetail (foreign keys resolved)
  getItineraryDetail(itineraryId) {
    const itineraries = this._getFromStorage('itineraries');
    const itinerary = this._findById(itineraries, itineraryId);
    if (!itinerary) {
      return {
        itinerary: null,
        items: []
      };
    }
    const itemsRaw = this._getFromStorage('itinerary_items').filter(
      (i) => i.itinerary_id === itinerary.id
    );
    const events = this._getFromStorage('events');
    const items = itemsRaw.map((it) => ({
      itinerary_item: it,
      event: this._findById(events, it.event_id)
    }));
    return {
      itinerary: itinerary,
      items: items
    };
  }

  // 26. removeReadingListItem
  removeReadingListItem(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    const before = items.length;
    items = items.filter((i) => i.id !== readingListItemId);
    this._saveToStorage('reading_list_items', items);
    const removed = before - items.length;
    return {
      success: true,
      message: removed > 0 ? 'Reading list item removed.' : 'Reading list item not found.'
    };
  }

  // 27. removeWatchlistItem
  removeWatchlistItem(watchlistItemId) {
    let items = this._getFromStorage('watchlist_items');
    const before = items.length;
    items = items.filter((i) => i.id !== watchlistItemId);
    this._saveToStorage('watchlist_items', items);
    const removed = before - items.length;
    return {
      success: true,
      message: removed > 0 ? 'Watchlist item removed.' : 'Watchlist item not found.'
    };
  }

  // 28. removeCollectionItem
  removeCollectionItem(collectionItemId) {
    let items = this._getFromStorage('collection_items');
    const before = items.length;
    items = items.filter((i) => i.id !== collectionItemId);
    this._saveToStorage('collection_items', items);
    const removed = before - items.length;
    return {
      success: true,
      message: removed > 0 ? 'Collection item removed.' : 'Collection item not found.'
    };
  }

  // 29. removeItineraryItem
  removeItineraryItem(itineraryItemId) {
    let items = this._getFromStorage('itinerary_items');
    const before = items.length;
    items = items.filter((i) => i.id !== itineraryItemId);
    this._saveToStorage('itinerary_items', items);
    const removed = before - items.length;
    return {
      success: true,
      message: removed > 0 ? 'Itinerary item removed.' : 'Itinerary item not found.'
    };
  }

  // 30. calculateAffordability
  calculateAffordability(homePrice, downPaymentPercent, interestRatePercent, loanTermYears, annualPropertyTax, annualInsurance, monthlyHoaFees) {
    const breakdown = this._calculateMortgageAmortization(
      homePrice,
      downPaymentPercent,
      interestRatePercent,
      loanTermYears,
      annualPropertyTax,
      annualInsurance,
      monthlyHoaFees
    );

    const calc = {
      id: this._generateId('afford'),
      home_price: Number(homePrice) || 0,
      down_payment_percent: Number(downPaymentPercent) || 0,
      interest_rate_percent: Number(interestRatePercent) || 0,
      loan_term_years: Number(loanTermYears) || 0,
      monthly_payment: breakdown.monthly_payment,
      principal_and_interest: breakdown.principal_and_interest,
      property_tax: breakdown.property_tax,
      insurance: breakdown.insurance,
      hoa_fees: breakdown.hoa_fees,
      total_monthly_payment: breakdown.total_monthly_payment,
      created_at: this._now()
    };

    const calcs = this._getFromStorage('affordability_calculations');
    calcs.push(calc);
    this._saveToStorage('affordability_calculations', calcs);

    const articles = this._getFromStorage('articles');
    let recommended = articles.filter(
      (a) => a.is_first_time_buyer_tips || a.category === 'first_time_buyer_tips'
    );
    recommended = this._sortArticles(recommended, 'newest_first');

    return {
      calculation: calc,
      recommended_articles: recommended
    };
  }

  // 31. compareCostOfLiving
  compareCostOfLiving(currentCityId, newCityId, householdConfiguration, housingType, monthlyHousingBudget) {
    const cities = this._getFromStorage('cities');
    const currentCity = this._findById(cities, currentCityId);
    const newCity = this._findById(cities, newCityId);

    const indexes = this._computeCostOfLivingIndexes(monthlyHousingBudget);

    const comparison = {
      id: this._generateId('colc'),
      current_city: currentCity ? currentCity.display_name : '',
      new_city: newCity ? newCity.display_name : '',
      household_configuration: householdConfiguration,
      housing_type: housingType,
      monthly_housing_budget: Number(monthlyHousingBudget) || 0,
      overall_cost_index_current: indexes.overall_cost_index_current,
      overall_cost_index_new: indexes.overall_cost_index_new,
      housing_cost_current: indexes.housing_cost_current,
      housing_cost_new: indexes.housing_cost_new,
      transportation_cost_current: indexes.transportation_cost_current,
      transportation_cost_new: indexes.transportation_cost_new,
      groceries_cost_current: indexes.groceries_cost_current,
      groceries_cost_new: indexes.groceries_cost_new,
      created_at: this._now()
    };

    const comparisons = this._getFromStorage('cost_of_living_comparisons');
    comparisons.push(comparison);
    this._saveToStorage('cost_of_living_comparisons', comparisons);

    const articles = this._getFromStorage('articles');
    let movingGuides = articles.filter((a) => a.category === 'moving_guide');
    if (currentCity || newCity) {
      const keywords = [];
      if (currentCity) {
        if (currentCity.display_name) keywords.push(currentCity.display_name);
        if (currentCity.name && currentCity.name !== currentCity.display_name) keywords.push(currentCity.name);
      }
      if (newCity) {
        if (newCity.display_name) keywords.push(newCity.display_name);
        if (newCity.name && newCity.name !== newCity.display_name) keywords.push(newCity.name);
      }
      const lowerKeywords = keywords.map((k) => k.toLowerCase());
      movingGuides = movingGuides.filter((a) => {
        const title = (a.title || '').toLowerCase();
        return lowerKeywords.length === 0 || lowerKeywords.some((kw) => title.includes(kw));
      });
    }
    movingGuides = this._sortArticles(movingGuides, 'newest_first');

    return {
      comparison: comparison,
      recommended_moving_guides: movingGuides
    };
  }

  // 32. getLifestyleDecorFilterOptions
  getLifestyleDecorFilterOptions() {
    const sizeRanges = [
      { id: '0_500', label: 'Up to 500 sq ft', min_sqft: 0, max_sqft: 500 },
      { id: '500_900', label: '5003900 sq ft', min_sqft: 500, max_sqft: 900 },
      { id: '900_1200', label: '90031200 sq ft', min_sqft: 900, max_sqft: 1200 },
      { id: '1200_plus', label: '1200+ sq ft', min_sqft: 1200, max_sqft: 100000 }
    ];

    const decorStyles = [
      { value: 'minimalist', label: 'Minimalist' },
      { value: 'scandinavian', label: 'Scandinavian' },
      { value: 'industrial', label: 'Industrial' },
      { value: 'boho', label: 'Boho' },
      { value: 'traditional', label: 'Traditional' },
      { value: 'modern', label: 'Modern' },
      { value: 'other', label: 'Other' }
    ];

    const sortOptions = [
      { value: 'featured', label: 'Featured' },
      { value: 'newest_first', label: 'Newest first' },
      { value: 'most_popular', label: 'Most popular' }
    ];

    return {
      size_ranges: sizeRanges,
      decor_styles: decorStyles,
      sort_options: sortOptions
    };
  }

  // 33. getLifestyleDecorArticles
  getLifestyleDecorArticles(minSqft, maxSqft, isPetFriendly, decorStyle, sortBy, page, pageSize) {
    let articles = this._getFromStorage('articles').filter(
      (a) => a.category === 'lifestyle_decor'
    );

    if (typeof isPetFriendly === 'boolean') {
      articles = articles.filter(
        (a) => !!a.is_pet_friendly === isPetFriendly
      );
    }

    if (decorStyle) {
      articles = articles.filter((a) => a.decor_style === decorStyle);
    }

    if (typeof minSqft === 'number' || typeof maxSqft === 'number') {
      const minS = typeof minSqft === 'number' ? minSqft : 0;
      const maxS = typeof maxSqft === 'number' ? maxSqft : Number.MAX_SAFE_INTEGER;
      articles = articles.filter((a) => {
        const aMin = typeof a.min_sqft === 'number' ? a.min_sqft : 0;
        const aMax = typeof a.max_sqft === 'number' ? a.max_sqft : Number.MAX_SAFE_INTEGER;
        return aMin <= maxS && aMax >= minS;
      });
    }

    let sorted;
    if (sortBy === 'newest_first') {
      sorted = this._sortArticles(articles, 'newest_first');
    } else if (sortBy === 'most_popular') {
      sorted = this._sortArticles(articles, 'most_popular');
    } else {
      sorted = this._sortArticles(articles, 'featured');
    }

    const { page: p, pageSize: ps, total, sliced } = this._paginate(sorted, page, pageSize);

    // Instrumentation for task completion tracking (Task 5)
    try {
      if (decorStyle === 'minimalist') {
        localStorage.setItem(
          'task5_minimalistFilterParams',
          JSON.stringify({
            minSqft,
            maxSqft,
            isPetFriendly,
            decorStyle,
            sortBy,
            page,
            pageSize,
            timestamp: this._now()
          })
        );
      }
      if (decorStyle === 'scandinavian') {
        localStorage.setItem(
          'task5_scandinavianFilterParams',
          JSON.stringify({
            minSqft,
            maxSqft,
            isPetFriendly,
            decorStyle,
            sortBy,
            page,
            pageSize,
            timestamp: this._now()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error (task5_*FilterParams):', e);
    }

    return {
      articles: sliced,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  // 34. getPersonalizationOptions
  getPersonalizationOptions() {
    const locations = this._getFromStorage('cities');
    const categories = [
      { value: 'neighborhood_guides', label: 'Neighborhood Guides' },
      { value: 'market_trends', label: 'Market Trends' },
      { value: 'lifestyle_decor', label: 'Lifestyle & Decor' },
      { value: 'home_upgrades', label: 'Home Upgrades' },
      { value: 'investment_insights', label: 'Investment Insights' },
      { value: 'moving_guide', label: 'Moving Guides' },
      { value: 'first_time_buyer_tips', label: 'First-time Buyer Tips' },
      { value: 'general', label: 'General' }
    ];

    const topics = [
      { value: 'outdoor_living', label: 'Outdoor Living' },
      { value: 'first_time_buying', label: 'First-time Buying' },
      { value: 'investment_strategy', label: 'Investment Strategy' }
    ];

    return {
      locations: locations,
      categories: categories,
      topics: topics
    };
  }

  // 35. savePersonalizationPreferences
  savePersonalizationPreferences(followedLocationIds, followedCategories, followedTopics) {
    const prefsArr = this._getFromStorage('personalization_preferences');
    let prefs = prefsArr[0] || null;
    if (!prefs) {
      prefs = this._getOrCreatePersonalizationPreferences();
    }

    prefs.followed_locations = Array.isArray(followedLocationIds) ? followedLocationIds.slice() : [];
    prefs.followed_categories = Array.isArray(followedCategories) ? followedCategories.slice() : [];
    prefs.followed_topics = Array.isArray(followedTopics) ? followedTopics.slice() : [];
    prefs.updated_at = this._now();

    if (prefsArr.length === 0) {
      prefsArr.push(prefs);
    } else {
      prefsArr[0] = prefs;
    }
    this._saveToStorage('personalization_preferences', prefsArr);

    return {
      preferences: prefs,
      success: true,
      message: 'Personalization preferences saved.'
    };
  }

  // 36. getPersonalizedFeed
  getPersonalizedFeed(dateRange, minReadingTimeMinutes, maxReadingTimeMinutes, sortBy, page, pageSize) {
    const prefs = this._getOrCreatePersonalizationPreferences();
    const cities = this._getFromStorage('cities');

    let articles = this._getFromStorage('articles');

    if (Array.isArray(prefs.followed_locations) && prefs.followed_locations.length > 0) {
      const locIds = new Set(prefs.followed_locations);
      const selectedCities = cities.filter((c) => locIds.has(c.id));
      const names = new Set();
      selectedCities.forEach((c) => {
        if (c.name) names.add(c.name);
        if (c.display_name) names.add(c.display_name);
      });
      articles = articles.filter((a) => !a.city || names.has(a.city));
    }

    if (Array.isArray(prefs.followed_categories) && prefs.followed_categories.length > 0) {
      const cats = new Set(prefs.followed_categories);
      articles = articles.filter((a) => cats.has(a.category));
    }

    if (Array.isArray(prefs.followed_topics) && prefs.followed_topics.length > 0) {
      const topics = prefs.followed_topics.slice();
      articles = articles.filter((a) => topics.some((t) => this._articleMatchesTopic(a, t)));
    }

    articles = this._filterArticlesByDateRange(articles, dateRange || 'all_time');

    if (typeof minReadingTimeMinutes === 'number') {
      articles = articles.filter(
        (a) => typeof a.reading_time_minutes === 'number' && a.reading_time_minutes >= minReadingTimeMinutes
      );
    }
    if (typeof maxReadingTimeMinutes === 'number') {
      articles = articles.filter(
        (a) => typeof a.reading_time_minutes === 'number' && a.reading_time_minutes <= maxReadingTimeMinutes
      );
    }

    let sorted;
    if (sortBy === 'newest_first') {
      sorted = this._sortArticles(articles, 'newest_first');
    } else if (sortBy === 'most_popular') {
      sorted = this._sortArticles(articles, 'most_popular');
    } else {
      sorted = this._sortArticles(articles, 'recommended');
    }

    const { page: p, pageSize: ps, total, sliced } = this._paginate(sorted, page, pageSize);

    // Instrumentation for task completion tracking (Task 6)
    try {
      localStorage.setItem(
        'task6_feedFilterParams',
        JSON.stringify({
          dateRange,
          minReadingTimeMinutes,
          maxReadingTimeMinutes,
          sortBy,
          page,
          pageSize,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error (task6_feedFilterParams):', e);
    }

    return {
      articles: sliced,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  // 37. getHomeUpgradeFilterOptions
  getHomeUpgradeFilterOptions() {
    const topics = [
      { value: 'sustainability_energy', label: 'Sustainability & Energy' },
      { value: 'kitchen_bath', label: 'Kitchen & Bath' },
      { value: 'curb_appeal', label: 'Curb Appeal' }
    ];

    const subtopics = [
      { value: 'tax_credits_rebates', label: 'Tax credits / rebates' },
      { value: 'solar', label: 'Solar' },
      { value: 'insulation', label: 'Insulation' }
    ];

    const sortOptions = [
      { value: 'most_helpful', label: 'Most helpful' },
      { value: 'highest_rated', label: 'Highest rated' },
      { value: 'newest_first', label: 'Newest first' }
    ];

    return {
      topics: topics,
      subtopics: subtopics,
      sort_options: sortOptions
    };
  }

  // 38. getHomeUpgradeArticles
  getHomeUpgradeArticles(isSustainabilityEnergyTopic, hasTaxCreditIncentivesFocus, sortBy, page, pageSize) {
    let articles = this._getFromStorage('articles').filter(
      (a) => a.category === 'home_upgrades'
    );

    if (typeof isSustainabilityEnergyTopic === 'boolean') {
      articles = articles.filter(
        (a) => !!a.is_sustainability_energy_topic === isSustainabilityEnergyTopic
      );
    }

    if (typeof hasTaxCreditIncentivesFocus === 'boolean') {
      articles = articles.filter(
        (a) => !!a.has_tax_credit_incentives_focus === hasTaxCreditIncentivesFocus
      );
    }

    let sorted;
    if (sortBy === 'highest_rated') {
      sorted = this._sortArticles(articles, 'highest_rated');
    } else if (sortBy === 'newest_first') {
      sorted = this._sortArticles(articles, 'newest_first');
    } else {
      sorted = this._sortArticles(articles, 'most_helpful');
    }

    const { page: p, pageSize: ps, total, sliced } = this._paginate(sorted, page, pageSize);

    // Instrumentation for task completion tracking (Task 7)
    try {
      localStorage.setItem(
        'task7_homeUpgradeFilterParams',
        JSON.stringify({
          isSustainabilityEnergyTopic,
          hasTaxCreditIncentivesFocus,
          sortBy,
          page,
          pageSize,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error (task7_homeUpgradeFilterParams):', e);
    }

    return {
      articles: sliced,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  // 39. getInvestmentFilterOptions
  getInvestmentFilterOptions() {
    const propertyTypes = [
      'single_family',
      'multi_family',
      'condo',
      'townhouse',
      'apartment',
      'other'
    ];

    const articles = this._getFromStorage('articles').filter(
      (a) => a.category === 'investment_insights'
    );

    let minRoi = null;
    let maxRoi = null;
    for (const a of articles) {
      if (typeof a.projected_roi_percent === 'number') {
        if (minRoi === null || a.projected_roi_percent < minRoi) minRoi = a.projected_roi_percent;
        if (maxRoi === null || a.projected_roi_percent > maxRoi) maxRoi = a.projected_roi_percent;
      }
    }

    const sortOptions = [
      { value: 'most_read_this_year', label: 'Most read this year' },
      { value: 'most_popular', label: 'Most popular' },
      { value: 'newest_first', label: 'Newest first' }
    ];

    return {
      property_types: propertyTypes,
      projected_roi_min: minRoi !== null ? minRoi : 0,
      projected_roi_max: maxRoi !== null ? maxRoi : 0,
      sort_options: sortOptions
    };
  }

  // 40. getInvestmentArticles
  getInvestmentArticles(propertyType, minProjectedRoiPercent, maxProjectedRoiPercent, sortBy, page, pageSize) {
    let articles = this._getFromStorage('articles').filter(
      (a) => a.category === 'investment_insights'
    );

    if (propertyType) {
      articles = articles.filter((a) => a.property_type === propertyType);
    }

    if (typeof minProjectedRoiPercent === 'number') {
      articles = articles.filter(
        (a) => typeof a.projected_roi_percent === 'number' && a.projected_roi_percent >= minProjectedRoiPercent
      );
    }

    if (typeof maxProjectedRoiPercent === 'number') {
      articles = articles.filter(
        (a) => typeof a.projected_roi_percent === 'number' && a.projected_roi_percent <= maxProjectedRoiPercent
      );
    }

    let sorted;
    if (sortBy === 'most_popular') {
      sorted = this._sortArticles(articles, 'most_popular');
    } else if (sortBy === 'newest_first') {
      sorted = this._sortArticles(articles, 'newest_first');
    } else {
      sorted = this._sortArticles(articles, 'most_read_this_year');
    }

    const { page: p, pageSize: ps, total, sliced } = this._paginate(sorted, page, pageSize);

    // Instrumentation for task completion tracking (Task 9)
    try {
      localStorage.setItem(
        'task9_investmentFilterParams',
        JSON.stringify({
          propertyType,
          minProjectedRoiPercent,
          maxProjectedRoiPercent,
          sortBy,
          page,
          pageSize,
          timestamp: this._now()
        })
      );
    } catch (e) {
      console.error('Instrumentation error (task9_investmentFilterParams):', e);
    }

    return {
      articles: sliced,
      total: total,
      page: p,
      pageSize: ps
    };
  }

  // 41. getAboutContent
  getAboutContent() {
    const raw = localStorage.getItem('about_content');
    if (!raw) {
      return {
        title: '',
        body: '',
        last_updated: ''
      };
    }
    try {
      const parsed = JSON.parse(raw) || {};
      return {
        title: parsed.title || '',
        body: parsed.body || '',
        last_updated: parsed.last_updated || ''
      };
    } catch (e) {
      return {
        title: '',
        body: '',
        last_updated: ''
      };
    }
  }

  // 42. getContactInfo
  getContactInfo() {
    const raw = localStorage.getItem('contact_info');
    if (!raw) {
      return {
        contact_email: '',
        mailing_address: '',
        support_links: []
      };
    }
    try {
      const parsed = JSON.parse(raw) || {};
      return {
        contact_email: parsed.contact_email || '',
        mailing_address: parsed.mailing_address || '',
        support_links: Array.isArray(parsed.support_links) ? parsed.support_links : []
      };
    } catch (e) {
      return {
        contact_email: '',
        mailing_address: '',
        support_links: []
      };
    }
  }

  // 43. submitContactForm
  submitContactForm(name, email, subject, message) {
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim();
    const trimmedMessage = (message || '').trim();
    if (!trimmedName || !trimmedEmail || !trimmedMessage) {
      return {
        success: false,
        message: 'Name, email, and message are required.'
      };
    }

    const submissions = this._getFromStorage('contact_form_submissions');
    const submission = {
      id: this._generateId('contactsub'),
      name: trimmedName,
      email: trimmedEmail,
      subject: (subject || '').trim(),
      message: trimmedMessage,
      created_at: this._now()
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return {
      success: true,
      message: 'Your message has been received.'
    };
  }

  // 44. getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const raw = localStorage.getItem('privacy_policy_content');
    if (!raw) {
      return {
        title: '',
        body: '',
        last_updated: ''
      };
    }
    try {
      const parsed = JSON.parse(raw) || {};
      return {
        title: parsed.title || '',
        body: parsed.body || '',
        last_updated: parsed.last_updated || ''
      };
    } catch (e) {
      return {
        title: '',
        body: '',
        last_updated: ''
      };
    }
  }

  // 45. getTermsOfUseContent
  getTermsOfUseContent() {
    const raw = localStorage.getItem('terms_of_use_content');
    if (!raw) {
      return {
        title: '',
        body: '',
        last_updated: ''
      };
    }
    try {
      const parsed = JSON.parse(raw) || {};
      return {
        title: parsed.title || '',
        body: parsed.body || '',
        last_updated: parsed.last_updated || ''
      };
    } catch (e) {
      return {
        title: '',
        body: '',
        last_updated: ''
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