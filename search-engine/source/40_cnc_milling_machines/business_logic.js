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
    this.idCounter = this._getNextIdCounter();
  }

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    // Generic helpers for initialization
    const ensureArray = (key) => {
      if (localStorage.getItem(key) == null) {
        this._saveToStorage(key, []);
      }
    };

    const ensureNull = (key) => {
      if (localStorage.getItem(key) == null) {
        this._saveToStorage(key, null);
      }
    };

    // Legacy/example keys from scaffold (not used but kept for compatibility)
    ensureArray('users');
    ensureArray('products');
    ensureArray('carts');
    ensureArray('cartItems');

    // Domain-specific storage tables
    ensureArray('machine_models');
    ensureNull('cart'); // single cart object
    ensureArray('cart_items');
    ensureArray('configurable_machine_categories');
    ensureArray('config_option_groups');
    ensureArray('config_options');
    ensureArray('machine_configurations');
    ensureArray('quote_requests');
    ensureArray('spare_parts');
    ensureArray('training_courses');
    ensureArray('training_registrations');
    ensureArray('dealers');
    ensureArray('dealer_messages');
    ensureArray('documents');
    ensureArray('industries');
    ensureArray('case_studies');
    ensureArray('favorite_case_studies');
    ensureArray('maintenance_plans');
    ensureArray('maintenance_subscriptions');

    // Additional content/config keys (objects or arrays)
    if (localStorage.getItem('homepage_content') == null) {
      // leave unset or null-equivalent; don't pre-populate with mock data
      this._saveToStorage('homepage_content', null);
    }
    if (localStorage.getItem('about_page_content') == null) {
      this._saveToStorage('about_page_content', null);
    }
    if (localStorage.getItem('contact_page_content') == null) {
      this._saveToStorage('contact_page_content', null);
    }
    ensureArray('postal_geocodes');
    ensureArray('cart_follow_ups');
    ensureArray('contact_form_submissions');
    ensureArray('notifications');

    // ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw == null) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed === null && defaultValue !== undefined) {
        return defaultValue;
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

  // ---------------------- Internal Helpers ----------------------

  // Cart helpers
  _getOrCreateCart() {
    let cart = this._getFromStorage('cart', null);
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: this._generateId('cart'),
        items: [],
        createdAt: now,
        updatedAt: now
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _findProductForCartItem(cartItem) {
    if (!cartItem) return null;
    if (cartItem.itemType === 'machine_model') {
      const machines = this._getFromStorage('machine_models', []);
      return machines.find((m) => m.id === cartItem.productId) || null;
    }
    if (cartItem.itemType === 'spare_part') {
      const parts = this._getFromStorage('spare_parts', []);
      return parts.find((p) => p.id === cartItem.productId) || null;
    }
    return null;
  }

  _calculateCartTotals(cart) {
    if (!cart) {
      return {
        subtotal: 0,
        tax: 0,
        total: 0,
        currency: 'usd'
      };
    }
    const allItems = this._getFromStorage('cart_items', []);
    const items = allItems.filter((ci) => ci.cartId === cart.id);
    let subtotal = 0;
    let currency = null;

    for (const item of items) {
      const lineTotal = typeof item.lineTotal === 'number' ? item.lineTotal : (item.unitPrice || 0) * (item.quantity || 0);
      subtotal += lineTotal;
      if (!currency) {
        const product = this._findProductForCartItem(item);
        if (product && product.currency) {
          currency = product.currency;
        }
      }
    }

    if (!currency) {
      currency = 'usd';
    }

    const taxRate = 0; // can be adjusted if needed
    const tax = +(subtotal * taxRate).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    return { subtotal, tax, total, currency };
  }

  _updateCartItemInternal(cart, itemType, product, quantity, mode = 'add') {
    const allItems = this._getFromStorage('cart_items', []);
    const now = new Date().toISOString();
    let cartItem = allItems.find(
      (ci) => ci.cartId === cart.id && ci.itemType === itemType && ci.productId === product.id
    );

    if (mode === 'add') {
      if (cartItem) {
        cartItem.quantity += quantity;
        cartItem.lineTotal = +(cartItem.unitPrice * cartItem.quantity).toFixed(2);
      } else {
        cartItem = {
          id: this._generateId('cartitem'),
          cartId: cart.id,
          itemType: itemType,
          productId: product.id,
          name: product.name,
          unitPrice: product.price,
          quantity: quantity,
          lineTotal: +(product.price * quantity).toFixed(2),
          addedAt: now
        };
        allItems.push(cartItem);
        if (!Array.isArray(cart.items)) {
          cart.items = [];
        }
        cart.items.push(cartItem.id);
      }
    }

    cart.updatedAt = now;
    this._saveToStorage('cart_items', allItems);
    this._saveToStorage('cart', cart);

    return { cart, cartItems: allItems.filter((ci) => ci.cartId === cart.id) };
  }

  // Configuration helpers
  _calculateConfigurationPriceInternal(categoryId, selectedOptionIds) {
    const categories = this._getFromStorage('configurable_machine_categories', []);
    const options = this._getFromStorage('config_options', []);
    const category = categories.find((c) => c.id === categoryId) || null;
    const selectedOptions = options.filter((opt) => selectedOptionIds.includes(opt.id));

    const basePrice = category ? category.basePrice : 0;
    const currency = category ? category.currency : 'usd';
    const delta = selectedOptions.reduce((sum, opt) => sum + (opt.priceDelta || 0), 0);
    const totalPrice = basePrice + delta;

    // Attach group objects for FK resolution
    const groups = this._getFromStorage('config_option_groups', []);
    const selectedOptionsWithGroups = selectedOptions.map((opt) => ({
      ...opt,
      group: groups.find((g) => g.id === opt.groupId) || null
    }));

    return { basePrice, totalPrice, currency, selectedOptions: selectedOptionsWithGroups };
  }

  _createMachineConfigurationAndQuote(categoryId, selectedOptionIds, name, email, company, phone, comments) {
    const { basePrice, totalPrice, currency, selectedOptions } = this._calculateConfigurationPriceInternal(
      categoryId,
      selectedOptionIds
    );

    const now = new Date().toISOString();
    const configurations = this._getFromStorage('machine_configurations', []);
    const quotes = this._getFromStorage('quote_requests', []);
    const categories = this._getFromStorage('configurable_machine_categories', []);
    const category = categories.find((c) => c.id === categoryId) || null;

    const configuration = {
      id: this._generateId('config'),
      categoryId: categoryId,
      selectedOptionIds: selectedOptionIds.slice(),
      basePrice,
      totalPrice,
      currency,
      createdAt: now,
      notes: comments || ''
    };
    configurations.push(configuration);
    this._saveToStorage('machine_configurations', configurations);

    const quoteRequest = {
      id: this._generateId('quote'),
      configurationId: configuration.id,
      name,
      email,
      company: company || '',
      phone: phone || '',
      comments: comments || '',
      createdAt: now,
      status: 'submitted'
    };
    quotes.push(quoteRequest);
    this._saveToStorage('quote_requests', quotes);

    // Optional notification
    this._sendEmailOrNotification({
      type: 'configured_machine_quote',
      quoteRequest,
      configuration
    });

    // FK resolution for return objects
    const configurationResolved = {
      ...configuration,
      category: category,
      selectedOptions: selectedOptions
    };

    const quoteResolved = {
      ...quoteRequest,
      configuration: configurationResolved
    };

    return { configuration: configurationResolved, quoteRequest: quoteResolved };
  }

  // Geocoding & distance helpers
  _geocodePostalCode(postalCode) {
    const geocodes = this._getFromStorage('postal_geocodes', []);
    const entry = geocodes.find((g) => g.postalCode === postalCode);
    if (entry) {
      return { latitude: entry.latitude, longitude: entry.longitude };
    }

    // Fallback: derive coordinates from existing dealers with the same postal code
    const dealers = this._getFromStorage('dealers', []);
    const matches = dealers.filter(
      (d) =>
        d.postalCode === postalCode &&
        typeof d.latitude === 'number' &&
        typeof d.longitude === 'number'
    );

    if (matches.length === 0) return null;

    const avgLat = matches.reduce((sum, d) => sum + d.latitude, 0) / matches.length;
    const avgLon = matches.reduce((sum, d) => sum + d.longitude, 0) / matches.length;

    return { latitude: avgLat, longitude: avgLon };
  }

  _computeDealerDistances(userLocation, dealers) {
    if (!userLocation) {
      return dealers.map((d) => ({ dealer: d, distanceKm: null }));
    }
    const { latitude: lat1, longitude: lon1 } = userLocation;

    const toRad = (deg) => (deg * Math.PI) / 180;

    const haversine = (aLat, aLon, bLat, bLon) => {
      const R = 6371; // km
      const dLat = toRad(bLat - aLat);
      const dLon = toRad(bLon - aLon);
      const rLat1 = toRad(aLat);
      const rLat2 = toRad(bLat);
      const aa = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);
      const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
      return R * c;
    };

    return dealers.map((d) => {
      if (typeof d.latitude !== 'number' || typeof d.longitude !== 'number') {
        return { dealer: d, distanceKm: null };
      }
      const distanceKm = haversine(lat1, lon1, d.latitude, d.longitude);
      return { dealer: d, distanceKm };
    });
  }

  // Case study favorites helper
  _persistCaseStudyFavorites(updateFn) {
    const favorites = this._getFromStorage('favorite_case_studies', []);
    const updated = updateFn(favorites.slice());
    this._saveToStorage('favorite_case_studies', updated);
    return updated;
  }

  // Notification helper – store metadata only
  _sendEmailOrNotification(payload) {
    const notifications = this._getFromStorage('notifications', []);
    const record = {
      id: this._generateId('notif'),
      payload,
      createdAt: new Date().toISOString()
    };
    notifications.push(record);
    this._saveToStorage('notifications', notifications);
  }

  // ---------------------- Core Interface Implementations ----------------------

  // getHomepageContent()
  getHomepageContent() {
    const stored = this._getFromStorage('homepage_content', null);
    const machineModels = this._getFromStorage('machine_models', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const industries = this._getFromStorage('industries', []);

    let featuredMachineModels = [];
    let featuredCaseStudies = [];
    let promotions = [];
    let primaryCtas = [];

    if (stored) {
      featuredMachineModels = (stored.featuredMachineModels || []).map((fm) => {
        const full = machineModels.find((m) => m.id === fm.id) || fm;
        return full;
      });
      featuredCaseStudies = (stored.featuredCaseStudies || []).map((fc) => {
        const full = caseStudies.find((c) => c.id === fc.id) || fc;
        const industry = industries.find((i) => i.id === full.industryId) || null;
        return { ...full, industry };
      });
      promotions = stored.promotions || [];
      primaryCtas = stored.primaryCtas || [];
    } else {
      // Derive basic defaults from existing data (no mock domain content)
      featuredMachineModels = machineModels.slice(0, 3);
      const sortedCS = caseStudies
        .slice()
        .sort((a, b) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime());
      featuredCaseStudies = sortedCS.slice(0, 3).map((cs) => ({
        ...cs,
        industry: industries.find((i) => i.id === cs.industryId) || null
      }));
      promotions = [];
      primaryCtas = [];
    }

    return {
      featuredMachineModels,
      featuredCaseStudies,
      promotions,
      primaryCtas
    };
  }

  // globalSearch(query, entityTypes)
  globalSearch(query, entityTypes) {
    const q = (query || '').trim().toLowerCase();
    const types = Array.isArray(entityTypes) ? entityTypes : null;

    if (!q) {
      return {
        machineModels: [],
        spareParts: [],
        documents: [],
        caseStudies: []
      };
    }

    const includeType = (t) => !types || types.includes(t);

    const machineModelsAll = this._getFromStorage('machine_models', []);
    const sparePartsAll = this._getFromStorage('spare_parts', []);
    const documentsAll = this._getFromStorage('documents', []);
    const caseStudiesAll = this._getFromStorage('case_studies', []);
    const industries = this._getFromStorage('industries', []);

    const machineModels = includeType('machine_model')
      ? machineModelsAll.filter((m) => {
          const haystack = ((m.name || '') + ' ' + (m.description || '')).toLowerCase();
          return haystack.includes(q);
        })
      : [];

    const spareParts = includeType('spare_part')
      ? sparePartsAll.filter((p) => {
          const haystack = ((p.name || '') + ' ' + (p.description || '')).toLowerCase();
          return haystack.includes(q);
        }).map((p) => {
          const machineModel = machineModelsAll.find((m) => m.id === p.machineModelId) || null;
          return { ...p, machineModel };
        })
      : [];

    const documents = includeType('document')
      ? documentsAll.filter((d) => {
          const haystack = (d.title || '').toLowerCase();
          return haystack.includes(q);
        }).map((d) => {
          const machineModel = machineModelsAll.find((m) => m.id === d.machineModelId) || null;
          return { ...d, machineModel };
        })
      : [];

    const caseStudies = includeType('case_study')
      ? caseStudiesAll
          .filter((c) => {
            const haystack = ((c.title || '') + ' ' + (c.summary || '')).toLowerCase();
            return haystack.includes(q);
          })
          .map((c) => ({
            ...c,
            industry: industries.find((i) => i.id === c.industryId) || null
          }))
      : [];

    return { machineModels, spareParts, documents, caseStudies };
  }

  // getProductCategories()
  getProductCategories() {
    const models = this._getFromStorage('machine_models', []);
    const categoriesSet = new Set(models.map((m) => m.productCategory).filter(Boolean));

    if (categoriesSet.size === 0) {
      // Fallback to known enum values
      ['cnc_milling_machines', 'vertical_machining_centers', 'other'].forEach((c) =>
        categoriesSet.add(c)
      );
    }

    const labelMap = {
      cnc_milling_machines: 'CNC Milling Machines',
      vertical_machining_centers: 'Vertical Machining Centers',
      other: 'Other'
    };

    return Array.from(categoriesSet).map((id) => ({
      id,
      name: labelMap[id] || id,
      description: ''
    }));
  }

  // getMachineListingFilters(productCategory)
  getMachineListingFilters(productCategory) {
    const models = this._getFromStorage('machine_models', []);
    const filtered = productCategory
      ? models.filter((m) => m.productCategory === productCategory)
      : models;

    const machineTypesSet = new Set(filtered.map((m) => m.machineType).filter(Boolean));

    let minPrice = null;
    let maxPrice = null;
    let minX = null;
    let maxX = null;
    let minY = null;
    let maxY = null;
    let currency = 'usd';

    for (const m of filtered) {
      if (typeof m.price === 'number') {
        if (minPrice === null || m.price < minPrice) minPrice = m.price;
        if (maxPrice === null || m.price > maxPrice) maxPrice = m.price;
      }
      if (typeof m.tableSizeXmm === 'number') {
        if (minX === null || m.tableSizeXmm < minX) minX = m.tableSizeXmm;
        if (maxX === null || m.tableSizeXmm > maxX) maxX = m.tableSizeXmm;
      }
      if (typeof m.tableSizeYmm === 'number') {
        if (minY === null || m.tableSizeYmm < minY) minY = m.tableSizeYmm;
        if (maxY === null || m.tableSizeYmm > maxY) maxY = m.tableSizeYmm;
      }
      if (m.currency) {
        currency = m.currency;
      }
    }

    const machineTypes = Array.from(machineTypesSet).map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    const priceRange = { min: minPrice || 0, max: maxPrice || 0, currency };
    const tableSizeXRange = { min: minX || 0, max: maxX || 0, unit: 'mm' };
    const tableSizeYRange = { min: minY || 0, max: maxY || 0, unit: 'mm' };

    const ratingOptions = [1, 2, 3, 4].map((minRating) => ({
      minRating,
      label: `${minRating} stars & up`
    }));

    const sortOptions = [
      { value: 'spindle_power_desc', label: 'Spindle Power - High to Low' },
      { value: 'price_asc', label: 'Price - Low to High' },
      { value: 'price_desc', label: 'Price - High to Low' },
      { value: 'rating_desc', label: 'Customer Rating - High to Low' }
    ];

    return {
      machineTypes,
      priceRange,
      tableSizeXRange,
      tableSizeYRange,
      ratingOptions,
      sortOptions
    };
  }

  // listMachineModels(filters, sortBy, page, pageSize)
  listMachineModels(filters, sortBy, page = 1, pageSize = 20) {
    const all = this._getFromStorage('machine_models', []);
    const f = filters || {};

    let items = all.filter((m) => {
      if (f.productCategory && m.productCategory !== f.productCategory) return false;
      if (f.machineType && m.machineType !== f.machineType) return false;
      if (typeof f.minPrice === 'number' && !(typeof m.price === 'number' && m.price >= f.minPrice)) return false;
      if (typeof f.maxPrice === 'number' && !(typeof m.price === 'number' && m.price <= f.maxPrice)) return false;
      if (
        typeof f.minTableSizeXmm === 'number' &&
        !(typeof m.tableSizeXmm === 'number' && m.tableSizeXmm >= f.minTableSizeXmm)
      )
        return false;
      if (
        typeof f.minTableSizeYmm === 'number' &&
        !(typeof m.tableSizeYmm === 'number' && m.tableSizeYmm >= f.minTableSizeYmm)
      )
        return false;
      if (
        typeof f.minAverageRating === 'number' &&
        !(typeof m.averageRating === 'number' && m.averageRating >= f.minAverageRating)
      )
        return false;
      if (
        typeof f.minSpindlePowerKw === 'number' &&
        !(typeof m.spindlePowerKw === 'number' && m.spindlePowerKw >= f.minSpindlePowerKw)
      )
        return false;
      if (typeof f.axisCount === 'number' && m.axisCount !== f.axisCount) return false;
      if (f.availabilityStatus && m.availabilityStatus !== f.availabilityStatus) return false;
      return true;
    });

    if (sortBy === 'spindle_power_desc') {
      items.sort((a, b) => (b.spindlePowerKw || 0) - (a.spindlePowerKw || 0));
    } else if (sortBy === 'price_asc') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'rating_desc') {
      items.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    }

    const totalItems = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return {
      items: paged,
      page,
      pageSize,
      totalItems
    };
  }

  // getMachineModelDetails(machineModelId)
  getMachineModelDetails(machineModelId) {
    const machines = this._getFromStorage('machine_models', []);
    const documents = this._getFromStorage('documents', []);
    const spareParts = this._getFromStorage('spare_parts', []);

    const machine = machines.find((m) => m.id === machineModelId) || null;

    if (!machine) {
      return {
        machine: null,
        relatedDocuments: [],
        compatibleSpareParts: []
      };
    }

    const relatedDocumentsRaw = documents.filter((d) => {
      if (d.machineModelId === machine.id) return true;
      if (d.modelName && d.modelName === machine.name) return true;
      return false;
    });

    const relatedDocuments = relatedDocumentsRaw.map((d) => ({
      ...d,
      machineModel: machine
    }));

    const compatibleSparePartsRaw = spareParts.filter((p) => p.machineModelId === machine.id);
    const compatibleSpareParts = compatibleSparePartsRaw.map((p) => ({
      ...p,
      machineModel: machine
    }));

    return { machine, relatedDocuments, compatibleSpareParts };
  }

  // addItemToCart(itemType, productId, quantity)
  addItemToCart(itemType, productId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    let product = null;

    if (itemType === 'machine_model') {
      const machines = this._getFromStorage('machine_models', []);
      product = machines.find((m) => m.id === productId) || null;
    } else if (itemType === 'spare_part') {
      const parts = this._getFromStorage('spare_parts', []);
      product = parts.find((p) => p.id === productId) || null;
    }

    if (!product) {
      return {
        success: false,
        cartId: null,
        message: 'Product not found',
        cartItems: [],
        totals: { subtotal: 0, tax: 0, total: 0, currency: 'usd' }
      };
    }

    const cart = this._getOrCreateCart();
    const { cart: updatedCart, cartItems } = this._updateCartItemInternal(
      cart,
      itemType,
      product,
      qty,
      'add'
    );

    const totals = this._calculateCartTotals(updatedCart);

    // Resolve FK fields for cart items
    const resolvedItems = cartItems.map((ci) => ({
      ...ci,
      cart: updatedCart,
      product: this._findProductForCartItem(ci)
    }));

    return {
      success: true,
      cartId: updatedCart.id,
      message: 'Item added to cart',
      cartItems: resolvedItems,
      totals
    };
  }

  // getCartDetails()
  getCartDetails() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const items = allItems.filter((ci) => ci.cartId === cart.id);
    const totals = this._calculateCartTotals(cart);

    const resolvedItems = items.map((ci) => ({
      ...ci,
      cart,
      product: this._findProductForCartItem(ci)
    }));

    return {
      cart,
      items: resolvedItems,
      totals
    };
  }

  // updateCartItemQuantity(cartItemId, quantity)
  updateCartItemQuantity(cartItemId, quantity) {
    const allItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();
    const itemIndex = allItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);

    if (itemIndex === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart,
        items: [],
        totals: this._calculateCartTotals(cart)
      };
    }

    const now = new Date().toISOString();
    if (quantity <= 0) {
      // remove item
      const removed = allItems.splice(itemIndex, 1)[0];
      if (Array.isArray(cart.items)) {
        cart.items = cart.items.filter((id) => id !== removed.id);
      }
    } else {
      const item = allItems[itemIndex];
      item.quantity = quantity;
      item.lineTotal = +(item.unitPrice * quantity).toFixed(2);
    }

    cart.updatedAt = now;
    this._saveToStorage('cart_items', allItems);
    this._saveToStorage('cart', cart);

    const itemsForCart = allItems.filter((ci) => ci.cartId === cart.id);
    const totals = this._calculateCartTotals(cart);

    const resolvedItems = itemsForCart.map((ci) => ({
      ...ci,
      cart,
      product: this._findProductForCartItem(ci)
    }));

    return {
      success: true,
      message: 'Cart updated',
      cart,
      items: resolvedItems,
      totals
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    const allItems = this._getFromStorage('cart_items', []);
    const cart = this._getOrCreateCart();
    const index = allItems.findIndex((ci) => ci.id === cartItemId && ci.cartId === cart.id);

    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart,
        items: [],
        totals: this._calculateCartTotals(cart)
      };
    }

    const removed = allItems.splice(index, 1)[0];
    if (Array.isArray(cart.items)) {
      cart.items = cart.items.filter((id) => id !== removed.id);
    }
    cart.updatedAt = new Date().toISOString();

    this._saveToStorage('cart_items', allItems);
    this._saveToStorage('cart', cart);

    const itemsForCart = allItems.filter((ci) => ci.cartId === cart.id);
    const totals = this._calculateCartTotals(cart);
    const resolvedItems = itemsForCart.map((ci) => ({
      ...ci,
      cart,
      product: this._findProductForCartItem(ci)
    }));

    return {
      success: true,
      message: 'Cart item removed',
      cart,
      items: resolvedItems,
      totals
    };
  }

  // clearCart()
  clearCart() {
    const cart = this._getOrCreateCart();
    const allItems = this._getFromStorage('cart_items', []);
    const remaining = allItems.filter((ci) => ci.cartId !== cart.id);

    cart.items = [];
    cart.updatedAt = new Date().toISOString();

    this._saveToStorage('cart_items', remaining);
    this._saveToStorage('cart', cart);

    return {
      success: true,
      message: 'Cart cleared'
    };
  }

  // requestCartSalesFollowUp(name, email, company, phone, comments)
  requestCartSalesFollowUp(name, email, company, phone, comments) {
    const cartDetails = this.getCartDetails();
    const followUps = this._getFromStorage('cart_follow_ups', []);

    const record = {
      id: this._generateId('cartfollowup'),
      name,
      email,
      company: company || '',
      phone: phone || '',
      comments: comments || '',
      cartSnapshot: cartDetails,
      createdAt: new Date().toISOString()
    };

    followUps.push(record);
    this._saveToStorage('cart_follow_ups', followUps);

    this._sendEmailOrNotification({ type: 'cart_sales_follow_up', record });

    return {
      success: true,
      message: 'Sales follow-up request submitted'
    };
  }

  // getConfigurableMachineCategories()
  getConfigurableMachineCategories() {
    const categories = this._getFromStorage('configurable_machine_categories', []);
    return categories.filter((c) => c.status === 'active');
  }

  // getConfiguratorCategoryDetails(categoryId)
  getConfiguratorCategoryDetails(categoryId) {
    const categories = this._getFromStorage('configurable_machine_categories', []);
    const groups = this._getFromStorage('config_option_groups', []);
    const options = this._getFromStorage('config_options', []);

    const category = categories.find((c) => c.id === categoryId) || null;
    const optionGroups = groups
      .filter((g) => g.categoryId === categoryId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      .map((group) => {
        const groupOptions = options
          .filter((opt) => opt.groupId === group.id)
          .map((opt) => ({ ...opt, group }));
        return { group, options: groupOptions };
      });

    return { category, optionGroups };
  }

  // calculateConfigurationPrice(categoryId, selectedOptionIds)
  calculateConfigurationPrice(categoryId, selectedOptionIds) {
    const { basePrice, totalPrice, currency, selectedOptions } =
      this._calculateConfigurationPriceInternal(categoryId, selectedOptionIds || []);
    return { basePrice, totalPrice, currency, selectedOptions };
  }

  // submitConfiguredMachineQuote(categoryId, selectedOptionIds, name, email, company, phone, comments)
  submitConfiguredMachineQuote(
    categoryId,
    selectedOptionIds,
    name,
    email,
    company,
    phone,
    comments
  ) {
    const { configuration, quoteRequest } = this._createMachineConfigurationAndQuote(
      categoryId,
      selectedOptionIds || [],
      name,
      email,
      company,
      phone,
      comments
    );

    return {
      success: true,
      quoteRequest,
      configuration,
      message: 'Quote request submitted'
    };
  }

  // getSparePartsFilterOptions()
  getSparePartsFilterOptions() {
    const machines = this._getFromStorage('machine_models', []);
    const machineModels = machines.map((m) => ({ id: m.id, name: m.name }));

    const partCategories = [
      { value: 'spindle', label: 'Spindle' },
      { value: 'main_spindle', label: 'Main Spindle' },
      { value: 'tool_changer', label: 'Tool Changer' },
      { value: 'coolant_system', label: 'Coolant System' },
      { value: 'electronics', label: 'Electronics' },
      { value: 'other', label: 'Other' }
    ];

    const availabilityOptions = [
      { value: 'in_stock', label: 'In Stock' },
      { value: 'out_of_stock', label: 'Out of Stock' },
      { value: 'backorder', label: 'Backorder' },
      { value: 'discontinued', label: 'Discontinued' }
    ];

    const sortOptions = [
      { value: 'price_asc', label: 'Price - Low to High' },
      { value: 'price_desc', label: 'Price - High to Low' },
      { value: 'availability', label: 'Availability' }
    ];

    return {
      machineModels,
      partCategories,
      availabilityOptions,
      sortOptions
    };
  }

  // listSpareParts(filters, sortBy, page, pageSize)
  listSpareParts(filters, sortBy, page = 1, pageSize = 20) {
    const f = filters || {};
    const parts = this._getFromStorage('spare_parts', []);
    const machines = this._getFromStorage('machine_models', []);

    let items = parts.filter((p) => {
      if (f.machineModelId && p.machineModelId !== f.machineModelId) return false;
      if (
        typeof f.modelYear === 'number' &&
        !(Array.isArray(p.compatibleModelYears) && p.compatibleModelYears.includes(f.modelYear))
      )
        return false;
      if (f.partCategory && p.partCategory !== f.partCategory) return false;
      if (typeof f.isMainSpindle === 'boolean' && !!p.isMainSpindle !== f.isMainSpindle) return false;
      if (f.availabilityStatus && p.availabilityStatus !== f.availabilityStatus) return false;
      if (f.inStockOnly && p.availabilityStatus !== 'in_stock') return false;
      return true;
    });

    if (sortBy === 'price_asc') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'availability') {
      items.sort((a, b) => (a.availabilityStatus || '').localeCompare(b.availabilityStatus || ''));
    }

    const totalItems = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize).map((p) => ({
      ...p,
      machineModel: machines.find((m) => m.id === p.machineModelId) || null
    }));

    return {
      items: paged,
      page,
      pageSize,
      totalItems
    };
  }

  // getSparePartDetails(sparePartId)
  getSparePartDetails(sparePartId) {
    const parts = this._getFromStorage('spare_parts', []);
    const machines = this._getFromStorage('machine_models', []);
    const part = parts.find((p) => p.id === sparePartId) || null;

    if (!part) {
      return { part: null, machineModel: null };
    }

    const machineModel = machines.find((m) => m.id === part.machineModelId) || null;
    const partResolved = { ...part, machineModel };
    return { part: partResolved, machineModel };
  }

  // listTrainingCourses(filters, sortBy, page, pageSize)
  listTrainingCourses(filters, sortBy, page = 1, pageSize = 20) {
    const f = filters || {};
    const courses = this._getFromStorage('training_courses', []);

    let items = courses.filter((c) => {
      if (f.deliveryMethod && c.deliveryMethod !== f.deliveryMethod) return false;
      if (f.level && c.level !== f.level) return false;
      if (f.startDateFrom) {
        const from = new Date(f.startDateFrom + 'T00:00:00Z').getTime();
        if (new Date(c.startDate).getTime() < from) return false;
      }
      if (f.startDateTo) {
        const to = new Date(f.startDateTo + 'T23:59:59Z').getTime();
        if (new Date(c.startDate).getTime() > to) return false;
      }
      return true;
    });

    if (sortBy === 'start_date_asc') {
      items.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } else if (sortBy === 'start_date_desc') {
      items.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    } else if (sortBy === 'duration_asc') {
      items.sort((a, b) => (a.durationDays || 0) - (b.durationDays || 0));
    } else if (sortBy === 'price_asc') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    }

    const totalItems = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return {
      items: paged,
      page,
      pageSize,
      totalItems
    };
  }

  // getTrainingCourseDetails(courseId)
  getTrainingCourseDetails(courseId) {
    const courses = this._getFromStorage('training_courses', []);
    return courses.find((c) => c.id === courseId) || null;
  }

  // submitTrainingRegistration(courseId, fullName, email, company, phone, participantsCount)
  submitTrainingRegistration(courseId, fullName, email, company, phone, participantsCount) {
    const registrations = this._getFromStorage('training_registrations', []);
    const courses = this._getFromStorage('training_courses', []);
    const now = new Date().toISOString();

    const registration = {
      id: this._generateId('trainingreg'),
      courseId,
      fullName,
      email,
      company: company || '',
      phone: phone || '',
      participantsCount: typeof participantsCount === 'number' ? participantsCount : 1,
      createdAt: now,
      status: 'submitted'
    };

    registrations.push(registration);
    this._saveToStorage('training_registrations', registrations);

    const course = courses.find((c) => c.id === courseId) || null;
    const registrationResolved = { ...registration, course };

    this._sendEmailOrNotification({ type: 'training_registration', registration: registrationResolved });

    return {
      success: true,
      registration: registrationResolved,
      message: 'Training registration submitted'
    };
  }

  // searchDealers(postalCode, radiusKm, filters, sortBy)
  searchDealers(postalCode, radiusKm, filters, sortBy) {
    const dealersAll = this._getFromStorage('dealers', []);
    const f = filters || {};

    let dealers = dealersAll.filter((d) => {
      if (typeof f.isAuthorizedServiceCenter === 'boolean') {
        if (!!d.isAuthorizedServiceCenter !== f.isAuthorizedServiceCenter) return false;
      }
      if (f.dealerType && d.dealerType !== f.dealerType) return false;
      return true;
    });

    const userLocation = this._geocodePostalCode(postalCode);
    let dealerWithDistances = this._computeDealerDistances(userLocation, dealers);

    if (userLocation && typeof radiusKm === 'number') {
      dealerWithDistances = dealerWithDistances.filter((dd) => {
        if (dd.distanceKm == null) return false;
        return dd.distanceKm <= radiusKm;
      });
    }

    if (sortBy === 'distance_asc' && userLocation) {
      dealerWithDistances.sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0;
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else if (sortBy === 'name_asc') {
      dealerWithDistances.sort((a, b) => (a.dealer.name || '').localeCompare(b.dealer.name || ''));
    }

    return {
      dealers: dealerWithDistances
    };
  }

  // getDealerDetails(dealerId)
  getDealerDetails(dealerId) {
    const dealers = this._getFromStorage('dealers', []);
    return dealers.find((d) => d.id === dealerId) || null;
  }

  // sendDealerMessage(dealerId, name, email, message)
  sendDealerMessage(dealerId, name, email, message) {
    const dealerMessages = this._getFromStorage('dealer_messages', []);
    const dealers = this._getFromStorage('dealers', []);
    const now = new Date().toISOString();

    const dealerMessage = {
      id: this._generateId('dealermsg'),
      dealerId,
      name,
      email,
      message,
      createdAt: now,
      status: 'sent'
    };

    dealerMessages.push(dealerMessage);
    this._saveToStorage('dealer_messages', dealerMessages);

    const dealer = dealers.find((d) => d.id === dealerId) || null;
    const dealerMessageResolved = { ...dealerMessage, dealer };

    this._sendEmailOrNotification({ type: 'dealer_message', dealerMessage: dealerMessageResolved });

    return {
      success: true,
      dealerMessage: dealerMessageResolved,
      feedback: 'Message sent to dealer'
    };
  }

  // getDownloadFilterOptions()
  getDownloadFilterOptions() {
    const documents = this._getFromStorage('documents', []);
    const machines = this._getFromStorage('machine_models', []);

    const categoriesSet = new Set(documents.map((d) => d.productCategory).filter(Boolean));
    if (categoriesSet.size === 0) {
      ['vertical_machining_centers', 'cnc_milling_machines', 'other'].forEach((c) =>
        categoriesSet.add(c)
      );
    }

    const categoryLabelMap = {
      vertical_machining_centers: 'Vertical Machining Centers',
      cnc_milling_machines: 'CNC Milling Machines',
      other: 'Other'
    };

    const productCategories = Array.from(categoriesSet).map((value) => ({
      value,
      label: categoryLabelMap[value] || value
    }));

    const machineModels = machines;

    const documentTypes = [
      { value: 'user_manual', label: 'User Manual' },
      { value: 'safety_instructions', label: 'Safety Instructions' },
      { value: 'datasheet', label: 'Datasheet' },
      { value: 'brochure', label: 'Brochure' },
      { value: 'software', label: 'Software' }
    ];

    const languages = [
      { value: 'en', label: 'English' },
      { value: 'de', label: 'German' },
      { value: 'fr', label: 'French' },
      { value: 'es', label: 'Spanish' },
      { value: 'zh', label: 'Chinese' }
    ];

    return {
      productCategories,
      machineModels,
      documentTypes,
      languages
    };
  }

  // listDownloadableDocuments(filters, sortBy, page, pageSize)
  listDownloadableDocuments(filters, sortBy, page = 1, pageSize = 50) {
    const f = filters || {};
    const docs = this._getFromStorage('documents', []);
    const machines = this._getFromStorage('machine_models', []);

    let items = docs.filter((d) => {
      if (f.productCategory && d.productCategory !== f.productCategory) return false;
      if (f.documentType && d.documentType !== f.documentType) return false;
      if (f.language && d.language !== f.language) return false;

      if (f.machineModelId) {
        if (d.machineModelId === f.machineModelId) return true;
        const machine = machines.find((m) => m.id === f.machineModelId);
        if (machine && d.modelName && d.modelName === machine.name) return true;
        return false;
      }

      return true;
    });

    if (sortBy === 'published_desc') {
      items.sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
    } else if (sortBy === 'title_asc') {
      items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    const totalItems = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize).map((d) => ({
      ...d,
      machineModel: d.machineModelId
        ? machines.find((m) => m.id === d.machineModelId) || null
        : null
    }));

    return {
      items: paged,
      page,
      pageSize,
      totalItems
    };
  }

  // getIndustryOverview(industryId)
  getIndustryOverview(industryId) {
    const industries = this._getFromStorage('industries', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const machines = this._getFromStorage('machine_models', []);

    const industry = industries.find((i) => i.id === industryId) || null;

    const industryCaseStudiesRaw = caseStudies.filter((c) => c.industryId === industryId);
    const highlightedCaseStudies = industryCaseStudiesRaw
      .slice()
      .sort((a, b) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime())
      .map((c) => ({
        ...c,
        industry
      }));

    const machineIdSet = new Set();
    for (const cs of industryCaseStudiesRaw) {
      if (Array.isArray(cs.relatedMachineModelIds)) {
        cs.relatedMachineModelIds.forEach((id) => machineIdSet.add(id));
      }
    }

    const recommendedMachineModels = machines.filter((m) => machineIdSet.has(m.id));

    return {
      industry,
      recommendedMachineModels,
      highlightedCaseStudies
    };
  }

  // listIndustryCaseStudies(industryId, filters, sortBy, page, pageSize)
  listIndustryCaseStudies(industryId, filters, sortBy, page = 1, pageSize = 20) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const industries = this._getFromStorage('industries', []);
    const f = filters || {};

    let items = caseStudies.filter((c) => c.industryId === industryId);

    if (f.machineType) {
      items = items.filter((c) => c.machineType === f.machineType);
    }
    if (f.material) {
      items = items.filter((c) => c.material === f.material);
    }

    if (sortBy === 'date_desc') {
      items.sort((a, b) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime());
    } else if (sortBy === 'date_asc') {
      items.sort((a, b) => new Date(a.datePublished).getTime() - new Date(b.datePublished).getTime());
    }

    const totalItems = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize).map((c) => ({
      ...c,
      industry: industries.find((i) => i.id === c.industryId) || null
    }));

    return {
      items: paged,
      page,
      pageSize,
      totalItems
    };
  }

  // getCaseStudyDetails(caseStudyId)
  getCaseStudyDetails(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const industries = this._getFromStorage('industries', []);
    const cs = caseStudies.find((c) => c.id === caseStudyId) || null;
    if (!cs) return null;
    const industry = industries.find((i) => i.id === cs.industryId) || null;
    return { ...cs, industry };
  }

  // addCaseStudyToFavorites(caseStudyId)
  addCaseStudyToFavorites(caseStudyId) {
    const now = new Date().toISOString();

    const updated = this._persistCaseStudyFavorites((favorites) => {
      const existing = favorites.find((f) => f.caseStudyId === caseStudyId);
      if (existing) return favorites;
      favorites.push({
        id: this._generateId('favcs'),
        caseStudyId,
        addedAt: now
      });
      return favorites;
    });

    const favorite = updated.find((f) => f.caseStudyId === caseStudyId) || null;
    return {
      favorite,
      totalFavorites: updated.length
    };
  }

  // removeCaseStudyFromFavorites(caseStudyId)
  removeCaseStudyFromFavorites(caseStudyId) {
    const updated = this._persistCaseStudyFavorites((favorites) => {
      return favorites.filter((f) => f.caseStudyId !== caseStudyId);
    });

    return {
      success: true,
      totalFavorites: updated.length
    };
  }

  // getFavoriteCaseStudies()
  getFavoriteCaseStudies() {
    const favorites = this._getFromStorage('favorite_case_studies', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const industries = this._getFromStorage('industries', []);

    return favorites.map((fav) => {
      const cs = caseStudies.find((c) => c.id === fav.caseStudyId) || null;
      const csResolved = cs
        ? {
            ...cs,
            industry: industries.find((i) => i.id === cs.industryId) || null
          }
        : null;
      return {
        favorite: fav,
        caseStudy: csResolved
      };
    });
  }

  // listMaintenancePlans(filters, sortBy, page, pageSize)
  listMaintenancePlans(filters, sortBy, page = 1, pageSize = 20) {
    const plans = this._getFromStorage('maintenance_plans', []);
    const f = filters || {};

    let items = plans.filter((p) => {
      if (
        typeof f.includesAnnualOnSiteInspection === 'boolean' &&
        !!p.includesAnnualOnSiteInspection !== f.includesAnnualOnSiteInspection
      )
        return false;
      if (typeof f.maxMonthlyPrice === 'number' && p.monthlyPrice > f.maxMonthlyPrice) return false;
      if (f.coverageLevel && p.coverageLevel !== f.coverageLevel) return false;
      if (f.status && p.status !== f.status) return false;
      return true;
    });

    if (sortBy === 'price_asc') {
      items.sort((a, b) => (a.monthlyPrice || 0) - (b.monthlyPrice || 0));
    } else if (sortBy === 'price_desc') {
      items.sort((a, b) => (b.monthlyPrice || 0) - (a.monthlyPrice || 0));
    } else if (sortBy === 'coverage_level') {
      const order = { basic: 1, standard: 2, premium: 3 };
      items.sort((a, b) => (order[a.coverageLevel] || 0) - (order[b.coverageLevel] || 0));
    }

    const totalItems = items.length;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return {
      items: paged,
      page,
      pageSize,
      totalItems
    };
  }

  // getMaintenancePlanDetails(planId)
  getMaintenancePlanDetails(planId) {
    const plans = this._getFromStorage('maintenance_plans', []);
    return plans.find((p) => p.id === planId) || null;
  }

  // submitMaintenanceSubscriptionRequest(planId, name, email, company, phone, preferredStartDate)
  submitMaintenanceSubscriptionRequest(
    planId,
    name,
    email,
    company,
    phone,
    preferredStartDate
  ) {
    const subscriptions = this._getFromStorage('maintenance_subscriptions', []);
    const plans = this._getFromStorage('maintenance_plans', []);
    const now = new Date().toISOString();

    let preferredDateISO = null;
    if (preferredStartDate) {
      const d = new Date(preferredStartDate + 'T00:00:00Z');
      if (!isNaN(d.getTime())) {
        preferredDateISO = d.toISOString();
      }
    }

    const subscriptionRequest = {
      id: this._generateId('maintsub'),
      planId,
      name,
      email,
      company: company || '',
      phone: phone || '',
      preferredStartDate: preferredDateISO,
      createdAt: now,
      status: 'submitted'
    };

    subscriptions.push(subscriptionRequest);
    this._saveToStorage('maintenance_subscriptions', subscriptions);

    const plan = plans.find((p) => p.id === planId) || null;
    const subscriptionResolved = { ...subscriptionRequest, plan };

    this._sendEmailOrNotification({
      type: 'maintenance_subscription_request',
      subscriptionRequest: subscriptionResolved
    });

    return {
      subscriptionRequest: subscriptionResolved,
      success: true,
      message: 'Maintenance subscription request submitted'
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const stored = this._getFromStorage('about_page_content', null);
    if (!stored) {
      return {
        companyOverview: '',
        history: '',
        mission: '',
        locations: [],
        certifications: [],
        qualityStandards: '',
        leadership: []
      };
    }

    return {
      companyOverview: stored.companyOverview || '',
      history: stored.history || '',
      mission: stored.mission || '',
      locations: Array.isArray(stored.locations) ? stored.locations : [],
      certifications: Array.isArray(stored.certifications) ? stored.certifications : [],
      qualityStandards: stored.qualityStandards || '',
      leadership: Array.isArray(stored.leadership) ? stored.leadership : []
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    const stored = this._getFromStorage('contact_page_content', null);
    if (!stored) {
      return {
        headquartersAddress: '',
        phoneNumbers: [],
        emailAddresses: [],
        usageGuidance: ''
      };
    }

    return {
      headquartersAddress: stored.headquartersAddress || '',
      phoneNumbers: Array.isArray(stored.phoneNumbers) ? stored.phoneNumbers : [],
      emailAddresses: Array.isArray(stored.emailAddresses) ? stored.emailAddresses : [],
      usageGuidance: stored.usageGuidance || ''
    };
  }

  // submitContactForm(name, email, topic, phone, message, preferredContactMethod)
  submitContactForm(name, email, topic, phone, message, preferredContactMethod) {
    const submissions = this._getFromStorage('contact_form_submissions', []);
    const now = new Date().toISOString();

    const record = {
      id: this._generateId('contact'),
      name,
      email,
      topic: topic || '',
      phone: phone || '',
      message,
      preferredContactMethod: preferredContactMethod || '',
      createdAt: now
    };

    submissions.push(record);
    this._saveToStorage('contact_form_submissions', submissions);

    this._sendEmailOrNotification({ type: 'contact_form', record });

    return {
      success: true,
      feedback: 'Your message has been submitted'
    };
  }

  // ---------------------- Instrumentation Hooks (UI Event Handlers) ----------------------

  // onDocumentDownload(documentId)
  onDocumentDownload(documentId) {
    const documents = this._getFromStorage('documents', []);
    const machines = this._getFromStorage('machine_models', []);
    const doc = documents.find((d) => d.id === documentId) || null;

    // Instrumentation for task completion tracking
    try {
      if (!doc) {
        return;
      }

      const isEnglish = doc.language === 'en';
      const isUserManual = doc.documentType === 'user_manual';
      const isSafetyInstructions = doc.documentType === 'safety_instructions';

      const targetModelName = 'VMC 850';
      let isVmc850 = false;

      if (doc.machineModelId) {
        const machine = machines.find((m) => m.id === doc.machineModelId) || null;
        if (machine) {
          if (
            machine.name === targetModelName ||
            machine.modelName === targetModelName ||
            machine.modelNumber === targetModelName
          ) {
            isVmc850 = true;
          }
        }
      }

      if (!isVmc850) {
        if (
          doc.modelName === targetModelName ||
          doc.machineModelName === targetModelName
        ) {
          isVmc850 = true;
        }
      }

      if (isEnglish && isVmc850) {
        if (isUserManual) {
          localStorage.setItem('task6_userManualDownloaded', 'true');
        }
        if (isSafetyInstructions) {
          localStorage.setItem('task6_safetyInstructionsDownloaded', 'true');
        }
      }
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting functionality
    }
  }

  // onCopyCaseStudyLink(caseStudyId)
  onCopyCaseStudyLink(caseStudyId) {
    // Instrumentation for task completion tracking
    try {
      if (caseStudyId != null) {
        localStorage.setItem('task7_linkCopiedCaseStudyId', String(caseStudyId));
      }
    } catch (e) {
      // Swallow instrumentation errors to avoid impacting functionality
    }
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