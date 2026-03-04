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

  _initStorage() {
    // Initialize all data tables in localStorage if not exist
    const arrayKeys = [
      'alumni_profiles',
      'interest_areas',
      'industries',
      'events',
      'event_registrations',
      'funds',
      'donations',
      'chapters',
      'volunteer_committees',
      'chapter_memberships',
      'mentor_profiles',
      'fields_of_study',
      'mentoring_topics',
      'mentoring_audience_options',
      'jobs',
      'saved_jobs',
      'product_categories',
      'product_subcategories',
      'products',
      'carts',
      'cart_items',
      'checkout_sessions',
      'class_notes',
      'volunteer_opportunities',
      'volunteer_shifts',
      'volunteer_signups',
      'connection_messages'
    ];

    for (const key of arrayKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    // About content object
    if (!localStorage.getItem('about_content')) {
      const about = {
        mission: '',
        history: '',
        keyProgramsSummary: '',
        contactEmail: '',
        contactPhone: '',
        policySections: []
      };
      localStorage.setItem('about_content', JSON.stringify(about));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined) return defaultValue;
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

  _parseDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _nowIso() {
    return new Date().toISOString();
  }

  // ---------- Foreign-key resolution helpers ----------

  _resolveProductRelations(product) {
    if (!product) return null;
    const categories = this._getFromStorage('product_categories');
    const subcategories = this._getFromStorage('product_subcategories');
    const category = categories.find(c => c.id === product.categoryId) || null;
    const subcategory = subcategories.find(sc => sc.id === product.subcategoryId) || null;
    return { ...product, category, subcategory };
  }

  _resolveCartItems(cartItems) {
    const products = this._getFromStorage('products');
    return cartItems.map(item => {
      const product = products.find(p => p.id === item.productId) || null;
      return { ...item, product };
    });
  }

  _resolveAlumniProfileRelations(profile) {
    if (!profile) return null;
    const industries = this._getFromStorage('industries');
    const interestAreas = this._getFromStorage('interest_areas');
    const industry = profile.industryId
      ? industries.find(i => i.id === profile.industryId) || null
      : null;
    const interestAreasResolved = Array.isArray(profile.interestAreaIds)
      ? profile.interestAreaIds
          .map(id => interestAreas.find(ia => ia.id === id) || null)
          .filter(x => x !== null)
      : [];
    return { ...profile, industry, interestAreas: interestAreasResolved };
  }

  _resolveSubcategoryRelations(subcategory) {
    if (!subcategory) return null;
    const categories = this._getFromStorage('product_categories');
    const category = categories.find(c => c.id === subcategory.categoryId) || null;
    return { ...subcategory, category };
  }

  _resolveVolunteerShiftRelations(shift) {
    if (!shift) return null;
    const opportunities = this._getFromStorage('volunteer_opportunities');
    const opportunity = opportunities.find(o => o.id === shift.opportunityId) || null;
    return { ...shift, opportunity };
  }

  _resolveCommitteeRelations(committee) {
    if (!committee) return null;
    const chapters = this._getFromStorage('chapters');
    const chapter = chapters.find(c => c.id === committee.chapterId) || null;
    return { ...committee, chapter };
  }

  // ---------- Cart helpers ----------

  _getOrCreateCart() {
    const carts = this._getFromStorage('carts');
    const nowIso = this._nowIso();
    let cart = carts.find(c => c.status === 'active');
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      carts.push(cart);
      this._saveToStorage('carts', carts);
    }
    return cart;
  }

  _calculateCartTotals(cart, items) {
    const subtotal = items.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);
    const tax = 0;
    const shipping = 0;
    const total = subtotal + tax + shipping;
    return { subtotal, tax, shipping, total };
  }

  _getActiveCheckoutSession(cartId) {
    const sessions = this._getFromStorage('checkout_sessions');
    const nowIso = this._nowIso();
    let session = sessions.find(s => s.cartId === cartId && s.status === 'started');
    if (!session) {
      session = {
        id: this._generateId('chk'),
        cartId,
        startedAt: nowIso,
        completedAt: null,
        status: 'started'
      };
      sessions.push(session);
      this._saveToStorage('checkout_sessions', sessions);
    }
    return session;
  }

  _getDateRangeForEventPreset(code) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (code === 'next_month') {
      const year = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
      const month = (now.getMonth() + 1) % 12; // 0-based
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0, 23, 59, 59, 999);
      return { from, to };
    }
    if (code === 'this_week') {
      const dayOfWeek = startOfDay.getDay(); // 0 Sunday
      const diffToMonday = (dayOfWeek + 6) % 7; // days since Monday
      const monday = new Date(startOfDay);
      monday.setDate(monday.getDate() - diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { from: monday, to: sunday };
    }
    if (code === 'upcoming') {
      const from = startOfDay;
      return { from, to: null };
    }
    return { from: null, to: null };
  }

  _getPostedDateRangePreset(daysBack) {
    const now = new Date();
    const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    return { from, to: now };
  }

  // --------------------------------------------------
  // Core interface implementations
  // --------------------------------------------------

  // getHomeHighlights(): { featuredEvents: Event[], recentJobs: Job[], featuredProducts: Product[] }
  getHomeHighlights() {
    const events = this._getFromStorage('events');
    const jobs = this._getFromStorage('jobs');
    const productsRaw = this._getFromStorage('products');

    const now = new Date();

    const upcomingEvents = events
      .slice()
      .filter(e => {
        const d = this._parseDate(e.startDateTime);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return da - db;
      })
      .slice(0, 3);

    const recentJobs = jobs
      .slice()
      .sort((a, b) => {
        const da = this._parseDate(a.postedDate) || new Date(0);
        const db = this._parseDate(b.postedDate) || new Date(0);
        return db - da;
      })
      .slice(0, 3);

    const featuredProducts = productsRaw
      .slice()
      .filter(p => p.isActive)
      .sort((a, b) => a.price - b.price)
      .slice(0, 3)
      .map(p => this._resolveProductRelations(p));

    return {
      featuredEvents: upcomingEvents,
      recentJobs,
      featuredProducts
    };
  }

  // getInterestAreasForProfile(): InterestArea[]
  getInterestAreasForProfile() {
    const interestAreas = this._getFromStorage('interest_areas');
    return interestAreas.filter(ia => ia.isActive !== false);
  }

  // createAlumniProfile(...): { profile: AlumniProfile, message: string }
  createAlumniProfile(
    firstName,
    lastName,
    preferredName,
    graduationYear,
    major,
    email,
    currentCity,
    currentState,
    preferredCity,
    industryId,
    employer,
    jobTitle,
    interestAreaIds,
    communicationEmail,
    communicationSms,
    communicationPhone
  ) {
    const profiles = this._getFromStorage('alumni_profiles');
    const nowIso = this._nowIso();

    const profile = {
      id: this._generateId('alum'),
      firstName,
      lastName,
      preferredName: preferredName || null,
      graduationYear,
      major: major || null,
      email,
      currentCity: currentCity || null,
      currentState: currentState || null,
      preferredCity: preferredCity || null,
      industryId: industryId || null,
      employer: employer || null,
      jobTitle: jobTitle || null,
      interestAreaIds: Array.isArray(interestAreaIds) ? interestAreaIds : [],
      communicationEmail: !!communicationEmail,
      communicationSms: !!communicationSms,
      communicationPhone: !!communicationPhone,
      createdAt: nowIso,
      updatedAt: null
    };

    profiles.push(profile);
    this._saveToStorage('alumni_profiles', profiles);

    return { profile, message: 'Alumni profile created' };
  }

  // getEventFilterOptions(): { priceTypes, datePresets, popularCities, categories }
  getEventFilterOptions() {
    const events = this._getFromStorage('events');

    const priceTypesSet = new Set();
    const citiesSet = new Set();
    const categoriesSet = new Set();

    events.forEach(e => {
      if (e.priceType) priceTypesSet.add(e.priceType);
      if (e.city) citiesSet.add(e.city);
      if (e.category) categoriesSet.add(e.category);
    });

    const now = new Date();
    const presets = [];

    // upcoming
    presets.push({
      code: 'upcoming',
      label: 'Upcoming',
      fromDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString(),
      toDate: null
    });

    // this_week
    const weekRange = this._getDateRangeForEventPreset('this_week');
    presets.push({
      code: 'this_week',
      label: 'This Week',
      fromDate: weekRange.from ? weekRange.from.toISOString() : null,
      toDate: weekRange.to ? weekRange.to.toISOString() : null
    });

    // next_month
    const nextMonthRange = this._getDateRangeForEventPreset('next_month');
    presets.push({
      code: 'next_month',
      label: 'Next Month',
      fromDate: nextMonthRange.from ? nextMonthRange.from.toISOString() : null,
      toDate: nextMonthRange.to ? nextMonthRange.to.toISOString() : null
    });

    return {
      priceTypes: Array.from(priceTypesSet),
      datePresets: presets,
      popularCities: Array.from(citiesSet),
      categories: Array.from(categoriesSet)
    };
  }

  // searchEvents(...): Event[]
  searchEvents(
    keyword,
    city,
    state,
    dateRange,
    datePreset,
    priceType,
    isFreeOnly,
    sortBy,
    limit,
    offset
  ) {
    let events = this._getFromStorage('events');

    // keyword filter
    if (keyword) {
      const kw = String(keyword).toLowerCase();
      events = events.filter(e => {
        const title = (e.title || '').toLowerCase();
        const desc = (e.description || '').toLowerCase();
        const tags = Array.isArray(e.tags) ? e.tags.join(' ').toLowerCase() : '';
        return title.includes(kw) || desc.includes(kw) || tags.includes(kw);
      });
    }

    if (city) {
      const c = String(city).toLowerCase();
      events = events.filter(e => (e.city || '').toLowerCase() === c);
    }

    if (state) {
      const s = String(state).toLowerCase();
      events = events.filter(e => (e.state || '').toLowerCase() === s);
    }

    if (priceType) {
      events = events.filter(e => e.priceType === priceType);
    }

    if (isFreeOnly) {
      events = events.filter(e => e.priceType === 'free');
    }

    let from = null;
    let to = null;

    if (dateRange && (dateRange.fromDate || dateRange.toDate)) {
      from = this._parseDate(dateRange.fromDate);
      to = this._parseDate(dateRange.toDate);
    } else if (datePreset) {
      const range = this._getDateRangeForEventPreset(datePreset);
      from = range.from;
      to = range.to;
    }

    if (from || to) {
      events = events.filter(e => {
        const d = this._parseDate(e.startDateTime);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    // sorting
    if (sortBy === 'date_desc') {
      events.sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return db - da;
      });
    } else {
      // default or 'date_asc'
      events.sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return da - db;
      });
    }

    const start = offset && offset > 0 ? offset : 0;
    const end = limit && limit > 0 ? start + limit : undefined;
    return events.slice(start, end);
  }

  // getEventDetail(eventId): Event
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find(e => e.id === eventId) || null;
    return event;
  }

  // registerForEvent(...): { success, registration, message }
  registerForEvent(eventId, firstName, lastName, email, attendanceType) {
    const events = this._getFromStorage('events');
    const registrations = this._getFromStorage('event_registrations');

    const event = events.find(e => e.id === eventId);
    if (!event) {
      return { success: false, registration: null, message: 'Event not found' };
    }

    const allowedTypes = ['in_person', 'virtual', 'hybrid', 'unspecified'];
    const type = allowedTypes.includes(attendanceType) ? attendanceType : 'unspecified';

    const registration = {
      id: this._generateId('evtreg'),
      eventId,
      firstName,
      lastName,
      email,
      attendanceType: type,
      registrationDate: this._nowIso()
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    return { success: true, registration, message: 'Event registration completed' };
  }

  // getFunds(): Fund[]
  getFunds() {
    const funds = this._getFromStorage('funds');
    return funds.filter(f => f.isActive !== false);
  }

  // createDonation(...): { success, donationId, paymentStatus, message }
  createDonation(
    fundId,
    amount,
    currency,
    giftFrequency,
    donorFirstName,
    donorLastName,
    donorEmail,
    streetAddress,
    city,
    state,
    postalCode,
    country,
    subscribeEmailNewsletter,
    allowTextUpdates,
    allowPhoneCalls,
    cardNumber,
    cardExpirationMonth,
    cardExpirationYear,
    cardSecurityCode
  ) {
    const funds = this._getFromStorage('funds');
    const donations = this._getFromStorage('donations');

    const fund = funds.find(f => f.id === fundId && f.isActive !== false);
    if (!fund) {
      return {
        success: false,
        donationId: null,
        paymentStatus: 'failed',
        message: 'Selected fund not found or inactive'
      };
    }

    const donationId = this._generateId('don');
    const paymentStatus = cardNumber ? 'succeeded' : 'failed';

    const donation = {
      id: donationId,
      fundId,
      amount,
      currency: currency || 'USD',
      giftFrequency,
      donorFirstName,
      donorLastName,
      donorEmail,
      streetAddress,
      city,
      state,
      postalCode,
      country: country || 'US',
      subscribeEmailNewsletter: !!subscribeEmailNewsletter,
      allowTextUpdates: !!allowTextUpdates,
      allowPhoneCalls: !!allowPhoneCalls,
      cardNumber,
      cardExpirationMonth,
      cardExpirationYear,
      cardSecurityCode,
      paymentStatus,
      createdAt: this._nowIso()
    };

    donations.push(donation);
    this._saveToStorage('donations', donations);

    const message =
      paymentStatus === 'succeeded' ? 'Donation completed successfully' : 'Donation failed';

    return {
      success: paymentStatus === 'succeeded',
      donationId,
      paymentStatus,
      message
    };
  }

  // getDirectoryFilterOptions(): { industries, graduationYearRange }
  getDirectoryFilterOptions() {
    const industries = this._getFromStorage('industries').filter(i => i.isActive !== false);
    const profiles = this._getFromStorage('alumni_profiles');

    let minYear = null;
    let maxYear = null;
    profiles.forEach(p => {
      if (typeof p.graduationYear === 'number') {
        if (minYear === null || p.graduationYear < minYear) minYear = p.graduationYear;
        if (maxYear === null || p.graduationYear > maxYear) maxYear = p.graduationYear;
      }
    });

    const currentYear = new Date().getFullYear();
    if (minYear === null) minYear = currentYear - 80;
    if (maxYear === null) maxYear = currentYear;

    return {
      industries,
      graduationYearRange: { minYear, maxYear }
    };
  }

  // searchAlumniProfiles(...): AlumniProfile[] (with industry & interestAreas resolved)
  searchAlumniProfiles(
    industryId,
    graduationYearFrom,
    graduationYearTo,
    city,
    state,
    keyword,
    sortBy,
    limit,
    offset
  ) {
    let profiles = this._getFromStorage('alumni_profiles');

    if (industryId) {
      profiles = profiles.filter(p => p.industryId === industryId);
    }

    if (typeof graduationYearFrom === 'number') {
      profiles = profiles.filter(p => typeof p.graduationYear === 'number' && p.graduationYear >= graduationYearFrom);
    }

    if (typeof graduationYearTo === 'number') {
      profiles = profiles.filter(p => typeof p.graduationYear === 'number' && p.graduationYear <= graduationYearTo);
    }

    if (city) {
      const c = String(city).toLowerCase();
      profiles = profiles.filter(p => {
        const currentCity = (p.currentCity || '').toLowerCase();
        const preferredCity = (p.preferredCity || '').toLowerCase();
        return currentCity === c || preferredCity === c;
      });
    }

    if (state) {
      const s = String(state).toLowerCase();
      profiles = profiles.filter(p => (p.currentState || '').toLowerCase() === s);
    }

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      profiles = profiles.filter(p => {
        const fn = (p.firstName || '').toLowerCase();
        const ln = (p.lastName || '').toLowerCase();
        const employer = (p.employer || '').toLowerCase();
        const title = (p.jobTitle || '').toLowerCase();
        const major = (p.major || '').toLowerCase();
        return (
          fn.includes(kw) ||
          ln.includes(kw) ||
          employer.includes(kw) ||
          title.includes(kw) ||
          major.includes(kw)
        );
      });
    }

    if (sortBy === 'last_name_desc') {
      profiles.sort((a, b) => (b.lastName || '').localeCompare(a.lastName || ''));
    } else if (sortBy === 'graduation_year_desc') {
      profiles.sort((a, b) => (b.graduationYear || 0) - (a.graduationYear || 0));
    } else if (sortBy === 'last_name_asc') {
      profiles.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
    }

    const start = offset && offset > 0 ? offset : 0;
    const end = limit && limit > 0 ? start + limit : undefined;
    const sliced = profiles.slice(start, end);

    return sliced.map(p => this._resolveAlumniProfileRelations(p));
  }

  // getAlumniProfileDetail(alumniProfileId): { profile, industry, interestAreas }
  getAlumniProfileDetail(alumniProfileId) {
    const profiles = this._getFromStorage('alumni_profiles');
    const profile = profiles.find(p => p.id === alumniProfileId) || null;
    if (!profile) {
      return { profile: null, industry: null, interestAreas: [] };
    }
    const resolved = this._resolveAlumniProfileRelations(profile);
    return {
      profile,
      industry: resolved.industry,
      interestAreas: resolved.interestAreas
    };
  }

  // sendConnectionMessage(...): { success, connectionMessage, message }
  sendConnectionMessage(
    recipientAlumniProfileId,
    senderFirstName,
    senderLastName,
    senderEmail,
    senderClassYear,
    messageBody
  ) {
    const profiles = this._getFromStorage('alumni_profiles');
    const messages = this._getFromStorage('connection_messages');

    const recipient = profiles.find(p => p.id === recipientAlumniProfileId);
    if (!recipient) {
      return {
        success: false,
        connectionMessage: null,
        message: 'Recipient alumni profile not found'
      };
    }

    const connectionMessage = {
      id: this._generateId('connmsg'),
      recipientAlumniProfileId,
      senderFirstName,
      senderLastName,
      senderEmail: senderEmail || null,
      senderClassYear: typeof senderClassYear === 'number' ? senderClassYear : null,
      messageBody,
      sentAt: this._nowIso(),
      status: 'sent'
    };

    messages.push(connectionMessage);
    this._saveToStorage('connection_messages', messages);

    return { success: true, connectionMessage, message: 'Connection message sent' };
  }

  // getChapterFilterOptions(): { states, regions }
  getChapterFilterOptions() {
    const chapters = this._getFromStorage('chapters').filter(c => c.isActive !== false);

    const stateMap = new Map();
    const regionsSet = new Set();

    chapters.forEach(ch => {
      if (ch.state) {
        const code = ch.state;
        if (!stateMap.has(code)) {
          stateMap.set(code, { code, name: code, chapterCount: 0 });
        }
        const entry = stateMap.get(code);
        entry.chapterCount += 1;
      }
      if (ch.region) {
        regionsSet.add(ch.region);
      }
    });

    return {
      states: Array.from(stateMap.values()),
      regions: Array.from(regionsSet)
    };
  }

  // listChapters(...): Chapter[]
  listChapters(state, region, keyword, sortBy) {
    let chapters = this._getFromStorage('chapters').filter(c => c.isActive !== false);

    if (state) {
      const s = String(state).toLowerCase();
      chapters = chapters.filter(c => (c.state || '').toLowerCase() === s);
    }

    if (region) {
      const r = String(region).toLowerCase();
      chapters = chapters.filter(c => (c.region || '').toLowerCase() === r);
    }

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      chapters = chapters.filter(c => {
        const name = (c.name || '').toLowerCase();
        const city = (c.city || '').toLowerCase();
        return name.includes(kw) || city.includes(kw);
      });
    }

    if (sortBy === 'name_desc') {
      chapters.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (sortBy === 'name_asc') {
      chapters.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return chapters;
  }

  // getChapterDetail(chapterId): { chapter, committees, upcomingEvents }
  getChapterDetail(chapterId) {
    const chapters = this._getFromStorage('chapters');
    const committeesRaw = this._getFromStorage('volunteer_committees');
    const events = this._getFromStorage('events');

    const chapter = chapters.find(c => c.id === chapterId) || null;
    if (!chapter) {
      return { chapter: null, committees: [], upcomingEvents: [] };
    }

    const committees = committeesRaw
      .filter(vc => vc.chapterId === chapterId && vc.isActive !== false)
      .map(vc => this._resolveCommitteeRelations(vc));

    const now = new Date();
    const upcomingEvents = events
      .filter(e => {
        const d = this._parseDate(e.startDateTime);
        if (!d || d < now) return false;
        if (chapter.city && e.city && e.city === chapter.city) {
          if (!chapter.state || !e.state || chapter.state === e.state) return true;
        }
        return false;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return da - db;
      });

    return { chapter, committees, upcomingEvents };
  }

  // joinChapter(...): { success, membership, message }
  joinChapter(chapterId, firstName, lastName, email, graduationYear, committeeIds) {
    const chapters = this._getFromStorage('chapters');
    const committees = this._getFromStorage('volunteer_committees');
    const memberships = this._getFromStorage('chapter_memberships');

    const chapter = chapters.find(c => c.id === chapterId && c.isActive !== false);
    if (!chapter) {
      return { success: false, membership: null, message: 'Chapter not found or inactive' };
    }

    let validCommitteeIds = [];
    if (Array.isArray(committeeIds) && committeeIds.length > 0) {
      const chapterCommitteeIds = committees
        .filter(vc => vc.chapterId === chapterId && vc.isActive !== false)
        .map(vc => vc.id);
      validCommitteeIds = committeeIds.filter(id => chapterCommitteeIds.includes(id));
    }

    const membership = {
      id: this._generateId('chapmem'),
      chapterId,
      firstName,
      lastName,
      email,
      graduationYear,
      committeeIds: validCommitteeIds,
      joinedAt: this._nowIso()
    };

    memberships.push(membership);
    this._saveToStorage('chapter_memberships', memberships);

    return { success: true, membership, message: 'Chapter membership saved' };
  }

  // getMentoringOptions(): { fieldsOfStudy, mentoringTopics, audiences, availabilityTimeOfDayValues }
  getMentoringOptions() {
    const fieldsOfStudy = this._getFromStorage('fields_of_study').filter(f => f.isActive !== false);
    const mentoringTopics = this._getFromStorage('mentoring_topics').filter(t => t.isActive !== false);
    const audiences = this._getFromStorage('mentoring_audience_options').filter(a => a.isActive !== false);
    const availabilityTimeOfDayValues = ['mornings', 'afternoons', 'evenings', 'weekends', 'flexible'];

    return { fieldsOfStudy, mentoringTopics, audiences, availabilityTimeOfDayValues };
  }

  // createMentorProfile(...): { success, mentorProfile, message }
  createMentorProfile(
    firstName,
    lastName,
    email,
    classYear,
    fieldOfStudyId,
    audienceCodes,
    mentoringTopicIds,
    availabilityTimeOfDay,
    availabilityHoursPerMonth,
    bio
  ) {
    const fieldsOfStudy = this._getFromStorage('fields_of_study');
    const topics = this._getFromStorage('mentoring_topics');
    const audiences = this._getFromStorage('mentoring_audience_options');
    const mentorProfiles = this._getFromStorage('mentor_profiles');

    const field = fieldsOfStudy.find(f => f.id === fieldOfStudyId && f.isActive !== false);
    if (!field) {
      return { success: false, mentorProfile: null, message: 'Field of study not found or inactive' };
    }

    const allowedAudienceCodes = audiences.filter(a => a.isActive !== false).map(a => a.code);
    const filteredAudienceCodes = Array.isArray(audienceCodes)
      ? audienceCodes.filter(code => allowedAudienceCodes.includes(code))
      : [];

    const allowedTopicIds = topics.filter(t => t.isActive !== false).map(t => t.id);
    const filteredTopicIds = Array.isArray(mentoringTopicIds)
      ? mentoringTopicIds.filter(id => allowedTopicIds.includes(id))
      : [];

    const availabilityValues = ['mornings', 'afternoons', 'evenings', 'weekends', 'flexible'];
    const availability = availabilityValues.includes(availabilityTimeOfDay)
      ? availabilityTimeOfDay
      : 'flexible';

    const mentorProfile = {
      id: this._generateId('mentor'),
      firstName,
      lastName,
      email,
      classYear: typeof classYear === 'number' ? classYear : null,
      fieldOfStudyId,
      audienceCodes: filteredAudienceCodes,
      mentoringTopicIds: filteredTopicIds,
      availabilityTimeOfDay: availability,
      availabilityHoursPerMonth,
      bio,
      createdAt: this._nowIso()
    };

    mentorProfiles.push(mentorProfile);
    this._saveToStorage('mentor_profiles', mentorProfiles);

    return { success: true, mentorProfile, message: 'Mentor profile created' };
  }

  // getJobFilterOptions(): { levels, postedDatePresets }
  getJobFilterOptions() {
    const levels = [
      { value: 'internship', label: 'Internship' },
      { value: 'entry_level', label: 'Entry level' },
      { value: 'mid_level', label: 'Mid level' },
      { value: 'senior_level', label: 'Senior level' },
      { value: 'executive', label: 'Executive' }
    ];

    const postedDatePresets = [
      { code: 'last_7_days', label: 'Last 7 days', daysBack: 7 },
      { code: 'last_30_days', label: 'Last 30 days', daysBack: 30 },
      { code: 'last_90_days', label: 'Last 90 days', daysBack: 90 }
    ];

    return { levels, postedDatePresets };
  }

  // searchJobs(...): Job[]
  searchJobs(
    keyword,
    level,
    isRemoteOnly,
    postedDatePreset,
    postedDateFrom,
    postedDateTo,
    minSalary,
    sortBy,
    limit,
    offset
  ) {
    let jobs = this._getFromStorage('jobs').filter(j => j.isActive !== false);

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      jobs = jobs.filter(j => {
        const title = (j.title || '').toLowerCase();
        const company = (j.companyName || '').toLowerCase();
        const desc = (j.description || '').toLowerCase();
        const category = (j.category || '').toLowerCase();
        const dept = (j.department || '').toLowerCase();
        return (
          title.includes(kw) ||
          company.includes(kw) ||
          desc.includes(kw) ||
          category.includes(kw) ||
          dept.includes(kw)
        );
      });
    }

    if (level) {
      jobs = jobs.filter(j => j.level === level);
    }

    if (isRemoteOnly) {
      jobs = jobs.filter(j => j.isRemote === true);
    }

    let from = null;
    let to = null;

    if (postedDatePreset) {
      if (postedDatePreset === 'last_7_days') {
        const range = this._getPostedDateRangePreset(7);
        from = range.from;
        to = range.to;
      } else if (postedDatePreset === 'last_30_days') {
        const range = this._getPostedDateRangePreset(30);
        from = range.from;
        to = range.to;
      } else if (postedDatePreset === 'last_90_days') {
        const range = this._getPostedDateRangePreset(90);
        from = range.from;
        to = range.to;
      }
    }

    if (postedDateFrom) {
      from = this._parseDate(postedDateFrom);
    }

    if (postedDateTo) {
      to = this._parseDate(postedDateTo);
    }

    if (from || to) {
      jobs = jobs.filter(j => {
        const d = this._parseDate(j.postedDate);
        if (!d) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }

    if (typeof minSalary === 'number') {
      jobs = jobs.filter(j => {
        const salaryMin = typeof j.salaryMin === 'number' ? j.salaryMin : 0;
        const salaryMax = typeof j.salaryMax === 'number' ? j.salaryMax : salaryMin;
        return salaryMax >= minSalary;
      });
    }

    if (sortBy === 'salary_desc') {
      jobs.sort((a, b) => {
        const sa = typeof a.salaryMax === 'number' ? a.salaryMax : a.salaryMin || 0;
        const sb = typeof b.salaryMax === 'number' ? b.salaryMax : b.salaryMin || 0;
        return sb - sa;
      });
    } else if (sortBy === 'salary_asc') {
      jobs.sort((a, b) => {
        const sa = typeof a.salaryMin === 'number' ? a.salaryMin : a.salaryMax || 0;
        const sb = typeof b.salaryMin === 'number' ? b.salaryMin : b.salaryMax || 0;
        return sa - sb;
      });
    } else if (sortBy === 'posted_date_desc') {
      jobs.sort((a, b) => {
        const da = this._parseDate(a.postedDate) || new Date(0);
        const db = this._parseDate(b.postedDate) || new Date(0);
        return db - da;
      });
    }

    const start = offset && offset > 0 ? offset : 0;
    const end = limit && limit > 0 ? start + limit : undefined;
    return jobs.slice(start, end);
  }

  // getJobDetail(jobId): Job
  getJobDetail(jobId) {
    const jobs = this._getFromStorage('jobs');
    return jobs.find(j => j.id === jobId) || null;
  }

  // saveJob(jobId): { success, savedJob, message }
  saveJob(jobId) {
    const jobs = this._getFromStorage('jobs');
    const savedJobs = this._getFromStorage('saved_jobs');

    const job = jobs.find(j => j.id === jobId && j.isActive !== false);
    if (!job) {
      return { success: false, savedJob: null, message: 'Job not found or inactive' };
    }

    // prevent duplicates
    const existing = savedJobs.find(sj => sj.jobId === jobId);
    if (existing) {
      return { success: true, savedJob: existing, message: 'Job already saved' };
    }

    const savedJob = {
      id: this._generateId('savedjob'),
      jobId,
      savedAt: this._nowIso()
    };

    savedJobs.push(savedJob);
    this._saveToStorage('saved_jobs', savedJobs);

    return { success: true, savedJob, message: 'Job saved' };
  }

  // getStoreNavigation(): { categories, subcategories }
  getStoreNavigation() {
    const categories = this._getFromStorage('product_categories').filter(c => c.isActive !== false);
    const subcategoriesRaw = this._getFromStorage('product_subcategories').filter(sc => sc.isActive !== false);

    const subcategories = subcategoriesRaw.map(sc => this._resolveSubcategoryRelations(sc));

    return { categories, subcategories };
  }

  // getProductFilterOptions(categoryId?, subcategoryId?): { priceRanges, colors, sizes }
  getProductFilterOptions(categoryId, subcategoryId) {
    let products = this._getFromStorage('products').filter(p => p.isActive !== false);

    if (categoryId) {
      products = products.filter(p => p.categoryId === categoryId);
    }

    if (subcategoryId) {
      products = products.filter(p => p.subcategoryId === subcategoryId);
    }

    if (products.length === 0) {
      return { priceRanges: [], colors: [], sizes: [] };
    }

    let minPrice = null;
    let maxPrice = null;
    const colorsSet = new Set();
    const sizesSet = new Set();

    products.forEach(p => {
      const price = Number(p.price || 0);
      if (minPrice === null || price < minPrice) minPrice = price;
      if (maxPrice === null || price > maxPrice) maxPrice = price;
      if (Array.isArray(p.colorOptions)) {
        p.colorOptions.forEach(c => colorsSet.add(c));
      }
      if (Array.isArray(p.sizeOptions)) {
        p.sizeOptions.forEach(s => sizesSet.add(s));
      }
    });

    const priceRanges = [
      {
        label: 'All',
        min: minPrice,
        max: maxPrice
      }
    ];

    return {
      priceRanges,
      colors: Array.from(colorsSet),
      sizes: Array.from(sizesSet)
    };
  }

  // searchProducts(...): Product[] with category & subcategory resolved
  searchProducts(
    keyword,
    categoryId,
    subcategoryId,
    minPrice,
    maxPrice,
    colors,
    sizes,
    sortBy,
    limit,
    offset
  ) {
    let products = this._getFromStorage('products').filter(p => p.isActive !== false);

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      products = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return name.includes(kw) || desc.includes(kw);
      });
    }

    if (categoryId) {
      products = products.filter(p => p.categoryId === categoryId);
    }

    if (subcategoryId) {
      products = products.filter(p => p.subcategoryId === subcategoryId);
    }

    if (typeof minPrice === 'number') {
      products = products.filter(p => Number(p.price || 0) >= minPrice);
    }

    if (typeof maxPrice === 'number') {
      products = products.filter(p => Number(p.price || 0) <= maxPrice);
    }

    if (Array.isArray(colors) && colors.length > 0) {
      const colorSet = new Set(colors.map(c => String(c).toLowerCase()));
      products = products.filter(p => {
        if (!Array.isArray(p.colorOptions) || p.colorOptions.length === 0) return false;
        return p.colorOptions.some(c => colorSet.has(String(c).toLowerCase()));
      });
    }

    if (Array.isArray(sizes) && sizes.length > 0) {
      const sizeSet = new Set(sizes.map(s => String(s)));
      products = products.filter(p => {
        if (!Array.isArray(p.sizeOptions) || p.sizeOptions.length === 0) return false;
        return p.sizeOptions.some(s => sizeSet.has(String(s)));
      });
    }

    if (sortBy === 'price_desc') {
      products.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === 'name_asc') {
      products.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'price_asc') {
      products.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }

    const start = offset && offset > 0 ? offset : 0;
    const end = limit && limit > 0 ? start + limit : undefined;
    const slice = products.slice(start, end);

    return slice.map(p => this._resolveProductRelations(p));
  }

  // getProductDetail(productId): Product with category & subcategory resolved
  getProductDetail(productId) {
    const products = this._getFromStorage('products');
    const product = products.find(p => p.id === productId) || null;
    if (!product) return null;
    return this._resolveProductRelations(product);
  }

  // addToCart(productId, quantity = 1, selectedColor?, selectedSize?): { success, cart, items, message }
  addToCart(productId, quantity = 1, selectedColor, selectedSize) {
    const products = this._getFromStorage('products');
    const cartItems = this._getFromStorage('cart_items');

    const product = products.find(p => p.id === productId && p.isActive !== false);
    if (!product) {
      return { success: false, cart: null, items: [], message: 'Product not found or inactive' };
    }

    const cart = this._getOrCreateCart();

    let qty = Number(quantity) || 1;
    if (qty < 1) qty = 1;

    let existing = cartItems.find(
      ci =>
        ci.cartId === cart.id &&
        ci.productId === productId &&
        ci.selectedColor === (selectedColor || null) &&
        ci.selectedSize === (selectedSize || null)
    );

    if (existing) {
      existing.quantity += qty;
      existing.totalPrice = Number(existing.unitPrice || 0) * existing.quantity;
    } else {
      existing = {
        id: this._generateId('cartitem'),
        cartId: cart.id,
        productId: product.id,
        productName: product.name,
        unitPrice: Number(product.price || 0),
        quantity: qty,
        selectedColor: selectedColor || null,
        selectedSize: selectedSize || null,
        totalPrice: Number(product.price || 0) * qty
      };
      cartItems.push(existing);
    }

    cart.updatedAt = this._nowIso();

    this._saveToStorage('cart_items', cartItems);
    const carts = this._getFromStorage('carts');
    const idx = carts.findIndex(c => c.id === cart.id);
    if (idx >= 0) {
      carts[idx] = cart;
      this._saveToStorage('carts', carts);
    }

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    const resolvedItems = this._resolveCartItems(itemsForCart);
    const totals = this._calculateCartTotals(cart, itemsForCart);

    return { success: true, cart, items: resolvedItems, totals, message: 'Item added to cart' };
  }

  // getCart(): { cart, items, totals }
  getCart() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    const resolvedItems = this._resolveCartItems(itemsForCart);
    const totals = this._calculateCartTotals(cart, itemsForCart);
    return { cart, items: resolvedItems, totals };
  }

  // updateCartItem(cartItemId, quantity, selectedColor?, selectedSize?): { cart, items, totals }
  updateCartItem(cartItemId, quantity, selectedColor, selectedSize) {
    const cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIndex === -1) {
      return this.getCart();
    }

    const item = cartItems[itemIndex];
    let qty = Number(quantity) || 0;
    if (qty <= 0) {
      const cartId = item.cartId;
      cartItems.splice(itemIndex, 1);
      this._saveToStorage('cart_items', cartItems);
      const carts = this._getFromStorage('carts');
      const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();
      const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
      const resolvedItems = this._resolveCartItems(itemsForCart);
      const totals = this._calculateCartTotals(cart, itemsForCart);
      return { cart, items: resolvedItems, totals };
    }

    item.quantity = qty;
    if (typeof selectedColor !== 'undefined') {
      item.selectedColor = selectedColor;
    }
    if (typeof selectedSize !== 'undefined') {
      item.selectedSize = selectedSize;
    }
    item.totalPrice = Number(item.unitPrice || 0) * item.quantity;

    cartItems[itemIndex] = item;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === item.cartId) || this._getOrCreateCart();

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    const resolvedItems = this._resolveCartItems(itemsForCart);
    const totals = this._calculateCartTotals(cart, itemsForCart);

    return { cart, items: resolvedItems, totals };
  }

  // removeCartItem(cartItemId): { cart, items, totals }
  removeCartItem(cartItemId) {
    const cartItems = this._getFromStorage('cart_items');
    const itemIndex = cartItems.findIndex(ci => ci.id === cartItemId);
    if (itemIndex === -1) {
      return this.getCart();
    }

    const cartId = cartItems[itemIndex].cartId;
    cartItems.splice(itemIndex, 1);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find(c => c.id === cartId) || this._getOrCreateCart();

    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    const resolvedItems = this._resolveCartItems(itemsForCart);
    const totals = this._calculateCartTotals(cart, itemsForCart);

    return { cart, items: resolvedItems, totals };
  }

  // startCheckout(): { success, checkoutSession, cart, items, totals, message }
  startCheckout() {
    const cart = this._getOrCreateCart();
    const cartItems = this._getFromStorage('cart_items');
    const itemsForCart = cartItems.filter(ci => ci.cartId === cart.id);
    const resolvedItems = this._resolveCartItems(itemsForCart);
    const totals = this._calculateCartTotals(cart, itemsForCart);
    const checkoutSession = this._getActiveCheckoutSession(cart.id);

    return {
      success: true,
      checkoutSession,
      cart,
      items: resolvedItems,
      totals,
      message: 'Checkout started'
    };
  }

  // getClassNotesFilterOptions(): { classYears, categories }
  getClassNotesFilterOptions() {
    const notes = this._getFromStorage('class_notes');
    const yearSet = new Set();
    notes.forEach(n => {
      if (typeof n.classYear === 'number') yearSet.add(n.classYear);
    });

    const categories = [
      { value: 'career_update', label: 'Career update' },
      { value: 'personal_milestone', label: 'Personal milestone' },
      { value: 'family_news', label: 'Family news' },
      { value: 'obituary', label: 'Obituary' },
      { value: 'reunion', label: 'Reunion' },
      { value: 'other', label: 'Other' }
    ];

    const classYears = Array.from(yearSet).sort((a, b) => a - b);
    return { classYears, categories };
  }

  // listClassNotes(...): ClassNote[]
  listClassNotes(
    keyword,
    classYear,
    category,
    city,
    state,
    visibility,
    limit,
    offset
  ) {
    let notes = this._getFromStorage('class_notes');

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      notes = notes.filter(n => {
        const title = (n.title || '').toLowerCase();
        const content = (n.content || '').toLowerCase();
        return title.includes(kw) || content.includes(kw);
      });
    }

    if (typeof classYear === 'number') {
      notes = notes.filter(n => n.classYear === classYear);
    }

    if (category) {
      notes = notes.filter(n => n.category === category);
    }

    if (city) {
      const c = String(city).toLowerCase();
      notes = notes.filter(n => (n.city || '').toLowerCase() === c);
    }

    if (state) {
      const s = String(state).toLowerCase();
      notes = notes.filter(n => (n.state || '').toLowerCase() === s);
    }

    if (visibility) {
      notes = notes.filter(n => n.visibility === visibility);
    }

    notes.sort((a, b) => {
      const da = this._parseDate(a.createdAt) || new Date(0);
      const db = this._parseDate(b.createdAt) || new Date(0);
      return db - da;
    });

    const start = offset && offset > 0 ? offset : 0;
    const end = limit && limit > 0 ? start + limit : undefined;
    return notes.slice(start, end);
  }

  // submitClassNote(...): { success, note, message }
  submitClassNote(
    title,
    content,
    classYear,
    city,
    state,
    category,
    visibility,
    authorName,
    authorEmail
  ) {
    const notes = this._getFromStorage('class_notes');

    const note = {
      id: this._generateId('note'),
      title,
      content,
      classYear,
      city: city || null,
      state: state || null,
      category,
      visibility,
      authorName: authorName || null,
      authorEmail: authorEmail || null,
      createdAt: this._nowIso(),
      status: 'pending_review'
    };

    notes.push(note);
    this._saveToStorage('class_notes', notes);

    return { success: true, note, message: 'Class note submitted' };
  }

  // getVolunteerFilterOptions(): { months, minTimeCommitmentOptions }
  getVolunteerFilterOptions() {
    const opps = this._getFromStorage('volunteer_opportunities').filter(o => o.isActive !== false);

    const monthMap = new Map();
    const timeSet = new Set();

    opps.forEach(o => {
      const d = this._parseDate(o.startDate);
      if (d) {
        const year = d.getFullYear();
        const month = d.getMonth() + 1; // 1-12
        const key = year + '-' + month;
        if (!monthMap.has(key)) {
          const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
          monthMap.set(key, { year, month, label });
        }
      }
      if (typeof o.minTimeCommitmentHours === 'number') {
        timeSet.add(o.minTimeCommitmentHours);
      }
    });

    const months = Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const minTimeCommitmentOptions = Array.from(timeSet)
      .sort((a, b) => a - b)
      .map(v => ({ value: v, label: v + ' hours' }));

    return { months, minTimeCommitmentOptions };
  }

  // searchVolunteerOpportunities(...): VolunteerOpportunity[]
  searchVolunteerOpportunities(keyword, year, month, minTimeCommitmentHours, tags) {
    let opps = this._getFromStorage('volunteer_opportunities').filter(o => o.isActive !== false);

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      opps = opps.filter(o => {
        const title = (o.title || '').toLowerCase();
        const desc = (o.description || '').toLowerCase();
        const t = Array.isArray(o.tags) ? o.tags.join(' ').toLowerCase() : '';
        return title.includes(kw) || desc.includes(kw) || t.includes(kw);
      });
    }

    if (typeof year === 'number') {
      opps = opps.filter(o => {
        const d = this._parseDate(o.startDate);
        return d && d.getFullYear() === year;
      });
    }

    if (typeof month === 'number') {
      opps = opps.filter(o => {
        const d = this._parseDate(o.startDate);
        return d && d.getMonth() + 1 === month;
      });
    }

    if (typeof minTimeCommitmentHours === 'number') {
      opps = opps.filter(o => {
        const v = typeof o.minTimeCommitmentHours === 'number' ? o.minTimeCommitmentHours : 0;
        return v >= minTimeCommitmentHours;
      });
    }

    if (Array.isArray(tags) && tags.length > 0) {
      const tagSet = new Set(tags.map(t => String(t).toLowerCase()));
      opps = opps.filter(o => {
        if (!Array.isArray(o.tags) || o.tags.length === 0) return false;
        return o.tags.some(t => tagSet.has(String(t).toLowerCase()));
      });
    }

    return opps;
  }

  // getVolunteerOpportunityDetail(opportunityId): { opportunity, shifts }
  getVolunteerOpportunityDetail(opportunityId) {
    const opps = this._getFromStorage('volunteer_opportunities');
    const shiftsRaw = this._getFromStorage('volunteer_shifts');

    const opportunity = opps.find(o => o.id === opportunityId) || null;
    if (!opportunity) {
      return { opportunity: null, shifts: [] };
    }

    const shifts = shiftsRaw
      .filter(s => s.opportunityId === opportunityId)
      .map(s => this._resolveVolunteerShiftRelations(s));

    return { opportunity, shifts };
  }

  // signUpForVolunteerShift(...): { success, signup, message }
  signUpForVolunteerShift(opportunityId, shiftId, firstName, lastName, email, phone) {
    const opps = this._getFromStorage('volunteer_opportunities');
    const shifts = this._getFromStorage('volunteer_shifts');
    const signups = this._getFromStorage('volunteer_signups');

    const opportunity = opps.find(o => o.id === opportunityId);
    if (!opportunity) {
      return { success: false, signup: null, message: 'Volunteer opportunity not found' };
    }

    const shift = shifts.find(s => s.id === shiftId && s.opportunityId === opportunityId);
    if (!shift) {
      return { success: false, signup: null, message: 'Volunteer shift not found' };
    }

    if (shift.isFull) {
      return { success: false, signup: null, message: 'Shift is full' };
    }

    const signup = {
      id: this._generateId('volsignup'),
      opportunityId,
      shiftId,
      firstName,
      lastName,
      email,
      phone,
      signupDate: this._nowIso(),
      status: 'confirmed'
    };

    signups.push(signup);
    this._saveToStorage('volunteer_signups', signups);

    return { success: true, signup, message: 'Volunteer shift signup completed' };
  }

  // getAboutContent(): { mission, history, keyProgramsSummary, contactEmail, contactPhone, policySections }
  getAboutContent() {
    const data = this._getFromStorage('about_content', null);
    if (!data) {
      return {
        mission: '',
        history: '',
        keyProgramsSummary: '',
        contactEmail: '',
        contactPhone: '',
        policySections: []
      };
    }
    return data;
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