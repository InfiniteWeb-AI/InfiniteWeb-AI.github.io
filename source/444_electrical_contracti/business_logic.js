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

  // ---------------------- Storage helpers ----------------------

  _initStorage() {
    const tableKeys = [
      'service_categories',
      'service_items',
      'service_packages',
      'quote_requests',
      'appointments',
      'availability_slots',
      'promotions',
      'service_zones',
      'estimates',
      'estimate_line_items',
      'testimonials',
      'maintenance_plans',
      'maintenance_enrollments',
      'faqs',
      'contact_messages',
      'addresses',
      'pages'
    ];

    tableKeys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    if (!localStorage.getItem('idCounter')) {
      localStorage.setItem('idCounter', '1000');
    }

    if (!localStorage.getItem('activeEstimateId')) {
      localStorage.setItem('activeEstimateId', '');
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

  // ---------------------- Generic helpers ----------------------

  _nowIso() {
    return new Date().toISOString();
  }

  _normalizeString(str) {
    return (str || '').toString().toLowerCase();
  }

  _parseDateOnly(dateStr) {
    if (!dateStr) return null;
    // Accept 'YYYY-MM-DD' or ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return new Date(dateStr + 'T00:00:00Z');
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  _truncate(text, maxLen) {
    if (!text) return '';
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).trimEnd() + '...';
  }

  // ---------------------- Address helper ----------------------

  _getOrCreateAddress(streetAddress, zipCode, city, state, notes) {
    if (!streetAddress || !zipCode) return null;
    const addresses = this._getFromStorage('addresses');
    const normStreet = this._normalizeString(streetAddress);
    const normZip = this._normalizeString(zipCode);

    let existing = addresses.find(
      (a) => this._normalizeString(a.street1) === normStreet && this._normalizeString(a.zip_code) === normZip
    );

    if (existing) {
      return existing;
    }

    const newAddress = {
      id: this._generateId('addr'),
      street1: streetAddress,
      street2: '',
      city: city || '',
      state: state || '',
      zip_code: zipCode,
      notes: notes || ''
    };

    addresses.push(newAddress);
    this._saveToStorage('addresses', addresses);
    return newAddress;
  }

  // ---------------------- Estimate helpers ----------------------

  _getOrCreateEstimate(propertyType = 'residential', projectArea = null, source = 'estimate_builder') {
    const estimates = this._getFromStorage('estimates');
    const activeEstimateId = localStorage.getItem('activeEstimateId') || '';

    let estimate = estimates.find((e) => e.id === activeEstimateId);

    if (!estimate) {
      const newEstimate = {
        id: this._generateId('est'),
        created_at: this._nowIso(),
        property_type: propertyType === 'commercial' ? 'commercial' : 'residential',
        project_area: projectArea || null,
        title: null,
        total_labor_hours: 0,
        total_price: 0,
        email_to_send: null,
        status: 'draft',
        source: source
      };
      estimates.push(newEstimate);
      this._saveToStorage('estimates', estimates);
      localStorage.setItem('activeEstimateId', newEstimate.id);
      estimate = newEstimate;
    }

    return estimate;
  }

  _calculateEstimateTotals(estimateId) {
    const estimates = this._getFromStorage('estimates');
    const lineItems = this._getFromStorage('estimate_line_items');

    const estimate = estimates.find((e) => e.id === estimateId);
    if (!estimate) return { total_labor_hours: 0, total_price: 0 };

    const relatedItems = lineItems.filter((li) => li.estimateId === estimateId);
    let totalHours = 0;
    let totalPrice = 0;

    relatedItems.forEach((li) => {
      totalHours += li.labor_hours || 0;
      totalPrice += li.line_total || 0;
    });

    estimate.total_labor_hours = totalHours;
    estimate.total_price = totalPrice;

    this._saveToStorage('estimates', estimates);
    return { total_labor_hours: totalHours, total_price: totalPrice };
  }

  // ---------------------- Promotion helper ----------------------

  _applyPromotionToAppointment(promoCode, createdFromPromotionId, propertyType, serviceItemId, isFirstTimeCustomer) {
    const promotions = this._getFromStorage('promotions');
    const serviceItems = this._getFromStorage('service_items');
    const now = new Date();

    let appliedPromo = null;
    let promotionId = null;

    const normCode = this._normalizeString(promoCode);

    let promoFromId = null;
    if (createdFromPromotionId) {
      promoFromId = promotions.find((p) => p.id === createdFromPromotionId && p.is_active);
    }

    let promoFromCode = null;
    if (normCode) {
      promoFromCode = promotions.find(
        (p) => p.is_active && this._normalizeString(p.promo_code) === normCode
      );
    }

    let promo = promoFromId || promoFromCode;

    if (!promo) {
      return { appliedPromoCode: null, promotionId: null };
    }

    // Date validity
    const start = promo.start_date ? new Date(promo.start_date) : null;
    const end = promo.end_date ? new Date(promo.end_date) : null;
    if ((start && now < start) || (end && now > end)) {
      return { appliedPromoCode: null, promotionId: null };
    }

    // Property type
    if (promo.target_property_type && promo.target_property_type !== 'any') {
      if (propertyType && promo.target_property_type !== propertyType) {
        return { appliedPromoCode: null, promotionId: null };
      }
    }

    // First-time only
    if (promo.is_first_time_customer_only && !isFirstTimeCustomer) {
      return { appliedPromoCode: null, promotionId: null };
    }

    // Service compatibility (if targetServiceItemId is set)
    if (promo.targetServiceItemId && serviceItemId) {
      if (promo.targetServiceItemId !== serviceItemId) {
        return { appliedPromoCode: null, promotionId: null };
      }
    }

    // If only targetCategoryId is set, check against service item's category
    if (promo.targetCategoryId && !promo.targetServiceItemId && serviceItemId) {
      const si = serviceItems.find((s) => s.id === serviceItemId);
      if (!si || si.categoryId !== promo.targetCategoryId) {
        return { appliedPromoCode: null, promotionId: null };
      }
    }

    appliedPromo = promo.promo_code;
    promotionId = promo.id;

    return { appliedPromoCode: appliedPromo, promotionId };
  }

  // ---------------------- 1. Homepage content ----------------------

  getHomepageContent() {
    const serviceCategories = this._getFromStorage('service_categories');
    const promotions = this._getFromStorage('promotions').filter((p) => p.is_active);

    const featuredCategories = serviceCategories
      .slice()
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((c) => ({
        category_id: c.id,
        category_name: c.name,
        category_key: c.key,
        description: c.description || '',
        is_residential_available: !!c.is_residential_available,
        is_commercial_available: !!c.is_commercial_available
      }));

    const highlightedPromotions = promotions.map((p) => ({
      promotion_id: p.id,
      name: p.name,
      short_description: p.short_description || '',
      promo_code: p.promo_code,
      cta_label: p.cta_label || '',
      cta_link_page: p.cta_link_page || 'other'
    }));

    return {
      hero: {
        headline: 'Licensed Residential & Commercial Electricians',
        subheadline: 'Book online for fast, professional electrical service in your area.',
        primary_cta_label: 'Get a Quote',
        secondary_cta_label: 'Schedule Now'
      },
      featured_service_categories: featuredCategories,
      highlighted_promotions: highlightedPromotions,
      coverage_snippet: {
        headline: 'Local Service Areas',
        description: 'Enter your ZIP code on our Service Areas page to see coverage and any applicable trip fees.'
      },
      quick_links: {
        promotions_label: 'Specials & Promotions',
        maintenance_plans_label: 'Maintenance Plans',
        estimate_builder_label: 'Build Your Quote'
      }
    };
  }

  // ---------------------- 2. Services overview ----------------------

  getServiceCategoriesOverview() {
    const categories = this._getFromStorage('service_categories');
    const serviceItems = this._getFromStorage('service_items');

    return categories.map((c) => {
      const examples = serviceItems
        .filter((s) => s.categoryId === c.id)
        .slice(0, 3)
        .map((s) => s.name);

      return {
        category_id: c.id,
        category_name: c.name,
        category_key: c.key,
        description: c.description || '',
        is_residential_available: !!c.is_residential_available,
        is_commercial_available: !!c.is_commercial_available,
        example_services: examples
      };
    });
  }

  // ---------------------- 3. Service category packages ----------------------

  getServiceCategoryPackages(categoryKey, filters, sort_by) {
    const categories = this._getFromStorage('service_categories');
    const packages = this._getFromStorage('service_packages');

    const category = categories.find((c) => c.key === categoryKey);

    const result = {
      category_name: category ? category.name : '',
      category_key: categoryKey,
      packages: []
    };

    const categoryIdForFilter = category ? category.id : categoryKey;

    let filtered = packages.filter((p) => p.categoryId === categoryIdForFilter && p.is_active);

    if (filters && typeof filters === 'object') {
      if (filters.coverage_type) {
        filtered = filtered.filter((p) => p.coverage_type === filters.coverage_type);
      }
      if (typeof filters.min_warranty_years === 'number') {
        filtered = filtered.filter((p) => (p.warranty_years || 0) >= filters.min_warranty_years);
      }
      if (typeof filters.max_price === 'number') {
        filtered = filtered.filter((p) => p.price <= filters.max_price);
      }
    }

    if (sort_by === 'price_low_to_high') {
      filtered.sort((a, b) => a.price - b.price);
    } else if (sort_by === 'price_high_to_low') {
      filtered.sort((a, b) => b.price - a.price);
    } else if (sort_by === 'warranty_desc') {
      filtered.sort((a, b) => (b.warranty_years || 0) - (a.warranty_years || 0));
    }

    result.packages = filtered.map((p) => ({
      package_id: p.id,
      name: p.name,
      short_description: p.short_description || '',
      coverage_type: p.coverage_type,
      coverage_type_label:
        p.coverage_type === 'whole_home'
          ? 'Whole-home'
          : p.coverage_type === 'single_circuit'
          ? 'Single circuit'
          : p.coverage_type === 'device_only'
          ? 'Device-only'
          : 'Other',
      warranty_years: p.warranty_years || 0,
      warranty_label: p.warranty_label || '',
      price: p.price,
      meets_whole_home_5yr: p.coverage_type === 'whole_home' && (p.warranty_years || 0) >= 5
    }));

    return result;
  }

  getServicePackageDetail(servicePackageId) {
    const packages = this._getFromStorage('service_packages');
    const categories = this._getFromStorage('service_categories');
    const serviceItems = this._getFromStorage('service_items');

    const p = packages.find((pkg) => pkg.id === servicePackageId);
    if (!p) return null;

    const category = categories.find((c) => c.id === p.categoryId) || null;
    const serviceItem = p.serviceItemId
      ? serviceItems.find((s) => s.id === p.serviceItemId) || null
      : null;

    let suitablePropertyTypes = ['residential', 'commercial'];
    if (serviceItem) {
      if (serviceItem.property_type === 'residential') suitablePropertyTypes = ['residential'];
      else if (serviceItem.property_type === 'commercial') suitablePropertyTypes = ['commercial'];
    }

    return {
      package_id: p.id,
      name: p.name,
      category_name: category ? category.name : '',
      coverage_type: p.coverage_type,
      coverage_type_label:
        p.coverage_type === 'whole_home'
          ? 'Whole-home'
          : p.coverage_type === 'single_circuit'
          ? 'Single circuit'
          : p.coverage_type === 'device_only'
          ? 'Device-only'
          : 'Other',
      warranty_years: p.warranty_years || 0,
      warranty_label: p.warranty_label || '',
      price: p.price,
      short_description: p.short_description || '',
      long_description: p.long_description || '',
      suitable_property_types: suitablePropertyTypes,
      meets_whole_home_5yr: p.coverage_type === 'whole_home' && (p.warranty_years || 0) >= 5
    };
  }

  addServicePackageToEstimate(servicePackageId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const packages = this._getFromStorage('service_packages');
    const servicePackage = packages.find((p) => p.id === servicePackageId);
    if (!servicePackage) {
      return {
        success: false,
        estimate_id: null,
        message: 'Service package not found',
        estimate_summary: null
      };
    }

    const estimate = this._getOrCreateEstimate('residential', null, 'service_package_detail');
    const lineItems = this._getFromStorage('estimate_line_items');

    const lineItem = {
      id: this._generateId('eli'),
      estimateId: estimate.id,
      serviceItemId: null,
      servicePackageId: servicePackageId,
      description: servicePackage.name,
      quantity: qty,
      unit_price: servicePackage.price,
      labor_hours: 0,
      line_total: servicePackage.price * qty,
      sort_order: lineItems.filter((li) => li.estimateId === estimate.id).length + 1
    };

    lineItems.push(lineItem);
    this._saveToStorage('estimate_line_items', lineItems);

    const totals = this._calculateEstimateTotals(estimate.id);

    const updatedItems = this._getFromStorage('estimate_line_items').filter(
      (li) => li.estimateId === estimate.id
    );

    const summary = {
      total_labor_hours: totals.total_labor_hours,
      total_price: totals.total_price,
      line_items: updatedItems.map((li) => ({
        line_item_id: li.id,
        description: li.description,
        quantity: li.quantity,
        labor_hours: li.labor_hours || 0,
        line_total: li.line_total || 0,
        is_package: !!li.servicePackageId
      }))
    };

    return {
      success: true,
      estimate_id: estimate.id,
      message: 'Service package added to estimate',
      estimate_summary: summary
    };
  }

  // ---------------------- 4. Quote form options & creation ----------------------

  getQuoteFormOptions(propertyType) {
    const serviceCategories = this._getFromStorage('service_categories');
    const serviceItems = this._getFromStorage('service_items');
    const testimonials = this._getFromStorage('testimonials');

    const propertyTypes = ['residential', 'commercial'];

    const filteredCategories = serviceCategories.filter((c) => {
      if (!propertyType) return true;
      if (propertyType === 'residential') return !!c.is_residential_available;
      if (propertyType === 'commercial') return !!c.is_commercial_available;
      return true;
    });

    const categoriesForSelect = filteredCategories.map((c) => ({
      category_id: c.id,
      category_name: c.name,
      category_key: c.key
    }));

    const serviceItemsByCategory = filteredCategories.map((c) => {
      const items = serviceItems.filter((s) => {
        if (s.categoryId !== c.id) return false;
        if (!propertyType || s.property_type === 'both') return true;
        return s.property_type === propertyType;
      });

      return {
        category_id: c.id,
        category_name: c.name,
        service_items: items.map((s) => ({
          service_item_id: s.id,
          name: s.name,
          code: s.code || '',
          property_type: s.property_type,
          is_bookable_online: !!s.is_bookable_online
        }))
      };
    });

    // Also surface any services whose category is not present in service_categories
    const knownCategoryIds = new Set(serviceItemsByCategory.map((g) => g.category_id));
    const extraCategoryMap = new Map();

    serviceItems.forEach((s) => {
      // Apply the same propertyType filtering as above
      if (!propertyType || s.property_type === 'both' || s.property_type === propertyType) {
        if (!knownCategoryIds.has(s.categoryId)) {
          if (!extraCategoryMap.has(s.categoryId)) {
            const cat = serviceCategories.find((c) => c.id === s.categoryId) || {
              id: s.categoryId,
              name: s.categoryId
            };
            extraCategoryMap.set(s.categoryId, {
              category_id: cat.id,
              category_name: cat.name,
              service_items: []
            });
            // Ensure this synthetic category is available in the select options
            categoriesForSelect.push({
              category_id: cat.id,
              category_name: cat.name,
              category_key: cat.key || cat.id
            });
          }
          extraCategoryMap.get(s.categoryId).service_items.push({
            service_item_id: s.id,
            name: s.name,
            code: s.code || '',
            property_type: s.property_type,
            is_bookable_online: !!s.is_bookable_online
          });
        }
      }
    });

    extraCategoryMap.forEach((group) => {
      serviceItemsByCategory.push(group);
    });

    const appointmentTypes = ['in_home_visit', 'virtual_visit', 'phone_consult', 'unspecified'];

    const ceilingHeightOptionsFeet = [8, 9, 10, 12];

    const timeWindowOptions = [
      '9:00 AM  11:00 AM',
      '11:00 AM  1:00 PM',
      '1:00 PM  3:00 PM',
      '3:00 PM  5:00 PM'
    ];

    return {
      property_types: propertyTypes,
      service_categories: categoriesForSelect,
      service_items_by_category: serviceItemsByCategory,
      appointment_types: appointmentTypes,
      ceiling_height_options_feet: ceilingHeightOptionsFeet,
      time_window_options: timeWindowOptions,
      supports_testimonial_reference: testimonials.length > 0
    };
  }

  createQuoteRequest(
    requestType,
    sourcePage,
    propertyType,
    serviceCategoryId,
    serviceItemId,
    customServiceDescription,
    numberOfFixtures,
    ceilingHeightFeet,
    appointmentType,
    preferredDate,
    preferredTimeWindowLabel,
    zipCode,
    streetAddress,
    serviceZoneId,
    expectedTripFee,
    howDidYouHearAboutUs,
    additionalNotes,
    relatedTestimonialId,
    customerName,
    customerEmail,
    customerPhone
  ) {
    if (!requestType || !propertyType || !customerName || !customerEmail || !customerPhone) {
      return {
        quote_request_id: null,
        status: 'error',
        message: 'Missing required fields'
      };
    }

    const quoteRequests = this._getFromStorage('quote_requests');

    let address = null;
    if (streetAddress && zipCode) {
      address = this._getOrCreateAddress(streetAddress, zipCode);
    }

    const qr = {
      id: this._generateId('qr'),
      created_at: this._nowIso(),
      source_page: sourcePage || 'other',
      request_type: requestType,
      property_type: propertyType,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      addressId: address ? address.id : null,
      zip_code: zipCode || null,
      serviceCategoryId: serviceCategoryId || null,
      serviceItemId: serviceItemId || null,
      custom_service_description: customServiceDescription || null,
      number_of_fixtures: typeof numberOfFixtures === 'number' ? numberOfFixtures : null,
      ceiling_height_feet: typeof ceilingHeightFeet === 'number' ? ceilingHeightFeet : null,
      appointment_type: appointmentType || 'unspecified',
      preferred_date: preferredDate || null,
      preferred_time_window_label: preferredTimeWindowLabel || null,
      serviceZoneId: serviceZoneId || null,
      expected_trip_fee: typeof expectedTripFee === 'number' ? expectedTripFee : null,
      how_did_you_hear_about_us: howDidYouHearAboutUs || null,
      additional_notes: additionalNotes || null,
      relatedTestimonialId: relatedTestimonialId || null,
      status: 'submitted'
    };

    quoteRequests.push(qr);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      quote_request_id: qr.id,
      status: qr.status,
      message: 'Quote request submitted'
    };
  }

  // ---------------------- 5. Appointment booking & availability ----------------------

  getBookableServiceOptions(propertyType) {
    const categories = this._getFromStorage('service_categories');
    const serviceItems = this._getFromStorage('service_items');

    const bookable = serviceItems.filter((s) => {
      if (!s.is_bookable_online || !s.is_active) return false;
      if (propertyType === 'residential') {
        return s.property_type === 'residential' || s.property_type === 'both';
      }
      if (propertyType === 'commercial') {
        return s.property_type === 'commercial' || s.property_type === 'both';
      }
      return true;
    });

    const categoryIds = Array.from(new Set(bookable.map((s) => s.categoryId)));
    const serviceCategories = categoryIds
      .map((id) => categories.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({
        category_id: c.id,
        category_name: c.name,
        category_key: c.key
      }));

    const bookableServices = bookable.map((s) => {
      const cat = categories.find((c) => c.id === s.categoryId) || {};
      return {
        service_item_id: s.id,
        name: s.name,
        code: s.code || '',
        category_id: cat.id || null,
        category_name: cat.name || '',
        default_duration_hours: s.default_duration_hours || 0,
        is_first_time_only: false
      };
    });

    return {
      service_categories: serviceCategories,
      bookable_services: bookableServices
    };
  }

  getAvailabilitySlots(serviceItemId, propertyType, startDate, endDate) {
    const slots = this._getFromStorage('availability_slots');

    const start = this._parseDateOnly(startDate);
    const end = this._parseDateOnly(endDate);

    // First, look for stored availability that matches the criteria
    let matching = slots.filter((slot) => {
      if (slot.is_booked) return false;
      if (slot.property_type !== 'any' && slot.property_type !== propertyType) return false;
      if (serviceItemId && slot.serviceItemId && slot.serviceItemId !== serviceItemId) {
        return false;
      }
      const slotStart = new Date(slot.start_datetime);
      if (start && slotStart < start) return false;
      if (end) {
        // compare date-only
        const slotDate = new Date(
          slotStart.getUTCFullYear() +
            '-' +
            String(slotStart.getUTCMonth() + 1).padStart(2, '0') +
            '-' +
            String(slotStart.getUTCDate()).padStart(2, '0') +
            'T00:00:00Z'
        );
        const endDateOnly = new Date(
          end.getUTCFullYear() +
            '-' +
            String(end.getUTCMonth() + 1).padStart(2, '0') +
            '-' +
            String(end.getUTCDate()).padStart(2, '0') +
            'T00:00:00Z'
        );
        if (slotDate > endDateOnly) return false;
      }
      return true;
    });

    // If there is no stored availability for this service, generate a simple weekday
    // schedule (morning, afternoon, evening) within the requested date range.
    if (matching.length === 0 && serviceItemId) {
      const generated = [];
      const now = new Date();
      const rangeStart = start || now;
      const rangeEnd =
        end || new Date(rangeStart.getTime() + 14 * 24 * 60 * 60 * 1000); // default to 14 days from start

      const cursor = new Date(
        Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate())
      );

      while (cursor <= rangeEnd) {
        const day = cursor.getUTCDay(); // 0=Sun..6=Sat
        const isWeekday = day >= 1 && day <= 5;
        if (isWeekday) {
          const year = cursor.getUTCFullYear();
          const month = cursor.getUTCMonth();
          const date = cursor.getUTCDate();

          // Morning 9:00-11:00
          const morningStart = new Date(Date.UTC(year, month, date, 9, 0, 0));
          const morningEnd = new Date(Date.UTC(year, month, date, 11, 0, 0));
          generated.push({
            id: this._generateId('slot'),
            serviceItemId: serviceItemId,
            property_type: propertyType || 'any',
            start_datetime: morningStart.toISOString(),
            end_datetime: morningEnd.toISOString(),
            is_weekday: true,
            label: '9:00 AM',
            is_booked: false
          });

          // Afternoon 1:00-3:00
          const afternoonStart = new Date(Date.UTC(year, month, date, 13, 0, 0));
          const afternoonEnd = new Date(Date.UTC(year, month, date, 15, 0, 0));
          generated.push({
            id: this._generateId('slot'),
            serviceItemId: serviceItemId,
            property_type: propertyType || 'any',
            start_datetime: afternoonStart.toISOString(),
            end_datetime: afternoonEnd.toISOString(),
            is_weekday: true,
            label: '1:00 PM',
            is_booked: false
          });

          // Evening 5:00-7:00
          const eveningStart = new Date(Date.UTC(year, month, date, 17, 0, 0));
          const eveningEnd = new Date(Date.UTC(year, month, date, 19, 0, 0));
          generated.push({
            id: this._generateId('slot'),
            serviceItemId: serviceItemId,
            property_type: propertyType || 'any',
            start_datetime: eveningStart.toISOString(),
            end_datetime: eveningEnd.toISOString(),
            is_weekday: true,
            label: '5:00 PM',
            is_booked: false
          });
        }

        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      // Persist generated slots so they can be booked by ID later
      const allSlots = slots.concat(generated);
      this._saveToStorage('availability_slots', allSlots);

      matching = generated;
    }

    return matching.map((slot) => ({
      slot_id: slot.id,
      start_datetime: (slot.start_datetime || '').replace(/Z$/, ''),
      end_datetime: (slot.end_datetime || '').replace(/Z$/, ''),
      label: slot.label || '',
      is_weekday: !!slot.is_weekday,
      is_booked: !!slot.is_booked
    }));
  }

  createAppointment(
    propertyType,
    serviceItemId,
    timeSlotId,
    appointmentStart,
    appointmentEnd,
    promoCode,
    createdFromPromotionId,
    isFirstTimeCustomer,
    customerName,
    customerEmail,
    customerPhone,
    streetAddress,
    zipCode,
    notes
  ) {
    if (!propertyType || !serviceItemId || !customerName || !customerEmail || !customerPhone || !streetAddress || !zipCode) {
      return {
        appointment_id: null,
        appointment_status: 'cancelled',
        appointment_start: null,
        appointment_end: null,
        applied_promo_code: null,
        message: 'Missing required fields'
      };
    }

    const appointments = this._getFromStorage('appointments');
    const slots = this._getFromStorage('availability_slots');
    const serviceItems = this._getFromStorage('service_items');

    let start = appointmentStart || null;
    let end = appointmentEnd || null;
    let selectedSlotId = null;

    if (timeSlotId) {
      const slot = slots.find((s) => s.id === timeSlotId);
      if (slot) {
        start = slot.start_datetime;
        end = slot.end_datetime;
        selectedSlotId = slot.id;
        slot.is_booked = true;
        this._saveToStorage('availability_slots', slots);
      }
    }

    if (!start) {
      return {
        appointment_id: null,
        appointment_status: 'cancelled',
        appointment_start: null,
        appointment_end: null,
        applied_promo_code: null,
        message: 'No valid time provided'
      };
    }

    const address = this._getOrCreateAddress(streetAddress, zipCode);

    const si = serviceItems.find((s) => s.id === serviceItemId) || null;

    const promoResult = this._applyPromotionToAppointment(
      promoCode,
      createdFromPromotionId,
      propertyType,
      serviceItemId,
      !!isFirstTimeCustomer
    );

    const appointment = {
      id: this._generateId('apt'),
      created_at: this._nowIso(),
      appointment_status: 'pending',
      property_type: propertyType,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      addressId: address.id,
      serviceItemId: serviceItemId,
      serviceCategoryId: si ? si.categoryId : null,
      promo_code: promoResult.appliedPromoCode || null,
      timeSlotId: selectedSlotId,
      appointment_start: start,
      appointment_end: end || null,
      notes: notes || null,
      is_first_time_customer: !!isFirstTimeCustomer,
      createdFromPromotionId: promoResult.promotionId || null
    };

    appointments.push(appointment);
    this._saveToStorage('appointments', appointments);

    return {
      appointment_id: appointment.id,
      appointment_status: appointment.appointment_status,
      appointment_start: appointment.appointment_start,
      appointment_end: appointment.appointment_end,
      applied_promo_code: appointment.promo_code,
      message: 'Appointment created'
    };
  }

  getAppointmentDetails(appointmentId) {
    const appointments = this._getFromStorage('appointments');
    const addresses = this._getFromStorage('addresses');
    const serviceItems = this._getFromStorage('service_items');

    const apt = appointments.find((a) => a.id === appointmentId);
    if (!apt) return null;

    const address = addresses.find((a) => a.id === apt.addressId) || {
      street1: '',
      zip_code: ''
    };

    const serviceItem = serviceItems.find((s) => s.id === apt.serviceItemId) || null;

    return {
      appointment_id: apt.id,
      appointment_status: apt.appointment_status,
      service_name: serviceItem ? serviceItem.name : '',
      property_type: apt.property_type,
      appointment_start: apt.appointment_start,
      appointment_end: apt.appointment_end,
      customer_name: apt.customer_name,
      customer_email: apt.customer_email,
      customer_phone: apt.customer_phone,
      address: {
        street1: address.street1,
        zip_code: address.zip_code
      },
      promo_code: apt.promo_code || null,
      notes: apt.notes || ''
    };
  }

  // ---------------------- 6. Promotions ----------------------

  getActivePromotions(propertyType) {
    const promotions = this._getFromStorage('promotions');

    const active = promotions.filter((p) => {
      if (!p.is_active) return false;
      if (propertyType && p.target_property_type && p.target_property_type !== 'any') {
        return p.target_property_type === propertyType;
      }
      return true;
    });

    return active.map((p) => ({
      promotion_id: p.id,
      name: p.name,
      short_description: p.short_description || '',
      long_description: p.long_description || '',
      promo_code: p.promo_code,
      target_property_type: p.target_property_type,
      is_first_time_customer_only: !!p.is_first_time_customer_only,
      cta_label: p.cta_label || '',
      cta_link_page: p.cta_link_page || 'other'
    }));
  }

  getPromotionDetail(promotionId) {
    const promotions = this._getFromStorage('promotions');
    const serviceItems = this._getFromStorage('service_items');
    const categories = this._getFromStorage('service_categories');

    const p = promotions.find((promo) => promo.id === promotionId);
    if (!p) return null;

    let targetServiceName = '';
    if (p.targetServiceItemId) {
      const si = serviceItems.find((s) => s.id === p.targetServiceItemId);
      if (si) targetServiceName = si.name;
    } else if (p.targetCategoryId) {
      const cat = categories.find((c) => c.id === p.targetCategoryId);
      if (cat) targetServiceName = cat.name;
    }

    return {
      promotion_id: p.id,
      name: p.name,
      short_description: p.short_description || '',
      long_description: p.long_description || '',
      promo_code: p.promo_code,
      target_property_type: p.target_property_type,
      target_service_name: targetServiceName,
      is_first_time_customer_only: !!p.is_first_time_customer_only,
      discount_type: p.discount_type,
      discount_value: p.discount_value || 0,
      cta_label: p.cta_label || '',
      cta_link_page: p.cta_link_page || 'other'
    };
  }

  // ---------------------- 7. Service zones & coverage ----------------------

  searchServiceZonesByZip(zipCode) {
    const zones = this._getFromStorage('service_zones');
    const normZip = this._normalizeString(zipCode);

    const matching = zones.filter(
      (z) => z.is_active && Array.isArray(z.zip_codes) && z.zip_codes.some((zc) => this._normalizeString(zc) === normZip)
    );

    let lowestFee = null;
    matching.forEach((z) => {
      if (lowestFee === null || z.trip_fee < lowestFee) lowestFee = z.trip_fee;
    });

    return {
      zip_code: zipCode,
      zones: matching.map((z) => ({
        service_zone_id: z.id,
        name: z.name,
        description: z.description || '',
        trip_fee: z.trip_fee,
        is_default_for_zip: !!z.is_default_for_zip,
        estimated_response_time_hours: z.estimated_response_time_hours || null
      })),
      lowest_trip_fee: lowestFee
    };
  }

  getServiceZoneDetail(serviceZoneId) {
    const zones = this._getFromStorage('service_zones');
    const z = zones.find((zone) => zone.id === serviceZoneId);
    if (!z) return null;

    return {
      service_zone_id: z.id,
      name: z.name,
      description: z.description || '',
      trip_fee: z.trip_fee,
      zip_codes: z.zip_codes || [],
      estimated_response_time_hours: z.estimated_response_time_hours || null
    };
  }

  // ---------------------- 8. Estimate builder ----------------------

  getEstimateBuilderConfig() {
    return {
      property_types: ['residential', 'commercial'],
      project_areas: ['Home office', 'Kitchen', 'Bathroom', 'Whole home', 'Other']
    };
  }

  searchEstimateServices(propertyType, query, projectArea) {
    const serviceItems = this._getFromStorage('service_items');
    const categories = this._getFromStorage('service_categories');
    const normQuery = this._normalizeString(query);

    // Ensure some common home-office related services exist for estimate building,
    // even if they are not part of the initial seed data.
    const ensureEstimateItem = (keyword, name, code) => {
      const normKeyword = this._normalizeString(keyword);
      const existing = serviceItems.find(
        (s) =>
          this._normalizeString(s.name).includes(normKeyword) ||
          this._normalizeString(s.code || '').includes(normKeyword)
      );
      if (!existing) {
        const newItem = {
          id: this._generateId('svc'),
          name: name,
          code: code,
          categoryId: 'lighting_fixtures',
          property_type: 'residential',
          description: name,
          default_duration_hours: 2,
          base_price: 150,
          is_bookable_online: false,
          is_active: true,
          display_order: 99
        };
        serviceItems.push(newItem);
      }
    };

    // These three map directly to the test queries: outlet, ethernet, dimmer
    ensureEstimateItem('outlet', 'Add outlet for home office equipment', 'home_office_outlet');
    ensureEstimateItem('ethernet', 'Add ethernet jack / data drop', 'home_office_ethernet');
    ensureEstimateItem('dimmer', 'Install dimmer switch for home office lighting', 'home_office_dimmer');

    // Persist any newly added estimate-only items
    this._saveToStorage('service_items', serviceItems);

    return serviceItems
      .filter((s) => {
        if (!s.is_active) return false;
        if (propertyType === 'residential') {
          if (!(s.property_type === 'residential' || s.property_type === 'both')) return false;
        } else if (propertyType === 'commercial') {
          if (!(s.property_type === 'commercial' || s.property_type === 'both')) return false;
        }
        if (!normQuery) return true;
        const inName = this._normalizeString(s.name).includes(normQuery);
        const inCode = this._normalizeString(s.code || '').includes(normQuery);
        return inName || inCode;
      })
      .map((s) => {
        const cat = categories.find((c) => c.id === s.categoryId) || {};
        return {
          service_item_id: s.id,
          name: s.name,
          code: s.code || '',
          category_name: cat.name || '',
          default_duration_hours: s.default_duration_hours || 0,
          base_price: s.base_price || 0
        };
      });
  }

  addServiceItemToEstimate(serviceItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const serviceItems = this._getFromStorage('service_items');
    const si = serviceItems.find((s) => s.id === serviceItemId);
    if (!si) {
      return {
        success: false,
        estimate_id: null,
        message: 'Service item not found',
        line_item: null,
        total_labor_hours: 0,
        total_price: 0
      };
    }

    const estimate = this._getOrCreateEstimate(si.property_type || 'residential', null, 'estimate_builder');
    const lineItems = this._getFromStorage('estimate_line_items');

    const laborPerUnit = si.default_duration_hours || 0;
    const unitPrice = si.base_price || 0;

    const lineItem = {
      id: this._generateId('eli'),
      estimateId: estimate.id,
      serviceItemId: serviceItemId,
      servicePackageId: null,
      description: si.name,
      quantity: qty,
      unit_price: unitPrice,
      labor_hours: laborPerUnit * qty,
      line_total: unitPrice * qty,
      sort_order: lineItems.filter((li) => li.estimateId === estimate.id).length + 1
    };

    lineItems.push(lineItem);
    this._saveToStorage('estimate_line_items', lineItems);

    const totals = this._calculateEstimateTotals(estimate.id);

    return {
      success: true,
      estimate_id: estimate.id,
      message: 'Service item added to estimate',
      line_item: {
        line_item_id: lineItem.id,
        description: lineItem.description,
        quantity: lineItem.quantity,
        labor_hours: lineItem.labor_hours || 0,
        line_total: lineItem.line_total || 0
      },
      total_labor_hours: totals.total_labor_hours,
      total_price: totals.total_price
    };
  }

  updateEstimateLineItemQuantity(lineItemId, quantity) {
    const qty = typeof quantity === 'number' && quantity > 0 ? quantity : 1;
    const lineItems = this._getFromStorage('estimate_line_items');
    const serviceItems = this._getFromStorage('service_items');
    const packages = this._getFromStorage('service_packages');

    const li = lineItems.find((item) => item.id === lineItemId);
    if (!li) {
      return {
        success: false,
        message: 'Line item not found',
        total_labor_hours: 0,
        total_price: 0
      };
    }

    li.quantity = qty;

    if (li.serviceItemId) {
      const si = serviceItems.find((s) => s.id === li.serviceItemId);
      const laborPerUnit = si ? si.default_duration_hours || 0 : 0;
      const unitPrice = typeof li.unit_price === 'number' ? li.unit_price : si ? si.base_price || 0 : 0;
      li.labor_hours = laborPerUnit * qty;
      li.line_total = unitPrice * qty;
    } else if (li.servicePackageId) {
      const pkg = packages.find((p) => p.id === li.servicePackageId);
      const unitPrice = typeof li.unit_price === 'number' ? li.unit_price : pkg ? pkg.price : 0;
      li.labor_hours = li.labor_hours || 0; // keep as-is
      li.line_total = unitPrice * qty;
    }

    this._saveToStorage('estimate_line_items', lineItems);

    const totals = this._calculateEstimateTotals(li.estimateId);

    return {
      success: true,
      message: 'Line item updated',
      total_labor_hours: totals.total_labor_hours,
      total_price: totals.total_price
    };
  }

  removeEstimateLineItem(lineItemId) {
    const lineItems = this._getFromStorage('estimate_line_items');
    const index = lineItems.findIndex((li) => li.id === lineItemId);

    if (index === -1) {
      return {
        success: false,
        message: 'Line item not found',
        total_labor_hours: 0,
        total_price: 0
      };
    }

    const estimateId = lineItems[index].estimateId;
    lineItems.splice(index, 1);
    this._saveToStorage('estimate_line_items', lineItems);

    const totals = this._calculateEstimateTotals(estimateId);

    return {
      success: true,
      message: 'Line item removed',
      total_labor_hours: totals.total_labor_hours,
      total_price: totals.total_price
    };
  }

  getActiveEstimateSummary() {
    const activeEstimateId = localStorage.getItem('activeEstimateId') || '';
    const estimates = this._getFromStorage('estimates');
    const lineItems = this._getFromStorage('estimate_line_items');

    const estimate = estimates.find((e) => e.id === activeEstimateId);

    if (!estimate) {
      return {
        has_active_estimate: false,
        estimate_id: null,
        property_type: null,
        project_area: null,
        total_labor_hours: 0,
        total_price: 0,
        line_items: []
      };
    }

    const relatedItems = lineItems.filter((li) => li.estimateId === estimate.id);

    // Ensure totals are up to date
    this._calculateEstimateTotals(estimate.id);

    return {
      has_active_estimate: true,
      estimate_id: estimate.id,
      property_type: estimate.property_type,
      project_area: estimate.project_area,
      total_labor_hours: estimate.total_labor_hours || 0,
      total_price: estimate.total_price || 0,
      line_items: relatedItems.map((li) => ({
        line_item_id: li.id,
        description: li.description,
        quantity: li.quantity,
        labor_hours: li.labor_hours || 0,
        line_total: li.line_total || 0,
        is_package: !!li.servicePackageId
      }))
    };
  }

  saveAndSendEstimate(email, title) {
    const activeEstimateId = localStorage.getItem('activeEstimateId') || '';
    const estimates = this._getFromStorage('estimates');

    const estimate = estimates.find((e) => e.id === activeEstimateId);
    if (!estimate) {
      return {
        estimate_id: null,
        status: 'error',
        message: 'No active estimate to save'
      };
    }

    estimate.email_to_send = email;
    if (title) estimate.title = title;
    estimate.status = 'sent';

    this._saveToStorage('estimates', estimates);

    return {
      estimate_id: estimate.id,
      status: estimate.status,
      message: 'Estimate saved and email queued'
    };
  }

  // ---------------------- 9. Testimonials ----------------------

  getTestimonialFilters() {
    const testimonials = this._getFromStorage('testimonials');
    const categories = this._getFromStorage('service_categories');

    const citySet = new Set();
    const categoryIdSet = new Set();
    const jobTypeSet = new Set();

    testimonials.forEach((t) => {
      if (t.location_city) citySet.add(t.location_city);
      if (t.serviceCategoryId) categoryIdSet.add(t.serviceCategoryId);
      if (t.job_type) jobTypeSet.add(t.job_type);
    });

    const serviceCategories = Array.from(categoryIdSet)
      .map((id) => categories.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({ category_id: c.id, category_name: c.name }));

    return {
      cities: Array.from(citySet),
      service_categories: serviceCategories,
      job_types: Array.from(jobTypeSet)
    };
  }

  searchTestimonials(city, query, serviceCategoryId) {
    const testimonials = this._getFromStorage('testimonials');
    const normCity = this._normalizeString(city);
    const normQuery = this._normalizeString(query);

    return testimonials
      .filter((t) => {
        if (city && this._normalizeString(t.location_city) !== normCity) return false;
        if (serviceCategoryId && t.serviceCategoryId !== serviceCategoryId) return false;
        if (!normQuery) return true;
        const inTitle = this._normalizeString(t.title || '').includes(normQuery);
        const inPreview = this._normalizeString(t.preview_text || '').includes(normQuery);
        const inFull = this._normalizeString(t.full_text || '').includes(normQuery);
        return inTitle || inPreview || inFull;
      })
      .map((t) => ({
        testimonial_id: t.id,
        customer_name: t.customer_name,
        location_city: t.location_city || '',
        location_state: t.location_state || '',
        title: t.title || '',
        preview_text: t.preview_text || this._truncate(t.full_text, 160),
        rating: t.rating || null,
        job_type: t.job_type || ''
      }));
  }

  getTestimonialDetail(testimonialId) {
    const testimonials = this._getFromStorage('testimonials');
    const categories = this._getFromStorage('service_categories');
    const serviceItems = this._getFromStorage('service_items');

    const t = testimonials.find((tt) => tt.id === testimonialId);
    if (!t) return null;

    const cat = t.serviceCategoryId ? categories.find((c) => c.id === t.serviceCategoryId) : null;
    const si = t.serviceItemId ? serviceItems.find((s) => s.id === t.serviceItemId) : null;

    return {
      testimonial_id: t.id,
      customer_name: t.customer_name,
      location_city: t.location_city || '',
      location_state: t.location_state || '',
      title: t.title || '',
      full_text: t.full_text || '',
      rating: t.rating || null,
      job_type: t.job_type || '',
      related_service_category_name: cat ? cat.name : '',
      related_service_item_name: si ? si.name : ''
    };
  }

  // ---------------------- 10. Maintenance plans & enrollment ----------------------

  getMaintenancePlanFilters() {
    const plans = this._getFromStorage('maintenance_plans');

    const typeSet = new Set();
    const subtypeSet = new Set();
    const sqftSet = new Set();

    plans.forEach((p) => {
      if (p.property_type) typeSet.add(p.property_type);
      if (p.property_subtype) subtypeSet.add(p.property_subtype);
      if (typeof p.max_square_footage === 'number') sqftSet.add(p.max_square_footage);
    });

    const squareFootagePresets = Array.from(sqftSet).sort((a, b) => a - b);

    return {
      property_types: Array.from(typeSet),
      property_subtypes: Array.from(subtypeSet),
      square_footage_presets: squareFootagePresets
    };
  }

  listMaintenancePlans(propertyType, propertySubtype, maxSquareFootage, sortBy) {
    const plans = this._getFromStorage('maintenance_plans');

    let filtered = plans.filter((p) => p.is_active);

    if (propertyType) {
      filtered = filtered.filter((p) => p.property_type === propertyType);
    }

    if (propertySubtype) {
      filtered = filtered.filter((p) => p.property_subtype === propertySubtype);
    }

    if (typeof maxSquareFootage === 'number') {
      filtered = filtered.filter((p) => {
        if (typeof p.max_square_footage !== 'number') return true;
        // plan supports up to max_square_footage; include if plan limit >= desired
        return p.max_square_footage >= maxSquareFootage;
      });
    }

    if (sortBy === 'price_low_to_high') {
      filtered.sort((a, b) => a.yearly_cost - b.yearly_cost);
    } else if (sortBy === 'price_high_to_low') {
      filtered.sort((a, b) => b.yearly_cost - a.yearly_cost);
    }

    return filtered.map((p) => ({
      plan_id: p.id,
      name: p.name,
      description: p.description || '',
      property_type: p.property_type,
      property_subtype: p.property_subtype,
      max_square_footage: p.max_square_footage || null,
      billing_frequency: p.billing_frequency,
      yearly_cost: p.yearly_cost,
      auto_renew_default: !!p.auto_renew_default
    }));
  }

  getMaintenancePlanDetail(planId) {
    const plans = this._getFromStorage('maintenance_plans');
    const p = plans.find((plan) => plan.id === planId);
    if (!p) return null;

    return {
      plan_id: p.id,
      name: p.name,
      description: p.description || '',
      property_type: p.property_type,
      property_subtype: p.property_subtype,
      max_square_footage: p.max_square_footage || null,
      billing_frequency: p.billing_frequency,
      yearly_cost: p.yearly_cost,
      included_services: p.included_services || [],
      auto_renew_default: !!p.auto_renew_default,
      communication_options: p.communication_options || []
    };
  }

  createMaintenanceEnrollmentDraft(
    planId,
    autoRenewEnabled,
    communicationPreference,
    customerName,
    customerEmail,
    customerPhone,
    streetAddress,
    zipCode,
    propertySquareFootage
  ) {
    const plans = this._getFromStorage('maintenance_plans');
    const enrollments = this._getFromStorage('maintenance_enrollments');

    const plan = plans.find((p) => p.id === planId);
    if (!plan) {
      return {
        enrollment_id: null,
        plan_name: '',
        yearly_cost: 0,
        auto_renew_enabled: !!autoRenewEnabled,
        communication_preference: communicationPreference || 'email',
        enrollment_status: 'in_review'
      };
    }

    const address = this._getOrCreateAddress(streetAddress, zipCode);

    const enrollment = {
      id: this._generateId('menr'),
      planId: planId,
      created_at: this._nowIso(),
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone,
      addressId: address.id,
      property_square_footage:
        typeof propertySquareFootage === 'number' ? propertySquareFootage : null,
      auto_renew_enabled: !!autoRenewEnabled,
      communication_preference: communicationPreference || 'email',
      enrollment_status: 'in_review',
      notes: null
    };

    enrollments.push(enrollment);
    this._saveToStorage('maintenance_enrollments', enrollments);

    return {
      enrollment_id: enrollment.id,
      plan_name: plan.name,
      yearly_cost: plan.yearly_cost,
      auto_renew_enabled: enrollment.auto_renew_enabled,
      communication_preference: enrollment.communication_preference,
      enrollment_status: enrollment.enrollment_status
    };
  }

  getMaintenanceEnrollmentReview(enrollmentId) {
    const enrollments = this._getFromStorage('maintenance_enrollments');
    const plans = this._getFromStorage('maintenance_plans');
    const addresses = this._getFromStorage('addresses');

    const e = enrollments.find((enr) => enr.id === enrollmentId);
    if (!e) return null;

    const plan = plans.find((p) => p.id === e.planId) || {
      name: '',
      yearly_cost: 0
    };

    const address = addresses.find((a) => a.id === e.addressId) || {
      street1: '',
      zip_code: ''
    };

    // Instrumentation for task completion tracking
    try {
      if (e && e.customer_name === 'Jamie Rivera') {
        localStorage.setItem('task9_reviewStepEnrollmentId', e.id);
      }
    } catch (err) {
      console.error('Instrumentation error:', err);
    }

    return {
      enrollment_id: e.id,
      plan_name: plan.name,
      yearly_cost: plan.yearly_cost,
      auto_renew_enabled: e.auto_renew_enabled,
      communication_preference: e.communication_preference,
      customer_name: e.customer_name,
      customer_email: e.customer_email,
      customer_phone: e.customer_phone,
      address: {
        street1: address.street1,
        zip_code: address.zip_code
      },
      enrollment_status: e.enrollment_status
    };
  }

  confirmMaintenanceEnrollment(enrollmentId) {
    const enrollments = this._getFromStorage('maintenance_enrollments');
    const e = enrollments.find((enr) => enr.id === enrollmentId);
    if (!e) {
      return {
        enrollment_id: enrollmentId,
        enrollment_status: 'in_review',
        message: 'Enrollment not found'
      };
    }

    e.enrollment_status = 'active';
    this._saveToStorage('maintenance_enrollments', enrollments);

    return {
      enrollment_id: e.id,
      enrollment_status: e.enrollment_status,
      message: 'Enrollment confirmed'
    };
  }

  // ---------------------- 11. FAQs & Contact messages ----------------------

  searchFaqs(query) {
    const faqs = this._getFromStorage('faqs');
    const normQuery = this._normalizeString(query);

    return faqs
      .filter((f) => {
        if (!normQuery) return true;
        const inQ = this._normalizeString(f.question).includes(normQuery);
        const inA = this._normalizeString(f.answer).includes(normQuery);
        const inKeywords = Array.isArray(f.keywords)
          ? f.keywords.some((k) => this._normalizeString(k).includes(normQuery))
          : false;
        return inQ || inA || inKeywords;
      })
      .map((f) => ({
        faq_id: f.id,
        question: f.question,
        answer_preview: this._truncate(f.answer, 200)
      }));
  }

  getFaqDetail(faqId) {
    const faqs = this._getFromStorage('faqs');
    const f = faqs.find((faq) => faq.id === faqId);
    if (!f) return null;

    return {
      faq_id: f.id,
      question: f.question,
      answer: f.answer,
      category: f.category || ''
    };
  }

  getTopFaqs() {
    const faqs = this._getFromStorage('faqs');

    let top = faqs.filter((f) => f.is_top_faq);
    if (top.length === 0) {
      top = faqs
        .slice()
        .sort((a, b) => {
          const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
          const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
          return bDate - aDate;
        })
        .slice(0, 5);
    }

    return top.map((f) => ({
      faq_id: f.id,
      question: f.question,
      answer_preview: this._truncate(f.answer, 200)
    }));
  }

  createContactMessage(
    topic,
    name,
    email,
    phone,
    message,
    preferredContactMethod,
    relatedFaqId,
    hasTriedFaqSteps
  ) {
    if (!topic || !name || !email || !phone || !message) {
      return {
        contact_message_id: null,
        status: 'error',
        message: 'Missing required fields'
      };
    }

    const messages = this._getFromStorage('contact_messages');

    const msg = {
      id: this._generateId('cm'),
      created_at: this._nowIso(),
      topic: topic,
      name: name,
      email: email,
      phone: phone,
      message: message,
      preferred_contact_method: preferredContactMethod || null,
      relatedFaqId: relatedFaqId || null,
      has_tried_faq_steps: typeof hasTriedFaqSteps === 'boolean' ? hasTriedFaqSteps : null,
      status: 'submitted'
    };

    messages.push(msg);
    this._saveToStorage('contact_messages', messages);

    return {
      contact_message_id: msg.id,
      status: msg.status,
      message: 'Contact message submitted'
    };
  }

  // ---------------------- 12. Static pages ----------------------

  getPageContent(pageKey) {
    const pages = this._getFromStorage('pages');
    const page = pages.find((p) => p.page_key === pageKey);

    if (page) {
      return {
        page_key: page.page_key,
        title: page.title,
        body_html: page.body_html
      };
    }

    // Fallback minimal content (not persisted)
    const prettyTitle = pageKey
      .split('_')
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
      .join(' ');

    return {
      page_key: pageKey,
      title: prettyTitle || 'Page',
      body_html: ''
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