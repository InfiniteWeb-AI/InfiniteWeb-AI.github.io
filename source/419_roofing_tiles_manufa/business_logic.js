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
    // Keep a local counter mirror if needed
    this.idCounter = parseInt(localStorage.getItem('idCounter') || '1000', 10);
  }

  // -------------------------
  // Storage helpers
  // -------------------------
  _initStorage() {
    const keys = [
      'categories',
      'tile_series',
      'products',
      'carts',
      'cart_items',
      'sample_selections',
      'sample_selection_items',
      'sample_requests',
      'sample_request_items',
      'installers',
      'saved_installers',
      'resources',
      'saved_resources',
      'roof_configurations',
      'roof_configuration_components',
      'quote_requests',
      'quote_request_items',
      'contractor_registrations',
      'contact_requests'
    ];

    keys.forEach((key) => {
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
    this.idCounter = next;
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowIso() {
    return new Date().toISOString();
  }

  _enumLabel(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _formatPriceLabel(salesUnit, price) {
    if (price == null || isNaN(price)) return '';
    const formatted = '$' + Number(price).toFixed(2);
    if (salesUnit === 'tile') {
      return formatted + ' per tile';
    }
    if (salesUnit === 'm2') {
      return formatted + ' per m²';
    }
    return formatted;
  }

  // -------------------------
  // Helper: Cart
  // -------------------------
  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    let cart = carts.find((c) => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _computeCartSummary(cart, allCartItems, allProducts) {
    const items = allCartItems.filter((ci) => ci.cart_id === cart.id);
    let subtotal = 0;
    let totalQty = 0;
    let clearanceSavings = 0;

    items.forEach((item) => {
      const lineTotal = (item.unit_price_snapshot || 0) * (item.quantity || 0);
      subtotal += lineTotal;
      totalQty += item.quantity || 0;
      const product = allProducts.find((p) => p.id === item.product_id);
      if (product && typeof product.original_price_per_unit === 'number') {
        const diff = product.original_price_per_unit - (item.unit_price_snapshot || 0);
        if (diff > 0) {
          clearanceSavings += diff * (item.quantity || 0);
        }
      }
    });

    return {
      total_items: items.length,
      total_quantity: totalQty,
      subtotal,
      currency: 'USD',
      clearance_savings: clearanceSavings
    };
  }

  // -------------------------
  // Helper: Sample selection
  // -------------------------
  _getCurrentSampleSelection(createIfMissing = false) {
    const selections = this._getFromStorage('sample_selections');
    let selection = selections[selections.length - 1] || null;
    if (!selection && createIfMissing) {
      selection = {
        id: this._generateId('sample_selection'),
        series_id: null,
        created_at: this._nowIso(),
        updated_at: this._nowIso()
      };
      selections.push(selection);
      this._saveToStorage('sample_selections', selections);
    }
    return selection;
  }

  _createSampleRequestFromSelection(selection, fullName, email, streetAddress, city, state, postalCode, phone, customerType, marketingOptIn) {
    if (!selection) {
      return { success: false, message: 'No sample selection available.' };
    }
    const selectionItems = this._getFromStorage('sample_selection_items').filter(
      (i) => i.sample_selection_id === selection.id
    );
    if (!selectionItems.length) {
      return { success: false, message: 'Sample selection is empty.' };
    }

    const sampleRequests = this._getFromStorage('sample_requests');
    const sampleRequestItems = this._getFromStorage('sample_request_items');

    const requestId = this._generateId('sample_request');
    const now = this._nowIso();

    const request = {
      id: requestId,
      from_sample_selection_id: selection.id,
      full_name: fullName,
      email,
      phone: phone || null,
      street_address: streetAddress,
      city,
      state,
      postal_code: postalCode,
      customer_type: customerType || null,
      status: 'submitted',
      submitted_at: now
    };
    sampleRequests.push(request);

    const products = this._getFromStorage('products');

    selectionItems.forEach((sel) => {
      const product = products.find((p) => p.id === sel.product_id);
      const item = {
        id: this._generateId('sample_request_item'),
        sample_request_id: requestId,
        product_id: sel.product_id,
        product_name_snapshot: sel.product_name_snapshot || (product ? product.name : ''),
        color_snapshot: sel.color_snapshot || (product ? product.color : null),
        quantity: sel.quantity || 1
      };
      sampleRequestItems.push(item);
    });

    this._saveToStorage('sample_requests', sampleRequests);
    this._saveToStorage('sample_request_items', sampleRequestItems);

    return {
      success: true,
      sample_request: request,
      items: sampleRequestItems.filter((i) => i.sample_request_id === requestId)
    };
  }

  // -------------------------
  // Helper: Roof configuration / quote
  // -------------------------
  _generateRoofConfigurationComponents(configuration) {
    if (!configuration) return [];
    const roofConfigurationId = configuration.id;
    const products = this._getFromStorage('products');
    let components = this._getFromStorage('roof_configuration_components');

    // Remove any existing components for this configuration before regenerating
    components = components.filter((c) => c.roof_configuration_id !== roofConfigurationId);

    const area = configuration.roof_area_m2;
    const pitch = configuration.roof_pitch_deg;
    const climate = configuration.climate_profile;
    const color = configuration.tile_color;

    // Field tile candidate
    let fieldTile = products
      .filter((p) =>
        p.status === 'active' &&
        p.product_type === 'field_tile' &&
        (!color || p.color === color) &&
        (!p.climate_suitability || p.climate_suitability.includes(climate)) &&
        (typeof p.min_roof_pitch_deg !== 'number' || p.min_roof_pitch_deg <= pitch)
      )
      .sort((a, b) => (a.final_price_per_unit || 0) - (b.final_price_per_unit || 0))[0] || null;

    // Fallback: if no field tile matches the exact climate profile, relax climate constraint
    if (!fieldTile) {
      fieldTile = products
        .filter(
          (p) =>
            p.status === 'active' &&
            p.product_type === 'field_tile' &&
            (!color || p.color === color) &&
            (typeof p.min_roof_pitch_deg !== 'number' || p.min_roof_pitch_deg <= pitch)
        )
        .sort((a, b) => (a.final_price_per_unit || 0) - (b.final_price_per_unit || 0))[0] || null;
    }

    const newComponents = [];

    if (fieldTile) {
      let qtyField = null;
      if (fieldTile.sales_unit === 'tile') {
        const rate = fieldTile.coverage_tiles_per_m2 || 0;
        qtyField = Math.ceil(area * rate);
      } else if (fieldTile.sales_unit === 'm2') {
        qtyField = area;
      } else {
        qtyField = area;
      }

      newComponents.push({
        id: this._generateId('roof_conf_comp'),
        roof_configuration_id: roofConfigurationId,
        product_id: fieldTile.id,
        component_role: 'field_tile',
        recommended_quantity: qtyField,
        is_selected: true
      });
    }

    // Underlayment candidate
    const underlayment = products
      .filter((p) =>
        p.status === 'active' &&
        p.material === 'underlayment' &&
        (!p.climate_suitability || p.climate_suitability.includes(climate))
      )
      .sort((a, b) => (a.final_price_per_unit || 0) - (b.final_price_per_unit || 0))[0] || null;

    if (underlayment) {
      let qtyUnder = null;
      if (underlayment.sales_unit === 'm2') {
        qtyUnder = area;
      } else if (underlayment.sales_unit === 'tile') {
        const rate = underlayment.coverage_tiles_per_m2 || 1;
        qtyUnder = Math.ceil(area * rate);
      } else {
        qtyUnder = area;
      }
      newComponents.push({
        id: this._generateId('roof_conf_comp'),
        roof_configuration_id: roofConfigurationId,
        product_id: underlayment.id,
        component_role: 'underlayment',
        recommended_quantity: qtyUnder,
        is_selected: true
      });
    }

    // Ridge/hip accessories
    let ridgeCandidates = [];
    if (fieldTile && fieldTile.series_id) {
      ridgeCandidates = products.filter(
        (p) =>
          p.status === 'active' &&
          p.series_id === fieldTile.series_id &&
          (p.product_type === 'ridge_tile' || p.product_type === 'ridge_accessory')
      );
    }
    if (!ridgeCandidates.length) {
      ridgeCandidates = products.filter(
        (p) =>
          p.status === 'active' &&
          (p.product_type === 'ridge_tile' || p.product_type === 'ridge_accessory') &&
          (!color || p.color === color)
      );
    }
    const ridge = ridgeCandidates.sort(
      (a, b) => (a.final_price_per_unit || 0) - (b.final_price_per_unit || 0)
    )[0];

    if (ridge) {
      let qtyRidge = null;
      if (ridge.sales_unit === 'tile') {
        const rate = ridge.coverage_tiles_per_m2 || 0.3;
        qtyRidge = Math.ceil(area * rate);
      } else if (ridge.sales_unit === 'm2') {
        qtyRidge = area * 0.2;
      } else {
        qtyRidge = area * 0.2;
      }
      newComponents.push({
        id: this._generateId('roof_conf_comp'),
        roof_configuration_id: roofConfigurationId,
        product_id: ridge.id,
        component_role: 'ridge_or_hip_accessory',
        recommended_quantity: qtyRidge,
        is_selected: true
      });
    }

    const updatedComponents = components.concat(newComponents);
    this._saveToStorage('roof_configuration_components', updatedComponents);
    return newComponents;
  }

  _getOrCreateQuoteRequest(roofConfigurationId) {
    const quoteRequests = this._getFromStorage('quote_requests');
    let qr = quoteRequests.find(
      (q) => q.roof_configuration_id === roofConfigurationId && q.status === 'draft'
    );
    if (!qr) {
      qr = {
        id: this._generateId('quote_request'),
        roof_configuration_id: roofConfigurationId,
        full_name: null,
        email: null,
        phone: null,
        project_postal_code: null,
        customer_type: null,
        status: 'draft',
        submitted_at: null
      };
      quoteRequests.push(qr);
      this._saveToStorage('quote_requests', quoteRequests);
    }
    return qr;
  }

  // -------------------------
  // Helper: Installer distances
  // -------------------------
  _calculateInstallerDistances(postalCode, installers) {
    // Very small built-in mapping for known postal codes (no external calls)
    const postalMap = {
      '30301': { lat: 33.749, lon: -84.388 } // Atlanta, GA (approx)
    };
    const origin = postalMap[postalCode] || null;

    const toRad = (deg) => (deg * Math.PI) / 180;

    const result = {};
    installers.forEach((inst) => {
      let distance = null;
      if (
        origin &&
        typeof inst.latitude === 'number' &&
        typeof inst.longitude === 'number'
      ) {
        const R = 3958.8; // Earth radius in miles
        const dLat = toRad(inst.latitude - origin.lat);
        const dLon = toRad(inst.longitude - origin.lon);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(origin.lat)) *
            Math.cos(toRad(inst.latitude)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distance = R * c;
      }
      result[inst.id] = distance;
    });
    return result;
  }

  // -------------------------
  // Helper: Product filters/sort
  // -------------------------
  _applyProductFiltersAndSort(products, filters, sort) {
    let res = Array.isArray(products) ? products.slice() : [];
    const f = filters || {};

    if (f.material) {
      res = res.filter((p) => p.material === f.material);
    }
    if (f.climate_suitability) {
      res = res.filter(
        (p) =>
          Array.isArray(p.climate_suitability) &&
          p.climate_suitability.includes(f.climate_suitability)
      );
    }
    if (typeof f.min_price_per_unit === 'number') {
      res = res.filter(
        (p) => typeof p.final_price_per_unit === 'number' && p.final_price_per_unit >= f.min_price_per_unit
      );
    }
    if (typeof f.max_price_per_unit === 'number') {
      res = res.filter(
        (p) => typeof p.final_price_per_unit === 'number' && p.final_price_per_unit <= f.max_price_per_unit
      );
    }
    if (typeof f.min_warranty_years === 'number') {
      res = res.filter(
        (p) => typeof p.warranty_years === 'number' && p.warranty_years >= f.min_warranty_years
      );
    }
    if (f.color) {
      res = res.filter((p) => p.color === f.color);
    }
    if (typeof f.solar_compatible === 'boolean') {
      res = res.filter((p) => !!p.solar_compatible === f.solar_compatible);
    }
    if (typeof f.min_average_rating === 'number') {
      res = res.filter(
        (p) => typeof p.average_rating === 'number' && p.average_rating >= f.min_average_rating
      );
    }
    if (typeof f.max_min_roof_pitch_deg === 'number') {
      res = res.filter(
        (p) => typeof p.min_roof_pitch_deg === 'number' && p.min_roof_pitch_deg <= f.max_min_roof_pitch_deg
      );
    }
    if (typeof f.is_clearance === 'boolean') {
      res = res.filter((p) => !!p.is_clearance === f.is_clearance);
    }
    if (typeof f.min_discount_percentage === 'number') {
      res = res.filter(
        (p) => typeof p.discount_percentage === 'number' && p.discount_percentage >= f.min_discount_percentage
      );
    }
    if (f.sales_unit) {
      res = res.filter((p) => p.sales_unit === f.sales_unit);
    }
    if (f.product_type) {
      res = res.filter((p) => p.product_type === f.product_type);
    }

    // Sorting
    const s = sort || 'relevance';
    if (s === 'price_low_to_high') {
      res.sort(
        (a, b) => (a.final_price_per_unit || 0) - (b.final_price_per_unit || 0)
      );
    } else if (s === 'price_high_to_low') {
      res.sort(
        (a, b) => (b.final_price_per_unit || 0) - (a.final_price_per_unit || 0)
      );
    } else if (s === 'rating_high_to_low') {
      res.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }
    // 'relevance' => keep natural order

    return res;
  }

  // =====================================================
  // Interface implementations
  // =====================================================

  // -------------------------
  // getHomepageContent
  // -------------------------
  getHomepageContent() {
    const categories = this._getFromStorage('categories');
    const products = this._getFromStorage('products');

    const featured_categories = categories.map((c) => ({
      category_id: c.id,
      category_slug: c.slug,
      category_name: c.name,
      description: c.description || '',
      is_clearance: !!c.is_clearance
    }));

    // Climate highlights based on available product climate_suitability
    const climateSet = new Set();
    products.forEach((p) => {
      if (Array.isArray(p.climate_suitability)) {
        p.climate_suitability.forEach((cl) => climateSet.add(cl));
      }
    });
    const climate_highlights = Array.from(climateSet).map((cl) => ({
      climate_profile: cl,
      title: this._enumLabel(cl) + ' Solutions',
      description: 'Roof tiles and systems designed for ' + this._enumLabel(cl) + ' conditions.'
    }));

    // Featured products by material
    const materials = Array.from(new Set(products.map((p) => p.material).filter(Boolean)));
    const tileSeries = this._getFromStorage('tile_series');
    const categoriesMap = categories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
    const seriesMap = tileSeries.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {});

    const featured_products_by_material = materials.map((mat) => {
      const matProducts = products
        .filter((p) => p.material === mat && p.status === 'active')
        .slice(0, 6);
      const mapped = matProducts.map((p) => ({
        product_id: p.id,
        name: p.name,
        series_name: p.series_id && seriesMap[p.series_id] ? seriesMap[p.series_id].name : null,
        category_name:
          categoriesMap[p.category_id] ? categoriesMap[p.category_id].name : null,
        material: p.material,
        product_type: p.product_type,
        color: p.color || null,
        sales_unit: p.sales_unit,
        final_price_per_unit: p.final_price_per_unit || 0,
        price_label: this._formatPriceLabel(p.sales_unit, p.final_price_per_unit),
        average_rating: p.average_rating || 0,
        rating_count: p.rating_count || 0,
        is_clearance: !!p.is_clearance,
        discount_percentage: p.discount_percentage || 0,
        main_image_url: p.main_image_url || null,
        climate_suitability: Array.isArray(p.climate_suitability)
          ? p.climate_suitability.slice()
          : []
      }));
      return {
        material: mat,
        products: mapped
      };
    });

    // Clearance highlights
    const clearanceProducts = products.filter(
      (p) => p.is_clearance || (typeof p.discount_percentage === 'number' && p.discount_percentage > 0)
    );
    const clearance_highlights = clearanceProducts.slice(0, 10).map((p) => ({
      product_id: p.id,
      name: p.name,
      sales_unit: p.sales_unit,
      final_price_per_unit: p.final_price_per_unit || 0,
      price_label: this._formatPriceLabel(p.sales_unit, p.final_price_per_unit),
      discount_percentage: p.discount_percentage || 0,
      main_image_url: p.main_image_url || null,
      product: p // foreign key resolution for convenience
    }));

    const quick_links = categories.map((c) => ({
      key: c.slug,
      label: c.name,
      target_type: 'category',
      target_identifier: c.slug
    }));

    return {
      featured_categories,
      climate_highlights,
      featured_products_by_material,
      clearance_highlights,
      quick_links
    };
  }

  // -------------------------
  // getCategoriesForNavigation
  // -------------------------
  getCategoriesForNavigation() {
    return this._getFromStorage('categories');
  }

  // -------------------------
  // searchProducts(query, filters, sort, page, pageSize)
  // -------------------------
  searchProducts(query, filters, sort, page, pageSize) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const tileSeries = this._getFromStorage('tile_series');

    const q = (query || '').trim().toLowerCase();
    let res = products.filter((p) => p.status === 'active');

    if (q) {
      const seriesMap = tileSeries.reduce((acc, s) => {
        acc[s.id] = s;
        return acc;
      }, {});
      res = res.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const seriesName = p.series_id && seriesMap[p.series_id]
          ? (seriesMap[p.series_id].name || '').toLowerCase()
          : '';
        return name.includes(q) || desc.includes(q) || seriesName.includes(q);
      });
    }

    // Category slug filter from filters.categorySlug if provided
    const f = filters || {};
    if (f.categorySlug) {
      const catIds = categories
        .filter((c) => c.slug === f.categorySlug)
        .map((c) => c.id);
      res = res.filter((p) => catIds.includes(p.category_id));
    }

    res = this._applyProductFiltersAndSort(res, filters, sort);

    const total_results = res.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = res.slice(start, end);

    const categoriesMap = categories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
    const seriesMap = tileSeries.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {});

    const results = pageItems.map((p) => ({
      product_id: p.id,
      name: p.name,
      series_name: p.series_id && seriesMap[p.series_id] ? seriesMap[p.series_id].name : null,
      category_name:
        p.category_id && categoriesMap[p.category_id]
          ? categoriesMap[p.category_id].name
          : null,
      category_slug:
        p.category_id && categoriesMap[p.category_id]
          ? categoriesMap[p.category_id].slug
          : null,
      material: p.material,
      product_type: p.product_type,
      color: p.color || null,
      sales_unit: p.sales_unit,
      final_price_per_unit: p.final_price_per_unit || 0,
      price_label: this._formatPriceLabel(p.sales_unit, p.final_price_per_unit),
      average_rating: p.average_rating || 0,
      rating_count: p.rating_count || 0,
      is_clearance: !!p.is_clearance,
      discount_percentage: p.discount_percentage || 0,
      main_image_url: p.main_image_url || null,
      climate_suitability: Array.isArray(p.climate_suitability)
        ? p.climate_suitability.slice()
        : [],
      warranty_years: p.warranty_years || null,
      min_roof_pitch_deg: p.min_roof_pitch_deg || null
    }));

    return {
      total_results,
      page: currentPage,
      page_size: size,
      results
    };
  }

  // -------------------------
  // searchResources(query, documentType, productMaterial, page, pageSize)
  // -------------------------
  searchResources(query, documentType, productMaterial, page, pageSize) {
    const resources = this._getFromStorage('resources');
    const products = this._getFromStorage('products');

    const q = (query || '').trim().toLowerCase();
    let res = resources.slice();

    if (q) {
      res = res.filter((r) => (r.title || '').toLowerCase().includes(q));
    }
    if (documentType) {
      res = res.filter((r) => r.document_type === documentType);
    }
    if (productMaterial) {
      res = res.filter((r) => {
        const product = products.find((p) => p.id === r.product_id);
        // If no matching product record is found, keep the resource instead of excluding it
        if (!product) return true;
        return product.material === productMaterial;
      });
    }

    // Sort by last_updated_at (desc) if available
    res.sort((a, b) => {
      const ta = a.last_updated_at ? Date.parse(a.last_updated_at) : 0;
      const tb = b.last_updated_at ? Date.parse(b.last_updated_at) : 0;
      return tb - ta;
    });

    const total_results = res.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = res.slice(start, end);

    const results = pageItems.map((r) => {
      const product = products.find((p) => p.id === r.product_id) || null;
      return {
        resource_id: r.id,
        title: r.title,
        document_type: r.document_type,
        product_id: r.product_id || null,
        product_name: product ? product.name : null,
        file_url: r.file_url,
        last_updated_at: r.last_updated_at || null,
        product // foreign key resolution
      };
    });

    return {
      total_results,
      page: currentPage,
      page_size: size,
      results
    };
  }

  // -------------------------
  // getProductFilterOptions(context)
  // -------------------------
  getProductFilterOptions(context) {
    const ctx = context || {};
    const productsAll = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');

    let products = productsAll.filter((p) => p.status === 'active');

    if (ctx.categorySlug) {
      const catIds = categories
        .filter((c) => c.slug === ctx.categorySlug)
        .map((c) => c.id);
      products = products.filter((p) => catIds.includes(p.category_id));
    }

    if (ctx.isClearanceView) {
      products = products.filter((p) => !!p.is_clearance);
    }

    if (ctx.searchQuery) {
      const q = ctx.searchQuery.toLowerCase();
      products = products.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    const materials = Array.from(new Set(products.map((p) => p.material).filter(Boolean)));

    const climatesSet = new Set();
    products.forEach((p) => {
      if (Array.isArray(p.climate_suitability)) {
        p.climate_suitability.forEach((cl) => climatesSet.add(cl));
      }
    });
    const climates = Array.from(climatesSet).map((cl) => ({
      value: cl,
      label: this._enumLabel(cl)
    }));

    const colorsSet = new Set(products.map((p) => p.color).filter(Boolean));
    const colors = Array.from(colorsSet).map((c) => ({
      value: c,
      label: this._enumLabel(c)
    }));

    const hasSolarTrue = products.some((p) => p.solar_compatible === true);
    const hasSolarFalse = products.some((p) => p.solar_compatible === false);
    const solar_compatible_options = [];
    if (hasSolarTrue) {
      solar_compatible_options.push({ value: true, label: 'Solar compatible' });
    }
    if (hasSolarFalse) {
      solar_compatible_options.push({ value: false, label: 'Not solar compatible' });
    }

    const warranty_yearsSet = new Set(
      products
        .map((p) => (typeof p.warranty_years === 'number' ? p.warranty_years : null))
        .filter((v) => v != null)
    );
    const warranty_years = Array.from(warranty_yearsSet).sort((a, b) => a - b);

    const pitchSet = new Set(
      products
        .map((p) => (typeof p.min_roof_pitch_deg === 'number' ? p.min_roof_pitch_deg : null))
        .filter((v) => v != null)
    );
    const min_roof_pitch_deg_values = Array.from(pitchSet).sort((a, b) => a - b);

    const prices = products
      .map((p) => p.final_price_per_unit)
      .filter((v) => typeof v === 'number');
    let price_ranges = [];
    if (prices.length) {
      const minPrice = Math.min.apply(null, prices);
      const maxPrice = Math.max.apply(null, prices);
      const step = (maxPrice - minPrice) / 3 || maxPrice || 0;
      price_ranges = [
        { min: minPrice, max: minPrice + step, label: 'Low' },
        { min: minPrice + step, max: minPrice + 2 * step, label: 'Medium' },
        { min: minPrice + 2 * step, max: maxPrice, label: 'High' }
      ];
    }

    const discountSet = new Set(
      products
        .map((p) => (typeof p.discount_percentage === 'number' ? p.discount_percentage : null))
        .filter((v) => v != null)
    );
    const discountRanges = [];
    if (discountSet.size) {
      discountRanges.push({ min_percentage: 5, label: '5% and up' });
      discountRanges.push({ min_percentage: 10, label: '10% and up' });
      discountRanges.push({ min_percentage: 15, label: '15% and up' });
      discountRanges.push({ min_percentage: 20, label: '20% and up' });
    }

    const productTypesSet = new Set(products.map((p) => p.product_type).filter(Boolean));
    const product_types = Array.from(productTypesSet).map((pt) => ({
      value: pt,
      label: this._enumLabel(pt)
    }));

    const sales_units = Array.from(new Set(products.map((p) => p.sales_unit).filter(Boolean)));

    return {
      materials,
      climates,
      colors,
      solar_compatible_options,
      warranty_years,
      min_roof_pitch_deg_values,
      price_ranges,
      discount_ranges: discountRanges,
      product_types,
      sales_units
    };
  }

  // -------------------------
  // listProducts(categorySlug, searchQuery, filters, sort, page, pageSize)
  // -------------------------
  listProducts(categorySlug, searchQuery, filters, sort, page, pageSize) {
    const productsAll = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const tileSeries = this._getFromStorage('tile_series');

    const categoriesMap = categories.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {});
    const seriesMap = tileSeries.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {});

    let products = productsAll.filter((p) => p.status === 'active');

    if (categorySlug) {
      const catIds = categories
        .filter((c) => c.slug === categorySlug)
        .map((c) => c.id);
      products = products.filter((p) => catIds.includes(p.category_id));
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      products = products.filter((p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    products = this._applyProductFiltersAndSort(products, filters, sort);

    const total_results = products.length;
    const currentPage = page && page > 0 ? page : 1;
    const size = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (currentPage - 1) * size;
    const end = start + size;
    const pageItems = products.slice(start, end);

    const results = pageItems.map((p) => ({
      product_id: p.id,
      name: p.name,
      series_name: p.series_id && seriesMap[p.series_id] ? seriesMap[p.series_id].name : null,
      category_name:
        p.category_id && categoriesMap[p.category_id]
          ? categoriesMap[p.category_id].name
          : null,
      category_slug:
        p.category_id && categoriesMap[p.category_id]
          ? categoriesMap[p.category_id].slug
          : null,
      material: p.material,
      product_type: p.product_type,
      color: p.color || null,
      sales_unit: p.sales_unit,
      final_price_per_unit: p.final_price_per_unit || 0,
      price_label: this._formatPriceLabel(p.sales_unit, p.final_price_per_unit),
      average_rating: p.average_rating || 0,
      rating_count: p.rating_count || 0,
      is_clearance: !!p.is_clearance,
      discount_percentage: p.discount_percentage || 0,
      main_image_url: p.main_image_url || null,
      climate_suitability: Array.isArray(p.climate_suitability)
        ? p.climate_suitability.slice()
        : [],
      warranty_years: p.warranty_years || null,
      min_roof_pitch_deg: p.min_roof_pitch_deg || null
    }));

    return {
      total_results,
      page: currentPage,
      page_size: size,
      results
    };
  }

  // -------------------------
  // getProductDetails(productId)
  // -------------------------
  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('categories');
    const tileSeries = this._getFromStorage('tile_series');
    const resources = this._getFromStorage('resources');
    const savedResources = this._getFromStorage('saved_resources');

    const product = products.find((p) => p.id === productId) || null;
    if (!product) {
      return {
        product: null,
        category: null,
        series: null,
        pricing: null,
        specs: null,
        related_products: [],
        documents_summary: []
      };
    }

    const category = categories.find((c) => c.id === product.category_id) || null;
    const series = product.series_id
      ? tileSeries.find((s) => s.id === product.series_id) || null
      : null;

    const pricing = {
      sales_unit: product.sales_unit,
      price_per_tile: product.price_per_tile || null,
      price_per_m2: product.price_per_m2 || null,
      final_price_per_unit: product.final_price_per_unit || 0,
      original_price_per_unit: product.original_price_per_unit || null,
      discount_percentage: product.discount_percentage || 0,
      price_label: this._formatPriceLabel(
        product.sales_unit,
        product.final_price_per_unit
      )
    };

    const specs = {
      material: product.material,
      product_type: product.product_type,
      color: product.color || null,
      climate_suitability: Array.isArray(product.climate_suitability)
        ? product.climate_suitability.slice()
        : [],
      solar_compatible: !!product.solar_compatible,
      warranty_years: product.warranty_years || null,
      min_roof_pitch_deg: product.min_roof_pitch_deg || null,
      weight_per_m2: product.weight_per_m2 || null,
      coverage_tiles_per_m2: product.coverage_tiles_per_m2 || null,
      average_rating: product.average_rating || 0,
      rating_count: product.rating_count || 0
    };

    const related_products = [];
    if (Array.isArray(product.related_product_ids)) {
      product.related_product_ids.forEach((rid) => {
        const rp = products.find((p) => p.id === rid);
        if (rp) {
          related_products.push({
            product_id: rp.id,
            name: rp.name,
            product_type: rp.product_type,
            sales_unit: rp.sales_unit,
            final_price_per_unit: rp.final_price_per_unit || 0,
            price_label: this._formatPriceLabel(
              rp.sales_unit,
              rp.final_price_per_unit
            ),
            main_image_url: rp.main_image_url || null
          });
        }
      });
    }

    const docs = resources.filter((r) => r.product_id === product.id);
    const documents_summary = docs.map((r) => ({
      resource_id: r.id,
      title: r.title,
      document_type: r.document_type,
      last_updated_at: r.last_updated_at || null,
      is_saved: savedResources.some((sr) => sr.resource_id === r.id)
    }));

    return {
      product,
      category: category
        ? {
            category_id: category.id,
            category_name: category.name,
            category_slug: category.slug
          }
        : null,
      series: series
        ? {
            series_id: series.id,
            series_name: series.name,
            description: series.description || '',
            image_url: series.image_url || null
          }
        : null,
      pricing,
      specs,
      related_products,
      documents_summary
    };
  }

  // -------------------------
  // calculateTileCoverage(productId, roofAreaM2)
  // -------------------------
  calculateTileCoverage(productId, roofAreaM2) {
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId) || null;
    if (!product || typeof roofAreaM2 !== 'number' || roofAreaM2 <= 0) {
      return {
        product_id: productId,
        roof_area_m2: roofAreaM2,
        coverage_tiles_per_m2: product ? product.coverage_tiles_per_m2 || 0 : 0,
        calculated_tiles_needed: 0,
        rounded_tiles_needed: 0,
        message: 'Insufficient data for coverage calculation.'
      };
    }
    const coverage = product.coverage_tiles_per_m2 || 0;
    const calculated = roofAreaM2 * coverage;
    const rounded = Math.ceil(calculated);

    // Instrumentation for task completion tracking
    try {
      if (product && typeof roofAreaM2 === 'number' && roofAreaM2 > 0) {
        localStorage.setItem(
          'task2_coverageCalculation',
          JSON.stringify({
            productId: productId,
            roofAreaM2: roofAreaM2,
            coverage_tiles_per_m2: product ? (product.coverage_tiles_per_m2 || 0) : 0,
            calculated_tiles_needed: calculated,
            rounded_tiles_needed: rounded,
            timestamp: new Date().toISOString()
          })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      product_id: productId,
      roof_area_m2: roofAreaM2,
      coverage_tiles_per_m2: coverage,
      calculated_tiles_needed: calculated,
      rounded_tiles_needed: rounded,
      message: 'Calculation based on coverage_tiles_per_m2.'
    };
  }

  // -------------------------
  // addProductToCart(productId, quantity)
  // -------------------------
  addProductToCart(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);
    if (!product) {
      return { success: false, cart_id: null, message: 'Product not found.' };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    let cartItem = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId
    );

    if (cartItem) {
      cartItem.quantity += qty;
      cartItem.added_at = this._nowIso();
    } else {
      cartItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        sales_unit_snapshot: product.sales_unit,
        unit_price_snapshot: product.final_price_per_unit || 0,
        quantity: qty,
        is_clearance_snapshot: !!product.is_clearance,
        discount_percentage_snapshot: product.discount_percentage || 0,
        added_at: this._nowIso()
      };
      cartItems.push(cartItem);
    }

    this._saveToStorage('cart_items', cartItems);
    cart.updated_at = this._nowIso();
    const carts = this._getFromStorage('carts').map((c) =>
      c.id === cart.id ? cart : c
    );
    this._saveToStorage('carts', carts);

    const summary = this._computeCartSummary(cart, cartItems, products);

    return {
      success: true,
      cart_id: cart.id,
      message: 'Product added to cart.',
      cart_item: cartItem,
      cart_summary: summary
    };
  }

  // -------------------------
  // getCartSummary()
  // -------------------------
  getCartSummary() {
    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.status === 'active') || null;
    const products = this._getFromStorage('products');

    if (!cart) {
      return {
        cart: null,
        items: [],
        totals: {
          subtotal: 0,
          currency: 'USD',
          total_quantity: 0,
          clearance_savings: 0,
          notes: 'No active cart.'
        }
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(
      (ci) => ci.cart_id === cart.id
    );

    const items = cartItems.map((ci) => {
      const product = products.find((p) => p.id === ci.product_id) || {};
      const lineTotal = (ci.unit_price_snapshot || 0) * (ci.quantity || 0);
      return {
        cart_item_id: ci.id,
        product_id: ci.product_id,
        product_name: ci.product_name_snapshot,
        product_main_image_url: product.main_image_url || null,
        material: product.material || null,
        product_type: product.product_type || null,
        color: product.color || null,
        sales_unit: ci.sales_unit_snapshot,
        unit_price: ci.unit_price_snapshot || 0,
        quantity: ci.quantity || 0,
        line_total: lineTotal,
        is_clearance: !!ci.is_clearance_snapshot,
        discount_percentage: ci.discount_percentage_snapshot || 0,
        price_label: this._formatPriceLabel(
          ci.sales_unit_snapshot,
          ci.unit_price_snapshot
        ),
        product // foreign key resolution
      };
    });

    const summaryBase = this._computeCartSummary(cart, this._getFromStorage('cart_items'), products);

    return {
      cart,
      items,
      totals: {
        subtotal: summaryBase.subtotal,
        currency: summaryBase.currency,
        total_quantity: summaryBase.total_quantity,
        clearance_savings: summaryBase.clearance_savings,
        notes: ''
      }
    };
  }

  // -------------------------
  // updateCartItemQuantity(cartItemId, quantity)
  // -------------------------
  updateCartItemQuantity(cartItemId, quantity) {
    const newQty = typeof quantity === 'number' ? quantity : 0;
    let cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const carts = this._getFromStorage('carts');

    const cartItem = cartItems.find((ci) => ci.id === cartItemId);
    if (!cartItem) {
      return {
        success: false,
        message: 'Cart item not found.',
        updated_item: null,
        totals: null
      };
    }

    if (newQty <= 0) {
      cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
      this._saveToStorage('cart_items', cartItems);
    } else {
      cartItem.quantity = newQty;
      this._saveToStorage('cart_items', cartItems);
    }

    const cart = carts.find((c) => c.id === cartItem.cart_id) || this._getOrCreateCart();
    const summaryBase = this._computeCartSummary(cart, cartItems, products);

    const updatedItem = newQty > 0
      ? {
          cart_item_id: cartItem.id,
          quantity: cartItem.quantity,
          line_total: (cartItem.unit_price_snapshot || 0) * cartItem.quantity
        }
      : null;

    return {
      success: true,
      message: newQty > 0 ? 'Cart item updated.' : 'Cart item removed.',
      updated_item: updatedItem,
      totals: {
        subtotal: summaryBase.subtotal,
        currency: summaryBase.currency,
        total_quantity: summaryBase.total_quantity,
        clearance_savings: summaryBase.clearance_savings
      }
    };
  }

  // -------------------------
  // removeCartItem(cartItemId)
  // -------------------------
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const products = this._getFromStorage('products');
    const carts = this._getFromStorage('carts');

    const existing = cartItems.find((ci) => ci.id === cartItemId);
    if (!existing) {
      return {
        success: false,
        message: 'Cart item not found.',
        totals: null
      };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const cart = carts.find((c) => c.id === existing.cart_id) || this._getOrCreateCart();
    const summaryBase = this._computeCartSummary(cart, cartItems, products);

    return {
      success: true,
      message: 'Cart item removed.',
      totals: {
        subtotal: summaryBase.subtotal,
        currency: summaryBase.currency,
        total_quantity: summaryBase.total_quantity,
        clearance_savings: summaryBase.clearance_savings
      }
    };
  }

  // -------------------------
  // getSampleSeriesOptions()
  // -------------------------
  getSampleSeriesOptions() {
    const seriesList = this._getFromStorage('tile_series');
    const products = this._getFromStorage('products');

    return seriesList.map((s) => {
      const hasSample = products.some(
        (p) => p.series_id === s.id && p.is_sample_available
      );
      return {
        series_id: s.id,
        series_name: s.name,
        description: s.description || '',
        default_material: s.default_material || null,
        image_url: s.image_url || null,
        is_sample_available: hasSample
      };
    });
  }

  // -------------------------
  // getSampleProductsForSeries(seriesId)
  // -------------------------
  getSampleProductsForSeries(seriesId) {
    const seriesList = this._getFromStorage('tile_series');
    const products = this._getFromStorage('products');

    const series = seriesList.find((s) => s.id === seriesId) || null;

    const sampleProductsRaw = products.filter(
      (p) => p.series_id === seriesId && p.is_sample_available
    );

    const sample_products = sampleProductsRaw.map((p) => ({
      product_id: p.id,
      name: p.name,
      color: p.color || null,
      color_label: this._enumLabel(p.color || ''),
      main_image_url: p.main_image_url || null,
      is_sample_available: !!p.is_sample_available
    }));

    return {
      series,
      sample_products
    };
  }

  // -------------------------
  // addSampleToSelection(productId, quantity)
  // -------------------------
  addSampleToSelection(productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const products = this._getFromStorage('products');
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return {
        success: false,
        sample_selection_id: null,
        message: 'Product not found.',
        selection_items: []
      };
    }
    if (!product.is_sample_available) {
      return {
        success: false,
        sample_selection_id: null,
        message: 'Samples are not available for this product.',
        selection_items: []
      };
    }

    const selection = this._getCurrentSampleSelection(true);

    // Single-series constraint
    if (selection.series_id && selection.series_id !== product.series_id) {
      const items = this._getFromStorage('sample_selection_items').filter(
        (i) => i.sample_selection_id === selection.id
      );
      const mapped = items.map((i) => ({
        selection_item_id: i.id,
        product_id: i.product_id,
        product_name: i.product_name_snapshot,
        color: i.color_snapshot,
        quantity: i.quantity
      }));
      return {
        success: false,
        sample_selection_id: selection.id,
        message: 'All sample colors must be from the same series.',
        selection_items: mapped
      };
    }

    const selections = this._getFromStorage('sample_selections');
    const idx = selections.findIndex((s) => s.id === selection.id);
    if (selection.series_id == null) {
      selection.series_id = product.series_id || null;
    }
    selection.updated_at = this._nowIso();
    if (idx >= 0) {
      selections[idx] = selection;
      this._saveToStorage('sample_selections', selections);
    }

    const selectionItems = this._getFromStorage('sample_selection_items');
    let item = selectionItems.find(
      (i) => i.sample_selection_id === selection.id && i.product_id === product.id
    );

    if (item) {
      item.quantity += qty;
    } else {
      item = {
        id: this._generateId('sample_selection_item'),
        sample_selection_id: selection.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        color_snapshot: product.color || null,
        quantity: qty
      };
      selectionItems.push(item);
    }

    this._saveToStorage('sample_selection_items', selectionItems);

    const currentItems = selectionItems.filter(
      (i) => i.sample_selection_id === selection.id
    );
    const mapped = currentItems.map((i) => ({
      selection_item_id: i.id,
      product_id: i.product_id,
      product_name: i.product_name_snapshot,
      color: i.color_snapshot,
      quantity: i.quantity
    }));

    return {
      success: true,
      sample_selection_id: selection.id,
      message: 'Sample added to selection.',
      selection_items: mapped
    };
  }

  // -------------------------
  // getSampleSelection()
  // -------------------------
  getSampleSelection() {
    const selection = this._getCurrentSampleSelection(false);
    if (!selection) {
      return {
        sample_selection_id: null,
        series_id: null,
        series_name: null,
        items: [],
        total_items: 0
      };
    }

    const selectionItems = this._getFromStorage('sample_selection_items').filter(
      (i) => i.sample_selection_id === selection.id
    );
    const seriesList = this._getFromStorage('tile_series');
    const products = this._getFromStorage('products');

    const series = selection.series_id
      ? seriesList.find((s) => s.id === selection.series_id) || null
      : null;

    const items = selectionItems.map((i) => {
      const product = products.find((p) => p.id === i.product_id) || null;
      return {
        selection_item_id: i.id,
        product_id: i.product_id,
        product_name: i.product_name_snapshot,
        color: i.color_snapshot,
        quantity: i.quantity,
        product // foreign key resolution
      };
    });

    return {
      sample_selection_id: selection.id,
      series_id: selection.series_id,
      series_name: series ? series.name : null,
      items,
      total_items: items.length,
      series // foreign key resolution
    };
  }

  // -------------------------
  // submitSampleRequest(...)
  // -------------------------
  submitSampleRequest(fullName, email, streetAddress, city, state, postalCode, phone, customerType, marketingOptIn) {
    const selection = this._getCurrentSampleSelection(false);
    const result = this._createSampleRequestFromSelection(
      selection,
      fullName,
      email,
      streetAddress,
      city,
      state,
      postalCode,
      phone,
      customerType
    );

    if (!result.success) {
      return {
        success: false,
        sample_request_id: null,
        status: 'draft',
        submitted_at: null,
        items: [],
        message: result.message || 'Unable to submit sample request.'
      };
    }

    const request = result.sample_request;

    return {
      success: true,
      sample_request_id: request.id,
      status: request.status,
      submitted_at: request.submitted_at,
      items: result.items,
      message: 'Sample request submitted successfully.'
    };
  }

  // -------------------------
  // getInstallerFilterOptions()
  // -------------------------
  getInstallerFilterOptions() {
    const installers = this._getFromStorage('installers');

    const serviceSet = new Set();
    const availabilitySet = new Set();

    installers.forEach((inst) => {
      if (Array.isArray(inst.service_types)) {
        inst.service_types.forEach((s) => serviceSet.add(s));
      }
      if (Array.isArray(inst.availability_options)) {
        inst.availability_options.forEach((a) => availabilitySet.add(a));
      }
    });

    const service_types = Array.from(serviceSet).map((v) => ({
      value: v,
      label: this._enumLabel(v)
    }));

    const availability_options = Array.from(availabilitySet).map((v) => ({
      value: v,
      label: this._enumLabel(v)
    }));

    return {
      service_types,
      availability_options
    };
  }

  // -------------------------
  // searchInstallers(postalCode, radiusMiles, filters, sort)
  // -------------------------
  searchInstallers(postalCode, radiusMiles, filters, sort) {
    const installers = this._getFromStorage('installers');
    const distances = this._calculateInstallerDistances(postalCode, installers);
    const f = filters || {};

    let res = installers.slice();

    // Apply distance filter if we have distances
    res = res.filter((inst) => {
      const d = distances[inst.id];
      if (d == null || isNaN(d)) return false;
      return typeof radiusMiles === 'number' && radiusMiles > 0 ? d <= radiusMiles : true;
    });

    if (f.service_type) {
      res = res.filter(
        (inst) => Array.isArray(inst.service_types) && inst.service_types.includes(f.service_type)
      );
    }
    if (f.availability_option) {
      res = res.filter(
        (inst) =>
          Array.isArray(inst.availability_options) &&
          inst.availability_options.includes(f.availability_option)
      );
    }
    if (typeof f.min_average_rating === 'number') {
      res = res.filter(
        (inst) => typeof inst.average_rating === 'number' && inst.average_rating >= f.min_average_rating
      );
    }

    const s = sort || 'distance_nearest_first';
    if (s === 'distance_nearest_first') {
      res.sort((a, b) => (distances[a.id] || 0) - (distances[b.id] || 0));
    } else if (s === 'rating_high_to_low') {
      res.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    }

    const results = res.map((inst) => ({
      installer_id: inst.id,
      business_name: inst.business_name,
      city: inst.city || null,
      state: inst.state || null,
      postal_code: inst.postal_code,
      distance_miles: distances[inst.id] || null,
      service_types: Array.isArray(inst.service_types)
        ? inst.service_types.slice()
        : [],
      availability_options: Array.isArray(inst.availability_options)
        ? inst.availability_options.slice()
        : [],
      average_rating: inst.average_rating || 0,
      rating_count: inst.rating_count || 0,
      phone: inst.phone || null,
      website_url: inst.website_url || null
    }));

    return {
      total_results: results.length,
      results
    };
  }

  // -------------------------
  // getInstallerDetail(installerId)
  // -------------------------
  getInstallerDetail(installerId) {
    const installers = this._getFromStorage('installers');
    const savedInstallers = this._getFromStorage('saved_installers');

    const installer = installers.find((i) => i.id === installerId) || null;
    if (!installer) {
      return {
        installer: null,
        distance_miles: null,
        opening_hours: null,
        services_description: '',
        is_saved: false
      };
    }

    // Without a postal code context we can't compute exact distance; return null
    const distance_miles = null;

    const weekendHours =
      Array.isArray(installer.availability_options) &&
      installer.availability_options.includes('weekend_hours');

    const opening_hours = {
      monday: '',
      tuesday: '',
      wednesday: '',
      thursday: '',
      friday: '',
      saturday: '',
      sunday: '',
      weekend_hours: weekendHours
    };

    const services_description = Array.isArray(installer.service_types)
      ? 'Services: ' + installer.service_types.map((s) => this._enumLabel(s)).join(', ')
      : '';

    const is_saved = savedInstallers.some((s) => s.installer_id === installer.id);

    return {
      installer,
      distance_miles,
      opening_hours,
      services_description,
      is_saved
    };
  }

  // -------------------------
  // saveInstaller(installerId)
  // -------------------------
  saveInstaller(installerId) {
    const installers = this._getFromStorage('installers');
    const installer = installers.find((i) => i.id === installerId);
    if (!installer) {
      return {
        success: false,
        saved_installer_id: null,
        saved_at: null,
        message: 'Installer not found.'
      };
    }

    const savedInstallers = this._getFromStorage('saved_installers');
    const existing = savedInstallers.find((s) => s.installer_id === installerId);
    if (existing) {
      return {
        success: true,
        saved_installer_id: existing.id,
        saved_at: existing.saved_at,
        message: 'Installer already saved.'
      };
    }

    const id = this._generateId('saved_installer');
    const now = this._nowIso();
    const record = {
      id,
      installer_id: installerId,
      saved_at: now
    };
    savedInstallers.push(record);
    this._saveToStorage('saved_installers', savedInstallers);

    return {
      success: true,
      saved_installer_id: id,
      saved_at: now,
      message: 'Installer saved.'
    };
  }

  // -------------------------
  // getSavedInstallers()
  // -------------------------
  getSavedInstallers() {
    const savedInstallers = this._getFromStorage('saved_installers');
    const installers = this._getFromStorage('installers');

    return savedInstallers.map((s) => {
      const inst = installers.find((i) => i.id === s.installer_id) || {};
      return {
        saved_installer_id: s.id,
        installer_id: s.installer_id,
        business_name: inst.business_name || null,
        city: inst.city || null,
        state: inst.state || null,
        postal_code: inst.postal_code || null,
        service_types: Array.isArray(inst.service_types)
          ? inst.service_types.slice()
          : [],
        availability_options: Array.isArray(inst.availability_options)
          ? inst.availability_options.slice()
          : [],
        average_rating: inst.average_rating || 0,
        phone: inst.phone || null,
        distance_miles: null,
        installer: inst // foreign key resolution
      };
    });
  }

  // -------------------------
  // removeSavedInstaller(installerId)
  // -------------------------
  removeSavedInstaller(installerId) {
    const savedInstallers = this._getFromStorage('saved_installers');
    const filtered = savedInstallers.filter((s) => s.installer_id !== installerId);
    const removed = savedInstallers.length !== filtered.length;
    this._saveToStorage('saved_installers', filtered);

    return {
      success: removed,
      message: removed ? 'Installer removed from saved list.' : 'Installer not found in saved list.'
    };
  }

  // -------------------------
  // getProductDocuments(productId)
  // -------------------------
  getProductDocuments(productId) {
    const products = this._getFromStorage('products');
    const resources = this._getFromStorage('resources');

    const product = products.find((p) => p.id === productId) || null;
    const documents = resources.filter((r) => r.product_id === productId);

    return {
      product_id: productId,
      product_name: product ? product.name : null,
      product,
      documents
    };
  }

  // -------------------------
  // saveResource(resourceId)
  // -------------------------
  saveResource(resourceId) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) {
      return {
        success: false,
        saved_resource_id: null,
        saved_at: null,
        message: 'Resource not found.'
      };
    }

    const savedResources = this._getFromStorage('saved_resources');
    const existing = savedResources.find((s) => s.resource_id === resourceId);
    if (existing) {
      return {
        success: true,
        saved_resource_id: existing.id,
        saved_at: existing.saved_at,
        message: 'Resource already saved.'
      };
    }

    const id = this._generateId('saved_resource');
    const now = this._nowIso();
    const record = {
      id,
      resource_id: resourceId,
      saved_at: now
    };
    savedResources.push(record);
    this._saveToStorage('saved_resources', savedResources);

    return {
      success: true,
      saved_resource_id: id,
      saved_at: now,
      message: 'Resource saved.'
    };
  }

  // -------------------------
  // getSavedResources()
  // -------------------------
  getSavedResources() {
    const savedResources = this._getFromStorage('saved_resources');
    const resources = this._getFromStorage('resources');
    const products = this._getFromStorage('products');

    return savedResources.map((s) => {
      const r = resources.find((r) => r.id === s.resource_id) || {};
      const product = r.product_id
        ? products.find((p) => p.id === r.product_id) || null
        : null;
      return {
        saved_resource_id: s.id,
        resource_id: s.resource_id,
        title: r.title || null,
        document_type: r.document_type || null,
        product_id: r.product_id || null,
        product_name: product ? product.name : null,
        last_updated_at: r.last_updated_at || null,
        resource: r // foreign key resolution
      };
    });
  }

  // -------------------------
  // removeSavedResource(resourceId)
  // -------------------------
  removeSavedResource(resourceId) {
    const savedResources = this._getFromStorage('saved_resources');
    const filtered = savedResources.filter((s) => s.resource_id !== resourceId);
    const removed = filtered.length !== savedResources.length;
    this._saveToStorage('saved_resources', filtered);

    return {
      success: removed,
      message: removed ? 'Resource removed from saved list.' : 'Resource not found in saved list.'
    };
  }

  // -------------------------
  // getResourceDetail(resourceId)
  // -------------------------
  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources');
    const products = this._getFromStorage('products');
    const savedResources = this._getFromStorage('saved_resources');

    const resource = resources.find((r) => r.id === resourceId) || null;
    if (!resource) {
      return {
        resource: null,
        product: null,
        is_saved: false
      };
    }

    const product = resource.product_id
      ? products.find((p) => p.id === resource.product_id) || null
      : null;
    const is_saved = savedResources.some((s) => s.resource_id === resourceId);

    return {
      resource,
      product: product
        ? {
            product_id: product.id,
            name: product.name,
            material: product.material,
            product_type: product.product_type
          }
        : null,
      is_saved
    };
  }

  // -------------------------
  // getRoofConfiguratorOptions()
  // -------------------------
  getRoofConfiguratorOptions() {
    const roof_styles = [
      { value: 'contemporary', label: 'Contemporary' },
      { value: 'traditional', label: 'Traditional' },
      { value: 'mediterranean', label: 'Mediterranean' },
      { value: 'modern', label: 'Modern' },
      { value: 'rustic', label: 'Rustic' }
    ];

    const tile_colors = [
      { value: 'dark_grey', label: 'Dark Grey' },
      { value: 'light_grey', label: 'Light Grey' },
      { value: 'terracotta', label: 'Terracotta' },
      { value: 'red', label: 'Red' },
      { value: 'brown', label: 'Brown' },
      { value: 'black', label: 'Black' },
      { value: 'beige', label: 'Beige' },
      { value: 'other', label: 'Other' }
    ];

    const climate_profiles = [
      { value: 'coastal_marine', label: 'Coastal / Marine' },
      { value: 'snowy', label: 'Snowy' },
      { value: 'hot_desert', label: 'Hot Desert' },
      { value: 'temperate', label: 'Temperate' },
      { value: 'high_wind', label: 'High Wind' }
    ];

    const pitch_presets_deg = [15, 20, 30, 45];
    const area_presets_m2 = [80, 100, 120, 150, 200];

    return {
      roof_styles,
      tile_colors,
      climate_profiles,
      pitch_presets_deg,
      area_presets_m2
    };
  }

  // -------------------------
  // createRoofConfiguration(roofAreaM2, roofPitchDeg, roofStyle, tileColor, climateProfile, notes)
  // -------------------------
  createRoofConfiguration(roofAreaM2, roofPitchDeg, roofStyle, tileColor, climateProfile, notes) {
    const roofConfigurations = this._getFromStorage('roof_configurations');

    const config = {
      id: this._generateId('roof_configuration'),
      roof_area_m2: roofAreaM2,
      roof_pitch_deg: roofPitchDeg,
      roof_style: roofStyle,
      tile_color: tileColor || null,
      climate_profile: climateProfile,
      notes: notes || null,
      created_at: this._nowIso()
    };

    roofConfigurations.push(config);
    this._saveToStorage('roof_configurations', roofConfigurations);

    // Generate recommended components
    this._generateRoofConfigurationComponents(config);

    return {
      roof_configuration_id: config.id,
      configuration: config
    };
  }

  // -------------------------
  // getRoofConfigurationDetails(roofConfigurationId)
  // -------------------------
  getRoofConfigurationDetails(roofConfigurationId) {
    const roofConfigurations = this._getFromStorage('roof_configurations');
    const componentsAll = this._getFromStorage('roof_configuration_components');
    const products = this._getFromStorage('products');

    const configuration = roofConfigurations.find((c) => c.id === roofConfigurationId) || null;
    if (!configuration) {
      return {
        configuration: null,
        components: []
      };
    }

    const components = componentsAll
      .filter((c) => c.roof_configuration_id === roofConfigurationId)
      .map((c) => {
        const product = products.find((p) => p.id === c.product_id) || {};
        return {
          configuration_component_id: c.id,
          product_id: c.product_id,
          product_name: product.name || null,
          component_role: c.component_role,
          recommended_quantity: c.recommended_quantity || 0,
          is_selected_default: !!c.is_selected,
          product_summary: {
            material: product.material || null,
            product_type: product.product_type || null,
            color: product.color || null,
            sales_unit: product.sales_unit || null,
            final_price_per_unit: product.final_price_per_unit || 0,
            price_label: this._formatPriceLabel(
              product.sales_unit,
              product.final_price_per_unit
            ),
            main_image_url: product.main_image_url || null
          },
          product // foreign key resolution
        };
      });

    return {
      configuration,
      components
    };
  }

  // -------------------------
  // buildQuoteFromConfiguration(roofConfigurationId, selectedComponentIds)
  // -------------------------
  buildQuoteFromConfiguration(roofConfigurationId, selectedComponentIds) {
    const componentsAll = this._getFromStorage('roof_configuration_components');
    const products = this._getFromStorage('products');
    const selectedIds = Array.isArray(selectedComponentIds) ? selectedComponentIds : [];

    const quoteRequest = this._getOrCreateQuoteRequest(roofConfigurationId);
    const quoteRequestItems = this._getFromStorage('quote_request_items');

    // Remove existing items for this quote request
    const remainingItems = quoteRequestItems.filter(
      (i) => i.quote_request_id !== quoteRequest.id
    );

    const newItems = [];
    selectedIds.forEach((cid) => {
      const comp = componentsAll.find((c) => c.id === cid);
      if (!comp) return;
      const product = products.find((p) => p.id === comp.product_id) || {};
      const item = {
        id: this._generateId('quote_request_item'),
        quote_request_id: quoteRequest.id,
        product_id: comp.product_id,
        product_name_snapshot: product.name || null,
        quantity: comp.recommended_quantity || 0,
        component_role_snapshot: comp.component_role
      };
      newItems.push(item);
    });

    const updatedItems = remainingItems.concat(newItems);
    this._saveToStorage('quote_request_items', updatedItems);

    quoteRequest.status = 'draft';
    const quoteRequests = this._getFromStorage('quote_requests').map((qr) =>
      qr.id === quoteRequest.id ? quoteRequest : qr
    );
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      quote_request_id: quoteRequest.id,
      configuration_id: roofConfigurationId,
      items: newItems,
      status: quoteRequest.status
    };
  }

  // -------------------------
  // getQuoteRequestSummary(quoteRequestId)
  // -------------------------
  getQuoteRequestSummary(quoteRequestId) {
    const quoteRequests = this._getFromStorage('quote_requests');
    const quoteRequestItems = this._getFromStorage('quote_request_items');
    const roofConfigurations = this._getFromStorage('roof_configurations');
    const products = this._getFromStorage('products');

    const qr = quoteRequests.find((q) => q.id === quoteRequestId) || null;
    if (!qr) {
      return {
        quote_request: null,
        configuration: null,
        items: []
      };
    }

    const configuration = qr.roof_configuration_id
      ? roofConfigurations.find((c) => c.id === qr.roof_configuration_id) || null
      : null;

    const items = quoteRequestItems
      .filter((i) => i.quote_request_id === quoteRequestId)
      .map((i) => {
        const product = products.find((p) => p.id === i.product_id) || null;
        return {
          product_id: i.product_id,
          product_name: i.product_name_snapshot,
          component_role_snapshot: i.component_role_snapshot,
          quantity: i.quantity,
          product // foreign key resolution
        };
      });

    return {
      quote_request: qr,
      configuration,
      items
    };
  }

  // -------------------------
  // submitQuoteRequest(quoteRequestId, fullName, email, phone, projectPostalCode, customerType)
  // -------------------------
  submitQuoteRequest(quoteRequestId, fullName, email, phone, projectPostalCode, customerType) {
    const quoteRequests = this._getFromStorage('quote_requests');
    const idx = quoteRequests.findIndex((q) => q.id === quoteRequestId);
    if (idx < 0) {
      return {
        success: false,
        quote_request_id: null,
        status: 'draft',
        submitted_at: null,
        message: 'Quote request not found.'
      };
    }

    const qr = quoteRequests[idx];
    qr.full_name = fullName;
    qr.email = email;
    qr.phone = phone || null;
    qr.project_postal_code = projectPostalCode;
    qr.customer_type = customerType || null;
    qr.status = 'submitted';
    qr.submitted_at = this._nowIso();

    quoteRequests[idx] = qr;
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      quote_request_id: qr.id,
      status: qr.status,
      submitted_at: qr.submitted_at,
      message: 'Quote request submitted.'
    };
  }

  // -------------------------
  // submitContractorRegistration(...)
  // -------------------------
  submitContractorRegistration(
    businessName,
    contactName,
    businessEmail,
    phone,
    streetAddress,
    city,
    state,
    postalCode,
    businessType,
    password,
    newsletterOptIn,
    preferredContactMethod
  ) {
    const contractorRegistrations = this._getFromStorage('contractor_registrations');

    const record = {
      id: this._generateId('contractor_registration'),
      business_name: businessName,
      contact_name: contactName,
      business_email: businessEmail,
      phone,
      street_address: streetAddress,
      city,
      state,
      postal_code: postalCode,
      business_type: businessType,
      password_plaintext: password,
      newsletter_opt_in: !!newsletterOptIn,
      preferred_contact_method: preferredContactMethod,
      created_at: this._nowIso()
    };

    contractorRegistrations.push(record);
    this._saveToStorage('contractor_registrations', contractorRegistrations);

    return {
      success: true,
      contractor_registration_id: record.id,
      created_at: record.created_at,
      message: 'Contractor registration submitted.'
    };
  }

  // -------------------------
  // getAboutContent()
  // -------------------------
  getAboutContent() {
    const company_overview_html =
      '<p>We are a dedicated roofing tiles manufacturer specializing in high-performance clay and concrete tiles for diverse climates.</p>';
    const materials_focus_html =
      '<p>Our portfolio includes clay, concrete, composite, and metal tiles engineered for durability, aesthetics, and ease of installation.</p>';
    const climate_solutions_html =
      '<p>From coastal-marine to snowy mountain environments, our systems are tested to perform in demanding conditions.</p>';
    const sustainability_html =
      '<p>We prioritize sustainable sourcing, long lifespans, and recyclability to reduce the overall environmental footprint of our products.</p>';

    const key_links = [
      { label: 'Roof Tiles', target_type: 'category', target_identifier: 'roof_tiles' },
      { label: 'Clearance', target_type: 'category', target_identifier: 'clearance' },
      { label: 'Roof Configurator', target_type: 'tool', target_identifier: 'roof_configurator' },
      { label: 'Find an Installer', target_type: 'tool', target_identifier: 'find_installer' }
    ];

    return {
      company_overview_html,
      materials_focus_html,
      climate_solutions_html,
      sustainability_html,
      key_links
    };
  }

  // -------------------------
  // getContactInfo()
  // -------------------------
  getContactInfo() {
    const phone_numbers = [
      { label: 'Customer Service', number: '+1-800-000-0000' },
      { label: 'Technical Support', number: '+1-800-000-0001' }
    ];

    const email_addresses = [
      { label: 'General Inquiries', email: 'info@example-rooftiles.com' },
      { label: 'Technical Questions', email: 'tech@example-rooftiles.com' }
    ];

    const mailing_address = {
      line1: '100 Roofing Way',
      line2: '',
      city: 'Example City',
      state: 'CA',
      postal_code: '90000',
      country: 'USA'
    };

    const response_time_guidance =
      'We typically respond to inquiries within 1–2 business days.';

    return {
      phone_numbers,
      email_addresses,
      mailing_address,
      response_time_guidance
    };
  }

  // -------------------------
  // submitContactForm(fullName, email, phone, topic, message)
  // -------------------------
  submitContactForm(fullName, email, phone, topic, message) {
    const contactRequests = this._getFromStorage('contact_requests');

    const record = {
      id: this._generateId('contact_request'),
      full_name: fullName,
      email,
      phone: phone || null,
      topic: topic || null,
      message,
      created_at: this._nowIso()
    };

    contactRequests.push(record);
    this._saveToStorage('contact_requests', contactRequests);

    return {
      success: true,
      contact_request_id: record.id,
      message: 'Contact request submitted.'
    };
  }

  // -------------------------
  // getHelpFaqContent()
  // -------------------------
  getHelpFaqContent() {
    const sections = [
      {
        section_id: 'products',
        title: 'Products & Materials',
        topics: [
          {
            question: 'Which tile materials do you offer?',
            answer_html:
              '<p>We offer clay, concrete, composite, and metal tiles. Each material is engineered for specific performance and aesthetic needs.</p>',
            related_page_key: 'roof_tiles'
          },
          {
            question: 'How do I choose tiles for my climate?',
            answer_html:
              '<p>Use our climate filters in product listings or the Roof Configurator to select systems tested for your environment.</p>',
            related_page_key: 'roof_configurator'
          }
        ]
      },
      {
        section_id: 'orders',
        title: 'Orders & Samples',
        topics: [
          {
            question: 'Can I order color samples?',
            answer_html:
              '<p>Yes. Visit the Samples page to choose a tile series and request physical color samples shipped to you.</p>',
            related_page_key: 'samples'
          },
          {
            question: 'How do I request a roof system quote?',
            answer_html:
              '<p>Configure your roof with the Roof Configurator, then submit a quote request with your project details.</p>',
            related_page_key: 'roof_configurator'
          }
        ]
      },
      {
        section_id: 'installers',
        title: 'Installers & Support',
        topics: [
          {
            question: 'How can I find a certified installer?',
            answer_html:
              '<p>Use the Find an Installer tool to search for certified professionals near your location.</p>',
            related_page_key: 'find_installer'
          }
        ]
      }
    ];

    return { sections };
  }

  // -------------------------
  // getLegalAndPrivacyContent()
  // -------------------------
  getLegalAndPrivacyContent() {
    const terms_of_use_html =
      '<p>By using this site, you agree to our standard terms of use, including limitations of liability and appropriate use of tools and content.</p>';
    const privacy_policy_html =
      '<p>We respect your privacy and process personal data in accordance with applicable laws. We only store data necessary to provide our services.</p>';
    const cookie_policy_html =
      '<p>We use cookies to improve site performance and user experience. You may control cookies via your browser settings.</p>';
    const legal_contact_email = 'legal@example-rooftiles.com';

    return {
      terms_of_use_html,
      privacy_policy_html,
      cookie_policy_html,
      legal_contact_email
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