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

  // ------------------------
  // Storage helpers
  // ------------------------
  _initStorage() {
    const keys = [
      'donationfunds',
      'donations',
      'paymenttransactions',
      'services',
      'savedservices',
      'events',
      'eventregistrations',
      'volunteeropportunities',
      'volunteershifts',
      'volunteersignups',
      'financialprograms',
      'financialapplications',
      'supportgroups',
      'supportgroupjoinrequests',
      'articles',
      'readinglists',
      'readinglistitems',
      'giftcategories',
      'giftitems',
      'donationcarts',
      'donationcartitems',
      'stories'
    ];

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Helper state keys
    if (!localStorage.getItem('savedServicesState')) {
      localStorage.setItem('savedServicesState', JSON.stringify({}));
    }
    if (!localStorage.getItem('lastServiceSearchPostalCode')) {
      localStorage.setItem('lastServiceSearchPostalCode', '');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
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

  _parseDate(dateString) {
    return dateString ? new Date(dateString) : null;
  }

  _getYearFromDateString(dateString) {
    const d = this._parseDate(dateString);
    return d ? d.getFullYear() : null;
  }

  // Very rough distance estimation using ZIP and city/state; no external APIs
  _estimateDistanceMiles(userPostalCode, servicePostalCode, serviceCity, serviceState, userCity, userState) {
    if (!userPostalCode || !servicePostalCode) {
      return null;
    }
    if (userPostalCode === servicePostalCode) {
      return 0;
    }
    const userPrefix = String(userPostalCode).substring(0, 3);
    const servicePrefix = String(servicePostalCode).substring(0, 3);
    if (userPrefix === servicePrefix) {
      return 5;
    }
    if (userCity && serviceCity && userCity.toLowerCase() === serviceCity.toLowerCase()) {
      return 10;
    }
    if (userState && serviceState && userState.toLowerCase() === serviceState.toLowerCase()) {
      return 25;
    }
    return 100; // fallback large-ish distance
  }

  _matchesCancerTypeFilter(itemCancerTypes, filterType) {
    if (!filterType) {
      return true;
    }
    if (!itemCancerTypes || !Array.isArray(itemCancerTypes) || itemCancerTypes.length === 0) {
      return true; // treat unspecified as general
    }
    if (filterType === 'all_cancers') {
      return true;
    }
    if (itemCancerTypes.indexOf('all_cancers') !== -1) {
      return true;
    }
    if (itemCancerTypes.indexOf(filterType) !== -1) {
      return true;
    }
    // Leukemia / childhood_leukemia hierarchy
    if (filterType === 'leukemia' && itemCancerTypes.indexOf('childhood_leukemia') !== -1) {
      return true;
    }
    if (filterType === 'childhood_leukemia' && itemCancerTypes.indexOf('leukemia') !== -1) {
      return true;
    }
    return false;
  }

  // ------------------------
  // Helper: Donation cart
  // ------------------------
  _getOrCreateDonationCart() {
    let carts = this._getFromStorage('donationcarts');
    let openCart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        openCart = carts[i];
        break;
      }
    }
    if (!openCart) {
      openCart = {
        id: this._generateId('donationcart'),
        status: 'open',
        total_amount: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      carts.push(openCart);
      this._saveToStorage('donationcarts', carts);
    }
    return openCart;
  }

  _getOpenDonationCart() {
    const carts = this._getFromStorage('donationcarts');
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].status === 'open') {
        return carts[i];
      }
    }
    return null;
  }

  _recalculateCartTotals(cartId) {
    let carts = this._getFromStorage('donationcarts');
    let items = this._getFromStorage('donationcartitems');
    let cart = null;
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cartId) {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      return;
    }
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      if (items[i].cart_id === cartId) {
        items[i].line_total = items[i].unit_price * items[i].quantity;
        total += items[i].line_total;
      }
    }
    cart.total_amount = total;
    cart.updated_at = new Date().toISOString();
    this._saveToStorage('donationcarts', carts);
    this._saveToStorage('donationcartitems', items);
  }

  // ------------------------
  // Helper: Reading list
  // ------------------------
  _getOrCreateReadingList() {
    let lists = this._getFromStorage('readinglists');
    if (lists.length > 0) {
      return lists[0];
    }
    const newList = {
      id: this._generateId('readinglist'),
      name: 'My Reading List',
      created_at: new Date().toISOString()
    };
    lists.push(newList);
    this._saveToStorage('readinglists', lists);
    return newList;
  }

  // ------------------------
  // Helper: Saved services state
  // ------------------------
  _persistSavedServicesState(action, data) {
    // Simple wrapper over savedservices. State object kept for future extension.
    if (action === 'get') {
      return this._getFromStorage('savedservices');
    }
    if (action === 'set') {
      this._saveToStorage('savedservices', data || []);
      return true;
    }
    return null;
  }

  // ------------------------
  // HOME CONFIG INTERFACES
  // ------------------------

  getHomePrimaryCTAs() {
    // Static config; no entity data mocked
    return {
      ctas: [
        {
          id: 'donate',
          label: 'Donate',
          description: 'Support lifesaving cancer care and research.'
        },
        {
          id: 'find_care',
          label: 'Find Care & Services',
          description: 'Locate treatment, counseling, and support near you.'
        },
        {
          id: 'financial_assistance',
          label: 'Financial Assistance',
          description: 'Get help with treatment-related costs.'
        },
        {
          id: 'support_groups',
          label: 'Support Groups',
          description: 'Connect with others who understand your experience.'
        },
        {
          id: 'gift_catalog',
          label: 'Gift Catalog',
          description: 'Send comfort items and care packages to patients.'
        }
      ]
    };
  }

  getHomeQuickLinks() {
    return {
      quick_links: [
        {
          id: 'events',
          label: 'Events & Webinars',
          description: 'Education programs, classes, and webinars.'
        },
        {
          id: 'volunteer',
          label: 'Volunteer Opportunities',
          description: 'Give your time to support patients and families.'
        },
        {
          id: 'education_resources',
          label: 'Education & Resources',
          description: 'Trusted information about cancer, treatment, and coping.'
        }
      ]
    };
  }

  getHomeHighlights() {
    const stories = this._getFromStorage('stories');
    const events = this._getFromStorage('events');
    const financialPrograms = this._getFromStorage('financialprograms');

    // Featured stories: up to 3 published stories
    const featuredStories = [];
    for (let i = 0; i < stories.length; i++) {
      const s = stories[i];
      if (s.is_published) {
        featuredStories.push({
          story_id: s.id,
          title: s.title,
          excerpt: (s.body && s.body.substring(0, 160)) || '',
          cancer_type: s.cancer_type,
          age_group: s.age_group
        });
      }
      if (featuredStories.length >= 3) {
        break;
      }
    }

    // Upcoming events: next few scheduled
    const now = new Date();
    const upcoming = [];
    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.status === 'scheduled') {
        const start = this._parseDate(ev.start_datetime);
        if (start && start >= now) {
          upcoming.push({
            event_id: ev.id,
            title: ev.title,
            start_datetime: ev.start_datetime,
            time_zone: ev.time_zone || '',
            cost_type: ev.cost_type,
            cost_amount: typeof ev.cost_amount === 'number' ? ev.cost_amount : 0,
            format: ev.format
          });
        }
      }
    }
    upcoming.sort(function (a, b) {
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      return da - db;
    });
    const upcomingEvents = upcoming.slice(0, 3);

    // Key programs: derive from presence of financial programs and support groups / gift catalog
    const keyPrograms = [];

    if (financialPrograms.length > 0) {
      keyPrograms.push({
        program_type: 'financial_assistance',
        title: 'Financial Assistance Programs',
        summary: 'Explore ' + financialPrograms.length + ' programs that may help with treatment costs.'
      });
    } else {
      keyPrograms.push({
        program_type: 'financial_assistance',
        title: 'Financial Assistance',
        summary: 'Learn about help for transportation, medication, and other treatment-related costs.'
      });
    }

    const supportGroups = this._getFromStorage('supportgroups');
    if (supportGroups.length > 0) {
      keyPrograms.push({
        program_type: 'support_groups',
        title: 'Support Groups',
        summary: 'Join one of ' + supportGroups.length + ' groups for patients and caregivers.'
      });
    } else {
      keyPrograms.push({
        program_type: 'support_groups',
        title: 'Support Groups',
        summary: 'Connect with others living with cancer or caring for a loved one.'
      });
    }

    const giftCategories = this._getFromStorage('giftcategories');
    keyPrograms.push({
      program_type: 'gift_catalog',
      title: 'Gift Catalog',
      summary: giftCategories.length > 0
        ? 'Choose comfort items and care packages from ' + giftCategories.length + ' categories.'
        : 'Send comfort items and care packages that support patients during treatment.'
    });

    return {
      featured_stories: featuredStories,
      upcoming_events: upcomingEvents,
      key_programs: keyPrograms
    };
  }

  // ------------------------
  // DONATION INTERFACES
  // ------------------------

  getDonationPageConfig() {
    const fundsRaw = this._getFromStorage('donationfunds');
    const funds = [];
    let firstActiveId = null;
    for (let i = 0; i < fundsRaw.length; i++) {
      const f = fundsRaw[i];
      if (f.is_active) {
        if (!firstActiveId) {
          firstActiveId = f.id;
        }
      }
    }
    for (let i = 0; i < fundsRaw.length; i++) {
      const f = fundsRaw[i];
      funds.push({
        id: f.id,
        name: f.name,
        description: f.description || '',
        is_active: !!f.is_active,
        is_default: f.is_active && f.id === firstActiveId
      });
    }

    return {
      allowed_frequencies: ['one_time', 'monthly'],
      default_frequency: 'one_time',
      preset_amounts: [25, 35, 50, 100, 250],
      minimum_amount: 1,
      funds: funds,
      dedication_options: [
        { value: 'none', label: 'No dedication' },
        { value: 'in_honor_of', label: 'In honor of' },
        { value: 'in_memory_of', label: 'In memory of' }
      ],
      default_wants_email_updates: true,
      payment_methods: [
        { type: 'credit_card', label: 'Credit Card' },
        { type: 'ach', label: 'Bank Transfer (ACH)' },
        { type: 'paypal', label: 'PayPal' }
      ]
    };
  }

  submitDonation(
    amount,
    frequency,
    fundId,
    designationNote,
    dedicationType,
    honoreeName,
    donorName,
    donorEmail,
    wantsEmailUpdates,
    paymentMethodType,
    cardNumber,
    cardExpMonth,
    cardExpYear,
    cardCvc,
    billingZip
  ) {
    const result = {
      success: false,
      donation_id: null,
      payment_transaction_id: null,
      status: 'failed',
      amount: amount,
      frequency: frequency,
      fund_name: '',
      dedication_summary: '',
      wants_email_updates: !!wantsEmailUpdates,
      message: ''
    };

    if (!amount || amount <= 0) {
      result.message = 'Donation amount must be greater than zero.';
      return result;
    }
    if (!donorName) {
      result.message = 'Donor name is required.';
      return result;
    }

    const nowIso = new Date().toISOString();

    // Payment transaction simulation
    let paymentTransactions = this._getFromStorage('paymenttransactions');
    const paymentId = this._generateId('payment');

    let cardBrand = null;
    let cardLast4 = null;
    let expMonth = null;
    let expYear = null;
    let billingZipVal = billingZip || null;

    if (paymentMethodType === 'credit_card' && cardNumber) {
      const num = String(cardNumber);
      cardLast4 = num.substring(num.length - 4);
      const firstDigit = num.charAt(0);
      if (firstDigit === '4') {
        cardBrand = 'visa';
      } else if (firstDigit === '5') {
        cardBrand = 'mastercard';
      } else if (firstDigit === '3') {
        cardBrand = 'amex';
      } else if (firstDigit === '6') {
        cardBrand = 'discover';
      } else {
        cardBrand = 'other';
      }
      expMonth = cardExpMonth || null;
      expYear = cardExpYear || null;
    }

    const paymentStatus = 'succeeded';

    const paymentRecord = {
      id: paymentId,
      payment_method_type: paymentMethodType,
      card_brand: cardBrand,
      card_last4: cardLast4,
      card_exp_month: expMonth,
      card_exp_year: expYear,
      billing_zip: billingZipVal,
      amount: amount,
      currency: 'usd',
      status: paymentStatus,
      processed_at: nowIso,
      error_message: paymentStatus === 'failed' ? 'Payment failed.' : null
    };

    paymentTransactions.push(paymentRecord);
    this._saveToStorage('paymenttransactions', paymentTransactions);

    // Donation record
    const donations = this._getFromStorage('donations');
    const donationId = this._generateId('donation');

    const donationRecord = {
      id: donationId,
      amount: amount,
      currency: 'usd',
      frequency: frequency,
      fund_id: fundId,
      designation_note: designationNote || null,
      dedication_type: dedicationType || 'none',
      honoree_name: honoreeName || null,
      donor_name: donorName,
      donor_email: donorEmail || null,
      wants_email_updates: !!wantsEmailUpdates,
      payment_method_type: paymentMethodType,
      payment_transaction_id: paymentId,
      is_from_gift_catalog: false,
      cart_id: null,
      status: paymentStatus === 'succeeded' ? 'completed' : 'failed',
      created_at: nowIso
    };

    donations.push(donationRecord);
    this._saveToStorage('donations', donations);

    // Resolve fund name
    const funds = this._getFromStorage('donationfunds');
    let fundName = '';
    for (let i = 0; i < funds.length; i++) {
      if (funds[i].id === fundId) {
        fundName = funds[i].name;
        break;
      }
    }

    let dedicationSummary = '';
    if (donationRecord.dedication_type === 'in_honor_of' && donationRecord.honoree_name) {
      dedicationSummary = 'In honor of ' + donationRecord.honoree_name;
    } else if (donationRecord.dedication_type === 'in_memory_of' && donationRecord.honoree_name) {
      dedicationSummary = 'In memory of ' + donationRecord.honoree_name;
    }

    result.success = paymentStatus === 'succeeded';
    result.donation_id = donationId;
    result.payment_transaction_id = paymentId;
    result.status = donationRecord.status;
    result.fund_name = fundName;
    result.dedication_summary = dedicationSummary;
    result.wants_email_updates = donationRecord.wants_email_updates;
    result.message = paymentStatus === 'succeeded'
      ? 'Thank you for your donation.'
      : 'We were unable to process your donation.';

    return result;
  }

  // ------------------------
  // CARE & SERVICES INTERFACES
  // ------------------------

  getCareAndServicesConfig() {
    return {
      radius_options: [10, 25, 50, 100],
      default_radius_miles: 25,
      cancer_type_options: [
        { value: 'breast_cancer', label: 'Breast Cancer' },
        { value: 'lymphoma', label: 'Lymphoma' },
        { value: 'leukemia', label: 'Leukemia' },
        { value: 'childhood_leukemia', label: 'Childhood Leukemia' },
        { value: 'all_cancers', label: 'All Cancers' }
      ],
      service_type_options: [
        { value: 'counseling', label: 'Counseling' },
        { value: 'medical_treatment', label: 'Medical Treatment' },
        { value: 'screening', label: 'Screening' },
        { value: 'support_group', label: 'Support Group' },
        { value: 'navigation', label: 'Navigation' },
        { value: 'financial_counseling', label: 'Financial Counseling' },
        { value: 'other', label: 'Other' }
      ],
      format_options: [
        { value: 'in_person', label: 'In-person' },
        { value: 'online', label: 'Online' },
        { value: 'phone', label: 'Phone' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      sort_options: [
        { value: 'distance_asc', label: 'Distance 5 nearest first' },
        { value: 'name_asc', label: 'Name A5Z' }
      ]
    };
  }

  searchCareServices(postalCode, radiusMiles, cancerType, serviceType, format, sortBy) {
    const services = this._getFromStorage('services');
    const savedServices = this._persistSavedServicesState('get');

    const radius = typeof radiusMiles === 'number' ? radiusMiles : 25;
    const results = [];

    // Persist last search ZIP for distance context
    localStorage.setItem('lastServiceSearchPostalCode', postalCode || '');

    for (let i = 0; i < services.length; i++) {
      const s = services[i];

      if (serviceType && s.service_type !== serviceType) {
        continue;
      }
      if (format && s.format !== format) {
        continue;
      }
      if (cancerType && !this._matchesCancerTypeFilter(s.cancer_types, cancerType)) {
        continue;
      }

      const distance = this._estimateDistanceMiles(
        postalCode,
        s.postal_code,
        s.city,
        s.state,
        null,
        null
      );

      if (distance !== null && typeof distance === 'number' && distance > radius) {
        continue;
      }

      let isSaved = false;
      for (let j = 0; j < savedServices.length; j++) {
        if (savedServices[j].service_id === s.id) {
          isSaved = true;
          break;
        }
      }

      results.push({
        service_id: s.id,
        name: s.name,
        description: s.description || '',
        service_type: s.service_type,
        cancer_types: s.cancer_types || [],
        audience: s.audience,
        format: s.format,
        address_line1: s.address_line1 || '',
        city: s.city || '',
        state: s.state || '',
        postal_code: s.postal_code || '',
        phone: s.phone || '',
        email: s.email || '',
        website: s.website || '',
        distance_miles: distance !== null ? distance : null,
        hours: s.hours || '',
        eligibility_notes: s.eligibility_notes || '',
        is_accepting_new_patients: typeof s.is_accepting_new_patients === 'boolean' ? s.is_accepting_new_patients : true,
        is_saved: isSaved
      });
    }

    if (sortBy === 'name_asc') {
      results.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    } else if (sortBy === 'distance_asc') {
      results.sort(function (a, b) {
        const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
        const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
        if (da === db) {
          return a.name.localeCompare(b.name);
        }
        return da - db;
      });
    }

    return {
      total_results: results.length,
      results: results
    };
  }

  getServiceDetail(serviceId) {
    const services = this._getFromStorage('services');
    const savedServices = this._persistSavedServicesState('get');
    let svc = null;
    for (let i = 0; i < services.length; i++) {
      if (services[i].id === serviceId) {
        svc = services[i];
        break;
      }
    }
    if (!svc) {
      return {
        service_id: null,
        name: '',
        description: '',
        service_type: '',
        cancer_types: [],
        audience: '',
        format: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        phone: '',
        email: '',
        website: '',
        hours: '',
        eligibility_notes: '',
        is_accepting_new_patients: false,
        distance_miles: null,
        is_saved: false
      };
    }

    const lastZip = localStorage.getItem('lastServiceSearchPostalCode') || '';
    const distance = this._estimateDistanceMiles(
      lastZip,
      svc.postal_code,
      svc.city,
      svc.state,
      null,
      null
    );

    let isSaved = false;
    for (let i = 0; i < savedServices.length; i++) {
      if (savedServices[i].service_id === svc.id) {
        isSaved = true;
        break;
      }
    }

    return {
      service_id: svc.id,
      name: svc.name,
      description: svc.description || '',
      service_type: svc.service_type,
      cancer_types: svc.cancer_types || [],
      audience: svc.audience,
      format: svc.format,
      address_line1: svc.address_line1 || '',
      address_line2: svc.address_line2 || '',
      city: svc.city || '',
      state: svc.state || '',
      postal_code: svc.postal_code || '',
      country: svc.country || '',
      phone: svc.phone || '',
      email: svc.email || '',
      website: svc.website || '',
      hours: svc.hours || '',
      eligibility_notes: svc.eligibility_notes || '',
      is_accepting_new_patients: typeof svc.is_accepting_new_patients === 'boolean' ? svc.is_accepting_new_patients : true,
      distance_miles: distance !== null ? distance : null,
      is_saved: isSaved
    };
  }

  saveServiceToMyResources(serviceId) {
    const services = this._getFromStorage('services');
    let exists = false;
    let serviceFound = null;
    for (let i = 0; i < services.length; i++) {
      if (services[i].id === serviceId) {
        serviceFound = services[i];
        break;
      }
    }
    if (!serviceFound) {
      return {
        success: false,
        saved_service_id: null,
        service_id: serviceId,
        saved_at: null,
        message: 'Service not found.'
      };
    }

    let savedServices = this._persistSavedServicesState('get');
    let existingSaved = null;
    for (let i = 0; i < savedServices.length; i++) {
      if (savedServices[i].service_id === serviceId) {
        exists = true;
        existingSaved = savedServices[i];
        break;
      }
    }

    const nowIso = new Date().toISOString();

    if (exists) {
      return {
        success: true,
        saved_service_id: existingSaved.id,
        service_id: existingSaved.service_id,
        saved_at: existingSaved.saved_at,
        message: 'Service already saved.'
      };
    }

    const newSaved = {
      id: this._generateId('savedservice'),
      service_id: serviceId,
      saved_at: nowIso
    };
    savedServices.push(newSaved);
    this._persistSavedServicesState('set', savedServices);

    return {
      success: true,
      saved_service_id: newSaved.id,
      service_id: newSaved.service_id,
      saved_at: newSaved.saved_at,
      message: 'Service saved to My Resources.'
    };
  }

  getSavedServicesList() {
    const savedServices = this._persistSavedServicesState('get');
    const services = this._getFromStorage('services');

    const list = [];
    for (let i = 0; i < savedServices.length; i++) {
      const ss = savedServices[i];
      let svc = null;
      for (let j = 0; j < services.length; j++) {
        if (services[j].id === ss.service_id) {
          svc = services[j];
          break;
        }
      }
      list.push({
        saved_service_id: ss.id,
        service_id: ss.service_id,
        name: svc ? svc.name : '',
        service_type: svc ? svc.service_type : '',
        format: svc ? svc.format : '',
        city: svc ? (svc.city || '') : '',
        state: svc ? (svc.state || '') : '',
        saved_at: ss.saved_at,
        // Foreign key resolution: include full service object
        service: svc || null
      });
    }

    return {
      total_saved: list.length,
      saved_services: list
    };
  }

  // ------------------------
  // EVENTS & VOLUNTEER CONFIG
  // ------------------------

  getProgramsAndOpportunitiesConfig(section) {
    // Section is not used to limit data; both configs are returned
    const currentYear = new Date().getFullYear();
    return {
      event_filters: {
        date_range_presets: [
          { label: 'This Month', month: new Date().getMonth() + 1, year: currentYear },
          { label: 'Next Month', month: new Date().getMonth() + 2 > 12 ? 1 : new Date().getMonth() + 2, year: new Date().getMonth() + 2 > 12 ? currentYear + 1 : currentYear },
          { label: 'April 2025', month: 4, year: 2025 }
        ],
        cost_type_options: [
          { value: 'free', label: 'Free' },
          { value: 'paid', label: 'Paid' },
          { value: 'donation_suggested', label: 'Donation suggested' }
        ],
        time_of_day_options: [
          { value: 'morning', label: 'Morning' },
          { value: 'afternoon', label: 'Afternoon' },
          { value: 'evening', label: 'Evening' }
        ],
        format_options: [
          { value: 'online', label: 'Online' },
          { value: 'in_person', label: 'In-person' },
          { value: 'hybrid', label: 'Hybrid' }
        ],
        sort_options: [
          { value: 'start_datetime_asc', label: 'Soonest first' },
          { value: 'start_datetime_desc', label: 'Latest first' }
        ]
      },
      volunteer_filters: {
        location_type_options: [
          { value: 'main_campus', label: 'Main Campus' },
          { value: 'satellite_clinic', label: 'Satellite Clinic' },
          { value: 'community_location', label: 'Community Location' },
          { value: 'remote', label: 'Remote / Virtual' },
          { value: 'other', label: 'Other' }
        ],
        role_type_options: [
          { value: 'patient_support', label: 'Patient Support' },
          { value: 'patient_transport', label: 'Patient Transport' },
          { value: 'family_check_in', label: 'Family Check-In' },
          { value: 'administrative', label: 'Administrative' },
          { value: 'event_support', label: 'Event Support' },
          { value: 'other', label: 'Other' }
        ],
        day_of_week_options: [
          { value: 'monday', label: 'Monday' },
          { value: 'tuesday', label: 'Tuesday' },
          { value: 'wednesday', label: 'Wednesday' },
          { value: 'thursday', label: 'Thursday' },
          { value: 'friday', label: 'Friday' },
          { value: 'saturday', label: 'Saturday' },
          { value: 'sunday', label: 'Sunday' }
        ],
        date_range_presets: [
          { label: 'Next 2 months', days_from_today: 60 },
          { label: 'Next month', days_from_today: 30 }
        ],
        sort_options: [
          { value: 'start_datetime_asc', label: 'Soonest first' },
          { value: 'start_datetime_desc', label: 'Latest first' }
        ]
      }
    };
  }

  // ------------------------
  // EVENTS INTERFACES
  // ------------------------

  searchEvents(month, year, keyword, costType, startTimeFrom, format, sortBy) {
    const events = this._getFromStorage('events');
    const results = [];

    let filterMonth = typeof month === 'number' ? month : null;
    let filterYear = typeof year === 'number' ? year : null;
    const keywordLower = keyword ? String(keyword).toLowerCase() : null;
    let minTimeMinutes = null;
    if (startTimeFrom) {
      const parts = String(startTimeFrom).split(':');
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(h) && !isNaN(m)) {
          minTimeMinutes = h * 60 + m;
        }
      }
    }

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const start = this._parseDate(ev.start_datetime);
      if (!start) {
        continue;
      }

      if (filterYear && start.getFullYear() !== filterYear) {
        continue;
      }
      if (filterMonth && (start.getMonth() + 1) !== filterMonth) {
        continue;
      }
      if (costType && ev.cost_type !== costType) {
        continue;
      }
      if (format && ev.format !== format) {
        continue;
      }

      if (keywordLower) {
        const inTitle = ev.title && ev.title.toLowerCase().indexOf(keywordLower) !== -1;
        const inDesc = ev.description && ev.description.toLowerCase().indexOf(keywordLower) !== -1;
        let inTags = false;
        if (ev.topic_tags && Array.isArray(ev.topic_tags)) {
          for (let t = 0; t < ev.topic_tags.length; t++) {
            if (String(ev.topic_tags[t]).toLowerCase().indexOf(keywordLower) !== -1) {
              inTags = true;
              break;
            }
          }
        }
        if (!inTitle && !inDesc && !inTags) {
          continue;
        }
      }

      if (minTimeMinutes !== null) {
        const minutes = start.getHours() * 60 + start.getMinutes();
        if (minutes < minTimeMinutes) {
          continue;
        }
      }

      results.push({
        event_id: ev.id,
        title: ev.title,
        description: ev.description || '',
        start_datetime: ev.start_datetime,
        end_datetime: ev.end_datetime || null,
        time_zone: ev.time_zone || '',
        cost_type: ev.cost_type,
        cost_amount: typeof ev.cost_amount === 'number' ? ev.cost_amount : 0,
        format: ev.format,
        location_name: ev.location_name || '',
        city: ev.city || '',
        state: ev.state || '',
        registration_required: !!ev.registration_required,
        remaining_capacity: typeof ev.remaining_capacity === 'number' ? ev.remaining_capacity : null,
        status: ev.status,
        is_featured: !!ev.is_featured
      });
    }

    const sortKey = sortBy || 'start_datetime_asc';
    if (sortKey === 'start_datetime_desc') {
      results.sort(function (a, b) {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        return db - da;
      });
    } else {
      results.sort(function (a, b) {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        return da - db;
      });
    }

    return {
      total_results: results.length,
      results: results
    };
  }

  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    let ev = null;
    for (let i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        ev = events[i];
        break;
      }
    }
    if (!ev) {
      return {
        event_id: null,
        title: '',
        description: '',
        topic_tags: [],
        cancer_types: [],
        format: '',
        location_name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        country: '',
        start_datetime: '',
        end_datetime: '',
        time_zone: '',
        cost_type: '',
        cost_amount: 0,
        registration_required: false,
        capacity: null,
        remaining_capacity: null,
        status: '',
        is_featured: false,
        can_register: false,
        access_instructions: ''
      };
    }

    const canRegister = ev.status === 'scheduled' && (ev.remaining_capacity === null || ev.remaining_capacity > 0);

    return {
      event_id: ev.id,
      title: ev.title,
      description: ev.description || '',
      topic_tags: ev.topic_tags || [],
      cancer_types: ev.cancer_types || [],
      format: ev.format,
      location_name: ev.location_name || '',
      address_line1: ev.address_line1 || '',
      address_line2: ev.address_line2 || '',
      city: ev.city || '',
      state: ev.state || '',
      postal_code: ev.postal_code || '',
      country: ev.country || '',
      start_datetime: ev.start_datetime,
      end_datetime: ev.end_datetime || null,
      time_zone: ev.time_zone || '',
      cost_type: ev.cost_type,
      cost_amount: typeof ev.cost_amount === 'number' ? ev.cost_amount : 0,
      registration_required: !!ev.registration_required,
      capacity: typeof ev.capacity === 'number' ? ev.capacity : null,
      remaining_capacity: typeof ev.remaining_capacity === 'number' ? ev.remaining_capacity : null,
      status: ev.status,
      is_featured: !!ev.is_featured,
      can_register: canRegister,
      access_instructions: ev.access_instructions || ''
    };
  }

  registerForEvent(
    eventId,
    attendeeName,
    attendeeEmail,
    ticketType,
    ticketQuantity,
    smsReminderOptIn,
    smsPhoneNumber,
    notes
  ) {
    const events = this._getFromStorage('events');
    let ev = null;
    for (let i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        ev = events[i];
        break;
      }
    }

    const nowIso = new Date().toISOString();

    if (!ev) {
      return {
        success: false,
        registration_id: null,
        status: 'pending',
        registration_datetime: nowIso,
        event_id: eventId,
        event_title: '',
        event_start_datetime: '',
        time_zone: '',
        sms_reminder_opt_in: !!smsReminderOptIn,
        message: 'Event not found.'
      };
    }

    const registrations = this._getFromStorage('eventregistrations');

    let status = 'confirmed';
    const qty = ticketQuantity || 1;
    if (ev.status !== 'scheduled') {
      status = 'waitlisted';
    } else if (typeof ev.remaining_capacity === 'number') {
      if (ev.remaining_capacity <= 0 || ev.remaining_capacity < qty) {
        status = 'waitlisted';
      } else {
        ev.remaining_capacity = ev.remaining_capacity - qty;
      }
    }

    const registrationId = this._generateId('eventreg');
    const regRecord = {
      id: registrationId,
      event_id: eventId,
      attendee_name: attendeeName,
      attendee_email: attendeeEmail,
      ticket_type: ticketType,
      ticket_quantity: qty,
      registration_datetime: nowIso,
      sms_reminder_opt_in: !!smsReminderOptIn,
      sms_phone_number: smsReminderOptIn ? (smsPhoneNumber || null) : null,
      notes: notes || null,
      status: status
    };

    registrations.push(regRecord);
    this._saveToStorage('eventregistrations', registrations);
    this._saveToStorage('events', events);

    return {
      success: true,
      registration_id: registrationId,
      status: status,
      registration_datetime: nowIso,
      event_id: eventId,
      event_title: ev.title,
      event_start_datetime: ev.start_datetime,
      time_zone: ev.time_zone || '',
      sms_reminder_opt_in: !!smsReminderOptIn,
      message: status === 'confirmed'
        ? 'Registration confirmed.'
        : 'Event is full or unavailable; you have been waitlisted.'
    };
  }

  // ------------------------
  // VOLUNTEER INTERFACES
  // ------------------------

  searchVolunteerOpportunities(locationType, roleType, startDate, endDate, daysOfWeek, includeShifts) {
    const opportunities = this._getFromStorage('volunteeropportunities');
    const shifts = this._getFromStorage('volunteershifts');

    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    const daysSet = Array.isArray(daysOfWeek) && daysOfWeek.length > 0 ? daysOfWeek : null;
    const include = typeof includeShifts === 'boolean' ? includeShifts : true;

    const results = [];

    for (let i = 0; i < opportunities.length; i++) {
      const opp = opportunities[i];
      if (locationType && opp.location_type !== locationType) {
        continue;
      }
      if (roleType && opp.role_type !== roleType) {
        continue;
      }

      const oppShifts = [];
      for (let j = 0; j < shifts.length; j++) {
        const sh = shifts[j];
        if (sh.opportunity_id !== opp.id) {
          continue;
        }
        const sDate = this._parseDate(sh.start_datetime);
        if (!sDate) {
          continue;
        }
        if (start && sDate < start) {
          continue;
        }
        if (end && sDate > end) {
          continue;
        }
        if (daysSet && daysSet.indexOf(sh.day_of_week) === -1) {
          continue;
        }
        oppShifts.push(sh);
      }

      if (oppShifts.length === 0) {
        continue;
      }

      oppShifts.sort(function (a, b) {
        const da = new Date(a.start_datetime).getTime();
        const db = new Date(b.start_datetime).getTime();
        return da - db;
      });

      const nextShifts = [];
      if (include) {
        for (let k = 0; k < oppShifts.length && k < 3; k++) {
          const sh = oppShifts[k];
          nextShifts.push({
            shift_id: sh.id,
            start_datetime: sh.start_datetime,
            end_datetime: sh.end_datetime,
            day_of_week: sh.day_of_week,
            is_weekend: !!sh.is_weekend,
            remaining_spots: typeof sh.remaining_spots === 'number' ? sh.remaining_spots : null
          });
        }
      }

      results.push({
        opportunity_id: opp.id,
        title: opp.title,
        description: opp.description || '',
        role_type: opp.role_type,
        location_type: opp.location_type,
        location_name: opp.location_name || '',
        city: opp.city || '',
        state: opp.state || '',
        eligibility_notes: opp.eligibility_notes || '',
        next_available_shifts: nextShifts
      });
    }

    return {
      total_results: results.length,
      results: results
    };
  }

  getVolunteerOpportunityDetail(opportunityId) {
    const opportunities = this._getFromStorage('volunteeropportunities');
    const shifts = this._getFromStorage('volunteershifts');
    let opp = null;
    for (let i = 0; i < opportunities.length; i++) {
      if (opportunities[i].id === opportunityId) {
        opp = opportunities[i];
        break;
      }
    }
    if (!opp) {
      return {
        opportunity_id: null,
        title: '',
        description: '',
        role_type: '',
        location_type: '',
        location_name: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        eligibility_notes: '',
        shifts: []
      };
    }

    const oppShifts = [];
    for (let i = 0; i < shifts.length; i++) {
      const sh = shifts[i];
      if (sh.opportunity_id === opp.id) {
        oppShifts.push({
          shift_id: sh.id,
          start_datetime: sh.start_datetime,
          end_datetime: sh.end_datetime,
          day_of_week: sh.day_of_week,
          is_weekend: !!sh.is_weekend,
          max_volunteers: typeof sh.max_volunteers === 'number' ? sh.max_volunteers : null,
          remaining_spots: typeof sh.remaining_spots === 'number' ? sh.remaining_spots : null,
          notes: sh.notes || ''
        });
      }
    }

    oppShifts.sort(function (a, b) {
      const da = new Date(a.start_datetime).getTime();
      const db = new Date(b.start_datetime).getTime();
      return da - db;
    });

    return {
      opportunity_id: opp.id,
      title: opp.title,
      description: opp.description || '',
      role_type: opp.role_type,
      location_type: opp.location_type,
      location_name: opp.location_name || '',
      address_line1: opp.address_line1 || '',
      address_line2: opp.address_line2 || '',
      city: opp.city || '',
      state: opp.state || '',
      postal_code: opp.postal_code || '',
      eligibility_notes: opp.eligibility_notes || '',
      shifts: oppShifts
    };
  }

  signUpForVolunteerShift(
    shiftId,
    opportunityId,
    volunteerName,
    volunteerEmail,
    volunteerPhone,
    preferredRole
  ) {
    const shifts = this._getFromStorage('volunteershifts');
    const opportunities = this._getFromStorage('volunteeropportunities');
    const signups = this._getFromStorage('volunteersignups');

    let shift = null;
    for (let i = 0; i < shifts.length; i++) {
      if (shifts[i].id === shiftId) {
        shift = shifts[i];
        break;
      }
    }
    let opp = null;
    for (let j = 0; j < opportunities.length; j++) {
      if (opportunities[j].id === opportunityId) {
        opp = opportunities[j];
        break;
      }
    }

    const nowIso = new Date().toISOString();

    if (!shift || !opp || shift.opportunity_id !== opportunityId) {
      return {
        success: false,
        signup_id: null,
        status: 'pending',
        signup_datetime: nowIso,
        shift_id: shiftId,
        opportunity_id: opportunityId,
        message: 'Shift or opportunity not found.'
      };
    }

    let status = 'confirmed';
    if (typeof shift.remaining_spots === 'number') {
      if (shift.remaining_spots <= 0) {
        status = 'waitlisted';
      } else {
        shift.remaining_spots = shift.remaining_spots - 1;
      }
    }

    const signupId = this._generateId('volsignup');
    const signupRecord = {
      id: signupId,
      shift_id: shiftId,
      opportunity_id: opportunityId,
      volunteer_name: volunteerName,
      volunteer_email: volunteerEmail,
      volunteer_phone: volunteerPhone || null,
      preferred_role: preferredRole,
      signup_datetime: nowIso,
      status: status
    };

    signups.push(signupRecord);
    this._saveToStorage('volunteersignups', signups);
    this._saveToStorage('volunteershifts', shifts);

    return {
      success: true,
      signup_id: signupId,
      status: status,
      signup_datetime: nowIso,
      shift_id: shiftId,
      opportunity_id: opportunityId,
      message: status === 'confirmed' ? 'Volunteer shift confirmed.' : 'Shift is full; you have been waitlisted.'
    };
  }

  // ------------------------
  // FINANCIAL ASSISTANCE INTERFACES
  // ------------------------

  getFinancialAssistanceConfig() {
    return {
      assistance_overview: 'Financial assistance programs may help with transportation to treatment, medication costs, and other cancer-related expenses. Eligibility is typically based on diagnosis, location, and household income.',
      applicant_type_options: [
        { value: 'patients', label: 'Patients' },
        { value: 'caregivers', label: 'Caregivers' },
        { value: 'family_members', label: 'Family members' }
      ],
      income_range_options: [
        { value: 'under_20000', label: 'Under $20,000', min: 0, max: 19999 },
        { value: '20000_29999', label: '$20,0003029,999', min: 20000, max: 29999 },
        { value: '30000_39999', label: '$30,0003039,999', min: 30000, max: 39999 },
        { value: '40000_49999', label: '$40,0003а49,999', min: 40000, max: 49999 },
        { value: '50000_59999', label: '$50,0003а59,999', min: 50000, max: 59999 },
        { value: '60000_and_above', label: '$60,000 and above', min: 60000, max: 1000000 }
      ],
      assistance_type_options: [
        { value: 'transportation_to_treatment', label: 'Transportation to treatment' },
        { value: 'medication_costs', label: 'Medication costs' },
        { value: 'other', label: 'Other expenses' }
      ]
    };
  }

  searchFinancialPrograms(applicantType, incomeMax, incomeRange, assistanceTypes, openForApplicationsOnly) {
    const programs = this._getFromStorage('financialprograms');
    const results = [];

    const incomeMaxVal = typeof incomeMax === 'number' ? incomeMax : null;
    const assistanceSet = Array.isArray(assistanceTypes) && assistanceTypes.length > 0 ? assistanceTypes : null;
    const openOnly = typeof openForApplicationsOnly === 'boolean' ? openForApplicationsOnly : true;

    // Derive numeric income range filters (if provided) from incomeRange code
    let rangeMin = null;
    let rangeMax = null;
    if (typeof incomeRange === 'string' && incomeRange) {
      if (incomeRange.indexOf('under_') === 0) {
        const maxStr = incomeRange.substring('under_'.length);
        const maxNum = parseInt(maxStr, 10);
        if (!isNaN(maxNum)) {
          rangeMax = maxNum;
        }
      } else if (incomeRange.indexOf('_and_above') !== -1) {
        const minStr = incomeRange.split('_')[0];
        const minNum = parseInt(minStr, 10);
        if (!isNaN(minNum)) {
          rangeMin = minNum;
        }
      } else if (incomeRange.indexOf('_') !== -1) {
        const parts = incomeRange.split('_');
        const minNum = parseInt(parts[0], 10);
        const maxNum = parseInt(parts[1], 10);
        if (!isNaN(minNum)) {
          rangeMin = minNum;
        }
        if (!isNaN(maxNum)) {
          rangeMax = maxNum;
        }
      }
    }

    for (let i = 0; i < programs.length; i++) {
      const p = programs[i];
      if (openOnly && !p.is_open_for_applications) {
        continue;
      }
      if (applicantType && Array.isArray(p.applicant_types) && p.applicant_types.length > 0) {
        if (p.applicant_types.indexOf(applicantType) === -1) {
          continue;
        }
      }
      if (incomeMaxVal !== null) {
        if (typeof p.income_max === 'number' && p.income_max > incomeMaxVal) {
          continue;
        }
      }
      if (rangeMin !== null || rangeMax !== null) {
        const pMin = typeof p.income_min === 'number' ? p.income_min : 0;
        const pMax = typeof p.income_max === 'number' ? p.income_max : Infinity;
        if (rangeMax !== null && pMin > rangeMax) {
          continue;
        }
        if (rangeMin !== null && pMax < rangeMin) {
          continue;
        }
      }
      if (assistanceSet && Array.isArray(p.assistance_types) && p.assistance_types.length > 0) {
        let match = false;
        for (let j = 0; j < assistanceSet.length; j++) {
          if (p.assistance_types.indexOf(assistanceSet[j]) !== -1) {
            match = true;
            break;
          }
        }
        if (!match) {
          continue;
        }
      }

      results.push({
        program_id: p.id,
        name: p.name,
        short_description: p.short_description || '',
        applicant_types: p.applicant_types || [],
        income_min: typeof p.income_min === 'number' ? p.income_min : null,
        income_max: typeof p.income_max === 'number' ? p.income_max : null,
        income_range_label: p.income_range_label || '',
        assistance_types: p.assistance_types || [],
        covers_transportation: !!p.covers_transportation,
        covers_medication: !!p.covers_medication,
        is_open_for_applications: !!p.is_open_for_applications
      });
    }

    return {
      total_results: results.length,
      results: results
    };
  }

  getFinancialProgramDetail(programId) {
    const programs = this._getFromStorage('financialprograms');
    let p = null;
    for (let i = 0; i < programs.length; i++) {
      if (programs[i].id === programId) {
        p = programs[i];
        break;
      }
    }
    if (!p) {
      return {
        program_id: null,
        name: '',
        short_description: '',
        full_description: '',
        applicant_types: [],
        income_min: null,
        income_max: null,
        income_range_label: '',
        assistance_types: [],
        covers_transportation: false,
        covers_medication: false,
        is_open_for_applications: false,
        contact_email: '',
        notes: '',
        application_requirements: ''
      };
    }
    return {
      program_id: p.id,
      name: p.name,
      short_description: p.short_description || '',
      full_description: p.full_description || '',
      applicant_types: p.applicant_types || [],
      income_min: typeof p.income_min === 'number' ? p.income_min : null,
      income_max: typeof p.income_max === 'number' ? p.income_max : null,
      income_range_label: p.income_range_label || '',
      assistance_types: p.assistance_types || [],
      covers_transportation: !!p.covers_transportation,
      covers_medication: !!p.covers_medication,
      is_open_for_applications: !!p.is_open_for_applications,
      contact_email: p.contact_email || '',
      notes: p.notes || '',
      application_requirements: p.application_requirements || ''
    };
  }

  submitFinancialApplication(
    programId,
    applicantRole,
    annualHouseholdIncome,
    incomeRange,
    patientName,
    patientCity,
    patientState,
    requestedAssistanceTypes,
    descriptionOfNeeds
  ) {
    const programs = this._getFromStorage('financialprograms');
    let p = null;
    for (let i = 0; i < programs.length; i++) {
      if (programs[i].id === programId) {
        p = programs[i];
        break;
      }
    }
    const nowIso = new Date().toISOString();
    if (!p) {
      return {
        success: false,
        application_id: null,
        status: 'submitted',
        submitted_at: nowIso,
        program_id: programId,
        message: 'Program not found.'
      };
    }

    const apps = this._getFromStorage('financialapplications');
    const appId = this._generateId('finapp');

    const appRecord = {
      id: appId,
      program_id: programId,
      applicant_role: applicantRole,
      annual_household_income: annualHouseholdIncome,
      income_range: incomeRange,
      patient_name: patientName,
      patient_city: patientCity,
      patient_state: patientState,
      requested_assistance_types: requestedAssistanceTypes || [],
      description_of_needs: descriptionOfNeeds || '',
      submitted_at: nowIso,
      status: 'submitted'
    };

    apps.push(appRecord);
    this._saveToStorage('financialapplications', apps);

    return {
      success: true,
      application_id: appId,
      status: 'submitted',
      submitted_at: nowIso,
      program_id: programId,
      message: 'Application submitted successfully.'
    };
  }

  // ------------------------
  // SUPPORT GROUP INTERFACES
  // ------------------------

  getSupportGroupsConfig() {
    return {
      audience_options: [
        { value: 'caregivers', label: 'Caregivers' },
        { value: 'patients', label: 'Patients' },
        { value: 'family_members', label: 'Family members' },
        { value: 'mixed', label: 'Mixed' }
      ],
      relationship_focus_options: [
        { value: 'children_pediatric', label: 'Children / Pediatric patients' },
        { value: 'spouses_partners', label: 'Spouses / Partners' },
        { value: 'parents', label: 'Parents' },
        { value: 'siblings', label: 'Siblings' },
        { value: 'general', label: 'General' }
      ],
      cancer_type_options: [
        { value: 'leukemia', label: 'Leukemia' },
        { value: 'childhood_leukemia', label: 'Childhood Leukemia' },
        { value: 'breast_cancer', label: 'Breast Cancer' },
        { value: 'lymphoma', label: 'Lymphoma' },
        { value: 'all_cancers', label: 'All Cancers' }
      ],
      format_options: [
        { value: 'online', label: 'Online' },
        { value: 'in_person', label: 'In-person' },
        { value: 'hybrid', label: 'Hybrid' }
      ],
      meeting_frequency_options: [
        { value: 'weekly', label: 'Weekly' },
        { value: 'biweekly', label: 'Every other week' },
        { value: 'monthly', label: 'Monthly' },
        { value: 'one_time', label: 'One-time' }
      ],
      sort_options: [
        { value: 'member_count_desc', label: 'Most members' },
        { value: 'name_asc', label: 'Name A5Z' }
      ]
    };
  }

  searchSupportGroups(audience, relationshipFocus, cancerType, format, meetingFrequency, sortBy) {
    const groups = this._getFromStorage('supportgroups');
    const results = [];

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (audience && g.audience !== audience) {
        continue;
      }
      if (relationshipFocus && g.relationship_focus !== relationshipFocus) {
        continue;
      }
      if (format && g.format !== format) {
        continue;
      }
      if (meetingFrequency && g.meeting_frequency !== meetingFrequency) {
        continue;
      }
      if (cancerType && !this._matchesCancerTypeFilter(g.cancer_types, cancerType)) {
        continue;
      }

      results.push({
        support_group_id: g.id,
        name: g.name,
        description: g.description || '',
        audience: g.audience,
        relationship_focus: g.relationship_focus,
        cancer_types: g.cancer_types || [],
        format: g.format,
        meeting_frequency: g.meeting_frequency,
        meeting_day_of_week: g.meeting_day_of_week || '',
        typical_meeting_time: g.typical_meeting_time || '',
        platform: g.platform || '',
        member_count: typeof g.member_count === 'number' ? g.member_count : 0,
        is_open_to_new_members: !!g.is_open_to_new_members
      });
    }

    const sortKey = sortBy || 'member_count_desc';
    if (sortKey === 'name_asc') {
      results.sort(function (a, b) {
        return a.name.localeCompare(b.name);
      });
    } else if (sortKey === 'member_count_desc') {
      results.sort(function (a, b) {
        return b.member_count - a.member_count;
      });
    }

    return {
      total_results: results.length,
      results: results
    };
  }

  getSupportGroupDetail(supportGroupId) {
    const groups = this._getFromStorage('supportgroups');
    let g = null;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].id === supportGroupId) {
        g = groups[i];
        break;
      }
    }

    if (!g) {
      return {
        support_group_id: null,
        name: '',
        description: '',
        audience: '',
        relationship_focus: '',
        cancer_types: [],
        format: '',
        meeting_frequency: '',
        meeting_day_of_week: '',
        typical_meeting_time: '',
        platform: '',
        member_count: 0,
        is_open_to_new_members: false,
        contact_email: '',
        guidelines: ''
      };
    }

    return {
      support_group_id: g.id,
      name: g.name,
      description: g.description || '',
      audience: g.audience,
      relationship_focus: g.relationship_focus,
      cancer_types: g.cancer_types || [],
      format: g.format,
      meeting_frequency: g.meeting_frequency,
      meeting_day_of_week: g.meeting_day_of_week || '',
      typical_meeting_time: g.typical_meeting_time || '',
      platform: g.platform || '',
      member_count: typeof g.member_count === 'number' ? g.member_count : 0,
      is_open_to_new_members: !!g.is_open_to_new_members,
      contact_email: g.contact_email || '',
      guidelines: g.guidelines || ''
    };
  }

  submitSupportGroupJoinRequest(supportGroupId, requesterName, requesterEmail, message) {
    const groups = this._getFromStorage('supportgroups');
    let g = null;
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].id === supportGroupId) {
        g = groups[i];
        break;
      }
    }
    const nowIso = new Date().toISOString();
    if (!g) {
      return {
        success: false,
        join_request_id: null,
        status: 'submitted',
        submitted_at: nowIso,
        support_group_id: supportGroupId,
        message: 'Support group not found.'
      };
    }

    const joinRequests = this._getFromStorage('supportgroupjoinrequests');
    const joinId = this._generateId('sgjoin');

    const status = g.is_open_to_new_members ? 'submitted' : 'waitlisted';

    const reqRecord = {
      id: joinId,
      support_group_id: supportGroupId,
      requester_name: requesterName,
      requester_email: requesterEmail,
      message: message || '',
      submitted_at: nowIso,
      status: status
    };

    joinRequests.push(reqRecord);
    this._saveToStorage('supportgroupjoinrequests', joinRequests);

    return {
      success: true,
      join_request_id: joinId,
      status: status,
      submitted_at: nowIso,
      support_group_id: supportGroupId,
      message: status === 'submitted'
        ? 'Join request submitted. The facilitator will contact you.'
        : 'This group is currently full; your request has been waitlisted.'
    };
  }

  // ------------------------
  // EDUCATION / ARTICLES INTERFACES
  // ------------------------

  getEducationResourcesConfig() {
    const articles = this._getFromStorage('articles');
    const yearSet = {};
    for (let i = 0; i < articles.length; i++) {
      const y = this._getYearFromDateString(articles[i].publication_date);
      if (y) {
        yearSet[y] = true;
      }
    }
    const years = Object.keys(yearSet)
      .map(function (x) { return parseInt(x, 10); })
      .filter(function (x) { return !isNaN(x); })
      .sort(function (a, b) { return b - a; });

    const publicationYearOptions = [];
    for (let i = 0; i < years.length; i++) {
      publicationYearOptions.push({ year: years[i], label: String(years[i]) });
    }

    return {
      audience_options: [
        { value: 'adult_patients', label: 'Adult patients' },
        { value: 'caregivers', label: 'Caregivers' },
        { value: 'children', label: 'Children' },
        { value: 'teens', label: 'Teens' },
        { value: 'all_audiences', label: 'All audiences' }
      ],
      publication_year_options: publicationYearOptions,
      content_type_options: [
        { value: 'article', label: 'Articles' },
        { value: 'guide', label: 'Guides' },
        { value: 'video', label: 'Videos' },
        { value: 'podcast', label: 'Podcasts' },
        { value: 'factsheet', label: 'Fact sheets' }
      ],
      sort_options: [
        { value: 'newest_first', label: 'Newest first' },
        { value: 'oldest_first', label: 'Oldest first' }
      ]
    };
  }

  searchArticles(query, audience, minPublicationYear, contentTypes, sortBy) {
    const articles = this._getFromStorage('articles');
    const q = query ? String(query).toLowerCase() : null;
    const minYear = typeof minPublicationYear === 'number' ? minPublicationYear : null;
    const contentSet = Array.isArray(contentTypes) && contentTypes.length > 0 ? contentTypes : null;

    const results = [];

    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (audience && a.audience !== audience) {
        continue;
      }
      const year = this._getYearFromDateString(a.publication_date);
      if (minYear && year && year < minYear) {
        continue;
      }
      if (contentSet && contentSet.indexOf(a.content_type) === -1) {
        continue;
      }
      if (q) {
        let inText = false;
        if (a.title && a.title.toLowerCase().indexOf(q) !== -1) {
          inText = true;
        }
        if (!inText && a.summary && a.summary.toLowerCase().indexOf(q) !== -1) {
          inText = true;
        }
        if (!inText && a.body && a.body.toLowerCase().indexOf(q) !== -1) {
          inText = true;
        }
        if (!inText && a.tags && Array.isArray(a.tags)) {
          for (let t = 0; t < a.tags.length; t++) {
            if (String(a.tags[t]).toLowerCase().indexOf(q) !== -1) {
              inText = true;
              break;
            }
          }
        }
        if (!inText) {
          continue;
        }
      }

      results.push({
        article_id: a.id,
        title: a.title,
        summary: a.summary || '',
        publication_date: a.publication_date,
        audience: a.audience,
        content_type: a.content_type,
        tags: a.tags || [],
        reading_time_minutes: typeof a.reading_time_minutes === 'number' ? a.reading_time_minutes : null,
        url: a.url || ''
      });
    }

    const sortKey = sortBy || 'newest_first';
    if (sortKey === 'oldest_first') {
      results.sort(function (a, b) {
        return new Date(a.publication_date).getTime() - new Date(b.publication_date).getTime();
      });
    } else {
      results.sort(function (a, b) {
        return new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime();
      });
    }

    return {
      total_results: results.length,
      results: results
    };
  }

  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    let a = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        a = articles[i];
        break;
      }
    }
    if (!a) {
      return {
        article_id: null,
        title: '',
        summary: '',
        body: '',
        publication_date: '',
        audience: '',
        content_type: '',
        cancer_types: [],
        tags: [],
        reading_time_minutes: null,
        is_featured: false,
        url: ''
      };
    }
    return {
      article_id: a.id,
      title: a.title,
      summary: a.summary || '',
      body: a.body || '',
      publication_date: a.publication_date,
      audience: a.audience,
      content_type: a.content_type,
      cancer_types: a.cancer_types || [],
      tags: a.tags || [],
      reading_time_minutes: typeof a.reading_time_minutes === 'number' ? a.reading_time_minutes : null,
      is_featured: !!a.is_featured,
      url: a.url || ''
    };
  }

  saveArticleToReadingList(articleId) {
    const articles = this._getFromStorage('articles');
    let a = null;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].id === articleId) {
        a = articles[i];
        break;
      }
    }
    const nowIso = new Date().toISOString();
    if (!a) {
      return {
        success: false,
        reading_list_id: null,
        reading_list_name: '',
        item_id: null,
        article_id: articleId,
        saved_at: null,
        total_items: 0,
        message: 'Article not found.'
      };
    }

    const list = this._getOrCreateReadingList();
    let items = this._getFromStorage('readinglistitems');

    let exists = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].reading_list_id === list.id && items[i].article_id === articleId) {
        exists = true;
        return {
          success: true,
          reading_list_id: list.id,
          reading_list_name: list.name || '',
          item_id: items[i].id,
          article_id: articleId,
          saved_at: items[i].saved_at,
          total_items: items.length,
          message: 'Article already in reading list.'
        };
      }
    }

    if (!exists) {
      const itemId = this._generateId('rlitem');
      const orderIndex = items.length;
      const newItem = {
        id: itemId,
        reading_list_id: list.id,
        article_id: articleId,
        saved_at: nowIso,
        order_index: orderIndex
      };
      items.push(newItem);
      this._saveToStorage('readinglistitems', items);

      return {
        success: true,
        reading_list_id: list.id,
        reading_list_name: list.name || '',
        item_id: itemId,
        article_id: articleId,
        saved_at: nowIso,
        total_items: items.length,
        message: 'Article saved to reading list.'
      };
    }
  }

  getReadingListItems() {
    const list = this._getOrCreateReadingList();
    const items = this._getFromStorage('readinglistitems');
    const articles = this._getFromStorage('articles');

    const filtered = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.reading_list_id !== list.id) {
        continue;
      }
      let art = null;
      for (let j = 0; j < articles.length; j++) {
        if (articles[j].id === it.article_id) {
          art = articles[j];
          break;
        }
      }
      filtered.push({
        item_id: it.id,
        article_id: it.article_id,
        article_title: art ? art.title : '',
        article_summary: art ? (art.summary || '') : '',
        publication_date: art ? art.publication_date : '',
        saved_at: it.saved_at,
        order_index: typeof it.order_index === 'number' ? it.order_index : null,
        // Foreign key resolution: full article
        article: art || null
      });
    }

    filtered.sort(function (a, b) {
      const ai = typeof a.order_index === 'number' ? a.order_index : 0;
      const bi = typeof b.order_index === 'number' ? b.order_index : 0;
      return ai - bi;
    });

    return {
      reading_list_id: list.id,
      reading_list_name: list.name || '',
      created_at: list.created_at,
      items: filtered
    };
  }

  // ------------------------
  // GIFT CATALOG / DONATION CART INTERFACES
  // ------------------------

  getGiftCatalogConfig() {
    const categories = this._getFromStorage('giftcategories');
    const openCart = this._getOpenDonationCart();
    const cartItems = this._getFromStorage('donationcartitems');

    let itemCount = 0;
    let totalAmount = 0;
    if (openCart) {
      for (let i = 0; i < cartItems.length; i++) {
        if (cartItems[i].cart_id === openCart.id) {
          itemCount += cartItems[i].quantity;
          totalAmount += cartItems[i].line_total;
        }
      }
    }

    const categoryOptions = [];
    for (let i = 0; i < categories.length; i++) {
      const c = categories[i];
      categoryOptions.push({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description || ''
      });
    }

    const priceFilterOptions = [
      { label: 'Up to $30', max_price: 30 },
      { label: 'Up to $50', max_price: 50 },
      { label: 'Up to $100', max_price: 100 }
    ];

    return {
      category_options: categoryOptions,
      price_filter_options: priceFilterOptions,
      cart_summary: {
        has_open_cart: !!openCart,
        item_count: itemCount,
        total_amount: totalAmount
      }
    };
  }

  listGiftItems(categoryId, maxPrice, onlyActive) {
    const items = this._getFromStorage('giftitems');
    const categories = this._getFromStorage('giftcategories');
    const results = [];
    const max = typeof maxPrice === 'number' ? maxPrice : null;
    const activeOnly = typeof onlyActive === 'boolean' ? onlyActive : true;

    for (let i = 0; i < items.length; i++) {
      const gi = items[i];
      if (categoryId && gi.category_id !== categoryId) {
        continue;
      }
      if (max !== null && gi.price > max) {
        continue;
      }
      if (activeOnly && !gi.is_active) {
        continue;
      }
      let cat = null;
      for (let j = 0; j < categories.length; j++) {
        if (categories[j].id === gi.category_id) {
          cat = categories[j];
          break;
        }
      }
      results.push({
        gift_item_id: gi.id,
        name: gi.name,
        description: gi.description || '',
        impact_statement: gi.impact_statement || '',
        price: gi.price,
        is_active: !!gi.is_active,
        image_url: gi.image_url || '',
        category_id: gi.category_id,
        category_code: cat ? cat.code : '',
        category_name: cat ? cat.name : ''
      });
    }

    return {
      total_results: results.length,
      results: results
    };
  }

  getGiftItemDetail(giftItemId) {
    const items = this._getFromStorage('giftitems');
    const categories = this._getFromStorage('giftcategories');
    let gi = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === giftItemId) {
        gi = items[i];
        break;
      }
    }
    if (!gi) {
      return {
        gift_item_id: null,
        name: '',
        description: '',
        impact_statement: '',
        price: 0,
        is_active: false,
        image_url: '',
        category_id: '',
        category_code: '',
        category_name: '',
        max_quantity_per_order: null
      };
    }
    let cat = null;
    for (let j = 0; j < categories.length; j++) {
      if (categories[j].id === gi.category_id) {
        cat = categories[j];
        break;
      }
    }
    return {
      gift_item_id: gi.id,
      name: gi.name,
      description: gi.description || '',
      impact_statement: gi.impact_statement || '',
      price: gi.price,
      is_active: !!gi.is_active,
      image_url: gi.image_url || '',
      category_id: gi.category_id,
      category_code: cat ? cat.code : '',
      category_name: cat ? cat.name : '',
      max_quantity_per_order: typeof gi.max_quantity_per_order === 'number' ? gi.max_quantity_per_order : null
    };
  }

  addGiftItemToDonationCart(giftItemId, quantity) {
    const qty = quantity || 1;
    const items = this._getFromStorage('giftitems');
    let gi = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === giftItemId) {
        gi = items[i];
        break;
      }
    }
    if (!gi || !gi.is_active) {
      return {
        success: false,
        cart_id: null,
        item_id: null,
        gift_item_id: giftItemId,
        quantity: 0,
        unit_price: 0,
        line_total: 0,
        cart_item_count: 0,
        cart_total_amount: 0,
        message: 'Gift item not found or inactive.'
      };
    }

    const cart = this._getOrCreateDonationCart();
    let cartItems = this._getFromStorage('donationcartitems');
    let existingItem = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id && cartItems[i].gift_item_id === giftItemId) {
        existingItem = cartItems[i];
        break;
      }
    }

    const unitPrice = gi.price;
    const nowQty = qty;

    if (existingItem) {
      existingItem.quantity += nowQty;
      existingItem.line_total = existingItem.unit_price * existingItem.quantity;
    } else {
      const newItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        gift_item_id: giftItemId,
        quantity: nowQty,
        unit_price: unitPrice,
        line_total: unitPrice * nowQty,
        category_snapshot: ''
      };
      cartItems.push(newItem);
      existingItem = newItem;
    }

    this._saveToStorage('donationcartitems', cartItems);
    this._recalculateCartTotals(cart.id);

    const updatedCart = this._getOpenDonationCart();
    let totalCount = 0;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id) {
        totalCount += cartItems[i].quantity;
      }
    }

    return {
      success: true,
      cart_id: cart.id,
      item_id: existingItem.id,
      gift_item_id: giftItemId,
      quantity: existingItem.quantity,
      unit_price: existingItem.unit_price,
      line_total: existingItem.line_total,
      cart_item_count: totalCount,
      cart_total_amount: updatedCart ? updatedCart.total_amount : 0,
      message: 'Item added to donation cart.'
    };
  }

  getDonationCart() {
    const cart = this._getOpenDonationCart();
    const cartItems = this._getFromStorage('donationcartitems');
    const giftItems = this._getFromStorage('giftitems');
    const categories = this._getFromStorage('giftcategories');

    if (!cart) {
      return {
        cart_id: null,
        status: 'open',
        total_amount: 0,
        items: [],
        can_checkout: false
      };
    }

    const items = [];
    for (let i = 0; i < cartItems.length; i++) {
      const ci = cartItems[i];
      if (ci.cart_id !== cart.id) {
        continue;
      }
      let gi = null;
      for (let j = 0; j < giftItems.length; j++) {
        if (giftItems[j].id === ci.gift_item_id) {
          gi = giftItems[j];
          break;
        }
      }
      let cat = null;
      if (gi) {
        for (let k = 0; k < categories.length; k++) {
          if (categories[k].id === gi.category_id) {
            cat = categories[k];
            break;
          }
        }
      }
      items.push({
        cart_item_id: ci.id,
        gift_item_id: ci.gift_item_id,
        gift_item_name: gi ? gi.name : '',
        category_name: cat ? cat.name : '',
        unit_price: ci.unit_price,
        quantity: ci.quantity,
        line_total: ci.line_total,
        // Foreign key resolution: full gift item
        gift_item: gi || null
      });
    }

    const canCheckout = cart.status === 'open' && items.length > 0;

    return {
      cart_id: cart.id,
      status: cart.status,
      total_amount: cart.total_amount,
      items: items,
      can_checkout: canCheckout
    };
  }

  updateDonationCartItem(cartItemId, quantity) {
    let cartItems = this._getFromStorage('donationcartitems');
    const carts = this._getFromStorage('donationcarts');
    let item = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        item = cartItems[i];
        break;
      }
    }
    if (!item) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: cartItemId,
        quantity: 0,
        line_total: 0,
        total_amount: 0,
        message: 'Cart item not found.'
      };
    }

    const cartId = item.cart_id;
    if (quantity <= 0) {
      // Remove item
      cartItems = cartItems.filter(function (ci) { return ci.id !== cartItemId; });
      this._saveToStorage('donationcartitems', cartItems);
      this._recalculateCartTotals(cartId);
    } else {
      item.quantity = quantity;
      item.line_total = item.unit_price * item.quantity;
      this._saveToStorage('donationcartitems', cartItems);
      this._recalculateCartTotals(cartId);
    }

    let cart = null;
    for (let j = 0; j < carts.length; j++) {
      if (carts[j].id === cartId) {
        cart = carts[j];
        break;
      }
    }

    return {
      success: true,
      cart_id: cartId,
      cart_item_id: cartItemId,
      quantity: quantity > 0 ? quantity : 0,
      line_total: quantity > 0 ? item.unit_price * quantity : 0,
      total_amount: cart ? cart.total_amount : 0,
      message: quantity > 0 ? 'Cart item updated.' : 'Cart item removed.'
    };
  }

  removeDonationCartItem(cartItemId) {
    let cartItems = this._getFromStorage('donationcartitems');
    let cartId = null;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].id === cartItemId) {
        cartId = cartItems[i].cart_id;
        break;
      }
    }

    if (!cartId) {
      return {
        success: false,
        cart_id: null,
        cart_item_id: cartItemId,
        total_amount: 0,
        remaining_item_count: cartItems.length,
        message: 'Cart item not found.'
      };
    }

    cartItems = cartItems.filter(function (ci) { return ci.id !== cartItemId; });
    this._saveToStorage('donationcartitems', cartItems);
    this._recalculateCartTotals(cartId);

    const carts = this._getFromStorage('donationcarts');
    let cart = null;
    for (let j = 0; j < carts.length; j++) {
      if (carts[j].id === cartId) {
        cart = carts[j];
        break;
      }
    }

    let remainingCount = 0;
    for (let k = 0; k < cartItems.length; k++) {
      if (cartItems[k].cart_id === cartId) {
        remainingCount++;
      }
    }

    return {
      success: true,
      cart_id: cartId,
      cart_item_id: cartItemId,
      total_amount: cart ? cart.total_amount : 0,
      remaining_item_count: remainingCount,
      message: 'Cart item removed.'
    };
  }

  checkoutDonationCart(
    donorName,
    donorEmail,
    wantsEmailUpdates,
    paymentMethodType,
    cardNumber,
    cardExpMonth,
    cardExpYear,
    cardCvc,
    billingZip
  ) {
    const cart = this._getOpenDonationCart();
    const nowIso = new Date().toISOString();

    if (!cart) {
      return {
        success: false,
        donation_id: null,
        payment_transaction_id: null,
        status: 'failed',
        total_amount: 0,
        message: 'No open cart to checkout.'
      };
    }

    const cartItems = this._getFromStorage('donationcartitems');
    let hasItems = false;
    for (let i = 0; i < cartItems.length; i++) {
      if (cartItems[i].cart_id === cart.id) {
        hasItems = true;
        break;
      }
    }
    if (!hasItems) {
      return {
        success: false,
        donation_id: null,
        payment_transaction_id: null,
        status: 'failed',
        total_amount: 0,
        message: 'Your cart is empty.'
      };
    }

    if (!donorName) {
      return {
        success: false,
        donation_id: null,
        payment_transaction_id: null,
        status: 'failed',
        total_amount: cart.total_amount,
        message: 'Donor name is required.'
      };
    }

    // Payment transaction
    let paymentTransactions = this._getFromStorage('paymenttransactions');
    const paymentId = this._generateId('payment');

    let cardBrand = null;
    let cardLast4 = null;
    let expMonth = null;
    let expYear = null;
    let billingZipVal = billingZip || null;

    if (paymentMethodType === 'credit_card' && cardNumber) {
      const num = String(cardNumber);
      cardLast4 = num.substring(num.length - 4);
      const firstDigit = num.charAt(0);
      if (firstDigit === '4') {
        cardBrand = 'visa';
      } else if (firstDigit === '5') {
        cardBrand = 'mastercard';
      } else if (firstDigit === '3') {
        cardBrand = 'amex';
      } else if (firstDigit === '6') {
        cardBrand = 'discover';
      } else {
        cardBrand = 'other';
      }
      expMonth = cardExpMonth || null;
      expYear = cardExpYear || null;
    }

    const paymentStatus = 'succeeded';

    const paymentRecord = {
      id: paymentId,
      payment_method_type: paymentMethodType,
      card_brand: cardBrand,
      card_last4: cardLast4,
      card_exp_month: expMonth,
      card_exp_year: expYear,
      billing_zip: billingZipVal,
      amount: cart.total_amount,
      currency: 'usd',
      status: paymentStatus,
      processed_at: nowIso,
      error_message: paymentStatus === 'failed' ? 'Payment failed.' : null
    };

    paymentTransactions.push(paymentRecord);
    this._saveToStorage('paymenttransactions', paymentTransactions);

    // Donation for gift catalog
    const donations = this._getFromStorage('donations');
    const donationId = this._generateId('donation');

    const funds = this._getFromStorage('donationfunds');
    let fundId = null;
    for (let i = 0; i < funds.length; i++) {
      if (funds[i].code === 'gift_catalog') {
        fundId = funds[i].id;
        break;
      }
    }
    if (!fundId && funds.length > 0) {
      fundId = funds[0].id;
    }
    if (!fundId) {
      fundId = 'unknown_fund';
    }

    const donationRecord = {
      id: donationId,
      amount: cart.total_amount,
      currency: 'usd',
      frequency: 'one_time',
      fund_id: fundId,
      designation_note: 'Gift catalog donation',
      dedication_type: 'none',
      honoree_name: null,
      donor_name: donorName,
      donor_email: donorEmail || null,
      wants_email_updates: !!wantsEmailUpdates,
      payment_method_type: paymentMethodType,
      payment_transaction_id: paymentId,
      is_from_gift_catalog: true,
      cart_id: cart.id,
      status: paymentStatus === 'succeeded' ? 'completed' : 'failed',
      created_at: nowIso
    };

    donations.push(donationRecord);
    this._saveToStorage('donations', donations);

    // Update cart status
    let carts = this._getFromStorage('donationcarts');
    for (let i = 0; i < carts.length; i++) {
      if (carts[i].id === cart.id) {
        carts[i].status = 'checked_out';
        carts[i].updated_at = nowIso;
        break;
      }
    }
    this._saveToStorage('donationcarts', carts);

    return {
      success: paymentStatus === 'succeeded',
      donation_id: donationId,
      payment_transaction_id: paymentId,
      status: paymentStatus === 'succeeded' ? 'completed' : 'failed',
      total_amount: cart.total_amount,
      message: paymentStatus === 'succeeded'
        ? 'Thank you for your gift catalog donation.'
        : 'We were unable to process your gift catalog donation.'
    };
  }

  // ------------------------
  // STORIES INTERFACES
  // ------------------------

  getStoriesConfig() {
    const stories = this._getFromStorage('stories');
    const yearSet = {};
    for (let i = 0; i < stories.length; i++) {
      const y = stories[i].year || this._getYearFromDateString(stories[i].publication_date);
      if (y) {
        yearSet[y] = true;
      }
    }
    const years = Object.keys(yearSet)
      .map(function (x) { return parseInt(x, 10); })
      .filter(function (x) { return !isNaN(x); })
      .sort(function (a, b) { return b - a; });

    const yearOptions = [];
    for (let i = 0; i < years.length; i++) {
      yearOptions.push({ year: years[i], label: String(years[i]) });
    }

    return {
      cancer_type_options: [
        { value: 'lymphoma', label: 'Lymphoma' },
        { value: 'breast_cancer', label: 'Breast Cancer' },
        { value: 'leukemia', label: 'Leukemia' },
        { value: 'childhood_leukemia', label: 'Childhood Leukemia' },
        { value: 'all_cancers', label: 'All Cancers' }
      ],
      age_group_options: [
        { value: 'young_adult_18_30', label: 'Young adult (183030)' },
        { value: 'adult_31_50', label: 'Adult (313а50)' },
        { value: 'older_adult_51_plus', label: 'Older adult (51+)' },
        { value: 'child', label: 'Child' },
        { value: 'teen', label: 'Teen' },
        { value: 'all_ages', label: 'All ages' }
      ],
      year_options: yearOptions,
      sort_options: [
        { value: 'newest_first', label: 'Newest first' },
        { value: 'oldest_first', label: 'Oldest first' }
      ]
    };
  }

  searchStories(cancerType, ageGroup, year, sortBy) {
    const stories = this._getFromStorage('stories');
    const results = [];

    const filterYear = typeof year === 'number' ? year : null;

    for (let i = 0; i < stories.length; i++) {
      const s = stories[i];
      if (!s.is_published) {
        continue;
      }
      if (cancerType && s.cancer_type !== cancerType) {
        continue;
      }
      if (ageGroup && s.age_group !== ageGroup) {
        continue;
      }
      const storyYear = s.year || this._getYearFromDateString(s.publication_date);
      if (filterYear && storyYear !== filterYear) {
        continue;
      }

      results.push({
        story_id: s.id,
        title: s.title,
        author_name: s.author_name || '',
        cancer_type: s.cancer_type,
        age_group: s.age_group,
        publication_date: s.publication_date,
        year: storyYear,
        tags: s.tags || [],
        hero_image_url: s.hero_image_url || '',
        is_published: !!s.is_published
      });
    }

    const sortKey = sortBy || 'newest_first';
    if (sortKey === 'oldest_first') {
      results.sort(function (a, b) {
        return new Date(a.publication_date).getTime() - new Date(b.publication_date).getTime();
      });
    } else {
      results.sort(function (a, b) {
        return new Date(b.publication_date).getTime() - new Date(a.publication_date).getTime();
      });
    }

    return {
      total_results: results.length,
      results: results
    };
  }

  getStoryDetail(storyId) {
    const stories = this._getFromStorage('stories');
    let s = null;
    for (let i = 0; i < stories.length; i++) {
      if (stories[i].id === storyId) {
        s = stories[i];
        break;
      }
    }
    if (!s) {
      return {
        story_id: null,
        title: '',
        author_name: '',
        body: '',
        cancer_type: '',
        age_group: '',
        publication_date: '',
        year: null,
        tags: [],
        hero_image_url: '',
        is_published: false,
        url: '',
        related_story_ids: []
      };
    }
    return {
      story_id: s.id,
      title: s.title,
      author_name: s.author_name || '',
      body: s.body || '',
      cancer_type: s.cancer_type,
      age_group: s.age_group,
      publication_date: s.publication_date,
      year: s.year || this._getYearFromDateString(s.publication_date),
      tags: s.tags || [],
      hero_image_url: s.hero_image_url || '',
      is_published: !!s.is_published,
      url: s.url || '',
      related_story_ids: s.related_story_ids || []
    };
  }

  copyStoryLink(storyId) {
    const stories = this._getFromStorage('stories');
    let s = null;
    for (let i = 0; i < stories.length; i++) {
      if (stories[i].id === storyId) {
        s = stories[i];
        break;
      }
    }
    if (!s || !s.url) {
      return {
        success: false,
        story_id: storyId,
        url: '',
        message: 'Story URL is not available.'
      };
    }

    // Instrumentation for task completion tracking
    try {
      if (s && s.url) {
        localStorage.setItem('task9_copiedStoryId', storyId);
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      success: true,
      story_id: storyId,
      url: s.url,
      message: 'Story link copied to clipboard.'
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