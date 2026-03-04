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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    const tables = [
      'product_categories',
      'products',
      'quote_lists',
      'quote_list_items',
      'quote_requests',
      'projects',
      'project_items',
      'manual_documents',
      'service_requests',
      'distributors',
      'distributor_inquiries',
      'events',
      'demo_registrations',
      'financing_plan_definitions',
      'financing_inquiries',
      'newsletter_subscriptions'
    ];

    for (const key of tables) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('session_context')) {
      localStorage.setItem(
        'session_context',
        JSON.stringify({ quote_list_id: null, project_id: null })
      );
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue;
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

  // ---------------------- Session Helpers ----------------------

  _getCurrentSessionContext() {
    const raw = localStorage.getItem('session_context');
    if (!raw) {
      const ctx = { quote_list_id: null, project_id: null };
      localStorage.setItem('session_context', JSON.stringify(ctx));
      return ctx;
    }
    try {
      const ctx = JSON.parse(raw) || {};
      if (typeof ctx.quote_list_id === 'undefined') ctx.quote_list_id = null;
      if (typeof ctx.project_id === 'undefined') ctx.project_id = null;
      return ctx;
    } catch (e) {
      const ctx = { quote_list_id: null, project_id: null };
      localStorage.setItem('session_context', JSON.stringify(ctx));
      return ctx;
    }
  }

  _saveSessionContext(ctx) {
    localStorage.setItem('session_context', JSON.stringify(ctx));
  }

  // ---------------------- Quote Helpers ------------------------

  _getOrCreateQuoteList() {
    const now = new Date().toISOString();
    const ctx = this._getCurrentSessionContext();
    let quoteLists = this._getFromStorage('quote_lists');

    let quoteList = null;
    if (ctx.quote_list_id) {
      quoteList = quoteLists.find(q => q.id === ctx.quote_list_id);
      if (quoteList && quoteList.status !== 'open') {
        quoteList = null;
      }
    }

    if (!quoteList) {
      // Try to find any open quote list (single-session context)
      quoteList = quoteLists.find(q => q.status === 'open') || null;
    }

    if (!quoteList) {
      quoteList = {
        id: this._generateId('quote'),
        status: 'open',
        total_estimated_value: 0,
        currency: 'usd',
        notes: null,
        created_at: now,
        updated_at: now
      };
      quoteLists.push(quoteList);
      this._saveToStorage('quote_lists', quoteLists);
    }

    if (ctx.quote_list_id !== quoteList.id) {
      ctx.quote_list_id = quoteList.id;
      this._saveSessionContext(ctx);
    }

    return quoteList;
  }

  _recalculateQuoteListTotals(quoteListId) {
    const quoteLists = this._getFromStorage('quote_lists');
    const items = this._getFromStorage('quote_list_items');
    const quoteList = quoteLists.find(q => q.id === quoteListId);
    if (!quoteList) return;

    const relatedItems = items.filter(i => i.quote_list_id === quoteListId);
    let total = 0;
    for (const item of relatedItems) {
      if (typeof item.unit_price === 'number' && typeof item.quantity === 'number') {
        total += item.unit_price * item.quantity;
      }
    }
    quoteList.total_estimated_value = total;
    quoteList.updated_at = new Date().toISOString();
    this._saveToStorage('quote_lists', quoteLists);
  }

  // ---------------------- Project Helpers ----------------------

  _getOrCreateProject() {
    const now = new Date().toISOString();
    const ctx = this._getCurrentSessionContext();
    let projects = this._getFromStorage('projects');

    let project = null;
    if (ctx.project_id) {
      project = projects.find(p => p.id === ctx.project_id) || null;
    }

    if (!project) {
      // Try any draft project
      project = projects.find(p => p.status === 'draft') || null;
    }

    if (!project) {
      project = {
        id: this._generateId('project'),
        project_name: null,
        venue_name: null,
        venue_type: null,
        notes: null,
        total_machines: 0,
        total_estimated_width_cm: 0,
        status: 'draft',
        created_at: now,
        updated_at: now
      };
      projects.push(project);
      this._saveToStorage('projects', projects);
    }

    if (ctx.project_id !== project.id) {
      ctx.project_id = project.id;
      this._saveSessionContext(ctx);
    }

    return project;
  }

  _recalculateProjectTotals(projectId) {
    const projects = this._getFromStorage('projects');
    const items = this._getFromStorage('project_items');
    const products = this._getFromStorage('products');

    const project = projects.find(p => p.id === projectId);
    if (!project) return;

    const relatedItems = items.filter(i => i.project_id === projectId);
    let totalMachines = 0;
    let totalWidth = 0;

    for (const item of relatedItems) {
      const qty = typeof item.quantity === 'number' ? item.quantity : 0;
      totalMachines += qty;
      const product = products.find(p => p.id === item.product_id);
      if (product && typeof product.width_cm === 'number') {
        totalWidth += product.width_cm * qty;
      }
    }

    project.total_machines = totalMachines;
    project.total_estimated_width_cm = totalWidth;
    project.updated_at = new Date().toISOString();

    this._saveToStorage('projects', projects);
  }

  // ---------------------- Financing Helpers --------------------

  _calculateMonthlyPaymentInternal(price, termMonths, interestRateAnnualPercent) {
    const principal = Number(price) || 0;
    const n = Number(termMonths) || 0;
    const annualRate = Number(interestRateAnnualPercent) || 0;
    if (!principal || !n) return 0;
    const r = annualRate / 100 / 12;
    let payment;
    if (!r) {
      payment = principal / n;
    } else {
      payment = (principal * r) / (1 - Math.pow(1 + r, -n));
    }
    return Math.round(payment * 100) / 100;
  }

  // ---------------------- Service Helpers ----------------------

  _validatePreferredServiceDatetime(preferredDateTime) {
    const dt = new Date(preferredDateTime);
    if (isNaN(dt.getTime())) {
      return { isValid: false, message: 'Invalid date/time format.' };
    }
    const now = new Date();
    if (dt.getTime() <= now.getTime()) {
      return { isValid: false, message: 'Preferred date/time must be in the future.' };
    }
    const hour = dt.getHours();
    // Allow between 08:00 and 18:00 inclusive
    if (hour < 8 || hour > 18) {
      return {
        isValid: false,
        message: 'Preferred time must be within supported hours (08:00-18:00).'
      };
    }
    return { isValid: true, message: 'OK' };
  }

  // ---------------------- Utility Helpers ----------------------

  _parseISODateOnly(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  _formatTimeLabel(time24) {
    // time24: 'HH:mm'
    const [hStr, mStr] = time24.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10) || 0;
    const suffix = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return h + ':' + (m < 10 ? '0' + m : m) + ' ' + suffix;
  }

  _getEnumLabel(map, value) {
    return map[value] || value;
  }

  // ---------------------- Home / Category Interfaces -----------

  getHomeFeaturedCategories() {
    const categories = this._getFromStorage('product_categories');
    const products = this._getFromStorage('products');

    const countsByCode = {};
    for (const p of products) {
      if (!p.category_code) continue;
      countsByCode[p.category_code] = (countsByCode[p.category_code] || 0) + 1;
    }

    const result = categories
      .filter(c => c.is_active !== false)
      .map(c => ({
        category_id: c.id,
        name: c.name,
        code: c.code,
        description: c.description || '',
        sort_order: typeof c.sort_order === 'number' ? c.sort_order : 0,
        is_active: c.is_active !== false,
        product_count: countsByCode[c.code] || 0,
        featured_image_url: ''
      }))
      .sort((a, b) => a.sort_order - b.sort_order);

    return result;
  }

  getHomeFeaturedProducts() {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    const categoryByCode = {};
    for (const c of categories) {
      categoryByCode[c.code] = c;
    }

    const active = products.filter(p => p.status === 'active');
    // Sort by created_at desc if available
    active.sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });

    const maxItems = 12;
    const selected = active.slice(0, maxItems);

    return selected.map(p => ({
      product_id: p.id,
      name: p.name,
      model_code: p.model_code || null,
      category_code: p.category_code,
      category_name: categoryByCode[p.category_code]
        ? categoryByCode[p.category_code].name
        : '',
      short_description: p.short_description || '',
      price: typeof p.price === 'number' ? p.price : null,
      price_currency: p.price_currency || null,
      thumbnail_image_url: p.thumbnail_image_url || '',
      status: p.status,
      is_available_for_quote: !!p.is_available_for_quote,
      is_available_for_project: !!p.is_available_for_project,
      highlight_badge: ''
    }));
  }

  getHomeUpcomingEventsHighlight() {
    const events = this._getFromStorage('events');
    const upcoming = events.filter(e => e.status === 'upcoming');

    upcoming.sort((a, b) => {
      const da = a.start_date ? new Date(a.start_date).getTime() : 0;
      const db = b.start_date ? new Date(b.start_date).getTime() : 0;
      return da - db;
    });

    if (!upcoming.length) {
      return { primary_event: null, secondary_events: [] };
    }

    let primary = upcoming.find(e => e.has_on_site_demos) || upcoming[0];
    const secondary = upcoming.filter(e => e.id !== primary.id).map(e => ({
      event_id: e.id,
      title: e.title,
      event_type: e.event_type,
      status: e.status,
      start_date: e.start_date,
      end_date: e.end_date,
      city: e.city || '',
      country: e.country || '',
      has_on_site_demos: !!e.has_on_site_demos
    }));

    const desc = primary.description || '';
    const excerpt = desc.length > 200 ? desc.slice(0, 197) + '...' : desc;

    return {
      primary_event: {
        event_id: primary.id,
        title: primary.title,
        event_type: primary.event_type,
        status: primary.status,
        start_date: primary.start_date,
        end_date: primary.end_date,
        city: primary.city || '',
        country: primary.country || '',
        has_on_site_demos: !!primary.has_on_site_demos,
        booth_number: primary.booth_number || '',
        description_excerpt: excerpt
      },
      secondary_events: secondary
    };
  }

  getHomeFinancingHighlight() {
    const plans = this._getFromStorage('financing_plan_definitions');
    const activePlans = plans.filter(p => p.is_active !== false);

    // Sort by display_order then term
    activePlans.sort((a, b) => {
      const ao = typeof a.display_order === 'number' ? a.display_order : 0;
      const bo = typeof b.display_order === 'number' ? b.display_order : 0;
      if (ao !== bo) return ao - bo;
      return a.term_months - b.term_months;
    });

    const featured = activePlans.slice(0, 3).map(p => ({
      plan_id: p.id,
      name: p.name,
      term_months: p.term_months,
      interest_rate_annual_percent: p.interest_rate_annual_percent,
      currency: p.currency || 'usd',
      // foreign key resolution: include full plan object
      plan: p
    }));

    return {
      headline: 'Flexible financing for your amusement machines',
      subheadline: 'Spread your investment over time with competitive plans.',
      highlight_text:
        'Choose from multiple term lengths and match payments to your cash flow.',
      featured_plans: featured
    };
  }

  getCategoryDetails(categoryCode) {
    const categories = this._getFromStorage('product_categories');
    const cat = categories.find(c => c.code === categoryCode);
    if (!cat) {
      return { category_id: null, name: '', code: categoryCode, description: '' };
    }
    return {
      category_id: cat.id,
      name: cat.name,
      code: cat.code,
      description: cat.description || ''
    };
  }

  getProductFilterOptions(categoryCode) {
    const products = this._getFromStorage('products').filter(
      p => p.category_code === categoryCode
    );

    const playerSet = new Set();
    const powerSet = new Set();
    const widths = [];
    const prices = [];
    let currency = 'usd';

    for (const p of products) {
      if (typeof p.players === 'number') playerSet.add(p.players);
      if (p.power_voltage) powerSet.add(p.power_voltage);
      if (typeof p.width_cm === 'number') widths.push(p.width_cm);
      if (typeof p.price === 'number') {
        prices.push(p.price);
        if (p.price_currency) currency = p.price_currency;
      }
    }

    const player_counts = Array.from(playerSet).sort((a, b) => a - b);

    const voltageLabels = {
      v110: '110V',
      v220: '220V',
      dual_110_220: '110V / 220V',
      other: 'Other'
    };
    const power_voltages = Array.from(powerSet).map(v => ({
      value: v,
      label: this._getEnumLabel(voltageLabels, v)
    }));

    const width_cm = {
      min: widths.length ? Math.min.apply(null, widths) : 0,
      max: widths.length ? Math.max.apply(null, widths) : 0,
      step: 1
    };

    const price = {
      min: prices.length ? Math.min.apply(null, prices) : 0,
      max: prices.length ? Math.max.apply(null, prices) : 0,
      step: 100,
      currency: currency
    };

    const sort_options = [
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'name_asc', label: 'Name A-Z' }
    ];

    return { player_counts, power_voltages, width_cm, price, sort_options };
  }

  getCategoryProducts(categoryCode, filters, sort, page = 1, pageSize = 20) {
    filters = filters || {};
    const allProducts = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const categoryByCode = {};
    for (const c of categories) categoryByCode[c.code] = c;

    let products = allProducts.filter(p => p.category_code === categoryCode);

    if (typeof filters.players === 'number') {
      products = products.filter(p => p.players === filters.players);
    }

    if (filters.power_voltage) {
      products = products.filter(p => p.power_voltage === filters.power_voltage);
    }

    if (typeof filters.max_width_cm === 'number') {
      products = products.filter(
        p => typeof p.width_cm === 'number' && p.width_cm <= filters.max_width_cm
      );
    }

    if (typeof filters.min_price === 'number') {
      products = products.filter(
        p => typeof p.price === 'number' && p.price >= filters.min_price
      );
    }

    if (typeof filters.max_price === 'number') {
      products = products.filter(
        p => typeof p.price === 'number' && p.price <= filters.max_price
      );
    }

    if (sort === 'price_low_to_high') {
      products.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        return pa - pb;
      });
    } else if (sort === 'price_high_to_low') {
      products.sort((a, b) => {
        const pa = typeof a.price === 'number' ? a.price : 0;
        const pb = typeof b.price === 'number' ? b.price : 0;
        return pb - pa;
      });
    } else if (sort === 'newest_first') {
      products.sort((a, b) => {
        const da = a.created_at ? new Date(a.created_at).getTime() : 0;
        const db = b.created_at ? new Date(b.created_at).getTime() : 0;
        return db - da;
      });
    } else if (sort === 'name_asc') {
      products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    const total_count = products.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = products.slice(start, end).map(p => ({
      product_id: p.id,
      name: p.name,
      model_code: p.model_code || null,
      category_code: p.category_code,
      category_name: categoryByCode[p.category_code]
        ? categoryByCode[p.category_code].name
        : '',
      short_description: p.short_description || '',
      players: typeof p.players === 'number' ? p.players : null,
      price: typeof p.price === 'number' ? p.price : null,
      price_currency: p.price_currency || null,
      width_cm: typeof p.width_cm === 'number' ? p.width_cm : null,
      power_voltage: p.power_voltage || null,
      status: p.status,
      is_available_for_quote: !!p.is_available_for_quote,
      is_available_for_project: !!p.is_available_for_project,
      thumbnail_image_url: p.thumbnail_image_url || ''
    }));

    return {
      page,
      page_size: pageSize,
      total_count,
      items: pageItems
    };
  }

  getProductDetails(productId) {
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');
    const manuals = this._getFromStorage('manual_documents');

    const product = products.find(p => p.id === productId);
    if (!product) {
      return {
        product_id: null,
        name: '',
        model_code: null,
        category_code: null,
        category_name: '',
        short_description: '',
        description: '',
        players: null,
        price: null,
        price_currency: null,
        width_cm: null,
        height_cm: null,
        depth_cm: null,
        weight_kg: null,
        power_voltage: null,
        power_phase: null,
        power_consumption_watts: null,
        status: null,
        is_available_for_quote: false,
        is_available_for_project: false,
        thumbnail_image_url: '',
        gallery_image_urls: [],
        related_manuals: []
      };
    }

    const category = categories.find(c => c.code === product.category_code);

    const relatedManualsRaw = manuals.filter(
      m => m.product_id === productId && m.is_active !== false
    );
    relatedManualsRaw.sort((a, b) => {
      const da = a.published_at ? new Date(a.published_at).getTime() : 0;
      const db = b.published_at ? new Date(b.published_at).getTime() : 0;
      return db - da;
    });

    const related_manuals = relatedManualsRaw.map(m => ({
      manual_id: m.id,
      title: m.title,
      document_type: m.document_type,
      published_at: m.published_at
    }));

    return {
      product_id: product.id,
      name: product.name,
      model_code: product.model_code || null,
      category_code: product.category_code,
      category_name: category ? category.name : '',
      short_description: product.short_description || '',
      description: product.description || '',
      players: typeof product.players === 'number' ? product.players : null,
      price: typeof product.price === 'number' ? product.price : null,
      price_currency: product.price_currency || null,
      width_cm: typeof product.width_cm === 'number' ? product.width_cm : null,
      height_cm: typeof product.height_cm === 'number' ? product.height_cm : null,
      depth_cm: typeof product.depth_cm === 'number' ? product.depth_cm : null,
      weight_kg: typeof product.weight_kg === 'number' ? product.weight_kg : null,
      power_voltage: product.power_voltage || null,
      power_phase: product.power_phase || null,
      power_consumption_watts:
        typeof product.power_consumption_watts === 'number'
          ? product.power_consumption_watts
          : null,
      status: product.status,
      is_available_for_quote: !!product.is_available_for_quote,
      is_available_for_project: !!product.is_available_for_project,
      thumbnail_image_url: product.thumbnail_image_url || '',
      gallery_image_urls: Array.isArray(product.gallery_image_urls)
        ? product.gallery_image_urls
        : [],
      related_manuals
    };
  }

  getProductSupportResources(productId) {
    const manuals = this._getFromStorage('manual_documents');
    const filtered = manuals.filter(
      m => m.product_id === productId && m.is_active !== false
    );

    return filtered.map(m => ({
      manual_id: m.id,
      title: m.title,
      document_type: m.document_type,
      language: m.language || 'en',
      version: m.version || null,
      published_at: m.published_at,
      description: m.description || ''
    }));
  }

  // ---------------------- Quote List Interfaces ----------------

  addProductToQuoteList(productId, quantity = 1) {
    quantity = Number(quantity) || 1;
    if (quantity < 1) quantity = 1;

    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId);
    if (!product) {
      return {
        success: false,
        quote_list_id: null,
        message: 'Product not found.',
        total_items: 0,
        total_estimated_value: 0,
        currency: 'usd'
      };
    }

    if (!product.is_available_for_quote) {
      return {
        success: false,
        quote_list_id: null,
        message: 'Product is not available for quote.',
        total_items: 0,
        total_estimated_value: 0,
        currency: product.price_currency || 'usd'
      };
    }

    const quoteList = this._getOrCreateQuoteList();
    const quoteListId = quoteList.id;
    const now = new Date().toISOString();

    let items = this._getFromStorage('quote_list_items');
    let existing = items.find(
      i => i.quote_list_id === quoteListId && i.product_id === productId
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      existing = {
        id: this._generateId('quote_item'),
        quote_list_id: quoteListId,
        product_id: productId,
        quantity: quantity,
        unit_price: typeof product.price === 'number' ? product.price : null,
        currency: product.price_currency || quoteList.currency || 'usd',
        added_at: now
      };
      items.push(existing);
    }

    this._saveToStorage('quote_list_items', items);
    this._recalculateQuoteListTotals(quoteListId);

    // Re-load to get updated totals
    const quoteLists = this._getFromStorage('quote_lists');
    const updatedQuoteList = quoteLists.find(q => q.id === quoteListId) || quoteList;

    const totalItems = items
      .filter(i => i.quote_list_id === quoteListId)
      .reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);

    return {
      success: true,
      quote_list_id: quoteListId,
      message: 'Product added to quote list.',
      total_items: totalItems,
      total_estimated_value:
        typeof updatedQuoteList.total_estimated_value === 'number'
          ? updatedQuoteList.total_estimated_value
          : 0,
      currency: updatedQuoteList.currency || product.price_currency || 'usd'
    };
  }

  getQuoteListSummary() {
    const ctx = this._getCurrentSessionContext();
    const quoteLists = this._getFromStorage('quote_lists');
    const items = this._getFromStorage('quote_list_items');

    let quoteList = null;
    if (ctx.quote_list_id) {
      quoteList = quoteLists.find(q => q.id === ctx.quote_list_id) || null;
    }

    if (!quoteList) {
      return {
        has_open_quote_list: false,
        quote_list_id: null,
        total_items: 0,
        total_estimated_value: 0,
        currency: 'usd'
      };
    }

    const relatedItems = items.filter(i => i.quote_list_id === quoteList.id);
    const totalItems = relatedItems.reduce(
      (sum, i) => sum + (Number(i.quantity) || 0),
      0
    );

    const totalValue =
      typeof quoteList.total_estimated_value === 'number'
        ? quoteList.total_estimated_value
        : 0;

    return {
      has_open_quote_list: quoteList.status === 'open',
      quote_list_id: quoteList.id,
      total_items: totalItems,
      total_estimated_value: totalValue,
      currency: quoteList.currency || 'usd'
    };
  }

  getQuoteListDetails() {
    const ctx = this._getCurrentSessionContext();
    const quoteLists = this._getFromStorage('quote_lists');
    const items = this._getFromStorage('quote_list_items');
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    let quoteList = null;
    if (ctx.quote_list_id) {
      quoteList = quoteLists.find(q => q.id === ctx.quote_list_id) || null;
    }

    if (!quoteList) {
      return {
        quote_list_id: null,
        status: 'open',
        currency: 'usd',
        total_estimated_value: 0,
        items: []
      };
    }

    const categoryByCode = {};
    for (const c of categories) categoryByCode[c.code] = c;

    const relatedItems = items.filter(i => i.quote_list_id === quoteList.id);

    const detailedItems = relatedItems.map(i => {
      const product = products.find(p => p.id === i.product_id) || null;
      const categoryName =
        product && categoryByCode[product.category_code]
          ? categoryByCode[product.category_code].name
          : '';
      const unitPrice = typeof i.unit_price === 'number' ? i.unit_price : null;
      const qty = Number(i.quantity) || 0;
      const lineValue = unitPrice != null ? unitPrice * qty : null;
      return {
        quote_list_item_id: i.id,
        product_id: i.product_id,
        product_name: product ? product.name : '',
        model_code: product ? product.model_code || null : null,
        category_name: categoryName,
        thumbnail_image_url: product ? product.thumbnail_image_url || '' : '',
        quantity: qty,
        unit_price: unitPrice,
        currency: i.currency || quoteList.currency || 'usd',
        line_estimated_value: lineValue,
        // foreign key resolution
        product: product
      };
    });

    const totalValue =
      typeof quoteList.total_estimated_value === 'number'
        ? quoteList.total_estimated_value
        : 0;

    return {
      quote_list_id: quoteList.id,
      status: quoteList.status,
      currency: quoteList.currency || 'usd',
      total_estimated_value: totalValue,
      items: detailedItems
    };
  }

  updateQuoteListItem(quoteListItemId, quantity) {
    quantity = Number(quantity) || 0;

    let items = this._getFromStorage('quote_list_items');
    const quoteLists = this._getFromStorage('quote_lists');

    const item = items.find(i => i.id === quoteListItemId);
    if (!item) {
      return {
        success: false,
        message: 'Quote list item not found.',
        updated_item: null,
        total_estimated_value: 0
      };
    }

    item.quantity = quantity;
    this._saveToStorage('quote_list_items', items);

    this._recalculateQuoteListTotals(item.quote_list_id);

    const quoteList = quoteLists.find(q => q.id === item.quote_list_id) || null;
    const totalValue =
      quoteList && typeof quoteList.total_estimated_value === 'number'
        ? quoteList.total_estimated_value
        : 0;

    const lineValue =
      typeof item.unit_price === 'number' && typeof item.quantity === 'number'
        ? item.unit_price * item.quantity
        : 0;

    return {
      success: true,
      message: 'Quote list item updated.',
      updated_item: {
        quote_list_item_id: item.id,
        quantity: item.quantity,
        line_estimated_value: lineValue
      },
      total_estimated_value: totalValue
    };
  }

  removeQuoteListItem(quoteListItemId) {
    let items = this._getFromStorage('quote_list_items');
    const quoteLists = this._getFromStorage('quote_lists');

    const item = items.find(i => i.id === quoteListItemId);
    if (!item) {
      return {
        success: false,
        message: 'Quote list item not found.',
        total_items: 0,
        total_estimated_value: 0
      };
    }

    const quoteListId = item.quote_list_id;
    items = items.filter(i => i.id !== quoteListItemId);
    this._saveToStorage('quote_list_items', items);

    this._recalculateQuoteListTotals(quoteListId);

    const quoteList = quoteLists.find(q => q.id === quoteListId) || null;
    const relatedItems = items.filter(i => i.quote_list_id === quoteListId);
    const totalItems = relatedItems.reduce(
      (sum, i) => sum + (Number(i.quantity) || 0),
      0
    );
    const totalValue =
      quoteList && typeof quoteList.total_estimated_value === 'number'
        ? quoteList.total_estimated_value
        : 0;

    return {
      success: true,
      message: 'Quote list item removed.',
      total_items: totalItems,
      total_estimated_value: totalValue
    };
  }

  submitQuoteRequest(
    contactName,
    companyName,
    email,
    phone,
    projectNotes,
    consentToContact
  ) {
    const ctx = this._getCurrentSessionContext();
    const quoteLists = this._getFromStorage('quote_lists');
    const items = this._getFromStorage('quote_list_items');
    let quoteRequests = this._getFromStorage('quote_requests');

    if (!ctx.quote_list_id) {
      return {
        success: false,
        quote_request_id: null,
        status: 'pending',
        submitted_at: null,
        message: 'No quote list available to submit.'
      };
    }

    const quoteList = quoteLists.find(q => q.id === ctx.quote_list_id);
    if (!quoteList) {
      return {
        success: false,
        quote_request_id: null,
        status: 'pending',
        submitted_at: null,
        message: 'Quote list not found.'
      };
    }

    const relatedItems = items.filter(i => i.quote_list_id === quoteList.id);
    if (!relatedItems.length) {
      return {
        success: false,
        quote_request_id: null,
        status: 'pending',
        submitted_at: null,
        message: 'Quote list is empty.'
      };
    }

    const now = new Date().toISOString();
    const requestId = this._generateId('quote_req');
    const request = {
      id: requestId,
      quote_list_id: quoteList.id,
      contact_name: contactName,
      company_name: companyName || null,
      email: email,
      phone: phone || null,
      project_notes: projectNotes || null,
      submitted_at: now,
      status: 'pending',
      consent_to_contact: !!consentToContact
    };

    quoteRequests.push(request);
    this._saveToStorage('quote_requests', quoteRequests);

    quoteList.status = 'submitted';
    quoteList.updated_at = now;
    this._saveToStorage('quote_lists', quoteLists);

    return {
      success: true,
      quote_request_id: requestId,
      status: request.status,
      submitted_at: now,
      message: 'Quote request submitted.'
    };
  }

  // ---------------------- Project / Wish List Interfaces -------

  addProductToProject(productId, quantity = 1, notes) {
    quantity = Number(quantity) || 1;
    if (quantity < 1) quantity = 1;

    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId);
    if (!product) {
      return {
        success: false,
        project_id: null,
        status: 'draft',
        message: 'Product not found.',
        total_machines: 0,
        total_estimated_width_cm: 0
      };
    }

    if (!product.is_available_for_project) {
      return {
        success: false,
        project_id: null,
        status: 'draft',
        message: 'Product is not available for project.',
        total_machines: 0,
        total_estimated_width_cm: 0
      };
    }

    const project = this._getOrCreateProject();
    const projectId = project.id;
    const now = new Date().toISOString();

    let items = this._getFromStorage('project_items');
    let existing = items.find(
      i => i.project_id === projectId && i.product_id === productId
    );

    if (existing) {
      existing.quantity += quantity;
      if (typeof notes === 'string') existing.notes = notes;
    } else {
      existing = {
        id: this._generateId('project_item'),
        project_id: projectId,
        product_id: productId,
        quantity: quantity,
        notes: typeof notes === 'string' ? notes : null,
        added_at: now,
        sort_index: project.total_machines || 0
      };
      items.push(existing);
    }

    this._saveToStorage('project_items', items);
    this._recalculateProjectTotals(projectId);

    const projects = this._getFromStorage('projects');
    const updatedProject = projects.find(p => p.id === projectId) || project;

    return {
      success: true,
      project_id: projectId,
      status: updatedProject.status,
      message: 'Product added to project.',
      total_machines: updatedProject.total_machines || 0,
      total_estimated_width_cm: updatedProject.total_estimated_width_cm || 0
    };
  }

  getProjectSummary() {
    const ctx = this._getCurrentSessionContext();
    const projects = this._getFromStorage('projects');
    const items = this._getFromStorage('project_items');

    let project = null;
    if (ctx.project_id) {
      project = projects.find(p => p.id === ctx.project_id) || null;
    }

    if (!project) {
      return {
        has_project: false,
        project_id: null,
        total_machines: 0,
        total_estimated_width_cm: 0
      };
    }

    // Ensure totals
    const relatedItems = items.filter(i => i.project_id === project.id);
    const totalMachines = relatedItems.reduce(
      (sum, i) => sum + (Number(i.quantity) || 0),
      0
    );
    if (typeof project.total_machines !== 'number') {
      this._recalculateProjectTotals(project.id);
    }

    return {
      has_project: true,
      project_id: project.id,
      total_machines:
        typeof project.total_machines === 'number'
          ? project.total_machines
          : totalMachines,
      total_estimated_width_cm:
        typeof project.total_estimated_width_cm === 'number'
          ? project.total_estimated_width_cm
          : 0
    };
  }

  getCurrentProjectDetails() {
    const ctx = this._getCurrentSessionContext();
    const projects = this._getFromStorage('projects');
    const items = this._getFromStorage('project_items');
    const products = this._getFromStorage('products');
    const categories = this._getFromStorage('product_categories');

    let project = null;
    if (ctx.project_id) {
      project = projects.find(p => p.id === ctx.project_id) || null;
    }

    if (!project) {
      return {
        project_id: null,
        project_name: null,
        venue_name: null,
        venue_type: null,
        notes: null,
        status: 'draft',
        total_machines: 0,
        total_estimated_width_cm: 0,
        items: []
      };
    }

    const categoryByCode = {};
    for (const c of categories) categoryByCode[c.code] = c;

    const relatedItems = items.filter(i => i.project_id === project.id);
    relatedItems.sort((a, b) => {
      const ai = typeof a.sort_index === 'number' ? a.sort_index : 0;
      const bi = typeof b.sort_index === 'number' ? b.sort_index : 0;
      return ai - bi;
    });

    const detailedItems = relatedItems.map(i => {
      const product = products.find(p => p.id === i.product_id) || null;
      const categoryName =
        product && categoryByCode[product.category_code]
          ? categoryByCode[product.category_code].name
          : '';
      return {
        project_item_id: i.id,
        product_id: i.product_id,
        product_name: product ? product.name : '',
        model_code: product ? product.model_code || null : null,
        category_name: categoryName,
        quantity: Number(i.quantity) || 0,
        width_cm:
          product && typeof product.width_cm === 'number'
            ? product.width_cm
            : null,
        power_voltage: product ? product.power_voltage || null : null,
        thumbnail_image_url: product ? product.thumbnail_image_url || '' : '',
        notes: i.notes || null,
        // foreign key resolution
        product: product
      };
    });

    if (
      typeof project.total_machines !== 'number' ||
      typeof project.total_estimated_width_cm !== 'number'
    ) {
      this._recalculateProjectTotals(project.id);
    }

    return {
      project_id: project.id,
      project_name: project.project_name || null,
      venue_name: project.venue_name || null,
      venue_type: project.venue_type || null,
      notes: project.notes || null,
      status: project.status,
      total_machines: project.total_machines || 0,
      total_estimated_width_cm: project.total_estimated_width_cm || 0,
      items: detailedItems
    };
  }

  updateProjectItem(projectItemId, quantity, notes) {
    let items = this._getFromStorage('project_items');
    const item = items.find(i => i.id === projectItemId);
    if (!item) {
      return {
        success: false,
        message: 'Project item not found.',
        updated_item: null,
        total_machines: 0,
        total_estimated_width_cm: 0
      };
    }

    if (typeof quantity === 'number') {
      item.quantity = quantity;
    }
    if (typeof notes === 'string') {
      item.notes = notes;
    }

    this._saveToStorage('project_items', items);
    this._recalculateProjectTotals(item.project_id);

    const projects = this._getFromStorage('projects');
    const project = projects.find(p => p.id === item.project_id) || null;

    return {
      success: true,
      message: 'Project item updated.',
      updated_item: {
        project_item_id: item.id,
        quantity: item.quantity,
        notes: item.notes || null
      },
      total_machines: project ? project.total_machines || 0 : 0,
      total_estimated_width_cm: project
        ? project.total_estimated_width_cm || 0
        : 0
    };
  }

  removeProjectItem(projectItemId) {
    let items = this._getFromStorage('project_items');
    const item = items.find(i => i.id === projectItemId);
    if (!item) {
      return {
        success: false,
        message: 'Project item not found.',
        total_machines: 0,
        total_estimated_width_cm: 0
      };
    }

    const projectId = item.project_id;
    items = items.filter(i => i.id !== projectItemId);
    this._saveToStorage('project_items', items);

    this._recalculateProjectTotals(projectId);

    const projects = this._getFromStorage('projects');
    const project = projects.find(p => p.id === projectId) || null;

    return {
      success: true,
      message: 'Project item removed.',
      total_machines: project ? project.total_machines || 0 : 0,
      total_estimated_width_cm: project
        ? project.total_estimated_width_cm || 0
        : 0
    };
  }

  reorderProjectItems(itemOrder) {
    if (!Array.isArray(itemOrder)) {
      return { success: false, message: 'itemOrder must be an array.' };
    }

    let items = this._getFromStorage('project_items');
    const indexById = {};
    itemOrder.forEach((id, idx) => {
      indexById[id] = idx;
    });

    for (const item of items) {
      if (Object.prototype.hasOwnProperty.call(indexById, item.id)) {
        item.sort_index = indexById[item.id];
      }
    }

    this._saveToStorage('project_items', items);

    return { success: true, message: 'Project items reordered.' };
  }

  updateProjectMetadata(projectName, venueName, venueType, notes) {
    const ctx = this._getCurrentSessionContext();
    const projects = this._getFromStorage('projects');
    const now = new Date().toISOString();

    let project = null;
    if (ctx.project_id) {
      project = projects.find(p => p.id === ctx.project_id) || null;
    }

    if (!project) {
      project = this._getOrCreateProject();
    }

    if (typeof projectName === 'string') project.project_name = projectName;
    if (typeof venueName === 'string') project.venue_name = venueName;
    if (typeof venueType === 'string') project.venue_type = venueType;
    if (typeof notes === 'string') project.notes = notes;
    project.updated_at = now;

    this._saveToStorage('projects', projects);

    return {
      project_id: project.id,
      project_name: project.project_name || null,
      venue_name: project.venue_name || null,
      venue_type: project.venue_type || null,
      notes: project.notes || null,
      status: project.status
    };
  }

  saveCurrentProject() {
    const ctx = this._getCurrentSessionContext();
    const projects = this._getFromStorage('projects');
    const now = new Date().toISOString();

    let project = null;
    if (ctx.project_id) {
      project = projects.find(p => p.id === ctx.project_id) || null;
    }

    if (!project) {
      return {
        success: false,
        project_id: null,
        status: 'draft',
        created_at: null,
        message: 'No project to save.'
      };
    }

    project.status = 'saved';
    if (!project.created_at) project.created_at = now;
    project.updated_at = now;

    this._saveToStorage('projects', projects);

    return {
      success: true,
      project_id: project.id,
      status: project.status,
      created_at: project.created_at,
      message: 'Project saved.'
    };
  }

  // ---------------------- Support & Manuals Interfaces ---------

  getSupportOverview() {
    return {
      manuals_section: {
        title: 'Manuals & Downloads',
        description:
          'Access installation manuals, user guides, wiring diagrams, and software updates for all supported amusement machines.',
        primary_action_label: 'Browse manuals'
      },
      technical_support_section: {
        title: 'Technical Support',
        description:
          'Need help with troubleshooting, configuration, or spare parts? Contact our technical support team.',
        contact_email: 'support@example.com',
        contact_phone: '+1-000-000-0000'
      },
      service_request_section: {
        title: 'Service & On-site Maintenance',
        description:
          'Book on-site maintenance visits or request warranty repairs for your installed equipment.',
        primary_action_label: 'Request service'
      }
    };
  }

  getManualFilterOptions() {
    const manuals = this._getFromStorage('manual_documents');

    const yearsSet = new Set();
    for (const m of manuals) {
      if (!m.published_at) continue;
      const d = new Date(m.published_at);
      if (!isNaN(d.getTime())) yearsSet.add(d.getFullYear());
    }
    const years = Array.from(yearsSet).sort((a, b) => b - a);

    const document_types = [
      { value: 'installation_manual', label: 'Installation Manual' },
      { value: 'user_manual', label: 'User Manual' },
      { value: 'wiring_diagram', label: 'Wiring Diagram' },
      { value: 'parts_manual', label: 'Parts Manual' },
      { value: 'brochure', label: 'Brochure' },
      { value: 'software_update', label: 'Software Update' }
    ];

    const date_ranges = [
      { value: 'last_1_year', label: 'Last 12 months' },
      { value: 'last_2_years', label: 'Last 2 years' },
      { value: 'last_5_years', label: 'Last 5 years' }
    ];

    const sort_options = [
      { value: 'newest_first', label: 'Newest first' },
      { value: 'oldest_first', label: 'Oldest first' },
      { value: 'relevance', label: 'Relevance' }
    ];

    return { document_types, years, date_ranges, sort_options };
  }

  searchManuals(
    query,
    documentType,
    startYear,
    endYear,
    dateRange,
    sort,
    page = 1,
    pageSize = 20
  ) {
    const manuals = this._getFromStorage('manual_documents').filter(
      m => m.is_active !== false
    );
    const products = this._getFromStorage('products');

    let results = manuals.slice();

    if (query && typeof query === 'string') {
      const q = query.toLowerCase();
      results = results.filter(m => {
        const fields = [m.title, m.product_model_name, m.description];
        return fields.some(
          v => typeof v === 'string' && v.toLowerCase().indexOf(q) !== -1
        );
      });
    }

    if (documentType) {
      results = results.filter(m => m.document_type === documentType);
    }

    const now = new Date();
    let startYearFilter = typeof startYear === 'number' ? startYear : null;
    let endYearFilter = typeof endYear === 'number' ? endYear : null;

    if (dateRange) {
      const currentYear = now.getFullYear();
      if (dateRange === 'last_1_year') {
        startYearFilter = currentYear - 1;
        endYearFilter = currentYear;
      } else if (dateRange === 'last_2_years') {
        startYearFilter = currentYear - 2;
        endYearFilter = currentYear;
      } else if (dateRange === 'last_5_years') {
        startYearFilter = currentYear - 5;
        endYearFilter = currentYear;
      }
    }

    if (startYearFilter || endYearFilter) {
      results = results.filter(m => {
        if (!m.published_at) return false;
        const d = new Date(m.published_at);
        if (isNaN(d.getTime())) return false;
        const y = d.getFullYear();
        if (startYearFilter && y < startYearFilter) return false;
        if (endYearFilter && y > endYearFilter) return false;
        return true;
      });
    }

    if (sort === 'oldest_first') {
      results.sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return da - db;
      });
    } else {
      // newest_first or relevance
      results.sort((a, b) => {
        const da = a.published_at ? new Date(a.published_at).getTime() : 0;
        const db = b.published_at ? new Date(b.published_at).getTime() : 0;
        return db - da;
      });
    }

    const total_count = results.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = results.slice(start, end).map(m => {
      const product = products.find(p => p.id === m.product_id) || null;
      return {
        manual_id: m.id,
        title: m.title,
        product_model_name: m.product_model_name,
        product_name: product ? product.name : null,
        document_type: m.document_type,
        language: m.language || 'en',
        version: m.version || null,
        published_at: m.published_at,
        description: m.description || '',
        file_size_mb:
          typeof m.file_size_mb === 'number' ? m.file_size_mb : null,
        is_active: m.is_active !== false
      };
    });

    // Instrumentation for task completion tracking
    try {
      if (
        query &&
        typeof query === 'string' &&
        query.toLowerCase().includes('galaxy claw pro')
      ) {
        localStorage.setItem(
          'task3_manualSearchParams',
          JSON.stringify({ query, documentType, startYear, endYear, dateRange, sort })
        );
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      page,
      page_size: pageSize,
      total_count,
      items: pageItems
    };
  }

  getManualDetails(manualId) {
    const manuals = this._getFromStorage('manual_documents');
    const products = this._getFromStorage('products');

    const manual = manuals.find(m => m.id === manualId);
    if (!manual) {
      return {
        manual_id: null,
        title: '',
        product_model_name: null,
        product_id: null,
        related_product_name: null,
        document_type: null,
        description: '',
        language: 'en',
        version: null,
        published_at: null,
        file_url: null,
        file_size_mb: null,
        is_active: false
      };
    }

    const product = manual.product_id
      ? products.find(p => p.id === manual.product_id)
      : null;

    return {
      manual_id: manual.id,
      title: manual.title,
      product_model_name: manual.product_model_name,
      product_id: manual.product_id || null,
      related_product_name: product ? product.name : null,
      document_type: manual.document_type,
      description: manual.description || '',
      language: manual.language || 'en',
      version: manual.version || null,
      published_at: manual.published_at,
      file_url: manual.file_url,
      file_size_mb:
        typeof manual.file_size_mb === 'number' ? manual.file_size_mb : null,
      is_active: manual.is_active !== false
    };
  }

  initiateManualDownload(manualId) {
    const manuals = this._getFromStorage('manual_documents');
    const manual = manuals.find(m => m.id === manualId);
    if (!manual || manual.is_active === false) {
      return {
        success: false,
        file_url: null,
        message: 'Manual not found or inactive.'
      };
    }

    // Instrumentation for task completion tracking
    try {
      let existingIds = JSON.parse(
        localStorage.getItem('task3_downloadedManualIds') || '[]'
      );
      if (!Array.isArray(existingIds)) {
        existingIds = [];
      }
      if (!existingIds.includes(manualId)) {
        existingIds.push(manualId);
      }
      localStorage.setItem(
        'task3_downloadedManualIds',
        JSON.stringify(existingIds)
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      file_url: manual.file_url,
      message: 'Download ready.'
    };
  }

  // ---------------------- Service Request Interfaces -----------

  getServiceFormOptions() {
    const categories = this._getFromStorage('product_categories');

    const service_types = [
      {
        value: 'on_site_maintenance',
        label: 'On-site maintenance',
        description: 'Schedule an on-site technician visit for your machine.'
      },
      {
        value: 'technical_support',
        label: 'Technical support',
        description: 'Get remote troubleshooting assistance.'
      },
      {
        value: 'warranty_repair',
        label: 'Warranty repair',
        description: 'Request repair under warranty terms.'
      },
      {
        value: 'installation_support',
        label: 'Installation support',
        description: 'Get help with installation or commissioning.'
      }
    ];

    const product_categories = categories.map(c => ({
      code: c.code,
      name: c.name
    }));

    return { service_types, product_categories };
  }

  getServiceModelsForCategory(categoryCode) {
    const products = this._getFromStorage('products');
    const filtered = products.filter(
      p => p.category_code === categoryCode && p.status === 'active'
    );
    return filtered.map(p => ({
      product_id: p.id,
      product_name: p.name,
      model_code: p.model_code || null
    }));
  }

  submitServiceRequest(
    serviceType,
    productCategoryCode,
    productId,
    venueName,
    venueAddressLine1,
    venueAddressLine2,
    city,
    stateRegion,
    postalCode,
    country,
    issueDescription,
    preferredDateTime,
    contactName,
    contactPhone,
    contactEmail,
    consentToTerms
  ) {
    const validation = this._validatePreferredServiceDatetime(preferredDateTime);
    if (!validation.isValid) {
      return {
        success: false,
        service_request_id: null,
        status: 'submitted',
        submitted_at: null,
        message: validation.message
      };
    }

    let serviceRequests = this._getFromStorage('service_requests');
    const now = new Date().toISOString();

    const requestId = this._generateId('svc');
    const request = {
      id: requestId,
      service_type: serviceType,
      product_category_code: productCategoryCode,
      product_model_name: '',
      product_id: productId || null,
      venue_name: venueName,
      venue_address_line1: venueAddressLine1,
      venue_address_line2: venueAddressLine2 || null,
      city: city || null,
      state_region: stateRegion || null,
      postal_code: postalCode || null,
      country: country || null,
      issue_description: issueDescription,
      preferred_datetime: preferredDateTime,
      scheduled_datetime: null,
      contact_name: contactName,
      contact_phone: contactPhone || null,
      contact_email: contactEmail,
      consent_to_terms: !!consentToTerms,
      status: 'submitted',
      created_at: now,
      updated_at: now
    };

    // If productId is provided, set product_model_name from product
    if (productId) {
      const products = this._getFromStorage('products');
      const product = products.find(p => p.id === productId);
      if (product) {
        request.product_model_name = product.name;
      }
    }

    serviceRequests.push(request);
    this._saveToStorage('service_requests', serviceRequests);

    return {
      success: true,
      service_request_id: requestId,
      status: request.status,
      submitted_at: now,
      message: 'Service request submitted.'
    };
  }

  // ---------------------- Distributor Interfaces --------------

  getDistributorSearchOptions() {
    const distributors = this._getFromStorage('distributors');

    const regionLabels = {
      europe: 'Europe',
      north_america: 'North America',
      latin_america: 'Latin America',
      asia_pacific: 'Asia-Pacific',
      middle_east_africa: 'Middle East & Africa',
      other: 'Other'
    };

    const regionSet = new Set();
    const countriesMap = {}; // key: region+country

    for (const d of distributors) {
      if (!d.region || !d.country) continue;
      regionSet.add(d.region);
      const key = d.region + '|' + d.country;
      if (!countriesMap[key]) {
        countriesMap[key] = {
          region: d.region,
          value: d.country,
          label: d.country
        };
      }
    }

    const regions = Array.from(regionSet).map(r => ({
      value: r,
      label: this._getEnumLabel(regionLabels, r)
    }));

    const countries = Object.values(countriesMap);

    return { regions, countries };
  }

  searchDistributors(region, country, cityOrPostal, page = 1, pageSize = 20) {
    const distributors = this._getFromStorage('distributors');

    let results = distributors.filter(d => {
      if (region && d.region !== region) return false;
      if (country && d.country !== country) return false;
      if (d.is_active === false) return false;
      if (d.is_authorized_distributor === false) return false;
      return true;
    });

    const search =
      cityOrPostal && typeof cityOrPostal === 'string'
        ? cityOrPostal.toLowerCase()
        : '';

    if (search) {
      results = results.filter(d => {
        const fields = [d.city, d.postal_code];
        if (Array.isArray(d.territories)) {
          fields.push.apply(fields, d.territories);
        }
        return fields.some(
          v => typeof v === 'string' && v.toLowerCase().indexOf(search) !== -1
        );
      });
    }

    const total_count = results.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItemsRaw = results.slice(start, end);

    const items = pageItemsRaw.map(d => ({
      distributor_id: d.id,
      name: d.name,
      region: d.region,
      country: d.country,
      city: d.city,
      address_line1: d.address_line1,
      address_line2: d.address_line2 || null,
      state_region: d.state_region || null,
      postal_code: d.postal_code || null,
      latitude: typeof d.latitude === 'number' ? d.latitude : null,
      longitude: typeof d.longitude === 'number' ? d.longitude : null,
      phone: d.phone || null,
      email: d.email || null,
      website_url: d.website_url || null,
      is_authorized_distributor: d.is_authorized_distributor !== false,
      serves_search_location: !!search,
      // foreign key resolution
      distributor: d
    }));

    return {
      page,
      page_size: pageSize,
      total_count,
      items
    };
  }

  getDistributorDetails(distributorId) {
    const distributors = this._getFromStorage('distributors');
    const d = distributors.find(x => x.id === distributorId);
    if (!d) {
      return {
        distributor_id: null,
        name: '',
        region: null,
        country: null,
        city: null,
        address_line1: null,
        address_line2: null,
        state_region: null,
        postal_code: null,
        phone: null,
        email: null,
        website_url: null,
        territories: [],
        notes: null,
        is_authorized_distributor: false,
        is_active: false
      };
    }

    return {
      distributor_id: d.id,
      name: d.name,
      region: d.region,
      country: d.country,
      city: d.city,
      address_line1: d.address_line1,
      address_line2: d.address_line2 || null,
      state_region: d.state_region || null,
      postal_code: d.postal_code || null,
      phone: d.phone || null,
      email: d.email || null,
      website_url: d.website_url || null,
      territories: Array.isArray(d.territories) ? d.territories : [],
      notes: d.notes || null,
      is_authorized_distributor: d.is_authorized_distributor !== false,
      is_active: d.is_active !== false
    };
  }

  submitDistributorInquiry(
    distributorId,
    subject,
    message,
    contactName,
    contactEmail,
    contactPhone
  ) {
    const allowedSubjects = [
      'product_inquiry',
      'service_question',
      'pricing_quote',
      'other'
    ];
    if (!allowedSubjects.includes(subject)) {
      subject = 'other';
    }

    let inquiries = this._getFromStorage('distributor_inquiries');
    const now = new Date().toISOString();

    const inquiryId = this._generateId('dist_inq');
    const inquiry = {
      id: inquiryId,
      distributor_id: distributorId,
      subject: subject,
      message: message,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone || null,
      created_at: now,
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('distributor_inquiries', inquiries);

    return {
      success: true,
      distributor_inquiry_id: inquiryId,
      status: inquiry.status,
      created_at: now,
      message: 'Distributor inquiry submitted.'
    };
  }

  // ---------------------- Events & Demo Registration ----------

  getEvents(
    status,
    eventType,
    hasOnSiteDemos,
    sort,
    page = 1,
    pageSize = 20
  ) {
    const events = this._getFromStorage('events');

    let results = events.slice();

    if (status) {
      results = results.filter(e => e.status === status);
    }

    if (eventType) {
      results = results.filter(e => e.event_type === eventType);
    }

    if (typeof hasOnSiteDemos === 'boolean') {
      results = results.filter(e => !!e.has_on_site_demos === hasOnSiteDemos);
    }

    if (sort === 'start_date_desc') {
      results.sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return db - da;
      });
    } else {
      // start_date_asc default
      results.sort((a, b) => {
        const da = a.start_date ? new Date(a.start_date).getTime() : 0;
        const db = b.start_date ? new Date(b.start_date).getTime() : 0;
        return da - db;
      });
    }

    const total_count = results.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageItems = results.slice(start, end).map(e => ({
      event_id: e.id,
      title: e.title,
      slug: e.slug || null,
      event_type: e.event_type,
      status: e.status,
      start_date: e.start_date,
      end_date: e.end_date,
      city: e.city || null,
      country: e.country || null,
      has_on_site_demos: !!e.has_on_site_demos,
      booth_number: e.booth_number || null,
      description_excerpt: (e.description || '').slice(0, 200)
    }));

    return {
      page,
      page_size: pageSize,
      total_count,
      items: pageItems
    };
  }

  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const e = events.find(ev => ev.id === eventId);
    if (!e) {
      return {
        event_id: null,
        title: '',
        slug: null,
        description: '',
        event_type: null,
        status: null,
        start_date: null,
        end_date: null,
        location_name: null,
        city: null,
        country: null,
        address_line1: null,
        address_line2: null,
        postal_code: null,
        booth_number: null,
        has_on_site_demos: false,
        time_zone: null,
        event_website_url: null
      };
    }

    return {
      event_id: e.id,
      title: e.title,
      slug: e.slug || null,
      description: e.description || '',
      event_type: e.event_type,
      status: e.status,
      start_date: e.start_date,
      end_date: e.end_date,
      location_name: e.location_name || null,
      city: e.city || null,
      country: e.country || null,
      address_line1: e.address_line1 || null,
      address_line2: e.address_line2 || null,
      postal_code: e.postal_code || null,
      booth_number: e.booth_number || null,
      has_on_site_demos: !!e.has_on_site_demos,
      time_zone: e.time_zone || null,
      event_website_url: e.event_website_url || null
    };
  }

  getEventAvailableDemoSlots(eventId) {
    const events = this._getFromStorage('events');
    const registrations = this._getFromStorage('demo_registrations');

    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { dates: [] };
    }

    const startDate = this._parseISODateOnly(event.start_date);
    const endDate = this._parseISODateOnly(event.end_date);
    if (!startDate || !endDate) {
      return { dates: [] };
    }

    const dates = [];
    for (
      let d = new Date(startDate.getTime());
      d.getTime() <= endDate.getTime();
      d.setDate(d.getDate() + 1)
    ) {
      const isoDate = d.toISOString().slice(0, 10); // YYYY-MM-DD

      const time_slots = [];
      for (let h = 9; h <= 17; h++) {
        for (let m = 0; m < 60; m += 15) {
          const hh = h < 10 ? '0' + h : '' + h;
          const mm = m < 10 ? '0' + m : '' + m;
          const timeSlotVal = hh + ':' + mm;

          const isTaken = registrations.some(r => {
            if (r.event_id !== eventId) return false;
            const rd = r.selected_date ? r.selected_date.slice(0, 10) : null;
            return (
              rd === isoDate && r.time_slot === timeSlotVal && r.status !== 'cancelled'
            );
          });

          time_slots.push({
            time_slot: timeSlotVal,
            label: this._formatTimeLabel(timeSlotVal),
            is_available: !isTaken
          });
        }
      }

      dates.push({
        date: isoDate,
        label: d.toDateString(),
        time_slots
      });
    }

    return { dates };
  }

  submitDemoRegistration(
    eventId,
    selectedDate,
    timeSlot,
    contactName,
    companyName,
    email,
    areaOfInterest,
    comments
  ) {
    const slotsInfo = this.getEventAvailableDemoSlots(eventId);

    const dateEntry = slotsInfo.dates.find(d => d.date === selectedDate);
    let valid = false;
    if (dateEntry) {
      const slotEntry = dateEntry.time_slots.find(s => s.time_slot === timeSlot);
      if (slotEntry && slotEntry.is_available) valid = true;
    }

    if (!valid) {
      return {
        success: false,
        demo_registration_id: null,
        status: 'submitted',
        created_at: null,
        message: 'Selected demo slot is not available.'
      };
    }

    let regs = this._getFromStorage('demo_registrations');
    const now = new Date().toISOString();

    const regId = this._generateId('demo');
    const reg = {
      id: regId,
      event_id: eventId,
      selected_date: selectedDate,
      time_slot: timeSlot,
      contact_name: contactName,
      company_name: companyName || null,
      email: email,
      area_of_interest: areaOfInterest || null,
      comments: comments || null,
      status: 'submitted',
      created_at: now
    };

    regs.push(reg);
    this._saveToStorage('demo_registrations', regs);

    return {
      success: true,
      demo_registration_id: regId,
      status: reg.status,
      created_at: now,
      message: 'Demo registration submitted.'
    };
  }

  // ---------------------- Financing Interfaces -----------------

  getFinancingOverview() {
    return {
      intro_text:
        'Finance your arcade and amusement equipment with flexible, fixed-rate plans designed for operators.',
      highlights: [
        {
          title: 'Preserve cash flow',
          description:
            'Turn upfront equipment costs into predictable monthly payments.'
        },
        {
          title: 'Multiple term options',
          description:
            'Choose terms that match your revenue profile and business goals.'
        },
        {
          title: 'Simple application',
          description:
            'Submit a short online form and our team will follow up with personalized options.'
        }
      ],
      faq: [
        {
          question: 'Can I finance multiple machines in one plan?',
          answer:
            'Yes, you can typically bundle multiple machines into a single financing agreement, subject to lender approval.'
        },
        {
          question: 'Is there a minimum equipment price?',
          answer:
            'Minimum and maximum amounts depend on the financing partner and region. Use the calculator as a guide and submit an inquiry for details.'
        }
      ]
    };
  }

  getFinancingPlanOptions(currency) {
    const plans = this._getFromStorage('financing_plan_definitions');
    let filtered = plans.filter(p => p.is_active !== false);
    if (currency) {
      filtered = filtered.filter(p => p.currency === currency);
    }

    filtered.sort((a, b) => {
      const ao = typeof a.display_order === 'number' ? a.display_order : 0;
      const bo = typeof b.display_order === 'number' ? b.display_order : 0;
      if (ao !== bo) return ao - bo;
      return a.term_months - b.term_months;
    });

    return filtered.map(p => ({
      plan_id: p.id,
      name: p.name,
      term_months: p.term_months,
      interest_rate_annual_percent: p.interest_rate_annual_percent,
      min_amount: typeof p.min_amount === 'number' ? p.min_amount : null,
      max_amount: typeof p.max_amount === 'number' ? p.max_amount : null,
      currency: p.currency || 'usd',
      description: p.description || '',
      display_order: typeof p.display_order === 'number' ? p.display_order : 0,
      is_active: p.is_active !== false
    }));
  }

  calculateFinancingPayments(equipmentPrice, currency, termMonthsList) {
    const plans = this._getFromStorage('financing_plan_definitions');
    const calculations = [];

    for (const term of termMonthsList || []) {
      const termNum = Number(term) || 0;
      let plan = plans.find(
        p => p.term_months === termNum && (!currency || p.currency === currency)
      );

      const rate = plan ? plan.interest_rate_annual_percent : 0;
      const payment = this._calculateMonthlyPaymentInternal(
        equipmentPrice,
        termNum,
        rate
      );

      calculations.push({
        plan_id: plan ? plan.id : null,
        term_months: termNum,
        interest_rate_annual_percent: rate,
        estimated_monthly_payment: payment,
        // foreign key resolution for plan_id
        plan: plan || null
      });
    }

    return {
      equipment_price: equipmentPrice,
      currency: currency,
      calculations
    };
  }

  submitFinancingInquiry(
    selectedPlanId,
    equipmentPrice,
    currency,
    selectedTermMonths,
    estimatedMonthlyPayment,
    contactName,
    companyName,
    email,
    phone
  ) {
    const now = new Date().toISOString();
    let inquiries = this._getFromStorage('financing_inquiries');

    const inquiryId = this._generateId('fin');
    const inquiry = {
      id: inquiryId,
      selected_plan_id: selectedPlanId || null,
      equipment_price: equipmentPrice,
      currency: currency,
      selected_term_months: selectedTermMonths,
      estimated_monthly_payment: estimatedMonthlyPayment,
      contact_name: contactName,
      company_name: companyName || null,
      email: email,
      phone: phone || null,
      created_at: now,
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('financing_inquiries', inquiries);

    return {
      success: true,
      financing_inquiry_id: inquiryId,
      status: inquiry.status,
      created_at: now,
      message: 'Financing inquiry submitted.'
    };
  }

  // ---------------------- Newsletter Interfaces ----------------

  getNewsletterOptions() {
    const market_segments = [
      {
        value: 'family_entertainment_centers',
        label: 'Family Entertainment Centers',
        description: 'Updates tailored to FEC operators.'
      },
      {
        value: 'bowling_centers',
        label: 'Bowling Centers',
        description: 'Content for bowling and hybrid centers.'
      },
      {
        value: 'theme_parks',
        label: 'Theme Parks',
        description: 'Large attractions and destination venues.'
      },
      {
        value: 'cinemas',
        label: 'Cinemas',
        description: 'Cinema lobbies and entertainment areas.'
      },
      {
        value: 'bars_arcades',
        label: 'Bars & Arcades',
        description: 'Barcades and social gaming venues.'
      },
      {
        value: 'street_route_locations',
        label: 'Street / Route locations',
        description: 'Street sites and distributed operations.'
      },
      {
        value: 'other',
        label: 'Other',
        description: 'Other amusement and leisure businesses.'
      }
    ];

    const email_frequencies = [
      {
        value: 'immediate',
        label: 'Immediate',
        description: 'Receive updates as soon as they are published.'
      },
      {
        value: 'weekly',
        label: 'Weekly',
        description: 'A weekly summary of key updates.'
      },
      {
        value: 'monthly',
        label: 'Monthly',
        description: 'A monthly digest of product and event news.'
      },
      {
        value: 'quarterly',
        label: 'Quarterly',
        description: 'A high-level quarterly overview.'
      }
    ];

    const default_frequency = 'monthly';

    return { market_segments, email_frequencies, default_frequency };
  }

  submitNewsletterSubscription(
    fullName,
    email,
    marketSegments,
    emailFrequency,
    comments,
    acceptedPrivacyPolicy
  ) {
    if (!acceptedPrivacyPolicy) {
      return {
        success: false,
        newsletter_subscription_id: null,
        status: 'active',
        created_at: null,
        message: 'Privacy policy must be accepted.'
      };
    }

    let subs = this._getFromStorage('newsletter_subscriptions');
    const now = new Date().toISOString();

    const subId = this._generateId('nl');
    const sub = {
      id: subId,
      full_name: fullName,
      email: email,
      market_segments: Array.isArray(marketSegments) ? marketSegments : [],
      email_frequency: emailFrequency,
      comments: comments || null,
      accepted_privacy_policy: !!acceptedPrivacyPolicy,
      status: 'active',
      created_at: now
    };

    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      newsletter_subscription_id: subId,
      status: sub.status,
      created_at: now,
      message: 'Subscription created.'
    };
  }

  // ---------------------- About / Contact / Legal -------------

  getAboutPageContent() {
    return {
      company_overview:
        'We design and manufacture high-performance amusement and arcade machines for entertainment venues worldwide.',
      mission:
        'To create reliable, high-earning amusement experiences that delight players and operators alike.',
      history_timeline: [
        {
          year: '2000',
          title: 'Founded',
          description:
            'The company was founded with a focus on innovative redemption and sports games.'
        },
        {
          year: '2010',
          title: 'Global Expansion',
          description:
            'We expanded our distributor network across Europe, North America, and Asia-Pacific.'
        }
      ],
      leadership: [
        {
          name: 'Jane Doe',
          role: 'CEO',
          bio: 'Over 20 years of experience in the amusement and coin-op industry.'
        },
        {
          name: 'John Smith',
          role: 'Head of Product Development',
          bio: 'Leads our game design and engineering teams.'
        }
      ],
      capabilities: [
        {
          title: 'In-house R&D and Manufacturing',
          description:
            'From concept to production, we control the full lifecycle of our machines.'
        },
        {
          title: 'Global Service & Support',
          description:
            'Our service network and partners support installations in over 50 countries.'
        }
      ]
    };
  }

  getContactTopics() {
    return [
      {
        value: 'general_question',
        label: 'General question',
        description: 'Ask us about our company or product offering.'
      },
      {
        value: 'sales',
        label: 'Sales / Pricing',
        description: 'Request information about pricing or availability.'
      },
      {
        value: 'media',
        label: 'Media / Press',
        description: 'Media or press-related inquiries.'
      },
      {
        value: 'partnership',
        label: 'Partnership / Distribution',
        description: 'Explore distribution or partnership opportunities.'
      }
    ];
  }

  submitContactInquiry(topic, message, contactName, email, companyName, phone) {
    // For simplicity we do not persist general contact inquiries in a dedicated table
    const reference = this._generateId('contact');
    return {
      success: true,
      contact_reference: reference,
      message: 'Your inquiry has been received.'
    };
  }

  getPrivacyPolicyContent() {
    const lastUpdated = '2024-01-01';
    const sections = [
      {
        id: 'introduction',
        title: 'Introduction',
        body:
          'This Privacy Policy explains how we collect, use, and protect your personal data when you visit our website or interact with our services.'
      },
      {
        id: 'data_collection',
        title: 'Data we collect',
        body:
          'We may collect contact details, usage data, and technical information necessary to provide and improve our services.'
      },
      {
        id: 'contact',
        title: 'Contact',
        body:
          'If you have any questions about this Privacy Policy, please contact us via the contact form or at privacy@example.com.'
      }
    ];

    return { last_updated: lastUpdated, sections };
  }

  getTermsOfUseContent() {
    const lastUpdated = '2024-01-01';
    const sections = [
      {
        id: 'introduction',
        title: 'Introduction',
        body:
          'These Terms of Use govern your access to and use of our website and online services.'
      },
      {
        id: 'acceptable_use',
        title: 'Acceptable use',
        body:
          'You agree not to misuse the website, attempt to gain unauthorized access, or interfere with its normal operation.'
      },
      {
        id: 'liability',
        title: 'Limitation of liability',
        body:
          'We provide the website on an “as is” basis and disclaim liability to the fullest extent permitted by law.'
      }
    ];

    return { last_updated: lastUpdated, sections };
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