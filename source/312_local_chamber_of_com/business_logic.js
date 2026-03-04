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

  // Initialize all data tables in localStorage if not exist
  _initStorage() {
    const arrayKeys = [
      'businesses',
      'business_categories',
      'compare_lists',
      'events',
      'event_registrations',
      'membership_plans',
      'membership_applications',
      'job_categories',
      'job_postings',
      'resource_guides',
      'saved_guides',
      'deals',
      'saved_deals',
      'sponsorship_inquiries',
      'business_contact_messages',
      'newsletter_subscriptions',
      'news_items',
      'general_contact_inquiries'
    ];

    arrayKeys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (localStorage.getItem('about_page_content') === null) {
      const aboutDefault = {
        missionHtml: '',
        historyHtml: '',
        serviceAreaHtml: '',
        leadership: [],
        officeAddress: '',
        officePhone: '',
        officeHours: '',
        keyLinks: []
      };
      localStorage.setItem('about_page_content', JSON.stringify(aboutDefault));
    }

    if (localStorage.getItem('idCounter') === null) {
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

  // ----------------- Helper functions -----------------

  // Single-user compare list helper
  _getOrCreateCompareList() {
    let lists = this._getFromStorage('compare_lists');
    let list = lists[0] || null;
    if (!list) {
      const now = this._getCurrentDateTime();
      list = {
        id: this._generateId('comparelist'),
        businessIds: [],
        maxItems: 3,
        createdAt: now,
        updatedAt: now
      };
      lists.push(list);
      this._saveToStorage('compare_lists', lists);
    }
    return list;
  }

  _updateCompareListState(compareList) {
    let lists = this._getFromStorage('compare_lists');
    const idx = lists.findIndex((l) => l.id === compareList.id);
    if (idx >= 0) {
      lists[idx] = compareList;
    } else {
      lists.push(compareList);
    }
    this._saveToStorage('compare_lists', lists);
  }

  _getOrCreateSavedGuide(guideId) {
    let saved = this._getFromStorage('saved_guides');
    let existing = saved.find((s) => s.guideId === guideId) || null;
    if (existing) {
      return { savedGuide: existing, alreadyExists: true };
    }
    const now = this._getCurrentDateTime();
    const newSaved = {
      id: this._generateId('sg'),
      guideId: guideId,
      savedAt: now
    };
    saved.push(newSaved);
    this._saveToStorage('saved_guides', saved);
    return { savedGuide: newSaved, alreadyExists: false };
  }

  _getOrCreateSavedDeal(dealId) {
    let saved = this._getFromStorage('saved_deals');
    let existing = saved.find((s) => s.dealId === dealId) || null;
    if (existing) {
      return { savedDeal: existing, alreadyExists: true };
    }
    const now = this._getCurrentDateTime();
    const newSaved = {
      id: this._generateId('sd'),
      dealId: dealId,
      savedAt: now,
      codeRevealed: false,
      codeRevealedAt: null
    };
    saved.push(newSaved);
    this._saveToStorage('saved_deals', saved);
    return { savedDeal: newSaved, alreadyExists: false };
  }

  _calculateBusinessDistance(business, locationContext) {
    if (!locationContext) return null;
    const postalCode = locationContext.postalCode || null;
    const city = locationContext.city ? String(locationContext.city).toLowerCase() : null;

    if (postalCode && business.postalCode && business.postalCode === postalCode) {
      return 0;
    }
    if (city && business.city && String(business.city).toLowerCase() === city) {
      return 0;
    }
    if (postalCode || city) {
      return 9999;
    }
    return null;
  }

  _applyEventFilters(events, filters) {
    const {
      eventType,
      startDate,
      endDate,
      timeOfDay,
      maxPrice
    } = filters || {};

    let result = events.slice();

    // Only include active events unless explicitly inactive
    result = result.filter((e) => e.isActive !== false);

    if (eventType) {
      result = result.filter((e) => e.eventType === eventType);
    }

    if (startDate) {
      const start = new Date(startDate);
      result = result.filter((e) => {
        const dt = e.startDateTime ? new Date(e.startDateTime) : null;
        return dt && dt >= start;
      });
    }

    if (endDate) {
      const end = new Date(endDate);
      result = result.filter((e) => {
        const dt = e.startDateTime ? new Date(e.startDateTime) : null;
        return dt && dt <= end;
      });
    }

    if (timeOfDay) {
      result = result.filter((e) => {
        if (!e.startDateTime) return false;
        const dt = new Date(e.startDateTime);
        const hour = dt.getHours();
        if (timeOfDay === 'morning') {
          return hour < 10;
        }
        if (timeOfDay === 'afternoon') {
          return hour >= 10 && hour < 17;
        }
        if (timeOfDay === 'evening') {
          return hour >= 17;
        }
        return true;
      });
    }

    if (typeof maxPrice === 'number') {
      result = result.filter((e) => {
        const price = e.isFree ? 0 : (typeof e.baseTicketPrice === 'number' ? e.baseTicketPrice : null);
        if (price === null) return false;
        return price <= maxPrice;
      });
    }

    return result;
  }

  _applyDealFilters(deals, filters) {
    const {
      memberOnly,
      minDiscountPercent,
      expiresAfterDate
    } = filters || {};

    let result = deals.slice();

    // Only active deals unless explicitly inactive
    result = result.filter((d) => d.isActive !== false);

    if (typeof memberOnly === 'boolean') {
      result = result.filter((d) => !!d.memberOnly === memberOnly);
    }

    if (typeof minDiscountPercent === 'number') {
      result = result.filter((d) => {
        const pct = typeof d.discountPercent === 'number' ? d.discountPercent : 0;
        return pct >= minDiscountPercent;
      });
    }

    if (expiresAfterDate) {
      const cutoff = new Date(expiresAfterDate);
      result = result.filter((d) => {
        const dt = d.expirationDate ? new Date(d.expirationDate) : null;
        return dt && dt > cutoff;
      });
    }

    return result;
  }

  _sendEmailNotification(type, payload) {
    // This is a no-op stub to satisfy business logic; no real email is sent.
    // Always return true to indicate a successful "send".
    try {
      void type;
      void payload;
      return true;
    } catch (e) {
      return false;
    }
  }

  // ----------------- Core interface implementations -----------------

  // getHomeContent
  getHomeContent() {
    const events = this._getFromStorage('events');
    const guides = this._getFromStorage('resource_guides');
    const deals = this._getFromStorage('deals');
    const businesses = this._getFromStorage('businesses');

    const now = new Date();

    // Featured events: upcoming, sorted by date
    const upcomingEvents = events
      .filter((e) => e.isActive !== false && e.startDateTime && new Date(e.startDateTime) >= now)
      .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime))
      .slice(0, 5)
      .map((e) => {
        const start = new Date(e.startDateTime);
        const diffDays = Math.round((start - now) / (1000 * 60 * 60 * 24));
        let highlightTag = 'Upcoming';
        if (diffDays <= 7) highlightTag = 'Next Week';
        return {
          event: e,
          title: e.title,
          startDateTime: e.startDateTime,
          locationCity: e.locationCity || '',
          eventType: e.eventType,
          baseTicketPrice: e.baseTicketPrice,
          isFree: !!e.isFree,
          highlightTag: highlightTag
        };
      });

    // Top resource guides by popularityScore
    const topResourceGuides = guides
      .slice()
      .sort((a, b) => {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        return pb - pa;
      })
      .slice(0, 5);

    // Highlighted deals: active, not expired, ending soon
    const highlightedDeals = deals
      .filter((d) => d.isActive !== false && d.expirationDate && new Date(d.expirationDate) >= now)
      .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate))
      .slice(0, 5)
      .map((d) => {
        const business = d.businessId
          ? businesses.find((b) => b.id === d.businessId) || null
          : null;
        const businessName = d.businessName || (business ? business.name : '');
        return {
          deal: d,
          dealId: d.id,
          title: d.title,
          businessName: businessName,
          discountPercent: d.discountPercent,
          expirationDate: d.expirationDate,
          memberOnly: !!d.memberOnly,
          business: business
        };
      });

    const quickSearchPlaceholder = 'Search businesses, events, jobs, and more';

    return {
      featuredEvents,
      topResourceGuides,
      highlightedDeals,
      quickSearchPlaceholder
    };
  }

  // getBusinessDirectoryFilterOptions
  getBusinessDirectoryFilterOptions() {
    const categories = this._getFromStorage('business_categories');

    const ratingOptions = [
      { value: 0, label: 'All ratings' },
      { value: 3, label: '3 stars & up' },
      { value: 4, label: '4 stars & up' },
      { value: 4.5, label: '4.5 stars & up' }
    ];

    const ownershipOptions = [
      { key: 'minority_owned', label: 'Minority-Owned Business' }
    ];

    const hoursOptions = [
      { key: 'open_weekday_lunch', label: 'Open MondayFriday for lunch' }
    ];

    const distanceRadiusOptions = [5, 10, 25, 50];

    const sortOptions = [
      { value: 'rating_desc', label: 'Rating: Highest First' },
      { value: 'distance_asc', label: 'Distance: Nearest First' },
      { value: 'name_asc', label: 'Name: A to Z' }
    ];

    return {
      categories,
      ratingOptions,
      ownershipOptions,
      hoursOptions,
      distanceRadiusOptions,
      sortOptions
    };
  }

  // searchBusinesses
  searchBusinesses(
    keyword,
    postalCode,
    city,
    distanceMiles,
    categoryId,
    minRating,
    minorityOwnedOnly,
    openWeekdayLunchOnly,
    sortBy,
    page = 1,
    pageSize = 20
  ) {
    const businesses = this._getFromStorage('businesses');
    const categories = this._getFromStorage('business_categories');
    const compareList = this._getOrCreateCompareList();
    const compareIds = compareList.businessIds || [];

    let results = businesses.slice();

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      results = results.filter((b) => {
        const name = (b.name || '').toLowerCase();
        const desc = (b.description || '').toLowerCase();
        // Also search within category names so generic terms like "restaurant" match
        const categoryText = Array.isArray(b.categoryIds)
          ? b.categoryIds
              .map((cid) => {
                const cat = categories.find((c) => c.id === cid);
                return cat && cat.name ? String(cat.name).toLowerCase() : '';
              })
              .join(' ')
          : '';
        return (
          name.includes(kw) ||
          desc.includes(kw) ||
          categoryText.includes(kw)
        );
      });
    }

    if (postalCode) {
      results = results.filter((b) => b.postalCode === postalCode);
    }

    if (city) {
      const c = String(city).toLowerCase();
      results = results.filter((b) => (b.city || '').toLowerCase() === c);
    }

    if (categoryId) {
      results = results.filter((b) => Array.isArray(b.categoryIds) && b.categoryIds.includes(categoryId));
    }

    if (typeof minRating === 'number') {
      results = results.filter((b) => {
        const r = typeof b.rating === 'number' ? b.rating : 0;
        return r >= minRating;
      });
    }

    if (minorityOwnedOnly) {
      results = results.filter((b) => !!b.minorityOwned);
    }

    if (openWeekdayLunchOnly) {
      results = results.filter((b) => !!b.openWeekdayLunch);
    }

    const locationContext = (postalCode || city)
      ? { postalCode: postalCode || null, city: city || null }
      : null;

    const mapped = results.map((b) => {
      const categoryNames = Array.isArray(b.categoryIds)
        ? b.categoryIds.map((cid) => {
            const cat = categories.find((c) => c.id === cid);
            return cat ? cat.name : null;
          }).filter((n) => !!n)
        : [];
      const distance = this._calculateBusinessDistance(b, locationContext);
      return {
        business: b,
        id: b.id,
        name: b.name,
        description: b.description,
        city: b.city,
        state: b.state,
        postalCode: b.postalCode,
        rating: b.rating,
        ratingCount: b.ratingCount,
        categoryNames: categoryNames,
        minorityOwned: !!b.minorityOwned,
        openWeekdayLunch: !!b.openWeekdayLunch,
        distanceMiles: distance,
        inCompareList: compareIds.includes(b.id)
      };
    });

    // Distance-based filtering if distanceMiles provided
    let filtered = mapped;
    if (typeof distanceMiles === 'number' && distanceMiles > 0 && locationContext) {
      filtered = mapped.filter((m) => m.distanceMiles !== null && m.distanceMiles <= distanceMiles);
    }

    // Sorting
    const sortValue = sortBy || 'name_asc';
    filtered.sort((a, b) => {
      if (sortValue === 'rating_desc') {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        return (a.name || '').localeCompare(b.name || '');
      }
      if (sortValue === 'distance_asc') {
        const da = (typeof a.distanceMiles === 'number') ? a.distanceMiles : Number.POSITIVE_INFINITY;
        const db = (typeof b.distanceMiles === 'number') ? b.distanceMiles : Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return (a.name || '').localeCompare(b.name || '');
      }
      // name_asc default
      return (a.name || '').localeCompare(b.name || '');
    });

    const totalCount = filtered.length;
    const startIndex = (page - 1) * pageSize;
    const paged = filtered.slice(startIndex, startIndex + pageSize);

    return {
      results: paged,
      totalCount,
      page,
      pageSize
    };
  }

  // getCompareList
  getCompareList() {
    const businesses = this._getFromStorage('businesses');
    const compareList = this._getOrCreateCompareList();
    const ids = compareList.businessIds || [];
    const listBusinesses = ids
      .map((id) => businesses.find((b) => b.id === id) || null)
      .filter((b) => !!b);

    return {
      businesses: listBusinesses,
      businessIds: ids,
      maxItems: typeof compareList.maxItems === 'number' ? compareList.maxItems : 3
    };
  }

  // addBusinessToCompareList
  addBusinessToCompareList(businessId) {
    const businesses = this._getFromStorage('businesses');
    const business = businesses.find((b) => b.id === businessId) || null;
    if (!business) {
      return {
        success: false,
        message: 'Business not found',
        compareList: null
      };
    }

    const compareList = this._getOrCreateCompareList();
    const maxItems = typeof compareList.maxItems === 'number' ? compareList.maxItems : 3;

    if (!Array.isArray(compareList.businessIds)) {
      compareList.businessIds = [];
    }

    if (compareList.businessIds.includes(businessId)) {
      return {
        success: true,
        message: 'Business already in compare list',
        compareList
      };
    }

    if (compareList.businessIds.length >= maxItems) {
      return {
        success: false,
        message: 'Compare list is full',
        compareList
      };
    }

    compareList.businessIds.push(businessId);
    compareList.updatedAt = this._getCurrentDateTime();
    this._updateCompareListState(compareList);

    return {
      success: true,
      message: 'Business added to compare list',
      compareList
    };
  }

  // removeBusinessFromCompareList
  removeBusinessFromCompareList(businessId) {
    const compareList = this._getOrCreateCompareList();
    if (!Array.isArray(compareList.businessIds)) {
      compareList.businessIds = [];
    }
    const before = compareList.businessIds.length;
    compareList.businessIds = compareList.businessIds.filter((id) => id !== businessId);
    const after = compareList.businessIds.length;
    compareList.updatedAt = this._getCurrentDateTime();
    this._updateCompareListState(compareList);

    return {
      success: before !== after,
      message: before !== after ? 'Business removed from compare list' : 'Business was not in compare list',
      compareList
    };
  }

  // getBusinessDetails
  getBusinessDetails(businessId) {
    const businesses = this._getFromStorage('businesses');
    const categories = this._getFromStorage('business_categories');
    const compareList = this._getOrCreateCompareList();
    const business = businesses.find((b) => b.id === businessId) || null;

    if (!business) {
      return {
        business: null,
        categoryNames: [],
        fullAddress: '',
        mapCoordinates: null,
        hoursFormatted: [],
        minorityOwnedLabel: '',
        inCompareList: false
      };
    }

    const categoryNames = Array.isArray(business.categoryIds)
      ? business.categoryIds.map((cid) => {
          const cat = categories.find((c) => c.id === cid);
          return cat ? cat.name : null;
        }).filter((n) => !!n)
      : [];

    const parts = [];
    if (business.addressLine1) parts.push(business.addressLine1);
    if (business.addressLine2) parts.push(business.addressLine2);
    const cityStatePostal = [business.city, business.state, business.postalCode].filter((p) => !!p).join(', ');
    if (cityStatePostal) parts.push(cityStatePostal);
    if (business.country) parts.push(business.country);
    const fullAddress = parts.join(', ');

    const mapCoordinates = (typeof business.latitude === 'number' && typeof business.longitude === 'number')
      ? { latitude: business.latitude, longitude: business.longitude }
      : null;

    const hoursFormatted = Array.isArray(business.hours)
      ? business.hours.map((h) => String(h))
      : [];

    const minorityOwnedLabel = business.minorityOwned ? 'Minority-Owned Business' : '';

    const inCompareList = Array.isArray(compareList.businessIds)
      ? compareList.businessIds.includes(business.id)
      : false;

    return {
      business,
      categoryNames,
      fullAddress,
      mapCoordinates,
      hoursFormatted,
      minorityOwnedLabel,
      inCompareList
    };
  }

  // contactBusiness
  contactBusiness(businessId, senderName, senderEmail, message) {
    const businesses = this._getFromStorage('businesses');
    const business = businesses.find((b) => b.id === businessId) || null;
    if (!business) {
      return {
        messageRecord: null,
        success: false,
        status: 'failed',
        confirmationText: 'Business not found'
      };
    }

    const messages = this._getFromStorage('business_contact_messages');
    const now = this._getCurrentDateTime();
    const record = {
      id: this._generateId('bmsg'),
      businessId,
      senderName,
      senderEmail,
      message,
      status: 'sent',
      createdAt: now
    };

    const emailOk = this._sendEmailNotification('business_contact', {
      businessId,
      senderName,
      senderEmail,
      message
    });

    record.status = emailOk ? 'sent' : 'failed';
    messages.push(record);
    this._saveToStorage('business_contact_messages', messages);

    return {
      messageRecord: record,
      success: emailOk,
      status: record.status,
      confirmationText: emailOk ? 'Your message has been sent to the business.' : 'We were unable to send your message.'
    };
  }

  // getEventFilterOptions
  getEventFilterOptions() {
    const eventTypes = [
      { value: 'networking', label: 'Networking' },
      { value: 'signature_event', label: 'Signature Events' },
      { value: 'workshop', label: 'Workshops' },
      { value: 'webinar', label: 'Webinars' },
      { value: 'other', label: 'Other' }
    ];

    const timeOfDayOptions = [
      { value: 'morning', label: 'Morning (before 10:00 AM)' },
      { value: 'afternoon', label: 'Afternoon' },
      { value: 'evening', label: 'Evening' }
    ];

    const priceRanges = [
      { maxPrice: 0, label: 'Free' },
      { maxPrice: 25, label: 'Up to $25' },
      { maxPrice: 40, label: 'Up to $40' },
      { maxPrice: 100, label: 'Up to $100' }
    ];

    const sortOptions = [
      { value: 'date_asc', label: 'Date: Soonest First' },
      { value: 'price_asc', label: 'Price: Low to High' },
      { value: 'price_desc', label: 'Price: High to Low' }
    ];

    return {
      eventTypes,
      timeOfDayOptions,
      priceRanges,
      sortOptions
    };
  }

  // searchEvents
  searchEvents(
    eventType,
    startDate,
    endDate,
    timeOfDay,
    maxPrice,
    sortBy,
    page = 1,
    pageSize = 20
  ) {
    const events = this._getFromStorage('events');

    const filteredEvents = this._applyEventFilters(events, {
      eventType,
      startDate,
      endDate,
      timeOfDay,
      maxPrice
    });

    const sortValue = sortBy || 'date_asc';
    filteredEvents.sort((a, b) => {
      if (sortValue === 'price_asc' || sortValue === 'price_desc') {
        const pa = a.isFree ? 0 : (typeof a.baseTicketPrice === 'number' ? a.baseTicketPrice : Number.POSITIVE_INFINITY);
        const pb = b.isFree ? 0 : (typeof b.baseTicketPrice === 'number' ? b.baseTicketPrice : Number.POSITIVE_INFINITY);
        if (sortValue === 'price_asc') {
          if (pa !== pb) return pa - pb;
        } else {
          if (pa !== pb) return pb - pa;
        }
        const da = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
        const db = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
        return da - db;
      }
      // date_asc default
      const da = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
      const db = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
      if (da !== db) return da - db;
      return (a.title || '').localeCompare(b.title || '');
    });

    const totalCount = filteredEvents.length;
    const startIndex = (page - 1) * pageSize;
    const pageEvents = filteredEvents.slice(startIndex, startIndex + pageSize);

    const results = pageEvents.map((e) => ({
      event: e,
      id: e.id,
      title: e.title,
      startDateTime: e.startDateTime,
      endDateTime: e.endDateTime,
      locationName: e.locationName,
      locationCity: e.locationCity,
      eventType: e.eventType,
      baseTicketPrice: e.baseTicketPrice,
      isFree: !!e.isFree,
      allowInvoicePayment: !!e.allowInvoicePayment,
      sponsorshipAvailable: !!e.sponsorshipAvailable
    }));

    return {
      results,
      totalCount,
      page,
      pageSize
    };
  }

  // getEventDetails
  getEventDetails(eventId) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    if (!event) {
      return {
        event: null,
        agendaHtml: '',
        speakers: [],
        venueDetails: {
          locationName: '',
          fullAddress: '',
          mapEmbedHtml: ''
        },
        pricingDetails: [],
        capacityNote: '',
        registrationAvailable: false,
        allowInvoicePayment: false,
        sponsorshipAvailable: false,
        sponsorshipInfo: null
      };
    }

    const agendaHtml = event.description || '';

    const venueParts = [];
    if (event.locationAddress) venueParts.push(event.locationAddress);
    const cityStatePostal = [event.locationCity, event.locationState, event.locationPostalCode]
      .filter((p) => !!p)
      .join(', ');
    if (cityStatePostal) venueParts.push(cityStatePostal);
    const fullAddress = venueParts.join(', ');

    const pricingDetails = [];
    if (event.isFree) {
      pricingDetails.push({ label: 'General Admission', price: 0, currency: event.currency || 'USD' });
    } else if (typeof event.baseTicketPrice === 'number') {
      pricingDetails.push({
        label: 'General Admission',
        price: event.baseTicketPrice,
        currency: event.currency || 'USD'
      });
    }

    let capacityNote = '';
    if (typeof event.capacity === 'number') {
      capacityNote = 'Capacity: ' + event.capacity;
    }

    const registrationAvailable = event.isActive !== false;
    const allowInvoicePayment = !!event.allowInvoicePayment;
    const sponsorshipAvailable = !!event.sponsorshipAvailable;

    let sponsorshipInfo = null;
    if (sponsorshipAvailable) {
      sponsorshipInfo = {
        description: 'Sponsorship opportunities are available for this event.',
        budgetOptions: [
          { value: 'up_to_500', label: 'Up to $500' },
          { value: '500_to_1000', label: '$500 to $1,000' },
          { value: '1000_to_2500', label: '$1,000 to $2,500' },
          { value: 'above_2500', label: 'Above $2,500' }
        ],
        benefitOptions: [
          { value: 'program_recognition_only', label: 'Program recognition only' },
          { value: 'booth', label: 'Booth' },
          { value: 'table', label: 'Table' },
          { value: 'vip_package', label: 'VIP package' },
          { value: 'digital_promotion', label: 'Digital promotion' },
          { value: 'other', label: 'Other' }
        ]
      };
    }

    return {
      event,
      agendaHtml,
      speakers: [],
      venueDetails: {
        locationName: event.locationName || '',
        fullAddress,
        mapEmbedHtml: ''
      },
      pricingDetails,
      capacityNote,
      registrationAvailable,
      allowInvoicePayment,
      sponsorshipAvailable,
      sponsorshipInfo
    };
  }

  // createEventRegistration
  createEventRegistration(
    eventId,
    attendeeFirstName,
    attendeeLastName,
    attendeeEmail,
    ticketQuantity,
    paymentMethod
  ) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;

    if (!event) {
      return {
        registration: null,
        success: false,
        status: 'pending',
        confirmationMessage: 'Event not found'
      };
    }

    const registrations = this._getFromStorage('event_registrations');

    const pricePerTicket = event.isFree ? 0 : (typeof event.baseTicketPrice === 'number' ? event.baseTicketPrice : 0);
    const qty = typeof ticketQuantity === 'number' && ticketQuantity > 0 ? ticketQuantity : 1;
    const totalAmount = pricePerTicket * qty;

    const status = (paymentMethod === 'credit_card' || event.isFree) ? 'confirmed' : 'pending';
    const now = this._getCurrentDateTime();

    const registration = {
      id: this._generateId('ereg'),
      eventId,
      attendeeFirstName,
      attendeeLastName,
      attendeeEmail,
      ticketQuantity: qty,
      paymentMethod,
      totalAmount,
      status,
      createdAt: now
    };

    registrations.push(registration);
    this._saveToStorage('event_registrations', registrations);

    this._sendEmailNotification('event_registration', {
      eventId,
      attendeeFirstName,
      attendeeLastName,
      attendeeEmail,
      ticketQuantity: qty,
      paymentMethod,
      totalAmount
    });

    return {
      registration,
      success: true,
      status,
      confirmationMessage: 'Your registration has been submitted.'
    };
  }

  // submitSponsorshipInquiry
  submitSponsorshipInquiry(
    eventId,
    sponsorName,
    sponsorCompany,
    sponsorEmail,
    sponsorPhone,
    budgetRange,
    benefitOption,
    message
  ) {
    const events = this._getFromStorage('events');
    const event = events.find((e) => e.id === eventId) || null;
    if (!event) {
      return {
        inquiry: null,
        success: false,
        status: 'new',
        confirmationMessage: 'Event not found'
      };
    }

    const inquiries = this._getFromStorage('sponsorship_inquiries');
    const now = this._getCurrentDateTime();

    const inquiry = {
      id: this._generateId('sinq'),
      eventId,
      sponsorName,
      sponsorCompany,
      sponsorEmail,
      sponsorPhone,
      budgetRange,
      benefitOption,
      message,
      status: 'new',
      createdAt: now
    };

    inquiries.push(inquiry);
    this._saveToStorage('sponsorship_inquiries', inquiries);

    this._sendEmailNotification('sponsorship_inquiry', {
      eventId,
      sponsorName,
      sponsorCompany,
      sponsorEmail,
      sponsorPhone,
      budgetRange,
      benefitOption,
      message
    });

    return {
      inquiry,
      success: true,
      status: 'new',
      confirmationMessage: 'Your sponsorship inquiry has been submitted.'
    };
  }

  // getMembershipPlans
  getMembershipPlans(maxAnnualPrice, includeInactive = false) {
    const plansRaw = this._getFromStorage('membership_plans');

    let plans = plansRaw.filter((p) => includeInactive ? true : p.isActive !== false);

    if (typeof maxAnnualPrice === 'number') {
      plans = plans.filter((p) => typeof p.annualPrice === 'number' && p.annualPrice <= maxAnnualPrice);
    }

    plans.sort((a, b) => {
      const da = typeof a.displayOrder === 'number' ? a.displayOrder : 0;
      const db = typeof b.displayOrder === 'number' ? b.displayOrder : 0;
      if (da !== db) return da - db;
      const pa = typeof a.annualPrice === 'number' ? a.annualPrice : Number.POSITIVE_INFINITY;
      const pb = typeof b.annualPrice === 'number' ? b.annualPrice : Number.POSITIVE_INFINITY;
      if (pa !== pb) return pa - pb;
      return (a.name || '').localeCompare(b.name || '');
    });

    const wrapped = plans.map((p) => ({
      plan: p,
      id: p.id,
      name: p.name,
      description: p.description,
      annualPrice: p.annualPrice,
      includesBusinessDirectoryListing: !!p.includesBusinessDirectoryListing,
      includesMemberEventDiscounts: !!p.includesMemberEventDiscounts
    }));

    return { plans: wrapped };
  }

  // getMembershipApplicationContext
  getMembershipApplicationContext(membershipPlanId) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === membershipPlanId) || null;

    const billingFrequencyOptions = [
      { value: 'annual', label: 'Annual' },
      { value: 'monthly', label: 'Monthly' }
    ];

    const paymentMethodOptions = [
      { value: 'invoice', label: 'Send Invoice' },
      { value: 'credit_card', label: 'Credit Card' }
    ];

    return {
      plan,
      billingFrequencyOptions,
      paymentMethodOptions
    };
  }

  // submitMembershipApplication
  submitMembershipApplication(
    membershipPlanId,
    organizationName,
    contactFirstName,
    contactLastName,
    contactEmail,
    billingFrequency,
    paymentMethod
  ) {
    const plans = this._getFromStorage('membership_plans');
    const plan = plans.find((p) => p.id === membershipPlanId) || null;
    if (!plan) {
      return {
        application: null,
        success: false,
        status: 'draft',
        nextStepMessage: 'Membership plan not found.'
      };
    }

    const applications = this._getFromStorage('membership_applications');
    const now = this._getCurrentDateTime();

    const application = {
      id: this._generateId('mapp'),
      membershipPlanId,
      organizationName,
      contactFirstName,
      contactLastName,
      contactEmail,
      billingFrequency,
      paymentMethod,
      status: 'submitted',
      createdAt: now,
      updatedAt: now
    };

    applications.push(application);
    this._saveToStorage('membership_applications', applications);

    this._sendEmailNotification('membership_application', {
      membershipPlanId,
      organizationName,
      contactFirstName,
      contactLastName,
      contactEmail,
      billingFrequency,
      paymentMethod
    });

    return {
      application,
      success: true,
      status: 'submitted',
      nextStepMessage: 'Your membership application has been submitted.'
    };
  }

  // getJobBoardFilterOptions
  getJobBoardFilterOptions() {
    const categories = this._getFromStorage('job_categories');

    const jobTypes = [
      { value: 'full_time', label: 'Full-Time' },
      { value: 'part_time', label: 'Part-Time' },
      { value: 'contract', label: 'Contract' },
      { value: 'temporary', label: 'Temporary' },
      { value: 'internship', label: 'Internship' },
      { value: 'other', label: 'Other' }
    ];

    return {
      categories,
      jobTypes
    };
  }

  // searchJobPostings
  searchJobPostings(
    keyword,
    jobCategoryId,
    jobType,
    locationCity,
    locationPostalCode,
    page = 1,
    pageSize = 20
  ) {
    const postings = this._getFromStorage('job_postings');
    const categories = this._getFromStorage('job_categories');
    const now = new Date();

    let results = postings.filter((p) => {
      if (p.isActive === false) return false;
      if (p.expiresAt) {
        const exp = new Date(p.expiresAt);
        if (exp < now) return false;
      }
      return true;
    });

    if (keyword) {
      const kw = String(keyword).toLowerCase();
      results = results.filter((p) => {
        const title = (p.jobTitle || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        return title.includes(kw) || desc.includes(kw);
      });
    }

    if (jobCategoryId) {
      results = results.filter((p) => p.jobCategoryId === jobCategoryId);
    }

    if (jobType) {
      results = results.filter((p) => p.jobType === jobType);
    }

    if (locationCity) {
      const c = String(locationCity).toLowerCase();
      results = results.filter((p) => (p.locationCity || '').toLowerCase() === c);
    }

    if (locationPostalCode) {
      results = results.filter((p) => p.locationPostalCode === locationPostalCode);
    }

    results.sort((a, b) => {
      const pa = a.postedAt ? new Date(a.postedAt).getTime() : 0;
      const pb = b.postedAt ? new Date(b.postedAt).getTime() : 0;
      if (pb !== pa) return pb - pa;
      return (a.jobTitle || '').localeCompare(b.jobTitle || '');
    });

    const totalCount = results.length;
    const startIndex = (page - 1) * pageSize;
    const pageItems = results.slice(startIndex, startIndex + pageSize).map((p) => {
      const jobCategory = p.jobCategoryId
        ? categories.find((c) => c.id === p.jobCategoryId) || null
        : null;
      return Object.assign({}, p, { jobCategory });
    });

    return {
      results: pageItems,
      totalCount,
      page,
      pageSize
    };
  }

  // getJobPostingDetails
  getJobPostingDetails(jobPostingId) {
    const postings = this._getFromStorage('job_postings');
    const categories = this._getFromStorage('job_categories');

    const jobPosting = postings.find((p) => p.id === jobPostingId) || null;
    if (!jobPosting) {
      return {
        jobPosting: null,
        jobCategoryName: '',
        locationDisplay: '',
        jobCategory: null
      };
    }

    const jobCategory = jobPosting.jobCategoryId
      ? categories.find((c) => c.id === jobPosting.jobCategoryId) || null
      : null;
    const jobCategoryName = jobCategory ? jobCategory.name : '';

    const locationParts = [];
    if (jobPosting.locationCity) locationParts.push(jobPosting.locationCity);
    if (jobPosting.locationPostalCode) locationParts.push(jobPosting.locationPostalCode);
    const locationDisplay = locationParts.join(', ');

    return {
      jobPosting,
      jobCategoryName,
      locationDisplay,
      jobCategory
    };
  }

  // getJobPostingFormConfig
  getJobPostingFormConfig() {
    const categories = this._getFromStorage('job_categories');

    const jobTypes = [
      { value: 'full_time', label: 'Full-Time' },
      { value: 'part_time', label: 'Part-Time' },
      { value: 'contract', label: 'Contract' },
      { value: 'temporary', label: 'Temporary' },
      { value: 'internship', label: 'Internship' },
      { value: 'other', label: 'Other' }
    ];

    const defaultPostingDurationDays = 30;
    const allowedPostingDurations = [7, 14, 30, 60];

    return {
      categories,
      jobTypes,
      defaultPostingDurationDays,
      allowedPostingDurations
    };
  }

  // previewJobPosting
  previewJobPosting(
    jobTitle,
    jobCategoryId,
    jobType,
    locationCity,
    locationPostalCode,
    companyName,
    applicationEmail,
    applicationUrl,
    postingDurationDays,
    description
  ) {
    const categories = this._getFromStorage('job_categories');
    const now = new Date();
    const postedAt = now.toISOString();
    const duration = typeof postingDurationDays === 'number' ? postingDurationDays : 30;
    const expiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000).toISOString();

    const preview = {
      id: 'preview',
      jobTitle,
      jobCategoryId,
      jobType,
      locationCity,
      locationPostalCode,
      companyName,
      applicationEmail,
      applicationUrl,
      postingDurationDays: duration,
      postedAt,
      expiresAt,
      isActive: true,
      description
    };

    const jobCategory = jobCategoryId
      ? categories.find((c) => c.id === jobCategoryId) || null
      : null;
    const jobCategoryName = jobCategory ? jobCategory.name : '';

    return {
      preview,
      jobCategoryName
    };
  }

  // submitJobPosting
  submitJobPosting(
    jobTitle,
    jobCategoryId,
    jobType,
    locationCity,
    locationPostalCode,
    companyName,
    applicationEmail,
    applicationUrl,
    postingDurationDays,
    description
  ) {
    const postings = this._getFromStorage('job_postings');
    const now = new Date();
    const postedAt = now.toISOString();
    const duration = typeof postingDurationDays === 'number' ? postingDurationDays : 30;
    const expiresAt = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000).toISOString();

    const jobPosting = {
      id: this._generateId('job'),
      jobTitle,
      jobCategoryId,
      jobType,
      locationCity,
      locationPostalCode,
      companyName,
      applicationEmail,
      applicationUrl,
      postingDurationDays: duration,
      postedAt,
      expiresAt,
      isActive: true,
      description
    };

    postings.push(jobPosting);
    this._saveToStorage('job_postings', postings);

    return {
      jobPosting,
      success: true,
      confirmationMessage: 'Your job posting has been submitted.'
    };
  }

  // getResourceGuideFilterOptions
  getResourceGuideFilterOptions() {
    const guides = this._getFromStorage('resource_guides');

    const topics = [
      { value: 'starting_a_business', label: 'Starting a Business' },
      { value: 'marketing', label: 'Marketing' },
      { value: 'finance', label: 'Finance' },
      { value: 'hr', label: 'Human Resources' },
      { value: 'other', label: 'Other' }
    ];

    const yearSet = new Set();
    guides.forEach((g) => {
      if (g.publicationDate) {
        const y = new Date(g.publicationDate).getFullYear();
        if (!isNaN(y)) yearSet.add(y);
      }
    });
    const years = Array.from(yearSet).sort((a, b) => b - a);

    const sortOptions = [
      { value: 'most_popular', label: 'Most Popular' },
      { value: 'newest', label: 'Newest' },
      { value: 'title_asc', label: 'Title AZ' }
    ];

    return {
      topics,
      years,
      sortOptions
    };
  }

  // searchResourceGuides
  searchResourceGuides(
    isBusinessGuide,
    topic,
    year,
    sortBy,
    page = 1,
    pageSize = 20
  ) {
    const guides = this._getFromStorage('resource_guides');

    let results = guides.slice();

    if (typeof isBusinessGuide === 'boolean') {
      results = results.filter((g) => !!g.isBusinessGuide === isBusinessGuide);
    }

    if (topic) {
      results = results.filter((g) => g.topic === topic);
    }

    if (typeof year === 'number') {
      results = results.filter((g) => {
        if (!g.publicationDate) return false;
        const y = new Date(g.publicationDate).getFullYear();
        return y === year;
      });
    }

    const sortValue = sortBy || 'newest';
    results.sort((a, b) => {
      if (sortValue === 'most_popular') {
        const pa = typeof a.popularityScore === 'number' ? a.popularityScore : 0;
        const pb = typeof b.popularityScore === 'number' ? b.popularityScore : 0;
        if (pb !== pa) return pb - pa;
        const da = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
        const db = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
        return db - da;
      }
      if (sortValue === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      }
      // newest default
      const da = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
      const db = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
      if (db !== da) return db - da;
      return (a.title || '').localeCompare(b.title || '');
    });

    const totalCount = results.length;
    const startIndex = (page - 1) * pageSize;
    const pageItems = results.slice(startIndex, startIndex + pageSize);

    return {
      results: pageItems,
      totalCount,
      page,
      pageSize
    };
  }

  // getResourceGuideDetails
  getResourceGuideDetails(guideId) {
    const guides = this._getFromStorage('resource_guides');
    const saved = this._getFromStorage('saved_guides');

    const guide = guides.find((g) => g.id === guideId) || null;
    if (!guide) {
      return {
        guide: null,
        publicationYear: null,
        topicLabel: '',
        isSaved: false,
        relatedGuides: []
      };
    }

    const publicationYear = guide.publicationDate ? new Date(guide.publicationDate).getFullYear() : null;

    const topicLabels = {
      starting_a_business: 'Starting a Business',
      marketing: 'Marketing',
      finance: 'Finance',
      hr: 'Human Resources',
      other: 'Other'
    };
    const topicLabel = topicLabels[guide.topic] || '';

    const isSaved = saved.some((s) => s.guideId === guideId);

    const relatedGuides = guides
      .filter((g) => g.id !== guideId && g.topic === guide.topic)
      .sort((a, b) => {
        const da = a.publicationDate ? new Date(a.publicationDate).getTime() : 0;
        const db = b.publicationDate ? new Date(b.publicationDate).getTime() : 0;
        return db - da;
      })
      .slice(0, 3);

    // Instrumentation for task completion tracking
    try {
      const now = new Date();
      const currentYear = now.getFullYear();

      // Find candidate guides matching the task criteria
      const candidateGuides = guides.filter((g) => {
        if (!g || !g.publicationDate) return false;
        if (!g.isBusinessGuide) return false;
        if (g.topic !== 'starting_a_business') return false;
        const y = new Date(g.publicationDate).getFullYear();
        return y === currentYear;
      });

      if (candidateGuides.length > 0) {
        // Determine the most popular candidate guide
        let targetGuide = candidateGuides[0];
        for (let i = 1; i < candidateGuides.length; i++) {
          const candidate = candidateGuides[i];
          const currentScore = typeof targetGuide.popularityScore === 'number' ? targetGuide.popularityScore : 0;
          const candidateScore = typeof candidate.popularityScore === 'number' ? candidate.popularityScore : 0;
          if (candidateScore > currentScore) {
            targetGuide = candidate;
          }
        }

        if (targetGuide && targetGuide.id === guide.id) {
          localStorage.setItem('task5_correctGuideOpened', 'true');
        }
      }
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      guide,
      publicationYear,
      topicLabel,
      isSaved,
      relatedGuides
    };
  }

  // saveGuide
  saveGuide(guideId) {
    const guides = this._getFromStorage('resource_guides');
    const guide = guides.find((g) => g.id === guideId) || null;
    if (!guide) {
      return {
        savedGuide: null,
        success: false,
        alreadySaved: false
      };
    }

    const { savedGuide, alreadyExists } = this._getOrCreateSavedGuide(guideId);
    return {
      savedGuide,
      success: true,
      alreadySaved: alreadyExists
    };
  }

  // unsaveGuide
  unsaveGuide(guideId) {
    const saved = this._getFromStorage('saved_guides');
    const before = saved.length;
    const filtered = saved.filter((s) => s.guideId !== guideId);
    this._saveToStorage('saved_guides', filtered);
    const after = filtered.length;
    return { success: before !== after };
  }

  // getSavedGuides
  getSavedGuides() {
    const saved = this._getFromStorage('saved_guides');
    const guides = this._getFromStorage('resource_guides');
    const result = saved
      .map((s) => guides.find((g) => g.id === s.guideId) || null)
      .filter((g) => !!g);
    return result;
  }

  // getDealFilterOptions
  getDealFilterOptions() {
    const minDiscountPresets = [10, 20, 30, 40, 50];
    const sortOptions = [
      { value: 'ending_soon', label: 'Ending Soon' },
      { value: 'newest', label: 'Newest' },
      { value: 'discount_desc', label: 'Highest Discount' }
    ];
    return {
      minDiscountPresets,
      sortOptions
    };
  }

  // searchDeals
  searchDeals(
    memberOnly,
    minDiscountPercent,
    expiresAfterDate,
    sortBy,
    page = 1,
    pageSize = 20
  ) {
    const deals = this._getFromStorage('deals');
    const businesses = this._getFromStorage('businesses');
    const savedDeals = this._getFromStorage('saved_deals');

    const filteredDeals = this._applyDealFilters(deals, {
      memberOnly,
      minDiscountPercent,
      expiresAfterDate
    });

    const sortValue = sortBy || 'ending_soon';
    filteredDeals.sort((a, b) => {
      if (sortValue === 'discount_desc') {
        const pa = typeof a.discountPercent === 'number' ? a.discountPercent : 0;
        const pb = typeof b.discountPercent === 'number' ? b.discountPercent : 0;
        if (pb !== pa) return pb - pa;
      } else if (sortValue === 'newest') {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (db !== da) return db - da;
      } else {
        // ending_soon default
        const ea = a.expirationDate ? new Date(a.expirationDate).getTime() : Number.POSITIVE_INFINITY;
        const eb = b.expirationDate ? new Date(b.expirationDate).getTime() : Number.POSITIVE_INFINITY;
        if (ea !== eb) return ea - eb;
      }
      return (a.title || '').localeCompare(b.title || '');
    });

    const totalCount = filteredDeals.length;
    const startIndex = (page - 1) * pageSize;
    const pageDeals = filteredDeals.slice(startIndex, startIndex + pageSize).map((d) => {
      const business = d.businessId
        ? businesses.find((b) => b.id === d.businessId) || null
        : null;
      const businessName = d.businessName || (business ? business.name : '');
      const isSaved = savedDeals.some((s) => s.dealId === d.id);
      return {
        deal: d,
        id: d.id,
        title: d.title,
        businessName,
        discountPercent: d.discountPercent,
        expirationDate: d.expirationDate,
        memberOnly: !!d.memberOnly,
        isSaved,
        business
      };
    });

    return {
      results: pageDeals,
      totalCount,
      page,
      pageSize
    };
  }

  // getDealDetails
  getDealDetails(dealId) {
    const deals = this._getFromStorage('deals');
    const businesses = this._getFromStorage('businesses');
    const savedDeals = this._getFromStorage('saved_deals');

    const deal = deals.find((d) => d.id === dealId) || null;
    if (!deal) {
      return {
        deal: null,
        business: null,
        isSaved: false,
        codeRevealed: false
      };
    }

    const business = deal.businessId
      ? businesses.find((b) => b.id === deal.businessId) || null
      : null;

    const saved = savedDeals.find((s) => s.dealId === dealId) || null;
    const isSaved = !!saved;
    const codeRevealed = saved && saved.codeRevealed ? true : false;

    return {
      deal,
      business,
      isSaved,
      codeRevealed
    };
  }

  // saveDeal
  saveDeal(dealId) {
    const deals = this._getFromStorage('deals');
    const deal = deals.find((d) => d.id === dealId) || null;
    if (!deal) {
      return {
        savedDeal: null,
        success: false,
        alreadySaved: false
      };
    }

    const { savedDeal, alreadyExists } = this._getOrCreateSavedDeal(dealId);
    return {
      savedDeal,
      success: true,
      alreadySaved: alreadyExists
    };
  }

  // unsaveDeal
  unsaveDeal(dealId) {
    const saved = this._getFromStorage('saved_deals');
    const before = saved.length;
    const filtered = saved.filter((s) => s.dealId !== dealId);
    this._saveToStorage('saved_deals', filtered);
    const after = filtered.length;
    return { success: before !== after };
  }

  // revealDealCode
  revealDealCode(dealId) {
    const deals = this._getFromStorage('deals');
    const deal = deals.find((d) => d.id === dealId) || null;
    if (!deal) {
      return {
        savedDeal: null,
        discountCode: '',
        success: false
      };
    }

    const res = this._getOrCreateSavedDeal(dealId);
    let savedDeal = res.savedDeal;

    // Update reveal state
    const allSaved = this._getFromStorage('saved_deals');
    const idx = allSaved.findIndex((s) => s.id === savedDeal.id);
    const now = this._getCurrentDateTime();
    if (idx >= 0) {
      allSaved[idx].codeRevealed = true;
      allSaved[idx].codeRevealedAt = now;
      savedDeal = allSaved[idx];
      this._saveToStorage('saved_deals', allSaved);
    }

    const discountCode = deal.discountCode || '';

    return {
      savedDeal,
      discountCode,
      success: true
    };
  }

  // getSavedDeals
  getSavedDeals() {
    const saved = this._getFromStorage('saved_deals');
    const deals = this._getFromStorage('deals');
    const businesses = this._getFromStorage('businesses');

    const results = saved
      .map((s) => {
        const deal = deals.find((d) => d.id === s.dealId) || null;
        if (!deal) return null;
        const business = deal.businessId
          ? businesses.find((b) => b.id === deal.businessId) || null
          : null;
        return Object.assign({}, deal, { business });
      })
      .filter((d) => !!d);

    return results;
  }

  // getNewsList
  getNewsList(page = 1, pageSize = 20) {
    const items = this._getFromStorage('news_items');

    items.sort((a, b) => {
      const da = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const db = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return db - da;
    });

    const totalCount = items.length;
    const startIndex = (page - 1) * pageSize;
    const pageItems = items.slice(startIndex, startIndex + pageSize);

    return {
      items: pageItems,
      totalCount,
      page,
      pageSize
    };
  }

  // getNewsletterSubscriptionOptions
  getNewsletterSubscriptionOptions() {
    const topics = [
      { key: 'small_business_resources', label: 'Small Business Resources' },
      { key: 'upcoming_events', label: 'Upcoming Events' },
      { key: 'advocacy_alerts', label: 'Advocacy Alerts' }
    ];

    const frequencyOptions = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' }
    ];

    return {
      topics,
      frequencyOptions
    };
  }

  // createNewsletterSubscription
  createNewsletterSubscription(
    firstName,
    lastName,
    email,
    wantsSmallBusinessResources,
    wantsUpcomingEvents,
    wantsAdvocacyAlerts,
    frequency
  ) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');
    const now = this._getCurrentDateTime();

    const subscription = {
      id: this._generateId('nsub'),
      firstName,
      lastName,
      email,
      wantsSmallBusinessResources: !!wantsSmallBusinessResources,
      wantsUpcomingEvents: !!wantsUpcomingEvents,
      wantsAdvocacyAlerts: !!wantsAdvocacyAlerts,
      frequency,
      isActive: true,
      createdAt: now
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      subscription,
      success: true,
      confirmationMessage: 'You have been subscribed to the newsletter.'
    };
  }

  // getAboutPageContent
  getAboutPageContent() {
    const raw = localStorage.getItem('about_page_content');
    let content;
    try {
      content = raw ? JSON.parse(raw) : {};
    } catch (e) {
      content = {};
    }

    return {
      missionHtml: content.missionHtml || '',
      historyHtml: content.historyHtml || '',
      serviceAreaHtml: content.serviceAreaHtml || '',
      leadership: Array.isArray(content.leadership) ? content.leadership : [],
      officeAddress: content.officeAddress || '',
      officePhone: content.officePhone || '',
      officeHours: content.officeHours || '',
      keyLinks: Array.isArray(content.keyLinks) ? content.keyLinks : []
    };
  }

  // submitGeneralContactInquiry
  submitGeneralContactInquiry(name, email, subject, message) {
    const inquiries = this._getFromStorage('general_contact_inquiries');
    const now = this._getCurrentDateTime();

    const record = {
      id: this._generateId('gci'),
      name,
      email,
      subject,
      message,
      createdAt: now
    };

    inquiries.push(record);
    this._saveToStorage('general_contact_inquiries', inquiries);

    this._sendEmailNotification('general_contact', {
      name,
      email,
      subject,
      message
    });

    return {
      success: true,
      confirmationMessage: 'Your inquiry has been sent.'
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