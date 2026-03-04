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

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    const collections = [
      // Core domain collections
      'boilers',
      'thermostats',
      'optional_services',
      'service_plans',
      'service_plan_signups',
      'offers',
      'promotions',
      'installation_bookings',
      'appointment_slots',
      'installation_quotes',
      'quote_items',
      'service_coverage_areas',
      'coverage_checks',
      'callback_requests',
      'faq_categories',
      'faq_articles',
      'live_chat_conversations',
      'live_chat_messages',
      'heating_calculation_sessions',
      'comparison_lists',
      'customer_reviews',
      'package_templates',
      'package_configurations',
      // Additional internal collections
      'contact_enquiries'
    ];

    for (let i = 0; i < collections.length; i++) {
      const key = collections[i];
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (localStorage.getItem('idCounter') === null) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (raw === null || typeof raw === 'undefined') {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(raw);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  _getCurrencySymbol(currency) {
    if (currency === 'gbp') return '£';
    if (currency === 'eur') return '€';
    return '$';
  }

  _formatMoney(amount, currency) {
    const symbol = this._getCurrencySymbol(currency || 'usd');
    const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
    return symbol + num.toFixed(2);
  }

  _parseDate(dateStr) {
    // Safe date parsing; returns Date or null
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // ----------------------
  // Foreign key augmentation helpers
  // ----------------------

  _augmentOffer(offer) {
    if (!offer) return null;
    const thermostats = this._getFromStorage('thermostats');
    const o = this._clone(offer);
    if (o.free_thermostat_id) {
      o.free_thermostat = thermostats.find(function (t) { return t.id === o.free_thermostat_id; }) || null;
    } else {
      o.free_thermostat = null;
    }
    return o;
  }

  _augmentPromotion(promotion) {
    if (!promotion) return null;
    const offers = this._getFromStorage('offers');
    const thermostats = this._getFromStorage('thermostats');
    const optionalServices = this._getFromStorage('optional_services');
    const p = this._clone(promotion);

    if (p.offer_id) {
      p.offer = this._augmentOffer(offers.find(function (o) { return o.id === p.offer_id; }) || null);
    } else {
      p.offer = null;
    }

    if (p.free_product_id) {
      if (p.free_product_type === 'smart_thermostat' || p.free_product_type === 'standard_thermostat') {
        p.free_product = thermostats.find(function (t) { return t.id === p.free_product_id; }) || null;
      } else if (p.free_product_type === 'optional_service') {
        p.free_product = optionalServices.find(function (s) { return s.id === p.free_product_id; }) || null;
      } else {
        p.free_product = null;
      }
    } else {
      p.free_product = null;
    }

    return p;
  }

  _augmentCustomerReview(review) {
    if (!review) return null;
    const boilers = this._getFromStorage('boilers');
    const r = this._clone(review);
    if (r.boiler_id) {
      r.boiler = boilers.find(function (b) { return b.id === r.boiler_id; }) || null;
    } else {
      r.boiler = null;
    }
    return r;
  }

  _augmentInstallationBooking(booking) {
    if (!booking) return null;
    const appointmentSlots = this._getFromStorage('appointment_slots');
    const offers = this._getFromStorage('offers');
    const promotions = this._getFromStorage('promotions');

    const b = this._clone(booking);

    if (b.selected_appointment_slot_id) {
      b.selected_appointment_slot = appointmentSlots.find(function (s) { return s.id === b.selected_appointment_slot_id; }) || null;
    } else {
      b.selected_appointment_slot = null;
    }

    if (b.applied_offer_id) {
      const offer = offers.find(function (o) { return o.id === b.applied_offer_id; }) || null;
      b.applied_offer = this._augmentOffer(offer);
    } else {
      b.applied_offer = null;
    }

    if (b.applied_promotion_id) {
      const promotion = promotions.find(function (p) { return p.id === b.applied_promotion_id; }) || null;
      b.applied_promotion = this._augmentPromotion(promotion);
    } else {
      b.applied_promotion = null;
    }

    return b;
  }

  _augmentFAQArticle(article) {
    if (!article) return null;
    const categories = this._getFromStorage('faq_categories');
    const a = this._clone(article);
    if (a.category_id) {
      a.category = categories.find(function (c) { return c.id === a.category_id; }) || null;
    } else {
      a.category = null;
    }
    return a;
  }

  _augmentCoverageCheck(check) {
    if (!check) return null;
    const areas = this._getFromStorage('service_coverage_areas');
    const c = this._clone(check);
    if (c.coverage_area_id) {
      c.coverage_area = areas.find(function (a) { return a.id === c.coverage_area_id; }) || null;
    } else {
      c.coverage_area = null;
    }
    return c;
  }

  _augmentLiveChatMessage(message) {
    if (!message) return null;
    const conversations = this._getFromStorage('live_chat_conversations');
    const m = this._clone(message);
    if (m.conversation_id) {
      m.conversation = conversations.find(function (c) { return c.id === m.conversation_id; }) || null;
    } else {
      m.conversation = null;
    }
    return m;
  }

  _augmentInstallationQuoteItems(items) {
    const boilers = this._getFromStorage('boilers');
    const thermostats = this._getFromStorage('thermostats');
    const optionalServices = this._getFromStorage('optional_services');

    return items.map(function (item) {
      const it = JSON.parse(JSON.stringify(item));
      if (it.item_type === 'boiler' && it.item_ref_id) {
        it.boiler = boilers.find(function (b) { return b.id === it.item_ref_id; }) || null;
      } else if (it.item_type === 'thermostat' && it.item_ref_id) {
        it.thermostat = thermostats.find(function (t) { return t.id === it.item_ref_id; }) || null;
      } else if (it.item_type === 'optional_service' && it.item_ref_id) {
        it.optional_service = optionalServices.find(function (s) { return s.id === it.item_ref_id; }) || null;
      }
      return it;
    });
  }

  _augmentPackageTemplate(template) {
    if (!template) return null;
    const boilers = this._getFromStorage('boilers');
    const thermostats = this._getFromStorage('thermostats');
    const optionalServices = this._getFromStorage('optional_services');
    const t = this._clone(template);
    if (t.boiler_id) {
      t.boiler = boilers.find(function (b) { return b.id === t.boiler_id; }) || null;
    } else {
      t.boiler = null;
    }
    if (t.thermostat_id) {
      t.thermostat = thermostats.find(function (th) { return th.id === t.thermostat_id; }) || null;
    } else {
      t.thermostat = null;
    }
    if (Array.isArray(t.optional_service_ids)) {
      t.optional_services = t.optional_service_ids.map(function (id) {
        return optionalServices.find(function (s) { return s.id === id; }) || null;
      }).filter(function (s) { return !!s; });
    } else {
      t.optional_services = [];
    }
    return t;
  }

  _recalculateInstallationQuoteTotal(quoteId) {
    const quotes = this._getFromStorage('installation_quotes');
    const items = this._getFromStorage('quote_items');
    const quoteIndex = quotes.findIndex(function (q) { return q.id === quoteId; });
    if (quoteIndex === -1) return null;
    const quote = quotes[quoteIndex];

    const relatedItems = items.filter(function (it) { return it.quote_id === quote.id; });
    let total = 0;
    for (let i = 0; i < relatedItems.length; i++) {
      const it = relatedItems[i];
      if (!it.is_included) {
        total += typeof it.total_price === 'number' ? it.total_price : 0;
      }
    }
    quote.total_estimated_price = total;
    if (!quote.currency) {
      // Try infer from boiler
      const boilers = this._getFromStorage('boilers');
      const boilerItem = relatedItems.find(function (it) { return it.item_type === 'boiler'; });
      if (boilerItem && boilerItem.item_ref_id) {
        const b = boilers.find(function (bo) { return bo.id === boilerItem.item_ref_id; });
        if (b && b.currency) quote.currency = b.currency;
      }
    }

    quotes[quoteIndex] = quote;
    this._saveToStorage('installation_quotes', quotes);
    return quote;
  }

  _recalculatePackageTotal(configuration) {
    const boilers = this._getFromStorage('boilers');
    const thermostats = this._getFromStorage('thermostats');
    const optionalServices = this._getFromStorage('optional_services');

    let total = 0;
    let currency = configuration.currency || 'usd';

    if (configuration.boiler_id) {
      const b = boilers.find(function (bo) { return bo.id === configuration.boiler_id; });
      if (b) {
        total += typeof b.price === 'number' ? b.price : 0;
        currency = b.currency || currency;
      }
    }

    if (configuration.thermostat_id) {
      const t = thermostats.find(function (th) { return th.id === configuration.thermostat_id; });
      if (t) {
        total += typeof t.price === 'number' ? t.price : 0;
        if (!configuration.boiler_id) {
          currency = t.currency || currency;
        }
      }
    }

    if (Array.isArray(configuration.optional_service_ids)) {
      for (let i = 0; i < configuration.optional_service_ids.length; i++) {
        const id = configuration.optional_service_ids[i];
        const svc = optionalServices.find(function (s) { return s.id === id; });
        if (svc) {
          total += typeof svc.base_price === 'number' ? svc.base_price : 0;
          if (!configuration.boiler_id && !configuration.thermostat_id) {
            currency = svc.currency || currency;
          }
        }
      }
    }

    configuration.total_price = total;
    configuration.currency = currency;
    return configuration;
  }

  // ----------------------
  // Private helpers required by spec
  // ----------------------

  _getOrCreateInstallationBookingDraft() {
    const currentId = localStorage.getItem('currentInstallationBookingId');
    let bookings = this._getFromStorage('installation_bookings');

    if (currentId) {
      const existing = bookings.find(function (b) { return b.id === currentId; });
      if (existing) return existing;
    }

    const id = this._generateId('installation_booking');
    const now = this._now();
    const booking = {
      id: id,
      booking_reference: 'IB-' + id,
      status: 'draft',
      created_at: now,
      updated_at: now,
      property_postcode: null,
      property_bedrooms: null,
      property_bathrooms: null,
      property_type: null,
      installation_type: 'standard_boiler_installation',
      preferred_installation_date: null,
      selected_appointment_slot_id: null,
      payment_preference: 'pay_after_installation',
      customer_full_name: '',
      customer_phone: '',
      customer_email: '',
      applied_offer_id: null,
      applied_promotion_id: null,
      free_thermostat_included: false,
      total_estimated_price: null,
      currency: null,
      deposit_amount: null,
      notes: null
    };
    bookings.push(booking);
    this._saveToStorage('installation_bookings', bookings);
    localStorage.setItem('currentInstallationBookingId', booking.id);
    return booking;
  }

  _getOrCreateInstallationQuote(boilerId) {
    const currentId = localStorage.getItem('currentInstallationQuoteId');
    let quotes = this._getFromStorage('installation_quotes');

    if (currentId) {
      const existing = quotes.find(function (q) { return q.id === currentId; });
      if (existing) return existing;
    }

    const id = this._generateId('installation_quote');
    const now = this._now();

    const boilers = this._getFromStorage('boilers');
    const boiler = boilers.find(function (b) { return b.id === boilerId; }) || null;

    const quote = {
      id: id,
      boiler_id: boilerId,
      created_at: now,
      updated_at: now,
      preferred_installation_option: 'not_sure_yet',
      preferred_installation_date: null,
      total_estimated_price: boiler && typeof boiler.price === 'number' ? boiler.price : 0,
      currency: boiler && boiler.currency ? boiler.currency : 'usd',
      status: 'draft',
      notes: null
    };

    quotes.push(quote);
    this._saveToStorage('installation_quotes', quotes);
    localStorage.setItem('currentInstallationQuoteId', quote.id);
    return quote;
  }

  _getOrCreateComparisonList() {
    const currentId = localStorage.getItem('currentComparisonListId');
    let lists = this._getFromStorage('comparison_lists');
    if (currentId) {
      const existing = lists.find(function (l) { return l.id === currentId; });
      if (existing) return existing;
    }

    const id = this._generateId('comparison_list');
    const now = this._now();
    const list = {
      id: id,
      name: 'Boiler comparison',
      boiler_ids: [],
      created_at: now,
      last_updated: now
    };
    lists.push(list);
    this._saveToStorage('comparison_lists', lists);
    localStorage.setItem('currentComparisonListId', id);
    return list;
  }

  _getOrCreatePackageConfiguration(targetBudget, currency) {
    const currentId = localStorage.getItem('currentPackageConfigurationId');
    let configs = this._getFromStorage('package_configurations');
    if (currentId) {
      const existing = configs.find(function (c) { return c.id === currentId; });
      if (existing) return existing;
    }

    const id = this._generateId('package_configuration');
    const now = this._now();
    const config = {
      id: id,
      name: null,
      boiler_id: null,
      thermostat_id: null,
      optional_service_ids: [],
      total_price: 0,
      target_budget: typeof targetBudget === 'number' ? targetBudget : null,
      currency: currency || 'usd',
      status: 'draft',
      steps_completed: [],
      created_at: now,
      updated_at: now
    };
    configs.push(config);
    this._saveToStorage('package_configurations', configs);
    localStorage.setItem('currentPackageConfigurationId', id);
    return config;
  }

  _getOrCreateLiveChatConversation() {
    const currentId = localStorage.getItem('currentLiveChatConversationId');
    let conversations = this._getFromStorage('live_chat_conversations');
    if (currentId) {
      const existing = conversations.find(function (c) { return c.id === currentId && c.status === 'open'; });
      if (existing) return existing;
    }
    const id = this._generateId('live_chat_conversation');
    const now = this._now();
    const convo = {
      id: id,
      started_at: now,
      ended_at: null,
      status: 'open',
      source: 'other',
      originating_article_id: null,
      topic: null
    };
    conversations.push(convo);
    this._saveToStorage('live_chat_conversations', conversations);
    localStorage.setItem('currentLiveChatConversationId', id);
    return convo;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomePageSummary
  getHomePageSummary() {
    const offers = this._getFromStorage('offers');
    const reviews = this._getFromStorage('customer_reviews');

    const nowIso = this._now();
    const nowDate = this._parseDate(nowIso);

    const highlighted_offers = offers
      .filter(function (o) {
        if (!o.is_active) return false;
        if (o.end_date) {
          const d = new Date(o.end_date);
          if (isNaN(d.getTime())) return true;
          return d >= nowDate;
        }
        return true;
      })
      .sort(function (a, b) {
        const da = new Date(a.end_date || a.start_date || nowIso);
        const db = new Date(b.end_date || b.start_date || nowIso);
        return da - db;
      })
      .slice(0, 3)
      .map((offer) => {
        const augmented = this._augmentOffer(offer);
        let validity_summary = '';
        if (offer.start_date || offer.end_date) {
          validity_summary = 'Valid';
          if (offer.start_date) validity_summary += ' from ' + offer.start_date.substring(0, 10);
          if (offer.end_date) validity_summary += ' until ' + offer.end_date.substring(0, 10);
        }
        return {
          offer: augmented,
          display_title: offer.short_title || offer.title,
          badge_text: offer.is_active ? 'Limited time' : 'Expired',
          validity_summary: validity_summary
        };
      });

    const fiveStar = reviews
      .filter(function (r) { return r.rating === 5; })
      .sort(function (a, b) {
        const da = new Date(a.created_at);
        const db = new Date(b.created_at);
        return db - da;
      })
      .slice(0, 3)
      .map((rev) => {
        const augmented = this._augmentCustomerReview(rev);
        const body = augmented.review_body || '';
        const short = body.length > 140 ? body.substring(0, 137) + '...' : body;
        let label = 'Other service';
        if (augmented.service_type === 'boiler_installation') label = 'Boiler installation';
        else if (augmented.service_type === 'service_plan') label = 'Service plan';
        else if (augmented.service_type === 'repair') label = 'Repair';
        return {
          review: augmented,
          short_excerpt: short,
          service_type_label: label
        };
      });

    const quick_links = [
      { label: 'Book installation', target: 'booking_installation' },
      { label: 'Boilers', target: 'boilers' },
      { label: 'Service plans', target: 'service_plans' },
      { label: 'Packages', target: 'packages' },
      { label: 'Tools', target: 'tools' },
      { label: 'Reviews', target: 'reviews' }
    ];

    return {
      hero: {
        headline: 'Gas boiler installation and heating experts',
        subheadline: 'Efficient, reliable boiler installs with flexible payment options.',
        primary_cta_label: 'Book your installation',
        primary_cta_target: 'booking_installation'
      },
      coverage_checker: {
        input_placeholder: 'Enter your postcode to check coverage',
        button_label: 'Check coverage',
        helper_text: 'We currently cover selected areas for installation and servicing.'
      },
      highlighted_offers: highlighted_offers,
      quick_links: quick_links,
      recent_five_star_reviews: fiveStar
    };
  }

  // startInstallationBooking
  startInstallationBooking(installationType) {
    const type = installationType || 'standard_boiler_installation';
    const now = this._now();
    const id = this._generateId('installation_booking');

    const booking = {
      id: id,
      booking_reference: 'IB-' + id,
      status: 'draft',
      created_at: now,
      updated_at: now,
      property_postcode: null,
      property_bedrooms: null,
      property_bathrooms: null,
      property_type: null,
      installation_type: type,
      preferred_installation_date: null,
      selected_appointment_slot_id: null,
      payment_preference: 'pay_after_installation',
      customer_full_name: '',
      customer_phone: '',
      customer_email: '',
      applied_offer_id: null,
      applied_promotion_id: null,
      free_thermostat_included: false,
      total_estimated_price: null,
      currency: null,
      deposit_amount: null,
      notes: null
    };

    const bookings = this._getFromStorage('installation_bookings');
    bookings.push(booking);
    this._saveToStorage('installation_bookings', bookings);
    localStorage.setItem('currentInstallationBookingId', booking.id);

    return {
      booking: this._augmentInstallationBooking(booking),
      next_step: 'property_details'
    };
  }

  // startInstallationBookingFromOffer
  startInstallationBookingFromOffer(offerId) {
    const offers = this._getFromStorage('offers');
    const promotions = this._getFromStorage('promotions');

    const offer = offers.find(function (o) { return o.id === offerId; });
    if (!offer) {
      throw new Error('Offer not found');
    }

    const relatedPromotion = promotions.find(function (p) {
      return p.offer_id === offer.id && p.is_active;
    }) || null;

    const now = this._now();
    const id = this._generateId('installation_booking');

    const booking = {
      id: id,
      booking_reference: 'IB-' + id,
      status: 'draft',
      created_at: now,
      updated_at: now,
      property_postcode: null,
      property_bedrooms: null,
      property_bathrooms: null,
      property_type: null,
      installation_type: 'standard_boiler_installation',
      preferred_installation_date: null,
      selected_appointment_slot_id: null,
      payment_preference: 'pay_after_installation',
      customer_full_name: '',
      customer_phone: '',
      customer_email: '',
      applied_offer_id: offer.id,
      applied_promotion_id: relatedPromotion ? relatedPromotion.id : null,
      free_thermostat_included: relatedPromotion && relatedPromotion.promotion_type === 'free_product' && relatedPromotion.free_product_type === 'smart_thermostat',
      total_estimated_price: null,
      currency: null,
      deposit_amount: null,
      notes: null
    };

    const bookings = this._getFromStorage('installation_bookings');
    bookings.push(booking);
    this._saveToStorage('installation_bookings', bookings);
    localStorage.setItem('currentInstallationBookingId', booking.id);

    return {
      booking: this._augmentInstallationBooking(booking),
      offer: this._augmentOffer(offer),
      promotion: this._augmentPromotion(relatedPromotion),
      next_step: 'booking_form_property_details'
    };
  }

  // startInstallationBookingFromBoiler
  startInstallationBookingFromBoiler(boilerId, installationType) {
    const boilers = this._getFromStorage('boilers');
    const boiler = boilers.find(function (b) { return b.id === boilerId; });
    if (!boiler) {
      throw new Error('Boiler not found');
    }

    const type = installationType || 'standard_boiler_installation';
    const now = this._now();
    const id = this._generateId('installation_booking');

    const booking = {
      id: id,
      booking_reference: 'IB-' + id,
      status: 'draft',
      created_at: now,
      updated_at: now,
      property_postcode: null,
      property_bedrooms: null,
      property_bathrooms: null,
      property_type: null,
      installation_type: type,
      preferred_installation_date: null,
      selected_appointment_slot_id: null,
      payment_preference: 'pay_after_installation',
      customer_full_name: '',
      customer_phone: '',
      customer_email: '',
      applied_offer_id: null,
      applied_promotion_id: null,
      free_thermostat_included: false,
      total_estimated_price: boiler.price || null,
      currency: boiler.currency || null,
      deposit_amount: null,
      notes: null
    };

    const bookings = this._getFromStorage('installation_bookings');
    bookings.push(booking);
    this._saveToStorage('installation_bookings', bookings);
    localStorage.setItem('currentInstallationBookingId', booking.id);

    // Instrumentation for task completion tracking (task_8)
    try {
      localStorage.setItem('task8_bookingBoilerId', boilerId);
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      booking: this._augmentInstallationBooking(booking),
      boiler: boiler,
      next_step: 'property_details'
    };
  }

  // getInstallationBookingDetails
  getInstallationBookingDetails(bookingId) {
    const bookings = this._getFromStorage('installation_bookings');
    const booking = bookings.find(function (b) { return b.id === bookingId; });
    if (!booking) throw new Error('Installation booking not found');
    return this._augmentInstallationBooking(booking);
  }

  // updateInstallationBookingPropertyDetails
  updateInstallationBookingPropertyDetails(bookingId, propertyBedrooms, propertyBathrooms, propertyType, propertyPostcode) {
    const bookings = this._getFromStorage('installation_bookings');
    const index = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (index === -1) throw new Error('Installation booking not found');

    const booking = bookings[index];
    if (typeof propertyBedrooms !== 'undefined') booking.property_bedrooms = propertyBedrooms;
    if (typeof propertyBathrooms !== 'undefined') booking.property_bathrooms = propertyBathrooms;
    if (typeof propertyType !== 'undefined') booking.property_type = propertyType;
    if (typeof propertyPostcode !== 'undefined') booking.property_postcode = propertyPostcode;
    booking.updated_at = this._now();

    bookings[index] = booking;
    this._saveToStorage('installation_bookings', bookings);

    return this._augmentInstallationBooking(booking);
  }

  // getAvailableAppointmentSlots
  getAvailableAppointmentSlots(installationType, fromDate, timeWindowStart, timeWindowEnd, limitDays) {
    const slots = this._getFromStorage('appointment_slots');

    const from = this._parseDate(fromDate || this._now());
    let to = null;
    if (typeof limitDays === 'number' && limitDays > 0) {
      to = new Date(from.getTime());
      to.setDate(to.getDate() + limitDays);
    }

    const filtered = slots
      .filter(function (slot) {
        if (!slot.is_available) return false;
        if (installationType && slot.installation_type && slot.installation_type !== installationType) return false;

        const start = new Date(slot.start_datetime);
        if (isNaN(start.getTime())) return false;
        if (start < from) return false;
        if (to && start > to) return false;

        if (timeWindowStart || timeWindowEnd) {
          const hhmm = slot.start_datetime.substring(11, 16);
          if (timeWindowStart && hhmm < timeWindowStart) return false;
          if (timeWindowEnd && hhmm > timeWindowEnd) return false;
        }
        return true;
      })
      .sort(function (a, b) {
        const da = new Date(a.start_datetime);
        const db = new Date(b.start_datetime);
        return da - db;
      });

    const earliest_matching_slot_id = filtered.length > 0 ? filtered[0].id : null;

    return {
      slots: filtered,
      earliest_matching_slot_id: earliest_matching_slot_id
    };
  }

  // selectInstallationAppointmentSlot
  selectInstallationAppointmentSlot(bookingId, appointmentSlotId) {
    const bookings = this._getFromStorage('installation_bookings');
    const slots = this._getFromStorage('appointment_slots');

    const bookingIndex = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (bookingIndex === -1) throw new Error('Installation booking not found');

    const slot = slots.find(function (s) { return s.id === appointmentSlotId; });
    if (!slot || !slot.is_available) throw new Error('Appointment slot not available');

    const booking = bookings[bookingIndex];
    booking.selected_appointment_slot_id = slot.id;
    booking.preferred_installation_date = slot.start_datetime;
    booking.updated_at = this._now();

    bookings[bookingIndex] = booking;
    this._saveToStorage('installation_bookings', bookings);

    return this._augmentInstallationBooking(booking);
  }

  // updateInstallationBookingContactDetails
  updateInstallationBookingContactDetails(bookingId, fullName, phone, email) {
    const bookings = this._getFromStorage('installation_bookings');
    const index = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (index === -1) throw new Error('Installation booking not found');

    const booking = bookings[index];
    booking.customer_full_name = fullName;
    booking.customer_phone = phone;
    booking.customer_email = email;
    booking.updated_at = this._now();

    bookings[index] = booking;
    this._saveToStorage('installation_bookings', bookings);

    return this._augmentInstallationBooking(booking);
  }

  // getAvailableBookingPaymentOptions
  getAvailableBookingPaymentOptions(bookingId) {
    // bookingId included for future context rules; currently unused
    const options = [
      {
        value: 'pay_after_installation',
        label: 'Pay after installation',
        description: 'Pay the full balance once your installation is complete.'
      },
      {
        value: 'pay_upfront',
        label: 'Pay upfront',
        description: 'Pay in full ahead of your installation date.'
      },
      {
        value: 'finance_plan',
        label: 'Finance plan',
        description: 'Spread the cost with a finance agreement (subject to status).'
      }
    ];
    return {
      payment_options: options,
      default_option: 'pay_after_installation'
    };
  }

  // setInstallationBookingPaymentPreference
  setInstallationBookingPaymentPreference(bookingId, paymentPreference) {
    const allowed = ['pay_after_installation', 'pay_upfront', 'finance_plan'];
    if (allowed.indexOf(paymentPreference) === -1) {
      throw new Error('Invalid payment preference');
    }

    const bookings = this._getFromStorage('installation_bookings');
    const index = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (index === -1) throw new Error('Installation booking not found');

    const booking = bookings[index];
    booking.payment_preference = paymentPreference;
    booking.updated_at = this._now();

    bookings[index] = booking;
    this._saveToStorage('installation_bookings', bookings);

    return this._augmentInstallationBooking(booking);
  }

  // getAvailableBookingPromotions
  getAvailableBookingPromotions(bookingId) {
    const bookings = this._getFromStorage('installation_bookings');
    const promotions = this._getFromStorage('promotions');

    const booking = bookings.find(function (b) { return b.id === bookingId; });
    if (!booking) throw new Error('Installation booking not found');

    const now = this._now();
    const nowDate = new Date(now);

    const applicable = promotions.filter(function (p) {
      if (!p.is_active) return false;
      if (p.valid_from) {
        const d = new Date(p.valid_from);
        if (!isNaN(d.getTime()) && d > nowDate) return false;
      }
      if (p.valid_to) {
        const d2 = new Date(p.valid_to);
        if (!isNaN(d2.getTime()) && d2 < nowDate) return false;
      }
      if (p.offer_id && booking.applied_offer_id && p.offer_id === booking.applied_offer_id) return true;
      if (!p.offer_id) return true;
      return false;
    });

    const result = applicable.map((promo) => {
      const augmented = this._augmentPromotion(promo);
      let label = augmented.name;
      let short_description = augmented.description || '';
      if (augmented.promotion_type === 'free_product' && augmented.free_product_type === 'smart_thermostat') {
        label = 'Free smart thermostat';
        if (!short_description) short_description = 'Add a free smart thermostat to your installation.';
      }
      return {
        promotion: augmented,
        label: label,
        short_description: short_description,
        is_applied: booking.applied_promotion_id === augmented.id
      };
    });

    return result;
  }

  // applyPromotionToInstallationBooking
  applyPromotionToInstallationBooking(bookingId, promotionId) {
    const bookings = this._getFromStorage('installation_bookings');
    const promotions = this._getFromStorage('promotions');

    const bookingIndex = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (bookingIndex === -1) throw new Error('Installation booking not found');

    const promotion = promotions.find(function (p) { return p.id === promotionId; });
    if (!promotion) throw new Error('Promotion not found');

    const booking = bookings[bookingIndex];
    booking.applied_promotion_id = promotion.id;
    booking.free_thermostat_included = promotion.promotion_type === 'free_product' && promotion.free_product_type === 'smart_thermostat';
    booking.updated_at = this._now();

    bookings[bookingIndex] = booking;
    this._saveToStorage('installation_bookings', bookings);

    return this._augmentInstallationBooking(booking);
  }

  // getInstallationBookingSummary
  getInstallationBookingSummary(bookingId) {
    const bookings = this._getFromStorage('installation_bookings');
    const booking = bookings.find(function (b) { return b.id === bookingId; });
    if (!booking) throw new Error('Installation booking not found');

    const augmentedBooking = this._augmentInstallationBooking(booking);
    const applied_offer = augmentedBooking.applied_offer || null;
    const applied_promotion = augmentedBooking.applied_promotion || null;

    const breakdown_items = [];
    if (augmentedBooking.total_estimated_price != null) {
      breakdown_items.push({
        label: 'Estimated installation cost',
        amount: augmentedBooking.total_estimated_price,
        currency: augmentedBooking.currency || 'usd'
      });
    }
    if (augmentedBooking.deposit_amount != null) {
      breakdown_items.push({
        label: 'Deposit',
        amount: augmentedBooking.deposit_amount,
        currency: augmentedBooking.currency || 'usd'
      });
    }
    if (applied_promotion && applied_promotion.promotion_type === 'free_product' && applied_promotion.free_product_type === 'smart_thermostat') {
      breakdown_items.push({
        label: 'Free smart thermostat',
        amount: 0,
        currency: augmentedBooking.currency || 'usd'
      });
    }

    return {
      booking: augmentedBooking,
      applied_offer: applied_offer,
      applied_promotion: applied_promotion,
      breakdown_items: breakdown_items,
      total_estimated_price: augmentedBooking.total_estimated_price || 0,
      currency: augmentedBooking.currency || 'usd'
    };
  }

  // confirmInstallationBooking
  confirmInstallationBooking(bookingId) {
    const bookings = this._getFromStorage('installation_bookings');
    const index = bookings.findIndex(function (b) { return b.id === bookingId; });
    if (index === -1) throw new Error('Installation booking not found');

    const booking = bookings[index];
    booking.status = 'pending_review';
    booking.updated_at = this._now();

    bookings[index] = booking;
    this._saveToStorage('installation_bookings', bookings);

    return {
      success: true,
      booking: this._augmentInstallationBooking(booking),
      message: 'Your booking has been submitted and is pending review.'
    };
  }

  // getBoilerFilterOptions
  getBoilerFilterOptions() {
    const boilers = this._getFromStorage('boilers');
    let maxPrice = 0;
    for (let i = 0; i < boilers.length; i++) {
      const p = boilers[i].price;
      if (typeof p === 'number' && p > maxPrice) maxPrice = p;
    }
    if (maxPrice === 0) maxPrice = 5000;

    return {
      boiler_types: [
        { value: 'combi', label: 'Combi boilers' },
        { value: 'system', label: 'System boilers' },
        { value: 'regular', label: 'Regular (heat only) boilers' },
        { value: 'other', label: 'Other' }
      ],
      max_price_default: maxPrice,
      warranty_length_options: [
        { value: '5', label: '5+ years' },
        { value: '7', label: '7+ years' },
        { value: '10', label: '10+ years' }
      ],
      bathroom_options: [
        { value: 1, label: '1 bathroom' },
        { value: 2, label: '2 bathrooms' },
        { value: 3, label: '3+ bathrooms' }
      ],
      efficiency_band_options: [
        { value: 'a_plus', label: 'A+ rated' },
        { value: 'a', label: 'A rated' },
        { value: 'b', label: 'B rated' },
        { value: 'c', label: 'C rated or below' }
      ],
      sort_options: [
        { value: 'efficiency_desc', label: 'Efficiency rating (High to Low)' },
        { value: 'price_asc', label: 'Price (Low to High)' },
        { value: 'price_desc', label: 'Price (High to Low)' }
      ]
    };
  }

  // listBoilers
  listBoilers(boilerType, maxPrice, minWarrantyYears, bathrooms, minEfficiencyPercent, efficiencyBand, sortBy, limit, page, context) {
    let boilers = this._getFromStorage('boilers').filter(function (b) { return b.status === 'active'; });

    if (boilerType) {
      boilers = boilers.filter(function (b) { return b.boiler_type === boilerType; });
    }
    if (typeof maxPrice === 'number') {
      boilers = boilers.filter(function (b) { return typeof b.price === 'number' && b.price <= maxPrice; });
    }
    if (typeof minWarrantyYears === 'number') {
      boilers = boilers.filter(function (b) { return typeof b.warranty_years === 'number' && b.warranty_years >= minWarrantyYears; });
    }
    if (typeof bathrooms === 'number') {
      boilers = boilers.filter(function (b) {
        if (typeof b.min_bathrooms_supported === 'number' && bathrooms < b.min_bathrooms_supported) return false;
        if (typeof b.max_bathrooms_supported === 'number' && bathrooms > b.max_bathrooms_supported) return false;
        return true;
      });
    }
    if (typeof minEfficiencyPercent === 'number') {
      boilers = boilers.filter(function (b) { return typeof b.efficiency_percent === 'number' && b.efficiency_percent >= minEfficiencyPercent; });
    }
    if (efficiencyBand) {
      boilers = boilers.filter(function (b) { return b.efficiency_band === efficiencyBand; });
    }

    if (sortBy === 'efficiency_desc') {
      boilers.sort(function (a, b) { return (b.efficiency_percent || 0) - (a.efficiency_percent || 0); });
    } else if (sortBy === 'price_asc') {
      boilers.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
    } else if (sortBy === 'price_desc') {
      boilers.sort(function (a, b) { return (b.price || 0) - (a.price || 0); });
    }

    const pageSize = typeof limit === 'number' && limit > 0 ? limit : 20;
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const start = (currentPage - 1) * pageSize;
    const paged = boilers.slice(start, start + pageSize);

    const items = paged.map((boiler) => {
      const effBand = boiler.efficiency_band ? boiler.efficiency_band.toUpperCase().replace('_', '+ ') : '';
      const efficiency_label = (boiler.efficiency_percent || '') + '% ' + (effBand || '');
      const warranty_label = (boiler.warranty_years || 0) + '-year warranty';
      const display_price = this._formatMoney(boiler.price || 0, boiler.currency || 'usd');
      const headline_specs = efficiency_label + '  b7 ' + warranty_label;
      return {
        boiler: boiler,
        display_price: display_price,
        warranty_label: warranty_label,
        efficiency_label: efficiency_label,
        headline_specs: headline_specs
      };
    });

    return {
      items: items,
      total_count: boilers.length,
      page: currentPage,
      page_size: pageSize
    };
  }

  // getBoilerDetails
  getBoilerDetails(boilerId) {
    const boilers = this._getFromStorage('boilers');
    const reviews = this._getFromStorage('customer_reviews');

    const boiler = boilers.find(function (b) { return b.id === boilerId; });
    if (!boiler) throw new Error('Boiler not found');

    const relatedReviews = reviews.filter(function (r) { return r.boiler_id === boilerId; });
    let totalRating = 0;
    for (let i = 0; i < relatedReviews.length; i++) {
      totalRating += relatedReviews[i].rating || 0;
    }
    const average_rating = relatedReviews.length > 0 ? totalRating / relatedReviews.length : 0;

    const effBand = boiler.efficiency_band ? boiler.efficiency_band.toUpperCase().replace('_', '+ ') : '';
    const efficiency_label = (boiler.efficiency_percent || '') + '% ' + (effBand || '');
    const warranty_label = (boiler.warranty_years || 0) + '-year warranty';
    const display_price = this._formatMoney(boiler.price || 0, boiler.currency || 'usd');

    let compatible_property_summary = '';
    if (typeof boiler.min_bedrooms_supported === 'number' || typeof boiler.max_bedrooms_supported === 'number') {
      compatible_property_summary += 'Suitable for ';
      if (boiler.min_bedrooms_supported && boiler.max_bedrooms_supported) {
        compatible_property_summary += boiler.min_bedrooms_supported + '–' + boiler.max_bedrooms_supported + ' bedrooms';
      } else if (boiler.max_bedrooms_supported) {
        compatible_property_summary += 'up to ' + boiler.max_bedrooms_supported + ' bedrooms';
      } else if (boiler.min_bedrooms_supported) {
        compatible_property_summary += boiler.min_bedrooms_supported + '+ bedrooms';
      }
    }

    return {
      boiler: boiler,
      display_price: display_price,
      efficiency_label: efficiency_label,
      warranty_label: warranty_label,
      compatible_property_summary: compatible_property_summary,
      promotion_badges: [],
      bundle_options_summary: '',
      average_rating: average_rating,
      review_count: relatedReviews.length
    };
  }

  // listBoilerReviews
  listBoilerReviews(boilerId, limit) {
    const reviews = this._getFromStorage('customer_reviews');
    let filtered = reviews.filter(function (r) { return r.boiler_id === boilerId; });
    filtered.sort(function (a, b) {
      const da = new Date(a.created_at);
      const db = new Date(b.created_at);
      return db - da;
    });
    if (typeof limit === 'number' && limit > 0) {
      filtered = filtered.slice(0, limit);
    }
    return filtered.map((r) => this._augmentCustomerReview(r));
  }

  // addBoilerToInstallationQuote
  addBoilerToInstallationQuote(boilerId) {
    const boilers = this._getFromStorage('boilers');
    const boiler = boilers.find(function (b) { return b.id === boilerId; });
    if (!boiler) throw new Error('Boiler not found');

    const quote = this._getOrCreateInstallationQuote(boilerId);
    let quotes = this._getFromStorage('installation_quotes');
    const quoteIndex = quotes.findIndex(function (q) { return q.id === quote.id; });
    if (quoteIndex === -1) throw new Error('Quote not found after creation');

    let items = this._getFromStorage('quote_items');
    let boilerItem = items.find(function (it) { return it.quote_id === quote.id && it.item_type === 'boiler'; });

    if (!boilerItem) {
      boilerItem = {
        id: this._generateId('quote_item'),
        quote_id: quote.id,
        item_type: 'boiler',
        item_ref_id: boiler.id,
        name: boiler.name,
        quantity: 1,
        unit_price: boiler.price || 0,
        total_price: boiler.price || 0,
        is_included: false
      };
      items.push(boilerItem);
    } else {
      boilerItem.item_ref_id = boiler.id;
      boilerItem.name = boiler.name;
      boilerItem.unit_price = boiler.price || 0;
      boilerItem.total_price = (boiler.price || 0) * (boilerItem.quantity || 1);
      items = items.map(function (it) { return it.id === boilerItem.id ? boilerItem : it; });
    }

    this._saveToStorage('quote_items', items);
    const updatedQuote = this._recalculateInstallationQuoteTotal(quote.id);
    quotes = this._getFromStorage('installation_quotes');

    return {
      quote: updatedQuote,
      boiler_item: boilerItem,
      message: 'Boiler added to installation quote.'
    };
  }

  // getInstallationQuoteDetails
  getInstallationQuoteDetails(quoteId) {
    const quotes = this._getFromStorage('installation_quotes');
    const items = this._getFromStorage('quote_items');

    const quote = quotes.find(function (q) { return q.id === quoteId; });
    if (!quote) throw new Error('Installation quote not found');

    const relatedItems = items.filter(function (it) { return it.quote_id === quote.id; });
    const augmentedItems = this._augmentInstallationQuoteItems(relatedItems);

    const updatedQuote = this._recalculateInstallationQuoteTotal(quote.id) || quote;

    return {
      quote: updatedQuote,
      items: augmentedItems,
      total_estimated_price: updatedQuote.total_estimated_price || 0,
      currency: updatedQuote.currency || 'usd'
    };
  }

  // updateInstallationQuotePreferences
  updateInstallationQuotePreferences(quoteId, preferredInstallationOption, preferredInstallationDate) {
    const allowed = ['date_selected', 'not_sure_yet', 'as_soon_as_possible'];
    if (allowed.indexOf(preferredInstallationOption) === -1) {
      throw new Error('Invalid preferred installation option');
    }

    const quotes = this._getFromStorage('installation_quotes');
    const index = quotes.findIndex(function (q) { return q.id === quoteId; });
    if (index === -1) throw new Error('Installation quote not found');

    const quote = quotes[index];
    quote.preferred_installation_option = preferredInstallationOption;
    if (preferredInstallationOption === 'date_selected') {
      quote.preferred_installation_date = preferredInstallationDate || null;
    } else {
      quote.preferred_installation_date = null;
    }
    quote.updated_at = this._now();

    quotes[index] = quote;
    this._saveToStorage('installation_quotes', quotes);
    return quote;
  }

  // addOptionalServiceToQuote
  addOptionalServiceToQuote(quoteId, optionalServiceId) {
    const quotes = this._getFromStorage('installation_quotes');
    const quote = quotes.find(function (q) { return q.id === quoteId; });
    if (!quote) throw new Error('Installation quote not found');

    const services = this._getFromStorage('optional_services');
    const svc = services.find(function (s) { return s.id === optionalServiceId; });
    if (!svc) throw new Error('Optional service not found');

    let items = this._getFromStorage('quote_items');
    const existing = items.find(function (it) {
      return it.quote_id === quote.id && it.item_type === 'optional_service' && it.item_ref_id === svc.id;
    });

    if (!existing) {
      const newItem = {
        id: this._generateId('quote_item'),
        quote_id: quote.id,
        item_type: 'optional_service',
        item_ref_id: svc.id,
        name: svc.name,
        quantity: 1,
        unit_price: svc.base_price || 0,
        total_price: svc.base_price || 0,
        is_included: false
      };
      items.push(newItem);
    }

    this._saveToStorage('quote_items', items);
    const updatedQuote = this._recalculateInstallationQuoteTotal(quote.id) || quote;
    const refreshedItems = this._getFromStorage('quote_items').filter(function (it) { return it.quote_id === quote.id; });

    return {
      quote: updatedQuote,
      items: this._augmentInstallationQuoteItems(refreshedItems)
    };
  }

  // removeQuoteItem
  removeQuoteItem(quoteItemId) {
    let items = this._getFromStorage('quote_items');
    const item = items.find(function (it) { return it.id === quoteItemId; });
    if (!item) throw new Error('Quote item not found');

    items = items.filter(function (it) { return it.id !== quoteItemId; });
    this._saveToStorage('quote_items', items);

    const quoteId = item.quote_id;
    const updatedQuote = this._recalculateInstallationQuoteTotal(quoteId);
    const refreshedItems = this._getFromStorage('quote_items').filter(function (it) { return it.quote_id === quoteId; });

    return {
      quote: updatedQuote,
      items: this._augmentInstallationQuoteItems(refreshedItems)
    };
  }

  // saveInstallationQuote
  saveInstallationQuote(quoteId) {
    const quotes = this._getFromStorage('installation_quotes');
    const index = quotes.findIndex(function (q) { return q.id === quoteId; });
    if (index === -1) throw new Error('Installation quote not found');

    const quote = quotes[index];
    if (quote.status === 'draft') {
      quote.status = 'sent';
    }
    quote.updated_at = this._now();

    quotes[index] = quote;
    this._saveToStorage('installation_quotes', quotes);

    return {
      success: true,
      quote: quote,
      message: 'Quote saved successfully.'
    };
  }

  // addBoilerToComparison
  addBoilerToComparison(boilerId) {
    const boilers = this._getFromStorage('boilers');
    const boiler = boilers.find(function (b) { return b.id === boilerId; });
    if (!boiler) throw new Error('Boiler not found');

    let list = this._getOrCreateComparisonList();
    if (list.boiler_ids.indexOf(boilerId) === -1) {
      list.boiler_ids.push(boilerId);
      list.last_updated = this._now();

      let lists = this._getFromStorage('comparison_lists');
      lists = lists.map(function (l) { return l.id === list.id ? list : l; });
      this._saveToStorage('comparison_lists', lists);
      localStorage.setItem('currentComparisonListId', list.id);
    }

    return list;
  }

  // getComparisonListDetails
  getComparisonListDetails() {
    const lists = this._getFromStorage('comparison_lists');
    const boilers = this._getFromStorage('boilers');

    let list = null;
    const currentId = localStorage.getItem('currentComparisonListId');
    if (currentId) {
      list = lists.find(function (l) { return l.id === currentId; }) || null;
    }
    if (!list && lists.length > 0) {
      list = lists[0];
      localStorage.setItem('currentComparisonListId', list.id);
    }
    if (!list) {
      list = this._getOrCreateComparisonList();
    }

    const boilerDetails = list.boiler_ids.map((id) => {
      const b = boilers.find(function (bo) { return bo.id === id; });
      if (!b) return null;
      return {
        boiler: b,
        display_price: this._formatMoney(b.price || 0, b.currency || 'usd'),
        efficiency_label: (b.efficiency_percent || '') + '% ' + (b.efficiency_band ? b.efficiency_band.toUpperCase().replace('_', '+ ') : ''),
        warranty_label: (b.warranty_years || 0) + '-year warranty',
        output_kw: null
      };
    }).filter(function (x) { return !!x; });

    // Instrumentation for task completion tracking (task_7)
    try {
      localStorage.setItem('task7_comparisonViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      comparison_list: list,
      boilers: boilerDetails
    };
  }

  // removeBoilerFromComparison
  removeBoilerFromComparison(boilerId) {
    let list = this._getOrCreateComparisonList();
    list.boiler_ids = list.boiler_ids.filter(function (id) { return id !== boilerId; });
    list.last_updated = this._now();

    let lists = this._getFromStorage('comparison_lists');
    lists = lists.map(function (l) { return l.id === list.id ? list : l; });
    this._saveToStorage('comparison_lists', lists);

    return list;
  }

  // listServicePlans
  listServicePlans(includesEmergencyCallout, maxAnnualPrice, sortBy, limit) {
    let plans = this._getFromStorage('service_plans').filter(function (p) { return p.status === 'active'; });

    if (includesEmergencyCallout) {
      plans = plans.filter(function (p) { return !!p.includes_24_7_emergency_callout; });
    }
    if (typeof maxAnnualPrice === 'number') {
      plans = plans.filter(function (p) { return typeof p.annual_price === 'number' && p.annual_price <= maxAnnualPrice; });
    }

    if (sortBy === 'annual_price_asc') {
      plans.sort(function (a, b) { return (a.annual_price || 0) - (b.annual_price || 0); });
    } else if (sortBy === 'annual_price_desc') {
      plans.sort(function (a, b) { return (b.annual_price || 0) - (a.annual_price || 0); });
    }

    if (typeof limit === 'number' && limit > 0) {
      plans = plans.slice(0, limit);
    }

    const result = plans.map((plan) => {
      const annual = plan.annual_price || 0;
      const currency = plan.currency || 'usd';
      const annual_label = this._formatMoney(annual, currency) + ' / year';
      const monthly_equivalent = annual / 12;
      const monthly_label = this._formatMoney(monthly_equivalent, currency) + ' / month (equivalent)';
      const is_under_budget = typeof maxAnnualPrice === 'number' ? annual <= maxAnnualPrice : false;
      return {
        plan: plan,
        annual_price_label: annual_label,
        monthly_equivalent_label: monthly_label,
        is_under_budget: is_under_budget
      };
    });

    return result;
  }

  // getServicePlanDetails
  getServicePlanDetails(servicePlanId) {
    const plans = this._getFromStorage('service_plans');
    const plan = plans.find(function (p) { return p.id === servicePlanId; });
    if (!plan) throw new Error('Service plan not found');

    const annual = plan.annual_price || 0;
    const currency = plan.currency || 'usd';
    const annual_label = this._formatMoney(annual, currency) + ' / year';
    const monthly_equivalent = annual / 12;
    const monthly_label = this._formatMoney(monthly_equivalent, currency) + ' / month (equivalent)';

    let coverage_points = [];
    if (plan.coverage_description) {
      coverage_points = plan.coverage_description.split(/\r?\n|\.|;/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    }
    let exclusions_list = [];
    if (plan.exclusions) {
      exclusions_list = plan.exclusions.split(/\r?\n|\.|;/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
    }

    return {
      plan: plan,
      annual_price_label: annual_label,
      monthly_equivalent_label: monthly_label,
      coverage_points: coverage_points,
      exclusions_list: exclusions_list
    };
  }

  // startServicePlanSignup
  startServicePlanSignup(servicePlanId) {
    const plans = this._getFromStorage('service_plans');
    const plan = plans.find(function (p) { return p.id === servicePlanId; });
    if (!plan) throw new Error('Service plan not found');

    const now = this._now();
    const id = this._generateId('service_plan_signup');

    const signup = {
      id: id,
      service_plan_id: plan.id,
      created_at: now,
      status: 'draft',
      payment_method: 'direct_debit',
      billing_frequency: 'monthly',
      customer_full_name: null,
      customer_phone: null,
      customer_email: null,
      customer_address: null,
      notes: null
    };

    const signups = this._getFromStorage('service_plan_signups');
    signups.push(signup);
    this._saveToStorage('service_plan_signups', signups);

    return signup;
  }

  // updateServicePlanSignupPayment
  updateServicePlanSignupPayment(servicePlanSignupId, paymentMethod, billingFrequency) {
    const signups = this._getFromStorage('service_plan_signups');
    const index = signups.findIndex(function (s) { return s.id === servicePlanSignupId; });
    if (index === -1) throw new Error('Service plan signup not found');

    const signup = signups[index];
    signup.payment_method = paymentMethod;
    signup.billing_frequency = billingFrequency;

    signups[index] = signup;
    this._saveToStorage('service_plan_signups', signups);
    return signup;
  }

  // updateServicePlanSignupCustomerDetails
  updateServicePlanSignupCustomerDetails(servicePlanSignupId, fullName, phone, email, address) {
    const signups = this._getFromStorage('service_plan_signups');
    const index = signups.findIndex(function (s) { return s.id === servicePlanSignupId; });
    if (index === -1) throw new Error('Service plan signup not found');

    const signup = signups[index];
    if (typeof fullName !== 'undefined') signup.customer_full_name = fullName;
    if (typeof phone !== 'undefined') signup.customer_phone = phone;
    if (typeof email !== 'undefined') signup.customer_email = email;
    if (typeof address !== 'undefined') signup.customer_address = address;

    signups[index] = signup;
    this._saveToStorage('service_plan_signups', signups);
    return signup;
  }

  // getServicePlanSignupSummary
  getServicePlanSignupSummary(servicePlanSignupId) {
    const signups = this._getFromStorage('service_plan_signups');
    const plans = this._getFromStorage('service_plans');

    const signup = signups.find(function (s) { return s.id === servicePlanSignupId; });
    if (!signup) throw new Error('Service plan signup not found');

    const plan = plans.find(function (p) { return p.id === signup.service_plan_id; });
    if (!plan) throw new Error('Service plan not found');

    const annual = plan.annual_price || 0;
    const currency = plan.currency || 'usd';

    const pricing_breakdown = [
      {
        label: 'Annual plan price',
        amount: annual,
        currency: currency
      }
    ];

    return {
      signup: signup,
      plan: plan,
      pricing_breakdown: pricing_breakdown
    };
  }

  // checkServiceCoverage
  checkServiceCoverage(postcode) {
    const areas = this._getFromStorage('service_coverage_areas');
    const normalized = (postcode || '').toUpperCase().replace(/\s+/g, '');

    let matchedArea = null;
    for (let i = 0; i < areas.length; i++) {
      const pattern = (areas[i].postcode_pattern || '').toUpperCase().replace(/\s+/g, '');
      if (!pattern) continue;
      if (normalized.indexOf(pattern) === 0) {
        matchedArea = areas[i];
        break;
      }
    }

    const is_in_coverage = matchedArea ? !!matchedArea.in_coverage : false;
    const available_services = matchedArea && Array.isArray(matchedArea.available_services) ? matchedArea.available_services : [];

    const id = this._generateId('coverage_check');
    const now = this._now();
    const message = is_in_coverage
      ? 'We currently cover your area for selected services.'
      : 'Unfortunately we do not yet cover your area.';

    const check = {
      id: id,
      postcode: postcode,
      checked_at: now,
      is_in_coverage: is_in_coverage,
      available_services: available_services,
      coverage_area_id: matchedArea ? matchedArea.id : null,
      message: message
    };

    const checks = this._getFromStorage('coverage_checks');
    checks.push(check);
    this._saveToStorage('coverage_checks', checks);
    localStorage.setItem('lastCoverageCheckId', id);

    return this._augmentCoverageCheck(check);
  }

  // getCoverageResultDetails
  getCoverageResultDetails(coverageCheckId) {
    const checks = this._getFromStorage('coverage_checks');
    const areas = this._getFromStorage('service_coverage_areas');

    const check = checks.find(function (c) { return c.id === coverageCheckId; });
    if (!check) throw new Error('Coverage check not found');

    const area = check.coverage_area_id
      ? areas.find(function (a) { return a.id === check.coverage_area_id; }) || null
      : null;

    const augmentedCheck = this._augmentCoverageCheck(check);

    return {
      coverage_check: augmentedCheck,
      coverage_area: area
    };
  }

  // createCallbackRequest
  createCallbackRequest(name, phone, email, postcode, serviceInterestedIn, preferredContactTime, coverageCheckId) {
    const now = this._now();
    const id = this._generateId('callback_request');

    const request = {
      id: id,
      created_at: now,
      name: name,
      phone: phone,
      email: email || null,
      postcode: postcode,
      service_interested_in: serviceInterestedIn,
      preferred_contact_time: preferredContactTime,
      notes: null,
      status: 'new',
      coverage_check_id: coverageCheckId || null
    };

    const requests = this._getFromStorage('callback_requests');
    requests.push(request);
    this._saveToStorage('callback_requests', requests);

    return {
      callback_request: request,
      success: true,
      message: 'Callback request submitted.'
    };
  }

  // listOffers
  listOffers(offerType, onlyActive) {
    let offers = this._getFromStorage('offers');
    if (offerType) {
      offers = offers.filter(function (o) { return o.offer_type === offerType; });
    }
    if (onlyActive) {
      offers = offers.filter(function (o) { return !!o.is_active; });
    }
    return offers.map((o) => this._augmentOffer(o));
  }

  // getOfferDetails
  getOfferDetails(offerId) {
    const offers = this._getFromStorage('offers');
    const offer = offers.find(function (o) { return o.id === offerId; });
    if (!offer) throw new Error('Offer not found');
    return this._augmentOffer(offer);
  }

  // listFAQCategories
  listFAQCategories() {
    const categories = this._getFromStorage('faq_categories');
    return categories;
  }

  // listFAQArticlesByCategory
  listFAQArticlesByCategory(faqCategoryId) {
    const articles = this._getFromStorage('faq_articles');
    const filtered = articles.filter(function (a) { return a.category_id === faqCategoryId && a.status === 'published'; });
    return filtered.map((a) => this._augmentFAQArticle(a));
  }

  // searchFAQArticles
  searchFAQArticles(query, faqCategoryId) {
    const q = (query || '').toLowerCase();
    const articles = this._getFromStorage('faq_articles');

    let filtered = articles.filter(function (a) { return a.status === 'published'; });
    if (faqCategoryId) {
      filtered = filtered.filter(function (a) { return a.category_id === faqCategoryId; });
    }
    if (q) {
      filtered = filtered.filter(function (a) {
        const question = (a.question || '').toLowerCase();
        const keywords = Array.isArray(a.keywords) ? a.keywords.join(' ').toLowerCase() : '';
        return question.indexOf(q) !== -1 || keywords.indexOf(q) !== -1;
      });
    }

    return filtered.map((a) => this._augmentFAQArticle(a));
  }

  // getFAQArticle
  getFAQArticle(faqArticleId) {
    const articles = this._getFromStorage('faq_articles');
    const article = articles.find(function (a) { return a.id === faqArticleId; });
    if (!article) throw new Error('FAQ article not found');
    return this._augmentFAQArticle(article);
  }

  // startLiveChatConversationFromFAQ
  startLiveChatConversationFromFAQ(faqArticleId, initialMessage) {
    const articles = this._getFromStorage('faq_articles');
    const article = articles.find(function (a) { return a.id === faqArticleId; });
    if (!article) throw new Error('FAQ article not found');

    const now = this._now();
    const id = this._generateId('live_chat_conversation');

    const conversation = {
      id: id,
      started_at: now,
      ended_at: null,
      status: 'open',
      source: 'faq_page',
      originating_article_id: faqArticleId,
      topic: article.question || 'FAQ enquiry'
    };

    const conversations = this._getFromStorage('live_chat_conversations');
    conversations.push(conversation);
    this._saveToStorage('live_chat_conversations', conversations);
    localStorage.setItem('currentLiveChatConversationId', id);

    if (initialMessage && initialMessage.trim().length > 0) {
      const message = {
        id: this._generateId('live_chat_message'),
        conversation_id: id,
        sender_type: 'user',
        content: initialMessage,
        sent_at: now
      };
      const messages = this._getFromStorage('live_chat_messages');
      messages.push(message);
      this._saveToStorage('live_chat_messages', messages);
    }

    return conversation;
  }

  // sendLiveChatMessage
  sendLiveChatMessage(conversationId, content) {
    const conversations = this._getFromStorage('live_chat_conversations');
    const convo = conversations.find(function (c) { return c.id === conversationId; });
    if (!convo) throw new Error('Conversation not found');
    if (convo.status !== 'open') throw new Error('Conversation is closed');

    const message = {
      id: this._generateId('live_chat_message'),
      conversation_id: conversationId,
      sender_type: 'user',
      content: content,
      sent_at: this._now()
    };

    const messages = this._getFromStorage('live_chat_messages');
    messages.push(message);
    this._saveToStorage('live_chat_messages', messages);

    return this._augmentLiveChatMessage(message);
  }

  // getLiveChatConversationMessages
  getLiveChatConversationMessages(conversationId) {
    const messages = this._getFromStorage('live_chat_messages');
    const filtered = messages
      .filter(function (m) { return m.conversation_id === conversationId; })
      .sort(function (a, b) {
        const da = new Date(a.sent_at);
        const db = new Date(b.sent_at);
        return da - db;
      });
    return filtered.map((m) => this._augmentLiveChatMessage(m));
  }

  // runHeatingCostCalculation
  runHeatingCostCalculation(propertySizeValue, propertySizeUnit, numberOfOccupants, currentEnergyRate, energyRateCurrency) {
    const boilers = this._getFromStorage('boilers').filter(function (b) { return b.status === 'active'; });

    const size = propertySizeValue || 0;
    const occupants = numberOfOccupants || 1;
    const baseUsagePerM2 = 120; // kWh per m2 per year (rough heuristic)
    const usage = size * baseUsagePerM2 * (0.8 + occupants * 0.05);
    const estimated_annual_usage_kwh = usage;
    const estimated_annual_cost = usage * currentEnergyRate;

    let candidateBoilers = boilers;
    candidateBoilers = candidateBoilers.filter(function (b) {
      const min = typeof b.recommended_property_size_min_m2 === 'number' ? b.recommended_property_size_min_m2 : null;
      const max = typeof b.recommended_property_size_max_m2 === 'number' ? b.recommended_property_size_max_m2 : null;
      if (propertySizeUnit === 'm2') {
        if (min !== null && size < min) return false;
        if (max !== null && size > max) return false;
      }
      return true;
    });

    if (candidateBoilers.length === 0) {
      candidateBoilers = boilers;
    }

    candidateBoilers.sort(function (a, b) {
      return (b.efficiency_percent || 0) - (a.efficiency_percent || 0);
    });

    const recommendedBoiler = candidateBoilers.length > 0 ? candidateBoilers[0] : null;
    const recommended_boiler_id = recommendedBoiler ? recommendedBoiler.id : null;

    const id = this._generateId('heating_calculation_session');
    const now = this._now();
    const session = {
      id: id,
      created_at: now,
      property_size_value: propertySizeValue,
      property_size_unit: propertySizeUnit,
      number_of_occupants: numberOfOccupants,
      current_energy_rate: currentEnergyRate,
      energy_rate_currency: energyRateCurrency,
      energy_rate_unit: 'per_kwh',
      estimated_annual_usage_kwh: estimated_annual_usage_kwh,
      estimated_annual_cost: estimated_annual_cost,
      recommended_boiler_id: recommended_boiler_id,
      result_summary: recommendedBoiler
        ? 'Based on your property, we recommend ' + recommendedBoiler.name + ' with an efficiency of ' + recommendedBoiler.efficiency_percent + '%.'
        : 'No boiler recommendation is available based on current data.'
    };

    const sessions = this._getFromStorage('heating_calculation_sessions');
    sessions.push(session);
    this._saveToStorage('heating_calculation_sessions', sessions);

    const efficiency_label = recommendedBoiler
      ? (recommendedBoiler.efficiency_percent || '') + '% ' + (recommendedBoiler.efficiency_band ? recommendedBoiler.efficiency_band.toUpperCase().replace('_', '+ ') : '')
      : '';

    const augmentedSession = this._clone(session);
    augmentedSession.recommended_boiler = recommendedBoiler || null;

    return {
      session: augmentedSession,
      recommended_boiler: recommendedBoiler
        ? {
            boiler: recommendedBoiler,
            reason: 'Highest efficiency match for your property size and occupants.',
            efficiency_label: efficiency_label
          }
        : null
    };
  }

  // listCustomerReviews
  listCustomerReviews(serviceType, ratingExact, sortBy, limit, page) {
    let reviews = this._getFromStorage('customer_reviews');

    if (serviceType) {
      reviews = reviews.filter(function (r) { return r.service_type === serviceType; });
    }
    if (typeof ratingExact === 'number') {
      reviews = reviews.filter(function (r) { return r.rating === ratingExact; });
    }

    if (sortBy === 'most_recent') {
      reviews.sort(function (a, b) {
        const da = new Date(a.created_at);
        const db = new Date(b.created_at);
        return db - da;
      });
    } else if (sortBy === 'highest_rating') {
      reviews.sort(function (a, b) { return (b.rating || 0) - (a.rating || 0); });
    }

    const pageSize = typeof limit === 'number' && limit > 0 ? limit : 20;
    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const start = (currentPage - 1) * pageSize;
    const paged = reviews.slice(start, start + pageSize);

    return paged.map((rev) => {
      const augmented = this._augmentCustomerReview(rev);
      const body = augmented.review_body || '';
      const short = body.length > 140 ? body.substring(0, 137) + '...' : body;
      return {
        review: augmented,
        short_excerpt: short,
        has_full_body: body.length > short.length
      };
    });
  }

  // getCustomerReviewDetail
  getCustomerReviewDetail(customerReviewId) {
    const reviews = this._getFromStorage('customer_reviews');
    const review = reviews.find(function (r) { return r.id === customerReviewId; });
    if (!review) throw new Error('Customer review not found');
    return this._augmentCustomerReview(review);
  }

  // listPackageTemplates
  listPackageTemplates() {
    const templates = this._getFromStorage('package_templates');
    return templates.map((t) => this._augmentPackageTemplate(t));
  }

  // getPackagesOverviewContent
  getPackagesOverviewContent() {
    return {
      intro_text: 'Bundle your boiler, controls and optional services into a single installation package for better value.',
      benefits_list: [
        'Single fixed-price quote for boiler, controls and labour',
        'Tailor your package to your home and budget',
        'Add optional services like system power flush and annual servicing'
      ],
      build_your_own_label: 'Build your own installation',
      build_your_own_description: 'Use our step-by-step builder to choose a boiler, smart controls and optional services to create your ideal installation package.'
    };
  }

  // startPackageConfiguration
  startPackageConfiguration(targetBudget, currency) {
    const config = this._getOrCreatePackageConfiguration(targetBudget, currency || 'usd');
    return config;
  }

  // listThermostats
  listThermostats(thermostatType, maxPrice, sortBy) {
    let thermostats = this._getFromStorage('thermostats').filter(function (t) { return t.status === 'active'; });

    if (thermostatType) {
      thermostats = thermostats.filter(function (t) { return t.thermostat_type === thermostatType; });
    }
    if (typeof maxPrice === 'number') {
      thermostats = thermostats.filter(function (t) { return typeof t.price === 'number' && t.price <= maxPrice; });
    }

    if (sortBy === 'price_asc') {
      thermostats.sort(function (a, b) { return (a.price || 0) - (b.price || 0); });
    } else if (sortBy === 'price_desc') {
      thermostats.sort(function (a, b) { return (b.price || 0) - (a.price || 0); });
    }

    return thermostats;
  }

  // listOptionalServices
  listOptionalServices(serviceType, onlyActive) {
    let services = this._getFromStorage('optional_services');
    if (serviceType) {
      services = services.filter(function (s) { return s.service_type === serviceType; });
    }
    if (onlyActive) {
      services = services.filter(function (s) { return s.status === 'active'; });
    }
    return services;
  }

  // setPackageBoiler
  setPackageBoiler(packageConfigurationId, boilerId) {
    const configs = this._getFromStorage('package_configurations');
    const boilers = this._getFromStorage('boilers');

    const configIndex = configs.findIndex(function (c) { return c.id === packageConfigurationId; });
    if (configIndex === -1) throw new Error('Package configuration not found');

    const boiler = boilers.find(function (b) { return b.id === boilerId; });
    if (!boiler) throw new Error('Boiler not found');

    const config = configs[configIndex];
    config.boiler_id = boiler.id;
    config.updated_at = this._now();
    if (config.steps_completed.indexOf('step_1_boiler') === -1) {
      config.steps_completed.push('step_1_boiler');
    }

    this._recalculatePackageTotal(config);

    configs[configIndex] = config;
    this._saveToStorage('package_configurations', configs);

    return config;
  }

  // setPackageThermostat
  setPackageThermostat(packageConfigurationId, thermostatId) {
    const configs = this._getFromStorage('package_configurations');
    const thermostats = this._getFromStorage('thermostats');

    const configIndex = configs.findIndex(function (c) { return c.id === packageConfigurationId; });
    if (configIndex === -1) throw new Error('Package configuration not found');

    const thermostat = thermostats.find(function (t) { return t.id === thermostatId; });
    if (!thermostat) throw new Error('Thermostat not found');

    const config = configs[configIndex];
    config.thermostat_id = thermostat.id;
    config.updated_at = this._now();
    if (config.steps_completed.indexOf('step_2_controls') === -1) {
      config.steps_completed.push('step_2_controls');
    }

    this._recalculatePackageTotal(config);

    configs[configIndex] = config;
    this._saveToStorage('package_configurations', configs);

    return config;
  }

  // togglePackageOptionalService
  togglePackageOptionalService(packageConfigurationId, optionalServiceId, selected) {
    const configs = this._getFromStorage('package_configurations');
    const services = this._getFromStorage('optional_services');

    const configIndex = configs.findIndex(function (c) { return c.id === packageConfigurationId; });
    if (configIndex === -1) throw new Error('Package configuration not found');

    const service = services.find(function (s) { return s.id === optionalServiceId; });
    if (!service) throw new Error('Optional service not found');

    const config = configs[configIndex];
    if (!Array.isArray(config.optional_service_ids)) config.optional_service_ids = [];

    if (selected) {
      if (config.optional_service_ids.indexOf(optionalServiceId) === -1) {
        config.optional_service_ids.push(optionalServiceId);
      }
    } else {
      config.optional_service_ids = config.optional_service_ids.filter(function (id) { return id !== optionalServiceId; });
    }

    config.updated_at = this._now();
    if (config.steps_completed.indexOf('step_3_services') === -1) {
      config.steps_completed.push('step_3_services');
    }

    this._recalculatePackageTotal(config);

    configs[configIndex] = config;
    this._saveToStorage('package_configurations', configs);

    return config;
  }

  // getPackageConfigurationSummary
  getPackageConfigurationSummary(packageConfigurationId) {
    const configs = this._getFromStorage('package_configurations');
    const boilers = this._getFromStorage('boilers');
    const thermostats = this._getFromStorage('thermostats');
    const optionalServices = this._getFromStorage('optional_services');

    const config = configs.find(function (c) { return c.id === packageConfigurationId; });
    if (!config) throw new Error('Package configuration not found');

    this._recalculatePackageTotal(config);

    const boiler = config.boiler_id ? boilers.find(function (b) { return b.id === config.boiler_id; }) || null : null;
    const thermostat = config.thermostat_id ? thermostats.find(function (t) { return t.id === config.thermostat_id; }) || null : null;

    let services = [];
    if (Array.isArray(config.optional_service_ids)) {
      services = config.optional_service_ids.map(function (id) {
        return optionalServices.find(function (s) { return s.id === id; }) || null;
      }).filter(function (s) { return !!s; });
    }

    const total = config.total_price || 0;
    const currency = config.currency || 'usd';
    const is_within_budget = typeof config.target_budget === 'number' ? total <= config.target_budget : true;

    // Instrumentation for task completion tracking (task_9)
    try {
      localStorage.setItem('task9_packageSummaryViewed', 'true');
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      package_configuration: config,
      boiler: boiler,
      thermostat: thermostat,
      optional_services: services,
      total_price: total,
      currency: currency,
      is_within_budget: is_within_budget
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    return {
      company_overview_html: '<p>We are a specialist gas heating and boiler installation company, providing efficient, safe and compliant installations.</p>',
      qualifications_html: '<ul><li>Gas Safe registered engineers</li><li>Fully insured and accredited</li><li>Experienced in all major boiler brands</li></ul>',
      phone: '+44 0000 000000',
      email: 'info@example-heating.com',
      address: '123 Heating Lane, Boiler Town, BT1 2AB'
    };
  }

  // submitContactEnquiry
  submitContactEnquiry(fullName, email, phone, topic, message) {
    const enquiries = this._getFromStorage('contact_enquiries');
    const id = this._generateId('contact_enquiry');
    const now = this._now();

    const enquiry = {
      id: id,
      created_at: now,
      full_name: fullName,
      email: email,
      phone: phone || null,
      topic: topic || null,
      message: message
    };
    enquiries.push(enquiry);
    this._saveToStorage('contact_enquiries', enquiries);

    return {
      success: true,
      message: 'Enquiry submitted successfully.'
    };
  }

  // getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    return {
      effective_date: '2024-01-01',
      html: '<h1>Terms and Conditions</h1><p>These terms govern the supply of boiler installation and heating services.</p>'
    };
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    return {
      effective_date: '2024-01-01',
      html: '<h1>Privacy Policy</h1><p>We use your data to provide installation and heating services and will not sell your data to third parties.</p>'
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