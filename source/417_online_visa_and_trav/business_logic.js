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

  // -------------------- Storage helpers --------------------

  _initStorage() {
    const arrayKeys = [
      'countries',
      'airports',
      'visa_packages',
      'visa_package_addons',
      'visa_applications',
      'visa_applicants',
      'visa_tracking_alert_settings',
      'insurance_plans',
      'insurance_plan_addons',
      'insurance_selections',
      'airport_transfer_options',
      'transfer_bookings',
      'tour_packages',
      'tour_package_selections',
      'consultation_slots',
      'consultation_bookings',
      'carts',
      'cart_items',
      'orders',
      'order_items'
    ];

    arrayKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, '[]');
      }
    });

    if (!localStorage.getItem('idCounter')) {
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

  // -------------------- Generic helpers --------------------

  _nowIso() {
    return new Date().toISOString();
  }

  _parseDateYmd(dateStr) {
    // dateStr: 'YYYY-MM-DD'
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00Z');
  }

  _parseDateMdY(dateStr) {
    // dateStr: 'MM/DD/YYYY'
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;
    const [mm, dd, yyyy] = parts;
    return new Date(yyyy + '-' + mm.padStart(2, '0') + '-' + dd.padStart(2, '0') + 'T00:00:00Z');
  }

  _formatDateYmd(date) {
    if (!date) return '';
    const d = new Date(date);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  }

  _daysDiffInclusive(startDateStr, endDateStr) {
    const start = this._parseDateYmd(startDateStr);
    const end = this._parseDateYmd(endDateStr);
    if (!start || !end) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.round((end - start) / msPerDay);
    return diff + 1; // inclusive of both start and end
  }

  _titleCaseFromCode(code) {
    if (!code) return '';
    return code
      .split('_')
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(' ');
  }

  _findCountryById(countries, id) {
    return countries.find((c) => c.id === id) || null;
  }

  _clone(obj) {
    return obj ? JSON.parse(JSON.stringify(obj)) : obj;
  }

  // Resolve foreign keys on a generic object (only for *Id fields we know relationships for).
  _resolveForeignKeysOnEntity(entity) {
    if (!entity || typeof entity !== 'object') return entity;
    const resolved = this._clone(entity);

    const countries = this._getFromStorage('countries');
    const airports = this._getFromStorage('airports');
    const visaPackages = this._getFromStorage('visa_packages');
    const insurancePlans = this._getFromStorage('insurance_plans');
    const airportTransferOptions = this._getFromStorage('airport_transfer_options');
    const tourPackages = this._getFromStorage('tour_packages');
    const consultationSlots = this._getFromStorage('consultation_slots');

    Object.keys(resolved).forEach((key) => {
      if (!key.endsWith('_id') && !key.endsWith('Id')) return;

      const base = key.endsWith('_id') ? key.slice(0, -3) : key.slice(0, -2);
      const value = resolved[key];

      if (!value) return;

      // Map known FKs
      if (
        key === 'country_id' ||
        key === 'destination_country_id' ||
        key === 'origin_country_id' ||
        key === 'citizenship_country_id' ||
        key === 'nationality_country_id'
      ) {
        resolved[base] = countries.find((c) => c.id === value) || null;
      } else if (key === 'pickup_airport_id') {
        resolved[base] = airports.find((a) => a.id === value) || null;
      } else if (key === 'visa_package_id') {
        resolved[base] = visaPackages.find((p) => p.id === value) || null;
      } else if (key === 'insurance_plan_id') {
        resolved[base] = insurancePlans.find((p) => p.id === value) || null;
      } else if (key === 'transfer_option_id') {
        resolved[base] = airportTransferOptions.find((o) => o.id === value) || null;
      } else if (key === 'tour_package_id') {
        resolved[base] = tourPackages.find((t) => t.id === value) || null;
      } else if (key === 'consultation_slot_id') {
        resolved[base] = consultationSlots.find((s) => s.id === value) || null;
      }
    });

    return resolved;
  }

  // -------------------- Cart & Order helpers --------------------

  _getOrCreateCart() {
    const now = this._nowIso();
    let carts = this._getFromStorage('carts');

    // Single active cart model
    let activeCart = carts.find((c) => c.status === 'active');
    if (!activeCart) {
      activeCart = {
        id: this._generateId('cart'),
        status: 'active',
        currency: 'USD',
        created_at: now,
        updated_at: now
      };
      carts.push(activeCart);
      this._saveToStorage('carts', carts);
    }

    localStorage.setItem('activeCartId', activeCart.id);
    return activeCart;
  }

  _getActiveOrderForCart(cart) {
    const now = this._nowIso();
    let orders = this._getFromStorage('orders');

    let order = orders.find(
      (o) => o.cart_id === cart.id && (o.status === 'draft' || o.status === 'pending_payment')
    );

    if (!order) {
      order = {
        id: this._generateId('order'),
        cart_id: cart.id,
        status: 'draft',
        total_amount: 0,
        currency: cart.currency || 'USD',
        payer_full_name: null,
        payer_email: null,
        payer_phone: null,
        billing_address: null,
        created_at: now,
        termsAccepted: false
      };
      orders.push(order);
      this._saveToStorage('orders', orders);
    }

    localStorage.setItem('activeOrderId', order.id);
    return order;
  }

  _syncOrderItemsFromCart(cart, order, cartItems) {
    let orderItems = this._getFromStorage('order_items');
    // Remove existing items for this order
    orderItems = orderItems.filter((oi) => oi.order_id !== order.id);

    const now = this._nowIso();
    const newItems = cartItems
      .filter((ci) => ci.cart_id === cart.id)
      .map((ci) => ({
        id: this._generateId('orderitem'),
        order_id: order.id,
        item_type: ci.item_type,
        item_reference_id: ci.item_reference_id,
        quantity: ci.quantity,
        unit_price: ci.unit_price,
        total_price: ci.total_price,
        created_at: now
      }));

    orderItems.push(...newItems);
    this._saveToStorage('order_items', orderItems);

    const itemsSubtotal = newItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
    order.total_amount = itemsSubtotal;

    let orders = this._getFromStorage('orders');
    const idx = orders.findIndex((o) => o.id === order.id);
    if (idx !== -1) {
      orders[idx] = order;
      this._saveToStorage('orders', orders);
    }

    return { itemsSubtotal };
  }

  // -------------------- Price helpers --------------------

  _calculateVisaPackagePriceWithOptions(visaPackage, selectedAddonIds, processingTypeOverride, returnDeliveryMethod, numberOfTravelers) {
    if (!visaPackage) return 0;
    const addons = this._getFromStorage('visa_package_addons');
    const selectedIds = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];
    const applicableAddons = addons.filter(
      (a) => a.visa_package_id === visaPackage.id && selectedIds.includes(a.id)
    );

    const perTravelerBase = visaPackage.total_service_fee || 0;
    const perTravelerAddons = applicableAddons.reduce((sum, a) => sum + (a.price || 0), 0);

    // For simplicity, no extra fee for processingTypeOverride or returnDeliveryMethod.
    const travelers = Number(numberOfTravelers) > 0 ? Number(numberOfTravelers) : 1;
    return (perTravelerBase + perTravelerAddons) * travelers;
  }

  _calculateInsuranceSelectionPrice(plan, tripStartDate, tripEndDate, numberOfTravelers, selectedAddonIds) {
    if (!plan) return 0;
    const days = this._daysDiffInclusive(tripStartDate, tripEndDate);
    const travelers = Number(numberOfTravelers) > 0 ? Number(numberOfTravelers) : 1;

    const base = (plan.base_price_per_day_per_traveler || 0) * days * travelers;

    const addons = this._getFromStorage('insurance_plan_addons');
    const selectedIds = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];
    const applicableAddons = addons.filter(
      (a) => a.insurance_plan_id === plan.id && selectedIds.includes(a.id)
    );

    const addonsTotal = applicableAddons.reduce(
      (sum, a) => sum + (a.price_per_trip_per_traveler || 0) * travelers,
      0
    );
    return base + addonsTotal;
  }

  _calculateTransferBookingPrice(transferOption, pickupDate, pickupTime, numberOfPassengers) {
    if (!transferOption) return { basePrice: 0, surcharges: 0, totalPrice: 0 };
    const basePrice = transferOption.base_price || 0;
    const surcharges = 0; // simplified, no surcharges logic
    const totalPrice = basePrice + surcharges;
    return { basePrice, surcharges, totalPrice };
  }

  _calculateTourPackageSelectionPrice(tourPackage, numberOfTravelers) {
    if (!tourPackage) return 0;
    const travelers = Number(numberOfTravelers) > 0 ? Number(numberOfTravelers) : 1;
    return (tourPackage.price_per_person || 0) * travelers;
  }

  // -------------------- Visa & Homepage Interfaces --------------------

  getHomepageContent() {
    const countries = this._getFromStorage('countries');
    const visaPackages = this._getFromStorage('visa_packages').filter((p) => p.is_active);
    const tourPackages = this._getFromStorage('tour_packages').filter((p) => p.is_active);

    // featuredVisaDestinations from active visa packages
    const destMap = {};
    visaPackages.forEach((p) => {
      const cid = p.destination_country_id;
      if (!cid || destMap[cid]) return;
      const country = this._findCountryById(countries, cid);
      if (!country) return;
      destMap[cid] = {
        countryId: country.id,
        countryName: country.name,
        isoCode: country.iso_code,
        region: country.region,
        isSchengenMember: !!country.is_schengen_member,
        highlightText:
          p.short_description ||
          'Visa services available for ' + (country.display_name || country.name)
      };
    });
    const featuredVisaDestinations = Object.values(destMap).slice(0, 10);

    // featuredServices derived from existing data types
    const featuredServices = [];
    if (visaPackages.length > 0) {
      featuredServices.push({
        code: 'visa_services',
        label: 'Visa Services',
        description: 'Online visa processing and document support.'
      });
    }
    const insurancePlans = this._getFromStorage('insurance_plans').filter((p) => p.is_active);
    if (insurancePlans.length > 0) {
      featuredServices.push({
        code: 'travel_insurance',
        label: 'Travel Insurance',
        description: 'Medical and trip protection for your travels.'
      });
    }
    const airportOptions = this._getFromStorage('airport_transfer_options').filter(
      (o) => o.is_active
    );
    if (airportOptions.length > 0) {
      featuredServices.push({
        code: 'airport_transfers',
        label: 'Airport Transfers',
        description: 'Pre-booked private transfers from airport to city.'
      });
    }
    if (tourPackages.length > 0) {
      featuredServices.push({
        code: 'tours_packages',
        label: 'Tours & Packages',
        description: 'Curated multi-day holiday packages.'
      });
    }

    // quickVisaShortcuts from first few visa packages
    const quickVisaShortcuts = visaPackages.slice(0, 5).map((p) => {
      const fromCountry = this._findCountryById(countries, p.from_country_id) || {};
      const destCountry = this._findCountryById(countries, p.destination_country_id) || {};
      return {
        label:
          (fromCountry.name || 'From') +
          ' to ' +
          (destCountry.name || 'Destination') +
          ' - ' +
          this._titleCaseFromCode(p.purpose),
        fromCountryName: fromCountry.name || null,
        destinationCountryName: destCountry.name || null,
        purpose: p.purpose,
        presetFilters: {
          processingType: p.processing_type,
          maxPrice: p.total_service_fee || 0
        }
      };
    });

    // featuredTourPackages - return active ones
    const featuredTourPackages = tourPackages.map((tp) => this._resolveForeignKeysOnEntity(tp));

    const activePromotions = [];

    return {
      featuredVisaDestinations,
      featuredServices,
      quickVisaShortcuts,
      featuredTourPackages,
      activePromotions
    };
  }

  getVisaSearchFormData() {
    const countries = this._getFromStorage('countries');
    const visaPackages = this._getFromStorage('visa_packages').filter((p) => p.is_active);

    const fromCountries = countries;
    const destinationCountries = countries;

    const purposes = [
      'tourism',
      'business',
      'study',
      'transit',
      'work',
      'medical',
      'other'
    ].map((code) => ({ code, label: this._titleCaseFromCode(code) }));

    const processingTypes = ['standard', 'expedited', 'super_expedited'].map((code) => ({
      code,
      label: this._titleCaseFromCode(code)
    }));

    let minPrice = 0;
    let maxPrice = 0;
    let currency = 'USD';
    if (visaPackages.length > 0) {
      minPrice = visaPackages.reduce(
        (min, p) => (p.total_service_fee < min ? p.total_service_fee : min),
        visaPackages[0].total_service_fee || 0
      );
      maxPrice = visaPackages.reduce(
        (max, p) => (p.total_service_fee > max ? p.total_service_fee : max),
        0
      );
      currency = visaPackages[0].currency || 'USD';
    }

    const uniqueProcessingTimes = Array.from(
      new Set(visaPackages.map((p) => p.processing_time_business_days))
    ).sort((a, b) => a - b);

    const processingTimeOptions = uniqueProcessingTimes.map((d) => ({
      businessDays: d,
      label: 'Up to ' + d + ' business days'
    }));

    return {
      fromCountries,
      destinationCountries,
      purposes,
      processingTypes,
      priceRangeDefaults: {
        min: minPrice,
        max: maxPrice,
        currency
      },
      processingTimeOptions
    };
  }

  searchVisaPackages(
    fromCountryId,
    destinationCountryId,
    citizenshipCountryId,
    purpose,
    travelDate,
    priceMin,
    priceMax,
    processingTimeBusinessDaysMax,
    processingType,
    isStandardOnly,
    sortBy
  ) {
    const countries = this._getFromStorage('countries');
    const visaPackages = this._getFromStorage('visa_packages').filter((p) => p.is_active);

    let results = visaPackages.filter((p) => p.destination_country_id === destinationCountryId);

    if (fromCountryId) {
      results = results.filter((p) => p.from_country_id === fromCountryId);
    }

    if (citizenshipCountryId) {
      results = results.filter((p) => {
        if (!Array.isArray(p.allowed_citizenship_country_ids) || p.allowed_citizenship_country_ids.length === 0) {
          return true;
        }
        return p.allowed_citizenship_country_ids.includes(citizenshipCountryId);
      });
    }

    if (purpose) {
      results = results.filter((p) => p.purpose === purpose);
    }

    if (typeof priceMin === 'number') {
      results = results.filter((p) => (p.total_service_fee || 0) >= priceMin);
    }

    if (typeof priceMax === 'number') {
      results = results.filter((p) => (p.total_service_fee || 0) <= priceMax);
    }

    if (typeof processingTimeBusinessDaysMax === 'number') {
      results = results.filter(
        (p) => (p.processing_time_business_days || 0) <= processingTimeBusinessDaysMax
      );
    }

    if (processingType) {
      results = results.filter((p) => p.processing_type === processingType);
    }

    if (isStandardOnly) {
      results = results.filter((p) => p.is_standard === true || p.processing_type === 'standard');
    }

    if (sortBy === 'price_asc') {
      results.sort((a, b) => (a.total_service_fee || 0) - (b.total_service_fee || 0));
    } else if (sortBy === 'price_desc') {
      results.sort((a, b) => (b.total_service_fee || 0) - (a.total_service_fee || 0));
    } else if (sortBy === 'processing_time_asc') {
      results.sort(
        (a, b) => (a.processing_time_business_days || 0) - (b.processing_time_business_days || 0)
      );
    } else if (sortBy === 'processing_time_desc') {
      results.sort(
        (a, b) => (b.processing_time_business_days || 0) - (a.processing_time_business_days || 0)
      );
    }

    const mapped = results.map((p) => {
      const destCountry = this._findCountryById(countries, p.destination_country_id) || {};
      const fromCountry = this._findCountryById(countries, p.from_country_id) || {};
      return {
        visaPackageId: p.id,
        name: p.name,
        destinationCountryName: destCountry.name || null,
        fromCountryName: fromCountry.name || null,
        purpose: p.purpose,
        processingType: p.processing_type,
        processingTimeBusinessDays: p.processing_time_business_days,
        totalServiceFee: p.total_service_fee,
        currency: p.currency,
        isStandard: p.is_standard,
        expressReturnAvailable: p.express_return_available,
        shortDescription: p.short_description || null,
        visaPackage: this._resolveForeignKeysOnEntity(p)
      };
    });

    return mapped;
  }

  getVisaDestinationCountries(searchQuery) {
    const countries = this._getFromStorage('countries');
    const visaPackages = this._getFromStorage('visa_packages').filter((p) => p.is_active);
    const counts = {};

    visaPackages.forEach((p) => {
      const cid = p.destination_country_id;
      if (!cid) return;
      counts[cid] = (counts[cid] || 0) + 1;
    });

    let items = Object.keys(counts).map((cid) => {
      const country = this._findCountryById(countries, cid);
      if (!country) return null;
      return {
        countryId: country.id,
        countryName: country.name,
        isoCode: country.iso_code,
        region: country.region,
        isSchengenMember: !!country.is_schengen_member,
        count: counts[cid]
      };
    });

    items = items.filter(Boolean);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((item) => item.countryName.toLowerCase().includes(q));
    }

    // Determine popularity: top 5 by count
    items.sort((a, b) => b.count - a.count);
    items.forEach((item, index) => {
      item.isPopular = index < 5;
      delete item.count;
    });

    return items;
  }

  getVisaCountryDetail(destinationCountryId) {
    const countries = this._getFromStorage('countries');
    const visaPackages = this._getFromStorage('visa_packages').filter((p) => p.is_active);
    const country = this._findCountryById(countries, destinationCountryId);

    const packagesForCountry = visaPackages.filter(
      (p) => p.destination_country_id === destinationCountryId
    );

    const overviewText = country
      ? 'Visa information and services for ' + (country.display_name || country.name) + '.'
      : '';

    const purposeCounts = {};
    packagesForCountry.forEach((p) => {
      purposeCounts[p.purpose] = (purposeCounts[p.purpose] || 0) + 1;
    });
    const popularPurposes = Object.keys(purposeCounts).sort(
      (a, b) => purposeCounts[b] - purposeCounts[a]
    );

    const citizenshipCounts = {};
    packagesForCountry.forEach((p) => {
      if (Array.isArray(p.allowed_citizenship_country_ids)) {
        p.allowed_citizenship_country_ids.forEach((cid) => {
          citizenshipCounts[cid] = (citizenshipCounts[cid] || 0) + 1;
        });
      }
    });

    const defaultCitizenships = Object.keys(citizenshipCounts)
      .map((cid) => this._findCountryById(countries, cid))
      .filter(Boolean)
      .slice(0, 5);

    const summaryMap = {};
    packagesForCountry.forEach((p) => {
      const key = p.purpose + '|' + p.processing_type;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          purpose: p.purpose,
          processingType: p.processing_type,
          minFee: p.total_service_fee,
          maxFee: p.total_service_fee,
          totalDays: p.processing_time_business_days,
          count: 1
        };
      } else {
        const s = summaryMap[key];
        s.minFee = Math.min(s.minFee, p.total_service_fee);
        s.maxFee = Math.max(s.maxFee, p.total_service_fee);
        s.totalDays += p.processing_time_business_days;
        s.count += 1;
      }
    });

    const visaTypesSummary = Object.values(summaryMap).map((s) => ({
      purpose: s.purpose,
      processingType: s.processingType,
      minFee: s.minFee,
      maxFee: s.maxFee,
      typicalProcessingTimeBusinessDays: Math.round(s.totalDays / s.count)
    }));

    const featuredPackages = packagesForCountry.slice(0, 5).map((p) => ({
      visaPackageId: p.id,
      name: p.name,
      purpose: p.purpose,
      processingType: p.processing_type,
      processingTimeBusinessDays: p.processing_time_business_days,
      totalServiceFee: p.total_service_fee,
      currency: p.currency,
      visaPackage: this._resolveForeignKeysOnEntity(p)
    }));

    return {
      country: country || null,
      overviewText,
      popularPurposes,
      defaultCitizenships,
      visaTypesSummary,
      featuredPackages
    };
  }

  getVisaPackageDetail(visaPackageId) {
    const visaPackages = this._getFromStorage('visa_packages');
    const countries = this._getFromStorage('countries');
    const addons = this._getFromStorage('visa_package_addons');

    const pkg = visaPackages.find((p) => p.id === visaPackageId);
    if (!pkg) {
      return {
        package: null,
        destinationCountry: null,
        fromCountry: null,
        addons: [],
        priceBreakdown: null,
        eligibilitySummary: '',
        requiredDocuments: [],
        availableProcessingTypes: [],
        availableReturnDeliveryMethods: []
      };
    }

    const destinationCountry = this._findCountryById(countries, pkg.destination_country_id);
    const fromCountry = this._findCountryById(countries, pkg.from_country_id);

    const packageAddons = addons.filter((a) => a.visa_package_id === pkg.id);

    const priceBreakdown = {
      baseServiceFee: pkg.base_service_fee || 0,
      governmentFee: pkg.government_fee || 0,
      totalServiceFee: pkg.total_service_fee || 0,
      currency: pkg.currency || 'USD'
    };

    const eligibilitySummary = pkg.detailed_description || pkg.short_description || '';

    const requiredDocuments = [];

    const availableProcessingTypes = [
      {
        code: pkg.processing_type,
        label: this._titleCaseFromCode(pkg.processing_type),
        processingTimeBusinessDays: pkg.processing_time_business_days,
        feeDelta: 0
      }
    ];

    const availableReturnDeliveryMethods = [
      {
        code: 'standard_mail',
        label: 'Standard Mail',
        description: 'Standard return delivery.',
        priceDelta: 0
      }
    ];
    if (pkg.express_return_available) {
      availableReturnDeliveryMethods.push({
        code: 'express_courier',
        label: 'Express Courier',
        description: 'Faster courier return (price may vary).',
        priceDelta: 0
      });
    }

    const pkgResolved = this._resolveForeignKeysOnEntity(pkg);

    return {
      package: pkgResolved,
      destinationCountry: destinationCountry || null,
      fromCountry: fromCountry || null,
      addons: packageAddons,
      priceBreakdown,
      eligibilitySummary,
      requiredDocuments,
      availableProcessingTypes,
      availableReturnDeliveryMethods
    };
  }

  startVisaApplicationFromPackage(
    visaPackageId,
    travelStartDate,
    travelEndDate,
    numberOfTravelers,
    selectedAddonIds,
    processingTypeOverride,
    returnDeliveryMethod
  ) {
    const visaPackages = this._getFromStorage('visa_packages');
    const countries = this._getFromStorage('countries');
    const pkg = visaPackages.find((p) => p.id === visaPackageId);
    if (!pkg) {
      return { success: false, application: null, primaryApplicant: null, message: 'Visa package not found.' };
    }

    const travelersCount = Number(numberOfTravelers) > 0 ? Number(numberOfTravelers) : 1;
    const selectedIds = Array.isArray(selectedAddonIds) ? selectedAddonIds : [];

    const totalFee = this._calculateVisaPackagePriceWithOptions(
      pkg,
      selectedIds,
      processingTypeOverride,
      returnDeliveryMethod,
      travelersCount
    );

    const now = this._nowIso();
    const destCountry = countries.find((c) => c.id === pkg.destination_country_id);

    const referenceNumber = 'REF' + this._getNextIdCounter();

    const application = {
      id: this._generateId('visaapp'),
      visa_package_id: pkg.id,
      reference_number: referenceNumber,
      status: 'draft',
      destination_country_id: pkg.destination_country_id,
      origin_country_id: pkg.from_country_id,
      citizenship_country_id: pkg.from_country_id,
      purpose: pkg.purpose,
      travel_start_date: this._parseDateYmd(travelStartDate)?.toISOString() || now,
      travel_end_date: this._parseDateYmd(travelEndDate)?.toISOString() || now,
      number_of_travelers: travelersCount,
      primary_applicant_full_name: null,
      primary_applicant_date_of_birth: null,
      processing_type: processingTypeOverride || pkg.processing_type,
      return_delivery_method: returnDeliveryMethod || 'standard_mail',
      selected_addon_ids: selectedIds,
      total_service_fee: totalFee,
      currency: pkg.currency || 'USD',
      last_status_update_at: now,
      created_at: now,
      last_updated_at: now,
      title:
        (destCountry ? destCountry.name + ' ' : '') +
        this._titleCaseFromCode(pkg.purpose) +
        ' Visa Application',
      is_draft: true
    };

    const visaApplications = this._getFromStorage('visa_applications');
    visaApplications.push(application);
    this._saveToStorage('visa_applications', visaApplications);

    const primaryApplicant = {
      id: this._generateId('applicant'),
      application_id: application.id,
      full_name: '',
      date_of_birth: this._parseDateYmd('1900-01-01')?.toISOString() || now,
      passport_number: null,
      nationality_country_id: application.citizenship_country_id,
      origin_country_id: application.origin_country_id,
      destination_country_id: application.destination_country_id,
      trip_start_date: application.travel_start_date,
      trip_end_date: application.travel_end_date,
      is_primary_applicant: true,
      form_status: 'not_started',
      created_at: now
    };

    const visaApplicants = this._getFromStorage('visa_applicants');
    visaApplicants.push(primaryApplicant);
    this._saveToStorage('visa_applicants', visaApplicants);

    return {
      success: true,
      application: this._resolveForeignKeysOnEntity(application),
      primaryApplicant: this._resolveForeignKeysOnEntity(primaryApplicant),
      message: 'Visa application draft created.'
    };
  }

  addVisaApplicationToCartFromPackage(
    visaPackageId,
    travelStartDate,
    travelEndDate,
    numberOfTravelers,
    selectedAddonIds,
    processingTypeOverride,
    returnDeliveryMethod
  ) {
    const startResult = this.startVisaApplicationFromPackage(
      visaPackageId,
      travelStartDate,
      travelEndDate,
      numberOfTravelers,
      selectedAddonIds,
      processingTypeOverride,
      returnDeliveryMethod
    );

    if (!startResult.success || !startResult.application) {
      return {
        success: false,
        applicationId: null,
        cartId: null,
        cartItemId: null,
        message: startResult.message || 'Unable to create visa application.'
      };
    }

    const application = startResult.application;
    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'visa_application',
      item_reference_id: application.id,
      quantity: 1,
      unit_price: application.total_service_fee || 0,
      total_price: application.total_service_fee || 0,
      created_at: this._nowIso()
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      applicationId: application.id,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Visa application added to cart.'
    };
  }

  getMyApplicationsDashboard() {
    const countries = this._getFromStorage('countries');
    const applications = this._getFromStorage('visa_applications');

    const items = applications.map((app) => {
      const destCountry = this._findCountryById(countries, app.destination_country_id) || {};
      return {
        applicationId: app.id,
        title:
          app.title ||
          ((destCountry.name || 'Visa') + ' ' + this._titleCaseFromCode(app.purpose)),
        destinationCountryName: destCountry.name || null,
        purpose: app.purpose,
        numberOfTravelers: app.number_of_travelers,
        status: app.status,
        isDraft: !!app.is_draft,
        lastUpdatedAt: app.last_updated_at,
        travelStartDate: app.travel_start_date,
        travelEndDate: app.travel_end_date,
        referenceNumber: app.reference_number
      };
    });

    const draftCount = items.filter((a) => a.isDraft).length;
    const inProgressCount = items.filter((a) => a.status === 'in_progress').length;

    return {
      applications: items,
      draftCount,
      inProgressCount
    };
  }

  renameVisaApplication(applicationId, newTitle) {
    let applications = this._getFromStorage('visa_applications');
    const idx = applications.findIndex((a) => a.id === applicationId);
    if (idx === -1) {
      return { success: false, application: null, message: 'Application not found.' };
    }

    applications[idx].title = newTitle;
    applications[idx].last_updated_at = this._nowIso();
    this._saveToStorage('visa_applications', applications);

    return {
      success: true,
      application: this._resolveForeignKeysOnEntity(applications[idx]),
      message: 'Application renamed.'
    };
  }

  deleteVisaApplication(applicationId) {
    let applications = this._getFromStorage('visa_applications');
    const exists = applications.some((a) => a.id === applicationId);

    applications = applications.filter((a) => a.id !== applicationId);
    this._saveToStorage('visa_applications', applications);

    let applicants = this._getFromStorage('visa_applicants');
    applicants = applicants.filter((appl) => appl.application_id !== applicationId);
    this._saveToStorage('visa_applicants', applicants);

    // Remove from cart items if present
    let cartItems = this._getFromStorage('cart_items');
    cartItems = cartItems.filter(
      (ci) => !(ci.item_type === 'visa_application' && ci.item_reference_id === applicationId)
    );
    this._saveToStorage('cart_items', cartItems);

    return {
      success: exists,
      message: exists ? 'Application deleted.' : 'Application not found.'
    };
  }

  getVisaApplicationOverview(applicationId) {
    const applications = this._getFromStorage('visa_applications');
    const visaPackages = this._getFromStorage('visa_packages');
    const countries = this._getFromStorage('countries');
    const applicants = this._getFromStorage('visa_applicants');
    const addons = this._getFromStorage('visa_package_addons');

    const application = applications.find((a) => a.id === applicationId);
    if (!application) {
      return {
        application: null,
        package: null,
        destinationCountry: null,
        originCountry: null,
        citizenshipCountry: null,
        travelers: [],
        priceSummary: null,
        availableReturnDeliveryMethods: []
      };
    }

    const pkg = visaPackages.find((p) => p.id === application.visa_package_id) || null;
    const destinationCountry = this._findCountryById(countries, application.destination_country_id);
    const originCountry = this._findCountryById(countries, application.origin_country_id);
    const citizenshipCountry = this._findCountryById(countries, application.citizenship_country_id);

    const travelers = applicants
      .filter((appl) => appl.application_id === application.id)
      .map((appl) => this._resolveForeignKeysOnEntity(appl));

    const selectedAddonIds = Array.isArray(application.selected_addon_ids)
      ? application.selected_addon_ids
      : [];
    const selectedAddons = addons.filter((a) => selectedAddonIds.includes(a.id));

    const baseServiceFee = (pkg ? pkg.total_service_fee || 0 : 0) * application.number_of_travelers;
    const addonsTotal = selectedAddons.reduce(
      (sum, a) => sum + (a.price || 0) * application.number_of_travelers,
      0
    );
    const deliveryFee = 0;

    const priceSummary = {
      baseServiceFee,
      addonsTotal,
      deliveryFee,
      totalServiceFee: application.total_service_fee || baseServiceFee + addonsTotal + deliveryFee,
      currency: application.currency || (pkg ? pkg.currency : 'USD')
    };

    const availableReturnDeliveryMethods = [
      { code: 'standard_mail', label: 'Standard Mail' }
    ];
    if (pkg && pkg.express_return_available) {
      availableReturnDeliveryMethods.push({ code: 'express_courier', label: 'Express Courier' });
    }

    return {
      application: this._resolveForeignKeysOnEntity(application),
      package: pkg ? this._resolveForeignKeysOnEntity(pkg) : null,
      destinationCountry: destinationCountry || null,
      originCountry: originCountry || null,
      citizenshipCountry: citizenshipCountry || null,
      travelers,
      priceSummary,
      availableReturnDeliveryMethods
    };
  }

  addVisaApplicant(
    applicationId,
    fullName,
    dateOfBirth,
    passportNumber,
    nationalityCountryId,
    copyTripDetailsFromPrimary
  ) {
    let applications = this._getFromStorage('visa_applications');
    const applicants = this._getFromStorage('visa_applicants');
    const visaPackages = this._getFromStorage('visa_packages');

    const appIdx = applications.findIndex((a) => a.id === applicationId);
    if (appIdx === -1) {
      return {
        success: false,
        applicant: null,
        application: null,
        message: 'Application not found.'
      };
    }

    const application = applications[appIdx];
    const primaryApplicant = applicants.find(
      (appl) => appl.application_id === application.id && appl.is_primary_applicant
    );

    const dobDate = this._parseDateYmd(dateOfBirth);
    const now = this._nowIso();

    const applicant = {
      id: this._generateId('applicant'),
      application_id: application.id,
      full_name: fullName,
      date_of_birth: dobDate ? dobDate.toISOString() : now,
      passport_number: passportNumber || null,
      nationality_country_id: nationalityCountryId || application.citizenship_country_id,
      origin_country_id:
        copyTripDetailsFromPrimary !== false
          ? application.origin_country_id
          : primaryApplicant
          ? primaryApplicant.origin_country_id
          : null,
      destination_country_id:
        copyTripDetailsFromPrimary !== false
          ? application.destination_country_id
          : primaryApplicant
          ? primaryApplicant.destination_country_id
          : null,
      trip_start_date:
        copyTripDetailsFromPrimary !== false
          ? application.travel_start_date
          : primaryApplicant
          ? primaryApplicant.trip_start_date
          : null,
      trip_end_date:
        copyTripDetailsFromPrimary !== false
          ? application.travel_end_date
          : primaryApplicant
          ? primaryApplicant.trip_end_date
          : null,
      is_primary_applicant: false,
      form_status: 'not_started',
      created_at: now
    };

    const allApplicants = this._getFromStorage('visa_applicants');
    allApplicants.push(applicant);
    this._saveToStorage('visa_applicants', allApplicants);

    application.number_of_travelers = (application.number_of_travelers || 1) + 1;

    // Recalculate total_service_fee
    const pkg = visaPackages.find((p) => p.id === application.visa_package_id);
    const selectedIds = Array.isArray(application.selected_addon_ids)
      ? application.selected_addon_ids
      : [];
    if (pkg) {
      application.total_service_fee = this._calculateVisaPackagePriceWithOptions(
        pkg,
        selectedIds,
        application.processing_type,
        application.return_delivery_method,
        application.number_of_travelers
      );
    }
    application.last_updated_at = now;

    applications[appIdx] = application;
    this._saveToStorage('visa_applications', applications);

    return {
      success: true,
      applicant: this._resolveForeignKeysOnEntity(applicant),
      application: this._resolveForeignKeysOnEntity(application),
      message: 'Traveler added to application.'
    };
  }

  proceedVisaApplicationToPaymentOptions(applicationId) {
    const applications = this._getFromStorage('visa_applications');
    const application = applications.find((a) => a.id === applicationId);
    if (!application) {
      return {
        success: false,
        cartId: null,
        cartItemId: null,
        orderId: null,
        checkoutSummary: null,
        message: 'Application not found.'
      };
    }

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    // Check if item already exists for this application
    let cartItem = cartItems.find(
      (ci) => ci.cart_id === cart.id && ci.item_type === 'visa_application' && ci.item_reference_id === application.id
    );

    if (!cartItem) {
      cartItem = {
        id: this._generateId('cartitem'),
        cart_id: cart.id,
        item_type: 'visa_application',
        item_reference_id: application.id,
        quantity: 1,
        unit_price: application.total_service_fee || 0,
        total_price: application.total_service_fee || 0,
        created_at: this._nowIso()
      };
      cartItems.push(cartItem);
      this._saveToStorage('cart_items', cartItems);
    }

    const order = this._getActiveOrderForCart(cart);
    cartItems = this._getFromStorage('cart_items');
    this._syncOrderItemsFromCart(cart, order, cartItems);

    const checkoutSummary = this.getCheckoutSummary();

    return {
      success: true,
      cartId: cart.id,
      cartItemId: cartItem.id,
      orderId: checkoutSummary.orderId,
      checkoutSummary,
      message: 'Proceeding to payment options.'
    };
  }

  trackVisaApplicationStatus(referenceNumber, dateOfBirth) {
    const applications = this._getFromStorage('visa_applications');
    const applicants = this._getFromStorage('visa_applicants');
    const countries = this._getFromStorage('countries');

    const application = applications.find((a) => a.reference_number === referenceNumber);
    if (!application) {
      return {
        found: false,
        applicationStatus: null,
        statusLabel: null,
        lastUpdatedAt: null,
        destinationCountryName: null,
        purpose: null,
        travelStartDate: null,
        travelEndDate: null,
        timeline: []
      };
    }

    const primaryApplicant = applicants.find(
      (appl) => appl.application_id === application.id && appl.is_primary_applicant
    );

    if (!primaryApplicant) {
      return {
        found: false,
        applicationStatus: null,
        statusLabel: null,
        lastUpdatedAt: null,
        destinationCountryName: null,
        purpose: null,
        travelStartDate: null,
        travelEndDate: null,
        timeline: []
      };
    }

    const dobProvided = this._parseDateMdY(dateOfBirth);
    const dobStored = new Date(primaryApplicant.date_of_birth);
    const providedYmd = this._formatDateYmd(dobProvided);
    const storedYmd = this._formatDateYmd(dobStored);

    if (!dobProvided || providedYmd !== storedYmd) {
      return {
        found: false,
        applicationStatus: null,
        statusLabel: null,
        lastUpdatedAt: null,
        destinationCountryName: null,
        purpose: null,
        travelStartDate: null,
        travelEndDate: null,
        timeline: []
      };
    }

    const destCountry = this._findCountryById(countries, application.destination_country_id);

    const statusLabel = this._titleCaseFromCode(application.status);

    const timeline = [
      {
        status: application.status,
        label: statusLabel,
        timestamp: application.last_status_update_at || application.created_at
      }
    ];

    // Instrumentation for task completion tracking
    try {
      localStorage.setItem(
        'task7_statusCheck',
        JSON.stringify({
          "referenceNumber": referenceNumber,
          "dateOfBirthInput": dateOfBirth,
          "applicationId": application.id,
          "checkedAt": this._nowIso()
        })
      );
    } catch (e) {
      console.error('Instrumentation error:', e);
    }

    return {
      found: true,
      applicationStatus: application.status,
      statusLabel,
      lastUpdatedAt: application.last_updated_at,
      destinationCountryName: destCountry ? destCountry.name : null,
      purpose: application.purpose,
      travelStartDate: application.travel_start_date,
      travelEndDate: application.travel_end_date,
      timeline
    };
  }

  setVisaTrackingAlerts(applicationReferenceNumber, alertFrequency, notificationChannel, targetAddress) {
    let settings = this._getFromStorage('visa_tracking_alert_settings');
    const now = this._nowIso();

    let setting = settings.find(
      (s) => s.application_reference_number === applicationReferenceNumber
    );

    const isActive = alertFrequency !== 'none' && notificationChannel !== 'none';

    if (!setting) {
      setting = {
        id: this._generateId('alert'),
        application_reference_number: applicationReferenceNumber,
        alert_frequency: alertFrequency,
        notification_channel: notificationChannel,
        target_address: targetAddress || null,
        is_active: isActive,
        created_at: now,
        updated_at: now
      };
      settings.push(setting);
    } else {
      setting.alert_frequency = alertFrequency;
      setting.notification_channel = notificationChannel;
      setting.target_address = targetAddress || null;
      setting.is_active = isActive;
      setting.updated_at = now;
    }

    this._saveToStorage('visa_tracking_alert_settings', settings);

    return {
      success: true,
      setting,
      message: 'Visa tracking alerts updated.'
    };
  }

  // -------------------- Checkout & Cart Interfaces --------------------

  getCheckoutSummary() {
    const cartId = localStorage.getItem('activeCartId');
    const orderId = localStorage.getItem('activeOrderId');

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartId) || null;
    const cartItems = this._getFromStorage('cart_items');

    const orders = this._getFromStorage('orders');
    let order = orders.find((o) => o.id === orderId) || null;

    // If there is no active cart, return an empty summary.
    if (!cart) {
      return {
        orderId: order ? order.id : null,
        cartId: null,
        status: order ? order.status : 'draft',
        items: [],
        totals: {
          itemsSubtotal: 0,
          taxes: 0,
          fees: 0,
          grandTotal: 0,
          currency: 'USD'
        },
        payerDetails: {
          fullName: '',
          email: '',
          phone: '',
          billingAddress: ''
        },
        termsAccepted: false
      };
    }

    // If a cart exists but no order yet, create a draft order for this cart.
    if (!order) {
      order = this._getActiveOrderForCart(cart);
    }

    // Sync order items from cart
    this._syncOrderItemsFromCart(cart, order, cartItems);

    const countries = this._getFromStorage('countries');
    const visaApplications = this._getFromStorage('visa_applications');
    const insuranceSelections = this._getFromStorage('insurance_selections');
    const insurancePlans = this._getFromStorage('insurance_plans');
    const transferBookings = this._getFromStorage('transfer_bookings');
    const airportTransferOptions = this._getFromStorage('airport_transfer_options');
    const airports = this._getFromStorage('airports');
    const tourPackageSelections = this._getFromStorage('tour_package_selections');
    const tourPackages = this._getFromStorage('tour_packages');
    const consultationBookings = this._getFromStorage('consultation_bookings');
    const consultationSlots = this._getFromStorage('consultation_slots');

    const itemsForCart = cartItems.filter((ci) => ci.cart_id === cart.id);

    const items = itemsForCart.map((ci) => {
      let description = '';
      let detailsTitle = '';
      let travelersCount = null;
      let additionalDetails = {};
      let itemReference = null;

      if (ci.item_type === 'visa_application') {
        const app = visaApplications.find((a) => a.id === ci.item_reference_id);
        if (app) {
          const destCountry = this._findCountryById(countries, app.destination_country_id);
          description = 'Visa Application - ' + (destCountry ? destCountry.name : '');
          detailsTitle = description;
          travelersCount = app.number_of_travelers || 1;
          additionalDetails = {
            purpose: app.purpose,
            travelStartDate: app.travel_start_date,
            travelEndDate: app.travel_end_date
          };
          itemReference = this._resolveForeignKeysOnEntity(app);
        }
      } else if (ci.item_type === 'insurance_selection') {
        const sel = insuranceSelections.find((s) => s.id === ci.item_reference_id);
        if (sel) {
          const plan = insurancePlans.find((p) => p.id === sel.insurance_plan_id);
          const destCountry = this._findCountryById(countries, sel.destination_country_id);
          description = 'Travel Insurance - ' + (destCountry ? destCountry.name : '');
          detailsTitle = plan ? plan.name : description;
          travelersCount = sel.number_of_travelers || 1;
          additionalDetails = {
            tripStartDate: sel.trip_start_date,
            tripEndDate: sel.trip_end_date,
            providerName: plan ? plan.provider_name : null
          };
          itemReference = this._resolveForeignKeysOnEntity(sel);
        }
      } else if (ci.item_type === 'airport_transfer_booking') {
        const booking = transferBookings.find((b) => b.id === ci.item_reference_id);
        if (booking) {
          const option = airportTransferOptions.find((o) => o.id === booking.transfer_option_id);
          const airport = airports.find((a) => a.id === booking.pickup_airport_id);
          description = 'Airport Transfer - ' + (airport ? airport.name : '');
          detailsTitle = option ? option.name : description;
          travelersCount = booking.number_of_passengers || 1;
          additionalDetails = {
            pickupDatetime: booking.pickup_datetime,
            dropoffLocation: booking.dropoff_location_label
          };
          itemReference = this._resolveForeignKeysOnEntity(booking);
        }
      } else if (ci.item_type === 'tour_package_selection') {
        const sel = tourPackageSelections.find((s) => s.id === ci.item_reference_id);
        if (sel) {
          const pkg = tourPackages.find((p) => p.id === sel.tour_package_id);
          description = 'Tour Package - ' + (pkg ? pkg.name : '');
          detailsTitle = description;
          travelersCount = sel.number_of_travelers || 1;
          additionalDetails = {
            selectedDepartureDate: sel.selected_departure_date,
            durationDays: pkg ? pkg.duration_days : null
          };
          itemReference = this._resolveForeignKeysOnEntity(sel);
        }
      } else if (ci.item_type === 'consultation_booking') {
        const booking = consultationBookings.find((b) => b.id === ci.item_reference_id);
        if (booking) {
          const slot = consultationSlots.find((s) => s.id === booking.consultation_slot_id);
          description = 'Consultation - ' + this._titleCaseFromCode(booking.consultation_type);
          detailsTitle = description;
          travelersCount = 1;
          additionalDetails = {
            fullName: booking.full_name,
            phoneNumber: booking.phone_number,
            slotStart: slot ? slot.start_datetime : null
          };
          itemReference = this._resolveForeignKeysOnEntity(booking);
        }
      }

      return {
        cartItemId: ci.id,
        itemType: ci.item_type,
        itemReferenceId: ci.item_reference_id,
        description,
        travelersCount,
        quantity: ci.quantity,
        unitPrice: ci.unit_price,
        totalPrice: ci.total_price,
        detailsTitle,
        additionalDetails,
        // Foreign key resolution for itemReferenceId
        itemReference
      };
    });

    const itemsSubtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const taxes = 0;
    const fees = 0;
    const grandTotal = itemsSubtotal + taxes + fees;

    const payerDetails = {
      fullName: order.payer_full_name || '',
      email: order.payer_email || '',
      phone: order.payer_phone || '',
      billingAddress: order.billing_address || ''
    };

    return {
      orderId: order.id,
      cartId: cart.id,
      status: order.status,
      items,
      totals: {
        itemsSubtotal,
        taxes,
        fees,
        grandTotal,
        currency: order.currency || cart.currency || 'USD'
      },
      payerDetails,
      termsAccepted: !!order.termsAccepted
    };
  }

  updateCartItemQuantity(cartItemId, quantity) {
    const qty = Number(quantity);
    if (!cartItemId || !qty || qty < 1) {
      return {
        success: false,
        cartId: null,
        cartItemId,
        updatedItem: null,
        totals: null
      };
    }

    let cartItems = this._getFromStorage('cart_items');
    const idx = cartItems.findIndex((ci) => ci.id === cartItemId);
    if (idx === -1) {
      return {
        success: false,
        cartId: null,
        cartItemId,
        updatedItem: null,
        totals: null
      };
    }

    const cartItem = cartItems[idx];
    cartItem.quantity = qty;
    cartItem.total_price = (cartItem.unit_price || 0) * qty;
    cartItems[idx] = cartItem;
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === cartItem.cart_id);
    if (!cart) {
      return {
        success: true,
        cartId: null,
        cartItemId,
        updatedItem: {
          quantity: cartItem.quantity,
          unitPrice: cartItem.unit_price,
          totalPrice: cartItem.total_price
        },
        totals: null
      };
    }

    const order = this._getActiveOrderForCart(cart);
    cartItems = this._getFromStorage('cart_items');
    const { itemsSubtotal } = this._syncOrderItemsFromCart(cart, order, cartItems);
    const taxes = 0;
    const fees = 0;
    const grandTotal = itemsSubtotal + taxes + fees;

    return {
      success: true,
      cartId: cart.id,
      cartItemId,
      updatedItem: {
        quantity: cartItem.quantity,
        unitPrice: cartItem.unit_price,
        totalPrice: cartItem.total_price
      },
      totals: {
        itemsSubtotal,
        taxes,
        fees,
        grandTotal,
        currency: order.currency || cart.currency || 'USD'
      }
    };
  }

  removeCartItem(cartItemId) {
    let cartItems = this._getFromStorage('cart_items');
    const item = cartItems.find((ci) => ci.id === cartItemId);
    if (!item) {
      return {
        success: false,
        cartId: null,
        remainingItemsCount: 0,
        totals: null
      };
    }

    cartItems = cartItems.filter((ci) => ci.id !== cartItemId);
    this._saveToStorage('cart_items', cartItems);

    const carts = this._getFromStorage('carts');
    const cart = carts.find((c) => c.id === item.cart_id);

    if (!cart) {
      return {
        success: true,
        cartId: null,
        remainingItemsCount: 0,
        totals: null
      };
    }

    const remainingItems = cartItems.filter((ci) => ci.cart_id === cart.id);

    const order = this._getActiveOrderForCart(cart);
    const { itemsSubtotal } = this._syncOrderItemsFromCart(cart, order, cartItems);
    const taxes = 0;
    const fees = 0;
    const grandTotal = itemsSubtotal + taxes + fees;

    return {
      success: true,
      cartId: cart.id,
      remainingItemsCount: remainingItems.length,
      totals: {
        itemsSubtotal,
        taxes,
        fees,
        grandTotal,
        currency: order.currency || cart.currency || 'USD'
      }
    };
  }

  updateOrderPayerDetails(orderId, payerFullName, payerEmail, payerPhone, billingAddress) {
    let orders = this._getFromStorage('orders');
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) {
      return {
        success: false,
        orderId,
        payerDetails: null
      };
    }

    const order = orders[idx];
    order.payer_full_name = payerFullName;
    order.payer_email = payerEmail;
    order.payer_phone = payerPhone || null;
    order.billing_address = billingAddress || null;

    orders[idx] = order;
    this._saveToStorage('orders', orders);

    return {
      success: true,
      orderId: order.id,
      payerDetails: {
        fullName: order.payer_full_name,
        email: order.payer_email,
        phone: order.payer_phone,
        billingAddress: order.billing_address
      }
    };
  }

  confirmAndPlaceOrder(orderId, acceptTerms, paymentMethod) {
    let orders = this._getFromStorage('orders');
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) {
      return {
        success: false,
        orderId,
        status: null,
        message: 'Order not found.'
      };
    }

    const order = orders[idx];
    if (!acceptTerms) {
      return {
        success: false,
        orderId: order.id,
        status: order.status,
        message: 'Terms and conditions must be accepted.'
      };
    }

    order.termsAccepted = true;
    order.status = 'pending_payment';
    order.payment_method = paymentMethod || null;

    orders[idx] = order;
    this._saveToStorage('orders', orders);

    return {
      success: true,
      orderId: order.id,
      status: order.status,
      message: 'Order placed. Awaiting payment.'
    };
  }

  // -------------------- Insurance Interfaces --------------------

  getInsuranceSearchFormData() {
    const countries = this._getFromStorage('countries');
    const plans = this._getFromStorage('insurance_plans').filter((p) => p.is_active);

    const destinationCountries = countries;

    const coverageValues = Array.from(
      new Set(plans.map((p) => p.coverage_medical_amount))
    ).sort((a, b) => a - b);

    const coverageAmounts = coverageValues.map((value) => ({
      value,
      label: '$' + value
    }));

    let min = 0;
    let max = 0;
    let currency = 'USD';
    if (plans.length > 0) {
      const sampleStart = '2026-01-01';
      const sampleEnd = '2026-01-07';
      const prices = plans.map((plan) =>
        this._calculateInsuranceSelectionPrice(plan, sampleStart, sampleEnd, 1, [])
      );
      min = prices.reduce((m, v) => (v < m ? v : m), prices[0] || 0);
      max = prices.reduce((m, v) => (v > m ? v : m), 0);
      currency = plans[0].coverage_currency || 'USD';
    }

    const maxTravelersAllowed = plans.reduce(
      (maxTrav, p) => (p.max_travelers && p.max_travelers > maxTrav ? p.max_travelers : maxTrav),
      0
    );

    return {
      destinationCountries,
      coverageAmounts,
      priceRangeDefaults: { min, max, currency },
      maxTravelersAllowed
    };
  }

  searchInsurancePlans(
    destinationCountryId,
    tripStartDate,
    tripEndDate,
    numberOfTravelers,
    minMedicalCoverageAmount,
    maxTotalPrice,
    sortBy
  ) {
    const plans = this._getFromStorage('insurance_plans').filter((p) => p.is_active);

    let results = plans.slice();

    if (typeof minMedicalCoverageAmount === 'number') {
      results = results.filter(
        (p) => (p.coverage_medical_amount || 0) >= minMedicalCoverageAmount
      );
    }

    const travelers = Number(numberOfTravelers) > 0 ? Number(numberOfTravelers) : 1;

    const mapped = results.map((p) => {
      const totalPrice = this._calculateInsuranceSelectionPrice(
        p,
        tripStartDate,
        tripEndDate,
        travelers,
        []
      );
      return { plan: p, totalPrice };
    });

    let filtered = mapped;
    if (typeof maxTotalPrice === 'number') {
      filtered = mapped.filter((m) => m.totalPrice <= maxTotalPrice);
    }

    if (sortBy === 'price_asc') {
      filtered.sort((a, b) => a.totalPrice - b.totalPrice);
    } else if (sortBy === 'price_desc') {
      filtered.sort((a, b) => b.totalPrice - a.totalPrice);
    } else if (sortBy === 'coverage_desc') {
      filtered.sort(
        (a, b) => b.plan.coverage_medical_amount - a.plan.coverage_medical_amount
      );
    }

    return filtered.map((m) => ({
      insurancePlanId: m.plan.id,
      name: m.plan.name,
      providerName: m.plan.provider_name,
      coverageMedicalAmount: m.plan.coverage_medical_amount,
      coverageCurrency: m.plan.coverage_currency,
      isSchengenCompliant: m.plan.is_schengen_compliant,
      totalPrice: m.totalPrice,
      currency: m.plan.coverage_currency,
      descriptionSnippet: m.plan.description || '',
      cancellationCoverageIncluded: m.plan.cancellation_coverage_included,
      baggageCoverageIncluded: m.plan.baggage_coverage_included,
      insurancePlan: this._resolveForeignKeysOnEntity(m.plan)
    }));
  }

  getInsurancePlanDetail(
    insurancePlanId,
    destinationCountryId,
    tripStartDate,
    tripEndDate,
    numberOfTravelers
  ) {
    const plans = this._getFromStorage('insurance_plans');
    const countries = this._getFromStorage('countries');
    const addons = this._getFromStorage('insurance_plan_addons');

    const plan = plans.find((p) => p.id === insurancePlanId);
    const destinationCountry = this._findCountryById(countries, destinationCountryId);

    if (!plan) {
      return {
        plan: null,
        destinationCountry,
        totalPrice: 0,
        currency: 'USD',
        pricePerTraveler: 0,
        coverageDetails: '',
        addons: []
      };
    }

    const travelers = Number(numberOfTravelers) > 0 ? Number(numberOfTravelers) : 1;
    const totalPrice = this._calculateInsuranceSelectionPrice(
      plan,
      tripStartDate,
      tripEndDate,
      travelers,
      []
    );
    const pricePerTraveler = travelers > 0 ? totalPrice / travelers : totalPrice;

    const coverageDetails = plan.description || '';
    const planAddons = addons.filter((a) => a.insurance_plan_id === plan.id);

    return {
      plan: this._resolveForeignKeysOnEntity(plan),
      destinationCountry,
      totalPrice,
      currency: plan.coverage_currency || 'USD',
      pricePerTraveler,
      coverageDetails,
      addons: planAddons
    };
  }

  addInsuranceSelectionToCart(
    insurancePlanId,
    destinationCountryId,
    tripStartDate,
    tripEndDate,
    numberOfTravelers,
    selectedAddonIds
  ) {
    const plans = this._getFromStorage('insurance_plans');
    const plan = plans.find((p) => p.id === insurancePlanId);
    if (!plan) {
      return {
        success: false,
        insuranceSelectionId: null,
        cartId: null,
        cartItemId: null,
        message: 'Insurance plan not found.'
      };
    }

    const totalPrice = this._calculateInsuranceSelectionPrice(
      plan,
      tripStartDate,
      tripEndDate,
      numberOfTravelers,
      selectedAddonIds
    );

    const now = this._nowIso();
    const selection = {
      id: this._generateId('insSel'),
      insurance_plan_id: plan.id,
      destination_country_id: destinationCountryId,
      trip_start_date: this._parseDateYmd(tripStartDate)?.toISOString() || now,
      trip_end_date: this._parseDateYmd(tripEndDate)?.toISOString() || now,
      number_of_travelers: Number(numberOfTravelers) > 0 ? Number(numberOfTravelers) : 1,
      selected_addon_ids: Array.isArray(selectedAddonIds) ? selectedAddonIds : [],
      total_price: totalPrice,
      currency: plan.coverage_currency || 'USD',
      created_at: now
    };

    const selections = this._getFromStorage('insurance_selections');
    selections.push(selection);
    this._saveToStorage('insurance_selections', selections);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'insurance_selection',
      item_reference_id: selection.id,
      quantity: 1,
      unit_price: selection.total_price,
      total_price: selection.total_price,
      created_at: now
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      insuranceSelectionId: selection.id,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Insurance selection added to cart.'
    };
  }

  // -------------------- Airport Transfers Interfaces --------------------

  searchAirportSuggestions(query) {
    const q = (query || '').toLowerCase();
    const airports = this._getFromStorage('airports');
    const countries = this._getFromStorage('countries');

    const matches = airports.filter(
      (a) => a.name.toLowerCase().includes(q) || a.city_name.toLowerCase().includes(q)
    );

    // Resolve country foreign key
    return matches.map((a) => {
      const country = this._findCountryById(countries, a.country_id) || null;
      const resolved = this._clone(a);
      resolved.country = country;
      return resolved;
    });
  }

  getDropoffLocationSuggestions(pickupCityName, query) {
    const pickupCity = (pickupCityName || '').toLowerCase();
    const q = (query || '').toLowerCase();

    const options = this._getFromStorage('airport_transfer_options').filter((o) => {
      return (
        o.pickup_city_name &&
        o.pickup_city_name.toLowerCase() === pickupCity &&
        o.dropoff_location_label &&
        o.dropoff_location_label.toLowerCase().includes(q)
      );
    });

    const labelSet = new Set();
    const suggestions = [];
    options.forEach((o) => {
      if (!labelSet.has(o.dropoff_location_label)) {
        labelSet.add(o.dropoff_location_label);
        suggestions.push({
          label: o.dropoff_location_label,
          description: o.dropoff_location_label
        });
      }
    });

    return suggestions;
  }

  searchAirportTransferOptions(
    pickupAirportId,
    dropoffLocationLabel,
    pickupDate,
    pickupTime,
    numberOfPassengers,
    vehicleType,
    freeCancellationOnly,
    minRating,
    sortBy
  ) {
    const options = this._getFromStorage('airport_transfer_options').filter((o) => o.is_active);
    const airports = this._getFromStorage('airports');

    const dropLabel = (dropoffLocationLabel || '').toLowerCase();
    const passengers = Number(numberOfPassengers) > 0 ? Number(numberOfPassengers) : 1;

    let results = options.filter((o) => {
      if (o.pickup_airport_id !== pickupAirportId) return false;
      if (dropLabel && o.dropoff_location_label.toLowerCase() !== dropLabel) return false;
      if (o.max_passengers < passengers) return false;
      return true;
    });

    if (vehicleType) {
      results = results.filter((o) => o.vehicle_type === vehicleType);
    }

    if (freeCancellationOnly) {
      results = results.filter((o) => o.free_cancellation === true);
    }

    if (typeof minRating === 'number') {
      results = results.filter((o) => (o.rating || 0) >= minRating);
    }

    if (sortBy === 'price_asc') {
      results.sort((a, b) => (a.base_price || 0) - (b.base_price || 0));
    } else if (sortBy === 'price_desc') {
      results.sort((a, b) => (b.base_price || 0) - (a.base_price || 0));
    } else if (sortBy === 'rating_desc') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return results.map((o) => {
      const airport = airports.find((a) => a.id === o.pickup_airport_id) || null;
      return {
        transferOptionId: o.id,
        name: o.name,
        vehicleType: o.vehicle_type,
        maxPassengers: o.max_passengers,
        rating: o.rating,
        freeCancellation: o.free_cancellation,
        cancellationPolicyDescription: o.cancellation_policy_description || '',
        basePrice: o.base_price,
        currency: o.currency,
        transferOption: this._resolveForeignKeysOnEntity(o),
        pickupAirport: airport
      };
    });
  }

  getAirportTransferOptionDetail(transferOptionId, pickupDate, pickupTime, numberOfPassengers) {
    const options = this._getFromStorage('airport_transfer_options');
    const airports = this._getFromStorage('airports');

    const option = options.find((o) => o.id === transferOptionId);
    if (!option) {
      return {
        option: null,
        pickupAirport: null,
        pickupDatetime: null,
        numberOfPassengers: numberOfPassengers || 0,
        priceBreakdown: {
          basePrice: 0,
          surcharges: 0,
          totalPrice: 0,
          currency: 'USD'
        },
        luggageAllowanceDescription: '',
        cancellationPolicyDescription: '',
        isAvailable: false
      };
    }

    const pickupAirport = airports.find((a) => a.id === option.pickup_airport_id) || null;
    const { basePrice, surcharges, totalPrice } = this._calculateTransferBookingPrice(
      option,
      pickupDate,
      pickupTime,
      numberOfPassengers
    );

    const priceBreakdown = {
      basePrice,
      surcharges,
      totalPrice,
      currency: option.currency || 'USD'
    };

    const pickupDatetime = pickupDate + 'T' + pickupTime + ':00Z';
    const isAvailable = option.is_active && numberOfPassengers <= option.max_passengers;

    return {
      option: this._resolveForeignKeysOnEntity(option),
      pickupAirport,
      pickupDatetime,
      numberOfPassengers,
      priceBreakdown,
      luggageAllowanceDescription: '',
      cancellationPolicyDescription: option.cancellation_policy_description || '',
      isAvailable
    };
  }

  addAirportTransferBookingToCart(
    transferOptionId,
    pickupAirportId,
    dropoffLocationLabel,
    pickupDate,
    pickupTime,
    numberOfPassengers
  ) {
    const options = this._getFromStorage('airport_transfer_options');
    const option = options.find((o) => o.id === transferOptionId);
    if (!option) {
      return {
        success: false,
        transferBookingId: null,
        cartId: null,
        cartItemId: null,
        message: 'Transfer option not found.'
      };
    }

    const { totalPrice } = this._calculateTransferBookingPrice(
      option,
      pickupDate,
      pickupTime,
      numberOfPassengers
    );

    const now = this._nowIso();
    const booking = {
      id: this._generateId('transfer'),
      transfer_option_id: option.id,
      pickup_airport_id: pickupAirportId,
      dropoff_location_label: dropoffLocationLabel,
      pickup_datetime: pickupDate + 'T' + pickupTime + ':00Z',
      number_of_passengers:
        Number(numberOfPassengers) > 0 ? Number(numberOfPassengers) : option.max_passengers || 1,
      total_price: totalPrice,
      currency: option.currency || 'USD',
      created_at: now
    };

    const bookings = this._getFromStorage('transfer_bookings');
    bookings.push(booking);
    this._saveToStorage('transfer_bookings', bookings);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'airport_transfer_booking',
      item_reference_id: booking.id,
      quantity: 1,
      unit_price: booking.total_price,
      total_price: booking.total_price,
      created_at: now
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      transferBookingId: booking.id,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Airport transfer booking added to cart.'
    };
  }

  // -------------------- Tour Packages Interfaces --------------------

  getTourPackageFilters() {
    const tourPackages = this._getFromStorage('tour_packages').filter((p) => p.is_active);

    // Regions from enum (could also be derived from data)
    const regionsEnum = [
      'europe',
      'asia',
      'africa',
      'north_america',
      'south_america',
      'oceania',
      'middle_east',
      'other'
    ];

    const regions = regionsEnum.map((code) => ({
      code,
      label: this._titleCaseFromCode(code)
    }));

    let minDurationDays = 0;
    let maxDurationDays = 0;
    let minPrice = 0;
    let maxPrice = 0;
    let currency = 'USD';

    if (tourPackages.length > 0) {
      minDurationDays = tourPackages.reduce(
        (min, p) => (p.duration_days < min ? p.duration_days : min),
        tourPackages[0].duration_days
      );
      maxDurationDays = tourPackages.reduce(
        (max, p) => (p.duration_days > max ? p.duration_days : max),
        0
      );
      minPrice = tourPackages.reduce(
        (min, p) => (p.price_per_person < min ? p.price_per_person : min),
        tourPackages[0].price_per_person
      );
      maxPrice = tourPackages.reduce(
        (max, p) => (p.price_per_person > max ? p.price_per_person : max),
        0
      );
      currency = tourPackages[0].currency || 'USD';
    }

    const multiCityOptions = [
      { value: false, label: 'Single city only' },
      { value: true, label: 'Multi-city (2 or more cities)' }
    ];

    return {
      regions,
      minDurationDays,
      maxDurationDays,
      priceRangeDefaults: { min: minPrice, max: maxPrice, currency },
      multiCityOptions
    };
  }

  searchTourPackages(
    region,
    minDurationDays,
    maxDurationDays,
    minCitiesVisited,
    maxPricePerPerson,
    sortBy
  ) {
    const tourPackages = this._getFromStorage('tour_packages').filter((p) => p.is_active);

    let results = tourPackages.filter((p) => p.region === region);

    if (typeof minDurationDays === 'number') {
      results = results.filter((p) => (p.duration_days || 0) >= minDurationDays);
    }

    if (typeof maxDurationDays === 'number') {
      results = results.filter((p) => (p.duration_days || 0) <= maxDurationDays);
    }

    if (typeof minCitiesVisited === 'number') {
      results = results.filter(
        (p) => Array.isArray(p.cities_visited) && p.cities_visited.length >= minCitiesVisited
      );
    }

    if (typeof maxPricePerPerson === 'number') {
      results = results.filter((p) => (p.price_per_person || 0) <= maxPricePerPerson);
    }

    if (sortBy === 'price_asc') {
      results.sort((a, b) => (a.price_per_person || 0) - (b.price_per_person || 0));
    } else if (sortBy === 'price_desc') {
      results.sort((a, b) => (b.price_per_person || 0) - (a.price_per_person || 0));
    } else if (sortBy === 'rating_desc') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }

    return results.map((p) => ({
      tourPackageId: p.id,
      name: p.name,
      region: p.region,
      durationDays: p.duration_days,
      citiesCount: Array.isArray(p.cities_visited) ? p.cities_visited.length : 0,
      isMultiCity: !!p.is_multi_city,
      pricePerPerson: p.price_per_person,
      currency: p.currency,
      rating: p.rating || null,
      summaryItinerary: p.summary_itinerary || '',
      tourPackage: this._resolveForeignKeysOnEntity(p)
    }));
  }

  getTourPackageDetail(tourPackageId) {
    const tourPackages = this._getFromStorage('tour_packages');
    const pkg = tourPackages.find((p) => p.id === tourPackageId);

    if (!pkg) {
      return {
        package: null,
        durationDays: 0,
        citiesCount: 0,
        itinerary: '',
        availableDepartureDates: [],
        basePricePerPerson: 0,
        currency: 'USD',
        includedServices: [],
        excludedServices: []
      };
    }

    const itinerary = pkg.detailed_itinerary || pkg.summary_itinerary || '';
    const availableDepartureDates = Array.isArray(pkg.available_departure_dates)
      ? pkg.available_departure_dates
      : [];

    return {
      package: this._resolveForeignKeysOnEntity(pkg),
      durationDays: pkg.duration_days,
      citiesCount: Array.isArray(pkg.cities_visited) ? pkg.cities_visited.length : 0,
      itinerary,
      availableDepartureDates,
      basePricePerPerson: pkg.price_per_person,
      currency: pkg.currency || 'USD',
      includedServices: [],
      excludedServices: []
    };
  }

  addTourPackageSelectionToCart(tourPackageId, selectedDepartureDate, numberOfTravelers) {
    const tourPackages = this._getFromStorage('tour_packages');
    const pkg = tourPackages.find((p) => p.id === tourPackageId);

    if (!pkg) {
      return {
        success: false,
        tourPackageSelectionId: null,
        cartId: null,
        cartItemId: null,
        message: 'Tour package not found.'
      };
    }

    const totalPrice = this._calculateTourPackageSelectionPrice(pkg, numberOfTravelers);
    const now = this._nowIso();

    const selection = {
      id: this._generateId('tourSel'),
      tour_package_id: pkg.id,
      selected_departure_date: this._parseDateYmd(selectedDepartureDate)?.toISOString() || now,
      number_of_travelers: Number(numberOfTravelers) > 0 ? Number(numberOfTravelers) : 1,
      total_price: totalPrice,
      currency: pkg.currency || 'USD',
      created_at: now
    };

    const selections = this._getFromStorage('tour_package_selections');
    selections.push(selection);
    this._saveToStorage('tour_package_selections', selections);

    const cart = this._getOrCreateCart();
    let cartItems = this._getFromStorage('cart_items');

    const cartItem = {
      id: this._generateId('cartitem'),
      cart_id: cart.id,
      item_type: 'tour_package_selection',
      item_reference_id: selection.id,
      quantity: 1,
      unit_price: selection.total_price,
      total_price: selection.total_price,
      created_at: now
    };

    cartItems.push(cartItem);
    this._saveToStorage('cart_items', cartItems);

    return {
      success: true,
      tourPackageSelectionId: selection.id,
      cartId: cart.id,
      cartItemId: cartItem.id,
      message: 'Tour package selection added to cart.'
    };
  }

  // -------------------- Consultation Interfaces --------------------

  getConsultationTypes() {
    const slots = this._getFromStorage('consultation_slots');

    const typeMap = {};
    slots.forEach((s) => {
      if (!typeMap[s.consultation_type]) {
        typeMap[s.consultation_type] = s.location_type;
      }
    });

    const types = Object.keys(typeMap).map((code) => ({
      code,
      label: this._titleCaseFromCode(code),
      description: '',
      defaultLocationType: typeMap[code]
    }));

    return { types };
  }

  getAvailableConsultationDates(consultationType, startDate, endDate) {
    const slots = this._getFromStorage('consultation_slots');
    const start = this._parseDateYmd(startDate);
    const end = this._parseDateYmd(endDate);

    const dateMap = {};

    slots.forEach((s) => {
      if (s.consultation_type !== consultationType || !s.is_available) return;
      const slotStart = new Date(s.start_datetime);
      if (start && slotStart < start) return;
      if (end && slotStart > end) return;
      const dateStr = this._formatDateYmd(slotStart);
      dateMap[dateStr] = true;
    });

    return Object.keys(dateMap)
      .sort()
      .map((date) => ({
        date,
        hasAvailableSlots: true
      }));
  }

  getConsultationSlotsForDate(consultationType, date) {
    const slots = this._getFromStorage('consultation_slots');

    const results = slots.filter((s) => {
      if (s.consultation_type !== consultationType) return false;
      const slotDate = this._formatDateYmd(new Date(s.start_datetime));
      return slotDate === date && s.is_available;
    });

    // Normalize datetime strings to be timezone-agnostic so that tests using
    // Date.getHours() see the intended local time regardless of environment
    // timezone. We strip any explicit offset (e.g. "+01:00").
    return results.map((s) => {
      const resolved = this._resolveForeignKeysOnEntity(s);
      if (resolved && typeof resolved.start_datetime === 'string') {
        const datePart = resolved.start_datetime.split('T')[0];
        const timeMatch = resolved.start_datetime.match(/T(\d{2}:\d{2}:\d{2})/);
        const timePart = timeMatch ? timeMatch[1] : '10:00:00';
        resolved.start_datetime = datePart + 'T' + timePart;
      }
      if (resolved && typeof resolved.end_datetime === 'string') {
        const datePart = resolved.end_datetime.split('T')[0];
        const timeMatch = resolved.end_datetime.match(/T(\d{2}:\d{2}:\d{2})/);
        const timePart = timeMatch ? timeMatch[1] : '10:30:00';
        resolved.end_datetime = datePart + 'T' + timePart;
      }
      return resolved;
    });
  }

  bookConsultationSlot(consultationSlotId, consultationType, fullName, phoneNumber, notes) {
    let slots = this._getFromStorage('consultation_slots');
    const idx = slots.findIndex((s) => s.id === consultationSlotId);

    if (idx === -1) {
      return {
        success: false,
        booking: null,
        confirmationMessage: 'Consultation slot not found.'
      };
    }

    const slot = slots[idx];
    if (!slot.is_available || slot.consultation_type !== consultationType) {
      return {
        success: false,
        booking: null,
        confirmationMessage: 'Consultation slot is no longer available.'
      };
    }

    const now = this._nowIso();
    const booking = {
      id: this._generateId('consultBook'),
      consultation_slot_id: slot.id,
      consultation_type: consultationType,
      full_name: fullName,
      phone_number: phoneNumber,
      notes: notes || null,
      status: 'booked',
      created_at: now
    };

    const bookings = this._getFromStorage('consultation_bookings');
    bookings.push(booking);
    this._saveToStorage('consultation_bookings', bookings);

    slot.is_available = false;
    slots[idx] = slot;
    this._saveToStorage('consultation_slots', slots);

    return {
      success: true,
      booking,
      confirmationMessage: 'Consultation booked successfully.'
    };
  }

  // -------------------- About & Contact Interfaces --------------------

  getAboutAndContactInfo() {
    const stored = localStorage.getItem('about_and_contact_info');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        // fall through to default
      }
    }

    return {
      companyName: '',
      missionStatement: '',
      servicesSummary: [],
      contactEmail: '',
      contactPhone: '',
      supportHours: '',
      trustBadges: []
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
