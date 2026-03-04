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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    // Entity tables as JSON arrays
    const arrayKeys = [
      'articles',
      'comments',
      'reading_lists',
      'reading_list_items',
      'products',
      'wishlists',
      'wishlist_items',
      'celebrities',
      'lookbooks',
      'outfits',
      'outfit_items',
      'events',
      'schedules',
      'schedule_items',
      'beauty_routines',
      'routine_products',
      'routine_collections',
      'saved_routines',
      'newsletter_subscriptions',
      'newsletter_topics',
      'style_quizzes',
      'style_quiz_questions',
      'style_quiz_answer_options',
      'style_profiles',
      'style_profile_recommended_articles',
      'contact_form_submissions'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Non-array configuration objects (may or may not exist; do not seed content)
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
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

  _toTitleCase(str) {
    if (!str) return '';
    return str
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _calculateOutfitTotalPrice(items) {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum, item) => sum + (Number(item.price_snapshot) || 0), 0);
  }

  // ---------------------- Get-or-create helpers ----------------------

  _getOrCreateReadingList() {
    const readingLists = this._getFromStorage('reading_lists', []);
    let list = readingLists.find((rl) => rl.name === 'My Reading List');
    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        name: 'My Reading List',
        created_at: new Date().toISOString()
      };
      readingLists.push(list);
      this._saveToStorage('reading_lists', readingLists);
    }
    return list;
  }

  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage('wishlists', []);
    let wl = wishlists.find((w) => w.name === 'My Wishlist');
    if (!wl) {
      wl = {
        id: this._generateId('wishlist'),
        name: 'My Wishlist',
        created_at: new Date().toISOString()
      };
      wishlists.push(wl);
      this._saveToStorage('wishlists', wishlists);
    }
    return wl;
  }

  _getOrCreateLookbook() {
    const lookbooks = this._getFromStorage('lookbooks', []);
    let lb = lookbooks.find((l) => l.name === 'My Lookbook');
    if (!lb) {
      lb = {
        id: this._generateId('lookbook'),
        name: 'My Lookbook',
        created_at: new Date().toISOString()
      };
      lookbooks.push(lb);
      this._saveToStorage('lookbooks', lookbooks);
    }
    return lb;
  }

  _getOrCreateSchedule() {
    const schedules = this._getFromStorage('schedules', []);
    let schedule = schedules.find((s) => s.name === 'My Schedule');
    if (!schedule) {
      schedule = {
        id: this._generateId('schedule'),
        name: 'My Schedule',
        created_at: new Date().toISOString()
      };
      schedules.push(schedule);
      this._saveToStorage('schedules', schedules);
    }
    return schedule;
  }

  _getOrCreateCurrentOutfitDraft() {
    const key = 'current_outfit_state';
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to re-init
      }
    }
    const draft = {
      occasion: null,
      inspirationCelebrityId: null,
      colorPalette: null,
      items: [] // OutfitItem-like objects (draft)
    };
    localStorage.setItem(key, JSON.stringify(draft));
    return draft;
  }

  _saveCurrentOutfitDraft(draft) {
    localStorage.setItem('current_outfit_state', JSON.stringify(draft));
  }

  _ensureRoutineCollectionsSeeded() {
    let collections = this._getFromStorage('routine_collections', []);
    let changed = false;
    let budget = collections.find((c) => c.name === 'Budget Skincare');
    if (!budget) {
      budget = {
        id: this._generateId('routine_collection'),
        name: 'Budget Skcare',
        description: 'Curated skincare routines under a friendly budget.',
        created_at: new Date().toISOString()
      };
      collections.push(budget);
      changed = true;
    }
    if (changed) {
      this._saveToStorage('routine_collections', collections);
    }
    return collections;
  }

  // ---------------------- Article search helper ----------------------

  _searchArticlesInIndex(query, filters, sort, page, pageSize) {
    const allArticles = this._getFromStorage('articles', []);
    const q = (query || '').trim().toLowerCase();

    let items = allArticles.filter((a) => a.status === 'published');

    if (filters) {
      if (filters.category) {
        items = items.filter((a) => a.category === filters.category);
      }
      if (Array.isArray(filters.tags) && filters.tags.length > 0) {
        items = items.filter((a) => {
          if (!Array.isArray(a.tags)) return false;
          return filters.tags.some((t) => a.tags.indexOf(t) !== -1);
        });
      }
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        items = items.filter((a) => new Date(a.published_at) >= from);
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        items = items.filter((a) => new Date(a.published_at) <= to);
      }
    }

    // Simple relevance scoring
    let scored = items.map((a) => {
      let score = 0;
      if (q) {
        const title = (a.title || '').toLowerCase();
        const subtitle = (a.subtitle || '').toLowerCase();
        const snippet = (a.snippet || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        const celebNames = Array.isArray(a.celebrity_names)
          ? a.celebrity_names.join(' ').toLowerCase()
          : '';
        if (title.includes(q)) score += 5;
        if (subtitle.includes(q)) score += 3;
        if (snippet.includes(q)) score += 2;
        if (content.includes(q)) score += 1;
        if (celebNames.includes(q)) score += 1;
      }
      return { article: a, score };
    });

    const sortKey = sort || (q ? 'most_relevant' : 'newest_first');

    scored.sort((a, b) => {
      const da = new Date(a.article.published_at).getTime();
      const db = new Date(b.article.published_at).getTime();
      if (sortKey === 'newest_first') {
        return db - da;
      }
      if (sortKey === 'most_commented') {
        return (b.article.comment_count || 0) - (a.article.comment_count || 0);
      }
      // most_relevant or default
      if (b.score !== a.score) return b.score - a.score;
      return db - da;
    });

    const totalCount = scored.length;
    const start = (page - 1) * pageSize;
    const pageItems = scored.slice(start, start + pageSize).map((s) => s.article);

    return {
      items: pageItems,
      page,
      pageSize,
      totalCount
    };
  }

  // ---------------------- Product filter helper ----------------------

  _filterAndSortProducts(products, filters, sort) {
    let items = Array.isArray(products) ? products.slice() : [];

    if (filters) {
      if (filters.category) {
        items = items.filter((p) => p.category === filters.category);
      }
      if (typeof filters.minPrice === 'number') {
        items = items.filter((p) => Number(p.price) >= filters.minPrice);
      }
      if (typeof filters.maxPrice === 'number') {
        items = items.filter((p) => Number(p.price) <= filters.maxPrice);
      }
      if (typeof filters.minRating === 'number') {
        items = items.filter((p) => (p.rating || 0) >= filters.minRating);
      }
    }

    const sortKey = sort || 'newest';

    items.sort((a, b) => {
      if (sortKey === 'price_low_to_high') {
        return Number(a.price) - Number(b.price);
      }
      if (sortKey === 'price_high_to_low') {
        return Number(b.price) - Number(a.price);
      }
      if (sortKey === 'best_selling') {
        const aScore = (a.rating || 0) * (a.rating_count || 0);
        const bScore = (b.rating || 0) * (b.rating_count || 0);
        return bScore - aScore;
      }
      // newest
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return db - da;
    });

    return items;
  }

  // ---------------------- Style quiz evaluation helper ----------------------

  _evaluateStyleQuizAnswers(quizId, answers) {
    const styleProfiles = this._getFromStorage('style_profiles', []).filter(
      (sp) => sp.quiz_id === quizId
    );
    const profile = styleProfiles[0] || null;

    let recommendedArticles = [];
    if (profile) {
      const mappings = this._getFromStorage('style_profile_recommended_articles', []).filter(
        (m) => m.style_profile_id === profile.id
      );
      const articles = this._getFromStorage('articles', []);
      mappings.sort((a, b) => (a.order || 0) - (b.order || 0));
      recommendedArticles = mappings
        .map((m) => articles.find((a) => a.id === m.article_id))
        .filter(Boolean)
        .filter((a) => a.status === 'published');

      // Fallback: if no explicit recommendations are resolvable for this profile,
      // surface a generic set of published articles so the quiz still returns
      // at least one recommendation.
      if (recommendedArticles.length === 0) {
        const publishedArticles = articles.filter((a) => a.status === 'published');
        if (publishedArticles.length > 0) {
          const streetStyle = publishedArticles.filter((a) => a.category === 'street_style');
          const source = streetStyle.length > 0 ? streetStyle : publishedArticles;
          recommendedArticles = source.slice(0, 5);
        }
      }
    }

    return { styleProfile: profile, recommendedArticles };
  }

  // ---------------------- Home page helper ----------------------

  _buildHomePageSections() {
    const articles = this._getFromStorage('articles', []).filter(
      (a) => a.status === 'published'
    );
    const byDateDesc = (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime();

    const featuredArticles = articles.slice().sort(byDateDesc).slice(0, 8);

    const trendingCelebrityNews = articles
      .filter((a) => a.category === 'celebrity_news')
      .slice()
      .sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0))
      .slice(0, 8);

    const trendingStreetStyle = articles
      .filter((a) => a.category === 'street_style')
      .slice()
      .sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0))
      .slice(0, 8);

    const featuredBeautyTutorials = articles
      .filter((a) => a.category === 'beauty')
      .filter((a) => Array.isArray(a.tags) && (a.tags.includes('tutorials') || a.tags.includes('beauty_how_to')))
      .slice()
      .sort(byDateDesc)
      .slice(0, 8);

    const shoppingEdits = articles
      .filter((a) => Array.isArray(a.tags) && a.tags.includes('shopping_edit'))
      .slice()
      .sort(byDateDesc)
      .slice(0, 8);

    const styleQuizzes = this._getFromStorage('style_quizzes', []);
    const activeQuiz = styleQuizzes.find((q) => q.status === 'active') || null;

    const heroStyleQuiz = {
      quizId: activeQuiz ? activeQuiz.id : null,
      title: activeQuiz ? activeQuiz.name : '',
      subtitle: activeQuiz ? activeQuiz.description || '' : '',
      imageUrl: activeQuiz ? activeQuiz.image_url || null : null
    };

    return {
      featuredArticles,
      trendingCelebrityNews,
      trendingStreetStyle,
      featuredBeautyTutorials,
      shoppingEdits,
      heroStyleQuiz
    };
  }

  // ---------------------- Core interface implementations ----------------------

  // getHomePageContent
  getHomePageContent() {
    return this._buildHomePageSections();
  }

  // getArticleFilterOptions
  getArticleFilterOptions() {
    const articles = this._getFromStorage('articles', []).filter(
      (a) => a.status === 'published'
    );

    const categorySet = new Set();
    const tagSet = new Set();

    articles.forEach((a) => {
      if (a.category) categorySet.add(a.category);
      if (Array.isArray(a.tags)) {
        a.tags.forEach((t) => tagSet.add(t));
      }
    });

    const categories = Array.from(categorySet).map((value) => ({
      value,
      label: this._toTitleCase(value)
    }));

    const tags = Array.from(tagSet).map((value) => ({
      value,
      label: this._toTitleCase(value)
    }));

    const sortOptions = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'most_commented', label: 'Most Commented' },
      { value: 'most_relevant', label: 'Most Relevant' }
    ];

    return { categories, tags, sortOptions };
  }

  // searchArticles(query, filters, sort, page, pageSize)
  searchArticles(query, filters, sort, page = 1, pageSize = 20) {
    return this._searchArticlesInIndex(query, filters || {}, sort, page, pageSize);
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const celebrities = this._getFromStorage('celebrities', []);
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const readingList = this._getOrCreateReadingList();

    const article = articles.find((a) => a.id === articleId) || null;

    let enrichedArticle = null;
    if (article) {
      enrichedArticle = { ...article };
      if (article.primary_celebrity_id) {
        enrichedArticle.primary_celebrity =
          celebrities.find((c) => c.id === article.primary_celebrity_id) || null;
      }
    }

    const relatedArticles = article
      ? articles
          .filter((a) => a.id !== article.id && a.status === 'published')
          .filter((a) => a.category === article.category)
          .filter((a) => {
            if (!Array.isArray(article.tags) || !Array.isArray(a.tags)) return true;
            return a.tags.some((t) => article.tags.includes(t));
          })
          .sort((a, b) => new Date(b.published_at) - new Date(a.published_at))
          .slice(0, 6)
      : [];

    const isSavedToReadingList = !!readingListItems.find(
      (item) => item.reading_list_id === readingList.id && item.article_id === articleId
    );

    return { article: enrichedArticle, relatedArticles, isSavedToReadingList };
  }

  // getArticleComments(articleId, page, pageSize)
  getArticleComments(articleId, page = 1, pageSize = 20) {
    const comments = this._getFromStorage('comments', []);
    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId) || null;

    const filtered = comments
      .filter((c) => c.article_id === articleId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize).map((c) => ({
      ...c,
      article
    }));

    return {
      comments: pageItems,
      page,
      pageSize,
      totalCount
    };
  }

  // postArticleComment(articleId, content)
  postArticleComment(articleId, content) {
    const trimmed = (content || '').trim();
    if (!trimmed) {
      return { success: false, comment: null, message: 'Comment content is required.' };
    }

    const articles = this._getFromStorage('articles', []);
    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, comment: null, message: 'Article not found.' };
    }

    const comments = this._getFromStorage('comments', []);
    const comment = {
      id: this._generateId('comment'),
      article_id: articleId,
      content: trimmed,
      author_display_name: null,
      created_at: new Date().toISOString(),
      is_flagged: false
    };
    comments.push(comment);
    this._saveToStorage('comments', comments);

    // Increment article.comment_count
    article.comment_count = (article.comment_count || 0) + 1;
    this._saveToStorage('articles', articles);

    return { success: true, comment, message: 'Comment posted.' };
  }

  // saveArticleToReadingList(articleId, source)
  saveArticleToReadingList(articleId, source = 'article_page') {
    const readingList = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);

    const existing = readingListItems.find(
      (item) => item.reading_list_id === readingList.id && item.article_id === articleId
    );
    if (existing) {
      return { success: true, readingListItem: existing, message: 'Already saved.' };
    }

    const validSources = ['article_page', 'quiz_recommendation', 'other'];
    const normalizedSource = validSources.includes(source) ? source : 'other';

    const readingListItem = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingList.id,
      article_id: articleId,
      source: normalizedSource,
      saved_at: new Date().toISOString()
    };

    readingListItems.push(readingListItem);
    this._saveToStorage('reading_list_items', readingListItems);

    return { success: true, readingListItem, message: 'Saved to reading list.' };
  }

  // getReadingListItems(filters)
  getReadingListItems(filters) {
    const readingList = this._getOrCreateReadingList();
    const readingListItems = this._getFromStorage('reading_list_items', []);
    const articles = this._getFromStorage('articles', []);

    let items = readingListItems.filter((item) => item.reading_list_id === readingList.id);

    const categoryFilter = filters && filters.category;
    const tagFilter = filters && filters.tag;

    const result = items
      .map((item) => {
        const article = articles.find((a) => a.id === item.article_id) || null;
        return { readingListItem: item, article };
      })
      .filter((pair) => {
        if (!pair.article) return false;
        if (categoryFilter && pair.article.category !== categoryFilter) return false;
        if (tagFilter) {
          if (!Array.isArray(pair.article.tags)) return false;
          if (!pair.article.tags.includes(tagFilter)) return false;
        }
        return true;
      });

    return { items: result, totalCount: result.length };
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    let items = this._getFromStorage('reading_list_items', []);
    const before = items.length;
    items = items.filter((i) => i.id !== readingListItemId);
    this._saveToStorage('reading_list_items', items);
    const removed = before !== items.length;
    return {
      success: removed,
      message: removed ? 'Removed from reading list.' : 'Reading list item not found.'
    };
  }

  // getProductFilterOptions
  getProductFilterOptions() {
    const products = this._getFromStorage('products', []);
    const categorySet = new Set();

    products.forEach((p) => {
      if (p.category) categorySet.add(p.category);
    });

    const categories = Array.from(categorySet).map((value) => ({
      value,
      label: this._toTitleCase(value)
    }));

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'newest', label: 'Newest' },
      { value: 'best_selling', label: 'Best Selling' }
    ];

    const ratingOptions = [
      { minRating: 4, label: '4 stars & up' },
      { minRating: 3, label: '3 stars & up' },
      { minRating: 2, label: '2 stars & up' }
    ];

    const priceRanges = [
      { min: 0, max: 50, label: 'Under $50' },
      { min: 50, max: 100, label: '$50 - $100' },
      { min: 100, max: 150, label: '$100 - $150' },
      { min: 150, max: 300, label: '$150 - $300' }
    ];

    return { categories, sortOptions, ratingOptions, priceRanges };
  }

  // listProducts(filters, sort, page, pageSize)
  listProducts(filters, sort, page = 1, pageSize = 24) {
    const products = this._getFromStorage('products', []);
    const filteredSorted = this._filterAndSortProducts(products, filters || {}, sort);

    const totalCount = filteredSorted.length;
    const start = (page - 1) * pageSize;
    const pageItems = filteredSorted.slice(start, start + pageSize);

    return {
      items: pageItems,
      page,
      pageSize,
      totalCount
    };
  }

  // getProductDetail(productId)
  getProductDetail(productId) {
    const products = this._getFromStorage('products', []);
    const outfits = this._getFromStorage('outfits', []);
    const outfitItems = this._getFromStorage('outfit_items', []);

    const product = products.find((p) => p.id === productId) || null;

    const relatedProducts = product
      ? products
          .filter((p) => p.id !== product.id && p.category === product.category)
          .sort((a, b) => Number(a.price) - Number(b.price))
          .slice(0, 8)
      : [];

    const relatedOutfitIds = outfitItems
      .filter((oi) => oi.product_id === productId)
      .map((oi) => oi.outfit_id);

    const relatedOutfits = outfits.filter((o) => relatedOutfitIds.includes(o.id));

    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const isInWishlist = !!wishlistItems.find(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId
    );

    return { product, relatedProducts, relatedOutfits, isInWishlist };
  }

  // addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);

    const existing = wishlistItems.find(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId
    );
    if (existing) {
      return { success: true, wishlistItem: existing, message: 'Already in wishlist.' };
    }

    const wishlistItem = {
      id: this._generateId('wishlist_item'),
      wishlist_id: wishlist.id,
      product_id: productId,
      added_at: new Date().toISOString()
    };

    wishlistItems.push(wishlistItem);
    this._saveToStorage('wishlist_items', wishlistItems);

    return { success: true, wishlistItem, message: 'Added to wishlist.' };
  }

  // getWishlistItems(filters, sort)
  getWishlistItems(filters, sort) {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items', []);
    const products = this._getFromStorage('products', []);

    let items = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id);

    let result = items.map((wi) => ({
      wishlistItem: wi,
      product: products.find((p) => p.id === wi.product_id) || null
    }));

    if (filters) {
      if (filters.category) {
        result = result.filter((entry) => entry.product && entry.product.category === filters.category);
      }
      if (filters.brandName) {
        const bn = filters.brandName.toLowerCase();
        result = result.filter(
          (entry) => entry.product && (entry.product.brand_name || '').toLowerCase() === bn
        );
      }
      if (typeof filters.maxPrice === 'number') {
        result = result.filter(
          (entry) => entry.product && Number(entry.product.price) <= filters.maxPrice
        );
      }
    }

    if (sort) {
      result.sort((a, b) => {
        if (!a.product || !b.product) return 0;
        if (sort === 'price_low_to_high') {
          return Number(a.product.price) - Number(b.product.price);
        }
        if (sort === 'price_high_to_low') {
          return Number(b.product.price) - Number(a.product.price);
        }
        if (sort === 'newest') {
          return new Date(b.wishlistItem.added_at) - new Date(a.wishlistItem.added_at);
        }
        return 0;
      });
    }

    return { items: result, totalCount: result.length };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    let items = this._getFromStorage('wishlist_items', []);
    const before = items.length;
    items = items.filter((i) => i.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', items);
    const removed = before !== items.length;
    return {
      success: removed,
      message: removed ? 'Removed from wishlist.' : 'Wishlist item not found.'
    };
  }

  // getOutfitBuilderConfig
  getOutfitBuilderConfig() {
    const occasions = [
      { value: 'daytime_brunch', label: 'Daytime Brunch' },
      { value: 'date_night', label: 'Date Night' },
      { value: 'red_carpet', label: 'Red Carpet' },
      { value: 'street_style', label: 'Street Style' },
      { value: 'workwear', label: 'Workwear' }
    ];

    const inspirationCelebrities = this._getFromStorage('celebrities', []);

    const colorPalettes = [
      { value: 'neutrals', label: 'Neutrals' },
      { value: 'brights', label: 'Brights' },
      { value: 'pastels', label: 'Pastels' },
      { value: 'darks', label: 'Darks' },
      { value: 'mixed', label: 'Mixed' }
    ];

    // Defaults reflecting the task constraints
    const defaultPriceLimits = {
      topMax: 60,
      bottomMax: 80,
      accessoryMax: 40
    };

    return { occasions, inspirationCelebrities, colorPalettes, defaultPriceLimits };
  }

  // getOutfitSuggestions(occasion, inspirationCelebrityId, colorPalette, priceLimits)
  getOutfitSuggestions(occasion, inspirationCelebrityId, colorPalette, priceLimits) {
    const products = this._getFromStorage('products', []);
    const limits = priceLimits || { topMax: Infinity, bottomMax: Infinity, accessoryMax: Infinity };

    const filtered = products.filter((p) => {
      if (!p.is_in_stock && typeof p.is_in_stock === 'boolean') return false;
      return true;
    });

    const matchPalette = (p) => {
      if (!colorPalette) return true;
      if (!p.color_palette) return false;
      return p.color_palette === colorPalette;
    };

    const tops = filtered.filter(
      (p) => p.category === 'tops' && matchPalette(p) && Number(p.price) <= (limits.topMax || Infinity)
    );

    const bottoms = filtered.filter(
      (p) =>
        p.category === 'bottoms' && matchPalette(p) && Number(p.price) <= (limits.bottomMax || Infinity)
    );

    const accessories = filtered.filter(
      (p) =>
        p.category === 'accessories' &&
        matchPalette(p) &&
        Number(p.price) <= (limits.accessoryMax || Infinity)
    );

    return { tops, bottoms, accessories };
  }

  // getCurrentOutfitState
  getCurrentOutfitState() {
    const draft = this._getOrCreateCurrentOutfitDraft();
    const totalPrice = this._calculateOutfitTotalPrice(draft.items);
    return {
      items: draft.items,
      totalPrice,
      occasion: draft.occasion,
      inspirationCelebrityId: draft.inspirationCelebrityId,
      colorPalette: draft.colorPalette
    };
  }

  // addItemToCurrentOutfit(productId, role)
  addItemToCurrentOutfit(productId, role) {
    const validRoles = ['top', 'bottom', 'accessory', 'shoes', 'outerwear', 'dress', 'bag', 'jewelry'];
    if (!validRoles.includes(role)) {
      return { success: false, outfitItems: [], totalPrice: 0, message: 'Invalid role.' };
    }

    const products = this._getFromStorage('products', []);
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, outfitItems: [], totalPrice: 0, message: 'Product not found.' };
    }

    const draft = this._getOrCreateCurrentOutfitDraft();

    const outfitItem = {
      id: this._generateId('outfit_item_draft'),
      outfit_id: 'current_draft',
      product_id: productId,
      role,
      price_snapshot: Number(product.price) || 0,
      position: draft.items.length
    };

    draft.items.push(outfitItem);
    this._saveCurrentOutfitDraft(draft);

    const totalPrice = this._calculateOutfitTotalPrice(draft.items);

    return {
      success: true,
      outfitItems: draft.items,
      totalPrice,
      message: 'Item added to current outfit.'
    };
  }

  // removeItemFromCurrentOutfit(outfitItemId)
  removeItemFromCurrentOutfit(outfitItemId) {
    const draft = this._getOrCreateCurrentOutfitDraft();
    const before = draft.items.length;
    draft.items = draft.items.filter((i) => i.id !== outfitItemId);
    this._saveCurrentOutfitDraft(draft);
    const totalPrice = this._calculateOutfitTotalPrice(draft.items);

    return {
      success: before !== draft.items.length,
      outfitItems: draft.items,
      totalPrice,
      message: before !== draft.items.length ? 'Item removed.' : 'Item not found.'
    };
  }

  // saveCurrentOutfit(title, occasion, inspirationCelebrityId, colorPalette)
  saveCurrentOutfit(title, occasion, inspirationCelebrityId, colorPalette) {
    const draft = this._getOrCreateCurrentOutfitDraft();
    if (!draft.items || draft.items.length === 0) {
      return { success: false, outfit: null, outfitItems: [], message: 'No items in outfit.' };
    }

    const lookbook = this._getOrCreateLookbook();
    const outfits = this._getFromStorage('outfits', []);
    const outfitItemsTable = this._getFromStorage('outfit_items', []);

    const totalPrice = this._calculateOutfitTotalPrice(draft.items);

    const outfit = {
      id: this._generateId('outfit'),
      lookbook_id: lookbook.id,
      title: title || 'Untitled Outfit',
      occasion: occasion || draft.occasion || 'daytime_brunch',
      inspiration_celebrity_id: inspirationCelebrityId || draft.inspirationCelebrityId || null,
      color_palette: colorPalette || draft.colorPalette || null,
      total_price: totalPrice,
      created_at: new Date().toISOString(),
      updated_at: null
    };

    outfits.push(outfit);

    const newItems = draft.items.map((draftItem, index) => {
      const item = {
        id: this._generateId('outfit_item'),
        outfit_id: outfit.id,
        product_id: draftItem.product_id,
        role: draftItem.role,
        price_snapshot: draftItem.price_snapshot,
        position: typeof draftItem.position === 'number' ? draftItem.position : index
      };
      outfitItemsTable.push(item);
      return item;
    });

    this._saveToStorage('outfits', outfits);
    this._saveToStorage('outfit_items', outfitItemsTable);

    // Optionally clear draft
    draft.items = [];
    draft.occasion = null;
    draft.inspirationCelebrityId = null;
    draft.colorPalette = null;
    this._saveCurrentOutfitDraft(draft);

    return { success: true, outfit, outfitItems: newItems, message: 'Outfit saved.' };
  }

  // listLookbookOutfits(filters)
  listLookbookOutfits(filters) {
    const lookbook = this._getOrCreateLookbook();
    const outfits = this._getFromStorage('outfits', []);
    const celebrities = this._getFromStorage('celebrities', []);

    let items = outfits.filter((o) => o.lookbook_id === lookbook.id);

    if (filters) {
      if (filters.occasion) {
        items = items.filter((o) => o.occasion === filters.occasion);
      }
      if (filters.inspirationCelebrityId) {
        items = items.filter((o) => o.inspiration_celebrity_id === filters.inspirationCelebrityId);
      }
    }

    const enrichedOutfits = items.map((o) => ({
      ...o,
      inspiration_celebrity: o.inspiration_celebrity_id
        ? celebrities.find((c) => c.id === o.inspiration_celebrity_id) || null
        : null
    }));

    return { outfits: enrichedOutfits, totalCount: enrichedOutfits.length };
  }

  // getOutfitDetail(outfitId)
  getOutfitDetail(outfitId) {
    const outfits = this._getFromStorage('outfits', []);
    const outfitItems = this._getFromStorage('outfit_items', []);
    const products = this._getFromStorage('products', []);
    const celebrities = this._getFromStorage('celebrities', []);

    const outfit = outfits.find((o) => o.id === outfitId) || null;
    if (!outfit) {
      return { outfit: null, items: [], products: [] };
    }

    const items = outfitItems
      .filter((oi) => oi.outfit_id === outfitId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    const productMap = {};
    items.forEach((oi) => {
      const p = products.find((prod) => prod.id === oi.product_id);
      if (p) {
        productMap[p.id] = p;
      }
    });

    const productsList = Object.values(productMap);

    const enrichedOutfit = {
      ...outfit,
      inspiration_celebrity: outfit.inspiration_celebrity_id
        ? celebrities.find((c) => c.id === outfit.inspiration_celebrity_id) || null
        : null
    };

    return { outfit: enrichedOutfit, items, products: productsList };
  }

  // renameOutfit(outfitId, newTitle)
  renameOutfit(outfitId, newTitle) {
    const outfits = this._getFromStorage('outfits', []);
    const outfit = outfits.find((o) => o.id === outfitId);
    if (!outfit) {
      return { success: false, outfit: null, message: 'Outfit not found.' };
    }
    outfit.title = newTitle || outfit.title;
    outfit.updated_at = new Date().toISOString();
    this._saveToStorage('outfits', outfits);
    return { success: true, outfit, message: 'Outfit renamed.' };
  }

  // deleteOutfit(outfitId)
  deleteOutfit(outfitId) {
    let outfits = this._getFromStorage('outfits', []);
    let outfitItems = this._getFromStorage('outfit_items', []);

    const before = outfits.length;
    outfits = outfits.filter((o) => o.id !== outfitId);
    outfitItems = outfitItems.filter((oi) => oi.outfit_id !== outfitId);

    this._saveToStorage('outfits', outfits);
    this._saveToStorage('outfit_items', outfitItems);

    const removed = before !== outfits.length;
    return { success: removed, message: removed ? 'Outfit deleted.' : 'Outfit not found.' };
  }

  // loadOutfitIntoBuilder(outfitId)
  loadOutfitIntoBuilder(outfitId) {
    const outfits = this._getFromStorage('outfits', []);
    const outfitItems = this._getFromStorage('outfit_items', []);

    const outfit = outfits.find((o) => o.id === outfitId) || null;
    if (!outfit) {
      return { outfit: null, items: [], totalPrice: 0 };
    }

    const items = outfitItems
      .filter((oi) => oi.outfit_id === outfitId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    // Load into draft state (copies)
    const draft = this._getOrCreateCurrentOutfitDraft();
    draft.occasion = outfit.occasion;
    draft.inspirationCelebrityId = outfit.inspiration_celebrity_id || null;
    draft.colorPalette = outfit.color_palette || null;
    draft.items = items.map((oi) => ({
      id: this._generateId('outfit_item_draft'),
      outfit_id: 'current_draft',
      product_id: oi.product_id,
      role: oi.role,
      price_snapshot: oi.price_snapshot,
      position: oi.position
    }));
    this._saveCurrentOutfitDraft(draft);

    const totalPrice = this._calculateOutfitTotalPrice(items);

    return { outfit, items, totalPrice };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    const eventTypeSet = new Set();
    const locationMap = new Map();

    events.forEach((e) => {
      if (e.event_type) eventTypeSet.add(e.event_type);
      if (e.location_city) {
        const key = e.location_city + '|' + (e.location_country || '');
        if (!locationMap.has(key)) {
          locationMap.set(key, {
            city: e.location_city,
            country: e.location_country || '',
            label: e.location_city + (e.location_country ? ', ' + e.location_country : '')
          });
        }
      }
    });

    const eventTypes = Array.from(eventTypeSet).map((value) => ({
      value,
      label: this._toTitleCase(value)
    }));

    const locations = Array.from(locationMap.values());

    const sortOptions = [
      { value: 'date_soonest_first', label: 'Date: Soonest First' },
      { value: 'date_latest_first', label: 'Date: Latest First' }
    ];

    return { eventTypes, locations, sortOptions };
  }

  // listEvents(filters, sort, page, pageSize)
  listEvents(filters, sort, page = 1, pageSize = 20) {
    const events = this._getFromStorage('events', []);
    let items = events.slice();

    if (filters) {
      if (filters.eventType) {
        items = items.filter((e) => e.event_type === filters.eventType);
      }
      if (Array.isArray(filters.locations) && filters.locations.length > 0) {
        items = items.filter((e) => filters.locations.includes(e.location_city));
      }
      if (filters.startDateFrom) {
        const from = new Date(filters.startDateFrom);
        items = items.filter((e) => new Date(e.start_datetime) >= from);
      }
    }

    const sortKey = sort || 'date_soonest_first';
    items.sort((a, b) => {
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      if (sortKey === 'date_latest_first') return db - da;
      return da - db; // soonest first
    });

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    return { items: pageItems, page, pageSize, totalCount };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const scheduleItems = this._getFromStorage('schedule_items', []);

    const event = events.find((e) => e.id === eventId) || null;
    const isInSchedule = !!scheduleItems.find((si) => si.event_id === eventId);

    return { event, isInSchedule };
  }

  // addEventToSchedule(eventId, reminderType, customReminderDatetime)
  addEventToSchedule(eventId, reminderType = 'default', customReminderDatetime) {
    const schedule = this._getOrCreateSchedule();
    const events = this._getFromStorage('events', []);
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, scheduleItem: null, message: 'Event not found.' };
    }

    const scheduleItems = this._getFromStorage('schedule_items', []);

    let reminder_datetime = null;
    const rType = reminderType || 'default';
    if (rType === 'default') {
      const offsetMinutes = event.default_reminder_offset_minutes || 60;
      const startTime = new Date(event.start_datetime).getTime();
      reminder_datetime = new Date(startTime - offsetMinutes * 60000).toISOString();
    } else if (rType === 'custom' && customReminderDatetime) {
      reminder_datetime = customReminderDatetime;
    } else {
      reminder_datetime = null;
    }

    const scheduleItem = {
      id: this._generateId('schedule_item'),
      schedule_id: schedule.id,
      event_id: eventId,
      added_at: new Date().toISOString(),
      reminder_datetime,
      reminder_type: rType
    };

    scheduleItems.push(scheduleItem);
    this._saveToStorage('schedule_items', scheduleItems);

    return { success: true, scheduleItem, message: 'Event added to schedule.' };
  }

  // getScheduleItems(view, dateFrom, dateTo)
  getScheduleItems(view = 'list', dateFrom, dateTo) {
    const schedule = this._getOrCreateSchedule();
    const scheduleItems = this._getFromStorage('schedule_items', []);
    const events = this._getFromStorage('events', []);

    let items = scheduleItems.filter((si) => si.schedule_id === schedule.id);

    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;

    const joined = items
      .map((si) => {
        const event = events.find((e) => e.id === si.event_id) || null;
        return { scheduleItem: si, event };
      })
      .filter((pair) => {
        if (!pair.event) return false;
        const start = new Date(pair.event.start_datetime);
        if (from && start < from) return false;
        if (to && start > to) return false;
        return true;
      });

    joined.sort((a, b) => {
      if (!a.event || !b.event) return 0;
      return new Date(a.event.start_datetime) - new Date(b.event.start_datetime);
    });

    return { items: joined, totalCount: joined.length };
  }

  // updateScheduleItemReminder(scheduleItemId, reminderType, customReminderDatetime)
  updateScheduleItemReminder(scheduleItemId, reminderType, customReminderDatetime) {
    const scheduleItems = this._getFromStorage('schedule_items', []);
    const events = this._getFromStorage('events', []);
    const si = scheduleItems.find((s) => s.id === scheduleItemId);
    if (!si) {
      return { success: false, scheduleItem: null, message: 'Schedule item not found.' };
    }
    const event = events.find((e) => e.id === si.event_id);
    const rType = reminderType;
    let reminder_datetime = null;

    if (rType === 'default' && event) {
      const offsetMinutes = event.default_reminder_offset_minutes || 60;
      const startTime = new Date(event.start_datetime).getTime();
      reminder_datetime = new Date(startTime - offsetMinutes * 60000).toISOString();
    } else if (rType === 'custom' && customReminderDatetime) {
      reminder_datetime = customReminderDatetime;
    } else if (rType === 'none') {
      reminder_datetime = null;
    }

    si.reminder_type = rType;
    si.reminder_datetime = reminder_datetime;
    this._saveToStorage('schedule_items', scheduleItems);

    return { success: true, scheduleItem: si, message: 'Reminder updated.' };
  }

  // removeScheduleItem(scheduleItemId)
  removeScheduleItem(scheduleItemId) {
    let items = this._getFromStorage('schedule_items', []);
    const before = items.length;
    items = items.filter((s) => s.id !== scheduleItemId);
    this._saveToStorage('schedule_items', items);
    const removed = before !== items.length;
    return { success: removed, message: removed ? 'Removed from schedule.' : 'Schedule item not found.' };
  }

  // getBeautyRoutineFilterOptions
  getBeautyRoutineFilterOptions() {
    const routineTypes = [
      { value: 'skincare', label: 'Skincare' },
      { value: 'makeup', label: 'Makeup' },
      { value: 'haircare', label: 'Haircare' },
      { value: 'bodycare', label: 'Bodycare' }
    ];

    const sortOptions = [
      { value: 'newest', label: 'Newest' },
      { value: 'recommended', label: 'Recommended' },
      { value: 'popularity', label: 'Popularity' }
    ];

    const routines = this._getFromStorage('beauty_routines', []);
    const maxBudgetDefault = routines.reduce(
      (max, r) => Math.max(max, Number(r.total_product_cost) || 0),
      100
    );

    return { routineTypes, sortOptions, maxBudgetDefault };
  }

  // listBeautyRoutines(filters, sort, page, pageSize)
  listBeautyRoutines(filters, sort, page = 1, pageSize = 20) {
    const routines = this._getFromStorage('beauty_routines', []);
    let items = routines.slice();

    if (filters) {
      if (filters.routineType) {
        items = items.filter((r) => r.routine_type === filters.routineType);
      }
      if (typeof filters.maxTotalCost === 'number') {
        items = items.filter((r) => Number(r.total_product_cost) <= filters.maxTotalCost);
      }
    }

    const sortKey = sort || 'newest';
    items.sort((a, b) => {
      if (sortKey === 'recommended') {
        const ar = a.is_recommended ? 1 : 0;
        const br = b.is_recommended ? 1 : 0;
        if (br !== ar) return br - ar;
        return new Date(b.created_at) - new Date(a.created_at);
      }
      if (sortKey === 'popularity') {
        return Number(a.total_product_cost) - Number(b.total_product_cost);
      }
      // newest
      return new Date(b.created_at) - new Date(a.created_at);
    });

    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    return { items: pageItems, page, pageSize, totalCount };
  }

  // getBeautyRoutineDetail(routineId)
  getBeautyRoutineDetail(routineId) {
    const routines = this._getFromStorage('beauty_routines', []);
    const routineProducts = this._getFromStorage('routine_products', []);
    const products = this._getFromStorage('products', []);

    const routine = routines.find((r) => r.id === routineId) || null;
    if (!routine) {
      return { routine: null, products: [], routineProducts: [] };
    }

    const rProducts = routineProducts
      .filter((rp) => rp.routine_id === routineId)
      .sort((a, b) => (a.step_number || 0) - (b.step_number || 0))
      .map((rp) => ({
        ...rp,
        product: products.find((p) => p.id === rp.product_id) || null
      }));

    const productList = rProducts
      .map((rp) => rp.product)
      .filter(Boolean);

    return { routine, products: productList, routineProducts: rProducts };
  }

  // getRoutineCollections
  getRoutineCollections() {
    const collections = this._ensureRoutineCollectionsSeeded();
    return collections;
  }

  // saveRoutineToCollection(routineId, collectionId)
  saveRoutineToCollection(routineId, collectionId) {
    this._ensureRoutineCollectionsSeeded();
    const routines = this._getFromStorage('beauty_routines', []);
    const collections = this._getFromStorage('routine_collections', []);

    const routine = routines.find((r) => r.id === routineId);
    const collection = collections.find((c) => c.id === collectionId);
    if (!routine || !collection) {
      return { success: false, savedRoutine: null, message: 'Routine or collection not found.' };
    }

    const saved = this._getFromStorage('saved_routines', []);
    const existing = saved.find(
      (sr) => sr.routine_id === routineId && sr.collection_id === collectionId
    );
    if (existing) {
      return { success: true, savedRoutine: existing, message: 'Already saved in collection.' };
    }

    const savedRoutine = {
      id: this._generateId('saved_routine'),
      routine_id: routineId,
      collection_id: collectionId,
      saved_at: new Date().toISOString()
    };

    saved.push(savedRoutine);
    this._saveToStorage('saved_routines', saved);

    return { success: true, savedRoutine, message: 'Routine saved to collection.' };
  }

  // getNewsletterSignupData
  getNewsletterSignupData() {
    const topics = this._getFromStorage('newsletter_topics', []);

    const frequencies = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const timesOfDay = [
      { value: 'morning', label: 'Morning' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' }
    ];

    const defaultFrequency = 'weekly';
    const defaultTimeOfDay = 'morning';

    return { topics, frequencies, timesOfDay, defaultFrequency, defaultTimeOfDay };
  }

  // subscribeToNewsletter(email, topicIds, frequency, timeOfDay, editorPicksOnly)
  subscribeToNewsletter(email, topicIds, frequency, timeOfDay, editorPicksOnly) {
    const trimmedEmail = (email || '').trim();
    if (!trimmedEmail) {
      return { subscription: null, success: false, message: 'Email is required.' };
    }

    const subs = this._getFromStorage('newsletter_subscriptions', []);
    const topics = this._getFromStorage('newsletter_topics', []);

    const topicIdsSet = new Set(Array.isArray(topicIds) ? topicIds : []);
    const validTopicIds = topics
      .filter((t) => topicIdsSet.has(t.id))
      .map((t) => t.id);

    let subscription = subs.find((s) => s.email === trimmedEmail);
    if (!subscription) {
      subscription = {
        id: this._generateId('newsletter_subscription'),
        email: trimmedEmail,
        topic_ids: validTopicIds,
        frequency,
        time_of_day: timeOfDay,
        editor_picks_only: !!editorPicksOnly,
        status: 'active',
        created_at: new Date().toISOString()
      };
      subs.push(subscription);
    } else {
      subscription.topic_ids = validTopicIds;
      subscription.frequency = frequency;
      subscription.time_of_day = timeOfDay;
      subscription.editor_picks_only = !!editorPicksOnly;
      subscription.status = 'active';
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    const resolvedTopics = topics.filter((t) => subscription.topic_ids.includes(t.id));
    const enrichedSubscription = {
      ...subscription,
      topics: resolvedTopics
    };

    return {
      subscription: enrichedSubscription,
      success: true,
      message: 'Subscription saved.'
    };
  }

  // getActiveStyleQuiz
  getActiveStyleQuiz() {
    const quizzes = this._getFromStorage('style_quizzes', []);
    const questionsTable = this._getFromStorage('style_quiz_questions', []);
    const answersTable = this._getFromStorage('style_quiz_answer_options', []);

    const quiz = quizzes.find((q) => q.status === 'active') || null;
    if (!quiz) {
      return { quiz: null, questions: [] };
    }

    const questions = questionsTable
      .filter((q) => q.quiz_id === quiz.id)
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((q) => {
        const answers = answersTable
          .filter((a) => a.question_id === q.id)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        return { question: q, answers };
      });

    return { quiz, questions };
  }

  // submitStyleQuizAnswers(quizId, answers)
  submitStyleQuizAnswers(quizId, answers) {
    const result = this._evaluateStyleQuizAnswers(quizId, answers || []);

    // Instrumentation for task completion tracking
    try {
      const instrumentationValue = {
        quizId: quizId,
        styleProfileId: result.styleProfile ? result.styleProfile.id : null,
        recommendedArticleIds: result.recommendedArticles.map(a => a.id),
        completedAt: new Date().toISOString()
      };
      localStorage.setItem('task8_quizResult', JSON.stringify(instrumentationValue));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      styleProfile: result.styleProfile,
      recommendedArticles: result.recommendedArticles
    };
  }

  // getStyleProfileRecommendedArticles(styleProfileId, category)
  getStyleProfileRecommendedArticles(styleProfileId, category) {
    const mappings = this._getFromStorage('style_profile_recommended_articles', []).filter(
      (m) => m.style_profile_id === styleProfileId
    );
    const articles = this._getFromStorage('articles', []);

    mappings.sort((a, b) => (a.order || 0) - (b.order || 0));

    let items = mappings
      .map((m) => articles.find((a) => a.id === m.article_id))
      .filter(Boolean)
      .filter((a) => a.status === 'published');

    if (category) {
      items = items.filter((a) => a.category === category);
    }

    return { items };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    if (!raw) {
      return {
        mission: '',
        editorialFocus: '',
        coverageAreas: [],
        teamMembers: []
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        mission: obj.mission || '',
        editorialFocus: obj.editorialFocus || '',
        coverageAreas: Array.isArray(obj.coverageAreas) ? obj.coverageAreas : [],
        teamMembers: Array.isArray(obj.teamMembers) ? obj.teamMembers : []
      };
    } catch (e) {
      return {
        mission: '',
        editorialFocus: '',
        coverageAreas: [],
        teamMembers: []
      };
    }
  }

  // getHelpPageContent
  getHelpPageContent() {
    const raw = localStorage.getItem('help_page_content');
    if (!raw) {
      return {
        faqSections: [],
        featureGuides: [],
        contactEmail: ''
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        faqSections: Array.isArray(obj.faqSections) ? obj.faqSections : [],
        featureGuides: Array.isArray(obj.featureGuides) ? obj.featureGuides : [],
        contactEmail: obj.contactEmail || ''
      };
    } catch (e) {
      return {
        faqSections: [],
        featureGuides: [],
        contactEmail: ''
      };
    }
  }

  // submitContactForm(name, email, subject, message, topic)
  submitContactForm(name, email, subject, message, topic) {
    const submissions = this._getFromStorage('contact_form_submissions', []);
    const submission = {
      id: this._generateId('contact_submission'),
      name: name || '',
      email: email || '',
      subject: subject || '',
      message: message || '',
      topic: topic || null,
      submitted_at: new Date().toISOString()
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);
    return { success: true, message: 'Form submitted.' };
  }

  // getPolicyContent(policyCode)
  getPolicyContent(policyCode) {
    const key = 'policy_' + policyCode;
    const raw = localStorage.getItem(key);
    if (!raw) {
      return {
        title: '',
        contentHtml: '',
        lastUpdated: ''
      };
    }
    try {
      const obj = JSON.parse(raw);
      return {
        title: obj.title || '',
        contentHtml: obj.contentHtml || '',
        lastUpdated: obj.lastUpdated || ''
      };
    } catch (e) {
      return {
        title: '',
        contentHtml: '',
        lastUpdated: ''
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