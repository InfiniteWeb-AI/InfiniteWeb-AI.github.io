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

  // ---- Storage helpers ----
  _initStorage() {
    const arrayKeys = [
      'pages',
      'navigation_links',
      'workshops',
      'cart',
      'cart_items',
      'talk_topics',
      'shortlisted_talks',
      'blog_posts',
      'reading_list_items',
      'resources',
      'saved_resources',
      'testimonials',
      'case_studies',
      'budget_range_options',
      'speaking_inquiries',
      'newsletter_subscriptions',
      'newsletter_subscription_interests',
      'pricing_estimates',
      'calendar_day_availability',
      'availability_requests',
      'contact_messages'
    ];

    const singletonKeys = ['ui_state'];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    singletonKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(null));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
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

  _now() {
    return new Date().toISOString();
  }

  _formatCurrency(amount, currency) {
    if (amount === null || amount === undefined || isNaN(amount)) return '';
    const cur = currency || 'usd';
    const symbol = cur === 'eur' ? '€' : cur === 'gbp' ? '£' : '$';
    const num = Number(amount);
    return symbol + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  _updateUiState(view) {
    let uiState = this._getFromStorage('ui_state', null);
    if (!uiState || typeof uiState !== 'object') {
      uiState = {
        id: this._generateId('ui_state'),
        saved_items_view: null,
        last_updated: null
      };
    }
    if (view) {
      uiState.saved_items_view = view;
    }
    uiState.last_updated = this._now();
    this._saveToStorage('ui_state', uiState);
    return uiState;
  }

  _getOrCreateCart() {
    let carts = this._getFromStorage('cart', []);
    let cart = carts.find((c) => c.status === 'open');
    const now = this._now();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'open',
        createdAt: now,
        updatedAt: now
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _recalculateCartTotals(cartId) {
    const carts = this._getFromStorage('cart', []);
    const cartItems = this._getFromStorage('cart_items', []);
    const workshops = this._getFromStorage('workshops', []);

    const cart = carts.find((c) => c.id === cartId) || null;
    const itemsForCart = cartItems.filter((ci) => ci.cartId === cartId);

    let subtotal = 0;
    let currency = 'usd';
    itemsForCart.forEach((item) => {
      subtotal += Number(item.total_price || 0);
      const ws = workshops.find((w) => w.id === item.workshopId);
      if (ws && ws.currency) {
        currency = ws.currency;
      }
    });

    if (cart) {
      cart.updatedAt = this._now();
      const idx = carts.findIndex((c) => c.id === cart.id);
      if (idx !== -1) {
        carts[idx] = cart;
      }
      this._saveToStorage('cart', carts);
    }

    return { cart, subtotal, currency };
  }

  _calculatePricingFromInputs(service_type, number_of_sessions, format, audience_size, budget_max, currency) {
    const sessions = number_of_sessions || 1;
    const size = audience_size || 0;
    const cur = currency || 'usd';

    let basePerUnit = 0;
    if (service_type === 'workshop_series') {
      basePerUnit = format === 'in_person' ? 2500 : format === 'hybrid' ? 2200 : 1800;
    } else if (service_type === 'single_workshop') {
      basePerUnit = format === 'in_person' ? 3000 : format === 'hybrid' ? 2600 : 2200;
    } else if (service_type === 'keynote') {
      basePerUnit = format === 'in_person' ? 12000 : format === 'hybrid' ? 10000 : 8000;
    } else if (service_type === 'consulting') {
      basePerUnit = 4000;
    } else {
      basePerUnit = 2000;
    }

    let estimate = basePerUnit * sessions;

    if (size > 50 && size <= 100) estimate *= 1.1;
    else if (size > 100 && size <= 250) estimate *= 1.25;
    else if (size > 250 && size <= 500) estimate *= 1.4;
    else if (size > 500) estimate *= 1.6;

    if (budget_max && estimate > budget_max) {
      // Do not clamp, but note in details
    }

    const detailsParts = [];
    detailsParts.push('Service: ' + service_type.replace(/_/g, ' '));
    detailsParts.push('Format: ' + format.replace(/_/g, ' '));
    detailsParts.push('Sessions: ' + sessions);
    detailsParts.push('Audience size: ' + size);
    if (budget_max) {
      detailsParts.push('Client max budget: ' + this._formatCurrency(budget_max, cur));
      if (estimate > budget_max) {
        detailsParts.push('Note: Estimate exceeds max budget by ~' + this._formatCurrency(estimate - budget_max, cur));
      }
    }

    return {
      estimated_price: Math.round(estimate),
      estimate_details: detailsParts.join(' | ')
    };
  }

  _uniqueStrings(arr) {
    const set = new Set();
    arr.forEach((v) => {
      if (v !== null && v !== undefined) set.add(String(v));
    });
    return Array.from(set);
  }

  // ---- Interface implementations ----

  // getHomePageData
  getHomePageData() {
    const talkTopics = this._getFromStorage('talk_topics', []);
    const workshops = this._getFromStorage('workshops', []);
    const posts = this._getFromStorage('blog_posts', []);
    const resources = this._getFromStorage('resources', []);

    const featured_talk = talkTopics
      .filter((t) => t.is_active !== false)
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      })[0] || null;

    const featured_workshop = workshops
      .filter((w) => w.is_active !== false)
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      })[0] || null;

    const featured_blog_post = posts
      .filter((p) => p.status === 'published')
      .sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      })[0] || null;

    const featured_resource = resources
      .filter((r) => r.is_active !== false)
      .sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      })[0] || null;

    return {
      hero_title: 'Keynotes and workshops for modern engineering leaders',
      hero_subtitle: 'Practical, story-driven talks on leadership, communication, and remote work.',
      hero_ctas: [
        {
          label: 'Book the Speaker',
          target_page: 'book_the_speaker',
          description: 'Check availability for keynotes and workshops.'
        },
        {
          label: 'View Workshops',
          target_page: 'workshops',
          description: 'Deep-dive, hands-on sessions for your team.'
        },
        {
          label: 'Pricing Calculator',
          target_page: 'pricing_calculator',
          description: 'Estimate investment for your next event.'
        },
        {
          label: 'View Schedule',
          target_page: 'schedule',
          description: 'See upcoming availability.'
        }
      ],
      featured_talk,
      featured_workshop,
      featured_blog_post,
      featured_resource
    };
  }

  // Newsletter
  getNewsletterSignupOptions() {
    return {
      frequencies: [
        { value: 'daily', label: 'Daily', description: 'Short, focused tips every weekday.' },
        { value: 'weekly', label: 'Weekly', description: 'A weekly roundup with deeper insights.' },
        { value: 'monthly', label: 'Monthly', description: 'A monthly digest of the best content.' }
      ],
      interests: [
        { value: 'leadership', label: 'Leadership' },
        { value: 'remote_work', label: 'Remote Work' },
        { value: 'storytelling', label: 'Storytelling' },
        { value: 'team_communication', label: 'Team Communication' },
        { value: 'other', label: 'Other' }
      ],
      consent_text: 'By subscribing you agree to receive email updates and accept the privacy policy.'
    };
  }

  createNewsletterSubscription(name, email, frequency, interests, consent, source) {
    const now = this._now();
    if (!email || !frequency || !Array.isArray(interests)) {
      return { success: false, subscription: null, interests: [], message: 'Missing required fields.' };
    }
    if (!consent) {
      return { success: false, subscription: null, interests: [], message: 'Consent is required.' };
    }

    const allowedFreq = ['daily', 'weekly', 'monthly'];
    if (allowedFreq.indexOf(frequency) === -1) {
      return { success: false, subscription: null, interests: [], message: 'Invalid frequency.' };
    }

    let subs = this._getFromStorage('newsletter_subscriptions', []);
    let interestsStore = this._getFromStorage('newsletter_subscription_interests', []);

    const subscription = {
      id: this._generateId('sub'),
      name: name || null,
      email,
      frequency,
      consent: !!consent,
      source: source || null,
      status: 'active',
      createdAt: now
    };

    subs.push(subscription);

    // Remove any existing interests for this subscription id just in case
    interestsStore = interestsStore.filter((i) => i.subscriptionId !== subscription.id);

    const interestRecords = interests.map((val) => {
      return {
        id: this._generateId('subint'),
        subscriptionId: subscription.id,
        interest: val
      };
    });

    interestsStore.push(...interestRecords);

    this._saveToStorage('newsletter_subscriptions', subs);
    this._saveToStorage('newsletter_subscription_interests', interestsStore);

    return {
      success: true,
      subscription,
      interests: interestRecords,
      message: 'Subscription created.'
    };
  }

  // Speaking inquiry options
  getSpeakingInquiryFormOptions() {
    const budget_ranges = this._getFromStorage('budget_range_options', []).filter((b) => b.is_active !== false);

    return {
      event_types: [
        { value: 'conference_keynote', label: 'Conference Keynote' },
        { value: 'keynote', label: 'Keynote' },
        { value: 'workshop', label: 'Workshop' },
        { value: 'panel', label: 'Panel' },
        { value: 'webinar', label: 'Webinar' },
        { value: 'other', label: 'Other' }
      ],
      formats: [
        { value: 'in_person', label: 'In-person' },
        { value: 'virtual', label: 'Virtual' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      budget_ranges,
      currencies: [
        { value: 'usd', label: 'USD' },
        { value: 'eur', label: 'EUR' },
        { value: 'gbp', label: 'GBP' },
        { value: 'other', label: 'Other' }
      ],
      default_currency: 'usd'
    };
  }

  getSpeakingInquiryPrefill(source_page, related_talk_id, related_testimonial_id, requested_date, calendar_day_id) {
    const talks = this._getFromStorage('talk_topics', []);
    const testimonials = this._getFromStorage('testimonials', []);
    const days = this._getFromStorage('calendar_day_availability', []);

    const related_talk = related_talk_id ? talks.find((t) => t.id === related_talk_id) || null : null;
    const related_testimonial = related_testimonial_id
      ? testimonials.find((t) => t.id === related_testimonial_id) || null
      : null;

    let event_date = null;
    if (requested_date) {
      event_date = requested_date;
    } else if (calendar_day_id) {
      const day = days.find((d) => d.id === calendar_day_id);
      if (day && day.date) event_date = day.date;
    }

    let event_type = null;
    if (related_testimonial && related_testimonial.event_type) {
      event_type = related_testimonial.event_type;
    } else if (source_page === 'schedule') {
      event_type = 'keynote';
    } else if (related_talk) {
      event_type = 'conference_keynote';
    }

    let format = null;
    if (source_page === 'schedule') {
      format = 'virtual';
    }

    let city = null;
    let state = null;
    let country = null;
    let audience_size = null;

    if (related_testimonial) {
      city = related_testimonial.event_city || null;
      state = related_testimonial.event_state || null;
      country = related_testimonial.event_country || null;
      audience_size = related_testimonial.audience_size || null;
    }

    // No automatic budget prefill from ranges; rely on user selection
    const budget_range_id = null;

    return {
      event_date,
      event_type,
      format,
      city,
      state,
      country,
      audience_size,
      budget_range_id,
      related_talk,
      related_testimonial
    };
  }

  submitSpeakingInquiry(
    event_date,
    city,
    state,
    country,
    location_text,
    event_type,
    audience_size,
    format,
    budget_range_id,
    budget_min,
    budget_max,
    currency,
    message,
    contact_name,
    contact_email,
    contact_phone,
    organization_name,
    related_talk_id,
    related_testimonial_id,
    source_page
  ) {
    const requiredMissing = [];
    if (!event_date) requiredMissing.push('event_date');
    if (!event_type) requiredMissing.push('event_type');
    if (audience_size === null || audience_size === undefined) requiredMissing.push('audience_size');
    if (!format) requiredMissing.push('format');
    if (!contact_name) requiredMissing.push('contact_name');
    if (!contact_email) requiredMissing.push('contact_email');

    if (requiredMissing.length) {
      return {
        success: false,
        speaking_inquiry_id: null,
        summary: null,
        message: 'Missing fields: ' + requiredMissing.join(', ')
      };
    }

    const inquiries = this._getFromStorage('speaking_inquiries', []);
    const now = this._now();

    const inquiry = {
      id: this._generateId('inq'),
      createdAt: now,
      source_page: source_page || null,
      event_date,
      city: city || null,
      state: state || null,
      country: country || null,
      location_text: location_text || null,
      event_type,
      audience_size: Number(audience_size),
      format,
      budget_range_id: budget_range_id || null,
      budget_min: budget_min !== undefined && budget_min !== null ? Number(budget_min) : null,
      budget_max: budget_max !== undefined && budget_max !== null ? Number(budget_max) : null,
      currency: currency || null,
      message: message || null,
      contact_name,
      contact_email,
      contact_phone: contact_phone || null,
      organization_name: organization_name || null,
      related_talk_id: related_talk_id || null,
      related_testimonial_id: related_testimonial_id || null
    };

    inquiries.push(inquiry);
    this._saveToStorage('speaking_inquiries', inquiries);

    return {
      success: true,
      speaking_inquiry_id: inquiry.id,
      summary: inquiry,
      message: 'Inquiry submitted.'
    };
  }

  // Workshops
  getWorkshopFilterOptions() {
    const workshops = this._getFromStorage('workshops', []);
    const tags = this._uniqueStrings(
      workshops.reduce((acc, w) => {
        if (Array.isArray(w.tags)) acc.push(...w.tags);
        return acc;
      }, [])
    );

    return {
      formats: [
        { value: 'virtual', label: 'Virtual' },
        { value: 'in_person', label: 'In-person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      duration_ranges: [
        { min_minutes: 0, max_minutes: 90, label: 'Up to 90 minutes' },
        { min_minutes: 90, max_minutes: 180, label: '90–180 minutes' },
        { min_minutes: 180, max_minutes: null, label: '3+ hours' }
      ],
      price_ranges: [
        { min_price: 0, max_price: 2000, label: 'Up to $2,000', currency: 'usd' },
        { min_price: 2000, max_price: 5000, label: '$2,000–$5,000', currency: 'usd' },
        { min_price: 5000, max_price: null, label: '$5,000+', currency: 'usd' }
      ],
      tags
    };
  }

  searchWorkshops(query, filters, sort_by, limit, offset) {
    let workshops = this._getFromStorage('workshops', []);
    const q = query ? String(query).toLowerCase() : null;
    const f = filters || {};

    workshops = workshops.filter((w) => {
      if (f.is_active !== undefined) {
        if (!!w.is_active !== !!f.is_active) return false;
      } else {
        if (w.is_active === false) return false;
      }

      if (f.formats && Array.isArray(f.formats) && f.formats.length) {
        if (f.formats.indexOf(w.format) === -1) return false;
      }

      if (f.duration_min_minutes != null && w.duration_minutes < f.duration_min_minutes) return false;
      if (f.duration_max_minutes != null && w.duration_minutes > f.duration_max_minutes) return false;

      if (f.price_min != null && w.price < f.price_min) return false;
      if (f.price_max != null && w.price > f.price_max) return false;

      if (Array.isArray(f.tags) && f.tags.length) {
        const wsTags = Array.isArray(w.tags) ? w.tags : [];
        const hasTag = f.tags.some((tag) => wsTags.indexOf(tag) !== -1);
        if (!hasTag) return false;
      }

      if (f.audience_size_min != null && w.audience_size_max !== undefined) {
        if (w.audience_size_max < f.audience_size_min) return false;
      }
      if (f.audience_size_max != null && w.audience_size_min !== undefined) {
        if (w.audience_size_min > f.audience_size_max) return false;
      }

      if (q) {
        const text = ((w.title || '') + ' ' + (w.summary || '') + ' ' + (w.description || '') + ' ' + (Array.isArray(w.tags) ? w.tags.join(' ') : '')).toLowerCase();
        if (text.indexOf(q) === -1) return false;
      }

      return true;
    });

    if (sort_by === 'price_asc') {
      workshops.sort((a, b) => a.price - b.price);
    } else if (sort_by === 'price_desc') {
      workshops.sort((a, b) => b.price - a.price);
    } else if (sort_by === 'duration_asc') {
      workshops.sort((a, b) => a.duration_minutes - b.duration_minutes);
    } else if (sort_by === 'duration_desc') {
      workshops.sort((a, b) => b.duration_minutes - a.duration_minutes);
    } else if (sort_by === 'created_desc') {
      workshops.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }

    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return workshops.slice(start, end);
  }

  getWorkshopDetail(workshopId) {
    const workshops = this._getFromStorage('workshops', []);
    const workshop = workshops.find((w) => w.id === workshopId) || null;

    if (!workshop) {
      return {
        workshop: null,
        agenda: [],
        duration_display: '',
        price_display: '',
        is_bookable: false
      };
    }

    const minutes = workshop.duration_minutes || 0;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const duration_display = hours > 0 ? hours + 'h ' + (mins ? mins + 'm' : '') : mins + 'm';
    const price_display = this._formatCurrency(workshop.price, workshop.currency || 'usd');

    return {
      workshop,
      agenda: [],
      duration_display,
      price_display,
      is_bookable: workshop.is_active !== false
    };
  }

  addWorkshopToCart(workshopId, quantity, selected_date, notes) {
    const qty = quantity && quantity > 0 ? Number(quantity) : 1;
    const workshops = this._getFromStorage('workshops', []);
    const workshop = workshops.find((w) => w.id === workshopId) || null;
    if (!workshop || workshop.is_active === false) {
      return {
        success: false,
        cart: null,
        items: [],
        subtotal: 0,
        currency: 'usd',
        message: 'Workshop not found or not bookable.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const now = this._now();

    const cart_item = {
      id: this._generateId('cartitem'),
      cartId: cart.id,
      workshopId: workshop.id,
      quantity: qty,
      unit_price: workshop.price,
      total_price: workshop.price * qty,
      selected_date: selected_date || null,
      notes: notes || null,
      addedAt: now
    };

    cartItems.push(cart_item);
    this._saveToStorage('cart_items', cartItems);

    const totals = this._recalculateCartTotals(cart.id);

    const items = cartItems
      .filter((ci) => ci.cartId === cart.id)
      .map((ci) => ({
        cart_item: ci,
        workshop: workshops.find((w) => w.id === ci.workshopId) || null
      }));

    return {
      success: true,
      cart: totals.cart,
      items,
      subtotal: totals.subtotal,
      currency: totals.currency,
      message: 'Workshop added to cart.'
    };
  }

  getCartContents() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const workshops = this._getFromStorage('workshops', []);

    const itemsRaw = cartItems.filter((ci) => ci.cartId === cart.id);
    const items = itemsRaw.map((ci) => ({
      cart_item: ci,
      workshop: workshops.find((w) => w.id === ci.workshopId) || null
    }));

    let subtotal = 0;
    let currency = 'usd';
    items.forEach((entry) => {
      subtotal += Number(entry.cart_item.total_price || 0);
      if (entry.workshop && entry.workshop.currency) {
        currency = entry.workshop.currency;
      }
    });

    const item_count = items.reduce((sum, entry) => sum + (entry.cart_item.quantity || 0), 0);

    return {
      cart,
      items,
      subtotal,
      currency,
      item_count
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cartItems = this._getFromStorage('cart_items', []);
    const workshops = this._getFromStorage('workshops', []);
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, cart: null, item: null, subtotal: 0, currency: 'usd' };
    }

    const item = cartItems[itemIndex];
    if (quantity <= 0) {
      const cartId = item.cartId;
      cartItems.splice(itemIndex, 1);
      this._saveToStorage('cart_items', cartItems);
      const totals = this._recalculateCartTotals(cartId);
      return {
        success: true,
        cart: totals.cart,
        item: null,
        subtotal: totals.subtotal,
        currency: totals.currency
      };
    }

    item.quantity = Number(quantity);
    item.total_price = item.unit_price * item.quantity;
    cartItems[itemIndex] = item;
    this._saveToStorage('cart_items', cartItems);

    const totals = this._recalculateCartTotals(item.cartId);

    // Foreign key resolution for item: attach workshop if needed
    const workshop = workshops.find((w) => w.id === item.workshopId) || null;
    const resolvedItem = Object.assign({}, item, { workshop });

    return {
      success: true,
      cart: totals.cart,
      item: resolvedItem,
      subtotal: totals.subtotal,
      currency: totals.currency
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items', []);
    const itemIndex = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (itemIndex === -1) {
      return { success: false, cart: null, subtotal: 0, currency: 'usd' };
    }

    const cartId = cartItems[itemIndex].cartId;
    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    const totals = this._recalculateCartTotals(cartId);

    return {
      success: true,
      cart: totals.cart,
      subtotal: totals.subtotal,
      currency: totals.currency
    };
  }

  // Talk topics
  getTalkTopicFilterOptions() {
    const talks = this._getFromStorage('talk_topics', []);
    const tags = this._uniqueStrings(
      talks.reduce((acc, t) => {
        if (Array.isArray(t.tags)) acc.push(...t.tags);
        return acc;
      }, [])
    );

    return {
      industries: [
        { value: 'technology', label: 'Technology' },
        { value: 'engineering', label: 'Engineering' },
        { value: 'finance', label: 'Finance' },
        { value: 'healthcare', label: 'Healthcare' },
        { value: 'education', label: 'Education' },
        { value: 'general_business', label: 'General Business' },
        { value: 'other', label: 'Other' }
      ],
      audience_size_ranges: [
        { min: 1, max: 50, label: 'Up to 50' },
        { min: 50, max: 200, label: '50–200' },
        { min: 200, max: 500, label: '200–500' },
        { min: 500, max: null, label: '500+' }
      ],
      tags
    };
  }

  searchTalkTopics(filters, query, sort_by, limit, offset) {
    let talks = this._getFromStorage('talk_topics', []);
    const f = filters || {};
    const q = query ? String(query).toLowerCase() : null;

    talks = talks.filter((t) => {
      if (f.is_active !== undefined) {
        if (!!t.is_active !== !!f.is_active) return false;
      } else {
        if (t.is_active === false) return false;
      }

      if (f.primary_audience_industry && t.primary_audience_industry) {
        if (t.primary_audience_industry !== f.primary_audience_industry) return false;
      } else if (f.primary_audience_industry && !t.primary_audience_industry) {
        return false;
      }

      if (f.audience_size_min !== undefined && t.audience_size_max !== undefined) {
        if (t.audience_size_max < f.audience_size_min) return false;
      }
      if (f.audience_size_max !== undefined && t.audience_size_min !== undefined) {
        if (t.audience_size_min > f.audience_size_max) return false;
      }

      if (Array.isArray(f.tags) && f.tags.length) {
        const ttTags = Array.isArray(t.tags) ? t.tags : [];
        const hasTag = f.tags.some((tag) => ttTags.indexOf(tag) !== -1);
        if (!hasTag) return false;
      }

      if (q) {
        const text = ((t.title || '') + ' ' + (t.summary || '') + ' ' + (t.description || '') + ' ' + (Array.isArray(t.tags) ? t.tags.join(' ') : '')).toLowerCase();
        if (text.indexOf(q) === -1) return false;
      }

      return true;
    });

    if (sort_by === 'duration_desc') {
      talks.sort((a, b) => b.duration_minutes - a.duration_minutes);
    } else if (sort_by === 'duration_asc') {
      talks.sort((a, b) => a.duration_minutes - b.duration_minutes);
    } else if (sort_by === 'created_desc') {
      talks.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    }

    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return talks.slice(start, end);
  }

  getTalkTopicDetail(talkId) {
    const talks = this._getFromStorage('talk_topics', []);
    const testimonials = this._getFromStorage('testimonials', []);
    const resources = this._getFromStorage('resources', []);
    const shortlist = this._getFromStorage('shortlisted_talks', []);

    const talk = talks.find((t) => t.id === talkId) || null;
    if (!talk) {
      return {
        talk: null,
        key_takeaways: [],
        ideal_audience_description: '',
        related_testimonials: [],
        related_resources: [],
        is_shortlisted: false
      };
    }

    const related_testimonials = testimonials
      .filter((tm) => tm.related_talk_id === talkId)
      .map((tm) => {
        // Foreign key resolution for testimonial.case_study_id and related_talk_id handled in searchTestimonials/getTestimonialDetail
        return tm;
      });

    const talkTags = Array.isArray(talk.tags) ? talk.tags : [];
    const related_resources = resources.filter((r) => {
      const rTags = Array.isArray(r.tags) ? r.tags : [];
      return talkTags.some((tag) => rTags.indexOf(tag) !== -1);
    });

    const shortlisted = shortlist.some((s) => s.talkId === talkId);

    return {
      talk,
      key_takeaways: [],
      ideal_audience_description: talk.recommended_audience || '',
      related_testimonials,
      related_resources,
      is_shortlisted: shortlisted
    };
  }

  addTalkToShortlist(talkId, notes) {
    const talks = this._getFromStorage('talk_topics', []);
    const talk = talks.find((t) => t.id === talkId) || null;
    if (!talk) {
      return { success: false, shortlist_item: null, message: 'Talk not found.' };
    }

    let shortlist = this._getFromStorage('shortlisted_talks', []);

    const existing = shortlist.find((s) => s.talkId === talkId);
    if (existing) {
      return { success: true, shortlist_item: existing, message: 'Talk already shortlisted.' };
    }

    const item = {
      id: this._generateId('shortlist'),
      talkId,
      addedAt: this._now(),
      notes: notes || null
    };

    shortlist.push(item);
    this._saveToStorage('shortlisted_talks', shortlist);

    return { success: true, shortlist_item: item, message: 'Talk added to shortlist.' };
  }

  getShortlistedTalks() {
    const shortlist = this._getFromStorage('shortlisted_talks', []);
    const talks = this._getFromStorage('talk_topics', []);

    return shortlist.map((s) => ({
      talk: talks.find((t) => t.id === s.talkId) || null,
      shortlist: s
    }));
  }

  removeShortlistedTalk(shortlistId) {
    let shortlist = this._getFromStorage('shortlisted_talks', []);
    const originalLength = shortlist.length;
    shortlist = shortlist.filter((s) => s.id !== shortlistId);
    this._saveToStorage('shortlisted_talks', shortlist);
    return { success: shortlist.length < originalLength };
  }

  // Testimonials & case studies
  getTestimonialsFilterOptions() {
    const testimonials = this._getFromStorage('testimonials', []);
    const industriesSet = new Set();
    testimonials.forEach((t) => {
      if (t.industry) industriesSet.add(t.industry);
    });

    const industries = Array.from(industriesSet).map((value) => ({
      value,
      label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    }));

    if (!industries.length) {
      ['technology', 'finance', 'healthcare', 'education', 'non_profit', 'government', 'other'].forEach((value) => {
        industries.push({
          value,
          label: value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        });
      });
    }

    const audience_size_buckets = [
      { min: 1, max: 50, label: 'Up to 50' },
      { min: 50, max: 200, label: '50–200' },
      { min: 200, max: 500, label: '200–500' },
      { min: 500, max: null, label: '500+' }
    ];

    const sort_options = [
      { value: 'rating_desc', label: 'Rating: Highest First' },
      { value: 'rating_asc', label: 'Rating: Lowest First' },
      { value: 'event_date_desc', label: 'Most Recent Events' },
      { value: 'event_date_asc', label: 'Oldest Events' }
    ];

    return { industries, audience_size_buckets, sort_options };
  }

  searchTestimonials(filters, sort_by, limit, offset) {
    let testimonials = this._getFromStorage('testimonials', []);
    const f = filters || {};

    testimonials = testimonials.filter((t) => {
      if (f.industry && t.industry && t.industry !== f.industry) return false;
      if (f.industry && !t.industry) return false;

      if (f.min_audience_size != null && t.audience_size !== undefined && t.audience_size < f.min_audience_size)
        return false;
      if (f.max_audience_size != null && t.audience_size !== undefined && t.audience_size > f.max_audience_size)
        return false;

      if (f.event_type && t.event_type && t.event_type !== f.event_type) return false;
      if (f.event_type && !t.event_type) return false;

      return true;
    });

    if (sort_by === 'rating_desc') {
      testimonials.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort_by === 'rating_asc') {
      testimonials.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    } else if (sort_by === 'event_date_desc') {
      testimonials.sort((a, b) => {
        const da = a.event_date ? new Date(a.event_date).getTime() : 0;
        const db = b.event_date ? new Date(b.event_date).getTime() : 0;
        return db - da;
      });
    } else if (sort_by === 'event_date_asc') {
      testimonials.sort((a, b) => {
        const da = a.event_date ? new Date(a.event_date).getTime() : 0;
        const db = b.event_date ? new Date(b.event_date).getTime() : 0;
        return da - db;
      });
    }

    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    const slice = testimonials.slice(start, end);

    const caseStudies = this._getFromStorage('case_studies', []);
    const talks = this._getFromStorage('talk_topics', []);

    // Foreign key resolution: case_study_id and related_talk_id
    return slice.map((t) => ({
      ...t,
      case_study: t.case_study_id ? caseStudies.find((c) => c.id === t.case_study_id) || null : null,
      related_talk: t.related_talk_id ? talks.find((talk) => talk.id === t.related_talk_id) || null : null
    }));
  }

  getTestimonialDetail(testimonialId) {
    const testimonials = this._getFromStorage('testimonials', []);
    const caseStudies = this._getFromStorage('case_studies', []);
    const talks = this._getFromStorage('talk_topics', []);

    const testimonial = testimonials.find((t) => t.id === testimonialId) || null;
    if (!testimonial) {
      return { testimonial: null, case_study: null, related_talk: null };
    }

    let case_study = null;
    if (testimonial.case_study_id) {
      case_study = caseStudies.find((c) => c.id === testimonial.case_study_id) || null;
    }
    if (!case_study) {
      case_study = caseStudies.find((c) => c.testimonialId === testimonial.id) || null;
    }

    const related_talk = testimonial.related_talk_id
      ? talks.find((talk) => talk.id === testimonial.related_talk_id) || null
      : null;

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task5_lastViewedTestimonial',
        JSON.stringify({ testimonialId: testimonial.id, viewedAt: this._now() })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return { testimonial, case_study, related_talk };
  }

  getCaseStudyDetail(caseStudyId) {
    const caseStudies = this._getFromStorage('case_studies', []);
    const testimonials = this._getFromStorage('testimonials', []);

    const caseStudy = caseStudies.find((c) => c.id === caseStudyId) || null;
    if (!caseStudy) return null;

    let testimonial = null;
    if (caseStudy.testimonialId) {
      testimonial = testimonials.find((t) => t.id === caseStudy.testimonialId) || null;
    } else {
      testimonial = testimonials.find((t) => t.case_study_id === caseStudy.id) || null;
    }

    // Foreign key resolution: include testimonial object
    return {
      ...caseStudy,
      testimonial
    };
  }

  // Blog
  getBlogFilterOptions() {
    const posts = this._getFromStorage('blog_posts', []);
    const tags = this._uniqueStrings(
      posts.reduce((acc, p) => {
        if (Array.isArray(p.tags)) acc.push(...p.tags);
        return acc;
      }, [])
    ).map((value) => ({ value, label: value }));

    let earliest = null;
    let latest = null;
    posts.forEach((p) => {
      if (!p.publishedAt) return;
      const ts = new Date(p.publishedAt).getTime();
      if (!earliest || ts < earliest) earliest = ts;
      if (!latest || ts > latest) latest = ts;
    });

    return {
      tags,
      date_range_defaults: {
        earliest_available: earliest ? new Date(earliest).toISOString() : null,
        latest_available: latest ? new Date(latest).toISOString() : null
      }
    };
  }

  searchBlogPosts(filters, sort_by, limit, offset) {
    let posts = this._getFromStorage('blog_posts', []);
    const f = filters || {};

    posts = posts.filter((p) => {
      if (f.status && p.status && p.status !== f.status) return false;
      if (f.status && !p.status) return false;

      if (Array.isArray(f.tags) && f.tags.length) {
        const pTags = Array.isArray(p.tags) ? p.tags : [];
        const hasTag = f.tags.some((tag) => pTags.indexOf(tag) !== -1);
        if (!hasTag) return false;
      }

      if (f.published_from && p.publishedAt) {
        if (new Date(p.publishedAt).getTime() < new Date(f.published_from).getTime()) return false;
      }
      if (f.published_to && p.publishedAt) {
        if (new Date(p.publishedAt).getTime() > new Date(f.published_to).getTime()) return false;
      }

      return true;
    });

    if (sort_by === 'published_asc') {
      posts.sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return da - db;
      });
    } else if (sort_by === 'published_desc') {
      posts.sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return db - da;
      });
    }

    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return posts.slice(start, end);
  }

  getBlogPostDetail(articleId) {
    const posts = this._getFromStorage('blog_posts', []);
    const readingList = this._getFromStorage('reading_list_items', []);

    const post = posts.find((p) => p.id === articleId) || null;
    if (!post) {
      return { post: null, is_saved: false, estimated_reading_time: null };
    }

    const is_saved = readingList.some((r) => r.articleId === articleId);
    const estimated_reading_time = post.reading_time_minutes || null;

    return { post, is_saved, estimated_reading_time };
  }

  addArticleToReadingList(articleId, notes) {
    const posts = this._getFromStorage('blog_posts', []);
    const post = posts.find((p) => p.id === articleId) || null;
    if (!post) {
      return { success: false, reading_list_item: null, message: 'Article not found.' };
    }

    let readingList = this._getFromStorage('reading_list_items', []);
    const existing = readingList.find((r) => r.articleId === articleId);
    if (existing) {
      return { success: true, reading_list_item: existing, message: 'Article already in reading list.' };
    }

    const item = {
      id: this._generateId('read'),
      articleId,
      addedAt: this._now(),
      notes: notes || null
    };

    readingList.push(item);
    this._saveToStorage('reading_list_items', readingList);

    return { success: true, reading_list_item: item, message: 'Article saved to reading list.' };
  }

  getReadingListItems() {
    const readingList = this._getFromStorage('reading_list_items', []);
    const posts = this._getFromStorage('blog_posts', []);

    return readingList.map((r) => ({
      article: posts.find((p) => p.id === r.articleId) || null,
      reading_list_item: r
    }));
  }

  removeReadingListItem(readingListItemId) {
    let readingList = this._getFromStorage('reading_list_items', []);
    const originalLength = readingList.length;
    readingList = readingList.filter((r) => r.id !== readingListItemId);
    this._saveToStorage('reading_list_items', readingList);
    return { success: readingList.length < originalLength };
  }

  // Pricing calculator
  getPricingCalculatorOptions() {
    return {
      service_types: [
        { value: 'workshop_series', label: 'Workshop Series', description: 'Multi-session workshop packages.' },
        { value: 'single_workshop', label: 'Single Workshop', description: 'One-off deep-dive sessions.' },
        { value: 'keynote', label: 'Keynote', description: 'Conference or company keynotes.' },
        { value: 'consulting', label: 'Consulting', description: 'Advisory and strategy engagements.' },
        { value: 'other', label: 'Other', description: 'Custom engagements.' }
      ],
      formats: [
        { value: 'virtual', label: 'Virtual' },
        { value: 'in_person', label: 'In-person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      session_count_limits: {
        min: 1,
        max: 10,
        default: 3
      },
      default_currency: 'usd'
    };
  }

  calculatePricingEstimate(service_type, number_of_sessions, format, audience_size, budget_max, currency) {
    if (!service_type || !format || audience_size === undefined || audience_size === null || !currency) {
      return { success: false, estimate: null, message: 'Missing required fields.' };
    }

    const calc = this._calculatePricingFromInputs(
      service_type,
      number_of_sessions,
      format,
      audience_size,
      budget_max,
      currency
    );

    const estimates = this._getFromStorage('pricing_estimates', []);
    const now = this._now();

    const estimate = {
      id: this._generateId('est'),
      createdAt: now,
      service_type,
      number_of_sessions: number_of_sessions || null,
      format,
      audience_size: Number(audience_size),
      budget_max: budget_max !== undefined && budget_max !== null ? Number(budget_max) : null,
      currency,
      estimated_price: calc.estimated_price,
      estimate_details: calc.estimate_details,
      email: null,
      email_sent: false
    };

    estimates.push(estimate);
    this._saveToStorage('pricing_estimates', estimates);

    return { success: true, estimate, message: 'Estimate calculated.' };
  }

  emailPricingEstimate(estimateId, email) {
    let estimates = this._getFromStorage('pricing_estimates', []);
    const index = estimates.findIndex((e) => e.id === estimateId);
    if (index === -1) {
      return { success: false, estimate: null, message: 'Estimate not found.' };
    }

    const estimate = estimates[index];
    estimate.email = email || null;
    estimate.email_sent = !!email;
    estimates[index] = estimate;
    this._saveToStorage('pricing_estimates', estimates);

    return { success: true, estimate, message: 'Estimate email status updated (simulated).' };
  }

  // Calendar & availability
  getCalendarMonthAvailability(year, month) {
    const days = this._getFromStorage('calendar_day_availability', []);
    const results = [];

    days.forEach((d) => {
      if (!d.date) return;
      const dateObj = new Date(d.date);
      const yearUtc = dateObj.getUTCFullYear();
      const monthUtc = dateObj.getUTCMonth() + 1;
      if (yearUtc === year && monthUtc === month) {
        const weekdayIndex = dateObj.getUTCDay();
        const weekdayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        results.push({
          day: d,
          day_of_month: dateObj.getUTCDate(),
          weekday: weekdayNames[weekdayIndex],
          is_weekend: weekdayIndex === 0 || weekdayIndex === 6
        });
      }
    });

    results.sort((a, b) => a.day_of_month - b.day_of_month);
    return results;
  }

  submitAvailabilityRequest(
    calendarDayId,
    requested_date,
    event_type,
    format,
    event_name,
    audience_size,
    organization_name,
    contact_name,
    contact_email,
    notes
  ) {
    if (!requested_date || !event_type || !format || !contact_name || !contact_email) {
      return { success: false, availability_request: null, message: 'Missing required fields.' };
    }

    const requests = this._getFromStorage('availability_requests', []);
    const request = {
      id: this._generateId('avail'),
      createdAt: this._now(),
      calendarDayId: calendarDayId || null,
      requested_date,
      event_type,
      format,
      event_name: event_name || null,
      audience_size: audience_size !== undefined && audience_size !== null ? Number(audience_size) : null,
      organization_name: organization_name || null,
      contact_name,
      contact_email,
      notes: notes || null,
      source: 'schedule_page'
    };

    requests.push(request);
    this._saveToStorage('availability_requests', requests);

    return { success: true, availability_request: request, message: 'Availability request submitted.' };
  }

  // Resources
  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources', []);
    const tags = this._uniqueStrings(
      resources.reduce((acc, r) => {
        if (Array.isArray(r.tags)) acc.push(...r.tags);
        return acc;
      }, [])
    );

    return {
      types: [
        { value: 'checklist', label: 'Checklist' },
        { value: 'guide', label: 'Guide' },
        { value: 'template', label: 'Template' },
        { value: 'toolkit', label: 'Toolkit' },
        { value: 'video', label: 'Video' },
        { value: 'audio', label: 'Audio' },
        { value: 'other', label: 'Other' }
      ],
      price_types: [
        { value: 'free', label: 'Free' },
        { value: 'paid', label: 'Paid' }
      ],
      tags
    };
  }

  searchResources(query, filters, sort_by, limit, offset) {
    let resources = this._getFromStorage('resources', []);
    const f = filters || {};
    const q = query ? String(query).toLowerCase() : null;

    resources = resources.filter((r) => {
      if (f.is_active !== undefined) {
        if (!!r.is_active !== !!f.is_active) return false;
      } else {
        if (r.is_active === false) return false;
      }

      if (Array.isArray(f.types) && f.types.length && f.types.indexOf(r.type) === -1) return false;

      if (Array.isArray(f.price_types) && f.price_types.length && f.price_types.indexOf(r.price_type) === -1)
        return false;

      if (f.price_max !== undefined && r.price !== undefined && r.price !== null && r.price > f.price_max) return false;

      if (Array.isArray(f.tags) && f.tags.length) {
        const rTags = Array.isArray(r.tags) ? r.tags : [];
        const hasTag = f.tags.some((tag) => rTags.indexOf(tag) !== -1);
        if (!hasTag) return false;
      }

      if (q) {
        const text = ((r.title || '') + ' ' + (r.description || '') + ' ' + (Array.isArray(r.tags) ? r.tags.join(' ') : '')).toLowerCase();
        if (text.indexOf(q) === -1) return false;
      }

      return true;
    });

    if (sort_by === 'created_desc') {
      resources.sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return db - da;
      });
    } else if (sort_by === 'title_asc') {
      resources.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    const start = offset || 0;
    const end = limit ? start + limit : undefined;
    return resources.slice(start, end);
  }

  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources', []);
    const saved = this._getFromStorage('saved_resources', []);

    const resource = resources.find((r) => r.id === resourceId) || null;
    if (!resource) {
      return {
        resource: null,
        is_saved: false,
        download_available: false,
        file_info: { file_type: null }
      };
    }

    const is_saved = saved.some((s) => s.resourceId === resourceId);
    const download_available =
      resource.is_active !== false && resource.price_type === 'free' && !!resource.file_url;

    return {
      resource,
      is_saved,
      download_available,
      file_info: { file_type: resource.file_type || null }
    };
  }

  saveResourceToLibrary(resourceId, notes) {
    const resources = this._getFromStorage('resources', []);
    const resource = resources.find((r) => r.id === resourceId) || null;
    if (!resource) {
      return { success: false, saved_resource: null, message: 'Resource not found.' };
    }

    let saved = this._getFromStorage('saved_resources', []);
    const existing = saved.find((s) => s.resourceId === resourceId);
    if (existing) {
      return { success: true, saved_resource: existing, message: 'Resource already saved.' };
    }

    const item = {
      id: this._generateId('savedres'),
      resourceId,
      addedAt: this._now(),
      notes: notes || null
    };

    saved.push(item);
    this._saveToStorage('saved_resources', saved);

    return { success: true, saved_resource: item, message: 'Resource saved to library.' };
  }

  getSavedResources() {
    const saved = this._getFromStorage('saved_resources', []);
    const resources = this._getFromStorage('resources', []);

    return saved.map((s) => ({
      resource: resources.find((r) => r.id === s.resourceId) || null,
      saved: s
    }));
  }

  removeSavedResource(savedResourceId) {
    let saved = this._getFromStorage('saved_resources', []);
    const originalLength = saved.length;
    saved = saved.filter((s) => s.id !== savedResourceId);
    this._saveToStorage('saved_resources', saved);
    return { success: saved.length < originalLength };
  }

  // Download button click handler on the resource detail page
  onDownloadResourceClick(resourceId) {
    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task9_lastDownloadedResource',
        JSON.stringify({ resourceId: resourceId, downloadedAt: new Date().toISOString() })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }
    // This method intentionally does not initiate the actual download;
    // that should be handled by the UI layer.
  }

  // Saved items overview
  getSavedItemsOverview(view) {
    const allowedViews = ['shortlist', 'reading_list', 'my_library', 'all'];
    let current_view = view && allowedViews.indexOf(view) !== -1 ? view : null;
    if (!current_view) {
      const uiState = this._getFromStorage('ui_state', null);
      if (uiState && uiState.saved_items_view && allowedViews.indexOf(uiState.saved_items_view) !== -1) {
        current_view = uiState.saved_items_view;
      } else {
        current_view = 'all';
      }
    }

    this._updateUiState(current_view);

    const shortlist_items = this.getShortlistedTalks();
    const reading_list_items = this.getReadingListItems();
    const saved_resources = this.getSavedResources();

    return {
      current_view,
      shortlist_items,
      reading_list_items,
      saved_resources
    };
  }

  setSavedItemsViewPreference(view) {
    const allowedViews = ['shortlist', 'reading_list', 'my_library', 'all'];
    if (allowedViews.indexOf(view) === -1) {
      // Keep previous state if invalid
      const uiState = this._getFromStorage('ui_state', null) || null;
      return { ui_state: uiState };
    }
    const ui_state = this._updateUiState(view);
    return { ui_state };
  }

  // About page
  getAboutPageContent() {
    return {
      bio_html:
        '<p>Drawing on years of experience leading engineering teams, the speaker focuses on practical, story-driven talks that help technical leaders communicate clearly, lead with confidence, and navigate remote and hybrid work.</p>',
      focus_areas: ['Engineering leadership', 'Team communication', 'Remote and hybrid work', 'Storytelling for influence'],
      signature_topics: [
        'Leading Engineering Teams Through Change',
        'Communication Rituals for Distributed Teams',
        'Storytelling for Technical Leaders'
      ],
      past_clients: [],
      media_mentions: []
    };
  }

  // Contact page
  getContactPageContent() {
    return {
      business_email: 'hello@example.com',
      phone: null,
      mailing_address: null,
      social_profiles: [
        { platform: 'linkedin', label: 'LinkedIn' },
        { platform: 'twitter', label: 'Twitter' }
      ],
      quick_links: ['book_the_speaker', 'resources']
    };
  }

  submitContactMessage(name, email, topic, company, message) {
    if (!name || !email || !message) {
      return { success: false, message_id: null, confirmation: 'Missing required fields.' };
    }

    const messages = this._getFromStorage('contact_messages', []);
    const msg = {
      id: this._generateId('contact'),
      name,
      email,
      topic: topic || null,
      company: company || null,
      message,
      createdAt: this._now()
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      success: true,
      message_id: msg.id,
      confirmation: 'Your message has been received (simulated).'
    };
  }

  // Policies
  getPoliciesContent() {
    return {
      privacy_policy_html:
        '<p>Your privacy is important. This site stores only the data you provide (such as inquiries, subscriptions, and saved items) in your local environment for demonstration purposes.</p>',
      terms_of_use_html:
        '<p>By using this site you agree that all interactions are for informational and demonstration purposes only.</p>',
      last_updated: '2024-01-01T00:00:00.000Z'
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