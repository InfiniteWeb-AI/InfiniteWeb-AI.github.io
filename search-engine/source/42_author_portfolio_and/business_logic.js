// localStorage polyfill for Node.js and environments without localStorage
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

  // ---------- Storage helpers ----------

  _initStorage() {
    const ensureKey = (key, defaultValue) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(defaultValue));
      }
    };

    // Core entity tables
    ensureKey('books', []);
    ensureKey('reviews', []);
    ensureKey('library_lists', []);
    ensureKey('library_list_items', []);
    ensureKey('compare_sets', []);
    ensureKey('compare_set_items', []);
    ensureKey('bundles', []);
    ensureKey('bundle_items', []);
    ensureKey('cart', []); // array of Cart objects
    ensureKey('cart_items', []);
    ensureKey('events', []);
    ensureKey('event_registrations', []);
    ensureKey('blog_posts', []);
    ensureKey('comments', []);
    ensureKey('contact_messages', []);

    // Content / meta tables
    ensureKey('about_page_content', {
      authorProfile: {
        fullName: '',
        bio: '',
        writingBackground: '',
        achievements: []
      },
      notableBookIds: []
    });

    ensureKey('faq_entries', []);

    ensureKey('policies_content', {
      privacyPolicyText: '',
      dataUsageSummary: '',
      termsOfUseText: '',
      reviewGuidelines: ''
    });

    // Meta: id counter and active set ids
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('activeBundleId')) {
      localStorage.setItem('activeBundleId', '');
    }
    if (!localStorage.getItem('activeCompareSetId')) {
      localStorage.setItem('activeCompareSetId', '');
    }
    if (!localStorage.getItem('activeCartId')) {
      localStorage.setItem('activeCartId', '');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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

  _parseDateSafe(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _slugToLabel(slug) {
    if (!slug) return '';
    return slug
      .split('_')
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  // ---------- Internal helpers specified in requirements ----------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let activeCartId = localStorage.getItem('activeCartId') || '';
    let cart = null;

    if (activeCartId) {
      cart = carts.find(c => c.id === activeCartId) || null;
    }

    if (!cart) {
      // Use first cart if exists
      if (carts.length > 0) {
        cart = carts[0];
        activeCartId = cart.id;
      } else {
        cart = {
          id: this._generateId('cart'),
          createdAt: this._nowISO(),
          updatedAt: this._nowISO()
        };
        carts.push(cart);
        activeCartId = cart.id;
        this._saveToStorage('cart', carts);
      }
      localStorage.setItem('activeCartId', activeCartId);
    }

    return cart;
  }

  _getOrCreateActiveBundle() {
    let bundles = this._getFromStorage('bundles', []);
    let activeBundleId = localStorage.getItem('activeBundleId') || '';
    let bundle = null;

    if (activeBundleId) {
      bundle = bundles.find(b => b.id === activeBundleId) || null;
    }

    if (!bundle) {
      bundle = {
        id: this._generateId('bundle'),
        name: '',
        description: '',
        total_price: 0,
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      bundles.push(bundle);
      this._saveToStorage('bundles', bundles);
      activeBundleId = bundle.id;
      localStorage.setItem('activeBundleId', activeBundleId);
    }

    return bundle;
  }

  _getOrCreateActiveCompareSet() {
    let compareSets = this._getFromStorage('compare_sets', []);
    let activeCompareSetId = localStorage.getItem('activeCompareSetId') || '';
    let compareSet = null;

    if (activeCompareSetId) {
      compareSet = compareSets.find(cs => cs.id === activeCompareSetId) || null;
    }

    if (!compareSet) {
      // look for any active compare set
      compareSet = compareSets.find(cs => cs.is_active) || null;
    }

    if (!compareSet) {
      compareSet = {
        id: this._generateId('comp'),
        name: 'current_compare',
        is_active: true,
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      compareSets.push(compareSet);
      this._saveToStorage('compare_sets', compareSets);
    }

    activeCompareSetId = compareSet.id;
    localStorage.setItem('activeCompareSetId', activeCompareSetId);

    return compareSet;
  }

  _getOrCreateDefaultLibraryList(list_type) {
    let lists = this._getFromStorage('library_lists', []);
    let existing = lists.find(l => l.list_type === list_type && l.is_default);
    if (existing) return existing;

    let defaultName = '';
    if (list_type === 'book_reading_list') {
      defaultName = 'Main Reading List';
    } else if (list_type === 'favorites') {
      defaultName = 'Favorites';
    } else if (list_type === 'book_wishlist') {
      defaultName = 'Wishlist';
    } else if (list_type === 'article_reading_list') {
      defaultName = 'Articles to Read';
    } else {
      defaultName = 'List';
    }

    const list = {
      id: this._generateId('list'),
      name: defaultName,
      list_type: list_type,
      description: '',
      is_default: true,
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };

    lists.push(list);
    this._saveToStorage('library_lists', lists);
    return list;
  }

  _recalculateBundleTotals(bundleId) {
    let bundles = this._getFromStorage('bundles', []);
    let bundleItems = this._getFromStorage('bundle_items', []);
    let books = this._getFromStorage('books', []);

    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) {
      return {
        item_count: 0,
        total_price: 0,
        currency: 'USD'
      };
    }

    const items = bundleItems.filter(it => it.bundleId === bundleId);
    let item_count = 0;
    let total_price = 0;
    let currency = 'USD';

    items.forEach(it => {
      const book = books.find(b => b.id === it.bookId);
      if (!book) return;
      item_count += it.quantity;
      total_price += (book.price || 0) * it.quantity;
      if (book.currency) {
        currency = book.currency;
      }
    });

    bundle.total_price = total_price;
    bundle.updatedAt = this._nowISO();

    this._saveToStorage('bundles', bundles);

    return {
      item_count: item_count,
      total_price: total_price,
      currency: currency
    };
  }

  _recalculateCartTotals() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const items = cartItems.filter(ci => ci.cartId === cart.id);

    let item_count = 0;
    let total_price = 0;
    let currency = 'USD';

    items.forEach(ci => {
      item_count += ci.quantity;
      total_price += ci.total_price || 0;
      if (ci.currency) {
        currency = ci.currency;
      }
    });

    cart.updatedAt = this._nowISO();
    let carts = this._getFromStorage('cart', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }

    return {
      item_count: item_count,
      total_price: total_price,
      currency: currency
    };
  }

  // ---------- Core interface implementations ----------

  // 1. getHomePageContent
  getHomePageContent() {
    const books = this._getFromStorage('books', []);
    const blogPosts = this._getFromStorage('blog_posts', []);
    const events = this._getFromStorage('events', []);
    const aboutContent = this._getFromStorage('about_page_content', null);

    // Author summary from about page content
    let authorSummary = {
      name: '',
      tagline: '',
      shortBio: ''
    };
    if (aboutContent && aboutContent.authorProfile) {
      authorSummary.name = aboutContent.authorProfile.fullName || '';
      authorSummary.tagline = aboutContent.authorProfile.writingBackground || '';
      authorSummary.shortBio = aboutContent.authorProfile.bio || '';
    }

    const featuredBooks = books.filter(b => !!b.is_featured);

    const publishedPosts = blogPosts.filter(p => p.status === 'published');
    publishedPosts.sort((a, b) => {
      const da = this._parseDateSafe(a.published_at) || new Date(0);
      const db = this._parseDateSafe(b.published_at) || new Date(0);
      return db - da;
    });
    const featuredBlogPosts = publishedPosts.slice(0, 3);

    const now = new Date();
    const upcomingEvents = events
      .filter(ev => {
        const start = this._parseDateSafe(ev.start_datetime);
        return !!start && start >= now;
      })
      .sort((a, b) => {
        const da = this._parseDateSafe(a.start_datetime) || new Date(0);
        const db = this._parseDateSafe(b.start_datetime) || new Date(0);
        return da - db;
      })
      .slice(0, 5);

    return {
      authorSummary,
      featuredBooks,
      featuredBlogPosts,
      upcomingEvents
    };
  }

  // 2. getBookFilterOptions
  getBookFilterOptions() {
    const books = this._getFromStorage('books', []);

    const genresEnum = [
      'all',
      'fantasy',
      'science_fiction',
      'young_adult',
      'mystery',
      'non_fiction',
      'romance',
      'thriller',
      'horror',
      'literary_fiction',
      'poetry',
      'children',
      'other'
    ];

    const formatsEnum = ['ebook', 'paperback', 'hardcover', 'audiobook'];

    const workTypesEnum = ['novel', 'short_story', 'novella', 'collection', 'novelette', 'non_fiction'];

    const genres = genresEnum.map(g => ({ value: g, label: this._slugToLabel(g) }));
    const formats = formatsEnum.map(f => ({ value: f, label: this._slugToLabel(f) }));
    const workTypes = workTypesEnum.map(w => ({ value: w, label: this._slugToLabel(w) }));

    // Rating options (used as minimums)
    const ratingOptions = [5, 4.5, 4, 3.5, 3, 2, 1];

    let minPrice = null;
    let maxPrice = null;
    let currency = 'USD';
    let minPages = null;
    let maxPages = null;
    let earliestDate = null;
    let latestDate = null;

    books.forEach(b => {
      if (typeof b.price === 'number') {
        if (minPrice === null || b.price < minPrice) minPrice = b.price;
        if (maxPrice === null || b.price > maxPrice) maxPrice = b.price;
      }
      if (typeof b.page_count === 'number') {
        if (minPages === null || b.page_count < minPages) minPages = b.page_count;
        if (maxPages === null || b.page_count > maxPages) maxPages = b.page_count;
      }
      if (b.currency) {
        currency = b.currency;
      }
      const pd = this._parseDateSafe(b.publication_date);
      if (pd) {
        if (!earliestDate || pd < earliestDate) earliestDate = pd;
        if (!latestDate || pd > latestDate) latestDate = pd;
      }
    });

    const priceRange = {
      min: minPrice !== null ? minPrice : 0,
      max: maxPrice !== null ? maxPrice : 0,
      currency
    };

    const pageCountRange = {
      min: minPages !== null ? minPages : 0,
      max: maxPages !== null ? maxPages : 0
    };

    const publicationDateRange = {
      earliest: earliestDate ? earliestDate.toISOString() : '',
      latest: latestDate ? latestDate.toISOString() : ''
    };

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'publication_date_desc', label: 'Publication Date: Newest First' },
      { value: 'publication_date_asc', label: 'Publication Date: Oldest First' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: Highest First' },
      { value: 'rating_asc', label: 'Rating: Lowest First' },
      { value: 'title_asc', label: 'Title A–Z' },
      { value: 'title_desc', label: 'Title Z–A' }
    ];

    return {
      genres,
      formats,
      workTypes,
      ratingOptions,
      priceRange,
      pageCountRange,
      publicationDateRange,
      sortOptions
    };
  }

  // 3. searchBooks
  searchBooks(query, filters, sort_by, page, page_size) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const sortBy = sort_by || 'relevance';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let books = this._getFromStorage('books', []);

    // Free-text search
    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      books = books.filter(b => {
        const haystack = [b.title, b.subtitle, b.description]
          .filter(Boolean)
          .join(' ') 
          .toLowerCase();
        const keywords = Array.isArray(b.keywords) ? b.keywords.join(' ').toLowerCase() : '';
        const combined = haystack + ' ' + keywords;
        return terms.every(t => combined.indexOf(t) !== -1);
      });
    }

    // Structured filters
    books = books.filter(b => {
      if (f.genre && f.genre !== 'all' && b.genre !== f.genre) return false;
      if (f.format && b.format !== f.format) return false;
      if (f.work_type && b.work_type !== f.work_type) return false;

      if (typeof f.price_min === 'number' && typeof b.price === 'number' && b.price < f.price_min) return false;
      if (typeof f.price_max === 'number' && typeof b.price === 'number' && b.price > f.price_max) return false;

      if (typeof f.rating_min === 'number' && typeof b.rating === 'number' && b.rating < f.rating_min) return false;
      if (typeof f.rating_max === 'number' && typeof b.rating === 'number' && b.rating > f.rating_max) return false;

      if (typeof f.pages_min === 'number' && typeof b.page_count === 'number' && b.page_count < f.pages_min) return false;
      if (typeof f.pages_max === 'number' && typeof b.page_count === 'number' && b.page_count > f.pages_max) return false;

      if (f.publication_date_from) {
        const fromDate = this._parseDateSafe(f.publication_date_from);
        const pubDate = this._parseDateSafe(b.publication_date);
        if (fromDate && pubDate && pubDate < fromDate) return false;
      }
      if (f.publication_date_to) {
        const toDate = this._parseDateSafe(f.publication_date_to);
        const pubDate = this._parseDateSafe(b.publication_date);
        if (toDate && pubDate && pubDate > toDate) return false;
      }
      return true;
    });

    // Sorting
    const sortFnMap = {
      publication_date_desc: (a, b) => {
        const da = this._parseDateSafe(a.publication_date) || new Date(0);
        const db = this._parseDateSafe(b.publication_date) || new Date(0);
        return db - da;
      },
      publication_date_asc: (a, b) => {
        const da = this._parseDateSafe(a.publication_date) || new Date(0);
        const db = this._parseDateSafe(b.publication_date) || new Date(0);
        return da - db;
      },
      price_asc: (a, b) => (a.price || 0) - (b.price || 0),
      price_desc: (a, b) => (b.price || 0) - (a.price || 0),
      rating_desc: (a, b) => (b.rating || 0) - (a.rating || 0),
      rating_asc: (a, b) => (a.rating || 0) - (b.rating || 0),
      title_asc: (a, b) => (a.title || '').localeCompare(b.title || ''),
      title_desc: (a, b) => (b.title || '').localeCompare(a.title || '')
    };

    if (sortBy && sortFnMap[sortBy]) {
      books.sort(sortFnMap[sortBy]);
    } else if (sortBy === 'relevance' && q) {
      // Simple relevance: more rating_count, newer publication
      books.sort((a, b) => {
        const scoreA = (a.rating_count || 0) + ((this._parseDateSafe(a.publication_date) || new Date(0)).getTime() / 1e12);
        const scoreB = (b.rating_count || 0) + ((this._parseDateSafe(b.publication_date) || new Date(0)).getTime() / 1e12);
        return scoreB - scoreA;
      });
    }

    const total = books.length;
    const startIdx = (pageNum - 1) * size;
    const endIdx = startIdx + size;
    const results = books.slice(startIdx, endIdx);

    return {
      results,
      total,
      page: pageNum,
      page_size: size
    };
  }

  // 4. getBookDetail
  getBookDetail(bookId) {
    const books = this._getFromStorage('books', []);
    const reviews = this._getFromStorage('reviews', []);

    const book = books.find(b => b.id === bookId) || null;
    if (!book) {
      return {
        book: null,
        reviewSummary: {
          average_rating: 0,
          rating_count: 0
        },
        relatedBooks: []
      };
    }

    const bookReviews = reviews.filter(r => r.bookId === bookId);
    let average_rating = 0;
    let rating_count = bookReviews.length;
    if (rating_count > 0) {
      const sum = bookReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      average_rating = sum / rating_count;
    } else if (typeof book.rating === 'number' && typeof book.rating_count === 'number') {
      average_rating = book.rating;
      rating_count = book.rating_count;
    }

    // Related books: same genre, exclude self, sort by rating desc
    const relatedBooks = books
      .filter(b => b.id !== book.id && b.genre === book.genre)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);

    return {
      book,
      reviewSummary: {
        average_rating,
        rating_count
      },
      relatedBooks
    };
  }

  // 5. getBookReviews
  getBookReviews(bookId, page, page_size, sort_by) {
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;
    const sortBy = sort_by || 'newest_first';

    const reviews = this._getFromStorage('reviews', []);
    const books = this._getFromStorage('books', []);

    let bookReviews = reviews.filter(r => r.bookId === bookId);

    if (sortBy === 'newest_first') {
      bookReviews.sort((a, b) => {
        const da = this._parseDateSafe(a.createdAt) || new Date(0);
        const db = this._parseDateSafe(b.createdAt) || new Date(0);
        return db - da;
      });
    } else if (sortBy === 'oldest_first') {
      bookReviews.sort((a, b) => {
        const da = this._parseDateSafe(a.createdAt) || new Date(0);
        const db = this._parseDateSafe(b.createdAt) || new Date(0);
        return da - db;
      });
    } else if (sortBy === 'highest_rating') {
      bookReviews.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'lowest_rating') {
      bookReviews.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }

    const total = bookReviews.length;
    const startIdx = (pageNum - 1) * size;
    const endIdx = startIdx + size;
    const pageReviews = bookReviews.slice(startIdx, endIdx).map(r => {
      return {
        ...r,
        book: books.find(b => b.id === r.bookId) || null
      };
    });

    return {
      reviews: pageReviews,
      total,
      page: pageNum,
      page_size: size
    };
  }

  // 6. submitBookReview
  submitBookReview(bookId, rating, title, body, reviewer_name) {
    const books = this._getFromStorage('books', []);
    const book = books.find(b => b.id === bookId);
    if (!book) {
      return {
        success: false,
        review: null,
        message: 'Book not found.'
      };
    }

    const reviews = this._getFromStorage('reviews', []);

    const review = {
      id: this._generateId('rev'),
      bookId,
      rating,
      title: title || '',
      body,
      reviewer_name: reviewer_name || '',
      createdAt: this._nowISO()
    };

    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    // Update book rating summary
    const bookReviews = reviews.filter(r => r.bookId === bookId);
    const count = bookReviews.length;
    const sum = bookReviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = count > 0 ? sum / count : 0;

    book.rating = avg;
    book.rating_count = count;
    book.updatedAt = this._nowISO();

    const idx = books.findIndex(b => b.id === bookId);
    if (idx >= 0) {
      books[idx] = book;
      this._saveToStorage('books', books);
    }

    return {
      success: true,
      review,
      message: 'Review submitted successfully.'
    };
  }

  // 7. addBookToCart
  addBookToCart(bookId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const books = this._getFromStorage('books', []);
    const book = books.find(b => b.id === bookId);
    if (!book) {
      return {
        success: false,
        cartItemId: null,
        cartSummary: {
          item_count: 0,
          total_price: 0,
          currency: 'USD'
        },
        message: 'Book not found.'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let existing = cartItems.find(
      ci => ci.cartId === cart.id && ci.item_type === 'book' && ci.bookId === bookId
    );

    const unit_price = book.price || 0;
    const currency = book.currency || 'USD';

    if (existing) {
      existing.quantity += qty;
      existing.total_price = existing.quantity * unit_price;
      existing.currency = currency;
      existing.addedAt = existing.addedAt || this._nowISO();
    } else {
      existing = {
        id: this._generateId('cartItem'),
        cartId: cart.id,
        item_type: 'book',
        bookId: bookId,
        bundleId: null,
        quantity: qty,
        unit_price: unit_price,
        total_price: unit_price * qty,
        currency: currency,
        addedAt: this._nowISO()
      };
      cartItems.push(existing);
    }

    this._saveToStorage('cart_items', cartItems);

    const cartSummary = this._recalculateCartTotals();

    return {
      success: true,
      cartItemId: existing.id,
      cartSummary,
      message: 'Book added to cart.'
    };
  }

  // 8. addBookToBundle
  addBookToBundle(bookId) {
    const books = this._getFromStorage('books', []);
    const book = books.find(b => b.id === bookId);
    if (!book) {
      return {
        success: false,
        bundleId: null,
        bundleSummary: {
          item_count: 0,
          total_price: 0,
          currency: 'USD'
        },
        message: 'Book not found.'
      };
    }

    if (book.format !== 'ebook') {
      return {
        success: false,
        bundleId: null,
        bundleSummary: {
          item_count: 0,
          total_price: 0,
          currency: book.currency || 'USD'
        },
        message: 'Only eBooks can be added to bundles.'
      };
    }

    const bundle = this._getOrCreateActiveBundle();
    let bundleItems = this._getFromStorage('bundle_items', []);

    let existing = bundleItems.find(
      it => it.bundleId === bundle.id && it.bookId === bookId
    );

    if (existing) {
      existing.quantity += 1;
    } else {
      existing = {
        id: this._generateId('bitem'),
        bundleId: bundle.id,
        bookId: bookId,
        quantity: 1
      };
      bundleItems.push(existing);
    }

    this._saveToStorage('bundle_items', bundleItems);

    const totals = this._recalculateBundleTotals(bundle.id);

    return {
      success: true,
      bundleId: bundle.id,
      bundleSummary: totals,
      message: 'Book added to bundle.'
    };
  }

  // 9. getActiveBundleDetails
  getActiveBundleDetails() {
    const bundles = this._getFromStorage('bundles', []);
    const bundleItems = this._getFromStorage('bundle_items', []);
    const books = this._getFromStorage('books', []);

    let activeBundleId = localStorage.getItem('activeBundleId') || '';
    let bundle = bundles.find(b => b.id === activeBundleId) || null;

    if (!bundle && bundles.length > 0) {
      bundle = bundles[bundles.length - 1];
      activeBundleId = bundle.id;
      localStorage.setItem('activeBundleId', activeBundleId);
    }

    if (!bundle) {
      return {
        bundle: null,
        items: [],
        total_price: 0,
        currency: 'USD'
      };
    }

    const itemsRaw = bundleItems.filter(it => it.bundleId === bundle.id);
    const items = itemsRaw.map(it => {
      const book = books.find(b => b.id === it.bookId) || null;
      const line_total = book ? (book.price || 0) * it.quantity : 0;
      return {
        bundleItemId: it.id,
        quantity: it.quantity,
        line_total,
        book
      };
    });

    const totals = this._recalculateBundleTotals(bundle.id);

    return {
      bundle,
      items,
      total_price: totals.total_price,
      currency: totals.currency
    };
  }

  // 10. updateBundleItemQuantity
  updateBundleItemQuantity(bundleItemId, quantity) {
    let bundleItems = this._getFromStorage('bundle_items', []);
    const idx = bundleItems.findIndex(it => it.id === bundleItemId);
    if (idx < 0) {
      return {
        success: false,
        bundleTotals: {
          item_count: 0,
          total_price: 0,
          currency: 'USD'
        },
        message: 'Bundle item not found.'
      };
    }

    const newQty = quantity;
    const bundleId = bundleItems[idx].bundleId;

    if (newQty <= 0) {
      bundleItems.splice(idx, 1);
    } else {
      bundleItems[idx].quantity = newQty;
    }

    this._saveToStorage('bundle_items', bundleItems);
    const totals = this._recalculateBundleTotals(bundleId);

    return {
      success: true,
      bundleTotals: totals,
      message: 'Bundle item quantity updated.'
    };
  }

  // 11. removeBundleItem
  removeBundleItem(bundleItemId) {
    let bundleItems = this._getFromStorage('bundle_items', []);
    const it = bundleItems.find(bi => bi.id === bundleItemId);
    if (!it) {
      return {
        success: false,
        bundleTotals: {
          item_count: 0,
          total_price: 0,
          currency: 'USD'
        },
        message: 'Bundle item not found.'
      };
    }
    const bundleId = it.bundleId;
    bundleItems = bundleItems.filter(bi => bi.id !== bundleItemId);
    this._saveToStorage('bundle_items', bundleItems);

    const totals = this._recalculateBundleTotals(bundleId);

    return {
      success: true,
      bundleTotals: totals,
      message: 'Bundle item removed.'
    };
  }

  // 12. addBundleToCart
  addBundleToCart(bundleId) {
    const bundles = this._getFromStorage('bundles', []);
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) {
      return {
        success: false,
        cartItemId: null,
        cartSummary: {
          item_count: 0,
          total_price: 0,
          currency: 'USD'
        },
        message: 'Bundle not found.'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let existing = cartItems.find(
      ci => ci.cartId === cart.id && ci.item_type === 'bundle' && ci.bundleId === bundleId
    );

    const unit_price = bundle.total_price || 0;
    const currency = 'USD';

    if (existing) {
      existing.quantity += 1;
      existing.total_price = existing.quantity * unit_price;
      existing.currency = currency;
    } else {
      existing = {
        id: this._generateId('cartItem'),
        cartId: cart.id,
        item_type: 'bundle',
        bookId: null,
        bundleId: bundleId,
        quantity: 1,
        unit_price: unit_price,
        total_price: unit_price,
        currency: currency,
        addedAt: this._nowISO()
      };
      cartItems.push(existing);
    }

    this._saveToStorage('cart_items', cartItems);
    const cartSummary = this._recalculateCartTotals();

    return {
      success: true,
      cartItemId: existing.id,
      cartSummary,
      message: 'Bundle added to cart.'
    };
  }

  // 13. getCartDetails
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const books = this._getFromStorage('books', []);
    const bundles = this._getFromStorage('bundles', []);

    const itemsRaw = cartItems.filter(ci => ci.cartId === cart.id);

    const items = itemsRaw.map(ci => {
      const base = {
        cartItemId: ci.id,
        item_type: ci.item_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        currency: ci.currency || 'USD',
        book: null,
        bundle: null
      };
      if (ci.item_type === 'book' && ci.bookId) {
        base.book = books.find(b => b.id === ci.bookId) || null;
      } else if (ci.item_type === 'bundle' && ci.bundleId) {
        base.bundle = bundles.find(bu => bu.id === ci.bundleId) || null;
      }
      return base;
    });

    const totals = this._recalculateCartTotals();

    return {
      items,
      totals
    };
  }

  // 14. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx < 0) {
      return {
        success: false,
        updatedItem: null,
        totals: {
          item_count: 0,
          total_price: 0,
          currency: 'USD'
        },
        message: 'Cart item not found.'
      };
    }

    const newQty = quantity;
    if (newQty <= 0) {
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      const totals = this._recalculateCartTotals();
      return {
        success: true,
        updatedItem: null,
        totals,
        message: 'Cart item removed.'
      };
    }

    const item = cartItems[idx];
    item.quantity = newQty;
    item.total_price = item.unit_price * newQty;
    this._saveToStorage('cart_items', cartItems);

    const totals = this._recalculateCartTotals();

    return {
      success: true,
      updatedItem: {
        cartItemId: item.id,
        quantity: item.quantity,
        total_price: item.total_price
      },
      totals,
      message: 'Cart item quantity updated.'
    };
  }

  // 15. removeCartItem
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const exists = cartItems.some(ci => ci.id === cartItemId);
    if (!exists) {
      return {
        success: false,
        totals: {
          item_count: 0,
          total_price: 0,
          currency: 'USD'
        },
        message: 'Cart item not found.'
      };
    }

    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);
    const totals = this._recalculateCartTotals();

    return {
      success: true,
      totals,
      message: 'Cart item removed.'
    };
  }

  // 16. startCheckoutFromCart
  startCheckoutFromCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const hasItems = cartItems.some(ci => ci.cartId === cart.id);

    if (!hasItems) {
      return {
        success: false,
        message: 'Your cart is empty.'
      };
    }

    return {
      success: true,
      message: 'Proceed to checkout to complete your purchase.'
    };
  }

  // 17. addBookToCompareSet
  addBookToCompareSet(bookId) {
    const books = this._getFromStorage('books', []);
    const book = books.find(b => b.id === bookId);
    if (!book) {
      return {
        success: false,
        compareSet: null,
        items: [],
        message: 'Book not found.'
      };
    }

    const compareSet = this._getOrCreateActiveCompareSet();
    let compareSetItems = this._getFromStorage('compare_set_items', []);

    const existing = compareSetItems.find(
      it => it.compareSetId === compareSet.id && it.bookId === bookId
    );
    if (!existing) {
      compareSetItems.push({
        id: this._generateId('citem'),
        compareSetId: compareSet.id,
        bookId: bookId,
        addedAt: this._nowISO()
      });
      this._saveToStorage('compare_set_items', compareSetItems);
    }

    const items = this._getFromStorage('compare_set_items', []).filter(
      it => it.compareSetId === compareSet.id
    );

    return {
      success: true,
      compareSet,
      items,
      message: 'Book added to compare set.'
    };
  }

  // 18. getActiveCompareSetDetails
  getActiveCompareSetDetails() {
    const compareSets = this._getFromStorage('compare_sets', []);
    const compareSetItems = this._getFromStorage('compare_set_items', []);
    const books = this._getFromStorage('books', []);

    let activeCompareSetId = localStorage.getItem('activeCompareSetId') || '';
    let compareSet = compareSets.find(cs => cs.id === activeCompareSetId) || null;

    if (!compareSet) {
      compareSet = compareSets.find(cs => cs.is_active) || null;
    }

    if (!compareSet) {
      return {
        compareSet: null,
        items: []
      };
    }

    const itemsRaw = compareSetItems.filter(it => it.compareSetId === compareSet.id);
    const items = itemsRaw.map(it => ({
      compareSetItemId: it.id,
      addedAt: it.addedAt,
      book: books.find(b => b.id === it.bookId) || null
    }));

    return {
      compareSet,
      items
    };
  }

  // 19. removeBookFromCompareSet
  removeBookFromCompareSet(compareSetItemId) {
    let compareSetItems = this._getFromStorage('compare_set_items', []);
    const exists = compareSetItems.some(it => it.id === compareSetItemId);
    if (!exists) {
      return {
        success: false,
        remainingCount: compareSetItems.length,
        message: 'Compare set item not found.'
      };
    }
    compareSetItems = compareSetItems.filter(it => it.id !== compareSetItemId);
    this._saveToStorage('compare_set_items', compareSetItems);
    const activeCompareSet = this._getOrCreateActiveCompareSet();
    const remainingCount = compareSetItems.filter(
      it => it.compareSetId === activeCompareSet.id
    ).length;

    return {
      success: true,
      remainingCount,
      message: 'Book removed from compare set.'
    };
  }

  // 20. clearCompareSet
  clearCompareSet() {
    const compareSet = this._getOrCreateActiveCompareSet();
    let compareSetItems = this._getFromStorage('compare_set_items', []);
    compareSetItems = compareSetItems.filter(it => it.compareSetId !== compareSet.id);
    this._saveToStorage('compare_set_items', compareSetItems);

    return {
      success: true,
      message: 'Compare set cleared.'
    };
  }

  // 21. getLibraryLists
  getLibraryLists(list_type) {
    const lists = this._getFromStorage('library_lists', []);
    if (list_type) {
      return lists.filter(l => l.list_type === list_type);
    }
    return lists;
  }

  // 22. createLibraryList
  createLibraryList(name, list_type, description) {
    let lists = this._getFromStorage('library_lists', []);
    const list = {
      id: this._generateId('list'),
      name,
      list_type,
      description: description || '',
      is_default: false,
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };
    lists.push(list);
    this._saveToStorage('library_lists', lists);
    return list;
  }

  // 23. addBookToLibraryList
  addBookToLibraryList(listId, bookId) {
    const lists = this._getFromStorage('library_lists', []);
    const list = lists.find(l => l.id === listId);
    if (!list) {
      return {
        success: false,
        listItem: null,
        message: 'Library list not found.'
      };
    }

    const books = this._getFromStorage('books', []);
    const book = books.find(b => b.id === bookId);
    if (!book) {
      return {
        success: false,
        listItem: null,
        message: 'Book not found.'
      };
    }

    let items = this._getFromStorage('library_list_items', []);

    // Allow duplicates unless we choose to enforce uniqueness
    const item = {
      id: this._generateId('lli'),
      listId: listId,
      item_type: 'book',
      bookId: bookId,
      articleId: null,
      addedAt: this._nowISO()
    };

    items.push(item);
    this._saveToStorage('library_list_items', items);

    return {
      success: true,
      listItem: item,
      message: 'Book added to library list.'
    };
  }

  // 24. addBookToFavorites
  addBookToFavorites(bookId) {
    const favoritesList = this._getOrCreateDefaultLibraryList('favorites');
    const result = this.addBookToLibraryList(favoritesList.id, bookId);
    return {
      success: result.success,
      favoritesList,
      listItem: result.listItem,
      message: result.message
    };
  }

  // 25. addArticleToLibraryList
  addArticleToLibraryList(listId, articleId) {
    const lists = this._getFromStorage('library_lists', []);
    const list = lists.find(l => l.id === listId);
    if (!list) {
      return {
        success: false,
        listItem: null,
        message: 'Library list not found.'
      };
    }

    const posts = this._getFromStorage('blog_posts', []);
    const article = posts.find(p => p.id === articleId);
    if (!article) {
      return {
        success: false,
        listItem: null,
        message: 'Article not found.'
      };
    }

    let items = this._getFromStorage('library_list_items', []);

    const item = {
      id: this._generateId('lli'),
      listId: listId,
      item_type: 'article',
      bookId: null,
      articleId: articleId,
      addedAt: this._nowISO()
    };

    items.push(item);
    this._saveToStorage('library_list_items', items);

    return {
      success: true,
      listItem: item,
      message: 'Article added to library list.'
    };
  }

  // 26. getLibraryOverview
  getLibraryOverview() {
    const lists = this._getFromStorage('library_lists', []);
    const items = this._getFromStorage('library_list_items', []);

    const overview = lists.map(list => {
      const item_count = items.filter(it => it.listId === list.id).length;
      return {
        id: list.id,
        name: list.name,
        list_type: list.list_type,
        description: list.description || '',
        is_default: !!list.is_default,
        item_count
      };
    });

    return { lists: overview };
  }

  // 27. getLibraryListItems
  getLibraryListItems(listId) {
    const lists = this._getFromStorage('library_lists', []);
    const items = this._getFromStorage('library_list_items', []);
    const books = this._getFromStorage('books', []);
    const posts = this._getFromStorage('blog_posts', []);

    const list = lists.find(l => l.id === listId) || null;
    if (!list) {
      return {
        list: null,
        items: []
      };
    }

    const listItemsRaw = items.filter(it => it.listId === listId);

    const enrichedItems = listItemsRaw.map(it => {
      const base = {
        libraryListItemId: it.id,
        item_type: it.item_type,
        addedAt: it.addedAt,
        book: null,
        article: null
      };
      if (it.item_type === 'book' && it.bookId) {
        base.book = books.find(b => b.id === it.bookId) || null;
      } else if (it.item_type === 'article' && it.articleId) {
        base.article = posts.find(p => p.id === it.articleId) || null;
      }
      return base;
    });

    return {
      list,
      items: enrichedItems
    };
  }

  // 28. renameLibraryList
  renameLibraryList(listId, newName) {
    let lists = this._getFromStorage('library_lists', []);
    const idx = lists.findIndex(l => l.id === listId);
    if (idx < 0) {
      return null;
    }
    lists[idx].name = newName;
    lists[idx].updatedAt = this._nowISO();
    this._saveToStorage('library_lists', lists);
    return lists[idx];
  }

  // 29. deleteLibraryList
  deleteLibraryList(listId) {
    let lists = this._getFromStorage('library_lists', []);
    const list = lists.find(l => l.id === listId);
    if (!list) {
      return {
        success: false,
        message: 'Library list not found.'
      };
    }
    if (list.is_default) {
      return {
        success: false,
        message: 'Default lists cannot be deleted.'
      };
    }

    lists = lists.filter(l => l.id !== listId);
    this._saveToStorage('library_lists', lists);

    let items = this._getFromStorage('library_list_items', []);
    items = items.filter(it => it.listId !== listId);
    this._saveToStorage('library_list_items', items);

    return {
      success: true,
      message: 'Library list deleted.'
    };
  }

  // 30. removeItemFromLibraryList
  removeItemFromLibraryList(libraryListItemId) {
    let items = this._getFromStorage('library_list_items', []);
    const exists = items.some(it => it.id === libraryListItemId);
    if (!exists) {
      return {
        success: false,
        message: 'List item not found.'
      };
    }
    items = items.filter(it => it.id !== libraryListItemId);
    this._saveToStorage('library_list_items', items);
    return {
      success: true,
      message: 'Item removed from library list.'
    };
  }

  // 31. moveLibraryListItem
  moveLibraryListItem(libraryListItemId, targetListId) {
    let items = this._getFromStorage('library_list_items', []);
    const lists = this._getFromStorage('library_lists', []);
    const targetList = lists.find(l => l.id === targetListId);
    if (!targetList) {
      return null;
    }
    const idx = items.findIndex(it => it.id === libraryListItemId);
    if (idx < 0) {
      return null;
    }
    items[idx].listId = targetListId;
    this._saveToStorage('library_list_items', items);
    return items[idx];
  }

  // 32. getEventFilterOptions
  getEventFilterOptions() {
    const events = this._getFromStorage('events', []);

    const eventTypesEnum = ['online', 'in_person', 'hybrid'];
    const eventTypes = eventTypesEnum.map(t => ({ value: t, label: this._slugToLabel(t) }));

    const months = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    for (let i = 1; i <= 12; i++) {
      months.push({ value: i, label: monthNames[i - 1] });
    }

    const yearsSet = new Set();
    events.forEach(ev => {
      const d = this._parseDateSafe(ev.start_datetime);
      if (d) yearsSet.add(d.getFullYear());
    });
    const years = Array.from(yearsSet).sort((a, b) => a - b);

    const sortOptions = [
      { value: 'start_datetime_asc', label: 'Date: Earliest First' },
      { value: 'start_datetime_desc', label: 'Date: Latest First' }
    ];

    return {
      eventTypes,
      months,
      years,
      sortOptions
    };
  }

  // 33. listEvents
  listEvents(filters, sort_by, page, page_size) {
    const f = filters || {};
    const sortBy = sort_by || 'start_datetime_asc';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let events = this._getFromStorage('events', []);

    events = events.filter(ev => {
      if (f.event_type && ev.event_type !== f.event_type) return false;

      const start = this._parseDateSafe(ev.start_datetime);

      if (f.month || f.year) {
        if (!start) return false;
        if (f.month && start.getMonth() + 1 !== f.month) return false;
        if (f.year && start.getFullYear() !== f.year) return false;
      }

      if (f.date_from) {
        const from = this._parseDateSafe(f.date_from);
        if (from && start && start < from) return false;
      }
      if (f.date_to) {
        const to = this._parseDateSafe(f.date_to);
        if (to && start && start > to) return false;
      }
      return true;
    });

    if (sortBy === 'start_datetime_desc') {
      events.sort((a, b) => {
        const da = this._parseDateSafe(a.start_datetime) || new Date(0);
        const db = this._parseDateSafe(b.start_datetime) || new Date(0);
        return db - da;
      });
    } else {
      // default asc
      events.sort((a, b) => {
        const da = this._parseDateSafe(a.start_datetime) || new Date(0);
        const db = this._parseDateSafe(b.start_datetime) || new Date(0);
        return da - db;
      });
    }

    const total = events.length;
    const startIdx = (pageNum - 1) * size;
    const endIdx = startIdx + size;
    const results = events.slice(startIdx, endIdx);

    return {
      results,
      total,
      page: pageNum,
      page_size: size
    };
  }

  // 34. getEventDetail
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    return events.find(ev => ev.id === eventId) || null;
  }

  // 35. registerForEvent
  registerForEvent(eventId, name, email, notes) {
    const events = this._getFromStorage('events', []);
    const event = events.find(ev => ev.id === eventId);
    if (!event) {
      return {
        success: false,
        registration: null,
        message: 'Event not found.'
      };
    }

    let registrations = this._getFromStorage('event_registrations', []);
    const registration = {
      id: this._generateId('ereg'),
      eventId,
      name,
      email,
      notes: notes || '',
      status: 'submitted',
      createdAt: this._nowISO()
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      registration,
      message: 'Event registration submitted.'
    };
  }

  // 36. getBlogFilterOptions
  getBlogFilterOptions() {
    const posts = this._getFromStorage('blog_posts', []);
    const tagMap = new Map();

    posts.forEach(p => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach(slug => {
          if (!tagMap.has(slug)) {
            tagMap.set(slug, this._slugToLabel(slug));
          }
        });
      }
    });

    const tags = Array.from(tagMap.entries()).map(([slug, label]) => ({ slug, label }));

    const sortOptions = [
      { value: 'published_at_desc', label: 'Newest First' },
      { value: 'published_at_asc', label: 'Oldest First' },
      { value: 'comment_count_desc', label: 'Most Commented' }
    ];

    return {
      tags,
      sortOptions
    };
  }

  // 37. listBlogPosts
  listBlogPosts(filters, sort_by, page, page_size) {
    const f = filters || {};
    const sortBy = sort_by || 'published_at_desc';
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 10;

    let posts = this._getFromStorage('blog_posts', []);

    posts = posts.filter(p => p.status === 'published');

    if (f.tag) {
      posts = posts.filter(p => Array.isArray(p.tags) && p.tags.indexOf(f.tag) !== -1);
    }

    if (sortBy === 'published_at_asc') {
      posts.sort((a, b) => {
        const da = this._parseDateSafe(a.published_at) || new Date(0);
        const db = this._parseDateSafe(b.published_at) || new Date(0);
        return da - db;
      });
    } else if (sortBy === 'comment_count_desc') {
      posts.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0));
    } else {
      // default desc
      posts.sort((a, b) => {
        const da = this._parseDateSafe(a.published_at) || new Date(0);
        const db = this._parseDateSafe(b.published_at) || new Date(0);
        return db - da;
      });
    }

    const total = posts.length;
    const startIdx = (pageNum - 1) * size;
    const endIdx = startIdx + size;
    const results = posts.slice(startIdx, endIdx);

    return {
      results,
      total,
      page: pageNum,
      page_size: size
    };
  }

  // 38. getArticleDetail
  getArticleDetail(articleId) {
    const posts = this._getFromStorage('blog_posts', []);
    return posts.find(p => p.id === articleId) || null;
  }

  // 39. listCommentsForPost
  listCommentsForPost(postId, page, page_size, sort_by) {
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const sortBy = sort_by || 'newest_first';

    const comments = this._getFromStorage('comments', []);
    const posts = this._getFromStorage('blog_posts', []);

    let filtered = comments.filter(c => c.postId === postId && c.status === 'approved');

    if (sortBy === 'oldest_first') {
      filtered.sort((a, b) => {
        const da = this._parseDateSafe(a.createdAt) || new Date(0);
        const db = this._parseDateSafe(b.createdAt) || new Date(0);
        return da - db;
      });
    } else {
      // newest_first
      filtered.sort((a, b) => {
        const da = this._parseDateSafe(a.createdAt) || new Date(0);
        const db = this._parseDateSafe(b.createdAt) || new Date(0);
        return db - da;
      });
    }

    const total = filtered.length;
    const startIdx = (pageNum - 1) * size;
    const endIdx = startIdx + size;

    const allCommentsById = new Map();
    comments.forEach(c => allCommentsById.set(c.id, c));
    const post = posts.find(p => p.id === postId) || null;

    const results = filtered.slice(startIdx, endIdx).map(c => ({
      ...c,
      post: post,
      parentComment: c.parentCommentId ? (allCommentsById.get(c.parentCommentId) || null) : null
    }));

    return {
      results,
      total,
      page: pageNum,
      page_size: size
    };
  }

  // 40. addCommentToPost
  addCommentToPost(postId, parentCommentId, author_name, body) {
    const posts = this._getFromStorage('blog_posts', []);
    const post = posts.find(p => p.id === postId);
    if (!post) {
      return {
        success: false,
        comment: null,
        message: 'Post not found.'
      };
    }

    const comments = this._getFromStorage('comments', []);

    if (parentCommentId) {
      const parentExists = comments.some(c => c.id === parentCommentId && c.postId === postId);
      if (!parentExists) {
        return {
          success: false,
          comment: null,
          message: 'Parent comment not found.'
        };
      }
    }

    const comment = {
      id: this._generateId('com'),
      postId,
      parentCommentId: parentCommentId || null,
      author_name: author_name || '',
      body,
      createdAt: this._nowISO(),
      status: 'pending'
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    // Update comment_count cache on post
    const approvedAndPending = comments.filter(c => c.postId === postId && c.status !== 'deleted' && c.status !== 'spam');
    post.comment_count = approvedAndPending.length;
    const idx = posts.findIndex(p => p.id === postId);
    if (idx >= 0) {
      posts[idx] = post;
      this._saveToStorage('blog_posts', posts);
    }

    return {
      success: true,
      comment,
      message: 'Comment submitted (pending approval).'
    };
  }

  // 41. submitContactMessage
  submitContactMessage(topic, name, email, subject, message) {
    let messages = this._getFromStorage('contact_messages', []);
    const contactMessage = {
      id: this._generateId('cm'),
      topic,
      name,
      email,
      subject,
      message,
      status: 'new',
      createdAt: this._nowISO()
    };

    messages.push(contactMessage);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      contactMessage,
      message: 'Contact message submitted.'
    };
  }

  // 42. getContactTopics
  getContactTopics() {
    const topicsEnum = [
      'bulk_orders',
      'general_question',
      'events',
      'media',
      'rights_permissions',
      'technical_issue',
      'other'
    ];

    return topicsEnum.map(value => ({
      value,
      label: this._slugToLabel(value)
    }));
  }

  // 43. getAboutPageContent
  getAboutPageContent() {
    const aboutContent = this._getFromStorage('about_page_content', null);
    const books = this._getFromStorage('books', []);

    let authorProfile = {
      fullName: '',
      bio: '',
      writingBackground: '',
      achievements: []
    };
    let notableBookIds = [];

    if (aboutContent) {
      if (aboutContent.authorProfile) {
        authorProfile = {
          fullName: aboutContent.authorProfile.fullName || '',
          bio: aboutContent.authorProfile.bio || '',
          writingBackground: aboutContent.authorProfile.writingBackground || '',
          achievements: Array.isArray(aboutContent.authorProfile.achievements)
            ? aboutContent.authorProfile.achievements
            : []
        };
      }
      if (Array.isArray(aboutContent.notableBookIds)) {
        notableBookIds = aboutContent.notableBookIds;
      }
    }

    const notableBooks = books.filter(b => notableBookIds.indexOf(b.id) !== -1);

    return {
      authorProfile,
      notableBooks
    };
  }

  // 44. getFaqEntries
  getFaqEntries() {
    return this._getFromStorage('faq_entries', []);
  }

  // 45. getPoliciesContent
  getPoliciesContent() {
    const content = this._getFromStorage('policies_content', null);
    if (!content) {
      return {
        privacyPolicyText: '',
        dataUsageSummary: '',
        termsOfUseText: '',
        reviewGuidelines: ''
      };
    }
    return {
      privacyPolicyText: content.privacyPolicyText || '',
      dataUsageSummary: content.dataUsageSummary || '',
      termsOfUseText: content.termsOfUseText || '',
      reviewGuidelines: content.reviewGuidelines || ''
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