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
  }

  // ----------------------
  // Storage helpers
  // ----------------------
  _initStorage() {
    // Core ID counter
    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Helper to ensure array tables
    var tables = [
      'cities',
      'neighborhoods',
      'housing_listings',
      'favorites_lists',
      'favorites_list_items',
      'eligibility_screener_sessions',
      'eligibility_screener_result_summaries',
      'programs',
      'program_comparison_selections',
      'program_pre_applications',
      'events',
      'event_registrations',
      'funds',
      'donations',
      'newsletter_subscriptions',
      'offices',
      'appointment_slots',
      'appointments',
      'volunteer_roles',
      'volunteer_signups',
      'resources',
      'reading_lists',
      'reading_list_items',
      // extra internal table for contact form submissions
      'contact_messages'
    ];

    for (var i = 0; i < tables.length; i++) {
      var key = tables[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    }
    // user_context will be lazily created
  }

  _getFromStorage(key, defaultValue) {
    var data = localStorage.getItem(key);
    if (!data) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return typeof defaultValue !== 'undefined' ? defaultValue : [];
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

  _nowISOString() {
    return new Date().toISOString();
  }

  _todayISODate() {
    return new Date().toISOString().slice(0, 10);
  }

  _addDays(dateOrString, days) {
    var d = dateOrString instanceof Date ? new Date(dateOrString.getTime()) : new Date(dateOrString);
    d.setDate(d.getDate() + days);
    return d;
  }

  _generateShortDescription(text, maxLen) {
    if (!text) return '';
    var ml = typeof maxLen === 'number' ? maxLen : 140;
    if (text.length <= ml) return text;
    var shortened = text.slice(0, ml);
    var lastSpace = shortened.lastIndexOf(' ');
    if (lastSpace > 50) {
      shortened = shortened.slice(0, lastSpace);
    }
    return shortened + '...';
  }

  _getWeekdayName(dateTimeString) {
    if (!dateTimeString) return '';
    var d = new Date(dateTimeString);
    if (isNaN(d.getTime())) return '';
    var names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return names[d.getDay()];
  }

  // ----------------------
  // User context helpers
  // ----------------------
  _getOrCreateUserContext() {
    var raw = localStorage.getItem('user_context');
    var ctx;
    if (raw) {
      try {
        ctx = JSON.parse(raw);
      } catch (e) {
        ctx = null;
      }
    }
    if (!ctx || typeof ctx !== 'object') {
      ctx = {
        id: this._generateId('userctx'),
        currentEligibilityScreenerSessionId: null,
        currentProgramComparisonSelectionId: null
      };
      localStorage.setItem('user_context', JSON.stringify(ctx));
    }
    return ctx;
  }

  _saveUserContext(ctx) {
    localStorage.setItem('user_context', JSON.stringify(ctx));
  }

  _getCurrentEligibilityScreenerSession() {
    var ctx = this._getOrCreateUserContext();
    var sessions = this._getFromStorage('eligibility_screener_sessions');
    if (ctx.currentEligibilityScreenerSessionId) {
      for (var i = 0; i < sessions.length; i++) {
        if (sessions[i].id === ctx.currentEligibilityScreenerSessionId) {
          return sessions[i];
        }
      }
    }
    // create a new default session
    var cities = this._getFromStorage('cities');
    var defaultCityId = cities && cities.length ? cities[0].id : null;
    var newSession = {
      id: this._generateId('screener'),
      startedAt: this._nowISOString(),
      completedAt: null,
      householdSize: 0,
      cityId: defaultCityId,
      incomeType: 'monthly_income',
      incomeAmount: 0,
      housingStatus: 'other',
      hasHousingVoucher: false,
      specialCircumstances: [],
      resultsGenerated: false
    };
    sessions.push(newSession);
    this._saveToStorage('eligibility_screener_sessions', sessions);
    ctx.currentEligibilityScreenerSessionId = newSession.id;
    this._saveUserContext(ctx);
    return newSession;
  }

  _getOrCreateProgramComparisonSelection() {
    var ctx = this._getOrCreateUserContext();
    var selections = this._getFromStorage('program_comparison_selections');
    if (ctx.currentProgramComparisonSelectionId) {
      for (var i = 0; i < selections.length; i++) {
        if (selections[i].id === ctx.currentProgramComparisonSelectionId) {
          return selections[i];
        }
      }
    }
    var newSel = {
      id: this._generateId('progcomp'),
      selectedProgramIds: [],
      createdAt: this._nowISOString()
    };
    selections.push(newSel);
    this._saveToStorage('program_comparison_selections', selections);
    ctx.currentProgramComparisonSelectionId = newSel.id;
    this._saveUserContext(ctx);
    return newSel;
  }

  _calculateDonationFees(amount, coverFees) {
    var amt = typeof amount === 'number' ? amount : 0;
    if (!coverFees) {
      return { feeAmount: 0, totalCharged: amt };
    }
    var rate = 0.029;
    var fixed = 0.3;
    var fee = amt * rate + fixed;
    fee = Math.round(fee * 100) / 100;
    var total = amt + fee;
    total = Math.round(total * 100) / 100;
    return { feeAmount: fee, totalCharged: total };
  }

  _getOrCreateFavoritesListByName(name) {
    var lists = this._getFromStorage('favorites_lists');
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].name === name) {
        return lists[i];
      }
    }
    var newList = {
      id: this._generateId('favlist'),
      name: name,
      createdAt: this._nowISOString()
    };
    lists.push(newList);
    this._saveToStorage('favorites_lists', lists);
    return newList;
  }

  _getOrCreateReadingListByName(name) {
    var lists = this._getFromStorage('reading_lists');
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].name === name) {
        return lists[i];
      }
    }
    var newList = {
      id: this._generateId('readlist'),
      name: name,
      createdAt: this._nowISOString()
    };
    lists.push(newList);
    this._saveToStorage('reading_lists', lists);
    return newList;
  }

  _isProgramEligibleForSession(program, session) {
    if (!program || !session) return false;
    // City match if both have cityId
    if (session.cityId && program.cityId && program.cityId !== session.cityId) {
      return false;
    }
    var householdSize = session.householdSize || 0;
    var eligiblePopCodes;
    if (householdSize <= 1) {
      eligiblePopCodes = ['single_adults', 'other'];
    } else {
      eligiblePopCodes = ['families_with_children', 'other'];
    }
    if (program.whoWeServe && program.whoWeServe.length) {
      var match = false;
      for (var i = 0; i < program.whoWeServe.length; i++) {
        if (eligiblePopCodes.indexOf(program.whoWeServe[i]) !== -1) {
          match = true;
          break;
        }
      }
      if (!match) return false;
    }
    return true;
  }

  // ----------------------
  // Homepage
  // ----------------------
  getHomePageContent() {
    var funds = this._getFromStorage('funds');
    var offices = this._getFromStorage('offices');
    var cities = this._getFromStorage('cities');

    var cityById = {};
    for (var ci = 0; ci < cities.length; ci++) {
      cityById[cities[ci].id] = cities[ci];
    }

    var urgentHelpSections = [];

    // Emergency rent relief section derived from fund if present
    var emergencyFund = null;
    for (var fi = 0; fi < funds.length; fi++) {
      if (funds[fi].code === 'emergency_rent_relief_fund' && funds[fi].isActive) {
        emergencyFund = funds[fi];
        break;
      }
    }
    if (emergencyFund) {
      urgentHelpSections.push({
        key: 'emergency_rent_relief',
        title: emergencyFund.name || 'Emergency Rent Relief Fund',
        description: emergencyFund.description || 'Get help covering rent in an emergency.',
        relatedFundId: emergencyFund.id,
        relatedFund: emergencyFund
      });
    }

    // Housing counseling section derived from a downtown office if present
    var downtownOffice = null;
    for (var oi = 0; oi < offices.length; oi++) {
      if (offices[oi].officeType === 'downtown_office' && offices[oi].isActive) {
        downtownOffice = offices[oi];
        break;
      }
    }
    if (downtownOffice) {
      var officeCity = cityById[downtownOffice.cityId] || null;
      var officeResolved = officeCity
        ? Object.assign({}, downtownOffice, { city: officeCity })
        : downtownOffice;
      urgentHelpSections.push({
        key: 'housing_counseling',
        title: 'Housing Counseling',
        description: 'Get one-on-one help with your housing situation.',
        relatedOfficeId: downtownOffice.id,
        relatedOffice: officeResolved
      });
    }

    var featuredNavigationSections = [
      {
        key: 'find_housing',
        label: 'Find Housing',
        description: 'Search affordable housing listings in your community.'
      },
      {
        key: 'check_eligibility',
        label: 'Check Eligibility',
        description: 'See which housing programs or funds you may qualify for.'
      },
      {
        key: 'view_programs',
        label: 'Housing Programs',
        description: 'Learn about our housing and homelessness programs.'
      },
      {
        key: 'browse_resources',
        label: 'Resources Library',
        description: 'Read guides and tools about renters rights and housing stability.'
      }
    ];

    // Upcoming events: next 30 days
    var today = this._todayISODate();
    var endDate = this._addDays(new Date(), 30).toISOString().slice(0, 10);
    var searchResults = this.searchEvents(null, null, null, today, endDate, true) || [];
    var upcomingEvents = [];
    for (var se = 0; se < searchResults.length && se < 3; se++) {
      var ev = searchResults[se];
      upcomingEvents.push({
        eventId: ev.eventId,
        title: ev.title,
        topic: ev.topic,
        startDateTime: ev.startDateTime,
        format: ev.format,
        event: ev.event
      });
    }

    // Featured programs: first few active programs
    var programs = this._getFromStorage('programs');
    var featuredPrograms = [];
    for (var pi = 0; pi < programs.length && featuredPrograms.length < 3; pi++) {
      if (!programs[pi].isActive) continue;
      featuredPrograms.push({
        programId: programs[pi].id,
        name: programs[pi].name,
        programType: programs[pi].programType,
        shortDescription: this._generateShortDescription(programs[pi].description),
        program: programs[pi]
      });
    }

    var engagementCallouts = [
      {
        type: 'donate',
        title: 'Support Our Work',
        description: 'Your donation keeps neighbors housed and supported.'
      },
      {
        type: 'volunteer',
        title: 'Volunteer With Us',
        description: 'Share your time and skills to support our community.'
      },
      {
        type: 'newsletter',
        title: 'Stay Informed',
        description: 'Get housing updates, stories, and opportunities by email.'
      }
    ];

    return {
      urgentHelpSections: urgentHelpSections,
      featuredNavigationSections: featuredNavigationSections,
      upcomingEvents: upcomingEvents,
      featuredPrograms: featuredPrograms,
      engagementCallouts: engagementCallouts
    };
  }

  // ----------------------
  // Housing search & favorites
  // ----------------------
  getHousingSearchFilters() {
    var listings = this._getFromStorage('housing_listings');
    var neighborhoods = this._getFromStorage('neighborhoods');
    var cities = this._getFromStorage('cities');

    var bedroomSet = {};
    var rents = [];
    for (var i = 0; i < listings.length; i++) {
      var l = listings[i];
      if (!l.isActive) continue;
      if (typeof l.bedrooms === 'number') {
        bedroomSet[l.bedrooms] = true;
      }
      if (typeof l.rent === 'number') {
        rents.push(l.rent);
      }
    }
    var bedroomOptions = Object.keys(bedroomSet)
      .map(function (x) { return parseInt(x, 10); })
      .sort(function (a, b) { return a - b; });

    rents.sort(function (a, b) { return a - b; });
    var maxRentSuggestions = [];
    for (var r = 0; r < rents.length && maxRentSuggestions.length < 5; r++) {
      if (maxRentSuggestions.indexOf(rents[r]) === -1) {
        maxRentSuggestions.push(rents[r]);
      }
    }

    var citiesById = {};
    for (var c = 0; c < cities.length; c++) {
      citiesById[cities[c].id] = cities[c];
    }

    var neighborhoodsOut = [];
    for (var n = 0; n < neighborhoods.length; n++) {
      var nb = neighborhoods[n];
      var city = citiesById[nb.cityId];
      neighborhoodsOut.push({
        id: nb.id,
        name: nb.name,
        cityName: city ? city.name : null
      });
    }

    var defaultAvailabilityBy = this._addDays(new Date(), 30).toISOString().slice(0, 10);

    return {
      bedroomOptions: bedroomOptions,
      maxRentSuggestions: maxRentSuggestions,
      neighborhoods: neighborhoodsOut,
      cities: cities,
      defaultAvailabilityBy: defaultAvailabilityBy
    };
  }

  searchHousingListings(keywords, bedrooms, minBedrooms, maxBedrooms, maxRent, neighborhoodId, cityId, availabilityBy, sortBy, sortOrder) {
    var listings = this._getFromStorage('housing_listings');
    var neighborhoods = this._getFromStorage('neighborhoods');
    var cities = this._getFromStorage('cities');

    var neighborhoodsById = {};
    for (var i = 0; i < neighborhoods.length; i++) {
      neighborhoodsById[neighborhoods[i].id] = neighborhoods[i];
    }
    var citiesById = {};
    for (var j = 0; j < cities.length; j++) {
      citiesById[cities[j].id] = cities[j];
    }

    var kw = keywords && typeof keywords === 'string' ? keywords.toLowerCase() : null;
    var availDate = availabilityBy ? new Date(availabilityBy) : null;

    var filtered = [];
    for (var li = 0; li < listings.length; li++) {
      var l = listings[li];
      if (!l.isActive) continue;

      if (typeof bedrooms === 'number' && l.bedrooms !== bedrooms) continue;
      if (typeof minBedrooms === 'number' && l.bedrooms < minBedrooms) continue;
      if (typeof maxBedrooms === 'number' && l.bedrooms > maxBedrooms) continue;
      if (typeof maxRent === 'number' && l.rent > maxRent) continue;
      if (neighborhoodId && l.neighborhoodId !== neighborhoodId) continue;
      if (cityId && l.cityId !== cityId) continue;
      if (availDate && l.availabilityDate) {
        var la = new Date(l.availabilityDate);
        if (la > availDate) continue;
      }
      if (kw) {
        var text = (l.title || '') + ' ' + (l.description || '');
        if (text.toLowerCase().indexOf(kw) === -1) continue;
      }
      filtered.push(l);
    }

    var sb = sortBy || 'availability_date';
    var so = sortOrder || 'asc';
    filtered.sort(function (a, b) {
      var av, bv;
      if (sb === 'rent') {
        av = a.rent || 0;
        bv = b.rent || 0;
      } else if (sb === 'created_at') {
        av = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bv = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      } else {
        av = a.availabilityDate ? new Date(a.availabilityDate).getTime() : 0;
        bv = b.availabilityDate ? new Date(b.availabilityDate).getTime() : 0;
      }
      if (av < bv) return so === 'asc' ? -1 : 1;
      if (av > bv) return so === 'asc' ? 1 : -1;
      return 0;
    });

    var out = [];
    for (var k = 0; k < filtered.length; k++) {
      var l2 = filtered[k];
      var nb = neighborhoodsById[l2.neighborhoodId];
      var city = citiesById[l2.cityId];
      out.push({
        id: l2.id,
        title: l2.title,
        bedrooms: l2.bedrooms,
        bathrooms: l2.bathrooms,
        rent: l2.rent,
        unitType: l2.unitType,
        availabilityDate: l2.availabilityDate,
        neighborhoodName: nb ? nb.name : null,
        cityName: city ? city.name : null,
        shortDescription: this._generateShortDescription(l2.description),
        isActive: l2.isActive
      });
    }

    return out;
  }

  getHousingListingDetail(listingId) {
    var listings = this._getFromStorage('housing_listings');
    var neighborhoods = this._getFromStorage('neighborhoods');
    var cities = this._getFromStorage('cities');

    var listing = null;
    for (var i = 0; i < listings.length; i++) {
      if (listings[i].id === listingId) {
        listing = listings[i];
        break;
      }
    }
    if (!listing) {
      return {
        listing: null,
        applicationInstructions: '',
        externalApplyUrl: null
      };
    }

    var nb = null;
    for (var j = 0; j < neighborhoods.length; j++) {
      if (neighborhoods[j].id === listing.neighborhoodId) {
        nb = neighborhoods[j];
        break;
      }
    }
    var city = null;
    for (var k = 0; k < cities.length; k++) {
      if (cities[k].id === listing.cityId) {
        city = cities[k];
        break;
      }
    }

    var listingOut = {
      id: listing.id,
      title: listing.title,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      rent: listing.rent,
      unitType: listing.unitType,
      availabilityDate: listing.availabilityDate,
      address: listing.address,
      postalCode: listing.postalCode,
      description: listing.description,
      neighborhoodName: nb ? nb.name : null,
      cityName: city ? city.name : null,
      isActive: listing.isActive
    };

    return {
      listing: listingOut,
      applicationInstructions: 'Contact the property manager listed for this unit to apply.',
      externalApplyUrl: null
    };
  }

  getRelatedHousingListings(listingId) {
    var listings = this._getFromStorage('housing_listings');
    var neighborhoods = this._getFromStorage('neighborhoods');
    var cities = this._getFromStorage('cities');

    var neighborhoodsById = {};
    for (var i = 0; i < neighborhoods.length; i++) {
      neighborhoodsById[neighborhoods[i].id] = neighborhoods[i];
    }
    var citiesById = {};
    for (var j = 0; j < cities.length; j++) {
      citiesById[cities[j].id] = cities[j];
    }

    var base = null;
    for (var k = 0; k < listings.length; k++) {
      if (listings[k].id === listingId) {
        base = listings[k];
        break;
      }
    }
    if (!base) return [];

    var candidates = [];
    for (var li = 0; li < listings.length; li++) {
      var l = listings[li];
      if (!l.isActive) continue;
      if (l.id === base.id) continue;
      var score = 0;
      if (l.neighborhoodId && l.neighborhoodId === base.neighborhoodId) score += 2;
      if (l.cityId && l.cityId === base.cityId) score += 1;
      if (typeof base.bedrooms === 'number' && l.bedrooms === base.bedrooms) score += 1;
      candidates.push({ listing: l, score: score });
    }
    candidates.sort(function (a, b) {
      if (a.score !== b.score) return b.score - a.score;
      var at = a.listing.availabilityDate ? new Date(a.listing.availabilityDate).getTime() : 0;
      var bt = b.listing.availabilityDate ? new Date(b.listing.availabilityDate).getTime() : 0;
      return at - bt;
    });

    var out = [];
    for (var ci = 0; ci < candidates.length && out.length < 5; ci++) {
      var l2 = candidates[ci].listing;
      var nb = neighborhoodsById[l2.neighborhoodId];
      var city = citiesById[l2.cityId];
      out.push({
        id: l2.id,
        title: l2.title,
        bedrooms: l2.bedrooms,
        rent: l2.rent,
        availabilityDate: l2.availabilityDate,
        neighborhoodName: nb ? nb.name : null,
        cityName: city ? city.name : null
      });
    }
    return out;
  }

  getFavoritesLists() {
    var lists = this._getFromStorage('favorites_lists');
    var items = this._getFromStorage('favorites_list_items');

    var out = [];
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i];
      var count = 0;
      for (var j = 0; j < items.length; j++) {
        if (items[j].favoritesListId === list.id) count++;
      }
      out.push({
        id: list.id,
        name: list.name,
        createdAt: list.createdAt,
        itemCount: count
      });
    }
    return out;
  }

  createFavoritesList(name) {
    var lists = this._getFromStorage('favorites_lists');
    var newList = {
      id: this._generateId('favlist'),
      name: name,
      createdAt: this._nowISOString()
    };
    lists.push(newList);
    this._saveToStorage('favorites_lists', lists);
    return { favoritesList: newList };
  }

  addListingToFavorites(listingId, favoritesListId) {
    var lists = this._getFromStorage('favorites_lists');
    var listings = this._getFromStorage('housing_listings');
    var items = this._getFromStorage('favorites_list_items');

    var list = null;
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].id === favoritesListId) {
        list = lists[i];
        break;
      }
    }
    if (!list) {
      return {
        success: false,
        favoritesListItem: null,
        message: 'Favorites list not found.'
      };
    }

    var listing = null;
    for (var j = 0; j < listings.length; j++) {
      if (listings[j].id === listingId) {
        listing = listings[j];
        break;
      }
    }
    if (!listing) {
      return {
        success: false,
        favoritesListItem: null,
        message: 'Listing not found.'
      };
    }

    for (var k = 0; k < items.length; k++) {
      if (items[k].favoritesListId === favoritesListId && items[k].listingId === listingId) {
        var existingItem = items[k];
        var resolvedExisting = Object.assign({}, existingItem, {
          favoritesList: list,
          listing: listing
        });
        return {
          success: true,
          favoritesListItem: resolvedExisting,
          message: 'Listing already in favorites list.'
        };
      }
    }

    var newItem = {
      id: this._generateId('favitem'),
      favoritesListId: favoritesListId,
      listingId: listingId,
      addedAt: this._nowISOString()
    };
    items.push(newItem);
    this._saveToStorage('favorites_list_items', items);

    var resolved = Object.assign({}, newItem, {
      favoritesList: list,
      listing: listing
    });

    return {
      success: true,
      favoritesListItem: resolved,
      message: 'Listing added to favorites list.'
    };
  }

  // ----------------------
  // Eligibility screener
  // ----------------------
  startEligibilityScreener() {
    var sessions = this._getFromStorage('eligibility_screener_sessions');
    var cities = this._getFromStorage('cities');
    var defaultCityId = cities && cities.length ? cities[0].id : null;

    var newSession = {
      id: this._generateId('screener'),
      startedAt: this._nowISOString(),
      completedAt: null,
      householdSize: 0,
      cityId: defaultCityId,
      incomeType: 'monthly_income',
      incomeAmount: 0,
      housingStatus: 'other',
      hasHousingVoucher: false,
      specialCircumstances: [],
      resultsGenerated: false
    };
    sessions.push(newSession);
    this._saveToStorage('eligibility_screener_sessions', sessions);

    var ctx = this._getOrCreateUserContext();
    ctx.currentEligibilityScreenerSessionId = newSession.id;
    this._saveUserContext(ctx);

    return {
      screenerSession: {
        id: newSession.id,
        startedAt: newSession.startedAt
      }
    };
  }

  getEligibilityScreenerOptions() {
    var cities = this._getFromStorage('cities');
    var incomeTypes = ['monthly_income', 'annual_income'];
    var housingStatuses = [
      'currently_renting',
      'homeless',
      'staying_with_friends_family',
      'owning_home',
      'other'
    ];
    var specialCircumstancesOptions = [
      {
        code: 'at_risk_of_eviction',
        label: 'At risk of eviction',
        description: 'You have received a notice or are behind on rent.'
      },
      {
        code: 'domestic_violence',
        label: 'Fleeing domestic violence',
        description: 'You need to move for safety reasons.'
      },
      {
        code: 'disability',
        label: 'Disability or health-related needs',
        description: 'You or a household member has a disability or serious health condition.'
      }
    ];
    return {
      cities: cities,
      incomeTypes: incomeTypes,
      housingStatuses: housingStatuses,
      specialCircumstancesOptions: specialCircumstancesOptions
    };
  }

  updateCurrentEligibilityScreenerResponses(responses) {
    var session = this._getCurrentEligibilityScreenerSession();
    var sessions = this._getFromStorage('eligibility_screener_sessions');

    if (responses) {
      if (typeof responses.householdSize === 'number') {
        session.householdSize = responses.householdSize;
      }
      if (responses.cityId) {
        session.cityId = responses.cityId;
      }
      if (responses.incomeType) {
        session.incomeType = responses.incomeType;
      }
      if (typeof responses.incomeAmount === 'number') {
        session.incomeAmount = responses.incomeAmount;
      }
      if (responses.housingStatus) {
        session.housingStatus = responses.housingStatus;
      }
      if (typeof responses.hasHousingVoucher === 'boolean') {
        session.hasHousingVoucher = responses.hasHousingVoucher;
      }
      if (responses.specialCircumstances && responses.specialCircumstances.length) {
        session.specialCircumstances = responses.specialCircumstances.slice();
      }
    }

    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === session.id) {
        sessions[i] = session;
        break;
      }
    }
    this._saveToStorage('eligibility_screener_sessions', sessions);

    return {
      success: true,
      updatedSession: session
    };
  }

  generateCurrentEligibilityResults() {
    var ctx = this._getOrCreateUserContext();
    if (!ctx.currentEligibilityScreenerSessionId) {
      // Ensure a session exists
      this._getCurrentEligibilityScreenerSession();
      ctx = this._getOrCreateUserContext();
    }
    var sessions = this._getFromStorage('eligibility_screener_sessions');
    var session = null;
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].id === ctx.currentEligibilityScreenerSessionId) {
        session = sessions[i];
        break;
      }
    }
    if (!session) {
      return {
        success: false,
        matchedPrograms: [],
        riskFlags: [],
        message: 'No active screener session.'
      };
    }

    var programs = this._getFromStorage('programs');
    var cities = this._getFromStorage('cities');
    var citiesById = {};
    for (var c = 0; c < cities.length; c++) {
      citiesById[cities[c].id] = cities[c];
    }

    var matched = [];
    for (var p = 0; p < programs.length; p++) {
      var prog = programs[p];
      if (!prog.isActive) continue;
      if (!this._isProgramEligibleForSession(prog, session)) continue;
      var city = citiesById[prog.cityId];
      matched.push({
        programId: prog.id,
        name: prog.name,
        programType: prog.programType,
        whoWeServe: prog.whoWeServe || [],
        averageWaitTimeMonths: typeof prog.averageWaitTimeMonths === 'number' ? prog.averageWaitTimeMonths : null,
        cityName: city ? city.name : null,
        shortDescription: this._generateShortDescription(prog.description),
        program: prog
      });
    }

    var riskFlags = [];
    if (session.specialCircumstances && session.specialCircumstances.indexOf('at_risk_of_eviction') !== -1) {
      riskFlags.push('high_eviction_risk');
    }

    session.completedAt = this._nowISOString();
    session.resultsGenerated = true;
    for (var si = 0; si < sessions.length; si++) {
      if (sessions[si].id === session.id) {
        sessions[si] = session;
        break;
      }
    }
    this._saveToStorage('eligibility_screener_sessions', sessions);

    return {
      success: true,
      matchedPrograms: matched,
      riskFlags: riskFlags,
      message: matched.length ? 'Matches found.' : 'No matching programs found.'
    };
  }

  saveCurrentScreenerResultSummary(firstName, deliveryMethod, email) {
    if (!deliveryMethod) {
      return {
        success: false,
        summary: null,
        message: 'deliveryMethod is required.'
      };
    }
    if (deliveryMethod === 'email_later' && !email) {
      return {
        success: false,
        summary: null,
        message: 'Email is required when deliveryMethod is email_later.'
      };
    }

    var ctx = this._getOrCreateUserContext();
    if (!ctx.currentEligibilityScreenerSessionId) {
      return {
        success: false,
        summary: null,
        message: 'No active screener session.'
      };
    }

    var results = this.generateCurrentEligibilityResults();
    var matchedProgramIds = [];
    if (results && results.matchedPrograms) {
      for (var i = 0; i < results.matchedPrograms.length; i++) {
        matchedProgramIds.push(results.matchedPrograms[i].programId);
      }
    }

    var summaries = this._getFromStorage('eligibility_screener_result_summaries');
    var summary = {
      id: this._generateId('scrsum'),
      screenerSessionId: ctx.currentEligibilityScreenerSessionId,
      firstName: firstName,
      deliveryMethod: deliveryMethod,
      email: deliveryMethod === 'email_later' ? email : null,
      matchedProgramIds: matchedProgramIds,
      createdAt: this._nowISOString()
    };
    summaries.push(summary);
    this._saveToStorage('eligibility_screener_result_summaries', summaries);

    return {
      success: true,
      summary: summary,
      message: 'Screener results summary saved.'
    };
  }

  // ----------------------
  // Housing programs & comparison
  // ----------------------
  getHousingProgramFilterOptions() {
    var programs = this._getFromStorage('programs');
    var cities = this._getFromStorage('cities');

    var programTypeSet = {};
    var whoSet = {};
    for (var i = 0; i < programs.length; i++) {
      var p = programs[i];
      if (!p.isActive) continue;
      if (p.programType) {
        programTypeSet[p.programType] = true;
      }
      if (p.whoWeServe && p.whoWeServe.length) {
        for (var j = 0; j < p.whoWeServe.length; j++) {
          whoSet[p.whoWeServe[j]] = true;
        }
      }
    }
    var programTypes = Object.keys(programTypeSet);
    var whoWeServeOptions = Object.keys(whoSet);

    return {
      programTypes: programTypes,
      whoWeServeOptions: whoWeServeOptions,
      cities: cities
    };
  }

  searchHousingPrograms(programType, whoWeServe, cityId, includeInactive) {
    var programs = this._getFromStorage('programs');
    var cities = this._getFromStorage('cities');
    var citiesById = {};
    for (var c = 0; c < cities.length; c++) {
      citiesById[cities[c].id] = cities[c];
    }

    var includeInact = !!includeInactive;
    var results = [];
    for (var i = 0; i < programs.length; i++) {
      var p = programs[i];
      if (!includeInact && !p.isActive) continue;
      if (programType && p.programType !== programType) continue;
      if (whoWeServe && (!p.whoWeServe || p.whoWeServe.indexOf(whoWeServe) === -1)) continue;
      if (cityId && p.cityId !== cityId) continue;
      var city = citiesById[p.cityId];
      results.push({
        programId: p.id,
        name: p.name,
        programType: p.programType,
        whoWeServe: p.whoWeServe || [],
        averageWaitTimeMonths: typeof p.averageWaitTimeMonths === 'number' ? p.averageWaitTimeMonths : null,
        cityName: city ? city.name : null,
        shortDescription: this._generateShortDescription(p.description),
        isActive: p.isActive,
        program: p
      });
    }

    return results;
  }

  getProgramDetail(programId) {
    var programs = this._getFromStorage('programs');
    var cities = this._getFromStorage('cities');

    var program = null;
    for (var i = 0; i < programs.length; i++) {
      if (programs[i].id === programId) {
        program = programs[i];
        break;
      }
    }
    if (!program) {
      return {
        program: null,
        isEligibleBasedOnCurrentScreener: false,
        eligibilitySummary: 'Program not found.'
      };
    }

    var cityName = null;
    for (var j = 0; j < cities.length; j++) {
      if (cities[j].id === program.cityId) {
        cityName = cities[j].name;
        break;
      }
    }

    var ctx = this._getOrCreateUserContext();
    var sessions = this._getFromStorage('eligibility_screener_sessions');
    var session = null;
    if (ctx.currentEligibilityScreenerSessionId) {
      for (var s = 0; s < sessions.length; s++) {
        if (sessions[s].id === ctx.currentEligibilityScreenerSessionId) {
          session = sessions[s];
          break;
        }
      }
    }

    var isEligible = false;
    var summaryText;
    if (session) {
      isEligible = this._isProgramEligibleForSession(program, session);
      summaryText = isEligible
        ? 'Based on your screener responses, you may be eligible for this program.'
        : 'Your screener responses suggest you may not be eligible for this program.';
    } else {
      summaryText = 'Complete the eligibility screener to see if this program may be a fit for you.';
    }

    var programOut = {
      id: program.id,
      name: program.name,
      programType: program.programType,
      description: program.description,
      whoWeServe: program.whoWeServe || [],
      averageWaitTimeMonths: typeof program.averageWaitTimeMonths === 'number' ? program.averageWaitTimeMonths : null,
      cityName: cityName,
      servicesOffered: program.servicesOffered,
      externalApplyUrl: program.externalApplyUrl,
      isActive: program.isActive
    };

    return {
      program: programOut,
      isEligibleBasedOnCurrentScreener: isEligible,
      eligibilitySummary: summaryText
    };
  }

  addProgramToComparison(programId) {
    var selection = this._getOrCreateProgramComparisonSelection();
    var programs = this._getFromStorage('programs');
    var exists = false;
    for (var i = 0; i < selection.selectedProgramIds.length; i++) {
      if (selection.selectedProgramIds[i] === programId) {
        exists = true;
        break;
      }
    }

    var limit = 4;
    var comparisonLimitReached = false;
    if (!exists) {
      if (selection.selectedProgramIds.length >= limit) {
        comparisonLimitReached = true;
      } else {
        selection.selectedProgramIds.push(programId);
      }
    }

    var selections = this._getFromStorage('program_comparison_selections');
    for (var s = 0; s < selections.length; s++) {
      if (selections[s].id === selection.id) {
        selections[s] = selection;
        break;
      }
    }
    this._saveToStorage('program_comparison_selections', selections);

    return {
      success: true,
      currentComparisonProgramIds: selection.selectedProgramIds.slice(),
      comparisonLimitReached: comparisonLimitReached,
      message: comparisonLimitReached ? 'Comparison limit reached.' : 'Program added to comparison.'
    };
  }

  getCurrentProgramComparison() {
    var selection = this._getOrCreateProgramComparisonSelection();
    var programs = this._getFromStorage('programs');
    var cities = this._getFromStorage('cities');
    var citiesById = {};
    for (var c = 0; c < cities.length; c++) {
      citiesById[cities[c].id] = cities[c];
    }

    var ctx = this._getOrCreateUserContext();
    var sessions = this._getFromStorage('eligibility_screener_sessions');
    var session = null;
    if (ctx.currentEligibilityScreenerSessionId) {
      for (var s = 0; s < sessions.length; s++) {
        if (sessions[s].id === ctx.currentEligibilityScreenerSessionId) {
          session = sessions[s];
          break;
        }
      }
    }

    var selectedPrograms = [];
    for (var i = 0; i < selection.selectedProgramIds.length; i++) {
      var pid = selection.selectedProgramIds[i];
      var prog = null;
      for (var p = 0; p < programs.length; p++) {
        if (programs[p].id === pid) {
          prog = programs[p];
          break;
        }
      }
      if (!prog) continue;
      var city = citiesById[prog.cityId];
      var eligibleFlag = session ? this._isProgramEligibleForSession(prog, session) : false;
      selectedPrograms.push({
        programId: prog.id,
        name: prog.name,
        programType: prog.programType,
        whoWeServe: prog.whoWeServe || [],
        averageWaitTimeMonths: typeof prog.averageWaitTimeMonths === 'number' ? prog.averageWaitTimeMonths : null,
        cityName: city ? city.name : null,
        isEligibleBasedOnCurrentScreener: eligibleFlag,
        program: prog
      });
    }

    return {
      selectedPrograms: selectedPrograms
    };
  }

  clearProgramComparison() {
    var selection = this._getOrCreateProgramComparisonSelection();
    selection.selectedProgramIds = [];
    var selections = this._getFromStorage('program_comparison_selections');
    for (var i = 0; i < selections.length; i++) {
      if (selections[i].id === selection.id) {
        selections[i] = selection;
        break;
      }
    }
    this._saveToStorage('program_comparison_selections', selections);
    return { success: true };
  }

  startProgramPreApplication(programId, firstName, lastName, householdType) {
    var preApps = this._getFromStorage('program_pre_applications');
    var preApp = {
      id: this._generateId('preapp'),
      programId: programId,
      firstName: firstName,
      lastName: lastName,
      householdType: householdType,
      status: 'started',
      createdAt: this._nowISOString()
    };
    preApps.push(preApp);
    this._saveToStorage('program_pre_applications', preApps);
    return { preApplication: preApp };
  }

  // ----------------------
  // Events & workshops
  // ----------------------
  getEventsFilterOptions() {
    var events = this._getFromStorage('events');

    var eventTypeSet = {};
    var topicSet = {};
    var formatSet = {};
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (e.eventType) eventTypeSet[e.eventType] = true;
      if (e.topic) topicSet[e.topic] = true;
      if (e.format) formatSet[e.format] = true;
    }

    var eventTypes = Object.keys(eventTypeSet);
    var topics = Object.keys(topicSet);
    var formats = Object.keys(formatSet);

    return {
      eventTypes: eventTypes,
      topics: topics,
      formats: formats
    };
  }

  searchEvents(eventType, topic, format, startDate, endDate, onlyPublished) {
    var events = this._getFromStorage('events');

    var onlyPub = typeof onlyPublished === 'boolean' ? onlyPublished : true;
    var startDateObj = startDate ? new Date(startDate + 'T00:00:00Z') : null;
    var endDateObj = endDate ? new Date(endDate + 'T23:59:59Z') : null;

    var filtered = [];
    for (var i = 0; i < events.length; i++) {
      var e = events[i];
      if (onlyPub && !e.isPublished) continue;
      if (eventType && e.eventType !== eventType) continue;
      if (topic && e.topic !== topic) continue;
      if (format && e.format !== format) continue;
      if (startDateObj || endDateObj) {
        var es = e.startDateTime ? new Date(e.startDateTime) : null;
        if (!es || isNaN(es.getTime())) continue;
        if (startDateObj && es < startDateObj) continue;
        if (endDateObj && es > endDateObj) continue;
      }
      filtered.push(e);
    }

    filtered.sort(function (a, b) {
      var at = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
      var bt = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
      return at - bt;
    });

    var out = [];
    for (var j = 0; j < filtered.length; j++) {
      var ev = filtered[j];
      var eventObj = {
        id: ev.id,
        title: ev.title,
        eventType: ev.eventType,
        topic: ev.topic,
        description: ev.description,
        startDateTime: ev.startDateTime,
        endDateTime: ev.endDateTime,
        weekdayName: this._getWeekdayName(ev.startDateTime),
        format: ev.format,
        locationName: ev.locationName,
        locationAddress: ev.locationAddress,
        registrationRequired: ev.registrationRequired
      };
      out.push({
        eventId: ev.id,
        title: ev.title,
        eventType: ev.eventType,
        topic: ev.topic,
        startDateTime: ev.startDateTime,
        endDateTime: ev.endDateTime,
        format: ev.format,
        locationName: ev.locationName,
        isPublished: ev.isPublished,
        event: eventObj
      });
    }

    return out;
  }

  getEventDetail(eventId) {
    var events = this._getFromStorage('events');
    var ev = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        ev = events[i];
        break;
      }
    }
    if (!ev) {
      return {
        event: null,
        accessDetails: ''
      };
    }

    var eventObj = {
      id: ev.id,
      title: ev.title,
      eventType: ev.eventType,
      topic: ev.topic,
      description: ev.description,
      startDateTime: ev.startDateTime,
      endDateTime: ev.endDateTime,
      weekdayName: this._getWeekdayName(ev.startDateTime),
      format: ev.format,
      locationName: ev.locationName,
      locationAddress: ev.locationAddress,
      registrationRequired: ev.registrationRequired
    };

    return {
      event: eventObj,
      accessDetails: ''
    };
  }

  registerForEvent(eventId, firstName, lastName, email, phone, numberOfAttendees, wantsReminders, reminderChannel) {
    var events = this._getFromStorage('events');
    var ev = null;
    for (var i = 0; i < events.length; i++) {
      if (events[i].id === eventId) {
        ev = events[i];
        break;
      }
    }
    if (!ev) {
      return {
        success: false,
        registration: null,
        message: 'Event not found.'
      };
    }

    var regs = this._getFromStorage('event_registrations');
    var reg = {
      id: this._generateId('eventreg'),
      eventId: eventId,
      firstName: firstName,
      lastName: lastName,
      email: email,
      phone: phone,
      numberOfAttendees: numberOfAttendees,
      wantsReminders: !!wantsReminders,
      reminderChannel: reminderChannel || 'none',
      createdAt: this._nowISOString()
    };
    regs.push(reg);
    this._saveToStorage('event_registrations', regs);

    var eventObj = {
      id: ev.id,
      title: ev.title,
      eventType: ev.eventType,
      topic: ev.topic,
      description: ev.description,
      startDateTime: ev.startDateTime,
      endDateTime: ev.endDateTime,
      weekdayName: this._getWeekdayName(ev.startDateTime),
      format: ev.format,
      locationName: ev.locationName,
      locationAddress: ev.locationAddress,
      registrationRequired: ev.registrationRequired
    };

    var regResolved = Object.assign({}, reg, { event: eventObj });

    return {
      success: true,
      registration: regResolved,
      message: 'Registration completed.'
    };
  }

  // ----------------------
  // Donations
  // ----------------------
  getDonationOptions() {
    var funds = this._getFromStorage('funds');

    var donationTypes = [
      { code: 'one_time', label: 'One-time' },
      { code: 'monthly', label: 'Monthly' },
      { code: 'annual', label: 'Annual' },
      { code: 'other_recurring', label: 'Other recurring' }
    ];

    var presetAmounts = [25, 40, 75, 100];

    var defaultDonationType = 'one_time';
    var defaultFundId = funds && funds.length ? funds[0].id : null;

    return {
      donationTypes: donationTypes,
      presetAmounts: presetAmounts,
      funds: funds,
      defaultDonationType: defaultDonationType,
      defaultFundId: defaultFundId
    };
  }

  submitDonation(donationType, amount, fundId, coverFees, paymentMethod, donorFirstName, donorLastName, donorEmail, donorPhone) {
    var funds = this._getFromStorage('funds');
    var fund = null;
    for (var i = 0; i < funds.length; i++) {
      if (funds[i].id === fundId) {
        fund = funds[i];
        break;
      }
    }
    if (!fund) {
      return {
        success: false,
        donation: null,
        message: 'Selected fund not found.'
      };
    }

    var amt = typeof amount === 'number' ? amount : 0;
    if (amt <= 0) {
      return {
        success: false,
        donation: null,
        message: 'Donation amount must be greater than zero.'
      };
    }

    var feeInfo = this._calculateDonationFees(amt, !!coverFees);
    var donations = this._getFromStorage('donations');

    var donation = {
      id: this._generateId('donation'),
      donationType: donationType,
      amount: amt,
      fundId: fundId,
      coverFees: !!coverFees,
      feeAmount: feeInfo.feeAmount,
      totalCharged: feeInfo.totalCharged,
      paymentMethod: paymentMethod,
      donorFirstName: donorFirstName,
      donorLastName: donorLastName,
      donorEmail: donorEmail,
      donorPhone: donorPhone || null,
      status: 'completed',
      createdAt: this._nowISOString()
    };
    donations.push(donation);
    this._saveToStorage('donations', donations);

    var donationResolved = Object.assign({}, donation, { fund: fund });

    return {
      success: true,
      donation: donationResolved,
      message: 'Donation submitted successfully.'
    };
  }

  // ----------------------
  // Newsletter
  // ----------------------
  getNewsletterOptions() {
    var topicOptions = [
      {
        code: 'affordable_housing_updates',
        label: 'Affordable Housing Updates',
        description: 'News about affordable housing openings, policy, and tools.'
      },
      {
        code: 'volunteer_opportunities',
        label: 'Volunteer Opportunities',
        description: 'Ways to support neighbors through volunteering.'
      },
      {
        code: 'organizational_news',
        label: 'Organizational News',
        description: 'Updates about our programs and impact.'
      }
    ];

    var frequencyOptions = [
      { code: 'daily', label: 'Daily' },
      { code: 'weekly', label: 'Weekly' },
      { code: 'monthly', label: 'Monthly' },
      { code: 'quarterly', label: 'Quarterly' }
    ];

    var defaultFrequency = 'monthly';

    return {
      topicOptions: topicOptions,
      frequencyOptions: frequencyOptions,
      defaultFrequency: defaultFrequency
    };
  }

  subscribeToNewsletter(email, firstName, lastName, topics, frequency, includeImpactStories, zipCode) {
    var subs = this._getFromStorage('newsletter_subscriptions');
    var sub = {
      id: this._generateId('nlsub'),
      email: email,
      firstName: firstName,
      lastName: lastName,
      topics: topics || [],
      frequency: frequency,
      includeImpactStories: !!includeImpactStories,
      zipCode: zipCode || null,
      status: 'active',
      createdAt: this._nowISOString()
    };
    subs.push(sub);
    this._saveToStorage('newsletter_subscriptions', subs);

    return {
      success: true,
      subscription: sub,
      message: 'Subscription saved.'
    };
  }

  // ----------------------
  // Housing counseling & appointments
  // ----------------------
  getHousingCounselingPageInfo() {
    var offices = this._getFromStorage('offices');
    var cities = this._getFromStorage('cities');
    var citiesById = {};
    for (var c = 0; c < cities.length; c++) {
      citiesById[cities[c].id] = cities[c];
    }

    var activeOffices = [];
    for (var i = 0; i < offices.length; i++) {
      var o = offices[i];
      if (!o.isActive) continue;
      var city = citiesById[o.cityId];
      var officeOut = city ? Object.assign({}, o, { city: city }) : o;
      activeOffices.push(officeOut);
    }

    var urgentContact = { phone: '', email: '' };
    if (activeOffices.length) {
      urgentContact.phone = activeOffices[0].phone || '';
      urgentContact.email = activeOffices[0].email || '';
    }

    var serviceDescriptions = [
      {
        appointmentType: 'housing_counseling',
        label: 'Housing Counseling',
        description: 'Get help understanding your housing options, rights, and next steps.'
      },
      {
        appointmentType: 'housing_application_help',
        label: 'Housing Application Help',
        description: 'Get support completing affordable housing and voucher applications.'
      },
      {
        appointmentType: 'eviction_prevention',
        label: 'Eviction Prevention',
        description: 'Talk to a counselor about notices, court dates, and staying housed.'
      }
    ];

    return {
      serviceDescriptions: serviceDescriptions,
      offices: activeOffices,
      urgentContact: urgentContact
    };
  }

  getAppointmentSchedulerOptions() {
    var offices = this._getFromStorage('offices');
    var cities = this._getFromStorage('cities');
    var citiesById = {};
    for (var c = 0; c < cities.length; c++) {
      citiesById[cities[c].id] = cities[c];
    }

    var activeOffices = [];
    for (var i = 0; i < offices.length; i++) {
      var o = offices[i];
      if (!o.isActive) continue;
      var city = citiesById[o.cityId];
      var officeOut = city ? Object.assign({}, o, { city: city }) : o;
      activeOffices.push(officeOut);
    }

    var appointmentTypes = [
      {
        code: 'housing_counseling',
        label: 'Housing Counseling',
        description: 'General questions about housing search, stability, or renters rights.'
      },
      {
        code: 'housing_application_help',
        label: 'Application Help',
        description: 'One-on-one help filling out housing applications.'
      },
      {
        code: 'eviction_prevention',
        label: 'Eviction Prevention',
        description: 'Support if you received a notice or court papers.'
      }
    ];

    return {
      offices: activeOffices,
      appointmentTypes: appointmentTypes
    };
  }

  getAvailableAppointmentSlots(officeId, appointmentType, weekStartDate, durationMinutes) {
    var slots = this._getFromStorage('appointment_slots');
    var offices = this._getFromStorage('offices');

    var weekStart = new Date(weekStartDate + 'T00:00:00Z');
    var weekEnd = this._addDays(weekStart, 6);

    var officeById = {};
    for (var o = 0; o < offices.length; o++) {
      officeById[offices[o].id] = offices[o];
    }

    var results = [];
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      if (s.officeId !== officeId) continue;
      if (s.appointmentType !== appointmentType) continue;
      if (s.isBooked) continue;
      if (typeof durationMinutes === 'number' && s.durationMinutes !== durationMinutes) continue;
      var start = s.startDateTime ? new Date(s.startDateTime) : null;
      if (!start || isNaN(start.getTime())) continue;
      if (start < weekStart || start > weekEnd) continue;

      var office = officeById[s.officeId] || null;
      results.push({
        slotId: s.id,
        officeId: s.officeId,
        appointmentType: s.appointmentType,
        startDateTime: s.startDateTime,
        endDateTime: s.endDateTime,
        durationMinutes: s.durationMinutes,
        isBooked: s.isBooked,
        office: office
      });
    }

    // Sort by start time
    results.sort(function (a, b) {
      var at = a.startDateTime ? new Date(a.startDateTime).getTime() : 0;
      var bt = b.startDateTime ? new Date(b.startDateTime).getTime() : 0;
      return at - bt;
    });

    return results;
  }

  bookAppointment(slotId, name, email, phone, notes) {
    var slots = this._getFromStorage('appointment_slots');
    var offices = this._getFromStorage('offices');
    var appointments = this._getFromStorage('appointments');

    var slot = null;
    var slotIndex = -1;
    for (var i = 0; i < slots.length; i++) {
      if (slots[i].id === slotId) {
        slot = slots[i];
        slotIndex = i;
        break;
      }
    }
    if (!slot || slot.isBooked) {
      return {
        success: false,
        appointment: null,
        message: 'Appointment slot is not available.'
      };
    }

    var appointment = {
      id: this._generateId('appt'),
      slotId: slot.id,
      officeId: slot.officeId,
      appointmentType: slot.appointmentType,
      name: name,
      email: email,
      phone: phone,
      notes: notes || null,
      createdAt: this._nowISOString()
    };
    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    // Mark slot as booked
    slot.isBooked = true;
    if (slotIndex >= 0) {
      slots[slotIndex] = slot;
      this._saveToStorage('appointment_slots', slots);
    }

    var office = null;
    for (var j = 0; j < offices.length; j++) {
      if (offices[j].id === slot.officeId) {
        office = offices[j];
        break;
      }
    }

    var appointmentResolved = Object.assign({}, appointment, {
      slot: slot,
      office: office
    });

    return {
      success: true,
      appointment: appointmentResolved,
      message: 'Appointment booked.'
    };
  }

  // ----------------------
  // Volunteer roles
  // ----------------------
  getVolunteerFilterOptions() {
    var availabilityOptions = [
      { code: 'weekday_days', label: 'Weekday days' },
      { code: 'weekday_evenings', label: 'Weekday evenings' },
      { code: 'weekends', label: 'Weekends' },
      { code: 'flexible', label: 'Flexible' }
    ];

    var minHoursPerWeekOptions = [
      { value: 1, label: '1+ hours per week' },
      { value: 3, label: '3+ hours per week' },
      { value: 5, label: '5+ hours per week' }
    ];

    var formats = [
      { code: 'on_site', label: 'On-site / In-person' },
      { code: 'virtual', label: 'Virtual' },
      { code: 'hybrid', label: 'Hybrid' }
    ];

    return {
      availabilityOptions: availabilityOptions,
      minHoursPerWeekOptions: minHoursPerWeekOptions,
      formats: formats
    };
  }

  searchVolunteerRoles(availability, minHoursPerWeekMin, format, onlyActive) {
    var roles = this._getFromStorage('volunteer_roles');
    var onlyAct = typeof onlyActive === 'boolean' ? onlyActive : true;

    var results = [];
    for (var i = 0; i < roles.length; i++) {
      var r = roles[i];
      if (onlyAct && !r.isActive) continue;
      if (availability && (!r.availabilityOptions || r.availabilityOptions.indexOf(availability) === -1)) continue;
      if (typeof minHoursPerWeekMin === 'number' && r.minHoursPerWeek < minHoursPerWeekMin) continue;
      if (format && r.format !== format) continue;
      results.push({
        roleId: r.id,
        title: r.title,
        minHoursPerWeek: r.minHoursPerWeek,
        availabilityOptions: r.availabilityOptions || [],
        format: r.format,
        locationName: r.locationName,
        isActive: r.isActive,
        role: r
      });
    }

    return results;
  }

  getVolunteerRoleDetail(roleId) {
    var roles = this._getFromStorage('volunteer_roles');
    var role = null;
    for (var i = 0; i < roles.length; i++) {
      if (roles[i].id === roleId) {
        role = roles[i];
        break;
      }
    }
    return {
      role: role
    };
  }

  submitVolunteerSignup(roleId, name, email, selectedAvailability) {
    var roles = this._getFromStorage('volunteer_roles');
    var role = null;
    for (var i = 0; i < roles.length; i++) {
      if (roles[i].id === roleId) {
        role = roles[i];
        break;
      }
    }
    if (!role) {
      return {
        success: false,
        signup: null,
        message: 'Volunteer role not found.'
      };
    }

    var signups = this._getFromStorage('volunteer_signups');
    var signup = {
      id: this._generateId('volsignup'),
      roleId: roleId,
      name: name,
      email: email,
      selectedAvailability: selectedAvailability,
      status: 'new',
      createdAt: this._nowISOString()
    };
    signups.push(signup);
    this._saveToStorage('volunteer_signups', signups);

    var signupResolved = Object.assign({}, signup, { role: role });

    return {
      success: true,
      signup: signupResolved,
      message: 'Volunteer signup submitted.'
    };
  }

  // ----------------------
  // Resource library & reading lists
  // ----------------------
  getResourceFilterOptions() {
    var languages = [
      { code: 'english', label: 'English' },
      { code: 'spanish', label: 'Spanish' },
      { code: 'chinese', label: 'Chinese' },
      { code: 'vietnamese', label: 'Vietnamese' },
      { code: 'tagalog', label: 'Tagalog' },
      { code: 'other', label: 'Other' }
    ];

    var contentTypes = [
      { code: 'guide', label: 'Guide' },
      { code: 'fact_sheet', label: 'Fact sheet' },
      { code: 'toolkit', label: 'Toolkit' },
      { code: 'video', label: 'Video' },
      { code: 'article', label: 'Article' },
      { code: 'faq', label: 'FAQ' },
      { code: 'checklist', label: 'Checklist' },
      { code: 'template', label: 'Template' },
      { code: 'other', label: 'Other' }
    ];

    var ratingThresholds = [
      { value: 0, label: 'All ratings' },
      { value: 3, label: '3.0 stars and up' },
      { value: 4, label: '4.0 stars and up' }
    ];

    return {
      languages: languages,
      contentTypes: contentTypes,
      ratingThresholds: ratingThresholds
    };
  }

  searchResources(query, language, contentType, minRating, onlyPublished) {
    var resources = this._getFromStorage('resources');
    var onlyPub = typeof onlyPublished === 'boolean' ? onlyPublished : true;

    var q = query && typeof query === 'string' ? query.toLowerCase() : null;
    var minR = typeof minRating === 'number' ? minRating : null;

    var results = [];
    for (var i = 0; i < resources.length; i++) {
      var r = resources[i];
      if (onlyPub && !r.isPublished) continue;
      if (language && r.language !== language) continue;
      if (contentType && r.contentType !== contentType) continue;
      if (q) {
        var text = (r.title || '') + ' ' + (r.description || '');
        if (text.toLowerCase().indexOf(q) === -1) continue;
      }
      var ratingVal = typeof r.rating === 'number' ? r.rating : 0;
      if (minR !== null && ratingVal < minR) continue;

      results.push({
        resourceId: r.id,
        title: r.title,
        descriptionSnippet: this._generateShortDescription(r.description),
        contentType: r.contentType,
        language: r.language,
        rating: r.rating,
        ratingCount: r.ratingCount,
        lastUpdatedAt: r.lastUpdatedAt,
        resource: r
      });
    }

    return results;
  }

  getResourceDetail(resourceId) {
    var resources = this._getFromStorage('resources');
    var res = null;
    for (var i = 0; i < resources.length; i++) {
      if (resources[i].id === resourceId) {
        res = resources[i];
        break;
      }
    }
    return { resource: res };
  }

  getReadingLists() {
    var lists = this._getFromStorage('reading_lists');
    var items = this._getFromStorage('reading_list_items');

    var out = [];
    for (var i = 0; i < lists.length; i++) {
      var list = lists[i];
      var count = 0;
      for (var j = 0; j < items.length; j++) {
        if (items[j].readingListId === list.id) count++;
      }
      out.push({
        id: list.id,
        name: list.name,
        createdAt: list.createdAt,
        itemCount: count
      });
    }
    return out;
  }

  createReadingList(name) {
    var lists = this._getFromStorage('reading_lists');
    var list = {
      id: this._generateId('readlist'),
      name: name,
      createdAt: this._nowISOString()
    };
    lists.push(list);
    this._saveToStorage('reading_lists', lists);
    return { readingList: list };
  }

  addResourceToReadingList(resourceId, readingListId) {
    var lists = this._getFromStorage('reading_lists');
    var resources = this._getFromStorage('resources');
    var items = this._getFromStorage('reading_list_items');

    var list = null;
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].id === readingListId) {
        list = lists[i];
        break;
      }
    }
    if (!list) {
      return {
        success: false,
        readingListItem: null,
        message: 'Reading list not found.'
      };
    }

    var res = null;
    for (var j = 0; j < resources.length; j++) {
      if (resources[j].id === resourceId) {
        res = resources[j];
        break;
      }
    }
    if (!res) {
      return {
        success: false,
        readingListItem: null,
        message: 'Resource not found.'
      };
    }

    for (var k = 0; k < items.length; k++) {
      if (items[k].readingListId === readingListId && items[k].resourceId === resourceId) {
        var existing = items[k];
        var resolvedExisting = Object.assign({}, existing, {
          readingList: list,
          resource: res
        });
        return {
          success: true,
          readingListItem: resolvedExisting,
          message: 'Resource already in reading list.'
        };
      }
    }

    var item = {
      id: this._generateId('readitem'),
      readingListId: readingListId,
      resourceId: resourceId,
      addedAt: this._nowISOString()
    };
    items.push(item);
    this._saveToStorage('reading_list_items', items);

    var resolved = Object.assign({}, item, { readingList: list, resource: res });

    return {
      success: true,
      readingListItem: resolved,
      message: 'Resource added to reading list.'
    };
  }

  // ----------------------
  // About, contact, privacy
  // ----------------------
  getAboutUsContent() {
    var mission = 'We are a nonprofit community housing organization working to keep neighbors safely housed.';
    var vision = 'A community where everyone has a safe, stable, and affordable home.';
    var values = [
      'Dignity and respect for all residents',
      'Housing as a human right',
      'Equity and inclusion',
      'Accountability to our community'
    ];
    var historySummary = 'For years, we have partnered with tenants, landlords, and community groups to prevent homelessness and expand access to affordable housing.';
    var impactHighlights = [
      {
        title: 'Households served',
        description: 'Each year, we support hundreds of households with counseling, rental assistance, and advocacy.'
      },
      {
        title: 'Preventing evictions',
        description: 'Our eviction-prevention services help keep families in their homes and out of shelter.'
      }
    ];
    var leadership = [
      { name: 'Executive Director', role: 'Executive Director' },
      { name: 'Program Director', role: 'Director of Housing Programs' }
    ];

    return {
      mission: mission,
      vision: vision,
      values: values,
      historySummary: historySummary,
      impactHighlights: impactHighlights,
      leadership: leadership
    };
  }

  getContactInfo() {
    var offices = this._getFromStorage('offices');
    var cities = this._getFromStorage('cities');
    var citiesById = {};
    for (var c = 0; c < cities.length; c++) {
      citiesById[cities[c].id] = cities[c];
    }

    var officeInfos = [];
    for (var i = 0; i < offices.length; i++) {
      var o = offices[i];
      var city = citiesById[o.cityId];
      officeInfos.push({
        office: o.name,
        address: o.address || '',
        cityName: city ? city.name : '',
        phone: o.phone || '',
        email: o.email || '',
        hours: '',
        transitOptions: ''
      });
    }

    var mainPhone = officeInfos.length ? officeInfos[0].phone : '';
    var mainEmail = officeInfos.length ? officeInfos[0].email : '';

    var urgentHelpInstructions = 'If you are facing an immediate housing crisis or eviction, contact us by phone as soon as possible.';

    return {
      mainPhone: mainPhone,
      mainEmail: mainEmail,
      offices: officeInfos,
      urgentHelpInstructions: urgentHelpInstructions
    };
  }

  submitContactForm(name, email, topic, message) {
    var msgs = this._getFromStorage('contact_messages');
    var ticketId = this._generateId('contact');
    var record = {
      id: ticketId,
      name: name || null,
      email: email,
      topic: topic || null,
      message: message,
      createdAt: this._nowISOString()
    };
    msgs.push(record);
    this._saveToStorage('contact_messages', msgs);

    return {
      success: true,
      ticketId: ticketId,
      message: 'Your message has been received.'
    };
  }

  getPrivacyAndTermsContent() {
    var privacyPolicyText = 'We collect only the information needed to provide housing services and supports. We do not sell your personal information.';
    var termsOfUseText = 'By using this website, you agree to use the information and tools provided for lawful purposes and to not misuse the site.';
    var accessibilityStatementText = 'We are committed to making our website and services accessible to all community members. Contact us if you encounter any accessibility barriers.';
    var nondiscriminationPolicyText = 'We do not discriminate based on race, color, religion, sex, gender identity, sexual orientation, national origin, age, disability, or any other protected status.';
    var lastUpdatedAt = this._nowISOString();

    return {
      privacyPolicyText: privacyPolicyText,
      termsOfUseText: termsOfUseText,
      accessibilityStatementText: accessibilityStatementText,
      nondiscriminationPolicyText: nondiscriminationPolicyText,
      lastUpdatedAt: lastUpdatedAt
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