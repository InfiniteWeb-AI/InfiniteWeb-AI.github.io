// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  // ----------------------
  // Storage helpers
  // ----------------------

  _initStorage() {
    const keys = [
      'airports',
      'weather_reports',
      'briefings',
      'briefing_settings',
      'briefing_items',
      'route_lists',
      'routes',
      'courses',
      'training_plans',
      'training_plan_items',
      'events',
      'registrations',
      'articles',
      'reading_lists',
      'reading_list_items',
      'flight_schools',
      'aircraft',
      'preferred_trainers',
      'medical_examiners',
      'contact_groups',
      'contacts',
      'forum_categories',
      'forum_tags',
      'forum_threads',
      'thread_tags',
      'thread_notification_settings',
      'directory_searches',
      // additional internal tables
      'contact_form_submissions',
      'aircraft_comparison_set',
      'legal_documents',
      'about_page_content',
      'contact_page_info',
      'help_and_faq_content'
    ];

    keys.forEach((key) => {
      if (localStorage.getItem(key) === null) {
        // Objects vs arrays: some are objects; handle explicitly
        if (key === 'about_page_content' || key === 'contact_page_info' || key === 'legal_documents' || key === 'help_and_faq_content') {
          localStorage.setItem(key, JSON.stringify({}));
        } else if (key === 'aircraft_comparison_set') {
          localStorage.setItem(key, JSON.stringify([]));
        } else {
          localStorage.setItem(key, JSON.stringify([]));
        }
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key) {
    const data = localStorage.getItem(key);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  _getObjectFromStorage(key, defaultValue = null) {
    const data = localStorage.getItem(key);
    if (!data) return defaultValue;
    try {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      return defaultValue;
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

  _nowISOString() {
    return new Date().toISOString();
  }

  _parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _findById(collection, id) {
    return collection.find((item) => item.id === id) || null;
  }

  _getItemTypeLabel(itemType) {
    switch (itemType) {
      case 'weather_report':
        return 'Weather';
      case 'route':
        return 'Route';
      case 'article':
        return 'Article';
      case 'event':
        return 'Event';
      case 'note':
        return 'Note';
      default:
        return 'Item';
    }
  }

  // ----------------------
  // Private helpers (per spec)
  // ----------------------

  _getOrCreateTodayBriefing() {
    let briefings = this._getFromStorage('briefings');
    let briefing = briefings.find((b) => b.title === "Today's Briefing");

    if (!briefing) {
      briefing = {
        id: this._generateId('briefing'),
        title: "Today's Briefing",
        date: this._nowISOString(),
        createdAt: this._nowISOString(),
        updatedAt: this._nowISOString()
      };
      briefings.push(briefing);
      this._saveToStorage('briefings', briefings);
    }

    const settings = this._getOrCreateBriefingSettings(briefing.id);
    return { briefing, settings };
  }

  _getOrCreateBriefingSettings(briefingId) {
    let settingsList = this._getFromStorage('briefing_settings');
    let settings = settingsList.find((s) => s.briefingId === briefingId);

    if (!settings) {
      settings = {
        id: this._generateId('briefing_settings'),
        briefingId,
        unitsPreset: 'knots_statute_miles',
        showRawWeather: true,
        showDecodedWeather: true,
        lastUpdatedAt: this._nowISOString()
      };
      settingsList.push(settings);
      this._saveToStorage('briefing_settings', settingsList);
    }

    return settings;
  }

  _getOrCreateRouteListByName(name) {
    let routeLists = this._getFromStorage('route_lists');
    let list = routeLists.find((l) => l.name === name);
    if (!list) {
      list = {
        id: this._generateId('route_list'),
        name,
        description: null,
        createdAt: this._nowISOString()
      };
      routeLists.push(list);
      this._saveToStorage('route_lists', routeLists);
    }
    return list;
  }

  _getOrCreateReadingListByName(name) {
    let lists = this._getFromStorage('reading_lists');
    let list = lists.find((l) => l.name === name);
    if (!list) {
      list = {
        id: this._generateId('reading_list'),
        name,
        description: null,
        createdAt: this._nowISOString()
      };
      lists.push(list);
      this._saveToStorage('reading_lists', lists);
    }
    return list;
  }

  _getOrCreateContactGroupByName(name) {
    let groups = this._getFromStorage('contact_groups');
    let group = groups.find((g) => g.name === name);
    if (!group) {
      group = {
        id: this._generateId('contact_group'),
        name,
        description: null,
        createdAt: this._nowISOString()
      };
      groups.push(group);
      this._saveToStorage('contact_groups', groups);
    }
    return group;
  }

  _getOrCreateTrainingPlanByName(name) {
    let plans = this._getFromStorage('training_plans');
    let plan = plans.find((p) => p.name === name);
    if (!plan) {
      plan = {
        id: this._generateId('training_plan'),
        name,
        createdAt: this._nowISOString()
      };
      plans.push(plan);
      this._saveToStorage('training_plans', plans);
    }
    return plan;
  }

  _updateAircraftComparisonSet(aircraftId, action = 'add') {
    let set = this._getFromStorage('aircraft_comparison_set');
    if (!Array.isArray(set)) set = [];

    if (action === 'add') {
      if (!set.includes(aircraftId)) {
        set.push(aircraftId);
      }
    } else if (action === 'remove') {
      set = set.filter((id) => id !== aircraftId);
    } else if (action === 'clear') {
      set = [];
    }

    this._saveToStorage('aircraft_comparison_set', set);
    return set;
  }

  _recordDirectorySearch(directoryType, searchQuery, radiusMiles, minRating) {
    const allowedTypes = ['flight_schools', 'medical_examiners'];
    if (!allowedTypes.includes(directoryType)) return;

    let searches = this._getFromStorage('directory_searches');
    const entry = {
      id: this._generateId('directory_search'),
      directoryType,
      searchQuery: searchQuery || null,
      radiusMiles: typeof radiusMiles === 'number' ? radiusMiles : null,
      minRating: typeof minRating === 'number' ? minRating : null,
      createdAt: this._nowISOString()
    };
    searches.push(entry);
    this._saveToStorage('directory_searches', searches);
  }

  _haversineNm(lat1, lon1, lat2, lon2) {
    if (
      typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number'
    ) {
      return null;
    }
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R_nm = 3440.065; // Earth radius in nautical miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R_nm * c;
  }

  // ----------------------
  // Interface implementations
  // ----------------------

  // getHomeOverview()
  getHomeOverview() {
    const airports = this._getFromStorage('airports');
    const weatherReports = this._getFromStorage('weather_reports');
    const routes = this._getFromStorage('routes');
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('events');
    const courses = this._getFromStorage('courses');
    const briefings = this._getFromStorage('briefings');
    const briefingSettings = this._getFromStorage('briefing_settings');
    const briefingItems = this._getFromStorage('briefing_items');

    let briefing = briefings.find((b) => b.title === "Today's Briefing") || null;
    let settings = null;
    let items = [];

    if (briefing) {
      settings = briefingSettings.find((s) => s.briefingId === briefing.id) || null;
      const itemsRaw = briefingItems
        .filter((i) => i.briefingId === briefing.id)
        .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

      items = itemsRaw.map((bi) => {
        let weatherReport = null;
        let routeObj = null;
        let articleObj = null;
        let eventObj = null;

        if (bi.itemType === 'weather_report' && bi.weatherReportId) {
          const wr = weatherReports.find((w) => w.id === bi.weatherReportId) || null;
          if (wr) {
            const airport = airports.find((a) => a.id === wr.airportId) || null;
            weatherReport = { ...wr, airport };
          }
        }
        if (bi.itemType === 'route' && bi.routeId) {
          const r = routes.find((r) => r.id === bi.routeId) || null;
          if (r) {
            const dep = airports.find((a) => a.id === r.departureAirportId) || null;
            const dest = airports.find((a) => a.id === r.destinationAirportId) || null;
            routeObj = { ...r, departureAirport: dep, destinationAirport: dest };
          }
        }
        if (bi.itemType === 'article' && bi.articleId) {
          articleObj = articles.find((a) => a.id === bi.articleId) || null;
        }
        if (bi.itemType === 'event' && bi.eventId) {
          eventObj = events.find((e) => e.id === bi.eventId) || null;
        }

        return {
          briefingItem: bi,
          itemTypeLabel: this._getItemTypeLabel(bi.itemType),
          weatherReport,
          route: routeObj,
          article: articleObj,
          event: eventObj
        };
      });
    }

    // recommendedCourses: sort by rating desc, then ratingCount desc
    const recommendedCourses = [...courses]
      .sort((a, b) => {
        const ra = typeof a.rating === 'number' ? a.rating : 0;
        const rb = typeof b.rating === 'number' ? b.rating : 0;
        if (rb !== ra) return rb - ra;
        const rca = typeof a.ratingCount === 'number' ? a.ratingCount : 0;
        const rcb = typeof b.ratingCount === 'number' ? b.ratingCount : 0;
        return rcb - rca;
      })
      .slice(0, 5);

    // recentArticles: publishedAt desc
    const recentArticles = [...articles]
      .sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return db - da;
      })
      .slice(0, 5);

    // upcomingEvents: startDateTime >= now, sort asc
    const now = new Date();
    const upcomingEvents = events
      .filter((e) => {
        const d = this._parseDate(e.startDateTime);
        return d && d >= now;
      })
      .sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return da - db;
      })
      .slice(0, 5);

    return {
      briefingSummary: {
        hasBriefing: !!briefing,
        briefing: briefing || null,
        settings: settings || null,
        items
      },
      recommendedCourses,
      recentArticles,
      upcomingEvents
    };
  }

  // searchAirports(query, limit)
  searchAirports(query, limit = 10) {
    const airports = this._getFromStorage('airports');
    const q = (query || '').trim().toLowerCase();
    if (!q) return airports.slice(0, limit);

    const matches = airports.filter((a) => {
      const icao = (a.icaoCode || '').toLowerCase();
      const iata = (a.iataCode || '').toLowerCase();
      const faa = (a.faaCode || '').toLowerCase();
      const name = (a.name || '').toLowerCase();
      return (
        icao.includes(q) ||
        iata.includes(q) ||
        faa.includes(q) ||
        name.includes(q)
      );
    });

    return matches.slice(0, limit);
  }

  // getAirportWeather(airportQuery)
  getAirportWeather(airportQuery) {
    const airports = this._getFromStorage('airports');
    const weatherReports = this._getFromStorage('weather_reports');

    const [airport] = this.searchAirports(airportQuery, 1);
    if (!airport) {
      const { settings } = this._getOrCreateTodayBriefing();
      return {
        airport: null,
        metarReport: null,
        tafReport: null,
        unitsPreset: settings.unitsPreset,
        showRawWeather: settings.showRawWeather,
        showDecodedWeather: settings.showDecodedWeather
      };
    }

    const reportsForAirport = weatherReports.filter((w) => w.airportId === airport.id);

    const metars = reportsForAirport.filter((w) => w.reportType === 'metar');
    const tafs = reportsForAirport.filter((w) => w.reportType === 'taf');

    const sortMetar = (a, b) => {
      const da = this._parseDate(a.observationTime) || this._parseDate(a.createdAt) || new Date(0);
      const db = this._parseDate(b.observationTime) || this._parseDate(b.createdAt) || new Date(0);
      return db - da;
    };
    const sortTaf = (a, b) => {
      const da = this._parseDate(a.validFrom) || this._parseDate(a.createdAt) || new Date(0);
      const db = this._parseDate(b.validFrom) || this._parseDate(b.createdAt) || new Date(0);
      return db - da;
    };

    const metarRaw = metars.sort(sortMetar)[0] || null;
    const tafRaw = tafs.sort(sortTaf)[0] || null;

    const metarReport = metarRaw ? { ...metarRaw, airport } : null;
    const tafReport = tafRaw ? { ...tafRaw, airport } : null;

    const { settings } = this._getOrCreateTodayBriefing();

    return {
      airport,
      metarReport,
      tafReport,
      unitsPreset: settings.unitsPreset,
      showRawWeather: settings.showRawWeather,
      showDecodedWeather: settings.showDecodedWeather
    };
  }

  // addWeatherReportToTodayBriefing(weatherReportId)
  addWeatherReportToTodayBriefing(weatherReportId) {
    const weatherReports = this._getFromStorage('weather_reports');
    const airports = this._getFromStorage('airports');
    let briefingItems = this._getFromStorage('briefing_items');
    let briefings = this._getFromStorage('briefings');

    const weatherReport = weatherReports.find((w) => w.id === weatherReportId);
    if (!weatherReport) {
      return { success: false, briefingItem: null, message: 'Weather report not found.' };
    }

    const { briefing } = this._getOrCreateTodayBriefing();
    briefings = this._getFromStorage('briefings');

    // prevent duplicates for same weatherReportId in same briefing
    const existing = briefingItems.find(
      (bi) => bi.briefingId === briefing.id && bi.weatherReportId === weatherReportId
    );
    if (existing) {
      return { success: true, briefingItem: existing, message: 'Weather report already in briefing.' };
    }

    const itemsForBriefing = briefingItems.filter((bi) => bi.briefingId === briefing.id);
    const maxOrder = itemsForBriefing.reduce((max, bi) => (bi.orderIndex > max ? bi.orderIndex : max), 0);

    const airport = airports.find((a) => a.id === weatherReport.airportId) || null;
    const code = airport ? airport.icaoCode || airport.iataCode || airport.faaCode || '' : '';
    const titlePrefix = weatherReport.reportType === 'taf' ? 'TAF' : 'METAR';
    const title = code ? `${titlePrefix} ${code}` : titlePrefix;

    const newItem = {
      id: this._generateId('briefing_item'),
      briefingId: briefing.id,
      itemType: 'weather_report',
      weatherReportId: weatherReport.id,
      routeId: null,
      articleId: null,
      eventId: null,
      title,
      orderIndex: maxOrder + 1,
      isReviewed: false,
      createdAt: this._nowISOString()
    };

    briefingItems.push(newItem);
    this._saveToStorage('briefing_items', briefingItems);

    // update briefing.updatedAt
    briefings = briefings.map((b) =>
      b.id === briefing.id ? { ...b, updatedAt: this._nowISOString() } : b
    );
    this._saveToStorage('briefings', briefings);

    return { success: true, briefingItem: newItem, message: 'Weather report added to Today\'s Briefing.' };
  }

  // getTodayBriefingDashboard()
  getTodayBriefingDashboard() {
    const airports = this._getFromStorage('airports');
    const weatherReports = this._getFromStorage('weather_reports');
    const routes = this._getFromStorage('routes');
    const articles = this._getFromStorage('articles');
    const events = this._getFromStorage('events');
    const briefings = this._getFromStorage('briefings');
    const briefingSettings = this._getFromStorage('briefing_settings');
    const briefingItems = this._getFromStorage('briefing_items');

    const briefing = briefings.find((b) => b.title === "Today's Briefing") || null;
    if (!briefing) {
      return { briefing: null, settings: null, items: [] };
    }

    const settings =
      briefingSettings.find((s) => s.briefingId === briefing.id) ||
      this._getOrCreateBriefingSettings(briefing.id);

    const itemsRaw = briefingItems
      .filter((i) => i.briefingId === briefing.id)
      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));

    const items = itemsRaw.map((bi) => {
      let weatherReport = null;
      let routeObj = null;
      let articleObj = null;
      let eventObj = null;

      if (bi.itemType === 'weather_report' && bi.weatherReportId) {
        const wr = weatherReports.find((w) => w.id === bi.weatherReportId) || null;
        if (wr) {
          const airport = airports.find((a) => a.id === wr.airportId) || null;
          weatherReport = { ...wr, airport };
        }
      }
      if (bi.itemType === 'route' && bi.routeId) {
        const r = routes.find((r) => r.id === bi.routeId) || null;
        if (r) {
          const dep = airports.find((a) => a.id === r.departureAirportId) || null;
          const dest = airports.find((a) => a.id === r.destinationAirportId) || null;
          routeObj = { ...r, departureAirport: dep, destinationAirport: dest };
        }
      }
      if (bi.itemType === 'article' && bi.articleId) {
        articleObj = articles.find((a) => a.id === bi.articleId) || null;
      }
      if (bi.itemType === 'event' && bi.eventId) {
        eventObj = events.find((e) => e.id === bi.eventId) || null;
      }

      return {
        briefingItem: bi,
        itemTypeLabel: this._getItemTypeLabel(bi.itemType),
        weatherReport,
        route: routeObj,
        article: articleObj,
        event: eventObj
      };
    });

    return { briefing, settings, items };
  }

  // reorderBriefingItems(itemsOrder)
  reorderBriefingItems(itemsOrder) {
    let briefingItems = this._getFromStorage('briefing_items');
    const orderMap = {};
    (itemsOrder || []).forEach((io) => {
      if (io && io.briefingItemId != null && typeof io.orderIndex === 'number') {
        orderMap[io.briefingItemId] = io.orderIndex;
      }
    });

    briefingItems = briefingItems.map((bi) => {
      if (orderMap.hasOwnProperty(bi.id)) {
        return { ...bi, orderIndex: orderMap[bi.id] };
      }
      return bi;
    });

    this._saveToStorage('briefing_items', briefingItems);
    const updatedItems = briefingItems.filter((bi) => orderMap.hasOwnProperty(bi.id));

    return { success: true, updatedItems };
  }

  // updateTodayBriefingSettings(unitsPreset, showRawWeather, showDecodedWeather)
  updateTodayBriefingSettings(unitsPreset, showRawWeather, showDecodedWeather) {
    const allowedUnits = ['knots_statute_miles', 'knots_kilometers', 'meters_kilometers'];
    if (!allowedUnits.includes(unitsPreset)) {
      return { success: false, settings: null };
    }

    const { briefing } = this._getOrCreateTodayBriefing();
    let settingsList = this._getFromStorage('briefing_settings');
    let settings = settingsList.find((s) => s.briefingId === briefing.id);

    if (!settings) {
      settings = this._getOrCreateBriefingSettings(briefing.id);
      settingsList = this._getFromStorage('briefing_settings');
    }

    settings = {
      ...settings,
      unitsPreset,
      showRawWeather: typeof showRawWeather === 'boolean' ? showRawWeather : settings.showRawWeather,
      showDecodedWeather:
        typeof showDecodedWeather === 'boolean' ? showDecodedWeather : settings.showDecodedWeather,
      lastUpdatedAt: this._nowISOString()
    };

    settingsList = settingsList.map((s) => (s.id === settings.id ? settings : s));
    this._saveToStorage('briefing_settings', settingsList);

    return { success: true, settings };
  }

  // removeBriefingItem(briefingItemId)
  removeBriefingItem(briefingItemId) {
    const briefingItems = this._getFromStorage('briefing_items');
    const newItems = briefingItems.filter((bi) => bi.id !== briefingItemId);
    const success = newItems.length !== briefingItems.length;
    if (success) {
      this._saveToStorage('briefing_items', newItems);
    }
    return { success };
  }

  // markBriefingItemReviewed(briefingItemId, isReviewed)
  markBriefingItemReviewed(briefingItemId, isReviewed) {
    let briefingItems = this._getFromStorage('briefing_items');
    let updated = null;

    briefingItems = briefingItems.map((bi) => {
      if (bi.id === briefingItemId) {
        updated = { ...bi, isReviewed: !!isReviewed };
        return updated;
      }
      return bi;
    });

    if (!updated) {
      return { success: false, briefingItem: null };
    }

    this._saveToStorage('briefing_items', briefingItems);
    return { success: true, briefingItem: updated };
  }

  // getRouteLists()
  getRouteLists() {
    return this._getFromStorage('route_lists');
  }

  // findDestinationAirportsForRoute(departureAirportId, maxDistanceNm, minRunwayLengthFt, sortBy)
  findDestinationAirportsForRoute(departureAirportId, maxDistanceNm, minRunwayLengthFt, sortBy) {
    const airports = this._getFromStorage('airports');
    const departure = airports.find((a) => a.id === departureAirportId);
    if (!departure) return [];

    const maxDist = typeof maxDistanceNm === 'number' ? maxDistanceNm : Infinity;
    const minRunway = typeof minRunwayLengthFt === 'number' ? minRunwayLengthFt : 0;

    const results = [];

    airports.forEach((a) => {
      if (a.id === departure.id) return;
      const runwayLen = typeof a.longestRunwayLengthFt === 'number' ? a.longestRunwayLengthFt : 0;
      if (runwayLen < minRunway) return;
      const dist = this._haversineNm(
        departure.latitude,
        departure.longitude,
        a.latitude,
        a.longitude
      );
      if (dist === null) return;
      if (dist <= maxDist) {
        results.push({ airport: a, distanceNm: dist });
      }
    });

    if (sortBy === 'user_rating_desc') {
      results.sort((a, b) => {
        const ra = typeof a.airport.userRating === 'number' ? a.airport.userRating : 0;
        const rb = typeof b.airport.userRating === 'number' ? b.airport.userRating : 0;
        if (rb !== ra) return rb - ra;
        return a.distanceNm - b.distanceNm;
      });
    } else if (sortBy === 'distance_asc') {
      results.sort((a, b) => a.distanceNm - b.distanceNm);
    }

    return results;
  }

  // saveRoute(name, departureAirportId, destinationAirportId, flightRules, routeListName)
  saveRoute(name, departureAirportId, destinationAirportId, flightRules, routeListName) {
    const airports = this._getFromStorage('airports');
    let routes = this._getFromStorage('routes');

    const dep = airports.find((a) => a.id === departureAirportId);
    const dest = airports.find((a) => a.id === destinationAirportId);
    if (!dep || !dest) {
      return { success: false, route: null, routeList: null, message: 'Invalid airports.' };
    }

    const allowedRules = ['vfr', 'ifr'];
    if (!allowedRules.includes(flightRules)) {
      return { success: false, route: null, routeList: null, message: 'Invalid flight rules.' };
    }

    const routeList = this._getOrCreateRouteListByName(routeListName);

    const distanceNm = this._haversineNm(
      dep.latitude,
      dep.longitude,
      dest.latitude,
      dest.longitude
    );

    const route = {
      id: this._generateId('route'),
      routeListId: routeList.id,
      name,
      departureAirportId: dep.id,
      destinationAirportId: dest.id,
      flightRules,
      totalDistanceNm: distanceNm != null ? distanceNm : null,
      createdAt: this._nowISOString()
    };

    routes.push(route);
    this._saveToStorage('routes', routes);

    const enrichedRoute = {
      ...route,
      departureAirport: dep,
      destinationAirport: dest
    };

    return {
      success: true,
      route: enrichedRoute,
      routeList,
      message: 'Route saved successfully.'
    };
  }

  // searchCourses(query, filters, sortBy)
  searchCourses(query, filters, sortBy) {
    let courses = this._getFromStorage('courses');
    const q = (query || '').trim().toLowerCase();

    if (q) {
      courses = courses.filter((c) => {
        const title = (c.title || '').toLowerCase();
        const shortDesc = (c.shortDescription || '').toLowerCase();
        const category = (c.category || '').toLowerCase();
        return title.includes(q) || shortDesc.includes(q) || category.includes(q);
      });
    }

    if (filters && typeof filters === 'object') {
      if (typeof filters.maxPriceUsd === 'number') {
        courses = courses.filter((c) => c.priceUsd <= filters.maxPriceUsd);
      }
      if (typeof filters.minRating === 'number') {
        courses = courses.filter((c) => (c.rating || 0) >= filters.minRating);
      }
      if (typeof filters.minDurationHours === 'number') {
        courses = courses.filter((c) => c.totalDurationHours >= filters.minDurationHours);
      }
    }

    if (sortBy === 'price_asc') {
      courses.sort((a, b) => a.priceUsd - b.priceUsd);
    } else if (sortBy === 'price_desc') {
      courses.sort((a, b) => b.priceUsd - a.priceUsd);
    } else if (sortBy === 'rating_desc') {
      courses.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'rating_asc') {
      courses.sort((a, b) => (a.rating || 0) - (b.rating || 0));
    }

    return courses;
  }

  // getCourseDetail(courseId)
  getCourseDetail(courseId) {
    const courses = this._getFromStorage('courses');
    return courses.find((c) => c.id === courseId) || null;
  }

  // addCourseToTrainingPlan(courseId, goal, targetCompletionDate, trainingPlanName)
  addCourseToTrainingPlan(courseId, goal, targetCompletionDate, trainingPlanName = 'My Training Plan') {
    const courses = this._getFromStorage('courses');
    let items = this._getFromStorage('training_plan_items');

    const course = courses.find((c) => c.id === courseId);
    if (!course) {
      return { success: false, trainingPlan: null, trainingPlanItem: null, message: 'Course not found.' };
    }

    const plan = this._getOrCreateTrainingPlanByName(trainingPlanName);

    const targetDate = this._parseDate(targetCompletionDate);
    if (!targetDate) {
      return {
        success: false,
        trainingPlan: null,
        trainingPlanItem: null,
        message: 'Invalid target completion date.'
      };
    }

    const item = {
      id: this._generateId('training_plan_item'),
      trainingPlanId: plan.id,
      courseId: course.id,
      goal,
      targetCompletionDate: targetDate.toISOString(),
      status: 'not_started',
      addedAt: this._nowISOString()
    };

    items.push(item);
    this._saveToStorage('training_plan_items', items);

    return { success: true, trainingPlan: plan, trainingPlanItem: item, message: 'Course added to training plan.' };
  }

  // searchEvents(topic, eventType, startDate, endDate, sortBy)
  searchEvents(topic, eventType, startDate, endDate, sortBy) {
    let events = this._getFromStorage('events');

    if (topic) {
      events = events.filter((e) => e.topic === topic);
    }
    if (eventType) {
      events = events.filter((e) => e.eventType === eventType);
    }

    const start = this._parseDate(startDate);
    const end = this._parseDate(endDate);

    if (start) {
      events = events.filter((e) => {
        const d = this._parseDate(e.startDateTime);
        return d && d >= start;
      });
    }
    if (end) {
      events = events.filter((e) => {
        const d = this._parseDate(e.startDateTime);
        return d && d <= end;
      });
    }

    if (sortBy === 'date_asc') {
      events.sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return da - db;
      });
    } else if (sortBy === 'date_desc') {
      events.sort((a, b) => {
        const da = this._parseDate(a.startDateTime) || new Date(0);
        const db = this._parseDate(b.startDateTime) || new Date(0);
        return db - da;
      });
    }

    return events;
  }

  // getEventDetail(eventId)
  getEventDetail(eventId) {
    const events = this._getFromStorage('events');
    return events.find((e) => e.id === eventId) || null;
  }

  // registerForEvent(eventId, registrantName, registrantEmail, notificationChannel, reminderOffsetDays, notes)
  registerForEvent(eventId, registrantName, registrantEmail, notificationChannel, reminderOffsetDays, notes) {
    const allowedChannels = ['site_notifications_only', 'email_and_site', 'email_only'];
    const events = this._getFromStorage('events');
    let registrations = this._getFromStorage('registrations');

    const event = events.find((e) => e.id === eventId);
    if (!event) {
      return { success: false, registration: null, message: 'Event not found.' };
    }

    if (!allowedChannels.includes(notificationChannel)) {
      return { success: false, registration: null, message: 'Invalid notification channel.' };
    }

    const offset = typeof reminderOffsetDays === 'number' ? reminderOffsetDays : 0;

    const registration = {
      id: this._generateId('registration'),
      eventId: event.id,
      registrantName,
      registrantEmail,
      registrationDate: this._nowISOString(),
      notificationChannel,
      reminderOffsetDays: offset,
      notes: notes || null
    };

    registrations.push(registration);
    this._saveToStorage('registrations', registrations);

    return { success: true, registration, message: 'Registration completed.' };
  }

  // searchArticles(query, filters, sortBy)
  searchArticles(query, filters, sortBy) {
    let articles = this._getFromStorage('articles');
    const q = (query || '').trim().toLowerCase();

    if (q) {
      articles = articles.filter((a) => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        const tags = Array.isArray(a.topicTags) ? a.topicTags.join(' ').toLowerCase() : '';
        return (
          title.includes(q) ||
          summary.includes(q) ||
          content.includes(q) ||
          tags.includes(q)
        );
      });
    }

    if (filters && typeof filters === 'object') {
      if (filters.publishedAfter) {
        const after = this._parseDate(filters.publishedAfter);
        if (after) {
          articles = articles.filter((a) => {
            const d = this._parseDate(a.publishedAt);
            return d && d > after;
          });
        }
      }
      if (typeof filters.maxReadingTimeMinutes === 'number') {
        articles = articles.filter((a) => a.readingTimeMinutes <= filters.maxReadingTimeMinutes);
      }
    }

    if (sortBy === 'most_popular') {
      articles.sort((a, b) => (b.popularityScore || 0) - (a.popularityScore || 0));
    } else if (sortBy === 'top_rated') {
      articles.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'newest') {
      articles.sort((a, b) => {
        const da = this._parseDate(a.publishedAt) || new Date(0);
        const db = this._parseDate(b.publishedAt) || new Date(0);
        return db - da;
      });
    }

    return articles;
  }

  // getArticleDetail(articleId)
  getArticleDetail(articleId) {
    const articles = this._getFromStorage('articles');
    return articles.find((a) => a.id === articleId) || null;
  }

  // getReadingLists()
  getReadingLists() {
    return this._getFromStorage('reading_lists');
  }

  // saveArticleToReadingList(articleId, readingListName)
  saveArticleToReadingList(articleId, readingListName) {
    const articles = this._getFromStorage('articles');
    let items = this._getFromStorage('reading_list_items');

    const article = articles.find((a) => a.id === articleId);
    if (!article) {
      return { success: false, readingList: null, readingListItem: null, message: 'Article not found.' };
    }

    const list = this._getOrCreateReadingListByName(readingListName);

    const existing = items.find(
      (i) => i.readingListId === list.id && i.articleId === article.id
    );
    if (existing) {
      return { success: true, readingList: list, readingListItem: existing, message: 'Article already in list.' };
    }

    const item = {
      id: this._generateId('reading_list_item'),
      readingListId: list.id,
      articleId: article.id,
      addedAt: this._nowISOString()
    };

    items.push(item);
    this._saveToStorage('reading_list_items', items);

    return { success: true, readingList: list, readingListItem: item, message: 'Article saved to reading list.' };
  }

  // searchFlightSchools(locationQuery, radiusMiles, minRating, sortBy)
  searchFlightSchools(locationQuery, radiusMiles, minRating, sortBy) {
    let results = [];
    const schools = this._getFromStorage('flight_schools');

    this._recordDirectorySearch('flight_schools', locationQuery, radiusMiles, minRating);

    const q = (locationQuery || '').trim().toLowerCase();
    let filtered = schools;

    if (q) {
      const tokens = q.split(/[\s,]+/).filter(Boolean);
      filtered = filtered.filter((s) => {
        const city = (s.city || '').toLowerCase();
        const state = (s.state || '').toLowerCase();
        const name = (s.name || '').toLowerCase();
        if (tokens.length === 0) return true;
        // Require each token in the query to match at least one of city/state/name
        return tokens.every((token) =>
          city.includes(token) || state.includes(token) || name.includes(token)
        );
      });
    }

    if (typeof minRating === 'number') {
      filtered = filtered.filter((s) => (s.rating || 0) >= minRating);
    }

    if (sortBy === 'rating_desc') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'name_asc') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    // Distance computation is not possible without geo for locationQuery; return null distance
    results = filtered.map((school) => ({
      flightSchool: school,
      distanceFromSearchLocationMiles: null
    }));

    return results;
  }

  // getFlightSchoolDetail(flightSchoolId)
  getFlightSchoolDetail(flightSchoolId) {
    const schools = this._getFromStorage('flight_schools');
    const airports = this._getFromStorage('airports');
    const school = schools.find((s) => s.id === flightSchoolId) || null;
    if (!school) return null;
    const airport = airports.find((a) => a.id === school.airportId) || null;
    return { ...school, airport };
  }

  // getFlightSchoolFleet(flightSchoolId, isIfrCapable, maxHourlyWetRateUsd)
  getFlightSchoolFleet(flightSchoolId, isIfrCapable, maxHourlyWetRateUsd) {
    const aircraft = this._getFromStorage('aircraft');
    const schools = this._getFromStorage('flight_schools');
    const school = schools.find((s) => s.id === flightSchoolId) || null;

    let filtered = aircraft.filter((a) => a.flightSchoolId === flightSchoolId);

    if (typeof isIfrCapable === 'boolean') {
      if (isIfrCapable) {
        filtered = filtered.filter((a) => a.isIfrCapable);
      }
    }

    if (typeof maxHourlyWetRateUsd === 'number') {
      filtered = filtered.filter((a) => a.hourlyWetRateUsd <= maxHourlyWetRateUsd);
    }

    return filtered.map((a) => ({ ...a, flightSchool: school }));
  }

  // addAircraftToComparison(aircraftId)
  addAircraftToComparison(aircraftId) {
    const aircraftList = this._getFromStorage('aircraft');
    const aircraft = aircraftList.find((a) => a.id === aircraftId);
    if (!aircraft) {
      return [];
    }
    this._updateAircraftComparisonSet(aircraftId, 'add');
    return this.getAircraftComparison();
  }

  // getAircraftComparison()
  getAircraftComparison() {
    const ids = this._getFromStorage('aircraft_comparison_set');
    const aircraftList = this._getFromStorage('aircraft');
    const schools = this._getFromStorage('flight_schools');

    return ids
      .map((id) => aircraftList.find((a) => a.id === id) || null)
      .filter((a) => a !== null)
      .map((a) => {
        const school = schools.find((s) => s.id === a.flightSchoolId) || null;
        return { ...a, flightSchool: school };
      });
  }

  // markPreferredTrainer(aircraftId)
  markPreferredTrainer(aircraftId) {
    const aircraftList = this._getFromStorage('aircraft');
    const aircraft = aircraftList.find((a) => a.id === aircraftId);
    if (!aircraft) {
      return { success: false, preferredTrainer: null, aircraft: null, message: 'Aircraft not found.' };
    }

    const preferredTrainer = {
      id: this._generateId('preferred_trainer'),
      aircraftId,
      markedAt: this._nowISOString()
    };

    // single preferred: overwrite all
    const list = [preferredTrainer];
    this._saveToStorage('preferred_trainers', list);

    return { success: true, preferredTrainer, aircraft, message: 'Preferred trainer saved.' };
  }

  // searchMedicalExaminers(zip, radiusMiles, offersClass1Medicals, weekdayAvailabilityBefore6pm, sortBy)
  searchMedicalExaminers(zip, radiusMiles, offersClass1Medicals, weekdayAvailabilityBefore6pm, sortBy) {
    let examiners = this._getFromStorage('medical_examiners');

    this._recordDirectorySearch('medical_examiners', zip, radiusMiles, null);

    const z = (zip || '').trim();
    if (z) {
      const prefix = z.slice(0, 3);
      examiners = examiners.filter((e) => {
        const ezip = (e.zip || '').trim();
        return ezip.startsWith(prefix);
      });
    }

    if (typeof offersClass1Medicals === 'boolean' && offersClass1Medicals) {
      examiners = examiners.filter((e) => e.offersClass1Medicals);
    }

    if (typeof weekdayAvailabilityBefore6pm === 'boolean' && weekdayAvailabilityBefore6pm) {
      examiners = examiners.filter((e) => e.weekdayAvailabilityBefore6pm);
    }

    if (typeof radiusMiles === 'number') {
      examiners = examiners.filter((e) => {
        if (typeof e.distanceFromSearchZipMiles !== 'number') return true;
        return e.distanceFromSearchZipMiles <= radiusMiles;
      });
    }

    if (sortBy === 'next_available_asc') {
      examiners.sort((a, b) => {
        const da = this._parseDate(a.nextAvailableAppointment) || new Date(8640000000000000);
        const db = this._parseDate(b.nextAvailableAppointment) || new Date(8640000000000000);
        return da - db;
      });
    } else if (sortBy === 'distance_asc') {
      examiners.sort((a, b) => {
        const da = typeof a.distanceFromSearchZipMiles === 'number' ? a.distanceFromSearchZipMiles : Infinity;
        const db = typeof b.distanceFromSearchZipMiles === 'number' ? b.distanceFromSearchZipMiles : Infinity;
        return da - db;
      });
    }

    return examiners;
  }

  // getMedicalExaminerDetail(medicalExaminerId)
  getMedicalExaminerDetail(medicalExaminerId) {
    const examiners = this._getFromStorage('medical_examiners');
    return examiners.find((e) => e.id === medicalExaminerId) || null;
  }

  // saveExaminerToContacts(medicalExaminerId, contactGroupName, note)
  saveExaminerToContacts(medicalExaminerId, contactGroupName, note) {
    const examiners = this._getFromStorage('medical_examiners');
    let contacts = this._getFromStorage('contacts');

    const examiner = examiners.find((e) => e.id === medicalExaminerId);
    if (!examiner) {
      return { success: false, contactGroup: null, contact: null, message: 'Medical examiner not found.' };
    }

    const group = this._getOrCreateContactGroupByName(contactGroupName);

    const contact = {
      id: this._generateId('contact'),
      groupId: group.id,
      contactType: 'medical_examiner',
      medicalExaminerId: examiner.id,
      flightSchoolId: null,
      name: examiner.name,
      note: note || null,
      createdAt: this._nowISOString()
    };

    contacts.push(contact);
    this._saveToStorage('contacts', contacts);

    return { success: true, contactGroup: group, contact, message: 'Medical examiner saved to contacts.' };
  }

  // getForumCategories()
  getForumCategories() {
    return this._getFromStorage('forum_categories');
  }

  // listThreadsByCategory(categoryId, sortBy)
  listThreadsByCategory(categoryId, sortBy) {
    const threads = this._getFromStorage('forum_threads');
    const categories = this._getFromStorage('forum_categories');
    const category = categories.find((c) => c.id === categoryId) || null;

    let filtered = threads.filter((t) => t.categoryId === categoryId);

    if (sortBy === 'recent' || !sortBy) {
      filtered.sort((a, b) => {
        const da = this._parseDate(a.createdAt) || new Date(0);
        const db = this._parseDate(b.createdAt) || new Date(0);
        return db - da;
      });
    }

    return filtered.map((t) => ({ ...t, category }));
  }

  // createForumThread(categoryId, title, body, tags, notificationChannel)
  createForumThread(categoryId, title, body, tags, notificationChannel) {
    const categories = this._getFromStorage('forum_categories');
    let threads = this._getFromStorage('forum_threads');
    let forumTags = this._getFromStorage('forum_tags');
    let threadTags = this._getFromStorage('thread_tags');
    let notificationSettings = this._getFromStorage('thread_notification_settings');

    const category = categories.find((c) => c.id === categoryId);
    if (!category) {
      return { thread: null, tags: [], notificationSetting: null };
    }

    const allowedChannels = ['site_notifications_only', 'email_and_site', 'email_only', 'none'];
    if (!allowedChannels.includes(notificationChannel)) {
      notificationChannel = 'site_notifications_only';
    }

    const thread = {
      id: this._generateId('forum_thread'),
      categoryId: category.id,
      title,
      body,
      createdAt: this._nowISOString()
    };

    threads.push(thread);

    const tagNames = Array.isArray(tags) ? tags : [];
    const associatedTags = [];

    tagNames.forEach((name) => {
      const trimmed = (name || '').trim();
      if (!trimmed) return;
      let tag = forumTags.find((t) => t.name === trimmed);
      if (!tag) {
        tag = {
          id: this._generateId('forum_tag'),
          name: trimmed,
          description: null
        };
        forumTags.push(tag);
      }
      associatedTags.push(tag);
      const threadTag = {
        id: this._generateId('thread_tag'),
        threadId: thread.id,
        tagId: tag.id
      };
      threadTags.push(threadTag);
    });

    const notificationSetting = {
      id: this._generateId('thread_notification_setting'),
      threadId: thread.id,
      notificationChannel
    };

    notificationSettings.push(notificationSetting);

    this._saveToStorage('forum_threads', threads);
    this._saveToStorage('forum_tags', forumTags);
    this._saveToStorage('thread_tags', threadTags);
    this._saveToStorage('thread_notification_settings', notificationSettings);

    return { thread: { ...thread, category }, tags: associatedTags, notificationSetting };
  }

  // getThreadDetail(threadId)
  getThreadDetail(threadId) {
    const threads = this._getFromStorage('forum_threads');
    const categories = this._getFromStorage('forum_categories');
    const forumTags = this._getFromStorage('forum_tags');
    const threadTags = this._getFromStorage('thread_tags');
    const notificationSettings = this._getFromStorage('thread_notification_settings');

    const thread = threads.find((t) => t.id === threadId);
    if (!thread) {
      return { thread: null, tags: [], notificationSetting: null };
    }

    const category = categories.find((c) => c.id === thread.categoryId) || null;

    const tt = threadTags.filter((tt) => tt.threadId === thread.id);
    const tags = tt
      .map((link) => forumTags.find((tag) => tag.id === link.tagId) || null)
      .filter((t) => t !== null);

    const notificationSetting =
      notificationSettings.find((n) => n.threadId === thread.id) || null;

    return { thread: { ...thread, category }, tags, notificationSetting };
  }

  // getAboutPageContent()
  getAboutPageContent() {
    const defaultContent = {
      mission: '',
      toolsOverview: '',
      teamMembers: []
    };
    const stored = this._getObjectFromStorage('about_page_content', defaultContent) || defaultContent;
    return {
      mission: stored.mission || '',
      toolsOverview: stored.toolsOverview || '',
      teamMembers: Array.isArray(stored.teamMembers) ? stored.teamMembers : []
    };
  }

  // getContactPageInfo()
  getContactPageInfo() {
    const defaultInfo = {
      supportEmail: '',
      supportPhone: '',
      mailingAddress: ''
    };
    const stored = this._getObjectFromStorage('contact_page_info', defaultInfo) || defaultInfo;
    return {
      supportEmail: stored.supportEmail || '',
      supportPhone: stored.supportPhone || '',
      mailingAddress: stored.mailingAddress || ''
    };
  }

  // submitContactForm(name, email, subject, message, category)
  submitContactForm(name, email, subject, message, category) {
    let submissions = this._getFromStorage('contact_form_submissions');
    const ticketId = this._generateId('ticket');

    const submission = {
      id: ticketId,
      name,
      email,
      subject,
      message,
      category: category || null,
      createdAt: this._nowISOString()
    };

    submissions.push(submission);
    this._saveToStorage('contact_form_submissions', submissions);

    return { success: true, ticketId, message: 'Contact form submitted.' };
  }

  // getHelpAndFaqContent()
  getHelpAndFaqContent() {
    const stored = this._getObjectFromStorage('help_and_faq_content', { faqs: [], taskGuides: [] });
    const faqs = Array.isArray(stored.faqs) ? stored.faqs : [];
    const taskGuides = Array.isArray(stored.taskGuides) ? stored.taskGuides : [];
    return { faqs, taskGuides };
  }

  // getLegalDocument(documentType)
  getLegalDocument(documentType) {
    const documents = this._getObjectFromStorage('legal_documents', {}); // map of type -> doc
    const doc = documents[documentType] || null;
    if (!doc) {
      return {
        title: '',
        lastUpdated: null,
        content: ''
      };
    }
    return {
      title: doc.title || '',
      lastUpdated: doc.lastUpdated || null,
      content: doc.content || ''
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