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
  }

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const arrayKeys = [
      // Blog
      'blog_posts',
      'blog_tags',
      'blog_comments',
      'saved_blog_posts',
      // Books & series
      'book_series',
      'books',
      // Reading lists
      'reading_lists',
      'reading_list_items',
      // Wishlist
      'wishlists',
      'wishlist_items',
      // Events
      'events',
      'event_sessions',
      'event_registrations',
      'my_events',
      // Quotes
      'quotes',
      // Bundles & cart
      'bundles',
      'cart',
      'cart_items',
      // Newsletter
      'newsletter_subscriptions',
      // Contact/messages
      'contact_messages'
    ];

    arrayKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // About content is a single object, not an array
    if (localStorage.getItem('about_content') === null) {
      localStorage.setItem('about_content', JSON.stringify({}));
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      if (typeof defaultValue !== 'undefined') return defaultValue;
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      if (typeof defaultValue !== 'undefined') return defaultValue;
      return [];
    }
  }

  _getRawFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue === 'undefined' ? null : defaultValue;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue === 'undefined' ? null : defaultValue;
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareDateStringsDesc(a, b) {
    const da = this._parseDate(a);
    const db = this._parseDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return db.getTime() - da.getTime();
  }

  _compareDateStringsAsc(a, b) {
    const da = this._parseDate(a);
    const db = this._parseDate(b);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da.getTime() - db.getTime();
  }

  _paginate(array, page, pageSize) {
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const totalResults = array.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / ps));
    const start = (p - 1) * ps;
    const end = start + ps;
    const results = array.slice(start, end);
    return {
      results,
      pagination: {
        page: p,
        pageSize: ps,
        totalResults,
        totalPages
      }
    };
  }

  // ---------------------- Private helpers for specific entities ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts)) {
      carts = [];
    }
    let cart = carts[0] || null;
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    if (!Array.isArray(wishlists)) {
      wishlists = [];
    }
    let wishlist = wishlists[0] || null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        createdAt: new Date().toISOString(),
        updatedAt: null
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _getOrCreateSavedPostsList() {
    let saved = this._getFromStorage('saved_blog_posts');
    if (!Array.isArray(saved)) {
      saved = [];
      this._saveToStorage('saved_blog_posts', saved);
    }
    return saved;
  }

  _getNextCalendarMonthRange() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    const start = new Date(Date.UTC(nextYear, nextMonth, 1, 0, 0, 0, 0));
    const end = new Date(Date.UTC(nextYear, nextMonth + 1, 0, 23, 59, 59, 999));

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString()
    };
  }

  _resolveSeriesForBook(book, seriesList) {
    if (!book) return { seriesName: null, seriesCode: book && book.seriesCode ? book.seriesCode : null };
    const byId = book.seriesId ? seriesList.find((s) => s.id === book.seriesId) : null;
    const byCode = !byId && book.seriesCode ? seriesList.find((s) => s.code === book.seriesCode) : null;
    const series = byId || byCode || null;
    return {
      seriesName: series ? series.name : null,
      seriesCode: series ? series.code : (book.seriesCode || null)
    };
  }

  _addItemToCart(itemType, itemId, quantity) {
    const q = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const cart = this._getOrCreateCart();
    const now = new Date().toISOString();

    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts)) carts = [cart];

    let cartItems = this._getFromStorage('cart_items');

    let unitPrice = 0;
    let currency = 'usd';

    if (itemType === 'book') {
      const books = this._getFromStorage('books');
      const book = books.find((b) => b.id === itemId);
      if (!book) {
        return { success: false, cartItem: null, message: 'Book not found' };
      }
      unitPrice = book.price;
      currency = book.currency || 'usd';
    } else if (itemType === 'bundle') {
      const bundles = this._getFromStorage('bundles');
      const bundle = bundles.find((b) => b.id === itemId);
      if (!bundle) {
        return { success: false, cartItem: null, message: 'Bundle not found' };
      }
      unitPrice = bundle.price;
      currency = bundle.currency || 'usd';
    } else {
      return { success: false, cartItem: null, message: 'Invalid item type' };
    }

    let existing = cartItems.find(
      (ci) => ci.cartId === cart.id && ci.itemType === itemType && ci.itemId === itemId
    );

    if (existing) {
      existing.quantity = (existing.quantity || 0) + q;
      existing.unitPrice = unitPrice;
      existing.currency = currency;
    } else {
      existing = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType,
        itemId,
        quantity: q,
        unitPrice,
        currency,
        addedAt: now
      };
      cartItems.push(existing);
    }

    // Update cart updatedAt
    const cartIndex = carts.findIndex((c) => c.id === cart.id);
    if (cartIndex !== -1) {
      carts[cartIndex] = {
        ...cart,
        updatedAt: now
      };
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', carts);

    return {
      success: true,
      cartItem: {
        cartItemId: existing.id,
        cartId: existing.cartId,
        itemType: existing.itemType,
        itemId: existing.itemId,
        quantity: existing.quantity,
        unitPrice: existing.unitPrice,
        currency: existing.currency,
        addedAt: existing.addedAt
      },
      message: 'Item added to cart'
    };
  }

  // ---------------------- Interface implementations ----------------------

  // getHomeFeaturedContent
  getHomeFeaturedContent() {
    const books = this._getFromStorage('books');
    const seriesList = this._getFromStorage('book_series');
    const blogPosts = this._getFromStorage('blog_posts');
    const blogTags = this._getFromStorage('blog_tags');
    const events = this._getFromStorage('events');
    const newsletterSubs = this._getFromStorage('newsletter_subscriptions');

    // Featured books: top 3 by popularityScore desc, fallback by publicationDate desc
    const booksSorted = [...books].sort((a, b) => {
      const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
      const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
      if (pb !== pa) return pb - pa;
      return this._compareDateStringsDesc(a.publicationDate, b.publicationDate);
    });

    const featuredBooks = booksSorted.slice(0, 3).map((b) => {
      const { seriesName, seriesCode } = this._resolveSeriesForBook(b, seriesList);
      return {
        bookId: b.id,
        title: b.title,
        slug: b.slug,
        seriesName,
        seriesCode,
        coverImageUrl: b.coverImageUrl || null,
        price: b.price,
        currency: b.currency || 'usd',
        format: b.format,
        primaryGenre: b.primaryGenre || null
      };
    });

    // Latest blog posts: top 3 by publishedAt desc
    const postsSorted = [...blogPosts].sort((a, b) => this._compareDateStringsDesc(a.publishedAt, b.publishedAt));

    const latestBlogPosts = postsSorted.slice(0, 3).map((p) => {
      const tagNames = (p.tags || []).map((code) => {
        const tag = blogTags.find((t) => t.code === code);
        return tag ? tag.name : code;
      });
      return {
        postId: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt || '',
        publishedAt: p.publishedAt,
        tagNames,
        commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
        readingTimeMinutes: typeof p.readingTimeMinutes === 'number' ? p.readingTimeMinutes : null
      };
    });

    // Next event (by startDate > now)
    const now = new Date();
    const upcomingEvents = events.filter((e) => {
      const sd = this._parseDate(e.startDate);
      return sd && sd.getTime() >= now.getTime();
    });

    upcomingEvents.sort((a, b) => this._compareDateStringsAsc(a.startDate, b.startDate));

    const nextEventEntity = upcomingEvents[0] || null;
    const nextEvent = nextEventEntity
      ? {
          eventId: nextEventEntity.id,
          title: nextEventEntity.title,
          slug: nextEventEntity.slug,
          eventType: nextEventEntity.eventType,
          startDate: nextEventEntity.startDate || null,
          endDate: nextEventEntity.endDate || null,
          timezone: nextEventEntity.timezone || null,
          location: nextEventEntity.location || null
        }
      : null;

    const activeSub = newsletterSubs.find((s) => s.isActive);
    const newsletterTeaser = {
      isSubscribed: !!activeSub,
      message: activeSub
        ? 'You are subscribed to the newsletter.'
        : 'Subscribe to the newsletter for the latest updates.'
    };

    return {
      featuredBooks,
      latestBlogPosts,
      nextEvent,
      newsletterTeaser
    };
  }

  // getBlogFilterOptions
  getBlogFilterOptions() {
    const tags = this._getFromStorage('blog_tags');
    const posts = this._getFromStorage('blog_posts');

    const yearsSet = new Set();
    posts.forEach((p) => {
      const d = this._parseDate(p.publishedAt);
      if (d) yearsSet.add(d.getFullYear());
    });
    const years = Array.from(yearsSet)
      .sort((a, b) => b - a)
      .map((y) => ({ value: y, label: String(y) }));

    const sortOptions = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'oldest_first', label: 'Oldest First' },
      { value: 'most_commented', label: 'Most Commented' }
    ];

    // Build tag options from predefined tags and any tags actually used on posts
    const tagMap = new Map();
    tags.forEach((t) => {
      tagMap.set(t.code, {
        code: t.code,
        name: t.name,
        description: t.description || ''
      });
    });
    posts.forEach((p) => {
      (p.tags || []).forEach((code) => {
        if (!tagMap.has(code)) {
          const name = code
            .split('_')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
          tagMap.set(code, {
            code,
            name,
            description: ''
          });
        }
      });
    });
    const tagOptions = Array.from(tagMap.values());

    return {
      tags: tagOptions,
      years,
      sortOptions
    };
  }

  // searchBlogPosts(query, filters)
  searchBlogPosts(query, filters) {
    const posts = this._getFromStorage('blog_posts');
    const tags = this._getFromStorage('blog_tags');
    const saved = this._getFromStorage('saved_blog_posts');

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};
    const tagCodes = Array.isArray(f.tagCodes) ? f.tagCodes : null;
    const year = typeof f.year === 'number' ? f.year : null;
    const sortBy = f.sortBy || 'newest_first';
    const page = f.page || 1;
    const pageSize = f.pageSize || 20;

    let results = posts.filter((p) => {
      if (q) {
        const haystack = [p.title, p.excerpt, p.content]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (tagCodes && tagCodes.length > 0) {
        const postTags = p.tags || [];
        const allMatch = tagCodes.every((code) => postTags.includes(code));
        if (!allMatch) return false;
      }

      if (year) {
        const d = this._parseDate(p.publishedAt);
        if (!d || d.getFullYear() !== year) return false;
      }

      return true;
    });

    if (sortBy === 'oldest_first') {
      results.sort((a, b) => this._compareDateStringsAsc(a.publishedAt, b.publishedAt));
    } else if (sortBy === 'most_commented') {
      results.sort((a, b) => {
        const ca = typeof a.commentCount === 'number' ? a.commentCount : 0;
        const cb = typeof b.commentCount === 'number' ? b.commentCount : 0;
        if (cb !== ca) return cb - ca;
        return this._compareDateStringsDesc(a.publishedAt, b.publishedAt);
      });
    } else {
      // newest_first or default
      results.sort((a, b) => this._compareDateStringsDesc(a.publishedAt, b.publishedAt));
    }

    const { results: pageResults, pagination } = this._paginate(results, page, pageSize);

    const mapped = pageResults.map((p) => {
      const tagNames = (p.tags || []).map((code) => {
        const tag = tags.find((t) => t.code === code);
        return tag ? tag.name : code;
      });
      const isSaved = saved.some((s) => s.postId === p.id);
      return {
        postId: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt || '',
        publishedAt: p.publishedAt,
        tagNames,
        commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
        likeCount: typeof p.likeCount === 'number' ? p.likeCount : 0,
        readingTimeMinutes: typeof p.readingTimeMinutes === 'number' ? p.readingTimeMinutes : null,
        isSaved
      };
    });

    return {
      results: mapped,
      pagination
    };
  }

  // getBlogPostDetail(postId)
  getBlogPostDetail(postId) {
    const posts = this._getFromStorage('blog_posts');
    const tags = this._getFromStorage('blog_tags');
    const saved = this._getFromStorage('saved_blog_posts');

    const post = posts.find((p) => p.id === postId) || null;

    if (!post) {
      return {
        post: null,
        isSaved: false,
        relatedPosts: []
      };
    }

    const tagNames = (post.tags || []).map((code) => {
      const tag = tags.find((t) => t.code === code);
      return tag ? tag.name : code;
    });

    const isSaved = saved.some((s) => s.postId === post.id);

    // Related posts: share at least one tag
    const relatedCandidates = posts.filter((p) => {
      if (p.id === post.id) return false;
      const pTags = p.tags || [];
      const intersection = (post.tags || []).some((code) => pTags.includes(code));
      return intersection;
    });

    relatedCandidates.sort((a, b) => this._compareDateStringsDesc(a.publishedAt, b.publishedAt));

    const relatedPosts = relatedCandidates.slice(0, 3).map((p) => ({
      postId: p.id,
      title: p.title,
      slug: p.slug,
      publishedAt: p.publishedAt
    }));

    return {
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt || '',
        publishedAt: post.publishedAt,
        authorName: post.authorName || null,
        heroImageUrl: post.heroImageUrl || null,
        tagNames,
        commentCount: typeof post.commentCount === 'number' ? post.commentCount : 0,
        likeCount: typeof post.likeCount === 'number' ? post.likeCount : 0,
        readingTimeMinutes: typeof post.readingTimeMinutes === 'number' ? post.readingTimeMinutes : null,
        wordCount: typeof post.wordCount === 'number' ? post.wordCount : null
      },
      isSaved,
      relatedPosts
    };
  }

  // saveBlogPostToSavedList(postId)
  saveBlogPostToSavedList(postId) {
    const posts = this._getFromStorage('blog_posts');
    const post = posts.find((p) => p.id === postId);
    if (!post) {
      return {
        success: false,
        savedItem: null,
        message: 'Blog post not found'
      };
    }

    let saved = this._getOrCreateSavedPostsList();
    const existing = saved.find((s) => s.postId === postId);
    if (existing) {
      return {
        success: true,
        savedItem: {
          id: existing.id,
          postId: existing.postId,
          savedAt: existing.savedAt
        },
        message: 'Post already saved'
      };
    }

    const item = {
      id: this._generateId('saved_post'),
      postId,
      savedAt: new Date().toISOString()
    };
    saved.push(item);
    this._saveToStorage('saved_blog_posts', saved);

    return {
      success: true,
      savedItem: {
        id: item.id,
        postId: item.postId,
        savedAt: item.savedAt
      },
      message: 'Post saved successfully'
    };
  }

  // getSavedBlogPosts()
  getSavedBlogPosts() {
    const saved = this._getFromStorage('saved_blog_posts');
    const posts = this._getFromStorage('blog_posts');
    const tags = this._getFromStorage('blog_tags');

    const sortedSaved = [...saved].sort((a, b) => this._compareDateStringsDesc(a.savedAt, b.savedAt));

    return sortedSaved.map((s) => {
      const post = posts.find((p) => p.id === s.postId) || null;
      if (!post) {
        return {
          savedId: s.id,
          savedAt: s.savedAt,
          post: null
        };
      }
      const tagNames = (post.tags || []).map((code) => {
        const tag = tags.find((t) => t.code === code);
        return tag ? tag.name : code;
      });
      return {
        savedId: s.id,
        savedAt: s.savedAt,
        post: {
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt || '',
          publishedAt: post.publishedAt,
          tagNames
        }
      };
    });
  }

  // submitBlogComment(postId, authorName, authorEmail, content)
  submitBlogComment(postId, authorName, authorEmail, content) {
    const posts = this._getFromStorage('blog_posts');
    const postIndex = posts.findIndex((p) => p.id === postId);
    if (postIndex === -1) {
      return {
        success: false,
        comment: null,
        updatedCommentCount: 0,
        message: 'Blog post not found'
      };
    }

    const now = new Date().toISOString();
    let comments = this._getFromStorage('blog_comments');

    const comment = {
      id: this._generateId('comment'),
      postId,
      authorName,
      authorEmail,
      content,
      createdAt: now,
      status: 'pending'
    };

    comments.push(comment);
    this._saveToStorage('blog_comments', comments);

    const post = posts[postIndex];
    const newCount = (post.commentCount || 0) + 1;
    posts[postIndex] = {
      ...post,
      commentCount: newCount
    };
    this._saveToStorage('blog_posts', posts);

    return {
      success: true,
      comment: {
        id: comment.id,
        postId: comment.postId,
        authorName: comment.authorName,
        authorEmail: comment.authorEmail,
        content: comment.content,
        createdAt: comment.createdAt,
        status: comment.status
      },
      updatedCommentCount: newCount,
      message: 'Comment submitted successfully'
    };
  }

  // getBookFilterOptions
  getBookFilterOptions() {
    const seriesList = this._getFromStorage('book_series');
    const books = this._getFromStorage('books');

    let minPrice = null;
    let maxPrice = null;
    books.forEach((b) => {
      if (typeof b.price === 'number') {
        if (minPrice === null || b.price < minPrice) minPrice = b.price;
        if (maxPrice === null || b.price > maxPrice) maxPrice = b.price;
      }
    });
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const formats = [
      { value: 'ebook', label: 'eBook' },
      { value: 'paperback', label: 'Paperback' },
      { value: 'hardcover', label: 'Hardcover' },
      { value: 'audiobook', label: 'Audiobook' }
    ];

    const genresEnum = [
      'fantasy',
      'science_fiction',
      'romance',
      'mystery',
      'non_fiction',
      'writing_tips'
    ];

    const genres = genresEnum.map((code) => ({
      code,
      name: code
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ')
    }));

    return {
      series: seriesList.map((s) => ({
        code: s.code,
        name: s.name,
        description: s.description || ''
      })),
      formats,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        step: 1
      },
      genres
    };
  }

  // listBooks(filters, sortBy, page, pageSize)
  listBooks(filters, sortBy, page, pageSize) {
    const books = this._getFromStorage('books');
    const seriesList = this._getFromStorage('book_series');
    const wishlistItems = this._getFromStorage('wishlist_items');
    const readingListItems = this._getFromStorage('reading_list_items');

    const f = filters || {};
    let results = books.filter((b) => {
      if (f.seriesCode && b.seriesCode !== f.seriesCode) return false;
      if (f.format && b.format !== f.format) return false;
      if (f.primaryGenre && b.primaryGenre !== f.primaryGenre) return false;
      if (typeof f.minPrice === 'number' && typeof b.price === 'number' && b.price < f.minPrice)
        return false;
      if (typeof f.maxPrice === 'number' && typeof b.price === 'number' && b.price > f.maxPrice)
        return false;
      return true;
    });

    const sb = sortBy || 'publication_date_newest_first';
    if (sb === 'price_low_to_high') {
      results.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Infinity;
        const pb = typeof b.price === 'number' ? b.price : Infinity;
        return pa - pb;
      });
    } else if (sb === 'price_high_to_low') {
      results.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pb - pa;
      });
    } else if (sb === 'publication_date_oldest_first') {
      results.sort((a, b) => this._compareDateStringsAsc(a.publicationDate, b.publicationDate));
    } else if (sb === 'popularity_desc') {
      results.sort((a, b) => {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        if (pb !== pa) return pb - pa;
        return this._compareDateStringsDesc(a.publicationDate, b.publicationDate);
      });
    } else {
      // publication_date_newest_first
      results.sort((a, b) => this._compareDateStringsDesc(a.publicationDate, b.publicationDate));
    }

    const p = page || 1;
    const ps = pageSize || 20;
    const { results: pageResults, pagination } = this._paginate(results, p, ps);

    const mapped = pageResults.map((b) => {
      const { seriesName, seriesCode } = this._resolveSeriesForBook(b, seriesList);
      const isInWishlist = wishlistItems.some((wi) => wi.bookId === b.id);
      const isInAnyReadingList = readingListItems.some((rli) => rli.bookId === b.id);
      return {
        bookId: b.id,
        title: b.title,
        slug: b.slug,
        seriesName,
        seriesCode,
        seriesOrder: typeof b.seriesOrder === 'number' ? b.seriesOrder : null,
        price: b.price,
        currency: b.currency || 'usd',
        format: b.format,
        primaryGenre: b.primaryGenre || null,
        publicationDate: b.publicationDate || null,
        coverImageUrl: b.coverImageUrl || null,
        isInWishlist,
        isInAnyReadingList
      };
    });

    return {
      results: mapped,
      pagination
    };
  }

  // getBookDetail(bookId)
  getBookDetail(bookId) {
    const books = this._getFromStorage('books');
    const seriesList = this._getFromStorage('book_series');
    const wishlistItems = this._getFromStorage('wishlist_items');
    const readingLists = this._getFromStorage('reading_lists');
    const readingListItems = this._getFromStorage('reading_list_items');

    const book = books.find((b) => b.id === bookId) || null;
    if (!book) {
      return {
        book: null,
        isInWishlist: false,
        inReadingLists: [],
        relatedBooks: []
      };
    }

    const { seriesName, seriesCode } = this._resolveSeriesForBook(book, seriesList);

    const isInWishlist = wishlistItems.some((wi) => wi.bookId === book.id);

    const listItemsForBook = readingListItems.filter((rli) => rli.bookId === book.id);
    const inReadingListsMap = {};
    listItemsForBook.forEach((item) => {
      const rl = readingLists.find((r) => r.id === item.readingListId);
      if (rl && !inReadingListsMap[rl.id]) {
        inReadingListsMap[rl.id] = {
          readingListId: rl.id,
          readingListName: rl.name
        };
      }
    });
    const inReadingLists = Object.values(inReadingListsMap);

    const related = books.filter((b) => {
      if (b.id === book.id) return false;
      if (book.seriesId && b.seriesId && b.seriesId === book.seriesId) return true;
      if (book.seriesCode && b.seriesCode && b.seriesCode === book.seriesCode) return true;
      return false;
    });

    related.sort((a, b) => {
      const oa = typeof a.seriesOrder === 'number' ? a.seriesOrder : Infinity;
      const ob = typeof b.seriesOrder === 'number' ? b.seriesOrder : Infinity;
      if (oa !== ob) return oa - ob;
      return this._compareDateStringsAsc(a.publicationDate, b.publicationDate);
    });

    const relatedBooks = related.map((b) => ({
      bookId: b.id,
      title: b.title,
      slug: b.slug,
      seriesName: this._resolveSeriesForBook(b, seriesList).seriesName,
      seriesOrder: typeof b.seriesOrder === 'number' ? b.seriesOrder : null,
      coverImageUrl: b.coverImageUrl || null
    }));

    return {
      book: {
        id: book.id,
        title: book.title,
        slug: book.slug,
        description: book.description || '',
        seriesName,
        seriesCode,
        seriesOrder: typeof book.seriesOrder === 'number' ? book.seriesOrder : null,
        price: book.price,
        currency: book.currency || 'usd',
        format: book.format,
        primaryGenre: book.primaryGenre || null,
        additionalGenres: Array.isArray(book.additionalGenres) ? book.additionalGenres : [],
        publicationDate: book.publicationDate || null,
        pageCount: typeof book.pageCount === 'number' ? book.pageCount : null,
        coverImageUrl: book.coverImageUrl || null,
        isInPrint: typeof book.isInPrint === 'boolean' ? book.isInPrint : null,
        popularityScore: typeof book.popularityScore === 'number' ? book.popularityScore : null
      },
      isInWishlist,
      inReadingLists,
      relatedBooks
    };
  }

  // getReadingLists()
  getReadingLists() {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    return lists.map((l) => {
      const totalItems = items.filter((i) => i.readingListId === l.id).length;
      return {
        id: l.id,
        name: l.name,
        description: l.description || '',
        createdAt: l.createdAt,
        updatedAt: l.updatedAt || null,
        totalItems
      };
    });
  }

  // createReadingList(name, description)
  createReadingList(name, description) {
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      return {
        success: false,
        readingList: null,
        message: 'Name is required'
      };
    }

    let lists = this._getFromStorage('reading_lists');
    const now = new Date().toISOString();

    const list = {
      id: this._generateId('reading_list'),
      name: trimmedName,
      description: description || '',
      createdAt: now,
      updatedAt: null
    };

    lists.push(list);
    this._saveToStorage('reading_lists', lists);

    return {
      success: true,
      readingList: {
        id: list.id,
        name: list.name,
        description: list.description,
        createdAt: list.createdAt
      },
      message: 'Reading list created successfully'
    };
  }

  // getReadingListDetail(readingListId)
  getReadingListDetail(readingListId) {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const books = this._getFromStorage('books');
    const seriesList = this._getFromStorage('book_series');

    const list = lists.find((l) => l.id === readingListId) || null;
    if (!list) {
      return {
        id: null,
        name: null,
        description: '',
        createdAt: null,
        updatedAt: null,
        items: []
      };
    }

    const listItems = items
      .filter((i) => i.readingListId === readingListId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });

    const mappedItems = listItems.map((i) => {
      const book = books.find((b) => b.id === i.bookId) || null;
      let bookDisplay = null;
      if (book) {
        const { seriesName } = this._resolveSeriesForBook(book, seriesList);
        bookDisplay = {
          bookId: book.id,
          title: book.title,
          slug: book.slug,
          seriesName,
          seriesOrder: typeof book.seriesOrder === 'number' ? book.seriesOrder : null,
          coverImageUrl: book.coverImageUrl || null,
          format: book.format,
          price: book.price,
          currency: book.currency || 'usd'
        };
      }
      return {
        readingListItemId: i.id,
        position: i.position,
        addedAt: i.addedAt,
        notes: i.notes || '',
        book: bookDisplay
      };
    });

    return {
      id: list.id,
      name: list.name,
      description: list.description || '',
      createdAt: list.createdAt,
      updatedAt: list.updatedAt || null,
      items: mappedItems
    };
  }

  // renameReadingList(readingListId, newName)
  renameReadingList(readingListId, newName) {
    let lists = this._getFromStorage('reading_lists');
    const index = lists.findIndex((l) => l.id === readingListId);
    if (index === -1) {
      return {
        success: false,
        readingList: null,
        message: 'Reading list not found'
      };
    }

    const trimmedName = (newName || '').trim();
    if (!trimmedName) {
      return {
        success: false,
        readingList: null,
        message: 'New name is required'
      };
    }

    const now = new Date().toISOString();
    const list = lists[index];
    const updated = {
      ...list,
      name: trimmedName,
      updatedAt: now
    };
    lists[index] = updated;
    this._saveToStorage('reading_lists', lists);

    return {
      success: true,
      readingList: {
        id: updated.id,
        name: updated.name,
        updatedAt: updated.updatedAt
      },
      message: 'Reading list renamed successfully'
    };
  }

  // deleteReadingList(readingListId)
  deleteReadingList(readingListId) {
    let lists = this._getFromStorage('reading_lists');
    const beforeCount = lists.length;
    lists = lists.filter((l) => l.id !== readingListId);
    this._saveToStorage('reading_lists', lists);

    let items = this._getFromStorage('reading_list_items');
    items = items.filter((i) => i.readingListId !== readingListId);
    this._saveToStorage('reading_list_items', items);

    const deleted = lists.length < beforeCount;

    return {
      success: deleted,
      message: deleted ? 'Reading list deleted successfully' : 'Reading list not found'
    };
  }

  // addBookToReadingList(readingListId, bookId, notes)
  addBookToReadingList(readingListId, bookId, notes) {
    const lists = this._getFromStorage('reading_lists');
    const list = lists.find((l) => l.id === readingListId);
    if (!list) {
      return {
        success: false,
        item: null,
        message: 'Reading list not found'
      };
    }

    const books = this._getFromStorage('books');
    const book = books.find((b) => b.id === bookId);
    if (!book) {
      return {
        success: false,
        item: null,
        message: 'Book not found'
      };
    }

    let items = this._getFromStorage('reading_list_items');
    const existing = items.find((i) => i.readingListId === readingListId && i.bookId === bookId);
    if (existing) {
      return {
        success: true,
        item: {
          readingListItemId: existing.id,
          readingListId: existing.readingListId,
          bookId: existing.bookId,
          position: existing.position,
          addedAt: existing.addedAt
        },
        message: 'Book already in reading list'
      };
    }

    const now = new Date().toISOString();
    const positions = items
      .filter((i) => i.readingListId === readingListId)
      .map((i) => (typeof i.position === 'number' ? i.position : 0));
    const maxPos = positions.length > 0 ? Math.max.apply(null, positions) : 0;

    const item = {
      id: this._generateId('reading_list_item'),
      readingListId,
      bookId,
      position: maxPos + 1,
      addedAt: now,
      notes: notes || ''
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      item: {
        readingListItemId: item.id,
        readingListId: item.readingListId,
        bookId: item.bookId,
        position: item.position,
        addedAt: item.addedAt
      },
      message: 'Book added to reading list'
    };
  }

  // reorderReadingListItems(readingListId, newOrder)
  reorderReadingListItems(readingListId, newOrder) {
    let items = this._getFromStorage('reading_list_items');
    const orderMap = {};
    (newOrder || []).forEach((o) => {
      if (o && o.readingListItemId) {
        orderMap[o.readingListItemId] = o.position;
      }
    });

    items = items.map((i) => {
      if (i.readingListId === readingListId && orderMap.hasOwnProperty(i.id)) {
        return {
          ...i,
          position: orderMap[i.id]
        };
      }
      return i;
    });

    this._saveToStorage('reading_list_items', items);

    const updatedItems = items
      .filter((i) => i.readingListId === readingListId)
      .map((i) => ({
        readingListItemId: i.id,
        position: i.position
      }));

    return {
      success: true,
      items: updatedItems,
      message: 'Reading list items reordered'
    };
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    let items = this._getFromStorage('reading_list_items');
    const item = items.find((i) => i.id === readingListItemId) || null;
    if (!item) {
      return {
        success: false,
        message: 'Reading list item not found'
      };
    }

    const readingListId = item.readingListId;
    items = items.filter((i) => i.id !== readingListItemId);

    // Re-sequence positions for this list
    const listItems = items
      .filter((i) => i.readingListId === readingListId)
      .sort((a, b) => {
        const pa = typeof a.position === 'number' ? a.position : 0;
        const pb = typeof b.position === 'number' ? b.position : 0;
        return pa - pb;
      });
    listItems.forEach((li, idx) => {
      li.position = idx + 1;
    });

    this._saveToStorage('reading_list_items', items);

    return {
      success: true,
      message: 'Reading list item removed'
    };
  }

  // getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items');
    const books = this._getFromStorage('books');
    const seriesList = this._getFromStorage('book_series');

    const itemsForWishlist = wishlistItems
      .filter((i) => i.wishlistId === wishlist.id)
      .sort((a, b) => this._compareDateStringsDesc(a.addedAt, b.addedAt));

    const items = itemsForWishlist.map((i) => {
      const book = books.find((b) => b.id === i.bookId) || null;
      let bookDisplay = null;
      if (book) {
        const { seriesName } = this._resolveSeriesForBook(book, seriesList);
        bookDisplay = {
          bookId: book.id,
          title: book.title,
          slug: book.slug,
          seriesName,
          seriesOrder: typeof book.seriesOrder === 'number' ? book.seriesOrder : null,
          coverImageUrl: book.coverImageUrl || null,
          format: book.format,
          price: book.price,
          currency: book.currency || 'usd'
        };
      }
      return {
        wishlistItemId: i.id,
        addedAt: i.addedAt,
        notes: i.notes || '',
        book: bookDisplay
      };
    });

    return {
      wishlistId: wishlist.id,
      createdAt: wishlist.createdAt,
      updatedAt: wishlist.updatedAt || null,
      items
    };
  }

  // addBookToWishlist(bookId, notes)
  addBookToWishlist(bookId, notes) {
    const wishlist = this._getOrCreateWishlist();
    let wishlists = this._getFromStorage('wishlists');
    let wishlistItems = this._getFromStorage('wishlist_items');

    const books = this._getFromStorage('books');
    const book = books.find((b) => b.id === bookId);
    if (!book) {
      return {
        success: false,
        item: null,
        message: 'Book not found'
      };
    }

    const existing = wishlistItems.find((i) => i.wishlistId === wishlist.id && i.bookId === bookId);
    if (existing) {
      return {
        success: true,
        item: {
          wishlistItemId: existing.id,
          wishlistId: existing.wishlistId,
          bookId: existing.bookId,
          addedAt: existing.addedAt
        },
        message: 'Book already in wishlist'
      };
    }

    const now = new Date().toISOString();
    const item = {
      id: this._generateId('wishlist_item'),
      wishlistId: wishlist.id,
      bookId,
      addedAt: now,
      notes: notes || ''
    };

    wishlistItems.push(item);

    // update wishlist updatedAt
    const wlIndex = wishlists.findIndex((w) => w.id === wishlist.id);
    if (wlIndex !== -1) {
      wishlists[wlIndex] = {
        ...wishlists[wlIndex],
        updatedAt: now
      };
    }

    this._saveToStorage('wishlist_items', wishlistItems);
    this._saveToStorage('wishlists', wishlists);

    return {
      success: true,
      item: {
        wishlistItemId: item.id,
        wishlistId: item.wishlistId,
        bookId: item.bookId,
        addedAt: item.addedAt
      },
      message: 'Book added to wishlist'
    };
  }

  // removeWishlistItem(wishlistItemId)
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlists = this._getFromStorage('wishlists');
    let items = this._getFromStorage('wishlist_items');

    const existing = items.find((i) => i.id === wishlistItemId);
    if (!existing) {
      return {
        success: false,
        message: 'Wishlist item not found'
      };
    }

    items = items.filter((i) => i.id !== wishlistItemId);

    const now = new Date().toISOString();
    const wlIndex = wishlists.findIndex((w) => w.id === wishlist.id);
    if (wlIndex !== -1) {
      wishlists[wlIndex] = {
        ...wishlists[wlIndex],
        updatedAt: now
      };
    }

    this._saveToStorage('wishlist_items', items);
    this._saveToStorage('wishlists', wishlists);

    return {
      success: true,
      message: 'Wishlist item removed'
    };
  }

  // moveWishlistItemToReadingList(wishlistItemId, readingListId, notes)
  moveWishlistItemToReadingList(wishlistItemId, readingListId, notes) {
    const wishlist = this._getOrCreateWishlist();
    let wishlists = this._getFromStorage('wishlists');
    let items = this._getFromStorage('wishlist_items');

    const item = items.find((i) => i.id === wishlistItemId);
    if (!item) {
      return {
        success: false,
        readingListItemId: null,
        removedWishlistItemId: null,
        message: 'Wishlist item not found'
      };
    }

    const notesToUse = typeof notes === 'string' && notes.length > 0 ? notes : item.notes;
    const addResult = this.addBookToReadingList(readingListId, item.bookId, notesToUse);
    if (!addResult.success) {
      return {
        success: false,
        readingListItemId: null,
        removedWishlistItemId: null,
        message: addResult.message
      };
    }

    // Remove from wishlist
    items = items.filter((i) => i.id !== wishlistItemId);
    const now = new Date().toISOString();
    const wlIndex = wishlists.findIndex((w) => w.id === wishlist.id);
    if (wlIndex !== -1) {
      wishlists[wlIndex] = {
        ...wishlists[wlIndex],
        updatedAt: now
      };
    }

    this._saveToStorage('wishlist_items', items);
    this._saveToStorage('wishlists', wishlists);

    return {
      success: true,
      readingListItemId: addResult.item.readingListItemId,
      removedWishlistItemId: wishlistItemId,
      message: 'Wishlist item moved to reading list'
    };
  }

  // addWishlistItemToCart(wishlistItemId, quantity)
  addWishlistItemToCart(wishlistItemId, quantity) {
    const items = this._getFromStorage('wishlist_items');
    const item = items.find((i) => i.id === wishlistItemId);
    if (!item) {
      return {
        success: false,
        cartItem: null,
        message: 'Wishlist item not found'
      };
    }

    const result = this._addItemToCart('book', item.bookId, quantity);
    return result;
  }

  // getEventFilterOptions()
  getEventFilterOptions() {
    const eventTypes = [
      { value: 'online', label: 'Online' },
      { value: 'in_person', label: 'In Person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    // Generate month options for the next 12 months
    const monthOptions = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(Date.UTC(now.getFullYear(), now.getMonth() + i, 1, 0, 0, 0, 0));
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth();
      const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
      const value = year + '-' + String(month + 1).padStart(2, '0');
      const monthName = d.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
      const label = monthName + ' ' + year;
      monthOptions.push({
        value,
        label,
        startDate: start.toISOString(),
        endDate: end.toISOString()
      });
    }

    return {
      eventTypes,
      monthOptions
    };
  }

  // listEvents(filters, sortBy, page, pageSize)
  listEvents(filters, sortBy, page, pageSize) {
    const events = this._getFromStorage('events');
    const f = filters || {};

    let results = events.filter((e) => {
      if (f.eventType && e.eventType !== f.eventType) return false;

      if (f.startDate || f.endDate) {
        const es = this._parseDate(e.startDate);
        if (!es) return false;
        if (f.startDate) {
          const fs = this._parseDate(f.startDate);
          if (fs && es.getTime() < fs.getTime()) return false;
        }
        if (f.endDate) {
          const fe = this._parseDate(f.endDate);
          if (fe && es.getTime() > fe.getTime()) return false;
        }
      }

      if (f.search) {
        const q = f.search.toLowerCase();
        const haystack = [e.title, e.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    const sb = sortBy || 'start_date_asc';
    if (sb === 'start_date_desc') {
      results.sort((a, b) => this._compareDateStringsDesc(a.startDate, b.startDate));
    } else {
      // start_date_asc
      results.sort((a, b) => this._compareDateStringsAsc(a.startDate, b.startDate));
    }

    const p = page || 1;
    const ps = pageSize || 20;
    const { results: pageResults, pagination } = this._paginate(results, p, ps);

    const mapped = pageResults.map((e) => ({
      eventId: e.id,
      title: e.title,
      slug: e.slug,
      description: e.description || '',
      eventType: e.eventType,
      location: e.location || null,
      startDate: e.startDate || null,
      endDate: e.endDate || null,
      timezone: e.timezone || null,
      isFree: typeof e.isFree === 'boolean' ? e.isFree : null,
      registrationRequired:
        typeof e.registrationRequired === 'boolean' ? e.registrationRequired : null
    }));

    return {
      results: mapped,
      pagination
    };
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const sessions = this._getFromStorage('event_sessions');
    const myEvents = this._getFromStorage('my_events');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        event: null,
        sessions: [],
        isInMyEvents: false
      };
    }

    const eventSessions = sessions.filter((s) => s.eventId === event.id);

    const mappedSessions = eventSessions.map((s) => ({
      sessionId: s.id,
      startDateTime: s.startDateTime,
      endDateTime: s.endDateTime || null,
      capacity: typeof s.capacity === 'number' ? s.capacity : null,
      seatsAvailable: typeof s.seatsAvailable === 'number' ? s.seatsAvailable : null
    }));

    const isInMyEvents = myEvents.some((m) => m.eventId === event.id);

    return {
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description || '',
        eventType: event.eventType,
        location: event.location || null,
        startDate: event.startDate || null,
        endDate: event.endDate || null,
        timezone: event.timezone || null,
        isFree: typeof event.isFree === 'boolean' ? event.isFree : null,
        registrationRequired:
          typeof event.registrationRequired === 'boolean' ? event.registrationRequired : null
      },
      sessions: mappedSessions,
      isInMyEvents
    };
  }

  // registerForEventSession(sessionId, attendeeName, attendeeEmail)
  registerForEventSession(sessionId, attendeeName, attendeeEmail) {
    let sessions = this._getFromStorage('event_sessions');
    let registrations = this._getFromStorage('event_registrations');

    const sessionIndex = sessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      return {
        success: false,
        registration: null,
        eventId: null,
        message: 'Event session not found'
      };
    }

    const session = sessions[sessionIndex];
    if (typeof session.seatsAvailable === 'number' && session.seatsAvailable <= 0) {
      return {
        success: false,
        registration: null,
        eventId: session.eventId || null,
        message: 'No seats available for this session'
      };
    }

    const now = new Date().toISOString();
    const registration = {
      id: this._generateId('event_reg'),
      sessionId,
      attendeeName,
      attendeeEmail,
      registeredAt: now,
      status: 'confirmed'
    };

    registrations.push(registration);

    if (typeof session.seatsAvailable === 'number') {
      sessions[sessionIndex] = {
        ...session,
        seatsAvailable: session.seatsAvailable - 1
      };
    }

    this._saveToStorage('event_registrations', registrations);
    this._saveToStorage('event_sessions', sessions);

    return {
      success: true,
      registration: {
        id: registration.id,
        sessionId: registration.sessionId,
        attendeeName: registration.attendeeName,
        attendeeEmail: registration.attendeeEmail,
        registeredAt: registration.registeredAt,
        status: registration.status
      },
      eventId: session.eventId || null,
      message: 'Registered for event session'
    };
  }

  // addEventToMyEvents(eventId, sessionId, registrationId, source)
  addEventToMyEvents(eventId, sessionId, registrationId, source) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return {
        success: false,
        myEventItem: null,
        message: 'Event not found'
      };
    }

    const src = source === 'registration' ? 'registration' : 'manual_save';

    let myEvents = this._getFromStorage('my_events');
    const now = new Date().toISOString();

    const item = {
      id: this._generateId('my_event'),
      eventId,
      sessionId: sessionId || null,
      registrationId: registrationId || null,
      addedAt: now,
      source: src
    };

    myEvents.push(item);
    this._saveToStorage('my_events', myEvents);

    return {
      success: true,
      myEventItem: {
        id: item.id,
        eventId: item.eventId,
        sessionId: item.sessionId,
        registrationId: item.registrationId,
        addedAt: item.addedAt,
        source: item.source
      },
      message: 'Event added to My Events'
    };
  }

  // getMyEvents()
  getMyEvents() {
    const myEvents = this._getFromStorage('my_events');
    const events = this._getFromStorage('events');
    const sessions = this._getFromStorage('event_sessions');

    const mapped = myEvents.map((m) => {
      const event = events.find((e) => e.id === m.eventId) || null;
      const session = m.sessionId ? sessions.find((s) => s.id === m.sessionId) : null;

      const eventDisplay = event
        ? {
            eventId: event.id,
            title: event.title,
            slug: event.slug,
            eventType: event.eventType,
            location: event.location || null,
            startDate: event.startDate || null,
            endDate: event.endDate || null,
            timezone: event.timezone || null
          }
        : null;

      const sessionDisplay = session
        ? {
            sessionId: session.id,
            startDateTime: session.startDateTime,
            endDateTime: session.endDateTime || null
          }
        : null;

      return {
        myEventItemId: m.id,
        addedAt: m.addedAt,
        source: m.source,
        event: eventDisplay,
        session: sessionDisplay
      };
    });

    // Sort by event start date if available, otherwise by addedAt desc
    mapped.sort((a, b) => {
      const ea = a.event && a.event.startDate ? this._parseDate(a.event.startDate) : null;
      const eb = b.event && b.event.startDate ? this._parseDate(b.event.startDate) : null;
      if (ea && eb) return ea.getTime() - eb.getTime();
      if (ea && !eb) return -1;
      if (!ea && eb) return 1;
      return this._compareDateStringsDesc(a.addedAt, b.addedAt);
    });

    return mapped;
  }

  // removeMyEvent(myEventItemId)
  removeMyEvent(myEventItemId) {
    let myEvents = this._getFromStorage('my_events');
    const before = myEvents.length;
    myEvents = myEvents.filter((m) => m.id !== myEventItemId);
    this._saveToStorage('my_events', myEvents);

    const removed = myEvents.length < before;
    return {
      success: removed,
      message: removed ? 'My Event entry removed' : 'My Event entry not found'
    };
  }

  // getQuoteFilterOptions()
  getQuoteFilterOptions() {
    const books = this._getFromStorage('books');
    const seriesList = this._getFromStorage('book_series');
    const quotes = this._getFromStorage('quotes');

    const bookEntries = books.map((b) => ({
      bookId: b.id,
      title: b.title,
      seriesName: this._resolveSeriesForBook(b, seriesList).seriesName
    }));

    // Include any books referenced only in quotes (e.g., pre-release titles)
    const existingIds = new Set(bookEntries.map((b) => b.bookId));
    quotes.forEach((q) => {
      if (q.bookId && !existingIds.has(q.bookId)) {
        existingIds.add(q.bookId);
        const withoutSuffix = q.bookId.replace(
          /_(ebook|paperback|hardcover|audiobook)$/i,
          ''
        );
        const title = withoutSuffix
          .split('_')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
        bookEntries.push({
          bookId: q.bookId,
          title,
          seriesName: null
        });
      }
    });

    // sort by title
    bookEntries.sort((a, b) => a.title.localeCompare(b.title));

    const sortOptions = [
      { value: 'most_liked', label: 'Most Liked' },
      { value: 'newest', label: 'Newest' }
    ];

    return {
      books: bookEntries,
      sortOptions
    };
  }

  // listQuotes(filters, sortBy, page, pageSize)
  listQuotes(filters, sortBy, page, pageSize) {
    const quotes = this._getFromStorage('quotes');
    const books = this._getFromStorage('books');

    const f = filters || {};
    let results = quotes.filter((q) => {
      if (f.bookId && q.bookId !== f.bookId) return false;
      return true;
    });

    const sb = sortBy || 'most_liked';
    if (sb === 'newest') {
      results.sort((a, b) => this._compareDateStringsDesc(a.createdAt, b.createdAt));
    } else {
      // most_liked
      results.sort((a, b) => {
        const la = typeof a.likesCount === 'number' ? a.likesCount : 0;
        const lb = typeof b.likesCount === 'number' ? b.likesCount : 0;
        if (lb !== la) return lb - la;
        return this._compareDateStringsDesc(a.createdAt, b.createdAt);
      });
    }

    const p = page || 1;
    const ps = pageSize || 20;
    const { results: pageResults, pagination } = this._paginate(results, p, ps);

    const mapped = pageResults.map((q) => {
      const book = books.find((b) => b.id === q.bookId) || null;
      return {
        quoteId: q.id,
        text: q.text,
        bookId: q.bookId,
        bookTitle: book ? book.title : null,
        likesCount: typeof q.likesCount === 'number' ? q.likesCount : 0,
        isFavorite: typeof q.isFavorite === 'boolean' ? q.isFavorite : false,
        createdAt: q.createdAt || null
      };
    });

    return {
      results: mapped,
      pagination
    };
  }

  // getQuoteDetail(quoteId)
  getQuoteDetail(quoteId) {
    const quotes = this._getFromStorage('quotes');
    const books = this._getFromStorage('books');

    const quote = quotes.find((q) => q.id === quoteId) || null;
    if (!quote) {
      return {
        quote: null
      };
    }

    const book = books.find((b) => b.id === quote.bookId) || null;

    return {
      quote: {
        id: quote.id,
        text: quote.text,
        bookId: quote.bookId,
        bookTitle: book ? book.title : null,
        pageNumber: typeof quote.pageNumber === 'number' ? quote.pageNumber : null,
        location: quote.location || null,
        likesCount: typeof quote.likesCount === 'number' ? quote.likesCount : 0,
        isFavorite: typeof quote.isFavorite === 'boolean' ? quote.isFavorite : false,
        shareSlug: quote.shareSlug,
        shareUrl: quote.shareUrl || null
      }
    };
  }

  // getQuoteShareLink(quoteId)
  getQuoteShareLink(quoteId) {
    let quotes = this._getFromStorage('quotes');
    const index = quotes.findIndex((q) => q.id === quoteId);
    if (index === -1) {
      return {
        shareUrl: null,
        shareSlug: null
      };
    }

    const quote = quotes[index];
    let shareSlug = quote.shareSlug || ('quote-' + quote.id);
    let shareUrl = quote.shareUrl || ('/quotes/' + shareSlug);

    quotes[index] = {
      ...quote,
      shareSlug,
      shareUrl
    };

    this._saveToStorage('quotes', quotes);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task6_shareLinkQuoteId', quoteId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      shareUrl,
      shareSlug
    };
  }

  // likeQuote(quoteId)
  likeQuote(quoteId) {
    let quotes = this._getFromStorage('quotes');
    const index = quotes.findIndex((q) => q.id === quoteId);
    if (index === -1) {
      return {
        success: false,
        likesCount: 0,
        isFavorite: false,
        message: 'Quote not found'
      };
    }

    const quote = quotes[index];
    const currentLikes = typeof quote.likesCount === 'number' ? quote.likesCount : 0;
    const currentFavorite = typeof quote.isFavorite === 'boolean' ? quote.isFavorite : false;

    let newLikes = currentLikes;
    let newFavorite = !currentFavorite;

    if (newFavorite && !currentFavorite) {
      newLikes = currentLikes + 1;
    } else if (!newFavorite && currentFavorite && currentLikes > 0) {
      newLikes = currentLikes - 1;
    }

    quotes[index] = {
      ...quote,
      likesCount: newLikes,
      isFavorite: newFavorite
    };

    this._saveToStorage('quotes', quotes);

    return {
      success: true,
      likesCount: newLikes,
      isFavorite: newFavorite,
      message: newFavorite ? 'Quote liked' : 'Quote unliked'
    };
  }

  // getBundleFilterOptions()
  getBundleFilterOptions() {
    const bundles = this._getFromStorage('bundles');

    let minPrice = null;
    let maxPrice = null;
    bundles.forEach((b) => {
      if (!b.isActive) return;
      if (typeof b.price === 'number') {
        if (minPrice === null || b.price < minPrice) minPrice = b.price;
        if (maxPrice === null || b.price > maxPrice) maxPrice = b.price;
      }
    });
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = 0;

    const formats = [
      { value: 'ebook', label: 'eBook Bundles' },
      { value: 'digital_only', label: 'Digital Only' },
      { value: 'mixed', label: 'Mixed' },
      { value: 'physical', label: 'Physical' }
    ];

    const minBooksOptions = [
      { value: 1, label: '1 or more' },
      { value: 2, label: '2 or more' },
      { value: 3, label: '3 or more' },
      { value: 4, label: '4 or more' },
      { value: 5, label: '5 or more' }
    ];

    return {
      formats,
      priceRange: {
        min: minPrice,
        max: maxPrice,
        step: 1
      },
      minBooksOptions
    };
  }

  // listBundles(filters, sortBy, page, pageSize)
  listBundles(filters, sortBy, page, pageSize) {
    const bundles = this._getFromStorage('bundles');
    const f = filters || {};

    let results = bundles.filter((b) => {
      if (!b.isActive) return false;
      if (f.format && b.format !== f.format) return false;
      if (typeof f.minPrice === 'number' && typeof b.price === 'number' && b.price < f.minPrice)
        return false;
      if (typeof f.maxPrice === 'number' && typeof b.price === 'number' && b.price > f.maxPrice)
        return false;
      if (
        typeof f.minTotalBooks === 'number' &&
        typeof b.totalBooks === 'number' &&
        b.totalBooks < f.minTotalBooks
      )
        return false;
      if (typeof f.isDigitalOnly === 'boolean') {
        const isDigitalOnly = !!b.isDigitalOnly;
        if (isDigitalOnly !== f.isDigitalOnly) return false;
      }
      return true;
    });

    const sb = sortBy || 'price_low_to_high';
    if (sb === 'price_high_to_low') {
      results.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pb - pa;
      });
    } else {
      // price_low_to_high
      results.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Infinity;
        const pb = typeof b.price === 'number' ? b.price : Infinity;
        return pa - pb;
      });
    }

    const p = page || 1;
    const ps = pageSize || 20;
    const { results: pageResults, pagination } = this._paginate(results, p, ps);

    const mapped = pageResults.map((b) => ({
      bundleId: b.id,
      title: b.title,
      slug: b.slug,
      description: b.description || '',
      format: b.format,
      price: b.price,
      currency: b.currency || 'usd',
      totalBooks: typeof b.totalBooks === 'number' ? b.totalBooks : 0,
      isDigitalOnly: typeof b.isDigitalOnly === 'boolean' ? b.isDigitalOnly : false,
      isActive: !!b.isActive
    }));

    return {
      results: mapped,
      pagination
    };
  }

  // getBundleDetail(bundleId)
  getBundleDetail(bundleId) {
    const bundles = this._getFromStorage('bundles');
    const books = this._getFromStorage('books');
    const seriesList = this._getFromStorage('book_series');

    const bundle = bundles.find((b) => b.id === bundleId) || null;
    if (!bundle) {
      return {
        bundle: null,
        includedBooks: [],
        recommendedBundles: []
      };
    }

    const includedBooks = (bundle.includedBookIds || []).map((id) => {
      const book = books.find((b) => b.id === id) || null;
      if (!book) {
        return null;
      }
      const { seriesName } = this._resolveSeriesForBook(book, seriesList);
      return {
        bookId: book.id,
        title: book.title,
        slug: book.slug,
        seriesName,
        format: book.format,
        coverImageUrl: book.coverImageUrl || null
      };
    }).filter(Boolean);

    const recommendedBundles = bundles
      .filter((b) => b.id !== bundle.id && b.isActive)
      .slice(0, 3)
      .map((b) => ({
        bundleId: b.id,
        title: b.title,
        slug: b.slug,
        price: b.price,
        currency: b.currency || 'usd'
      }));

    return {
      bundle: {
        id: bundle.id,
        title: bundle.title,
        slug: bundle.slug,
        description: bundle.description || '',
        format: bundle.format,
        price: bundle.price,
        currency: bundle.currency || 'usd',
        totalBooks: typeof bundle.totalBooks === 'number' ? bundle.totalBooks : 0,
        isDigitalOnly: typeof bundle.isDigitalOnly === 'boolean' ? bundle.isDigitalOnly : false,
        isActive: !!bundle.isActive
      },
      includedBooks,
      recommendedBundles
    };
  }

  // addBundleToCart(bundleId, quantity)
  addBundleToCart(bundleId, quantity) {
    return this._addItemToCart('bundle', bundleId, quantity);
  }

  // addBookToCart(bookId, quantity)
  addBookToCart(bookId, quantity) {
    return this._addItemToCart('book', bookId, quantity);
  }

  // getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const books = this._getFromStorage('books');
    const bundles = this._getFromStorage('bundles');

    const itemsForCart = cartItems.filter((ci) => ci.cartId === cart.id);

    let subtotal = 0;
    let currency = 'usd';

    const items = itemsForCart.map((ci) => {
      let display = null;
      if (ci.itemType === 'book') {
        const book = books.find((b) => b.id === ci.itemId) || null;
        if (book) {
          display = {
            title: book.title,
            format: book.format,
            coverImageUrl: book.coverImageUrl || null,
            isBundle: false
          };
        }
      } else if (ci.itemType === 'bundle') {
        const bundle = bundles.find((b) => b.id === ci.itemId) || null;
        if (bundle) {
          display = {
            title: bundle.title,
            format: bundle.format,
            coverImageUrl: null,
            isBundle: true
          };
        }
      }

      if (typeof ci.unitPrice === 'number' && typeof ci.quantity === 'number') {
        subtotal += ci.unitPrice * ci.quantity;
        currency = ci.currency || currency;
      }

      return {
        cartItemId: ci.id,
        itemType: ci.itemType,
        itemId: ci.itemId,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        currency: ci.currency || 'usd',
        addedAt: ci.addedAt,
        display
      };
    });

    return {
      cartId: cart.id,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt || null,
      items,
      totals: {
        subtotal,
        currency
      }
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('cart');
    const cart = carts[0] || null;

    const index = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (index === -1) {
      return {
        success: false,
        cart: this.getCart(),
        message: 'Cart item not found'
      };
    }

    const q = typeof quantity === 'number' ? quantity : 1;

    if (q <= 0) {
      cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    } else {
      const item = cartItems[index];
      cartItems[index] = {
        ...item,
        quantity: q
      };
    }

    const now = new Date().toISOString();
    if (cart) {
      const cartIndex = carts.findIndex((c) => c.id === cart.id);
      if (cartIndex !== -1) {
        carts[cartIndex] = {
          ...carts[cartIndex],
          updatedAt: now
        };
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', carts);

    return {
      success: true,
      cart: this.getCart(),
      message: 'Cart item updated'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    let carts = this._getFromStorage('cart');
    const cart = carts[0] || null;

    const before = cartItems.length;
    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);

    const removed = cartItems.length < before;

    const now = new Date().toISOString();
    if (cart) {
      const cartIndex = carts.findIndex((c) => c.id === cart.id);
      if (cartIndex !== -1) {
        carts[cartIndex] = {
          ...carts[cartIndex],
          updatedAt: now
        };
      }
    }

    this._saveToStorage('cart_items', cartItems);
    this._saveToStorage('cart', carts);

    return {
      success: removed,
      cart: this.getCart(),
      message: removed ? 'Cart item removed' : 'Cart item not found'
    };
  }

  // clearCart()
  clearCart() {
    let carts = this._getFromStorage('cart');
    const cart = carts[0] || null;

    if (cart) {
      const now = new Date().toISOString();
      const index = carts.findIndex((c) => c.id === cart.id);
      if (index !== -1) {
        carts[index] = {
          ...carts[index],
          updatedAt: now
        };
      }
      this._saveToStorage('cart', carts);
    }

    this._saveToStorage('cart_items', []);

    return {
      success: true,
      message: 'Cart cleared'
    };
  }

  // getNewsletterOptions()
  getNewsletterOptions() {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');
    const active = subscriptions.find((s) => s.isActive);

    const availableFrequencies = [
      {
        value: 'immediate',
        label: 'Immediate',
        description: 'Get updates as soon as they are published.'
      },
      {
        value: 'weekly',
        label: 'Weekly',
        description: 'A weekly roundup of news and posts.'
      },
      {
        value: 'monthly',
        label: 'Monthly',
        description: 'A monthly digest of highlights.'
      },
      {
        value: 'quarterly',
        label: 'Quarterly',
        description: 'Seasonal updates only.'
      }
    ];

    const genreCodes = [
      'fantasy',
      'science_fiction',
      'romance',
      'mystery',
      'non_fiction',
      'writing_tips'
    ];

    const genres = genreCodes.map((code) => ({
      code,
      name: code
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ')
    }));

    const defaults = {
      updateFrequency: active ? active.updateFrequency : 'monthly',
      includeBlogUpdates:
        typeof (active && active.includeBlogUpdates) === 'boolean'
          ? active.includeBlogUpdates
          : true
    };

    return {
      availableFrequencies,
      genres,
      defaults
    };
  }

  // subscribeToNewsletter(name, email, updateFrequency, preferredGenres, includeBlogUpdates)
  subscribeToNewsletter(name, email, updateFrequency, preferredGenres, includeBlogUpdates) {
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim();
    if (!trimmedName || !trimmedEmail || !updateFrequency) {
      return {
        success: false,
        subscription: null,
        message: 'Name, email, and update frequency are required'
      };
    }

    let subscriptions = this._getFromStorage('newsletter_subscriptions');

    // Deactivate existing active subscriptions for this email
    subscriptions = subscriptions.map((s) => {
      if (s.email === trimmedEmail && s.isActive) {
        return { ...s, isActive: false };
      }
      return s;
    });

    const now = new Date().toISOString();
    const sub = {
      id: this._generateId('nl_sub'),
      name: trimmedName,
      email: trimmedEmail,
      updateFrequency,
      preferredGenres: Array.isArray(preferredGenres) ? preferredGenres : [],
      includeBlogUpdates:
        typeof includeBlogUpdates === 'boolean' ? includeBlogUpdates : true,
      subscribedAt: now,
      isActive: true
    };

    subscriptions.push(sub);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription: {
        id: sub.id,
        name: sub.name,
        email: sub.email,
        updateFrequency: sub.updateFrequency,
        preferredGenres: sub.preferredGenres,
        includeBlogUpdates: sub.includeBlogUpdates,
        subscribedAt: sub.subscribedAt,
        isActive: sub.isActive
      },
      message: 'Subscribed to newsletter'
    };
  }

  // getAboutContent()
  getAboutContent() {
    const raw = this._getRawFromStorage('about_content', {});
    const obj = raw && typeof raw === 'object' ? raw : {};

    return {
      authorBioHtml: obj.authorBioHtml || '',
      websitePurposeHtml: obj.websitePurposeHtml || '',
      contactEmail: obj.contactEmail || '',
      socialLinks: Array.isArray(obj.socialLinks)
        ? obj.socialLinks.map((s) => ({
            label: s.label || '',
            url: s.url || ''
          }))
        : [],
      legalSections: Array.isArray(obj.legalSections)
        ? obj.legalSections.map((ls) => ({
            id: ls.id || '',
            title: ls.title || '',
            contentHtml: ls.contentHtml || ''
          }))
        : []
    };
  }

  // submitContactMessage(name, email, subject, message)
  submitContactMessage(name, email, subject, message) {
    const trimmedName = (name || '').trim();
    const trimmedEmail = (email || '').trim();
    const trimmedSubject = (subject || '').trim();
    const trimmedMessage = (message || '').trim();

    if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      return {
        success: false,
        ticketId: null,
        message: 'All fields are required'
      };
    }

    let messages = this._getFromStorage('contact_messages');
    const now = new Date().toISOString();

    const ticketId = this._generateId('contact');
    const record = {
      id: ticketId,
      name: trimmedName,
      email: trimmedEmail,
      subject: trimmedSubject,
      message: trimmedMessage,
      createdAt: now
    };

    messages.push(record);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      ticketId,
      message: 'Message submitted'
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
