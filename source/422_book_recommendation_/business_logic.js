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
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  // ----------------------
  // Initialization & Helpers
  // ----------------------

  _initStorage() {
    const keys = [
      // Core data tables based on data models
      'categories',
      'age_groups',
      'subcategories',
      'tags',
      'books',
      'articles',
      'lists',
      'list_items',
      'planner_entries',
      'bookmarks',
      'comments',
      'newsletter_subscriptions',
      'contact_messages',
      // Legacy/example keys (kept empty, not used)
      'users',
      'products',
      'carts',
      'cartItems'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
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

  _ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _findById(collection, id) {
    return this._ensureArray(collection).find(item => item && item.id === id) || null;
  }

  _getDefaultWishList() {
    const lists = this._getFromStorage('lists');
    return lists.find(l => l.type === 'wish_list' && l.isDefaultWishList) || null;
  }

  // Helper specified in Interfaces
  _getOrCreateDefaultWishList() {
    let lists = this._getFromStorage('lists');
    let wishList = lists.find(l => l.type === 'wish_list' && l.isDefaultWishList);

    if (!wishList) {
      wishList = {
        id: this._generateId('list'),
        type: 'wish_list',
        name: 'Wish List',
        description: '',
        isDefaultWishList: true,
        createdAt: this._nowIso()
      };
      lists.push(wishList);
      this._saveToStorage('lists', lists);
    }

    return wishList;
  }

  // Helper specified in Interfaces
  _copyTextToClipboard(text) {
    // Best-effort clipboard copy; always record in localStorage for environments without clipboard
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        // Fire-and-forget; we don't need to await
        navigator.clipboard.writeText(text).catch(() => {});
      }
    } catch (e) {
      // Ignore clipboard errors
    }

    try {
      const payload = {
        text,
        copiedAt: this._nowIso()
      };
      localStorage.setItem('lastCopiedText', JSON.stringify(payload));
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  _getBooksBaseFilteredByContext(contextType, contextValue) {
    const books = this._getFromStorage('books');
    const ct = (contextType || '').toLowerCase();
    if (!contextValue) return books;

    switch (ct) {
      case 'category':
        return books.filter(b => b.categoryId === contextValue);
      case 'age_group':
        return books.filter(b => b.ageGroupKey === contextValue);
      case 'subcategory':
        return books.filter(b => b.subcategoryId === contextValue);
      case 'tag':
        return books.filter(b => this._ensureArray(b.tags).includes(contextValue));
      case 'search': {
        const q = String(contextValue).toLowerCase();
        return books.filter(b => {
          const hay = [b.title, b.subtitle, b.author, b.description]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          return hay.includes(q);
        });
      }
      default:
        return books;
    }
  }

  _sortBooks(items, sortBy) {
    const sortKey = sortBy || 'relevance';
    const arr = [...items];

    if (sortKey === 'rating_high_to_low') {
      arr.sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const rca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const rcb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        if (rcb !== rca) return rcb - rca;
        return (a.title || '').localeCompare(b.title || '');
      });
    } else if (sortKey === 'newest_first') {
      arr.sort((a, b) => {
        const da = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
        const db = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
        if (db !== da) return db - da;
        return (a.title || '').localeCompare(b.title || '');
      });
    } else if (sortKey === 'most_popular') {
      arr.sort((a, b) => {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        if (pb !== pa) return pb - pa;
        return (a.title || '').localeCompare(b.title || '');
      });
    } else if (sortKey === 'editor_picks') {
      arr.sort((a, b) => {
        const ea = a.isEditorPick ? 1 : 0;
        const eb = b.isEditorPick ? 1 : 0;
        if (eb !== ea) return eb - ea;
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        return (a.title || '').localeCompare(b.title || '');
      });
    } else {
      // 'relevance' or unknown: leave as is
    }

    return arr;
  }

  _paginate(array, page = 1, pageSize = 20) {
    const p = Math.max(1, page || 1);
    const size = Math.max(1, pageSize || 20);
    const totalCount = array.length;
    const start = (p - 1) * size;
    const items = array.slice(start, start + size);
    return { items, page: p, pageSize: size, totalCount };
  }

  _getWishListItemsMap() {
    const wishList = this._getDefaultWishList();
    const listItems = this._getFromStorage('list_items');
    const map = new Set();
    if (!wishList) return map;
    for (const li of listItems) {
      if (li.listId === wishList.id) {
        map.add(li.bookId);
      }
    }
    return map;
  }

  _getBookmarkedBookIdsSet() {
    const bookmarks = this._getFromStorage('bookmarks');
    const set = new Set();
    for (const bm of bookmarks) {
      if (bm.targetType === 'book_review') {
        set.add(bm.targetId);
      }
    }
    return set;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1. getMainNavigationData()
  getMainNavigationData() {
    const categories = this._getFromStorage('categories');
    const ageGroups = this._getFromStorage('age_groups');
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');
    const plannerEntries = this._getFromStorage('planner_entries');

    const readingLists = lists.filter(l => l.type === 'reading_lists');
    const wishList = lists.find(l => l.type === 'wish_list' && l.isDefaultWishList);

    const hasAnyReadingLists = readingLists.length > 0;
    const hasWishListItems = !!wishList && listItems.some(li => li.listId === wishList.id);
    const hasPlannerEntries = plannerEntries.length > 0;

    return {
      categories,
      ageGroups,
      hasAnyReadingLists,
      hasWishListItems,
      hasPlannerEntries
    };
  }

  // 2. getHomePageContent()
  getHomePageContent() {
    const categories = this._getFromStorage('categories');
    const ageGroups = this._getFromStorage('age_groups');
    const tags = this._getFromStorage('tags');
    const subcategories = this._getFromStorage('subcategories');
    const books = this._getFromStorage('books');

    const highlightSections = this._ensureArray(categories).map(cat => ({
      categoryId: cat.categoryId,
      categoryName: cat.name,
      summary: cat.description || ''
    }));

    const quickAgeGroups = ageGroups;

    const featuredTags = this._ensureArray(tags).filter(t => !!t.isFeatured);

    // Seasonal highlight: focus on winter_holidays if present
    let seasonalHighlight = null;
    const winterSubcat = subcategories.find(s => s.subcategoryId === 'winter_holidays');
    if (winterSubcat) {
      const relatedBooks = books.filter(
        b => b.subcategoryId === 'winter_holidays' && typeof b.seasonalYear === 'number'
      );
      let year = null;
      if (relatedBooks.length > 0) {
        year = relatedBooks
          .map(b => b.seasonalYear)
          .filter(y => typeof y === 'number')
          .sort((a, b) => b - a)[0];
      }
      seasonalHighlight = {
        subcategoryId: winterSubcat.subcategoryId,
        subcategoryName: winterSubcat.name,
        seasonalYear: year || new Date().getFullYear(),
        blurb:
          'Cozy winter holiday read-alouds and festive picks for your family reading time.'
      };
    }

    const newsletterTeaser =
      'Get one easy, screen-free book idea in your inbox each week with the Weekly Email for Moms.';

    return {
      highlightSections,
      quickAgeGroups,
      featuredTags,
      seasonalHighlight,
      newsletterTeaser
    };
  }

  // 3. getFeaturedTags()
  getFeaturedTags() {
    const tags = this._getFromStorage('tags');
    return this._ensureArray(tags).filter(t => !!t.isFeatured);
  }

  // 4. getBookFilterOptions(contextType, contextValue)
  getBookFilterOptions(contextType, contextValue) {
    const ageGroups = this._getFromStorage('age_groups');
    const subcategories = this._getFromStorage('subcategories');
    const tags = this._getFromStorage('tags');
    const books = this._getFromStorage('books');

    const contextBooks = this._getBooksBaseFilteredByContext(contextType, contextValue);

    // Theme tags limited to those actually used in contextBooks
    const usedTagSlugs = new Set();
    for (const b of contextBooks) {
      for (const slug of this._ensureArray(b.tags)) {
        usedTagSlugs.add(slug);
      }
    }
    const themeTags = this._ensureArray(tags).filter(t => usedTagSlugs.has(t.slug));

    // Subcategories may be filtered by category context
    let filteredSubcategories = subcategories;
    if ((contextType || '').toLowerCase() === 'category' && contextValue) {
      filteredSubcategories = subcategories.filter(s => s.categoryId === contextValue);
    }

    const formats = [
      { value: 'picture_book', label: 'Picture Books' },
      { value: 'chapter_book', label: 'Chapter Books' },
      { value: 'audiobook', label: 'Audiobooks' },
      { value: 'print', label: 'Print Books' }
    ];

    const ratingThresholds = [
      { value: '4_stars_and_up', label: '4 stars & up', minRating: 4 },
      { value: '4_5_stars_and_up', label: '4.5 stars & up', minRating: 4.5 }
    ];

    const publicationDateOptions = [
      {
        value: '2020_and_newer',
        label: '2020 and newer',
        minDate: '2020-01-01'
      }
    ];

    const seasonalYears = Array.from(
      new Set(
        this._ensureArray(books)
          .map(b => b.seasonalYear)
          .filter(y => typeof y === 'number')
      )
    ).sort((a, b) => b - a);

    const sortOptions = [
      { value: 'rating_high_to_low', label: 'Rating: High to Low' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'editor_picks', label: 'Editor Picks' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return {
      ageGroups,
      subcategories: filteredSubcategories,
      themeTags,
      formats,
      ratingThresholds,
      publicationDateOptions,
      seasonalYears,
      sortOptions
    };
  }

  // 5. getBooksListing(filters, sortBy, page, pageSize)
  getBooksListing(filters, sortBy = 'relevance', page = 1, pageSize = 20) {
    const books = this._getFromStorage('books');
    const categories = this._getFromStorage('categories');
    const ageGroups = this._getFromStorage('age_groups');
    const subcategories = this._getFromStorage('subcategories');
    const tags = this._getFromStorage('tags');
    const listItems = this._getFromStorage('list_items');
    const bookmarks = this._getFromStorage('bookmarks');

    const filtersObj = filters || {};
    let filtered = this._ensureArray(books).filter(b => b.isActive !== false);

    if (filtersObj.categoryId) {
      filtered = filtered.filter(b => b.categoryId === filtersObj.categoryId);
    }
    if (filtersObj.ageGroupKey) {
      filtered = filtered.filter(b => b.ageGroupKey === filtersObj.ageGroupKey);
    }
    if (filtersObj.subcategoryId) {
      filtered = filtered.filter(b => b.subcategoryId === filtersObj.subcategoryId);
    }
    if (filtersObj.tagSlugs && filtersObj.tagSlugs.length) {
      const required = new Set(filtersObj.tagSlugs);
      filtered = filtered.filter(b => {
        const bookTags = new Set(this._ensureArray(b.tags));
        for (const slug of required) {
          if (!bookTags.has(slug)) return false;
        }
        return true;
      });
    }
    if (filtersObj.format) {
      filtered = filtered.filter(b => b.format === filtersObj.format);
    }
    if (typeof filtersObj.minPrice === 'number') {
      filtered = filtered.filter(b => typeof b.price === 'number' && b.price >= filtersObj.minPrice);
    }
    if (typeof filtersObj.maxPrice === 'number') {
      filtered = filtered.filter(b => typeof b.price === 'number' && b.price <= filtersObj.maxPrice);
    }
    if (typeof filtersObj.minRating === 'number') {
      filtered = filtered.filter(b => typeof b.rating === 'number' && b.rating >= filtersObj.minRating);
    }
    if (filtersObj.minPublicationDate) {
      const minTime = new Date(filtersObj.minPublicationDate).getTime();
      filtered = filtered.filter(b => {
        if (!b.publicationDate) return false;
        const t = new Date(b.publicationDate).getTime();
        return t >= minTime;
      });
    }
    if (typeof filtersObj.seasonalYear === 'number') {
      filtered = filtered.filter(b => b.seasonalYear === filtersObj.seasonalYear);
    }
    if (typeof filtersObj.isReadAloudFriendly === 'boolean') {
      filtered = filtered.filter(b => !!b.isReadAloudFriendly === filtersObj.isReadAloudFriendly);
    }
    if (filtersObj.searchQuery) {
      const q = String(filtersObj.searchQuery).toLowerCase();
      filtered = filtered.filter(b => {
        const hay = [b.title, b.subtitle, b.author, b.description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    const sorted = this._sortBooks(filtered, sortBy);

    const { items: pagedBooks, page: p, pageSize: size, totalCount } = this._paginate(
      sorted,
      page,
      pageSize
    );

    const wishList = this._getDefaultWishList();
    const wishListItemIds = new Set(
      this._ensureArray(listItems)
        .filter(li => wishList && li.listId === wishList.id)
        .map(li => li.bookId)
    );

    const bookmarkedBookIds = new Set(
      this._ensureArray(bookmarks)
        .filter(bm => bm.targetType === 'book_review')
        .map(bm => bm.targetId)
    );

    const items = pagedBooks.map(book => {
      const category = categories.find(c => c.categoryId === book.categoryId || c.id === book.categoryId);
      const ageGroup = ageGroups.find(ag => ag.key === book.ageGroupKey || ag.id === book.ageGroupKey);
      const subcat = subcategories.find(
        s => s.subcategoryId === book.subcategoryId || s.id === book.subcategoryId
      );
      const tagNames = this._ensureArray(book.tags)
        .map(slug => tags.find(t => t.slug === slug))
        .filter(Boolean)
        .map(t => t.name);

      return {
        book,
        categoryName: category ? category.name : undefined,
        ageGroupLabel: ageGroup ? ageGroup.label : undefined,
        subcategoryName: subcat ? subcat.name : undefined,
        tagNames,
        isInWishList: wishListItemIds.has(book.id),
        isBookmarked: bookmarkedBookIds.has(book.id)
      };
    });

    return {
      items,
      page: p,
      pageSize: size,
      totalCount
    };
  }

  // 6. getBookDetails(bookId)
  getBookDetails(bookId) {
    const books = this._getFromStorage('books');
    const categories = this._getFromStorage('categories');
    const ageGroups = this._getFromStorage('age_groups');
    const subcategories = this._getFromStorage('subcategories');
    const tags = this._getFromStorage('tags');
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');
    const bookmarks = this._getFromStorage('bookmarks');

    const book = this._ensureArray(books).find(b => b.id === bookId) || null;
    if (!book) {
      return {
        book: null,
        categoryName: undefined,
        ageGroupLabel: undefined,
        subcategoryName: undefined,
        tagDetails: [],
        isInWishList: false,
        listMemberships: [],
        isBookmarked: false
      };
    }

    const category = categories.find(c => c.categoryId === book.categoryId || c.id === book.categoryId);
    const ageGroup = ageGroups.find(ag => ag.key === book.ageGroupKey || ag.id === book.ageGroupKey);
    const subcat = subcategories.find(
      s => s.subcategoryId === book.subcategoryId || s.id === book.subcategoryId
    );

    const tagDetails = this._ensureArray(book.tags)
      .map(slug => tags.find(t => t.slug === slug))
      .filter(Boolean);

    const memberships = [];
    for (const li of this._ensureArray(listItems)) {
      if (li.bookId === book.id) {
        const list = lists.find(l => l.id === li.listId);
        if (list) {
          memberships.push({
            listId: list.id,
            listName: list.name,
            listType: list.type
          });
        }
      }
    }

    const isInWishList = memberships.some(m => m.listType === 'wish_list');
    const isBookmarked = this._ensureArray(bookmarks).some(
      bm => bm.targetType === 'book_review' && bm.targetId === book.id
    );

    return {
      book,
      categoryName: category ? category.name : undefined,
      ageGroupLabel: ageGroup ? ageGroup.label : undefined,
      subcategoryName: subcat ? subcat.name : undefined,
      tagDetails,
      isInWishList,
      listMemberships: memberships,
      isBookmarked
    };
  }

  // 7. getBookComments(bookId)
  getBookComments(bookId) {
    const comments = this._getFromStorage('comments');
    const books = this._getFromStorage('books');
    const book = books.find(b => b.id === bookId) || null;

    return this._ensureArray(comments)
      .filter(
        c =>
          c.targetType === 'book_review' &&
          c.targetId === bookId &&
          (c.isApproved === undefined || c.isApproved === true)
      )
      .map(c => ({
        ...c,
        // Foreign-key resolution: targetId -> target (book)
        target: book
      }));
  }

  // 8. postBookComment(bookId, name, email, commentText)
  postBookComment(bookId, name, email, commentText) {
    const books = this._getFromStorage('books');
    const book = books.find(b => b.id === bookId) || null;
    if (!book) {
      return {
        success: false,
        comment: null,
        message: 'book_not_found'
      };
    }

    const comments = this._getFromStorage('comments');
    const newComment = {
      id: this._generateId('comment'),
      targetType: 'book_review',
      targetId: bookId,
      name,
      email,
      commentText,
      createdAt: this._nowIso(),
      isApproved: true
    };
    comments.push(newComment);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      comment: newComment,
      message: 'comment_created'
    };
  }

  // 9. addBookToList(bookId, listId, newListName, description)
  addBookToList(bookId, listId, newListName, description) {
    const books = this._getFromStorage('books');
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');

    const book = books.find(b => b.id === bookId);
    if (!book) {
      return {
        success: false,
        createdNewList: false,
        list: null,
        listItem: null,
        message: 'book_not_found'
      };
    }

    let targetList = null;
    let createdNewList = false;

    if (listId) {
      targetList = lists.find(l => l.id === listId) || null;
      if (!targetList) {
        return {
          success: false,
          createdNewList: false,
          list: null,
          listItem: null,
          message: 'list_not_found'
        };
      }
    } else if (newListName) {
      targetList = {
        id: this._generateId('list'),
        type: 'reading_lists',
        name: newListName,
        description: description || '',
        isDefaultWishList: false,
        createdAt: this._nowIso()
      };
      lists.push(targetList);
      createdNewList = true;
      this._saveToStorage('lists', lists);
    } else {
      return {
        success: false,
        createdNewList: false,
        list: null,
        listItem: null,
        message: 'list_or_name_required'
      };
    }

    const exists = listItems.find(li => li.listId === targetList.id && li.bookId === bookId);
    if (exists) {
      return {
        success: true,
        createdNewList,
        list: targetList,
        listItem: exists,
        message: 'already_in_list'
      };
    }

    const newListItem = {
      id: this._generateId('listitem'),
      listId: targetList.id,
      bookId: bookId,
      addedAt: this._nowIso(),
      sortOrder: listItems.filter(li => li.listId === targetList.id).length
    };

    listItems.push(newListItem);
    this._saveToStorage('list_items', listItems);

    return {
      success: true,
      createdNewList,
      list: targetList,
      listItem: newListItem,
      message: 'added_to_list'
    };
  }

  // 10. addBookToWishList(bookId)
  addBookToWishList(bookId) {
    const books = this._getFromStorage('books');
    const listItems = this._getFromStorage('list_items');

    const book = books.find(b => b.id === bookId);
    if (!book) {
      return {
        success: false,
        wishList: null,
        listItem: null,
        message: 'book_not_found'
      };
    }

    const wishList = this._getOrCreateDefaultWishList();

    const existing = listItems.find(li => li.listId === wishList.id && li.bookId === bookId);
    if (existing) {
      return {
        success: true,
        wishList,
        listItem: existing,
        message: 'already_in_wish_list'
      };
    }

    const newItem = {
      id: this._generateId('listitem'),
      listId: wishList.id,
      bookId: bookId,
      addedAt: this._nowIso(),
      sortOrder: listItems.filter(li => li.listId === wishList.id).length
    };

    listItems.push(newItem);
    this._saveToStorage('list_items', listItems);

    return {
      success: true,
      wishList,
      listItem: newItem,
      message: 'added_to_wish_list'
    };
  }

  // 11. getUserListsOverview()
  getUserListsOverview() {
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');

    const readingLists = lists.filter(l => l.type === 'reading_lists');
    const wishList = lists.find(l => l.type === 'wish_list' && l.isDefaultWishList) || null;

    let wishListItemCount = 0;
    if (wishList) {
      wishListItemCount = listItems.filter(li => li.listId === wishList.id).length;
    }

    return {
      readingLists,
      wishList,
      wishListItemCount,
      totalReadingListCount: readingLists.length
    };
  }

  // 12. createReadingList(name, description)
  createReadingList(name, description) {
    const lists = this._getFromStorage('lists');

    const newList = {
      id: this._generateId('list'),
      type: 'reading_lists',
      name,
      description: description || '',
      isDefaultWishList: false,
      createdAt: this._nowIso()
    };

    lists.push(newList);
    this._saveToStorage('lists', lists);

    return {
      success: true,
      list: newList,
      message: 'reading_list_created'
    };
  }

  // 13. renameList(listId, newName)
  renameList(listId, newName) {
    const lists = this._getFromStorage('lists');
    const list = lists.find(l => l.id === listId) || null;
    if (!list) {
      return {
        success: false,
        list: null,
        message: 'list_not_found'
      };
    }

    list.name = newName;
    this._saveToStorage('lists', lists);

    return {
      success: true,
      list,
      message: 'list_renamed'
    };
  }

  // 14. deleteList(listId)
  deleteList(listId) {
    const lists = this._getFromStorage('lists');
    const list = lists.find(l => l.id === listId) || null;
    if (!list) {
      return {
        success: false,
        message: 'list_not_found'
      };
    }
    if (list.type === 'wish_list' && list.isDefaultWishList) {
      return {
        success: false,
        message: 'cannot_delete_default_wish_list'
      };
    }

    const newLists = lists.filter(l => l.id !== listId);
    this._saveToStorage('lists', newLists);

    const listItems = this._getFromStorage('list_items');
    const newListItems = listItems.filter(li => li.listId !== listId);
    this._saveToStorage('list_items', newListItems);

    return {
      success: true,
      message: 'list_deleted'
    };
  }

  // 15. getListItems(listId, page, pageSize)
  getListItems(listId, page = 1, pageSize = 50) {
    const lists = this._getFromStorage('lists');
    const listItems = this._getFromStorage('list_items');
    const books = this._getFromStorage('books');
    const categories = this._getFromStorage('categories');
    const ageGroups = this._getFromStorage('age_groups');

    const list = lists.find(l => l.id === listId) || null;
    if (!list) {
      return {
        list: null,
        items: [],
        totalCount: 0,
        page: 1,
        pageSize
      };
    }

    const itemsForList = listItems
      .filter(li => li.listId === listId)
      .sort((a, b) => {
        const soA = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const soB = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        if (soA !== soB) return soA - soB;
        const ta = a.addedAt ? new Date(a.addedAt).getTime() : 0;
        const tb = b.addedAt ? new Date(b.addedAt).getTime() : 0;
        return ta - tb;
      });

    const { items: pagedItems, page: p, pageSize: size, totalCount } = this._paginate(
      itemsForList,
      page,
      pageSize
    );

    const items = pagedItems.map(li => {
      const book = books.find(b => b.id === li.bookId) || null;
      const category = book
        ? categories.find(c => c.categoryId === book.categoryId || c.id === book.categoryId)
        : null;
      const ageGroup = book
        ? ageGroups.find(ag => ag.key === book.ageGroupKey || ag.id === book.ageGroupKey)
        : null;
      return {
        listItem: li,
        book,
        categoryName: category ? category.name : undefined,
        ageGroupLabel: ageGroup ? ageGroup.label : undefined
      };
    });

    return {
      list,
      items,
      totalCount,
      page: p,
      pageSize: size
    };
  }

  // 16. removeBookFromList(listItemId)
  removeBookFromList(listItemId) {
    const listItems = this._getFromStorage('list_items');
    const exists = listItems.some(li => li.id === listItemId);
    if (!exists) {
      return {
        success: false,
        message: 'list_item_not_found'
      };
    }
    const newListItems = listItems.filter(li => li.id !== listItemId);
    this._saveToStorage('list_items', newListItems);
    return {
      success: true,
      message: 'list_item_removed'
    };
  }

  // 17. reorderListItems(listId, orderedItemIds)
  reorderListItems(listId, orderedItemIds) {
    const listItems = this._getFromStorage('list_items');
    const idIndex = new Map();
    this._ensureArray(orderedItemIds).forEach((id, idx) => idIndex.set(id, idx));

    for (const li of listItems) {
      if (li.listId === listId && idIndex.has(li.id)) {
        li.sortOrder = idIndex.get(li.id);
      }
    }

    this._saveToStorage('list_items', listItems);

    return {
      success: true,
      listId
    };
  }

  // 18. addBookToPlanner(bookId, date, sourceListId, notes)
  addBookToPlanner(bookId, date, sourceListId, notes) {
    const books = this._getFromStorage('books');
    const lists = this._getFromStorage('lists');
    const plannerEntries = this._getFromStorage('planner_entries');

    const book = books.find(b => b.id === bookId);
    if (!book) {
      return {
        success: false,
        plannerEntry: null,
        message: 'book_not_found'
      };
    }

    if (sourceListId) {
      const list = lists.find(l => l.id === sourceListId);
      if (!list) {
        return {
          success: false,
          plannerEntry: null,
          message: 'source_list_not_found'
        };
      }
    }

    const plannerEntry = {
      id: this._generateId('planner'),
      bookId,
      date,
      sourceListId: sourceListId || null,
      notes: notes || '',
      createdAt: this._nowIso()
    };

    plannerEntries.push(plannerEntry);
    this._saveToStorage('planner_entries', plannerEntries);

    return {
      success: true,
      plannerEntry,
      message: 'planner_entry_created'
    };
  }

  // 19. getPlannerEntries(startDate, endDate, filters)
  getPlannerEntries(startDate, endDate, filters) {
    const plannerEntries = this._getFromStorage('planner_entries');
    const books = this._getFromStorage('books');
    const lists = this._getFromStorage('lists');

    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    const filtersObj = filters || {};

    const entries = [];

    for (const pe of plannerEntries) {
      const t = new Date(pe.date).getTime();
      if (isNaN(t) || t < startTime || t > endTime) continue;

      if (filtersObj.sourceListId && pe.sourceListId !== filtersObj.sourceListId) {
        continue;
      }

      const book = books.find(b => b.id === pe.bookId);
      if (!book) continue;

      if (filtersObj.ageGroupKey && book.ageGroupKey !== filtersObj.ageGroupKey) {
        continue;
      }

      if (filtersObj.tagSlug) {
        const tagsSet = new Set(this._ensureArray(book.tags));
        if (!tagsSet.has(filtersObj.tagSlug)) continue;
      }

      const list = pe.sourceListId ? lists.find(l => l.id === pe.sourceListId) : null;

      entries.push({
        plannerEntry: pe,
        book,
        listName: list ? list.name : undefined
      });
    }

    return {
      entries
    };
  }

  // 20. updatePlannerEntry(plannerEntryId, date, notes)
  updatePlannerEntry(plannerEntryId, date, notes) {
    const plannerEntries = this._getFromStorage('planner_entries');
    const entry = plannerEntries.find(pe => pe.id === plannerEntryId) || null;
    if (!entry) {
      return {
        success: false,
        plannerEntry: null
      };
    }

    if (date) {
      entry.date = date;
    }
    if (typeof notes === 'string') {
      entry.notes = notes;
    }

    this._saveToStorage('planner_entries', plannerEntries);

    return {
      success: true,
      plannerEntry: entry
    };
  }

  // 21. removePlannerEntry(plannerEntryId)
  removePlannerEntry(plannerEntryId) {
    const plannerEntries = this._getFromStorage('planner_entries');
    const exists = plannerEntries.some(pe => pe.id === plannerEntryId);
    if (!exists) {
      return {
        success: false
      };
    }
    const newEntries = plannerEntries.filter(pe => pe.id !== plannerEntryId);
    this._saveToStorage('planner_entries', newEntries);
    return {
      success: true
    };
  }

  // 22. bookmarkBookReview(bookId)
  bookmarkBookReview(bookId) {
    const books = this._getFromStorage('books');
    const bookmarks = this._getFromStorage('bookmarks');

    const book = books.find(b => b.id === bookId) || null;
    if (!book) {
      return {
        success: false,
        bookmark: null,
        message: 'book_not_found'
      };
    }

    let bookmark = bookmarks.find(bm => bm.targetType === 'book_review' && bm.targetId === bookId);
    if (bookmark) {
      return {
        success: true,
        bookmark,
        message: 'already_bookmarked'
      };
    }

    bookmark = {
      id: this._generateId('bookmark'),
      targetType: 'book_review',
      targetId: bookId,
      createdAt: this._nowIso()
    };

    bookmarks.push(bookmark);
    this._saveToStorage('bookmarks', bookmarks);

    return {
      success: true,
      bookmark,
      message: 'book_review_bookmarked'
    };
  }

  // 23. getBookmarks()
  getBookmarks() {
    const bookmarks = this._getFromStorage('bookmarks');
    const books = this._getFromStorage('books');
    const articles = this._getFromStorage('articles');

    const bookReviewBookmarks = [];
    const articleBookmarks = [];

    for (const bm of bookmarks) {
      if (bm.targetType === 'book_review') {
        const book = books.find(b => b.id === bm.targetId) || null;
        bookReviewBookmarks.push({ bookmark: bm, book });
      } else if (bm.targetType === 'article') {
        const article = articles.find(a => a.id === bm.targetId) || null;
        articleBookmarks.push({ bookmark: bm, article });
      }
    }

    return {
      bookReviewBookmarks,
      articleBookmarks
    };
  }

  // 24. removeBookmark(bookmarkId)
  removeBookmark(bookmarkId) {
    const bookmarks = this._getFromStorage('bookmarks');
    const exists = bookmarks.some(bm => bm.id === bookmarkId);
    if (!exists) {
      return {
        success: false
      };
    }

    const newBookmarks = bookmarks.filter(bm => bm.id !== bookmarkId);
    this._saveToStorage('bookmarks', newBookmarks);

    return {
      success: true
    };
  }

  // 25. copyBookReviewLink(bookId)
  copyBookReviewLink(bookId) {
    const books = this._getFromStorage('books');
    const book = books.find(b => b.id === bookId) || null;
    if (!book) {
      return {
        success: false,
        url: '',
        message: 'book_not_found'
      };
    }

    const url = book.detailUrl || `/books/${bookId}`;
    this._copyTextToClipboard(url);

    return {
      success: true,
      url,
      message: 'book_review_link_copied'
    };
  }

  // 26. searchBooksAndArticles(query, filters, bookSortBy, page, pageSize)
  searchBooksAndArticles(query, filters, bookSortBy = 'relevance', page = 1, pageSize = 20) {
    const normalize = (str) =>
      String(str || '')
        .toLowerCase()
        .replace(/[\u2010-\u2015]/g, '-');
    const q = normalize(query);
    const qTokens = q.split(/\s+/).filter(Boolean);
    const books = this._getFromStorage('books');
    const articles = this._getFromStorage('articles');
    const categories = this._getFromStorage('categories');

    const filtersObj = filters || {};

    // Books search
    let bookResults = this._ensureArray(books).filter(b => {
      const hay = normalize(
        [b.title, b.subtitle, b.author, b.description]
          .filter(Boolean)
          .join(' ')
      );
      return !qTokens.length || qTokens.every(t => hay.includes(t));
    });

    if (filtersObj.categoryId) {
      bookResults = bookResults.filter(b => b.categoryId === filtersObj.categoryId);
    }
    if (filtersObj.format) {
      bookResults = bookResults.filter(b => b.format === filtersObj.format);
    }
    if (typeof filtersObj.maxPrice === 'number') {
      bookResults = bookResults.filter(
        b => typeof b.price === 'number' && b.price <= filtersObj.maxPrice
      );
    }
    if (typeof filtersObj.minRating === 'number') {
      bookResults = bookResults.filter(
        b => typeof b.rating === 'number' && b.rating >= filtersObj.minRating
      );
    }

    bookResults = this._sortBooks(bookResults, bookSortBy);

    // Instrumentation for task completion tracking (task_5 / task5_searchContext)
    try {
      const targetPhrase = normalize('breastfeeding guide');
      const hasPhrase = q.includes(targetPhrase);
      const hasMaxPrice = filters && typeof filters.maxPrice !== 'undefined';
      if (hasPhrase && hasMaxPrice && bookSortBy === 'rating_high_to_low') {
        const topTwoBookIds = [];
        if (bookResults[0] && bookResults[0].id) {
          topTwoBookIds.push(bookResults[0].id);
        }
        if (bookResults[1] && bookResults[1].id) {
          topTwoBookIds.push(bookResults[1].id);
        }

        const task5Value = {
          queryNormalized: q,
          filtersSnapshot: {
            maxPrice: filters && typeof filters.maxPrice !== 'undefined' ? filters.maxPrice : null,
            minRating: filters && typeof filters.minRating !== 'undefined' ? filters.minRating : null,
            categoryId: filters && typeof filters.categoryId !== 'undefined' ? filters.categoryId : null
          },
          sortBy: bookSortBy,
          topTwoBookIds,
          createdAt: this._nowIso()
        };

        localStorage.setItem('task5_searchContext', JSON.stringify(task5Value));
      }
    } catch (e) {
      // Ignore instrumentation errors
    }

    const { items: pagedBooks, page: p, pageSize: size, totalCount: totalBookCount } = this._paginate(
      bookResults,
      page,
      pageSize
    );

    const bookPayload = pagedBooks.map(b => {
      const category = categories.find(c => c.categoryId === b.categoryId || c.id === b.categoryId);
      let snippet = '';
      if (b.description) {
        const descLower = b.description.toLowerCase();
        const idx = descLower.indexOf(q);
        if (idx >= 0) {
          snippet = b.description.substring(Math.max(0, idx - 40), idx + q.length + 60);
        } else {
          snippet = b.description.substring(0, 120);
        }
      }
      return {
        book: b,
        categoryName: category ? category.name : undefined,
        snippet
      };
    });

    // Articles search
    const articleResults = this._ensureArray(articles).filter(a => {
      const hay = normalize(
        [a.title, a.excerpt, a.content]
          .filter(Boolean)
          .join(' ')
      );
      return !qTokens.length || qTokens.every(t => hay.includes(t));
    });

    const articlePayload = articleResults.map(a => {
      const allText = (a.excerpt || a.content || '').toString();
      const lower = allText.toLowerCase();
      let snippet = '';
      const idx = lower.indexOf(q);
      if (idx >= 0) {
        snippet = allText.substring(Math.max(0, idx - 40), idx + q.length + 60);
      } else {
        snippet = allText.substring(0, 160);
      }

      const isCuratedList = this._ensureArray(a.tags).includes('screen_free');

      return {
        article: a,
        snippet,
        isCuratedList
      };
    });

    return {
      books: bookPayload,
      articles: articlePayload,
      page: p,
      pageSize: size,
      totalBookCount,
      totalArticleCount: articleResults.length
    };
  }

  // 27. getArticleDetails(articleId)
  getArticleDetails(articleId) {
    const articles = this._getFromStorage('articles');
    const tags = this._getFromStorage('tags');
    const books = this._getFromStorage('books');
    const ageGroups = this._getFromStorage('age_groups');
    const categories = this._getFromStorage('categories');
    const listItems = this._getFromStorage('list_items');

    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        tags: [],
        recommendedBooks: []
      };
    }

    const tagObjs = this._ensureArray(article.tags)
      .map(slug => tags.find(t => t.slug === slug))
      .filter(Boolean);

    const recommendedBooks = [];
    const wishList = this._getDefaultWishList();
    const wishListItemIds = new Set(
      this._ensureArray(listItems)
        .filter(li => wishList && li.listId === wishList.id)
        .map(li => li.bookId)
    );

    for (const bookId of this._ensureArray(article.recommendedBookIds)) {
      const book = books.find(b => b.id === bookId);
      if (!book) continue;
      const ageGroup = ageGroups.find(ag => ag.key === book.ageGroupKey || ag.id === book.ageGroupKey);
      const category = categories.find(c => c.categoryId === book.categoryId || c.id === book.categoryId);

      recommendedBooks.push({
        book,
        ageGroupLabel: ageGroup ? ageGroup.label : undefined,
        categoryName: category ? category.name : undefined,
        isInWishList: wishListItemIds.has(book.id)
      });
    }

    return {
      article,
      tags: tagObjs,
      recommendedBooks
    };
  }

  // 28. getArticleComments(articleId)
  getArticleComments(articleId) {
    const comments = this._getFromStorage('comments');
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;

    return this._ensureArray(comments)
      .filter(
        c =>
          c.targetType === 'article' &&
          c.targetId === articleId &&
          (c.isApproved === undefined || c.isApproved === true)
      )
      .map(c => ({
        ...c,
        // Foreign-key resolution: targetId -> target (article)
        target: article
      }));
  }

  // 29. postArticleComment(articleId, name, email, commentText)
  postArticleComment(articleId, name, email, commentText) {
    const articles = this._getFromStorage('articles');
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        success: false,
        comment: null,
        message: 'article_not_found'
      };
    }

    const comments = this._getFromStorage('comments');
    const newComment = {
      id: this._generateId('comment'),
      targetType: 'article',
      targetId: articleId,
      name,
      email,
      commentText,
      createdAt: this._nowIso(),
      isApproved: true
    };

    comments.push(newComment);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      comment: newComment,
      message: 'comment_created'
    };
  }

  // 30. subscribeToNewsletter(name, email, subscriptionType)
  subscribeToNewsletter(name, email, subscriptionType) {
    const subs = this._getFromStorage('newsletter_subscriptions');

    let existing = subs.find(
      s => s.email === email && s.subscriptionType === subscriptionType
    );

    if (existing) {
      existing.name = name;
      existing.status = 'active';
      existing.unsubscribedAt = null;
      this._saveToStorage('newsletter_subscriptions', subs);
      return {
        success: true,
        subscription: existing,
        message: 'subscription_updated'
      };
    }

    const subscription = {
      id: this._generateId('newsletter'),
      name,
      email,
      subscriptionType,
      status: 'active',
      createdAt: this._nowIso(),
      unsubscribedAt: null
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription,
      message: 'subscription_created'
    };
  }

  // 31. getNewsletterInfo()
  getNewsletterInfo() {
    return {
      description:
        'The Weekly Email for Moms delivers one gentle, screen-free reading idea plus simple tips for making story time work in real life.',
      frequency: 'weekly',
      includedContentTypes: ['new_book_picks', 'seasonal_guides', 'self_care_ideas'],
      manageInstructions:
        'You can unsubscribe at any time using the link at the bottom of any email.'
    };
  }

  // 32. getAboutContent()
  getAboutContent() {
    return {
      mission:
        'This site exists to help busy moms find truly great books, build simple reading routines, and carve out a few minutes of calm with a good story.',
      featureSummaries: [
        {
          key: 'reading_lists',
          title: 'Custom Reading Lists',
          description:
            'Save and organize books into named reading lists for seasons, trips, or each child.'
        },
        {
          key: 'wish_list',
          title: 'Wish List',
          description:
            'Quickly heart books you want to remember for later library holds or gift ideas.'
        },
        {
          key: 'planner',
          title: 'Reading Planner',
          description:
            'Schedule specific books on specific days so cozy read-alouds actually happen.'
        },
        {
          key: 'bookmarks',
          title: 'Bookmarks',
          description:
            'Bookmark reviews and articles you want to revisit when you have a quiet moment.'
        },
        {
          key: 'newsletter',
          title: 'Weekly Email for Moms',
          description:
            'A once-a-week note that makes choosing your next read-aloud or mom book feel easy.'
        }
      ],
      editorialApproach:
        'Every recommendation is handpicked with real family life in mind, with a focus on gentle stories, emotional safety, and inclusive representation.',
      tagPhilosophy:
        'Tags like “Diverse Characters”, “Bedtime & Routines”, or “Self-Care for Moms” are designed to make it easy to spot what matters most to your family at a glance.'
    };
  }

  // 33. submitContactMessage(name, email, subject, message)
  submitContactMessage(name, email, subject, messageText) {
    const messages = this._getFromStorage('contact_messages');

    const contactMessage = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message: messageText,
      status: 'new',
      createdAt: this._nowIso(),
      updatedAt: this._nowIso()
    };

    messages.push(contactMessage);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      contactMessage,
      message: 'contact_message_received'
    };
  }

  // 34. getPrivacyAndTermsContent()
  getPrivacyAndTermsContent() {
    const lastUpdated = '2024-01-01';
    const privacyHtml =
      '<h2>Privacy Policy</h2>' +
      '<p>We use local storage in your browser to remember your reading lists, bookmarks, and planner entries. ' +
      'We do not store passwords or payment information in local storage.</p>' +
      '<p>You can clear all locally-stored data at any time from your browser settings.</p>';

    const termsHtml =
      '<h2>Terms of Use</h2>' +
      '<p>All book recommendations are provided for informational purposes only. ' +
      'Please use your own judgment when selecting books for your family.</p>';

    return {
      privacyHtml,
      termsHtml,
      lastUpdated
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