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
    const tableKeys = [
      'fund_categories',
      'funds',
      'gift_baskets',
      'gift_basket_items',
      'orders',
      'order_line_items',
      'recurring_pledges',
      'events',
      'ticket_types',
      'event_registrations',
      'event_attendees',
      'employers',
      'departments',
      'department_impacts',
      'student_stories',
      'donor_accounts',
      'contact_requests'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // Structured or singleton keys are left unset; getters will provide defaults

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

  // ----------------------
  // Auth helpers
  // ----------------------

  _getAuthSession() {
    const raw = localStorage.getItem('auth_session');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  _requireAuthenticatedUser() {
    const session = this._getAuthSession();
    if (!session || !session.email) {
      throw new Error('authentication_required');
    }
    return session;
  }

  // ----------------------
  // Domain helpers
  // ----------------------

  _getCategoryMap() {
    const categories = this._getFromStorage('fund_categories', []);
    const byCode = {};
    for (const c of categories) {
      if (c && c.code) byCode[c.code] = c;
    }
    return byCode;
  }

  _getCategoryAndDescendantsCodes(rootCode) {
    const categories = this._getFromStorage('fund_categories', []);
    const result = new Set();
    const byCode = {};
    for (const c of categories) {
      if (c && c.code) byCode[c.code] = c;
    }
    const stack = [rootCode];
    while (stack.length) {
      const code = stack.pop();
      if (!code || result.has(code)) continue;
      result.add(code);
      for (const c of categories) {
        if (c && c.parentCode === code) {
          stack.push(c.code);
        }
      }
    }
    if (!result.size) result.add(rootCode);
    return Array.from(result);
  }

  _validateDonationAmounts(fund, amount, donationFrequency) {
    if (!fund || typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return {
        valid: false,
        message: 'invalid_amount'
      };
    }

    if (donationFrequency === 'one_time') {
      const min = typeof fund.minimumOneTimeAmount === 'number' ? fund.minimumOneTimeAmount : 0;
      if (amount < min) {
        return {
          valid: false,
          message: 'amount_below_minimum_one_time'
        };
      }
      return { valid: true, message: '' };
    }

    if (donationFrequency === 'monthly') {
      if (!fund.allowsRecurring) {
        return {
          valid: false,
          message: 'recurring_not_allowed'
        };
      }
      let min = 0;
      if (typeof fund.minimumMonthlyAmount === 'number') {
        min = fund.minimumMonthlyAmount;
      } else if (typeof fund.minimumOneTimeAmount === 'number') {
        min = fund.minimumOneTimeAmount;
      }
      if (amount < min) {
        return {
          valid: false,
          message: 'amount_below_minimum_monthly'
        };
      }
      return { valid: true, message: '' };
    }

    return {
      valid: false,
      message: 'unsupported_donation_frequency'
    };
  }

  _calculateOrderTotal(lineItems) {
    let total = 0;
    for (const li of lineItems) {
      const lt = typeof li.lineTotalAmount === 'number' ? li.lineTotalAmount : 0;
      total += lt;
    }
    return total;
  }

  _getOrCreateGiftBasket() {
    let currentId = null;
    try {
      const rawId = localStorage.getItem('currentGiftBasketId');
      if (rawId) currentId = JSON.parse(rawId);
    } catch (e) {
      currentId = null;
    }

    const giftBaskets = this._getFromStorage('gift_baskets', []);

    if (currentId) {
      const existing = giftBaskets.find(gb => gb.id === currentId);
      if (existing) {
        return existing;
      }
    }

    const now = new Date().toISOString();
    const newBasket = {
      id: this._generateId('gb'),
      createdAt: now,
      updatedAt: now
    };
    giftBaskets.push(newBasket);
    this._saveToStorage('gift_baskets', giftBaskets);
    localStorage.setItem('currentGiftBasketId', JSON.stringify(newBasket.id));
    return newBasket;
  }

  _createOrderAndPledges(params) {
    const {
      orderType,
      donorFullName,
      donorEmail,
      paymentMethod,
      donationFrequency,
      billingDayOfMonth,
      lineItemsInput,
      employerId,
      notes
    } = params;

    const orders = this._getFromStorage('orders', []);
    const orderLineItems = this._getFromStorage('order_line_items', []);
    const recurringPledges = this._getFromStorage('recurring_pledges', []);
    const funds = this._getFromStorage('funds', []);

    const now = new Date().toISOString();

    const orderId = this._generateId('ord');
    const order = {
      id: orderId,
      createdAt: now,
      orderType: orderType || 'donation',
      donorFullName,
      donorEmail,
      totalAmount: 0,
      donationFrequency: donationFrequency || 'one_time',
      billingDayOfMonth: donationFrequency === 'monthly' ? billingDayOfMonth || 1 : null,
      paymentMethod,
      paymentStatus: 'completed',
      employerId: employerId || null,
      notes: notes || null
    };

    const createdLineItems = [];

    for (const input of lineItemsInput || []) {
      const lineId = this._generateId('li');
      const quantity = typeof input.quantity === 'number' && input.quantity > 0 ? input.quantity : 1;
      const unitAmount = typeof input.unitAmount === 'number' ? input.unitAmount : 0;
      const lineTotalAmount = quantity * unitAmount;

      const li = {
        id: lineId,
        orderId: orderId,
        lineItemType: input.lineItemType,
        fundId: input.fundId || null,
        eventId: input.eventId || null,
        ticketTypeId: input.ticketTypeId || null,
        quantity,
        unitAmount,
        lineTotalAmount,
        tributeType: input.tributeType || 'none',
        honoreeName: input.honoreeName || null,
        honoreeEmail: input.honoreeEmail || null,
        ecardMessage: input.ecardMessage || null,
        directToFeaturedDepartment: typeof input.directToFeaturedDepartment === 'boolean'
          ? input.directToFeaturedDepartment
          : null
      };

      orderLineItems.push(li);
      createdLineItems.push(li);
    }

    order.totalAmount = this._calculateOrderTotal(createdLineItems);

    orders.push(order);

    const createdRecurringPledgeIds = [];

    if (order.donationFrequency === 'monthly') {
      for (const li of createdLineItems) {
        if (li.lineItemType === 'fund_donation' && li.fundId) {
          const fund = funds.find(f => f.id === li.fundId);
          if (!fund) continue;

          const pledgeId = this._generateId('rp');

          let nextChargeDate = null;
          try {
            const today = new Date();
            const year = today.getUTCFullYear();
            const month = today.getUTCMonth();
            const day = order.billingDayOfMonth || 1;
            // Next month billing day
            const nextMonth = new Date(Date.UTC(year, month + 1, day));
            nextChargeDate = nextMonth.toISOString();
          } catch (e) {
            nextChargeDate = null;
          }

          const pledge = {
            id: pledgeId,
            fundId: li.fundId,
            createdAt: now,
            updatedAt: now,
            status: 'active',
            monthlyAmount: li.unitAmount,
            donationFrequency: 'monthly',
            billingDayOfMonth: order.billingDayOfMonth || 1,
            nextChargeDate,
            paymentMethod: order.paymentMethod,
            bankAccountName: null,
            bankAccountLast4: null,
            initialOrderId: orderId,
            lastOrderId: orderId,
            displayName: (fund && fund.name ? fund.name : 'Fund') + ' Monthly'
          };

          recurringPledges.push(pledge);
          createdRecurringPledgeIds.push(pledgeId);
        }
      }
    }

    this._saveToStorage('orders', orders);
    this._saveToStorage('order_line_items', orderLineItems);
    this._saveToStorage('recurring_pledges', recurringPledges);

    return {
      order,
      recurringPledgeIds: createdRecurringPledgeIds
    };
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomepageContent()
  getHomepageContent() {
    const funds = this._getFromStorage('funds', []);
    const events = this._getFromStorage('events', []);
    const categoriesByCode = this._getCategoryMap();

    const stored = this._getFromStorage('homepage_content', null) || {};

    let featuredFunds = [];
    const allFundsById = {};
    for (const f of funds) {
      if (f && f.id) allFundsById[f.id] = f;
    }

    if (Array.isArray(stored.featuredFunds) && stored.featuredFunds.length) {
      featuredFunds = stored.featuredFunds.map(ff => {
        const fund = allFundsById[ff.fundId] || null;
        const cat = fund ? categoriesByCode[fund.primaryCategoryCode] : null;
        return {
          fundId: ff.fundId,
          name: ff.name || (fund ? fund.name : ''),
          shortDescription: ff.shortDescription || (fund ? fund.shortDescription : ''),
          primaryCategoryCode: ff.primaryCategoryCode || (fund ? fund.primaryCategoryCode : null),
          primaryCategoryName: ff.primaryCategoryName || (cat ? cat.name : ''),
          typeOfNeed: ff.typeOfNeed || (fund ? fund.typeOfNeed || null : null),
          minimumOneTimeAmount: typeof ff.minimumOneTimeAmount === 'number'
            ? ff.minimumOneTimeAmount
            : (fund && typeof fund.minimumOneTimeAmount === 'number' ? fund.minimumOneTimeAmount : null),
          minimumMonthlyAmount: typeof ff.minimumMonthlyAmount === 'number'
            ? ff.minimumMonthlyAmount
            : (fund && typeof fund.minimumMonthlyAmount === 'number' ? fund.minimumMonthlyAmount : null),
          isFeaturedPriority: typeof ff.isFeaturedPriority === 'boolean'
            ? ff.isFeaturedPriority
            : (fund ? !!fund.isFeaturedPriority : false),
          // Foreign key resolution
          fund: fund
        };
      });
    } else if (Array.isArray(stored.featuredFundIds)) {
      featuredFunds = stored.featuredFundIds
        .map(id => {
          const fund = allFundsById[id];
          if (!fund) return null;
          const cat = categoriesByCode[fund.primaryCategoryCode];
          return {
            fundId: fund.id,
            name: fund.name,
            shortDescription: fund.shortDescription,
            primaryCategoryCode: fund.primaryCategoryCode,
            primaryCategoryName: cat ? cat.name : '',
            typeOfNeed: fund.typeOfNeed || null,
            minimumOneTimeAmount: fund.minimumOneTimeAmount || null,
            minimumMonthlyAmount: fund.minimumMonthlyAmount || null,
            isFeaturedPriority: !!fund.isFeaturedPriority,
            fund: fund
          };
        })
        .filter(Boolean);
    } else {
      featuredFunds = [];
    }

    const eventsById = {};
    for (const ev of events) {
      if (ev && ev.id) eventsById[ev.id] = ev;
    }

    let featuredEvents = [];
    if (Array.isArray(stored.featuredEvents) && stored.featuredEvents.length) {
      featuredEvents = stored.featuredEvents.map(fe => {
        const ev = eventsById[fe.eventId] || null;
        return {
          eventId: fe.eventId,
          name: fe.name || (ev ? ev.name : ''),
          startDatetime: fe.startDatetime || (ev ? ev.startDatetime : null),
          endDatetime: fe.endDatetime || (ev ? ev.endDatetime : null),
          location: fe.location || (ev ? ev.location : ''),
          isFundraisingEvent: typeof fe.isFundraisingEvent === 'boolean'
            ? fe.isFundraisingEvent
            : (ev ? !!ev.isFundraisingEvent : false),
          status: fe.status || (ev ? ev.status : ''),
          event: ev
        };
      });
    } else if (Array.isArray(stored.featuredEventIds)) {
      featuredEvents = stored.featuredEventIds
        .map(id => {
          const ev = eventsById[id];
          if (!ev) return null;
          return {
            eventId: ev.id,
            name: ev.name,
            startDatetime: ev.startDatetime,
            endDatetime: ev.endDatetime,
            location: ev.location,
            isFundraisingEvent: !!ev.isFundraisingEvent,
            status: ev.status,
            event: ev
          };
        })
        .filter(Boolean);
    } else {
      featuredEvents = [];
    }

    const activeFundCount = funds.filter(f => f && f.active).length;
    const activeCampaignCount = funds.filter(f => f && f.active && f.isFeaturedPriority).length;
    const upcomingEventCount = events.filter(e => e && e.status === 'upcoming').length;

    return {
      heroTitle: stored.heroTitle || '',
      heroSubtitle: stored.heroSubtitle || '',
      campaignSummary: stored.campaignSummary || '',
      featuredFunds,
      featuredEvents,
      stats: {
        activeFundCount,
        activeCampaignCount,
        upcomingEventCount
      }
    };
  }

  // getHomepageQuickLinks()
  getHomepageQuickLinks() {
    const links = this._getFromStorage('homepage_quick_links', []);
    // No foreign key Ids here (only codes), so just return as-is
    return links;
  }

  // getFeaturedFunds()
  getFeaturedFunds() {
    const funds = this._getFromStorage('funds', []);
    const categoriesByCode = this._getCategoryMap();

    const featured = funds
      .filter(f => f && f.active && f.isFeaturedPriority)
      .map(fund => {
        const cat = categoriesByCode[fund.primaryCategoryCode];
        return {
          fundId: fund.id,
          name: fund.name,
          shortDescription: fund.shortDescription,
          primaryCategoryCode: fund.primaryCategoryCode,
          primaryCategoryName: cat ? cat.name : '',
          isFeaturedPriority: !!fund.isFeaturedPriority,
          typeOfNeed: fund.typeOfNeed || null,
          minimumOneTimeAmount: typeof fund.minimumOneTimeAmount === 'number' ? fund.minimumOneTimeAmount : null,
          minimumMonthlyAmount: typeof fund.minimumMonthlyAmount === 'number' ? fund.minimumMonthlyAmount : null,
          fund: fund
        };
      });

    return featured;
  }

  // getFundBrowseFilters()
  getFundBrowseFilters() {
    const categories = this._getFromStorage('fund_categories', []);
    const departments = this._getFromStorage('departments', []);

    const categoriesOut = categories.map(c => ({
      code: c.code,
      name: c.name,
      description: c.description || ''
    }));

    const typeOfNeedValues = [
      'emergency_grants_basic_needs',
      'scholarship_support',
      'research_support',
      'athletics_support',
      'library_support',
      'study_abroad_support',
      'student_wellness_support',
      'general_support'
    ];

    const typeOfNeedOptions = typeOfNeedValues.map(v => ({
      value: v,
      label: v
        .split('_')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const studentLevelValues = [
      'undergraduate',
      'graduate',
      'all_levels',
      'not_applicable'
    ];

    const studentLevelOptions = studentLevelValues.map(v => ({
      value: v,
      label: v
        .split('_')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    }));

    const departmentOptions = departments
      .filter(d => d && d.isActive)
      .map(d => ({
        departmentId: d.id,
        departmentName: d.name,
        collegeOrSchool: d.collegeOrSchool || '',
        department: d
      }));

    return {
      categories: categoriesOut,
      typeOfNeedOptions,
      studentLevelOptions,
      departmentOptions
    };
  }

  // searchFunds(query, filters, page, pageSize, sortBy, sortDirection)
  searchFunds(query, filters, page, pageSize, sortBy, sortDirection) {
    const funds = this._getFromStorage('funds', []);
    const categoriesByCode = this._getCategoryMap();
    const departments = this._getFromStorage('departments', []);

    const departmentsById = {};
    for (const d of departments) {
      if (d && d.id) departmentsById[d.id] = d;
    }

    let results = funds.filter(f => f && f.active);

    const q = (query || '').trim().toLowerCase();
    if (q) {
      results = results.filter(f => {
        const name = (f.name || '').toLowerCase();
        const shortDescription = (f.shortDescription || '').toLowerCase();
        const keywords = (f.searchableKeywords || '').toLowerCase();
        return (
          name.includes(q) ||
          shortDescription.includes(q) ||
          keywords.includes(q)
        );
      });
    }

    const fFilters = filters || {};

    if (fFilters.primaryCategoryCode) {
      const allowedCodes = this._getCategoryAndDescendantsCodes(fFilters.primaryCategoryCode);
      results = results.filter(f => {
        if (!f) return false;
        if (allowedCodes.includes(f.primaryCategoryCode)) return true;
        if (Array.isArray(f.categoryCodes)) {
          return f.categoryCodes.some(code => allowedCodes.includes(code));
        }
        return false;
      });
    }

    if (fFilters.typeOfNeed) {
      results = results.filter(f => f.typeOfNeed === fFilters.typeOfNeed);
    }

    if (fFilters.studentLevel) {
      results = results.filter(f => f.studentLevel === fFilters.studentLevel);
    }

    if (fFilters.departmentId) {
      results = results.filter(f => f.departmentId === fFilters.departmentId);
    }

    if (typeof fFilters.minimumMonthlyAmountMax === 'number') {
      const max = fFilters.minimumMonthlyAmountMax;
      results = results.filter(f => {
        if (!f.allowsRecurring) return false;
        const min = typeof f.minimumMonthlyAmount === 'number' ? f.minimumMonthlyAmount : 0;
        return min <= max;
      });
    }

    if (typeof fFilters.allowsRecurring === 'boolean') {
      results = results.filter(f => !!f.allowsRecurring === fFilters.allowsRecurring);
    }

    if (typeof fFilters.allowsGiftBasket === 'boolean') {
      results = results.filter(f => !!f.allowsGiftBasket === fFilters.allowsGiftBasket);
    }

    if (typeof fFilters.isFeaturedPriority === 'boolean') {
      results = results.filter(f => !!f.isFeaturedPriority === fFilters.isFeaturedPriority);
    }

    const sortField = sortBy || 'relevance';
    const dir = sortDirection === 'desc' ? -1 : 1;

    if (sortField === 'name') {
      results.sort((a, b) => {
        const an = (a.name || '').toLowerCase();
        const bn = (b.name || '').toLowerCase();
        if (an < bn) return -1 * dir;
        if (an > bn) return 1 * dir;
        return 0;
      });
    } else if (sortField === 'minimum_one_time_amount') {
      results.sort((a, b) => {
        const av = typeof a.minimumOneTimeAmount === 'number' ? a.minimumOneTimeAmount : Number.POSITIVE_INFINITY;
        const bv = typeof b.minimumOneTimeAmount === 'number' ? b.minimumOneTimeAmount : Number.POSITIVE_INFINITY;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    } else if (sortField === 'minimum_monthly_amount') {
      results.sort((a, b) => {
        const av = typeof a.minimumMonthlyAmount === 'number' ? a.minimumMonthlyAmount : Number.POSITIVE_INFINITY;
        const bv = typeof b.minimumMonthlyAmount === 'number' ? b.minimumMonthlyAmount : Number.POSITIVE_INFINITY;
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    const currentPage = typeof page === 'number' && page > 0 ? page : 1;
    const size = typeof pageSize === 'number' && pageSize > 0 ? pageSize : 20;
    const totalResults = results.length;
    const start = (currentPage - 1) * size;
    const end = start + size;

    const pageResults = results.slice(start, end).map(fund => {
      const cat = categoriesByCode[fund.primaryCategoryCode];
      const dept = fund.departmentId ? departmentsById[fund.departmentId] : null;
      return {
        fundId: fund.id,
        name: fund.name,
        shortDescription: fund.shortDescription,
        primaryCategoryCode: fund.primaryCategoryCode,
        primaryCategoryName: cat ? cat.name : '',
        typeOfNeed: fund.typeOfNeed || null,
        studentLevel: fund.studentLevel || null,
        minimumOneTimeAmount: typeof fund.minimumOneTimeAmount === 'number' ? fund.minimumOneTimeAmount : null,
        minimumMonthlyAmount: typeof fund.minimumMonthlyAmount === 'number' ? fund.minimumMonthlyAmount : null,
        allowsRecurring: !!fund.allowsRecurring,
        allowsGiftBasket: !!fund.allowsGiftBasket,
        isFeaturedPriority: !!fund.isFeaturedPriority,
        departmentName: dept ? dept.name : null,
        fund: fund
      };
    });

    return {
      totalResults,
      page: currentPage,
      pageSize: size,
      results: pageResults
    };
  }

  // getFundDetail(fundId)
  getFundDetail(fundId) {
    const funds = this._getFromStorage('funds', []);
    const categoriesByCode = this._getCategoryMap();
    const departments = this._getFromStorage('departments', []);
    const departmentImpacts = this._getFromStorage('department_impacts', []);

    const fund = funds.find(f => f.id === fundId) || null;
    if (!fund) {
      return {
        id: null,
        name: '',
        shortDescription: '',
        description: '',
        primaryCategoryCode: null,
        primaryCategoryName: '',
        categoryCodes: [],
        typeOfNeed: null,
        studentLevel: null,
        minimumOneTimeAmount: null,
        minimumMonthlyAmount: null,
        allowsRecurring: false,
        allowsGiftBasket: false,
        isFeaturedPriority: false,
        departmentId: null,
        departmentName: null,
        active: false,
        searchableKeywords: '',
        impactSummary: '',
        suggestedDonationAmounts: [],
        department: null
      };
    }

    const cat = categoriesByCode[fund.primaryCategoryCode];
    const dept = fund.departmentId
      ? departments.find(d => d.id === fund.departmentId) || null
      : null;

    let impactSummary = '';
    if (dept) {
      const di = departmentImpacts.find(x => x.departmentId === dept.id);
      if (di) impactSummary = di.impactSummary || '';
    }

    // Instrumentation for task completion tracking
    try {
      // Determine if this is a research fund
      let isResearchFund = false;

      if (fund.typeOfNeed === 'research_support') {
        isResearchFund = true;
      } else {
        const primaryCat = categoriesByCode[fund.primaryCategoryCode];
        if (
          primaryCat &&
          typeof primaryCat.name === 'string' &&
          primaryCat.name.toLowerCase().includes('research')
        ) {
          isResearchFund = true;
        } else if (Array.isArray(fund.categoryCodes)) {
          for (const code of fund.categoryCodes) {
            const catObj = categoriesByCode[code];
            if (
              catObj &&
              typeof catObj.name === 'string' &&
              catObj.name.toLowerCase().includes('research')
            ) {
              isResearchFund = true;
              break;
            }
          }
        }
      }

      if (isResearchFund) {
        const name = (fund.name || '').toLowerCase();
        const shortDescription = (fund.shortDescription || '').toLowerCase();
        const searchableKeywords = (fund.searchableKeywords || '').toLowerCase();
        const text = name + ' ' + shortDescription + ' ' + searchableKeywords;

        if (text.includes('climate')) {
          const value = {
            fundId: fund.id,
            minimumOneTimeAmount: typeof fund.minimumOneTimeAmount === 'number'
              ? fund.minimumOneTimeAmount
              : null
          };
          localStorage.setItem('task3_climateFundViewed', JSON.stringify(value));
        }

        if (text.includes('health')) {
          const value = {
            fundId: fund.id,
            minimumOneTimeAmount: typeof fund.minimumOneTimeAmount === 'number'
              ? fund.minimumOneTimeAmount
              : null
          };
          localStorage.setItem('task3_healthFundViewed', JSON.stringify(value));
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {}
    }

    return {
      id: fund.id,
      name: fund.name,
      shortDescription: fund.shortDescription,
      description: fund.description || '',
      primaryCategoryCode: fund.primaryCategoryCode,
      primaryCategoryName: cat ? cat.name : '',
      categoryCodes: Array.isArray(fund.categoryCodes) ? fund.categoryCodes : [],
      typeOfNeed: fund.typeOfNeed || null,
      studentLevel: fund.studentLevel || null,
      minimumOneTimeAmount: typeof fund.minimumOneTimeAmount === 'number' ? fund.minimumOneTimeAmount : null,
      minimumMonthlyAmount: typeof fund.minimumMonthlyAmount === 'number' ? fund.minimumMonthlyAmount : null,
      allowsRecurring: !!fund.allowsRecurring,
      allowsGiftBasket: !!fund.allowsGiftBasket,
      isFeaturedPriority: !!fund.isFeaturedPriority,
      departmentId: fund.departmentId || null,
      departmentName: dept ? dept.name : null,
      active: !!fund.active,
      searchableKeywords: fund.searchableKeywords || '',
      impactSummary,
      suggestedDonationAmounts: [],
      department: dept
    };
  }

  // addFundToGiftBasket(fundId, amount)
  addFundToGiftBasket(fundId, amount) {
    const funds = this._getFromStorage('funds', []);
    const categoriesByCode = this._getCategoryMap();
    const fund = funds.find(f => f.id === fundId) || null;

    if (!fund) {
      return {
        success: false,
        giftBasketId: null,
        items: [],
        totalAmount: 0,
        message: 'fund_not_found'
      };
    }

    const validation = this._validateDonationAmounts(fund, amount, 'one_time');
    if (!validation.valid) {
      return {
        success: false,
        giftBasketId: null,
        items: [],
        totalAmount: 0,
        message: validation.message
      };
    }

    const giftBasket = this._getOrCreateGiftBasket();
    const giftBasketItems = this._getFromStorage('gift_basket_items', []);

    const now = new Date().toISOString();
    let existing = giftBasketItems.find(
      item => item.giftBasketId === giftBasket.id && item.fundId === fundId
    );

    if (existing) {
      existing.amount = amount;
      existing.addedAt = now;
    } else {
      existing = {
        id: this._generateId('gbi'),
        giftBasketId: giftBasket.id,
        fundId: fundId,
        amount: amount,
        addedAt: now
      };
      giftBasketItems.push(existing);
    }

    const giftBaskets = this._getFromStorage('gift_baskets', []);
    const gbIndex = giftBaskets.findIndex(gb => gb.id === giftBasket.id);
    if (gbIndex >= 0) {
      giftBaskets[gbIndex].updatedAt = now;
      this._saveToStorage('gift_baskets', giftBaskets);
    }

    this._saveToStorage('gift_basket_items', giftBasketItems);

    const itemsForBasket = giftBasketItems.filter(i => i.giftBasketId === giftBasket.id);

    let totalAmount = 0;
    const itemsOut = itemsForBasket.map(item => {
      const f = funds.find(x => x.id === item.fundId) || null;
      const cat = f ? categoriesByCode[f.primaryCategoryCode] : null;
      const amt = typeof item.amount === 'number' ? item.amount : 0;
      totalAmount += amt;
      return {
        giftBasketItemId: item.id,
        fundId: item.fundId,
        fundName: f ? f.name : '',
        primaryCategoryName: cat ? cat.name : '',
        amount: amt,
        minimumOneTimeAmount: f && typeof f.minimumOneTimeAmount === 'number' ? f.minimumOneTimeAmount : null,
        fund: f
      };
    });

    return {
      success: true,
      giftBasketId: giftBasket.id,
      items: itemsOut,
      totalAmount,
      message: 'added_to_gift_basket'
    };
  }

  // getGiftBasket()
  getGiftBasket() {
    let currentId = null;
    try {
      const rawId = localStorage.getItem('currentGiftBasketId');
      if (rawId) currentId = JSON.parse(rawId);
    } catch (e) {
      currentId = null;
    }

    if (!currentId) {
      return {
        giftBasketId: null,
        items: [],
        totalAmount: 0
      };
    }

    const giftBasketItems = this._getFromStorage('gift_basket_items', []);
    const funds = this._getFromStorage('funds', []);
    const categoriesByCode = this._getCategoryMap();

    const itemsForBasket = giftBasketItems.filter(i => i.giftBasketId === currentId);

    let totalAmount = 0;
    const itemsOut = itemsForBasket.map(item => {
      const fund = funds.find(f => f.id === item.fundId) || null;
      const cat = fund ? categoriesByCode[fund.primaryCategoryCode] : null;
      const amt = typeof item.amount === 'number' ? item.amount : 0;
      totalAmount += amt;
      return {
        giftBasketItemId: item.id,
        fundId: item.fundId,
        fundName: fund ? fund.name : '',
        primaryCategoryName: cat ? cat.name : '',
        amount: amt,
        minimumOneTimeAmount: fund && typeof fund.minimumOneTimeAmount === 'number' ? fund.minimumOneTimeAmount : null,
        allowsRecurring: fund ? !!fund.allowsRecurring : false,
        fund: fund
      };
    });

    return {
      giftBasketId: currentId,
      items: itemsOut,
      totalAmount
    };
  }

  // updateGiftBasketItem(giftBasketItemId, amount)
  updateGiftBasketItem(giftBasketItemId, amount) {
    const giftBasketItems = this._getFromStorage('gift_basket_items', []);
    const funds = this._getFromStorage('funds', []);
    const categoriesByCode = this._getCategoryMap();

    const item = giftBasketItems.find(i => i.id === giftBasketItemId) || null;
    if (!item) {
      return {
        success: false,
        giftBasketId: null,
        items: [],
        totalAmount: 0,
        message: 'gift_basket_item_not_found'
      };
    }

    const fund = funds.find(f => f.id === item.fundId) || null;
    if (!fund) {
      return {
        success: false,
        giftBasketId: null,
        items: [],
        totalAmount: 0,
        message: 'fund_not_found'
      };
    }

    const validation = this._validateDonationAmounts(fund, amount, 'one_time');
    if (!validation.valid) {
      return {
        success: false,
        giftBasketId: item.giftBasketId,
        items: [],
        totalAmount: 0,
        message: validation.message
      };
    }

    item.amount = amount;
    item.addedAt = new Date().toISOString();

    this._saveToStorage('gift_basket_items', giftBasketItems);

    const itemsForBasket = giftBasketItems.filter(i => i.giftBasketId === item.giftBasketId);

    let totalAmount = 0;
    const itemsOut = itemsForBasket.map(it => {
      const f = funds.find(x => x.id === it.fundId) || null;
      const cat = f ? categoriesByCode[f.primaryCategoryCode] : null;
      const amt = typeof it.amount === 'number' ? it.amount : 0;
      totalAmount += amt;
      return {
        giftBasketItemId: it.id,
        fundId: it.fundId,
        fundName: f ? f.name : '',
        amount: amt,
        fund: f
      };
    });

    return {
      success: true,
      giftBasketId: item.giftBasketId,
      items: itemsOut,
      totalAmount,
      message: 'gift_basket_item_updated'
    };
  }

  // removeGiftBasketItem(giftBasketItemId)
  removeGiftBasketItem(giftBasketItemId) {
    const giftBasketItems = this._getFromStorage('gift_basket_items', []);
    const funds = this._getFromStorage('funds', []);

    const item = giftBasketItems.find(i => i.id === giftBasketItemId) || null;
    if (!item) {
      return {
        success: false,
        giftBasketId: null,
        items: [],
        totalAmount: 0,
        message: 'gift_basket_item_not_found'
      };
    }

    const basketId = item.giftBasketId;
    const remainingItems = giftBasketItems.filter(i => i.id !== giftBasketItemId);
    this._saveToStorage('gift_basket_items', remainingItems);

    const itemsForBasket = remainingItems.filter(i => i.giftBasketId === basketId);

    let totalAmount = 0;
    const categoriesByCode = this._getCategoryMap();

    const itemsOut = itemsForBasket.map(it => {
      const f = funds.find(x => x.id === it.fundId) || null;
      const cat = f ? categoriesByCode[f.primaryCategoryCode] : null;
      const amt = typeof it.amount === 'number' ? it.amount : 0;
      totalAmount += amt;
      return {
        giftBasketItemId: it.id,
        fundId: it.fundId,
        fundName: f ? f.name : '',
        amount: amt,
        fund: f,
        primaryCategoryName: cat ? cat.name : ''
      };
    });

    return {
      success: true,
      giftBasketId: basketId,
      items: itemsOut,
      totalAmount,
      message: 'gift_basket_item_removed'
    };
  }

  // submitGiftBasketDonation(donationFrequency, billingDayOfMonth, donorFullName, donorEmail, paymentMethod, employerId, notes)
  submitGiftBasketDonation(donationFrequency, billingDayOfMonth, donorFullName, donorEmail, paymentMethod, employerId, notes) {
    const frequency = donationFrequency || 'one_time';
    const funds = this._getFromStorage('funds', []);

    let currentId = null;
    try {
      const rawId = localStorage.getItem('currentGiftBasketId');
      if (rawId) currentId = JSON.parse(rawId);
    } catch (e) {
      currentId = null;
    }

    if (!currentId) {
      return {
        success: false,
        orderId: null,
        orderType: 'donation',
        paymentStatus: 'failed',
        totalAmount: 0,
        donationFrequency: frequency,
        billingDayOfMonth: frequency === 'monthly' ? (billingDayOfMonth || 1) : null,
        createdRecurringPledgeIds: [],
        message: 'gift_basket_empty'
      };
    }

    const giftBasketItems = this._getFromStorage('gift_basket_items', []);
    const itemsForBasket = giftBasketItems.filter(i => i.giftBasketId === currentId);

    if (!itemsForBasket.length) {
      return {
        success: false,
        orderId: null,
        orderType: 'donation',
        paymentStatus: 'failed',
        totalAmount: 0,
        donationFrequency: frequency,
        billingDayOfMonth: frequency === 'monthly' ? (billingDayOfMonth || 1) : null,
        createdRecurringPledgeIds: [],
        message: 'gift_basket_empty'
      };
    }

    const lineItemsInput = [];

    for (const item of itemsForBasket) {
      const fund = funds.find(f => f.id === item.fundId) || null;
      if (!fund) {
        return {
          success: false,
          orderId: null,
          orderType: 'donation',
          paymentStatus: 'failed',
          totalAmount: 0,
          donationFrequency: frequency,
          billingDayOfMonth: frequency === 'monthly' ? (billingDayOfMonth || 1) : null,
          createdRecurringPledgeIds: [],
          message: 'fund_not_found'
        };
      }
      const validation = this._validateDonationAmounts(fund, item.amount, frequency);
      if (!validation.valid) {
        return {
          success: false,
          orderId: null,
          orderType: 'donation',
          paymentStatus: 'failed',
          totalAmount: 0,
          donationFrequency: frequency,
          billingDayOfMonth: frequency === 'monthly' ? (billingDayOfMonth || 1) : null,
          createdRecurringPledgeIds: [],
          message: validation.message
        };
      }

      lineItemsInput.push({
        lineItemType: 'fund_donation',
        fundId: fund.id,
        eventId: null,
        ticketTypeId: null,
        quantity: 1,
        unitAmount: item.amount,
        tributeType: 'none',
        honoreeName: null,
        honoreeEmail: null,
        ecardMessage: null,
        directToFeaturedDepartment: null
      });
    }

    const billingDay = frequency === 'monthly' ? (billingDayOfMonth || 1) : null;

    const { order, recurringPledgeIds } = this._createOrderAndPledges({
      orderType: 'donation',
      donorFullName,
      donorEmail,
      paymentMethod,
      donationFrequency: frequency,
      billingDayOfMonth: billingDay,
      lineItemsInput,
      employerId: employerId || null,
      notes: notes || null
    });

    // Clear basket items for this basket
    const remainingItems = giftBasketItems.filter(i => i.giftBasketId !== currentId);
    this._saveToStorage('gift_basket_items', remainingItems);

    return {
      success: true,
      orderId: order.id,
      orderType: order.orderType,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      donationFrequency: order.donationFrequency,
      billingDayOfMonth: order.billingDayOfMonth,
      createdRecurringPledgeIds: recurringPledgeIds,
      message: 'gift_basket_donation_completed'
    };
  }

  // submitFundDonation(fundId, amount, donationFrequency, billingDayOfMonth, donorFullName, donorEmail, paymentMethod, employerId, tributeType, honoreeName, honoreeEmail, ecardMessage, directToFeaturedDepartment, donationSourceContext)
  submitFundDonation(
    fundId,
    amount,
    donationFrequency,
    billingDayOfMonth,
    donorFullName,
    donorEmail,
    paymentMethod,
    employerId,
    tributeType,
    honoreeName,
    honoreeEmail,
    ecardMessage,
    directToFeaturedDepartment,
    donationSourceContext
  ) {
    const funds = this._getFromStorage('funds', []);
    const fund = funds.find(f => f.id === fundId) || null;

    if (!fund) {
      return {
        success: false,
        orderId: null,
        orderType: 'donation',
        paymentStatus: 'failed',
        totalAmount: 0,
        donationFrequency: donationFrequency || 'one_time',
        billingDayOfMonth: donationFrequency === 'monthly' ? (billingDayOfMonth || 1) : null,
        recurringPledgeId: null,
        message: 'fund_not_found'
      };
    }

    const frequency = donationFrequency || 'one_time';
    const validation = this._validateDonationAmounts(fund, amount, frequency);
    if (!validation.valid) {
      return {
        success: false,
        orderId: null,
        orderType: 'donation',
        paymentStatus: 'failed',
        totalAmount: 0,
        donationFrequency: frequency,
        billingDayOfMonth: frequency === 'monthly' ? (billingDayOfMonth || 1) : null,
        recurringPledgeId: null,
        message: validation.message
      };
    }

    const billingDay = frequency === 'monthly' ? (billingDayOfMonth || 1) : null;

    let notes = null;
    if (donationSourceContext) {
      notes = 'source:' + donationSourceContext;
    }

    const lineItemsInput = [
      {
        lineItemType: 'fund_donation',
        fundId: fund.id,
        eventId: null,
        ticketTypeId: null,
        quantity: 1,
        unitAmount: amount,
        tributeType: tributeType || 'none',
        honoreeName: honoreeName || null,
        honoreeEmail: honoreeEmail || null,
        ecardMessage: ecardMessage || null,
        directToFeaturedDepartment: typeof directToFeaturedDepartment === 'boolean'
          ? directToFeaturedDepartment
          : null
      }
    ];

    const { order, recurringPledgeIds } = this._createOrderAndPledges({
      orderType: 'donation',
      donorFullName,
      donorEmail,
      paymentMethod,
      donationFrequency: frequency,
      billingDayOfMonth: billingDay,
      lineItemsInput,
      employerId: employerId || null,
      notes
    });

    // Instrumentation for task completion tracking
    try {
      let isResearchFund = false;

      if (fund.typeOfNeed === 'research_support') {
        isResearchFund = true;
      } else {
        const categoriesByCode = this._getCategoryMap();
        const primaryCat = categoriesByCode[fund.primaryCategoryCode];
        if (
          primaryCat &&
          typeof primaryCat.name === 'string' &&
          primaryCat.name.toLowerCase().includes('research')
        ) {
          isResearchFund = true;
        } else if (Array.isArray(fund.categoryCodes)) {
          for (const code of fund.categoryCodes) {
            const catObj = categoriesByCode[code];
            if (
              catObj &&
              typeof catObj.name === 'string' &&
              catObj.name.toLowerCase().includes('research')
            ) {
              isResearchFund = true;
              break;
            }
          }
        }
      }

      if (isResearchFund && frequency === 'one_time' && amount === 40) {
        const value = {
          orderId: order.id,
          fundId: fund.id,
          amount: amount,
          donationFrequency: frequency
        };
        localStorage.setItem('task3_donationContext', JSON.stringify(value));
      }
    } catch (e) {
      try {
        console.error('Instrumentation error:', e);
      } catch (e2) {}
    }

    return {
      success: true,
      orderId: order.id,
      orderType: order.orderType,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      donationFrequency: order.donationFrequency,
      billingDayOfMonth: order.billingDayOfMonth,
      recurringPledgeId: recurringPledgeIds[0] || null,
      message: 'fund_donation_completed'
    };
  }

  // searchEvents(query, startDate, endDate, status, isFundraisingEvent)
  searchEvents(query, startDate, endDate, status, isFundraisingEvent) {
    const events = this._getFromStorage('events', []);

    const q = (query || '').trim().toLowerCase();
    let results = events.slice();

    if (q) {
      results = results.filter(ev => {
        const name = (ev.name || '').toLowerCase();
        const keywords = (ev.searchableKeywords || '').toLowerCase();
        return name.includes(q) || keywords.includes(q);
      });
    }

    if (startDate) {
      const start = new Date(startDate).toISOString();
      results = results.filter(ev => !ev.startDatetime || ev.startDatetime >= start);
    }

    if (endDate) {
      const end = new Date(endDate).toISOString();
      results = results.filter(ev => !ev.endDatetime || ev.endDatetime <= end);
    }

    if (status) {
      results = results.filter(ev => ev.status === status);
    }

    if (typeof isFundraisingEvent === 'boolean') {
      results = results.filter(ev => !!ev.isFundraisingEvent === isFundraisingEvent);
    }

    return results.map(ev => ({
      eventId: ev.id,
      name: ev.name,
      descriptionSummary: ev.description || '',
      startDatetime: ev.startDatetime,
      endDatetime: ev.endDatetime || null,
      location: ev.location || '',
      isFundraisingEvent: !!ev.isFundraisingEvent,
      status: ev.status
    }));
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events', []);
    const funds = this._getFromStorage('funds', []);
    const event = events.find(e => e.id === eventId) || null;

    if (!event) {
      return {
        id: null,
        name: '',
        slug: '',
        description: '',
        startDatetime: null,
        endDatetime: null,
        location: '',
        isFundraisingEvent: false,
        primaryFundId: null,
        primaryFundName: null,
        status: '',
        primaryFund: null
      };
    }

    const primaryFund = event.primaryFundId
      ? funds.find(f => f.id === event.primaryFundId) || null
      : null;

    return {
      id: event.id,
      name: event.name,
      slug: event.slug || '',
      description: event.description || '',
      startDatetime: event.startDatetime,
      endDatetime: event.endDatetime || null,
      location: event.location || '',
      isFundraisingEvent: !!event.isFundraisingEvent,
      primaryFundId: event.primaryFundId || null,
      primaryFundName: primaryFund ? primaryFund.name : null,
      status: event.status,
      primaryFund: primaryFund
    };
  }

  // getEventTicketTypes(eventId)
  getEventTicketTypes(eventId) {
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const filtered = ticketTypes.filter(tt => tt.eventId === eventId);
    return filtered.map(tt => ({
      ticketTypeId: tt.id,
      name: tt.name,
      description: tt.description || '',
      price: typeof tt.price === 'number' ? tt.price : 0,
      allowsQuantitySelection: !!tt.allowsQuantitySelection,
      includesTshirt: !!tt.includesTshirt,
      maxQuantityPerOrder: typeof tt.maxQuantityPerOrder === 'number' ? tt.maxQuantityPerOrder : null
    }));
  }

  // getEventAdditionalDonationFunds(eventId)
  getEventAdditionalDonationFunds(eventId) {
    // For now, return all active funds as eligible additional donation options
    const funds = this._getFromStorage('funds', []);
    const categoriesByCode = this._getCategoryMap();

    const activeFunds = funds.filter(f => f && f.active);

    return activeFunds.map(fund => {
      const cat = categoriesByCode[fund.primaryCategoryCode];
      return {
        fundId: fund.id,
        name: fund.name,
        shortDescription: fund.shortDescription,
        typeOfNeed: fund.typeOfNeed || null,
        primaryCategoryName: cat ? cat.name : '',
        fund: fund
      };
    });
  }

  // submitEventRegistrationOrder(eventId, tickets, additionalDonationFundId, additionalDonationAmount, purchaserFullName, purchaserEmail, paymentMethod)
  submitEventRegistrationOrder(
    eventId,
    tickets,
    additionalDonationFundId,
    additionalDonationAmount,
    purchaserFullName,
    purchaserEmail,
    paymentMethod
  ) {
    const events = this._getFromStorage('events', []);
    const ticketTypes = this._getFromStorage('ticket_types', []);
    const funds = this._getFromStorage('funds', []);

    const event = events.find(e => e.id === eventId) || null;
    if (!event) {
      return {
        success: false,
        orderId: null,
        orderType: 'event_registration',
        paymentStatus: 'failed',
        eventRegistrationId: null,
        totalAmount: 0,
        ticketCount: 0,
        message: 'event_not_found'
      };
    }

    const ticketArray = Array.isArray(tickets) ? tickets : [];
    if (!ticketArray.length) {
      return {
        success: false,
        orderId: null,
        orderType: 'event_registration',
        paymentStatus: 'failed',
        eventRegistrationId: null,
        totalAmount: 0,
        ticketCount: 0,
        message: 'no_tickets_selected'
      };
    }

    const lineItemsInput = [];
    let totalTickets = 0;

    for (const t of ticketArray) {
      const tt = ticketTypes.find(x => x.id === t.ticketTypeId && x.eventId === eventId) || null;
      if (!tt) {
        return {
          success: false,
          orderId: null,
          orderType: 'event_registration',
          paymentStatus: 'failed',
          eventRegistrationId: null,
          totalAmount: 0,
          ticketCount: 0,
          message: 'ticket_type_not_found'
        };
      }
      const qty = typeof t.quantity === 'number' && t.quantity > 0 ? t.quantity : 0;
      if (qty === 0) continue;
      if (typeof tt.maxQuantityPerOrder === 'number' && qty > tt.maxQuantityPerOrder) {
        return {
          success: false,
          orderId: null,
          orderType: 'event_registration',
          paymentStatus: 'failed',
          eventRegistrationId: null,
          totalAmount: 0,
          ticketCount: 0,
          message: 'ticket_quantity_exceeds_limit'
        };
      }
      totalTickets += qty;
      lineItemsInput.push({
        lineItemType: 'event_ticket',
        fundId: null,
        eventId: event.id,
        ticketTypeId: tt.id,
        quantity: qty,
        unitAmount: typeof tt.price === 'number' ? tt.price : 0,
        tributeType: 'none',
        honoreeName: null,
        honoreeEmail: null,
        ecardMessage: null,
        directToFeaturedDepartment: null
      });
    }

    if (!lineItemsInput.length) {
      return {
        success: false,
        orderId: null,
        orderType: 'event_registration',
        paymentStatus: 'failed',
        eventRegistrationId: null,
        totalAmount: 0,
        ticketCount: 0,
        message: 'no_tickets_selected'
      };
    }

    let additionalAmount = 0;
    if (additionalDonationFundId && typeof additionalDonationAmount === 'number' && additionalDonationAmount > 0) {
      const fund = funds.find(f => f.id === additionalDonationFundId) || null;
      if (!fund) {
        return {
          success: false,
          orderId: null,
          orderType: 'event_registration',
          paymentStatus: 'failed',
          eventRegistrationId: null,
          totalAmount: 0,
          ticketCount: 0,
          message: 'fund_not_found'
        };
      }
      const validation = this._validateDonationAmounts(fund, additionalDonationAmount, 'one_time');
      if (!validation.valid) {
        return {
          success: false,
          orderId: null,
          orderType: 'event_registration',
          paymentStatus: 'failed',
          eventRegistrationId: null,
          totalAmount: 0,
          ticketCount: 0,
          message: validation.message
        };
      }
      additionalAmount = additionalDonationAmount;
      lineItemsInput.push({
        lineItemType: 'additional_donation',
        fundId: fund.id,
        eventId: event.id,
        ticketTypeId: null,
        quantity: 1,
        unitAmount: additionalAmount,
        tributeType: 'none',
        honoreeName: null,
        honoreeEmail: null,
        ecardMessage: null,
        directToFeaturedDepartment: null
      });
    }

    const { order } = this._createOrderAndPledges({
      orderType: 'event_registration',
      donorFullName: purchaserFullName,
      donorEmail: purchaserEmail,
      paymentMethod,
      donationFrequency: 'one_time',
      billingDayOfMonth: null,
      lineItemsInput,
      employerId: null,
      notes: null
    });

    const eventRegistrations = this._getFromStorage('event_registrations', []);
    const eventAttendees = this._getFromStorage('event_attendees', []);

    const registrationId = this._generateId('er');
    const now = new Date().toISOString();

    const registration = {
      id: registrationId,
      eventId: event.id,
      orderId: order.id,
      purchaserFullName,
      purchaserEmail,
      totalTickets,
      additionalDonationAmount: additionalAmount || 0,
      createdAt: now
    };

    eventRegistrations.push(registration);

    for (const t of ticketArray) {
      if (!Array.isArray(t.attendees)) continue;
      for (const att of t.attendees) {
        const attendee = {
          id: this._generateId('ea'),
          eventRegistrationId: registrationId,
          ticketTypeId: t.ticketTypeId,
          participantIndex: typeof att.participantIndex === 'number' ? att.participantIndex : 1,
          tshirtSize: att.tshirtSize || 'm',
          attendeeName: att.attendeeName || null
        };
        eventAttendees.push(attendee);
      }
    }

    this._saveToStorage('event_registrations', eventRegistrations);
    this._saveToStorage('event_attendees', eventAttendees);

    return {
      success: true,
      orderId: order.id,
      orderType: order.orderType,
      paymentStatus: order.paymentStatus,
      eventRegistrationId: registrationId,
      totalAmount: order.totalAmount,
      ticketCount: totalTickets,
      message: 'event_registration_completed'
    };
  }

  // getImpactOverview()
  getImpactOverview() {
    const impactContent = this._getFromStorage('impact_overview_content', null) || {};
    const departmentImpacts = this._getFromStorage('department_impacts', []);
    const departments = this._getFromStorage('departments', []);

    const departmentsById = {};
    for (const d of departments) {
      if (d && d.id) departmentsById[d.id] = d;
    }

    const featuredDepartmentImpacts = departmentImpacts
      .filter(di => di && di.featured)
      .map(di => {
        const dept = departmentsById[di.departmentId] || null;
        return {
          departmentImpactId: di.id,
          departmentName: dept ? dept.name : '',
          impactSummary: di.impactSummary,
          studentStoryCount: di.studentStoryCount,
          featured: !!di.featured,
          department: dept
        };
      });

    const tabs = Array.isArray(impactContent.tabs) && impactContent.tabs.length
      ? impactContent.tabs
      : [
          { code: 'by_department', label: 'By Department' }
        ];

    return {
      introTitle: impactContent.introTitle || '',
      introBody: impactContent.introBody || '',
      tabs,
      featuredDepartmentImpacts
    };
  }

  // getDepartmentImpactList(minStudentStoryCount, featuredOnly)
  getDepartmentImpactList(minStudentStoryCount, featuredOnly) {
    const departmentImpacts = this._getFromStorage('department_impacts', []);
    const departments = this._getFromStorage('departments', []);

    const departmentsById = {};
    for (const d of departments) {
      if (d && d.id) departmentsById[d.id] = d;
    }

    let list = departmentImpacts.slice();

    if (typeof minStudentStoryCount === 'number') {
      list = list.filter(di => di.studentStoryCount >= minStudentStoryCount);
    }

    if (typeof featuredOnly === 'boolean' && featuredOnly) {
      list = list.filter(di => di.featured);
    }

    return list.map(di => {
      const dept = departmentsById[di.departmentId] || null;
      return {
        departmentImpactId: di.id,
        departmentId: di.departmentId,
        departmentName: dept ? dept.name : '',
        collegeOrSchool: dept ? dept.collegeOrSchool || '' : '',
        impactSummary: di.impactSummary,
        studentStoryCount: di.studentStoryCount,
        featured: !!di.featured,
        department: dept
      };
    });
  }

  // getDepartmentImpactDetail(departmentImpactId)
  getDepartmentImpactDetail(departmentImpactId) {
    const departmentImpacts = this._getFromStorage('department_impacts', []);
    const departments = this._getFromStorage('departments', []);
    const studentStories = this._getFromStorage('student_stories', []);
    const funds = this._getFromStorage('funds', []);

    const di = departmentImpacts.find(x => x.id === departmentImpactId) || null;
    if (!di) {
      return {
        departmentImpact: {
          id: null,
          impactSummary: '',
          studentStoryCount: 0,
          highlightQuote: '',
          featured: false,
          contextFlagForCheckout: false
        },
        department: {
          id: null,
          name: '',
          description: '',
          collegeOrSchool: '',
          primaryFundId: null,
          primaryFundName: null,
          primaryFund: null
        },
        studentStories: []
      };
    }

    const dept = departments.find(d => d.id === di.departmentId) || null;
    const primaryFund = dept && dept.primaryFundId
      ? funds.find(f => f.id === dept.primaryFundId) || null
      : null;

    const stories = studentStories
      .filter(s => s.departmentImpactId === di.id)
      .map(s => ({
        id: s.id,
        studentName: s.studentName,
        title: s.title,
        summary: s.summary,
        classYear: s.classYear || '',
        major: s.major || ''
      }));

    return {
      departmentImpact: {
        id: di.id,
        impactSummary: di.impactSummary,
        studentStoryCount: di.studentStoryCount,
        highlightQuote: di.highlightQuote || '',
        featured: !!di.featured,
        contextFlagForCheckout: !!di.contextFlagForCheckout
      },
      department: {
        id: dept ? dept.id : null,
        name: dept ? dept.name : '',
        description: dept ? dept.description || '' : '',
        collegeOrSchool: dept ? dept.collegeOrSchool || '' : '',
        primaryFundId: dept ? dept.primaryFundId || null : null,
        primaryFundName: primaryFund ? primaryFund.name : null,
        primaryFund: primaryFund
      },
      studentStories: stories
    };
  }

  // getDepartmentsListing(collegeOrSchool)
  getDepartmentsListing(collegeOrSchool) {
    const departments = this._getFromStorage('departments', []);
    const funds = this._getFromStorage('funds', []);

    let list = departments.filter(d => d && d.isActive);

    if (collegeOrSchool) {
      const q = collegeOrSchool.toLowerCase();
      list = list.filter(d => (d.collegeOrSchool || '').toLowerCase() === q);
    }

    return list.map(d => {
      const primaryFund = d.primaryFundId
        ? funds.find(f => f.id === d.primaryFundId) || null
        : null;
      return {
        departmentId: d.id,
        name: d.name,
        description: d.description || '',
        collegeOrSchool: d.collegeOrSchool || '',
        primaryFundId: d.primaryFundId || null,
        primaryFundName: primaryFund ? primaryFund.name : null,
        primaryFund: primaryFund
      };
    });
  }

  // searchEmployers(query, onlyActive)
  searchEmployers(query, onlyActive) {
    const employers = this._getFromStorage('employers', []);
    const q = (query || '').trim().toLowerCase();

    let list = employers.slice();

    if (q) {
      list = list.filter(e => (e.name || '').toLowerCase().includes(q));
    }

    if (typeof onlyActive === 'boolean' ? onlyActive : true) {
      list = list.filter(e => !!e.isActive);
    }

    return list.map(e => ({
      employerId: e.id,
      name: e.name,
      matchingRatio: typeof e.matchingRatio === 'number' ? e.matchingRatio : 0,
      matchingRatioDisplay: e.matchingRatioDisplay || '',
      minDonationAmount: typeof e.minDonationAmount === 'number' ? e.minDonationAmount : null,
      maxDonationAmount: typeof e.maxDonationAmount === 'number' ? e.maxDonationAmount : null,
      notes: e.notes || '',
      isActive: !!e.isActive,
      employer: e
    }));
  }

  // signIn(email, password)
  signIn(email, password) {
    const accounts = this._getFromStorage('donor_accounts', []);
    const normalizedEmail = (email || '').trim().toLowerCase();
    let account = accounts.find(a => (a.email || '').toLowerCase() === normalizedEmail) || null;

    // If no account exists yet for this email, auto-provision a basic donor account
    if (!account && normalizedEmail && password) {
      const localPart = normalizedEmail.split('@')[0] || '';
      const donorName = localPart.replace(/\./g, ' ');
      account = {
        id: this._generateId('da'),
        donorName,
        email: normalizedEmail,
        password: password
      };
      accounts.push(account);
      this._saveToStorage('donor_accounts', accounts);
    }

    if (!account || account.password !== password) {
      return {
        success: false,
        donorName: '',
        message: 'invalid_credentials'
      };
    }

    const session = {
      donorId: account.id || null,
      donorName: account.donorName || '',
      email: account.email
    };
    localStorage.setItem('auth_session', JSON.stringify(session));

    return {
      success: true,
      donorName: session.donorName,
      message: 'signed_in'
    };
  }

  // signOut()
  signOut() {
    localStorage.removeItem('auth_session');
    return {
      success: true,
      message: 'signed_out'
    };
  }

  // getMyGivingOverview()
  getMyGivingOverview() {
    const session = this._requireAuthenticatedUser();
    const orders = this._getFromStorage('orders', []);
    const recurringPledges = this._getFromStorage('recurring_pledges', []);
    const funds = this._getFromStorage('funds', []);

    const donorOrders = orders
      .filter(o => (o.donorEmail || '').toLowerCase() === (session.email || '').toLowerCase())
      .sort((a, b) => {
        const ad = a.createdAt || '';
        const bd = b.createdAt || '';
        if (ad < bd) return 1;
        if (ad > bd) return -1;
        return 0;
      });

    const recentDonations = donorOrders.map(o => ({
      orderId: o.id,
      createdAt: o.createdAt,
      totalAmount: o.totalAmount,
      orderType: o.orderType,
      donationFrequency: o.donationFrequency,
      paymentStatus: o.paymentStatus
    }));

    const ordersById = {};
    for (const o of orders) {
      if (o && o.id) ordersById[o.id] = o;
    }

    const myPledges = recurringPledges.filter(p => {
      const initOrder = p.initialOrderId ? ordersById[p.initialOrderId] : null;
      if (!initOrder) return false;
      return (initOrder.donorEmail || '').toLowerCase() === (session.email || '').toLowerCase();
    });

    const recurringOut = myPledges.map(p => {
      const fund = funds.find(f => f.id === p.fundId) || null;
      return {
        recurringPledgeId: p.id,
        displayName: p.displayName || (fund ? fund.name + ' Monthly' : 'Monthly Pledge'),
        fundId: p.fundId,
        fundName: fund ? fund.name : '',
        monthlyAmount: p.monthlyAmount,
        billingDayOfMonth: p.billingDayOfMonth,
        status: p.status,
        nextChargeDate: p.nextChargeDate || null,
        paymentMethod: p.paymentMethod,
        fund: fund
      };
    });

    return {
      donorName: session.donorName || '',
      recentDonations,
      recurringPledges: recurringOut
    };
  }

  // getRecurringPledgeDetail(recurringPledgeId)
  getRecurringPledgeDetail(recurringPledgeId) {
    const session = this._requireAuthenticatedUser();
    const recurringPledges = this._getFromStorage('recurring_pledges', []);
    const orders = this._getFromStorage('orders', []);
    const funds = this._getFromStorage('funds', []);

    const pledge = recurringPledges.find(p => p.id === recurringPledgeId) || null;
    if (!pledge) {
      return {
        recurringPledgeId: null,
        fundId: null,
        fundName: '',
        createdAt: null,
        updatedAt: null,
        status: '',
        monthlyAmount: 0,
        billingDayOfMonth: null,
        nextChargeDate: null,
        paymentMethod: '',
        bankAccountName: null,
        bankAccountLast4: null,
        displayName: ''
      };
    }

    const initOrder = pledge.initialOrderId
      ? orders.find(o => o.id === pledge.initialOrderId) || null
      : null;

    if (
      initOrder &&
      (initOrder.donorEmail || '').toLowerCase() !== (session.email || '').toLowerCase()
    ) {
      throw new Error('forbidden');
    }

    const fund = funds.find(f => f.id === pledge.fundId) || null;

    return {
      recurringPledgeId: pledge.id,
      fundId: pledge.fundId,
      fundName: fund ? fund.name : '',
      createdAt: pledge.createdAt,
      updatedAt: pledge.updatedAt || null,
      status: pledge.status,
      monthlyAmount: pledge.monthlyAmount,
      billingDayOfMonth: pledge.billingDayOfMonth,
      nextChargeDate: pledge.nextChargeDate || null,
      paymentMethod: pledge.paymentMethod,
      bankAccountName: pledge.bankAccountName || null,
      bankAccountLast4: pledge.bankAccountLast4 || null,
      displayName: pledge.displayName || (fund ? fund.name + ' Monthly' : ''),
      fund: fund
    };
  }

  // updateRecurringPledgeSettings(recurringPledgeId, monthlyAmount, paymentMethod, bankAccountName, bankAccountLast4)
  updateRecurringPledgeSettings(recurringPledgeId, monthlyAmount, paymentMethod, bankAccountName, bankAccountLast4) {
    const session = this._requireAuthenticatedUser();
    const recurringPledges = this._getFromStorage('recurring_pledges', []);
    const orders = this._getFromStorage('orders', []);
    const funds = this._getFromStorage('funds', []);

    const pledge = recurringPledges.find(p => p.id === recurringPledgeId) || null;
    if (!pledge) {
      return {
        success: false,
        recurringPledgeId: null,
        monthlyAmount: null,
        paymentMethod: null,
        bankAccountName: null,
        bankAccountLast4: null,
        message: 'recurring_pledge_not_found'
      };
    }

    const initOrder = pledge.initialOrderId
      ? orders.find(o => o.id === pledge.initialOrderId) || null
      : null;
    if (
      initOrder &&
      (initOrder.donorEmail || '').toLowerCase() !== (session.email || '').toLowerCase()
    ) {
      return {
        success: false,
        recurringPledgeId: pledge.id,
        monthlyAmount: pledge.monthlyAmount,
        paymentMethod: pledge.paymentMethod,
        bankAccountName: pledge.bankAccountName || null,
        bankAccountLast4: pledge.bankAccountLast4 || null,
        message: 'forbidden'
      };
    }

    const fund = funds.find(f => f.id === pledge.fundId) || null;

    if (typeof monthlyAmount === 'number' && monthlyAmount > 0 && fund) {
      const validation = this._validateDonationAmounts(fund, monthlyAmount, 'monthly');
      if (!validation.valid) {
        return {
          success: false,
          recurringPledgeId: pledge.id,
          monthlyAmount: pledge.monthlyAmount,
          paymentMethod: pledge.paymentMethod,
          bankAccountName: pledge.bankAccountName || null,
          bankAccountLast4: pledge.bankAccountLast4 || null,
          message: validation.message
        };
      }
      pledge.monthlyAmount = monthlyAmount;
    }

    if (paymentMethod) {
      if (paymentMethod !== 'credit_card' && paymentMethod !== 'bank_transfer') {
        return {
          success: false,
          recurringPledgeId: pledge.id,
          monthlyAmount: pledge.monthlyAmount,
          paymentMethod: pledge.paymentMethod,
          bankAccountName: pledge.bankAccountName || null,
          bankAccountLast4: pledge.bankAccountLast4 || null,
          message: 'invalid_payment_method'
        };
      }
      pledge.paymentMethod = paymentMethod;
      if (paymentMethod === 'bank_transfer') {
        if (!bankAccountName || !bankAccountLast4) {
          return {
            success: false,
            recurringPledgeId: pledge.id,
            monthlyAmount: pledge.monthlyAmount,
            paymentMethod: pledge.paymentMethod,
            bankAccountName: pledge.bankAccountName || null,
            bankAccountLast4: pledge.bankAccountLast4 || null,
            message: 'bank_details_required'
          };
        }
        pledge.bankAccountName = bankAccountName;
        pledge.bankAccountLast4 = bankAccountLast4;
      } else {
        pledge.bankAccountName = null;
        pledge.bankAccountLast4 = null;
      }
    }

    pledge.updatedAt = new Date().toISOString();

    this._saveToStorage('recurring_pledges', recurringPledges);

    return {
      success: true,
      recurringPledgeId: pledge.id,
      monthlyAmount: pledge.monthlyAmount,
      paymentMethod: pledge.paymentMethod,
      bankAccountName: pledge.bankAccountName || null,
      bankAccountLast4: pledge.bankAccountLast4 || null,
      message: 'recurring_pledge_updated'
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    const content = this._getFromStorage('contact_page_content', null) || {};
    return {
      officeEmail: content.officeEmail || '',
      officePhone: content.officePhone || '',
      mailingAddress: content.mailingAddress || '',
      responseTimeDescription: content.responseTimeDescription || '',
      topics: Array.isArray(content.topics) ? content.topics : []
    };
  }

  // submitContactRequest(fullName, email, topicCode, message, preferredContactMethod, phone)
  submitContactRequest(fullName, email, topicCode, message, preferredContactMethod, phone) {
    const contactRequests = this._getFromStorage('contact_requests', []);

    const id = this._generateId('cr');
    const now = new Date().toISOString();

    const req = {
      id,
      fullName,
      email,
      topicCode: topicCode || null,
      message,
      preferredContactMethod: preferredContactMethod || null,
      phone: phone || null,
      createdAt: now,
      status: 'open'
    };

    contactRequests.push(req);
    this._saveToStorage('contact_requests', contactRequests);

    return {
      success: true,
      caseId: id,
      estimatedResponseTime: '2_business_days',
      message: 'contact_request_submitted'
    };
  }

  // getStaticPageContent(pageCode)
  getStaticPageContent(pageCode) {
    const pages = this._getFromStorage('static_pages', {});
    const page = pages && pages[pageCode] ? pages[pageCode] : null;

    if (!page) {
      return {
        title: '',
        bodyHtml: '',
        lastUpdated: ''
      };
    }

    return {
      title: page.title || '',
      bodyHtml: page.bodyHtml || '',
      lastUpdated: page.lastUpdated || ''
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