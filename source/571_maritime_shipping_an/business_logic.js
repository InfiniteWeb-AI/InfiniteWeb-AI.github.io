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
    this.idCounter = this._getNextIdCounter();
  }

  // ------------------------
  // Storage helpers
  // ------------------------

  _initStorage() {
    const keys = [
      // Core domain entities
      'ports',
      'city_locations',
      'container_types',
      'trade_lanes',
      'carriers',
      'ocean_quote_searches',
      'ocean_rate_options',
      'trucking_requests',
      'trucking_options',
      'vessel_schedules',
      'schedule_searches',
      'schedule_watchlist_items',
      'shipments',
      'shipment_events',
      'saved_shipments',
      'countries',
      'help_categories',
      'help_articles',
      'bookmark_folders',
      'article_bookmarks',
      'warehouse_locations',
      'warehousing_rates',
      'storage_calculations',
      'warehousing_quote_requests',
      'shipping_cost_estimates',
      'business_profiles',
      'business_preferences',
      'static_content_sections',
      'contact_inquiries'
    ];

    for (const key of keys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('page_context')) {
      localStorage.setItem('page_context', JSON.stringify({}));
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }
  }

  _getFromStorage(key, defaultValue = []) {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw);
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

  _nowISO() {
    return new Date().toISOString();
  }

  _parseDate(dateStr) {
    if (!dateStr) return new Date();
    // If date only (YYYY-MM-DD), treat as UTC midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + 'T00:00:00Z');
    }
    return new Date(dateStr);
  }

  _stringContains(haystack, needle) {
    if (!haystack || !needle) return false;
    return String(haystack).toLowerCase().includes(String(needle).toLowerCase());
  }

  _getCountryNameById(countryId) {
    if (!countryId) return null;
    const countries = this._getFromStorage('countries');
    const c = countries.find((x) => x.id === countryId);
    return c ? c.name : null;
  }

  // ------------------------
  // Helper functions (private)
  // ------------------------

  // Internal helper to load the single business profile from storage (if any)
  _getOrCreateBusinessProfile() {
    const profiles = this._getFromStorage('business_profiles');
    if (profiles.length > 0) {
      return profiles[0];
    }
    return null;
  }

  // Save transient page/flow context
  _savePageContext(keyOrObject, value) {
    const raw = localStorage.getItem('page_context');
    let ctx;
    try {
      ctx = raw ? JSON.parse(raw) : {};
    } catch (e) {
      ctx = {};
    }

    if (typeof keyOrObject === 'string') {
      ctx[keyOrObject] = value;
    } else if (keyOrObject && typeof keyOrObject === 'object') {
      Object.assign(ctx, keyOrObject);
    }

    localStorage.setItem('page_context', JSON.stringify(ctx));
  }

  // Load transient page/flow context
  _loadPageContext(key) {
    const raw = localStorage.getItem('page_context');
    let ctx;
    try {
      ctx = raw ? JSON.parse(raw) : {};
    } catch (e) {
      ctx = {};
    }
    if (typeof key === 'string') {
      return ctx[key];
    }
    return ctx;
  }

  // Generic foreign-key enrichment helper
  // config: { fkFieldName: { storageKey: 'ports', propName: 'origin_port' }, ... }
  _enrichEntitiesForDisplay(entities, config) {
    if (!entities) return entities;
    const isArray = Array.isArray(entities);
    const list = isArray ? entities : [entities];
    const caches = {};

    const getFromCache = (storageKey, id) => {
      if (!id) return null;
      if (!caches[storageKey]) {
        const all = this._getFromStorage(storageKey);
        const map = {};
        for (const item of all) {
          if (item && item.id != null) {
            map[item.id] = item;
          }
        }
        caches[storageKey] = map;
      }
      return caches[storageKey][id] || null;
    };

    const enriched = list.map((entity) => {
      if (!entity || typeof entity !== 'object') return entity;
      const copy = { ...entity };
      if (config) {
        for (const fkField in config) {
          if (!Object.prototype.hasOwnProperty.call(config, fkField)) continue;
          const conf = config[fkField];
          const id = entity[fkField];
          const resolved = getFromCache(conf.storageKey, id);
          copy[conf.propName] = resolved || null;
        }
      }
      return copy;
    });

    return isArray ? enriched : enriched[0];
  }

  // ------------------------
  // Interface implementations
  // ------------------------

  // searchPorts(query, countryId, limit)
  searchPorts(query, countryId, limit) {
    if (!query) return [];
    let ports = this._getFromStorage('ports');
    const q = String(query).toLowerCase();

    ports = ports.filter((p) => {
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q)) ||
        (p.country && p.country.toLowerCase().includes(q)) ||
        (p.unlocode && p.unlocode.toLowerCase().includes(q))
      );
    });

    if (countryId) {
      const countryName = this._getCountryNameById(countryId);
      if (countryName) {
        ports = ports.filter((p) => p.country === countryName);
      }
    }

    const lim = typeof limit === 'number' && limit > 0 ? limit : 10;
    return ports.slice(0, lim);
  }

  // searchCityLocations(query, country, limit)
  searchCityLocations(query, country, limit) {
    if (!query) return [];
    let cities = this._getFromStorage('city_locations');
    const q = String(query).toLowerCase();

    cities = cities.filter((c) => {
      return (
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.postal_code && String(c.postal_code).toLowerCase().includes(q))
      );
    });

    if (country) {
      const cLower = String(country).toLowerCase();
      cities = cities.filter((c) => c.country && c.country.toLowerCase() === cLower);
    }

    const lim = typeof limit === 'number' && limit > 0 ? limit : 10;
    return cities.slice(0, lim);
  }

  // getContainerTypes()
  getContainerTypes() {
    return this._getFromStorage('container_types');
  }

  // getTradeLaneOptions()
  getTradeLaneOptions() {
    return this._getFromStorage('trade_lanes');
  }

  // getWarehouseLocations()
  getWarehouseLocations() {
    const locations = this._getFromStorage('warehouse_locations');
    return this._enrichEntitiesForDisplay(locations, {
      port_id: { storageKey: 'ports', propName: 'port' }
    });
  }

  // getBookmarkFolders()
  getBookmarkFolders() {
    return this._getFromStorage('bookmark_folders');
  }

  // getUserShippingDefaults()
  getUserShippingDefaults() {
    const prefsArr = this._getFromStorage('business_preferences');
    const preferences = prefsArr[0] || null;

    if (!preferences) {
      return { preferences: null, trade_lane: null, container_type: null };
    }

    const tradeLanes = this._getFromStorage('trade_lanes');
    const containerTypes = this._getFromStorage('container_types');

    const trade_lane = tradeLanes.find((t) => t.id === preferences.default_trade_lane_id) || null;
    const container_type = containerTypes.find((c) => c.id === preferences.preferred_container_type_id) || null;

    const enrichedPrefs = {
      ...preferences,
      default_trade_lane: trade_lane || null,
      preferred_container_type: container_type || null
    };

    return { preferences: enrichedPrefs, trade_lane, container_type };
  }

  // Helper to generate synthetic ocean rate options when none exist for a search
  _generateOceanRateOptionsForSearch(search) {
    const options = [];
    const containerQty = search.container_quantity || 1;
    const isFcl = search.mode === 'fcl';
    const baseCost = (isFcl ? 1000 + 400 : 600) + containerQty * 100;
    const earliest = this._parseDate(search.earliest_departure_date);
    const carriers = this._getFromStorage('carriers');
    const carrierId = carriers.length > 0 ? carriers[0].id : null;

    for (let i = 0; i < 3; i++) {
      const dep = new Date(earliest.getTime());
      dep.setDate(dep.getDate() + 1 + i * 3);
      const transitDays = 15 + i * 3;
      const arr = new Date(dep.getTime());
      arr.setDate(arr.getDate() + transitDays);

      const baseFreight = baseCost + i * 150;
      const surcharges = 200 + i * 50;
      const total = baseFreight + surcharges;

      options.push({
        id: this._generateId('orate'),
        quote_search_id: search.id,
        mode: search.mode,
        origin_port_id: search.origin_port_id,
        destination_port_id: search.destination_port_id,
        carrier_id: carrierId,
        service_name: 'Service ' + (i + 1),
        container_type_id: search.container_type_id || null,
        container_quantity: containerQty,
        lcl_pallet_count: search.lcl_pallet_count || null,
        lcl_weight_kg: search.lcl_weight_kg || null,
        departure_datetime: dep.toISOString(),
        arrival_datetime: arr.toISOString(),
        transit_time_days: transitDays,
        base_ocean_freight: baseFreight,
        surcharges: surcharges,
        total_estimated_cost: total,
        currency: 'USD',
        is_bookable: true,
        created_at: this._nowISO()
      });
    }

    return options;
  }

  // searchOceanRates(mode, originPortId, destinationPortId, earliestDepartureDate, containerTypeId, containerQuantity, lclPalletCount, lclWeightKg)
  searchOceanRates(
    mode,
    originPortId,
    destinationPortId,
    earliestDepartureDate,
    containerTypeId,
    containerQuantity,
    lclPalletCount,
    lclWeightKg
  ) {
    const quoteSearches = this._getFromStorage('ocean_quote_searches');
    const now = this._nowISO();
    const search = {
      id: this._generateId('oqs'),
      mode: mode,
      origin_port_id: originPortId,
      destination_port_id: destinationPortId,
      earliest_departure_date: earliestDepartureDate,
      container_type_id: containerTypeId || null,
      container_quantity: mode === 'fcl' ? (containerQuantity || 1) : null,
      lcl_pallet_count: mode === 'lcl' ? (lclPalletCount || null) : null,
      lcl_weight_kg: mode === 'lcl' ? (lclWeightKg || null) : null,
      created_at: now
    };

    quoteSearches.push(search);
    this._saveToStorage('ocean_quote_searches', quoteSearches);

    let allRateOptions = this._getFromStorage('ocean_rate_options');
    let rateOptionsForSearch = allRateOptions.filter((o) => o.quote_search_id === search.id);

    if (rateOptionsForSearch.length === 0) {
      // Try to derive from existing options as templates (match by route/mode)
      const earliest = this._parseDate(earliestDepartureDate);
      const templates = allRateOptions.filter((o) => {
        if (!o.origin_port_id || !o.destination_port_id) return false;
        if (o.origin_port_id !== originPortId) return false;
        if (o.destination_port_id !== destinationPortId) return false;
        if (o.mode !== mode) return false;
        const dep = this._parseDate(o.departure_datetime);
        if (dep < earliest) return false;
        if (containerTypeId && o.container_type_id && o.container_type_id !== containerTypeId) return false;
        return true;
      });

      if (templates.length > 0) {
        rateOptionsForSearch = templates.map((tpl) => ({
          ...tpl,
          id: this._generateId('orate'),
          quote_search_id: search.id,
          created_at: now
        }));
        allRateOptions = allRateOptions.concat(rateOptionsForSearch);
        this._saveToStorage('ocean_rate_options', allRateOptions);
      } else {
        // Generate synthetic options and persist
        rateOptionsForSearch = this._generateOceanRateOptionsForSearch(search);
        allRateOptions = allRateOptions.concat(rateOptionsForSearch);
        this._saveToStorage('ocean_rate_options', allRateOptions);
      }
    }

    const ports = this._getFromStorage('ports');
    const origin_port = ports.find((p) => p.id === originPortId) || null;
    const destination_port = ports.find((p) => p.id === destinationPortId) || null;

    const carriers = this._getFromStorage('carriers');
    const containerTypes = this._getFromStorage('container_types');

    const carriersUsedIds = Array.from(
      new Set(rateOptionsForSearch.map((o) => o.carrier_id).filter((id) => !!id))
    );
    const carriersUsed = carriers.filter((c) => carriersUsedIds.includes(c.id));

    const containerTypeIdsUsed = Array.from(
      new Set(rateOptionsForSearch.map((o) => o.container_type_id).filter((id) => !!id))
    );
    const containerTypesUsed = containerTypes.filter((ct) => containerTypeIdsUsed.includes(ct.id));

    const enrichedRateOptions = this._enrichEntitiesForDisplay(rateOptionsForSearch, {
      origin_port_id: { storageKey: 'ports', propName: 'origin_port' },
      destination_port_id: { storageKey: 'ports', propName: 'destination_port' },
      carrier_id: { storageKey: 'carriers', propName: 'carrier' },
      container_type_id: { storageKey: 'container_types', propName: 'container_type' }
    });

    return {
      search,
      rate_options: enrichedRateOptions,
      ports: [origin_port, destination_port].filter((p) => !!p),
      carriers: carriersUsed,
      container_types: containerTypesUsed
    };
  }

  // getOceanRateFilterOptions(quoteSearchId)
  getOceanRateFilterOptions(quoteSearchId) {
    const allRateOptions = this._getFromStorage('ocean_rate_options');
    const options = allRateOptions.filter((o) => o.quote_search_id === quoteSearchId);

    if (options.length === 0) {
      return {
        transit_time_days: { min: null, max: null },
        price: { min: null, max: null, currency: 'USD' },
        available_sort_options: [
          'price_low_to_high',
          'price_high_to_low',
          'transit_time_shortest',
          'departure_earliest',
          'arrival_earliest'
        ]
      };
    }

    let minTransit = Infinity;
    let maxTransit = -Infinity;
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    const currency = options[0].currency || 'USD';

    for (const o of options) {
      if (typeof o.transit_time_days === 'number') {
        if (o.transit_time_days < minTransit) minTransit = o.transit_time_days;
        if (o.transit_time_days > maxTransit) maxTransit = o.transit_time_days;
      }
      if (typeof o.total_estimated_cost === 'number') {
        if (o.total_estimated_cost < minPrice) minPrice = o.total_estimated_cost;
        if (o.total_estimated_cost > maxPrice) maxPrice = o.total_estimated_cost;
      }
    }

    if (!isFinite(minTransit)) minTransit = null;
    if (!isFinite(maxTransit)) maxTransit = null;
    if (!isFinite(minPrice)) minPrice = null;
    if (!isFinite(maxPrice)) maxPrice = null;

    return {
      transit_time_days: { min: minTransit, max: maxTransit },
      price: { min: minPrice, max: maxPrice, currency },
      available_sort_options: [
        'price_low_to_high',
        'price_high_to_low',
        'transit_time_shortest',
        'departure_earliest',
        'arrival_earliest'
      ]
    };
  }

  // getOceanRates(quoteSearchId, sortBy, filters)
  getOceanRates(quoteSearchId, sortBy, filters) {
    const allRateOptions = this._getFromStorage('ocean_rate_options');
    let options = allRateOptions.filter((o) => o.quote_search_id === quoteSearchId);

    if (filters && typeof filters === 'object') {
      if (typeof filters.maxTransitDays === 'number') {
        options = options.filter((o) =>
          typeof o.transit_time_days === 'number' && o.transit_time_days <= filters.maxTransitDays
        );
      }
      if (typeof filters.maxTotalEstimatedCost === 'number') {
        options = options.filter((o) =>
          typeof o.total_estimated_cost === 'number' &&
          o.total_estimated_cost <= filters.maxTotalEstimatedCost
        );
      }
    }

    const sortKey = sortBy || 'price_low_to_high';

    options.sort((a, b) => {
      const da = this._parseDate(a.departure_datetime).getTime();
      const db = this._parseDate(b.departure_datetime).getTime();
      const aa = this._parseDate(a.arrival_datetime).getTime();
      const ab = this._parseDate(b.arrival_datetime).getTime();

      switch (sortKey) {
        case 'price_high_to_low':
          return (b.total_estimated_cost || 0) - (a.total_estimated_cost || 0);
        case 'transit_time_shortest':
          return (a.transit_time_days || 0) - (b.transit_time_days || 0);
        case 'departure_earliest':
          return da - db;
        case 'arrival_earliest':
          return aa - ab;
        case 'price_low_to_high':
        default:
          return (a.total_estimated_cost || 0) - (b.total_estimated_cost || 0);
      }
    });

    const ports = this._getFromStorage('ports');
    const carriers = this._getFromStorage('carriers');
    const containerTypes = this._getFromStorage('container_types');

    const portIds = Array.from(
      new Set([
        ...options.map((o) => o.origin_port_id),
        ...options.map((o) => o.destination_port_id)
      ].filter((id) => !!id))
    );
    const portsUsed = ports.filter((p) => portIds.includes(p.id));

    const carrierIds = Array.from(new Set(options.map((o) => o.carrier_id).filter((id) => !!id)));
    const carriersUsed = carriers.filter((c) => carrierIds.includes(c.id));

    const containerTypeIds = Array.from(
      new Set(options.map((o) => o.container_type_id).filter((id) => !!id))
    );
    const containerTypesUsed = containerTypes.filter((ct) => containerTypeIds.includes(ct.id));

    const enrichedOptions = this._enrichEntitiesForDisplay(options, {
      origin_port_id: { storageKey: 'ports', propName: 'origin_port' },
      destination_port_id: { storageKey: 'ports', propName: 'destination_port' },
      carrier_id: { storageKey: 'carriers', propName: 'carrier' },
      container_type_id: { storageKey: 'container_types', propName: 'container_type' }
    });

    return {
      rate_options: enrichedOptions,
      ports: portsUsed,
      carriers: carriersUsed,
      container_types: containerTypesUsed
    };
  }

  // selectOceanRateOption(rateOptionId)
  selectOceanRateOption(rateOptionId) {
    const allRateOptions = this._getFromStorage('ocean_rate_options');
    const rateOption = allRateOptions.find((o) => o.id === rateOptionId);
    if (!rateOption) {
      return { success: false, message: 'Rate option not found', selected_rate_option: null };
    }

    // Save selection in page context
    this._savePageContext('selected_ocean_rate_option_id', rateOptionId);

    const ports = this._getFromStorage('ports');
    const carriers = this._getFromStorage('carriers');

    const origin_port = ports.find((p) => p.id === rateOption.origin_port_id) || null;
    const destination_port = ports.find((p) => p.id === rateOption.destination_port_id) || null;
    const carrier = carriers.find((c) => c.id === rateOption.carrier_id) || null;

    return {
      success: true,
      message: 'Rate option selected',
      selected_rate_option: {
        rate_option: { ...rateOption },
        origin_port,
        destination_port,
        carrier
      }
    };
  }

  // Helper to generate trucking options
  _generateTruckingOptionsForRequest(truckingRequest) {
    const options = [];
    const carriers = this._getFromStorage('carriers');
    const carrierId = carriers.length > 0 ? carriers[0].id : null;

    const serviceLevels = ['economy', 'standard', 'express'];

    for (let i = 0; i < 3; i++) {
      const price = 250 + i * 75; // simple tiered pricing
      const hours = 12 + i * 4;

      options.push({
        id: this._generateId('topt'),
        trucking_request_id: truckingRequest.id,
        carrier_id: carrierId,
        pickup_date: truckingRequest.pickup_date,
        pickup_time_window: truckingRequest.pickup_time_window,
        price: price,
        currency: 'USD',
        estimated_transit_hours: hours,
        service_level: serviceLevels[i],
        is_available: true
      });
    }

    return options;
  }

  // submitTruckingRequestAndGetOptions(pickupCity, pickupPostalCode, pickupState, pickupCountry, dropoffPortId, containerTypeId, containerQuantity, pickupDate, pickupTimeWindow)
  submitTruckingRequestAndGetOptions(
    pickupCity,
    pickupPostalCode,
    pickupState,
    pickupCountry,
    dropoffPortId,
    containerTypeId,
    containerQuantity,
    pickupDate,
    pickupTimeWindow
  ) {
    const requests = this._getFromStorage('trucking_requests');
    const now = this._nowISO();

    const request = {
      id: this._generateId('trkreq'),
      pickup_address_line: null,
      pickup_city: pickupCity,
      pickup_postal_code: pickupPostalCode,
      pickup_state: pickupState || null,
      pickup_country: pickupCountry,
      dropoff_port_id: dropoffPortId,
      container_type_id: containerTypeId,
      container_quantity: typeof containerQuantity === 'number' && containerQuantity > 0 ? containerQuantity : 1,
      pickup_date: pickupDate,
      pickup_time_window: pickupTimeWindow,
      created_at: now,
      selected_option_id: null
    };

    requests.push(request);
    this._saveToStorage('trucking_requests', requests);

    let allOptions = this._getFromStorage('trucking_options');
    let options = allOptions.filter((o) => o.trucking_request_id === request.id);

    if (options.length === 0) {
      options = this._generateTruckingOptionsForRequest(request);
      allOptions = allOptions.concat(options);
      this._saveToStorage('trucking_options', allOptions);
    }

    const carriers = this._getFromStorage('carriers');
    const carrierIds = Array.from(new Set(options.map((o) => o.carrier_id).filter((id) => !!id)));
    const carriersUsed = carriers.filter((c) => carrierIds.includes(c.id));

    const enrichedOptions = this._enrichEntitiesForDisplay(options, {
      carrier_id: { storageKey: 'carriers', propName: 'carrier' }
    });

    return {
      trucking_request: request,
      options: enrichedOptions,
      carriers: carriersUsed
    };
  }

  // selectTruckingOption(truckingOptionId)
  selectTruckingOption(truckingOptionId) {
    const allOptions = this._getFromStorage('trucking_options');
    const option = allOptions.find((o) => o.id === truckingOptionId);
    if (!option) {
      return { success: false, message: 'Trucking option not found', trucking_request: null, selected_option: null };
    }

    const requests = this._getFromStorage('trucking_requests');
    const request = requests.find((r) => r.id === option.trucking_request_id);
    if (!request) {
      return { success: false, message: 'Associated trucking request not found', trucking_request: null, selected_option: null };
    }

    request.selected_option_id = truckingOptionId;
    this._saveToStorage('trucking_requests', requests);

    const carriers = this._getFromStorage('carriers');
    const carrier = carriers.find((c) => c.id === option.carrier_id) || null;

    this._savePageContext('selected_trucking_option_id', truckingOptionId);

    return {
      success: true,
      message: 'Trucking option selected',
      trucking_request: {
        id: request.id,
        selected_option_id: request.selected_option_id,
        pickup_city: request.pickup_city,
        pickup_postal_code: request.pickup_postal_code,
        dropoff_port_id: request.dropoff_port_id,
        pickup_date: request.pickup_date,
        pickup_time_window: request.pickup_time_window
      },
      selected_option: {
        option: { ...option },
        carrier
      }
    };
  }

  // Helper to generate vessel schedules
  _generateVesselSchedulesForSearch(search) {
    const schedules = [];
    const carriers = this._getFromStorage('carriers');
    const carrierId = carriers.length > 0 ? carriers[0].id : null;
    const earliest = this._parseDate(search.earliest_departure_date);

    for (let i = 0; i < 3; i++) {
      const dep = new Date(earliest.getTime());
      dep.setDate(dep.getDate() + 1 + i * 2);
      const transitDays = 20 + i * 3;
      const arr = new Date(dep.getTime());
      arr.setDate(arr.getDate() + transitDays);

      schedules.push({
        id: this._generateId('vsched'),
        origin_port_id: search.origin_port_id,
        destination_port_id: search.destination_port_id,
        carrier_id: carrierId,
        vessel_name: 'Vessel ' + (i + 1),
        voyage_number: 'VOY' + (100 + i),
        departure_datetime: dep.toISOString(),
        arrival_datetime: arr.toISOString(),
        transit_time_days: transitDays,
        intermediate_port_ids: [],
        service_type: 'direct',
        schedule_status: 'scheduled'
      });
    }

    return schedules;
  }

  // searchVesselSchedules(originPortId, destinationPortId, earliestDepartureDate, sortBy)
  searchVesselSchedules(originPortId, destinationPortId, earliestDepartureDate, sortBy) {
    const scheduleSearches = this._getFromStorage('schedule_searches');
    const now = this._nowISO();
    const search = {
      id: this._generateId('schs'),
      origin_port_id: originPortId,
      destination_port_id: destinationPortId,
      earliest_departure_date: earliestDepartureDate,
      created_at: now
    };

    scheduleSearches.push(search);
    this._saveToStorage('schedule_searches', scheduleSearches);

    let schedules = this._getFromStorage('vessel_schedules').filter(
      (s) =>
        s.origin_port_id === originPortId &&
        s.destination_port_id === destinationPortId &&
        this._parseDate(s.departure_datetime) >= this._parseDate(earliestDepartureDate)
    );

    if (schedules.length === 0) {
      const all = this._getFromStorage('vessel_schedules');
      const generated = this._generateVesselSchedulesForSearch(search);
      schedules = generated;
      this._saveToStorage('vessel_schedules', all.concat(generated));
    }

    const sortKey = sortBy || 'departure_earliest';
    schedules.sort((a, b) => {
      const da = this._parseDate(a.departure_datetime).getTime();
      const db = this._parseDate(b.departure_datetime).getTime();
      const aa = this._parseDate(a.arrival_datetime).getTime();
      const ab = this._parseDate(b.arrival_datetime).getTime();
      if (sortKey === 'arrival_earliest') return aa - ab;
      return da - db;
    });

    const ports = this._getFromStorage('ports');
    const carriers = this._getFromStorage('carriers');

    const origin_port = ports.find((p) => p.id === originPortId) || null;
    const destination_port = ports.find((p) => p.id === destinationPortId) || null;

    const carrierIds = Array.from(
      new Set(schedules.map((s) => s.carrier_id).filter((id) => !!id))
    );
    const carriersUsed = carriers.filter((c) => carrierIds.includes(c.id));

    const enrichedSchedules = this._enrichEntitiesForDisplay(schedules, {
      origin_port_id: { storageKey: 'ports', propName: 'origin_port' },
      destination_port_id: { storageKey: 'ports', propName: 'destination_port' },
      carrier_id: { storageKey: 'carriers', propName: 'carrier' }
    });

    return {
      search,
      schedules: enrichedSchedules,
      ports: [origin_port, destination_port].filter((p) => !!p),
      carriers: carriersUsed
    };
  }

  // getScheduleDetails(scheduleId)
  getScheduleDetails(scheduleId) {
    const schedules = this._getFromStorage('vessel_schedules');
    const schedule = schedules.find((s) => s.id === scheduleId) || null;

    if (!schedule) {
      return {
        schedule: null,
        origin_port: null,
        destination_port: null,
        intermediate_ports: [],
        carrier: null
      };
    }

    const ports = this._getFromStorage('ports');
    const carriers = this._getFromStorage('carriers');

    const origin_port = ports.find((p) => p.id === schedule.origin_port_id) || null;
    const destination_port = ports.find((p) => p.id === schedule.destination_port_id) || null;

    const intermediate_ports = (schedule.intermediate_port_ids || [])
      .map((id) => ports.find((p) => p.id === id))
      .filter((p) => !!p);

    const carrier = carriers.find((c) => c.id === schedule.carrier_id) || null;

    return {
      schedule: { ...schedule },
      origin_port,
      destination_port,
      intermediate_ports,
      carrier
    };
  }

  // saveScheduleToWatchlist(scheduleId, notes)
  saveScheduleToWatchlist(scheduleId, notes) {
    const watchlist = this._getFromStorage('schedule_watchlist_items');
    const item = {
      id: this._generateId('swl'),
      schedule_id: scheduleId,
      saved_at: this._nowISO(),
      notes: notes || null
    };
    watchlist.push(item);
    this._saveToStorage('schedule_watchlist_items', watchlist);

    return {
      watchlist_item: item,
      message: 'Schedule saved to watchlist'
    };
  }

  // trackShipmentByContainer(containerNumber)
  trackShipmentByContainer(containerNumber) {
    const shipments = this._getFromStorage('shipments');
    let shipment = shipments.find((s) => s.container_number === containerNumber) || null;

    if (!shipment) {
      // Create a minimal shipment record if not present
      shipment = {
        id: this._generateId('shp'),
        container_number: containerNumber,
        origin_port_id: null,
        destination_port_id: null,
        latest_status: 'booked',
        latest_status_time: this._nowISO(),
        estimated_arrival: null,
        vessel_name: null,
        voyage_number: null,
        last_known_location: null
      };
      shipments.push(shipment);
      this._saveToStorage('shipments', shipments);
    }

    const events = this._getFromStorage('shipment_events').filter(
      (e) => e.shipment_id === shipment.id
    );

    const ports = this._getFromStorage('ports');
    const origin_port = ports.find((p) => p.id === shipment.origin_port_id) || null;
    const destination_port = ports.find((p) => p.id === shipment.destination_port_id) || null;

    return {
      shipment: { ...shipment },
      events,
      origin_port,
      destination_port
    };
  }

  // saveTrackedShipment(shipmentId, nickname, emailUpdatesEnabled)
  saveTrackedShipment(shipmentId, nickname, emailUpdatesEnabled) {
    const shipments = this._getFromStorage('shipments');
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (!shipment) {
      return { saved_shipment: null, message: 'Shipment not found' };
    }

    const saved = this._getFromStorage('saved_shipments');
    const savedShipment = {
      id: this._generateId('sshp'),
      shipment_id: shipmentId,
      container_number: shipment.container_number,
      nickname: nickname,
      email_updates_enabled: !!emailUpdatesEnabled,
      saved_at: this._nowISO()
    };

    saved.push(savedShipment);
    this._saveToStorage('saved_shipments', saved);

    return {
      saved_shipment: savedShipment,
      message: 'Shipment saved to dashboard'
    };
  }

  // getHelpCenterOverview()
  getHelpCenterOverview() {
    const categories = this._getFromStorage('help_categories');
    const articles = this._getFromStorage('help_articles');
    const featured_articles = articles.filter((a) => a.is_featured);

    return { categories, featured_articles };
  }

  // searchHelpArticles(categorySlug, originCountryId, destinationCountryId, cargoType, query, limit)
  searchHelpArticles(categorySlug, originCountryId, destinationCountryId, cargoType, query, limit) {
    const categories = this._getFromStorage('help_categories');
    const articles = this._getFromStorage('help_articles');
    const countries = this._getFromStorage('countries');

    let filtered = articles.slice();

    if (categorySlug) {
      const cat = categories.find((c) => c.slug === categorySlug);
      if (cat) {
        filtered = filtered.filter((a) => a.category_id === cat.id);
      } else {
        filtered = [];
      }
    }

    if (originCountryId) {
      filtered = filtered.filter((a) => a.origin_country_id === originCountryId);
    }

    if (destinationCountryId) {
      filtered = filtered.filter((a) => a.destination_country_id === destinationCountryId);
    }

    if (cargoType) {
      filtered = filtered.filter((a) => a.cargo_type === cargoType);
    }

    if (query) {
      const q = String(query).toLowerCase();
      filtered = filtered.filter(
        (a) =>
          (a.title && a.title.toLowerCase().includes(q)) ||
          (a.content && a.content.toLowerCase().includes(q))
      );
    }

    const lim = typeof limit === 'number' && limit > 0 ? limit : 20;
    filtered = filtered.slice(0, lim);

    return {
      articles: filtered,
      categories,
      countries
    };
  }

  // getHelpArticleDetail(articleId)
  getHelpArticleDetail(articleId) {
    const articles = this._getFromStorage('help_articles');
    const categories = this._getFromStorage('help_categories');
    const countries = this._getFromStorage('countries');

    const article = articles.find((a) => a.id === articleId) || null;
    if (!article) {
      return {
        article: null,
        category: null,
        origin_country: null,
        destination_country: null
      };
    }

    const category = categories.find((c) => c.id === article.category_id) || null;
    const origin_country = countries.find((c) => c.id === article.origin_country_id) || null;
    const destination_country = countries.find((c) => c.id === article.destination_country_id) || null;

    return {
      article: { ...article },
      category,
      origin_country,
      destination_country
    };
  }

  // bookmarkHelpArticle(articleId, folderId, newFolderName)
  bookmarkHelpArticle(articleId, folderId, newFolderName) {
    let folders = this._getFromStorage('bookmark_folders');
    const bookmarks = this._getFromStorage('article_bookmarks');

    let folder = null;

    if (newFolderName) {
      folder = {
        id: this._generateId('bmf'),
        name: newFolderName,
        created_at: this._nowISO()
      };
      folders.push(folder);
      this._saveToStorage('bookmark_folders', folders);
    } else if (folderId) {
      folder = folders.find((f) => f.id === folderId) || null;
    }

    if (!folder) {
      // Ensure there is at least a default folder
      folder = folders.find((f) => f.name === 'General');
      if (!folder) {
        folder = {
          id: this._generateId('bmf'),
          name: 'General',
          created_at: this._nowISO()
        };
        folders.push(folder);
        this._saveToStorage('bookmark_folders', folders);
      }
    }

    const bookmark = {
      id: this._generateId('abm'),
      article_id: articleId,
      folder_id: folder.id,
      saved_at: this._nowISO()
    };

    bookmarks.push(bookmark);
    this._saveToStorage('article_bookmarks', bookmarks);

    return {
      folder,
      bookmark,
      message: 'Article bookmarked'
    };
  }

  // calculateStorageCost(warehouseLocationId, pallets, storageDays)
  calculateStorageCost(warehouseLocationId, pallets, storageDays) {
    const warehouseLocations = this._getFromStorage('warehouse_locations');
    const rates = this._getFromStorage('warehousing_rates');

    const location = warehouseLocations.find((w) => w.id === warehouseLocationId) || null;

    const relevantRates = rates.filter((r) => r.warehouse_location_id === warehouseLocationId);
    let estimated_total_cost = 0;
    let currency = 'USD';

    if (relevantRates.length > 0) {
      // Use first rate for calculation
      const rate = relevantRates[0];
      currency = rate.currency || 'USD';
      const days = Math.max(storageDays, rate.min_storage_days || 0);

      if (rate.rate_type === 'per_pallet_per_day') {
        estimated_total_cost = pallets * days * rate.base_rate + rate.additional_fees;
      } else if (rate.rate_type === 'per_cubic_meter_per_day') {
        // Treat each pallet as 1 cubic meter as a simple approximation
        const cubicMeters = pallets;
        estimated_total_cost = cubicMeters * days * rate.base_rate + rate.additional_fees;
      } else if (rate.rate_type === 'flat_rate') {
        estimated_total_cost = rate.base_rate + rate.additional_fees;
      }
    } else {
      // Fallback simple estimate when no rate is defined
      estimated_total_cost = pallets * storageDays * 1; // nominal rate
    }

    const calculations = this._getFromStorage('storage_calculations');
    const calculation = {
      id: this._generateId('stcalc'),
      warehouse_location_id: warehouseLocationId,
      pallets: pallets,
      storage_days: storageDays,
      estimated_total_cost: estimated_total_cost,
      currency: currency,
      calculated_at: this._nowISO()
    };

    calculations.push(calculation);
    this._saveToStorage('storage_calculations', calculations);

    const enrichedLocation = this._enrichEntitiesForDisplay(location, {
      port_id: { storageKey: 'ports', propName: 'port' }
    });

    return {
      calculation,
      warehouse_location: enrichedLocation
    };
  }

  // requestWarehousingQuote(warehouseLocationId, pallets, storageDays, companyName, contactEmail)
  requestWarehousingQuote(warehouseLocationId, pallets, storageDays, companyName, contactEmail) {
    const calcResult = this.calculateStorageCost(warehouseLocationId, pallets, storageDays);
    const calculation = calcResult.calculation;

    const requests = this._getFromStorage('warehousing_quote_requests');

    const quote_request = {
      id: this._generateId('whq'),
      warehouse_location_id: warehouseLocationId,
      pallets: pallets,
      storage_days: storageDays,
      estimated_total_cost: calculation.estimated_total_cost,
      currency: calculation.currency,
      company_name: companyName,
      contact_email: contactEmail,
      submitted_at: this._nowISO(),
      status: 'submitted'
    };

    requests.push(quote_request);
    this._saveToStorage('warehousing_quote_requests', requests);

    const warehouseLocations = this._getFromStorage('warehouse_locations');
    const location = warehouseLocations.find((w) => w.id === warehouseLocationId) || null;
    const enrichedLocation = this._enrichEntitiesForDisplay(location, {
      port_id: { storageKey: 'ports', propName: 'port' }
    });

    return {
      quote_request,
      warehouse_location: enrichedLocation,
      message: 'Warehousing quote request submitted'
    };
  }

  // getShippingAddOnOptions()
  getShippingAddOnOptions() {
    return {
      insurance_tiers: [
        {
          code: 'basic',
          label: 'Basic',
          description: 'Basic cargo insurance with limited coverage.'
        },
        {
          code: 'standard',
          label: 'Standard',
          description: 'Standard coverage suitable for most shipments.'
        },
        {
          code: 'premium',
          label: 'Premium',
          description: 'Premium coverage with lowest deductibles.'
        }
      ],
      last_mile_service_levels: [
        {
          code: 'none',
          label: 'No Last-Mile',
          description: 'Port pickup or drop-off only.'
        },
        {
          code: 'standard',
          label: 'Standard Delivery',
          description: 'Standard last-mile truck delivery.'
        },
        {
          code: 'express',
          label: 'Express Delivery',
          description: 'Priority last-mile truck delivery.'
        }
      ]
    };
  }

  // calculateShippingCostEstimate(originLocationType, originPortId, originCityLocationId, destinationLocationType, destinationPortId, destinationCityLocationId, containerTypeId, containerQuantity, insuranceIncluded, insuranceTier, customsClearanceIncluded, lastMileServiceLevel, lastMileDestinationAddress)
  calculateShippingCostEstimate(
    originLocationType,
    originPortId,
    originCityLocationId,
    destinationLocationType,
    destinationPortId,
    destinationCityLocationId,
    containerTypeId,
    containerQuantity,
    insuranceIncluded,
    insuranceTier,
    customsClearanceIncluded,
    lastMileServiceLevel,
    lastMileDestinationAddress
  ) {
    const containerTypes = this._getFromStorage('container_types');
    const ports = this._getFromStorage('ports');
    const cities = this._getFromStorage('city_locations');

    const container_type = containerTypes.find((c) => c.id === containerTypeId) || null;
    const qty = typeof containerQuantity === 'number' && containerQuantity > 0 ? containerQuantity : 1;

    const lengthFt = container_type && typeof container_type.length_ft === 'number'
      ? container_type.length_ft
      : 40;

    // Very simple cost model
    const base_ocean_cost = lengthFt * 50 * qty;

    let insurance_cost = 0;
    if (insuranceIncluded) {
      let factor = 0.01;
      if (insuranceTier === 'standard') factor = 0.015;
      else if (insuranceTier === 'premium') factor = 0.02;
      insurance_cost = base_ocean_cost * factor;
    }

    const customs_cost = customsClearanceIncluded ? qty * 150 : 0;

    let last_mile_cost = 0;
    if (lastMileServiceLevel === 'standard') {
      last_mile_cost = qty * 200;
    } else if (lastMileServiceLevel === 'express') {
      last_mile_cost = qty * 350;
    }

    const total_cost = base_ocean_cost + insurance_cost + customs_cost + last_mile_cost;

    const estimate = {
      id: this._generateId('sce'),
      origin_location_type: originLocationType,
      origin_port_id: originLocationType === 'port' ? originPortId : null,
      origin_city_location_id: originLocationType === 'city' ? originCityLocationId : null,
      destination_location_type: destinationLocationType,
      destination_port_id: destinationLocationType === 'port' ? destinationPortId : null,
      destination_city_location_id: destinationLocationType === 'city' ? destinationCityLocationId : null,
      container_type_id: containerTypeId,
      container_quantity: qty,
      insurance_included: !!insuranceIncluded,
      insurance_tier: insuranceTier,
      customs_clearance_included: !!customsClearanceIncluded,
      last_mile_service_level: lastMileServiceLevel,
      last_mile_destination_address: lastMileDestinationAddress || null,
      base_ocean_cost,
      insurance_cost,
      customs_cost,
      last_mile_cost,
      total_cost,
      currency: 'USD',
      calculated_at: this._nowISO(),
      saved: false
    };

    const estimates = this._getFromStorage('shipping_cost_estimates');
    estimates.push(estimate);
    this._saveToStorage('shipping_cost_estimates', estimates);

    const origin_port = originLocationType === 'port'
      ? ports.find((p) => p.id === originPortId) || null
      : null;

    const destination_city = destinationLocationType === 'city'
      ? cities.find((c) => c.id === destinationCityLocationId) || null
      : null;

    return {
      estimate,
      origin_port,
      destination_city,
      container_type
    };
  }

  // saveShippingCostEstimate(estimateId)
  saveShippingCostEstimate(estimateId) {
    const estimates = this._getFromStorage('shipping_cost_estimates');
    const estimate = estimates.find((e) => e.id === estimateId) || null;
    if (!estimate) {
      return { estimate: null, message: 'Estimate not found' };
    }

    estimate.saved = true;
    this._saveToStorage('shipping_cost_estimates', estimates);

    return {
      estimate: { id: estimate.id, saved: estimate.saved },
      message: 'Estimate saved'
    };
  }

  // registerBusinessProfile(accountType, companyName, contactEmail, password)
  registerBusinessProfile(accountType, companyName, contactEmail, password) {
    // password is accepted but not stored (handled securely by the system in a real implementation)
    if (accountType !== 'business') {
      return {
        business_profile: null,
        preferences: null,
        message: 'Only business account type is supported'
      };
    }

    let profiles = this._getFromStorage('business_profiles');

    let profile;
    if (profiles.length > 0) {
      // Update existing profile to avoid duplicates
      profile = profiles[0];
      profile.account_type = 'business';
      profile.company_name = companyName;
      profile.contact_email = contactEmail;
    } else {
      profile = {
        id: this._generateId('bprof'),
        account_type: 'business',
        company_name: companyName,
        contact_email: contactEmail,
        created_at: this._nowISO()
      };
      profiles.push(profile);
    }

    this._saveToStorage('business_profiles', profiles);

    // Initialize preferences
    const tradeLanes = this._getFromStorage('trade_lanes');
    const containerTypes = this._getFromStorage('container_types');

    const defaultTradeLaneId = tradeLanes.length > 0 ? tradeLanes[0].id : null;
    const preferredContainerTypeId = containerTypes.length > 0 ? containerTypes[0].id : null;

    const prefsArr = this._getFromStorage('business_preferences');
    let preferences;
    if (prefsArr.length > 0) {
      preferences = prefsArr[0];
      preferences.default_trade_lane_id = defaultTradeLaneId;
      preferences.preferred_container_type_id = preferredContainerTypeId;
      preferences.email_notifications_enabled = false;
      preferences.updated_at = this._nowISO();
    } else {
      preferences = {
        id: this._generateId('bpref'),
        default_trade_lane_id: defaultTradeLaneId,
        preferred_container_type_id: preferredContainerTypeId,
        email_notifications_enabled: false,
        updated_at: this._nowISO()
      };
      prefsArr.push(preferences);
    }

    this._saveToStorage('business_preferences', prefsArr);

    return {
      business_profile: profile,
      preferences,
      message: 'Business profile registered'
    };
  }

  // getAccountSettings()
  getAccountSettings() {
    const profiles = this._getFromStorage('business_profiles');
    const prefsArr = this._getFromStorage('business_preferences');
    const trade_lanes = this._getFromStorage('trade_lanes');
    const container_types = this._getFromStorage('container_types');

    const business_profile = profiles[0] || null;
    const preferencesRaw = prefsArr[0] || null;

    let preferences = null;
    if (preferencesRaw) {
      const tl = trade_lanes.find((t) => t.id === preferencesRaw.default_trade_lane_id) || null;
      const ct = container_types.find((c) => c.id === preferencesRaw.preferred_container_type_id) || null;
      preferences = {
        ...preferencesRaw,
        default_trade_lane: tl,
        preferred_container_type: ct
      };
    }

    return {
      business_profile,
      preferences,
      trade_lanes,
      container_types
    };
  }

  // updateBusinessProfile(companyName, contactEmail)
  updateBusinessProfile(companyName, contactEmail) {
    let profiles = this._getFromStorage('business_profiles');
    let profile = profiles[0];

    if (!profile) {
      profile = {
        id: this._generateId('bprof'),
        account_type: 'business',
        company_name: companyName,
        contact_email: contactEmail,
        created_at: this._nowISO()
      };
      profiles.push(profile);
    } else {
      profile.company_name = companyName;
      profile.contact_email = contactEmail;
    }

    this._saveToStorage('business_profiles', profiles);

    return {
      business_profile: {
        id: profile.id,
        company_name: profile.company_name,
        contact_email: profile.contact_email
      },
      message: 'Business profile updated'
    };
  }

  // updateBusinessPreferences(defaultTradeLaneId, preferredContainerTypeId, emailNotificationsEnabled)
  updateBusinessPreferences(defaultTradeLaneId, preferredContainerTypeId, emailNotificationsEnabled) {
    const prefsArr = this._getFromStorage('business_preferences');
    let preferences = prefsArr[0];

    if (!preferences) {
      preferences = {
        id: this._generateId('bpref'),
        default_trade_lane_id: defaultTradeLaneId,
        preferred_container_type_id: preferredContainerTypeId,
        email_notifications_enabled: !!emailNotificationsEnabled,
        updated_at: this._nowISO()
      };
      prefsArr.push(preferences);
    } else {
      preferences.default_trade_lane_id = defaultTradeLaneId;
      preferences.preferred_container_type_id = preferredContainerTypeId;
      preferences.email_notifications_enabled = !!emailNotificationsEnabled;
      preferences.updated_at = this._nowISO();
    }

    this._saveToStorage('business_preferences', prefsArr);

    return {
      preferences,
      message: 'Business preferences updated'
    };
  }

  // getDashboardOverview()
  getDashboardOverview() {
    const savedShipmentsArr = this._getFromStorage('saved_shipments');
    const shipments = this._getFromStorage('shipments');
    const watchlistItems = this._getFromStorage('schedule_watchlist_items');
    const schedules = this._getFromStorage('vessel_schedules');
    const shippingEstimates = this._getFromStorage('shipping_cost_estimates');
    const warehousingRequestsAll = this._getFromStorage('warehousing_quote_requests');
    const warehouseLocations = this._getFromStorage('warehouse_locations');
    const bookmarkFolders = this._getFromStorage('bookmark_folders');
    const articleBookmarks = this._getFromStorage('article_bookmarks');
    const helpArticles = this._getFromStorage('help_articles');

    // Saved shipments with linked shipment info
    const saved_shipments = savedShipmentsArr.map((saved) => {
      const shipment = shipments.find((s) => s.id === saved.shipment_id) || null;
      return {
        saved: { ...saved },
        shipment: shipment
          ? {
              ...shipment
            }
          : null
      };
    });

    // Watchlisted schedules
    const watchlist_schedules = watchlistItems.map((item) => {
      const schedule = schedules.find((s) => s.id === item.schedule_id) || null;
      return {
        watchlist_item: { ...item },
        schedule: schedule ? { ...schedule } : null
      };
    });

    // Saved shipping estimates (with FK enrichment)
    const saved_estimates_raw = shippingEstimates.filter((e) => e.saved);
    const saved_estimates = this._enrichEntitiesForDisplay(saved_estimates_raw, {
      container_type_id: { storageKey: 'container_types', propName: 'container_type' },
      origin_port_id: { storageKey: 'ports', propName: 'origin_port' },
      destination_port_id: { storageKey: 'ports', propName: 'destination_port' },
      origin_city_location_id: { storageKey: 'city_locations', propName: 'origin_city' },
      destination_city_location_id: { storageKey: 'city_locations', propName: 'destination_city' }
    });

    // Warehousing quote requests (hide those "cancelled" via in_review status)
    const warehousing_quote_requests_raw = warehousingRequestsAll.filter(
      (q) => q.status !== 'in_review'
    );
    const warehousing_quote_requests = this._enrichEntitiesForDisplay(
      warehousing_quote_requests_raw,
      {
        warehouse_location_id: {
          storageKey: 'warehouse_locations',
          propName: 'warehouse_location'
        }
      }
    );

    // Bookmark folders with bookmarks & article summaries
    const bookmark_folders = bookmarkFolders.map((folder) => {
      const bookmarksForFolder = articleBookmarks.filter((b) => b.folder_id === folder.id);
      const bookmarks = bookmarksForFolder.map((bookmark) => {
        const article = helpArticles.find((a) => a.id === bookmark.article_id) || null;
        return {
          bookmark: { ...bookmark },
          article: article
            ? {
                title: article.title,
                slug: article.slug
              }
            : null
        };
      });
      return {
        folder: { ...folder },
        bookmarks
      };
    });

    return {
      saved_shipments,
      watchlist_schedules,
      saved_estimates,
      warehousing_quote_requests,
      bookmark_folders
    };
  }

  // renameSavedShipment(savedShipmentId, newNickname)
  renameSavedShipment(savedShipmentId, newNickname) {
    const saved = this._getFromStorage('saved_shipments');
    const item = saved.find((s) => s.id === savedShipmentId) || null;
    if (!item) {
      return { saved_shipment: null, message: 'Saved shipment not found' };
    }

    item.nickname = newNickname;
    this._saveToStorage('saved_shipments', saved);

    return {
      saved_shipment: {
        id: item.id,
        nickname: item.nickname
      },
      message: 'Saved shipment renamed'
    };
  }

  // removeSavedShipment(savedShipmentId)
  removeSavedShipment(savedShipmentId) {
    let saved = this._getFromStorage('saved_shipments');
    const originalLength = saved.length;
    saved = saved.filter((s) => s.id !== savedShipmentId);
    this._saveToStorage('saved_shipments', saved);

    const success = saved.length < originalLength;
    return {
      success,
      message: success ? 'Saved shipment removed' : 'Saved shipment not found'
    };
  }

  // removeScheduleWatchlistItem(watchlistItemId)
  removeScheduleWatchlistItem(watchlistItemId) {
    let items = this._getFromStorage('schedule_watchlist_items');
    const originalLength = items.length;
    items = items.filter((i) => i.id !== watchlistItemId);
    this._saveToStorage('schedule_watchlist_items', items);

    const success = items.length < originalLength;
    return {
      success,
      message: success ? 'Watchlist item removed' : 'Watchlist item not found'
    };
  }

  // removeSavedShippingEstimate(estimateId)
  removeSavedShippingEstimate(estimateId) {
    const estimates = this._getFromStorage('shipping_cost_estimates');
    const estimate = estimates.find((e) => e.id === estimateId) || null;
    if (!estimate) {
      return { success: false, message: 'Estimate not found' };
    }

    // Mark as unsaved instead of deleting entirely
    estimate.saved = false;
    this._saveToStorage('shipping_cost_estimates', estimates);

    return { success: true, message: 'Estimate removed from dashboard' };
  }

  // renameBookmarkFolder(folderId, newName)
  renameBookmarkFolder(folderId, newName) {
    const folders = this._getFromStorage('bookmark_folders');
    const folder = folders.find((f) => f.id === folderId) || null;
    if (!folder) {
      return { folder: null, message: 'Folder not found' };
    }

    folder.name = newName;
    this._saveToStorage('bookmark_folders', folders);

    return {
      folder: {
        id: folder.id,
        name: folder.name
      },
      message: 'Folder renamed'
    };
  }

  // removeArticleBookmark(bookmarkId)
  removeArticleBookmark(bookmarkId) {
    let bookmarks = this._getFromStorage('article_bookmarks');
    const originalLength = bookmarks.length;
    bookmarks = bookmarks.filter((b) => b.id !== bookmarkId);
    this._saveToStorage('article_bookmarks', bookmarks);

    const success = bookmarks.length < originalLength;
    return {
      success,
      message: success ? 'Bookmark removed' : 'Bookmark not found'
    };
  }

  // cancelWarehousingQuoteRequest(quoteRequestId)
  cancelWarehousingQuoteRequest(quoteRequestId) {
    const requests = this._getFromStorage('warehousing_quote_requests');
    const req = requests.find((r) => r.id === quoteRequestId) || null;
    if (!req) {
      return {
        quote_request: null,
        success: false,
        message: 'Quote request not found'
      };
    }

    // Use 'in_review' as an internal status to represent cancelled/hidden from dashboard
    req.status = 'in_review';
    this._saveToStorage('warehousing_quote_requests', requests);

    return {
      quote_request: {
        id: req.id,
        status: req.status
      },
      success: true,
      message: 'Warehousing quote request cancelled'
    };
  }

  // getAboutPageContent(sectionKey)
  getAboutPageContent(sectionKey) {
    let sections = this._getFromStorage('static_content_sections');
    if (sectionKey) {
      sections = sections.filter((s) => s.section_key === sectionKey);
    }
    return sections;
  }

  // submitContactInquiry(subject, message, topic, contactName, contactEmail)
  submitContactInquiry(subject, message, topic, contactName, contactEmail) {
    const inquiries = this._getFromStorage('contact_inquiries');

    // Validate topic enum
    const allowedTopics = ['general_question', 'sales', 'support', 'billing', 'technical'];
    const safeTopic = allowedTopics.includes(topic) ? topic : 'general_question';

    const inquiry = {
      id: this._generateId('cinq'),
      subject: subject,
      message: message,
      topic: safeTopic,
      contact_name: contactName || null,
      contact_email: contactEmail,
      submitted_at: this._nowISO(),
      status: 'submitted'
    };

    inquiries.push(inquiry);
    this._saveToStorage('contact_inquiries', inquiries);

    return {
      inquiry: {
        id: inquiry.id,
        subject: inquiry.subject,
        topic: inquiry.topic,
        contact_email: inquiry.contact_email,
        submitted_at: inquiry.submitted_at,
        status: inquiry.status
      },
      message: 'Inquiry submitted'
    };
  }

  // getContactPageContent()
  getContactPageContent() {
    // Static contact info; could be extended to use storage if needed
    return {
      support_emails: [
        { label: 'General Support', email: 'support@example.com' },
        { label: 'Sales', email: 'sales@example.com' }
      ],
      phone_numbers: [
        { label: 'Global Hotline', number: '+1-800-000-0000' }
      ],
      offices: [
        {
          label: 'Head Office',
          address: '123 Ocean Drive, Maritime District, Global City'
        }
      ]
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
