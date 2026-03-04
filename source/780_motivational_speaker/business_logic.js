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

  _initStorage() {
    // Core entity tables from data model
    const arrayKeys = [
      'speaking_topics',
      'shortlisted_topics',
      'booking_requests',
      'testimonials',
      'favorite_testimonials',
      'products',
      'cart_items',
      'resources',
      'library_items',
      'events',
      'event_registrations',
      'blog_posts',
      'reading_list_items',
      'speaking_packages',
      'package_addons',
      'package_configurations',
      'package_configuration_addons',
      'contact_inquiries'
    ];

    arrayKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, '[]');
      }
    });

    // Single cart object (or null when none exists yet)
    if (localStorage.getItem('cart') === null) {
      localStorage.setItem('cart', 'null');
    }

    // Backwards-compatible/example keys from template (not used by core logic)
    if (!localStorage.getItem('users')) {
      localStorage.setItem('users', '[]');
    }
    if (!localStorage.getItem('carts')) {
      localStorage.setItem('carts', '[]');
    }
    if (!localStorage.getItem('cartItems')) {
      localStorage.setItem('cartItems', '[]');
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (data === null || typeof data === 'undefined') {
      if (typeof defaultValue === 'undefined') {
        return [];
      }
      // deep clone defaultValue to avoid accidental mutation
      return JSON.parse(JSON.stringify(defaultValue));
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      if (typeof defaultValue === 'undefined') {
        return [];
      }
      return JSON.parse(JSON.stringify(defaultValue));
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

  _getCurrentDateTime() {
    return new Date().toISOString();
  }

  _formatPrice(amount, currency) {
    const curr = currency || 'usd';
    const value = typeof amount === 'number' ? amount : 0;
    const symbol = curr === 'usd' ? '$' : '';
    return symbol + value.toFixed(2);
  }

  _getAudienceLabel(value) {
    const map = {
      technology: 'Technology',
      startups: 'Startups',
      finance: 'Finance',
      healthcare: 'Healthcare',
      general_business: 'General Business',
      education: 'Education',
      nonprofit: 'Nonprofit',
      other: 'Other'
    };
    return map[value] || value;
  }

  _getFormatLabel(value) {
    const map = {
      keynote: 'Keynote',
      workshop: 'Workshop',
      breakout_session: 'Breakout Session',
      fireside_chat: 'Fireside Chat'
    };
    return map[value] || value;
  }

  _getResourceTypeLabel(value) {
    const map = {
      checklist: 'Checklist',
      guide: 'Guide',
      template: 'Template',
      ebook: 'eBook',
      worksheet: 'Worksheet',
      video: 'Video',
      other: 'Other'
    };
    return map[value] || value;
  }

  _getResourceTopicLabel(value) {
    const map = {
      new_managers: 'New Managers',
      first_time_leaders: 'First-Time Leaders',
      productivity: 'Productivity',
      burnout: 'Burnout',
      goal_setting: 'Goal Setting',
      communication: 'Communication',
      other: 'Other'
    };
    return map[value] || value;
  }

  _getEventTypeLabel(value) {
    const map = {
      webinar: 'Webinar',
      live_online: 'Live Online',
      in_person: 'In-Person',
      hybrid: 'Hybrid'
    };
    return map[value] || value;
  }

  _getEventTopicLabel(value) {
    const map = {
      leadership: 'Leadership',
      resilience: 'Resilience',
      burnout: 'Burnout',
      motivation: 'Motivation',
      productivity: 'Productivity',
      other: 'Other'
    };
    return map[value] || value;
  }

  _getDeliveryModeLabel(value) {
    const map = {
      virtual: 'Virtual',
      in_person: 'In-Person',
      hybrid: 'Hybrid'
    };
    return map[value] || value;
  }

  _getAudienceSizeLabel(value) {
    const map = {
      up_to_50: 'Up to 50 attendees',
      up_to_150: 'Up to 150 attendees',
      up_to_300: 'Up to 300 attendees',
      up_to_1000_plus: 'Up to 1000+ attendees'
    };
    return map[value] || value;
  }

  _getIndustryLabel(value) {
    const map = {
      finance: 'Finance',
      financial_services: 'Financial Services',
      technology: 'Technology',
      healthcare: 'Healthcare',
      education: 'Education',
      retail: 'Retail',
      manufacturing: 'Manufacturing',
      nonprofit: 'Nonprofit',
      other: 'Other'
    };
    return map[value] || value;
  }

  _getPrimaryTopicLabel(value) {
    const map = {
      leadership: 'Leadership',
      burnout: 'Burnout',
      resilience: 'Resilience',
      productivity: 'Productivity',
      motivation: 'Motivation',
      other: 'Other'
    };
    return map[value] || value;
  }

  _getCartObject() {
    // Returns the raw cart object or null
    return this._getFromStorage('cart', null);
  }

  _getOrCreateCart() {
    let cart = this._getCartObject();
    const now = this._getCurrentDateTime();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: now,
        updated_at: now,
        items_count: 0,
        subtotal: 0,
        total: 0,
        currency: 'usd',
        discount_total: 0,
        coupon_code: null
      };
      this._saveToStorage('cart', cart);
    }
    return cart;
  }

  _recalculateCartTotals(cart, allCartItems) {
    if (!cart) return;
    const items = allCartItems.filter((ci) => ci.cart_id === cart.id);
    let subtotal = 0;
    let itemsCount = 0;
    items.forEach((item) => {
      subtotal += item.line_total || 0;
      itemsCount += item.quantity || 0;
    });
    cart.subtotal = subtotal;
    cart.items_count = itemsCount;
    cart.discount_total = cart.discount_total || 0;
    cart.total = subtotal - cart.discount_total;
    cart.updated_at = this._getCurrentDateTime();
    this._saveToStorage('cart', cart);
  }

  _calculatePackageConfigurationTotals(pkg, addons) {
    const base = pkg && typeof pkg.base_price === 'number' ? pkg.base_price : 0;
    let addonsTotal = 0;
    if (Array.isArray(addons)) {
      addons.forEach((a) => {
        if (a && typeof a.price === 'number') {
          addonsTotal += a.price;
        }
      });
    }
    const total = base + addonsTotal;
    return {
      configured_base_price: base,
      addons_total_price: addonsTotal,
      total_price: total
    };
  }

  _getDateRangeFromPreset(presetKey) {
    const now = new Date();
    let start;
    let end = new Date(now.getTime());
    if (presetKey === 'last_12_months') {
      start = new Date(now.getTime());
      start.setFullYear(start.getFullYear() - 1);
    } else if (presetKey === 'last_30_days') {
      start = new Date(now.getTime());
      start.setDate(start.getDate() - 30);
    } else if (presetKey === 'last_7_days') {
      start = new Date(now.getTime());
      start.setDate(start.getDate() - 7);
    } else if (presetKey === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (presetKey === 'next_month') {
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      start = nextMonth;
      end = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      start = new Date(now.getTime());
      start.setFullYear(start.getFullYear() - 1);
    }
    return {
      start: start.toISOString(),
      end: end.toISOString()
    };
  }

  // =========================
  // Home Page
  // =========================

  getHomePageContent() {
    const hero = {
      headline: 'Inspire Your People. Transform Your Culture.',
      subheadline: 'Keynotes and training on leadership, resilience, and burnout for fast-moving teams.',
      primaryCtaLabel: 'Book Me',
      primaryCtaTarget: 'booking',
      secondaryCtaLabel: 'Speaking Topics',
      secondaryCtaTarget: 'speaking_topics'
    };

    const navigationTiles = [
      {
        key: 'speaking_topics',
        title: 'Speaking Topics',
        description: 'Explore keynotes and workshops for your next event.'
      },
      {
        key: 'speaking_packages',
        title: 'Speaking Packages',
        description: 'Configure virtual and in-person keynote options.'
      },
      {
        key: 'events',
        title: 'Events & Webinars',
        description: 'Join upcoming live experiences.'
      },
      {
        key: 'store',
        title: 'Store',
        description: 'Books and online courses for your leaders.'
      },
      {
        key: 'resources',
        title: 'Free Resources',
        description: 'Checklists, guides, and tools for your team.'
      },
      {
        key: 'blog',
        title: 'Blog',
        description: 'Articles on leadership, burnout, and performance.'
      },
      {
        key: 'testimonials',
        title: 'Client Stories',
        description: 'See how other organizations have used these programs.'
      }
    ];

    const topicsRaw = this._getFromStorage('speaking_topics', []);
    const shortlistedRaw = this._getFromStorage('shortlisted_topics', []);
    const shortlistedIds = new Set(shortlistedRaw.map((s) => s.topic_id));
    const featuredTopics = topicsRaw
      .filter((t) => t.is_featured === true)
      .map((t) => ({
        id: t.id,
        title: t.title,
        slug: t.slug,
        summary: t.summary || '',
        format: t.format,
        formatLabel: this._getFormatLabel(t.format),
        primaryAudience: t.primary_audience,
        primaryAudienceLabel: this._getAudienceLabel(t.primary_audience),
        rating: t.rating,
        isFeatured: !!t.is_featured,
        isShortlisted: shortlistedIds.has(t.id)
      }));

    const resourcesRaw = this._getFromStorage('resources', []);
    const activeResources = resourcesRaw.filter((r) => r.status === 'active');
    let featuredResource = null;
    if (activeResources.length > 0) {
      const sorted = activeResources.slice().sort((a, b) => {
        const pa = a.popularity_score || 0;
        const pb = b.popularity_score || 0;
        return pb - pa;
      });
      const r = sorted[0];
      featuredResource = {
        id: r.id,
        title: r.title,
        slug: r.slug,
        type: r.type,
        typeLabel: this._getResourceTypeLabel(r.type),
        topic: r.topic,
        topicLabel: this._getResourceTopicLabel(r.topic),
        isFree: !!r.is_free,
        price: r.price,
        priceDisplay: r.is_free ? 'Free' : this._formatPrice(r.price, 'usd')
      };
    }

    const eventsRaw = this._getFromStorage('events', []);
    const nowIso = this._getCurrentDateTime();
    const upcomingEvents = eventsRaw.filter((e) => !e.start_datetime || e.start_datetime >= nowIso);
    let featuredEvent = null;
    if (upcomingEvents.length > 0) {
      const sortedE = upcomingEvents.slice().sort((a, b) => {
        const da = a.start_datetime || '';
        const db = b.start_datetime || '';
        return da.localeCompare(db);
      });
      const e = sortedE[0];
      featuredEvent = {
        id: e.id,
        title: e.title,
        slug: e.slug,
        eventType: e.event_type,
        eventTypeLabel: this._getEventTypeLabel(e.event_type),
        topic: e.topic,
        topicLabel: this._getEventTopicLabel(e.topic),
        startDatetime: e.start_datetime,
        timeZone: e.time_zone || '',
        isFree: !!e.is_free,
        price: e.price,
        priceDisplay: e.is_free ? 'Free' : this._formatPrice(e.price, e.currency || 'usd')
      };
    }

    const blogRaw = this._getFromStorage('blog_posts', []);
    const published = blogRaw.filter((p) => p.status === 'published');
    const recentBlogPosts = published
      .slice()
      .sort((a, b) => {
        const da = a.published_at || '';
        const db = b.published_at || '';
        return db.localeCompare(da);
      })
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        excerpt: p.excerpt || '',
        primaryTopic: p.primary_topic,
        primaryTopicLabel: this._getPrimaryTopicLabel(p.primary_topic),
        publishedAt: p.published_at
      }));

    return {
      hero,
      navigationTiles,
      featuredTopics,
      featuredResource,
      featuredEvent,
      recentBlogPosts
    };
  }

  // =========================
  // Speaking Topics & Shortlist
  // =========================

  getSpeakingTopicFilterOptions() {
    const audiences = [
      { value: 'technology', label: 'Technology' },
      { value: 'startups', label: 'Startups' },
      { value: 'finance', label: 'Finance' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'general_business', label: 'General Business' },
      { value: 'education', label: 'Education' },
      { value: 'nonprofit', label: 'Nonprofit' },
      { value: 'other', label: 'Other' }
    ];

    const formats = [
      { value: 'keynote', label: 'Keynote' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'breakout_session', label: 'Breakout Session' },
      { value: 'fireside_chat', label: 'Fireside Chat' }
    ];

    const ratingThresholds = [
      { value: 4.5, label: '4.5 stars & up' },
      { value: 4.0, label: '4.0 stars & up' },
      { value: 3.5, label: '3.5 stars & up' }
    ];

    const topicsRaw = this._getFromStorage('speaking_topics', []);
    let minMinutes = 0;
    let maxMinutes = 0;
    if (topicsRaw.length > 0) {
      topicsRaw.forEach((t) => {
        const d = t.duration_minutes || 0;
        if (!minMinutes || d < minMinutes) minMinutes = d;
        if (!maxMinutes || d > maxMinutes) maxMinutes = d;
      });
    } else {
      minMinutes = 20;
      maxMinutes = 120;
    }

    const durationRange = {
      minMinutes,
      maxMinutes,
      stepMinutes: 5
    };

    const sortOptions = [
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' },
      { value: 'title_asc', label: 'Title A–Z' }
    ];

    return {
      audiences,
      formats,
      ratingThresholds,
      durationRange,
      sortOptions
    };
  }

  listSpeakingTopics(filters, sort, page = 1, pageSize = 20) {
    const topicsRaw = this._getFromStorage('speaking_topics', []);
    const shortlistedRaw = this._getFromStorage('shortlisted_topics', []);
    const shortlistedIds = new Set(shortlistedRaw.map((s) => s.topic_id));

    let items = topicsRaw.slice();

    if (filters && typeof filters === 'object') {
      if (filters.primaryAudience) {
        const fa = filters.primaryAudience;
        items = items.filter((t) => t.primary_audience === fa);
      }
      if (filters.format) {
        items = items.filter((t) => t.format === filters.format);
      }
      if (typeof filters.durationMin === 'number') {
        items = items.filter((t) => (t.duration_minutes || 0) >= filters.durationMin);
      }
      if (typeof filters.durationMax === 'number') {
        items = items.filter((t) => (t.duration_minutes || 0) <= filters.durationMax);
      }
      if (typeof filters.minRating === 'number') {
        items = items.filter((t) => (t.rating || 0) >= filters.minRating);
      }
      if (filters.onlyFeatured) {
        items = items.filter((t) => !!t.is_featured);
      }
    }

    if (sort === 'rating_desc') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'popularity_desc') {
      items.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sort === 'title_asc') {
      items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (page - 1) * pageSize;
    const pageItems = items.slice(startIndex, startIndex + pageSize);

    const topics = pageItems.map((t) => ({
      id: t.id,
      title: t.title,
      slug: t.slug,
      summary: t.summary || '',
      format: t.format,
      formatLabel: this._getFormatLabel(t.format),
      primaryAudience: t.primary_audience,
      primaryAudienceLabel: this._getAudienceLabel(t.primary_audience),
      durationMinutes: t.duration_minutes,
      durationLabel: (t.duration_minutes || 0) + ' minutes',
      rating: t.rating,
      ratingCount: t.rating_count || 0,
      popularityScore: t.popularity_score || 0,
      isFeatured: !!t.is_featured,
      isShortlisted: shortlistedIds.has(t.id)
    }));

    return {
      topics,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  getSpeakingTopicDetails(topicId) {
    const topicsRaw = this._getFromStorage('speaking_topics', []);
    const shortlistedRaw = this._getFromStorage('shortlisted_topics', []);
    const topic = topicsRaw.find((t) => t.id === topicId) || null;

    if (!topic) {
      return {
        topic: null,
        isShortlisted: false
      };
    }

    const isShortlisted = shortlistedRaw.some((s) => s.topic_id === topicId);

    return {
      topic: {
        id: topic.id,
        title: topic.title,
        slug: topic.slug,
        summary: topic.summary || '',
        description: topic.description || '',
        format: topic.format,
        formatLabel: this._getFormatLabel(topic.format),
        primaryAudience: topic.primary_audience,
        primaryAudienceLabel: this._getAudienceLabel(topic.primary_audience),
        durationMinutes: topic.duration_minutes,
        durationLabel: (topic.duration_minutes || 0) + ' minutes',
        rating: topic.rating,
        ratingCount: topic.rating_count || 0,
        popularityScore: topic.popularity_score || 0,
        isFeatured: !!topic.is_featured,
        createdAt: topic.created_at || null
      },
      isShortlisted
    };
  }

  saveSpeakingTopicToShortlist(topicId, notes) {
    const topicsRaw = this._getFromStorage('speaking_topics', []);
    const topic = topicsRaw.find((t) => t.id === topicId);
    if (!topic) {
      return {
        success: false,
        shortlistedTopicId: null,
        message: 'Topic not found',
        shortlistCount: this._getFromStorage('shortlisted_topics', []).length
      };
    }

    const shortlistedRaw = this._getFromStorage('shortlisted_topics', []);
    const existing = shortlistedRaw.find((s) => s.topic_id === topicId);
    const now = this._getCurrentDateTime();

    let shortlistedTopicId;
    if (existing) {
      existing.notes = typeof notes === 'string' ? notes : existing.notes;
      existing.saved_at = now;
      shortlistedTopicId = existing.id;
    } else {
      const newItem = {
        id: this._generateId('shortlisted_topic'),
        topic_id: topicId,
        saved_at: now,
        notes: typeof notes === 'string' ? notes : ''
      };
      shortlistedRaw.push(newItem);
      shortlistedTopicId = newItem.id;
    }

    this._saveToStorage('shortlisted_topics', shortlistedRaw);

    return {
      success: true,
      shortlistedTopicId,
      message: 'Topic saved to shortlist',
      shortlistCount: shortlistedRaw.length
    };
  }

  removeShortlistedTopic(topicId) {
    const shortlistedRaw = this._getFromStorage('shortlisted_topics', []);
    const before = shortlistedRaw.length;
    const filtered = shortlistedRaw.filter((s) => s.topic_id !== topicId);
    this._saveToStorage('shortlisted_topics', filtered);
    const removed = before !== filtered.length;
    return {
      success: true,
      message: removed ? 'Topic removed from shortlist' : 'Topic was not in shortlist',
      shortlistCount: filtered.length
    };
  }

  getShortlistedTopics() {
    const shortlistedRaw = this._getFromStorage('shortlisted_topics', []);
    const topicsRaw = this._getFromStorage('speaking_topics', []);

    return shortlistedRaw.map((s) => {
      const t = topicsRaw.find((topic) => topic.id === s.topic_id) || null;
      const topicMapped = t
        ? {
            id: t.id,
            title: t.title,
            slug: t.slug,
            format: t.format,
            formatLabel: this._getFormatLabel(t.format),
            primaryAudience: t.primary_audience,
            primaryAudienceLabel: this._getAudienceLabel(t.primary_audience),
            rating: t.rating,
            durationMinutes: t.duration_minutes
          }
        : null;
      return {
        shortlistedTopicId: s.id,
        savedAt: s.saved_at,
        topic: topicMapped,
        notes: s.notes || ''
      };
    });
  }

  // =========================
  // Booking Requests
  // =========================

  getBookingFormOptions() {
    const eventTypes = [
      { value: 'corporate_conference', label: 'Corporate Conference' },
      { value: 'company_offsite', label: 'Company Offsite' },
      { value: 'sales_kickoff', label: 'Sales Kickoff' },
      { value: 'leadership_retreat', label: 'Leadership Retreat' },
      { value: 'virtual_summit', label: 'Virtual Summit' },
      { value: 'other', label: 'Other' }
    ];

    const budgetRanges = [
      { value: 'under_5000', label: 'Under $5,000', min: 0, max: 5000 },
      { value: '5000_10000', label: '$5,000–$10,000', min: 5000, max: 10000 },
      { value: '10000_15000', label: '$10,000–$15,000', min: 10000, max: 15000 },
      { value: '15000_20000', label: '$15,000–$20,000', min: 15000, max: 20000 },
      { value: 'over_20000', label: 'Over $20,000', min: 20000, max: null },
      { value: 'custom', label: 'Custom', min: null, max: null }
    ];

    const currencies = [{ value: 'usd', label: 'USD ($)' }];

    const locationTypes = [
      { value: 'in_person', label: 'In-Person' },
      { value: 'virtual', label: 'Virtual' },
      { value: 'hybrid', label: 'Hybrid' },
      { value: 'to_be_determined', label: 'To Be Determined' }
    ];

    const suggestedDurations = [
      { minutes: 30, label: '30 minutes' },
      { minutes: 45, label: '45 minutes' },
      { minutes: 60, label: '60 minutes' },
      { minutes: 90, label: '90 minutes' }
    ];

    const now = new Date();
    const minDate = now.toISOString();
    const max = new Date(now.getTime());
    max.setFullYear(max.getFullYear() + 2);
    const maxDate = max.toISOString();

    const datePickerDefaults = {
      minDate,
      maxDate
    };

    return {
      eventTypes,
      budgetRanges,
      currencies,
      locationTypes,
      suggestedDurations,
      datePickerDefaults
    };
  }

  submitBookingRequest(
    eventType,
    eventTitle,
    eventDate,
    estimatedAudienceSize,
    budgetRange,
    budgetMin,
    budgetMax,
    currency,
    locationType,
    locationDetails,
    keynoteDurationMinutes,
    additionalDetails
  ) {
    const bookingRequests = this._getFromStorage('booking_requests', []);
    const id = this._generateId('booking');
    const now = this._getCurrentDateTime();

    const record = {
      id,
      event_type: eventType,
      event_title: eventTitle || null,
      event_date: eventDate,
      estimated_audience_size: estimatedAudienceSize,
      budget_range: budgetRange,
      budget_min: typeof budgetMin === 'number' ? budgetMin : null,
      budget_max: typeof budgetMax === 'number' ? budgetMax : null,
      currency: currency || 'usd',
      location_type: locationType || 'to_be_determined',
      location_details: locationDetails || null,
      keynote_duration_minutes: typeof keynoteDurationMinutes === 'number' ? keynoteDurationMinutes : null,
      additional_details: additionalDetails || null,
      status: 'new',
      created_at: now,
      updated_at: now
    };

    bookingRequests.push(record);
    this._saveToStorage('booking_requests', bookingRequests);

    return {
      bookingRequestId: id,
      status: 'new',
      success: true,
      message: 'Your booking request has been submitted. We will respond as soon as possible.'
    };
  }

  // =========================
  // Testimonials & Favorites
  // =========================

  getTestimonialFilterOptions() {
    const industries = [
      { value: 'finance', label: 'Finance' },
      { value: 'financial_services', label: 'Financial Services' },
      { value: 'technology', label: 'Technology' },
      { value: 'healthcare', label: 'Healthcare' },
      { value: 'education', label: 'Education' },
      { value: 'retail', label: 'Retail' },
      { value: 'manufacturing', label: 'Manufacturing' },
      { value: 'nonprofit', label: 'Nonprofit' },
      { value: 'other', label: 'Other' }
    ];

    const clientTypes = [
      { value: 'corporate', label: 'Corporate' },
      { value: 'small_business', label: 'Small Business' },
      { value: 'association', label: 'Association' },
      { value: 'individual', label: 'Individual' },
      { value: 'nonprofit', label: 'Nonprofit' }
    ];

    const ratingThresholds = [
      { value: 5, label: '5 stars only' },
      { value: 4.5, label: '4.5 stars & up' },
      { value: 4.0, label: '4.0 stars & up' }
    ];

    const sortOptions = [
      { value: 'most_recent', label: 'Most Recent' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'client_name_asc', label: 'Client Name A–Z' }
    ];

    return {
      industries,
      clientTypes,
      ratingThresholds,
      sortOptions
    };
  }

  listTestimonials(filters, sort, page = 1, pageSize = 20) {
    const testimonialsRaw = this._getFromStorage('testimonials', []);
    const favoritesRaw = this._getFromStorage('favorite_testimonials', []);
    const favoriteIds = new Set(favoritesRaw.map((f) => f.testimonial_id));

    let items = testimonialsRaw.filter((t) => t.visibility === 'public');

    if (filters && typeof filters === 'object') {
      if (filters.industry) {
        const ind = filters.industry;
        if (ind === 'finance' || ind === 'financial_services') {
          items = items.filter(
            (t) => t.industry === 'finance' || t.industry === 'financial_services'
          );
        } else {
          items = items.filter((t) => t.industry === ind);
        }
      }
      if (filters.clientType) {
        items = items.filter((t) => t.client_type === filters.clientType);
      }
      if (typeof filters.minRating === 'number') {
        items = items.filter((t) => (t.rating || 0) >= filters.minRating);
      }
      if (filters.onlyCorporate) {
        items = items.filter((t) => t.is_corporate === true || t.client_type === 'corporate');
      }
    }

    if (sort === 'most_recent') {
      items.sort((a, b) => {
        const da = a.event_date || a.created_at || '';
        const db = b.event_date || b.created_at || '';
        return db.localeCompare(da);
      });
    } else if (sort === 'rating_desc') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'client_name_asc') {
      items.sort((a, b) => (a.client_name || '').localeCompare(b.client_name || ''));
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (page - 1) * pageSize;
    const pageItems = items.slice(startIndex, startIndex + pageSize);

    const testimonials = pageItems.map((t) => ({
      id: t.id,
      clientName: t.client_name,
      clientTitle: t.client_title || '',
      organization: t.organization,
      industry: t.industry,
      industryLabel: this._getIndustryLabel(t.industry),
      clientType: t.client_type || null,
      rating: t.rating,
      headline: t.headline || '',
      contentExcerpt: (t.content || '').slice(0, 240),
      eventName: t.event_name || '',
      eventDate: t.event_date || null,
      isCorporate: t.is_corporate === true || t.client_type === 'corporate',
      createdAt: t.created_at,
      isFavorited: favoriteIds.has(t.id)
    }));

    return {
      testimonials,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  favoriteTestimonial(testimonialId) {
    const testimonialsRaw = this._getFromStorage('testimonials', []);
    const testimonial = testimonialsRaw.find((t) => t.id === testimonialId && t.visibility === 'public');
    const favoritesRaw = this._getFromStorage('favorite_testimonials', []);
    if (!testimonial) {
      return {
        success: false,
        favoriteId: null,
        message: 'Testimonial not found'
      };
    }

    const existing = favoritesRaw.find((f) => f.testimonial_id === testimonialId);
    if (existing) {
      return {
        success: true,
        favoriteId: existing.id,
        message: 'Testimonial already in favorites'
      };
    }

    const favoriteId = this._generateId('favorite_testimonial');
    favoritesRaw.push({
      id: favoriteId,
      testimonial_id: testimonialId,
      saved_at: this._getCurrentDateTime()
    });
    this._saveToStorage('favorite_testimonials', favoritesRaw);

    return {
      success: true,
      favoriteId,
      message: 'Testimonial added to favorites'
    };
  }

  removeFavoriteTestimonial(testimonialId) {
    const favoritesRaw = this._getFromStorage('favorite_testimonials', []);
    const filtered = favoritesRaw.filter((f) => f.testimonial_id !== testimonialId);
    const removed = filtered.length !== favoritesRaw.length;
    this._saveToStorage('favorite_testimonials', filtered);
    return {
      success: true,
      message: removed ? 'Testimonial removed from favorites' : 'Testimonial was not in favorites'
    };
  }

  getFavoriteTestimonials() {
    const favoritesRaw = this._getFromStorage('favorite_testimonials', []);
    const testimonialsRaw = this._getFromStorage('testimonials', []);

    return favoritesRaw.map((f) => {
      const t = testimonialsRaw.find((tt) => tt.id === f.testimonial_id) || null;
      const testimonialMapped = t
        ? {
            id: t.id,
            clientName: t.client_name,
            organization: t.organization,
            industryLabel: this._getIndustryLabel(t.industry),
            rating: t.rating,
            headline: t.headline || '',
            contentExcerpt: (t.content || '').slice(0, 240)
          }
        : null;
      return {
        favoriteId: f.id,
        savedAt: f.saved_at,
        testimonial: testimonialMapped
      };
    });
  }

  // =========================
  // Store & Cart
  // =========================

  getStoreFilterOptions() {
    const categories = [
      { value: 'books', label: 'Books' },
      { value: 'online_courses', label: 'Online Courses' },
      { value: 'other', label: 'Other' }
    ];

    const ratingThresholds = [
      { value: 4.5, label: '4.5 stars & up' },
      { value: 4.0, label: '4.0 stars & up' },
      { value: 3.5, label: '3.5 stars & up' }
    ];

    const productsRaw = this._getFromStorage('products', []);
    const active = productsRaw.filter((p) => p.status === 'active');
    let min = 0;
    let max = 0;
    active.forEach((p) => {
      const price = p.price || 0;
      if (!min || price < min) min = price;
      if (!max || price > max) max = price;
    });

    const priceRange = {
      min,
      max,
      currency: 'usd'
    };

    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'rating_desc', label: 'Rating: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' }
    ];

    return {
      categories,
      ratingThresholds,
      priceRange,
      sortOptions
    };
  }

  listProducts(filters, sort, page = 1, pageSize = 20) {
    const productsRaw = this._getFromStorage('products', []);
    let items = productsRaw.filter((p) => p.status === 'active');

    if (filters && typeof filters === 'object') {
      if (filters.category) {
        items = items.filter((p) => p.category === filters.category);
      }
      if (filters.productType) {
        items = items.filter((p) => p.product_type === filters.productType);
      }
      if (typeof filters.maxPrice === 'number') {
        items = items.filter((p) => (p.price || 0) <= filters.maxPrice);
      }
      if (typeof filters.minPrice === 'number') {
        items = items.filter((p) => (p.price || 0) >= filters.minPrice);
      }
      if (typeof filters.minRating === 'number') {
        items = items.filter((p) => (p.rating || 0) >= filters.minRating);
      }
      if (filters.onlyFree) {
        items = items.filter((p) => p.is_free === true);
      }
    }

    if (sort === 'price_asc') {
      items.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price_desc') {
      items.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'rating_desc') {
      items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'popularity_desc') {
      items.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (page - 1) * pageSize;
    const pageItems = items.slice(startIndex, startIndex + pageSize);

    const products = pageItems.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      shortDescription: p.short_description || '',
      productType: p.product_type,
      category: p.category,
      categoryLabel: p.category === 'books' ? 'Books' : p.category === 'online_courses' ? 'Online Courses' : 'Other',
      price: p.price,
      priceDisplay: p.is_free ? 'Free' : this._formatPrice(p.price, p.currency || 'usd'),
      currency: p.currency || 'usd',
      isFree: !!p.is_free,
      rating: p.rating,
      ratingCount: p.rating_count || 0,
      popularityScore: p.popularity_score || 0,
      coverImageUrl: p.cover_image_url || ''
    }));

    return {
      products,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  getProductDetails(productId) {
    const productsRaw = this._getFromStorage('products', []);
    const p = productsRaw.find((prod) => prod.id === productId) || null;
    if (!p) {
      return { product: null };
    }
    return {
      product: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        shortDescription: p.short_description || '',
        description: p.description || '',
        productType: p.product_type,
        category: p.category,
        categoryLabel: p.category === 'books' ? 'Books' : p.category === 'online_courses' ? 'Online Courses' : 'Other',
        price: p.price,
        priceDisplay: p.is_free ? 'Free' : this._formatPrice(p.price, p.currency || 'usd'),
        currency: p.currency || 'usd',
        isFree: !!p.is_free,
        rating: p.rating,
        ratingCount: p.rating_count || 0,
        popularityScore: p.popularity_score || 0,
        coverImageUrl: p.cover_image_url || '',
        pageCount: p.page_count || null,
        courseDurationMinutes: p.course_duration_minutes || null,
        bookFormat: p.book_format || 'not_applicable',
        status: p.status
      }
    };
  }

  addToCart(productId, quantity = 1) {
    const productsRaw = this._getFromStorage('products', []);
    const product = productsRaw.find((p) => p.id === productId && p.status === 'active');
    if (!product) {
      return {
        success: false,
        cartId: null,
        message: 'Product not found or inactive',
        cart: null
      };
    }

    if (quantity <= 0) {
      quantity = 1;
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);

    const existing = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.product_id === productId
    );

    const now = this._getCurrentDateTime();

    if (existing) {
      existing.quantity += quantity;
      existing.line_total = existing.unit_price * existing.quantity;
    } else {
      const newItem = {
        id: this._generateId('cart_item'),
        cart_id: cart.id,
        product_id: product.id,
        product_name_snapshot: product.name,
        product_category_snapshot: product.category,
        unit_price: product.price,
        quantity: quantity,
        line_total: product.price * quantity,
        added_at: now
      };
      cartItems.push(newItem);
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart, cartItems);

    return {
      success: true,
      cartId: cart.id,
      message: 'Product added to cart',
      cart: {
        itemsCount: cart.items_count,
        subtotal: cart.subtotal,
        total: cart.total,
        currency: cart.currency
      }
    };
  }

  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const productsRaw = this._getFromStorage('products', []);

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = itemsForCart.map((ci) => {
      const product = productsRaw.find((p) => p.id === ci.product_id) || null;
      return {
        cartItemId: ci.id,
        productId: ci.product_id,
        productName: ci.product_name_snapshot,
        productCategory: ci.product_category_snapshot,
        productType: product ? product.product_type : null,
        unitPrice: ci.unit_price,
        unitPriceDisplay: this._formatPrice(ci.unit_price, cart.currency),
        quantity: ci.quantity,
        lineTotal: ci.line_total,
        lineTotalDisplay: this._formatPrice(ci.line_total, cart.currency),
        product: product
      };
    });

    return {
      cartId: cart.id,
      items,
      subtotal: cart.subtotal,
      subtotalDisplay: this._formatPrice(cart.subtotal, cart.currency),
      total: cart.total,
      totalDisplay: this._formatPrice(cart.total, cart.currency),
      currency: cart.currency,
      discountTotal: cart.discount_total,
      couponCode: cart.coupon_code || null
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const index = cartItems.findIndex((ci) => ci.id === cartItemId && ci.cart_id === cart.id);

    if (index === -1) {
      return {
        success: false,
        message: 'Cart item not found',
        cart: null
      };
    }

    if (quantity <= 0) {
      cartItems.splice(index, 1);
    } else {
      const item = cartItems[index];
      item.quantity = quantity;
      item.line_total = item.unit_price * quantity;
    }

    this._saveToStorage('cart_items', cartItems);
    this._recalculateCartTotals(cart, cartItems);

    return {
      success: true,
      message: 'Cart updated',
      cart: {
        itemsCount: cart.items_count,
        subtotal: cart.subtotal,
        subtotalDisplay: this._formatPrice(cart.subtotal, cart.currency),
        total: cart.total,
        totalDisplay: this._formatPrice(cart.total, cart.currency)
      }
    };
  }

  removeCartItem(cartItemId) {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items', []);
    const filtered = cartItems.filter((ci) => ci.id !== cartItemId || ci.cart_id !== cart.id);
    const removed = filtered.length !== cartItems.length;
    this._saveToStorage('cart_items', filtered);
    this._recalculateCartTotals(cart, filtered);
    return {
      success: true,
      message: removed ? 'Item removed from cart' : 'Item was not in cart',
      cart: {
        itemsCount: cart.items_count,
        subtotal: cart.subtotal,
        total: cart.total
      }
    };
  }

  // =========================
  // Resources & Library
  // =========================

  getResourceFilterOptions() {
    const types = [
      { value: 'checklist', label: 'Checklists' },
      { value: 'guide', label: 'Guides' },
      { value: 'template', label: 'Templates' },
      { value: 'ebook', label: 'eBooks' },
      { value: 'worksheet', label: 'Worksheets' },
      { value: 'video', label: 'Videos' },
      { value: 'other', label: 'Other' }
    ];

    const topics = [
      { value: 'new_managers', label: 'New Managers' },
      { value: 'first_time_leaders', label: 'First-Time Leaders' },
      { value: 'productivity', label: 'Productivity' },
      { value: 'burnout', label: 'Burnout' },
      { value: 'goal_setting', label: 'Goal Setting' },
      { value: 'communication', label: 'Communication' },
      { value: 'other', label: 'Other' }
    ];

    const priceOptions = [
      { value: 'free_only', label: 'Free only' },
      { value: 'paid_only', label: 'Paid only' },
      { value: 'all', label: 'All' }
    ];

    const lengthOptions = [
      { value: 'under_10_pages', label: 'Under 10 pages' },
      { value: '10_20_pages', label: '10–20 pages' },
      { value: 'over_20_pages', label: 'Over 20 pages' },
      { value: 'not_applicable', label: 'Not applicable' }
    ];

    const sortOptions = [
      { value: 'most_downloaded', label: 'Most Downloaded' },
      { value: 'popularity_desc', label: 'Most Popular' },
      { value: 'newest_first', label: 'Newest First' }
    ];

    return {
      types,
      topics,
      priceOptions,
      lengthOptions,
      sortOptions
    };
  }

  listResources(filters, sort, page = 1, pageSize = 20) {
    const resourcesRaw = this._getFromStorage('resources', []);
    const libraryRaw = this._getFromStorage('library_items', []);
    const libraryIds = new Set(libraryRaw.map((li) => li.resource_id));

    let items = resourcesRaw.filter((r) => r.status === 'active');

    if (filters && typeof filters === 'object') {
      if (filters.type) {
        items = items.filter((r) => r.type === filters.type);
      }
      if (filters.topic) {
        const topic = filters.topic;
        if (topic === 'new_managers' || topic === 'first_time_leaders') {
          items = items.filter(
            (r) => r.topic === 'new_managers' || r.topic === 'first_time_leaders'
          );
        } else {
          items = items.filter((r) => r.topic === topic);
        }
      }
      if (filters.onlyFree) {
        items = items.filter((r) => r.is_free === true);
      }
      if (filters.lengthLabel) {
        items = items.filter((r) => r.length_label === filters.lengthLabel);
      }
    }

    if (sort === 'most_downloaded') {
      items.sort((a, b) => (b.downloads_count || 0) - (a.downloads_count || 0));
    } else if (sort === 'popularity_desc') {
      items.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sort === 'newest_first') {
      items.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (page - 1) * pageSize;
    const pageItems = items.slice(startIndex, startIndex + pageSize);

    const resources = pageItems.map((r) => ({
      id: r.id,
      title: r.title,
      slug: r.slug,
      description: r.description || '',
      type: r.type,
      typeLabel: this._getResourceTypeLabel(r.type),
      topic: r.topic,
      topicLabel: this._getResourceTopicLabel(r.topic),
      isFree: !!r.is_free,
      price: r.price,
      priceDisplay: r.is_free ? 'Free' : this._formatPrice(r.price, 'usd'),
      pages: r.pages || null,
      lengthLabel: r.length_label || 'not_applicable',
      downloadsCount: r.downloads_count || 0,
      popularityScore: r.popularity_score || 0,
      isInLibrary: libraryIds.has(r.id)
    }));

    return {
      resources,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  getResourceDetails(resourceId) {
    const resourcesRaw = this._getFromStorage('resources', []);
    const libraryRaw = this._getFromStorage('library_items', []);
    const r = resourcesRaw.find((res) => res.id === resourceId) || null;
    if (!r) {
      return {
        resource: null,
        isInLibrary: false
      };
    }
    const isInLibrary = libraryRaw.some((li) => li.resource_id === resourceId);
    return {
      resource: {
        id: r.id,
        title: r.title,
        slug: r.slug,
        description: r.description || '',
        type: r.type,
        typeLabel: this._getResourceTypeLabel(r.type),
        topic: r.topic,
        topicLabel: this._getResourceTopicLabel(r.topic),
        isFree: !!r.is_free,
        price: r.price,
        priceDisplay: r.is_free ? 'Free' : this._formatPrice(r.price, 'usd'),
        pages: r.pages || null,
        lengthLabel: r.length_label || 'not_applicable',
        fileUrl: r.file_url || '',
        status: r.status
      },
      isInLibrary
    };
  }

  saveResourceToLibrary(resourceId) {
    const resourcesRaw = this._getFromStorage('resources', []);
    const resource = resourcesRaw.find((r) => r.id === resourceId && r.status === 'active');
    if (!resource) {
      return {
        success: false,
        libraryItemId: null,
        message: 'Resource not found or inactive'
      };
    }

    const libraryRaw = this._getFromStorage('library_items', []);
    const existing = libraryRaw.find((li) => li.resource_id === resourceId);
    if (existing) {
      return {
        success: true,
        libraryItemId: existing.id,
        message: 'Resource already in library'
      };
    }

    const libraryItemId = this._generateId('library_item');
    libraryRaw.push({
      id: libraryItemId,
      resource_id: resourceId,
      saved_at: this._getCurrentDateTime()
    });
    this._saveToStorage('library_items', libraryRaw);

    return {
      success: true,
      libraryItemId,
      message: 'Resource added to library'
    };
  }

  getLibraryItems() {
    const libraryRaw = this._getFromStorage('library_items', []);
    const resourcesRaw = this._getFromStorage('resources', []);

    return libraryRaw.map((li) => {
      const r = resourcesRaw.find((res) => res.id === li.resource_id) || null;
      const resourceMapped = r
        ? {
            id: r.id,
            title: r.title,
            slug: r.slug,
            type: r.type,
            typeLabel: this._getResourceTypeLabel(r.type),
            topic: r.topic,
            topicLabel: this._getResourceTopicLabel(r.topic),
            isFree: !!r.is_free,
            priceDisplay: r.is_free ? 'Free' : this._formatPrice(r.price, 'usd')
          }
        : null;
      return {
        libraryItemId: li.id,
        savedAt: li.saved_at,
        resource: resourceMapped
      };
    });
  }

  removeLibraryItem(resourceId) {
    const libraryRaw = this._getFromStorage('library_items', []);
    const filtered = libraryRaw.filter((li) => li.resource_id !== resourceId);
    const removed = filtered.length !== libraryRaw.length;
    this._saveToStorage('library_items', filtered);
    return {
      success: true,
      message: removed ? 'Resource removed from library' : 'Resource was not in library'
    };
  }

  // =========================
  // Events & Registrations
  // =========================

  getEventFilterOptions() {
    const eventTypes = [
      { value: 'webinar', label: 'Webinar' },
      { value: 'live_online', label: 'Live Online' },
      { value: 'in_person', label: 'In-Person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const topics = [
      { value: 'leadership', label: 'Leadership' },
      { value: 'resilience', label: 'Resilience' },
      { value: 'burnout', label: 'Burnout' },
      { value: 'motivation', label: 'Motivation' },
      { value: 'productivity', label: 'Productivity' },
      { value: 'other', label: 'Other' }
    ];

    const priceOptions = [
      { value: 'free_only', label: 'Free only' },
      { value: 'all', label: 'All' }
    ];

    const deliveryModes = [
      { value: 'virtual', label: 'Virtual' },
      { value: 'in_person', label: 'In-Person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const sortOptions = [
      { value: 'date_asc', label: 'Date: Soonest First' },
      { value: 'date_desc', label: 'Date: Latest First' }
    ];

    const dateRangePresets = [
      { key: 'this_month', label: 'This Month' },
      { key: 'next_month', label: 'Next Month' }
    ];

    return {
      eventTypes,
      topics,
      priceOptions,
      deliveryModes,
      sortOptions,
      dateRangePresets
    };
  }

  listEvents(filters, sort, page = 1, pageSize = 20) {
    const eventsRaw = this._getFromStorage('events', []);
    let items = eventsRaw.slice();

    if (filters && typeof filters === 'object') {
      if (filters.eventType) {
        items = items.filter((e) => e.event_type === filters.eventType);
      }
      if (filters.topic) {
        items = items.filter((e) => e.topic === filters.topic);
      }
      if (filters.onlyFree) {
        items = items.filter((e) => e.is_free === true);
      }
      if (filters.deliveryMode) {
        items = items.filter((e) => e.delivery_mode === filters.deliveryMode);
      }
      if (filters.startDate) {
        items = items.filter((e) => !e.start_datetime || e.start_datetime >= filters.startDate);
      }
      if (filters.endDate) {
        items = items.filter((e) => !e.start_datetime || e.start_datetime <= filters.endDate);
      }
    }

    if (sort === 'date_desc') {
      items.sort((a, b) => (b.start_datetime || '').localeCompare(a.start_datetime || ''));
    } else {
      items.sort((a, b) => (a.start_datetime || '').localeCompare(b.start_datetime || ''));
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (page - 1) * pageSize;
    const pageItems = items.slice(startIndex, startIndex + pageSize);

    const events = pageItems.map((e) => ({
      id: e.id,
      title: e.title,
      slug: e.slug,
      eventType: e.event_type,
      eventTypeLabel: this._getEventTypeLabel(e.event_type),
      topic: e.topic,
      topicLabel: this._getEventTopicLabel(e.topic),
      deliveryMode: e.delivery_mode,
      deliveryModeLabel: this._getDeliveryModeLabel(e.delivery_mode),
      startDatetime: e.start_datetime,
      endDatetime: e.end_datetime || null,
      timeZone: e.time_zone || '',
      isFree: !!e.is_free,
      price: e.price,
      priceDisplay: e.is_free ? 'Free' : this._formatPrice(e.price, e.currency || 'usd'),
      registrationStatus: e.registration_status
    }));

    return {
      events,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  getEventDetails(eventId) {
    const eventsRaw = this._getFromStorage('events', []);
    const e = eventsRaw.find((ev) => ev.id === eventId) || null;
    if (!e) {
      return { event: null };
    }
    return {
      event: {
        id: e.id,
        title: e.title,
        slug: e.slug,
        description: e.description || '',
        eventType: e.event_type,
        eventTypeLabel: this._getEventTypeLabel(e.event_type),
        topic: e.topic,
        topicLabel: this._getEventTopicLabel(e.topic),
        deliveryMode: e.delivery_mode,
        deliveryModeLabel: this._getDeliveryModeLabel(e.delivery_mode),
        startDatetime: e.start_datetime,
        endDatetime: e.end_datetime || null,
        timeZone: e.time_zone || '',
        isFree: !!e.is_free,
        price: e.price,
        priceDisplay: e.is_free ? 'Free' : this._formatPrice(e.price, e.currency || 'usd'),
        registrationStatus: e.registration_status,
        maxAttendees: e.max_attendees || null,
        requirements: e.requirements || ''
      }
    };
  }

  registerForEvent(eventId, registrantName, email, organization, attendeeCount = 1, selectedTimeZone, notes) {
    const eventsRaw = this._getFromStorage('events', []);
    const event = eventsRaw.find((e) => e.id === eventId);
    if (!event) {
      return {
        registrationId: null,
        status: 'cancelled',
        success: false,
        message: 'Event not found'
      };
    }
    if (event.registration_status === 'closed' || event.registration_status === 'cancelled') {
      return {
        registrationId: null,
        status: event.registration_status,
        success: false,
        message: 'Registration is not open for this event'
      };
    }

    const registrations = this._getFromStorage('event_registrations', []);
    const registrationId = this._generateId('event_registration');
    const record = {
      id: registrationId,
      event_id: eventId,
      registrant_name: registrantName,
      email: email,
      organization: organization || null,
      attendee_count: attendeeCount,
      selected_time_zone: selectedTimeZone || null,
      notes: notes || null,
      status: 'submitted',
      registered_at: this._getCurrentDateTime()
    };

    registrations.push(record);
    this._saveToStorage('event_registrations', registrations);

    return {
      registrationId,
      status: 'submitted',
      success: true,
      message: 'Registration submitted successfully'
    };
  }

  // =========================
  // Blog & Reading List
  // =========================

  getBlogFilterOptions() {
    const topics = [
      { value: 'burnout', label: 'Burnout' },
      { value: 'leadership', label: 'Leadership' },
      { value: 'resilience', label: 'Resilience' },
      { value: 'productivity', label: 'Productivity' },
      { value: 'motivation', label: 'Motivation' },
      { value: 'other', label: 'Other' }
    ];

    const dateRangePresets = [
      { key: 'last_12_months', label: 'Last 12 months' },
      { key: 'last_30_days', label: 'Last 30 days' },
      { key: 'last_7_days', label: 'Last 7 days' }
    ];

    const sortOptions = [
      { value: 'popularity_desc', label: 'Most Popular' },
      { value: 'newest_first', label: 'Newest First' },
      { value: 'title_asc', label: 'Title A–Z' }
    ];

    return { topics, dateRangePresets, sortOptions };
  }

  searchBlogPosts(query, filters, sort, page = 1, pageSize = 20) {
    const postsRaw = this._getFromStorage('blog_posts', []);
    const readingListRaw = this._getFromStorage('reading_list_items', []);
    const readingIds = new Set(readingListRaw.map((r) => r.blog_post_id));

    let items = postsRaw.filter((p) => p.status === 'published');

    if (query && typeof query === 'string' && query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter((p) => {
        const inTitle = (p.title || '').toLowerCase().includes(q);
        const inContent = (p.content || '').toLowerCase().includes(q);
        const inTags = Array.isArray(p.tags)
          ? p.tags.some((t) => (t || '').toLowerCase().includes(q))
          : false;
        return inTitle || inContent || inTags;
      });
    }

    let startDate = null;
    let endDate = null;

    if (filters && typeof filters === 'object') {
      if (filters.primaryTopic) {
        items = items.filter((p) => p.primary_topic === filters.primaryTopic);
      }
      if (filters.dateRangePreset) {
        const range = this._getDateRangeFromPreset(filters.dateRangePreset);
        startDate = range.start;
        endDate = range.end;
      }
      if (filters.startDate) {
        startDate = filters.startDate;
      }
      if (filters.endDate) {
        endDate = filters.endDate;
      }
    }

    if (startDate) {
      items = items.filter((p) => (p.published_at || '') >= startDate);
    }
    if (endDate) {
      items = items.filter((p) => (p.published_at || '') <= endDate);
    }

    if (sort === 'newest_first') {
      items.sort((a, b) => (b.published_at || '').localeCompare(a.published_at || ''));
    } else if (sort === 'title_asc') {
      items.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sort === 'popularity_desc') {
      items.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (page - 1) * pageSize;
    const pageItems = items.slice(startIndex, startIndex + pageSize);

    const posts = pageItems.map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt || '',
      primaryTopic: p.primary_topic,
      primaryTopicLabel: this._getPrimaryTopicLabel(p.primary_topic),
      tags: Array.isArray(p.tags) ? p.tags : [],
      readTimeMinutes: p.read_time_minutes || null,
      popularityScore: p.popularity_score || 0,
      viewsCount: p.views_count || 0,
      publishedAt: p.published_at,
      isInReadingList: readingIds.has(p.id)
    }));

    return {
      posts,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  getBlogPostDetails(blogPostId) {
    const postsRaw = this._getFromStorage('blog_posts', []);
    const readingListRaw = this._getFromStorage('reading_list_items', []);
    const post = postsRaw.find((p) => p.id === blogPostId) || null;
    if (!post) {
      return {
        post: null,
        isInReadingList: false,
        relatedPosts: []
      };
    }

    const isInReadingList = readingListRaw.some((r) => r.blog_post_id === blogPostId);

    const relatedPosts = postsRaw
      .filter((p) => p.id !== blogPostId && p.primary_topic === post.primary_topic)
      .slice(0, 3)
      .map((p) => ({ id: p.id, title: p.title, slug: p.slug }));

    return {
      post: {
        id: post.id,
        title: post.title,
        slug: post.slug,
        content: post.content,
        excerpt: post.excerpt || '',
        authorName: post.author_name || '',
        primaryTopic: post.primary_topic,
        primaryTopicLabel: this._getPrimaryTopicLabel(post.primary_topic),
        tags: Array.isArray(post.tags) ? post.tags : [],
        readTimeMinutes: post.read_time_minutes || null,
        publishedAt: post.published_at,
        updatedAt: post.updated_at || null
      },
      isInReadingList,
      relatedPosts
    };
  }

  saveBlogPostToReadingList(blogPostId) {
    const postsRaw = this._getFromStorage('blog_posts', []);
    const post = postsRaw.find((p) => p.id === blogPostId && p.status === 'published');
    if (!post) {
      return {
        success: false,
        readingListItemId: null,
        message: 'Blog post not found or unpublished'
      };
    }

    const readingRaw = this._getFromStorage('reading_list_items', []);
    const existing = readingRaw.find((r) => r.blog_post_id === blogPostId);
    if (existing) {
      return {
        success: true,
        readingListItemId: existing.id,
        message: 'Blog post already in reading list'
      };
    }

    const readingListItemId = this._generateId('reading_list_item');
    readingRaw.push({
      id: readingListItemId,
      blog_post_id: blogPostId,
      saved_at: this._getCurrentDateTime()
    });
    this._saveToStorage('reading_list_items', readingRaw);

    return {
      success: true,
      readingListItemId,
      message: 'Blog post added to reading list'
    };
  }

  getReadingListItems() {
    const readingRaw = this._getFromStorage('reading_list_items', []);
    const postsRaw = this._getFromStorage('blog_posts', []);

    return readingRaw.map((ri) => {
      const p = postsRaw.find((post) => post.id === ri.blog_post_id) || null;
      const postMapped = p
        ? {
            id: p.id,
            title: p.title,
            slug: p.slug,
            excerpt: p.excerpt || '',
            primaryTopicLabel: this._getPrimaryTopicLabel(p.primary_topic),
            publishedAt: p.published_at
          }
        : null;
      return {
        readingListItemId: ri.id,
        savedAt: ri.saved_at,
        post: postMapped
      };
    });
  }

  removeReadingListItem(blogPostId) {
    const readingRaw = this._getFromStorage('reading_list_items', []);
    const filtered = readingRaw.filter((ri) => ri.blog_post_id !== blogPostId);
    const removed = filtered.length !== readingRaw.length;
    this._saveToStorage('reading_list_items', filtered);
    return {
      success: true,
      message: removed ? 'Blog post removed from reading list' : 'Blog post was not in reading list'
    };
  }

  // =========================
  // Speaking Packages & Configurations
  // =========================

  getSpeakingPackageFilterOptions() {
    const deliveryModes = [
      { value: 'virtual', label: 'Virtual' },
      { value: 'in_person', label: 'In-Person' },
      { value: 'hybrid', label: 'Hybrid' }
    ];

    const audienceSizeTiers = [
      { value: 'up_to_50', label: 'Up to 50 attendees' },
      { value: 'up_to_150', label: 'Up to 150 attendees' },
      { value: 'up_to_300', label: 'Up to 300 attendees' },
      { value: 'up_to_1000_plus', label: 'Up to 1000+ attendees' }
    ];

    const sortOptions = [
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' },
      { value: 'popularity_desc', label: 'Most Popular' }
    ];

    return {
      deliveryModes,
      audienceSizeTiers,
      sortOptions
    };
  }

  listSpeakingPackages(filters, sort, page = 1, pageSize = 20) {
    const packagesRaw = this._getFromStorage('speaking_packages', []);
    let items = packagesRaw.filter((p) => p.status === 'active');

    if (filters && typeof filters === 'object') {
      if (filters.deliveryMode) {
        items = items.filter((p) => p.delivery_mode === filters.deliveryMode);
      }
      if (filters.audienceSizeTier) {
        items = items.filter((p) => p.audience_size_tier === filters.audienceSizeTier);
      }
      if (typeof filters.maxBasePrice === 'number') {
        items = items.filter((p) => (p.base_price || 0) <= filters.maxBasePrice);
      }
    }

    if (sort === 'price_desc') {
      items.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
    } else if (sort === 'popularity_desc') {
      items.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    } else if (sort === 'price_asc') {
      items.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    }

    const totalItems = items.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (page - 1) * pageSize;
    const pageItems = items.slice(startIndex, startIndex + pageSize);

    const packages = pageItems.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      description: p.description || '',
      deliveryMode: p.delivery_mode,
      deliveryModeLabel: this._getDeliveryModeLabel(p.delivery_mode),
      audienceSizeTier: p.audience_size_tier,
      audienceSizeLabel: this._getAudienceSizeLabel(p.audience_size_tier),
      basePrice: p.base_price,
      basePriceDisplay: this._formatPrice(p.base_price, p.currency || 'usd'),
      currency: p.currency || 'usd',
      durationMinutes: p.duration_minutes || null,
      durationLabel: p.duration_minutes ? p.duration_minutes + ' minutes' : '',
      popularityScore: p.popularity_score || 0
    }));

    return {
      packages,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages
      }
    };
  }

  getSpeakingPackageDetails(packageId) {
    const packagesRaw = this._getFromStorage('speaking_packages', []);
    const p = packagesRaw.find((pkg) => pkg.id === packageId) || null;
    if (!p) {
      return { package: null };
    }
    return {
      package: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description || '',
        deliveryMode: p.delivery_mode,
        deliveryModeLabel: this._getDeliveryModeLabel(p.delivery_mode),
        audienceSizeTier: p.audience_size_tier,
        audienceSizeLabel: this._getAudienceSizeLabel(p.audience_size_tier),
        basePrice: p.base_price,
        basePriceDisplay: this._formatPrice(p.base_price, p.currency || 'usd'),
        currency: p.currency || 'usd',
        durationMinutes: p.duration_minutes || null,
        durationLabel: p.duration_minutes ? p.duration_minutes + ' minutes' : '',
        includesRecordingRights: !!p.includes_recording_rights
      }
    };
  }

  getPackageAddons(deliveryMode) {
    const addonsRaw = this._getFromStorage('package_addons', []);
    let items = addonsRaw.slice();

    if (deliveryMode === 'virtual') {
      items = items.filter((a) => a.is_available_for_virtual === true);
    } else if (deliveryMode === 'in_person') {
      items = items.filter((a) => a.is_available_for_in_person === true);
    }

    return items.map((a) => ({
      addonId: a.id,
      name: a.name,
      description: a.description || '',
      addonType: a.addon_type,
      price: a.price,
      priceDisplay: this._formatPrice(a.price, a.currency || 'usd'),
      currency: a.currency || 'usd',
      maxDurationMinutes: a.max_duration_minutes || null,
      isAvailableForVirtual: !!a.is_available_for_virtual,
      isAvailableForInPerson: !!a.is_available_for_in_person,
      isDefaultSelected: !!a.is_default_selected
    }));
  }

  createPackageConfiguration(packageId, selectedAddonIds, notes) {
    const packagesRaw = this._getFromStorage('speaking_packages', []);
    const addonsRaw = this._getFromStorage('package_addons', []);
    const configurationsRaw = this._getFromStorage('package_configurations', []);
    const configAddonsRaw = this._getFromStorage('package_configuration_addons', []);

    const pkg = packagesRaw.find((p) => p.id === packageId && p.status === 'active');
    if (!pkg) {
      return {
        configurationId: null,
        status: 'archived',
        configuredBasePrice: 0,
        addonsTotalPrice: 0,
        totalPrice: 0,
        totalPriceDisplay: this._formatPrice(0, 'usd'),
        currency: 'usd',
        selectedAddons: []
      };
    }

    const addonIdsArray = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];
    const selectedAddons = addonsRaw.filter((a) => addonIdsArray.includes(a.id));

    const totals = this._calculatePackageConfigurationTotals(pkg, selectedAddons);
    const now = this._getCurrentDateTime();
    const configurationId = this._generateId('package_config');

    const configRecord = {
      id: configurationId,
      package_id: packageId,
      configured_base_price: totals.configured_base_price,
      addons_total_price: totals.addons_total_price,
      total_price: totals.total_price,
      currency: pkg.currency || 'usd',
      status: 'draft',
      notes: notes || null,
      created_at: now,
      updated_at: now
    };

    configurationsRaw.push(configRecord);

    selectedAddons.forEach((addon) => {
      const configAddonRecord = {
        id: this._generateId('package_config_addon'),
        package_configuration_id: configurationId,
        addon_id: addon.id,
        quantity: 1,
        added_at: now
      };
      configAddonsRaw.push(configAddonRecord);
    });

    this._saveToStorage('package_configurations', configurationsRaw);
    this._saveToStorage('package_configuration_addons', configAddonsRaw);

    const selectedAddonsMapped = selectedAddons.map((a) => ({
      addonId: a.id,
      name: a.name,
      price: a.price,
      priceDisplay: this._formatPrice(a.price, a.currency || 'usd')
    }));

    return {
      configurationId,
      status: 'draft',
      configuredBasePrice: totals.configured_base_price,
      addonsTotalPrice: totals.addons_total_price,
      totalPrice: totals.total_price,
      totalPriceDisplay: this._formatPrice(totals.total_price, pkg.currency || 'usd'),
      currency: pkg.currency || 'usd',
      selectedAddons: selectedAddonsMapped
    };
  }

  getPackageConfigurationSummary(configurationId) {
    const configurationsRaw = this._getFromStorage('package_configurations', []);
    const configAddonsRaw = this._getFromStorage('package_configuration_addons', []);
    const packagesRaw = this._getFromStorage('speaking_packages', []);
    const addonsRaw = this._getFromStorage('package_addons', []);

    const config = configurationsRaw.find((c) => c.id === configurationId) || null;
    if (!config) {
      return {
        configurationId: null,
        status: 'archived',
        createdAt: null,
        updatedAt: null,
        package: null,
        configuredBasePrice: 0,
        addonsTotalPrice: 0,
        totalPrice: 0,
        totalPriceDisplay: this._formatPrice(0, 'usd'),
        currency: 'usd',
        selectedAddons: []
      };
    }

    const pkg = packagesRaw.find((p) => p.id === config.package_id) || null;
    const packageSummary = pkg
      ? {
          packageId: pkg.id,
          name: pkg.name,
          deliveryModeLabel: this._getDeliveryModeLabel(pkg.delivery_mode),
          audienceSizeLabel: this._getAudienceSizeLabel(pkg.audience_size_tier)
        }
      : null;

    const configAddons = configAddonsRaw.filter(
      (ca) => ca.package_configuration_id === configurationId
    );
    const selectedAddons = configAddons.map((ca) => {
      const addon = addonsRaw.find((a) => a.id === ca.addon_id) || null;
      if (!addon) {
        return null;
      }
      return {
        addonId: addon.id,
        name: addon.name,
        addonType: addon.addon_type,
        price: addon.price,
        priceDisplay: this._formatPrice(addon.price, addon.currency || 'usd')
      };
    }).filter((a) => a !== null);

    return {
      configurationId: config.id,
      status: config.status,
      createdAt: config.created_at,
      updatedAt: config.updated_at,
      package: packageSummary,
      configuredBasePrice: config.configured_base_price,
      addonsTotalPrice: config.addons_total_price || 0,
      totalPrice: config.total_price,
      totalPriceDisplay: this._formatPrice(config.total_price, config.currency || 'usd'),
      currency: config.currency || 'usd',
      selectedAddons
    };
  }

  removePackageConfiguration(configurationId) {
    const configurationsRaw = this._getFromStorage('package_configurations', []);
    const configAddonsRaw = this._getFromStorage('package_configuration_addons', []);

    const filteredConfigs = configurationsRaw.filter((c) => c.id !== configurationId);
    const removed = filteredConfigs.length !== configurationsRaw.length;
    const filteredConfigAddons = configAddonsRaw.filter(
      (ca) => ca.package_configuration_id !== configurationId
    );

    this._saveToStorage('package_configurations', filteredConfigs);
    this._saveToStorage('package_configuration_addons', filteredConfigAddons);

    return {
      success: true,
      message: removed ? 'Package configuration removed' : 'Configuration not found'
    };
  }

  // =========================
  // Contact / Media Inquiries
  // =========================

  getContactFormOptions() {
    const inquiryTypes = [
      { value: 'general', label: 'General Inquiry' },
      { value: 'booking', label: 'Booking' },
      { value: 'media_podcast', label: 'Media / Podcast' },
      { value: 'partnership', label: 'Partnership' },
      { value: 'support', label: 'Support' },
      { value: 'other', label: 'Other' }
    ];

    const now = new Date();
    const minDate = now.toISOString();
    const max = new Date(now.getTime());
    max.setFullYear(max.getFullYear() + 1);
    const maxDate = max.toISOString();

    const datePickerDefaults = {
      minDate,
      maxDate
    };

    return {
      inquiryTypes,
      datePickerDefaults
    };
  }

  submitContactInquiry(
    inquiryType,
    name,
    email,
    organization,
    subject,
    message,
    preferredDate,
    preferredTimeWindow
  ) {
    const inquiriesRaw = this._getFromStorage('contact_inquiries', []);
    const id = this._generateId('contact_inquiry');
    const now = this._getCurrentDateTime();

    const record = {
      id,
      inquiry_type: inquiryType,
      name,
      email,
      organization: organization || null,
      subject: subject || null,
      message,
      preferred_date: preferredDate || null,
      preferred_time_window: preferredTimeWindow || null,
      status: 'new',
      created_at: now
    };

    inquiriesRaw.push(record);
    this._saveToStorage('contact_inquiries', inquiriesRaw);

    return {
      inquiryId: id,
      status: 'new',
      success: true,
      message: 'Your message has been sent. We will review and respond soon.'
    };
  }

  // =========================
  // Saved Items Overview
  // =========================

  getSavedItemsOverview() {
    const shortlistedRaw = this._getFromStorage('shortlisted_topics', []);
    const topicsRaw = this._getFromStorage('speaking_topics', []);
    const favoritesRaw = this._getFromStorage('favorite_testimonials', []);
    const testimonialsRaw = this._getFromStorage('testimonials', []);
    const configsRaw = this._getFromStorage('package_configurations', []);
    const packagesRaw = this._getFromStorage('speaking_packages', []);

    const shortlistedTopics = shortlistedRaw.map((s) => {
      const t = topicsRaw.find((topic) => topic.id === s.topic_id) || null;
      return {
        shortlistedTopicId: s.id,
        savedAt: s.saved_at,
        title: t ? t.title : null,
        slug: t ? t.slug : null,
        formatLabel: t ? this._getFormatLabel(t.format) : null,
        rating: t ? t.rating : null
      };
    });

    const favoriteTestimonials = favoritesRaw.map((f) => {
      const t = testimonialsRaw.find((tt) => tt.id === f.testimonial_id) || null;
      return {
        favoriteId: f.id,
        savedAt: f.saved_at,
        clientName: t ? t.client_name : null,
        organization: t ? t.organization : null,
        industryLabel: t ? this._getIndustryLabel(t.industry) : null,
        rating: t ? t.rating : null,
        headline: t ? t.headline || '' : null
      };
    });

    const savedPackageConfigurations = configsRaw.map((c) => {
      const pkg = packagesRaw.find((p) => p.id === c.package_id) || null;
      return {
        configurationId: c.id,
        createdAt: c.created_at,
        packageName: pkg ? pkg.name : null,
        deliveryModeLabel: pkg ? this._getDeliveryModeLabel(pkg.delivery_mode) : null,
        audienceSizeLabel: pkg ? this._getAudienceSizeLabel(pkg.audience_size_tier) : null,
        totalPrice: c.total_price,
        totalPriceDisplay: this._formatPrice(c.total_price, c.currency || 'usd')
      };
    });

    return {
      shortlistedTopics,
      favoriteTestimonials,
      savedPackageConfigurations
    };
  }

  // =========================
  // About, Privacy, Terms (content-style endpoints)
  // =========================

  getAboutPageContent() {
    // Content-style data; not persisted as entities
    return {
      bioHtml:
        '<p>As a keynote speaker and leadership coach, I help fast-moving teams navigate burnout, change, and growth.</p>',
      credentials: [
        '15+ years working with high-growth organizations',
        'Featured in major leadership and business publications'
      ],
      signatureAchievements: [
        'Spoken to audiences across technology, finance, and healthcare',
        'Helped thousands of leaders build sustainable high performance'
      ],
      speakingStyleDescription:
        'A practical, story-driven approach that blends research with real-world tools leaders can apply immediately.',
      representativeClients: [],
      industriesServed: ['Technology', 'Finance', 'Healthcare', 'Education', 'Nonprofit'],
      mediaAppearances: [],
      keyCtas: [
        { target: 'speaking_topics', label: 'Explore Speaking Topics' },
        { target: 'speaking_packages', label: 'Configure a Speaking Package' },
        { target: 'testimonials', label: 'See Client Stories' },
        { target: 'contact', label: 'Request Availability' }
      ]
    };
  }

  getPrivacyPolicyContent() {
    const lastUpdated = this._getFromStorage('privacy_last_updated', null) || '2024-01-01';
    const sections = this._getFromStorage('privacy_sections', null) || [
      {
        heading: 'Introduction',
        bodyHtml:
          '<p>This site collects only the data necessary to deliver our services, such as contact and registration details.</p>'
      },
      {
        heading: 'Contact & Event Forms',
        bodyHtml:
          '<p>When you submit a booking request, event registration, or contact inquiry, we store the details you provide so we can respond.</p>'
      }
    ];
    return { lastUpdated, sections };
  }

  getTermsOfUseContent() {
    const lastUpdated = this._getFromStorage('terms_last_updated', null) || '2024-01-01';
    const sections = this._getFromStorage('terms_sections', null) || [
      {
        heading: 'Use of Content',
        bodyHtml:
          '<p>All content, courses, and resources are provided for informational purposes and may not be redistributed without permission.</p>'
      },
      {
        heading: 'Bookings & Events',
        bodyHtml:
          '<p>Event agreements, including fees and deliverables, are confirmed in writing for each engagement.</p>'
      }
    ];
    return { lastUpdated, sections };
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
