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
    this._getOrCreateUserContext();
  }

  // -------------------- Storage Helpers --------------------

  _initStorage() {
    const tableKeys = [
      'shipment_quote_requests',
      'service_options',
      'saved_quotes',
      'shipment_bookings',
      'package_items',
      'container_types',
      'container_rate_options',
      'saved_addresses',
      'recurring_pickup_schedules',
      'help_categories',
      'help_articles',
      'support_inquiries',
      'delivery_change_requests',
      'tracking_events',
      'service_categories'
    ];

    for (let i = 0; i < tableKeys.length; i++) {
      const key = tableKeys[i];
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('user_context')) {
      const now = new Date().toISOString();
      const ctx = {
        id: 'user_context',
        created_at: now,
        updated_at: now
      };
      localStorage.setItem('user_context', JSON.stringify(ctx));
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      if (typeof defaultValue !== 'undefined') {
        return defaultValue;
      }
      // Default to array to match common usage
      return [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      // If corrupted, return sensible default
      if (typeof defaultValue !== 'undefined') {
        return defaultValue;
      }
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

  _getOrCreateUserContext() {
    const raw = localStorage.getItem('user_context');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // Reset if corrupted
        const now = new Date().toISOString();
        const ctx = { id: 'user_context', created_at: now, updated_at: now };
        localStorage.setItem('user_context', JSON.stringify(ctx));
        return ctx;
      }
    }
    const now = new Date().toISOString();
    const ctx = { id: 'user_context', created_at: now, updated_at: now };
    localStorage.setItem('user_context', JSON.stringify(ctx));
    return ctx;
  }

  // Utility helpers

  _parseISODate(dateStr) {
    return dateStr ? new Date(dateStr) : null;
  }

  _addDays(date, days) {
    const d = new Date(date.getTime());
    d.setDate(d.getDate() + days);
    return d;
  }

  _formatISO(date) {
    return date.toISOString();
  }

  _dateOnlyISO(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }

  _weekdayNameToIndex(name) {
    const map = {
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
      sunday: 0
    };
    return map[name] !== undefined ? map[name] : null;
  }

  _computeNextRunDate(schedule) {
    if (!schedule || !schedule.start_date || !schedule.end_date) return null;
    const start = this._parseISODate(schedule.start_date);
    const end = this._parseISODate(schedule.end_date);
    if (!start || !end) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cursor = start > today ? start : today;

    const frequency = schedule.frequency || 'weekly';
    const weekdays = Array.isArray(schedule.weekdays) && schedule.weekdays.length
      ? schedule.weekdays
      : (schedule.primary_weekday ? [schedule.primary_weekday] : []);

    const weekdayIndexes = weekdays
      .map((w) => this._weekdayNameToIndex(w))
      .filter((idx) => idx !== null);

    for (let i = 0; i < 366; i++) {
      if (cursor > end) break;

      if (frequency === 'weekly' && weekdayIndexes.length) {
        const dayIndex = cursor.getDay();
        if (weekdayIndexes.indexOf(dayIndex) !== -1) {
          return this._dateOnlyISO(cursor);
        }
      } else {
        // daily or unspecified: any day within range
        return this._dateOnlyISO(cursor);
      }

      cursor = this._addDays(cursor, 1);
    }

    return null;
  }

  _getCurrencyForCountries(originCountry, destinationCountry) {
    const oc = (originCountry || '').toUpperCase();
    const dc = (destinationCountry || '').toUpperCase();

    if (oc === 'US' || oc === 'USA' || dc === 'US' || dc === 'USA') return 'usd';
    if (oc === 'JP' || oc === 'JPN' || dc === 'JP' || dc === 'JPN') return 'jpy';
    if (oc === 'GB' || oc === 'UK' || dc === 'GB' || dc === 'UK') return 'gbp';
    if (oc === 'CA' || dc === 'CA') return 'cad';
    return 'usd';
  }

  _estimateTransitDays(serviceMode, isDomestic, serviceLevel) {
    const domestic = !!isDomestic;
    let base;
    if (serviceMode === 'air_freight') {
      base = domestic ? 2 : 5;
    } else if (serviceMode === 'ground') {
      base = domestic ? 4 : 7;
    } else if (serviceMode === 'refrigerated') {
      base = domestic ? 3 : 6;
    } else if (serviceMode === 'ocean_freight') {
      base = domestic ? 10 : 20;
    } else {
      base = domestic ? 5 : 10;
    }

    if (serviceLevel === 'express' || serviceLevel === 'priority') {
      base = Math.max(1, base - 2);
    } else if (serviceLevel === 'economy') {
      base = base + 2;
    }

    return base;
  }

  _generateTrackingNumber() {
    return 'TRK' + this._getNextIdCounter();
  }

  _findById(list, id) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  }

  // -------------------- Interfaces Implementation --------------------

  // 1) getServiceCategoriesForOverview
  getServiceCategoriesForOverview() {
    const categories = this._getFromStorage('service_categories', []);
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      icon: c.icon || ''
    }));
  }

  // 2) getHomeDashboardSummary
  getHomeDashboardSummary() {
    const addresses = this._getFromStorage('saved_addresses', []);
    const savedQuotes = this._getFromStorage('saved_quotes', []);
    const schedules = this._getFromStorage('recurring_pickup_schedules', []);

    const defaultPickupAddress = addresses.find((a) => a.is_default_pickup) || null;

    const savedQuotesSorted = savedQuotes
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const saved_quotes_preview = savedQuotesSorted.slice(0, 5).map((sq) => ({
      saved_quote_id: sq.id,
      label: sq.label || '',
      origin_display: sq.origin_display || '',
      destination_display: sq.destination_display || '',
      service_mode: sq.service_mode || 'unknown',
      price_total: sq.price_total,
      currency: sq.currency,
      estimated_transit_days: sq.estimated_transit_days || null,
      created_at: sq.created_at,
      expires_at: sq.expires_at || null,
      // Foreign-key style resolution (saved_quote_id -> saved_quote)
      saved_quote: sq
    }));

    const nowISO = new Date().toISOString();
    const upcoming_recurring_pickups = schedules
      .filter((s) => s.is_active !== false && s.end_date && s.end_date >= nowISO)
      .map((s) => {
        const nextRun = this._computeNextRunDate(s);
        return {
          schedule_id: s.id,
          schedule_name: s.schedule_name || '',
          pickup_city: s.pickup_city,
          pickup_postal_code: s.pickup_postal_code,
          pickup_time_label: s.pickup_time_label,
          next_run_date: nextRun,
          is_active: s.is_active !== false,
          // Foreign-key style resolution
          schedule: s
        };
      })
      .filter((item) => !!item.next_run_date)
      .sort((a, b) => (a.next_run_date < b.next_run_date ? -1 : 1));

    return {
      default_pickup_address: defaultPickupAddress
        ? {
            id: defaultPickupAddress.id,
            label: defaultPickupAddress.label,
            street: defaultPickupAddress.street,
            city: defaultPickupAddress.city,
            state: defaultPickupAddress.state || '',
            postal_code: defaultPickupAddress.postal_code,
            country: defaultPickupAddress.country,
            is_default_pickup: !!defaultPickupAddress.is_default_pickup
          }
        : null,
      saved_quotes_preview,
      upcoming_recurring_pickups
    };
  }

  // 3) autocompleteLocation
  autocompleteLocation(query, type, country_hint) {
    const q = (query || '').toLowerCase();
    if (!q) return [];

    const results = [];

    const addresses = this._getFromStorage('saved_addresses', []);
    for (let i = 0; i < addresses.length; i++) {
      const a = addresses[i];
      const display = a.street + ', ' + a.city + (a.state ? ', ' + a.state : '') + ', ' + a.country;
      if (display.toLowerCase().indexOf(q) !== -1) {
        if (country_hint && a.country && a.country.toUpperCase() !== country_hint.toUpperCase()) {
          // still include but lower priority – we won't actually reorder here
        }
        results.push({
          display_text: display,
          street: a.street,
          city: a.city,
          state: a.state || '',
          postal_code: a.postal_code || '',
          country: a.country,
          type: 'street'
        });
      }
    }

    const quotes = this._getFromStorage('shipment_quote_requests', []);
    for (let i = 0; i < quotes.length; i++) {
      const qReq = quotes[i];
      const originDisplay = qReq.origin_display || '';
      const destDisplay = qReq.destination_display || '';

      if (originDisplay && originDisplay.toLowerCase().indexOf(q) !== -1) {
        results.push({
          display_text: originDisplay,
          street: qReq.origin_street || '',
          city: qReq.origin_city || '',
          state: qReq.origin_state || '',
          postal_code: qReq.origin_postal_code || '',
          country: qReq.origin_country || '',
          type: type || 'unknown'
        });
      }
      if (destDisplay && destDisplay.toLowerCase().indexOf(q) !== -1) {
        results.push({
          display_text: destDisplay,
          street: qReq.destination_street || '',
          city: qReq.destination_city || '',
          state: qReq.destination_state || '',
          postal_code: qReq.destination_postal_code || '',
          country: qReq.destination_country || '',
          type: type || 'unknown'
        });
      }

      if (qReq.origin_port_name && qReq.origin_port_name.toLowerCase().indexOf(q) !== -1) {
        results.push({
          display_text: qReq.origin_port_name,
          street: '',
          city: '',
          state: '',
          postal_code: '',
          country: '',
          type: 'port'
        });
      }
      if (qReq.destination_port_name && qReq.destination_port_name.toLowerCase().indexOf(q) !== -1) {
        results.push({
          display_text: qReq.destination_port_name,
          street: '',
          city: '',
          state: '',
          postal_code: '',
          country: '',
          type: 'port'
        });
      }
    }

    const schedules = this._getFromStorage('recurring_pickup_schedules', []);
    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      const display = s.pickup_street + ', ' + s.pickup_city + (s.pickup_state ? ', ' + s.pickup_state : '') + ', ' + s.pickup_country;
      if (display.toLowerCase().indexOf(q) !== -1) {
        results.push({
          display_text: display,
          street: s.pickup_street,
          city: s.pickup_city,
          state: s.pickup_state || '',
          postal_code: s.pickup_postal_code || '',
          country: s.pickup_country,
          type: 'street'
        });
      }
    }

    // No external data source; only from existing records
    return results;
  }

  // 4) rateShipmentQuote
  rateShipmentQuote(
    service_mode,
    ocean_mode,
    origin_display,
    origin_street,
    origin_city,
    origin_state,
    origin_postal_code,
    origin_country,
    destination_display,
    destination_street,
    destination_city,
    destination_state,
    destination_postal_code,
    destination_country,
    is_domestic,
    pickup_date,
    pickup_time_window_label,
    requested_delivery_date,
    total_weight,
    weight_unit,
    total_volume,
    volume_unit,
    num_pieces,
    has_multi_packages,
    packages,
    special_handling,
    contains_dangerous_goods
  ) {
    const now = new Date().toISOString();

    // Determine domestic if not explicitly provided
    if (typeof is_domestic === 'undefined' || is_domestic === null) {
      if (origin_country && destination_country) {
        is_domestic = origin_country.toUpperCase() === destination_country.toUpperCase();
      } else {
        is_domestic = false;
      }
    }

    const quoteId = this._generateId('quote');

    const quote_request = {
      id: quoteId,
      created_at: now,
      origin_display: origin_display,
      origin_street: origin_street || null,
      origin_city: origin_city || null,
      origin_state: origin_state || null,
      origin_postal_code: origin_postal_code || null,
      origin_country: origin_country || null,
      destination_display: destination_display,
      destination_street: destination_street || null,
      destination_city: destination_city || null,
      destination_state: destination_state || null,
      destination_postal_code: destination_postal_code || null,
      destination_country: destination_country || null,
      origin_port_name: null,
      destination_port_name: null,
      service_mode: service_mode || 'unknown',
      ocean_mode: ocean_mode || 'none',
      is_domestic: !!is_domestic,
      pickup_date: pickup_date || null,
      pickup_time_window_label: pickup_time_window_label || null,
      requested_delivery_date: requested_delivery_date || null,
      total_weight: typeof total_weight === 'number' ? total_weight : null,
      weight_unit: weight_unit || null,
      total_volume: typeof total_volume === 'number' ? total_volume : null,
      volume_unit: volume_unit || null,
      num_pieces: typeof num_pieces === 'number' ? num_pieces : null,
      has_multi_packages: !!has_multi_packages,
      special_handling: special_handling || 'none',
      contains_dangerous_goods: !!contains_dangerous_goods,
      quote_status: 'rated'
    };

    const quoteRequests = this._getFromStorage('shipment_quote_requests', []);
    quoteRequests.push(quote_request);
    this._saveToStorage('shipment_quote_requests', quoteRequests);

    const packageItemsStore = this._getFromStorage('package_items', []);
    if (packages && Array.isArray(packages) && packages.length) {
      for (let i = 0; i < packages.length; i++) {
        const p = packages[i];
        const pkgItem = {
          id: this._generateId('pkg'),
          quote_request_id: quoteId,
          booking_id: null,
          package_index: p.package_index || i + 1,
          weight: p.weight,
          weight_unit: p.weight_unit || weight_unit || 'kg',
          length: typeof p.length === 'number' ? p.length : null,
          width: typeof p.width === 'number' ? p.width : null,
          height: typeof p.height === 'number' ? p.height : null,
          dimension_unit: p.dimension_unit || 'cm',
          description: p.description || null,
          declared_value: typeof p.declared_value === 'number' ? p.declared_value : null,
          declared_value_currency: p.declared_value_currency || null
        };
        packageItemsStore.push(pkgItem);
      }
      this._saveToStorage('package_items', packageItemsStore);
    }

    // -------------------- Generate Service Options --------------------
    const serviceOptionsStore = this._getFromStorage('service_options', []);

    const originCountry = origin_country || '';
    const destCountry = destination_country || '';
    const currency = this._getCurrencyForCountries(originCountry, destCountry);

    const weight = typeof total_weight === 'number' ? total_weight : 0;
    const volume = typeof total_volume === 'number' ? total_volume : 0;

    const baseWeight = weight || (packages && packages.reduce((sum, p) => sum + (p.weight || 0), 0)) || 0;
    const baseVolume = volume;

    let perKg = 1;
    let perM3 = 1;

    if (service_mode === 'air_freight') {
      perKg = 5;
      perM3 = 50;
    } else if (service_mode === 'ground') {
      perKg = 2;
      perM3 = 20;
    } else if (service_mode === 'refrigerated') {
      perKg = 4;
      perM3 = 40;
    } else if (service_mode === 'ocean_freight') {
      perKg = 1.5;
      perM3 = 15;
    } else {
      perKg = 3;
      perM3 = 30;
    }

    const basePrice = baseWeight * perKg + baseVolume * perM3;

    const levels = [];
    if (service_mode === 'ground') {
      levels.push('economy', 'standard', 'express');
    } else if (service_mode === 'air_freight') {
      levels.push('economy', 'standard', 'priority');
    } else if (service_mode === 'refrigerated') {
      levels.push('standard', 'priority');
    } else {
      levels.push('standard');
    }

    const service_options = [];

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      let multiplier = 1;
      if (level === 'economy') multiplier = 0.9;
      if (level === 'standard') multiplier = 1.0;
      if (level === 'express' || level === 'priority') multiplier = 1.3;

      let name = '';
      if (service_mode === 'air_freight') {
        name = 'Air ' + level.charAt(0).toUpperCase() + level.slice(1);
      } else if (service_mode === 'ground') {
        name = 'Ground ' + level.charAt(0).toUpperCase() + level.slice(1);
      } else if (service_mode === 'refrigerated') {
        name = 'Refrigerated ' + level.charAt(0).toUpperCase() + level.slice(1);
      } else if (service_mode === 'ocean_freight') {
        name = 'Ocean ' + level.charAt(0).toUpperCase() + level.slice(1);
      } else {
        name = 'Service ' + level.charAt(0).toUpperCase() + level.slice(1);
      }

      const transitDays = this._estimateTransitDays(service_mode, is_domestic, level);

      let pickupDate = pickup_date ? this._parseISODate(pickup_date) : new Date();
      if (!pickupDate) pickupDate = new Date();

      const deliveryDate = this._addDays(pickupDate, transitDays);

      let delivery_time_commitment = 'date_only';
      let delivery_time_window_label = null;
      let is_morning_delivery = false;

      if (service_mode === 'ground' && level !== 'economy') {
        // Provide a morning-delivery option for ground
        if (i === 0) {
          delivery_time_commitment = 'by_end_of_day';
          delivery_time_window_label = 'by 6:00 PM';
        } else {
          delivery_time_commitment = 'by_noon';
          delivery_time_window_label = 'by 12:00 PM';
          is_morning_delivery = true;
        }
      } else if (service_mode === 'air_freight' && (level === 'priority' || level === 'express')) {
        delivery_time_commitment = 'by_end_of_day';
        delivery_time_window_label = 'by 6:00 PM';
      } else {
        delivery_time_commitment = 'date_only';
        delivery_time_window_label = null;
      }

      const option = {
        id: this._generateId('svc'),
        quote_request_id: quoteId,
        created_at: now,
        carrier_name: null,
        service_name: name,
        service_code: null,
        service_mode: service_mode || 'unknown',
        service_level: level,
        is_refrigerated_supported: service_mode === 'refrigerated' || special_handling === 'refrigerated' || special_handling === 'temperature_controlled',
        is_dangerous_goods_supported: !!contains_dangerous_goods,
        price_total: Math.max(50, Math.round(basePrice * multiplier)),
        currency: currency,
        fuel_surcharge: null,
        estimated_transit_days: transitDays,
        estimated_pickup_datetime: pickup_date || pickupDate.toISOString(),
        estimated_delivery_datetime: this._formatISO(deliveryDate),
        delivery_time_commitment: delivery_time_commitment,
        delivery_time_window_label: delivery_time_window_label,
        is_morning_delivery: is_morning_delivery,
        is_available: true,
        sort_index: i
      };

      service_options.push(option);
      serviceOptionsStore.push(option);
    }

    this._saveToStorage('service_options', serviceOptionsStore);

    return {
      quote_request,
      service_options
    };
  }

  // 5) getOceanFclContainerOptions
  getOceanFclContainerOptions(
    origin_port_name,
    destination_port_name,
    shipment_volume,
    shipment_volume_unit,
    total_weight,
    weight_unit,
    pickup_date
  ) {
    const now = new Date().toISOString();
    const quoteId = this._generateId('quote');

    const quote_request = {
      id: quoteId,
      created_at: now,
      origin_display: null,
      destination_display: null,
      origin_street: null,
      origin_city: null,
      origin_state: null,
      origin_postal_code: null,
      origin_country: null,
      destination_street: null,
      destination_city: null,
      destination_state: null,
      destination_postal_code: null,
      destination_country: null,
      origin_port_name: origin_port_name,
      destination_port_name: destination_port_name,
      service_mode: 'ocean_freight',
      ocean_mode: 'fcl',
      is_domestic: false,
      pickup_date: pickup_date || null,
      pickup_time_window_label: null,
      requested_delivery_date: null,
      total_weight: typeof total_weight === 'number' ? total_weight : null,
      weight_unit: weight_unit || null,
      total_volume: shipment_volume,
      volume_unit: shipment_volume_unit,
      num_pieces: null,
      has_multi_packages: false,
      special_handling: 'none',
      contains_dangerous_goods: false,
      quote_status: 'rated'
    };

    const quoteRequests = this._getFromStorage('shipment_quote_requests', []);
    quoteRequests.push(quote_request);
    this._saveToStorage('shipment_quote_requests', quoteRequests);

    const containerTypes = this._getFromStorage('container_types', []);
    const containerRateOptionsStore = this._getFromStorage('container_rate_options', []);

    const container_options = [];

    for (let i = 0; i < containerTypes.length; i++) {
      const ct = containerTypes[i];
      if (typeof ct.capacity_volume_m3 !== 'number') continue;

      const capacity = ct.capacity_volume_m3;
      if (capacity < shipment_volume) continue;

      const basePrice = capacity * 80; // simple deterministic formula
      const transitDays = this._estimateTransitDays('ocean_freight', false, 'standard');

      const rateOptionId = this._generateId('cont_rate');
      const rateOption = {
        id: rateOptionId,
        quote_request_id: quoteId,
        container_type_id: ct.id,
        capacity_volume_m3: capacity,
        price_total: Math.round(basePrice),
        currency: 'usd',
        estimated_transit_days: transitDays,
        estimated_delivery_datetime: pickup_date
          ? this._formatISO(this._addDays(this._parseISODate(pickup_date), transitDays))
          : null,
        is_available: true
      };

      containerRateOptionsStore.push(rateOption);

      container_options.push({
        container_rate_option_id: rateOption.id,
        container_type_id: ct.id,
        container_type_name: ct.name,
        capacity_volume_m3: rateOption.capacity_volume_m3,
        price_total: rateOption.price_total,
        currency: rateOption.currency,
        estimated_transit_days: rateOption.estimated_transit_days,
        estimated_delivery_datetime: rateOption.estimated_delivery_datetime,
        is_available: rateOption.is_available,
        // Foreign key resolution
        container_type: ct
      });
    }

    this._saveToStorage('container_rate_options', containerRateOptionsStore);

    return {
      quote_request,
      container_options
    };
  }

  // 6) saveQuoteForServiceOption
  saveQuoteForServiceOption(quote_request_id, service_option_id, label, notes) {
    const quoteRequests = this._getFromStorage('shipment_quote_requests', []);
    const serviceOptions = this._getFromStorage('service_options', []);
    const savedQuotes = this._getFromStorage('saved_quotes', []);

    const quote = this._findById(quoteRequests, quote_request_id);
    const serviceOption = this._findById(serviceOptions, service_option_id);

    if (!quote || !serviceOption) {
      return { saved_quote: null };
    }

    const now = new Date().toISOString();
    const expiresAt = this._formatISO(this._addDays(new Date(), 30));

    const savedQuote = {
      id: this._generateId('saved_quote'),
      created_at: now,
      quote_request_id: quote_request_id,
      service_option_id: service_option_id,
      label:
        label ||
        (quote.origin_display && quote.destination_display
          ? 'Quote ' + quote.origin_display + ' -> ' + quote.destination_display
          : 'Saved Quote'),
      notes: notes || null,
      price_total: serviceOption.price_total,
      currency: serviceOption.currency,
      estimated_transit_days: serviceOption.estimated_transit_days || null,
      estimated_delivery_datetime: serviceOption.estimated_delivery_datetime || null,
      service_mode: quote.service_mode || serviceOption.service_mode || 'unknown',
      is_active: true,
      expires_at: expiresAt,
      // denormalized for fast display
      origin_display: quote.origin_display || quote.origin_port_name || '',
      destination_display: quote.destination_display || quote.destination_port_name || ''
    };

    savedQuotes.push(savedQuote);
    this._saveToStorage('saved_quotes', savedQuotes);

    return {
      saved_quote: {
        id: savedQuote.id,
        created_at: savedQuote.created_at,
        quote_request_id: savedQuote.quote_request_id,
        service_option_id: savedQuote.service_option_id,
        label: savedQuote.label,
        notes: savedQuote.notes,
        price_total: savedQuote.price_total,
        currency: savedQuote.currency,
        estimated_transit_days: savedQuote.estimated_transit_days,
        estimated_delivery_datetime: savedQuote.estimated_delivery_datetime,
        service_mode: savedQuote.service_mode,
        is_active: savedQuote.is_active,
        expires_at: savedQuote.expires_at,
        origin_display: savedQuote.origin_display,
        destination_display: savedQuote.destination_display
      }
    };
  }

  // 7) getSavedQuotesList
  getSavedQuotesList() {
    const savedQuotes = this._getFromStorage('saved_quotes', []);
    const list = savedQuotes.map((sq) => ({
      saved_quote_id: sq.id,
      label: sq.label || '',
      origin_display: sq.origin_display || '',
      destination_display: sq.destination_display || '',
      service_mode: sq.service_mode || 'unknown',
      price_total: sq.price_total,
      currency: sq.currency,
      estimated_transit_days: sq.estimated_transit_days || null,
      created_at: sq.created_at,
      expires_at: sq.expires_at || null,
      is_active: sq.is_active !== false
    }));

    return list;
  }

  // 8) getSavedQuoteDetails
  getSavedQuoteDetails(saved_quote_id) {
    const savedQuotes = this._getFromStorage('saved_quotes', []);
    const quoteRequests = this._getFromStorage('shipment_quote_requests', []);
    const serviceOptions = this._getFromStorage('service_options', []);
    const packageItems = this._getFromStorage('package_items', []);

    const savedQuote = savedQuotes.find((sq) => sq.id === saved_quote_id) || null;
    if (!savedQuote) {
      return {
        saved_quote: null,
        quote_request: null,
        service_option: null,
        packages: []
      };
    }

    const quote = this._findById(quoteRequests, savedQuote.quote_request_id) || null;
    const svc = this._findById(serviceOptions, savedQuote.service_option_id) || null;

    const packages = packageItems
      .filter((p) => p.quote_request_id === savedQuote.quote_request_id)
      .sort((a, b) => a.package_index - b.package_index)
      .map((p) => ({
        package_index: p.package_index,
        weight: p.weight,
        weight_unit: p.weight_unit,
        length: p.length,
        width: p.width,
        height: p.height,
        dimension_unit: p.dimension_unit,
        description: p.description || ''
      }));

    return {
      saved_quote: {
        id: savedQuote.id,
        label: savedQuote.label,
        notes: savedQuote.notes,
        price_total: savedQuote.price_total,
        currency: savedQuote.currency,
        service_mode: savedQuote.service_mode,
        estimated_transit_days: savedQuote.estimated_transit_days,
        estimated_delivery_datetime: savedQuote.estimated_delivery_datetime,
        origin_display: savedQuote.origin_display,
        destination_display: savedQuote.destination_display
      },
      quote_request: quote
        ? {
            id: quote.id,
            origin_display: quote.origin_display || quote.origin_port_name || '',
            destination_display: quote.destination_display || quote.destination_port_name || '',
            service_mode: quote.service_mode,
            pickup_date: quote.pickup_date,
            pickup_time_window_label: quote.pickup_time_window_label,
            total_weight: quote.total_weight,
            weight_unit: quote.weight_unit,
            total_volume: quote.total_volume,
            volume_unit: quote.volume_unit,
            num_pieces: quote.num_pieces,
            special_handling: quote.special_handling
          }
        : null,
      service_option: svc
        ? {
            id: svc.id,
            carrier_name: svc.carrier_name,
            service_name: svc.service_name,
            service_mode: svc.service_mode,
            service_level: svc.service_level,
            price_total: svc.price_total,
            currency: svc.currency,
            estimated_transit_days: svc.estimated_transit_days,
            estimated_delivery_datetime: svc.estimated_delivery_datetime,
            delivery_time_commitment: svc.delivery_time_commitment,
            delivery_time_window_label: svc.delivery_time_window_label
          }
        : null,
      packages
    };
  }

  // 9) deleteSavedQuote
  deleteSavedQuote(saved_quote_id) {
    const savedQuotes = this._getFromStorage('saved_quotes', []);
    const idx = savedQuotes.findIndex((sq) => sq.id === saved_quote_id);
    if (idx === -1) {
      return { success: false, message: 'Saved quote not found' };
    }

    // Soft delete: deactivate
    savedQuotes[idx].is_active = false;
    this._saveToStorage('saved_quotes', savedQuotes);

    return { success: true, message: 'Saved quote deactivated' };
  }

  // 10) getBookingReviewDetails
  getBookingReviewDetails(quote_request_id, service_option_id) {
    const quoteRequests = this._getFromStorage('shipment_quote_requests', []);
    const serviceOptions = this._getFromStorage('service_options', []);
    const packageItems = this._getFromStorage('package_items', []);

    const quote = this._findById(quoteRequests, quote_request_id) || null;
    const svc = this._findById(serviceOptions, service_option_id) || null;

    const packages = packageItems
      .filter((p) => p.quote_request_id === quote_request_id)
      .sort((a, b) => a.package_index - b.package_index)
      .map((p) => ({
        package_index: p.package_index,
        weight: p.weight,
        weight_unit: p.weight_unit,
        length: p.length,
        width: p.width,
        height: p.height,
        dimension_unit: p.dimension_unit,
        description: p.description || ''
      }));

    return {
      quote_summary: quote
        ? {
            quote_request_id: quote.id,
            origin_display: quote.origin_display || quote.origin_port_name || '',
            destination_display: quote.destination_display || quote.destination_port_name || '',
            service_mode: quote.service_mode,
            pickup_date: quote.pickup_date,
            pickup_time_window_label: quote.pickup_time_window_label,
            requested_delivery_date: quote.requested_delivery_date,
            num_pieces: quote.num_pieces,
            total_weight: quote.total_weight,
            weight_unit: quote.weight_unit,
            total_volume: quote.total_volume,
            volume_unit: quote.volume_unit,
            special_handling: quote.special_handling
          }
        : null,
      service_summary: svc
        ? {
            service_option_id: svc.id,
            carrier_name: svc.carrier_name,
            service_name: svc.service_name,
            service_level: svc.service_level,
            price_total: svc.price_total,
            currency: svc.currency,
            estimated_transit_days: svc.estimated_transit_days,
            estimated_delivery_datetime: svc.estimated_delivery_datetime,
            delivery_time_commitment: svc.delivery_time_commitment,
            delivery_time_window_label: svc.delivery_time_window_label,
            is_morning_delivery: !!svc.is_morning_delivery
          }
        : null,
      packages
    };
  }

  // 11) getContainerBookingReviewDetails
  getContainerBookingReviewDetails(quote_request_id, container_rate_option_id) {
    const quoteRequests = this._getFromStorage('shipment_quote_requests', []);
    const rateOptions = this._getFromStorage('container_rate_options', []);
    const containerTypes = this._getFromStorage('container_types', []);

    const quote = this._findById(quoteRequests, quote_request_id) || null;
    const rateOpt = this._findById(rateOptions, container_rate_option_id) || null;
    let containerType = null;
    if (rateOpt) {
      containerType = containerTypes.find((ct) => ct.id === rateOpt.container_type_id) || null;
    }

    return {
      quote_summary: quote
        ? {
            quote_request_id: quote.id,
            origin_port_name: quote.origin_port_name,
            destination_port_name: quote.destination_port_name,
            service_mode: quote.service_mode,
            ocean_mode: quote.ocean_mode,
            total_volume: quote.total_volume,
            volume_unit: quote.volume_unit,
            total_weight: quote.total_weight,
            weight_unit: quote.weight_unit
          }
        : null,
      container_option_summary: rateOpt
        ? {
            container_rate_option_id: rateOpt.id,
            container_type_id: rateOpt.container_type_id,
            container_type_name: containerType ? containerType.name : null,
            capacity_volume_m3: rateOpt.capacity_volume_m3,
            price_total: rateOpt.price_total,
            currency: rateOpt.currency,
            estimated_transit_days: rateOpt.estimated_transit_days,
            estimated_delivery_datetime: rateOpt.estimated_delivery_datetime,
            // Foreign key resolution
            container_type: containerType
          }
        : null
    };
  }

  // 12) confirmShipmentBooking
  confirmShipmentBooking(quote_request_id, service_option_id) {
    const quoteRequests = this._getFromStorage('shipment_quote_requests', []);
    const serviceOptions = this._getFromStorage('service_options', []);
    const packageItems = this._getFromStorage('package_items', []);
    const bookings = this._getFromStorage('shipment_bookings', []);
    const trackingEvents = this._getFromStorage('tracking_events', []);

    const quote = this._findById(quoteRequests, quote_request_id);
    const svc = this._findById(serviceOptions, service_option_id);

    if (!quote || !svc) {
      return { success: false, booking: null };
    }

    const now = new Date();
    const nowISO = now.toISOString();

    const trackingNumber = this._generateTrackingNumber();

    const pickupDate = quote.pickup_date ? this._parseISODate(quote.pickup_date) : now;
    const transitDays = svc.estimated_transit_days || this._estimateTransitDays(quote.service_mode, quote.is_domestic, svc.service_level);
    const deliveryDate = this._addDays(pickupDate, transitDays);

    const relatedPackages = packageItems.filter((p) => p.quote_request_id === quote_request_id);

    const booking = {
      id: this._generateId('booking'),
      created_at: nowISO,
      booking_reference: 'BKG' + this._getNextIdCounter(),
      quote_request_id: quote_request_id,
      service_option_id: service_option_id,
      container_rate_option_id: null,
      recurring_schedule_id: null,
      booking_status: 'confirmed',
      tracking_number: trackingNumber,
      origin_street: quote.origin_street || quote.origin_display || '',
      origin_city: quote.origin_city || (quote.origin_display ? quote.origin_display.split(',')[0].trim() : ''),
      origin_state: quote.origin_state || null,
      origin_postal_code: quote.origin_postal_code || null,
      origin_country: quote.origin_country || (quote.origin_display && quote.origin_display.indexOf(',') !== -1
        ? quote.origin_display.split(',').slice(-1)[0].trim()
        : ''),
      destination_street: quote.destination_street || quote.destination_display || '',
      destination_city: quote.destination_city || (quote.destination_display ? quote.destination_display.split(',')[0].trim() : ''),
      destination_state: quote.destination_state || null,
      destination_postal_code: quote.destination_postal_code || null,
      destination_country: quote.destination_country || (quote.destination_display && quote.destination_display.indexOf(',') !== -1
        ? quote.destination_display.split(',').slice(-1)[0].trim()
        : ''),
      origin_saved_address_id: null,
      destination_saved_address_id: null,
      pickup_date: pickupDate.toISOString(),
      pickup_time_window_label: quote.pickup_time_window_label || null,
      delivery_date_estimated: deliveryDate.toISOString(),
      delivery_time_window_label: svc.delivery_time_window_label || null,
      delivery_date_committed: null,
      delivery_address_notes: null,
      num_packages: quote.num_pieces || relatedPackages.length || null,
      total_weight: quote.total_weight,
      weight_unit: quote.weight_unit,
      total_volume: quote.total_volume,
      volume_unit: quote.volume_unit,
      service_mode: quote.service_mode || svc.service_mode || 'unknown',
      service_level: svc.service_level || null,
      special_handling: quote.special_handling || 'none',
      contains_dangerous_goods: !!quote.contains_dangerous_goods,
      price_total: svc.price_total,
      currency: svc.currency,
      payment_status: 'unpaid',
      is_recurring_instance: false
    };

    bookings.push(booking);
    this._saveToStorage('shipment_bookings', bookings);

    // Link any related package items to this booking
    if (relatedPackages && relatedPackages.length) {
      for (let i = 0; i < packageItems.length; i++) {
        if (packageItems[i].quote_request_id === quote_request_id) {
          packageItems[i].booking_id = booking.id;
        }
      }
      this._saveToStorage('package_items', packageItems);
    }

    // Update quote status
    for (let i = 0; i < quoteRequests.length; i++) {
      if (quoteRequests[i].id === quote_request_id) {
        quoteRequests[i].quote_status = 'converted_to_booking';
        break;
      }
    }
    this._saveToStorage('shipment_quote_requests', quoteRequests);

    // Initial tracking event
    const event = {
      id: this._generateId('trk_evt'),
      shipment_booking_id: booking.id,
      tracking_number: trackingNumber,
      status: 'created',
      location_city: booking.origin_city,
      location_state: booking.origin_state,
      location_country: booking.origin_country,
      description: 'Shipment created',
      event_time: nowISO,
      is_current: true
    };

    // Clear previous is_current flags for this tracking number if any
    for (let i = 0; i < trackingEvents.length; i++) {
      if (trackingEvents[i].tracking_number === trackingNumber) {
        trackingEvents[i].is_current = false;
      }
    }

    trackingEvents.push(event);
    this._saveToStorage('tracking_events', trackingEvents);

    return {
      success: true,
      booking
    };
  }

  // 13) confirmContainerBooking
  confirmContainerBooking(quote_request_id, container_rate_option_id) {
    const quoteRequests = this._getFromStorage('shipment_quote_requests', []);
    const rateOptions = this._getFromStorage('container_rate_options', []);
    const bookings = this._getFromStorage('shipment_bookings', []);
    const trackingEvents = this._getFromStorage('tracking_events', []);

    const quote = this._findById(quoteRequests, quote_request_id);
    const rateOpt = this._findById(rateOptions, container_rate_option_id);

    if (!quote || !rateOpt) {
      return { success: false, booking: null };
    }

    const now = new Date();
    const nowISO = now.toISOString();

    const trackingNumber = this._generateTrackingNumber();

    const pickupDate = quote.pickup_date ? this._parseISODate(quote.pickup_date) : now;
    const transitDays = rateOpt.estimated_transit_days || this._estimateTransitDays('ocean_freight', false, 'standard');
    const deliveryDate = this._addDays(pickupDate, transitDays);

    const booking = {
      id: this._generateId('booking'),
      created_at: nowISO,
      booking_reference: 'BKG' + this._getNextIdCounter(),
      quote_request_id: quote_request_id,
      service_option_id: null,
      container_rate_option_id: container_rate_option_id,
      recurring_schedule_id: null,
      booking_status: 'confirmed',
      tracking_number: trackingNumber,
      origin_street: quote.origin_port_name || '',
      origin_city: quote.origin_port_name ? quote.origin_port_name.split(',')[0].trim() : '',
      origin_state: null,
      origin_postal_code: null,
      origin_country: quote.origin_port_name && quote.origin_port_name.indexOf(',') !== -1
        ? quote.origin_port_name.split(',').slice(-1)[0].trim()
        : '',
      destination_street: quote.destination_port_name || '',
      destination_city: quote.destination_port_name ? quote.destination_port_name.split(',')[0].trim() : '',
      destination_state: null,
      destination_postal_code: null,
      destination_country: quote.destination_port_name && quote.destination_port_name.indexOf(',') !== -1
        ? quote.destination_port_name.split(',').slice(-1)[0].trim()
        : '',
      origin_saved_address_id: null,
      destination_saved_address_id: null,
      pickup_date: pickupDate.toISOString(),
      pickup_time_window_label: null,
      delivery_date_estimated: deliveryDate.toISOString(),
      delivery_time_window_label: null,
      delivery_date_committed: null,
      delivery_address_notes: null,
      num_packages: 1,
      total_weight: quote.total_weight,
      weight_unit: quote.weight_unit,
      total_volume: quote.total_volume,
      volume_unit: quote.volume_unit,
      service_mode: 'ocean_freight',
      service_level: 'standard',
      special_handling: quote.special_handling || 'none',
      contains_dangerous_goods: !!quote.contains_dangerous_goods,
      price_total: rateOpt.price_total,
      currency: rateOpt.currency,
      payment_status: 'unpaid',
      is_recurring_instance: false
    };

    bookings.push(booking);
    this._saveToStorage('shipment_bookings', bookings);

    // Update quote status
    for (let i = 0; i < quoteRequests.length; i++) {
      if (quoteRequests[i].id === quote_request_id) {
        quoteRequests[i].quote_status = 'converted_to_booking';
        break;
      }
    }
    this._saveToStorage('shipment_quote_requests', quoteRequests);

    const event = {
      id: this._generateId('trk_evt'),
      shipment_booking_id: booking.id,
      tracking_number: trackingNumber,
      status: 'created',
      location_city: booking.origin_city,
      location_state: booking.origin_state,
      location_country: booking.origin_country,
      description: 'Shipment created',
      event_time: nowISO,
      is_current: true
    };

    for (let i = 0; i < trackingEvents.length; i++) {
      if (trackingEvents[i].tracking_number === trackingNumber) {
        trackingEvents[i].is_current = false;
      }
    }

    trackingEvents.push(event);
    this._saveToStorage('tracking_events', trackingEvents);

    return {
      success: true,
      booking
    };
  }

  // 14) trackShipment
  trackShipment(tracking_number) {
    const bookings = this._getFromStorage('shipment_bookings', []);
    const trackingEvents = this._getFromStorage('tracking_events', []);

    const booking = bookings.find((b) => b.tracking_number === tracking_number) || null;

    const events = trackingEvents
      .filter((e) => e.tracking_number === tracking_number)
      .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());

    const booking_summary = booking
      ? {
          shipment_booking_id: booking.id,
          booking_reference: booking.booking_reference,
          tracking_number: booking.tracking_number,
          booking_status: booking.booking_status,
          origin_city: booking.origin_city,
          origin_country: booking.origin_country,
          destination_city: booking.destination_city,
          destination_country: booking.destination_country,
          delivery_date_estimated: booking.delivery_date_estimated,
          delivery_time_window_label: booking.delivery_time_window_label,
          // Foreign key resolution
          shipment_booking: booking
        }
      : null;

    const tracking_events = events.map((e) => ({
      status: e.status,
      location_city: e.location_city,
      location_state: e.location_state,
      location_country: e.location_country,
      description: e.description,
      event_time: e.event_time,
      is_current: !!e.is_current
    }));

    return {
      booking_summary,
      tracking_events
    };
  }

  // 15) updateDeliveryDetails
  updateDeliveryDetails(
    tracking_number,
    new_delivery_street,
    new_delivery_city,
    new_delivery_state,
    new_delivery_postal_code,
    new_delivery_country,
    new_delivery_date,
    delivery_address_notes
  ) {
    const bookings = this._getFromStorage('shipment_bookings', []);
    const deliveryChanges = this._getFromStorage('delivery_change_requests', []);

    const booking = bookings.find((b) => b.tracking_number === tracking_number) || null;
    if (!booking) {
      return {
        success: false,
        delivery_change_request: null,
        updated_booking: null
      };
    }

    const now = new Date().toISOString();

    const dcr = {
      id: this._generateId('dlv_change'),
      shipment_booking_id: booking.id,
      tracking_number: tracking_number,
      created_at: now,
      old_delivery_street: booking.destination_street,
      old_delivery_city: booking.destination_city,
      old_delivery_state: booking.destination_state,
      old_delivery_postal_code: booking.destination_postal_code,
      old_delivery_country: booking.destination_country,
      old_delivery_date: booking.delivery_date_estimated,
      new_delivery_street: new_delivery_street,
      new_delivery_city: new_delivery_city || booking.destination_city,
      new_delivery_state: new_delivery_state || booking.destination_state,
      new_delivery_postal_code: new_delivery_postal_code || booking.destination_postal_code,
      new_delivery_country: new_delivery_country || booking.destination_country,
      new_delivery_date: new_delivery_date,
      status: 'approved',
      confirmed_at: now
    };

    deliveryChanges.push(dcr);
    this._saveToStorage('delivery_change_requests', deliveryChanges);

    // Apply changes to booking
    for (let i = 0; i < bookings.length; i++) {
      if (bookings[i].id === booking.id) {
        bookings[i].destination_street = dcr.new_delivery_street;
        bookings[i].destination_city = dcr.new_delivery_city;
        bookings[i].destination_state = dcr.new_delivery_state;
        bookings[i].destination_postal_code = dcr.new_delivery_postal_code;
        bookings[i].destination_country = dcr.new_delivery_country;
        bookings[i].delivery_date_estimated = dcr.new_delivery_date;
        bookings[i].delivery_address_notes = delivery_address_notes || bookings[i].delivery_address_notes || null;
        break;
      }
    }

    this._saveToStorage('shipment_bookings', bookings);

    const updated = bookings.find((b) => b.id === booking.id);

    return {
      success: true,
      delivery_change_request: dcr,
      updated_booking: updated
        ? {
            shipment_booking_id: updated.id,
            destination_street: updated.destination_street,
            destination_city: updated.destination_city,
            destination_state: updated.destination_state,
            destination_postal_code: updated.destination_postal_code,
            destination_country: updated.destination_country,
            delivery_date_estimated: updated.delivery_date_estimated,
            delivery_time_window_label: updated.delivery_time_window_label,
            delivery_address_notes: updated.delivery_address_notes || null
          }
        : null
    };
  }

  // 16) getHelpCategories
  getHelpCategories() {
    const categories = this._getFromStorage('help_categories', []);
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      icon: c.icon || ''
    }));
  }

  // 17) searchHelpArticles
  searchHelpArticles(query, category_id) {
    const q = (query || '').toLowerCase();
    const articles = this._getFromStorage('help_articles', []);
    const categories = this._getFromStorage('help_categories', []);

    const results = [];
    for (let i = 0; i < articles.length; i++) {
      const a = articles[i];
      if (!a.is_published) continue;
      if (category_id && a.category_id !== category_id) continue;

      const inTitle = a.title && a.title.toLowerCase().indexOf(q) !== -1;
      const inBody = a.body && a.body.toLowerCase().indexOf(q) !== -1;
      const inKeywords = Array.isArray(a.keywords)
        ? a.keywords.some((k) => String(k).toLowerCase().indexOf(q) !== -1)
        : false;

      if (!q || inTitle || inBody || inKeywords) {
        const category = categories.find((c) => c.id === a.category_id) || null;
        const excerpt = a.body ? a.body.substring(0, 200) : '';
        results.push({
          article_id: a.id,
          title: a.title,
          slug: a.slug,
          category_id: a.category_id,
          category_name: category ? category.name : '',
          excerpt,
          // Foreign key resolution
          category
        });
      }
    }

    return results;
  }

  // 18) getHelpArticlesByCategory
  getHelpArticlesByCategory(category_id) {
    const articles = this._getFromStorage('help_articles', []);
    const filtered = articles.filter((a) => a.category_id === category_id && a.is_published);

    return filtered.map((a) => ({
      article_id: a.id,
      title: a.title,
      slug: a.slug,
      excerpt: a.body ? a.body.substring(0, 200) : '',
      created_at: a.created_at
    }));
  }

  // 19) getHelpArticle
  getHelpArticle(article_id) {
    const articles = this._getFromStorage('help_articles', []);
    const categories = this._getFromStorage('help_categories', []);

    const article = articles.find((a) => a.id === article_id) || null;
    if (!article) {
      return {
        article: null,
        related_articles: []
      };
    }

    const category = categories.find((c) => c.id === article.category_id) || null;

    const related_articles = [];
    if (Array.isArray(article.related_article_ids)) {
      for (let i = 0; i < article.related_article_ids.length; i++) {
        const rid = article.related_article_ids[i];
        const ra = articles.find((a) => a.id === rid);
        if (ra && ra.is_published) {
          related_articles.push({
            article_id: ra.id,
            title: ra.title,
            slug: ra.slug
          });
        }
      }
    }

    return {
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        body: article.body,
        category_id: article.category_id,
        category_name: category ? category.name : '',
        created_at: article.created_at,
        updated_at: article.updated_at || null,
        // Foreign key resolution
        category
      },
      related_articles
    };
  }

  // 20) submitSupportInquiry
  submitSupportInquiry(
    source,
    from_article_id,
    topic_category,
    subject,
    message,
    contact_email,
    contact_phone,
    preferred_contact_method
  ) {
    const inquiries = this._getFromStorage('support_inquiries', []);
    const now = new Date().toISOString();

    const inquiry = {
      id: this._generateId('inquiry'),
      created_at: now,
      source: source,
      from_article_id: from_article_id || null,
      topic_category: topic_category,
      subject: subject,
      message: message,
      contact_email: contact_email,
      contact_phone: contact_phone || null,
      preferred_contact_method: preferred_contact_method,
      status: 'open',
      reply_message: null,
      replied_at: null
    };

    inquiries.push(inquiry);
    this._saveToStorage('support_inquiries', inquiries);

    return {
      success: true,
      inquiry: {
        id: inquiry.id,
        created_at: inquiry.created_at,
        status: inquiry.status,
        expected_response_time: 'within_1_business_day'
      },
      message: 'Inquiry submitted successfully.'
    };
  }

  // 21) getSavedAddresses
  getSavedAddresses() {
    const addresses = this._getFromStorage('saved_addresses', []);
    return addresses.map((a) => ({
      address_id: a.id,
      label: a.label,
      contact_name: a.contact_name || '',
      company_name: a.company_name || '',
      street: a.street,
      city: a.city,
      state: a.state || '',
      postal_code: a.postal_code,
      country: a.country,
      phone: a.phone || '',
      email: a.email || '',
      address_type: a.address_type || 'other',
      is_default_pickup: !!a.is_default_pickup,
      notes: a.notes || '',
      created_at: a.created_at
    }));
  }

  // 22) addSavedAddress
  addSavedAddress(
    label,
    contact_name,
    company_name,
    street,
    city,
    state,
    postal_code,
    country,
    phone,
    email,
    address_type,
    is_default_pickup,
    notes
  ) {
    const addresses = this._getFromStorage('saved_addresses', []);
    const now = new Date().toISOString();

    const addr = {
      id: this._generateId('addr'),
      created_at: now,
      label: label,
      contact_name: contact_name || null,
      company_name: company_name || null,
      street: street,
      city: city,
      state: state || null,
      postal_code: postal_code,
      country: country,
      phone: phone || null,
      email: email || null,
      address_type: address_type || 'other',
      is_default_pickup: !!is_default_pickup,
      notes: notes || null
    };

    if (addr.is_default_pickup) {
      for (let i = 0; i < addresses.length; i++) {
        addresses[i].is_default_pickup = false;
      }
    } else if (!addresses.some((a) => a.is_default_pickup)) {
      // If no default yet, set this as default
      addr.is_default_pickup = true;
    }

    addresses.push(addr);
    this._saveToStorage('saved_addresses', addresses);

    return {
      saved_address: {
        address_id: addr.id,
        label: addr.label,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        postal_code: addr.postal_code,
        country: addr.country,
        address_type: addr.address_type,
        is_default_pickup: addr.is_default_pickup
      }
    };
  }

  // 23) updateSavedAddress
  updateSavedAddress(
    address_id,
    label,
    contact_name,
    company_name,
    street,
    city,
    state,
    postal_code,
    country,
    phone,
    email,
    address_type,
    notes,
    is_default_pickup
  ) {
    const addresses = this._getFromStorage('saved_addresses', []);
    const idx = addresses.findIndex((a) => a.id === address_id);
    if (idx === -1) {
      return {
        saved_address: null
      };
    }

    const addr = addresses[idx];

    if (typeof label !== 'undefined') addr.label = label;
    if (typeof contact_name !== 'undefined') addr.contact_name = contact_name;
    if (typeof company_name !== 'undefined') addr.company_name = company_name;
    if (typeof street !== 'undefined') addr.street = street;
    if (typeof city !== 'undefined') addr.city = city;
    if (typeof state !== 'undefined') addr.state = state;
    if (typeof postal_code !== 'undefined') addr.postal_code = postal_code;
    if (typeof country !== 'undefined') addr.country = country;
    if (typeof phone !== 'undefined') addr.phone = phone;
    if (typeof email !== 'undefined') addr.email = email;
    if (typeof address_type !== 'undefined') addr.address_type = address_type;
    if (typeof notes !== 'undefined') addr.notes = notes;

    if (typeof is_default_pickup === 'boolean') {
      if (is_default_pickup) {
        for (let i = 0; i < addresses.length; i++) {
          addresses[i].is_default_pickup = false;
        }
        addr.is_default_pickup = true;
      } else {
        addr.is_default_pickup = false;
      }
    }

    addresses[idx] = addr;
    this._saveToStorage('saved_addresses', addresses);

    return {
      saved_address: {
        address_id: addr.id,
        label: addr.label,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        postal_code: addr.postal_code,
        country: addr.country,
        address_type: addr.address_type,
        is_default_pickup: addr.is_default_pickup,
        notes: addr.notes || null
      }
    };
  }

  // 24) deleteSavedAddress
  deleteSavedAddress(address_id) {
    const addresses = this._getFromStorage('saved_addresses', []);
    const idx = addresses.findIndex((a) => a.id === address_id);
    if (idx === -1) {
      return { success: false, message: 'Address not found' };
    }

    const wasDefault = !!addresses[idx].is_default_pickup;
    addresses.splice(idx, 1);

    if (wasDefault && addresses.length) {
      // Set first as default
      addresses[0].is_default_pickup = true;
    }

    this._saveToStorage('saved_addresses', addresses);

    return { success: true, message: 'Address deleted' };
  }

  // 25) setDefaultPickupAddress
  setDefaultPickupAddress(address_id) {
    const addresses = this._getFromStorage('saved_addresses', []);
    let defaultAddr = null;

    for (let i = 0; i < addresses.length; i++) {
      if (addresses[i].id === address_id) {
        addresses[i].is_default_pickup = true;
        defaultAddr = addresses[i];
      } else {
        addresses[i].is_default_pickup = false;
      }
    }

    this._saveToStorage('saved_addresses', addresses);

    return {
      success: !!defaultAddr,
      default_pickup_address: defaultAddr
        ? {
            address_id: defaultAddr.id,
            label: defaultAddr.label,
            street: defaultAddr.street,
            city: defaultAddr.city,
            state: defaultAddr.state,
            postal_code: defaultAddr.postal_code,
            country: defaultAddr.country,
            is_default_pickup: defaultAddr.is_default_pickup
          }
        : null
    };
  }

  // 26) createRecurringPickupSchedule
  createRecurringPickupSchedule(
    schedule_name,
    pickup_street,
    pickup_city,
    pickup_state,
    pickup_postal_code,
    pickup_country,
    frequency,
    primary_weekday,
    weekdays,
    pickup_time_label,
    time_window_label,
    start_date,
    end_date,
    service_type
  ) {
    const schedules = this._getFromStorage('recurring_pickup_schedules', []);
    const now = new Date().toISOString();

    const schedule = {
      id: this._generateId('recur'),
      created_at: now,
      schedule_name: schedule_name || null,
      pickup_street,
      pickup_city,
      pickup_state: pickup_state || null,
      pickup_postal_code,
      pickup_country,
      frequency,
      primary_weekday: primary_weekday || null,
      weekdays: Array.isArray(weekdays) ? weekdays : null,
      pickup_time_label,
      time_window_label: time_window_label || null,
      start_date,
      end_date,
      service_type,
      is_active: true,
      last_run_at: null
    };

    schedules.push(schedule);
    this._saveToStorage('recurring_pickup_schedules', schedules);

    return {
      schedule: {
        id: schedule.id,
        created_at: schedule.created_at,
        schedule_name: schedule.schedule_name,
        pickup_street: schedule.pickup_street,
        pickup_city: schedule.pickup_city,
        pickup_state: schedule.pickup_state,
        pickup_postal_code: schedule.pickup_postal_code,
        pickup_country: schedule.pickup_country,
        frequency: schedule.frequency,
        primary_weekday: schedule.primary_weekday,
        weekdays: schedule.weekdays || [],
        pickup_time_label: schedule.pickup_time_label,
        time_window_label: schedule.time_window_label,
        start_date: schedule.start_date,
        end_date: schedule.end_date,
        service_type: schedule.service_type,
        is_active: schedule.is_active
      }
    };
  }

  // 27) getRecurringPickupSchedules
  getRecurringPickupSchedules() {
    const schedules = this._getFromStorage('recurring_pickup_schedules', []);
    return schedules.map((s) => ({
      schedule_id: s.id,
      schedule_name: s.schedule_name || '',
      pickup_city: s.pickup_city,
      pickup_postal_code: s.pickup_postal_code,
      frequency: s.frequency,
      weekdays: s.weekdays || [],
      pickup_time_label: s.pickup_time_label,
      time_window_label: s.time_window_label || null,
      start_date: s.start_date,
      end_date: s.end_date,
      service_type: s.service_type,
      is_active: s.is_active !== false,
      last_run_at: s.last_run_at || null,
      // Foreign key resolution-like (schedule_id -> schedule)
      schedule: s
    }));
  }

  // 28) updateRecurringPickupSchedule
  updateRecurringPickupSchedule(
    recurring_schedule_id,
    schedule_name,
    pickup_street,
    pickup_city,
    pickup_state,
    pickup_postal_code,
    pickup_country,
    frequency,
    primary_weekday,
    weekdays,
    pickup_time_label,
    time_window_label,
    start_date,
    end_date,
    service_type,
    is_active
  ) {
    const schedules = this._getFromStorage('recurring_pickup_schedules', []);
    const idx = schedules.findIndex((s) => s.id === recurring_schedule_id);
    if (idx === -1) {
      return { schedule: null };
    }

    const s = schedules[idx];

    if (typeof schedule_name !== 'undefined') s.schedule_name = schedule_name;
    if (typeof pickup_street !== 'undefined') s.pickup_street = pickup_street;
    if (typeof pickup_city !== 'undefined') s.pickup_city = pickup_city;
    if (typeof pickup_state !== 'undefined') s.pickup_state = pickup_state;
    if (typeof pickup_postal_code !== 'undefined') s.pickup_postal_code = pickup_postal_code;
    if (typeof pickup_country !== 'undefined') s.pickup_country = pickup_country;
    if (typeof frequency !== 'undefined') s.frequency = frequency;
    if (typeof primary_weekday !== 'undefined') s.primary_weekday = primary_weekday;
    if (typeof weekdays !== 'undefined') s.weekdays = weekdays;
    if (typeof pickup_time_label !== 'undefined') s.pickup_time_label = pickup_time_label;
    if (typeof time_window_label !== 'undefined') s.time_window_label = time_window_label;
    if (typeof start_date !== 'undefined') s.start_date = start_date;
    if (typeof end_date !== 'undefined') s.end_date = end_date;
    if (typeof service_type !== 'undefined') s.service_type = service_type;
    if (typeof is_active === 'boolean') s.is_active = is_active;

    schedules[idx] = s;
    this._saveToStorage('recurring_pickup_schedules', schedules);

    return {
      schedule: {
        schedule_id: s.id,
        schedule_name: s.schedule_name || '',
        pickup_city: s.pickup_city,
        pickup_postal_code: s.pickup_postal_code,
        frequency: s.frequency,
        weekdays: s.weekdays || [],
        pickup_time_label: s.pickup_time_label,
        time_window_label: s.time_window_label || null,
        start_date: s.start_date,
        end_date: s.end_date,
        service_type: s.service_type,
        is_active: s.is_active !== false
      }
    };
  }

  // 29) cancelRecurringPickupSchedule
  cancelRecurringPickupSchedule(recurring_schedule_id) {
    const schedules = this._getFromStorage('recurring_pickup_schedules', []);
    const idx = schedules.findIndex((s) => s.id === recurring_schedule_id);
    if (idx === -1) {
      return { success: false, is_active: false };
    }

    schedules[idx].is_active = false;
    this._saveToStorage('recurring_pickup_schedules', schedules);

    return { success: true, is_active: false };
  }

  // 30) getHome helpers for static pages

  getAboutUsContent() {
    const raw = localStorage.getItem('about_us_content');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through to default
      }
    }
    return {
      title: '',
      body: '',
      highlights: [],
      certifications: [],
      offices: []
    };
  }

  getTermsAndConditions() {
    const raw = localStorage.getItem('terms_and_conditions');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    return {
      last_updated: '',
      sections: []
    };
  }

  getPrivacyPolicy() {
    const raw = localStorage.getItem('privacy_policy');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fall through
      }
    }
    return {
      last_updated: '',
      sections: []
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
