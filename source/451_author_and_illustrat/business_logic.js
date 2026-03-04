/*
  BusinessLogic implementation for author & illustrator portfolio site.
  - Uses localStorage (with Node-compatible polyfill) for persistence
  - No DOM/window/document usage beyond localStorage access
  - Implements all specified interfaces with positional arguments
*/

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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    // Initialize arrays for all main entities if not present.
    const arrayKeys = [
      // Legacy/example keys from template (kept for compatibility, not used here)
      'users',
      'carts',
      'cartItems',
      // Actual data model storage keys
      'illustrations',
      'illustration_favorites',
      'collections',
      'collection_items',
      'stories',
      'story_reading_list_items',
      'blog_posts',
      'blog_bookmarks',
      'service_packages',
      'package_requests',
      'products',
      'cart',
      'cart_items',
      'commission_inquiries',
      'consultation_types',
      'consultation_slots',
      'consultation_bookings',
      'reader_profiles'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Simple scalar counter for ID generation
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // ---------------------- Enum label resolver ----------------------

  // Helper: map enum codes to human-readable labels
  _resolveEnumLabels(entityType, field, value) {
    if (value == null) return '';
    const key = entityType + '.' + field;

    const MAPS = {
      'illustration.category': {
        childrens_books: "Children's Books",
        editorial: 'Editorial',
        concept_art: 'Concept Art',
        character_design: 'Character Design',
        other: 'Other'
      },
      'illustration.primaryTheme': {
        animals: 'Animals',
        animal_characters: 'Animal Characters',
        forest: 'Forest',
        woods: 'Woods',
        fantasy: 'Fantasy',
        city: 'City',
        space: 'Space',
        other: 'Other'
      },
      'illustration.style': {
        whimsical: 'Whimsical',
        realistic: 'Realistic',
        cartoon: 'Cartoon',
        watercolor: 'Watercolor',
        line_art: 'Line Art',
        other: 'Other'
      },
      'illustration.colorPalette': {
        pastel: 'Pastel',
        bright: 'Bright',
        muted: 'Muted',
        monochrome: 'Monochrome',
        other: 'Other'
      },
      'story.genre': {
        fantasy: 'Fantasy',
        contemporary: 'Contemporary',
        mystery: 'Mystery',
        sci_fi: 'Science Fiction',
        nonfiction: 'Nonfiction',
        other: 'Other'
      },
      'story.narrativeVoice': {
        first_person: 'First Person',
        third_person_limited: 'Third Person Limited',
        third_person_omniscient: 'Third Person Omniscient',
        second_person: 'Second Person',
        mixed: 'Mixed'
      },
      'common.targetAgeRange': {
        ages_0_2: 'Ages 0–2',
        ages_3_5: 'Ages 3–5',
        ages_4_6: 'Ages 4–6',
        ages_5_7: 'Ages 5–7',
        ages_8_12: 'Ages 8–12',
        ages_9_12: 'Ages 9–12',
        all_ages: 'All Ages'
      },
      'servicePackage.category': {
        book_illustration_package: 'Book Illustration Package',
        branding_package: 'Branding Package',
        consultation_addon: 'Consultation Add-on',
        other_service: 'Other Service'
      },
      'product.productType': {
        book: 'Book',
        print: 'Print',
        merchandise: 'Merchandise',
        ebook: 'eBook',
        other: 'Other'
      },
      'product.category': {
        books: 'Books',
        prints: 'Prints',
        original_art: 'Original Art',
        merch: 'Merchandise',
        other: 'Other'
      },
      'product.format': {
        hardcover: 'Hardcover',
        paperback: 'Paperback',
        ebook: 'eBook',
        audio: 'Audio',
        print: 'Print',
        other: 'Other'
      },
      'cart.status': {
        active: 'Active',
        checked_out: 'Checked Out',
        abandoned: 'Abandoned'
      },
      'commission.projectType': {
        childrens_picture_book_illustration: "Children's Picture Book Illustration",
        cover_illustration: 'Cover Illustration',
        character_design: 'Character Design',
        spot_illustrations: 'Spot Illustrations',
        other: 'Other'
      },
      'commission.heardAbout': {
        search_engine: 'Search Engine',
        social_media: 'Social Media',
        referral: 'Referral',
        website: 'Website',
        other: 'Other'
      },
      'reader.newsletterFrequency': {
        none: 'No Newsletter',
        weekly: 'Weekly',
        monthly: 'Monthly',
        quarterly: 'Quarterly'
      },
      'currency': {
        usd: 'USD',
        eur: 'EUR',
        gbp: 'GBP',
        other: 'Other'
      }
    };

    if (field === 'targetAgeRange') {
      const m = MAPS['common.targetAgeRange'];
      return m[value] || value;
    }
    if (field === 'currency') {
      const m = MAPS['currency'];
      return m[value] || value;
    }

    const map = MAPS[key];
    if (!map) return String(value);
    return map[value] || String(value);
  }

  // ---------------------- Internal helpers for relationships ----------------------

  // Internal helper to retrieve or create the active cart (single-user)
  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts)) carts = [];

    let cart = carts.find(c => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        currency: 'usd',
        createdAt: this._nowISO(),
        updatedAt: this._nowISO()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  // Internal helper to get the existing reader profile, if any
  _getActiveReaderProfile() {
    const profiles = this._getFromStorage('reader_profiles');
    if (!profiles.length) return null;
    return profiles[0];
  }

  _getIllustrationById(id) {
    const illustrations = this._getFromStorage('illustrations');
    return illustrations.find(i => i.id === id) || null;
  }

  _getStoryById(id) {
    const stories = this._getFromStorage('stories');
    return stories.find(s => s.id === id) || null;
  }

  _getBlogPostById(id) {
    const posts = this._getFromStorage('blog_posts');
    return posts.find(p => p.id === id) || null;
  }

  _getServicePackageById(id) {
    const pkgs = this._getFromStorage('service_packages');
    return pkgs.find(p => p.id === id) || null;
  }

  _getProductById(id) {
    const products = this._getFromStorage('products');
    return products.find(p => p.id === id) || null;
  }

  _getConsultationTypeById(id) {
    const types = this._getFromStorage('consultation_types');
    return types.find(t => t.id === id) || null;
  }

  _getConsultationSlotById(id) {
    const slots = this._getFromStorage('consultation_slots');
    return slots.find(s => s.id === id) || null;
  }

  // ---------------------- 1. getHomePageContent ----------------------

  getHomePageContent() {
    const illustrations = this._getFromStorage('illustrations');
    const stories = this._getFromStorage('stories');
    const blogPosts = this._getFromStorage('blog_posts');
    const products = this._getFromStorage('products');
    const illustrationFavorites = this._getFromStorage('illustration_favorites');
    const blogBookmarks = this._getFromStorage('blog_bookmarks');

    const favoriteIds = new Set(illustrationFavorites.map(f => f.illustrationId));
    const bookmarkedIds = new Set(blogBookmarks.map(b => b.blogPostId));

    // Hero: pick first featured illustration, or first illustration
    let heroIll = illustrations.find(i => i.isFeatured) || illustrations[0] || null;

    const hero = heroIll
      ? {
          headline: heroIll.title || 'Stories & illustrations that spark wonder',
          subheadline:
            heroIll.description ||
            "Browse whimsical stories and illustrations for kids and middle-grade readers.",
          backgroundIllustrationId: heroIll.id,
          backgroundIllustrationTitle: heroIll.title,
          backgroundIllustrationImageUrl: heroIll.imageUrl || heroIll.thumbnailUrl || ''
        }
      : {
          headline: 'Stories & illustrations that spark wonder',
          subheadline: 'Browse whimsical stories and illustrations for young readers.',
          backgroundIllustrationId: '',
          backgroundIllustrationTitle: '',
          backgroundIllustrationImageUrl: ''
        };

    // Featured illustrations: up to 6 featured, then most popular
    const sortedIlls = [...illustrations].sort((a, b) => {
      const aPop = a.popularityScore || 0;
      const bPop = b.popularityScore || 0;
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return bPop - aPop;
    });

    const featuredIllustrations = sortedIlls.slice(0, 6).map(i => ({
      illustrationId: i.id,
      title: i.title,
      thumbnailUrl: i.thumbnailUrl || i.imageUrl || '',
      category: i.category,
      categoryLabel: this._resolveEnumLabels('illustration', 'category', i.category),
      primaryTheme: i.primaryTheme,
      primaryThemeLabel: this._resolveEnumLabels('illustration', 'primaryTheme', i.primaryTheme),
      isFeatured: !!i.isFeatured,
      isFavorited: favoriteIds.has(i.id)
    }));

    // Featured stories: published, sorted by popularity
    const featuredStories = stories
      .filter(s => s.isPublished)
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, 4)
      .map(s => ({
        storyId: s.id,
        title: s.title,
        genre: s.genre,
        genreLabel: this._resolveEnumLabels('story', 'genre', s.genre),
        targetAgeRange: s.targetAgeRange,
        targetAgeRangeLabel: this._resolveEnumLabels('story', 'targetAgeRange', s.targetAgeRange),
        wordCount: s.wordCount,
        estimatedReadingTimeMinutes: s.estimatedReadingTimeMinutes || Math.round((s.wordCount || 0) / 250),
        synopsis: s.synopsis || ''
      }));

    // Featured blog posts: published, most recent
    const publishedPosts = blogPosts.filter(p => p.isPublished);
    const featuredBlogPosts = publishedPosts
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return db - da;
      })
      .slice(0, 3)
      .map(p => ({
        blogPostId: p.id,
        title: p.title,
        excerpt: p.excerpt || '',
        publishedAt: p.publishedAt || '',
        publishYear: p.publishYear || (this._parseDate(p.publishedAt) || new Date()).getFullYear(),
        tags: Array.isArray(p.tags) ? p.tags : [],
        isBookmarked: bookmarkedIds.has(p.id)
      }));

    // Featured products: active, most popular
    const featuredProducts = products
      .filter(p => p.isActive)
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, 4)
      .map(p => ({
        productId: p.id,
        name: p.name,
        productType: p.productType,
        productTypeLabel: this._resolveEnumLabels('product', 'productType', p.productType),
        price: p.price,
        currency: p.currency,
        currencyLabel: this._resolveEnumLabels('product', 'currency', p.currency),
        thumbnailUrl: p.thumbnailUrl || p.imageUrl || ''
      }));

    const primaryCtas = {
      commission: {
        headline: 'Commission a picture book',
        description: 'Ask about custom illustrations for your children\'s story or picture book project.'
      },
      consultation: {
        headline: 'Book a portfolio consultation',
        description: 'Get feedback on your children\'s book concept and illustration portfolio.',
        nextAvailableSlotSummary: '' // Could be filled by consulting consultation_slots if desired
      },
      newsletter: {
        headline: 'Stay in the loop',
        description: 'Get monthly tips on children\'s illustration, writing, and self-publishing.'
      }
    };

    return {
      hero,
      featuredIllustrations,
      featuredStories,
      featuredBlogPosts,
      featuredProducts,
      primaryCtas
    };
  }

  // ---------------------- 2. Illustration portfolio ----------------------

  getIllustrationFilterOptions() {
    const illustrations = this._getFromStorage('illustrations');

    // Categories, themes, etc. from enum definitions (static), as per data model
    const categories = [
      { value: 'childrens_books', label: this._resolveEnumLabels('illustration', 'category', 'childrens_books') },
      { value: 'editorial', label: this._resolveEnumLabels('illustration', 'category', 'editorial') },
      { value: 'concept_art', label: this._resolveEnumLabels('illustration', 'category', 'concept_art') },
      { value: 'character_design', label: this._resolveEnumLabels('illustration', 'category', 'character_design') },
      { value: 'other', label: this._resolveEnumLabels('illustration', 'category', 'other') }
    ];

    const themes = [
      'animals',
      'animal_characters',
      'forest',
      'woods',
      'fantasy',
      'city',
      'space',
      'other'
    ].map(v => ({ value: v, label: this._resolveEnumLabels('illustration', 'primaryTheme', v) }));

    const styles = ['whimsical', 'realistic', 'cartoon', 'watercolor', 'line_art', 'other'].map(v => ({
      value: v,
      label: this._resolveEnumLabels('illustration', 'style', v)
    }));

    const colorPalettes = ['pastel', 'bright', 'muted', 'monochrome', 'other'].map(v => ({
      value: v,
      label: this._resolveEnumLabels('illustration', 'colorPalette', v)
    }));

    const targetAgeRanges = [
      'ages_0_2',
      'ages_3_5',
      'ages_4_6',
      'ages_5_7',
      'ages_8_12',
      'ages_9_12',
      'all_ages'
    ].map(v => ({ value: v, label: this._resolveEnumLabels('illustration', 'targetAgeRange', v) }));

    let years = illustrations
      .map(i => i.yearCreated)
      .filter(y => typeof y === 'number' && !isNaN(y));
    if (!years.length) {
      years = [];
    }
    const minYear = years.length ? Math.min(...years) : null;
    const maxYear = years.length ? Math.max(...years) : null;

    const sortOptions = [
      { value: 'popularity_desc', label: 'Popularity (High to Low)', description: 'Most popular first' },
      { value: 'newest_first', label: 'Newest First', description: 'Newest illustrations first' },
      { value: 'featured_first', label: 'Featured', description: 'Featured illustrations first' },
      { value: 'title_asc', label: 'Title (A–Z)', description: 'Alphabetical by title' }
    ];

    return {
      categories,
      themes,
      styles,
      colorPalettes,
      targetAgeRanges,
      yearRange: { minYear, maxYear },
      sortOptions
    };
  }

  searchIllustrations(filters, sortOption, page, pageSize) {
    const all = this._getFromStorage('illustrations');
    const favorites = this._getFromStorage('illustration_favorites');
    const favoriteIds = new Set(favorites.map(f => f.illustrationId));

    const f = filters || {};
    let results = all.slice();

    if (f.category) {
      results = results.filter(i => i.category === f.category);
    }
    if (f.primaryTheme) {
      results = results.filter(i => i.primaryTheme === f.primaryTheme);
    }
    if (f.style) {
      results = results.filter(i => i.style === f.style);
    }
    if (f.colorPalette) {
      results = results.filter(i => i.colorPalette === f.colorPalette);
    }
    if (f.targetAgeRange) {
      results = results.filter(i => i.targetAgeRange === f.targetAgeRange);
    }
    if (typeof f.minYearCreated === 'number') {
      results = results.filter(i => {
        const y = i.yearCreated;
        return typeof y === 'number' && y >= f.minYearCreated;
      });
    }
    if (typeof f.maxYearCreated === 'number') {
      results = results.filter(i => {
        const y = i.yearCreated;
        return typeof y === 'number' && y <= f.maxYearCreated;
      });
    }
    if (typeof f.isFeatured === 'boolean') {
      results = results.filter(i => !!i.isFeatured === f.isFeatured);
    }
    if (Array.isArray(f.tags) && f.tags.length) {
      results = results.filter(i => {
        const tags = Array.isArray(i.tags) ? i.tags : [];
        return f.tags.every(t => tags.includes(t));
      });
    }

    const sort = sortOption || 'popularity_desc';
    results.sort((a, b) => {
      if (sort === 'newest_first') {
        const da = this._parseDate(a.dateCreated) || new Date(0);
        const db = this._parseDate(b.dateCreated) || new Date(0);
        return db - da;
      }
      if (sort === 'featured_first') {
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        const pa = a.popularityScore || 0;
        const pb = b.popularityScore || 0;
        return pb - pa;
      }
      if (sort === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // Default: popularity_desc
      const pa = a.popularityScore || 0;
      const pb = b.popularityScore || 0;
      return pb - pa;
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / ps));
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    const mapped = paged.map(i => ({
      illustrationId: i.id,
      title: i.title,
      thumbnailUrl: i.thumbnailUrl || i.imageUrl || '',
      category: i.category,
      categoryLabel: this._resolveEnumLabels('illustration', 'category', i.category),
      primaryTheme: i.primaryTheme,
      primaryThemeLabel: this._resolveEnumLabels('illustration', 'primaryTheme', i.primaryTheme),
      style: i.style,
      styleLabel: this._resolveEnumLabels('illustration', 'style', i.style),
      colorPalette: i.colorPalette,
      colorPaletteLabel: this._resolveEnumLabels('illustration', 'colorPalette', i.colorPalette),
      targetAgeRange: i.targetAgeRange,
      targetAgeRangeLabel: this._resolveEnumLabels('illustration', 'targetAgeRange', i.targetAgeRange),
      yearCreated: i.yearCreated,
      isFeatured: !!i.isFeatured,
      popularityScore: i.popularityScore || 0,
      isFavorited: favoriteIds.has(i.id)
    }));

    return {
      results: mapped,
      pagination: {
        page: pg,
        pageSize: ps,
        totalResults,
        totalPages
      }
    };
  }

  getIllustrationDetail(illustrationId) {
    const illustrations = this._getFromStorage('illustrations');
    const favorites = this._getFromStorage('illustration_favorites');
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const i = illustrations.find(x => x.id === illustrationId);
    if (!i) return null;

    const isFavorited = favorites.some(f => f.illustrationId === i.id);

    const containingItems = collectionItems.filter(ci => ci.illustrationId === i.id);
    const collectionsContaining = containingItems.map(ci => {
      const col = collections.find(c => c.id === ci.collectionId) || null;
      return {
        collectionId: ci.collectionId,
        collectionName: col ? col.name : '',
        // Foreign key resolution: include full collection object
        collection: col
      };
    });

    const related = illustrations
      .filter(other => other.id !== i.id && (other.primaryTheme === i.primaryTheme || other.category === i.category))
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, 6)
      .map(r => ({
        illustrationId: r.id,
        title: r.title,
        thumbnailUrl: r.thumbnailUrl || r.imageUrl || '',
        primaryThemeLabel: this._resolveEnumLabels('illustration', 'primaryTheme', r.primaryTheme),
        isFavorited: favorites.some(f => f.illustrationId === r.id),
        // Foreign key resolution: include full illustration object
        illustration: r
      }));

    return {
      illustrationId: i.id,
      title: i.title,
      slug: i.slug || '',
      description: i.description || '',
      imageUrl: i.imageUrl || '',
      category: i.category,
      categoryLabel: this._resolveEnumLabels('illustration', 'category', i.category),
      primaryTheme: i.primaryTheme,
      primaryThemeLabel: this._resolveEnumLabels('illustration', 'primaryTheme', i.primaryTheme),
      style: i.style,
      styleLabel: this._resolveEnumLabels('illustration', 'style', i.style),
      colorPalette: i.colorPalette,
      colorPaletteLabel: this._resolveEnumLabels('illustration', 'colorPalette', i.colorPalette),
      targetAgeRange: i.targetAgeRange,
      targetAgeRangeLabel: this._resolveEnumLabels('illustration', 'targetAgeRange', i.targetAgeRange),
      yearCreated: i.yearCreated || null,
      dateCreated: i.dateCreated || '',
      tags: Array.isArray(i.tags) ? i.tags : [],
      isFeatured: !!i.isFeatured,
      popularityScore: i.popularityScore || 0,
      isFavorited,
      collectionsContaining,
      relatedIllustrations: related
    };
  }

  toggleIllustrationFavorite(illustrationId) {
    let favorites = this._getFromStorage('illustration_favorites');
    const existingIndex = favorites.findIndex(f => f.illustrationId === illustrationId);

    let isFavorited;
    let message;
    if (existingIndex >= 0) {
      favorites.splice(existingIndex, 1);
      isFavorited = false;
      message = 'Removed from favorites';
    } else {
      const newFav = {
        id: this._generateId('illfav'),
        illustrationId,
        createdAt: this._nowISO()
      };
      favorites.push(newFav);
      isFavorited = true;
      message = 'Added to favorites';
    }

    this._saveToStorage('illustration_favorites', favorites);

    return {
      success: true,
      isFavorited,
      message,
      totalFavorites: favorites.length
    };
  }

  addIllustrationToCollection(collectionId, illustrationId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const collection = collections.find(c => c.id === collectionId);

    if (!collection) {
      return {
        success: false,
        collectionId,
        collectionName: '',
        collectionItemId: null,
        itemCount: 0,
        collectionCoverIllustrationId: null,
        message: 'Collection not found'
      };
    }

    let item = collectionItems.find(
      ci => ci.collectionId === collectionId && ci.illustrationId === illustrationId
    );

    if (!item) {
      const sortOrder =
        collectionItems
          .filter(ci => ci.collectionId === collectionId)
          .reduce((max, ci) => (typeof ci.sortOrder === 'number' && ci.sortOrder > max ? ci.sortOrder : max), 0) + 1;

      item = {
        id: this._generateId('colitem'),
        collectionId,
        illustrationId,
        addedAt: this._nowISO(),
        sortOrder
      };
      collectionItems.push(item);
    }

    if (!collection.coverIllustrationId) {
      collection.coverIllustrationId = illustrationId;
    }
    collection.updatedAt = this._nowISO();

    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', collectionItems);

    const itemCount = collectionItems.filter(ci => ci.collectionId === collectionId).length;

    return {
      success: true,
      collectionId,
      collectionName: collection.name,
      collectionItemId: item.id,
      itemCount,
      collectionCoverIllustrationId: collection.coverIllustrationId,
      message: 'Illustration added to collection'
    };
  }

  createCollectionAndAddIllustration(name, description, illustrationId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');

    const collectionId = this._generateId('col');
    const createdAt = this._nowISO();

    const collection = {
      id: collectionId,
      name,
      description: description || '',
      coverIllustrationId: illustrationId,
      createdAt,
      updatedAt: createdAt
    };

    const collectionItemId = this._generateId('colitem');
    const collectionItem = {
      id: collectionItemId,
      collectionId,
      illustrationId,
      addedAt: createdAt,
      sortOrder: 1
    };

    collections.push(collection);
    collectionItems.push(collectionItem);

    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', collectionItems);

    return {
      success: true,
      collection: {
        collectionId,
        name: collection.name,
        description: collection.description,
        coverIllustrationId: collection.coverIllustrationId,
        createdAt: collection.createdAt
      },
      collectionItem: {
        collectionItemId,
        illustrationId,
        sortOrder: 1
      },
      message: 'Collection created and illustration added'
    };
  }

  listCollections() {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const illustrations = this._getFromStorage('illustrations');

    return collections.map(c => {
      const itemsForCol = collectionItems.filter(ci => ci.collectionId === c.id);
      const itemCount = itemsForCol.length;
      const coverIll = c.coverIllustrationId
        ? illustrations.find(i => i.id === c.coverIllustrationId) || null
        : null;

      return {
        collectionId: c.id,
        name: c.name,
        description: c.description || '',
        itemCount,
        coverIllustrationId: c.coverIllustrationId || null,
        coverIllustrationThumbnailUrl: coverIll ? coverIll.thumbnailUrl || coverIll.imageUrl || '' : '',
        createdAt: c.createdAt || '',
        updatedAt: c.updatedAt || '',
        // Foreign key resolution: include full cover illustration
        coverIllustration: coverIll
      };
    });
  }

  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const collectionItems = this._getFromStorage('collection_items');
    const illustrations = this._getFromStorage('illustrations');

    const collection = collections.find(c => c.id === collectionId);
    if (!collection) return null;

    const items = collectionItems
      .filter(ci => ci.collectionId === collectionId)
      .sort((a, b) => {
        const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
        const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
        return sa - sb;
      })
      .map(ci => {
        const ill = illustrations.find(i => i.id === ci.illustrationId) || null;
        return {
          collectionItemId: ci.id,
          illustrationId: ci.illustrationId,
          illustrationTitle: ill ? ill.title : '',
          thumbnailUrl: ill ? ill.thumbnailUrl || ill.imageUrl || '' : '',
          sortOrder: ci.sortOrder,
          // Foreign key resolution: include full illustration object
          illustration: ill
        };
      });

    return {
      collectionId: collection.id,
      name: collection.name,
      description: collection.description || '',
      createdAt: collection.createdAt || '',
      updatedAt: collection.updatedAt || '',
      items
    };
  }

  updateCollectionMetadata(collectionId, name, description) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find(c => c.id === collectionId);

    if (!collection) {
      return {
        success: false,
        collectionId,
        name: '',
        description: '',
        updatedAt: '',
        message: 'Collection not found'
      };
    }

    if (typeof name === 'string' && name.trim()) {
      collection.name = name;
    }
    if (typeof description === 'string') {
      collection.description = description;
    }
    collection.updatedAt = this._nowISO();

    this._saveToStorage('collections', collections);

    return {
      success: true,
      collectionId: collection.id,
      name: collection.name,
      description: collection.description || '',
      updatedAt: collection.updatedAt,
      message: 'Collection updated'
    };
  }

  deleteCollection(collectionId) {
    let collections = this._getFromStorage('collections');
    let collectionItems = this._getFromStorage('collection_items');

    const beforeCount = collections.length;
    collections = collections.filter(c => c.id !== collectionId);
    collectionItems = collectionItems.filter(ci => ci.collectionId !== collectionId);

    this._saveToStorage('collections', collections);
    this._saveToStorage('collection_items', collectionItems);

    if (collections.length === beforeCount) {
      return { success: false, message: 'Collection not found' };
    }

    return { success: true, message: 'Collection deleted' };
  }

  removeCollectionItem(collectionItemId) {
    let collectionItems = this._getFromStorage('collection_items');
    const item = collectionItems.find(ci => ci.id === collectionItemId);
    if (!item) {
      return { success: false, collectionId: null, message: 'Collection item not found' };
    }

    const collectionId = item.collectionId;
    collectionItems = collectionItems.filter(ci => ci.id !== collectionItemId);
    this._saveToStorage('collection_items', collectionItems);

    return { success: true, collectionId, message: 'Item removed from collection' };
  }

  reorderCollectionItems(collectionId, orderedCollectionItemIds) {
    const collectionItems = this._getFromStorage('collection_items');
    const idToItem = new Map();

    for (const ci of collectionItems) {
      if (ci.collectionId === collectionId) {
        idToItem.set(ci.id, ci);
      }
    }

    let order = 1;
    for (const id of orderedCollectionItemIds) {
      const item = idToItem.get(id);
      if (item) {
        item.sortOrder = order++;
      }
    }

    this._saveToStorage('collection_items', collectionItems);

    return {
      success: true,
      collectionId,
      message: 'Collection items reordered'
    };
  }

  // ---------------------- 3. Story / writing portfolio ----------------------

  getStoryFilterOptions() {
    const genres = [
      'fantasy',
      'contemporary',
      'mystery',
      'sci_fi',
      'nonfiction',
      'other'
    ].map(v => ({ value: v, label: this._resolveEnumLabels('story', 'genre', v) }));

    const targetAgeRanges = [
      'ages_0_2',
      'ages_3_5',
      'ages_4_6',
      'ages_5_7',
      'ages_8_12',
      'ages_9_12',
      'all_ages'
    ].map(v => ({ value: v, label: this._resolveEnumLabels('story', 'targetAgeRange', v) }));

    const narrativeVoices = [
      'first_person',
      'third_person_limited',
      'third_person_omniscient',
      'second_person',
      'mixed'
    ].map(v => ({ value: v, label: this._resolveEnumLabels('story', 'narrativeVoice', v) }));

    const lengthOptions = [
      { value: 'under_1000', label: 'Under 1,000 words', minWordCount: 0, maxWordCount: 999 },
      { value: '1000_2000', label: '1,000–2,000 words', minWordCount: 1000, maxWordCount: 2000 },
      { value: 'over_2000_words', label: 'Over 2,000 words', minWordCount: 2001, maxWordCount: null }
    ];

    const sortOptions = [
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'top_rated', label: 'Top Rated' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'title_asc', label: 'Title (A–Z)' }
    ];

    return {
      genres,
      targetAgeRanges,
      narrativeVoices,
      lengthOptions,
      sortOptions
    };
  }

  searchStories(filters, sortOption, page, pageSize) {
    const stories = this._getFromStorage('stories');
    const readingList = this._getFromStorage('story_reading_list_items');
    const inReadingListIds = new Set(readingList.map(r => r.storyId));

    const f = filters || {};
    let results = stories.filter(s => s.isPublished);

    if (f.genre) results = results.filter(s => s.genre === f.genre);
    if (f.targetAgeRange) results = results.filter(s => s.targetAgeRange === f.targetAgeRange);
    if (f.narrativeVoice) results = results.filter(s => s.narrativeVoice === f.narrativeVoice);
    if (typeof f.minWordCount === 'number') {
      results = results.filter(s => typeof s.wordCount === 'number' && s.wordCount >= f.minWordCount);
    }
    if (typeof f.maxWordCount === 'number') {
      results = results.filter(s => typeof s.wordCount === 'number' && s.wordCount <= f.maxWordCount);
    }
    if (Array.isArray(f.tags) && f.tags.length) {
      results = results.filter(s => {
        const tags = Array.isArray(s.tags) ? s.tags : [];
        return f.tags.every(t => tags.includes(t));
      });
    }

    const sort = sortOption || 'most_popular';
    results.sort((a, b) => {
      if (sort === 'top_rated') {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        return rb - ra;
      }
      if (sort === 'newest_first') {
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return db - da;
      }
      if (sort === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // default most_popular
      const pa = a.popularityScore || 0;
      const pb = b.popularityScore || 0;
      return pb - pa;
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / ps));
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    const mapped = paged.map(s => ({
      storyId: s.id,
      title: s.title,
      genre: s.genre,
      genreLabel: this._resolveEnumLabels('story', 'genre', s.genre),
      targetAgeRange: s.targetAgeRange,
      targetAgeRangeLabel: this._resolveEnumLabels('story', 'targetAgeRange', s.targetAgeRange),
      narrativeVoice: s.narrativeVoice,
      narrativeVoiceLabel: this._resolveEnumLabels('story', 'narrativeVoice', s.narrativeVoice),
      wordCount: s.wordCount,
      estimatedReadingTimeMinutes: s.estimatedReadingTimeMinutes || Math.round((s.wordCount || 0) / 250),
      synopsis: s.synopsis || '',
      popularityScore: s.popularityScore || 0,
      rating: s.rating || 0,
      isInReadingList: inReadingListIds.has(s.id)
    }));

    return {
      results: mapped,
      pagination: {
        page: pg,
        pageSize: ps,
        totalResults,
        totalPages
      }
    };
  }

  getStoryDetail(storyId) {
    const stories = this._getFromStorage('stories');
    const readingList = this._getFromStorage('story_reading_list_items');
    const story = stories.find(s => s.id === storyId);
    if (!story) return null;

    const isInReadingList = readingList.some(r => r.storyId === story.id);

    const relatedStories = stories
      .filter(s => s.id !== story.id && s.isPublished && (s.genre === story.genre || s.targetAgeRange === story.targetAgeRange))
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, 5)
      .map(rs => ({
        storyId: rs.id,
        title: rs.title,
        genreLabel: this._resolveEnumLabels('story', 'genre', rs.genre),
        targetAgeRangeLabel: this._resolveEnumLabels('story', 'targetAgeRange', rs.targetAgeRange)
      }));

    return {
      storyId: story.id,
      title: story.title,
      slug: story.slug || '',
      genre: story.genre,
      genreLabel: this._resolveEnumLabels('story', 'genre', story.genre),
      targetAgeRange: story.targetAgeRange,
      targetAgeRangeLabel: this._resolveEnumLabels('story', 'targetAgeRange', story.targetAgeRange),
      narrativeVoice: story.narrativeVoice,
      narrativeVoiceLabel: this._resolveEnumLabels('story', 'narrativeVoice', story.narrativeVoice),
      wordCount: story.wordCount,
      estimatedReadingTimeMinutes:
        story.estimatedReadingTimeMinutes || Math.round((story.wordCount || 0) / 250),
      synopsis: story.synopsis || '',
      content: story.content || '',
      tags: Array.isArray(story.tags) ? story.tags : [],
      isInReadingList,
      contentWarnings: story.contentWarnings || '',
      relatedStories
    };
  }

  addStoryToReadingList(storyId) {
    const stories = this._getFromStorage('stories');
    const story = stories.find(s => s.id === storyId);
    if (!story) {
      return {
        success: false,
        isInReadingList: false,
        message: 'Story not found',
        totalReadingListItems: this._getFromStorage('story_reading_list_items').length
      };
    }

    let list = this._getFromStorage('story_reading_list_items');
    const exists = list.some(r => r.storyId === storyId);

    if (!exists) {
      list.push({
        id: this._generateId('readitem'),
        storyId,
        addedAt: this._nowISO()
      });
      this._saveToStorage('story_reading_list_items', list);
    }

    return {
      success: true,
      isInReadingList: true,
      message: exists ? 'Story already in reading list' : 'Story added to reading list',
      totalReadingListItems: list.length
    };
  }

  removeStoryFromReadingList(storyId) {
    let list = this._getFromStorage('story_reading_list_items');
    const before = list.length;
    list = list.filter(r => r.storyId !== storyId);
    this._saveToStorage('story_reading_list_items', list);

    const removed = list.length < before;

    return {
      success: removed,
      isInReadingList: false,
      message: removed ? 'Story removed from reading list' : 'Story was not in reading list',
      totalReadingListItems: list.length
    };
  }

  getReadingList() {
    const list = this._getFromStorage('story_reading_list_items');
    const stories = this._getFromStorage('stories');

    return list.map(item => {
      const story = stories.find(s => s.id === item.storyId) || null;
      return {
        storyId: item.storyId,
        title: story ? story.title : '',
        genreLabel: story ? this._resolveEnumLabels('story', 'genre', story.genre) : '',
        targetAgeRangeLabel: story
          ? this._resolveEnumLabels('story', 'targetAgeRange', story.targetAgeRange)
          : '',
        wordCount: story ? story.wordCount : 0,
        estimatedReadingTimeMinutes: story
          ? story.estimatedReadingTimeMinutes || Math.round((story.wordCount || 0) / 250)
          : 0,
        addedAt: item.addedAt,
        // Foreign key resolution: include full story object
        story
      };
    });
  }

  // ---------------------- 4. Blog ----------------------

  getBlogFilterOptions() {
    const posts = this._getFromStorage('blog_posts');

    const yearsSet = new Set();
    const tagsSet = new Set();
    const topicsSet = new Set();

    for (const p of posts) {
      if (typeof p.publishYear === 'number') yearsSet.add(p.publishYear);
      if (Array.isArray(p.tags)) p.tags.forEach(t => tagsSet.add(t));
      if (Array.isArray(p.topics)) p.topics.forEach(t => topicsSet.add(t));
    }

    const years = Array.from(yearsSet).sort();
    const tags = Array.from(tagsSet).map(t => ({ value: t, label: t }));
    const topics = Array.from(topicsSet).map(t => ({ value: t, label: t }));

    const sortOptions = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'title_asc', label: 'Title (A–Z)' }
    ];

    return { years, tags, topics, sortOptions };
  }

  searchBlogPosts(query, filters, sortOption, page, pageSize) {
    const posts = this._getFromStorage('blog_posts');
    const bookmarks = this._getFromStorage('blog_bookmarks');
    const bookmarkedIds = new Set(bookmarks.map(b => b.blogPostId));

    const q = (query || '').trim().toLowerCase();
    const f = filters || {};

    let results = posts.filter(p => p.isPublished);

    if (q) {
      results = results.filter(p => {
        const hay = ((p.title || '') + ' ' + (p.excerpt || '') + ' ' + (p.content || '')).toLowerCase();
        return hay.includes(q);
      });
    }

    if (typeof f.year === 'number') {
      results = results.filter(p => p.publishYear === f.year);
    }

    if (f.tag) {
      results = results.filter(p => Array.isArray(p.tags) && p.tags.includes(f.tag));
    }

    if (f.topic) {
      results = results.filter(p => Array.isArray(p.topics) && p.topics.includes(f.topic));
    }

    const sort = sortOption || 'newest_first';
    results.sort((a, b) => {
      if (sort === 'most_popular') {
        const pa = a.popularityScore || 0;
        const pb = b.popularityScore || 0;
        return pb - pa;
      }
      if (sort === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // newest_first
      const da = this._parseDate(a.publishedAt) || new Date(0);
      const db = this._parseDate(b.publishedAt) || new Date(0);
      return db - da;
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;
    const totalResults = results.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / ps));
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    const mapped = paged.map(p => ({
      blogPostId: p.id,
      title: p.title,
      slug: p.slug || '',
      excerpt: p.excerpt || '',
      publishedAt: p.publishedAt || '',
      publishYear: p.publishYear || (this._parseDate(p.publishedAt) || new Date()).getFullYear(),
      authorName: p.authorName || '',
      tags: Array.isArray(p.tags) ? p.tags : [],
      readTimeMinutes: p.readTimeMinutes || 0,
      popularityScore: p.popularityScore || 0,
      isBookmarked: bookmarkedIds.has(p.id)
    }));

    return {
      results: mapped,
      pagination: {
        page: pg,
        pageSize: ps,
        totalResults,
        totalPages
      }
    };
  }

  getBlogPostDetail(blogPostId) {
    const posts = this._getFromStorage('blog_posts');
    const bookmarks = this._getFromStorage('blog_bookmarks');
    const post = posts.find(p => p.id === blogPostId);
    if (!post) return null;

    const isBookmarked = bookmarks.some(b => b.blogPostId === post.id);

    const relatedPosts = posts
      .filter(p => p.id !== post.id && p.isPublished && ((p.publishYear && p.publishYear === post.publishYear) || (p.tags && post.tags && p.tags.some(t => post.tags.includes(t)))))
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, 5)
      .map(rp => ({
        blogPostId: rp.id,
        title: rp.title,
        publishedAt: rp.publishedAt || ''
      }));

    return {
      blogPostId: post.id,
      title: post.title,
      slug: post.slug || '',
      content: post.content || '',
      excerpt: post.excerpt || '',
      authorName: post.authorName || '',
      publishedAt: post.publishedAt || '',
      publishYear: post.publishYear || (this._parseDate(post.publishedAt) || new Date()).getFullYear(),
      tags: Array.isArray(post.tags) ? post.tags : [],
      topics: Array.isArray(post.topics) ? post.topics : [],
      readTimeMinutes: post.readTimeMinutes || 0,
      isBookmarked,
      relatedPosts
    };
  }

  toggleBlogBookmark(blogPostId) {
    let bookmarks = this._getFromStorage('blog_bookmarks');
    const idx = bookmarks.findIndex(b => b.blogPostId === blogPostId);

    let isBookmarked;
    let message;
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
      isBookmarked = false;
      message = 'Removed bookmark';
    } else {
      bookmarks.push({
        id: this._generateId('blogbm'),
        blogPostId,
        bookmarkedAt: this._nowISO()
      });
      isBookmarked = true;
      message = 'Bookmarked post';
    }

    this._saveToStorage('blog_bookmarks', bookmarks);

    return {
      success: true,
      isBookmarked,
      message,
      totalBookmarks: bookmarks.length
    };
  }

  getBookmarkedBlogPosts() {
    const bookmarks = this._getFromStorage('blog_bookmarks');
    const posts = this._getFromStorage('blog_posts');

    return bookmarks
      .slice()
      .sort((a, b) => (this._parseDate(b.bookmarkedAt) || new Date(0)) - (this._parseDate(a.bookmarkedAt) || new Date(0)))
      .map(b => {
        const post = posts.find(p => p.id === b.blogPostId) || null;
        return {
          blogPostId: b.blogPostId,
          title: post ? post.title : '',
          excerpt: post ? post.excerpt || '' : '',
          publishedAt: post ? post.publishedAt || '' : '',
          tags: post && Array.isArray(post.tags) ? post.tags : [],
          // Foreign key resolution: include full blog post object
          blogPost: post
        };
      });
  }

  // ---------------------- 5. Service packages ----------------------

  getServicePackageFilterOptions() {
    const packages = this._getFromStorage('service_packages');

    const categoriesSet = new Set();
    for (const p of packages) {
      if (p.category) categoriesSet.add(p.category);
    }

    const categories = Array.from(categoriesSet).map(c => ({
      value: c,
      label: this._resolveEnumLabels('servicePackage', 'category', c)
    }));

    const prices = packages.map(p => p.basePrice).filter(v => typeof v === 'number' && !isNaN(v));
    let priceRanges = [];
    if (prices.length) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      priceRanges = [
        { value: 'under_500', label: 'Under $500', minPrice: 0, maxPrice: 499 },
        { value: '500_1500', label: '$500–$1,500', minPrice: 500, maxPrice: 1500 },
        { value: 'over_1500', label: 'Over $1,500', minPrice: 1501, maxPrice: null }
      ];
    }

    const sortOptions = [
      { value: 'price_asc', label: 'Price (Low to High)' },
      { value: 'price_desc', label: 'Price (High to Low)' },
      { value: 'sort_order_asc', label: 'Featured Order' }
    ];

    return { categories, priceRanges, sortOptions };
  }

  listServicePackages(filters, sortOption) {
    const packages = this._getFromStorage('service_packages');
    const f = filters || {};

    let results = packages.slice();

    if (typeof f.isActive === 'boolean') {
      results = results.filter(p => !!p.isActive === f.isActive);
    }
    if (f.category) {
      results = results.filter(p => p.category === f.category);
    }
    if (typeof f.minIncludedIllustrations === 'number') {
      results = results.filter(p =>
        typeof p.includedIllustrationsCount === 'number' &&
        p.includedIllustrationsCount >= f.minIncludedIllustrations
      );
    }
    if (typeof f.maxBasePrice === 'number') {
      results = results.filter(p => typeof p.basePrice === 'number' && p.basePrice <= f.maxBasePrice);
    }

    const sort = sortOption || 'sort_order_asc';
    results.sort((a, b) => {
      if (sort === 'price_asc') return (a.basePrice || 0) - (b.basePrice || 0);
      if (sort === 'price_desc') return (b.basePrice || 0) - (a.basePrice || 0);
      // sort_order_asc
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

    return results.map(p => ({
      packageId: p.id,
      name: p.name,
      slug: p.slug || '',
      category: p.category,
      categoryLabel: this._resolveEnumLabels('servicePackage', 'category', p.category),
      description: p.description || '',
      includedIllustrationsCount: p.includedIllustrationsCount || null,
      pagesSupportedMin: p.pagesSupportedMin || null,
      pagesSupportedMax: p.pagesSupportedMax || null,
      basePrice: p.basePrice || 0,
      currency: p.currency,
      currencyLabel: this._resolveEnumLabels('servicePackage', 'currency', p.currency),
      isActive: !!p.isActive
    }));
  }

  getServicePackageDetail(packageId) {
    const pkg = this._getServicePackageById(packageId);
    if (!pkg) return null;

    return {
      packageId: pkg.id,
      name: pkg.name,
      slug: pkg.slug || '',
      category: pkg.category,
      categoryLabel: this._resolveEnumLabels('servicePackage', 'category', pkg.category),
      description: pkg.description || '',
      includedIllustrationsCount: pkg.includedIllustrationsCount || null,
      pagesSupportedMin: pkg.pagesSupportedMin || null,
      pagesSupportedMax: pkg.pagesSupportedMax || null,
      basePrice: pkg.basePrice || 0,
      currency: pkg.currency,
      currencyLabel: this._resolveEnumLabels('servicePackage', 'currency', pkg.currency),
      timelineGuidance: pkg.timelineGuidance || '',
      isActive: !!pkg.isActive
    };
  }

  createPackageRequest(packageId, requestDescription, additionalDetails, clientName, clientEmail) {
    const packages = this._getFromStorage('service_packages');
    const pkg = packages.find(p => p.id === packageId);

    const requests = this._getFromStorage('package_requests');

    const id = this._generateId('pkgreq');
    const request = {
      id,
      packageId,
      requestDescription,
      additionalDetails: additionalDetails || '',
      clientName: clientName || '',
      clientEmail: clientEmail || '',
      status: 'new',
      createdAt: this._nowISO()
    };

    requests.push(request);
    this._saveToStorage('package_requests', requests);

    return {
      success: true,
      packageRequestId: id,
      status: 'new',
      message: pkg ? 'Package request created' : 'Package request created (package not found in catalog)'
    };
  }

  // ---------------------- 6. Products / shop & cart ----------------------

  getProductFilterOptions() {
    const products = this._getFromStorage('products');

    const categoriesSet = new Set();
    const typesSet = new Set();
    const formatsSet = new Set();
    const ageSet = new Set();
    const prices = [];
    const currenciesSet = new Set();

    for (const p of products) {
      if (p.category) categoriesSet.add(p.category);
      if (p.productType) typesSet.add(p.productType);
      if (p.format) formatsSet.add(p.format);
      if (p.targetAgeRange) ageSet.add(p.targetAgeRange);
      if (typeof p.price === 'number') prices.push(p.price);
      if (p.currency) currenciesSet.add(p.currency);
    }

    const categories = Array.from(categoriesSet).map(c => ({
      value: c,
      label: this._resolveEnumLabels('product', 'category', c)
    }));

    const productTypes = Array.from(typesSet).map(t => ({
      value: t,
      label: this._resolveEnumLabels('product', 'productType', t)
    }));

    const formats = Array.from(formatsSet).map(f => ({
      value: f,
      label: this._resolveEnumLabels('product', 'format', f)
    }));

    const targetAgeRanges = Array.from(ageSet).map(a => ({
      value: a,
      label: this._resolveEnumLabels('product', 'targetAgeRange', a)
    }));

    const currency = currenciesSet.size ? Array.from(currenciesSet)[0] : 'usd';
    const priceRange = {
      minPrice: prices.length ? Math.min(...prices) : 0,
      maxPrice: prices.length ? Math.max(...prices) : 0,
      currency,
      currencyLabel: this._resolveEnumLabels('product', 'currency', currency)
    };

    const sortOptions = [
      { value: 'price_asc', label: 'Price (Low to High)' },
      { value: 'price_desc', label: 'Price (High to Low)' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'popularity_desc', label: 'Popularity (High to Low)' }
    ];

    return { categories, productTypes, formats, targetAgeRanges, priceRange, sortOptions };
  }

  searchProducts(filters, sortOption, page, pageSize) {
    const products = this._getFromStorage('products');
    const f = filters || {};

    let results = products.filter(p => p.isActive);

    if (f.category) results = results.filter(p => p.category === f.category);
    if (f.productType) results = results.filter(p => p.productType === f.productType);
    if (f.format) results = results.filter(p => p.format === f.format);
    if (typeof f.isSigned === 'boolean') results = results.filter(p => !!p.isSigned === f.isSigned);
    if (f.targetAgeRange) results = results.filter(p => p.targetAgeRange === f.targetAgeRange);
    if (typeof f.minPrice === 'number') results = results.filter(p => p.price >= f.minPrice);
    if (typeof f.maxPrice === 'number') results = results.filter(p => p.price <= f.maxPrice);
    if (typeof f.inStockOnly === 'boolean' && f.inStockOnly) {
      results = results.filter(p => (p.inStockQuantity || 0) > 0);
    }

    const sort = sortOption || 'price_asc';
    results.sort((a, b) => {
      if (sort === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sort === 'newest_first') {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      }
      if (sort === 'popularity_desc') return (b.popularityScore || 0) - (a.popularityScore || 0);
      // price_asc
      return (a.price || 0) - (b.price || 0);
    });

    const pg = typeof page === 'number' && page > 0 ? page : 1;
    const ps = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const totalPages = Math.max(1, Math.ceil(totalResults / ps));
    const start = (pg - 1) * ps;
    const paged = results.slice(start, start + ps);

    const mapped = paged.map(p => ({
      productId: p.id,
      name: p.name,
      slug: p.slug || '',
      productType: p.productType,
      productTypeLabel: this._resolveEnumLabels('product', 'productType', p.productType),
      category: p.category,
      categoryLabel: this._resolveEnumLabels('product', 'category', p.category),
      format: p.format,
      formatLabel: this._resolveEnumLabels('product', 'format', p.format),
      isSigned: !!p.isSigned,
      targetAgeRange: p.targetAgeRange,
      targetAgeRangeLabel: this._resolveEnumLabels('product', 'targetAgeRange', p.targetAgeRange),
      price: p.price,
      currency: p.currency,
      currencyLabel: this._resolveEnumLabels('product', 'currency', p.currency),
      inStockQuantity: p.inStockQuantity || 0,
      thumbnailUrl: p.thumbnailUrl || p.imageUrl || '',
      popularityScore: p.popularityScore || 0
    }));

    return {
      results: mapped,
      pagination: {
        page: pg,
        pageSize: ps,
        totalResults,
        totalPages
      }
    };
  }

  getProductDetail(productId) {
    const product = this._getProductById(productId);
    if (!product) return null;

    const isMiddleGrade = product.targetAgeRange === 'ages_8_12' || product.targetAgeRange === 'ages_9_12';
    const isMiddleGradeSignedBook =
      product.productType === 'book' && !!product.isSigned && isMiddleGrade;
    const priceThreshold = 25;
    const isUnderPriceThreshold = typeof product.price === 'number' && product.price <= priceThreshold;

    const allProducts = this._getFromStorage('products');
    const relatedProducts = allProducts
      .filter(p => p.id !== product.id && p.category === product.category && p.isActive)
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, 6)
      .map(p => ({
        productId: p.id,
        name: p.name,
        thumbnailUrl: p.thumbnailUrl || p.imageUrl || '',
        price: p.price,
        currency: p.currency
      }));

    return {
      productId: product.id,
      name: product.name,
      slug: product.slug || '',
      description: product.description || '',
      productType: product.productType,
      productTypeLabel: this._resolveEnumLabels('product', 'productType', product.productType),
      category: product.category,
      categoryLabel: this._resolveEnumLabels('product', 'category', product.category),
      format: product.format,
      formatLabel: this._resolveEnumLabels('product', 'format', product.format),
      isSigned: !!product.isSigned,
      targetAgeRange: product.targetAgeRange,
      targetAgeRangeLabel: this._resolveEnumLabels('product', 'targetAgeRange', product.targetAgeRange),
      price: product.price,
      currency: product.currency,
      currencyLabel: this._resolveEnumLabels('product', 'currency', product.currency),
      inStockQuantity: product.inStockQuantity || 0,
      imageUrl: product.imageUrl || '',
      thumbnailUrl: product.thumbnailUrl || product.imageUrl || '',
      isMiddleGradeSignedBook,
      isUnderPriceThreshold,
      popularityScore: product.popularityScore || 0,
      relatedProducts
    };
  }

  addToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const product = this._getProductById(productId);
    if (!product || !product.isActive) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        message: 'Product not found or inactive',
        cartItemCount: 0,
        cartSubtotal: 0
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    let item = cartItems.find(ci => ci.cartId === cart.id && ci.productId === productId);

    if (item) {
      item.quantity += qty;
      item.lineSubtotal = item.unitPrice * item.quantity;
    } else {
      item = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        productId,
        quantity: qty,
        unitPrice: product.price,
        lineSubtotal: product.price * qty,
        addedAt: this._nowISO()
      };
      cartItems.push(item);
    }

    cart.updatedAt = this._nowISO();

    // Save cart and items
    let carts = this._getFromStorage('cart');
    if (!Array.isArray(carts)) carts = [];
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) carts[idx] = cart;
    else carts.push(cart);
    this._saveToStorage('cart', carts);
    this._saveToStorage('cart_items', cartItems);

    // Compute totals for this cart
    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    const cartSubtotal = itemsForCart.reduce((sum, ci) => sum + (ci.lineSubtotal || 0), 0);
    const cartItemCount = itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      success: true,
      cartId: cart.id,
      cartItemId: item.id,
      message: 'Added to cart',
      cartItemCount,
      cartSubtotal
    };
  }

  getCart() {
    const carts = this._getFromStorage('cart');
    const cart = carts.find(c => c.status === 'active');
    if (!cart) {
      return {
        cartId: null,
        status: 'active',
        currency: 'usd',
        currencyLabel: this._resolveEnumLabels('product', 'currency', 'usd'),
        items: [],
        totals: {
          itemCount: 0,
          subtotal: 0,
          estimatedTax: 0,
          estimatedTotal: 0
        }
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    const products = this._getFromStorage('products');

    const items = cartItems.map(ci => {
      const product = products.find(p => p.id === ci.productId) || null;
      return {
        cartItemId: ci.id,
        productId: ci.productId,
        productName: product ? product.name : '',
        formatLabel: product ? this._resolveEnumLabels('product', 'format', product.format) : '',
        isSigned: product ? !!product.isSigned : false,
        targetAgeRangeLabel: product
          ? this._resolveEnumLabels('product', 'targetAgeRange', product.targetAgeRange)
          : '',
        unitPrice: ci.unitPrice,
        quantity: ci.quantity,
        lineSubtotal: ci.lineSubtotal || ci.unitPrice * ci.quantity,
        thumbnailUrl: product ? product.thumbnailUrl || product.imageUrl || '' : '',
        // Foreign key resolution: include full product object
        product
      };
    });

    const subtotal = items.reduce((sum, i) => sum + (i.lineSubtotal || 0), 0);
    const itemCount = items.reduce((sum, i) => sum + (i.quantity || 0), 0);
    const estimatedTax = 0; // could be calculated if needed
    const estimatedTotal = subtotal + estimatedTax;

    return {
      cartId: cart.id,
      status: cart.status,
      currency: cart.currency,
      currencyLabel: this._resolveEnumLabels('product', 'currency', cart.currency),
      items,
      totals: {
        itemCount,
        subtotal,
        estimatedTax,
        estimatedTotal
      }
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return {
        success: false,
        cartId: null,
        cartItemId,
        quantity: 0,
        lineSubtotal: 0,
        totals: {
          itemCount: 0,
          subtotal: 0,
          estimatedTax: 0,
          estimatedTotal: 0
        },
        message: 'Cart item not found'
      };
    }

    if (quantity <= 0) {
      cartItems = cartItems.filter(ci => ci.id !== cartItemId);
      this._saveToStorage('cart_items', cartItems);
    } else {
      item.quantity = quantity;
      item.lineSubtotal = item.unitPrice * quantity;
      this._saveToStorage('cart_items', cartItems);
    }

    const cartId = item.cartId;
    const itemsForCart = cartItems.filter(ci => ci.cartId === cartId);
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.lineSubtotal || 0), 0);
    const itemCount = itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0);
    const estimatedTax = 0;
    const estimatedTotal = subtotal + estimatedTax;

    return {
      success: true,
      cartId,
      cartItemId,
      quantity: quantity > 0 ? quantity : 0,
      lineSubtotal: quantity > 0 ? item.unitPrice * quantity : 0,
      totals: {
        itemCount,
        subtotal,
        estimatedTax,
        estimatedTotal
      },
      message: quantity > 0 ? 'Cart item updated' : 'Cart item removed'
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return {
        success: false,
        cartId: null,
        totals: {
          itemCount: 0,
          subtotal: 0,
          estimatedTax: 0,
          estimatedTotal: 0
        },
        message: 'Cart item not found'
      };
    }

    const cartId = item.cartId;
    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const itemsForCart = cartItems.filter(ci => ci.cartId === cartId);
    const subtotal = itemsForCart.reduce((sum, ci) => sum + (ci.lineSubtotal || 0), 0);
    const itemCount = itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0);
    const estimatedTax = 0;
    const estimatedTotal = subtotal + estimatedTax;

    return {
      success: true,
      cartId,
      totals: {
        itemCount,
        subtotal,
        estimatedTax,
        estimatedTotal
      },
      message: 'Cart item removed'
    };
  }

  getCartItemCount() {
    const carts = this._getFromStorage('cart');
    const cart = carts.find(c => c.status === 'active');
    if (!cart) return { itemCount: 0 };

    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    const itemCount = cartItems.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return { itemCount };
  }

  // ---------------------- 7. Commission inquiries ----------------------

  submitCommissionInquiry(
    projectType,
    serviceLabel,
    clientName,
    clientEmail,
    projectDetails,
    requestedCompletionDate,
    budgetMin,
    budgetMax,
    budgetCurrency,
    heardAbout
  ) {
    const inquiries = this._getFromStorage('commission_inquiries');

    const inquiry = {
      id: this._generateId('comm'),
      projectType,
      serviceLabel: serviceLabel || '',
      clientName,
      clientEmail,
      projectDetails,
      requestedCompletionDate: requestedCompletionDate || null,
      budgetMin: typeof budgetMin === 'number' ? budgetMin : null,
      budgetMax: typeof budgetMax === 'number' ? budgetMax : null,
      budgetCurrency: budgetCurrency || null,
      heardAbout: heardAbout || null,
      status: 'new',
      createdAt: this._nowISO()
    };

    inquiries.push(inquiry);
    this._saveToStorage('commission_inquiries', inquiries);

    return {
      success: true,
      commissionInquiryId: inquiry.id,
      status: 'new',
      message: 'Commission inquiry submitted'
    };
  }

  // ---------------------- 8. Consultations ----------------------

  listConsultationTypes() {
    const types = this._getFromStorage('consultation_types');
    return types
      .filter(t => t.isActive)
      .map(t => ({
        consultationTypeId: t.id,
        name: t.name,
        slug: t.slug || '',
        description: t.description || '',
        durationMinutes: t.durationMinutes,
        price: t.price || 0,
        currency: t.currency || 'usd',
        currencyLabel: this._resolveEnumLabels('servicePackage', 'currency', t.currency || 'usd'),
        isActive: !!t.isActive
      }));
  }

  getConsultationTypeDetail(consultationTypeId) {
    const type = this._getConsultationTypeById(consultationTypeId);
    if (!type) return null;

    return {
      consultationTypeId: type.id,
      name: type.name,
      slug: type.slug || '',
      description: type.description || '',
      durationMinutes: type.durationMinutes,
      price: type.price || 0,
      currency: type.currency || 'usd',
      currencyLabel: this._resolveEnumLabels('servicePackage', 'currency', type.currency || 'usd'),
      isActive: !!type.isActive
    };
  }

  listAvailableConsultationSlots(consultationTypeId, startDate, endDate) {
    const slots = this._getFromStorage('consultation_slots');

    const start = startDate ? this._parseDate(startDate) : null;
    const end = endDate ? this._parseDate(endDate) : null;

    const filtered = slots.filter(slot => {
      if (slot.consultationTypeId !== consultationTypeId) return false;
      if (slot.isBooked) return false;
      const startDT = this._parseDate(slot.startDateTime);
      const endDT = this._parseDate(slot.endDateTime);
      if (!startDT || !endDT) return false;
      if (start && startDT < start) return false;
      if (end && endDT > end) return false;
      return true;
    });

    return filtered.map(slot => {
      const startDT = this._parseDate(slot.startDateTime) || new Date();
      const endDT = this._parseDate(slot.endDateTime) || new Date();
      const weekdayLabel = startDT.toLocaleDateString(undefined, { weekday: 'long' });
      const timeRangeLabel =
        startDT.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) +
        ' – ' +
        endDT.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

      return {
        consultationSlotId: slot.id,
        startDateTime: slot.startDateTime,
        endDateTime: slot.endDateTime,
        weekdayLabel,
        timeRangeLabel,
        timezone: slot.timezone || ''
      };
    });
  }

  createConsultationBooking(
    consultationTypeId,
    consultationSlotId,
    clientName,
    clientEmail,
    notes
  ) {
    const bookings = this._getFromStorage('consultation_bookings');
    const slots = this._getFromStorage('consultation_slots');

    const slot = slots.find(s => s.id === consultationSlotId && s.consultationTypeId === consultationTypeId);
    if (!slot || slot.isBooked) {
      return {
        success: false,
        consultationBookingId: null,
        status: 'pending',
        consultationTypeId,
        consultationSlotId,
        startDateTime: null,
        endDateTime: null,
        message: 'Selected slot is not available'
      };
    }

    const bookingId = this._generateId('cbook');
    const booking = {
      id: bookingId,
      consultationTypeId,
      consultationSlotId,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
      clientName,
      clientEmail,
      notes: notes || '',
      status: 'pending',
      createdAt: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    // Mark slot as booked
    slot.isBooked = true;
    this._saveToStorage('consultation_slots', slots);

    return {
      success: true,
      consultationBookingId: bookingId,
      status: 'pending',
      consultationTypeId,
      consultationSlotId,
      startDateTime: slot.startDateTime,
      endDateTime: slot.endDateTime,
      message: 'Consultation booked'
    };
  }

  // ---------------------- 9. Reader profile & preferences ----------------------

  createReaderProfile(
    displayName,
    email,
    password,
    newsletterFrequency,
    interestChildrensIllustration,
    interestWritingTips,
    interestSelfPublishing,
    interestShopUpdates,
    acceptedTerms
  ) {
    let profiles = this._getFromStorage('reader_profiles');

    if (!acceptedTerms) {
      return {
        success: false,
        readerProfileId: null,
        message: 'Terms must be accepted'
      };
    }

    const now = this._nowISO();

    if (profiles.length) {
      // Update existing single-user profile
      const profile = profiles[0];
      profile.displayName = displayName;
      profile.email = email;
      profile.password = password;
      profile.newsletterFrequency = newsletterFrequency || profile.newsletterFrequency || 'none';
      profile.interestChildrensIllustration = !!interestChildrensIllustration;
      profile.interestWritingTips = !!interestWritingTips;
      profile.interestSelfPublishing = !!interestSelfPublishing;
      profile.interestShopUpdates = !!interestShopUpdates;
      profile.acceptedTerms = true;
      profile.updatedAt = now;

      this._saveToStorage('reader_profiles', profiles);

      return {
        success: true,
        readerProfileId: profile.id,
        message: 'Reader profile updated'
      };
    }

    const id = this._generateId('reader');
    const profile = {
      id,
      displayName,
      email,
      password,
      newsletterFrequency: newsletterFrequency || 'none',
      interestChildrensIllustration: !!interestChildrensIllustration,
      interestWritingTips: !!interestWritingTips,
      interestSelfPublishing: !!interestSelfPublishing,
      interestShopUpdates: !!interestShopUpdates,
      acceptedTerms: true,
      createdAt: now,
      updatedAt: now
    };

    profiles.push(profile);
    this._saveToStorage('reader_profiles', profiles);

    return {
      success: true,
      readerProfileId: id,
      message: 'Reader profile created'
    };
  }

  getReaderProfile() {
    const profile = this._getActiveReaderProfile();
    if (!profile) {
      return {
        exists: false,
        readerProfileId: null,
        displayName: '',
        email: '',
        newsletterFrequency: 'none',
        interestChildrensIllustration: false,
        interestWritingTips: false,
        interestSelfPublishing: false,
        interestShopUpdates: false,
        acceptedTerms: false,
        createdAt: '',
        updatedAt: ''
      };
    }

    return {
      exists: true,
      readerProfileId: profile.id,
      displayName: profile.displayName,
      email: profile.email,
      newsletterFrequency: profile.newsletterFrequency || 'none',
      interestChildrensIllustration: !!profile.interestChildrensIllustration,
      interestWritingTips: !!profile.interestWritingTips,
      interestSelfPublishing: !!profile.interestSelfPublishing,
      interestShopUpdates: !!profile.interestShopUpdates,
      acceptedTerms: !!profile.acceptedTerms,
      createdAt: profile.createdAt || '',
      updatedAt: profile.updatedAt || ''
    };
  }

  updateReaderPreferences(
    newsletterFrequency,
    interestChildrensIllustration,
    interestWritingTips,
    interestSelfPublishing,
    interestShopUpdates
  ) {
    let profiles = this._getFromStorage('reader_profiles');
    if (!profiles.length) {
      return {
        success: false,
        readerProfileId: null,
        message: 'No reader profile exists'
      };
    }

    const profile = profiles[0];
    if (newsletterFrequency != null) profile.newsletterFrequency = newsletterFrequency;
    if (typeof interestChildrensIllustration === 'boolean')
      profile.interestChildrensIllustration = interestChildrensIllustration;
    if (typeof interestWritingTips === 'boolean')
      profile.interestWritingTips = interestWritingTips;
    if (typeof interestSelfPublishing === 'boolean')
      profile.interestSelfPublishing = interestSelfPublishing;
    if (typeof interestShopUpdates === 'boolean')
      profile.interestShopUpdates = interestShopUpdates;
    profile.updatedAt = this._nowISO();

    this._saveToStorage('reader_profiles', profiles);

    return {
      success: true,
      readerProfileId: profile.id,
      message: 'Preferences updated'
    };
  }

  // ---------------------- 10. Saved items overview ----------------------

  getSavedItemsOverview() {
    const favorites = this._getFromStorage('illustration_favorites');
    const illustrations = this._getFromStorage('illustrations');
    const readingList = this._getFromStorage('story_reading_list_items');
    const stories = this._getFromStorage('stories');
    const bookmarks = this._getFromStorage('blog_bookmarks');
    const posts = this._getFromStorage('blog_posts');
    const collections = this._getFromStorage('collections');

    const recentFavorites = favorites
      .slice()
      .sort((a, b) => (this._parseDate(b.createdAt) || new Date(0)) - (this._parseDate(a.createdAt) || new Date(0)))
      .slice(0, 3)
      .map(f => {
        const ill = illustrations.find(i => i.id === f.illustrationId) || null;
        return {
          illustrationId: f.illustrationId,
          title: ill ? ill.title : '',
          thumbnailUrl: ill ? ill.thumbnailUrl || ill.imageUrl || '' : '',
          // Foreign key resolution
          illustration: ill
        };
      });

    const recentReadingListStories = readingList
      .slice()
      .sort((a, b) => (this._parseDate(b.addedAt) || new Date(0)) - (this._parseDate(a.addedAt) || new Date(0)))
      .slice(0, 3)
      .map(r => {
        const story = stories.find(s => s.id === r.storyId) || null;
        return {
          storyId: r.storyId,
          title: story ? story.title : '',
          // Foreign key resolution
          story
        };
      });

    const recentBookmarkedPosts = bookmarks
      .slice()
      .sort((a, b) => (this._parseDate(b.bookmarkedAt) || new Date(0)) - (this._parseDate(a.bookmarkedAt) || new Date(0)))
      .slice(0, 3)
      .map(b => {
        const post = posts.find(p => p.id === b.blogPostId) || null;
        return {
          blogPostId: b.blogPostId,
          title: post ? post.title : '',
          // Foreign key resolution
          blogPost: post
        };
      });

    return {
      favoritesCount: favorites.length,
      readingListCount: readingList.length,
      bookmarkedPostsCount: bookmarks.length,
      collectionsCount: collections.length,
      recentFavorites,
      recentReadingListStories,
      recentBookmarkedPosts
    };
  }

  // ---------------------- 11. About & Policy content ----------------------

  getAboutContent() {
    // Attempt to read from localStorage if present
    const raw = localStorage.getItem('about_content');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        return {
          headline: data.headline || '',
          subheadline: data.subheadline || '',
          bioHtml: data.bioHtml || '',
          specialties: Array.isArray(data.specialties) ? data.specialties : [],
          projectTypes: Array.isArray(data.projectTypes) ? data.projectTypes : [],
          processOverviewHtml: data.processOverviewHtml || '',
          ctaSections: data.ctaSections || {
            viewPortfolio: '',
            contactForCommissions: '',
            bookConsultation: ''
          }
        };
      } catch (e) {
        // fall through to default
      }
    }

    // Minimal default content if none stored; uses no domain mock data
    return {
      headline: 'About the Author & Illustrator',
      subheadline: 'Children\'s stories and artwork for curious young readers.',
      bioHtml: '',
      specialties: [],
      projectTypes: [],
      processOverviewHtml: '',
      ctaSections: {
        viewPortfolio: 'Explore illustration and writing portfolios.',
        contactForCommissions: 'Reach out with your picture book ideas.',
        bookConsultation: 'Schedule a portfolio or project consultation.'
      }
    };
  }

  getPolicyContent(section) {
    const raw = localStorage.getItem('policies');
    let policies = {};
    if (raw) {
      try {
        policies = JSON.parse(raw) || {};
      } catch (e) {
        policies = {};
      }
    }

    const entry = policies[section] || {};

    const titleMap = {
      terms_of_use: 'Terms of Use',
      privacy_policy: 'Privacy Policy',
      cookies: 'Cookie Policy'
    };

    return {
      section,
      title: entry.title || titleMap[section] || 'Policy',
      contentHtml: entry.contentHtml || '',
      lastUpdated: entry.lastUpdated || ''
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
