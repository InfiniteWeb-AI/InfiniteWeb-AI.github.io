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
  }

  // ---------- Storage helpers ----------

  _initStorage() {
    // Entity tables
    const arrayKeys = [
      'books',
      'authors',
      'reviews',
      'reading_lists',
      'reading_list_items',
      'cart_items',
      'promo_codes',
      'orders',
      'order_items',
      'events',
      'event_registrations',
      'author_contact_messages',
      'articles',
      'article_bookmarks',
      'newsletter_subscriptions',
      'contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single cart for single user; store as single object (or null)
    if (localStorage.getItem('cart') === null) {
      localStorage.setItem('cart', 'null');
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return defaultValue;
    try {
      return JSON.parse(raw);
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // ---------- Label helpers ----------

  _topicLabel(topic) {
    const map = {
      climate_policy: 'Climate Policy',
      economic_policy: 'Economic Policy',
      voting_rights: 'Voting Rights',
      us_elections: 'US Elections',
      immigration: 'Immigration',
      free_speech: 'Free Speech',
      general_politics: 'General Politics',
      elections: 'Elections',
      media_bias: 'Media Bias',
      policy_analysis: 'Policy Analysis'
    };
    return map[topic] || topic || null;
  }

  _ideologyLabel(ideology) {
    const map = {
      progressive: 'Progressive',
      conservative: 'Conservative',
      centrist: 'Centrist',
      nonpartisan: 'Nonpartisan'
    };
    return map[ideology] || ideology || null;
  }

  _formatLabel(format) {
    const map = {
      paperback: 'Paperback',
      hardcover: 'Hardcover',
      ebook: 'eBook',
      audiobook: 'Audiobook'
    };
    return map[format] || format || null;
  }

  _eventFormatLabel(format) {
    const map = {
      virtual: 'Virtual',
      in_person: 'In-person',
      hybrid: 'Hybrid'
    };
    return map[format] || format || null;
  }

  _emailFormatLabel(format) {
    const map = {
      html: 'HTML',
      text: 'Plain Text'
    };
    return map[format] || format || null;
  }

  // ---------- Cart helpers ----------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [], // denormalized cart item ids
        promoCodeId: null,
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _saveCart(cart) {
    this._saveToStorage('cart', cart);
  }

  _getPromoById(promoCodeId) {
    if (!promoCodeId) return null;
    const promos = this._getFromStorage('promo_codes', []);
    return promos.find((p) => p.id === promoCodeId) || null;
  }

  _validateAndResolvePromoCode(code, subtotal) {
    const promos = this._getFromStorage('promo_codes', []);
    const normalizedCode = (code || '').trim().toLowerCase();
    const promo = promos.find((p) => (p.code || '').toLowerCase() === normalizedCode) || null;

    if (!promo || !promo.isActive) {
      return {
        isValid: false,
        promo: null,
        discountAmount: 0,
        message: 'Invalid or inactive promo code.'
      };
    }

    const now = new Date();
    if (promo.validFrom) {
      const from = this._parseDate(promo.validFrom);
      if (from && now < from) {
        return {
          isValid: false,
          promo,
          discountAmount: 0,
          message: 'Promo code is not yet valid.'
        };
      }
    }
    if (promo.validTo) {
      const to = this._parseDate(promo.validTo);
      if (to && now > to) {
        return {
          isValid: false,
          promo,
          discountAmount: 0,
          message: 'Promo code has expired.'
        };
      }
    }

    if (promo.minimumOrderTotal != null && subtotal < promo.minimumOrderTotal) {
      return {
        isValid: false,
        promo,
        discountAmount: 0,
        message: 'Order total does not meet the minimum for this promo code.'
      };
    }

    let discountAmount = 0;
    if (promo.discountType === 'percentage') {
      discountAmount = (subtotal * promo.discountValue) / 100;
    } else if (promo.discountType === 'fixed_amount') {
      discountAmount = promo.discountValue;
    }
    if (discountAmount > subtotal) discountAmount = subtotal;
    discountAmount = Math.round(discountAmount * 100) / 100;

    return {
      isValid: true,
      promo,
      discountAmount,
      message: 'Promo code applied.'
    };
  }

  _recalculateCartTotals(cart) {
    const allItems = this._getFromStorage('cart_items', []);
    const itemsForCart = allItems.filter((ci) => ci.cartId === cart.id);

    let subtotal = 0;
    itemsForCart.forEach((item) => {
      subtotal += item.lineTotal || 0;
    });

    let discountTotal = 0;
    let total = subtotal;

    let promo = null;
    if (cart.promoCodeId) {
      promo = this._getPromoById(cart.promoCodeId);
      if (promo) {
        const res = this._validateAndResolvePromoCode(promo.code, subtotal);
        if (res.isValid) {
          discountTotal = res.discountAmount;
          total = subtotal - discountTotal;
        } else {
          // promo invalid now; clear it
          cart.promoCodeId = null;
          discountTotal = 0;
          total = subtotal;
        }
      } else {
        cart.promoCodeId = null;
      }
    }

    if (!promo) {
      discountTotal = 0;
      total = subtotal;
    }

    cart.items = itemsForCart.map((i) => i.id);
    cart.subtotal = Math.round(subtotal * 100) / 100;
    cart.discountTotal = Math.round(discountTotal * 100) / 100;
    cart.total = Math.round(total * 100) / 100;
    cart.updatedAt = this._nowISO();

    this._saveCart(cart);
    return cart;
  }

  _buildCartResponse(cart) {
    if (!cart) {
      return {
        cartId: null,
        items: [],
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        appliedPromoCode: null,
        promoDescription: null
      };
    }
    const allItems = this._getFromStorage('cart_items', []);
    const books = this._getFromStorage('books', []);

    const itemsForCart = allItems.filter((ci) => ci.cartId === cart.id);

    const items = itemsForCart.map((ci) => {
      const book = books.find((b) => b.id === ci.bookId) || null;
      return {
        cartItemId: ci.id,
        bookId: ci.bookId,
        title: ci.bookTitle,
        format: ci.bookFormat,
        formatLabel: this._formatLabel(ci.bookFormat),
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        currency: book ? book.currency : 'usd',
        lineTotal: ci.lineTotal,
        coverImageUrl: book ? book.coverImageUrl || null : null,
        topicLabel: book ? this._topicLabel(book.topic) : null,
        book: book
      };
    });

    const promo = this._getPromoById(cart.promoCodeId);

    return {
      cartId: cart.id,
      items,
      subtotal: cart.subtotal || 0,
      discountTotal: cart.discountTotal || 0,
      total: cart.total || 0,
      appliedPromoCode: promo ? promo.code : null,
      promoDescription: promo ? promo.description || null : null
    };
  }

  // ---------- Reading list helpers ----------

  _getDefaultReadingList() {
    const lists = this._getFromStorage('reading_lists', []);
    let def = lists.find((l) => l.isDefault) || null;
    if (!def) {
      def = {
        id: this._generateId('reading_list'),
        name: 'Reading List',
        description: '',
        isDefault: true,
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      lists.push(def);
      this._saveToStorage('reading_lists', lists);
    }
    return def;
  }

  // ---------- Book search helper ----------

  _applyBookSearchFilters(books, query, filters) {
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = books.filter((b) => b.status === 'active');

    if (q) {
      const terms = q.split(/\s+/).filter(Boolean);
      results = results.filter((b) => {
        const hay = [b.title, b.subtitle, b.description]
          .filter(Boolean)
          .join(' ') // join string fields
          .toLowerCase();
        // Match if any search term appears in the combined text
        return terms.some((term) => hay.indexOf(term) !== -1);
      });
    }

    if (f.topic) {
      results = results.filter((b) => b.topic === f.topic);
    }
    if (f.ideology) {
      results = results.filter((b) => b.ideology === f.ideology);
    }
    if (f.format) {
      results = results.filter((b) => b.format === f.format);
    }
    if (typeof f.minPrice === 'number') {
      results = results.filter((b) => typeof b.price === 'number' && b.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter((b) => typeof b.price === 'number' && b.price <= f.maxPrice);
    }
    if (typeof f.minRating === 'number') {
      results = results.filter((b) => typeof b.averageRating === 'number' && b.averageRating >= f.minRating);
    }
    if (f.publicationDateFrom) {
      const from = this._parseDate(f.publicationDateFrom);
      if (from) {
        results = results.filter((b) => {
          const d = this._parseDate(b.publicationDate);
          return d && d >= from;
        });
      }
    }
    if (f.publicationDateTo) {
      const to = this._parseDate(f.publicationDateTo);
      if (to) {
        results = results.filter((b) => {
          const d = this._parseDate(b.publicationDate);
          return d && d <= to;
        });
      }
    }
    if (f.isBestseller === true) {
      results = results.filter((b) => !!b.isBestseller);
    }

    return results;
  }

  // ---------- Event helper ----------

  _filterAndSortEvents(events, filters) {
    const f = filters || {};
    let res = events.filter((e) => e.status === 'scheduled');

    if (f.eventFormat) {
      res = res.filter((e) => e.eventFormat === f.eventFormat);
    }

    if (f.startDateFrom) {
      const from = this._parseDate(f.startDateFrom);
      if (from) {
        res = res.filter((e) => {
          const d = this._parseDate(e.startDateTime);
          return d && d >= from;
        });
      }
    }

    if (f.startDateTo) {
      const to = this._parseDate(f.startDateTo);
      if (to) {
        res = res.filter((e) => {
          const d = this._parseDate(e.startDateTime);
          return d && d <= to;
        });
      }
    }

    res.sort((a, b) => {
      const da = this._parseDate(a.startDateTime) || new Date(0);
      const db = this._parseDate(b.startDateTime) || new Date(0);
      return da - db;
    });

    return res;
  }

  // ---------- Core interface implementations ----------

  // getHomePageContent
  getHomePageContent() {
    const books = this._getFromStorage('books', []);
    const authors = this._getFromStorage('authors', []);
    const articles = this._getFromStorage('articles', []);
    const events = this._getFromStorage('events', []);
    const promoCodes = this._getFromStorage('promo_codes', []);

    const authorById = {};
    authors.forEach((a) => {
      authorById[a.id] = a;
    });

    const activeBooks = books.filter((b) => b.status === 'active');

    // Featured books: highest rated active books
    const featuredBooks = activeBooks
      .slice()
      .sort((a, b) => {
        const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
        const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const cb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        return cb - ca;
      })
      .slice(0, 10)
      .map((b) => {
        const author = authorById[b.authorId] || null;
        return {
          bookId: b.id,
          title: b.title,
          subtitle: b.subtitle || null,
          authorName: author ? author.name : null,
          topic: b.topic,
          topicLabel: this._topicLabel(b.topic),
          ideology: b.ideology,
          ideologyLabel: this._ideologyLabel(b.ideology),
          format: b.format,
          formatLabel: this._formatLabel(b.format),
          price: b.price,
          currency: b.currency,
          averageRating: b.averageRating || null,
          ratingCount: b.ratingCount || 0,
          coverImageUrl: b.coverImageUrl || null,
          book: b,
          author: author
        };
      });

    // Bestselling books
    const bestsellingBooks = activeBooks
      .filter((b) => !!b.isBestseller)
      .slice()
      .sort((a, b) => {
        const ra = typeof a.bestsellerRank === 'number' ? a.bestsellerRank : Number.MAX_SAFE_INTEGER;
        const rb = typeof b.bestsellerRank === 'number' ? b.bestsellerRank : Number.MAX_SAFE_INTEGER;
        return ra - rb;
      })
      .slice(0, 10)
      .map((b) => {
        const author = authorById[b.authorId] || null;
        return {
          bookId: b.id,
          title: b.title,
          subtitle: b.subtitle || null,
          authorName: author ? author.name : null,
          topic: b.topic,
          topicLabel: this._topicLabel(b.topic),
          format: b.format,
          formatLabel: this._formatLabel(b.format),
          price: b.price,
          currency: b.currency,
          averageRating: b.averageRating || null,
          ratingCount: b.ratingCount || 0,
          bestsellerRank: b.bestsellerRank || null,
          coverImageUrl: b.coverImageUrl || null,
          book: b,
          author: author
        };
      });

    // Featured articles: isFeatured or most recent
    const sortedArticles = articles
      .slice()
      .sort((a, b) => {
        const fa = a.isFeatured ? 1 : 0;
        const fb = b.isFeatured ? 1 : 0;
        if (fb !== fa) return fb - fa;
        const da = this._parseDate(a.publicationDate) || new Date(0);
        const db = this._parseDate(b.publicationDate) || new Date(0);
        return db - da;
      });

    const featuredArticles = sortedArticles.slice(0, 10).map((art) => ({
      articleId: art.id,
      title: art.title,
      summary: art.summary || null,
      primaryTopic: art.primaryTopic,
      primaryTopicLabel: this._topicLabel(art.primaryTopic),
      publicationDate: art.publicationDate,
      authorName: art.authorName || null,
      article: art
    }));

    // Upcoming events: scheduled in the future
    const now = new Date();
    const upcoming = events
      .filter((e) => e.status === 'scheduled')
      .filter((e) => {
        const d = this._parseDate(e.startDateTime);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return da - db;
      })
      .slice(0, 10);

    const upcomingEvents = upcoming.map((ev) => {
      const book = books.find((b) => b.id === ev.relatedBookId) || null;
      const author = authors.find((a) => a.id === ev.hostAuthorId) || null;
      return {
        eventId: ev.id,
        title: ev.title,
        startDateTime: ev.startDateTime,
        eventFormat: ev.eventFormat,
        eventFormatLabel: this._eventFormatLabel(ev.eventFormat),
        relatedBookTitle: book ? book.title : null,
        hostAuthorName: author ? author.name : null,
        event: ev,
        relatedBook: book,
        hostAuthor: author
      };
    });

    const activePromotions = promoCodes
      .filter((p) => p.isActive)
      .filter((p) => {
        const now2 = new Date();
        if (p.validFrom) {
          const from = this._parseDate(p.validFrom);
          if (from && now2 < from) return false;
        }
               if (p.validTo) {
          const to = this._parseDate(p.validTo);
          if (to && now2 > to) return false;
        }
        return true;
      })
      .map((p) => ({
        promoCode: p.code,
        description: p.description || null,
        discountType: p.discountType,
        discountValue: p.discountValue
      }));

    return {
      featuredBooks,
      bestsellingBooks,
      featuredArticles,
      upcomingEvents,
      activePromotions
    };
  }

  // getBookFilterOptions
  getBookFilterOptions() {
    const books = this._getFromStorage('books', []);
    const prices = books.map((b) => b.price).filter((p) => typeof p === 'number');
    const min = prices.length ? Math.min.apply(null, prices) : 0;
    const max = prices.length ? Math.max.apply(null, prices) : 0;

    const topics = [
      { value: 'climate_policy', label: this._topicLabel('climate_policy') },
      { value: 'economic_policy', label: this._topicLabel('economic_policy') },
      { value: 'voting_rights', label: this._topicLabel('voting_rights') },
      { value: 'us_elections', label: this._topicLabel('us_elections') },
      { value: 'immigration', label: this._topicLabel('immigration') },
      { value: 'free_speech', label: this._topicLabel('free_speech') },
      { value: 'general_politics', label: this._topicLabel('general_politics') }
    ];

    const ideologies = [
      { value: 'progressive', label: this._ideologyLabel('progressive') },
      { value: 'conservative', label: this._ideologyLabel('conservative') },
      { value: 'centrist', label: this._ideologyLabel('centrist') },
      { value: 'nonpartisan', label: this._ideologyLabel('nonpartisan') }
    ];

    const formats = [
      { value: 'paperback', label: this._formatLabel('paperback') },
      { value: 'hardcover', label: this._formatLabel('hardcover') },
      { value: 'ebook', label: this._formatLabel('ebook') },
      { value: 'audiobook', label: this._formatLabel('audiobook') }
    ];

    const ratingThresholds = [3.0, 4.0, 4.5];

    const now = new Date();
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const publicationDatePresets = [
      {
        value: 'last_30_days',
        label: 'Last 30 days',
        fromDate: last30.toISOString(),
        toDate: now.toISOString()
      },
      {
        value: 'year_2021_and_later',
        label: '2021 and later',
        fromDate: '2021-01-01T00:00:00.000Z',
        toDate: null
      }
    ];

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'publication_date_desc', label: 'Publication Date: Newest' },
      { value: 'bestseller_rank_asc', label: 'Bestseller Rank' }
    ];

    return {
      topics,
      ideologies,
      formats,
      ratingThresholds,
      priceRange: {
        min,
        max,
        currency: 'usd'
      },
      publicationDatePresets,
      sortOptions
    };
  }

  // searchBooks(query, filters, sort, page, pageSize)
  searchBooks(query, filters, sort, page, pageSize) {
    const allBooks = this._getFromStorage('books', []);
       const authors = this._getFromStorage('authors', []);
    const authorById = {};
    authors.forEach((a) => {
      authorById[a.id] = a;
    });

    const filtered = this._applyBookSearchFilters(allBooks, query, filters);

    const sortKey = sort || 'relevance';
    let results = filtered.slice();

    if (sortKey === 'rating_desc') {
      results.sort((a, b) => {
        const ra = typeof a.averageRating === 'number' ? a.averageRating : 0;
        const rb = typeof b.averageRating === 'number' ? b.averageRating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const cb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        return cb - ca;
      });
    } else if (sortKey === 'price_asc') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortKey === 'price_desc') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortKey === 'publication_date_desc') {
      results.sort((a, b) => {
        const da = this._parseDate(a.publicationDate) || new Date(0);
        const db = this._parseDate(b.publicationDate) || new Date(0);
        return db - da;
      });
    } else if (sortKey === 'bestseller_rank_asc') {
      results.sort((a, b) => {
        const ra = typeof a.bestsellerRank === 'number' ? a.bestsellerRank : Number.MAX_SAFE_INTEGER;
        const rb = typeof b.bestsellerRank === 'number' ? b.bestsellerRank : Number.MAX_SAFE_INTEGER;
        return ra - rb;
      });
    }

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const total = results.length;
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    const mapped = paged.map((b) => {
      const author = authorById[b.authorId] || null;
      return {
        bookId: b.id,
        title: b.title,
        subtitle: b.subtitle || null,
        authorName: author ? author.name : null,
        topic: b.topic,
        topicLabel: this._topicLabel(b.topic),
        ideology: b.ideology,
        ideologyLabel: this._ideologyLabel(b.ideology),
        format: b.format,
        formatLabel: this._formatLabel(b.format),
        price: b.price,
        currency: b.currency,
        averageRating: b.averageRating || null,
        ratingCount: b.ratingCount || 0,
        publicationDate: b.publicationDate,
        pageCount: b.pageCount || null,
        isBestseller: !!b.isBestseller,
        bestsellerRank: b.bestsellerRank || null,
        coverImageUrl: b.coverImageUrl || null,
        book: b,
        author: author
      };
    });

    return {
      total,
      page: p,
      pageSize: ps,
      results: mapped
    };
  }

  // getBestsellerBooks(filters)
  getBestsellerBooks(filters) {
    const f = filters || {};
    const books = this._getFromStorage('books', []);
    const authors = this._getFromStorage('authors', []);

    const authorById = {};
    authors.forEach((a) => {
      authorById[a.id] = a;
    });

    let res = books.filter((b) => b.status === 'active' && !!b.isBestseller);

    if (f.topic) {
      res = res.filter((b) => b.topic === f.topic);
    }
    if (f.format) {
      res = res.filter((b) => b.format === f.format);
    }
    if (typeof f.maxPrice === 'number') {
      res = res.filter((b) => typeof b.price === 'number' && b.price <= f.maxPrice);
    }

    res.sort((a, b) => {
      const ra = typeof a.bestsellerRank === 'number' ? a.bestsellerRank : Number.MAX_SAFE_INTEGER;
      const rb = typeof b.bestsellerRank === 'number' ? b.bestsellerRank : Number.MAX_SAFE_INTEGER;
      return ra - rb;
    });

    return res.map((b) => {
      const author = authorById[b.authorId] || null;
      return {
        bookId: b.id,
        title: b.title,
        subtitle: b.subtitle || null,
        authorName: author ? author.name : null,
        topic: b.topic,
        topicLabel: this._topicLabel(b.topic),
        format: b.format,
        formatLabel: this._formatLabel(b.format),
        price: b.price,
        currency: b.currency,
        averageRating: b.averageRating || null,
        ratingCount: b.ratingCount || 0,
        bestsellerRank: b.bestsellerRank || null,
        coverImageUrl: b.coverImageUrl || null,
        book: b,
        author: author
      };
    });
  }

  // getBookDetail(bookId)
  getBookDetail(bookId) {
    const books = this._getFromStorage('books', []);
    const authors = this._getFromStorage('authors', []);
    const reviews = this._getFromStorage('reviews', []);

    const book = books.find((b) => b.id === bookId) || null;
    if (!book) {
      return {
        book: null,
        author: null,
        reviewSummary: { averageRating: 0, ratingCount: 0 },
        recentReviews: []
      };
    }

    const author = authors.find((a) => a.id === book.authorId) || null;

    const publishedReviews = reviews.filter((r) => r.bookId === book.id && r.status === 'published');
    let avg = book.averageRating;
    let count = book.ratingCount;
    if (publishedReviews.length && (avg == null || count == null)) {
      let sum = 0;
      publishedReviews.forEach((r) => {
        sum += r.rating || 0;
      });
      avg = sum / publishedReviews.length;
      count = publishedReviews.length;
    }

    const recentReviews = publishedReviews
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      })
      .slice(0, 10)
      .map((r) => ({
        reviewId: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
        isVerifiedPurchase: !!r.isVerifiedPurchase,
        book: book
      }));

    return {
      book: {
        id: book.id,
        title: book.title,
        subtitle: book.subtitle || null,
        description: book.description || null,
        topic: book.topic,
        topicLabel: this._topicLabel(book.topic),
        ideology: book.ideology,
        ideologyLabel: this._ideologyLabel(book.ideology),
        format: book.format,
        formatLabel: this._formatLabel(book.format),
        price: book.price,
        currency: book.currency,
        publicationDate: book.publicationDate,
        pageCount: book.pageCount || null,
        averageRating: avg || null,
        ratingCount: count || 0,
        isBestseller: !!book.isBestseller,
        bestsellerRank: book.bestsellerRank || null,
        coverImageUrl: book.coverImageUrl || null,
        isbn10: book.isbn10 || null,
        isbn13: book.isbn13 || null,
        language: book.language || null,
        status: book.status
      },
      author: author
        ? {
            authorId: author.id,
            name: author.name,
            ideology: author.ideology || null,
            ideologyLabel: this._ideologyLabel(author.ideology),
            photoUrl: author.photoUrl || null,
            bioSnippet: author.bio || null,
            author: author
          }
        : null,
      reviewSummary: {
        averageRating: avg || 0,
        ratingCount: count || 0
      },
      recentReviews
    };
  }

  // getBookReviews(bookId, page, pageSize)
  getBookReviews(bookId, page, pageSize) {
    const reviews = this._getFromStorage('reviews', []);
    const books = this._getFromStorage('books', []);
    const book = books.find((b) => b.id === bookId) || null;

    const filtered = reviews.filter((r) => r.bookId === bookId && r.status === 'published');
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const total = filtered.length;
    const start = (p - 1) * ps;

    const paged = filtered
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      })
      .slice(start, start + ps)
      .map((r) => ({
        reviewId: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt,
        isVerifiedPurchase: !!r.isVerifiedPurchase,
        book: book
      }));

    return {
      total,
      page: p,
      pageSize: ps,
      reviews: paged
    };
  }

  // submitBookReview(bookId, rating, title, body)
  submitBookReview(bookId, rating, title, body) {
    const books = this._getFromStorage('books', []);
    const book = books.find((b) => b.id === bookId) || null;
    if (!book) {
      return {
        success: false,
        reviewId: null,
        status: 'rejected',
        message: 'Book not found.'
      };
    }

    const r = Number(rating);
    if (!r || r < 1 || r > 5) {
      return {
        success: false,
        reviewId: null,
        status: 'rejected',
        message: 'Rating must be between 1 and 5.'
      };
    }

    const reviews = this._getFromStorage('reviews', []);
    const id = this._generateId('review');
    const review = {
      id,
      bookId,
      rating: r,
      title,
      body,
      createdAt: this._nowISO(),
      status: 'pending',
      isVerifiedPurchase: false
    };

    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    return {
      success: true,
      reviewId: id,
      status: 'pending',
      message: 'Review submitted and pending moderation.'
    };
  }

  // addBookToCart(bookId, quantity)
  addBookToCart(bookId, quantity = 1) {
    const books = this._getFromStorage('books', []);
    const book = books.find((b) => b.id === bookId && b.status === 'active') || null;
    if (!book) {
      return {
        success: false,
        cart: this._buildCartResponse(this._getFromStorage('cart', null)),
        message: 'Book not found or not available.'
      };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    let item = cartItems.find((ci) => ci.cartId === cart.id && ci.bookId === bookId) || null;
    if (item) {
      item.quantity += qty;
      item.lineTotal = Math.round(item.unitPrice * item.quantity * 100) / 100;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        bookId: book.id,
        quantity: qty,
        unitPrice: book.price,
        lineTotal: Math.round(book.price * qty * 100) / 100,
        addedAt: this._nowISO(),
        bookTitle: book.title,
        bookFormat: book.format
      };
      cartItems.push(item);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: this._buildCartResponse(updatedCart),
      message: 'Book added to cart.'
    };
  }

  // getCart()
  getCart() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        cartId: null,
        items: [],
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        appliedPromoCode: null,
        promoDescription: null
      };
    }
    const updatedCart = this._recalculateCartTotals(cart);
    const resp = this._buildCartResponse(updatedCart);
    return {
      cartId: resp.cartId,
      items: resp.items,
      subtotal: resp.subtotal,
      discountTotal: resp.discountTotal,
      total: resp.total,
      appliedPromoCode: resp.appliedPromoCode,
      promoDescription: resp.promoDescription
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cart: this._buildCartResponse(null),
        message: 'Cart not found.'
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);
    if (idx === -1) {
      return {
        success: false,
        cart: this._buildCartResponse(cart),
        message: 'Cart item not found.'
      };
    }

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      const item = cartItems[idx];
      item.quantity = quantity;
      item.lineTotal = Math.round(item.unitPrice * item.quantity * 100) / 100;
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: this._buildCartResponse(updatedCart),
      message: 'Cart updated.'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cart: this._buildCartResponse(null),
        message: 'Cart not found.'
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);
    if (idx === -1) {
      return {
        success: false,
        cart: this._buildCartResponse(cart),
        message: 'Cart item not found.'
      };
    }

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: this._buildCartResponse(updatedCart),
      message: 'Item removed from cart.'
    };
  }

  // applyPromoCodeToCart(code)
  applyPromoCodeToCart(code) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        cart: this._buildCartResponse(null),
        message: 'Cart not found.'
      };
    }

    const allItems = this._getFromStorage('cart_items', []);
    const itemsForCart = allItems.filter((ci) => ci.cartId === cart.id);
    let subtotal = 0;
    itemsForCart.forEach((i) => {
      subtotal += i.lineTotal || 0;
    });

    const res = this._validateAndResolvePromoCode(code, subtotal);

    if (!res.isValid || !res.promo) {
      cart.promoCodeId = null;
      const updatedCart = this._recalculateCartTotals(cart);
      return {
        success: false,
        cart: this._buildCartResponse(updatedCart),
        message: res.message
      };
    }

    cart.promoCodeId = res.promo.id;
    const updatedCart = this._recalculateCartTotals(cart);

    return {
      success: true,
      cart: this._buildCartResponse(updatedCart),
      message: res.message
    };
  }

  // getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        items: [],
        subtotal: 0,
        discountTotal: 0,
        total: 0,
        appliedPromoCode: null
      };
    }
    const updatedCart = this._recalculateCartTotals(cart);
    const resp = this._buildCartResponse(updatedCart);
    return {
      items: resp.items,
      subtotal: resp.subtotal,
      discountTotal: resp.discountTotal,
      total: resp.total,
      appliedPromoCode: resp.appliedPromoCode
    };
  }

  // placeOrder(purchaserName, purchaserEmail, paymentMethod, shippingAddress)
  placeOrder(purchaserName, purchaserEmail, paymentMethod, shippingAddress) {
    const cart = this._getFromStorage('cart', null);
    if (!cart) {
      return {
        success: false,
        orderId: null,
        status: 'pending',
        total: 0,
        currency: 'usd',
        message: 'Cart not found.'
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    if (!itemsForCart.length) {
      return {
        success: false,
        orderId: null,
        status: 'pending',
        total: 0,
        currency: 'usd',
        message: 'Cart is empty.'
      };
    }

    const updatedCart = this._recalculateCartTotals(cart);

    const orders = this._getFromStorage('orders', []);
    const orderItems = this._getFromStorage('order_items', []);

    const orderId = this._generateId('order');
    const orderItemIds = [];

    itemsForCart.forEach((ci) => {
      const oiId = this._generateId('order_item');
      const oi = {
        id: oiId,
        orderId,
        bookId: ci.bookId,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        lineTotal: ci.lineTotal,
        bookTitle: ci.bookTitle,
        bookFormat: ci.bookFormat
      };
      orderItems.push(oi);
      orderItemIds.push(oiId);
    });

    const order = {
      id: orderId,
      items: orderItemIds,
      promoCodeId: updatedCart.promoCodeId || null,
      subtotal: updatedCart.subtotal || 0,
      discountTotal: updatedCart.discountTotal || 0,
      total: updatedCart.total || 0,
      purchaserName,
      purchaserEmail,
      status: 'paid',
      createdAt: this._nowISO(),
      shippingAddress: shippingAddress || null
    };

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItems);

    // Clear cart items and reset cart
    const remainingCartItems = cartItems.filter((ci) => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);

    const newCart = {
      id: this._generateId('cart'),
      items: [],
      promoCodeId: null,
      subtotal: 0,
      discountTotal: 0,
      total: 0,
      createdAt: this._nowISO(),
      updatedAt: this._nowISO()
    };
    this._saveCart(newCart);

    return {
      success: true,
      orderId: orderId,
      status: order.status,
      total: order.total,
      currency: 'usd',
      message: 'Order placed successfully.'
    };
  }

  // getReadingList()
  getReadingList() {
    const list = this._getDefaultReadingList();
    const items = this._getFromStorage('reading_list_items', []);
    const books = this._getFromStorage('books', []);
    const authors = this._getFromStorage('authors', []);

    const authorById = {};
    authors.forEach((a) => {
      authorById[a.id] = a;
    });

    const listItems = items
      .filter((i) => i.readingListId === list.id)
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.addedAt) || new Date(0);
        const db = this._parseDate(b.addedAt) || new Date(0);
        return db - da;
      })
      .map((i) => {
        const book = books.find((b) => b.id === i.bookId) || null;
        const author = book ? authorById[book.authorId] || null : null;
        return {
          readingListItemId: i.id,
          addedAt: i.addedAt,
          notes: i.notes || null,
          bookId: i.bookId,
          title: book ? book.title : null,
          subtitle: book ? book.subtitle || null : null,
          authorName: author ? author.name : null,
          topicLabel: book ? this._topicLabel(book.topic) : null,
          ideologyLabel: book ? this._ideologyLabel(book.ideology) : null,
          formatLabel: book ? this._formatLabel(book.format) : null,
          price: book ? book.price : null,
          currency: book ? book.currency : null,
          averageRating: book ? book.averageRating || null : null,
          ratingCount: book ? book.ratingCount || 0 : 0,
          coverImageUrl: book ? book.coverImageUrl || null : null,
          book,
          author
        };
      });

    return {
      readingListId: list.id,
      name: list.name,
      description: list.description || null,
      isDefault: !!list.isDefault,
      items: listItems
    };
  }

  // saveBookToReadingList(bookId, notes)
  saveBookToReadingList(bookId, notes) {
    const books = this._getFromStorage('books', []);
    const book = books.find((b) => b.id === bookId) || null;
    if (!book) {
      return {
        success: false,
        readingListItemId: null,
        readingListId: null,
        message: 'Book not found.'
      };
    }

    const list = this._getDefaultReadingList();
    const items = this._getFromStorage('reading_list_items', []);

    let existing = items.find((i) => i.readingListId === list.id && i.bookId === bookId) || null;
    if (existing) {
      if (typeof notes === 'string') existing.notes = notes;
      this._saveToStorage('reading_list_items', items);
      return {
        success: true,
        readingListItemId: existing.id,
        readingListId: list.id,
        message: 'Book already in reading list; notes updated.'
      };
    }

    const id = this._generateId('reading_list_item');
    const item = {
      id,
      readingListId: list.id,
      bookId,
      addedAt: this._nowISO(),
      notes: notes || ''
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      readingListItemId: id,
      readingListId: list.id,
      message: 'Book saved to reading list.'
    };
  }

  // removeFromReadingList(readingListItemId)
  removeFromReadingList(readingListItemId) {
    const items = this._getFromStorage('reading_list_items', []);
    const idx = items.findIndex((i) => i.id === readingListItemId);
    if (idx === -1) {
      return {
        success: false,
        readingListId: null,
        message: 'Reading list item not found.'
      };
    }

    const listId = items[idx].readingListId;
    items.splice(idx, 1);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      readingListId: listId,
      message: 'Item removed from reading list.'
    };
  }

  // getEventsFilterOptions()
  getEventsFilterOptions() {
    const now = new Date();
    const next7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const next60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    return {
      eventFormats: [
        { value: 'virtual', label: this._eventFormatLabel('virtual') },
        { value: 'in_person', label: this._eventFormatLabel('in_person') },
        { value: 'hybrid', label: this._eventFormatLabel('hybrid') }
      ],
      dateRangePresets: [
        {
          value: 'next_7_days',
          label: 'Next 7 days',
          fromDate: now.toISOString(),
          toDate: next7.toISOString()
        },
        {
          value: 'next_60_days',
          label: 'Next 60 days',
          fromDate: now.toISOString(),
          toDate: next60.toISOString()
        }
      ]
    };
  }

  // listEvents(filters, page, pageSize)
  listEvents(filters, page, pageSize) {
    const events = this._getFromStorage('events', []);
    const books = this._getFromStorage('books', []);
    const authors = this._getFromStorage('authors', []);

    const filtered = this._filterAndSortEvents(events, filters || {});

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const total = filtered.length;
    const start = (p - 1) * ps;
    const paged = filtered.slice(start, start + ps);

    const mapped = paged.map((ev) => {
      const book = books.find((b) => b.id === ev.relatedBookId) || null;
      const author = authors.find((a) => a.id === ev.hostAuthorId) || null;
      return {
        eventId: ev.id,
        title: ev.title,
        descriptionSnippet: ev.description ? String(ev.description).slice(0, 200) : null,
        eventFormat: ev.eventFormat,
        eventFormatLabel: this._eventFormatLabel(ev.eventFormat),
        startDateTime: ev.startDateTime,
        timezone: ev.timezone || null,
        relatedBookTitle: book ? book.title : null,
        hostAuthorName: author ? author.name : null,
        isRegistrationOpen: !!ev.isRegistrationOpen,
        event: ev,
        relatedBook: book,
        hostAuthor: author
      };
    });

    return {
      total,
      page: p,
      pageSize: ps,
      events: mapped
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const books = this._getFromStorage('books', []);
    const authors = this._getFromStorage('authors', []);

    const ev = events.find((e) => e.id === eventId) || null;
    if (!ev) {
      return {
        event: null,
        relatedBook: null,
        hostAuthor: null
      };
    }

    const book = books.find((b) => b.id === ev.relatedBookId) || null;
    const author = authors.find((a) => a.id === ev.hostAuthorId) || null;

    return {
      event: {
        id: ev.id,
        title: ev.title,
        description: ev.description || null,
        eventFormat: ev.eventFormat,
        eventFormatLabel: this._eventFormatLabel(ev.eventFormat),
        startDateTime: ev.startDateTime,
        endDateTime: ev.endDateTime || null,
        timezone: ev.timezone || null,
        locationUrl: ev.locationUrl || null,
        locationAddress: ev.locationAddress || null,
        capacity: ev.capacity || null,
        isRegistrationOpen: !!ev.isRegistrationOpen,
        status: ev.status
      },
      relatedBook: book
        ? {
            bookId: book.id,
            title: book.title,
            book: book
          }
        : null,
      hostAuthor: author
        ? {
            authorId: author.id,
            name: author.name,
            photoUrl: author.photoUrl || null,
            bioSnippet: author.bio || null,
            author: author
          }
        : null
    };
  }

  // registerForEvent(eventId, attendeeName, attendeeEmail, notes)
  registerForEvent(eventId, attendeeName, attendeeEmail, notes) {
    const events = this._getFromStorage('events', []);
    const ev = events.find((e) => e.id === eventId) || null;

    if (!ev) {
      return {
        success: false,
        eventRegistrationId: null,
        eventId: eventId,
        status: 'cancelled',
        message: 'Event not found.'
      };
    }
    if (!ev.isRegistrationOpen || ev.status !== 'scheduled') {
      return {
        success: false,
        eventRegistrationId: null,
        eventId: eventId,
        status: 'cancelled',
        message: 'Registration is closed for this event.'
      };
    }

    const regs = this._getFromStorage('event_registrations', []);
    const id = this._generateId('event_reg');
    const reg = {
      id,
      eventId,
      attendeeName,
      attendeeEmail,
      notes: notes || '',
      createdAt: this._nowISO(),
      status: 'registered'
    };
    regs.push(reg);
    this._saveToStorage('event_registrations', regs);

    return {
      success: true,
      eventRegistrationId: id,
      eventId: eventId,
      status: 'registered',
      message: 'Successfully registered for event.'
    };
  }

  // getAuthorDetail(authorId)
  getAuthorDetail(authorId) {
    const authors = this._getFromStorage('authors', []);
    const books = this._getFromStorage('books', []);

    const author = authors.find((a) => a.id === authorId) || null;
    if (!author) {
      return {
        author: null,
        books: []
      };
    }

    const authoredBooks = books.filter((b) => b.authorId === authorId);

    const mappedBooks = authoredBooks.map((b) => ({
      bookId: b.id,
      title: b.title,
      subtitle: b.subtitle || null,
      topicLabel: this._topicLabel(b.topic),
      ideologyLabel: this._ideologyLabel(b.ideology),
      formatLabel: this._formatLabel(b.format),
      price: b.price,
      currency: b.currency,
      averageRating: b.averageRating || null,
      ratingCount: b.ratingCount || 0,
      coverImageUrl: b.coverImageUrl || null,
      book: b
    }));

    return {
      author: {
        id: author.id,
        name: author.name,
        bio: author.bio || null,
        photoUrl: author.photoUrl || null,
        websiteUrl: author.websiteUrl || null,
        ideology: author.ideology || null,
        ideologyLabel: this._ideologyLabel(author.ideology)
      },
      books: mappedBooks
    };
  }

  // sendAuthorContactMessage(authorId, bookId, senderName, senderEmail, subject, messageBody)
  sendAuthorContactMessage(authorId, bookId, senderName, senderEmail, subject, messageBody) {
    const authors = this._getFromStorage('authors', []);
    const books = this._getFromStorage('books', []);

    const author = authors.find((a) => a.id === authorId) || null;
    if (!author) {
      return {
        success: false,
        authorContactMessageId: null,
        status: 'failed',
        message: 'Author not found.'
      };
    }

    if (bookId) {
      const book = books.find((b) => b.id === bookId) || null;
      if (!book) {
        // still allow sending but without book reference
        bookId = null;
      }
    }

    const messages = this._getFromStorage('author_contact_messages', []);
    const id = this._generateId('author_msg');
    const msg = {
      id,
      authorId,
      bookId: bookId || null,
      senderName,
      senderEmail,
      subject,
      messageBody,
      createdAt: this._nowISO(),
      status: 'sent'
    };
    messages.push(msg);
    this._saveToStorage('author_contact_messages', messages);

    return {
      success: true,
      authorContactMessageId: id,
      status: 'sent',
      message: 'Message sent to author.'
    };
  }

  // getArticlesFilterOptions()
  getArticlesFilterOptions() {
    const now = new Date();
    const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const topics = [
      { value: 'free_speech', label: this._topicLabel('free_speech') },
      { value: 'elections', label: this._topicLabel('elections') },
      { value: 'media_bias', label: this._topicLabel('media_bias') },
      { value: 'policy_analysis', label: this._topicLabel('policy_analysis') },
      { value: 'climate_policy', label: this._topicLabel('climate_policy') },
      { value: 'economic_policy', label: this._topicLabel('economic_policy') },
      { value: 'voting_rights', label: this._topicLabel('voting_rights') },
      { value: 'immigration', label: this._topicLabel('immigration') },
      { value: 'general_politics', label: this._topicLabel('general_politics') }
    ];

    const dateRangePresets = [
      {
        value: 'last_7_days',
        label: 'Last 7 days',
        fromDate: last7.toISOString(),
        toDate: now.toISOString()
      },
      {
        value: 'last_30_days',
        label: 'Last 30 days',
        fromDate: last30.toISOString(),
        toDate: now.toISOString()
      }
    ];

    return {
      topics,
      dateRangePresets
    };
  }

  // searchArticles(query, filters, page, pageSize)
  searchArticles(query, filters, page, pageSize) {
    const articles = this._getFromStorage('articles', []);
    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let res = articles.slice();

    if (q) {
      res = res.filter((a) => {
        const hay = [a.title, a.summary, a.body]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }

    if (f.primaryTopic) {
      res = res.filter((a) => a.primaryTopic === f.primaryTopic);
    }

    if (f.publicationDateFrom) {
      const from = this._parseDate(f.publicationDateFrom);
      if (from) {
        res = res.filter((a) => {
          const d = this._parseDate(a.publicationDate);
          return d && d >= from;
        });
      }
    }

    if (f.publicationDateTo) {
      const to = this._parseDate(f.publicationDateTo);
      if (to) {
        res = res.filter((a) => {
          const d = this._parseDate(a.publicationDate);
          return d && d <= to;
        });
      }
    }

    res.sort((a, b) => {
      const da = this._parseDate(a.publicationDate) || new Date(0);
      const db = this._parseDate(b.publicationDate) || new Date(0);
      return db - da;
    });

    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const total = res.length;
    const start = (p - 1) * ps;
    const paged = res.slice(start, start + ps);

    const mapped = paged.map((a) => ({
      articleId: a.id,
      title: a.title,
      summary: a.summary || null,
      primaryTopic: a.primaryTopic,
      primaryTopicLabel: this._topicLabel(a.primaryTopic),
      publicationDate: a.publicationDate,
      authorName: a.authorName || null,
      isFeatured: !!a.isFeatured,
      article: a
    }));

    return {
      total,
      page: p,
      pageSize: ps,
      articles: mapped
    };
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles', []);
    const bookmarks = this._getFromStorage('article_bookmarks', []);

    const art = articles.find((a) => a.id === articleId) || null;
    if (!art) {
      return {
        article: null,
        bookmarkStatus: {
          isBookmarked: false,
          bookmarkId: null
        }
      };
    }

    const bookmark = bookmarks.find((b) => b.articleId === articleId) || null;

    return {
      article: {
        id: art.id,
        title: art.title,
        slug: art.slug,
        url: art.url,
        summary: art.summary || null,
        body: art.body,
        primaryTopic: art.primaryTopic,
        primaryTopicLabel: this._topicLabel(art.primaryTopic),
        tags: art.tags || [],
        publicationDate: art.publicationDate,
        authorName: art.authorName || null,
        isFeatured: !!art.isFeatured
      },
      bookmarkStatus: {
        isBookmarked: !!bookmark,
        bookmarkId: bookmark ? bookmark.id : null
      }
    };
  }

  // bookmarkArticle(articleId, notes)
  bookmarkArticle(articleId, notes) {
    const articles = this._getFromStorage('articles', []);
    const art = articles.find((a) => a.id === articleId) || null;
    if (!art) {
      return {
        success: false,
        bookmarkId: null,
        message: 'Article not found.'
      };
    }

    const bookmarks = this._getFromStorage('article_bookmarks', []);
    let existing = bookmarks.find((b) => b.articleId === articleId) || null;
    if (existing) {
      if (typeof notes === 'string') existing.notes = notes;
      this._saveToStorage('article_bookmarks', bookmarks);
      return {
        success: true,
        bookmarkId: existing.id,
        message: 'Article already bookmarked; notes updated.'
      };
    }

    const id = this._generateId('article_bookmark');
    const bookmark = {
      id,
      articleId,
      createdAt: this._nowISO(),
      notes: notes || ''
    };
    bookmarks.push(bookmark);
    this._saveToStorage('article_bookmarks', bookmarks);

    return {
      success: true,
      bookmarkId: id,
      message: 'Article bookmarked.'
    };
  }

  // getBookmarkedArticles()
  getBookmarkedArticles() {
    const bookmarks = this._getFromStorage('article_bookmarks', []);
    const articles = this._getFromStorage('articles', []);

    return bookmarks
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      })
      .map((b) => {
        const art = articles.find((a) => a.id === b.articleId) || null;
        return {
          bookmarkId: b.id,
          createdAt: b.createdAt,
          notes: b.notes || null,
          articleId: b.articleId,
          title: art ? art.title : null,
          summary: art ? art.summary || null : null,
          primaryTopicLabel: art ? this._topicLabel(art.primaryTopic) : null,
          publicationDate: art ? art.publicationDate : null,
          authorName: art ? art.authorName || null : null,
          article: art
        };
      });
  }

  // shareArticleLink(articleId)
  shareArticleLink(articleId) {
    const articles = this._getFromStorage('articles', []);
    const art = articles.find((a) => a.id === articleId) || null;
    if (!art) {
      return {
        url: null,
        success: false,
        message: 'Article not found.'
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task8_shareUsed',
        JSON.stringify({ articleId: articleId, sharedAt: this._nowISO() })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      url: art.url,
      success: true,
      message: 'Share link generated.'
    };
  }

  // getNewsletterOptions()
  getNewsletterOptions() {
    const frequencies = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const topics = [
      { value: 'elections', label: this._topicLabel('elections') },
      { value: 'media_bias', label: this._topicLabel('media_bias') },
      { value: 'policy_analysis', label: this._topicLabel('policy_analysis') },
      { value: 'climate_policy', label: this._topicLabel('climate_policy') },
      { value: 'economic_policy', label: this._topicLabel('economic_policy') },
      { value: 'voting_rights', label: this._topicLabel('voting_rights') },
      { value: 'immigration', label: this._topicLabel('immigration') },
      { value: 'free_speech', label: this._topicLabel('free_speech') },
      { value: 'general_politics', label: this._topicLabel('general_politics') }
    ];

    const emailFormats = [
      { value: 'html', label: this._emailFormatLabel('html') },
      { value: 'text', label: this._emailFormatLabel('text') }
    ];

    return {
      frequencies,
      topics,
      emailFormats
    };
  }

  // subscribeToNewsletter(email, name, frequency, primaryTopic, topics, emailFormat)
  subscribeToNewsletter(email, name, frequency, primaryTopic, topics, emailFormat) {
    const allowedFreq = ['daily', 'weekly', 'monthly'];
    if (!allowedFreq.includes(frequency)) {
      return {
        success: false,
        subscriptionId: null,
        status: 'unsubscribed',
        message: 'Invalid frequency.'
      };
    }

    const subs = this._getFromStorage('newsletter_subscriptions', []);
    const id = this._generateId('newsletter');

    const topicsArr = Array.isArray(topics) ? topics.slice() : [];
    let primary = primaryTopic || (topicsArr.length ? topicsArr[0] : null);

    const sub = {
      id,
      email,
      name: name || null,
      frequency,
      primaryTopic: primary,
      topics: topicsArr.length ? topicsArr : primary ? [primary] : [],
      emailFormat: emailFormat || 'html',
      createdAt: this._nowISO(),
      status: 'active'
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscriptionId: id,
      status: 'active',
      message: 'Subscription saved.'
    };
  }

  // getAboutContent()
  getAboutContent() {
    return {
      headline: 'About This Political Commentary Library',
      body:
        'This site curates political commentary books and articles across the ideological spectrum, helping readers explore climate policy, economic debates, elections, voting rights, immigration, free speech, and broader governance issues.',
      ideologyExplanation:
        'Each book and article is tagged with an ideological leaning such as progressive, conservative, centrist, or nonpartisan to provide transparency, not to limit discovery.',
      selectionCriteria:
        'Selections prioritize clarity of argument, use of evidence, and contribution to current policy debates, regardless of political perspective.'
    };
  }

  // submitContactForm(name, email, subject, messageBody, category)
  submitContactForm(name, email, subject, messageBody, category) {
    const messages = this._getFromStorage('contact_messages', []);
    const id = this._generateId('contact');
    const msg = {
      id,
      name,
      email,
      subject,
      messageBody,
      category: category || null,
      createdAt: this._nowISO()
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Contact message received.'
    };
  }

  // getPoliciesContent()
  getPoliciesContent() {
    return {
      privacyPolicy:
        'We store minimal information necessary for purchases, event registrations, newsletter subscriptions, and contact messages. Data is not sold to third parties and is used only to operate this site.',
      termsOfUse:
        'Content is provided for informational purposes only and does not constitute legal, financial, or voting advice. By using this site you agree to abide by applicable laws and our community guidelines.',
      communityGuidelines:
        'We encourage robust, good-faith debate. Personal attacks, harassment, hate speech, and disinformation campaigns are not permitted.',
      dataUsageSummary:
        'We use local storage to remember cart contents, reading lists, and preferences in your browser. Server-side records are limited to orders, event registrations, author messages, and newsletter subscriptions.'
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