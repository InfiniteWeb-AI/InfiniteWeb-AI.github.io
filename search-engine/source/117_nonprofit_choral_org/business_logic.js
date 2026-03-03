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
    // Initialize localStorage with default data structures
    this._initStorage();
    this.idCounter = this._getNextIdCounter();
  }

  _initStorage() {
    var arrayKeys = [
      'donation_funds',
      'suggested_donation_amounts',
      'donations',
      'locations',
      'audition_slots',
      'audition_registrations',
      'scholarship_types',
      'seasons',
      'income_range_options',
      'scholarship_applications',
      'events',
      'ticket_price_tiers',
      'seats',
      'ticket_carts',
      'cart_items',
      'ticket_orders',
      'ticket_order_items',
      'volunteer_opportunities',
      'volunteer_registrations',
      'ensembles',
      'ensemble_registrations',
      'newsletter_interest_options',
      'newsletter_frequency_options',
      'newsletter_subscriptions',
      'workshops',
      'workshop_registrations',
      'home_quick_links',
      'news_items',
      'contact_messages'
    ];
    var objectKeys = [
      'organization_profile',
      'contact_info',
      'policies'
    ];
    for (var i = 0; i < arrayKeys.length; i++) {
      var key = arrayKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }
    for (var j = 0; j < objectKeys.length; j++) {
      var okey = objectKeys[j];
      if (!localStorage.getItem(okey)) {
        localStorage.setItem(okey, JSON.stringify({}));
      }
    }
    if (!localStorage.getItem('current_donation_id')) {
      localStorage.setItem('current_donation_id', '');
    }
    if (!localStorage.getItem('current_cart_id')) {
      localStorage.setItem('current_cart_id', '');
    }
    if (!localStorage.getItem('current_order_in_review_id')) {
      localStorage.setItem('current_order_in_review_id', '');
    }
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    var data = localStorage.getItem(key);
    if (!data) {
      return key === 'organization_profile' || key === 'contact_info' || key === 'policies' ? {} : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return key === 'organization_profile' || key === 'contact_info' || key === 'policies' ? {} : [];
    }
  }

  _saveToStorage(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  _getNextIdCounter() {
    var current = parseInt(localStorage.getItem('idCounter') || '1000', 10);
    var next = current + 1;
    localStorage.setItem('idCounter', String(next));
    return next;
  }

  _generateId(prefix) {
    return prefix + '_' + this._getNextIdCounter();
  }

  _nowISO() {
    return new Date().toISOString();
  }

  _parseISO(value) {
    return value ? new Date(value) : null;
  }

  _monthLabel(year, month) {
    var names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return names[month - 1] + ' ' + year;
  }

  _computeDateMonthOptions(dateStrings) {
    var dates = Array.isArray(dateStrings) ? dateStrings.filter(function(d) { return !!d; }) : [];
    var map = {};
    if (dates.length > 0) {
      for (var i = 0; i < dates.length; i++) {
        var dt = this._parseISO(dates[i]);
        if (!dt || isNaN(dt.getTime())) continue;
        var y = dt.getUTCFullYear();
        var m = dt.getUTCMonth() + 1;
        var key = y + '-' + m;
        if (!map[key]) {
          map[key] = {
            year: y,
            month: m,
            label: this._monthLabel(y, m)
          };
        }
      }
    } else {
      var now = new Date();
      var startYear = now.getUTCFullYear();
      var startMonth = now.getUTCMonth() + 1;
      for (var j = 0; j < 12; j++) {
        var m2 = ((startMonth - 1 + j) % 12) + 1;
        var y2 = startYear + Math.floor((startMonth - 1 + j) / 12);
        var k2 = y2 + '-' + m2;
        if (!map[k2]) {
          map[k2] = {
            year: y2,
            month: m2,
            label: this._monthLabel(y2, m2)
          };
        }
      }
    }
    var list = [];
    for (var k in map) {
      if (Object.prototype.hasOwnProperty.call(map, k)) {
        list.push(map[k]);
      }
    }
    list.sort(function(a,b) {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    return list;
  }

  _findById(list, id) {
    if (!Array.isArray(list)) return null;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) {
        return list[i];
      }
    }
    return null;
  }

  _getOrCreateDonationDraft() {
    var donations = this._getFromStorage('donations');
    var currentId = localStorage.getItem('current_donation_id') || '';
    var draft = null;
    if (currentId) {
      draft = this._findById(donations, currentId);
    }
    if (!draft) {
      draft = {
        id: this._generateId('don'),
        fundId: null,
        fund_name: null,
        frequency: 'one_time',
        amount: 0,
        cover_processing_fees: false,
        start_date: null,
        created_at: this._nowISO(),
        updated_at: null,
        status: 'draft',
        donor_first_name: '',
        donor_last_name: '',
        donor_email: '',
        donor_phone: '',
        donor_organization: ''
      };
      donations.push(draft);
      this._saveToStorage('donations', donations);
      localStorage.setItem('current_donation_id', draft.id);
    }
    return draft;
  }

  _getOrCreateTicketCart() {
    var carts = this._getFromStorage('ticket_carts');
    var currentId = localStorage.getItem('current_cart_id') || '';
    var cart = null;
    if (currentId) {
      cart = this._findById(carts, currentId);
      if (cart && cart.status !== 'active') {
        cart = null;
      }
    }
    if (!cart) {
      for (var i = 0; i < carts.length; i++) {
        if (carts[i].status === 'active') {
          cart = carts[i];
          break;
        }
      }
    }
    if (!cart) {
      cart = {
        id: this._generateId('cart'),
        created_at: this._nowISO(),
        updated_at: null,
        status: 'active',
        items: []
      };
      carts.push(cart);
      this._saveToStorage('ticket_carts', carts);
    }
    localStorage.setItem('current_cart_id', cart.id);
    return cart;
  }

  _getCurrentInReviewTicketOrder() {
    var orders = this._getFromStorage('ticket_orders');
    var currentId = localStorage.getItem('current_order_in_review_id') || '';
    var order = null;
    if (currentId) {
      order = this._findById(orders, currentId);
      if (order && order.status !== 'in_review') {
        order = null;
      }
    }
    if (!order) {
      // find latest in_review
      var latest = null;
      for (var i = 0; i < orders.length; i++) {
        var o = orders[i];
        if (o.status === 'in_review') {
          if (!latest || this._parseISO(o.created_at) > this._parseISO(latest.created_at)) {
            latest = o;
          }
        }
      }
      order = latest;
    }
    if (order) {
      localStorage.setItem('current_order_in_review_id', order.id);
    }
    return order;
  }

  _attachEventForeignKeys(eventObj, locations, seasons) {
    if (!eventObj) return null;
    var loc = eventObj.locationId ? this._findById(locations, eventObj.locationId) : null;
    var season = eventObj.seasonId ? this._findById(seasons, eventObj.seasonId) : null;
    var result = {};
    for (var k in eventObj) {
      if (Object.prototype.hasOwnProperty.call(eventObj, k)) {
        result[k] = eventObj[k];
      }
    }
    result.location = loc || null;
    result.season = season || null;
    return result;
  }

  _attachWorkshopForeignKeys(workshop, locations) {
    if (!workshop) return null;
    var loc = workshop.locationId ? this._findById(locations, workshop.locationId) : null;
    var result = {};
    for (var k in workshop) {
      if (Object.prototype.hasOwnProperty.call(workshop, k)) {
        result[k] = workshop[k];
      }
    }
    result.location = loc || null;
    return result;
  }

  _attachSeatForeignKeys(seat, eventObj, priceTier) {
    if (!seat) return null;
    var result = {};
    for (var k in seat) {
      if (Object.prototype.hasOwnProperty.call(seat, k)) {
        result[k] = seat[k];
      }
    }
    result.event = eventObj || null;
    result.priceTier = priceTier || null;
    return result;
  }

  _attachPriceTierForeignKeys(tier, eventObj) {
    if (!tier) return null;
    var result = {};
    for (var k in tier) {
      if (Object.prototype.hasOwnProperty.call(tier, k)) {
        result[k] = tier[k];
      }
    }
    result.event = eventObj || null;
    return result;
  }

  _attachAuditionSlotForeignKeys(slot, locations, seasons) {
    if (!slot) return null;
    var loc = slot.locationId ? this._findById(locations, slot.locationId) : null;
    var season = slot.seasonId ? this._findById(seasons, slot.seasonId) : null;
    var result = {};
    for (var k in slot) {
      if (Object.prototype.hasOwnProperty.call(slot, k)) {
        result[k] = slot[k];
      }
    }
    result.location = loc || null;
    result.season = season || null;
    return result;
  }

  _attachVolunteerOpportunityForeignKeys(opp, locations) {
    if (!opp) return null;
    var loc = opp.locationId ? this._findById(locations, opp.locationId) : null;
    var result = {};
    for (var k in opp) {
      if (Object.prototype.hasOwnProperty.call(opp, k)) {
        result[k] = opp[k];
      }
    }
    result.location = loc || null;
    return result;
  }

  _attachEnsembleForeignKeys(ensemble, locations, seasons) {
    if (!ensemble) return null;
    var loc = ensemble.rehearsalLocationId ? this._findById(locations, ensemble.rehearsalLocationId) : null;
    var season = ensemble.seasonId ? this._findById(seasons, ensemble.seasonId) : null;
    var result = {};
    for (var k in ensemble) {
      if (Object.prototype.hasOwnProperty.call(ensemble, k)) {
        result[k] = ensemble[k];
      }
    }
    result.rehearsalLocation = loc || null;
    result.season = season || null;
    return result;
  }

  // ---------------- Core interface implementations ----------------

  // 1. Homepage content
  getHomePageContent() {
    var events = this._getFromStorage('events');
    var workshops = this._getFromStorage('workshops');
    var locations = this._getFromStorage('locations');
    var seasons = this._getFromStorage('seasons');
    var funds = this._getFromStorage('donation_funds');
    var quickLinks = this._getFromStorage('home_quick_links');
    var newsItems = this._getFromStorage('news_items');

    var publishedEvents = events.filter(function(e) {
      return e.is_published && (e.status === 'scheduled' || e.status === 'postponed');
    });
    publishedEvents.sort(function(a,b) {
      return new Date(a.start_datetime) - new Date(b.start_datetime);
    });
    var featuredEvents = publishedEvents.slice(0,3).map(function(e) {
      return this._attachEventForeignKeys(e, locations, seasons);
    }.bind(this));

    var scheduledWorkshops = workshops.filter(function(w) {
      return w.status === 'scheduled';
    });
    scheduledWorkshops.sort(function(a,b) {
      return new Date(a.start_datetime) - new Date(b.start_datetime);
    });
    var featuredWorkshops = scheduledWorkshops.slice(0,3).map(function(w) {
      return this._attachWorkshopForeignKeys(w, locations);
    }.bind(this));

    var activeFunds = funds.filter(function(f) { return f.is_active; });
    var defaultFund = null;
    for (var i = 0; i < activeFunds.length; i++) {
      if (activeFunds[i].is_default) {
        defaultFund = activeFunds[i];
        break;
      }
    }
    if (!defaultFund) {
      defaultFund = activeFunds[0] || null;
    }

    var fundSummary = null;
    if (defaultFund) {
      fundSummary = {
        id: defaultFund.id,
        name: defaultFund.name,
        description: defaultFund.description || '',
        is_default: !!defaultFund.is_default
      };
    }

    var featuredFund = defaultFund ? { fund: defaultFund } : null;

    return {
      featured_events: featuredEvents,
      featured_workshops: featuredWorkshops,
      featured_fund: featuredFund,
      fund_summary: fundSummary,
      quick_links: Array.isArray(quickLinks) ? quickLinks : [],
      news_items: Array.isArray(newsItems) ? newsItems : []
    };
  }

  // 2. Donation page options
  getDonationPageOptions() {
    var funds = this._getFromStorage('donation_funds');
    var suggested = this._getFromStorage('suggested_donation_amounts');

    // Resolve fund foreign key in suggested amounts
    var suggestedWithFund = suggested.map(function(s) {
      var fund = this._findById(funds, s.fundId);
      var result = {};
      for (var k in s) {
        if (Object.prototype.hasOwnProperty.call(s, k)) {
          result[k] = s[k];
        }
      }
      result.fund = fund || null;
      return result;
    }.bind(this));

    var frequencyOptions = [
      { key: 'one_time', label: 'One-time' },
      { key: 'monthly', label: 'Monthly' },
      { key: 'quarterly', label: 'Quarterly' },
      { key: 'annual', label: 'Annual' }
    ];
    var defaultFrequency = 'one_time';

    var currency = 'USD';
    if (suggested.length > 0 && suggested[0].currency) {
      currency = suggested[0].currency;
    }

    var now = new Date();
    var minStart = now.toISOString().split('T')[0] + 'T00:00:00.000Z';
    var maxDate = new Date(now.getTime());
    maxDate.setUTCFullYear(maxDate.getUTCFullYear() + 1);
    var maxStart = maxDate.toISOString().split('T')[0] + 'T00:00:00.000Z';

    return {
      funds: funds,
      suggested_amounts: suggestedWithFund,
      frequency_options: frequencyOptions,
      default_frequency: defaultFrequency,
      currency: currency,
      min_start_date: minStart,
      max_start_date: maxStart
    };
  }

  // 3. Create or update donation draft and move to in_review
  createOrUpdateDonationDraft(fundId, frequency, amount, coverProcessingFees, startDate, donorFirstName, donorLastName, donorEmail, donorPhone, donorOrganization) {
    var draft = this._getOrCreateDonationDraft();
    var funds = this._getFromStorage('donation_funds');
    var fund = this._findById(funds, fundId) || null;

    draft.fundId = fundId;
    draft.fund_name = fund ? fund.name : null;
    draft.frequency = frequency;
    draft.amount = amount;
    draft.cover_processing_fees = !!coverProcessingFees;
    draft.start_date = startDate || null;
    draft.donor_first_name = donorFirstName;
    draft.donor_last_name = donorLastName;
    draft.donor_email = donorEmail;
    draft.donor_phone = donorPhone || '';
    draft.donor_organization = donorOrganization || '';
    draft.updated_at = this._nowISO();
    draft.status = 'in_review';

    var donations = this._getFromStorage('donations');
    for (var i = 0; i < donations.length; i++) {
      if (donations[i].id === draft.id) {
        donations[i] = draft;
        break;
      }
    }
    this._saveToStorage('donations', donations);

    return {
      success: true,
      donation: draft,
      message: 'Donation draft updated and moved to review.'
    };
  }

  // 4. Donation review summary
  getDonationReviewSummary() {
    var donations = this._getFromStorage('donations');
    var currentId = localStorage.getItem('current_donation_id') || '';
    var donation = null;
    if (currentId) {
      donation = this._findById(donations, currentId);
    }
    if (!donation) {
      // fallback: latest in_review
      var latest = null;
      for (var i = 0; i < donations.length; i++) {
        var d = donations[i];
        if (d.status === 'in_review') {
          if (!latest || this._parseISO(d.updated_at || d.created_at) > this._parseISO(latest.updated_at || latest.created_at)) {
            latest = d;
          }
        }
      }
      donation = latest;
      if (donation) {
        localStorage.setItem('current_donation_id', donation.id);
      }
    }
    if (!donation) {
      return {
        donation: null,
        fund: null,
        display_frequency_label: '',
        processing_fee_amount: 0,
        total_charge_amount: 0
      };
    }
    var funds = this._getFromStorage('donation_funds');
    var fund = this._findById(funds, donation.fundId);

    var freqLabelMap = {
      one_time: 'One-time',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      annual: 'Annual'
    };
    var displayFrequencyLabel = freqLabelMap[donation.frequency] || donation.frequency;

    var processingFeeAmount = 0;
    if (donation.cover_processing_fees) {
      processingFeeAmount = Math.round((donation.amount * 0.029 + 0.3) * 100) / 100;
    }
    var totalChargeAmount = Math.round((donation.amount + processingFeeAmount) * 100) / 100;

    var donationWithFund = {};
    for (var k in donation) {
      if (Object.prototype.hasOwnProperty.call(donation, k)) {
        donationWithFund[k] = donation[k];
      }
    }
    donationWithFund.fund = fund || null;

    return {
      donation: donationWithFund,
      fund: fund || null,
      display_frequency_label: displayFrequencyLabel,
      processing_fee_amount: processingFeeAmount,
      total_charge_amount: totalChargeAmount
    };
  }

  // 5. Confirm donation review
  confirmDonationReview() {
    var donations = this._getFromStorage('donations');
    var currentId = localStorage.getItem('current_donation_id') || '';
    var donation = currentId ? this._findById(donations, currentId) : null;
    if (!donation) {
      return {
        success: false,
        donationId: null,
        status: 'error',
        message: 'No donation draft found to confirm.'
      };
    }
    donation.status = 'submitted';
    donation.updated_at = this._nowISO();
    for (var i = 0; i < donations.length; i++) {
      if (donations[i].id === donation.id) {
        donations[i] = donation;
        break;
      }
    }
    this._saveToStorage('donations', donations);
    return {
      success: true,
      donationId: donation.id,
      status: donation.status,
      message: 'Donation confirmed.'
    };
  }

  // 6. Audition filter options
  getAuditionFilterOptions() {
    var slots = this._getFromStorage('audition_slots');
    var locations = this._getFromStorage('locations');

    // Age options derived from slots
    var ageRangeMap = {};
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (typeof s.min_age === 'number' || typeof s.max_age === 'number') {
        var minA = typeof s.min_age === 'number' ? s.min_age : 0;
        var maxA = typeof s.max_age === 'number' ? s.max_age : minA;
        var key = minA + '-' + maxA;
        if (!ageRangeMap[key]) {
          var label = '';
          if (minA && maxA && minA !== maxA) {
            label = 'Ages ' + minA + '–' + maxA;
          } else if (minA && maxA && minA === maxA) {
            label = 'Age ' + minA;
          } else if (minA && !maxA) {
            label = 'Age ' + minA + '+';
          } else {
            label = 'All ages';
          }
          ageRangeMap[key] = {
            key: key,
            label: label,
            min_age: minA,
            max_age: maxA
          };
        }
      }
    }
    var ageOptions = [];
    for (var k in ageRangeMap) {
      if (Object.prototype.hasOwnProperty.call(ageRangeMap, k)) {
        ageOptions.push(ageRangeMap[k]);
      }
    }
    ageOptions.sort(function(a,b) {
      return a.min_age - b.min_age;
    });

    var monthOptions = this._computeDateMonthOptions(slots.map(function(s) { return s.start_datetime; }));

    var timeOfDayOptions = [
      { key: 'morning', label: 'Morning' },
      { key: 'afternoon', label: 'Afternoon' },
      { key: 'evening', label: 'Evening' }
    ];

    return {
      age_options: ageOptions,
      locations: locations,
      month_options: monthOptions,
      time_of_day_options: timeOfDayOptions
    };
  }

  // 7. Search audition slots
  searchAuditionSlots(childAge, locationId, year, month, timeOfDay, weekdayOnly) {
    var slots = this._getFromStorage('audition_slots');
    var locations = this._getFromStorage('locations');
    var seasons = this._getFromStorage('seasons');
    var weekdayOnlyFlag = !!weekdayOnly;

    var filtered = [];
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (s.status !== 'available') continue;
      if (typeof childAge === 'number') {
        if (typeof s.min_age === 'number' && childAge < s.min_age) continue;
        if (typeof s.max_age === 'number' && childAge > s.max_age) continue;
      }
      if (locationId && s.locationId !== locationId) continue;

      var dt = this._parseISO(s.start_datetime);
      if (!dt || isNaN(dt.getTime())) continue;
      var y = dt.getUTCFullYear();
      var m = dt.getUTCMonth() + 1;
      if (typeof year === 'number' && y !== year) continue;
      if (typeof month === 'number' && m !== month) continue;

      if (timeOfDay && s.time_of_day !== timeOfDay) continue;

      if (weekdayOnlyFlag) {
        if (s.day_of_week === 'saturday' || s.day_of_week === 'sunday') continue;
      }

      if (typeof s.capacity === 'number') {
        var reserved = typeof s.reserved_count === 'number' ? s.reserved_count : 0;
        if (reserved >= s.capacity) continue;
      }

      filtered.push(s);
    }

    filtered.sort(function(a,b) {
      return new Date(a.start_datetime) - new Date(b.start_datetime);
    });

    return filtered.map(function(s) {
      return this._attachAuditionSlotForeignKeys(s, locations, seasons);
    }.bind(this));
  }

  // 8. Audition slot details
  getAuditionSlotDetails(auditionSlotId) {
    var slots = this._getFromStorage('audition_slots');
    var locations = this._getFromStorage('locations');
    var seasons = this._getFromStorage('seasons');
    var slot = this._findById(slots, auditionSlotId);
    if (!slot) {
      return {
        slot: null,
        location: null,
        remaining_capacity: null,
        is_weekday: false,
        display_date: '',
        display_time_range: ''
      };
    }
    var loc = slot.locationId ? this._findById(locations, slot.locationId) : null;

    var remaining = null;
    if (typeof slot.capacity === 'number') {
      var reserved = typeof slot.reserved_count === 'number' ? slot.reserved_count : 0;
      remaining = slot.capacity - reserved;
    }

    var start = this._parseISO(slot.start_datetime);
    var end = this._parseISO(slot.end_datetime);
    var isWeekday = slot.day_of_week !== 'saturday' && slot.day_of_week !== 'sunday';
    var displayDate = start && !isNaN(start.getTime()) ? start.toLocaleDateString() : '';
    var displayTimeRange = '';
    if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
      var opts = { hour: 'numeric', minute: '2-digit' };
      displayTimeRange = start.toLocaleTimeString([], opts) + ' – ' + end.toLocaleTimeString([], opts);
    }

    var slotWithFK = this._attachAuditionSlotForeignKeys(slot, locations, seasons);

    return {
      slot: slotWithFK,
      location: loc || null,
      remaining_capacity: remaining,
      is_weekday: isWeekday,
      display_date: displayDate,
      display_time_range: displayTimeRange
    };
  }

  // 9. Register for audition slot
  registerForAuditionSlot(auditionSlotId, childFirstName, childLastName, childAge, guardianName, guardianPhone, guardianEmail) {
    var slots = this._getFromStorage('audition_slots');
    var slot = this._findById(slots, auditionSlotId);
    if (!slot || slot.status !== 'available') {
      return {
        success: false,
        registration: null,
        message: 'Audition slot is not available.'
      };
    }
    if (typeof slot.capacity === 'number') {
      var reserved = typeof slot.reserved_count === 'number' ? slot.reserved_count : 0;
      if (reserved >= slot.capacity) {
        slot.status = 'full';
        this._saveToStorage('audition_slots', slots);
        return {
          success: false,
          registration: null,
          message: 'Audition slot is full.'
        };
      }
    }

    var registration = {
      id: this._generateId('audreg'),
      auditionSlotId: auditionSlotId,
      child_first_name: childFirstName,
      child_last_name: childLastName,
      child_age: childAge,
      guardian_name: guardianName,
      guardian_phone: guardianPhone,
      guardian_email: guardianEmail,
      created_at: this._nowISO(),
      status: 'submitted'
    };
    var regs = this._getFromStorage('audition_registrations');
    regs.push(registration);
    this._saveToStorage('audition_registrations', regs);

    if (typeof slot.capacity === 'number') {
      var currentReserved = typeof slot.reserved_count === 'number' ? slot.reserved_count : 0;
      slot.reserved_count = currentReserved + 1;
      if (slot.reserved_count >= slot.capacity) {
        slot.status = 'full';
      }
      for (var i = 0; i < slots.length; i++) {
        if (slots[i].id === slot.id) {
          slots[i] = slot;
          break;
        }
      }
      this._saveToStorage('audition_slots', slots);
    }

    return {
      success: true,
      registration: registration,
      message: 'Audition registration submitted.'
    };
  }

  // 10. Scholarship page options
  getScholarshipPageOptions() {
    var scholarshipTypes = this._getFromStorage('scholarship_types');
    var seasons = this._getFromStorage('seasons');
    var incomeRanges = this._getFromStorage('income_range_options');

    var defaultSeasonId = null;
    for (var i = 0; i < seasons.length; i++) {
      if (seasons[i].is_current) {
        defaultSeasonId = seasons[i].id;
        break;
      }
    }
    if (!defaultSeasonId && seasons.length > 0) {
      // choose season with latest start_date in the future or just first
      var now = new Date();
      var candidate = null;
      for (var j = 0; j < seasons.length; j++) {
        var s = seasons[j];
        if (s.start_date) {
          var dt = this._parseISO(s.start_date);
          if (dt && dt >= now) {
            if (!candidate || dt < this._parseISO(candidate.start_date)) {
              candidate = s;
            }
          }
        }
      }
      defaultSeasonId = candidate ? candidate.id : seasons[0].id;
    }

    return {
      scholarship_types: scholarshipTypes,
      seasons: seasons,
      income_ranges: incomeRanges,
      default_season_id: defaultSeasonId
    };
  }

  // 11. Submit scholarship application
  submitScholarshipApplication(scholarshipTypeId, seasonId, singerFirstName, singerLastName, singerDateOfBirth, isCurrentMember, guardianName, guardianEmail, guardianPhone, householdIncomeRangeId, financialNeedExplanation) {
    var application = {
      id: this._generateId('schapp'),
      scholarshipTypeId: scholarshipTypeId,
      seasonId: seasonId,
      singer_first_name: singerFirstName,
      singer_last_name: singerLastName,
      singer_date_of_birth: singerDateOfBirth,
      is_current_member: !!isCurrentMember,
      guardian_name: guardianName,
      guardian_email: guardianEmail,
      guardian_phone: guardianPhone || '',
      household_income_range_id: householdIncomeRangeId,
      financial_need_explanation: financialNeedExplanation,
      created_at: this._nowISO(),
      updated_at: null,
      status: 'submitted'
    };
    var apps = this._getFromStorage('scholarship_applications');
    apps.push(application);
    this._saveToStorage('scholarship_applications', apps);

    return {
      success: true,
      application: application,
      message: 'Scholarship application submitted.'
    };
  }

  // 12. Event filter options
  getEventFilterOptions() {
    var events = this._getFromStorage('events');
    var seasons = this._getFromStorage('seasons');
    var monthOptions = this._computeDateMonthOptions(events.map(function(e) { return e.start_datetime; }));
    var eventTypes = [
      { key: 'concert', label: 'Concerts' },
      { key: 'workshop', label: 'Workshops' },
      { key: 'fundraiser', label: 'Fundraisers' },
      { key: 'other', label: 'Other Events' }
    ];
    return {
      month_options: monthOptions,
      event_types: eventTypes,
      seasons: seasons
    };
  }

  // 13. List events
  listEvents(year, month, eventType) {
    var events = this._getFromStorage('events');
    var locations = this._getFromStorage('locations');
    var seasons = this._getFromStorage('seasons');

    var filtered = events.filter(function(e) {
      if (!e.is_published) return false;
      if (e.status !== 'scheduled' && e.status !== 'postponed') return false;
      return true;
    });

    var result = [];
    for (var i = 0; i < filtered.length; i++) {
      var ev = filtered[i];
      var dt = this._parseISO(ev.start_datetime);
      if (!dt || isNaN(dt.getTime())) continue;
      var y = dt.getUTCFullYear();
      var m = dt.getUTCMonth() + 1;
      if (typeof year === 'number' && y !== year) continue;
      if (typeof month === 'number' && m !== month) continue;
      if (eventType && ev.event_type !== eventType) continue;
      result.push(ev);
    }

    result.sort(function(a,b) {
      return new Date(a.start_datetime) - new Date(b.start_datetime);
    });

    return result.map(function(e) {
      return this._attachEventForeignKeys(e, locations, seasons);
    }.bind(this));
  }

  // 14. Event details
  getEventDetails(eventId) {
    var events = this._getFromStorage('events');
    var locations = this._getFromStorage('locations');
    var seasons = this._getFromStorage('seasons');
    var tiers = this._getFromStorage('ticket_price_tiers');
    var eventObj = this._findById(events, eventId);
    if (!eventObj) {
      return {
        event: null,
        location: null,
        price_tiers: []
      };
    }
    var loc = eventObj.locationId ? this._findById(locations, eventObj.locationId) : null;
    var eventWithFK = this._attachEventForeignKeys(eventObj, locations, seasons);
    var eventTiers = tiers.filter(function(t) {
      return t.eventId === eventId && t.is_active;
    }).map(function(t) {
      return this._attachPriceTierForeignKeys(t, eventWithFK);
    }.bind(this));

    return {
      event: eventWithFK,
      location: loc || null,
      price_tiers: eventTiers
    };
  }

  // 15. Ticket selection data
  getTicketSelectionData(eventId) {
    var events = this._getFromStorage('events');
    var locations = this._getFromStorage('locations');
    var seasons = this._getFromStorage('seasons');
    var tiers = this._getFromStorage('ticket_price_tiers');
    var seats = this._getFromStorage('seats');

    var eventObj = this._findById(events, eventId);
    if (!eventObj) {
      return {
        event: null,
        price_tiers: [],
        seats: []
      };
    }
    var eventWithFK = this._attachEventForeignKeys(eventObj, locations, seasons);

    var eventTiers = tiers.filter(function(t) {
      return t.eventId === eventId && t.is_active;
    }).map(function(t) {
      return this._attachPriceTierForeignKeys(t, eventWithFK);
    }.bind(this));

    var eventSeatsRaw = seats.filter(function(s) {
      return s.eventId === eventId;
    });

    // Build map for price tiers
    var tierMap = {};
    for (var i = 0; i < eventTiers.length; i++) {
      tierMap[eventTiers[i].id] = eventTiers[i];
    }

    var eventSeats = eventSeatsRaw.map(function(s) {
      var priceTier = s.priceTierId ? tierMap[s.priceTierId] || null : null;
      return this._attachSeatForeignKeys(s, eventWithFK, priceTier);
    }.bind(this));

    return {
      event: eventWithFK,
      price_tiers: eventTiers,
      seats: eventSeats
    };
  }

  // 16. Select seats and add to cart
  selectSeatsAndAddToCart(eventId, priceTierId, seatIds) {
    var cart = this._getOrCreateTicketCart();
    var carts = this._getFromStorage('ticket_carts');
    var cartItems = this._getFromStorage('cart_items');
    var seats = this._getFromStorage('seats');
    var tiers = this._getFromStorage('ticket_price_tiers');

    var tier = this._findById(tiers, priceTierId);
    if (!tier || tier.eventId !== eventId) {
      return {
        success: false,
        cart: cart,
        cart_item: null,
        held_seat_ids: [],
        message: 'Invalid price tier for event.'
      };
    }

    var eventSeatsMap = {};
    for (var i = 0; i < seats.length; i++) {
      if (seats[i].eventId === eventId) {
        eventSeatsMap[seats[i].id] = seats[i];
      }
    }

    var validSeatIds = [];
    for (var j = 0; j < seatIds.length; j++) {
      var sid = seatIds[j];
      var seat = eventSeatsMap[sid];
      if (!seat) continue;
      if (seat.priceTierId !== priceTierId) continue;
      if (seat.status === 'sold' || seat.status === 'blocked') continue;
      validSeatIds.push(sid);
    }

    if (validSeatIds.length === 0) {
      return {
        success: false,
        cart: cart,
        cart_item: null,
        held_seat_ids: [],
        message: 'No valid seats selected.'
      };
    }

    var holdUntil = new Date();
    holdUntil.setMinutes(holdUntil.getMinutes() + 15);
    var holdISO = holdUntil.toISOString();

    // Update seat status to held
    for (var k = 0; k < seats.length; k++) {
      if (validSeatIds.indexOf(seats[k].id) !== -1) {
        seats[k].status = 'held';
        seats[k].hold_expires_at = holdISO;
      }
    }
    this._saveToStorage('seats', seats);

    var unitPrice = tier.price;
    var quantity = validSeatIds.length;
    var totalPrice = unitPrice * quantity;

    var cartItem = {
      id: this._generateId('cartitem'),
      cartId: cart.id,
      eventId: eventId,
      priceTierId: priceTierId,
      seatIds: validSeatIds,
      quantity: quantity,
      unit_price: unitPrice,
      total_price: totalPrice
    };
    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    // update cart items summary
    if (!Array.isArray(cart.items)) {
      cart.items = [];
    }
    cart.items.push({
      cart_item_id: cartItem.id,
      eventId: eventId,
      priceTierId: priceTierId,
      quantity: quantity,
      total_price: totalPrice
    });
    cart.updated_at = this._nowISO();
    for (var c = 0; c < carts.length; c++) {
      if (carts[c].id === cart.id) {
        carts[c] = cart;
        break;
      }
    }
    this._saveToStorage('ticket_carts', carts);

    return {
      success: true,
      cart: cart,
      cart_item: cartItem,
      held_seat_ids: validSeatIds,
      message: 'Seats added to cart.'
    };
  }

  // 17. Checkout summary
  getCheckoutSummary() {
    var carts = this._getFromStorage('ticket_carts');
    var cartItems = this._getFromStorage('cart_items');
    var seats = this._getFromStorage('seats');
    var events = this._getFromStorage('events');
    var locations = this._getFromStorage('locations');
    var seasons = this._getFromStorage('seasons');
    var tiers = this._getFromStorage('ticket_price_tiers');

    var cart = null;
    for (var i = 0; i < carts.length; i++) {
      if (carts[i].status === 'active') {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      return {
        cart: null,
        event: null,
        items: [],
        seats: [],
        price_tiers: [],
        subtotal_amount: 0,
        fees_amount: 0,
        total_amount: 0
      };
    }

    var items = [];
    for (var j = 0; j < cartItems.length; j++) {
      if (cartItems[j].cartId === cart.id) {
        items.push(cartItems[j]);
      }
    }

    if (items.length === 0) {
      return {
        cart: cart,
        event: null,
        items: [],
        seats: [],
        price_tiers: [],
        subtotal_amount: 0,
        fees_amount: 0,
        total_amount: 0
      };
    }

    var eventId = items[0].eventId;
    var eventObj = this._findById(events, eventId);
    var eventWithFK = eventObj ? this._attachEventForeignKeys(eventObj, locations, seasons) : null;

    // build maps
    var tierMap = {};
    for (var t = 0; t < tiers.length; t++) {
      if (tiers[t].eventId === eventId) {
        tierMap[tiers[t].id] = tiers[t];
      }
    }

    var seatMap = {};
    for (var s = 0; s < seats.length; s++) {
      if (seats[s].eventId === eventId) {
        seatMap[seats[s].id] = seats[s];
      }
    }

    var subtotal = 0;
    var allSeatIds = [];
    for (var k = 0; k < items.length; k++) {
      subtotal += items[k].total_price;
      if (Array.isArray(items[k].seatIds)) {
        for (var m = 0; m < items[k].seatIds.length; m++) {
          if (allSeatIds.indexOf(items[k].seatIds[m]) === -1) {
            allSeatIds.push(items[k].seatIds[m]);
          }
        }
      }
    }

    var feesAmount = 0;
    var totalAmount = subtotal + feesAmount;

    var priceTiersUsedMap = {};
    var seatsUsed = [];
    for (var n = 0; n < allSeatIds.length; n++) {
      var seat = seatMap[allSeatIds[n]];
      if (!seat) continue;
      var tier = seat.priceTierId ? tierMap[seat.priceTierId] || null : null;
      if (tier) {
        priceTiersUsedMap[tier.id] = tier;
      }
      seatsUsed.push(this._attachSeatForeignKeys(seat, eventWithFK, tier));
    }

    var priceTiersUsed = [];
    for (var tid in priceTiersUsedMap) {
      if (Object.prototype.hasOwnProperty.call(priceTiersUsedMap, tid)) {
        priceTiersUsed.push(this._attachPriceTierForeignKeys(priceTiersUsedMap[tid], eventWithFK));
      }
    }

    var itemsWithFK = items.map(function(ci) {
      var tier = tierMap[ci.priceTierId] || null;
      var tierWithFK = tier ? this._attachPriceTierForeignKeys(tier, eventWithFK) : null;
      var ciSeats = [];
      if (Array.isArray(ci.seatIds)) {
        for (var p = 0; p < ci.seatIds.length; p++) {
          var seat = seatMap[ci.seatIds[p]];
          if (seat) {
            ciSeats.push(this._attachSeatForeignKeys(seat, eventWithFK, tier));
          }
        }
      }
      var result = {};
      for (var k2 in ci) {
        if (Object.prototype.hasOwnProperty.call(ci, k2)) {
          result[k2] = ci[k2];
        }
      }
      result.event = eventWithFK;
      result.priceTier = tierWithFK;
      result.seats = ciSeats;
      return result;
    }.bind(this));

    return {
      cart: cart,
      event: eventWithFK,
      items: itemsWithFK,
      seats: seatsUsed,
      price_tiers: priceTiersUsed,
      subtotal_amount: subtotal,
      fees_amount: feesAmount,
      total_amount: totalAmount
    };
  }

  // 18. Update ticket buyer info and create order
  updateTicketBuyerInfoAndCreateOrder(buyerFirstName, buyerLastName, buyerEmail) {
    var carts = this._getFromStorage('ticket_carts');
    var cartItems = this._getFromStorage('cart_items');
    var seats = this._getFromStorage('seats');
    var events = this._getFromStorage('events');
    var tiers = this._getFromStorage('ticket_price_tiers');
    var orders = this._getFromStorage('ticket_orders');
    var orderItems = this._getFromStorage('ticket_order_items');

    var cart = null;
    for (var i = 0; i < carts.length; i++) {
      if (carts[i].status === 'active') {
        cart = carts[i];
        break;
      }
    }
    if (!cart) {
      return {
        success: false,
        order: null,
        order_items: [],
        message: 'No active cart found.'
      };
    }

    var items = [];
    for (var j = 0; j < cartItems.length; j++) {
      if (cartItems[j].cartId === cart.id) {
        items.push(cartItems[j]);
      }
    }
    if (items.length === 0) {
      return {
        success: false,
        order: null,
        order_items: [],
        message: 'Cart is empty.'
      };
    }

    var eventId = items[0].eventId;
    var subtotal = 0;
    for (var k = 0; k < items.length; k++) {
      subtotal += items[k].total_price;
    }
    var feesAmount = 0;
    var totalAmount = subtotal + feesAmount;

    var order = {
      id: this._generateId('order'),
      cartId: cart.id,
      eventId: eventId,
      buyer_first_name: buyerFirstName,
      buyer_last_name: buyerLastName,
      buyer_email: buyerEmail,
      created_at: this._nowISO(),
      status: 'in_review',
      subtotal_amount: subtotal,
      fees_amount: feesAmount,
      total_amount: totalAmount
    };
    orders.push(order);

    // build seat map
    var seatMap = {};
    for (var s = 0; s < seats.length; s++) {
      seatMap[seats[s].id] = seats[s];
    }

    // create order items and mark seats sold
    var createdOrderItems = [];
    for (var m = 0; m < items.length; m++) {
      var ci = items[m];
      if (Array.isArray(ci.seatIds)) {
        for (var p = 0; p < ci.seatIds.length; p++) {
          var seatId = ci.seatIds[p];
          var seat = seatMap[seatId];
          if (!seat) continue;
          var tier = this._findById(tiers, ci.priceTierId);
          var orderItem = {
            id: this._generateId('orderitem'),
            orderId: order.id,
            seatId: seatId,
            priceTierId: ci.priceTierId,
            seat_label: 'Row ' + seat.row + ', Seat ' + seat.seat_number,
            unit_price: tier ? tier.price : ci.unit_price
          };
          orderItems.push(orderItem);
          createdOrderItems.push(orderItem);
          // mark seat sold
          seat.status = 'sold';
          seat.hold_expires_at = null;
        }
      }
    }

    // save seats
    var seatsArray = [];
    for (var sid in seatMap) {
      if (Object.prototype.hasOwnProperty.call(seatMap, sid)) {
        seatsArray.push(seatMap[sid]);
      }
    }

    // mark cart converted
    cart.status = 'converted';
    cart.updated_at = this._nowISO();

    // persist
    this._saveToStorage('ticket_orders', orders);
    this._saveToStorage('ticket_order_items', orderItems);
    this._saveToStorage('seats', seatsArray);
    for (var c = 0; c < carts.length; c++) {
      if (carts[c].id === cart.id) {
        carts[c] = cart;
        break;
      }
    }
    this._saveToStorage('ticket_carts', carts);

    localStorage.setItem('current_order_in_review_id', order.id);

    return {
      success: true,
      order: order,
      order_items: createdOrderItems,
      message: 'Order created in review status.'
    };
  }

  // 19. Get ticket order review
  getTicketOrderReview(orderId) {
    var orders = this._getFromStorage('ticket_orders');
    var orderItems = this._getFromStorage('ticket_order_items');
    var events = this._getFromStorage('events');
    var locations = this._getFromStorage('locations');
    var seasons = this._getFromStorage('seasons');
    var seats = this._getFromStorage('seats');
    var tiers = this._getFromStorage('ticket_price_tiers');
    var carts = this._getFromStorage('ticket_carts');

    var order = null;
    if (orderId) {
      order = this._findById(orders, orderId);
    } else {
      order = this._getCurrentInReviewTicketOrder();
    }
    if (!order) {
      return {
        order: null,
        order_items: [],
        event: null,
        seats: [],
        price_tiers: []
      };
    }

    var eventObj = this._findById(events, order.eventId);
    var eventWithFK = eventObj ? this._attachEventForeignKeys(eventObj, locations, seasons) : null;

    var items = [];
    for (var i = 0; i < orderItems.length; i++) {
      if (orderItems[i].orderId === order.id) {
        items.push(orderItems[i]);
      }
    }

    var seatMap = {};
    for (var s = 0; s < seats.length; s++) {
      seatMap[seats[s].id] = seats[s];
    }

    var tierMap = {};
    for (var t = 0; t < tiers.length; t++) {
      tierMap[tiers[t].id] = tiers[t];
    }

    var seatsUsedMap = {};
    var priceTiersUsedMap = {};
    var itemsWithFK = items.map(function(oi) {
      var seat = seatMap[oi.seatId] || null;
      var tier = tierMap[oi.priceTierId] || null;
      if (seat) {
        seatsUsedMap[seat.id] = seat;
      }
      if (tier) {
        priceTiersUsedMap[tier.id] = tier;
      }
      var seatWithFK = seat ? this._attachSeatForeignKeys(seat, eventWithFK, tier) : null;
      var tierWithFK = tier ? this._attachPriceTierForeignKeys(tier, eventWithFK) : null;
      var result = {};
      for (var k in oi) {
        if (Object.prototype.hasOwnProperty.call(oi, k)) {
          result[k] = oi[k];
        }
      }
      result.seat = seatWithFK;
      result.priceTier = tierWithFK;
      return result;
    }.bind(this));

    var seatsUsed = [];
    for (var sid in seatsUsedMap) {
      if (Object.prototype.hasOwnProperty.call(seatsUsedMap, sid)) {
        var seat = seatsUsedMap[sid];
        var tier = seat.priceTierId ? tierMap[seat.priceTierId] || null : null;
        seatsUsed.push(this._attachSeatForeignKeys(seat, eventWithFK, tier));
      }
    }

    var priceTiersUsed = [];
    for (var tid in priceTiersUsedMap) {
      if (Object.prototype.hasOwnProperty.call(priceTiersUsedMap, tid)) {
        priceTiersUsed.push(this._attachPriceTierForeignKeys(priceTiersUsedMap[tid], eventWithFK));
      }
    }

    return {
      order: order,
      order_items: itemsWithFK,
      event: eventWithFK,
      seats: seatsUsed,
      price_tiers: priceTiersUsed
    };
  }

  // 20. Confirm ticket order submission
  confirmTicketOrderSubmission(orderId) {
    var orders = this._getFromStorage('ticket_orders');
    var order = this._findById(orders, orderId);
    if (!order) {
      return {
        success: false,
        status: 'error',
        message: 'Order not found.'
      };
    }
    order.status = 'submitted';
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].id === order.id) {
        orders[i] = order;
        break;
      }
    }
    this._saveToStorage('ticket_orders', orders);
    return {
      success: true,
      status: order.status,
      message: 'Order submitted.'
    };
  }

  // 21. Volunteer filter options
  getVolunteerFilterOptions() {
    var opportunities = this._getFromStorage('volunteer_opportunities');
    var locations = this._getFromStorage('locations');
    var monthOptions = this._computeDateMonthOptions(opportunities.map(function(o) { return o.start_datetime; }));
    var roleCategories = [
      { key: 'event_support', label: 'Event Support' },
      { key: 'administrative', label: 'Administrative' },
      { key: 'office', label: 'Office' },
      { key: 'other', label: 'Other' }
    ];
    var dayOptions = [
      { key: 'monday', label: 'Monday' },
      { key: 'tuesday', label: 'Tuesday' },
      { key: 'wednesday', label: 'Wednesday' },
      { key: 'thursday', label: 'Thursday' },
      { key: 'friday', label: 'Friday' },
      { key: 'saturday', label: 'Saturday' },
      { key: 'sunday', label: 'Sunday' }
    ];
    return {
      role_categories: roleCategories,
      locations: locations,
      day_of_week_options: dayOptions,
      month_options: monthOptions
    };
  }

  // 22. List volunteer opportunities
  listVolunteerOpportunities(roleCategory, year, month, dayOfWeek, locationId, includeFull) {
    var opportunities = this._getFromStorage('volunteer_opportunities');
    var locations = this._getFromStorage('locations');

    var includeFullFlag = !!includeFull;

    var filtered = [];
    for (var i = 0; i < opportunities.length; i++) {
      var o = opportunities[i];
      if (!includeFullFlag) {
        if (o.status === 'full' || o.status === 'closed' || o.status === 'cancelled') continue;
      }
      if (roleCategory && o.role_category !== roleCategory) continue;
      if (locationId && o.locationId !== locationId) continue;
      if (dayOfWeek && o.day_of_week !== dayOfWeek) continue;

      var dt = this._parseISO(o.start_datetime);
      if (!dt || isNaN(dt.getTime())) continue;
      var y = dt.getUTCFullYear();
      var m = dt.getUTCMonth() + 1;
      if (typeof year === 'number' && y !== year) continue;
      if (typeof month === 'number' && m !== month) continue;

      filtered.push(o);
    }

    filtered.sort(function(a,b) {
      return new Date(a.start_datetime) - new Date(b.start_datetime);
    });

    return filtered.map(function(o) {
      return this._attachVolunteerOpportunityForeignKeys(o, locations);
    }.bind(this));
  }

  // 23. Volunteer opportunity details
  getVolunteerOpportunityDetails(opportunityId) {
    var opportunities = this._getFromStorage('volunteer_opportunities');
    var locations = this._getFromStorage('locations');
    var opp = this._findById(opportunities, opportunityId);
    if (!opp) {
      return {
        opportunity: null,
        location: null,
        remaining_capacity: null,
        display_date: '',
        display_time_range: ''
      };
    }
    var loc = opp.locationId ? this._findById(locations, opp.locationId) : null;
    var remaining = null;
    if (typeof opp.capacity === 'number') {
      var registered = typeof opp.registered_count === 'number' ? opp.registered_count : 0;
      remaining = opp.capacity - registered;
    }
    var start = this._parseISO(opp.start_datetime);
    var end = this._parseISO(opp.end_datetime);
    var displayDate = start && !isNaN(start.getTime()) ? start.toLocaleDateString() : '';
    var displayTimeRange = '';
    if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
      var opts = { hour: 'numeric', minute: '2-digit' };
      displayTimeRange = start.toLocaleTimeString([], opts) + ' – ' + end.toLocaleTimeString([], opts);
    }

    var oppWithFK = this._attachVolunteerOpportunityForeignKeys(opp, locations);

    return {
      opportunity: oppWithFK,
      location: loc || null,
      remaining_capacity: remaining,
      display_date: displayDate,
      display_time_range: displayTimeRange
    };
  }

  // 24. Register for volunteer opportunity
  registerForVolunteerOpportunity(opportunityId, volunteerFirstName, volunteerLastName, email, phone, receiveUpdates) {
    var opportunities = this._getFromStorage('volunteer_opportunities');
    var opp = this._findById(opportunities, opportunityId);
    if (!opp || opp.status !== 'open') {
      return {
        success: false,
        registration: null,
        message: 'Volunteer opportunity is not open.'
      };
    }

    if (typeof opp.capacity === 'number') {
      var registered = typeof opp.registered_count === 'number' ? opp.registered_count : 0;
      if (registered >= opp.capacity) {
        opp.status = 'full';
        this._saveToStorage('volunteer_opportunities', opportunities);
        return {
          success: false,
          registration: null,
          message: 'Volunteer opportunity is full.'
        };
      }
    }

    var registration = {
      id: this._generateId('volreg'),
      opportunityId: opportunityId,
      volunteer_first_name: volunteerFirstName,
      volunteer_last_name: volunteerLastName,
      email: email,
      phone: phone,
      receive_updates: !!receiveUpdates,
      created_at: this._nowISO(),
      status: 'submitted'
    };
    var regs = this._getFromStorage('volunteer_registrations');
    regs.push(registration);
    this._saveToStorage('volunteer_registrations', regs);

    if (typeof opp.capacity === 'number') {
      var currentRegistered = typeof opp.registered_count === 'number' ? opp.registered_count : 0;
      opp.registered_count = currentRegistered + 1;
      if (opp.registered_count >= opp.capacity) {
        opp.status = 'full';
      }
      for (var i = 0; i < opportunities.length; i++) {
        if (opportunities[i].id === opp.id) {
          opportunities[i] = opp;
          break;
        }
      }
      this._saveToStorage('volunteer_opportunities', opportunities);
    }

    return {
      success: true,
      registration: registration,
      message: 'Volunteer registration submitted.'
    };
  }

  // 25. Ensemble filter options
  getEnsembleFilterOptions() {
    var ensembles = this._getFromStorage('ensembles');
    var seasons = this._getFromStorage('seasons');
    var locations = this._getFromStorage('locations');

    var ageRangeMap = {};
    for (var i = 0; i < ensembles.length; i++) {
      var e = ensembles[i];
      if (typeof e.min_age === 'number' || typeof e.max_age === 'number') {
        var minA = typeof e.min_age === 'number' ? e.min_age : 0;
        var maxA = typeof e.max_age === 'number' ? e.max_age : minA;
        var key = minA + '-' + maxA;
        if (!ageRangeMap[key]) {
          var label = '';
          if (minA && maxA && minA !== maxA) {
            label = 'Ages ' + minA + '–' + maxA;
          } else if (minA && maxA && minA === maxA) {
            label = 'Age ' + minA;
          } else if (minA && !maxA) {
            label = 'Age ' + minA + '+';
          } else {
            label = 'All ages';
          }
          ageRangeMap[key] = {
            key: key,
            label: label,
            min_age: minA,
            max_age: maxA
          };
        }
      }
    }
    var ageOptions = [];
    for (var k in ageRangeMap) {
      if (Object.prototype.hasOwnProperty.call(ageRangeMap, k)) {
        ageOptions.push(ageRangeMap[k]);
      }
    }
    ageOptions.sort(function(a,b) {
      return a.min_age - b.min_age;
    });

    // rehearsal locations that are used
    var rehearsalLocationIds = {};
    for (var j = 0; j < ensembles.length; j++) {
      var en = ensembles[j];
      if (en.rehearsalLocationId) {
        rehearsalLocationIds[en.rehearsalLocationId] = true;
      }
    }
    var rehearsalLocations = locations.filter(function(loc) {
      return !!rehearsalLocationIds[loc.id];
    });

    return {
      seasons: seasons,
      age_options: ageOptions,
      rehearsal_locations: rehearsalLocations
    };
  }

  // 26. List ensembles
  listEnsembles(age, seasonId, maxTuition, weekdayOnly, latestEndTime, includeInactive) {
    var ensembles = this._getFromStorage('ensembles');
    var locations = this._getFromStorage('locations');
    var seasons = this._getFromStorage('seasons');

    var weekdayOnlyFlag = typeof weekdayOnly === 'boolean' ? weekdayOnly : true;
    var includeInactiveFlag = !!includeInactive;

    var filtered = [];
    for (var i = 0; i < ensembles.length; i++) {
      var e = ensembles[i];
      if (!includeInactiveFlag && !e.is_active) continue;

      if (typeof age === 'number') {
        if (typeof e.min_age === 'number' && age < e.min_age) continue;
        if (typeof e.max_age === 'number' && age > e.max_age) continue;
      }

      if (seasonId && e.seasonId !== seasonId) continue;

      if (typeof maxTuition === 'number' && e.tuition_amount > maxTuition) continue;

      if (weekdayOnlyFlag) {
        if (e.rehearsal_day_of_week === 'saturday' || e.rehearsal_day_of_week === 'sunday') continue;
      }

      if (latestEndTime && typeof e.rehearsal_end_time === 'string') {
        if (e.rehearsal_end_time > latestEndTime) continue;
      }

      filtered.push(e);
    }

    filtered.sort(function(a,b) {
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });

    return filtered.map(function(e) {
      return this._attachEnsembleForeignKeys(e, locations, seasons);
    }.bind(this));
  }

  // 27. Ensemble details
  getEnsembleDetails(ensembleId) {
    var ensembles = this._getFromStorage('ensembles');
    var locations = this._getFromStorage('locations');
    var seasons = this._getFromStorage('seasons');

    var ensemble = this._findById(ensembles, ensembleId);
    if (!ensemble) {
      return {
        ensemble: null,
        rehearsal_location: null
      };
    }
    var ensembleWithFK = this._attachEnsembleForeignKeys(ensemble, locations, seasons);
    var loc = ensemble.rehearsalLocationId ? this._findById(locations, ensemble.rehearsalLocationId) : null;

    return {
      ensemble: ensembleWithFK,
      rehearsal_location: loc || null
    };
  }

  // 28. Start ensemble registration
  startEnsembleRegistration(ensembleId, seasonId, singerFirstName, singerLastName, singerAge, singerSchool) {
    var registration = {
      id: this._generateId('ensreg'),
      ensembleId: ensembleId,
      seasonId: seasonId,
      singer_first_name: singerFirstName,
      singer_last_name: singerLastName,
      singer_age: singerAge,
      singer_school: singerSchool || '',
      created_at: this._nowISO(),
      status: 'started'
    };
    var regs = this._getFromStorage('ensemble_registrations');
    regs.push(registration);
    this._saveToStorage('ensemble_registrations', regs);

    return {
      success: true,
      registration: registration,
      message: 'Ensemble registration started.'
    };
  }

  // 29. Newsletter options
  getNewsletterOptions() {
    var interests = this._getFromStorage('newsletter_interest_options');
    var frequencies = this._getFromStorage('newsletter_frequency_options');
    return {
      interests: interests,
      frequencies: frequencies
    };
  }

  // 30. Subscribe to newsletter
  subscribeToNewsletter(email, firstName, lastName, interests, frequency, agreedToTerms) {
    var subscription = {
      id: this._generateId('nls'),
      email: email,
      first_name: firstName,
      last_name: lastName,
      interests: Array.isArray(interests) ? interests.slice() : [],
      frequency: frequency,
      agreed_to_terms: !!agreedToTerms,
      subscribed_at: this._nowISO(),
      status: 'subscribed'
    };
    var subs = this._getFromStorage('newsletter_subscriptions');
    subs.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription: subscription,
      message: 'Subscribed to newsletter.'
    };
  }

  // 31. Workshop filter options
  getWorkshopFilterOptions() {
    var workshops = this._getFromStorage('workshops');
    var locations = this._getFromStorage('locations');

    var monthOptions = this._computeDateMonthOptions(workshops.map(function(w) { return w.start_datetime; }));

    var ageGroupKeysMap = {};
    for (var i = 0; i < workshops.length; i++) {
      ageGroupKeysMap[workshops[i].age_group] = true;
    }
    var ageGroups = [];
    var ageLabels = {
      adult_18_plus: 'Adult (18+)',
      youth: 'Youth',
      all_ages: 'All Ages',
      family: 'Family'
    };
    for (var key in ageGroupKeysMap) {
      if (Object.prototype.hasOwnProperty.call(ageGroupKeysMap, key) && key) {
        ageGroups.push({
          key: key,
          label: ageLabels[key] || key
        });
      }
    }

    var feeTypeKeysMap = {};
    for (var j = 0; j < workshops.length; j++) {
      feeTypeKeysMap[workshops[j].fee_type] = true;
    }
    var feeTypes = [];
    var feeLabels = {
      free: 'Free',
      paid: 'Paid'
    };
    for (var fkey in feeTypeKeysMap) {
      if (Object.prototype.hasOwnProperty.call(feeTypeKeysMap, fkey) && fkey) {
        feeTypes.push({
          key: fkey,
          label: feeLabels[fkey] || fkey
        });
      }
    }

    return {
      age_groups: ageGroups,
      fee_types: feeTypes,
      locations: locations,
      month_options: monthOptions
    };
  }

  // 32. List workshops
  listWorkshops(ageGroup, feeType, year, month, locationId, includeFull) {
    var workshops = this._getFromStorage('workshops');
    var locations = this._getFromStorage('locations');

    var includeFullFlag = !!includeFull;

    var filtered = [];
    for (var i = 0; i < workshops.length; i++) {
      var w = workshops[i];
      if (!includeFullFlag) {
        if (w.status === 'full' || w.status === 'cancelled') continue;
      }
      if (ageGroup && w.age_group !== ageGroup) continue;
      if (feeType && w.fee_type !== feeType) continue;
      if (locationId && w.locationId !== locationId) continue;

      var dt = this._parseISO(w.start_datetime);
      if (!dt || isNaN(dt.getTime())) continue;
      var y = dt.getUTCFullYear();
      var m = dt.getUTCMonth() + 1;
      if (typeof year === 'number' && y !== year) continue;
      if (typeof month === 'number' && m !== month) continue;

      filtered.push(w);
    }

    filtered.sort(function(a,b) {
      return new Date(a.start_datetime) - new Date(b.start_datetime);
    });

    return filtered.map(function(w) {
      return this._attachWorkshopForeignKeys(w, locations);
    }.bind(this));
  }

  // 33. Workshop details
  getWorkshopDetails(workshopId) {
    var workshops = this._getFromStorage('workshops');
    var locations = this._getFromStorage('locations');
    var workshop = this._findById(workshops, workshopId);
    if (!workshop) {
      return {
        workshop: null,
        location: null,
        remaining_capacity: null,
        display_date: '',
        display_time_range: ''
      };
    }
    var loc = workshop.locationId ? this._findById(locations, workshop.locationId) : null;
    var remaining = null;
    if (typeof workshop.capacity === 'number') {
      var reserved = typeof workshop.reserved_count === 'number' ? workshop.reserved_count : 0;
      remaining = workshop.capacity - reserved;
    }
    var start = this._parseISO(workshop.start_datetime);
    var end = this._parseISO(workshop.end_datetime);
    var displayDate = start && !isNaN(start.getTime()) ? start.toLocaleDateString() : '';
    var displayTimeRange = '';
    if (start && end && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
      var opts = { hour: 'numeric', minute: '2-digit' };
      displayTimeRange = start.toLocaleTimeString([], opts) + ' – ' + end.toLocaleTimeString([], opts);
    }

    var workshopWithFK = this._attachWorkshopForeignKeys(workshop, locations);

    return {
      workshop: workshopWithFK,
      location: loc || null,
      remaining_capacity: remaining,
      display_date: displayDate,
      display_time_range: displayTimeRange
    };
  }

  // 34. Register for workshop
  registerForWorkshop(workshopId, participantFirstName, participantLastName, email, quantity) {
    var workshops = this._getFromStorage('workshops');
    var workshop = this._findById(workshops, workshopId);
    if (!workshop || workshop.status === 'cancelled') {
      return {
        success: false,
        registration: null,
        message: 'Workshop is not available.'
      };
    }
    var qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;

    if (typeof workshop.capacity === 'number') {
      var reserved = typeof workshop.reserved_count === 'number' ? workshop.reserved_count : 0;
      if (reserved + qty > workshop.capacity) {
        return {
          success: false,
          registration: null,
          message: 'Not enough workshop capacity.'
        };
      }
    }

    var registration = {
      id: this._generateId('wkreg'),
      workshopId: workshopId,
      participant_first_name: participantFirstName,
      participant_last_name: participantLastName,
      email: email,
      quantity: qty,
      created_at: this._nowISO(),
      status: 'submitted'
    };
    var regs = this._getFromStorage('workshop_registrations');
    regs.push(registration);
    this._saveToStorage('workshop_registrations', regs);

    if (typeof workshop.capacity === 'number') {
      var currentReserved = typeof workshop.reserved_count === 'number' ? workshop.reserved_count : 0;
      workshop.reserved_count = currentReserved + qty;
      if (workshop.reserved_count >= workshop.capacity) {
        workshop.status = 'full';
      }
      for (var i = 0; i < workshops.length; i++) {
        if (workshops[i].id === workshop.id) {
          workshops[i] = workshop;
          break;
        }
      }
      this._saveToStorage('workshops', workshops);
    }

    return {
      success: true,
      registration: registration,
      message: 'Workshop registration submitted.'
    };
  }

  // 35. Organization profile
  getOrganizationProfile() {
    var profile = this._getFromStorage('organization_profile');
    if (!profile || typeof profile !== 'object') {
      profile = {};
    }
    return {
      mission: profile.mission || '',
      history: profile.history || '',
      focus_on_youth_scholarships: profile.focus_on_youth_scholarships || '',
      focus_on_community_singing: profile.focus_on_community_singing || '',
      leadership: Array.isArray(profile.leadership) ? profile.leadership : [],
      key_programs: Array.isArray(profile.key_programs) ? profile.key_programs : []
    };
  }

  // 36. Contact info
  getContactInfo() {
    var info = this._getFromStorage('contact_info');
    var locations = this._getFromStorage('locations');
    if (!info || typeof info !== 'object') {
      info = {};
    }
    return {
      phone_numbers: Array.isArray(info.phone_numbers) ? info.phone_numbers : [],
      email_addresses: Array.isArray(info.email_addresses) ? info.email_addresses : [],
      mailing_address: info.mailing_address || {
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: ''
      },
      locations: locations
    };
  }

  // 37. Submit contact form
  submitContactForm(name, email, topic, subject, message) {
    var messages = this._getFromStorage('contact_messages');
    var msg = {
      id: this._generateId('contact'),
      name: name,
      email: email,
      topic: topic,
      subject: subject,
      message: message,
      created_at: this._nowISO()
    };
    messages.push(msg);
    this._saveToStorage('contact_messages', messages);
    return {
      success: true,
      messageId: msg.id,
      message: 'Contact message submitted.'
    };
  }

  // 38. Policies
  getPolicies() {
    var policies = this._getFromStorage('policies');
    if (!policies || typeof policies !== 'object') {
      policies = {};
    }
    return {
      privacy_policy_html: policies.privacy_policy_html || '',
      terms_of_use_html: policies.terms_of_use_html || '',
      data_handling_summary: policies.data_handling_summary || ''
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
