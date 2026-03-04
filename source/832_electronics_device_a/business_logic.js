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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const keysToInitAsArray = [
      'brands',
      'categories',
      'products',
      'product_compatibilities',
      'wishlists',
      'wishlist_items',
      'comparison_lists',
      'comparison_items',
      'carts',
      'cart_items',
      'orders',
      'order_items',
      'shipping_addresses',
      'shipping_methods',
      'pages',
      'navigation_links',
      'contact_requests',
      'help_faqs'
    ];

    for (const key of keysToInitAsArray) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Optional structured objects (leave unset if not provided externally)
    // contact_info is intentionally not pre-populated with mock data

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
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

  _findById(storageKey, id) {
    if (!id) return null;
    const items = this._getFromStorage(storageKey);
    return items.find((x) => x.id === id) || null;
  }

  // ----- Helper: single-user containers -----

  _getOrCreateCart() {
    let carts = this._getFromStorage('carts');
    let cart = carts[0] || null;
    const now = new Date().toISOString();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _getOrCreateWishlist() {
    let wishlists = this._getFromStorage('wishlists');
    let wishlist = wishlists[0] || null;
    const now = new Date().toISOString();
    if (!wishlist) {
      wishlist = {
        id: this._generateId('wishlist'),
        created_at: now,
        updated_at: now
      };
      wishlists.push(wishlist);
      this._saveToStorage('wishlists', wishlists);
    }
    return wishlist;
  }

  _getOrCreateComparisonList() {
    let comparisonLists = this._getFromStorage('comparison_lists');
    let list = comparisonLists[0] || null;
    const now = new Date().toISOString();
    if (!list) {
      list = {
        id: this._generateId('comparison'),
        created_at: now,
        updated_at: now
      };
      comparisonLists.push(list);
      this._saveToStorage('comparison_lists', comparisonLists);
    }
    return list;
  }

  // ----- Helper: cart totals -----

  _calculateCartTotals(cart) {
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id === cart.id
    );
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');

    const items = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const brand = product
        ? brands.find((b) => b.id === product.brand_id) || null
        : null;
      const line_subtotal = ci.unit_price * ci.quantity;
      return {
        product_id: ci.product_id,
        name: product ? product.name : '',
        brand_name: brand ? brand.name : '',
        thumbnail_image: product ? product.thumbnail_image || null : null,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        line_subtotal,
        product
      };
    });

    const items_subtotal = items.reduce((sum, item) => sum + item.line_subtotal, 0);

    const estimated_tax = Number((items_subtotal * 0.1).toFixed(2));
    const estimated_shipping = this._getEstimatedShippingCost();
    const estimated_total = Number(
      (items_subtotal + estimated_tax + estimated_shipping).toFixed(2)
    );

    return {
      items,
      total_items: items.length,
      items_subtotal,
      estimated_tax,
      estimated_shipping,
      estimated_total
    };
  }

  _getEstimatedShippingCost() {
    const shippingMethods = this._getFromStorage('shipping_methods');
    if (!shippingMethods.length) return 0;
    let minPrice = Infinity;
    for (const sm of shippingMethods) {
      if (typeof sm.price === 'number' && sm.price < minPrice) {
        minPrice = sm.price;
      }
    }
    return Number((minPrice === Infinity ? 0 : minPrice).toFixed(2));
  }

  // ----- Helper: product context loading -----

  _loadProductsForContext(listing_context) {
    const ctx = listing_context || {};
    const contextType = ctx.context_type || null;

    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');

    let result = products;

    if (contextType === 'category' && ctx.categoryId) {
      const categoryId = ctx.categoryId;
      // Include products in this category and its descendants
      const categoryIds = new Set([categoryId]);
      let added = true;
      while (added) {
        added = false;
        for (const c of categories) {
          if (c.parent_category_id && categoryIds.has(c.parent_category_id) && !categoryIds.has(c.id)) {
            categoryIds.add(c.id);
            added = true;
          }
        }
      }
      result = result.filter((p) => categoryIds.has(p.category_id));
    } else if (contextType === 'brand' && ctx.brandId) {
      result = result.filter((p) => p.brand_id === ctx.brandId);
    } else if (contextType === 'search' && ctx.search_query) {
      const q = String(ctx.search_query || '').trim().toLowerCase();
      if (q) {
        result = result.filter((p) => {
          const name = (p.name || '').toLowerCase();
          const sd = (p.short_description || '').toLowerCase();
          const ld = (p.long_description || '').toLowerCase();
          return name.includes(q) || sd.includes(q) || ld.includes(q);
        });
      }
    } else if (contextType === 'deals') {
      result = result.filter((p) => p.is_in_deals === true);
      if (ctx.dealsCategoryId) {
        // deals_category_id may itself be hierarchical
        const baseId = ctx.dealsCategoryId;
        const categoryIds = new Set([baseId]);
        let added = true;
        while (added) {
          added = false;
          for (const c of categories) {
            if (c.parent_category_id && categoryIds.has(c.parent_category_id) && !categoryIds.has(c.id)) {
              categoryIds.add(c.id);
              added = true;
            }
          }
        }
        result = result.filter((p) => p.deals_category_id && categoryIds.has(p.deals_category_id));
      }
    }

    // If context explicitly indicates deals view, restrict to deals
    if (ctx.is_deals_view === true && contextType !== 'deals') {
      result = result.filter((p) => p.is_in_deals === true);
    }

    // Enrich with brand and category
    return result.map((p) => {
      const brand = brands.find((b) => b.id === p.brand_id) || null;
      const category = categories.find((c) => c.id === p.category_id) || null;
      return {
        ...p,
        brand_name: brand ? brand.name : undefined,
        brand,
        category_name: category ? category.name : undefined,
        category_key: category ? category.key : undefined,
        category
      };
    });
  }

  // ----- Helper: filter options -----

  _buildFilterOptionsForContext(products) {
    const priceValues = products
      .map((p) => (typeof p.price === 'number' ? p.price : null))
      .filter((v) => v != null);
    const screenValues = products
      .map((p) => (typeof p.screen_size_inches === 'number' ? p.screen_size_inches : null))
      .filter((v) => v != null);

    const price_range = {
      min_price: priceValues.length ? Math.min.apply(null, priceValues) : null,
      max_price: priceValues.length ? Math.max.apply(null, priceValues) : null
    };

    // Brand options
    const brandMap = new Map();
    for (const p of products) {
      if (!p.brand) continue;
      const id = p.brand.id;
      if (!brandMap.has(id)) {
        brandMap.set(id, {
          brand_id: id,
          brand_name: p.brand.name,
          product_count: 0,
          brand: p.brand
        });
      }
      const entry = brandMap.get(id);
      entry.product_count += 1;
    }
    const brand_options = Array.from(brandMap.values());

    // Basic rating options (static buckets)
    const rating_options = [
      { min_rating: 4.5, label: '4.5 & up' },
      { min_rating: 4.0, label: '4.0 & up' },
      { min_rating: 3.0, label: '3.0 & up' }
    ];

    const screen_size_options = screenValues.length
      ? [
          {
            min_inches: Math.min.apply(null, screenValues),
            max_inches: Math.max.apply(null, screenValues),
            label:
              Math.min.apply(null, screenValues) ===
              Math.max.apply(null, screenValues)
                ? `${Math.min.apply(null, screenValues)}"`
                : `${Math.min.apply(null, screenValues)}" - ${Math.max.apply(
                    null,
                    screenValues
                  )}"`
          }
        ]
      : [];

    function uniqueEnumOptions(list, valueKey, labelBuilder) {
      const set = new Set();
      const options = [];
      for (const p of products) {
        const val = p[valueKey];
        if (!val) continue;
        if (!set.has(val)) {
          set.add(val);
          options.push({ value: val, label: labelBuilder(val) });
        }
      }
      return options;
    }

    const resolutionLabel = (v) => {
      switch (v) {
        case 'hd':
          return 'HD';
        case 'full_hd':
          return 'Full HD';
        case 'quad_hd':
          return 'Quad HD';
        case 'uhd_4k':
          return '4K UHD';
        case 'uhd_8k':
          return '8K UHD';
        default:
          return 'Other';
      }
    };

    const resolution_options = uniqueEnumOptions(
      products,
      'resolution',
      resolutionLabel
    );

    // RAM options
    const ramSet = new Set();
    const ram_options = [];
    for (const p of products) {
      if (typeof p.ram_gb === 'number') {
        if (!ramSet.has(p.ram_gb)) {
          ramSet.add(p.ram_gb);
          ram_options.push({
            ram_gb: p.ram_gb,
            label: `${p.ram_gb} GB`
          });
        }
      }
    }

    // Storage options (range buckets by unique values)
    const storageSet = new Set();
    const storageValues = [];
    for (const p of products) {
      if (typeof p.storage_gb === 'number') {
        storageSet.add(p.storage_gb);
        storageValues.push(p.storage_gb);
      }
    }
    const storage_options = [];
    if (storageValues.length) {
      const min = Math.min.apply(null, storageValues);
      const max = Math.max.apply(null, storageValues);
      storage_options.push({
        min_storage_gb: min,
        max_storage_gb: max,
        label: min === max ? `${min} GB` : `${min} GB - ${max} GB`
      });
    }

    const osLabel = (v) => {
      switch (v) {
        case 'android':
          return 'Android';
        case 'ios':
          return 'iOS';
        case 'windows':
          return 'Windows';
        case 'macos':
          return 'macOS';
        case 'chrome_os':
          return 'Chrome OS';
        case 'linux':
          return 'Linux';
        case 'firmware':
          return 'Firmware';
        default:
          return 'Other OS';
      }
    };

    const operating_system_options = uniqueEnumOptions(
      products,
      'operating_system',
      osLabel
    );

    const networkLabel = (v) => {
      switch (v) {
        case 'wifi_only':
          return 'Wi-Fi only';
        case 'three_g':
          return '3G';
        case 'four_g_lte':
          return '4G LTE';
        case 'five_g':
          return '5G';
        case 'ethernet_only':
          return 'Ethernet only';
        case 'no_network':
          return 'No network';
        default:
          return 'Other';
      }
    };

    const network_technology_options = uniqueEnumOptions(
      products,
      'network_technology',
      networkLabel
    );

    const wifiLabel = (v) => {
      switch (v) {
        case 'wifi_4':
          return 'Wi-Fi 4';
        case 'wifi_5':
          return 'Wi-Fi 5';
        case 'wifi_6':
          return 'Wi-Fi 6';
        case 'wifi_6e':
          return 'Wi-Fi 6E';
        case 'wifi_7':
          return 'Wi-Fi 7';
        default:
          return 'Other Wi-Fi';
      }
    };

    const wifi_standard_options = uniqueEnumOptions(
      products,
      'wifi_standard',
      wifiLabel
    );

    const btLabel = (v) => v.replace('bluetooth_', 'Bluetooth ').replace('_', '.');

    const bluetooth_version_options = uniqueEnumOptions(
      products,
      'bluetooth_version',
      btLabel
    );

    const speakerTypeLabel = (v) => {
      switch (v) {
        case 'portable_bluetooth':
          return 'Portable Bluetooth';
        case 'soundbar':
          return 'Soundbar';
        case 'smart_speaker':
          return 'Smart speaker';
        case 'bookshelf':
          return 'Bookshelf';
        case 'floor_standing':
          return 'Floor-standing';
        case 'portable_wired':
          return 'Portable wired';
        default:
          return 'Other speaker';
      }
    };

    const speaker_type_options = uniqueEnumOptions(
      products,
      'speaker_type',
      speakerTypeLabel
    );

    const feature_flags = {
      supports_waterproof_filter: products.some((p) => typeof p.is_waterproof === 'boolean'),
      supports_gps_filter: products.some((p) => typeof p.has_gps === 'boolean'),
      supports_heart_rate_filter: products.some(
        (p) => typeof p.has_heart_rate_monitor === 'boolean'
      ),
      supports_free_shipping_filter: products.some(
        (p) => typeof p.free_shipping_eligible === 'boolean'
      ),
      supports_release_year_filter: products.some((p) => typeof p.release_year === 'number')
    };

    const releaseYearsSet = new Set();
    for (const p of products) {
      if (typeof p.release_year === 'number') {
        releaseYearsSet.add(p.release_year);
      }
    }
    const release_year_options = Array.from(releaseYearsSet)
      .sort()
      .map((year) => ({ year, label: String(year) }));

    // Shipping options: from shipping_methods table
    const shippingMethods = this._getFromStorage('shipping_methods');
    const shippingSeen = new Set();
    const shipping_options = [];
    for (const sm of shippingMethods) {
      if (!sm.code || shippingSeen.has(sm.code)) continue;
      shippingSeen.add(sm.code);
      shipping_options.push({ code: sm.code, label: sm.name || sm.code });
    }

    // Deal category options: categories that have products marked is_in_deals
    const dealProducts = products.filter((p) => p.is_in_deals && p.deals_category_id);
    const categoriesAll = this._getFromStorage('categories');
    const dealCatMap = new Map();
    for (const p of dealProducts) {
      const c = categoriesAll.find((cat) => cat.id === p.deals_category_id);
      if (!c) continue;
      if (!dealCatMap.has(c.id)) {
        dealCatMap.set(c.id, {
          category_id: c.id,
          category_name: c.name,
          category_key: c.key,
          category: c
        });
      }
    }
    const deal_category_options = Array.from(dealCatMap.values());

    return {
      price_range,
      brand_options,
      rating_options,
      screen_size_options,
      resolution_options,
      ram_options,
      storage_options,
      operating_system_options,
      network_technology_options,
      wifi_standard_options,
      bluetooth_version_options,
      speaker_type_options,
      feature_flags,
      release_year_options,
      shipping_options,
      deal_category_options
    };
  }

  // ----- Helper: comparison spec rows -----

  _buildComparisonSpecRows(products) {
    const specs = [
      {
        spec_key: 'price',
        spec_label: 'Price',
        getter: (p) =>
          typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : ''
      },
      {
        spec_key: 'screen_size_inches',
        spec_label: 'Screen size',
        getter: (p) =>
          typeof p.screen_size_inches === 'number'
            ? `${p.screen_size_inches}"`
            : ''
      },
      {
        spec_key: 'resolution',
        spec_label: 'Resolution',
        getter: (p) => p.resolution || ''
      },
      {
        spec_key: 'ram_gb',
        spec_label: 'RAM',
        getter: (p) => (typeof p.ram_gb === 'number' ? `${p.ram_gb} GB` : '')
      },
      {
        spec_key: 'storage_gb',
        spec_label: 'Storage',
        getter: (p) =>
          typeof p.storage_gb === 'number' ? `${p.storage_gb} GB` : ''
      },
      {
        spec_key: 'storage_type',
        spec_label: 'Storage type',
        getter: (p) => p.storage_type || ''
      },
      {
        spec_key: 'operating_system',
        spec_label: 'Operating system',
        getter: (p) => p.operating_system || ''
      },
      {
        spec_key: 'network_technology',
        spec_label: 'Network',
        getter: (p) => p.network_technology || ''
      },
      {
        spec_key: 'wifi_standard',
        spec_label: 'Wi-Fi standard',
        getter: (p) => p.wifi_standard || ''
      },
      {
        spec_key: 'bluetooth_version',
        spec_label: 'Bluetooth version',
        getter: (p) => p.bluetooth_version || ''
      },
      {
        spec_key: 'is_wireless',
        spec_label: 'Wireless',
        getter: (p) =>
          typeof p.is_wireless === 'boolean' ? (p.is_wireless ? 'Yes' : 'No') : ''
      },
      {
        spec_key: 'speaker_type',
        spec_label: 'Speaker type',
        getter: (p) => p.speaker_type || ''
      },
      {
        spec_key: 'is_waterproof',
        spec_label: 'Waterproof',
        getter: (p) =>
          typeof p.is_waterproof === 'boolean' ? (p.is_waterproof ? 'Yes' : 'No') : ''
      },
      {
        spec_key: 'has_gps',
        spec_label: 'GPS',
        getter: (p) =>
          typeof p.has_gps === 'boolean' ? (p.has_gps ? 'Yes' : 'No') : ''
      },
      {
        spec_key: 'has_heart_rate_monitor',
        spec_label: 'Heart rate monitor',
        getter: (p) =>
          typeof p.has_heart_rate_monitor === 'boolean'
            ? p.has_heart_rate_monitor
              ? 'Yes'
              : 'No'
            : ''
      },
      {
        spec_key: 'battery_life_days',
        spec_label: 'Battery life (days)',
        getter: (p) =>
          typeof p.battery_life_days === 'number'
            ? String(p.battery_life_days)
            : ''
      },
      {
        spec_key: 'release_year',
        spec_label: 'Release year',
        getter: (p) =>
          typeof p.release_year === 'number' ? String(p.release_year) : ''
      }
    ];

    const spec_rows = [];

    for (const spec of specs) {
      const values = products.map((p) => ({
        product_id: p.id,
        display_value: spec.getter(p),
        is_highlighted_difference: false,
        product: p
      }));

      const distinct = Array.from(
        new Set(values.map((v) => v.display_value || ''))
      );
      const hasDifference = distinct.length > 1;

      if (hasDifference) {
        for (const v of values) {
          v.is_highlighted_difference = true;
        }
      }

      const hasAnyValue = values.some((v) => v.display_value !== '');
      if (hasAnyValue) {
        spec_rows.push({
          spec_key: spec.spec_key,
          spec_label: spec.spec_label,
          values
        });
      }
    }

    return spec_rows;
  }

  // ---------------------------------------------------------------------------
  // Core interface implementations
  // ---------------------------------------------------------------------------

  // 1) getHomeOverview
  getHomeOverview() {
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');

    // Featured categories: categories that have products
    const categoryCounts = new Map();
    for (const p of products) {
      if (!p.category_id) continue;
      categoryCounts.set(p.category_id, (categoryCounts.get(p.category_id) || 0) + 1);
    }
    const featured_categories = [];
    for (const [catId, count] of categoryCounts.entries()) {
      const c = categories.find((cat) => cat.id === catId);
      if (!c) continue;
      featured_categories.push({
        category_id: c.id,
        category_name: c.name,
        category_key: c.key,
        description: c.description || '',
        category: c,
        product_count: count
      });
    }
    featured_categories.sort((a, b) => b.product_count - a.product_count);

    // Featured deals: products with is_in_deals true
    const dealProducts = products.filter((p) => p.is_in_deals === true);
    dealProducts.sort((a, b) => {
      const discA =
        typeof a.list_price === 'number' && typeof a.price === 'number'
          ? a.list_price - a.price
          : 0;
      const discB =
        typeof b.list_price === 'number' && typeof b.price === 'number'
          ? b.list_price - b.price
          : 0;
      if (discB !== discA) return discB - discA;
      const popA = a.popularity_score || 0;
      const popB = b.popularity_score || 0;
      return popB - popA;
    });

    const featured_deals = dealProducts.map((p) => {
      const brand = brands.find((b) => b.id === p.brand_id) || null;
      const category = categories.find((c) => c.id === p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        short_description: p.short_description || '',
        price: p.price,
        list_price: p.list_price,
        currency: p.currency,
        average_rating: p.average_rating,
        rating_count: p.rating_count,
        thumbnail_image: p.thumbnail_image || null,
        brand_name: brand ? brand.name : '',
        category_name: category ? category.name : '',
        is_in_deals: p.is_in_deals === true,
        product: {
          ...p,
          brand,
          category
        }
      };
    });

    // Popular products: sort by popularity_score desc
    const popularProductsSorted = [...products].sort((a, b) => {
      const pa = a.popularity_score || 0;
      const pb = b.popularity_score || 0;
      return pb - pa;
    });

    const popular_products = popularProductsSorted.map((p) => {
      const brand = brands.find((b) => b.id === p.brand_id) || null;
      const category = categories.find((c) => c.id === p.category_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        short_description: p.short_description || '',
        price: p.price,
        currency: p.currency,
        average_rating: p.average_rating,
        rating_count: p.rating_count,
        thumbnail_image: p.thumbnail_image || null,
        brand_name: brand ? brand.name : '',
        category_name: category ? category.name : '',
        product: {
          ...p,
          brand,
          category
        }
      };
    });

    // Top brands: brands with most products
    const brandCounts = new Map();
    for (const p of products) {
      if (!p.brand_id) continue;
      brandCounts.set(p.brand_id, (brandCounts.get(p.brand_id) || 0) + 1);
    }
    const brandsWithCount = brands.map((b) => ({
      ...b,
      product_count: brandCounts.get(b.id) || 0
    }));
    brandsWithCount.sort((a, b) => b.product_count - a.product_count);
    const top_brands = brandsWithCount;

    return {
      featured_categories,
      featured_deals,
      popular_products,
      top_brands
    };
  }

  // 2) getHeaderQuickStats
  getHeaderQuickStats() {
    const wishlist = this._getOrCreateWishlist();
    const comparisonList = this._getOrCreateComparisonList();
    const cart = this._getOrCreateCart();

    const wishlistItems = this._getFromStorage('wishlist_items').filter(
      (w) => w.wishlist_id === wishlist.id
    );
    const comparisonItems = this._getFromStorage('comparison_items').filter(
      (c) => c.comparison_list_id === comparisonList.id
    );
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id === cart.id
    );

    return {
      wishlist_count: wishlistItems.length,
      comparison_count: comparisonItems.length,
      cart_item_count: cartItems.length
    };
  }

  // 3) getProductFilterOptions(listing_context)
  getProductFilterOptions(listing_context) {
    const products = this._loadProductsForContext(listing_context);
    return this._buildFilterOptionsForContext(products);
  }

  // 4) getProductResults(listing_context, filters, sort_by, page_number, page_size)
  getProductResults(listing_context, filters, sort_by = 'relevance', page_number = 1, page_size = 20) {
    const allProductsCtx = this._loadProductsForContext(listing_context);
    const f = filters || {};

    let filtered = allProductsCtx;

    // Price
    if (typeof f.min_price === 'number') {
      filtered = filtered.filter((p) => typeof p.price === 'number' && p.price >= f.min_price);
    }
    if (typeof f.max_price === 'number') {
      filtered = filtered.filter((p) => typeof p.price === 'number' && p.price <= f.max_price);
    }

    // Brands
    if (Array.isArray(f.brand_ids) && f.brand_ids.length) {
      const set = new Set(f.brand_ids);
      filtered = filtered.filter((p) => p.brand_id && set.has(p.brand_id));
    }

    // Rating
    if (typeof f.min_rating === 'number') {
      filtered = filtered.filter(
        (p) => typeof p.average_rating === 'number' && p.average_rating >= f.min_rating
      );
    }

    // Screen size
    if (typeof f.min_screen_size_inches === 'number') {
      filtered = filtered.filter(
        (p) =>
          typeof p.screen_size_inches === 'number' &&
          p.screen_size_inches >= f.min_screen_size_inches
      );
    }
    if (typeof f.max_screen_size_inches === 'number') {
      filtered = filtered.filter(
        (p) =>
          typeof p.screen_size_inches === 'number' &&
          p.screen_size_inches <= f.max_screen_size_inches
      );
    }

    // Resolution
    if (f.resolution) {
      filtered = filtered.filter((p) => p.resolution === f.resolution);
    }

    // RAM
    if (typeof f.ram_gb === 'number') {
      filtered = filtered.filter((p) => p.ram_gb === f.ram_gb);
    }

    // Storage
    if (typeof f.min_storage_gb === 'number') {
      filtered = filtered.filter(
        (p) => typeof p.storage_gb === 'number' && p.storage_gb >= f.min_storage_gb
      );
    }
    if (typeof f.max_storage_gb === 'number') {
      filtered = filtered.filter(
        (p) => typeof p.storage_gb === 'number' && p.storage_gb <= f.max_storage_gb
      );
    }

    // OS
    if (Array.isArray(f.operating_systems) && f.operating_systems.length) {
      const set = new Set(f.operating_systems);
      filtered = filtered.filter((p) => p.operating_system && set.has(p.operating_system));
    }

    // Network technologies
    if (Array.isArray(f.network_technologies) && f.network_technologies.length) {
      const set = new Set(f.network_technologies);
      filtered = filtered.filter(
        (p) => p.network_technology && set.has(p.network_technology)
      );
    }

    // WiFi standards
    if (Array.isArray(f.wifi_standards) && f.wifi_standards.length) {
      const set = new Set(f.wifi_standards);
      filtered = filtered.filter((p) => p.wifi_standard && set.has(p.wifi_standard));
    }

    // Bluetooth versions
    if (Array.isArray(f.bluetooth_versions) && f.bluetooth_versions.length) {
      const set = new Set(f.bluetooth_versions);
      filtered = filtered.filter(
        (p) => p.bluetooth_version && set.has(p.bluetooth_version)
      );
    }

    // Wireless
    if (typeof f.is_wireless === 'boolean') {
      filtered = filtered.filter((p) => p.is_wireless === f.is_wireless);
    }

    // Speaker types
    if (Array.isArray(f.speaker_types) && f.speaker_types.length) {
      const set = new Set(f.speaker_types);
      filtered = filtered.filter((p) => p.speaker_type && set.has(p.speaker_type));
    }

    // Waterproof
    if (typeof f.is_waterproof === 'boolean') {
      filtered = filtered.filter((p) => p.is_waterproof === f.is_waterproof);
    }

    // GPS / Heart-rate
    if (typeof f.has_gps === 'boolean') {
      filtered = filtered.filter((p) => p.has_gps === f.has_gps);
    }
    if (typeof f.has_heart_rate_monitor === 'boolean') {
      filtered = filtered.filter(
        (p) => p.has_heart_rate_monitor === f.has_heart_rate_monitor
      );
    }

    // Battery life
    if (typeof f.min_battery_life_days === 'number') {
      filtered = filtered.filter(
        (p) =>
          typeof p.battery_life_days === 'number' &&
          p.battery_life_days >= f.min_battery_life_days
      );
    }

    // Release year range
    if (typeof f.min_release_year === 'number') {
      filtered = filtered.filter(
        (p) => typeof p.release_year === 'number' && p.release_year >= f.min_release_year
      );
    }
    if (typeof f.max_release_year === 'number') {
      filtered = filtered.filter(
        (p) => typeof p.release_year === 'number' && p.release_year <= f.max_release_year
      );
    }

    // Free shipping
    if (f.free_shipping_only === true) {
      filtered = filtered.filter((p) => p.free_shipping_eligible === true);
    }

    // Sorting
    const sortKey = sort_by || 'relevance';
    if (sortKey === 'price_low_to_high') {
      filtered.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Infinity;
        const pb = typeof b.price === 'number' ? b.price : Infinity;
        return pa - pb;
      });
    } else if (sortKey === 'price_high_to_low') {
      filtered.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : -Infinity;
        const pb = typeof b.price === 'number' ? b.price : -Infinity;
        return pb - pa;
      });
    } else if (sortKey === 'customer_rating_high_to_low') {
      filtered.sort((a, b) => {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        if (cb !== ca) return cb - ca;
        const pa = typeof a.price === 'number' ? a.price : Infinity;
        const pb = typeof b.price === 'number' ? b.price : Infinity;
        return pa - pb;
      });
    } else if (sortKey === 'popularity') {
      filtered.sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return pb - pa;
      });
    } // relevance: keep existing order

    const total_results = filtered.length;
    const total_pages = Math.max(1, Math.ceil(total_results / page_size));
    const currentPage = Math.min(Math.max(1, page_number), total_pages);
    const start = (currentPage - 1) * page_size;
    const pageProducts = filtered.slice(start, start + page_size);

    const productsResult = pageProducts.map((p) => ({
      product_id: p.id,
      name: p.name,
      short_description: p.short_description || '',
      price: p.price,
      list_price: p.list_price,
      currency: p.currency,
      average_rating: p.average_rating,
      rating_count: p.rating_count,
      free_shipping_eligible: p.free_shipping_eligible,
      popularity_score: p.popularity_score,
      is_in_deals: p.is_in_deals,
      thumbnail_image: p.thumbnail_image || null,
      brand_id: p.brand_id,
      brand_name: p.brand_name,
      category_id: p.category_id,
      category_name: p.category_name,
      category_key: p.category_key,
      screen_size_inches: p.screen_size_inches,
      resolution: p.resolution,
      ram_gb: p.ram_gb,
      storage_gb: p.storage_gb,
      storage_type: p.storage_type,
      operating_system: p.operating_system,
      network_technology: p.network_technology,
      wifi_standard: p.wifi_standard,
      bluetooth_version: p.bluetooth_version,
      is_wireless: p.is_wireless,
      speaker_type: p.speaker_type,
      is_waterproof: p.is_waterproof,
      has_gps: p.has_gps,
      has_heart_rate_monitor: p.has_heart_rate_monitor,
      battery_life_days: p.battery_life_days,
      release_year: p.release_year,
      brand: p.brand || null,
      category: p.category || null,
      product: p
    }));

    return {
      products: productsResult,
      total_results,
      page_number: currentPage,
      page_size,
      total_pages,
      applied_sort_by: sortKey
    };
  }

  // 5) getProductDetails(productId)
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const categories = this._getFromStorage('categories');

    const p = products.find((x) => x.id === productId) || null;
    if (!p) {
      return {
        product: null,
        can_add_to_cart: false,
        can_add_to_wishlist: false,
        can_add_to_comparison: false,
        related_products: []
      };
    }

    const brand = brands.find((b) => b.id === p.brand_id) || null;
    const category = categories.find((c) => c.id === p.category_id) || null;

    const product = {
      product_id: p.id,
      name: p.name,
      short_description: p.short_description || '',
      long_description: p.long_description || '',
      brand_id: p.brand_id,
      brand_name: brand ? brand.name : '',
      category_id: p.category_id,
      category_name: category ? category.name : '',
      category_key: category ? category.key : undefined,
      product_type: p.product_type,
      price: p.price,
      list_price: p.list_price,
      currency: p.currency,
      average_rating: p.average_rating,
      rating_count: p.rating_count,
      free_shipping_eligible: p.free_shipping_eligible,
      screen_size_inches: p.screen_size_inches,
      resolution: p.resolution,
      ram_gb: p.ram_gb,
      storage_gb: p.storage_gb,
      storage_type: p.storage_type,
      operating_system: p.operating_system,
      network_technology: p.network_technology,
      wifi_standard: p.wifi_standard,
      bluetooth_version: p.bluetooth_version,
      is_wireless: p.is_wireless,
      speaker_type: p.speaker_type,
      is_waterproof: p.is_waterproof,
      has_gps: p.has_gps,
      has_heart_rate_monitor: p.has_heart_rate_monitor,
      battery_life_days: p.battery_life_days,
      release_year: p.release_year,
      images: p.images || [],
      thumbnail_image: p.thumbnail_image || null,
      brand,
      category
    };

    // Related products: same category, different id
    const related_products = products
      .filter((x) => x.id !== p.id && x.category_id === p.category_id)
      .slice(0, 8)
      .map((rp) => {
        const rb = brands.find((b) => b.id === rp.brand_id) || null;
        return {
          product_id: rp.id,
          name: rp.name,
          price: rp.price,
          currency: rp.currency,
          average_rating: rp.average_rating,
          thumbnail_image: rp.thumbnail_image || null,
          brand_name: rb ? rb.name : '',
          product: {
            ...rp,
            brand: rb,
            category
          }
        };
      });

    return {
      product,
      can_add_to_cart: true,
      can_add_to_wishlist: true,
      can_add_to_comparison: true,
      related_products
    };
  }

  // 6) getCompatibleAccessories(baseProductId, accessory_type, max_price, sort_by)
  getCompatibleAccessories(baseProductId, accessory_type, max_price, sort_by = 'relevance') {
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');
    const compat = this._getFromStorage('product_compatibilities');

    const baseProduct = products.find((p) => p.id === baseProductId) || null;

    let compatFiltered = compat.filter((c) => c.base_product_id === baseProductId);

    if (accessory_type) {
      // Map simple accessory_type to compatibility_type where necessary
      let compatType = null;
      if (accessory_type === 'case') compatType = 'accessory_case';
      else if (accessory_type === 'screen_protector') compatType = 'accessory_screen_protector';
      else compatType = 'other_accessory';
      compatFiltered = compatFiltered.filter(
        (c) => c.compatibility_type === compatType
      );
    }

    let accessories = compatFiltered
      .map((c) => products.find((p) => p.id === c.accessory_product_id) || null)
      .filter((p) => p !== null);

    if (typeof max_price === 'number') {
      accessories = accessories.filter(
        (p) => typeof p.price === 'number' && p.price <= max_price
      );
    }

    if (sort_by === 'price_low_to_high') {
      accessories.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Infinity;
        const pb = typeof b.price === 'number' ? b.price : Infinity;
        return pa - pb;
      });
    } else if (sort_by === 'customer_rating_high_to_low') {
      accessories.sort((a, b) => {
        const ra = typeof a.average_rating === 'number' ? a.average_rating : 0;
        const rb = typeof b.average_rating === 'number' ? b.average_rating : 0;
        if (rb !== ra) return rb - ra;
        const ca = typeof a.rating_count === 'number' ? a.rating_count : 0;
        const cb = typeof b.rating_count === 'number' ? b.rating_count : 0;
        return cb - ca;
      });
    } else if (sort_by === 'popularity') {
      accessories.sort((a, b) => {
        const pa = typeof a.popularity_score === 'number' ? a.popularity_score : 0;
        const pb = typeof b.popularity_score === 'number' ? b.popularity_score : 0;
        return pb - pa;
      });
    }

    const resultAccessories = accessories.map((p) => {
      const brand = brands.find((b) => b.id === p.brand_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        short_description: p.short_description || '',
        price: p.price,
        currency: p.currency,
        average_rating: p.average_rating,
        rating_count: p.rating_count,
        thumbnail_image: p.thumbnail_image || null,
        accessory_type: p.accessory_type,
        brand_name: brand ? brand.name : '',
        product: {
          ...p,
          brand
        }
      };
    });

    return {
      base_product_name: baseProduct ? baseProduct.name : '',
      accessories: resultAccessories
    };
  }

  // 7) addProductToComparison(productId)
  addProductToComparison(productId) {
    const list = this._getOrCreateComparisonList();
    const comparisonItems = this._getFromStorage('comparison_items');
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        comparison_summary: { total_items: 0, products: [] }
      };
    }

    const exists = comparisonItems.some(
      (ci) => ci.comparison_list_id === list.id && ci.product_id === productId
    );
    if (!exists) {
      const now = new Date().toISOString();
      comparisonItems.push({
        id: this._generateId('comparison_item'),
        comparison_list_id: list.id,
        product_id: productId,
        added_at: now
      });
      this._saveToStorage('comparison_items', comparisonItems);

      const comparisonLists = this._getFromStorage('comparison_lists');
      const idx = comparisonLists.findIndex((c) => c.id === list.id);
      if (idx >= 0) {
        comparisonLists[idx].updated_at = now;
        this._saveToStorage('comparison_lists', comparisonLists);
      }
    }

    // Build summary
    const itemsCurrent = comparisonItems.filter((ci) => ci.comparison_list_id === list.id);
    const summaryProducts = itemsCurrent.map((ci) => {
      const p = products.find((prod) => prod.id === ci.product_id) || null;
      const brand = p ? brands.find((b) => b.id === p.brand_id) || null : null;
      return {
        product_id: ci.product_id,
        name: p ? p.name : '',
        brand_name: brand ? brand.name : '',
        product_type: p ? p.product_type : '',
        thumbnail_image: p ? p.thumbnail_image || null : null,
        price: p ? p.price : null,
        currency: p ? p.currency : null,
        product: p
      };
    });

    return {
      success: true,
      message: 'Product added to comparison',
      comparison_summary: {
        total_items: summaryProducts.length,
        products: summaryProducts
      }
    };
  }

  // 8) getComparisonView()
  getComparisonView() {
    const list = this._getOrCreateComparisonList();
    const comparisonItems = this._getFromStorage('comparison_items').filter(
      (ci) => ci.comparison_list_id === list.id
    );
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');

    const comparisonProducts = comparisonItems
      .map((ci) => products.find((p) => p.id === ci.product_id) || null)
      .filter((p) => p !== null);

    const productViews = comparisonProducts.map((p) => {
      const brand = brands.find((b) => b.id === p.brand_id) || null;
      return {
        product_id: p.id,
        name: p.name,
        brand_name: brand ? brand.name : '',
        product_type: p.product_type,
        price: p.price,
        currency: p.currency,
        average_rating: p.average_rating,
        thumbnail_image: p.thumbnail_image || null,
        product: {
          ...p,
          brand
        }
      };
    });

    const spec_rows = this._buildComparisonSpecRows(comparisonProducts);

    return {
      products: productViews,
      spec_rows
    };
  }

  // 9) removeProductFromComparison(productId)
  removeProductFromComparison(productId) {
    const list = this._getOrCreateComparisonList();
    let comparisonItems = this._getFromStorage('comparison_items');
    const beforeLen = comparisonItems.length;

    comparisonItems = comparisonItems.filter(
      (ci) => !(ci.comparison_list_id === list.id && ci.product_id === productId)
    );

    const afterLen = comparisonItems.length;
    this._saveToStorage('comparison_items', comparisonItems);

    return {
      success: afterLen < beforeLen,
      message: afterLen < beforeLen ? 'Removed from comparison' : 'Item not found',
      comparison_summary: {
        total_items: comparisonItems.filter((ci) => ci.comparison_list_id === list.id)
          .length
      }
    };
  }

  // 10) clearComparison()
  clearComparison() {
    const list = this._getOrCreateComparisonList();
    let comparisonItems = this._getFromStorage('comparison_items');
    const beforeLen = comparisonItems.length;

    comparisonItems = comparisonItems.filter((ci) => ci.comparison_list_id !== list.id);
    this._saveToStorage('comparison_items', comparisonItems);

    return {
      success: beforeLen !== comparisonItems.length,
      message: 'Comparison list cleared',
      comparison_summary: {
        total_items: 0
      }
    };
  }

  // 11) addProductToWishlist(productId)
  addProductToWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        wishlist_summary: { total_items: 0 }
      };
    }

    let wishlistItems = this._getFromStorage('wishlist_items');
    const exists = wishlistItems.some(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId
    );
    if (!exists) {
      const now = new Date().toISOString();
      wishlistItems.push({
        id: this._generateId('wishlist_item'),
        wishlist_id: wishlist.id,
        product_id: productId,
        added_at: now
      });
      this._saveToStorage('wishlist_items', wishlistItems);

      const wishlists = this._getFromStorage('wishlists');
      const idx = wishlists.findIndex((w) => w.id === wishlist.id);
      if (idx >= 0) {
        wishlists[idx].updated_at = now;
        this._saveToStorage('wishlists', wishlists);
      }
    }

    const total = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id).length;
    return {
      success: true,
      message: exists ? 'Product already in wishlist' : 'Product added to wishlist',
      wishlist_summary: { total_items: total }
    };
  }

  // 12) getWishlist()
  getWishlist() {
    const wishlist = this._getOrCreateWishlist();
    const wishlistItems = this._getFromStorage('wishlist_items').filter(
      (wi) => wi.wishlist_id === wishlist.id
    );
    const products = this._getFromStorage('products');
    const brands = this._getFromStorage('brands');

    const items = wishlistItems.map((wi) => {
      const p = products.find((prod) => prod.id === wi.product_id) || null;
      const brand = p ? brands.find((b) => b.id === p.brand_id) || null : null;
      return {
        product_id: wi.product_id,
        name: p ? p.name : '',
        brand_name: brand ? brand.name : '',
        price: p ? p.price : null,
        currency: p ? p.currency : null,
        average_rating: p ? p.average_rating : null,
        thumbnail_image: p ? p.thumbnail_image || null : null,
        added_at: wi.added_at,
        product: p
      };
    });

    return {
      items,
      total_items: items.length
    };
  }

  // 13) removeProductFromWishlist(productId)
  removeProductFromWishlist(productId) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');
    const beforeLen = wishlistItems.length;

    wishlistItems = wishlistItems.filter(
      (wi) => !(wi.wishlist_id === wishlist.id && wi.product_id === productId)
    );

    this._saveToStorage('wishlist_items', wishlistItems);
    const total = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id).length;

    return {
      success: wishlistItems.length < beforeLen,
      message:
        wishlistItems.length < beforeLen
          ? 'Removed from wishlist'
          : 'Item not found in wishlist',
      wishlist_summary: {
        total_items: total
      }
    };
  }

  // 14) moveWishlistItemToCart(productId, quantity = 1)
  moveWishlistItemToCart(productId, quantity = 1) {
    const wishlist = this._getOrCreateWishlist();
    let wishlistItems = this._getFromStorage('wishlist_items');
    const exists = wishlistItems.some(
      (wi) => wi.wishlist_id === wishlist.id && wi.product_id === productId
    );

    if (!exists) {
      return {
        success: false,
        message: 'Item not found in wishlist',
        wishlist_summary: { total_items: wishlistItems.length },
        cart_summary: {
          total_items: this._getFromStorage('cart_items').length,
          items_subtotal: 0,
          estimated_total: 0
        }
      };
    }

    // Remove from wishlist
    wishlistItems = wishlistItems.filter(
      (wi) => !(wi.wishlist_id === wishlist.id && wi.product_id === productId)
    );
    this._saveToStorage('wishlist_items', wishlistItems);

    // Add to cart
    this.addToCart(productId, quantity);

    const wishlistTotal = wishlistItems.filter((wi) => wi.wishlist_id === wishlist.id)
      .length;

    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart);

    return {
      success: true,
      message: 'Moved from wishlist to cart',
      wishlist_summary: { total_items: wishlistTotal },
      cart_summary: {
        total_items: totals.total_items,
        items_subtotal: totals.items_subtotal,
        estimated_total: totals.estimated_total
      }
    };
  }

  // 15) addToCart(productId, quantity = 1)
  addToCart(productId, quantity = 1) {
    const cart = this._getOrCreateCart();
    const products = this._getFromStorage('products');
    let cartItems = this._getFromStorage('cart_items');

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        cart: {
          items: [],
          total_items: 0,
          items_subtotal: 0,
          estimated_tax: 0,
          estimated_shipping: 0,
          estimated_total: 0
        }
      };
    }

    const existing = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId
    );

    const now = new Date().toISOString();
    if (existing) {
      existing.quantity += quantity;
      if (existing.quantity < 1) existing.quantity = 1;
    } else {
      cartItems.push({
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: productId,
        quantity: quantity > 0 ? quantity : 1,
        unit_price: product.price,
        added_at: now
      });
    }
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx].updated_at = now;
      this._saveToStorage('carts', carts);
    }

    const totals = this._calculateCartTotals(cart);

    return {
      success: true,
      message: 'Product added to cart',
      cart: totals
    };
  }

  // 16) getCart()
  getCart() {
    const cart = this._getOrCreateCart();
    const totals = this._calculateCartTotals(cart);
    return totals;
  }

  // 17) updateCartItemQuantity(productId, quantity)
  updateCartItemQuantity(productId, quantity) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const item = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId
    );

    if (!item) {
      const totals = this._calculateCartTotals(cart);
      return {
        success: false,
        message: 'Cart item not found',
        cart: totals
      };
    }

    if (quantity <= 0) {
      cartItems = cartItems.filter((ci) => ci !== item);
    } else {
      item.quantity = quantity;
    }

    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx].updated_at = new Date().toISOString();
      this._saveToStorage('carts', carts);
    }

    const totals = this._calculateCartTotals(cart);
    return {
      success: true,
      message: 'Cart updated',
      cart: totals
    };
  }

  // 18) removeFromCart(productId)
  removeFromCart(productId) {
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');
    const beforeLen = cartItems.length;

    cartItems = cartItems.filter(
      (ci) => !(ci.cart_id === cart.id && ci.product_id === productId)
    );
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex((c) => c.id === cart.id);
    if (idx >= 0) {
      carts[idx].updated_at = new Date().toISOString();
      this._saveToStorage('carts', carts);
    }

    const totals = this._calculateCartTotals(cart);

    return {
      success: cartItems.length < beforeLen,
      message:
        cartItems.length < beforeLen ? 'Item removed from cart' : 'Item not found in cart',
      cart: totals
    };
  }

  // 19) getCheckoutSummary()
  getCheckoutSummary() {
    const cart = this._getOrCreateCart();
    const cartTotals = this._calculateCartTotals(cart);
    const shipping_methods = this._getFromStorage('shipping_methods');
    return {
      cart: cartTotals,
      shipping_methods
    };
  }

  // 20) placeOrder(shipping_address, shippingMethodId)
  placeOrder(shipping_address, shippingMethodId) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id === cart.id
    );

    if (!cartItems.length) {
      return {
        success: false,
        message: 'Cart is empty',
        order: null
      };
    }

    const shippingMethods = this._getFromStorage('shipping_methods');
    const shippingMethod = shippingMethods.find((sm) => sm.id === shippingMethodId) || null;
    if (!shippingMethod) {
      return {
        success: false,
        message: 'Invalid shipping method',
        order: null
      };
    }

    // Create ShippingAddress
    const shippingAddresses = this._getFromStorage('shipping_addresses');
    const addressId = this._generateId('shipaddr');
    const now = new Date().toISOString();
    const addr = {
      id: addressId,
      full_name: shipping_address.full_name,
      line1: shipping_address.line1,
      line2: shipping_address.line2 || '',
      city: shipping_address.city,
      state: shipping_address.state || '',
      postal_code: shipping_address.postal_code,
      country: shipping_address.country,
      phone: shipping_address.phone || ''
    };
    shippingAddresses.push(addr);
    this._saveToStorage('shipping_addresses', shippingAddresses);

    // Totals
    const totals = this._calculateCartTotals(cart);
    const total_amount = totals.estimated_total;

    // Create Order
    const orders = this._getFromStorage('orders');
    const orderId = this._generateId('order');
    const orderNumber = 'ORD-' + orderId;
    const order = {
      id: orderId,
      order_number: orderNumber,
      status: 'pending_payment',
      created_at: now,
      updated_at: now,
      total_amount,
      shipping_address_id: addressId,
      shipping_method_id: shippingMethodId
    };
    orders.push(order);
    this._saveToStorage('orders', orders);

    // Create OrderItems
    const products = this._getFromStorage('products');
    const orderItems = this._getFromStorage('order_items');
    for (const ci of cartItems) {
      const product = products.find((p) => p.id === ci.product_id) || null;
      const unit_price = ci.unit_price;
      const subtotal = unit_price * ci.quantity;
      orderItems.push({
        id: this._generateId('order_item'),
        order_id: orderId,
        product_id: ci.product_id,
        quantity: ci.quantity,
        unit_price,
        subtotal
      });
    }
    this._saveToStorage('order_items', orderItems);

    // Clear cart
    const allCartItems = this._getFromStorage('cart_items');
    const remainingCartItems = allCartItems.filter((ci) => ci.cart_id !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);

    return {
      success: true,
      message: 'Order placed',
      order: {
        order_id: order.id,
        order_number: order.order_number,
        status: order.status,
        total_amount: order.total_amount,
        created_at: order.created_at
      }
    };
  }

  // 21) getBrandDirectory()
  getBrandDirectory() {
    const brands = this._getFromStorage('brands');
    const products = this._getFromStorage('products');

    const brandCounts = new Map();
    for (const p of products) {
      if (!p.brand_id) continue;
      brandCounts.set(p.brand_id, (brandCounts.get(p.brand_id) || 0) + 1);
    }

    const result = brands.map((b) => ({
      brand_id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description || '',
      logo_url: b.logo_url || '',
      product_count: brandCounts.get(b.id) || 0
    }));

    return {
      brands: result
    };
  }

  // 22) getBrandOverview(brandId)
  getBrandOverview(brandId) {
    const brands = this._getFromStorage('brands');
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    const brand = brands.find((b) => b.id === brandId) || null;

    const brandProducts = products.filter((p) => p.brand_id === brandId);

    const categoryMap = new Map();
    for (const p of brandProducts) {
      const c = categories.find((cat) => cat.id === p.category_id);
      if (!c) continue;
      if (!categoryMap.has(c.id)) {
        categoryMap.set(c.id, {
          category_id: c.id,
          category_name: c.name,
          category_key: c.key,
          product_count: 0,
          category: c
        });
      }
      categoryMap.get(c.id).product_count += 1;
    }

    const category_shortcuts = Array.from(categoryMap.values());

    return {
      brand: brand
        ? {
            brand_id: brand.id,
            name: brand.name,
            slug: brand.slug,
            description: brand.description || '',
            logo_url: brand.logo_url || ''
          }
        : null,
      category_shortcuts
    };
  }

  // 23) getDealsCategories()
  getDealsCategories() {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    const deals = products.filter((p) => p.is_in_deals === true && p.deals_category_id);
    const map = new Map();

    for (const p of deals) {
      const c = categories.find((cat) => cat.id === p.deals_category_id);
      if (!c) continue;
      if (!map.has(c.id)) {
        map.set(c.id, {
          category_id: c.id,
          category_name: c.name,
          category_key: c.key,
          product_count: 0,
          category: c
        });
      }
      map.get(c.id).product_count += 1;
    }

    return {
      deal_categories: Array.from(map.values())
    };
  }

  // 24) getAboutContent()
  getAboutContent() {
    const pages = this._getFromStorage('pages');
    const aboutPage =
      pages.find((p) => p.filename === 'about.html') ||
      pages.find((p) => (p.name || '').toLowerCase() === 'about');

    if (!aboutPage) {
      return {
        title: 'About',
        body_html: ''
      };
    }

    return {
      title: aboutPage.name || 'About',
      body_html: aboutPage.description || ''
    };
  }

  // 25) getContactInfo()
  getContactInfo() {
    const dataRaw = localStorage.getItem('contact_info');
    if (dataRaw) {
      try {
        const parsed = JSON.parse(dataRaw);
        return {
          support_email: parsed.support_email || '',
          support_phone: parsed.support_phone || '',
          response_time_description: parsed.response_time_description || '',
          support_topics: Array.isArray(parsed.support_topics)
            ? parsed.support_topics
            : []
        };
      } catch (e) {}
    }

    return {
      support_email: '',
      support_phone: '',
      response_time_description: '',
      support_topics: []
    };
  }

  // 26) submitContactRequest(name, email, subject, message)
  submitContactRequest(name, email, subject, message) {
    const contactRequests = this._getFromStorage('contact_requests');
    const now = new Date().toISOString();
    contactRequests.push({
      id: this._generateId('contact'),
      name,
      email,
      subject: subject || '',
      message,
      created_at: now
    });
    this._saveToStorage('contact_requests', contactRequests);

    return {
      success: true,
      message: 'Contact request submitted'
    };
  }

  // 27) getHelpFaqs()
  getHelpFaqs() {
    const faqs = this._getFromStorage('help_faqs');
    // Expecting help_faqs to already be in the desired structure if seeded
    if (faqs && Array.isArray(faqs) && faqs.length) {
      return {
        faq_categories: faqs
      };
    }

    return {
      faq_categories: []
    };
  }

  // 28) getPrivacyPolicyContent()
  getPrivacyPolicyContent() {
    const pages = this._getFromStorage('pages');
    const page =
      pages.find((p) => p.filename === 'privacy.html') ||
      pages.find((p) => (p.name || '').toLowerCase().includes('privacy'));
    if (!page) {
      return {
        title: 'Privacy Policy',
        body_html: ''
      };
    }
    return {
      title: page.name || 'Privacy Policy',
      body_html: page.description || ''
    };
  }

  // 29) getTermsAndConditionsContent()
  getTermsAndConditionsContent() {
    const pages = this._getFromStorage('pages');
    const page =
      pages.find((p) => p.filename === 'terms.html') ||
      pages.find((p) => (p.name || '').toLowerCase().includes('terms'));
    if (!page) {
      return {
        title: 'Terms & Conditions',
        body_html: ''
      };
    }
    return {
      title: page.name || 'Terms & Conditions',
      body_html: page.description || ''
    };
  }

  // 30) getShippingAndReturnsContent()
  getShippingAndReturnsContent() {
    const pages = this._getFromStorage('pages');
    const page =
      pages.find((p) => p.filename === 'shipping-returns.html') ||
      pages.find((p) => (p.name || '').toLowerCase().includes('shipping'));
    if (!page) {
      return {
        title: 'Shipping & Returns',
        body_html: ''
      };
    }
    return {
      title: page.name || 'Shipping & Returns',
      body_html: page.description || ''
    };
  }

  // 31) getSearchSuggestions(query_prefix)
  getSearchSuggestions(query_prefix) {
    const q = String(query_prefix || '').trim().toLowerCase();
    if (!q) {
      return { suggestions: [] };
    }

    const categories = this._getFromStorage('categories');
    const brands = this._getFromStorage('brands');

    const suggestions = [];
    const seenText = new Set();

    // Category suggestions
    for (const c of categories) {
      const name = c.name || '';
      if (name.toLowerCase().startsWith(q)) {
        if (!seenText.has(name.toLowerCase())) {
          seenText.add(name.toLowerCase());
          suggestions.push({
            suggestion_text: name,
            type: 'category',
            category_key: c.key || null,
            brand_name: null
          });
        }
      }
    }

    // Brand suggestions
    for (const b of brands) {
      const name = b.name || '';
      if (name.toLowerCase().startsWith(q)) {
        if (!seenText.has(name.toLowerCase())) {
          seenText.add(name.toLowerCase());
          suggestions.push({
            suggestion_text: name,
            type: 'brand',
            category_key: null,
            brand_name: name
          });
        }
      }
    }

    return {
      suggestions: suggestions.slice(0, 20)
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
