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
    const collections = [
      'regions',
      'countries',
      'programs',
      'donations',
      'recurring_donation_schedules',
      'volunteer_opportunities',
      'volunteer_registrations',
      'children',
      'sponsorship_commitments',
      'fundraising_events',
      'event_registrations',
      'event_participants',
      'fundraising_campaigns',
      'personal_fundraising_pages',
      'info_kit_requests',
      'advocacy_topics',
      'representatives',
      'advocacy_letters',
      'programs_page_view_preferences',
      'contact_form_submissions',
      'faq_entries'
    ];
    for (const key of collections) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue) {
    const raw = localStorage.getItem(key);
    if (!raw) {
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

  // Helper: ensure a collection key exists and return its array
  _ensureCollection(key) {
    const raw = localStorage.getItem(key);
    if (!raw) {
      this._saveToStorage(key, []);
      return [];
    }
    return this._getFromStorage(key, []);
  }

  // Helper: detect card brand from card number (very simplified)
  _detectCardBrand(cardNumber) {
    if (!cardNumber) return 'other';
    const trimmed = String(cardNumber).replace(/\s+/g, '');
    if (/^4[0-9]{6,}$/.test(trimmed)) return 'visa';
    if (/^5[1-5][0-9]{5,}$/.test(trimmed)) return 'mastercard';
    if (/^3[47][0-9]{5,}$/.test(trimmed)) return 'amex';
    if (/^6(?:011|5[0-9]{2})[0-9]{3,}$/.test(trimmed)) return 'discover';
    return 'other';
  }

  // Helper: processing fee calculation
  _calculateProcessingFee(amount, frequency, paymentMethodType) {
    const amt = Number(amount) || 0;
    if (amt <= 0) return 0;
    const method = paymentMethodType || 'credit_debit_card';
    let percent = 0;
    let fixed = 0;
    if (method === 'credit_debit_card' || method === 'paypal') {
      percent = 0.029;
      fixed = 0.30;
    } else if (method === 'bank_transfer') {
      percent = 0.01;
      fixed = 0;
    } else {
      percent = 0.03;
      fixed = 0.30;
    }
    const fee = amt * percent + fixed;
    return Math.round(fee * 100) / 100;
  }

  // Helper: next charge date for monthly gifts
  _calculateNextChargeDate(chargeDayOfMonth) {
    const today = new Date();
    const day = Math.min(Math.max(1, chargeDayOfMonth || today.getDate()), 28);
    let year = today.getFullYear();
    let month = today.getMonth();
    if (today.getDate() >= day) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    const date = new Date(Date.UTC(year, month, day, 12, 0, 0));
    return date.toISOString();
  }

  // Helper: geocode zip to coordinates (very approximate, limited set)
  _geocodeZipToCoordinates(zipCode) {
    if (!zipCode) return null;
    const map = {
      '94103': { lat: 37.773972, lng: -122.431297 }, // San Francisco approx
      '10001': { lat: 40.750742, lng: -73.99653 } // NYC approx
    };
    return map[zipCode] || null;
  }

  // Helper: compute distance (miles) between two lat/lng points
  _haversineDistanceMiles(lat1, lng1, lat2, lng2) {
    function toRad(v) { return (v * Math.PI) / 180; }
    const R = 3958.8; // miles
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Helper: filter and sort volunteer opportunities
  _filterAndSortVolunteerOpportunities(opportunities, options) {
    const center = this._geocodeZipToCoordinates(options.zipCode);
    const radius = Number(options.radiusMiles) || 0;
    const startDate = options.startDate ? new Date(options.startDate + 'T00:00:00Z') : null;
    const endDate = options.endDate ? new Date(options.endDate + 'T23:59:59Z') : null;
    const dayOfWeek = options.dayOfWeek ? String(options.dayOfWeek).toLowerCase() : null;
    const needLevel = options.needLevel || null;
    const activityType = options.activityType || null;
    const sortBy = options.sortBy || 'date_asc';

    const cloned = opportunities.map(o => ({ ...o }));
    const needRank = { low: 1, medium: 2, high: 3 };

    const filtered = cloned.filter(o => {
      if (startDate || endDate) {
        const start = new Date(o.startDateTime);
        if (startDate && start < startDate) return false;
        if (endDate && start > endDate) return false;
      }
      if (dayOfWeek) {
        const start = new Date(o.startDateTime);
        const dow = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][start.getUTCDay()];
        if (dow !== dayOfWeek) return false;
      }
      if (needLevel && o.needLevel !== needLevel) return false;
      if (activityType && o.activityType !== activityType) return false;
      if (center && typeof o.latitude === 'number' && typeof o.longitude === 'number' && radius > 0) {
        const dist = this._haversineDistanceMiles(center.lat, center.lng, o.latitude, o.longitude);
        o._distanceMiles = dist;
        if (dist > radius) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      if (sortBy === 'need_highest') {
        const na = needRank[a.needLevel] || 0;
        const nb = needRank[b.needLevel] || 0;
        if (nb !== na) return nb - na;
      }
      if (sortBy === 'distance_asc' && center) {
        const da = typeof a._distanceMiles === 'number' ? a._distanceMiles : Number.POSITIVE_INFINITY;
        const db = typeof b._distanceMiles === 'number' ? b._distanceMiles : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
      }
      // default or fallback: date ascending
      const ta = new Date(a.startDateTime).getTime();
      const tb = new Date(b.startDateTime).getTime();
      return ta - tb;
    });

    return filtered;
  }

  // Helper: generate full URL for personal fundraising page
  _generatePersonalFundraisingPageUrl(campaign, customUrlSlug) {
    const slug = campaign && campaign.slug ? campaign.slug : 'campaign';
    const ending = customUrlSlug || 'page';
    return '/fundraise/' + slug + '/' + ending;
  }

  // Helper: update lastLinkCopiedAt for a personal fundraising page
  _updateLastLinkCopiedTimestamp(personalFundraisingPageId) {
    const pages = this._getFromStorage('personal_fundraising_pages', []);
    const idx = pages.findIndex(p => p.id === personalFundraisingPageId);
    if (idx === -1) return null;
    const timestamp = new Date().toISOString();
    pages[idx].lastLinkCopiedAt = timestamp;
    this._saveToStorage('personal_fundraising_pages', pages);
    return timestamp;
  }

  // Helper: lookup representatives for a ZIP
  _lookupRepresentativesForZip(zipCode) {
    const reps = this._getFromStorage('representatives', []);
    if (!zipCode) return [];
    return reps.filter(r => {
      if (Array.isArray(r.supportedZipCodes) && r.supportedZipCodes.includes(zipCode)) return true;
      if (r.postalCode && r.postalCode === zipCode) return true;
      return false;
    });
  }

  // Foreign key resolution helpers
  _attachProgramRelations(program) {
    if (!program) return null;
    const countries = this._getFromStorage('countries', []);
    const country = program.countryId ? countries.find(c => c.id === program.countryId) || null : null;
    return { ...program, country };
  }

  _attachDonationRelations(donation) {
    if (!donation) return null;
    const programs = this._getFromStorage('programs', []);
    const countries = this._getFromStorage('countries', []);
    const program = donation.programId ? programs.find(p => p.id === donation.programId) || null : null;
    const country = donation.countryId ? countries.find(c => c.id === donation.countryId) || null : null;
    return { ...donation, program, country };
  }

  _attachRecurringScheduleRelations(schedule) {
    if (!schedule) return null;
    const programs = this._getFromStorage('programs', []);
    const countries = this._getFromStorage('countries', []);
    const program = schedule.programId ? programs.find(p => p.id === schedule.programId) || null : null;
    const country = schedule.countryId ? countries.find(c => c.id === schedule.countryId) || null : null;
    return { ...schedule, program, country };
  }

  _attachChildRelations(child) {
    if (!child) return null;
    const countries = this._getFromStorage('countries', []);
    const country = child.countryId ? countries.find(c => c.id === child.countryId) || null : null;
    return { ...child, country };
  }

  _attachSponsorshipRelations(sponsorship) {
    if (!sponsorship) return null;
    const children = this._getFromStorage('children', []);
    const child = sponsorship.childId ? children.find(c => c.id === sponsorship.childId) || null : null;
    return { ...sponsorship, child };
  }

  _attachEventRegistrationRelations(registration) {
    if (!registration) return null;
    const events = this._getFromStorage('fundraising_events', []);
    const event = events.find(e => e.id === registration.fundraisingEventId) || null;
    return { ...registration, event };
  }

  _attachEventParticipantRelations(participant) {
    if (!participant) return null;
    const registrations = this._getFromStorage('event_registrations', []);
    const registration = registrations.find(r => r.id === participant.eventRegistrationId) || null;
    return { ...participant, registration };
  }

  _attachInfoKitRequestRelations(request) {
    if (!request) return null;
    const programs = this._getFromStorage('programs', []);
    const program = programs.find(p => p.id === request.programId) || null;
    return { ...request, program };
  }

  _attachVolunteerRegistrationRelations(registration) {
    if (!registration) return null;
    const opps = this._getFromStorage('volunteer_opportunities', []);
    const opportunity = opps.find(o => o.id === registration.volunteerOpportunityId) || null;
    return { ...registration, opportunity };
  }

  _attachPersonalFundraisingPageRelations(page) {
    if (!page) return null;
    const campaigns = this._getFromStorage('fundraising_campaigns', []);
    const campaign = campaigns.find(c => c.id === page.campaignId) || null;
    return { ...page, campaign };
  }

  _attachAdvocacyLetterRelations(letter) {
    if (!letter) return null;
    const topics = this._getFromStorage('advocacy_topics', []);
    const reps = this._getFromStorage('representatives', []);
    const topic = topics.find(t => t.id === letter.topicId) || null;
    const recipients = Array.isArray(letter.recipientIds)
      ? letter.recipientIds.map(id => reps.find(r => r.id === id) || null)
      : [];
    return { ...letter, topic, recipients };
  }

  // =========================
  // Core interface implementations
  // =========================

  // getHomePageContent
  getHomePageContent() {
    const stored = this._getFromStorage('home_page_content', null) || {};
    const missionSummary = stored.missionSummary || '';
    const impactHighlights = Array.isArray(stored.impactHighlights) ? stored.impactHighlights : [];
    const primaryCtas = Array.isArray(stored.primaryCtas) ? stored.primaryCtas : [];

    const now = new Date();
    const allOpps = this._getFromStorage('volunteer_opportunities', []);
    const urgentVolunteerOpportunities = allOpps
      .filter(o => o.needLevel === 'high' && new Date(o.startDateTime) >= now)
      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime))
      .slice(0, 3);

    const allEvents = this._getFromStorage('fundraising_events', []);
    const upcomingRunWalkEvents = allEvents
      .filter(e => e.eventType === 'run_walk' && new Date(e.eventDate) >= now)
      .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate))
      .slice(0, 3);

    const campaigns = this._getFromStorage('fundraising_campaigns', []);
    const featuredCampaigns = campaigns.filter(c => c.status === 'active').slice(0, 3);

    return {
      missionSummary,
      impactHighlights,
      primaryCtas,
      urgentVolunteerOpportunities,
      upcomingRunWalkEvents,
      featuredCampaigns
    };
  }

  // getDonatePageConfig
  getDonatePageConfig() {
    const cfg = this._getFromStorage('donate_page_config', null) || {};
    return {
      oneTimeTabLabel: cfg.oneTimeTabLabel || 'One-time donation',
      monthlyTabLabel: cfg.monthlyTabLabel || 'Monthly donation',
      currency: cfg.currency || 'USD',
      suggestedOneTimeAmounts: Array.isArray(cfg.suggestedOneTimeAmounts)
        ? cfg.suggestedOneTimeAmounts
        : [25, 50, 100],
      suggestedMonthlyAmounts: Array.isArray(cfg.suggestedMonthlyAmounts)
        ? cfg.suggestedMonthlyAmounts
        : [25, 39, 50],
      processingFeeInfo: cfg.processingFeeInfo || 'You can choose to cover standard payment processing fees.',
      smsOptInInfo: cfg.smsOptInInfo || 'Opt in to SMS to receive occasional updates about your impact.',
      monthlySchedulingInfo: cfg.monthlySchedulingInfo || 'Monthly gifts are processed on your selected day each month.'
    };
  }

  // getOneTimeDonationPrograms
  getOneTimeDonationPrograms() {
    const programs = this._getFromStorage('programs', []);
    const featured = programs.filter(p => p.isFeaturedOnDonatePage === true);
    return featured.map(p => this._attachProgramRelations(p));
  }

  // getMonthlyDonationCountryOptions
  getMonthlyDonationCountryOptions() {
    const countries = this._getFromStorage('countries', []);
    return countries
      .filter(c => c.isDonationTarget === true)
      .sort((a, b) => {
        const ao = typeof a.displayOrder === 'number' ? a.displayOrder : Number.MAX_SAFE_INTEGER;
        const bo = typeof b.displayOrder === 'number' ? b.displayOrder : Number.MAX_SAFE_INTEGER;
        if (ao !== bo) return ao - bo;
        return a.name.localeCompare(b.name);
      });
  }

  // previewDonationTotals
  previewDonationTotals(amount, coverProcessingFees, frequency, paymentMethodType) {
    const cfg = this.getDonatePageConfig();
    const baseAmount = Number(amount) || 0;
    const fee = coverProcessingFees ? this._calculateProcessingFee(baseAmount, frequency, paymentMethodType) : 0;
    const total = baseAmount + fee;
    return {
      amount: baseAmount,
      processingFeeAmount: fee,
      totalChargedAmount: Math.round(total * 100) / 100,
      currency: cfg.currency || 'USD'
    };
  }

  // submitDonation
  submitDonation(
    donationType,
    frequency,
    amount,
    currency,
    programId,
    countryId,
    coverProcessingFees,
    chargeDayOfMonth,
    smsOptIn,
    smsPhoneNumber,
    paymentMethodType,
    cardholderName,
    cardNumber,
    cardExpMonth,
    cardExpYear,
    cardCvv,
    billingAddressLine1,
    billingAddressLine2,
    billingCity,
    billingState,
    billingPostalCode,
    billingCountry,
    donorFullName,
    donorEmail
  ) {
    const baseAmount = Number(amount) || 0;
    if (!donationType || !frequency || baseAmount <= 0) {
      return { success: false, donation: null, recurringSchedule: null, message: 'Invalid donation details.', supportSummary: '' };
    }

    const fee = coverProcessingFees ? this._calculateProcessingFee(baseAmount, frequency, paymentMethodType) : 0;
    const total = Math.round((baseAmount + fee) * 100) / 100;
    const cardBrand = this._detectCardBrand(cardNumber);
    const cardLast4 = String(cardNumber || '').replace(/\s+/g, '').slice(-4);
    const createdAt = new Date().toISOString();
    const confirmationCode = 'DN' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36).toUpperCase();

    const donations = this._ensureCollection('donations');
    const donation = {
      id: this._generateId('donation'),
      programId: programId || null,
      countryId: countryId || null,
      amount: baseAmount,
      currency: currency || 'USD',
      donationType,
      frequency,
      processingFeeCovered: !!coverProcessingFees,
      processingFeeAmount: fee,
      totalChargedAmount: total,
      paymentMethodType,
      cardholderName,
      cardLast4,
      cardBrand,
      cardExpMonth: Number(cardExpMonth) || null,
      cardExpYear: Number(cardExpYear) || null,
      billingAddressLine1,
      billingAddressLine2: billingAddressLine2 || '',
      billingCity,
      billingState,
      billingPostalCode,
      billingCountry,
      donorFullName,
      donorEmail,
      createdAt,
      confirmationCode
    };
    donations.push(donation);
    this._saveToStorage('donations', donations);

    let recurringSchedule = null;
    if (frequency === 'monthly') {
      const schedules = this._ensureCollection('recurring_donation_schedules');
      const chargeDay = chargeDayOfMonth ? Number(chargeDayOfMonth) : new Date().getDate();
      const nextChargeDate = this._calculateNextChargeDate(chargeDay);
      const schedule = {
        id: this._generateId('recur'),
        countryId: countryId || null,
        programId: programId || null,
        donationType,
        amount: baseAmount,
        currency: currency || 'USD',
        frequency: 'monthly',
        chargeDayOfMonth: chargeDay,
        nextChargeDate,
        paymentMethodType,
        cardholderName,
        cardLast4,
        cardBrand,
        cardExpMonth: Number(cardExpMonth) || null,
        cardExpYear: Number(cardExpYear) || null,
        billingAddressLine1,
        billingAddressLine2: billingAddressLine2 || '',
        billingCity,
        billingState,
        billingPostalCode,
        billingCountry,
        smsOptIn: !!smsOptIn,
        smsPhoneNumber: smsOptIn ? (smsPhoneNumber || '') : '',
        status: 'active',
        createdAt
      };
      schedules.push(schedule);
      this._saveToStorage('recurring_donation_schedules', schedules);
      recurringSchedule = schedule;
    }

    const programs = this._getFromStorage('programs', []);
    const countries = this._getFromStorage('countries', []);
    let supportSummary = 'Thank you for your gift supporting our child hunger relief work.';
    if (donationType === 'program_restricted' && programId) {
      const program = programs.find(p => p.id === programId);
      if (program && program.name) {
        supportSummary = 'Thank you for your gift supporting the ' + program.name + ' program.';
      }
    } else if (donationType === 'country_targeted' && countryId) {
      const country = countries.find(c => c.id === countryId);
      if (country && country.name) {
        supportSummary = 'Thank you for your gift supporting children in ' + country.name + '.';
      }
    } else if (donationType === 'sponsorship') {
      supportSummary = 'Thank you for your sponsorship commitment to a child in need.';
    }

    return {
      success: true,
      donation: this._attachDonationRelations(donation),
      recurringSchedule: recurringSchedule ? this._attachRecurringScheduleRelations(recurringSchedule) : null,
      message: 'Donation recorded successfully.',
      supportSummary
    };
  }

  // getProgramsOverviewContent
  getProgramsOverviewContent() {
    const stored = this._getFromStorage('programs_overview_content', null) || {};
    return {
      overviewText: stored.overviewText || '',
      programAreaSummaries: Array.isArray(stored.programAreaSummaries) ? stored.programAreaSummaries : [],
      impactStats: Array.isArray(stored.impactStats) ? stored.impactStats : []
    };
  }

  // getProgramFilterOptions
  getProgramFilterOptions() {
    const regions = this._getFromStorage('regions', []);
    return {
      programTypes: [
        { code: 'school_meal_program', label: 'School Meal Programs' },
        { code: 'emergency_food_boxes', label: 'Emergency Food Boxes' },
        { code: 'maternal_nutrition', label: 'Maternal Nutrition' },
        { code: 'cash_transfers', label: 'Cash Transfers' },
        { code: 'other_program', label: 'Other Programs' }
      ],
      regions,
      minChildrenServedOptions: [1000, 5000, 10000, 50000]
    };
  }

  // searchPrograms
  searchPrograms(programType, regionCode, minChildrenServed, isSchoolMealProgram) {
    const programs = this._getFromStorage('programs', []);
    const minChildren = typeof minChildrenServed === 'number' ? minChildrenServed : null;
    const filtered = programs.filter(p => {
      if (programType && p.programType !== programType) return false;
      if (regionCode && p.regionCode !== regionCode) return false;
      if (minChildren !== null) {
        const total = typeof p.childrenServedTotal === 'number' ? p.childrenServedTotal : 0;
        if (total < minChildren) return false;
      }
      if (typeof isSchoolMealProgram === 'boolean' && p.isSchoolMealProgram !== isSchoolMealProgram) return false;
      return true;
    });
    return filtered.map(p => this._attachProgramRelations(p));
  }

  // getProgramDetails
  getProgramDetails(programId) {
    const programs = this._getFromStorage('programs', []);
    const program = programs.find(p => p.id === programId) || null;
    return this._attachProgramRelations(program);
  }

  // requestProgramInfoKit
  requestProgramInfoKit(programId, deliveryMethod, fullName, email, addressLine1, addressLine2, city, state, postalCode, country) {
    if (!programId || !deliveryMethod || !fullName || !email || !addressLine1 || !city || !state || !postalCode || !country) {
      return { infoKitRequest: null, success: false, message: 'Missing required fields.' };
    }
    const requests = this._ensureCollection('info_kit_requests');
    const infoKitRequest = {
      id: this._generateId('infokit'),
      programId,
      deliveryMethod,
      fullName,
      email,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      postalCode,
      country,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };
    requests.push(infoKitRequest);
    this._saveToStorage('info_kit_requests', requests);
    return {
      infoKitRequest: this._attachInfoKitRequestRelations(infoKitRequest),
      success: true,
      message: 'Info kit request submitted.'
    };
  }

  // getVolunteerFilterOptions
  getVolunteerFilterOptions() {
    return {
      distanceOptionsMiles: [5, 10, 20, 50, 100],
      quickDateRanges: [
        { code: 'this_week', label: 'This week' },
        { code: 'next_week', label: 'Next week' },
        { code: 'this_month', label: 'This month' },
        { code: 'next_month', label: 'Next month' }
      ],
      daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      needLevels: [
        { code: 'low', label: 'Low' },
        { code: 'medium', label: 'Medium' },
        { code: 'high', label: 'High' }
      ]
    };
  }

  // searchVolunteerOpportunities
  searchVolunteerOpportunities(zipCode, radiusMiles, startDate, endDate, dayOfWeek, needLevel, activityType, sortBy) {
    const opportunities = this._getFromStorage('volunteer_opportunities', []);
    if (!zipCode) {
      // Even without ZIP, still apply other filters and sort by date
      return this._filterAndSortVolunteerOpportunities(opportunities, {
        zipCode: null,
        radiusMiles: 0,
        startDate,
        endDate,
        dayOfWeek,
        needLevel,
        activityType,
        sortBy: sortBy || 'date_asc'
      });
    }
    return this._filterAndSortVolunteerOpportunities(opportunities, {
      zipCode,
      radiusMiles,
      startDate,
      endDate,
      dayOfWeek,
      needLevel,
      activityType,
      sortBy: sortBy || 'date_asc'
    });
  }

  // getVolunteerOpportunityDetails
  getVolunteerOpportunityDetails(volunteerOpportunityId) {
    const opportunities = this._getFromStorage('volunteer_opportunities', []);
    return opportunities.find(o => o.id === volunteerOpportunityId) || null;
  }

  // registerForVolunteerOpportunity
  registerForVolunteerOpportunity(volunteerOpportunityId, numAdultParticipants, numYouthParticipants, primaryContactName, primaryContactEmail, primaryContactPhone, comments) {
    if (!volunteerOpportunityId || !primaryContactName || !primaryContactEmail) {
      return { registration: null, success: false, message: 'Missing required fields.' };
    }
    const adults = Number(numAdultParticipants) || 0;
    const youth = Number(numYouthParticipants) || 0;
    const totalToAdd = adults + youth;
    if (totalToAdd <= 0) {
      return { registration: null, success: false, message: 'At least one participant is required.' };
    }

    const opportunities = this._getFromStorage('volunteer_opportunities', []);
    const oppIndex = opportunities.findIndex(o => o.id === volunteerOpportunityId);
    if (oppIndex === -1) {
      return { registration: null, success: false, message: 'Volunteer opportunity not found.' };
    }
    const opp = opportunities[oppIndex];
    if (typeof opp.maxVolunteers === 'number') {
      const current = Number(opp.volunteersRegistered) || 0;
      if (current + totalToAdd > opp.maxVolunteers) {
        return { registration: null, success: false, message: 'Not enough volunteer slots available.' };
      }
      opportunities[oppIndex] = { ...opp, volunteersRegistered: current + totalToAdd };
      this._saveToStorage('volunteer_opportunities', opportunities);
    }

    const regs = this._ensureCollection('volunteer_registrations');
    const registration = {
      id: this._generateId('volreg'),
      volunteerOpportunityId,
      numAdultParticipants: adults,
      numYouthParticipants: youth,
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone: primaryContactPhone || '',
      comments: comments || '',
      status: 'confirmed',
      createdAt: new Date().toISOString()
    };
    regs.push(registration);
    this._saveToStorage('volunteer_registrations', regs);
    return {
      registration: this._attachVolunteerRegistrationRelations(registration),
      success: true,
      message: 'Volunteer registration completed.'
    };
  }

  // getChildSponsorshipFilterOptions
  getChildSponsorshipFilterOptions() {
    const regions = this._getFromStorage('regions', []);
    return {
      ageRangePresets: [
        { label: 'Ages 0-5', minAge: 0, maxAge: 5 },
        { label: 'Ages 6-10', minAge: 6, maxAge: 10 },
        { label: 'Ages 11-15', minAge: 11, maxAge: 15 },
        { label: 'Ages 16-18', minAge: 16, maxAge: 18 }
      ],
      regions,
      sortOptions: [
        { code: 'longest_waiting', label: 'Longest waiting' },
        { code: 'youngest_first', label: 'Youngest first' },
        { code: 'oldest_first', label: 'Oldest first' }
      ]
    };
  }

  // searchChildrenForSponsorship
  searchChildrenForSponsorship(minAge, maxAge, regionCode, countryId, sortBy) {
    const children = this._getFromStorage('children', []);
    const minA = typeof minAge === 'number' ? minAge : null;
    const maxA = typeof maxAge === 'number' ? maxAge : null;
    const filtered = children.filter(c => {
      if (!c.isWaitingForSponsorship) return false;
      if (minA !== null && c.age < minA) return false;
      if (maxA !== null && c.age > maxA) return false;
      if (regionCode && c.regionCode !== regionCode) return false;
      if (countryId && c.countryId !== countryId) return false;
      return true;
    });

    const sorted = filtered.slice();
    if (sortBy === 'longest_waiting') {
      sorted.sort((a, b) => {
        const da = typeof a.daysWaiting === 'number' ? a.daysWaiting : 0;
        const db = typeof b.daysWaiting === 'number' ? b.daysWaiting : 0;
        return db - da;
      });
    } else if (sortBy === 'youngest_first') {
      sorted.sort((a, b) => a.age - b.age);
    } else if (sortBy === 'oldest_first') {
      sorted.sort((a, b) => b.age - a.age);
    }

    return sorted.map(c => this._attachChildRelations(c));
  }

  // getChildProfile
  getChildProfile(childId) {
    const children = this._getFromStorage('children', []);
    const child = children.find(c => c.id === childId) || null;
    return this._attachChildRelations(child);
  }

  // startChildSponsorship
  startChildSponsorship(
    childId,
    amount,
    currency,
    sponsorFullName,
    sponsorEmail,
    sponsorPhone,
    mailingAddressLine1,
    mailingAddressLine2,
    mailingCity,
    mailingState,
    mailingPostalCode,
    mailingCountry,
    paymentMethodType,
    cardholderName,
    cardNumber,
    cardExpMonth,
    cardExpYear,
    cardCvv
  ) {
    const baseAmount = Number(amount) || 0;
    if (!childId || baseAmount <= 0 || !sponsorFullName || !sponsorEmail) {
      return { sponsorshipCommitment: null, success: false, message: 'Missing required fields.' };
    }
    const children = this._getFromStorage('children', []);
    const childIndex = children.findIndex(c => c.id === childId);
    if (childIndex === -1) {
      return { sponsorshipCommitment: null, success: false, message: 'Child not found.' };
    }

    const cardBrand = this._detectCardBrand(cardNumber);
    const cardLast4 = String(cardNumber || '').replace(/\s+/g, '').slice(-4);

    const commitments = this._ensureCollection('sponsorship_commitments');
    const sponsorshipCommitment = {
      id: this._generateId('sponsor'),
      childId,
      amount: baseAmount,
      currency: currency || 'USD',
      frequency: 'monthly',
      startDate: new Date().toISOString(),
      status: 'active',
      sponsorFullName,
      sponsorEmail,
      sponsorPhone: sponsorPhone || '',
      mailingAddressLine1,
      mailingAddressLine2: mailingAddressLine2 || '',
      mailingCity,
      mailingState,
      mailingPostalCode,
      mailingCountry,
      paymentMethodType,
      cardholderName,
      cardLast4,
      cardBrand,
      cardExpMonth: Number(cardExpMonth) || null,
      cardExpYear: Number(cardExpYear) || null
    };
    commitments.push(sponsorshipCommitment);
    this._saveToStorage('sponsorship_commitments', commitments);

    // Mark child as no longer waiting
    const child = children[childIndex];
    children[childIndex] = { ...child, isWaitingForSponsorship: false };
    this._saveToStorage('children', children);

    return {
      sponsorshipCommitment: this._attachSponsorshipRelations(sponsorshipCommitment),
      success: true,
      message: 'Sponsorship started successfully.'
    };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const events = this._getFromStorage('fundraising_events', []);
    const citiesSet = new Set();
    events.forEach(e => { if (e.city) citiesSet.add(e.city); });
    return {
      eventTypes: [
        { code: 'run_walk', label: 'Run/Walk' },
        { code: 'gala', label: 'Gala' },
        { code: 'community_event', label: 'Community Event' },
        { code: 'virtual_event', label: 'Virtual Event' },
        { code: 'other', label: 'Other' }
      ],
      cities: Array.from(citiesSet),
      dateRangePresets: [
        { code: 'this_month', label: 'This month' },
        { code: 'next_month', label: 'Next month' }
      ]
    };
  }

  // searchFundraisingEvents
  searchFundraisingEvents(eventType, city, startDate, endDate, keywords, sortBy) {
    const events = this._getFromStorage('fundraising_events', []);
    const start = startDate ? new Date(startDate + 'T00:00:00Z') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59Z') : null;
    const kw = keywords ? String(keywords).toLowerCase() : null;
    const filtered = events.filter(e => {
      if (eventType && e.eventType !== eventType) return false;
      if (city && e.city !== city) return false;
      if (start || end) {
        const d = new Date(e.eventDate);
        if (start && d < start) return false;
        if (end && d > end) return false;
      }
      if (kw) {
        const inTitle = e.title && e.title.toLowerCase().includes(kw);
        const inKeywords = Array.isArray(e.keywords) && e.keywords.some(k => String(k).toLowerCase().includes(kw));
        if (!inTitle && !inKeywords) return false;
      }
      return true;
    });

    const sorted = filtered.slice();
    if (sortBy === 'date_desc') {
      sorted.sort((a, b) => new Date(b.eventDate) - new Date(a.eventDate));
    } else {
      // default or 'date_asc'
      sorted.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    }
    return sorted;
  }

  // getFundraisingEventDetails
  getFundraisingEventDetails(fundraisingEventId) {
    const events = this._getFromStorage('fundraising_events', []);
    return events.find(e => e.id === fundraisingEventId) || null;
  }

  // registerForFundraisingEvent
  registerForFundraisingEvent(fundraisingEventId, selectedStartTime, primaryContactName, primaryContactEmail, primaryContactPhone, participants) {
    if (!fundraisingEventId || !selectedStartTime || !primaryContactName || !primaryContactEmail) {
      return { registration: null, participants: [], success: false, message: 'Missing required fields.' };
    }
    const events = this._getFromStorage('fundraising_events', []);
    const eventIndex = events.findIndex(e => e.id === fundraisingEventId);
    if (eventIndex === -1) {
      return { registration: null, participants: [], success: false, message: 'Event not found.' };
    }
    const event = events[eventIndex];
    if (!Array.isArray(event.startTimeOptions) || !event.startTimeOptions.includes(selectedStartTime)) {
      return { registration: null, participants: [], success: false, message: 'Invalid start time selected.' };
    }

    const partArray = Array.isArray(participants) ? participants : [];
    if (partArray.length === 0) {
      return { registration: null, participants: [], success: false, message: 'At least one participant is required.' };
    }

    if (typeof event.maxParticipants === 'number') {
      const current = Number(event.participantsRegistered) || 0;
      if (current + partArray.length > event.maxParticipants) {
        return { registration: null, participants: [], success: false, message: 'Not enough event spots available.' };
      }
      events[eventIndex] = { ...event, participantsRegistered: current + partArray.length };
      this._saveToStorage('fundraising_events', events);
    }

    const registrations = this._ensureCollection('event_registrations');
    const registration = {
      id: this._generateId('evreg'),
      fundraisingEventId,
      selectedStartTime,
      primaryContactName,
      primaryContactEmail,
      primaryContactPhone: primaryContactPhone || '',
      totalParticipants: partArray.length,
      status: 'confirmed',
      registrationDate: new Date().toISOString()
    };
    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    const participantsStorage = this._ensureCollection('event_participants');
    const createdParticipants = partArray.map(p => {
      const record = {
        id: this._generateId('evpart'),
        eventRegistrationId: registration.id,
        fullName: p.fullName,
        age: Number(p.age) || 0,
        participantType: p.participantType,
        emergencyContactName: p.emergencyContactName || '',
        emergencyContactPhone: p.emergencyContactPhone || ''
      };
      participantsStorage.push(record);
      return this._attachEventParticipantRelations(record);
    });
    this._saveToStorage('event_participants', participantsStorage);

    return {
      registration: this._attachEventRegistrationRelations(registration),
      participants: createdParticipants,
      success: true,
      message: 'Event registration completed.'
    };
  }

  // getFundraisingCampaignsList
  getFundraisingCampaignsList() {
    const campaigns = this._getFromStorage('fundraising_campaigns', []);
    return campaigns.filter(c => c.status === 'active' || c.status === 'upcoming');
  }

  // getFundraisingCampaignDetails
  getFundraisingCampaignDetails(campaignId, campaignSlug) {
    const campaigns = this._getFromStorage('fundraising_campaigns', []);
    let campaign = null;
    if (campaignId) {
      campaign = campaigns.find(c => c.id === campaignId) || null;
    } else if (campaignSlug) {
      campaign = campaigns.find(c => c.slug === campaignSlug) || null;
    }
    return campaign;
  }

  // createPersonalFundraisingPage
  createPersonalFundraisingPage(campaignId, title, story, goalAmount, customUrlSlug, isTeamPage) {
    if (!campaignId || !title || !story) {
      return { personalFundraisingPage: null, success: false, message: 'Missing required fields.' };
    }
    const campaigns = this._getFromStorage('fundraising_campaigns', []);
    const campaign = campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      return { personalFundraisingPage: null, success: false, message: 'Campaign not found.' };
    }
    const pages = this._ensureCollection('personal_fundraising_pages');
    const goal = Number(goalAmount) || 0;
    const fullUrl = this._generatePersonalFundraisingPageUrl(campaign, customUrlSlug);
    const page = {
      id: this._generateId('pfp'),
      campaignId,
      title,
      story,
      goalAmount: goal,
      amountRaised: 0,
      customUrlSlug,
      fullUrl,
      status: 'active',
      isTeamPage: !!isTeamPage,
      createdAt: new Date().toISOString(),
      lastLinkCopiedAt: null
    };
    pages.push(page);
    this._saveToStorage('personal_fundraising_pages', pages);
    return {
      personalFundraisingPage: this._attachPersonalFundraisingPageRelations(page),
      success: true,
      message: 'Personal fundraising page created.'
    };
  }

  // copyPersonalFundraisingPageLink
  copyPersonalFundraisingPageLink(personalFundraisingPageId) {
    const pages = this._getFromStorage('personal_fundraising_pages', []);
    const page = pages.find(p => p.id === personalFundraisingPageId) || null;
    if (!page) {
      return { fullUrl: '', success: false, message: 'Personal fundraising page not found.', lastLinkCopiedAt: null };
    }
    const timestamp = this._updateLastLinkCopiedTimestamp(personalFundraisingPageId);
    return {
      fullUrl: page.fullUrl,
      success: true,
      message: 'Link copy recorded.',
      lastLinkCopiedAt: timestamp
    };
  }

  // getAdvocacyOverviewContent
  getAdvocacyOverviewContent() {
    const stored = this._getFromStorage('advocacy_overview_content', null) || {};
    return {
      overviewText: stored.overviewText || '',
      priorityAreas: Array.isArray(stored.priorityAreas) ? stored.priorityAreas : []
    };
  }

  // getAdvocacyTopics
  getAdvocacyTopics() {
    return this._getFromStorage('advocacy_topics', []);
  }

  // lookupRepresentativesByZip
  lookupRepresentativesByZip(zipCode) {
    return this._lookupRepresentativesForZip(zipCode);
  }

  // getAdvocacyLetterTemplate
  getAdvocacyLetterTemplate(topicId) {
    const topics = this._getFromStorage('advocacy_topics', []);
    const topic = topics.find(t => t.id === topicId) || null;
    const templates = this._getFromStorage('advocacy_letter_templates', {});
    const tpl = templates && templates[topicId] ? templates[topicId] : {};
    return {
      topic,
      bodyText: tpl.bodyText || '',
      editableSectionsInfo: tpl.editableSectionsInfo || ''
    };
  }

  // sendAdvocacyLetter
  sendAdvocacyLetter(
    topicId,
    zipCode,
    bodyText,
    customTextAdded,
    sendEmailThroughSite,
    generatePrintReadyPdf,
    senderFullName,
    senderEmail,
    senderAddressLine1,
    senderAddressLine2,
    senderCity,
    senderState,
    senderPostalCode,
    recipientIds
  ) {
    if (!topicId || !zipCode || !bodyText || !senderFullName || !senderEmail || !senderAddressLine1 || !senderCity || !senderState || !senderPostalCode || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return { advocacyLetter: null, success: false, message: 'Missing required fields.' };
    }
    const letters = this._ensureCollection('advocacy_letters');
    const advocacyLetter = {
      id: this._generateId('advlet'),
      topicId,
      zipCode,
      bodyText,
      customTextAdded: customTextAdded || '',
      sendEmailThroughSite: !!sendEmailThroughSite,
      generatePrintReadyPdf: !!generatePrintReadyPdf,
      senderFullName,
      senderEmail,
      senderAddressLine1,
      senderAddressLine2: senderAddressLine2 || '',
      senderCity,
      senderState,
      senderPostalCode,
      recipientIds,
      status: 'submitted',
      createdAt: new Date().toISOString()
    };
    letters.push(advocacyLetter);
    this._saveToStorage('advocacy_letters', letters);
    return {
      advocacyLetter: this._attachAdvocacyLetterRelations(advocacyLetter),
      success: true,
      message: 'Advocacy letter submitted.'
    };
  }

  // getAboutUsContent
  getAboutUsContent() {
    const stored = this._getFromStorage('about_us_content', null) || {};
    return {
      mission: stored.mission || '',
      history: stored.history || '',
      approach: stored.approach || '',
      leadership: Array.isArray(stored.leadership) ? stored.leadership : [],
      partners: Array.isArray(stored.partners) ? stored.partners : [],
      financialHighlights: Array.isArray(stored.financialHighlights) ? stored.financialHighlights : []
    };
  }

  // getContactPageInfo
  getContactPageInfo() {
    const stored = this._getFromStorage('contact_page_info', null) || {};
    return {
      mailingAddress: stored.mailingAddress || '',
      phoneNumber: stored.phoneNumber || '',
      generalEmail: stored.generalEmail || '',
      additionalContacts: Array.isArray(stored.additionalContacts) ? stored.additionalContacts : [],
      faqLinkText: stored.faqLinkText || ''
    };
  }

  // submitContactForm
  submitContactForm(fullName, email, subject, message) {
    if (!fullName || !email || !message) {
      return { success: false, message: 'Missing required fields.' };
    }
    const submissions = this._ensureCollection('contact_form_submissions');
    const submission = {
      id: this._generateId('contact'),
      fullName,
      email,
      subject: subject || '',
      message,
      createdAt: new Date().toISOString()
    };
    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);
    return { success: true, message: 'Your message has been submitted.' };
  }

  // getFaqEntries
  getFaqEntries() {
    return this._getFromStorage('faq_entries', []);
  }

  // getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const stored = this._getFromStorage('privacy_policy_content', null) || {};
    return {
      lastUpdated: stored.lastUpdated || '',
      sections: Array.isArray(stored.sections) ? stored.sections : []
    };
  }

  // getTermsAndConditionsContent
  getTermsAndConditionsContent() {
    const stored = this._getFromStorage('terms_and_conditions_content', null) || {};
    return {
      lastUpdated: stored.lastUpdated || '',
      sections: Array.isArray(stored.sections) ? stored.sections : []
    };
  }

  // getProgramsPageViewPreference
  getProgramsPageViewPreference() {
    const prefs = this._getFromStorage('programs_page_view_preferences', []);
    if (prefs.length > 0) {
      return prefs[0];
    }
    const pref = {
      id: this._generateId('progview'),
      view: 'overview'
    };
    const arr = [pref];
    this._saveToStorage('programs_page_view_preferences', arr);
    return pref;
  }

  // setProgramsPageViewPreference
  setProgramsPageViewPreference(view) {
    if (view !== 'overview' && view !== 'programs') {
      // keep existing without change
      return this.getProgramsPageViewPreference();
    }
    const prefs = this._getFromStorage('programs_page_view_preferences', []);
    if (prefs.length === 0) {
      const pref = { id: this._generateId('progview'), view };
      this._saveToStorage('programs_page_view_preferences', [pref]);
      return pref;
    }
    const updated = { ...prefs[0], view };
    prefs[0] = updated;
    this._saveToStorage('programs_page_view_preferences', prefs);
    return updated;
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
