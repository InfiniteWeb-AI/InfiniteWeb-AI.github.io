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
    // Legacy/example keys from template
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', JSON.stringify([]));
    }
    if (!localStorage.getItem('products')) {
      localStorage.setItem('products', JSON.stringify([]));
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', JSON.stringify([]));
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', JSON.stringify([]));
    }

    // Data model storage keys
    const tables = [
      'products',
      'product_formats',
      'journal_articles',
      'subjects',
      'lists',
      'list_items',
      'wishlists',
      'wishlist_items',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'profiles',
      'newsletter_subscriptions',
      'contact_requests'
    ];

    tables.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getObjectFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      return parsed && typeof parsed === 'object' ? parsed : defaultValue;
    } catch (e) {
      return defaultValue;
    }
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

  // ---------- Helper: Subjects & hierarchy ----------

  _getSubjectsMap() {
    const subjects = this._getFromStorage('subjects');
    const map = {};
    subjects.forEach((s) => {
      if (s && s.id) map[s.id] = s;
    });
    return map;
  }

  _getSubjectAncestors(subjectId, subjectsMap, cache) {
    if (!subjectId) return [];
    if (!cache[subjectId]) {
      const subject = subjectsMap[subjectId];
      if (!subject) {
        cache[subjectId] = [];
      } else if (subject.parent_subject_id) {
        cache[subjectId] = [subject.parent_subject_id].concat(
          this._getSubjectAncestors(subject.parent_subject_id, subjectsMap, cache)
        );
      } else {
        cache[subjectId] = [];
      }
    }
    return cache[subjectId];
  }

  _subjectIdsMatchFilter(itemSubjectIds, filterSubjectIds, subjectsMap) {
    if (!filterSubjectIds || !filterSubjectIds.length) return true;
    if (!itemSubjectIds || !itemSubjectIds.length) return false;

    const filterSet = new Set(filterSubjectIds);
    const cache = {};

    for (const sid of itemSubjectIds) {
      if (filterSet.has(sid)) return true;
      const ancestors = this._getSubjectAncestors(sid, subjectsMap, cache);
      for (const anc of ancestors) {
        if (filterSet.has(anc)) return true;
      }
    }
    return false;
  }

  // ---------- Helper: Cart / Wishlist / Profile ----------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: this._now(),
        updated_at: this._now()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getOrCreateWishlist() {
    const wishlists = this._getFromStorage('wishlists');
    let wishlist = wishlists[0] || null;
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        name: 'Wishlist',
        created_at: this._now(),
        updated_at: this._now()
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _getOrCreateProfile() {
    const profiles = this._getFromStorage('profiles');
    let profile = profiles[0] || null;
    if (!profile) {
      profile = {
        id: this._generateId('profile'),
        name: null,
        email: null,
        password: null,
        subject_interest_ids: [],
        created_at: this._now(),
        updated_at: this._now()
      };
      profiles.push(profile);
      this._saveToStorage('profiles', profiles);
    }
    return profile;
  }

  _findOrCreateListByNameAndType(name, list_type, description) {
    const lists = this._getFromStorage('lists');
    let list = lists.find(
      (l) => l.name === name && l.list_type === list_type
    );
    if (!list) {
      list = {
        id: this._generateId('list'),
        name,
        description: description || '',
        list_type,
        created_at: this._now(),
        updated_at: this._now()
      };
      lists.push(list);
      this._saveToStorage('lists', lists);
    }
    return list;
  }

  _saveNewsletterSubscriptionInternal(email, topic, frequency, active) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    let sub = subs.find((s) => s.email === email && s.topic === topic);
    if (!sub) {
      sub = {
        id: this._generateId('newsletter_subscription'),
        email,
        topic,
        frequency,
        active: active !== undefined ? !!active : true,
        created_at: this._now(),
        updated_at: this._now()
      };
      subs.push(sub);
    } else {
      sub.frequency = frequency;
      if (active !== undefined) {
        sub.active = !!active;
      }
      sub.updated_at = this._now();
    }
    this._saveToStorage('newsletter_subscriptions', subs);
    return sub;
  }

  // ---------- Helper: Cart totals & summaries ----------

  _getCartItemsForCart(cartId) {
    const cart_items = this._getFromStorage('cart_items');
    return cart_items.filter((ci) => ci.cart_id === cartId);
  }

  _calculateCartTotals(cartItems) {
    let subtotal = 0;
    cartItems.forEach((item) => {
      const line = typeof item.line_total === 'number'
        ? item.line_total
        : (item.unit_price || 0) * (item.quantity || 0);
      subtotal += line;
    });
    const estimated_tax = 0;
    const estimated_shipping = 0;
    const total = subtotal + estimated_tax + estimated_shipping;
    return { subtotal, estimated_tax, estimated_shipping, total };
  }

  _addOrUpdateCartItem(productId, format_type, quantity) {
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const product_formats = this._getFromStorage('product_formats');

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { cart: null, cartItem: null, error: 'Product not found' };
    }

    const format = product_formats.find(
      (pf) => pf.product_id === productId && pf.format_type === format_type
    );
    if (!format) {
      return { cart: null, cartItem: null, error: 'Product format not found' };
    }

    let cartItem = cart_items.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId && ci.format_type === format_type
    );

    if (cartItem) {
      const newQty = quantity;
      cartItem.quantity = newQty;
      cartItem.unit_price = format.price;
      cartItem.line_total = format.price * newQty;
      cartItem.added_at = cartItem.added_at || this._now();
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        format_type,
        quantity,
        unit_price: format.price,
        line_total: format.price * quantity,
        added_at: this._now()
      };
      cart_items.push(cartItem);
    }

    // Save items
    this._saveToStorage('cart_items', cart_items);

    // Update cart timestamp
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].updated_at = this._now();
      this._saveToStorage('carts', carts);
    }

    return { cart, cartItem };
  }

  // =============================================================
  // Interface implementations
  // =============================================================

  // ---------------- Home Page ----------------

  getHomePageContent() {
    const products = this._getFromStorage('products');
    const journal_articles = this._getFromStorage('journal_articles');

    const books = products.filter((p) => p.content_type === 'books');
    const proceedings = products.filter((p) => p.content_type === 'conference_proceedings');

    const sortByRatingThenYear = (a, b) => {
      const ra = a.rating_average || 0;
      const rb = b.rating_average || 0;
      if (rb !== ra) return rb - ra;
      const ya = a.publication_year || 0;
      const yb = b.publication_year || 0;
      return yb - ya;
    };

    const featured_books = books.slice().sort(sortByRatingThenYear).slice(0, 5);
    const featured_conference_proceedings = proceedings
      .slice()
      .sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0))
      .slice(0, 5);

    const featured_articles = journal_articles
      .slice()
      .sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0))
      .slice(0, 5);

    const open_access_highlights = journal_articles
      .filter((a) => a.access_type === 'open_access')
      .sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0))
      .slice(0, 5);

    const newsletter_teaser = {
      default_topic: 'archaeological_reports',
      default_frequency: 'monthly',
      headline: 'Stay updated with monthly archaeological reports from Egypt and beyond.'
    };

    return {
      featured_books,
      featured_articles,
      featured_conference_proceedings,
      open_access_highlights,
      newsletter_teaser
    };
  }

  // ---------------- Search Filters ----------------

  getSearchFilterOptions(content_type) {
    const subjects = this._getFromStorage('subjects');
    const products = this._getFromStorage('products');
    const product_formats = this._getFromStorage('product_formats');
    const journal_articles = this._getFromStorage('journal_articles');

    let formats = [];
    let languages = [];
    let publication_year_range = { min_year: null, max_year: null };
    let price_range = { min_price: null, max_price: null, currency: 'USD' };
    let shipping_options = [];
    let rating_thresholds = [1, 2, 3, 4];
    let access_types = [];
    let sort_options = [];

    if (content_type === 'books' || content_type === 'conference_proceedings') {
      const relevantProducts = products.filter((p) => p.content_type === content_type);

      const years = relevantProducts.map((p) => p.publication_year).filter((y) => typeof y === 'number');
      if (years.length) {
        publication_year_range.min_year = Math.min(...years);
        publication_year_range.max_year = Math.max(...years);
      }

      const langSet = new Set();
      relevantProducts.forEach((p) => {
        if (p.language) langSet.add(p.language);
      });
      languages = Array.from(langSet);

      const formatSet = new Set();
      const shipSet = new Set();
      const prices = [];
      relevantProducts.forEach((p) => {
        const pfForProduct = product_formats.filter((pf) => pf.product_id === p.id);
        pfForProduct.forEach((pf) => {
          formatSet.add(pf.format_type);
          if (pf.shipping_option) shipSet.add(pf.shipping_option);
          if (typeof pf.price === 'number') prices.push(pf.price);
        });
      });

      formats = Array.from(formatSet).map((f) => ({
        value: f,
        label:
          f === 'hardcover'
            ? 'Hardcover'
            : f === 'paperback'
            ? 'Paperback'
            : f === 'ebook'
            ? 'eBook'
            : f
      }));

      shipping_options = Array.from(shipSet).map((s) => ({
        value: s,
        label:
          s === 'free_international_shipping'
            ? 'Free International Shipping'
            : s === 'standard_international_shipping'
            ? 'Standard International Shipping'
            : s === 'no_international_shipping'
            ? 'No International Shipping'
            : s
      }));

      if (prices.length) {
        price_range.min_price = Math.min(...prices);
        price_range.max_price = Math.max(...prices);
      }

      sort_options = [
        { value: 'relevance', label: 'Relevance' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'publication_date_desc', label: 'Publication Date: Newest First' },
        { value: 'publication_date_asc', label: 'Publication Date: Oldest First' }
      ];
    } else if (content_type === 'articles') {
      const years = journal_articles.map((a) => a.publication_year).filter((y) => typeof y === 'number');
      if (years.length) {
        publication_year_range.min_year = Math.min(...years);
        publication_year_range.max_year = Math.max(...years);
      }
      const accessSet = new Set();
      journal_articles.forEach((a) => {
        if (a.access_type) accessSet.add(a.access_type);
      });
      access_types = Array.from(accessSet);

      sort_options = [
        { value: 'relevance', label: 'Relevance' },
        { value: 'publication_date_desc', label: 'Publication Date: Newest First' },
        { value: 'publication_date_asc', label: 'Publication Date: Oldest First' }
      ];
    }

    return {
      subjects,
      formats,
      languages,
      publication_year_range,
      price_range,
      shipping_options,
      rating_thresholds,
      access_types,
      sort_options
    };
  }

  // ---------------- Search Catalog ----------------

  searchCatalogItems(content_type, query, filters, sort, page, page_size) {
    const products = this._getFromStorage('products');
    const product_formats = this._getFromStorage('product_formats');
    const journal_articles = this._getFromStorage('journal_articles');
    const subjects = this._getFromStorage('subjects');
    const subjectsMap = this._getSubjectsMap();

    const q = (query || '').toLowerCase().trim();
    const f = filters || {};
    const pageNum = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;

    let results = [];

    if (content_type === 'books' || content_type === 'conference_proceedings') {
      const relevantProducts = products.filter((p) => p.content_type === content_type);

      let enriched = relevantProducts.map((p) => {
        const pfList = product_formats.filter((pf) => pf.product_id === p.id);
        const format_summaries = pfList.map((pf) => ({
          format_type: pf.format_type,
          price: pf.price,
          currency: pf.currency || 'USD',
          availability_status: pf.availability_status,
          free_international_shipping:
            pf.free_international_shipping === true ||
            pf.shipping_option === 'free_international_shipping',
          sample_chapter_available: !!pf.sample_chapter_available
        }));
        const prices = format_summaries
          .map((fs) => fs.price)
          .filter((v) => typeof v === 'number');
        const lowest_price = prices.length ? Math.min(...prices) : null;
        const highest_price = prices.length ? Math.max(...prices) : null;
        const has_ebook_format = !!pfList.find((pf) => pf.format_type === 'ebook');
        const has_print_format = !!pfList.find(
          (pf) => pf.format_type === 'hardcover' || pf.format_type === 'paperback'
        );
        const any_sample_chapter_available = !!format_summaries.find(
          (fs) => fs.sample_chapter_available
        );
        const subject_names = (p.subject_ids || [])
          .map((sid) => {
            const s = subjectsMap[sid];
            return s ? s.name : null;
          })
          .filter(Boolean);

        return {
          product: p,
          format_summaries,
          lowest_price,
          highest_price,
          has_ebook_format,
          has_print_format,
          any_sample_chapter_available,
          subject_names
        };
      });

      // Text query filter
      if (q) {
        enriched = enriched.filter(({ product }) => {
          const fields = [];
          if (product.title) fields.push(product.title);
          if (product.subtitle) fields.push(product.subtitle);
          if (product.description) fields.push(product.description);
          if (Array.isArray(product.authors)) fields.push(product.authors.join(' '));
          if (Array.isArray(product.editors)) fields.push(product.editors.join(' '));
          if (Array.isArray(product.keywords)) fields.push(product.keywords.join(' '));
          const haystack = fields.join(' ').toLowerCase();
          return haystack.includes(q);
        });
      }

      // Filters
      enriched = enriched.filter((item) => {
        const p = item.product;
        // subjects
        if (
          f.subject_ids &&
          f.subject_ids.length &&
          !this._subjectIdsMatchFilter(p.subject_ids || [], f.subject_ids, subjectsMap)
        ) {
          return false;
        }

        // formats
        if (f.format_types && f.format_types.length) {
          const hasFormat = item.format_summaries.some((fs) =>
            f.format_types.includes(fs.format_type)
          );
          if (!hasFormat) return false;
        }

        // languages
        if (f.languages && f.languages.length) {
          const lang = (p.language || '').toLowerCase();
          const match = f.languages.some((l) => (l || '').toLowerCase() === lang);
          if (!match) return false;
        }

        // publication year
        if (
          typeof f.publication_year_from === 'number' &&
          p.publication_year < f.publication_year_from
        ) {
          return false;
        }
        if (
          typeof f.publication_year_to === 'number' &&
          p.publication_year > f.publication_year_to
        ) {
          return false;
        }

        // price range
        if (
          typeof f.price_min === 'number' ||
          typeof f.price_max === 'number'
        ) {
          const inPrice = item.format_summaries.some((fs) => {
            if (typeof fs.price !== 'number') return false;
            if (
              typeof f.price_min === 'number' &&
              fs.price < f.price_min
            ) {
              return false;
            }
            if (
              typeof f.price_max === 'number' &&
              fs.price > f.price_max
            ) {
              return false;
            }
            return true;
          });
          if (!inPrice) return false;
        }

        // shipping options
        if (f.shipping_options && f.shipping_options.length) {
          const hasShip = item.format_summaries.some((fs) => {
            const pf = product_formats.find(
              (pf2) => pf2.product_id === p.id && pf2.format_type === fs.format_type
            );
            if (!pf) return false;
            if (!pf.shipping_option) return false;
            return f.shipping_options.includes(pf.shipping_option);
          });
          if (!hasShip) return false;
        }

        // rating
        if (typeof f.rating_min === 'number') {
          const rating = p.rating_average || 0;
          if (rating < f.rating_min) return false;
        }

        return true;
      });

      // Sorting
      const sortCode = sort || 'relevance';
      if (sortCode === 'price_low_to_high') {
        enriched.sort((a, b) => {
          const ap = typeof a.lowest_price === 'number' ? a.lowest_price : Infinity;
          const bp = typeof b.lowest_price === 'number' ? b.lowest_price : Infinity;
          return ap - bp;
        });
      } else if (sortCode === 'price_high_to_low') {
        enriched.sort((a, b) => {
          const ap = typeof a.highest_price === 'number' ? a.highest_price : -Infinity;
          const bp = typeof b.highest_price === 'number' ? b.highest_price : -Infinity;
          return bp - ap;
        });
      } else if (sortCode === 'rating_high_to_low') {
        enriched.sort((a, b) => {
          const ar = a.product.rating_average || 0;
          const br = b.product.rating_average || 0;
          if (br !== ar) return br - ar;
          return (b.product.publication_year || 0) - (a.product.publication_year || 0);
        });
      } else if (sortCode === 'publication_date_desc') {
        enriched.sort(
          (a, b) => (b.product.publication_year || 0) - (a.product.publication_year || 0)
        );
      } else if (sortCode === 'publication_date_asc') {
        enriched.sort(
          (a, b) => (a.product.publication_year || 0) - (b.product.publication_year || 0)
        );
      }

      const total_results = enriched.length;
      const start = (pageNum - 1) * size;
      const end = start + size;
      const pageSlice = enriched.slice(start, end);

      results = pageSlice.map((item) => ({
        content_type,
        product: {
          id: item.product.id,
          title: item.product.title,
          subtitle: item.product.subtitle,
          content_type: item.product.content_type,
          publication_year: item.product.publication_year,
          language: item.product.language,
          authors: item.product.authors || [],
          editors: item.product.editors || [],
          subject_names: item.subject_names,
          rating_average: item.product.rating_average,
          rating_count: item.product.rating_count,
          has_ebook_format: item.has_ebook_format,
          has_print_format: item.has_print_format,
          lowest_price: item.lowest_price,
          highest_price: item.highest_price,
          currency: (item.format_summaries[0] && item.format_summaries[0].currency) || 'USD',
          any_sample_chapter_available: item.any_sample_chapter_available,
          format_summaries: item.format_summaries
        },
        article: null
      }));

      return {
        total_results,
        page: pageNum,
        page_size: size,
        results
      };
    }

    if (content_type === 'articles') {
      let arts = journal_articles.slice();

      if (q) {
        arts = arts.filter((a) => {
          const fields = [];
          if (a.title) fields.push(a.title);
          if (a.subtitle) fields.push(a.subtitle);
          if (a.abstract) fields.push(a.abstract);
          if (Array.isArray(a.authors)) fields.push(a.authors.join(' '));
          if (Array.isArray(a.keywords)) fields.push(a.keywords.join(' '));
          const haystack = fields.join(' ').toLowerCase();
          return haystack.includes(q);
        });
      }

      arts = arts.filter((a) => {
        if (
          f.subject_ids &&
          f.subject_ids.length &&
          !this._subjectIdsMatchFilter(a.subject_ids || [], f.subject_ids, subjectsMap)
        ) {
          return false;
        }

        if (f.access_type && a.access_type !== f.access_type) {
          return false;
        }

        if (
          typeof f.publication_year_from === 'number' &&
          a.publication_year < f.publication_year_from
        ) {
          return false;
        }
        if (
          typeof f.publication_year_to === 'number' &&
          a.publication_year > f.publication_year_to
        ) {
          return false;
        }

        return true;
      });

      const sortCode = sort || 'relevance';
      if (sortCode === 'publication_date_desc') {
        arts.sort((a, b) => (b.publication_year || 0) - (a.publication_year || 0));
      } else if (sortCode === 'publication_date_asc') {
        arts.sort((a, b) => (a.publication_year || 0) - (b.publication_year || 0));
      }

      const total_results = arts.length;
      const start = (pageNum - 1) * size;
      const end = start + size;
      const pageSlice = arts.slice(start, end);

      results = pageSlice.map((a) => {
        const subject_names = (a.subject_ids || [])
          .map((sid) => {
            const s = subjectsMap[sid];
            return s ? s.name : null;
          })
          .filter(Boolean);
        return {
          content_type: 'articles',
          product: null,
          article: {
            id: a.id,
            title: a.title,
            subtitle: a.subtitle,
            journal_name: a.journal_name,
            volume: a.volume,
            issue: a.issue,
            pages: a.pages,
            publication_year: a.publication_year,
            access_type: a.access_type,
            authors: a.authors || [],
            subject_names,
            keywords: a.keywords || []
          }
        };
      });

      return {
        total_results,
        page: pageNum,
        page_size: size,
        results
      };
    }

    // Unknown content_type
    return {
      total_results: 0,
      page: 1,
      page_size: size,
      results: []
    };
  }

  // ---------------- Product Detail ----------------

  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const product_formats = this._getFromStorage('product_formats');
    const subjects = this._getFromStorage('subjects');

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        subjects: [],
        formats: [],
        has_sample_chapter_any_format: false
      };
    }

    const productSubjects = (product.subject_ids || [])
      .map((sid) => subjects.find((s) => s.id === sid) || null)
      .filter(Boolean);

    const formats = product_formats.filter((pf) => pf.product_id === productId);
    const has_sample_chapter_any_format = !!formats.find((pf) => pf.sample_chapter_available);

    return {
      product,
      subjects: productSubjects,
      formats,
      has_sample_chapter_any_format
    };
  }

  // ---------------- Sample Chapter / Excerpt Preview ----------------

  markSampleChapterOpened(productId, format_type) {
    const product_formats = this._getFromStorage('product_formats');
    const format = product_formats.find(
      (pf) => pf.product_id === productId && pf.format_type === format_type
    );
    const hasSample = format && format.sample_chapter_available === true;

    // Instrumentation for task completion tracking
    try {
      if (hasSample) {
        localStorage.setItem(
          'task8_samplePreview',
          JSON.stringify({
            product_id: productId,
            format_type: format_type,
            opened_at: this._now()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: !!hasSample,
      message: hasSample
        ? 'Sample chapter opened'
        : 'Sample chapter not available for this format'
    };
  }

  // ---------------- Cart operations ----------------

  addProductToCart(productId, format_type, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const { cart, cartItem, error } = this._addOrUpdateCartItem(productId, format_type, qty);

    if (error || !cart || !cartItem) {
      return {
        success: false,
        message: error || 'Unable to add to cart',
        cart: null
      };
    }

    const items = this._getCartItemsForCart(cart.id);
    const { subtotal } = this._calculateCartTotals(items);
    const currency = 'USD';

    return {
      success: true,
      message: 'Product added to cart',
      cart: {
        cart,
        items,
        subtotal,
        currency
      }
    };
  }

  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cart_items = this._getCartItemsForCart(cart.id);
    const products = this._getFromStorage('products');
    const product_formats = this._getFromStorage('product_formats');

    const items = cart_items.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const format = product_formats.find(
        (pf) => pf.product_id === ci.product_id && pf.format_type === ci.format_type
      ) || null;
      return {
        cart_item: ci,
        product,
        format_type: ci.format_type,
        format_price: format ? format.price : null,
        availability_status: format ? format.availability_status : null
      };
    });

    const totals = this._calculateCartTotals(cart_items);
    const currency = 'USD';

    return {
      cart,
      items,
      subtotal: totals.subtotal,
      estimated_tax: totals.estimated_tax,
      estimated_shipping: totals.estimated_shipping,
      total_estimate: totals.total,
      currency
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart_items = this._getFromStorage('cart_items');
    const idx = cart_items.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null
      };
    }

    const cartItem = cart_items[idx];

    if (!quantity || quantity <= 0) {
      cart_items.splice(idx, 1);
    } else {
      cartItem.quantity = quantity;
      cartItem.line_total = (cartItem.unit_price || 0) * quantity;
    }

    this._saveToStorage('cart_items', cart_items);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartItem.cart_id) || this._getOrCreateCart();
    if (cart) {
      const cIdx = carts.findIndex((c) => c.id === cart.id);
      if (cIdx !== -1) {
        carts[cIdx].updated_at = this._now();
        this._saveToStorage('carts', carts);
      }
    }

    const items = this._getCartItemsForCart(cart.id);
    const { subtotal } = this._calculateCartTotals(items);
    const currency = 'USD';

    return {
      success: true,
      message: 'Cart updated',
      cart: {
        cart,
        items,
        subtotal,
        currency
      }
    };
  }

  removeCartItem(cartItemId) {
    const cart_items = this._getFromStorage('cart_items');
    const idx = cart_items.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null
      };
    }

    const cartId = cart_items[idx].cart_id;
    cart_items.splice(idx, 1);
    this._saveToStorage('cart_items', cart_items);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || this._getOrCreateCart();
    const cIdx = carts.findIndex((c) => c.id === cart.id);
    if (cIdx !== -1) {
      carts[cIdx].updated_at = this._now();
      this._saveToStorage('carts', carts);
    }

    const items = this._getCartItemsForCart(cart.id);
    const { subtotal } = this._calculateCartTotals(items);
    const currency = 'USD';

    return {
      success: true,
      message: 'Item removed from cart',
      cart: {
        cart,
        items,
        subtotal,
        currency
      }
    };
  }

  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cart_items = this._getCartItemsForCart(cart.id);
    const products = this._getFromStorage('products');

    const items = cart_items.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      return {
        cart_item: ci,
        product
      };
    });

    const totals = this._calculateCartTotals(cart_items);
    const currency = 'USD';

    return {
      cart,
      items,
      subtotal: totals.subtotal,
      estimated_tax: totals.estimated_tax,
      estimated_shipping: totals.estimated_shipping,
      total: totals.total,
      currency
    };
  }

  placeOrder(email, shipping, billing, payment_method) {
    const cart = this._getOrCreateCart();
    const cart_items = this._getCartItemsForCart(cart.id);

    if (!cart_items.length) {
      return {
        success: false,
        order: null,
        order_items: [],
        message: 'Cart is empty'
      };
    }

    const totals = this._calculateCartTotals(cart_items);
    const currency = 'USD';

    const orders = this._getFromStorage('orders');
    const order_items = this._getFromStorage('order_items');

    const order = {
      id: this._generateId('order'),
      cart_id: cart.id,
      status: 'pending',
      total_amount: totals.total,
      currency,
      email,
      shipping_name: shipping && shipping.name,
      shipping_address_line1: shipping && shipping.address_line1,
      shipping_address_line2: shipping && shipping.address_line2,
      shipping_city: shipping && shipping.city,
      shipping_state: shipping && shipping.state,
      shipping_postal_code: shipping && shipping.postal_code,
      shipping_country: shipping && shipping.country,
      billing_name: (billing && billing.name) || (shipping && shipping.name),
      billing_address_line1:
        (billing && billing.address_line1) || (shipping && shipping.address_line1),
      billing_address_line2:
        (billing && billing.address_line2) || (shipping && shipping.address_line2),
      billing_city: (billing && billing.city) || (shipping && shipping.city),
      billing_state: (billing && billing.state) || (shipping && shipping.state),
      billing_postal_code:
        (billing && billing.postal_code) || (shipping && shipping.postal_code),
      billing_country: (billing && billing.country) || (shipping && shipping.country),
      payment_method,
      created_at: this._now(),
      updated_at: this._now()
    };

    orders.push(order);

    cart_items.forEach((ci) => {
      const oi = {
        id: this._generateId('order_item'),
        order_id: order.id,
        product_id: ci.product_id,
        format_type: ci.format_type,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total
      };
      order_items.push(oi);
    });

    // Mark cart as checked_out
    const carts = this._getFromStorage('carts');
    const cIdx = carts.findIndex((c) => c.id === cart.id);
    if (cIdx !== -1) {
      carts[cIdx].status = 'checked_out';
      carts[cIdx].updated_at = this._now();
      this._saveToStorage('carts', carts);
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', order_items);

    return {
      success: true,
      order,
      order_items: order_items.filter((oi) => oi.order_id === order.id),
      message: 'Order placed successfully'
    };
  }

  // ---------------- Journal Articles ----------------

  getJournalArticleDetail(articleId) {
    const journal_articles = this._getFromStorage('journal_articles');
    const subjects = this._getFromStorage('subjects');

    const article = journal_articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        subjects: [],
        access: {
          access_type: null,
          can_read_online: false,
          can_download_pdf: false
        },
        citations: []
      };
    }

    const articleSubjects = (article.subject_ids || [])
      .map((sid) => subjects.find((s) => s.id === sid) || null)
      .filter(Boolean);

    const access_type = article.access_type;
    const can_read_online = access_type === 'open_access';
    const can_download_pdf = access_type === 'open_access' && !!article.pdf_url;

    const authorStr = (article.authors || []).join(', ');
    const year = article.publication_year || '';
    const title = article.title || '';
    const journal = article.journal_name || '';

    const citations = [
      {
        style: 'apa',
        formatted: `${authorStr} (${year}). ${title}. ${journal}.`
      },
      {
        style: 'mla',
        formatted: `${authorStr}. "${title}." ${journal}, ${year}.`
      },
      {
        style: 'chicago',
        formatted: `${authorStr}. "${title}." ${journal} (${year}).`
      }
    ];

    return {
      article,
      subjects: articleSubjects,
      access: {
        access_type,
        can_read_online,
        can_download_pdf
      },
      citations
    };
  }

  // ---------------- Lists (Reading / Course) ----------------

  getAllLists() {
    const lists = this._getFromStorage('lists');
    const list_items = this._getFromStorage('list_items');

    return lists.map((list) => {
      const item_count = list_items.filter((li) => li.list_id === list.id).length;
      return { list, item_count };
    });
  }

  getListDetail(listId) {
    const lists = this._getFromStorage('lists');
    const list_items = this._getFromStorage('list_items');
    const products = this._getFromStorage('products');
    const journal_articles = this._getFromStorage('journal_articles');

    const list = lists.find((l) => l.id === listId) || null;
    if (!list) {
      return {
        list: null,
        items: []
      };
    }

    const itemsRaw = list_items.filter((li) => li.list_id === list.id);

    const items = itemsRaw.map((li) => {
      if (li.content_type === 'articles') {
        const article = journal_articles.find((a) => a.id === li.article_id) || null;
        return {
          list_item: li,
          product: null,
          article: { article }
        };
      }
      const product = products.find((p) => p.id === li.product_id) || null;
      return {
        list_item: li,
        product: {
          product,
          format_type: li.format_type || null
        },
        article: null
      };
    });

    return {
      list,
      items
    };
  }

  createList(name, list_type, description) {
    const lists = this._getFromStorage('lists');

    const list = {
      id: this._generateId('list'),
      name,
      description: description || '',
      list_type,
      created_at: this._now(),
      updated_at: this._now()
    };

    lists.push(list);
    this._saveToStorage('lists', lists);

    return { list };
  }

  updateList(listId, name, description) {
    const lists = this._getFromStorage('lists');
    const idx = lists.findIndex((l) => l.id === listId);
    if (idx === -1) {
      return { list: null };
    }

    if (typeof name === 'string') {
      lists[idx].name = name;
    }
    if (typeof description === 'string') {
      lists[idx].description = description;
    }
    lists[idx].updated_at = this._now();
    this._saveToStorage('lists', lists);

    return { list: lists[idx] };
  }

  deleteList(listId) {
    const lists = this._getFromStorage('lists');
    const list_items = this._getFromStorage('list_items');

    const idx = lists.findIndex((l) => l.id === listId);
    if (idx === -1) {
      return {
        success: false,
        message: 'List not found'
      };
    }

    lists.splice(idx, 1);
    const remainingItems = list_items.filter((li) => li.list_id !== listId);

    this._saveToStorage('lists', lists);
    this._saveToStorage('list_items', remainingItems);

    return {
      success: true,
      message: 'List deleted'
    };
  }

  addProductToList(listId, productId, format_type) {
    const lists = this._getFromStorage('lists');
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return {
        list_item: null,
        message: 'List not found'
      };
    }

    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        list_item: null,
        message: 'Product not found'
      };
    }

    const list_items = this._getFromStorage('list_items');

    const list_item = {
      id: this._generateId('list_item'),
      list_id: listId,
      content_type: product.content_type,
      product_id: productId,
      article_id: null,
      format_type: format_type || null,
      added_at: this._now()
    };

    list_items.push(list_item);
    this._saveToStorage('list_items', list_items);

    return {
      list_item,
      message: 'Product added to list'
    };
  }

  addArticleToList(listId, articleId) {
    const lists = this._getFromStorage('lists');
    const list = lists.find((l) => l.id === listId);
    if (!list) {
      return {
        list_item: null,
        message: 'List not found'
      };
    }

    const journal_articles = this._getFromStorage('journal_articles');
    const article = journal_articles.find((a) => a.id === articleId);
    if (!article) {
      return {
        list_item: null,
        message: 'Article not found'
      };
    }

    const list_items = this._getFromStorage('list_items');
    const list_item = {
      id: this._generateId('list_item'),
      list_id: listId,
      content_type: 'articles',
      product_id: null,
      article_id: articleId,
      format_type: null,
      added_at: this._now()
    };

    list_items.push(list_item);
    this._saveToStorage('list_items', list_items);

    return {
      list_item,
      message: 'Article added to list'
    };
  }

  removeListItem(listItemId) {
    const list_items = this._getFromStorage('list_items');
    const idx = list_items.findIndex((li) => li.id === listItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'List item not found'
      };
    }

    list_items.splice(idx, 1);
    this._saveToStorage('list_items', list_items);

    return {
      success: true,
      message: 'List item removed'
    };
  }

  // ---------------- Wishlist / Favorites ----------------

  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlist_items = this._getFromStorage('wishlist_items');
    const products = this._getFromStorage('products');

    const itemsRaw = wishlist_items.filter((wi) => wi.wishlist_id === wishlist.id);

    const items = itemsRaw.map((wi) => {
      const product = products.find((p) => p.id === wi.product_id) || null;
      return {
        wishlist_item: wi,
        product,
        format_type: wi.format_type
      };
    });

    return {
      wishlist,
      items
    };
  }

  addProductFormatToWishlist(productId, format_type) {
    const wishlist = this._getOrCreateWishlist();
    const wishlist_items = this._getFromStorage('wishlist_items');
    const products = this._getFromStorage('products');

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return {
        wishlist_item: null,
        message: 'Product not found'
      };
    }

    let wishlist_item = wishlist_items.find(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId && wi.format_type === format_type
    );

    if (!wishlist_item) {
      wishlist_item = {
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        product_id: productId,
        format_type,
        added_at: this._now()
      };
      wishlist_items.push(wishlist_item);
      this._saveToStorage('wishlist_items', wishlist_items);
    }

    return {
      wishlist_item,
      message: 'Added to wishlist'
    };
  }

  removeWishlistItem(wishlistItemId) {
    const wishlist_items = this._getFromStorage('wishlist_items');
    const idx = wishlist_items.findIndex((wi) => wi.id === wishlistItemId);
    if (idx === -1) {
      return {
        success: false,
        message: 'Wishlist item not found'
      };
    }

    wishlist_items.splice(idx, 1);
    this._saveToStorage('wishlist_items', wishlist_items);

    return {
      success: true,
      message: 'Wishlist item removed'
    };
  }

  moveWishlistItemToCart(wishlistItemId, quantity) {
    const qty = quantity && quantity > 0 ? quantity : 1;
    const wishlist_items = this._getFromStorage('wishlist_items');
    const wi = wishlist_items.find((w) => w.id === wishlistItemId);
    if (!wi) {
      return {
        cart_item: null,
        message: 'Wishlist item not found'
      };
    }

    const { cart, cartItem, error } = this._addOrUpdateCartItem(
      wi.product_id,
      wi.format_type,
      qty
    );

    if (error || !cartItem) {
      return {
        cart_item: null,
        message: error || 'Unable to move to cart'
      };
    }

    return {
      cart_item: cartItem,
      message: 'Moved to cart'
    };
  }

  // ---------------- Profile & Interests ----------------

  getProfile() {
    const profile = this._getOrCreateProfile();
    const subjects = this._getFromStorage('subjects');

    const subject_interests = (profile.subject_interest_ids || [])
      .map((sid) => subjects.find((s) => s.id === sid) || null)
      .filter(Boolean);

    return {
      profile,
      subject_interests
    };
  }

  updateProfileBasicInfo(name, email, password) {
    const profiles = this._getFromStorage('profiles');
    let profile = profiles[0] || null;
    if (!profile) {
      profile = this._getOrCreateProfile();
      // refresh profiles
      const updatedProfiles = this._getFromStorage('profiles');
      profiles.splice(0, profiles.length, ...updatedProfiles);
    }

    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx === -1) {
      profiles.push(profile);
    }

    if (typeof name === 'string') {
      profile.name = name;
    }
    if (typeof email === 'string') {
      profile.email = email;
    }
    if (typeof password === 'string') {
      profile.password = password;
    }
    profile.updated_at = this._now();

    const pIdx = profiles.findIndex((p) => p.id === profile.id);
    if (pIdx !== -1) {
      profiles[pIdx] = profile;
    }

    this._saveToStorage('profiles', profiles);

    return {
      profile,
      message: 'Profile updated'
    };
  }

  getAvailableSubjectsForInterests() {
    const subjects = this._getFromStorage('subjects') || [];

    const ensureSubject = (name, id, parent_subject_id) => {
      const existing = subjects.find(
        (s) => s && typeof s.name === 'string' && s.name === name
      );
      if (existing) return;
      subjects.push({
        id,
        name,
        slug: id,
        description: '',
        parent_subject_id: parent_subject_id || null
      });
    };

    // Ensure key subject areas are always available for interest selection
    ensureSubject('New Kingdom', 'new_kingdom', 'egyptology');
    ensureSubject('Art History', 'art_history', null);

    // Persist any additions so subsequent calls see the same list
    this._saveToStorage('subjects', subjects);

    return subjects;
  }

  updateProfileSubjectInterests(subject_ids) {
    const profiles = this._getFromStorage('profiles');
    let profile = profiles[0] || null;
    if (!profile) {
      profile = this._getOrCreateProfile();
    }

    profile.subject_interest_ids = Array.isArray(subject_ids)
      ? subject_ids.slice()
      : [];
    profile.updated_at = this._now();

    const idx = profiles.findIndex((p) => p.id === profile.id);
    if (idx === -1) {
      profiles.push(profile);
    } else {
      profiles[idx] = profile;
    }

    this._saveToStorage('profiles', profiles);

    const subjects = this._getFromStorage('subjects');
    const subject_interests = (profile.subject_interest_ids || [])
      .map((sid) => subjects.find((s) => s.id === sid) || null)
      .filter(Boolean);

    return {
      profile,
      subject_interests,
      message: 'Subject interests updated'
    };
  }

  // ---------------- Newsletter ----------------

  getNewsletterOptions() {
    return {
      topics: [
        { value: 'archaeological_reports', label: 'Archaeological Reports' },
        { value: 'general_updates', label: 'General Updates' },
        { value: 'book_releases', label: 'Book Releases' },
        { value: 'journal_updates', label: 'Journal Updates' }
      ],
      frequencies: [
        { value: 'monthly', label: 'Monthly' },
        { value: 'weekly', label: 'Weekly' },
        { value: 'quarterly', label: 'Quarterly' }
      ]
    };
  }

  getNewsletterSubscriptions() {
    return this._getFromStorage('newsletter_subscriptions');
  }

  saveNewsletterSubscription(email, topic, frequency, active) {
    const subscription = this._saveNewsletterSubscriptionInternal(
      email,
      topic,
      frequency,
      active
    );
    return {
      subscription,
      message: 'Subscription saved'
    };
  }

  // ---------------- Publisher Info / Help / Contact / Policies ----------------

  getPublisherInfo() {
    const defaultInfo = {
      headline: '',
      body: '',
      key_series: [],
      institutional_collaborations: [],
      peer_review_practices: ''
    };
    const data = this._getObjectFromStorage('publisher_info', defaultInfo);
    return data;
  }

  getHelpContent() {
    const data = this._getObjectFromStorage('help_content', []);
    return Array.isArray(data) ? data : [];
  }

  getContactInfo() {
    const defaultInfo = {
      support_email: '',
      rights_email: '',
      phone_numbers: [],
      postal_address: '',
      response_time_info: '',
      inquiry_types: []
    };
    const data = this._getObjectFromStorage('contact_info', defaultInfo);
    return data;
  }

  submitContactRequest(name, email, inquiry_type, message) {
    const contact_requests = this._getFromStorage('contact_requests');
    const req = {
      id: this._generateId('contact_request'),
      name,
      email,
      inquiry_type: inquiry_type || null,
      message,
      created_at: this._now()
    };
    contact_requests.push(req);
    this._saveToStorage('contact_requests', contact_requests);

    return {
      success: true,
      message: 'Contact request submitted'
    };
  }

  getPolicies() {
    const defaultPolicies = {
      terms_of_use: '',
      privacy_policy: '',
      cookie_policy: '',
      open_access_policy: '',
      returns_policy: ''
    };
    const data = this._getObjectFromStorage('policies', defaultPolicies);
    return data;
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