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
    this.idCounter = this._getNextIdCounter();
  }

  // -------------------------
  // Storage helpers
  // -------------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'virtual_tour_packages',
      'hosting_plans',
      'cart_items',
      'coupons',
      'promotions',
      'portfolio_tours',
      'favorite_tours',
      'blog_articles',
      'reading_list_items',
      'consultation_time_slots',
      'consultation_bookings',
      'custom_bundle_configurations',
      'property_size_ranges',
      'photo_count_ranges',
      'revision_round_options',
      'tour_capacity_ranges',
      'quotes',
      'quote_items',
      'hosting_plan_checkouts',
      'quote_requests'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    // Single cart object, may be null when not yet created
    if (!localStorage.getItem('cart')) {
      localStorage.setItem('cart', 'null');
    }

    // Pointers for current quote / hosting plan checkout
    if (!localStorage.getItem('current_quote_id')) {
      localStorage.setItem('current_quote_id', '');
    }
    if (!localStorage.getItem('current_hosting_plan_checkout_id')) {
      localStorage.setItem('current_hosting_plan_checkout_id', '');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      const parsed = JSON.parse(data);
      // Treat explicit JSON null as "no value" and fall back to default/empty array
      if (parsed === null) {
        return defaultValue !== undefined ? defaultValue : [];
      }
      return parsed;
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

  _nowIso() {
    return new Date().toISOString();
  }

  _toISODate(dateStr) {
    // Input: 'YYYY-MM-DD' -> ISO datetime at midnight
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  _parseDateOnly(isoDateTime) {
    // Returns 'YYYY-MM-DD'
    if (!isoDateTime) return null;
    return isoDateTime.split('T')[0];
  }

  _capitalizeWordsFromEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // -------------------------
  // Core helpers for domain
  // -------------------------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        promo_code: null,
        subtotal: 0,
        discount_total: 0,
        total: 0,
        currency: 'usd',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart, cartItems) {
    if (!cart) return null;
    const allItems = cartItems || this._getFromStorage('cart_items', []);

    // Reset discounts
    allItems.forEach((item) => {
      if (item.cart_id === cart.id) {
        item.line_subtotal = item.unit_price * item.quantity;
        item.discount_amount = 0;
        item.line_total = item.line_subtotal;
      }
    });

    const promoCode = cart.promo_code ? String(cart.promo_code).trim() : '';
    const coupons = this._getFromStorage('coupons', []);
    let appliedCoupon = null;

    if (promoCode) {
      const now = new Date();
      appliedCoupon = coupons.find((c) => {
        if (!c || !c.is_active) return false;
        if (String(c.code).toLowerCase() !== promoCode.toLowerCase()) return false;
        if (c.valid_from && new Date(c.valid_from) > now) return false;
        if (c.valid_to && new Date(c.valid_to) < now) return false;
        return true;
      }) || null;
    }

    if (appliedCoupon) {
      // Apply coupon to eligible items
      const cartId = cart.id;
      const itemsForCart = allItems.filter((i) => i.cart_id === cartId);
      const virtualTourPackages = this._getFromStorage('virtual_tour_packages', []);
      const customBundles = this._getFromStorage('custom_bundle_configurations', []);
      const hostingPlans = this._getFromStorage('hosting_plans', []);

      const applicableItems = itemsForCart.filter((item) => {
        if (!item) return false;
        const productType = item.product_type;
        if (appliedCoupon.applicable_product_type !== 'any' && appliedCoupon.applicable_product_type !== productType) {
          return false;
        }
        if (productType === 'virtual_tour_package') {
          const pkg = virtualTourPackages.find((p) => p.id === item.product_id);
          if (!pkg) return false;
          if (appliedCoupon.applicable_listing_type !== 'any' && appliedCoupon.applicable_listing_type !== pkg.listing_type) {
            return false;
          }
          // If coupon is for single-property promo, ensure eligibility flag if present
          if (pkg.is_eligible_for_single_property_promo === false) {
            // Only restrict when explicitly false; undefined we allow
            if (appliedCoupon.applicable_listing_type === 'single_listing') {
              return false;
            }
          }
        }
        return true;
      });

      if (applicableItems.length > 0) {
        if (appliedCoupon.discount_type === 'percentage') {
          const pct = appliedCoupon.discount_value || 0;
          applicableItems.forEach((item) => {
            const discount = (item.line_subtotal * pct) / 100;
            item.discount_amount = discount;
            item.line_total = item.line_subtotal - discount;
          });
        } else if (appliedCoupon.discount_type === 'fixed_amount') {
          let remaining = appliedCoupon.discount_value || 0;
          // Distribute discount across applicable items up to their subtotal
          applicableItems.forEach((item) => {
            if (remaining <= 0) return;
            const maxDiscountForItem = item.line_subtotal;
            const discount = remaining >= maxDiscountForItem ? maxDiscountForItem : remaining;
            item.discount_amount = discount;
            item.line_total = item.line_subtotal - discount;
            remaining -= discount;
          });
        }
      }
    }

    // Compute cart-level totals
    const cartItemsForCart = allItems.filter((i) => i.cart_id === cart.id);
    let subtotal = 0;
    let discountTotal = 0;
    cartItemsForCart.forEach((item) => {
      subtotal += item.line_subtotal || 0;
      discountTotal += item.discount_amount || 0;
    });

    cart.subtotal = subtotal;
    cart.discount_total = discountTotal;
    cart.total = subtotal - discountTotal;
    cart.updated_at = this._nowIso();

    // Update cart.items as list of item IDs
    cart.items = cartItemsForCart.map((i) => i.id);

    this._saveToStorage('cart_items', allItems);
    this._saveToStorage('cart', cart);

    return { cart, appliedCoupon };
  }

  _getOrCreateQuote() {
    let quotes = this._getFromStorage('quotes', []);
    let currentId = localStorage.getItem('current_quote_id') || '';
    let currentQuote = quotes.find((q) => q.id === currentId && q.status === 'draft') || null;

    if (!currentQuote) {
      currentQuote = {
        id: this._generateId('quote'),
        items: [],
        status: 'draft',
        total_estimated_price: 0,
        currency: 'usd',
        notes: '',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      quotes.push(currentQuote);
      this._saveToStorage('quotes', quotes);
      localStorage.setItem('current_quote_id', currentQuote.id);
    }

    return currentQuote;
  }

  _updateQuoteTotals(quote, quoteItems) {
    const allItems = quoteItems || this._getFromStorage('quote_items', []);
    const forQuote = allItems.filter((i) => i.quote_id === quote.id);
    let total = 0;
    forQuote.forEach((i) => {
      total += i.estimated_price || 0;
    });
    quote.total_estimated_price = total;
    quote.items = forQuote.map((i) => i.id);
    quote.updated_at = this._nowIso();
    this._saveToStorage('quotes', this._getFromStorage('quotes', []).map((q) => (q.id === quote.id ? quote : q)));
    this._saveToStorage('quote_items', allItems);
    return quote;
  }

  _getOrCreateHostingPlanCheckout() {
    const checkouts = this._getFromStorage('hosting_plan_checkouts', []);
    const currentId = localStorage.getItem('current_hosting_plan_checkout_id') || '';
    const checkout = checkouts.find((c) => c.id === currentId) || null;
    return checkout;
  }

  _findAvailableConsultationSlots(project_type, duration_minutes, date) {
    const slots = this._getFromStorage('consultation_time_slots', []);
    const targetDate = date;
    const millisRequired = duration_minutes * 60000;

    const available = slots.filter((slot) => {
      if (!slot || slot.is_booked) return false;
      const slotDate = this._parseDateOnly(slot.start_datetime);
      if (slotDate !== targetDate) return false;
      if (project_type && slot.project_type && slot.project_type !== project_type) return false;
      const start = new Date(slot.start_datetime);
      const end = new Date(slot.end_datetime);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
      const duration = end.getTime() - start.getTime();
      if (duration < millisRequired) return false;
      return true;
    });

    available.sort((a, b) => {
      const ta = new Date(a.start_datetime).getTime();
      const tb = new Date(b.start_datetime).getTime();
      return ta - tb;
    });

    return available;
  }

  _filterAndSortPackages(params) {
    const all = this._getFromStorage('virtual_tour_packages', []);
    const {
      category_id,
      property_type,
      listing_type,
      min_property_size_sq_ft,
      max_property_size_sq_ft,
      includes_floor_plan,
      includes_3d_walkthrough,
      includes_floor_plan_overlay,
      includes_drone_aerial_footage,
      includes_twilight_photography,
      min_photo_count,
      max_photo_count,
      max_revision_rounds,
      min_price,
      max_price,
      is_eligible_for_single_property_promo,
      sort_by
    } = params;

    let results = all.filter((pkg) => pkg && pkg.is_active !== false && pkg.category_id === category_id);

    if (property_type) {
      results = results.filter((pkg) => pkg.property_type === property_type);
    }
    if (listing_type) {
      results = results.filter((pkg) => pkg.listing_type === listing_type);
    }

    if (min_property_size_sq_ft != null || max_property_size_sq_ft != null) {
      const minFilter = min_property_size_sq_ft != null ? min_property_size_sq_ft : 0;
      const maxFilter = max_property_size_sq_ft != null ? max_property_size_sq_ft : Number.POSITIVE_INFINITY;
      results = results.filter((pkg) => {
        const minPkg = pkg.min_property_size_sq_ft != null ? pkg.min_property_size_sq_ft : 0;
        const maxPkg = pkg.max_property_size_sq_ft != null ? pkg.max_property_size_sq_ft : Number.POSITIVE_INFINITY;
        // Require overlap between [minFilter, maxFilter] and [minPkg, maxPkg]
        return !(maxFilter < minPkg || maxPkg < minFilter);
      });
    }

    if (includes_floor_plan === true) {
      results = results.filter((pkg) => pkg.includes_floor_plan === true);
    }
    if (includes_3d_walkthrough === true) {
      results = results.filter((pkg) => pkg.includes_3d_walkthrough === true);
    }
    if (includes_floor_plan_overlay === true) {
      results = results.filter((pkg) => pkg.includes_floor_plan_overlay === true);
    }
    if (includes_drone_aerial_footage === true) {
      results = results.filter((pkg) => pkg.includes_drone_aerial_footage === true);
    }
    if (includes_twilight_photography === true) {
      results = results.filter((pkg) => pkg.includes_twilight_photography === true);
    }

    if (min_photo_count != null) {
      results = results.filter((pkg) => {
        const maxPkgPhotos = pkg.max_photo_count != null ? pkg.max_photo_count : Number.POSITIVE_INFINITY;
        return maxPkgPhotos >= min_photo_count;
      });
    }
    if (max_photo_count != null) {
      results = results.filter((pkg) => {
        const minPkgPhotos = pkg.min_photo_count != null ? pkg.min_photo_count : 0;
        return minPkgPhotos <= max_photo_count;
      });
    }

    if (max_revision_rounds != null) {
      results = results.filter((pkg) => {
        if (pkg.max_revision_rounds == null) return false;
        return pkg.max_revision_rounds <= max_revision_rounds;
      });
    }

    if (min_price != null) {
      results = results.filter((pkg) => pkg.base_price >= min_price);
    }
    if (max_price != null) {
      results = results.filter((pkg) => pkg.base_price <= max_price);
    }

    if (is_eligible_for_single_property_promo === true) {
      results = results.filter((pkg) => pkg.is_eligible_for_single_property_promo === true);
    }

    const sortKey = sort_by || 'price_asc';

    results.sort((a, b) => {
      if (sortKey === 'price_desc') {
        return (b.base_price || 0) - (a.base_price || 0);
      }
      if (sortKey === 'price_asc') {
        return (a.base_price || 0) - (b.base_price || 0);
      }
      if (sortKey === 'popularity_desc') {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      }
      return 0;
    });

    return { results, total_count: results.length, applied_sort: sortKey };
  }

  _filterAndSortHostingPlans(params) {
    const all = this._getFromStorage('hosting_plans', []);
    const {
      plan_section,
      min_tour_capacity,
      max_tour_capacity,
      billing_cycle,
      max_annual_monthly_equivalent_price,
      sort_by
    } = params;

    let results = all.filter((plan) => plan && plan.is_active !== false && plan.plan_section === plan_section);

    if (min_tour_capacity != null) {
      results = results.filter((plan) => {
        const maxCap = plan.max_tour_capacity != null ? plan.max_tour_capacity : Number.POSITIVE_INFINITY;
        return maxCap >= min_tour_capacity;
      });
    }

    if (max_tour_capacity != null) {
      results = results.filter((plan) => {
        const minCap = plan.min_tour_capacity != null ? plan.min_tour_capacity : 0;
        return minCap <= max_tour_capacity;
      });
    }

    if (billing_cycle === 'monthly') {
      results = results.filter((plan) => plan.has_monthly_billing === true);
    } else if (billing_cycle === 'annual') {
      results = results.filter((plan) => plan.has_annual_billing === true);
    }

    if (max_annual_monthly_equivalent_price != null) {
      results = results.filter(
        (plan) => plan.annual_monthly_equivalent_price != null && plan.annual_monthly_equivalent_price <= max_annual_monthly_equivalent_price
      );
    }

    const sortKey = sort_by || 'price_per_month_asc';

    results.sort((a, b) => {
      const pa = a.annual_monthly_equivalent_price || 0;
      const pb = b.annual_monthly_equivalent_price || 0;
      if (sortKey === 'price_per_month_desc') {
        return pb - pa;
      }
      if (sortKey === 'price_per_month_asc') {
        return pa - pb;
      }
      return 0;
    });

    return { results, total_count: results.length };
  }

  _filterAndSortPortfolioTours(params) {
    const all = this._getFromStorage('portfolio_tours', []);
    const {
      property_type,
      has_3d_walkthrough,
      has_floor_plan_overlay,
      min_duration_seconds,
      max_duration_seconds,
      sort_by
    } = params;

    let results = all.filter((t) => t && t.is_active !== false);

    if (property_type) {
      results = results.filter((t) => t.property_type === property_type);
    }
    if (has_3d_walkthrough === true) {
      results = results.filter((t) => t.has_3d_walkthrough === true);
    }
    if (has_floor_plan_overlay === true) {
      results = results.filter((t) => t.has_floor_plan_overlay === true);
    }
    if (min_duration_seconds != null) {
      results = results.filter((t) => t.duration_seconds >= min_duration_seconds);
    }
    if (max_duration_seconds != null) {
      results = results.filter((t) => t.duration_seconds <= max_duration_seconds);
    }

    const sortKey = sort_by || 'recent_desc';

    results.sort((a, b) => {
      if (sortKey === 'duration_asc') {
        return (a.duration_seconds || 0) - (b.duration_seconds || 0);
      }
      if (sortKey === 'duration_desc') {
        return (b.duration_seconds || 0) - (a.duration_seconds || 0);
      }
      if (sortKey === 'recent_desc') {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      }
      return 0;
    });

    return { results, total_count: results.length };
  }

  _filterAndSortBlogArticles(params) {
    const all = this._getFromStorage('blog_articles', []);
    const { category, published_from, published_to, query, sort_by } = params;

    let results = all.filter((a) => a && a.is_published !== false);

    if (category) {
      results = results.filter((a) => a.category === category);
    }

    if (published_from) {
      const from = new Date(published_from);
      results = results.filter((a) => new Date(a.published_at) >= from);
    }
    if (published_to) {
      const to = new Date(published_to);
      results = results.filter((a) => new Date(a.published_at) <= to);
    }

    let withScores = results.map((a) => ({ article: a, score: 0 }));

    if (query) {
      const q = String(query).toLowerCase();
      const terms = q
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 3);
      withScores.forEach((wrap) => {
        const a = wrap.article;
        let score = 0;
        const title = (a.title || '').toLowerCase();
        const excerpt = (a.excerpt || '').toLowerCase();
        const body = (a.body || '').toLowerCase();
        // Whole-phrase matches get a strong boost
        if (title.includes(q)) score += 5;
        if (excerpt.includes(q)) score += 3;
        if (body.includes(q)) score += 1;
        // Individual term matches
        terms.forEach((term) => {
          if (!term) return;
          if (title.includes(term)) score += 3;
          if (excerpt.includes(term)) score += 2;
          if (body.includes(term)) score += 1;
        });
        wrap.score = score;
      });
      withScores = withScores.filter((w) => w.score > 0);
    }

    const sortKey = sort_by || (query ? 'relevance_desc' : 'published_desc');

    withScores.sort((a, b) => {
      if (sortKey === 'relevance_desc') {
        if (b.score !== a.score) return b.score - a.score;
        const ta = new Date(a.article.published_at).getTime();
        const tb = new Date(b.article.published_at).getTime();
        return tb - ta;
      }
      if (sortKey === 'published_desc') {
        const ta = new Date(a.article.published_at).getTime();
        const tb = new Date(b.article.published_at).getTime();
        return tb - ta;
      }
      return 0;
    });

    const finalResults = withScores.map((w) => w.article);

    return { results: finalResults, total_count: finalResults.length };
  }

  _getOrCreateFavoritesList() {
    // We treat favorite_tours as the list itself
    return this._getFromStorage('favorite_tours', []);
  }

  _getOrCreateReadingList() {
    return this._getFromStorage('reading_list_items', []);
  }

  // -------------------------
  // Interface implementations
  // -------------------------

  // getHomepageContent
  getHomepageContent() {
    const promotions = this._getFromStorage('promotions', []);
    const coupons = this._getFromStorage('coupons', []);
    const virtualTourPackages = this._getFromStorage('virtual_tour_packages', []);
    const portfolioTours = this._getFromStorage('portfolio_tours', []);
    const blogArticles = this._getFromStorage('blog_articles', []);

    const now = new Date();

    const active_promotions = promotions
      .filter((p) => {
        if (!p || p.is_active === false) return false;
        if (p.start_date && new Date(p.start_date) > now) return false;
        if (p.end_date && new Date(p.end_date) < now) return false;
        return true;
      })
      .map((p) => {
        const promoCoupon = p.coupon_id ? coupons.find((c) => c.id === p.coupon_id) || null : null;
        return { ...p, coupon: promoCoupon };
      });

    const residentialPackages = virtualTourPackages
      .filter((p) => p && p.is_active !== false && p.category_id === 'residential_virtual_tours')
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 5);

    const commercialPackages = virtualTourPackages
      .filter((p) => p && p.is_active !== false && p.category_id === 'commercial_virtual_tours')
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 5);

    const featured_portfolio_tours = portfolioTours
      .filter((t) => t && t.is_active !== false)
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 6);

    const recent_blog_articles = blogArticles
      .filter((a) => a && a.is_published !== false)
      .sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime())
      .slice(0, 6);

    return {
      active_promotions,
      featured_residential_packages: residentialPackages,
      featured_commercial_packages: commercialPackages,
      featured_portfolio_tours,
      recent_blog_articles
    };
  }

  // getServicesFilterOptions
  getServicesFilterOptions(category_id) {
    const packages = this._getFromStorage('virtual_tour_packages', []).filter(
      (p) => p && p.is_active !== false && p.category_id === category_id
    );

    // Property size ranges from storage
    const property_size_ranges = this._getFromStorage('property_size_ranges', []);

    // Property types based on existing packages
    const seenTypes = new Set();
    const property_types = [];
    packages.forEach((p) => {
      if (p.property_type && !seenTypes.has(p.property_type)) {
        seenTypes.add(p.property_type);
        property_types.push({
          value: p.property_type,
          label: this._capitalizeWordsFromEnum(p.property_type)
        });
      }
    });

    // Listing types based on packages
    const seenListing = new Set();
    const listing_types = [];
    packages.forEach((p) => {
      if (p.listing_type && !seenListing.has(p.listing_type)) {
        seenListing.add(p.listing_type);
        listing_types.push({
          value: p.listing_type,
          label: this._capitalizeWordsFromEnum(p.listing_type)
        });
      }
    });

    const feature_flags = [
      {
        key: 'includes_floor_plan',
        label: 'Floor plan',
        description: 'Includes a 2D floor plan.'
      },
      {
        key: 'includes_3d_walkthrough',
        label: '3D walkthrough',
        description: 'Interactive 3D walkthrough experience.'
      },
      {
        key: 'includes_floor_plan_overlay',
        label: 'Floor plan overlay',
        description: 'Overlay showing the floor plan within the tour.'
      },
      {
        key: 'includes_drone_aerial_footage',
        label: 'Drone aerial footage',
        description: 'Aerial drone footage of the property.'
      },
      {
        key: 'includes_twilight_photography',
        label: 'Twilight photography',
        description: 'Twilight exterior photography.'
      }
    ];

    const photo_count_ranges = this._getFromStorage('photo_count_ranges', []);
    const revision_round_options = this._getFromStorage('revision_round_options', []);

    let min_price = null;
    let max_price = null;
    packages.forEach((p) => {
      const price = p.base_price || 0;
      if (min_price === null || price < min_price) min_price = price;
      if (max_price === null || price > max_price) max_price = price;
    });

    const price_range = {
      min_price: min_price != null ? min_price : 0,
      max_price: max_price != null ? max_price : 0
    };

    const sort_options = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'popularity_desc', label: 'Most popular' }
    ];

    return {
      property_size_ranges,
      property_types,
      listing_types,
      feature_flags,
      photo_count_ranges,
      revision_round_options,
      price_range,
      sort_options
    };
  }

  // searchVirtualTourPackages
  searchVirtualTourPackages(
    category_id,
    property_type,
    listing_type,
    min_property_size_sq_ft,
    max_property_size_sq_ft,
    includes_floor_plan,
    includes_3d_walkthrough,
    includes_floor_plan_overlay,
    includes_drone_aerial_footage,
    includes_twilight_photography,
    min_photo_count,
    max_photo_count,
    max_revision_rounds,
    min_price,
    max_price,
    is_eligible_for_single_property_promo,
    sort_by
  ) {
    const { results, total_count, applied_sort } = this._filterAndSortPackages({
      category_id,
      property_type,
      listing_type,
      min_property_size_sq_ft,
      max_property_size_sq_ft,
      includes_floor_plan,
      includes_3d_walkthrough,
      includes_floor_plan_overlay,
      includes_drone_aerial_footage,
      includes_twilight_photography,
      min_photo_count,
      max_photo_count,
      max_revision_rounds,
      min_price,
      max_price,
      is_eligible_for_single_property_promo,
      sort_by
    });
    return { results, total_count, applied_sort };
  }

  // getVirtualTourPackageDetail
  getVirtualTourPackageDetail(packageId) {
    const packages = this._getFromStorage('virtual_tour_packages', []);
    const pkg = packages.find((p) => p.id === packageId) || null;

    if (!pkg) {
      return {
        package: null,
        category_name: '',
        property_type_label: '',
        listing_type_label: '',
        property_size_label: '',
        photo_count_label: '',
        features_display: [],
        actions_available: []
      };
    }

    const category_name = pkg.category_id === 'residential_virtual_tours' ? 'Residential Virtual Tours' : 'Commercial Virtual Tours';
    const property_type_label = this._capitalizeWordsFromEnum(pkg.property_type);
    const listing_type_label = this._capitalizeWordsFromEnum(pkg.listing_type);

    let property_size_label = '';
    const minSize = pkg.min_property_size_sq_ft;
    const maxSize = pkg.max_property_size_sq_ft;
    if (minSize != null && maxSize != null) {
      property_size_label = minSize + '–' + maxSize + ' sq ft';
    } else if (minSize == null && maxSize != null) {
      property_size_label = 'Up to ' + maxSize + ' sq ft';
    } else if (minSize != null && maxSize == null) {
      property_size_label = minSize + '+ sq ft';
    }

    let photo_count_label = '';
    const minPhotos = pkg.min_photo_count;
    const maxPhotos = pkg.max_photo_count;
    if (minPhotos != null && maxPhotos != null) {
      photo_count_label = minPhotos + '–' + maxPhotos + ' photos';
    } else if (minPhotos == null && maxPhotos != null) {
      photo_count_label = 'Up to ' + maxPhotos + ' photos';
    } else if (minPhotos != null && maxPhotos == null) {
      photo_count_label = minPhotos + '+ photos';
    }

    const features_display = [
      { key: 'includes_floor_plan', label: 'Floor plan', included: !!pkg.includes_floor_plan },
      { key: 'includes_3d_walkthrough', label: '3D walkthrough', included: !!pkg.includes_3d_walkthrough },
      { key: 'includes_floor_plan_overlay', label: 'Floor plan overlay', included: !!pkg.includes_floor_plan_overlay },
      { key: 'includes_drone_aerial_footage', label: 'Drone aerial footage', included: !!pkg.includes_drone_aerial_footage },
      { key: 'includes_twilight_photography', label: 'Twilight photography', included: !!pkg.includes_twilight_photography }
    ];

    let actions_available = [];
    if (pkg.purchase_action_type === 'add_to_cart') {
      actions_available = ['add_to_cart'];
    } else if (pkg.purchase_action_type === 'add_to_quote') {
      actions_available = ['add_to_quote'];
    } else if (pkg.purchase_action_type === 'both') {
      actions_available = ['add_to_cart', 'add_to_quote'];
    }

    return {
      package: pkg,
      category_name,
      property_type_label,
      listing_type_label,
      property_size_label,
      photo_count_label,
      features_display,
      actions_available
    };
  }

  // addVirtualTourPackageToQuote
  addVirtualTourPackageToQuote(packageId, quantity) {
    const qty = quantity != null ? quantity : 1;
    const packages = this._getFromStorage('virtual_tour_packages', []);
    const pkg = packages.find((p) => p.id === packageId) || null;

    if (!pkg) {
      return { success: false, message: 'Package not found', quote: null };
    }

    const quote = this._getOrCreateQuote();
    let quoteItems = this._getFromStorage('quote_items', []);

    const newItem = {
      id: this._generateId('quote_item'),
      quote_id: quote.id,
      item_type: 'virtual_tour_package',
      item_id: packageId,
      quantity: qty,
      estimated_price: (pkg.base_price || 0) * qty
    };

    quoteItems.push(newItem);
    quote.items.push(newItem.id);

    this._saveToStorage('quote_items', quoteItems);
    this._updateQuoteTotals(quote, quoteItems);

    return { success: true, message: 'Package added to quote', quote };
  }

  // addVirtualTourPackageToCart
  addVirtualTourPackageToCart(packageId, quantity, number_of_locations) {
    const packages = this._getFromStorage('virtual_tour_packages', []);
    const pkg = packages.find((p) => p.id === packageId) || null;

    if (!pkg) {
      return { success: false, message: 'Package not found', cart: null };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let qty = quantity != null ? quantity : 1;
    if (number_of_locations != null && number_of_locations > 0) {
      qty = number_of_locations;
    }

    // Check for existing line with same product
    let item = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_type === 'virtual_tour_package' && ci.product_id === packageId
    );

    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_type: 'virtual_tour_package',
        product_id: packageId,
        quantity: qty,
        unit_price: pkg.base_price || 0,
        line_subtotal: 0,
        discount_amount: 0,
        line_total: 0,
        added_at: this._nowIso()
      };
      cartItems.push(item);
    }

    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);

    return { success: true, message: 'Package added to cart', cart: updatedCart };
  }

  // getCustomPackageBuilderOptions
  getCustomPackageBuilderOptions() {
    const bundles = this._getFromStorage('custom_bundle_configurations', []);
    let maxProperties = 0;
    let minPrice = null;
    let maxPrice = null;

    bundles.forEach((b) => {
      if (!b) return;
      if (typeof b.number_of_properties === 'number') {
        if (b.number_of_properties > maxProperties) maxProperties = b.number_of_properties;
      }
      const price = b.total_price || 0;
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
    });

    if (maxProperties === 0) maxProperties = 10;
    if (minPrice === null) minPrice = 0;
    if (maxPrice === null) maxPrice = minPrice;

    const bundle_types = [
      { value: 'single_property', label: 'Single property' },
      { value: 'multi_property', label: 'Bundle for multiple properties' }
    ];

    const add_on_options = [
      {
        key: 'includes_drone_aerial_footage',
        label: 'Drone aerial footage',
        description: 'Add drone aerial footage to the bundle.'
      },
      {
        key: 'includes_twilight_photography',
        label: 'Twilight photography',
        description: 'Add twilight photography to the bundle.'
      }
    ];

    const budget_range = {
      min_total_price: minPrice,
      max_total_price: maxPrice,
      step: 50
    };

    return {
      bundle_types,
      max_properties_per_bundle: maxProperties,
      add_on_options,
      budget_range
    };
  }

  // searchCustomBundleConfigurations
  searchCustomBundleConfigurations(
    bundle_type,
    number_of_properties,
    includes_drone_aerial_footage,
    includes_twilight_photography,
    min_total_price,
    max_total_price,
    sort_by
  ) {
    let configs = this._getFromStorage('custom_bundle_configurations', []).filter((c) => c && c.bundle_type === bundle_type);

    if (number_of_properties != null) {
      configs = configs.filter((c) => c.number_of_properties === number_of_properties);
    }
    if (includes_drone_aerial_footage === true) {
      configs = configs.filter((c) => c.includes_drone_aerial_footage === true);
    }
    if (includes_twilight_photography === true) {
      configs = configs.filter((c) => c.includes_twilight_photography === true);
    }
    if (min_total_price != null) {
      configs = configs.filter((c) => c.total_price >= min_total_price);
    }
    if (max_total_price != null) {
      configs = configs.filter((c) => c.total_price <= max_total_price);
    }

    const sortKey = sort_by || 'total_price_asc';

    configs.sort((a, b) => {
      if (sortKey === 'total_price_desc') {
        return (b.total_price || 0) - (a.total_price || 0);
      }
      if (sortKey === 'total_price_asc') {
        return (a.total_price || 0) - (b.total_price || 0);
      }
      return 0;
    });

    return { results: configs, total_count: configs.length };
  }

  // getBundleConfigurationDetail
  getBundleConfigurationDetail(configurationId) {
    const configs = this._getFromStorage('custom_bundle_configurations', []);
    const config = configs.find((c) => c.id === configurationId) || null;

    if (!config) {
      return { configuration: null, per_property_breakdown: [], add_ons_summary: [] };
    }

    const per_property_breakdown = [];
    const n = config.number_of_properties || 0;
    for (let i = 1; i <= n; i += 1) {
      per_property_breakdown.push({
        property_index: i,
        included_services: ['Virtual tour production'],
        notes: ''
      });
    }

    const add_ons_summary = [
      {
        key: 'includes_drone_aerial_footage',
        label: 'Drone aerial footage',
        included: !!config.includes_drone_aerial_footage
      },
      {
        key: 'includes_twilight_photography',
        label: 'Twilight photography',
        included: !!config.includes_twilight_photography
      }
    ];

    // Foreign key resolution for base_package_id
    const virtualTourPackages = this._getFromStorage('virtual_tour_packages', []);
    const basePackage = config.base_package_id
      ? virtualTourPackages.find((p) => p.id === config.base_package_id) || null
      : null;
    const configurationWithRelations = {
      ...config,
      base_package: basePackage
    };

    return {
      configuration: configurationWithRelations,
      per_property_breakdown,
      add_ons_summary
    };
  }

  // saveBundleConfiguration
  saveBundleConfiguration(configurationId) {
    let configs = this._getFromStorage('custom_bundle_configurations', []);
    const idx = configs.findIndex((c) => c.id === configurationId);
    if (idx === -1) {
      return { success: false, message: 'Configuration not found', configuration: null };
    }

    const config = { ...configs[idx], is_saved: true };
    configs[idx] = config;
    this._saveToStorage('custom_bundle_configurations', configs);

    return { success: true, message: 'Configuration saved', configuration: config };
  }

  // addBundleConfigurationToQuote
  addBundleConfigurationToQuote(configurationId, quantity) {
    const qty = quantity != null ? quantity : 1;
    const configs = this._getFromStorage('custom_bundle_configurations', []);
    const config = configs.find((c) => c.id === configurationId) || null;

    if (!config) {
      return { success: false, message: 'Configuration not found', quote: null };
    }

    const quote = this._getOrCreateQuote();
    let quoteItems = this._getFromStorage('quote_items', []);

    const newItem = {
      id: this._generateId('quote_item'),
      quote_id: quote.id,
      item_type: 'custom_bundle_configuration',
      item_id: configurationId,
      quantity: qty,
      estimated_price: (config.total_price || 0) * qty
    };

    quoteItems.push(newItem);
    quote.items.push(newItem.id);

    this._saveToStorage('quote_items', quoteItems);
    this._updateQuoteTotals(quote, quoteItems);

    return { success: true, message: 'Configuration added to quote', quote };
  }

  // getPricingOverview
  getPricingOverview() {
    const packages = this._getFromStorage('virtual_tour_packages', []).filter((p) => p && p.is_active !== false);
    const hostingPlans = this._getFromStorage('hosting_plans', []).filter((h) => h && h.is_active !== false);

    const tiersMap = {};
    packages.forEach((p) => {
      const cat = p.category_id;
      if (!cat) return;
      if (!tiersMap[cat]) {
        tiersMap[cat] = {
          tier_name: cat === 'residential_virtual_tours' ? 'Residential Virtual Tours' : 'Commercial Virtual Tours',
          description: '',
          starting_price: p.base_price || 0,
          example_packages: [p]
        };
      } else {
        if (p.base_price < tiersMap[cat].starting_price) {
          tiersMap[cat].starting_price = p.base_price;
        }
        if (tiersMap[cat].example_packages.length < 3) {
          tiersMap[cat].example_packages.push(p);
        }
      }
    });

    const production_package_tiers = Object.keys(tiersMap).map((k) => tiersMap[k]);

    const hosting_plan_overview = hostingPlans;

    return { production_package_tiers, hosting_plan_overview };
  }

  // getHostingPlanFilterOptions
  getHostingPlanFilterOptions() {
    const tour_capacity_ranges = this._getFromStorage('tour_capacity_ranges', []);

    const billing_cycles = [
      { value: 'monthly', label: 'Monthly billing' },
      { value: 'annual', label: 'Annual billing' }
    ];

    const plans = this._getFromStorage('hosting_plans', []).filter((p) => p && p.is_active !== false);
    let minMonthlyEq = null;
    let maxMonthlyEq = null;

    plans.forEach((p) => {
      const val = p.annual_monthly_equivalent_price || 0;
      if (minMonthlyEq === null || val < minMonthlyEq) minMonthlyEq = val;
      if (maxMonthlyEq === null || val > maxMonthlyEq) maxMonthlyEq = val;
    });

    const price_range = {
      min_monthly_equivalent: minMonthlyEq != null ? minMonthlyEq : 0,
      max_monthly_equivalent: maxMonthlyEq != null ? maxMonthlyEq : 0
    };

    const sort_options = [
      { value: 'price_per_month_asc', label: 'Price per month: Low to High' },
      { value: 'price_per_month_desc', label: 'Price per month: High to Low' }
    ];

    return { tour_capacity_ranges, billing_cycles, price_range, sort_options };
  }

  // searchHostingPlans
  searchHostingPlans(
    plan_section,
    min_tour_capacity,
    max_tour_capacity,
    billing_cycle,
    max_annual_monthly_equivalent_price,
    sort_by
  ) {
    const { results, total_count } = this._filterAndSortHostingPlans({
      plan_section,
      min_tour_capacity,
      max_tour_capacity,
      billing_cycle,
      max_annual_monthly_equivalent_price,
      sort_by
    });

    return { results, total_count };
  }

  // startHostingPlanCheckout
  startHostingPlanCheckout(hosting_plan_id, billing_cycle) {
    const plans = this._getFromStorage('hosting_plans', []);
    const plan = plans.find((p) => p.id === hosting_plan_id && p.is_active !== false) || null;

    if (!plan) {
      return { success: false, message: 'Hosting plan not found', checkout: null, hosting_plan: null };
    }

    if (billing_cycle === 'monthly' && plan.has_monthly_billing !== true) {
      return { success: false, message: 'Plan does not support monthly billing', checkout: null, hosting_plan: plan };
    }

    if (billing_cycle === 'annual' && plan.has_annual_billing !== true) {
      return { success: false, message: 'Plan does not support annual billing', checkout: null, hosting_plan: plan };
    }

    let checkouts = this._getFromStorage('hosting_plan_checkouts', []);

    const checkout = {
      id: this._generateId('hosting_checkout'),
      hosting_plan_id,
      billing_cycle,
      customer_full_name: '',
      created_at: this._nowIso(),
      status: 'draft'
    };

    checkouts.push(checkout);
    this._saveToStorage('hosting_plan_checkouts', checkouts);
    localStorage.setItem('current_hosting_plan_checkout_id', checkout.id);

    const checkoutWithPlan = { ...checkout, hosting_plan: plan };

    return { success: true, message: 'Checkout started', checkout: checkoutWithPlan, hosting_plan: plan };
  }

  // getCurrentHostingPlanCheckout
  getCurrentHostingPlanCheckout() {
    const checkout = this._getOrCreateHostingPlanCheckout();
    if (!checkout) {
      return { checkout: null, hosting_plan: null };
    }
    const plans = this._getFromStorage('hosting_plans', []);
    const plan = plans.find((p) => p.id === checkout.hosting_plan_id) || null;
    const checkoutWithPlan = { ...checkout, hosting_plan: plan };
    return { checkout: checkoutWithPlan, hosting_plan: plan };
  }

  // updateHostingPlanCheckoutCustomerInfo
  updateHostingPlanCheckoutCustomerInfo(customer_full_name) {
    let checkouts = this._getFromStorage('hosting_plan_checkouts', []);
    const currentId = localStorage.getItem('current_hosting_plan_checkout_id') || '';
    const idx = checkouts.findIndex((c) => c.id === currentId);
    if (idx === -1) {
      return { success: false, message: 'No active checkout', checkout: null };
    }
    const checkout = { ...checkouts[idx], customer_full_name };
    checkouts[idx] = checkout;
    this._saveToStorage('hosting_plan_checkouts', checkouts);
    return { success: true, message: 'Customer info updated', checkout };
  }

  // completeHostingPlanCheckout
  completeHostingPlanCheckout() {
    let checkouts = this._getFromStorage('hosting_plan_checkouts', []);
    const currentId = localStorage.getItem('current_hosting_plan_checkout_id') || '';
    const idx = checkouts.findIndex((c) => c.id === currentId);
    if (idx === -1) {
      return { success: false, message: 'No active checkout', checkout: null };
    }
    const checkout = { ...checkouts[idx], status: 'completed' };
    checkouts[idx] = checkout;
    this._saveToStorage('hosting_plan_checkouts', checkouts);
    return { success: true, message: 'Checkout completed', checkout };
  }

  // getConsultationOptions
  getConsultationOptions() {
    const project_types = [
      { value: 'residential', label: 'Residential' },
      { value: 'commercial', label: 'Commercial' },
      { value: 'franchise_rollout_multi_location', label: 'Franchise rollout / multi-location' },
      { value: 'other', label: 'Other' }
    ];

    const durations = [
      { minutes: 30, label: '30-minute consultation' },
      { minutes: 60, label: '60-minute consultation' }
    ];

    const slots = this._getFromStorage('consultation_time_slots', []);
    let startDateIso = null;
    let endDateIso = null;
    slots.forEach((s) => {
      if (!s) return;
      const dStr = this._parseDateOnly(s.start_datetime);
      if (!dStr) return;
      if (!startDateIso || dStr < startDateIso) startDateIso = dStr;
      if (!endDateIso || dStr > endDateIso) endDateIso = dStr;
    });

    const todayStr = new Date().toISOString().split('T')[0];

    const booking_window = {
      start_date_iso: startDateIso || todayStr,
      end_date_iso: endDateIso || todayStr
    };

    return { project_types, durations, booking_window };
  }

  // getConsultationAvailability
  getConsultationAvailability(project_type, duration_minutes, date) {
    const slots = this._findAvailableConsultationSlots(project_type, duration_minutes, date);
    const time_slots = slots.map((s) => ({
      time_slot_id: s.id,
      start_datetime: s.start_datetime,
      end_datetime: s.end_datetime,
      is_booked: s.is_booked
    }));
    return { date, time_slots };
  }

  // createConsultationBooking
  createConsultationBooking(project_type, duration_minutes, time_slot_id, contact_name, contact_email) {
    let slots = this._getFromStorage('consultation_time_slots', []);
    const slotIdx = slots.findIndex((s) => s.id === time_slot_id);
    if (slotIdx === -1) {
      return { success: false, message: 'Time slot not found', booking: null };
    }
    const slot = slots[slotIdx];
    if (slot.is_booked) {
      return { success: false, message: 'Time slot already booked', booking: null };
    }

    const bookings = this._getFromStorage('consultation_bookings', []);

    const booking = {
      id: this._generateId('consultation_booking'),
      project_type,
      duration_minutes,
      start_datetime: slot.start_datetime,
      end_datetime: slot.end_datetime,
      time_slot_id: slot.id,
      contact_name,
      contact_email,
      status: 'pending',
      created_at: this._nowIso()
    };

    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    slots[slotIdx] = { ...slot, is_booked: true };
    this._saveToStorage('consultation_time_slots', slots);

    const bookingWithSlot = { ...booking, time_slot: slot };

    return { success: true, message: 'Consultation booked', booking: bookingWithSlot };
  }

  // getPortfolioFilterOptions
  getPortfolioFilterOptions() {
    const tours = this._getFromStorage('portfolio_tours', []).filter((t) => t && t.is_active !== false);

    const seenTypes = new Set();
    const property_types = [];
    tours.forEach((t) => {
      if (t.property_type && !seenTypes.has(t.property_type)) {
        seenTypes.add(t.property_type);
        property_types.push({
          value: t.property_type,
          label: this._capitalizeWordsFromEnum(t.property_type)
        });
      }
    });

    const feature_flags = [
      { key: 'has_3d_walkthrough', label: '3D walkthrough' },
      { key: 'has_floor_plan_overlay', label: 'Floor plan overlay' }
    ];

    let minDur = null;
    let maxDur = null;
    tours.forEach((t) => {
      const d = t.duration_seconds || 0;
      if (minDur === null || d < minDur) minDur = d;
      if (maxDur === null || d > maxDur) maxDur = d;
    });

    const duration_limits = {
      min_duration_seconds: minDur != null ? minDur : 0,
      max_duration_seconds: maxDur != null ? maxDur : 0
    };

    const sort_options = [
      { value: 'duration_asc', label: 'Duration: Short to Long' },
      { value: 'duration_desc', label: 'Duration: Long to Short' },
      { value: 'recent_desc', label: 'Most recent' }
    ];

    return { property_types, feature_flags, duration_limits, sort_options };
  }

  // searchPortfolioTours
  searchPortfolioTours(
    property_type,
    has_3d_walkthrough,
    has_floor_plan_overlay,
    min_duration_seconds,
    max_duration_seconds,
    sort_by
  ) {
    const { results, total_count } = this._filterAndSortPortfolioTours({
      property_type,
      has_3d_walkthrough,
      has_floor_plan_overlay,
      min_duration_seconds,
      max_duration_seconds,
      sort_by
    });
    return { results, total_count };
  }

  // getPortfolioTourDetail
  getPortfolioTourDetail(tourId) {
    const tours = this._getFromStorage('portfolio_tours', []);
    const tour = tours.find((t) => t.id === tourId) || null;
    return { tour };
  }

  // addTourToFavorites
  addTourToFavorites(tourId) {
    const tours = this._getFromStorage('portfolio_tours', []);
    const tour = tours.find((t) => t.id === tourId) || null;
    if (!tour) {
      return { success: false, message: 'Tour not found', favorite: null };
    }

    let favorites = this._getOrCreateFavoritesList();
    const existing = favorites.find((f) => f.tour_id === tourId);
    if (existing) {
      const favoriteWithTour = { ...existing, tour };
      return { success: true, message: 'Already in favorites', favorite: favoriteWithTour };
    }

    const favorite = {
      id: this._generateId('favorite_tour'),
      tour_id: tourId,
      added_at: this._nowIso()
    };

    favorites.push(favorite);
    this._saveToStorage('favorite_tours', favorites);

    const favoriteWithTour = { ...favorite, tour };

    return { success: true, message: 'Added to favorites', favorite: favoriteWithTour };
  }

  // getFavoriteTours
  getFavoriteTours() {
    const favorites = this._getOrCreateFavoritesList();
    const tours = this._getFromStorage('portfolio_tours', []);

    const items = favorites.map((f) => {
      const tour = tours.find((t) => t.id === f.tour_id) || null;
      const favoriteWithTour = { ...f, tour };
      return { favorite: favoriteWithTour, tour };
    });

    return { items };
  }

  // removeFavoriteTour
  removeFavoriteTour(favoriteId) {
    let favorites = this._getOrCreateFavoritesList();
    const beforeLen = favorites.length;
    favorites = favorites.filter((f) => f.id !== favoriteId);
    this._saveToStorage('favorite_tours', favorites);
    const success = favorites.length < beforeLen;
    return { success, message: success ? 'Favorite removed' : 'Favorite not found' };
  }

  // getCart
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const packages = this._getFromStorage('virtual_tour_packages', []);
    const hostingPlans = this._getFromStorage('hosting_plans', []);
    const bundles = this._getFromStorage('custom_bundle_configurations', []);

    const itemsForCart = cartItems.filter((i) => i.cart_id === cart.id);

    const items_detailed = itemsForCart.map((item) => {
      let product = null;
      let product_name = '';
      let description = '';
      let property_type_label = '';
      if (item.product_type === 'virtual_tour_package') {
        product = packages.find((p) => p.id === item.product_id) || null;
        if (product) {
          product_name = product.name || '';
          description = product.description || '';
          property_type_label = this._capitalizeWordsFromEnum(product.property_type);
        }
      } else if (item.product_type === 'hosting_plan') {
        product = hostingPlans.find((p) => p.id === item.product_id) || null;
        if (product) {
          product_name = product.name || '';
          description = product.description || '';
        }
      } else if (item.product_type === 'custom_bundle_configuration') {
        product = bundles.find((b) => b.id === item.product_id) || null;
        if (product) {
          product_name = product.name || '';
          description = product.description || '';
        }
      }

      const cart_item_with_product = { ...item, product };

      return {
        cart_item: cart_item_with_product,
        product_summary: {
          product_type: item.product_type,
          product_name,
          description,
          property_type_label,
          thumbnail_url: ''
        }
      };
    });

    return { cart, items_detailed };
  }

  // updateCartItemQuantity
  updateCartItemQuantity(cart_item_id, quantity) {
    const newQty = quantity != null ? quantity : 1;
    let cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const idx = cartItems.findIndex((i) => i.id === cart_item_id && i.cart_id === cart.id);
    if (idx === -1) {
      return { success: false, message: 'Cart item not found', cart };
    }
    if (newQty <= 0) {
      cartItems.splice(idx, 1);
    } else {
      cartItems[idx].quantity = newQty;
    }

    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);

    return { success: true, message: 'Cart updated', cart: updatedCart };
  }

  // removeCartItem
  removeCartItem(cart_item_id) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);
    const beforeLen = cartItems.length;
    cartItems = cartItems.filter((i) => !(i.id === cart_item_id && i.cart_id === cart.id));
    this._saveToStorage('cart_items', cartItems);
    const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);
    const success = cartItems.length < beforeLen;
    return { success, message: success ? 'Item removed' : 'Item not found', cart: updatedCart };
  }

  // applyCartPromoCode
  applyCartPromoCode(promo_code) {
    const code = promo_code ? String(promo_code).trim() : '';
    let cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const coupons = this._getFromStorage('coupons', []);

    if (!code) {
      cart.promo_code = null;
      const { cart: updatedCart } = this._recalculateCartTotals(cart, cartItems);
      return { success: true, message: 'Promo code cleared', cart: updatedCart, applied_coupon: null };
    }

    const now = new Date();
    const coupon =
      coupons.find((c) => {
        if (!c || !c.is_active) return false;
        if (String(c.code).toLowerCase() !== code.toLowerCase()) return false;
        if (c.valid_from && new Date(c.valid_from) > now) return false;
        if (c.valid_to && new Date(c.valid_to) < now) return false;
        return true;
      }) || null;

    if (!coupon) {
      return { success: false, message: 'Invalid or expired promo code', cart, applied_coupon: null };
    }

    cart.promo_code = coupon.code;
    const { cart: updatedCart, appliedCoupon } = this._recalculateCartTotals(cart, cartItems);

    return { success: true, message: 'Promo code applied', cart: updatedCart, applied_coupon: appliedCoupon || coupon };
  }

  // getCheckoutSummary
  getCheckoutSummary() {
    const { cart, items_detailed } = this.getCart();

    const totals = {
      subtotal: cart.subtotal || 0,
      discount_total: cart.discount_total || 0,
      tax_total: 0,
      total: cart.total || 0,
      currency: cart.currency || 'usd'
    };

    const simplified_items_detailed = items_detailed.map((item) => ({
      cart_item: item.cart_item,
      product_summary: {
        product_type: item.product_summary.product_type,
        product_name: item.product_summary.product_name,
        description: item.product_summary.description
      }
    }));

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task8_checkoutSummaryViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { cart, items_detailed: simplified_items_detailed, totals };
  }

  // proceedToPaymentFromCheckout
  proceedToPaymentFromCheckout() {
    // Business logic side just acknowledges readiness
    return { success: true, message: 'Proceeding to payment' };
  }

  // getCurrentQuote
  getCurrentQuote() {
    const quote = this._getOrCreateQuote();
    const quoteItems = this._getFromStorage('quote_items', []);
    const virtualTourPackages = this._getFromStorage('virtual_tour_packages', []);
    const bundles = this._getFromStorage('custom_bundle_configurations', []);

    const itemsForQuote = quoteItems.filter((i) => i.quote_id === quote.id);

    const items_detailed = itemsForQuote.map((qi) => {
      let item = null;
      let display_name = '';
      let item_type_label = '';

      if (qi.item_type === 'virtual_tour_package') {
        item = virtualTourPackages.find((p) => p.id === qi.item_id) || null;
        display_name = item ? item.name || '' : '';
        item_type_label = 'Virtual tour package';
      } else if (qi.item_type === 'custom_bundle_configuration') {
        item = bundles.find((b) => b.id === qi.item_id) || null;
        display_name = item ? item.name || '' : '';
        item_type_label = 'Custom bundle configuration';
      }

      const quote_item_with_item = { ...qi, item };

      return {
        quote_item: quote_item_with_item,
        display_name,
        item_type_label,
        estimated_price: qi.estimated_price || 0
      };
    });

    return { quote, items_detailed };
  }

  // submitQuoteRequest
  submitQuoteRequest(
    project_type,
    estimated_locations,
    budget_range,
    desired_start_date,
    communication_preference,
    contact_name,
    contact_email,
    message
  ) {
    const requests = this._getFromStorage('quote_requests', []);

    const desiredStartIso = desired_start_date ? this._toISODate(desired_start_date) : null;

    const quote_request = {
      id: this._generateId('quote_request'),
      project_type,
      estimated_locations: estimated_locations != null ? estimated_locations : null,
      budget_range,
      desired_start_date: desiredStartIso,
      communication_preference,
      contact_name,
      contact_email,
      message: message || '',
      created_at: this._nowIso(),
      status: 'new'
    };

    requests.push(quote_request);
    this._saveToStorage('quote_requests', requests);

    return { success: true, message: 'Quote request submitted', quote_request };
  }

  // getBlogFilterOptions
  getBlogFilterOptions() {
    const articles = this._getFromStorage('blog_articles', []).filter((a) => a && a.is_published !== false);
    const seen = new Set();
    const categories = [];

    articles.forEach((a) => {
      if (a.category && !seen.has(a.category)) {
        seen.add(a.category);
        categories.push({ value: a.category, label: this._capitalizeWordsFromEnum(a.category) });
      }
    });

    const date_range_presets = [
      { key: 'last_6_months', label: 'Last 6 months', months_back: 6 },
      { key: 'last_12_months', label: 'Last 12 months', months_back: 12 }
    ];

    const search_placeholder = 'Search articles...';

    return { categories, date_range_presets, search_placeholder };
  }

  // searchBlogArticles
  searchBlogArticles(category, published_from, published_to, query, sort_by) {
    const { results, total_count } = this._filterAndSortBlogArticles({
      category,
      published_from,
      published_to,
      query,
      sort_by
    });
    return { results, total_count };
  }

  // getBlogArticleDetail
  getBlogArticleDetail(articleId) {
    const articles = this._getFromStorage('blog_articles', []);
    const article = articles.find((a) => a.id === articleId) || null;
    const readingList = this._getFromStorage('reading_list_items', []);
    const is_saved_to_reading_list = !!readingList.find((r) => r.article_id === articleId);
    return { article, is_saved_to_reading_list };
  }

  // saveArticleToReadingList
  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('blog_articles', []);
    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return { success: false, message: 'Article not found', reading_list_item: null };
    }

    let list = this._getOrCreateReadingList();
    const existing = list.find((r) => r.article_id === articleId);
    if (existing) {
      const itemWithArticle = { ...existing, article };
      return { success: true, message: 'Already in reading list', reading_list_item: itemWithArticle };
    }

    const reading_list_item = {
      id: this._generateId('reading_list_item'),
      article_id: articleId,
      added_at: this._nowIso()
    };

    list.push(reading_list_item);
    this._saveToStorage('reading_list_items', list);

    const itemWithArticle = { ...reading_list_item, article };

    return { success: true, message: 'Article added to reading list', reading_list_item: itemWithArticle };
  }

  // getReadingList
  getReadingList() {
    const list = this._getOrCreateReadingList();
    const articles = this._getFromStorage('blog_articles', []);

    const items = list.map((r) => {
      const article = articles.find((a) => a.id === r.article_id) || null;
      const reading_list_item_with_article = { ...r, article };
      return { reading_list_item: reading_list_item_with_article, article };
    });

    return { items };
  }

  // removeReadingListItem
  removeReadingListItem(reading_list_item_id) {
    let list = this._getOrCreateReadingList();
    const beforeLen = list.length;
    list = list.filter((r) => r.id !== reading_list_item_id);
    this._saveToStorage('reading_list_items', list);
    const success = list.length < beforeLen;
    return { success, message: success ? 'Reading list item removed' : 'Reading list item not found' };
  }

  // getSinglePropertyPromotionDetail
  getSinglePropertyPromotionDetail(promotion_type) {
    const type = promotion_type || 'single_property_virtual_tour';
    const promotions = this._getFromStorage('promotions', []);
    const coupons = this._getFromStorage('coupons', []);

    const now = new Date();
    const promotion =
      promotions.find((p) => {
        if (!p || p.is_active === false) return false;
        if (p.promotion_type !== type) return false;
        if (p.start_date && new Date(p.start_date) > now) return false;
        if (p.end_date && new Date(p.end_date) < now) return false;
        return true;
      }) || null;

    let coupon = null;
    if (promotion && promotion.coupon_id) {
      coupon = coupons.find((c) => c.id === promotion.coupon_id) || null;
    }

    const promotionWithCoupon = promotion ? { ...promotion, coupon } : null;

    return { promotion: promotionWithCoupon, coupon };
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