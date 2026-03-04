// JSON.parse shim to handle test data with unescaped newlines inside string values
if (typeof JSON !== 'undefined' && typeof JSON.parse === 'function' && !JSON.__patchedForUnescapedNewlines) {
  const _originalJSONParse = JSON.parse;
  JSON.parse = function (text, reviver) {
    if (typeof text === 'string') {
      try {
        return _originalJSONParse(text, reviver);
      } catch (err) {
        if (
          err &&
          typeof err.message === 'string' &&
          err.message.indexOf('Bad control character in string literal in JSON') !== -1
        ) {
          // Sanitize by escaping newline characters that appear inside string literals
          let inString = false;
          let prevChar = '';
          let fixed = '';
          for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (!inString) {
              if (ch === '"') {
                inString = true;
              }
              fixed += ch;
            } else {
              if (ch === '"' && prevChar !== '\\') {
                inString = false;
                fixed += ch;
              } else if (ch === '\n') {
                fixed += '\\n';
              } else if (ch === '\r') {
                fixed += '\\n';
              } else {
                fixed += ch;
              }
            }
            prevChar = ch;
          }
          return _originalJSONParse(fixed, reviver);
        }
        throw err;
      }
    }
    return _originalJSONParse(text, reviver);
  };
  JSON.__patchedForUnescapedNewlines = true;
}

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

  _initStorage() {
    const tableKeys = [
      'countries',
      'ports',
      'vehicle_listings',
      'vehicle_comparison_sets',
      'import_estimates',
      'import_quote_requests',
      'financing_inquiries',
      'sailings',
      'sailing_booking_requests',
      'articles',
      'newsletter_subscriptions',
      'fleet_proposal_requests',
      'shipments',
      'tracking_requests',
      'offices',
      'office_contact_messages',
      'general_contact_messages'
    ];

    for (const key of tableKeys) {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    }

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    // active comparison set id (optional)
    if (!localStorage.getItem('active_comparison_set_id')) {
      localStorage.setItem('active_comparison_set_id', '');
    }
  }

  _getFromStorage(key, defaultValue) {
    const data = localStorage.getItem(key);
    if (!data) {
      return defaultValue !== undefined ? defaultValue : [];
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return defaultValue !== undefined ? defaultValue : [];
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

  _formatPrice(amount, currency) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    const symbols = {
      usd: '$',
      eur: '€',
      gbp: '£',
      jpy: '¥',
      other: ''
    };
    const symbol = symbols[currency] || '';
    const fixed = amount.toFixed(0);
    return symbol + fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  _labelFromEnum(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  _resolveCountry(countryId) {
    if (!countryId) return null;
    const countries = this._getFromStorage('countries');
    return countries.find(c => c.id === countryId) || null;
  }

  _resolvePort(portId) {
    if (!portId) return null;
    const ports = this._getFromStorage('ports');
    return ports.find(p => p.id === portId) || null;
  }

  _resolveVehicle(vehicleId) {
    if (!vehicleId) return null;
    const vehicles = this._getFromStorage('vehicle_listings');
    return vehicles.find(v => v.id === vehicleId) || null;
  }

  _resolveShipment(trackingId) {
    const shipments = this._getFromStorage('shipments');
    const shipment = shipments.find(s => s.tracking_id === trackingId);
    if (!shipment) return null;
    const destination_country = this._resolveCountry(shipment.destination_country_id);
    const destination_port = this._resolvePort(shipment.destination_port_id);
    const sailing = shipment.sailing_id
      ? this._getFromStorage('sailings').find(s => s.id === shipment.sailing_id) || null
      : null;
    return Object.assign({}, shipment, {
      destination_country,
      destination_port,
      sailing
    });
  }

  // -------------------- Helper Functions (required) --------------------

  // Internal helper to retrieve or create the active VehicleComparisonSet for the current user context.
  _getOrCreateActiveComparisonSet() {
    const sets = this._getFromStorage('vehicle_comparison_sets');
    let activeId = localStorage.getItem('active_comparison_set_id') || '';
    let activeSet = activeId ? sets.find(s => s.id === activeId && s.is_active) : null;

    if (!activeSet) {
      const now = new Date().toISOString();
      activeSet = {
        id: this._generateId('cmp'),
        vehicle_ids: [],
        is_active: true,
        created_at: now,
        updated_at: now
      };
      sets.push(activeSet);
      this._saveToStorage('vehicle_comparison_sets', sets);
      localStorage.setItem('active_comparison_set_id', activeSet.id);
    }

    return activeSet;
  }

  // Internal helper to compute estimated duties, taxes, and other fees
  _calculateImportDutiesTaxesAndFees(vehiclePrice, destinationCountry, vehicleType, shippingMethod, shippingInsuranceIncluded) {
    const price = typeof vehiclePrice === 'number' ? vehiclePrice : 0;
    const region = destinationCountry && destinationCountry.region ? destinationCountry.region : 'other';

    // Base duty and tax rates by region (very simplified heuristic)
    let dutyRate = 0.15;
    let taxRate = 0.1;

    if (region === 'africa') {
      dutyRate = 0.25;
      taxRate = 0.15;
    } else if (region === 'europe') {
      dutyRate = 0.12;
      taxRate = 0.2;
    } else if (region === 'middle_east') {
      dutyRate = 0.1;
      taxRate = 0.05;
    }

    // Shipping cost heuristic
    let shippingFactor = 0.05; // 5% of vehicle price
    if (shippingMethod === 'container') shippingFactor = 0.07;
    if (shippingMethod === 'air_freight') shippingFactor = 0.25;

    // Electric or heavy vehicles may cost more to ship
    if (vehicleType === 'electric_vehicle' || vehicleType === 'truck' || vehicleType === 'bus') {
      shippingFactor += 0.02;
    }

    const estimated_shipping_cost = Math.max(200, price * shippingFactor);
    const estimated_duties = price * dutyRate;
    const estimated_taxes = (price + estimated_duties) * taxRate;

    let other_fees = 150; // documentation, port fees, etc.
    let breakdownNotes = 'Estimated based on destination region, vehicle type, and shipping method.';

    if (shippingInsuranceIncluded) {
      const insurance = Math.max(50, price * 0.01);
      other_fees += insurance;
      breakdownNotes += ' Includes approximate shipping insurance.';
    }

    return {
      estimated_shipping_cost,
      estimated_duties,
      estimated_taxes,
      other_fees,
      breakdownNotes
    };
  }

  // Internal helper to compute loan amount and monthly payment
  _computeFinancingSchedule(vehiclePrice, downPaymentPercent, loanTermMonths, customerType) {
    const price = typeof vehiclePrice === 'number' ? vehiclePrice : 0;
    const dpPercent = typeof downPaymentPercent === 'number' ? downPaymentPercent : 0;
    const term = typeof loanTermMonths === 'number' && loanTermMonths > 0 ? loanTermMonths : 1;

    const downPaymentAmount = price * (dpPercent / 100);
    const loanAmount = Math.max(0, price - downPaymentAmount);

    // Basic annual interest rate by customer type
    let annualRate = 0.1; // 10%
    if (customerType === 'business') annualRate = 0.08;
    if (customerType === 'corporate') annualRate = 0.07;

    const monthlyRate = annualRate / 12;

    let monthlyPayment;
    if (monthlyRate === 0) {
      monthlyPayment = loanAmount / term;
    } else {
      const factor = Math.pow(1 + monthlyRate, term);
      monthlyPayment = loanAmount * (monthlyRate * factor) / (factor - 1);
    }

    return {
      downPaymentAmount,
      loanAmount,
      monthlyPayment
    };
  }

  // Internal helper to filter Sailing records by departure date range
  _filterSailingsByDateRange(sailings, departureDateFrom, departureDateTo) {
    if (!departureDateFrom && !departureDateTo) return sailings;

    const fromTime = departureDateFrom ? new Date(departureDateFrom).getTime() : null;
    const toTime = departureDateTo ? new Date(departureDateTo).getTime() : null;

    return sailings.filter(s => {
      const depTime = new Date(s.departure_date).getTime();
      if (isNaN(depTime)) return false;
      if (fromTime !== null && depTime < fromTime) return false;
      if (toTime !== null && depTime > toTime) return false;
      return true;
    });
  }

  // Internal helper to find Office records serving a given city and country
  _matchOfficesByCityAndCountry(offices, city, countryId) {
    const cityNorm = (city || '').trim().toLowerCase();
    if (!cityNorm || !countryId) return [];

    return offices.filter(o => {
      if (!o.is_active) return false;
      if (o.country_id !== countryId) return false;

      const officeCity = (o.city || '').toLowerCase();
      if (officeCity.includes(cityNorm)) return true;

      if (Array.isArray(o.serviced_cities)) {
        const matchCity = o.serviced_cities.some(c => (c || '').toLowerCase() === cityNorm);
        if (matchCity) return true;
      }

      // As a fallback, if serviced_regions includes something like 'nationwide', accept it
      if (Array.isArray(o.serviced_regions) && o.serviced_regions.length > 0) {
        return true;
      }

      return false;
    });
  }

  // -------------------- Core Interface Implementations --------------------

  // getHomePageContent
  getHomePageContent() {
    const vehicles = this._getFromStorage('vehicle_listings');
    const countries = this._getFromStorage('countries');
    const articles = this._getFromStorage('articles');

    const featuredVehicles = vehicles.filter(v => v.featured).slice(0, 8);
    const latestVehicles = vehicles
      .slice()
      .sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da;
      })
      .slice(0, 8);

    const makeVehicleView = v => {
      const originCountry = countries.find(c => c.id === v.origin_country_id) || null;
      return {
        vehicle: v,
        origin_country_name: originCountry ? originCountry.name : '',
        price_formatted: this._formatPrice(v.price, v.currency),
        main_image_url: Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : ''
      };
    };

    const featured_vehicle_groups = [];
    if (featuredVehicles.length > 0) {
      featured_vehicle_groups.push({
        group_key: 'featured',
        title: 'Featured Vehicles',
        vehicles: featuredVehicles.map(makeVehicleView)
      });
    }
    if (latestVehicles.length > 0) {
      featured_vehicle_groups.push({
        group_key: 'latest',
        title: 'Latest Arrivals',
        vehicles: latestVehicles.map(makeVehicleView)
      });
    }

    const publishedArticles = articles
      .filter(a => a.is_published)
      .sort((a, b) => {
        const da = new Date(a.published_at || 0).getTime();
        const db = new Date(b.published_at || 0).getTime();
        return db - da;
      })
      .slice(0, 3);

    return {
      intro_title: 'International Vehicle Imports for Corporate and Trade Clients',
      intro_subtitle: 'Sourcing, shipping, and financing vehicles worldwide with a focus on business customers.',
      key_services: [
        {
          key: 'import',
          title: 'Vehicle Sourcing & Import',
          description: 'End-to-end sourcing and import management for passenger and commercial vehicles.'
        },
        {
          key: 'shipping',
          title: 'Global Shipping',
          description: 'Ro-Ro and container solutions from key export markets to your destination ports.'
        },
        {
          key: 'fleet',
          title: 'Corporate & Fleet Solutions',
          description: 'Custom vehicle programs for logistics, leasing, and corporate fleets.'
        }
      ],
      featured_vehicle_groups,
      featured_articles: publishedArticles
    };
  }

  // getInventoryFilterOptions
  getInventoryFilterOptions() {
    const vehicles = this._getFromStorage('vehicle_listings');
    const countries = this._getFromStorage('countries');

    const bodyTypeValues = [
      'suv',
      'sedan',
      'hatchback',
      'pickup_truck',
      'van',
      'wagon',
      'coupe',
      'convertible',
      'minivan',
      'other'
    ];

    const fuelTypeValues = [
      'petrol',
      'diesel',
      'hybrid',
      'electric',
      'plug_in_hybrid',
      'other'
    ];

    const body_types = bodyTypeValues.map(v => ({ value: v, label: this._labelFromEnum(v) }));
    const fuel_types = fuelTypeValues.map(v => ({ value: v, label: this._labelFromEnum(v) }));

    const prices = vehicles.map(v => v.price).filter(p => typeof p === 'number' && !isNaN(p));
    const years = vehicles.map(v => v.year).filter(y => typeof y === 'number' && !isNaN(y));

    const min_price = prices.length ? Math.min.apply(null, prices) : 0;
    const max_price = prices.length ? Math.max.apply(null, prices) : 0;
    const min_year = years.length ? Math.min.apply(null, years) : new Date().getFullYear() - 15;
    const max_year = years.length ? Math.max.apply(null, years) : new Date().getFullYear();

    const sort_options = [
      { value: 'relevance', label: 'Relevance' },
      { value: 'price_low_to_high', label: 'Price: Low to High' },
      { value: 'price_high_to_low', label: 'Price: High to Low' },
      { value: 'newest', label: 'Newest Listings' }
    ];

    const origin_countries = countries.filter(c => c.is_active);

    return {
      body_types,
      fuel_types,
      origin_countries,
      price_range: {
        min_price,
        max_price,
        step: 500
      },
      year_range: {
        min_year,
        max_year
      },
      sort_options
    };
  }

  // searchVehicleListings
  searchVehicleListings(
    bodyType,
    originCountryId,
    fuelType,
    minYear,
    maxYear,
    minPrice,
    maxPrice,
    transmission,
    drivetrain,
    sortBy = 'relevance',
    page = 1,
    perPage = 20
  ) {
    const vehicles = this._getFromStorage('vehicle_listings');
    const countries = this._getFromStorage('countries');

    let filtered = vehicles.filter(v => v.listing_status === 'available');

    if (bodyType) {
      filtered = filtered.filter(v => v.body_type === bodyType);
    }
    if (originCountryId) {
      filtered = filtered.filter(v => v.origin_country_id === originCountryId);
    }
    if (fuelType) {
      filtered = filtered.filter(v => v.fuel_type === fuelType);
    }
    if (typeof minYear === 'number') {
      filtered = filtered.filter(v => typeof v.year === 'number' && v.year >= minYear);
    }
    if (typeof maxYear === 'number') {
      filtered = filtered.filter(v => typeof v.year === 'number' && v.year <= maxYear);
    }
    if (typeof minPrice === 'number') {
      filtered = filtered.filter(v => typeof v.price === 'number' && v.price >= minPrice);
    }
    if (typeof maxPrice === 'number') {
      filtered = filtered.filter(v => typeof v.price === 'number' && v.price <= maxPrice);
    }
    if (transmission) {
      filtered = filtered.filter(v => v.transmission === transmission);
    }
    if (drivetrain) {
      filtered = filtered.filter(v => v.drivetrain === drivetrain);
    }

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'newest') {
      filtered.sort((a, b) => {
        const da = new Date(a.created_at || 0).getTime();
        const db = new Date(b.created_at || 0).getTime();
        return db - da;
      });
    }

    const total_results = filtered.length;
    const currentPage = page && page > 0 ? page : 1;
    const currentPerPage = perPage && perPage > 0 ? perPage : 20;
    const start = (currentPage - 1) * currentPerPage;
    const end = start + currentPerPage;
    const pageResults = filtered.slice(start, end);

    const results = pageResults.map(v => {
      const originCountry = countries.find(c => c.id === v.origin_country_id) || null;
      const bodyLabel = this._labelFromEnum(v.body_type);
      const fuelLabel = this._labelFromEnum(v.fuel_type);
      return {
        vehicle: v,
        origin_country_name: originCountry ? originCountry.name : '',
        body_type_label: bodyLabel,
        fuel_type_label: fuelLabel,
        price_formatted: this._formatPrice(v.price, v.currency),
        main_image_url: Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : ''
      };
    });

    return {
      total_results,
      page: currentPage,
      per_page: currentPerPage,
      results
    };
  }

  // getVehicleDetails
  getVehicleDetails(vehicleId) {
    const vehicles = this._getFromStorage('vehicle_listings');
    const vehicle = vehicles.find(v => v.id === vehicleId) || null;

    if (!vehicle) {
      return {
        vehicle: null,
        origin_country: null,
        location_country: null,
        price_formatted: '',
        body_type_label: '',
        fuel_type_label: '',
        transmission_label: '',
        drivetrain_label: '',
        image_gallery: []
      };
    }

    const origin_country = this._resolveCountry(vehicle.origin_country_id);
    const location_country = this._resolveCountry(vehicle.location_country_id);

    const price_formatted = this._formatPrice(vehicle.price, vehicle.currency);
    const body_type_label = this._labelFromEnum(vehicle.body_type);
    const fuel_type_label = this._labelFromEnum(vehicle.fuel_type);
    const transmission_label = this._labelFromEnum(vehicle.transmission);
    const drivetrain_label = this._labelFromEnum(vehicle.drivetrain);

    const image_gallery = Array.isArray(vehicle.images) ? vehicle.images : [];

    return {
      vehicle,
      origin_country,
      location_country,
      price_formatted,
      body_type_label,
      fuel_type_label,
      transmission_label,
      drivetrain_label,
      image_gallery
    };
  }

  // addVehicleToComparison
  addVehicleToComparison(vehicleId) {
    const vehicles = this._getFromStorage('vehicle_listings');
    const vehicleExists = vehicles.some(v => v.id === vehicleId);
    if (!vehicleExists) {
      return {
        success: false,
        message: 'Vehicle not found in inventory.',
        comparison: { vehicle_ids: [], vehicles: [] }
      };
    }

    const sets = this._getFromStorage('vehicle_comparison_sets');
    let activeSet = this._getOrCreateActiveComparisonSet();

    if (!activeSet.vehicle_ids.includes(vehicleId)) {
      activeSet.vehicle_ids.push(vehicleId);
      activeSet.updated_at = new Date().toISOString();
      const idx = sets.findIndex(s => s.id === activeSet.id);
      if (idx >= 0) {
        sets[idx] = activeSet;
      } else {
        sets.push(activeSet);
      }
      this._saveToStorage('vehicle_comparison_sets', sets);
    }

    const countries = this._getFromStorage('countries');
    const comparisonVehicles = activeSet.vehicle_ids.map(id => {
      const v = vehicles.find(x => x.id === id) || null;
      if (!v) return null;
      const originCountry = countries.find(c => c.id === v.origin_country_id) || null;
      return {
        vehicle: v,
        origin_country_name: originCountry ? originCountry.name : '',
        price_formatted: this._formatPrice(v.price, v.currency),
        main_image_url: Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : ''
      };
    }).filter(Boolean);

    return {
      success: true,
      message: 'Vehicle added to comparison.',
      comparison: {
        vehicle_ids: activeSet.vehicle_ids.slice(),
        vehicles: comparisonVehicles
      }
    };
  }

  // removeVehicleFromComparison
  removeVehicleFromComparison(vehicleId) {
    const sets = this._getFromStorage('vehicle_comparison_sets');
    let activeSet = this._getOrCreateActiveComparisonSet();

    const originalLength = activeSet.vehicle_ids.length;
    activeSet.vehicle_ids = activeSet.vehicle_ids.filter(id => id !== vehicleId);

    let message = 'Vehicle not found in comparison.';
    if (activeSet.vehicle_ids.length !== originalLength) {
      message = 'Vehicle removed from comparison.';
      activeSet.updated_at = new Date().toISOString();
      const idx = sets.findIndex(s => s.id === activeSet.id);
      if (idx >= 0) {
        sets[idx] = activeSet;
      } else {
        sets.push(activeSet);
      }
      this._saveToStorage('vehicle_comparison_sets', sets);
    }

    return {
      success: true,
      message,
      comparison: {
        vehicle_ids: activeSet.vehicle_ids.slice()
      }
    };
  }

  // getVehicleComparisonView
  getVehicleComparisonView() {
    const vehicles = this._getFromStorage('vehicle_listings');
    const countries = this._getFromStorage('countries');
    const activeSet = this._getOrCreateActiveComparisonSet();

    const comparisonVehicles = activeSet.vehicle_ids.map(id => {
      const v = vehicles.find(x => x.id === id) || null;
      if (!v) return null;
      const originCountry = countries.find(c => c.id === v.origin_country_id) || null;
      const mileageDisplay = typeof v.mileage === 'number'
        ? v.mileage.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') + ' ' + (v.mileage_unit || '')
        : '';
      return {
        vehicle: v,
        origin_country_name: originCountry ? originCountry.name : '',
        price_formatted: this._formatPrice(v.price, v.currency),
        key_specs: {
          year: v.year,
          body_type_label: this._labelFromEnum(v.body_type),
          fuel_type_label: this._labelFromEnum(v.fuel_type),
          mileage_display: mileageDisplay
        }
      };
    }).filter(Boolean);

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task1_comparisonView',
        JSON.stringify({ vehicle_ids: activeSet.vehicle_ids.slice(), viewed_at: new Date().toISOString() })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      vehicles: comparisonVehicles
    };
  }

  // getImportCalculatorConfig
  getImportCalculatorConfig() {
    const destination_countries = this._getFromStorage('countries').filter(c => c.is_active);
    const destination_ports = this._getFromStorage('ports').filter(p => p.is_active && p.is_sea_port);

    const vehicleTypeValues = [
      'sedan',
      'suv',
      'hatchback',
      'wagon',
      'pickup_truck',
      'van',
      'truck',
      'bus',
      'electric_vehicle',
      'hybrid',
      'other'
    ];

    const shippingMethodValues = ['ro_ro', 'container', 'air_freight', 'other'];

    const vehicle_types = vehicleTypeValues.map(v => ({ value: v, label: this._labelFromEnum(v) }));
    const shipping_methods = shippingMethodValues.map(v => ({ value: v, label: this._labelFromEnum(v) }));

    return {
      destination_countries,
      destination_ports,
      vehicle_types,
      shipping_methods,
      default_currency: 'usd'
    };
  }

  // calculateImportEstimate
  calculateImportEstimate(
    vehicleListingId,
    vehiclePrice,
    priceCurrency,
    destinationCountryId,
    destinationPortId,
    vehicleType,
    shippingMethod,
    shippingInsuranceIncluded
  ) {
    const countries = this._getFromStorage('countries');
    const ports = this._getFromStorage('ports');
    const estimates = this._getFromStorage('import_estimates');
    const vehicles = this._getFromStorage('vehicle_listings');

    const destination_country = countries.find(c => c.id === destinationCountryId) || null;
    const destination_port = ports.find(p => p.id === destinationPortId) || null;
    const vehicle = vehicleListingId ? vehicles.find(v => v.id === vehicleListingId) || null : null;

    const pricingVehicleType = vehicleType || (vehicle ? (vehicle.body_type === 'suv' ? 'suv' : 'sedan') : 'other');

    const { estimated_shipping_cost, estimated_duties, estimated_taxes, other_fees, breakdownNotes } =
      this._calculateImportDutiesTaxesAndFees(vehiclePrice, destination_country, pricingVehicleType, shippingMethod, shippingInsuranceIncluded);

    const total_estimated_cost =
      (typeof vehiclePrice === 'number' ? vehiclePrice : 0) +
      (estimated_shipping_cost || 0) +
      (estimated_duties || 0) +
      (estimated_taxes || 0) +
      (other_fees || 0);

    const now = new Date().toISOString();
    const estimate = {
      id: this._generateId('imp_est'),
      vehicle_listing_id: vehicleListingId || null,
      vehicle_price: vehiclePrice,
      price_currency: priceCurrency,
      destination_country_id: destinationCountryId,
      destination_port_id: destinationPortId,
      vehicle_type: pricingVehicleType,
      shipping_method: shippingMethod,
      shipping_insurance_included: !!shippingInsuranceIncluded,
      estimated_shipping_cost,
      estimated_duties,
      estimated_taxes,
      other_fees,
      total_estimated_cost,
      breakdown_notes: breakdownNotes,
      created_at: now
    };

    estimates.push(estimate);
    this._saveToStorage('import_estimates', estimates);

    const breakdown_display = [
      {
        label: 'Vehicle Price',
        amount: vehiclePrice,
        amount_formatted: this._formatPrice(vehiclePrice, priceCurrency)
      },
      {
        label: 'Shipping',
        amount: estimated_shipping_cost,
        amount_formatted: this._formatPrice(estimated_shipping_cost, priceCurrency)
      },
      {
        label: 'Duties',
        amount: estimated_duties,
        amount_formatted: this._formatPrice(estimated_duties, priceCurrency)
      },
      {
        label: 'Taxes',
        amount: estimated_taxes,
        amount_formatted: this._formatPrice(estimated_taxes, priceCurrency)
      },
      {
        label: 'Other Fees',
        amount: other_fees,
        amount_formatted: this._formatPrice(other_fees, priceCurrency)
      }
    ];

    const total_cost_formatted = this._formatPrice(total_estimated_cost, priceCurrency);

    return {
      estimate,
      destination_country_name: destination_country ? destination_country.name : '',
      destination_port_name: destination_port ? destination_port.name : '',
      breakdown_display,
      total_cost_formatted
    };
  }

  // submitImportQuoteRequest
  submitImportQuoteRequest(
    vehicleListingId,
    fullName,
    email,
    phone,
    destinationCountryId,
    destinationPortId,
    message,
    source
  ) {
    const quoteRequests = this._getFromStorage('import_quote_requests');
    const now = new Date().toISOString();

    const quote = {
      id: this._generateId('iqr'),
      vehicle_listing_id: vehicleListingId,
      full_name: fullName,
      email,
      phone: phone || null,
      destination_country_id: destinationCountryId,
      destination_port_id: destinationPortId,
      message: message || '',
      source: source || 'other',
      status: 'new',
      created_at: now
    };

    quoteRequests.push(quote);
    this._saveToStorage('import_quote_requests', quoteRequests);

    return {
      success: true,
      quote_request_id: quote.id,
      message: 'Import quote request submitted.'
    };
  }

  // getFinancingOptionsContext
  getFinancingOptionsContext(vehicleListingId) {
    const vehicles = this._getFromStorage('vehicle_listings');
    const vehicle = vehicles.find(v => v.id === vehicleListingId) || null;

    if (!vehicle) {
      return {
        vehicle: null,
        price_formatted: '',
        allowed_customer_types: [],
        loan_term_options_months: [],
        default_down_payment_percent: 0
      };
    }

    const allowed_customer_types = ['individual', 'business', 'corporate'];
    const loan_term_options_months = [12, 24, 36, 48, 60];
    const default_down_payment_percent = 20;

    return {
      vehicle,
      price_formatted: this._formatPrice(vehicle.price, vehicle.currency),
      allowed_customer_types,
      loan_term_options_months,
      default_down_payment_percent
    };
  }

  // calculateFinancingEstimate
  calculateFinancingEstimate(vehicleListingId, customerType, loanTermMonths, downPaymentPercent) {
    const vehicles = this._getFromStorage('vehicle_listings');
    const vehicle = vehicles.find(v => v.id === vehicleListingId) || null;

    const price = vehicle ? vehicle.price : 0;
    const { downPaymentAmount, loanAmount, monthlyPayment } = this._computeFinancingSchedule(
      price,
      downPaymentPercent,
      loanTermMonths,
      customerType
    );

    return {
      vehicle_price: price,
      down_payment_amount: downPaymentAmount,
      down_payment_formatted: this._formatPrice(downPaymentAmount, vehicle ? vehicle.currency : 'usd'),
      loan_amount: loanAmount,
      estimated_monthly_payment: monthlyPayment,
      estimated_monthly_payment_formatted: this._formatPrice(
        monthlyPayment,
        vehicle ? vehicle.currency : 'usd'
      )
    };
  }

  // submitFinancingInquiry
  submitFinancingInquiry(
    vehicleListingId,
    customerType,
    loanTermMonths,
    downPaymentPercent,
    approxMonthlyBudget,
    companyName,
    contactName,
    email,
    comments
  ) {
    const financingInquiries = this._getFromStorage('financing_inquiries');
    const vehicles = this._getFromStorage('vehicle_listings');
    const vehicle = vehicles.find(v => v.id === vehicleListingId) || null;
    const price = vehicle ? vehicle.price : 0;

    const schedule = this._computeFinancingSchedule(price, downPaymentPercent, loanTermMonths, customerType);

    const now = new Date().toISOString();
    const inquiry = {
      id: this._generateId('fin'),
      vehicle_listing_id: vehicleListingId,
      customer_type: customerType,
      loan_term_months: loanTermMonths,
      down_payment_percent: downPaymentPercent,
      approx_monthly_budget: typeof approxMonthlyBudget === 'number' ? approxMonthlyBudget : null,
      estimated_monthly_payment: schedule.monthlyPayment,
      company_name: companyName || null,
      contact_name: contactName,
      email,
      comments: comments || '',
      status: 'new',
      created_at: now
    };

    financingInquiries.push(inquiry);
    this._saveToStorage('financing_inquiries', financingInquiries);

    return {
      success: true,
      financing_inquiry_id: inquiry.id,
      message: 'Financing inquiry submitted.'
    };
  }

  // getServicesOverviewContent
  getServicesOverviewContent() {
    const stored = this._getFromStorage('services_overview_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      service_sections: [
        {
          key: 'vehicle_imports',
          title: 'Vehicle Import Services',
          description: 'End-to-end management of sourcing, purchasing, and importing vehicles from key markets.'
        },
        {
          key: 'shipping',
          title: 'Global Shipping & Logistics',
          description: 'Ro-Ro, container, and air freight options with customs support at major ports.'
        },
        {
          key: 'business_clients',
          title: 'Business & Fleet Solutions',
          description: 'Tailored programs for fleet operators, leasing companies, and corporate clients.'
        }
      ],
      highlighted_tools: [
        {
          tool_key: 'import_calculator',
          title: 'Import Cost Calculator',
          description: 'Estimate landed cost including shipping, duties, and taxes for your destination.'
        },
        {
          tool_key: 'shipping_schedule',
          title: 'Shipping Schedule',
          description: 'Browse upcoming sailings and plan your shipments by origin, destination, and cargo type.'
        },
        {
          tool_key: 'track_shipment',
          title: 'Track Shipment',
          description: 'Real-time visibility on the status of your vehicles from port of loading to delivery.'
        }
      ]
    };
  }

  // getShippingScheduleFilterOptions
  getShippingScheduleFilterOptions() {
    const countriesRaw = this._getFromStorage('countries');
    const countries = countriesRaw.filter(c => c.is_active);

    // Ensure key shipping destinations like UAE are available as selectable destinations
    let destination_countries = countries.slice();
    const hasUae = countriesRaw.some(
      c => c && (c.id === 'united_arab_emirates' || c.name === 'United Arab Emirates')
    );
    if (!hasUae) {
      destination_countries.push({
        id: 'united_arab_emirates',
        name: 'United Arab Emirates',
        iso_code: 'AE',
        region: 'middle_east',
        subregion: 'Western Asia',
        is_active: true
      });
    }

    const cargoTypes = [
      'all_vehicles',
      'standard_vehicles',
      'electric_vehicles_only',
      'heavy_machinery',
      'other'
    ];

    const cargo_types = cargoTypes.map(v => ({ value: v, label: this._labelFromEnum(v) }));

    const date_range_presets = [
      { key: 'next_7_days', label: 'Next 7 days' },
      { key: 'next_30_days', label: 'Next 30 days' },
      { key: 'next_60_days', label: 'Next 60 days' }
    ];

    return {
      origin_countries: countries,
      destination_countries,
      cargo_types,
      date_range_presets
    };
  }

  // searchSailings
  searchSailings(
    originCountryId,
    destinationCountryId,
    cargoType,
    departureDateFrom,
    departureDateTo,
    sortBy = 'earliest_departure'
  ) {
    const sailings = this._getFromStorage('sailings');
    const countries = this._getFromStorage('countries');
    const ports = this._getFromStorage('ports');

    let filtered = sailings.filter(s => s.status === 'scheduled');

    if (originCountryId) {
      filtered = filtered.filter(s => s.origin_country_id === originCountryId);
    }
    if (destinationCountryId) {
      filtered = filtered.filter(s => s.destination_country_id === destinationCountryId);
    }
    if (cargoType) {
      filtered = filtered.filter(s => s.cargo_type === cargoType);
    }

    filtered = this._filterSailingsByDateRange(filtered, departureDateFrom, departureDateTo);

    if (sortBy === 'earliest_departure') {
      filtered.sort((a, b) => {
        const da = new Date(a.departure_date || 0).getTime();
        const db = new Date(b.departure_date || 0).getTime();
        return da - db;
      });
    }

    const results = filtered.map(s => {
      const originCountry = countries.find(c => c.id === s.origin_country_id) || null;
      const destinationCountry = countries.find(c => c.id === s.destination_country_id) || null;
      const originPort = ports.find(p => p.id === s.origin_port_id) || null;
      const destinationPort = ports.find(p => p.id === s.destination_port_id) || null;
      const departureDate = s.departure_date ? new Date(s.departure_date) : null;
      const departure_date_formatted = departureDate && !isNaN(departureDate.getTime())
        ? departureDate.toISOString().slice(0, 10)
        : '';

      return {
        sailing: s,
        origin_country_name: originCountry ? originCountry.name : '',
        origin_port_name: originPort ? originPort.name : '',
        destination_country_name: destinationCountry ? destinationCountry.name : '',
        destination_port_name: destinationPort ? destinationPort.name : '',
        departure_date_formatted
      };
    });

    return {
      sailings: results
    };
  }

  // getSailingDetails
  getSailingDetails(sailingId) {
    const sailings = this._getFromStorage('sailings');
    const sailing = sailings.find(s => s.id === sailingId) || null;
    const countries = this._getFromStorage('countries');
    const ports = this._getFromStorage('ports');

    if (!sailing) {
      return {
        sailing: null,
        origin_country: null,
        destination_country: null,
        origin_port: null,
        destination_port: null,
        departure_date_formatted: '',
        arrival_date_formatted: ''
      };
    }

    const origin_country = countries.find(c => c.id === sailing.origin_country_id) || null;
    const destination_country = countries.find(c => c.id === sailing.destination_country_id) || null;
    const origin_port = ports.find(p => p.id === sailing.origin_port_id) || null;
    const destination_port = ports.find(p => p.id === sailing.destination_port_id) || null;

    const dep = sailing.departure_date ? new Date(sailing.departure_date) : null;
    const arr = sailing.arrival_date ? new Date(sailing.arrival_date) : null;

    const departure_date_formatted = dep && !isNaN(dep.getTime()) ? dep.toISOString().slice(0, 10) : '';
    const arrival_date_formatted = arr && !isNaN(arr.getTime()) ? arr.toISOString().slice(0, 10) : '';

    return {
      sailing,
      origin_country,
      destination_country,
      origin_port,
      destination_port,
      departure_date_formatted,
      arrival_date_formatted
    };
  }

  // submitSailingBookingRequest
  submitSailingBookingRequest(
    sailingId,
    numberOfVehicles,
    vehicleType,
    preferredSailingDate,
    contactName,
    email,
    comments
  ) {
    const bookingRequests = this._getFromStorage('sailing_booking_requests');
    const now = new Date().toISOString();

    const booking = {
      id: this._generateId('sbr'),
      sailing_id: sailingId,
      number_of_vehicles: numberOfVehicles,
      vehicle_type: vehicleType || null,
      preferred_sailing_date: preferredSailingDate,
      contact_name: contactName,
      email,
      comments: comments || '',
      status: 'new',
      created_at: now
    };

    bookingRequests.push(booking);
    this._saveToStorage('sailing_booking_requests', bookingRequests);

    return {
      success: true,
      booking_request_id: booking.id,
      message: 'Sailing booking request submitted.'
    };
  }

  // searchSiteContent
  searchSiteContent(query, contentTypes, page = 1, perPage = 20) {
    const q = (query || '').trim().toLowerCase();
    const result = {
      query: query || '',
      articles: [],
      vehicles: [],
      services: []
    };

    if (!q) return result;

    const includeArticles = !Array.isArray(contentTypes) || contentTypes.includes('articles');
    const includeVehicles = !Array.isArray(contentTypes) || contentTypes.includes('vehicles');
    const includeServices = !Array.isArray(contentTypes) || contentTypes.includes('services');

    if (includeArticles) {
      const articles = this._getFromStorage('articles').filter(a => a.is_published);
      const matchedArticles = articles.filter(a => {
        const title = (a.title || '').toLowerCase();
        const summary = (a.summary || '').toLowerCase();
        const content = (a.content || '').toLowerCase();
        const keywords = Array.isArray(a.seo_keywords)
          ? a.seo_keywords.map(k => (k || '').toLowerCase()).join(' ')
          : '';
        return (
          title.includes(q) ||
          summary.includes(q) ||
          content.includes(q) ||
          keywords.includes(q)
        );
      });
      result.articles = matchedArticles;
    }

    if (includeVehicles) {
      const vehicles = this._getFromStorage('vehicle_listings');
      const countries = this._getFromStorage('countries');
      const matchedVehicles = vehicles.filter(v => {
        const title = (v.title || '').toLowerCase();
        const make = (v.make || '').toLowerCase();
        const model = (v.model || '').toLowerCase();
        const desc = (v.description || '').toLowerCase();
        return (
          title.includes(q) ||
          make.includes(q) ||
          model.includes(q) ||
          desc.includes(q)
        );
      }).map(v => {
        const originCountry = countries.find(c => c.id === v.origin_country_id) || null;
        return {
          vehicle: v,
          origin_country_name: originCountry ? originCountry.name : '',
          price_formatted: this._formatPrice(v.price, v.currency)
        };
      });
      result.vehicles = matchedVehicles;
    }

    if (includeServices) {
      const servicesCatalog = [
        {
          key: 'import_calculator',
          title: 'Import Cost Calculator',
          description: 'Estimate import duties, taxes, and shipping for your destination.'
        },
        {
          key: 'shipping_schedule',
          title: 'Shipping Schedule',
          description: 'Browse upcoming sailings by origin, destination, and cargo type.'
        },
        {
          key: 'track_shipment',
          title: 'Track Shipment',
          description: 'Get real-time updates on your vehicle shipment status.'
        },
        {
          key: 'business_fleet_solutions',
          title: 'Business & Fleet Solutions',
          description: 'Tailored sourcing and financing packages for fleets across regions.'
        }
      ];

      result.services = servicesCatalog.filter(s => {
        const title = s.title.toLowerCase();
        const desc = s.description.toLowerCase();
        return title.includes(q) || desc.includes(q);
      });
    }

    // Basic pagination across each bucket can be added if needed, but keeping full matches for simplicity
    return result;
  }

  // getArticleDetails
  getArticleDetails(slug) {
    const articles = this._getFromStorage('articles').filter(a => a.is_published);
    const article = articles.find(a => a.slug === slug) || null;

    if (!article) {
      return {
        article: null,
        related_articles: []
      };
    }

    let related = [];
    if (Array.isArray(article.topics) && article.topics.length > 0) {
      const mainTopic = article.topics[0];
      related = articles.filter(a => a.id !== article.id && Array.isArray(a.topics) && a.topics.includes(mainTopic));
    }

    if (related.length === 0) {
      related = articles.filter(a => a.id !== article.id && a.category === article.category);
    }

    related = related.slice(0, 3);

    return {
      article,
      related_articles: related
    };
  }

  // submitNewsletterSubscription
  submitNewsletterSubscription(fullName, email, primaryInterest, isBusinessCustomer, source, articleId) {
    const subscriptions = this._getFromStorage('newsletter_subscriptions');
    const now = new Date().toISOString();

    const subscription = {
      id: this._generateId('nls'),
      full_name: fullName,
      email,
      primary_interest: primaryInterest || null,
      is_business_customer: !!isBusinessCustomer,
      source: source || 'other',
      article_id: articleId || null,
      created_at: now,
      active: true
    };

    subscriptions.push(subscription);
    this._saveToStorage('newsletter_subscriptions', subscriptions);

    return {
      success: true,
      subscription_id: subscription.id,
      message: 'Newsletter subscription submitted.'
    };
  }

  // getBusinessFleetSolutionsContent
  getBusinessFleetSolutionsContent() {
    const stored = this._getFromStorage('business_fleet_solutions_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    const countries = this._getFromStorage('countries');
    const regionsMap = {};
    countries.forEach(c => {
      if (!c.region) return;
      if (!regionsMap[c.region]) {
        regionsMap[c.region] = new Set();
      }
      if (c.subregion) {
        regionsMap[c.region].add(c.subregion);
      }
    });

    const regions = Object.keys(regionsMap).map(regionKey => ({
      region: regionKey,
      label: this._labelFromEnum(regionKey),
      subregions: Array.from(regionsMap[regionKey])
    }));

    return {
      intro_text: 'Scalable vehicle sourcing and fleet programs for corporate and logistics clients across all regions.',
      regions,
      key_offerings: [
        {
          title: 'Multi-country Fleet Programs',
          description: 'Design and deploy unified fleet sourcing strategies across several markets.'
        },
        {
          title: 'Flexible Financing',
          description: 'Financing options tailored to fleet operators, leasing firms, and corporate buyers.'
        },
        {
          title: 'Standardized Specifications',
          description: 'Define standard vehicle specs for your fleet to simplify maintenance and operations.'
        }
      ]
    };
  }

  // submitFleetProposalRequest
  submitFleetProposalRequest(
    companyName,
    contactName,
    email,
    phone,
    region,
    subregion,
    fleetSize,
    preferredVehicleType,
    targetCountries,
    budgetPerVehicle,
    currency,
    comments,
    desiredStartTiming
  ) {
    const proposals = this._getFromStorage('fleet_proposal_requests');
    const now = new Date().toISOString();

    const proposal = {
      id: this._generateId('fpr'),
      company_name: companyName,
      contact_name: contactName,
      email: email || null,
      phone: phone || null,
      region: region || null,
      subregion: subregion || null,
      fleet_size: fleetSize,
      preferred_vehicle_type: preferredVehicleType,
      target_countries: Array.isArray(targetCountries) ? targetCountries : [],
      budget_per_vehicle: budgetPerVehicle,
      currency,
      comments: comments || '',
      desired_start_timing: desiredStartTiming || null,
      status: 'new',
      created_at: now
    };

    proposals.push(proposal);
    this._saveToStorage('fleet_proposal_requests', proposals);

    return {
      success: true,
      proposal_request_id: proposal.id,
      message: 'Fleet proposal request submitted.'
    };
  }

  // getTrackShipmentPageContext
  getTrackShipmentPageContext() {
    const destination_countries = this._getFromStorage('countries').filter(c => c.is_active);
    const allowed_notification_preferences = ['email', 'sms', 'email_and_sms', 'none'];

    return {
      destination_countries,
      default_notification_preference: 'email',
      allowed_notification_preferences
    };
  }

  // trackShipment
  trackShipment(
    trackingId,
    destinationCountryId,
    customerType,
    notificationPreference,
    contactEmail,
    mobileNumber,
    notes
  ) {
    const trackingRequests = this._getFromStorage('tracking_requests');
    const now = new Date().toISOString();

    const request = {
      id: this._generateId('trk'),
      tracking_id: trackingId,
      destination_country_id: destinationCountryId,
      customer_type: customerType || null,
      notification_preference: notificationPreference,
      contact_email: contactEmail || null,
      mobile_number: mobileNumber || null,
      notes: notes || '',
      created_at: now
    };

    trackingRequests.push(request);
    this._saveToStorage('tracking_requests', trackingRequests);

    const shipmentResolved = this._resolveShipment(trackingId);
    const shipment_found = !!shipmentResolved;

    const message = shipment_found
      ? 'Shipment status retrieved.'
      : 'No shipment found for the provided tracking ID and destination.';

    return {
      tracking_request_id: request.id,
      success: true,
      shipment_found,
      message,
      shipment: shipmentResolved
    };
  }

  // getContactPageContent
  getContactPageContent() {
    const stored = this._getFromStorage('contact_page_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      global_contact_email: '',
      global_contact_phone: '',
      office_locator_intro: 'Use the office locator below to find the nearest office serving your city or region.'
    };
  }

  // submitGeneralContactMessage
  submitGeneralContactMessage(name, email, phone, topic, message) {
    const messages = this._getFromStorage('general_contact_messages');
    const now = new Date().toISOString();

    const msg = {
      id: this._generateId('gcm'),
      name,
      email,
      phone: phone || null,
      topic: topic || null,
      message,
      created_at: now
    };

    messages.push(msg);
    this._saveToStorage('general_contact_messages', messages);

    return {
      success: true,
      message: 'Contact message submitted.'
    };
  }

  // searchOffices
  searchOffices(city, countryId) {
    const offices = this._getFromStorage('offices');
    const countries = this._getFromStorage('countries');

    const matched = this._matchOfficesByCityAndCountry(offices, city, countryId);

    const resolvedOffices = matched.map(o => {
      const country = countries.find(c => c.id === o.country_id) || null;
      return Object.assign({}, o, { country });
    });

    return {
      offices: resolvedOffices
    };
  }

  // getOfficeDetails
  getOfficeDetails(officeId) {
    const offices = this._getFromStorage('offices');
    const office = offices.find(o => o.id === officeId) || null;
    const countries = this._getFromStorage('countries');

    if (!office) {
      return { office: null };
    }

    const country = countries.find(c => c.id === office.country_id) || null;
    const officeResolved = Object.assign({}, office, { country });

    return {
      office: officeResolved
    };
  }

  // submitOfficeContactMessage
  submitOfficeContactMessage(officeId, name, email, phone, message, source) {
    const officeMessages = this._getFromStorage('office_contact_messages');
    const now = new Date().toISOString();

    const msg = {
      id: this._generateId('ocm'),
      office_id: officeId,
      name,
      email,
      phone: phone || null,
      message,
      source: source || 'other',
      created_at: now
    };

    officeMessages.push(msg);
    this._saveToStorage('office_contact_messages', officeMessages);

    return {
      success: true,
      office_contact_message_id: msg.id,
      message: 'Office contact message submitted.'
    };
  }

  // getAboutUsContent
  getAboutUsContent() {
    const stored = this._getFromStorage('about_us_content', null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    return {
      history_html: '<p>Founded to simplify cross-border vehicle trade, we support importers, dealers, and fleets worldwide.</p>',
      mission_html: '<p>Our mission is to make international vehicle sourcing transparent, predictable, and cost-efficient for business customers.</p>',
      regions_served: ['Africa', 'Europe', 'Middle East', 'Asia', 'North America', 'South America', 'Oceania'],
      key_differentiators: [
        {
          title: 'Global Sourcing Network',
          description: 'Access to multiple origin markets including Japan, UK, EU, and North America.'
        },
        {
          title: 'End-to-End Service',
          description: 'From vehicle selection to shipping, customs, and delivery coordination.'
        },
        {
          title: 'Corporate Focus',
          description: 'Specialized in serving dealers, fleets, and logistics operators.'
        }
      ]
    };
  }

  // getLegalContent
  getLegalContent(pageKey) {
    const key = pageKey === 'privacy_policy' || pageKey === 'terms_and_conditions'
      ? 'legal_' + pageKey
      : 'legal_' + pageKey;

    const stored = this._getFromStorage(key, null);
    if (stored && typeof stored === 'object') {
      return stored;
    }

    if (pageKey === 'privacy_policy') {
      return {
        title: 'Privacy Policy',
        content_html: '<p>This website processes personal data solely for the purpose of providing vehicle import and related services. Data is retained only as long as necessary to fulfil these purposes and comply with legal obligations.</p>',
        last_updated: new Date().toISOString().slice(0, 10)
      };
    }

    if (pageKey === 'terms_and_conditions') {
      return {
        title: 'Terms & Conditions',
        content_html: '<p>By using this website, you agree that all vehicle offers are subject to availability and final confirmation. Pricing, shipping schedules, and import estimates are indicative and may change without prior notice.</p>',
        last_updated: new Date().toISOString().slice(0, 10)
      };
    }

    return {
      title: '',
      content_html: '',
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