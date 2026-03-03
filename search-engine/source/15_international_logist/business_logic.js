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

  // ==========================
  // Storage helpers
  // ==========================

  _initStorage() {
    const keys = [
      'addresses',
      'shipments',
      'shipment_quotes',
      'shipping_services',
      'shipping_rate_options',
      'payments',
      'pickup_requests',
      'pickup_time_slots',
      'customs_estimates',
      'locations',
      'saved_locations',
      'tracking_events',
      'delivery_time_slots',
      'delivery_reschedule_requests',
      'support_requests',
      // meta
      'currentQuoteId'
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

  _getFromStorage(key, defaultValue = []) {
    const data = localStorage.getItem(key);
    if (data === null || data === undefined || data === '') {
      return defaultValue;
    }
    try {
      return JSON.parse(data);
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

  _clone(obj) {
    return obj == null ? obj : JSON.parse(JSON.stringify(obj));
  }

  _compareTimeStrings(a, b) {
    // a, b like '18:00'
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    const [ah, am] = a.split(':').map(Number);
    const [bh, bm] = b.split(':').map(Number);
    if (ah !== bh) return ah - bh;
    return am - bm;
  }

  // ==========================
  // Foreign key resolution helpers
  // ==========================

  _resolveRateOptionRelations(rateOption) {
    if (!rateOption) return null;
    const services = this._getFromStorage('shipping_services', []);
    const service = services.find((s) => s.id === rateOption.service_id) || null;
    return {
      ...rateOption,
      service
    };
  }

  _resolveShipmentRelations(shipment) {
    if (!shipment) return null;
    const addresses = this._getFromStorage('addresses', []);
    const rateOptions = this._getFromStorage('shipping_rate_options', []);
    const services = this._getFromStorage('shipping_services', []);

    const origin_address = addresses.find((a) => a.id === shipment.origin_address_id) || null;
    const destination_address = addresses.find((a) => a.id === shipment.destination_address_id) || null;

    let selected_rate_option = rateOptions.find((r) => r.id === shipment.selected_rate_option_id) || null;
    let service = services.find((s) => s.id === shipment.service_id) || null;

    if (selected_rate_option) {
      const srService = services.find((s) => s.id === selected_rate_option.service_id) || null;
      selected_rate_option = {
        ...selected_rate_option,
        service: srService
      };
      if (!service && srService) {
        service = srService;
      }
    }

    return {
      ...shipment,
      origin_address,
      destination_address,
      selected_rate_option,
      service
    };
  }

  _applyQuoteFiltersAndSort(quote, rateOptions) {
    let filtered = rateOptions.slice();

    if (quote.delivery_time_filter_business_days_max != null) {
      const maxDays = quote.delivery_time_filter_business_days_max;
      filtered = filtered.filter(
        (r) =>
          ((r.delivery_estimate_business_days_max != null &&
            r.delivery_estimate_business_days_max <= maxDays) ||
          (r.delivery_estimate_business_days_min != null &&
            r.delivery_estimate_business_days_min <= maxDays))
      );
    }

    if (quote.price_filter_max != null) {
      const maxPrice = quote.price_filter_max;
      const cur = quote.price_filter_currency || null;
      filtered = filtered.filter((r) => {
        if (cur && r.currency !== cur) return false;
        return r.price <= maxPrice;
      });
    }

    if (quote.co2_filter_max_kg != null) {
      const maxCo2 = quote.co2_filter_max_kg;
      filtered = filtered.filter((r) => {
        if (r.co2_kg == null) return false;
        return r.co2_kg <= maxCo2;
      });
    }

    if (quote.sort_option === 'price_low_to_high') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (quote.sort_option === 'fastest_delivery') {
      filtered.sort((a, b) => {
        const aMax = a.delivery_estimate_business_days_max;
        const bMax = b.delivery_estimate_business_days_max;
        if (aMax !== bMax) return aMax - bMax;
        const aMin = a.delivery_estimate_business_days_min;
        const bMin = b.delivery_estimate_business_days_min;
        if (aMin !== bMin) return aMin - bMin;
        return a.price - b.price;
      });
    }

    const services = this._getFromStorage('shipping_services', []);
    return filtered.map((r) => ({
      ...r,
      service: services.find((s) => s.id === r.service_id) || null
    }));
  }

  _getRateOptionsForQuote(quote, applyFiltersAndSort = true) {
    const all = this._getFromStorage('shipping_rate_options', []);
    const related = all.filter((r) => r.quote_id === quote.id);
    if (!applyFiltersAndSort) {
      const services = this._getFromStorage('shipping_services', []);
      return related.map((r) => ({
        ...r,
        service: services.find((s) => s.id === r.service_id) || null
      }));
    }
    return this._applyQuoteFiltersAndSort(quote, related);
  }

  // ==========================
  // Helper functions specified
  // ==========================

  _getOrCreateCurrentQuoteContext() {
    const quoteId = localStorage.getItem('currentQuoteId');
    const quotes = this._getFromStorage('shipment_quotes', []);
    if (quoteId) {
      const existing = quotes.find((q) => q.id === quoteId) || null;
      if (existing) return existing;
    }
    if (quotes.length === 0) return null;
    const latest = quotes[quotes.length - 1];
    localStorage.setItem('currentQuoteId', latest.id);
    return latest;
  }

  _persistShipmentAndAddresses(shipment, origin_address_data, destination_address_data) {
    const addresses = this._getFromStorage('addresses', []);
    let addressesChanged = false;

    const upsertAddress = (existingId, data, defaultType) => {
      if (!data) return existingId;
      let addr = existingId
        ? addresses.find((a) => a.id === existingId)
        : null;
      if (!addr) {
        addr = {
          id: this._generateId('addr'),
          name: data.name || '',
          company_name: data.company_name || '',
          address_type: defaultType,
          street_line1: data.street_line1 || '',
          street_line2: data.street_line2 || '',
          city: data.city || '',
          state_province: data.state_province || '',
          postal_code: data.postal_code || '',
          country: data.country || '',
          phone: data.phone || '',
          email: data.email || '',
          is_default_sender: false,
          is_default_recipient: false,
          saved_in_address_book: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        addresses.push(addr);
      } else {
        // Patch existing
        const fields = [
          'name',
          'company_name',
          'street_line1',
          'street_line2',
          'city',
          'state_province',
          'postal_code',
          'country',
          'phone',
          'email'
        ];
        fields.forEach((f) => {
          if (data[f] !== undefined) {
            addr[f] = data[f];
          }
        });
        addr.updated_at = new Date().toISOString();
      }
      addressesChanged = true;
      return addr.id;
    };

    const originId = upsertAddress(
      shipment.origin_address_id,
      origin_address_data,
      'other'
    );
    const destId = upsertAddress(
      shipment.destination_address_id,
      destination_address_data,
      'other'
    );

    shipment.origin_address_id = originId;
    shipment.destination_address_id = destId;

    if (addressesChanged) {
      this._saveToStorage('addresses', addresses);
    }

    return shipment;
  }

  _processCardPaymentWithGateway(
    shipment,
    card_number,
    card_expiry_month,
    card_expiry_year,
    card_cvc,
    billing_name,
    billing_address
  ) {
    const payments = this._getFromStorage('payments', []);

    const amount =
      shipment.total_charges != null
        ? shipment.total_charges
        : shipment.shipping_charges || 0;
    const currency = shipment.charges_currency || 'usd';

    // Very simple validation; in a real system this would be an API call
    let status = 'succeeded';
    let error_message = '';

    if (!card_number || card_number.length < 12) {
      status = 'failed';
      error_message = 'Invalid card number.';
    }

    const card_brand = card_number.startsWith('4')
      ? 'visa'
      : card_number.startsWith('5')
      ? 'mastercard'
      : 'card';
    const card_last4 = card_number.slice(-4);

    let billing_address_id = null;
    if (billing_address) {
      const addresses = this._getFromStorage('addresses', []);
      const addr = {
        id: this._generateId('addr'),
        name: billing_name || '',
        company_name: '',
        address_type: 'other',
        street_line1: billing_address.street_line1 || '',
        street_line2: billing_address.street_line2 || '',
        city: billing_address.city || '',
        state_province: billing_address.state_province || '',
        postal_code: billing_address.postal_code || '',
        country: billing_address.country || '',
        phone: '',
        email: '',
        is_default_sender: false,
        is_default_recipient: false,
        saved_in_address_book: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      addresses.push(addr);
      this._saveToStorage('addresses', addresses);
      billing_address_id = addr.id;
    }

    const payment = {
      id: this._generateId('pay'),
      shipment_id: shipment.id,
      amount,
      currency,
      payment_method: 'credit_debit_card',
      card_brand,
      card_last4,
      card_expiry_month,
      card_expiry_year,
      billing_name,
      billing_address_id,
      status,
      transaction_reference: this._generateId('txn'),
      created_at: new Date().toISOString(),
      processed_at: status === 'succeeded' ? new Date().toISOString() : null
    };

    payments.push(payment);
    this._saveToStorage('payments', payments);

    return { payment, success: status === 'succeeded', error_message };
  }

  _calculateUpcomingWeekdayDate(referenceDate, targetWeekday /* 0-6 Sun-Sat */) {
    const ref = referenceDate ? new Date(referenceDate) : new Date();
    const day = ref.getDay();
    let diff = targetWeekday - day;
    if (diff <= 0) {
      diff += 7;
    }
    const result = new Date(ref);
    result.setDate(ref.getDate() + diff);
    return result;
  }

  _enrichLocationsWithDistanceAndHours(query, locations, weekday_open_after_time) {
    // Since we have no geocoding here, distance_km will be 0 for all results.
    const filterTime = weekday_open_after_time || null;
    return locations.map((loc) => {
      let is_open_after_filter_time = true;
      if (filterTime && loc.weekday_close_time) {
        is_open_after_filter_time =
          this._compareTimeStrings(loc.weekday_close_time, filterTime) >= 0;
      }
      return {
        location: loc,
        distance_km: 0,
        is_open_after_filter_time
      };
    });
  }

  // ==========================
  // Interface implementations
  // ==========================

  // 1) getHomeOverview
  getHomeOverview() {
    const shipmentsRaw = this._getFromStorage('shipments', []);
    const customs_estimates = this._getFromStorage('customs_estimates', []);
    const saved_locations = this._getFromStorage('saved_locations', []);
    const addresses = this._getFromStorage('addresses', []);

    const shipmentsSorted = shipmentsRaw
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const recent_shipments = shipmentsSorted
      .filter((s) => s.status !== 'draft')
      .slice(0, 10)
      .map((s) => this._resolveShipmentRelations(s));

    const draft_shipments = shipmentsSorted
      .filter((s) => s.status === 'draft')
      .slice(0, 10)
      .map((s) => this._resolveShipmentRelations(s));

    const saved_customs_estimates = customs_estimates.filter((c) => c.saved);

    const has_in_transit_shipments = shipmentsRaw.some(
      (s) => s.status === 'in_transit'
    );

    const saved_locations_count = saved_locations.length;

    const address_book_count = addresses.filter(
      (a) => a.saved_in_address_book
    ).length;

    return {
      recent_shipments,
      draft_shipments,
      saved_customs_estimates,
      has_in_transit_shipments,
      saved_locations_count,
      address_book_count
    };
  }

  // 2) getShippingSearchOptions
  getShippingSearchOptions() {
    const package_types = ['box', 'envelope', 'documents', 'tube', 'pallet', 'other'];
    const shipment_types = ['documents', 'parcel', 'freight', 'other'];
    const weight_units = ['kg', 'lb'];
    const dimension_units = ['cm', 'in'];

    const delivery_time_filter_presets = [
      {
        id: '1_business_day_or_less',
        label: '1 business day or less',
        business_days_max: 1
      },
      {
        id: '2_business_days_or_less',
        label: '2 business days or less',
        business_days_max: 2
      },
      {
        id: '4_business_days_or_less',
        label: '4 business days or less',
        business_days_max: 4
      },
      {
        id: '7_business_days_or_less',
        label: '7 business days or less',
        business_days_max: 7
      }
    ];

    const sort_options = [
      {
        id: 'price_low_to_high',
        label: 'Price: Low to High'
      },
      {
        id: 'fastest_delivery',
        label: 'Fastest delivery'
      }
    ];

    return {
      package_types,
      shipment_types,
      weight_units,
      dimension_units,
      delivery_time_filter_presets,
      sort_options
    };
  }

  // 3) createShipmentQuote
  createShipmentQuote(
    mode,
    origin_city,
    origin_postal_code,
    origin_country,
    destination_city,
    destination_postal_code,
    destination_country,
    package_type,
    shipment_type,
    weight,
    weight_unit,
    length,
    width,
    height,
    dimension_unit,
    shipment_date
  ) {
    if (mode !== 'quote' && mode !== 'create_shipment') {
      throw new Error('Invalid mode for createShipmentQuote');
    }

    const shipment_quotes = this._getFromStorage('shipment_quotes', []);

    const quote = {
      id: this._generateId('quote'),
      mode,
      origin_city,
      origin_postal_code,
      origin_country,
      destination_city,
      destination_postal_code,
      destination_country,
      package_type,
      shipment_type,
      weight,
      weight_unit,
      length: length != null ? length : null,
      width: width != null ? width : null,
      height: height != null ? height : null,
      dimension_unit: dimension_unit || null,
      shipment_date,
      delivery_time_filter_business_days_max: null,
      price_filter_max: null,
      price_filter_currency: null,
      co2_filter_max_kg: null,
      sort_option: null,
      selected_rate_option_id: null,
      created_at: new Date().toISOString()
    };

    shipment_quotes.push(quote);
    this._saveToStorage('shipment_quotes', shipment_quotes);
    localStorage.setItem('currentQuoteId', quote.id);

    // Build rate options based on existing shipping services in storage
    const shipping_services = this._getFromStorage('shipping_services', []);
    const shipping_rate_options = this._getFromStorage(
      'shipping_rate_options',
      []
    );

    const applicableServices = shipping_services.filter((s) => {
      if (!s.active) return false;
      if (shipment_type === 'documents' && !s.supports_documents) return false;
      if (shipment_type !== 'documents' && !s.supports_parcels) return false;
      if (s.max_weight_kg != null && weight_unit === 'kg') {
        if (weight > s.max_weight_kg) return false;
      }
      // If weight is lb and max_weight_kg exists, convert approximate
      if (s.max_weight_kg != null && weight_unit === 'lb') {
        const weightKg = weight * 0.453592;
        if (weightKg > s.max_weight_kg) return false;
      }
      return true;
    });

    const newRateOptions = applicableServices.map((service) => {
      const minDays =
        service.typical_transit_days_min != null
          ? service.typical_transit_days_min
          : 3;
      const maxDays =
        service.typical_transit_days_max != null
          ? service.typical_transit_days_max
          : minDays + 2;

      const weightKg = weight_unit === 'kg' ? weight : weight * 0.453592;
      const basePrice = 10 + weightKg * 2;
      let multiplier = 1;
      if (service.service_level === 'standard') multiplier = 1.2;
      if (service.service_level === 'express') multiplier = 1.5;
      if (service.service_level === 'priority') multiplier = 2;

      const price = parseFloat((basePrice * multiplier).toFixed(2));
      const avgDays = (minDays + maxDays) / 2;
      const co2_kg = parseFloat((weightKg * avgDays * 1.5).toFixed(2));

      const deliveryDate = new Date(shipment_date || new Date().toISOString());
      // Roughly add maxDays (ignoring weekends for simplicity)
      deliveryDate.setDate(deliveryDate.getDate() + maxDays);

      return {
        id: this._generateId('rate'),
        quote_id: quote.id,
        service_id: service.id,
        service_name: service.name,
        service_level: service.service_level,
        delivery_estimate_business_days_min: minDays,
        delivery_estimate_business_days_max: maxDays,
        delivery_estimate_date: deliveryDate.toISOString(),
        price,
        currency: 'usd',
        co2_kg: service.supports_co2_reporting ? co2_kg : null,
        supports_prepaid_duties: service.supports_prepaid_duties,
        estimated_duties: null,
        estimated_duties_currency: null,
        is_selected: false
      };
    });

    const allRateOptions = shipping_rate_options.concat(newRateOptions);
    this._saveToStorage('shipping_rate_options', allRateOptions);

    const resolvedRateOptions = newRateOptions.map((r) =>
      this._resolveRateOptionRelations(r)
    );

    return {
      quote,
      rate_options: resolvedRateOptions
    };
  }

  // 4) updateShipmentQuoteFiltersAndSort
  updateShipmentQuoteFiltersAndSort(
    quoteId,
    delivery_time_filter_business_days_max,
    price_filter_max,
    price_filter_currency,
    co2_filter_max_kg,
    sort_option
  ) {
    const shipment_quotes = this._getFromStorage('shipment_quotes', []);
    const quoteIndex = shipment_quotes.findIndex((q) => q.id === quoteId);
    if (quoteIndex === -1) {
      throw new Error('Quote not found');
    }

    const quote = shipment_quotes[quoteIndex];

    if (delivery_time_filter_business_days_max !== undefined) {
      quote.delivery_time_filter_business_days_max =
        delivery_time_filter_business_days_max;
    }
    if (price_filter_max !== undefined) {
      quote.price_filter_max = price_filter_max;
    }
    if (price_filter_currency !== undefined) {
      quote.price_filter_currency = price_filter_currency;
    }
    if (co2_filter_max_kg !== undefined) {
      quote.co2_filter_max_kg = co2_filter_max_kg;
    }
    if (sort_option !== undefined) {
      quote.sort_option = sort_option;
    }

    shipment_quotes[quoteIndex] = quote;
    this._saveToStorage('shipment_quotes', shipment_quotes);

    const filteredSorted = this._getRateOptionsForQuote(quote, true);

    return {
      quote,
      rate_options: filteredSorted
    };
  }

  // 5) getShipmentQuoteDetails
  getShipmentQuoteDetails(quoteId) {
    const shipment_quotes = this._getFromStorage('shipment_quotes', []);
    const quote = shipment_quotes.find((q) => q.id === quoteId);
    if (!quote) {
      throw new Error('Quote not found');
    }

    const rate_options = this._getRateOptionsForQuote(quote, true);

    return {
      quote,
      rate_options
    };
  }

  // 6) selectShippingRateOption
  selectShippingRateOption(quoteId, rateOptionId, create_shipment = true) {
    const shipment_quotes = this._getFromStorage('shipment_quotes', []);
    const shipping_rate_options = this._getFromStorage(
      'shipping_rate_options',
      []
    );
    const shipments = this._getFromStorage('shipments', []);

    const quoteIndex = shipment_quotes.findIndex((q) => q.id === quoteId);
    if (quoteIndex === -1) {
      throw new Error('Quote not found');
    }
    const quote = shipment_quotes[quoteIndex];

    const rateIndex = shipping_rate_options.findIndex(
      (r) => r.id === rateOptionId && r.quote_id === quote.id
    );
    if (rateIndex === -1) {
      throw new Error('Rate option not found for this quote');
    }

    // Update selected flags
    for (let i = 0; i < shipping_rate_options.length; i++) {
      const r = shipping_rate_options[i];
      if (r.quote_id === quote.id) {
        r.is_selected = r.id === rateOptionId;
      }
    }

    const selected_rate_option = shipping_rate_options[rateIndex];
    quote.selected_rate_option_id = selected_rate_option.id;

    shipment_quotes[quoteIndex] = quote;
    this._saveToStorage('shipment_quotes', shipment_quotes);
    this._saveToStorage('shipping_rate_options', shipping_rate_options);

    let shipment = null;
    let shipment_created = false;

    if (create_shipment) {
      // Try to find existing shipment linked to this rate option
      let shipmentIndex = shipments.findIndex(
        (s) => s.selected_rate_option_id === selected_rate_option.id
      );

      if (shipmentIndex === -1) {
        // Create new shipment
        const addresses = this._getFromStorage('addresses', []);
        const originAddress = {
          id: this._generateId('addr'),
          name: '',
          company_name: '',
          address_type: 'other',
          street_line1: '',
          street_line2: '',
          city: quote.origin_city,
          state_province: '',
          postal_code: quote.origin_postal_code,
          country: quote.origin_country,
          phone: '',
          email: '',
          is_default_sender: false,
          is_default_recipient: false,
          saved_in_address_book: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        const destAddress = {
          id: this._generateId('addr'),
          name: '',
          company_name: '',
          address_type: 'other',
          street_line1: '',
          street_line2: '',
          city: quote.destination_city,
          state_province: '',
          postal_code: quote.destination_postal_code,
          country: quote.destination_country,
          phone: '',
          email: '',
          is_default_sender: false,
          is_default_recipient: false,
          saved_in_address_book: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        addresses.push(originAddress, destAddress);
        this._saveToStorage('addresses', addresses);

        const service_id = selected_rate_option.service_id;
        const shipmentObj = {
          id: this._generateId('ship'),
          tracking_number: null,
          reference_number: null,
          status: 'draft',
          origin_address_id: originAddress.id,
          destination_address_id: destAddress.id,
          service_id,
          selected_rate_option_id: selected_rate_option.id,
          package_type: quote.package_type,
          shipment_type: quote.shipment_type,
          package_count: 1,
          weight: quote.weight,
          weight_unit: quote.weight_unit,
          length: quote.length,
          width: quote.width,
          height: quote.height,
          dimension_unit: quote.dimension_unit,
          shipment_date: quote.shipment_date,
          delivery_estimated_date: selected_rate_option.delivery_estimate_date,
          delivery_estimated_business_days:
            selected_rate_option.delivery_estimate_business_days_max,
          delivery_time_window_start: null,
          delivery_time_window_end: null,
          contents_category: null,
          contents_description: '',
          declared_value: null,
          declared_value_currency: null,
          insurance_type: 'none',
          insurance_included: false,
          duties_option: 'unpaid',
          duties_amount: 0,
          duties_currency: null,
          shipping_charges: selected_rate_option.price,
          insurance_fee: 0,
          total_charges: selected_rate_option.price,
          charges_currency: selected_rate_option.currency,
          co2_kg: selected_rate_option.co2_kg,
          label_url: null,
          delivery_instructions: '',
          created_at: new Date().toISOString(),
          paid_at: null,
          updated_at: new Date().toISOString()
        };

        shipments.push(shipmentObj);
        shipmentIndex = shipments.length - 1;
        shipment_created = true;
        this._saveToStorage('shipments', shipments);
      }

      shipment = shipments[shipmentIndex];
    }

    const resolvedSelectedRateOption = this._resolveRateOptionRelations(
      selected_rate_option
    );
    const resolvedShipment = shipment
      ? this._resolveShipmentRelations(shipment)
      : null;

    return {
      quote,
      selected_rate_option: resolvedSelectedRateOption,
      shipment_created,
      shipment: resolvedShipment
    };
  }

  // 7) getShipmentDetailsForEdit
  getShipmentDetailsForEdit(shipmentId) {
    const shipments = this._getFromStorage('shipments', []);
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const addresses = this._getFromStorage('addresses', []);
    const rateOptions = this._getFromStorage('shipping_rate_options', []);
    const services = this._getFromStorage('shipping_services', []);

    const origin_address =
      addresses.find((a) => a.id === shipment.origin_address_id) || null;
    const destination_address =
      addresses.find((a) => a.id === shipment.destination_address_id) || null;

    const selected_rate_option =
      rateOptions.find((r) => r.id === shipment.selected_rate_option_id) || null;
    const service =
      services.find((s) => s.id === shipment.service_id) ||
      (selected_rate_option
        ? services.find((s) => s.id === selected_rate_option.service_id)
        : null);

    const shipping_charges =
      shipment.shipping_charges != null
        ? shipment.shipping_charges
        : selected_rate_option
        ? selected_rate_option.price
        : 0;
    const duties_amount = shipment.duties_amount || 0;
    const insurance_fee = shipment.insurance_fee || 0;
    const total_charges =
      shipment.total_charges != null
        ? shipment.total_charges
        : shipping_charges + duties_amount + insurance_fee;
    const currency =
      shipment.charges_currency ||
      (selected_rate_option ? selected_rate_option.currency : 'usd');

    const cost_summary = {
      shipping_charges,
      duties_amount,
      insurance_fee,
      total_charges,
      currency
    };

    const resolvedShipment = this._resolveShipmentRelations(shipment);

    const resolvedRateOption = selected_rate_option
      ? {
          ...selected_rate_option,
          service
        }
      : null;

    return {
      shipment: resolvedShipment,
      origin_address,
      destination_address,
      selected_rate_option: resolvedRateOption,
      service,
      cost_summary
    };
  }

  // 8) updateShipmentDetails
  updateShipmentDetails(
    shipmentId,
    origin_address,
    destination_address,
    declared_value,
    declared_value_currency,
    insurance_type,
    insurance_included,
    duties_option
  ) {
    const shipments = this._getFromStorage('shipments', []);
    const shipmentIndex = shipments.findIndex((s) => s.id === shipmentId);
    if (shipmentIndex === -1) {
      throw new Error('Shipment not found');
    }

    let shipment = shipments[shipmentIndex];

    shipment = this._persistShipmentAndAddresses(
      shipment,
      origin_address,
      destination_address
    );

    if (declared_value !== undefined) {
      shipment.declared_value = declared_value;
    }
    if (declared_value_currency !== undefined) {
      shipment.declared_value_currency = declared_value_currency;
    }
    if (insurance_type !== undefined) {
      shipment.insurance_type = insurance_type;
    }
    if (insurance_included !== undefined) {
      shipment.insurance_included = insurance_included;
    }
    if (duties_option !== undefined) {
      shipment.duties_option = duties_option;
    }

    // Recalculate insurance fee (simple 2% rule for full value)
    const rateOptions = this._getFromStorage('shipping_rate_options', []);
    const selected_rate_option = rateOptions.find(
      (r) => r.id === shipment.selected_rate_option_id
    );

    if (shipment.shipping_charges == null && selected_rate_option) {
      shipment.shipping_charges = selected_rate_option.price;
    }

    if (shipment.insurance_type === 'full_value' && shipment.declared_value) {
      shipment.insurance_fee = parseFloat(
        (shipment.declared_value * 0.02).toFixed(2)
      );
      shipment.insurance_included = true;
    } else {
      shipment.insurance_fee = shipment.insurance_fee || 0;
    }

    shipment.duties_amount = shipment.duties_amount || 0;
    shipment.total_charges = parseFloat(
      (
        (shipment.shipping_charges || 0) +
        (shipment.duties_amount || 0) +
        (shipment.insurance_fee || 0)
      ).toFixed(2)
    );
    shipment.charges_currency =
      shipment.charges_currency ||
      (selected_rate_option ? selected_rate_option.currency : 'usd');

    shipment.updated_at = new Date().toISOString();

    shipments[shipmentIndex] = shipment;
    this._saveToStorage('shipments', shipments);

    const addresses = this._getFromStorage('addresses', []);
    const origin_addr =
      addresses.find((a) => a.id === shipment.origin_address_id) || null;
    const dest_addr =
      addresses.find((a) => a.id === shipment.destination_address_id) || null;

    const services = this._getFromStorage('shipping_services', []);
    const service =
      services.find((s) => s.id === shipment.service_id) ||
      (selected_rate_option
        ? services.find((s) => s.id === selected_rate_option.service_id)
        : null);

    const cost_summary = {
      shipping_charges: shipment.shipping_charges || 0,
      duties_amount: shipment.duties_amount || 0,
      insurance_fee: shipment.insurance_fee || 0,
      total_charges: shipment.total_charges || 0,
      currency: shipment.charges_currency || 'usd'
    };

    const resolvedShipment = this._resolveShipmentRelations(shipment);

    return {
      shipment: resolvedShipment,
      origin_address: origin_addr,
      destination_address: dest_addr,
      cost_summary
    };
  }

  // 9) saveShipmentAsDraft
  saveShipmentAsDraft(shipmentId) {
    const shipments = this._getFromStorage('shipments', []);
    const idx = shipments.findIndex((s) => s.id === shipmentId);
    if (idx === -1) {
      throw new Error('Shipment not found');
    }
    const shipment = shipments[idx];
    shipment.status = 'draft';
    shipment.updated_at = new Date().toISOString();
    shipments[idx] = shipment;
    this._saveToStorage('shipments', shipments);

    const resolvedShipment = this._resolveShipmentRelations(shipment);

    return {
      shipment: resolvedShipment,
      message: 'Shipment saved as draft.'
    };
  }

  // 10) getPaymentSummaryForShipment
  getPaymentSummaryForShipment(shipmentId) {
    const shipments = this._getFromStorage('shipments', []);
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const addresses = this._getFromStorage('addresses', []);
    const rateOptions = this._getFromStorage('shipping_rate_options', []);
    const services = this._getFromStorage('shipping_services', []);

    const origin_address =
      addresses.find((a) => a.id === shipment.origin_address_id) || null;
    const destination_address =
      addresses.find((a) => a.id === shipment.destination_address_id) || null;

    const selected_rate_option =
      rateOptions.find((r) => r.id === shipment.selected_rate_option_id) || null;
    const service =
      services.find((s) => s.id === shipment.service_id) ||
      (selected_rate_option
        ? services.find((s) => s.id === selected_rate_option.service_id)
        : null);

    const shipping_charges =
      shipment.shipping_charges != null
        ? shipment.shipping_charges
        : selected_rate_option
        ? selected_rate_option.price
        : 0;
    const duties_amount = shipment.duties_amount || 0;
    const insurance_fee = shipment.insurance_fee || 0;
    const total_charges =
      shipment.total_charges != null
        ? shipment.total_charges
        : shipping_charges + duties_amount + insurance_fee;
    const currency =
      shipment.charges_currency ||
      (selected_rate_option ? selected_rate_option.currency : 'usd');

    const cost_summary = {
      shipping_charges,
      duties_amount,
      insurance_fee,
      total_charges,
      currency
    };

    const resolvedShipment = this._resolveShipmentRelations(shipment);
    const resolvedRateOption = selected_rate_option
      ? {
          ...selected_rate_option,
          service
        }
      : null;

    return {
      shipment: resolvedShipment,
      origin_address,
      destination_address,
      selected_rate_option: resolvedRateOption,
      service,
      cost_summary
    };
  }

  // 11) submitPaymentForShipment
  submitPaymentForShipment(
    shipmentId,
    card_number,
    card_expiry_month,
    card_expiry_year,
    card_cvc,
    billing_name,
    billing_address
  ) {
    const shipments = this._getFromStorage('shipments', []);
    const shipmentIndex = shipments.findIndex((s) => s.id === shipmentId);
    if (shipmentIndex === -1) {
      throw new Error('Shipment not found');
    }

    const shipment = shipments[shipmentIndex];

    const {
      payment,
      success,
      error_message
    } = this._processCardPaymentWithGateway(
      shipment,
      card_number,
      card_expiry_month,
      card_expiry_year,
      card_cvc,
      billing_name,
      billing_address
    );

    if (success) {
      // Update shipment status, tracking number and label URL
      shipment.status = 'label_generated';
      shipment.paid_at = new Date().toISOString();
      if (!shipment.tracking_number) {
        shipment.tracking_number = 'TRK' + this._getNextIdCounter();
      }
      if (!shipment.label_url) {
        shipment.label_url =
          'https://labels.example.com/' + encodeURIComponent(shipment.id);
      }
      shipment.updated_at = new Date().toISOString();
      shipments[shipmentIndex] = shipment;
      this._saveToStorage('shipments', shipments);
    }

    const resolvedShipment = this._resolveShipmentRelations(shipment);

    return {
      payment,
      shipment: resolvedShipment,
      success,
      error_message
    };
  }

  // 12) getShipmentConfirmationDetails
  getShipmentConfirmationDetails(shipmentId) {
    const shipments = this._getFromStorage('shipments', []);
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const addresses = this._getFromStorage('addresses', []);
    const rateOptions = this._getFromStorage('shipping_rate_options', []);
    const services = this._getFromStorage('shipping_services', []);
    const payments = this._getFromStorage('payments', []);

    const origin_address =
      addresses.find((a) => a.id === shipment.origin_address_id) || null;
    const destination_address =
      addresses.find((a) => a.id === shipment.destination_address_id) || null;

    const selected_rate_option =
      rateOptions.find((r) => r.id === shipment.selected_rate_option_id) || null;
    const service =
      services.find((s) => s.id === shipment.service_id) ||
      (selected_rate_option
        ? services.find((s) => s.id === selected_rate_option.service_id)
        : null);

    const payment =
      payments
        .filter((p) => p.shipment_id === shipment.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null;

    const resolvedShipment = this._resolveShipmentRelations(shipment);
    const resolvedRateOption = selected_rate_option
      ? {
          ...selected_rate_option,
          service
        }
      : null;

    return {
      shipment: resolvedShipment,
      origin_address,
      destination_address,
      selected_rate_option: resolvedRateOption,
      service,
      payment
    };
  }

  // 13) getAvailablePickupTimeSlots
  getAvailablePickupTimeSlots(postal_code, city, country, pickup_date) {
    const slots = this._getFromStorage('pickup_time_slots', []);
    const targetDate = pickup_date ? pickup_date.slice(0, 10) : null;

    const filtered = slots.filter((slot) => {
      if (!slot.is_available) return false;
      if (slot.postal_code !== postal_code) return false;
      if (slot.city !== city) return false;
      if (slot.country !== country) return false;
      if (!targetDate) return true;
      const slotDate = new Date(slot.date).toISOString().slice(0, 10);
      return slotDate === targetDate;
    });

    return filtered;
  }

  // 14) createPickupRequest
  createPickupRequest(
    pickup_type,
    has_shipping_labels,
    pickup_address,
    package_count,
    total_weight,
    weight_unit,
    pickup_date,
    timeSlotId,
    contact_phone,
    contact_email,
    special_instructions
  ) {
    const pickup_requests = this._getFromStorage('pickup_requests', []);
    const pickup_time_slots = this._getFromStorage('pickup_time_slots', []);
    const addresses = this._getFromStorage('addresses', []);

    const slot = pickup_time_slots.find((s) => s.id === timeSlotId) || null;

    const addr = {
      id: this._generateId('addr'),
      name: pickup_address.contact_name || '',
      company_name: '',
      address_type: 'pickup',
      street_line1: pickup_address.street_line1 || '',
      street_line2: pickup_address.street_line2 || '',
      city: pickup_address.city || '',
      state_province: pickup_address.state_province || '',
      postal_code: pickup_address.postal_code || '',
      country: pickup_address.country || '',
      phone: contact_phone || '',
      email: contact_email || '',
      is_default_sender: false,
      is_default_recipient: false,
      saved_in_address_book: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    addresses.push(addr);
    this._saveToStorage('addresses', addresses);

    const pickup_request = {
      id: this._generateId('pku'),
      pickup_type,
      has_shipping_labels,
      pickup_address_id: addr.id,
      package_count,
      total_weight,
      weight_unit,
      pickup_date,
      time_slot_id: timeSlotId,
      time_slot_start: slot ? slot.start_time : null,
      time_slot_end: slot ? slot.end_time : null,
      contact_name: pickup_address.contact_name || '',
      phone: contact_phone,
      email: contact_email,
      special_instructions: special_instructions || '',
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    pickup_requests.push(pickup_request);
    this._saveToStorage('pickup_requests', pickup_requests);

    return {
      pickup_request
    };
  }

  // 15) getCustomsEstimatorOptions
  getCustomsEstimatorOptions() {
    const contents_categories = [
      'clothing_apparel',
      'electronics',
      'documents',
      'general_goods',
      'other'
    ];
    const shipment_purposes = [
      'personal_gift',
      'commercial_sale',
      'sample',
      'return',
      'documents',
      'other'
    ];
    const supported_currencies = ['usd', 'eur', 'cad', 'gbp', 'jpy', 'cny', 'aud'];

    return {
      contents_categories,
      shipment_purposes,
      supported_currencies
    };
  }

  // 16) createCustomsEstimateAndRates
  createCustomsEstimateAndRates(
    origin_country,
    origin_city,
    origin_postal_code,
    destination_country,
    destination_city,
    destination_postal_code,
    contents_category,
    contents_description,
    customs_value,
    customs_value_currency,
    shipment_purpose
  ) {
    const customs_estimates = this._getFromStorage('customs_estimates', []);
    const shipping_services = this._getFromStorage('shipping_services', []);
    const shipping_rate_options = this._getFromStorage(
      'shipping_rate_options',
      []
    );

    const estimated_duties = parseFloat((customs_value * 0.1).toFixed(2));
    const estimated_taxes = parseFloat((customs_value * 0.05).toFixed(2));
    const total_estimated_charges = parseFloat(
      (estimated_duties + estimated_taxes).toFixed(2)
    );

    const customs_estimate = {
      id: this._generateId('cst'),
      origin_country,
      origin_city,
      origin_postal_code,
      destination_country,
      destination_city,
      destination_postal_code,
      contents_category,
      contents_description,
      customs_value,
      customs_value_currency,
      shipment_purpose,
      estimated_duties,
      estimated_taxes,
      total_estimated_charges,
      currency: customs_value_currency,
      selected_rate_option_id: null,
      include_prepaid_duties: false,
      saved: false,
      created_at: new Date().toISOString(),
      updated_at: null
    };

    customs_estimates.push(customs_estimate);
    this._saveToStorage('customs_estimates', customs_estimates);

    // Create rate options from services that support prepaid duties
    const applicableServices = shipping_services.filter(
      (s) => s.active && s.supports_prepaid_duties
    );

    const newRateOptions = applicableServices.map((service) => {
      const minDays =
        service.typical_transit_days_min != null
          ? service.typical_transit_days_min
          : 3;
      const maxDays =
        service.typical_transit_days_max != null
          ? service.typical_transit_days_max
          : minDays + 2;

      const basePrice = 20 + customs_value * 0.05;
      let multiplier = 1;
      if (service.service_level === 'standard') multiplier = 1.1;
      if (service.service_level === 'express') multiplier = 1.3;
      if (service.service_level === 'priority') multiplier = 1.6;

      const price = parseFloat((basePrice * multiplier).toFixed(2));

      return {
        id: this._generateId('rate'),
        quote_id: 'customs_' + customs_estimate.id,
        service_id: service.id,
        service_name: service.name,
        service_level: service.service_level,
        delivery_estimate_business_days_min: minDays,
        delivery_estimate_business_days_max: maxDays,
        delivery_estimate_date: null,
        price,
        currency: customs_value_currency,
        co2_kg: service.supports_co2_reporting ? null : null,
        supports_prepaid_duties: service.supports_prepaid_duties,
        estimated_duties: estimated_duties,
        estimated_duties_currency: customs_value_currency,
        is_selected: false
      };
    });

    const allRateOptions = shipping_rate_options.concat(newRateOptions);
    this._saveToStorage('shipping_rate_options', allRateOptions);

    const services = this._getFromStorage('shipping_services', []);
    const resolvedRateOptions = newRateOptions.map((r) => ({
      ...r,
      service: services.find((s) => s.id === r.service_id) || null
    }));

    return {
      customs_estimate,
      rate_options: resolvedRateOptions
    };
  }

  // 17) selectCustomsPrepaidOption
  selectCustomsPrepaidOption(customsEstimateId, rateOptionId, include_prepaid_duties) {
    const customs_estimates = this._getFromStorage('customs_estimates', []);
    const shipping_rate_options = this._getFromStorage(
      'shipping_rate_options',
      []
    );

    const ceIndex = customs_estimates.findIndex((c) => c.id === customsEstimateId);
    if (ceIndex === -1) {
      throw new Error('Customs estimate not found');
    }

    const customs_estimate = customs_estimates[ceIndex];

    const rateOption = shipping_rate_options.find((r) => r.id === rateOptionId);
    if (!rateOption) {
      throw new Error('Rate option not found');
    }

    customs_estimate.selected_rate_option_id = rateOptionId;
    customs_estimate.include_prepaid_duties = include_prepaid_duties;
    customs_estimate.updated_at = new Date().toISOString();

    customs_estimates[ceIndex] = customs_estimate;
    this._saveToStorage('customs_estimates', customs_estimates);

    const services = this._getFromStorage('shipping_services', []);
    const resolvedRateOption = {
      ...rateOption,
      service: services.find((s) => s.id === rateOption.service_id) || null
    };

    return {
      customs_estimate,
      selected_rate_option: resolvedRateOption
    };
  }

  // 18) saveCustomsEstimate
  saveCustomsEstimate(customsEstimateId) {
    const customs_estimates = this._getFromStorage('customs_estimates', []);
    const idx = customs_estimates.findIndex((c) => c.id === customsEstimateId);
    if (idx === -1) {
      throw new Error('Customs estimate not found');
    }
    const customs_estimate = customs_estimates[idx];
    customs_estimate.saved = true;
    customs_estimate.updated_at = new Date().toISOString();
    customs_estimates[idx] = customs_estimate;
    this._saveToStorage('customs_estimates', customs_estimates);

    return {
      customs_estimate,
      message: 'Customs estimate saved.'
    };
  }

  // 19) trackShipmentByNumber
  trackShipmentByNumber(tracking_number) {
    const shipments = this._getFromStorage('shipments', []);
    const tracking_events = this._getFromStorage('tracking_events', []);

    const shipment = shipments.find((s) => s.tracking_number === tracking_number);
    if (!shipment) {
      return {
        shipment: null,
        events: [],
        current_status: null,
        estimated_delivery_date: null,
        can_manage_delivery: false,
        error_message: 'Tracking number not found.'
      };
    }

    const events = tracking_events
      .filter((e) => e.tracking_number === tracking_number)
      .sort((a, b) => new Date(a.event_time) - new Date(b.event_time));

    const lastEvent = events[events.length - 1] || null;
    const current_status = lastEvent ? lastEvent.status : null;
    const estimated_delivery_date = shipment.delivery_estimated_date || null;

    const can_manage_delivery =
      shipment.status === 'in_transit' || shipment.status === 'label_generated';

    const resolvedShipment = this._resolveShipmentRelations(shipment);

    return {
      shipment: resolvedShipment,
      events,
      current_status,
      estimated_delivery_date,
      can_manage_delivery,
      error_message: ''
    };
  }

  // 20) getDeliveryRescheduleOptions
  getDeliveryRescheduleOptions(shipmentId) {
    const shipments = this._getFromStorage('shipments', []);
    const shipment = shipments.find((s) => s.id === shipmentId);
    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const delivery_time_slots = this._getFromStorage('delivery_time_slots', []);
    const available_time_slots = delivery_time_slots
      .filter((slot) => slot.shipment_id === shipment.id && slot.is_available)
      .sort((a, b) => new Date(a.date) - new Date(b.date) || this._compareTimeStrings(a.start_time, b.start_time));

    const resolvedShipment = this._resolveShipmentRelations(shipment);

    return {
      shipment: resolvedShipment,
      current_delivery_date: shipment.delivery_estimated_date || null,
      current_time_window_start: shipment.delivery_time_window_start || null,
      current_time_window_end: shipment.delivery_time_window_end || null,
      available_time_slots
    };
  }

  // 21) submitDeliveryRescheduleRequest
  submitDeliveryRescheduleRequest(
    shipmentId,
    deliveryTimeSlotId,
    delivery_instructions
  ) {
    const shipments = this._getFromStorage('shipments', []);
    const delivery_time_slots = this._getFromStorage('delivery_time_slots', []);
    const delivery_reschedule_requests = this._getFromStorage(
      'delivery_reschedule_requests',
      []
    );

    const shipmentIndex = shipments.findIndex((s) => s.id === shipmentId);
    if (shipmentIndex === -1) {
      throw new Error('Shipment not found');
    }

    const shipment = shipments[shipmentIndex];

    const slotIndex = delivery_time_slots.findIndex(
      (s) => s.id === deliveryTimeSlotId && s.shipment_id === shipment.id
    );
    if (slotIndex === -1) {
      throw new Error('Delivery time slot not found for shipment');
    }

    const slot = delivery_time_slots[slotIndex];

    const reschedule_request = {
      id: this._generateId('drq'),
      shipment_id: shipment.id,
      previous_delivery_date: shipment.delivery_estimated_date || null,
      previous_time_window_start: shipment.delivery_time_window_start || null,
      previous_time_window_end: shipment.delivery_time_window_end || null,
      new_delivery_date: slot.date,
      new_time_window_start: slot.start_time,
      new_time_window_end: slot.end_time,
      delivery_instructions: delivery_instructions || '',
      requested_at: new Date().toISOString(),
      status: 'confirmed'
    };

    // Update shipment
    shipment.delivery_estimated_date = slot.date;
    shipment.delivery_time_window_start = slot.start_time;
    shipment.delivery_time_window_end = slot.end_time;
    shipment.delivery_instructions = delivery_instructions || '';
    shipment.updated_at = new Date().toISOString();

    // Mark slot as no longer available
    slot.is_available = false;
    delivery_time_slots[slotIndex] = slot;

    shipments[shipmentIndex] = shipment;
    delivery_reschedule_requests.push(reschedule_request);

    this._saveToStorage('shipments', shipments);
    this._saveToStorage('delivery_time_slots', delivery_time_slots);
    this._saveToStorage('delivery_reschedule_requests', delivery_reschedule_requests);

    const resolvedShipment = this._resolveShipmentRelations(shipment);

    return {
      reschedule_request,
      shipment: resolvedShipment
    };
  }

  // 22) searchLocations
  searchLocations(
    query,
    radius_km,
    location_types,
    accepts_international_shipments,
    weekday_open_after_time,
    sort_option
  ) {
    const locations = this._getFromStorage('locations', []);
    const normalizeSearchString = (str) =>
      (str || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, ' ')
        .trim();
    const q = normalizeSearchString(query);

    let filtered = locations.filter((loc) => {
      const combined = normalizeSearchString(
        (loc.city || '') +
        ' ' +
        (loc.postal_code || '') +
        ' ' +
        (loc.country || '')
      );
      if (q && !combined.includes(q)) return false;
      if (location_types && location_types.length > 0) {
        if (!location_types.includes(loc.location_type)) return false;
      }
      if (accepts_international_shipments !== undefined) {
        if (
          loc.accepts_international_shipments !==
          accepts_international_shipments
        ) {
          return false;
        }
      }
      return true;
    });

    let enriched = this._enrichLocationsWithDistanceAndHours(
      query,
      filtered,
      weekday_open_after_time
    );

    if (weekday_open_after_time) {
      enriched = enriched.filter((e) => e.is_open_after_filter_time);
    }

    if (radius_km != null) {
      // Since distance_km is 0 for all, radius filter will keep all >= 0
      enriched = enriched.filter((e) => e.distance_km <= radius_km);
    }

    if (sort_option === 'distance_nearest_first') {
      enriched.sort((a, b) => a.distance_km - b.distance_km);
    }

    return enriched;
  }

  // 23) getLocationDetails
  getLocationDetails(locationId) {
    const locations = this._getFromStorage('locations', []);
    const location = locations.find((l) => l.id === locationId) || null;
    if (!location) {
      throw new Error('Location not found');
    }
    return { location };
  }

  // 24) saveLocation
  saveLocation(locationId, label, is_favorite) {
    const locations = this._getFromStorage('locations', []);
    const location = locations.find((l) => l.id === locationId) || null;
    if (!location) {
      throw new Error('Location not found');
    }

    const saved_locations = this._getFromStorage('saved_locations', []);

    const saved_location = {
      id: this._generateId('sloc'),
      location_id: locationId,
      label: label || '',
      is_favorite: !!is_favorite,
      saved_at: new Date().toISOString()
    };

    saved_locations.push(saved_location);
    this._saveToStorage('saved_locations', saved_locations);

    return { saved_location };
  }

  // 25) getSavedLocations
  getSavedLocations() {
    const saved_locations = this._getFromStorage('saved_locations', []);
    const locations = this._getFromStorage('locations', []);

    return saved_locations.map((sl) => ({
      saved_location: sl,
      location: locations.find((l) => l.id === sl.location_id) || null
    }));
  }

  // 26) updateSavedLocation
  updateSavedLocation(savedLocationId, label, is_favorite) {
    const saved_locations = this._getFromStorage('saved_locations', []);
    const idx = saved_locations.findIndex((s) => s.id === savedLocationId);
    if (idx === -1) {
      throw new Error('Saved location not found');
    }
    const saved_location = saved_locations[idx];
    if (label !== undefined) {
      saved_location.label = label;
    }
    if (is_favorite !== undefined) {
      saved_location.is_favorite = is_favorite;
    }
    saved_locations[idx] = saved_location;
    this._saveToStorage('saved_locations', saved_locations);
    return { saved_location };
  }

  // 27) deleteSavedLocation
  deleteSavedLocation(savedLocationId) {
    const saved_locations = this._getFromStorage('saved_locations', []);
    const newList = saved_locations.filter((s) => s.id !== savedLocationId);
    const success = newList.length !== saved_locations.length;
    if (success) {
      this._saveToStorage('saved_locations', newList);
    }
    return { success };
  }

  // 28) getAccountOverview
  getAccountOverview() {
    const shipmentsRaw = this._getFromStorage('shipments', []);
    const customs_estimates = this._getFromStorage('customs_estimates', []);
    const saved_locations = this._getFromStorage('saved_locations', []);
    const locations = this._getFromStorage('locations', []);
    const addresses = this._getFromStorage('addresses', []);

    const sortedShipments = shipmentsRaw
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const recent_shipments = sortedShipments
      .filter((s) => s.status !== 'draft')
      .slice(0, 10)
      .map((s) => this._resolveShipmentRelations(s));

    const draft_shipments = sortedShipments
      .filter((s) => s.status === 'draft')
      .slice(0, 10)
      .map((s) => this._resolveShipmentRelations(s));

    const saved_customs_estimates = customs_estimates.filter((c) => c.saved);

    const saved_locations_with_details = saved_locations.map((sl) => ({
      saved_location: sl,
      location: locations.find((l) => l.id === sl.location_id) || null
    }));

    const address_book_count = addresses.filter(
      (a) => a.saved_in_address_book
    ).length;

    return {
      recent_shipments,
      draft_shipments,
      saved_customs_estimates,
      saved_locations: saved_locations_with_details,
      address_book_count
    };
  }

  // 29) getSavedAddresses
  getSavedAddresses(address_type) {
    const addresses = this._getFromStorage('addresses', []);
    return addresses.filter((a) => {
      if (!a.saved_in_address_book) return false;
      if (address_type && a.address_type !== address_type) return false;
      return true;
    });
  }

  // 30) createOrUpdateAddress
  createOrUpdateAddress(
    addressId,
    address_type,
    name,
    company_name,
    street_line1,
    street_line2,
    city,
    state_province,
    postal_code,
    country,
    phone,
    email,
    saved_in_address_book,
    is_default_sender,
    is_default_recipient
  ) {
    const addresses = this._getFromStorage('addresses', []);
    let address = null;

    if (addressId) {
      const idx = addresses.findIndex((a) => a.id === addressId);
      if (idx === -1) {
        throw new Error('Address not found');
      }
      address = addresses[idx];
      address.address_type = address_type;
      if (name !== undefined) address.name = name;
      if (company_name !== undefined) address.company_name = company_name;
      if (street_line1 !== undefined) address.street_line1 = street_line1;
      if (street_line2 !== undefined) address.street_line2 = street_line2;
      if (city !== undefined) address.city = city;
      if (state_province !== undefined) address.state_province = state_province;
      if (postal_code !== undefined) address.postal_code = postal_code;
      if (country !== undefined) address.country = country;
      if (phone !== undefined) address.phone = phone;
      if (email !== undefined) address.email = email;
      if (saved_in_address_book !== undefined) {
        address.saved_in_address_book = saved_in_address_book;
      }
      if (is_default_sender !== undefined) {
        address.is_default_sender = is_default_sender;
      }
      if (is_default_recipient !== undefined) {
        address.is_default_recipient = is_default_recipient;
      }
      address.updated_at = new Date().toISOString();
      addresses[idx] = address;
    } else {
      address = {
        id: this._generateId('addr'),
        name: name || '',
        company_name: company_name || '',
        address_type,
        street_line1: street_line1 || '',
        street_line2: street_line2 || '',
        city: city || '',
        state_province: state_province || '',
        postal_code: postal_code || '',
        country: country || '',
        phone: phone || '',
        email: email || '',
        is_default_sender: !!is_default_sender,
        is_default_recipient: !!is_default_recipient,
        saved_in_address_book:
          saved_in_address_book !== undefined ? saved_in_address_book : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      addresses.push(address);
    }

    // If marking as default, unset other defaults of same type
    if (address.is_default_sender) {
      addresses.forEach((a) => {
        if (a.id !== address.id && a.is_default_sender) {
          a.is_default_sender = false;
        }
      });
    }
    if (address.is_default_recipient) {
      addresses.forEach((a) => {
        if (a.id !== address.id && a.is_default_recipient) {
          a.is_default_recipient = false;
        }
      });
    }

    this._saveToStorage('addresses', addresses);

    return { address };
  }

  // 31) deleteAddress
  deleteAddress(addressId) {
    const addresses = this._getFromStorage('addresses', []);
    const newList = addresses.filter((a) => a.id !== addressId);
    const success = newList.length !== addresses.length;
    if (success) {
      this._saveToStorage('addresses', newList);
    }
    return { success };
  }

  // 32) getInformationalPageContent
  getInformationalPageContent(page_slug) {
    const pages = {
      about: {
        title: 'About Our International Logistics Services',
        sections: [
          {
            heading: 'Who we are',
            body_html:
              '<p>We provide international logistics and shipping solutions for businesses and individuals, focusing on reliability, transparency, and sustainability.</p>'
          },
          {
            heading: 'Our network',
            body_html:
              '<p>Our carrier network spans over 200 countries and territories, offering a range of services from economy document shipping to express freight.</p>'
          }
        ]
      },
      help_support: {
        title: 'Help & Support',
        sections: [
          {
            heading: 'Shipping help',
            body_html:
              '<p>Find answers about creating shipments, scheduling pickups, tracking, and customs clearance.</p>'
          },
          {
            heading: 'Contact us',
            body_html:
              '<p>Use the support form on this page to reach our customer support team for personalised assistance.</p>'
          }
        ]
      },
      terms_conditions: {
        title: 'Terms & Conditions',
        sections: [
          {
            heading: 'Service terms',
            body_html:
              '<p>These terms govern the use of our logistics and shipping services, including responsibilities, limitations of liability, and claims procedures.</p>'
          }
        ]
      },
      privacy_policy: {
        title: 'Privacy Policy',
        sections: [
          {
            heading: 'Data protection',
            body_html:
              '<p>We process your personal data in accordance with applicable data protection laws and use it only to provide and improve our services.</p>'
          }
        ]
      }
    };

    const page = pages[page_slug];
    if (!page) {
      throw new Error('Unknown informational page slug');
    }
    return page;
  }

  // 33) submitSupportRequest
  submitSupportRequest(name, email, topic, message) {
    const support_requests = this._getFromStorage('support_requests', []);
    const reference_id = this._generateId('sup');

    const req = {
      id: reference_id,
      name,
      email,
      topic: topic || '',
      message,
      created_at: new Date().toISOString()
    };

    support_requests.push(req);
    this._saveToStorage('support_requests', support_requests);

    return {
      success: true,
      reference_id
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
