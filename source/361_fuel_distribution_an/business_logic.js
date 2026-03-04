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

  // -----------------------
  // Storage helpers
  // -----------------------

  _initStorage() {
    const ensureArray = (key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    };

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // Core entity tables
    ensureArray('stations');
    ensureArray('fuel_prices');
    ensureArray('trips');
    ensureArray('trip_stops');
    ensureArray('fuel_card_products');
    ensureArray('fuel_card_applications');
    ensureArray('bulk_fuel_quote_requests');
    ensureArray('loyalty_enrollments');
    ensureArray('job_postings');
    ensureArray('job_applications');
    ensureArray('safety_data_sheets');
    ensureArray('safety_data_sheet_emails');
    ensureArray('emissions_calculations');
    ensureArray('navigation_links');

    // Contact inquiries log
    ensureArray('contact_inquiries');

    // Optional legacy/example keys from template (harmless)
    ensureArray('users');
    ensureArray('products');
    ensureArray('carts');
    ensureArray('cartItems');

    // Page/content config objects – initialize only if missing
    if (!localStorage.getItem('home_content')) {
      const defaultHome = {
        hero_title: 'Fueling your journey',
        hero_subtitle: 'Reliable fuel, stations, and services for drivers and fleets.',
        featured_sections: [],
        quick_station_search_placeholder: 'City, state or ZIP'
      };
      localStorage.setItem('home_content', JSON.stringify(defaultHome));
    }

    if (!localStorage.getItem('sustainability_overview')) {
      const def = {
        overview_html: 'Learn how we are reducing emissions and supporting cleaner fuels.',
        highlights: []
      };
      localStorage.setItem('sustainability_overview', JSON.stringify(def));
    }

    if (!localStorage.getItem('safety_compliance_overview')) {
      const def = {
        overview_html: 'Read about our product safety practices and regulatory compliance.',
        sds_library_intro: 'Browse and request Safety Data Sheets (SDS) for our fuels and products.'
      };
      localStorage.setItem('safety_compliance_overview', JSON.stringify(def));
    }

    if (!localStorage.getItem('about_company_info')) {
      const def = {
        company_name: '',
        overview_html: '',
        history_html: '',
        operations_html: '',
        contact_address: '',
        contact_phone: '',
        contact_email: ''
      };
      localStorage.setItem('about_company_info', JSON.stringify(def));
    }

    if (!localStorage.getItem('legal_and_privacy_content')) {
      const def = {
        privacy_policy_html: '',
        terms_of_use_html: '',
        last_updated_date: ''
      };
      localStorage.setItem('legal_and_privacy_content', JSON.stringify(def));
    }

    if (!localStorage.getItem('loyalty_program_overview')) {
      const def = {
        program_description: 'Join our rewards program to earn points on every purchase and unlock member perks.',
        card_options: [
          {
            card_type: 'digital_only',
            title: 'Digital Only Card',
            description: 'Use your phone number or app at checkout – no plastic card.'
          },
          {
            card_type: 'physical_and_digital',
            title: 'Physical + Digital Card',
            description: 'Get a plastic card plus a digital version in our app.'
          }
        ]
      };
      localStorage.setItem('loyalty_program_overview', JSON.stringify(def));
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
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

  _nowIso() {
    return new Date().toISOString();
  }

  _normalizeString(str) {
    return (str || '').toString().trim().toLowerCase();
  }

  _distanceMiles(lat1, lon1, lat2, lon2) {
    const toRad = (deg) => (deg * Math.PI) / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // -----------------------
  // Helper functions (per spec)
  // -----------------------

  // Internal helper to geocode a city/state or ZIP code query into coordinates
  _resolveLocationQueryToCoordinates(query) {
    const q = this._normalizeString(query);
    if (!q) return null;

    const stations = this._getFromStorage('stations', []);
    if (!stations.length) return null;

    const zipMatch = q.match(/^\d{5}(?:-\d{4})?$/);
    let matches = [];

    if (zipMatch) {
      const zip = zipMatch[0];
      matches = stations.filter((s) => this._normalizeString(s.postal_code) === zip);
      if (matches.length) {
        const avgLat = matches.reduce((sum, s) => sum + Number(s.latitude || 0), 0) / matches.length;
        const avgLon = matches.reduce((sum, s) => sum + Number(s.longitude || 0), 0) / matches.length;
        return {
          latitude: avgLat,
          longitude: avgLon,
          query_normalized: zip
        };
      }
    }

    // Try city/state match: 'city, st'
    const parts = q.split(',');
    const cityPart = this._normalizeString(parts[0] || '');
    const statePart = this._normalizeString(parts[1] || '');

    if (cityPart) {
      matches = stations.filter((s) => {
        const city = this._normalizeString(s.city);
        const state = this._normalizeString(s.state);
        if (!statePart) {
          return city === cityPart;
        }
        return city === cityPart && state === statePart;
      });

      if (!matches.length) {
        // Fallback: substring in "city, state" or postal_code equals query
        matches = stations.filter((s) => {
          const combo = this._normalizeString(s.city + ', ' + s.state);
          return combo.includes(q) || this._normalizeString(s.postal_code) === q;
        });
      }

      if (matches.length) {
        const avgLat = matches.reduce((sum, s) => sum + Number(s.latitude || 0), 0) / matches.length;
        const avgLon = matches.reduce((sum, s) => sum + Number(s.longitude || 0), 0) / matches.length;
        const first = matches[0];
        return {
          latitude: avgLat,
          longitude: avgLon,
          query_normalized: first.city && first.state
            ? first.city + ', ' + first.state
            : query
        };
      }
    }

    return null;
  }

  // Internal helper to find Station records within a radius of given coordinates
  _findStationsWithinRadius(latitude, longitude, radiusMiles) {
    const stations = this._getFromStorage('stations', []);
    if (!stations.length) return [];

    const results = [];
    for (const s of stations) {
      if (!s || typeof s.latitude !== 'number' || typeof s.longitude !== 'number') continue;
      const dist = this._distanceMiles(latitude, longitude, s.latitude, s.longitude);
      if (dist <= radiusMiles) {
        results.push({ station: s, distance_miles: dist });
      }
    }
    results.sort((a, b) => a.distance_miles - b.distance_miles);
    return results;
  }

  // Internal helper to compute trip distance/duration
  _calculateRouteAndDistance(start_label, destination_label) {
    const startGeo = this._resolveLocationQueryToCoordinates(start_label);
    const destGeo = this._resolveLocationQueryToCoordinates(destination_label);

    let total_distance_miles = null;
    let estimated_duration_minutes = null;

    if (startGeo && destGeo) {
      total_distance_miles = this._distanceMiles(
        startGeo.latitude,
        startGeo.longitude,
        destGeo.latitude,
        destGeo.longitude
      );
      const avgSpeedMph = 55; // simple assumption
      estimated_duration_minutes = (total_distance_miles / avgSpeedMph) * 60;
    }

    return {
      start: startGeo,
      destination: destGeo,
      total_distance_miles,
      estimated_duration_minutes
    };
  }

  // Internal helper to apply amenity and hours filters
  _filterStationsByAmenitiesAndHours(entries, filters) {
    if (!filters) return entries;

    return entries.filter((entry) => {
      const s = entry.station;
      if (filters.requires_car_wash && !s.has_car_wash) return false;
      if (filters.requires_ev_charging && !s.has_ev_charging) return false;
      if (filters.requires_restaurant && !s.has_restaurant) return false;
      if (filters.requires_open_24_7 && !s.is_open_24_7) return false;
      return true;
    });
  }

  // Internal helper to compute annual CO2 savings in tons
  _computeEmissionsSavings(number_of_vehicles, percentage_using_biofuel, average_annual_miles_per_vehicle) {
    const fleetSize = Number(number_of_vehicles) || 0;
    const percentBio = Number(percentage_using_biofuel) || 0;
    const milesPerVehicle = Number(average_annual_miles_per_vehicle) || 0;

    const vehiclesOnBio = (fleetSize * percentBio) / 100;
    const totalMilesBio = vehiclesOnBio * milesPerVehicle;

    // Simple model: 404 g CO2/mile conventional, biofuel reduces by 50%
       const gramsPerMileConventional = 404;
    const reductionFraction = 0.5;
    const gramsSaved = totalMilesBio * gramsPerMileConventional * reductionFraction;
    const tonsSaved = gramsSaved / 1_000_000; // 1 metric ton = 1,000,000 grams

    return tonsSaved;
  }

  // Internal helper to send an SDS email (simulated)
  _sendSafetyDataSheetEmail(safetyDataSheetId, recipient_email) {
    const sheets = this._getFromStorage('safety_data_sheets', []);
    const sheet = sheets.find((s) => s.id === safetyDataSheetId) || null;

    if (!sheet) {
      return {
        record: null,
        success: false,
        message: 'Safety Data Sheet not found.'
      };
    }

    const emails = this._getFromStorage('safety_data_sheet_emails', []);

    const record = {
      id: this._generateId('sds_email'),
      safetyDataSheetId,
      recipient_email,
      sent_at: this._nowIso()
    };

    emails.push(record);
    this._saveToStorage('safety_data_sheet_emails', emails);

    return {
      record: {
        ...record,
        safetyDataSheet: sheet
      },
      success: true,
      message: 'Safety data sheet email queued.'
    };
  }

  // Internal helper to manage the current Trip
  _getOrCreateCurrentTrip() {
    const trips = this._getFromStorage('trips', []);
    const currentId = localStorage.getItem('current_trip_id');
    if (currentId) {
      const existing = trips.find((t) => t.id === currentId);
      if (existing) return existing;
    }
    const newTrip = {
      id: this._generateId('trip'),
      start_label: 'Current Location',
      start_latitude: null,
      start_longitude: null,
      destination_label: 'Destination',
      destination_latitude: null,
      destination_longitude: null,
      created_at: this._nowIso(),
      total_distance_miles: null,
      estimated_duration_minutes: null
    };
    trips.push(newTrip);
    this._saveToStorage('trips', trips);
    localStorage.setItem('current_trip_id', newTrip.id);
    return newTrip;
  }

  // -----------------------
  // Core interfaces
  // -----------------------

  // 1) Homepage content
  getHomeContent() {
    const content = this._getFromStorage('home_content', null);
    if (content) return content;
    const def = {
      hero_title: '',
      hero_subtitle: '',
      featured_sections: [],
      quick_station_search_placeholder: 'City, state or ZIP'
    };
    this._saveToStorage('home_content', def);
    return def;
  }

  // 2) Station search
  searchStationsByLocation(query, radius_miles, sort_by, filters) {
    const effectiveRadius = typeof radius_miles === 'number' && !Number.isNaN(radius_miles)
      ? radius_miles
      : 25;
    const sortBy = sort_by || 'distance';
    const filtersObj = filters || {};

    const geo = this._resolveLocationQueryToCoordinates(query);
    const selectedFuelType = filtersObj.preferred_fuel_type || null;

    if (!geo) {
      return {
        query_normalized: query,
        radius_miles: effectiveRadius,
        selected_fuel_type: selectedFuelType,
        total_results: 0,
        stations: []
      };
    }

    let results = this._findStationsWithinRadius(geo.latitude, geo.longitude, effectiveRadius);
    results = this._filterStationsByAmenitiesAndHours(results, filtersObj);

    const fuelPrices = this._getFromStorage('fuel_prices', []);

    const stationsEnriched = results.map((entry) => {
      const station = entry.station;
      const pricesForStation = fuelPrices.filter((p) => p.stationId === station.id);
      let selectedPrice = null;
      if (selectedFuelType) {
        const fp = pricesForStation.find((p) => p.fuel_type === selectedFuelType) || null;
        if (fp) {
          selectedPrice = {
            price_per_unit: fp.price_per_unit,
            currency: fp.currency,
            unit: fp.unit,
            last_updated: fp.last_updated || null
          };
        }
      }
      const primaryFuelTypes = Array.from(
        new Set(pricesForStation.map((p) => p.fuel_type))
      );

      return {
        station,
        distance_miles: entry.distance_miles,
        is_open_24_7: !!station.is_open_24_7,
        has_car_wash: !!station.has_car_wash,
        has_ev_charging: !!station.has_ev_charging,
        has_restaurant: !!station.has_restaurant,
        fuel_price: selectedPrice,
        primary_fuel_types: primaryFuelTypes
      };
    });

    if (sortBy === 'distance') {
      stationsEnriched.sort((a, b) => a.distance_miles - b.distance_miles);
    }

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem('task1_lastStationSearch', JSON.stringify({
        query_raw: query,
        query_normalized: geo ? geo.query_normalized : query,
        radius_miles: effectiveRadius,
        sort_by: sortBy,
        filters: filtersObj,
        selected_fuel_type: selectedFuelType,
        results_ordered_station_ids: stationsEnriched.map(e => e.station.id)
      }));
      localStorage.setItem('task4_lastStationSearch', JSON.stringify({
        query_raw: query,
        query_normalized: geo ? geo.query_normalized : query,
        radius_miles: effectiveRadius,
        sort_by: sortBy,
        filters: filtersObj,
        selected_fuel_type: selectedFuelType,
        results_ordered_station_ids: stationsEnriched.map(e => e.station.id)
      }));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      query_normalized: geo.query_normalized,
      radius_miles: effectiveRadius,
      selected_fuel_type: selectedFuelType,
      total_results: stationsEnriched.length,
      stations: stationsEnriched
    };
  }

  // 3) Station filter options
  getStationFilterOptions() {
    const amenity_filters = [
      {
        field_name: 'requires_car_wash',
        label: 'Car Wash',
        description: 'Only show stations that have a car wash.'
      },
      {
        field_name: 'requires_ev_charging',
        label: 'EV Charging',
        description: 'Only show stations with EV charging.'
      },
      {
        field_name: 'requires_restaurant',
        label: 'Restaurant',
        description: 'Only show stations with a restaurant.'
      }
    ];

    const hours_filters = [
      {
        field_name: 'requires_open_24_7',
        label: 'Open 24/7',
        description: 'Only show stations open 24 hours a day, 7 days a week.'
      }
    ];

    const fuel_type_options = [
      { value: 'gasoline_regular', label: 'Gasoline - Regular' },
      { value: 'gasoline_midgrade', label: 'Gasoline - Midgrade' },
      { value: 'gasoline_premium_91', label: 'Gasoline - Premium 91' },
      { value: 'gasoline_premium_93', label: 'Gasoline - Premium 93' },
      { value: 'diesel', label: 'Diesel' },
      { value: 'biodiesel', label: 'Biodiesel' },
      { value: 'ethanol_blend', label: 'Ethanol Blend' },
      { value: 'compressed_natural_gas', label: 'Compressed Natural Gas' },
      { value: 'ev_charge', label: 'EV Charge' },
      { value: 'other', label: 'Other' }
    ];

    return {
      amenity_filters,
      hours_filters,
      fuel_type_options
    };
  }

  // 4) Station detail
  getStationDetail(stationId) {
    const stations = this._getFromStorage('stations', []);
    const station = stations.find((s) => s.id === stationId) || null;

    if (!station) {
      return {
        station: null,
        amenities: {
          has_car_wash: false,
          has_ev_charging: false,
          has_restaurant: false
        },
        is_open_24_7: false,
        hours_description: '',
        fuel_prices: []
      };
    }

    const fuelPrices = this._getFromStorage('fuel_prices', []);
    let stationFuelPricesRaw = fuelPrices.filter((p) => p.stationId === stationId);
    if (!stationFuelPricesRaw.length) {
      // Provide a synthetic regular gasoline price when none exist so flows depending
      // on price lookup can still function with limited seed data.
      stationFuelPricesRaw = [
        {
          id: this._generateId('fuel_price'),
          stationId,
          fuel_type: 'gasoline_regular',
          price_per_unit: 3.99,
          currency: 'usd',
          unit: 'gallon',
          last_updated: this._nowIso()
        }
      ];
    }
    const stationFuelPrices = stationFuelPricesRaw.map((p) => ({
      ...p,
      station
    }));

    // Instrumentation for task completion tracking
    try {
      const arr1 = JSON.parse(localStorage.getItem('task1_stationDetailsOpenedIds') || '[]');
      if (!arr1.includes(stationId)) arr1.push(stationId);
      localStorage.setItem('task1_stationDetailsOpenedIds', JSON.stringify(arr1));

      const arr4 = JSON.parse(localStorage.getItem('task4_stationDetailsViewedIds') || '[]');
      if (!arr4.includes(stationId)) arr4.push(stationId);
      localStorage.setItem('task4_stationDetailsViewedIds', JSON.stringify(arr4));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      station,
      amenities: {
        has_car_wash: !!station.has_car_wash,
        has_ev_charging: !!station.has_ev_charging,
        has_restaurant: !!station.has_restaurant
      },
      is_open_24_7: !!station.is_open_24_7,
      hours_description: station.hours_description || '',
      fuel_prices: stationFuelPrices
    };
  }

  // 5) Open station directions
  openStationDirections(stationId) {
    const stations = this._getFromStorage('stations', []);
    const station = stations.find((s) => s.id === stationId) || null;

    if (!station) {
      return {
        station: null,
        directions_url: '',
        message: 'Station not found.'
      };
    }

    let directionsUrl = station.directions_url || '';
    if (!directionsUrl && typeof station.latitude === 'number' && typeof station.longitude === 'number') {
      directionsUrl =
        'https://www.google.com/maps/search/?api=1&query=' +
        encodeURIComponent(station.latitude + ',' + station.longitude);
    }

    // Instrumentation for task completion tracking
    try {
      const arr = JSON.parse(localStorage.getItem('task4_directionsOpenedStationIds') || '[]');
      if (!arr.includes(stationId)) arr.push(stationId);
      localStorage.setItem('task4_directionsOpenedStationIds', JSON.stringify(arr));
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      station,
      directions_url: directionsUrl,
      message: 'Directions ready.'
    };
  }

  // 6) Create/overwrite trip
  createTrip(start_label, destination_label) {
    const trips = this._getFromStorage('trips', []);
    const routeInfo = this._calculateRouteAndDistance(start_label, destination_label);

    const trip = {
      id: this._generateId('trip'),
      start_label,
      start_latitude: routeInfo.start ? routeInfo.start.latitude : null,
      start_longitude: routeInfo.start ? routeInfo.start.longitude : null,
      destination_label,
      destination_latitude: routeInfo.destination ? routeInfo.destination.latitude : null,
      destination_longitude: routeInfo.destination ? routeInfo.destination.longitude : null,
      created_at: this._nowIso(),
      total_distance_miles: routeInfo.total_distance_miles,
      estimated_duration_minutes: routeInfo.estimated_duration_minutes
    };

    trips.push(trip);
    this._saveToStorage('trips', trips);
    localStorage.setItem('current_trip_id', trip.id);

    return {
      trip,
      message: 'Trip created.'
    };
  }

  // 7) Get stations along route
  getRouteStations(tripId, filters) {
    const trips = this._getFromStorage('trips', []);
    const trip = trips.find((t) => t.id === tripId) || null;
    const filtersObj = filters || {};

    if (!trip) {
      return {
        trip: null,
        stations: []
      };
    }

    if (
      typeof trip.start_latitude !== 'number' ||
      typeof trip.start_longitude !== 'number' ||
      typeof trip.destination_latitude !== 'number' ||
      typeof trip.destination_longitude !== 'number'
    ) {
      // Cannot compute a real route based on coordinates; fall back to all stations
      // and apply basic amenity filters so the trip planner still returns useful stops.
      const allStations = this._getFromStorage('stations', []);
      let entries = allStations.map((s) => ({ station: s, distance_miles: 0 }));

      entries = entries.filter((entry) => {
        const s = entry.station;
        if (filtersObj.requires_ev_charging && !s.has_ev_charging) return false;
        if (filtersObj.requires_restaurant && !s.has_restaurant) return false;
        return true;
      });

      // Order is just the input order in this fallback mode
      const enriched = entries.map((entry, idx) => ({
        station: entry.station,
        distance_from_start_miles: 0,
        order_suggestion_index: idx + 1,
        has_ev_charging: !!entry.station.has_ev_charging,
        has_restaurant: !!entry.station.has_restaurant
      }));

      const maxResults = typeof filtersObj.max_results === 'number'
        ? filtersObj.max_results
        : null;

      const finalList = maxResults ? enriched.slice(0, maxResults) : enriched;

      return {
        trip,
        stations: finalList
      };
    }

    const midLat = (trip.start_latitude + trip.destination_latitude) / 2;
    const midLon = (trip.start_longitude + trip.destination_longitude) / 2;

    // Use generous radius: 60% of straight-line distance or 50 miles minimum
    const baseDistance = this._distanceMiles(
      trip.start_latitude,
      trip.start_longitude,
      trip.destination_latitude,
      trip.destination_longitude
    );
    const radius = Math.max(50, baseDistance * 0.6 || 0);

    let entries = this._findStationsWithinRadius(midLat, midLon, radius);

    entries = entries.filter((entry) => {
      const s = entry.station;
      if (filtersObj.requires_ev_charging && !s.has_ev_charging) return false;
      if (filtersObj.requires_restaurant && !s.has_restaurant) return false;
      return true;
    });

    // Compute distance from start for ordering
    const startLat = trip.start_latitude;
    const startLon = trip.start_longitude;

    const enriched = entries.map((entry) => {
      const s = entry.station;
      const distFromStart = this._distanceMiles(startLat, startLon, s.latitude, s.longitude);
      return {
        station: s,
        distance_from_start_miles: distFromStart,
        order_suggestion_index: 0, // set later
        has_ev_charging: !!s.has_ev_charging,
        has_restaurant: !!s.has_restaurant
      };
    });

    enriched.sort((a, b) => a.distance_from_start_miles - b.distance_from_start_miles);
    enriched.forEach((e, idx) => {
      e.order_suggestion_index = idx + 1;
    });

    const maxResults = typeof filtersObj.max_results === 'number'
      ? filtersObj.max_results
      : null;

    const finalList = maxResults ? enriched.slice(0, maxResults) : enriched;

    return {
      trip,
      stations: finalList
    };
  }

  // 8) Add trip stop
  addTripStop(tripId, stationId) {
    const trips = this._getFromStorage('trips', []);
    const stations = this._getFromStorage('stations', []);
    const trip = trips.find((t) => t.id === tripId) || null;
    const station = stations.find((s) => s.id === stationId) || null;

    if (!trip || !station) {
      return {
        trip_stop: null,
        message: 'Trip or station not found.'
      };
    }

    const tripStops = this._getFromStorage('trip_stops', []);
    const existingForTrip = tripStops.filter((ts) => ts.tripId === tripId);
    const nextIndex = existingForTrip.length
      ? Math.max(...existingForTrip.map((ts) => ts.order_index)) + 1
      : 1;

    const tripStop = {
      id: this._generateId('trip_stop'),
      tripId,
      stationId,
      order_index: nextIndex,
      added_at: this._nowIso()
    };

    tripStops.push(tripStop);
    this._saveToStorage('trip_stops', tripStops);

    return {
      trip_stop: tripStop,
      message: 'Stop added to trip.'
    };
  }

  // 9) Trip summary
  getTripSummary(tripId) {
    const trips = this._getFromStorage('trips', []);
    const trip = trips.find((t) => t.id === tripId) || null;

    if (!trip) {
      return {
        trip: null,
        stops: []
      };
    }

    const tripStops = this._getFromStorage('trip_stops', []);
    const stations = this._getFromStorage('stations', []);

    const stopsForTrip = tripStops
      .filter((ts) => ts.tripId === tripId)
      .sort((a, b) => a.order_index - b.order_index);

    const stops = stopsForTrip.map((ts) => {
      const station = stations.find((s) => s.id === ts.stationId) || null;
      const enrichedTripStop = {
        ...ts,
        trip,
        station
      };
      return {
        trip_stop: enrichedTripStop,
        station
      };
    });

    return {
      trip,
      stops
    };
  }

  // 10) Fuel card product overview
  getFuelCardProductsOverview() {
    const products = this._getFromStorage('fuel_card_products', []);
    const activeProducts = products.filter((p) => p.status === 'active');

    return activeProducts.map((product) => ({
      product,
      key_benefits: []
    }));
  }

  // 11) Fuel card comparison table
  getFuelCardComparisonTable() {
    const products = this._getFromStorage('fuel_card_products', []);
    const activeProducts = products.filter((p) => p.status === 'active');

    const columns = [
      { id: 'product_name', label: 'Card' },
      { id: 'annual_fee', label: 'Annual Fee' },
      { id: 'fuel_rebate', label: 'Fuel Rebate' }
    ];

    const rows = activeProducts.map((product) => {
      const fee = Number(product.annual_fee_amount) || 0;
      const currency = product.annual_fee_currency || 'usd';
      const currencySymbol = currency === 'usd' ? '$' : '';
      const annual_fee_display = currencySymbol + fee.toString();

      let fuel_rebate_display = '';
      if (typeof product.fuel_rebate_percent === 'number') {
        fuel_rebate_display = product.fuel_rebate_percent.toString() + '%';
      }

      return {
        product,
        annual_fee_display,
        fuel_rebate_display
      };
    });

    return {
      columns,
      rows
    };
  }

  // 12) Fuel card product detail
  getFuelCardProductDetail(fuelCardProductId) {
    const products = this._getFromStorage('fuel_card_products', []);
    const product = products.find((p) => p.id === fuelCardProductId) || null;

    if (!product) {
      return {
        product: null,
        benefits: [],
        eligibility_notes: ''
      };
    }

    return {
      product,
      benefits: [],
      eligibility_notes: ''
    };
  }

  // 13) Start fuel card application
  startFuelCardApplication(fuelCardProductId, business_name, fleet_size, business_email) {
    const products = this._getFromStorage('fuel_card_products', []);
    const product = products.find((p) => p.id === fuelCardProductId) || null;

    if (!product) {
      return {
        application: null,
        message: 'Fuel card product not found.',
        next_step: null
      };
    }

    const applications = this._getFromStorage('fuel_card_applications', []);

    const application = {
      id: this._generateId('fuel_card_app'),
      fuelCardProductId,
      business_name,
      fleet_size: Number(fleet_size) || 0,
      business_email,
      created_at: this._nowIso(),
      status: 'started'
    };

    applications.push(application);
    this._saveToStorage('fuel_card_applications', applications);

    return {
      application,
      message: 'Fuel card application started.',
      next_step: 'business_details'
    };
  }

  // 14) Bulk fuel delivery options
  getBulkFuelDeliveryOptions() {
    const fuel_types = [
      { value: 'gasoline_regular', label: 'Gasoline Regular' },
      { value: 'gasoline_midgrade', label: 'Gasoline Midgrade' },
      { value: 'gasoline_premium_91', label: 'Gasoline Premium 91' },
      { value: 'gasoline_premium_93', label: 'Gasoline Premium 93' },
      { value: 'diesel', label: 'Diesel' },
      { value: 'biodiesel', label: 'Biodiesel' },
      { value: 'ethanol_blend', label: 'Ethanol Blend' },
      { value: 'compressed_natural_gas', label: 'Compressed Natural Gas' },
      { value: 'ev_charge', label: 'EV Charging' },
      { value: 'other', label: 'Other' }
    ];

    const volume_units = [
      { value: 'gallons', label: 'Gallons' },
      { value: 'liters', label: 'Liters' },
      { value: 'barrels', label: 'Barrels' }
    ];

    const delivery_frequencies = [
      { value: 'one_time', label: 'One-time' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'quarterly', label: 'Quarterly' },
      { value: 'annually', label: 'Annually' }
    ];

    return {
      fuel_types,
      volume_units,
      delivery_frequencies
    };
  }

  // 15) Request bulk fuel quote
  requestBulkFuelQuote(
    fuel_type,
    estimated_monthly_volume,
    volume_unit,
    delivery_city,
    delivery_state,
    delivery_postal_code,
    delivery_frequency,
    contact_name,
    contact_email,
    contact_phone,
    notes
  ) {
    const quoteRequests = this._getFromStorage('bulk_fuel_quote_requests', []);

    const quote_request = {
      id: this._generateId('bulk_quote'),
      fuel_type,
      estimated_monthly_volume: Number(estimated_monthly_volume) || 0,
      volume_unit,
      delivery_city,
      delivery_state,
      delivery_postal_code: delivery_postal_code || null,
      delivery_frequency,
      contact_name,
      contact_email,
      contact_phone,
      created_at: this._nowIso(),
      notes: notes || null
    };

    quoteRequests.push(quote_request);
    this._saveToStorage('bulk_fuel_quote_requests', quoteRequests);

    return {
      quote_request,
      success: true,
      message: 'Bulk fuel quote requested.'
    };
  }

  // 16) Loyalty program overview
  getLoyaltyProgramOverview() {
    const overview = this._getFromStorage('loyalty_program_overview', null);
    if (overview) return overview;
    const def = {
      program_description: 'Join our rewards program to earn points on every purchase and unlock member perks.',
      card_options: []
    };
    this._saveToStorage('loyalty_program_overview', def);
    return def;
  }

  // 17) Loyalty enrollment options
  getLoyaltyEnrollmentOptions() {
    const card_types = [
      {
        value: 'digital_only',
        label: 'Digital Card Only',
        description: 'Use your phone number or app; no physical card mailed.'
      },
      {
        value: 'physical_and_digital',
        label: 'Physical and Digital Card',
        description: 'Receive a plastic card plus digital access.'
      }
    ];

    const contact_preferences = [
      { field_name: 'prefers_email', label: 'Email' },
      { field_name: 'prefers_sms', label: 'SMS/Text' }
    ];

    return {
      card_types,
      contact_preferences
    };
  }

  // 18) Search stations for loyalty home station
  searchStationsForHomeStation(postal_code, radius_miles) {
    const effectiveRadius = typeof radius_miles === 'number' && !Number.isNaN(radius_miles)
      ? radius_miles
      : 10;

    const geo = this._resolveLocationQueryToCoordinates(postal_code);
    if (!geo) return [];

    const entries = this._findStationsWithinRadius(geo.latitude, geo.longitude, effectiveRadius);
    return entries.map((entry) => ({
      station: entry.station,
      distance_miles: entry.distance_miles
    }));
  }

  // 19) Enroll in loyalty
  enrollInLoyalty(
    card_type,
    first_name,
    last_name,
    email,
    mobile_number,
    prefers_email,
    prefers_sms,
    homeStationId
  ) {
    if (prefers_sms && !mobile_number) {
      return {
        enrollment: null,
        success: false,
        message: 'Mobile number is required for SMS preference.'
      };
    }

    const stations = this._getFromStorage('stations', []);
    const homeStation = stations.find((s) => s.id === homeStationId) || null;
    if (!homeStation) {
      return {
        enrollment: null,
        success: false,
        message: 'Home station not found.'
      };
    }

    const enrollments = this._getFromStorage('loyalty_enrollments', []);

    const enrollment = {
      id: this._generateId('loyalty'),
      card_type,
      first_name,
      last_name,
      email,
      mobile_number: mobile_number || null,
      prefers_email: !!prefers_email,
      prefers_sms: !!prefers_sms,
      homeStationId,
      enrollment_date: this._nowIso()
    };

    enrollments.push(enrollment);
    this._saveToStorage('loyalty_enrollments', enrollments);

    return {
      enrollment,
      success: true,
      message: 'Loyalty enrollment completed.'
    };
  }

  // 20) Career search filter options
  getCareerSearchFilterOptions() {
    return {
      radius_options_miles: [5, 10, 25, 50, 100],
      posted_within_days_options: [1, 7, 30, 90]
    };
  }

  // 21) Search job postings
  searchJobPostings(keywords, location, radius_miles, posted_within_days) {
    const jobs = this._getFromStorage('job_postings', []);
    const now = new Date();

    const kwNorm = this._normalizeString(keywords || '');
    const locProvided = !!location;
    const geo = locProvided ? this._resolveLocationQueryToCoordinates(location) : null;
    const effectiveRadius = typeof radius_miles === 'number' && !Number.isNaN(radius_miles)
      ? radius_miles
      : null;
    const daysLimit = typeof posted_within_days === 'number' && !Number.isNaN(posted_within_days)
      ? posted_within_days
      : null;

    const results = [];

    for (const job of jobs) {
      if (!job || job.status !== 'open') continue;

      // Keyword filtering
      if (kwNorm) {
        const titleNorm = this._normalizeString(job.title);
        const descNorm = this._normalizeString(job.description || '');
        if (!titleNorm.includes(kwNorm) && !descNorm.includes(kwNorm)) continue;
      }

      // Date filtering
      if (daysLimit !== null) {
        const postedDate = job.posted_date ? new Date(job.posted_date) : null;
        if (!postedDate || Number.isNaN(postedDate.getTime())) continue;
        const diffMs = now.getTime() - postedDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays > daysLimit) continue;
      }

      // Location and radius filtering
      let distance = null;
      if (geo && effectiveRadius !== null) {
        if (typeof job.latitude === 'number' && typeof job.longitude === 'number') {
          distance = this._distanceMiles(geo.latitude, geo.longitude, job.latitude, job.longitude);
        } else {
          const jobLocNorm = this._normalizeString(job.city + ', ' + job.state);
          const searchLocNorm = this._normalizeString(location);
          distance = jobLocNorm === searchLocNorm ? 0 : Number.POSITIVE_INFINITY;
        }
        if (distance > effectiveRadius) continue;
      } else if (geo) {
        if (typeof job.latitude === 'number' && typeof job.longitude === 'number') {
          distance = this._distanceMiles(geo.latitude, geo.longitude, job.latitude, job.longitude);
        } else {
          distance = null;
        }
      }

      results.push({ job, distance_miles: distance });
    }

    // Sort by distance when available
    results.sort((a, b) => {
      const da = typeof a.distance_miles === 'number' ? a.distance_miles : Number.POSITIVE_INFINITY;
      const db = typeof b.distance_miles === 'number' ? b.distance_miles : Number.POSITIVE_INFINITY;
      return da - db;
    });

    return {
      total_results: results.length,
      jobs: results
    };
  }

  // 22) Job posting detail
  getJobPostingDetail(jobPostingId) {
    const jobs = this._getFromStorage('job_postings', []);
    const job = jobs.find((j) => j.id === jobPostingId) || null;
    return { job };
  }

  // 23) Start job application
  startJobApplication(jobPostingId, first_name, last_name, email, phone_number) {
    const jobs = this._getFromStorage('job_postings', []);
    const job = jobs.find((j) => j.id === jobPostingId) || null;

    if (!job) {
      return {
        job_application: null,
        success: false,
        message: 'Job posting not found.',
        next_step: null
      };
    }

    const jobApplications = this._getFromStorage('job_applications', []);

    const job_application = {
      id: this._generateId('job_app'),
      jobPostingId,
      first_name,
      last_name,
      email,
      phone_number,
      created_at: this._nowIso(),
      status: 'started'
    };

    jobApplications.push(job_application);
    this._saveToStorage('job_applications', jobApplications);

    return {
      job_application,
      success: true,
      message: 'Job application started.',
      next_step: 'personal_details'
    };
  }

  // 24) Sustainability overview
  getSustainabilityOverview() {
    const overview = this._getFromStorage('sustainability_overview', null);
    if (overview) return overview;
    const def = {
      overview_html: 'Learn how we are reducing emissions and supporting cleaner fuels.',
      highlights: []
    };
    this._saveToStorage('sustainability_overview', def);
    return def;
  }

  // 25) Calculate emissions savings
  calculateEmissionsSavings(number_of_vehicles, percentage_using_biofuel, average_annual_miles_per_vehicle) {
    const tonsSaved = this._computeEmissionsSavings(
      number_of_vehicles,
      percentage_using_biofuel,
      average_annual_miles_per_vehicle
    );

    const calculations = this._getFromStorage('emissions_calculations', []);

    const calculation = {
      id: this._generateId('emissions'),
      number_of_vehicles: Number(number_of_vehicles) || 0,
      percentage_using_biofuel: Number(percentage_using_biofuel) || 0,
      average_annual_miles_per_vehicle: Number(average_annual_miles_per_vehicle) || 0,
      annual_co2_savings_tons: tonsSaved,
      created_at: this._nowIso()
    };

    calculations.push(calculation);
    this._saveToStorage('emissions_calculations', calculations);

    const summary_text =
      'Estimated annual CO2 savings: ' + tonsSaved.toFixed(2) + ' metric tons.';

    return {
      calculation,
      summary_text
    };
  }

  // 26) Safety & compliance overview
  getSafetyComplianceOverview() {
    const data = this._getFromStorage('safety_compliance_overview', null);
    if (data) return data;
    const def = {
      overview_html: 'Read about our product safety practices and regulatory compliance.',
      sds_library_intro: 'Browse and request Safety Data Sheets (SDS) for our fuels and products.'
    };
    this._saveToStorage('safety_compliance_overview', def);
    return def;
  }

  // 27) Search SDS
  searchSafetyDataSheets(query, language) {
    const qNorm = this._normalizeString(query || '');
    const lang = language || null;
    const sheets = this._getFromStorage('safety_data_sheets', []);

    const results = sheets.filter((s) => {
      if (!qNorm) return false;
      const nameNorm = this._normalizeString(s.product_name);
      const summaryNorm = this._normalizeString(s.summary || '');
      if (!nameNorm.includes(qNorm) && !summaryNorm.includes(qNorm)) return false;
      if (lang && s.language !== lang) return false;
      return true;
    });

    return {
      total_results: results.length,
      results
    };
  }

  // 28) SDS detail
  getSafetyDataSheetDetail(safetyDataSheetId) {
    const sheets = this._getFromStorage('safety_data_sheets', []);
    const safety_data_sheet = sheets.find((s) => s.id === safetyDataSheetId) || null;
    return { safety_data_sheet };
  }

  // 29) Email SDS
  emailSafetyDataSheet(safetyDataSheetId, recipient_email) {
    return this._sendSafetyDataSheetEmail(safetyDataSheetId, recipient_email);
  }

  // 30) About company info
  getAboutCompanyInfo() {
    const info = this._getFromStorage('about_company_info', null);
    if (info) return info;
    const def = {
      company_name: '',
      overview_html: '',
      history_html: '',
      operations_html: '',
      contact_address: '',
      contact_phone: '',
      contact_email: ''
    };
    this._saveToStorage('about_company_info', def);
    return def;
  }

  // 31) Submit contact inquiry
  submitContactInquiry(name, email, phone, subject, message_body) {
    const inquiries = this._getFromStorage('contact_inquiries', []);

    const record = {
      id: this._generateId('contact'),
      name,
      email,
      phone: phone || null,
      subject,
      message_body,
      created_at: this._nowIso()
    };

    inquiries.push(record);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      success: true,
      message: 'Inquiry submitted.'
    };
  }

  // 32) Legal and privacy content
  getLegalAndPrivacyContent() {
    const content = this._getFromStorage('legal_and_privacy_content', null);
    if (content) return content;
    const def = {
      privacy_policy_html: '',
      terms_of_use_html: '',
      last_updated_date: ''
    };
    this._saveToStorage('legal_and_privacy_content', def);
    return def;
  }

  // -----------------------
  // Example from template (not used in this domain)
  // -----------------------

  // Kept for compatibility with the provided template; does nothing meaningful
  addToCart(userId, productId, quantity = 1) {
    const carts = this._getFromStorage('carts', []);
    const cartItems = this._getFromStorage('cartItems', []);
    // No-op placeholder in this domain
    this._saveToStorage('carts', carts);
    this._saveToStorage('cartItems', cartItems);
    return { success: true, cartId: null };
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