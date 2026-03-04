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
    this.idCounter = this._getNextIdCounter();
  }

  // Initialize all data tables in localStorage if not exist
  _initStorage() {
    // Core ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Base tables (arrays)
    const arrayKeys = [
      'users',
      'products',
      'product_variants',
      'categories',
      'collections',
      'cart_items',
      'favorites',
      'orders',
      'order_items',
      'shipping_options',
      'shipping_rules',
      // Legacy/compat keys from skeleton (unused in core logic but kept empty)
      'carts',
      'cartItems',
      // CMS-like content containers
      'faq_content',
      'contact_messages'
    ];

    arrayKeys.forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // Single cart object (single-user/session cart)
    if (!localStorage.getItem('cart')) {
      const cart = {
        id: this._generateId('cart'),
        items: [], // array of CartItem IDs
        subtotal: 0,
        shipping_cost: 0,
        tax: 0,
        total: 0,
        shipping_method: 'none', // enum: 'none', 'standard_shipping', 'free_shipping', 'express_shipping'
        free_shipping_applied: false,
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this._saveToStorage('cart', cart);
    }

    // Static page content containers (objects)
    const objectKeysWithDefaults = {
      about_artist_content: {
        headline: '',
        body_html: '',
        profile_image_url: '',
        themes: [],
        printing_practices_html: ''
      },
      contact_page_content: {
        support_email: '',
        support_phone: '',
        response_time_estimate: '',
        contact_reasons: []
      },
      shipping_and_returns_content: {
        shipping_overview_html: '',
        returns_policy_html: ''
      },
      privacy_policy_content: {
        last_updated: '',
        body_html: ''
      },
      terms_and_conditions_content: {
        last_updated: '',
        body_html: ''
      }
    };

    Object.keys(objectKeysWithDefaults).forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(objectKeysWithDefaults[key]));
      }
    });
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : null;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // Corrupt data; reset to default
      return defaultValue !== undefined ? defaultValue : null;
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  // ---------- Generic helpers ----------

  _findProductById(productId) {
    const products = this._getFromStorage('products', []);
    return products.find(p => p.id === productId) || null;
  }

  _findVariantById(variantId) {
    const variants = this._getFromStorage('product_variants', []);
    return variants.find(v => v.id === variantId) || null;
  }

  _effectivePriceForVariant(variant) {
    if (!variant) return 0;
    return typeof variant.sale_price === 'number' && variant.sale_price >= 0
      ? variant.sale_price
      : (variant.base_price || 0);
  }

  _describeVariant(variant) {
    if (!variant) return '';
    const parts = [];
    if (variant.size_label) parts.push(variant.size_label);
    if (variant.product_format) parts.push(variant.product_format.replace(/_/g, ' '));
    if (variant.material && variant.material !== 'digital') {
      parts.push(variant.material.replace(/_/g, ' '));
    }
    if (variant.frame_color && variant.frame_color !== 'none') {
      parts.push(variant.frame_color.replace(/_/g, ' ') + ' frame');
    }
    if (variant.mat_color && variant.mat_color !== 'none') {
      parts.push(variant.mat_color.replace(/_/g, ' ') + ' mat');
    }
    if (variant.paper_finish && variant.paper_finish !== 'none') {
      parts.push(variant.paper_finish.replace(/_/g, ' ') + ' finish');
    }
    if (variant.license_type && variant.license_type !== 'none') {
      parts.push(variant.license_type.replace(/_/g, ' ') + ' license');
    }
    return parts.join(', ');
  }

  _getProductsForContext(category_id, collection_id, search_query) {
    let products = this._getFromStorage('products', []);
    const collections = this._getFromStorage('collections', []);

    products = products.filter(p => p.status === 'active');

    if (category_id && category_id !== 'all_prints') {
      products = products.filter(p => {
        if (p.primary_category === category_id) return true;
        // limited_editions category derived from edition flags
        if (category_id === 'limited_editions') {
          return p.is_limited_edition === true || p.edition_type === 'limited_edition';
        }
        // subject tag matching as fallback
        if (Array.isArray(p.subject_tags) && p.subject_tags.includes(category_id)) return true;
        // via collections with same category
        if (Array.isArray(p.collection_ids) && p.collection_ids.length) {
          const cols = collections.filter(c => p.collection_ids.includes(c.id));
          return cols.some(c => c.category_id === category_id);
        }
        return false;
      });
    }

    if (collection_id) {
      products = products.filter(p => Array.isArray(p.collection_ids) && p.collection_ids.includes(collection_id));
    }

    if (search_query && search_query.trim()) {
      const q = search_query.toLowerCase();
      products = products.filter(p => {
        const inTitle = (p.title || '').toLowerCase().includes(q);
        const inSubtitle = (p.subtitle || '').toLowerCase().includes(q);
        const inDesc = (p.description || '').toLowerCase().includes(q);
        const inCity = (p.city_name || '').toLowerCase().includes(q);
        const inSubjects = Array.isArray(p.subject_tags) && p.subject_tags.some(t => (t || '').toLowerCase().includes(q));
        const inKeywords = Array.isArray(p.keyword_tags) && p.keyword_tags.some(t => (t || '').toLowerCase().includes(q));
        return inTitle || inSubtitle || inDesc || inCity || inSubjects || inKeywords;
      });
    }

    return products;
  }

  _filterAndSortProducts(category_id, collection_id, search_query, filters, sort_by) {
    const products = this._getProductsForContext(category_id, collection_id, search_query);
    const variants = this._getFromStorage('product_variants', []);
    const categories = this._getFromStorage('categories', []);

    filters = filters || {};
    const {
      orientation,
      size_labels,
      min_price,
      max_price,
      min_rating,
      product_formats,
      materials,
      edition_type,
      subject_tags,
      min_width_in,
      black_and_white_only,
      free_shipping_eligible_only
    } = filters;

    const productSummaries = [];

    products.forEach(p => {
      if (typeof min_rating === 'number' && p.rating < min_rating) return;
      if (edition_type && p.edition_type !== edition_type) return;
      if (black_and_white_only && p.is_black_and_white !== true) return;
      if (Array.isArray(subject_tags) && subject_tags.length) {
        const tags = Array.isArray(p.subject_tags) ? p.subject_tags : [];
        const hasAny = subject_tags.some(t => tags.includes(t));
        if (!hasAny) return;
      }

      // Variant-level filtering
      const variantsForProduct = variants.filter(v => v.product_id === p.id && (v.available !== false));
      let matchingVariants = variantsForProduct.filter(v => {
        // orientation
        if (Array.isArray(orientation) && orientation.length) {
          const vOri = v.orientation || p.orientation;
          if (!orientation.includes(vOri)) return false;
        }
        // size
        if (Array.isArray(size_labels) && size_labels.length) {
          if (!size_labels.includes(v.size_label)) return false;
        }
        // price
        const price = this._effectivePriceForVariant(v);
        if (typeof min_price === 'number' && price < min_price) return false;
        if (typeof max_price === 'number' && price > max_price) return false;
        // product format
        if (Array.isArray(product_formats) && product_formats.length) {
          if (!product_formats.includes(v.product_format)) return false;
        }
        // material
        if (Array.isArray(materials) && materials.length) {
          if (!materials.includes(v.material)) return false;
        }
        // min width
        if (typeof min_width_in === 'number' && v.width_in < min_width_in) return false;
        // free shipping eligible
        if (free_shipping_eligible_only) {
          if (v.free_shipping_eligible !== true && p.eligible_for_free_shipping_promo !== true) return false;
        }
        return true;
      });

      if (!matchingVariants.length) return;

      const minPrice = Math.min(...matchingVariants.map(v => this._effectivePriceForVariant(v)));
      const primaryCategory = categories.find(c => c.id === p.primary_category);

      const summary = {
        product: p,
        thumbnail_image_url: p.thumbnail_image_url || p.main_image_url || '',
        primary_category_name: primaryCategory ? primaryCategory.display_name : '',
        min_display_price: minPrice,
        currency: (matchingVariants[0] && matchingVariants[0].currency) || 'USD',
        rating: p.rating,
        rating_count: p.rating_count || 0,
        is_limited_edition: p.is_limited_edition === true || p.edition_type === 'limited_edition',
        edition_size: p.edition_size || null,
        edition_available: p.edition_available || null,
        eligible_for_free_shipping_promo: p.eligible_for_free_shipping_promo === true,
        badge_labels: []
      };

      if (summary.is_limited_edition) {
        summary.badge_labels.push('Limited Edition');
      }
      if (summary.rating >= 4.5 && summary.rating_count >= 10) {
        summary.badge_labels.push('Best Seller');
      }
      if (summary.eligible_for_free_shipping_promo) {
        summary.badge_labels.push('Free Shipping Eligible');
      }

      productSummaries.push(summary);
    });

    // Sorting
    const sortMode = sort_by || 'rating_desc';
    productSummaries.sort((a, b) => {
      if (sortMode === 'price_low_to_high') {
        return a.min_display_price - b.min_display_price;
      }
      if (sortMode === 'price_high_to_low') {
        return b.min_display_price - a.min_display_price;
      }
      if (sortMode === 'edition_size_smallest_first' || sortMode === 'rarity') {
        const aSize = typeof a.edition_size === 'number' ? a.edition_size : Number.MAX_SAFE_INTEGER;
        const bSize = typeof b.edition_size === 'number' ? b.edition_size : Number.MAX_SAFE_INTEGER;
        return aSize - bSize;
      }
      // default rating_desc
      const rDiff = (b.rating || 0) - (a.rating || 0);
      if (rDiff !== 0) return rDiff;
      // tie-break by price low to high
      return a.min_display_price - b.min_display_price;
    });

    return productSummaries;
  }

  // ---------- Cart & Shipping helpers ----------

  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart || !cart.id) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        subtotal: 0,
        shipping_cost: 0,
        tax: 0,
        total: 0,
        shipping_method: 'none',
        free_shipping_applied: false,
        currency: 'USD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _applyShippingRulesToCart(cart, preferredMethodCode) {
    const shippingOptions = this._getFromStorage('shipping_options', []);
    const shippingRules = this._getFromStorage('shipping_rules', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    // Compute subtotal of items eligible for free shipping promos
    let eligibleSubtotal = 0;
    itemsForCart.forEach(ci => {
      const variant = variants.find(v => v.id === ci.product_variant_id);
      const product = products.find(p => p.id === ci.product_id);
      const eligible = (variant && variant.free_shipping_eligible === true) || (product && product.eligible_for_free_shipping_promo === true);
      if (eligible) {
        eligibleSubtotal += ci.line_total || (ci.unit_price * ci.quantity);
      }
    });

    const availableOptions = [];

    if (!shippingOptions.length) {
      // No shipping options configured; treat as no shipping cost
      return {
        shippingOptions: [],
        selectedMethodCode: 'none',
        shipping_cost: 0,
        free_shipping_applied: false
      };
    }

    shippingOptions.forEach(option => {
      if (option.is_active === false) return;
      let effective_cost = typeof option.base_cost === 'number' ? option.base_cost : 0;
      let is_available = true;
      let disabled_reason = '';

      const rulesForOption = shippingRules.filter(r => r.shipping_method === option.code && r.is_active !== false);

      if (rulesForOption.length) {
        // For now, assume a single relevant rule per method, use the strictest
        let minRequired = 0;
        let usesEligibleFlag = false;
        rulesForOption.forEach(rule => {
          if (rule.minimum_subtotal > minRequired) {
            minRequired = rule.minimum_subtotal;
            usesEligibleFlag = rule.eligible_for_free_shipping_promo === true;
          }
        });

        const subtotalToCompare = usesEligibleFlag ? eligibleSubtotal : cart.subtotal;
        if (subtotalToCompare >= minRequired) {
          if (option.code === 'free_shipping') {
            effective_cost = 0;
          }
        } else {
          if (option.code === 'free_shipping') {
            is_available = false;
            disabled_reason = `Requires minimum subtotal of $${minRequired.toFixed(2)}`;
          }
        }
      }

      availableOptions.push({
        shipping_option: option,
        code: option.code,
        effective_cost,
        currency: option.currency || cart.currency || 'USD',
        is_selected: false,
        is_available,
        disabled_reason
      });
    });

    let selectedCode = preferredMethodCode && preferredMethodCode !== 'none' ? preferredMethodCode : null;

    if (!selectedCode) {
      const defaultOpt = shippingOptions.find(o => o.is_default) || shippingOptions.find(o => o.code === 'standard_shipping') || shippingOptions[0];
      selectedCode = defaultOpt ? defaultOpt.code : 'none';
    }

    let selectedOptionDetail = availableOptions.find(o => o.code === selectedCode && o.is_available);
    if (!selectedOptionDetail) {
      selectedOptionDetail = availableOptions.find(o => o.is_available) || availableOptions[0] || null;
    }

    if (selectedOptionDetail) {
      selectedOptionDetail.is_selected = true;
      selectedCode = selectedOptionDetail.code;
    } else {
      selectedCode = 'none';
    }

    const shipping_cost = selectedOptionDetail ? selectedOptionDetail.effective_cost : 0;
    const free_shipping_applied = selectedOptionDetail && selectedOptionDetail.code === 'free_shipping' && shipping_cost === 0;

    return {
      shippingOptions: availableOptions,
      selectedMethodCode: selectedCode,
      shipping_cost,
      free_shipping_applied
    };
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);

    let subtotal = 0;
    itemsForCart.forEach(ci => {
      const lineTotal = typeof ci.line_total === 'number' ? ci.line_total : (ci.unit_price * ci.quantity);
      subtotal += lineTotal;
    });

    cart.subtotal = subtotal;

    const shippingData = this._applyShippingRulesToCart(cart, cart.shipping_method);

    cart.shipping_method = shippingData.selectedMethodCode || 'none';
    cart.shipping_cost = shippingData.shipping_cost || 0;
    cart.free_shipping_applied = !!shippingData.free_shipping_applied;

    // For simplicity, tax is 0 in this implementation (could be extended)
    cart.tax = 0;
    cart.total = cart.subtotal + cart.shipping_cost + cart.tax;
    cart.updated_at = new Date().toISOString();

    this._saveToStorage('cart', cart);
    return cart;
  }

  _getCurrentFavorites() {
    return this._getFromStorage('favorites', []);
  }

  _createOrderFromCart(cart, shipping_method_code, shipping_address, contact_email, contact_phone, paymentMeta) {
    const orders = this._getFromStorage('orders', []);
    const order_items = this._getFromStorage('order_items', []);
    const cart_items = this._getFromStorage('cart_items', []);

    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);
    if (!itemsForCart.length) {
      return { order: null, order_items: [] };
    }

    const orderId = this._generateId('order');

    const order = {
      id: orderId,
      cart_id: cart.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'paid',
      item_ids: [],
      subtotal: cart.subtotal,
      shipping_cost: cart.shipping_cost,
      tax: cart.tax,
      total: cart.total,
      currency: cart.currency || 'USD',
      shipping_method: shipping_method_code,
      shipping_full_name: shipping_address && shipping_address.full_name ? shipping_address.full_name : '',
      shipping_street_address: shipping_address && shipping_address.street_address ? shipping_address.street_address : '',
      shipping_city: shipping_address && shipping_address.city ? shipping_address.city : '',
      shipping_state_province: shipping_address && shipping_address.state_province ? shipping_address.state_province : '',
      shipping_postal_code: shipping_address && shipping_address.postal_code ? shipping_address.postal_code : '',
      shipping_country: shipping_address && shipping_address.country ? shipping_address.country : '',
      contact_email,
      contact_phone,
      payment_method: 'credit_card',
      payment_card_last4: paymentMeta.card_last4,
      payment_card_expiration: paymentMeta.card_expiration,
      payment_card_brand: paymentMeta.card_brand,
      billing_name: paymentMeta.billing_name || '',
      confirmation_sent_at: null
    };

    itemsForCart.forEach(ci => {
      const orderItemId = this._generateId('order_item');
      const orderItem = {
        id: orderItemId,
        order_id: orderId,
        product_id: ci.product_id,
        product_variant_id: ci.product_variant_id,
        product_title_snapshot: ci.product_title_snapshot,
        variant_description: ci.variant_description,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_total: ci.line_total || ci.unit_price * ci.quantity,
        is_digital: ci.is_digital === true,
        license_type: ci.license_type || 'none'
      };
      order.item_ids.push(orderItemId);
      order_items.push(orderItem);
    });

    orders.push(order);

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', order_items);

    return { order, order_items: order_items.filter(oi => oi.order_id === order.id) };
  }

  _maskPaymentDetails(order) {
    return {
      payment_method: order.payment_method,
      card_last4: order.payment_card_last4,
      card_brand: order.payment_card_brand || 'Unknown',
      card_expiration: order.payment_card_expiration
    };
  }

  // ---------- Core interface implementations ----------

  // getNavCategories()
  getNavCategories() {
    const categories = this._getFromStorage('categories', []);
    const visible = categories
      .filter(c => c.is_nav_visible !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return visible.map(c => ({
      id: c.id,
      display_name: c.display_name,
      description: c.description || '',
      is_nav_visible: c.is_nav_visible !== false,
      sort_order: c.sort_order || 0
    }));
  }

  // getHomePageContent()
  getHomePageContent() {
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const collections = this._getFromStorage('collections', []);

    const activeProducts = products.filter(p => p.status === 'active');

    // Featured products: first few active products with a price
    const featured_products = activeProducts.slice(0, 12).map(p => {
      const vForProduct = variants.filter(v => v.product_id === p.id && (v.available !== false));
      const prices = vForProduct.map(v => this._effectivePriceForVariant(v)).filter(n => typeof n === 'number');
      const display_price = prices.length ? Math.min(...prices) : 0;
      return {
        product: p,
        thumbnail_image_url: p.thumbnail_image_url || p.main_image_url || '',
        display_price,
        currency: (vForProduct[0] && vForProduct[0].currency) || 'USD',
        is_limited_edition: p.is_limited_edition === true || p.edition_type === 'limited_edition',
        edition_size: p.edition_size || null,
        edition_available: p.edition_available || null,
        rating: p.rating,
        rating_count: p.rating_count || 0,
        eligible_for_free_shipping_promo: p.eligible_for_free_shipping_promo === true
      };
    });

    // Featured collections: those marked featured
    const featuredCollectionsRaw = collections.filter(c => c.featured === true);
    const categories = this._getFromStorage('categories', []);
    const featured_collections = featuredCollectionsRaw.map(col => {
      const category = categories.find(cat => cat.id === col.category_id) || null;
      return {
        ...col,
        category: category
      };
    });

    // Limited edition highlights
    const limitedProducts = activeProducts.filter(p => p.is_limited_edition === true || p.edition_type === 'limited_edition');
    const limited_edition_highlights = limitedProducts.slice(0, 8).map(p => {
      const vForProduct = variants.filter(v => v.product_id === p.id && (v.available !== false));
      const prices = vForProduct.map(v => this._effectivePriceForVariant(v)).filter(n => typeof n === 'number');
      const display_price = prices.length ? Math.min(...prices) : 0;
      return {
        product: p,
        thumbnail_image_url: p.thumbnail_image_url || p.main_image_url || '',
        display_price,
        currency: (vForProduct[0] && vForProduct[0].currency) || 'USD',
        edition_size: p.edition_size || null,
        edition_available: p.edition_available || null
      };
    });

    // Cart & favorites counts
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items', []);
    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);
    const cart_item_count = itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    const favorites = this._getCurrentFavorites();
    const favorites_count = favorites.length;

    return {
      featured_products,
      featured_collections,
      limited_edition_highlights,
      cart_item_count,
      favorites_count
    };
  }

  // getCollectionsOverview()
  getCollectionsOverview() {
    const collections = this._getFromStorage('collections', []);
    const categories = this._getFromStorage('categories', []);
    const products = this._getFromStorage('products', []);

    return collections.map(col => {
      const category = categories.find(c => c.id === col.category_id) || null;
      const product_count = Array.isArray(col.product_ids)
        ? col.product_ids.filter(pid => products.some(p => p.id === pid)).length
        : 0;
      return {
        collection: col,
        category_display_name: category ? category.display_name : '',
        category,
        product_count
      };
    });
  }

  // getCollectionHeader(collection_id)
  getCollectionHeader(collection_id) {
    const collections = this._getFromStorage('collections', []);
    const categories = this._getFromStorage('categories', []);
    const collection = collections.find(c => c.id === collection_id) || null;

    if (!collection) {
      return {
        collection: null,
        category_display_name: '',
        hero_image_url: '',
        subtitle: '',
        suggested_combinations: []
      };
    }

    const category = categories.find(c => c.id === collection.category_id) || null;

    // Suggested combinations can be empty or derived heuristically
    const suggested_combinations = [];

    return {
      collection,
      category_display_name: category ? category.display_name : '',
      category,
      hero_image_url: collection.hero_image_url || '',
      subtitle: collection.description || '',
      suggested_combinations
    };
  }

  // getCatalogFilterOptions(category_id, collection_id, search_query)
  getCatalogFilterOptions(category_id, collection_id, search_query) {
    const products = this._getProductsForContext(category_id, collection_id, search_query);
    const variants = this._getFromStorage('product_variants', []);

    const productIds = products.map(p => p.id);
    const relevantVariants = variants.filter(v => productIds.includes(v.product_id) && (v.available !== false));

    // Orientation options
    const orientationMap = new Map();
    relevantVariants.forEach(v => {
      const ori = v.orientation || (products.find(p => p.id === v.product_id) || {}).orientation;
      if (!ori) return;
      const key = ori;
      if (!orientationMap.has(key)) {
        orientationMap.set(key, { value: key, label: key.charAt(0).toUpperCase() + key.slice(1), count: 0 });
      }
      const entry = orientationMap.get(key);
      entry.count += 1;
    });

    // Size options
    const sizeMap = new Map();
    relevantVariants.forEach(v => {
      const key = v.size_label;
      if (!key) return;
      if (!sizeMap.has(key)) {
        sizeMap.set(key, {
          size_label: v.size_label,
          width_in: v.width_in,
          height_in: v.height_in,
          count: 0
        });
      }
      const entry = sizeMap.get(key);
      entry.count += 1;
    });

    // Product format options
    const formatMap = new Map();
    relevantVariants.forEach(v => {
      const key = v.product_format;
      if (!key) return;
      if (!formatMap.has(key)) {
        formatMap.set(key, {
          value: key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          count: 0
        });
      }
      const entry = formatMap.get(key);
      entry.count += 1;
    });

    // Material options
    const materialMap = new Map();
    relevantVariants.forEach(v => {
      const key = v.material;
      if (!key) return;
      if (!materialMap.has(key)) {
        materialMap.set(key, {
          value: key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          count: 0
        });
      }
      const entry = materialMap.get(key);
      entry.count += 1;
    });

    // Subject tag options
    const subjectMap = new Map();
    products.forEach(p => {
      (p.subject_tags || []).forEach(tag => {
        if (!subjectMap.has(tag)) {
          subjectMap.set(tag, { tag, label: tag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), count: 0 });
        }
        const entry = subjectMap.get(tag);
        entry.count += 1;
      });
    });

    // Edition type options
    const editionMap = new Map();
    products.forEach(p => {
      if (!p.edition_type) return;
      const key = p.edition_type;
      if (!editionMap.has(key)) {
        editionMap.set(key, {
          value: key,
          label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          count: 0
        });
      }
      const entry = editionMap.get(key);
      entry.count += 1;
    });

    // Rating thresholds: 4.0 and 4.5 by default
    const rating_threshold_options = [4.0, 4.5].map(threshold => ({
      min_rating: threshold,
      label: `${threshold.toFixed(1)} stars & up`,
      count: products.filter(p => p.rating >= threshold).length
    }));

    // Price range
    const prices = relevantVariants.map(v => this._effectivePriceForVariant(v)).filter(n => typeof n === 'number');
    const price_range = {
      min_price: prices.length ? Math.min(...prices) : 0,
      max_price: prices.length ? Math.max(...prices) : 0,
      currency: (relevantVariants[0] && relevantVariants[0].currency) || 'USD'
    };

    const shipping_eligibility_options = [{
      value: 'free_shipping_eligible',
      label: 'Free Shipping Eligible'
    }];

    const sort_options = [
      { value: 'rating_desc', label: 'Rating: High to Low', is_default: true },
      { value: 'price_low_to_high', label: 'Price: Low to High', is_default: false },
      { value: 'price_high_to_low', label: 'Price: High to Low', is_default: false },
      { value: 'edition_size_smallest_first', label: 'Edition Size: Smallest First', is_default: false },
      { value: 'rarity', label: 'Rarity', is_default: false }
    ];

    return {
      orientation_options: Array.from(orientationMap.values()),
      size_options: Array.from(sizeMap.values()),
      product_format_options: Array.from(formatMap.values()),
      material_options: Array.from(materialMap.values()),
      subject_tag_options: Array.from(subjectMap.values()),
      edition_type_options: Array.from(editionMap.values()),
      rating_threshold_options,
      price_range,
      shipping_eligibility_options,
      sort_options
    };
  }

  // getCatalogProducts(category_id, collection_id, search_query, filters, sort_by, page, page_size)
  getCatalogProducts(category_id, collection_id, search_query, filters, sort_by, page, page_size) {
    page = page || 1;
    page_size = page_size || 24;
    const summaries = this._filterAndSortProducts(category_id, collection_id, search_query, filters, sort_by);

    const total_products = summaries.length;
    const total_pages = Math.max(1, Math.ceil(total_products / page_size));
    const start = (page - 1) * page_size;
    const end = start + page_size;

    const pagedProducts = summaries.slice(start, end);

    return {
      products: pagedProducts,
      pagination: {
        page,
        page_size,
        total_products,
        total_pages
      }
    };
  }

  // getProductDetails(product_id)
  getProductDetails(product_id) {
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);
    const categories = this._getFromStorage('categories', []);

    const product = products.find(p => p.id === product_id) || null;
    if (!product) {
      return {
        product: null,
        display: null,
        configuration_options: null,
        variants: [],
        pricing_summary: null,
        favorite_status: false
      };
    }

    const variantsForProduct = variants.filter(v => v.product_id === product.id && (v.available !== false));

    // Configuration options
    const sizeMap = new Map();
    const formatMap = new Map();
    const materialMap = new Map();
    const frameMap = new Map();
    const matMap = new Map();
    const paperMap = new Map();
    const licenseMap = new Map();

    variantsForProduct.forEach(v => {
      if (v.size_label && !sizeMap.has(v.size_label)) {
        sizeMap.set(v.size_label, {
          size_label: v.size_label,
          width_in: v.width_in,
          height_in: v.height_in,
          orientation: v.orientation || product.orientation
        });
      }

      if (v.product_format && !formatMap.has(v.product_format)) {
        formatMap.set(v.product_format, {
          value: v.product_format,
          label: v.product_format.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        });
      }

      if (v.material && !materialMap.has(v.material)) {
        materialMap.set(v.material, {
          value: v.material,
          label: v.material.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        });
      }

      if (v.frame_color && !frameMap.has(v.frame_color)) {
        frameMap.set(v.frame_color, {
          value: v.frame_color,
          label: v.frame_color.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        });
      }

      if (v.mat_color && !matMap.has(v.mat_color)) {
        matMap.set(v.mat_color, {
          value: v.mat_color,
          label: v.mat_color.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        });
      }

      if (v.paper_finish && !paperMap.has(v.paper_finish)) {
        paperMap.set(v.paper_finish, {
          value: v.paper_finish,
          label: v.paper_finish.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        });
      }

      if (v.license_type && !licenseMap.has(v.license_type)) {
        licenseMap.set(v.license_type, {
          value: v.license_type,
          label: v.license_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        });
      }
    });

    const prices = variantsForProduct.map(v => this._effectivePriceForVariant(v)).filter(n => typeof n === 'number');

    const primaryCategory = categories.find(c => c.id === product.primary_category);

    const configuration_options = {
      size_options: Array.from(sizeMap.values()),
      product_format_options: Array.from(formatMap.values()),
      material_options: Array.from(materialMap.values()),
      frame_color_options: Array.from(frameMap.values()),
      mat_color_options: Array.from(matMap.values()),
      paper_finish_options: Array.from(paperMap.values()),
      license_type_options: Array.from(licenseMap.values())
    };

    const display = {
      main_image_url: product.main_image_url || '',
      gallery_image_urls: product.gallery_image_urls || [],
      rating: product.rating,
      rating_count: product.rating_count || 0,
      primary_category_name: primaryCategory ? primaryCategory.display_name : '',
      subject_tags: product.subject_tags || []
    };

    const favorites = this._getCurrentFavorites();
    const favorite_status = favorites.some(f => f.product_id === product.id);

    const pricing_summary = {
      min_price: prices.length ? Math.min(...prices) : 0,
      max_price: prices.length ? Math.max(...prices) : 0,
      currency: (variantsForProduct[0] && variantsForProduct[0].currency) || 'USD'
    };

    return {
      product,
      display,
      configuration_options,
      variants: variantsForProduct,
      pricing_summary,
      favorite_status
    };
  }

  // getVariantPriceAndAvailability(product_id, configuration)
  getVariantPriceAndAvailability(product_id, configuration) {
    const variants = this._getFromStorage('product_variants', []);
    const productVariants = variants.filter(v => v.product_id === product_id);

    if (!productVariants.length) {
      return {
        variant: null,
        final_price: 0,
        currency: 'USD',
        available: false,
        stock_quantity: 0,
        requires_shipping: false
      };
    }

    configuration = configuration || {};
    const {
      size_label,
      product_format,
      material,
      frame_color,
      mat_color,
      paper_finish,
      license_type
    } = configuration;

    let candidates = productVariants.filter(v => {
      if (size_label && v.size_label !== size_label) return false;
      if (product_format && v.product_format !== product_format) return false;
      if (typeof material === 'string' && material && v.material !== material) return false;
      if (typeof frame_color === 'string' && frame_color && v.frame_color !== frame_color) return false;
      if (typeof mat_color === 'string' && mat_color && v.mat_color !== mat_color) return false;
      if (typeof paper_finish === 'string' && paper_finish && v.paper_finish !== paper_finish) return false;
      if (typeof license_type === 'string' && license_type && v.license_type !== license_type) return false;
      return true;
    });

    if (!candidates.length) {
      return {
        variant: null,
        final_price: 0,
        currency: productVariants[0].currency || 'USD',
        available: false,
        stock_quantity: 0,
        requires_shipping: false
      };
    }

    // Pick cheapest available variant
    candidates.sort((a, b) => this._effectivePriceForVariant(a) - this._effectivePriceForVariant(b));
    const variant = candidates[0];
    const final_price = this._effectivePriceForVariant(variant);
    const currency = variant.currency || 'USD';
    const available = variant.available !== false && (variant.stock_quantity === undefined || variant.stock_quantity > 0);
    const requires_shipping = !(variant.is_digital === true || variant.product_format === 'digital_download' || variant.material === 'digital');

    return {
      variant,
      final_price,
      currency,
      available,
      stock_quantity: variant.stock_quantity || 0,
      requires_shipping
    };
  }

  // addItemToCart(product_id, product_variant_id, quantity = 1)
  addItemToCart(product_id, product_variant_id, quantity = 1) {
    quantity = quantity || 1;
    if (quantity <= 0) {
      return { success: false, message: 'Quantity must be at least 1', cart: null };
    }

    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items', []);
    const product = this._findProductById(product_id);
    const variant = this._findVariantById(product_variant_id);

    if (!product || !variant) {
      return { success: false, message: 'Product or variant not found', cart: null };
    }

    if (variant.available === false || (variant.stock_quantity !== undefined && variant.stock_quantity <= 0)) {
      return { success: false, message: 'Variant not available', cart: null };
    }

    const unit_price = this._effectivePriceForVariant(variant);

    let existingItem = cart_items.find(ci => ci.cart_id === cart.id && ci.product_id === product_id && ci.product_variant_id === product_variant_id);

    if (existingItem) {
      existingItem.quantity += quantity;
      existingItem.unit_price = unit_price;
      existingItem.line_total = existingItem.unit_price * existingItem.quantity;
      existingItem.updated_at = new Date().toISOString();
    } else {
      const cartItemId = this._generateId('cart_item');
      existingItem = {
        id: cartItemId,
        cart_id: cart.id,
        product_id,
        product_variant_id,
        product_title_snapshot: product.title,
        variant_description: this._describeVariant(variant),
        quantity,
        unit_price,
        line_total: unit_price * quantity,
        thumbnail_image_url: product.thumbnail_image_url || product.main_image_url || '',
        is_digital: variant.is_digital === true || variant.product_format === 'digital_download',
        requires_shipping: !(variant.is_digital === true || variant.product_format === 'digital_download' || variant.material === 'digital'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        license_type: variant.license_type || 'none'
      };
      cart_items.push(existingItem);
      if (!Array.isArray(cart.items)) cart.items = [];
      if (!cart.items.includes(cartItemId)) cart.items.push(cartItemId);
    }

    this._saveToStorage('cart_items', cart_items);
    const updatedCart = this._recalculateCartTotals(cart);

    const allCartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = allCartItems.filter(ci => ci.cart_id === updatedCart.id);
    const item_count = itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    return {
      success: true,
      message: 'Item added to cart',
      cart: {
        id: updatedCart.id,
        item_count,
        subtotal: updatedCart.subtotal,
        shipping_cost: updatedCart.shipping_cost,
        tax: updatedCart.tax,
        total: updatedCart.total,
        currency: updatedCart.currency,
        free_shipping_applied: updatedCart.free_shipping_applied,
        shipping_method_code: updatedCart.shipping_method
      }
    };
  }

  // Backwards-compatible simple addToCart(userId, productId, quantity) using first available variant
  addToCart(userId, productId, quantity = 1) {
    const variants = this._getFromStorage('product_variants', []);
    const firstVariant = variants.find(v => v.product_id === productId && (v.available !== false));
    if (!firstVariant) {
      return { success: false, cartId: null };
    }
    const result = this.addItemToCart(productId, firstVariant.id, quantity);
    return { success: result.success, cartId: result.cart ? result.cart.id : null };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);
    const items = itemsForCart.map(ci => {
      const product = products.find(p => p.id === ci.product_id) || null;
      const product_variant = variants.find(v => v.id === ci.product_variant_id) || null;
      return {
        cart_item: ci,
        product,
        product_variant
      };
    });

    const item_count = itemsForCart.reduce((sum, ci) => sum + (ci.quantity || 0), 0);

    // Ensure totals are up to date
    const updatedCart = this._recalculateCartTotals(cart);
    const shippingData = this._applyShippingRulesToCart(updatedCart, updatedCart.shipping_method);
    const available_shipping_options = shippingData.shippingOptions.map(opt => ({
      code: opt.code,
      display_name: opt.shipping_option.display_name,
      description: opt.shipping_option.description || '',
      cost: opt.effective_cost,
      currency: opt.currency,
      is_selected: opt.is_selected,
      is_available: opt.is_available,
      disabled_reason: opt.disabled_reason
    }));

    // Free shipping message
    const shippingRules = this._getFromStorage('shipping_rules', []);
    let free_shipping_message = '';
    const freeRules = shippingRules.filter(r => r.shipping_method === 'free_shipping' && r.is_active !== false);
    if (updatedCart.free_shipping_applied) {
      free_shipping_message = 'Free shipping applied';
    } else if (freeRules.length) {
      const minRequired = Math.min(...freeRules.map(r => r.minimum_subtotal || 0));

      // Compute eligible subtotal
      const productsAll = this._getFromStorage('products', []);
      const variantsAll = this._getFromStorage('product_variants', []);
      let eligibleSubtotal = 0;
      itemsForCart.forEach(ci => {
        const variant = variantsAll.find(v => v.id === ci.product_variant_id);
        const product = productsAll.find(p => p.id === ci.product_id);
        const eligible = (variant && variant.free_shipping_eligible === true) || (product && product.eligible_for_free_shipping_promo === true);
        if (eligible) {
          eligibleSubtotal += ci.line_total || ci.unit_price * ci.quantity;
        }
      });

      const remaining = minRequired - eligibleSubtotal;
      if (remaining > 0) {
        free_shipping_message = `Add $${remaining.toFixed(2)} of eligible items for free shipping`;
      } else {
        free_shipping_message = 'Add more eligible items to unlock free shipping option';
      }
    }

    return {
      cart: updatedCart,
      items,
      item_count,
      available_shipping_options,
      free_shipping_message
    };
  }

  // updateCartItemQuantity(cart_item_id, quantity)
  updateCartItemQuantity(cart_item_id, quantity) {
    quantity = quantity || 0;
    let cart = this._getOrCreateCart();
    let cart_items = this._getFromStorage('cart_items', []);

    const index = cart_items.findIndex(ci => ci.id === cart_item_id && ci.cart_id === cart.id);
    if (index === -1) {
      return { success: false, cart, items: cart_items.filter(ci => ci.cart_id === cart.id) };
    }

    if (quantity <= 0) {
      // Remove item
      const removed = cart_items.splice(index, 1)[0];
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter(id => id !== removed.id);
      }
    } else {
      const item = cart_items[index];
      item.quantity = quantity;
      item.line_total = item.unit_price * item.quantity;
      item.updated_at = new Date().toISOString();
    }

    this._saveToStorage('cart_items', cart_items);
    cart = this._recalculateCartTotals(cart);

    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      cart,
      items: itemsForCart
    };
  }

  // removeCartItem(cart_item_id)
  removeCartItem(cart_item_id) {
    let cart = this._getOrCreateCart();
    let cart_items = this._getFromStorage('cart_items', []);
    const index = cart_items.findIndex(ci => ci.id === cart_item_id && ci.cart_id === cart.id);

    if (index === -1) {
      return { success: false, cart, items: cart_items.filter(ci => ci.cart_id === cart.id) };
    }

    const removed = cart_items.splice(index, 1)[0];
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter(id => id !== removed.id);
    }

    this._saveToStorage('cart_items', cart_items);
    cart = this._recalculateCartTotals(cart);

    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);

    return {
      success: true,
      cart,
      items: itemsForCart
    };
  }

  // getShippingOptionsForCart()
  getShippingOptionsForCart() {
    const cart = this._getOrCreateCart();
    const shippingData = this._applyShippingRulesToCart(cart, cart.shipping_method);
    return shippingData.shippingOptions.map(opt => ({
      shipping_option: opt.shipping_option,
      code: opt.code,
      effective_cost: opt.effective_cost,
      currency: opt.currency,
      is_selected: opt.is_selected,
      is_available: opt.is_available,
      disabled_reason: opt.disabled_reason
    }));
  }

  // setCartShippingMethod(shipping_method_code)
  setCartShippingMethod(shipping_method_code) {
    const cart = this._getOrCreateCart();
    const shippingOptionsData = this._applyShippingRulesToCart(cart, shipping_method_code);

    const selected = shippingOptionsData.shippingOptions.find(o => o.code === shipping_method_code);
    if (!selected) {
      return {
        success: false,
        message: 'Shipping method not found',
        cart,
        available_shipping_options: shippingOptionsData.shippingOptions.map(o => ({
          code: o.code,
          display_name: o.shipping_option.display_name,
          cost: o.effective_cost,
          currency: o.currency,
          is_selected: o.is_selected
        }))
      };
    }

    if (!selected.is_available) {
      return {
        success: false,
        message: selected.disabled_reason || 'Shipping method not available for current cart',
        cart,
        available_shipping_options: shippingOptionsData.shippingOptions.map(o => ({
          code: o.code,
          display_name: o.shipping_option.display_name,
          cost: o.effective_cost,
          currency: o.currency,
          is_selected: o.code === shippingOptionsData.selectedMethodCode
        }))
      };
    }

    cart.shipping_method = shipping_method_code;
    const updatedCart = this._recalculateCartTotals(cart);
    const finalShippingData = this._applyShippingRulesToCart(updatedCart, shipping_method_code);

    const available_shipping_options = finalShippingData.shippingOptions.map(o => ({
      code: o.code,
      display_name: o.shipping_option.display_name,
      cost: o.effective_cost,
      currency: o.currency,
      is_selected: o.is_selected
    }));

    return {
      success: true,
      message: 'Shipping method updated',
      cart: updatedCart,
      available_shipping_options
    };
  }

  // getCheckoutPageData()
  getCheckoutPageData() {
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items', []);
    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);

    const shippingData = this._applyShippingRulesToCart(cart, cart.shipping_method);
    const available_shipping_options = shippingData.shippingOptions.map(o => ({
      code: o.code,
      display_name: o.shipping_option.display_name,
      description: o.shipping_option.description || '',
      cost: o.effective_cost,
      currency: o.currency,
      is_selected: o.is_selected
    }));

    const requires_shipping_address = itemsForCart.some(ci => ci.requires_shipping !== false);

    return {
      cart,
      items: itemsForCart,
      available_shipping_options,
      default_contact_email: '',
      default_contact_phone: '',
      requires_shipping_address
    };
  }

  // submitGuestCheckout(shipping_address, shipping_method_code, contact_email, contact_phone, payment)
  submitGuestCheckout(shipping_address, shipping_method_code, contact_email, contact_phone, payment) {
    const cart = this._getOrCreateCart();
    const cart_items = this._getFromStorage('cart_items', []);
    const itemsForCart = cart_items.filter(ci => ci.cart_id === cart.id);

    if (!itemsForCart.length) {
      return { success: false, order: null, order_items: [], redirect_to_order_confirmation: false };
    }

    const requires_shipping_address = itemsForCart.some(ci => ci.requires_shipping !== false);
    if (requires_shipping_address) {
      if (!shipping_address || !shipping_address.full_name || !shipping_address.street_address || !shipping_address.city || !shipping_address.state_province || !shipping_address.postal_code || !shipping_address.country) {
        return { success: false, order: null, order_items: [], redirect_to_order_confirmation: false };
      }
    }

    const shippingOptions = this.getShippingOptionsForCart();
    const selectedOption = shippingOptions.find(o => o.code === shipping_method_code && o.is_available !== false);
    if (!selectedOption) {
      return { success: false, order: null, order_items: [], redirect_to_order_confirmation: false };
    }

    if (!payment || payment.method !== 'credit_card' || !payment.card_number || !payment.expiration_month || !payment.expiration_year || !payment.cvv || !payment.name_on_card) {
      return { success: false, order: null, order_items: [], redirect_to_order_confirmation: false };
    }

    // Simulate payment success and derive card meta
    const card_number = payment.card_number.replace(/\s|-/g, '');
    const card_last4 = card_number.slice(-4);
    const card_brand = card_number.startsWith('4') ? 'Visa' : (card_number.startsWith('5') ? 'Mastercard' : 'Card');
    const card_expiration = `${payment.expiration_month}/${payment.expiration_year}`;

    cart.shipping_method = shipping_method_code;
    this._recalculateCartTotals(cart);

    const { order, order_items } = this._createOrderFromCart(cart, shipping_method_code, shipping_address, contact_email, contact_phone, {
      card_last4,
      card_brand,
      card_expiration,
      billing_name: payment.name_on_card
    });

    if (!order) {
      return { success: false, order: null, order_items: [], redirect_to_order_confirmation: false };
    }

    // Clear cart after successful order
    const remainingCartItems = cart_items.filter(ci => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);
    const emptyCart = {
      ...cart,
      items: [],
      subtotal: 0,
      shipping_cost: 0,
      tax: 0,
      total: 0,
      shipping_method: 'none',
      free_shipping_applied: false,
      updated_at: new Date().toISOString()
    };
    this._saveToStorage('cart', emptyCart);

    return {
      success: true,
      order,
      order_items,
      redirect_to_order_confirmation: true
    };
  }

  // getOrderConfirmation(order_id)
  getOrderConfirmation(order_id) {
    const orders = this._getFromStorage('orders', []);
    const order_items = this._getFromStorage('order_items', []);
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const order = orders.find(o => o.id === order_id) || null;
    if (!order) {
      return {
        order: null,
        items: [],
        masked_payment: null
      };
    }

    const itemsForOrder = order_items.filter(oi => oi.order_id === order.id).map(oi => {
      const product = products.find(p => p.id === oi.product_id) || null;
      const product_variant = variants.find(v => v.id === oi.product_variant_id) || null;
      return {
        ...oi,
        product,
        product_variant
      };
    });

    const masked_payment = this._maskPaymentDetails(order);

    return {
      order,
      items: itemsForOrder,
      masked_payment
    };
  }

  // getFavoritesList()
  getFavoritesList() {
    const favorites = this._getCurrentFavorites();
    const products = this._getFromStorage('products', []);
    const variants = this._getFromStorage('product_variants', []);

    const list = favorites.map(fav => {
      const product = products.find(p => p.id === fav.product_id) || null;
      let min_display_price = 0;
      let currency = 'USD';
      if (product) {
        const vForProduct = variants.filter(v => v.product_id === product.id && (v.available !== false));
        const prices = vForProduct.map(v => this._effectivePriceForVariant(v)).filter(n => typeof n === 'number');
        if (prices.length) {
          min_display_price = Math.min(...prices);
          currency = (vForProduct[0] && vForProduct[0].currency) || 'USD';
        }
      }
      return {
        favorite_item: fav,
        product,
        thumbnail_image_url: product ? (product.thumbnail_image_url || product.main_image_url || '') : '',
        min_display_price,
        currency,
        rating: product ? product.rating : 0
      };
    });

    return {
      favorites: list,
      favorites_count: favorites.length
    };
  }

  // addProductToFavorites(product_id)
  addProductToFavorites(product_id) {
    const favorites = this._getCurrentFavorites();
    if (favorites.some(f => f.product_id === product_id)) {
      return {
        success: true,
        favorite_item: favorites.find(f => f.product_id === product_id),
        favorites_count: favorites.length
      };
    }

    const favorite_item = {
      id: this._generateId('favorite'),
      product_id,
      added_at: new Date().toISOString()
    };
    favorites.push(favorite_item);
    this._saveToStorage('favorites', favorites);

    return {
      success: true,
      favorite_item,
      favorites_count: favorites.length
    };
  }

  // removeProductFromFavorites(product_id)
  removeProductFromFavorites(product_id) {
    let favorites = this._getCurrentFavorites();
    const originalLength = favorites.length;
    favorites = favorites.filter(f => f.product_id !== product_id);
    this._saveToStorage('favorites', favorites);

    return {
      success: favorites.length !== originalLength,
      favorites_count: favorites.length
    };
  }

  // getAboutArtistContent()
  getAboutArtistContent() {
    const content = this._getFromStorage('about_artist_content', {
      headline: '',
      body_html: '',
      profile_image_url: '',
      themes: [],
      printing_practices_html: ''
    });
    return content;
  }

  // getContactPageContent()
  getContactPageContent() {
    const content = this._getFromStorage('contact_page_content', {
      support_email: '',
      support_phone: '',
      response_time_estimate: '',
      contact_reasons: []
    });
    return content;
  }

  // submitContactForm(name, email, subject, message, related_order_id)
  submitContactForm(name, email, subject, message, related_order_id) {
    if (!name || !email || !subject || !message) {
      return {
        success: false,
        message: 'All fields except related_order_id are required.'
      };
    }

    const messages = this._getFromStorage('contact_messages', []);
    const newMessage = {
      id: this._generateId('contact'),
      name,
      email,
      subject,
      message,
      related_order_id: related_order_id || null,
      created_at: new Date().toISOString()
    };
    messages.push(newMessage);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message: 'Your message has been submitted.'
    };
  }

  // getFaqContent()
  getFaqContent() {
    const faqs = this._getFromStorage('faq_content', []);
    return faqs;
  }

  // getShippingAndReturnsContent()
  getShippingAndReturnsContent() {
    const content = this._getFromStorage('shipping_and_returns_content', {
      shipping_overview_html: '',
      returns_policy_html: ''
    });
    const free_shipping_rules = this._getFromStorage('shipping_rules', []);
    return {
      shipping_overview_html: content.shipping_overview_html || '',
      free_shipping_rules,
      returns_policy_html: content.returns_policy_html || ''
    };
  }

  // getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const content = this._getFromStorage('privacy_policy_content', {
      last_updated: '',
      body_html: ''
    });
    return content;
  }

  // getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const content = this._getFromStorage('terms_and_conditions_content', {
      last_updated: '',
      body_html: ''
    });
    return content;
  }

  // getSearchSuggestions(query)
  getSearchSuggestions(query) {
    const q = (query || '').trim().toLowerCase();
    const products = this._getFromStorage('products', []);

    if (!q) {
      return {
        suggested_queries: [],
        matching_subject_tags: [],
        top_matching_products: []
      };
    }

    const subjectTagSet = new Set();
    const topProducts = [];

    products.forEach(p => {
      const title = (p.title || '').toLowerCase();
      const city = (p.city_name || '').toLowerCase();
      const tags = (p.subject_tags || []).map(t => (t || '').toLowerCase());
      const keywords = (p.keyword_tags || []).map(t => (t || '').toLowerCase());

      if (tags.some(t => t.startsWith(q))) {
        tags.forEach(t => {
          if (t.startsWith(q)) subjectTagSet.add(t);
        });
      }
      if (keywords.some(t => t.startsWith(q))) {
        keywords.forEach(t => {
          if (t.startsWith(q)) subjectTagSet.add(t);
        });
      }

      if (title.includes(q) || city.includes(q) || tags.some(t => t.includes(q)) || keywords.some(t => t.includes(q))) {
        if (topProducts.length < 10) {
          topProducts.push({
            product_id: p.id,
            title: p.title,
            thumbnail_image_url: p.thumbnail_image_url || p.main_image_url || ''
          });
        }
      }
    });

    const matching_subject_tags = Array.from(subjectTagSet.values());

    // Suggested queries: subject tags and maybe the raw query
    const suggested_queries = [];
    matching_subject_tags.forEach(tag => {
      suggested_queries.push(tag);
    });
    if (!suggested_queries.length) {
      suggested_queries.push(q);
    }

    return {
      suggested_queries,
      matching_subject_tags,
      top_matching_products: topProducts
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
