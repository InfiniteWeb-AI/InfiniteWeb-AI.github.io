// localStorage polyfill for Node.js and environments without localStorage
const localStorage = (function () {
  try {
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const keys = [
      'trips',
      'daily_logs',
      'charging_stops',
      'tags',
      'tag_assignments',
      'itineraries',
      'itinerary_items',
      'collections',
      'collection_items',
      'favorite_trips',
      'comments',
      'reading_lists',
      'reading_list_items',
      'profile_settings',
      'vehicle_models',
      'charging_networks',
      'chargers',
      'route_plans',
      'trip_notes',
      'faq_articles',
      'tag_subscriptions'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
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
      return JSON.parse(data);
    } catch (e) {
      return [];
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

  // -------------------- Generic helpers --------------------

  _parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  _compareDatesDesc(a, b) {
    const da = this._parseDate(a) || new Date(0);
    const db = this._parseDate(b) || new Date(0);
    return db - da;
  }

  _compareDatesAsc(a, b) {
    const da = this._parseDate(a) || new Date(0);
    const db = this._parseDate(b) || new Date(0);
    return da - db;
  }

  _paginate(items, page = 1, page_size = 20) {
    const p = page && page > 0 ? page : 1;
    const size = page_size && page_size > 0 ? page_size : 20;
    const total_count = items.length;
    const start = (p - 1) * size;
    const pagedItems = items.slice(start, start + size);
    return { items: pagedItems, total_count, page: p, page_size: size };
  }

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  // -------------------- Required private helper functions --------------------

  // Load or create single ProfileSettings record
  _getOrCreateProfileSettings() {
    let profiles = this._getFromStorage('profile_settings');
    if (!Array.isArray(profiles)) profiles = [];
    if (profiles.length === 0) {
      const now = new Date().toISOString();
      const profile = {
        id: this._generateId('profile'),
        preferred_charging_network: 'none',
        vehicle_model_id: null,
        preferred_ac_charging_limit_kw: null,
        use_ac_limit_for_suggestions: false,
        created_at: now,
        updated_at: now
      };
      profiles.push(profile);
      this._saveToStorage('profile_settings', profiles);
      return profile;
    }
    return profiles[0];
  }

  // Recalculate itinerary totals after changes
  _recalculateItineraryTotals(itineraryId) {
    const itineraries = this._getFromStorage('itineraries');
    const itineraryIndex = itineraries.findIndex((i) => i.id === itineraryId);
    if (itineraryIndex === -1) {
      return { itinerary: null, total_distance_km: 0, total_days: 0 };
    }
    const itinerary = itineraries[itineraryIndex];
    const itineraryItems = this._getFromStorage('itinerary_items').filter(
      (ii) => ii.itinerary_id === itineraryId
    );
    const trips = this._getFromStorage('trips');
    const dailyLogs = this._getFromStorage('daily_logs');

    let totalDistance = 0;
    itineraryItems.forEach((ii) => {
      let dist = typeof ii.distance_km === 'number' ? ii.distance_km : null;
      if (dist == null) {
        if (ii.item_type === 'trip') {
          const t = trips.find((x) => x.id === ii.item_id);
          dist = t && typeof t.distance_km === 'number' ? t.distance_km : 0;
        } else if (ii.item_type === 'daily_log') {
          const d = dailyLogs.find((x) => x.id === ii.item_id);
          dist = d && typeof d.distance_km === 'number' ? d.distance_km : 0;
        }
      }
      totalDistance += dist || 0;
    });

    itinerary.total_distance_km = totalDistance;
    itinerary.updated_at = new Date().toISOString();
    itineraries[itineraryIndex] = itinerary;
    this._saveToStorage('itineraries', itineraries);

    return {
      itinerary,
      total_distance_km: totalDistance,
      total_days: itineraryItems.length
    };
  }

  // Recalculate collection totals after changes
  _recalculateCollectionTotals(collectionId) {
    const collections = this._getFromStorage('collections');
    const idx = collections.findIndex((c) => c.id === collectionId);
    if (idx === -1) {
      return {
        collection: null,
        total_items: 0,
        total_distance_km: 0,
        total_cost_eur: 0
      };
    }
    const collection = collections[idx];
    const collectionItems = this._getFromStorage('collection_items').filter(
      (ci) => ci.collection_id === collectionId
    );
    const trips = this._getFromStorage('trips');
    const dailyLogs = this._getFromStorage('daily_logs');

    let totalDistance = 0;
    let totalCost = 0;

    collectionItems.forEach((ci) => {
      if (ci.item_type === 'trip') {
        const t = trips.find((x) => x.id === ci.item_id);
        if (t) {
          totalDistance += t.distance_km || 0;
          totalCost += t.total_charging_cost_eur || 0;
        }
      } else if (ci.item_type === 'daily_log') {
        const d = dailyLogs.find((x) => x.id === ci.item_id);
        if (d) {
          totalDistance += d.distance_km || 0;
          totalCost += d.total_charging_cost_eur || 0;
        }
      }
    });

    collection.total_items = collectionItems.length;
    collection.total_distance_km = totalDistance;
    collection.total_cost_eur = totalCost;
    collection.updated_at = new Date().toISOString();
    collections[idx] = collection;
    this._saveToStorage('collections', collections);

    return {
      collection,
      total_items: collectionItems.length,
      total_distance_km: totalDistance,
      total_cost_eur: totalCost
    };
  }

  // Compute chargers along a route (geometry is approximated as data is not available)
  _getChargersAlongRouteGeometry(routePlan, min_power_kw, charger_types) {
    const chargers = this._getFromStorage('chargers');
    const minPower = typeof min_power_kw === 'number' ? min_power_kw : null;
    const typeSet = Array.isArray(charger_types) && charger_types.length
      ? new Set(charger_types)
      : null;

    let filtered = chargers.filter((ch) => {
      if (minPower != null && typeof ch.max_power_kw === 'number' && ch.max_power_kw < minPower) {
        return false;
      }
      if (typeSet && !typeSet.has(ch.charger_type)) {
        return false;
      }
      return true;
    });

    // Deterministic ordering: by created_at or id
    filtered.sort((a, b) => {
      const ca = this._parseDate(a.created_at) || new Date(0);
      const cb = this._parseDate(b.created_at) || new Date(0);
      if (cb - ca !== 0) return cb - ca;
      return (a.id || '').localeCompare(b.id || '');
    });

    // Map to along-route sequence; we don't have real geometry, so use index-based sequence/distance
    return filtered.map((ch, index) => ({
      charger: ch,
      distance_from_origin_km: (index + 1) * 10,
      sequence_along_route: index + 1
    }));
  }

  // Apply common filters/sorting for trip & daily log search
  _applyTripAndLogSearchFilters(trips, dailyLogs, query, filters, sort_by) {
    const q = this._normalizeString(query || '');
    const f = filters || {};
    const countryFilter = f.country || null;
    const maxSpeed = typeof f.max_average_speed_kmh === 'number' ? f.max_average_speed_kmh : null;
    const minStops = typeof f.min_charging_stops === 'number' ? f.min_charging_stops : null;

    const results = [];

    trips.forEach((t) => {
      if (q) {
        const inTitle = this._normalizeString(t.title).includes(q);
        const inSummary = this._normalizeString(t.summary).includes(q);
        if (!inTitle && !inSummary) return;
      }
      if (countryFilter && t.primary_country && t.primary_country !== countryFilter) return;
      if (maxSpeed != null && typeof t.average_speed_kmh === 'number' && t.average_speed_kmh > maxSpeed) {
        return;
      }
      if (minStops != null && typeof t.charging_stop_count === 'number' && t.charging_stop_count < minStops) {
        return;
      }
      results.push({
        item_type: 'trip',
        trip: t,
        daily_log: null,
        scenic_rating: t.scenic_rating || 0,
        average_speed_kmh: t.average_speed_kmh || null,
        charging_stop_count: t.charging_stop_count || 0
      });
    });

    dailyLogs.forEach((d) => {
      if (q) {
        const inTitle = this._normalizeString(d.title).includes(q);
        if (!inTitle) return;
      }
      if (countryFilter && d.country && d.country !== countryFilter) return;
      if (maxSpeed != null && typeof d.average_speed_kmh === 'number' && d.average_speed_kmh > maxSpeed) {
        return;
      }
      if (minStops != null && typeof d.charging_stop_count === 'number' && d.charging_stop_count < minStops) {
        return;
      }
      results.push({
        item_type: 'daily_log',
        trip: null,
        daily_log: d,
        scenic_rating: 0,
        average_speed_kmh: d.average_speed_kmh || null,
        charging_stop_count: d.charging_stop_count || 0
      });
    });

    const mode = sort_by || 'relevance';

    results.sort((a, b) => {
      if (mode === 'scenic_rating_highest_first') {
        const sa = a.scenic_rating || 0;
        const sb = b.scenic_rating || 0;
        if (sb !== sa) return sb - sa;
      }

      // date-based sorting for relevance and date_newest_first
      const da = a.item_type === 'trip' ? a.trip.primary_date : a.daily_log.date;
      const db = b.item_type === 'trip' ? b.trip.primary_date : b.daily_log.date;
      const diff = this._compareDatesDesc(da, db);
      if (diff !== 0) return diff;

      // fallback on title
      const ta = a.item_type === 'trip' ? (a.trip.title || '') : (a.daily_log.title || '');
      const tb = b.item_type === 'trip' ? (b.trip.title || '') : (b.daily_log.title || '');
      return ta.localeCompare(tb);
    });

    return results;
  }

  // -------------------- Interface implementations --------------------

  // getHomeOverview()
  getHomeOverview() {
    const trips = this._getFromStorage('trips');
    const dailyLogs = this._getFromStorage('daily_logs');
    const tags = this._getFromStorage('tags');
    const itineraries = this._getFromStorage('itineraries');
    const collections = this._getFromStorage('collections');
    const readingLists = this._getFromStorage('reading_lists');

    const featured_trips = [...trips]
      .sort((a, b) => this._compareDatesDesc(a.primary_date, b.primary_date))
      .slice(0, 5);

    const featured_daily_logs = [...dailyLogs]
      .sort((a, b) => this._compareDatesDesc(a.date, b.date))
      .slice(0, 5);

    const highlighted_tags = [...tags]
      .sort((a, b) => this._compareDatesDesc(a.created_at, b.created_at))
      .slice(0, 5);

    const quick_itineraries = itineraries.map((it) => {
      const totals = this._recalculateItineraryTotals(it.id);
      return {
        itinerary: totals.itinerary || it,
        item_count: totals.total_days,
        total_distance_km: totals.total_distance_km
      };
    });

    const quick_collections = collections.map((c) => {
      const totals = this._recalculateCollectionTotals(c.id);
      return {
        collection: totals.collection || c,
        total_items: totals.total_items,
        total_distance_km: totals.total_distance_km,
        total_cost_eur: totals.total_cost_eur
      };
    });

    const quick_reading_lists = readingLists;

    return {
      featured_trips,
      featured_daily_logs,
      highlighted_tags,
      quick_itineraries,
      quick_collections,
      quick_reading_lists
    };
  }

  // getTripFilterOptions()
  getTripFilterOptions() {
    const trips = this._getFromStorage('trips');

    const regionsSet = new Set();
    const yearsSet = new Set();
    let minDist = Infinity;
    let maxDist = -Infinity;
    let minCons = Infinity;
    let maxCons = -Infinity;

    trips.forEach((t) => {
      if (t.region) regionsSet.add(t.region);
      const d = this._parseDate(t.primary_date);
      if (d) yearsSet.add(d.getFullYear());
      if (typeof t.distance_km === 'number') {
        minDist = Math.min(minDist, t.distance_km);
        maxDist = Math.max(maxDist, t.distance_km);
      }
      if (typeof t.energy_consumption_kwh_per_100km === 'number') {
        minCons = Math.min(minCons, t.energy_consumption_kwh_per_100km);
        maxCons = Math.max(maxCons, t.energy_consumption_kwh_per_100km);
      }
    });

    const regions = Array.from(regionsSet).sort();
    const years = Array.from(yearsSet).sort();

    if (!isFinite(minDist)) minDist = 0;
    if (!isFinite(maxDist)) maxDist = 0;
    if (!isFinite(minCons)) minCons = 0;
    if (!isFinite(maxCons)) maxCons = 0;

    const trip_types = ['weekend', 'multi_day', 'day_trip', 'commute', 'test_drive'];

    return {
      regions,
      trip_types,
      years,
      default_distance_min_km: minDist,
      default_distance_max_km: maxDist,
      default_consumption_min_kwh_per_100km: minCons,
      default_consumption_max_kwh_per_100km: maxCons
    };
  }

  // getTripLogEntries(...)
  getTripLogEntries(
    region,
    year,
    start_date,
    end_date,
    trip_type,
    min_distance_km,
    max_distance_km,
    min_average_speed_kmh,
    max_average_speed_kmh,
    min_energy_consumption_kwh_per_100km,
    max_energy_consumption_kwh_per_100km,
    sort_by,
    page,
    page_size
  ) {
    const trips = this._getFromStorage('trips');
    const favorites = this._getFromStorage('favorite_trips');

    const minDist = typeof min_distance_km === 'number' ? min_distance_km : null;
    const maxDist = typeof max_distance_km === 'number' ? max_distance_km : null;
    const minSpd = typeof min_average_speed_kmh === 'number' ? min_average_speed_kmh : null;
    const maxSpd = typeof max_average_speed_kmh === 'number' ? max_average_speed_kmh : null;
    const minCons = typeof min_energy_consumption_kwh_per_100km === 'number'
      ? min_energy_consumption_kwh_per_100km
      : null;
    const maxCons = typeof max_energy_consumption_kwh_per_100km === 'number'
      ? max_energy_consumption_kwh_per_100km
      : null;
    const yearNum = typeof year === 'number' ? year : null;

    const startDate = start_date ? this._parseDate(start_date) : null;
    const endDate = end_date ? this._parseDate(end_date) : null;

    let filtered = trips.filter((t) => {
      if (region && t.region !== region) return false;
      const d = this._parseDate(t.primary_date);
      if (yearNum && (!d || d.getFullYear() !== yearNum)) return false;
      if (startDate && (!d || d < startDate)) return false;
      if (endDate && (!d || d > endDate)) return false;
      if (trip_type && t.trip_type !== trip_type) return false;

      if (minDist != null && typeof t.distance_km === 'number' && t.distance_km < minDist) return false;
      if (maxDist != null && typeof t.distance_km === 'number' && t.distance_km > maxDist) return false;

      if (
        minSpd != null &&
        typeof t.average_speed_kmh === 'number' &&
        t.average_speed_kmh < minSpd
      )
        return false;
      if (
        maxSpd != null &&
        typeof t.average_speed_kmh === 'number' &&
        t.average_speed_kmh > maxSpd
      )
        return false;

      if (
        minCons != null &&
        typeof t.energy_consumption_kwh_per_100km === 'number' &&
        t.energy_consumption_kwh_per_100km < minCons
      )
        return false;
      if (
        maxCons != null &&
        typeof t.energy_consumption_kwh_per_100km === 'number' &&
        t.energy_consumption_kwh_per_100km > maxCons
      )
        return false;

      return true;
    });

    const sortMode = sort_by || 'date_newest_first';

    filtered.sort((a, b) => {
      switch (sortMode) {
        case 'date_oldest_first':
          return this._compareDatesAsc(a.primary_date, b.primary_date);
        case 'distance_desc':
          return (b.distance_km || 0) - (a.distance_km || 0);
        case 'distance_asc':
          return (a.distance_km || 0) - (b.distance_km || 0);
        case 'consumption_lowest_first': {
          const ca = typeof a.energy_consumption_kwh_per_100km === 'number'
            ? a.energy_consumption_kwh_per_100km
            : Infinity;
          const cb = typeof b.energy_consumption_kwh_per_100km === 'number'
            ? b.energy_consumption_kwh_per_100km
            : Infinity;
          return ca - cb;
        }
        case 'consumption_highest_first': {
          const ca2 = typeof a.energy_consumption_kwh_per_100km === 'number'
            ? a.energy_consumption_kwh_per_100km
            : -Infinity;
          const cb2 = typeof b.energy_consumption_kwh_per_100km === 'number'
            ? b.energy_consumption_kwh_per_100km
            : -Infinity;
          return cb2 - ca2;
        }
        case 'date_newest_first':
        default:
          return this._compareDatesDesc(a.primary_date, b.primary_date);
      }
    });

    const pagination = this._paginate(filtered, page, page_size);

    const items = pagination.items.map((trip) => ({
      trip,
      is_favorited: favorites.some((f) => f.trip_id === trip.id)
    }));

    return {
      items,
      total_count: pagination.total_count,
      page: pagination.page,
      page_size: pagination.page_size,
      has_more: pagination.page * pagination.page_size < pagination.total_count
    };
  }

  // getTripDetail(tripId)
  getTripDetail(tripId) {
    const trips = this._getFromStorage('trips');
    const trip = trips.find((t) => t.id === tripId) || null;
    const tags = this._getFromStorage('tags');
    const tagAssignments = this._getFromStorage('tag_assignments').filter(
      (ta) => ta.post_type === 'trip' && ta.post_id === tripId
    );
    const chargingStops = this._getFromStorage('charging_stops').filter(
      (cs) => cs.parent_type === 'trip' && cs.parent_id === tripId
    );
    const chargers = this._getFromStorage('chargers');
    const favorites = this._getFromStorage('favorite_trips');
    const itineraries = this._getFromStorage('itineraries');

    const resolvedTags = tagAssignments
      .map((ta) => tags.find((tg) => tg.id === ta.tag_id))
      .filter(Boolean);

    const charging_stops = chargingStops.map((cs) => ({
      charging_stop: cs,
      charger: chargers.find((ch) => ch.id === cs.charger_id) || null
    }));

    const is_favorited = favorites.some((f) => f.trip_id === tripId);

    const available_itineraries = itineraries;

    return {
      trip,
      tags: resolvedTags,
      charging_stops,
      is_favorited,
      available_itineraries
    };
  }

  // setTripFavorite(tripId, make_favorite)
  setTripFavorite(tripId, make_favorite) {
    let favorites = this._getFromStorage('favorite_trips');
    const now = new Date().toISOString();

    const existingIndex = favorites.findIndex((f) => f.trip_id === tripId);

    if (make_favorite) {
      if (existingIndex === -1) {
        favorites.push({
          id: this._generateId('favorite_trip'),
          trip_id: tripId,
          added_at: now
        });
      }
    } else {
      if (existingIndex !== -1) {
        favorites.splice(existingIndex, 1);
      }
    }

    this._saveToStorage('favorite_trips', favorites);

    return {
      success: true,
      is_favorited: favorites.some((f) => f.trip_id === tripId),
      favorites_count: favorites.length
    };
  }

  // getTripComments(tripId, page, page_size)
  getTripComments(tripId, page, page_size) {
    const commentsAll = this._getFromStorage('comments').filter(
      (c) => c.trip_id === tripId
    );

    commentsAll.sort((a, b) => this._compareDatesAsc(a.created_at, b.created_at));

    const pagination = this._paginate(commentsAll, page, page_size);

    return {
      comments: pagination.items,
      total_count: pagination.total_count,
      page: pagination.page,
      page_size: pagination.page_size
    };
  }

  // postTripComment(tripId, author_name, body, rating)
  postTripComment(tripId, author_name, body, rating) {
    const comments = this._getFromStorage('comments');
    const now = new Date().toISOString();

    const validRatings = ['rating_1', 'rating_2', 'rating_3', 'rating_4', 'rating_5'];
    const ratingValue = validRatings.includes(rating) ? rating : undefined;

    const comment = {
      id: this._generateId('comment'),
      trip_id: tripId,
      author_name,
      body,
      rating: ratingValue,
      created_at: now
    };

    comments.push(comment);
    this._saveToStorage('comments', comments);

    return {
      success: true,
      comment
    };
  }

  // createItinerary(name, duration_days, description)
  createItinerary(name, duration_days, description) {
    const itineraries = this._getFromStorage('itineraries');
    const now = new Date().toISOString();

    const itinerary = {
      id: this._generateId('itinerary'),
      name,
      duration_days: typeof duration_days === 'number' ? duration_days : null,
      description: description || '',
      status: 'draft',
      total_distance_km: 0,
      created_at: now,
      updated_at: now
    };

    itineraries.push(itinerary);
    this._saveToStorage('itineraries', itineraries);

    return { itinerary };
  }

  // getCollectionsOverview()
  getCollectionsOverview() {
    const itineraries = this._getFromStorage('itineraries');
    const collections = this._getFromStorage('collections');
    const favorites = this._getFromStorage('favorite_trips');
    const trips = this._getFromStorage('trips');

    const itOverview = itineraries.map((it) => {
      const totals = this._recalculateItineraryTotals(it.id);
      return {
        itinerary: totals.itinerary || it,
        item_count: totals.total_days,
        total_distance_km: totals.total_distance_km
      };
    });

    const colOverview = collections.map((c) => {
      const totals = this._recalculateCollectionTotals(c.id);
      return {
        collection: totals.collection || c,
        total_items: totals.total_items,
        total_distance_km: totals.total_distance_km,
        total_cost_eur: totals.total_cost_eur
      };
    });

    const favoritesSorted = [...favorites].sort((a, b) =>
      this._compareDatesDesc(a.added_at, b.added_at)
    );

    const recent_favorites = favoritesSorted
      .slice(0, 5)
      .map((f) => trips.find((t) => t.id === f.trip_id))
      .filter(Boolean);

    const favorites_group = {
      total_favorites: favorites.length,
      recent_favorites
    };

    return {
      itineraries: itOverview,
      collections: colOverview,
      favorites_group
    };
  }

  // getItineraryDetail(itineraryId)
  getItineraryDetail(itineraryId) {
    const itineraries = this._getFromStorage('itineraries');
    const itinerary = itineraries.find((it) => it.id === itineraryId) || null;
    const itineraryItems = this._getFromStorage('itinerary_items').filter(
      (ii) => ii.itinerary_id === itineraryId
    );
    const trips = this._getFromStorage('trips');
    const dailyLogs = this._getFromStorage('daily_logs');

    itineraryItems.sort((a, b) => (a.position || 0) - (b.position || 0));

    const items = itineraryItems.map((ii) => ({
      itinerary_item: ii,
      item_type: ii.item_type,
      trip: ii.item_type === 'trip' ? trips.find((t) => t.id === ii.item_id) || null : null,
      daily_log:
        ii.item_type === 'daily_log'
          ? dailyLogs.find((d) => d.id === ii.item_id) || null
          : null
    }));

    const totals = this._recalculateItineraryTotals(itineraryId);

    return {
      itinerary: totals.itinerary || itinerary,
      items,
      total_distance_km: totals.total_distance_km,
      total_days: totals.total_days
    };
  }

  // addTripToItinerary(itineraryId, tripId)
  addTripToItinerary(itineraryId, tripId) {
    const itineraryItems = this._getFromStorage('itinerary_items');
    const trips = this._getFromStorage('trips');
    const trip = trips.find((t) => t.id === tripId) || null;

    const position =
      itineraryItems
        .filter((ii) => ii.itinerary_id === itineraryId)
      .reduce((max, ii) => Math.max(max, ii.position || 0), 0) + 1;

    const itinerary_item = {
      id: this._generateId('itinerary_item'),
      itinerary_id: itineraryId,
      item_type: 'trip',
      item_id: tripId,
      position,
      date: trip ? trip.primary_date : null,
      distance_km: trip ? trip.distance_km || 0 : 0
    };

    itineraryItems.push(itinerary_item);
    this._saveToStorage('itinerary_items', itineraryItems);

    const totals = this._recalculateItineraryTotals(itineraryId);

    return {
      success: true,
      itinerary_item,
      updated_total_distance_km: totals.total_distance_km,
      item_count: totals.total_days
    };
  }

  // reorderItineraryItems(itineraryId, ordered_item_ids)
  reorderItineraryItems(itineraryId, ordered_item_ids) {
    const itineraryItems = this._getFromStorage('itinerary_items');
    const idOrder = Array.isArray(ordered_item_ids) ? ordered_item_ids : [];

    const itemsForItinerary = itineraryItems.filter(
      (ii) => ii.itinerary_id === itineraryId
    );

    const posMap = new Map();
    idOrder.forEach((id, index) => {
      posMap.set(id, index + 1);
    });

    itemsForItinerary.forEach((ii) => {
      const newPos = posMap.get(ii.id);
      if (newPos != null) {
        ii.position = newPos;
      }
    });

    // Persist updated items
    const updatedAll = itineraryItems.map((ii) => {
      const updated = itemsForItinerary.find((x) => x.id === ii.id) || ii;
      return updated;
    });

    this._saveToStorage('itinerary_items', updatedAll);
    const totals = this._recalculateItineraryTotals(itineraryId);

    const updatedItemsForItinerary = updatedAll
      .filter((ii) => ii.itinerary_id === itineraryId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    return {
      items: updatedItemsForItinerary,
      total_distance_km: totals.total_distance_km
    };
  }

  // removeItineraryItem(itineraryItemId)
  removeItineraryItem(itineraryItemId) {
    const itineraryItems = this._getFromStorage('itinerary_items');
    const idx = itineraryItems.findIndex((ii) => ii.id === itineraryItemId);
    if (idx === -1) {
      return { success: false, updated_total_distance_km: 0, item_count: 0 };
    }
    const itineraryId = itineraryItems[idx].itinerary_id;
    itineraryItems.splice(idx, 1);
    this._saveToStorage('itinerary_items', itineraryItems);

    const totals = this._recalculateItineraryTotals(itineraryId);

    return {
      success: true,
      updated_total_distance_km: totals.total_distance_km,
      item_count: totals.total_days
    };
  }

  // saveItinerary(itineraryId)
  saveItinerary(itineraryId) {
    const itineraries = this._getFromStorage('itineraries');
    const idx = itineraries.findIndex((it) => it.id === itineraryId);
    if (idx === -1) {
      return { success: false, itinerary: null };
    }
    const now = new Date().toISOString();
    itineraries[idx].status = 'saved';
    itineraries[idx].updated_at = now;
    this._saveToStorage('itineraries', itineraries);

    return { success: true, itinerary: itineraries[idx] };
  }

  // createCollection(name, collection_type, description)
  createCollection(name, collection_type, description) {
    const collections = this._getFromStorage('collections');
    const now = new Date().toISOString();

    const collection = {
      id: this._generateId('collection'),
      name,
      description: description || '',
      collection_type,
      total_items: 0,
      total_distance_km: 0,
      total_cost_eur: 0,
      created_at: now,
      updated_at: now
    };

    collections.push(collection);
    this._saveToStorage('collections', collections);

    return { collection };
  }

  // addItemToCollection(collectionId, item_type, item_id)
  addItemToCollection(collectionId, item_type, item_id) {
    const collectionItems = this._getFromStorage('collection_items');

    const position =
      collectionItems
        .filter((ci) => ci.collection_id === collectionId)
      .reduce((max, ci) => Math.max(max, ci.position || 0), 0) + 1;

    const collection_item = {
      id: this._generateId('collection_item'),
      collection_id: collectionId,
      item_type,
      item_id,
      position,
      added_at: new Date().toISOString()
    };

    collectionItems.push(collection_item);
    this._saveToStorage('collection_items', collectionItems);

    const totals = this._recalculateCollectionTotals(collectionId);

    return {
      success: true,
      collection_item,
      updated_total_items: totals.total_items,
      updated_total_distance_km: totals.total_distance_km,
      updated_total_cost_eur: totals.total_cost_eur
    };
  }

  // getCollectionDetail(collectionId)
  getCollectionDetail(collectionId) {
    const collections = this._getFromStorage('collections');
    const collection = collections.find((c) => c.id === collectionId) || null;
    const collectionItems = this._getFromStorage('collection_items').filter(
      (ci) => ci.collection_id === collectionId
    );
    const trips = this._getFromStorage('trips');
    const dailyLogs = this._getFromStorage('daily_logs');

    collectionItems.sort((a, b) => (a.position || 0) - (b.position || 0));

    const items = collectionItems.map((ci) => ({
      collection_item: ci,
      item_type: ci.item_type,
      trip: ci.item_type === 'trip' ? trips.find((t) => t.id === ci.item_id) || null : null,
      daily_log:
        ci.item_type === 'daily_log'
          ? dailyLogs.find((d) => d.id === ci.item_id) || null
          : null
    }));

    const totals = this._recalculateCollectionTotals(collectionId);

    return {
      collection: totals.collection || collection,
      items,
      total_distance_km: totals.total_distance_km,
      total_cost_eur: totals.total_cost_eur
    };
  }

  // removeCollectionItem(collectionItemId)
  removeCollectionItem(collectionItemId) {
    const collectionItems = this._getFromStorage('collection_items');
    const idx = collectionItems.findIndex((ci) => ci.id === collectionItemId);
    if (idx === -1) {
      return {
        success: false,
        updated_total_items: 0,
        updated_total_distance_km: 0,
        updated_total_cost_eur: 0
      };
    }
    const collectionId = collectionItems[idx].collection_id;
    collectionItems.splice(idx, 1);
    this._saveToStorage('collection_items', collectionItems);

    const totals = this._recalculateCollectionTotals(collectionId);
    return {
      success: true,
      updated_total_items: totals.total_items,
      updated_total_distance_km: totals.total_distance_km,
      updated_total_cost_eur: totals.total_cost_eur
    };
  }

  // reorderCollectionItems(collectionId, ordered_item_ids)
  reorderCollectionItems(collectionId, ordered_item_ids) {
    const collectionItems = this._getFromStorage('collection_items');
    const idOrder = Array.isArray(ordered_item_ids) ? ordered_item_ids : [];

    const itemsForCollection = collectionItems.filter(
      (ci) => ci.collection_id === collectionId
    );

    const posMap = new Map();
    idOrder.forEach((id, index) => {
      posMap.set(id, index + 1);
    });

    itemsForCollection.forEach((ci) => {
      const newPos = posMap.get(ci.id);
      if (newPos != null) ci.position = newPos;
    });

    const updatedAll = collectionItems.map((ci) => {
      const updated = itemsForCollection.find((x) => x.id === ci.id) || ci;
      return updated;
    });

    this._saveToStorage('collection_items', updatedAll);

    const updatedItemsForCollection = updatedAll
      .filter((ci) => ci.collection_id === collectionId)
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    return {
      items: updatedItemsForCollection
    };
  }

  // getFavoriteTrips()
  getFavoriteTrips() {
    const favorites = this._getFromStorage('favorite_trips');
    const trips = this._getFromStorage('trips');

    return favorites.map((fav) => ({
      favorite: fav,
      trip: trips.find((t) => t.id === fav.trip_id) || null
    }));
  }

  // getReadingListsOverview()
  getReadingListsOverview() {
    const readingLists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');
    const trips = this._getFromStorage('trips');
    const dailyLogs = this._getFromStorage('daily_logs');

    const overview = readingLists.map((rl) => {
      const listItems = items.filter((i) => i.reading_list_id === rl.id);
      const total_items = listItems.length;

      const countryCounts = {};
      listItems.forEach((i) => {
        let country = null;
        if (i.item_type === 'trip') {
          const t = trips.find((t2) => t2.id === i.item_id);
          country = t && t.primary_country;
        } else if (i.item_type === 'daily_log') {
          const d = dailyLogs.find((d2) => d2.id === i.item_id);
          country = d && d.country;
        }
        if (country) {
          countryCounts[country] = (countryCounts[country] || 0) + 1;
        }
      });

      let primary_country = null;
      let maxCount = 0;
      Object.keys(countryCounts).forEach((c) => {
        if (countryCounts[c] > maxCount) {
          maxCount = countryCounts[c];
          primary_country = c;
        }
      });

      return {
        reading_list: rl,
        total_items,
        primary_country
      };
    });

    return { reading_lists: overview };
  }

  // createReadingList(name, description)
  createReadingList(name, description) {
    const lists = this._getFromStorage('reading_lists');
    const now = new Date().toISOString();

    const reading_list = {
      id: this._generateId('reading_list'),
      name,
      description: description || '',
      total_items: 0,
      created_at: now,
      updated_at: now
    };

    lists.push(reading_list);
    this._saveToStorage('reading_lists', lists);

    return { reading_list };
  }

  // addItemToReadingList(readingListId, item_type, item_id)
  addItemToReadingList(readingListId, item_type, item_id) {
    const items = this._getFromStorage('reading_list_items');
    const lists = this._getFromStorage('reading_lists');

    const position =
      items
        .filter((i) => i.reading_list_id === readingListId)
      .reduce((max, i) => Math.max(max, i.position || 0), 0) + 1;

    const reading_list_item = {
      id: this._generateId('reading_list_item'),
      reading_list_id: readingListId,
      item_type,
      item_id,
      position,
      added_at: new Date().toISOString()
    };

    items.push(reading_list_item);
    this._saveToStorage('reading_list_items', items);

    const listIdx = lists.findIndex((l) => l.id === readingListId);
    if (listIdx !== -1) {
      const newCount = items.filter((i) => i.reading_list_id === readingListId).length;
      lists[listIdx].total_items = newCount;
      lists[listIdx].updated_at = new Date().toISOString();
      this._saveToStorage('reading_lists', lists);
    }

    return {
      success: true,
      reading_list_item,
      updated_total_items: items.filter((i) => i.reading_list_id === readingListId).length
    };
  }

  // getReadingListDetail(readingListId)
  getReadingListDetail(readingListId) {
    const lists = this._getFromStorage('reading_lists');
    const list = lists.find((l) => l.id === readingListId) || null;
    const items = this._getFromStorage('reading_list_items').filter(
      (i) => i.reading_list_id === readingListId
    );
    const trips = this._getFromStorage('trips');
    const dailyLogs = this._getFromStorage('daily_logs');

    items.sort((a, b) => (a.position || 0) - (b.position || 0));

    const detailedItems = items.map((i) => ({
      reading_list_item: i,
      item_type: i.item_type,
      trip: i.item_type === 'trip' ? trips.find((t) => t.id === i.item_id) || null : null,
      daily_log:
        i.item_type === 'daily_log'
          ? dailyLogs.find((d) => d.id === i.item_id) || null
          : null
    }));

    return {
      reading_list: list,
      items: detailedItems
    };
  }

  // renameReadingList(readingListId, name)
  renameReadingList(readingListId, name) {
    const lists = this._getFromStorage('reading_lists');
    const idx = lists.findIndex((l) => l.id === readingListId);
    if (idx === -1) {
      return { reading_list: null };
    }
    lists[idx].name = name;
    lists[idx].updated_at = new Date().toISOString();
    this._saveToStorage('reading_lists', lists);
    return { reading_list: lists[idx] };
  }

  // deleteReadingList(readingListId)
  deleteReadingList(readingListId) {
    const lists = this._getFromStorage('reading_lists');
    const items = this._getFromStorage('reading_list_items');

    const newLists = lists.filter((l) => l.id !== readingListId);
    const newItems = items.filter((i) => i.reading_list_id !== readingListId);

    this._saveToStorage('reading_lists', newLists);
    this._saveToStorage('reading_list_items', newItems);

    return { success: newLists.length !== lists.length };
  }

  // removeReadingListItem(readingListItemId)
  removeReadingListItem(readingListItemId) {
    const items = this._getFromStorage('reading_list_items');
    const lists = this._getFromStorage('reading_lists');

    const idx = items.findIndex((i) => i.id === readingListItemId);
    if (idx === -1) {
      return { success: false, updated_total_items: 0 };
    }
    const listId = items[idx].reading_list_id;
    items.splice(idx, 1);
    this._saveToStorage('reading_list_items', items);

    const listIdx = lists.findIndex((l) => l.id === listId);
    let updated_total_items = 0;
    if (listIdx !== -1) {
      updated_total_items = items.filter((i) => i.reading_list_id === listId).length;
      lists[listIdx].total_items = updated_total_items;
      lists[listIdx].updated_at = new Date().toISOString();
      this._saveToStorage('reading_lists', lists);
    }

    return { success: true, updated_total_items };
  }

  // searchTripsAndLogs(query, filters, sort_by, page, page_size)
  searchTripsAndLogs(query, filters, sort_by, page, page_size) {
    const trips = this._getFromStorage('trips');
    const dailyLogs = this._getFromStorage('daily_logs');

    const combined = this._applyTripAndLogSearchFilters(
      trips,
      dailyLogs,
      query,
      filters,
      sort_by
    );

    const pagination = this._paginate(combined, page, page_size);

    return {
      items: pagination.items,
      total_count: pagination.total_count,
      page: pagination.page,
      page_size: pagination.page_size
    };
  }

  // getDailyLogFilterOptions()
  getDailyLogFilterOptions() {
    const dailyLogs = this._getFromStorage('daily_logs');
    const chargingNetworks = this._getFromStorage('charging_networks');

    const countriesSet = new Set();
    let minDist = Infinity;
    let maxDist = -Infinity;
    let minCost = Infinity;
    let maxCost = -Infinity;
    let minCons = Infinity;
    let maxCons = -Infinity;

    dailyLogs.forEach((d) => {
      if (d.country) countriesSet.add(d.country);
      if (typeof d.distance_km === 'number') {
        minDist = Math.min(minDist, d.distance_km);
        maxDist = Math.max(maxDist, d.distance_km);
      }
      if (typeof d.total_charging_cost_eur === 'number') {
        minCost = Math.min(minCost, d.total_charging_cost_eur);
        maxCost = Math.max(maxCost, d.total_charging_cost_eur);
      }
      if (typeof d.energy_consumption_kwh_per_100km === 'number') {
        minCons = Math.min(minCons, d.energy_consumption_kwh_per_100km);
        maxCons = Math.max(maxCons, d.energy_consumption_kwh_per_100km);
      }
    });

    if (!isFinite(minDist)) minDist = 0;
    if (!isFinite(maxDist)) maxDist = 0;
    if (!isFinite(minCost)) minCost = 0;
    if (!isFinite(maxCost)) maxCost = 0;
    if (!isFinite(minCons)) minCons = 0;
    if (!isFinite(maxCons)) maxCons = 0;

    return {
      countries: Array.from(countriesSet).sort(),
      charging_networks: chargingNetworks,
      default_distance_min_km: minDist,
      default_distance_max_km: maxDist,
      default_cost_min_eur: minCost,
      default_cost_max_eur: maxCost,
      default_consumption_min_kwh_per_100km: minCons,
      default_consumption_max_kwh_per_100km: maxCons
    };
  }

  // getDailyLogs(filters, sort_by, page, page_size)
  getDailyLogs(filters, sort_by, page, page_size) {
    const dailyLogs = this._getFromStorage('daily_logs');
    const networks = this._getFromStorage('charging_networks');
    const f = filters || {};

    // Instrumentation for task completion tracking (task_4 Ionity/Fastned price filter params)
    try {
      if (
        filters &&
        sort_by === 'avg_price_per_kwh_lowest_first' &&
        filters.charging_network_code
      ) {
        const ionityNetwork = networks.find((n) => n.name === 'Ionity');
        const fastnedNetwork = networks.find((n) => n.name === 'Fastned');

        if (ionityNetwork && filters.charging_network_code === ionityNetwork.code) {
          localStorage.setItem(
            'task4_ionityPriceFilterParams',
            JSON.stringify({
              charging_network_code: filters.charging_network_code,
              sort_by,
              filters
            })
          );
        }

        if (fastnedNetwork && filters.charging_network_code === fastnedNetwork.code) {
          localStorage.setItem(
            'task4_fastnedPriceFilterParams',
            JSON.stringify({
              charging_network_code: filters.charging_network_code,
              sort_by,
              filters
            })
          );
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (getDailyLogs):', e);
      } catch (e2) {}
    }

    const minDist = typeof f.min_distance_km === 'number' ? f.min_distance_km : null;
    const maxDist = typeof f.max_distance_km === 'number' ? f.max_distance_km : null;
    const minCost = typeof f.min_total_charging_cost_eur === 'number'
      ? f.min_total_charging_cost_eur
      : null;
    const maxCost = typeof f.max_total_charging_cost_eur === 'number'
      ? f.max_total_charging_cost_eur
      : null;
    const minCons = typeof f.min_energy_consumption_kwh_per_100km === 'number'
      ? f.min_energy_consumption_kwh_per_100km
      : null;
    const maxCons = typeof f.max_energy_consumption_kwh_per_100km === 'number'
      ? f.max_energy_consumption_kwh_per_100km
      : null;

    const startDate = f.start_date ? this._parseDate(f.start_date) : null;
    const endDate = f.end_date ? this._parseDate(f.end_date) : null;

    let filtered = dailyLogs.filter((d) => {
      if (f.country && d.country !== f.country) return false;
      if (f.charging_network_code && d.primary_charging_network !== f.charging_network_code) {
        return false;
      }

      const dDate = this._parseDate(d.date);
      if (startDate && (!dDate || dDate < startDate)) return false;
      if (endDate && (!dDate || dDate > endDate)) return false;

      if (minDist != null && typeof d.distance_km === 'number' && d.distance_km < minDist) return false;
      if (maxDist != null && typeof d.distance_km === 'number' && d.distance_km > maxDist) return false;

      if (
        minCost != null &&
        typeof d.total_charging_cost_eur === 'number' &&
        d.total_charging_cost_eur < minCost
      )
        return false;
      if (
        maxCost != null &&
        typeof d.total_charging_cost_eur === 'number' &&
        d.total_charging_cost_eur > maxCost
      )
        return false;

      if (
        minCons != null &&
        typeof d.energy_consumption_kwh_per_100km === 'number' &&
        d.energy_consumption_kwh_per_100km < minCons
      )
        return false;
      if (
        maxCons != null &&
        typeof d.energy_consumption_kwh_per_100km === 'number' &&
        d.energy_consumption_kwh_per_100km > maxCons
      )
        return false;

      return true;
    });

    const sortMode = sort_by || 'date_newest_first';

    filtered.sort((a, b) => {
      switch (sortMode) {
        case 'date_oldest_first':
          return this._compareDatesAsc(a.date, b.date);
        case 'avg_price_per_kwh_lowest_first': {
          const pa = typeof a.avg_price_per_kwh === 'number' ? a.avg_price_per_kwh : Infinity;
          const pb = typeof b.avg_price_per_kwh === 'number' ? b.avg_price_per_kwh : Infinity;
          return pa - pb;
        }
        case 'avg_price_per_kwh_highest_first': {
          const pa2 = typeof a.avg_price_per_kwh === 'number' ? a.avg_price_per_kwh : -Infinity;
          const pb2 = typeof b.avg_price_per_kwh === 'number' ? b.avg_price_per_kwh : -Infinity;
          return pb2 - pa2;
        }
        case 'distance_desc':
          return (b.distance_km || 0) - (a.distance_km || 0);
        case 'date_newest_first':
        default:
          return this._compareDatesDesc(a.date, b.date);
      }
    });

    const pagination = this._paginate(filtered, page, page_size);

    const items = pagination.items.map((d) => ({
      daily_log: d,
      primary_charging_network_details:
        networks.find((n) => n.code === d.primary_charging_network) || null
    }));

    return {
      items,
      total_count: pagination.total_count,
      page: pagination.page,
      page_size: pagination.page_size
    };
  }

  // getDailyLogDetail(dailyLogId)
  getDailyLogDetail(dailyLogId) {
    const dailyLogs = this._getFromStorage('daily_logs');
    const daily_log = dailyLogs.find((d) => d.id === dailyLogId) || null;

    const chargingStops = this._getFromStorage('charging_stops').filter(
      (cs) => cs.parent_type === 'daily_log' && cs.parent_id === dailyLogId
    );
    const chargers = this._getFromStorage('chargers');
    const networks = this._getFromStorage('charging_networks');

    const charging_stops = chargingStops.map((cs) => ({
      charging_stop: cs,
      charger: chargers.find((ch) => ch.id === cs.charger_id) || null
    }));

    const primary_charging_network_details = daily_log
      ? networks.find((n) => n.code === daily_log.primary_charging_network) || null
      : null;

    // Instrumentation for task completion tracking (task_4 comparedDailyLogIds)
    try {
      if (daily_log && daily_log.primary_charging_network) {
        const ionityNetwork = networks.find((n) => n.name === 'Ionity');
        const fastnedNetwork = networks.find((n) => n.name === 'Fastned');

        const ionityCode = ionityNetwork && ionityNetwork.code;
        const fastnedCode = fastnedNetwork && fastnedNetwork.code;
        const networkCode = daily_log.primary_charging_network;

        if (networkCode === ionityCode || networkCode === fastnedCode) {
          let existing = {};
          try {
            const raw = localStorage.getItem('task4_comparedDailyLogIds');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object') {
                existing = parsed;
              }
            }
          } catch (e2) {
            existing = {};
          }

          if (!Object.prototype.hasOwnProperty.call(existing, networkCode)) {
            existing[networkCode] = daily_log.id;
            localStorage.setItem('task4_comparedDailyLogIds', JSON.stringify(existing));
          }
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (getDailyLogDetail):', e);
      } catch (e2) {}
    }

    return {
      daily_log,
      charging_stops,
      primary_charging_network_details
    };
  }

  // createRoutePlan(origin_name, destination_name)
  createRoutePlan(origin_name, destination_name) {
    const routePlans = this._getFromStorage('route_plans');
    const now = new Date().toISOString();

    const route_plan = {
      id: this._generateId('route_plan'),
      origin_name,
      destination_name,
      distance_km: null,
      estimated_time_hours: null,
      created_at: now
    };

    routePlans.push(route_plan);
    this._saveToStorage('route_plans', routePlans);

    return { route_plan };
  }

  // getChargersAlongRoute(routePlanId, min_power_kw, charger_types)
  getChargersAlongRoute(routePlanId, min_power_kw, charger_types) {
    const routePlans = this._getFromStorage('route_plans');
    const route_plan = routePlans.find((rp) => rp.id === routePlanId) || null;
    if (!route_plan) return [];

    return this._getChargersAlongRouteGeometry(route_plan, min_power_kw, charger_types);
  }

  // createTripNoteForCharger(chargerId, routePlanId, note_text)
  createTripNoteForCharger(chargerId, routePlanId, note_text) {
    const tripNotes = this._getFromStorage('trip_notes');
    const now = new Date().toISOString();

    const trip_note = {
      id: this._generateId('trip_note'),
      charger_id: chargerId,
      route_plan_id: routePlanId,
      note_text,
      created_at: now,
      updated_at: now
    };

    tripNotes.push(trip_note);
    this._saveToStorage('trip_notes', tripNotes);

    return { trip_note };
  }

  // getTripNotesOverview(routePlanId)
  getTripNotesOverview(routePlanId) {
    const tripNotes = this._getFromStorage('trip_notes');
    const chargers = this._getFromStorage('chargers');
    const routePlans = this._getFromStorage('route_plans');

    const notesFiltered = routePlanId
      ? tripNotes.filter((tn) => tn.route_plan_id === routePlanId)
      : tripNotes;

    const trip_notes = notesFiltered.map((tn) => ({
      trip_note: tn,
      charger: chargers.find((ch) => ch.id === tn.charger_id) || null,
      route_plan: routePlans.find((rp) => rp.id === tn.route_plan_id) || null
    }));

    return { trip_notes };
  }

  // updateTripNote(tripNoteId, note_text)
  updateTripNote(tripNoteId, note_text) {
    const tripNotes = this._getFromStorage('trip_notes');
    const idx = tripNotes.findIndex((tn) => tn.id === tripNoteId);
    if (idx === -1) {
      return { trip_note: null };
    }
    tripNotes[idx].note_text = note_text;
    tripNotes[idx].updated_at = new Date().toISOString();
    this._saveToStorage('trip_notes', tripNotes);
    return { trip_note: tripNotes[idx] };
  }

  // deleteTripNote(tripNoteId)
  deleteTripNote(tripNoteId) {
    const tripNotes = this._getFromStorage('trip_notes');
    const newNotes = tripNotes.filter((tn) => tn.id !== tripNoteId);
    this._saveToStorage('trip_notes', newNotes);
    return { success: newNotes.length !== tripNotes.length };
  }

  // getTagList(search_query)
  getTagList(search_query) {
    const tags = this._getFromStorage('tags');
    const assignments = this._getFromStorage('tag_assignments');

    const q = this._normalizeString(search_query || '');

    const filteredTags = tags.filter((tag) => {
      if (!q) return true;
      return this._normalizeString(tag.name).includes(q);
    });

    const result = filteredTags.map((tag) => ({
      tag,
      post_count: assignments.filter((ta) => ta.tag_id === tag.id).length
    }));

    return { tags: result };
  }

  // getTagDetail(tagSlug)
  getTagDetail(tagSlug) {
    const tags = this._getFromStorage('tags');
    const assignments = this._getFromStorage('tag_assignments');

    const tag = tags.find((t) => t.slug === tagSlug) || null;
    const total_post_count = tag
      ? assignments.filter((ta) => ta.tag_id === tag.id).length
      : 0;

    return { tag, total_post_count };
  }

  // getTaggedPosts(tagId, filters, sort_by, page, page_size)
  getTaggedPosts(tagId, filters, sort_by, page, page_size) {
    const assignments = this._getFromStorage('tag_assignments').filter(
      (ta) => ta.tag_id === tagId
    );
    const trips = this._getFromStorage('trips');
    const dailyLogs = this._getFromStorage('daily_logs');

    const f = filters || {};
    const startDate = f.start_date ? this._parseDate(f.start_date) : null;
    const endDate = f.end_date ? this._parseDate(f.end_date) : null;
    const maxCons = typeof f.max_energy_consumption_kwh_per_100km === 'number'
      ? f.max_energy_consumption_kwh_per_100km
      : null;

    // Instrumentation for task completion tracking (task_5 winterEfficiencyFilterParams)
    try {
      const tags = this._getFromStorage('tags') || [];
      const winterTag = tags.find((t) => t.name === 'Winter Efficiency');

      if (
        winterTag &&
        tagId === winterTag.id &&
        filters &&
        typeof filters.max_energy_consumption_kwh_per_100km === 'number' &&
        startDate &&
        endDate
      ) {
        const windowStart = new Date('2022-12-01T00:00:00Z');
        const windowEnd = new Date('2024-02-29T23:59:59Z');

        if (startDate <= windowStart && endDate >= windowEnd) {
          localStorage.setItem(
            'task5_winterEfficiencyFilterParams',
            JSON.stringify({
              tag_id: tagId,
              filters,
              sort_by
            })
          );
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (getTaggedPosts):', e);
      } catch (e2) {}
    }

    const itemsRaw = [];

    assignments.forEach((ta) => {
      if (ta.post_type === 'trip') {
        const t = trips.find((tr) => tr.id === ta.post_id);
        if (!t) return;
        const d = this._parseDate(t.primary_date);
        if (startDate && (!d || d < startDate)) return;
        if (endDate && (!d || d > endDate)) return;
        if (
          maxCons != null &&
          typeof t.energy_consumption_kwh_per_100km === 'number' &&
          t.energy_consumption_kwh_per_100km > maxCons
        )
          return;
        itemsRaw.push({ item_type: 'trip', trip: t, daily_log: null });
      } else if (ta.post_type === 'daily_log') {
        const dlog = dailyLogs.find((dl) => dl.id === ta.post_id);
        if (!dlog) return;
        const dDate = this._parseDate(dlog.date);
        if (startDate && (!dDate || dDate < startDate)) return;
        if (endDate && (!dDate || dDate > endDate)) return;
        if (
          maxCons != null &&
          typeof dlog.energy_consumption_kwh_per_100km === 'number' &&
          dlog.energy_consumption_kwh_per_100km > maxCons
        )
          return;
        itemsRaw.push({ item_type: 'daily_log', trip: null, daily_log: dlog });
      }
    });

    const sortMode = sort_by || 'date_newest_first';

    itemsRaw.sort((a, b) => {
      const dateA = a.item_type === 'trip' ? a.trip.primary_date : a.daily_log.date;
      const dateB = b.item_type === 'trip' ? b.trip.primary_date : b.daily_log.date;
      if (sortMode === 'date_oldest_first') {
        return this._compareDatesAsc(dateA, dateB);
      }
      // default newest first
      return this._compareDatesDesc(dateA, dateB);
    });

    const pagination = this._paginate(itemsRaw, page, page_size);

    return {
      items: pagination.items,
      total_count: pagination.total_count
    };
  }

  // createTagSubscription(tagId, email, frequency, only_temps_below_minus5c)
  createTagSubscription(tagId, email, frequency, only_temps_below_minus5c) {
    const subs = this._getFromStorage('tag_subscriptions');
    const now = new Date().toISOString();

    const tag_subscription = {
      id: this._generateId('tag_subscription'),
      tag_id: tagId,
      email,
      frequency,
      only_temps_below_minus5c: !!only_temps_below_minus5c,
      created_at: now
    };

    subs.push(tag_subscription);
    this._saveToStorage('tag_subscriptions', subs);

    return { tag_subscription };
  }

  // getFaqArticleList(category)
  getFaqArticleList(category) {
    const articles = this._getFromStorage('faq_articles').filter((a) => a.is_published);
    const filtered = category
      ? articles.filter((a) => a.category === category)
      : articles;
    return { articles: filtered };
  }

  // searchFaqArticles(query)
  searchFaqArticles(query) {
    const articles = this._getFromStorage('faq_articles').filter((a) => a.is_published);
    const q = this._normalizeString(query || '');
    const filtered = q
      ? articles.filter((a) => {
          const inTitle = this._normalizeString(a.title).includes(q);
          const inContent = this._normalizeString(a.content).includes(q);
          return inTitle || inContent;
        })
      : articles;
    return { articles: filtered };
  }

  // getFaqArticle(articleId)
  getFaqArticle(articleId) {
    const articles = this._getFromStorage('faq_articles');
    const faq_article = articles.find((a) => a.id === articleId) || null;
    return { faq_article };
  }

  // getProfileSettings()
  getProfileSettings() {
    const profile = this._getOrCreateProfileSettings();
    const vehicleModels = this._getFromStorage('vehicle_models');
    const networks = this._getFromStorage('charging_networks');

    const vehicle_model = profile.vehicle_model_id
      ? vehicleModels.find((vm) => vm.id === profile.vehicle_model_id) || null
      : null;

    const preferred_charging_network_details = profile.preferred_charging_network
      ? networks.find((n) => n.code === profile.preferred_charging_network) || null
      : null;

    return {
      profile_settings: profile,
      vehicle_model,
      preferred_charging_network_details
    };
  }

  // getVehicleModelOptions()
  getVehicleModelOptions() {
    const vehicle_models = this._getFromStorage('vehicle_models');
    return { vehicle_models };
  }

  // getChargingNetworkOptions()
  getChargingNetworkOptions() {
    const charging_networks = this._getFromStorage('charging_networks');
    return { charging_networks };
  }

  // updateProfileSettings(...)
  updateProfileSettings(
    preferred_charging_network,
    vehicle_model_id,
    preferred_ac_charging_limit_kw,
    use_ac_limit_for_suggestions
  ) {
    let profiles = this._getFromStorage('profile_settings');
    if (!Array.isArray(profiles) || profiles.length === 0) {
      this._getOrCreateProfileSettings();
      profiles = this._getFromStorage('profile_settings');
    }

    const profile = profiles[0];

    if (typeof preferred_charging_network !== 'undefined' && preferred_charging_network !== null) {
      profile.preferred_charging_network = preferred_charging_network;
    }
    if (typeof vehicle_model_id !== 'undefined' && vehicle_model_id !== null) {
      profile.vehicle_model_id = vehicle_model_id;
    }
    if (
      typeof preferred_ac_charging_limit_kw !== 'undefined' &&
      preferred_ac_charging_limit_kw !== null
    ) {
      profile.preferred_ac_charging_limit_kw = preferred_ac_charging_limit_kw;
    }
    if (typeof use_ac_limit_for_suggestions !== 'undefined' && use_ac_limit_for_suggestions !== null) {
      profile.use_ac_limit_for_suggestions = !!use_ac_limit_for_suggestions;
    }

    profile.updated_at = new Date().toISOString();
    profiles[0] = profile;
    this._saveToStorage('profile_settings', profiles);

    // Instrumentation for task completion tracking (task_4 preferenceSetFromComparison)
    try {
      if (
        typeof preferred_charging_network !== 'undefined' &&
        preferred_charging_network !== null
      ) {
        const networks = this._getFromStorage('charging_networks') || [];
        const ionityNetwork = networks.find((n) => n.name === 'Ionity');
        const fastnedNetwork = networks.find((n) => n.name === 'Fastned');

        const ionityCode = ionityNetwork && ionityNetwork.code;
        const fastnedCode = fastnedNetwork && fastnedNetwork.code;

        if (
          ionityCode &&
          fastnedCode &&
          (preferred_charging_network === ionityCode ||
            preferred_charging_network === fastnedCode)
        ) {
          let compared = null;
          try {
            const raw = localStorage.getItem('task4_comparedDailyLogIds');
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed === 'object') {
                compared = parsed;
              }
            }
          } catch (e2) {
            compared = null;
          }

          if (
            compared &&
            Object.prototype.hasOwnProperty.call(compared, ionityCode) &&
            Object.prototype.hasOwnProperty.call(compared, fastnedCode)
          ) {
            localStorage.setItem('task4_preferenceSetFromComparison', 'true');
          }
        }
      }
    } catch (e) {
      try {
        console.error('Instrumentation error (updateProfileSettings):', e);
      } catch (e2) {}
    }

    return {
      success: true,
      profile_settings: profile
    };
  }

  // getAboutContent()
  getAboutContent() {
    // Attempt to read from storage; if missing or invalid, return minimal defaults
    const raw = localStorage.getItem('about_content');
    if (raw) {
      try {
        const data = JSON.parse(raw);
        return {
          title: data.title || '',
          body: data.body || '',
          contact_email: data.contact_email || '',
          disclaimers: Array.isArray(data.disclaimers) ? data.disclaimers : [],
          last_updated: data.last_updated || ''
        };
      } catch (e) {
        // fall through to defaults
      }
    }

    return {
      title: '',
      body: '',
      contact_email: '',
      disclaimers: [],
      last_updated: ''
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
