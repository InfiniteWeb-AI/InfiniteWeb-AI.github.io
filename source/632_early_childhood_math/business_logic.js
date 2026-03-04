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

  // ---------------------- Storage Helpers ----------------------

  _initStorage() {
    // Initialize all data tables in localStorage if not exist (arrays only)
    const arrayKeys = [
      'offerings',
      'resources',
      'favorite_items',
      'cart',
      'cart_items',
      'orders',
      'order_items',
      'custom_plan_requests',
      'newsletter_subscriptions',
      'blog_articles',
      'reading_list_items',
      'intake_calls',
      'workshop_reservations',
      'coaching_bookings',
      'contact_messages',
      'policies'
    ];

    for (const key of arrayKeys) {
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
    return data ? JSON.parse(data) : [];
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getObjectFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  _saveObjectToStorage(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj));
  }

  _getNextIdCounter() {
    const current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    const next = current + 1;
    localStorage.setItem('idCounter', next.toString());
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowISO() {
    return new Date().toISOString();
  }

  // ---------------------- Private Helper Functions ----------------------

  // Internal helper to load the current cart from storage or create a new active cart if none exists.
  _getOrCreateCart() {
    let carts = this._getFromStorage('cart');
    let cart = carts.find(c => c.status === 'active');
    const now = this._nowISO();
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
      carts.push(cart);
      this._saveToStorage('cart', carts);
    }
    return cart;
  }

  _getActiveCart() {
    const carts = this._getFromStorage('cart');
    return carts.find(c => c.status === 'active') || null;
  }

  // Internal helper to compute or look up distanceFromZip10001 for offerings, used by location-based filters.
  _calculateDistanceFromZip10001(offering) {
    if (!offering) return null;
    if (typeof offering.distanceFromZip10001 === 'number') {
      return offering.distanceFromZip10001;
    }
    return null;
  }

  // Internal helper to generate weekly recurring session datetimes for coaching bookings based on firstSessionStart and recurrenceCount.
  _generateWeeklySessionDates(firstSessionStart, recurrenceCount) {
    const dates = [];
    if (!firstSessionStart) return dates;
    let current = new Date(firstSessionStart);
    if (isNaN(current.getTime())) return dates;
    dates.push(current.toISOString());
    const count = typeof recurrenceCount === 'number' && recurrenceCount > 0 ? recurrenceCount : 0;
    for (let i = 0; i < count; i++) {
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
      dates.push(current.toISOString());
    }
    return dates;
  }

  // Internal helper to turn ageMin/ageMax into a human-readable label like 'Ages 3–4'.
  _formatAgeRangeLabel(ageMin, ageMax) {
    if (typeof ageMin === 'number' && typeof ageMax === 'number') {
      if (ageMin === ageMax) return 'Age ' + ageMin;
      return 'Ages ' + ageMin + '' + ageMax; //  is en dash-like
    }
    if (typeof ageMin === 'number') {
      return 'Age ' + ageMin + '+';
    }
    if (typeof ageMax === 'number') {
      return 'Up to age ' + ageMax;
    }
    return '';
  }

  // Internal helper to format price, currency, and priceDescription into a single display string.
  _formatPriceDisplay(price, currency, priceDescription, isFree) {
    if (isFree) return 'Free';
    const cur = currency || 'USD';
    const amount = typeof price === 'number' ? price.toFixed(2) : '0.00';
    let symbol = '$';
    if (cur === 'USD') symbol = '$';
    // Could extend for other currencies if needed
    let base = symbol + amount;
    if (priceDescription) {
      base += ' ' + priceDescription;
    }
    return base;
  }

  _mapCategoryIdToName(categoryId) {
    switch (categoryId) {
      case 'programs':
        return 'Programs';
      case 'coaching':
        return '1:1 Coaching';
      case 'parent_workshops':
        return 'Parent Workshops';
      case 'educators':
        return 'Educator Services';
      case 'curriculum':
        return 'Curriculum';
      default:
        return '';
    }
  }

  _mapAudienceToLabel(audience) {
    switch (audience) {
      case 'child':
        return 'Children';
      case 'parent':
        return 'Parents';
      case 'educator':
        return 'Educators';
      case 'mixed':
        return 'Parents & Educators';
      default:
        return '';
    }
  }

  _mapFormatToLabel(format) {
    switch (format) {
      case 'online':
        return 'Online';
      case 'in_person':
        return 'In person';
      case 'hybrid':
        return 'Hybrid';
      default:
        return '';
    }
  }

  _mapGroupSizeToLabel(groupSizeCategory, min, max) {
    if (groupSizeCategory === 'one_on_one') return '1:1';
    if (groupSizeCategory === 'small_group') {
      if (typeof min === 'number' && typeof max === 'number') {
        return 'Small group (' + min + '' + max + ' children)';
      }
      return 'Small group';
    }
    if (groupSizeCategory === 'large_group') return 'Large group';
    if (groupSizeCategory === 'self_paced') return 'Self-paced';
    return '';
  }

  _getOfferingEarliestStartDate(offering) {
    const dates = [];
    if (offering.primaryStartDate) {
      dates.push(new Date(offering.primaryStartDate));
    }
    if (Array.isArray(offering.availableStartDates)) {
      for (const d of offering.availableStartDates) {
        const dt = new Date(d);
        if (!isNaN(dt.getTime())) dates.push(dt);
      }
    }
    if (!dates.length) return null;
    dates.sort((a, b) => a - b);
    return dates[0];
  }

  _buildLocationSummary(offering) {
    if (!offering) return '';
    if (offering.format === 'online') return 'Online';
    const parts = [];
    if (offering.locationName) parts.push(offering.locationName);
    const cityState = [offering.city, offering.state].filter(Boolean).join(', ');
    if (cityState) parts.push(cityState);
    if (offering.postalCode) parts.push(offering.postalCode);
    return parts.join(' f '); // separator
  }

  _buildScheduleSummaryFromCartItem(cartItem, offering) {
    const day = cartItem.selectedDayOfWeek || (offering ? offering.sessionDayOfWeek : null);
    const tStart = cartItem.selectedTimeStart || (offering ? offering.sessionTimeStart : null);
    const tEnd = cartItem.selectedTimeEnd || (offering ? offering.sessionTimeEnd : null);
    const startDate = cartItem.selectedStartDate || (offering ? offering.primaryStartDate : null);
    const parts = [];
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        parts.push(d.toDateString());
      }
    }
    if (day) {
      parts.push(day.charAt(0).toUpperCase() + day.slice(1));
    }
    if (tStart) {
      parts.push(tStart + (tEnd ? 'f' + tEnd : ''));
    }
    return parts.join(' f ');
  }

  _computeCartTotals(cartId) {
    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cartId);
    const offerings = this._getFromStorage('offerings');
    let subtotal = 0;
    let currency = 'USD';
    for (const item of cartItems) {
      subtotal += typeof item.subtotal === 'number' ? item.subtotal : 0;
      if (!currency && item.offeringId) {
        const off = offerings.find(o => o.id === item.offeringId);
        if (off && off.priceCurrency) currency = off.priceCurrency;
      }
    }
    return { subtotal, currency };
  }

  // ---------------------- Interface Implementations ----------------------

  // getHomePageContent()
  getHomePageContent() {
    const offerings = this._getFromStorage('offerings').filter(o => o.status === 'active');
    const resources = this._getFromStorage('resources').filter(r => r.status === 'active');
    const blogArticles = this._getFromStorage('blog_articles').filter(a => a.status === 'published');

    // Featured child programs
    const childPrograms = offerings.filter(o => o.categoryId === 'programs' && (o.audience === 'child' || o.audience === 'mixed'));
    childPrograms.sort((a, b) => {
      const da = this._getOfferingEarliestStartDate(a);
      const db = this._getOfferingEarliestStartDate(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    });
    const featuredChildPrograms = childPrograms.slice(0, 5).map(o => ({
      id: o.id,
      title: o.title,
      shortDescription: o.shortDescription || '',
      categoryId: o.categoryId,
      categoryName: this._mapCategoryIdToName(o.categoryId),
      ageRangeLabel: this._formatAgeRangeLabel(o.ageMin, o.ageMax),
      formatLabel: this._mapFormatToLabel(o.format),
      primaryStartDate: o.primaryStartDate || null,
      priceDisplay: this._formatPriceDisplay(o.price, o.priceCurrency, o.priceDescription, o.isFree)
    }));

    // Featured parent workshops
    const parentWorkshops = offerings.filter(o => o.categoryId === 'parent_workshops' && (o.audience === 'parent' || o.audience === 'mixed'));
    parentWorkshops.sort((a, b) => {
      const da = this._getOfferingEarliestStartDate(a);
      const db = this._getOfferingEarliestStartDate(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    });
    const featuredParentWorkshops = parentWorkshops.slice(0, 5).map(o => {
      const d = this._getOfferingEarliestStartDate(o);
      const dateTimeLabel = d ? d.toDateString() : '';
      return {
        id: o.id,
        title: o.title,
        shortDescription: o.shortDescription || '',
        dateTimeLabel: dateTimeLabel,
        locationSummary: this._buildLocationSummary(o),
        priceDisplay: this._formatPriceDisplay(o.price, o.priceCurrency, o.priceDescription, o.isFree)
      };
    });

    // Featured educator offerings
    const educatorOfferings = offerings.filter(o => o.categoryId === 'educators');
    educatorOfferings.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    const featuredEducatorOfferings = educatorOfferings.slice(0, 5).map(o => ({
      id: o.id,
      title: o.title,
      shortDescription: o.shortDescription || '',
      serviceTypeLabel: o.serviceType || 'none',
      priceDisplay: this._formatPriceDisplay(o.price, o.priceCurrency, o.priceDescription, o.isFree)
    }));

    // Highlighted resources (by popularity)
    const highlightedResources = resources
      .slice()
      .sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0))
      .slice(0, 5);

    // Recent blog articles
    const recentBlogArticles = blogArticles
      .slice()
      .sort((a, b) => {
        const da = a.publishedAt ? new Date(a.publishedAt) : null;
        const db = b.publishedAt ? new Date(b.publishedAt) : null;
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return db - da;
      })
      .slice(0, 5);

    const storedPrompt = this._getObjectFromStorage('newsletter_prompt');
    const newsletterPrompt = storedPrompt || {
      headline: 'Stay in the loop',
      subheading: 'Get early childhood math tips and at-home activities in your inbox.',
      recommendedFrequency: 'weekly'
    };

    return {
      featuredChildPrograms,
      featuredParentWorkshops,
      featuredEducatorOfferings,
      highlightedResources,
      recentBlogArticles,
      newsletterPrompt
    };
  }

  // getOfferingFilterOptions(categoryId)
  getOfferingFilterOptions(categoryId) {
    const offerings = this._getFromStorage('offerings').filter(o => o.status === 'active' && o.categoryId === categoryId);

    const ageMap = {};
    const gradeMap = {};
    const formatMap = {};
    const groupSizeMap = {};
    const durationsWeeksSet = new Set();
    const durationsMinutesSet = new Set();
    const priceValues = [];
    const audienceMap = {};
    const topicsSet = new Set();

    for (const o of offerings) {
      if (typeof o.ageMin === 'number' || typeof o.ageMax === 'number') {
        const key = (typeof o.ageMin === 'number' ? o.ageMin : 'min') + '_' + (typeof o.ageMax === 'number' ? o.ageMax : 'max');
        if (!ageMap[key]) {
          ageMap[key] = {
            code: 'age_' + key,
            label: this._formatAgeRangeLabel(o.ageMin, o.ageMax),
            ageMin: o.ageMin || null,
            ageMax: o.ageMax || null
          };
        }
      }
      if (o.gradeLevel && o.gradeLevel !== 'none') {
        if (!gradeMap[o.gradeLevel]) {
          gradeMap[o.gradeLevel] = {
            code: o.gradeLevel,
            label: o.gradeLevel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          };
        }
      }
      if (o.format) {
        if (!formatMap[o.format]) {
          formatMap[o.format] = {
            code: o.format,
            label: this._mapFormatToLabel(o.format)
          };
        }
      }
      if (o.groupSizeCategory) {
        if (!groupSizeMap[o.groupSizeCategory]) {
          groupSizeMap[o.groupSizeCategory] = {
            code: o.groupSizeCategory,
            label: this._mapGroupSizeToLabel(o.groupSizeCategory, o.groupSizeMin, o.groupSizeMax)
          };
        }
      }
      if (typeof o.durationWeeks === 'number') durationsWeeksSet.add(o.durationWeeks);
      if (typeof o.durationMinutes === 'number') durationsMinutesSet.add(o.durationMinutes);
      if (typeof o.price === 'number') priceValues.push(o.price);
      if (o.audience) {
        if (!audienceMap[o.audience]) {
          audienceMap[o.audience] = {
            code: o.audience,
            label: this._mapAudienceToLabel(o.audience)
          };
        }
      }
      if (Array.isArray(o.topics)) {
        o.topics.forEach(t => topicsSet.add(t));
      }
    }

    let priceRanges = [];
    if (priceValues.length) {
      const minPrice = Math.min.apply(null, priceValues);
      const maxPrice = Math.max.apply(null, priceValues);
      const mid = minPrice + (maxPrice - minPrice) / 2;
      priceRanges = [
        { min: 0, max: mid, label: '$0' + mid.toFixed(0) },
        { min: mid, max: maxPrice, label: '$' + mid.toFixed(0) + '' + maxPrice.toFixed(0) }
      ];
    }

    const sortOptions = [
      { code: 'start_date_soonest', label: 'Start date – Soonest first' },
      { code: 'price_low_to_high', label: 'Price – Low to High' },
      { code: 'most_popular', label: 'Most popular' }
    ];

    return {
      ageRanges: Object.values(ageMap),
      gradeLevels: Object.values(gradeMap),
      formats: Object.values(formatMap),
      groupSizes: Object.values(groupSizeMap),
      durationsWeeks: Array.from(durationsWeeksSet).sort((a, b) => a - b),
      durationsMinutes: Array.from(durationsMinutesSet).sort((a, b) => a - b),
      priceRanges,
      audiences: Object.values(audienceMap),
      topics: Array.from(topicsSet),
      sortOptions
    };
  }

  // listOfferings(categoryId, filters, sortBy, sortDirection, page, pageSize)
  listOfferings(categoryId, filters, sortBy, sortDirection, page, pageSize) {
    const allOfferings = this._getFromStorage('offerings').filter(o => o.status === 'active' && o.categoryId === categoryId);
    const f = filters || {};

    let items = allOfferings.filter(o => {
      // Age overlap
      if (typeof f.ageMin === 'number') {
        if (typeof o.ageMax === 'number' && o.ageMax < f.ageMin) return false;
      }
      if (typeof f.ageMax === 'number') {
        if (typeof o.ageMin === 'number' && o.ageMin > f.ageMax) return false;
      }

      if (Array.isArray(f.gradeLevels) && f.gradeLevels.length) {
        if (!f.gradeLevels.includes(o.gradeLevel)) return false;
      }

      if (f.format && o.format && o.format !== f.format) return false;

      if (f.groupSizeCategory && o.groupSizeCategory && o.groupSizeCategory !== f.groupSizeCategory) return false;

      if (typeof f.durationWeeks === 'number') {
        if (o.durationWeeks !== f.durationWeeks) return false;
      }

      if (typeof f.durationMinutes === 'number') {
        if (o.durationMinutes !== f.durationMinutes) return false;
      }

      // Start date range
      if (f.startDateFrom || f.startDateTo) {
        const from = f.startDateFrom ? new Date(f.startDateFrom) : null;
        const to = f.startDateTo ? new Date(f.startDateTo) : null;
        const earliest = this._getOfferingEarliestStartDate(o);
        if (!earliest) return false;
        if (from && earliest < from) return false;
        if (to && earliest > to) return false;
      }

      // Day of week
      if (f.dayOfWeek && o.sessionDayOfWeek && o.sessionDayOfWeek !== f.dayOfWeek) return false;

      // Time range
      if (f.timeRangeStart && o.sessionTimeStart && o.sessionTimeStart < f.timeRangeStart) return false;
      if (f.timeRangeEnd && o.sessionTimeStart && o.sessionTimeStart > f.timeRangeEnd) return false;

      if (typeof f.priceMin === 'number') {
        if (typeof o.price === 'number' && o.price < f.priceMin) return false;
      }
      if (typeof f.priceMax === 'number') {
        if (typeof o.price === 'number' && o.price > f.priceMax) return false;
      }

      if (typeof f.isFree === 'boolean') {
        if ((o.isFree || false) !== f.isFree) return false;
      }

      if (f.audience && o.audience && o.audience !== f.audience) return false;

      if (Array.isArray(f.topics) && f.topics.length) {
        const oTopics = Array.isArray(o.topics) ? o.topics : [];
        const hasOverlap = f.topics.some(t => oTopics.includes(t));
        if (!hasOverlap) return false;
      }

      // Location-based filter from ZIP 10001
      if (f.postalCode === '10001' && typeof f.maxDistanceMilesFromZip10001 === 'number') {
        const dist = this._calculateDistanceFromZip10001(o);
        if (dist === null || dist > f.maxDistanceMilesFromZip10001) return false;
      }

      if (f.serviceType && o.serviceType && o.serviceType !== f.serviceType) return false;

      return true;
    });

    const sortKey = sortBy || 'start_date_soonest';
    const dir = sortDirection === 'desc' ? -1 : 1;

    items.sort((a, b) => {
      if (sortKey === 'price_low_to_high') {
        const pa = typeof a.price === 'number' ? a.price : Number.POSITIVE_INFINITY;
        const pb = typeof b.price === 'number' ? b.price : Number.POSITIVE_INFINITY;
        return (pa - pb) * dir;
      }
      if (sortKey === 'most_popular') {
        const pa = a.popularityScore || 0;
        const pb = b.popularityScore || 0;
        return (pa < pb ? 1 : pa > pb ? -1 : 0) * (dir === -1 ? -1 : 1);
      }
      // Default: start_date_soonest
      const da = this._getOfferingEarliestStartDate(a) || new Date(8640000000000000); // max date
      const db = this._getOfferingEarliestStartDate(b) || new Date(8640000000000000);
      return (da - db) * dir;
    });

    const totalItems = items.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;
    const paged = items.slice(start, end).map(o => ({
      id: o.id,
      title: o.title,
      shortDescription: o.shortDescription || '',
      categoryId: o.categoryId,
      categoryName: this._mapCategoryIdToName(o.categoryId),
      offeringType: o.offeringType,
      audience: o.audience,
      audienceLabel: this._mapAudienceToLabel(o.audience),
      ageMin: o.ageMin,
      ageMax: o.ageMax,
      ageRangeLabel: this._formatAgeRangeLabel(o.ageMin, o.ageMax),
      gradeLevel: o.gradeLevel || 'none',
      format: o.format,
      formatLabel: this._mapFormatToLabel(o.format),
      groupSizeCategory: o.groupSizeCategory,
      groupSizeLabel: this._mapGroupSizeToLabel(o.groupSizeCategory, o.groupSizeMin, o.groupSizeMax),
      durationWeeks: o.durationWeeks,
      durationMinutes: o.durationMinutes,
      totalSessions: o.totalSessions,
      primaryStartDate: o.primaryStartDate || null,
      sessionDayOfWeek: o.sessionDayOfWeek || null,
      sessionTimeStart: o.sessionTimeStart || null,
      sessionTimeEnd: o.sessionTimeEnd || null,
      price: o.price,
      priceCurrency: o.priceCurrency || 'USD',
      priceDisplay: this._formatPriceDisplay(o.price, o.priceCurrency, o.priceDescription, o.isFree),
      isFree: !!o.isFree,
      locationSummary: this._buildLocationSummary(o),
      distanceFromZip10001: typeof o.distanceFromZip10001 === 'number' ? o.distanceFromZip10001 : null,
      popularityScore: o.popularityScore || 0
    }));

    return {
      items: paged,
      page: p,
      pageSize: ps,
      totalItems,
      totalPages: Math.ceil(totalItems / ps)
    };
  }

  // getOfferingDetail(offeringId)
  getOfferingDetail(offeringId) {
    const offerings = this._getFromStorage('offerings');
    const offering = offerings.find(o => o.id === offeringId) || null;
    if (!offering) {
      return {
        offering: null,
        categoryName: '',
        audienceLabel: '',
        formatLabel: '',
        groupSizeLabel: '',
        ageRangeLabel: '',
        durationLabel: '',
        scheduleSummary: '',
        availableSessions: [],
        priceDisplay: '',
        paymentOptions: {
          supportsInstallments: false,
          defaultPaymentOption: 'pay_in_full',
          maxInstallments: 1
        },
        workshopLocationSummary: '',
        curriculumWeeklyStructure: null,
        coachingPackageSummary: null,
        educatorPackageSummary: null
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (offering.categoryId === 'educators' && offering.offeringType === 'educator_pd_package') {
        let comparedIds = [];
        const stored = localStorage.getItem('task2_comparedPackageIds');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            comparedIds = parsed;
          }
        }
        if (!comparedIds.includes(offeringId)) {
          comparedIds.push(offeringId);
          localStorage.setItem('task2_comparedPackageIds', JSON.stringify(comparedIds));
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    const categoryName = this._mapCategoryIdToName(offering.categoryId);
    const audienceLabel = this._mapAudienceToLabel(offering.audience);
    const formatLabel = this._mapFormatToLabel(offering.format);
    const groupSizeLabel = this._mapGroupSizeToLabel(offering.groupSizeCategory, offering.groupSizeMin, offering.groupSizeMax);
    const ageRangeLabel = this._formatAgeRangeLabel(offering.ageMin, offering.ageMax);

    let durationLabel = '';
    if (typeof offering.durationWeeks === 'number') {
      durationLabel = offering.durationWeeks + '-week program';
    } else if (typeof offering.durationMinutes === 'number') {
      durationLabel = offering.durationMinutes + ' minutes';
    }

    let scheduleSummary = '';
    if (offering.sessionDayOfWeek || offering.sessionTimeStart || offering.primaryStartDate) {
      const parts = [];
      if (offering.primaryStartDate) {
        const d = new Date(offering.primaryStartDate);
        if (!isNaN(d.getTime())) parts.push(d.toDateString());
      }
      if (offering.sessionDayOfWeek) {
        parts.push(offering.sessionDayOfWeek.charAt(0).toUpperCase() + offering.sessionDayOfWeek.slice(1));
      }
      if (offering.sessionTimeStart) {
        parts.push(offering.sessionTimeStart + (offering.sessionTimeEnd ? 'f' + offering.sessionTimeEnd : ''));
      }
      scheduleSummary = parts.join(' f ');
    }

    const availableSessions = [];
    if (Array.isArray(offering.availableStartDates)) {
      for (const s of offering.availableStartDates) {
        availableSessions.push({
          startDate: s,
          dayOfWeek: offering.sessionDayOfWeek || null,
          timeStart: offering.sessionTimeStart || null,
          timeEnd: offering.sessionTimeEnd || null
        });
      }
    } else if (offering.primaryStartDate) {
      availableSessions.push({
        startDate: offering.primaryStartDate,
        dayOfWeek: offering.sessionDayOfWeek || null,
        timeStart: offering.sessionTimeStart || null,
        timeEnd: offering.sessionTimeEnd || null
      });
    }

    const priceDisplay = this._formatPriceDisplay(offering.price, offering.priceCurrency, offering.priceDescription, offering.isFree);

    const paymentOptions = {
      supportsInstallments: !!offering.supportsInstallments,
      defaultPaymentOption: offering.defaultPaymentOption || 'pay_in_full',
      maxInstallments: offering.maxInstallments || 1
    };

    const workshopLocationSummary = this._buildLocationSummary(offering);

    const curriculumWeeklyStructure =
      offering.offeringType === 'curriculum_bundle'
        ? {
            durationWeeks: offering.durationWeeks || null,
            lessonsPerWeek: offering.lessonsPerWeek || null,
            lessonsPerWeekLabel: offering.lessonsPerWeek ? offering.lessonsPerWeek + ' lessons per week' : ''
          }
        : null;

    const coachingPackageSummary =
      offering.offeringType === 'coaching_package'
        ? {
            totalSessions: offering.totalSessions || null,
            sessionLengthMinutes: offering.durationMinutes || null
          }
        : null;

    const educatorPackageSummary =
      offering.offeringType === 'educator_pd_package'
        ? {
            coachingCallsCount: offering.coachingCallsCount || 0,
            serviceTypeLabel: offering.serviceType || 'professional_development_package'
          }
        : null;

    return {
      offering,
      categoryName,
      audienceLabel,
      formatLabel,
      groupSizeLabel,
      ageRangeLabel,
      durationLabel,
      scheduleSummary,
      availableSessions,
      priceDisplay,
      paymentOptions,
      workshopLocationSummary,
      curriculumWeeklyStructure,
      coachingPackageSummary,
      educatorPackageSummary
    };
  }

  // addOfferingToCart(offeringId, quantity, paymentOption, scheduleSelection, licenseSelection, participantInfo)
  addOfferingToCart(offeringId, quantity, paymentOption, scheduleSelection, licenseSelection, participantInfo) {
    const offerings = this._getFromStorage('offerings');
    const offering = offerings.find(o => o.id === offeringId && o.status === 'active');
    if (!offering) {
      return {
        success: false,
        cart: null,
        message: 'Offering not found or not active.'
      };
    }

    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');

    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const unitPrice = offering.isFree ? 0 : typeof offering.price === 'number' ? offering.price : 0;
    const subtotal = unitPrice * qty;

    const now = this._nowISO();
    const item = {
      id: this._generateId('cartitem'),
      cartId: cart.id,
      offeringId: offering.id,
      offeringTitle: offering.title,
      categoryId: offering.categoryId,
      quantity: qty,
      unitPrice,
      subtotal,
      paymentOption: paymentOption || offering.defaultPaymentOption || 'pay_in_full',
      selectedStartDate: scheduleSelection && scheduleSelection.selectedStartDate ? scheduleSelection.selectedStartDate : null,
      selectedDayOfWeek: scheduleSelection && scheduleSelection.selectedDayOfWeek ? scheduleSelection.selectedDayOfWeek : null,
      selectedTimeStart: scheduleSelection && scheduleSelection.selectedTimeStart ? scheduleSelection.selectedTimeStart : null,
      selectedTimeEnd: scheduleSelection && scheduleSelection.selectedTimeEnd ? scheduleSelection.selectedTimeEnd : null,
      licenseUserCount: licenseSelection && typeof licenseSelection.licenseUserCount === 'number' ? licenseSelection.licenseUserCount : null,
      licenseLabel: licenseSelection && licenseSelection.licenseLabel ? licenseSelection.licenseLabel : null,
      participantName: participantInfo && participantInfo.participantName ? participantInfo.participantName : null,
      participantAge: participantInfo && typeof participantInfo.participantAge === 'number' ? participantInfo.participantAge : null,
      notes: participantInfo && participantInfo.notes ? participantInfo.notes : null,
      createdAt: now,
      updatedAt: now
    };

    cartItems.push(item);
    this._saveToStorage('cart_items', cartItems);

    const totals = this._computeCartTotals(cart.id);
    const allItemsForCart = cartItems.filter(ci => ci.cartId === cart.id).map(ci => {
      const off = offerings.find(o => o.id === ci.offeringId) || null;
      return {
        ...ci,
        offering: off,
        cart: { id: cart.id, status: cart.status }
      };
    });

    return {
      success: true,
      cart: {
        cartId: cart.id,
        status: cart.status,
        items: allItemsForCart,
        totalAmount: totals.subtotal,
        currency: totals.currency
      },
      message: 'Item added to cart.'
    };
  }

  // getCartSummary()
  getCartSummary() {
    const cart = this._getActiveCart();
    if (!cart) {
      return { cart: null };
    }

    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    const offerings = this._getFromStorage('offerings');

    const items = cartItems.map(ci => {
      const offering = offerings.find(o => o.id === ci.offeringId) || null;
      const scheduleSummary = this._buildScheduleSummaryFromCartItem(ci, offering);
      let licenseSummary = '';
      if (ci.licenseUserCount) {
        licenseSummary = (ci.licenseLabel || (ci.licenseUserCount + ' users'));
      }
      let participantSummary = '';
      if (ci.participantName) {
        participantSummary = ci.participantName + (ci.participantAge ? ' (age ' + ci.participantAge + ')' : '');
      }
      const priceDisplay = offering
        ? this._formatPriceDisplay(offering.price, offering.priceCurrency, offering.priceDescription, offering.isFree)
        : '';

      return {
        cartItem: {
          ...ci,
          offering,
          cart: { id: cart.id, status: cart.status }
        },
        offeringTitle: offering ? offering.title : ci.offeringTitle,
        categoryName: offering ? this._mapCategoryIdToName(offering.categoryId) : '',
        priceDisplay,
        scheduleSummary,
        licenseSummary,
        participantSummary
      };
    });

    const totals = this._computeCartTotals(cart.id);

    return {
      cart: {
        cartId: cart.id,
        status: cart.status,
        items,
        subtotal: totals.subtotal,
        currency: totals.currency
      }
    };
  }

  // updateCartItem(cartItemId, quantity, paymentOption)
  updateCartItem(cartItemId, quantity, paymentOption) {
    const cartItems = this._getFromStorage('cart_items');
    const offerings = this._getFromStorage('offerings');
    const idx = cartItems.findIndex(ci => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cart: null,
        message: 'Cart item not found.'
      };
    }
    const item = cartItems[idx];

    if (typeof quantity === 'number' && quantity > 0) {
      item.quantity = quantity;
      item.subtotal = (typeof item.unitPrice === 'number' ? item.unitPrice : 0) * quantity;
    }
    if (paymentOption) {
      item.paymentOption = paymentOption;
    }
    item.updatedAt = this._nowISO();

    cartItems[idx] = item;
    this._saveToStorage('cart_items', cartItems);

    const cartId = item.cartId;
    const totals = this._computeCartTotals(cartId);
    const itemsForCart = cartItems.filter(ci => ci.cartId === cartId).map(ci => {
      const off = offerings.find(o => o.id === ci.offeringId) || null;
      return {
        ...ci,
        offering: off,
        cart: { id: cartId }
      };
    });

    return {
      success: true,
      cart: {
        cartId,
        items: itemsForCart,
        subtotal: totals.subtotal,
        currency: totals.currency
      },
      message: 'Cart item updated.'
    };
  }

  // removeCartItem(cartItemId)
  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const offerings = this._getFromStorage('offerings');
    const item = cartItems.find(ci => ci.id === cartItemId);
    if (!item) {
      return {
        success: false,
        cart: null,
        message: 'Cart item not found.'
      };
    }

    const cartId = item.cartId;
    cartItems = cartItems.filter(ci => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const totals = this._computeCartTotals(cartId);
    const itemsForCart = cartItems.filter(ci => ci.cartId === cartId).map(ci => {
      const off = offerings.find(o => o.id === ci.offeringId) || null;
      return {
        ...ci,
        offering: off,
        cart: { id: cartId }
      };
    });

    return {
      success: true,
      cart: {
        cartId,
        items: itemsForCart,
        subtotal: totals.subtotal,
        currency: totals.currency
      },
      message: 'Cart item removed.'
    };
  }

  // submitCheckout(billingName, billingEmail, paymentMethod)
  submitCheckout(billingName, billingEmail, paymentMethod) {
    const cart = this._getActiveCart();
    if (!cart) {
      return {
        order: null,
        orderItems: [],
        confirmationMessage: 'No active cart.'
      };
    }

    const cartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId === cart.id);
    const offerings = this._getFromStorage('offerings');

    if (!cartItems.length) {
      return {
        order: null,
        orderItems: [],
        confirmationMessage: 'Cart is empty.'
      };
    }

    const totals = this._computeCartTotals(cart.id);

    const orders = this._getFromStorage('orders');
    const orderItemsAll = this._getFromStorage('order_items');

    const orderId = this._generateId('order');
    const now = this._nowISO();
    const order = {
      id: orderId,
      orderNumber: 'ORD-' + orderId,
      status: 'paid',
      totalAmount: totals.subtotal,
      currency: totals.currency,
      billingName,
      billingEmail,
      paymentMethod,
      cartSnapshotId: cart.id,
      createdAt: now,
      paidAt: now
    };

    const newOrderItems = cartItems.map(ci => {
      const off = offerings.find(o => o.id === ci.offeringId) || null;
      return {
        id: this._generateId('orderitem'),
        orderId: order.id,
        offeringId: ci.offeringId,
        offeringTitle: ci.offeringTitle || (off ? off.title : ''),
        categoryId: ci.categoryId || (off ? off.categoryId : null),
        quantity: ci.quantity,
        unitPrice: ci.unitPrice,
        subtotal: ci.subtotal,
        paymentOption: ci.paymentOption || 'pay_in_full',
        selectedStartDate: ci.selectedStartDate || null,
        selectedDayOfWeek: ci.selectedDayOfWeek || null,
        selectedTimeStart: ci.selectedTimeStart || null,
        selectedTimeEnd: ci.selectedTimeEnd || null,
        licenseUserCount: ci.licenseUserCount || null,
        licenseLabel: ci.licenseLabel || null,
        participantName: ci.participantName || null,
        participantAge: ci.participantAge || null,
        notes: ci.notes || null
      };
    });

    orders.push(order);
    this._saveToStorage('orders', orders);
    this._saveToStorage('order_items', orderItemsAll.concat(newOrderItems));

    // Mark cart as checked_out and clear its items
    const carts = this._getFromStorage('cart');
    const cartIdx = carts.findIndex(c => c.id === cart.id);
    if (cartIdx !== -1) {
      carts[cartIdx] = { ...carts[cartIdx], status: 'checked_out', updatedAt: now };
      this._saveToStorage('cart', carts);
    }
    const remainingCartItems = this._getFromStorage('cart_items').filter(ci => ci.cartId !== cart.id);
    this._saveToStorage('cart_items', remainingCartItems);

    return {
      order,
      orderItems: newOrderItems,
      confirmationMessage: 'Checkout complete. Order ' + order.orderNumber + ' confirmed.'
    };
  }

  // submitCustomPlanRequest(childName, childAge, currentMathLevel, goals, format, sessionFrequency, sessionDurationMinutes, preferredDays, preferredTimeStart, preferredTimeEnd, budgetMin, budgetMax, additionalNotes, parentName, parentEmail)
  submitCustomPlanRequest(
    childName,
    childAge,
    currentMathLevel,
    goals,
    format,
    sessionFrequency,
    sessionDurationMinutes,
    preferredDays,
    preferredTimeStart,
    preferredTimeEnd,
    budgetMin,
    budgetMax,
    additionalNotes,
    parentName,
    parentEmail
  ) {
    const list = this._getFromStorage('custom_plan_requests');

    const request = {
      id: this._generateId('customplan'),
      childName: childName || null,
      childAge: childAge,
      currentMathLevel: currentMathLevel || null,
      goals: Array.isArray(goals) ? goals : [],
      format: format || null,
      sessionFrequency: sessionFrequency || null,
      sessionDurationMinutes: sessionDurationMinutes || null,
      preferredDays: Array.isArray(preferredDays) ? preferredDays : [],
      preferredTimeStart: preferredTimeStart || null,
      preferredTimeEnd: preferredTimeEnd || null,
      budgetMin: typeof budgetMin === 'number' ? budgetMin : null,
      budgetMax: typeof budgetMax === 'number' ? budgetMax : null,
      additionalNotes: additionalNotes || null,
      parentName,
      parentEmail,
      status: 'new',
      createdAt: this._nowISO()
    };

    list.push(request);
    this._saveToStorage('custom_plan_requests', list);

    return {
      request,
      success: true,
      message: 'Custom plan request submitted.'
    };
  }

  // getResourceFilterOptions()
  getResourceFilterOptions() {
    const resources = this._getFromStorage('resources').filter(r => r.status === 'active');

    const ageMap = {};
    const topicsSet = new Set();
    const resourceTypeMap = {};
    const priceValues = [];

    for (const r of resources) {
      if (typeof r.ageMin === 'number' || typeof r.ageMax === 'number') {
        const key = (typeof r.ageMin === 'number' ? r.ageMin : 'min') + '_' + (typeof r.ageMax === 'number' ? r.ageMax : 'max');
        if (!ageMap[key]) {
          ageMap[key] = {
            code: 'age_' + key,
            label: this._formatAgeRangeLabel(r.ageMin, r.ageMax),
            ageMin: r.ageMin || null,
            ageMax: r.ageMax || null
          };
        }
      }
      if (Array.isArray(r.topics)) {
        r.topics.forEach(t => topicsSet.add(t));
      }
      if (r.resourceType) {
        if (!resourceTypeMap[r.resourceType]) {
          resourceTypeMap[r.resourceType] = {
            code: r.resourceType,
            label: r.resourceType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
          };
        }
      }
      if (typeof r.price === 'number') priceValues.push(r.price);
    }

    const priceOptions = [];
    priceOptions.push({ code: 'free', label: 'Free', maxPrice: 0 });
    if (priceValues.length) {
      const maxPrice = Math.max.apply(null, priceValues);
      priceOptions.push({ code: 'paid', label: 'Paid', maxPrice: maxPrice });
    }

    const sortOptions = [
      { code: 'most_popular', label: 'Most popular' },
      { code: 'newest', label: 'Newest' }
    ];

    return {
      ageRanges: Object.values(ageMap),
      topics: Array.from(topicsSet),
      resourceTypes: Object.values(resourceTypeMap),
      priceOptions,
      sortOptions
    };
  }

  // listResources(filters, searchQuery, sortBy, sortDirection, page, pageSize)
  listResources(filters, searchQuery, sortBy, sortDirection, page, pageSize) {
    const resources = this._getFromStorage('resources').filter(r => r.status === 'active');
    const f = filters || {};

    let items = resources.filter(r => {
      if (typeof f.ageMin === 'number') {
        if (typeof r.ageMax === 'number' && r.ageMax < f.ageMin) return false;
      }
      if (typeof f.ageMax === 'number') {
        if (typeof r.ageMin === 'number' && r.ageMin > f.ageMax) return false;
      }

      if (Array.isArray(f.topics) && f.topics.length) {
        const rTopics = Array.isArray(r.topics) ? r.topics : [];
        const hasOverlap = f.topics.some(t => rTopics.includes(t));
        if (!hasOverlap) return false;
      }

      if (Array.isArray(f.resourceTypes) && f.resourceTypes.length) {
        if (!f.resourceTypes.includes(r.resourceType)) return false;
      }

      if (typeof f.priceMin === 'number') {
        if (typeof r.price === 'number' && r.price < f.priceMin) return false;
      }
      if (typeof f.priceMax === 'number') {
        if (typeof r.price === 'number' && r.price > f.priceMax) return false;
      }

      if (typeof f.isFree === 'boolean') {
        if ((r.isFree || false) !== f.isFree) return false;
      }

      return true;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(r => {
        const title = r.title || '';
        const summary = r.summary || '';
        return title.toLowerCase().includes(q) || summary.toLowerCase().includes(q);
      });
    }

    const sortKey = sortBy || 'most_popular';
    const dir = sortDirection === 'asc' ? 1 : -1;

    items.sort((a, b) => {
      if (sortKey === 'newest') {
        const da = a.createdAt ? new Date(a.createdAt) : null;
        const db = b.createdAt ? new Date(b.createdAt) : null;
        if (!da && !db) return 0;
        if (!da) return 1 * dir;
        if (!db) return -1 * dir;
        return (da - db) * dir;
      }
      // default most_popular
      const pa = a.popularityScore || 0;
      const pb = b.popularityScore || 0;
      if (pa === pb) return 0;
      return pa < pb ? 1 * (dir === -1 ? 1 : -1) : -1 * (dir === -1 ? 1 : -1);
    });

    const totalItems = items.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 20;
    const start = (p - 1) * ps;
    const end = start + ps;

    return {
      items: items.slice(start, end),
      page: p,
      pageSize: ps,
      totalItems,
      totalPages: Math.ceil(totalItems / ps)
    };
  }

  // getResourceDetail(resourceId)
  getResourceDetail(resourceId) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find(r => r.id === resourceId) || null;
    if (!resource) {
      return {
        resource: null,
        ageRangeLabel: '',
        focusSkillsLabel: ''
      };
    }

    const ageRangeLabel = this._formatAgeRangeLabel(resource.ageMin, resource.ageMax);
    const focusSkillsLabel = Array.isArray(resource.skillsFocus) ? resource.skillsFocus.join(', ') : '';

    return {
      resource,
      ageRangeLabel,
      focusSkillsLabel
    };
  }

  // addResourceToFavorites(resourceId)
  addResourceToFavorites(resourceId) {
    const resources = this._getFromStorage('resources');
    const resource = resources.find(r => r.id === resourceId && r.status === 'active');
    if (!resource) {
      return {
        favoriteItem: null,
        totalFavorites: this._getFromStorage('favorite_items').length,
        success: false
      };
    }

    const favorites = this._getFromStorage('favorite_items');
    const existing = favorites.find(f => f.resourceId === resourceId);
    if (existing) {
      return {
        favoriteItem: existing,
        totalFavorites: favorites.length,
        success: true
      };
    }

    const favoriteItem = {
      id: this._generateId('fav'),
      resourceId,
      addedAt: this._nowISO()
    };

    favorites.push(favoriteItem);
    this._saveToStorage('favorite_items', favorites);

    return {
      favoriteItem,
      totalFavorites: favorites.length,
      success: true
    };
  }

  // getFavoritesList()
  getFavoritesList() {
    const favorites = this._getFromStorage('favorite_items');
    const resources = this._getFromStorage('resources');

    const items = favorites.map(f => {
      const resource = resources.find(r => r.id === f.resourceId) || null;
      return {
        favoriteItem: { ...f, resource },
        resource
      };
    });

    return { items };
  }

  // removeFavoriteItem(favoriteItemId)
  removeFavoriteItem(favoriteItemId) {
    let favorites = this._getFromStorage('favorite_items');
    favorites = favorites.filter(f => f.id !== favoriteItemId);
    this._saveToStorage('favorite_items', favorites);
    return {
      success: true,
      totalFavorites: favorites.length
    };
  }

  // clearFavorites()
  clearFavorites() {
    this._saveToStorage('favorite_items', []);
    return {
      success: true,
      totalFavorites: 0
    };
  }

  // createWorkshopReservation(offeringId, numAdults, numChildren, contactName, contactEmail)
  createWorkshopReservation(offeringId, numAdults, numChildren, contactName, contactEmail) {
    const offerings = this._getFromStorage('offerings');
    const offering = offerings.find(o => o.id === offeringId && o.categoryId === 'parent_workshops');
    if (!offering) {
      return {
        reservation: null,
        success: false,
        message: 'Workshop offering not found.'
      };
    }

    const reservations = this._getFromStorage('workshop_reservations');

    const reservation = {
      id: this._generateId('wres'),
      offeringId,
      offeringTitle: offering.title,
      workshopDate: offering.primaryStartDate || (Array.isArray(offering.availableStartDates) && offering.availableStartDates.length ? offering.availableStartDates[0] : null),
      numAdults: numAdults,
      numChildren: typeof numChildren === 'number' ? numChildren : 0,
      contactName,
      contactEmail,
      status: 'reserved',
      createdAt: this._nowISO()
    };

    reservations.push(reservation);
    this._saveToStorage('workshop_reservations', reservations);

    return {
      reservation,
      success: true,
      message: 'Workshop reserved.'
    };
  }

  // createIntakeCall(offeringId, scheduledStart, durationMinutes, contactName, contactEmail)
  createIntakeCall(offeringId, scheduledStart, durationMinutes, contactName, contactEmail) {
    const offerings = this._getFromStorage('offerings');
    const offering = offerings.find(o => o.id === offeringId && o.categoryId === 'educators');
    if (!offering) {
      return {
        intakeCall: null,
        success: false,
        message: 'Educator offering not found.'
      };
    }

    const intakeCalls = this._getFromStorage('intake_calls');

    const intakeCall = {
      id: this._generateId('intake'),
      offeringId,
      offeringTitle: offering.title,
      scheduledStart,
      durationMinutes: typeof durationMinutes === 'number' ? durationMinutes : null,
      contactName,
      contactEmail,
      status: 'scheduled',
      createdAt: this._nowISO()
    };

    intakeCalls.push(intakeCall);
    this._saveToStorage('intake_calls', intakeCalls);

    return {
      intakeCall,
      success: true,
      message: 'Intake call scheduled.'
    };
  }

  // scheduleCoachingPackage(offeringId, firstSessionStart, sessionLengthMinutes, recurrenceType, recurrenceCount, childName, parentEmail)
  scheduleCoachingPackage(offeringId, firstSessionStart, sessionLengthMinutes, recurrenceType, recurrenceCount, childName, parentEmail) {
    const offerings = this._getFromStorage('offerings');
    const offering = offerings.find(o => o.id === offeringId && o.categoryId === 'coaching');
    if (!offering) {
      return {
        coachingBooking: null,
        success: false,
        message: 'Coaching offering not found.'
      };
    }

    const bookings = this._getFromStorage('coaching_bookings');
    const lengthMinutes = typeof sessionLengthMinutes === 'number' ? sessionLengthMinutes : offering.durationMinutes || null;
    const recType = recurrenceType || 'weekly_same_time';
    const recCount = typeof recurrenceCount === 'number' ? recurrenceCount : (offering.totalSessions ? offering.totalSessions - 1 : 0);
    const sessionDates = this._generateWeeklySessionDates(firstSessionStart, recCount);

    const booking = {
      id: this._generateId('coach'),
      offeringId,
      offeringTitle: offering.title,
      childName,
      parentEmail,
      sessionLengthMinutes: lengthMinutes,
      totalSessions: offering.totalSessions || (recCount + 1),
      firstSessionStart,
      recurrenceType: recType,
      recurrenceCount: recCount,
      generatedSessionDates: sessionDates,
      status: 'scheduled',
      createdAt: this._nowISO()
    };

    bookings.push(booking);
    this._saveToStorage('coaching_bookings', bookings);

    return {
      coachingBooking: booking,
      success: true,
      message: 'Coaching package scheduled.'
    };
  }

  // getNewsletterPreferenceOptions()
  getNewsletterPreferenceOptions() {
    const frequencies = [
      { code: 'daily', label: 'Daily' },
      { code: 'weekly', label: 'Weekly' },
      { code: 'biweekly', label: 'Every 2 weeks' },
      { code: 'monthly', label: 'Monthly' }
    ];

    const agePreferences = [
      { code: 'age_3', label: 'Age 3' },
      { code: 'age_4', label: 'Age 4' },
      { code: 'ages_3_4', label: 'Ages 3–4' },
      { code: 'ages_3_5', label: 'Ages 3–5' }
    ];

    const topicPreferences = [
      { code: 'parent_tips', label: 'Parent tips' },
      { code: 'free_activities', label: 'Free activities' },
      { code: 'workshop_updates', label: 'Workshop updates' },
      { code: 'educator_pd', label: 'Educator PD' }
    ];

    const contentFormatPreferences = [
      { code: 'printable_games', label: 'Printable games' },
      { code: 'short_videos', label: 'Short videos' },
      { code: 'long_reads', label: 'In-depth articles' }
    ];

    return {
      frequencies,
      agePreferences,
      topicPreferences,
      contentFormatPreferences
    };
  }

  // createNewsletterSubscription(name, email, frequency, agePreferences, topicPreferences, contentFormatPreferences, additionalPreferences)
  createNewsletterSubscription(name, email, frequency, agePreferences, topicPreferences, contentFormatPreferences, additionalPreferences) {
    const subs = this._getFromStorage('newsletter_subscriptions');
    const now = this._nowISO();

    const subscription = {
      id: this._generateId('sub'),
      name,
      email,
      frequency,
      agePreferences: Array.isArray(agePreferences) ? agePreferences : [],
      topicPreferences: Array.isArray(topicPreferences) ? topicPreferences : [],
      contentFormatPreferences: Array.isArray(contentFormatPreferences) ? contentFormatPreferences : [],
      additionalPreferences: additionalPreferences || null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      subscription,
      success: true,
      message: 'Subscription created.'
    };
  }

  // getBlogFilterOptions()
  getBlogFilterOptions() {
    const articles = this._getFromStorage('blog_articles').filter(a => a.status === 'published');

    const dateRanges = [
      { code: 'last_30_days', label: 'Last 30 days' },
      { code: 'last_6_months', label: 'Last 6 months' },
      { code: 'last_12_months', label: 'Last 12 months' }
    ];

    const topicsSet = new Set();
    const audienceMap = {};

    for (const a of articles) {
      if (Array.isArray(a.tags)) a.tags.forEach(t => topicsSet.add(t));
      if (a.audience && !audienceMap[a.audience]) {
        audienceMap[a.audience] = {
          code: a.audience,
          label: this._mapAudienceToLabel(a.audience)
        };
      }
    }

    const sortOptions = [
      { code: 'newest', label: 'Newest' },
      { code: 'most_popular', label: 'Most popular' }
    ];

    return {
      dateRanges,
      topics: Array.from(topicsSet),
      audiences: Object.values(audienceMap),
      sortOptions
    };
  }

  // searchBlogArticles(query, filters, sortBy, sortDirection, page, pageSize)
  searchBlogArticles(query, filters, sortBy, sortDirection, page, pageSize) {
    const articles = this._getFromStorage('blog_articles').filter(a => a.status === 'published');
    const f = filters || {};

    let items = articles.filter(a => {
      if (f.dateFrom) {
        const from = new Date(f.dateFrom);
        const pub = a.publishedAt ? new Date(a.publishedAt) : null;
        if (!pub || pub < from) return false;
      }
      if (f.dateTo) {
        const to = new Date(f.dateTo);
        const pub = a.publishedAt ? new Date(a.publishedAt) : null;
        if (!pub || pub > to) return false;
      }
      if (f.dateRangeCode) {
        const now = new Date();
        let from = null;
        if (f.dateRangeCode === 'last_6_months') {
          from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        } else if (f.dateRangeCode === 'last_30_days') {
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        } else if (f.dateRangeCode === 'last_12_months') {
          from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        }
        if (from) {
          const pub = a.publishedAt ? new Date(a.publishedAt) : null;
          if (!pub || pub < from) return false;
        }
      }
      if (Array.isArray(f.tags) && f.tags.length) {
        const tags = Array.isArray(a.tags) ? a.tags : [];
        const has = f.tags.some(t => tags.includes(t));
        if (!has) return false;
      }
      if (f.audience && a.audience && a.audience !== f.audience) return false;
      return true;
    });

    if (query) {
      const q = query.toLowerCase();
      items = items.filter(a => {
        const title = a.title || '';
        const summary = a.summary || '';
        const body = a.body || '';
        const keywords = Array.isArray(a.searchKeywords) ? a.searchKeywords.join(' ') : '';
        return (
          title.toLowerCase().includes(q) ||
          summary.toLowerCase().includes(q) ||
          body.toLowerCase().includes(q) ||
          keywords.toLowerCase().includes(q)
        );
      });
    }

    const sortKey = sortBy || 'newest';
    const dir = sortDirection === 'asc' ? 1 : -1;

    items.sort((a, b) => {
      if (sortKey === 'most_popular') {
        const pa = a.popularityScore || 0;
        const pb = b.popularityScore || 0;
        if (pa === pb) return 0;
        return pa < pb ? 1 * (dir === -1 ? 1 : -1) : -1 * (dir === -1 ? 1 : -1);
      }
      // default newest
      const da = a.publishedAt ? new Date(a.publishedAt) : null;
      const db = b.publishedAt ? new Date(b.publishedAt) : null;
      if (!da && !db) return 0;
      if (!da) return 1 * dir;
      if (!db) return -1 * dir;
      return (da - db) * dir;
    });

    const totalItems = items.length;
    const p = page && page > 0 ? page : 1;
    const ps = pageSize && pageSize > 0 ? pageSize : 10;
    const start = (p - 1) * ps;
    const end = start + ps;

    return {
      items: items.slice(start, end),
      page: p,
      pageSize: ps,
      totalItems,
      totalPages: Math.ceil(totalItems / ps)
    };
  }

  // getBlogArticleDetail(articleId)
  getBlogArticleDetail(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(a => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        publicationDateLabel: '',
        tagLabels: []
      };
    }

    const pubLabel = article.publishedAt ? new Date(article.publishedAt).toDateString() : '';
    const tagLabels = Array.isArray(article.tags) ? article.tags : [];

    return {
      article,
      publicationDateLabel: pubLabel,
      tagLabels
    };
  }

  // saveArticleToReadingList(articleId)
  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('blog_articles');
    const article = articles.find(a => a.id === articleId && a.status === 'published');
    if (!article) {
      return {
        readingListItem: null,
        totalSaved: this._getFromStorage('reading_list_items').length,
        success: false
      };
    }

    const list = this._getFromStorage('reading_list_items');
    const existing = list.find(r => r.articleId === articleId);
    if (existing) {
      return {
        readingListItem: existing,
        totalSaved: list.length,
        success: true
      };
    }

    const item = {
      id: this._generateId('rlist'),
      articleId,
      addedAt: this._nowISO()
    };

    list.push(item);
    this._saveToStorage('reading_list_items', list);

    return {
      readingListItem: item,
      totalSaved: list.length,
      success: true
    };
  }

  // getReadingList()
  getReadingList() {
    const list = this._getFromStorage('reading_list_items');
    const articles = this._getFromStorage('blog_articles');

    const items = list.map(r => {
      const article = articles.find(a => a.id === r.articleId) || null;
      return {
        readingListItem: { ...r, article },
        article
      };
    });

    return { items };
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    let list = this._getFromStorage('reading_list_items');
    list = list.filter(r => r.id !== readingListItemId);
    this._saveToStorage('reading_list_items', list);
    return {
      success: true,
      totalSaved: list.length
    };
  }

  // clearReadingList()
  clearReadingList() {
    this._saveToStorage('reading_list_items', []);
    return {
      success: true,
      totalSaved: 0
    };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const stored = this._getObjectFromStorage('about_page_content');
    if (stored) {
      return stored;
    }
    // If not configured in storage, return empty fields based on interface
    return {
      mission: '',
      philosophy: '',
      approach: '',
      teamMembers: [],
      ctaSections: []
    };
  }

  // getContactInquiryTypes()
  getContactInquiryTypes() {
    const stored = this._getObjectFromStorage('contact_inquiry_types');
    if (stored && Array.isArray(stored.inquiryTypes)) {
      return { inquiryTypes: stored.inquiryTypes };
    }
    const inquiryTypes = [
      { code: 'parent_program', label: 'Parent program question' },
      { code: 'educator_pd', label: 'Educator professional development' },
      { code: 'curriculum_support', label: 'Curriculum support' },
      { code: 'other', label: 'Other' }
    ];
    return { inquiryTypes };
  }

  // submitContactMessage(name, email, inquiryType, subject, message)
  submitContactMessage(name, email, inquiryType, subject, message) {
    const msgs = this._getFromStorage('contact_messages');
    const msg = {
      id: this._generateId('contact'),
      name,
      email,
      inquiryType: inquiryType || null,
      subject,
      message,
      createdAt: this._nowISO()
    };
    msgs.push(msg);
    this._saveToStorage('contact_messages', msgs);

    return {
      messageId: msg.id,
      success: true,
      confirmationMessage: 'Your message has been sent.'
    };
  }

  // getPolicyContent(policyType)
  getPolicyContent(policyType) {
    const policies = this._getFromStorage('policies');
    const policy = policies.find(p => p.policyType === policyType) || null;
    if (!policy) {
      return {
        policyType,
        title: '',
        lastUpdated: '',
        bodyHtml: ''
      };
    }
    return policy;
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