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

  // -------------------- Core storage helpers --------------------

  _initStorage() {
    const defaults = {
      case_studies: [],
      products: [],
      favorites: [],
      cart: null,
      cart_items: [],
      promo_codes: [],
      checkout_sessions: [],
      service_packages: [],
      project_requests: [],
      project_plans: [],
      blog_posts: [],
      newsletter_subscriptions: [],
      contact_messages: [],
      promo_banners: [],
      about_page_content: null,
      contact_page_content: null,
      legal_policies: null
    };

    Object.keys(defaults).forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify(defaults[key]));
      }
    });

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
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
    const currentStr = localStorage.getItem('idCounter');
    const current = currentStr ? parseInt(currentStr, 10) : 1000;
    const next = isNaN(current) ? 1001 : current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _now() {
    return new Date().toISOString();
  }

  // -------------------- Enum label mapping helper --------------------

  _mapEnumToLabel(enumType, value) {
    if (!value) {
      return null;
    }
    switch (enumType) {
      case 'industry':
        switch (value) {
          case 'restaurant': return 'Restaurant';
          case 'food_beverage': return 'Food & Beverage';
          case 'healthcare': return 'Healthcare';
          case 'fintech': return 'Fintech';
          case 'education': return 'Education';
          case 'other': return 'Other';
          default: return value;
        }
      case 'service_type':
        switch (value) {
          case 'branding': return 'Branding';
          case 'product_design': return 'Product Design';
          case 'ux_ui': return 'UX/UI';
          case 'mobile_app_design': return 'Mobile App Design';
          case 'web_design': return 'Web Design';
          case 'strategy': return 'Strategy';
          case 'other': return 'Other';
          default: return value;
        }
      case 'product_category':
        switch (value) {
          case 'website_templates': return 'Website Templates';
          case 'digital_downloads': return 'Digital Downloads';
          case 'ui_kits': return 'UI Kits';
          case 'merchandise': return 'Merchandise';
          default: return value;
        }
      case 'product_subcategory':
        switch (value) {
          case 'ecommerce': return 'Ecommerce Templates';
          case 'portfolio': return 'Portfolio Templates';
          case 'icon_sets': return 'Icon Sets';
          case 'ui_kits': return 'UI Kits';
          case 'mockups': return 'Mockups';
          case 'illustrations': return 'Illustrations';
          case 'ui_kit_bundles': return 'UI Kit Bundles';
          case 'design_resources': return 'Design Resources';
          case 'merchandise': return 'Merchandise';
          case 'other': return 'Other';
          default: return value;
        }
      case 'newsletter_interest':
        switch (value) {
          case 'design_tips': return 'Design Tips';
          case 'agency_news': return 'Agency News';
          case 'product_updates': return 'Product Updates';
          case 'case_studies': return 'Case Studies';
          case 'ux_insights': return 'UX Insights';
          default: return value;
        }
      case 'frequency':
        switch (value) {
          case 'daily': return 'Daily';
          case 'weekly': return 'Weekly';
          case 'monthly': return 'Monthly';
          default: return value;
        }
      case 'timeline_option':
        switch (value) {
          case 'two_three_weeks': return '2–3 weeks';
          case 'four_six_weeks': return '4–6 weeks';
          case 'six_eight_weeks': return '6–8 weeks';
          case 'flexible': return 'Flexible';
          case 'unspecified': return 'Unspecified';
          default: return value;
        }
      case 'budget_range':
        switch (value) {
          case 'under_25_000': return 'Under 25,000';
          case '25_000_50_000': return '25,000–50,000';
          case '50_000_75_000': return '50,000–75,000';
          case 'over_75_000': return 'Over 75,000';
          default: return value;
        }
      default:
        return value;
    }
  }

  // -------------------- Cart helpers --------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        cart_item_ids: [],
        applied_promo_code_id: null,
        subtotal: 0,
        discount_total: 0,
        total: 0,
        created_at: this._now(),
        updated_at: this._now()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _getCurrentCart() {
    return this._getFromStorage('cart', null);
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });

    let subtotal = 0;
    itemsForCart.forEach(function (ci) {
      subtotal += ci.line_subtotal || 0;
    });

    cart.subtotal = subtotal;
    cart.discount_total = 0;
    cart.total = subtotal;

    const promoId = cart.applied_promo_code_id;
    if (promoId) {
      const promos = this._getFromStorage('promo_codes', []);
      const promo = promos.find(function (p) { return p.id === promoId && p.active; });
      if (promo) {
        const now = new Date(this._now());
        if (promo.valid_from && new Date(promo.valid_from) > now) {
          cart.applied_promo_code_id = null;
        } else if (promo.valid_to && new Date(promo.valid_to) < now) {
          cart.applied_promo_code_id = null;
        } else {
          let discount = 0;
          if (promo.discount_type === 'percentage') {
            discount = subtotal * (promo.discount_value / 100);
          } else if (promo.discount_type === 'fixed_amount') {
            discount = promo.discount_value;
          }
          if (discount > subtotal) {
            discount = subtotal;
          }
          cart.discount_total = discount;
          cart.total = subtotal - discount;
        }
      } else {
        cart.applied_promo_code_id = null;
      }
    }

    cart.updated_at = this._now();
    this._saveToStorage('cart', cart);
    this._saveToStorage('cart_items', cartItems);
    return cart;
  }

  _validatePromoCode(code, cart) {
    const promos = this._getFromStorage('promo_codes', []);
    const promo = promos.find(function (p) {
      return p.code && p.code.toLowerCase() === String(code).toLowerCase();
    });
    if (!promo || !promo.active) {
      return { valid: false, reason: 'inactive_or_not_found' };
    }

    const now = new Date(this._now());
    if (promo.valid_from && new Date(promo.valid_from) > now) {
      return { valid: false, reason: 'not_started' };
    }
    if (promo.valid_to && new Date(promo.valid_to) < now) {
      return { valid: false, reason: 'expired' };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });
    const subtotal = itemsForCart.reduce(function (sum, ci) {
      return sum + (ci.line_subtotal || 0);
    }, 0);

    if (promo.min_order_amount && subtotal < promo.min_order_amount) {
      return { valid: false, reason: 'min_order_not_met' };
    }

    if (promo.applies_to_category && promo.applies_to_category !== 'any') {
      const products = this._getFromStorage('products', []);
      const hasCategory = itemsForCart.some(function (ci) {
        const product = products.find(function (p) { return p.id === ci.product_id; });
        return product && product.product_category === promo.applies_to_category;
      });
      if (!hasCategory) {
        return { valid: false, reason: 'category_not_in_cart' };
      }
    }

    return { valid: true, promo: promo, items: itemsForCart, subtotal: subtotal };
  }

  _buildCartResponse(cart) {
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        applied_promo_code: null
      };
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(function (ci) { return ci.cart_id === cart.id; });
    const products = this._getFromStorage('products', []);
    const promos = this._getFromStorage('promo_codes', []);

    const items = itemsForCart.map((ci) => {
      const product = products.find(function (p) { return p.id === ci.product_id; }) || null;
      const imageUrl = product && Array.isArray(product.image_urls) && product.image_urls.length > 0
        ? product.image_urls[0]
        : null;
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name,
        product_category: ci.product_category,
        product_category_label: this._mapEnumToLabel('product_category', ci.product_category),
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        selected_color: ci.selected_color || null,
        line_subtotal: ci.line_subtotal,
        product_image_url: imageUrl,
        free_shipping: product ? !!product.free_shipping : false,
        product: product
      };
    });

    let appliedPromoObj = null;
    if (cart.applied_promo_code_id) {
      const promo = promos.find(function (p) { return p.id === cart.applied_promo_code_id; });
      if (promo) {
        appliedPromoObj = {
          code: promo.code,
          description: promo.description || '',
          discount_type: promo.discount_type,
          discount_value: promo.discount_value
        };
      }
    }

    return {
      cart_id: cart.id,
      items: items,
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      total: cart.total || 0,
      applied_promo_code: appliedPromoObj
    };
  }

  // -------------------- Case studies / portfolio --------------------

  getHomePageHighlights() {
    const caseStudies = this._getFromStorage('case_studies', []);
    const products = this._getFromStorage('products', []);
    const servicePackages = this._getFromStorage('service_packages', []);
    const promoBanners = this._getFromStorage('promo_banners', []);

    let featuredCases = caseStudies.filter(function (cs) { return !!cs.is_featured; });
    if (featuredCases.length === 0) {
      featuredCases = caseStudies.slice();
      featuredCases.sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at) : new Date(0);
        const db = b.published_at ? new Date(b.published_at) : new Date(0);
        return db - da;
      });
    } else {
      featuredCases.sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at) : new Date(0);
        const db = b.published_at ? new Date(b.published_at) : new Date(0);
        return db - da;
      });
    }
    featuredCases = featuredCases.slice(0, 4);

    const featured_case_studies = featuredCases.map((cs) => {
      const primaryServiceType = Array.isArray(cs.service_types) && cs.service_types.length > 0
        ? cs.service_types[0]
        : null;
      return {
        id: cs.id,
        title: cs.title,
        slug: cs.slug,
        summary: cs.summary || '',
        thumbnail_image_url: cs.thumbnail_image_url || null,
        year: cs.year,
        industry: cs.industry,
        industry_label: this._mapEnumToLabel('industry', cs.industry),
        primary_service_type: primaryServiceType,
        primary_service_type_label: primaryServiceType ? this._mapEnumToLabel('service_type', primaryServiceType) : null,
        is_featured: !!cs.is_featured
      };
    });

    const activeProducts = products.filter(function (p) { return p.status === 'active'; });
    activeProducts.sort(function (a, b) {
      const ra = a.rating || 0;
      const rb = b.rating || 0;
      if (rb !== ra) {
        return rb - ra;
      }
      const da = a.created_at ? new Date(a.created_at) : new Date(0);
      const db = b.created_at ? new Date(b.created_at) : new Date(0);
      return db - da;
    });
    const featured_products = activeProducts.slice(0, 4).map((p) => {
      const imageUrl = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null;
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        product_category: p.product_category,
        product_category_label: this._mapEnumToLabel('product_category', p.product_category),
        product_subcategory: p.product_subcategory,
        product_subcategory_label: this._mapEnumToLabel('product_subcategory', p.product_subcategory),
        price: p.price,
        currency: p.currency,
        rating: p.rating,
        creator_name: p.creator_name,
        delivery_format: p.delivery_format,
        is_bundle: !!p.is_bundle,
        image_url: imageUrl
      };
    });

    const activePackages = servicePackages.filter(function (sp) { return !!sp.is_active; });
    const featured_service_packages = activePackages.map((sp) => {
      return {
        id: sp.id,
        name: sp.name,
        service_type: sp.service_type,
        service_type_label: this._mapEnumToLabel('service_type', sp.service_type),
        price: sp.price,
        currency: sp.currency,
        includes_logo_design: !!sp.includes_logo_design,
        includes_brand_guidelines: !!sp.includes_brand_guidelines,
        is_active: !!sp.is_active
      };
    });

    const promo_banners = Array.isArray(promoBanners)
      ? promoBanners.map(function (pb) {
          return {
            id: pb.id,
            title: pb.title,
            message: pb.message,
            promo_code: pb.promo_code,
            applicable_category: pb.applicable_category
          };
        })
      : [];

    return {
      featured_case_studies: featured_case_studies,
      featured_products: featured_products,
      featured_service_packages: featured_service_packages,
      promo_banners: promo_banners
    };
  }

  getPortfolioFilterOptions() {
    const caseStudies = this._getFromStorage('case_studies', []);

    const yearsSet = new Set();
    caseStudies.forEach(function (cs) {
      if (typeof cs.year === 'number') {
        yearsSet.add(cs.year);
      }
    });
    const years = Array.from(yearsSet).sort(function (a, b) { return b - a; }).map(function (y) {
      return { value: y, label: String(y) };
    });

    const industries = [
      { value: 'restaurant', label: this._mapEnumToLabel('industry', 'restaurant') },
      { value: 'food_beverage', label: this._mapEnumToLabel('industry', 'food_beverage') },
      { value: 'healthcare', label: this._mapEnumToLabel('industry', 'healthcare') },
      { value: 'fintech', label: this._mapEnumToLabel('industry', 'fintech') },
      { value: 'education', label: this._mapEnumToLabel('industry', 'education') },
      { value: 'other', label: this._mapEnumToLabel('industry', 'other') }
    ];

    const serviceTypes = [
      'branding',
      'product_design',
      'ux_ui',
      'mobile_app_design',
      'web_design',
      'strategy',
      'other'
    ].map((val) => ({ value: val, label: this._mapEnumToLabel('service_type', val) }));

    const sort_options = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' },
      { value: 'featured', label: 'Featured' }
    ];

    return {
      industries: industries,
      years: years,
      service_types: serviceTypes,
      sort_options: sort_options
    };
  }

  listCaseStudies(industry, year_from, year_to, service_type, sort) {
    let caseStudies = this._getFromStorage('case_studies', []);

    if (industry) {
      caseStudies = caseStudies.filter(function (cs) { return cs.industry === industry; });
    }
    if (typeof year_from === 'number') {
      caseStudies = caseStudies.filter(function (cs) { return cs.year >= year_from; });
    }
    if (typeof year_to === 'number') {
      caseStudies = caseStudies.filter(function (cs) { return cs.year <= year_to; });
    }
    if (service_type) {
      caseStudies = caseStudies.filter(function (cs) {
        return Array.isArray(cs.service_types) && cs.service_types.indexOf(service_type) !== -1;
      });
    }

    if (sort === 'newest_first') {
      caseStudies.sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at) : new Date(0);
        const db = b.published_at ? new Date(b.published_at) : new Date(0);
        return db - da;
      });
    } else if (sort === 'oldest_first') {
      caseStudies.sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at) : new Date(0);
        const db = b.published_at ? new Date(b.published_at) : new Date(0);
        return da - db;
      });
    } else if (sort === 'featured') {
      caseStudies.sort(function (a, b) {
        const fa = a.is_featured ? 1 : 0;
        const fb = b.is_featured ? 1 : 0;
        if (fb !== fa) {
          return fb - fa;
        }
        const da = a.published_at ? new Date(a.published_at) : new Date(0);
        const db = b.published_at ? new Date(b.published_at) : new Date(0);
        return db - da;
      });
    }

    return caseStudies.map((cs) => {
      const serviceTypes = Array.isArray(cs.service_types) ? cs.service_types.slice() : [];
      const serviceTypeLabels = serviceTypes.map((st) => this._mapEnumToLabel('service_type', st));
      return {
        id: cs.id,
        title: cs.title,
        slug: cs.slug,
        summary: cs.summary || '',
        thumbnail_image_url: cs.thumbnail_image_url || null,
        year: cs.year,
        published_at: cs.published_at || null,
        industry: cs.industry,
        industry_label: this._mapEnumToLabel('industry', cs.industry),
        service_types: serviceTypes,
        service_type_labels: serviceTypeLabels,
        is_featured: !!cs.is_featured
      };
    });
  }

  getCaseStudyDetails(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const cs = caseStudies.find(function (c) { return c.id === caseStudyId; });
    if (!cs) {
      return null;
    }

    // Instrumentation for task completion tracking (task_7)
    try {
      const eligibleIndustries = ['healthcare', 'fintech', 'education'];
      if (
        cs &&
        eligibleIndustries.indexOf(cs.industry) !== -1 &&
        typeof cs.year === 'number' &&
        cs.year >= 2021 &&
        cs.year <= 2024
      ) {
        let existing = {};
        const raw = localStorage.getItem('task7_viewedCaseStudies');
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
              existing = parsed;
            }
          } catch (parseError) {
            existing = {};
          }
        }
        existing[cs.industry] = {
          case_study_id: cs.id,
          viewed_at: this._now()
        };
        localStorage.setItem('task7_viewedCaseStudies', JSON.stringify(existing));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const related = caseStudies
      .filter(function (c) { return c.id !== cs.id && c.industry === cs.industry; })
      .sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at) : new Date(0);
        const db = b.published_at ? new Date(b.published_at) : new Date(0);
        return db - da;
      })
      .slice(0, 3)
      .map((c) => {
        return {
          id: c.id,
          title: c.title,
          slug: c.slug,
          thumbnail_image_url: c.thumbnail_image_url || null,
          year: c.year,
          industry_label: this._mapEnumToLabel('industry', c.industry)
        };
      });

    const serviceTypes = Array.isArray(cs.service_types) ? cs.service_types.slice() : [];
    const serviceTypeLabels = serviceTypes.map((st) => this._mapEnumToLabel('service_type', st));

    return {
      id: cs.id,
      title: cs.title,
      slug: cs.slug,
      summary: cs.summary || '',
      content: cs.content || '',
      thumbnail_image_url: cs.thumbnail_image_url || null,
      year: cs.year,
      published_at: cs.published_at || null,
      industry: cs.industry,
      industry_label: this._mapEnumToLabel('industry', cs.industry),
      service_types: serviceTypes,
      service_type_labels: serviceTypeLabels,
      is_featured: !!cs.is_featured,
      related_case_studies: related
    };
  }

  // -------------------- Favorites --------------------

  addFavoriteItem(item_type, item_id) {
    if (item_type !== 'case_study' && item_type !== 'product') {
      return { success: false, favorite_item: null, message: 'Invalid item_type' };
    }

    const favorites = this._getFromStorage('favorites', []);
    const existing = favorites.find(function (f) {
      return f.item_type === item_type && f.item_id === item_id;
    });
    if (existing) {
      return { success: true, favorite_item: existing, message: 'Already in favorites' };
    }

    if (item_type === 'case_study') {
      const caseStudies = this._getFromStorage('case_studies', []);
      const found = caseStudies.find(function (c) { return c.id === item_id; });
      if (!found) {
        return { success: false, favorite_item: null, message: 'Case study not found' };
      }
    } else if (item_type === 'product') {
      const products = this._getFromStorage('products', []);
      const found = products.find(function (p) { return p.id === item_id; });
      if (!found) {
        return { success: false, favorite_item: null, message: 'Product not found' };
      }
    }

    const favorite = {
      id: this._generateId('favorite'),
      item_type: item_type,
      item_id: item_id,
      added_at: this._now()
    };
    favorites.push(favorite);
    this._saveToStorage('favorites', favorites);

    return { success: true, favorite_item: favorite, message: 'Added to favorites' };
  }

  removeFavoriteItem(favoriteItemId) {
    const favorites = this._getFromStorage('favorites', []);
    const index = favorites.findIndex(function (f) { return f.id === favoriteItemId; });
    if (index === -1) {
      return { success: false, message: 'Favorite not found' };
    }
    favorites.splice(index, 1);
    this._saveToStorage('favorites', favorites);
    return { success: true, message: 'Removed from favorites' };
  }

  listFavoriteItems(filter_type) {
    const favorites = this._getFromStorage('favorites', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const products = this._getFromStorage('products', []);

    let items = favorites;
    if (filter_type === 'case_study') {
      items = favorites.filter(function (f) { return f.item_type === 'case_study'; });
    } else if (filter_type === 'product') {
      items = favorites.filter(function (f) { return f.item_type === 'product'; });
    }

    const mapped = items.map((fav) => {
      let caseStudyObj = null;
      let productObj = null;
      if (fav.item_type === 'case_study') {
        const cs = caseStudies.find(function (c) { return c.id === fav.item_id; });
        if (cs) {
          caseStudyObj = {
            id: cs.id,
            title: cs.title,
            slug: cs.slug,
            thumbnail_image_url: cs.thumbnail_image_url || null,
            year: cs.year,
            industry_label: this._mapEnumToLabel('industry', cs.industry)
          };
        }
      } else if (fav.item_type === 'product') {
        const p = products.find(function (pp) { return pp.id === fav.item_id; });
        if (p) {
          const imageUrl = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null;
          productObj = {
            id: p.id,
            name: p.name,
            slug: p.slug,
            product_category_label: this._mapEnumToLabel('product_category', p.product_category),
            product_subcategory_label: this._mapEnumToLabel('product_subcategory', p.product_subcategory),
            price: p.price,
            currency: p.currency,
            rating: p.rating,
            image_url: imageUrl
          };
        }
      }
      return {
        favorite_id: fav.id,
        item_type: fav.item_type,
        added_at: fav.added_at,
        case_study: caseStudyObj,
        product: productObj
      };
    });

    return { items: mapped, total_count: mapped.length };
  }

  // -------------------- Shop overview and filters --------------------

  getShopCategoriesOverview() {
    const products = this._getFromStorage('products', []);
    const activeProducts = products.filter(function (p) { return p.status === 'active'; });

    const categoriesMap = {};
    activeProducts.forEach((p) => {
      if (!categoriesMap[p.product_category]) {
        categoriesMap[p.product_category] = [];
      }
      categoriesMap[p.product_category].push(p);
    });

    const categories = Object.keys(categoriesMap).map((cat) => {
      return {
        id: cat,
        name: cat,
        label: this._mapEnumToLabel('product_category', cat),
        description: '',
        is_featured: true
      };
    });

    const featured_products_by_category = Object.keys(categoriesMap).map((cat) => {
      const list = categoriesMap[cat].slice();
      list.sort(function (a, b) {
        const ra = a.rating || 0;
        const rb = b.rating || 0;
        if (rb !== ra) {
          return rb - ra;
        }
        const da = a.created_at ? new Date(a.created_at) : new Date(0);
        const db = b.created_at ? new Date(b.created_at) : new Date(0);
        return db - da;
      });
      const productsMapped = list.slice(0, 4).map((p) => {
        const imageUrl = Array.isArray(p.image_urls) && p.image_urls.length > 0 ? p.image_urls[0] : null;
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          product_subcategory_label: this._mapEnumToLabel('product_subcategory', p.product_subcategory),
          price: p.price,
          currency: p.currency,
          rating: p.rating,
          image_url: imageUrl
        };
      });
      return {
        category_id: cat,
        category_label: this._mapEnumToLabel('product_category', cat),
        products: productsMapped
      };
    });

    return {
      categories: categories,
      featured_products_by_category: featured_products_by_category
    };
  }

  getShopFilterOptions(category) {
    // Subcategories based on category
    let subcats = [];
    if (category === 'website_templates') {
      subcats = ['ecommerce', 'portfolio', 'other'];
    } else if (category === 'digital_downloads') {
      subcats = ['icon_sets', 'ui_kits', 'mockups', 'illustrations', 'design_resources', 'other'];
    } else if (category === 'ui_kits') {
      subcats = ['ui_kits', 'ui_kit_bundles', 'other'];
    } else if (category === 'merchandise') {
      subcats = ['merchandise', 'other'];
    }
    const subcategories = subcats.map((s) => ({
      value: s,
      label: this._mapEnumToLabel('product_subcategory', s)
    }));

    const products = this._getFromStorage('products', []);
    const filtered = products.filter(function (p) { return p.product_category === category; });
    let min = 0;
    let max = 0;
    if (filtered.length > 0) {
      min = filtered.reduce(function (m, p) { return p.price < m ? p.price : m; }, filtered[0].price);
      max = filtered.reduce(function (m, p) { return p.price > m ? p.price : m; }, filtered[0].price);
    }

    const rating_thresholds = [
      { value: 5, label: '5 stars' },
      { value: 4.5, label: '4.5+ stars' },
      { value: 4, label: '4+ stars' },
      { value: 3, label: '3+ stars' }
    ];

    const colors = [
      { value: 'blue', label: 'Blue' },
      { value: 'red', label: 'Red' },
      { value: 'green', label: 'Green' },
      { value: 'black', label: 'Black' },
      { value: 'white', label: 'White' },
      { value: 'gray', label: 'Gray' },
      { value: 'other', label: 'Other' }
    ];

    const shipping_options = [
      { value: 'free_shipping', label: 'Free shipping' },
      { value: 'paid_shipping', label: 'Paid shipping' }
    ];

    const sort_options = [
      { value: 'rating_high_to_low', label: 'Rating: high to low' },
      { value: 'rating_low_to_high', label: 'Rating: low to high' },
      { value: 'price_low_to_high', label: 'Price: low to high' },
      { value: 'price_high_to_low', label: 'Price: high to low' },
      { value: 'newest_first', label: 'Newest first' }
    ];

    return {
      subcategories: subcategories,
      price_range: { min: min, max: max },
      rating_thresholds: rating_thresholds,
      colors: colors,
      shipping_options: shipping_options,
      sort_options: sort_options
    };
  }

  listProducts(category, subcategory, min_price, max_price, min_rating, free_shipping_only, color, includes_desktop_layouts, includes_mobile_layouts, is_bundle, sort) {
    let products = this._getFromStorage('products', []);

    products = products.filter(function (p) { return p.status === 'active'; });

    if (category) {
      products = products.filter(function (p) { return p.product_category === category; });
    }
    if (subcategory) {
      products = products.filter(function (p) { return p.product_subcategory === subcategory; });
    }
    if (typeof min_price === 'number') {
      products = products.filter(function (p) { return p.price >= min_price; });
    }
    if (typeof max_price === 'number') {
      products = products.filter(function (p) { return p.price <= max_price; });
    }
    if (typeof min_rating === 'number') {
      products = products.filter(function (p) { return (p.rating || 0) >= min_rating; });
    }
    if (free_shipping_only) {
      products = products.filter(function (p) { return !!p.free_shipping; });
    }
    if (color) {
      products = products.filter(function (p) {
        return Array.isArray(p.available_colors) && p.available_colors.indexOf(color) !== -1;
      });
    }
    if (typeof includes_desktop_layouts === 'boolean') {
      products = products.filter(function (p) { return !!p.includes_desktop_layouts === includes_desktop_layouts; });
    }
    if (typeof includes_mobile_layouts === 'boolean') {
      products = products.filter(function (p) { return !!p.includes_mobile_layouts === includes_mobile_layouts; });
    }
    if (typeof is_bundle === 'boolean') {
      products = products.filter(function (p) { return !!p.is_bundle === is_bundle; });
    }

    if (sort === 'rating_high_to_low') {
      products.sort(function (a, b) {
        return (b.rating || 0) - (a.rating || 0);
      });
    } else if (sort === 'rating_low_to_high') {
      products.sort(function (a, b) {
        return (a.rating || 0) - (b.rating || 0);
      });
    } else if (sort === 'price_low_to_high') {
      products.sort(function (a, b) {
        return (a.price || 0) - (b.price || 0);
      });
    } else if (sort === 'price_high_to_low') {
      products.sort(function (a, b) {
        return (b.price || 0) - (a.price || 0);
      });
    } else if (sort === 'newest_first') {
      products.sort(function (a, b) {
        const da = a.created_at ? new Date(a.created_at) : new Date(0);
        const db = b.created_at ? new Date(b.created_at) : new Date(0);
        return db - da;
      });
    }

    return products.map((p) => {
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        product_category: p.product_category,
        product_category_label: this._mapEnumToLabel('product_category', p.product_category),
        product_subcategory: p.product_subcategory,
        product_subcategory_label: this._mapEnumToLabel('product_subcategory', p.product_subcategory),
        price: p.price,
        currency: p.currency,
        rating: p.rating,
        rating_count: p.rating_count || 0,
        creator_name: p.creator_name,
        delivery_format: p.delivery_format,
        free_shipping: !!p.free_shipping,
        shipping_required: !!p.shipping_required,
        shipping_price: p.shipping_price || 0,
        available_colors: Array.isArray(p.available_colors) ? p.available_colors.slice() : [],
        includes_desktop_layouts: !!p.includes_desktop_layouts,
        includes_mobile_layouts: !!p.includes_mobile_layouts,
        is_bundle: !!p.is_bundle,
        image_urls: Array.isArray(p.image_urls) ? p.image_urls.slice() : [],
        created_at: p.created_at || null,
        status: p.status
      };
    });
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const p = products.find(function (pp) { return pp.id === productId; });
    if (!p) {
      return null;
    }
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      product_category: p.product_category,
      product_category_label: this._mapEnumToLabel('product_category', p.product_category),
      product_subcategory: p.product_subcategory,
      product_subcategory_label: this._mapEnumToLabel('product_subcategory', p.product_subcategory),
      price: p.price,
      currency: p.currency,
      rating: p.rating,
      rating_count: p.rating_count || 0,
      creator_name: p.creator_name,
      delivery_format: p.delivery_format,
      free_shipping: !!p.free_shipping,
      shipping_required: !!p.shipping_required,
      shipping_price: p.shipping_price || 0,
      available_colors: Array.isArray(p.available_colors) ? p.available_colors.slice() : [],
      includes_desktop_layouts: !!p.includes_desktop_layouts,
      includes_mobile_layouts: !!p.includes_mobile_layouts,
      is_bundle: !!p.is_bundle,
      image_urls: Array.isArray(p.image_urls) ? p.image_urls.slice() : [],
      created_at: p.created_at || null,
      status: p.status
    };
  }

  // -------------------- Cart operations --------------------

  addToCart(productId, quantity, selected_color) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find(function (p) { return p.id === productId; });
    if (!product || product.status !== 'active') {
      return { success: false, message: 'Product not found or inactive', cart: null };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    let existingItem = cartItems.find(function (ci) {
      return ci.cart_id === cart.id && ci.product_id === productId && (ci.selected_color || null) === (selected_color || null);
    });

    if (existingItem) {
      existingItem.quantity += qty;
      existingItem.line_subtotal = existingItem.unit_price * existingItem.quantity;
    } else {
      const cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        product_name: product.name,
        product_category: product.product_category,
        unit_price: product.price,
        quantity: qty,
        selected_color: selected_color || null,
        line_subtotal: product.price * qty
      };
      cartItems.push(cartItem);
      if (!Array.isArray(cart.cart_item_ids)) {
        cart.cart_item_ids = [];
      }
      cart.cart_item_ids.push(cartItem.id);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    const cartResponse = this._buildCartResponse(cart);

    return {
      success: true,
      message: 'Added to cart',
      cart: cartResponse
    };
  }

  getCart() {
    const cart = this._getCurrentCart();
    if (!cart) {
      return {
        cart_id: null,
        items: [],
        subtotal: 0,
        discount_total: 0,
        total: 0,
        applied_promo_code: null
      };
    }
    this._recalculateCartTotals(cart);
    return this._buildCartResponse(cart);
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getCurrentCart();
    if (!cart) {
      return { success: false, cart: null, message: 'Cart not found' };
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex(function (ci) { return ci.id === cartItemId && ci.cart_id === cart.id; });
    if (index === -1) {
      return { success: false, cart: null, message: 'Cart item not found' };
    }

    if (quantity <= 0) {
      cartItems.splice(index, 1);
      if (Array.isArray(cart.cart_item_ids)) {
        cart.cart_item_ids = cart.cart_item_ids.filter(function (id) { return id !== cartItemId; });
      }
    } else {
      cartItems[index].quantity = quantity;
      cartItems[index].line_subtotal = cartItems[index].unit_price * quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    const cartResponse = this._buildCartResponse(cart);

    return {
      success: true,
      cart: cartResponse,
      message: 'Cart updated'
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getCurrentCart();
    if (!cart) {
      return { success: false, cart: null, message: 'Cart not found' };
    }
    const cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex(function (ci) { return ci.id === cartItemId && ci.cart_id === cart.id; });
    if (index === -1) {
      return { success: false, cart: null, message: 'Cart item not found' };
    }

    cartItems.splice(index, 1);
    if (Array.isArray(cart.cart_item_ids)) {
      cart.cart_item_ids = cart.cart_item_ids.filter(function (id) { return id !== cartItemId; });
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart);
    const cartResponse = this._buildCartResponse(cart);

    return {
      success: true,
      cart: cartResponse,
      message: 'Item removed from cart'
    };
  }

  applyPromoCode(code) {
    const cart = this._getCurrentCart();
    if (!cart) {
      return { success: false, message: 'Cart not found', cart: null, applied_promo: null };
    }

    const validation = this._validatePromoCode(code, cart);
    if (!validation.valid) {
      let message = 'Promo code is not valid';
      if (validation.reason === 'inactive_or_not_found') {
        message = 'Promo code not found or inactive';
      } else if (validation.reason === 'not_started') {
        message = 'Promo code is not active yet';
      } else if (validation.reason === 'expired') {
        message = 'Promo code has expired';
      } else if (validation.reason === 'min_order_not_met') {
        message = 'Cart subtotal does not meet minimum order amount';
      } else if (validation.reason === 'category_not_in_cart') {
        message = 'Promo code does not apply to items in cart';
      }
      return { success: false, message: message, cart: this._buildCartResponse(cart), applied_promo: null };
    }

    const promo = validation.promo;
    const subtotal = validation.subtotal;
    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = subtotal * (promo.discount_value / 100);
    } else if (promo.discount_type === 'fixed_amount') {
      discount = promo.discount_value;
    }
    if (discount > subtotal) {
      discount = subtotal;
    }

    cart.applied_promo_code_id = promo.id;
    cart.subtotal = subtotal;
    cart.discount_total = discount;
    cart.total = subtotal - discount;
    cart.updated_at = this._now();

    this._saveToStorage('cart', cart);

    const cartResponse = this._buildCartResponse(cart);

    const appliedPromo = {
      id: promo.id,
      code: promo.code,
      description: promo.description || '',
      discount_type: promo.discount_type,
      discount_value: promo.discount_value
    };

    return {
      success: true,
      message: 'Promo code applied',
      cart: cartResponse,
      applied_promo: appliedPromo
    };
  }

  getCheckoutSummary() {
    const cartResponse = this.getCart();
    const items = cartResponse.items || [];

    const checkoutCart = {
      cart_id: cartResponse.cart_id,
      items: items.map(function (i) {
        return {
          cart_item_id: i.cart_item_id,
          product_name: i.product_name,
          unit_price: i.unit_price,
          quantity: i.quantity,
          line_subtotal: i.line_subtotal
        };
      }),
      subtotal: cartResponse.subtotal,
      discount_total: cartResponse.discount_total,
      total: cartResponse.total,
      applied_promo_code: cartResponse.applied_promo_code
    };

    let hasPhysical = false;
    let hasDigital = false;
    items.forEach(function (i) {
      if (i.product && i.product.delivery_format === 'physical') {
        hasPhysical = true;
      }
      if (i.product && i.product.delivery_format === 'digital') {
        hasDigital = true;
      }
    });

    const available_delivery_options = [];
    if (!hasPhysical && hasDigital) {
      available_delivery_options.push({
        value: 'standard_digital',
        label: 'Standard digital delivery',
        description: 'Download links sent via email',
        is_default: true
      });
    } else if (hasPhysical && !hasDigital) {
      available_delivery_options.push({
        value: 'express_physical',
        label: 'Express shipping',
        description: 'Fast shipping for physical items',
        is_default: true
      });
      available_delivery_options.push({
        value: 'pickup',
        label: 'Pickup',
        description: 'Arrange a studio pickup',
        is_default: false
      });
    } else if (hasPhysical && hasDigital) {
      available_delivery_options.push({
        value: 'standard_digital',
        label: 'Standard digital delivery',
        description: 'Digital items via email, physical via standard shipping',
        is_default: true
      });
      available_delivery_options.push({
        value: 'express_physical',
        label: 'Express shipping',
        description: 'Expedited shipping for physical components',
        is_default: false
      });
    } else {
      // Empty cart: still expose a default digital option
      available_delivery_options.push({
        value: 'standard_digital',
        label: 'Standard digital delivery',
        description: 'Default delivery',
        is_default: true
      });
    }

    // Instrumentation for task completion tracking (task_2)
    try {
      if (
        checkoutCart &&
        checkoutCart.cart_id &&
        Array.isArray(checkoutCart.items) &&
        checkoutCart.items.length > 0
      ) {
        const task2_checkoutSummarySnapshot = {
          cart_id: checkoutCart.cart_id,
          item_count: checkoutCart.items.length,
          opened_at: this._now()
        };
        localStorage.setItem('task2_checkoutSummarySnapshot', JSON.stringify(task2_checkoutSummarySnapshot));
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      cart: checkoutCart,
      available_delivery_options: available_delivery_options
    };
  }

  submitCheckoutDetails(customer_name, customer_email, delivery_option) {
    if (!customer_name || !customer_email || !delivery_option) {
      return { success: false, checkout_session_id: null, status: 'abandoned', message: 'Missing required fields' };
    }

    const cart = this._getCurrentCart();
    const cartId = cart ? cart.id : null;

    const checkoutSessions = this._getFromStorage('checkout_sessions', []);
    const session = {
      id: this._generateId('checkout_session'),
      cart_id: cartId,
      customer_name: customer_name,
      customer_email: customer_email,
      delivery_option: delivery_option,
      status: 'in_review',
      created_at: this._now()
    };
    checkoutSessions.push(session);
    this._saveToStorage('checkout_sessions', checkoutSessions);

    return {
      success: true,
      checkout_session_id: session.id,
      status: session.status,
      message: 'Checkout details submitted'
    };
  }

  // -------------------- Service packages / project requests --------------------

  listServicePackages(service_type, include_inactive) {
    let packages = this._getFromStorage('service_packages', []);
    if (!include_inactive) {
      packages = packages.filter(function (p) { return !!p.is_active; });
    }
    if (service_type) {
      packages = packages.filter(function (p) { return p.service_type === service_type; });
    }

    return packages.map((sp) => {
      return {
        id: sp.id,
        name: sp.name,
        description: sp.description || '',
        service_type: sp.service_type,
        service_type_label: this._mapEnumToLabel('service_type', sp.service_type),
        price: sp.price,
        currency: sp.currency,
        includes_logo_design: !!sp.includes_logo_design,
        includes_brand_guidelines: !!sp.includes_brand_guidelines,
        features: Array.isArray(sp.features) ? sp.features.slice() : [],
        is_active: !!sp.is_active
      };
    });
  }

  getServicePackageDetails(servicePackageId) {
    const packages = this._getFromStorage('service_packages', []);
    const sp = packages.find(function (p) { return p.id === servicePackageId; });
    if (!sp) {
      return null;
    }
    return {
      id: sp.id,
      name: sp.name,
      description: sp.description || '',
      service_type: sp.service_type,
      service_type_label: this._mapEnumToLabel('service_type', sp.service_type),
      price: sp.price,
      currency: sp.currency,
      includes_logo_design: !!sp.includes_logo_design,
      includes_brand_guidelines: !!sp.includes_brand_guidelines,
      features: Array.isArray(sp.features) ? sp.features.slice() : [],
      is_active: !!sp.is_active
    };
  }

  submitProjectRequest(package_id, project_description, budget, timeline_option, contact_name, contact_email) {
    if (!package_id || !project_description || typeof budget !== 'number' || !timeline_option || !contact_name || !contact_email) {
      return { success: false, project_request_id: null, message: 'Missing required fields' };
    }

    const packages = this._getFromStorage('service_packages', []);
    const sp = packages.find(function (p) { return p.id === package_id; });
    if (!sp) {
      return { success: false, project_request_id: null, message: 'Service package not found' };
    }

    const projectRequests = this._getFromStorage('project_requests', []);
    const pr = {
      id: this._generateId('project_request'),
      package_id: package_id,
      package_name: sp.name,
      project_description: project_description,
      budget: budget,
      timeline_option: timeline_option,
      contact_name: contact_name,
      contact_email: contact_email,
      submitted_at: this._now()
    };
    projectRequests.push(pr);
    this._saveToStorage('project_requests', projectRequests);

    return {
      success: true,
      project_request_id: pr.id,
      message: 'Project request submitted'
    };
  }

  submitProjectPlan(project_name, description, target_launch_date, budget_range, contact_name, contact_email) {
    if (!project_name || !description || !target_launch_date || !budget_range || !contact_name || !contact_email) {
      return { success: false, project_plan_id: null, message: 'Missing required fields' };
    }

    const projectPlans = this._getFromStorage('project_plans', []);
    const pp = {
      id: this._generateId('project_plan'),
      project_name: project_name,
      description: description,
      target_launch_date: target_launch_date,
      budget_range: budget_range,
      contact_name: contact_name,
      contact_email: contact_email,
      created_at: this._now()
    };
    projectPlans.push(pp);
    this._saveToStorage('project_plans', projectPlans);

    return {
      success: true,
      project_plan_id: pp.id,
      message: 'Project plan submitted'
    };
  }

  // -------------------- Blog / insights --------------------

  getBlogFilterOptions() {
    const posts = this._getFromStorage('blog_posts', []);

    const tagsSet = new Set();
    const yearsSet = new Set();

    posts.forEach(function (p) {
      if (Array.isArray(p.tags)) {
        p.tags.forEach(function (t) { tagsSet.add(t); });
      }
      if (p.published_at) {
        const year = new Date(p.published_at).getFullYear();
        if (!isNaN(year)) {
          yearsSet.add(year);
        }
      }
    });

    const tags = Array.from(tagsSet).map(function (t) {
      return { value: t, label: t.charAt(0).toUpperCase() + t.slice(1) };
    });

    const years = Array.from(yearsSet).sort(function (a, b) { return b - a; }).map(function (y) {
      return { value: y, label: String(y) };
    });

    const sort_options = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' }
    ];

    return {
      tags: tags,
      years: years,
      sort_options: sort_options
    };
  }

  listBlogPosts(tag, year_from, year_to, sort) {
    let posts = this._getFromStorage('blog_posts', []);

    if (tag) {
      posts = posts.filter(function (p) {
        return Array.isArray(p.tags) && p.tags.indexOf(tag) !== -1;
      });
    }
    if (typeof year_from === 'number') {
      posts = posts.filter(function (p) {
        if (!p.published_at) return false;
        const year = new Date(p.published_at).getFullYear();
        return year >= year_from;
      });
    }
    if (typeof year_to === 'number') {
      posts = posts.filter(function (p) {
        if (!p.published_at) return false;
        const year = new Date(p.published_at).getFullYear();
        return year <= year_to;
      });
    }

    if (sort === 'newest_first') {
      posts.sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at) : new Date(0);
        const db = b.published_at ? new Date(b.published_at) : new Date(0);
        return db - da;
      });
    } else if (sort === 'oldest_first') {
      posts.sort(function (a, b) {
        const da = a.published_at ? new Date(a.published_at) : new Date(0);
        const db = b.published_at ? new Date(b.published_at) : new Date(0);
        return da - db;
      });
    }

    return posts.map(function (p) {
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt || '',
        published_at: p.published_at || null,
        author_name: p.author_name || '',
        tags: Array.isArray(p.tags) ? p.tags.slice() : [],
        category: p.category || ''
      };
    });
  }

  getBlogPostDetails(postId) {
    const posts = this._getFromStorage('blog_posts', []);
    const p = posts.find(function (pp) { return pp.id === postId; });
    if (!p) {
      return null;
    }
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt || '',
      content: p.content || '',
      author_name: p.author_name || '',
      published_at: p.published_at || null,
      tags: Array.isArray(p.tags) ? p.tags.slice() : [],
      category: p.category || ''
    };
  }

  submitNewsletterSubscription(name, email, interests, frequency, notes) {
    if (!name || !email || !frequency) {
      return { success: false, subscription_id: null, message: 'Missing required fields' };
    }

    const subs = this._getFromStorage('newsletter_subscriptions', []);
    const sub = {
      id: this._generateId('newsletter_subscription'),
      name: name,
      email: email,
      interests: Array.isArray(interests) ? interests.slice() : [],
      frequency: frequency,
      notes: notes || '',
      subscribed_at: this._now()
    };
    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription_id: sub.id,
      message: 'Subscription submitted'
    };
  }

  // -------------------- Static pages: About, Contact, Legal --------------------

  getAboutPageContent() {
    let content = this._getFromStorage('about_page_content', null);
    if (!content) {
      content = {
        headline: '',
        subheadline: '',
        body_sections: [],
        highlights: []
      };
    }
    return content;
  }

  getContactPageContent() {
    let content = this._getFromStorage('contact_page_content', null);
    if (!content) {
      content = {
        contact_email: '',
        studio_location: '',
        phone: '',
        office_hours: '',
        social_profiles: []
      };
    }
    return content;
  }

  submitContactForm(name, email, subject, message) {
    if (!name || !email || !message) {
      return { success: false, ticket_id: null, message: 'Missing required fields' };
    }

    const messages = this._getFromStorage('contact_messages', []);
    const ticket = {
      id: this._generateId('contact_message'),
      name: name,
      email: email,
      subject: subject || '',
      message: message,
      created_at: this._now()
    };
    messages.push(ticket);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      ticket_id: ticket.id,
      message: 'Contact message submitted'
    };
  }

  getLegalPolicies() {
    let policies = this._getFromStorage('legal_policies', null);
    if (!policies) {
      policies = {
        terms_of_service: {
          title: '',
          content: ''
        },
        privacy_policy: {
          title: '',
          content: ''
        },
        shipping_and_returns: {
          title: '',
          content: ''
        }
      };
    }
    return policies;
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