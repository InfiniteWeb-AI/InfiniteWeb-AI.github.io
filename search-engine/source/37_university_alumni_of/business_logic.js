const localStorage = (function () {
  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch (e) {}
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

  // -------------------------
  // Initialization & storage
  // -------------------------

  _initStorage() {
    const keys = [
      'events',
      'event_ticket_types',
      'event_registrations',
      'funds',
      'gifts',
      'newsletter_subscriptions',
      'newsletter_topics',
      'newsletter_subscription_topics',
      'chapters',
      'chapter_memberships',
      'benefits',
      'saved_benefits',
      'alumni_profiles',
      'contact_lists',
      'contact_list_entries',
      'mentoring_programs',
      'mentor_expertise_topics',
      'mentor_enrollments',
      'mentor_enrollment_expertise',
      'scholarships',
      'saved_scholarships',
      'featured_campaigns',
      'announcements'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

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
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // -------------------------
  // Helper: default contact list
  // -------------------------

  _getOrCreateDefaultContactList() {
    const contactLists = this._getFromStorage('contact_lists');
    let defaultList = contactLists.find((cl) => cl.is_default) || contactLists[0] || null;

    if (!defaultList) {
      defaultList = {
        id: this._generateId('contactlist'),
        name: 'My Contacts',
        description: 'Default contact list',
        created_at: this._getCurrentTimestamp(),
        is_default: true
      };
      contactLists.push(defaultList);
      this._saveToStorage('contact_lists', contactLists);
    } else if (!defaultList.is_default) {
      // Mark the first one as default if none flagged
      defaultList.is_default = true;
      this._saveToStorage('contact_lists', contactLists);
    }

    return defaultList;
  }

  // -------------------------
  // Helper: newsletter subscription (single-user)
  // -------------------------

  _getOrCreateNewsletterSubscription(email) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    let subscription = null;
    if (email) {
      subscription = subs.find((s) => s.email === email) || null;
    }
    if (!subscription) {
      subscription = subs[0] || null;
    }
    if (!subscription && email) {
      subscription = {
        id: this._generateId('nls'),
        email: email,
        first_name: null,
        last_name: null,
        graduation_year: null,
        school: null,
        frequency: 'monthly_digest',
        consent_email_communications: false,
        created_at: this._getCurrentTimestamp(),
        updated_at: null
      };
      subs.push(subscription);
      this._saveToStorage('newsletter_subscriptions', subs);
    }
    return subscription;
  }

  // -------------------------
  // Generic helpers
  // -------------------------

  _titleCaseFromEnum(value) {
    if (!value) return '';
    return value
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  _compareStringsCaseInsensitive(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;
    const la = String(a).toLowerCase();
    const lb = String(b).toLowerCase();
    if (la < lb) return -1;
    if (la > lb) return 1;
    return 0;
  }

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  // -------------------------
  // Interface: getHomePageContent
  // -------------------------

  getHomePageContent() {
    const events = this._getFromStorage('events');
    const chapters = this._getFromStorage('chapters');

    const now = new Date();
    const featuredEvents = events
      .filter((e) => e.status === 'scheduled')
      .filter((e) => {
        const start = this._parseDate(e.start_datetime);
        return !start || start >= now;
      })
      .filter((e) => e.featured)
      .sort((a, b) => {
        const da = this._parseDate(a.start_datetime) || now;
        const db = this._parseDate(b.start_datetime) || now;
        return da - db;
      })
      .slice(0, 5)
      .map((e) => {
        const chapter = e.chapter_id ? chapters.find((c) => c.id === e.chapter_id) || null : null;
        return Object.assign({}, e, { chapter });
      });

    const featuredCampaigns = this._getFromStorage('featured_campaigns');
    const announcements = this._getFromStorage('announcements');

    const quickLinks = [
      { code: 'events', title: 'Events', description: 'Connect through upcoming alumni events.' },
      { code: 'make_a_gift', title: 'Make a Gift', description: 'Support students and the university.' },
      { code: 'chapters', title: 'Chapters & Clubs', description: 'Engage with alumni in your region.' },
      { code: 'benefits', title: 'Alumni Benefits', description: 'Explore exclusive benefits and discounts.' },
      { code: 'directory', title: 'Alumni Directory', description: 'Look up fellow alumni and classmates.' },
      { code: 'mentoring', title: 'Mentoring', description: 'Support students and alumni as a mentor.' },
      { code: 'scholarships', title: 'Scholarships & Support', description: 'Funding opportunities for students and families.' }
    ];

    return {
      orientation_message: 'Welcome to the Alumni Office portal. Use the quick links below to find events, give back, stay connected, and explore benefits.',
      quick_links: quickLinks,
      featured_events: featuredEvents,
      featured_campaigns: featuredCampaigns,
      announcements: announcements
    };
  }

  // -------------------------
  // Events
  // -------------------------

  getEventFilterOptions() {
    const events = this._getFromStorage('events');
    const ticketTypes = this._getFromStorage('event_ticket_types');

    const cities = Array.from(
      new Set(
        events
          .map((e) => e.city)
          .filter((c) => !!c)
      )
    );

    const states = Array.from(
      new Set(
        events
          .map((e) => e.state)
          .filter((s) => !!s)
      )
    );

    const countries = Array.from(
      new Set(
        events
          .map((e) => e.country)
          .filter((c) => !!c)
      )
    );

    const eventTypeValues = [
      'networking',
      'reunion',
      'lecture',
      'workshop',
      'fundraiser',
      'webinar',
      'social',
      'other'
    ];

    const event_types = eventTypeValues.map((v) => ({ value: v, label: this._titleCaseFromEnum(v) }));

    let minPrice = null;
    let maxPrice = null;

    for (const e of events) {
      let minForEvent = e.min_ticket_price;
      let maxForEvent = e.max_ticket_price;

      if (minForEvent == null || maxForEvent == null) {
        const tts = ticketTypes.filter((t) => t.event_id === e.id);
        if (tts.length > 0) {
          const prices = tts.map((t) => t.price).filter((p) => typeof p === 'number');
          if (prices.length > 0) {
            const minT = Math.min.apply(null, prices);
            const maxT = Math.max.apply(null, prices);
            if (minForEvent == null) minForEvent = minT;
            if (maxForEvent == null) maxForEvent = maxT;
          }
        }
      }

      if (typeof minForEvent === 'number') {
        if (minPrice == null || minForEvent < minPrice) minPrice = minForEvent;
      }
      if (typeof maxForEvent === 'number') {
        if (maxPrice == null || maxForEvent > maxPrice) maxPrice = maxForEvent;
      }
    }

    const sort_options = [
      { value: 'date_asc', label: 'Date – Soonest first' },
      { value: 'date_desc', label: 'Date – Latest first' },
      { value: 'price_low_to_high', label: 'Price – Low to High' },
      { value: 'price_high_to_low', label: 'Price – High to Low' },
      { value: 'relevance', label: 'Relevance' }
    ];

    const date_presets = [
      { code: 'next_month', label: 'Next month' },
      { code: 'this_weekend', label: 'This weekend' }
    ];

    return {
      cities,
      states,
      countries,
      event_types,
      price_range: {
        min: minPrice,
        max: maxPrice,
        currency: 'USD'
      },
      sort_options,
      date_presets
    };
  }

  searchEvents(filters, sort_by, page, page_size) {
    const events = this._getFromStorage('events');
    const ticketTypes = this._getFromStorage('event_ticket_types');
    const chapters = this._getFromStorage('chapters');

    filters = filters || {};
    sort_by = sort_by || 'date_asc';
    page = page || 1;
    page_size = page_size || 20;

    const ticketTypesByEvent = {};
    for (const tt of ticketTypes) {
      if (!ticketTypesByEvent[tt.event_id]) ticketTypesByEvent[tt.event_id] = [];
      ticketTypesByEvent[tt.event_id].push(tt);
    }

    function getEventMinPrice(ev) {
      if (typeof ev.min_ticket_price === 'number') return ev.min_ticket_price;
      const tts = ticketTypesByEvent[ev.id] || [];
      const prices = tts.map((t) => t.price).filter((p) => typeof p === 'number');
      return prices.length ? Math.min.apply(null, prices) : null;
    }

    const dateFrom = this._parseDate(filters.date_from);
    const dateTo = this._parseDate(filters.date_to);

    let filtered = events.filter((e) => e.status === 'scheduled');

    if (filters.city) {
      const city = String(filters.city).toLowerCase();
      filtered = filtered.filter((e) => (e.city || '').toLowerCase() === city);
    }

    if (filters.state) {
      const state = String(filters.state).toLowerCase();
      filtered = filtered.filter((e) => (e.state || '').toLowerCase() === state);
    }

    if (filters.country) {
      const country = String(filters.country).toLowerCase();
      filtered = filtered.filter((e) => (e.country || '').toLowerCase() === country);
    }

    if (dateFrom) {
      filtered = filtered.filter((e) => {
        const d = this._parseDate(e.start_datetime);
        return !d || d >= dateFrom;
      });
    }

    if (dateTo) {
      filtered = filtered.filter((e) => {
        const d = this._parseDate(e.start_datetime);
        return !d || d <= dateTo;
      });
    }

    if (filters.event_types && Array.isArray(filters.event_types) && filters.event_types.length) {
      const set = new Set(filters.event_types);
      filtered = filtered.filter((e) => set.has(e.event_type));
    }

    if (typeof filters.is_virtual === 'boolean') {
      filtered = filtered.filter((e) => !!e.is_virtual === filters.is_virtual);
    }

    if (typeof filters.min_price === 'number') {
      filtered = filtered.filter((e) => {
        const price = getEventMinPrice(e);
        return price == null ? false : price >= filters.min_price;
      });
    }

    if (typeof filters.max_price === 'number') {
      filtered = filtered.filter((e) => {
        const price = getEventMinPrice(e);
        return price == null ? false : price <= filters.max_price;
      });
    }

    filtered = filtered.slice();

    filtered.sort((a, b) => {
      if (sort_by === 'price_low_to_high' || sort_by === 'price_high_to_low') {
        const pa = getEventMinPrice(a);
        const pb = getEventMinPrice(b);
        const va = pa == null ? Number.POSITIVE_INFINITY : pa;
        const vb = pb == null ? Number.POSITIVE_INFINITY : pb;
        if (va < vb) return sort_by === 'price_low_to_high' ? -1 : 1;
        if (va > vb) return sort_by === 'price_low_to_high' ? 1 : -1;
        const da = this._parseDate(a.start_datetime) || new Date(0);
        const db = this._parseDate(b.start_datetime) || new Date(0);
        return da - db;
      }

      const da = this._parseDate(a.start_datetime) || new Date(0);
      const db = this._parseDate(b.start_datetime) || new Date(0);
      if (sort_by === 'date_desc') {
        return db - da;
      }
      return da - db; // default date_asc or relevance
    });

    const total_results = filtered.length;
    const startIndex = (page - 1) * page_size;
    const pagedEvents = filtered.slice(startIndex, startIndex + page_size).map((e) => {
      const chapter = e.chapter_id ? chapters.find((c) => c.id === e.chapter_id) || null : null;
      return Object.assign({}, e, { chapter });
    });

    return {
      events: pagedEvents,
      page,
      page_size,
      total_results
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const ticketTypes = this._getFromStorage('event_ticket_types');
    const chapters = this._getFromStorage('chapters');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { event: null, ticket_types: [], chapter: null };
    }

    const chapter = event.chapter_id ? chapters.find((c) => c.id === event.chapter_id) || null : null;

    const detailedEvent = Object.assign({}, event, { chapter });

    const ticket_types = ticketTypes
      .filter((tt) => tt.event_id === eventId)
      .map((tt) => Object.assign({}, tt, { event: detailedEvent }));

    return {
      event: detailedEvent,
      ticket_types,
      chapter
    };
  }

  registerForEvent(
    eventId,
    ticketTypeId,
    quantity,
    first_name,
    last_name,
    email,
    graduation_year,
    industry,
    consent_terms,
    consent_marketing_emails,
    notes
  ) {
    quantity = quantity == null ? 1 : quantity;

    const events = this._getFromStorage('events');
    const ticketTypes = this._getFromStorage('event_ticket_types');
    const registrations = this._getFromStorage('event_registrations');

    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return { success: false, registration: null, message: 'Event not found.' };
    }

    const ticketType = ticketTypes.find((t) => t.id === ticketTypeId && t.event_id === eventId) || null;
    if (!ticketType) {
      return { success: false, registration: null, message: 'Ticket type not found for this event.' };
    }

    if (!consent_terms) {
      return { success: false, registration: null, message: 'Terms consent is required.' };
    }

    if (quantity <= 0) {
      return { success: false, registration: null, message: 'Quantity must be at least 1.' };
    }

    if (typeof ticketType.available_quantity === 'number' && ticketType.available_quantity < quantity) {
      return { success: false, registration: null, message: 'Not enough tickets available.' };
    }

    // Update ticket availability if tracked
    if (typeof ticketType.available_quantity === 'number') {
      ticketType.available_quantity -= quantity;
      this._saveToStorage('event_ticket_types', ticketTypes);
    }

    const pricePer = typeof ticketType.price === 'number' ? ticketType.price : 0;
    const total_amount = pricePer * quantity;
    const registration = {
      id: this._generateId('eventreg'),
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      quantity,
      first_name,
      last_name,
      email,
      graduation_year: graduation_year != null ? graduation_year : null,
      industry: industry || null,
      registration_datetime: this._getCurrentTimestamp(),
      total_amount,
      currency: ticketType.currency || event.currency || 'USD',
      consent_terms: !!consent_terms,
      consent_marketing_emails: !!consent_marketing_emails,
      notes: notes || null
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    const detailedRegistration = Object.assign({}, registration, {
      event,
      ticket_type: ticketType
    });

    return { success: true, registration: detailedRegistration, message: 'Registration completed.' };
  }

  // -------------------------
  // Giving / Gifts
  // -------------------------

  getGiftFormOptions() {
    const funds = this._getFromStorage('funds');

    const activeFunds = funds.filter((f) => f.is_active);
    let defaultFund = activeFunds.find((f) => f.is_default) || activeFunds[0] || null;

    const tribute_types = [
      { value: 'none', label: 'No tribute' },
      { value: 'in_honor_of', label: 'In honor of' },
      { value: 'in_memory_of', label: 'In memory of' }
    ];

    const payment_methods = [
      { value: 'credit_card', label: 'Credit card', is_online_payment: true },
      { value: 'debit_card', label: 'Debit card', is_online_payment: true },
      { value: 'ach', label: 'Bank transfer (ACH)', is_online_payment: true },
      { value: 'bill_me_later', label: 'Bill me later', is_online_payment: false },
      { value: 'pay_by_mail', label: 'Pay by mail', is_online_payment: false },
      { value: 'on_campus_billing', label: 'On-campus billing', is_online_payment: false },
      { value: 'other_offline', label: 'Other offline method', is_online_payment: false }
    ];

    const gift_types = ['one_time_gift', 'recurring_gift', 'pledge'];

    return {
      gift_types,
      funds: activeFunds,
      default_fund_id: defaultFund ? defaultFund.id : null,
      tribute_types,
      payment_methods,
      default_currency: 'USD'
    };
  }

  submitGiftPledge(
    gift_type,
    amount,
    currency,
    fund_id,
    tribute_type,
    tribute_name,
    donor_first_name,
    donor_last_name,
    donor_email,
    donor_postal_code,
    payment_method,
    billing_instructions,
    consent_terms,
    consent_email_receipt
  ) {
    const allowedGiftTypes = ['one_time_gift', 'recurring_gift', 'pledge'];
    const allowedTributes = ['none', 'in_honor_of', 'in_memory_of'];
    const allowedPaymentMethods = [
      'credit_card',
      'debit_card',
      'ach',
      'bill_me_later',
      'pay_by_mail',
      'on_campus_billing',
      'other_offline'
    ];

    if (!allowedGiftTypes.includes(gift_type)) {
      return { success: false, gift: null, message: 'Invalid gift type.' };
    }
    if (!allowedTributes.includes(tribute_type)) {
      return { success: false, gift: null, message: 'Invalid tribute type.' };
    }
    if (!allowedPaymentMethods.includes(payment_method)) {
      return { success: false, gift: null, message: 'Invalid payment method.' };
    }
    if (!consent_terms) {
      return { success: false, gift: null, message: 'Terms consent is required.' };
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return { success: false, gift: null, message: 'Amount must be a positive number.' };
    }

    const funds = this._getFromStorage('funds');
    const gifts = this._getFromStorage('gifts');

    const fund = funds.find((f) => f.id === fund_id) || null;
    if (!fund) {
      return { success: false, gift: null, message: 'Fund not found.' };
    }

    const onlineMethods = ['credit_card', 'debit_card', 'ach'];
    const is_payment_completed_online = onlineMethods.includes(payment_method);

    const gift = {
      id: this._generateId('gift'),
      gift_type,
      amount,
      currency: currency || 'USD',
      fund_id,
      tribute_type,
      tribute_name: tribute_type === 'none' ? null : tribute_name || null,
      donor_first_name,
      donor_last_name,
      donor_email,
      donor_postal_code: donor_postal_code || null,
      payment_method,
      is_payment_completed_online,
      billing_instructions: billing_instructions || null,
      consent_terms: !!consent_terms,
      consent_email_receipt: !!consent_email_receipt,
      created_at: this._getCurrentTimestamp()
    };

    gifts.push(gift);
    this._saveToStorage('gifts', gifts);

    const detailedGift = Object.assign({}, gift, { fund });

    return { success: true, gift: detailedGift, message: 'Gift or pledge submitted.' };
  }

  // -------------------------
  // Stay Connected / Newsletter
  // -------------------------

  getStayConnectedOverview() {
    return {
      introduction: 'Stay connected with the university and fellow alumni through events, chapters, mentoring, and newsletters.',
      channels: [
        {
          code: 'email_newsletters',
          title: 'Email Newsletters',
          description: 'Receive curated news, events, and career resources in your inbox.'
        },
        {
          code: 'local_chapters',
          title: 'Local Chapters',
          description: 'Connect with alumni in your area through regional chapters and clubs.'
        },
        {
          code: 'events',
          title: 'Events',
          description: 'Attend reunions, networking events, lectures, and more.'
        },
        {
          code: 'mentoring',
          title: 'Mentoring',
          description: 'Support current students and alumni as a mentor or mentee.'
        }
      ]
    };
  }

  getNewsletterSubscriptionFormState() {
    const topics = this._getFromStorage('newsletter_topics');

    const frequency_options = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly_digest', label: 'Monthly digest' },
      { value: 'quarterly', label: 'Quarterly' }
    ];

    const schoolEnumValues = [
      'arts_sciences',
      'engineering',
      'business',
      'law',
      'medicine',
      'education',
      'other'
    ];

    const school_options = schoolEnumValues.map((v) => ({ value: v, label: this._titleCaseFromEnum(v) }));

    const subs = this._getFromStorage('newsletter_subscriptions');
    const subTopics = this._getFromStorage('newsletter_subscription_topics');

    let existing_subscription = null;
    if (subs.length > 0) {
      const sub = subs[0];
      const selected_topic_ids = subTopics
        .filter((st) => st.subscription_id === sub.id)
        .map((st) => st.topic_id);

      existing_subscription = {
        subscription: sub,
        selected_topic_ids
      };
    }

    return {
      topics,
      frequency_options,
      school_options,
      existing_subscription
    };
  }

  upsertNewsletterSubscription(
    email,
    first_name,
    last_name,
    graduation_year,
    school,
    frequency,
    topic_ids,
    consent_email_communications
  ) {
    if (!email) {
      return { success: false, subscription: null, message: 'Email is required.' };
    }

    const allowedFrequencies = ['daily', 'weekly', 'monthly_digest', 'quarterly'];
    if (!allowedFrequencies.includes(frequency)) {
      return { success: false, subscription: null, message: 'Invalid frequency.' };
    }

    if (!consent_email_communications) {
      return { success: false, subscription: null, message: 'Consent for email communications is required.' };
    }

    const topics = this._getFromStorage('newsletter_topics');
    const topicIdSet = new Set(topics.map((t) => t.id));

    const cleanedTopicIds = (topic_ids || []).filter((id) => topicIdSet.has(id));

    const subs = this._getFromStorage('newsletter_subscriptions');
    const subTopics = this._getFromStorage('newsletter_subscription_topics');

    let subscription = subs.find((s) => s.email === email) || subs[0] || null;

    if (!subscription) {
      subscription = {
        id: this._generateId('nls'),
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        graduation_year: graduation_year != null ? graduation_year : null,
        school: school || null,
        frequency,
        consent_email_communications: !!consent_email_communications,
        created_at: this._getCurrentTimestamp(),
        updated_at: null
      };
      subs.push(subscription);
    } else {
      subscription.email = email;
      subscription.first_name = first_name || null;
      subscription.last_name = last_name || null;
      subscription.graduation_year = graduation_year != null ? graduation_year : null;
      subscription.school = school || null;
      subscription.frequency = frequency;
      subscription.consent_email_communications = !!consent_email_communications;
      subscription.updated_at = this._getCurrentTimestamp();
    }

    this._saveToStorage('newsletter_subscriptions', subs);

    const remainingSubTopics = subTopics.filter((st) => st.subscription_id !== subscription.id);
    const newSubTopics = cleanedTopicIds.map((tid) => ({
      id: this._generateId('nlstopic'),
      subscription_id: subscription.id,
      topic_id: tid
    }));

    const mergedSubTopics = remainingSubTopics.concat(newSubTopics);
    this._saveToStorage('newsletter_subscription_topics', mergedSubTopics);

    return { success: true, subscription, message: 'Subscription preferences saved.' };
  }

  // -------------------------
  // Chapters & Clubs
  // -------------------------

  getChapterFilterOptions() {
    const chapters = this._getFromStorage('chapters');

    const states = Array.from(
      new Set(
        chapters
          .map((c) => c.state)
          .filter((s) => !!s)
      )
    );

    const regions = Array.from(
      new Set(
        chapters
          .map((c) => c.region)
          .filter((r) => !!r)
      )
    );

    let min = null;
    let max = null;
    for (const c of chapters) {
      if (typeof c.membership_fee === 'number') {
        if (min == null || c.membership_fee < min) min = c.membership_fee;
        if (max == null || c.membership_fee > max) max = c.membership_fee;
      }
    }

    const sort_options = [
      { value: 'events_most_to_least', label: 'Upcoming Events – Most to Least' },
      { value: 'name_a_to_z', label: 'Name – A to Z' },
      { value: 'fee_low_to_high', label: 'Membership Fee – Low to High' }
    ];

    return {
      states,
      regions,
      membership_fee_range: {
        min,
        max,
        currency: 'USD'
      },
      sort_options
    };
  }

  searchChapters(filters, sort_by, page, page_size) {
    const chapters = this._getFromStorage('chapters');

    filters = filters || {};
    sort_by = sort_by || 'events_most_to_least';
    page = page || 1;
    page_size = page_size || 20;

    let filtered = chapters.slice();

    if (filters.state) {
      const s = String(filters.state).toLowerCase();
      filtered = filtered.filter((c) => (c.state || '').toLowerCase() === s);
    }

    if (filters.region) {
      const r = String(filters.region).toLowerCase();
      filtered = filtered.filter((c) => (c.region || '').toLowerCase() === r);
    }

    if (typeof filters.is_active === 'boolean') {
      filtered = filtered.filter((c) => !!c.is_active === filters.is_active);
    }

    if (typeof filters.min_membership_fee === 'number') {
      filtered = filtered.filter((c) => {
        const fee = typeof c.membership_fee === 'number' ? c.membership_fee : null;
        return fee == null ? false : fee >= filters.min_membership_fee;
      });
    }

    if (typeof filters.max_membership_fee === 'number') {
      filtered = filtered.filter((c) => {
        const fee = typeof c.membership_fee === 'number' ? c.membership_fee : null;
        return fee == null ? false : fee <= filters.max_membership_fee;
      });
    }

    filtered.sort((a, b) => {
      if (sort_by === 'name_a_to_z') {
        return this._compareStringsCaseInsensitive(a.name, b.name);
      }
      if (sort_by === 'fee_low_to_high') {
        const fa = typeof a.membership_fee === 'number' ? a.membership_fee : Number.POSITIVE_INFINITY;
        const fb = typeof b.membership_fee === 'number' ? b.membership_fee : Number.POSITIVE_INFINITY;
        if (fa < fb) return -1;
        if (fa > fb) return 1;
        return this._compareStringsCaseInsensitive(a.name, b.name);
      }
      // events_most_to_least default
      const ea = typeof a.upcoming_events_count === 'number' ? a.upcoming_events_count : 0;
      const eb = typeof b.upcoming_events_count === 'number' ? b.upcoming_events_count : 0;
      if (ea > eb) return -1;
      if (ea < eb) return 1;
      return this._compareStringsCaseInsensitive(a.name, b.name);
    });

    const total_results = filtered.length;
    const startIndex = (page - 1) * page_size;
    const paged = filtered.slice(startIndex, startIndex + page_size);

    return {
      chapters: paged,
      page,
      page_size,
      total_results
    };
  }

  getChapterDetail(chapterId) {
    const chapters = this._getFromStorage('chapters');
    const events = this._getFromStorage('events');

    const chapter = chapters.find((c) => c.id === chapterId) || null;
    if (!chapter) {
      return { chapter: null, upcoming_events: [], membership_options: [] };
    }

    const upcoming_events = events
      .filter((e) => e.chapter_id === chapterId && e.status === 'scheduled')
      .map((e) => Object.assign({}, e, { chapter }));

    // Membership options are not modeled as a separate entity; return empty array by default.
    const membership_options = [];

    return {
      chapter,
      upcoming_events,
      membership_options
    };
  }

  joinChapter(
    chapterId,
    first_name,
    last_name,
    email,
    role,
    graduation_year,
    membership_option_name,
    membership_fee_amount,
    consent_terms
  ) {
    const allowedRoles = ['alumni', 'student', 'faculty', 'staff', 'friend_family', 'other'];
    if (!allowedRoles.includes(role)) {
      return { success: false, membership: null, message: 'Invalid role.' };
    }
    if (!consent_terms) {
      return { success: false, membership: null, message: 'Terms consent is required.' };
    }

    const chapters = this._getFromStorage('chapters');
    const memberships = this._getFromStorage('chapter_memberships');

    const chapter = chapters.find((c) => c.id === chapterId) || null;
    if (!chapter) {
      return { success: false, membership: null, message: 'Chapter not found.' };
    }

    const now = this._getCurrentTimestamp();
    const membership = {
      id: this._generateId('chapmem'),
      chapter_id: chapterId,
      first_name,
      last_name,
      email,
      role,
      graduation_year: graduation_year != null ? graduation_year : null,
      membership_option_name: membership_option_name || null,
      membership_fee_amount: membership_fee_amount != null ? membership_fee_amount : null,
      membership_start_date: now,
      membership_end_date: null,
      consent_terms: !!consent_terms,
      created_at: now
    };

    memberships.push(membership);
    this._saveToStorage('chapter_memberships', memberships);

    const detailedMembership = Object.assign({}, membership, { chapter });

    return { success: true, membership: detailedMembership, message: 'Chapter membership completed.' };
  }

  // -------------------------
  // Benefits
  // -------------------------

  getBenefitFilterOptions() {
    const benefits = this._getFromStorage('benefits');

    const categoryValues = ['travel', 'travel_transportation', 'dining', 'retail', 'insurance', 'financial_services', 'cultural', 'continuing_education', 'other'];

    const categoriesSet = new Set(benefits.map((b) => b.category).filter((c) => !!c));
    for (const v of categoryValues) categoriesSet.add(v);

    const categories = Array.from(categoriesSet).map((v) => ({
      value: v,
      label: this._titleCaseFromEnum(v)
    }));

    let min = null;
    let max = null;
    for (const b of benefits) {
      if (typeof b.discount_percentage === 'number') {
        if (min == null || b.discount_percentage < min) min = b.discount_percentage;
        if (max == null || b.discount_percentage > max) max = b.discount_percentage;
      }
    }

    const sort_options = [
      { value: 'discount_high_to_low', label: 'Discount – High to Low' },
      { value: 'discount_low_to_high', label: 'Discount – Low to High' },
      { value: 'name_a_to_z', label: 'Name – A to Z' }
    ];

    return {
      categories,
      discount_range: { min, max },
      sort_options
    };
  }

  searchBenefits(filters, sort_by, page, page_size) {
    const benefits = this._getFromStorage('benefits');

    filters = filters || {};
    sort_by = sort_by || 'discount_high_to_low';
    page = page || 1;
    page_size = page_size || 20;

    let filtered = benefits.slice();

    if (filters.category) {
      filtered = filtered.filter((b) => b.category === filters.category);
    }

    if (typeof filters.is_active === 'boolean') {
      filtered = filtered.filter((b) => !!b.is_active === filters.is_active);
    }

    if (typeof filters.min_discount_percentage === 'number') {
      filtered = filtered.filter((b) => {
        const d = typeof b.discount_percentage === 'number' ? b.discount_percentage : null;
        return d == null ? false : d >= filters.min_discount_percentage;
      });
    }

    if (typeof filters.max_discount_percentage === 'number') {
      filtered = filtered.filter((b) => {
        const d = typeof b.discount_percentage === 'number' ? b.discount_percentage : null;
        return d == null ? false : d <= filters.max_discount_percentage;
      });
    }

    filtered.sort((a, b) => {
      if (sort_by === 'name_a_to_z') {
        return this._compareStringsCaseInsensitive(a.name, b.name);
      }
      const da = typeof a.discount_percentage === 'number' ? a.discount_percentage : 0;
      const db = typeof b.discount_percentage === 'number' ? b.discount_percentage : 0;
      if (sort_by === 'discount_low_to_high') {
        if (da < db) return -1;
        if (da > db) return 1;
        return this._compareStringsCaseInsensitive(a.name, b.name);
      }
      // discount_high_to_low default
      if (da > db) return -1;
      if (da < db) return 1;
      return this._compareStringsCaseInsensitive(a.name, b.name);
    });

    const total_results = filtered.length;
    const startIndex = (page - 1) * page_size;
    const paged = filtered.slice(startIndex, startIndex + page_size);

    return {
      benefits: paged,
      page,
      page_size,
      total_results
    };
  }

  getBenefitDetail(benefitId) {
    const benefits = this._getFromStorage('benefits');
    const savedBenefits = this._getFromStorage('saved_benefits');

    const benefit = benefits.find((b) => b.id === benefitId) || null;
    if (!benefit) {
      return { benefit: null, is_saved: false, saved_benefit_id: null, saved_note: null };
    }

    const saved = savedBenefits.find((sb) => sb.benefit_id === benefitId) || null;

    return {
      benefit,
      is_saved: !!saved,
      saved_benefit_id: saved ? saved.id : null,
      saved_note: saved ? saved.note || null : null
    };
  }

  saveBenefit(benefitId, note) {
    const benefits = this._getFromStorage('benefits');
    const savedBenefits = this._getFromStorage('saved_benefits');

    const benefit = benefits.find((b) => b.id === benefitId) || null;
    if (!benefit) {
      return { success: false, saved_benefit: null, message: 'Benefit not found.' };
    }

    let saved = savedBenefits.find((sb) => sb.benefit_id === benefitId) || null;

    if (saved) {
      if (note !== undefined) saved.note = note;
      this._saveToStorage('saved_benefits', savedBenefits);
    } else {
      saved = {
        id: this._generateId('svdb'),
        benefit_id: benefitId,
        saved_at: this._getCurrentTimestamp(),
        note: note || null
      };
      savedBenefits.push(saved);
      this._saveToStorage('saved_benefits', savedBenefits);
    }

    const detailed = Object.assign({}, saved, { benefit });

    return { success: true, saved_benefit: detailed, message: 'Benefit saved.' };
  }

  unsaveBenefit(benefitId) {
    const savedBenefits = this._getFromStorage('saved_benefits');
    const remaining = savedBenefits.filter((sb) => sb.benefit_id !== benefitId);
    const changed = remaining.length !== savedBenefits.length;
    if (changed) {
      this._saveToStorage('saved_benefits', remaining);
    }
    return { success: true, message: changed ? 'Benefit removed from saved list.' : 'Benefit was not in saved list.' };
  }

  // -------------------------
  // Alumni Directory
  // -------------------------

  getDirectoryFilterOptions() {
    const profiles = this._getFromStorage('alumni_profiles');

    const industriesEnum = [
      'technology',
      'software_engineering',
      'finance',
      'consulting',
      'education',
      'healthcare',
      'government',
      'nonprofit',
      'entrepreneurship',
      'arts_culture',
      'law',
      'other'
    ];

    const industries = industriesEnum.map((v) => ({ value: v, label: this._titleCaseFromEnum(v) }));

    let minYear = null;
    let maxYear = null;
    for (const p of profiles) {
      if (typeof p.graduation_year === 'number') {
        if (minYear == null || p.graduation_year < minYear) minYear = p.graduation_year;
        if (maxYear == null || p.graduation_year > maxYear) maxYear = p.graduation_year;
      }
    }

    const city_suggestions = Array.from(
      new Set(
        profiles
          .map((p) => p.city)
          .filter((c) => !!c)
      )
    );

    const state_suggestions = Array.from(
      new Set(
        profiles
          .map((p) => p.state)
          .filter((s) => !!s)
      )
    );

    const country_suggestions = Array.from(
      new Set(
        profiles
          .map((p) => p.country)
          .filter((c) => !!c)
      )
    );

    const sort_options = [
      { value: 'last_name_a_to_z', label: 'Last name – A to Z' },
      { value: 'graduation_year_desc', label: 'Graduation year – Newest first' }
    ];

    return {
      industries,
      graduation_year_range: { min: minYear, max: maxYear },
      city_suggestions,
      state_suggestions,
      country_suggestions,
      sort_options
    };
  }

  searchAlumniProfiles(filters, sort_by, page, page_size) {
    const profiles = this._getFromStorage('alumni_profiles');

    filters = filters || {};
    sort_by = sort_by || 'last_name_a_to_z';
    page = page || 1;
    page_size = page_size || 20;

    let filtered = profiles.slice();

    if (filters.name_query) {
      const q = String(filters.name_query).toLowerCase();
      filtered = filtered.filter((p) => {
        const fn = (p.first_name || '').toLowerCase();
        const ln = (p.last_name || '').toLowerCase();
        return fn.indexOf(q) !== -1 || ln.indexOf(q) !== -1;
      });
    }

    if (filters.city) {
      const c = String(filters.city).toLowerCase();
      filtered = filtered.filter((p) => (p.city || '').toLowerCase() === c);
    }

    if (filters.state) {
      const s = String(filters.state).toLowerCase();
      filtered = filtered.filter((p) => (p.state || '').toLowerCase() === s);
    }

    if (filters.country) {
      const ctry = String(filters.country).toLowerCase();
      filtered = filtered.filter((p) => (p.country || '').toLowerCase() === ctry);
    }

    if (filters.industry) {
      filtered = filtered.filter((p) => p.industry === filters.industry);
    }

    if (typeof filters.graduation_year_min === 'number') {
      filtered = filtered.filter((p) => {
        const y = typeof p.graduation_year === 'number' ? p.graduation_year : null;
        return y == null ? false : y >= filters.graduation_year_min;
      });
    }

    if (typeof filters.graduation_year_max === 'number') {
      filtered = filtered.filter((p) => {
        const y = typeof p.graduation_year === 'number' ? p.graduation_year : null;
        return y == null ? false : y <= filters.graduation_year_max;
      });
    }

    if (typeof filters.only_visible === 'boolean' && filters.only_visible) {
      filtered = filtered.filter((p) => !!p.is_visible_in_directory);
    }

    filtered.sort((a, b) => {
      if (sort_by === 'graduation_year_desc') {
        const ya = typeof a.graduation_year === 'number' ? a.graduation_year : -Infinity;
        const yb = typeof b.graduation_year === 'number' ? b.graduation_year : -Infinity;
        if (ya > yb) return -1;
        if (ya < yb) return 1;
        return this._compareStringsCaseInsensitive(a.last_name, b.last_name);
      }
      // last_name_a_to_z default
      const lastCmp = this._compareStringsCaseInsensitive(a.last_name, b.last_name);
      if (lastCmp !== 0) return lastCmp;
      return this._compareStringsCaseInsensitive(a.first_name, b.first_name);
    });

    const total_results = filtered.length;
    const startIndex = (page - 1) * page_size;
    const paged = filtered.slice(startIndex, startIndex + page_size);

    return {
      profiles: paged,
      page,
      page_size,
      total_results
    };
  }

  getAlumniProfileDetail(alumniProfileId) {
    const profiles = this._getFromStorage('alumni_profiles');
    const profile = profiles.find((p) => p.id === alumniProfileId) || null;

    if (!profile) {
      return { profile: null, is_in_default_contact_list: false, contact_list_entry_id: null };
    }

    const defaultList = this._getOrCreateDefaultContactList();
    const entries = this._getFromStorage('contact_list_entries');

    const entry = entries.find(
      (e) => e.contact_list_id === defaultList.id && e.alumni_profile_id === alumniProfileId
    ) || null;

    return {
      profile,
      is_in_default_contact_list: !!entry,
      contact_list_entry_id: entry ? entry.id : null
    };
  }

  addToContactList(alumniProfileId, contactListId, note, tags) {
    const profiles = this._getFromStorage('alumni_profiles');
    const contactLists = this._getFromStorage('contact_lists');
    const entries = this._getFromStorage('contact_list_entries');

    const profile = profiles.find((p) => p.id === alumniProfileId) || null;
    if (!profile) {
      return { success: false, contact_list_entry: null, message: 'Alumni profile not found.' };
    }

    let list = null;
    if (contactListId) {
      list = contactLists.find((cl) => cl.id === contactListId) || null;
      if (!list) {
        return { success: false, contact_list_entry: null, message: 'Contact list not found.' };
      }
    } else {
      list = this._getOrCreateDefaultContactList();
    }

    const existing = entries.find(
      (e) => e.contact_list_id === list.id && e.alumni_profile_id === alumniProfileId
    ) || null;

    let entry;
    if (existing) {
      if (note !== undefined) existing.note = note;
      if (Array.isArray(tags)) existing.tags = tags;
      entry = existing;
    } else {
      entry = {
        id: this._generateId('clentry'),
        contact_list_id: list.id,
        alumni_profile_id: alumniProfileId,
        saved_at: this._getCurrentTimestamp(),
        note: note || null,
        tags: Array.isArray(tags) ? tags : []
      };
      entries.push(entry);
    }

    this._saveToStorage('contact_list_entries', entries);

    const detailed = Object.assign({}, entry, {
      contact_list: list,
      alumni_profile: profile
    });

    return { success: true, contact_list_entry: detailed, message: 'Contact saved.' };
  }

  removeContactListEntry(contactListEntryId) {
    const entries = this._getFromStorage('contact_list_entries');
    const remaining = entries.filter((e) => e.id !== contactListEntryId);
    const changed = remaining.length !== entries.length;
    if (changed) this._saveToStorage('contact_list_entries', remaining);
    return { success: true, message: changed ? 'Contact removed.' : 'Contact entry not found.' };
  }

  updateContactListEntry(contactListEntryId, note, tags) {
    const entries = this._getFromStorage('contact_list_entries');
    const contactLists = this._getFromStorage('contact_lists');
    const profiles = this._getFromStorage('alumni_profiles');

    const entry = entries.find((e) => e.id === contactListEntryId) || null;
    if (!entry) {
      return { success: false, contact_list_entry: null, message: 'Contact list entry not found.' };
    }

    if (note !== undefined) entry.note = note;
    if (Array.isArray(tags)) entry.tags = tags;

    this._saveToStorage('contact_list_entries', entries);

    const contact_list = contactLists.find((cl) => cl.id === entry.contact_list_id) || null;
    const alumni_profile = profiles.find((p) => p.id === entry.alumni_profile_id) || null;

    const detailed = Object.assign({}, entry, { contact_list, alumni_profile });

    return { success: true, contact_list_entry: detailed, message: 'Contact entry updated.' };
  }

  // -------------------------
  // Mentoring
  // -------------------------

  getMentoringProgramsOverview() {
    const programs = this._getFromStorage('mentoring_programs').filter((p) => p.is_active);
    return {
      introduction: 'Alumni can support others by serving as mentors in several programs. Compare options below and choose the program that best fits your availability and interests.',
      programs
    };
  }

  getMentoringProgramDetail(mentoringProgramId) {
    const programs = this._getFromStorage('mentoring_programs');
    const expertiseTopics = this._getFromStorage('mentor_expertise_topics');

    const program = programs.find((p) => p.id === mentoringProgramId) || null;
    if (!program) {
      return { program: null, expertise_topics: [], time_commitment_options: [], meeting_format_options: [] };
    }

    const activeTopics = expertiseTopics.filter((t) => t.is_active);

    // Generate generic time commitment options within program bounds if provided
    const baseOptions = [
      { label: '1 hour per month', hours_per_month: 1 },
      { label: '2 hours per month', hours_per_month: 2 },
      { label: '4 hours per month', hours_per_month: 4 },
      { label: '8 hours per month', hours_per_month: 8 }
    ];

    const minH = typeof program.min_time_commitment_hours_per_month === 'number' ? program.min_time_commitment_hours_per_month : null;
    const maxH = typeof program.max_time_commitment_hours_per_month === 'number' ? program.max_time_commitment_hours_per_month : null;

    const time_commitment_options = baseOptions.filter((opt) => {
      if (minH != null && opt.hours_per_month < minH) return false;
      if (maxH != null && opt.hours_per_month > maxH) return false;
      return true;
    });

    const allMeetingFormats = [
      { value: 'video_chat', label: 'Video chat' },
      { value: 'in_person', label: 'In person' },
      { value: 'phone', label: 'Phone' },
      { value: 'email', label: 'Email' },
      { value: 'mixed', label: 'Mixed formats' },
      { value: 'other', label: 'Other' }
    ];

    let meeting_format_options;
    if (Array.isArray(program.allowed_meeting_formats) && program.allowed_meeting_formats.length) {
      const allowedSet = new Set(program.allowed_meeting_formats);
      meeting_format_options = allMeetingFormats.filter((opt) => allowedSet.has(opt.value));
    } else {
      meeting_format_options = allMeetingFormats;
    }

    return {
      program,
      expertise_topics: activeTopics,
      time_commitment_options,
      meeting_format_options
    };
  }

  enrollAsMentor(
    mentoringProgramId,
    first_name,
    last_name,
    email,
    affiliation,
    graduation_year,
    availability_hours_per_month,
    time_commitment_option_label,
    preferred_meeting_format,
    expertise_topic_ids,
    consent_terms
  ) {
    const allowedAffiliations = ['alumnus_alumna', 'student', 'faculty', 'staff', 'friend', 'other'];
    if (!allowedAffiliations.includes(affiliation)) {
      return { success: false, enrollment: null, message: 'Invalid affiliation.' };
    }
    if (!consent_terms) {
      return { success: false, enrollment: null, message: 'Terms consent is required.' };
    }

    const programs = this._getFromStorage('mentoring_programs');
    const expertiseTopics = this._getFromStorage('mentor_expertise_topics');
    const enrollments = this._getFromStorage('mentor_enrollments');
    const enrollmentExpertise = this._getFromStorage('mentor_enrollment_expertise');

    const program = programs.find((p) => p.id === mentoringProgramId) || null;
    if (!program) {
      return { success: false, enrollment: null, message: 'Mentoring program not found.' };
    }

    const topicIdSet = new Set(expertiseTopics.map((t) => t.id));
    const cleanedTopicIds = (expertise_topic_ids || []).filter((id) => topicIdSet.has(id));

    const now = this._getCurrentTimestamp();
    const enrollment = {
      id: this._generateId('mentor'),
      mentoring_program_id: mentoringProgramId,
      first_name,
      last_name,
      email,
      affiliation,
      graduation_year: graduation_year != null ? graduation_year : null,
      availability_hours_per_month,
      time_commitment_option_label: time_commitment_option_label || null,
      preferred_meeting_format,
      consent_terms: !!consent_terms,
      created_at: now
    };

    enrollments.push(enrollment);
    this._saveToStorage('mentor_enrollments', enrollments);

    const remainingLinks = enrollmentExpertise.filter((ee) => ee.mentor_enrollment_id !== enrollment.id);
    const newLinks = cleanedTopicIds.map((tid) => ({
      id: this._generateId('mentorexp'),
      mentor_enrollment_id: enrollment.id,
      expertise_topic_id: tid
    }));

    const mergedLinks = remainingLinks.concat(newLinks);
    this._saveToStorage('mentor_enrollment_expertise', mergedLinks);

    const detailedEnrollment = Object.assign({}, enrollment, { mentoring_program: program });

    return { success: true, enrollment: detailedEnrollment, message: 'Mentor enrollment submitted.' };
  }

  // -------------------------
  // Scholarships
  // -------------------------

  getScholarshipFilterOptions() {
    const scholarships = this._getFromStorage('scholarships');

    const eligibilityValues = ['children_of_alumni', 'grandchildren_of_alumni', 'alumni', 'current_students', 'other'];
    const levelValues = ['undergraduate', 'graduate', 'doctoral', 'certificate', 'any'];

    const eligibility_groups = eligibilityValues.map((v) => ({
      value: v,
      label: this._titleCaseFromEnum(v)
    }));

    const levels_of_study = levelValues.map((v) => ({
      value: v,
      label: this._titleCaseFromEnum(v)
    }));

    let earliest = null;
    let latest = null;
    for (const s of scholarships) {
      const d = this._parseDate(s.deadline);
      if (!d) continue;
      if (!earliest || d < earliest) earliest = d;
      if (!latest || d > latest) latest = d;
    }

    const deadline_range = {
      earliest: earliest ? earliest.toISOString() : null,
      latest: latest ? latest.toISOString() : null
    };

    const sort_options = [
      { value: 'award_amount_high_to_low', label: 'Award amount – High to Low' },
      { value: 'award_amount_low_to_high', label: 'Award amount – Low to High' },
      { value: 'deadline_soonest', label: 'Deadline – Soonest first' }
    ];

    return {
      eligibility_groups,
      levels_of_study,
      deadline_range,
      sort_options
    };
  }

  searchScholarships(filters, sort_by, page, page_size) {
    const scholarships = this._getFromStorage('scholarships');

    filters = filters || {};
    sort_by = sort_by || 'award_amount_high_to_low';
    page = page || 1;
    page_size = page_size || 20;

    let filtered = scholarships.slice();

    if (filters.eligibility_group) {
      filtered = filtered.filter((s) => s.eligibility_group === filters.eligibility_group);
    }

    if (filters.level_of_study) {
      filtered = filtered.filter((s) => s.level_of_study === filters.level_of_study);
    }

    const afterDate = this._parseDate(filters.deadline_after);
    const beforeDate = this._parseDate(filters.deadline_before);

    if (afterDate) {
      filtered = filtered.filter((s) => {
        const d = this._parseDate(s.deadline);
        return !d ? false : d > afterDate; // strictly after
      });
    }

    if (beforeDate) {
      filtered = filtered.filter((s) => {
        const d = this._parseDate(s.deadline);
        return !d ? false : d <= beforeDate;
      });
    }

    if (typeof filters.min_award_amount === 'number') {
      filtered = filtered.filter((s) => {
        const a = typeof s.award_amount === 'number' ? s.award_amount : null;
        return a == null ? false : a >= filters.min_award_amount;
      });
    }

    if (typeof filters.is_active === 'boolean') {
      filtered = filtered.filter((s) => !!s.is_active === filters.is_active);
    }

    filtered.sort((a, b) => {
      const aa = typeof a.award_amount === 'number' ? a.award_amount : 0;
      const ab = typeof b.award_amount === 'number' ? b.award_amount : 0;
      if (sort_by === 'award_amount_low_to_high') {
        if (aa < ab) return -1;
        if (aa > ab) return 1;
        const da = this._parseDate(a.deadline) || new Date(8640000000000000);
        const db = this._parseDate(b.deadline) || new Date(8640000000000000);
        return da - db;
      }
      if (sort_by === 'deadline_soonest') {
        const da = this._parseDate(a.deadline) || new Date(8640000000000000);
        const db = this._parseDate(b.deadline) || new Date(8640000000000000);
        if (da < db) return -1;
        if (da > db) return 1;
        return ab - aa;
      }
      // award_amount_high_to_low default
      if (aa > ab) return -1;
      if (aa < ab) return 1;
      const da = this._parseDate(a.deadline) || new Date(8640000000000000);
      const db = this._parseDate(b.deadline) || new Date(8640000000000000);
      return da - db;
    });

    const total_results = filtered.length;
    const startIndex = (page - 1) * page_size;
    const paged = filtered.slice(startIndex, startIndex + page_size);

    return {
      scholarships: paged,
      page,
      page_size,
      total_results
    };
  }

  getScholarshipDetail(scholarshipId) {
    const scholarships = this._getFromStorage('scholarships');
    const savedScholarships = this._getFromStorage('saved_scholarships');

    const scholarship = scholarships.find((s) => s.id === scholarshipId) || null;
    if (!scholarship) {
      return { scholarship: null, is_saved: false, saved_scholarship_id: null, saved_note: null };
    }

    const saved = savedScholarships.find((ss) => ss.scholarship_id === scholarshipId) || null;

    return {
      scholarship,
      is_saved: !!saved,
      saved_scholarship_id: saved ? saved.id : null,
      saved_note: saved ? saved.note || null : null
    };
  }

  saveScholarship(scholarshipId, note) {
    const scholarships = this._getFromStorage('scholarships');
    const savedScholarships = this._getFromStorage('saved_scholarships');

    const scholarship = scholarships.find((s) => s.id === scholarshipId) || null;
    if (!scholarship) {
      return { success: false, saved_scholarship: null, message: 'Scholarship not found.' };
    }

    let saved = savedScholarships.find((ss) => ss.scholarship_id === scholarshipId) || null;

    if (saved) {
      if (note !== undefined) saved.note = note;
      this._saveToStorage('saved_scholarships', savedScholarships);
    } else {
      saved = {
        id: this._generateId('svds'),
        scholarship_id: scholarshipId,
        saved_at: this._getCurrentTimestamp(),
        note: note || null
      };
      savedScholarships.push(saved);
      this._saveToStorage('saved_scholarships', savedScholarships);
    }

    const detailed = Object.assign({}, saved, { scholarship });

    return { success: true, saved_scholarship: detailed, message: 'Scholarship saved.' };
  }

  unsaveScholarship(scholarshipId) {
    const savedScholarships = this._getFromStorage('saved_scholarships');
    const remaining = savedScholarships.filter((ss) => ss.scholarship_id !== scholarshipId);
    const changed = remaining.length !== savedScholarships.length;
    if (changed) this._saveToStorage('saved_scholarships', remaining);
    return { success: true, message: changed ? 'Scholarship removed from saved list.' : 'Scholarship was not in saved list.' };
  }

  updateSavedScholarshipNote(savedScholarshipId, note) {
    const savedScholarships = this._getFromStorage('saved_scholarships');
    const scholarships = this._getFromStorage('scholarships');

    const saved = savedScholarships.find((ss) => ss.id === savedScholarshipId) || null;
    if (!saved) {
      return { success: false, saved_scholarship: null, message: 'Saved scholarship not found.' };
    }

    saved.note = note;
    this._saveToStorage('saved_scholarships', savedScholarships);

    const scholarship = scholarships.find((s) => s.id === saved.scholarship_id) || null;
    const detailed = Object.assign({}, saved, { scholarship });

    return { success: true, saved_scholarship: detailed, message: 'Saved scholarship note updated.' };
  }

  // -------------------------
  // Saved Items Overview
  // -------------------------

  getSavedItemsOverview() {
    const savedBenefits = this._getFromStorage('saved_benefits');
    const benefits = this._getFromStorage('benefits');

    const saved_scholarships_raw = this._getFromStorage('saved_scholarships');
    const scholarships = this._getFromStorage('scholarships');

    const contact_lists_raw = this._getFromStorage('contact_lists');
    const entries = this._getFromStorage('contact_list_entries');
    const profiles = this._getFromStorage('alumni_profiles');

    const saved_benefits = savedBenefits.map((sb) => ({
      saved_benefit: Object.assign({}, sb, {
        benefit: benefits.find((b) => b.id === sb.benefit_id) || null
      }),
      benefit: benefits.find((b) => b.id === sb.benefit_id) || null
    }));

    const saved_scholarships = saved_scholarships_raw.map((ss) => ({
      saved_scholarship: Object.assign({}, ss, {
        scholarship: scholarships.find((s) => s.id === ss.scholarship_id) || null
      }),
      scholarship: scholarships.find((s) => s.id === ss.scholarship_id) || null
    }));

    const contact_lists = contact_lists_raw.map((cl) => {
      const clEntries = entries.filter((e) => e.contact_list_id === cl.id);
      const entriesWithProfiles = clEntries.map((e) => ({
        entry: Object.assign({}, e, {
          contact_list: cl,
          alumni_profile: profiles.find((p) => p.id === e.alumni_profile_id) || null
        }),
        alumni_profile: profiles.find((p) => p.id === e.alumni_profile_id) || null
      }));
      return {
        contact_list: cl,
        entries: entriesWithProfiles
      };
    });

    return {
      saved_benefits,
      saved_scholarships,
      contact_lists
    };
  }

  updateSavedBenefitNote(savedBenefitId, note) {
    const savedBenefits = this._getFromStorage('saved_benefits');
    const benefits = this._getFromStorage('benefits');

    const saved = savedBenefits.find((sb) => sb.id === savedBenefitId) || null;
    if (!saved) {
      return { success: false, saved_benefit: null, message: 'Saved benefit not found.' };
    }

    saved.note = note;
    this._saveToStorage('saved_benefits', savedBenefits);

    const benefit = benefits.find((b) => b.id === saved.benefit_id) || null;
    const detailed = Object.assign({}, saved, { benefit });

    return { success: true, saved_benefit: detailed, message: 'Saved benefit note updated.' };
  }

  // -------------------------
  // Alumni Office Info
  // -------------------------

  getAlumniOfficeInfo() {
    return {
      mission: 'The Alumni Office connects graduates with each other and the university through events, lifelong learning, and opportunities to give back.',
      services: [
        {
          title: 'Events & Reunions',
          description: 'Plan and promote events that bring alumni together on campus and around the world.'
        },
        {
          title: 'Career & Networking',
          description: 'Offer career resources, mentoring programs, and networking opportunities for alumni.'
        },
        {
          title: 'Giving & Philanthropy',
          description: 'Facilitate charitable giving to support students, faculty, and university priorities.'
        },
        {
          title: 'Alumni Benefits',
          description: 'Provide exclusive benefits and discounts for alumni and their families.'
        }
      ],
      contact_information: {
        email_addresses: ['alumni-office@example.edu'],
        phone_numbers: ['+1 (555) 123-4567'],
        mailing_address: 'Alumni Office, Example University, 123 College Avenue, College Town, ST 00000 USA'
      },
      policies: {
        privacy_summary: 'We respect your privacy and use your information only to support alumni engagement and university-related communication.',
        terms_of_use_summary: 'Use of this site is subject to university policies and applicable laws. Content is provided for personal, non-commercial use.',
        accessibility_summary: 'The university is committed to providing an accessible experience for all users and welcomes feedback on accessibility improvements.'
      },
      core_sections: [
        { code: 'events', title: 'Events', description: 'Browse upcoming alumni events and reunions.' },
        { code: 'make_a_gift', title: 'Make a Gift', description: 'Support students and university priorities.' },
        { code: 'chapters', title: 'Chapters & Clubs', description: 'Connect with alumni in your region.' },
        { code: 'benefits', title: 'Benefits & Discounts', description: 'Explore exclusive alumni benefits.' },
        { code: 'directory', title: 'Alumni Directory', description: 'Find and connect with fellow alumni.' },
        { code: 'mentoring', title: 'Mentoring', description: 'Become a mentor or request mentorship.' },
        { code: 'scholarships', title: 'Scholarships & Support', description: 'Learn about scholarships and financial support.' }
      ]
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
