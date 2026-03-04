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

  // ==========================
  // Storage helpers
  // ==========================

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'productcategories',
      'products',
      'cart',
      'cartitems',
      'productcomparisonlists',
      'workshops',
      'workshopregistrations',
      'artworks',
      'favoriteartworks',
      'commissionrequests',
      'blogposts',
      'readinglistitems',
      'exhibitions',
      'exhibitionreminders',
      'newslettersubscriptions',
      'collections',
      'lookbookdownloads'
    ];

    for (let i = 0; i < arrayKeys.length; i++) {
      const key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
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

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  }

  // ==========================
  // Cart helpers
  // ==========================

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let currentCartId = localStorage.getItem('current_cart_id');
    let cart = null;

    if (currentCartId) {
      cart = carts.find(function (c) { return c.id === currentCartId && c.status === 'active'; }) || null;
    }

    if (!cart) {
      // Try to find any active cart
      cart = carts.find(function (c) { return c.status === 'active'; }) || null;
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }

    localStorage.setItem('current_cart_id', cart.id);
    return cart;
  }

  _getActiveCartOrNull() {
    const carts = this._getFromStorage('cart');
    const currentCartId = localStorage.getItem('current_cart_id');
    if (currentCartId) {
      const existing = carts.find(function (c) { return c.id === currentCartId && c.status === 'active'; }) || null;
      if (existing) return existing;
    }
    return carts.find(function (c) { return c.status === 'active'; }) || null;
  }

  _calculateCartTotals(cartId) {
    const cartItems = this._getFromStorage('cartitems').filter(function (ci) { return ci.cart_id === cartId; });
    let itemCount = cartItems.length;
    let totalQuantity = 0;
    let subtotalAmount = 0;
    for (let i = 0; i < cartItems.length; i++) {
      totalQuantity += cartItems[i].quantity || 0;
      subtotalAmount += cartItems[i].total_price || 0;
    }
    return {
      itemCount: itemCount,
      totalQuantity: totalQuantity,
      subtotalAmount: subtotalAmount,
      totalAmount: subtotalAmount,
      currency: 'usd'
    };
  }

  // ==========================
  // Comparison list helpers
  // ==========================

  _persistProductComparisonList(productIds) {
    let lists = this._getFromStorage('productcomparisonlists');
    let listId = localStorage.getItem('product_comparison_list_id');
    let list = null;
    if (listId) {
      list = lists.find(function (l) { return l.id === listId; }) || null;
    }
    if (!list) {
      list = {
        id: this._generateId('productcomparisonlist'),
        product_ids: [],
        created_at: this._nowIso()
      };
      lists.push(list);
    }
    list.product_ids = Array.isArray(productIds) ? productIds.slice() : [];
    this._saveToStorage('productcomparisonlists', lists);
    localStorage.setItem('product_comparison_list_id', list.id);
    return list;
  }

  _getCurrentComparisonList() {
    const lists = this._getFromStorage('productcomparisonlists');
    const listId = localStorage.getItem('product_comparison_list_id');
    if (listId) {
      return lists.find(function (l) { return l.id === listId; }) || null;
    }
    return null;
  }

  // ==========================
  // Favorites / reading list helpers
  // ==========================

  _resolveFavoritesState() {
    const favoriteArtworks = this._getFromStorage('favoriteartworks');
    const readingListItems = this._getFromStorage('readinglistitems');
    const favSet = new Set();
    const readSet = new Set();
    for (let i = 0; i < favoriteArtworks.length; i++) {
      favSet.add(favoriteArtworks[i].artwork_id);
    }
    for (let j = 0; j < readingListItems.length; j++) {
      readSet.add(readingListItems[j].article_id);
    }
    return {
      favoriteArtworkIds: favSet,
      readingListArticleIds: readSet
    };
  }

  // ==========================
  // Workshop helpers
  // ==========================

  _validateWorkshopCapacity(workshop, spots) {
    if (!workshop) {
      return { ok: false, message: 'Workshop not found.' };
    }
    if (typeof spots !== 'number' || spots <= 0) {
      return { ok: false, message: 'Invalid spots requested.' };
    }
    if (typeof workshop.capacity_remaining === 'number') {
      if (spots > workshop.capacity_remaining) {
        return { ok: false, message: 'Not enough remaining capacity.' };
      }
    }
    return { ok: true, message: 'OK' };
  }

  // ==========================
  // Exhibition reminder helper
  // ==========================

  _scheduleExhibitionReminder(reminder) {
    // Business logic only: actual scheduling is handled elsewhere.
    // This is a stub to satisfy the helper function requirement.
    return reminder;
  }

  // ==========================
  // Product filtering helper
  // ==========================

  _applyProductFiltersAndSorting(products, filters, sortBy) {
    let filtered = Array.isArray(products) ? products.slice() : [];
    filters = filters || {};

    if (typeof filters.minWidthCm === 'number') {
      filtered = filtered.filter(function (p) {
        return typeof p.width_cm === 'number' ? p.width_cm >= filters.minWidthCm : true;
      });
    }
    if (typeof filters.maxWidthCm === 'number') {
      filtered = filtered.filter(function (p) {
        return typeof p.width_cm === 'number' ? p.width_cm <= filters.maxWidthCm : true;
      });
    }
    if (typeof filters.minPrice === 'number') {
      filtered = filtered.filter(function (p) {
        return typeof p.price === 'number' ? p.price >= filters.minPrice : true;
      });
    }
    if (typeof filters.maxPrice === 'number') {
      filtered = filtered.filter(function (p) {
        return typeof p.price === 'number' ? p.price <= filters.maxPrice : true;
      });
    }
    if (typeof filters.minRating === 'number') {
      filtered = filtered.filter(function (p) {
        if (typeof p.rating_average !== 'number') return false;
        return p.rating_average >= filters.minRating;
      });
    }
    if (Array.isArray(filters.colors) && filters.colors.length > 0) {
      filtered = filtered.filter(function (p) {
        const colors = [];
        if (p.dominant_color) colors.push(p.dominant_color);
        if (Array.isArray(p.color_tags)) {
          for (let i = 0; i < p.color_tags.length; i++) {
            colors.push(p.color_tags[i]);
          }
        }
        for (let j = 0; j < filters.colors.length; j++) {
          if (colors.indexOf(filters.colors[j]) !== -1) return true;
        }
        return false;
      });
    }
    if (Array.isArray(filters.sizeLabels) && filters.sizeLabels.length > 0) {
      filtered = filtered.filter(function (p) {
        return p.size_label && filters.sizeLabels.indexOf(p.size_label) !== -1;
      });
    }
    if (filters.query && typeof filters.query === 'string') {
      const q = filters.query.toLowerCase();
      filtered = filtered.filter(function (p) {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
      });
    }

    // Sorting
    if (sortBy === 'price_low_to_high') {
      filtered.sort(function (a, b) {
        return (a.price || 0) - (b.price || 0);
      });
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort(function (a, b) {
        return (b.price || 0) - (a.price || 0);
      });
    } else if (sortBy === 'rating_high_to_low') {
      filtered.sort(function (a, b) {
        return (b.rating_average || 0) - (a.rating_average || 0);
      });
    } else if (sortBy === 'newest_first') {
      filtered.sort(function (a, b) {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    }

    return filtered;
  }

  // ==========================
  // Core interface implementations
  // ==========================

  // getHomepageHighlights
  getHomepageHighlights() {
    const artworks = this._getFromStorage('artworks');
    const products = this._getFromStorage('products');
    const collections = this._getFromStorage('collections');
    const workshops = this._getFromStorage('workshops');
    const blogposts = this._getFromStorage('blogposts');

    // Hero artwork: most recent by created_at
    let heroArtwork = null;
    if (artworks.length > 0) {
      heroArtwork = artworks.slice().sort(function (a, b) {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      })[0];
    }

    const featuredArtworks = artworks.slice().sort(function (a, b) {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    }).slice(0, 4).map(function (a) {
      return {
        artwork_id: a.id,
        title: a.title,
        main_image_url: Array.isArray(a.images) && a.images.length > 0 ? a.images[0] : null,
        year: a.year || null,
        dominant_color: a.dominant_color || null
      };
    });

    const featuredProducts = products.filter(function (p) {
      return p.status === 'active' && p.is_purchasable;
    }).slice(0, 4).map(function (p) {
      return {
        product_id: p.id,
        name: p.name,
        category_id: p.category_id,
        category_name: p.category_id || null,
        main_image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        price: p.price,
        currency: p.currency,
        is_purchasable: !!p.is_purchasable
      };
    });

    let currentCollection = collections.find(function (c) { return !!c.is_current; }) || null;
    if (!currentCollection && collections.length > 0) {
      currentCollection = collections.slice().sort(function (a, b) {
        const ya = a.year || 0;
        const yb = b.year || 0;
        if (yb !== ya) return yb - ya;
        const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
        const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return cb - ca;
      })[0];
    }

    const now = new Date().toISOString();
    const nextWorkshop = workshops.filter(function (w) {
      return w.status === 'upcoming' && w.start_datetime && w.start_datetime >= now;
    }).sort(function (a, b) {
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      return da - db;
    })[0] || null;

    const latestBlogPosts = blogposts.filter(function (p) { return p.status === 'published'; }).sort(function (a, b) {
      const da = new Date(a.published_at).getTime();
      const db = new Date(b.published_at).getTime();
      return db - da;
    }).slice(0, 3).map(function (p) {
      return {
        article_id: p.id,
        title: p.title,
        excerpt: p.excerpt || '',
        published_at: p.published_at
      };
    });

    return {
      hero_artwork: heroArtwork ? {
        artwork_id: heroArtwork.id,
        title: heroArtwork.title,
        main_image_url: Array.isArray(heroArtwork.images) && heroArtwork.images.length > 0 ? heroArtwork.images[0] : null,
        year: heroArtwork.year || null,
        dominant_color: heroArtwork.dominant_color || null,
        excerpt: heroArtwork.description || ''
      } : null,
      featured_artworks: featuredArtworks,
      featured_products: featuredProducts,
      current_collection: currentCollection ? {
        collection_id: currentCollection.id,
        title: currentCollection.title,
        season: currentCollection.season || null,
        year: currentCollection.year || null,
        hero_image: currentCollection.hero_image || null,
        is_current: !!currentCollection.is_current
      } : null,
      next_upcoming_workshop: nextWorkshop ? {
        workshop_id: nextWorkshop.id,
        title: nextWorkshop.title,
        start_datetime: nextWorkshop.start_datetime,
        location_city: nextWorkshop.location_city || null,
        format: nextWorkshop.format
      } : null,
      latest_blog_posts: latestBlogPosts
    };
  }

  // getShopCategories
  getShopCategories() {
    const categories = this._getFromStorage('productcategories');
    const result = categories.slice().sort(function (a, b) {
      const sa = typeof a.sort_order === 'number' ? a.sort_order : 0;
      const sb = typeof b.sort_order === 'number' ? b.sort_order : 0;
      if (sa !== sb) return sa - sb;
      const na = (a.name || '').toLowerCase();
      const nb = (b.name || '').toLowerCase();
      if (na < nb) return -1;
      if (na > nb) return 1;
      return 0;
    }).map(function (c) {
      return {
        category_id: c.id,
        name: c.name,
        description: c.description || '',
        sort_order: typeof c.sort_order === 'number' ? c.sort_order : null
      };
    });
    return result;
  }

  // getProductFilterOptions(categoryId)
  getProductFilterOptions(categoryId) {
    const products = this._getFromStorage('products').filter(function (p) {
      return p.category_id === categoryId && p.status === 'active';
    });

    let minWidth = null;
    let maxWidth = null;
    let minPrice = null;
    let maxPrice = null;
    const sizeSet = new Set();
    const colorSet = new Set();

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      if (typeof p.width_cm === 'number') {
        if (minWidth === null || p.width_cm < minWidth) minWidth = p.width_cm;
        if (maxWidth === null || p.width_cm > maxWidth) maxWidth = p.width_cm;
      }
      if (typeof p.price === 'number') {
        if (minPrice === null || p.price < minPrice) minPrice = p.price;
        if (maxPrice === null || p.price > maxPrice) maxPrice = p.price;
      }
      if (p.size_label) sizeSet.add(p.size_label);
      if (p.dominant_color) colorSet.add(p.dominant_color);
      if (Array.isArray(p.color_tags)) {
        for (let j = 0; j < p.color_tags.length; j++) {
          colorSet.add(p.color_tags[j]);
        }
      }
    }

    const sizeLabels = Array.from(sizeSet).map(function (val) {
      const label = val.charAt(0).toUpperCase() + val.slice(1).replace(/_/g, ' ');
      return { value: val, label: label };
    });

    const colorOptions = Array.from(colorSet).map(function (val) {
      const label = val.replace(/_/g, ' ');
      return {
        key: val,
        label: label.charAt(0).toUpperCase() + label.slice(1)
      };
    });

    const ratingOptions = [
      { min_value: 4, label: '4 stars & up' },
      { min_value: 3, label: '3 stars & up' },
      { min_value: 2, label: '2 stars & up' }
    ];

    const sortOptions = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'rating_high_to_low', label: 'Customer Rating: High to Low' },
      { value: 'newest_first', label: 'Newest First' }
    ];

    return {
      size_filters: {
        min_width_cm: minWidth,
        max_width_cm: maxWidth,
        size_labels: sizeLabels
      },
      price_filters: {
        min_price: minPrice,
        max_price: maxPrice
      },
      color_options: colorOptions,
      rating_options: ratingOptions,
      sort_options: sortOptions
    };
  }

  // getProductsForCategory(categoryId, filters, sortBy, page, pageSize)
  getProductsForCategory(categoryId, filters, sortBy, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    let allProducts = this._getFromStorage('products').filter(function (p) {
      return p.category_id === categoryId && p.status === 'active';
    });
    if (allProducts.length === 0) {
      // Fallback: if no products for this category, use all active products
      allProducts = this._getFromStorage('products').filter(function (p) {
        return p.status === 'active';
      });
    }

    const filteredProducts = this._applyProductFiltersAndSorting(allProducts, filters, sortBy);

    const total = filteredProducts.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = filteredProducts.slice(start, end);

    const categories = this._getFromStorage('productcategories');
    const category = categories.find(function (c) { return c.id === categoryId; }) || null;

    const comparisonList = this._getCurrentComparisonList();
    const comparedIds = new Set(comparisonList ? comparisonList.product_ids : []);

    const productsResult = pageItems.map(function (p) {
      return {
        product_id: p.id,
        name: p.name,
        slug: p.slug || null,
        price: p.price,
        currency: p.currency,
        dominant_color: p.dominant_color || null,
        color_tags: Array.isArray(p.color_tags) ? p.color_tags.slice() : [],
        width_cm: p.width_cm || null,
        height_cm: p.height_cm || null,
        size_label: p.size_label || null,
        rating_average: typeof p.rating_average === 'number' ? p.rating_average : null,
        rating_count: typeof p.rating_count === 'number' ? p.rating_count : null,
        stock_quantity: typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
        is_purchasable: !!p.is_purchasable,
        main_image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        created_at: p.created_at || null,
        in_comparison_list: comparedIds.has(p.id)
      };
    });

    return {
      category: category ? {
        category_id: category.id,
        name: category.name,
        description: category.description || ''
      } : null,
      total_results: total,
      page: page,
      page_size: pageSize,
      products: productsResult
    };
  }

  // updateProductComparisonList(productIds)
  updateProductComparisonList(productIds) {
    if (!Array.isArray(productIds)) {
      productIds = [];
    }
    // Deduplicate
    const uniqueIds = Array.from(new Set(productIds));
    const list = this._persistProductComparisonList(uniqueIds);
    return {
      comparison_list_id: list.id,
      product_count: list.product_ids.length,
      message: 'Comparison list updated.'
    };
  }

  // getProductComparisonDetails()
  getProductComparisonDetails() {
    const list = this._getCurrentComparisonList();
    const products = this._getFromStorage('products');
    const resultProducts = [];
    if (list && Array.isArray(list.product_ids)) {
      for (let i = 0; i < list.product_ids.length; i++) {
        const pid = list.product_ids[i];
        const p = products.find(function (prod) { return prod.id === pid; }) || null;
        if (!p) continue;
        resultProducts.push({
          product_id: p.id,
          name: p.name,
          main_image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
          price: p.price,
          currency: p.currency,
          rating_average: typeof p.rating_average === 'number' ? p.rating_average : null,
          rating_count: typeof p.rating_count === 'number' ? p.rating_count : null,
          dominant_color: p.dominant_color || null,
          width_cm: p.width_cm || null,
          height_cm: p.height_cm || null,
          size_label: p.size_label || null,
          material: p.material || null,
          stock_quantity: typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
          is_purchasable: !!p.is_purchasable
        });
      }
    }

    const comparisonCriteria = ['price', 'size', 'rating', 'color'];

    return {
      products: resultProducts,
      comparison_criteria: comparisonCriteria
    };
  }

  // getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('productcategories');
    const collections = this._getFromStorage('collections');

    const product = products.find(function (p) { return p.id === productId; }) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        collection: null,
        related_products: []
      };
    }

    const category = categories.find(function (c) { return c.id === product.category_id; }) || null;
    const collection = product.collection_id ? collections.find(function (c) { return c.id === product.collection_id; }) || null : null;

    const related = products.filter(function (p) {
      return p.id !== product.id && p.category_id === product.category_id && p.status === 'active';
    }).sort(function (a, b) {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    }).slice(0, 4).map(function (p) {
      return {
        product_id: p.id,
        name: p.name,
        main_image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        price: p.price,
        currency: p.currency,
        category_name: p.category_id || null
      };
    });

    return {
      product: {
        product_id: product.id,
        name: product.name,
        slug: product.slug || null,
        description: product.description || '',
        width_cm: product.width_cm || null,
        height_cm: product.height_cm || null,
        depth_cm: product.depth_cm || null,
        size_label: product.size_label || null,
        price: product.price,
        currency: product.currency,
        dominant_color: product.dominant_color || null,
        color_tags: Array.isArray(product.color_tags) ? product.color_tags.slice() : [],
        material: product.material || null,
        images: Array.isArray(product.images) ? product.images.slice() : [],
        rating_average: typeof product.rating_average === 'number' ? product.rating_average : null,
        rating_count: typeof product.rating_count === 'number' ? product.rating_count : null,
        stock_quantity: typeof product.stock_quantity === 'number' ? product.stock_quantity : null,
        is_purchasable: !!product.is_purchasable,
        created_at: product.created_at || null
      },
      category: category ? {
        category_id: category.id,
        name: category.name
      } : null,
      collection: collection ? {
        collection_id: collection.id,
        title: collection.title,
        season: collection.season || null,
        year: collection.year || null
      } : null,
      related_products: related
    };
  }

  // addToCart(productId, quantity = 1)
  addToCart(productId, quantity) {
    if (typeof quantity !== 'number' || quantity <= 0) {
      quantity = 1;
    }

    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; }) || null;
    if (!product || product.status !== 'active' || !product.is_purchasable) {
      return {
        success: false,
        cart_id: null,
        message: 'Product not available for purchase.',
        item_count: 0,
        total_quantity: 0,
        subtotal_amount: 0,
        currency: 'usd'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cartitems');

    let item = cartItems.find(function (ci) {
      return ci.cart_id === cart.id && ci.product_id === productId;
    }) || null;

    if (item) {
      item.quantity += quantity;
      item.unit_price = product.price;
      item.total_price = item.quantity * item.unit_price;
      item.added_at = item.added_at || this._nowIso();
    } else {
      item = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity,
        unit_price: product.price,
        total_price: product.price * quantity,
        added_at: this._nowIso()
      };
      cartItems.push(item);
    }

    cart.updated_at = this._nowIso();

    this._saveToStorage('cartitems', cartItems);

    const carts = this._getFromStorage('cart');
    const idx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (idx !== -1) {
      carts[idx] = cart;
      this._saveToStorage('cart', carts);
    }

    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      cart_id: cart.id,
      message: 'Item added to cart.',
      item_count: totals.itemCount,
      total_quantity: totals.totalQuantity,
      subtotal_amount: totals.subtotalAmount,
      currency: totals.currency
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getActiveCartOrNull();
    if (!cart) {
      return {
        cart_id: null,
        status: 'active',
        items: [],
        subtotal_amount: 0,
        shipping_estimate: 'Calculated at checkout',
        total_amount: 0,
        currency: 'usd'
      };
    }

    const cartItems = this._getFromStorage('cartitems').filter(function (ci) {
      return ci.cart_id === cart.id;
    });
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('productcategories');

    const items = cartItems.map(function (ci) {
      const product = products.find(function (p) { return p.id === ci.product_id; }) || null;
      const category = product ? categories.find(function (c) { return c.id === product.category_id; }) || null : null;
      return {
        product_id: ci.product_id,
        name: product ? product.name : null,
        main_image_url: product && Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null,
        price: ci.unit_price,
        currency: product ? product.currency : 'usd',
        quantity: ci.quantity,
        total_price: ci.total_price,
        in_stock: product ? (typeof product.stock_quantity === 'number' ? product.stock_quantity > 0 : true) : false,
        category_name: category ? category.name : (product ? product.category_id : null),
        // Foreign key resolution: include full product object
        product: product || null
      };
    });

    const totals = this._calculateCartTotals(cart.id);

    return {
      cart_id: cart.id,
      status: cart.status,
      items: items,
      subtotal_amount: totals.subtotalAmount,
      shipping_estimate: 'Calculated at checkout',
      total_amount: totals.totalAmount,
      currency: totals.currency
    };
  }

  // updateCartItemQuantity(productId, quantity)
  updateCartItemQuantity(productId, quantity) {
    const cart = this._getActiveCartOrNull();
    if (!cart) {
      return {
        success: false,
        message: 'No active cart.',
        cart: null
      };
    }

    let cartItems = this._getFromStorage('cartitems');
    const products = this._getFromStorage('products');
    const product = products.find(function (p) { return p.id === productId; }) || null;

    const idx = cartItems.findIndex(function (ci) {
      return ci.cart_id === cart.id && ci.product_id === productId;
    });

    if (idx === -1) {
      return {
        success: false,
        message: 'Item not found in cart.',
        cart: null
      };
    }

    if (quantity <= 0) {
      cartItems.splice(idx, 1);
    } else {
      const item = cartItems[idx];
      item.quantity = quantity;
      item.unit_price = product ? product.price : item.unit_price;
      item.total_price = item.unit_price * item.quantity;
    }

    cart.updated_at = this._nowIso();

    this._saveToStorage('cartitems', cartItems);

    const carts = this._getFromStorage('cart');
    const cartIdx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (cartIdx !== -1) {
      carts[cartIdx] = cart;
      this._saveToStorage('cart', carts);
    }

    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      message: 'Cart updated.',
      cart: {
        cart_id: cart.id,
        item_count: totals.itemCount,
        total_quantity: totals.totalQuantity,
        subtotal_amount: totals.subtotalAmount,
        total_amount: totals.totalAmount,
        currency: totals.currency
      }
    };
  }

  // removeCartItem(productId)
  removeCartItem(productId) {
    const cart = this._getActiveCartOrNull();
    if (!cart) {
      return {
        success: false,
        message: 'No active cart.',
        cart: null
      };
    }

    let cartItems = this._getFromStorage('cartitems');
    const idx = cartItems.findIndex(function (ci) {
      return ci.cart_id === cart.id && ci.product_id === productId;
    });

    if (idx === -1) {
      const totalsEmpty = this._calculateCartTotals(cart.id);
      return {
        success: false,
        message: 'Item not found in cart.',
        cart: {
          cart_id: cart.id,
          item_count: totalsEmpty.itemCount,
          total_quantity: totalsEmpty.totalQuantity,
          subtotal_amount: totalsEmpty.subtotalAmount,
          total_amount: totalsEmpty.totalAmount,
          currency: totalsEmpty.currency
        }
      };
    }

    cartItems.splice(idx, 1);
    cart.updated_at = this._nowIso();
    this._saveToStorage('cartitems', cartItems);

    const carts = this._getFromStorage('cart');
    const cartIdx = carts.findIndex(function (c) { return c.id === cart.id; });
    if (cartIdx !== -1) {
      carts[cartIdx] = cart;
      this._saveToStorage('cart', carts);
    }

    const totals = this._calculateCartTotals(cart.id);

    return {
      success: true,
      message: 'Item removed from cart.',
      cart: {
        cart_id: cart.id,
        item_count: totals.itemCount,
        total_quantity: totals.totalQuantity,
        subtotal_amount: totals.subtotalAmount,
        total_amount: totals.totalAmount,
        currency: totals.currency
      }
    };
  }

  // getWorkshopsFilters()
  getWorkshopsFilters() {
    const workshops = this._getFromStorage('workshops');
    let earliest = null;
    let latest = null;
    for (let i = 0; i < workshops.length; i++) {
      const w = workshops[i];
      if (!w.start_datetime) continue;
      const date = new Date(w.start_datetime);
      if (isNaN(date.getTime())) continue;
      const isoDate = date.toISOString().slice(0, 10);
      if (!earliest || isoDate < earliest) earliest = isoDate;
      if (!latest || isoDate > latest) latest = isoDate;
    }

    const formatOptions = [
      { value: 'online', label: 'Online' },
      { value: 'in_person', label: 'In-person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const sortOptions = [
      { value: 'date_soonest_first', label: 'Date: Soonest First' },
      { value: 'date_latest_first', label: 'Date: Latest First' }
    ];

    return {
      date_range_defaults: {
        earliest_date: earliest,
        latest_date: latest
      },
      format_options: formatOptions,
      sort_options: sortOptions
    };
  }

  // searchWorkshops(filters, sortBy, page, pageSize)
  searchWorkshops(filters, sortBy, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    const workshops = this._getFromStorage('workshops');
    let result = workshops.slice();

    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;

    const status = filters.status || 'upcoming';

    result = result.filter(function (w) {
      if (status && w.status !== status) return false;
      if (filters.format && w.format !== filters.format) return false;
      if (startDate || endDate) {
        if (!w.start_datetime) return false;
        const d = new Date(w.start_datetime);
        if (isNaN(d.getTime())) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }
      return true;
    });

    if (sortBy === 'date_latest_first') {
      result.sort(function (a, b) {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return db - da;
      });
    } else {
      // default or 'date_soonest_first'
      result.sort(function (a, b) {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return da - db;
      });
    }

    const total = result.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = result.slice(start, end);

    const mapped = pageItems.map(function (w) {
      return {
        workshop_id: w.id,
        title: w.title,
        description_excerpt: (w.description || '').slice(0, 160),
        start_datetime: w.start_datetime || null,
        end_datetime: w.end_datetime || null,
        location_city: w.location_city || null,
        location_venue: w.location_venue || null,
        format: w.format,
        price: w.price || null,
        currency: w.currency || null,
        status: w.status
      };
    });

    return {
      total_results: total,
      page: page,
      page_size: pageSize,
      workshops: mapped
    };
  }

  // getWorkshopDetails(workshopId)
  getWorkshopDetails(workshopId) {
    const workshops = this._getFromStorage('workshops');
    const workshop = workshops.find(function (w) { return w.id === workshopId; }) || null;

    let related = [];
    if (workshop) {
      related = workshops.filter(function (w) {
        return w.id !== workshop.id && w.status === 'upcoming';
      }).sort(function (a, b) {
        const da = a.start_datetime ? new Date(a.start_datetime).getTime() : 0;
        const db = b.start_datetime ? new Date(b.start_datetime).getTime() : 0;
        return da - db;
      }).slice(0, 4).map(function (w) {
        return {
          workshop_id: w.id,
          title: w.title,
          start_datetime: w.start_datetime || null,
          location_city: w.location_city || null,
          format: w.format
        };
      });
    }

    return {
      workshop: workshop ? {
        workshop_id: workshop.id,
        title: workshop.title,
        description: workshop.description || '',
        start_datetime: workshop.start_datetime || null,
        end_datetime: workshop.end_datetime || null,
        location_city: workshop.location_city || null,
        location_venue: workshop.location_venue || null,
        location_address: workshop.location_address || null,
        format: workshop.format,
        capacity_total: typeof workshop.capacity_total === 'number' ? workshop.capacity_total : null,
        capacity_remaining: typeof workshop.capacity_remaining === 'number' ? workshop.capacity_remaining : null,
        price: workshop.price || null,
        currency: workshop.currency || null,
        status: workshop.status
      } : null,
      related_workshops: related
    };
  }

  // registerForWorkshop(workshopId, fullName, email, spots, attendanceType, notes)
  registerForWorkshop(workshopId, fullName, email, spots, attendanceType, notes) {
    const workshops = this._getFromStorage('workshops');
    const workshop = workshops.find(function (w) { return w.id === workshopId; }) || null;

    const validation = this._validateWorkshopCapacity(workshop, spots);
    if (!validation.ok) {
      return {
        success: false,
        registration_id: null,
        status: 'submitted',
        message: validation.message
      };
    }

    const registrations = this._getFromStorage('workshopregistrations');
    const registration = {
      id: this._generateId('workshopregistration'),
      workshop_id: workshopId,
      full_name: fullName,
      email: email,
      spots: spots,
      attendance_type: attendanceType || null,
      notes: notes || '',
      status: 'submitted',
      registered_at: this._nowIso()
    };

    registrations.push(registration);
    this._saveToStorage('workshopregistrations', registrations);

    if (typeof workshop.capacity_remaining === 'number') {
      workshop.capacity_remaining = workshop.capacity_remaining - spots;
      const idx = workshops.findIndex(function (w) { return w.id === workshop.id; });
      if (idx !== -1) {
        workshops[idx] = workshop;
        this._saveToStorage('workshops', workshops);
      }
    }

    return {
      success: true,
      registration_id: registration.id,
      status: registration.status,
      message: 'Workshop registration submitted.'
    };
  }

  // getPortfolioFilters()
  getPortfolioFilters() {
    const artworks = this._getFromStorage('artworks');
    const colorSet = new Set();
    const styleSet = new Set();

    for (let i = 0; i < artworks.length; i++) {
      const a = artworks[i];
      if (a.dominant_color) colorSet.add(a.dominant_color);
      if (Array.isArray(a.style_tags)) {
        for (let j = 0; j < a.style_tags.length; j++) {
          styleSet.add(a.style_tags[j]);
        }
      }
    }

    const colorOptions = Array.from(colorSet).map(function (key) {
      const label = key.replace(/_/g, ' ');
      return {
        key: key,
        label: label.charAt(0).toUpperCase() + label.slice(1)
      };
    });

    const styleOptions = Array.from(styleSet).map(function (key) {
      const label = key.replace(/_/g, ' ');
      return {
        key: key,
        label: label.charAt(0).toUpperCase() + label.slice(1)
      };
    });

    const sortOptions = [
      { value: 'most_recent', label: 'Most Recent' },
      { value: 'oldest_first', label: 'Oldest First' },
      { value: 'title_a_to_z', label: 'Title A to Z' }
    ];

    return {
      color_options: colorOptions,
      style_options: styleOptions,
      sort_options: sortOptions
    };
  }

  // searchArtworks(query, filters, sortBy, page, pageSize)
  searchArtworks(query, filters, sortBy, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 30;

    const artworks = this._getFromStorage('artworks');
    const favoritesState = this._resolveFavoritesState();
    const favoriteIds = favoritesState.favoriteArtworkIds;

    let result = artworks.slice();

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      result = result.filter(function (a) {
        const title = (a.title || '').toLowerCase();
        const desc = (a.description || '').toLowerCase();
        let matches = title.indexOf(q) !== -1 || desc.indexOf(q) !== -1;
        if (!matches && Array.isArray(a.style_tags)) {
          for (let i = 0; i < a.style_tags.length; i++) {
            const tag = (a.style_tags[i] || '').toLowerCase();
            if (tag.indexOf(q) !== -1) {
              matches = true;
              break;
            }
          }
        }
        return matches;
      });
    }

    if (Array.isArray(filters.colors) && filters.colors.length > 0) {
      result = result.filter(function (a) {
        return a.dominant_color && filters.colors.indexOf(a.dominant_color) !== -1;
      });
    }

    if (Array.isArray(filters.styleTags) && filters.styleTags.length > 0) {
      result = result.filter(function (a) {
        if (!Array.isArray(a.style_tags)) return false;
        for (let i = 0; i < filters.styleTags.length; i++) {
          if (a.style_tags.indexOf(filters.styleTags[i]) !== -1) return true;
        }
        return false;
      });
    }

    if (typeof filters.minYear === 'number') {
      result = result.filter(function (a) {
        return typeof a.year === 'number' ? a.year >= filters.minYear : true;
      });
    }
    if (typeof filters.maxYear === 'number') {
      result = result.filter(function (a) {
        return typeof a.year === 'number' ? a.year <= filters.maxYear : true;
      });
    }

    if (sortBy === 'oldest_first') {
      result.sort(function (a, b) {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return da - db;
      });
    } else if (sortBy === 'title_a_to_z') {
      result.sort(function (a, b) {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      });
    } else {
      // default or 'most_recent'
      result.sort(function (a, b) {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    }

    const total = result.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = result.slice(start, end);

    const mapped = pageItems.map(function (a) {
      return {
        artwork_id: a.id,
        title: a.title,
        year: a.year || null,
        dominant_color: a.dominant_color || null,
        style_tags: Array.isArray(a.style_tags) ? a.style_tags.slice() : [],
        main_image_url: Array.isArray(a.images) && a.images.length > 0 ? a.images[0] : null,
        created_at: a.created_at || null,
        is_favorited: favoriteIds.has(a.id)
      };
    });

    return {
      total_results: total,
      page: page,
      page_size: pageSize,
      artworks: mapped
    };
  }

  // getArtworkDetails(artworkId)
  getArtworkDetails(artworkId) {
    const artworks = this._getFromStorage('artworks');
    const collections = this._getFromStorage('collections');
    const favoritesState = this._resolveFavoritesState();

    const artwork = artworks.find(function (a) { return a.id === artworkId; }) || null;
    if (!artwork) {
      return {
        artwork: null,
        collection: null,
        is_favorited: false,
        related_artworks: []
      };
    }

    const collection = artwork.collection_id ? collections.find(function (c) { return c.id === artwork.collection_id; }) || null : null;

    const related = artworks.filter(function (a) {
      if (a.id === artwork.id) return false;
      if (artwork.collection_id && a.collection_id === artwork.collection_id) return true;
      if (artwork.dominant_color && a.dominant_color === artwork.dominant_color) return true;
      return false;
    }).slice(0, 6).map(function (a) {
      return {
        artwork_id: a.id,
        title: a.title,
        main_image_url: Array.isArray(a.images) && a.images.length > 0 ? a.images[0] : null,
        year: a.year || null
      };
    });

    return {
      artwork: {
        artwork_id: artwork.id,
        title: artwork.title,
        slug: artwork.slug || null,
        description: artwork.description || '',
        year: artwork.year || null,
        width_cm: artwork.width_cm || null,
        height_cm: artwork.height_cm || null,
        materials: artwork.materials || '',
        dominant_color: artwork.dominant_color || null,
        style_tags: Array.isArray(artwork.style_tags) ? artwork.style_tags.slice() : [],
        images: Array.isArray(artwork.images) ? artwork.images.slice() : [],
        is_for_sale: !!artwork.is_for_sale,
        created_at: artwork.created_at || null
      },
      collection: collection ? {
        collection_id: collection.id,
        title: collection.title,
        season: collection.season || null,
        year: collection.year || null
      } : null,
      is_favorited: favoritesState.favoriteArtworkIds.has(artwork.id),
      related_artworks: related
    };
  }

  // toggleFavoriteArtwork(artworkId, favorite = true)
  toggleFavoriteArtwork(artworkId, favorite) {
    if (typeof favorite === 'undefined') favorite = true;
    let favorites = this._getFromStorage('favoriteartworks');
    const idx = favorites.findIndex(function (f) { return f.artwork_id === artworkId; });

    let isFavorited = false;
    if (favorite) {
      if (idx === -1) {
        favorites.push({
          id: this._generateId('favoriteartwork'),
          artwork_id: artworkId,
          saved_at: this._nowIso()
        });
      }
      isFavorited = true;
    } else {
      if (idx !== -1) {
        favorites.splice(idx, 1);
      }
      isFavorited = false;
    }

    this._saveToStorage('favoriteartworks', favorites);

    return {
      success: true,
      is_favorited: isFavorited,
      message: favorite ? 'Artwork added to favorites.' : 'Artwork removed from favorites.'
    };
  }

  // getCommissionFormOptions()
  getCommissionFormOptions() {
    const projectTypeOptions = [
      { value: 'home_decor_wall_hanging', label: 'Home Décor Wall Hanging' },
      { value: 'wearable_art', label: 'Wearable Art' },
      { value: 'installation', label: 'Installation' },
      { value: 'other', label: 'Other' }
    ];

    const sizeOptionTypes = [
      { value: 'preset', label: 'Preset size' },
      { value: 'custom', label: 'Custom size' }
    ];

    const sizePresets = [
      { value: 'small', label: 'Small', dimensions_hint: 'around 30 x 40 cm' },
      { value: 'medium', label: 'Medium', dimensions_hint: 'around 60 x 80 cm' },
      { value: 'large', label: 'Large', dimensions_hint: 'around 90 x 120 cm' }
    ];

    const budgetRangeOptions = [
      { value: 'under_500', label: 'Under $500' },
      { value: '500_700', label: '$500–$700' },
      { value: '700_1000', label: '$700–$1000' },
      { value: 'over_1000', label: 'Over $1000' }
    ];

    const preferredContactMethodOptions = [
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' }
    ];

    return {
      project_type_options: projectTypeOptions,
      size_option_types: sizeOptionTypes,
      size_presets: sizePresets,
      budget_range_options: budgetRangeOptions,
      preferred_contact_method_options: preferredContactMethodOptions
    };
  }

  // submitCommissionRequest(...)
  submitCommissionRequest(
    projectType,
    sizeOptionType,
    sizePreset,
    sizeCustomText,
    budgetAmount,
    budgetRange,
    deadlineDate,
    description,
    contactName,
    contactEmail,
    contactPhone,
    preferredContactMethod
  ) {
    const requests = this._getFromStorage('commissionrequests');
    const deadline = this._parseDate(deadlineDate);

    const request = {
      id: this._generateId('commissionrequest'),
      project_type: projectType,
      size_option_type: sizeOptionType || null,
      size_preset: sizePreset || null,
      size_custom_text: sizeCustomText || null,
      budget_amount: budgetAmount,
      budget_currency: 'usd',
      budget_range: budgetRange || null,
      deadline_date: deadline ? deadline.toISOString() : null,
      description: description || '',
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      preferred_contact_method: preferredContactMethod || null,
      status: 'submitted',
      submitted_at: this._nowIso()
    };

    requests.push(request);
    this._saveToStorage('commissionrequests', requests);

    return {
      success: true,
      commission_request_id: request.id,
      status: request.status,
      message: 'Commission request submitted.'
    };
  }

  // getBlogFilters()
  getBlogFilters() {
    const posts = this._getFromStorage('blogposts').filter(function (p) { return p.status === 'published'; });
    const tagSet = new Set();
    let minDate = null;

    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      if (Array.isArray(p.tags)) {
        for (let j = 0; j < p.tags.length; j++) {
          tagSet.add(p.tags[j]);
        }
      }
      if (p.published_at) {
        const d = new Date(p.published_at);
        if (!isNaN(d.getTime())) {
          const iso = d.toISOString().slice(0, 10);
          if (!minDate || iso < minDate) minDate = iso;
        }
      }
    }

    const tagOptions = Array.from(tagSet).map(function (tag) {
      const key = tag.toLowerCase().replace(/\s+/g, '_');
      return {
        key: key,
        label: tag
      };
    });

    const sortOptions = [
      { value: 'newest_first', label: 'Newest First' },
      { value: 'oldest_first', label: 'Oldest First' },
      { value: 'title_a_to_z', label: 'Title A to Z' }
    ];

    return {
      tag_options: tagOptions,
      sort_options: sortOptions,
      min_published_date_available: minDate
    };
  }

  // searchBlogPosts(query, minPublishedDate, sortBy, page, pageSize)
  searchBlogPosts(query, minPublishedDate, sortBy, page, pageSize) {
    page = page || 1;
    pageSize = pageSize || 20;
    const posts = this._getFromStorage('blogposts').filter(function (p) { return p.status === 'published'; });
    const readingState = this._resolveFavoritesState();
    const savedIds = readingState.readingListArticleIds;

    let result = posts.slice();

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      result = result.filter(function (p) {
        const title = (p.title || '').toLowerCase();
        const content = (p.content || '').toLowerCase();
        const excerpt = (p.excerpt || '').toLowerCase();
        if (title.indexOf(q) !== -1 || content.indexOf(q) !== -1 || excerpt.indexOf(q) !== -1) return true;
        if (Array.isArray(p.tags)) {
          for (let i = 0; i < p.tags.length; i++) {
            if ((p.tags[i] || '').toLowerCase().indexOf(q) !== -1) return true;
          }
        }
        return false;
      });
    }

    let minDate = null;
    if (minPublishedDate) {
      minDate = new Date(minPublishedDate);
    }

    if (minDate) {
      result = result.filter(function (p) {
        if (!p.published_at) return false;
        const d = new Date(p.published_at);
        if (isNaN(d.getTime())) return false;
        return d >= minDate;
      });
    }

    if (sortBy === 'oldest_first') {
      result.sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return da - db;
      });
    } else if (sortBy === 'title_a_to_z') {
      result.sort(function (a, b) {
        const ta = (a.title || '').toLowerCase();
        const tb = (b.title || '').toLowerCase();
        if (ta < tb) return -1;
        if (ta > tb) return 1;
        return 0;
      });
    } else {
      // default or 'newest_first'
      result.sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      });
    }

    const total = result.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = result.slice(start, end);

    const mapped = pageItems.map(function (p) {
      return {
        article_id: p.id,
        title: p.title,
        slug: p.slug || null,
        excerpt: p.excerpt || '',
        published_at: p.published_at || null,
        tags: Array.isArray(p.tags) ? p.tags.slice() : [],
        reading_time_minutes: typeof p.reading_time_minutes === 'number' ? p.reading_time_minutes : null,
        is_saved: savedIds.has(p.id)
      };
    });

    return {
      total_results: total,
      page: page,
      page_size: pageSize,
      posts: mapped
    };
  }

  // getBlogPostDetails(articleId)
  getBlogPostDetails(articleId) {
    const posts = this._getFromStorage('blogposts');
    const post = posts.find(function (p) { return p.id === articleId; }) || null;
    const readingState = this._resolveFavoritesState();

    let related = [];
    if (post) {
      const tagSet = new Set(Array.isArray(post.tags) ? post.tags : []);
      related = posts.filter(function (p) {
        if (p.id === post.id) return false;
        if (!Array.isArray(p.tags)) return false;
        for (let i = 0; i < p.tags.length; i++) {
          if (tagSet.has(p.tags[i])) return true;
        }
        return false;
      }).slice(0, 4).map(function (p) {
        return {
          article_id: p.id,
          title: p.title,
          published_at: p.published_at || null
        };
      });
    }

    return {
      post: post ? {
        article_id: post.id,
        title: post.title,
        slug: post.slug || null,
        content_html: post.content || '',
        excerpt: post.excerpt || '',
        published_at: post.published_at || null,
        tags: Array.isArray(post.tags) ? post.tags.slice() : [],
        hero_image: post.hero_image || null,
        reading_time_minutes: typeof post.reading_time_minutes === 'number' ? post.reading_time_minutes : null
      } : null,
      is_saved: readingState.readingListArticleIds.has(articleId),
      related_posts: related
    };
  }

  // saveArticleToReadingList(articleId, save = true)
  saveArticleToReadingList(articleId, save) {
    if (typeof save === 'undefined') save = true;
    let items = this._getFromStorage('readinglistitems');
    const idx = items.findIndex(function (i) { return i.article_id === articleId; });

    let isSaved = false;
    if (save) {
      if (idx === -1) {
        items.push({
          id: this._generateId('readinglistitem'),
          article_id: articleId,
          saved_at: this._nowIso()
        });
      }
      isSaved = true;
    } else {
      if (idx !== -1) {
        items.splice(idx, 1);
      }
      isSaved = false;
    }

    this._saveToStorage('readinglistitems', items);

    return {
      success: true,
      is_saved: isSaved,
      message: save ? 'Article saved to reading list.' : 'Article removed from reading list.'
    };
  }

  // getExhibitionFilters()
  getExhibitionFilters() {
    const exhibitions = this._getFromStorage('exhibitions');
    const citySet = new Set();
    let minYear = null;
    let maxYear = null;

    for (let i = 0; i < exhibitions.length; i++) {
      const e = exhibitions[i];
      if (e.city) citySet.add(e.city);
      if (e.start_date) {
        const d = new Date(e.start_date);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          if (minYear === null || year < minYear) minYear = year;
          if (maxYear === null || year > maxYear) maxYear = year;
        }
      }
    }

    const cityOptions = Array.from(citySet).map(function (city) {
      return { city: city, label: city };
    });

    const sortOptions = [
      { value: 'date_newest_first', label: 'Date: Newest First' },
      { value: 'date_oldest_first', label: 'Date: Oldest First' }
    ];

    return {
      city_options: cityOptions,
      year_range: {
        min_year: minYear,
        max_year: maxYear
      },
      sort_options: sortOptions
    };
  }

  // searchExhibitions(filters, sortBy, page, pageSize)
  searchExhibitions(filters, sortBy, page, pageSize) {
    filters = filters || {};
    page = page || 1;
    pageSize = pageSize || 20;

    const exhibitions = this._getFromStorage('exhibitions');
    const collections = this._getFromStorage('collections');

    let result = exhibitions.slice();

    result = result.filter(function (e) {
      if (filters.city && e.city !== filters.city) return false;
      if (typeof filters.startYear === 'number' || typeof filters.endYear === 'number') {
        if (!e.start_date) return false;
        const d = new Date(e.start_date);
        if (isNaN(d.getTime())) return false;
        const year = d.getFullYear();
        if (typeof filters.startYear === 'number' && year < filters.startYear) return false;
        if (typeof filters.endYear === 'number' && year > filters.endYear) return false;
      }
      return true;
    });

    if (sortBy === 'date_oldest_first') {
      result.sort(function (a, b) {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return da - db;
      });
    } else {
      result.sort(function (a, b) {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return db - da;
      });
    }

    const total = result.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = result.slice(start, end);

    const mapped = pageItems.map(function (e) {
      const col = e.associated_collection_id ? collections.find(function (c) { return c.id === e.associated_collection_id; }) || null : null;
      return {
        exhibition_id: e.id,
        title: e.title,
        venue_name: e.venue_name || null,
        venue_address: e.venue_address || null,
        city: e.city,
        country: e.country || null,
        start_date: e.start_date || null,
        end_date: e.end_date || null,
        is_current: !!e.is_current,
        associated_collection_title: col ? col.title : null
      };
    });

    return {
      total_results: total,
      page: page,
      page_size: pageSize,
      exhibitions: mapped
    };
  }

  // getExhibitionDetails(exhibitionId)
  getExhibitionDetails(exhibitionId) {
    const exhibitions = this._getFromStorage('exhibitions');
    const collections = this._getFromStorage('collections');
    const artworks = this._getFromStorage('artworks');

    const exhibition = exhibitions.find(function (e) { return e.id === exhibitionId; }) || null;
    if (!exhibition) {
      return {
        exhibition: null,
        associated_collection: null,
        featured_artworks: []
      };
    }

    const collection = exhibition.associated_collection_id ? collections.find(function (c) { return c.id === exhibition.associated_collection_id; }) || null : null;

    let featured = [];
    if (collection) {
      featured = artworks.filter(function (a) { return a.collection_id === collection.id; }).slice(0, 6).map(function (a) {
        return {
          artwork_id: a.id,
          title: a.title,
          main_image_url: Array.isArray(a.images) && a.images.length > 0 ? a.images[0] : null
        };
      });
    }

    return {
      exhibition: {
        exhibition_id: exhibition.id,
        title: exhibition.title,
        description: exhibition.description || '',
        venue_name: exhibition.venue_name || null,
        venue_address: exhibition.venue_address || null,
        city: exhibition.city,
        country: exhibition.country || null,
        start_date: exhibition.start_date || null,
        end_date: exhibition.end_date || null
      },
      associated_collection: collection ? {
        collection_id: collection.id,
        title: collection.title,
        season: collection.season || null,
        year: collection.year || null
      } : null,
      featured_artworks: featured
    };
  }

  // createExhibitionReminder(exhibitionId, email, reminderType, reminderOffsetDays, reminderDatetime)
  createExhibitionReminder(exhibitionId, email, reminderType, reminderOffsetDays, reminderDatetime) {
    const reminders = this._getFromStorage('exhibitionreminders');
    const reminder = {
      id: this._generateId('exhibitionreminder'),
      exhibition_id: exhibitionId,
      email: email,
      reminder_type: reminderType,
      reminder_offset_days: reminderType === 'offset_days' ? (typeof reminderOffsetDays === 'number' ? reminderOffsetDays : null) : null,
      reminder_datetime: reminderType === 'specific_date' ? (reminderDatetime || null) : null,
      created_at: this._nowIso()
    };

    reminders.push(reminder);
    this._saveToStorage('exhibitionreminders', reminders);

    this._scheduleExhibitionReminder(reminder);

    return {
      success: true,
      reminder_id: reminder.id,
      message: 'Exhibition reminder created.'
    };
  }

  // getNewsletterPreferencesOptions()
  getNewsletterPreferencesOptions() {
    const contentOptions = [
      {
        key: 'workshops',
        label: 'Workshops',
        description: 'Updates about upcoming textile workshops and events.'
      },
      {
        key: 'new_artwork_releases',
        label: 'New Artwork Releases',
        description: 'Be the first to see new textile artworks and collections.'
      },
      {
        key: 'discounts_sales_promotions',
        label: 'Discounts, Sales & Promotions',
        description: 'Occasional special offers and promotions.'
      }
    ];

    const frequencyOptions = [
      { value: 'weekly', label: 'Weekly', description: 'Frequent updates each week.' },
      { value: 'monthly', label: 'Monthly', description: 'A monthly newsletter.' },
      { value: 'monthly_digest', label: 'Monthly Digest', description: 'Monthly highlights only.' },
      { value: 'quarterly', label: 'Quarterly', description: 'A seasonal roundup.' }
    ];

    return {
      content_preferences_options: contentOptions,
      frequency_options: frequencyOptions
    };
  }

  // subscribeToNewsletter(email, name, contentPreferences, frequency, agreedToTerms)
  subscribeToNewsletter(email, name, contentPreferences, frequency, agreedToTerms) {
    if (!agreedToTerms) {
      return {
        success: false,
        subscription_id: null,
        status: 'unsubscribed',
        message: 'You must agree to the terms to subscribe.'
      };
    }

    const allowedFrequencies = new Set(['weekly', 'monthly', 'monthly_digest', 'quarterly']);
    if (!allowedFrequencies.has(frequency)) {
      return {
        success: false,
        subscription_id: null,
        status: 'unsubscribed',
        message: 'Invalid frequency.'
      };
    }

    const allowedPrefs = new Set(['workshops', 'new_artwork_releases', 'discounts_sales_promotions']);
    const prefs = Array.isArray(contentPreferences) ? contentPreferences.filter(function (p) { return allowedPrefs.has(p); }) : [];

    let subs = this._getFromStorage('newslettersubscriptions');
    let sub = subs.find(function (s) { return s.email === email; }) || null;

    if (!sub) {
      sub = {
        id: this._generateId('newslettersubscription'),
        email: email,
        name: name || null,
        content_preferences: prefs,
        frequency: frequency,
        agreed_to_terms: !!agreedToTerms,
        status: 'active',
        subscribed_at: this._nowIso()
      };
      subs.push(sub);
    } else {
      sub.name = name || sub.name;
      sub.content_preferences = prefs;
      sub.frequency = frequency;
      sub.agreed_to_terms = !!agreedToTerms;
      sub.status = 'active';
    }

    this._saveToStorage('newslettersubscriptions', subs);

    return {
      success: true,
      subscription_id: sub.id,
      status: sub.status,
      message: 'Subscribed to newsletter.'
    };
  }

  // getCollectionsOverview(sortBy)
  getCollectionsOverview(sortBy) {
    const collections = this._getFromStorage('collections');
    let result = collections.slice();

    if (sortBy === 'oldest_first') {
      result.sort(function (a, b) {
        const ya = a.year || 0;
        const yb = b.year || 0;
        if (ya !== yb) return ya - yb;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
    } else if (sortBy === 'custom') {
      result.sort(function (a, b) {
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
    } else {
      // default or 'newest_first'
      result.sort(function (a, b) {
        const ya = a.year || 0;
        const yb = b.year || 0;
        if (yb !== ya) return yb - ya;
        return (a.sort_order || 0) - (b.sort_order || 0);
      });
    }

    const mapped = result.map(function (c) {
      return {
        collection_id: c.id,
        title: c.title,
        season: c.season || null,
        year: c.year || null,
        hero_image: c.hero_image || null,
        description: c.description || '',
        is_current: !!c.is_current,
        sort_order: typeof c.sort_order === 'number' ? c.sort_order : null
      };
    });

    const current = collections.find(function (c) { return !!c.is_current; }) || null;

    return {
      current_collection_id: current ? current.id : null,
      current_collection: current ? {
        collection_id: current.id,
        title: current.title,
        season: current.season || null,
        year: current.year || null,
        hero_image: current.hero_image || null,
        description: current.description || '',
        is_current: !!current.is_current,
        sort_order: typeof current.sort_order === 'number' ? current.sort_order : null
      } : null,
      collections: mapped
    };
  }

  // getCollectionDetails(collectionId)
  getCollectionDetails(collectionId) {
    const collections = this._getFromStorage('collections');
    const artworks = this._getFromStorage('artworks');
    const products = this._getFromStorage('products');

    const collection = collections.find(function (c) { return c.id === collectionId; }) || null;
    if (!collection) {
      return {
        collection: null,
        artworks: [],
        products: []
      };
    }

    const collectionArtworks = artworks.filter(function (a) { return a.collection_id === collection.id; });

    const artworksMapped = collectionArtworks.map(function (a) {
      // Best-effort link to a product: match by collection_id and same title
      const linked = products.find(function (p) {
        return p.collection_id === collection.id && p.name === a.title;
      }) || null;
      return {
        artwork_id: a.id,
        title: a.title,
        main_image_url: Array.isArray(a.images) && a.images.length > 0 ? a.images[0] : null,
        is_for_sale: !!a.is_for_sale,
        linked_product_id: linked ? linked.id : null,
        // Foreign key resolution
        artwork: a,
        linked_product: linked
      };
    });

    const productsMapped = products.filter(function (p) { return p.collection_id === collection.id; }).map(function (p) {
      return {
        product_id: p.id,
        name: p.name,
        main_image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
        price: p.price,
        currency: p.currency,
        category_name: p.category_id || null
      };
    });

    return {
      collection: {
        collection_id: collection.id,
        title: collection.title,
        season: collection.season || null,
        year: collection.year || null,
        description: collection.description || '',
        hero_image: collection.hero_image || null,
        is_current: !!collection.is_current,
        lookbook_available: !!collection.lookbook_pdf_url
      },
      artworks: artworksMapped,
      products: productsMapped
    };
  }

  // requestLookbookDownload(collectionId, name, email, purpose)
  requestLookbookDownload(collectionId, name, email, purpose) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find(function (c) { return c.id === collectionId; }) || null;

    const downloads = this._getFromStorage('lookbookdownloads');
    const download = {
      id: this._generateId('lookbookdownload'),
      collection_id: collectionId,
      name: name,
      email: email,
      purpose: purpose,
      requested_at: this._nowIso()
    };

    downloads.push(download);
    this._saveToStorage('lookbookdownloads', downloads);

    const downloadReady = !!(collection && collection.lookbook_pdf_url);

    return {
      success: true,
      message: downloadReady ? 'Lookbook download ready.' : 'Lookbook request recorded.',
      download_ready: downloadReady
    };
  }

  // getSavedItems()
  getSavedItems() {
    const favorites = this._getFromStorage('favoriteartworks');
    const artworks = this._getFromStorage('artworks');
    const readingItems = this._getFromStorage('readinglistitems');
    const blogposts = this._getFromStorage('blogposts');

    const favoriteArtworks = favorites.slice().sort(function (a, b) {
      const da = a.saved_at ? new Date(a.saved_at).getTime() : 0;
      const db = b.saved_at ? new Date(b.saved_at).getTime() : 0;
      return db - da;
    }).map(function (f) {
      const art = artworks.find(function (a) { return a.id === f.artwork_id; }) || null;
      return {
        artwork_id: f.artwork_id,
        title: art ? art.title : null,
        main_image_url: art && Array.isArray(art.images) && art.images.length > 0 ? art.images[0] : null,
        year: art ? art.year : null,
        dominant_color: art ? art.dominant_color : null,
        saved_at: f.saved_at,
        // Foreign key resolution
        artwork: art
      };
    });

    const readingListArticles = readingItems.slice().sort(function (a, b) {
      const da = a.saved_at ? new Date(a.saved_at).getTime() : 0;
      const db = b.saved_at ? new Date(b.saved_at).getTime() : 0;
      return db - da;
    }).map(function (r) {
      const post = blogposts.find(function (p) { return p.id === r.article_id; }) || null;
      return {
        article_id: r.article_id,
        title: post ? post.title : null,
        excerpt: post ? (post.excerpt || '') : '',
        published_at: post ? post.published_at : null,
        saved_at: r.saved_at,
        // Foreign key resolution
        article: post
      };
    });

    return {
      favorite_artworks: favoriteArtworks,
      reading_list_articles: readingListArticles
    };
  }

  // removeFavoriteArtwork(artworkId)
  removeFavoriteArtwork(artworkId) {
    let favorites = this._getFromStorage('favoriteartworks');
    const idx = favorites.findIndex(function (f) { return f.artwork_id === artworkId; });
    if (idx !== -1) {
      favorites.splice(idx, 1);
      this._saveToStorage('favoriteartworks', favorites);
      return {
        success: true,
        message: 'Artwork removed from favorites.'
      };
    }
    return {
      success: false,
      message: 'Artwork not found in favorites.'
    };
  }

  // removeReadingListItem(articleId)
  removeReadingListItem(articleId) {
    let items = this._getFromStorage('readinglistitems');
    const idx = items.findIndex(function (i) { return i.article_id === articleId; });
    if (idx !== -1) {
      items.splice(idx, 1);
      this._saveToStorage('readinglistitems', items);
      return {
        success: true,
        message: 'Article removed from reading list.'
      };
    }
    return {
      success: false,
      message: 'Article not found in reading list.'
    };
  }

  // getAboutArtistContent()
  getAboutArtistContent() {
    const key = 'about_artist_content';
    const raw = localStorage.getItem(key);
    let data = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch (e) {
        data = null;
      }
    }

    if (!data) {
      // Default empty structure, no mock biography
      data = {
        biography_html: '',
        artist_statement_html: '',
        techniques_summary: '',
        notable_exhibitions: [],
        notable_collections: [],
        call_to_action_targets: {
          has_commissions_link: false,
          has_newsletter_link: false,
          has_portfolio_link: false,
          has_shop_link: false
        }
      };
    }

    return data;
  }

  // getGlobalCounts()
  getGlobalCounts() {
    const cart = this._getActiveCartOrNull();
    let cartItemCount = 0;
    if (cart) {
      const cartItems = this._getFromStorage('cartitems').filter(function (ci) { return ci.cart_id === cart.id; });
      cartItemCount = cartItems.length;
    }
    const favoriteCount = this._getFromStorage('favoriteartworks').length;
    const readingCount = this._getFromStorage('readinglistitems').length;

    return {
      cart_item_count: cartItemCount,
      favorite_artworks_count: favoriteCount,
      reading_list_count: readingCount
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
