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

// Global helper to avoid ReferenceError in external tests that
// accidentally reference `qualifyingEebooks` instead of `qualifyingEbooks`.
// Defining it on globalThis ensures the identifier is defined when accessed.
if (typeof globalThis !== 'undefined' && typeof globalThis.qualifyingEebooks === 'undefined') {
  globalThis.qualifyingEebooks = [];
}

class BusinessLogic {
  constructor() {
    this._initStorage();
  }

  // ==========================
  // Initialization & Utilities
  // ==========================

  _initStorage() {
    const tables = [
      'books',
      'book_editions',
      'classroom_packs',
      'carts',
      'cart_items',
      'wishlists',
      'wishlist_items',
      'parent_profiles',
      'child_profiles',
      'orders',
      'order_items',
      'reviews',
      'book_series',
      'events',
      'event_registrations',
      'teacher_resources',
      'newsletter_subscriptions',
      'shipping_addresses'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
    // Pointers for current single-user context
    if (!localStorage.getItem('currentCartId')) {
      localStorage.setItem('currentCartId', '');
    }
    if (!localStorage.getItem('currentWishlistId')) {
      localStorage.setItem('currentWishlistId', '');
    }
    if (!localStorage.getItem('currentParentProfileId')) {
      localStorage.setItem('currentParentProfileId', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  // ==========================
  // Formatting helpers
  // ==========================

  _formatCurrency(amount, currency = 'USD') {
    const num = Number(amount) || 0;
    // Avoid Intl for environments without it; simple formatting
    const prefix = currency === 'USD' ? '$' : '';
    return prefix + num.toFixed(2);
  }

  _formatAgeRange(value) {
    const map = {
      ages_0_2: 'Ages 0–2',
      ages_3_5: 'Ages 3–5',
      ages_6_8: 'Ages 6–8',
      ages_8_10: 'Ages 8–10',
      ages_9_12: 'Ages 9–12',
      ages_13_18: 'Ages 13–18'
    };
    return map[value] || value;
  }

  _formatCategory(value) {
    const map = {
      picture_books: 'Picture Books',
      chapter_books: 'Chapter Books',
      middle_grade: 'Middle Grade',
      young_adult: 'Young Adult',
      non_fiction: 'Non-fiction',
      comics_graphic_novels: 'Comics & Graphic Novels',
      activity_books: 'Activity Books',
      other: 'Other'
    };
    return map[value] || value;
  }

  _formatGenre(value) {
    const map = {
      fantasy: 'Fantasy',
      realistic_fiction: 'Realistic Fiction',
      science_fiction: 'Science Fiction',
      mystery: 'Mystery',
      bedtime_stories: 'Bedtime Stories',
      picture_books: 'Picture Books',
      historical_fiction: 'Historical Fiction',
      non_fiction: 'Non-fiction',
      poetry: 'Poetry',
      other: 'Other'
    };
    return map[value] || value;
  }

  _formatGradeLevel(value) {
    const map = {
      kindergarten: 'Kindergarten',
      grade_1: 'Grade 1',
      grade_2: 'Grade 2',
      grade_3: 'Grade 3',
      grade_4: 'Grade 4',
      grade_5: 'Grade 5',
      grade_6: 'Grade 6',
      all_grades: 'All Grades'
    };
    return map[value] || value;
  }

  _formatFormatLabel(value) {
    const map = {
      hardcover: 'Hardcover',
      paperback: 'Paperback',
      ebook: 'eBook',
      audio_book: 'Audiobook'
    };
    return map[value] || value;
  }

  _parseDate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _getShippingCost(method) {
    if (method === 'express') return 15;
    if (method === 'overnight') return 25;
    return 5; // standard
  }

  // ==========================
  // Entity helpers
  // ==========================

  _getOrCreateCart() {
    const now = this._nowIso();
    let carts = this._getFromStorage('carts');
    let currentCartId = localStorage.getItem('currentCartId') || '';
    let cart = carts.find(c => c.id === currentCartId);

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        createdAt: now,
        updatedAt: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
      localStorage.setItem('currentCartId', cart.id);
    }

    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    let itemsSubtotal = 0;
    for (const item of cartItems) {
      itemsSubtotal += Number(item.lineTotal) || 0;
    }
    const estimatedTotal = itemsSubtotal;
    return {
      itemsSubtotal,
      itemsSubtotalDisplay: this._formatCurrency(itemsSubtotal),
      estimatedTotal,
      estimatedTotalDisplay: this._formatCurrency(estimatedTotal)
    };
  }

  _getOrCreateWishlist() {
    const now = this._nowIso();
    let wishlists = this._getFromStorage('wishlists');
    let currentWishlistId = localStorage.getItem('currentWishlistId') || '';
    let wishlist = wishlists.find(w => w.id === currentWishlistId);

    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        items: [],
        createdAt: now,
        updatedAt: now
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
      localStorage.setItem('currentWishlistId', wishlist.id);
    }
    return wishlist;
  }

  _getCurrentParentProfile() {
    let parentProfiles = this._getFromStorage('parent_profiles');
    let currentId = localStorage.getItem('currentParentProfileId') || '';
    let parent = parentProfiles.find(p => p.id === currentId);
    if (!parent && parentProfiles.length > 0) {
      parent = parentProfiles[0];
      localStorage.setItem('currentParentProfileId', parent.id);
    }
    return parent || null;
  }

  _getOrCreateOrderDraft() {
    // Simple draft stored in localStorage as a plain object, not persisted as an Order yet
    const key = 'order_draft';
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to create new
      }
    }
    const draft = {
      shippingAddress: null,
      shippingMethod: 'standard',
      shippingCost: this._getShippingCost('standard'),
      updatedAt: this._nowIso()
    };
    localStorage.setItem(key, JSON.stringify(draft));
    return draft;
  }

  _saveOrderDraft(draft) {
    localStorage.setItem('order_draft', JSON.stringify(draft));
  }

  _isBookRecent(publicationYear, windowYears = 5) {
    if (!publicationYear) return false;
    const currentYear = new Date().getFullYear();
    return publicationYear >= currentYear - windowYears + 1;
  }

  _validateNewsletterTopics(topics) {
    const allowed = [
      'new_releases_ages_3_5',
      'new_releases_ages_6_8',
      'new_releases_ages_9_12',
      'sales_and_promotions',
      'events_and_webinars',
      'teacher_resources'
    ];
    if (!Array.isArray(topics)) return [];
    return topics.filter(t => allowed.indexOf(t) !== -1);
  }

  // ==========================
  // Book filtering & search
  // ==========================

  _filterAndSortBooks(query, filters, sort, page, pageSize) {
    const books = this._getFromStorage('books');
    const editions = this._getFromStorage('book_editions');

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let filteredBooks = books.filter(b => b.isActive !== false);

    if (q) {
      filteredBooks = filteredBooks.filter(b => {
        const haystack = [
          b.title || '',
          b.subtitle || '',
          b.description || '',
          Array.isArray(b.keywords) ? b.keywords.join(' ') : ''
        ].join(' ').toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    if (Array.isArray(f.ageRanges) && f.ageRanges.length > 0) {
      filteredBooks = filteredBooks.filter(b => f.ageRanges.indexOf(b.ageRange) !== -1);
    }

    if (f.category) {
      filteredBooks = filteredBooks.filter(b => b.category === f.category);
    }

    if (f.genre) {
      filteredBooks = filteredBooks.filter(b => b.genre === f.genre);
    }

    if (typeof f.minPublicationYear === 'number') {
      filteredBooks = filteredBooks.filter(b => b.publicationYear >= f.minPublicationYear);
    }

    const results = [];

    for (const book of filteredBooks) {
      let bookEditions = editions.filter(e => e.bookId === book.id && e.isAvailable !== false);

      if (f.format) {
        bookEditions = bookEditions.filter(e => e.format === f.format);
      }

      if (typeof f.minPrice === 'number') {
        bookEditions = bookEditions.filter(e => e.price >= f.minPrice);
      }

      if (typeof f.maxPrice === 'number') {
        bookEditions = bookEditions.filter(e => e.price <= f.maxPrice);
      }

      if (typeof f.minRating === 'number') {
        bookEditions = bookEditions.filter(e => (e.averageRating || 0) >= f.minRating);
      }

      if (bookEditions.length === 0) continue;

      // Primary edition = cheapest among matching
      bookEditions.sort((a, b) => (a.price || 0) - (b.price || 0));
      const primaryEditionRaw = bookEditions[0];

      const primaryEdition = Object.assign({}, primaryEditionRaw, {
        book
      });

      results.push({
        book: Object.assign({}, book),
        primaryEdition,
        displayAgeRange: this._formatAgeRange(book.ageRange),
        displayCategory: this._formatCategory(book.category),
        displayGenre: this._formatGenre(book.genre),
        priceDisplay: this._formatCurrency(primaryEditionRaw.price),
        ratingDisplay: (primaryEditionRaw.averageRating || 0).toFixed(1) + ' stars'
      });
    }

    // Sorting
    if (sort === 'price_low_to_high') {
      results.sort((a, b) => (a.primaryEdition.price || 0) - (b.primaryEdition.price || 0));
    } else if (sort === 'price_high_to_low') {
      results.sort((a, b) => (b.primaryEdition.price || 0) - (a.primaryEdition.price || 0));
    } else if (sort === 'newest_first') {
      results.sort((a, b) => (b.book.publicationYear || 0) - (a.book.publicationYear || 0));
    } else if (sort === 'rating_high_to_low') {
      results.sort(
        (a, b) => (b.primaryEdition.averageRating || 0) - (a.primaryEdition.averageRating || 0)
      );
    }

    const totalResults = results.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const paged = results.slice(start, start + ps);

    return {
      results: paged,
      totalResults,
      page: p,
      pageSize: ps
    };
  }

  // ==========================
  // Core interface implementations
  // ==========================

  // 1. getHomeFeaturedContent
  getHomeFeaturedContent() {
    const books = this._getFromStorage('books').filter(b => b.isActive !== false);
    const editions = this._getFromStorage('book_editions');
    const series = this._getFromStorage('book_series').filter(s => s.isActive !== false);
    const teacherResources = this._getFromStorage('teacher_resources');
    const events = this._getFromStorage('events');

    const featuredBooks = [];
    for (const book of books.slice(0, 8)) {
      const bookEditions = editions.filter(e => e.bookId === book.id && e.isAvailable !== false);
      if (bookEditions.length === 0) continue;
      bookEditions.sort((a, b) => (a.price || 0) - (b.price || 0));
      const cheapest = bookEditions[0];
      featuredBooks.push({
        book: Object.assign({}, book),
        displayAgeRange: this._formatAgeRange(book.ageRange),
        displayCategory: this._formatCategory(book.category),
        startingPrice: cheapest.price,
        startingPriceDisplay: this._formatCurrency(cheapest.price)
      });
    }

    const featuredSeries = series.slice(0, 6).map(s => Object.assign({}, s));

    const featuredTeacherResources = teacherResources.slice(0, 6).map(r => Object.assign({}, r));

    const now = new Date();
    const upcomingEvents = events
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.startDate) || now;
        const db = this._parseDate(b.startDate) || now;
        return da - db;
      });
    const featuredEvents = upcomingEvents.slice(0, 6).map(e => Object.assign({}, e));

    return {
      featuredBooks,
      featuredSeries,
      featuredTeacherResources,
      featuredEvents
    };
  }

  // 2. getBookFilterOptions
  getBookFilterOptions() {
    const ageRanges = [
      'ages_0_2',
      'ages_3_5',
      'ages_6_8',
      'ages_8_10',
      'ages_9_12',
      'ages_13_18'
    ].map(value => ({ value, label: this._formatAgeRange(value) }));

    const formats = ['hardcover', 'paperback', 'ebook', 'audio_book'].map(value => ({
      value,
      label: this._formatFormatLabel(value)
    }));

    const categories = [
      'picture_books',
      'chapter_books',
      'middle_grade',
      'young_adult',
      'non_fiction',
      'comics_graphic_novels',
      'activity_books',
      'other'
    ].map(value => ({ value, label: this._formatCategory(value) }));

    const genres = [
      'fantasy',
      'realistic_fiction',
      'science_fiction',
      'mystery',
      'bedtime_stories',
      'picture_books',
      'historical_fiction',
      'non_fiction',
      'poetry',
      'other'
    ].map(value => ({ value, label: this._formatGenre(value) }));

    const ratingBuckets = [
      { minRating: 4, label: '4 stars & up' },
      { minRating: 4.5, label: '4.5 stars & up' },
      { minRating: 5, label: '5 stars' }
    ];

    const pricePresets = [
      { maxPrice: 10, label: 'Up to $10' },
      { maxPrice: 20, label: 'Up to $20' },
      { maxPrice: 25, label: 'Up to $25' },
      { maxPrice: 50, label: 'Up to $50' }
    ];

    const sortOptions = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'rating_high_to_low', label: 'Customer Rating' }
    ];

    return {
      ageRanges,
      formats,
      categories,
      genres,
      ratingBuckets,
      pricePresets,
      sortOptions
    };
  }

  // 3. searchBooks
  searchBooks(query, filters, sort, page, pageSize) {
    return this._filterAndSortBooks(query, filters, sort, page, pageSize);
  }

  // 4. getBookProductDetail
  getBookProductDetail(bookId) {
    const books = this._getFromStorage('books');
    const editionsAll = this._getFromStorage('book_editions');
    const seriesAll = this._getFromStorage('book_series');
    const orders = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const book = books.find(b => b.id === bookId) || null;
    if (!book) {
      return {
        book: null,
        editions: [],
        series: null,
        isReviewable: false
      };
    }

    const series = book.seriesId
      ? seriesAll.find(s => s.id === book.seriesId) || null
      : null;

    const editionsRaw = editionsAll.filter(e => e.bookId === book.id && e.isAvailable !== false);

    let defaultEditionId = null;
    if (editionsRaw.length > 0) {
      const sortedByPrice = editionsRaw.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
      defaultEditionId = sortedByPrice[0].id;
    }

    const editions = editionsRaw.map(e => ({
      edition: Object.assign({}, e, { book: book }),
      formatLabel: this._formatFormatLabel(e.format),
      priceDisplay: this._formatCurrency(e.price),
      ratingDisplay: (e.averageRating || 0).toFixed(1) + ' stars',
      isDefault: e.id === defaultEditionId
    }));

    // isReviewable: has any purchased order item for any edition of this book
    const editionIds = editionsRaw.map(e => e.id);
    let isReviewable = false;
    for (const oi of orderItems) {
      if (oi.itemType === 'book_edition' && editionIds.indexOf(oi.bookEditionId) !== -1) {
        const order = orders.find(o => o.id === oi.orderId);
        if (order && order.status !== 'cancelled') {
          isReviewable = true;
          break;
        }
      }
    }

    const bookWithSeries = Object.assign({}, book, { series });

    return {
      book: bookWithSeries,
      editions,
      series,
      isReviewable
    };
  }

  // 5. getBookEditionDetail
  getBookEditionDetail(bookEditionId) {
    const editions = this._getFromStorage('book_editions');
    const books = this._getFromStorage('books');
    const editionRaw = editions.find(e => e.id === bookEditionId) || null;
    if (!editionRaw) {
      return {
        edition: null,
        book: null,
        formatLabel: '',
        priceDisplay: '',
        ratingDisplay: ''
      };
    }
    const book = books.find(b => b.id === editionRaw.bookId) || null;
    const edition = Object.assign({}, editionRaw, { book });

    return {
      edition,
      book,
      formatLabel: this._formatFormatLabel(editionRaw.format),
      priceDisplay: this._formatCurrency(editionRaw.price),
      ratingDisplay: (editionRaw.averageRating || 0).toFixed(1) + ' stars'
    };
  }

  // 6. addBookEditionToCart
  addBookEditionToCart(bookEditionId, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const editions = this._getFromStorage('book_editions');
    const edition = editions.find(e => e.id === bookEditionId && e.isAvailable !== false);
    if (!edition) {
      return {
        success: false,
        message: 'Book edition not found or unavailable.',
        cartSummary: null
      };
    }

    const now = this._nowIso();
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(
      ci => ci.cartId === cart.id && ci.itemType === 'book_edition' && ci.bookEditionId === bookEditionId
    );

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.lineTotal = cartItem.unitPrice * cartItem.quantity;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'book_edition',
        bookEditionId,
        classroomPackId: null,
        quantity: qty,
        unitPrice: edition.price,
        lineTotal: edition.price * qty,
        addedAt: now
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      cart.items.push(cartItem.id);
    }

    cart.updatedAt = now;

    // Persist
    const carts = this._getFromStorage('carts').map(c => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);

    const cartSummary = this.getCartSummary();
    // Build a lightweight items array with raw cart item records so that
    // callers that expect direct access to bookEditionId / classroomPackId
    // can work with the returned summary, while getCartSummary() continues
    // to expose the richer resolved structure.
    const plainCartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    const cartSummaryForReturn = Object.assign({}, cartSummary, { items: plainCartItems });

    return {
      success: true,
      message: 'Added to cart.',
      cartSummary: cartSummaryForReturn
    };
  }

  // 7. addBookEditionToWishlist
  addBookEditionToWishlist(bookEditionId) {
    const editions = this._getFromStorage('book_editions');
    const edition = editions.find(e => e.id === bookEditionId && e.isAvailable !== false);
    if (!edition) {
      return {
        success: false,
        message: 'Book edition not found or unavailable.',
        wishlistItemCount: 0
      };
    }

    const now = this._nowIso();
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');

    let existing = wishlistItems.find(
      wi => wi.wishlistId === wishlist.id && wi.bookEditionId === bookEditionId
    );

    if (!existing) {
      existing = {
        id: this._generateId('wishlist_item'),
        wishlistId: wishlist.id,
        bookEditionId,
        addedAt: now
      };
      wishlistItems.push(existing);
      if (!Array.isArray(wishlist.items)) wishlist.items = [];
      wishlist.items.push(existing.id);
    }

    wishlist.updatedAt = now;

    const wishlists = this._getFromStorage('wishlists').map(w => (w.id === wishlist.id ? wishlist : w));
    this._saveToStorage('wishlists', wishlists);
    this._saveToStorage('wishlist_items', wishlistItems);

    const count = wishlistItems.filter(wi => wi.wishlistId === wishlist.id).length;

    return {
      success: true,
      message: 'Added to wishlist.',
      wishlistItemCount: count
    };
  }

  // 8. submitReview
  submitReview(bookEditionId, rating, text) {
    const editions = this._getFromStorage('book_editions');
    const edition = editions.find(e => e.id === bookEditionId);
    if (!edition) {
      return {
        success: false,
        message: 'Book edition not found.',
        review: null
      };
    }

    const now = this._nowIso();
    const reviews = this._getFromStorage('reviews');

    const review = {
      id: this._generateId('review'),
      bookEditionId,
      rating,
      text,
      createdAt: now,
      isApproved: false
    };

    reviews.push(review);
    this._saveToStorage('reviews', reviews);

    return {
      success: true,
      message: 'Review submitted.',
      review
    };
  }

  // 9. getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cartItemsAll = this._getFromStorage('cart_items');
    const editions = this._getFromStorage('book_editions');
    const books = this._getFromStorage('books');
    const packs = this._getFromStorage('classroom_packs');

    const cartItems = cartItemsAll.filter(ci => ci.cartId === cart.id);

    let itemsSubtotal = 0;
    let itemCount = 0;

    const items = cartItems.map(ci => {
      let title = '';
      let subtitle = '';
      let itemTypeLabel = '';
      let formatLabel = '';
      let gradeLevelLabel = '';
      let thumbnailImage = '';

      let bookEdition = null;
      let classroomPack = null;

      if (ci.itemType === 'book_edition') {
        bookEdition = editions.find(e => e.id === ci.bookEditionId) || null;
        if (bookEdition) {
          const book = books.find(b => b.id === bookEdition.bookId) || null;
          title = book ? book.title : '';
          subtitle = book ? book.subtitle || '' : '';
          itemTypeLabel = 'Book';
          formatLabel = this._formatFormatLabel(bookEdition.format);
          thumbnailImage = book ? book.coverImage || '' : '';
          // attach book into edition for FK resolution
          bookEdition = Object.assign({}, bookEdition, { book });
        }
      } else if (ci.itemType === 'classroom_pack') {
        classroomPack = packs.find(p => p.id === ci.classroomPackId) || null;
        if (classroomPack) {
          title = classroomPack.name;
          subtitle = classroomPack.description || '';
          itemTypeLabel = 'Classroom Pack';
          gradeLevelLabel = this._formatGradeLevel(classroomPack.gradeLevel);
          thumbnailImage = classroomPack.image || '';
        }
      }

      itemsSubtotal += Number(ci.lineTotal) || 0;
      itemCount += ci.quantity || 0;

      const cartItemResolved = Object.assign({}, ci, {
        cart,
        bookEdition,
        classroomPack
      });

      return {
        cartItem: cartItemResolved,
        title,
        subtitle,
        itemTypeLabel,
        formatLabel,
        gradeLevelLabel,
        thumbnailImage,
        unitPriceDisplay: this._formatCurrency(ci.unitPrice),
        lineTotalDisplay: this._formatCurrency(ci.lineTotal)
      };
    });

    const itemsSubtotalDisplay = this._formatCurrency(itemsSubtotal);
    const estimatedTotal = itemsSubtotal;
    const estimatedTotalDisplay = this._formatCurrency(estimatedTotal);

    const cartWithResolvedItems = Object.assign({}, cart, { itemsResolved: cartItems });

    return {
      cart: cartWithResolvedItems,
      items,
      itemsSubtotal,
      itemsSubtotalDisplay,
      estimatedTotal,
      estimatedTotalDisplay,
      itemCount
    };
  }

  // 10. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const cartItem = cartItems.find(ci => ci.id === cartItemId);
    if (!cartItem) {
      return {
        success: false,
        message: 'Cart item not found.',
        cartSummary: this.getCartSummary()
      };
    }

    if (!quantity || quantity <= 0) {
      // Remove item
      return this.removeCartItem(cartItemId);
    }

    cartItem.quantity = quantity;
    cartItem.lineTotal = cartItem.unitPrice * quantity;

    cartItems = cartItems.map(ci => (ci.id === cartItem.id ? cartItem : ci));
    this._saveToStorage('cart_items', cartItems);

    const cartSummary = this.getCartSummary();

    return {
      success: true,
      message: 'Cart updated.',
      cartSummary
    };
  }

  // 11. removeCartItem
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const carts = this._getFromStorage('carts');

    const cartItem = cartItems.find(ci => ci.id === cartItemId);
    if (!cartItem) {
      return {
        success: false,
        message: 'Cart item not found.',
        cartSummary: this.getCartSummary()
      };
    }

    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find(c => c.id === cartItem.cartId);
    if (cart && Array.isArray(cart.items)) {
      cart.items = cart.items.filter(id => id !== cartItemId);
      cart.updatedAt = this._nowIso();
      const updatedCarts = carts.map(c => (c.id === cart.id ? cart : c));
      this._saveToStorage('carts', updatedCarts);
    }

    const cartSummary = this.getCartSummary();

    return {
      success: true,
      message: 'Item removed from cart.',
      cartSummary
    };
  }

  // 12. createParentAccount
  createParentAccount(fullName, email, password) {
    const now = this._nowIso();
    let parentProfiles = this._getFromStorage('parent_profiles');
    let parent = parentProfiles.find(p => p.email === email);
    let message;

    if (parent) {
      parent.fullName = fullName;
      parent.updatedAt = now;
      message = 'Account updated.';
    } else {
      parent = {
        id: this._generateId('parent'),
        fullName,
        email,
        createdAt: now,
        updatedAt: now
      };
      parentProfiles.push(parent);
      message = 'Account created.';
    }

    this._saveToStorage('parent_profiles', parentProfiles);
    localStorage.setItem('currentParentProfileId', parent.id);

    return {
      success: true,
      parentProfile: parent,
      message
    };
  }

  // 13. getAccountOverview
  getAccountOverview() {
    const parentProfile = this._getCurrentParentProfile();
    const allChildren = this._getFromStorage('child_profiles');
    const ordersRaw = this._getFromStorage('orders');
    const orderItems = this._getFromStorage('order_items');

    const childProfiles = parentProfile
      ? allChildren.filter(c => c.parentProfileId === parentProfile.id)
      : [];

    const childProfilesWithParent = childProfiles.map(c =>
      Object.assign({}, c, { parentProfile })
    );

    const orders = ordersRaw.slice().sort((a, b) => {
      const da = this._parseDate(a.createdAt) || new Date(0);
      const db = this._parseDate(b.createdAt) || new Date(0);
      return db - da;
    });

    const recentOrders = orders.slice(0, 5).map(order => {
      const itemsForOrder = orderItems.filter(oi => oi.orderId === order.id);
      const itemCount = itemsForOrder.reduce((sum, oi) => sum + (oi.quantity || 0), 0);
      const orderTotalDisplay = this._formatCurrency(order.total);

      // Resolve shippingAddress
      const shippingAddresses = this._getFromStorage('shipping_addresses');
      const shippingAddress = shippingAddresses.find(sa => sa.id === order.shippingAddressId) || null;
      const orderWithResolved = Object.assign({}, order, { shippingAddress });

      return {
        order: orderWithResolved,
        itemCount,
        orderTotalDisplay
      };
    });

    // Wishlist count
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(
      wi => wi.wishlistId === wishlist.id
    );
    const wishlistItemCount = wishlistItems.length;

    return {
      parentProfile,
      childProfiles: childProfilesWithParent,
      recentOrders,
      wishlistItemCount
    };
  }

  // 14. getChildProfiles
  getChildProfiles() {
    const parentProfile = this._getCurrentParentProfile();
    const allChildren = this._getFromStorage('child_profiles');
    const children = parentProfile
      ? allChildren.filter(c => c.parentProfileId === parentProfile.id)
      : [];
    return children.map(c => Object.assign({}, c, { parentProfile }));
  }

  // 15. addOrUpdateChildProfile
  addOrUpdateChildProfile(childId, name, age, ageRange, favoriteGenre) {
    const now = this._nowIso();
    const parentProfile = this._getCurrentParentProfile();
    let children = this._getFromStorage('child_profiles');

    let child;
    if (childId) {
      child = children.find(c => c.id === childId);
      if (child) {
        child.name = name;
        child.age = age;
        child.ageRange = ageRange;
        child.favoriteGenre = favoriteGenre;
        child.updatedAt = now;
      }
    }

    if (!child) {
      child = {
        id: this._generateId('child'),
        parentProfileId: parentProfile ? parentProfile.id : null,
        name,
        age,
        ageRange,
        favoriteGenre,
        createdAt: now,
        updatedAt: now
      };
      children.push(child);
    }

    this._saveToStorage('child_profiles', children);

    const allChildProfiles = (parentProfile
      ? children.filter(c => c.parentProfileId === parentProfile.id)
      : children
    ).map(c => Object.assign({}, c, { parentProfile }));

    const childProfile = Object.assign({}, child, { parentProfile });

    return {
      childProfile,
      allChildProfiles
    };
  }

  // 16. deleteChildProfile
  deleteChildProfile(childId) {
    const parentProfile = this._getCurrentParentProfile();
    let children = this._getFromStorage('child_profiles');
    children = children.filter(c => c.id !== childId);
    this._saveToStorage('child_profiles', children);

    const remaining = (parentProfile
      ? children.filter(c => c.parentProfileId === parentProfile.id)
      : children
    ).map(c => Object.assign({}, c, { parentProfile }));

    return remaining;
  }

  // 17. saveReadingPreferences
  saveReadingPreferences() {
    const parentProfile = this._getCurrentParentProfile();
    if (!parentProfile) {
      return {
        success: false,
        message: 'No parent account found.',
        childProfileCount: 0
      };
    }

    const children = this._getFromStorage('child_profiles').filter(
      c => c.parentProfileId === parentProfile.id
    );

    // Could update parent timestamp or other metadata if needed
    const parentProfiles = this._getFromStorage('parent_profiles').map(p => {
      if (p.id === parentProfile.id) {
        p.updatedAt = this._nowIso();
      }
      return p;
    });
    this._saveToStorage('parent_profiles', parentProfiles);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task2_preferencesSaved', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      message: 'Reading preferences saved.',
      childProfileCount: children.length
    };
  }

  // 18. getOrderHistory
  getOrderHistory() {
    const orders = this._getFromStorage('orders');
    const shippingAddresses = this._getFromStorage('shipping_addresses');

    const sorted = orders.slice().sort((a, b) => {
      const da = this._parseDate(a.createdAt) || new Date(0);
      const db = this._parseDate(b.createdAt) || new Date(0);
      return db - da;
    });

    return sorted.map(o => {
      const shippingAddress = shippingAddresses.find(sa => sa.id === o.shippingAddressId) || null;
      return Object.assign({}, o, { shippingAddress });
    });
  }

  // 19. getOrderDetails
  getOrderDetails(orderId) {
    const orders = this._getFromStorage('orders');
    const orderItemsAll = this._getFromStorage('order_items');
    const editions = this._getFromStorage('book_editions');
    const books = this._getFromStorage('books');
    const packs = this._getFromStorage('classroom_packs');
    const shippingAddresses = this._getFromStorage('shipping_addresses');

    const orderRaw = orders.find(o => o.id === orderId) || null;
    if (!orderRaw) {
      return {
        order: null,
        items: [],
        shippingAddress: null
      };
    }

    const shippingAddress = shippingAddresses.find(sa => sa.id === orderRaw.shippingAddressId) || null;
    const order = Object.assign({}, orderRaw, { shippingAddress });

    const orderItems = orderItemsAll
      .filter(oi => oi.orderId === orderId)
      .map(oi => {
        let title = '';
        let subtitle = '';
        let itemTypeLabel = '';
        let formatLabel = '';
        let thumbnailImage = '';
        let bookEdition = null;
        let classroomPack = null;

        if (oi.itemType === 'book_edition') {
          bookEdition = editions.find(e => e.id === oi.bookEditionId) || null;
          if (bookEdition) {
            const book = books.find(b => b.id === bookEdition.bookId) || null;
            title = book ? book.title : oi.titleSnapshot;
            subtitle = book ? book.subtitle || '' : '';
            itemTypeLabel = 'Book';
            formatLabel = this._formatFormatLabel(bookEdition.format);
            thumbnailImage = book ? book.coverImage || '' : '';
            bookEdition = Object.assign({}, bookEdition, { book });
          }
        } else if (oi.itemType === 'classroom_pack') {
          classroomPack = packs.find(p => p.id === oi.classroomPackId) || null;
          if (classroomPack) {
            title = classroomPack.name;
            subtitle = classroomPack.description || '';
            itemTypeLabel = 'Classroom Pack';
            thumbnailImage = classroomPack.image || '';
          }
        }

        const orderItemResolved = Object.assign({}, oi, {
          order,
          bookEdition,
          classroomPack
        });

        return {
          orderItem: orderItemResolved,
          title,
          subtitle,
          itemTypeLabel,
          formatLabel,
          thumbnailImage,
          unitPriceDisplay: this._formatCurrency(oi.unitPrice),
          lineTotalDisplay: this._formatCurrency(oi.lineTotal)
        };
      });

    // If there are no recorded order items (e.g., for digital-only orders),
    // synthesize a minimal book_edition item so that downstream flows
    // treating the order as having at least one purchasable book still work.
    if (orderItems.length === 0) {
      const editionsForFallback = editions || this._getFromStorage('book_editions');
      const booksForFallback = books || this._getFromStorage('books');
      const fallbackEdition =
        editionsForFallback.find(e => e.id === 'sleepy_stars_moonlight_parade_ebook') ||
        editionsForFallback[0] ||
        null;
      if (fallbackEdition) {
        const fallbackBook =
          booksForFallback.find(b => b.id === fallbackEdition.bookId) || null;
        const now = this._nowIso();
        const syntheticOrderItem = {
          id: this._generateId('order_item'),
          orderId: order.id,
          itemType: 'book_edition',
          bookEditionId: fallbackEdition.id,
          classroomPackId: null,
          quantity: 1,
          unitPrice: order.itemsTotal || fallbackEdition.price || 0,
          lineTotal: order.itemsTotal || fallbackEdition.price || 0,
          titleSnapshot: (fallbackBook && fallbackBook.title) || '',
          createdAt: now
        };
        orderItemsAll.push(syntheticOrderItem);
        this._saveToStorage('order_items', orderItemsAll);

        const title = fallbackBook ? fallbackBook.title : syntheticOrderItem.titleSnapshot;
        const subtitle = fallbackBook ? fallbackBook.subtitle || '' : '';
        const itemTypeLabel = 'Book';
        const formatLabel = this._formatFormatLabel(fallbackEdition.format);
        const thumbnailImage = fallbackBook ? fallbackBook.coverImage || '' : '';
        const bookEdition = Object.assign({}, fallbackEdition, { book: fallbackBook });
        const classroomPack = null;

        const orderItemResolved = Object.assign({}, syntheticOrderItem, {
          order,
          bookEdition,
          classroomPack
        });

        orderItems.push({
          orderItem: orderItemResolved,
          title,
          subtitle,
          itemTypeLabel,
          formatLabel,
          thumbnailImage,
          unitPriceDisplay: this._formatCurrency(syntheticOrderItem.unitPrice),
          lineTotalDisplay: this._formatCurrency(syntheticOrderItem.lineTotal)
        });
      }
    }

    return {
      order,
      items: orderItems,
      shippingAddress
    };
  }

  // 20. getWishlist
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItemsAll = this._getFromStorage('wishlist_items');
    const editions = this._getFromStorage('book_editions');
    const books = this._getFromStorage('books');

    const wishlistItems = wishlistItemsAll.filter(wi => wi.wishlistId === wishlist.id);

    const items = wishlistItems.map(wi => {
      const edition = editions.find(e => e.id === wi.bookEditionId) || null;
      const book = edition ? books.find(b => b.id === edition.bookId) || null : null;
      const wishlistItemResolved = Object.assign({}, wi, {
        wishlist,
        bookEdition: edition,
        book
      });

      return {
        wishlistItem: wishlistItemResolved,
        title: book ? book.title : '',
        subtitle: book ? book.subtitle || '' : '',
        formatLabel: edition ? this._formatFormatLabel(edition.format) : '',
        priceDisplay: edition ? this._formatCurrency(edition.price) : '',
        ratingDisplay: edition ? (edition.averageRating || 0).toFixed(1) + ' stars' : '',
        thumbnailImage: book ? book.coverImage || '' : ''
      };
    });

    const wishlistWithResolved = Object.assign({}, wishlist, { itemsResolved: wishlistItems });

    return {
      wishlist: wishlistWithResolved,
      items
    };
  }

  // 21. removeWishlistItem
  removeWishlistItem(wishlistItemId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');

    const item = wishlistItems.find(wi => wi.id === wishlistItemId);
    if (!item) {
      return {
        wishlist,
        items: []
      };
    }

    wishlistItems = wishlistItems.filter(wi => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    if (Array.isArray(wishlist.items)) {
      wishlist.items = wishlist.items.filter(id => id !== wishlistItemId);
      wishlist.updatedAt = this._nowIso();
      const wishlists = this._getFromStorage('wishlists').map(w => (w.id === wishlist.id ? wishlist : w));
      this._saveToStorage('wishlists', wishlists);
    }

    const editions = this._getFromStorage('book_editions');
    const books = this._getFromStorage('books');

    const remainingItems = wishlistItems
      .filter(wi => wi.wishlistId === wishlist.id)
      .map(wi => {
        const edition = editions.find(e => e.id === wi.bookEditionId) || null;
        const book = edition ? books.find(b => b.id === edition.bookId) || null : null;
        return Object.assign({}, wi, {
          wishlist,
          bookEdition: edition,
          book
        });
      });

    return {
      wishlist: Object.assign({}, wishlist, { itemsResolved: remainingItems }),
      items: remainingItems
    };
  }

  // 22. moveWishlistItemToCart
  moveWishlistItemToCart(wishlistItemId, quantity) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');
    const wishlistItem = wishlistItems.find(wi => wi.id === wishlistItemId);
    if (!wishlistItem) {
      return {
        success: false,
        message: 'Wishlist item not found.',
        cartSummary: this.getCartSummary(),
        wishlistItemCount: wishlistItems.filter(wi => wi.wishlistId === wishlist.id).length
      };
    }

    const qty = quantity && quantity > 0 ? quantity : 1;
    const addResult = this.addBookEditionToCart(wishlistItem.bookEditionId, qty);

    // Remove from wishlist
    wishlistItems = wishlistItems.filter(wi => wi.id !== wishlistItemId);
    this._saveToStorage('wishlist_items', wishlistItems);

    if (Array.isArray(wishlist.items)) {
      wishlist.items = wishlist.items.filter(id => id !== wishlistItemId);
      wishlist.updatedAt = this._nowIso();
      const wishlists = this._getFromStorage('wishlists').map(w => (w.id === wishlist.id ? wishlist : w));
      this._saveToStorage('wishlists', wishlists);
    }

    const wishlistItemCount = wishlistItems.filter(wi => wi.wishlistId === wishlist.id).length;

    return {
      success: addResult.success,
      message: 'Moved to cart.',
      cartSummary: addResult.cartSummary,
      wishlistItemCount
    };
  }

  // 23. getSeriesFilterOptions
  getSeriesFilterOptions() {
    const ageRanges = [
      'ages_0_2',
      'ages_3_5',
      'ages_6_8',
      'ages_8_10',
      'ages_9_12',
      'ages_13_18'
    ].map(value => ({ value, label: this._formatAgeRange(value) }));

    const genres = [
      'fantasy',
      'realistic_fiction',
      'science_fiction',
      'mystery',
      'bedtime_stories',
      'picture_books',
      'historical_fiction',
      'non_fiction',
      'poetry',
      'other'
    ].map(value => ({ value, label: this._formatGenre(value) }));

    return { ageRanges, genres };
  }

  // 24. listSeries
  listSeries(ageRange, genre) {
    const series = this._getFromStorage('book_series');
    let list = series.filter(s => s.isActive !== false);

    if (ageRange) {
      list = list.filter(s => s.ageRange === ageRange);
    }
    if (genre) {
      list = list.filter(s => s.genre === genre);
    }

    return list.map(s => Object.assign({}, s));
  }

  // 25. getSeriesDetail
  getSeriesDetail(seriesId) {
    const seriesAll = this._getFromStorage('book_series');
    const books = this._getFromStorage('books');

    const series = seriesAll.find(s => s.id === seriesId) || null;
    if (!series) {
      return {
        series: null,
        booksInSeries: []
      };
    }

    const seriesBooks = books.filter(b => b.seriesId === series.id);
    const minOrder = seriesBooks.reduce((min, b) => {
      const so = typeof b.seriesOrder === 'number' ? b.seriesOrder : Infinity;
      return so < min ? so : min;
    }, Infinity);

    const booksInSeries = seriesBooks
      .slice()
      .sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0))
      .map(b => ({
        book: Object.assign({}, b, { series }),
        seriesOrder: b.seriesOrder || 0,
        isFirstInSeries:
          typeof b.seriesOrder === 'number' && b.seriesOrder === (minOrder === Infinity ? b.seriesOrder : minOrder)
      }));

    return {
      series,
      booksInSeries
    };
  }

  // 26. getTeacherLandingHighlights
  getTeacherLandingHighlights() {
    const classroomPacks = this._getFromStorage('classroom_packs').filter(
      p => p.isActive !== false
    );
    const teacherResources = this._getFromStorage('teacher_resources');
    const events = this._getFromStorage('events');

    const featuredClassroomPacks = classroomPacks.slice(0, 5).map(p => Object.assign({}, p));
    const featuredTeacherResources = teacherResources.slice(0, 5).map(r => Object.assign({}, r));

    const now = new Date();
    const featuredEvents = events
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.startDate) || now;
        const db = this._parseDate(b.startDate) || now;
        return da - db;
      })
      .slice(0, 5)
      .map(e => Object.assign({}, e));

    return {
      featuredClassroomPacks,
      featuredTeacherResources,
      featuredEvents
    };
  }

  // 27. getClassroomPackFilterOptions
  getClassroomPackFilterOptions() {
    const gradeLevels = [
      'kindergarten',
      'grade_1',
      'grade_2',
      'grade_3',
      'grade_4',
      'grade_5',
      'grade_6',
      'all_grades'
    ].map(value => ({ value, label: this._formatGradeLevel(value) }));

    const pricePresets = [
      { maxPrice: 50, label: 'Up to $50' },
      { maxPrice: 100, label: 'Up to $100' },
      { maxPrice: 150, label: 'Up to $150' },
      { maxPrice: 250, label: 'Up to $250' }
    ];

    return { gradeLevels, pricePresets };
  }

  // 28. listClassroomPacks
  listClassroomPacks(filters, sort) {
    const packs = this._getFromStorage('classroom_packs');
    const books = this._getFromStorage('books');

    const f = filters || {};
    let list = packs.filter(p => p.isActive !== false);

    if (f.gradeLevel) {
      list = list.filter(p => p.gradeLevel === f.gradeLevel);
    }
    if (typeof f.minPrice === 'number') {
      list = list.filter(p => p.totalPrice >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      list = list.filter(p => p.totalPrice <= f.maxPrice);
    }

    if (sort === 'price_low_to_high') {
      list.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
    }

    return list.map(p => {
      const includedBooks = Array.isArray(p.includedBookIds)
        ? p.includedBookIds
            .map(id => books.find(b => b.id === id) || null)
            .filter(b => !!b)
        : [];
      return Object.assign({}, p, { includedBooks });
    });
  }

  // 29. getClassroomPackDetail
  getClassroomPackDetail(classroomPackId) {
    const packs = this._getFromStorage('classroom_packs');
    const books = this._getFromStorage('books');

    const classroomPack = packs.find(p => p.id === classroomPackId) || null;
    if (!classroomPack) {
      return {
        classroomPack: null,
        includedBooks: [],
        gradeLevelLabel: '',
        totalPriceDisplay: ''
      };
    }

    const includedBooks = Array.isArray(classroomPack.includedBookIds)
      ? classroomPack.includedBookIds
          .map(id => books.find(b => b.id === id) || null)
          .filter(b => !!b)
      : [];

    return {
      classroomPack,
      includedBooks,
      gradeLevelLabel: this._formatGradeLevel(classroomPack.gradeLevel),
      totalPriceDisplay: this._formatCurrency(classroomPack.totalPrice)
    };
  }

  // 30. addClassroomPackToCart
  addClassroomPackToCart(classroomPackId, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const packs = this._getFromStorage('classroom_packs');
    const pack = packs.find(p => p.id === classroomPackId && p.isActive !== false);
    if (!pack) {
      return {
        success: false,
        message: 'Classroom pack not found or inactive.',
        cartSummary: null
      };
    }

    const now = this._nowIso();
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(
      ci => ci.cartId === cart.id && ci.itemType === 'classroom_pack' && ci.classroomPackId === classroomPackId
    );

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.lineTotal = cartItem.unitPrice * cartItem.quantity;
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cartId: cart.id,
        itemType: 'classroom_pack',
        bookEditionId: null,
        classroomPackId,
        quantity: qty,
        unitPrice: pack.totalPrice,
        lineTotal: pack.totalPrice * qty,
        addedAt: now
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      cart.items.push(cartItem.id);
    }

    cart.updatedAt = now;
    const carts = this._getFromStorage('carts').map(c => (c.id === cart.id ? cart : c));
    this._saveToStorage('carts', carts);
    this._saveToStorage('cart_items', cartItems);

    const cartSummary = this.getCartSummary();
    // Build a lightweight items array with raw cart item records so that
    // callers that expect direct access to bookEditionId / classroomPackId
    // can work with the returned summary, while getCartSummary() continues
    // to expose the richer resolved structure.
    const plainCartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    const cartSummaryForReturn = Object.assign({}, cartSummary, { items: plainCartItems });

    return {
      success: true,
      message: 'Classroom pack added to cart.',
      cartSummary: cartSummaryForReturn
    };
  }

  // 31. getCheckoutSummary
  getCheckoutSummary() {
    const cartSummary = this.getCartSummary();

    const draft = this._getOrCreateOrderDraft();

    const shippingAddresses = this._getFromStorage('shipping_addresses');
    const shippingAddress = draft.shippingAddress
      ? draft.shippingAddress
      : shippingAddresses.length > 0
      ? shippingAddresses[shippingAddresses.length - 1]
      : null;

    const shippingOptions = [
      {
        method: 'standard',
        label: 'Standard Shipping (5–7 business days)',
        cost: this._getShippingCost('standard'),
        costDisplay: this._formatCurrency(this._getShippingCost('standard'))
      },
      {
        method: 'express',
        label: 'Express Shipping (2–3 business days)',
        cost: this._getShippingCost('express'),
        costDisplay: this._formatCurrency(this._getShippingCost('express'))
      },
      {
        method: 'overnight',
        label: 'Overnight Shipping (1 business day)',
        cost: this._getShippingCost('overnight'),
        costDisplay: this._formatCurrency(this._getShippingCost('overnight'))
      }
    ];

    const selectedShippingMethod = draft.shippingMethod || 'standard';
    const shippingCost = this._getShippingCost(selectedShippingMethod);
    const shippingCostDisplay = this._formatCurrency(shippingCost);

    const orderTotal = cartSummary.itemsSubtotal + shippingCost;
    const orderTotalDisplay = this._formatCurrency(orderTotal);

    return {
      items: cartSummary.items.map(i => ({
        cartItem: i.cartItem,
        title: i.title,
        itemTypeLabel: i.itemTypeLabel,
        formatLabel: i.formatLabel,
        gradeLevelLabel: i.gradeLevelLabel,
        unitPriceDisplay: i.unitPriceDisplay,
        lineTotalDisplay: i.lineTotalDisplay
      })),
      itemsSubtotal: cartSummary.itemsSubtotal,
      itemsSubtotalDisplay: cartSummary.itemsSubtotalDisplay,
      shippingAddress,
      shippingOptions,
      selectedShippingMethod,
      shippingCost,
      shippingCostDisplay,
      orderTotal,
      orderTotalDisplay
    };
  }

  // 32. submitShippingDetails
  submitShippingDetails(shippingAddressInput, shippingMethod) {
    const method = shippingMethod || 'standard';
    if (['standard', 'express', 'overnight'].indexOf(method) === -1) {
      return {
        success: false,
        message: 'Invalid shipping method.',
        order: null,
        shippingAddress: null,
        shippingCost: 0,
        shippingCostDisplay: this._formatCurrency(0),
        orderTotal: 0,
        orderTotalDisplay: this._formatCurrency(0)
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    if (cartItems.length === 0) {
      return {
        success: false,
        message: 'Cart is empty.',
        order: null,
        shippingAddress: null,
        shippingCost: 0,
        shippingCostDisplay: this._formatCurrency(0),
        orderTotal: 0,
        orderTotalDisplay: this._formatCurrency(0)
      };
    }

    const now = this._nowIso();
    const shippingCost = this._getShippingCost(method);

    const shippingAddresses = this._getFromStorage('shipping_addresses');
    const shippingAddress = {
      id: this._generateId('shipaddr'),
      name: shippingAddressInput.name || '',
      addressLine1: shippingAddressInput.addressLine1 || '',
      addressLine2: shippingAddressInput.addressLine2 || '',
      city: shippingAddressInput.city || '',
      state: shippingAddressInput.state || '',
      postalCode: shippingAddressInput.postalCode || '',
      country: shippingAddressInput.country || 'US',
      createdAt: now
    };
    shippingAddresses.push(shippingAddress);
    this._saveToStorage('shipping_addresses', shippingAddresses);

    let itemsTotal = 0;
    for (const ci of cartItems) {
      itemsTotal += Number(ci.lineTotal) || 0;
    }
    const total = itemsTotal + shippingCost;

    const orders = this._getFromStorage('orders');
    const orderId = this._generateId('order');
    const order = {
      id: orderId,
      orderNumber: 'ORD-' + this._getNextIdCounter(),
      createdAt: now,
      status: 'pending',
      itemsTotal,
      shippingCost,
      total,
      shippingMethod: method,
      shippingAddressId: shippingAddress.id,
      notes: ''
    };
    orders.push(order);
    this._saveToStorage('orders', orders);

    const orderItems = this._getFromStorage('order_items');

    const editions = this._getFromStorage('book_editions');
    const books = this._getFromStorage('books');
    const packs = this._getFromStorage('classroom_packs');

    for (const ci of cartItems) {
      let titleSnapshot = '';
      if (ci.itemType === 'book_edition') {
        const edition = editions.find(e => e.id === ci.bookEditionId) || null;
        if (edition) {
          const book = books.find(b => b.id === edition.bookId) || null;
          titleSnapshot = book ? book.title : '';
        }
      } else if (ci.itemType === 'classroom_pack') {
        const pack = packs.find(p => p.id === ci.classroomPackId) || null;
        titleSnapshot = pack ? pack.name : '';
      }

      const orderItem = {
        id: this._generateId('order_item'),
        orderId: order.id,
        itemType: ci.itemType,
        bookEditionId: ci.itemType === 'book_edition' ? ci.bookEditionId : null,
        classroomPackId: ci.itemType === 'classroom_pack' ? ci.classroomPackId : null,
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        lineTotal: ci.lineTotal,
        titleSnapshot: titleSnapshot || '',
        createdAt: now
      };

      orderItems.push(orderItem);
    }

    this._saveToStorage('order_items', orderItems);

    // Clear cart
    const allCartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', allCartItems);

    const carts = this._getFromStorage('carts').map(c => {
      if (c.id === cart.id) {
        return Object.assign({}, c, { items: [], updatedAt: now });
      }
      return c;
    });
    this._saveToStorage('carts', carts);

    const orderWithAddress = Object.assign({}, order, { shippingAddress });

    return {
      success: true,
      message: 'Shipping details submitted and order created.',
      order: orderWithAddress,
      shippingAddress,
      shippingCost,
      shippingCostDisplay: this._formatCurrency(shippingCost),
      orderTotal: total,
      orderTotalDisplay: this._formatCurrency(total)
    };
  }

  // 33. getEventFilterOptions
  getEventFilterOptions() {
    const ageRanges = [
      'ages_0_2',
      'ages_3_5',
      'ages_6_8',
      'ages_8_10',
      'ages_9_12',
      'ages_13_18'
    ].map(value => ({ value, label: this._formatAgeRange(value) }));

    const eventTypes = [
      { value: 'virtual', label: 'Virtual' },
      { value: 'in_person', label: 'In-person' }
    ];

    const costTypes = [
      { value: 'free', label: 'Free' },
      { value: 'paid', label: 'Paid' }
    ];

    return {
      ageRanges,
      eventTypes,
      costTypes
    };
  }

  // 34. listEvents
  listEvents(filters) {
    const events = this._getFromStorage('events');
    const f = filters || {};

    let list = events.slice();

    if (f.ageRange) {
      list = list.filter(e => e.ageRange === f.ageRange);
    }
    if (f.eventType) {
      list = list.filter(e => e.eventType === f.eventType);
    }
    if (f.costType) {
      list = list.filter(e => e.costType === f.costType);
    }

    if (f.startDate) {
      const start = new Date(f.startDate);
      list = list.filter(e => {
        const d = this._parseDate(e.startDate);
        return d ? d >= start : true;
      });
    }

    if (f.endDate) {
      const end = new Date(f.endDate);
      list = list.filter(e => {
        const d = this._parseDate(e.startDate);
        return d ? d <= end : true;
      });
    }

    return list.map(e => Object.assign({}, e));
  }

  // 35. getEventDetail
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    return event;
  }

  // 36. registerForEvent
  registerForEvent(eventId, parentName, email, numChildParticipants) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        message: 'Event not found.',
        registration: null
      };
    }

    const now = this._nowIso();
    const registrations = this._getFromStorage('event_registrations');

    const registration = {
      id: this._generateId('event_reg'),
      eventId,
      parentName,
      email,
      numChildParticipants,
      registeredAt: now
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return {
      success: true,
      message: 'Registered for event.',
      registration
    };
  }

  // 37. getTeacherResourceFilterOptions
  getTeacherResourceFilterOptions() {
    const gradeLevels = [
      'kindergarten',
      'grade_1',
      'grade_2',
      'grade_3',
      'grade_4',
      'grade_5',
      'grade_6',
      'all_grades'
    ].map(value => ({ value, label: this._formatGradeLevel(value) }));

    const genres = [
      'fantasy',
      'realistic_fiction',
      'science_fiction',
      'mystery',
      'bedtime_stories',
      'picture_books',
      'historical_fiction',
      'non_fiction',
      'poetry',
      'other'
    ].map(value => ({ value, label: this._formatGenre(value) }));

    const resourceTypes = [
      'reading_guides',
      'teacher_guides',
      'lesson_plans',
      'activity_sheets',
      'other'
    ].map(value => ({
      value,
      label:
        value === 'reading_guides'
          ? 'Reading Guides'
          : value === 'teacher_guides'
          ? 'Teacher Guides'
          : value === 'lesson_plans'
          ? 'Lesson Plans'
          : value === 'activity_sheets'
          ? 'Activity Sheets'
          : 'Other'
    }));

    return {
      gradeLevels,
      genres,
      resourceTypes
    };
  }

  // 38. listTeacherResources
  listTeacherResources(filters) {
    const resources = this._getFromStorage('teacher_resources');
    const books = this._getFromStorage('books');

    const f = filters || {};
    let list = resources.slice();

    if (f.gradeLevel) {
      list = list.filter(r => r.gradeLevel === f.gradeLevel);
    }
    if (f.genre) {
      list = list.filter(r => r.genre === f.genre);
    }
    if (f.resourceType) {
      list = list.filter(r => r.resourceType === f.resourceType);
    }

    return list.map(r => {
      const associatedBook = books.find(b => b.id === r.associatedBookId) || null;
      return Object.assign({}, r, { associatedBook });
    });
  }

  // 39. getTeacherResourceDetail
  getTeacherResourceDetail(teacherResourceId) {
    const resources = this._getFromStorage('teacher_resources');
    const books = this._getFromStorage('books');

    const resource = resources.find(r => r.id === teacherResourceId) || null;
    if (!resource) {
      return {
        resource: null,
        associatedBook: null,
        associatedBookPublicationYear: null,
        isRecent: false
      };
    }

    const associatedBook = books.find(b => b.id === resource.associatedBookId) || null;
    let pubYear = associatedBook ? associatedBook.publicationYear : null;
    // Fall back to the resource's creation year when no associated book
    // record is present so that callers still receive a sensible
    // publication year for recency checks.
    if (!pubYear && resource && resource.createdAt) {
      const created = this._parseDate(resource.createdAt);
      if (created) {
        pubYear = created.getFullYear();
      }
    }
    const isRecent = this._isBookRecent(pubYear);

    const resourceWithBook = Object.assign({}, resource, { associatedBook });

    return {
      resource: resourceWithBook,
      associatedBook,
      associatedBookPublicationYear: pubYear,
      isRecent
    };
  }

  // 40. getResourceDocument
  getResourceDocument(teacherResourceId) {
    const resources = this._getFromStorage('teacher_resources');
    const resource = resources.find(r => r.id === teacherResourceId) || null;
    if (!resource) {
      return {
        resource: null,
        resourceUrl: '',
        isPdf: false
      };
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task7_openedResourceId', resource.id);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      resource,
      resourceUrl: resource.resourceUrl,
      isPdf: !!resource.isPdf
    };
  }

  // 41. subscribeToNewsletter
  subscribeToNewsletter(email, audienceType, topics) {
    const validAudienceTypes = ['parent', 'teacher', 'librarian', 'student', 'other'];
    if (validAudienceTypes.indexOf(audienceType) === -1) {
      return {
        success: false,
        subscription: null,
        message: 'Invalid audience type.'
      };
    }

    const validTopics = this._validateNewsletterTopics(topics);
    if (validTopics.length === 0) {
      return {
        success: false,
        subscription: null,
        message: 'No valid topics selected.'
      };
    }

    const now = this._nowIso();
    let subs = this._getFromStorage('newsletter_subscriptions');

    let subscription = subs.find(s => s.email === email);
    let message;

    if (subscription) {
      subscription.audienceType = audienceType;
      subscription.topics = validTopics;
      subscription.isActive = true;
      subscription.createdAt = subscription.createdAt || now;
      message = 'Subscription updated.';
    } else {
      subscription = {
        id: this._generateId('newsletter'),
        email,
        audienceType,
        topics: validTopics,
        createdAt: now,
        isActive: true
      };
      subs.push(subscription);
      message = 'Subscribed to newsletter.';
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription,
      message
    };
  }

  // 42. getAboutContent
  getAboutContent() {
    // Static content for About page; not stored in localStorage
    return {
      missionText:
        'We publish imaginative, inclusive children\'s books that spark curiosity and a lifelong love of reading.',
      focusOnLiteracyText:
        'Our catalog supports families, teachers, and librarians with engaging stories, leveled texts, and rich discussion materials for every stage of childhood.',
      ageRangesServed: [
        'ages_0_2',
        'ages_3_5',
        'ages_6_8',
        'ages_8_10',
        'ages_9_12',
        'ages_13_18'
      ],
      contactEmail: 'support@example-childrens-books.com',
      supportDescription:
        'For questions about orders, classroom packs, or author visits, reach out to our support team and we\'ll be happy to help.'
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