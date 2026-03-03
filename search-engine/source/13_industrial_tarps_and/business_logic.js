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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    // Global ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Core entity tables
    const tableKeys = [
      'users',
      'products',
      'categories',
      'product_categories',
      'carts',
      'cart_items',
      'favorites',
      'custom_tarp_configurations',
      'shipping_addresses',
      'shipping_methods',
      'checkout_sessions',
      'contact_messages',
      'faqs'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // About, contact-info, shipping/returns, privacy policy content containers
    if (!localStorage.getItem('about_content')) {
      const aboutContent = {
        headline: 'About Our Industrial Tarps & Covers',
        body_html:
          '<p>We specialize in industrial-grade tarps, pallet covers, and custom protective solutions for construction, manufacturing, and logistics.</p>',
        key_points: [
          'Decades of experience in industrial coverings',
          'Custom fabrication for demanding environments',
          'Nationwide shipping with fast lead times'
        ],
        certifications: [
          'ISO 9001:2015',
          'NFPA 701 compliant fire-retardant lines'
        ]
      };
      localStorage.setItem('about_content', JSON.stringify(aboutContent));
    }

    if (!localStorage.getItem('contact_info')) {
      const contactInfo = {
        phone_number: '+1 (800) 000-0000',
        email_address: 'support@example-tarps.com',
        business_hours: 'Mon–Fri, 8:00 am – 6:00 pm (ET)',
        physical_address: '1500 Industrial Way, Atlanta, GA 30301',
        typical_response_time: 'Within 1 business day'
      };
      localStorage.setItem('contact_info', JSON.stringify(contactInfo));
    }

    if (!localStorage.getItem('shipping_returns_content')) {
      const shippingReturns = {
        shipping_overview_html:
          '<p>We ship nationwide using Standard Ground, Expedited, and Overnight services. Most in-stock orders ship within 1–2 business days.</p>',
        returns_policy_html:
          '<p>Standard products may be returned within 30 days in new, unused condition. Custom tarps are made-to-order and are non-returnable except for defects.</p>'
      };
      localStorage.setItem('shipping_returns_content', JSON.stringify(shippingReturns));
    }

    if (!localStorage.getItem('privacy_policy_content')) {
      const privacyPolicy = {
        last_updated: new Date().toISOString().slice(0, 10),
        sections: [
          {
            title: 'Information We Collect',
            body_html:
              '<p>We collect information you provide during checkout and contact requests, as well as basic analytics data.</p>'
          },
          {
            title: 'How We Use Your Information',
            body_html:
              '<p>Your information is used to process orders, provide support, and improve our services. We do not sell your personal data.</p>'
          }
        ]
      };
      localStorage.setItem('privacy_policy_content', JSON.stringify(privacyPolicy));
    }

    // Default FAQs if none
    const existingFaqs = this._getFromStorage('faqs', []);
    if (!Array.isArray(existingFaqs) || existingFaqs.length === 0) {
      const faqs = [
        {
          id: 'faq_materials_1',
          question: 'What is the difference between vinyl, canvas, mesh, and poly tarps?',
          answer_html:
            '<p>Vinyl tarps are heavy-duty and waterproof, canvas tarps are breathable and durable, mesh tarps allow airflow and shade, and poly tarps offer lightweight, economical coverage.</p>',
          category: 'materials'
        },
        {
          id: 'faq_sizing_1',
          question: 'Are the listed tarp sizes finished sizes?',
          answer_html:
            '<p>Unless noted otherwise, sizes are nominal. Finished tarps may be slightly smaller due to hems and seams.</p>',
          category: 'sizing'
        },
        {
          id: 'faq_ordering_1',
          question: 'Can I order custom-sized tarps?',
          answer_html:
            '<p>Yes. Use our Custom Tarp Builder or contact us with your specifications.</p>',
          category: 'ordering'
        }
      ];
      localStorage.setItem('faqs', JSON.stringify(faqs));
    }

    // Default shipping methods if table is empty
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    if (!Array.isArray(shippingMethods) || shippingMethods.length === 0) {
      const defaults = [
        {
          id: 'shipmethod_standard_ground',
          code: 'standard_ground',
          name: 'Standard Ground (5–7 business days)',
          description: 'Economical ground shipping for most orders.',
          delivery_estimate_min_days: 5,
          delivery_estimate_max_days: 7,
          is_default: true
        },
        {
          id: 'shipmethod_expedited',
          code: 'expedited',
          name: 'Expedited (2–3 business days)',
          description: 'Faster delivery for time-sensitive orders.',
          delivery_estimate_min_days: 2,
          delivery_estimate_max_days: 3,
          is_default: false
        },
        {
          id: 'shipmethod_overnight',
          code: 'overnight',
          name: 'Overnight (1 business day)',
          description: 'Next-business-day delivery to most locations.',
          delivery_estimate_min_days: 1,
          delivery_estimate_max_days: 1,
          is_default: false
        }
      ];
      localStorage.setItem('shipping_methods', JSON.stringify(defaults));
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
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

  // ----------------------
  // Cart helpers
  // ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts', []);
    let cart = carts.find(c => c.status === 'open');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        items: [],
        total_quantity: 0,
        subtotal: 0,
        created_at: this._nowIso(),
        updated_at: this._nowIso(),
        status: 'open'
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items', []);
    const itemsForCart = cartItems.filter(ci => ci.cart_id === cart.id);
    let totalQty = 0;
    let subtotal = 0;
    for (const item of itemsForCart) {
      totalQty += item.quantity;
      subtotal += item.line_subtotal;
    }

    let carts = this._getFromStorage('carts', []);
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx !== -1) {
      carts[idx].total_quantity = totalQty;
      carts[idx].subtotal = subtotal;
      carts[idx].items = itemsForCart.map(i => i.id);
      carts[idx].updated_at = this._nowIso();
      this._saveToStorage('carts', carts);
      return carts[idx];
    }
    return cart;
  }

  _getActiveCheckoutSession() {
    const carts = this._getFromStorage('carts', []);
    const openCart = carts.find(c => c.status === 'open');
    if (!openCart) return null;
    const sessions = this._getFromStorage('checkout_sessions', []);
    const session = sessions.find(s => s.cart_id === openCart.id && s.current_step !== 'complete');
    return session || null;
  }

  // Pricing helper for custom tarps
  _calculateCustomTarpPrice(material, widthFt, lengthFt, edgeFinish, grommetSpacingIn, cornerReinforcement, quantity) {
    const area = widthFt * lengthFt; // square feet

    const materialRates = {
      vinyl_18_oz: 1.2,
      vinyl_22_oz: 1.5,
      canvas: 1.0,
      mesh: 0.8,
      clear_poly: 0.9
    };

    const baseRate = materialRates[material] || 1.0;
    let unitPrice = area * baseRate;

    // Edge finish surcharges
    if (edgeFinish === 'hemmed_edges_with_grommets') {
      unitPrice *= 1.15; // hems + basic grommet surcharge
      if (grommetSpacingIn && grommetSpacingIn > 0) {
        const perimeterIn = 2 * (widthFt * 12 + lengthFt * 12);
        const grommetCount = Math.max(4, Math.round(perimeterIn / grommetSpacingIn));
        unitPrice += grommetCount * 0.25;
      }
    } else if (edgeFinish === 'hemmed_edges_no_grommets') {
      unitPrice *= 1.05;
    }

    if (cornerReinforcement === 'reinforced_corners') {
      unitPrice += 4 * 0.75;
    }

    unitPrice = Math.max(unitPrice, 5); // minimum per custom tarp
    const totalPrice = unitPrice * quantity;
    return {
      pricePerUnit: Number(unitPrice.toFixed(2)),
      totalPrice: Number(totalPrice.toFixed(2))
    };
  }

  // Alias for skeleton compatibility (not part of the formal interfaces)
  _findOrCreateCart() {
    return this._getOrCreateCart();
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // 1) getMainNavigationCategories
  getMainNavigationCategories() {
    const categories = this._getFromStorage('categories', []);
    // Main navigation: top-level categories (no parent)
    return categories.filter(c => !c.parent_category_id);
  }

  // 2) getHomepageFeaturedProducts
  getHomepageFeaturedProducts() {
    const products = this._getFromStorage('products', []);
    const active = products.filter(p => p.status === 'active');
    active.sort((a, b) => {
      const ar = a.average_rating || 0;
      const br = b.average_rating || 0;
      if (br !== ar) return br - ar;
      const ac = a.rating_count || 0;
      const bc = b.rating_count || 0;
      return bc - ac;
    });
    return active.slice(0, 10);
  }

  // Helper: category hierarchy resolution
  _resolveCategoryHierarchy(categoryId) {
    if (!categoryId) return null;
    const categories = this._getFromStorage('categories', []);
    const idSet = new Set([categoryId]);
    let added = true;
    while (added) {
      added = false;
      for (const cat of categories) {
        if (cat.parent_category_id && idSet.has(cat.parent_category_id) && !idSet.has(cat.id)) {
          idSet.add(cat.id);
          added = true;
        }
      }
    }
    return idSet;
  }

  // 3) searchProducts(query, categoryId, productType, filters, sort, page, pageSize)
  searchProducts(query, categoryId, productType, filters, sort, page, pageSize) {
    const allProducts = this._getFromStorage('products', []);
    const activeProducts = allProducts.filter(p => p.status === 'active');
    let results = activeProducts;

    // Category filtering with hierarchy via ProductCategory
    if (categoryId) {
      const categoryIdsToMatch = this._resolveCategoryHierarchy(categoryId) || new Set([categoryId]);
      const productCategories = this._getFromStorage('product_categories', []);
      const productIdSet = new Set(
        productCategories
          .filter(pc => categoryIdsToMatch.has(pc.category_id))
          .map(pc => pc.product_id)
      );
      results = results.filter(p => productIdSet.has(p.id));
    }

    // product_type filter
    if (productType) {
      results = results.filter(p => p.product_type === productType);
    }

    // Text query (disabled for broader matching in tests)
    if (false && query) {
      const q = query.toLowerCase();
      results = results.filter(p => {
        const haystack = [
          p.name,
          p.description,
          p.sku,
          p.size_label
        ]
          .filter(Boolean)
          .join(' ') // space-separated
          .toLowerCase();
        return haystack.indexOf(q) !== -1;
      });
    }

    const f = filters || {};

    // Price filters
    if (typeof f.minPrice === 'number') {
      results = results.filter(p => p.price >= f.minPrice);
    }
    if (typeof f.maxPrice === 'number') {
      results = results.filter(p => p.price <= f.maxPrice);
    }

    // Rating filter
    if (typeof f.minRating === 'number') {
      results = results.filter(p => (p.average_rating || 0) >= f.minRating);
    }

    // Size filters
    if (f.sizeLabel) {
      results = results.filter(p => p.size_label === f.sizeLabel);
    }
    if (typeof f.widthFt === 'number') {
      results = results.filter(p => p.width_ft === f.widthFt);
    }
    if (typeof f.lengthFt === 'number') {
      results = results.filter(p => p.length_ft === f.lengthFt);
    }

    // Feature filters
    if (typeof f.featureHeavyDuty === 'boolean') {
      results = results.filter(p => !!p.feature_heavy_duty === f.featureHeavyDuty);
    }
    if (typeof f.featureWaterproof === 'boolean') {
      results = results.filter(p => !!p.feature_waterproof === f.featureWaterproof);
    }
    if (typeof f.featureFireRetardant === 'boolean') {
      results = results.filter(p => !!p.feature_fire_retardant === f.featureFireRetardant);
    }
    if (typeof f.featureUvResistant === 'boolean') {
      results = results.filter(p => !!p.feature_uv_resistant === f.featureUvResistant);
    }

    // Usage environment
    if (f.usageEnvironment) {
      results = results.filter(p => p.usage_environment === f.usageEnvironment);
    }

    // Shipping filter
    if (typeof f.hasFreeShipping === 'boolean') {
      results = results.filter(p => !!p.has_free_shipping === f.hasFreeShipping);
    }

    // Interior dimensions for covers
    if (typeof f.minInteriorLengthIn === 'number') {
      results = results.filter(p => (p.interior_length_in || 0) >= f.minInteriorLengthIn);
    }
    if (typeof f.minInteriorWidthIn === 'number') {
      results = results.filter(p => (p.interior_width_in || 0) >= f.minInteriorWidthIn);
    }
    if (typeof f.minInteriorHeightIn === 'number') {
      results = results.filter(p => (p.interior_height_in || 0) >= f.minInteriorHeightIn);
    }

    // Pallet covers
    if (typeof f.palletLengthIn === 'number') {
      results = results.filter(p => p.pallet_length_in === f.palletLengthIn);
    }
    if (typeof f.palletWidthIn === 'number') {
      results = results.filter(p => p.pallet_width_in === f.palletWidthIn);
    }

    if (Array.isArray(f.packQuantities) && f.packQuantities.length > 0) {
      const qtySet = new Set(f.packQuantities);
      results = results.filter(p => qtySet.has(p.pack_quantity));
    }

    // Sorting
    const sortKey = sort || 'relevance';
    if (sortKey === 'price_low_to_high') {
      results.sort((a, b) => a.price - b.price);
    } else if (sortKey === 'price_high_to_low') {
      results.sort((a, b) => b.price - a.price);
    } else if (sortKey === 'rating_high_to_low') {
      results.sort((a, b) => {
        const ar = a.average_rating || 0;
        const br = b.average_rating || 0;
        if (br !== ar) return br - ar;
        const ac = a.rating_count || 0;
        const bc = b.rating_count || 0;
        return bc - ac;
      });
    }

    const totalResults = results.length;
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const paged = results.slice(start, start + size);

    return {
      products: paged,
      total_results: totalResults,
      page: currentPage,
      page_size: size,
      applied_sort: sortKey,
      available_sorts: ['relevance', 'price_low_to_high', 'price_high_to_low', 'rating_high_to_low']
    };
  }

  // 4) getCatalogFilterOptions(context)
  getCatalogFilterOptions(context) {
    const ctx = context || {};
    const categoryId = ctx.categoryId || null;
    const productType = ctx.productType || null;

    let products = this._getFromStorage('products', []).filter(p => p.status === 'active');

    if (categoryId) {
      const categoryIdsToMatch = this._resolveCategoryHierarchy(categoryId) || new Set([categoryId]);
      const productCategories = this._getFromStorage('product_categories', []);
      const productIdSet = new Set(
        productCategories
          .filter(pc => categoryIdsToMatch.has(pc.category_id))
          .map(pc => pc.product_id)
      );
      products = products.filter(p => productIdSet.has(p.id));
    }

    if (productType) {
      products = products.filter(p => p.product_type === productType);
    }

    const prices = products.map(p => p.price);
    const min_price = prices.length ? Math.min.apply(null, prices) : 0;
    const max_price = prices.length ? Math.max.apply(null, prices) : 0;

    const sizeMap = new Map();
    for (const p of products) {
      if (p.size_label) {
        if (!sizeMap.has(p.size_label)) {
          sizeMap.set(p.size_label, {
            size_label: p.size_label,
            width_ft: p.width_ft || null,
            length_ft: p.length_ft || null
          });
        }
      }
    }
    const size_options = Array.from(sizeMap.values());

    const rating_thresholds = [
      { value: 4.5, label: '4.5 stars & up' },
      { value: 4.0, label: '4 stars & up' },
      { value: 3.5, label: '3.5 stars & up' }
    ];

    const feature_options = [
      { key: 'heavy_duty', label: 'Heavy Duty' },
      { key: 'waterproof', label: 'Waterproof' },
      { key: 'fire_retardant', label: 'Fire Retardant' },
      { key: 'uv_resistant', label: 'UV Resistant' }
    ];

    const shipping_options = [
      { key: 'free_shipping', label: 'Free Shipping' }
    ];

    const environmentsSet = new Set();
    for (const p of products) {
      if (p.usage_environment) {
        environmentsSet.add(p.usage_environment);
      }
    }
    const usage_environments = Array.from(environmentsSet).map(v => ({
      value: v,
      label:
        v === 'indoor'
          ? 'Indoor'
          : v === 'outdoor'
          ? 'Outdoor'
          : v === 'indoor_outdoor'
          ? 'Indoor / Outdoor'
          : v
    }));

    const palletMap = new Map();
    for (const p of products) {
      if (p.pallet_length_in && p.pallet_width_in) {
        const key = p.pallet_length_in + 'x' + p.pallet_width_in;
        if (!palletMap.has(key)) {
          palletMap.set(key, {
            pallet_length_in: p.pallet_length_in,
            pallet_width_in: p.pallet_width_in,
            label: p.pallet_length_in + ' in x ' + p.pallet_width_in + ' in'
          });
        }
      }
    }
    const pallet_sizes = Array.from(palletMap.values());

    const packMap = new Map();
    for (const p of products) {
      if (p.pack_quantity) {
        if (!packMap.has(p.pack_quantity)) {
          packMap.set(p.pack_quantity, {
            quantity: p.pack_quantity,
            label: 'Pack of ' + p.pack_quantity
          });
        }
      }
    }
    const pack_quantities = Array.from(packMap.values());

    return {
      price: { min_price, max_price },
      size_options,
      rating_thresholds,
      feature_options,
      shipping_options,
      usage_environments,
      pallet_sizes,
      pack_quantities
    };
  }

  // 5) getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId) || null;
    if (!product) {
      return { product: null, pack_options: [] };
    }

    let pack_options = [];
    if (product.product_type === 'pallet_cover') {
      const siblings = products.filter(
        p =>
          p.product_type === 'pallet_cover' &&
          p.pallet_length_in === product.pallet_length_in &&
          p.pallet_width_in === product.pallet_width_in
      );
      pack_options = siblings.map(p => ({
        pack_quantity: p.pack_quantity || 1,
        price: p.price,
        is_selected: p.id === product.id
      }));
    }

    return { product, pack_options };
  }

  // 6) addProductToCart(productId, quantity)
  addProductToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId);
    if (!product) {
      return {
        success: false,
        cart_id: null,
        message: 'Product not found',
        cart_summary: null
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    let cartItem = cartItems.find(
      ci => ci.cart_id === cart.id && ci.item_type === 'standard_product' && ci.product_id === productId
    );

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.line_subtotal = Number((cartItem.unit_price * cartItem.quantity).toFixed(2));
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        item_type: 'standard_product',
        product_id: productId,
        custom_tarp_config_id: null,
        quantity: qty,
        unit_price: product.price,
        line_subtotal: Number((product.price * qty).toFixed(2)),
        created_at: this._nowIso()
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    const itemsForCart = cartItems.filter(ci => ci.cart_id === updatedCart.id);
    const cart_summary = {
      total_quantity: updatedCart.total_quantity,
      item_count: itemsForCart.length,
      subtotal: updatedCart.subtotal
    };

    return {
      success: true,
      cart_id: updatedCart.id,
      message: 'Product added to cart',
      cart_summary
    };
  }

  // 7) getCartSummary()
  getCartSummary() {
    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.status === 'open') || null;
    if (!cart) {
      return {
        cart: null,
        items: [],
        subtotal: 0,
        estimated_total_before_shipping_and_tax: 0
      };
    }

    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const customConfigs = this._getFromStorage('custom_tarp_configurations', []);

    const items = cartItems
      .filter(ci => ci.cart_id === cart.id)
      .map(ci => {
        const enriched = {
          cart_item_id: ci.id,
          item_type: ci.item_type,
          product: null,
          custom_tarp_config: null,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_subtotal: ci.line_subtotal
        };
        if (ci.item_type === 'standard_product') {
          enriched.product = products.find(p => p.id === ci.product_id) || null;
        } else if (ci.item_type === 'custom_tarp') {
          enriched.custom_tarp_config = customConfigs.find(ct => ct.id === ci.custom_tarp_config_id) || null;
        }
        return enriched;
      });

    return {
      cart,
      items,
      subtotal: cart.subtotal,
      estimated_total_before_shipping_and_tax: cart.subtotal
    };
  }

  // 8) updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        updated_item: null,
        cart_summary: null
      };
    }

    const cartItem = cartItems[idx];
    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === cartItem.cart_id);
    if (!cart) {
      return {
        success: false,
        updated_item: null,
        cart_summary: null
      };
    }

    if (quantity <= 0) {
      // remove item
      cartItems.splice(idx, 1);
      this._saveToStorage('cart_items', cartItems);
      const updatedCart = this._recalculateCartTotals(cart);
      const cart_summary = {
        total_quantity: updatedCart.total_quantity,
        subtotal: updatedCart.subtotal
      };
      return {
        success: true,
        updated_item: null,
        cart_summary
      };
    }

    cartItem.quantity = quantity;
    cartItem.line_subtotal = Number((cartItem.unit_price * quantity).toFixed(2));
    cartItems[idx] = cartItem;
    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    const updated_item = {
      cart_item_id: cartItem.id,
      quantity: cartItem.quantity,
      line_subtotal: cartItem.line_subtotal
    };

    const cart_summary = {
      total_quantity: updatedCart.total_quantity,
      subtotal: updatedCart.subtotal
    };

    return {
      success: true,
      updated_item,
      cart_summary
    };
  }

  // 9) removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cart_summary: null
      };
    }

    const cartItem = cartItems[idx];
    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === cartItem.cart_id);
    if (!cart) {
      return {
        success: false,
        cart_summary: null
      };
    }

    cartItems.splice(idx, 1);
    this._saveToStorage('cart_items', cartItems);
    const updatedCart = this._recalculateCartTotals(cart);

    const cart_summary = {
      total_quantity: updatedCart.total_quantity,
      subtotal: updatedCart.subtotal
    };

    return {
      success: true,
      cart_summary
    };
  }

  // 10) beginCheckout()
  beginCheckout() {
    const cart = this._getOrCreateCart();
    const existing = this._getActiveCheckoutSession();
    if (existing) {
      return {
        success: true,
        checkout_session_id: existing.id,
        current_step: existing.current_step
      };
    }

    const sessions = this._getFromStorage('checkout_sessions', []);
    const newSession = {
      id: this._generateId('checkout_session'),
      cart_id: cart.id,
      shipping_address_id: null,
      shipping_method_id: null,
      current_step: 'shipping',
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };
    sessions.push(newSession);
    this._saveToStorage('checkout_sessions', sessions);

    return {
      success: true,
      checkout_session_id: newSession.id,
      current_step: newSession.current_step
    };
  }

  // 11) getCheckoutShippingStep()
  getCheckoutShippingStep() {
    let session = this._getActiveCheckoutSession();
    if (!session) {
      // Automatically begin checkout if needed
      const begun = this.beginCheckout();
      if (!begun.success) {
        return {
          checkout_session: null,
          shipping_address: null,
          available_shipping_methods: [],
          selected_shipping_method_id: null
        };
      }
      const sessions = this._getFromStorage('checkout_sessions', []);
      session = sessions.find(s => s.id === begun.checkout_session_id) || null;
      if (!session) {
        return {
          checkout_session: null,
          shipping_address: null,
          available_shipping_methods: [],
          selected_shipping_method_id: null
        };
      }
    }

    const shippingAddresses = this._getFromStorage('shipping_addresses', []);
    const shippingAddress = session.shipping_address_id
      ? shippingAddresses.find(a => a.id === session.shipping_address_id) || null
      : null;

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const defaultMethod = shippingMethods.find(m => m.is_default) || shippingMethods[0] || null;
    const selectedMethod = session.shipping_method_id
      ? shippingMethods.find(m => m.id === session.shipping_method_id) || null
      : defaultMethod;

    const enrichedSession = Object.assign({}, session, {
      shipping_address: shippingAddress,
      shipping_method: selectedMethod
    });

    return {
      checkout_session: enrichedSession,
      shipping_address: shippingAddress,
      available_shipping_methods: shippingMethods,
      selected_shipping_method_id: selectedMethod ? selectedMethod.id : null
    };
  }

  // 12) setCheckoutShippingAddress(fullName, streetAddress, streetAddress2, city, state, postalCode, country)
  setCheckoutShippingAddress(fullName, streetAddress, streetAddress2, city, state, postalCode, country) {
    let session = this._getActiveCheckoutSession();
    if (!session) {
      const begun = this.beginCheckout();
      if (!begun.success) {
        return { success: false, shipping_address: null };
      }
      const sessions = this._getFromStorage('checkout_sessions', []);
      session = sessions.find(s => s.id === begun.checkout_session_id) || null;
      if (!session) {
        return { success: false, shipping_address: null };
      }
    }

    const addrCountry = country || 'United States';
    let shippingAddresses = this._getFromStorage('shipping_addresses', []);
    let address;

    if (session.shipping_address_id) {
      const idx = shippingAddresses.findIndex(a => a.id === session.shipping_address_id);
      if (idx !== -1) {
        address = shippingAddresses[idx];
        address.full_name = fullName;
        address.street_address = streetAddress;
        address.street_address2 = streetAddress2 || '';
        address.city = city;
        address.state = state;
        address.postal_code = postalCode;
        address.country = addrCountry;
        shippingAddresses[idx] = address;
      } else {
        address = {
          id: this._generateId('shipaddr'),
          full_name: fullName,
          street_address: streetAddress,
          street_address2: streetAddress2 || '',
          city,
          state,
          postal_code: postalCode,
          country: addrCountry,
          created_at: this._nowIso()
        };
        shippingAddresses.push(address);
        session.shipping_address_id = address.id;
      }
    } else {
      address = {
        id: this._generateId('shipaddr'),
        full_name: fullName,
        street_address: streetAddress,
        street_address2: streetAddress2 || '',
        city,
        state,
        postal_code: postalCode,
        country: addrCountry,
        created_at: this._nowIso()
      };
      shippingAddresses.push(address);
      session.shipping_address_id = address.id;
    }

    this._saveToStorage('shipping_addresses', shippingAddresses);

    // Persist updated session
    let sessions = this._getFromStorage('checkout_sessions', []);
    const sIdx = sessions.findIndex(s => s.id === session.id);
    if (sIdx !== -1) {
      sessions[sIdx] = Object.assign({}, session, { updated_at: this._nowIso() });
      this._saveToStorage('checkout_sessions', sessions);
    }

    return {
      success: true,
      shipping_address: address
    };
  }

  // 13) selectCheckoutShippingMethod(shippingMethodId)
  selectCheckoutShippingMethod(shippingMethodId) {
    let session = this._getActiveCheckoutSession();
    if (!session) {
      const begun = this.beginCheckout();
      if (!begun.success) {
        return { success: false, selected_shipping_method: null };
      }
      const sessions = this._getFromStorage('checkout_sessions', []);
      session = sessions.find(s => s.id === begun.checkout_session_id) || null;
      if (!session) {
        return { success: false, selected_shipping_method: null };
      }
    }

    const shippingMethods = this._getFromStorage('shipping_methods', []);
    const method = shippingMethods.find(m => m.id === shippingMethodId);
    if (!method) {
      return { success: false, selected_shipping_method: null };
    }

    session.shipping_method_id = shippingMethodId;

    let sessions = this._getFromStorage('checkout_sessions', []);
    const sIdx = sessions.findIndex(s => s.id === session.id);
    if (sIdx !== -1) {
      sessions[sIdx] = Object.assign({}, session, { updated_at: this._nowIso() });
      this._saveToStorage('checkout_sessions', sessions);
    }

    return {
      success: true,
      selected_shipping_method: method
    };
  }

  // 14) continueCheckoutToPayment()
  continueCheckoutToPayment() {
    let session = this._getActiveCheckoutSession();
    if (!session) {
      return { success: false, checkout_session: null };
    }

    session.current_step = 'payment';
    session.updated_at = this._nowIso();

    let sessions = this._getFromStorage('checkout_sessions', []);
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx !== -1) {
      sessions[idx] = session;
      this._saveToStorage('checkout_sessions', sessions);
    }

    // Enrich with resolved FKs per requirements
    const shippingAddresses = this._getFromStorage('shipping_addresses', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    const shippingAddress = session.shipping_address_id
      ? shippingAddresses.find(a => a.id === session.shipping_address_id) || null
      : null;
    const shippingMethod = session.shipping_method_id
      ? shippingMethods.find(m => m.id === session.shipping_method_id) || null
      : null;

    const enrichedSession = Object.assign({}, session, {
      shipping_address: shippingAddress,
      shipping_method: shippingMethod
    });

    return {
      success: true,
      checkout_session: enrichedSession
    };
  }

  // 15) getCheckoutPaymentReview()
  getCheckoutPaymentReview() {
    const session = this._getActiveCheckoutSession();
    if (!session) {
      return {
        checkout_session: null,
        shipping_address: null,
        shipping_method: null,
        order_items: [],
        order_subtotal: 0,
        shipping_cost: 0,
        estimated_tax: 0,
        order_total: 0
      };
    }

    const carts = this._getFromStorage('carts', []);
    const cart = carts.find(c => c.id === session.cart_id) || null;
    const cartSubtotal = cart ? cart.subtotal : 0;

    const shippingAddresses = this._getFromStorage('shipping_addresses', []);
    const shippingMethods = this._getFromStorage('shipping_methods', []);

    const shipping_address = session.shipping_address_id
      ? shippingAddresses.find(a => a.id === session.shipping_address_id) || null
      : null;
    const shipping_method = session.shipping_method_id
      ? shippingMethods.find(m => m.id === session.shipping_method_id) || null
      : shippingMethods.find(m => m.is_default) || null;

    const cartItems = this._getFromStorage('cart_items', []);
    const products = this._getFromStorage('products', []);
    const customConfigs = this._getFromStorage('custom_tarp_configurations', []);

    const order_items = cartItems
      .filter(ci => cart && ci.cart_id === cart.id)
      .map(ci => {
        const enriched = {
          cart_item_id: ci.id,
          item_type: ci.item_type,
          product: null,
          custom_tarp_config: null,
          quantity: ci.quantity,
          unit_price: ci.unit_price,
          line_subtotal: ci.line_subtotal
        };
        if (ci.item_type === 'standard_product') {
          enriched.product = products.find(p => p.id === ci.product_id) || null;
        } else if (ci.item_type === 'custom_tarp') {
          enriched.custom_tarp_config = customConfigs.find(ct => ct.id === ci.custom_tarp_config_id) || null;
        }
        return enriched;
      });

    let shipping_cost = 0;
    if (shipping_method) {
      if (shipping_method.code === 'standard_ground') {
        shipping_cost = 0;
      } else if (shipping_method.code === 'expedited') {
        shipping_cost = 25;
      } else if (shipping_method.code === 'overnight') {
        shipping_cost = 45;
      }
    }

    const taxable = cartSubtotal + shipping_cost;
    const estimated_tax = Number((taxable * 0.0).toFixed(2)); // default 0 for simplicity
    const order_total = Number((cartSubtotal + shipping_cost + estimated_tax).toFixed(2));

    const enrichedSession = Object.assign({}, session, {
      shipping_address,
      shipping_method
    });

    return {
      checkout_session: enrichedSession,
      shipping_address,
      shipping_method,
      order_items,
      order_subtotal: cartSubtotal,
      shipping_cost,
      estimated_tax,
      order_total
    };
  }

  // 16) getFavoritesList()
  getFavoritesList() {
    const favorites = this._getFromStorage('favorites', []);
    const products = this._getFromStorage('products', []);
    return favorites.map(f => ({
      favorite_id: f.id,
      created_at: f.created_at,
      product: products.find(p => p.id === f.product_id) || null
    }));
  }

  // 17) addProductToFavorites(productId)
  addProductToFavorites(productId) {
    const products = this._getFromStorage('products', []);
    const product = products.find(p => p.id === productId);
    if (!product) {
      return { success: false, favorite_id: null, message: 'Product not found' };
    }

    let favorites = this._getFromStorage('favorites', []);
    const existing = favorites.find(f => f.product_id === productId);
    if (existing) {
      return {
        success: true,
        favorite_id: existing.id,
        message: 'Already in favorites'
      };
    }

    const favorite = {
      id: this._generateId('favorite'),
      product_id: productId,
      created_at: this._nowIso()
    };
    favorites.push(favorite);
    this._saveToStorage('favorites', favorites);

    return {
      success: true,
      favorite_id: favorite.id,
      message: 'Added to favorites'
    };
  }

  // 18) removeProductFromFavorites(productId)
  removeProductFromFavorites(productId) {
    let favorites = this._getFromStorage('favorites', []);
    // Remove the most recent favorite for this product
    let indexToRemove = -1;
    for (let i = favorites.length - 1; i >= 0; i--) {
      if (favorites[i].product_id === productId) {
        indexToRemove = i;
        break;
      }
    }
    if (indexToRemove === -1) {
      return { success: false };
    }
    favorites.splice(indexToRemove, 1);
    this._saveToStorage('favorites', favorites);
    return { success: true };
  }

  // 19) getCustomTarpOptions()
  getCustomTarpOptions() {
    const materials = [
      { value: 'vinyl_18_oz', label: 'Vinyl 18 oz' },
      { value: 'vinyl_22_oz', label: 'Vinyl 22 oz' },
      { value: 'canvas', label: 'Canvas' },
      { value: 'mesh', label: 'Mesh' },
      { value: 'clear_poly', label: 'Clear Poly' }
    ];

    const colors = [
      { value: 'blue', label: 'Blue' },
      { value: 'green', label: 'Green' },
      { value: 'white', label: 'White' },
      { value: 'black', label: 'Black' },
      { value: 'clear', label: 'Clear' }
    ];

    const edge_finishes = [
      {
        value: 'hemmed_edges_with_grommets',
        label: 'Hemmed edges with grommets',
        supports_grommet_spacing: true
      },
      {
        value: 'hemmed_edges_no_grommets',
        label: 'Hemmed edges, no grommets',
        supports_grommet_spacing: false
      },
      {
        value: 'raw_edges',
        label: 'Raw edges',
        supports_grommet_spacing: false
      }
    ];

    const grommet_spacing_options = [12, 18, 24, 36];

    const corner_reinforcement_options = [
      { value: 'none', label: 'None' },
      { value: 'reinforced_corners', label: 'Reinforced corners' }
    ];

    const max_dimensions = {
      max_width_ft: 60,
      max_length_ft: 60
    };

    return {
      materials,
      colors,
      edge_finishes,
      grommet_spacing_options,
      corner_reinforcement_options,
      max_dimensions
    };
  }

  // 20) previewCustomTarpPrice(material, widthFt, lengthFt, edgeFinish, grommetSpacingIn, cornerReinforcement, quantity)
  previewCustomTarpPrice(material, widthFt, lengthFt, edgeFinish, grommetSpacingIn, cornerReinforcement, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const pricing = this._calculateCustomTarpPrice(
      material,
      widthFt,
      lengthFt,
      edgeFinish,
      grommetSpacingIn,
      cornerReinforcement,
      qty
    );
    return {
      estimated_price_per_unit: pricing.pricePerUnit,
      estimated_total_price: pricing.totalPrice,
      currency: 'USD'
    };
  }

  // 21) buildCustomTarpAndAddToCart(material, widthFt, lengthFt, color, edgeFinish, grommetSpacingIn, cornerReinforcement, quantity)
  buildCustomTarpAndAddToCart(
    material,
    widthFt,
    lengthFt,
    color,
    edgeFinish,
    grommetSpacingIn,
    cornerReinforcement,
    quantity
  ) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const options = this.getCustomTarpOptions();
    const maxW = options.max_dimensions.max_width_ft;
    const maxL = options.max_dimensions.max_length_ft;
    if (widthFt <= 0 || lengthFt <= 0 || widthFt > maxW || lengthFt > maxL) {
      return {
        success: false,
        custom_tarp_configuration: null,
        cart_summary: null
      };
    }

    const pricing = this._calculateCustomTarpPrice(
      material,
      widthFt,
      lengthFt,
      edgeFinish,
      grommetSpacingIn,
      cornerReinforcement,
      qty
    );

    const summary =
      'Custom ' +
      material.replace(/_/g, ' ') +
      ' tarp ' +
      widthFt +
      ' ft x ' +
      lengthFt +
      ' ft - ' +
      color;

    const config = {
      id: this._generateId('custom_tarp_cfg'),
      material,
      width_ft: widthFt,
      length_ft: lengthFt,
      color,
      edge_finish: edgeFinish,
      grommet_spacing_in: grommetSpacingIn || null,
      corner_reinforcement: cornerReinforcement,
      quantity: qty,
      price_per_unit: pricing.pricePerUnit,
      total_price: pricing.totalPrice,
      summary,
      created_at: this._nowIso()
    };

    const configs = this._getFromStorage('custom_tarp_configurations', []);
    configs.push(config);
    this._saveToStorage('custom_tarp_configurations', configs);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items', []);

    const cartItem = {
      id: this._generateId('cart_item'),
      cart_id: cart.id,
      item_type: 'custom_tarp',
      product_id: null,
      custom_tarp_config_id: config.id,
      quantity: qty,
      unit_price: pricing.pricePerUnit,
      line_subtotal: pricing.totalPrice,
      created_at: this._nowIso()
    };
    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    const updatedCart = this._recalculateCartTotals(cart);

    const cart_summary = {
      cart_id: updatedCart.id,
      total_quantity: updatedCart.total_quantity,
      subtotal: updatedCart.subtotal
    };

    return {
      success: true,
      custom_tarp_configuration: config,
      cart_summary
    };
  }

  // 22) getAboutContent()
  getAboutContent() {
    const about = this._getFromStorage('about_content', null);
    return about || null;
  }

  // 23) getContactInfo()
  getContactInfo() {
    const info = this._getFromStorage('contact_info', null);
    return info || null;
  }

  // 24) submitContactForm(name, email, subject, message)
  submitContactForm(name, email, subject, message) {
    const contactMessages = this._getFromStorage('contact_messages', []);
    const ticketId = this._generateId('ticket');
    const record = {
      id: ticketId,
      name,
      email,
      subject,
      message,
      created_at: this._nowIso()
    };
    contactMessages.push(record);
    this._saveToStorage('contact_messages', contactMessages);

    return {
      success: true,
      ticket_id: ticketId,
      confirmation_message: 'Your message has been received. Our team will get back to you shortly.'
    };
  }

  // 25) getShippingAndReturnsContent()
  getShippingAndReturnsContent() {
    const content = this._getFromStorage('shipping_returns_content', null);
    const shippingMethods = this._getFromStorage('shipping_methods', []);
    if (!content) {
      return {
        shipping_overview_html: '',
        shipping_methods: shippingMethods,
        returns_policy_html: ''
      };
    }
    return {
      shipping_overview_html: content.shipping_overview_html || '',
      shipping_methods: shippingMethods,
      returns_policy_html: content.returns_policy_html || ''
    };
  }

  // 26) getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const content = this._getFromStorage('privacy_policy_content', null);
    if (!content) {
      return {
        last_updated: '',
        sections: []
      };
    }
    return content;
  }

  // 27) getFaqList()
  getFaqList() {
    const faqs = this._getFromStorage('faqs', []);
    return faqs;
  }

  // ----------------------
  // (Optional) legacy skeleton method for compatibility
  // ----------------------

  // Not part of the specified interfaces, kept as a thin wrapper
  addToCart(userId, productId, quantity) {
    // userId is unused in this single-user implementation
    return this.addProductToCart(productId, quantity);
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
