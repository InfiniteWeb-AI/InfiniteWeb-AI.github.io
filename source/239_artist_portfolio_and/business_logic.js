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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Helper to ensure an array key exists
    const ensureArrayKey = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    // Legacy/example keys from template (kept for compatibility, not used)
    ensureArrayKey('users');
    ensureArrayKey('cartItems');

    // Core data tables based on storage_key definitions
    ensureArrayKey('products');
    ensureArrayKey('product_variants');
    ensureArrayKey('carts');
    ensureArrayKey('cart_items');
    ensureArrayKey('shipping_methods');
    ensureArrayKey('checkout_sessions');
    ensureArrayKey('commission_requests');
    ensureArrayKey('account_profiles');
    ensureArrayKey('addresses');
    ensureArrayKey('artwork_collections');
    ensureArrayKey('artworks');
    ensureArrayKey('favorite_items');
    ensureArrayKey('newsletter_subscriptions');
    ensureArrayKey('blog_posts');
    ensureArrayKey('contact_messages');

    // Optional CMS-like content containers
    if (!localStorage.getItem('about_page_content')) {
      localStorage.setItem('about_page_content', JSON.stringify({}));
    }
    if (!localStorage.getItem('contact_page_content')) {
      localStorage.setItem('contact_page_content', JSON.stringify({}));
    }

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  // ----------------------
  // Helper: ID to Date
  // ----------------------

  _nowIso() {
    return new Date().toISOString();
  }

  // ----------------------
  // Helper: cart & checkout
  // ----------------------

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = null;

    const currentCartId = localStorage.getItem('current_cart_id');
    if (currentCartId) {
      cart = carts.find((c) => c.id === currentCartId && c.status === 'active');
    }

    if (!cart) {
      cart = carts.find((c) => c.status === 'active');
    }

    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        subtotal: 0,
        shipping_estimate: 0,
        total: 0,
        currency: 'usd',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }

    localStorage.setItem('current_cart_id', cart.id);
    return cart;
  }

  _recalculateCartTotals(cartId, shippingPriceOverride) {
    let carts = this._getFromStorage('carts');
    let cart = carts.find((c) => c.id === cartId);
    if (!cart) {
      return { cart: null, items: [] };
    }

    const allItems = this._getFromStorage('cart_items');
    const items = allItems.filter((i) => i.cart_id === cartId);

    const subtotal = items.reduce((sum, item) => {
      const lineSubtotal = typeof item.line_subtotal === 'number'
        ? item.line_subtotal
        : (item.unit_price || 0) * (item.quantity || 0);
      return sum + lineSubtotal;
    }, 0);

    const shippingEstimate = typeof shippingPriceOverride === 'number'
      ? shippingPriceOverride
      : (typeof cart.shipping_estimate === 'number' ? cart.shipping_estimate : 0);

    cart.subtotal = subtotal;
    cart.shipping_estimate = shippingEstimate;
    cart.total = subtotal + shippingEstimate;
    cart.updated_at = this._nowIso();

    this._saveToStorage('carts', carts);

    return { cart, items };
  }

  _getOrCreateCheckoutSession() {
    const cart = this._getOrCreateCart();
    let sessions = this._getFromStorage('checkout_sessions');
    let session = sessions.find((s) => s.cart_id === cart.id && s.status === 'in_progress');

    if (!session) {
      session = {
        id: this._generateId('chk'),
        cart_id: cart.id,
        status: 'in_progress',
        current_step: 'contact',
        contact_full_name: null,
        contact_email: null,
        shipping_address_street: null,
        shipping_address_city: null,
        shipping_address_state: null,
        shipping_address_postal_code: null,
        shipping_address_country: null,
        selected_shipping_method_id: null,
        selected_shipping_price: null,
        selected_shipping_min_days: null,
        selected_shipping_max_days: null,
        payment_method_type: null,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }

    localStorage.setItem('current_checkout_session_id', session.id);
    return session;
  }

  _updateFavoritesFromItemToggle(itemType, itemId, makeFavorite) {
    let favorites = this._getFromStorage('favorite_items');
    const existingIndex = favorites.findIndex(
      (f) => f.item_type === itemType && f.item_id === itemId
    );

    if (makeFavorite) {
      if (existingIndex === -1) {
        favorites.push({
          id: this._generateId('fav'),
          item_type: itemType,
          item_id: itemId,
          added_at: this._nowIso()
        });
      }
    } else {
      if (existingIndex !== -1) {
        favorites.splice(existingIndex, 1);
      }
    }

    this._saveToStorage('favorite_items', favorites);
    return makeFavorite;
  }

  // ----------------------
  // Helper: hydration for FK resolution
  // ----------------------

  _hydrateProductsWithArtwork(products) {
    const artworks = this._getFromStorage('artworks');
    return products.map((p) => ({
      ...p,
      artwork: p && p.artwork_id
        ? (artworks.find((a) => a.id === p.artwork_id) || null)
        : null
    }));
  }

  _hydrateCartItemsWithRefs(items) {
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');
    return items.map((item) => ({
      ...item,
      product: products.find((p) => p.id === item.product_id) || null,
      productVariant: variants.find((v) => v.id === item.product_variant_id) || null
    }));
  }

  _hydrateArtworksWithCollection(artworks) {
    const collections = this._getFromStorage('artwork_collections');
    return artworks.map((art) => ({
      ...art,
      collection: art && art.collection_id
        ? (collections.find((c) => c.id === art.collection_id) || null)
        : null
    }));
  }

  _hydrateCheckoutSessionWithShipping(session) {
    if (!session) return null;
    const methods = this._getFromStorage('shipping_methods');
    const selectedMethod = session.selected_shipping_method_id
      ? methods.find((m) => m.id === session.selected_shipping_method_id) || null
      : null;
    return {
      ...session,
      selected_shipping_method: selectedMethod
    };
  }

  _formatVariantFormatLabel(formatEnum) {
    if (!formatEnum) return null;
    const map = {
      framed_print: 'Framed Print',
      canvas_wrap: 'Canvas Wrap',
      poster: 'Poster',
      unframed_print: 'Unframed Print',
      digital_download: 'Digital Download'
    };
    return map[formatEnum] || formatEnum;
  }

  // ----------------------
  // Template convenience method (not part of main interface spec)
  // ----------------------

  // Convenience wrapper around addItemToCart using productId only.
  // It picks the default variant (is_default === true) or the first variant.
  addToCart(userId, productId, quantity = 1) { // userId is ignored (single-user context)
    const details = this.getProductDetails(productId);
    const variants = details.variants || [];
    if (!details.product || !variants.length) {
      return { success: false, cartId: null };
    }
    const defaultVariant = variants.find((v) => v.is_default) || variants[0];
    const { cart } = this.addItemToCart(productId, defaultVariant.id, quantity);
    return { success: true, cartId: cart ? cart.id : null };
  }

  // ----------------------
  // Core interface implementations
  // ----------------------

  // 1. getHomePageContent
  getHomePageContent() {
    const products = this._getFromStorage('products');
    const collections = this._getFromStorage('artwork_collections');
    const artworks = this._getFromStorage('artworks');

    const activeProducts = products.filter((p) => p.status === 'active');
    const featuredProductsRaw = activeProducts.slice(0, 6);
    const featuredProducts = this._hydrateProductsWithArtwork(featuredProductsRaw);

    const featuredCollections = collections
      .slice()
      .sort((a, b) => {
        const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return ao - bo;
      })
      .slice(0, 4);

    const publishedArtworks = artworks.filter((a) => a.is_published);
    const recentArtworksRaw = publishedArtworks
      .slice()
      .sort((a, b) => {
        const ad = a.created_at || (a.year ? a.year.toString() : '1970');
        const bd = b.created_at || (b.year ? b.year.toString() : '1970');
        return ad > bd ? -1 : ad < bd ? 1 : 0;
      })
      .slice(0, 12);
    const recentArtworks = this._hydrateArtworksWithCollection(recentArtworksRaw);

    return {
      featuredProducts,
      featuredCollections,
      recentArtworks
    };
  }

  // 2. subscribeToNewsletter
  subscribeToNewsletter(email, name, source) {
    if (!email) {
      throw new Error('email is required');
    }

    let subscriptions = this._getFromStorage('newsletter_subscriptions');

    const validSources = ['footer_form', 'checkout', 'other'];
    const finalSource = validSources.includes(source) ? source : 'footer_form';

    const existingIndex = subscriptions.findIndex((s) => s.email === email);
    if (existingIndex !== -1) {
      // Update existing subscription
      const existing = subscriptions[existingIndex];
      const updated = {
        ...existing,
        name: typeof name === 'string' && name.length ? name : existing.name,
        source: finalSource,
        is_active: true,
        subscribed_at: this._nowIso()
      };
      subscriptions[existingIndex] = updated;
      this._saveToStorage('newsletter_subscriptions', subscriptions);
      return updated;
    }

    const subscription = {
      id: this._generateId('nls'),
      email,
      name: typeof name === 'string' && name.length ? name : null,
      source: finalSource,
      is_active: true,
      subscribed_at: this._nowIso()
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);
    return subscription;
  }

  // 3. searchSiteContent
  searchSiteContent(query, types, limitPerType) {
    const q = (query || '').trim().toLowerCase();
    const limit = typeof limitPerType === 'number' && limitPerType > 0 ? limitPerType : 20;

    const typeSet = new Set(
      (Array.isArray(types) && types.length ? types : ['product', 'artwork', 'blog_post'])
    );

    const result = {
      products: [],
      artworks: [],
      blogPosts: []
    };

    if (!q) {
      return result;
    }

    const contains = (text) => {
      if (!text || typeof text !== 'string') return false;
      return text.toLowerCase().includes(q);
    };

    if (typeSet.has('product')) {
      const products = this._getFromStorage('products').filter((p) => p.status === 'active');
      const matched = products.filter((p) => contains(p.title) || contains(p.description));
      result.products = this._hydrateProductsWithArtwork(matched.slice(0, limit));
    }

    if (typeSet.has('artwork')) {
      const artworks = this._getFromStorage('artworks').filter((a) => a.is_published);
      const matched = artworks.filter((a) => contains(a.title) || contains(a.description));
      result.artworks = this._hydrateArtworksWithCollection(matched.slice(0, limit));
    }

    if (typeSet.has('blog_post')) {
      const posts = this._getFromStorage('blog_posts');
      const matched = posts.filter(
        (p) => contains(p.title) || contains(p.excerpt) || contains(p.content_html)
      );
      result.blogPosts = matched.slice(0, limit);
    }

    return result;
  }

  // 4. getShopFilterOptions
  getShopFilterOptions() {
    const products = this._getFromStorage('products');

    let minAllowed = 0;
    let maxAllowed = 0;
    if (products.length) {
      const prices = products.map((p) => {
        if (typeof p.min_price === 'number') return p.min_price;
        if (typeof p.base_price === 'number') return p.base_price;
        return 0;
      });
      const maxPrices = products.map((p) => {
        if (typeof p.max_price === 'number') return p.max_price;
        if (typeof p.base_price === 'number') return p.base_price;
        return 0;
      });
      minAllowed = Math.min.apply(null, prices);
      maxAllowed = Math.max.apply(null, maxPrices);
    }

    return {
      styles: [
        { value: 'cityscape', label: 'Cityscape' },
        { value: 'landscape', label: 'Landscape' },
        { value: 'abstract', label: 'Abstract' },
        { value: 'portrait', label: 'Portrait' },
        { value: 'floral', label: 'Floral' },
        { value: 'botanical', label: 'Botanical' },
        { value: 'other', label: 'Other' }
      ],
      colorModes: [
        { value: 'color', label: 'Color' },
        { value: 'black_white', label: 'Black & White' },
        { value: 'mixed', label: 'Mixed' }
      ],
      priceRange: {
        minAllowed,
        maxAllowed
      },
      sizeLabels: [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
        { value: 'extra_large', label: 'Extra Large' }
      ],
      shippingOptions: [
        { value: 'all', label: 'All shipping options' },
        { value: 'free_shipping_only', label: 'Free standard shipping only' }
      ],
      ratingThresholds: [
        { minRating: 4.5, label: '4.5 stars & up' },
        { minRating: 4.0, label: '4.0 stars & up' },
        { minRating: 3.0, label: '3.0 stars & up' }
      ],
      reviewCountThresholds: [
        { minReviews: 10, label: '10+ reviews' },
        { minReviews: 25, label: '25+ reviews' },
        { minReviews: 50, label: '50+ reviews' }
      ],
      sortOptions: [
        { value: 'relevance', label: 'Relevance' },
        { value: 'price_low_to_high', label: 'Price: Low to High' },
        { value: 'price_high_to_low', label: 'Price: High to Low' },
        { value: 'rating_high_to_low', label: 'Rating: High to Low' },
        { value: 'newest_first', label: 'Newest First' },
        { value: 'oldest_first', label: 'Oldest First' }
      ]
    };
  }

  // 5. listShopProducts
  listShopProducts(filters, sortBy, page, pageSize) {
    const appliedFilters = filters || {};
    const sort = sortBy || 'relevance';
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 24;

    const allProducts = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');
    const artworks = this._getFromStorage('artworks');

    let products = allProducts.filter((p) => p.status === 'active');

    if (appliedFilters.style) {
      products = products.filter((p) => p.style === appliedFilters.style);
    }

    if (appliedFilters.colorMode) {
      products = products.filter((p) => p.color_mode === appliedFilters.colorMode);
    }

    if (typeof appliedFilters.minPrice === 'number') {
      products = products.filter((p) => {
        const price = typeof p.base_price === 'number' ? p.base_price : 0;
        return price >= appliedFilters.minPrice;
      });
    }

    if (typeof appliedFilters.maxPrice === 'number') {
      products = products.filter((p) => {
        const price = typeof p.base_price === 'number' ? p.base_price : 0;
        return price <= appliedFilters.maxPrice;
      });
    }

    if (appliedFilters.sizeLabel) {
      const sizeLabel = appliedFilters.sizeLabel;
      products = products.filter((p) =>
        variants.some(
          (v) => v.product_id === p.id && v.size_label === sizeLabel
        )
      );
    }

    if (appliedFilters.hasFreeShipping) {
      products = products.filter((p) => p.has_free_shipping === true);
    }

    if (typeof appliedFilters.minRating === 'number') {
      products = products.filter(
        (p) => typeof p.rating_average === 'number' && p.rating_average >= appliedFilters.minRating
      );
    }

    if (typeof appliedFilters.minReviews === 'number') {
      products = products.filter(
        (p) => typeof p.rating_count === 'number' && p.rating_count >= appliedFilters.minReviews
      );
    }

    const priceForSort = (p) => {
      if (typeof p.base_price === 'number') return p.base_price;
      if (typeof p.min_price === 'number') return p.min_price;
      if (typeof p.max_price === 'number') return p.max_price;
      return 0;
    };

    if (sort === 'price_low_to_high') {
      products = products.slice().sort((a, b) => priceForSort(a) - priceForSort(b));
    } else if (sort === 'price_high_to_low') {
      products = products.slice().sort((a, b) => priceForSort(b) - priceForSort(a));
    } else if (sort === 'rating_high_to_low') {
      products = products.slice().sort((a, b) => {
        const ar = typeof a.rating_average === 'number' ? a.rating_average : 0;
        const br = typeof b.rating_average === 'number' ? b.rating_average : 0;
        return br - ar;
      });
    } else if (sort === 'newest_first' || sort === 'oldest_first') {
      products = products.slice().sort((a, b) => {
        const ad = a.created_at || '1970-01-01T00:00:00Z';
        const bd = b.created_at || '1970-01-01T00:00:00Z';
        if (ad === bd) return 0;
        if (sort === 'newest_first') return ad > bd ? -1 : 1;
        return ad < bd ? -1 : 1; // oldest_first
      });
    }

    const totalResults = products.length;
    const start = (currentPage - 1) * size;
    const paginated = products.slice(start, start + size);

    // Hydrate with artwork relation
    const hydrated = paginated.map((p) => ({
      ...p,
      artwork: p && p.artwork_id
        ? (artworks.find((a) => a.id === p.artwork_id) || null)
        : null
    }));

    return {
      products: hydrated,
      totalResults,
      page: currentPage,
      pageSize: size
    };
  }

  // 6. getProductDetails
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');
    const favorites = this._getFromStorage('favorite_items');
    const artworks = this._getFromStorage('artworks');

    const product = products.find((p) => p.id === productId) || null;
    let productVariants = variants.filter((v) => v.product_id === productId);

    // If a product has no explicit variants defined, synthesize a sensible default
    // so that flows depending on variants (e.g. adding to cart) still work.
    if (product && productVariants.length === 0) {
      const derivedPrice = typeof product.base_price === 'number'
        ? product.base_price
        : (typeof product.min_price === 'number'
            ? product.min_price
            : (typeof product.max_price === 'number' ? product.max_price : 0));

      const hasDims = typeof product.max_width_in === 'number' && typeof product.max_height_in === 'number';
      const syntheticVariant = {
        id: product.id + '_default',
        product_id: product.id,
        format: 'unframed_print',
        size_label: 'medium',
        size_name: hasDims ? `${product.max_width_in} x ${product.max_height_in} in` : 'Standard',
        width_in: hasDims ? product.max_width_in : null,
        height_in: hasDims ? product.max_height_in : null,
        price: derivedPrice,
        currency: product.currency || 'usd',
        is_free_shipping_eligible: product.has_free_shipping === true,
        stock_status: 'in_stock',
        sku: (product.id || 'PROD').toUpperCase() + '_DEFAULT',
        is_default: true,
        created_at: product.created_at || this._nowIso(),
        updated_at: product.updated_at || this._nowIso(),
        image: product.main_image_url || product.thumbnail_url || null
      };

      // Persist the synthesized variant so other methods (like addItemToCart)
      // can resolve it by id from storage.
      variants.push(syntheticVariant);
      this._saveToStorage('product_variants', variants);
      productVariants = [syntheticVariant];
    }

    const isFavorite = favorites.some(
      (f) => f.item_type === 'product' && f.item_id === productId
    );

    const relatedArtwork = product && product.artwork_id
      ? (artworks.find((a) => a.id === product.artwork_id) || null)
      : null;

    const hydratedProduct = product
      ? {
          ...product,
          artwork: relatedArtwork
        }
      : null;

    return {
      product: hydratedProduct,
      variants: productVariants,
      isFavorite,
      relatedArtwork
    };
  }

  // 7. toggleFavoriteProduct
  toggleFavoriteProduct(productId, makeFavorite) {
    const isFavorite = this._updateFavoritesFromItemToggle('product', productId, !!makeFavorite);
    return { isFavorite };
  }

  // 8. addItemToCart
  addItemToCart(productId, productVariantId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    const cart = this._getOrCreateCart();
    const products = this._getFromStorage('products');
    const variants = this._getFromStorage('product_variants');
    let cartItems = this._getFromStorage('cart_items');

    const product = products.find((p) => p.id === productId);
    if (!product) throw new Error('Product not found');

    const variant = variants.find((v) => v.id === productVariantId && v.product_id === productId);
    if (!variant) throw new Error('Product variant not found for given product');

    const existingIndex = cartItems.findIndex(
      (ci) =>
        ci.cart_id === cart.id &&
        ci.product_id === productId &&
        ci.product_variant_id === productVariantId
    );

    const unitPrice = variant.price;

    if (existingIndex !== -1) {
      const existing = cartItems[existingIndex];
      const newQty = (existing.quantity || 0) + qty;
      existing.quantity = newQty;
      existing.unit_price = unitPrice;
      existing.line_subtotal = unitPrice * newQty;
      existing.added_at = existing.added_at || this._nowIso();
      cartItems[existingIndex] = existing;
    } else {
      const newItem = {
        id: this._generateId('ci'),
        cart_id: cart.id,
        product_id: productId,
        product_variant_id: productVariantId,
        quantity: qty,
        unit_price: unitPrice,
        line_subtotal: unitPrice * qty,
        title_snapshot: product.title,
        format_label: this._formatVariantFormatLabel(variant.format),
        size_label: variant.size_label || null,
        size_name: variant.size_name || null,
        thumbnail_url: product.thumbnail_url || null,
        added_at: this._nowIso()
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);

    const { cart: updatedCart, items } = this._recalculateCartTotals(cart.id);
    const hydratedItems = this._hydrateCartItemsWithRefs(items);

    return {
      cart: updatedCart,
      items: hydratedItems
    };
  }

  // 9. getCartSummary
  getCartSummary() {
    const cart = this._getOrCreateCart();
    const recalculated = this._recalculateCartTotals(cart.id);
    const hydratedItems = this._hydrateCartItemsWithRefs(recalculated.items);

    return {
      cart: recalculated.cart,
      items: hydratedItems
    };
  }

  // 10. updateCartItemQuantity
  updateCartItemQuantity(cartItemId, quantity) {
    let cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (index === -1) {
      // Nothing to update; return current cart summary
      return this.getCartSummary();
    }

    const item = cartItems[index];
    const cartId = item.cart_id;

    if (quantity <= 0) {
      // Remove item if quantity is zero or negative
      cartItems.splice(index, 1);
    } else {
      item.quantity = quantity;
      item.line_subtotal = (item.unit_price || 0) * quantity;
      cartItems[index] = item;
    }

    this._saveToStorage('cart_items', cartItems);

    const { cart, items } = this._recalculateCartTotals(cartId);
    const hydratedItems = this._hydrateCartItemsWithRefs(items);

    return {
      cart,
      items: hydratedItems
    };
  }

  // 11. removeCartItem
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const index = cartItems.findIndex((ci) => ci.id === cartItemId);

    if (index === -1) {
      return this.getCartSummary();
    }

    const cartId = cartItems[index].cart_id;
    cartItems.splice(index, 1);
    this._saveToStorage('cart_items', cartItems);

    const { cart, items } = this._recalculateCartTotals(cartId);
    const hydratedItems = this._hydrateCartItemsWithRefs(items);

    return {
      cart,
      items: hydratedItems
    };
  }

  // 12. proceedToCheckout
  proceedToCheckout() {
    const cart = this._getOrCreateCart();
    const session = this._getOrCreateCheckoutSession();

    // Ensure session is at contact step and in progress
    let sessions = this._getFromStorage('checkout_sessions');
    const index = sessions.findIndex((s) => s.id === session.id);
    if (index !== -1) {
      sessions[index] = {
        ...sessions[index],
        status: 'in_progress',
        current_step: 'contact',
        updated_at: this._nowIso()
      };
      this._saveToStorage('checkout_sessions', sessions);
    }

    const updatedSession = sessions.find((s) => s.id === session.id) || session;
    return this._hydrateCheckoutSessionWithShipping(updatedSession);
  }

  // 13. getCheckoutSession
  getCheckoutSession() {
    const sessions = this._getFromStorage('checkout_sessions');
    const currentId = localStorage.getItem('current_checkout_session_id');
    let session = null;

    if (currentId) {
      session = sessions.find((s) => s.id === currentId) || null;
    }

    if (!session) {
      // If there is no recorded current session, try to find one for the active cart
      const cart = this._getOrCreateCart();
      session = sessions.find((s) => s.cart_id === cart.id && s.status === 'in_progress') || null;
      if (session) {
        localStorage.setItem('current_checkout_session_id', session.id);
      }
    }

    return this._hydrateCheckoutSessionWithShipping(session);
  }

  // 14. updateCheckoutContactAndShipping
  updateCheckoutContactAndShipping(
    contactFullName,
    contactEmail,
    street,
    city,
    state,
    postalCode,
    country
  ) {
    const session = this._getOrCreateCheckoutSession();
    let sessions = this._getFromStorage('checkout_sessions');
    const index = sessions.findIndex((s) => s.id === session.id);

    if (index === -1) {
      throw new Error('Checkout session not found');
    }

    const updated = {
      ...sessions[index],
      contact_full_name: contactFullName,
      contact_email: contactEmail,
      shipping_address_street: street,
      shipping_address_city: city,
      shipping_address_state: state,
      shipping_address_postal_code: postalCode,
      shipping_address_country: country,
      current_step: 'shipping',
      updated_at: this._nowIso()
    };

    sessions[index] = updated;
    this._saveToStorage('checkout_sessions', sessions);

    return this._hydrateCheckoutSessionWithShipping(updated);
  }

  // 15. getAvailableShippingMethodsForCheckout
  getAvailableShippingMethodsForCheckout() {
    const methods = this._getFromStorage('shipping_methods');
    return methods.filter((m) => m.is_active);
  }

  // 16. selectShippingMethodForCheckout
  selectShippingMethodForCheckout(shippingMethodId) {
    const session = this._getOrCreateCheckoutSession();
    let sessions = this._getFromStorage('checkout_sessions');
    const methods = this._getFromStorage('shipping_methods');

    const method = methods.find((m) => m.id === shippingMethodId);
    if (!method) {
      throw new Error('Shipping method not found');
    }

    const index = sessions.findIndex((s) => s.id === session.id);
    if (index === -1) {
      throw new Error('Checkout session not found');
    }

    const updated = {
      ...sessions[index],
      selected_shipping_method_id: shippingMethodId,
      selected_shipping_price: method.price,
      selected_shipping_min_days: method.min_delivery_days || null,
      selected_shipping_max_days: method.max_delivery_days || null,
      current_step: 'payment',
      updated_at: this._nowIso()
    };

    sessions[index] = updated;
    this._saveToStorage('checkout_sessions', sessions);

    // Update cart totals with chosen shipping cost
    this._recalculateCartTotals(updated.cart_id, method.price);

    return this._hydrateCheckoutSessionWithShipping(updated);
  }

  // 17. updateCheckoutPaymentMethodType
  updateCheckoutPaymentMethodType(paymentMethodType) {
    const allowed = ['credit_card', 'paypal', 'apple_pay', 'google_pay', 'other'];
    const type = allowed.includes(paymentMethodType) ? paymentMethodType : 'other';

    const session = this._getOrCreateCheckoutSession();
    let sessions = this._getFromStorage('checkout_sessions');
    const index = sessions.findIndex((s) => s.id === session.id);

    if (index === -1) {
      throw new Error('Checkout session not found');
    }

    const updated = {
      ...sessions[index],
      payment_method_type: type,
      // keep at least payment step
      current_step: sessions[index].current_step === 'contact' ? 'payment' : sessions[index].current_step,
      updated_at: this._nowIso()
    };

    sessions[index] = updated;
    this._saveToStorage('checkout_sessions', sessions);

    return this._hydrateCheckoutSessionWithShipping(updated);
  }

  // 18. getCommissionOptions
  getCommissionOptions() {
    return {
      types: [
        {
          value: 'pet_portrait',
          label: 'Pet Portrait',
          description: 'Custom portraits of pets in a variety of styles.'
        },
        {
          value: 'people_portrait',
          label: 'People Portrait',
          description: 'Portraits of individuals or groups.'
        },
        {
          value: 'landscape',
          label: 'Landscape',
          description: 'Custom landscape scenes and locations.'
        },
        {
          value: 'abstract',
          label: 'Abstract',
          description: 'Abstract compositions and concepts.'
        },
        {
          value: 'other',
          label: 'Other',
          description: 'Any other custom commission idea.'
        }
      ],
      sizes: [
        { value: 'small', label: 'Small', examplePrice: 100 },
        { value: 'medium', label: 'Medium', examplePrice: 200 },
        { value: 'large', label: 'Large', examplePrice: 300 },
        { value: 'extra_large', label: 'Extra Large', examplePrice: 400 }
      ],
      processDescription:
        'Submit your commission request with details, budget, and timeline. You will receive a follow-up email to confirm scope, pricing, and schedule before any payment is requested.'
    };
  }

  // 19. submitCommissionRequest
  submitCommissionRequest(
    name,
    email,
    commissionType,
    size,
    budget,
    preferredDeadline,
    description
  ) {
    if (!name || !email || !commissionType || !size || !description) {
      throw new Error('Missing required commission fields');
    }

    const requests = this._getFromStorage('commission_requests');

    const request = {
      id: this._generateId('com'),
      name,
      email,
      commission_type: commissionType,
      size,
      budget: typeof budget === 'number' ? budget : Number(budget) || 0,
      preferred_deadline: new Date(preferredDeadline).toISOString(),
      description,
      status: 'new',
      created_at: this._nowIso()
    };

    requests.push(request);
    this._saveToStorage('commission_requests', requests);

    return request;
  }

  // 20. getPortfolioCollections
  getPortfolioCollections() {
    return this._getFromStorage('artwork_collections');
  }

  // 21. listPortfolioArtworks
  listPortfolioArtworks(collectionId, sortBy, page, pageSize) {
    const sort = sortBy || 'newest_first';
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 30;

    let artworks = this._getFromStorage('artworks').filter((a) => a.is_published);

    if (collectionId) {
      artworks = artworks.filter((a) => a.collection_id === collectionId);
    }

    artworks = artworks.slice().sort((a, b) => {
      const ad = a.created_at || (a.year ? a.year.toString() : '1970');
      const bd = b.created_at || (b.year ? b.year.toString() : '1970');
      if (ad === bd) return 0;
      if (sort === 'oldest_first') return ad < bd ? -1 : 1;
      // newest_first (default)
      return ad > bd ? -1 : 1;
    });

    const totalResults = artworks.length;
    const start = (currentPage - 1) * size;
    const paginated = artworks.slice(start, start + size);
    const hydrated = this._hydrateArtworksWithCollection(paginated);

    return {
      artworks: hydrated,
      totalResults,
      page: currentPage,
      pageSize: size
    };
  }

  // 22. getArtworkDetails
  getArtworkDetails(artworkId) {
    const artworks = this._getFromStorage('artworks');
    const collections = this._getFromStorage('artwork_collections');
    const favorites = this._getFromStorage('favorite_items');
    const products = this._getFromStorage('products');

    const artwork = artworks.find((a) => a.id === artworkId) || null;
    const collection = artwork && artwork.collection_id
      ? (collections.find((c) => c.id === artwork.collection_id) || null)
      : null;
    const isFavorite = favorites.some(
      (f) => f.item_type === 'artwork' && f.item_id === artworkId
    );

    const relatedProductsRaw = products.filter(
      (p) => p.artwork_id === artworkId && p.status === 'active'
    );
    const relatedProducts = this._hydrateProductsWithArtwork(relatedProductsRaw);

    return {
      artwork,
      collection,
      isFavorite,
      relatedProducts
    };
  }

  // 23. toggleFavoriteArtwork
  toggleFavoriteArtwork(artworkId, makeFavorite) {
    const isFavorite = this._updateFavoritesFromItemToggle('artwork', artworkId, !!makeFavorite);
    return { isFavorite };
  }

  // 24. getFavoritesOverview
  getFavoritesOverview() {
    const favorites = this._getFromStorage('favorite_items');
    const artworks = this._getFromStorage('artworks');
    const collections = this._getFromStorage('artwork_collections');
    const products = this._getFromStorage('products');

    const favoriteArtworkIds = favorites
      .filter((f) => f.item_type === 'artwork')
      .map((f) => f.item_id);

    const favoriteProductIds = favorites
      .filter((f) => f.item_type === 'product')
      .map((f) => f.item_id);

    const favoriteArtworksRaw = artworks.filter((a) => favoriteArtworkIds.includes(a.id));
    const favoriteArtworks = favoriteArtworksRaw.map((a) => ({
      ...a,
      collection: a && a.collection_id
        ? (collections.find((c) => c.id === a.collection_id) || null)
        : null
    }));

    const favoriteProductsRaw = products.filter((p) => favoriteProductIds.includes(p.id));
    const favoriteProducts = this._hydrateProductsWithArtwork(favoriteProductsRaw);

    return {
      favoriteArtworks,
      favoriteProducts
    };
  }

  // 25. removeFavoriteItem
  removeFavoriteItem(itemType, itemId) {
    const success = this._updateFavoritesFromItemToggle(itemType, itemId, false);
    return { success };
  }

  // 26. createAccount
  createAccount(firstName, lastName, email, password) {
    if (!firstName || !lastName || !email || !password) {
      throw new Error('Missing required account fields');
    }

    let profiles = this._getFromStorage('account_profiles');

    const profile = {
      id: this._generateId('acct'),
      first_name: firstName,
      last_name: lastName,
      email,
      // Password handling is simplified for this local-storage implementation.
      // In a real system, passwords would be hashed and stored separately.
      password,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    profiles.push(profile);
    this._saveToStorage('account_profiles', profiles);
    localStorage.setItem('current_account_profile_id', profile.id);

    return profile;
  }

  // 27. getAccountProfile
  getAccountProfile() {
    const profiles = this._getFromStorage('account_profiles');
    if (!profiles.length) return null;

    const currentId = localStorage.getItem('current_account_profile_id');
    let profile = null;

    if (currentId) {
      profile = profiles.find((p) => p.id === currentId) || null;
    }

    if (!profile) {
      profile = profiles[0];
      localStorage.setItem('current_account_profile_id', profile.id);
    }

    return profile;
  }

  // 28. updateAccountProfile
  updateAccountProfile(firstName, lastName, email, password) {
    let profiles = this._getFromStorage('account_profiles');
    if (!profiles.length) {
      // If no profile exists yet, create one from provided fields (if any)
      if (!email) {
        throw new Error('No existing account and email not provided to create one');
      }
      return this.createAccount(
        firstName || '',
        lastName || '',
        email,
        password || ''
      );
    }

    const currentId = localStorage.getItem('current_account_profile_id');
    const index = profiles.findIndex((p) => p.id === currentId);
    const idx = index !== -1 ? index : 0;

    const existing = profiles[idx];
    const updated = {
      ...existing,
      first_name: firstName !== undefined ? firstName : existing.first_name,
      last_name: lastName !== undefined ? lastName : existing.last_name,
      email: email !== undefined ? email : existing.email,
      password: password !== undefined ? password : existing.password,
      updated_at: this._nowIso()
    };

    profiles[idx] = updated;
    this._saveToStorage('account_profiles', profiles);
    localStorage.setItem('current_account_profile_id', updated.id);

    return updated;
  }

  // 29. listAddresses
  listAddresses() {
    return this._getFromStorage('addresses');
  }

  // 30. addAddress
  addAddress(label, street, city, state, postalCode, country, setAsDefaultShipping) {
    if (!street || !city || !state || !postalCode || !country) {
      throw new Error('Missing required address fields');
    }

    let addresses = this._getFromStorage('addresses');
    const makeDefault = !!setAsDefaultShipping;

    if (makeDefault) {
      addresses = addresses.map((a) => ({
        ...a,
        is_default_shipping: false
      }));
    }

    const address = {
      id: this._generateId('addr'),
      label: label || null,
      street,
      city,
      state,
      postal_code: postalCode,
      country,
      is_default_shipping: makeDefault,
      created_at: this._nowIso(),
      updated_at: this._nowIso()
    };

    addresses.push(address);
    this._saveToStorage('addresses', addresses);

    return address;
  }

  // 31. updateAddress
  updateAddress(addressId, label, street, city, state, postalCode, country, setAsDefaultShipping) {
    let addresses = this._getFromStorage('addresses');
    const index = addresses.findIndex((a) => a.id === addressId);
    if (index === -1) {
      throw new Error('Address not found');
    }

    const existing = addresses[index];

    if (setAsDefaultShipping === true) {
      // Clear default on others
      addresses = addresses.map((a) => ({
        ...a,
        is_default_shipping: a.id === addressId
      }));
    } else if (setAsDefaultShipping === false) {
      existing.is_default_shipping = false;
    }

    const updated = {
      ...existing,
      label: label !== undefined ? label : existing.label,
      street: street !== undefined ? street : existing.street,
      city: city !== undefined ? city : existing.city,
      state: state !== undefined ? state : existing.state,
      postal_code: postalCode !== undefined ? postalCode : existing.postal_code,
      country: country !== undefined ? country : existing.country,
      updated_at: this._nowIso()
    };

    // Re-apply updated record in the addresses array
    const finalAddresses = addresses.map((a) => (a.id === addressId ? {
      ...updated,
      is_default_shipping: setAsDefaultShipping === true
        ? true
        : (setAsDefaultShipping === false ? false : a.is_default_shipping)
    } : a));

    this._saveToStorage('addresses', finalAddresses);

    return finalAddresses.find((a) => a.id === addressId);
  }

  // 32. setDefaultShippingAddress
  setDefaultShippingAddress(addressId) {
    let addresses = this._getFromStorage('addresses');
    addresses = addresses.map((a) => ({
      ...a,
      is_default_shipping: a.id === addressId,
      updated_at: this._nowIso()
    }));
    this._saveToStorage('addresses', addresses);
    return addresses;
  }

  // 33. listBlogPosts
  listBlogPosts(primaryTag, sortBy, page, pageSize) {
    const sort = sortBy || 'newest_first';
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 10;

    let posts = this._getFromStorage('blog_posts');

    if (primaryTag) {
      posts = posts.filter((p) => p.primary_tag === primaryTag);
    }

    posts = posts.slice().sort((a, b) => {
      const ad = a.published_at || '1970-01-01T00:00:00Z';
      const bd = b.published_at || '1970-01-01T00:00:00Z';
      if (ad === bd) return 0;
      if (sort === 'oldest_first') return ad < bd ? -1 : 1;
      // newest_first
      return ad > bd ? -1 : 1;
    });

    const totalResults = posts.length;
    const start = (currentPage - 1) * size;
    const paginated = posts.slice(start, start + size);

    return {
      posts: paginated,
      totalResults,
      page: currentPage,
      pageSize: size
    };
  }

  // 34. getBlogPostDetails
  getBlogPostDetails(blogPostId) {
    const posts = this._getFromStorage('blog_posts');
    const post = posts.find((p) => p.id === blogPostId) || null;

    // Instrumentation for task completion tracking
    try {
      if (post) {
        localStorage.setItem(
          'task8_lastBlogPostViewed',
          JSON.stringify({ postId: blogPostId, viewedAt: this._nowIso() })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return post;
  }

  // 35. getAboutPageContent
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', {});
    return {
      bioHtml: stored.bioHtml || '',
      approachHtml: stored.approachHtml || '',
      exhibitionsHtml: stored.exhibitionsHtml || '',
      pressHtml: stored.pressHtml || ''
    };
  }

  // 36. getContactPageContent
  getContactPageContent() {
    const stored = this._getFromStorage('contact_page_content', {});
    return {
      contactEmail: stored.contactEmail || '',
      socialProfiles: Array.isArray(stored.socialProfiles) ? stored.socialProfiles : [],
      studioLocation: stored.studioLocation || ''
    };
  }

  // 37. submitContactMessage
  submitContactMessage(name, email, subject, message) {
    if (!name || !email || !message) {
      throw new Error('Missing required contact fields');
    }

    const messages = this._getFromStorage('contact_messages');
    messages.push({
      id: this._generateId('msg'),
      name,
      email,
      subject: subject || null,
      message,
      created_at: this._nowIso()
    });
    this._saveToStorage('contact_messages', messages);

    return { success: true };
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