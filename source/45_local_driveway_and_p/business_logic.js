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
    const keys = [
      'services',
      'service_packages',
      'bookings',
      'quote_requests',
      'promotions',
      'projects',
      'favorite_projects',
      'zip_areas',
      'service_areas',
      'service_area_inquiries',
      'crews',
      'crew_reviews',
      'estimate_requests',
      'contact_messages',
      'static_content'
    ];

    keys.forEach((key) => {
      if (!localStorage.getItem(key)) {
        // arrays by default; static_content will be overwritten below
        localStorage.setItem(key, JSON.stringify([]));
      }
    });

    // static_content should be an object map
    const staticContentRaw = localStorage.getItem('static_content');
    if (!staticContentRaw || staticContentRaw === '[]') {
      localStorage.setItem('static_content', JSON.stringify({}));
    }

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

  _toTitleCaseFromSnake(value) {
    if (!value || typeof value !== 'string') return '';
    return value
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }

  _formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) return '';
    try {
      if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          maximumFractionDigits: 0
        }).format(amount);
      }
    } catch (e) {}
    return '$' + Math.round(amount);
  }

  _todayISODate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  _addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  _dateToISODate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  _parseDateOnly(dateStr) {
    // dateStr expected in ISO date (YYYY-MM-DD) or full ISO
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return this._dateToISODate(d);
  }

  _getOrCreateCurrentBooking() {
    let bookings = this._getFromStorage('bookings');
    const currentId = localStorage.getItem('current_booking_id');
    let booking = null;

    if (currentId) {
      booking = bookings.find((b) => b.id === currentId) || null;
    }

    if (!booking) {
      booking = {
        id: this._generateId('booking'),
        service_id: null,
        service_package_id: null,
        service_type: null,
        driveway_size_sq_ft: null,
        size_unit: null,
        driveway_length_ft: null,
        driveway_category: null,
        material_option: null,
        scheduled_date: null,
        time_slot_start: null,
        time_slot_end: null,
        payment_method: null,
        billing_option: null,
        contact_name: '',
        contact_phone: '',
        contact_email: '',
        applied_promo_code: null,
        promo_discount_percent: null,
        subtotal_price: null,
        discount_amount: null,
        total_price: null,
        status: 'draft',
        source_page: null,
        created_at: new Date().toISOString()
      };
      bookings.push(booking);
      this._saveToStorage('bookings', bookings);
      localStorage.setItem('current_booking_id', booking.id);
    }

    return booking;
  }

  _recalculateBookingPricing(booking) {
    if (!booking) return null;

    const servicePackages = this._getFromStorage('service_packages');
    const promotions = this._getFromStorage('promotions');

    let pkg = null;
    if (booking.service_package_id) {
      pkg = servicePackages.find((p) => p.id === booking.service_package_id) || null;
    }

    // Fallback: if no explicit package is selected, choose a sensible default
    if (!pkg && booking.service_id) {
      let candidates = servicePackages.filter(
        (p) => p.service_id === booking.service_id && p.is_active
      );

      // Prefer packages that match the project size when available
      if (
        typeof booking.driveway_size_sq_ft === 'number' &&
        !isNaN(booking.driveway_size_sq_ft)
      ) {
        const size = booking.driveway_size_sq_ft;
        const sizedCandidates = candidates.filter((p) => {
          const min =
            typeof p.recommended_min_size_sq_ft === 'number'
              ? p.recommended_min_size_sq_ft
              : -Infinity;
          const max =
            typeof p.recommended_max_size_sq_ft === 'number'
              ? p.recommended_max_size_sq_ft
              : Infinity;
          return size >= min && size <= max;
        });
        if (sizedCandidates.length) {
          candidates = sizedCandidates;
        }
      }

      if (candidates.length) {
        pkg = candidates.reduce((best, p) => {
          const price = typeof p.base_price === 'number' ? p.base_price : Infinity;
          const bestPrice =
            best && typeof best.base_price === 'number' ? best.base_price : Infinity;
          return price < bestPrice ? p : best;
        }, null);

        // Only set the package if one was not already chosen
        if (pkg && !booking.service_package_id) {
          booking.service_package_id = pkg.id;
        }
      }
    }

    let subtotal = 0;
    if (pkg && typeof pkg.base_price === 'number') {
      subtotal = pkg.base_price;
    } else if (typeof booking.subtotal_price === 'number') {
      subtotal = booking.subtotal_price;
    } else {
      subtotal = 0;
    }

    booking.subtotal_price = subtotal;

    let promo = null;
    if (booking.applied_promo_code) {
      const codeLower = String(booking.applied_promo_code).trim().toLowerCase();
      promo = promotions.find(
        (p) => p.code && String(p.code).trim().toLowerCase() === codeLower
      ) || null;
    }

    if (promo) {
      booking = this._applyPromotionToBooking(booking, promo).booking;
    } else {
      booking.promo_discount_percent = null;
      booking.discount_amount = 0;
      booking.total_price = subtotal;
    }

    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
      this._saveToStorage('bookings', bookings);
    }

    return booking;
  }

  _applyPromotionToBooking(booking, promotion) {
    const result = {
      booking,
      success: false,
      message: ''
    };

    if (!booking || !promotion) {
      result.message = 'Missing booking or promotion';
      return result;
    }

    if (!promotion.is_active) {
      booking.applied_promo_code = null;
      booking.promo_discount_percent = null;
      booking.discount_amount = 0;
      booking.total_price = booking.subtotal_price || 0;
      result.message = 'Promotion is not active';
      return result;
    }

    const now = new Date();
    if (promotion.start_date) {
      const start = new Date(promotion.start_date);
      if (now < start) {
        booking.applied_promo_code = null;
        booking.promo_discount_percent = null;
        booking.discount_amount = 0;
        booking.total_price = booking.subtotal_price || 0;
        result.message = 'Promotion has not started yet';
        return result;
      }
    }
    if (promotion.end_date) {
      const end = new Date(promotion.end_date);
      if (now > end) {
        booking.applied_promo_code = null;
        booking.promo_discount_percent = null;
        booking.discount_amount = 0;
        booking.total_price = booking.subtotal_price || 0;
        result.message = 'Promotion has expired';
        return result;
      }
    }

    if (promotion.eligible_service_types && promotion.eligible_service_types.length) {
      if (!booking.service_type || !promotion.eligible_service_types.includes(booking.service_type)) {
        booking.applied_promo_code = null;
        booking.promo_discount_percent = null;
        booking.discount_amount = 0;
        booking.total_price = booking.subtotal_price || 0;
        result.message = 'Promotion not applicable to this service type';
        return result;
      }
    }

    if (
      typeof promotion.min_project_size_sq_ft === 'number' &&
      promotion.min_project_size_sq_ft > 0
    ) {
      const size = typeof booking.driveway_size_sq_ft === 'number'
        ? booking.driveway_size_sq_ft
        : 0;
      if (size < promotion.min_project_size_sq_ft) {
        booking.applied_promo_code = null;
        booking.promo_discount_percent = null;
        booking.discount_amount = 0;
        booking.total_price = booking.subtotal_price || 0;
        result.message = 'Project size does not meet promotion minimum';
        return result;
      }
    }

    const subtotal = booking.subtotal_price || 0;
    if (
      typeof promotion.min_order_price === 'number' &&
      promotion.min_order_price > 0 &&
      subtotal < promotion.min_order_price
    ) {
      booking.applied_promo_code = null;
      booking.promo_discount_percent = null;
      booking.discount_amount = 0;
      booking.total_price = subtotal;
      result.message = 'Subtotal does not meet promotion minimum order price';
      return result;
    }

    let discountAmount = 0;
    let discountPercent = null;

    if (promotion.discount_type === 'percent') {
      discountPercent = typeof promotion.discount_percent === 'number'
        ? promotion.discount_percent
        : 0;
      discountAmount = subtotal * (discountPercent / 100);
    } else if (promotion.discount_type === 'fixed_amount') {
      discountAmount = typeof promotion.discount_amount === 'number'
        ? promotion.discount_amount
        : 0;
      discountPercent = null;
    }

    if (discountAmount < 0) discountAmount = 0;
    const total = Math.max(0, subtotal - discountAmount);

    booking.applied_promo_code = promotion.code;
    booking.promo_discount_percent = discountPercent;
    booking.discount_amount = discountAmount;
    booking.total_price = total;

    result.success = true;
    result.message = 'Promotion applied';
    result.booking = booking;
    return result;
  }

  _getOrCreateFavoriteProjectsRecord() {
    let records = this._getFromStorage('favorite_projects');
    let record = records.find((r) => r.id === 'default') || null;

    if (!record) {
      record = {
        id: 'default',
        project_ids: [],
        updated_at: new Date().toISOString()
      };
      records.push(record);
      this._saveToStorage('favorite_projects', records);
    }

    return record;
  }

  _findNearestServedZip(zipCode, zipAreas) {
    if (!zipCode || !zipAreas || !zipAreas.length) return null;
    const searchNum = parseInt(zipCode, 10);
    if (isNaN(searchNum)) return null;

    let nearest = null;
    let bestDiff = Infinity;

    zipAreas.forEach((z) => {
      if (!z.is_served) return;
      const zNum = parseInt(z.zip_code, 10);
      if (isNaN(zNum)) return;
      const diff = Math.abs(zNum - searchNum);
      if (diff < bestDiff) {
        bestDiff = diff;
        nearest = z;
      }
    });

    return nearest;
  }

  _loadStaticPageContent(pageKey) {
    const raw = localStorage.getItem('static_content');
    let all = {};
    if (raw) {
      try {
        all = JSON.parse(raw) || {};
      } catch (e) {
        all = {};
      }
    }
    if (!all || typeof all !== 'object') all = {};

    if (!all[pageKey]) {
      all[pageKey] = {};
      localStorage.setItem('static_content', JSON.stringify(all));
    }

    return all[pageKey] || {};
  }

  // Interface: getHomePageSummary
  getHomePageSummary() {
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    const promotions = this._getFromStorage('promotions').filter((p) => p.is_active);
    const projects = this._getFromStorage('projects');
    const crews = this._getFromStorage('crews').filter((c) => c.is_active);

    const featuredServices = services
      .slice()
      .sort((a, b) => {
        const ao = typeof a.sort_order === 'number' ? a.sort_order : 0;
        const bo = typeof b.sort_order === 'number' ? b.sort_order : 0;
        return ao - bo;
      })
      .slice(0, 3)
      .map((service) => {
        let primaryCtaLabel = 'Get a Quote';
        if (service.category === 'installation' || service.category === 'replacement') {
          primaryCtaLabel = 'Book Now';
        }
        return {
          service,
          category_label: this._toTitleCaseFromSnake(service.category),
          service_type_label: this._toTitleCaseFromSnake(service.service_type),
          primary_cta_label: primaryCtaLabel
        };
      });

    const featuredPromotions = promotions;

    const featuredProjects = projects.filter((p) => p.is_featured);

    const topRatedCrews = crews
      .slice()
      .sort((a, b) => {
        if (b.overall_rating !== a.overall_rating) {
          return b.overall_rating - a.overall_rating;
        }
        return b.review_count - a.review_count;
      })
      .slice(0, 3)
      .map((crew) => {
        const rating = typeof crew.overall_rating === 'number' ? crew.overall_rating : 0;
        const count = typeof crew.review_count === 'number' ? crew.review_count : 0;
        const ratingLabel = rating.toFixed(1) + ' stars (' + count + ' reviews)';
        return { crew, rating_label: ratingLabel };
      });

    return {
      featured_services: featuredServices,
      featured_promotions: featuredPromotions,
      featured_projects: featuredProjects,
      top_rated_crews: topRatedCrews
    };
  }

  // Interface: getAllServicesOverview
  getAllServicesOverview() {
    const services = this._getFromStorage('services').filter((s) => s.is_active);
    const packages = this._getFromStorage('service_packages').filter((p) => p.is_active);

    return services.map((service) => {
      const relatedPackages = packages.filter((p) => p.service_id === service.id);
      let startingFromPrice = null;
      let maxWarranty = typeof service.default_warranty_years === 'number'
        ? service.default_warranty_years
        : null;

      relatedPackages.forEach((p) => {
        if (typeof p.base_price === 'number') {
          if (startingFromPrice === null || p.base_price < startingFromPrice) {
            startingFromPrice = p.base_price;
          }
        }
        if (typeof p.warranty_years === 'number') {
          if (maxWarranty === null || p.warranty_years > maxWarranty) {
            maxWarranty = p.warranty_years;
          }
        }
      });

      return {
        service,
        category_label: this._toTitleCaseFromSnake(service.category),
        service_type_label: this._toTitleCaseFromSnake(service.service_type),
        starting_from_price: startingFromPrice,
        max_warranty_years: maxWarranty
      };
    });
  }

  // Interface: getServiceDetailWithPackages
  getServiceDetailWithPackages(serviceId) {
    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');

    const service = services.find((s) => s.id === serviceId) || null;
    const relatedPackages = packages.filter(
      (p) => p.service_id === serviceId && p.is_active
    );

    const mappedPackages = relatedPackages.map((pkg) => {
      const supportedCategories = Array.isArray(pkg.supported_driveway_categories)
        ? pkg.supported_driveway_categories
        : [];
      const supportedCategoryLabels = supportedCategories.map((c) => {
        if (c === 'single_car') return 'Single-car driveway';
        if (c === 'two_car') return '2-car driveway';
        if (c === 'three_car') return '3-car driveway';
        if (c === 'other') return 'Other driveway size';
        return this._toTitleCaseFromSnake(c);
      });

      let includesCrackLabel = '';
      if (pkg.includes_crack_filling === true) {
        includesCrackLabel = 'Includes crack filling';
      } else if (pkg.includes_crack_filling === false) {
        includesCrackLabel = 'Does not include crack filling';
      }

      let warrantyLabel = '';
      if (typeof pkg.warranty_years === 'number') {
        if (pkg.warranty_years === 0) {
          warrantyLabel = 'No warranty';
        } else if (pkg.warranty_years === 1) {
          warrantyLabel = '1-year warranty';
        } else {
          warrantyLabel = pkg.warranty_years + '-year warranty';
        }
      }

      let sizeLabel = '';
      const min = pkg.recommended_min_size_sq_ft;
      const max = pkg.recommended_max_size_sq_ft;
      if (typeof min === 'number' && typeof max === 'number') {
        sizeLabel = 'Ideal for ' + min + '' + max + ' sq ft driveways';
      } else if (typeof min === 'number') {
        sizeLabel = 'Best for ' + min + '+ sq ft driveways';
      } else if (typeof max === 'number') {
        sizeLabel = 'Up to ' + max + ' sq ft driveways';
      }

      return {
        package: pkg,
        package_type_label: this._toTitleCaseFromSnake(pkg.package_type),
        supported_driveway_category_labels: supportedCategoryLabels,
        includes_crack_filling_label: includesCrackLabel,
        warranty_label: warrantyLabel,
        price_label: this._formatCurrency(pkg.base_price),
        size_suitability_label: sizeLabel
      };
    });

    return {
      service,
      packages: mappedPackages
    };
  }

  // Interface: startBookingForService
  startBookingForService(serviceId, sourcePage) {
    const services = this._getFromStorage('services');
    const service = services.find((s) => s.id === serviceId) || null;

    let booking = this._getOrCreateCurrentBooking();

    booking.service_id = service ? service.id : serviceId;
    booking.service_package_id = null;
    booking.service_type = service ? service.service_type : booking.service_type;
    booking.driveway_size_sq_ft = null;
    booking.size_unit = null;
    booking.driveway_length_ft = null;
    booking.driveway_category = null;
    booking.material_option = null;
    booking.scheduled_date = null;
    booking.time_slot_start = null;
    booking.time_slot_end = null;
    booking.payment_method = null;
    booking.billing_option = null;
    booking.applied_promo_code = null;
    booking.promo_discount_percent = null;
    booking.subtotal_price = null;
    booking.discount_amount = null;
    booking.total_price = null;
    booking.status = 'draft';
    booking.source_page = sourcePage || booking.source_page || 'home_page';

    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
      this._saveToStorage('bookings', bookings);
    }

    localStorage.setItem('current_booking_id', booking.id);

    return {
      booking,
      service
    };
  }

  // Interface: startBookingFromServicePackage
  startBookingFromServicePackage(serviceId, servicePackageId, sourcePage) {
    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');

    const service = services.find((s) => s.id === serviceId) || null;
    const pkg = packages.find((p) => p.id === servicePackageId) || null;

    let booking = this._getOrCreateCurrentBooking();

    booking.service_id = service ? service.id : serviceId;
    booking.service_package_id = pkg ? pkg.id : servicePackageId;
    booking.service_type = service ? service.service_type : booking.service_type;
    booking.source_page = sourcePage || 'service_page';
    booking.status = 'draft';

    booking = this._recalculateBookingPricing(booking) || booking;

    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
      this._saveToStorage('bookings', bookings);
    }

    localStorage.setItem('current_booking_id', booking.id);

    return {
      booking,
      service,
      package: pkg
    };
  }

  // Interface: getBookingFormOptions
  getBookingFormOptions(serviceId, servicePackageId) {
    let billingOptions = ['one_time'];
    let paymentMethods = ['credit_debit_card', 'cash_on_site', 'bank_transfer', 'online_wallet'];

    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');
    const service = services.find((s) => s.id === serviceId) || null;
    const pkg = packages.find((p) => p.id === servicePackageId) || null;

    const serviceType = service ? service.service_type : null;
    const packageType = pkg ? pkg.package_type : null;

    if (serviceType === 'snow_removal' || packageType === 'seasonal_plan') {
      billingOptions = ['per_season', 'per_visit', 'monthly'];
    }

    const today = this._todayISODate();
    const latest = this._addDays(today, 60);

    return {
      size_unit_options: ['square_feet', 'feet'],
      driveway_category_options: ['single_car', 'two_car', 'three_car', 'other'],
      payment_method_options: paymentMethods,
      billing_option_options: billingOptions,
      material_option_options: ['standard', 'premium', 'economy'],
      scheduling_constraints: {
        earliest_date: today,
        latest_date: latest,
        allowed_days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        time_slot_labels: ['09:00-11:00', '11:00-13:00', '13:00-15:00', '15:00-17:00']
      }
    };
  }

  // Interface: getServiceAvailability
  getServiceAvailability(serviceType, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return [];
    }

    const bookings = this._getFromStorage('bookings').filter(
      (b) => b.service_type === serviceType && b.scheduled_date
    );

    const results = [];
    const dayMillis = 24 * 60 * 60 * 1000;

    for (let t = start.getTime(); t <= end.getTime(); t += dayMillis) {
      const dayDate = new Date(t);
      const dateStr = this._dateToISODate(dayDate);
      const dayOfWeek = dayDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const slotTemplates = [
        { start: '09:00', end: '11:00' },
        { start: '11:00', end: '13:00' },
        { start: '13:00', end: '15:00' },
        { start: '15:00', end: '17:00' }
      ];

      const timeSlots = slotTemplates.map((slot) => {
        const isBooked = bookings.some((b) => {
          const bd = this._parseDateOnly(b.scheduled_date);
          return (
            bd === dateStr &&
            b.time_slot_start === slot.start &&
            b.time_slot_end === slot.end &&
            (b.status === 'pending_review' || b.status === 'confirmed')
          );
        });

        return {
          start: slot.start,
          end: slot.end,
          is_available: !isBooked
        };
      });

      results.push({
        date: dateStr,
        is_weekday: !isWeekend,
        is_weekend: isWeekend,
        time_slots: timeSlots
      });
    }

    return results;
  }

  // Interface: getCurrentBooking
  getCurrentBooking() {
    const booking = this._getOrCreateCurrentBooking();
    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');
    const promotions = this._getFromStorage('promotions');

    const service = booking.service_id
      ? services.find((s) => s.id === booking.service_id) || null
      : null;
    const pkg = booking.service_package_id
      ? packages.find((p) => p.id === booking.service_package_id) || null
      : null;

    const promo = booking.applied_promo_code
      ? promotions.find(
          (p) =>
            p.code &&
            String(p.code).trim().toLowerCase() ===
              String(booking.applied_promo_code).trim().toLowerCase()
        ) || null
      : null;

    return {
      booking,
      service,
      package: pkg,
      applied_promotion: promo
    };
  }

  // Interface: updateCurrentBookingDetails
  updateCurrentBookingDetails(updates) {
    let booking = this._getOrCreateCurrentBooking();

    if (updates) {
      if (Object.prototype.hasOwnProperty.call(updates, 'drivewaySizeSqFt')) {
        booking.driveway_size_sq_ft = updates.drivewaySizeSqFt;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'sizeUnit')) {
        booking.size_unit = updates.sizeUnit;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'drivewayLengthFt')) {
        booking.driveway_length_ft = updates.drivewayLengthFt;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'drivewayCategory')) {
        booking.driveway_category = updates.drivewayCategory;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'materialOption')) {
        booking.material_option = updates.materialOption;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'scheduledDate')) {
        booking.scheduled_date = updates.scheduledDate
          ? new Date(updates.scheduledDate).toISOString()
          : null;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'timeSlotStart')) {
        booking.time_slot_start = updates.timeSlotStart;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'timeSlotEnd')) {
        booking.time_slot_end = updates.timeSlotEnd;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'paymentMethod')) {
        booking.payment_method = updates.paymentMethod;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'billingOption')) {
        booking.billing_option = updates.billingOption;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'contactName')) {
        booking.contact_name = updates.contactName;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'contactPhone')) {
        booking.contact_phone = updates.contactPhone;
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'contactEmail')) {
        booking.contact_email = updates.contactEmail;
      }
    }

    booking = this._recalculateBookingPricing(booking) || booking;

    return {
      booking,
      message: 'Booking updated'
    };
  }

  // Interface: getBookingReviewSummary
  getBookingReviewSummary() {
    const booking = this._getOrCreateCurrentBooking();
    const services = this._getFromStorage('services');
    const packages = this._getFromStorage('service_packages');

    const service = booking.service_id
      ? services.find((s) => s.id === booking.service_id) || null
      : null;
    const pkg = booking.service_package_id
      ? packages.find((p) => p.id === booking.service_package_id) || null
      : null;

    const updatedBooking = this._recalculateBookingPricing(booking) || booking;

    const pricingBreakdown = {
      subtotal_price: updatedBooking.subtotal_price || 0,
      promo_code: updatedBooking.applied_promo_code || null,
      promo_discount_percent: updatedBooking.promo_discount_percent || null,
      discount_amount: updatedBooking.discount_amount || 0,
      total_price: updatedBooking.total_price || updatedBooking.subtotal_price || 0
    };

    return {
      booking: updatedBooking,
      service,
      package: pkg,
      pricing_breakdown: pricingBreakdown
    };
  }

  // Interface: applyPromoCodeToCurrentBooking
  applyPromoCodeToCurrentBooking(promoCode) {
    const codeInput = promoCode ? String(promoCode).trim() : '';
    if (!codeInput) {
      return {
        success: false,
        booking: this._getOrCreateCurrentBooking(),
        promotion: null,
        message: 'Promo code is required'
      };
    }

    const promotions = this._getFromStorage('promotions');
    const promo = promotions.find(
      (p) => p.code && String(p.code).trim().toLowerCase() === codeInput.toLowerCase()
    );

    let booking = this._getOrCreateCurrentBooking();

    if (!promo) {
      booking.applied_promo_code = null;
      booking.promo_discount_percent = null;
      booking.discount_amount = 0;
      booking.total_price = booking.subtotal_price || 0;
      this._recalculateBookingPricing(booking);
      return {
        success: false,
        booking,
        promotion: null,
        message: 'Promo code not found'
      };
    }

    booking.subtotal_price = booking.subtotal_price || 0;
    const application = this._applyPromotionToBooking(booking, promo);
    booking = application.booking;

    this._recalculateBookingPricing(booking);

    return {
      success: application.success,
      booking,
      promotion: application.success ? promo : null,
      message: application.message
    };
  }

  // Interface: finalizeCurrentBooking
  finalizeCurrentBooking() {
    let booking = this._getOrCreateCurrentBooking();

    if (!booking.contact_name || !booking.contact_phone || !booking.contact_email) {
      return {
        success: false,
        booking,
        message: 'Contact information is required to finalize the booking'
      };
    }

    booking = this._recalculateBookingPricing(booking) || booking;

    booking.status = 'pending_review';

    const bookings = this._getFromStorage('bookings');
    const idx = bookings.findIndex((b) => b.id === booking.id);
    if (idx !== -1) {
      bookings[idx] = booking;
      this._saveToStorage('bookings', bookings);
    }

    localStorage.removeItem('current_booking_id');

    return {
      success: true,
      booking,
      message: 'Booking submitted for review'
    };
  }

  // Interface: getQuoteFormOptions
  getQuoteFormOptions() {
    const today = this._todayISODate();
    const latest = this._addDays(today, 30);

    return {
      service_type_options: [
        'asphalt_resurfacing',
        'asphalt_driveway_replacement',
        'concrete_driveways',
        'driveway_sealing',
        'snow_removal',
        'general_driveway_paving',
        'asphalt_driveway',
        'paver_driveway'
      ],
      material_option_options: ['standard', 'premium', 'economy'],
      size_unit_options: ['square_feet', 'feet'],
      scheduling_constraints: {
        earliest_date: today,
        latest_date: latest,
        allowed_days_of_week: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        default_time_windows: [
          { label: 'Morning (911)', start: '09:00', end: '11:00' },
          { label: 'Midday (1113)', start: '11:00', end: '13:00' },
          { label: 'Afternoon (1315)', start: '13:00', end: '15:00' },
          { label: 'Late Afternoon (1517)', start: '15:00', end: '17:00' }
        ]
      }
    };
  }

  // Interface: getQuotePrefillContext
  getQuotePrefillContext(promoCode, crewId) {
    let suggestedServiceType = null;
    let appliedPromotion = null;
    let crew = null;

    if (promoCode) {
      appliedPromotion = this.getPromotionDetails(promoCode, null);
      if (appliedPromotion && Array.isArray(appliedPromotion.eligible_service_types)) {
        if (appliedPromotion.eligible_service_types.length === 1) {
          suggestedServiceType = appliedPromotion.eligible_service_types[0];
        }
      }
    }

    if (crewId) {
      const crews = this._getFromStorage('crews');
      crew = crews.find((c) => c.id === crewId) || null;
      if (!suggestedServiceType && crew && Array.isArray(crew.service_types)) {
        if (crew.service_types.length === 1) {
          suggestedServiceType = crew.service_types[0];
        }
      }
    }

    return {
      suggested_service_type: suggestedServiceType,
      applied_promotion: appliedPromotion || null,
      crew: crew || null
    };
  }

  // Interface: submitQuoteRequest
  submitQuoteRequest(
    serviceType,
    drivewaySizeSqFt,
    sizeUnit,
    materialOption,
    preferredDate,
    preferredTimeWindowStart,
    preferredTimeWindowEnd,
    contactName,
    contactPhone,
    contactEmail,
    promoCode,
    crewId,
    sourcePage
  ) {
    const quoteRequests = this._getFromStorage('quote_requests');

    const record = {
      id: this._generateId('quote'),
      service_type: serviceType,
      driveway_size_sq_ft: typeof drivewaySizeSqFt === 'number' ? drivewaySizeSqFt : null,
      size_unit: sizeUnit || null,
      material_option: materialOption || null,
      preferred_date: preferredDate ? new Date(preferredDate).toISOString() : null,
      preferred_time_window_start: preferredTimeWindowStart || null,
      preferred_time_window_end: preferredTimeWindowEnd || null,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      promo_code: promoCode || null,
      crew_id: crewId || null,
      source_page: sourcePage || 'quote_page',
      created_at: new Date().toISOString()
    };

    quoteRequests.push(record);
    this._saveToStorage('quote_requests', quoteRequests);

    return {
      success: true,
      quoteRequest: record,
      message: 'Quote request submitted'
    };
  }

  // Interface: getActivePromotions
  getActivePromotions(filters) {
    const promotions = this._getFromStorage('promotions');
    const f = filters || {};

    return promotions.filter((p) => {
      if (f.onlyActive !== false && !p.is_active) return false;

      if (typeof f.minDiscountPercent === 'number') {
        if (p.discount_type !== 'percent') return false;
        if (typeof p.discount_percent !== 'number') return false;
        if (p.discount_percent < f.minDiscountPercent) return false;
      }

      if (typeof f.maxMinProjectSizeSqFt === 'number') {
        const minSize = typeof p.min_project_size_sq_ft === 'number'
          ? p.min_project_size_sq_ft
          : 0;
        if (minSize > f.maxMinProjectSizeSqFt) return false;
      }

      if (f.serviceType) {
        if (
          Array.isArray(p.eligible_service_types) &&
          p.eligible_service_types.length > 0 &&
          !p.eligible_service_types.includes(f.serviceType)
        ) {
          return false;
        }
      }

      return true;
    });
  }

  // Interface: getPromotionDetails
  getPromotionDetails(promoCode, promotionId) {
    const promotions = this._getFromStorage('promotions');

    if (promotionId) {
      return promotions.find((p) => p.id === promotionId) || null;
    }

    if (promoCode) {
      const codeLower = String(promoCode).trim().toLowerCase();
      return (
        promotions.find(
          (p) => p.code && String(p.code).trim().toLowerCase() === codeLower
        ) || null
      );
    }

    return null;
  }

  // Interface: getProjectFilterOptions
  getProjectFilterOptions() {
    const projects = this._getFromStorage('projects');
    let minSize = 0;
    let maxSize = 0;
    let earliest = null;
    let latest = null;

    if (projects.length) {
      projects.forEach((p, idx) => {
        if (typeof p.size_sq_ft === 'number') {
          if (idx === 0 || p.size_sq_ft < minSize) minSize = p.size_sq_ft;
          if (idx === 0 || p.size_sq_ft > maxSize) maxSize = p.size_sq_ft;
        }
        if (p.completion_date) {
          const dStr = this._parseDateOnly(p.completion_date);
          if (dStr) {
            if (!earliest || dStr < earliest) earliest = dStr;
            if (!latest || dStr > latest) latest = dStr;
          }
        }
      });
    }

    return {
      surface_type_options: ['asphalt', 'concrete', 'paver', 'gravel', 'other'],
      size_range_defaults: {
        min_size_sq_ft: minSize,
        max_size_sq_ft: maxSize
      },
      completion_date_range_defaults: {
        earliest_completion_date: earliest,
        latest_completion_date: latest
      }
    };
  }

  // Interface: getProjects
  getProjects(filters) {
    const projects = this._getFromStorage('projects');
    const f = filters || {};

    return projects.filter((p) => {
      if (f.surfaceType && p.surface_type !== f.surfaceType) return false;

      if (typeof f.minSizeSqFt === 'number') {
        if (typeof p.size_sq_ft !== 'number' || p.size_sq_ft < f.minSizeSqFt) return false;
      }

      if (typeof f.maxSizeSqFt === 'number') {
        if (typeof p.size_sq_ft !== 'number' || p.size_sq_ft > f.maxSizeSqFt) return false;
      }

      if (f.completedAfter) {
        const projectDate = new Date(p.completion_date);
        const after = new Date(f.completedAfter);
        if (isNaN(projectDate.getTime()) || projectDate < after) return false;
      }

      if (f.completedBefore) {
        const projectDate = new Date(p.completion_date);
        const before = new Date(f.completedBefore);
        if (isNaN(projectDate.getTime()) || projectDate > before) return false;
      }

      if (f.isFeaturedOnly && !p.is_featured) return false;

      return true;
    });
  }

  // Interface: getProjectDetail
  getProjectDetail(projectId) {
    const projects = this._getFromStorage('projects');
    const project = projects.find((p) => p.id === projectId) || null;

    let surfaceLabel = '';
    let sizeLabel = '';
    let completionLabel = '';

    if (project) {
      surfaceLabel = this._toTitleCaseFromSnake(project.surface_type);
      sizeLabel = typeof project.size_sq_ft === 'number'
        ? project.size_sq_ft + ' sq ft'
        : '';

      if (project.completion_date) {
        const d = new Date(project.completion_date);
        if (!isNaN(d.getTime())) {
          completionLabel = this._dateToISODate(d);
        }
      }
    }

    const favoriteRecord = this._getOrCreateFavoriteProjectsRecord();
    const isFavorited = project ? favoriteRecord.project_ids.includes(project.id) : false;

    return {
      project,
      surface_type_label: surfaceLabel,
      size_label: sizeLabel,
      completion_date_label: completionLabel,
      is_favorited: isFavorited
    };
  }

  // Interface: addProjectToFavorites
  addProjectToFavorites(projectId) {
    const record = this._getOrCreateFavoriteProjectsRecord();

    if (!record.project_ids.includes(projectId)) {
      record.project_ids.push(projectId);
      record.updated_at = new Date().toISOString();

      const records = this._getFromStorage('favorite_projects');
      const idx = records.findIndex((r) => r.id === record.id);
      if (idx !== -1) {
        records[idx] = record;
        this._saveToStorage('favorite_projects', records);
      }
    }

    return {
      favoriteProjects: record,
      message: 'Project added to favorites'
    };
  }

  // Interface: removeProjectFromFavorites
  removeProjectFromFavorites(projectId) {
    const record = this._getOrCreateFavoriteProjectsRecord();
    const idxId = record.project_ids.indexOf(projectId);

    if (idxId !== -1) {
      record.project_ids.splice(idxId, 1);
      record.updated_at = new Date().toISOString();

      const records = this._getFromStorage('favorite_projects');
      const idx = records.findIndex((r) => r.id === record.id);
      if (idx !== -1) {
        records[idx] = record;
        this._saveToStorage('favorite_projects', records);
      }
    }

    return {
      favoriteProjects: record,
      message: 'Project removed from favorites'
    };
  }

  // Interface: getFavoriteProjects
  getFavoriteProjects() {
    const record = this._getOrCreateFavoriteProjectsRecord();
    const projects = this._getFromStorage('projects');

    const projectMap = {};
    projects.forEach((p) => {
      projectMap[p.id] = p;
    });

    const selected = record.project_ids.map((id) => projectMap[id]).filter((p) => !!p);

    return {
      favoriteProjects: record,
      projects: selected
    };
  }

  // Interface: getServiceAreaPageSummary
  getServiceAreaPageSummary() {
    const serviceAreas = this._getFromStorage('service_areas');
    const zipAreas = this._getFromStorage('zip_areas');

    const servedZipAreas = zipAreas.filter((z) => z.is_served);

    return {
      service_areas: serviceAreas,
      served_zip_areas: servedZipAreas
    };
  }

  // Interface: checkZipCoverage
  checkZipCoverage(zipCode) {
    const zipAreas = this._getFromStorage('zip_areas');
    const serviceAreas = this._getFromStorage('service_areas');

    const zipArea = zipAreas.find((z) => z.zip_code === zipCode) || null;
    const isServed = zipArea ? !!zipArea.is_served : false;

    let nearestServed = null;
    let nearestServiceArea = null;

    if (isServed) {
      nearestServed = zipArea;
      if (zipArea.service_area_id) {
        nearestServiceArea = serviceAreas.find(
          (s) => s.id === zipArea.service_area_id
        ) || null;
      } else {
        nearestServiceArea = serviceAreas.find((s) => {
          return Array.isArray(s.covered_zip_codes) &&
            s.covered_zip_codes.includes(zipArea.zip_code);
        }) || null;
      }
    } else {
      nearestServed = this._findNearestServedZip(zipCode, zipAreas);
      if (nearestServed && nearestServed.service_area_id) {
        nearestServiceArea = serviceAreas.find(
          (s) => s.id === nearestServed.service_area_id
        ) || null;
      } else if (nearestServed) {
        nearestServiceArea = serviceAreas.find((s) => {
          return Array.isArray(s.covered_zip_codes) &&
            s.covered_zip_codes.includes(nearestServed.zip_code);
        }) || null;
      }
    }

    let allNearby = [];
    if (nearestServiceArea) {
      allNearby = zipAreas.filter((z) => {
        if (!z.is_served) return false;
        if (z.service_area_id && z.service_area_id === nearestServiceArea.id) return true;
        if (
          Array.isArray(nearestServiceArea.covered_zip_codes) &&
          nearestServiceArea.covered_zip_codes.includes(z.zip_code)
        ) return true;
        return false;
      });
    }

    return {
      searched_zip: zipCode,
      zip_area: zipArea,
      is_served: isServed,
      nearest_served_zip_area: nearestServed,
      nearest_service_area: nearestServiceArea,
      all_nearby_served_zip_areas: allNearby
    };
  }

  // Interface: getServiceAreaDetail
  getServiceAreaDetail(serviceAreaId) {
    const serviceAreas = this._getFromStorage('service_areas');
    const zipAreas = this._getFromStorage('zip_areas');

    const serviceArea = serviceAreas.find((s) => s.id === serviceAreaId) || null;

    let zips = [];
    if (serviceArea) {
      zips = zipAreas.filter((z) => {
        if (z.service_area_id === serviceArea.id) return true;
        if (
          Array.isArray(serviceArea.covered_zip_codes) &&
          serviceArea.covered_zip_codes.includes(z.zip_code)
        ) return true;
        return false;
      });
    }

    return {
      service_area: serviceArea,
      zip_areas: zips
    };
  }

  // Interface: submitServiceAreaInquiry
  submitServiceAreaInquiry(
    searchedZipCode,
    nearestServedZipCode,
    serviceAreaId,
    name,
    email,
    phone,
    message
  ) {
    const inquiries = this._getFromStorage('service_area_inquiries');

    const record = {
      id: this._generateId('service_area_inquiry'),
      searched_zip_code: searchedZipCode,
      nearest_served_zip_code: nearestServedZipCode || null,
      service_area_id: serviceAreaId || null,
      name,
      email,
      phone,
      message,
      status: 'new',
      created_at: new Date().toISOString()
    };

    inquiries.push(record);
    this._saveToStorage('service_area_inquiries', inquiries);

    return {
      success: true,
      serviceAreaInquiry: record,
      message: 'Service area inquiry submitted'
    };
  }

  // Interface: getCrewFilterOptions
  getCrewFilterOptions() {
    const services = this._getFromStorage('services');
    const serviceTypes = Array.from(
      new Set(services.map((s) => s.service_type).filter((t) => !!t))
    );

    if (!serviceTypes.length) {
      serviceTypes.push(
        'asphalt_resurfacing',
        'asphalt_driveway_replacement',
        'concrete_driveways',
        'driveway_sealing',
        'snow_removal',
        'general_driveway_paving',
        'asphalt_driveway',
        'paver_driveway'
      );
    }

    const sortOptions = ['rating_desc', 'rating_asc', 'review_count_desc', 'review_count_asc'];
    const ratingThresholds = [3, 3.5, 4, 4.5, 5];

    return {
      service_type_options: serviceTypes,
      sort_options: sortOptions,
      rating_thresholds: ratingThresholds
    };
  }

  // Interface: getCrewList
  getCrewList(filters, sortBy) {
    const crews = this._getFromStorage('crews');
    const f = filters || {};

    let result = crews.filter((c) => {
      if (f.serviceType) {
        if (!Array.isArray(c.service_types) || !c.service_types.includes(f.serviceType)) {
          return false;
        }
      }

      if (typeof f.minRating === 'number') {
        if (typeof c.overall_rating !== 'number' || c.overall_rating < f.minRating) {
          return false;
        }
      }

      if (typeof f.minReviewCount === 'number') {
        if (typeof c.review_count !== 'number' || c.review_count < f.minReviewCount) {
          return false;
        }
      }

      if (f.serviceAreaId) {
        if (
          !Array.isArray(c.service_area_ids) ||
          !c.service_area_ids.includes(f.serviceAreaId)
        ) {
          return false;
        }
      }

      return true;
    });

    const sort = sortBy || 'rating_desc';

    if (sort === 'rating_desc') {
      result = result.slice().sort((a, b) => {
        if (b.overall_rating !== a.overall_rating) {
          return b.overall_rating - a.overall_rating;
        }
        return b.review_count - a.review_count;
      });
    } else if (sort === 'rating_asc') {
      result = result.slice().sort((a, b) => {
        if (a.overall_rating !== b.overall_rating) {
          return a.overall_rating - b.overall_rating;
        }
        return a.review_count - b.review_count;
      });
    } else if (sort === 'review_count_desc') {
      result = result.slice().sort((a, b) => b.review_count - a.review_count);
    } else if (sort === 'review_count_asc') {
      result = result.slice().sort((a, b) => a.review_count - b.review_count);
    }

    return result;
  }

  // Interface: getCrewDetail
  getCrewDetail(crewId) {
    const crews = this._getFromStorage('crews');
    const reviews = this._getFromStorage('crew_reviews');

    const crew = crews.find((c) => c.id === crewId) || null;
    const crewReviews = reviews
      .filter((r) => r.crew_id === crewId)
      .sort((a, b) => {
        const da = new Date(a.created_at).getTime();
        const db = new Date(b.created_at).getTime();
        return db - da;
      })
      .slice(0, 10);

    let ratingLabel = '';
    if (crew) {
      const rating = typeof crew.overall_rating === 'number' ? crew.overall_rating : 0;
      const count = typeof crew.review_count === 'number' ? crew.review_count : 0;
      ratingLabel = rating.toFixed(1) + ' out of 5 stars (' + count + ' reviews)';
    }

    return {
      crew,
      overall_rating_label: ratingLabel,
      review_snippets: crewReviews
    };
  }

  // Interface: submitEstimateRequestForCrew
  submitEstimateRequestForCrew(
    crewId,
    serviceType,
    drivewaySizeSqFt,
    sizeUnit,
    contactName,
    contactPhone,
    contactEmail,
    message
  ) {
    const estimateRequests = this._getFromStorage('estimate_requests');

    const record = {
      id: this._generateId('estimate'),
      crew_id: crewId,
      service_type: serviceType,
      driveway_size_sq_ft: typeof drivewaySizeSqFt === 'number' ? drivewaySizeSqFt : null,
      size_unit: sizeUnit || null,
      contact_name: contactName,
      contact_phone: contactPhone,
      contact_email: contactEmail,
      message: message || null,
      status: 'new',
      created_at: new Date().toISOString()
    };

    estimateRequests.push(record);
    this._saveToStorage('estimate_requests', estimateRequests);

    return {
      success: true,
      estimateRequest: record,
      message: 'Estimate request submitted'
    };
  }

  // Interface: getAboutPageContent
  getAboutPageContent() {
    const data = this._loadStaticPageContent('about');

    return {
      headline: data.headline || '',
      body_sections: Array.isArray(data.body_sections) ? data.body_sections : [],
      certifications: Array.isArray(data.certifications) ? data.certifications : [],
      warranty_highlights: Array.isArray(data.warranty_highlights)
        ? data.warranty_highlights
        : []
    };
  }

  // Interface: getFaqItems
  getFaqItems() {
    const data = this._loadStaticPageContent('faq');
    const items = Array.isArray(data.items) ? data.items : [];
    return items.map((item) => ({
      question: item.question || '',
      answer: item.answer || '',
      category: item.category || '',
      display_order: typeof item.display_order === 'number' ? item.display_order : 0
    }));
  }

  // Interface: submitContactMessage
  submitContactMessage(name, email, phone, subject, message, relatedServiceId) {
    const contactMessages = this._getFromStorage('contact_messages');

    const record = {
      id: this._generateId('contact'),
      name,
      email,
      phone: phone || null,
      subject: subject || null,
      message,
      related_service_id: relatedServiceId || null,
      created_at: new Date().toISOString()
    };

    contactMessages.push(record);
    this._saveToStorage('contact_messages', contactMessages);

    return {
      success: true,
      contactMessage: record,
      message: 'Contact message submitted'
    };
  }

  // Interface: getPrivacyPolicyContent
  getPrivacyPolicyContent() {
    const data = this._loadStaticPageContent('privacy');

    return {
      last_updated: data.last_updated || this._todayISODate(),
      sections: Array.isArray(data.sections) ? data.sections : []
    };
  }

  // Interface: getTermsContent
  getTermsContent() {
    const data = this._loadStaticPageContent('terms');

    return {
      last_updated: data.last_updated || this._todayISODate(),
      sections: Array.isArray(data.sections) ? data.sections : []
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
